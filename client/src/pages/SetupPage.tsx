import React, { useState, useRef, useCallback } from 'react';
import {
  Zap, Target, Users, Loader2, Upload,
  FileText, CheckCircle2, AlertCircle, Mic, Search, Sparkles,
} from 'lucide-react';
import { CandidateProfile } from '../types';

// ─── Shared ───────────────────────────────────────────────────────────────────

const LINKEDIN_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const BG_STYLE = { background: 'linear-gradient(135deg, #07050f 0%, #0f0b1e 55%, #0a0717 100%)' };

function BgOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-48 -left-48 w-[560px] h-[560px] rounded-full blur-3xl opacity-[0.14]"
        style={{ background: 'radial-gradient(circle, #4F46E5, transparent 70%)' }} />
      <div className="absolute top-1/2 -right-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-[0.09]"
        style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }} />
      <div className="absolute -bottom-32 left-1/3 w-[380px] h-[380px] rounded-full blur-3xl opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, #4F46E5, transparent 70%)' }} />
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
    </div>
  );
}

function Logo() {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
        style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 8px 24px rgba(79,70,229,0.4)' }}>
        <Zap size={20} className="text-white" />
      </div>
      <span className="text-white font-bold text-lg tracking-tight">
        JobCracker<span className="text-indigo-400 font-normal text-sm">.in</span>
      </span>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Mic,      text: 'Real-time AI coaching during live interviews' },
  { icon: Target,   text: 'Job-tailored answers powered by your CV' },
  { icon: Search,   text: 'LinkedIn job search personalised to your profile' },
  { icon: Users,    text: 'Network insights & smart outreach messages' },
];

interface LoginPageProps {
  linkedinError?: string | null;
  onClearLinkedinError?: () => void;
}

