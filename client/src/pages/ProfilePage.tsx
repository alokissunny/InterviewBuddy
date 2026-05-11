import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  User, Mail, Phone, Briefcase, GraduationCap, FolderOpen, Star, Code,
  Pencil, Check, X, Plus, Trash2, Upload, FileText, Loader2, AlertCircle,
  ChevronRight, Zap,
} from 'lucide-react';
import { CandidateProfile, Experience, Education, Project } from '../types';

interface ProfilePageProps {
  profile: CandidateProfile;
  onChangeProfile: () => void;
  onUpdate: (p: CandidateProfile) => void;
}

// ─── Input style tokens ───────────────────────────────────────────────────────

const inp  = 'w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-all';
const smInp = 'bg-white border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-all';

// ─── Profile completeness ─────────────────────────────────────────────────────

function completeness(p: CandidateProfile): number {
  let pts = 0;
  if (p.name)                          pts += 10;
  if (p.title)                         pts += 10;
  if (p.summary)                       pts += 15;
  if ((p.skills?.length  ?? 0) >= 3)   pts += 15;
  if ((p.experience?.length ?? 0) >= 1) pts += 20;
  if ((p.education?.length  ?? 0) >= 1) pts += 15;
  if ((p.projects?.length   ?? 0) >= 1) pts += 10;
  if ((p.achievements?.length ?? 0) >= 1) pts += 5;
  return pts;
}

// ─── Saved flash ──────────────────────────────────────────────────────────────

