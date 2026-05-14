import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, AlertCircle, Briefcase, RefreshCw, ChevronDown, X } from 'lucide-react';
import { CandidateProfile } from '../types';
import { JobCard, Job } from '../components/JobCard';

interface JobsPageProps {
  profile: CandidateProfile;
}

interface SearchPrefs {
  keywords: string;
  location: string;
  jobType: string;
  experienceLevel: string;
  datePosted: string;
}

const PREFS_KEY = 'jobcracker_job_prefs';


function normaliseJob(raw: Record<string, unknown>): Job {
  return {
    id: String(raw.id || raw.jobId || Math.random()),
    source: String(raw.source || ''),
    sourceLabel: String(raw.sourceLabel || ''),
    title: String(raw.title || raw.jobTitle || 'Untitled'),
    company: String(raw.company || raw.companyName || ''),
    location: String(raw.location || raw.jobLocation || ''),
    remote: Boolean(raw.remote),
    jobType: String(raw.jobType || raw.type || raw.employmentType || ''),
    experienceLevel: String(raw.experienceLevel || raw.seniorityLevel || ''),
    postedAt: String(raw.postedAt || raw.publishedAt || raw.timeAgo || ''),
    description: String(raw.description || raw.jobDescription || ''),
    applyUrl: String(raw.applyUrl || raw.jobUrl || raw.url || ''),
    companyLogo: String(raw.companyLogo || raw.logo || ''),
    salary: String(raw.salary || raw.salaryRange || ''),
    applicantsCount: raw.applicantsCount ? String(raw.applicantsCount) : raw.applicants ? String(raw.applicants) : '',
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    matchScore: typeof raw.matchScore === 'number' ? raw.matchScore : undefined,
  };
}

const JOB_TITLES = [
  // Individual contributor
  'Software Engineer', 'Software Developer', 'Frontend Engineer', 'Backend Engineer',
  'Full Stack Engineer', 'Mobile Engineer', 'DevOps Engineer', 'Site Reliability Engineer',
  'SRE', 'QA Engineer', 'Test Engineer', 'Automation Test Engineer', 'SDET',
  'Data Engineer', 'Machine Learning Engineer', 'AI Engineer', 'Security Engineer',
  'Cloud Engineer', 'Platform Engineer', 'Infrastructure Engineer', 'Database Engineer',
  'DBA', 'Embedded Software Engineer', 'Game Developer', 'UI Engineer',
  'Build and Release Engineer',
  // Senior / Specialist
  'Senior Software Engineer', 'Staff Engineer', 'Principal Engineer',
  'Software Architect', 'Solutions Architect', 'Technical Lead', 'Tech Lead',
  // Engineering management
  'Engineering Manager', 'Senior Engineering Manager', 'Director of Engineering',
  'Senior Director of Engineering', 'VP of Engineering', 'CTO',
  // Product / Adjacent
  'Product Manager', 'Technical Program Manager', 'TPM', 'Engineering Program Manager',
  'UX Designer', 'Product Designer', 'UX Engineer', 'Scrum Master', 'Agile Coach',
  'Developer Advocate', 'Technical Writer',
];

function getSuggestions(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const startsWith = JOB_TITLES.filter(t => t.toLowerCase().startsWith(q));
  const contains   = JOB_TITLES.filter(t => !t.toLowerCase().startsWith(q) && t.toLowerCase().includes(q));
  return [...startsWith, ...contains].slice(0, 8);
}

interface TypeaheadProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}

