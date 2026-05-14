import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, Search, Users, Zap, LogOut, ChevronDown,
  Briefcase, GraduationCap, Code2, Edit3, MapPin,
  UserCircle2, ClipboardList,
} from 'lucide-react';
import { CandidateProfile } from './types';
import { LoginPage, CVOnboardingPage } from './pages/SetupPage';
import { InterviewPage } from './pages/InterviewPage';
import { JobsPage } from './pages/JobsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { MockInterviewPage } from './pages/MockInterviewPage';

export type MainTab = 'interview' | 'mock' | 'jobs' | 'connections' | 'profile';
type AppPage = 'login' | 'cv-onboarding' | 'main';

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

function AppHeader({ profile, onChangeProfile, onViewProfile }: {
  profile: CandidateProfile;
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
      style={{ background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 1px 20px rgba(0,0,0,0.4)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', boxShadow: '0 0 14px rgba(79,70,229,0.5)' }}>
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-base tracking-tight">
          JobCracker<span className="text-indigo-400 font-normal text-sm">.in</span>
        </span>
      </div>

      <div className="flex-1" />

      {/* Avatar menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-white/5 transition-colors"
        >
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt={profile.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-700" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-slate-700 shrink-0"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
          )}
          <ChevronDown size={13} className={`text-slate-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+6px)] w-44 rounded-2xl border overflow-hidden z-50"
            style={{ background: '#161b27', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
            <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold text-white truncate">{profile.name}</p>
              {profile.email && <p className="text-[11px] text-slate-500 truncate">{profile.email}</p>}
            </div>
            <button
              onClick={() => { onViewProfile(); setMenuOpen(false); }}
              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <UserCircle2 size={14} /> Profile
            </button>
            <button
              onClick={() => { onChangeProfile(); setMenuOpen(false); }}
              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-slate-400 hover:bg-white/5 hover:text-red-400 transition-colors text-left border-t"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

// ── Sidebar (desktop only) ───────────────────────────────────────────────────

const NAV_ITEMS: { id: MainTab; label: string; icon: React.ReactNode; soon?: boolean }[] = [
  { id: 'interview',   label: 'Interview',   icon: <Mic size={18} /> },
  { id: 'mock',        label: 'Mock',        icon: <ClipboardList size={18} /> },
  { id: 'jobs',        label: 'Jobs',        icon: <Search size={18} /> },
  { id: 'connections', label: 'Connections', icon: <Users size={18} /> },
];

function Sidebar({ profile, activeTab, onTabChange }: {
  profile: CandidateProfile;
  activeTab: MainTab;
  onTabChange: (t: MainTab) => void;
}) {
  const initials = profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside
      className="hidden md:flex w-72 shrink-0 flex-col gap-3 p-4 overflow-y-auto"
      style={{ background: '#F3F2EF' }}
    >
      {/* Profile Card */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-200">
        {/* Cover banner */}
        <div className="h-20 rounded-t-2xl relative"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #9333EA 100%)' }}>
          <button
            onClick={() => onTabChange('profile')}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
            title="Edit profile"
          >
            <Edit3 size={13} />
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="relative h-10 mb-1">
            <div className="absolute -top-10">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.name}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center ring-4 ring-white shadow-md"
                  style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
                  <span className="text-white text-2xl font-bold">{initials}</span>
                </div>
              )}
            </div>
          </div>

          <h2 className="text-gray-900 font-bold text-lg leading-tight">{profile.name}</h2>
          {profile.title && (
            <p className="text-indigo-600 text-sm font-medium mt-0.5">{profile.title}</p>
          )}
          {profile.email && (
            <p className="flex items-center gap-1 text-gray-400 text-xs mt-1.5">
              <MapPin size={10} /> {profile.email}
            </p>
          )}

          {profile.summary && (
            <p className="text-gray-500 text-xs mt-3 leading-relaxed line-clamp-3">
              {profile.summary}
            </p>
          )}

          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
            {(profile.experience?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Briefcase size={12} className="text-indigo-400" />
                <span className="font-semibold text-gray-700">{profile.experience.length}</span>
                roles
              </div>
            )}
            {(profile.skills?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Code2 size={12} className="text-indigo-400" />
                <span className="font-semibold text-gray-700">{profile.skills.length}</span>
                skills
              </div>
            )}
            {(profile.education?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <GraduationCap size={12} className="text-indigo-400" />
                <span className="font-semibold text-gray-700">{profile.education.length}</span>
                degrees
              </div>
            )}
          </div>

          {(profile.skills?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {profile.skills.slice(0, 8).map(s => (
                <span key={s}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                  {s}
                </span>
              ))}
              {profile.skills.length > 8 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
                  +{profile.skills.length - 8}
                </span>
              )}
            </div>
          )}

          {profile.experience?.[0] && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Latest Role</p>
              <p className="text-sm font-semibold text-gray-800 leading-snug">{profile.experience[0].role}</p>
              <p className="text-xs text-gray-500">{profile.experience[0].company} · {profile.experience[0].duration}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Menu</p>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-all text-left ${
              activeTab === item.id
                ? 'text-indigo-600 bg-indigo-50'
                : item.soon
                ? 'text-gray-400 hover:bg-gray-50'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className={activeTab === item.id ? 'text-indigo-500' : 'text-gray-300'}>
              {item.icon}
            </span>
            {item.label}
            {item.soon
              ? <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-500 border border-amber-100">Soon</span>
              : activeTab === item.id && <span className="ml-auto w-1.5 h-5 rounded-full bg-indigo-500" />
            }
          </button>
        ))}
      </nav>

      <p className="text-center text-xs text-gray-400 px-2">
        JobCracker.in · AI-powered career tools
      </p>
    </aside>
  );
}

