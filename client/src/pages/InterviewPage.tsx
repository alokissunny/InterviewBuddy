import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MonitorOff, AlertCircle, Radio, Sparkles, Mic, Activity, Waves, Share2, Brain, ShieldCheck, Zap, ChevronRight, Monitor } from 'lucide-react';
import { CandidateProfile } from '../types';
import { useGeminiCapture, CoachingResult } from '../hooks/useGeminiCapture';
import { ResponsePanel, CoachingEntry } from '../components/ResponsePanel';

// ─── Terminal tokens ──────────────────────────────────────────────────────────
const TK = {
  bg:       '#0b0f0e',
  bg2:      '#111918',
  bg3:      '#172420',
  border:   '#1e2e28',
  border2:  '#2a3e36',
  ink:      '#cce8d8',
  inkDim:   '#9ec8b0',
  inkFaint: '#6a9a82',
  accent:   '#00d97a',
  warn:     '#f5c400',
  pink:     '#f06fa0',
  violet:   '#9d8cee',
  red:      '#e05555',
  mono:     '"JetBrains Mono", ui-monospace, monospace',
};

const KEYFRAMES_ID = 'jc-terminal-keyframes';
const KEYFRAMES = `
@keyframes jc-pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes jc-wave   { 0%,100%{height:3px} 50%{height:13px} }
@keyframes jc-in     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
@keyframes jc-cursor { 0%,49%{opacity:1} 50%,100%{opacity:0} }
@keyframes spin      { to{transform:rotate(360deg)} }
`;

function ensureKeyframes() {
  if (!document.getElementById(KEYFRAMES_ID)) {
    const s = document.createElement('style');
    s.id = KEYFRAMES_ID; s.textContent = KEYFRAMES;
    document.head.appendChild(s);
  }
}

// ─── Terminal Overlay ─────────────────────────────────────────────────────────

interface TerminalOverlayProps {
  history: CoachingEntry[];
  isProcessing: boolean;
  onStop: () => void;
}

function typeColor(t: string) {
  const lc = t.toLowerCase();
  if (lc.includes('behavioral'))  return TK.pink;
  if (lc.includes('technical'))   return TK.violet;
  if (lc.includes('situational')) return TK.warn;
  return TK.accent;
}

