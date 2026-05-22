import type { DeepSection } from '../interviewPrepData';

// ── Scaling Writes ───────────────────────────────────────────────────────

export const SCALING_WRITES: DeepSection[] = [
  {
    id: 'why-hard',
    title: 'Why Writes Are Harder Than Reads',
    blocks: [
      { type: 'p', text: 'Reads can be served from any copy of the data — replicas, caches, CDN. Writes must eventually reach **one authoritative place**, and every write must be durable and consistent. This creates a fundamental bottleneck.' },
      { type: 'code', code: `A single well-tuned PostgreSQL primary:
  Simple writes (indexed insert):  ~10,000–30,000 TPS
  With write-ahead log (fsync):    ~1,000–5,000 TPS on spinning disk
  On NVMe SSD:                     ~10,000–50,000 TPS

What exceeds a single Postgres:
  Metrics pipeline: 10M data points/sec
  Chat app: 100M messages/day = ~1,200 msg/sec (manageable)
  IoT telemetry: 500K devices reporting every second` },
      { type: 'p', text: 'When a single DB can\'t absorb your write load, you have these options in order of complexity: **async ingestion** → **batching** → **write-optimised stores** → **sharding**.' },
    ],
  },
  {
    id: 'async-ingestion',
    title: 'Async Ingestion with a Queue',
    blocks: [
      { type: 'p', text: 'The highest-leverage technique: **accept the write into a durable queue, ACK immediately, process later**. This decouples ingestion rate from processing rate and smooths spikes.' },
      { type: 'code', code: `Without async:
  Client → API → DB (writes synchronously)
  If DB is slow: client waits. API holds connection.
  Spike of 100K writes/sec: DB drowns. ❌

With Kafka queue:
  Client → API → Kafka (append to log, <1ms) → ACK 200 ✅
  Workers consume from Kafka at sustainable rate → DB

  Kafka absorbs spikes: writes pile up in the log,
  workers drain them at whatever pace the DB can handle.
  The DB sees a smooth, constant write rate.

Architecture:
  100K writes/sec → Kafka → 10 workers → 10K writes/sec into DB
                                  (matches DB capacity)` },
      { type: 'callout', kind: 'tip', title: 'Kafka as the ingest buffer', text: 'Kafka retains messages for days (configurable). If your processing pipeline falls behind, just let the lag grow — it will catch up. No data is lost. This makes Kafka the standard ingestion buffer for high-volume write pipelines.' },
    ],
  },
  {
    id: 'batching',
    title: 'Batching Writes',
    blocks: [
      { type: 'p', text: '**Batching** coalesces many small writes into fewer large ones. The per-write overhead (network round trip, WAL flush, B-tree update) is amortized across many rows.' },
      { type: 'code', lang: 'sql', code: `Per-row insert (slow):
  INSERT INTO events VALUES (1, 'click', NOW());   -- 1 row
  INSERT INTO events VALUES (2, 'view', NOW());    -- 1 row
  ... (100 separate round trips for 100 rows)

Multi-row insert (10-100x faster):
  INSERT INTO events VALUES
    (1, 'click', NOW()),
    (2, 'view', NOW()),
    ...
    (100, 'scroll', NOW());  -- 1 round trip, 1 WAL flush

PostgreSQL COPY (fastest for bulk loads):
  COPY events FROM '/tmp/batch.csv' CSV;
  -- Bypasses per-row overhead entirely
  -- 10-100x faster than multi-row INSERT for large batches` },
      { type: 'kv', title: 'Write throughput with batching', items: [
        { k: 'Per-row INSERT', v: '~1K rows/sec' },
        { k: 'Multi-row INSERT (1000 rows)', v: '~50K rows/sec' },
        { k: 'COPY command', v: '~500K rows/sec' },
        { k: 'Kafka batched writes', v: 'Millions of msgs/sec' },
      ]},
    ],
  },
  {
    id: 'lsm',
    title: 'Write-Optimized Stores (LSM Tree)',
    blocks: [
      { type: 'p', text: 'Traditional B-tree databases (Postgres, MySQL) update data in-place — every write involves a random I/O to update the tree. At very high write rates, disk seek time becomes the bottleneck.' },
      { type: 'p', text: '**LSM-tree databases** (Cassandra, RocksDB, InfluxDB) write **sequentially** — always append, never in-place. This is 10–100× faster on spinning disk and much faster on SSDs.' },
      { type: 'code', code: `B-Tree write (Postgres):
  Write "update user 42" →
    Find leaf node in tree (random seek) →
    Update in-place →
    Update WAL
  Random I/O pattern. Bottleneck at ~10K writes/sec on HDD.

LSM-Tree write (Cassandra/RocksDB):
  Write "update user 42" →
    Append to in-memory memtable (microseconds) →
    Also append to commit log (sequential write, fast) →
    Return ✅

  Background compaction:
    When memtable fills: flush to immutable SSTable file (sequential)
    Periodically merge SSTables (sorted merge, sequential)

  Result: all writes are sequential → SSD-optimized → massive throughput
  Cassandra: 1M+ writes/sec on a modest cluster` },
      { type: 'callout', kind: 'pitfall', title: 'LSM read amplification', text: 'LSM-tree stores are write-optimized at the cost of read performance. To read a key, you must check the memtable + multiple SSTables. Bloom filters help, but reads are slower than B-tree. Choose LSM stores when write throughput matters more than read latency.' },
    ],
  },
  {
    id: 'sharding-writes',
    title: 'Sharding for Write Throughput',
    blocks: [
      { type: 'p', text: 'When no single machine can handle write volume, **shard** — split data across multiple databases, each handling a fraction of writes.' },
      { type: 'code', code: `Write throughput scaling via sharding:
  1 shard   (1 Postgres):  ~30K writes/sec
  4 shards  (4 Postgres):  ~120K writes/sec
  16 shards (16 Postgres): ~480K writes/sec

Routing:
  shard = hash(user_id) % num_shards
  → Write goes to the correct shard

Critical: choose a shard key that distributes evenly!
  Good:  user_id (high cardinality, random-ish)
  Bad:   created_at (all new writes hit one "current" shard)
  Bad:   country (India has 1.4B users, Luxembourg has 600K)` },
      { type: 'callout', kind: 'warn', title: 'Sharding is a last resort', text: 'Try async ingestion, batching, LSM stores, and vertical scaling first. Each of these can buy years of runway before sharding is needed. Sharding adds enormous complexity: no cross-shard JOINs, no cross-shard transactions, complex resharding.' },
    ],
  },
  {
    id: 'durability',
    title: 'Durability Tuning',
    blocks: [
      { type: 'p', text: 'Every write involves a trade-off between **durability** (data survives crashes) and **latency** (how fast the write completes). This is controlled by how aggressively you flush to disk.' },
      { type: 'table', headers: ['Setting', 'Durability', 'Latency', 'Use When'], rows: [
        ['fsync=on + synchronous_commit=on', 'Maximum — no data loss', '~5–10ms', 'Financial transactions'],
        ['synchronous_commit=off', 'Up to ~200ms of data on crash', '~0.5ms', 'Metrics, logs, analytics'],
        ['acks=all (Kafka)', 'All replicas confirmed', '~10ms', 'Critical events'],
        ['acks=1 (Kafka)', 'Leader only', '~2ms', 'High-throughput telemetry'],
        ['acks=0 (Kafka)', 'Fire-and-forget', '<1ms', 'Best-effort metrics'],
      ]},
      { type: 'callout', kind: 'tip', title: 'Replication as durability', text: 'For many workloads, writing synchronously to a primary + one replica is both faster and safer than fsync per write. The primary doesn\'t need to wait for disk — it just needs the replica to ACK.' },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'For "design a metrics pipeline at 10M writes/sec": Kafka as ingest buffer, worker fleet consuming and batch-writing to ClickHouse or Cassandra (LSM-optimized). Mention that Cassandra\'s LSM tree is specifically designed for this. For "scale writes past a single Postgres": async queue first, then sharding. Always mention the shard key choice and justify it.' },
    ],
  },
];

