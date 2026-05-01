import { useState, useCallback, useRef } from 'react';
import { CandidateProfile } from '../types';

export interface ParsedResponse {
  type: string;
  keywords: string[];
  pointers: string[];
  avoid: string;
  raw: string;
}

interface UseAnalysisReturn {
  response: ParsedResponse | null;
  rawResponse: string;
  isAnalyzing: boolean;
  error: string | null;
  analyze: (transcript: string) => void;
  clearResponse: () => void;
}

function parseResponse(raw: string): ParsedResponse {
  const section = (header: string) => {
    const m = raw.match(new RegExp(`## ${header}\\n([\\s\\S]*?)(?=\\n## |$)`, 'i'));
    return m ? m[1].trim() : '';
  };

  const keywordsRaw = section('Keywords');
  const keywords = keywordsRaw
    .split(/,\s*/)
    .map(k => k.trim())
    .filter(Boolean);

  const pointersRaw = section('Pointers');
  const pointers = pointersRaw
    .split('\n')
    .filter(l => l.trim().startsWith('-'))
    .map(l => l.replace(/^-\s*/, '').trim())
    .filter(Boolean);

  return {
    type: section('Type'),
    keywords,
    pointers,
    avoid: section('Avoid'),
    raw,
  };
}

export function useAnalysis(profile: CandidateProfile | null): UseAnalysisReturn {
  const [rawResponse, setRawResponse] = useState('');
  const [response, setResponse] = useState<ParsedResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (transcript: string) => {
    if (!profile || !transcript.trim()) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsAnalyzing(true);
    setError(null);
    setRawResponse('');
    setResponse(null);

    let accumulated = '';

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          profile,
          conversationHistory: conversationHistoryRef.current,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              setRawResponse(accumulated);
            }
            if (parsed.done) {
              setResponse(parseResponse(accumulated));
              conversationHistoryRef.current = [
                ...conversationHistoryRef.current.slice(-4),
                { role: 'user', content: `Interview: "${transcript}"` },
                { role: 'assistant', content: accumulated },
              ];
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch (_) {}
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [profile]);

  const clearResponse = useCallback(() => {
    setResponse(null);
    setRawResponse('');
    setError(null);
  }, []);

  return { response, rawResponse, isAnalyzing, error, analyze, clearResponse };
}
