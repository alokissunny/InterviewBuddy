// ─────────────────────────────────────────────────────────────────────
// System Design Interview Question Breakdowns
// Quirky tone. Animated architecture diagrams. Real engineering.
// ─────────────────────────────────────────────────────────────────────

export type NodeKind =
  | 'client' | 'cdn' | 'lb' | 'api'
  | 'service' | 'queue' | 'cache' | 'db'
  | 'storage' | 'search' | 'stream' | 'external';

export interface ArchNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** Optional sub-label shown small under the title */
  sub?: string;
}

export interface ArchEdge {
  from: string;
  to: string;
  label?: string;
  /** Render a dashed/return arrow (e.g. cache miss flow back) */
  dashed?: boolean;
}

export interface ArchDiagram {
  /** Layers laid out left → right. Each layer is rendered as a vertical column. */
  layers: ArchNode[][];
  edges: ArchEdge[];
}

export type QDifficulty = 'easy' | 'medium' | 'hard';

export interface SystemDesignQuestion {
  id: string;
  title: string;
  /** Quirky one-liner */
  tagline: string;
  /** The actual prompt, the way an interviewer would say it */
  prompt: string;
  difficulty: QDifficulty;
  /** Cute emoji that shows on the card */
  emoji: string;
  functional: string[];
  nonFunctional: string[];
  capacity?: { label: string; value: string }[];
  diagram: ArchDiagram;
  /** Step-by-step walkthrough the way you'd whiteboard it */
  walkthrough: { title: string; body: string }[];
  /** "Hot takes" — the spicy deep-dive decisions */
  deepDives: { title: string; body: string }[];
  tradeoffs: string[];
  /** A one-line "if you only remember one thing…" closer */
  punchline: string;
}

// ─────────────────────────────────────────────────────────────────────
// QUESTIONS
// ─────────────────────────────────────────────────────────────────────

