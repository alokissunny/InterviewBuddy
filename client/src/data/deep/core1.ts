import type { DeepSection } from '../interviewPrepData';

// ── 1. Networking Essentials ─────────────────────────────────────────

export const NETWORKING_ESSENTIALS: DeepSection[] = [
  {
    id: 'big-picture',
    title: 'The Big Picture',
    blocks: [
      { type: 'callout', kind: 'info', title: 'Who is this for?', text: 'You don\'t need any background to read this. If you\'ve ever wondered "how does data travel from your laptop to a server in another country?" — this is your starting point.' },
      { type: 'p', text: 'Imagine you want to mail a letter to a friend in another city. You write it, put it in an envelope, add an address, hand it to the post office, and it arrives. Networking is the same idea — just for data, and a million times faster.' },
      { type: 'p', text: 'When you type `google.com` into your browser, here\'s what happens:' },
      { type: 'code', code: `You                              Google's Server
 |                                      |
 |  1. "Where is google.com?"           |
 |─────────> DNS Server                 |
 |  "It lives at 142.250.x.x" <──────   |
 |                                      |
 |  2. "Hi, can we talk?" (SYN) ──────> |
 |  3. "Sure!" (SYN-ACK)        <────── |
 |  4. "Great!" (ACK)           ──────> |
 |                                      |
 |  5. "Give me your homepage"  ──────> |
 |  6. <──────── Here's the HTML ────── |` },
      { type: 'p', text: 'Each of those steps involves different **layers** of the networking stack — each one building on top of the previous.' },
    ],
  },
  {
    id: 'dns',
    title: 'DNS — The Internet\'s Phonebook',
    blocks: [
      { type: 'p', text: '**DNS (Domain Name System)** converts human-friendly names into machine-friendly IP addresses.' },
      { type: 'code', code: `You type:      google.com
DNS returns:   142.250.80.46

You type:      instagram.com
DNS returns:   157.240.241.174` },
      { type: 'p', text: 'Without DNS, you\'d have to memorize IP addresses for every website — like memorizing every phone number instead of using contacts.' },
      { type: 'h', text: 'How DNS Resolution Works' },
      { type: 'code', code: `Your Browser
    │
    ▼
Local Cache? ──── YES ───► Use it ✅
    │ NO
    ▼
Router's DNS Cache? ──── YES ───► Use it ✅
    │ NO
    ▼
ISP's DNS Resolver
    │
    ▼
Root Name Server ("Who handles .com?")
    │
    ▼
TLD Server ("Who handles google.com?")
    │
    ▼
Google's Authoritative DNS Server
    │
    ▼
Returns: 142.250.80.46 ✅` },
      { type: 'p', text: 'Each level caches the result with a **TTL (Time To Live)** — a duration before the cached answer expires and must be looked up again.' },
    ],
  },
  {
    id: 'osi-layers',
    title: 'The OSI Layers (Simplified)',
    blocks: [
      { type: 'p', text: 'Networking is organized into layers, where each layer builds on the one below it. Think of it like departments in a company — each has a specific job and hands off work to the next.' },
      { type: 'code', code: `Layer 7 ── Application  ── HTTP, DNS, WebSockets
               │              "What are you saying?"
               ▼
Layer 4 ── Transport    ── TCP, UDP
               │              "How reliably do we deliver it?"
               ▼
Layer 3 ── Network      ── IP
               │              "How do we route it to the right machine?"
               ▼
Layer 1/2 ─ Physical    ── Cables, WiFi, fiber
                             "How do bits become signals?"` },
      { type: 'p', text: 'As an application developer, you mostly work at **Layer 7**. The lower layers are handled by the OS, hardware, and network infrastructure — you don\'t need to think about them unless something goes wrong.' },
    ],
  },
  {
    id: 'tcp-vs-udp',
    title: 'TCP vs UDP',
    blocks: [
      { type: 'p', text: 'At the Transport Layer, you choose between two protocols: **TCP** and **UDP**.' },
      { type: 'h', text: 'TCP — The Careful, Reliable One' },
      { type: 'p', text: 'TCP (Transmission Control Protocol) is like **registered mail**. Every packet is tracked and confirmed.' },
      { type: 'code', code: `Sender                         Receiver
  │                                │
  │  ── "Packet 1" ─────────────►  │
  │  ◄── "Got it! (ACK)" ────────  │
  │                                │
  │  ── "Packet 2" ─────────────►  │
  │  ◄── "Got it! (ACK)" ────────  │
  │                                │
  │  ── "Packet 3" ─────────────►  │  ❌ (lost in transit)
  │  ... waiting ...               │
  │  ── "Packet 3" ─────────────►  │  ↻ retransmits!
  │  ◄── "Got it! (ACK)" ────────  │` },
      { type: 'ul', items: [
        '**Guarantees:** Every packet arrives, in order, with lost ones retransmitted.',
        '**Trade-off:** Slightly slower due to the overhead of confirmations.',
        '**Use TCP when:** Websites, file downloads, payments, emails — anything where losing data is unacceptable.',
      ]},
      { type: 'h', text: 'UDP — The Fast, Fire-and-Forget One' },
      { type: 'p', text: 'UDP (User Datagram Protocol) is like **dropping flyers from a plane**. You send — you don\'t check if anyone caught them.' },
      { type: 'code', code: `Sender                         Receiver
  │                                │
  │  ── "Packet 1" ─────────────►  │  ✅ arrived
  │  ── "Packet 2" ─────────────►  │  ❌ lost — nobody cares
  │  ── "Packet 3" ─────────────►  │  ✅ arrived
  │  ── "Packet 4" ─────────────►  │  ✅ arrived` },
      { type: 'ul', items: [
        '**Characteristics:** No delivery guarantee, no ordering, much lower latency, less overhead.',
        '**Use UDP when:** Live video calls, online gaming, DNS lookups, live sports scores — anywhere a tiny glitch is better than a delay.',
      ]},
      { type: 'h', text: 'TCP vs UDP Comparison' },
      { type: 'table', headers: ['Feature', 'TCP', 'UDP'], rows: [
        ['Connection',  'Requires handshake',    'Connectionless'],
        ['Reliability', 'Guaranteed delivery',   'Best-effort'],
        ['Ordering',    'Maintains order',       'No ordering'],
        ['Speed',       'Slower (overhead)',     'Faster'],
        ['Use Case',    'Web, files, payments',  'Streaming, gaming'],
      ]},
    ],
  },
  {
    id: 'http',
    title: 'HTTP — The Language of the Web',
    blocks: [
      { type: 'p', text: 'HTTP (HyperText Transfer Protocol) is how browsers and servers communicate. Every interaction is a **request → response** pair.' },
      { type: 'h', text: 'Request Methods' },
      { type: 'code', code: `GET    /users/42      → "Give me user #42"
POST   /users         → "Create a new user"
PUT    /users/42      → "Fully update user #42"
PATCH  /users/42      → "Partially update user #42"
DELETE /users/42      → "Delete user #42"` },
      { type: 'h', text: 'Response Status Codes' },
      { type: 'code', code: `2xx — Success
  200 OK            → Everything worked ✅
  201 Created       → New resource created ✅

3xx — Redirects
  301 Moved Permanently   → URL changed forever
  302 Found               → Temporary redirect

4xx — Client Errors (you messed up)
  400 Bad Request   → Your request is malformed
  401 Unauthorized  → You're not logged in
  403 Forbidden     → Logged in, but not allowed
  404 Not Found     → That thing doesn't exist
  429 Too Many Requests → Slow down!

5xx — Server Errors (server messed up)
  500 Internal Server Error → Something exploded 💥
  503 Service Unavailable   → Server is down/overloaded` },
      { type: 'h', text: 'HTTPS = HTTP + Encryption' },
      { type: 'p', text: 'HTTPS adds a **TLS/SSL** layer that encrypts all data in transit. Without it, anyone on the network can read your data (passwords, messages, card numbers). Any public website must use HTTPS.' },
      { type: 'code', code: `HTTP  → Data travels as plain text   📱
HTTPS → Data travels as scrambled ciphertext  🔒` },
    ],
  },
  {
    id: 'load-balancing',
    title: 'Load Balancing',
    blocks: [
      { type: 'p', text: 'As your system grows, one server can\'t handle all traffic. You add more servers — but now how do users know which one to talk to? That\'s what a **load balancer** does.' },
      { type: 'code', code: `                     ┌──────────────┐
Users ──────────────►│ Load Balancer│
                     └──────┬───────┘
                            │ distributes traffic
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          Server A      Server B      Server C` },
      { type: 'h', text: 'Layer 4 vs Layer 7 Load Balancers' },
      { type: 'ul', items: [
        '**L4 (Transport Layer)** — routes based on IP/port, doesn\'t inspect content. Fast, simple. Best for: WebSocket connections, raw TCP traffic.',
        '**L7 (Application Layer)** — reads HTTP headers and routes intelligently. Route `/api/*` to API servers, `/static/*` to CDN servers. Best for HTTP APIs, smart routing, A/B testing.',
      ]},
      { type: 'h', text: 'Common Algorithms' },
      { type: 'code', code: `Round Robin:        → A, B, C, A, B, C... (take turns)
Least Connections:  → Send to whichever server has fewest active users
IP Hash:            → Same user always goes to same server
Random:             → Pick a server at random` },
    ],
  },
  {
    id: 'takeaways',
    title: 'Key Takeaways',
    blocks: [
      { type: 'table', headers: ['Concept', 'One-Line Summary'], rows: [
        ['DNS', 'Translates `google.com` → `142.x.x.x`'],
        ['OSI Layers', 'Each layer has one job; higher layers are simpler to use'],
        ['TCP', 'Reliable, ordered, confirmed delivery — use by default'],
        ['UDP', 'Fast, no guarantees — use for streaming/gaming'],
        ['HTTP', 'Request + Response; methods tell what to do, status codes tell what happened'],
        ['HTTPS', 'HTTP + encryption — mandatory for public web'],
        ['Load Balancing', 'Distributes traffic across multiple servers'],
      ]},
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'Default to **TCP/HTTP** unless you have a specific reason for UDP. Mention **HTTPS** without being asked — it shows security awareness. If designing a real-time feature, ask yourself **WebSocket** (bidirectional) or **SSE** (server push only). Load balancer type matters: **L4 for WebSockets**, **L7 for HTTP routing**.' },
    ],
  },
];

