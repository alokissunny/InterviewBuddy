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

function TabBar({ active, onChange }: { active: MainTab; onChange: (t: MainTab) => void }) {
  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'interview',   label: 'Interview',   icon: <Mic size={14} /> },
    { id: 'jobs',        label: 'Jobs',        icon: <Search size={14} /> },
    { id: 'connections', label: 'Connections', icon: <Users size={14} /> },
    { id: 'profile',     label: 'My Profile',  icon: <User size={14} /> },
  ];
  return (
    <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 border border-gray-200">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            active === t.id
              ? 'bg-[#0A66C2] text-white shadow-md shadow-[#0A66C2]/30'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [page, setPage] = useState<'setup' | 'main'>('setup');
  const [activeTab, setActiveTab] = useState<MainTab>('interview');
  const [startOnUpload, setStartOnUpload] = useState(false);

  useEffect(() => {
    const saved = loadSavedProfile();
    if (saved) {
      setProfile(saved);
      setPage('main');
    }
  }, []);

  const handleProfileReady = (p: CandidateProfile) => {
    saveProfile(p);
    setProfile(p);
    setStartOnUpload(false);
    setPage('main');
  };

  const handleReset = () => {
    setPage('setup');
    setStartOnUpload(false);
  };

  const handleChangeProfile = () => {
    setStartOnUpload(true);
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
        startOnUpload={startOnUpload}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F3F2EF]">
      {activeTab !== 'interview' && (
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0A66C2] flex items-center justify-center shadow-lg shadow-[#0A66C2]/30">
              <Briefcase size={17} className="text-white" />
            </div>
            <div>
              <span className="text-gray-900 font-bold text-base">Interview Copilot</span>
              <span className="text-gray-400 text-sm ml-2">· {profile.name}</span>
            </div>
          </div>
          <TabBar active={activeTab} onChange={setActiveTab} />
        </header>
      )}

      <div className="flex-1 overflow-hidden">
        {activeTab === 'interview' && (
          <InterviewPage
            profile={profile}
            onReset={handleReset}
            onChangeProfile={handleChangeProfile}
            activeTab={activeTab}
            onTabChange={setActiveTab}
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
