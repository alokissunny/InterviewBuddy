import type { DeepSection } from '../interviewPrepData';

// ── 7. CAP Theorem ───────────────────────────────────────────────────

export const CAP_THEOREM: DeepSection[] = [
  {
    id: 'setup',
    title: 'The Setup — What is a Distributed System?',
    blocks: [
      { type: 'callout', kind: 'info', title: 'Core idea', text: 'Any distributed system can only reliably guarantee *two* of the three properties: Consistency, Availability, and Partition Tolerance. Since network partitions are unavoidable in real systems, the real choice is always between Consistency and Availability.' },
      { type: 'p', text: 'Modern applications don\'t run on one computer. They run across **many servers**, often in different cities or continents.' },
      { type: 'code', code: `Data Center: Mumbai          Data Center: Singapore
┌──────────────────┐         ┌──────────────────┐
│  Node A          │         │  Node B          │
│  (has user data) │ ───────► │  (replica)       │
└──────────────────┘         └──────────────────┘
        │                            │
   Users in India              Users in SE Asia` },
      { type: 'p', text: 'Both nodes store the same data. If a user updates their profile in India, it needs to sync to Singapore. **This synchronization is where the CAP tradeoffs appear.**' },
    ],
  },
  {
    id: 'three-properties',
    title: 'The Three Properties',
    blocks: [
      { type: 'h', text: 'C — Consistency' },
      { type: 'p', text: 'Every read returns the **most recent write**, no matter which node you ask.' },
      { type: 'code', code: `User writes: "My name is Alok Shah"  → Node A

One second later:
User reads from Node B:
  Consistent system:    "My name is Alok Shah"  ✅ (latest)
  Inconsistent system:  "My name is Alok"       ❌ (stale)` },
      { type: 'callout', kind: 'tip', text: 'Think of it like a bank balance. If you deposit ₹1,000 and then check your balance, you must see the new balance — not the old one.' },
      { type: 'h', text: 'A — Availability' },
      { type: 'p', text: 'Every request gets a **response** (even if the data might be slightly stale). The system never refuses to answer.' },
      { type: 'code', code: `User reads from Node B:
  Available system:     Returns a response — maybe slightly stale, but responds ✅
  Unavailable system:   "Sorry, cannot guarantee data is current. Try later." ❌` },
      { type: 'callout', kind: 'tip', text: 'Think of it like a news website. Even if it\'s a few minutes behind, you\'d rather see the page than get an error.' },
      { type: 'h', text: 'P — Partition Tolerance' },
      { type: 'p', text: 'The system keeps working even when a **network partition** splits some nodes from communicating with others.' },
      { type: 'code', code: `Normal state:
  Node A ──────── Node B   (can communicate)

Network partition (cable cut, data center failure):
  Node A    ╳╳╳╳    Node B   (cannot communicate)

Partition-tolerant system: Both nodes keep serving requests
Not partition-tolerant:    System shuts down 🚫` },
      { type: 'callout', kind: 'tip', text: 'Think of it like two offices that lose their phone connection. Partition-tolerant means both offices keep working independently.' },
    ],
  },
  {
    id: 'pick-two',
    title: 'Why You Can Only Pick Two',
    blocks: [
      { type: 'p', text: 'Suppose there\'s a network partition — Node A and Node B can\'t talk to each other. A user writes data to **Node A**. Now a different user reads from **Node B**. You have exactly two choices:' },
      { type: 'code', code: `Option 1: Return the answer (maybe stale)
  → You're choosing Availability
  → You're sacrificing Consistency
  → (Node B doesn't have the latest write from Node A)

Option 2: Refuse to answer until sync is possible
  → You're choosing Consistency
  → You're sacrificing Availability
  → (Can't return data you're not sure about)

There is no Option 3. Math doesn't allow it.` },
      { type: 'callout', kind: 'warn', title: 'P is not optional', text: 'Since partitions will happen (networks fail in the real world), **P is not optional**. You must tolerate partitions. Therefore the real choice is: **CP or AP**. CA systems only exist without partitions — single-node databases.' },
    ],
  },
  {
    id: 'cp-systems',
    title: 'CP Systems — Consistency Over Availability',
    blocks: [
      { type: 'p', text: 'A CP system **refuses to answer** rather than risk returning stale data.' },
      { type: 'code', code: `Network partition occurs:
  Node B can't reach Node A.

  User asks Node B: "What's the account balance?"
  Node B: "I can't confirm this data is current. Request rejected." 🚫

  User tries again when partition resolves:
  Node B: "Balance is ₹5,432." ✅ (confirmed fresh)` },
      { type: 'h', text: 'When CP is the Right Choice' },
      { type: 'p', text: 'Any time **wrong data is worse than no data**:' },
      { type: 'ul', items: [
        '🏦 **Banking** — You\'d rather see "service unavailable" than a wrong balance',
        '💳 **Payment processing** — Double-charging is catastrophic',
        '📦 **Inventory management** — Overselling is a business problem',
        '🏥 **Medical records** — Wrong info could be dangerous',
        '🔒 **Distributed locks** — Either the lock is held or it isn\'t',
      ]},
      { type: 'h', text: 'CP Database Examples' },
      { type: 'kv', items: [
        { k: 'HBase',                  v: 'CP' },
        { k: 'MongoDB (strong mode)',  v: 'CP' },
        { k: 'etcd',                   v: 'CP' },
        { k: 'Zookeeper',              v: 'CP' },
      ]},
    ],
  },
  {
    id: 'ap-systems',
    title: 'AP Systems — Availability Over Consistency',
    blocks: [
      { type: 'p', text: 'An AP system **always answers**, even if the data might be slightly stale.' },
      { type: 'code', code: `Network partition occurs:
  Node B can't reach Node A.

  User asks Node B: "What's trending?"
  Node B: "Here's the trending list from 30 seconds ago." ✅
           (slightly stale, but the user got an answer)

  When partition resolves:
  Node A and Node B sync up automatically.` },
      { type: 'h', text: 'When AP is the Right Choice' },
      { type: 'p', text: 'Any time **availability matters more than perfect accuracy**:' },
      { type: 'ul', items: [
        '📱 **Social media feeds** — 2-second stale feed is fine',
        '🌐 **DNS** — You\'d rather get a slightly old IP than no response',
        '🛒 **Shopping cart** — Adding item might briefly be inconsistent. That\'s okay.',
        '❤️ **Like counts** — Does it matter if the count shows 1,423 instead of 1,424 for a moment?',
        '👤 **User profile (name, bio)** — Brief staleness is acceptable',
        '🔍 **Search index** — Search results can be slightly behind',
      ]},
      { type: 'h', text: 'AP Database Examples' },
      { type: 'kv', items: [
        { k: 'Cassandra',                       v: 'AP' },
        { k: 'DynamoDB (eventually consistent)', v: 'AP' },
        { k: 'CouchDB',                          v: 'AP' },
        { k: 'Riak',                             v: 'AP' },
      ]},
    ],
  },
  {
    id: 'eventual-consistency',
    title: 'Eventual Consistency — AP in Practice',
    blocks: [
      { type: 'callout', kind: 'info', text: '"Eventual consistency" is the model most AP systems use. It means: **All nodes will converge to the same value... eventually.**' },
      { type: 'code', code: `T=0:   User updates name to "Alok Shah" on Node A
T=1:   Node A has "Alok Shah", Node B still has "Alok"
T=2:   Node A syncs to Node B
T=3:   Both nodes have "Alok Shah" ✅

The system was temporarily inconsistent (T=1 to T=2),
but eventually became consistent (T=3).` },
      { type: 'h', text: 'How Long is "Eventually"?' },
      { type: 'p', text: 'In a healthy system, replication lag is typically:' },
      { type: 'kv', items: [
        { k: 'Same data center',     v: '< 1 millisecond' },
        { k: 'Cross-region',         v: '10–100 milliseconds' },
        { k: 'During partition',     v: 'When partition heals' },
      ]},
      { type: 'p', text: 'For most user-facing features, sub-second staleness is imperceptible and acceptable.' },
    ],
  },
  {
    id: 'pacelc',
    title: 'PACELC — The Real-World Extension',
    blocks: [
      { type: 'p', text: 'CAP only describes what happens **during a partition**. But partitions are rare! What about normal operation?' },
      { type: 'p', text: '**PACELC** extends CAP:' },
      { type: 'code', code: `P (Partition) → Choose A (Availability) or C (Consistency)
E (Else, normal) → Choose L (Latency) or C (Consistency)` },
      { type: 'p', text: 'Even without a partition, there\'s a trade-off:' },
      { type: 'code', code: `Scenario: User writes to Node A. Should we wait for Node B to confirm?

Option L (Low Latency):
  Write to Node A → Return success immediately
  Node B syncs asynchronously
  → Fast response ✅, but briefly inconsistent ❌

Option C (Consistent):
  Write to Node A → Wait for Node B to confirm → Return success
  → Always consistent ✅, but slower ❌` },
      { type: 'table', headers: ['Database', 'PACELC Classification'], rows: [
        ['DynamoDB',   'PA/EL  (available + low-latency)'],
        ['Cassandra',  'PA/EL  (tunable, defaults to AP/L)'],
        ['HBase',      'PC/EC  (consistent always)'],
        ['Zookeeper',  'PC/EC  (consistent always)'],
      ]},
    ],
  },
  {
    id: 'choosing',
    title: 'Choosing in Practice',
    blocks: [
      { type: 'code', code: `Is data loss / wrong data catastrophic?
    │
    ├── YES → CP
    │   • Money, health, inventory, locks
    │
    └── NO → AP (usually)
        • Social features, content, preferences
        │
        └── Is some staleness acceptable?
                │
                ├── YES → Eventual Consistency (AP)
                │
                └── NO → CP after all` },
      { type: 'h', text: 'Many Systems Use Both!' },
      { type: 'p', text: 'Real systems aren\'t purely CP or AP. They use different consistency levels for different data:' },
      { type: 'code', code: `E-commerce example:

Product catalog   → AP  (slightly stale product descriptions are fine)
Inventory count   → CP  (can't oversell the last item!)
User reviews      → AP  (stale by a minute? totally fine)
Payment records   → CP  (must be exactly right)
Shopping cart     → AP  (brief inconsistency across devices is ok)` },
    ],
  },
  {
    id: 'misconceptions',
    title: 'Common Misconceptions',
    blocks: [
      { type: 'callout', kind: 'pitfall', title: '"CA systems exist"', text: 'Only on a single-node system with no partitions. Not applicable to distributed systems.' },
      { type: 'callout', kind: 'pitfall', title: '"CP means always consistent"', text: 'No — CP means during a partition, you choose consistency *over* availability. But consistency is maintained only when nodes can communicate.' },
      { type: 'callout', kind: 'pitfall', title: '"AP means data can be wrong forever"', text: 'No — AP systems converge. "Eventually consistent" means briefly stale, not permanently wrong.' },
      { type: 'callout', kind: 'pitfall', title: '"You pick once and stick with it forever"', text: 'No — Many systems let you tune per-operation. Cassandra\'s `QUORUM` vs `ONE` consistency levels, for example.' },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'For any distributed system, you\'ll be asked: **"What happens if two nodes can\'t communicate?"** For financial data: "I\'d use a CP system — wrong data is unacceptable." For social features: "I\'d use AP with eventual consistency — brief staleness is acceptable." Earn extra points by mentioning **PACELC**. "I\'d use strong consistency for inventory and eventual consistency for product details" shows practical judgment.' },
    ],
  },
];

