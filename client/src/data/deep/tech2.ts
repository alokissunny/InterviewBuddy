import type { DeepSection } from '../interviewPrepData';

// ── Cassandra ────────────────────────────────────────────────────────────

export const CASSANDRA: DeepSection[] = [
  {
    id: 'why-cassandra',
    title: 'Why Cassandra Exists',
    blocks: [
      { type: 'p', text: 'Cassandra was created at Facebook in 2008 to solve a specific problem: the inbox search feature needed to handle massive writes and reads across multiple data centers, with no single point of failure. Postgres and MySQL couldn\'t scale horizontally for writes.' },
      { type: 'compare', aTitle: 'Cassandra wins when', bTitle: 'Cassandra loses when',
        aPoints: [
          'Write throughput is very high (millions/sec)',
          'Data is time-series or append-heavy',
          'Multi-datacenter replication is required',
          'Linear horizontal scaling matters',
          'Access patterns are known upfront',
        ],
        bPoints: [
          'You need ad-hoc queries or complex JOINs',
          'Strong consistency is required',
          'Data is highly relational',
          'You need ACID transactions across rows',
          'Your team is new to NoSQL modeling',
        ],
      },
    ],
  },
  {
    id: 'architecture',
    title: 'Masterless Ring Architecture',
    blocks: [
      { type: 'p', text: 'Cassandra has **no master node**. Every node is equal. Data is distributed using consistent hashing on a virtual ring. Adding nodes increases capacity linearly.' },
      { type: 'code', code: `Cassandra ring (4 nodes):
  Node A (tokens: 0–25%)    Node B (tokens: 25–50%)
  Node C (tokens: 50–75%)   Node D (tokens: 75–100%)

  Write "user_id=42":
    hash("42") = 0.31  → belongs to Node B (25–50% range)
    With RF=3 (replication factor):
      Node B (primary)
      Node C (replica 1)
      Node D (replica 2)
    → Data on 3 nodes ✅

  If Node B dies:
    Node C and D still have the data.
    Reads/writes reroute automatically.
    No downtime, no failover election needed ✅

vs. Postgres primary-replica:
  Primary dies → elect new primary → ~30s downtime
  Cassandra: no concept of "primary dying" — all nodes equal` },
      { type: 'callout', kind: 'info', title: 'Scylla — Cassandra rewritten in C++', text: 'ScyllaDB is a Cassandra-compatible database rewritten in C++. It achieves significantly higher throughput per node (often 10× Cassandra) due to a shared-nothing architecture and no JVM GC pauses. Drop-in compatible with Cassandra CQL.' },
    ],
  },
  {
    id: 'data-model',
    title: 'Data Model: Partition Key + Clustering Key',
    blocks: [
      { type: 'p', text: 'Cassandra\'s data model is built around the **query**. The schema is designed not for normalization but for the specific access patterns you need.' },
      { type: 'code', code: `CQL table definition for a messaging app:
  CREATE TABLE messages_by_chat (
    chat_id   UUID,          ← partition key: which node stores this
    sent_at   TIMESTAMP,     ← clustering key: sort order within partition
    msg_id    UUID,
    sender_id UUID,
    content   TEXT,
    PRIMARY KEY (chat_id, sent_at)
  ) WITH CLUSTERING ORDER BY (sent_at DESC);

Partition key = which shard?
  hash("chat-id-abc") → Node B

Clustering key = how is data sorted within the partition?
  Rows sorted by sent_at DESC → newest first

Query:
  SELECT * FROM messages_by_chat
  WHERE chat_id = 'chat-id-abc'   ← must specify partition key
  LIMIT 20;                       ← returns newest 20 messages ✅

NOT ALLOWED (no partition key specified):
  SELECT * FROM messages_by_chat WHERE sender_id = '...'; ❌
  → Full cluster scan → extremely expensive` },
      { type: 'callout', kind: 'pitfall', title: 'Model for every query', text: 'In Cassandra, you create one table per query pattern. If you need "messages by chat" AND "messages by user", you create two tables and write to both. This is denormalization by design — not a mistake.' },
    ],
  },
  {
    id: 'consistency',
    title: 'Tunable Consistency',
    blocks: [
      { type: 'p', text: 'With replication factor N, you can tune how many replicas must agree on reads and writes. The formula for strong consistency: **R + W > N**.' },
      { type: 'table', headers: ['Level', 'Meaning', 'Guarantees', 'Use When'], rows: [
        ['ONE', '1 replica responds', 'Fastest, may be stale', 'Metrics, analytics, high throughput'],
        ['QUORUM', 'Majority (N/2+1)', 'Strong if W+R > N', 'Default for most workloads'],
        ['ALL', 'All N replicas', 'Strongest, slowest', 'Financial transactions'],
        ['LOCAL_QUORUM', 'Quorum in local DC only', 'Strong + low latency', 'Multi-DC, latency-sensitive'],
      ]},
      { type: 'code', code: `Example with RF=3:
  QUORUM = floor(3/2) + 1 = 2

  Write at QUORUM: 2 of 3 replicas must ACK
  Read at QUORUM:  2 of 3 replicas must respond

  R + W = 2 + 2 = 4 > 3 (N) → strong consistency ✅

  Write at ONE: only 1 replica ACKs
  Read at ONE:  only 1 replica responds
  → R + W = 2, not > 3 → eventual consistency ❌` },
    ],
  },
  {
    id: 'lsm-storage',
    title: 'LSM Tree Storage',
    blocks: [
      { type: 'p', text: 'Cassandra uses a **Log-Structured Merge (LSM) tree** for storage — optimized for writes. All writes are sequential appends; no in-place updates.' },
      { type: 'code', code: `Write path:
  1. Append to commit log (sequential, fast, durable)
  2. Write to in-memory memtable
  3. Return ✅ (write complete in microseconds)

  Background: when memtable fills →
    Flush to immutable SSTable file (sequential write)

  Background compaction: periodically merge SSTables
    → Remove deleted rows (tombstones)
    → Merge multiple versions of same row
    → All sequential I/O → very fast

vs. B-Tree (Postgres):
  Every write: find the right page (random seek) → update in-place
  Random I/O is expensive → limits write throughput

Result:
  Cassandra: ~1M writes/sec per cluster
  Postgres:  ~50K writes/sec single node` },
    ],
  },
  {
    id: 'hot-partitions',
    title: 'Hot Partitions — The Main Footgun',
    blocks: [
      { type: 'p', text: 'A **hot partition** is one that receives disproportionately more traffic than others. This defeats the entire purpose of horizontal scaling.' },
      { type: 'code', code: `Hot partition examples:

  Bad partition key: "date" for a messaging app
    All messages sent today → same partition → same node → overloaded ❌

  Bad partition key: "celebrity_user_id"
    All fans' comments on celebrity post → same partition ❌

  Bad: partition too large (> 100MB)
    A chat with 10 million messages → one massive partition
    Node can't compact efficiently ❌

Solutions:
  Bucket large partitions:
    Instead of: partition_key = chat_id
    Use:        partition_key = (chat_id, month)
    → Monthly buckets, each stays manageable

  Randomize hot keys:
    partition_key = (celebrity_id, random_suffix_0_to_9)
    → 10 partitions for one celebrity
    → 10x the throughput ✅
    Cost: read all 10 partitions and merge at application layer` },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'When asked about Cassandra: "masterless, tunable consistency, write-optimised via LSM tree, must model data around queries." For the data model: "partition key determines which node, clustering key determines sort order within partition." QUORUM consistency (R+W > N) earns points. Always mention hot partition risk and bucket-based solutions.' },
    ],
  },
];

