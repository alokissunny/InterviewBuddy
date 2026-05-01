import React, { useState } from 'react';
import { MapPin, Building2, Clock, ExternalLink, ChevronDown, ChevronUp, Briefcase, FileText, Loader2 } from 'lucide-react';
import { CandidateProfile } from '../types';

export interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  jobType?: string;
  experienceLevel?: string;
  postedAt?: string;
  description?: string;
  applyUrl?: string;
  companyLogo?: string;
  salary?: string;
  applicantsCount?: string;
}

interface JobCardProps {
  job: Job;
  profile: CandidateProfile;
}

export function JobCard({ job, profile }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);

  const handleTailor = async () => {
    setTailoring(true);
    setTailorError(null);
    try {
      const res = await fetch('/api/cv/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, job }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : 'Failed to tailor resume');
    } finally {
      setTailoring(false);
    }
  };

  return (
    <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl shadow-lg shadow-black/10 hover:border-slate-600 hover:shadow-xl hover:shadow-black/20 transition-all duration-200">
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-700 border border-slate-600/50 flex items-center justify-center shrink-0 overflow-hidden">
            {job.companyLogo
              ? <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain p-1" />
              : <Building2 size={20} className="text-slate-400" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base leading-snug">{job.title}</h3>
            <p className="text-slate-400 text-sm mt-0.5">{job.company}</p>
          </div>

          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all shrink-0"
            >
              Apply <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
          {job.location && (
            <span className="flex items-center gap-1.5 text-sm text-slate-400">
              <MapPin size={13} className="text-slate-500" /> {job.location}
            </span>
          )}
          {job.jobType && (
            <span className="flex items-center gap-1.5 text-sm text-slate-400">
              <Briefcase size={13} className="text-slate-500" /> {job.jobType}
            </span>
          )}
          {job.postedAt && (
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock size={13} /> {job.postedAt}
            </span>
          )}
          {job.salary && (
            <span className="text-sm text-green-400 font-semibold">{job.salary}</span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          {job.experienceLevel && (
            <span className="text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600/50 px-3 py-1 rounded-full">
              {job.experienceLevel}
            </span>
          )}
          {job.applicantsCount && (
            <span className="text-xs text-slate-500 px-2 py-1">
              {job.applicantsCount} applicants
            </span>
          )}
        </div>

        {/* Description toggle */}
        {job.description && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? 'Hide details' : 'Show details'}
            </button>
            {expanded && (
              <p className="mt-3 text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                {job.description.slice(0, 600)}{job.description.length > 600 ? '…' : ''}
              </p>
            )}
          </div>
        )}

        {/* Tailor Resume */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <button
            onClick={handleTailor}
            disabled={tailoring}
            className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {tailoring
              ? <><Loader2 size={14} className="animate-spin" /> Tailoring resume…</>
              : <><FileText size={14} /> Tailor resume for this role</>
            }
          </button>
          {tailorError && <p className="text-sm text-red-400 mt-2">{tailorError}</p>}
        </div>
      </div>
    </div>
  );
}