// ── 2. API Design ─────────────────────────────────────────────────────

export const API_DESIGN: DeepSection[] = [
  {
    id: 'what-is-api',
    title: 'What is an API?',
    blocks: [
      { type: 'callout', kind: 'info', title: 'Core idea', text: 'An API is a contract between two programs. It says: "If you ask me in this specific way, I\'ll give you this specific answer." Choosing the right API style determines how fast, flexible, and maintainable your system will be.' },
      { type: 'p', text: '**API** = Application Programming Interface.' },
      { type: 'p', text: 'Think of a restaurant: You (the client) look at the **menu** (the API contract), place an **order** (the request), and the kitchen (the server) prepares and returns your **dish** (the response). You don\'t care *how* the kitchen makes the dish. You just need to know what to order and what you\'ll get back.' },
      { type: 'code', code: `Client                          Server
  │                               │
  │  "GET /menu/items"  ────────► │
  │                               │  (looks up items in DB)
  │  ◄──── [pizza, pasta, ...]    │
  │                               │
  │  "POST /orders"     ────────► │
  │  { item: "pizza" }            │  (creates order)
  │                               │
  │  ◄──── { orderId: 123 }       │` },
    ],
  },
  {
    id: 'rest',
    title: 'REST — The Classic Standard',
    blocks: [
      { type: 'p', text: '**REST** (Representational State Transfer) is the most widely used API style. The core idea: everything is a **resource**, and you perform standard operations on it.' },
      { type: 'h', text: 'Resources and Operations' },
      { type: 'p', text: 'A resource is a "thing" in your system — a user, a photo, an order, a product.' },
      { type: 'code', code: `Resource: /users

GET    /users          → List all users
GET    /users/42       → Get user #42
POST   /users          → Create a new user
PUT    /users/42       → Replace user #42 entirely
PATCH  /users/42       → Update parts of user #42
DELETE /users/42       → Delete user #42` },
      { type: 'h', text: 'Nested Resources (Relationships)' },
      { type: 'code', code: `GET /users/42/posts         → All posts by user #42
GET /users/42/posts/7       → Post #7 by user #42
POST /users/42/posts        → Create a post for user #42
DELETE /users/42/posts/7    → Delete post #7 by user #42` },
      { type: 'h', text: 'A Complete REST Example' },
      { type: 'code', lang: 'http', code: `Request:
  POST /orders
  Content-Type: application/json
  Authorization: Bearer eyJhbGc...

  {
    "product_id": 99,
    "quantity": 2,
    "delivery_address": "Mumbai, India"
  }

Response:
  HTTP 201 Created
  {
    "order_id": "ORD-2847",
    "status": "confirmed",
    "estimated_delivery": "2026-05-25",
    "total_price": 1299
  }` },
      { type: 'h', text: 'REST Design Tips' },
      { type: 'callout', kind: 'pitfall', title: 'Don\'t use verbs in URLs', text: 'Actions go in HTTP methods — not URL paths. **Bad:** `POST /createUser`, `GET /getUserById?id=42`, `POST /deleteOrder/7`. **Good:** `POST /users`, `GET /users/42`, `DELETE /orders/7`.' },
      { type: 'h', text: 'When to Use REST' },
      { type: 'ul', items: [
        '✅ Public-facing APIs',
        '✅ When clients are browsers or mobile apps',
        '✅ Default choice for most systems',
        '✅ When simplicity and broad tooling support matters',
      ]},
    ],
  },
  {
    id: 'graphql',
    title: 'GraphQL — Ask for Exactly What You Need',
    blocks: [
      { type: 'h', text: 'The Problem GraphQL Solves' },
      { type: 'p', text: 'With REST, you often get **too much** or **too little** data.' },
      { type: 'p', text: '**Over-fetching** — Getting more than you need:' },
      { type: 'code', code: `GET /users/42
→ Returns: id, name, email, phone, address, bio, avatar,
           created_at, last_login, preferences, settings,
           subscription_tier, locale, timezone...

(You only needed name and avatar 🤔)` },
      { type: 'p', text: '**Under-fetching** — Not enough in one call:' },
      { type: 'code', code: `GET /users/42      → Get user info
GET /users/42/posts → Get their posts  (2nd request!)
GET /posts/7/comments → Get comments  (3rd request!)` },
      { type: 'p', text: 'GraphQL solves both.' },
      { type: 'h', text: 'How GraphQL Works' },
      { type: 'p', text: 'The client **describes exactly what it wants** in a query. The server returns precisely that — nothing more.' },
      { type: 'code', lang: 'graphql', code: `# You write this query:
query {
  user(id: 42) {
    name
    avatar
    posts(limit: 3) {
      title
      likes
    }
  }
}

# You get exactly this back:
{
  "user": {
    "name": "Alok",
    "avatar": "https://cdn.example.com/alok.jpg",
    "posts": [
      { "title": "My first post", "likes": 42 },
      { "title": "System design tips", "likes": 187 },
      { "title": "Life update", "likes": 23 }
    ]
  }
}` },
      { type: 'p', text: 'One request. Exactly the data needed. No wasted bandwidth.' },
      { type: 'h', text: 'The Trade-off' },
      { type: 'compare', aTitle: 'REST', bTitle: 'GraphQL',
        aPoints: [
          '✅ Simple to understand and cache',
          '✅ Mature tooling, HTTP-native',
          '❌ Over/under-fetching problems',
          '❌ Multiple round trips for complex pages',
        ],
        bPoints: [
          '✅ Exact data, no waste',
          '✅ Great for rapidly evolving frontends',
          '❌ More complex to set up',
          '❌ Harder to cache (every query is unique)',
        ],
      },
      { type: 'h', text: 'When to Use GraphQL' },
      { type: 'ul', items: [
        '✅ Mobile apps (every byte saved matters)',
        '✅ Frontend teams that iterate quickly',
        '✅ Complex data with many relationships (social graphs, e-commerce)',
        '❌ Simple CRUD apps — overkill',
        '❌ When HTTP caching is critical',
      ]},
    ],
  },
  {
    id: 'grpc',
    title: 'gRPC — Speed for Internal Services',
    blocks: [
      { type: 'h', text: 'What is gRPC?' },
      { type: 'p', text: 'gRPC is a high-performance **Remote Procedure Call (RPC)** framework from Google. Instead of "here\'s a resource", it thinks in "here\'s a function I\'m calling on a remote machine."' },
      { type: 'p', text: 'It uses two key technologies:' },
      { type: 'ol', items: [
        '**Protocol Buffers** — A compact binary format (much smaller than JSON)',
        '**HTTP/2** — Allows multiple requests over a single connection',
      ]},
      { type: 'h', text: 'JSON vs Protocol Buffers' },
      { type: 'code', code: `Same data, very different sizes:

JSON (40 bytes — text):
{"id": "123", "name": "Alok Shah"}

Protocol Buffer (15 bytes — binary):
0A 03 31 32 33 12 09 41 6C 6F 6B 20 53 68 61 68

Result: ~3× smaller, faster to parse` },
      { type: 'h', text: 'Defining a gRPC Service' },
      { type: 'p', text: 'You write a `.proto` file that defines the contract:' },
      { type: 'code', lang: 'protobuf', code: `// user_service.proto
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc CreateUser(CreateUserRequest) returns (User);
  rpc StreamUserEvents(UserID) returns (stream UserEvent);
}

message GetUserRequest {
  string user_id = 1;
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}` },
      { type: 'p', text: 'The `.proto` file is compiled into **client and server stubs** in any language (Go, Python, Java, etc.) — so both sides always agree on the contract.' },
      { type: 'h', text: 'When to Use gRPC' },
      { type: 'ul', items: [
        '✅ Internal service-to-service communication (microservices)',
        '✅ High-throughput, low-latency requirements',
        '✅ Polyglot environments (Go service talking to Python service)',
        '❌ Public APIs (browsers don\'t support gRPC natively)',
        '❌ When you need human-readable requests for debugging',
      ]},
      { type: 'h', text: 'Practical Pattern' },
      { type: 'code', code: `Internet Users ──► REST/JSON API (public-facing)
                        │
                   Internal calls
                        │
             ┌──────────┼───────────┐
             ▼          ▼           ▼
       User Service  Order Svc  Payment Svc
       (gRPC)       (gRPC)     (gRPC)` },
      { type: 'p', text: 'Public = REST. Internal = gRPC.' },
    ],
  },
  {
    id: 'websockets',
    title: 'WebSockets — Real-Time Two-Way Communication',
    blocks: [
      { type: 'p', text: 'Normal HTTP is like a walkie-talkie: you talk, server responds, conversation ends. But some apps need a **continuous open channel** — like a phone call.' },
      { type: 'h', text: 'How WebSockets Work' },
      { type: 'code', code: `Step 1: Client initiates a regular HTTP request with an upgrade header
  GET /chat
  Upgrade: websocket

Step 2: Server accepts
  HTTP 101 Switching Protocols

Step 3: Both sides can now send messages freely
  Client → Server: "Hey, I sent a message"
  Server → Client: "New message from Priya: 'Hello!'"
  Client → Server: "Typing..."
  Server → Client: "New message from Raj: 'How are you?'"

(connection stays open indefinitely)` },
      { type: 'h', text: 'WebSocket vs HTTP' },
      { type: 'code', code: `HTTP:
  Client: "Any new messages?"
  Server: "No."
  (3 seconds later)
  Client: "Any new messages?"
  Server: "Yes! Here's 1."
  (Polling — inefficient)

WebSocket:
  [connection open]
  Server: "New message!"  ← pushed immediately, no polling
  Server: "Another one!"
  Server: "Someone liked your post!"` },
      { type: 'h', text: 'When to Use WebSockets' },
      { type: 'ul', items: [
        '✅ Chat applications',
        '✅ Multiplayer games',
        '✅ Collaborative editing (Google Docs-style)',
        '✅ Live trading dashboards',
        '❌ Simple notifications (SSE is enough)',
        '❌ Occasional updates (HTTP polling is fine)',
      ]},
    ],
  },
  {
    id: 'sse',
    title: 'Server-Sent Events (SSE) — One-Way Push',
    blocks: [
      { type: 'p', text: 'SSE is a simpler alternative to WebSockets when you only need the **server to push to the client** (not the other way).' },
      { type: 'code', code: `Normal HTTP response (comes all at once):
{ "events": [ event1, event2, event3 ] }

SSE response (streams one at a time):
data: { "event": "bid", "amount": 5000 }

data: { "event": "bid", "amount": 5200 }

data: { "event": "sold", "amount": 5200 }` },
      { type: 'p', text: 'The browser processes each `data:` line as it arrives.' },
      { type: 'h', text: 'SSE vs WebSockets' },
      { type: 'table', headers: ['Feature', 'SSE', 'WebSocket'], rows: [
        ['Direction',       'Server → Client only',     'Bidirectional'],
        ['Protocol',        'Standard HTTP',            'Upgraded protocol'],
        ['Browser support', 'Excellent',                'Excellent'],
        ['Reconnects',      'Automatic',                'Manual'],
        ['Best for',        'Notifications, feeds',     'Chat, games'],
      ]},
      { type: 'h', text: 'When to Use SSE' },
      { type: 'ul', items: [
        '✅ Live auction bid updates',
        '✅ News feed / social media notifications',
        '✅ Progress updates on long-running jobs',
        '✅ Live sports scores',
        '❌ When client also needs to push data frequently',
      ]},
    ],
  },
  {
    id: 'choosing',
    title: 'Choosing the Right API Style',
    blocks: [
      { type: 'code', code: `Start here: What kind of clients do you have?
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
  Browsers     Mobile Apps   Other Services
      │             │             │
      ▼             ▼             ▼
  Use REST     GraphQL or     Use gRPC
               REST

Do you need real-time updates?
      │
      ├── Server pushes only? ──► SSE
      │
      └── Two-way real-time?  ──► WebSockets` },
      { type: 'p', text: '**Decision matrix:**' },
      { type: 'table', headers: ['Scenario', 'Recommended'], rows: [
        ['Public web API',                          'REST'],
        ['Mobile app with complex queries',          'GraphQL'],
        ['Internal microservices',                   'gRPC'],
        ['Live notifications',                       'SSE'],
        ['Chat / games / collaborative tools',       'WebSockets'],
        ['Default when unsure',                      'REST'],
      ]},
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: '**Default to REST** — only upgrade if there\'s a specific reason. If you mention WebSockets, explain **why** (bidirectional, high-frequency). Saying "internal services use gRPC" shows real-world architecture knowledge. GraphQL shines when the interviewer says "requirements change frequently."' },
    ],
  },
];

