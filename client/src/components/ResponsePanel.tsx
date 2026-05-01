import React from 'react';
import { Sparkles, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { ParsedResponse } from '../hooks/useAnalysis';

interface ResponsePanelProps {
  response: ParsedResponse | null;
  rawResponse: string;
  isAnalyzing: boolean;
  error: string | null;
}

const typeColors: Record<string, string> = {
  behavioral:  'bg-purple-500/20 text-purple-300 border-purple-500/40',
  technical:   'bg-blue-500/20   text-blue-300   border-blue-500/40',
  situational: 'bg-amber-500/20  text-amber-300  border-amber-500/40',
  background:  'bg-green-500/20  text-green-300  border-green-500/40',
  other:       'bg-slate-500/20  text-slate-300  border-slate-500/40',
};

function typeColor(type: string) {
  const key = type.toLowerCase();
  for (const [k, v] of Object.entries(typeColors)) {
    if (key.includes(k)) return v;
  }
  return typeColors.other;
}

export function ResponsePanel({ response, rawResponse, isAnalyzing, error }: ResponsePanelProps) {
  return (
    <div className="flex flex-col h-full bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50 shrink-0">
        <Sparkles size={15} className="text-blue-400" />
        <span className="text-sm font-semibold text-slate-200">Copilot</span>
        {isAnalyzing && <Loader2 size={13} className="text-blue-400 animate-spin ml-1" />}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Streaming skeleton while typing */}
        {isAnalyzing && !response && (
          <div className="space-y-3 animate-pulse">
            <div className="h-6 w-32 bg-slate-700 rounded-full" />
            <div className="flex flex-wrap gap-2 mt-3">
              {[80, 60, 100, 70, 90, 55].map((w, i) => (
                <div key={i} className="h-7 bg-slate-700 rounded-full" style={{ width: w }} />
              ))}
            </div>
            <div className="space-y-2 mt-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-4 bg-slate-700/70 rounded" style={{ width: `${55 + i * 10}%` }} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isAnalyzing && !response && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <Sparkles size={36} className="text-slate-700" />
            <p className="text-slate-500 text-sm">Waiting for a question...</p>
            <p className="text-slate-600 text-xs">Start listening and the copilot will suggest pointers</p>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="space-y-5 animate-fade-in">
            {/* Question type badge */}
            {response.type && (
              <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${typeColor(response.type)}`}>
                {response.type}
              </span>
            )}

            {/* Keywords */}
            {response.keywords.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {response.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-sm font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-lg"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pointers */}
            {response.pointers.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pointers</p>
                <ul className="space-y-2">
                  {response.pointers.map((p, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      <span className="text-slate-200 text-sm leading-snug">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Avoid */}
            {response.avoid && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300"><span className="font-semibold">Avoid: </span>{response.avoid}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
