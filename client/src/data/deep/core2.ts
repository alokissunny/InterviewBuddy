import type { DeepSection } from '../interviewPrepData';

// ── 4. Caching ───────────────────────────────────────────────────────

export const CACHING: DeepSection[] = [
  {
    id: 'why-caching',
    title: 'Why Caching Exists',
    blocks: [
      { type: 'callout', kind: 'info', title: 'Core idea', text: 'A cache is a fast, temporary storage that holds copies of frequently-needed data. Instead of computing or fetching something slowly every time, you store the result and return it instantly. **The fundamental trade-off: memory (cheap) vs. latency (expensive).**' },
      { type: 'h', text: 'The Problem: Some Things Are Slow' },
      { type: 'code', code: `User requests "Top 10 trending products"
      │
      ▼
Server runs complex SQL query:
  SELECT products, COUNT(orders), AVG(rating)
  FROM products
  JOIN orders ON ...
  JOIN reviews ON ...
  ORDER BY ...
  LIMIT 10;
      │
      ▼
Database processes 50 million rows... (300ms)
      │
      ▼
Response returned (300ms total 😩)` },
      { type: 'p', text: 'If 1,000 users per second ask for this, you\'re running this expensive query 1,000 times per second.' },
      { type: 'h', text: 'The Solution: Cache It' },
      { type: 'code', code: `First request (cache miss):
  User ──► Server ──► Database (300ms) ──► Cache stores result ──► Response

Next 999 requests (cache hit):
  User ──► Server ──► Cache (1ms) ──► Response ✅

Total time saved: 999 × 299ms = ~5 minutes of DB query time, per second` },
    ],
  },
  {
    id: 'hierarchy',
    title: 'The Cache Hierarchy',
    blocks: [
      { type: 'p', text: 'Caches exist at multiple levels. The closer to the user, the faster (but the less capacity).' },
      { type: 'kv', title: 'Latency by cache layer', items: [
        { k: 'CPU Cache (L1/L2/L3)',          v: '~1 nanosecond' },
        { k: 'RAM / Application Cache',        v: '~100 nanoseconds' },
        { k: 'Redis / Memcached',              v: '~1 millisecond' },
        { k: 'CDN (Edge Cache)',               v: '~5–50 ms' },
        { k: 'Database',                        v: '~10–300 ms' },
      ]},
      { type: 'h', text: 'Where to Cache What' },
      { type: 'code', code: `Browser Cache    → Static assets: JS, CSS, images, fonts
CDN              → Static content delivered globally (videos, images)
Redis/Memcached  → DB query results, session tokens, computed data
In-app memory    → Config values, feature flags, lookup tables` },
    ],
  },
  {
    id: 'strategies',
    title: 'Cache Strategies — How to Fill the Cache',
    blocks: [
      { type: 'h', text: '1. Cache-Aside (Lazy Loading) — Most Common' },
      { type: 'p', text: 'The application checks the cache. On a miss, it fetches from DB and populates the cache.' },
      { type: 'code', lang: 'pseudocode', code: `function getProduct(id):
    value = cache.get("product:" + id)

    if value is null:        ← Cache MISS
        value = db.query("SELECT * FROM products WHERE id = ?", id)
        cache.set("product:" + id, value, ttl=3600)   ← fill cache

    return value             ← Cache HIT on next call` },
      { type: 'code', code: `Timeline:
  Request 1: Cache miss → DB query (slow) → fill cache
  Request 2: Cache hit → instant ✅
  Request 3: Cache hit → instant ✅
  ...
  (1 hour later, TTL expires)
  Request N: Cache miss → DB query (slow) → fill cache again` },
      { type: 'compare', aTitle: 'Pros', bTitle: 'Cons',
        aPoints: ['Only caches what\'s actually needed'],
        bPoints: ['First request is always slow', 'Cache can be stale up to TTL'],
      },
      { type: 'h', text: '2. Read-Through' },
      { type: 'p', text: 'Similar to cache-aside, but the **cache itself** fetches from the database on a miss (you never write the fill logic yourself).' },
      { type: 'code', code: `Application → Cache → (on miss) → Database → Cache → Application

Application never talks to DB directly.` },
      { type: 'h', text: '3. Write-Through' },
      { type: 'p', text: 'Every write to the database **also writes to the cache** simultaneously.' },
      { type: 'code', lang: 'pseudocode', code: `function updateProduct(id, data):
    db.update(id, data)               ← write to DB
    cache.set("product:" + id, data)  ← immediately update cache

Result: Cache is ALWAYS in sync with DB.` },
      { type: 'compare', aTitle: 'Pros', bTitle: 'Cons',
        aPoints: ['Cache is always consistent'],
        bPoints: ['Every write is slightly slower (two writes)', 'Cache fills with rarely-read data'],
      },
      { type: 'h', text: '4. Write-Behind (Write-Back)' },
      { type: 'p', text: 'Write to the cache first, return immediately to the user. Sync to the database **asynchronously** in the background.' },
      { type: 'code', code: `Write: App ────► Cache (immediate, fast)
                  └──► DB (async, a few ms/seconds later)

Read:  App ────► Cache (always fast)` },
      { type: 'callout', kind: 'tip', title: 'Use for', text: 'Shopping carts, like counts, view counts — where a brief inconsistency is acceptable.' },
    ],
  },
  {
    id: 'invalidation',
    title: 'Cache Invalidation — The Hard Part',
    blocks: [
      { type: 'callout', kind: 'info', text: '"There are only two hard things in computer science: cache invalidation and naming things." — Phil Karlton' },
      { type: 'p', text: 'Cache invalidation = deciding when cached data is stale and needs to be thrown away.' },
      { type: 'h', text: 'Strategy 1: TTL (Time-To-Live)' },
      { type: 'p', text: 'Set a maximum age for each cache entry. After that time, it expires automatically.' },
      { type: 'code', code: `cache.set("trending_products", data, ttl=300)  ← expires in 5 minutes

Timeline:
  T=0:   Cache filled  (fresh ✅)
  T=60:  Cache hit     (still fresh ✅)
  T=299: Cache hit     (slightly stale, but acceptable ✅)
  T=301: Cache miss    (expired, refetch from DB)` },
      { type: 'p', text: '**Choose TTL based on how often data changes:**' },
      { type: 'kv', items: [
        { k: 'User profile photo',     v: 'TTL = 1 hour' },
        { k: 'Stock price',            v: 'TTL = 1 second' },
        { k: 'Trending hashtags',      v: 'TTL = 5 min' },
        { k: 'Session token',          v: 'TTL = 30 min' },
      ]},
      { type: 'h', text: 'Strategy 2: Event-Based Invalidation' },
      { type: 'p', text: 'When data changes in the database, explicitly delete or update the cache entry.' },
      { type: 'code', lang: 'pseudocode', code: `function updateUserProfile(user_id, new_data):
    db.update(user_id, new_data)
    cache.delete("user:" + user_id)    ← explicitly invalidate

Next read will be a cache miss → refetch fresh data.` },
      { type: 'compare', aTitle: 'Pros', bTitle: 'Cons',
        aPoints: ['Cache is always up-to-date'],
        bPoints: ['You must remember to invalidate everywhere', 'Easy to miss a spot'],
      },
      { type: 'h', text: 'Strategy 3: Versioned Keys' },
      { type: 'p', text: 'Instead of invalidating, use a version number in the key. "Old" caches simply become orphaned.' },
      { type: 'code', code: `user_profile_v1_123 → "old data"
user_profile_v2_123 → "new data"   ← new version, new key

Application always reads the latest version key.
Old keys expire naturally via TTL.` },
      { type: 'p', text: '**Used for:** Static assets (JS/CSS with content hash in filename).' },
    ],
  },
  {
    id: 'eviction',
    title: 'Cache Eviction Policies',
    blocks: [
      { type: 'p', text: 'When a cache is full and needs to make room for new data, it uses an **eviction policy**:' },
      { type: 'code', code: `LRU  (Least Recently Used)    ← most common
  • Evict the item not accessed for the longest time
  • Great for "hot data stays, cold data leaves"

LFU  (Least Frequently Used)
  • Evict the item accessed least often
  • Great when access patterns are stable

FIFO (First In, First Out)
  • Evict the oldest item
  • Simple, but ignores access patterns

Random
  • Evict a random item
  • Simple, surprisingly effective in some cases` },
      { type: 'callout', kind: 'tip', text: '**LRU is the default choice** for most caching scenarios.' },
    ],
  },
  {
    id: 'failure-patterns',
    title: 'Common Failure Patterns',
    blocks: [
      { type: 'h', text: 'Cache Stampede (Thundering Herd)' },
      { type: 'callout', kind: 'pitfall', title: 'The problem', text: 'A popular cache entry expires. Suddenly 10,000 users all miss the cache at the same moment and all hit the database simultaneously.' },
      { type: 'code', code: `T=300: TTL expires for "top_products"
       10,000 simultaneous requests:
       ALL go to DB at once ──────────► Database overloads 💥` },
      { type: 'p', text: '**Solution:** Probabilistic early expiration or mutex locking.' },
      { type: 'code', lang: 'pseudocode', code: `# Only ONE process rebuilds the cache:
lock = acquire_lock("rebuild:top_products")
if lock acquired:
    value = db.query(...)
    cache.set("top_products", value)
    release_lock()
else:
    wait and retry` },
      { type: 'h', text: 'Cache Avalanche' },
      { type: 'callout', kind: 'pitfall', title: 'The problem', text: 'Many cache entries expire at the same time (e.g., all set at startup with the same TTL).' },
      { type: 'p', text: '**Solution:** Add **random jitter** to TTLs.' },
      { type: 'code', lang: 'pseudocode', code: `# Instead of:
cache.set(key, value, ttl=3600)

# Use:
cache.set(key, value, ttl=3600 + random(0, 300))
# Different entries expire at different times → smooth load` },
      { type: 'h', text: 'Cache Penetration' },
      { type: 'callout', kind: 'pitfall', title: 'The problem', text: 'Users query for non-existent data (e.g., user ID 99999999). Cache always misses → every query hits DB.' },
      { type: 'p', text: '**Solution:** Cache **null results** too.' },
      { type: 'code', lang: 'pseudocode', code: `value = db.query(user_id)
if value is null:
    cache.set("user:" + user_id, "NULL", ttl=60)  ← cache the miss!` },
    ],
  },
  {
    id: 'redis',
    title: 'Redis — The Most Popular Cache',
    blocks: [
      { type: 'p', text: 'Redis (Remote Dictionary Server) is the industry-standard caching tool.' },
      { type: 'h', text: 'Key features' },
      { type: 'ul', items: [
        'In-memory (microsecond latency)',
        'Supports strings, lists, sets, sorted sets, hashes, bitmaps',
        'Optional persistence (survives restarts)',
        'Pub/Sub messaging',
        'Atomic operations',
        '100,000+ operations per second on a single node',
      ]},
      { type: 'h', text: 'Common uses' },
      { type: 'code', lang: 'redis', code: `cache.set("user:123", user_json, ex=3600)   ← cache with TTL
cache.get("user:123")                        ← read cache
cache.incr("views:photo:456")               ← atomic counter
cache.zadd("leaderboard", score, user_id)   ← sorted set` },
    ],
  },
  {
    id: 'cdn',
    title: 'CDNs — Caching at the Edge',
    blocks: [
      { type: 'p', text: 'A **CDN (Content Delivery Network)** is a network of servers spread globally, each caching your static content close to users.' },
      { type: 'code', code: `Without CDN:
  User in Mumbai ─────────────────► Server in Virginia (200ms)

With CDN:
  User in Mumbai ──► CDN node in Mumbai (5ms) ✅` },
      { type: 'p', text: 'CDNs work by caching your content at **edge locations** — data centers near the user.' },
      { type: 'code', code: `Request flow:
  1. User requests image
  2. DNS routes to nearest CDN node
  3. CDN has it? → Serve immediately ✅
  4. CDN doesn't have it? → Fetch from origin, cache, serve

What CDNs cache:
  ✅ Images, videos, audio
  ✅ JavaScript, CSS files
  ✅ HTML pages (for static sites)
  ✅ API responses (carefully!)` },
      { type: 'h', text: 'CDN Cache-Control headers' },
      { type: 'p', text: 'These headers tell CDNs how long to keep things:' },
      { type: 'code', lang: 'http', code: `Cache-Control: public, max-age=86400   ← cache for 24 hours
Cache-Control: no-store                ← never cache (sensitive data)
Cache-Control: private, max-age=3600   ← only browser, not CDN` },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'Caching is almost always the right answer when asked **"how do you scale reads"**. Always mention **cache invalidation strategy** — it shows you understand the real complexity. Say "I\'d use Redis with a TTL of X and cache-aside strategy" — be specific. For static content: "I\'d put it behind a CDN" — instant credibility. Mention **cache stampede** prevention for high-traffic systems.' },
    ],
  },
];