// ── Handling Large Blobs ─────────────────────────────────────────────────

export const HANDLING_LARGE_BLOBS: DeepSection[] = [
  {
    id: 'dont-use-db',
    title: 'Don\'t Store Files in Your Database',
    blocks: [
      { type: 'p', text: 'Images, videos, PDFs, audio files — anything beyond a few KB belongs in **object storage**, not your transactional database.' },
      { type: 'code', code: `What happens when you store a 5MB photo in Postgres:
  Your row is now 5MB
  Full table scan reads 5MB per row instead of 200 bytes
  Indexes become huge
  Backups take 100x longer
  DB RAM fills with blob data instead of row data
  Network between app and DB carries 5MB per photo access
  → Your DB dies ❌

The correct pattern:
  Database row:  { id, user_id, url, size, content_type, created_at }
  Object store:  the actual bytes live in S3 / GCS / Azure Blob

  DB row = 200 bytes ✅  Blob = wherever S3 stores it` },
      { type: 'callout', kind: 'info', title: 'Cost comparison', text: 'Storing 1 TB in Postgres (on an RDS instance): ~$200/month. Storing 1 TB in S3: ~$23/month. Object storage is ~10x cheaper and infinitely scalable. The DB stores only metadata.' },
    ],
  },
  {
    id: 'object-storage',
    title: 'Object Storage — S3, GCS, Azure Blob',
    blocks: [
      { type: 'p', text: '**Object storage** is a flat namespace of key-value pairs where values can be arbitrarily large files. It scales to exabytes, offers 99.999999999% (11 nines) durability, and costs pennies per GB.' },
      { type: 'kv', title: 'Object storage fundamentals', items: [
        { k: 'Key', v: 'Path-like string: "users/42/profile/photo.jpg"' },
        { k: 'Value', v: 'Arbitrary bytes (photo, video, PDF, zip, etc.)' },
        { k: 'Durability', v: '99.999999999% — data stored across 3+ AZs' },
        { k: 'Cost', v: '~$0.023/GB/month (S3 Standard)' },
        { k: 'Scalability', v: 'Unlimited — no capacity planning needed' },
        { k: 'Throughput', v: '5,500 GET/sec and 3,500 PUT/sec per prefix' },
      ]},
      { type: 'ul', items: [
        '**AWS S3:** the industry standard; huge ecosystem (CloudFront CDN, Lambda triggers, lifecycle rules)',
        '**Google Cloud Storage:** very similar API; slightly better performance for GCP workloads',
        '**Cloudflare R2:** S3-compatible, zero egress fees — great for content delivery',
        '**MinIO:** self-hosted, S3-compatible — for on-prem or cost control',
      ]},
    ],
  },
  {
    id: 'presigned-urls',
    title: 'Pre-Signed URLs',
    blocks: [
      { type: 'p', text: 'A **pre-signed URL** is a time-limited URL signed with your credentials. The client uses it to upload directly to S3 — your servers are never in the data path.' },
      { type: 'code', code: `Without pre-signed URLs (bad):
  Client → Your API (5MB photo) → S3
  → Every photo upload goes through your servers
  → Your API handles huge network I/O
  → Your server costs scale with upload volume

With pre-signed URLs (good):
  1. Client: "I want to upload a photo"
  2. Your API: generates signed S3 URL (valid 5 minutes)
     PUT https://bucket.s3.amazonaws.com/user42/photo.jpg
          ?X-Amz-Signature=...&X-Amz-Expires=300
  3. Client: uploads DIRECTLY to S3 (bypasses your servers) ✅
  4. S3: stores the file, triggers a webhook/event
  5. Your API: records metadata in DB (url, size, etc.)

Benefits:
  Your servers never touch the bytes
  S3 handles bandwidth, timeouts, retries
  Scales to millions of uploads without scaling your API` },
      { type: 'code', code: `Generating a pre-signed URL (Node.js / AWS SDK):
  const url = await s3.getSignedUrlPromise('putObject', {
    Bucket: 'my-uploads',
    Key: "users/42/photos/abc123.jpg",
    Expires: 300,          // 5 minutes
    ContentType: 'image/jpeg',
    ContentLength: 4200000 // Enforce max size server-side
  });
  return { uploadUrl: url, key: "users/42/photos/abc123.jpg" };` },
    ],
  },
  {
    id: 'multipart',
    title: 'Multipart Upload for Large Files',
    blocks: [
      { type: 'p', text: 'For files larger than ~100MB, a single PUT request is risky (network interruptions lose all progress). **Multipart upload** splits the file into chunks and uploads them in parallel, resuming failed parts individually.' },
      { type: 'code', code: `Multipart upload flow:
  1. Initiate: POST /upload → returns UploadId = "abc123"

  2. Upload parts in parallel (each 5–100MB):
     PUT /upload?UploadId=abc123&PartNumber=1  ← bytes 0–99MB
     PUT /upload?UploadId=abc123&PartNumber=2  ← bytes 100–199MB
     PUT /upload?UploadId=abc123&PartNumber=3  ← bytes 200–280MB

  3. Complete: POST with list of (PartNumber, ETag) pairs
     → S3 assembles the parts into one object ✅

Benefits:
  Part 2 fails? → Retry just part 2, not the whole file
  All parts upload in parallel → 3x faster for 3-part file
  S3 enforces minimum part size of 5MB (except last part)

Client library handles this automatically:
  aws s3 cp large-file.zip s3://bucket/key (uses multipart internally)` },
    ],
  },
  {
    id: 'cdn',
    title: 'CDN in Front of Object Storage',
    blocks: [
      { type: 'p', text: 'Object storage has good throughput but is in one region. A **CDN** caches your files at edge nodes close to users, reducing latency and S3 egress costs dramatically.' },
      { type: 'code', code: `Without CDN:
  User in Mumbai → S3 bucket in us-east-1 (Virginia) → ~150ms

With CloudFront CDN:
  First request: Mumbai → CloudFront edge in Mumbai → S3 → ~150ms
  Subsequent:    Mumbai → CloudFront edge in Mumbai (cached) → ~5ms ✅

Cache-Control headers control CDN behavior:
  Cache-Control: public, max-age=86400    ← cache for 24 hours
  Cache-Control: public, max-age=31536000 ← cache for 1 year (with hash in URL)
  Cache-Control: no-store                 ← never cache (sensitive data)

Cache busting:
  photo.jpg            ← browser caches old version ❌
  photo-a3f2b8c9.jpg   ← hash in filename, new hash on update ✅` },
      { type: 'callout', kind: 'tip', title: 'Immutable assets + long TTL', text: 'For profile photos and user-uploaded content, include a content hash or version in the URL. Set Cache-Control to 1 year. When content changes, the URL changes — the old cache entry is simply abandoned, not invalidated. This eliminates cache invalidation complexity.' },
    ],
  },
  {
    id: 'pipeline',
    title: 'Processing Pipeline',
    blocks: [
      { type: 'p', text: 'After upload, files usually need processing: resize images, transcode video, virus scan, extract metadata. These are **async jobs** — never block the upload response for them.' },
      { type: 'code', code: `Processing pipeline:

  1. User uploads photo → S3
  2. S3 emits event: ObjectCreated
  3. SQS/Kafka receives event
  4. Worker picks up job:
     - Resize to 3 sizes (thumbnail, medium, large)
     - Strip EXIF metadata (privacy)
     - Virus scan
     - Save derived URLs to DB
  5. Worker marks job complete in DB
  6. CDN can now serve all 3 sizes

Video transcoding:
  Raw 4K video uploaded → S3
  AWS Elemental MediaConvert job triggered
  Produces: 4K, 1080p, 720p, 480p HLS streams
  Stored back in S3, served via CloudFront` },
      { type: 'callout', kind: 'pitfall', title: 'Processing in the upload handler', text: 'Never resize an image or transcode a video inside the HTTP handler that accepts the upload. These operations take seconds. Queue the work and return 202 Accepted immediately. The client polls for status or subscribes via WebSocket.' },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'For "design Instagram photo upload": pre-signed URL → direct S3 upload → S3 event → resize worker → CDN. Say "I\'d never route file bytes through my API servers — pre-signed URLs let clients upload directly to S3." For mobile uploads: "multipart upload so a dropped connection can resume from the last successful chunk." For serving: "CloudFront CDN in front of S3, cache-control headers, immutable URLs."' },
    ],
  },
];

