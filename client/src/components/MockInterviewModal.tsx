import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  X, MicOff, RotateCcw, CheckCircle2, Loader2,
  Building2, Volume2, Mic,
} from 'lucide-react';
import { Job } from './JobCard';
import { CandidateProfile } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  type: 'Behavioral' | 'Technical' | 'Situational' | 'Motivation/Fit' | 'Leadership';
  question: string;
  hint: string;
  focus?: 'gap' | 'validation' | 'strength';
}

interface Turn {
  role: 'interviewer' | 'candidate';
  text: string;
}

interface TopicRecord {
  question: Question;
  conversation: Turn[];
  feedback: string;
  score: number | null;
}

// loading → intro → asking → listening → thinking → followup_ask → feedback_speaking → complete
type Stage =
  | 'loading'
  | 'intro'
  | 'asking'        // TTS reading the (follow-up) question
  | 'listening'     // mic live, user speaking
  | 'thinking'      // fetching followup or feedback from server
  | 'feedback_speaking' // TTS reading feedback, written panel visible
  | 'complete';

interface Props { job: Job; profile: CandidateProfile; onClose: () => void; }

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_EXCHANGES = 2; // candidate answers per topic before feedback

const TYPE_COLORS: Record<string, string> = {
  Behavioral:       'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Technical:        'bg-violet-500/20 text-violet-300 border-violet-500/30',
  Situational:      'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Motivation/Fit': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Leadership:       'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseScore(text: string): number | null {
  const m = text.match(/##\s*Score\s*\n\s*(\d+)\s*\/\s*10/i);
  return m ? parseInt(m[1], 10) : null;
}

function extractSpoken(text: string): string {
  const m = text.match(/##\s*Spoken\s*\n([^\n#]+)/i);
  return m ? m[1].trim() : '';
}

function scoreColor(s: number) {
  return s >= 7 ? 'text-emerald-400' : s >= 5 ? 'text-amber-400' : 'text-red-400';
}

function scoreBg(s: number) {
  return s >= 7
    ? 'border-emerald-500/30 bg-emerald-500/10'
    : s >= 5
    ? 'border-amber-500/30 bg-amber-500/10'
    : 'border-red-500/30 bg-red-500/10';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-6">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full ${active ? 'bg-emerald-400' : 'bg-gray-600'}`}
          style={{
            height: active ? `${12 + Math.sin(i * 0.9) * 8}px` : '4px',
            animation: active ? `wave ${0.5 + i * 0.07}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.07}s`,
          }}
        />
      ))}
      <style>{`@keyframes wave { from { height: 4px } to { height: 22px } }`}</style>
    </div>
  );
}

