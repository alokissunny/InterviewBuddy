import type { DeepSection } from '../interviewPrepData';

// ── Real-Time Updates ────────────────────────────────────────────────────

export const REAL_TIME_UPDATES: DeepSection[] = [
  {
    id: 'the-problem',
    title: 'The Problem: Static Request-Response',
    blocks: [
      { type: 'p', text: 'HTTP\'s request-response model works for most things: you ask, you get an answer. But real-time apps need the server to **push** data to the client without being asked.' },
      { type: 'ul', items: [
        '**Chat:** Priya sends a message — Alok\'s screen must update instantly, not when he refreshes',
        '**Live scores:** a goal is scored — fans must see it within a second',
        '**Collaborative editor:** your teammate moves their cursor — you see it in real time',
        '**Stock ticker:** price changes 100 times per second — every update matters',
      ]},
      { type: 'code', code: `Classic polling (terrible):
Client: "Any new messages?" → Server: "No."
(3s later)
Client: "Any new messages?" → Server: "No."
(3s later)
Client: "Any new messages?" → Server: "Yes! Here is 1 new message."

Problems:
  Most requests return nothing (wasted bandwidth and compute)
  3-second delay feels broken to users
  1,000 users x 1 req/3s = 333 wasted requests/sec` },
      { type: 'p', text: 'There are four progressively better solutions: **long polling**, **SSE**, **WebSockets**, and **pub/sub fan-out** for scale.' },
    ],
  },
  {
    id: 'long-polling',
    title: 'Long Polling — The Simple Workaround',
    blocks: [
      { type: 'p', text: 'Long polling is the simplest real-time technique: the client opens an HTTP request and the server **holds it open** until data is ready (or a timeout fires).' },
      { type: 'code', code: `Short polling:                 Long polling:
Client → "Any new?"           Client → "Any new?"
Server → "No." (instantly)    Server: holds connection open...
(wait 3s)                     ... (data arrives 12s later)
Client → "Any new?"           Server → "Here is your message!" ✅
Server → "No."                Client → immediately opens next request` },
      { type: 'ul', items: [
        '**Pro:** Works through every firewall, proxy, and load balancer — it\'s just HTTP',
        '**Pro:** No special infrastructure needed',
        '**Con:** One thread or connection per waiting client — high memory at scale',
        '**Con:** Still has full HTTP header overhead on each cycle',
        '**Use when:** Simple low-frequency push events; clients behind strict corporate firewalls',
      ]},
      { type: 'callout', kind: 'tip', title: 'When long polling still wins', text: 'Long polling was how Gmail pushed emails for years. If WebSocket upgrades are blocked by a proxy, long polling is your reliable fallback.' },
    ],
  },
  {
    id: 'sse',
    title: 'Server-Sent Events — One-Way Push',
    blocks: [
      { type: 'p', text: 'SSE is a native browser standard for **one-way server→client streaming** over a persistent HTTP connection. The server sends `data:` lines; the browser fires `EventSource` events automatically.' },
      { type: 'code', code: `Wire format (server sends plain text):
data: {"event":"score","team":"India","goals":3}\n\n
data: {"event":"score","team":"India","goals":4}\n\n

(Each message ends with a blank line)

Client code:
  const es = new EventSource('/live-scores');
  es.onmessage = e => updateScore(JSON.parse(e.data));
  // Auto-reconnects on disconnect — built in ✅
  // Sends Last-Event-ID header to resume from last seen event` },
      { type: 'table', headers: ['Feature', 'SSE', 'WebSocket'], rows: [
        ['Direction', 'Server → Client only', 'Bidirectional'],
        ['Protocol', 'Plain HTTP/1.1 or HTTP/2', 'Upgraded WS protocol'],
        ['Auto-reconnect', 'Yes, built-in', 'Must implement manually'],
        ['Load balancer', 'Works with any standard LB', 'Needs sticky sessions or pub/sub'],
        ['Complexity', 'Very simple', 'More complex'],
        ['Best for', 'Feeds, notifications, job progress', 'Chat, games, collaboration'],
      ]},
      { type: 'callout', kind: 'info', title: 'SSE is underrated', text: 'SSE handles 80% of real-time use cases with far less complexity than WebSockets. If you only push server→client and never need client→server real-time messages, default to SSE.' },
    ],
  },
  {
    id: 'websockets',
    title: 'WebSockets — Full-Duplex Channel',
    blocks: [
      { type: 'p', text: 'WebSockets upgrade an HTTP connection to a persistent, **bidirectional** channel. Both client and server can send messages at any time, with minimal per-message framing overhead.' },
      { type: 'code', code: `Step 1: HTTP upgrade handshake (one-time cost)
  Client → GET /chat HTTP/1.1
            Upgrade: websocket

  Server → HTTP/1.1 101 Switching Protocols
            Upgrade: websocket

Step 2: Both sides talk freely, forever
  Client → "typing..."
  Server → "New msg from Priya: Hey!"
  Client → "Hello!"
  Server → "Priya read your message"

Per-message overhead: ~2–10 bytes of framing
Compare to HTTP: ~500 bytes of headers per request` },
      { type: 'ul', items: [
        '**Stateful:** The server must track which socket belongs to which user',
        '**Low latency:** No handshake per message — sub-10ms round trip within a datacenter',
        '**Scaling challenge:** Stateful connections make horizontal scaling harder (see next section)',
        '**Use for:** Chat, multiplayer games, collaborative editors, live trading dashboards',
      ]},
    ],
  },
  {
    id: 'scaling-ws',
    title: 'Scaling WebSockets with Pub/Sub',
    blocks: [
      { type: 'p', text: 'A WebSocket connection is **stateful** — it lives on exactly one server. You can\'t just add more servers and round-robin, because User A\'s message for User B might land on a server with no connection to B.' },
      { type: 'code', code: `The problem:
  User A connected to WS Server 1
  User B connected to WS Server 2

  A sends message to B:
    Server 1 receives it
    Server 1 has no socket for User B
    User B never gets the message ❌

Solution — Redis Pub/Sub:
  Server 1 → publishes to Redis channel "user:B"
  Server 2 → subscribed to "user:B"
  Server 2 → pushes to B's socket ✅

Full architecture:
  Load Balancer (any algorithm)
       │
  ┌────┼────┐
  │    │    │
  WS1 WS2 WS3   ← WebSocket servers (stateless except for sockets)
   └───┼───┘
       │
     Redis        ← pub/sub fan-out backbone
       │
    Kafka/DB      ← durable storage` },
      { type: 'kv', title: 'WebSocket server capacity', items: [
        { k: 'Connections per server', v: '10K – 100K' },
        { k: 'RAM per idle connection', v: '~2–8 KB' },
        { k: '100K connections at 4KB', v: '~400 MB RAM' },
      ]},
    ],
  },
  {
    id: 'backpressure',
    title: 'Backpressure and Message Ordering',
    blocks: [
      { type: 'h', text: 'Backpressure — When Clients Are Slow' },
      { type: 'p', text: 'If the server produces events faster than a client consumes them, buffers fill. You need a policy:' },
      { type: 'ul', items: [
        '**Buffer:** Queue messages in memory — risks OOM for very slow clients',
        '**Drop:** Discard old messages when buffer fills — fine for live metrics where latest value is all that matters',
        '**Disconnect:** Drop the slow client, let it reconnect with current state',
        '**Batch:** Coalesce multiple updates into one frame — great for high-frequency position updates in games',
      ]},
      { type: 'h', text: 'Gap Recovery After Disconnect' },
      { type: 'code', code: `Sequence numbers let clients catch up:
  Server tags each message: { seq: 1042, data: {...} }

  Client disconnects at seq=1040.
  Client reconnects:
    Client: "GET /messages?after=1040"
    Server: sends seq 1041, 1042, 1043...
  Client is caught up, then subscribes to live stream.

Heartbeats detect silent disconnects:
  Server pings every 30s.
  No pong in 60s → server closes + client reconnects.` },
    ],
  },
  {
    id: 'choosing',
    title: 'Choosing the Right Transport',
    blocks: [
      { type: 'table', headers: ['Scenario', 'Transport', 'Reason'], rows: [
        ['Live feed, notifications', 'SSE', 'Server-only push, simple, auto-reconnect'],
        ['Chat app', 'WebSocket', 'Bidirectional, low latency'],
        ['Multiplayer game', 'WebSocket', 'High frequency, both directions'],
        ['Collaborative editor', 'WebSocket', 'Real-time cursor + ops from both sides'],
        ['Job progress updates', 'SSE', 'Only server pushes %complete'],
        ['Simple occasional alerts', 'Long polling or SSE', 'Simplest to operate'],
      ]},
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'Name SSE and WebSocket and explain when each wins. Say "I\'d fan-out messages through Redis pub/sub to WebSocket servers" — shows you understand stateful scaling. Mention heartbeats + sequence numbers for reliability. For the celebrity fan-out problem: "switch to fan-in on read for users with millions of followers."' },
    ],
  },
];

