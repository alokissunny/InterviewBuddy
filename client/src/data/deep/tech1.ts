import type { DeepSection } from '../interviewPrepData';

// ── Redis ────────────────────────────────────────────────────────────────

export const REDIS: DeepSection[] = [
  {
    id: 'what-makes-redis-special',
    title: 'What Makes Redis Special',
    blocks: [
      { type: 'p', text: 'Redis (Remote Dictionary Server) is an **in-memory data structure store**. Everything lives in RAM — no disk seek, no parsing rows. This is why a single Redis node handles 100K–1M operations per second with sub-millisecond latency.' },
      { type: 'kv', title: 'Redis vs relational DB', items: [
        { k: 'Latency', v: '~0.1ms (Redis) vs ~5ms (Postgres)' },
        { k: 'Throughput', v: '~1M ops/sec (Redis) vs ~50K qps (Postgres)' },
        { k: 'Data size', v: 'Limited by RAM vs unlimited (disk)' },
        { k: 'Query power', v: 'Key-based ops vs full SQL' },
        { k: 'Durability', v: 'Configurable (optional) vs always durable' },
      ]},
      { type: 'callout', kind: 'info', title: 'Redis is not a replacement for a database', text: 'Redis is optimized for speed at the cost of data size (RAM is finite) and query power (no JOINs, no complex queries). Use it alongside a primary database, not instead of one.' },
    ],
  },
  {
    id: 'data-structures',
    title: 'Data Structures and Their Use Cases',
    blocks: [
      { type: 'p', text: 'Redis\'s key differentiator is its rich set of **data structures**. Each maps to a different problem.' },
      { type: 'table', headers: ['Type', 'Commands', 'Use Case'], rows: [
        ['String', 'GET, SET, INCR', 'Cache values, counters, rate limits, session tokens'],
        ['Hash', 'HGET, HSET, HMGET', 'User profiles, object fields (like a mini-row)'],
        ['List', 'LPUSH, RPOP, LRANGE', 'Message queues, activity feeds (recent N items)'],
        ['Set', 'SADD, SMEMBERS, SINTER', 'Unique items, tags, friend lists, "who is online"'],
        ['Sorted Set', 'ZADD, ZRANGE, ZRANK', 'Leaderboards, priority queues, rate windows'],
        ['Stream', 'XADD, XREAD, XREADGROUP', 'Event log with consumer groups (like mini-Kafka)'],
        ['HyperLogLog', 'PFADD, PFCOUNT', 'Approximate unique count (daily active users)'],
        ['Bitmap', 'SETBIT, GETBIT, BITCOUNT', 'User presence tracking, feature flags per user'],
      ]},
      { type: 'code', code: `Leaderboard example (Sorted Set):
  ZADD leaderboard 9500 "user:alice"   // score 9500
  ZADD leaderboard 8200 "user:bob"
  ZADD leaderboard 9800 "user:carol"

  ZRANGE leaderboard 0 2 WITHSCORES REV
  → "user:carol" 9800
  → "user:alice" 9500
  → "user:bob"   8200

  ZRANK leaderboard "user:alice"  → 1 (0-indexed from top)
  ZINCRBY leaderboard 100 "user:alice"  // atomic score update` },
    ],
  },
  {
    id: 'single-threaded',
    title: 'The Single-Threaded Execution Model',
    blocks: [
      { type: 'p', text: 'Redis processes **one command at a time** on a single thread. This eliminates locking, context switches, and race conditions. Every operation is inherently atomic.' },
      { type: 'compare', aTitle: 'Why single-threaded is fast', bTitle: 'Single-threaded limitations',
        aPoints: [
          'No mutex locks or context switches',
          'Cache-friendly: single-threaded = single CPU cache line',
          'Every operation is atomic — no partial writes',
          'I/O multiplexing handles thousands of connections',
        ],
        bPoints: [
          'One slow command blocks ALL other clients',
          'KEYS * on a 10M key db = seconds of blocking',
          'Large SORT or LRANGE blocks everyone',
          'CPU-bound workloads cap at one core',
        ],
      },
      { type: 'callout', kind: 'pitfall', title: 'Dangerous slow commands', text: '`KEYS *` scans all keys — use `SCAN` with a cursor instead. `SMEMBERS` on a huge set, `SORT` on a large list, `DEL` on a key with millions of fields — all block. Use `HSCAN`/`SSCAN`/`ZSCAN` for large data structures. Redis 6.0+ added I/O threading for reads/writes but command execution is still single-threaded.' },
    ],
  },
  {
    id: 'persistence',
    title: 'Persistence: RDB and AOF',
    blocks: [
      { type: 'p', text: 'Redis stores data in RAM — it would all vanish on restart without persistence. Two mechanisms are available.' },
      { type: 'compare', aTitle: 'RDB (Redis Database Snapshot)', bTitle: 'AOF (Append-Only File)',
        aPoints: [
          'Periodic snapshot of all data to disk',
          'Very compact file — great for backups',
          'Fast recovery (load one snapshot)',
          'May lose up to minutes of data on crash',
          'Configurable: save every N seconds if M keys changed',
        ],
        bPoints: [
          'Every write operation logged to disk',
          'Much more durable (at most 1 second of data loss)',
          'File grows large — needs periodic rewriting',
          'Slower recovery (replay every write)',
          'fsync every write = safest but slowest',
        ],
      },
      { type: 'kv', title: 'Common persistence configs', items: [
        { k: 'No persistence', v: 'Pure cache — data loss on restart is OK' },
        { k: 'RDB only', v: 'Good for non-critical caches with periodic saves' },
        { k: 'AOF only', v: 'Good when durability matters more than disk space' },
        { k: 'RDB + AOF', v: 'Best of both — recommended for session stores and queues' },
      ]},
    ],
  },
  {
    id: 'pubsub-vs-streams',
    title: 'Pub/Sub vs Streams',
    blocks: [
      { type: 'p', text: 'Redis offers two mechanisms for message passing: **Pub/Sub** (fire-and-forget) and **Streams** (persistent, consumer groups).' },
      { type: 'compare', aTitle: 'Pub/Sub', bTitle: 'Streams',
        aPoints: [
          'Publisher sends; subscribers receive immediately',
          'No message persistence — subscribers must be online',
          'Simple: PUBLISH channel message / SUBSCRIBE channel',
          'Use for: real-time notifications, WebSocket fan-out',
        ],
        bPoints: [
          'Messages persisted to a log with IDs',
          'Consumer groups: multiple workers, each processes once',
          'Acknowledges (XACK) prevent re-delivery',
          'Subscribers can join late and replay from any offset',
          'Use for: job queues, event logs (mini-Kafka)',
        ],
      },
      { type: 'callout', kind: 'tip', title: 'Streams is almost always better', text: 'If a subscriber restarts, Pub/Sub silently drops all messages it missed. Streams hold the message until acknowledged. For anything beyond ephemeral real-time notifications (WebSocket fan-out), use Streams.' },
    ],
  },
  {
    id: 'rate-limiting-locks',
    title: 'Common Patterns: Rate Limiting and Locks',
    blocks: [
      { type: 'h', text: 'Rate Limiting with Sliding Window' },
      { type: 'code', code: `Fixed window rate limit (simplest):
  INCR rate_limit:user:42:2026-05-22-14:00  // per-minute bucket
  EXPIRE rate_limit:user:42:2026-05-22-14:00 60
  if count > 100: reject with 429

Sliding window (Sorted Set, more accurate):
  ZADD requests:user:42 {timestamp} {uuid}   // add request
  ZREMRANGEBYSCORE requests:user:42 0 {now-60s}  // remove old
  count = ZCARD requests:user:42
  if count > 100: reject` },
      { type: 'h', text: 'Distributed Lock' },
      { type: 'code', code: `Acquire:
  SET lock:resource:42 {worker_uuid} NX PX 5000
  // NX = only if not exists
  // PX 5000 = expire in 5000ms

  Returns OK   → you have the lock ✅
  Returns nil  → someone else has it, wait/retry

Release (Lua, atomic check-and-delete):
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end` },
    ],
  },
  {
    id: 'redis-cluster',
    title: 'Redis Cluster',
    blocks: [
      { type: 'p', text: 'A single Redis node is limited by one machine\'s RAM and CPU. **Redis Cluster** shards data across multiple master nodes, each with replicas.' },
      { type: 'code', code: `Redis Cluster: 16,384 hash slots

  hash_slot = CRC16(key) % 16384

  Node A (master): slots 0–5460        + 1 replica
  Node B (master): slots 5461–10922    + 1 replica
  Node C (master): slots 10923–16383   + 1 replica

  Client connects to any node.
  If key is on a different node:
    Node responds: MOVED 12345 host:6379
    Client re-sends to the right node.

Limitation: Multi-key commands must target the same slot.
  MGET user:1 user:2  ← only works if both on same slot
  Use hash tags: {user}.profile and {user}.cart → same slot` },
      { type: 'callout', kind: 'warn', title: 'No cross-slot transactions', text: 'Redis Cluster does not support transactions (MULTI/EXEC) across different hash slots. If your use case requires atomic multi-key operations, keep the keys on the same slot using hash tags, or reconsider your design.' },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'Redis is the answer for: caching, rate limiting, leaderboards, distributed locks, session storage, pub/sub fan-out. Know the data structure for each use case (Sorted Set for leaderboard, INCR for counters). Mention that it\'s single-threaded — every command is atomic. For scale: Redis Cluster for data size, read replicas for read throughput. Warn about KEYS * blocking.' },
    ],
  },
];

