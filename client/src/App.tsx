import React, { useState, useEffect } from 'react';
import { Briefcase, Mic, Search, User } from 'lucide-react';
import { CandidateProfile } from './types';
import { SetupPage } from './pages/SetupPage';
import { InterviewPage } from './pages/InterviewPage';
import { JobsPage } from './pages/JobsPage';
import { ProfilePage } from './pages/ProfilePage';

export type MainTab = 'interview' | 'jobs' | 'profile';

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
  return (
    <div className="flex items-center bg-slate-700/60 rounded-lg p-0.5 gap-0.5">
      <button
        onClick={() => onChange('interview')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          active === 'interview' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Mic size={12} /> Interview
      </button>
      <button
        onClick={() => onChange('jobs')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          active === 'jobs' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Search size={12} /> Jobs
      </button>
      <button
        onClick={() => onChange('profile')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          active === 'profile' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <User size={12} /> My Profile
      </button>
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
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900">
      {/* Non-interview tabs get a standalone header */}
      {activeTab !== 'interview' && (
        <header className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Briefcase size={15} className="text-white" />
            </div>
            <span className="text-white font-semibold text-sm">Interview Copilot</span>
            <span className="text-slate-500 text-xs">· {profile.name}</span>
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
        {activeTab === 'profile' && (
          <ProfilePage profile={profile} onChangeProfile={handleChangeProfile} onUpdate={handleUpdateProfile} />
        )}
      </div>
    </div>
  );
}
