import React, { useState, useCallback } from 'react';
import {
  Loader2, Building2, MapPin, Tag, FileText,
  Mic, Sparkles, AlertCircle, X, ExternalLink,
  CheckCircle2, ClipboardPaste, ChevronDown, ChevronUp,
} from 'lucide-react';
import { CandidateProfile } from '../types';
import { Job } from '../components/JobCard';
import { MockInterviewModal } from '../components/MockInterviewModal';

interface Props {
  profile: CandidateProfile;
}

type Status  = 'idle' | 'loading' | 'loaded' | 'error';
type CVStatus = 'idle' | 'loading' | 'done' | 'error';

export function MockInterviewPage({ profile }: Props) {
  const [jdText, setJdText]     = useState('');
  const [status, setStatus]     = useState<Status>('idle');
  const [error, setError]       = useState('');
  const [job, setJob]           = useState<Job | null>(null);
  const [jdExpanded, setJdExpanded] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [cvStatus, setCvStatus]     = useState<CVStatus>('idle');
  const [cvHtml, setCvHtml]         = useState('');

  const analyse = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setStatus('loading');
    setError('');
    setJob(null);
    setCvStatus('idle');
    setCvHtml('');

    try {
      const res  = await fetch('/api/jobs/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

      setJob({
        id:          `parsed-${Date.now()}`,
        title:       data.title       || 'Untitled Role',
        company:     data.company     || 'Unknown Company',
        location:    data.location    || '',
        description: trimmed,
        tags:        data.tags        || [],
      });
      setStatus('loaded');
    } catch (e: any) {
      setError(e.message || 'Failed to parse JD');
      setStatus('error');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyse(jdText);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setJdText(text.trim());
      }
    } catch {
      /* clipboard denied — user can paste manually */
    }
  };

  const tailorCV = async () => {
    if (!job) return;
    setCvStatus('loading');
    try {
      const res  = await fetch('/api/cv/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, job }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setCvHtml(data.html || '');
      setCvStatus('done');
    } catch {
      setCvStatus('error');
    }
  };

  const openCvInTab = () => {
    const win = window.open('', '_blank');
    if (win) { win.document.write(cvHtml); win.document.close(); }
  };

  const reset = () => {
    setStatus('idle');
    setJob(null);
    setJdText('');
    setCvStatus('idle');
    setCvHtml('');
  };

  return (
    <div className="h-full overflow-y-auto bg-[#F3F2EF]">
      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-6 space-y-5">

        {/* ── Page header ────────────────────────────────────────── */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mock Interview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Paste the job description — we'll extract role details, generate tailored questions, and coach you through a full practice round.
          </p>
        </div>

        {/* ── JD input (idle / error state) ──────────────────────── */}
        {(status === 'idle' || status === 'error') && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-indigo-500" />
                <span className="text-sm font-semibold text-gray-800">Job Description</span>
              </div>
              <button
                type="button"
                onClick={handlePaste}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg transition-all"
              >
                <ClipboardPaste size={13} /> Paste from clipboard
              </button>
            </div>

            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder={"Paste the full job description here…\n\nExample:\nSenior Product Manager – Platform\nAnthropic · San Francisco, CA · Remote OK\n\nAbout the role:\nWe're looking for a Senior PM to lead our platform products…"}
              rows={12}
              className="w-full px-5 py-4 text-sm text-gray-800 placeholder:text-gray-300 bg-white resize-none outline-none leading-relaxed"
            />

            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-400">
                {jdText.trim() ? `${jdText.trim().split(/\s+/).length} words` : 'Min ~50 words for best results'}
              </span>
              <button
                type="submit"
                disabled={jdText.trim().split(/\s+/).length < 10}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all"
                style={{ boxShadow: '0 2px 12px rgba(79,70,229,0.3)' }}
              >
                <Sparkles size={14} /> Analyse JD
              </button>
            </div>
          </form>
        )}

        {/* ── Error banner ───────────────────────────────────────── */}
        {status === 'error' && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-600">Could not parse job description</p>
              <p className="text-xs text-red-400 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setStatus('idle')} className="text-red-300 hover:text-red-500 shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Loading skeleton ────────────────────────────────────── */}
        {status === 'loading' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-200" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded-lg w-2/3" />
                <div className="h-3 bg-gray-100 rounded-lg w-1/3" />
              </div>
            </div>
            <div className="flex gap-2">
              {[80,70,90,65].map((w,i) => (
                <div key={i} className="h-6 bg-indigo-50 rounded-full" style={{ width: w }} />
              ))}
            </div>
            <p className="text-xs text-indigo-500 font-medium flex items-center gap-2 !mt-3">
              <Loader2 size={12} className="animate-spin" /> Extracting role details…
            </p>
          </div>
        )}

        {/* ── Loaded: Job overview + actions ─────────────────────── */}
        {status === 'loaded' && job && (
          <div className="space-y-4">

            {/* Job card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg,#4F46E5,#7C3AED)' }} />
              <div className="p-5">

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 leading-snug">{job.title}</h2>
                    <p className="text-indigo-600 font-semibold text-sm mt-0.5">{job.company}</p>
                    {job.location && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <MapPin size={11} /> {job.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Skill tags */}
                {job.tags && job.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-4">
                    <Tag size={11} className="text-gray-400 shrink-0" />
                    {job.tags.map(t => (
                      <span key={t} className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: '#EEF2FF', color: '#4F46E5' }}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all"
                    style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', boxShadow: '0 4px 16px rgba(79,70,229,0.35)' }}
                  >
                    <Mic size={15} /> Start Mock Interview
                  </button>

                  <button
                    onClick={cvStatus === 'done' ? openCvInTab : tailorCV}
                    disabled={cvStatus === 'loading'}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all disabled:opacity-60"
                  >
                    {cvStatus === 'loading' ? <Loader2 size={15} className="animate-spin" />
                      : cvStatus === 'done'    ? <CheckCircle2 size={15} className="text-green-600" />
                      : <FileText size={15} />}
                    {cvStatus === 'loading' ? 'Tailoring…' : cvStatus === 'done' ? 'View Tailored CV' : 'Customise CV'}
                  </button>

                  {cvStatus === 'done' && (
                    <button onClick={openCvInTab}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl transition-all">
                      <ExternalLink size={13} /> Open CV
                    </button>
                  )}
                </div>

                {cvStatus === 'error' && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1.5">
                    <AlertCircle size={11} /> CV tailoring failed — ensure your profile has experience and skills.
                  </p>
                )}
              </div>
            </div>

            {/* JD collapsible */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setJdExpanded(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={15} className="text-indigo-500" />
                  <span className="text-sm font-semibold text-gray-900">Full Job Description</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {job.description ? `${job.description.trim().split(/\s+/).length} words` : ''}
                  </span>
                </div>
                {jdExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {!jdExpanded && job.description && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{job.description}</p>
                  <button onClick={() => setJdExpanded(true)}
                    className="text-xs text-indigo-600 font-medium mt-2 hover:underline">
                    Read full description →
                  </button>
                </div>
              )}

              {jdExpanded && job.description && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-4">{job.description}</p>
                </div>
              )}
            </div>

            {/* Reset */}
            <button onClick={reset}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors mx-auto">
              <X size={12} /> Paste a different JD
            </button>
          </div>
        )}

        {/* ── Idle tips ──────────────────────────────────────────── */}
        {status === 'idle' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: '01', title: 'Paste the JD',        desc: 'Copy the full job description from any job site and paste it above.',                  color: 'bg-indigo-50 border-indigo-100', num: 'text-indigo-200' },
              { n: '02', title: 'We extract the role',  desc: 'Claude identifies the title, company, location, and key required skills automatically.', color: 'bg-violet-50 border-violet-100', num: 'text-violet-200' },
              { n: '03', title: 'Practice or apply',    desc: 'Run a full mock interview with tailored questions, or generate a customised CV.',        color: 'bg-green-50  border-green-100',  num: 'text-green-200'  },
            ].map(s => (
              <div key={s.n} className={`rounded-2xl border p-5 ${s.color}`}>
                <span className={`font-black text-4xl leading-none ${s.num}`}>{s.n}</span>
                <p className="font-semibold text-gray-900 text-sm mt-2">{s.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Mock Interview Modal ────────────────────────────────── */}
      {showModal && job && (
        <MockInterviewModal job={job} profile={profile} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
