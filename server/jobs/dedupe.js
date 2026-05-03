const SOURCE_PRIORITY = { linkedin: 1, remotive: 2, arbeitnow: 3, remoteok: 4 };

const STOP_WORDS = new Set(['senior', 'junior', 'lead', 'jr', 'sr', 'the', 'a', 'an', 'and', 'or', 'of', 'at', 'in']);

function fingerprint(job) {
  const company = (job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const title = (job.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w && !STOP_WORDS.has(w))
    .sort()
    .join('-');
  return `${company}::${title}`;
}

function dedupeJobs(jobs) {
  const seen = new Map();
  for (const job of jobs) {
    const fp = fingerprint(job);
    const existing = seen.get(fp);
    if (!existing) {
      seen.set(fp, job);
    } else {
      const ep = SOURCE_PRIORITY[existing.source] ?? 99;
      const np = SOURCE_PRIORITY[job.source] ?? 99;
      if (np < ep) seen.set(fp, job);
    }
  }
  return [...seen.values()];
}

module.exports = { dedupeJobs };
