import React from 'react';
import { Radio, Loader2 } from 'lucide-react';

interface AudioIndicatorProps {
  isListening: boolean;
  isAnalyzing: boolean;
}

export function AudioIndicator({ isListening, isAnalyzing }: AudioIndicatorProps) {
  const label = isAnalyzing
    ? 'Processing…'
    : isListening
    ? 'Listening'
    : 'Idle';

  return (
    <div className="flex items-center gap-3">
      <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${
        isListening ? 'bg-green-500/20 ring-2 ring-green-500/40 shadow-lg shadow-green-500/10' : 'bg-gray-100'
      }`}>
        <Radio size={16} className={isListening ? 'text-green-600' : 'text-gray-400'} />
        {isListening && <span className="absolute inset-0 rounded-xl bg-green-500/15 animate-ping" />}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        {isAnalyzing && (
          <div className="flex items-center gap-1.5">
            <Loader2 size={11} className="text-[#4F46E5] animate-spin" />
            <span className="text-xs text-[#4F46E5]">Generating response</span>
          </div>
        )}
      </div>

      {isListening && (
        <div className="flex items-end gap-0.5 h-5">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="w-1 bg-green-600 rounded-full animate-pulse"
              style={{
                height: `${20 + (i * 11) % 60}%`,
                animationDelay: `${i * 0.12}s`,
                animationDuration: `${0.6 + (i * 0.13)}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