// ── DynamoDB ─────────────────────────────────────────────────────────────

export const DYNAMODB: DeepSection[] = [
  {
    id: 'what-is',
    title: 'Fully Managed NoSQL at Any Scale',
    blocks: [
      { type: 'p', text: 'Amazon DynamoDB is a **fully managed, serverless NoSQL database**. No servers to provision, no cluster to manage. It delivers single-digit millisecond latency at any throughput — from 1 request/sec to millions — as long as you design your access patterns correctly.' },
      { type: 'kv', title: 'DynamoDB fundamentals', items: [
        { k: 'Data model', v: 'Key-value and document (JSON attributes per item)' },
        { k: 'Scaling', v: 'Automatic (on-demand) or manual (provisioned WCU/RCU)' },
        { k: 'Durability', v: 'Stored across 3 AZs automatically' },
        { k: 'Consistency', v: 'Eventually consistent (default) or strongly consistent reads' },
        { k: 'Max item size', v: '400 KB per item' },
        { k: 'Latency', v: 'Single-digit milliseconds for gets/puts' },
      ]},
      { type: 'callout', kind: 'info', title: 'DynamoDB vs Cassandra', text: 'Both are wide-column NoSQL stores optimized for partition key access. DynamoDB is fully managed (no ops) but vendor-locked. Cassandra is open-source, harder to operate, but portable. On AWS: use DynamoDB. Multi-cloud or on-prem: consider Cassandra.' },
    ],
  },
  {
    id: 'keys',
    title: 'Keys: Partition Key and Sort Key',
    blocks: [
      { type: 'p', text: 'Every DynamoDB table has a **partition key** (mandatory) and an optional **sort key**. These together form the primary key.' },
      { type: 'code', code: `Simple primary key (partition key only):
  Table: Users
  Partition key: user_id

  user_id   | name   | email              | age
  ──────────────────────────────────────────────
  "user_42" | "Alok" | "alok@example.com" | 28
  "user_99" | "Priya"| "priya@example.com"| 25

  Query: GetItem(user_id="user_42") → single item ✅
  Cannot: query all users aged 25–30 ❌ (no sort key on age)

Composite primary key (partition key + sort key):
  Table: Messages
  Partition key: chat_id
  Sort key:      sent_at

  chat_id     | sent_at          | msg_id | content
  ──────────────────────────────────────────────────
  "chat_abc"  | "2026-05-22T10:00"| m1    | "Hey!"
  "chat_abc"  | "2026-05-22T10:01"| m2    | "Hi!"
  "chat_xyz"  | "2026-05-22T09:00"| m3    | "Hello"

  Query: all messages in chat_abc after 10:00 ✅
  → partition key is required; sort key enables range queries` },
    ],
  },
  {
    id: 'capacity',
    title: 'Read and Write Capacity',
    blocks: [
      { type: 'p', text: 'DynamoDB capacity is measured in **Read Capacity Units (RCU)** and **Write Capacity Units (WCU)**.' },
      { type: 'kv', title: 'Capacity unit definitions', items: [
        { k: '1 RCU (strongly consistent)', v: '1 read of up to 4KB per second' },
        { k: '1 RCU (eventually consistent)', v: '2 reads of up to 4KB per second' },
        { k: '1 WCU', v: '1 write of up to 1KB per second' },
      ]},
      { type: 'compare', aTitle: 'Provisioned Capacity', bTitle: 'On-Demand Capacity',
        aPoints: [
          'You specify RCUs and WCUs',
          'Cheaper at predictable, high load',
          'Must manually scale or use Auto Scaling',
          'Throttles if you exceed provisioned capacity',
        ],
        bPoints: [
          'DynamoDB scales automatically',
          'Pay per request (~6x more expensive per request)',
          'Great for unpredictable or low traffic',
          'No throttling (up to limits)',
        ],
      },
      { type: 'callout', kind: 'pitfall', title: 'Hot partition throttling', text: 'A single partition handles ~3,000 RCU and ~1,000 WCU. If a partition key is "hot" (most traffic lands on one key), you\'ll be throttled even if total table capacity is fine. Adaptive Capacity helps but doesn\'t eliminate this. Design partition keys to distribute load evenly.' },
    ],
  },
  {
    id: 'indexes',
    title: 'Secondary Indexes: GSI and LSI',
    blocks: [
      { type: 'p', text: 'DynamoDB only allows queries by the primary key. **Secondary indexes** let you query by other attributes.' },
      { type: 'compare', aTitle: 'GSI (Global Secondary Index)', bTitle: 'LSI (Local Secondary Index)',
        aPoints: [
          'Different partition key from the table',
          'Separate read/write capacity (costs money)',
          'Can be created after table creation',
          'Eventually consistent (default)',
          'Use: "find all orders for a product"',
        ],
        bPoints: [
          'Same partition key, different sort key',
          'Shares table capacity',
          'Must be defined at table creation',
          'Strongly consistent reads possible',
          'Use: "find all messages in a chat, sorted by author"',
        ],
      },
      { type: 'code', code: `GSI example — find orders by product:
  Table: Orders (PK: order_id)
  GSI:   ProductOrders-Index (PK: product_id, SK: ordered_at)

  Query:
    GET from ProductOrders-Index
    WHERE product_id = "prod_42"
    AND ordered_at BETWEEN "2026-01-01" AND "2026-05-01"
  → Returns all orders for product 42 in date range ✅` },
    ],
  },
  {
    id: 'single-table',
    title: 'Single-Table Design',
    blocks: [
      { type: 'p', text: '**Single-table design** puts all entities in one DynamoDB table using a composite key pattern (`PK: USER#42`, `SK: ORDER#789`). This allows related entities to be co-located on the same partition, enabling complex queries in a single request.' },
      { type: 'code', code: `Multi-table (anti-pattern for DynamoDB):
  users table  + orders table  + products table
  → 3 separate requests for a user's dashboard
  → No joins possible ❌

Single-table design:
  PK             | SK              | data...
  ─────────────────────────────────────────────────────
  USER#42        | PROFILE          | name, email, ...
  USER#42        | ORDER#2026-01-01 | total, status, ...
  USER#42        | ORDER#2026-03-15 | total, status, ...
  PRODUCT#99     | METADATA         | name, price, ...
  PRODUCT#99     | REVIEW#user_42   | rating, text, ...

Query "user 42 and all their orders":
  PK = "USER#42" AND SK begins_with "ORDER"
  → Single partition, single request ✅

Query "product 99 and all reviews":
  PK = "PRODUCT#99" AND SK begins_with "REVIEW"
  → Single partition, single request ✅` },
      { type: 'callout', kind: 'warn', title: 'Single-table is not for everyone', text: 'Single-table design is powerful but complex. It makes queries rigid (hard to add new access patterns), and the schema is hard to understand at a glance. For teams new to DynamoDB, multiple well-designed tables with GSIs is often more maintainable.' },
    ],
  },
  {
    id: 'streams',
    title: 'DynamoDB Streams',
    blocks: [
      { type: 'p', text: '**DynamoDB Streams** captures a time-ordered log of every change (insert, update, delete). This is CDC built into DynamoDB.' },
      { type: 'code', code: `Every write emits a stream record:
  { eventType: "INSERT", newImage: { user_id: 42, name: "Alok" } }
  { eventType: "MODIFY", newImage: { user_id: 42, name: "Alok S." } }
  { eventType: "REMOVE", oldImage: { user_id: 42 } }

Common uses:
  Trigger Lambda → send welcome email on new user
  Trigger Lambda → update Elasticsearch index on product change
  Trigger Lambda → invalidate Redis cache on price change
  Replicate to another DynamoDB table (global tables)
  Maintain a materialized view in another service

Lambda trigger (serverless):
  DynamoDB Streams → Lambda function
  → No polling needed, Lambda invoked automatically
  → At-least-once delivery (Lambda must be idempotent)` },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'DynamoDB is your answer for serverless, single-digit-ms NoSQL on AWS. Know the partition key + sort key model. For "find orders by user AND by product": two access patterns need a GSI. For "user profile + orders in one request": single-table design with composite keys. Hot partition avoidance: high-cardinality partition key, no "global" keys like "status=active".' },
    ],
  },
];