// ── Elasticsearch ────────────────────────────────────────────────────────

export const ELASTICSEARCH: DeepSection[] = [
  {
    id: 'what-is-es',
    title: 'What is Elasticsearch?',
    blocks: [
      { type: 'p', text: 'Elasticsearch (ES) is a distributed search engine built on top of Apache **Lucene**. It excels at full-text search, fuzzy matching, and complex aggregations on semi-structured data.' },
      { type: 'callout', kind: 'info', title: 'OpenSearch', text: 'AWS forked Elasticsearch at version 7.10 and renamed it **OpenSearch**. The two are nearly API-compatible. On AWS, OpenSearch is managed. On-prem or other clouds, use Elasticsearch.' },
      { type: 'compare', aTitle: 'Elasticsearch is great for', bTitle: 'Elasticsearch is wrong for',
        aPoints: [
          'Full-text search (product names, blog posts, docs)',
          'Fuzzy/typo-tolerant search ("recieve" → "receive")',
          'Log analytics and dashboards (ELK stack)',
          'Complex aggregations: histogram, percentiles, geo',
        ],
        bPoints: [
          'Primary data store (not ACID, not transactional)',
          'Frequent small updates (inverted index is expensive to update)',
          'Simple key-value lookups (use Redis)',
          'Relational/join queries (no foreign keys)',
        ],
      },
    ],
  },
  {
    id: 'inverted-index',
    title: 'The Inverted Index',
    blocks: [
      { type: 'p', text: 'The magic behind search: an **inverted index** maps each term to the list of documents containing it. Finding documents with a word is O(1) — just look up the posting list.' },
      { type: 'code', code: `Documents:
  Doc 1: "Redis is fast cache"
  Doc 2: "Redis cluster for scale"
  Doc 3: "Caching with Redis and Memcached"

Inverted index (after analysis):
  Term       → Documents
  ─────────────────────────
  redis      → [Doc1, Doc2, Doc3]
  fast       → [Doc1]
  cache      → [Doc1, Doc3]
  cluster    → [Doc2]
  scale      → [Doc2]
  memcached  → [Doc3]

Query: "Redis cache"
  redis → [Doc1, Doc2, Doc3]
  cache → [Doc1, Doc3]
  AND   → [Doc1, Doc3]  ← intersection, O(N) with skip lists

Doc1 has both terms → higher score → ranked first` },
      { type: 'p', text: 'The **posting list** for each term also stores the position of the term in each document (for phrase queries) and frequency (for scoring).' },
    ],
  },
  {
    id: 'analyzer',
    title: 'The Analyzer Pipeline',
    blocks: [
      { type: 'p', text: 'Before indexing, text passes through an **analyzer** pipeline that transforms it to improve search quality. The same analysis runs at search time.' },
      { type: 'code', code: `Input: "The QUICKEST Brown Foxes jumped over 10 lazy-dogs!"

1. Tokenizer: split on whitespace and punctuation
   → ["The", "QUICKEST", "Brown", "Foxes", "jumped",
      "over", "10", "lazy", "dogs"]

2. Token filters:
   Lowercase:  → ["the", "quickest", "brown", "foxes", ...]
   Stop words: → removes "the", "over"
   Stemmer:    → ["quick", "brown", "fox", "jump", "lazi", "dog"]

Indexed terms: quick, brown, fox, jump, lazi, dog

Query "quickly foxes":
   Analyzer → "quick", "fox"
   Both found → match! ✅

Different analyzers for different fields:
  title:       standard (full analysis)
  tags:        keyword (exact match only, no tokenization)
  autocomplete: edge_ngram (prefix matching: "re" → "redis")` },
    ],
  },
  {
    id: 'sharding-replication',
    title: 'Sharding and Replication',
    blocks: [
      { type: 'p', text: 'An **index** (like a database table) is split into **primary shards** at creation. Each shard is a full Lucene instance. Replica shards provide HA and read scaling.' },
      { type: 'code', code: `Index: "products" with 3 primary shards, 1 replica each
  Total shards: 6 (3 primary + 3 replica)

  Node 1: P0, R1      Node 2: P1, R2      Node 3: P2, R0
  (primary 0,         (primary 1,          (primary 2,
   replica of 1)       replica of 2)         replica of 0)

A document is routed to a shard:
  shard = hash(document_id) % num_primary_shards

Reads:
  ES can route to primary or replica → reads scale with replicas

Important: primary shard count is FIXED at index creation.
  → If you pick 1 shard and need to scale later, you must reindex.
  → Pick based on expected data size: 10–50GB per shard is ideal.` },
      { type: 'callout', kind: 'pitfall', title: 'Shard count is permanent', text: 'You cannot add primary shards to an existing index. If you underprovision (e.g., 1 primary shard that grows to 500GB), search will be slow and you\'ll need a costly reindex. Over-provision slightly and use the rollover API for time-series data.' },
    ],
  },
  {
    id: 'querying',
    title: 'Query Types',
    blocks: [
      { type: 'p', text: 'Elasticsearch queries come in two flavors: **full-text queries** (analyzed, scored) and **filter queries** (exact match, not scored, cached).' },
      { type: 'code', lang: 'json', code: `Full-text search (scored, analyzed):
{
  "query": {
    "match": {
      "description": "fast redis cache"
    }
  }
}
→ Analyzes "fast redis cache", finds docs with any of these terms
→ Scores by TF-IDF / BM25

Filter (exact, no scoring, cached):
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "status": "active" } },
        { "range": { "price": { "gte": 100, "lte": 500 } } }
      ],
      "must": [
        { "match": { "title": "laptop" } }
      ]
    }
  }
}
→ Filters are fast (bit-set cache) + scoring on full-text part` },
    ],
  },
  {
    id: 'sync',
    title: 'Keeping ES in Sync with Your Database',
    blocks: [
      { type: 'p', text: 'Elasticsearch is **not your source of truth** — it\'s a derived index. You must keep it in sync with your primary database.' },
      { type: 'code', code: `Option 1: Dual write (simple, risky)
  On POST /products:
    INSERT INTO postgres ← primary
    es.index(document)   ← secondary
  Risk: if ES write fails, data is out of sync ❌

Option 2: CDC with Debezium (recommended)
  Postgres binlog → Debezium → Kafka → ES consumer
  → ES is eventually consistent with Postgres
  → Atomic from Postgres perspective
  → ES lags by ~100ms in normal operation ✅

Option 3: Outbox pattern
  Write event to DB outbox table → publisher → Kafka → ES
  → Same guarantee as CDC but works without binlog access

Option 4: Batch re-index
  Nightly or hourly job reads from Postgres → rebuilds index
  → Acceptable for non-real-time search (e.g., reports)` },
      { type: 'callout', kind: 'tip', title: 'Use CDC (Debezium)', text: 'Debezium + Kafka is the production-grade way to keep ES in sync. It handles schema changes, crash recovery, and backfill seamlessly. Dual write is tempting but fails silently — avoid it for production data.' },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'For "design search for e-commerce": Elasticsearch with a separate sync from Postgres via CDC/Debezium. Explain the inverted index in one sentence: "a term maps to a list of all documents containing it — lookups are O(1)." Mention that ES is not a primary store, and that shard count is permanent — pick carefully. Aggregations for faceted search (brand, price range) are a bonus point.' },
    ],
  },
];

