# 19. Traffic Estimation (QPS)

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**QPS (Queries Per Second)** estimation is the process of calculating how many requests your system must handle per second to meet user demand.

### What It Is
QPS estimation involves:
- **Counting user actions** (page loads, API calls, database queries)
- **Translating user behavior into requests** (clicks → HTTP calls → DB queries)
- **Calculating peak vs average load** (normal traffic vs Black Friday)
- **Breaking down by operation type** (reads vs writes)

### Why It Exists
Without QPS estimation:
- ❌ You don't know how many servers you need
- ❌ Databases get overwhelmed unexpectedly
- ❌ Load balancers are misconfigured
- ❌ Cost forecasts are wildly inaccurate
- ❌ System design interviews lack concrete numbers

With proper QPS estimation:
- ✅ Right-size your infrastructure
- ✅ Choose appropriate database solutions
- ✅ Set meaningful SLOs (Service Level Objectives)
- ✅ Impress interviewers with structured thinking

### The Problem It Solves
QPS estimation answers: **"How much load will my system handle?"**
- Business says: "We have 10 million users"
- Engineering needs: "How many servers, DB connections, cache size?"
- QPS estimation: The bridge between business metrics and technical requirements

### Where and When It's Used
- **System design interviews** (mandatory skill)
- **Capacity planning** (quarterly infrastructure reviews)
- **Architecture decisions** (single DB vs sharding)
- **Cost estimation** (cloud resource budgeting)
- **Performance testing** (load test targets)

### Its Role in Large-Scale Distributed Systems
At FAANG scale, QPS directly determines:
- Number of server instances
- Database tier and sharding strategy
- Cache cluster size
- CDN bandwidth requirements
- On-call alerting thresholds

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### QPS Calculation Framework

```
┌─────────────────────────────────────────────────────────────────────┐
│              QPS CALCULATION LAYERS                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 1: USER LEVEL                                                │
│  ─────────────────────                                              │
│  Total Users → Active Users (DAU) → Concurrent Users               │
│                                                                      │
│  Layer 2: ACTION LEVEL                                              │
│  ─────────────────────                                              │
│  Concurrent Users × Actions per User per Second = User QPS         │
│                                                                      │
│  Layer 3: REQUEST LEVEL                                             │
│  ──────────────────────                                             │
│  User QPS × Requests per Action = API QPS                          │
│                                                                      │
│  Layer 4: DATABASE LEVEL                                            │
│  ────────────────────────                                           │
│  API QPS × DB Queries per Request = Database QPS                   │
│                                                                      │
│  AMPLIFICATION FACTOR:                                              │
│  ─────────────────────                                              │
│  1 user action → 1-3 API calls → 3-10 DB queries                   │
│  = 3x to 30x amplification                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step QPS Calculation

```
┌─────────────────────────────────────────────────────────────────────┐
│              QPS CALCULATION EXAMPLE: TWITTER-LIKE APP              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: ESTABLISH USER BASE                                        │
│  ────────────────────────────                                       │
│  Total registered users: 500 million                                │
│  Monthly Active Users (MAU): 200 million (40%)                      │
│  Daily Active Users (DAU): 100 million (50% of MAU)                │
│                                                                      │
│  STEP 2: CALCULATE CONCURRENT USERS                                 │
│  ────────────────────────────────                                   │
│  Peak hour: 20% of DAU active simultaneously                       │
│  Concurrent users: 100M × 0.20 = 20 million                        │
│                                                                      │
│  STEP 3: ESTIMATE ACTIONS PER USER                                  │
│  ──────────────────────────────                                     │
│  Average session: 10 minutes = 600 seconds                         │
│  Actions per session: 50 (scrolls, likes, posts, etc.)            │
│  Actions per second per user: 50 / 600 ≈ 0.08                      │
│                                                                      │
│  STEP 4: CALCULATE PEAK QPS                                         │
│  ───────────────────────────                                        │
│  Peak QPS = Concurrent Users × Actions per Second                  │
│  Peak QPS = 20,000,000 × 0.08 = 1,600,000 QPS                      │
│                                                                      │
│  STEP 5: BREAK DOWN BY OPERATION                                    │
│  ────────────────────────────                                       │
│  Timeline loads (reads): 70% = 1,120,000 QPS                       │
│  Likes/interactions: 20% = 320,000 QPS                             │
│  Posts (writes): 5% = 80,000 QPS                                   │
│  Other: 5% = 80,000 QPS                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### QPS Types and Their Impact