export function LoginPage({ linkedinError, onClearLinkedinError }: LoginPageProps) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6" style={BG_STYLE}>
      <BgOrbs />

      <div className="relative w-full max-w-5xl flex flex-col-reverse lg:flex-row items-center gap-8 lg:gap-16">

        {/* Left: Branding */}
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-6 hidden lg:block"><Logo /></div>

          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white leading-[1.06] tracking-tight mb-4"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Crack every<br />
            <span style={{
              background: 'linear-gradient(90deg,#818cf8 0%,#a78bfa 50%,#c4b5fd 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>interview.</span>
            {' '}Land<br />any job.
          </h1>

          <p className="text-slate-400 text-base lg:text-lg leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
            AI-powered coaching, personalised job search, and real-time guidance — built for the modern job seeker.
          </p>

          <div className="hidden lg:block space-y-3.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3.5 justify-center lg:justify-start">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/25"
                  style={{ background: 'rgba(79,70,229,0.15)' }}>
                  <Icon size={15} className="text-indigo-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>

          {/* Mobile: compact feature pills */}
          <div className="flex flex-wrap justify-center gap-2 lg:hidden">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20"
                style={{ background: 'rgba(79,70,229,0.1)' }}>
                <Icon size={12} className="text-indigo-400 shrink-0" />
                <span className="text-slate-400 text-xs">{text.split(' ').slice(0, 3).join(' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login card */}
        <div className="w-full lg:w-[380px] shrink-0">
          {/* Mobile logo */}
          <div className="flex justify-center mb-6 lg:hidden"><Logo /></div>
          <div className="rounded-3xl p-8 border" style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(28px)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Get started free</h2>
            <p className="text-slate-400 text-sm mb-8">Sign in to unlock AI-powered interview coaching</p>

            {linkedinError && (
              <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-2xl border"
                style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)' }}>
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm flex-1 leading-snug">{linkedinError}</p>
                <button onClick={onClearLinkedinError} className="text-red-500 hover:text-red-300 text-lg leading-none">×</button>
              </div>
            )}

            <a
              href="/auth/linkedin"
              className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-semibold text-white text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                boxShadow: '0 8px 32px rgba(79,70,229,0.4)',
              }}
            >
              {LINKEDIN_SVG}
              Continue with LinkedIn
            </a>

            <p className="text-center text-xs text-slate-600 mt-5 leading-relaxed">
              We only read your public profile.<br />No posts, no messages without your action.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mt-5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-slate-600 text-xs">Powered by Claude AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CV Onboarding Page ───────────────────────────────────────────────────────

const CV_BENEFITS = [
  { icon: Mic,      label: 'Interview Assist',  desc: 'Real-time AI answers tailored to your exact background' },
  { icon: Target,   label: 'Job Matching',      desc: 'Surface roles that fit your skills & seniority' },
  { icon: Sparkles, label: 'Smart Suggestions', desc: 'Context-aware tips based on your experience' },
  { icon: Users,    label: 'Network Outreach',  desc: 'Personalised messages that reference your story' },
];

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

interface CVOnboardingPageProps {
  profile: CandidateProfile;                          // basic LinkedIn profile (name, photo, email)
  onComplete: (enriched: CandidateProfile) => void;  // called with full profile after upload
}

export function CVOnboardingPage({ profile, onComplete }: CVOnboardingPageProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setUploadState('uploading');
    setErrorMsg('');
    try {
      const form = new FormData();
      form.append('cv', file);
      const res = await fetch('/api/cv/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadState('success');
      // Merge CV data with existing LinkedIn profile data
      const enriched: CandidateProfile = {
        ...profile,
        ...data.profile,
        name:     data.profile.name     || profile.name,
        email:    data.profile.email    || profile.email,
        photoUrl: profile.photoUrl      || data.profile.photoUrl,
      };
      setTimeout(() => onComplete(enriched), 800);
    } catch (err) {
      setUploadState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed — please try again');
    }
  }, [profile, onComplete]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState('idle');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6" style={BG_STYLE}>
      <BgOrbs />

      <div className="relative w-full max-w-4xl flex flex-col items-center gap-8">

        {/* Logo */}
        <Logo />

        {/* Welcome row */}
        <div className="flex items-center gap-3">
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt={profile.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/40" />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center ring-2 ring-indigo-500/40"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
              <span className="text-white font-bold">{initials}</span>
            </div>
          )}
          <div>
            <p className="text-white font-semibold">Welcome, {profile.name.split(' ')[0]} 👋</p>
            <p className="text-slate-400 text-sm">Signed in with LinkedIn</p>
          </div>
        </div>

        {/* Main card */}
        <div className="w-full max-w-2xl rounded-3xl p-8 border" style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(28px)',
          borderColor: 'rgba(255,255,255,0.09)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          {/* Heading */}
          <div className="text-center mb-7">
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              One last step — upload your CV
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
              Your CV unlocks truly personalised AI assistance across every feature — from real-time interview coaching to smart job matching.
            </p>
          </div>

          {/* Benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
            {CV_BENEFITS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3.5 rounded-2xl border"
                style={{ background: 'rgba(79,70,229,0.08)', borderColor: 'rgba(79,70,229,0.2)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(79,70,229,0.2)' }}>
                  <Icon size={15} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{label}</p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Upload zone */}
          <div
            onDragOver={e => { e.preventDefault(); setUploadState('dragging'); }}
            onDragLeave={() => setUploadState('idle')}
            onDrop={onDrop}
            onClick={() => uploadState === 'idle' || uploadState === 'error' ? fileInputRef.current?.click() : null}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-8 px-4 sm:py-10 sm:px-6 cursor-pointer transition-all ${
              uploadState === 'dragging'  ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' :
              uploadState === 'success'  ? 'border-emerald-500/50 bg-emerald-500/5 cursor-default' :
              uploadState === 'uploading' ? 'border-slate-600 bg-slate-800/30 cursor-wait' :
              uploadState === 'error'    ? 'border-red-500/40 bg-red-500/5 hover:border-red-400/60' :
              'border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={onFileChange}
            />

            {uploadState === 'uploading' && (
              <>
                <Loader2 size={32} className="text-indigo-400 animate-spin" />
                <p className="text-slate-300 font-medium text-sm">Parsing your CV…</p>
                <p className="text-slate-500 text-xs">Extracting skills, experience & education</p>
              </>
            )}

            {uploadState === 'success' && (
              <>
                <CheckCircle2 size={32} className="text-emerald-400" />
                <p className="text-emerald-300 font-semibold text-sm">CV uploaded successfully!</p>
                <p className="text-slate-500 text-xs">Taking you to your dashboard…</p>
              </>
            )}

            {uploadState === 'error' && (
              <>
                <AlertCircle size={32} className="text-red-400" />
                <p className="text-red-300 font-medium text-sm">{errorMsg}</p>
                <p className="text-slate-500 text-xs">Click to try again</p>
              </>
            )}

            {(uploadState === 'idle' || uploadState === 'dragging') && (
              <>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                  uploadState === 'dragging' ? 'bg-indigo-500/30' : 'bg-slate-800'
                }`}>
                  {uploadState === 'dragging'
                    ? <Upload size={24} className="text-indigo-400" />
                    : <FileText size={24} className="text-slate-500" />
                  }
                </div>
                <div className="text-center">
                  <p className="text-slate-200 font-medium text-sm">
                    {uploadState === 'dragging' ? 'Drop to upload' : 'Drag & drop your CV here'}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">or click to browse · PDF, Word, or TXT</p>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-slate-700 text-xs text-center max-w-sm">
          Your CV is used only to personalise AI responses within this app. We don't share or store it externally.
        </p>
      </div>
    </div>
  );
}

// ─── SetupPage (kept for backward compat, now just re-exports LoginPage) ─────

interface SetupPageProps {
  onProfileReady: (profile: CandidateProfile) => void;
  savedProfile: CandidateProfile | null;
  linkedinError?: string | null;
  onClearLinkedinError?: () => void;
  linkedinProfile?: CandidateProfile | null;
  onLinkedinProfileAccept?: (profile: CandidateProfile) => void;
  onLinkedinProfileDismiss?: () => void;
}

export function SetupPage({ linkedinError, onClearLinkedinError }: SetupPageProps) {
  return <LoginPage linkedinError={linkedinError} onClearLinkedinError={onClearLinkedinError} />;
}
