# 26. Back-of-the-Envelope Calculations

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Back-of-the-Envelope Calculations** are quick, approximate estimations used to determine the feasibility and scale of a system design before diving into detailed architecture.

### What It Is
These are rough calculations that:
- **Estimate scale**: Users, requests, data volume
- **Size infrastructure**: Servers, storage, bandwidth
- **Validate feasibility**: Can this design work?
- **Identify bottlenecks**: What will be the hardest part?

### Why It Exists
In interviews and real-world planning:
- **No time for exact calculations** - need quick approximations
- **Orders of magnitude matter** - 1GB vs 1TB changes the design
- **Shows engineering thinking** - demonstrates you understand scale
- **Catches impossible designs** - before you build them

### The Problem It Solves
Without quick estimation:
- **Over-engineering**: Building for 1B users when you have 1K
- **Under-engineering**: Building for 1K when you'll have 1M
- **Wrong technology choices**: Using Redis when you need Cassandra
- **Wasted interview time**: Designing something that won't work

### Where and When It's Used
- **System design interviews**: First 5-10 minutes
- **Architecture planning**: Initial feasibility
- **Capacity planning**: Budget estimation
- **Scaling decisions**: When to re-architect

### Its Role in Large-Scale Distributed Systems
At FAANG scale:
- **Amazon**: "We can handle Black Friday?" calculations
- **Google**: "Can we index the entire web?" estimates
- **Netflix**: "Can we stream to 200M users?" planning

Quick math prevents expensive mistakes.

---

## ────────────────────────────────────
## 2️⃣ Essential Numbers to Memorize
## ────────────────────────────────────

### Powers of 2

```
┌─────────────────────────────────────────────────────────────────────┐
│              POWERS OF 2 REFERENCE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  MEMORY & STORAGE:                                                   │
│  ─────────────────                                                  │
│                                                                      │
│  2^10 = 1,024           ≈ 1 Thousand     = 1 KB (Kilobyte)         │
│  2^20 = 1,048,576       ≈ 1 Million      = 1 MB (Megabyte)         │
│  2^30 = 1,073,741,824   ≈ 1 Billion      = 1 GB (Gigabyte)         │
│  2^40 = ~1 Trillion                      = 1 TB (Terabyte)         │
│  2^50 = ~1 Quadrillion                   = 1 PB (Petabyte)         │
│  2^60 = ~1 Quintillion                   = 1 EB (Exabyte)          │
│                                                                      │
│  QUICK MENTAL MATH:                                                  │
│  ──────────────────                                                 │
│                                                                      │
│  • 1 KB ≈ 1 thousand bytes                                         │
│  • 1 MB ≈ 1 million bytes                                          │
│  • 1 GB ≈ 1 billion bytes                                          │
│  • 1 TB ≈ 1 trillion bytes                                         │
│                                                                      │
│  USEFUL APPROXIMATIONS:                                              │
│  ──────────────────────                                             │
│                                                                      │
│  • 2^10 ≈ 10^3 (1,000)                                             │
│  • 2^20 ≈ 10^6 (1,000,000)                                         │
│  • 2^30 ≈ 10^9 (1,000,000,000)                                     │
│                                                                      │
│  So: 2^32 ≈ 4 × 10^9 ≈ 4 billion (max 32-bit integer)             │
│      2^64 ≈ 1.8 × 10^19 (max 64-bit integer)                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Time Conversions

```
┌─────────────────────────────────────────────────────────────────────┐
│              TIME REFERENCE                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SECONDS IN DIFFERENT PERIODS:                                      │
│  ─────────────────────────────                                      │
│                                                                      │
│  1 minute      = 60 seconds                                        │
│  1 hour        = 3,600 seconds       ≈ 3.6 × 10^3                  │
│  1 day         = 86,400 seconds      ≈ 10^5 (actually 8.64×10^4)   │
│  1 week        = 604,800 seconds     ≈ 6 × 10^5                    │
│  1 month       = 2,592,000 seconds   ≈ 2.5 × 10^6                  │
│  1 year        = 31,536,000 seconds  ≈ 3 × 10^7                    │
│                                                                      │
│  QUICK APPROXIMATIONS:                                               │
│  ─────────────────────                                              │
│                                                                      │
│  • 1 day ≈ 100,000 seconds (actually 86,400)                       │
│  • 1 month ≈ 2.5 million seconds                                   │
│  • 1 year ≈ 30 million seconds                                     │
│                                                                      │
│  QPS CONVERSIONS:                                                    │
│  ────────────────                                                   │
│                                                                      │
│  Daily requests to QPS:                                             │
│  QPS = Daily Requests / 86,400 ≈ Daily / 100,000                   │
│                                                                      │
│  Examples:                                                          │
│  • 1 million/day = 1M / 100K ≈ 10 QPS                              │
│  • 100 million/day = 100M / 100K ≈ 1,000 QPS                       │
│  • 1 billion/day = 1B / 100K ≈ 10,000 QPS                          │
│                                                                      │
│  Monthly to Daily:                                                  │
│  • Monthly / 30 ≈ Daily                                            │
│  • 300 million/month = 10 million/day ≈ 100 QPS                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Latency Numbers