```
┌─────────────────────────────────────────────────────────────────────┐
│              QPS BREAKDOWN BY TYPE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  READ QPS (typically 80-95% of total)                               │
│  ─────────────────────────────────────                              │
│  • Page loads, feed refreshes, searches                            │
│  • Can be cached aggressively                                       │
│  • Horizontally scale with read replicas                           │
│  • CDN can handle static content reads                             │
│                                                                      │
│  WRITE QPS (typically 5-20% of total)                               │
│  ──────────────────────────────────────                             │
│  • Creating posts, sending messages, updating profiles             │
│  • Harder to scale (consistency requirements)                      │
│  • Often async (queue + background workers)                        │
│  • Database master handles writes                                  │
│                                                                      │
│  INTERNAL QPS (often 3-10x external)                                │
│  ───────────────────────────────────                                │
│  • Service-to-service calls                                        │
│  • Database queries per API call                                   │
│  • Cache lookups                                                   │
│  • Background job processing                                       │
│                                                                      │
│  EXAMPLE AMPLIFICATION:                                              │
│  ───────────────────────                                            │
│  1 "Load Feed" API call triggers:                                  │
│  • 1 auth check (cache)                                            │
│  • 1 user profile fetch (cache or DB)                              │
│  • 1 feed query (DB or cache)                                      │
│  • 50 post fetches (cache)                                         │
│  • 50 user lookups for post authors (cache)                        │
│  = 103 internal operations per 1 API call                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Time-Based QPS Patterns

```
┌─────────────────────────────────────────────────────────────────────┐
│              TRAFFIC PATTERNS                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DAILY PATTERN (Social Media App):                                  │
│                                                                      │
│  QPS                                                                 │
│  ▲                                                                   │
│  │                    ╱╲         ╱╲                                 │
│  │                   ╱  ╲       ╱  ╲   ← Evening peak               │
│  │     ╱╲          ╱    ╲     ╱    ╲                                │
│  │    ╱  ╲        ╱      ╲   ╱      ╲                               │
│  │   ╱    ╲      ╱        ╲ ╱        ╲  ← Morning peak             │
│  │  ╱      ╲    ╱          ╲          ╲                             │
│  │ ╱        ╲__╱                        ╲                           │
│  │╱           ↑                          ╲                          │
│  └──────────────────────────────────────────▶ Hour                  │
│    0  3  6  9  12 15 18 21 24                                       │
│           Lunch                                                      │
│                                                                      │
│  KEY OBSERVATIONS:                                                   │
│  • Peak: 6-9x average                                               │
│  • Lunch spike: Brief but sharp                                     │
│  • Late night: 20-30% of average                                    │
│  • Weekends: Different pattern (later peaks)                        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WEEKLY PATTERN (E-commerce):                                        │
│                                                                      │
│  QPS                                                                 │
│  ▲                                                                   │
│  │              ╱╲                                                   │
│  │             ╱  ╲                                                  │
│  │ ____╱╲____╱    ╲____╱╲____ ← Sunday evening spike               │
│  │                                                                   │
│  └──────────────────────────────▶ Day                               │
│    Mon Tue Wed Thu Fri Sat Sun                                      │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ANNUAL PATTERN (E-commerce):                                        │
│                                                                      │
│  QPS                                                                 │
│  ▲                                    │                              │
│  │                                    │ ← Black Friday              │
│  │                                    │   (10-50x normal)           │
│  │ _____________________________╱╲____│                              │
│  │                         Holiday    │                              │
│  │                         season     │                              │
│  └──────────────────────────────────────▶ Month                     │
│    J  F  M  A  M  J  J  A  S  O  N  D                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### QPS by System Type

