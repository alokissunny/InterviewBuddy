import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen, ArrowLeft, CheckCircle2, Circle, Search,
  Sparkles, ListChecks, GitBranch, Database, Layers,
  Zap, ExternalLink, MessageSquareQuote, Target, AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import {
  TOPICS, CATEGORY_META, topicById,
  type InterviewTopic, type TopicCategory,
} from '../data/interviewPrepData';
import {
  QUESTIONS, Q_DIFFICULTY_STYLE, questionById,
  type SystemDesignQuestion,
} from '../data/systemDesignQuestions';
import { AnimatedArchDiagram } from '../components/AnimatedArchDiagram';
import { DeepContentRenderer, DeepContentTOC } from '../components/DeepContentRenderer';

const PROGRESS_KEY = 'jobcracker_prep_progress';

function loadProgress(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(p: Record<string, boolean>) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

const CATEGORY_ICON: Record<TopicCategory, React.ElementType> = {
  core:     Layers,
  pattern:  GitBranch,
  deepdive: Database,
};

const DIFFICULTY_STYLE: Record<InterviewTopic['difficulty'], { label: string; bg: string; fg: string }> = {
  foundational: { label: 'Foundational', bg: '#ECFDF5', fg: '#047857' },
  intermediate: { label: 'Intermediate', bg: '#EFF6FF', fg: '#1D4ED8' },
  advanced:     { label: 'Advanced',     bg: '#FEF2F2', fg: '#B91C1C' },
};

interface Props {
  /** Optional — wires up "Practice" CTA to the mock interview tab */
  onPractice?: (topic: InterviewTopic) => void;
}

export function InterviewPrepPage({ onPractice }: Props) {
  const [progress, setProgress] = useState<Record<string, boolean>>(() => loadProgress());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeQId, setActiveQId] = useState<string | null>(null);
  const [query, setQuery]       = useState('');
  const [filter, setFilter]     = useState<TopicCategory | 'question' | 'all'>('all');

  useEffect(() => { saveProgress(progress); }, [progress]);

  const toggleDone = (id: string) =>
    setProgress(p => ({ ...p, [id]: !p[id] }));

  const handleSelectTopic = (id: string) => { setActiveId(id); setActiveQId(null); };
  const handleSelectQuestion = (id: string) => { setActiveQId(id); setActiveId(null); };

  const showQuestions = filter === 'all' || filter === 'question';
  const showTopics    = filter !== 'question';

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOPICS.filter(t => {
      if (filter !== 'all' && filter !== 'question' && t.category !== filter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.overview.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  const visibleQuestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return QUESTIONS.filter(qn => {
      if (!q) return true;
      return (
        qn.title.toLowerCase().includes(q) ||
        qn.tagline.toLowerCase().includes(q) ||
        qn.prompt.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const grouped = useMemo(() => {
    const buckets: Record<TopicCategory, InterviewTopic[]> = {
      core: [], pattern: [], deepdive: [],
    };
    visible.forEach(t => buckets[t.category].push(t));
    return buckets;
  }, [visible]);

  const stats = useMemo(() => {
    const total = TOPICS.length + QUESTIONS.length;
    const done  = [...TOPICS, ...QUESTIONS].filter(t => progress[t.id]).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [progress]);

  const active   = activeId  ? topicById(activeId)   : null;
  const activeQ  = activeQId ? questionById(activeQId) : null;

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Left sidebar ──────────────────────────────────────────── */}
      <LearnSidebar
        activeId={activeId}
        activeQId={activeQId}
        progress={progress}
        onSelectTopic={handleSelectTopic}
        onSelectQuestion={handleSelectQuestion}
      />

      {/* ── Right content area ────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {active ? (
          <TopicDetailPage
            key={active.id}
            topic={active}
            done={!!progress[active.id]}
            onBack={() => setActiveId(null)}
            onToggleDone={() => toggleDone(active.id)}
            onNavigate={handleSelectTopic}
            onPractice={onPractice}
          />
        ) : activeQ ? (
          <QuestionDetailPage
            key={activeQ.id}
            question={activeQ}
            done={!!progress[activeQ.id]}
            onBack={() => setActiveQId(null)}
            onToggleDone={() => toggleDone(activeQ.id)}
          />
        ) : (
          <div className="h-full overflow-y-auto bg-[#F3F2EF]">
            <div className="max-w-5xl mx-auto px-4 sm:px-5 py-5 space-y-4">

              {/* ── Compact header ────────────────────────────────────────── */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg font-bold text-gray-900">System Design</h1>
                  <p className="text-xs text-gray-500 mt-0.5">{stats.done}/{stats.total} topics complete</p>
                </div>
                <div className="flex-1 max-w-xs">
                  <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${stats.pct}%`, background: 'linear-gradient(90deg,#4F46E5,#7C3AED)' }} />
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600 shrink-0">{stats.pct}%</span>
              </div>

              {/* ── Search + filter ───────────────────────────────────────── */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2.5 flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search topics, e.g. Kafka, sharding, Bitly…"
                    className="w-full pl-8 pr-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 bg-gray-50 border border-gray-200 focus:border-indigo-300 focus:bg-white rounded-lg outline-none transition-colors"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {(['all', 'core', 'pattern', 'deepdive', 'question'] as const).map(f => {
                    const isActive = filter === f;
                    const label =
                      f === 'all'      ? 'All' :
                      f === 'question' ? 'Questions' :
                      CATEGORY_META[f].label;
                    return (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Concept sections ──────────────────────────────────────── */}
              {showTopics && (['core', 'pattern', 'deepdive'] as TopicCategory[]).map(cat => {
                const items = grouped[cat];
                if (items.length === 0) return null;
                const meta = CATEGORY_META[cat];
                const Icon = CATEGORY_ICON[cat];

                return (
                  <section key={cat} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${meta.accent}15`, border: `1px solid ${meta.accent}30` }}>
                        <Icon size={17} style={{ color: meta.accent }} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900 leading-tight">{meta.label}</h2>
                        <p className="text-xs text-gray-500">{meta.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map(t => (
                        <TopicCard
                          key={t.id}
                          topic={t}
                          done={!!progress[t.id]}
                          onOpen={() => handleSelectTopic(t.id)}
                          onToggleDone={() => toggleDone(t.id)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              {/* ── Question Breakdowns ───────────────────────────────────── */}
              {showQuestions && visibleQuestions.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                      <MessageSquareQuote size={17} style={{ color: '#D97706' }} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 leading-tight">Question Breakdowns</h2>
                      <p className="text-xs text-gray-500">Walked-through system design questions with animated diagrams and a quirky tone.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visibleQuestions.map(q => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        done={!!progress[q.id]}
                        onOpen={() => handleSelectQuestion(q.id)}
                        onToggleDone={() => toggleDone(q.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {visible.length === 0 && visibleQuestions.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
                  <p className="text-sm text-gray-500">No topics match "{query}".</p>
                  <button onClick={() => { setQuery(''); setFilter('all'); }}
                    className="text-xs text-indigo-600 font-semibold mt-3 hover:underline">
                    Clear filters
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Learn sidebar ───────────────────────────────────────────────────

function LearnSidebar({ activeId, activeQId, progress, onSelectTopic, onSelectQuestion }: {
  activeId: string | null;
  activeQId: string | null;
  progress: Record<string, boolean>;
  onSelectTopic: (id: string) => void;
  onSelectQuestion: (id: string) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    core: true, pattern: true, deepdive: true, questions: true,
  });

  const toggle = (key: string) => setOpen(s => ({ ...s, [key]: !s[key] }));

  const sectionLabel: Record<TopicCategory, string> = {
    core:     'Core Concepts',
    pattern:  'Patterns',
    deepdive: 'Key Technologies',
  };

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 overflow-y-auto"
      style={{ background: 'white', borderRight: '1px solid #E5E7EB' }}>

      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Learn System Design
        </p>
      </div>

      {/* Topic sections */}
      {(['core', 'pattern', 'deepdive'] as TopicCategory[]).map(cat => {
        const items = TOPICS.filter(t => t.category === cat);
        const isOpen = open[cat];
        return (
          <div key={cat}>
            <button
              onClick={() => toggle(cat)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-xs font-semibold text-gray-700">{sectionLabel[cat]}</span>
              <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
            </button>

            {isOpen && (
              <div className="pb-1">
                {items.map(t => {
                  const isActive = activeId === t.id;
                  const isDone = !!progress[t.id];
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectTopic(t.id)}
                      className={`w-full flex items-center gap-2 pl-5 pr-3 py-1.5 text-left transition-colors ${
                        isActive
                          ? 'bg-indigo-50 border-l-2 border-indigo-500'
                          : 'border-l-2 border-transparent hover:bg-gray-50'
                      }`}
                    >
                      {isDone
                        ? <CheckCircle2 size={13} className="shrink-0 text-green-500" />
                        : <Circle size={13} className={`shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-300'}`} />}
                      <span className={`text-[12px] leading-tight ${isActive ? 'font-semibold text-indigo-700' : 'text-gray-600'}`}>
                        {t.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Question Breakdowns */}
      <div>
        <button
          onClick={() => toggle('questions')}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-700">Question Breakdowns</span>
          <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 ${open.questions ? '' : '-rotate-90'}`} />
        </button>

        {open.questions && (
          <div className="pb-1">
            {QUESTIONS.map(q => {
              const isActive = activeQId === q.id;
              const isDone = !!progress[q.id];
              return (
                <button
                  key={q.id}
                  onClick={() => onSelectQuestion(q.id)}
                  className={`w-full flex items-center gap-2 pl-5 pr-3 py-1.5 text-left transition-colors ${
                    isActive
                      ? 'bg-amber-50 border-l-2 border-amber-500'
                      : 'border-l-2 border-transparent hover:bg-gray-50'
                  }`}
                >
                  {isDone
                    ? <CheckCircle2 size={13} className="shrink-0 text-green-500" />
                    : <Circle size={13} className={`shrink-0 ${isActive ? 'text-amber-400' : 'text-gray-300'}`} />}
                  <span className={`text-[12px] leading-tight ${isActive ? 'font-semibold text-amber-700' : 'text-gray-600'}`}>
                    {q.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Topic card ──────────────────────────────────────────────────────

function TopicCard({ topic, done, onOpen, onToggleDone }: {
  topic: InterviewTopic;
  done: boolean;
  onOpen: () => void;
  onToggleDone: () => void;
}) {
  const diff = DIFFICULTY_STYLE[topic.difficulty];
  const accent = CATEGORY_META[topic.category].accent;

  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all p-4 flex flex-col gap-2.5 relative"
    >
      {/* Done toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
        className="absolute top-3 right-3 text-gray-300 hover:text-green-600 transition-colors"
        title={done ? 'Mark as not done' : 'Mark as done'}
      >
        {done
          ? <CheckCircle2 size={18} className="text-green-500" />
          : <Circle size={18} />}
      </button>

      <div className="flex items-center gap-1.5 pr-7">
        <div className="w-1 h-4 rounded-full" style={{ background: accent }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {CATEGORY_META[topic.category].label}
        </span>
        {topic.deep && topic.deep.length > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: '#EEF2FF', color: '#4F46E5' }}>
            AI
          </span>
        )}
      </div>

      <h3 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors">
        {topic.title}
      </h3>

      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
        {topic.tagline}
      </p>

      <div className="flex items-center justify-between mt-1 pt-2.5 border-t border-gray-100">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: diff.bg, color: diff.fg }}>
          {diff.label}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">
          {topic.commonQuestions.length} questions
        </span>
      </div>
    </div>
  );
}

// ── Detail modal ────────────────────────────────────────────────────

function TopicDetailPage({ topic, done, onBack, onToggleDone, onNavigate, onPractice }: {
  topic: InterviewTopic;
  done: boolean;
  onBack: () => void;
  onToggleDone: () => void;
  onNavigate: (id: string) => void;
  onPractice?: (topic: InterviewTopic) => void;
}) {
  const [activeSectionId, setActiveSectionId] = useState<string | undefined>();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  useEffect(() => {
    if (!topic.deep?.length) return;
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) { setActiveSectionId(entry.target.id); break; }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    topic.deep.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [topic.deep]);

  const accent = CATEGORY_META[topic.category].accent;
  const diff   = DIFFICULTY_STYLE[topic.difficulty];

  const related = (topic.relatedIds ?? [])
    .map(id => topicById(id))
    .filter((t): t is InterviewTopic => !!t);

  return (
    <div className="h-full overflow-y-auto bg-[#F3F2EF] flex flex-col">

      {/* Main body */}
      {topic.deep && topic.deep.length > 0 ? (
        <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 flex gap-8">
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Inline page title */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${accent}20`, color: accent }}>
                  {CATEGORY_META[topic.category].label}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: diff.bg, color: diff.fg }}>
                  {diff.label}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{topic.title}</h1>
              <p className="text-sm text-gray-500 mt-1">{topic.tagline}</p>
            </div>
            <DeepContentRenderer sections={topic.deep} />
          </div>
          {/* Sticky TOC sidebar (desktop only) */}
          <aside className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-6">
              <DeepContentTOC sections={topic.deep} activeId={activeSectionId} />
            </div>
          </aside>
        </div>
      ) : (
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-7 pb-24">
          {/* Inline page title */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: `${accent}20`, color: accent }}>
                {CATEGORY_META[topic.category].label}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: diff.bg, color: diff.fg }}>
                {diff.label}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{topic.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{topic.tagline}</p>
          </div>

          {/* Overview */}
          <Section icon={<BookOpen size={14} />} title="Overview" accent={accent}>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{topic.overview}</p>
          </Section>

          {/* Key concepts */}
          <Section icon={<Sparkles size={14} />} title="Key Concepts" accent={accent}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topic.keyConcepts.map(c => (
                <div key={c.title} className="rounded-xl bg-white border border-gray-200 shadow-sm px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* When to use */}
          {topic.whenToUse && topic.whenToUse.length > 0 && (
            <Section icon={<ListChecks size={14} />} title="When to use" accent={accent}>
              <ul className="space-y-1.5 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                {topic.whenToUse.map((w, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-indigo-500 mt-1">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Trade-offs */}
          {topic.tradeoffs && topic.tradeoffs.length > 0 && (
            <Section icon={<GitBranch size={14} />} title="Trade-offs" accent={accent}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">Pros</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {topic.tradeoffs.map((t, i) => (
                      <li key={i} className="text-sm text-green-900 leading-relaxed">+ {t.pro}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Cons</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {topic.tradeoffs.map((t, i) => (
                      <li key={i} className="text-sm text-rose-900 leading-relaxed">– {t.con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>
          )}

          {/* Numbers */}
          {topic.numbers && topic.numbers.length > 0 && (
            <Section icon={<Zap size={14} />} title="Numbers to remember" accent={accent}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                {topic.numbers.map((n, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                    <span className="text-xs text-gray-600">{n.label}</span>
                    <span className="text-xs font-bold text-gray-900 font-mono">{n.value}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Common questions */}
          <Section icon={<ListChecks size={14} />} title="Common interview questions" accent={accent}>
            <ol className="space-y-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              {topic.commonQuestions.map((q, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </Section>

          {/* Related */}
          {related.length > 0 && (
            <Section icon={<ExternalLink size={14} />} title="Related topics" accent={accent}>
              <div className="flex flex-wrap gap-1.5">
                {related.map(r => (
                  <button
                    key={r.id}
                    onClick={() => onNavigate(r.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                  >
                    {r.title} →
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Sticky footer actions */}
      <div className="sticky bottom-0 z-20 border-t border-gray-200 bg-white/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2 justify-between">
          <button
            onClick={onToggleDone}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              done
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-green-300 hover:text-green-700'
            }`}
          >
            {done
              ? <><CheckCircle2 size={13} /> Completed</>
              : <><Circle size={13} /> Mark as done</>}
          </button>

          {onPractice && (
            <button
              onClick={() => onPractice(topic)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg transition-all"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', boxShadow: '0 2px 10px rgba(79,70,229,0.3)' }}
            >
              <Sparkles size={13} /> Practice in Mock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable section block ──────────────────────────────────────────

function Section({ icon, title, accent, children }: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: `${accent}15`, color: accent }}>
          {icon}
        </div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Question card ──────────────────────────────────────────────────

const Q_ACCENT = '#D97706';

function QuestionCard({ question, done, onOpen, onToggleDone }: {
  question: SystemDesignQuestion;
  done: boolean;
  onOpen: () => void;
  onToggleDone: () => void;
}) {
  const diff = Q_DIFFICULTY_STYLE[question.difficulty];
  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer bg-white rounded-2xl border border-gray-200 hover:border-amber-400 hover:shadow-md transition-all p-4 flex flex-col gap-2.5 relative"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
        className="absolute top-3 right-3 text-gray-300 hover:text-green-600 transition-colors"
        title={done ? 'Mark as not done' : 'Mark as done'}
      >
        {done
          ? <CheckCircle2 size={18} className="text-green-500" />
          : <Circle size={18} />}
      </button>

      <div className="flex items-center gap-2 pr-7">
        <span className="text-xl leading-none">{question.emoji}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
          Question
        </span>
      </div>

      <h3 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-amber-700 transition-colors">
        {question.title}
      </h3>

      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 italic">
        "{question.tagline}"
      </p>

      <div className="flex items-center justify-between mt-1 pt-2.5 border-t border-gray-100">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: diff.bg, color: diff.fg }}>
          {diff.label}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">
          {question.walkthrough.length} steps · {question.deepDives.length} dives
        </span>
      </div>
    </div>
  );
}

// ── Question detail modal ──────────────────────────────────────────

function QuestionDetailPage({ question, done, onBack, onToggleDone }: {
  question: SystemDesignQuestion;
  done: boolean;
  onBack: () => void;
  onToggleDone: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const accent = Q_ACCENT;
  const diff   = Q_DIFFICULTY_STYLE[question.difficulty];

  return (
    <div className="h-full overflow-y-auto bg-[#F3F2EF] flex flex-col">

      {/* Main body */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-7 pb-24">

        {/* Inline title */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Question Breakdown
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: diff.bg, color: diff.fg }}>
              {diff.label}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight flex items-center gap-2 flex-wrap">
            <span className="text-3xl sm:text-4xl">{question.emoji}</span>
            {question.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1 italic">"{question.tagline}"</p>
          <p className="text-xs text-gray-500 mt-1 max-w-3xl">
            <span className="font-semibold text-gray-700">Interviewer asks: </span>{question.prompt}
          </p>
        </div>

        {/* Architecture diagram */}
        <Section icon={<Sparkles size={14} />} title="Architecture (live)" accent={accent}>
          <AnimatedArchDiagram diagram={question.diagram} />
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Flowing arrows show the request path · dashed arrows are async / return paths
          </p>
        </Section>

        {/* Two-col: functional + non-functional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Target size={13} className="text-emerald-700" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Functional requirements
              </p>
            </div>
            <ul className="space-y-1.5">
              {question.functional.map((f, i) => (
                <li key={i} className="text-sm text-emerald-900 leading-relaxed flex items-start gap-1.5">
                  <span>✓</span><span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={13} className="text-sky-700" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
                Non-functional requirements
              </p>
            </div>
            <ul className="space-y-1.5">
              {question.nonFunctional.map((nf, i) => (
                <li key={i} className="text-sm text-sky-900 leading-relaxed flex items-start gap-1.5">
                  <span>•</span><span>{nf}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Capacity */}
        {question.capacity && question.capacity.length > 0 && (
          <Section icon={<Zap size={14} />} title="Back-of-envelope" accent={accent}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white rounded-xl border border-gray-200 shadow-sm p-3">
              {question.capacity.map((c, i) => (
                <div key={i} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                  <p className="text-[10px] text-gray-500 leading-tight">{c.label}</p>
                  <p className="text-sm font-bold text-gray-900 font-mono mt-0.5">{c.value}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Walkthrough */}
        <Section icon={<ListChecks size={14} />} title="Walkthrough" accent={accent}>
          <ol className="space-y-3">
            {question.walkthrough.map((step, i) => (
              <li key={i} className="rounded-xl bg-white border border-gray-200 shadow-sm px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-sm font-bold text-gray-900">{step.title.replace(/^\d+\.\s*/, '')}</p>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed pl-8">{step.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* Deep dives */}
        {question.deepDives.length > 0 && (
          <Section icon={<GitBranch size={14} />} title="Spicy deep dives" accent={accent}>
            <div className="space-y-2">
              {question.deepDives.map((d, i) => (
                <details key={i} className="group rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 cursor-pointer">
                  <summary className="text-sm font-semibold text-amber-900 list-none flex items-center justify-between">
                    <span>🔥 {d.title}</span>
                    <span className="text-amber-600 group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <p className="text-sm text-amber-950 mt-2 leading-relaxed">{d.body}</p>
                </details>
              ))}
            </div>
          </Section>
        )}

        {/* Tradeoffs */}
        {question.tradeoffs.length > 0 && (
          <Section icon={<AlertTriangle size={14} />} title="Trade-offs" accent={accent}>
            <ul className="space-y-1.5 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              {question.tradeoffs.map((t, i) => (
                <li key={i} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">⚖️</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Punchline */}
        <div className="rounded-2xl px-5 py-4 border"
          style={{ background: 'linear-gradient(135deg,#FEF3C760,#FED7AA60)', borderColor: '#FCD34D80' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">
            If you only remember one thing…
          </p>
          <p className="text-sm text-gray-800 leading-relaxed italic">"{question.punchline}"</p>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-20 border-t border-gray-200 bg-white/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 justify-between">
          <button
            onClick={onToggleDone}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              done
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-green-300 hover:text-green-700'
            }`}
          >
            {done
              ? <><CheckCircle2 size={13} /> Studied</>
              : <><Circle size={13} /> Mark as studied</>}
          </button>
          <span className="text-[10px] text-gray-400 hidden sm:inline">Esc to go back</span>
        </div>
      </div>
    </div>
  );
}
