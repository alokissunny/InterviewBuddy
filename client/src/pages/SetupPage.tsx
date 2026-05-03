import React, { useState, useRef, useCallback } from 'react';
import {
  Loader2, CheckCircle2, User, Briefcase, GraduationCap, Code2,
  ChevronRight, AlertCircle, X, Info, Sparkles, Zap, Target, Users,
} from 'lucide-react';
import { CandidateProfile } from '../types';

interface SetupPageProps {
  onProfileReady: (profile: CandidateProfile) => void;
  savedProfile: CandidateProfile | null;
  startOnUpload?: boolean;
  linkedinError?: string | null;
  onClearLinkedinError?: () => void;
  linkedinProfile?: CandidateProfile | null;
  onLinkedinProfileAccept?: (profile: CandidateProfile) => void;
  onLinkedinProfileDismiss?: () => void;
}

// ─── LinkedIn OAuth Profile Card ─────────────────────────────────────────────
function LinkedInProfileCard({ profile, onAccept, onUploadInstead }: {
  profile: CandidateProfile;
  onAccept: (p: CandidateProfile) => void;
  onUploadInstead?: () => void;
}) {
  const [enriched, setEnriched] = useState<CandidateProfile>(profile);
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [hasEnriched, setHasEnriched] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState(profile.profileUrl || '');

  const handleEnrich = async () => {
    const url = linkedinUrl.trim();
    if (!url) { setEnrichError('Please enter your LinkedIn profile URL'); return; }
    if (!url.includes('linkedin.com/in/')) {
      setEnrichError('Must be a LinkedIn profile URL (linkedin.com/in/your-name)');
      return;
    }
    console.log('[Enrich] Calling /api/profile/enrich with URL:', url);
    setEnriching(true);
    setEnrichError(null);

    try {
      const res = await fetch('/api/profile/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileUrl: url }),
      });
      console.log('[Enrich] HTTP status:', res.status);
      const data = await res.json();
      console.log('[Enrich] Response:', data);

      if (data.enriched) {
        console.log('[Enrich] skills:', data.enriched.skills?.length,
          '| exp:', data.enriched.experience?.length,
          '| edu:', data.enriched.education?.length);
        setEnriched(prev => ({
          ...prev,
          title:        data.enriched.experience?.[0]?.role || prev.title,
          summary:      data.enriched.summary       || prev.summary,
          photoUrl:     data.enriched.photoUrl      || prev.photoUrl,
          profileUrl:   url,
          skills:       data.enriched.skills?.length       ? data.enriched.skills       : prev.skills,
          experience:   data.enriched.experience?.length   ? data.enriched.experience   : prev.experience,
          education:    data.enriched.education?.length    ? data.enriched.education    : prev.education,
          projects:     data.enriched.projects?.length     ? data.enriched.projects     : prev.projects,
          achievements: data.enriched.achievements?.length ? data.enriched.achievements : prev.achievements,
        }));
        setHasEnriched(true);
      } else {
        console.warn('[Enrich] No data:', data.error);
        setEnrichError(data.error || 'Could not load full profile — check the URL and try again');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      console.error('[Enrich] Error:', err);
      setEnrichError(msg);
    } finally {
      setEnriching(false);
    }
  };

  const initials = enriched.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/20">
        {/* Cover */}
        <div className="h-28" style={{ background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)' }} />

        <div className="px-6 pb-6">
          <div className="-mt-14 mb-4 flex items-end gap-3">
            <div className="relative shrink-0">
              {enriched.photoUrl ? (
                <img src={enriched.photoUrl} alt={enriched.name}
                  className="w-28 h-28 rounded-full border-4 border-white object-cover shadow-md" />
              ) : (
                <div className="w-28 h-28 rounded-full border-4 border-white bg-[#0A66C2] flex items-center justify-center shadow-md">
                  <span className="text-white text-3xl font-bold">{initials}</span>
                </div>
              )}
            </div>
            {hasEnriched && (
              <div className="mb-2 flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                <CheckCircle2 size={13} /> Profile enriched
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-gray-900">{enriched.name}</h2>
          {enriched.title && <p className="text-gray-500 text-sm mt-0.5">{enriched.title}</p>}
          {enriched.email && <p className="text-gray-400 text-xs mt-1">{enriched.email}</p>}
          {enriched.summary && (
            <p className="text-gray-600 text-sm mt-3 leading-relaxed line-clamp-3">{enriched.summary}</p>
          )}

          {enriched.skills.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {enriched.skills.slice(0, 14).map(s => (
                  <span key={s} className="text-xs bg-blue-50 text-[#0A66C2] px-2.5 py-1 rounded-full font-medium">{s}</span>
                ))}
                {enriched.skills.length > 14 && <span className="text-xs text-gray-400 self-center">+{enriched.skills.length - 14}</span>}
              </div>
            </div>
          )}

          {enriched.experience.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Experience</p>
              {enriched.experience.slice(0, 3).map((exp, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-gray-800">{exp.role}</p>
                  <p className="text-xs text-gray-400">{exp.company}{exp.duration ? ` · ${exp.duration}` : ''}</p>
                </div>
              ))}
            </div>
          )}

          {enriched.education.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Education</p>
              {enriched.education.slice(0, 2).map((edu, i) => (
                <p key={i} className="text-sm text-gray-700">
                  {edu.degree}{edu.institution ? ` — ${edu.institution}` : ''}{edu.year ? ` (${edu.year})` : ''}
                </p>
              ))}
            </div>
          )}

          {/* Apify enrichment input */}
          {!hasEnriched && (
            <div className="mt-5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#0A66C2]" />
                Fetch complete profile via Apify
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Paste your LinkedIn URL to pull skills, experience & education automatically.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={e => { setLinkedinUrl(e.target.value); setEnrichError(null); }}
                  onKeyDown={e => e.key === 'Enter' && !enriching && handleEnrich()}
                  placeholder="https://www.linkedin.com/in/your-name"
                  className="flex-1 text-sm px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/20 focus:border-[#0A66C2] placeholder-gray-300"
                />
                <button
                  onClick={handleEnrich}
                  disabled={enriching || !linkedinUrl.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
                >
                  {enriching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {enriching ? 'Fetching…' : 'Fetch'}
                </button>
              </div>
              {enrichError && (
                <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600">{enrichError}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-5">
            <button
              onClick={() => onAccept(enriched)}
              disabled={enriching}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)', boxShadow: '0 4px 20px rgba(10,102,194,0.3)' }}
            >
              Start Interview <ChevronRight size={18} />
            </button>
            {onUploadInstead && (
              <button onClick={onUploadInstead} className="text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors">
                Use a different account
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
const LINKEDIN_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const FEATURES = [
  { icon: Zap,     text: 'Real-time AI suggestions during live interviews' },
  { icon: Target,  text: 'Job-tailored CV generation in one click' },
  { icon: Users,   text: 'LinkedIn network insights & personalised DMs' },
];

function LoginPage({ savedProfile, linkedinError, onClearLinkedinError, onProfileReady }: {
  savedProfile: CandidateProfile | null;
  linkedinError?: string | null;
  onClearLinkedinError?: () => void;
  onProfileReady: (p: CandidateProfile) => void;
}) {
  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #060b14 0%, #0c1929 60%, #07111e 100%)' }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full blur-3xl opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #0A66C2, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] rounded-full blur-3xl opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #0A66C2, transparent 70%)' }} />
        <div className="absolute -bottom-32 left-1/3 w-[350px] h-[350px] rounded-full blur-3xl opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative w-full max-w-5xl flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        {/* ── Left: Branding ── */}
        <div className="flex-1 text-center lg:text-left">
          {/* Logo */}
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-[#0A66C2]/40"
              style={{ background: 'linear-gradient(135deg, #0A66C2, #004182)' }}>
              <Briefcase size={22} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Interview Copilot</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-tight mb-5">
            Land your{' '}
            <span
              className="block"
              style={{ background: 'linear-gradient(90deg, #3b9eff 0%, #60a5fa 50%, #93c5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              dream job
            </span>
            with AI.
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md mx-auto lg:mx-0">
            Your intelligent interview coach — real-time guidance, tailored to who you are and the role you want.
          </p>

          {/* Feature list */}
          <div className="space-y-3.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3.5 justify-center lg:justify-start">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/20"
                  style={{ background: 'rgba(10,102,194,0.15)' }}
                >
                  <Icon size={15} className="text-blue-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Login card ── */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div
            className="rounded-3xl p-8 border"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(28px)',
              borderColor: 'rgba(255,255,255,0.08)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-1">
              {savedProfile ? `Welcome back` : 'Get started'}
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              {savedProfile ? 'Continue your interview prep' : 'Sign in to unlock your AI copilot'}
            </p>

            {/* Error banner */}
            {linkedinError && (
              <div className="flex items-center gap-2.5 p-3.5 mb-5 rounded-2xl border"
                style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)' }}>
                <AlertCircle size={15} className="text-red-400 shrink-0" />
                <p className="text-red-300 text-sm flex-1 leading-snug">{linkedinError}</p>
                <button onClick={onClearLinkedinError} className="text-red-500 hover:text-red-300 transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Saved profile quick-continue */}
            {savedProfile && (
              <button
                onClick={() => onProfileReady(savedProfile)}
                className="group flex items-center gap-3 w-full p-4 mb-5 rounded-2xl border transition-all text-left"
                style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(10,102,194,0.5)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,102,194,0.08)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center shrink-0 text-white font-bold text-sm">
                  {savedProfile.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{savedProfile.name}</p>
                  <p className="text-slate-500 text-xs truncate">{savedProfile.title || 'Continue session'}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
              </button>
            )}

            {/* LinkedIn CTA */}
            <a
              href="/auth/linkedin"
              className="group flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-semibold text-white text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #0A66C2 0%, #0958a8 100%)',
                boxShadow: '0 8px 32px rgba(10,102,194,0.4), 0 0 0 0 rgba(10,102,194,0)',
              }}
            >
              {LINKEDIN_SVG}
              Continue with LinkedIn
            </a>

            <p className="text-center text-xs text-slate-600 mt-5 leading-relaxed">
              We access only your public profile info.<br />No posting, no messaging without your action.
            </p>
          </div>

          {/* Bottom badge */}
          <div className="flex items-center justify-center gap-2 mt-5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-slate-600 text-xs">Powered by Claude AI & LinkedIn data</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SetupPage ────────────────────────────────────────────────────────────────
export function SetupPage({
  onProfileReady, savedProfile, linkedinError, onClearLinkedinError,
  linkedinProfile, onLinkedinProfileAccept, onLinkedinProfileDismiss,
}: SetupPageProps) {

  // After LinkedIn OAuth — show the profile enrichment card
  if (linkedinProfile && onLinkedinProfileAccept) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 overflow-y-auto"
        style={{ background: 'linear-gradient(135deg, #060b14 0%, #0c1929 60%, #07111e 100%)' }}
      >
        <div className="w-full max-w-lg py-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-[#0A66C2] flex items-center justify-center">
                <Briefcase size={16} className="text-white" />
              </div>
              <span className="text-white font-bold">Interview Copilot</span>
            </div>
            <p className="text-slate-400 text-sm">Signed in with LinkedIn</p>
          </div>
          <LinkedInProfileCard
            profile={linkedinProfile}
            onAccept={onLinkedinProfileAccept}
            onUploadInstead={onLinkedinProfileDismiss}
          />
        </div>
      </div>
    );
  }

  return (
    <LoginPage
      savedProfile={savedProfile}
      linkedinError={linkedinError}
      onClearLinkedinError={onClearLinkedinError}
      onProfileReady={onProfileReady}
    />
  );
}