// ── PostgreSQL ───────────────────────────────────────────────────────────

export const POSTGRESQL: DeepSection[] = [
  {
    id: 'why-default',
    title: 'Why Postgres Is the Default',
    blocks: [
      { type: 'p', text: 'PostgreSQL is the most popular database for new systems for good reason: it\'s free, open-source, ACID-compliant, extensible, and handles most workloads that startups and mid-sized companies encounter without hitting scaling limits for years.' },
      { type: 'kv', title: 'What Postgres handles well', items: [
        { k: 'Single-node OLTP', v: 'Tens of thousands of TPS on modern hardware' },
        { k: 'Data size', v: 'TB-scale with proper indexing and partitioning' },
        { k: 'Query complexity', v: 'Full SQL, window functions, CTEs, lateral joins' },
        { k: 'Data types', v: 'JSONB, arrays, ranges, UUID, geometric, full-text' },
        { k: 'Extensions', v: 'pgvector (ML), PostGIS (geo), TimescaleDB (time-series), pglogical' },
      ]},
      { type: 'callout', kind: 'tip', title: 'Start with Postgres', text: 'Unless you have a very specific reason (massively write-heavy, strict time-series, graph queries), start with Postgres. It eliminates most operational overhead, and you can add caching, read replicas, and partitioning as you grow without migrating to a new database.' },
    ],
  },
  {
    id: 'mvcc',
    title: 'MVCC: Readers Never Block Writers',
    blocks: [
      { type: 'p', text: '**Multi-Version Concurrency Control (MVCC)** is the engine behind Postgres\'s concurrency. Instead of locking rows for reads, Postgres keeps **multiple versions** of each row — one per in-flight transaction.' },
      { type: 'code', code: `MVCC in action:

  T=0: Row: { id: 42, balance: 1000 }

  Transaction A reads row 42 (starts at T=1):
    → Sees version from T=1: { balance: 1000 }

  Transaction B updates row 42 (T=2):
    → Creates new version: { balance: 900 } (xmin=T2)
    → Old version: { balance: 1000 } (xmax=T2, visible to T<T2)
    → Commits

  Transaction A reads row 42 again (still running since T=1):
    → Postgres shows version visible at T=1: { balance: 1000 }
    → No lock needed! Reader not blocked by writer ✅

  VACUUM later:
    Removes old versions no longer visible to any transaction
    (Dead tuples = the old versions = table bloat without VACUUM)` },
      { type: 'callout', kind: 'warn', title: 'VACUUM and table bloat', text: 'MVCC creates dead tuples — old row versions no longer needed. Without VACUUM, the table grows indefinitely. `autovacuum` runs automatically but may not keep up on heavily updated tables. Monitor `pg_stat_user_tables.n_dead_tup` and tune autovacuum for hot tables.' },
    ],
  },
  {
    id: 'isolation',
    title: 'Transaction Isolation Levels',
    blocks: [
      { type: 'p', text: 'Postgres supports four isolation levels. Higher isolation = fewer anomalies, but more transaction retries. Most applications work fine with **Read Committed** (the default).' },
      { type: 'table', headers: ['Level', 'Anomalies Prevented', 'Default?', 'Use When'], rows: [
        ['Read Uncommitted', 'None (same as RC in Postgres)', 'No', 'Not used in Postgres'],
        ['Read Committed', 'Dirty reads', 'Yes', 'Most OLTP applications'],
        ['Repeatable Read', 'Dirty reads + non-repeatable reads', 'No', 'Reports running across multiple queries'],
        ['Serializable', 'All anomalies (phantom reads etc.)', 'No', 'Financial transfers, booking systems'],
      ]},
      { type: 'code', code: `Where isolation level bites:

Read Committed anomaly (phantom read):
  T1 reads all users with balance > 100: finds 5
  T2 inserts new user with balance = 200 and commits
  T1 reads again: finds 6 (phantom appeared!)
  → Fixed with Repeatable Read or Serializable

Serializable anomaly (write skew):
  Two doctors check on-call schedule:
  Doctor A: sees 2 on-call → decides to take off
  Doctor B: sees 2 on-call → decides to take off
  → Both commit → 0 doctors on call! ❌
  → Only Serializable prevents this` },
    ],
  },
  {
    id: 'index-types',
    title: 'Postgres Index Types',
    blocks: [
      { type: 'p', text: 'Postgres offers multiple index types beyond the standard B-tree. Choosing the right one can dramatically improve query performance.' },
      { type: 'table', headers: ['Index Type', 'Best For', 'Example'], rows: [
        ['B-tree (default)', 'Equality and range queries on most types', '=, <, >, BETWEEN, ORDER BY'],
        ['Hash', 'Equality only, faster than B-tree for =', 'WHERE session_token = $1'],
        ['GIN', 'Full-text search, JSONB containment, arrays', 'to_tsvector, @>, &&'],
        ['GiST', 'Geometric data, IP ranges, full-text', 'PostGIS, range operators'],
        ['BRIN', 'Huge tables with naturally ordered data', 'IoT timestamps, event logs'],
        ['Partial', 'Index only rows matching a condition', 'WHERE status = \'active\''],
        ['Expression', 'Index result of a function', 'LOWER(email), date_trunc(...)'],
      ]},
      { type: 'code', code: `JSONB indexing (GIN):
  -- Index for containment queries
  CREATE INDEX idx_user_tags ON users USING GIN(tags);

  -- Query using GIN index:
  SELECT * FROM users WHERE tags @> '["premium", "india"]';
  → Finds users with BOTH tags in their tags array ✅

Full-text search index:
  ALTER TABLE articles ADD COLUMN search_vector TSVECTOR;
  CREATE INDEX idx_fts ON articles USING GIN(search_vector);
  → Sub-millisecond full-text search on millions of articles` },
    ],
  },
  {
    id: 'jsonb',
    title: 'JSONB: Document Storage in Postgres',
    blocks: [
      { type: 'p', text: '**JSONB** stores JSON as a binary format that can be indexed and queried efficiently. This gives you document-database flexibility within a relational ACID-compliant store.' },
      { type: 'code', lang: 'sql', code: `CREATE TABLE events (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT,
  payload JSONB
);

INSERT INTO events (user_id, payload) VALUES
(42, '{"action": "purchase", "item_id": 99, "amount": 599}');

-- Query inside JSONB:
SELECT * FROM events
WHERE payload ->> 'action' = 'purchase'   -- text access
  AND (payload ->> 'amount')::int > 100;

-- Index on a JSONB path:
CREATE INDEX idx_events_action ON events ((payload ->> 'action'));

-- GIN index for containment:
CREATE INDEX idx_events_gin ON events USING GIN(payload);
SELECT * FROM events WHERE payload @> '{"item_id": 99}';` },
      { type: 'callout', kind: 'tip', title: 'JSONB vs MongoDB', text: 'JSONB in Postgres replaces MongoDB for many use cases while keeping SQL, JOINs, transactions, and ACID guarantees. Use JSONB for flexible/polymorphic attributes alongside structured columns — not as a wholesale replacement for relational modeling.' },
    ],
  },
  {
    id: 'replication',
    title: 'Replication',
    blocks: [
      { type: 'p', text: 'Postgres supports two replication modes: **physical** (exact copy of all pages) and **logical** (row-level change stream). Both power read replicas and high availability.' },
      { type: 'compare', aTitle: 'Physical Replication (Streaming)', bTitle: 'Logical Replication',
        aPoints: [
          'Replicates entire WAL (all tables, all schemas)',
          'Exact binary copy of the primary',
          'Sub-second lag typical',
          'Standby can be promoted to primary on failover',
          'Used for: HA, read replicas',
        ],
        bPoints: [
          'Row-level changes selectable by table/schema',
          'Can replicate to different Postgres versions',
          'Can replicate to other systems (Debezium → Kafka)',
          'Allows schema differences between source and target',
          'Used for: CDC, selective replication, migrations',
        ],
      },
    ],
  },
  {
    id: 'scaling',
    title: 'Scaling Limits and Options',
    blocks: [
      { type: 'p', text: 'Postgres scales well up to a single large machine. Beyond that, you have several options before resorting to full sharding.' },
      { type: 'ol', items: [
        '**Read replicas:** offload SELECT queries. Add multiple replicas as reads grow.',
        '**Connection pooling (PgBouncer):** Postgres struggles with >500 concurrent connections. PgBouncer multiplexes thousands of app connections onto a smaller pool.',
        '**Partitioning:** Split a large table into smaller partitions by range, list, or hash. Query planner prunes irrelevant partitions.',
        '**Citus extension:** Transparent sharding of Postgres across multiple nodes. Same SQL interface, horizontal write scaling.',
        '**Separate write-heavy workloads:** Move metrics, logs, time-series to specialized DBs (TimescaleDB, ClickHouse).',
      ]},
      { type: 'callout', kind: 'info', title: 'Postgres can go very far', text: 'With proper indexing, connection pooling, read replicas, partitioning, and caching, a single Postgres cluster can handle most companies\' needs well past 10 million users. Many unicorns ran on Postgres for years. Don\'t prematurely shard.' },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'Postgres is the right starting point for most systems. Know MVCC (reads don\'t block writes), JSONB for flexible data, and the index types (GIN for full-text/arrays, BRIN for huge ordered tables). For scaling: "I\'d start with read replicas and connection pooling via PgBouncer, then partitioning, and only shard if necessary." For slow queries: "First I\'d run EXPLAIN ANALYZE to check if an index is being used."' },
    ],
  },
];

