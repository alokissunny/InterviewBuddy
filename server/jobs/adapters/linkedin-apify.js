// Uses Apify "⚡️Rapid LinkedIn Jobs Scraper" actor (worldunboxer/rapid-linkedin-scraper)
// Async-run pattern: start run → poll until SUCCEEDED → fetch dataset items
//
// Confirmed input schema:
//   job_title       : search keywords / job title
//   location        : location string
//   experience_level: LinkedIn f_E code ("1"–"6")
//   job_type        : LinkedIn f_JT code ("F","P","C","T","I")
//   job_post_time   : LinkedIn f_TPR code ("r86400","r604800","r2592000")
//   jobs_entries    : how many jobs to return
//   start_jobs      : pagination offset
//
// Output fields: job_id, job_title, company_name, location, job_url, apply_url,
//   company_logo_url, time_posted, salary_range, employment_type, seniority_level

const { getCache, setCache } = require('../cache');

// In-flight deduplication: if two identical requests arrive before the first
// Apify run completes, the second awaits the same Promise instead of starting
// a new run. This is what prevents the duplicate entry in the Apify dashboard.
const inFlight = new Map();

const ACTOR_ID      = 'worldunboxer~rapid-linkedin-scraper';
const PAGE_SIZE     = 20;
const SOURCE        = 'linkedin';
const SOURCE_LABEL  = 'LinkedIn';
const CACHE_TTL_MS  = 5 * 60 * 1000;   // 5 min — deduplicates React StrictMode double-calls too

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS      = 180000;        // 3 min max wait

const JOB_TYPE_MAP = {
  'full-time': 'F', 'part-time': 'P', 'contract': 'C', 'temporary': 'T', 'internship': 'I',
};
const DATE_POSTED_MAP = {
  'Past 24 hours': 'r86400', 'Past Week': 'r604800', 'Past Month': 'r2592000',
};
const EXP_LEVEL_MAP = {
  'internship': '1', 'entry-level': '2', 'associate': '3',
  'mid-senior': '4', 'director': '5', 'executive': '6',
};

// "2 hours ago", "3 days ago" → ISO date string for sorting
function parseRelativeDate(timePosted) {
  if (!timePosted || timePosted === 'None') return '';
  const match = timePosted.toLowerCase().match(/(\d+)\s+(second|minute|hour|day|week|month)/);
  if (!match) return '';
  const n = parseInt(match[1], 10);
  const ms = { second: 1e3, minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6 }[match[2]] || 0;
  return new Date(Date.now() - n * ms).toISOString().slice(0, 10);
}