```
┌─────────────────────────────────────────────────────────────────────┐
│              TYPICAL QPS RANGES BY SYSTEM TYPE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SYSTEM TYPE          │ TYPICAL QPS    │ PEAK MULTIPLIER            │
│  ─────────────────────│────────────────│────────────────────────────│
│  Personal blog        │ 1-10           │ 10x (viral post)           │
│  Small SaaS           │ 100-1K         │ 3x                         │
│  Medium app           │ 1K-10K         │ 5x                         │
│  Popular service      │ 10K-100K       │ 5-10x                      │
│  Large platform       │ 100K-1M        │ 3-5x                       │
│  FAANG-scale          │ 1M-100M        │ 2-3x                       │
│                                                                      │
│  SPECIFIC EXAMPLES:                                                  │
│  ─────────────────                                                  │
│  URL shortener        │ 100K reads/sec │ Write: 1K/sec              │
│  Twitter timeline     │ 500K reads/sec │ Write: 10K/sec             │
│  Search engine        │ 100K queries/s │ Index: 10K/sec             │
│  Video streaming      │ 1M streams     │ Concurrent connections     │
│  Chat app             │ 10M messages/s │ Delivery fanout            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### Complete QPS Estimation Example

**System**: Instagram-like photo sharing app

```
GIVEN:
──────
Total users: 1 billion
MAU: 500 million (50%)
DAU: 200 million (40% of MAU)

CONCURRENT USERS:
─────────────────
Peak hour assumption: 10% of DAU online simultaneously
Peak concurrent: 200M × 0.10 = 20 million users

USER BEHAVIOR:
──────────────
Average session: 30 minutes
Actions per session:
  - Feed scrolls: 100 (100 posts each = 10,000 post loads)
  - Photo views: 20
  - Likes: 10
  - Comments viewed: 50
  - Stories viewed: 30
  - Posts created: 0.5 (1 post per 2 sessions)

QPS CALCULATIONS:
─────────────────

1. FEED LOADING:
   - 100 scrolls per 30 min session = 0.055 scrolls/sec/user
   - Each scroll loads ~10 posts
   - 20M users × 0.055 × 10 = 11 million post reads/sec

2. PHOTO VIEWS:
   - 20 views per 30 min = 0.011 views/sec/user
   - 20M × 0.011 = 220K photo views/sec

3. LIKES:
   - 10 likes per 30 min = 0.0055 likes/sec/user
   - 20M × 0.0055 = 110K likes/sec (writes)

4. PHOTO UPLOADS:
   - 0.5 posts per session = 0.00028 posts/sec/user
   - 20M × 0.00028 = 5,600 uploads/sec

TOTAL QPS BREAKDOWN:
────────────────────
Read operations: ~12 million QPS
  - Post content reads: 11M
  - Photo requests: 220K
  - Profile reads: 500K (estimated)

Write operations: ~120K QPS
  - Likes: 110K
  - Comments: 5K
  - Uploads: 5.6K

Read:Write ratio = 100:1
```

### Server Sizing from QPS

```
┌─────────────────────────────────────────────────────────────────────┐
│              QPS → SERVER COUNT                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ASSUMPTIONS:                                                        │
│  ─────────────                                                      │
│  Single API server can handle: 5,000 QPS (with caching)            │
│  Target CPU utilization: 70% (headroom for spikes)                 │
│  Effective capacity per server: 5,000 × 0.70 = 3,500 QPS           │
│                                                                      │
│  CALCULATION:                                                        │
│  ────────────                                                       │
│  Total QPS needed: 12,000,000 (reads) + 120,000 (writes)           │
│                  = 12,120,000 QPS                                   │
│                                                                      │
│  API Servers needed: 12,120,000 / 3,500 = 3,463 servers            │
│  Round up + redundancy: ~4,000 API servers                         │
│                                                                      │
│  DISTRIBUTION:                                                       │
│  ─────────────                                                      │
│  Across 10 regions: 400 servers per region                         │
│  3 availability zones: ~133 servers per AZ                         │
│                                                                      │
│  WITH CACHING:                                                       │
│  ─────────────                                                      │
│  If cache handles 90% of reads:                                     │
│  DB reads: 11M × 0.10 = 1.1M QPS                                   │
│  Much more manageable for database tier                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Database QPS Estimation

