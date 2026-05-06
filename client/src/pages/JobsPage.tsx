import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, Briefcase, MapPin, SlidersHorizontal, RefreshCw, ChevronDown, X } from 'lucide-react';
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

const JOB_TYPES = ['', 'full-time', 'part-time', 'contract', 'internship'];
const EXP_LEVELS = ['', 'internship', 'entry-level', 'associate', 'mid-senior', 'director', 'executive'];
const DATE_OPTIONS = ['', 'Past 24 hours', 'Past Week', 'Past Month'];

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

const selectCls = 'w-full bg-white border border-gray-300 focus:border-[#4F46E5] rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none cursor-pointer hover:border-gray-400 transition-colors';

export function JobsPage({ profile }: JobsPageProps) {
  const [prefs, setPrefs] = useState<SearchPrefs>(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { keywords: profile.title || '', location: '', jobType: '', experienceLevel: '', datePosted: 'Past Week' };
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const updatePref = (key: keyof SearchPrefs, value: string) => {
    setPrefs(p => {
      const next = { ...p, [key]: value };
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
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prefs, page: pageNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      const newJobs = (data.jobs || []).map(normaliseJob);
      setJobs(prev => {
        if (!append) return newJobs;
        const seen = new Set(prev.map((j: Job) => j.id));
        return [...prev, ...newJobs.filter((j: Job) => !seen.has(j.id))];
      });
      setHasMore(append ? newJobs.length > 0 : (data.hasMore ?? newJobs.length > 0));
      setTotal(data.total ?? newJobs.length);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const search = () => { setFiltersOpen(false); fetchJobs(0, false); };
  const loadMore = () => fetchJobs(page + 1, true);

  useEffect(() => {
    if (prefs.keywords.trim()) fetchJobs(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasActiveFilters = prefs.jobType || prefs.experienceLevel || (prefs.datePosted && prefs.datePosted !== 'Past Week');

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F3F2EF]">
      {/* Search bar */}
      <div className="shrink-0 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">

        {/* Primary row: keywords + location + search on desktop / keywords + search on mobile */}
        <div className="flex gap-2 items-center">
          {/* Keywords */}
          <div className="flex-1 relative min-w-0">
            <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={prefs.keywords}
              onChange={e => updatePref('keywords', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Job title or keywords"
              className="w-full bg-gray-50 border border-gray-300 hover:border-gray-400 focus:border-[#4F46E5] rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors"
            />
          </div>

          {/* Location — desktop only inline */}
          <div className="hidden sm:flex relative flex-1 min-w-0">
            <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={prefs.location}
              onChange={e => updatePref('location', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="City or Remote"
              className="w-full bg-gray-50 border border-gray-300 hover:border-gray-400 focus:border-[#4F46E5] rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors"
            />
          </div>

          {/* Filters toggle (mobile) */}
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`sm:hidden relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              filtersOpen || hasActiveFilters
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-gray-50 text-gray-600 border-gray-300'
            }`}
          >
            <SlidersHorizontal size={14} />
            {hasActiveFilters && !filtersOpen && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </button>

          {/* Search button */}
          <button
            onClick={search}
            disabled={isLoading || !prefs.keywords.trim()}
            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-[#4F46E5] hover:bg-[#3730a3] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#4F46E5]/20 transition-all shrink-0"
          >
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            <span className="hidden sm:inline">{isLoading ? 'Searching…' : 'Search'}</span>
          </button>
        </div>

        {/* Mobile: location row */}
        <div className="sm:hidden mt-2 relative">
          <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={prefs.location}
            onChange={e => updatePref('location', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="City or Remote"
            className="w-full bg-gray-50 border border-gray-300 hover:border-gray-400 focus:border-[#4F46E5] rounded-xl pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors"
          />
        </div>

        {/* Advanced filters — always visible on desktop, collapsible on mobile */}
        <div className={`${filtersOpen ? 'block' : 'hidden'} sm:block mt-3 sm:mt-2.5`}>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap sm:items-center">
            <div className="flex gap-2 w-full sm:w-auto flex-1 sm:flex-none">
              <div className="flex-1 sm:w-28">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block sm:hidden">Type</label>
                <select value={prefs.jobType} onChange={e => updatePref('jobType', e.target.value)} className={selectCls}>
                  {JOB_TYPES.map(t => <option key={t} value={t}>{t || 'Any type'}</option>)}
                </select>
              </div>
              <div className="flex-1 sm:w-32">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block sm:hidden">Level</label>
                <select value={prefs.experienceLevel} onChange={e => updatePref('experienceLevel', e.target.value)} className={selectCls}>
                  {EXP_LEVELS.map(l => <option key={l} value={l}>{l || 'Any level'}</option>)}
                </select>
              </div>
              <div className="flex-1 sm:w-32">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block sm:hidden">Posted</label>
                <select value={prefs.datePosted} onChange={e => updatePref('datePosted', e.target.value)} className={selectCls}>
                  {DATE_OPTIONS.map(d => <option key={d} value={d}>{d || 'Any time'}</option>)}
                </select>
              </div>
            </div>

            {/* Desktop label chips */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <SlidersHorizontal size={11} />
              Filters
            </div>

            {/* Mobile: clear filters */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  updatePref('jobType', '');
                  updatePref('experienceLevel', '');
                  updatePref('datePosted', 'Past Week');
                }}
                className="sm:hidden flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg border border-gray-200 bg-white"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
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
