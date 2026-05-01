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
  behavioral:  'bg-purple-500/10 text-purple-600 border-purple-500/30',
  technical:   'bg-[#EEF3F8]    text-[#0A66C2]  border-[#0A66C2]/30',
  situational: 'bg-amber-500/10 text-amber-600  border-amber-500/30',
  background:  'bg-green-500/10 text-green-600  border-green-500/30',
  other:       'bg-gray-100     text-gray-600   border-gray-200',
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
    <div className="flex flex-col h-full card overflow-hidden">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#EEF3F8] flex items-center justify-center">
            <Sparkles size={14} className="text-[#0A66C2]" />
          </div>
          <span className="text-base font-semibold text-gray-900">AI Copilot</span>
          {isAnalyzing && <Loader2 size={14} className="text-[#0A66C2] animate-spin ml-1" />}
        </div>
        {isAnalyzing && (
          <span className="text-xs text-[#0A66C2] font-medium animate-pulse">Generating…</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Streaming skeleton */}
        {isAnalyzing && !response && (
          <div className="space-y-4 animate-pulse">
            <div className="h-7 w-36 bg-gray-200 rounded-full" />
            <div className="flex flex-wrap gap-2 mt-4">
              {[90, 65, 110, 75, 95, 60].map((w, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded-lg" style={{ width: w }} />
              ))}
            </div>
            <div className="space-y-2.5 mt-5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-4 bg-gray-200 rounded-lg" style={{ width: `${55 + i * 10}%` }} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isAnalyzing && !response && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Sparkles size={28} className="text-gray-300" />
            </div>
            <div>
              <p className="text-gray-500 font-medium">Waiting for a question…</p>
              <p className="text-gray-400 text-sm mt-1">Start listening and the copilot will suggest pointers</p>
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="space-y-6 animate-fade-in">
            {/* Question type badge */}
            {response.type && (
              <span className={`inline-block text-sm font-semibold px-4 py-1.5 rounded-full border ${typeColor(response.type)}`}>
                {response.type}
              </span>
            )}

            {/* Keywords */}
            {response.keywords.length > 0 && (
              <div>
                <p className="section-label">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {response.keywords.map((kw, i) => (
                    <span key={i} className="text-sm font-medium bg-[#EEF3F8] text-[#0A66C2] border border-[#0A66C2]/30 px-3 py-1.5 rounded-lg">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pointers */}
            {response.pointers.length > 0 && (
              <div>
                <p className="section-label">Pointers</p>
                <ul className="space-y-3">
                  {response.pointers.map((p, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-2 w-2 h-2 rounded-full bg-green-600 shrink-0" />
                      <span className="text-gray-800 text-sm leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Avoid */}
            {response.avoid && (
              <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <XCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600"><span className="font-semibold">Avoid: </span>{response.avoid}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