```
┌─────────────────────────────────────────────────────────────────────┐
│              LATENCY NUMBERS EVERY ENGINEER SHOULD KNOW             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  OPERATION                               │ LATENCY     │ NOTES     │
│  ────────────────────────────────────────│─────────────│───────────│
│  L1 cache reference                      │ 0.5 ns      │           │
│  Branch mispredict                       │ 5 ns        │           │
│  L2 cache reference                      │ 7 ns        │           │
│  Mutex lock/unlock                       │ 25 ns       │           │
│  Main memory reference                   │ 100 ns      │           │
│  Compress 1KB with Zippy                 │ 3 μs        │           │
│  Send 1KB over 1 Gbps network            │ 10 μs       │           │
│  Read 4KB randomly from SSD              │ 150 μs      │           │
│  Read 1MB sequentially from memory       │ 250 μs      │           │
│  Round trip within same datacenter       │ 500 μs      │ 0.5 ms    │
│  Read 1MB sequentially from SSD          │ 1 ms        │           │
│  Disk seek                               │ 10 ms       │           │
│  Read 1MB sequentially from disk         │ 20 ms       │           │
│  Send packet CA → Netherlands → CA       │ 150 ms      │           │
│                                                                      │
│  VISUAL SCALE:                                                       │
│  ─────────────                                                      │
│                                                                      │
│  1 ns ──────────────────────────────────────────────────── 1 second│
│  │                                                               │  │
│  │ L1 cache (0.5 ns)                                            │  │
│  │ L2 cache (7 ns)                                              │  │
│  │ RAM (100 ns)                                                  │  │
│  │                                                               │  │
│  1 μs ──────────────────────────────────────────────────── 1 second│
│  │                                                               │  │
│  │ Network 1KB (10 μs)                                          │  │
│  │ SSD random read (150 μs)                                     │  │
│  │ Same DC round trip (500 μs)                                  │  │
│  │                                                               │  │
│  1 ms ──────────────────────────────────────────────────── 1 second│
│  │                                                               │  │
│  │ SSD 1MB read (1 ms)                                          │  │
│  │ HDD seek (10 ms)                                             │  │
│  │ Cross-continent (150 ms)                                     │  │
│                                                                      │
│  KEY TAKEAWAYS:                                                      │
│  ───────────────                                                    │
│  • Memory is ~100x faster than SSD                                 │
│  • SSD is ~100x faster than HDD                                    │
│  • Same datacenter is ~100x faster than cross-continent           │
│  • Caching can make things 1000x faster                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Common Data Sizes

```
┌─────────────────────────────────────────────────────────────────────┐
│              COMMON DATA SIZE REFERENCE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TEXT:                                                               │
│  ─────                                                              │
│  • 1 character (ASCII)      = 1 byte                               │
│  • 1 character (UTF-8 avg)  = 1.5 bytes                            │
│  • 1 word                   = 5-6 bytes                            │
│  • 1 sentence               = 50-100 bytes                         │
│  • 1 tweet (280 chars)      = 280-560 bytes                        │
│  • 1 page of text           = 2 KB                                 │
│  • 1 book (avg)             = 1 MB                                 │
│                                                                      │
│  IDENTIFIERS:                                                        │
│  ─────────────                                                      │
│  • Integer ID (32-bit)      = 4 bytes                              │
│  • Integer ID (64-bit)      = 8 bytes                              │
│  • UUID                     = 16 bytes (binary) or 36 bytes (string)│
│  • Timestamp (epoch)        = 4-8 bytes                            │
│  • IP address (v4)          = 4 bytes                              │
│  • IP address (v6)          = 16 bytes                             │
│  • Email address            = 30-50 bytes                          │
│  • URL                      = 100-500 bytes (avg 200)              │
│                                                                      │
│  IMAGES:                                                             │
│  ────────                                                           │
│  • Thumbnail (100×100 px)   = 10-20 KB                             │
│  • Profile pic (200×200)    = 30-50 KB                             │
│  • Social media image       = 200 KB - 1 MB                        │
│  • High-res photo           = 2-10 MB                              │
│  • RAW photo                = 20-50 MB                             │
│                                                                      │
│  VIDEO:                                                              │
│  ──────                                                             │
│  • 480p video               = 0.5 GB/hour                          │
│  • 720p video               = 1 GB/hour                            │
│  • 1080p video              = 2-3 GB/hour                          │
│  • 4K video                 = 7-10 GB/hour                         │
│                                                                      │
│  AUDIO:                                                              │
│  ──────                                                             │
│  • MP3 (128 kbps)           = 1 MB/minute                          │
│  • High quality audio       = 3-5 MB/minute                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 3️⃣ Estimation Framework
## ────────────────────────────────────

