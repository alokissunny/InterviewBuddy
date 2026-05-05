const { fetchLinkedInApify, PAGE_SIZE: APIFY_PAGE_SIZE } = require('./adapters/linkedin-apify');
const { fetchLinkedIn,    PAGE_SIZE: SCRAPER_PAGE_SIZE } = require('./adapters/linkedin');
const { dedupeJobs } = require('./dedupe');

const ALL_SOURCES = ['linkedin'];

// Use the local scraper in development (fast, no Apify cost).
// Use the Apify actor in production (bypasses LinkedIn bot detection).
const isDev = process.env.NODE_ENV !== 'production';
const fetchLinkedInJobs = isDev ? fetchLinkedIn : fetchLinkedInApify;
const PAGE_SIZE         = isDev ? SCRAPER_PAGE_SIZE : APIFY_PAGE_SIZE;

console.log(`[Jobs:Aggregator] LinkedIn source: ${isDev ? 'scraper (dev)' : 'Apify (prod)'}`);

async function aggregateJobs(params) {
  const { page = 0, ...searchParams } = params;
  const linkedinStart = page * PAGE_SIZE;

  let linkedinJobs = [];
  let linkedinCount = 0;
  try {
    const r = await fetchLinkedInJobs({ ...searchParams, start: linkedinStart });
    linkedinJobs = Array.isArray(r) ? r : (r.jobs || []);
    linkedinCount = linkedinJobs.length;
    console.log(`[Jobs:Aggregator] page=${page} start=${linkedinStart} → ${linkedinCount} LinkedIn jobs (${isDev ? 'scraper' : 'Apify'})`);
  } catch (e) {
    console.error('[Jobs:Aggregator] LinkedIn fetch failed:', e.message);
  }

  const jobs = dedupeJobs(linkedinJobs);
  return { jobs, sourceStats: { linkedin: linkedinCount }, hasMore: linkedinCount > 0 };
}

module.exports = { aggregateJobs, ALL_SOURCES };
