import { useState, useRef, useCallback, useEffect } from 'react';

export type CaptureError =
  | 'not-allowed'
  | 'no-audio-track'
  | 'not-supported'
  | 'no-api-key'
  | 'unknown';

interface UseSystemAudioCaptureReturn {
  isCapturing: boolean;
  isTranscribing: boolean;
  captureError: CaptureError | null;
  serverHasKey: boolean | null;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
}

const CHUNK_MS = 5000; // record for 5s, stop, send complete file, restart

export function useSystemAudioCapture(
  onTranscript: (text: string) => void,
  whisperKey: string,
  onError?: (type: CaptureError, msg: string) => void
): UseSystemAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [captureError, setCaptureError] = useState<CaptureError | null>(null);
  const [serverHasKey, setServerHasKey] = useState<boolean | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef('');
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const activeRef = useRef(false); // tracks intent — survives re-renders
  const pendingRef = useRef(0);

  useEffect(() => {
    fetch('/api/transcribe/status')
      .then(r => r.json())
      .then(d => setServerHasKey(d.serverKeyAvailable ?? false))
      .catch(() => setServerHasKey(false));
  }, []);

  const effectiveKey = whisperKey.trim();

  const sendBlob = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return; // skip near-silent chunks

    pendingRef.current++;
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      // Give it a proper filename with extension so the server/API can identify format
      const ext = mimeTypeRef.current.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', blob, `audio.${ext}`);

      const headers: Record<string, string> = {};
      if (effectiveKey) headers['x-whisper-key'] = effectiveKey;

      const res = await fetch('/api/transcribe', { method: 'POST', headers, body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.error || `Transcription error (${res.status})`;
        console.warn('[Whisper]', msg);
        if (res.status === 401) onError?.('no-api-key', msg);
        else if (res.status === 429) onError?.('no-api-key', msg + ' — try a Groq key (free).');
        return;
      }

      const text = data.transcript?.trim();
      if (text && text.length > 2) onTranscript(text);
    } catch (e) {
      console.error('sendBlob error:', e);
    } finally {
      pendingRef.current--;
      if (pendingRef.current === 0) setIsTranscribing(false);
    }
  }, [effectiveKey, onTranscript, onError]);

  // Build a recorder for the given stream and wire up stop→send→restart cycle
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
      // Assemble all chunks into one complete, header-bearing file and send
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        chunksRef.current = [];
        sendBlob(blob);
      }

      // Restart immediately if still supposed to be capturing
      if (activeRef.current && recorder.stream.active) {
        chunksRef.current = [];
        recorder.start();
        // Schedule next flush
        setTimeout(() => {
          if (activeRef.current && recorder.state === 'recording') recorder.stop();
        }, CHUNK_MS);
      }
    };

    recorder.onerror = (e: any) => console.error('MediaRecorder error:', e);
    return recorder;
  }, [sendBlob]);

  const startCapture = useCallback(async () => {
    if (!serverHasKey && !effectiveKey) {
      setCaptureError('no-api-key');
      onError?.('no-api-key', 'Enter a Groq or OpenAI API key in Settings. Groq is free.');
      return;
    }

    const win = window as any;
    if (!win.navigator?.mediaDevices?.getDisplayMedia) {
      setCaptureError('not-supported');
      onError?.('not-supported', 'Audio capture not supported. Use Chrome or Edge.');
      return;
    }

    setCaptureError(null);

    let displayStream: MediaStream;
    try {
      displayStream = await win.navigator.mediaDevices.getDisplayMedia({
        video: { width: 1, height: 1, frameRate: 1 },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 16000,
          channelCount: 1,
        },
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCaptureError('not-allowed');
        onError?.('not-allowed', 'Permission denied. Allow audio sharing in the dialog.');
      } else if (err.name === 'NotSupportedError') {
        setCaptureError('not-supported');
        onError?.('not-supported', 'Audio capture not supported in this browser. Use Chrome or Edge.');
      } else {
        setCaptureError('unknown');
        onError?.('unknown', err.message || 'Failed to start audio capture.');
      }
      return;
    }

    // Stop the dummy video track immediately
    displayStream.getVideoTracks().forEach(t => t.stop());

    const audioTracks = displayStream.getAudioTracks();
    if (audioTracks.length === 0) {
      displayStream.getTracks().forEach(t => t.stop());
      setCaptureError('no-audio-track');
      onError?.('no-audio-track', 'No audio captured. Select a tab and check "Share tab audio" in the dialog.');
      return;
    }

    streamRef.current = displayStream;
    activeRef.current = true;

    const audioStream = new MediaStream(audioTracks);
    const recorder = buildRecorder(audioStream);
    recorderRef.current = recorder;

    // Stop capture if user ends sharing from browser UI
    audioTracks[0].onended = () => stopCapture();

    // Start first recording session; onstop will loop automatically
    recorder.start();
    setTimeout(() => {
      if (activeRef.current && recorder.state === 'recording') recorder.stop();
    }, CHUNK_MS);

    setIsCapturing(true);
  }, [serverHasKey, effectiveKey, buildRecorder, onError]);

  const stopCapture = useCallback(() => {
    activeRef.current = false;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setIsCapturing(false);
    setIsTranscribing(false);
    pendingRef.current = 0;
  }, []);

  useEffect(() => () => stopCapture(), [stopCapture]);

  return { isCapturing, isTranscribing, captureError, serverHasKey, startCapture, stopCapture };
}
