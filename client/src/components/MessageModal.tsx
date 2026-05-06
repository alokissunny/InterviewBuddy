import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, Loader2, RefreshCw, MessageSquare } from 'lucide-react';
import { Connection } from './ConnectionCard';
import { CandidateProfile } from '../types';

interface MessageModalProps {
  connection: Connection;
  userProfile: CandidateProfile;
  onClose: () => void;
}

const MESSAGE_TYPES = [
  { id: 'networking',   label: 'Networking',     description: 'Connect and learn about their work' },
  { id: 'job_seeker',   label: 'Job Seeker',     description: 'Explore opportunities at their company' },
  { id: 'referral',     label: 'Referral Ask',   description: 'Ask for an intro or referral' },
];

export function MessageModal({ connection, userProfile, onClose }: MessageModalProps) {
  const [messageType, setMessageType] = useState('networking');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (type: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/connections/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection, userProfile, messageType: type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate message');
      setMessage(data.message);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate(messageType); }, []);

  const handleTypeChange = (type: string) => {
    setMessageType(type);
    generate(type);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fullName = `${connection.firstName} ${connection.lastName}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <MessageSquare size={15} className="text-[#4F46E5]" />
            </div>
            <div>
              <h2 className="text-gray-900 font-semibold text-sm">Message {fullName}</h2>
              {connection.position && (
                <p className="text-gray-400 text-xs">{connection.position}{connection.company ? ` · ${connection.company}` : ''}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type selector */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Message type</p>
            <div className="grid grid-cols-3 gap-2">
              {MESSAGE_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTypeChange(t.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left border transition-all ${
                    messageType === t.id
                      ? 'bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5]'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{t.label}</div>
                  <div className={`text-xs mt-0.5 font-normal leading-tight ${messageType === t.id ? 'text-[#4F46E5]/70' : 'text-gray-400'}`}>{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Message area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Message</p>
              <button
                onClick={() => generate(messageType)}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#4F46E5] transition-colors disabled:opacity-40"
              >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                Regenerate
              </button>
            </div>

            {loading ? (
              <div className="h-36 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 size={15} className="animate-spin text-[#4F46E5]" />
                  Generating personalised message…
                </div>
              </div>
            ) : error ? (
              <div className="h-20 flex items-center justify-center bg-red-50 rounded-xl border border-red-200">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            ) : (
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-[#4F46E5] rounded-xl text-sm text-gray-800 leading-relaxed outline-none resize-none transition-colors"
              />
            )}
          </div>

          {/* LinkedIn note */}
          <p className="text-xs text-gray-400 leading-relaxed">
            LinkedIn does not allow automated messaging. Copy the message and paste it manually after opening their profile.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 px-5 pb-5">
          <button
            onClick={handleCopy}
            disabled={!message || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#4F46E5] hover:bg-[#3730a3] disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-[#4F46E5]/20"
          >
            {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Message</>}
          </button>
          {connection.url && (
            <a
              href={connection.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors border border-gray-200"
            >
              <ExternalLink size={14} />
              Open Profile
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