function TerminalEntry({ entry, dimmed }: { entry: CoachingEntry; dimmed: boolean }) {
  const { result, question } = entry;
  const [openPtr, setOpenPtr] = useState<number | null>(null);
  const tc = result.type ? typeColor(result.type) : TK.accent;

  return (
    <div style={{
      opacity: dimmed ? 0.3 : 1,
      animation: dimmed ? 'none' : 'jc-in .25s ease',
      display: 'flex', flexDirection: 'column', gap: 8,
      paddingBottom: 16,
      borderBottom: `1px solid ${TK.border}`,
      fontFamily: TK.mono, fontSize: 13, lineHeight: 1.6,
    }}>
      {/* Question */}
      {question && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 3, fontWeight: 700, background: 'rgba(240,111,160,0.12)', color: TK.pink, border: `1px solid rgba(240,111,160,0.25)`, flexShrink: 0, marginTop: 3 }}>THEM</span>
          <span style={{ color: TK.inkDim, flex: 1, wordBreak: 'break-word', fontSize: 15 }}>{question}</span>
        </div>
      )}

      {/* Type label + JC tag */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 3, fontWeight: 700, background: 'rgba(0,217,122,0.1)', color: TK.accent, border: `1px solid rgba(0,217,122,0.25)`, flexShrink: 0 }}>JC</span>
        {result.type && (
          <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: tc, background: `${tc}18`, border: `1px solid ${tc}35`, padding: '1px 6px', borderRadius: 3 }}>{result.type}</span>
        )}
      </div>

      {/* Direct answer */}
      {result.answer && (
        <div style={{
          borderLeft: `2px solid ${TK.accent}`,
          paddingLeft: 14, paddingTop: 10, paddingBottom: 10, paddingRight: 12,
          background: 'rgba(0,217,122,0.05)',
          borderRadius: '0 6px 6px 0',
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.16em', color: TK.accent, marginBottom: 6, fontWeight: 700 }}>SAY THIS</div>
          <div style={{ color: TK.ink, fontSize: 14, lineHeight: 1.65, fontWeight: 400 }}>{result.answer}</div>
        </div>
      )}

      {/* Supporting pointers */}
      {result.pointers.length > 0 && (
        <div style={{
          paddingLeft: 14, paddingTop: 8, paddingBottom: 4,
          borderLeft: `2px solid ${TK.border2}`,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.16em', color: TK.inkFaint, marginBottom: 2 }}>IF PROBED</div>
          {result.pointers.map((p, i) => (
            <div key={i}
              onClick={() => !dimmed && setOpenPtr(openPtr === i ? null : i)}
              style={{ paddingLeft: 14, position: 'relative', cursor: p.detail && !dimmed ? 'pointer' : 'default' }}>
              <span style={{ position: 'absolute', left: 0, top: 1, color: TK.inkDim, fontSize: 11 }}>▸</span>
              <span style={{ color: TK.inkDim, fontWeight: 600, fontSize: 14 }}>{p.cue}</span>
              {openPtr === i && p.detail && (
                <div style={{ color: TK.inkDim, fontSize: 13, marginTop: 4, lineHeight: 1.55, fontWeight: 400 }}>{p.detail}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Keywords */}
      {result.keywords.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: TK.inkFaint, letterSpacing: '0.14em', marginRight: 2 }}>KW</span>
          {result.keywords.map((kw, i) => (
            <span key={i} style={{ fontSize: 11, padding: '1px 7px', borderRadius: 3, background: TK.bg3, color: TK.inkDim, border: `1px solid ${TK.border2}` }}>{kw}</span>
          ))}
        </div>
      )}

      {/* Avoid */}
      {result.avoid && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(224,85,85,0.06)', borderLeft: `2px solid ${TK.red}`, borderRadius: '0 4px 4px 0', padding: '6px 10px' }}>
          <span style={{ color: TK.red, fontSize: 9, letterSpacing: '0.12em', flexShrink: 0, marginTop: 2 }}>AVOID</span>
          <span style={{ color: '#e09090', fontSize: 14 }}>{result.avoid}</span>
        </div>
      )}
    </div>
  );
}

function TerminalOverlay({ history, isProcessing, onStop }: TerminalOverlayProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => { ensureKeyframes(); }, []);

  // Scroll the feed container directly — reliable in fixed layouts
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = feedRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [history.length, isProcessing]);

  const totalPointers = history.reduce((n, e) => n + e.result.pointers.length, 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: TK.bg,
      fontFamily: TK.mono,
      display: 'flex', flexDirection: 'column',
      color: TK.ink,
    }}>
      {/* ── Title bar ── */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center',
        padding: '0 16px', height: 42,
        background: TK.bg2,
        borderBottom: `1px solid ${TK.border}`,
        gap: 12,
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 6, marginRight: 4 }}>
          {[['#ff5f57', true], ['#febc2e', false], ['#28c840', false]].map(([c, clickable], i) => (
            <div key={i} title={clickable ? 'Stop session' : undefined}
              onClick={clickable ? onStop : undefined}
              style={{ width: 12, height: 12, borderRadius: '50%', background: c as string, cursor: clickable ? 'pointer' : 'default', flexShrink: 0 }} />
          ))}
        </div>

        {/* Title */}
        <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: TK.inkDim, letterSpacing: '0.04em' }}>
          jobcracker — interview copilot
        </div>

        {/* Live status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: isProcessing ? TK.warn : TK.accent }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isProcessing ? TK.warn : TK.accent, display: 'inline-block', animation: 'jc-pulse 1.6s infinite' }} />
            {isProcessing ? 'analysing' : 'live'}
          </span>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 20,
        padding: '0 16px', height: 28,
        background: TK.bg,
        borderBottom: `1px solid ${TK.border}`,
        fontSize: 11, color: TK.inkFaint,
      }}>
        <span><span style={{ color: TK.inkDim }}>{history.length}</span> questions</span>
        <span><span style={{ color: TK.inkDim }}>{totalPointers}</span> pointers</span>
        {isProcessing && (
          <span style={{ color: TK.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px solid ${TK.accent}`, borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.75s linear infinite' }} />
            generating…
          </span>
        )}
        {!isProcessing && history.length === 0 && (
          <span style={{ color: TK.inkFaint }}>waiting for question
            <span style={{ display: 'inline-block', width: 7, height: 13, background: TK.inkFaint, verticalAlign: 'text-bottom', marginLeft: 3, animation: 'jc-cursor 1s steps(1) infinite' }} />
          </span>
        )}
      </div>

      {/* ── Feed ── */}
      <div ref={feedRef} style={{
        flex: 1, overflowY: 'auto',
        padding: '20px 24px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {history.slice(0, -1).map(e => <TerminalEntry key={e.id} entry={e} dimmed />)}
        {history.length > 0 && (
          <TerminalEntry key={history[history.length - 1].id} entry={history[history.length - 1]} dimmed={false} />
        )}

        {/* Analysing skeleton */}
        {isProcessing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, animation: 'jc-in .2s ease' }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, fontWeight: 700, background: 'rgba(0,217,122,0.1)', color: TK.accent, border: `1px solid rgba(0,217,122,0.25)` }}>JC</span>
              <span style={{ color: TK.inkDim, fontSize: 12 }}>generating answer…</span>
            </div>
            {[68, 82, 55, 74].map((w, i) => (
              <div key={i} style={{ height: 10, borderRadius: 3, background: TK.bg3, width: `${w}%`, marginLeft: i > 0 ? 16 : 0, animation: `jc-pulse ${1.2 + i * 0.15}s ease infinite` }} />
            ))}
          </div>
        )}
      </div>

      {/* ── Floating stop button ── */}
      <div style={{
        flexShrink: 0, display: 'flex', justifyContent: 'center',
        padding: '12px 16px',
        background: `linear-gradient(to top, ${TK.bg} 60%, transparent)`,
      }}>
        <button onClick={onStop} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 40px', borderRadius: 8,
          background: 'rgba(224,85,85,0.14)', border: `1.5px solid rgba(224,85,85,0.45)`,
          color: '#f08080', fontSize: 15, fontFamily: TK.mono, cursor: 'pointer', fontWeight: 700,
          letterSpacing: '0.06em',
        }}>
          <MonitorOff size={18} /> STOP SESSION
        </button>
      </div>

      {/* ── Footer bar ── */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 26,
        background: TK.bg2,
        borderTop: `1px solid ${TK.border}`,
        fontSize: 10, color: TK.inkFaint, letterSpacing: '0.06em',
      }}>
        <span>JC · interview copilot</span>
        <span>click pointer to expand detail</span>
      </div>
    </div>
  );
}

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
      {/* Terminal overlay — fixed over the full app when capturing */}
      {isCapturing && (
        <TerminalOverlay
          history={coachingHistory}
          isProcessing={isProcessing}
          onStop={stopCapture}
        />
      )}

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

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {!isCapturing ? (
          /* ── Idle: setup guide ─────────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

              {/* Hero */}
              <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg,#4F46E5,#7C3AED,#4F46E5)', backgroundSize: '200% 100%' }} />
                <div className="px-6 py-8 flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl"
                      style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', boxShadow: '0 12px 32px rgba(79,70,229,0.35)' }}>
                      <Mic size={32} className="text-white" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-white" />
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Real-time AI Coaching
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                      Your Interview Copilot<br />
                      <span className="text-indigo-600">is ready.</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 leading-relaxed max-w-md">
                      Listens to your Zoom, Meet, or Teams call and whispers context-aware answers in real time — drawn from your CV and the job description.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3-step guide */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">How to use</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      n: '01',
                      icon: <Monitor size={18} className="text-indigo-500" />,
                      title: 'Join your interview call',
                      desc: 'Open Zoom, Google Meet, Teams, or any browser-based video call in a separate tab.',
                      color: 'border-indigo-100 bg-indigo-50/40',
                      num: 'text-indigo-300',
                    },
                    {
                      n: '02',
                      icon: <Share2 size={18} className="text-violet-500" />,
                      title: 'Click "Start Listening"',
                      desc: 'A browser dialog will appear. Select the interview tab and enable "Share tab audio".',
                      color: 'border-violet-100 bg-violet-50/40',
                      num: 'text-violet-300',
                    },
                    {
                      n: '03',
                      icon: <Brain size={18} className="text-green-600" />,
                      title: 'Get real-time answers',
                      desc: 'When a question is detected, a coaching overlay appears with a direct answer and key talking points.',
                      color: 'border-green-100 bg-green-50/40',
                      num: 'text-green-300',
                    },
                  ].map(s => (
                    <div key={s.n} className={`rounded-2xl border p-5 space-y-3 ${s.color}`}>
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                          {s.icon}
                        </div>
                        <span className={`font-black text-3xl ${s.num}`}>{s.n}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{s.title}</p>
                        <p className="text-gray-500 text-xs mt-1 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* What you'll see — sample response preview */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">What you'll see during the call</p>
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <div className="flex gap-1.5">
                      {['#ff5f57','#febc2e','#28c840'].map(c => (
                        <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 font-mono">jobcracker — interview copilot</span>
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />live
                    </span>
                  </div>
                  <div className="p-4 space-y-3 font-mono text-sm" style={{ background: '#0b0f0e' }}>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold shrink-0 mt-0.5" style={{ background: 'rgba(240,111,160,0.15)', color: '#f06fa0', border: '1px solid rgba(240,111,160,0.3)' }}>THEM</span>
                      <span style={{ color: '#9ec8b0', fontSize: 13 }}>"Tell me about a time you handled stakeholder conflict."</span>
                    </div>
                    <div className="rounded-lg p-3 space-y-1.5" style={{ borderLeft: '2px solid #00d97a', background: 'rgba(0,217,122,0.05)', paddingLeft: 12 }}>
                      <div className="text-[9px] font-bold tracking-widest" style={{ color: '#00d97a' }}>SAY THIS</div>
                      <p style={{ color: '#cce8d8', fontSize: 12, lineHeight: 1.6 }}>
                        "During the Q3 API migration at my last role, engineering pushed back on the timeline. I ran a data review showing 3.2% revenue risk, proposed a phased rollout, and got buy-in from both sides. We shipped on time with zero churn."
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['stakeholder alignment','phased rollout','data-driven'].map(kw => (
                        <span key={kw} className="text-[11px] px-2 py-0.5 rounded" style={{ background: '#172420', color: '#6a9a82', border: '1px solid #2a3e36' }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature chips row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: <Zap size={14} className="text-indigo-500" />,      label: '0.4s response',       sub: 'Sub-second latency' },
                  { icon: <ShieldCheck size={14} className="text-green-600" />, label: 'Undetectable',        sub: 'Only visible to you' },
                  { icon: <Brain size={14} className="text-violet-500" />,    label: 'Context-aware',       sub: 'Uses your CV + JD' },
                  { icon: <Activity size={14} className="text-amber-500" />,  label: 'STAR structured',     sub: 'Formatted answers' },
                ].map(f => (
                  <div key={f.label} className="rounded-xl border border-gray-200 bg-white p-3.5 flex items-start gap-3 shadow-sm">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{f.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{f.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Compatible with */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 shrink-0">Works on</p>
                <div className="flex flex-wrap gap-2">
                  {['Zoom','Google Meet','Microsoft Teams','Any browser tab'].map(p => (
                    <span key={p} className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700">{p}</span>
                  ))}
                </div>
                <div className="sm:ml-auto text-[11px] text-gray-400 flex items-center gap-1.5 shrink-0">
                  <ShieldCheck size={11} className="text-green-500" /> Audio never stored
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* ── Active session: AI Coach panel ─────────────────────────────────── */
          <div className="flex-1 flex flex-col md:flex-row gap-3 p-3 md:gap-4 md:p-4 overflow-hidden min-h-0">
            {/* Status sidebar — desktop only */}
            <div className="hidden md:flex w-52 shrink-0 flex-col gap-3">
              <div className="card p-4 flex flex-col items-center gap-4 text-center">
                <div className="relative flex items-center justify-center mt-2">
                  <span className="absolute w-20 h-20 rounded-full bg-indigo-500/10 animate-ping" />
                  <span className="absolute w-14 h-14 rounded-full bg-indigo-500/15 animate-ping" style={{ animationDelay: '0.3s' }} />
                  <div className="relative w-12 h-12 rounded-full flex items-center justify-center shadow-md bg-indigo-600">
                    <Mic size={22} className="text-white" />
                  </div>
                </div>
                {isProcessing ? (
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-indigo-600">Analysing…</p>
                    <p className="text-[10px] text-indigo-400">Question detected</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-green-600">Listening</p>
                    <p className="text-[10px] text-gray-400">Waiting for question</p>
                  </div>
                )}
                <div className="flex items-end gap-1 h-6">
                  {[3,5,8,6,4,7,5,3,6,4].map((h, i) => (
                    <div key={i} className="w-1 rounded-full bg-indigo-400"
                      style={{ height: `${h * 3}px`, animation: `pulse ${0.4 + i * 0.07}s ease-in-out infinite alternate` }} />
                  ))}
                </div>
              </div>
              <div className="card p-3 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Session</p>
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">{coachingHistory.length}</p>
                    <p className="text-[10px] text-gray-400">Questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Waves size={13} className="text-green-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">{totalPointers}</p>
                    <p className="text-[10px] text-gray-400">Pointers</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <ResponsePanel history={coachingHistory} isAnalyzing={isProcessing} error={null} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-3.5 bg-white border-t border-gray-200 shrink-0 gap-3">
        <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
          {isCapturing && isProcessing && (
            <span className="flex items-center gap-1.5 text-indigo-600 truncate">
              <Sparkles size={13} className="animate-pulse shrink-0" />
              <span className="hidden sm:inline">Listening · analysing question…</span>
              <span className="sm:hidden">Analysing…</span>
            </span>
          )}
          {isCapturing && !isProcessing && (
            <span className="flex items-center gap-1.5 text-green-600 truncate">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="hidden sm:inline">Live · waiting for a question to be asked</span>
              <span className="sm:hidden text-xs">Live</span>
            </span>
          )}
          {!isCapturing && !noGemini && (
            <span className="text-gray-400 text-xs sm:text-sm truncate">
              <span className="hidden sm:inline">Ready — click Start Listening, then select the tab playing your interview and enable tab audio</span>
              <span className="sm:hidden text-xs">Select your interview tab</span>
            </span>
          )}
        </div>

        <button
          onClick={isCapturing ? stopCapture : startCapture}
          disabled={noGemini}
          className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-xl font-semibold text-sm transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
            isCapturing
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
          }`}
          style={!isCapturing ? { boxShadow: '0 4px 20px rgba(79,70,229,0.4)' } : undefined}
        >
          {isCapturing
            ? <><MonitorOff size={16} /> <span>Stop Session</span></>
            : <><Radio size={16} /> <span className="hidden sm:inline">Start Listening</span><span className="sm:hidden">Start</span></>
          }
        </button>
      </div>
    </div>
  );
}
