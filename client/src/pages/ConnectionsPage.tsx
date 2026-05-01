import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Upload, Search, X, Users, Briefcase, Code2, UserCheck, Building2, ChevronDown, AlertCircle } from 'lucide-react';
import { Connection, ConnectionCard } from '../components/ConnectionCard';
import { CandidateProfile } from '../types';

const STORAGE_KEY = 'interview_copilot_connections';
const PAGE_SIZE = 50;

// Keywords for each category
const CATEGORIES: Record<string, string[]> = {
  recruiters:  ['recruiter', 'talent', 'sourcer', 'staffing', 'hiring', 'headhunter', 'acquisition'],
  engineers:   ['engineer', 'developer', 'programmer', 'architect', 'devops', 'sre', 'fullstack', 'frontend', 'backend', 'mobile', 'data scientist', 'ml engineer', 'ai engineer'],
  managers:    ['manager', 'director', 'vp ', 'vice president', 'head of', 'chief', 'cto', 'ceo', 'cpo', 'lead'],
  hr:          ['hr', 'human resource', 'people ops', 'people partner', 'people & culture', 'culture'],
};

const FILTER_OPTIONS = [
  { id: 'all',        label: 'All',        icon: <Users size={13} /> },
  { id: 'recruiters', label: 'Recruiters', icon: <UserCheck size={13} /> },
  { id: 'engineers',  label: 'Engineers',  icon: <Code2 size={13} /> },
  { id: 'managers',   label: 'Leadership', icon: <Briefcase size={13} /> },
  { id: 'hr',         label: 'HR / People',icon: <Building2 size={13} /> },
];

function matchesCategory(position: string, category: string): boolean {
  if (category === 'all') return true;
  const pos = position.toLowerCase();
  return (CATEGORIES[category] || []).some(kw => pos.includes(kw));
}

function parseCSVRow(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { values.push(current); current = ''; }
    else { current += ch; }
  }
  values.push(current);
  return values;
}

function parseLinkedInCSV(text: string): Connection[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headerIdx = lines.findIndex(l => /^"?first name"?/i.test(l.trim()));
  if (headerIdx === -1) throw new Error('Could not find header row. Make sure this is a LinkedIn connections export.');

  const headers = parseCSVRow(lines[headerIdx]).map(h => h.replace(/"/g, '').trim().toLowerCase());
  const connections: Connection[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseCSVRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] ?? '').replace(/"/g, '').trim(); });

    const firstName = row['first name'] || '';
    const lastName  = row['last name']  || '';
    if (!firstName && !lastName) continue;

    connections.push({
      id: String(i),
      firstName,
      lastName,
      email:       row['email address'] || '',
      company:     row['company']        || '',
      position:    row['position']       || '',
      connectedOn: row['connected on']   || '',
      url:         row['url']            || '',
    });
  }
  return connections;
}

function loadStored(): Connection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function ConnectionsPage({ userProfile }: { userProfile: CandidateProfile }) {
  const [connections, setConnections] = useState<Connection[]>(() => loadStored());
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseLinkedInCSV(e.target?.result as string);
        if (!parsed.length) throw new Error('No connections found in the file.');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        setConnections(parsed);
        setSearch('');
        setActiveFilter('all');
        setVisibleCount(PAGE_SIZE);
      } catch (err: any) {
        setParseError(err.message);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return connections.filter(c => {
      const matchesSearch = !q || `${c.firstName} ${c.lastName} ${c.company} ${c.position}`.toLowerCase().includes(q);
      const matchesFilter = matchesCategory(c.position, activeFilter);
      return matchesSearch && matchesFilter;
    });
  }, [connections, search, activeFilter]);

  // Stats per category
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: connections.length };
    for (const cat of Object.keys(CATEGORIES)) {
      result[cat] = connections.filter(c => matchesCategory(c.position, cat)).length;
    }
    return result;
  }, [connections]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Upload / empty state
  if (!connections.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#F3F2EF] p-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#EEF3F8] flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-[#0A66C2]" />
            </div>
            <h2 className="text-gray-900 font-bold text-xl">Import LinkedIn Connections</h2>
            <p className="text-gray-500 text-sm mt-2">Upload your connections.csv to browse and filter your network</p>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragging ? 'border-[#0A66C2] bg-[#EEF3F8]' : 'border-gray-300 bg-white hover:border-[#0A66C2]/50 hover:bg-[#EEF3F8]/40'
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            <Upload size={32} className={`mx-auto mb-4 ${isDragging ? 'text-[#0A66C2]' : 'text-gray-400'}`} />
            <p className="text-gray-700 font-semibold">Drop connections.csv here</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
          </div>

          {parseError && (
            <div className="flex items-start gap-3 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{parseError}</p>
            </div>
          )}

          <div className="mt-6 p-4 bg-white border border-gray-200 rounded-xl">
            <p className="text-gray-700 font-medium text-sm mb-2">How to export from LinkedIn:</p>
            <ol className="text-gray-500 text-xs space-y-1.5 list-decimal pl-4">
              <li>Go to <strong className="text-gray-700">linkedin.com/mynetwork/invite-connect/connections/</strong></li>
              <li>Click <strong className="text-gray-700">Manage my network</strong> → <strong className="text-gray-700">Connections</strong></li>
              <li>Top right: click the <strong className="text-gray-700">⚙ settings</strong> icon</li>
              <li>Select <strong className="text-gray-700">Export connections</strong> → <strong className="text-gray-700">Request archive</strong></li>
              <li>Download the file and upload the <strong className="text-gray-700">connections.csv</strong> here</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F3F2EF]">
      {/* Search + filter bar */}
      <div className="shrink-0 px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex gap-3 items-center flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
              placeholder="Search by name, company, or role…"
              className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-300 focus:border-[#0A66C2] rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f.id}
                onClick={() => { setActiveFilter(f.id); setVisibleCount(PAGE_SIZE); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  activeFilter === f.id
                    ? 'bg-[#0A66C2] text-white border-[#0A66C2] shadow-sm'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-[#0A66C2]/50 hover:text-[#0A66C2]'
                }`}
              >
                {f.icon}
                {f.label}
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs ${activeFilter === f.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {counts[f.id] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Re-upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-xl transition-colors bg-white"
          >
            <Upload size={13} /> Replace file
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <Users size={40} className="opacity-30" />
            <p className="text-sm">No connections match your filters</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {filtered.length} connection{filtered.length !== 1 ? 's' : ''}
              {activeFilter !== 'all' ? ` · ${FILTER_OPTIONS.find(f => f.id === activeFilter)?.label}` : ''}
              {search ? ` matching "${search}"` : ''}
            </p>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map(c => <ConnectionCard key={c.id} connection={c} userProfile={userProfile} />)}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-5">
                <button
                  onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 text-sm font-medium rounded-xl transition-colors shadow-sm"
                >
                  <ChevronDown size={14} />
                  Show more ({filtered.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
