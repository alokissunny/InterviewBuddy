import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Trash2, Zap, Edit3, Check } from 'lucide-react';
import { TranscriptEntry } from '../types';

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  interimText: string;
  onAnalyze: (text: string) => void;
  onClear: () => void;
  onUpdateEntry: (id: string, text: string) => void;
  isAnalyzing: boolean;
}

function EntryRow({ entry, onAnalyze, onUpdate, isAnalyzing }: {
  entry: TranscriptEntry;
  onAnalyze: (text: string) => void;
  onUpdate: (id: string, text: string) => void;
  isAnalyzing: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(entry.text);

  const save = () => {
    onUpdate(entry.id, editText);
    setEditing(false);
  };

  return (
    <div className="group flex gap-3 items-start px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors animate-slide-up">
      <span className="text-xs text-gray-300 mt-1 shrink-0 w-14 text-right font-mono tabular-nums">
        {entry.timestamp.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex gap-2">
            <input
              autoFocus
              className="flex-1 bg-gray-50 text-gray-900 text-sm rounded-lg px-3 py-1.5 outline-none border border-[#0A66C2]/60"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            />
            <button onClick={save} className="text-green-600 hover:text-green-700 p-1">
              <Check size={15} />
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-800 leading-relaxed">{entry.text}</p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => setEditing(true)} className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-200" title="Edit">
          <Edit3 size={13} />
        </button>
        <button onClick={() => onAnalyze(entry.text)} disabled={isAnalyzing}
          className="p-1.5 text-[#0A66C2] hover:text-[#004182] rounded-lg hover:bg-[#EEF3F8] disabled:opacity-40" title="Analyze this">
          <Zap size={13} />
        </button>
      </div>
    </div>
  );
}

export function TranscriptPanel({ entries, interimText, onAnalyze, onClear, onUpdateEntry, isAnalyzing }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length, interimText]);

  const recentEntries = entries.slice(-20);

  return (
    <div className="flex flex-col h-full card overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#EEF3F8] flex items-center justify-center">
            <MessageSquare size={14} className="text-[#0A66C2]" />
          </div>
          <span className="text-base font-semibold text-gray-900">Live Transcript</span>
          {entries.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5 font-medium">{entries.length}</span>
          )}
        </div>
        {entries.length > 0 && (
          <button onClick={onClear} className="btn-ghost text-xs hover:text-red-500">
            <Trash2 size={13} /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {recentEntries.length === 0 && !interimText && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <MessageSquare size={24} className="text-gray-300" />
            </div>
            <div>
              <p className="text-gray-500 font-medium">Waiting for speech…</p>
              <p className="text-gray-400 text-sm mt-1">Click Start Listening to begin</p>
            </div>
          </div>
        )}

        {recentEntries.map(entry => (
          <EntryRow key={entry.id} entry={entry} onAnalyze={onAnalyze} onUpdate={onUpdateEntry} isAnalyzing={isAnalyzing} />
        ))}

        {interimText && (
          <div className="flex gap-3 items-start px-4 py-2.5">
            <span className="text-xs text-gray-300 mt-1 shrink-0 w-14 text-right font-mono">live</span>
            <p className="text-sm text-gray-400 italic leading-relaxed">{interimText}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {entries.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 shrink-0">
          <button
            onClick={() => onAnalyze(entries.slice(-5).map(e => e.text).join(' '))}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0A66C2] hover:bg-[#004182] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#0A66C2]/20 transition-all"
          >
            <Zap size={15} />
            Analyze Recent Speech
          </button>
        </div>
      )}
    </div>
  );
}
