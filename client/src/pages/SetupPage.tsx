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
      <div className="flex items-center gap-3 p-4 bg-[#EEF3F8] border border-[#0A66C2]/30 rounded-xl">
        <CheckCircle2 size={20} className="text-[#0A66C2] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[#0A66C2] font-medium">Saved profile found</p>
          <p className="text-[#0A66C2]/70 text-sm truncate">{profile.name} · {profile.title}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#EEF3F8] border border-[#0A66C2]/30 flex items-center justify-center shrink-0">
              <User size={20} className="text-[#0A66C2]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
              <p className="text-gray-500 text-sm">{profile.title}</p>
            </div>
          </div>
          {profile.summary && (
            <p className="text-gray-700 text-sm mt-3 leading-relaxed">{profile.summary}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-0 divide-x divide-gray-200">
          {profile.skills?.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Code2 size={14} className="text-[#0A66C2]" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Skills</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.slice(0, 10).map(skill => (
                  <span key={skill} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{skill}</span>
                ))}
                {profile.skills.length > 10 && (
                  <span className="text-xs text-gray-400">+{profile.skills.length - 10} more</span>
                )}
              </div>
            </div>
          )}
          <div className="p-4">
            {profile.experience?.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={14} className="text-green-600" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Experience</span>
                </div>
                <div className="space-y-2">
                  {profile.experience.slice(0, 3).map((exp, i) => (
                    <div key={i}>
                      <p className="text-sm text-gray-800 font-medium">{exp.role}</p>
                      <p className="text-xs text-gray-400">{exp.company} · {exp.duration}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {profile.education?.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap size={14} className="text-purple-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Education</span>
            </div>
            {profile.education.slice(0, 2).map((edu, i) => (
              <p key={i} className="text-sm text-gray-700">{edu.degree} — {edu.institution}{edu.year ? ` (${edu.year})` : ''}</p>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReplace}
          className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:border-gray-400 hover:text-gray-900 transition-colors font-medium"
        >
          <RefreshCw size={15} />
          Update CV
        </button>
        <button
          onClick={onStart}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl font-semibold transition-colors"
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
      <div className="min-h-screen bg-[#F3F2EF] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center">
                <Briefcase size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Interview Copilot</h1>
            </div>
            <p className="text-gray-400 text-sm">Welcome back!</p>
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
    <div className="min-h-screen bg-[#F3F2EF] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center">
              <Briefcase size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Copilot</h1>
          </div>
          <p className="text-gray-600 text-lg">Your AI-powered interview assistant</p>
          <p className="text-gray-400 text-sm mt-1">Upload your CV to get personalised, real-time coaching</p>
        </div>

        {/* Back to saved profile */}
        {savedProfile && !newProfile && (
          <button
            onClick={() => onProfileReady(savedProfile)}
            className="flex items-center gap-2 text-sm text-[#0A66C2] hover:text-[#004182] mb-4 transition-colors"
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
                isDragging ? 'border-[#0A66C2] bg-[#EEF3F8]' :
                isUploading ? 'border-gray-300 bg-gray-50 cursor-wait' :
                'border-gray-300 bg-white hover:border-[#0A66C2]/50 hover:bg-gray-50'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx" className="hidden" onChange={handleFileChange} />
              {isUploading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 size={40} className="text-[#0A66C2] animate-spin" />
                  <div>
                    <p className="text-gray-800 font-medium">Processing your CV...</p>
                    <p className="text-gray-400 text-sm mt-1">Claude is extracting your profile</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-[#EEF3F8]' : 'bg-gray-100'}`}>
                    <Upload size={28} className={isDragging ? 'text-[#0A66C2]' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="text-gray-800 font-semibold text-lg">Drop your CV here</p>
                    <p className="text-gray-500 text-sm mt-1">or click to browse files</p>
                    <p className="text-gray-400 text-xs mt-2">PDF, TXT, or DOC supported</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <CheckCircle2 size={20} className="text-green-600 shrink-0" />
              <div>
                <p className="text-green-600 font-medium">CV processed successfully!</p>
                <p className="text-green-600/70 text-sm">Profile will be saved for next time</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#EEF3F8] border border-[#0A66C2]/30 flex items-center justify-center">
                    <User size={20} className="text-[#0A66C2]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{newProfile.name}</h2>
                    <p className="text-gray-500 text-sm">{newProfile.title}</p>
                  </div>
                </div>
                {newProfile.summary && (
                  <p className="text-gray-700 text-sm mt-3 leading-relaxed">{newProfile.summary}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-0 divide-x divide-gray-200">
                {newProfile.skills?.length > 0 && (
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Code2 size={14} className="text-[#0A66C2]" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Skills</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {newProfile.skills.slice(0, 12).map(skill => (
                        <span key={skill} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{skill}</span>
                      ))}
                      {newProfile.skills.length > 12 && (
                        <span className="text-xs text-gray-400">+{newProfile.skills.length - 12} more</span>
                      )}
                    </div>
                  </div>
                )}
                <div className="p-4">
                  {newProfile.experience?.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase size={14} className="text-green-600" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Experience</span>
                      </div>
                      <div className="space-y-2">
                        {newProfile.experience.slice(0, 3).map((exp, i) => (
                          <div key={i}>
                            <p className="text-sm text-gray-800 font-medium">{exp.role}</p>
                            <p className="text-xs text-gray-400">{exp.company} · {exp.duration}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {newProfile.education?.length > 0 && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap size={14} className="text-purple-600" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Education</span>
                  </div>
                  {newProfile.education.slice(0, 2).map((edu, i) => (
                    <p key={i} className="text-sm text-gray-700">{edu.degree} — {edu.institution}{edu.year ? ` (${edu.year})` : ''}</p>
                  ))}
                </div>
              )}

              {newProfile.achievements?.length > 0 && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={14} className="text-amber-600" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Achievements</span>
                  </div>
                  <ul className="space-y-1">
                    {newProfile.achievements.slice(0, 3).map((a, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-amber-600 mt-1">•</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setNewProfile(null); setError(null); }}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:border-gray-400 hover:text-gray-900 transition-colors font-medium"
              >
                <FileText size={15} />
                Try another
              </button>
              <button
                onClick={() => onProfileReady(newProfile)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl font-semibold transition-colors"
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
