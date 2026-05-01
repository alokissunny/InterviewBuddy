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
    <div className="group flex gap-2 items-start p-2 rounded-lg hover:bg-slate-700/50 transition-colors animate-slide-up">
      <span className="text-xs text-slate-500 mt-1 shrink-0 w-12 text-right">
        {entry.timestamp.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex gap-1">
            <input
              autoFocus
              className="flex-1 bg-slate-600 text-slate-100 text-sm rounded px-2 py-0.5 outline-none border border-blue-500/50"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            />
            <button onClick={save} className="text-green-400 hover:text-green-300">
              <Check size={14} />
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-200 leading-relaxed">{entry.text}</p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-slate-400 hover:text-slate-200 rounded"
          title="Edit"
        >
          <Edit3 size={12} />
        </button>
        <button
          onClick={() => onAnalyze(entry.text)}
          disabled={isAnalyzing}
          className="p-1 text-blue-400 hover:text-blue-300 rounded disabled:opacity-40"
          title="Analyze this"
        >
          <Zap size={12} />
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
    <div className="flex flex-col h-full bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-400" />
          <span className="text-sm font-semibold text-slate-200">Live Transcript</span>
          <span className="text-xs text-slate-500 bg-slate-700 rounded-full px-2 py-0.5">{entries.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {recentEntries.length === 0 && !interimText && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare size={32} className="text-slate-600 mb-3" />
            <p className="text-slate-500 text-sm">Waiting for speech...</p>
            <p className="text-slate-600 text-xs mt-1">Click microphone to start listening</p>
          </div>
        )}

        {recentEntries.map(entry => (
          <EntryRow
            key={entry.id}
            entry={entry}
            onAnalyze={onAnalyze}
            onUpdate={onUpdateEntry}
            isAnalyzing={isAnalyzing}
          />
        ))}

        {interimText && (
          <div className="flex gap-2 items-start p-2">
            <span className="text-xs text-slate-600 mt-1 shrink-0 w-12 text-right">live</span>
            <p className="text-sm text-slate-500 italic leading-relaxed">{interimText}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {entries.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-700/50 shrink-0">
          <button
            onClick={() => {
              const recent = entries.slice(-5).map(e => e.text).join(' ');
              onAnalyze(recent);
            }}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Zap size={14} />
            Analyze Recent Speech
          </button>
        </div>
      )}
    </div>
  );
}
