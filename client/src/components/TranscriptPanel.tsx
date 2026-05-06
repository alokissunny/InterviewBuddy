import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Trash2, Zap, Edit3, Check, Mic, Monitor, Radio } from 'lucide-react';
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

  const save = () => { onUpdate(entry.id, editText); setEditing(false); };

  const isInterviewer = entry.speaker === 'interviewer';
  const isInterviewee = entry.speaker === 'interviewee';

  return (
    <div className={`group flex flex-col gap-1 px-4 py-2 animate-slide-up ${isInterviewee ? 'items-end' : 'items-start'}`}>
      {/* Speaker label */}
      <div className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
        isInterviewer ? 'text-gray-400' : isInterviewee ? 'text-[#4F46E5]' : 'text-gray-400'
      }`}>
        {isInterviewer && <Monitor size={9} />}
        {isInterviewee && <Mic size={9} />}
        {isInterviewer ? 'Interviewer' : isInterviewee ? 'You' : '—'}
        <span className="font-normal text-gray-400 ml-1 normal-case tracking-normal">
          {entry.timestamp.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </span>
      </div>

      {/* Bubble */}
      <div className={`relative max-w-[85%] group/bubble rounded-2xl px-3.5 py-2.5 ${
        isInterviewee
          ? 'bg-[#4F46E5] text-white rounded-tr-sm'
          : 'bg-gray-100 text-gray-800 rounded-tl-sm'
      }`}>
        {editing ? (
          <div className="flex gap-2 items-center">
            <input
              autoFocus
              className={`flex-1 bg-transparent text-sm outline-none border-b ${
                isInterviewee ? 'border-white/40 placeholder:text-white/50' : 'border-gray-400'
              }`}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            />
            <button onClick={save} className={`shrink-0 ${isInterviewee ? 'text-white/80 hover:text-white' : 'text-green-600'}`}>
              <Check size={14} />
            </button>
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{entry.text}</p>
        )}

        {/* Hover actions */}
        <div className={`absolute top-1 ${isInterviewee ? '-left-16' : '-right-16'} flex gap-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity`}>
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-gray-400 hover:text-gray-700 bg-white rounded-lg shadow-sm border border-gray-200"
            title="Edit"
          >
            <Edit3 size={11} />
          </button>
          <button
            onClick={() => onAnalyze(entry.text)}
            disabled={isAnalyzing}
            className="p-1.5 text-[#4F46E5] hover:text-[#3730a3] bg-white rounded-lg shadow-sm border border-gray-200 disabled:opacity-40"
            title="Analyze"
          >
            <Zap size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TranscriptPanel({ entries, interimText, onAnalyze, onClear, onUpdateEntry, isAnalyzing }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length, interimText]);

  const recentEntries = entries.slice(-30);

  return (
    <div className="flex flex-col h-full card overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
            <MessageSquare size={14} className="text-[#4F46E5]" />
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

      {/* Legend */}
      {entries.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Monitor size={10} className="text-gray-400" />
            <span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" />
            Interviewer
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#4F46E5]">
            <Mic size={10} />
            <span className="w-3 h-3 rounded-sm bg-[#4F46E5] inline-block" />
            You
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {recentEntries.length === 0 && !interimText && (
          <div className="flex flex-col items-center h-full text-center px-5 pt-6 pb-4 gap-5">
            {/* Animated pulse rings */}
            <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
              <div className="absolute w-20 h-20 rounded-full bg-indigo-100 animate-ping opacity-25" />
              <div className="absolute w-14 h-14 rounded-full bg-indigo-100 animate-ping opacity-30"
                style={{ animationDelay: '0.3s', animationDuration: '1.5s' }} />
              <div className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center">
                <Radio size={18} className="text-indigo-400" />
              </div>
            </div>

            <div>
              <p className="font-semibold text-gray-700">Ready to listen</p>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">Transcripts will appear here in real time as your interview plays</p>
            </div>

            {/* Steps */}
            <div className="w-full space-y-2 text-left">
              {[
                { n: '1', label: 'Click', desc: 'Start Listening below' },
                { n: '2', label: 'Pick', desc: 'the browser tab playing your interview' },
                { n: '3', label: 'Watch', desc: 'the transcript appear automatically' },
              ].map(s => (
                <div key={s.n} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff' }}>
                    {s.n}
                  </div>
                  <span className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-800">{s.label}</span> {s.desc}
                  </span>
                </div>
              ))}
            </div>

          </div>
        )}

        {recentEntries.map(entry => (
          <EntryRow key={entry.id} entry={entry} onAnalyze={onAnalyze} onUpdate={onUpdateEntry} isAnalyzing={isAnalyzing} />
        ))}

        {/* Interim (mic/you) — shown on the right */}
        {interimText && (
          <div className="flex flex-col items-end gap-1 px-4 py-2">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#4F46E5] uppercase tracking-wider">
              <Mic size={9} /> You
            </span>
            <div className="max-w-[85%] bg-[#4F46E5]/20 text-[#4F46E5] rounded-2xl rounded-tr-sm px-3.5 py-2.5">
              <p className="text-sm leading-relaxed italic">{interimText}</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {entries.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 shrink-0">
          <button
            onClick={() => onAnalyze(entries.slice(-5).map(e => e.text).join(' '))}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#4F46E5] hover:bg-[#3730a3] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#4F46E5]/20 transition-all"
          >
            <Zap size={15} />
            Analyze Recent Speech
          </button>
        </div>
      )}
    </div>
  );
}
