import React, { useState, useRef, useCallback } from 'react';
import {
  User, Mail, Phone, Briefcase, GraduationCap, FolderOpen, Star, Code,
  RefreshCw, Pencil, Check, X, Plus, Trash2, Upload, FileText, Loader2, AlertCircle,
} from 'lucide-react';
import { CandidateProfile, Experience, Education, Project } from '../types';

interface ProfilePageProps {
  profile: CandidateProfile;
  onChangeProfile: () => void;
  onUpdate: (p: CandidateProfile) => void;
}

const inp = 'w-full bg-gray-50 border border-gray-300 focus:border-[#0A66C2] rounded-xl px-3.5 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 transition-colors';
const smInp = 'bg-gray-50 border border-gray-300 focus:border-[#0A66C2] rounded-lg px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-colors';

function Section({
  icon, title, editing, onEdit, onSave, onCancel, children,
}: {
  icon: React.ReactNode; title: string; editing: boolean;
  onEdit: () => void; onSave: () => void; onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-[#0A66C2]">{icon}</span>
          <h2 className="text-gray-900 font-semibold text-base">{title}</h2>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={onSave} className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 border border-green-500/30 hover:border-green-500/60 rounded-lg px-3 py-1.5 transition-all">
              <Check size={13} /> Save
            </button>
            <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-all">
              <X size={13} /> Cancel
            </button>
          </div>
        ) : (
          <button onClick={onEdit} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-all">
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

function CVUploadCard({ onUpdate }: { onUpdate: (p: CandidateProfile) => void }) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'txt', 'doc', 'docx'].includes(ext || '')) {
      setUploadState('error');
      setMessage('Please upload a PDF, TXT, or Word document.');
      return;
    }
    setFileName(file.name);
    setUploadState('uploading');
    setMessage('');
    try {
      const form = new FormData();
      form.append('cv', file);
      const res = await fetch('/api/cv/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      onUpdate(data.profile);
      setUploadState('success');
      setMessage('Profile updated from your CV.');
    } catch (err) {
      setUploadState('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  }, [onUpdate]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState('idle');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const isDragging = uploadState === 'dragging';
  const isUploading = uploadState === 'uploading';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <Upload size={16} className="text-[#0A66C2]" />
        <h2 className="text-gray-900 font-semibold text-base">Upload CV</h2>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setUploadState('dragging'); }}
        onDragLeave={() => setUploadState('idle')}
        onDrop={onDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all
          ${isDragging ? 'border-[#0A66C2] bg-[#EEF3F8]' : 'border-gray-300 hover:border-[#0A66C2] hover:bg-gray-50'}
          ${isUploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.doc,.docx"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />

        {isUploading ? (
          <>
            <Loader2 size={32} className="text-[#0A66C2] animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Parsing {fileName}…</p>
              <p className="text-xs text-gray-400 mt-1">Extracting your experience, skills & education</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-[#EEF3F8] flex items-center justify-center">
              <FileText size={22} className="text-[#0A66C2]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {isDragging ? 'Drop your CV here' : 'Drag & drop your CV, or click to browse'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, Word, or TXT · up to 25 MB</p>
            </div>
          </>
        )}
      </div>

      {/* Status message */}
      {uploadState === 'success' && (
        <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <Check size={15} className="shrink-0" />
          {message}
        </div>
      )}
      {uploadState === 'error' && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <AlertCircle size={15} className="shrink-0" />
          {message}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 text-center">
        Uploading will overwrite your current profile data with what's in the CV.
      </p>
    </div>
  );
}

export function ProfilePage({ profile, onChangeProfile, onUpdate }: ProfilePageProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const [headerDraft, setHeaderDraft] = useState({ name: '', title: '', email: '', phone: '', summary: '' });
  const [skillsDraft, setSkillsDraft] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [expDraft, setExpDraft] = useState<Experience[]>([]);
  const [projDraft, setProjDraft] = useState<Project[]>([]);
  const [eduDraft, setEduDraft] = useState<Education[]>([]);
  const [achDraft, setAchDraft] = useState<string[]>([]);

  const startEdit = (section: string) => {
    setEditingSection(section);
    if (section === 'header') setHeaderDraft({ name: profile.name, title: profile.title, email: profile.email || '', phone: profile.phone || '', summary: profile.summary });
    if (section === 'skills') { setSkillsDraft([...profile.skills]); setNewSkill(''); }
    if (section === 'experience') setExpDraft(JSON.parse(JSON.stringify(profile.experience)));
    if (section === 'projects') setProjDraft(JSON.parse(JSON.stringify(profile.projects)));
    if (section === 'education') setEduDraft(JSON.parse(JSON.stringify(profile.education)));
    if (section === 'achievements') setAchDraft([...profile.achievements]);
  };
  const cancelEdit = () => setEditingSection(null);

  const save = (patch: Partial<CandidateProfile>) => {
    onUpdate({ ...profile, ...patch });
    setEditingSection(null);
  };

  // ── Header / Summary ────────────────────────────────────────────────────────
  const isHeader = editingSection === 'header';
  const headerSection = (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-[#EEF3F8] border border-[#0A66C2]/30 flex items-center justify-center shrink-0 overflow-hidden">
            {profile.photoUrl
              ? <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
              : <User size={28} className="text-[#0A66C2]" />}
          </div>
          {isHeader ? (
            <div className="flex-1 space-y-2.5">
              <input className={inp} placeholder="Full name" value={headerDraft.name} onChange={e => setHeaderDraft(d => ({ ...d, name: e.target.value }))} />
              <input className={inp} placeholder="Job title / role" value={headerDraft.title} onChange={e => setHeaderDraft(d => ({ ...d, title: e.target.value }))} />
              <div className="flex gap-2.5">
                <input className={inp} placeholder="Email" value={headerDraft.email} onChange={e => setHeaderDraft(d => ({ ...d, email: e.target.value }))} />
                <input className={inp} placeholder="Phone" value={headerDraft.phone} onChange={e => setHeaderDraft(d => ({ ...d, phone: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <h1 className="text-gray-900 font-bold text-2xl leading-tight">{profile.name}</h1>
              <p className="text-[#0A66C2] font-semibold text-base mt-1">{profile.title}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2.5">
                {profile.email && (
                  <span className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail size={14} className="text-gray-400" />{profile.email}
                  </span>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone size={14} className="text-gray-400" />{profile.phone}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {isHeader ? (
            <div className="flex gap-2">
              <button onClick={() => save({ name: headerDraft.name, title: headerDraft.title, email: headerDraft.email, phone: headerDraft.phone, summary: headerDraft.summary })}
                className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 border border-green-500/30 rounded-lg px-3 py-1.5 transition-all">
                <Check size={13} /> Save
              </button>
              <button onClick={cancelEdit}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 transition-all">
                <X size={13} /> Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => startEdit('header')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-all">
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-5 border-t border-gray-200 pt-5">
        {isHeader ? (
          <textarea
            className={`${inp} min-h-[96px] resize-y`}
            placeholder="Professional summary"
            value={headerDraft.summary}
            onChange={e => setHeaderDraft(d => ({ ...d, summary: e.target.value }))}
          />
        ) : (
          profile.summary && <p className="text-base text-gray-700 leading-relaxed">{profile.summary}</p>
        )}
      </div>
    </div>
  );

  // ── Skills ──────────────────────────────────────────────────────────────────
  const skillsSection = (
    <Section icon={<Code size={16} />} title="Skills" editing={editingSection === 'skills'}
      onEdit={() => startEdit('skills')}
      onSave={() => save({ skills: skillsDraft.filter(Boolean) })}
      onCancel={cancelEdit}
    >
      {editingSection === 'skills' ? (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {skillsDraft.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-full">
                {s}
                <button onClick={() => setSkillsDraft(d => d.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 ml-0.5"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2.5">
            <input className={smInp + ' flex-1'} placeholder="Add skill…" value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newSkill.trim()) { setSkillsDraft(d => [...d, newSkill.trim()]); setNewSkill(''); } }}
            />
            <button onClick={() => { if (newSkill.trim()) { setSkillsDraft(d => [...d, newSkill.trim()]); setNewSkill(''); } }}
              className="flex items-center gap-1.5 text-sm text-[#0A66C2] hover:text-[#004182] border border-[#0A66C2]/30 hover:border-[#0A66C2]/60 rounded-lg px-4 py-2 transition-all">
              <Plus size={13} /> Add
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((s, i) => (
            <span key={i} className="text-sm bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-full font-medium">{s}</span>
          ))}
        </div>
      )}
    </Section>
  );

  // ── Experience ──────────────────────────────────────────────────────────────
  const expSection = (
    <Section icon={<Briefcase size={16} />} title="Experience" editing={editingSection === 'experience'}
      onEdit={() => startEdit('experience')}
      onSave={() => save({ experience: expDraft })}
      onCancel={cancelEdit}
    >
      {editingSection === 'experience' ? (
        <div className="space-y-5">
          {expDraft.map((exp, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2.5 bg-gray-50">
              <div className="flex gap-2.5">
                <input className={smInp + ' flex-1'} placeholder="Role" value={exp.role} onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} />
                <input className={smInp + ' flex-1'} placeholder="Company" value={exp.company} onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, company: e.target.value } : x))} />
                <input className={smInp + ' w-32'} placeholder="Duration" value={exp.duration} onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, duration: e.target.value } : x))} />
                <button onClick={() => setExpDraft(d => d.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>
              </div>
              {exp.highlights.map((h, k) => (
                <div key={k} className="flex gap-2">
                  <input className={smInp + ' flex-1'} value={h} onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, highlights: x.highlights.map((hh, l) => l === k ? e.target.value : hh) } : x))} />
                  <button onClick={() => setExpDraft(d => d.map((x, j) => j === i ? { ...x, highlights: x.highlights.filter((_, l) => l !== k) } : x))} className="text-gray-400 hover:text-red-500 p-1"><X size={13} /></button>
                </div>
              ))}
              <button onClick={() => setExpDraft(d => d.map((x, j) => j === i ? { ...x, highlights: [...x.highlights, ''] } : x))}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
                <Plus size={12} /> Add highlight
              </button>
            </div>
          ))}
          <button onClick={() => setExpDraft(d => [...d, { role: '', company: '', duration: '', highlights: [''] }])}
            className="flex items-center gap-1.5 text-sm text-[#0A66C2] hover:text-[#004182] border border-[#0A66C2]/30 rounded-lg px-4 py-2 transition-all">
            <Plus size={13} /> Add role
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {profile.experience.map((exp, i) => (
            <div key={i} className={i < profile.experience.length - 1 ? 'pb-5 border-b border-gray-200' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-gray-900 font-semibold text-base">{exp.role}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{exp.company}</p>
                </div>
                <span className="text-sm text-gray-400 shrink-0 mt-0.5">{exp.duration}</span>
              </div>
              {exp.highlights?.length > 0 && (
                <ul className="mt-3 space-y-1.5 pl-4">
                  {exp.highlights.map((h, j) => (
                    <li key={j} className="text-sm text-gray-500 leading-relaxed flex gap-2.5">
                      <span className="text-gray-300 mt-1.5 shrink-0">•</span><span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );

  // ── Projects ─────────────────────────────────────────────────────────────────
  const projSection = (
    <Section icon={<FolderOpen size={16} />} title="Projects" editing={editingSection === 'projects'}
      onEdit={() => startEdit('projects')}
      onSave={() => save({ projects: projDraft })}
      onCancel={cancelEdit}
    >
      {editingSection === 'projects' ? (
        <div className="space-y-4">
          {projDraft.map((p, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2.5 bg-gray-50">
              <div className="flex gap-2.5">
                <input className={smInp + ' flex-1'} placeholder="Project name" value={p.name} onChange={e => setProjDraft(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <button onClick={() => setProjDraft(d => d.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>
              </div>
              <textarea className={smInp + ' w-full resize-none'} rows={2} placeholder="Description" value={p.description}
                onChange={e => setProjDraft(d => d.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
              <div className="flex flex-wrap gap-2">
                {p.technologies.map((t, k) => (
                  <span key={k} className="flex items-center gap-1.5 text-sm bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                    {t}
                    <button onClick={() => setProjDraft(d => d.map((x, j) => j === i ? { ...x, technologies: x.technologies.filter((_, l) => l !== k) } : x))} className="text-indigo-400/50 hover:text-red-500"><X size={11} /></button>
                  </span>
                ))}
                <input className={smInp + ' w-28'} placeholder="+ tech"
                  onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { const v = (e.target as HTMLInputElement).value.trim(); setProjDraft(d => d.map((x, j) => j === i ? { ...x, technologies: [...x.technologies, v] } : x)); (e.target as HTMLInputElement).value = ''; } }} />
              </div>
            </div>
          ))}
          <button onClick={() => setProjDraft(d => [...d, { name: '', description: '', technologies: [] }])}
            className="flex items-center gap-1.5 text-sm text-[#0A66C2] hover:text-[#004182] border border-[#0A66C2]/30 rounded-lg px-4 py-2 transition-all">
            <Plus size={13} /> Add project
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {profile.projects.map((p, i) => (
            <div key={i} className={i < profile.projects.length - 1 ? 'pb-4 border-b border-gray-200' : ''}>
              <p className="text-gray-900 font-semibold text-base">{p.name}</p>
              {p.description && <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{p.description}</p>}
              {p.technologies?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {p.technologies.map((t, j) => (
                    <span key={j} className="text-sm bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );

  // ── Education ────────────────────────────────────────────────────────────────
  const eduSection = (
    <Section icon={<GraduationCap size={16} />} title="Education" editing={editingSection === 'education'}
      onEdit={() => startEdit('education')}
      onSave={() => save({ education: eduDraft })}
      onCancel={cancelEdit}
    >
      {editingSection === 'education' ? (
        <div className="space-y-3">
          {eduDraft.map((e, i) => (
            <div key={i} className="flex gap-2.5 items-center">
              <input className={smInp + ' flex-1'} placeholder="Degree" value={e.degree} onChange={ev => setEduDraft(d => d.map((x, j) => j === i ? { ...x, degree: ev.target.value } : x))} />
              <input className={smInp + ' flex-1'} placeholder="Institution" value={e.institution} onChange={ev => setEduDraft(d => d.map((x, j) => j === i ? { ...x, institution: ev.target.value } : x))} />
              <input className={smInp + ' w-24'} placeholder="Year" value={e.year} onChange={ev => setEduDraft(d => d.map((x, j) => j === i ? { ...x, year: ev.target.value } : x))} />
              <button onClick={() => setEduDraft(d => d.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>
            </div>
          ))}
          <button onClick={() => setEduDraft(d => [...d, { degree: '', institution: '', year: '' }])}
            className="flex items-center gap-1.5 text-sm text-[#0A66C2] hover:text-[#004182] border border-[#0A66C2]/30 rounded-lg px-4 py-2 transition-all">
            <Plus size={13} /> Add education
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {profile.education.map((e, i) => (
            <div key={i} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-gray-900 font-semibold text-base">{e.degree}</p>
                <p className="text-gray-500 text-sm mt-0.5">{e.institution}</p>
              </div>
              <span className="text-sm text-gray-400 shrink-0">{e.year}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );

  // ── Achievements ─────────────────────────────────────────────────────────────
  const achSection = (
    <Section icon={<Star size={16} />} title="Achievements" editing={editingSection === 'achievements'}
      onEdit={() => startEdit('achievements')}
      onSave={() => save({ achievements: achDraft.filter(Boolean) })}
      onCancel={cancelEdit}
    >
      {editingSection === 'achievements' ? (
        <div className="space-y-2.5">
          {achDraft.map((a, i) => (
            <div key={i} className="flex gap-2.5">
              <input className={smInp + ' flex-1'} value={a} onChange={e => setAchDraft(d => d.map((x, j) => j === i ? e.target.value : x))} />
              <button onClick={() => setAchDraft(d => d.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>
            </div>
          ))}
          <button onClick={() => setAchDraft(d => [...d, ''])}
            className="flex items-center gap-1.5 text-sm text-[#0A66C2] hover:text-[#004182] border border-[#0A66C2]/30 rounded-lg px-4 py-2 transition-all">
            <Plus size={13} /> Add achievement
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {profile.achievements.map((a, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-500 leading-relaxed">
              <span className="text-yellow-500 mt-0.5 shrink-0 text-base">★</span><span>{a}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );

  return (
    <div className="h-full overflow-y-auto bg-[#F3F2EF]">
      <div className="max-w-2xl mx-auto px-5 py-7 space-y-5">
        {headerSection}
        <CVUploadCard onUpdate={onUpdate} />
        {profile.skills?.length > 0 || editingSection === 'skills' ? skillsSection : null}
        {profile.experience?.length > 0 || editingSection === 'experience' ? expSection : null}
        {profile.projects?.length > 0 || editingSection === 'projects' ? projSection : null}
        {profile.education?.length > 0 || editingSection === 'education' ? eduSection : null}
        {profile.achievements?.length > 0 || editingSection === 'achievements' ? achSection : null}
      </div>
    </div>
  );
}