```
┌─────────────────────────────────────────────────────────────────────┐
│              DATABASE QPS PLANNING                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CACHE HIT RATE IMPACT:                                             │
│  ──────────────────────                                             │
│                                                                      │
│  API QPS: 12 million reads/sec                                      │
│                                                                      │
│  Cache hit rate │ DB QPS      │ DB Strategy                        │
│  ───────────────│─────────────│─────────────────────────────────────│
│  0% (no cache)  │ 12,000,000  │ Impossible without massive sharding │
│  50%            │ 6,000,000   │ Still extremely challenging         │
│  80%            │ 2,400,000   │ Heavy sharding required             │
│  90%            │ 1,200,000   │ Sharded database viable             │
│  95%            │ 600,000     │ Manageable with good architecture   │
│  99%            │ 120,000     │ Standard sharded setup              │
│                                                                      │
│  LESSON: Cache hit rate is CRITICAL for database feasibility       │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DATABASE CAPACITY:                                                  │
│  ──────────────────                                                 │
│  PostgreSQL single instance: ~10K-50K QPS (depends on query)       │
│  MySQL single instance: ~10K-30K QPS                                │
│  DynamoDB: 1M+ QPS (distributed)                                   │
│  Cassandra: 100K+ QPS per node                                     │
│                                                                      │
│  For 600K DB QPS with PostgreSQL:                                  │
│  Shards needed: 600,000 / 20,000 = 30 shards minimum              │
│  With replicas: 30 masters + 60 replicas = 90 DB instances        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### QPS Impact on Storage Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│              QPS REQUIREMENTS → DATABASE CHOICE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  QPS RANGE      │ READ-HEAVY                │ WRITE-HEAVY           │
│  ───────────────│───────────────────────────│───────────────────────│
│  < 1K           │ Single PostgreSQL         │ Single PostgreSQL     │
│  1K - 10K       │ PostgreSQL + Redis cache  │ PostgreSQL + async    │
│  10K - 100K     │ Read replicas + Redis     │ Sharded PostgreSQL    │
│  100K - 1M      │ Sharded + Redis cluster   │ Cassandra / DynamoDB  │
│  1M+            │ CDN + distributed cache   │ Kafka + eventual cons │
│                                                                      │
│  LATENCY REQUIREMENTS:                                               │
│  ─────────────────────                                              │
│  < 10ms (real-time): Redis/Memcached required                      │
│  < 100ms: Database with good indexing                              │
│  < 1s: Can tolerate some async processing                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### QPS-Based Scaling Triggers

```
┌─────────────────────────────────────────────────────────────────────┐
│              AUTO-SCALING THRESHOLDS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  METRIC              │ SCALE UP        │ SCALE DOWN                 │
│  ────────────────────│─────────────────│────────────────────────────│
│  QPS per server      │ > 80% capacity  │ < 30% capacity (5+ min)    │
│  CPU utilization     │ > 70%           │ < 30% (5+ min)             │
│  Memory utilization  │ > 80%           │ < 40%                      │
│  Response latency    │ > p99 threshold │ N/A                        │
│  Error rate          │ > 1%            │ N/A (investigate)          │
│  Queue depth         │ > 1000 items    │ < 100 items                │
│                                                                      │
│  COOLDOWN PERIODS:                                                   │
│  ─────────────────                                                  │
│  Scale up: 1-2 minutes (react quickly)                             │
│  Scale down: 5-10 minutes (avoid thrashing)                        │
│                                                                      │
│  EXAMPLE AUTO-SCALING POLICY:                                        │
│  ────────────────────────────                                       │
│  Baseline: 100 servers @ 3,500 QPS each = 350K QPS capacity        │
│  Current load: 280K QPS (80% utilization)                          │
│  Action: Scale to 120 servers (67% utilization with headroom)      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Load Shedding Based on QPS

