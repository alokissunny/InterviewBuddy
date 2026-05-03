import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptEntry } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionType = any;

interface UseSpeechRecognitionReturn {
  entries: TranscriptEntry[];
  interimText: string;
  accumulatedText: string;
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  clearEntries: () => void;
  updateEntry: (id: string, text: string) => void;
}

export function useSpeechRecognition(
  onSilence?: (text: string) => void,
  silenceDelay = 3000
): UseSpeechRecognitionReturn {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const resetSilenceTimer = useCallback(
    (text: string) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (!text.trim() || !onSilence) return;
      silenceTimerRef.current = setTimeout(() => {
        if (text.trim()) onSilence(text.trim());
      }, silenceDelay);
    },
    [onSilence, silenceDelay]
  );

  const startListening = useCallback(() => {
    if (!isSupported) return;
    const win = window as any;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }

      if (final) {
        const entry: TranscriptEntry = {
          id: Date.now().toString(),
          text: final.trim(),
          timestamp: new Date(),
          isInterim: false,
        };
        setEntries(prev => [...prev, entry]);
        resetSilenceTimer(final.trim());
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
      if (event.error === 'not-allowed') setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }, [isSupported, resetSilenceTimer]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText('');
  }, []);

  const clearEntries = useCallback(() => setEntries([]), []);

  const updateEntry = useCallback((id: string, text: string) => {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, text } : e)));
  }, []);

  // Convenience: all finalised segments joined into one string
  const accumulatedText = entries.map(e => e.text).join(' ').trim();

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  return {
    entries,
    interimText,
    accumulatedText,
    isListening,
    isSupported,
    startListening,
    stopListening,
    clearEntries,
    updateEntry,
  };
}