// ── Dealing with Contention ──────────────────────────────────────────────

export const DEALING_WITH_CONTENTION: DeepSection[] = [
  {
    id: 'the-problem',
    title: 'The Concurrency Problem',
    blocks: [
      { type: 'p', text: 'Contention happens when multiple requests race to modify the same piece of data. Classic examples: two users book the last concert ticket; two payment requests debit the same account; a flash sale oversells inventory.' },
      { type: 'code', code: `Race condition — selling the last ticket:
  T=0: Ticket 42 available. stock=1.

  Request A (user Priya): reads stock=1 → decides to buy
  Request B (user Raj):   reads stock=1 → decides to buy

  Request A: UPDATE tickets SET stock=0 WHERE id=42  ✅
  Request B: UPDATE tickets SET stock=0 WHERE id=42  ✅ (wrong!)

  Two users "own" the same ticket. 💥` },
      { type: 'p', text: 'The right strategy depends on how often conflicts actually happen. **Pessimistic locking** prevents all conflicts at the cost of serialization. **Optimistic locking** is cheap when conflicts are rare, expensive when they\'re common.' },
    ],
  },
  {
    id: 'pessimistic',
    title: 'Pessimistic Locking',
    blocks: [
      { type: 'p', text: '**Pessimistic locking** assumes conflict is likely. Before reading, it grabs a row-level lock. Any other reader that wants to write must wait.' },
      { type: 'code', lang: 'sql', code: `BEGIN;

-- Lock the row before reading
SELECT stock FROM tickets WHERE id = 42 FOR UPDATE;

-- stock=1, safe to decrement
UPDATE tickets SET stock = stock - 1 WHERE id = 42;

COMMIT;

-- While this transaction runs:
-- Any other SELECT ... FOR UPDATE on row 42 BLOCKS until commit.
-- Regular SELECTs (no FOR UPDATE) still work (MVCC).` },
      { type: 'compare', aTitle: 'Pros', bTitle: 'Cons',
        aPoints: [
          'Guarantees no double-booking',
          'Simple to reason about — one winner',
          'Correct for any conflict rate',
        ],
        bPoints: [
          'Serializes writes to hot rows — throughput bottleneck',
          'Deadlock risk if multiple rows locked in different order',
          'Long transactions hold locks → others queue up',
        ],
      },
      { type: 'callout', kind: 'info', title: 'When to use pessimistic locking', text: 'Ticket booking, seat reservation, inventory with single-digit stock. Any time the last few items matter enormously. If your hot rows are a handful of "inventory counters", pessimistic locking is the right call.' },
    ],
  },
  {
    id: 'optimistic',
    title: 'Optimistic Locking',
    blocks: [
      { type: 'p', text: '**Optimistic locking** assumes conflicts are rare. Read freely (no lock), but include a version check when writing. If another writer got there first, your update affects 0 rows — retry.' },
      { type: 'code', lang: 'sql', code: `-- Schema: add a version column
ALTER TABLE tickets ADD COLUMN version INT DEFAULT 0;

-- Step 1: Read with version
SELECT stock, version FROM tickets WHERE id = 42;
-- Returns: stock=5, version=7

-- Step 2: Write with version check
UPDATE tickets
   SET stock = stock - 1, version = version + 1
 WHERE id = 42 AND version = 7;   ← the key check

-- If rows_affected = 1: success ✅
-- If rows_affected = 0: someone else updated first — RETRY ↻` },
      { type: 'compare', aTitle: 'Pros', bTitle: 'Cons',
        aPoints: [
          'No locks held during read — high read concurrency',
          'Great when conflicts are rare (read-heavy data)',
          'No deadlock risk',
        ],
        bPoints: [
          'Retries add latency when conflicts are common',
          'Under high contention (flash sale), retry storms waste DB resources',
          'Requires version column and retry logic',
        ],
      },
      { type: 'callout', kind: 'tip', title: 'Rule of thumb', text: 'Use optimistic locking when conflicts happen less than ~5% of the time. Use pessimistic locking when multiple writers target the same rows constantly.' },
    ],
  },
  {
    id: 'distributed-locks',
    title: 'Distributed Locks',
    blocks: [
      { type: 'p', text: 'When you need mutual exclusion across multiple services or servers — not just within one DB transaction — you need a **distributed lock**.' },
      { type: 'code', code: `Redis distributed lock (SET NX + TTL):

ACQUIRE:
  SET lock:ticket:42 worker-uuid NX PX 5000
  NX   = only set if not exists (atomic)
  PX 5000 = expire in 5000ms (safety release on crash)

  Returns OK → you have the lock ✅
  Returns nil → lock held by someone else, wait/retry

CRITICAL SECTION:
  Process the booking...

RELEASE:
  Atomic check-and-delete (Lua script):
  if GET lock:ticket:42 == worker-uuid:
      DEL lock:ticket:42
  (Prevents releasing someone else's lock)` },
      { type: 'callout', kind: 'warn', title: 'Always set a TTL', text: 'A distributed lock without a TTL is a distributed deadlock. If the holder crashes, the lock is never released. Set a TTL that is slightly longer than your operation, and implement heartbeat renewal for long operations.' },
      { type: 'ul', items: [
        '**Redis SET NX + TTL:** Simple, sufficient for most cases. Single Redis node is a SPOF — use Redlock across 3–5 Redis nodes for higher confidence.',
        '**ZooKeeper ephemeral nodes:** Automatically released when session dies. Stronger consistency guarantees.',
        '**Use for:** Cross-service coordination, preventing duplicate job execution, rate limit with exact semantics.',
      ]},
    ],
  },
  {
    id: 'atomic-counters',
    title: 'Atomic Counters',
    blocks: [
      { type: 'p', text: 'For pure increment/decrement operations — view counts, like counts, inventory — **atomic counters** avoid locking entirely by making the operation single-step.' },
      { type: 'code', code: `Redis atomic counter:
  INCR view_count:video:42       → 1
  INCR view_count:video:42       → 2
  ...
  (Atomic: no race condition possible)

  INCRBY inventory:item:99 -1    → decrements by 1

PostgreSQL atomic update:
  UPDATE items
     SET stock = stock - 1
   WHERE id = 99 AND stock > 0
  RETURNING stock;

  → Returns new value. If 0 rows: out of stock.
  → No explicit lock, but single-row atomic by default.` },
      { type: 'callout', kind: 'tip', title: 'Rate limiting with atomic counters', text: 'Redis INCR + EXPIRE is the simplest rate limiter. Increment on each request; if the count exceeds the limit, reject. Set TTL to the window size. This is how most API gateways implement rate limiting.' },
    ],
  },
  {
    id: 'token-serialization',
    title: 'Token-Based Serialization',
    blocks: [
      { type: 'p', text: 'Instead of locking, **eliminate concurrency** by routing all writes for a given key to a single consumer. There\'s only one writer, so there\'s never a conflict.' },
      { type: 'code', code: `Kafka partition-based serialization:
  All orders for user_id=123 → Kafka partition 7 (hash(123) % 16)
  All orders for user_id=456 → Kafka partition 2

  Consumer group: one consumer per partition.
  Result: all of user 123's orders are processed sequentially,
          by exactly one consumer, in order.
          No lock needed. No conflict possible.

When to use:
  Account balance updates (all debits/credits for account X)
  Message ordering per chat room
  Leaderboard updates per user` },
      { type: 'callout', kind: 'info', title: 'The most scalable contention strategy', text: 'Token-based serialization (via Kafka partitions or consistent hash routing) is the most scalable approach. The throughput scales linearly with partition count. Stripe uses this for payment processing.' },
    ],
  },
  {
    id: 'idempotency',
    title: 'Idempotency',
    blocks: [
      { type: 'p', text: 'Any contention strategy involves retries. If a payment is retried after a network timeout, does the user get charged twice? **Idempotency** means: no matter how many times an operation is retried, the effect happens at most once.' },
      { type: 'code', code: `Idempotency key pattern:
  Client generates a unique key:  ide_key = uuid()

  POST /payments
  Idempotency-Key: ide_key_abc123
  { amount: 500, card: "tok_visa" }

  Server:
    1. Check if ide_key_abc123 already processed
    2. If yes: return the original response (no re-charge)
    3. If no:  process payment, store ide_key + result

  Client retries after timeout:
    POST /payments
    Idempotency-Key: ide_key_abc123  ← same key
    → Server returns cached result, no new charge ✅` },
      { type: 'callout', kind: 'pitfall', title: 'Storing idempotency keys', text: 'Idempotency keys must survive server restarts. Store them in your database (not just in-memory). Set an expiry (e.g., 24 hours) to avoid unbounded growth.' },
    ],
  },
  {
    id: 'choosing',
    title: 'Choosing a Strategy',
    blocks: [
      { type: 'table', headers: ['Scenario', 'Strategy', 'Why'], rows: [
        ['Last 5 tickets in a flash sale', 'Pessimistic locking', 'High conflict rate, correctness critical'],
        ['User profile update (rare conflicts)', 'Optimistic locking', 'Low conflict, simple retry OK'],
        ['Cross-service job deduplication', 'Distributed lock (Redis)', 'No shared DB transaction possible'],
        ['View counter, like count', 'Atomic counter (Redis INCR)', 'No conflict possible with atomic op'],
        ['Payment processing order', 'Token serialization (Kafka)', 'Serialize by account, no locking'],
        ['Retryable API calls', 'Idempotency keys', 'Make retries safe by design'],
      ]},
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'For "design Ticketmaster" say "I\'d use pessimistic locking (SELECT FOR UPDATE) for the last few seats — conflict rate is high there." For "design a rate limiter" say "Redis INCR + EXPIRE — atomic, fast, no locks." For payments, mention idempotency keys immediately. Mention "token-based serialization via Kafka partitions" to earn senior-level credit.' },
    ],
  },
];