// ── Kafka ────────────────────────────────────────────────────────────────

export const KAFKA: DeepSection[] = [
  {
    id: 'commit-log',
    title: 'The Core Idea: A Distributed Commit Log',
    blocks: [
      { type: 'p', text: 'Kafka is not a traditional message queue. It\'s a **distributed, partitioned, replicated commit log**. Producers append records; consumers read at their own pace from any position in the log.' },
      { type: 'code', code: `Traditional queue (RabbitMQ):
  Producer → Queue → Consumer 1
  Message is DELETED after consumption.
  Consumer 2 misses it if it wasn't subscribed.

Kafka commit log:
  Producer → Topic (log) → Consumer 1 reads at offset 5
                         → Consumer 2 reads at offset 3 (catching up)
                         → Consumer 3 replays from offset 0 (new)

  Messages are RETAINED for 7 days (configurable).
  Any consumer can replay the entire history.

This is why Kafka is used for:
  Event streaming (process in real time)
  Event sourcing (replay to rebuild state)
  CDC (database change stream)
  Decoupling services (producer doesn't know consumers)` },
    ],
  },
  {
    id: 'topics-partitions',
    title: 'Topics and Partitions',
    blocks: [
      { type: 'p', text: 'A **topic** is a named stream of records. Every topic is split into **partitions** — ordered, immutable sequences. Ordering is guaranteed within a partition but not across partitions.' },
      { type: 'code', code: `Topic: "order-events" with 4 partitions

Partition 0: [offset0: order_1, offset1: order_5, offset2: order_9...]
Partition 1: [offset0: order_2, offset1: order_6, offset2: order_10...]
Partition 2: [offset0: order_3, offset1: order_7, offset2: order_11...]
Partition 3: [offset0: order_4, offset1: order_8, offset2: order_12...]

Producer routing:
  With key (e.g., order_id): hash(key) % num_partitions
    → All messages with key "order_42" → same partition → ordered ✅
  Without key: round-robin across partitions
    → Maximum throughput, no ordering guarantee

Parallelism = partition count:
  4 partitions → max 4 consumers processing in parallel
  Adding a 5th consumer: one will be idle` },
      { type: 'callout', kind: 'info', title: 'Partition count is the parallelism ceiling', text: 'You cannot have more active consumers in a group than partitions. Plan partition count based on peak consumer parallelism. Kafka allows adding partitions later, but this redistributes keys — use carefully.' },
    ],
  },
  {
    id: 'producers',
    title: 'Producers and Delivery Guarantees',
    blocks: [
      { type: 'p', text: 'Producers send records to a topic. The `acks` setting controls the durability guarantee.' },
      { type: 'table', headers: ['acks setting', 'Meaning', 'Durability', 'Latency'], rows: [
        ['acks=0', 'Fire and forget', 'None — may lose data', 'Fastest'],
        ['acks=1', 'Leader acknowledges', 'Lost if leader dies before replication', 'Fast'],
        ['acks=all', 'All in-sync replicas ACK', 'No data loss on broker failure', 'Slower'],
      ]},
      { type: 'callout', kind: 'tip', title: 'Use acks=all for important data', text: 'For financial events, orders, and anything you can\'t lose: `acks=all` with `min.insync.replicas=2`. This means at least 2 replicas must ACK. Even if the leader dies, another replica has the data.' },
    ],
  },
  {
    id: 'consumer-groups',
    title: 'Consumer Groups',
    blocks: [
      { type: 'p', text: 'A **consumer group** is a set of consumers that collectively read all partitions of a topic. Each partition is consumed by **exactly one** consumer in the group at a time.' },
      { type: 'code', code: `Topic: "payments" with 6 partitions

Consumer Group A (payment-processor): 3 consumers
  Consumer A1: partitions 0, 1
  Consumer A2: partitions 2, 3
  Consumer A3: partitions 4, 5
  → 3 consumers process 6 partitions in parallel ✅

Consumer Group B (analytics): 1 consumer
  Consumer B1: ALL 6 partitions
  → Separate read position, doesn't affect Group A ✅

Different groups = independent consumers with own offsets.
  Adding Group B (analytics) doesn't affect Group A (processor).
  Both consume the same messages independently.

Rebalancing:
  Consumer A2 dies → Kafka rebalances
  → A1 gets partitions 0,1,2; A3 gets partitions 3,4,5
  → Automatic, typically < 10 seconds` },
    ],
  },
  {
    id: 'offsets-replay',
    title: 'Offsets and Replay',
    blocks: [
      { type: 'p', text: 'Every record in a partition has an **offset** — a sequential number. Consumers track their position via offsets, enabling replay, restart recovery, and multi-consumer reads.' },
      { type: 'code', code: `Kafka topic: "user-events"
Partition 0: [0: signup, 1: login, 2: purchase, 3: logout, ...]

Consumer group "analytics":
  Committed offset: 3
  → Consumer has processed events 0, 1, 2, 3
  → Next fetch starts at offset 4

Consumer crashes at offset 3 (before committing):
  → Restarts from last committed offset (1)
  → Reprocesses events 1, 2, 3 (at-least-once)

Replay from beginning:
  consumer.seek_to_beginning(partitions)
  → Reprocess entire topic history
  → Use for: rebuilding a derived data store, fixing a bug

Time-based replay:
  consumer.seek_to_timestamp(yesterday_noon)
  → Replay from a point in time` },
    ],
  },
  {
    id: 'exactly-once',
    title: 'Exactly-Once Semantics',
    blocks: [
      { type: 'p', text: 'Kafka guarantees **at-least-once** delivery by default. Achieving **exactly-once** end-to-end requires three things working together.' },
      { type: 'ol', items: [
        '**Idempotent producer:** Kafka deduplicates producer retries using a sequence number. Enable with `enable.idempotence=true`.',
        '**Transactional writes:** Producer begins a transaction and commits atomically to multiple partitions. `producer.initTransactions()` + `beginTransaction()` + `commitTransaction()`.',
        '**Read-committed consumer:** Consumer only sees committed records — incomplete transactions are invisible. `isolation.level=read_committed`.',
      ]},
      { type: 'callout', kind: 'warn', title: 'Exactly-once is not free', text: 'Transactional Kafka has ~2–3× latency overhead and lower throughput. Use it only when duplicate processing causes real business problems (e.g., payment events). For most analytics and logging pipelines, idempotent processing (at-least-once with dedup) is the practical choice.' },
    ],
  },
  {
    id: 'vs-alternatives',
    title: 'Kafka vs Alternatives',
    blocks: [
      { type: 'table', headers: ['System', 'Best For', 'Not Great For'], rows: [
        ['Kafka', 'High-throughput event streaming, replay, CDC, decoupling', 'Simple job queues, request-response, tiny scale'],
        ['RabbitMQ', 'Complex routing, per-message TTL, priority queues, push-based', 'High throughput, replay, multiple consumers'],
        ['AWS SQS', 'Managed simple queues, easy setup, AWS-native', 'Replay, high throughput, complex routing'],
        ['Redis Streams', 'Low-volume in-process queues, simplicity, low latency', 'Huge scale, long retention, multi-DC'],
        ['AWS Kinesis', 'Managed Kafka-like, AWS-native, easy scaling', 'Non-AWS deployments, open-source ecosystem'],
      ]},
      { type: 'callout', kind: 'tip', title: 'Choose Kafka when', text: 'You need replay, multiple independent consumers, >100K msgs/sec, or you\'re building event-driven microservices. For simple "send a job, run once, done" workflows: SQS is simpler and sufficient.' },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'Kafka is the answer for: event streaming, decoupling services, audit logs, CDC pipelines, high-throughput ingestion. Know that ordering is per-partition (not global) and partition count caps parallelism. Mention consumer groups: "multiple independent consumers read the same topic without interfering." For exactly-once: "I\'d use idempotent producers + transactional API + read_committed isolation" — shows deep knowledge.' },
    ],
  },
];

