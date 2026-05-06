import React from 'react';
import { ExternalLink } from 'lucide-react';

export interface Recruiter {
  id: string;
  name: string;
  headline: string;
  location: string;
  degree: string;
  profileUrl: string;
  photoUrl: string;
}

const degreeBadge: Record<string, string> = {
  '1st': 'bg-[#EEF2FF] text-[#4F46E5] border border-[#4F46E5]/30',
  '2nd': 'bg-violet-500/10 text-violet-600 border border-violet-500/20',
  '3rd+': 'bg-gray-100 text-gray-500 border border-gray-200',
};

export function RecruiterCard({ recruiter }: { recruiter: Recruiter }) {
  const badge = degreeBadge[recruiter.degree] || degreeBadge['3rd+'];

  return (
    <div className="card p-4 flex items-start gap-4 hover:border-gray-300 transition-colors">
      <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500">
        {recruiter.photoUrl ? (
          <img src={recruiter.photoUrl} alt={recruiter.name} className="w-full h-full object-cover" />
        ) : (
          recruiter.name.charAt(0).toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-gray-900 font-semibold text-base truncate">{recruiter.name}</h3>
            <p className="text-gray-500 text-sm mt-0.5 line-clamp-2">{recruiter.headline}</p>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}>
            {recruiter.degree}
          </span>
        </div>
        {recruiter.location && (
          <p className="text-gray-400 text-xs mt-1.5">{recruiter.location}</p>
        )}
      </div>

      {recruiter.profileUrl && (
        <a
          href={recruiter.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#4F46E5] hover:bg-[#3730a3] text-white text-xs font-semibold rounded-lg transition-colors shadow-md shadow-[#4F46E5]/20"
        >
          <ExternalLink size={12} />
          View
        </a>
      )}
    </div>
  );
}