export const QUESTIONS: SystemDesignQuestion[] = [
  // 1
  {
    id: 'bitly',
    title: 'Bitly / URL Shortener',
    emoji: '🔗',
    tagline: 'Take a URL the size of a CVS receipt, return one the size of a tweet.',
    prompt: 'Design a URL shortening service like Bitly or TinyURL.',
    difficulty: 'easy',
    functional: [
      'Shorten a long URL → return a short code',
      'Redirect short code → original URL',
      '(Bonus) Custom aliases',
      '(Bonus) Click analytics',
    ],
    nonFunctional: [
      'Redirect latency < 100 ms (p99)',
      '100:1 read-to-write ratio',
      '99.99% availability — broken short links are a meme',
      'URLs are immutable once created',
    ],
    capacity: [
      { label: 'New URLs / day', value: '100M' },
      { label: 'Reads / day',    value: '10B' },
      { label: 'Storage / 5y',   value: '~100 GB (tiny)' },
      { label: 'Peak QPS',       value: '~200k reads' },
    ],
    diagram: {
      layers: [
        [{ id: 'user', label: 'User', kind: 'client' }],
        [{ id: 'cdn', label: 'CDN / Edge', kind: 'cdn' }],
        [{ id: 'api', label: 'API Gateway', kind: 'api' }],
        [
          { id: 'shorten', label: 'Shorten Svc', kind: 'service' },
          { id: 'redirect', label: 'Redirect Svc', kind: 'service' },
        ],
        [
          { id: 'cache', label: 'Redis', kind: 'cache', sub: 'hot codes' },
          { id: 'db', label: 'KV Store', kind: 'db', sub: 'code → url' },
        ],
      ],
      edges: [
        { from: 'user', to: 'cdn' },
        { from: 'cdn', to: 'api', label: 'miss' },
        { from: 'api', to: 'shorten', label: 'POST' },
        { from: 'api', to: 'redirect', label: 'GET' },
        { from: 'shorten', to: 'db', label: 'write' },
        { from: 'redirect', to: 'cache', label: 'lookup' },
        { from: 'cache', to: 'db', dashed: true, label: 'miss' },
      ],
    },
    walkthrough: [
      { title: '1. Pick your short code generator', body: 'Counter-based (base62 of an auto-increment id) is collision-free and clean. Hash-based (MD5(url)[:7]) is stateless but you handle collisions. Pre-generated pool is fastest at write time.' },
      { title: '2. Store it small', body: 'Schema is essentially (short_code PK, long_url, created_at, owner_id). A KV store like DynamoDB or even Postgres with a unique index works perfectly.' },
      { title: '3. Read path = cache everything', body: 'Redirects are 10B/day → cache hot codes in Redis with a fat TTL. Cache hit ratio of 95%+ is normal. Redis can do this on one node.' },
      { title: '4. Redirect with HTTP 301 vs 302', body: '301 (permanent) lets browsers and CDNs cache the redirect forever — fastest, but you lose analytics. 302 (temporary) means every click hits you. Pick 302 if you want clicks.' },
    ],
    deepDives: [
      { title: 'Counter without a single point of failure', body: 'Use a distributed ID service (Snowflake, or a Zookeeper-coordinated range allocator). Each app server grabs a 10k-id batch — survives crashes, no bottleneck.' },
      { title: 'Custom aliases without races', body: 'INSERT ... ON CONFLICT DO NOTHING and check rowcount. Race-safe in one round trip.' },
      { title: 'Analytics without slowing redirects', body: 'Async: redirect first, fire-and-forget event to Kafka, aggregate offline. Never make the user wait for a write.' },
    ],
    tradeoffs: [
      'Counter ids leak business volume — adversarial folks can iterate. Hash-of-counter or base62-shuffle fixes it.',
      '301 = fewer requests but no per-click analytics. Pick your poison.',
      'Caching makes you blazing fast and almost stateless — your DB becomes a cold-storage afterthought.',
    ],
    punchline: '99% of this system is a cache in front of a KV table. The hard part is keeping ids unique without a global lock.',
  },

  // 2
  {
    id: 'dropbox',
    title: 'Dropbox / File Sync',
    emoji: '📦',
    tagline: 'Make a folder identical on five devices without losing anyone\'s homework.',
    prompt: 'Design a file syncing service like Dropbox or Google Drive.',
    difficulty: 'medium',
    functional: [
      'Upload / download files from any device',
      'Sync changes across all of a user\'s devices',
      'Share files with other users',
      'Version history & restore',
    ],
    nonFunctional: [
      'Eventual consistency across devices is fine, conflicts must be resolvable',
      'Support files up to multi-GB',
      'Cheap storage for cold data',
      'Sync latency seconds, not minutes',
    ],
    capacity: [
      { label: 'Users', value: '500M' },
      { label: 'Avg storage / user', value: '~2 GB' },
      { label: 'Total storage', value: '~1 EB' },
      { label: 'Daily uploads', value: '~PBs' },
    ],
    diagram: {
      layers: [
        [{ id: 'client', label: 'Desktop / Mobile', kind: 'client', sub: 'sync agent' }],
        [{ id: 'api', label: 'API + LB', kind: 'api' }],
        [
          { id: 'meta', label: 'Metadata Svc', kind: 'service' },
          { id: 'upload', label: 'Upload Svc', kind: 'service' },
          { id: 'notify', label: 'Notify Svc', kind: 'service' },
        ],
        [
          { id: 'db', label: 'Metadata DB', kind: 'db', sub: 'files, versions' },
          { id: 'q', label: 'Event Bus', kind: 'queue' },
        ],
        [
          { id: 's3', label: 'Object Store', kind: 'storage', sub: 'chunked blobs' },
          { id: 'ws', label: 'WebSocket Fanout', kind: 'stream' },
        ],
      ],
      edges: [
        { from: 'client', to: 'api' },
        { from: 'api', to: 'meta' },
        { from: 'api', to: 'upload' },
        { from: 'meta', to: 'db' },
        { from: 'upload', to: 's3', label: 'chunks' },
        { from: 'meta', to: 'q', label: 'change event' },
        { from: 'q', to: 'notify' },
        { from: 'notify', to: 'ws' },
        { from: 'ws', to: 'client', dashed: true, label: 'sync push' },
      ],
    },
    walkthrough: [
      { title: '1. Chunk every file', body: 'Split into 4 MB chunks, hash each (SHA-256). Now uploading a 1 GB video that\'s 99% unchanged uploads only the 10 MB that moved. Dedup is free.' },
      { title: '2. Metadata is the source of truth', body: 'A row per chunk: (file_id, version, chunk_index, chunk_hash, size). The file = ordered list of chunk hashes. The blobs sit in S3 keyed by hash.' },
      { title: '3. Sync = diff + fetch', body: 'Client asks "what changed since version V?" Server returns chunk delta. Client downloads only the new chunks from S3 directly (presigned URLs).' },
      { title: '4. Push, don\'t poll', body: 'Long-lived WebSocket per client. When a write commits, Notify Svc fans out a "version bumped" event to subscribed devices.' },
    ],
    deepDives: [
      { title: 'Conflict resolution', body: 'Last-writer-wins is brutal. Instead: detect concurrent edits via vector clocks or compared parent versions, keep both as "Alice\'s conflicted copy".' },
      { title: 'Direct-to-S3 uploads', body: 'Client gets a presigned multipart URL. Bytes never touch your servers. Saves 10× bandwidth.' },
      { title: 'Cold tier migration', body: 'Files untouched for 90 days → S3 IA → Glacier. Saves 80% on storage cost. Restore is async.' },
    ],
    tradeoffs: [
      'Chunk size: smaller = better dedup, more metadata. 4 MB is the sweet spot.',
      'Strong vs eventual consistency on metadata: strong is easier mentally but cuts cross-region throughput.',
      'Per-user encryption keys defeat dedup. Pick "convenience or zero-knowledge", not both.',
    ],
    punchline: 'Don\'t sync files — sync chunks. Files are just lists of chunk hashes, and S3 already deduplicates the world.',
  },

  // 3
  {
    id: 'local-delivery',
    title: 'Local Delivery Service',
    emoji: '🛵',
    tagline: 'Find a human with a scooter and your burrito, in that order.',
    prompt: 'Design a local delivery service like DoorDash, Uber Eats, or Postmates.',
    difficulty: 'hard',
    functional: [
      'Order food from nearby restaurants',
      'Match orders to drivers in real time',
      'Live track the driver on a map',
      'Pay, tip, rate',
    ],
    nonFunctional: [
      'Sub-second matching',
      'Driver locations updated every ~5 seconds',
      'High write rate from drivers (location pings)',
      'Surge-resistant — Friday 7pm is a fire',
    ],
    capacity: [
      { label: 'Active drivers (peak)', value: '~500k' },
      { label: 'Location pings / sec', value: '~100k' },
      { label: 'Orders / day', value: '~10M' },
    ],
    diagram: {
      layers: [
        [
          { id: 'eater', label: 'Eater App', kind: 'client' },
          { id: 'driver', label: 'Driver App', kind: 'client' },
        ],
        [{ id: 'api', label: 'API Gateway', kind: 'api' }],
        [
          { id: 'order', label: 'Order Svc', kind: 'service' },
          { id: 'match', label: 'Matching Svc', kind: 'service' },
          { id: 'loc', label: 'Location Svc', kind: 'service' },
        ],
        [
          { id: 'geo', label: 'Redis Geo', kind: 'cache', sub: 'driver positions' },
          { id: 'db', label: 'OrdersDB', kind: 'db' },
          { id: 'kafka', label: 'Kafka', kind: 'queue', sub: 'pings + events' },
        ],
        [{ id: 'ws', label: 'Live Tracking WS', kind: 'stream' }],
      ],
      edges: [
        { from: 'eater', to: 'api' },
        { from: 'driver', to: 'api', label: 'ping 5s' },
        { from: 'api', to: 'order' },
        { from: 'api', to: 'loc' },
        { from: 'loc', to: 'kafka' },
        { from: 'kafka', to: 'geo', label: 'update' },
        { from: 'order', to: 'match' },
        { from: 'match', to: 'geo', label: 'nearest K' },
        { from: 'order', to: 'db' },
        { from: 'match', to: 'ws' },
        { from: 'ws', to: 'eater', dashed: true, label: 'driver moving' },
      ],
    },
    walkthrough: [
      { title: '1. Drivers ping; you bucket them', body: 'Every driver sends GPS every 5s. Store in Redis with GEOADD. Redis returns nearest-K drivers within radius in O(log N).' },
      { title: '2. Order arrives, you match', body: 'Order comes in → matching service queries Redis Geo for top-N nearest available drivers → score by ETA, rating, current load → offer to best.' },
      { title: '3. Driver accepts, lock the match', body: 'Atomic SETNX on driverId so two orders don\'t grab the same driver. TTL = 30s to release if no ack.' },
      { title: '4. Stream the dot', body: 'During delivery, driver pings → Location Svc → Kafka → fanout WebSocket → eater\'s map updates. The little moving moped is just a topic subscription.' },
    ],
    deepDives: [
      { title: 'Geohashing vs Redis Geo', body: 'Quad trees / S2 cells give you finer control for huge fleets. Redis Geo (which uses geohash internally) is great up to ~millions of points. Pick S2 at Uber scale.' },
      { title: 'Surge pricing', body: 'Compute (demand / supply) per cell every 1–5 min. Pipe through Flink. Apply as a multiplier in checkout. Lasts as long as supply lags.' },
      { title: 'Dispatch fairness', body: 'Greedy nearest-driver creates "starvation" — drivers far from city center never get jobs. Use batched optimization: solve the assignment problem every 5–10 sec across pending orders.' },
    ],
    tradeoffs: [
      'Pinging every 5s = freshness vs battery. Adaptive (move-only pings) trades complexity for both.',
      'Greedy match is fast and simple. Batched is fairer and more efficient but adds latency.',
      'Strong consistency on driver acceptance: critical. Eventual on location: totally fine.',
    ],
    punchline: 'Geospatial indexes + a queue of drivers + WebSocket fanout. Everything else is UI on top.',
  },

  // 4
  {
    id: 'ticketmaster',
    title: 'Ticketmaster',
    emoji: '🎟️',
    tagline: 'Sell 80,000 Taylor Swift tickets without the universe collapsing.',
    prompt: 'Design a ticketing service like Ticketmaster for live events.',
    difficulty: 'hard',
    functional: [
      'Browse events',
      'Pick a specific seat from a seat map',
      'Hold + purchase tickets',
      'No double-booking. Ever.',
    ],
    nonFunctional: [
      'Hard consistency on seat ownership',
      'Brutal traffic spikes when tickets drop',
      'Fair queueing for buyers',
      'Hold the seat ~10 min for checkout',
    ],
    capacity: [
      { label: 'Onsale concurrency', value: '~2M users' },
      { label: 'Peak request rate',  value: '~500k QPS' },
      { label: 'Seats in venue',     value: '10k–80k' },
    ],
    diagram: {
      layers: [
        [{ id: 'user', label: 'Fans 😬', kind: 'client' }],
        [{ id: 'wait', label: 'Waiting Room', kind: 'service', sub: 'virtual queue' }],
        [{ id: 'api', label: 'API + LB', kind: 'api' }],
        [
          { id: 'seat', label: 'Seat Svc', kind: 'service' },
          { id: 'pay', label: 'Payment Svc', kind: 'service' },
        ],
        [
          { id: 'lock', label: 'Redis Locks', kind: 'cache', sub: 'seat holds (TTL 10m)' },
          { id: 'db', label: 'Postgres', kind: 'db', sub: 'sold seats' },
          { id: 'q', label: 'Stripe / Q', kind: 'queue' },
        ],
      ],
      edges: [
        { from: 'user', to: 'wait', label: 'enter queue' },
        { from: 'wait', to: 'api', label: 'token' },
        { from: 'api', to: 'seat' },
        { from: 'seat', to: 'lock', label: 'SETNX hold' },
        { from: 'api', to: 'pay' },
        { from: 'pay', to: 'q' },
        { from: 'pay', to: 'db', label: 'commit' },
        { from: 'lock', to: 'db', dashed: true, label: 'expires → release' },
      ],
    },
    walkthrough: [
      { title: '1. Build a queueing room', body: 'Don\'t let 2M users hit your booking API at once. A pre-room (Lambda + signed cookies, or Cloudflare Waiting Room) admits N per second.' },
      { title: '2. Hold the seat in Redis', body: 'When a user clicks a seat, SET seat:{eventId}:{seatId} = userId NX EX 600. Atomic — first writer wins, others see "taken". 10-minute TTL auto-releases.' },
      { title: '3. Commit on payment', body: 'On successful charge: write to Postgres in a transaction, mark seat sold, remove the Redis hold. Both updates in one DB tx so the seat can\'t be paid twice.' },
      { title: '4. Tell everyone in real time', body: 'Subscribe browsers to seat-status changes via WebSocket. As people grab seats, the seat map updates live for everyone watching.' },
    ],
    deepDives: [
      { title: 'Why not just a DB row lock?', body: 'Pessimistic row locks on the hottest table during onsale = melted DB. Redis + an idempotent commit is much faster and survives the spike.' },
      { title: 'Bot defense', body: 'Per-account purchase limits, CAPTCHAs at the queue, device fingerprinting, account-age gates. Without these, brokers eat everything in 12 seconds.' },
      { title: 'Fairness', body: 'Lottery instead of FIFO: collect entries for an hour, randomly assign. Removes the "who has fastest internet" tax. Verified Fan does this.' },
    ],
    tradeoffs: [
      'FIFO queue is intuitive but rewards bot-tier latency. Lottery is fairer, less satisfying.',
      'Hold expiry: too short = cart abandoned mid-payment, too long = inventory hostage. 10 min is industry default.',
      'Strong consistency required — this is the canonical "no eventual consistency allowed" system.',
    ],
    punchline: 'The hard part isn\'t the DB. It\'s admitting 1M people through a turnstile without anyone double-clicking themselves into two seats.',
  },

  // 5
  {
    id: 'fb-newsfeed',
    title: 'Facebook News Feed',
    emoji: '📰',
    tagline: 'Show 200 personalized posts in 100ms, every time someone bored-scrolls.',
    prompt: 'Design the news feed for Facebook / Instagram.',
    difficulty: 'hard',
    functional: [
      'User opens app → sees personalized, ranked feed',
      'Scroll loads more posts',
      'Post creation + media upload',
      '"Justin Bieber problem" — celebrities have 100M followers',
    ],
    nonFunctional: [
      'Feed load < 200ms p99',
      'Reads massively dominate writes (1000:1)',
      'Heavy ML ranking',
      'Globally distributed',
    ],
    capacity: [
      { label: 'DAU', value: '~3B' },
      { label: 'Posts / sec', value: '~1M' },
      { label: 'Feed reads / sec', value: '~1B' },
    ],
    diagram: {
      layers: [
        [{ id: 'app', label: 'App', kind: 'client' }],
        [{ id: 'api', label: 'API + LB', kind: 'api' }],
        [
          { id: 'feed', label: 'Feed Svc', kind: 'service' },
          { id: 'post', label: 'Post Svc', kind: 'service' },
          { id: 'rank', label: 'Ranker (ML)', kind: 'service' },
        ],
        [
          { id: 'inbox', label: 'Per-User Inbox', kind: 'cache', sub: 'pre-fanned feed' },
          { id: 'graph', label: 'Social Graph', kind: 'db' },
          { id: 'posts', label: 'PostsDB', kind: 'db' },
        ],
        [{ id: 'cdn', label: 'CDN', kind: 'cdn', sub: 'media' }],
      ],
      edges: [
        { from: 'app', to: 'api' },
        { from: 'api', to: 'feed' },
        { from: 'feed', to: 'inbox', label: 'pull list' },
        { from: 'feed', to: 'rank' },
        { from: 'feed', to: 'posts', label: 'hydrate' },
        { from: 'post', to: 'posts' },
        { from: 'post', to: 'inbox', label: 'fan-out write', dashed: true },
        { from: 'app', to: 'cdn', dashed: true, label: 'media' },
      ],
    },
    walkthrough: [
      { title: '1. Fan-out on write (default)', body: 'When Alice posts, push the post id into the inbox cache of every friend. Reading a feed = grab a list from your own inbox. Reads are O(1).' },
      { title: '2. The Justin Bieber problem', body: 'If Bieber has 100M followers, his single post writes to 100M inboxes. That kills you. Mark celebs as "pull" — their posts are fetched at read time, not fanned out.' },
      { title: '3. Hybrid: pull for celebs, push for normies', body: 'At read time: union(my inbox, posts from followed celebs in last 24h). Cheap because there are few celebs per user.' },
      { title: '4. Rank, don\'t chronologize', body: 'Send candidate posts through an ML ranker that scores by (engagement signals, freshness, content type). Final order is personalized.' },
    ],
    deepDives: [
      { title: 'Inbox storage', body: 'Per-user sorted set in Redis or per-row in a wide-column store. Keep ~1000 recent post ids. Truncate older. Materialize from posts table on cold start.' },
      { title: 'Media delivery', body: 'Originals in object storage. Generate thumbnails async (multiple resolutions). CDN serves everything from the edge — feed text is ~1 KB, media is the byte cost.' },
      { title: 'Cold start', body: 'New user has empty graph → fall back to topical / trending feed. Mix in graph as it grows.' },
    ],
    tradeoffs: [
      'Pure fan-out-on-write is fast to read, brutal for celebs. Pure pull is cheap to write, slow to read. Hybrid wins.',
      'Chronological is honest but engagement-optimized order is what every product team ships.',
      'Eventually consistent — if your friend\'s post takes 3s to appear, no one dies.',
    ],
    punchline: 'A news feed is a pre-computed ranked list per user. The interesting question is who pushes vs pulls.',
  },

  // 6
  {
    id: 'tinder',
    title: 'Tinder',
    emoji: '🔥',
    tagline: 'Show humans to other humans in a 5km radius and detect mutual interest.',
    prompt: 'Design a dating app like Tinder, Bumble, or Hinge.',
    difficulty: 'medium',
    functional: [
      'Build a profile',
      'See a stack of candidate profiles',
      'Swipe left/right',
      'Match when both swipe right',
      'Chat after match',
    ],
    nonFunctional: [
      'Geo-aware: only show nearby people',
      'Don\'t show someone you\'ve already swiped',
      'Detect mutual likes within seconds',
      'Personalize stack ordering',
    ],
    capacity: [
      { label: 'DAU', value: '~50M' },
      { label: 'Swipes / day', value: '~2B' },
      { label: 'Matches / day', value: '~20M' },
    ],
    diagram: {
      layers: [
        [{ id: 'app', label: 'Phone', kind: 'client' }],
        [{ id: 'api', label: 'API + LB', kind: 'api' }],
        [
          { id: 'feed', label: 'Stack Svc', kind: 'service' },
          { id: 'swipe', label: 'Swipe Svc', kind: 'service' },
          { id: 'match', label: 'Match Svc', kind: 'service' },
        ],
        [
          { id: 'geo', label: 'Geo Index', kind: 'cache', sub: 'S2 cells' },
          { id: 'swipesdb', label: 'Swipes DB', kind: 'db' },
          { id: 'cache', label: 'Likes Bloom', kind: 'cache', sub: 'have-you-liked-them?' },
        ],
        [{ id: 'q', label: 'Match Q → Push', kind: 'queue' }],
      ],
      edges: [
        { from: 'app', to: 'api' },
        { from: 'api', to: 'feed' },
        { from: 'feed', to: 'geo' },
        { from: 'feed', to: 'swipesdb', label: 'exclude seen' },
        { from: 'api', to: 'swipe' },
        { from: 'swipe', to: 'swipesdb' },
        { from: 'swipe', to: 'cache' },
        { from: 'swipe', to: 'match', label: 'check reciprocal' },
        { from: 'match', to: 'q' },
        { from: 'q', to: 'app', dashed: true, label: "It's a match!" },
      ],
    },
    walkthrough: [
      { title: '1. Geo-index candidates', body: 'Use S2 cells or geohash. Look up users within ~5–50 km of yours. Cache the candidate list per user, refresh every few minutes.' },
      { title: '2. Filter the deck', body: 'Apply filters (age, gender, preferences) and exclude anyone you\'ve already swiped on (left or right). A bloom filter per user makes this O(1).' },
      { title: '3. Record the swipe', body: 'POST /swipe → write {liker, likee, direction, ts}. Single row, partitioned by liker_id.' },
      { title: '4. Detect the match', body: 'On a "right" swipe, check: does the other user already have a right-swipe on me? If yes → match. Write to matches table, push notification to both.' },
    ],
    deepDives: [
      { title: 'Re-swipe prevention', body: 'A naive query for "have I already swiped on X?" hits the DB. A per-user bloom filter (in Redis) returns false quickly for the 99% case, falling back to DB only on a probable hit.' },
      { title: 'Ranking the stack', body: 'ELO-like score per user (popularity), plus ML features (mutual friends, recent activity). Mix in some exploration — never only show top 10.' },
      { title: 'Storage explosion', body: '50M DAU × 200 swipes/day → 10B rows/year. Partition by liker, archive after 90 days, keep matches forever.' },
    ],
    tradeoffs: [
      'Geo cell size: too small = sparse candidates, too big = irrelevant matches. Adapt by population density.',
      'Bloom filter false positives mean occasional DB fallback. Acceptable for the throughput win.',
      'Strong consistency on matches (don\'t miss one). Eventual on stack ordering.',
    ],
    punchline: 'It\'s a geo-spatial search + a left-anti-join on prior swipes + an instant reciprocity check.',
  },

  // 7
  {
    id: 'leetcode',
    title: 'LeetCode / Online Judge',
    emoji: '🧠',
    tagline: 'Run a stranger\'s code without becoming the stranger\'s server.',
    prompt: 'Design an online code judge like LeetCode.',
    difficulty: 'medium',
    functional: [
      'Browse problems',
      'Submit code in many languages',
      'Run against test cases, return verdict + runtime',
      'Leaderboards, contests',
    ],
    nonFunctional: [
      'Strong sandboxing — user code cannot escape',
      'Bounded execution time and memory',
      'Sub-second to ~10s verdict',
      'Fair queueing during contests',
    ],
    capacity: [
      { label: 'Submissions / day', value: '~10M' },
      { label: 'Languages', value: '20+' },
      { label: 'Test cases / problem', value: '10–100' },
    ],
    diagram: {
      layers: [
        [{ id: 'web', label: 'Web IDE', kind: 'client' }],
        [{ id: 'api', label: 'API', kind: 'api' }],
        [{ id: 'sub', label: 'Submission Svc', kind: 'service' }],
        [{ id: 'q', label: 'Job Queue', kind: 'queue' }],
        [
          { id: 'workers', label: 'Workers (gVisor / Firecracker)', kind: 'service', sub: 'sandboxed' },
          { id: 'cases', label: 'Test Cases', kind: 'storage' },
        ],
        [
          { id: 'db', label: 'Results DB', kind: 'db' },
          { id: 'lb_cache', label: 'Leaderboard Cache', kind: 'cache' },
        ],
      ],
      edges: [
        { from: 'web', to: 'api' },
        { from: 'api', to: 'sub' },
        { from: 'sub', to: 'q', label: 'enqueue' },
        { from: 'q', to: 'workers', label: 'pull' },
        { from: 'workers', to: 'cases', label: 'fetch' },
        { from: 'workers', to: 'db', label: 'verdict' },
        { from: 'db', to: 'lb_cache', dashed: true, label: 'rank update' },
        { from: 'api', to: 'web', dashed: true, label: 'poll / WS' },
      ],
    },
    walkthrough: [
      { title: '1. Queue every submission', body: 'POST /submit returns immediately with a submission id. Submission → Kafka/SQS → pool of sandboxed workers. Never run code in the request handler.' },
      { title: '2. Sandbox like your life depends on it', body: 'gVisor or Firecracker microVMs. No network. Read-only FS. CPU + memory + wall-clock limits enforced by the kernel. Treat the worker as disposable.' },
      { title: '3. Run test cases', body: 'Compile (cached image), run against test cases in order, kill on TLE. Return {verdict, runtime, memory, failing case (sometimes hidden)}.' },
      { title: '4. Update leaderboard async', body: 'Verdict written to DB → event to Kafka → leaderboard service updates a Redis sorted set per contest. Reads are O(log N) range queries.' },
    ],
    deepDives: [
      { title: 'Firecracker over containers', body: 'Docker containers share the host kernel — kernel exploits = game over. Firecracker microVMs boot in ~125 ms with strong isolation. AWS Lambda uses them.' },
      { title: 'Contest spikes', body: 'Submissions go 100× at contest start. Workers autoscale, but queue absorbs the burst. Slow worst case under spike is OK; failing fast isn\'t.' },
      { title: 'Stop people cheating the runtime', body: 'Run on identical hardware (e.g., a fixed instance type) so runtime numbers are comparable. Otherwise t2.micro vs c5.xlarge ruins your benchmark.' },
    ],
    tradeoffs: [
      'Sandbox security vs cold start time. Firecracker is the modern sweet spot.',
      'Synchronous verdict (poll) is simpler than WS push, but WS is nicer UX.',
      'Cache compiled binaries per language version to cut launch latency.',
    ],
    punchline: 'It\'s a job queue feeding microVMs with a leaderboard side-effect. The hard part is the sandbox.',
  },

  // 8
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    emoji: '💬',
    tagline: 'Deliver 100 billion "k" replies a day. Encrypted. To one or many.',
    prompt: 'Design a chat app like WhatsApp with end-to-end encryption.',
    difficulty: 'hard',
    functional: [
      '1-1 chat, group chat',
      'Delivery receipts (sent / delivered / read)',
      'Offline messages buffered + delivered when online',
      'End-to-end encryption',
    ],
    nonFunctional: [
      'Massive write rate',
      'Low delivery latency',
      'Devices come and go from the network',
      'Privacy: even WhatsApp can\'t read messages',
    ],
    capacity: [
      { label: 'DAU', value: '~2B' },
      { label: 'Messages / day', value: '~100B' },
      { label: 'Avg msg size', value: '~100 bytes' },
    ],
    diagram: {
      layers: [
        [
          { id: 'alice', label: 'Alice', kind: 'client' },
          { id: 'bob', label: 'Bob', kind: 'client' },
        ],
        [{ id: 'ws', label: 'WS Gateway', kind: 'api', sub: 'sticky per user' }],
        [
          { id: 'route', label: 'Routing Svc', kind: 'service' },
          { id: 'pres', label: 'Presence Svc', kind: 'service' },
        ],
        [
          { id: 'inbox', label: 'Inbox / Mailbox', kind: 'db', sub: 'per-recipient pending' },
          { id: 'meta', label: 'Group / Key Svc', kind: 'db' },
        ],
        [{ id: 'push', label: 'APNs / FCM', kind: 'external' }],
      ],
      edges: [
        { from: 'alice', to: 'ws', label: 'send (encrypted)' },
        { from: 'ws', to: 'route' },
        { from: 'route', to: 'inbox', label: 'store-and-forward' },
        { from: 'route', to: 'pres', label: 'is Bob online?' },
        { from: 'route', to: 'push', dashed: true, label: 'wake Bob' },
        { from: 'ws', to: 'bob', dashed: true, label: 'deliver' },
      ],
    },
    walkthrough: [
      { title: '1. Persistent WebSocket per device', body: 'Each device holds a TLS WebSocket to the nearest gateway. Mapping {userId → gatewayId} lives in a fast KV (Redis or a sharded map service).' },
      { title: '2. Store and forward', body: 'Alice sends. Server stores ciphertext in Bob\'s mailbox immediately (durability first), then attempts delivery. If Bob is offline, push notification wakes him; he reconnects and drains the mailbox.' },
      { title: '3. Receipts are messages too', body: 'When Bob receives or reads, his device sends a tiny ack message back. Same pipeline — no separate system.' },
      { title: '4. Group chat is fan-out', body: 'Group = list of members. Server fans out the ciphertext to each member\'s mailbox. With E2E, the sender encrypts once per recipient (or uses Signal\'s sender keys for efficiency).' },
    ],
    deepDives: [
      { title: 'End-to-end encryption (Signal protocol)', body: 'Double Ratchet + X3DH. Server only sees ciphertext. Cannot help you recover a lost message — only the device holds keys.' },
      { title: 'Connection scaling', body: 'A single Linux box can hold ~1M WebSockets with tuning. Use connection LBs (HAProxy, Envoy) and shard users across gateway nodes.' },
      { title: 'Mailbox lifecycle', body: 'Pending messages purged on ack. With multi-device, "ack" means "all my devices ack\'d", which means slightly longer retention. WhatsApp originally deleted on first delivery; new versions retain longer.' },
    ],
    tradeoffs: [
      'E2E encryption blocks server-side features (search, spam filtering, recovery).',
      'Sticky WS connections complicate load balancing. Worth it for latency.',
      'Per-recipient encryption multiplies group fan-out cost. Sender keys mitigate but add complexity.',
    ],
    punchline: 'A chat app is a per-recipient mailbox + a per-device WebSocket. The crypto is the spicy bit.',
  },

  // 9
  {
    id: 'rate-limiter',
    title: 'Rate Limiter',
    emoji: '🚦',
    tagline: 'Tell users "you have had enough" politely and at global scale.',
    prompt: 'Design a distributed rate limiter.',
    difficulty: 'medium',
    functional: [
      'Allow N requests per identity per window',
      'Per-IP, per-user, per-API-key configurable',
      'Different limits per endpoint',
    ],
    nonFunctional: [
      'Decision adds < 1 ms to request path',
      'Works across many service instances',
      'Survives partial Redis failures (fail open / fail closed by policy)',
    ],
    capacity: [
      { label: 'Decisions / sec', value: '~10M+' },
      { label: 'Distinct keys', value: '~100M' },
    ],
    diagram: {
      layers: [
        [{ id: 'client', label: 'Client', kind: 'client' }],
        [{ id: 'gw', label: 'API Gateway', kind: 'api' }],
        [{ id: 'rl', label: 'Rate Limit Svc', kind: 'service' }],
        [{ id: 'redis', label: 'Redis (sharded)', kind: 'cache', sub: 'counters + tokens' }],
        [{ id: 'svc', label: 'Downstream Svc', kind: 'service' }],
      ],
      edges: [
        { from: 'client', to: 'gw' },
        { from: 'gw', to: 'rl', label: 'allow?' },
        { from: 'rl', to: 'redis', label: 'INCR / EVAL' },
        { from: 'rl', to: 'gw', dashed: true, label: '✅ / ❌ 429' },
        { from: 'gw', to: 'svc' },
      ],
    },
    walkthrough: [
      { title: '1. Pick your algorithm', body: 'Fixed window: simple, but burst at boundaries. Sliding window: smoother, more state. Token bucket: best UX, allows controlled bursts. Leaky bucket: smooths traffic.' },
      { title: '2. Use Redis atomically', body: 'For token bucket: a Lua script that reads tokens, refills based on time delta, decrements, returns allow/deny — all atomic in one round trip.' },
      { title: '3. Set the key, set the limit', body: 'Key shape: rl:{userId}:{endpoint}. Limits in config, hot-reloadable. Return 429 with Retry-After header on deny.' },
      { title: '4. Don\'t become the bottleneck', body: 'Shard Redis by key. Approximate counters with local in-memory token buckets + periodic Redis sync if accuracy isn\'t critical (saves 99% of the calls).' },
    ],
    deepDives: [
      { title: 'Fail-open vs fail-closed', body: 'If Redis is down, do you let everyone through or block everyone? "Open" preserves availability; "closed" preserves the limit. Most public APIs choose open.' },
      { title: 'Distributed token bucket without Redis', body: 'Each app server holds a local bucket sized to (global_limit / N servers). Gossip occasionally. Faster, less accurate.' },
      { title: 'Returning useful headers', body: 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset let clients self-regulate. Way better DX than mysterious 429s.' },
    ],
    tradeoffs: [
      'Accuracy vs latency: every centralized check costs an extra hop.',
      'Per-request decision vs sampled: at extreme scale, allow 1 in N to skip the check.',
      'Burst tolerance: token bucket lets users front-load — usually desirable.',
    ],
    punchline: 'Token bucket + Redis Lua script + sharded keys = 99% of every rate limiter you\'ll ever write.',
  },

  // 10
  {
    id: 'fb-live-comments',
    title: 'FB Live Comments',
    emoji: '🎥',
    tagline: 'Show 100k strangers shouting at the same livestream, in order, in real time.',
    prompt: 'Design live comments for a Facebook / YouTube live stream.',
    difficulty: 'medium',
    functional: [
      'Anyone can post a comment',
      'Everyone watching sees the comments live',
      'Comments display in roughly chronological order',
      'Late joiners see recent backlog',
    ],
    nonFunctional: [
      '< 1s delivery',
      '100k+ concurrent viewers per stream',
      'Toxic-comment filter',
    ],
    capacity: [
      { label: 'Viewers per stream',  value: '100k–10M' },
      { label: 'Comments / sec',      value: '~10k peak' },
    ],
    diagram: {
      layers: [
        [{ id: 'viewer', label: 'Viewers', kind: 'client' }],
        [{ id: 'ws', label: 'WS Gateway', kind: 'api' }],
        [
          { id: 'post', label: 'Comment Svc', kind: 'service' },
          { id: 'mod', label: 'Moderation', kind: 'service' },
        ],
        [
          { id: 'pubsub', label: 'Redis Pub/Sub', kind: 'queue', sub: 'per-stream channel' },
          { id: 'db', label: 'Comments DB', kind: 'db' },
        ],
      ],
      edges: [
        { from: 'viewer', to: 'ws', label: 'subscribe stream:42' },
        { from: 'viewer', to: 'post', label: 'POST comment' },
        { from: 'post', to: 'mod' },
        { from: 'post', to: 'db' },
        { from: 'post', to: 'pubsub', label: 'PUBLISH' },
        { from: 'pubsub', to: 'ws' },
        { from: 'ws', to: 'viewer', dashed: true, label: 'fan-out' },
      ],
    },
    walkthrough: [
      { title: '1. One channel per stream', body: 'Each live stream gets a pub/sub channel. Every WS gateway with viewers of that stream subscribes. When a comment is posted, one publish reaches all viewers.' },
      { title: '2. Write fast, broadcast faster', body: 'POST /comment → write to DB → publish to channel. Acknowledge to author immediately. Async moderation runs on the side.' },
      { title: '3. Sample if it\'s a flood', body: 'On mega-streams, 10k comments/sec is unreadable anyway. Sample (show 1 in 10) before broadcasting, or rank by likes / recency.' },
      { title: '4. Backfill for late joiners', body: 'When a viewer joins, fetch last 50 comments from DB (or a Redis list), then subscribe to live. Smooth UX, no missed beats.' },
    ],
    deepDives: [
      { title: 'Sampling vs showing all', body: 'Twitch shows everything (chat is the point). News streams sample (signal > volume). Configurable per stream.' },
      { title: 'WebSocket scale', body: 'For 10M concurrent viewers, you need many WS gateway nodes. Each subscribes to the pub/sub channel — one publish per gateway, then fan-out to local connections.' },
      { title: 'Moderation in band vs out of band', body: 'In-band blocks the publish if classifier flags. Out-of-band publishes then retroactively deletes. In-band has higher latency, out-of-band may flash bad content.' },
    ],
    tradeoffs: [
      'Strict ordering vs scale: at 10k/sec you cannot strictly order; pick "roughly chronological" + sample.',
      'Sticky WS connections constrain LB but lower latency.',
      'Sampling drops content. Necessary at scale.',
    ],
    punchline: 'Pub/sub + a WS gateway is enough. Everything past 10k/sec is sampling and ordering tricks.',
  },

  // 11
  {
    id: 'fb-post-search',
    title: 'FB Post Search',
    emoji: '🔎',
    tagline: 'Find that one rant your cousin posted in 2014. In 200ms.',
    prompt: 'Design search across all Facebook posts.',
    difficulty: 'hard',
    functional: [
      'Full-text search over posts',
      'Filter by author, date, location, friend-of-friend',
      'Rank by relevance + recency + social signal',
    ],
    nonFunctional: [
      'Sub-second latency p99',
      'Index hot on new posts (within seconds)',
      'Trillions of documents',
    ],
    capacity: [
      { label: 'Posts', value: '~10T' },
      { label: 'New posts / sec', value: '~1M' },
      { label: 'Queries / sec', value: '~100k' },
    ],
    diagram: {
      layers: [
        [{ id: 'app', label: 'App', kind: 'client' }],
        [{ id: 'api', label: 'Search API', kind: 'api' }],
        [
          { id: 'q', label: 'Query Svc', kind: 'service' },
          { id: 'rank', label: 'Ranker (ML)', kind: 'service' },
        ],
        [
          { id: 'es', label: 'ES / Lucene Shards', kind: 'search', sub: 'inverted index' },
          { id: 'posts', label: 'Posts DB', kind: 'db' },
        ],
        [
          { id: 'kafka', label: 'Kafka (CDC)', kind: 'stream' },
          { id: 'idx', label: 'Indexer', kind: 'service' },
        ],
      ],
      edges: [
        { from: 'app', to: 'api' },
        { from: 'api', to: 'q' },
        { from: 'q', to: 'es', label: 'scatter-gather' },
        { from: 'q', to: 'rank' },
        { from: 'q', to: 'posts', label: 'hydrate' },
        { from: 'posts', to: 'kafka', label: 'CDC' },
        { from: 'kafka', to: 'idx' },
        { from: 'idx', to: 'es', label: 'index' },
      ],
    },
    walkthrough: [
      { title: '1. Inverted index everything', body: 'Each post → tokenized → inverted index. Each token → posting list of post ids. Standard Lucene / Elasticsearch.' },
      { title: '2. Shard by ... post id', body: 'Sharding by author concentrates load. Shard by hash(post_id). Each query becomes a scatter-gather across all shards; coordinator merges results.' },
      { title: '3. Pipe writes via CDC', body: 'Posts DB → CDC stream (Debezium → Kafka) → indexers → ES. Decouples write path; survives ES outages.' },
      { title: '4. Rank with multiple signals', body: 'BM25 baseline. Boost by recency, social proximity (friend posts > stranger posts), engagement. Final pass through ML reranker on top 100.' },
    ],
    deepDives: [
      { title: 'Tiered storage by recency', body: 'Recent posts live in hot SSD-backed shards. Old posts move to cold tier with cheaper storage and bigger shards. Most queries hit only the hot tier.' },
      { title: 'Personalization at scale', body: 'Cannot rerank trillions of posts per query. Filter to candidates first (author in friend list, in time range), then personalize the top N.' },
      { title: 'Index size', body: '10T posts × ~500B per indexed term × overhead → multi-PB index. Compression and partial indexing per language are mandatory.' },
    ],
    tradeoffs: [
      'Scatter-gather across all shards is slow but inevitable for broad queries.',
      'Newer posts can wait seconds to be indexable — usually fine.',
      'Personalization vs raw relevance: tradeoff that the product team owns.',
    ],
    punchline: 'It\'s a sharded inverted index with a CDC firehose feeding it and a ranker on top.',
  },

  // 12
  {
    id: 'youtube-topk',
    title: 'YouTube Top K Videos',
    emoji: '📊',
    tagline: '"What\'s trending right now?" — at 5B views/day.',
    prompt: 'Design a service that returns the top-K most-viewed videos in a window.',
    difficulty: 'medium',
    functional: [
      'Top K most-viewed videos in the last hour / day / week',
      'Per region / per category',
    ],
    nonFunctional: [
      'Approximate counts OK',
      'Updated every few seconds',
      'Massive write rate (every view = a click)',
    ],
    capacity: [
      { label: 'Views / sec', value: '~500k' },
      { label: 'Distinct videos', value: '~10B' },
      { label: 'K', value: '100–1000' },
    ],
    diagram: {
      layers: [
        [{ id: 'player', label: 'Player', kind: 'client' }],
        [{ id: 'api', label: 'View API', kind: 'api' }],
        [{ id: 'kafka', label: 'Kafka', kind: 'stream' }],
        [{ id: 'flink', label: 'Flink', kind: 'service', sub: 'Count-Min + heavy hitters' }],
        [
          { id: 'redis', label: 'Redis ZSET', kind: 'cache', sub: 'top-K per window' },
          { id: 'cs', label: 'Cold Store', kind: 'db', sub: 'archive' },
        ],
      ],
      edges: [
        { from: 'player', to: 'api', label: 'view ping' },
        { from: 'api', to: 'kafka' },
        { from: 'kafka', to: 'flink' },
        { from: 'flink', to: 'redis', label: 'top-K update' },
        { from: 'flink', to: 'cs', label: 'snapshot' },
      ],
    },
    walkthrough: [
      { title: '1. Approximate, don\'t exact-count', body: 'Exact per-video counters would mean 10B keys hot — death. Use a Count-Min Sketch in Flink to estimate counts in fixed memory.' },
      { title: '2. Track heavy hitters', body: 'Maintain a top-K list (Misra-Gries or stream-summary algorithm) per (region, category, time window). Updated as views arrive.' },
      { title: '3. Serve from Redis', body: 'Flink writes the current top-K snapshot to a Redis sorted set every few seconds. API reads are O(log N) ZRANGE.' },
      { title: '4. Periodic exact reconciliation', body: 'Once a day, batch-job a precise count from cold storage and correct any sketch drift.' },
    ],
    deepDives: [
      { title: 'Why Count-Min and not exact?', body: 'CMS uses O(K log K) memory for any number of distinct items, with bounded error. Exact counters scale with cardinality.' },
      { title: 'Window strategies', body: 'Tumbling windows (last hour reset) are simple. Sliding/hopping windows give smoother trends. Pick based on UX needs.' },
      { title: 'Cold/hot disagreement', body: 'A reconciliation step at the end of each window corrects approximation errors before promotion to "official" trending list.' },
    ],
    tradeoffs: [
      'Memory vs precision: CMS lets you trade them deliberately.',
      'Real-time vs accuracy: stream + sketch is real-time approximate; batch is delayed exact.',
      'Per-region segmentation explodes state — be deliberate about how many dimensions you cut.',
    ],
    punchline: 'It\'s a streaming heavy-hitters algorithm with a tiny Redis cache in front. Don\'t try to exact-count the internet.',
  },

  // 13
  {
    id: 'uber',
    title: 'Uber',
    emoji: '🚗',
    tagline: 'A two-sided geo matching engine that also charges your card.',
    prompt: 'Design Uber\'s core ride-hailing system.',
    difficulty: 'hard',
    functional: [
      'Rider requests a ride',
      'Match nearest acceptable driver',
      'Track driver in real time during pickup',
      'End ride, charge, fare split',
    ],
    nonFunctional: [
      'Match in seconds',
      'Driver pings every few seconds',
      'Surge pricing',
      'Multi-region failover',
    ],
    capacity: [
      { label: 'Drivers (peak)', value: '~1M concurrent' },
      { label: 'Pings / sec', value: '~200k' },
      { label: 'Rides / day', value: '~25M' },
    ],
    diagram: {
      layers: [
        [
          { id: 'rider', label: 'Rider', kind: 'client' },
          { id: 'driver', label: 'Driver', kind: 'client' },
        ],
        [{ id: 'api', label: 'API + LB', kind: 'api' }],
        [
          { id: 'ride', label: 'Ride Svc', kind: 'service' },
          { id: 'disp', label: 'Dispatch (Matching)', kind: 'service' },
          { id: 'pay', label: 'Pay Svc', kind: 'service' },
        ],
        [
          { id: 'geo', label: 'Geo Index (S2)', kind: 'cache', sub: 'cells of drivers' },
          { id: 'kafka', label: 'Kafka (pings, events)', kind: 'stream' },
        ],
        [
          { id: 'db', label: 'Rides DB', kind: 'db' },
          { id: 'ws', label: 'WS Fanout', kind: 'stream' },
        ],
      ],
      edges: [
        { from: 'driver', to: 'api', label: 'ping' },
        { from: 'rider', to: 'api', label: 'request ride' },
        { from: 'api', to: 'ride' },
        { from: 'ride', to: 'disp' },
        { from: 'disp', to: 'geo', label: 'nearest drivers' },
        { from: 'api', to: 'kafka' },
        { from: 'kafka', to: 'geo', label: 'apply' },
        { from: 'ride', to: 'db' },
        { from: 'ride', to: 'pay' },
        { from: 'ride', to: 'ws' },
        { from: 'ws', to: 'rider', dashed: true, label: 'driver dot' },
      ],
    },
    walkthrough: [
      { title: '1. Index drivers spatially', body: 'Google S2 cells. Each driver lives in a cell; on ping you update the index. Find nearest-K by expanding ring of cells.' },
      { title: '2. Dispatch atomically', body: 'On request: pick best driver, atomically claim with a TTL lock. Offer to driver (~15s). If declined, claim the next best. Repeat until accepted.' },
      { title: '3. Track during ride', body: 'During pickup and ride, location pings stream via Kafka. WS fanout pushes driver position to the rider\'s app and to the ride record for ETA updates.' },
      { title: '4. End + charge', body: 'On "end ride", compute fare (distance + time + surge), charge stored payment method asynchronously, finalize the ride record. Receipt by email.' },
    ],
    deepDives: [
      { title: 'Why S2 not geohash', body: 'S2 cells have hierarchical levels with constant area. Better for ring queries on large fleets. Uber\'s blog literally walks through this.' },
      { title: 'Surge pricing', body: 'Per-cell demand/supply ratio computed in Flink every minute. Surge multipliers exposed via the pricing service; mobile apps display them.' },
      { title: 'Multi-region', body: 'A single region failure can\'t kill the platform. Active-active per region with strong locality (rides happen inside a region) is the standard pattern.' },
    ],
    tradeoffs: [
      'Greedy match is fast; bipartite matching every N seconds is more efficient but adds latency.',
      'S2 vs geohash: S2 wins for very large fleets; geohash is fine for smaller ones.',
      'Pricing freshness vs stability: too reactive feels manipulative; too slow loses revenue.',
    ],
    punchline: 'It\'s a real-time geo index, a TTL-locked offer loop, and a WS fanout. The hard parts are pricing and fairness.',
  },

  // 14
  {
    id: 'youtube',
    title: 'YouTube',
    emoji: '📺',
    tagline: 'Take a 4K video, slice it into HLS jelly cubes, serve it to a fridge in Bangkok.',
    prompt: 'Design YouTube — upload, transcode, stream.',
    difficulty: 'hard',
    functional: [
      'Upload video',
      'Transcode to multiple resolutions / codecs',
      'Stream adaptive bitrate to any device',
      'Search, recommendations, comments',
    ],
    nonFunctional: [
      'Global edge delivery',
      'Resumable uploads (flaky mobile)',
      'Hundreds of millions of concurrent streams',
    ],
    capacity: [
      { label: 'Upload / minute', value: '~500 hrs of video' },
      { label: 'Stored', value: '~exabytes' },
      { label: 'Concurrent streams', value: '~100M' },
    ],
    diagram: {
      layers: [
        [{ id: 'uploader', label: 'Uploader', kind: 'client' }],
        [{ id: 'upapi', label: 'Upload API', kind: 'api', sub: 'multipart' }],
        [
          { id: 'src', label: 'Raw bucket', kind: 'storage' },
          { id: 'q', label: 'Transcode Q', kind: 'queue' },
        ],
        [{ id: 'workers', label: 'Transcoders (GPU)', kind: 'service' }],
        [{ id: 'cdn', label: 'CDN (edges)', kind: 'cdn', sub: 'HLS / DASH' }],
        [{ id: 'viewer', label: 'Viewer', kind: 'client' }],
      ],
      edges: [
        { from: 'uploader', to: 'upapi' },
        { from: 'upapi', to: 'src', label: 'chunked' },
        { from: 'src', to: 'q' },
        { from: 'q', to: 'workers' },
        { from: 'workers', to: 'cdn', label: 'segments' },
        { from: 'viewer', to: 'cdn', label: 'GET .m3u8' },
      ],
    },
    walkthrough: [
      { title: '1. Resumable multipart upload', body: 'Client uploads chunks to a presigned URL. Each chunk is independently retryable. Final concat happens in object storage.' },
      { title: '2. Transcode in parallel', body: 'Submit the raw file to a transcode queue. Workers (GPU-backed) split the video into segments, transcode each segment to multiple bitrates/codecs in parallel. Massively parallel job.' },
      { title: '3. Output HLS / DASH', body: 'Every renditions becomes a series of 4–10s segments + a manifest (.m3u8 or .mpd). Push to object store, fan-out to CDN edges.' },
      { title: '4. Adaptive streaming', body: 'Player picks a rendition based on bandwidth, switches up/down per segment. Buffering → drop to lower bitrate.' },
    ],
    deepDives: [
      { title: 'Why segment, not whole files', body: 'Segments are CDN-cacheable individually; the player can switch bitrate per segment; partial network failures only lose one segment.' },
      { title: 'Cost of transcoding', body: 'Transcoding 500 hours/min is enormous compute. Only generate hot resolutions upfront; lazily generate niche codecs on first view.' },
      { title: 'Live vs VOD', body: 'Live needs sub-second-encoder + low-latency CDN. VOD is asynchronous. Same primitives, different SLOs.' },
    ],
    tradeoffs: [
      'Pre-transcode everything (faster first view, expensive) vs lazy transcode (cheap, slow first hit).',
      'Larger segments = better compression, worse start latency. ~4s is the sweet spot.',
      'Edge cache hit ratio is the single biggest cost lever.',
    ],
    punchline: 'It\'s an object store, a parallel transcoder, and the world\'s biggest CDN. Streaming is just a manifest of segment URLs.',
  },

  // 15
  {
    id: 'web-crawler',
    title: 'Web Crawler',
    emoji: '🕷️',
    tagline: 'Politely vacuum the entire internet without getting banned.',
    prompt: 'Design a web crawler like Googlebot.',
    difficulty: 'hard',
    functional: [
      'Fetch a URL',
      'Extract links, recurse',
      'Store page content for downstream indexing',
      'Respect robots.txt',
    ],
    nonFunctional: [
      'Politeness (per-host rate limits)',
      'Avoid loops / duplicates',
      'Massive parallelism',
      'Resume after restart',
    ],
    capacity: [
      { label: 'URLs crawled / day', value: '~10B' },
      { label: 'Pages on the web', value: '~50B+' },
      { label: 'Avg page size', value: '~100 KB' },
    ],
    diagram: {
      layers: [
        [{ id: 'seed', label: 'Seed URLs', kind: 'storage' }],
        [{ id: 'frontier', label: 'URL Frontier', kind: 'queue', sub: 'priority + per-host queues' }],
        [{ id: 'fetcher', label: 'Fetcher pool', kind: 'service' }],
        [
          { id: 'dedupe', label: 'Seen-URL Bloom', kind: 'cache' },
          { id: 'robots', label: 'Robots Cache', kind: 'cache' },
        ],
        [{ id: 'parser', label: 'Parser / Link Extractor', kind: 'service' }],
        [
          { id: 'content', label: 'Content Store', kind: 'storage' },
          { id: 'index', label: 'Indexer →', kind: 'search' },
        ],
      ],
      edges: [
        { from: 'seed', to: 'frontier' },
        { from: 'frontier', to: 'fetcher' },
        { from: 'fetcher', to: 'robots', label: 'allowed?' },
        { from: 'fetcher', to: 'parser' },
        { from: 'parser', to: 'content' },
        { from: 'parser', to: 'dedupe', label: 'new URLs' },
        { from: 'dedupe', to: 'frontier', dashed: true, label: 'enqueue' },
        { from: 'content', to: 'index' },
      ],
    },
    walkthrough: [
      { title: '1. Frontier = prioritized queue of URLs', body: 'Per-host sub-queues so you never hit a host more than X times/sec. Priority by PageRank, freshness, change-rate.' },
      { title: '2. Fetch politely', body: 'Honor robots.txt (cached aggressively). Respect Crawl-Delay. Spread requests across IP pool to avoid one host\'s rate hammering.' },
      { title: '3. Dedupe links', body: 'Bloom filter for URLs ever seen → cheap "have we crawled this?" check. Periodic compaction; false positives only delay a re-crawl.' },
      { title: '4. Re-crawl by change rate', body: 'A static blog re-fetches monthly; a news site every minutes. Track ETag/Last-Modified, adjust schedule by observed change frequency.' },
    ],
    deepDives: [
      { title: 'Spider traps', body: 'Calendar pages with infinite ?date=… links can trap you forever. Detect by depth limits, query-string heuristics, or per-domain URL caps.' },
      { title: 'Canonicalization', body: 'http vs https, www vs not, trailing slash, query parameter order — all normalize to one canonical form before deduping.' },
      { title: 'Distributed politeness', body: 'Across many crawler workers, sum of per-worker rates can still hammer a host. Centralize per-host tokens in a coordination service.' },
    ],
    tradeoffs: [
      'Politeness vs throughput. Politeness wins — getting blocked costs everything.',
      'Storing every page is exabyte-scale. Compression + dedupe by content hash help.',
      'Recency vs completeness: pick which to optimize per use case.',
    ],
    punchline: 'A polite, distributed BFS over the internet with a bloom filter for memory.',
  },

  // 16
  {
    id: 'ad-click-aggregator',
    title: 'Ad Click Aggregator',
    emoji: '💰',
    tagline: 'Count every click without double-counting, while bots try to rob you blind.',
    prompt: 'Design an aggregator that counts ad clicks for billing & analytics.',
    difficulty: 'medium',
    functional: [
      'Record every click',
      'Aggregate clicks per (ad, hour, region)',
      'Detect & exclude bot clicks',
    ],
    nonFunctional: [
      'No double counting (it\'s billing!)',
      'Near-real-time dashboards',
      'Late events still need to be counted',
    ],
    capacity: [
      { label: 'Clicks / sec', value: '~100k' },
      { label: 'Daily ad budget', value: 'billions $' },
    ],
    diagram: {
      layers: [
        [{ id: 'ad', label: 'Ad in browser', kind: 'client' }],
        [{ id: 'api', label: 'Click API', kind: 'api' }],
        [{ id: 'kafka', label: 'Kafka', kind: 'stream' }],
        [
          { id: 'flink', label: 'Flink job', kind: 'service', sub: 'windowed agg' },
          { id: 'fraud', label: 'Fraud Detector', kind: 'service' },
        ],
        [
          { id: 'olap', label: 'OLAP store', kind: 'db', sub: 'rollups' },
          { id: 'dedup', label: 'Dedup Store', kind: 'cache' },
        ],
      ],
      edges: [
        { from: 'ad', to: 'api', label: 'click + nonce' },
        { from: 'api', to: 'kafka' },
        { from: 'kafka', to: 'flink' },
        { from: 'flink', to: 'dedup', label: 'check nonce' },
        { from: 'flink', to: 'fraud' },
        { from: 'flink', to: 'olap', label: 'aggregate' },
      ],
    },
    walkthrough: [
      { title: '1. Sign every click', body: 'Server-signs the ad render with a one-time nonce + ad_id + ts + HMAC. The click POSTs the signed token. Tampered or replayed tokens are rejected.' },
      { title: '2. Stream into Kafka', body: 'Click → Kafka (partitioned by ad_id). Durable, replayable. Multiple consumers can derive different aggregations independently.' },
      { title: '3. Aggregate in Flink', body: 'Windowed counts per (ad_id, region, minute). Event-time windows + watermarks let you handle late clicks within an N-minute lateness budget.' },
      { title: '4. Dedup with the nonce', body: 'Maintain a sliding set of seen nonces (RocksDB-backed Flink state, or a bloom filter for cheaper). Drop duplicates before counting.' },
    ],
    deepDives: [
      { title: 'Why exactly-once is non-negotiable', body: 'Double counting = double-charging an advertiser = fraud and legal exposure. Kafka transactions + Flink checkpointing + idempotent OLAP writes get you exactly-once end-to-end.' },
      { title: 'Bot detection', body: 'Honeypot ads (invisible to humans), heuristics (impossible CTR per IP), ML classifiers on traffic patterns. Bad clicks reach OLAP but are marked invalid.' },
      { title: 'Late events', body: 'Mobile clicks queued offline can arrive hours later. Choose: bucket by event time (correct, more state), or bucket by ingest time (simpler, slightly wrong).' },
    ],
    tradeoffs: [
      'Exact counts cost more state than approximate. Billing demands exact.',
      'Real-time dashboard vs end-of-day reconciliation: usually both, with the dashboard marked "preliminary".',
      'Fraud detection is endless. Treat as separate, evolving system.',
    ],
    punchline: 'A signed click → Kafka → Flink with dedup state → OLAP. Exact, replayable, audit-friendly.',
  },

  // 17
  {
    id: 'news-aggregator',
    title: 'News Aggregator',
    emoji: '📡',
    tagline: 'Read the internet for everyone, dedupe a thousand "Apple announces" stories.',
    prompt: 'Design a news aggregator like Google News.',
    difficulty: 'medium',
    functional: [
      'Pull articles from many sources',
      'Cluster articles covering the same event',
      'Rank and personalize',
    ],
    nonFunctional: [
      'Near-real-time as news breaks',
      'Multi-language support',
      'Quality + diversity (no echo chambers)',
    ],
    capacity: [
      { label: 'Sources', value: '~50k' },
      { label: 'Articles / day', value: '~5M' },
    ],
    diagram: {
      layers: [
        [{ id: 'srcs', label: 'News sites + RSS', kind: 'external' }],
        [{ id: 'crawl', label: 'Crawler / Ingestor', kind: 'service' }],
        [{ id: 'q', label: 'Article Q', kind: 'queue' }],
        [
          { id: 'extract', label: 'Extractor', kind: 'service' },
          { id: 'embed', label: 'Embedding Svc', kind: 'service' },
          { id: 'cluster', label: 'Story Clusterer', kind: 'service' },
        ],
        [
          { id: 'vecdb', label: 'Vector DB', kind: 'db' },
          { id: 'stories', label: 'Stories DB', kind: 'db' },
        ],
        [{ id: 'feed', label: 'Feed Svc / API', kind: 'service' }],
      ],
      edges: [
        { from: 'srcs', to: 'crawl' },
        { from: 'crawl', to: 'q' },
        { from: 'q', to: 'extract' },
        { from: 'extract', to: 'embed' },
        { from: 'embed', to: 'vecdb' },
        { from: 'embed', to: 'cluster' },
        { from: 'cluster', to: 'stories' },
        { from: 'feed', to: 'stories' },
      ],
    },
    walkthrough: [
      { title: '1. Ingest from many shapes', body: 'RSS, sitemap, direct partner feeds, scraping for laggards. Normalize to {title, body, source, ts, lang}.' },
      { title: '2. Extract clean content', body: 'Strip nav/ads using boilerplate-removal (e.g., readability algorithm). Detect language. Extract entities.' },
      { title: '3. Embed and cluster', body: 'Compute a vector embedding per article. Cluster by cosine similarity — articles within ε of each other = same story. Store as a story with N article members.' },
      { title: '4. Rank & personalize', body: 'Per user feed = (recent stories) × (interest signals) × (source diversity penalty). ML reranker on the top candidates.' },
    ],
    deepDives: [
      { title: 'Streaming clustering', body: 'New articles arrive continuously. Maintain story centroids; assign incoming articles to nearest centroid or seed a new one if too far.' },
      { title: 'Source quality', body: 'Up-rank verified sources; penalize known low-quality / spam farms. Quality score per source updated periodically.' },
      { title: 'Echo-chamber mitigation', body: 'Force topic / source diversity in the final feed. Otherwise users get 100 articles from the same publisher about the same event.' },
    ],
    tradeoffs: [
      'Cluster boundaries are fuzzy — too tight = duplicate stories, too loose = unrelated articles bundled.',
      'Personalization vs diversity: pure personalization narrows the world.',
      'Crawl freshness vs politeness — partner feeds beat scraping for both.',
    ],
    punchline: 'It\'s a crawler + vector search clustering + a ranked feed. The product is the clustering quality.',
  },

  // 18
  {
    id: 'yelp',
    title: 'Yelp',
    emoji: '⭐',
    tagline: 'Find the nearest tacos. Rank by stars. Defeat the spammers.',
    prompt: 'Design Yelp — local business listings, search, reviews.',
    difficulty: 'medium',
    functional: [
      'Search businesses by location + category',
      'View ratings, reviews, photos',
      'Post a review',
      'Detect fake reviews',
    ],
    nonFunctional: [
      'Sub-second search',
      'Geo-aware results',
      'Heavy reads, moderate writes',
    ],
    capacity: [
      { label: 'Businesses', value: '~10M' },
      { label: 'Search QPS', value: '~100k' },
      { label: 'Reviews', value: '~500M' },
    ],
    diagram: {
      layers: [
        [{ id: 'user', label: 'User', kind: 'client' }],
        [{ id: 'api', label: 'API', kind: 'api' }],
        [
          { id: 'search', label: 'Search Svc', kind: 'service' },
          { id: 'biz', label: 'Business Svc', kind: 'service' },
          { id: 'review', label: 'Review Svc', kind: 'service' },
        ],
        [
          { id: 'es', label: 'Elasticsearch', kind: 'search', sub: 'geo + text' },
          { id: 'db', label: 'Postgres', kind: 'db', sub: 'biz + reviews' },
          { id: 'cdn', label: 'CDN', kind: 'cdn', sub: 'photos' },
        ],
      ],
      edges: [
        { from: 'user', to: 'api' },
        { from: 'api', to: 'search', label: 'search' },
        { from: 'search', to: 'es' },
        { from: 'api', to: 'biz' },
        { from: 'biz', to: 'db' },
        { from: 'api', to: 'review' },
        { from: 'review', to: 'db' },
        { from: 'review', to: 'es', dashed: true, label: 'reindex' },
        { from: 'user', to: 'cdn', dashed: true },
      ],
    },
    walkthrough: [
      { title: '1. Store source of truth in Postgres', body: 'Businesses, reviews, users — relational, low write rate, transactional. PostGIS handles geo for the relational view.' },
      { title: '2. Mirror to Elasticsearch for search', body: 'Geo-search + full-text + faceted filters (price, category, open-now) are exactly ES\'s sweet spot. CDC from Postgres keeps it fresh.' },
      { title: '3. Photos in object store + CDN', body: 'Reviewers upload directly with presigned URLs. CDN serves globally. DB only holds metadata.' },
      { title: '4. Rank reviews', body: 'Yelp\'s real magic — their classifier rates review trustworthiness (helpful votes, reviewer history, network signals, language patterns). "Filtered" reviews don\'t count toward the star average.' },
    ],
    deepDives: [
      { title: 'Geo + text + filters in one query', body: 'ES supports geo_distance filters combined with text relevance and aggregations. Tune relevance to weight distance and recency appropriately.' },
      { title: 'Star-rating sketches', body: 'Re-computing average per query is wasteful. Maintain (sum, count) per business; update on each new/edited/deleted review.' },
      { title: 'Fake review detection', body: 'Features: review velocity per user, IP/device clusters, semantic similarity to other reviews, account age. Updated continuously.' },
    ],
    tradeoffs: [
      'ES + Postgres dual-write requires CDC or you\'ll drift. The outbox pattern fits perfectly.',
      'Open-now state changes per minute. Cache hours-of-operation and compute open status client- or query-side.',
      'Star average inflation is real — review weighting is a perpetual tuning project.',
    ],
    punchline: 'Postgres is truth, ES is the index, photos live behind a CDN, and the moat is fake-review detection.',
  },

  // 19
  {
    id: 'strava',
    title: 'Strava',
    emoji: '🚴',
    tagline: 'Eat GPS traces. Emit segments, leaderboards, kudos.',
    prompt: 'Design Strava — activity tracking with segments and social features.',
    difficulty: 'medium',
    functional: [
      'Record / upload an activity (GPS track)',
      'Match the track against known "segments"',
      'Per-segment leaderboards',
      'Feed of friends\' activities',
    ],
    nonFunctional: [
      'Privacy: hide home addresses',
      'Activity uploads are spiky (post-weekend ride wave)',
      'Mostly read-heavy after upload',
    ],
    capacity: [
      { label: 'Activities / day', value: '~5M' },
      { label: 'Segments', value: '~30M' },
      { label: 'GPS pts per activity', value: '~3000' },
    ],
    diagram: {
      layers: [
        [{ id: 'app', label: 'Phone / GPS', kind: 'client' }],
        [{ id: 'api', label: 'Upload API', kind: 'api' }],
        [{ id: 'q', label: 'Activity Q', kind: 'queue' }],
        [
          { id: 'match', label: 'Segment Matcher', kind: 'service' },
          { id: 'feed', label: 'Feed Svc', kind: 'service' },
        ],
        [
          { id: 'tracks', label: 'Tracks (object store)', kind: 'storage' },
          { id: 'db', label: 'Activities DB', kind: 'db' },
          { id: 'lb', label: 'Leaderboard ZSETs', kind: 'cache' },
        ],
      ],
      edges: [
        { from: 'app', to: 'api', label: 'upload .fit' },
        { from: 'api', to: 'tracks' },
        { from: 'api', to: 'q' },
        { from: 'q', to: 'match' },
        { from: 'match', to: 'db' },
        { from: 'match', to: 'lb', label: 'rank update' },
        { from: 'db', to: 'feed' },
      ],
    },
    walkthrough: [
      { title: '1. Store the raw track', body: 'Compressed GPX/FIT file → object store. DB has a row per activity referencing the blob plus summary fields (distance, time, avg HR).' },
      { title: '2. Async segment matching', body: 'Activity → queue → matcher worker. Pull candidate segments using a spatial index (the activity\'s bbox). For each candidate, check if the trace covers the segment polyline within tolerance.' },
      { title: '3. Update leaderboard', body: 'If matched, write {segment_id, user_id, time} to DB and update a Redis sorted set per segment. ZRANGEBYSCORE gives instant leaderboard reads.' },
      { title: '4. Fan out to feed', body: 'On activity finalize, emit an event → friends\' feed services pick it up. Same fan-out pattern as social networks.' },
    ],
    deepDives: [
      { title: 'Spatial pre-filter', body: 'Matching a track against 30M segments naively is O(M). Use an R-tree or grid index on segment bounding boxes — narrow to ~50 candidates before doing the expensive polyline match.' },
      { title: 'Privacy zones', body: 'Users define a radius around home/work; tracks within that radius are clipped in the stored, shared file. Without this you leak addresses.' },
      { title: 'Live segments', body: 'During a ride, the device pre-loads nearby segments and matches locally — server doesn\'t need to be in the loop for real-time UX.' },
    ],
    tradeoffs: [
      'Tolerance for "did the rider take this segment" — too tight = misses, too loose = false claims.',
      'Privacy clipping is a permanent trust feature; treat it as a first-class requirement.',
      'Async matching is slower than instant, but cheap and resilient.',
    ],
    punchline: 'An object store for tracks, a spatial index for segments, and a Redis ZSET per leaderboard.',
  },

  // 20
  {
    id: 'online-auction',
    title: 'Online Auction',
    emoji: '🔨',
    tagline: 'Take simultaneous bids on a single Beanie Baby without losing one.',
    prompt: 'Design an online auction system like eBay.',
    difficulty: 'hard',
    functional: [
      'List item with start price + end time',
      'Accept bids',
      'Show current highest bid live',
      'Settle when timer ends',
    ],
    nonFunctional: [
      'No bid lost',
      'Strict ordering of bids on hot items',
      'Live updates to all viewers',
      'Anti-sniping (last-second flurries)',
    ],
    capacity: [
      { label: 'Bids / sec (hot item)', value: '~10k peak' },
      { label: 'Active auctions', value: '~10M' },
    ],
    diagram: {
      layers: [
        [{ id: 'bidder', label: 'Bidders', kind: 'client' }],
        [{ id: 'api', label: 'API', kind: 'api' }],
        [{ id: 'bid', label: 'Bid Svc', kind: 'service' }],
        [
          { id: 'lock', label: 'Per-item lock', kind: 'cache', sub: 'serialize bids' },
          { id: 'db', label: 'Bids DB', kind: 'db' },
          { id: 'ws', label: 'WS Fanout', kind: 'stream' },
        ],
        [{ id: 'sched', label: 'Closer (cron)', kind: 'service', sub: 'settles ended auctions' }],
      ],
      edges: [
        { from: 'bidder', to: 'api', label: 'POST bid' },
        { from: 'api', to: 'bid' },
        { from: 'bid', to: 'lock', label: 'lock item' },
        { from: 'bid', to: 'db', label: 'append' },
        { from: 'bid', to: 'ws', label: 'broadcast' },
        { from: 'ws', to: 'bidder', dashed: true, label: 'new high bid' },
        { from: 'sched', to: 'db', label: 'finalize' },
      ],
    },
    walkthrough: [
      { title: '1. Serialize bids per item', body: 'All bids for item X route to one worker (partition by item_id), or grab a per-item Redis lock. Either way, no two bids race.' },
      { title: '2. Validate + persist atomically', body: 'New bid > current high? Above min increment? Write to DB and update the cached "current high" atomically.' },
      { title: '3. Broadcast', body: 'Publish to a per-auction channel; WS gateways fan out to spectators. Bid history is also written so latecomers see it.' },
      { title: '4. Settle when time\'s up', body: 'A scheduler picks up auctions whose end time has passed. Locks the auction, reads the high bid, creates the order, notifies winner + seller.' },
    ],
    deepDives: [
      { title: 'Anti-sniping', body: 'If a bid lands in the last 30s, extend the auction by 30s. Stops "snipers" winning by a millisecond and feels fair.' },
      { title: 'Hot items destroy you without partitioning', body: '10k bids/sec on one row will lock-thrash. Route by item_id to a dedicated worker / actor that owns that item\'s state in memory.' },
      { title: 'Proxy bidding (eBay-style)', body: 'Users set a max bid; system auto-bids up to that. Implementation: store max, every incoming bid triggers a virtual auto-bid from each watcher up to their max.' },
    ],
    tradeoffs: [
      'Strict ordering required on the hot path — eventual consistency is wrong here.',
      'Anti-sniping fixes fairness, frustrates strategic bidders. Worth it.',
      'Settling at scale requires a robust scheduler — Temporal/Step Functions fit.',
    ],
    punchline: 'Auctions are stateful actors per item. Lock, append, broadcast, repeat — then settle on the clock.',
  },

  // 21
  {
    id: 'price-tracker',
    title: 'Price Tracking Service',
    emoji: '📉',
    tagline: 'Watch a million Amazon listings drop $5 and notify the right human in time.',
    prompt: 'Design a price tracker like Camelcamelcamel that alerts users when watched items drop.',
    difficulty: 'medium',
    functional: [
      'User saves a watched product + target price',
      'System periodically checks the current price',
      'Notify user when price drops below target',
      'Historical price graph',
    ],
    nonFunctional: [
      'Polite scraping / respect APIs',
      'Many users watching the same SKU → coalesce',
      'Near-real-time alerts',
    ],
    capacity: [
      { label: 'Watched items', value: '~100M' },
      { label: 'Distinct products', value: '~10M' },
      { label: 'Checks / day', value: '~100M' },
    ],
    diagram: {
      layers: [
        [{ id: 'user', label: 'User', kind: 'client' }],
        [{ id: 'api', label: 'API', kind: 'api' }],
        [{ id: 'sched', label: 'Scheduler', kind: 'service', sub: 'per-product cadence' }],
        [{ id: 'q', label: 'Fetch Q', kind: 'queue' }],
        [{ id: 'workers', label: 'Fetchers (per site)', kind: 'service' }],
        [
          { id: 'prices', label: 'Prices TSDB', kind: 'db' },
          { id: 'watch', label: 'Watchlist DB', kind: 'db' },
          { id: 'notif', label: 'Notif Svc', kind: 'service' },
        ],
      ],
      edges: [
        { from: 'user', to: 'api', label: 'add watch' },
        { from: 'api', to: 'watch' },
        { from: 'sched', to: 'q' },
        { from: 'q', to: 'workers' },
        { from: 'workers', to: 'prices', label: 'append' },
        { from: 'prices', to: 'notif', dashed: true, label: 'on drop' },
        { from: 'notif', to: 'user', dashed: true, label: '📩 alert' },
      ],
    },
    walkthrough: [
      { title: '1. Coalesce by product, not by user', body: 'If 1000 users watch the same SKU, you fetch it once. Watchlist DB maps user → product; price store is keyed by product.' },
      { title: '2. Smart polling cadence', body: 'Fast-moving SKUs (laptops, GPUs) polled hourly. Stable items (books) daily. Adapt based on observed change rate per product.' },
      { title: '3. Append-only price log', body: 'Time-series DB (Timescale, InfluxDB) or a simple partitioned table. Easy to graph, cheap to query.' },
      { title: '4. Fan out alerts', body: 'On a price drop, query everyone watching with a target >= new price. Send through Notif Svc (push / email / SMS).' },
    ],
    deepDives: [
      { title: 'Polite scraping', body: 'Most retailers don\'t offer public APIs. Distribute crawlers across IPs/regions, honor robots.txt, back off on 429/403. Get blocked → game over.' },
      { title: 'Notification dedup', body: 'If the price oscillates around the target, you don\'t want to spam. Only alert on first crossing in N hours; require new "below" event after a "back above".' },
      { title: 'Historical graph', body: 'Roll up raw points into daily / weekly buckets for old data. Keeps storage bounded and graphs snappy.' },
    ],
    tradeoffs: [
      'Polling frequency vs cost / blocking risk.',
      'Per-user fan-out at price-drop time can hit huge query sizes — partition watchlist by SKU.',
      'Alert sensitivity is a UX dial, not a technical decision.',
    ],
    punchline: 'It\'s a smart scheduler, polite fetchers, an append-only price log, and a fan-out on threshold crossings.',
  },

  // 22
  {
    id: 'instagram',
    title: 'Instagram',
    emoji: '📸',
    tagline: 'Resize a photo, push it to 200 inboxes, slap a filter on it.',
    prompt: 'Design Instagram — photo upload, feed, follow graph.',
    difficulty: 'hard',
    functional: [
      'Upload photo with caption',
      'Feed of followed users\' photos',
      'Like, comment',
      'Profile pages, follow / unfollow',
    ],
    nonFunctional: [
      'Read-heavy feed',
      'Multi-resolution photo delivery',
      'Strong consistency on follow graph',
    ],
    capacity: [
      { label: 'DAU', value: '~500M' },
      { label: 'Photos / day', value: '~100M' },
      { label: 'Feed reads / sec', value: '~500k' },
    ],
    diagram: {
      layers: [
        [{ id: 'app', label: 'App', kind: 'client' }],
        [{ id: 'api', label: 'API', kind: 'api' }],
        [
          { id: 'feed', label: 'Feed Svc', kind: 'service' },
          { id: 'upload', label: 'Upload Svc', kind: 'service' },
          { id: 'graph', label: 'Graph Svc', kind: 'service' },
        ],
        [
          { id: 'inbox', label: 'Feed Inbox', kind: 'cache' },
          { id: 'photos', label: 'Photo blobs', kind: 'storage' },
          { id: 'meta', label: 'Photo / Graph DB', kind: 'db' },
        ],
        [{ id: 'cdn', label: 'CDN', kind: 'cdn' }],
      ],
      edges: [
        { from: 'app', to: 'api' },
        { from: 'api', to: 'upload' },
        { from: 'upload', to: 'photos' },
        { from: 'upload', to: 'meta' },
        { from: 'upload', to: 'inbox', dashed: true, label: 'fan-out on write' },
        { from: 'api', to: 'feed' },
        { from: 'feed', to: 'inbox' },
        { from: 'feed', to: 'meta' },
        { from: 'app', to: 'cdn', dashed: true },
      ],
    },
    walkthrough: [
      { title: '1. Upload originals + sizes', body: 'Client uploads via presigned URL → original in object store. Async worker generates thumbnails (low/med/high) and stores under predictable keys.' },
      { title: '2. Push to followers\' inboxes', body: 'Same hybrid pattern as Facebook News Feed — fan-out-on-write for normal users, pull at read time for celebs.' },
      { title: '3. Serve from CDN', body: 'Feed responses include CDN URLs sized for the device. Photos cached at edge. Your servers send a few KB of JSON, CDN sends the megabytes.' },
      { title: '4. Likes and comments', body: 'Counters in a fast KV (Redis HINCRBY). Comments in a paginated table. Both eventually consistent with the primary DB.' },
    ],
    deepDives: [
      { title: 'Filters', body: 'Apply client-side — saves bandwidth and gives the user instant preview. Server stores the filter id with the original so re-rendering is possible later.' },
      { title: 'Stories ≠ posts', body: 'Stories TTL after 24h. Separate storage tier (often Redis-backed) since they\'re ephemeral and high-velocity.' },
      { title: 'Hashtag feeds', body: 'Per-hashtag append-only list. Tail of recent posts in Redis, full history in a column store. Hot hashtags are easy; long-tail is fine.' },
    ],
    tradeoffs: [
      'Pre-resized thumbnails balloon storage. Lazy resize is cheaper but slower.',
      'Hybrid fan-out is the cost of having both regular and celebrity users.',
      'Strong consistency on the follow graph is worth it; eventual on counters.',
    ],
    punchline: 'A photo CDN with a fan-out feed engine and a follow graph. Filters are a client thing.',
  },

  // 23
  {
    id: 'robinhood',
    title: 'Robinhood',
    emoji: '📈',
    tagline: 'Stream every flicker of the market to phones, without anyone executing a typo trade.',
    prompt: 'Design a stock-trading app like Robinhood.',
    difficulty: 'hard',
    functional: [
      'Live price quotes',
      'Place buy / sell orders',
      'Portfolio view, gains, history',
      'Order types: market, limit, stop',
    ],
    nonFunctional: [
      'Sub-second quote updates',
      'Strict consistency on orders & balances',
      'Audit trail (regulatory)',
      'Spike handling during big news',
    ],
    capacity: [
      { label: 'Active users', value: '~20M' },
      { label: 'Quote updates / sec', value: '~100k symbols × ~1s' },
      { label: 'Orders / sec (peak)', value: '~10k+' },
    ],
    diagram: {
      layers: [
        [{ id: 'app', label: 'Phone', kind: 'client' }],
        [{ id: 'api', label: 'API + LB', kind: 'api' }],
        [
          { id: 'quote', label: 'Quote Svc', kind: 'service' },
          { id: 'order', label: 'Order Svc', kind: 'service' },
          { id: 'risk', label: 'Risk Engine', kind: 'service' },
        ],
        [
          { id: 'mkt', label: 'Market Data Feed', kind: 'external', sub: 'NYSE / Nasdaq' },
          { id: 'broker', label: 'Clearing Broker', kind: 'external' },
        ],
        [
          { id: 'pubsub', label: 'Quote Bus', kind: 'stream' },
          { id: 'db', label: 'Orders / Positions DB', kind: 'db' },
          { id: 'ledger', label: 'Cash Ledger', kind: 'db', sub: 'double-entry' },
        ],
      ],
      edges: [
        { from: 'mkt', to: 'quote' },
        { from: 'quote', to: 'pubsub' },
        { from: 'pubsub', to: 'app', dashed: true, label: 'WS ticks' },
        { from: 'app', to: 'api', label: 'place order' },
        { from: 'api', to: 'order' },
        { from: 'order', to: 'risk', label: 'can afford?' },
        { from: 'risk', to: 'ledger' },
        { from: 'order', to: 'broker' },
        { from: 'order', to: 'db' },
      ],
    },
    walkthrough: [
      { title: '1. Ingest market data', body: 'Subscribe to exchange data feeds (SIP, direct feeds). Normalize and republish on an internal high-throughput bus (Kafka or a UDP multicast bus).' },
      { title: '2. Push quotes to phones', body: 'WS subscriptions: each client subscribes to symbols visible on their screen. Server only sends ticks for those symbols. Coalesce updates if client is slow.' },
      { title: '3. Place orders with risk checks', body: 'Order request → risk engine checks buying power, regulatory limits, position concentration. On pass, send to clearing broker; persist as PENDING.' },
      { title: '4. Settle in the ledger', body: 'Every cash and share movement is a double-entry ledger row. Balances are always derivable; audits are non-negotiable.' },
    ],
    deepDives: [
      { title: 'Why double-entry', body: 'It\'s the only schema that survives a regulator. Sum of debits == sum of credits, always. Bugs become visible as imbalances, not silent corruption.' },
      { title: 'Backpressure on quote streams', body: 'During news events, ticks 10×. Slow phones can\'t consume. Server-side: drop intermediate ticks per symbol, only send the latest. Never block the producer.' },
      { title: 'Idempotent order placement', body: 'Client-generated UUID per order. Server INSERTs with unique constraint. Retries cannot double-execute.' },
    ],
    tradeoffs: [
      'Quote freshness vs cost. Sub-100ms is the user expectation.',
      'Self-clearing vs partner clearing — partner is faster to launch, more dependency.',
      'Real-time risk checks add latency to order path but are non-negotiable.',
    ],
    punchline: 'Streams of quotes + a strict order pipeline + a double-entry ledger. The regulator is in the room.',
  },

  // 24
  {
    id: 'google-docs',
    title: 'Google Docs',
    emoji: '✍️',
    tagline: 'Let three humans type into the same paragraph without it turning into Esperanto.',
    prompt: 'Design Google Docs — real-time collaborative editing.',
    difficulty: 'hard',
    functional: [
      'Multiple users edit the same document live',
      'See everyone\'s cursors and selections',
      'Persistent edits',
      'Offline edits sync on reconnect',
    ],
    nonFunctional: [
      'Convergence: all users end up with the same document',
      'Sub-second latency',
      'No edits lost',
    ],
    capacity: [
      { label: 'Concurrent editors per doc', value: '~10s' },
      { label: 'Live docs', value: 'millions' },
    ],
    diagram: {
      layers: [
        [
          { id: 'a', label: 'Alice', kind: 'client' },
          { id: 'b', label: 'Bob', kind: 'client' },
        ],
        [{ id: 'ws', label: 'WS Gateway', kind: 'api', sub: 'doc-sticky' }],
        [{ id: 'doc', label: 'Doc Server (per doc)', kind: 'service', sub: 'OT / CRDT' }],
        [
          { id: 'ops', label: 'Op Log', kind: 'db', sub: 'append-only' },
          { id: 'snap', label: 'Snapshots', kind: 'storage' },
        ],
      ],
      edges: [
        { from: 'a', to: 'ws', label: 'op' },
        { from: 'b', to: 'ws', label: 'op' },
        { from: 'ws', to: 'doc' },
        { from: 'doc', to: 'ops', label: 'append' },
        { from: 'doc', to: 'a', dashed: true, label: 'broadcast' },
        { from: 'doc', to: 'b', dashed: true, label: 'broadcast' },
        { from: 'ops', to: 'snap', dashed: true, label: 'compact' },
      ],
    },
    walkthrough: [
      { title: '1. Edits are operations', body: 'Don\'t send "the new doc state" — send "insert \'a\' at position 17". Operations are small, ordered, mergeable.' },
      { title: '2. Operational Transformation (OT) or CRDT', body: 'When Alice and Bob both insert at the same position, naive ops break. OT rewrites incoming ops against concurrent ones; CRDTs use position metadata that\'s commutative by design.' },
      { title: '3. One authoritative server per doc', body: 'Route all ops for doc X to a single process (consistent hash on doc_id). It linearizes ops, persists, broadcasts. Replicas exist for failover.' },
      { title: '4. Periodic snapshots', body: 'Op log grows forever. Every N ops, snapshot the doc state. New clients load snapshot + tail of ops.' },
    ],
    deepDives: [
      { title: 'OT vs CRDT', body: 'OT (Google Docs) needs the server in the loop. CRDTs (Figma, Apple Notes) can converge peer-to-peer. CRDTs have heavier metadata; OT has the global ordering server.' },
      { title: 'Cursor presence', body: 'A separate, ephemeral channel — cursor moves shouldn\'t hit the op log. Lightweight messages with TTL-style cleanup.' },
      { title: 'Offline edits', body: 'Local ops are queued, replayed against the server on reconnect. With CRDTs this just merges; with OT the server rewrites them.' },
    ],
    tradeoffs: [
      'OT is simpler to reason about server-centric but harder to write correctly.',
      'CRDT metadata bloats large docs.',
      'Per-doc single-writer is great for consistency, painful for scaling celebrity docs.',
    ],
    punchline: 'A doc is an op log with snapshots. The whole game is "what happens when two ops collide?"',
  },

  // 25
  {
    id: 'distributed-cache',
    title: 'Distributed Cache',
    emoji: '⚡',
    tagline: 'Build a thing like Memcached or Redis Cluster, but actually understand it.',
    prompt: 'Design a distributed in-memory cache.',
    difficulty: 'medium',
    functional: [
      'GET / SET / DELETE by key',
      'TTL per key',
      'Linear scale by adding nodes',
    ],
    nonFunctional: [
      'Sub-ms latency',
      'High availability',
      'Even key distribution',
      'Survives node addition / removal',
    ],
    capacity: [
      { label: 'Ops / sec', value: '~10M+ across cluster' },
      { label: 'Total memory', value: 'TBs' },
    ],
    diagram: {
      layers: [
        [{ id: 'app', label: 'App', kind: 'client' }],
        [{ id: 'cli', label: 'Smart Client', kind: 'service', sub: 'ring-aware' }],
        [
          { id: 'n1', label: 'Node A', kind: 'cache' },
          { id: 'n2', label: 'Node B', kind: 'cache' },
          { id: 'n3', label: 'Node C', kind: 'cache' },
        ],
        [{ id: 'gossip', label: 'Gossip / Coordinator', kind: 'service' }],
      ],
      edges: [
        { from: 'app', to: 'cli', label: 'GET k' },
        { from: 'cli', to: 'n1', label: 'hash(k) → A' },
        { from: 'cli', to: 'n2', dashed: true, label: 'replica' },
        { from: 'n1', to: 'gossip', dashed: true, label: 'heartbeat' },
        { from: 'gossip', to: 'cli', dashed: true, label: 'topology' },
      ],
    },
    walkthrough: [
      { title: '1. Consistent hashing for placement', body: 'Hash key onto a ring. Key lives on the next node clockwise. Virtual nodes per physical node smooth distribution. Adding a node moves only K/N keys.' },
      { title: '2. Replication for HA', body: 'Each key stored on the next R nodes clockwise. Reads can hit any replica; writes go to all (or to primary + async to replicas).' },
      { title: '3. Smart clients', body: 'Clients hold the topology and route directly — no proxy hop. Topology updates via gossip or a coordinator service.' },
      { title: '4. Eviction & TTL', body: 'Per-node LRU + active TTL expiry. When memory pressure spikes, evict cold items. TTLs free memory automatically.' },
    ],
    deepDives: [
      { title: 'Failure detection', body: 'Gossip-based phi accrual failure detector (Cassandra) or heartbeat-based with a coordinator (Redis Sentinel). Avoid false positives — a wrongly-dead node hurts more than briefly dead.' },
      { title: 'Hot keys', body: 'A single super-popular key stays on one node and bottlenecks. Mitigations: local caching at clients, key splitting (copies under suffixed keys), or proxy-level cache.' },
      { title: 'Multi-DC', body: 'Async replication across DCs. Reads local-first. Cross-DC consistency is eventual — explicit invalidation on writes.' },
    ],
    tradeoffs: [
      'Consistent hashing handles topology changes gracefully but isn\'t free — clients must learn the ring.',
      'Strong vs eventual consistency on writes: stronger = slower across DCs.',
      'Memcached (no persistence) is simpler. Redis (optional persistence) is more flexible.',
    ],
    punchline: 'Consistent hashing + replication + smart clients + gossip. Everything else is eviction policy.',
  },
];

export function questionById(id: string): SystemDesignQuestion | undefined {
  return QUESTIONS.find(q => q.id === id);
}

export const Q_DIFFICULTY_STYLE: Record<QDifficulty, { label: string; bg: string; fg: string }> = {
  easy:   { label: 'Easy',   bg: '#ECFDF5', fg: '#047857' },
  medium: { label: 'Medium', bg: '#FFF7ED', fg: '#C2410C' },
  hard:   { label: 'Hard',   bg: '#FEF2F2', fg: '#B91C1C' },
};