// ── 5. Sharding ──────────────────────────────────────────────────────

export const SHARDING: DeepSection[] = [
  {
    id: 'problem',
    title: 'The Problem Sharding Solves',
    blocks: [
      { type: 'callout', kind: 'info', title: 'Core idea', text: 'When a single database becomes too large or too slow, split the data across multiple machines — each machine holds a *slice* (a shard). Together, they hold everything.' },
      { type: 'callout', kind: 'warn', text: 'Sharding adds enormous complexity. It\'s a last resort.' },
      { type: 'h', text: 'The Library Analogy' },
      { type: 'p', text: 'Imagine a library that starts with 1,000 books. One building, one librarian. Easy.' },
      { type: 'p', text: 'Over years, the library grows to 100 million books. Problems:' },
      { type: 'ul', items: [
        'One building can\'t physically hold 100 million books',
        'One librarian can\'t serve 1 million visitors per day',
        'If the building burns down, everything is lost',
      ]},
      { type: 'p', text: 'Solution: **Open more buildings, split the books**.' },
      { type: 'code', code: `Building A: Books A–F  (about 16 million books)
Building B: Books G–M  (about 16 million books)
Building C: Books N–S  (about 16 million books)
Building D: Books T–Z  (about 16 million books)` },
      { type: 'p', text: 'When a visitor wants a book, they go to the right building. This is sharding.' },
    ],
  },
  {
    id: 'what-is-shard',
    title: 'What is a Shard?',
    blocks: [
      { type: 'p', text: 'A **shard** is one piece of a sharded database. Each shard is a fully independent database (its own server, its own disk), holds a **subset** of the total data, and can be replicated for redundancy.' },
      { type: 'code', code: `Without sharding:
┌────────────────────────────────────┐
│  DB Server (one machine)           │
│  Users table: 500 million rows     │  ← too slow, too big 😩
│  Storage: 50 TB                    │
└────────────────────────────────────┘

With sharding (4 shards):
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Shard 1     │  │  Shard 2     │  │  Shard 3     │  │  Shard 4     │
│  Users 0–24% │  │  Users 25–49%│  │  Users 50–74%│  │  Users 75–99%│
│  125M rows   │  │  125M rows   │  │  125M rows   │  │  125M rows   │
│  12.5 TB     │  │  12.5 TB     │  │  12.5 TB     │  │  12.5 TB     │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘` },
      { type: 'ul', items: [
        '✅ Each server handles 1/4 the queries',
        '✅ Each server stores 1/4 the data',
        '✅ Failure of one shard affects only 1/4 of users',
      ]},
    ],
  },
  {
    id: 'strategies',
    title: 'Sharding Strategies',
    blocks: [
      { type: 'p', text: 'The key question: **which shard does a given piece of data go to?**' },
      { type: 'h', text: '1. Range-Based Sharding' },
      { type: 'p', text: 'Divide data by a continuous range of values.' },
      { type: 'code', code: `Shard 1: User IDs 1 → 1,000,000
Shard 2: User IDs 1,000,001 → 2,000,000
Shard 3: User IDs 2,000,001 → 3,000,000
Shard 4: User IDs 3,000,001 → 4,000,000

Or by date:
Shard 1: Orders from Jan 2024
Shard 2: Orders from Feb 2024
...` },
      { type: 'compare', aTitle: 'Pros', bTitle: 'Cons',
        aPoints: [
          'Simple to understand',
          'Range queries are fast (e.g., "all orders in Q1" → 3 shards only)',
          'Easy to add new ranges',
        ],
        bPoints: [
          '**Hot shards:** New users all land on the latest shard',
          'Uneven data distribution if some ranges are larger',
        ],
      },
      { type: 'callout', kind: 'pitfall', title: 'Hot shard example', text: 'Jan shard: 5,000 orders (slow month). Dec shard: 500,000 orders (holiday rush). The Dec shard is overloaded while others sit idle.' },
      { type: 'h', text: '2. Hash-Based Sharding' },
      { type: 'p', text: 'Run the key through a **hash function** to determine the shard.' },
      { type: 'code', code: `shard_number = hash(user_id) % number_of_shards

Examples (with 4 shards):
  hash(user_1234)   % 4 = 2  → Shard 2
  hash(user_5678)   % 4 = 0  → Shard 0
  hash(user_9999)   % 4 = 3  → Shard 3
  hash(user_10000)  % 4 = 1  → Shard 1` },
      { type: 'compare', aTitle: 'Pros', bTitle: 'Cons',
        aPoints: ['Data distributes evenly (no hot shards)', 'Simple routing logic'],
        bPoints: [
          '**Reshuffling nightmare:** changing N rehashes ~75% of keys',
          'Range queries span all shards',
        ],
      },
      { type: 'h', text: '3. Directory-Based Sharding' },
      { type: 'p', text: 'Maintain a **lookup table** that maps each key (or range) to a specific shard.' },
      { type: 'code', code: `Lookup Service:
┌──────────────┬────────┐
│ Key Range    │ Shard  │
├──────────────┼────────┤
│ Users A–D    │ Shard1 │
│ Users E–L    │ Shard2 │
│ Users M–R    │ Shard3 │
│ Users S–Z    │ Shard4 │
└──────────────┴────────┘` },
      { type: 'compare', aTitle: 'Pros', bTitle: 'Cons',
        aPoints: [
          'Extremely flexible (rebalance by editing the table)',
          'Can assign VIP users to better hardware',
        ],
        bPoints: [
          'Lookup service is a **single point of failure**',
          'Lookup service must itself be scaled and replicated',
        ],
      },
      { type: 'h', text: '4. Geographic Sharding' },
      { type: 'p', text: 'Route users to the shard in their geographic region.' },
      { type: 'code', code: `User in India  → India shard (servers in Mumbai/Delhi)
User in EU     → EU shard    (servers in Frankfurt)
User in USA    → US shard    (servers in Virginia)` },
      { type: 'compare', aTitle: 'Pros', bTitle: 'Cons',
        aPoints: ['Low latency (data physically near user)', 'Data sovereignty compliance'],
        bPoints: ['Cross-region queries are slow', 'Uneven distribution by population'],
      },
    ],
  },
  {
    id: 'pain-points',
    title: 'The Pain Points of Sharding',
    blocks: [
      { type: 'p', text: 'Sharding is powerful but introduces serious complexity. Know these problems before you shard.' },
      { type: 'h', text: 'Problem 1: Cross-Shard Queries' },
      { type: 'p', text: 'Some queries naturally span multiple shards.' },
      { type: 'code', code: `Query: "Find all users who signed up in January 2026"

Without sharding:
  SELECT * FROM users WHERE signup_month = 'January 2026';
  → One query, instant

With hash-based sharding:
  → Must query ALL 10 shards, then merge results
  → 10× more work, complex merge logic` },
      { type: 'callout', kind: 'tip', text: 'Avoid cross-shard queries in hot paths. Design your sharding key to match your most common queries.' },
      { type: 'h', text: 'Problem 2: Cross-Shard Transactions' },
      { type: 'p', text: 'Database transactions (all-or-nothing operations) become very hard across shards.' },
      { type: 'code', code: `Transfer $100 from User A (Shard 1) to User B (Shard 3):
  1. Deduct $100 from User A on Shard 1
  2. Add $100 to User B on Shard 3

What if step 2 fails? Money is lost! 😱

Solution: Distributed transactions (2-Phase Commit)
✗ Complex, slow, and error-prone
✗ Most systems avoid this entirely by design` },
      { type: 'callout', kind: 'tip', text: 'Choose a sharding key that keeps related data on the same shard.' },
      { type: 'h', text: 'Problem 3: Rebalancing' },
      { type: 'p', text: 'When you add a new shard, you must move data around — while serving live traffic.' },
      { type: 'code', code: `Going from 4 shards to 5 shards:
  Old:  hash(id) % 4
  New:  hash(id) % 5

~75% of keys need to migrate to different shards.
You must do this live, without downtime. 😬` },
      { type: 'p', text: '**Solutions:** Consistent Hashing (minimizes reshuffling), gradual migration (copy data, switch traffic, delete old copy).' },
      { type: 'h', text: 'Problem 4: Choosing the Wrong Shard Key' },
      { type: 'p', text: 'The most important decision. A bad shard key causes all traffic to hit one shard.' },
      { type: 'code', code: `Bad shard key: "status" (active/inactive)
  → 99% of traffic hits "active" shard 😱 (all users are active!)

Bad shard key: "country" for a small country
  → Australia shard: 25M users
  → India shard: 1.4B users 😱

Good shard key: user_id (random-ish, high cardinality)
  → Distributes evenly across shards ✅` },
      { type: 'p', text: '**Ideal shard key properties:** High cardinality, evenly distributed, frequently used in queries, doesn\'t change over time.' },
    ],
  },
  {
    id: 'replication-vs-sharding',
    title: 'Replication vs Sharding',
    blocks: [
      { type: 'p', text: 'These are often confused. They solve different problems.' },
      { type: 'code', code: `REPLICATION → for availability and read scaling
  Primary ──► Replica 1
          ──► Replica 2
          ──► Replica 3

Same data on all nodes.
Reads can go to any replica (scales reads).
Writes only go to primary.
If primary fails, a replica takes over.

SHARDING → for capacity and write scaling
  Shard 1 (data A–F)
  Shard 2 (data G–M)
  Shard 3 (data N–Z)

Different data on each shard.
All shards serve reads AND writes.
Each shard handles a fraction of the total load.` },
      { type: 'p', text: 'In practice, most large systems use **both**:' },
      { type: 'code', code: `Shard 1 ──► Shard 1 Replica
Shard 2 ──► Shard 2 Replica
Shard 3 ──► Shard 3 Replica

Sharding handles scale.
Replication handles availability.` },
    ],
  },
  {
    id: 'before-you-shard',
    title: 'Before You Shard — Try These First',
    blocks: [
      { type: 'p', text: 'Sharding should be the **last resort**. First try:' },
      { type: 'ol', items: [
        '**Vertical Scaling** — Upgrade to bigger machine. Often delays sharding by years. Simple, no code changes.',
        '**Read Replicas** — Offload reads to replicas. Primary only handles writes.',
        '**Caching** — 90% of reads might be cacheable. Use Redis.',
        '**Better Indexing** — Slow query? Maybe it just needs an index.',
        '**Archive Old Data** — Move 3-year-old orders to cold storage.',
        '**Denormalization** — Pre-compute expensive aggregations.',
        'Then, if you\'ve done all this and still need more: **Shard** — finally, this.',
      ]},
    ],
  },
  {
    id: 'instagram-example',
    title: 'Real-World Sharding Example',
    blocks: [
      { type: 'p', text: '**Instagram\'s photo storage:**' },
      { type: 'code', code: `Sharding key: (user_id, photo_id) — combined

Why?
  1. High cardinality: billions of user + photo combinations
  2. The most common query is "get photos for user X" — stays on one shard
  3. Distributes evenly across shards

What goes on one shard:
  All photos by one user → fast user profile queries ✅

What crosses shards:
  "Popular photos this week" → scatter-gather across all shards
  → This is expensive, so Instagram runs it as a batch job, not real-time` },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'If asked "how do you scale the database?" — Start with caching + read replicas, then mention sharding. Always specify your **sharding key** and justify it. Mention the trade-offs: "cross-shard queries become expensive". Combine with consistent hashing for extra credit. "I\'d shard on user_id to keep a user\'s data co-located" is a great answer.' },
    ],
  },
];

