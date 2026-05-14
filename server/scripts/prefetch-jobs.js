/**
 * Prefetch script — warms the job cache for high-priority roles every 24 h.
 *
 * Run standalone:   node server/scripts/prefetch-jobs.js
 * System cron:      0 6 * * * node /absolute/path/server/scripts/prefetch-jobs.js
 * Auto-scheduled:   imported by server/index.js on startup
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { fetchLinkedInApify } = require('../jobs/adapters/linkedin-apify');

const ROLES = [
  'Senior Engineering Manager',
  'Director of Engineering',
];

const LOCATION    = 'India';
const DATE_POSTED = 'Past 24 hours';
const PAGE_SIZE   = 20;
const TARGET_JOBS = 100;                         // fetch up to 100 jobs per role
const PAGES       = Math.ceil(TARGET_JOBS / PAGE_SIZE);   // = 5 pages

async function prefetchRole(role) {
  console.log(`[Prefetch] ── "${role}" ──────────────────────────────`);
  const allJobs = [];

  for (let page = 0; page < PAGES; page++) {
    const start = page * PAGE_SIZE;
    try {
      const result = await fetchLinkedInApify({
        keywords:   role,
        location:   LOCATION,
        datePosted: DATE_POSTED,
        start,
      });

      const jobs = Array.isArray(result) ? result : (result.jobs || []);
      allJobs.push(...jobs);

      const cacheStatus = result.cacheStatus || 'miss';
      console.log(`[Prefetch]   page ${page + 1}/${PAGES}  start=${start}  got=${jobs.length}  total=${allJobs.length}  cache=${cacheStatus}`);

      // Stop early if Apify returned fewer jobs than a full page
      if (jobs.length < PAGE_SIZE || !result.hasMore) {
        console.log(`[Prefetch]   No more results after page ${page + 1}`);
        break;
      }

      // Small pause between pages to avoid hammering Apify back-to-back
      if (page < PAGES - 1) await sleep(2000);
    } catch (err) {
      console.error(`[Prefetch]   page ${page + 1} FAILED: ${err.message}`);
      break;
    }
  }

  console.log(`[Prefetch] "${role}" complete — ${allJobs.length} jobs cached`);
  return allJobs;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const startedAt = new Date();
  console.log(`\n[Prefetch] ════════════════════════════════════════════`);
  console.log(`[Prefetch] Starting  ${startedAt.toISOString()}`);
  console.log(`[Prefetch] Roles     ${ROLES.join(', ')}`);
  console.log(`[Prefetch] Filters   location="${LOCATION}"  datePosted="${DATE_POSTED}"`);
  console.log(`[Prefetch] Pages     ${PAGES} × ${PAGE_SIZE} = up to ${TARGET_JOBS} jobs per role`);
  console.log(`[Prefetch] ════════════════════════════════════════════`);

  const summary = [];

  for (const role of ROLES) {
    const jobs = await prefetchRole(role);
    summary.push({ role, count: jobs.length });
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\n[Prefetch] ════ Summary ═══════════════════════════════`);
  summary.forEach(s => console.log(`[Prefetch]   ${s.count.toString().padStart(3)} jobs  "${s.role}"`));
  console.log(`[Prefetch] Done in ${elapsed}s`);
  console.log(`[Prefetch] ════════════════════════════════════════════\n`);

  return summary;
}

// Run immediately when called directly
if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Prefetch] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { run };