function SavedBadge({ show }: { show: boolean }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-medium text-green-600 transition-all duration-300 ${
      show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
    }`}>
      <Check size={12} /> Saved
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon, title, editing, saved, onEdit, onSave, onCancel, children, emptyMsg,
}: {
  icon: React.ReactNode;
  title: string;
  editing: boolean;
  saved: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  emptyMsg?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className="text-indigo-500">{icon}</span>
          <h2 className="text-gray-900 font-semibold text-sm">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <SavedBadge show={saved} />
          {editing ? (
            <div className="flex gap-1.5">
              <button
                onClick={onSave}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition-all"
              >
                <Check size={12} /> Save
              </button>
              <button
                onClick={onCancel}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-1.5 transition-all"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 rounded-lg px-3 py-1.5 transition-all"
            >
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message, onAdd }: { message: string; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-gray-400 hover:text-indigo-500 transition-all group"
    >
      <span className="text-sm">{message}</span>
      <Plus size={15} className="group-hover:scale-110 transition-transform" />
    </button>
  );
}

// ─── CV Upload card ───────────────────────────────────────────────────────────

function CVUploadCard({ onUpdate }: { onUpdate: (p: CandidateProfile) => void }) {
  const [state, setState] = useState<'idle' | 'dragging' | 'uploading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'txt', 'doc', 'docx'].includes(ext || '')) {
      setState('error');
      setMsg('Please upload a PDF, TXT, or Word document.');
      return;
    }
    setFileName(file.name);
    setState('uploading');
    setMsg('');
    try {
      const form = new FormData();
      form.append('cv', file);
      const res = await fetch('/api/cv/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      onUpdate(data.profile);
      setState('success');
      setMsg('Profile updated from your CV!');
    } catch (err) {
      setState('error');
      setMsg(err instanceof Error ? err.message : 'Upload failed.');
    }
  }, [onUpdate]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState('idle');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <Upload size={15} className="text-indigo-500" />
        <h2 className="text-gray-900 font-semibold text-sm">Upload CV</h2>
        <span className="ml-auto text-xs text-gray-400">Overwrites all profile data</span>
      </div>
      <div className="p-5">
        <div
          onDragOver={e => { e.preventDefault(); setState('dragging'); }}
          onDragLeave={() => setState('idle')}
          onDrop={onDrop}
          onClick={() => state !== 'uploading' && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-8 px-4 cursor-pointer transition-all ${
            state === 'dragging'  ? 'border-indigo-500 bg-indigo-50' :
            state === 'uploading' ? 'border-gray-200 bg-gray-50 pointer-events-none' :
            state === 'success'   ? 'border-emerald-400/60 bg-emerald-50/40 cursor-default' :
            state === 'error'     ? 'border-red-300/60 bg-red-50/30 hover:border-red-400/60' :
            'border-gray-200 hover:border-indigo-400/60 hover:bg-indigo-50/30'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />

          {state === 'uploading' ? (
            <>
              <Loader2 size={28} className="text-indigo-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Parsing {fileName}…</p>
                <p className="text-xs text-gray-400 mt-0.5">Extracting experience, skills & education</p>
              </div>
            </>
          ) : state === 'success' ? (
            <>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check size={20} className="text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-emerald-700">{msg}</p>
            </>
          ) : state === 'error' ? (
            <>
              <AlertCircle size={28} className="text-red-400" />
              <p className="text-sm text-red-600 text-center">{msg}</p>
              <span className="text-xs text-gray-400">Click to try again</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <FileText size={20} className={state === 'dragging' ? 'text-indigo-600' : 'text-indigo-400'} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {state === 'dragging' ? 'Drop to upload' : 'Drag & drop your CV, or click to browse'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">PDF, Word, or TXT · up to 25 MB</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────

export function ProfilePage({ profile, onUpdate }: ProfilePageProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [savedSection,   setSavedSection]   = useState<string | null>(null);

  const [headerDraft, setHeaderDraft] = useState({ name: '', title: '', email: '', phone: '', summary: '' });
  const [skillsDraft, setSkillsDraft] = useState<string[]>([]);
  const [newSkill,    setNewSkill]    = useState('');
  const [expDraft,    setExpDraft]    = useState<Experience[]>([]);
  const [projDraft,   setProjDraft]   = useState<Project[]>([]);
  const [eduDraft,    setEduDraft]    = useState<Education[]>([]);
  const [achDraft,    setAchDraft]    = useState<string[]>([]);

  // Flash "Saved" badge for 2s after each save
  const flashSaved = (section: string) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection(s => s === section ? null : s), 2000);
  };

  const startEdit = (section: string) => {
    setEditingSection(section);
    if (section === 'header')       setHeaderDraft({ name: profile.name, title: profile.title, email: profile.email || '', phone: profile.phone || '', summary: profile.summary });
    if (section === 'skills')       { setSkillsDraft([...profile.skills]); setNewSkill(''); }
    if (section === 'experience')   setExpDraft(JSON.parse(JSON.stringify(profile.experience)));
    if (section === 'projects')     setProjDraft(JSON.parse(JSON.stringify(profile.projects)));
    if (section === 'education')    setEduDraft(JSON.parse(JSON.stringify(profile.education)));
    if (section === 'achievements') setAchDraft([...profile.achievements]);
  };

  const cancelEdit = () => setEditingSection(null);

  const save = (patch: Partial<CandidateProfile>, section: string) => {
    onUpdate({ ...profile, ...patch });
    setEditingSection(null);
    flashSaved(section);
  };

  const pct = completeness(profile);
  const initials = profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="h-full overflow-y-auto bg-[#F3F2EF]">
      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-6 space-y-4">

        {/* ── Profile header card ─────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          {/* Cover banner */}
          <div className="h-24 sm:h-28 relative rounded-t-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 60%,#9333EA 100%)' }}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            {/* Edit button */}
            <div className="absolute top-3 right-3">
              {editingSection === 'header' ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => save({ name: headerDraft.name, title: headerDraft.title, email: headerDraft.email, phone: headerDraft.phone, summary: headerDraft.summary }, 'header')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 border border-white/25 rounded-lg px-3 py-1.5 backdrop-blur-sm transition-all"
                  >
                    <Check size={12} /> Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-1.5 backdrop-blur-sm transition-all"
                  >
                    <X size={12} /> Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit('header')}
                  className="flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-1.5 backdrop-blur-sm transition-all"
                >
                  <Pencil size={12} /> Edit
                </button>
              )}
            </div>
          </div>

          {/* Avatar + identity */}
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-10 mb-4 relative z-10">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl ring-4 ring-white shadow-md overflow-hidden shrink-0"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
                {profile.photoUrl
                  ? <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">{initials}</span>
                    </div>
                }
              </div>
              {/* Saved flash */}
              <SavedBadge show={savedSection === 'header'} />
            </div>

            {editingSection === 'header' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className={inp} placeholder="Full name" value={headerDraft.name}
                    onChange={e => setHeaderDraft(d => ({ ...d, name: e.target.value }))} />
                  <input className={inp} placeholder="Job title / role" value={headerDraft.title}
                    onChange={e => setHeaderDraft(d => ({ ...d, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className={inp} placeholder="Email" type="email" value={headerDraft.email}
                    onChange={e => setHeaderDraft(d => ({ ...d, email: e.target.value }))} />
                  <input className={inp} placeholder="Phone" type="tel" value={headerDraft.phone}
                    onChange={e => setHeaderDraft(d => ({ ...d, phone: e.target.value }))} />
                </div>
                <textarea
                  className={`${inp} min-h-[88px] resize-y`}
                  placeholder="Professional summary — 2–3 sentences about your background and what you're looking for"
                  value={headerDraft.summary}
                  onChange={e => setHeaderDraft(d => ({ ...d, summary: e.target.value }))}
                />
              </div>
            ) : (
              <>
                <h1 className="text-gray-900 font-bold text-xl leading-tight">{profile.name || <span className="text-gray-300">Your Name</span>}</h1>
                {profile.title && <p className="text-indigo-600 font-semibold text-sm mt-0.5">{profile.title}</p>}
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2.5">
                  {profile.email && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Mail size={12} className="text-gray-400" />{profile.email}
                    </span>
                  )}
                  {profile.phone && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Phone size={12} className="text-gray-400" />{profile.phone}
                    </span>
                  )}
                </div>
                {profile.summary ? (
                  <p className="text-sm text-gray-600 leading-relaxed mt-3 border-t border-gray-100 pt-3">{profile.summary}</p>
                ) : (
                  <button onClick={() => startEdit('header')}
                    className="mt-3 border-t border-gray-100 pt-3 w-full text-left text-sm text-gray-400 hover:text-indigo-500 transition-colors">
                    + Add a professional summary…
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Profile completeness ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-indigo-500" />
              <span className="text-sm font-semibold text-gray-700">Profile strength</span>
            </div>
            <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
              {pct}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct < 100 && (
            <p className="text-xs text-gray-400 mt-2">
              {pct < 40 && 'Add skills, experience, and education to unlock full AI coaching.'}
              {pct >= 40 && pct < 70 && 'Good start — adding more details improves interview coaching accuracy.'}
              {pct >= 70 && pct < 100 && 'Almost there — fill in the remaining sections for best results.'}
            </p>
          )}
        </div>

        {/* ── Skills ─────────────────────────────────────────────────────── */}
        <Section
          icon={<Code size={15} />}
          title="Skills"
          editing={editingSection === 'skills'}
          saved={savedSection === 'skills'}
          onEdit={() => startEdit('skills')}
          onSave={() => save({ skills: skillsDraft.filter(Boolean) }, 'skills')}
          onCancel={cancelEdit}
        >
          {editingSection === 'skills' ? (
            <div>
              <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
                {skillsDraft.map((s, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-full font-medium">
                    {s}
                    <button onClick={() => setSkillsDraft(d => d.filter((_, j) => j !== i))}
                      className="text-indigo-300 hover:text-red-500 transition-colors ml-0.5">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2.5">
                <input
                  className={`${smInp} flex-1`}
                  placeholder="Type a skill and press Enter…"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newSkill.trim()) {
                      setSkillsDraft(d => [...d, newSkill.trim()]);
                      setNewSkill('');
                    }
                  }}
                />
                <button
                  onClick={() => { if (newSkill.trim()) { setSkillsDraft(d => [...d, newSkill.trim()]); setNewSkill(''); } }}
                  className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg px-4 py-2 transition-all bg-indigo-50 hover:bg-indigo-100"
                >
                  <Plus size={13} /> Add
                </button>
              </div>
            </div>
          ) : profile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s, i) => (
                <span key={i} className="text-sm bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-full font-medium">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState message="Add your skills — used by AI coaching to tailor answers" onAdd={() => startEdit('skills')} />
          )}
        </Section>

        {/* ── Experience ──────────────────────────────────────────────────── */}
        <Section
          icon={<Briefcase size={15} />}
          title="Experience"
          editing={editingSection === 'experience'}
          saved={savedSection === 'experience'}
          onEdit={() => startEdit('experience')}
          onSave={() => save({ experience: expDraft }, 'experience')}
          onCancel={cancelEdit}
        >
          {editingSection === 'experience' ? (
            <div className="space-y-4">
              {expDraft.map((exp, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
                  {/* Role + Company on same row (stacks on very small screens) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input className={smInp + ' w-full'} placeholder="Job title / role"
                      value={exp.role}
                      onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} />
                    <input className={smInp + ' w-full'} placeholder="Company"
                      value={exp.company}
                      onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, company: e.target.value } : x))} />
                  </div>
                  {/* Duration + delete */}
                  <div className="flex gap-2.5 items-center">
                    <input className={smInp + ' flex-1'} placeholder="Duration (e.g. Jan 2022 – Present)"
                      value={exp.duration}
                      onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, duration: e.target.value } : x))} />
                    <button onClick={() => setExpDraft(d => d.filter((_, j) => j !== i))}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {/* Highlights */}
                  <div className="space-y-2">
                    {exp.highlights.map((h, k) => (
                      <div key={k} className="flex gap-2 items-center">
                        <span className="text-gray-300 shrink-0 text-base mt-0.5">•</span>
                        <input className={smInp + ' flex-1'} placeholder="Key achievement or responsibility"
                          value={h}
                          onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, highlights: x.highlights.map((hh, l) => l === k ? e.target.value : hh) } : x))} />
                        <button
                          onClick={() => setExpDraft(d => d.map((x, j) => j === i ? { ...x, highlights: x.highlights.filter((_, l) => l !== k) } : x))}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setExpDraft(d => d.map((x, j) => j === i ? { ...x, highlights: [...x.highlights, ''] } : x))}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-500 transition-colors py-1">
                      <Plus size={12} /> Add highlight
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setExpDraft(d => [...d, { role: '', company: '', duration: '', highlights: [''] }])}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl px-4 py-3 w-full justify-center transition-all hover:bg-indigo-50/40"
              >
                <Plus size={14} /> Add role
              </button>
            </div>
          ) : profile.experience.length > 0 ? (
            <div className="space-y-5">
              {profile.experience.map((exp, i) => (
                <div key={i} className={i < profile.experience.length - 1 ? 'pb-5 border-b border-gray-100' : ''}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-gray-900 font-semibold text-sm leading-snug">{exp.role}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{exp.company}</p>
                    </div>
                    {exp.duration && <span className="text-xs text-gray-400 shrink-0 bg-gray-100 px-2.5 py-1 rounded-full">{exp.duration}</span>}
                  </div>
                  {exp.highlights?.length > 0 && (
                    <ul className="mt-2.5 space-y-1.5 pl-3">
                      {exp.highlights.filter(Boolean).map((h, j) => (
                        <li key={j} className="text-xs text-gray-500 leading-relaxed flex gap-2.5">
                          <span className="text-indigo-300 shrink-0 mt-1">•</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Add your work experience" onAdd={() => startEdit('experience')} />
          )}
        </Section>

        {/* ── Projects ────────────────────────────────────────────────────── */}
        <Section
          icon={<FolderOpen size={15} />}
          title="Projects"
          editing={editingSection === 'projects'}
          saved={savedSection === 'projects'}
          onEdit={() => startEdit('projects')}
          onSave={() => save({ projects: projDraft }, 'projects')}
          onCancel={cancelEdit}
        >
          {editingSection === 'projects' ? (
            <div className="space-y-4">
              {projDraft.map((p, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
                  <div className="flex gap-2.5 items-center">
                    <input className={smInp + ' flex-1'} placeholder="Project name"
                      value={p.name}
                      onChange={e => setProjDraft(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <button onClick={() => setProjDraft(d => d.filter((_, j) => j !== i))}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <textarea
                    className={smInp + ' w-full resize-none'}
                    rows={2}
                    placeholder="Brief description"
                    value={p.description}
                    onChange={e => setProjDraft(d => d.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                  />
                  {/* Technologies */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {p.technologies.map((t, k) => (
                      <span key={k} className="flex items-center gap-1.5 text-xs bg-violet-50 text-violet-600 border border-violet-200 px-2.5 py-1 rounded-lg font-medium">
                        {t}
                        <button onClick={() => setProjDraft(d => d.map((x, j) => j === i ? { ...x, technologies: x.technologies.filter((_, l) => l !== k) } : x))}
                          className="text-violet-300 hover:text-red-500 transition-colors">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <input
                      className={smInp + ' w-28 text-xs'}
                      placeholder="+ tech"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const v = (e.target as HTMLInputElement).value.trim();
                          if (v) { setProjDraft(d => d.map((x, j) => j === i ? { ...x, technologies: [...x.technologies, v] } : x)); (e.target as HTMLInputElement).value = ''; }
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setProjDraft(d => [...d, { name: '', description: '', technologies: [] }])}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl px-4 py-3 w-full justify-center transition-all hover:bg-indigo-50/40"
              >
                <Plus size={14} /> Add project
              </button>
            </div>
          ) : profile.projects.length > 0 ? (
            <div className="space-y-4">
              {profile.projects.map((p, i) => (
                <div key={i} className={i < profile.projects.length - 1 ? 'pb-4 border-b border-gray-100' : ''}>
                  <p className="text-gray-900 font-semibold text-sm">{p.name}</p>
                  {p.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{p.description}</p>}
                  {p.technologies?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.technologies.map((t, j) => (
                        <span key={j} className="text-xs bg-violet-50 text-violet-600 border border-violet-100 px-2.5 py-0.5 rounded-lg font-medium">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Add side projects or personal work" onAdd={() => startEdit('projects')} />
          )}
        </Section>

        {/* ── Education ───────────────────────────────────────────────────── */}
        <Section
          icon={<GraduationCap size={15} />}
          title="Education"
          editing={editingSection === 'education'}
          saved={savedSection === 'education'}
          onEdit={() => startEdit('education')}
          onSave={() => save({ education: eduDraft }, 'education')}
          onCancel={cancelEdit}
        >
          {editingSection === 'education' ? (
            <div className="space-y-3">
              {eduDraft.map((e, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2.5 items-center">
                  <input className={smInp + ' w-full'} placeholder="Degree"
                    value={e.degree}
                    onChange={ev => setEduDraft(d => d.map((x, j) => j === i ? { ...x, degree: ev.target.value } : x))} />
                  <input className={smInp + ' w-full'} placeholder="Institution"
                    value={e.institution}
                    onChange={ev => setEduDraft(d => d.map((x, j) => j === i ? { ...x, institution: ev.target.value } : x))} />
                  <input className={smInp + ' w-full sm:w-20'} placeholder="Year"
                    value={e.year}
                    onChange={ev => setEduDraft(d => d.map((x, j) => j === i ? { ...x, year: ev.target.value } : x))} />
                  <button onClick={() => setEduDraft(d => d.filter((_, j) => j !== i))}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors justify-self-start sm:justify-self-auto">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEduDraft(d => [...d, { degree: '', institution: '', year: '' }])}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl px-4 py-3 w-full justify-center transition-all hover:bg-indigo-50/40"
              >
                <Plus size={14} /> Add education
              </button>
            </div>
          ) : profile.education.length > 0 ? (
            <div className="space-y-3.5">
              {profile.education.map((e, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-gray-900 font-semibold text-sm">{e.degree}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{e.institution}</p>
                  </div>
                  {e.year && <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">{e.year}</span>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Add your education background" onAdd={() => startEdit('education')} />
          )}
        </Section>

        {/* ── Achievements ────────────────────────────────────────────────── */}
        <Section
          icon={<Star size={15} />}
          title="Achievements & Certifications"
          editing={editingSection === 'achievements'}
          saved={savedSection === 'achievements'}
          onEdit={() => startEdit('achievements')}
          onSave={() => save({ achievements: achDraft.filter(Boolean) }, 'achievements')}
          onCancel={cancelEdit}
        >
          {editingSection === 'achievements' ? (
            <div className="space-y-2.5">
              {achDraft.map((a, i) => (
                <div key={i} className="flex gap-2.5 items-center">
                  <span className="text-amber-400 shrink-0">★</span>
                  <input className={smInp + ' flex-1'} placeholder="Award, certification, or recognition"
                    value={a}
                    onChange={e => setAchDraft(d => d.map((x, j) => j === i ? e.target.value : x))} />
                  <button onClick={() => setAchDraft(d => d.filter((_, j) => j !== i))}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAchDraft(d => [...d, ''])}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl px-4 py-3 w-full justify-center transition-all hover:bg-indigo-50/40"
              >
                <Plus size={14} /> Add achievement
              </button>
            </div>
          ) : profile.achievements.length > 0 ? (
            <ul className="space-y-2.5">
              {profile.achievements.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                  <span className="text-amber-400 shrink-0 mt-0.5">★</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="Add awards, certifications, or recognitions" onAdd={() => startEdit('achievements')} />
          )}
        </Section>

        {/* ── Upload CV ───────────────────────────────────────────────────── */}
        <CVUploadCard onUpdate={onUpdate} />

        <p className="text-center text-xs text-gray-400 pb-4">
          Profile data is stored locally and synced to your account.
        </p>

      </div>
    </div>
  );
}
