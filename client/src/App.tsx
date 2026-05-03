import React, { useState, useEffect } from 'react';
import { Briefcase, Mic, Search, User, Users } from 'lucide-react';
import { CandidateProfile } from './types';
import { SetupPage } from './pages/SetupPage';
import { InterviewPage } from './pages/InterviewPage';
import { JobsPage } from './pages/JobsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ConnectionsPage } from './pages/ConnectionsPage';

export type MainTab = 'interview' | 'jobs' | 'connections' | 'profile';

const PROFILE_KEY = 'interview_copilot_profile';

function loadSavedProfile(): CandidateProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProfile(p: CandidateProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

const NAV_TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
  { id: 'interview',   label: 'Interview',   icon: <Mic size={14} /> },
  { id: 'jobs',        label: 'Jobs',        icon: <Search size={14} /> },
  { id: 'connections', label: 'Connections', icon: <Users size={14} /> },
  { id: 'profile',     label: 'My Profile',  icon: <User size={14} /> },
];

function AppHeader({
  profile,
  activeTab,
  onTabChange,
}: {
  profile: CandidateProfile;
  activeTab: MainTab;
  onTabChange: (t: MainTab) => void;
}) {
  const initials = profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header
      className="flex items-stretch shrink-0 h-14 px-5"
      style={{
        background: '#0d1117',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 1px 20px rgba(0,0,0,0.35)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mr-8">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#0A66C2,#004182)', boxShadow: '0 0 12px rgba(10,102,194,0.5)' }}
        >
          <Briefcase size={14} className="text-white" />
        </div>
        <span className="text-white font-bold text-sm tracking-tight whitespace-nowrap">Interview Copilot</span>
      </div>

      {/* Nav tabs — span full header height for underline effect */}
      <nav className="flex items-stretch flex-1">
        {NAV_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex items-center gap-2 px-5 h-full text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === t.id
                ? 'text-white border-[#0A66C2]'
                : 'text-slate-500 hover:text-slate-200 border-transparent hover:border-slate-600'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* User avatar */}
      <div className="flex items-center gap-2.5 ml-4">
        {profile.photoUrl ? (
          <img
            src={profile.photoUrl}
            alt={profile.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-700"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center ring-2 ring-slate-700">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
        )}
        <span className="text-slate-400 text-sm hidden lg:block">{profile.name.split(' ')[0]}</span>
      </div>
    </header>
  );
}

export default function App() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [page, setPage] = useState<'setup' | 'main'>('setup');
  const [activeTab, setActiveTab] = useState<MainTab>('interview');
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [linkedinProfile, setLinkedinProfile] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lp = params.get('lp');
    const liError = params.get('linkedin_error');

    if (lp) {
      try {
        const decoded = JSON.parse(atob(lp)) as CandidateProfile;
        // Show the LinkedIn profile card for confirmation instead of auto-proceeding
        setLinkedinProfile(decoded);
      } catch { /* malformed */ }
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (liError) {
      setLinkedinError(decodeURIComponent(liError));
      window.history.replaceState({}, '', window.location.pathname);
    }

    const saved = loadSavedProfile();
    if (saved) {
      setProfile(saved);
      setPage('main');
    }
  }, []);

  const handleProfileReady = (p: CandidateProfile) => {
    saveProfile(p);
    setProfile(p);
    setPage('main');
  };

  const handleReset = () => {
    setPage('setup');
  };

  const handleChangeProfile = () => {
    setPage('setup');
  };

  const handleUpdateProfile = (p: CandidateProfile) => {
    saveProfile(p);
    setProfile(p);
  };

  if (page === 'setup' || !profile) {
    return (
      <SetupPage
        onProfileReady={handleProfileReady}
        savedProfile={loadSavedProfile()}
        linkedinError={linkedinError}
        onClearLinkedinError={() => setLinkedinError(null)}
        linkedinProfile={linkedinProfile}
        onLinkedinProfileAccept={(p) => { setLinkedinProfile(null); handleProfileReady(p); }}
        onLinkedinProfileDismiss={() => setLinkedinProfile(null)}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F3F2EF]">
      <AppHeader profile={profile} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-hidden">
        {activeTab === 'interview' && (
          <InterviewPage
            profile={profile}
            onReset={handleReset}
            onChangeProfile={handleChangeProfile}
          />
        )}
        {activeTab === 'jobs' && (
          <JobsPage profile={profile} />
        )}
        {activeTab === 'connections' && (
          <ConnectionsPage userProfile={profile} />
        )}
        {activeTab === 'profile' && (
          <ProfilePage profile={profile} onChangeProfile={handleChangeProfile} onUpdate={handleUpdateProfile} />
        )}
      </div>
    </div>
  );
}
