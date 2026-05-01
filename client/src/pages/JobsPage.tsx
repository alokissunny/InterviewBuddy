import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, Briefcase, MapPin, SlidersHorizontal, RefreshCw } from 'lucide-react';
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

const PREFS_KEY = 'interview_copilot_job_prefs';

const JOB_TYPES = ['', 'full-time', 'part-time', 'contract', 'internship'];
const EXP_LEVELS = ['', 'internship', 'entry-level', 'associate', 'mid-senior', 'director', 'executive'];
const DATE_OPTIONS = ['', 'Past 24 hours', 'Past Week', 'Past Month'];

function normaliseJob(raw: Record<string, any>): Job {
  return {
    id: raw.id || raw.jobId || String(Math.random()),
    title: raw.title || raw.jobTitle || 'Untitled',
    company: raw.company || raw.companyName || '',
    location: raw.location || raw.jobLocation || '',
    jobType: raw.jobType || raw.employmentType || '',
    experienceLevel: raw.experienceLevel || raw.seniorityLevel || '',
    postedAt: raw.postedAt || raw.publishedAt || raw.timeAgo || '',
    description: raw.description || raw.jobDescription || '',
    applyUrl: raw.applyUrl || raw.jobUrl || raw.url || '',
    companyLogo: raw.companyLogo || raw.logo || '',
    salary: raw.salary || raw.salaryRange || '',
    applicantsCount: raw.applicantsCount ? String(raw.applicantsCount) : raw.applicants ? String(raw.applicants) : '',
  };
}

const selectCls = 'bg-slate-700/60 border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none cursor-pointer hover:border-slate-600 transition-colors';

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
  const [start, setStart] = useState(0);

  const updatePref = (key: keyof SearchPrefs, value: string) => {
    setPrefs(p => {
      const next = { ...p, [key]: value };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const fetchJobs = async (startOffset: number, append: boolean) => {
    if (!prefs.keywords.trim()) return;
    append ? setIsLoadingMore(true) : setIsLoading(true);
    setError(null);
    if (!append) { setJobs([]); setSearched(true); }

    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prefs, start: startOffset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      const newJobs = (data.jobs || []).map(normaliseJob);
      setJobs(prev => append ? [...prev, ...newJobs] : newJobs);
      setHasMore(data.hasMore ?? false);
      setStart(startOffset + newJobs.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const search = () => fetchJobs(0, false);
  const loadMore = () => fetchJobs(start, true);

  useEffect(() => {
    if (prefs.keywords.trim()) fetchJobs(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900">
      {/* Search bar */}
      <div className="shrink-0 px-5 py-4 bg-slate-800/80 border-b border-slate-700/60 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-52">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Job title / keywords</label>
            <div className="relative">
              <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={prefs.keywords}
                onChange={e => updatePref('keywords', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="e.g. Product Manager"
                className="w-full bg-slate-700/60 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 min-w-36">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Location</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={prefs.location}
                onChange={e => updatePref('location', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="City or Remote"
                className="w-full bg-slate-700/60 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-2.5 items-end flex-wrap">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><SlidersHorizontal size={10} />Type</label>
              <select value={prefs.jobType} onChange={e => updatePref('jobType', e.target.value)} className={selectCls}>
                {JOB_TYPES.map(t => <option key={t} value={t}>{t || 'Any type'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Level</label>
              <select value={prefs.experienceLevel} onChange={e => updatePref('experienceLevel', e.target.value)} className={selectCls}>
                {EXP_LEVELS.map(l => <option key={l} value={l}>{l || 'Any level'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Posted</label>
              <select value={prefs.datePosted} onChange={e => updatePref('datePosted', e.target.value)} className={selectCls}>
                {DATE_OPTIONS.map(d => <option key={d} value={d}>{d || 'Any time'}</option>)}
              </select>
            </div>

            <button
              onClick={search}
              disabled={isLoading || !prefs.keywords.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {isLoading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-5">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl mb-5">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Loader2 size={28} className="text-blue-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-medium">Scraping LinkedIn jobs…</p>
              <p className="text-slate-500 text-sm mt-1">This takes a few seconds</p>
            </div>
          </div>
        )}

        {!isLoading && searched && jobs.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/60 flex items-center justify-center">
              <Briefcase size={28} className="text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-400 font-medium">No jobs found</p>
              <p className="text-slate-500 text-sm mt-1">Try broader keywords or a different location</p>
            </div>
            <button onClick={search} className="btn-ghost mt-1">
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {!isLoading && !searched && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/60 flex items-center justify-center">
              <Search size={28} className="text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-400 font-medium">Ready to search</p>
              <p className="text-slate-500 text-sm mt-1">Keywords pre-filled from your CV profile</p>
            </div>
          </div>
        )}

        {!isLoading && jobs.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">
                <span className="font-semibold text-slate-200">{jobs.length} jobs</span>
                {' · '}"{prefs.keywords}"{prefs.location ? ` in ${prefs.location}` : ''}
              </p>
              <button onClick={search} className="btn-ghost text-sm">
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {jobs.map((job, i) => <JobCard key={job.id || i} job={job} profile={profile} />)}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-8 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-sm font-semibold rounded-xl border border-slate-600 transition-all"
                >
                  {isLoadingMore ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
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