// ── Multi-Step Processes ─────────────────────────────────────────────────

export const MULTI_STEP_PROCESSES: DeepSection[] = [
  {
    id: '2pc-problem',
    title: 'Why Distributed Transactions Fail',
    blocks: [
      { type: 'p', text: 'An e-commerce checkout spans multiple services: charge payment, decrement inventory, create order, notify shipping. All-or-nothing semantics are required — a partial success is worse than a failure.' },
      { type: 'h', text: 'Two-Phase Commit (2PC) — the naive solution' },
      { type: 'code', code: `2PC flow:
  Coordinator → "Prepare!" → Payment Service
  Coordinator → "Prepare!" → Inventory Service
  Coordinator → "Prepare!" → Order Service

  All reply "Ready."

  Coordinator → "Commit!" → all services

Problems with 2PC across microservices:
  If Coordinator dies after "Prepare" but before "Commit":
    All services are stuck waiting. Blocked indefinitely. ❌

  Network partition during commit:
    Some services commit, some don't. ❌

  Tight coupling: all services must implement 2PC protocol. ❌
  Blocking: all participants locked until commit/abort. ❌` },
      { type: 'p', text: 'The solution: **Sagas**. Instead of one distributed transaction, use a sequence of local transactions, each with a **compensating action** that undoes the effect if a later step fails.' },
    ],
  },
  {
    id: 'saga',
    title: 'The Saga Pattern',
    blocks: [
      { type: 'p', text: 'A saga is a sequence of local transactions. Each step succeeds or triggers a **compensation** (undo) for all previous steps. No global lock is held — services stay independent.' },
      { type: 'code', code: `Booking saga (flight + hotel + car):

Happy path:
  1. Reserve flight   → success
  2. Reserve hotel    → success
  3. Reserve car      → success
  ✅ All done!

Car reservation fails at step 3:
  3. Reserve car      → FAILED

Compensations run in reverse:
  2C. Cancel hotel reservation   ← undo step 2
  1C. Cancel flight reservation  ← undo step 1
  ❌ Saga rolled back cleanly

Key insight: Compensating transactions are business-level undos,
not DB rollbacks. "Cancel reservation" is valid business logic.` },
      { type: 'callout', kind: 'warn', title: 'Compensations are not always perfect', text: 'Some effects can\'t be fully undone. If you sent a confirmation email in step 2, you can\'t unsend it. The best you can do is send a cancellation email. Design compensations to be "best effort" and account for this in UX.' },
    ],
  },
  {
    id: 'orchestration',
    title: 'Orchestration vs Choreography',
    blocks: [
      { type: 'p', text: 'There are two ways to coordinate the steps in a saga.' },
      { type: 'compare', aTitle: 'Orchestration (Central Brain)', bTitle: 'Choreography (React to Events)',
        aPoints: [
          'One coordinator service drives all steps',
          'Calls each service and handles responses',
          'Easy to trace: the flow is in one place',
          'Coordinator is a potential bottleneck',
          'Examples: Temporal, AWS Step Functions',
        ],
        bPoints: [
          'Services react to each other\'s events (Kafka)',
          'No central coordinator',
          'Harder to trace — flow is distributed across services',
          'No single point of failure',
          'Risk: implicit coupling via event contracts',
        ],
      },
      { type: 'code', code: `Orchestration example (Temporal):
  @WorkflowImpl
  class CheckoutWorkflow:
    def execute(order):
      payment = activities.charge_card(order)         # step 1
      if not payment.success:
        return "payment_failed"

      inventory = activities.decrement_stock(order)   # step 2
      if not inventory.success:
        activities.refund_card(payment)               # compensate
        return "out_of_stock"

      shipping.create_shipment(order)                 # step 3
      return "success"

  # Temporal persists state after every step.
  # Server crash at step 2? Resume exactly there on restart.` },
      { type: 'callout', kind: 'tip', title: 'Default to orchestration', text: 'Orchestration is easier to debug, test, and reason about. Use choreography when you specifically need loose coupling between many independent services (e.g., event-sourced systems).' },
    ],
  },
  {
    id: 'outbox',
    title: 'The Outbox Pattern',
    blocks: [
      { type: 'p', text: 'One of the hardest bugs in distributed systems: the database commits but the message to Kafka is lost (network blip, crash after DB commit but before publish). The **Outbox pattern** solves this with atomic dual-write.' },
      { type: 'code', code: `Without Outbox (bug-prone):
  BEGIN;
  INSERT INTO orders ...    ← DB committed ✅
  COMMIT;
  kafka.publish(order_event) ← server crashes here ❌
  → Order exists in DB but downstream services never know!

With Outbox:
  BEGIN;
  INSERT INTO orders ...           ← business change
  INSERT INTO outbox (event) ...   ← in the SAME transaction
  COMMIT;                          ← atomic: both or neither

  Background publisher (separate process):
    Polls outbox table
    Publishes each event to Kafka
    Deletes from outbox after ACK
  → Publisher can crash and retry safely (idempotent)` },
      { type: 'callout', kind: 'info', title: 'CDC as an alternative', text: 'Change Data Capture (Debezium) reads the database write-ahead log and publishes changes to Kafka automatically. This achieves the same guarantee as Outbox without a separate polling process — but requires access to the DB binlog.' },
    ],
  },
  {
    id: 'idempotency-steps',
    title: 'Idempotency at Every Step',
    blocks: [
      { type: 'p', text: 'In a saga, workers will crash and restart. Messages will be delivered more than once. **Every step must be safe to re-run** with the same input — it should produce the same result without doubling side effects.' },
      { type: 'code', code: `Non-idempotent (broken):
  def charge_card(order_id):
    stripe.charge(amount=order.total)  ← creates new charge each call
    → Called twice → customer charged twice ❌

Idempotent:
  def charge_card(order_id):
    stripe.charge(
      amount=order.total,
      idempotency_key=order_id   ← Stripe deduplicates by key ✅
    )
    → Called twice → one charge ✅

Database deduplication:
  INSERT INTO payments (order_id, amount)
  ON CONFLICT (order_id) DO NOTHING
  → Re-runs are safe ✅` },
    ],
  },
  {
    id: 'workflow-engines',
    title: 'Workflow Engines',
    blocks: [
      { type: 'p', text: 'Managing saga state, retries, timeouts, and compensation by hand is error-prone. **Workflow engines** persist your workflow state durably and handle all of this automatically.' },
      { type: 'kv', title: 'Popular workflow engines', items: [
        { k: 'Temporal', v: 'Code-native workflows. Replays history on restart. Used at Stripe, Uber, Netflix.' },
        { k: 'AWS Step Functions', v: 'JSON-based state machines. Managed. Integrates tightly with AWS services.' },
        { k: 'Apache Airflow', v: 'DAG-based, Python. Best for data pipelines and batch workflows.' },
        { k: 'Cadence', v: 'Predecessor to Temporal. Uber\'s original workflow engine. Similar API.' },
      ]},
      { type: 'callout', kind: 'tip', title: 'Temporal\'s superpower', text: 'Temporal persists the event history of your workflow. If a worker dies mid-execution, Temporal replays the history to restore state exactly. You write normal code; it handles all durability, retries, and timeouts.' },
    ],
  },
  {
    id: 'event-sourcing',
    title: 'Event Sourcing',
    blocks: [
      { type: 'p', text: '**Event sourcing** stores the *sequence of events* that happened, rather than the current state. Current state is derived by replaying events from the beginning (or a snapshot).' },
      { type: 'code', code: `Traditional (stores current state):
  accounts: { id: 1, balance: 850 }

Event sourced (stores history):
  events: [
    { id: 1, type: "AccountOpened", amount: 1000 },
    { id: 2, type: "Withdrawn",     amount: 200  },
    { id: 3, type: "Deposited",     amount: 50   },
  ]
  → Current balance: 1000 - 200 + 50 = 850 ✅

Benefits:
  Complete audit trail (regulators love this)
  Replayable: recalculate any historical state
  Projections: build different read models from same events

Cost:
  More complex than CRUD
  Queries require replaying or pre-built projections
  Snapshot strategy needed for long-lived aggregates` },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'When designing checkout or booking: "I\'d use a saga with orchestration via Temporal." Explain compensating transactions clearly — interviewers test this. Mention the Outbox pattern for guaranteed event delivery. Say "every step must be idempotent because workers can crash and restart." Event sourcing earns extra credit for audit-heavy domains like payments.' },
    ],
  },
];