// ── 8. Database Indexing ─────────────────────────────────────────────

export const DATABASE_INDEXING: DeepSection[] = [
  {
    id: 'problem',
    title: 'The Problem Without Indexes',
    blocks: [
      { type: 'callout', kind: 'info', title: 'Core idea', text: 'Without an index, a database must read every row to find what you want. An index is a sorted shortcut that jumps directly to the right rows — like using a book\'s index instead of reading every page.' },
      { type: 'h', text: 'Full Table Scan — The Slow Way' },
      { type: 'p', text: 'Imagine a table with 10 million users. You want to find one user by email.' },
      { type: 'code', lang: 'sql', code: `SELECT * FROM users WHERE email = 'alok@example.com';` },
      { type: 'p', text: '**Without an index**, the database must:' },
      { type: 'code', code: `Row 1:   email = 'aaa@test.com'    → not it, keep going
Row 2:   email = 'bbb@test.com'    → not it, keep going
Row 3:   email = 'ccc@test.com'    → not it, keep going
...
...      (checking 8 million more rows)
...
Row 8,432,761: email = 'alok@example.com'  → FOUND IT! ✅

Time taken: ~5 seconds 😩` },
      { type: 'p', text: 'This is called a **full table scan** — it checks every single row.' },
      { type: 'h', text: 'The Book Index Analogy' },
      { type: 'p', text: 'Imagine a 1,000-page textbook. You want to find every mention of "Redis."' },
      { type: 'ul', items: [
        '**Without index:** Start at page 1 and read every page until you\'ve checked all 1,000.',
        '**With index (back of book):** Look up "Redis" in alphabetical index → see pages 147, 293, 408, 721. Jump directly. Done in seconds.',
      ]},
      { type: 'p', text: 'A database index works exactly the same way.' },
    ],
  },
  {
    id: 'btree',
    title: 'How Indexes Work — B-Tree',
    blocks: [
      { type: 'p', text: 'The most common index structure is a **B-Tree** (Balanced Tree).' },
      { type: 'h', text: 'The B-Tree Structure' },
      { type: 'code', code: `The index on "email" column:

                    [M]
                   /   \\
              [E–L]     [N–Z]
             /     \\   /     \\
           [E-G] [H-L] [N-R] [S-Z]
            |     |     |     |
           rows  rows  rows  rows` },
      { type: 'p', text: 'To find `alok@example.com` (starts with \'a\'):' },
      { type: 'code', code: `Step 1: Start at root [M]
  'a' < 'm' → go left branch

Step 2: [E–L]
  'a' < 'e' → go left branch

Step 3: [A–D]
  Find 'alok@example.com' here!

Total comparisons: 3 (for millions of rows!)` },
      { type: 'h', text: 'Why B-Trees are Fast' },
      { type: 'p', text: 'For 1 million rows, a full scan takes 1,000,000 comparisons. A B-Tree takes only about 20.' },
      { type: 'code', code: `log₂(1,000,000) ≈ 20 comparisons

Full table scan:   O(n) = 1,000,000 operations  😩
B-Tree index:      O(log n) = 20 operations     ✅

For 1 billion rows:
Full table scan:   1,000,000,000 operations     😱
B-Tree index:      30 operations                ✅` },
    ],
  },
  {
    id: 'index-types',
    title: 'Types of Indexes',
    blocks: [
      { type: 'h', text: '1. Single-Column Index' },
      { type: 'p', text: 'Index on one column. The most common.' },
      { type: 'code', lang: 'sql', code: `-- Find users by email (very common query)
CREATE INDEX idx_users_email ON users(email);

-- Find orders by customer
CREATE INDEX idx_orders_customer ON orders(customer_id);` },
      { type: 'h', text: '2. Composite (Multi-Column) Index' },
      { type: 'p', text: 'Index on two or more columns together. **Column order matters critically!**' },
      { type: 'code', lang: 'sql', code: `-- Find users by last name AND first name
CREATE INDEX idx_users_name ON users(last_name, first_name);` },
      { type: 'p', text: 'The **leftmost prefix rule**: a composite index on (A, B, C) can be used for:' },
      { type: 'code', code: `✅  WHERE A = ?
✅  WHERE A = ? AND B = ?
✅  WHERE A = ? AND B = ? AND C = ?
✅  WHERE A = ? ORDER BY B

❌  WHERE B = ?               (A is skipped)
❌  WHERE C = ?               (A and B are skipped)
❌  WHERE B = ? AND C = ?     (A is skipped)` },
      { type: 'callout', kind: 'tip', text: 'Think of it like a phone book sorted by last name, then first name. You can look up by last name, or by last+first. But you can\'t efficiently look up by first name alone.' },
      { type: 'h', text: '3. Unique Index' },
      { type: 'p', text: 'Ensures all values in the indexed column are unique — and also speeds up lookups.' },
      { type: 'code', lang: 'sql', code: `-- Each email must be unique (and fast to look up)
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Equivalent to creating a UNIQUE constraint:
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);` },
      { type: 'h', text: '4. Full-Text Index' },
      { type: 'p', text: 'Regular B-Tree indexes don\'t work for searching *inside* text. Full-text indexes are optimized for word-level searches.' },
      { type: 'code', lang: 'sql', code: `-- Search inside the content of blog posts
CREATE FULLTEXT INDEX idx_posts_content ON posts(content);

-- Usage:
SELECT * FROM posts
WHERE MATCH(content) AGAINST('machine learning' IN NATURAL LANGUAGE MODE);` },
      { type: 'p', text: 'Use cases: Blog search, product search, comment search.' },
      { type: 'h', text: '5. Partial Index' },
      { type: 'p', text: 'Only index rows that match a condition. Much smaller and faster.' },
      { type: 'code', lang: 'sql', code: `-- Only index active users (not the millions of deleted/banned ones)
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- Only index unfulfilled orders
CREATE INDEX idx_pending_orders ON orders(created_at) WHERE status = 'pending';` },
      { type: 'p', text: 'If 95% of your users are inactive, this index is 20× smaller than a full index.' },
      { type: 'h', text: '6. Covering Index' },
      { type: 'p', text: 'An index that contains all columns needed by a query — the database never needs to touch the actual table rows.' },
      { type: 'code', lang: 'sql', code: `-- Query:
SELECT name, email FROM users WHERE department_id = 42;

-- Covering index includes all needed columns:
CREATE INDEX idx_dept_cover ON users(department_id, name, email);
                                     ^look-up col   ^included cols

-- Database can answer entirely from the index.
-- Never touches the table rows. Very fast! ✅` },
    ],
  },
  {
    id: 'when-to-index',
    title: 'When to Add an Index',
    blocks: [
      { type: 'p', text: '**Add an index when a column is:**' },
      { type: 'code', lang: 'sql', code: `-- 1. Frequently filtered (WHERE clause)
SELECT * FROM users WHERE country = 'India';
→ Add index on: country

-- 2. Frequently sorted (ORDER BY)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20;
→ Add index on: created_at

-- 3. Frequently joined (JOIN condition)
SELECT * FROM orders o JOIN users u ON o.user_id = u.id;
→ Add index on: orders.user_id (usually already indexed via FK)

-- 4. Used in GROUP BY aggregations
SELECT category, COUNT(*) FROM products GROUP BY category;
→ Add index on: category

-- 5. Primary keys and unique constraints
→ Automatically indexed by most databases` },
    ],
  },
  {
    id: 'cost',
    title: 'The Cost of Indexes',
    blocks: [
      { type: 'p', text: 'Indexes are not free. They make reads faster by making writes slower.' },
      { type: 'h', text: 'The Write Penalty' },
      { type: 'p', text: 'Every INSERT, UPDATE, or DELETE must also update all indexes on that table.' },
      { type: 'code', code: `Table with 0 indexes:
  INSERT a row: Write 1 thing (the row) ← fast

Table with 5 indexes:
  INSERT a row: Write 6 things (row + 5 index updates) ⚠️ slower

Table with 20 indexes:
  INSERT a row: Write 21 things ← very slow for high write volume` },
      { type: 'h', text: 'Storage Cost' },
      { type: 'p', text: 'Each index takes disk space. A large table with many indexes can have indexes larger than the table itself.' },
      { type: 'code', code: `users table:         50 GB
  idx_email:          8 GB
  idx_name:          12 GB
  idx_country:        5 GB
  idx_created_at:     7 GB
  idx_composite:     15 GB

Total index size:    47 GB (almost as big as the table!)` },
      { type: 'h', text: 'The Trade-off Summary' },
      { type: 'compare', aTitle: 'Read-heavy workload', bTitle: 'Write-heavy workload',
        aPoints: ['More indexes', 'Goal: fast queries', 'Example: reporting'],
        bPoints: ['Fewer indexes', 'Goal: fast inserts', 'Example: event logging'],
      },
    ],
  },
  {
    id: 'patterns',
    title: 'Index Design Patterns',
    blocks: [
      { type: 'h', text: 'Pattern 1: The Timeline Query' },
      { type: 'code', lang: 'sql', code: `-- Most common feed/timeline pattern:
SELECT * FROM posts
WHERE user_id = 42
ORDER BY created_at DESC
LIMIT 20;

-- Optimal index: composite, matches both filter AND sort
CREATE INDEX idx_posts_user_time ON posts(user_id, created_at DESC);` },
      { type: 'h', text: 'Pattern 2: Pagination' },
      { type: 'code', lang: 'sql', code: `-- Efficient cursor-based pagination with an index:
SELECT * FROM products
WHERE category = 'electronics'
  AND id > last_seen_id
ORDER BY id
LIMIT 20;

-- Index:
CREATE INDEX idx_products_cat ON products(category, id);` },
      { type: 'h', text: 'Pattern 3: Status + Time' },
      { type: 'code', lang: 'sql', code: `-- Find recent unprocessed jobs:
SELECT * FROM jobs
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 10;

-- Partial + composite:
CREATE INDEX idx_pending_jobs ON jobs(created_at) WHERE status = 'pending';` },
    ],
  },
  {
    id: 'explain',
    title: 'Using EXPLAIN',
    blocks: [
      { type: 'p', text: '`EXPLAIN` shows the query execution plan — how the database *actually* runs your query. Use it to catch missing or unused indexes.' },
      { type: 'code', lang: 'sql', code: `EXPLAIN SELECT * FROM users WHERE email = 'alok@example.com';` },
      { type: 'h', text: 'Reading EXPLAIN Output (PostgreSQL)' },
      { type: 'code', code: `-- BAD: Full sequential scan (no index used)
Seq Scan on users  (cost=0.00..284562.00 rows=1 width=200)
  Filter: (email = 'alok@example.com')

-- GOOD: Index scan (index used!)
Index Scan using idx_users_email on users  (cost=0.43..8.45 rows=1 width=200)
  Index Cond: (email = 'alok@example.com')` },
      { type: 'h', text: 'Key Signals' },
      { type: 'kv', items: [
        { k: 'Seq Scan',         v: 'No index used' },
        { k: 'Index Scan',       v: 'Using an index ✅' },
        { k: 'Index Only Scan',  v: 'Covering index! ✅✅' },
        { k: 'Nested Loop',      v: 'Join — check indexes' },
        { k: 'Hash Join',        v: 'Large join — may need better indexes' },
        { k: 'rows=1',           v: 'Highly selective — index is great' },
        { k: 'rows=1,000,000',   v: 'Low selectivity — index may not help' },
      ]},
    ],
  },
  {
    id: 'mistakes',
    title: 'Common Indexing Mistakes',
    blocks: [
      { type: 'h', text: 'Mistake 1: Indexing a Low-Cardinality Column Alone' },
      { type: 'code', lang: 'sql', code: `-- "status" has only 3 values: active, inactive, banned
-- ~70% of rows are "active" → index barely helps
CREATE INDEX idx_status ON users(status);  ❌

-- Better: composite with a high-cardinality column
CREATE INDEX idx_status_id ON users(status, created_at);  ✅` },
      { type: 'h', text: 'Mistake 2: Index on a Function' },
      { type: 'code', lang: 'sql', code: `-- This can't use the index on email!
WHERE LOWER(email) = 'alok@example.com'  ❌

-- Fix option 1: Always store emails in lowercase
WHERE email = 'alok@example.com'  ✅

-- Fix option 2: Functional index (PostgreSQL)
CREATE INDEX idx_lower_email ON users(LOWER(email));` },
      { type: 'h', text: 'Mistake 3: Too Many Indexes' },
      { type: 'code', code: `Table: 100 write operations/second
Indexes: 15

Every write must update 15 indexes.
= 1,500 index writes/second

Your bottleneck is now the indexes, not the data! 😱` },
      { type: 'p', text: 'Audit your indexes regularly. Remove ones that aren\'t being used.' },
      { type: 'code', lang: 'sql', code: `-- PostgreSQL: find unused indexes
SELECT indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;` },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'When asked about slow queries: "First I\'d run EXPLAIN to check if indexes are being used." Mention the **write vs read trade-off** — shows you understand the cost. Composite index column order matters — being able to explain this is impressive. Covering indexes show advanced knowledge — worth mentioning for read-heavy systems. "I\'d add an index on (user_id, created_at) to support timeline queries" is a solid concrete answer.' },
    ],
  },
];

