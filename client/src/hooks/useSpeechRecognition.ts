import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptEntry } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionType = any;

interface UseSpeechRecognitionReturn {
  entries: TranscriptEntry[];
  interimText: string;
  accumulatedText: string;
  isListening: boolean;
  isMicReady: boolean;      // true after recognition.onstart fires (mic actually capturing)
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  clearEntries: () => void;
  updateEntry: (id: string, text: string) => void;
}

export function useSpeechRecognition(
  onSilence?: (text: string) => void,
  silenceDelay = 5000,
  minWords = 0              // don't fire onSilence until at least this many words captured
): UseSpeechRecognitionReturn {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isMicReady, setIsMicReady] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldListenRef = useRef(false);       // stays true while we want continuous listening
  const accumulatedWordsRef = useRef(0);       // running word count across all segments

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const resetSilenceTimer = useCallback(
    (text: string) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (!text.trim() || !onSilence) return;
      if (accumulatedWordsRef.current < minWords) return; // not enough speech yet
      silenceTimerRef.current = setTimeout(() => {
        if (text.trim()) onSilence(text.trim());
      }, silenceDelay);
    },
    [onSilence, silenceDelay, minWords]
  );

  const createRecognition = useCallback(() => {
    if (!isSupported) return null;
    const win = window as any;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    return recognition;
  }, [isSupported]);

  const attachHandlers = useCallback((recognition: SpeechRecognitionType) => {
    recognition.onstart = () => {
      setIsListening(true);
      setIsMicReady(true);
    };

    // Auto-restart if recognition stops while we still want to listen.
    // This fixes the "interrupts mid-reply" bug — browsers cut off after ~5–10s.
    recognition.onend = () => {
      setIsMicReady(false);
      if (shouldListenRef.current) {
        try { recognition.start(); } catch { /* already started */ }
      } else {
        setIsListening(false);
        setInterimText('');
      }
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
        const wordCount = final.trim().split(/\s+/).filter(Boolean).length;
        accumulatedWordsRef.current += wordCount;

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
      if (event.error === 'not-allowed') {
        shouldListenRef.current = false;
        setIsListening(false);
        setIsMicReady(false);
      }
      // 'no-speech' and 'aborted' are normal — let onend handle restart
    };
  }, [resetSilenceTimer]);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    shouldListenRef.current = true;
    setIsMicReady(false);
    accumulatedWordsRef.current = 0;

    const recognition = createRecognition();
    if (!recognition) return;
    attachHandlers(recognition);
    recognitionRef.current = recognition;

    try { recognition.start(); } catch (e) { console.error('Failed to start recognition:', e); }
  }, [isSupported, createRecognition, attachHandlers]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    setIsListening(false);
    setIsMicReady(false);
    setInterimText('');
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
    accumulatedWordsRef.current = 0;
  }, []);

  const updateEntry = useCallback((id: string, text: string) => {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, text } : e)));
  }, []);

  const accumulatedText = entries.map(e => e.text).join(' ').trim();

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  return {
    entries,
    interimText,
    accumulatedText,
    isListening,
    isMicReady,
    isSupported,
    startListening,
    stopListening,
    clearEntries,
    updateEntry,
  };
}