// ── Flink ────────────────────────────────────────────────────────────────

export const FLINK: DeepSection[] = [
  {
    id: 'stream-vs-batch',
    title: 'Stream Processing vs Batch Processing',
    blocks: [
      { type: 'p', text: 'Traditionally, analytics ran as **batch jobs**: collect data for an hour/day, run computation, get results. **Stream processing** runs computation continuously as data arrives — results are available in seconds, not hours.' },
      { type: 'compare', aTitle: 'Batch Processing (Spark, Hadoop)', bTitle: 'Stream Processing (Flink)',
        aPoints: [
          'Process accumulated data at scheduled intervals',
          'High throughput for historical data',
          'Simple mental model: input → compute → output',
          'Results lag by minutes to hours',
          'Spark Streaming: actually micro-batches every few seconds',
        ],
        bPoints: [
          'Process events as they arrive (per-event)',
          'Results in milliseconds to seconds',
          'Handles late-arriving events with watermarks',
          'Stateful operators: running totals, sessions, windows',
          'Flink: truly per-event, not micro-batched',
        ],
      },
      { type: 'p', text: 'Flink\'s key differentiator from Spark Streaming: Flink processes **one event at a time** with true streaming semantics. Spark Streaming collects events into micro-batches (every 100ms–10s) before processing — introducing inherent latency.' },
    ],
  },
  {
    id: 'event-time',
    title: 'Event Time vs Processing Time',
    blocks: [
      { type: 'p', text: 'One of the trickiest concepts in stream processing: **when did the event actually happen** (event time) vs **when did Flink see it** (processing time).' },
      { type: 'code', code: `Example: Mobile app sends events. User is offline for 2 hours.

  Event actually occurred:     10:00, 10:01, 10:05
  Events arrive at Flink:      12:03, 12:03, 12:04 (2 hours late!)

Using Processing Time:
  Count events in the 10:00-11:00 window
  → These 3 events arrive at 12:03 → counted in 12:00-13:00 window ❌
  → Wrong! Events happened in the 10am hour, not the 12pm hour.

Using Event Time:
  Flink uses the timestamp embedded in the event
  → Events at 10:00, 10:01, 10:05 → counted in 10:00-11:00 window ✅

When Event Time matters:
  Financial reporting (must match when transaction occurred)
  Clickstream analytics (user's session timing)
  IoT sensors with intermittent connectivity

When Processing Time is fine:
  Monitoring and alerting (you care about "now")
  Approximate metrics where timing doesn't matter` },
    ],
  },
  {
    id: 'watermarks',
    title: 'Watermarks — Handling Late Events',
    blocks: [
      { type: 'p', text: 'Flink can\'t wait forever for late events. **Watermarks** define how long Flink waits before closing a time window and emitting results.' },
      { type: 'code', code: `Watermark = "I believe all events up to time T have arrived"

Without watermarks:
  Window 10:00-11:00: Flink waits indefinitely for late events
  → Never closes → no results ever emitted ❌

With watermark (delay = 10 minutes):
  When Flink sees event at time T:
    Watermark = T - 10 minutes
  When watermark passes 11:00:
    → Flink closes the 10:00-11:00 window
    → Emits result (even if some events arrive up to 10 min late)
    → Events >10min late are dropped (or sent to a side output)

Trade-off:
  Larger delay → more accurate (fewer dropped late events)
  Smaller delay → lower latency results

  For real-time alerting: 0-second watermark (accept inaccuracy)
  For daily financial report: 1-hour watermark (high accuracy)` },
    ],
  },
  {
    id: 'windows',
    title: 'Windows',
    blocks: [
      { type: 'p', text: 'Windows group events into finite buckets for aggregation. Different window types serve different analytics needs.' },
      { type: 'table', headers: ['Window Type', 'Definition', 'Use Case'], rows: [
        ['Tumbling', 'Fixed-size, non-overlapping (e.g., each minute)', 'Hourly revenue, per-minute error counts'],
        ['Sliding', 'Fixed-size, overlapping (e.g., 1h window, every 5min)', 'Moving averages, trending topics'],
        ['Session', 'Gap-based: window closes after N seconds of inactivity', 'User sessions, idle-based grouping'],
        ['Global', 'All events for a key, trigger manually', 'Counting total events per user ever'],
      ]},
      { type: 'code', code: `Tumbling window example (fraud detection):
  Per-user, per-minute transaction sum:

  stream
    .keyBy(txn -> txn.userId)
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .sum("amount")
    .filter(sum -> sum > 10000)  // alert if >10K in 1 minute
    .addSink(alertSink);

Sliding window (moving average):
  stream
    .keyBy(sensor -> sensor.id)
    .window(SlidingEventTimeWindows.of(Time.hours(1), Time.minutes(5)))
    .mean("temperature")
    .addSink(dashboardSink);` },
    ],
  },
  {
    id: 'state-checkpointing',
    title: 'Stateful Processing and Checkpointing',
    blocks: [
      { type: 'p', text: 'Flink operators can maintain **state** — running totals, session data, machine learning model state. This state must survive failures.' },
      { type: 'code', code: `Stateful operator example (counting per user):
  class UserEventCounter extends KeyedProcessFunction:
    // State is local to this operator instance, durable
    count_state = ValueState<Long>()

    def process_element(event):
      current = count_state.value() or 0
      count_state.update(current + 1)

      if current + 1 % 100 == 0:
        emit("User " + event.user_id + " hit " + (current+1) + " events")

Checkpointing:
  Flink periodically takes an async snapshot of ALL state
  Snapshot stored durably in S3/HDFS
  Frequency: every 10s to 60s (configurable)

  Worker fails at T=250s, last checkpoint at T=240s:
    Flink restarts from T=240s checkpoint
    Replays source (Kafka) from offset at T=240s
    Exactly the state we had at T=240s ✅
    10 seconds of events re-processed (at-least-once by default)` },
    ],
  },
  {
    id: 'exactly-once',
    title: 'Exactly-Once End-to-End',
    blocks: [
      { type: 'p', text: 'Flink achieves **exactly-once** processing end-to-end with three pieces working together.' },
      { type: 'ol', items: [
        '**Replayable source:** Kafka stores committed offsets; on restart, Flink replays from the checkpointed offset.',
        '**Checkpointed state:** Flink\'s periodic checkpoints capture operator state and source offsets atomically.',
        '**Transactional sink:** The sink writes in a transaction that commits only when the checkpoint completes (two-phase commit).',
      ]},
      { type: 'code', code: `Without exactly-once:
  Flink processes event → writes result to sink
  Worker crashes before checkpoint
  Flink restarts → re-processes event → writes AGAIN
  → Duplicate in sink ❌ (if sink not idempotent)

With exactly-once (two-phase sink):
  Phase 1: Flink writes to sink in a pre-commit transaction
  Checkpoint completes:
    Kafka offsets saved
    All operator state saved
    Sink COMMITS the transaction

  Worker crash before commit:
    Restart from checkpoint
    Sink transaction rolled back
    Re-process + re-write → single commit ✅` },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'Flink comes up for "real-time fraud detection", "live analytics", or "streaming ETL". Explain event time vs processing time clearly — interviewers specifically test this. Know the window types (tumbling for fixed periods, session for user activity). "Exactly-once requires replayable source (Kafka) + checkpointed state + transactional sink." Mention Netflix, Uber, and Stripe use Flink in production.' },
    ],
  },
];

