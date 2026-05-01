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

export function JobsPage({ profile }: JobsPageProps) {
  const [prefs, setPrefs] = useState<SearchPrefs>(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      keywords: profile.title || '',
      location: '',
      jobType: '',
      experienceLevel: '',
      datePosted: 'Past Week',
    };
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

  // Auto-search on mount if keywords are pre-filled
  useEffect(() => {
    if (prefs.keywords.trim()) fetchJobs(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900">
      {/* Search bar */}
      <div className="shrink-0 px-4 py-3 bg-slate-800/70 border-b border-slate-700/50">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-44">
            <label className="text-xs text-slate-500 mb-1 block">Job title / keywords</label>
            <div className="relative">
              <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={prefs.keywords}
                onChange={e => updatePref('keywords', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="e.g. Product Manager"
                className="w-full bg-slate-700/60 border border-slate-600 focus:border-blue-500 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 min-w-32">
            <label className="text-xs text-slate-500 mb-1 block">Location</label>
            <div className="relative">
              <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={prefs.location}
                onChange={e => updatePref('location', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="City or Remote"
                className="w-full bg-slate-700/60 border border-slate-600 focus:border-blue-500 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-2 items-end flex-wrap">
            <div>
              <label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><SlidersHorizontal size={10} />Type</label>
              <select value={prefs.jobType} onChange={e => updatePref('jobType', e.target.value)}
                className="bg-slate-700/60 border border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none">
                {JOB_TYPES.map(t => <option key={t} value={t}>{t || 'Any type'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Level</label>
              <select value={prefs.experienceLevel} onChange={e => updatePref('experienceLevel', e.target.value)}
                className="bg-slate-700/60 border border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none">
                {EXP_LEVELS.map(l => <option key={l} value={l}>{l || 'Any level'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Posted</label>
              <select value={prefs.datePosted} onChange={e => updatePref('datePosted', e.target.value)}
                className="bg-slate-700/60 border border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none">
                {DATE_OPTIONS.map(d => <option key={d} value={d}>{d || 'Any time'}</option>)}
              </select>
            </div>

            <button
              onClick={search}
              disabled={isLoading || !prefs.keywords.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="text-blue-400 animate-spin" />
            <p className="text-slate-400 text-sm">Scraping LinkedIn jobs...</p>
            <p className="text-slate-600 text-xs">This takes a few seconds</p>
          </div>
        )}

        {!isLoading && searched && jobs.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Briefcase size={36} className="text-slate-700" />
            <p className="text-slate-500 text-sm">No jobs found — try broader keywords or a different location</p>
            <button onClick={search} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {!isLoading && !searched && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Search size={36} className="text-slate-700" />
            <p className="text-slate-500 text-sm">Enter a job title and hit Search</p>
            <p className="text-slate-600 text-xs">Keywords pre-filled from your CV profile</p>
          </div>
        )}

        {!isLoading && jobs.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500">
                {jobs.length} jobs · <span className="text-slate-300">"{prefs.keywords}"</span>
                {prefs.location ? ` in ${prefs.location}` : ''}
              </p>
              <button onClick={search} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                <RefreshCw size={11} /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {jobs.map((job, i) => <JobCard key={job.id || i} job={job} />)}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-sm font-medium rounded-lg transition-colors"
                >
                  {isLoadingMore ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