// ── 9. Numbers to Know ───────────────────────────────────────────────

export const NUMBERS_TO_KNOW: DeepSection[] = [
  {
    id: 'why',
    title: 'Why These Numbers Matter',
    blocks: [
      { type: 'callout', kind: 'info', title: 'Core idea', text: 'Great system designers carry a mental model of how fast and how big things are. You don\'t need exact numbers — you need the *order of magnitude*. Being off by 2× is fine. Being off by 1,000× is not.' },
      { type: 'p', text: 'When designing systems, you need to answer questions like:' },
      { type: 'ul', items: [
        '"Will one database server handle this load?"',
        '"How much storage will we need in year 1?"',
        '"Do we need a CDN or can we serve from one region?"',
        '"Can we use a synchronous approach or do we need async?"',
      ]},
      { type: 'p', text: 'Without these numbers, your answers are guesses. With them, they\'re estimates.' },
      { type: 'callout', kind: 'tip', text: 'You don\'t need to memorize every number. You need to know which numbers are 1ms, which are 100ms, and which are 1 second.' },
    ],
  },
  {
    id: 'latency',
    title: 'Latency Numbers',
    blocks: [
      { type: 'p', text: 'These are the "speed limits" of computing — set by physics and hardware.' },
      { type: 'h', text: 'The Latency Ladder' },
      { type: 'kv', title: 'CPU & Memory', items: [
        { k: 'L1 CPU cache read',         v: '~1 ns' },
        { k: 'L2 CPU cache read',         v: '~4 ns' },
        { k: 'Branch misprediction',      v: '~5 ns' },
        { k: 'L3 CPU cache read',         v: '~40 ns' },
        { k: 'Mutex lock / unlock',       v: '~25 ns' },
        { k: 'Main memory (RAM) access',  v: '~100 ns' },
      ]},
      { type: 'kv', title: 'Storage', items: [
        { k: 'Compress 1 KB (Snappy)',    v: '~3 µs' },
        { k: 'Read 1 MB seq from memory', v: '~250 µs' },
        { k: 'SSD random read (4KB)',     v: '~100 µs' },
        { k: 'Read 1 MB seq from SSD',    v: '~1 ms' },
        { k: 'HDD random read',           v: '~10 ms' },
      ]},
      { type: 'kv', title: 'Network', items: [
        { k: 'Same-DC round trip',        v: '~0.5 ms' },
        { k: 'Redis read (same DC)',      v: '~1 ms' },
        { k: 'DB query (indexed)',        v: '~1–5 ms' },
        { k: 'DB query (complex join)',   v: '~10–100 ms' },
        { k: 'Mumbai → Singapore',         v: '~30 ms' },
        { k: 'Mumbai → London',            v: '~100 ms' },
        { k: 'Mumbai → New York',          v: '~120 ms' },
        { k: 'TLS handshake',              v: '~100 ms' },
      ]},
      { type: 'h', text: 'The Key Ratios to Remember' },
      { type: 'code', code: `RAM is 1,000× faster than SSD
SSD is 100× faster than spinning disk
Same-datacenter network is 10× slower than RAM

Implication: Cache hot data in RAM.
             Use SSD-backed DBs, not HDD.
             Keep latency-sensitive data in the same datacenter.` },
      { type: 'h', text: 'Visual Intuition' },
      { type: 'p', text: 'If you scale up so that **1 CPU instruction = 1 second**, then:' },
      { type: 'kv', items: [
        { k: 'L1 cache read',          v: '1 second' },
        { k: 'RAM access',             v: '6 minutes' },
        { k: 'SSD read',               v: '4 days' },
        { k: 'HDD random read',        v: '16 months' },
        { k: 'Same-DC network',         v: '5 years' },
        { k: 'Cross-continent',         v: '160 years 😱' },
      ]},
      { type: 'p', text: 'This is why network calls are expensive and RAM is precious.' },
    ],
  },
  {
    id: 'storage',
    title: 'Storage Capacity Numbers',
    blocks: [
      { type: 'h', text: 'Common Data Sizes' },
      { type: 'kv', title: 'Primitive sizes', items: [
        { k: '1 ASCII character',          v: '1 byte' },
        { k: 'Unicode char (UTF-8)',       v: '1–4 bytes' },
        { k: 'Short text field',           v: '~50 bytes' },
        { k: 'Long text',                   v: '~200–500 bytes' },
        { k: 'Tweet (with metadata)',      v: '~500 bytes' },
        { k: 'UUID (binary)',              v: '16 bytes' },
        { k: 'Timestamp',                  v: '8 bytes' },
        { k: 'Integer (int32)',            v: '4 bytes' },
      ]},
      { type: 'kv', title: 'Media sizes', items: [
        { k: '1 min MP3 (128kbps)',        v: '~1 MB' },
        { k: 'Smartphone photo',           v: '~3–5 MB' },
        { k: 'High-res RAW photo',         v: '~25–50 MB' },
        { k: '1 min HD video',             v: '~50–100 MB' },
        { k: '1 min 4K video',             v: '~350 MB' },
        { k: 'Feature film (HD)',          v: '~3–5 GB' },
        { k: 'Feature film (4K)',          v: '~15–20 GB' },
      ]},
      { type: 'h', text: 'Storage Units Reference' },
      { type: 'code', code: `1 KB  (Kilobyte)   = 1,000 bytes          (a short email)
1 MB  (Megabyte)   = 1,000 KB             (a photo)
1 GB  (Gigabyte)   = 1,000 MB             (a movie)
1 TB  (Terabyte)   = 1,000 GB             (1,000 movies)
1 PB  (Petabyte)   = 1,000 TB             (1 million movies)
1 EB  (Exabyte)    = 1,000 PB             (internet traffic, days)

Real-world reference points:
  500 GB SSD in a laptop              → 500 GB
  AWS S3 for a medium startup         → 10–100 TB
  Netflix total content library       → ~3.14 PB
  Google processes per day            → ~100 PB
  Facebook stores per day             → ~100 PB` },
    ],
  },
  {
    id: 'throughput',
    title: 'Throughput Numbers',
    blocks: [
      { type: 'h', text: 'Single Server Limits (Rule of Thumb)' },
      { type: 'kv', title: 'Web servers', items: [
        { k: 'Simple web server (1 vCPU)',    v: '~1K–5K req/sec' },
        { k: 'Well-tuned (8 vCPU)',           v: '~10K–50K req/sec' },
        { k: 'Nginx (LB mode)',                v: '~100K+ req/sec' },
      ]},
      { type: 'kv', title: 'Databases', items: [
        { k: 'PostgreSQL (simple reads)',     v: '~10K–50K qps' },
        { k: 'PostgreSQL (complex joins)',     v: '~1K–5K qps' },
        { k: 'MySQL (with indexes)',           v: '~5K–20K qps' },
      ]},
      { type: 'kv', title: 'Caches & queues', items: [
        { k: 'Redis (single instance)',        v: '~100K–1M ops/sec' },
        { k: 'Memcached',                      v: '~200K–500K ops/sec' },
        { k: 'Kafka (single broker)',          v: '~500K msgs/sec' },
        { k: 'Kafka (cluster)',                v: 'millions/sec' },
      ]},
      { type: 'kv', title: 'Hardware', items: [
        { k: 'SSD read throughput',            v: '~500 MB–7 GB/sec' },
        { k: 'Network (1 Gbps link)',          v: '~125 MB/sec' },
        { k: 'Network (10 Gbps DC)',           v: '~1.25 GB/sec' },
      ]},
      { type: 'h', text: 'Requests Per Second ↔ Daily Users' },
      { type: 'p', text: 'A quick formula to estimate DAU from QPS (or vice versa):' },
      { type: 'code', code: `Assumption: Each user makes ~10 requests/day on average

1,000 req/sec  = 86,400,000 requests/day  ÷ 10  ≈  8.6M DAU
10,000 req/sec = 864,000,000 requests/day ÷ 10  ≈  86M DAU
100,000 req/sec                                  ≈  860M DAU` },
      { type: 'callout', kind: 'warn', title: 'Traffic is not uniform!', text: 'Apply a peak multiplier: **Average: X req/sec, Peak: 3–5× X req/sec** (morning rush, viral content). **Design for peak, not average.**' },
    ],
  },
  {
    id: 'availability',
    title: 'Availability and SLAs',
    blocks: [
      { type: 'h', text: 'The "Nines"' },
      { type: 'table', headers: ['Availability', 'Downtime/Year', 'Downtime/Month', 'Downtime/Week'], rows: [
        ['90%   (1 nine)',   '36.5 days',     '72 hours',     '16.8 hours'],
        ['99%   (2 nines)',  '3.65 days',     '7.2 hours',    '1.68 hours'],
        ['99.9% (3 nines)',  '8.76 hours',    '43.8 min',     '10.1 min'],
        ['99.99%(4 nines)',  '52.6 minutes',  '4.38 min',     '1.01 min'],
        ['99.999%(5 nines)', '5.26 minutes',  '25.9 sec',     '6.05 sec'],
      ]},
      { type: 'h', text: 'What level do you need?' },
      { type: 'kv', items: [
        { k: 'Internal tools',           v: '99%' },
        { k: 'Consumer apps',            v: '99.9%' },
        { k: 'Important APIs',           v: '99.99%' },
        { k: 'Payment systems',          v: '99.999%' },
        { k: 'Air traffic control',      v: '99.9999%+' },
      ]},
      { type: 'h', text: 'Achieving High Availability' },
      { type: 'code', code: `Single server:    ~99%      (crashes happen, patches needed)
+ redundancy:     ~99.9%    (failover, load balancing)
+ multi-AZ:       ~99.99%   (multiple data centers)
+ multi-region:   ~99.999%  (geographic redundancy)` },
      { type: 'callout', kind: 'warn', title: 'Availability compounds', text: 'If you have N services in series: 3 services each at 99.9% = combined 99.7%. This is why distributed systems are harder to keep available than monoliths!' },
    ],
  },
  {
    id: 'big-numbers',
    title: 'The Big Number Cheat Sheet',
    blocks: [
      { type: 'table', headers: ['Power of 10', 'Name', 'Written Out', 'Approx.'], rows: [
        ['10³',  'Thousand',     '1,000',                  '1K'],
        ['10⁶',  'Million',      '1,000,000',              '1M'],
        ['10⁹',  'Billion',      '1,000,000,000',          '1B'],
        ['10¹²', 'Trillion',     '1,000,000,000,000',      '1T'],
        ['10¹⁵', 'Quadrillion',  '1,000,000,000,000,000',  '1P'],
      ]},
      { type: 'h', text: 'Useful ballpark figures' },
      { type: 'kv', items: [
        { k: 'World population',           v: '~8 billion' },
        { k: 'Internet users',             v: '~5 billion' },
        { k: 'Instagram MAU',              v: '~2 billion' },
        { k: 'Twitter/X MAU',              v: '~600 million' },
        { k: 'India\'s population',        v: '~1.4 billion' },
        { k: 'Seconds in a day',           v: '86,400 (~100K)' },
        { k: 'Seconds in a year',          v: '31,536,000 (~31.5M)' },
      ]},
    ],
  },
  {
    id: 'estimation',
    title: 'Back-of-Envelope Estimation',
    blocks: [
      { type: 'p', text: 'A systematic approach to estimating storage, bandwidth, and compute:' },
      { type: 'h', text: 'Step 1: Establish Scale' },
      { type: 'ul', items: [
        'Total users: ?',
        'MAU (Monthly Active Users): ?',
        'DAU (Daily Active Users): typically 10–50% of MAU',
        'Peak DAU: typically 2–3× average DAU',
      ]},
      { type: 'h', text: 'Step 2: Estimate Request Rate' },
      { type: 'code', code: `Requests per user per day:
  Read-heavy apps (news, social): ~100 reads, ~5 writes/day
  Write-heavy apps (chat): ~200 messages/day

Total daily requests = DAU × requests_per_user
Peak QPS = total_daily_requests / 86,400 × peak_multiplier (3–5×)` },
      { type: 'h', text: 'Step 3: Estimate Storage' },
      { type: 'code', code: `Storage per record: ?
New records per day: ?
Years to keep: ?

Daily storage = new_records × bytes_per_record
Total storage = daily × days × replication_factor (typically 3×)` },
      { type: 'h', text: 'Step 4: Estimate Bandwidth' },
      { type: 'code', code: `Bandwidth = requests_per_second × average_response_size
Peak bandwidth = peak_QPS × response_size` },
    ],
  },
  {
    id: 'worked-examples',
    title: 'Worked Examples',
    blocks: [
      { type: 'h', text: 'Example 1: Design WhatsApp — Storage Estimation' },
      { type: 'code', code: `Given:
  DAU: 2 billion
  % who send messages: 10% → 200 million active senders
  Messages per sender per day: 20
  Message size: ~500 bytes

Daily messages:
  200M × 20 = 4 billion messages/day

Daily storage for messages:
  4B × 500 bytes = 2 TB/day

With 5 years retention + 3× replication:
  2 TB × 365 × 5 × 3 = ~11 PB

Media (~5% of msgs, ~100KB each):
  4B × 5% = 200M × 100KB = 20 TB/day
  Over 5 years with replication: ~110 PB

Total: ~120 PB of storage for 5 years` },
      { type: 'h', text: 'Example 2: Design Instagram — Request Rate' },
      { type: 'code', code: `Given:
  DAU: 500 million

Read/write ratio (typical for social): 80% reads, 20% writes

Reads per user per day: ~100 (scrolling feed, viewing profiles)
Writes per user per day: ~2 (posting, liking)

Read QPS:
  500M users × 100 reads / 86,400 seconds ≈ 580,000 reads/sec
  Peak (3× average): ~1.7M reads/sec

Write QPS:
  500M × 2 / 86,400 ≈ 11,500 writes/sec
  Peak: ~34,500 writes/sec

Implications:
  → Massive read caching needed (Redis, CDN)
  → Sharding across many DB instances
  → 1 server can't handle this → horizontal scaling` },
      { type: 'h', text: 'Example 3: URL Shortener — Quick Estimate' },
      { type: 'code', code: `Given:
  100M URLs created per day
  Read/write ratio: 100:1 (lots more redirects than creates)

Write QPS:
  100M / 86,400 ≈ 1,160 writes/sec

Read QPS:
  1,160 × 100 = 116,000 reads/sec
  Peak: ~350,000 reads/sec → needs caching!

Storage per URL entry:
  Short URL (7 chars): 7 bytes
  Long URL: ~200 bytes
  Metadata: ~50 bytes
  Total: ~300 bytes per URL

Daily storage:
  100M × 300 bytes = 30 GB/day

10-year storage:
  30 GB × 365 × 10 ≈ 100 TB (manageable on a few machines)` },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'When asked to estimate: **always show your work** — interviewers care more about method than the exact number. Say out loud: "I\'ll assume X DAU, Y requests per user per day, Z bytes per record" — explicit assumptions are great. **Round aggressively:** 86,400 → 100,000; 3.5 GB → "a few GB". Mention **peak vs average**: "Average is Xk QPS but I\'d design for 3× peak = Y QPS". After estimating: say what it means — "This means we need sharding" or "Redis can handle this easily".' },
    ],
  },
];
