import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, AlertCircle, XCircle, ChevronDown } from 'lucide-react';
import { CoachingResult, CoachingPointer } from '../hooks/useGeminiCapture';

export interface CoachingEntry {
  id: string;
  question: string;
  result: CoachingResult;
  timestamp: Date;
}

interface ResponsePanelProps {
  history: CoachingEntry[];
  isAnalyzing: boolean;
  error: string | null;
}

const typeColors: Record<string, string> = {
  behavioral:  'bg-purple-500/10 text-purple-700 border-purple-500/30',
  technical:   'bg-[#EEF2FF]    text-[#4F46E5]  border-[#4F46E5]/30',
  situational: 'bg-amber-500/10 text-amber-700  border-amber-500/30',
  background:  'bg-green-500/10 text-green-700  border-green-500/30',
  other:       'bg-gray-100     text-gray-600   border-gray-200',
};

const pointerAccents = [
  'border-indigo-200 bg-indigo-50/60',
  'border-green-200 bg-green-50/60',
  'border-violet-200 bg-violet-50/60',
  'border-sky-200 bg-sky-50/60',
];

function typeColor(type: string) {
  const key = type.toLowerCase();
  for (const [k, v] of Object.entries(typeColors)) {
    if (key.includes(k)) return v;
  }
  return typeColors.other;
}

function PointerGrid({ pointers, accent }: { pointers: CoachingPointer[]; accent?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {pointers.map((p, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            onClick={() => setOpen(isOpen ? null : i)}
            className={`rounded-2xl border p-4 transition-all select-none ${
              p.detail ? 'cursor-pointer' : ''
            } ${pointerAccents[i % pointerAccents.length]}`}
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-1.5 w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 ${accent ? '' : 'opacity-70'}`} />
              <div className="flex-1 min-w-0">
                <span className={`font-bold text-gray-800 leading-snug block ${accent ? 'text-xl' : 'text-sm'}`}>
                  {p.cue}
                </span>
                {isOpen && p.detail && (
                  <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-black/5 leading-relaxed">
                    {p.detail}
                  </p>
                )}
              </div>
              {p.detail && (
                <ChevronDown
                  size={14}
                  className={`text-gray-400 shrink-0 mt-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ResponsePanel({ history, isAnalyzing, error }: ResponsePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (history.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history.length, isAnalyzing]);

  return (
    <div className="flex flex-col h-full card overflow-hidden">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
            <Sparkles size={14} className="text-[#4F46E5]" />
          </div>
          <span className="text-base font-semibold text-gray-900">AI Coach</span>
          {isAnalyzing && <Loader2 size={14} className="text-[#4F46E5] animate-spin ml-1" />}
        </div>
        {isAnalyzing && (
          <span className="text-xs text-[#4F46E5] font-medium animate-pulse">Analysing…</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Error */}
        {error && (
          <div className="m-4 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isAnalyzing && history.length === 0 && !error && (
          <div className="flex flex-col gap-5 p-5 pt-4 pb-4">
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', boxShadow: '0 8px 24px rgba(79,70,229,0.3)' }}>
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-base">Your AI Interview Coach</p>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed max-w-xs mx-auto">
                  Start listening and I'll analyse questions in real time — large cues you can glance at naturally.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { color: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: '🏷️ Question type' },
                { color: 'bg-green-50 text-green-700 border-green-100',  label: '✅ Key pointers' },
                { color: 'bg-amber-50 text-amber-700 border-amber-100',  label: '⚠️ What to avoid' },
                { color: 'bg-purple-50 text-purple-700 border-purple-100', label: '🔑 Keywords' },
              ].map(f => (
                <span key={f.label} className={`text-xs font-medium px-3 py-1.5 rounded-full border ${f.color}`}>
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Past entries — full cards, dimmed */}
        {history.length > 1 && (
          <div className="px-4 pt-4 flex flex-col gap-4">
            {history.slice(0, -1).map((entry) => {
              const { result, question } = entry;
              return (
                <div key={entry.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 space-y-3 opacity-50">

                  {/* Question + type */}
                  <div className="flex flex-wrap items-start gap-2">
                    {result.type && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${typeColor(result.type)}`}>
                        {result.type}
                      </span>
                    )}
                    {question && (
                      <p className="text-xs text-gray-500 leading-snug pt-0.5 flex-1 min-w-0">{question}</p>
                    )}
                  </div>

                  {/* Keywords */}
                  {result.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords.map((kw, i) => (
                        <span key={i}
                          className="text-sm font-semibold bg-indigo-50 text-indigo-500 border border-indigo-200 px-3 py-1 rounded-lg">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Pointers */}
                  {result.pointers.length > 0 && (
                    <PointerGrid pointers={result.pointers} />
                  )}

                  {/* Avoid */}
                  {result.avoid && (
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-600">
                        <span className="font-bold">Avoid: </span>{result.avoid}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Latest entry — large focus layout */}
        {history.length > 0 && (() => {
          const entry = history[history.length - 1];
          const { result, question } = entry;
          return (
            <div className="p-4 space-y-4">

              {/* Question + type */}
              <div className="flex flex-wrap items-start gap-3">
                {result.type && (
                  <span className={`text-sm font-bold px-4 py-1.5 rounded-full border shrink-0 ${typeColor(result.type)}`}>
                    {result.type}
                  </span>
                )}
                {question && (
                  <p className="text-sm text-gray-500 leading-snug pt-1 flex-1 min-w-0">
                    {question}
                  </p>
                )}
              </div>

              {/* Keywords — large chips */}
              {result.keywords.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {result.keywords.map((kw, i) => (
                      <span key={i}
                        className="text-base font-semibold bg-[#EEF2FF] text-[#4F46E5] border border-[#4F46E5]/30 px-4 py-2 rounded-xl">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pointers — 2×2 grid, click any to expand detail */}
              {result.pointers.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Pointers <span className="normal-case font-normal text-gray-300">— tap to expand</span>
                  </p>
                  <PointerGrid pointers={result.pointers} accent />
                </div>
              )}

              {/* Avoid */}
              {result.avoid && (
                <div className="flex items-start gap-3 px-4 py-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-base font-semibold text-red-600">
                    <span className="font-bold">Avoid: </span>{result.avoid}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Skeleton while analysing */}
        {isAnalyzing && (
          <div className="p-4 space-y-4 animate-pulse">
            <div className="flex gap-3">
              <div className="h-8 w-28 bg-gray-200 rounded-full" />
              <div className="h-5 flex-1 bg-gray-100 rounded-lg mt-1.5" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[100, 80, 120, 90, 70].map((w, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded-xl" style={{ width: w }} />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded-2xl border border-gray-200" />
              ))}
            </div>
            <div className="h-12 bg-red-50 rounded-2xl border border-red-100" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
