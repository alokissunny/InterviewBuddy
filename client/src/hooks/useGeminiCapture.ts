import { useState, useRef, useCallback, useEffect } from 'react';
import { CandidateProfile } from '../types';

export interface CoachingPointer {
  cue: string;
  detail: string;
}

export interface CoachingResult {
  type: string;
  answer: string;
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

// VAD config — flush on pause, not on a fixed timer
const SILENCE_THRESHOLD  = 0.015;   // RMS below this = silence
const SILENCE_DURATION_MS = 1800;   // 1.8s pause → flush
const MAX_CHUNK_MS       = 45_000;  // safety cap: flush at 45s regardless
const MIN_BLOB_BYTES     = 8_000;   // skip near-silent chunks
const VAD_TICK_MS        = 100;     // VAD polling interval
const MIN_SPEECH_MS      = 800;     // segment must have ≥800ms of real speech to be sent

function getRMS(analyser: AnalyserNode): number {
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

export function useGeminiCapture(
  profile: CandidateProfile,
  onTranscript: (text: string) => void,
  onCoaching: (result: CoachingResult, question: string) => void,
  onError?: (msg: string) => void,
): GeminiCaptureReturn {
  const [isCapturing,     setIsCapturing]     = useState(false);
  const [isProcessing,    setIsProcessing]    = useState(false);
  const [geminiAvailable, setGeminiAvailable] = useState<boolean | null>(null);

  const streamRef       = useRef<MediaStream | null>(null);
  const mimeTypeRef     = useRef('');
  const chunksRef       = useRef<Blob[]>([]);
  const recorderRef     = useRef<MediaRecorder | null>(null);
  const activeRef       = useRef(false);
  const pendingRef      = useRef(0);

  // VAD state
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const vadIntervalRef  = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null); // when current silence began
  const chunkStartRef   = useRef<number>(0);           // when current recording segment began
  const speechMsRef     = useRef<number>(0);           // cumulative speech ms in current segment
  const hadSpeechRef    = useRef<boolean>(false);      // was any speech detected in segment?

  useEffect(() => {
    fetch('/api/interview/status')
      .then(r => r.json())
      .then(d => setGeminiAvailable(d.geminiAvailable ?? false))
      .catch(() => setGeminiAvailable(false));
  }, []);

  const sendBlob = useCallback(async (blob: Blob) => {
    if (blob.size < MIN_BLOB_BYTES) return;

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

      if (data.transcript?.trim()) {
        onTranscript(data.transcript.trim());
      }

      const hasCoachingContent = (data.keywords?.length > 0) || (data.pointers?.length > 0);
      if (data.needsResponse || hasCoachingContent) {
        const rawPointers: any[] = Array.isArray(data.pointers) ? data.pointers : [];
        const pointers = rawPointers.map(p =>
          typeof p === 'string' ? { cue: p, detail: '' } : { cue: p.cue || '', detail: p.detail || '' }
        );
        onCoaching({
          type:     data.type     || '',
          answer:   data.answer   || '',
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

  // Flush the current recording segment: stopping the recorder triggers onstop
  // which sends the blob and immediately restarts the recorder.
  const flushRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.stop();
  }, []);

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
      // Snapshot and reset speech counters before restarting
      const hadSpeech = hadSpeechRef.current;
      const speechMs  = speechMsRef.current;
      hadSpeechRef.current  = false;
      speechMsRef.current   = 0;

      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        chunksRef.current = [];
        // Only send if real speech was present — discards silent/ambient segments
        if (hadSpeech && speechMs >= MIN_SPEECH_MS) {
          sendBlob(blob);
        } else {
          console.log(`[VAD] Segment discarded — no real speech detected (${speechMs}ms)`);
        }
      }
      // Restart immediately so we never drop audio between flushes
      if (activeRef.current && recorder.stream.active) {
        chunksRef.current = [];
        chunkStartRef.current   = Date.now();
        silenceStartRef.current = null;
        recorder.start();
      }
    };

    recorder.onerror = (e: any) => console.error('[MediaRecorder]', e);
    return recorder;
  }, [sendBlob]);

  const startVAD = useCallback((audioStream: MediaStream) => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const source   = ctx.createMediaStreamSource(audioStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    analyserRef.current = analyser;

    chunkStartRef.current   = Date.now();
    silenceStartRef.current = null;
    hadSpeechRef.current    = false;
    speechMsRef.current     = 0;

    vadIntervalRef.current = window.setInterval(() => {
      if (!activeRef.current || !analyserRef.current) return;

      const rms     = getRMS(analyserRef.current);
      const now     = Date.now();
      const elapsed = now - chunkStartRef.current;

      if (rms >= SILENCE_THRESHOLD) {
        // Real speech — accumulate and reset silence timer
        hadSpeechRef.current  = true;
        speechMsRef.current  += VAD_TICK_MS;
        silenceStartRef.current = null;
      } else {
        // Silence — start or extend silence window
        if (silenceStartRef.current === null) {
          silenceStartRef.current = now;
        } else if (now - silenceStartRef.current >= SILENCE_DURATION_MS) {
          // Sustained pause detected — flush the current segment
          silenceStartRef.current = null;
          flushRecording();
        }
      }

      // Safety cap: flush if segment is getting too long regardless of silence
      if (elapsed >= MAX_CHUNK_MS) {
        silenceStartRef.current = null;
        flushRecording();
      }
    }, VAD_TICK_MS);
  }, [flushRecording]);

  const stopCapture = useCallback(() => {
    activeRef.current = false;

    if (vadIntervalRef.current !== null) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    }

    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    chunksRef.current = [];

    setIsCapturing(false);
    setIsProcessing(false);
    pendingRef.current = 0;
  }, []);

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

    displayStream.getVideoTracks().forEach(t => t.stop());

    const audioTracks = displayStream.getAudioTracks();
    if (audioTracks.length === 0) {
      displayStream.getTracks().forEach(t => t.stop());
      onError?.('No audio captured. Select a tab and enable "Share tab audio" in the dialog.');
      return;
    }

    streamRef.current = displayStream;
    activeRef.current = true;

    const audioStream = new MediaStream(audioTracks);
    const recorder    = buildRecorder(audioStream);
    recorderRef.current = recorder;

    audioTracks[0].onended = () => stopCapture();

    recorder.start();
    startVAD(audioStream);

    setIsCapturing(true);
  }, [buildRecorder, startVAD, stopCapture, onError]);

  useEffect(() => () => stopCapture(), [stopCapture]);

  return { isCapturing, isProcessing, geminiAvailable, startCapture, stopCapture };
}