// ── Managing Long-Running Tasks ──────────────────────────────────────────

export const MANAGING_LONG_RUNNING_TASKS: DeepSection[] = [
  {
    id: 'dont-block',
    title: 'Don\'t Block the Request Thread',
    blocks: [
      { type: 'p', text: 'Any operation taking more than ~1 second should not happen in the HTTP request handler. Users abandon slow pages. Load balancers timeout. Thread pools exhaust.' },
      { type: 'code', code: `Anti-pattern: synchronous long job in API handler
  POST /export → handler runs report for 45 seconds
  → Client times out after 30s (gets a 504 error) ❌
  → Thread is blocked for 45s, can't serve other requests
  → 100 simultaneous exports = 100 blocked threads = server dies

Correct pattern: fire-and-forget + job status
  POST /export → enqueue job, return immediately
  Response: { "jobId": "job_abc123", "status": "queued" }

  Client polls:
  GET /jobs/job_abc123 → { "status": "running", "progress": 42 }
  GET /jobs/job_abc123 → { "status": "done", "downloadUrl": "..." }` },
    ],
  },
  {
    id: 'architecture',
    title: 'Job Queue Architecture',
    blocks: [
      { type: 'p', text: 'The standard pattern: **API enqueues the job → queue delivers to worker → worker processes and writes status → client polls for result.**' },
      { type: 'code', code: `Component roles:
  API Server:
    POST /transcode → validates request → enqueues to SQS/Kafka
    GET  /jobs/:id  → reads job status from DB

  Queue (SQS, Kafka, Redis Streams, RabbitMQ):
    Durable buffer between API and workers
    At-least-once delivery guarantee
    Visibility timeout isolates in-progress jobs

  Worker Fleet:
    Pulls jobs from queue
    Processes (transcode video, generate report, send emails...)
    Writes result + status to DB
    ACKs message (removes from queue)

  Status Store (DB or Redis):
    { job_id, status, progress, result_url, error, created_at }

  Client:
    Polls GET /jobs/:id every few seconds
    Or: subscribes via SSE/WebSocket for push updates` },
      { type: 'kv', title: 'Queue options', items: [
        { k: 'SQS (AWS)', v: 'Managed, at-least-once, easy, great for simple job queues' },
        { k: 'Kafka', v: 'High throughput, replayable, good for event streaming + jobs' },
        { k: 'Redis Streams', v: 'Fast, simple, good for low-volume in-process queues' },
        { k: 'RabbitMQ', v: 'Advanced routing, priority queues, exactly-once-ish' },
        { k: 'Bull (Node.js)', v: 'Redis-backed job queue library, great DX for Node' },
      ]},
    ],
  },
  {
    id: 'at-least-once',
    title: 'At-Least-Once Delivery',
    blocks: [
      { type: 'p', text: 'Queues guarantee **at-least-once delivery** — a message will be delivered one or more times. Workers must be **idempotent** — processing the same job twice produces the same result as processing it once.' },
      { type: 'code', code: `Why at-least-once happens:
  1. Worker pulls job from SQS (message becomes "invisible")
  2. Worker processes job
  3. Worker crashes before ACKing

  → SQS visibility timeout expires
  → Message becomes visible again
  → Another worker pulls the SAME job and processes it again

  If worker was not idempotent:
    Email sent twice ❌
    Video transcoded twice (expensive) ❌
    Row inserted twice ❌

Making workers idempotent:
  # Check if already done before processing
  if db.exists("job_result", job_id):
    return existing_result  # skip re-processing

  # Or use database deduplication:
  INSERT INTO transcoded_videos (job_id, url)
  ON CONFLICT (job_id) DO NOTHING` },
    ],
  },
  {
    id: 'visibility-timeout',
    title: 'Visibility Timeout',
    blocks: [
      { type: 'p', text: 'When a worker pulls a message, it becomes **invisible** to other workers for a **visibility timeout** period. This prevents two workers from processing the same job simultaneously.' },
      { type: 'code', code: `SQS visibility timeout:
  Worker A pulls "transcode video" message
  → Message invisible for 30s (default timeout)

  If Worker A finishes in 20s:
    Worker A ACKs (deletes) the message ✅

  If Worker A crashes at 15s:
    At T=30s: message reappears in queue
    Worker B picks it up and processes ✅

Long jobs need heartbeat extension:
  def process_large_video(job):
    while not done:
      process_chunk()
      sqs.change_message_visibility(receipt, 30)  # extend by 30s
    sqs.delete_message(receipt)  # done ✅

  Without heartbeat: job takes 5min, timeout is 30s,
  another worker starts the same job at T=30s. ❌` },
    ],
  },
  {
    id: 'dlq',
    title: 'Dead Letter Queue (DLQ)',
    blocks: [
      { type: 'p', text: 'Some jobs will always fail — malformed input, bugs, external service outages. After N retries, move them to a **Dead Letter Queue** for investigation. Never let poison messages block the main queue.' },
      { type: 'code', code: `DLQ configuration (SQS):
  Main queue:  maxReceiveCount = 3
  → If a message is received 3 times without being deleted:
    → Move to DLQ automatically

DLQ:
  Holds failed messages indefinitely
  Operators can inspect, fix, and re-queue
  Never blocks main queue processing

Monitoring:
  Alert: DLQ depth > 0  → something is broken
  Alert: DLQ depth growing faster than draining → ongoing failure

Common DLQ causes:
  Bug introduced that makes jobs fail
  Downstream service outage (payment API down)
  Malformed input data from upstream
  Memory/timeout exceeded for a specific job` },
    ],
  },
  {
    id: 'priority',
    title: 'Priority Queues',
    blocks: [
      { type: 'p', text: 'Not all jobs are equal. A paid user\'s report should process before a free tier user\'s. An email confirmation should send before a marketing newsletter.' },
      { type: 'code', code: `Option 1: Separate queues per priority
  high-priority-queue  → 5 workers (always drain first)
  medium-priority-queue → 3 workers
  low-priority-queue   → 1 worker (only when high is empty)

Option 2: Workers with priority polling
  def worker():
    while true:
      job = high_q.poll(timeout=0)       # check high first
      if not job:
        job = medium_q.poll(timeout=0)
      if not job:
        job = low_q.poll(timeout=5s)     # wait on low
      process(job)

Option 3: Redis sorted set (ZADD with score = priority)
  ZADD jobs 1 "job_123"    ← highest priority (lower score = higher)
  ZADD jobs 10 "job_456"   ← lower priority
  ZPOPMIN jobs             ← always returns highest priority job` },
    ],
  },
  {
    id: 'progress',
    title: 'Progress Reporting',
    blocks: [
      { type: 'p', text: 'For jobs taking more than a few seconds, users want a progress indicator. The pattern: workers write checkpoints to a status store; clients poll or subscribe.' },
      { type: 'code', code: `Worker writes progress:
  def transcode_video(job):
    for i, chunk in enumerate(chunks):
      process(chunk)
      redis.hset("job:" + job.id, {
        "status": "running",
        "progress": (i + 1) / len(chunks) * 100
      })
    redis.hset("job:" + job.id, {
      "status": "done",
      "progress": 100,
      "result_url": "https://cdn.example.com/..."
    })

Client polls:
  GET /jobs/job_abc123
  → { status: "running", progress: 64 }

Or server pushes via SSE:
  GET /jobs/job_abc123/events
  data: { "progress": 64 }
  data: { "progress": 81 }
  data: { "status": "done", "url": "..." }` },
      { type: 'callout', kind: 'tip', title: 'Polling vs SSE for progress', text: 'For jobs under 30 seconds, polling every 2–3 seconds is fine. For long jobs (minutes to hours), SSE is better — the server pushes progress events and the connection stays open. For very long jobs (hours), let the client close and push a notification (email, push notification) when done.' },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'For "design a video transcoding system" or "user uploads a 1GB CSV": API enqueues job + returns job ID, workers consume from Kafka/SQS, write progress to Redis, client polls or subscribes via SSE. Mention idempotency (workers crash and retry), visibility timeout extension for long jobs, DLQ for poison messages. Name the triad: at-least-once delivery + idempotent workers + DLQ.' },
    ],
  },
];
