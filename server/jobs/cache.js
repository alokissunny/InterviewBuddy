const store = new Map();

function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { store.delete(key); return null; }
  return entry.data;
}

function setCache(key, data, ttlMs = 15 * 60 * 1000) {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

module.exports = { getCache, setCache };
