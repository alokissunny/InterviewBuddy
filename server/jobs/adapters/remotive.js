const { stripHtml, isoDate, relativeDate } = require('../utils');

const SOURCE = 'remotive';
const SOURCE_LABEL = 'Remotive';

function matchesKeywords(job, kw) {
  if (!kw) return true;
  const hay = `${job.title} ${job.company_name} ${(job.tags || []).join(' ')} ${job.category || ''}`.toLowerCase();
  // Require ALL words to match
  return kw.split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}

async function fetchRemotive({ keywords, location }) {
  const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keywords)}&limit=50`;

  console.log('\n[Jobs:Remotive] ─────────────────────────────');
  console.log('[Jobs:Remotive] Request:', { keywords, location });
  console.log('[Jobs:Remotive] URL:', url);

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  console.log('[Jobs:Remotive] HTTP status:', res.status);
  if (!res.ok) throw new Error(`Remotive returned ${res.status}`);

  const data = await res.json();
  const rawCount = (data.jobs || []).length;

  // Post-filter for relevance — Remotive's search is broad
  const kw = keywords.toLowerCase();
  const relevant = (data.jobs || []).filter(j => matchesKeywords(j, kw));

  console.log(`[Jobs:Remotive] Raw jobs: ${rawCount} → after keyword filter: ${relevant.length}`);
  if (relevant.length > 0) {
    console.log('[Jobs:Remotive] Sample titles:', relevant.slice(0, 3).map(j => j.title).join(' | '));
  }
  console.log('[Jobs:Remotive] ─────────────────────────────\n');

  return relevant.map(j => {
    const postedAtDate = isoDate(j.publication_date);
    return {
      id: `${SOURCE}:${j.id}`,
      source: SOURCE,
      sourceLabel: SOURCE_LABEL,
      title: j.title || '',
      company: j.company_name || '',
      location: j.candidate_required_location || 'Remote',
      remote: true,
      type: (j.job_type || '').replace(/_/g, ' '),
      salary: j.salary || '',
      description: stripHtml(j.description),
      tags: (j.tags || []).slice(0, 6),
      applyUrl: j.url || '',
      companyLogo: j.company_logo || '',
      postedAt: relativeDate(postedAtDate) || j.publication_date || '',
      postedAtDate,
    };
  });
}

module.exports = { fetchRemotive };