function normaliseJob(item) {
  const id       = item.job_id || String(Math.random()).slice(2);
  const location = item.location || '';
  return {
    id:             `${SOURCE}:${id}`,
    source:         SOURCE,
    sourceLabel:    SOURCE_LABEL,
    title:          item.job_title    || '',
    company:        item.company_name || '',
    location,
    remote:         /remote/i.test(location),
    applyUrl:       item.apply_url    || item.job_url || '',
    companyLogo:    item.company_logo_url || '',
    postedAt:       item.time_posted  || '',
    postedAtDate:   parseRelativeDate(item.time_posted),
    salary:         (item.salary_range && item.salary_range !== 'None') ? item.salary_range : '',
    jobType:        item.employment_type  || '',
    seniorityLevel: item.seniority_level  || '',
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function _doFetch({ keywords, location, jobType, experienceLevel, datePosted, start, apiToken }) {
  const base = `https://api.apify.com/v2`;

  // Build actor input using named fields (not searchUrl)
  const actorInput = {
    job_title:   keywords   || '',
    location:    location   || '',
    jobs_entries: PAGE_SIZE,
    start_jobs:  start,
  };
  if (experienceLevel && EXP_LEVEL_MAP[experienceLevel]) {
    actorInput.experience_level = EXP_LEVEL_MAP[experienceLevel];
  }
  if (jobType && JOB_TYPE_MAP[jobType]) {
    actorInput.job_type = JOB_TYPE_MAP[jobType];
  }
  if (datePosted && DATE_POSTED_MAP[datePosted]) {
    actorInput.job_post_time = DATE_POSTED_MAP[datePosted];
  }

  console.log('\n[LinkedIn-Apify] ═══════════════════════════════════════');
  console.log(`[LinkedIn-Apify] actor      : ${ACTOR_ID}`);
  console.log(`[LinkedIn-Apify] Input      :`, JSON.stringify(actorInput, null, 2));

  // ── 1. Start run asynchronously ──────────────────────────────────────────
  const startUrl = `${base}/acts/${ACTOR_ID}/runs?token=${apiToken}`;

  console.log(`[LinkedIn-Apify] Starting run → POST /acts/${ACTOR_ID}/runs`);

  const startRes = await fetch(startUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(actorInput),
  });

  if (!startRes.ok) {
    const errText = await startRes.text().catch(() => '');
    console.error(`[LinkedIn-Apify] Failed to start run: HTTP ${startRes.status}`, errText.slice(0, 300));
    throw new Error(`Apify start run failed ${startRes.status}: ${errText.slice(0, 150)}`);
  }

  const startData = await startRes.json();
  const runId        = startData?.data?.id;
  const initialStatus = startData?.data?.status;
  let datasetId      = startData?.data?.defaultDatasetId;
  console.log(`[LinkedIn-Apify] Run started: id=${runId}  status=${initialStatus}  dataset=${datasetId}`);

  if (!runId) throw new Error('Apify did not return a run ID');

  // ── 2. Poll until terminal status ────────────────────────────────────────
  const pollUrl  = `${base}/acts/${ACTOR_ID}/runs/${runId}?token=${apiToken}`;
  const deadline = Date.now() + MAX_WAIT_MS;
  let status     = initialStatus;
  let pollCount  = 0;

  while (!['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED'].includes(status)) {
    if (Date.now() >= deadline) {
      console.warn(`[LinkedIn-Apify] Polling deadline (${MAX_WAIT_MS / 1000}s) reached after ${pollCount} polls — giving up`);
      break;
    }
    await sleep(POLL_INTERVAL_MS);
    pollCount++;

    const pollRes = await fetch(pollUrl);
    if (!pollRes.ok) {
      console.warn(`[LinkedIn-Apify] Poll ${pollCount}: HTTP ${pollRes.status} — will retry`);
      continue;
    }
    const pollData = await pollRes.json();
    status    = pollData?.data?.status;
    datasetId = pollData?.data?.defaultDatasetId || datasetId;
    const elapsedSec = Math.round((Date.now() - (deadline - MAX_WAIT_MS)) / 1000);
    console.log(`[LinkedIn-Apify] Poll ${pollCount} (+${elapsedSec}s): status=${status}  dataset=${datasetId}`);
  }

  console.log(`[LinkedIn-Apify] Run finished: status=${status} after ${pollCount} polls`);

  if (status !== 'SUCCEEDED') {
    console.error(`[LinkedIn-Apify] Run did not succeed (status=${status}) — returning empty result`);
    return { jobs: [], hasMore: false };
  }

  // ── 3. Fetch dataset items ────────────────────────────────────────────────
  const itemsUrl = `${base}/datasets/${datasetId}/items?token=${apiToken}&limit=${PAGE_SIZE}&offset=0`;
  console.log(`[LinkedIn-Apify] Fetching dataset → GET /datasets/${datasetId}/items?limit=${PAGE_SIZE}`);

  const itemsRes = await fetch(itemsUrl);
  if (!itemsRes.ok) {
    const errText = await itemsRes.text().catch(() => '');
    console.error(`[LinkedIn-Apify] Dataset fetch failed: HTTP ${itemsRes.status}`, errText.slice(0, 200));
    throw new Error(`Apify dataset fetch failed ${itemsRes.status}`);
  }

  const items    = await itemsRes.json();
  const rawCount = Array.isArray(items) ? items.length : 0;
  console.log(`[LinkedIn-Apify] Dataset returned ${rawCount} raw items`);

  if (!rawCount) {
    console.log('[LinkedIn-Apify] No items in dataset — returning empty');
    console.log('[LinkedIn-Apify] ═══════════════════════════════════════\n');
    return { jobs: [], hasMore: false };
  }

  const jobs = items.map(normaliseJob).filter(j => j.title);
  console.log(`[LinkedIn-Apify] Normalised → ${jobs.length} valid jobs`);
  console.log(`[LinkedIn-Apify] Sample: "${jobs[0]?.title}" @ "${jobs[0]?.company}" (${jobs[0]?.location})`);
  console.log('[LinkedIn-Apify] ═══════════════════════════════════════\n');

  return { jobs, hasMore: rawCount >= PAGE_SIZE };
}

async function fetchLinkedInApify({ keywords, location, jobType, experienceLevel, datePosted, start = 0 }) {
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) throw new Error('APIFY_API_TOKEN not set');

  const cacheKey = `linkedin-apify:${JSON.stringify({ keywords, location, jobType, experienceLevel, datePosted, start })}`;

  // 1. Completed-result cache (5 min TTL)
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`[LinkedIn-Apify] Cache HIT — returning cached result`);
    return cached;
  }

  // 2. In-flight deduplication — if the same request is already running,
  //    await its Promise instead of starting a second Apify run
  if (inFlight.has(cacheKey)) {
    console.log(`[LinkedIn-Apify] In-flight HIT — awaiting existing run`);
    return inFlight.get(cacheKey);
  }

  const promise = _doFetch({ keywords, location, jobType, experienceLevel, datePosted, start, apiToken })
    .then(result => {
      setCache(cacheKey, result, CACHE_TTL_MS);
      return result;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, promise);
  return promise;
}

module.exports = { fetchLinkedInApify, PAGE_SIZE };
