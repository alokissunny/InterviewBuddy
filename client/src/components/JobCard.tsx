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
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/70 transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Company logo or fallback */}
          <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
            {job.companyLogo
              ? <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain" />
              : <Building2 size={18} className="text-slate-400" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-slate-100 font-semibold text-sm leading-snug truncate">{job.title}</h3>
            <p className="text-slate-400 text-xs mt-0.5 truncate">{job.company}</p>
          </div>

          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
            >
              Apply <ExternalLink size={11} />
            </a>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
          {job.location && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin size={11} className="text-slate-500" />
              {job.location}
            </span>
          )}
          {job.jobType && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Briefcase size={11} className="text-slate-500" />
              {job.jobType}
            </span>
          )}
          {job.postedAt && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock size={11} />
              {job.postedAt}
            </span>
          )}
          {job.salary && (
            <span className="text-xs text-green-400 font-medium">{job.salary}</span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {job.experienceLevel && (
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
              {job.experienceLevel}
            </span>
          )}
          {job.applicantsCount && (
            <span className="text-xs text-slate-500 px-2 py-0.5">
              {job.applicantsCount} applicants
            </span>
          )}
        </div>

        {/* Description toggle */}
        {job.description && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? 'Hide details' : 'Show details'}
            </button>
            {expanded && (
              <p className="mt-2 text-xs text-slate-400 leading-relaxed line-clamp-6 whitespace-pre-line">
                {job.description.slice(0, 600)}{job.description.length > 600 ? '...' : ''}
              </p>
            )}
          </div>
        )}

        {/* Tailor Resume */}
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <button
            onClick={handleTailor}
            disabled={tailoring}
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {tailoring
              ? <><Loader2 size={12} className="animate-spin" /> Tailoring resume...</>
              : <><FileText size={12} /> Tailor resume for this role</>
            }
          </button>
          {tailorError && (
            <p className="text-xs text-red-400 mt-1">{tailorError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
