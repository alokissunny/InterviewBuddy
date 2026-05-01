import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, User, Briefcase, GraduationCap, Code2, Trophy, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { CandidateProfile } from '../types';

interface SetupPageProps {
  onProfileReady: (profile: CandidateProfile) => void;
  savedProfile: CandidateProfile | null;
  startOnUpload?: boolean;
}

function ProfileCard({ profile, onStart, onReplace }: {
  profile: CandidateProfile;
  onStart: () => void;
  onReplace: () => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <CheckCircle2 size={20} className="text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-blue-300 font-medium">Saved profile found</p>
          <p className="text-blue-500 text-sm truncate">{profile.name} · {profile.title}</p>
        </div>
      </div>

      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <User size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{profile.name}</h2>
              <p className="text-slate-400 text-sm">{profile.title}</p>
            </div>
          </div>
          {profile.summary && (
            <p className="text-slate-300 text-sm mt-3 leading-relaxed">{profile.summary}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-0 divide-x divide-slate-700/50">
          {profile.skills?.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Code2 size={14} className="text-blue-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Skills</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.slice(0, 10).map(skill => (
                  <span key={skill} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{skill}</span>
                ))}
                {profile.skills.length > 10 && (
                  <span className="text-xs text-slate-500">+{profile.skills.length - 10} more</span>
                )}
              </div>
            </div>
          )}
          <div className="p-4">
            {profile.experience?.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={14} className="text-green-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Experience</span>
                </div>
                <div className="space-y-2">
                  {profile.experience.slice(0, 3).map((exp, i) => (
                    <div key={i}>
                      <p className="text-sm text-slate-200 font-medium">{exp.role}</p>
                      <p className="text-xs text-slate-500">{exp.company} · {exp.duration}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {profile.education?.length > 0 && (
          <div className="p-4 border-t border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap size={14} className="text-purple-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Education</span>
            </div>
            {profile.education.slice(0, 2).map((edu, i) => (
              <p key={i} className="text-sm text-slate-300">{edu.degree} — {edu.institution}{edu.year ? ` (${edu.year})` : ''}</p>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReplace}
          className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-600 text-slate-300 rounded-xl hover:border-slate-500 hover:text-white transition-colors font-medium"
        >
          <RefreshCw size={15} />
          Update CV
        </button>
        <button
          onClick={onStart}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors"
        >
          Start Interview
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export function SetupPage({ onProfileReady, savedProfile, startOnUpload = false }: SetupPageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newProfile, setNewProfile] = useState<CandidateProfile | null>(null);
  // Show upload form if: no saved profile, or caller explicitly requests upload view
  const [showUpload, setShowUpload] = useState(!savedProfile || startOnUpload);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const allowed = ['application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.pdf')) {
      setError('Please upload a PDF or text file.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setNewProfile(null);

    const formData = new FormData();
    formData.append('cv', file);

    try {
      const res = await fetch('/api/cv/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setNewProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process CV');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  // Show saved profile directly (no upload needed)
  if (!showUpload && savedProfile && !newProfile) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Briefcase size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Interview Copilot</h1>
            </div>
            <p className="text-slate-500 text-sm">Welcome back!</p>
          </div>
          <ProfileCard
            profile={savedProfile}
            onStart={() => onProfileReady(savedProfile)}
            onReplace={() => setShowUpload(true)}
          />
        </div>
      </div>
    );
  }

  // Upload screen
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Briefcase size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Interview Copilot</h1>
          </div>
          <p className="text-slate-400 text-lg">Your AI-powered interview assistant</p>
          <p className="text-slate-500 text-sm mt-1">Upload your CV to get personalised, real-time coaching</p>
        </div>

        {/* Back to saved profile */}
        {savedProfile && !newProfile && (
          <button
            onClick={() => onProfileReady(savedProfile)}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4 transition-colors"
          >
            ← Use saved profile ({savedProfile.name})
          </button>
        )}

        {!newProfile ? (
          <div className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                isDragging ? 'border-blue-400 bg-blue-500/10' :
                isUploading ? 'border-slate-600 bg-slate-800/50 cursor-wait' :
                'border-slate-600 bg-slate-800/30 hover:border-blue-500/50 hover:bg-slate-800/60'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx" className="hidden" onChange={handleFileChange} />
              {isUploading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 size={40} className="text-blue-400 animate-spin" />
                  <div>
                    <p className="text-slate-200 font-medium">Processing your CV...</p>
                    <p className="text-slate-500 text-sm mt-1">Claude is extracting your profile</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-blue-500/20' : 'bg-slate-700'}`}>
                    <Upload size={28} className={isDragging ? 'text-blue-400' : 'text-slate-400'} />
                  </div>
                  <div>
                    <p className="text-slate-200 font-semibold text-lg">Drop your CV here</p>
                    <p className="text-slate-400 text-sm mt-1">or click to browse files</p>
                    <p className="text-slate-600 text-xs mt-2">PDF, TXT, or DOC supported</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <CheckCircle2 size={20} className="text-green-400 shrink-0" />
              <div>
                <p className="text-green-300 font-medium">CV processed successfully!</p>
                <p className="text-green-500 text-sm">Profile will be saved for next time</p>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="p-5 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                    <User size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{newProfile.name}</h2>
                    <p className="text-slate-400 text-sm">{newProfile.title}</p>
                  </div>
                </div>
                {newProfile.summary && (
                  <p className="text-slate-300 text-sm mt-3 leading-relaxed">{newProfile.summary}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-0 divide-x divide-slate-700/50">
                {newProfile.skills?.length > 0 && (
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Code2 size={14} className="text-blue-400" />
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Skills</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {newProfile.skills.slice(0, 12).map(skill => (
                        <span key={skill} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{skill}</span>
                      ))}
                      {newProfile.skills.length > 12 && (
                        <span className="text-xs text-slate-500">+{newProfile.skills.length - 12} more</span>
                      )}
                    </div>
                  </div>
                )}
                <div className="p-4">
                  {newProfile.experience?.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase size={14} className="text-green-400" />
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Experience</span>
                      </div>
                      <div className="space-y-2">
                        {newProfile.experience.slice(0, 3).map((exp, i) => (
                          <div key={i}>
                            <p className="text-sm text-slate-200 font-medium">{exp.role}</p>
                            <p className="text-xs text-slate-500">{exp.company} · {exp.duration}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {newProfile.education?.length > 0 && (
                <div className="p-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap size={14} className="text-purple-400" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Education</span>
                  </div>
                  {newProfile.education.slice(0, 2).map((edu, i) => (
                    <p key={i} className="text-sm text-slate-300">{edu.degree} — {edu.institution}{edu.year ? ` (${edu.year})` : ''}</p>
                  ))}
                </div>
              )}

              {newProfile.achievements?.length > 0 && (
                <div className="p-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={14} className="text-amber-400" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Achievements</span>
                  </div>
                  <ul className="space-y-1">
                    {newProfile.achievements.slice(0, 3).map((a, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-1.5">
                        <span className="text-amber-400 mt-1">•</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setNewProfile(null); setError(null); }}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-600 text-slate-300 rounded-xl hover:border-slate-500 hover:text-white transition-colors font-medium"
              >
                <FileText size={15} />
                Try another
              </button>
              <button
                onClick={() => onProfileReady(newProfile)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors"
              >
                Start Interview
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
