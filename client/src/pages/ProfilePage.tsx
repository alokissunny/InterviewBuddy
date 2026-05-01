import React, { useState } from 'react';
import {
  User, Mail, Phone, Briefcase, GraduationCap, FolderOpen, Star, Code,
  RefreshCw, Pencil, Check, X, Plus, Trash2,
} from 'lucide-react';
import { CandidateProfile, Experience, Education, Project } from '../types';

interface ProfilePageProps {
  profile: CandidateProfile;
  onChangeProfile: () => void;
  onUpdate: (p: CandidateProfile) => void;
}

// ── tiny shared input styles ────────────────────────────────────────────────
const inp = 'w-full bg-slate-700/60 border border-slate-600 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none placeholder:text-slate-500';
const smInp = 'bg-slate-700/60 border border-slate-600 focus:border-blue-500 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none placeholder:text-slate-500';

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  icon, title, editing, onEdit, onSave, onCancel, children,
}: {
  icon: React.ReactNode; title: string; editing: boolean;
  onEdit: () => void; onSave: () => void; onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-blue-400">{icon}</span>
          <h2 className="text-slate-200 font-semibold text-sm">{title}</h2>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={onSave} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 border border-green-500/30 rounded-lg px-2.5 py-1 transition-colors">
              <Check size={11} /> Save
            </button>
            <button onClick={onCancel} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-lg px-2.5 py-1 transition-colors">
              <X size={11} /> Cancel
            </button>
          </div>
        ) : (
          <button onClick={onEdit} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 hover:border-slate-500 rounded-lg px-2.5 py-1 transition-colors">
            <Pencil size={11} /> Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function ProfilePage({ profile, onChangeProfile, onUpdate }: ProfilePageProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // per-section draft states
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

  // ── Header / Summary ───────────────────────────────────────────────────────
  const isHeader = editingSection === 'header';
  const headerSection = (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <User size={24} className="text-blue-400" />
          </div>
          {isHeader ? (
            <div className="flex-1 space-y-2">
              <input className={inp} placeholder="Full name" value={headerDraft.name} onChange={e => setHeaderDraft(d => ({ ...d, name: e.target.value }))} />
              <input className={inp} placeholder="Job title / role" value={headerDraft.title} onChange={e => setHeaderDraft(d => ({ ...d, title: e.target.value }))} />
              <div className="flex gap-2">
                <input className={inp} placeholder="Email" value={headerDraft.email} onChange={e => setHeaderDraft(d => ({ ...d, email: e.target.value }))} />
                <input className={inp} placeholder="Phone" value={headerDraft.phone} onChange={e => setHeaderDraft(d => ({ ...d, phone: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <h1 className="text-white font-bold text-xl">{profile.name}</h1>
              <p className="text-blue-400 font-medium text-sm mt-0.5">{profile.title}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {profile.email && <span className="flex items-center gap-1.5 text-xs text-slate-400"><Mail size={11} className="text-slate-500" />{profile.email}</span>}
                {profile.phone && <span className="flex items-center gap-1.5 text-xs text-slate-400"><Phone size={11} className="text-slate-500" />{profile.phone}</span>}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {isHeader ? (
            <div className="flex gap-2">
              <button onClick={() => save({ name: headerDraft.name, title: headerDraft.title, email: headerDraft.email, phone: headerDraft.phone, summary: headerDraft.summary })} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 border border-green-500/30 rounded-lg px-2.5 py-1 transition-colors"><Check size={11} />Save</button>
              <button onClick={cancelEdit} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-lg px-2.5 py-1 transition-colors"><X size={11} />Cancel</button>
            </div>
          ) : (
            <button onClick={() => startEdit('header')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 hover:border-slate-500 rounded-lg px-2.5 py-1 transition-colors"><Pencil size={11} />Edit</button>
          )}
          <button onClick={onChangeProfile} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 hover:border-slate-500 rounded-lg px-3 py-1.5 transition-colors"><RefreshCw size={11} />Update CV</button>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 border-t border-slate-700/50 pt-4">
        {isHeader ? (
          <textarea
            className={`${inp} min-h-[80px] resize-y`}
            placeholder="Professional summary"
            value={headerDraft.summary}
            onChange={e => setHeaderDraft(d => ({ ...d, summary: e.target.value }))}
          />
        ) : (
          profile.summary && <p className="text-sm text-slate-300 leading-relaxed">{profile.summary}</p>
        )}
      </div>
    </div>
  );

  // ── Skills ─────────────────────────────────────────────────────────────────
  const skillsSection = (
    <Section icon={<Code size={14} />} title="Skills" editing={editingSection === 'skills'}
      onEdit={() => startEdit('skills')}
      onSave={() => save({ skills: skillsDraft.filter(Boolean) })}
      onCancel={cancelEdit}
    >
      {editingSection === 'skills' ? (
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {skillsDraft.map((s, i) => (
              <span key={i} className="flex items-center gap-1 text-xs bg-slate-700 text-slate-300 border border-slate-600 px-2.5 py-1 rounded-full">
                {s}
                <button onClick={() => setSkillsDraft(d => d.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400 ml-1"><X size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={smInp + ' flex-1'} placeholder="Add skill…" value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newSkill.trim()) { setSkillsDraft(d => [...d, newSkill.trim()]); setNewSkill(''); } }}
            />
            <button onClick={() => { if (newSkill.trim()) { setSkillsDraft(d => [...d, newSkill.trim()]); setNewSkill(''); } }}
              className="flex items-center gap-1 text-xs text-blue-400 border border-blue-500/30 rounded-lg px-2.5 py-1">
              <Plus size={11} /> Add
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((s, i) => (
            <span key={i} className="text-xs bg-slate-700/80 text-slate-300 border border-slate-600/50 px-2.5 py-1 rounded-full">{s}</span>
          ))}
        </div>
      )}
    </Section>
  );

  // ── Experience ─────────────────────────────────────────────────────────────
  const expSection = (
    <Section icon={<Briefcase size={14} />} title="Experience" editing={editingSection === 'experience'}
      onEdit={() => startEdit('experience')}
      onSave={() => save({ experience: expDraft })}
      onCancel={cancelEdit}
    >
      {editingSection === 'experience' ? (
        <div className="space-y-5">
          {expDraft.map((exp, i) => (
            <div key={i} className="border border-slate-700/50 rounded-xl p-3 space-y-2">
              <div className="flex gap-2">
                <input className={smInp + ' flex-1'} placeholder="Role" value={exp.role} onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} />
                <input className={smInp + ' flex-1'} placeholder="Company" value={exp.company} onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, company: e.target.value } : x))} />
                <input className={smInp + ' w-28'} placeholder="Duration" value={exp.duration} onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, duration: e.target.value } : x))} />
                <button onClick={() => setExpDraft(d => d.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><Trash2 size={13} /></button>
              </div>
              {exp.highlights.map((h, k) => (
                <div key={k} className="flex gap-2">
                  <input className={smInp + ' flex-1'} value={h} onChange={e => setExpDraft(d => d.map((x, j) => j === i ? { ...x, highlights: x.highlights.map((hh, l) => l === k ? e.target.value : hh) } : x))} />
                  <button onClick={() => setExpDraft(d => d.map((x, j) => j === i ? { ...x, highlights: x.highlights.filter((_, l) => l !== k) } : x))} className="text-slate-500 hover:text-red-400"><X size={11} /></button>
                </div>
              ))}
              <button onClick={() => setExpDraft(d => d.map((x, j) => j === i ? { ...x, highlights: [...x.highlights, ''] } : x))}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
                <Plus size={10} /> Add highlight
              </button>
            </div>
          ))}
          <button onClick={() => setExpDraft(d => [...d, { role: '', company: '', duration: '', highlights: [''] }])}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg px-3 py-1.5">
            <Plus size={11} /> Add role
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {profile.experience.map((exp, i) => (
            <div key={i} className={i < profile.experience.length - 1 ? 'pb-4 border-b border-slate-700/40' : ''}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-slate-200 font-semibold text-sm">{exp.role}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{exp.company}</p>
                </div>
                <span className="text-xs text-slate-500 shrink-0">{exp.duration}</span>
              </div>
              {exp.highlights?.length > 0 && (
                <ul className="mt-2 space-y-1 pl-3">
                  {exp.highlights.map((h, j) => (
                    <li key={j} className="text-xs text-slate-400 leading-relaxed flex gap-2">
                      <span className="text-slate-600 mt-1 shrink-0">•</span><span>{h}</span>
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

  // ── Projects ───────────────────────────────────────────────────────────────
  const projSection = (
    <Section icon={<FolderOpen size={14} />} title="Projects" editing={editingSection === 'projects'}
      onEdit={() => startEdit('projects')}
      onSave={() => save({ projects: projDraft })}
      onCancel={cancelEdit}
    >
      {editingSection === 'projects' ? (
        <div className="space-y-4">
          {projDraft.map((p, i) => (
            <div key={i} className="border border-slate-700/50 rounded-xl p-3 space-y-2">
              <div className="flex gap-2">
                <input className={smInp + ' flex-1'} placeholder="Project name" value={p.name} onChange={e => setProjDraft(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <button onClick={() => setProjDraft(d => d.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><Trash2 size={13} /></button>
              </div>
              <textarea className={smInp + ' w-full resize-none'} rows={2} placeholder="Description" value={p.description}
                onChange={e => setProjDraft(d => d.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
              <div className="flex flex-wrap gap-1.5">
                {p.technologies.map((t, k) => (
                  <span key={k} className="flex items-center gap-1 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                    {t}
                    <button onClick={() => setProjDraft(d => d.map((x, j) => j === i ? { ...x, technologies: x.technologies.filter((_, l) => l !== k) } : x))} className="text-indigo-400/50 hover:text-red-400 ml-0.5"><X size={9} /></button>
                  </span>
                ))}
                <input className={smInp + ' w-24'} placeholder="+ tech"
                  onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { const v = (e.target as HTMLInputElement).value.trim(); setProjDraft(d => d.map((x, j) => j === i ? { ...x, technologies: [...x.technologies, v] } : x)); (e.target as HTMLInputElement).value = ''; } }} />
              </div>
            </div>
          ))}
          <button onClick={() => setProjDraft(d => [...d, { name: '', description: '', technologies: [] }])}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg px-3 py-1.5">
            <Plus size={11} /> Add project
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {profile.projects.map((p, i) => (
            <div key={i} className={i < profile.projects.length - 1 ? 'pb-3 border-b border-slate-700/40' : ''}>
              <p className="text-slate-200 font-semibold text-sm">{p.name}</p>
              {p.description && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{p.description}</p>}
              {p.technologies?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {p.technologies.map((t, j) => (
                    <span key={j} className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );

  // ── Education ──────────────────────────────────────────────────────────────
  const eduSection = (
    <Section icon={<GraduationCap size={14} />} title="Education" editing={editingSection === 'education'}
      onEdit={() => startEdit('education')}
      onSave={() => save({ education: eduDraft })}
      onCancel={cancelEdit}
    >
      {editingSection === 'education' ? (
        <div className="space-y-3">
          {eduDraft.map((e, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className={smInp + ' flex-1'} placeholder="Degree" value={e.degree} onChange={ev => setEduDraft(d => d.map((x, j) => j === i ? { ...x, degree: ev.target.value } : x))} />
              <input className={smInp + ' flex-1'} placeholder="Institution" value={e.institution} onChange={ev => setEduDraft(d => d.map((x, j) => j === i ? { ...x, institution: ev.target.value } : x))} />
              <input className={smInp + ' w-20'} placeholder="Year" value={e.year} onChange={ev => setEduDraft(d => d.map((x, j) => j === i ? { ...x, year: ev.target.value } : x))} />
              <button onClick={() => setEduDraft(d => d.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><Trash2 size={13} /></button>
            </div>
          ))}
          <button onClick={() => setEduDraft(d => [...d, { degree: '', institution: '', year: '' }])}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg px-3 py-1.5">
            <Plus size={11} /> Add education
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {profile.education.map((e, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <div>
                <p className="text-slate-200 font-semibold text-sm">{e.degree}</p>
                <p className="text-slate-400 text-xs mt-0.5">{e.institution}</p>
              </div>
              <span className="text-xs text-slate-500 shrink-0">{e.year}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );

  // ── Achievements ───────────────────────────────────────────────────────────
  const achSection = (
    <Section icon={<Star size={14} />} title="Achievements" editing={editingSection === 'achievements'}
      onEdit={() => startEdit('achievements')}
      onSave={() => save({ achievements: achDraft.filter(Boolean) })}
      onCancel={cancelEdit}
    >
      {editingSection === 'achievements' ? (
        <div className="space-y-2">
          {achDraft.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input className={smInp + ' flex-1'} value={a} onChange={e => setAchDraft(d => d.map((x, j) => j === i ? e.target.value : x))} />
              <button onClick={() => setAchDraft(d => d.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><Trash2 size={13} /></button>
            </div>
          ))}
          <button onClick={() => setAchDraft(d => [...d, ''])}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg px-3 py-1.5">
            <Plus size={11} /> Add achievement
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {profile.achievements.map((a, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-400 leading-relaxed">
              <span className="text-yellow-500 mt-0.5 shrink-0">★</span><span>{a}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {headerSection}
        {profile.skills?.length > 0 || editingSection === 'skills' ? skillsSection : null}
        {profile.experience?.length > 0 || editingSection === 'experience' ? expSection : null}
        {profile.projects?.length > 0 || editingSection === 'projects' ? projSection : null}
        {profile.education?.length > 0 || editingSection === 'education' ? eduSection : null}
        {profile.achievements?.length > 0 || editingSection === 'achievements' ? achSection : null}
      </div>
    </div>
  );
}
