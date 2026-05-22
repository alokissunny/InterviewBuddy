const { Redis } = require('@upstash/redis');

const PREFIX = 'jc:';
const stats  = { hits: 0, misses: 0, staleHits: 0, sets: 0 };

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis       = (REDIS_URL && REDIS_TOKEN) ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

if (!redis) console.warn('[Cache] UPSTASH_REDIS_REST_URL / TOKEN not set — caching disabled, all requests will hit the source.');

// ── Core operations ────────────────────────────────────────────────────────

/**
 * Store a result in Upstash Redis.
 * @param {string} key
 * @param {*}      data
 * @param {number} freshTtlMs  — serve as fresh for this long
 * @param {number} staleTtlMs  — serve stale (SWR) for this additional duration
 */
async function setCache(key, data, freshTtlMs = 15 * 60 * 1000, staleTtlMs = 0) {
  if (!redis) return;
  const now   = Date.now();
  const entry = {
    data,
    expiresAt: now + freshTtlMs,
    staleAt:   now + freshTtlMs + staleTtlMs,
  };
  const ttlSecs = Math.ceil((freshTtlMs + staleTtlMs) / 1000);
  try {
    await redis.set(PREFIX + key, entry, { ex: ttlSecs });
    stats.sets++;
    console.log(`[Cache:Upstash] SET "${key.slice(0, 60)}" ttl=${ttlSecs}s`);
  } catch (err) {
    console.error('[Cache:Upstash] setCache failed:', err.message);
  }
}

/**
 * Get a cached result with staleness metadata.
 * Returns null if not found or fully expired.
 * Returns { data, isStale: false } if fresh.
 * Returns { data, isStale: true  } if stale but within staleTtl.
 */
async function getWithMeta(key) {
  if (!redis) { stats.misses++; return null; }
  try {
    const entry = await redis.get(PREFIX + key);
    if (!entry) { stats.misses++; return null; }

    const now = Date.now();
    if (now > entry.staleAt)   { stats.misses++;    return null; }
    if (now > entry.expiresAt) { stats.staleHits++; return { data: entry.data, isStale: true  }; }
    stats.hits++;
    return { data: entry.data, isStale: false };
  } catch (err) {
    console.error('[Cache:Upstash] getWithMeta failed:', err.message);
    stats.misses++;
    return null;
  }
}

/** Convenience wrapper — returns data or null. */
async function getCache(key) {
  const result = await getWithMeta(key);
  return result ? result.data : null;
}

function getCacheStats() {
  return { ...stats };
}

module.exports = { getCache, setCache, getWithMeta, getCacheStats };
