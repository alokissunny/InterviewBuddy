const { stripHtml, isoDate, relativeDate, formatSalary } = require('../utils');

const SOURCE = 'remoteok';
const SOURCE_LABEL = 'RemoteOK';

async function fetchRemoteOK({ keywords }) {
  // Use tag-based URL for server-side filtering, then post-filter for precision
  const tag = encodeURIComponent(keywords.toLowerCase().replace(/\s+/g, '-'));
  const url = `https://remoteok.com/api?tag=${tag}`;

  console.log('\n[Jobs:RemoteOK] ─────────────────────────────');
  console.log('[Jobs:RemoteOK] Request:', { keywords });
  console.log('[Jobs:RemoteOK] URL:', url);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; InterviewCopilot/1.0)',
      Accept: 'application/json',
    },
  });
  console.log('[Jobs:RemoteOK] HTTP status:', res.status);
  if (!res.ok) throw new Error(`RemoteOK returned ${res.status}`);

  const data = await res.json();
  const rawJobs = (Array.isArray(data) ? data : []).filter(j => j.id && j.position);

  // Require ALL words to appear somewhere in title, company, or tags
  const kw = keywords.toLowerCase();
  const words = kw.split(/\s+/).filter(Boolean);
  const relevant = rawJobs.filter(j => {
    const hay = `${j.position} ${j.company} ${(j.tags || []).join(' ')}`.toLowerCase();
    return words.every(w => hay.includes(w));
  }).slice(0, 20);

  console.log(`[Jobs:RemoteOK] Raw jobs: ${rawJobs.length} → after keyword filter: ${relevant.length}`);
  if (relevant.length > 0) {
    console.log('[Jobs:RemoteOK] Sample titles:', relevant.slice(0, 3).map(j => j.position).join(' | '));
  }
  console.log('[Jobs:RemoteOK] ─────────────────────────────\n');

  return relevant.map(j => {
    const postedAtDate = j.date ? isoDate(new Date(j.date * 1000).toISOString()) : '';
    return {
      id: `${SOURCE}:${j.id}`,
      source: SOURCE,
      sourceLabel: SOURCE_LABEL,
      title: j.position || '',
      company: j.company || '',
      location: 'Remote',
      remote: true,
      salary: formatSalary(j.salary_min, j.salary_max),
      description: stripHtml(j.description),
      tags: (j.tags || []).slice(0, 6),
      applyUrl: j.apply_url || j.url || `https://remoteok.com/remote-jobs/${j.id}`,
      companyLogo: j.company_logo || '',
      postedAt: relativeDate(postedAtDate) || '',
      postedAtDate,
    };
  });
}

module.exports = { fetchRemoteOK };
