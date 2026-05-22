export type TopicCategory = 'core' | 'pattern' | 'deepdive';
export type TopicDifficulty = 'foundational' | 'intermediate' | 'advanced';

// ── Deep content block system (hellointerview-style long form) ─────

import type { ArchDiagram } from './systemDesignQuestions';
import { DEEP_CONTENT } from './interviewPrepDeepContent';

export type CalloutKind = 'tip' | 'info' | 'warn' | 'pitfall' | 'interview';

export type DeepBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }                                       // h3
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; lang?: string; code: string }
  | { type: 'callout'; kind: CalloutKind; title?: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'compare'; aTitle: string; bTitle: string; aPoints: string[]; bPoints: string[] }
  | { type: 'kv'; title?: string; items: { k: string; v: string }[] }
  | { type: 'diagram'; diagram: ArchDiagram; caption?: string };

export interface DeepSection {
  id: string;
  title: string;
  blocks: DeepBlock[];
}

export interface InterviewTopic {
  id: string;
  title: string;
  category: TopicCategory;
  difficulty: TopicDifficulty;
  tagline: string;
  overview: string;
  keyConcepts: { title: string; body: string }[];
  whenToUse?: string[];
  tradeoffs?: { pro: string; con: string }[];
  commonQuestions: string[];
  numbers?: { label: string; value: string }[];
  relatedIds?: string[];
  /** Hellointerview-style long-form content. Rendered as the primary view when present. */
  deep?: DeepSection[];
}