// ── API Gateway ──────────────────────────────────────────────────────────

export const API_GATEWAY: DeepSection[] = [
  {
    id: 'what-is',
    title: 'The Front Door',
    blocks: [
      { type: 'p', text: 'An **API Gateway** is the single entry point for all client requests. It sits between the internet and your services, handling cross-cutting concerns so each service doesn\'t re-implement them.' },
      { type: 'code', code: `Without API Gateway:
  Client → User Service    (auth logic in User Service)
  Client → Order Service   (auth logic in Order Service)
  Client → Payment Service (auth logic in Payment Service)
  → Each service implements auth, rate limiting, logging separately ❌

With API Gateway:
  Client → API Gateway → User Service
                       → Order Service
                       → Payment Service
  → Auth, rate limiting, logging: done ONCE at the gateway ✅

  Benefits:
    Single TLS termination point
    Single auth enforcement point
    Single rate limiting point
    Unified access logs and traces
    Services focus on business logic only` },
    ],
  },
  {
    id: 'responsibilities',
    title: 'Core Responsibilities',
    blocks: [
      { type: 'p', text: 'A gateway handles the concerns that are common to all APIs but shouldn\'t live in individual services.' },
      { type: 'ul', items: [
        '**TLS termination:** Clients connect via HTTPS; backend services communicate over HTTP within the secure network',
        '**Authentication:** Validate JWT tokens, API keys, OAuth tokens — reject unauthenticated requests before they reach services',
        '**Authorization:** Check scopes and permissions at the gateway level (coarse-grained; fine-grained stays in services)',
        '**Rate limiting:** Throttle by IP, user, or API key; return 429 with Retry-After',
        '**Request routing:** Route `/api/users/*` to user-service, `/api/orders/*` to order-service',
        '**Request/response transformation:** Add/strip headers, reshape payloads for different clients',
        '**Observability:** Centralized access logs, distributed trace propagation, latency metrics',
      ]},
    ],
  },
  {
    id: 'auth',
    title: 'Authentication at the Edge',
    blocks: [
      { type: 'p', text: 'Validating auth tokens at the gateway is far more efficient than in every service. A rejected request is stopped in one place — no traffic reaches backend services.' },
      { type: 'code', code: `JWT validation at gateway:
  Client sends: Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...

  Gateway:
    1. Verify JWT signature (using public key from JWKS endpoint)
    2. Check expiry (exp claim)
    3. Extract user_id and scopes from payload
    4. Inject headers: X-User-ID: 42, X-Scopes: read:orders

  Backend service:
    Trusts X-User-ID header (injected by trusted gateway)
    No JWT parsing needed ✅
    No public key management needed ✅

  Unauthenticated request:
    Gateway: 401 Unauthorized ← never reaches backend ✅` },
      { type: 'callout', kind: 'warn', title: 'Trust injected headers only from gateway', text: 'Backend services must ONLY trust X-User-ID headers injected by the gateway. If a client can set X-User-ID directly, they can impersonate any user. Ensure the internal network blocks direct client access to backend services (use network policies or mTLS).' },
    ],
  },
  {
    id: 'rate-limiting',
    title: 'Rate Limiting',
    blocks: [
      { type: 'p', text: 'Distributed rate limiting at the gateway protects all downstream services. It uses Redis for shared counters across multiple gateway nodes.' },
      { type: 'code', code: `Rate limiting strategies:

Token bucket (smooth bursts):
  Each user gets 100 tokens/minute.
  Each request consumes 1 token.
  Unused tokens accumulate (up to bucket size).
  → Handles bursts gracefully.

Fixed window (simple):
  INCR rate:{user_id}:{minute_bucket}
  EXPIRE rate:{user_id}:{minute_bucket} 60
  if count > 100: return 429

Sliding window (accurate):
  ZADD reqs:{user_id} {now_ms} {uuid}
  ZREMRANGEBYSCORE reqs:{user_id} 0 {(now-60s)_ms}
  count = ZCARD reqs:{user_id}
  if count > 100: return 429

Response headers:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 37
  X-RateLimit-Reset: 1716384120
  Retry-After: 23   (only on 429)` },
    ],
  },
  {
    id: 'routing',
    title: 'Routing and Traffic Splitting',
    blocks: [
      { type: 'p', text: 'The gateway routes requests to the correct service based on path, headers, or other attributes. It also enables **canary deployments** and **A/B testing**.' },
      { type: 'code', code: `Path-based routing:
  /api/users/*    → user-service:8001
  /api/orders/*   → order-service:8002
  /api/payments/* → payment-service:8003
  /static/*       → CDN (bypass services entirely)

Header-based routing:
  X-Feature-Beta: true  → new-user-service:8004
  (default)             → user-service:8001

Traffic splitting (canary rollout):
  5% of traffic  → user-service-v2 (new version)
  95% of traffic → user-service-v1 (stable)

  Monitor error rate on v2.
  Gradually increase to 10%, 25%, 50%, 100%.
  If error rate spikes: route 0% to v2 immediately.` },
    ],
  },
  {
    id: 'bff',
    title: 'The BFF Pattern',
    blocks: [
      { type: 'p', text: '**Backend for Frontend (BFF)** is a pattern where you create purpose-built gateway layers for each client type (mobile app, web app, partner API). Each BFF aggregates and shapes data optimally for its client.' },
      { type: 'code', code: `Generic API (one size fits all — bad):
  Mobile app GET /user/42/dashboard
  → Returns 50 fields including desktop-specific data
  → Mobile wastes bandwidth parsing unused fields ❌

BFF pattern:
  Mobile BFF:
    GET /user/42/dashboard → calls user-service + feed-service
    → Returns 8 mobile-optimized fields in one request ✅

  Web BFF:
    GET /user/42/dashboard → calls user-service + analytics-service
    → Returns 30 fields + analytics data ✅

  Partner API Gateway:
    Separate rate limits, auth scheme, response format ✅

Benefits:
  Fewer round trips (aggregation in BFF)
  Right data for right client (no over/under-fetching)
  Independent evolution per client type` },
    ],
  },
  {
    id: 'avoid-god-gateway',
    title: 'Avoid the God Gateway',
    blocks: [
      { type: 'p', text: 'The most common API gateway anti-pattern: adding **business logic** to the gateway. This makes it a bottleneck, a deploy chokepoint, and a maintenance nightmare.' },
      { type: 'compare', aTitle: 'Belongs in gateway', bTitle: 'Does NOT belong in gateway',
        aPoints: [
          'TLS termination',
          'JWT validation and header injection',
          'Rate limiting by IP/user/key',
          'Request routing by path/header',
          'Access logging and trace propagation',
          'Request size limits',
        ],
        bPoints: [
          'Business rules ("VIP users get 2x quota")',
          'Data transformation specific to one service',
          'Database queries',
          'Service-specific orchestration',
          'Complex authorization (service-specific RBAC)',
        ],
      },
      { type: 'callout', kind: 'pitfall', title: 'The gateway as a bottleneck', text: 'Every request passes through the gateway. If the gateway is slow or down, everything is slow or down. Keep it thin, stateless, and horizontally scalable. Heavy logic belongs in services.' },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'Mention the API gateway for any multi-service design: "I\'d put an API Gateway in front — it handles TLS, JWT validation, and rate limiting so services don\'t need to." Name specific tools: Kong, AWS API Gateway, Envoy. Explain the BFF pattern when the interviewer asks about mobile vs web differences. "Don\'t put business logic in the gateway" shows maturity.' },
    ],
  },
];
