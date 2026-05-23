import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, Search, Users, Zap, LogOut, ChevronDown,
  UserCircle2, ClipboardList, BookOpen, ArrowLeft,
} from 'lucide-react';
import { CandidateProfile } from './types';
import { LoginPage, CVOnboardingPage } from './pages/SetupPage';
import { InterviewPage } from './pages/InterviewPage';
import { JobsPage } from './pages/JobsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { MockInterviewPage } from './pages/MockInterviewPage';
import { InterviewPrepPage } from './pages/InterviewPrepPage';

export type MainTab = 'interview' | 'mock' | 'learn' | 'jobs' | 'connections' | 'profile';
type AppPage = 'login' | 'cv-onboarding' | 'main' | 'browse-learn';

const PROFILE_KEY = 'jobcracker_profile';

function loadSavedProfile(): CandidateProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProfile(p: CandidateProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

function isProfileComplete(p: CandidateProfile): boolean {
  return (p.skills?.length ?? 0) > 0 || (p.experience?.length ?? 0) > 0;
}

// ── Top Header ────────────────────────────────────────────────────────────────

function AppHeader({ profile, activeTab, onTabChange, onChangeProfile, onViewProfile }: {
  profile: CandidateProfile;
  activeTab: MainTab;
  onTabChange: (t: MainTab) => void;
  onChangeProfile: () => void;
  onViewProfile: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="flex items-center shrink-0 h-14 px-4 sm:px-6 gap-4"
      style={{ background: 'white', borderBottom: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', boxShadow: '0 0 12px rgba(79,70,229,0.3)' }}>
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-gray-900 font-bold text-base tracking-tight">
          JobCracker<span className="text-indigo-600 font-normal text-sm">.in</span>
        </span>
      </div>

      {/* Desktop nav tabs */}
      <nav className="hidden md:flex items-center gap-0.5 ml-4">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => !item.soon && onTabChange(item.id)}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === item.id
                ? 'bg-indigo-50 text-indigo-600'
                : item.soon
                ? 'text-gray-300 cursor-default'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.label}
            {item.soon && (
              <span className="text-[8px] font-bold px-1 py-0.5 rounded-full bg-amber-50 text-amber-500 border border-amber-100 leading-none">
                Soon
              </span>
            )}
            {activeTab === item.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-indigo-500" />
            )}
          </button>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Avatar menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-gray-50 transition-colors"
        >
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt={profile.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-gray-200 shrink-0"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
          )}
          <ChevronDown size={13} className={`text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+6px)] w-44 rounded-2xl border overflow-hidden z-50"
            style={{ background: 'white', borderColor: '#E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <div className="px-4 py-2.5 border-b" style={{ borderColor: '#F3F4F6' }}>
              <p className="text-xs font-semibold text-gray-900 truncate">{profile.name}</p>
              {profile.email && <p className="text-[11px] text-gray-500 truncate">{profile.email}</p>}
            </div>
            <button
              onClick={() => { onViewProfile(); setMenuOpen(false); }}
              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
            >
              <UserCircle2 size={14} /> Profile
            </button>
            <button
              onClick={() => { onChangeProfile(); setMenuOpen(false); }}
              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-500 transition-colors text-left border-t"
              style={{ borderColor: '#F3F4F6' }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

const NAV_ITEMS: { id: MainTab; label: string; icon: React.ReactNode; soon?: boolean }[] = [
  { id: 'interview',   label: 'Interview',   icon: <Mic size={18} /> },
  { id: 'mock',        label: 'Mock',        icon: <ClipboardList size={18} /> },
  { id: 'learn',       label: 'Learn',       icon: <BookOpen size={18} /> },
  { id: 'jobs',        label: 'Jobs',        icon: <Search size={18} /> },
  { id: 'connections', label: 'Connections', icon: <Users size={18} /> },
];

// ── Bottom Navigation (mobile only) ─────────────────────────────────────────

const BOTTOM_NAV_ITEMS: { id: MainTab; label: string; Icon: React.ElementType; soon?: boolean }[] = [
  { id: 'interview',   label: 'Coach',   Icon: Mic           },
  { id: 'mock',        label: 'Mock',    Icon: ClipboardList },
  { id: 'learn',       label: 'Learn',   Icon: BookOpen      },
  { id: 'jobs',        label: 'Jobs',    Icon: Search        },
  { id: 'connections', label: 'Network', Icon: Users         },
  { id: 'profile',     label: 'Profile', Icon: UserCircle2   },
];

function BottomNav({ activeTab, onTabChange }: {
  activeTab: MainTab;
  onTabChange: (t: MainTab) => void;
}) {
  return (
    <nav
      className="md:hidden shrink-0 flex items-stretch"
      style={{
        background: 'white',
        borderTop: '1px solid #E5E7EB',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {BOTTOM_NAV_ITEMS.map(({ id, label, Icon, soon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-3 pb-2.5 min-h-[56px] transition-all relative"
          >
            {soon && (
              <span className="absolute top-1.5 right-1 text-[8px] font-bold px-1 py-0.5 rounded-full bg-amber-50 text-amber-500 leading-none">
                Soon
              </span>
            )}
            <div className={`relative flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200 ${
              active ? 'bg-indigo-50' : ''
            }`}>
              {active && (
                <span
                  className="absolute inset-0 rounded-xl"
                  style={{ boxShadow: '0 0 10px rgba(79,70,229,0.15)', opacity: 0.8 }}
                />
              )}
              <Icon
                size={19}
                className={`relative transition-colors duration-200 ${active ? 'text-indigo-600' : soon ? 'text-gray-300' : 'text-gray-400'}`}
              />
            </div>
            <span className={`text-[10px] font-semibold tracking-wide leading-none transition-colors duration-200 ${
              active ? 'text-indigo-600' : 'text-gray-500'
            }`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<AppPage>('login');
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [pendingProfile, setPendingProfile] = useState<CandidateProfile | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('interview');
  const [linkedinError, setLinkedinError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lp      = params.get('lp');
    const liError = params.get('linkedin_error');
    const hash    = window.location.hash;
    window.history.replaceState({}, '', window.location.pathname);

    if (lp) {
      try {
        const decoded = JSON.parse(atob(lp)) as CandidateProfile;
        if (isProfileComplete(decoded)) {
          saveProfile(decoded);
          setProfile(decoded);
          setPage('main');
        } else {
          setPendingProfile(decoded);
          setPage('cv-onboarding');
        }
      } catch { /* malformed lp */ }
      return;
    }

    if (liError) {
      setLinkedinError(decodeURIComponent(liError));
      return;
    }

    const saved = loadSavedProfile();
    if (saved) {
      setProfile(saved);
      setPage('main');
      // Deep link directly to Learn tab if requested
      if (hash === '#learn') setActiveTab('learn');
      return;
    }

    // Guest deep link → public Learn view
    if (hash === '#learn') setPage('browse-learn');
  }, []);

  const handleCVComplete = (enriched: CandidateProfile) => {
    saveProfile(enriched);
    setProfile(enriched);
    setPendingProfile(null);
    setPage('main');
  };

  const handleUpdateProfile = (p: CandidateProfile) => {
    saveProfile(p);
    setProfile(p);
    // Sync to MongoDB — fire and forget, never blocks the UI
    if (p.email) {
      fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p }),
      }).catch(() => {/* silent — server may be offline */});
    }
  };

  const handleChangeProfile = () => {
    localStorage.removeItem(PROFILE_KEY);
    // Hard reload to root — clears all React state and ensures the LinkedIn
    // button works from a clean page (no stale OAuth state, no cached useEffect)
    window.location.href = '/';
  };

  if (page === 'login') {
    return <LoginPage
      linkedinError={linkedinError}
      onClearLinkedinError={() => setLinkedinError(null)}
      onBrowseLearn={() => setPage('browse-learn')}
    />;
  }

  if (page === 'browse-learn') {
    return <BrowseLearnShell onBack={() => setPage('login')} />;
  }

  if (page === 'cv-onboarding' && pendingProfile) {
    return <CVOnboardingPage profile={pendingProfile} onComplete={handleCVComplete} />;
  }

  if (page === 'main' && profile) {
    return (
      <div
        className="flex flex-col overflow-hidden"
        style={{ height: '100dvh', background: '#F3F2EF' }}
      >
        <AppHeader
          profile={profile}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onChangeProfile={handleChangeProfile}
          onViewProfile={() => setActiveTab('profile')}
        />

        <div className="flex-1 flex overflow-hidden min-h-0">
          <main className="flex-1 overflow-hidden">
            {activeTab === 'interview' && (
              <InterviewPage profile={profile} onReset={handleChangeProfile} onChangeProfile={handleChangeProfile} />
            )}
            {activeTab === 'mock' && <MockInterviewPage profile={profile} />}
            {activeTab === 'learn' && <InterviewPrepPage onPractice={() => setActiveTab('mock')} />}
            {activeTab === 'jobs' && <JobsPage profile={profile} />}
            {activeTab === 'connections' && <ConnectionsPage userProfile={profile} />}
            {activeTab === 'profile' && (
              <ProfilePage profile={profile} onChangeProfile={handleChangeProfile} onUpdate={handleUpdateProfile} />
            )}
          </main>
        </div>

        {/* Bottom nav — mobile only */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

  return <LoginPage
    linkedinError={linkedinError}
    onClearLinkedinError={() => setLinkedinError(null)}
    onBrowseLearn={() => setPage('browse-learn')}
  />;
}

// ── Public Learn shell (no login required) ────────────────────────────────────

function BrowseLearnShell({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100dvh', background: '#F3F2EF' }}
    >
      {/* Public header */}
      <header
        className="flex items-center shrink-0 h-14 px-4 sm:px-6 gap-3"
        style={{
          background: 'white',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={13} /> Home
        </button>

        <div className="flex items-center gap-2.5 ml-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', boxShadow: '0 0 12px rgba(79,70,229,0.3)' }}>
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-gray-900 font-bold text-base tracking-tight">
            JobCracker<span className="text-indigo-600 font-normal text-sm">.in</span>
          </span>
          <span className="hidden sm:inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 ml-1">
            Learn · Free
          </span>
        </div>

        <div className="flex-1" />

        <a
          href="/auth/linkedin"
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          Sign in
        </a>
        <a
          href="/auth/linkedin"
          className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-all"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', boxShadow: '0 2px 12px rgba(79,70,229,0.4)' }}
        >
          Get started →
        </a>
      </header>

      <main className="flex-1 overflow-hidden">
        <InterviewPrepPage />
      </main>
    </div>
  );
}