function JobTitleTypeahead({ value, onChange, onSubmit }: TypeaheadProps) {
  const [open, setOpen]             = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const suggestions = getSuggestions(value);
  const isOpen = open && suggestions.length > 0;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const select = useCallback((title: string) => {
    onChange(title);
    setOpen(false);
    setHighlighted(-1);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter') { onSubmit(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0) { select(suggestions[highlighted]); }
      else { setOpen(false); onSubmit(); }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlighted(-1);
    }
  };

  return (
    <div ref={containerRef} className="flex-1 relative min-w-0">
      <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Job title or keywords"
        autoComplete="off"
        className="w-full bg-gray-50 border border-gray-300 hover:border-gray-400 focus:border-[#4F46E5] rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false); inputRef.current?.focus(); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={13} />
        </button>
      )}
      {isOpen && (
        <ul className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
          {suggestions.map((title, i) => (
            <li key={title}>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); select(title); }}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 ${
                  i === highlighted
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Search size={12} className={i === highlighted ? 'text-indigo-400' : 'text-gray-300'} />
                <span>
                  {(() => {
                    const q   = value.trim().toLowerCase();
                    const idx = title.toLowerCase().indexOf(q);
                    if (idx === -1 || !q) return title;
                    return (
                      <>
                        {title.slice(0, idx)}
                        <strong className="font-semibold">{title.slice(idx, idx + q.length)}</strong>
                        {title.slice(idx + q.length)}
                      </>
                    );
                  })()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


export function JobsPage({ profile }: JobsPageProps) {
  const [prefs, setPrefs] = useState<SearchPrefs>(() => {
    const defaults: SearchPrefs = { keywords: profile.title || '', location: 'India', jobType: '', experienceLevel: '', datePosted: 'Past 24 hours' };
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<SearchPrefs>;
        return {
          ...defaults,
          ...parsed,
          location:   parsed.location   || defaults.location,
          datePosted: parsed.datePosted || defaults.datePosted,
        };
      }
    } catch {}
    return defaults;
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const updateKeywords = (v: string) => {
    setPrefs(p => {
      const next = { ...p, keywords: v };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const fetchJobs = async (pageNum: number, append: boolean) => {
    if (!prefs.keywords.trim()) return;
    append ? setIsLoadingMore(true) : setIsLoading(true);
    setError(null);
    if (!append) { setJobs([]); setSearched(true); setPage(0); }

    try {
      const res  = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prefs, page: pageNum }),
      });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(text); } catch {
        throw new Error(res.ok ? 'Server response was empty — the request may have timed out' : `Server error ${res.status}`);
      }
      if (!res.ok) throw new Error(String(data.error) || `Error ${res.status}`);
      const newJobs = (data.jobs as Record<string, unknown>[] || []).map(normaliseJob);
      setJobs(prev => {
        if (!append) return newJobs;
        const seen = new Set(prev.map((j: Job) => j.id));
        return [...prev, ...newJobs.filter((j: Job) => !seen.has(j.id))];
      });
      setHasMore(append ? newJobs.length > 0 : Boolean(data.hasMore ?? newJobs.length > 0));
      setTotal((data.total as number) ?? newJobs.length);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const search  = () => fetchJobs(0, false);
  const loadMore = () => fetchJobs(page + 1, true);

  const isMount = useRef(true);
  useEffect(() => {
    if (isMount.current) {
      isMount.current = false;
      if (prefs.keywords.trim()) fetchJobs(0, false);
      return;
    }
    if (!prefs.keywords.trim()) return;
    const t = setTimeout(() => fetchJobs(0, false), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.keywords]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F3F2EF]">
      {/* Search bar */}
      <div className="shrink-0 px-4 py-3 bg-white border-b border-gray-200 shadow-sm space-y-2.5">
        {/* Keywords + Search button */}
        <div className="flex gap-2 items-center">
          <JobTitleTypeahead
            value={prefs.keywords}
            onChange={updateKeywords}
            onSubmit={search}
          />
          <button
            onClick={search}
            disabled={isLoading || !prefs.keywords.trim()}
            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-[#4F46E5] hover:bg-[#3730a3] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#4F46E5]/20 transition-all shrink-0"
          >
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            <span className="hidden sm:inline">{isLoading ? 'Searching…' : 'Search'}</span>
          </button>
        </div>

        {/* Frozen filter badges */}
        <div className="flex flex-wrap gap-2">
          {[
            { icon: '📍', label: 'India' },
            { icon: '💼', label: 'Any type' },
            { icon: '🎯', label: 'Any level' },
            { icon: '🕐', label: 'Past 24 hours' },
          ].map(b => (
            <span key={b.label}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
              {b.icon} {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl mb-4">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
              <Loader2 size={28} className="text-[#4F46E5] animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-medium">Searching LinkedIn…</p>
              <p className="text-gray-400 text-sm mt-1">This may take up to a minute</p>
            </div>
          </div>
        )}

        {!isLoading && searched && jobs.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Briefcase size={28} className="text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-gray-500 font-medium">No jobs found</p>
              <p className="text-gray-400 text-sm mt-1">Try broader keywords or a different location</p>
            </div>
            <button onClick={search} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mt-1">
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {!isLoading && !searched && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Search size={28} className="text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-gray-500 font-medium">Ready to search</p>
              <p className="text-gray-400 text-sm mt-1">Keywords pre-filled from your profile</p>
            </div>
          </div>
        )}

        {!isLoading && jobs.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{jobs.length}</span>
                {total > jobs.length && <span className="text-gray-400"> of {total}</span>}
                {' · '}
                <span className="hidden sm:inline">"{prefs.keywords}"{prefs.location ? ` in ${prefs.location}` : ''}</span>
              </p>
              <button onClick={search} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
                <RefreshCw size={13} /> <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
              {jobs.map((job, i) => <JobCard key={job.id || i} job={job} profile={profile} />)}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-8 py-3 bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-800 text-sm font-semibold rounded-xl border border-gray-300 transition-all"
                >
                  {isLoadingMore ? <Loader2 size={15} className="animate-spin" /> : <ChevronDown size={15} />}
                  {isLoadingMore ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
