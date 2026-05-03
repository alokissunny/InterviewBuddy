import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTextToSpeechReturn {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    'Google UK English Female',
    'Google US English',
    'Samantha',
    'Karen',
    'Daniel',
    'Alex',
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name === name);
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const onEndRef = useRef<(() => void) | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const clearFallback = () => {
    if (fallbackRef.current) { clearTimeout(fallbackRef.current); fallbackRef.current = null; }
  };

  const fireEnd = useCallback(() => {
    clearFallback();
    setIsSpeaking(false);
    const cb = onEndRef.current;
    onEndRef.current = null;
    cb?.();
  }, []);

  const stop = useCallback(() => {
    if (!isSupported) return;
    clearFallback();
    onEndRef.current = null;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!isSupported) { onEnd?.(); return; }

      clearFallback();
      window.speechSynthesis.cancel();

      // If TTS not needed (empty text) or browser blocks audio, fire onEnd immediately
      if (!text.trim()) { onEnd?.(); return; }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Wait for voices to load if they haven't yet
      const trySetVoice = () => {
        const voice = pickVoice();
        if (voice) utterance.voice = voice;
      };
      trySetVoice();
      if (!utterance.voice) {
        window.speechSynthesis.onvoiceschanged = () => { trySetVoice(); };
      }

      onEndRef.current = onEnd ?? null;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = fireEnd;
      utterance.onerror = fireEnd;

      window.speechSynthesis.speak(utterance);

      // Chrome bug: onend sometimes never fires (esp. long text or first load).
      // Fallback: estimate reading time + 3 s buffer, then force-fire the callback.
      const estimatedMs = Math.max(2000, text.length * 70) + 3000;
      fallbackRef.current = setTimeout(() => {
        if (onEndRef.current) {
          window.speechSynthesis.cancel();
          fireEnd();
        }
      }, estimatedMs);
    },
    [isSupported, fireEnd]
  );

  useEffect(() => () => {
    clearFallback();
    window.speechSynthesis?.cancel();
  }, []);

  return { speak, stop, isSpeaking, isSupported };
}
