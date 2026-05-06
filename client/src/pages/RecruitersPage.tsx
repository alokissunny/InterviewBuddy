import React, { useState, useCallback } from 'react';
import { Search, Loader2, AlertCircle, Users, Key, ChevronDown } from 'lucide-react';
import { RecruiterCard, Recruiter } from '../components/RecruiterCard';

const LI_AT_KEY = 'jobcracker_li_at';
const PAGE_SIZE = 10;

export function RecruitersPage() {
  const [liAt, setLiAt] = useState(() => localStorage.getItem(LI_AT_KEY) || '');
  const [cookieDraft, setCookieDraft] = useState('');
  const [showSetup, setShowSetup] = useState(() => !localStorage.getItem(LI_AT_KEY));

  const [keywords, setKeywords] = useState('recruiter');
  const [location, setLocation] = useState('');

  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [start, setStart] = useState(0);
  const [searched, setSearched] = useState(false);

  const doFetch = useCallback(async (startOffset: number, append: boolean) => {
    if (!liAt) { setShowSetup(true); return; }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ keywords, location, start: String(startOffset) });
      const resp = await fetch(`/api/recruiters/search?${params}`, {
        headers: { 'x-li-at': liAt },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `LinkedIn returned ${resp.status}`);
      setRecruiters(prev => append ? [...prev, ...data.recruiters] : data.recruiters);
      setHasMore(data.hasMore);
      setStart(startOffset + PAGE_SIZE);
      setSearched(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [liAt, keywords, location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setRecruiters([]);
    doFetch(0, false);
  };

  const handleSaveCookie = () => {
    const val = cookieDraft.trim();
    if (!val) return;
    localStorage.setItem(LI_AT_KEY, val);
    setLiAt(val);
    setCookieDraft('');
    setShowSetup(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <form onSubmit={handleSearch} className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="Keywords (e.g. recruiter, talent acquisition)"
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 focus:border-[#4F46E5] rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors"
            />
          </div>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-44 px-3 py-2.5 bg-gray-50 border border-gray-300 focus:border-[#4F46E5] rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !liAt}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && !recruiters.length ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowSetup(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl transition-colors"
          >
            <Key size={14} />
            {liAt ? 'Change Cookie' : 'Set Cookie'}
          </button>
        </form>
      </div>

      {/* Cookie setup */}
      {showSetup && (
        <div className="mx-6 mt-4 shrink-0 p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <div className="flex items-start gap-3">
            <Key size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-amber-600 font-semibold text-sm mb-1">LinkedIn Session Cookie Required</h3>
              <p className="text-gray-600 text-xs mb-3 leading-relaxed">
                Connection degree filtering (1st &amp; 2nd) requires your LinkedIn <code className="bg-gray-100 px-1.5 py-0.5 rounded text-amber-600 font-mono">li_at</code> session cookie.
                It never leaves your machine — only sent to your local server.
              </p>
              <ol className="text-gray-500 text-xs space-y-1 mb-3 list-decimal pl-4">
                <li>Log in to <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="text-[#4F46E5] hover:underline">linkedin.com</a></li>
                <li>Open DevTools (F12) → Application tab → Cookies → <strong className="text-gray-700">www.linkedin.com</strong></li>
                <li>Find the <code className="bg-gray-100 px-1 rounded text-amber-600 font-mono">li_at</code> row and copy its Value</li>
                <li>Paste it below and click Save</li>
              </ol>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Paste li_at value here…"
                  value={cookieDraft}
                  onChange={e => setCookieDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveCookie()}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 focus:border-amber-500/60 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none"
                />
                <button
                  onClick={handleSaveCookie}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Save
                </button>
                {liAt && (
                  <button
                    onClick={() => setShowSetup(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl mb-4">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-500 font-medium text-sm">Search failed</p>
              <p className="text-gray-500 text-xs mt-1">{error}</p>
              {error.includes('401') || error.includes('cookie') ? (
                <button onClick={() => setShowSetup(true)} className="text-amber-600 text-xs hover:underline mt-1">
                  Update your li_at cookie →
                </button>
              ) : null}
            </div>
          </div>
        )}

        {!liAt && !searched && (
          <EmptyState icon={<Key size={40} />} text="Set your LinkedIn cookie above to search recruiters in your network" />
        )}

        {liAt && !searched && !loading && !error && (
          <EmptyState icon={<Users size={40} />} text="Search for recruiters in your 1st & 2nd degree connections" />
        )}

        {recruiters.length > 0 && (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {recruiters.length} recruiter{recruiters.length !== 1 ? 's' : ''} · filtered to 1st &amp; 2nd connections
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              {recruiters.map(r => <RecruiterCard key={r.id} recruiter={r} />)}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-5">
                <button
                  onClick={() => doFetch(start, true)}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                  Load More
                </button>
              </div>
            )}
          </>
        )}

        {searched && recruiters.length === 0 && !loading && !error && (
          <EmptyState icon={<Users size={40} />} text="No recruiters found. Try different keywords or check your cookie." />
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm text-center max-w-xs">{text}</p>
    </div>
  );
}
