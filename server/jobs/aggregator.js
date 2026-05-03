const { fetchLinkedIn } = require('./adapters/linkedin');
const { fetchRemotive } = require('./adapters/remotive');
const { fetchArbeitnow } = require('./adapters/arbeitnow');
const { fetchRemoteOK } = require('./adapters/remoteok');
const { dedupeJobs } = require('./dedupe');
const { getCache, setCache } = require('./cache');

const ADAPTERS = { linkedin: fetchLinkedIn, remotive: fetchRemotive, arbeitnow: fetchArbeitnow, remoteok: fetchRemoteOK };
const ALL_SOURCES = ['linkedin', 'remotive', 'arbeitnow', 'remoteok'];
const LINKEDIN_PAGE_SIZE = 25;
const NON_LINKEDIN_SOURCES = ['remotive', 'arbeitnow', 'remoteok'];

// Non-LinkedIn sources are fetched once and cached (they return their full matching set).
// LinkedIn is paginated separately because it uses an offset-based API.

async function fetchNonLinkedin(searchParams, requestedSources) {
  const sources = NON_LINKEDIN_SOURCES.filter(s => requestedSources.includes(s) && ADAPTERS[s]);
  const key = `nonli:${JSON.stringify({ ...searchParams, sources: [...sources].sort() })}`;

  const cached = getCache(key);
  if (cached) {
    console.log('[Jobs:Aggregator] non-LinkedIn cache hit');
    return cached;
  }

  const results = await Promise.allSettled(
    sources.map(source =>
      ADAPTERS[source](searchParams).then(r => {
        const jobs = Array.isArray(r) ? r : (r.jobs || []);
        return { source, jobs };
      })
    )
  );

  const jobs = [];
  const stats = {};
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { source, jobs: sJobs } = result.value;
      jobs.push(...sJobs);
      stats[source] = sJobs.length;
    } else {
      const idx = results.indexOf(result);
      console.error(`[Jobs:${sources[idx]}] failed:`, result.reason?.message);
      stats[sources[idx]] = 0;
    }
  }

  const data = { jobs, stats };
  setCache(key, data, 15 * 60 * 1000);
  return data;
}

async function aggregateJobs(params, requestedSources = ALL_SOURCES) {
  const { page = 0, ...searchParams } = params;
  const sources = requestedSources.filter(s => ADAPTERS[s]);
  const linkedinStart = page * LINKEDIN_PAGE_SIZE;

  // Fetch LinkedIn for this page
  let linkedinJobs = [];
  let linkedinCount = 0;
  let linkedinHasMore = false;
  if (sources.includes('linkedin')) {
    try {
      const r = await fetchLinkedIn({ ...searchParams, start: linkedinStart });
      linkedinJobs = Array.isArray(r) ? r : (r.jobs || []);
      linkedinHasMore = Array.isArray(r) ? false : (r.hasMore ?? false);
      linkedinCount = linkedinJobs.length;
      console.log(`[Jobs:LinkedIn] page=${page} start=${linkedinStart} → ${linkedinCount} jobs`);
    } catch (e) {
      console.error('[Jobs:LinkedIn] failed:', e.message);
    }
  }

  // Fetch non-LinkedIn sources (cached after first call)
  const { jobs: otherJobs, stats: otherStats } = sources.some(s => NON_LINKEDIN_SOURCES.includes(s))
    ? await fetchNonLinkedin(searchParams, sources)
    : { jobs: [], stats: {} };

  // On page > 0, skip non-LinkedIn jobs — client already has them from page 0
  const allJobs = [...linkedinJobs, ...(page === 0 ? otherJobs : [])];
  allJobs.sort((a, b) => {
    if (!a.postedAtDate && !b.postedAtDate) return 0;
    if (!a.postedAtDate) return 1;
    if (!b.postedAtDate) return -1;
    return b.postedAtDate.localeCompare(a.postedAtDate);
  });

  const jobs = dedupeJobs(allJobs);
  const sourceStats = { ...otherStats, ...(sources.includes('linkedin') ? { linkedin: linkedinCount } : {}) };

  console.log(`[Jobs:Aggregator] page=${page} → LinkedIn:${linkedinCount} + other:${otherJobs.length} → ${jobs.length} after dedup`);

  // Show Load More as long as LinkedIn returned any results this page.
  // Client hides the button when a Load More attempt returns 0 new jobs.
  const hasMore = linkedinJobs.length > 0;
  return { jobs, sourceStats, hasMore };
}

module.exports = { aggregateJobs, ALL_SOURCES };
