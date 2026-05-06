import { useState, useRef, useCallback, useEffect } from 'react';
import { CandidateProfile } from '../types';

export interface CoachingPointer {
  cue: string;
  detail: string;
}

export interface CoachingResult {
  type: string;
  keywords: string[];
  pointers: CoachingPointer[];
  avoid: string;
}

export interface GeminiCaptureReturn {
  isCapturing: boolean;
  isProcessing: boolean;
  geminiAvailable: boolean | null;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
}

// 10s chunks give Gemini full sentences + richer acoustic context
const CHUNK_MS = 10_000;

export function useGeminiCapture(
  profile: CandidateProfile,
  onTranscript: (text: string) => void,
  onCoaching: (result: CoachingResult, question: string) => void,
  onError?: (msg: string) => void,
): GeminiCaptureReturn {
  const [isCapturing,  setIsCapturing]  = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [geminiAvailable, setGeminiAvailable] = useState<boolean | null>(null);

  const streamRef   = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef('');
  const chunksRef   = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const activeRef   = useRef(false);
  const pendingRef  = useRef(0);

  // Check server for Gemini key on mount
  useEffect(() => {
    fetch('/api/interview/status')
      .then(r => r.json())
      .then(d => setGeminiAvailable(d.geminiAvailable ?? false))
      .catch(() => setGeminiAvailable(false));
  }, []);

  const sendBlob = useCallback(async (blob: Blob) => {
    if (blob.size < 8000) return; // skip silent / near-empty chunks (silence ≈ 3–5 KB per 10s)

    pendingRef.current++;
    setIsProcessing(true);

    try {
      const ext = mimeTypeRef.current.includes('ogg') ? 'ogg' : 'webm';
      const formData = new FormData();
      formData.append('audio', blob, `audio.${ext}`);
      formData.append('profile', JSON.stringify(profile));

      const res  = await fetch('/api/interview-chunk', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        onError?.(data.error || `Server error ${res.status}`);
        return;
      }

      // Always push transcript to panel
      if (data.transcript?.trim()) {
        onTranscript(data.transcript.trim());
      }

      // Fire coaching whenever Gemini says a response is needed,
      // or as a safety fallback if pointers/keywords came back even without the flag
      const hasCoachingContent = (data.keywords?.length > 0) || (data.pointers?.length > 0);
      if (data.needsResponse || hasCoachingContent) {
        const rawPointers: any[] = Array.isArray(data.pointers) ? data.pointers : [];
        const pointers = rawPointers.map(p =>
          typeof p === 'string' ? { cue: p, detail: '' } : { cue: p.cue || '', detail: p.detail || '' }
        );
        onCoaching({
          type:     data.type     || '',
          keywords: data.keywords || [],
          pointers,
          avoid:    data.avoid    || '',
        }, data.transcript?.trim() || '');
      }
    } catch (e: any) {
      console.error('[useGeminiCapture] sendBlob error:', e);
      onError?.(e.message || 'Processing failed');
    } finally {
      pendingRef.current--;
      if (pendingRef.current === 0) setIsProcessing(false);
    }
  }, [profile, onTranscript, onCoaching, onError]);

  const buildRecorder = useCallback((audioStream: MediaStream) => {
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
      .find(t => MediaRecorder.isTypeSupported(t)) || '';
    mimeTypeRef.current = mimeType;

    const recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        chunksRef.current = [];
        sendBlob(blob);
      }
      // Restart cycle if still supposed to be capturing
      if (activeRef.current && recorder.stream.active) {
        chunksRef.current = [];
        recorder.start();
        setTimeout(() => {
          if (activeRef.current && recorder.state === 'recording') recorder.stop();
        }, CHUNK_MS);
      }
    };

    recorder.onerror = (e: any) => console.error('[MediaRecorder]', e);
    return recorder;
  }, [sendBlob]);

  const startCapture = useCallback(async () => {
    const win = window as any;
    if (!win.navigator?.mediaDevices?.getDisplayMedia) {
      onError?.('Audio capture not supported. Use Chrome or Edge.');
      return;
    }

    let displayStream: MediaStream;
    try {
      displayStream = await win.navigator.mediaDevices.getDisplayMedia({
        video: { width: 1, height: 1, frameRate: 1 },
        audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 16000, channelCount: 1 },
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        onError?.('Permission denied. Allow audio sharing in the dialog.');
      } else if (err.name === 'NotSupportedError') {
        onError?.('Audio capture not supported. Use Chrome or Edge.');
      } else {
        onError?.(err.message || 'Failed to start audio capture.');
      }
      return;
    }

    // Drop the dummy video track we had to request alongside audio
    displayStream.getVideoTracks().forEach(t => t.stop());

    const audioTracks = displayStream.getAudioTracks();
    if (audioTracks.length === 0) {
      displayStream.getTracks().forEach(t => t.stop());
      onError?.('No audio captured. Select a tab and enable "Share tab audio" in the dialog.');
      return;
    }

    streamRef.current  = displayStream;
    activeRef.current  = true;

    const audioStream = new MediaStream(audioTracks);
    const recorder    = buildRecorder(audioStream);
    recorderRef.current = recorder;

    audioTracks[0].onended = () => stopCapture();

    recorder.start();
    setTimeout(() => {
      if (activeRef.current && recorder.state === 'recording') recorder.stop();
    }, CHUNK_MS);

    setIsCapturing(true);
  }, [buildRecorder, onError]);

  const stopCapture = useCallback(() => {
    activeRef.current = false;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setIsCapturing(false);
    setIsProcessing(false);
    pendingRef.current = 0;
  }, []);

  useEffect(() => () => stopCapture(), [stopCapture]);

  return { isCapturing, isProcessing, geminiAvailable, startCapture, stopCapture };
}
