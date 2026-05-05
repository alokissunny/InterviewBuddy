import React, { useState, useCallback, useRef } from 'react';
import {
  RotateCcw, User, ChevronDown, ChevronUp,
  Zap, MonitorOff, AlertCircle, Info, Settings, LogOut, Radio,
} from 'lucide-react';
import { CandidateProfile, TranscriptEntry } from '../types';
import { useSystemAudioCapture } from '../hooks/useSystemAudioCapture';
import { useAnalysis } from '../hooks/useAnalysis';
import { AudioIndicator } from '../components/AudioIndicator';
import { TranscriptPanel } from '../components/TranscriptPanel';
import { ResponsePanel } from '../components/ResponsePanel';
import { WhisperKeyModal } from '../components/WhisperKeyModal';

const WHISPER_KEY_STORAGE = 'interview_copilot_whisper_key';

interface InterviewPageProps {
  profile: CandidateProfile;
  onReset: () => void;
  onChangeProfile: () => void;
}

export function InterviewPage({ profile, onReset, onChangeProfile }: InterviewPageProps) {
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [sessionStart] = useState(new Date());
  const [elapsed, setElapsed] = useState('00:00');
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [whisperKey, setWhisperKey] = useState(() => localStorage.getItem(WHISPER_KEY_STORAGE) || '');
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - sessionStart.getTime()) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStart]);

  const { response, rawResponse, isAnalyzing, error, analyze } = useAnalysis(profile);

  const addInterviewerEntry = useCallback((text: string) => {
    const entry: TranscriptEntry = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      timestamp: new Date(),
      isInterim: false,
      speaker: 'interviewer',
    };
    setEntries(prev => [...prev, entry]);

    if (autoAnalyze && text.trim().length > 15) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => analyze(text), 2500);
    }
  }, [autoAnalyze, analyze]);

  const clearEntries = useCallback(() => setEntries([]), []);
  const updateEntry = useCallback((id: string, text: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, text } : e));
  }, []);

  // Tab audio only — captures the interviewer's voice from a chosen browser tab
  const {
    isCapturing: sysCapturing,
    isTranscribing: sysTranscribing,
    serverHasKey,
    startCapture: startSys,
    stopCapture: stopSys,
  } = useSystemAudioCapture(addInterviewerEntry, whisperKey, (errType, msg) => {
    setCaptureNotice(msg);
    if (errType === 'no-api-key') setShowKeyModal(true);
    else setTimeout(() => setCaptureNotice(null), 8000);
  });

  const isActive = sysCapturing;
  const needsKey = serverHasKey === false && !whisperKey;

  const handleStart = useCallback(async () => { await startSys(); }, [startSys]);
  const handleStop  = useCallback(() => { stopSys(); }, [stopSys]);

  const handleSaveKey = (key: string) => {
    setWhisperKey(key);
    localStorage.setItem(WHISPER_KEY_STORAGE, key);
    setShowKeyModal(false);
    setCaptureNotice(null);
  };

  const statusMessage = () => {
    if (isActive) {
      return `Capturing tab audio${sysTranscribing ? ' · transcribing…' : ''}`;
    }
    if (needsKey) return null;
    return 'Click Start Listening — pick the browser tab playing your interview';
  };

  return (
    <div className="h-full bg-[#F3F2EF] flex flex-col overflow-hidden">
      {/* Session sub-toolbar */}
      <div className="flex items-center justify-between px-5 py-2 bg-white border-b border-gray-100 shrink-0">
        {/* Left: live status */}
        <div className="flex items-center gap-3">
          <AudioIndicator isListening={isActive} isAnalyzing={isAnalyzing || sysTranscribing} />
          <div className="w-px h-4 bg-gray-200" />
          <span className="font-mono text-xs text-gray-400 tabular-nums">{elapsed}</span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1">
          {/* Auto-analyze toggle */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50 cursor-pointer select-none transition-colors">
            <div
              onClick={() => setAutoAnalyze(v => !v)}
              className={`w-7 h-3.5 rounded-full transition-colors relative shrink-0 ${autoAnalyze ? 'bg-[#0A66C2]' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${autoAnalyze ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </div>
            Auto-analyze
          </label>

          <div className="w-px h-4 bg-gray-100" />

          {/* Profile drawer */}
          <button
            onClick={() => setShowProfile(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showProfile ? 'bg-[#EEF3F8] text-[#0A66C2]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <User size={13} />
            Profile
            {showProfile ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {/* Change profile */}
          <button
            onClick={onChangeProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            <LogOut size={13} />
            Switch Profile
          </button>

          {/* Reset session */}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </div>

      {/* Profile dropdown */}
      {showProfile && (
        <div className="px-4 py-3 bg-white border-b border-gray-200 animate-slide-up">
          <div className="flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-gray-400 uppercase tracking-wide">Role</span>
              <p className="text-gray-800 mt-0.5">{profile.title}</p>
            </div>
            <div>
              <span className="text-gray-400 uppercase tracking-wide">Skills</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {profile.skills?.slice(0, 8).map(s => (
                  <span key={s} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{s}</span>
                ))}
                {(profile.skills?.length ?? 0) > 8 && <span className="text-gray-400">+{profile.skills.length - 8}</span>}
              </div>
            </div>
            {profile.experience?.[0] && (
              <div>
                <span className="text-gray-400 uppercase tracking-wide">Latest Role</span>
                <p className="text-gray-800 mt-0.5">{profile.experience[0].role} at {profile.experience[0].company}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notice banner */}
      {captureNotice && !showKeyModal && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 animate-slide-up shrink-0">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <p className="text-amber-600 text-xs flex-1">{captureNotice}</p>
          <button onClick={() => setCaptureNotice(null)} className="text-amber-600 hover:text-amber-700 text-xs ml-2">✕</button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">
        <div className="w-2/5 flex flex-col overflow-hidden">
          <TranscriptPanel
            entries={entries}
            interimText=""
            onAnalyze={analyze}
            onClear={clearEntries}
            onUpdateEntry={updateEntry}
            isAnalyzing={isAnalyzing}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <ResponsePanel
            response={response}
            rawResponse={rawResponse}
            isAnalyzing={isAnalyzing}
            error={error}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-t border-gray-200 shrink-0">
        {/* Status */}
        <div className="flex flex-col gap-1 min-w-0">
          {needsKey && (
            <p className="text-sm text-amber-600 flex items-center gap-1.5">
              <AlertCircle size={13} />
              Transcription API key required —
              <button onClick={() => setShowKeyModal(true)} className="underline hover:text-amber-700">add key</button>
            </p>
          )}
          {!needsKey && (serverHasKey || whisperKey) && (
            <p className="text-sm text-gray-400 flex items-center gap-1.5">
              <Info size={13} className="text-[#0A66C2]" />
              {whisperKey
                ? (whisperKey.startsWith('gsk_') ? 'Using Groq Whisper (free)' : 'Using your OpenAI key')
                : 'Using server OpenAI key'}
              {' · '}
              <button onClick={() => setShowKeyModal(true)} className="underline hover:text-gray-600">change</button>
            </p>
          )}
          {statusMessage() && (
            <p className={`text-sm ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
              {statusMessage()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* API key settings */}
          {!isActive && (
            <button
              onClick={() => setShowKeyModal(true)}
              className="p-2.5 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl border border-gray-200 transition-all"
              title="Transcription API key"
            >
              <Settings size={16} />
            </button>
          )}

          {/* Manual analyze */}
          {entries.length > 0 && !autoAnalyze && (
            <button
              onClick={() => analyze(entries.slice(-5).map(e => e.text).join(' '))}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-800 text-sm font-medium rounded-xl border border-gray-300 transition-all"
            >
              <Zap size={15} /> Analyze
            </button>
          )}

          {/* Start / Stop */}
          <button
            onClick={isActive ? handleStop : handleStart}
            disabled={!isActive && needsKey}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25'
                : 'bg-[#0A66C2] hover:bg-[#004182] text-white shadow-lg shadow-[#0A66C2]/25'
            }`}
          >
            {isActive
              ? <><MonitorOff size={16} /> Stop</>
              : <><Radio size={16} /> Start Listening</>
            }
          </button>
        </div>
      </div>

      {/* Whisper key modal */}
      {showKeyModal && (
        <WhisperKeyModal
          currentKey={whisperKey}
          onSave={handleSaveKey}
          onClose={() => setShowKeyModal(false)}
        />
      )}
    </div>
  );
}
