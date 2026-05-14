const { fetchLinkedInApify, PAGE_SIZE: APIFY_PAGE_SIZE } = require('./adapters/linkedin-apify');
const { fetchLinkedIn,    PAGE_SIZE: SCRAPER_PAGE_SIZE } = require('./adapters/linkedin');
const { dedupeJobs } = require('./dedupe');

const ALL_SOURCES = ['linkedin'];

// Use Apify when APIFY_API_TOKEN is set (works both locally and in prod).
// Fall back to local cheerio scraper when no token is available.
const hasApifyToken    = !!process.env.APIFY_API_TOKEN;
const fetchLinkedInJobs = hasApifyToken ? fetchLinkedInApify : fetchLinkedIn;
const PAGE_SIZE         = hasApifyToken ? APIFY_PAGE_SIZE   : SCRAPER_PAGE_SIZE;

console.log(`[Jobs:Aggregator] LinkedIn source: ${hasApifyToken ? 'Apify' : 'scraper (no token)'}`);

async function aggregateJobs(params) {
  const { page = 0, ...searchParams } = params;
  const linkedinStart = page * PAGE_SIZE;

  let linkedinJobs  = [];
  let linkedinCount = 0;
  let cacheStatus   = 'miss';
  try {
    const r    = await fetchLinkedInJobs({ ...searchParams, start: linkedinStart });
    linkedinJobs  = Array.isArray(r) ? r : (r.jobs || []);
    linkedinCount = linkedinJobs.length;
    cacheStatus   = r.cacheStatus || 'miss';
    console.log(`[Jobs:Aggregator] page=${page} → ${linkedinCount} jobs  cache=${cacheStatus}  source=${hasApifyToken ? 'Apify' : 'scraper'}`);
  } catch (e) {
    console.error('[Jobs:Aggregator] LinkedIn fetch failed:', e.message);
  }

  const jobs = dedupeJobs(linkedinJobs);
  return { jobs, sourceStats: { linkedin: linkedinCount }, hasMore: linkedinCount > 0, cacheStatus };
}

module.exports = { aggregateJobs, ALL_SOURCES };