```
┌─────────────────────────────────────────────────────────────────────┐
│              QPS OVERLOAD HANDLING                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WHEN QPS EXCEEDS CAPACITY:                                         │
│                                                                      │
│  Level 1 (110% capacity):                                           │
│  • Enable aggressive caching                                        │
│  • Increase cache TTLs                                              │
│  • Return cached data even if slightly stale                        │
│                                                                      │
│  Level 2 (130% capacity):                                           │
│  • Rate limit non-critical endpoints                               │
│  • Disable background jobs                                         │
│  • Skip analytics/logging                                          │
│                                                                      │
│  Level 3 (150% capacity):                                           │
│  • Return 429 (Too Many Requests) for low-priority users          │
│  • Serve degraded responses (text-only, no images)                 │
│  • Queue requests instead of processing immediately                │
│                                                                      │
│  Level 4 (200%+ capacity - EMERGENCY):                              │
│  • Static maintenance page                                          │
│  • Block all non-essential traffic                                 │
│  • All hands on deck                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### Rate Limiting Based on QPS

```
┌─────────────────────────────────────────────────────────────────────┐
│              RATE LIMITING STRATEGIES                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TIER-BASED LIMITS:                                                  │
│  ─────────────────                                                  │
│  Free users: 100 requests/minute                                    │
│  Basic tier: 1,000 requests/minute                                  │
│  Pro tier: 10,000 requests/minute                                   │
│  Enterprise: 100,000 requests/minute                                │
│                                                                      │
│  ENDPOINT-SPECIFIC LIMITS:                                          │
│  ─────────────────────────                                          │
│  GET /feed: 60 requests/minute (high read)                         │
│  POST /post: 10 requests/minute (writes are expensive)             │
│  POST /upload: 5 requests/minute (very expensive)                  │
│  GET /search: 30 requests/minute (expensive computation)           │
│                                                                      │
│  GLOBAL SYSTEM LIMITS:                                               │
│  ─────────────────────                                              │
│  Total system capacity: 500K QPS                                   │
│  When at 90%: Start rejecting anonymous requests                   │
│  When at 95%: Reduce per-user limits by 50%                        │
│  When at 100%: Emergency mode (critical paths only)                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Case Study: Twitter's QPS Challenges

