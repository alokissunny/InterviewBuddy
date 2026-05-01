import React from 'react';
import { Mic, MicOff, Monitor, MonitorOff, Loader2 } from 'lucide-react';

type AudioMode = 'mic' | 'system' | 'both';

interface AudioIndicatorProps {
  isListening: boolean;
  isAnalyzing: boolean;
  mode?: AudioMode;
}

export function AudioIndicator({ isListening, isAnalyzing, mode = 'mic' }: AudioIndicatorProps) {
  const Icon = isListening
    ? (mode === 'mic' ? Mic : Monitor)
    : (mode === 'mic' ? MicOff : MonitorOff);

  const label = isAnalyzing
    ? 'Processing...'
    : isListening
      ? (mode === 'system' ? 'Capturing' : mode === 'both' ? 'Mic + System' : 'Listening')
      : 'Idle';

  return (
    <div className="flex items-center gap-3">
      <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
        isListening ? 'bg-green-500/20 ring-2 ring-green-500/50' : 'bg-slate-700'
      }`}>
        <Icon size={18} className={isListening ? 'text-green-400' : 'text-slate-500'} />
        {isListening && <span className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />}
      </div>

      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        {isAnalyzing && (
          <div className="flex items-center gap-1 mt-0.5">
            <Loader2 size={10} className="text-blue-400 animate-spin" />
            <span className="text-xs text-blue-400">Generating response</span>
          </div>
        )}
      </div>

      {isListening && (
        <div className="flex items-end gap-0.5 h-5">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="w-1 bg-green-400 rounded-full animate-pulse"
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