// ── ZooKeeper ────────────────────────────────────────────────────────────

export const ZOOKEEPER: DeepSection[] = [
  {
    id: 'coordination-problem',
    title: 'The Distributed Coordination Problem',
    blocks: [
      { type: 'p', text: 'Distributed systems need coordination: which node is the leader? Which worker owns this partition? What is the current config? Without a coordination service, every system re-invents these primitives — badly.' },
      { type: 'ul', items: [
        '**Leader election:** among N replicas, exactly one must be the active primary',
        '**Distributed locks:** only one worker should process a given job at a time',
        '**Service discovery:** which servers are alive and serving which service?',
        '**Configuration management:** all nodes must see the same config, updated atomically',
        '**Group membership:** track which cluster members are alive (heartbeat)',
      ]},
      { type: 'p', text: 'ZooKeeper provides a single, strongly-consistent, replicated service that solves all of these with a simple API.' },
    ],
  },
  {
    id: 'data-model',
    title: 'ZooKeeper Data Model',
    blocks: [
      { type: 'p', text: 'ZooKeeper stores data as **znodes** in a hierarchical namespace — like a filesystem. Each znode has data (small, < 1MB) and children.' },
      { type: 'code', code: `ZooKeeper namespace:
  /
  ├── /services
  │   ├── /services/payment-service
  │   │   ├── /services/payment-service/node1  [data: "10.0.0.1:8080"]
  │   │   └── /services/payment-service/node2  [data: "10.0.0.2:8080"]
  │   └── /services/user-service
  │       └── /services/user-service/node1     [data: "10.0.0.3:8080"]
  ├── /config
  │   └── /config/feature-flags               [data: '{"chat": true}']
  └── /election
      └── /election/payment-leader            [data: "node1"]

Operations:
  create(path, data)     → create a znode
  delete(path)           → delete a znode
  getData(path)          → read data
  setData(path, data)    → write data
  getChildren(path)      → list children
  exists(path, watch)    → check existence + optional watch` },
    ],
  },
  {
    id: 'ephemeral-nodes',
    title: 'Ephemeral Nodes — Liveness Detection',
    blocks: [
      { type: 'p', text: '**Ephemeral znodes** are automatically deleted when the client session that created them disconnects. This is the foundation of liveness detection and leader election.' },
      { type: 'code', code: `Service registration with ephemeral nodes:

  Service "payment-node1" starts:
    ZK session established (kept alive via heartbeats)
    Creates: /services/payment/node1 (EPHEMERAL)
             [data: "10.0.0.1:8080"]

  Other services:
    Watch /services/payment/ for changes

  "payment-node1" crashes:
    ZK session expires (no heartbeats)
    ZK automatically DELETES /services/payment/node1

  Watchers notified: node1 is gone
    → Load balancer removes it from rotation
    → No manual deregistration needed ✅

  Compare to manual health checks:
    Crashed node stays in rotation until health check fires (30s gap)
    Ephemeral nodes: gone in seconds (ZK session timeout)` },
    ],
  },
  {
    id: 'watches',
    title: 'Watches — Event Notifications',
    blocks: [
      { type: 'p', text: 'A **watch** is a one-shot trigger: the client says "notify me if this znode changes." After firing, the watch must be re-registered.' },
      { type: 'code', code: `Config reload using watches:
  Service starts:
    getData("/config/feature-flags", watch=True)
    → Reads config, registers a watch

  Admin updates config:
    setData("/config/feature-flags", '{"chat": true}')

  All watching services receive notification:
    "Data changed at /config/feature-flags"
    → Each service calls getData again (re-registers watch)
    → Config updated live, no restart needed ✅

  Group membership watch:
    getChildren("/election", watch=True)
    → Notified when any child is added or deleted
    → Used by election participants to detect leader changes

Note: watches are one-shot (fire once, must re-register).
  Between watch firing and re-registration: missed events possible.
  For critical logic, always re-read data after watch fires.` },
    ],
  },
  {
    id: 'zab-cp',
    title: 'ZAB Protocol: CP Consistency',
    blocks: [
      { type: 'p', text: 'ZooKeeper uses the **ZooKeeper Atomic Broadcast (ZAB)** protocol — a leader-based total-order broadcast. Every write goes through the leader and is applied in the same order on all followers.' },
      { type: 'code', code: `ZAB write flow:
  Client sends write to any ZK node
  If not leader: forward to leader

  Leader:
    Assigns global transaction ID (zxid)
    Sends PROPOSAL to all followers
    Waits for majority (quorum) of ACKs
    Sends COMMIT to all followers

  Read:
    Can be served from any node (stale reads possible)
    Sync read: read from leader only (always fresh)

CAP implications:
  ZooKeeper is CP:
    Network partition → ZK quorum can't form
    → ZK becomes unavailable rather than serving stale data
    → Correct for locks and leader election
    → Bad choice if you need availability over consistency` },
      { type: 'callout', kind: 'info', title: '5-node ZooKeeper ensemble', text: 'ZooKeeper needs an odd number of nodes to form a quorum. A 5-node ensemble can tolerate 2 node failures (needs 3 of 5). A 3-node ensemble tolerates 1 failure. For production: 3 or 5 nodes in separate failure domains.' },
    ],
  },
  {
    id: 'leader-election',
    title: 'Leader Election',
    blocks: [
      { type: 'p', text: 'Leader election is one of ZooKeeper\'s most important use cases, used by Kafka (pre-KRaft), HBase, and many more.' },
      { type: 'code', code: `Leader election using sequential ephemeral nodes:

  Each candidate creates:
    /election/leader-0000000001  (sequential, ephemeral)
    /election/leader-0000000002
    /election/leader-0000000003

  Lowest sequence number = current leader

  node1 (seq=1) is leader.

  node1 crashes:
    /election/leader-0000000001 deleted (ephemeral)
    node2 (seq=2) watches for deletion of node1's znode
    node2 detects deletion → becomes leader ✅

  node2 watches node1 specifically (not all nodes):
    → Herd effect: if everyone watches the same node,
      all candidates get notified simultaneously → ZK overloaded
    → Instead: each watches only the one immediately ahead ✅` },
    ],
  },
  {
    id: 'vs-alternatives',
    title: 'ZooKeeper vs etcd vs Consul',
    blocks: [
      { type: 'table', headers: ['System', 'Protocol', 'API', 'Best For'], rows: [
        ['ZooKeeper', 'ZAB (leader-based)', 'Hierarchical znodes, watches', 'Battle-tested coordination, Kafka/HBase'],
        ['etcd', 'Raft', 'Key-value, watch, leases', 'Kubernetes control plane, modern Kubernetes-native'],
        ['Consul', 'Raft', 'KV, service mesh, DNS, health checks', 'Service discovery + health, hybrid cloud'],
      ]},
      { type: 'compare', aTitle: 'Choose ZooKeeper when', bTitle: 'Choose etcd when',
        aPoints: [
          'You\'re already using Kafka (uses ZK by default pre-4.0)',
          'HBase or other ZK-native systems in your stack',
          'Battle-tested in enterprise Java environments',
        ],
        bPoints: [
          'Kubernetes workloads (etcd is K8s\'s backbone)',
          'Modern greenfield projects',
          'Simpler Raft-based guarantees',
          'Better performance under high write load',
        ],
      },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'ZooKeeper is rarely the main subject but appears as a supporting technology. Know: "CP system used for leader election, distributed locks, and service discovery." Explain ephemeral nodes for liveness. For leader election: "lowest sequential ephemeral znode wins; each candidate watches only the one ahead to avoid herd effect." Mention etcd as the modern alternative.' },
    ],
  },
];