### The 5-Step Estimation Process

```
┌─────────────────────────────────────────────────────────────────────┐
│              ESTIMATION FRAMEWORK                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: CLARIFY REQUIREMENTS                                       │
│  ─────────────────────────────                                      │
│  • What are we building?                                           │
│  • Who are the users?                                              │
│  • What's the expected scale?                                      │
│  • What are the key features?                                      │
│                                                                      │
│  STEP 2: ESTIMATE USER BASE                                         │
│  ───────────────────────────                                        │
│  • Total users                                                      │
│  • Daily Active Users (DAU)                                        │
│  • Peak concurrent users                                           │
│                                                                      │
│  STEP 3: ESTIMATE TRAFFIC                                           │
│  ─────────────────────────                                          │
│  • Actions per user per day                                        │
│  • Daily requests = DAU × actions                                  │
│  • QPS = daily requests / 86,400                                   │
│  • Peak QPS = QPS × peak factor (usually 2-10x)                   │
│                                                                      │
│  STEP 4: ESTIMATE STORAGE                                           │
│  ─────────────────────────                                          │
│  • Size per record/object                                          │
│  • Daily data created = DAU × actions × size                       │
│  • Total storage = daily × retention days                          │
│  • Add overhead (indexes, replicas)                                │
│                                                                      │
│  STEP 5: ESTIMATE BANDWIDTH                                         │
│  ───────────────────────────                                        │
│  • Request size (ingress)                                          │
│  • Response size (egress)                                          │
│  • Bandwidth = QPS × size                                          │
│                                                                      │
│  THEN: SIZE INFRASTRUCTURE                                          │
│  ──────────────────────────                                         │
│  • Servers needed = Peak QPS / QPS per server                     │
│  • Storage = Total data / disk per server                         │
│  • Memory = Working set size                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Quick Estimation Formulas

```
┌─────────────────────────────────────────────────────────────────────┐
│              QUICK FORMULAS                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  QPS (QUERIES PER SECOND):                                          │
│  ──────────────────────────                                         │
│                                                                      │
│  Average QPS = Daily requests / 100,000                            │
│  Peak QPS = Average QPS × 3 (for spiky traffic)                   │
│  Peak QPS = Average QPS × 5 (for very spiky traffic)              │
│                                                                      │
│  Example:                                                           │
│  500M daily requests → 500M / 100K = 5,000 QPS average            │
│  Peak (3x): 15,000 QPS                                             │
│                                                                      │
│  STORAGE:                                                            │
│  ────────                                                           │
│                                                                      │
│  Daily Storage = DAU × actions × object size                       │
│  Monthly = Daily × 30                                              │
│  Yearly = Daily × 365                                              │
│  With replication = Total × 3                                      │
│                                                                      │
│  Example:                                                           │
│  100M DAU × 5 posts × 1 KB = 500 GB/day                           │
│  Yearly: 500 GB × 365 = 182 TB                                     │
│  With 3x replication: 546 TB                                       │
│                                                                      │
│  BANDWIDTH:                                                          │
│  ──────────                                                         │
│                                                                      │
│  Bandwidth = QPS × response size × 8 bits                          │
│                                                                      │
│  Example:                                                           │
│  5,000 QPS × 100 KB × 8 = 4 Gbps                                   │
│                                                                      │
│  SERVERS:                                                            │
│  ────────                                                           │
│                                                                      │
│  Servers needed = Peak QPS / (QPS per server × 0.7)               │
│  (0.7 for headroom - don't run at 100%)                           │
│                                                                      │
│  Example:                                                           │
│  15,000 QPS / (1,000 QPS per server × 0.7) = 21.4 → 22 servers    │
│                                                                      │
│  CACHE HIT RATE IMPACT:                                              │
│  ──────────────────────                                             │
│                                                                      │
│  DB load = Total QPS × (1 - cache hit rate)                        │
│                                                                      │
│  Example:                                                           │
│  15,000 QPS with 90% cache = 15,000 × 0.1 = 1,500 QPS to DB       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 4️⃣ Complete Worked Examples
## ────────────────────────────────────

### Example 1: Twitter-like Social Media

```
┌─────────────────────────────────────────────────────────────────────┐
│              TWITTER ESTIMATION                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  REQUIREMENTS:                                                       │
│  ─────────────                                                      │
│  • Users can post tweets (text, up to 280 chars)                   │
│  • Users can follow other users                                    │
│  • Users can view a home timeline                                  │
│  • 500M total users, 200M DAU                                      │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 1: TRAFFIC ESTIMATION                                         │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  Write traffic (tweets):                                           │
│  • 10% of users tweet daily = 20M tweets/day                      │
│  • Average 2 tweets per active tweeter = 40M tweets/day            │
│  • QPS: 40M / 100K = 400 QPS                                       │
│                                                                      │
│  Read traffic (timeline views):                                    │
│  • Each DAU views timeline 10 times/day = 2B views/day             │
│  • QPS: 2B / 100K = 20,000 QPS                                     │
│  • Peak (3x): 60,000 QPS                                           │
│                                                                      │
│  Read/Write ratio: 20,000 / 400 = 50:1 (read-heavy)               │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 2: STORAGE ESTIMATION                                         │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  Tweet storage:                                                     │
│  • Tweet ID: 8 bytes                                               │
│  • User ID: 8 bytes                                                │
│  • Content: 280 bytes (worst case)                                 │
│  • Timestamp: 8 bytes                                              │
│  • Metadata: 50 bytes                                              │
│  • Total: ~350 bytes per tweet                                     │
│                                                                      │
│  Daily: 40M tweets × 350 bytes = 14 GB/day                        │
│  Yearly: 14 GB × 365 = 5.1 TB/year                                │
│  5-year retention: 25.5 TB                                         │
│  With 3x replication: 76.5 TB                                      │
│                                                                      │
│  User storage:                                                      │
│  • 500M users × 1 KB/user = 500 GB                                │
│                                                                      │
│  Follow relationships:                                              │
│  • Average 200 follows per user                                    │
│  • 500M × 200 × 16 bytes = 1.6 TB                                 │
│                                                                      │
│  TOTAL STORAGE: ~80 TB (manageable with few database servers)     │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 3: BANDWIDTH ESTIMATION                                       │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  Ingress (tweets):                                                  │
│  400 QPS × 500 bytes = 200 KB/s = 1.6 Mbps (negligible)           │
│                                                                      │
│  Egress (timeline):                                                 │
│  • Timeline: 20 tweets × 350 bytes = 7 KB                         │
│  • 60,000 QPS × 7 KB = 420 MB/s = 3.4 Gbps peak                   │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 4: SERVER ESTIMATION                                          │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  API servers:                                                       │
│  • 60,000 peak QPS                                                 │
│  • ~5,000 QPS per server (typical web server)                     │
│  • 60,000 / 5,000 = 12 servers minimum                            │
│  • With 50% headroom: 18 servers                                  │
│                                                                      │
│  Database:                                                          │
│  • 80 TB storage across cluster                                    │
│  • 10 TB per node typical                                          │
│  • 8 primary nodes + 16 replicas = 24 DB nodes                    │
│                                                                      │
│  Cache:                                                             │
│  • Timeline cache: 200M DAU × 7 KB timeline = 1.4 TB              │
│  • With hot data (20% of users): 280 GB                           │
│  • Redis nodes: 5-10 × 64 GB instances                            │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  SUMMARY:                                                            │
│  ════════════════════════════════════════════════════════════════  │
│  • ~18 API servers                                                 │
│  • ~24 database nodes (80 TB)                                      │
│  • ~10 cache nodes (280 GB hot data)                              │
│  • ~3.5 Gbps peak bandwidth                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Example 2: URL Shortener

```
┌─────────────────────────────────────────────────────────────────────┐
│              URL SHORTENER ESTIMATION                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  REQUIREMENTS:                                                       │
│  ─────────────                                                      │
│  • Shorten URLs (write)                                            │
│  • Redirect short URLs to long URLs (read)                         │
│  • 100M new URLs per month                                         │
│  • Read/Write ratio: 100:1                                         │
│  • Retention: 5 years                                              │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 1: TRAFFIC ESTIMATION                                         │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  Write (URL creation):                                             │
│  • 100M/month = 100M / 30 / 86,400 ≈ 40 QPS                       │
│                                                                      │
│  Read (redirects):                                                  │
│  • 100:1 ratio = 40 × 100 = 4,000 QPS                             │
│  • Peak (5x): 20,000 QPS                                           │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 2: STORAGE ESTIMATION                                         │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  URL record:                                                        │
│  • Short code: 7 bytes                                             │
│  • Long URL: 500 bytes (average)                                   │
│  • User ID: 8 bytes                                                │
│  • Created: 8 bytes                                                │
│  • Total: ~523 bytes ≈ 500 bytes                                  │
│                                                                      │
│  5 years of URLs:                                                  │
│  • 100M/month × 12 × 5 = 6 billion URLs                           │
│  • 6B × 500 bytes = 3 TB                                          │
│  • With indexes (2x): 6 TB                                         │
│  • With replication (3x): 18 TB                                    │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 3: SHORT CODE LENGTH                                          │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  How many unique codes do we need?                                 │
│  • 6 billion URLs over 5 years                                     │
│  • Need at least 6B unique codes                                   │
│                                                                      │
│  Using base62 (a-z, A-Z, 0-9):                                     │
│  • 62^6 = 56.8 billion (enough!)                                  │
│  • 62^7 = 3.5 trillion (very safe)                                │
│                                                                      │
│  → Use 7 character codes (3.5T possible)                          │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 4: CACHE SIZING                                               │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  80/20 rule: 20% of URLs get 80% of traffic                       │
│                                                                      │
│  Cache size:                                                        │
│  • 6B URLs × 20% = 1.2B URLs in cache                             │
│  • 1.2B × 500 bytes = 600 GB                                      │
│                                                                      │
│  With 99% cache hit rate:                                          │
│  • DB load: 20,000 QPS × 1% = 200 QPS (easily handled)            │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  SUMMARY:                                                            │
│  ════════════════════════════════════════════════════════════════  │
│  • Write: 40 QPS, Read: 20,000 QPS peak                           │
│  • Storage: 18 TB (with replication)                               │
│  • Cache: 600 GB (for 20% hot URLs)                               │
│  • Short code: 7 characters (base62)                              │
│  • This is a small system! Few servers needed.                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Example 3: Video Streaming Service

```
┌─────────────────────────────────────────────────────────────────────┐
│              VIDEO STREAMING ESTIMATION                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  REQUIREMENTS:                                                       │
│  ─────────────                                                      │
│  • 100M DAU                                                        │
│  • 2 hours average watch time per user per day                     │
│  • Multiple quality levels (480p, 720p, 1080p, 4K)                │
│  • 50,000 videos in catalog                                        │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 1: CONCURRENT USERS                                           │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  Peak viewing (prime time, 7-11 PM):                               │
│  • 60% of daily viewing in 4 hours                                 │
│  • Total daily viewing: 100M × 2 hrs = 200M hours                 │
│  • Peak window: 200M × 0.6 / 4 hrs = 30M concurrent users         │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 2: BANDWIDTH ESTIMATION                                       │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  Bitrates:                                                          │
│  • 480p: 1 Mbps                                                    │
│  • 720p: 3 Mbps                                                    │
│  • 1080p: 5 Mbps                                                   │
│  • 4K: 15 Mbps                                                     │
│                                                                      │
│  Quality distribution:                                              │
│  • 480p: 20% → 0.2 × 1 = 0.2 Mbps                                 │
│  • 720p: 40% → 0.4 × 3 = 1.2 Mbps                                 │
│  • 1080p: 30% → 0.3 × 5 = 1.5 Mbps                                │
│  • 4K: 10% → 0.1 × 15 = 1.5 Mbps                                  │
│  • Average: 4.4 Mbps per user                                      │
│                                                                      │
│  Peak bandwidth:                                                    │
│  • 30M concurrent × 4.4 Mbps = 132 Tbps                           │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 3: STORAGE ESTIMATION                                         │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  Content storage:                                                   │
│  • 50,000 videos                                                   │
│  • Average length: 1.5 hours                                       │
│  • Multiple qualities + multiple languages                         │
│                                                                      │
│  Per video (all qualities):                                        │
│  • 480p: 1.5 hr × 0.5 GB/hr = 0.75 GB                             │
│  • 720p: 1.5 hr × 1 GB/hr = 1.5 GB                                │
│  • 1080p: 1.5 hr × 2.5 GB/hr = 3.75 GB                            │
│  • 4K: 1.5 hr × 7 GB/hr = 10.5 GB                                 │
│  • Total per video: ~16.5 GB                                       │
│                                                                      │
│  Total catalog:                                                     │
│  • 50,000 × 16.5 GB = 825 TB ≈ 1 PB                              │
│                                                                      │
│  With 3 regions (replication):                                     │
│  • 3 PB total storage                                              │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  STEP 4: CDN REQUIREMENTS                                           │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  CDN cache:                                                         │
│  • Top 20% of content = 80% of views                              │
│  • 10,000 videos × 16.5 GB = 165 TB at edge                       │
│  • Distributed across 100 PoPs = 1.65 TB per PoP                  │
│                                                                      │
│  Cache hit rate: 95%+                                              │
│  • CDN bandwidth: 132 Tbps × 0.95 = 125 Tbps (distributed)        │
│  • Origin bandwidth: 132 Tbps × 0.05 = 6.6 Tbps                   │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  SUMMARY:                                                            │
│  ════════════════════════════════════════════════════════════════  │
│  • 30M concurrent users at peak                                    │
│  • 132 Tbps peak bandwidth (CDN-served)                            │
│  • 3 PB storage (across regions)                                   │
│  • 165 TB CDN cache (hot content)                                  │
│  • This is a MASSIVE system - hundreds of servers                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 5️⃣ Common Estimation Pitfalls
## ────────────────────────────────────

### Mistakes to Avoid

```
┌─────────────────────────────────────────────────────────────────────┐
│              COMMON ESTIMATION MISTAKES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. FORGETTING PEAK VS AVERAGE                                      │
│  ─────────────────────────────                                      │
│  ✗ Wrong: "100M requests/day = 1,157 QPS, need 1 server"          │
│  ✓ Right: "1,157 avg QPS, 5,000 peak QPS, need 5+ servers"        │
│                                                                      │
│  2. IGNORING REPLICATION                                            │
│  ───────────────────────                                            │
│  ✗ Wrong: "10 TB storage needed"                                   │
│  ✓ Right: "10 TB × 3 replicas = 30 TB needed"                     │
│                                                                      │
│  3. FORGETTING INDEXES & OVERHEAD                                   │
│  ─────────────────────────────                                      │
│  ✗ Wrong: "1 billion rows × 100 bytes = 100 GB"                   │
│  ✓ Right: "100 GB data + 50 GB indexes + 30% overhead = 200 GB"   │
│                                                                      │
│  4. MIXING BITS AND BYTES                                           │
│  ─────────────────────────                                          │
│  ✗ Wrong: "1 Gbps network = 1 GB/second transfer"                 │
│  ✓ Right: "1 Gbps = 125 MB/second (8 bits = 1 byte)"              │
│                                                                      │
│  5. UNDERESTIMATING GROWTH                                          │
│  ──────────────────────────                                         │
│  ✗ Wrong: "We need 10 servers today"                               │
│  ✓ Right: "10 servers today, but 20% growth = 25 servers in 1 yr"  │
│                                                                      │
│  6. IGNORING THE CACHE                                              │
│  ─────────────────────                                              │
│  ✗ Wrong: "10,000 QPS to database"                                 │
│  ✓ Right: "10,000 QPS total, 90% cache hit = 1,000 QPS to DB"     │
│                                                                      │
│  7. FORGETTING METADATA                                             │
│  ─────────────────────                                              │
│  ✗ Wrong: "1M images × 100 KB = 100 GB"                           │
│  ✓ Right: "100 GB images + metadata DB + thumbnails = 150 GB"     │
│                                                                      │
│  8. ASSUMING UNIFORM DISTRIBUTION                                   │
│  ─────────────────────────────                                      │
│  ✗ Wrong: "100K users, each creates 10 posts"                      │
│  ✓ Right: "1% of users create 50% of content (power law)"         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 6️⃣ Cheat Sheet for Interviews
## ────────────────────────────────────

### Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│              INTERVIEW CHEAT SHEET                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TIME CONVERSIONS:                                                   │
│  1 day ≈ 100,000 seconds                                           │
│  1 month ≈ 2.5 million seconds                                     │
│  1 year ≈ 30 million seconds                                       │
│                                                                      │
│  QPS FORMULA:                                                        │
│  Average QPS = Daily requests / 100,000                            │
│  Peak QPS = Average × 3-5                                          │
│                                                                      │
│  STORAGE:                                                            │
│  1 million × 1 KB = 1 GB                                           │
│  1 billion × 1 KB = 1 TB                                           │
│  1 million × 1 MB = 1 TB                                           │
│                                                                      │
│  TYPICAL SIZES:                                                      │
│  • Tweet/Short text: 300-500 bytes                                 │
│  • JSON record: 1-5 KB                                             │
│  • Image: 200 KB - 2 MB                                            │
│  • 1 min video: 50-300 MB                                          │
│                                                                      │
│  SERVER CAPACITY:                                                    │
│  • Web server: 1,000-10,000 QPS                                    │
│  • Database server: 5,000-10,000 QPS (simple queries)              │
│  • Cache (Redis): 50,000-100,000 QPS                               │
│                                                                      │
│  BANDWIDTH:                                                          │
│  • 1 Gbps = 125 MB/second                                          │
│  • 10 Gbps = 1.25 GB/second                                        │
│                                                                      │
│  LATENCY:                                                            │
│  • Same datacenter: 0.5 ms                                         │
│  • Cross-region: 50-100 ms                                         │
│  • Cross-continent: 150-300 ms                                     │
│                                                                      │
│  TYPICAL RATIOS:                                                     │
│  • Read/Write for social: 100:1                                    │
│  • Read/Write for e-commerce: 10:1                                 │
│  • Cache hit rate: 90-99%                                          │
│  • Peak/Average: 3-10x                                             │
│                                                                      │
│  BASE62 SHORT CODES:                                                 │
│  • 62^6 = 56 billion                                               │
│  • 62^7 = 3.5 trillion                                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Sample Calculation Template

```
┌─────────────────────────────────────────────────────────────────────┐
│              CALCULATION TEMPLATE                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  "Let me work through the numbers..."                               │
│                                                                      │
│  TRAFFIC:                                                            │
│  • Total users: ___ M                                              │
│  • DAU: ___ M (typically 20-50% of total)                         │
│  • Actions per user per day: ___                                   │
│  • Daily requests: ___ M                                           │
│  • Average QPS: ___ M / 100K = ___ QPS                            │
│  • Peak QPS: ___ × 3 = ___ QPS                                    │
│                                                                      │
│  STORAGE:                                                            │
│  • Size per record: ___ bytes                                      │
│  • Daily records: ___ M                                            │
│  • Daily storage: ___ M × ___ bytes = ___ GB                      │
│  • Yearly storage: ___ GB × 365 = ___ TB                          │
│  • With replication: ___ TB × 3 = ___ TB                          │
│                                                                      │
│  BANDWIDTH:                                                          │
│  • Response size: ___ KB                                           │
│  • Peak bandwidth: ___ QPS × ___ KB = ___ MB/s = ___ Gbps         │
│                                                                      │
│  SERVERS:                                                            │
│  • Capacity per server: ___ QPS                                    │
│  • Servers needed: ___ QPS / ___ = ___ servers                    │
│  • With headroom (1.5x): ___ servers                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 7️⃣ Practice Problems
## ────────────────────────────────────

### Problem 1: Instagram Stories
```
Design storage for Instagram Stories:
• 500M DAU
• 20% post stories daily
• Each story: 3 images or 1 video (10 sec)
• Stories expire after 24 hours

Calculate: Daily storage added, total active storage
```

### Problem 2: Uber Ride Matching
```
Estimate Uber's ride matching system:
• 20M rides per day globally
• Location update every 4 seconds
• Match must happen in < 30 seconds

Calculate: QPS for location updates, matching QPS
```

### Problem 3: Slack Messages
```
Estimate Slack's message system:
• 10M DAU
• Average 100 messages sent per user per day
• Message size: 500 bytes average

Calculate: QPS, daily storage, 1-year storage
```

### Problem 4: Google Maps Tiles
```
Estimate storage for map tiles:
• Cover entire world
• 20 zoom levels
• 256×256 pixel tiles, 100 KB average

Calculate: Total number of tiles, total storage
```

---

## ────────────────────────────────────
## 8️⃣ Summary: The Golden Rules
## ────────────────────────────────────

```
┌─────────────────────────────────────────────────────────────────────┐
│              GOLDEN RULES OF ESTIMATION                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. ROUND AGGRESSIVELY                                              │
│     86,400 → 100,000                                               │
│     Don't calculate 86,400 × 2.3 - use 100,000 × 2                 │
│                                                                      │
│  2. USE POWERS OF 10                                                │
│     1 million, 1 billion, 1 trillion                               │
│     Makes mental math much easier                                  │
│                                                                      │
│  3. ALWAYS CONSIDER PEAK                                            │
│     Average × 3 for most systems                                   │
│     Average × 10 for spiky systems                                 │
│                                                                      │
│  4. DON'T FORGET REPLICATION                                        │
│     Storage × 3 for databases                                      │
│     Storage × 2-3 for distributed storage                          │
│                                                                      │
│  5. CACHE IS YOUR FRIEND                                            │
│     90% cache hit = 10x reduction in DB load                       │
│     Always estimate with caching                                   │
│                                                                      │
│  6. SANITY CHECK YOUR ANSWER                                        │
│     "Does 1 PB sound right for a startup?" (No!)                   │
│     "Does 10 servers sound right for Twitter?" (No!)               │
│                                                                      │
│  7. STATE YOUR ASSUMPTIONS                                          │
│     "Assuming 20% DAU rate..."                                     │
│     "If we cache 90% of requests..."                               │
│                                                                      │
│  8. SHOW YOUR WORK                                                  │
│     The process matters more than the exact answer                 │
│     Interviewers want to see how you think                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

**Congratulations!** You've completed Part 3: Traffic, Load & Capacity Estimation!

**Up Next**: Part 4 — Data Storage & Databases