function AvatarPulse({ speaking, logo, company }: { speaking: boolean; logo?: string; company: string }) {
  return (
    <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
      {speaking && (
        <div className="absolute inset-0 rounded-full border-2 border-[#0A66C2]/50 animate-ping" />
      )}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 overflow-hidden transition-colors
        ${speaking ? 'border-[#0A66C2] bg-[#0A66C2]/10' : 'border-gray-600 bg-gray-800'}`}>
        {logo
          ? <img src={logo} alt={company} className="w-8 h-8 object-contain" />
          : <Building2 size={20} className={speaking ? 'text-[#0A66C2]' : 'text-gray-500'} />}
      </div>
    </div>
  );
}

function ChatBubble({ turn }: { turn: Turn }) {
  const isInterviewer = turn.role === 'interviewer';
  return (
    <div className={`flex gap-2 ${isInterviewer ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
        ${isInterviewer
          ? 'bg-gray-700/80 text-gray-100 rounded-tl-sm'
          : 'bg-[#0A66C2]/80 text-white rounded-tr-sm'}`}>
        {turn.text}
      </div>
    </div>
  );
}

function FeedbackPanel({ text }: { text: string }) {
  const filtered = text.replace(/##\s*Spoken\s*\n[^\n#]+\n?/i, '').trim();
  return (
    <div className="space-y-2">
      {filtered.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <p key={i} className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-3 first:mt-0">{line.slice(3)}</p>;
        if (line.startsWith('- '))
          return <p key={i} className="text-sm text-gray-300 pl-2">· {line.slice(2)}</p>;
        if (!line.trim()) return null;
        const isScore = /^\d+\/10/.test(line.trim());
        return <p key={i} className={`text-sm leading-relaxed ${isScore ? 'font-bold text-white text-base' : 'text-gray-300'}`}>{line}</p>;
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MockInterviewModal({ job, profile, onClose }: Props) {
  const [stage, setStage] = useState<Stage>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topicIdx, setTopicIdx] = useState(0);
  const [conversation, setConversation] = useState<Turn[]>([]);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [records, setRecords] = useState<TopicRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(120);
  const [editableTranscript, setEditableTranscript] = useState(''); // user-editable STT text

  const feedbackRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Refs updated every render so async callbacks never read stale state ──────
  // Root cause of the "not captured" bug: onSilence was memoized with [stage],
  // but startListening() is called synchronously before React flushes setStage('listening'),
  // so stage inside the closure was still 'asking' → guard failed → nothing submitted.
  const stageRef = useRef<Stage>('loading');
  stageRef.current = stage;                       // always current

  const handleAnswerRef = useRef<(text: string) => void>(() => {});
  const accumulatedRef = useRef('');              // synced below after speech is declared

  const tts = useTextToSpeech();

  // Stable onSilence with zero deps — reads everything through refs
  const onSilence = useCallback((_lastSegment: string) => {
    if (stageRef.current !== 'listening') return;
    // Use full accumulated text, fall back to last segment if recognition just started
    const text = (accumulatedRef.current || _lastSegment).trim();
    if (text) handleAnswerRef.current(text);
  }, []); // intentionally no deps

  // 5 s silence + require 8 words minimum before auto-submit
  const speech = useSpeechRecognition(onSilence, 5000, 8);

  // Keep refs current every render
  accumulatedRef.current = speech.accumulatedText;

  // Sync editable transcript from STT (only when user hasn't manually edited)
  const userEditedRef = useRef(false);
  useEffect(() => {
    if (!userEditedRef.current) setEditableTranscript(speech.accumulatedText);
  }, [speech.accumulatedText]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, feedbackText]);

  // ── Timer ────────────────────────────────────────────────────────────────────

  const playBeep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } catch { /* AudioContext not available */ }
  };

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const startTimer = () => {
    stopTimer();
    setTimer(120);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          stopTimer();
          // Use refs — the interval closure would otherwise capture stale state
          if (stageRef.current === 'listening') {
            const ans = accumulatedRef.current.trim();
            if (ans) handleAnswerRef.current(ans);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => { if (stage !== 'listening') stopTimer(); }, [stage]);
  useEffect(() => () => { stopTimer(); tts.stop(); speech.stopListening(); }, []); // eslint-disable-line

  // ── Interview flow ───────────────────────────────────────────────────────────

  const loadQuestions = useCallback(async () => {
    setStage('loading');
    setError(null);
    try {
      const res = await fetch('/api/mock-interview/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job, profile, count: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate questions');
      setQuestions(data.questions);
      setTopicIdx(0);
      setRecords([]);
      startIntro(data.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      setStage('intro');
    }
  }, [job, profile]); // eslint-disable-line

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const startIntro = (qs: Question[]) => {
    setStage('intro');
    tts.speak(
      `Hi, I'm Alex from ${job.company}. We'll go through ${qs.length} topics today. I'll ask follow-up questions as we go — just talk naturally.`,
      () => askQuestion(qs, 0, [])
    );
  };

  const askQuestion = (qs: Question[], idx: number, convo: Turn[]) => {
    const q = qs[idx];
    if (!q) return;
    speech.clearEntries();
    setFeedbackText('');
    feedbackRef.current = '';
    setConversation(convo);
    setExchangeCount(0);
    setStage('asking');
    const newConvo: Turn[] = [...convo, { role: 'interviewer', text: q.question }];
    setConversation(newConvo);
    tts.speak(q.question, () => beginListening());
  };

  const askFollowup = (convo: Turn[], followupText: string) => {
    const newConvo: Turn[] = [...convo, { role: 'interviewer', text: followupText }];
    setConversation(newConvo);
    setStage('asking');
    speech.clearEntries();
    tts.speak(followupText, () => beginListening());
  };

  const beginListening = () => {
    userEditedRef.current = false;
    setEditableTranscript('');
    setStage('listening');
    startTimer();
    speech.startListening();
  };

  // Play beep the moment the mic is confirmed ready — tells user to start speaking
  const prevMicReadyRef = useRef(false);
  useEffect(() => {
    if (speech.isMicReady && !prevMicReadyRef.current && stage === 'listening') {
      playBeep();
    }
    prevMicReadyRef.current = speech.isMicReady;
  }, [speech.isMicReady, stage]);

  const handleCandidateAnswer = async (rawText: string) => {
    // Prefer the user-edited transcript if they've touched it; otherwise use STT text
    const text = (userEditedRef.current ? editableTranscript : rawText || editableTranscript).trim();
    if (!text || stageRef.current !== 'listening') return;
    stopTimer();
    speech.stopListening();
    tts.stop();
    userEditedRef.current = false;

    const newConvo: Turn[] = [...conversation, { role: 'candidate', text: text.trim() }];
    setConversation(newConvo);
    const newCount = exchangeCount + 1;
    setExchangeCount(newCount);
    setStage('thinking');

    if (newCount < MAX_EXCHANGES) {
      await fetchFollowup(newConvo);
    } else {
      await fetchFeedback(newConvo);
    }
  };

  // Keep ref pointing to latest version (non-memoized fn, recreated each render)
  handleAnswerRef.current = handleCandidateAnswer;

  const fetchFollowup = async (convo: Turn[]) => {
    try {
      const res = await fetch('/api/mock-interview/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job, profile, question: questions[topicIdx], conversation: convo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get follow-up');
      askFollowup(convo, data.followup);
    } catch (err) {
      // On error skip to feedback
      await fetchFeedback(convo);
    }
  };

  const fetchFeedback = async (convo: Turn[]) => {
    tts.speak('Let me think about that for a moment.');
    try {
      const res = await fetch('/api/mock-interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job, question: questions[topicIdx], conversation: convo, profile }),
      });
      if (!res.ok) throw new Error('Failed to get feedback');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.text) { full += parsed.text; feedbackRef.current = full; setFeedbackText(full); }
            if (parsed.error) throw new Error(parsed.error);
          } catch (e) { if (e instanceof SyntaxError) continue; throw e; }
        }
      }

      const score = parseScore(full);
      setRecords(prev => [...prev, { question: questions[topicIdx], conversation: convo, feedback: full, score }]);

      tts.stop();
      setStage('feedback_speaking');
      const spoken = extractSpoken(full);
      if (spoken) tts.speak(spoken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get feedback');
      setStage('feedback_speaking');
    }
  };

  const nextTopic = () => {
    tts.stop();
    const next = topicIdx + 1;
    if (next >= questions.length) {
      setStage('complete');
      tts.speak('Great work. You\'ve completed the interview. Here\'s your full summary.');
    } else {
      setTopicIdx(next);
      askQuestion(questions, next, []);
    }
  };

  const tryAgain = () => {
    tts.stop();
    speech.stopListening();
    speech.clearEntries();
    loadQuestions();
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const question = questions[topicIdx];
  const avgScore = records.length
    ? Math.round(records.reduce((s, r) => s + (r.score ?? 6), 0) / records.length)
    : null;
  const liveText = [speech.accumulatedText, speech.interimText].filter(Boolean).join(' ');
  const fmtTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-700/50">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700/60 shrink-0">
          <AvatarPulse speaking={tts.isSpeaking} logo={job.companyLogo} company={job.company} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Alex · {job.company}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {stage === 'loading' && <p className="text-xs text-gray-500">Preparing interview…</p>}
              {(stage === 'intro' || stage === 'asking') && tts.isSpeaking && (
                <p className="text-xs text-[#0A66C2] flex items-center gap-1"><Volume2 size={11} /> Speaking…</p>
              )}
              {stage === 'listening' && (
                <p className="text-xs text-emerald-400 flex items-center gap-1"><Mic size={11} /> Listening</p>
              )}
              {stage === 'thinking' && (
                <p className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Thinking…</p>
              )}
              {stage === 'feedback_speaking' && tts.isSpeaking && (
                <p className="text-xs text-amber-400 flex items-center gap-1"><Volume2 size={11} /> Feedback</p>
              )}
              {stage === 'feedback_speaking' && !tts.isSpeaking && (
                <p className="text-xs text-gray-500">Review feedback below</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Topic dots */}
            {questions.length > 0 && stage !== 'loading' && stage !== 'complete' && (
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i < topicIdx ? 'bg-emerald-500' : i === topicIdx ? 'bg-[#0A66C2]' : 'bg-gray-600'
                  }`} />
                ))}
              </div>
            )}
            {/* Question type badge */}
            {question && stage !== 'loading' && stage !== 'complete' && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[question.type] || ''}`}>
                {question.type}
              </span>
            )}
            <button
              onClick={() => { tts.stop(); speech.stopListening(); onClose(); }}
              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">

          {/* Loading */}
          {stage === 'loading' && (
            <div className="flex flex-col items-center justify-center h-60 gap-3">
              <Loader2 size={30} className="text-[#0A66C2] animate-spin" />
              <p className="text-gray-400 text-sm">Tailoring questions to the role…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Chat conversation */}
          {stage !== 'loading' && stage !== 'complete' && conversation.map((turn, i) => (
            <ChatBubble key={i} turn={turn} />
          ))}

          {/* Asking — hint below the question bubble */}
          {stage === 'asking' && (
            <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
              <Volume2 size={11} className="text-[#0A66C2] shrink-0" />
              Reading question… tap <span className="text-emerald-400 font-medium">Start Answering</span> when ready
            </div>
          )}

          {/* ── Listening panel ─────────────────────────────────────────────── */}
          {stage === 'listening' && (
            <div className={`rounded-2xl border p-4 space-y-3 transition-colors ${
              speech.isMicReady
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-gray-600/40 bg-gray-800/40'
            }`}>
              {/* Status row */}
              <div className="flex items-center gap-2">
                {speech.isMicReady ? (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Listening</span>
                  </>
                ) : (
                  <>
                    <Loader2 size={12} className="text-gray-400 animate-spin shrink-0" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Warming up mic… wait for beep
                    </span>
                  </>
                )}
                <div className="ml-auto flex items-center gap-3">
                  {speech.isMicReady && <Waveform active={speech.isListening} />}
                </div>
              </div>

              {/* Editable transcript — STT output user can correct before submitting */}
              <div className="space-y-1">
                <textarea
                  value={editableTranscript + (speech.interimText ? ` ${speech.interimText}` : '')}
                  onChange={e => {
                    userEditedRef.current = true;
                    setEditableTranscript(e.target.value);
                  }}
                  placeholder={speech.isMicReady ? 'Your words will appear here — you can edit before submitting…' : ''}
                  rows={4}
                  className="w-full bg-transparent text-sm text-white placeholder:text-gray-600 resize-none outline-none leading-relaxed"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-600">
                    {editableTranscript.trim().split(/\s+/).filter(Boolean).length} words · edit to fix errors
                  </span>
                  {speech.interimText && (
                    <span className="text-[10px] text-emerald-500 italic">capturing…</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Feedback panel (shown after thinking, stays visible) */}
          {(stage === 'feedback_speaking') && feedbackText && (
            <div className="bg-gray-800/70 border border-gray-700/50 rounded-2xl p-4 mt-2">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Feedback</p>
              <FeedbackPanel text={feedbackText} />
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={chatEndRef} />

          {/* Complete — all topic records */}
          {stage === 'complete' && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Interview Complete</h3>
                {avgScore !== null && (
                  <p className="text-gray-400 text-sm mt-0.5">
                    Overall: <span className={`font-bold ${scoreColor(avgScore)}`}>{avgScore}/10</span>
                  </p>
                )}
              </div>

              {records.map((r, i) => (
                <div key={i} className={`border rounded-2xl overflow-hidden ${r.score !== null ? scoreBg(r.score) : 'border-gray-700/50 bg-gray-800/60'}`}>
                  {/* Conversation replay */}
                  <div className="px-4 pt-3 pb-2 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[r.question.type] || ''}`}>
                        {r.question.type}
                      </span>
                      {r.score !== null && (
                        <span className={`text-sm font-bold ml-auto ${scoreColor(r.score)}`}>{r.score}/10</span>
                      )}
                    </div>
                    {r.conversation.map((turn, j) => <ChatBubble key={j} turn={turn} />)}
                  </div>
                  {/* Feedback */}
                  <div className="px-4 pb-4 pt-2 border-t border-gray-700/30">
                    <FeedbackPanel text={r.feedback} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-3 border-t border-gray-700/60 shrink-0 flex items-center justify-between bg-gray-900">
          <button
            onClick={() => { tts.stop(); speech.stopListening(); onClose(); }}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            {stage === 'complete' ? 'Close' : 'Exit'}
          </button>

          <div className="flex items-center gap-3">
            {/* Listening: timer + done button */}
            {stage === 'listening' && (
              <>
                <span className={`text-sm font-mono tabular-nums ${timer <= 30 ? 'text-red-400' : 'text-gray-400'}`}>
                  {fmtTimer(timer)}
                </span>
                <button
                  onClick={() => handleCandidateAnswer(editableTranscript || speech.accumulatedText)}
                  disabled={!editableTranscript.trim() && !speech.accumulatedText.trim() && !speech.interimText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all"
                >
                  <MicOff size={13} /> Done
                </button>
              </>
            )}

            {/* Asking — manual start in case TTS onend doesn't fire */}
            {stage === 'asking' && (
              <button
                onClick={() => { tts.stop(); beginListening(); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all"
              >
                <Mic size={13} /> Start Answering
              </button>
            )}

            {/* Thinking */}
            {stage === 'thinking' && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 size={14} className="animate-spin" />
                {exchangeCount >= MAX_EXCHANGES ? 'Generating feedback…' : 'Generating follow-up…'}
              </div>
            )}

            {/* Feedback — next topic */}
            {stage === 'feedback_speaking' && (
              <button
                onClick={nextTopic}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white text-sm font-semibold rounded-xl transition-all"
              >
                {topicIdx + 1 >= questions.length
                  ? <><CheckCircle2 size={13} /> Finish</>
                  : <>Next Topic ›</>}
              </button>
            )}

            {/* Complete */}
            {stage === 'complete' && (
              <button
                onClick={tryAgain}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-xl transition-all"
              >
                <RotateCcw size={13} /> Try Again
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
