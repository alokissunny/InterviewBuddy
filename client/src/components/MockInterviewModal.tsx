import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  X, Mic, MicOff, ChevronRight, RotateCcw,
  CheckCircle2, Loader2, Building2,
} from 'lucide-react';
import { Job } from './JobCard';
import { CandidateProfile } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface Question {
  id: string;
  type: 'Behavioral' | 'Technical' | 'Situational' | 'Motivation/Fit' | 'Leadership';
  question: string;
  hint: string;
  focus?: 'gap' | 'validation' | 'strength';
}

interface AnswerRecord {
  question: Question;
  answer: string;
  feedback: string;
  score: number | null;
}

type Stage = 'loading' | 'question' | 'submitting' | 'feedback' | 'complete';

interface Props {
  job: Job;
  profile: CandidateProfile;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  Behavioral:      'bg-blue-100 text-blue-700',
  Technical:       'bg-purple-100 text-purple-700',
  Situational:     'bg-amber-100 text-amber-700',
  'Motivation/Fit':'bg-green-100 text-green-700',
  Leadership:      'bg-rose-100 text-rose-700',
};

function parseScore(text: string): number | null {
  const m = text.match(/##\s*Score\s*\n\s*(\d+)\s*\/\s*10/i);
  return m ? parseInt(m[1], 10) : null;
}

function scoreColor(s: number) {
  return s >= 7 ? 'text-green-600' : s >= 5 ? 'text-amber-600' : 'text-red-500';
}

function FeedbackDisplay({ text, compact = false }: { text: string; compact?: boolean }) {
  if (!text) return null;
  const sp = compact ? 'space-y-0.5' : 'space-y-1';
  return (
    <div className={sp}>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <p key={i} className={`font-semibold text-gray-600 uppercase tracking-wide ${compact ? 'text-xs mt-2 first:mt-0' : 'text-xs mt-3 first:mt-0'}`}>
              {line.slice(3)}
            </p>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <p key={i} className={`text-gray-600 leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>
              · {line.slice(2)}
            </p>
          );
        }
        if (!line.trim()) return null;
        const isScore = /^\d+\/10/.test(line.trim());
        return (
          <p key={i} className={`leading-relaxed ${compact ? 'text-xs' : 'text-sm'} ${isScore ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function MockInterviewModal({ job, profile, onClose }: Props) {
  const [stage, setStage] = useState<Stage>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const feedbackRef = useRef('');

  // Append each finalized speech segment to the answer
  const onSpeechFinal = useCallback((text: string) => {
    setAnswer(prev => prev ? `${prev} ${text}` : text);
  }, []);

  const {
    interimText,
    isListening,
    isSupported: micSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition(onSpeechFinal, 1200);

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
      setStage('question');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start interview');
      setStage('question');
    }
  }, [job, profile]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  // Stop mic when moving away from the answer stage
  useEffect(() => {
    if (stage !== 'question' && isListening) stopListening();
  }, [stage, isListening, stopListening]);

  const submitAnswer = async () => {
    if (!answer.trim() || !questions[currentIdx]) return;
    if (isListening) stopListening();
    setStage('submitting');
    setFeedback('');
    feedbackRef.current = '';

    try {
      const res = await fetch('/api/mock-interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job, question: questions[currentIdx], answer, profile }),
      });
      if (!res.ok) throw new Error('Failed to get feedback');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      setStage('feedback');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.text) { feedbackRef.current += parsed.text; setFeedback(feedbackRef.current); }
            if (parsed.error) throw new Error(parsed.error);
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      setRecords(prev => [...prev, {
        question: questions[currentIdx],
        answer,
        feedback: feedbackRef.current,
        score: parseScore(feedbackRef.current),
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get feedback');
      setStage('question');
    }
  };

  const nextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      setStage('complete');
    } else {
      setCurrentIdx(i => i + 1);
      setAnswer('');
      setFeedback('');
      feedbackRef.current = '';
      setStage('question');
    }
  };

  const tryAgain = () => {
    setCurrentIdx(0);
    setAnswer('');
    setFeedback('');
    feedbackRef.current = '';
    setRecords([]);
    loadQuestions();
  };

  const avgScore = records.length > 0
    ? Math.round(records.reduce((s, r) => s + (r.score ?? 7), 0) / records.length)
    : null;

  const question = questions[currentIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#EEF3F8] flex items-center justify-center shrink-0 overflow-hidden">
              {job.companyLogo
                ? <img src={job.companyLogo} alt="" className="w-full h-full object-contain p-1" />
                : <Building2 size={16} className="text-[#0A66C2]" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{job.title}</p>
              <p className="text-xs text-gray-400 truncate">{job.company} · Mock Interview</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-4">
            {stage !== 'loading' && stage !== 'complete' && questions.length > 0 && (
              <>
                <div className="flex items-center gap-1">
                  {questions.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${
                      i < currentIdx ? 'bg-green-500' : i === currentIdx ? 'bg-[#0A66C2]' : 'bg-gray-200'
                    }`} />
                  ))}
                </div>
                <span className="text-xs text-gray-400 tabular-nums">{currentIdx + 1}/{questions.length}</span>
              </>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Loading */}
          {stage === 'loading' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={32} className="text-[#0A66C2] animate-spin" />
              <div className="text-center">
                <p className="text-gray-700 font-medium">Preparing your interview…</p>
                <p className="text-gray-400 text-sm mt-1">Generating questions tailored to {job.title}</p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Question + Answer + Feedback */}
          {(stage === 'question' || stage === 'submitting' || stage === 'feedback') && question && (
            <div className="space-y-5">
              {/* Question card */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLORS[question.type] || 'bg-gray-100 text-gray-600'}`}>
                    {question.type}
                  </span>
                  {question.hint && (
                    <span className="text-xs text-gray-400 italic">{question.hint}</span>
                  )}
                </div>
                <p className="text-gray-900 text-[15px] font-medium leading-snug">{question.question}</p>
              </div>

              {/* Answer input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Answer</label>
                  {micSupported && stage === 'question' && (
                    <button
                      onClick={() => isListening ? stopListening() : startListening()}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isListening ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {isListening ? <><MicOff size={12} /> Stop mic</> : <><Mic size={12} /> Use mic</>}
                    </button>
                  )}
                </div>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  disabled={stage !== 'question'}
                  placeholder={stage === 'question' ? 'Type your answer, or use the mic to speak…' : ''}
                  rows={5}
                  className="w-full border border-gray-300 focus:border-[#0A66C2] rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none resize-none transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                />
                {isListening && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                    {interimText ? `"${interimText}"` : 'Listening…'}
                  </p>
                )}
              </div>

              {/* Feedback */}
              {(stage === 'submitting' || (stage === 'feedback' && feedback)) && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Feedback</span>
                    {stage === 'submitting' && <Loader2 size={12} className="text-gray-400 animate-spin" />}
                  </div>
                  <div className="px-4 py-4">
                    <FeedbackDisplay text={feedback} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Complete screen */}
          {stage === 'complete' && (
            <div className="space-y-5">
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Interview Complete!</h3>
                {avgScore !== null && (
                  <p className="text-gray-500 mt-1 text-sm">
                    Average score: <span className={`font-bold ${scoreColor(avgScore)}`}>{avgScore}/10</span>
                  </p>
                )}
              </div>

              {records.map((r, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${TYPE_COLORS[r.question.type] || 'bg-gray-100 text-gray-600'}`}>
                        {r.question.type}
                      </span>
                      <p className="text-sm text-gray-700 leading-snug">{r.question.question}</p>
                    </div>
                    {r.score !== null && (
                      <span className={`text-sm font-bold shrink-0 ${scoreColor(r.score)}`}>{r.score}/10</span>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <FeedbackDisplay text={r.feedback} compact />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between bg-gray-50">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            {stage === 'complete' ? 'Close' : 'Exit interview'}
          </button>

          {stage === 'question' && (
            <button
              onClick={submitAnswer}
              disabled={!answer.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0A66C2] hover:bg-[#004182] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all"
            >
              Submit Answer <ChevronRight size={15} />
            </button>
          )}

          {stage === 'submitting' && (
            <button disabled className="flex items-center gap-2 px-6 py-2.5 bg-[#0A66C2]/60 text-white text-sm font-semibold rounded-xl cursor-not-allowed">
              <Loader2 size={15} className="animate-spin" /> Analyzing…
            </button>
          )}

          {stage === 'feedback' && (
            <button
              onClick={nextQuestion}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0A66C2] hover:bg-[#004182] text-white text-sm font-semibold rounded-xl transition-all"
            >
              {currentIdx + 1 >= questions.length
                ? <><CheckCircle2 size={15} /> Finish</>
                : <>Next Question <ChevronRight size={15} /></>}
            </button>
          )}

          {stage === 'complete' && (
            <button
              onClick={tryAgain}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              <RotateCcw size={15} /> Try Again
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
