const cheerio = require('cheerio');

const JOB_TYPE_MAP = { 'full-time': 'F', 'part-time': 'P', 'contract': 'C', 'temporary': 'T', 'internship': 'I' };
const EXP_LEVEL_MAP = { 'internship': '1', 'entry-level': '2', 'associate': '3', 'mid-senior': '4', 'director': '5', 'executive': '6' };
const DATE_POSTED_MAP = { 'Past 24 hours': 'r86400', 'Past Week': 'r604800', 'Past Month': 'r2592000' };

const PAGE_SIZE = 25;
const SOURCE = 'linkedin';
const SOURCE_LABEL = 'LinkedIn';

async function fetchLinkedIn({ keywords, location, jobType, experienceLevel, datePosted, start = 0 }) {
  const params = new URLSearchParams({ keywords, start: String(start), count: String(PAGE_SIZE), sortBy: 'DD' });
  if (location) params.set('location', location);
  if (jobType && JOB_TYPE_MAP[jobType]) params.set('f_JT', JOB_TYPE_MAP[jobType]);
  if (experienceLevel && EXP_LEVEL_MAP[experienceLevel]) params.set('f_E', EXP_LEVEL_MAP[experienceLevel]);
  if (datePosted && DATE_POSTED_MAP[datePosted]) params.set('f_TPR', DATE_POSTED_MAP[datePosted]);

  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`;
  console.log('[Jobs:LinkedIn] scraping:', url);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });

  if (!res.ok) throw new Error(`LinkedIn returned ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs = [];
  $('li').each((_, el) => {
    const card = $(el);
    const urn = card.find('[data-entity-urn]').attr('data-entity-urn') || '';
    const sourceId = urn.split(':').pop() || String(Math.random());
    const title = card.find('.base-search-card__title').text().trim();
    const company = card.find('.base-search-card__subtitle').text().trim();
    const location = card.find('.job-search-card__location').text().trim();
    const timeEl = card.find('time');
    const postedAtDate = timeEl.attr('datetime') || '';
    const postedAt = timeEl.text().trim()
      || card.find('.job-search-card__listdate').text().trim()
      || postedAtDate;
    const applyUrl = card.find('a.base-card__full-link').attr('href') || '';
    const companyLogo = card.find('img.artdeco-entity-image').attr('data-delayed-url')
      || card.find('img').attr('src') || '';
    const remote = /remote/i.test(location);

    if (title) jobs.push({
      id: `${SOURCE}:${sourceId}`,
      source: SOURCE,
      sourceLabel: SOURCE_LABEL,
      title,
      company,
      location,
      remote,
      applyUrl,
      companyLogo,
      postedAt,
      postedAtDate,
    });
  });

  jobs.sort((a, b) => {
    if (!a.postedAtDate && !b.postedAtDate) return 0;
    if (!a.postedAtDate) return 1;
    if (!b.postedAtDate) return -1;
    return b.postedAtDate.localeCompare(a.postedAtDate);
  });

  return { jobs, hasMore: jobs.length >= PAGE_SIZE };
}

module.exports = { fetchLinkedIn };
