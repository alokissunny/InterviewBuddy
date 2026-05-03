import React, { useState } from 'react';
import { MapPin, Building2, Clock, ExternalLink, ChevronDown, ChevronUp, Briefcase, FileText, Loader2, Zap } from 'lucide-react';
import { CandidateProfile } from '../types';
import { MockInterviewModal } from './MockInterviewModal';

export interface Job {
  id?: string;
  source?: string;
  sourceLabel?: string;
  title: string;
  company: string;
  location: string;
  remote?: boolean;
  jobType?: string;
  experienceLevel?: string;
  postedAt?: string;
  description?: string;
  applyUrl?: string;
  companyLogo?: string;
  salary?: string;
  applicantsCount?: string;
  tags?: string[];
  matchScore?: number;
}

interface JobCardProps {
  job: Job;
  profile: CandidateProfile;
}

export function JobCard({ job, profile }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [showMockInterview, setShowMockInterview] = useState(false);

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
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-gray-300 hover:shadow-md transition-all duration-200">
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
            {job.companyLogo
              ? <img src={job.companyLogo} alt={job.company} className="w-full h-full object-contain p-1" />
              : <Building2 size={20} className="text-gray-400" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 font-semibold text-base leading-snug">{job.title}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-gray-500 text-sm">{job.company}</p>
              {job.sourceLabel && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  job.source === 'linkedin' ? 'bg-[#EEF3F8] text-[#0A66C2]' :
                  job.source === 'remotive' ? 'bg-green-50 text-green-700' :
                  job.source === 'arbeitnow' ? 'bg-orange-50 text-orange-700' :
                  'bg-purple-50 text-purple-700'
                }`}>{job.sourceLabel}</span>
              )}
              {job.remote && (
                <span className="text-xs font-medium bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full">Remote</span>
              )}
            </div>
          </div>

          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#0A66C2]/20 transition-all shrink-0"
            >
              Apply <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
          {job.location && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin size={13} className="text-gray-400" /> {job.location}
            </span>
          )}
          {job.jobType && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <Briefcase size={13} className="text-gray-400" /> {job.jobType}
            </span>
          )}
          {job.postedAt && (
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <Clock size={13} /> {job.postedAt}
            </span>
          )}
          {job.salary && (
            <span className="text-sm text-green-600 font-semibold">{job.salary}</span>
          )}
        </div>

        {/* Tags */}
        {(job.experienceLevel || job.applicantsCount || (job.tags && job.tags.length > 0) || job.matchScore) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {job.matchScore !== undefined && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                job.matchScore >= 80 ? 'bg-green-100 text-green-700' :
                job.matchScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
              }`}>{job.matchScore}% match</span>
            )}
            {job.experienceLevel && (
              <span className="text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 rounded-full">
                {job.experienceLevel}
              </span>
            )}
            {job.tags?.map(tag => (
              <span key={tag} className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
            {job.applicantsCount && (
              <span className="text-xs text-gray-400 px-2 py-1">
                {job.applicantsCount} applicants
              </span>
            )}
          </div>
        )}

        {/* Description toggle */}
        {job.description && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? 'Hide details' : 'Show details'}
            </button>
            {expanded && (
              <p className="mt-3 text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                {job.description.slice(0, 600)}{job.description.length > 600 ? '…' : ''}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-5 flex-wrap">
          <button
            onClick={handleTailor}
            disabled={tailoring}
            className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {tailoring
              ? <><Loader2 size={14} className="animate-spin" /> Tailoring resume…</>
              : <><FileText size={14} /> Tailor resume</>
            }
          </button>

          <button
            onClick={() => setShowMockInterview(true)}
            className="flex items-center gap-2 text-sm text-[#0A66C2] hover:text-[#004182] transition-colors font-medium"
          >
            <Zap size={14} /> Mock Interview
          </button>
        </div>
        {tailorError && <p className="text-sm text-red-500 mt-2 px-5 pb-3">{tailorError}</p>}
      </div>

      {showMockInterview && (
        <MockInterviewModal
          job={job}
          profile={profile}
          onClose={() => setShowMockInterview(false)}
        />
      )}
    </div>
  );
}