export const TOPICS: InterviewTopic[] = [
  // ────── CORE CONCEPTS ──────
  {
    id: 'networking-essentials',
    title: 'Networking Essentials',
    category: 'core',
    difficulty: 'foundational',
    tagline: 'OSI layers, TCP vs UDP, HTTP, DNS — the glue of every system.',
    overview:
      'Every distributed system communicates across networks. Understanding how packets flow, where latency comes from, and which protocol fits a use case is the bedrock of system design.',
    keyConcepts: [
      { title: 'OSI model', body: 'Physical → Data Link → Network (IP) → Transport (TCP/UDP) → Session → Presentation → Application (HTTP, gRPC, WS).' },
      { title: 'TCP vs UDP', body: 'TCP gives reliable, ordered, congestion-controlled delivery. UDP is fire-and-forget — lower latency, no retries. Use UDP for video/voice/gaming, TCP for everything else by default.' },
      { title: 'HTTP/1.1 vs HTTP/2 vs HTTP/3', body: 'HTTP/2 multiplexes streams over one TCP connection. HTTP/3 runs on QUIC (UDP) and avoids head-of-line blocking.' },
      { title: 'DNS', body: 'Hierarchical lookup: root → TLD → authoritative. TTLs control caching. Latency-sensitive systems pre-resolve or use Anycast.' },
      { title: 'TLS handshake', body: '1.3 needs 1-RTT (or 0-RTT with resumption). Adds ~tens of ms — a big chunk of small-request latency.' },
      { title: 'WebSockets vs SSE vs polling', body: 'WS = full-duplex. SSE = server→client only, runs over HTTP. Polling = simplest but wastes requests.' },
    ],
    commonQuestions: [
      'When would you choose UDP over TCP?',
      'Walk me through what happens when a user types example.com in the browser.',
      'How does HTTP/2 improve over HTTP/1.1?',
      'How would you reduce DNS lookup latency for a global service?',
    ],
    numbers: [
      { label: 'Same-DC RTT', value: '~0.5 ms' },
      { label: 'Cross-region RTT (US ↔ EU)', value: '~80 ms' },
      { label: 'TLS 1.3 handshake', value: '1 RTT' },
    ],
    relatedIds: ['api-design', 'numbers-to-know'],
  },
  {
    id: 'api-design',
    title: 'API Design',
    category: 'core',
    difficulty: 'foundational',
    tagline: 'REST, gRPC, GraphQL — picking the right contract for the job.',
    overview:
      'APIs are the contract between services. Good API design balances ergonomics, performance, versioning, and evolvability. Interviewers care less about your protocol choice and more about your reasoning.',
    keyConcepts: [
      { title: 'REST', body: 'Resource-oriented. Stateless. Cache-friendly via HTTP verbs and status codes. Best for public APIs and CRUD.' },
      { title: 'gRPC', body: 'Binary protobuf over HTTP/2. Strongly typed, fast, supports streaming. Best for internal service-to-service calls.' },
      { title: 'GraphQL', body: 'Client specifies exactly what fields it needs. Great when one backend serves many client shapes (mobile + web). Watch for N+1 and over-fetching server-side.' },
      { title: 'Pagination', body: 'Offset = simple but slow on deep pages. Cursor = stable under inserts, scales to billions.' },
      { title: 'Idempotency', body: 'Mutating endpoints should accept an idempotency-key so retries are safe. Critical for payments and signups.' },
      { title: 'Versioning', body: 'URI versioning (/v1/), header versioning, or backwards-compatible field evolution. Never break clients silently.' },
      { title: 'Rate limiting', body: 'Token bucket or leaky bucket. Return 429 with Retry-After. Protect downstream dependencies.' },
    ],
    whenToUse: [
      'Public API → REST (familiar, cacheable, debuggable).',
      'Internal microservices → gRPC (performance, typing).',
      'Mobile / multi-client → GraphQL (avoid round-trips).',
    ],
    commonQuestions: [
      'Design the API for a Twitter-like feed.',
      'How would you version a public API without breaking clients?',
      'Cursor vs offset pagination — when does cursor matter?',
      'How do you make a POST endpoint safely retryable?',
    ],
    relatedIds: ['caching', 'numbers-to-know'],
  },
  {
    id: 'data-modeling',
    title: 'Data Modeling',
    category: 'core',
    difficulty: 'foundational',
    tagline: 'Shape your schema for the queries you actually run.',
    overview:
      'Schema design is access-pattern design. The "right" model depends on what queries you serve, how data scales, and consistency requirements. Normalize for writes, denormalize for reads — but always know which one you are doing.',
    keyConcepts: [
      { title: 'Normalization vs denormalization', body: 'Normalization removes redundancy and write anomalies. Denormalization (or materialized views) speeds reads at the cost of write amplification.' },
      { title: 'Entities vs relationships', body: 'Start with entities (User, Post, Order), then model relationships (1:1, 1:N, N:M). Junction tables for N:M in SQL.' },
      { title: 'Access patterns first (NoSQL)', body: 'In DynamoDB/Cassandra, model around queries. Partition key + sort key drives everything. Pre-join via composite keys.' },
      { title: 'Time-series data', body: 'Bucket by time window. Use compound keys (deviceId, time). Hot partition risk if too coarse.' },
      { title: 'Schema evolution', body: 'Additive changes are safe. Renames and deletes need migration steps and dual-write windows.' },
      { title: 'Soft delete', body: 'is_deleted flag preserves audit trail and undo. Adds query overhead — index appropriately.' },
    ],
    commonQuestions: [
      'Model the data for Airbnb listings, bookings, and reviews.',
      'How would you model a social graph (followers/following)?',
      'When would you denormalize, and what does it cost you?',
      'Design a schema for a chat app at WhatsApp scale.',
    ],
    relatedIds: ['database-indexing', 'sharding', 'cassandra', 'dynamodb'],
  },
  {
    id: 'caching',
    title: 'Caching',
    category: 'core',
    difficulty: 'foundational',
    tagline: 'Trade memory for latency. Choose your invalidation strategy carefully.',
    overview:
      'Caching is one of the highest-leverage optimisations in distributed systems. The hard part is not adding a cache — it is keeping it correct.',
    keyConcepts: [
      { title: 'Cache locations', body: 'Browser → CDN → API Gateway → App-local → Distributed cache (Redis) → DB buffer pool. Each layer cuts latency 10×.' },
      { title: 'Read patterns', body: 'Cache-aside: app reads cache, falls back to DB, writes back. Read-through: cache itself loads on miss. Write-through: writes go to cache + DB synchronously.' },
      { title: 'Write patterns', body: 'Write-back: write to cache, flush to DB async (fast, risky). Write-around: bypass cache on writes (avoids cache pollution for write-heavy workloads).' },
      { title: 'Eviction', body: 'LRU (most common), LFU (frequency-based), TTL (time-based), FIFO. Hot-key problem when one item dominates.' },
      { title: 'Invalidation', body: '"There are only two hard things in CS: cache invalidation and naming things." Use short TTLs as a safety net even with explicit invalidation.' },
      { title: 'Thundering herd', body: 'When a hot key expires, every replica stampedes the DB. Mitigate with request coalescing, jittered TTLs, or a refresh-ahead pattern.' },
    ],
    tradeoffs: [
      { pro: 'Massive latency reduction', con: 'Stale reads' },
      { pro: 'Offloads expensive backends', con: 'Extra failure mode + cost' },
      { pro: 'Smooths spike traffic', con: 'Cache warm-up after restarts' },
    ],
    commonQuestions: [
      'Design a caching layer for a news feed.',
      'How do you handle cache stampedes?',
      'Write-through vs write-back — when is each appropriate?',
      'How do you invalidate the cache when underlying data changes?',
    ],
    relatedIds: ['redis', 'scaling-reads', 'numbers-to-know'],
  },
  {
    id: 'sharding',
    title: 'Sharding',
    category: 'core',
    difficulty: 'intermediate',
    tagline: 'Split data across machines when one box is not enough.',
    overview:
      'When a single node can no longer hold your data or serve your QPS, you partition. Sharding is conceptually simple but operationally tricky — picking the wrong shard key creates hot spots that no amount of hardware can fix.',
    keyConcepts: [
      { title: 'Sharding strategies', body: 'Range: ordered keys, good for range scans, bad for hotspots (e.g. recent timestamps). Hash: even distribution, no range scans. Geographic: shard by user region. Directory-based: lookup service maps key → shard.' },
      { title: 'Shard key selection', body: 'High cardinality, evenly distributed, present on every query. Bad keys: country (skewed), boolean (low cardinality), monotonic (hotspot).' },
      { title: 'Resharding', body: 'The hardest operation. Pre-create more logical shards than nodes (virtual shards) so you only move shards, not re-hash data.' },
      { title: 'Cross-shard queries', body: 'Joins and global aggregations get expensive. Either denormalize, scatter-gather, or maintain a separate analytics store.' },
      { title: 'Replication vs sharding', body: 'Replication = copies of the same data (read scale + HA). Sharding = different data per node (write scale + capacity). Most systems do both.' },
    ],
    commonQuestions: [
      'How would you shard a billion-user database?',
      'Your top 1% of users generate 50% of traffic — how do you shard?',
      'How do you reshard without downtime?',
      'Trade-offs between range and hash sharding?',
    ],
    relatedIds: ['consistent-hashing', 'data-modeling', 'cassandra'],
  },
  {
    id: 'consistent-hashing',
    title: 'Consistent Hashing',
    category: 'core',
    difficulty: 'intermediate',
    tagline: 'Add and remove nodes without re-hashing the world.',
    overview:
      'With naive modulo-N hashing, adding one node remaps almost every key. Consistent hashing places nodes and keys on a ring so only K/N keys move when a node joins or leaves — the foundation for Dynamo, Cassandra, Memcached clusters, and many CDNs.',
    keyConcepts: [
      { title: 'The ring', body: 'Hash both nodes and keys onto a 0..2^32 circle. A key belongs to the next node clockwise.' },
      { title: 'Virtual nodes', body: 'Each physical node owns many points on the ring (typically 100–200). Smooths distribution and lets you weight nodes by capacity.' },
      { title: 'Replication', body: 'Store each key on the next N nodes clockwise. Handles failures and reads from replicas.' },
      { title: 'Failures', body: 'When a node dies, its keys flow to the next clockwise node. When it rejoins, only its slice moves back.' },
      { title: 'Alternatives', body: 'Rendezvous (HRW) hashing avoids the ring entirely. Jump consistent hash is faster for fixed-N use cases.' },
    ],
    commonQuestions: [
      'Why is consistent hashing needed if modulo-N already distributes evenly?',
      'How do virtual nodes solve the uneven-distribution problem?',
      'When would you use rendezvous hashing instead?',
      'Walk through what happens to keys when a node is added.',
    ],
    relatedIds: ['sharding', 'cassandra', 'dynamodb'],
  },
  {
    id: 'cap-theorem',
    title: 'CAP Theorem',
    category: 'core',
    difficulty: 'intermediate',
    tagline: 'During a partition, choose: consistency or availability.',
    overview:
      'CAP says that in the presence of a network partition, a distributed system must choose between Consistency (every read sees the latest write) and Availability (every request gets a non-error response). In practice the choice is per-operation, not per-system.',
    keyConcepts: [
      { title: 'The three properties', body: 'C: linearizable reads. A: every non-failing node responds. P: system keeps working when network drops messages. P is non-negotiable in real distributed systems.' },
      { title: 'CP systems', body: 'Refuse writes during partition to stay consistent. Examples: ZooKeeper, etcd, HBase, traditional RDBMS in master-failover.' },
      { title: 'AP systems', body: 'Accept writes everywhere, reconcile later. Examples: Cassandra, DynamoDB (configurable), Riak, S3.' },
      { title: 'PACELC', body: 'Else (no partition), trade Latency for Consistency. Most production decisions are actually about PACELC, not CAP.' },
      { title: 'Tunable consistency', body: 'Dynamo-style systems let you set R + W > N per request, picking your spot on the spectrum.' },
    ],
    commonQuestions: [
      'When is sacrificing consistency acceptable?',
      'How does Cassandra let you tune CAP per query?',
      'Why is "CA without P" a myth in distributed systems?',
      'Explain PACELC and why it matters more than CAP day-to-day.',
    ],
    relatedIds: ['cassandra', 'dynamodb', 'zookeeper'],
  },
  {
    id: 'database-indexing',
    title: 'Database Indexing',
    category: 'core',
    difficulty: 'foundational',
    tagline: 'Trade write cost for query speed — and learn to read EXPLAIN.',
    overview:
      'Indexes turn O(N) scans into O(log N) lookups. The art is knowing which indexes pay for themselves and which slow you down silently.',
    keyConcepts: [
      { title: 'B-tree indexes', body: 'Default for OLTP. Ordered, supports range scans, equality, and prefix matching. Log-N height.' },
      { title: 'Hash indexes', body: 'O(1) equality, no range. Used in memory stores (Redis, MySQL Memory tables).' },
      { title: 'LSM trees', body: 'Append-only, batch-merged. Fast writes, slower point reads. Powers Cassandra, RocksDB, LevelDB.' },
      { title: 'Composite indexes', body: 'Index on (a, b, c) helps queries filtering by a, or a+b, or a+b+c — never just b or c. Order matters.' },
      { title: 'Covering indexes', body: 'Include all columns the query needs so the engine skips the table lookup ("index-only scan").' },
      { title: 'Cost of indexes', body: 'Every index slows down INSERT/UPDATE/DELETE. Audit and drop unused ones.' },
      { title: 'Cardinality', body: 'Low-cardinality columns (boolean, status) make poor B-tree indexes. Use bitmap indexes or partial indexes.' },
    ],
    commonQuestions: [
      'Why is your query slow even though there is an index on the column?',
      'When would a full table scan beat an index?',
      'Design indexes for a query that filters by (user_id, status, created_at).',
      'How does an LSM tree differ from a B-tree, and when is each better?',
    ],
    relatedIds: ['postgresql', 'cassandra'],
  },
  {
    id: 'numbers-to-know',
    title: 'Numbers to Know',
    category: 'core',
    difficulty: 'foundational',
    tagline: 'Order-of-magnitude latencies and capacity numbers every engineer carries.',
    overview:
      'Knowing rough numbers lets you do back-of-envelope sizing instantly: "We have 10M DAU, 100 requests each → 1B/day → ~12K QPS average, 60K peak." Below are the numbers you should never have to look up.',
    keyConcepts: [
      { title: 'Latency hierarchy', body: 'L1 cache ~1ns, RAM ~100ns, SSD random read ~100µs, network round-trip same DC ~0.5ms, cross-region ~80ms, disk seek ~10ms.' },
      { title: 'Throughput', body: 'Modern NIC: 10 Gbps ≈ 1.25 GB/s. NVMe SSD: ~3 GB/s sequential. Redis single node: ~100K ops/sec. Postgres single node: ~10–50K writes/sec.' },
      { title: 'Storage', body: 'A char ≈ 1 byte. UUID = 16 bytes. Typical row 100–500 bytes. 1B rows × 200 bytes ≈ 200 GB.' },
      { title: 'Time conversions', body: '1 day = 86,400 s. 1 month ≈ 2.5M s. 1 year ≈ 30M s.' },
      { title: 'Scale by 1000s', body: 'K=10³, M=10⁶, B=10⁹, T=10¹². 1 Gbps full = ~10TB/day.' },
    ],
    numbers: [
      { label: 'L1 cache reference', value: '~1 ns' },
      { label: 'RAM access', value: '~100 ns' },
      { label: 'SSD random read', value: '~100 µs' },
      { label: 'Same-DC network RTT', value: '~0.5 ms' },
      { label: 'Disk seek (HDD)', value: '~10 ms' },
      { label: 'US ↔ EU round-trip', value: '~80 ms' },
      { label: 'Redis ops/sec (single node)', value: '~100K' },
      { label: 'Kafka throughput per broker', value: '~1 GB/s' },
      { label: 'Postgres writes/sec', value: '~10–50K' },
      { label: 'Seconds in a day', value: '86,400' },
    ],
    commonQuestions: [
      'How many requests/sec for 100M DAU each doing 50 actions/day?',
      'How much storage for 1B messages of avg 200 bytes?',
      'Can a single Redis node handle our 50K QPS read workload?',
      'Estimate the bandwidth for 1M concurrent 720p video streams.',
    ],
  },

  // ────── PATTERNS ──────
  {
    id: 'real-time-updates',
    title: 'Real-time Updates',
    category: 'pattern',
    difficulty: 'intermediate',
    tagline: 'Push fresh data to clients — without melting your servers.',
    overview:
      'From chat to live dashboards to multiplayer games, real-time UX means server-pushed data. The right transport depends on direction, frequency, and scale.',
    keyConcepts: [
      { title: 'Long polling', body: 'Client opens HTTP, server holds until data arrives. Simple, works through any proxy, but holds connections.' },
      { title: 'Server-Sent Events (SSE)', body: 'One-way server→client stream over HTTP. Auto-reconnect built in. Great for feeds, notifications.' },
      { title: 'WebSockets', body: 'Full-duplex, low overhead. Best for chat, collab editors, games. Stateful — load balancing needs sticky sessions or a pub/sub fan-out.' },
      { title: 'Pub/sub fan-out', body: 'Frontend servers subscribe to Redis/Kafka topics. When a backend event fires, it publishes once and all interested WS connections receive it.' },
      { title: 'Backpressure', body: 'Slow clients buffer messages. Drop, batch, or disconnect — never block the producer.' },
      { title: 'Presence and ordering', body: 'Heartbeats detect disconnects. Sequence numbers let clients recover missed messages on reconnect.' },
    ],
    commonQuestions: [
      'Design a chat app like WhatsApp for 1B users.',
      'How would you build a live sports score system?',
      'WebSockets vs SSE — when do you pick which?',
      'How do you scale WebSockets to millions of connections?',
    ],
    relatedIds: ['kafka', 'redis', 'networking-essentials'],
  },
  {
    id: 'dealing-with-contention',
    title: 'Dealing with Contention',
    category: 'pattern',
    difficulty: 'intermediate',
    tagline: 'When N requests fight for the same row, who wins?',
    overview:
      'Inventory decrements, ticket bookings, account balances — anywhere multiple requests touch the same item, you need a contention strategy. Otherwise you sell the same seat twice.',
    keyConcepts: [
      { title: 'Pessimistic locking', body: 'SELECT ... FOR UPDATE. Holds a row lock until commit. Safe but serializes throughput on hot rows.' },
      { title: 'Optimistic locking', body: 'Read with version, check-and-set on write. Cheap if conflicts are rare. Retries cost more if conflicts are common.' },
      { title: 'Distributed locks', body: 'Redis Redlock or ZooKeeper ephemeral nodes. Lease-based — always set a TTL so a crashed holder unblocks.' },
      { title: 'Atomic counters', body: 'Redis INCR, DynamoDB ADD. Single-op, no lock needed. Best for counters and rate limiters.' },
      { title: 'Token-based serialization', body: 'Route all writes for a given key to one consumer (e.g., partition by user_id in Kafka). The hot row never has two writers.' },
      { title: 'Idempotency', body: 'Even after retries, the operation must happen at most once. Use idempotency keys + dedupe store.' },
    ],
    commonQuestions: [
      'Design Ticketmaster — how do you prevent double-booking?',
      'Pessimistic vs optimistic — when does each win?',
      'How would you build a global, fair-rate limiter?',
      'How does Stripe avoid charging a card twice on retry?',
    ],
    relatedIds: ['redis', 'postgresql', 'multi-step-processes'],
  },
  {
    id: 'multi-step-processes',
    title: 'Multi-step Processes',
    category: 'pattern',
    difficulty: 'intermediate',
    tagline: 'When one transaction spans many services, embrace sagas.',
    overview:
      'Booking a flight + hotel + car needs all-or-nothing semantics, but 2PC across services is brittle and slow. Sagas and workflow engines give you durable, recoverable multi-step processes.',
    keyConcepts: [
      { title: 'Saga pattern', body: 'A sequence of local transactions, each with a compensating action. If step 4 fails, you undo steps 1–3 by running their compensations.' },
      { title: 'Orchestration vs choreography', body: 'Orchestrator (e.g., Temporal, Step Functions) drives the workflow centrally. Choreography = services react to each other\'s events. Orchestration is easier to debug; choreography couples less.' },
      { title: 'Outbox pattern', body: 'Write event to an outbox table in the same DB transaction as the business change. A publisher relays it to Kafka. Avoids "DB committed but message lost" bugs.' },
      { title: 'Idempotency at every step', body: 'Workers will retry. Every step must be safe to re-run.' },
      { title: 'Workflow engines', body: 'Temporal, Airflow, Step Functions, Cadence. They persist workflow state, handle retries, timers, and recovery automatically.' },
      { title: 'Event sourcing', body: 'Store the sequence of events; derive current state. Replayable, auditable, but more complex than CRUD.' },
    ],
    commonQuestions: [
      'Design an e-commerce checkout flow that spans payment, inventory, and shipping.',
      'When would you choose a saga over distributed transactions?',
      'How do you handle a failure in step 5 of a 7-step workflow?',
      'Why is the outbox pattern needed?',
    ],
    relatedIds: ['kafka', 'managing-long-running-tasks', 'dealing-with-contention'],
  },
  {
    id: 'scaling-reads',
    title: 'Scaling Reads',
    category: 'pattern',
    difficulty: 'foundational',
    tagline: 'Most systems are 10:1 read-heavy — cache, replicate, denormalize.',
    overview:
      'Reads usually dominate, and they are also the easiest to scale. The toolkit: caching, read replicas, denormalized projections, CDN, materialized views.',
    keyConcepts: [
      { title: 'Read replicas', body: 'Async replication from primary. Eventual consistency — readers may lag by 10ms–10s. Read-your-writes needs routing to primary or wait-for-LSN.' },
      { title: 'Caching layers', body: 'Browser → CDN → app cache → distributed cache → DB. The closer to the user, the bigger the win.' },
      { title: 'CQRS', body: 'Command/Query Responsibility Segregation. Write to a normalized store; project into purpose-built read models (search index, analytics cube, denormalized doc).' },
      { title: 'Materialized views', body: 'Pre-computed query results. Refresh on schedule or via change streams. Trades freshness for read latency.' },
      { title: 'Fan-out on write vs read', body: 'For news feeds: write-time fan-out is fast to read but expensive to write (Justin Bieber problem). Read-time fan-out is cheap to write but slow for active users. Hybrid: write-fan-out for normal users, read-fan-out for celebrities.' },
    ],
    commonQuestions: [
      'How would you scale reads on a database serving 1M QPS?',
      'How do you handle stale reads from a read replica?',
      'Design the timeline service for Twitter.',
      'When is read-time fan-out better than write-time?',
    ],
    relatedIds: ['caching', 'redis', 'elasticsearch'],
  },
  {
    id: 'scaling-writes',
    title: 'Scaling Writes',
    category: 'pattern',
    difficulty: 'intermediate',
    tagline: 'Writes are harder. Batch, shard, async, and pick an LSM store.',
    overview:
      'A single Postgres can do tens of thousands of writes per second — beyond that you need sharding, async pipelines, or write-optimised stores. Writes also constrain consistency and durability choices.',
    keyConcepts: [
      { title: 'Sharding for writes', body: 'Partition by a key with high cardinality and balanced load. Hot shards = lost write capacity.' },
      { title: 'Batching', body: 'Coalesce many small writes into fewer larger ones. Lower per-write overhead and disk syncs. Powers Kafka, Cassandra, ClickHouse.' },
      { title: 'Async ingestion', body: 'Accept the write into a durable queue (Kafka), ACK fast, process later. Decouples ingest from processing.' },
      { title: 'Write-optimised stores', body: 'LSM-tree databases (Cassandra, Scylla, RocksDB) absorb writes as appends, merge in background. Massively higher write throughput than B-trees.' },
      { title: 'Bulk writes', body: 'COPY (Postgres) or multi-row INSERT is 10–100× faster than per-row.' },
      { title: 'Durability tuning', body: 'fsync per write = safest, slowest. Group commit and replication ack mean trade-offs between latency and data loss risk.' },
    ],
    commonQuestions: [
      'Design a metrics ingestion pipeline handling 10M writes/sec.',
      'Your write workload exceeds a single Postgres — what next?',
      'When is Cassandra a better fit than Postgres?',
      'How do you scale writes for a global counter?',
    ],
    relatedIds: ['kafka', 'cassandra', 'sharding'],
  },
  {
    id: 'handling-large-blobs',
    title: 'Handling Large Blobs',
    category: 'pattern',
    difficulty: 'foundational',
    tagline: 'Never put a video in your database. Object store + signed URLs.',
    overview:
      'Images, videos, PDFs, backups — anything beyond a few KB belongs in object storage (S3, GCS, Azure Blob), not your transactional DB. Get the pattern right and you save 100× on cost and DB load.',
    keyConcepts: [
      { title: 'Pre-signed URLs', body: 'Backend signs a time-limited URL. Client uploads directly to S3. Skips your servers entirely.' },
      { title: 'Multipart upload', body: 'For files >100MB. Upload chunks in parallel, retry individual parts. Resume on failure.' },
      { title: 'CDN in front', body: 'CloudFront, Cloudflare, Fastly cache static assets at edge. Latency drops from 100ms to 10ms.' },
      { title: 'Lifecycle policies', body: 'Auto-move old data to cheaper tiers (S3 IA → Glacier). Auto-delete after retention.' },
      { title: 'Metadata in DB, content in blob store', body: 'Postgres row: id, owner, url, content_type, size. The bytes live in S3.' },
      { title: 'Transformation pipelines', body: 'On upload, kick off async jobs to transcode, resize, virus-scan. Use SQS/Kafka + workers.' },
    ],
    commonQuestions: [
      'Design photo upload and sharing for Instagram.',
      'How do you handle a 5 GB video upload from a flaky mobile network?',
      'Why pre-signed URLs instead of routing uploads through your API?',
      'How would you serve images globally with <50ms latency?',
    ],
    relatedIds: ['managing-long-running-tasks', 'numbers-to-know'],
  },
  {
    id: 'managing-long-running-tasks',
    title: 'Managing Long Running Tasks',
    category: 'pattern',
    difficulty: 'intermediate',
    tagline: 'Don\'t do it in the request thread. Queue it.',
    overview:
      'Any operation taking more than ~1 second should not block an HTTP handler. Queue the work, return a job id, let the client poll or subscribe for updates.',
    keyConcepts: [
      { title: 'Job queue architecture', body: 'API enqueues to SQS/Kafka/Redis Streams. Workers pull, process, write status. Client polls /jobs/{id} or subscribes via WS.' },
      { title: 'At-least-once delivery', body: 'Queues guarantee delivery, not uniqueness. Workers must be idempotent — same job may run twice.' },
      { title: 'Visibility timeout', body: 'When a worker pulls a job, it becomes invisible to others. If the worker crashes, the job reappears after timeout. Heartbeat for long jobs to extend the lease.' },
      { title: 'DLQ (dead-letter queue)', body: 'Jobs that fail N times go to a DLQ. Investigate offline; never block the main queue on poison messages.' },
      { title: 'Priority queues', body: 'Separate queues per priority. Workers drain high before low. Or use weighted round-robin.' },
      { title: 'Progress reporting', body: 'Write checkpoints to Redis/DB. Client polls. For long jobs (>30s), websocket push beats polling.' },
    ],
    commonQuestions: [
      'Design a video transcoding pipeline.',
      'A user uploads a 1GB CSV — how do you process it without timing out the request?',
      'How do you make a job idempotent when the queue delivers at-least-once?',
      'How would you build a workflow that takes hours but must survive worker restarts?',
    ],
    relatedIds: ['kafka', 'redis', 'multi-step-processes', 'handling-large-blobs'],
  },

  // ────── DEEP DIVES ──────
  {
    id: 'redis',
    title: 'Redis',
    category: 'deepdive',
    difficulty: 'intermediate',
    tagline: 'In-memory data structure store. Cache, queue, lock, leaderboard.',
    overview:
      'Redis is single-threaded, in-memory, and microsecond-fast. It is the Swiss Army knife of system design — cache, pub/sub, rate limiter, distributed lock, leaderboard, session store, and more.',
    keyConcepts: [
      { title: 'Data structures', body: 'Strings, hashes, lists, sets, sorted sets (ZSET), streams, geospatial, bitmaps, HyperLogLog. Each maps to a real use case.' },
      { title: 'Persistence', body: 'RDB snapshots (point-in-time) + AOF (every write logged). Trade durability against performance.' },
      { title: 'Single-threaded model', body: 'No locking overhead. Operations are atomic. But a slow command (KEYS *, large SORT) blocks everything.' },
      { title: 'Pub/Sub vs Streams', body: 'Pub/Sub is fire-and-forget — subscribers must be online. Streams persist messages with consumer groups, replayable.' },
      { title: 'Redis Cluster', body: '16384 hash slots distributed across master nodes. Each master has replicas. Client routes to the right shard. No cross-slot transactions.' },
      { title: 'Common use cases', body: 'Caching (TTL), rate limiting (INCR + EXPIRE), distributed locks (SET NX with TTL), leaderboards (ZADD), session store (HSET), real-time analytics (HLL).' },
    ],
    tradeoffs: [
      { pro: 'Sub-millisecond latency', con: 'Limited by RAM size' },
      { pro: 'Rich data structures', con: 'Single-threaded — one slow op stalls all' },
      { pro: 'Simple ops model', con: 'Cluster mode constrains multi-key ops' },
    ],
    commonQuestions: [
      'Build a rate limiter in Redis.',
      'Why is Redis single-threaded and yet so fast?',
      'How would you build a leaderboard with millions of users?',
      'When would you use Redis Streams instead of Kafka?',
    ],
    relatedIds: ['caching', 'real-time-updates', 'dealing-with-contention'],
  },
  {
    id: 'elasticsearch',
    title: 'Elasticsearch',
    category: 'deepdive',
    difficulty: 'intermediate',
    tagline: 'Inverted-index search engine. Full-text, fuzzy, aggregations.',
    overview:
      'Elasticsearch (and OpenSearch, its open-source fork) is a distributed search engine built on Lucene. It excels at full-text search, log analytics, and complex aggregations — but is a poor primary database.',
    keyConcepts: [
      { title: 'Inverted index', body: 'For each term, a posting list of documents containing it. Lookups are O(log N) per term. Fast intersection for AND queries.' },
      { title: 'Analyzer pipeline', body: 'Tokenize → lowercase → stem → remove stopwords → store. Different analyzers per field (e.g., autocomplete vs body search).' },
      { title: 'Sharding & replication', body: 'Index split into shards. Each shard a Lucene instance. Replicas for HA. Number of primary shards is fixed at index creation — pick carefully.' },
      { title: 'Scoring', body: 'TF-IDF or BM25 by default. Boost fields, decay by recency, combine with function scores.' },
      { title: 'Aggregations', body: 'Bucket aggs (terms, date_histogram), metric aggs (sum, avg, percentiles). Powers Kibana dashboards.' },
      { title: 'Anti-pattern: source of truth', body: 'ES is not transactional. Use it as a derived index from your primary store (Postgres, DynamoDB) via CDC or dual-write.' },
    ],
    commonQuestions: [
      'Design search for an e-commerce catalog.',
      'How does an inverted index actually work?',
      'When would Elasticsearch be the wrong tool?',
      'How do you keep Elasticsearch in sync with your primary database?',
    ],
    relatedIds: ['kafka', 'scaling-reads', 'data-modeling'],
  },
  {
    id: 'kafka',
    title: 'Kafka',
    category: 'deepdive',
    difficulty: 'advanced',
    tagline: 'Durable, ordered, replayable log. The backbone of event-driven systems.',
    overview:
      'Kafka is a distributed, partitioned, replicated commit log. Producers append; consumers read at their own pace. It handles millions of messages per second per broker and is the canonical choice for event streaming.',
    keyConcepts: [
      { title: 'Topics & partitions', body: 'A topic is split into ordered partitions. Order is guaranteed within a partition, not across. Partition count = parallelism cap.' },
      { title: 'Producers', body: 'Pick a partition by key (hash) for ordering, or round-robin for spread. acks=all for durability, acks=1 for speed.' },
      { title: 'Consumer groups', body: 'Each partition is consumed by exactly one consumer in the group. Add consumers up to partition count to scale. Beyond that, idle.' },
      { title: 'Offsets', body: 'Each consumer tracks its offset per partition. Replay = reset offset to earlier. Stored in Kafka itself.' },
      { title: 'Retention', body: 'Time-based (7 days default) or size-based. Compacted topics keep only the latest value per key — perfect for state stores.' },
      { title: 'Exactly-once', body: 'Transactional writes + idempotent producer + read_committed consumer. Real, but not free.' },
      { title: 'When NOT to use Kafka', body: 'Tiny scale (Redis Streams or SQS is enough), strict request-response (use RPC), point-to-point queues (RabbitMQ semantics).' },
    ],
    commonQuestions: [
      'How does Kafka guarantee ordering, and when does it break?',
      'How do you achieve exactly-once delivery end-to-end?',
      'Design an event-driven order system with Kafka.',
      'Kafka vs RabbitMQ vs Kinesis — when is each right?',
    ],
    relatedIds: ['multi-step-processes', 'managing-long-running-tasks', 'scaling-writes'],
  },
  {
    id: 'api-gateway',
    title: 'API Gateway',
    category: 'deepdive',
    difficulty: 'intermediate',
    tagline: 'The front door — auth, rate limit, route, observe, all in one hop.',
    overview:
      'An API Gateway sits between clients and your services. It handles cross-cutting concerns so each service does not re-implement them: auth, rate limiting, request shaping, observability, routing.',
    keyConcepts: [
      { title: 'Responsibilities', body: 'TLS termination, authn/authz, rate limiting, request validation, routing, response transformation, logging, tracing.' },
      { title: 'Auth at the edge', body: 'JWT validation, OAuth introspection, API key checks. Reject early — never hit the service for unauthenticated requests.' },
      { title: 'Rate limiting', body: 'Token bucket per API key / IP / user. Distributed counters in Redis. Return 429 with Retry-After.' },
      { title: 'Routing', body: 'Path-based (/users → user-svc), header-based, traffic splitting (5% to v2), canary rollouts.' },
      { title: 'Aggregation (BFF pattern)', body: 'Backend-for-Frontend gateways combine several internal calls into one mobile-friendly response.' },
      { title: 'Avoid the god-gateway', body: 'A gateway that does business logic becomes a bottleneck and a deploy chokepoint. Keep it thin.' },
      { title: 'Popular options', body: 'AWS API Gateway, Kong, Envoy/Istio, Apigee, Tyk, Nginx, Zuul.' },
    ],
    commonQuestions: [
      'What belongs in an API gateway and what does not?',
      'Design rate limiting that works across multiple gateway nodes.',
      'How do you canary a new service version through the gateway?',
      'When is a service mesh better than an API gateway?',
    ],
    relatedIds: ['api-design', 'networking-essentials'],
  },
  {
    id: 'cassandra',
    title: 'Cassandra',
    category: 'deepdive',
    difficulty: 'advanced',
    tagline: 'Masterless, write-optimised, tunably consistent. Built for scale.',
    overview:
      'Cassandra (and Scylla, its C++ rewrite) is a wide-column store designed for huge write throughput, linear scalability, and multi-DC replication. Born at Facebook, modeled on Dynamo + BigTable.',
    keyConcepts: [
      { title: 'Architecture', body: 'Masterless ring. Every node is equal. Data placed by consistent hashing. Replication factor N: every key on N nodes.' },
      { title: 'Tunable consistency', body: 'Per query: ONE, QUORUM, ALL for reads/writes. Choose R + W > N for strong consistency, lower for speed.' },
      { title: 'Data model', body: 'Partition key (which node) + clustering key (sort within partition). Model around queries — denormalize aggressively.' },
      { title: 'LSM storage', body: 'Writes go to memtable + commit log, flushed to immutable SSTables. Background compaction merges them.' },
      { title: 'No joins, no transactions', body: 'Single-partition operations only. Pre-compute joins by denormalizing into multiple tables.' },
      { title: 'Hot partitions', body: 'A single partition lives on N nodes. Too much data per partition (>100MB) or too many writes hits the wall — re-shape your key.' },
    ],
    tradeoffs: [
      { pro: 'Linear write scaling', con: 'No ad-hoc queries' },
      { pro: 'Tunable consistency', con: 'Eventually consistent by default' },
      { pro: 'Great multi-DC story', con: 'Operationally complex' },
    ],
    commonQuestions: [
      'When is Cassandra the right choice over Postgres?',
      'Why is Cassandra fast at writes but tricky at reads?',
      'Design a Cassandra data model for a messaging app.',
      'How does QUORUM provide strong consistency in an AP system?',
    ],
    relatedIds: ['data-modeling', 'cap-theorem', 'sharding', 'consistent-hashing'],
  },
  {
    id: 'dynamodb',
    title: 'DynamoDB',
    category: 'deepdive',
    difficulty: 'intermediate',
    tagline: 'Serverless key-value/document store. Single-digit-ms at any scale.',
    overview:
      'Amazon DynamoDB is a fully managed, serverless NoSQL database. No nodes to manage. Predictable latency at any throughput. You pay for provisioned or on-demand capacity. Designed for single-table, access-pattern-first modeling.',
    keyConcepts: [
      { title: 'Keys', body: 'Partition key (mandatory) + optional sort key. Together = primary key. Partition key alone routes you to a partition.' },
      { title: 'Capacity', body: 'RCU/WCU provisioned, or on-demand. A partition serves ~3000 RCU + 1000 WCU — hot keys throttle. Adaptive capacity helps but does not eliminate this.' },
      { title: 'Indexes', body: 'GSI: different partition key, separate capacity, eventually consistent. LSI: same partition, different sort key, must be defined at table creation.' },
      { title: 'Single-table design', body: 'All entities in one table with composite PK like USER#123 / ORDER#456. Trade schema clarity for fewer round trips.' },
      { title: 'Streams + Lambda', body: 'Every write emits a change event. Trigger Lambdas, hydrate caches, project to ES. CDC built in.' },
      { title: 'Transactions', body: 'TransactWriteItems for ACID across up to 100 items. 2× write cost.' },
    ],
    commonQuestions: [
      'How would you model a Twitter-like feed in DynamoDB?',
      'GSI vs LSI — when do you reach for each?',
      'How do you avoid hot partitions in DynamoDB?',
      'Why is single-table design preferred over multiple tables?',
    ],
    relatedIds: ['data-modeling', 'cap-theorem', 'consistent-hashing'],
  },
  {
    id: 'postgresql',
    title: 'PostgreSQL',
    category: 'deepdive',
    difficulty: 'foundational',
    tagline: 'The default database. Relational, ACID, and shockingly versatile.',
    overview:
      'Postgres is the go-to OLTP database for new systems. ACID, expressive SQL, JSONB, full-text search, partitioning, logical replication, extensions for almost anything (PostGIS, pgvector, TimescaleDB).',
    keyConcepts: [
      { title: 'MVCC', body: 'Multi-Version Concurrency Control. Readers do not block writers; writers do not block readers. Old row versions live until VACUUM cleans them.' },
      { title: 'Isolation levels', body: 'Read Committed (default), Repeatable Read, Serializable. Higher = safer but more retries on conflicts.' },
      { title: 'Indexes', body: 'B-tree (default), Hash, GIN (full-text, JSONB), GiST (geo), BRIN (huge tables, ordered data), partial, expression indexes.' },
      { title: 'JSONB', body: 'Binary JSON with indexable nested fields. Postgres can replace MongoDB for many doc workloads.' },
      { title: 'Partitioning', body: 'Native declarative partitioning by range, list, or hash. Essential for tables >100M rows.' },
      { title: 'Replication', body: 'Streaming physical replication for HA + read replicas. Logical replication for CDC and selective subscription.' },
      { title: 'Scaling limits', body: 'A well-tuned Postgres handles tens of thousands of TPS and TB-scale data. Beyond that: partition, shard (Citus), or split workloads.' },
    ],
    commonQuestions: [
      'Why is your Postgres query slow despite an index?',
      'Read Committed vs Repeatable Read — when does the difference bite?',
      'How would you scale Postgres past a single primary?',
      'When would you store JSONB instead of normalizing?',
    ],
    relatedIds: ['database-indexing', 'data-modeling', 'scaling-writes'],
  },
  {
    id: 'flink',
    title: 'Flink',
    category: 'deepdive',
    difficulty: 'advanced',
    tagline: 'True streaming. Stateful, event-time, exactly-once.',
    overview:
      'Apache Flink is a stream processing engine — like Spark Streaming but truly per-event (not micro-batched), with first-class event-time semantics and large stateful operators. Used at Netflix, Uber, Alibaba, Stripe for real-time analytics, fraud, ML features.',
    keyConcepts: [
      { title: 'Streaming vs batch', body: 'Flink treats batch as a special case of streaming. Same API for both. Compare with Spark, which treats streaming as micro-batched.' },
      { title: 'Event time vs processing time', body: 'Event time = when the event happened. Processing time = when Flink saw it. Real systems must use event time + watermarks for correctness.' },
      { title: 'Windows', body: 'Tumbling (non-overlapping), sliding (overlapping), session (gap-based). Aggregations per window.' },
      { title: 'State', body: 'Operators keep keyed state, locally and durably checkpointed to S3/HDFS. Recover exactly where you left off.' },
      { title: 'Checkpointing', body: 'Async snapshots every N seconds. Failure → restart from last checkpoint, replay from source.' },
      { title: 'Exactly-once', body: 'End-to-end requires source replay (Kafka offsets) + checkpointed state + transactional sink.' },
    ],
    commonQuestions: [
      'Why use Flink over Spark Streaming?',
      'Walk through how Flink achieves exactly-once.',
      'Event time vs processing time — give an example where it matters.',
      'How would you build real-time fraud detection on a transaction stream?',
    ],
    relatedIds: ['kafka', 'scaling-writes', 'multi-step-processes'],
  },
  {
    id: 'zookeeper',
    title: 'ZooKeeper',
    category: 'deepdive',
    difficulty: 'advanced',
    tagline: 'Distributed coordination — locks, leader election, config.',
    overview:
      'ZooKeeper is a strongly-consistent coordination service: think of it as a small, replicated, ordered key-value store with watches. Used by Kafka (pre-KRaft), HBase, Solr, and many bespoke systems for leader election, service discovery, and distributed locks.',
    keyConcepts: [
      { title: 'Data model', body: 'Hierarchical znodes (like a filesystem). Small payloads only (<1MB). Persistent, ephemeral, sequential, or combinations.' },
      { title: 'Ephemeral nodes', body: 'Auto-deleted when the creating session ends. Foundation for liveness detection and leader election.' },
      { title: 'Watches', body: 'One-shot triggers on znode changes. Clients re-register after each fire. Useful for config reload, group membership.' },
      { title: 'ZAB protocol', body: 'ZooKeeper Atomic Broadcast. Leader-based, totally ordered. CP under partitions.' },
      { title: 'Leader election', body: 'Each candidate creates an ephemeral sequential znode. Lowest sequence number wins. On leader death, znode disappears and the next-lowest takes over.' },
      { title: 'Alternatives', body: 'etcd (Raft, more modern API), Consul (service discovery + KV + DNS), Kafka KRaft (Kafka without ZK).' },
    ],
    tradeoffs: [
      { pro: 'Strong consistency primitives', con: 'CP — unavailable during partitions' },
      { pro: 'Battle-tested coordination', con: 'Operationally heavy; small-payload only' },
    ],
    commonQuestions: [
      'How does ZooKeeper implement leader election?',
      'When would you use ZooKeeper vs etcd?',
      'How do ephemeral nodes detect failed clients?',
      'Why is ZooKeeper a CP system and what does that imply?',
    ],
    relatedIds: ['cap-theorem', 'dealing-with-contention'],
  },
];

export const CATEGORY_META: Record<TopicCategory, { label: string; description: string; accent: string }> = {
  core: {
    label: 'Core Concepts',
    description: 'The fundamentals every system designer carries — networking, data, caching, consistency.',
    accent: '#4F46E5',
  },
  pattern: {
    label: 'Patterns',
    description: 'Recurring shapes you reach for: real-time, contention, multi-step, scaling reads & writes.',
    accent: '#7C3AED',
  },
  deepdive: {
    label: 'Key Technologies',
    description: 'Deep dives into the systems you will be asked about by name.',
    accent: '#0EA5E9',
  },
};

// Attach hellointerview-style deep content to topics at module load time.
TOPICS.forEach(t => {
  const deep = DEEP_CONTENT[t.id];
  if (deep && deep.length > 0) t.deep = deep;
});

export function topicById(id: string): InterviewTopic | undefined {
  return TOPICS.find(t => t.id === id);
}