```
┌─────────────────────────────────────────────────────────────────────┐
│              TWITTER: WORLD CUP FINAL 2014                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  EVENT: Germany vs Argentina World Cup Final                        │
│                                                                      │
│  NORMAL TRAFFIC:                                                     │
│  ───────────────                                                    │
│  Tweets per second: ~5,000                                          │
│  Timeline reads: ~300,000 QPS                                       │
│                                                                      │
│  PEAK TRAFFIC (Germany scores):                                      │
│  ─────────────────────────────                                      │
│  Tweets per second: 618,725 (new record at the time)               │
│  Timeline reads: ~3,000,000 QPS                                     │
│  = 10x normal traffic in seconds                                   │
│                                                                      │
│  HOW THEY HANDLED IT:                                                │
│  ─────────────────────                                              │
│  1. Pre-scaled servers before the match                            │
│  2. Timeline cache pre-warmed                                       │
│  3. Write path optimized (fanout on read for celebs)               │
│  4. Rate limiting for bots/spam                                    │
│  5. Graceful degradation (delayed analytics)                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Case Study: Reddit's r/place Event

```
┌─────────────────────────────────────────────────────────────────────┐
│              REDDIT r/place 2022                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  THE EVENT:                                                          │
│  ──────────                                                         │
│  Collaborative pixel art canvas                                     │
│  Users can place one pixel every 5 minutes                         │
│  Canvas: 2000×2000 pixels                                           │
│                                                                      │
│  QPS CHALLENGE:                                                      │
│  ──────────────                                                     │
│  Peak concurrent users: 10+ million                                 │
│  Pixel placements: 1.2M per minute                                 │
│  Canvas updates viewed: 100M+ per minute                           │
│  = Every user watching real-time updates                           │
│                                                                      │
│  ARCHITECTURE:                                                       │
│  ─────────────                                                      │
│  1. WebSocket connections for real-time updates                    │
│  2. Write QPS: ~20K/sec (pixel placements)                         │
│  3. Read QPS: ~1.7M/sec (canvas fetches)                          │
│  4. Broadcast: Changes pushed to all viewers                       │
│                                                                      │
│  SOLUTION:                                                           │
│  ─────────                                                          │
│  • Chunked canvas (don't send entire image)                        │
│  • Delta updates (only changed pixels)                             │
│  • CDN edge caching for static chunks                              │
│  • Redis pub/sub for real-time distribution                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

**Q: "Estimate the QPS for a photo-sharing app like Instagram"**

> "Let me break this down systematically:
>
> **Starting with users:** Instagram has about 2 billion registered users. Let's say 500 million are monthly active, and 200 million are daily active. During peak hours, maybe 10% are online simultaneously—that's 20 million concurrent users.
>
> **User behavior:** In a 30-minute session, a typical user might: scroll through 100 posts in their feed, view 20 photos in detail, like 10 photos, and maybe post once every two sessions.
>
> **Calculating QPS:**
> - Feed scrolls: 20M × (100 scrolls / 1800 seconds) ≈ 1.1M scroll requests/sec
> - Each scroll loads 10 posts: 11M post reads/sec
> - Photo views: 20M × (20 / 1800) ≈ 220K/sec
> - Likes: 20M × (10 / 1800) ≈ 110K/sec writes
> - Posts: 20M × (0.5 / 1800) ≈ 5.5K/sec uploads
>
> **Total: ~12M reads/sec and ~120K writes/sec**, giving a 100:1 read/write ratio.
>
> **Key insight:** With a 95% cache hit rate, the database only sees 600K reads/sec, which is manageable with sharding across 30-50 database shards."

### Common Follow-Up Questions

1. **"How did you determine the cache hit rate?"**
   - Feed data is highly cacheable (same posts served to many users)
   - Popular content has high temporal locality
   - Industry benchmarks: Social apps typically 90-99% cache hit

2. **"What happens if QPS doubles suddenly?"**
   - Auto-scaling adds more API servers
   - Cache absorbs most of the read increase
   - Write path might need rate limiting
   - Queue burst writes for async processing

3. **"How do you validate your QPS estimates?"**
   - Load testing with realistic scenarios
   - Canary deployments measuring actual QPS
   - Compare with industry benchmarks
   - Start conservative, then measure and adjust

4. **"What's the QPS per server you're assuming?"**
   - Modern API server: 3,000-10,000 QPS depending on complexity
   - Simple CRUD: Higher end
   - Complex aggregations: Lower end
   - Always benchmark your specific workload

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### QPS Calculation Utility

```python
def estimate_qps(
    total_users: int,
    mau_ratio: float = 0.4,
    dau_ratio: float = 0.5,
    concurrent_ratio: float = 0.1,
    session_duration_seconds: int = 1800,
    actions_per_session: dict = None
) -> dict:
    """
    Estimate QPS for a system given user metrics.
    
    Example actions_per_session:
    {
        'feed_scroll': {'count': 100, 'type': 'read'},
        'photo_view': {'count': 20, 'type': 'read'},
        'like': {'count': 10, 'type': 'write'},
        'post': {'count': 0.5, 'type': 'write'}
    }
    """
    if actions_per_session is None:
        actions_per_session = {
            'feed_scroll': {'count': 50, 'type': 'read'},
            'detail_view': {'count': 20, 'type': 'read'},
            'like': {'count': 5, 'type': 'write'},
            'comment': {'count': 1, 'type': 'write'}
        }
    
    # Calculate user hierarchy
    mau = total_users * mau_ratio
    dau = mau * dau_ratio
    concurrent = dau * concurrent_ratio
    
    # Calculate QPS per action type
    read_qps = 0
    write_qps = 0
    
    for action, config in actions_per_session.items():
        action_qps = concurrent * (config['count'] / session_duration_seconds)
        if config['type'] == 'read':
            read_qps += action_qps
        else:
            write_qps += action_qps
    
    total_qps = read_qps + write_qps
    
    return {
        'users': {
            'total': total_users,
            'mau': mau,
            'dau': dau,
            'concurrent': concurrent
        },
        'qps': {
            'read': round(read_qps),
            'write': round(write_qps),
            'total': round(total_qps),
            'read_write_ratio': round(read_qps / write_qps, 1) if write_qps > 0 else 'inf'
        }
    }


def estimate_infrastructure(qps: int, qps_per_server: int = 5000, utilization_target: float = 0.7) -> dict:
    """
    Estimate infrastructure needs from QPS.
    """
    effective_capacity = qps_per_server * utilization_target
    servers_needed = qps / effective_capacity
    
    return {
        'servers_minimum': int(servers_needed),
        'servers_recommended': int(servers_needed * 1.5),  # 50% buffer
        'servers_peak': int(servers_needed * 2),           # Handle 2x spikes
        'effective_capacity_per_server': effective_capacity
    }


# Example usage
result = estimate_qps(
    total_users=100_000_000,  # 100M users
    actions_per_session={
        'feed_scroll': {'count': 100, 'type': 'read'},
        'photo_view': {'count': 20, 'type': 'read'},
        'like': {'count': 10, 'type': 'write'},
        'post': {'count': 0.5, 'type': 'write'}
    }
)

print(f"Concurrent users: {result['users']['concurrent']:,.0f}")
print(f"Read QPS: {result['qps']['read']:,}")
print(f"Write QPS: {result['qps']['write']:,}")
print(f"Read:Write Ratio: {result['qps']['read_write_ratio']}:1")

infra = estimate_infrastructure(result['qps']['total'])
print(f"Servers needed: {infra['servers_recommended']}")
```

### QPS Flow Diagram

```
                    EXTERNAL QPS                    INTERNAL QPS
                    ───────────                    ────────────

User Actions        API Layer           Service Layer         Data Layer
────────────        ─────────           ─────────────         ──────────

   Click        →   1 request     →     3-5 service    →     5-20 DB
   Scroll       →   1 request     →     calls per      →     queries per
   Like         →   1 request     →     API request    →     service call


EXAMPLE AMPLIFICATION:
──────────────────────

1 User "View Feed" Action:
│
├──▶ 1 API Request: GET /feed
│    │
│    ├──▶ 1 Auth Service call
│    ├──▶ 1 User Service call
│    ├──▶ 1 Feed Service call
│    │    │
│    │    ├──▶ 1 DB query (feed items)
│    │    ├──▶ 50 Cache lookups (post content)
│    │    ├──▶ 10 DB queries (cache misses)
│    │    └──▶ 50 Cache lookups (user profiles)
│    │
│    └──▶ Total: ~115 internal operations

1 External QPS = 115 Internal QPS
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### Why QPS Estimation Matters

| Audience | Why It Matters |
|----------|----------------|
| **Interviewers** | Shows systematic thinking about scale |
| **Engineers** | Right-size infrastructure, avoid surprises |
| **Managers** | Budget planning, timeline estimation |
| **SREs** | Set alerting thresholds, capacity planning |
| **Architects** | Database choice, caching strategy |

### How It Works (Summary)

```
┌─────────────────────────────────────────────────────────────────────┐
│              QPS ESTIMATION PROCESS                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: USER FUNNEL                                                │
│  Total Users → MAU (40%) → DAU (50% of MAU) → Concurrent (10%)     │
│                                                                      │
│  STEP 2: ACTIONS PER USER                                           │
│  Session duration × Actions per session = Actions per second        │
│                                                                      │
│  STEP 3: MULTIPLY                                                    │
│  Concurrent users × Actions per second = QPS                        │
│                                                                      │
│  STEP 4: CATEGORIZE                                                  │
│  Reads (80-95%) vs Writes (5-20%)                                   │
│                                                                      │
│  STEP 5: AMPLIFY                                                     │
│  External QPS × Internal multiplier = Total system load            │
│                                                                      │
│  STEP 6: SIZE                                                        │
│  QPS ÷ Capacity per server = Server count                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Quick Reference Formulas

```
Concurrent Users = DAU × Peak Ratio (typically 10-20%)

QPS = Concurrent Users × Actions per Second per User

Read QPS ≈ 80-95% of Total QPS
Write QPS ≈ 5-20% of Total QPS

Server Count = Peak QPS ÷ (QPS per Server × Utilization Target)

DB QPS = API QPS × (1 - Cache Hit Rate) × Queries per Request
```

### Key Numbers to Remember

| Metric | Typical Value |
|--------|---------------|
| DAU / Total Users | 10-25% |
| Concurrent / DAU | 10-20% |
| Session duration | 5-30 minutes |
| Actions per second per user | 0.05-0.2 |
| Read:Write ratio | 10:1 to 100:1 |
| QPS per API server | 3,000-10,000 |
| Cache hit rate target | 90-99% |

---

**Next**: `20_Read_vs_Write_Ratios.md` - Understanding read-heavy vs write-heavy systems