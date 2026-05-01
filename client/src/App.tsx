import React, { useState, useEffect } from 'react';
import { CandidateProfile } from './types';
import { SetupPage } from './pages/SetupPage';
import { InterviewPage } from './pages/InterviewPage';

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

export default function App() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [page, setPage] = useState<'setup' | 'interview'>('setup');
  const [startOnUpload, setStartOnUpload] = useState(false);

  useEffect(() => {
    const saved = loadSavedProfile();
    if (saved) {
      setProfile(saved);
      setPage('interview');
    }
  }, []);

  const handleProfileReady = (p: CandidateProfile) => {
    saveProfile(p);
    setProfile(p);
    setStartOnUpload(false);
    setPage('interview');
  };

  const handleReset = () => {
    setProfile(null);
    setPage('setup');
    // Saved profile intentionally kept — user just wants a fresh session
  };

  const handleChangeProfile = () => {
    // Navigate to setup in upload mode WITHOUT clearing saved profile.
    // User can cancel back to saved profile if they change their mind.
    setProfile(null);
    setStartOnUpload(true);
    setPage('setup');
  };

  if (page === 'interview' && profile) {
    return (
      <InterviewPage
        profile={profile}
        onReset={handleReset}
        onChangeProfile={handleChangeProfile}
      />
    );
  }

  return (
    <SetupPage
      onProfileReady={handleProfileReady}
      savedProfile={loadSavedProfile()}
      startOnUpload={startOnUpload}
    />
  );
}
