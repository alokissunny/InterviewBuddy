import React, { useState } from 'react';
import { ExternalLink, Building2, Calendar, MessageSquare } from 'lucide-react';
import { CandidateProfile } from '../types';
import { MessageModal } from './MessageModal';

export interface Connection {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  position: string;
  connectedOn: string;
  url: string;
}

interface ConnectionCardProps {
  connection: Connection;
  userProfile: CandidateProfile;
}

const COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return COLORS[hash % COLORS.length];
}

export function ConnectionCard({ connection: c, userProfile }: ConnectionCardProps) {
  const [showMessage, setShowMessage] = useState(false);
  const initials = `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase();
  const fullName = `${c.firstName} ${c.lastName}`.trim();

  return (
    <>
      <div className="card p-4 flex items-start gap-3 hover:border-gray-300 transition-colors group">
        <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${avatarColor(fullName)}`}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 font-semibold text-sm leading-snug truncate">{fullName}</h3>
          {c.position && (
            <p className="text-gray-600 text-sm mt-0.5 truncate">{c.position}</p>
          )}
          {c.company && (
            <p className="flex items-center gap-1.5 text-gray-400 text-xs mt-1 truncate">
              <Building2 size={11} className="shrink-0" />{c.company}
            </p>
          )}
          {c.connectedOn && (
            <p className="flex items-center gap-1.5 text-gray-400 text-xs mt-0.5">
              <Calendar size={11} className="shrink-0" />{c.connectedOn}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => setShowMessage(true)}
            className="p-2 text-gray-400 hover:text-[#0A66C2] hover:bg-[#EEF3F8] rounded-lg transition-colors"
            title="Send message"
          >
            <MessageSquare size={14} />
          </button>
          {c.url && (
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-[#0A66C2] hover:bg-[#EEF3F8] rounded-lg transition-colors"
              title="View LinkedIn profile"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {showMessage && (
        <MessageModal
          connection={c}
          userProfile={userProfile}
          onClose={() => setShowMessage(false)}
        />
      )}
    </>
  );
}