// ── 6. Consistent Hashing ────────────────────────────────────────────

export const CONSISTENT_HASHING: DeepSection[] = [
  {
    id: 'the-problem',
    title: 'The Problem with Regular Hashing',
    blocks: [
      { type: 'callout', kind: 'info', title: 'Core idea', text: 'Regular hashing breaks when you add or remove servers — almost all data needs to move. Consistent hashing puts servers and data on a "ring" so that only a tiny fraction of data moves when the cluster changes.' },
      { type: 'h', text: 'The Setup' },
      { type: 'p', text: 'Imagine you have 3 cache servers and you want to know which server to cache each key on:' },
      { type: 'code', code: `shard = hash(key) % 3

hash("user_123")  % 3 = 1  → Server 1
hash("user_456")  % 3 = 2  → Server 2
hash("user_789")  % 3 = 0  → Server 0` },
      { type: 'p', text: 'Simple! Works great... until something changes.' },
      { type: 'h', text: 'Adding a Server' },
      { type: 'p', text: 'Your system grows and you add a 4th server:' },
      { type: 'code', code: `Before: hash(key) % 3
After:  hash(key) % 4    ← different divisor!` },
      { type: 'p', text: 'Let\'s see what happens to our keys:' },
      { type: 'table', headers: ['Key', 'Old (% 3)', 'New (% 4)', 'Changed?'], rows: [
        ['"user_123"',    '1',  '3',  '❌ yes — moved!'],
        ['"user_456"',    '2',  '0',  '❌ yes — moved!'],
        ['"user_789"',    '0',  '1',  '❌ yes — moved!'],
        ['"product_99"',  '2',  '3',  '❌ yes — moved!'],
        ['"order_55"',    '0',  '3',  '❌ yes — moved!'],
      ]},
      { type: 'p', text: 'Almost **every single key** maps to a different server! You now need to move ~75% of all cached data — during which many cache misses hammer the database. Large systems can take hours to rebalance — outage risk. This is catastrophic.' },
    ],
  },
  {
    id: 'the-ring',
    title: 'The Ring — How Consistent Hashing Works',
    blocks: [
      { type: 'h', text: 'The Key Insight' },
      { type: 'p', text: 'Instead of `hash(key) % N` (which changes when N changes), we place both **keys** and **servers** on a fixed ring from 0 to 360°.' },
      { type: 'code', code: `                  0° / 360°
                     ↓
              ⭢              ⭢
         ⭢                        ⭢
       ⭢                            ⭢
         ⭢                        ⭢
              ⭢              ⭢
                     ↓
                  180°

The ring has positions from 0 to 360 (or 0 to 2^32 — same idea).` },
      { type: 'h', text: 'Placing Servers on the Ring' },
      { type: 'p', text: 'Hash each server\'s name (or IP) to get its position on the ring:' },
      { type: 'code', code: `hash("Server_A") = 60°   → placed at position 60°
hash("Server_B") = 150°  → placed at position 150°
hash("Server_C") = 270°  → placed at position 270°` },
      { type: 'h', text: 'Finding Which Server Owns a Key' },
      { type: 'p', text: 'Hash the key to get its ring position. Then travel **clockwise** until you hit a server.' },
      { type: 'code', code: `hash("user_123")   = 80°   → clockwise → hits Server_B (150°)
hash("user_456")   = 200°  → clockwise → hits Server_C (270°)
hash("product_99") = 310°  → clockwise → wraps around → hits Server_A (60°)` },
      { type: 'callout', kind: 'tip', text: '**The rule:** A server "owns" all ring positions between itself and the previous server (going clockwise).' },
      { type: 'code', code: `Server_A (60°)  owns:  270° → 360° → 0° → 60°
Server_B (150°) owns:  60°  → 150°
Server_C (270°) owns:  150° → 270°` },
    ],
  },
  {
    id: 'adding-node',
    title: 'Adding a Node',
    blocks: [
      { type: 'p', text: 'Now let\'s add **Server_D at 120°**:' },
      { type: 'code', code: `Before:
  60°(A) ──── 150°(B) ──── 270°(C) ──── back to 60°(A)

After:
  60°(A) ──── 120°(D) ──── 150°(B) ──── 270°(C) ──── back to 60°(A)` },
      { type: 'p', text: 'What changes? Only data between 60° and 120° (previously owned by Server_B) now moves to Server_D.' },
      { type: 'code', code: `Keys in range 60°–120°  → move from Server_B → Server_D
All other keys          → stay exactly where they are ✅

Fraction of data moved = (120° - 60°) / 360° ≈ 17%
                        (vs ~75% with regular hashing!)` },
      { type: 'callout', kind: 'tip', title: 'Why this is huge', text: 'Adding capacity barely disrupts the cluster. Only the slice covered by the new server migrates. Everything else: untouched.' },
    ],
  },
  {
    id: 'removing-node',
    title: 'Removing a Node',
    blocks: [
      { type: 'p', text: 'Server_B fails at 150°:' },
      { type: 'code', code: `Before: A(60°) ── B(150°) ── C(270°)
After:  A(60°) ── C(270°)

Server_B's data (60°–150°) is reassigned to... Server_C (next clockwise).
That's the only data that needs to move.` },
    ],
  },
  {
    id: 'virtual-nodes',
    title: 'Virtual Nodes — For Even Distribution',
    blocks: [
      { type: 'p', text: 'There\'s a subtle problem: if servers end up clustered on the ring, some will handle much more data than others.' },
      { type: 'code', code: `Bad distribution (servers clustered):
  A(10°) ── B(20°) ── C(30°) ── [gap of 330°] ── back to A

Server A owns 330° of the ring! B and C own only 10° each.
A gets ~92% of all traffic. 😱` },
      { type: 'p', text: '**Virtual nodes** solve this: each physical server gets **multiple positions** on the ring.' },
      { type: 'code', code: `Physical Server A → placed at 30°, 120°, 240°  (3 virtual nodes)
Physical Server B → placed at 80°, 170°, 300°  (3 virtual nodes)
Physical Server C → placed at 50°, 200°, 330°  (3 virtual nodes)

Ring:
  30°(A)  50°(C)  80°(B)  120°(A)  170°(B)  200°(C)  240°(A)  300°(B)  330°(C)` },
      { type: 'p', text: 'Now each server owns roughly 1/3 of the ring, regardless of the initial hash values.' },
      { type: 'kv', title: 'Typical production values', items: [
        { k: 'Small cluster',   v: '100–150 vnodes/server' },
        { k: 'Large cluster',   v: '200+ vnodes/server' },
      ]},
      { type: 'p', text: '**Weighted Virtual Nodes:** Larger/more powerful servers get more virtual nodes — they own more of the ring — handle more traffic.' },
      { type: 'code', code: `Server A (16-core, 64GB RAM) → 300 virtual nodes (30% of ring)
Server B (8-core,  32GB RAM) → 150 virtual nodes (15% of ring)
Server C (8-core,  32GB RAM) → 150 virtual nodes (15% of ring)` },
    ],
  },
  {
    id: 'real-world',
    title: 'Real-World Uses',
    blocks: [
      { type: 'h', text: 'Amazon DynamoDB' },
      { type: 'p', text: 'DynamoDB uses consistent hashing to distribute data across its storage nodes. When you add capacity, only a fraction of data moves — the system scales seamlessly without downtime.' },
      { type: 'h', text: 'Apache Cassandra' },
      { type: 'p', text: 'Cassandra places each row on a ring based on its partition key. The ring position determines which node(s) store the row. Adding a new node means only neighboring data migrates.' },
      { type: 'h', text: 'Redis Cluster' },
      { type: 'p', text: 'Redis Cluster uses 16,384 "hash slots" arranged in a consistent-hash-like pattern. Nodes own ranges of slots. Resharding = moving some slots between nodes, not a full rehash.' },
      { type: 'h', text: 'Content Delivery Networks (CDNs)' },
      { type: 'p', text: 'CDNs use consistent hashing to decide which edge server caches each piece of content. When a new edge server is added to a region, it takes over a portion of nearby keys from its neighbor.' },
    ],
  },
  {
    id: 'summary',
    title: 'Summary: Regular vs Consistent Hashing',
    blocks: [
      { type: 'table', headers: ['Property', 'Regular Hashing', 'Consistent Hashing'], rows: [
        ['Formula',              '`hash(k) % N`',        'clockwise on ring'],
        ['When N changes',       '~75% remapped',         '~1/N remapped'],
        ['Adding a server',      'massive disruption',    'only neighbors affected'],
        ['Removing a server',    'massive disruption',    'only neighbors affected'],
        ['Even distribution',    'yes (by default)',      'needs virtual nodes'],
        ['Complexity',           'simple',                'moderate'],
      ]},
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'Mention consistent hashing when discussing **cache clustering** or **database sharding**. "I\'d use consistent hashing so adding nodes doesn\'t invalidate most of the cache." Virtual nodes show deeper understanding — worth mentioning. Amazon DynamoDB, Cassandra, and Redis Cluster all use this — name-dropping is fine. Connect to sharding: "I\'d combine consistent hashing with my shard routing."' },
    ],
  },
];