// ── Scaling Reads ────────────────────────────────────────────────────────

export const SCALING_READS: DeepSection[] = [
  {
    id: 'why-easy',
    title: 'Why Reads Scale Easier Than Writes',
    blocks: [
      { type: 'p', text: 'Most systems have a **10:1 or higher read-to-write ratio**. Reads are also stateless — serving a read from any copy of the data is correct (with eventual consistency). This makes them trivially parallelizable.' },
      { type: 'kv', title: 'Typical read/write ratios', items: [
        { k: 'Social media feed', v: '~1,000:1 (reads dominate)' },
        { k: 'E-commerce catalog', v: '~100:1' },
        { k: 'Banking transactions', v: '~10:1' },
        { k: 'Event logging / metrics', v: '~1:10 (write-heavy)' },
      ]},
      { type: 'p', text: 'The scaling toolkit for reads, roughly in order of reach: **caching** → **read replicas** → **CQRS + denormalized projections** → **sharding**.' },
    ],
  },
  {
    id: 'read-replicas',
    title: 'Read Replicas',
    blocks: [
      { type: 'p', text: 'A **read replica** receives every write from the primary via replication, then serves read queries — offloading the primary for writes only.' },
      { type: 'code', code: `Primary-Replica setup:
  Primary DB  ←── all WRITES go here
       │
       │ async replication (WAL streaming)
       │
  Replica 1  ←── reads go here
  Replica 2  ←── reads go here
  Replica 3  ←── reads go here

Replication lag: typically < 100ms within same DC
  → "Eventual consistency": a replica may be slightly behind

  Example: user changes their profile photo → primary updated.
  For ~50ms, replicas still show old photo.
  For most apps, this is acceptable.` },
      { type: 'callout', kind: 'warn', title: 'Read-your-writes', text: 'After a user writes, they expect to immediately see their own change. But the replica might lag. Solution: route a user\'s reads to the primary (or replica with highest LSN) for a brief window after they write. Many frameworks support this transparently.' },
      { type: 'ul', items: [
        'PostgreSQL, MySQL, and most relational DBs support streaming replication out of the box',
        'Read replicas scale read throughput linearly — add replicas as load grows',
        'Replicas also serve as warm standbys for failover',
      ]},
    ],
  },
  {
    id: 'caching',
    title: 'Caching Layers',
    blocks: [
      { type: 'p', text: 'Every cache hit is a read that never reaches the database. A well-designed cache can absorb 90%+ of reads. Caches exist at multiple levels — the closer to the user, the faster.' },
      { type: 'code', code: `Cache hierarchy (fastest to slowest):
  Browser cache     → 0ms  (no network at all)
  CDN edge cache    → ~5ms (nearby PoP)
  App server cache  → ~0.1ms (in-process memory)
  Redis/Memcached   → ~1ms (network hop to cache)
  Read replica      → ~5ms
  Primary DB        → ~10ms

Strategy — cache-aside (most common):
  function getProduct(id):
    val = redis.get("product:" + id)
    if val: return val            ← cache hit ✅
    val = db.query(id)            ← cache miss, hit DB
    redis.set("product:" + id, val, ttl=3600)
    return val` },
      { type: 'callout', kind: 'pitfall', title: 'Don\'t cache everything', text: 'Cache what is read frequently and changes rarely. User session data, product catalogs, search results — excellent. User-specific feed with 1000 followers — maybe not worth caching individually. Measure hit rates; a 50% hit rate on a slow query is huge. A 2% hit rate isn\'t worth the complexity.' },
    ],
  },
  {
    id: 'cqrs',
    title: 'CQRS — Command/Query Responsibility Segregation',
    blocks: [
      { type: 'p', text: '**CQRS** separates the write model (normalized, consistent) from the read model (purpose-built for specific queries). The read model can be optimized independently.' },
      { type: 'code', code: `Without CQRS:
  One DB schema. Reads and writes hit same tables.
  Complex reads require expensive JOINs every time.

With CQRS:
  Write side: normalized Postgres (orders, products, users)
       │ async via Kafka / CDC
  Read side (multiple purpose-built projections):
    ├── Redis: user session data, hot product cache
    ├── Elasticsearch: product search index
    ├── Materialized view: dashboard aggregates
    └── DynamoDB: user activity feed (denormalized)

Example — product search:
  Write: products table (normalized, with foreign keys)
  CQRS projection: Elasticsearch index with all fields
    denormalized into one document.
    Search is O(log N) per term, sub-50ms.
  DB query for same search: multiple JOINs, seconds. ❌` },
      { type: 'callout', kind: 'warn', title: 'CQRS adds complexity', text: 'CQRS means maintaining multiple data stores in sync. Eventually consistent read models. Debugging requires tracing through projections. Don\'t add CQRS until you have a proven query performance problem. For most apps with < 10M rows, a well-indexed Postgres is enough.' },
    ],
  },
  {
    id: 'materialized-views',
    title: 'Materialized Views',
    blocks: [
      { type: 'p', text: 'A **materialized view** is a pre-computed query result stored on disk. Instead of running a 2-second aggregation on every request, you run it once, store it, and serve it in milliseconds.' },
      { type: 'code', lang: 'sql', code: `-- Expensive query: top 10 products by orders this week
-- Runs in 3s on 100M order rows

CREATE MATERIALIZED VIEW top_products_weekly AS
  SELECT p.id, p.name, COUNT(o.id) as order_count
  FROM products p
  JOIN orders o ON o.product_id = p.id
  WHERE o.created_at > NOW() - INTERVAL '7 days'
  GROUP BY p.id
  ORDER BY order_count DESC
  LIMIT 10;

-- Refresh strategies:
REFRESH MATERIALIZED VIEW top_products_weekly;  -- manual
-- Or: schedule every 5 minutes via pg_cron
-- Or: trigger on order insert (via change stream)

-- Reads now: sub-ms, no computation ✅` },
      { type: 'callout', kind: 'tip', title: 'Materialized views vs caching', text: 'Materialized views live in the DB and can be queried with SQL. Redis cache lives outside the DB and stores arbitrary values. For aggregations that need to be queried with filters, materialized views are better. For simple key lookups, Redis is better.' },
    ],
  },
  {
    id: 'fanout',
    title: 'Fan-Out: Write vs Read',
    blocks: [
      { type: 'p', text: 'For social feeds, you must decide: **pre-compute** (fan-out on write) or **compute at read time** (fan-in on read).' },
      { type: 'compare', aTitle: 'Fan-Out on Write (Push)', bTitle: 'Fan-In on Read (Pull)',
        aPoints: [
          'When user posts, immediately push to all followers\' feed stores',
          'Feed reads are instant (pre-computed)',
          'Write cost: proportional to follower count',
          'Celebrity with 50M followers = 50M feed writes per post',
        ],
        bPoints: [
          'Feed is computed at read time from followed users\' posts',
          'Read cost: proportional to number of people you follow',
          'Write is cheap (one row in posts table)',
          'Active users with many followees have slow feed loads',
        ],
      },
      { type: 'callout', kind: 'tip', title: 'Hybrid is the answer', text: 'Twitter uses both: fan-out on write for normal users, fan-in on read for celebrities. At read time, merge pre-computed feed (from normal followees) with just-in-time posts from celebrity followees.' },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'When asked "how do you scale reads to 1M QPS": start with caching (Redis, CDN), then read replicas, then CQRS if there are complex query shapes. For feed systems, explain fan-out vs fan-in and the hybrid approach. Mention the "read-your-writes" consistency issue with replicas — shows you know the subtle problems.' },
    ],
  },
];
