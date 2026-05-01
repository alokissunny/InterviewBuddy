import React, { useState, useCallback, useRef } from 'react';
import {
  Mic, MicOff, RotateCcw, User, Briefcase, ChevronDown, ChevronUp,
  Zap, Monitor, MonitorOff, AlertCircle, Info, Settings
} from 'lucide-react';
import { CandidateProfile, TranscriptEntry } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSystemAudioCapture } from '../hooks/useSystemAudioCapture';
import { useAnalysis } from '../hooks/useAnalysis';
import { AudioIndicator } from '../components/AudioIndicator';
import { TranscriptPanel } from '../components/TranscriptPanel';
import { ResponsePanel } from '../components/ResponsePanel';
import { WhisperKeyModal } from '../components/WhisperKeyModal';

type AudioMode = 'mic' | 'system' | 'both';

const WHISPER_KEY_STORAGE = 'interview_copilot_whisper_key';

interface InterviewPageProps {
  profile: CandidateProfile;
  onReset: () => void;
  onChangeProfile: () => void;
}

export function InterviewPage({ profile, onReset, onChangeProfile }: InterviewPageProps) {
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [audioMode, setAudioMode] = useState<AudioMode>('system');
  const [sessionStart] = useState(new Date());
  const [elapsed, setElapsed] = useState('00:00');
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [whisperKey, setWhisperKey] = useState(() => localStorage.getItem(WHISPER_KEY_STORAGE) || '');
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
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

  const addEntry = useCallback((text: string) => {
    const entry: TranscriptEntry = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      timestamp: new Date(),
      isInterim: false,
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

  // Microphone (Web Speech API)
  const {
    interimText: micInterim,
    isListening: micListening,
    isSupported: micSupported,
    startListening: startMic,
    stopListening: stopMic,
  } = useSpeechRecognition(addEntry, 2500);

  React.useEffect(() => { setInterimText(micInterim); }, [micInterim]);

  // System audio (getDisplayMedia + Whisper)
  const {
    isCapturing: sysCapturing,
    isTranscribing: sysTranscribing,
    captureError: sysCaptureError,
    serverHasKey,
    startCapture: startSys,
    stopCapture: stopSys,
  } = useSystemAudioCapture(addEntry, whisperKey, (errType, msg) => {
    setCaptureNotice(msg);
    if (errType === 'no-api-key') setShowKeyModal(true);
    else setTimeout(() => setCaptureNotice(null), 8000);
  });

  const isActive = (audioMode === 'mic' && micListening)
    || (audioMode === 'system' && sysCapturing)
    || (audioMode === 'both' && (micListening || sysCapturing));

  const handleStart = useCallback(async () => {
    if (audioMode === 'mic' || audioMode === 'both') startMic();
    if (audioMode === 'system' || audioMode === 'both') await startSys();
  }, [audioMode, startMic, startSys]);

  const handleStop = useCallback(() => {
    stopMic();
    stopSys();
  }, [stopMic, stopSys]);

  const needsKey = (audioMode === 'system' || audioMode === 'both')
    && serverHasKey === false
    && !whisperKey;

  const handleSaveKey = (key: string) => {
    setWhisperKey(key);
    localStorage.setItem(WHISPER_KEY_STORAGE, key);
    setShowKeyModal(false);
    setCaptureNotice(null);
  };

  const getModeLabel = (mode: AudioMode) => {
    if (mode === 'mic') return 'Mic Only';
    if (mode === 'system') return 'Computer Audio';
    return 'Mic + Computer';
  };

  const statusMessage = () => {
    if (isActive) {
      if (audioMode === 'system') return `Capturing computer audio · chunks sent every 4s${sysTranscribing ? ' · transcribing...' : ''}`;
      if (audioMode === 'both') return `Mic + computer audio active`;
      return `Microphone active${autoAnalyze ? ' · auto-analyzing' : ''}`;
    }
    if (audioMode === 'system' || audioMode === 'both') {
      if (needsKey) return null;
      return 'When dialog opens: pick a tab/window and check "Share audio"';
    }
    if (audioMode === 'mic' && !micSupported) return null;
    return 'Click Start Listening to begin';
  };

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Briefcase size={15} className="text-white" />
          </div>
          <div>
            <span className="text-white font-semibold text-sm">Interview Copilot</span>
            <span className="text-slate-500 text-xs ml-2">· {profile.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AudioIndicator isListening={isActive} isAnalyzing={isAnalyzing || sysTranscribing} mode={audioMode} />
          <div className="h-5 w-px bg-slate-700" />
          <span className="font-mono text-slate-300 text-xs">{elapsed}</span>
          <div className="h-5 w-px bg-slate-700" />

          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <div
              onClick={() => setAutoAnalyze(v => !v)}
              className={`w-8 h-4 rounded-full transition-colors relative ${autoAnalyze ? 'bg-blue-600' : 'bg-slate-600'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${autoAnalyze ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            Auto-analyze
          </label>

          <button
            onClick={() => setShowProfile(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <User size={14} />
            Profile
            {showProfile ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <button
            onClick={onChangeProfile}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <User size={13} />
            Change Profile
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </header>

      {/* Profile dropdown */}
      {showProfile && (
        <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700/50 animate-slide-up">
          <div className="flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-slate-500 uppercase tracking-wide">Role</span>
              <p className="text-slate-200 mt-0.5">{profile.title}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wide">Skills</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {profile.skills?.slice(0, 8).map(s => (
                  <span key={s} className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{s}</span>
                ))}
                {(profile.skills?.length ?? 0) > 8 && <span className="text-slate-500">+{profile.skills.length - 8}</span>}
              </div>
            </div>
            {profile.experience?.[0] && (
              <div>
                <span className="text-slate-500 uppercase tracking-wide">Latest Role</span>
                <p className="text-slate-200 mt-0.5">{profile.experience[0].role} at {profile.experience[0].company}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notice banner */}
      {captureNotice && !showKeyModal && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 animate-slide-up shrink-0">
          <AlertCircle size={14} className="text-amber-400 shrink-0" />
          <p className="text-amber-300 text-xs flex-1">{captureNotice}</p>
          <button onClick={() => setCaptureNotice(null)} className="text-amber-500 hover:text-amber-300 text-xs ml-2">✕</button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden min-h-0">
        <div className="w-2/5 flex flex-col overflow-hidden">
          <TranscriptPanel
            entries={entries}
            interimText={interimText}
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
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-t border-slate-700/50 shrink-0">
        {/* Status */}
        <div className="flex flex-col gap-0.5 min-w-0">
          {audioMode === 'mic' && !micSupported && (
            <p className="text-xs text-amber-400">Mic not supported — use Chrome or Edge</p>
          )}
          {needsKey && (
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle size={11} />
              API key required for computer audio —
              <button onClick={() => setShowKeyModal(true)} className="underline hover:text-amber-300">add key</button>
            </p>
          )}
          {(audioMode === 'system' || audioMode === 'both') && (serverHasKey || whisperKey) && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Info size={11} className="text-blue-400" />
              {whisperKey
                ? (whisperKey.startsWith('gsk_') ? 'Using Groq Whisper (free)' : 'Using your OpenAI key')
                : 'Using server OpenAI key'}
              {' · '}
              <button onClick={() => setShowKeyModal(true)} className="underline hover:text-slate-300">change</button>
            </p>
          )}
          {statusMessage() && (
            <p className={`text-xs ${isActive ? 'text-green-400' : 'text-slate-500'}`}>
              {statusMessage()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Audio source toggle */}
          <div className="flex items-center bg-slate-700/60 rounded-lg p-0.5 gap-0.5">
            {(['mic', 'system', 'both'] as AudioMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => { if (!isActive) setAudioMode(mode); }}
                disabled={isActive}
                title={getModeLabel(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:cursor-not-allowed ${
                  audioMode === mode
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'
                }`}
              >
                {mode === 'mic' && <Mic size={12} />}
                {mode === 'system' && <Monitor size={12} />}
                {mode === 'both' && <span className="text-[10px] font-bold leading-none">M+C</span>}
                {mode === 'mic' ? 'Mic' : mode === 'system' ? 'Computer' : 'Both'}
              </button>
            ))}
          </div>

          {/* Settings — always visible for system/both mode */}
          {(audioMode === 'system' || audioMode === 'both') && (
            <button
              onClick={() => setShowKeyModal(true)}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-700/60 rounded-lg transition-colors"
              title="Change transcription API key"
            >
              <Settings size={15} />
            </button>
          )}

          {/* Manual analyze */}
          {entries.length > 0 && !autoAnalyze && (
            <button
              onClick={() => analyze(entries.slice(-5).map(e => e.text).join(' '))}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-sm rounded-lg transition-colors"
            >
              <Zap size={14} />
              Analyze
            </button>
          )}

          {/* Start / Stop */}
          <button
            onClick={isActive ? handleStop : handleStart}
            disabled={
              (!isActive && audioMode === 'mic' && !micSupported) ||
              (!isActive && needsKey)
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {isActive
              ? <>{audioMode !== 'mic' ? <MonitorOff size={16} /> : <MicOff size={16} />} Stop</>
              : <>{audioMode !== 'mic' ? <Monitor size={16} /> : <Mic size={16} />} Start Listening</>
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
