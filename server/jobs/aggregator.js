const { fetchLinkedInApify, PAGE_SIZE: LINKEDIN_PAGE_SIZE } = require('./adapters/linkedin-apify');
const { dedupeJobs } = require('./dedupe');

const ALL_SOURCES = ['linkedin'];

async function aggregateJobs(params) {
  const { page = 0, ...searchParams } = params;
  const linkedinStart = page * LINKEDIN_PAGE_SIZE;

  let linkedinJobs = [];
  let linkedinCount = 0;
  try {
    const r = await fetchLinkedInApify({ ...searchParams, start: linkedinStart });
    linkedinJobs = Array.isArray(r) ? r : (r.jobs || []);
    linkedinCount = linkedinJobs.length;
    console.log(`[Jobs:Aggregator] page=${page} start=${linkedinStart} → ${linkedinCount} LinkedIn jobs`);
  } catch (e) {
    console.error('[Jobs:Aggregator] LinkedIn fetch failed:', e.message);
  }

  const jobs = dedupeJobs(linkedinJobs);
  return { jobs, sourceStats: { linkedin: linkedinCount }, hasMore: linkedinCount > 0 };
}

module.exports = { aggregateJobs, ALL_SOURCES };
