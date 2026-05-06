import React, { useState, useCallback } from 'react';
import { MonitorOff, AlertCircle, Radio, Sparkles, Mic, Activity, Waves } from 'lucide-react';
import { CandidateProfile } from '../types';
import { useGeminiCapture, CoachingResult } from '../hooks/useGeminiCapture';
import { ResponsePanel, CoachingEntry } from '../components/ResponsePanel';

interface InterviewPageProps {
  profile: CandidateProfile;
  onReset: () => void;
  onChangeProfile: () => void;
}

export function InterviewPage({ profile }: InterviewPageProps) {
  const [coachingHistory, setCoachingHistory] = useState<CoachingEntry[]>([]);
  const [captureNotice,   setCaptureNotice]   = useState<string | null>(null);

  const handleTranscript = useCallback((_text: string) => {
    // transcript consumed internally; not displayed
  }, []);

  const handleCoaching = useCallback((result: CoachingResult, question: string) => {
    setCoachingHistory(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      question,
      result,
      timestamp: new Date(),
    }]);
  }, []);

  const { isCapturing, isProcessing, geminiAvailable, startCapture, stopCapture } =
    useGeminiCapture(profile, handleTranscript, handleCoaching, (msg) => {
      setCaptureNotice(msg);
      setTimeout(() => setCaptureNotice(null), 8000);
    });

  const noGemini = geminiAvailable === false;
  const totalPointers = coachingHistory.reduce((n, e) => n + e.result.pointers.length, 0);

  return (
    <div className="h-full bg-[#F3F2EF] flex flex-col overflow-hidden">

      {/* No Gemini key banner */}
      {noGemini && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 shrink-0">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <p className="text-amber-700 text-xs">
            Add <code className="font-mono bg-amber-100 px-1 rounded">GEMINI_API_KEY</code> to{' '}
            <code className="font-mono bg-amber-100 px-1 rounded">server/.env</code> to enable AI coaching.{' '}
            Get a free key at{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
              className="underline hover:text-amber-900">aistudio.google.com</a>
          </p>
        </div>
      )}

      {/* Error banner */}
      {captureNotice && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 shrink-0">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <p className="text-amber-600 text-xs flex-1">{captureNotice}</p>
          <button onClick={() => setCaptureNotice(null)} className="text-amber-600 hover:text-amber-700 text-xs">✕</button>
        </div>
      )}

      {/* Mobile status strip — visible only on small screens */}
      <div className="md:hidden shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200">
        {/* Mic indicator */}
        <div className="relative flex items-center justify-center">
          {isCapturing && (
            <span className="absolute w-9 h-9 rounded-full bg-indigo-500/15 animate-ping" />
          )}
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm relative ${
            isCapturing ? 'bg-indigo-600' : 'bg-gray-200'
          }`}>
            <Mic size={14} className={isCapturing ? 'text-white' : 'text-gray-400'} />
          </div>
        </div>

        {/* Status text */}
        <div className="flex-1 min-w-0">
          {isCapturing && isProcessing && (
            <p className="text-xs font-semibold text-indigo-600">Analysing question…</p>
          )}
          {isCapturing && !isProcessing && (
            <p className="text-xs font-semibold text-green-600">Listening · waiting for question</p>
          )}
          {!isCapturing && (
            <p className="text-xs text-gray-400">Tap Start Listening to begin</p>
          )}
        </div>

        {/* Session counts */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Activity size={12} className="text-indigo-400" />
            <span className="font-bold text-gray-700">{coachingHistory.length}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Waves size={12} className="text-green-400" />
            <span className="font-bold text-gray-700">{totalPointers}</span>
          </div>
        </div>
      </div>

      {/* Main panels */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 p-3 md:gap-4 md:p-4 overflow-hidden min-h-0">

        {/* Listening status sidebar — desktop only */}
        <div className="hidden md:flex w-52 shrink-0 flex-col gap-3">
          {/* Status card */}
          <div className="card p-4 flex flex-col items-center gap-4 text-center">
            <div className="relative flex items-center justify-center mt-2">
              {isCapturing && (
                <>
                  <span className="absolute w-20 h-20 rounded-full bg-indigo-500/10 animate-ping" />
                  <span className="absolute w-14 h-14 rounded-full bg-indigo-500/15 animate-ping" style={{ animationDelay: '0.3s' }} />
                </>
              )}
              <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                isCapturing ? 'bg-indigo-600' : 'bg-gray-200'
              }`}>
                <Mic size={22} className={isCapturing ? 'text-white' : 'text-gray-400'} />
              </div>
            </div>

            {isCapturing && isProcessing && (
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-indigo-600">Analysing…</p>
                <p className="text-[10px] text-indigo-400">Question detected</p>
              </div>
            )}
            {isCapturing && !isProcessing && (
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-green-600">Listening</p>
                <p className="text-[10px] text-gray-400">Waiting for question</p>
              </div>
            )}
            {!isCapturing && (
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-gray-500">Not active</p>
                <p className="text-[10px] text-gray-400">Press Start Listening</p>
              </div>
            )}

            {/* Audio level bars */}
            <div className="flex items-end gap-1 h-6">
              {[3, 5, 8, 6, 4, 7, 5, 3, 6, 4].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all ${isCapturing ? 'bg-indigo-400' : 'bg-gray-200'}`}
                  style={{
                    height: isCapturing ? `${h * 3}px` : '4px',
                    animation: isCapturing ? `pulse ${0.4 + i * 0.07}s ease-in-out infinite alternate` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Session stats */}
          <div className="card p-3 space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Session</p>
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-indigo-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-800">{coachingHistory.length}</p>
                <p className="text-[10px] text-gray-400">Questions detected</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Waves size={13} className="text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-800">{totalPointers}</p>
                <p className="text-[10px] text-gray-400">Pointers generated</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Coach panel — full remaining width */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <ResponsePanel
            history={coachingHistory}
            isAnalyzing={isProcessing}
            error={null}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-3.5 bg-white border-t border-gray-200 shrink-0 gap-3">
        <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
          {isCapturing && isProcessing && (
            <span className="flex items-center gap-1.5 text-indigo-600 truncate">
              <Sparkles size={13} className="animate-pulse shrink-0" />
              <span className="hidden sm:inline">Listening · analysing…</span>
              <span className="sm:hidden">Analysing…</span>
            </span>
          )}
          {isCapturing && !isProcessing && (
            <span className="flex items-center gap-1.5 text-green-600 truncate">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="hidden sm:inline">Capturing tab audio</span>
              <span className="sm:hidden text-xs">Live</span>
            </span>
          )}
          {!isCapturing && !noGemini && (
            <span className="text-gray-400 text-xs sm:text-sm truncate">
              <span className="hidden sm:inline">Click Start Listening — pick the browser tab playing your interview</span>
              <span className="sm:hidden">Pick the interview tab</span>
            </span>
          )}
        </div>

        <button
          onClick={isCapturing ? stopCapture : startCapture}
          disabled={noGemini}
          className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
            isCapturing
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25'
          }`}
        >
          {isCapturing
            ? <><MonitorOff size={16} /> <span>Stop</span></>
            : <><Radio size={16} /> <span className="hidden sm:inline">Start Listening</span><span className="sm:hidden">Start</span></>
          }
        </button>
      </div>
    </div>
  );
}