// ── Bottom Navigation (mobile only) ─────────────────────────────────────────

const BOTTOM_NAV_ITEMS: { id: MainTab; label: string; Icon: React.ElementType; soon?: boolean }[] = [
  { id: 'interview',   label: 'Coach',   Icon: Mic           },
  { id: 'mock',        label: 'Mock',    Icon: ClipboardList },
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
        background: '#0d1117',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.45)',
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
              <span className="absolute top-1.5 right-1 text-[8px] font-bold px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-400 leading-none">
                Soon
              </span>
            )}
            <div className={`relative flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200 ${
              active ? 'bg-indigo-500/20' : ''
            }`}>
              {active && (
                <span
                  className="absolute inset-0 rounded-xl"
                  style={{ boxShadow: '0 0 14px rgba(99,102,241,0.55)', opacity: 0.7 }}
                />
              )}
              <Icon
                size={19}
                className={`relative transition-colors duration-200 ${active ? 'text-indigo-400' : soon ? 'text-slate-600' : 'text-slate-500'}`}
              />
            </div>
            <span className={`text-[10px] font-semibold tracking-wide leading-none transition-colors duration-200 ${
              active ? 'text-indigo-400' : 'text-slate-600'
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
    }
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
    return <LoginPage linkedinError={linkedinError} onClearLinkedinError={() => setLinkedinError(null)} />;
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
        <AppHeader profile={profile} onChangeProfile={handleChangeProfile} onViewProfile={() => setActiveTab('profile')} />

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Sidebar — desktop only */}
          <Sidebar profile={profile} activeTab={activeTab} onTabChange={setActiveTab} />

          <main className="flex-1 overflow-hidden">
            {activeTab === 'interview' && (
              <InterviewPage profile={profile} onReset={handleChangeProfile} onChangeProfile={handleChangeProfile} />
            )}
            {activeTab === 'mock' && <MockInterviewPage profile={profile} />}
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

  return <LoginPage linkedinError={linkedinError} onClearLinkedinError={() => setLinkedinError(null)} />;
}
