const { stripHtml, isoDate, relativeDate } = require('../utils');

const SOURCE = 'arbeitnow';
const SOURCE_LABEL = 'Arbeitnow';

function matchesKeywords(job, kw) {
  if (!kw) return true;
  const hay = `${job.title} ${job.company_name} ${(job.tags || []).join(' ')}`.toLowerCase();
  // Require ALL words to match
  return kw.split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}

function matchesLocation(job, loc) {
  if (!loc) return true;
  return (job.location || '').toLowerCase().includes(loc.toLowerCase())
    || /remote/i.test(job.location || '');
}

async function fetchArbeitnow({ keywords, location }) {
  // Note: Arbeitnow public API ignores search/location params — returns full board.
  // We apply keyword + location filtering client-side after fetching.
  const url = 'https://www.arbeitnow.com/api/job-board-api';

  console.log('\n[Jobs:Arbeitnow] ─────────────────────────────');
  console.log('[Jobs:Arbeitnow] Request:', { keywords, location });
  console.log('[Jobs:Arbeitnow] URL:', url);

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  console.log('[Jobs:Arbeitnow] HTTP status:', res.status);
  if (!res.ok) throw new Error(`Arbeitnow returned ${res.status}`);

  const data = await res.json();
  const rawCount = (data.data || []).length;

  const kw = keywords.toLowerCase();
  const relevant = (data.data || []).filter(j =>
    matchesKeywords(j, kw) && matchesLocation(j, location)
  ).slice(0, 20);

  console.log(`[Jobs:Arbeitnow] Raw jobs: ${rawCount} → after filter: ${relevant.length}`);
  if (relevant.length > 0) {
    console.log('[Jobs:Arbeitnow] Sample titles:', relevant.slice(0, 3).map(j => j.title).join(' | '));
  }
  console.log('[Jobs:Arbeitnow] ─────────────────────────────\n');

  return relevant.map(j => {
    const postedAtDate = j.created_at
      ? isoDate(new Date(j.created_at * 1000).toISOString())
      : '';
    return {
      id: `${SOURCE}:${j.slug || String(Math.random())}`,
      source: SOURCE,
      sourceLabel: SOURCE_LABEL,
      title: j.title || '',
      company: j.company_name || '',
      location: j.location || 'Remote',
      remote: !!j.remote,
      type: j.job_types?.[0] || '',
      description: stripHtml(j.description),
      tags: (j.tags || []).slice(0, 6),
      applyUrl: j.url || '',
      companyLogo: j.company_logo || '',
      postedAt: relativeDate(postedAtDate) || '',
      postedAtDate,
    };
  });
}

module.exports = { fetchArbeitnow };