// ── 3. Data Modeling ─────────────────────────────────────────────────

export const DATA_MODELING: DeepSection[] = [
  {
    id: 'what-is-data-modeling',
    title: 'What is Data Modeling?',
    blocks: [
      { type: 'callout', kind: 'info', title: 'Core idea', text: 'Data modeling is deciding *how* to organize and store your data. The right model makes queries fast and code simple. The wrong model means you\'re constantly fighting your own database.' },
      { type: 'callout', kind: 'tip', title: 'Golden rule', text: 'Design for your queries, not for elegance.' },
      { type: 'p', text: 'Every application has data. The question is: **how do you organize it?**' },
      { type: 'p', text: 'Imagine you\'re building Instagram. You have: Users, Photos, Comments, Likes, Followers. You need to answer questions like:' },
      { type: 'ul', items: [
        '"What are the last 20 photos posted by people I follow?"',
        '"How many likes does this photo have?"',
        '"Which users liked this photo?"',
      ]},
      { type: 'p', text: 'The structure you design determines whether these queries take **1 millisecond or 10 seconds**.' },
    ],
  },
  {
    id: 'relational',
    title: 'Relational Databases — The Spreadsheet World',
    blocks: [
      { type: 'p', text: 'A relational database (like PostgreSQL or MySQL) stores data in **tables** — think of Excel spreadsheets that can link to each other.' },
      { type: 'h', text: 'Tables and Rows' },
      { type: 'code', code: `USERS table
┌────┬─────────┬───────────────────────┐
│ id │ name    │ email                 │
├────┼─────────┼───────────────────────┤
│  1 │ Alok    │ alok@example.com      │
│  2 │ Priya   │ priya@example.com     │
│  3 │ Raj     │ raj@example.com       │
└────┴─────────┴───────────────────────┘

PHOTOS table
┌────┬─────────┬─────────────────────┬────────────┐
│ id │ user_id │ url                 │ created_at │
├────┼─────────┼─────────────────────┼────────────┤
│  1 │    1    │ cdn.com/photo1.jpg  │ 2026-01-01 │
│  2 │    1    │ cdn.com/photo2.jpg  │ 2026-01-02 │
│  3 │    2    │ cdn.com/photo3.jpg  │ 2026-01-03 │
└────┴─────────┴─────────────────────┴────────────┘
         │
         └─── This points to USERS.id (foreign key)` },
      { type: 'h', text: 'Joining Tables' },
      { type: 'p', text: 'To answer "show all photos with their owner\'s name":' },
      { type: 'code', lang: 'sql', code: `SELECT photos.url, users.name
FROM photos
JOIN users ON photos.user_id = users.id;

Result:
url                  | name
cdn.com/photo1.jpg   | Alok
cdn.com/photo2.jpg   | Alok
cdn.com/photo3.jpg   | Priya` },
      { type: 'h', text: 'Relationships' },
      { type: 'p', text: '**One-to-Many:** One user has many photos.' },
      { type: 'code', code: `User ──────── Photo
     (1)   (many)` },
      { type: 'p', text: '**Many-to-Many:** A photo can have many likes; a user can like many photos.' },
      { type: 'code', code: `User ────── LIKES ────── Photo
     (many)  (join)  (many)

LIKES table:
┌─────────┬──────────┐
│ user_id │ photo_id │
├─────────┼──────────┤
│    1    │    3     │  Alok liked photo #3
│    2    │    1     │  Priya liked photo #1
│    2    │    3     │  Priya liked photo #3
└─────────┴──────────┘` },
      { type: 'h', text: 'When to Use Relational DBs' },
      { type: 'ul', items: [
        '✅ Financial data (transactions must be accurate)',
        '✅ Complex relationships between entities',
        '✅ Need ACID guarantees (Atomicity, Consistency, Isolation, Durability)',
        '✅ Data integrity is critical (can\'t have orphaned records)',
      ]},
    ],
  },
  {
    id: 'document',
    title: 'Document Databases — The Folder World',
    blocks: [
      { type: 'p', text: 'A document database (like MongoDB or Firestore) stores data as **self-contained JSON documents** instead of rows in tables.' },
      { type: 'h', text: 'Everything in One Document' },
      { type: 'p', text: 'Instead of joining users and photos and comments, you can **embed related data together**:' },
      { type: 'code', lang: 'json', code: `{
  "_id": "user_1",
  "name": "Alok",
  "email": "alok@example.com",
  "photos": [
    {
      "id": "photo_1",
      "url": "cdn.com/photo1.jpg",
      "caption": "Sunset in Goa",
      "likes_count": 142,
      "comments": [
        { "user": "Priya", "text": "Beautiful!" },
        { "user": "Raj",   "text": "Where is this?" }
      ]
    },
    {
      "id": "photo_2",
      "url": "cdn.com/photo2.jpg",
      "caption": "Coffee time",
      "likes_count": 88
    }
  ]
}` },
      { type: 'p', text: 'No joins needed — everything is in one place.' },
      { type: 'h', text: 'When Documents Shine' },
      { type: 'p', text: '**Read pattern:** "Show me a user\'s profile page with their recent photos and comments."' },
      { type: 'code', code: `Relational:
  SELECT * FROM users WHERE id = 1;
  SELECT * FROM photos WHERE user_id = 1 LIMIT 10;
  SELECT * FROM comments WHERE photo_id IN (1, 2, ...);
  → 3 queries, 2 joins

Document:
  db.users.findOne({ _id: "user_1" })
  → 1 query, everything's there ✅` },
      { type: 'h', text: 'When Documents Hurt' },
      { type: 'callout', kind: 'pitfall', title: 'Duplication problem', text: 'If a user\'s name appears embedded in every comment, then changing the user\'s name requires updating ALL their comments. Document DBs trade query speed for write complexity when shared data is updated.' },
      { type: 'h', text: 'When to Use Document DBs' },
      { type: 'ul', items: [
        '✅ User profiles, product catalogs, blog posts',
        '✅ Data that\'s read/written as a whole unit',
        '✅ Flexible schema (different documents can have different fields)',
        '✅ High write throughput without complex relationships',
        '❌ Complex multi-entity queries',
        '❌ Strong consistency requirements',
      ]},
    ],
  },
  {
    id: 'kv-store',
    title: 'Key-Value Stores — The Dictionary',
    blocks: [
      { type: 'p', text: 'The simplest database model: a massive dictionary.' },
      { type: 'code', code: `Key                      Value
───────────────────────────────────────────────────
"user:123:session"    →  "eyJhbGciOiJIUzI1NiJ9..."
"user:123:cart"       →  [{ id: 99, qty: 2 }, ...]
"product:42:stock"    →  "847"
"rate_limit:ip:1.2.3" →  "43" (requests in last minute)` },
      { type: 'p', text: '**No relationships, no joins, no schema.** Just: give me the value for this key.' },
      { type: 'p', text: 'This simplicity makes key-value stores **extremely fast**.' },
      { type: 'kv', title: 'Throughput comparison', items: [
        { k: 'Redis (in-memory KV)',        v: '100K+ reads/sec, sub-ms' },
        { k: 'PostgreSQL (relational)',     v: '~10K queries/sec, 1–10ms' },
      ]},
      { type: 'h', text: 'When to Use Key-Value Stores' },
      { type: 'ul', items: [
        '✅ Session storage ("is user 123 logged in?")',
        '✅ Caching expensive query results',
        '✅ Rate limiting counters',
        '✅ Shopping carts',
        '✅ Feature flags',
        '❌ Complex queries or relationships',
      ]},
    ],
  },
  {
    id: 'normalize',
    title: 'Normalization vs Denormalization',
    blocks: [
      { type: 'p', text: 'This is one of the most important trade-offs in data modeling.' },
      { type: 'h', text: 'Normalized — No Duplication' },
      { type: 'p', text: 'Data lives in one place. Referenced everywhere else by ID.' },
      { type: 'code', code: `PRODUCTS table          ORDER_ITEMS table
┌────┬─────────┬──────┐  ┌──────────┬─────────────┬───┐
│ id │ name    │price │  │ order_id │ product_id  │qty│
├────┼─────────┼──────┤  ├──────────┼─────────────┼───┤
│ 42 │ "Shirt" │ 499  │  │    1     │     42      │ 2 │
│ 43 │ "Jeans" │ 999  │  │    2     │     42      │ 1 │
└────┴─────────┴──────┘  │    2     │     43      │ 1 │
                         └──────────┴─────────────┴───┘` },
      { type: 'p', text: 'Shirt\'s name and price are stored **once**. To see an order\'s items, you join.' },
      { type: 'compare', aTitle: 'Pros', bTitle: 'Cons',
        aPoints: ['No duplication', 'Easy to update (change price in one place)'],
        bPoints: ['Needs joins (slower reads)'],
      },
      { type: 'h', text: 'Denormalized — Duplicate for Speed' },
      { type: 'p', text: 'Store everything together, even if it means repeating data.' },
      { type: 'code', code: `ORDER_ITEMS table (denormalized)
┌──────────┬─────────────┬──────────────┬───────┬───┐
│ order_id │ product_id  │ product_name │ price │qty│
├──────────┼─────────────┼──────────────┼───────┼───┤
│    1     │     42      │ "Shirt"      │  499  │ 2 │
│    2     │     42      │ "Shirt"      │  499  │ 1 │ ← duplicated!
│    2     │     43      │ "Jeans"      │  999  │ 1 │
└──────────┴─────────────┴──────────────┴───────┴───┘` },
      { type: 'compare', aTitle: 'Pros', bTitle: 'Cons',
        aPoints: ['One query gives you everything — no joins'],
        bPoints: ['Data duplication', 'If price changes, old orders still show old price (often desired!)'],
      },
      { type: 'h', text: 'The Rule of Thumb' },
      { type: 'code', code: `Write-heavy workloads  →  Normalize
  (avoid updating data in many places)

Read-heavy workloads   →  Denormalize
  (avoid expensive joins on every read)

Most real systems = both (normalize by default, denormalize hot paths)` },
    ],
  },
  {
    id: 'choosing-db',
    title: 'Choosing the Right Database',
    blocks: [
      { type: 'table', headers: ['Need', 'Database Type', 'Examples'], rows: [
        ['Complex relationships, ACID',  'Relational (SQL)',  'PostgreSQL, MySQL'],
        ['Flexible documents, high write', 'Document',         'MongoDB, Firestore'],
        ['Ultra-fast key lookups, caching', 'Key-Value',       'Redis, DynamoDB'],
        ['Social graphs, recommendations', 'Graph',            'Neo4j, Amazon Neptune'],
        ['Metrics, IoT, time-series data', 'Time-Series',      'InfluxDB, TimescaleDB'],
        ['Full-text search',                'Search Engine',   'Elasticsearch, Solr'],
      ]},
    ],
  },
  {
    id: 'practical-example',
    title: 'Practical Modeling Example',
    blocks: [
      { type: 'p', text: '**Building a Twitter-like system. How do you model a "feed"?**' },
      { type: 'h', text: 'Option A: Compute on Read (Normalized)' },
      { type: 'code', lang: 'sql', code: `-- Tables stay normalized; feed is computed at query time
SELECT * FROM tweets
WHERE user_id IN (SELECT following FROM follows WHERE follower = 1)
ORDER BY created_at DESC
LIMIT 20;` },
      { type: 'ul', items: [
        '✅ Simple writes',
        '❌ Expensive read (fan-in query across many followed users)',
      ]},
      { type: 'h', text: 'Option B: Fan-Out on Write (Denormalized)' },
      { type: 'p', text: 'Pre-compute each user\'s feed and store it:' },
      { type: 'code', code: `FEEDS table (pre-computed, denormalized)
┌──────────┬──────────┬──────────────────┬────────────┐
│ user_id  │ tweet_id │ author_name      │ created_at │
├──────────┼──────────┼──────────────────┼────────────┤
│    1     │    1     │ "UserA"          │ 2026-05-01 │
│    1     │    2     │ "UserB"          │ 2026-05-02 │
└──────────┴──────────┴──────────────────┴────────────┘` },
      { type: 'p', text: 'When User 99 tweets → immediately insert into all followers\' feed tables.' },
      { type: 'ul', items: [
        '✅ Super fast reads',
        '❌ Expensive writes (if you have 10M followers, 10M inserts per tweet)',
      ]},
      { type: 'h', text: 'Real Answer: Hybrid' },
      { type: 'ul', items: [
        'Normal users → fan-out on write (pre-computed feeds)',
        'Celebrities (millions of followers) → fan-in on read (too expensive to fan out)',
      ]},
      { type: 'p', text: 'This is exactly how Twitter/X works.' },
    ],
  },
  {
    id: 'interview-tips',
    title: '💡 Interview Tips',
    blocks: [
      { type: 'callout', kind: 'interview', title: 'In the interview', text: 'Always ask **"what are the most common read patterns?"** before modeling. Say "I\'d denormalize this for read performance" to show trade-off awareness. Mention the **fan-out vs fan-in** trade-off for feeds/timelines — interviewers love it. Don\'t over-normalize; real systems almost always have some denormalization.' },
    ],
  },
];
