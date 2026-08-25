# 22. Storage Estimation

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Storage Estimation** is the process of calculating how much disk space your system needs to store data over time.

### What It Is
Storage estimation involves predicting:
- **Current storage needs**: How much data exists now
- **Growth rate**: How fast data accumulates
- **Retention period**: How long data must be kept
- **Redundancy factor**: Extra storage for replication/backups

### Why It Exists
You need storage estimation to:
- **Budget hardware/cloud costs** accurately
- **Prevent outages** from running out of disk space
- **Plan data lifecycle** (archival, deletion policies)
- **Choose appropriate storage systems** (SSD vs HDD, object storage vs databases)

### The Problem It Solves
Without proper estimation, you face:
- **Under-provisioning**: System crashes when storage fills up
- **Over-provisioning**: Wasting money on unused capacity
- **Wrong storage tier**: Using expensive SSDs when cheap object storage would work

### Where and When It's Used
- **System design interviews**: Always estimate storage
- **Capacity planning**: Quarterly/annual planning cycles
- **Architecture decisions**: Database vs object store vs data warehouse
- **Cost optimization**: Right-sizing storage tiers

### Its Role in Large-Scale Distributed Systems
At FAANG scale:
- **YouTube**: 500+ hours of video uploaded every minute
- **Facebook**: 350+ million photos uploaded daily
- **Instagram**: 95+ million posts daily
- **Twitter**: 500+ million tweets daily

Storage is often the **largest infrastructure cost** after compute.

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Storage Estimation Formula

```
┌─────────────────────────────────────────────────────────────────────┐
│              MASTER STORAGE FORMULA                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Total Storage = (Data Size × Daily Volume × Retention Days)      │
│                   × Replication Factor                              │
│                   × Overhead Factor                                 │
│                                                                      │
│   COMPONENTS:                                                        │
│   ───────────                                                       │
│   Data Size: Average size per record/file (bytes)                  │
│   Daily Volume: Number of records/files created per day            │
│   Retention Days: How long data must be kept                       │
│   Replication Factor: Copies for redundancy (typically 3)          │
│   Overhead Factor: Indexes, metadata, filesystem overhead (~20-30%)│
│                                                                      │
│   EXAMPLE:                                                           │
│   ─────────                                                         │
│   • Average tweet: 500 bytes (with metadata)                       │
│   • Daily tweets: 500 million                                      │
│   • Retention: 5 years (1,825 days)                                │
│   • Replication: 3                                                  │
│   • Overhead: 1.25                                                  │
│                                                                      │
│   Storage = 500 bytes × 500M × 1,825 × 3 × 1.25                    │
│           = 1.71 PB (petabytes)                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Types of Data and Their Storage Characteristics

```
┌─────────────────────────────────────────────────────────────────────┐
│              DATA TYPES AND STORAGE NEEDS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. STRUCTURED DATA (Databases)                                     │
│  ───────────────────────────────                                    │
│  Examples: User profiles, transactions, orders                     │
│  Size: Small per record (100 bytes - 10 KB)                        │
│  Volume: High number of records                                    │
│  Storage: Relational DB (PostgreSQL, MySQL)                        │
│  Typical overhead: 2-3x raw data (indexes, MVCC)                  │
│                                                                      │
│  2. SEMI-STRUCTURED DATA (Documents)                                │
│  ───────────────────────────────────                                │
│  Examples: JSON logs, product catalogs, user activity             │
│  Size: Medium (1 KB - 100 KB per document)                        │
│  Volume: High                                                       │
│  Storage: Document DB (MongoDB), Elasticsearch                     │
│  Typical overhead: 1.5-2x raw data                                 │
│                                                                      │
│  3. UNSTRUCTURED DATA (Blobs)                                       │
│  ────────────────────────────                                       │
│  Examples: Images, videos, files                                   │
│  Size: Large (1 MB - 10 GB per file)                              │
│  Volume: Depends on use case                                       │
│  Storage: Object storage (S3, GCS, Azure Blob)                    │
│  Typical overhead: 1.1x (minimal metadata)                        │
│                                                                      │
│  4. TIME-SERIES DATA (Metrics/Events)                              │
│  ─────────────────────────────────────                              │
│  Examples: Server metrics, IoT data, analytics events             │
│  Size: Tiny per point (50-200 bytes)                              │
│  Volume: Extremely high (millions per second)                     │
│  Storage: Time-series DB (InfluxDB, TimescaleDB)                  │
│  Compression: 10-20x (highly compressible)                        │
│                                                                      │
│  5. LOGS                                                             │
│  ──────                                                             │
│  Examples: Application logs, access logs, audit trails            │
│  Size: Variable (100 bytes - 5 KB per line)                       │
│  Volume: Extremely high                                            │
│  Storage: Log aggregation (ELK, Splunk) or object storage         │
│  Compression: 5-10x                                                │
│  Retention: Often short (30-90 days active, archive longer)       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Growth Patterns

```
┌─────────────────────────────────────────────────────────────────────┐
│              GROWTH PATTERNS                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. LINEAR GROWTH                                                    │
│  ─────────────────                                                  │
│  Pattern: Constant daily additions                                 │
│  Example: Order history, transaction logs                          │
│                                                                      │
│  Storage                                                            │
│  ▲                                                                  │
│  │                                        ╱                         │
│  │                                      ╱                           │
│  │                                    ╱                             │
│  │                                  ╱                               │
│  │                                ╱                                 │
│  │                              ╱                                   │
│  │                            ╱                                     │
│  │                          ╱                                       │
│  │                        ╱                                         │
│  │                      ╱                                           │
│  │                    ╱                                             │
│  │                  ╱                                               │
│  │                ╱                                                 │
│  │              ╱                                                   │
│  │            ╱                                                     │
│  │          ╱                                                       │
│  │        ╱                                                         │
│  │      ╱                                                           │
│  │    ╱                                                             │
│  │  ╱                                                               │
│  │╱                                                                 │
│  └────────────────────────────────────────────▶ Time               │
│                                                                      │
│  Formula: Storage(t) = Initial + (Daily Rate × Days)               │
│                                                                      │
│  2. EXPONENTIAL GROWTH                                              │
│  ─────────────────────                                              │
│  Pattern: User base growing, each user adds data                   │
│  Example: User-generated content platforms                         │
│                                                                      │
│  Storage                                                            │
│  ▲                                                                  │
│  │                                              │                   │
│  │                                             ╱│                   │
│  │                                           ╱  │                   │
│  │                                         ╱    │                   │
│  │                                       ╱      │                   │
│  │                                     ╱        │                   │
│  │                                  ╱           │                   │
│  │                               ╱              │                   │
│  │                            ╱                 │                   │
│  │                        ╱                     │                   │
│  │                    ╱                         │                   │
│  │               ╱                              │                   │
│  │          ╱                                   │                   │
│  │     ╱                                        │                   │
│  │╱                                             │                   │
│  └────────────────────────────────────────────▶ Time               │
│                                                                      │
│  Formula: Storage(t) = Initial × (1 + Growth Rate)^Months          │
│                                                                      │
│  3. STEP GROWTH                                                      │
│  ───────────────                                                    │
│  Pattern: Growth tied to events (new features, markets)           │
│  Example: Adding video feature increases storage suddenly          │
│                                                                      │
│  Storage                                                            │
│  ▲                                                                  │
│  │                                    ┌─────────                    │
│  │                                    │                             │
│  │                        ┌───────────┘                             │
│  │                        │                                         │
│  │            ┌───────────┘                                         │
│  │            │                                                     │
│  │  ──────────┘                                                     │
│  │                                                                  │
│  └────────────────────────────────────────────▶ Time               │
│       Feature  Feature    Market                                    │
│       Launch   Launch     Expansion                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Tiers and Cost

```
┌─────────────────────────────────────────────────────────────────────┐
│              STORAGE TIER COMPARISON                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TIER              │ COST/GB/MO │ LATENCY    │ USE CASE             │
│  ──────────────────│────────────│────────────│──────────────────────│
│  NVMe SSD          │ $0.15-0.25 │ <1ms       │ Hot DB, cache        │
│  SSD (gp3/io2)     │ $0.08-0.12 │ 1-5ms      │ Primary DB           │
│  HDD (st1)         │ $0.025-0.04│ 5-20ms     │ Data warehouse       │
│  Object Storage    │ $0.02-0.03 │ 50-200ms   │ Files, backups       │
│  Infrequent Access │ $0.01-0.015│ 100-200ms  │ Older data           │
│  Archive (Glacier) │ $0.004     │ Hours      │ Compliance, archive  │
│  Deep Archive      │ $0.001     │ 12+ hours  │ Long-term retention  │
│                                                                      │
│  DATA LIFECYCLE STRATEGY:                                            │
│  ─────────────────────────                                          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │   HOT DATA (0-30 days)                                      │  │
│  │   • Active user data, recent orders                         │  │
│  │   • SSD storage                                             │  │
│  │   • Full replication (3x)                                   │  │
│  │                    │                                        │  │
│  │                    ▼                                        │  │
│  │   WARM DATA (30-90 days)                                    │  │
│  │   • Recent history, reports                                 │  │
│  │   • HDD or Object Storage                                   │  │
│  │   • Reduced replication (2x)                                │  │
│  │                    │                                        │  │
│  │                    ▼                                        │  │
│  │   COLD DATA (90 days - 1 year)                              │  │
│  │   • Older data, rarely accessed                             │  │
│  │   • Infrequent Access storage                               │  │
│  │   • Single copy + backup                                    │  │
│  │                    │                                        │  │
│  │                    ▼                                        │  │
│  │   ARCHIVE DATA (1+ years)                                   │  │
│  │   • Compliance, legal hold                                  │  │
│  │   • Glacier Deep Archive                                    │  │
│  │   • Compressed, encrypted                                   │  │
│  │                    │                                        │  │
│  │                    ▼                                        │  │
│  │   DELETE (After retention period)                           │  │
│  │   • No longer needed                                        │  │
│  │   • Automatic deletion policies                             │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 3️⃣ System-Specific Storage Estimation
## ────────────────────────────────────

### Example: Social Media Platform (Instagram Clone)

```
┌─────────────────────────────────────────────────────────────────────┐
│              INSTAGRAM CLONE STORAGE ESTIMATION                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ASSUMPTIONS:                                                        │
│  ─────────────                                                      │
│  • 500 million active users                                        │
│  • 50% post at least once per month                                │
│  • Average 2 posts per active poster per month                     │
│  • Each post: 1 image + metadata                                   │
│  • Data retention: Forever (never delete posts)                    │
│                                                                      │
│  1. IMAGE STORAGE                                                    │
│  ─────────────────                                                  │
│                                                                      │
│  Images per day:                                                    │
│  = 500M × 50% × 2 posts/month ÷ 30 days                            │
│  = 16.7 million images/day                                         │
│                                                                      │
│  Image size (with multiple resolutions):                           │
│  • Original: 2 MB                                                  │
│  • Large (1080p): 500 KB                                           │
│  • Medium (640p): 200 KB                                           │
│  • Thumbnail (150p): 20 KB                                         │
│  • Total per image: ~2.7 MB                                        │
│                                                                      │
│  Daily image storage:                                               │
│  = 16.7M × 2.7 MB = 45 TB/day                                      │
│                                                                      │
│  Annual image storage:                                              │
│  = 45 TB × 365 = 16.4 PB/year                                      │
│                                                                      │
│  2. METADATA STORAGE (Database)                                     │
│  ─────────────────────────────                                      │
│                                                                      │
│  Post metadata per post:                                           │
│  • Post ID: 8 bytes                                                │
│  • User ID: 8 bytes                                                │
│  • Caption: 500 bytes (avg)                                        │
│  • Timestamp: 8 bytes                                              │
│  • Location: 50 bytes                                              │
│  • Image URLs: 200 bytes                                           │
│  • Hashtags: 100 bytes                                             │
│  • Like/comment counts: 16 bytes                                   │
│  • Total: ~900 bytes per post                                      │
│                                                                      │
│  Daily metadata:                                                    │
│  = 16.7M × 900 bytes = 15 GB/day                                   │
│                                                                      │
│  Annual metadata:                                                   │
│  = 15 GB × 365 = 5.5 TB/year                                       │
│                                                                      │
│  With DB overhead (2.5x):                                          │
│  = 5.5 TB × 2.5 = 13.75 TB/year                                    │
│                                                                      │
│  With replication (3x):                                            │
│  = 13.75 TB × 3 = 41 TB/year                                       │
│                                                                      │
│  3. USER DATA                                                        │
│  ─────────────                                                      │
│                                                                      │
│  Per user:                                                          │
│  • Profile: 2 KB                                                   │
│  • Settings: 1 KB                                                  │
│  • Following list: 500 follows × 8 bytes = 4 KB                   │
│  • Total: ~7 KB per user                                           │
│                                                                      │
│  Total users: 500M × 7 KB = 3.5 TB                                 │
│  With overhead + replication: 3.5 TB × 2.5 × 3 = 26 TB            │
│                                                                      │
│  4. COMMENTS & LIKES                                                 │
│  ────────────────────                                               │
│                                                                      │
│  Average 50 likes per post:                                        │
│  = 16.7M × 50 × 16 bytes = 13.4 GB/day                            │
│                                                                      │
│  Average 5 comments per post:                                      │
│  = 16.7M × 5 × 300 bytes = 25 GB/day                               │
│                                                                      │
│  Annual: (13.4 + 25) × 365 × 3 (replication) = 42 TB/year         │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  SUMMARY - YEAR 1:                                                  │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  │ Data Type       │ Raw/Year │ With Overhead │ With Replication │ │
│  │─────────────────│──────────│───────────────│──────────────────│ │
│  │ Images (S3)     │ 16.4 PB  │ N/A           │ 16.4 PB (2x)    │ │
│  │ Post metadata   │ 5.5 TB   │ 13.75 TB      │ 41 TB           │ │
│  │ User data       │ 3.5 TB   │ 8.75 TB       │ 26 TB           │ │
│  │ Comments/Likes  │ 14 TB    │ 35 TB         │ 42 TB           │ │
│  │                 │          │               │                  │ │
│  │ TOTAL          │          │               │                  │ │
│  │ Object Storage │          │               │ ~33 PB          │ │
│  │ Database       │          │               │ ~110 TB         │ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Example: URL Shortener (Bit.ly Clone)

```
┌─────────────────────────────────────────────────────────────────────┐
│              URL SHORTENER STORAGE ESTIMATION                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ASSUMPTIONS:                                                        │
│  ─────────────                                                      │
│  • 500 million new URLs per month                                  │
│  • Retention: 5 years                                              │
│  • Read:Write ratio = 100:1                                        │
│                                                                      │
│  URL RECORD:                                                         │
│  ────────────                                                       │
│  • Short code: 7 bytes                                             │
│  • Original URL: 500 bytes (avg)                                   │
│  • User ID: 8 bytes                                                │
│  • Created timestamp: 8 bytes                                      │
│  • Expiry timestamp: 8 bytes                                       │
│  • Click count: 8 bytes                                            │
│  • Total: ~540 bytes per URL                                       │
│                                                                      │
│  STORAGE CALCULATION:                                                │
│  ────────────────────                                               │
│                                                                      │
│  URLs over 5 years:                                                 │
│  = 500M × 12 months × 5 years = 30 billion URLs                   │
│                                                                      │
│  Raw storage:                                                       │
│  = 30B × 540 bytes = 16.2 TB                                       │
│                                                                      │
│  With DB overhead (2x for indexes):                                │
│  = 16.2 TB × 2 = 32.4 TB                                           │
│                                                                      │
│  With replication (3x):                                            │
│  = 32.4 TB × 3 = 97.2 TB ≈ 100 TB                                  │
│                                                                      │
│  ANALYTICS DATA (Optional):                                         │
│  ──────────────────────────                                         │
│                                                                      │
│  Click event record:                                               │
│  • URL ID: 8 bytes                                                 │
│  • Timestamp: 8 bytes                                              │
│  • IP hash: 16 bytes                                               │
│  • Country: 2 bytes                                                │
│  • Referrer hash: 16 bytes                                         │
│  • Device type: 1 byte                                             │
│  • Total: ~50 bytes per click                                      │
│                                                                      │
│  Clicks per month (100:1 read ratio):                              │
│  = 500M URLs × 100 clicks/URL (lifetime) = 50B clicks/month       │
│  Actually, let's be more realistic:                                │
│  = Assume 10B clicks/month                                         │
│                                                                      │
│  Monthly click storage:                                            │
│  = 10B × 50 bytes = 500 GB/month                                   │
│                                                                      │
│  5-year click storage:                                             │
│  = 500 GB × 60 months = 30 TB                                      │
│                                                                      │
│  TOTAL: ~130 TB database storage                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Example: Chat Application (WhatsApp Clone)

```
┌─────────────────────────────────────────────────────────────────────┐
│              CHAT APP STORAGE ESTIMATION                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ASSUMPTIONS:                                                        │
│  ─────────────                                                      │
│  • 2 billion active users                                          │
│  • 100 billion messages per day                                    │
│  • 10% are media messages                                          │
│  • Retention: 30 days (server-side, E2E encrypted)                │
│                                                                      │
│  TEXT MESSAGES:                                                      │
│  ───────────────                                                    │
│  • Message size: 200 bytes (avg, encrypted)                        │
│  • Metadata: 100 bytes (sender, receiver, timestamp, status)      │
│  • Total per message: 300 bytes                                    │
│                                                                      │
│  Daily text messages: 90B × 300 bytes = 27 TB/day                  │
│  30-day retention: 27 TB × 30 = 810 TB                             │
│  With replication (3x): 2.43 PB                                    │
│                                                                      │
│  MEDIA MESSAGES:                                                     │
│  ────────────────                                                   │
│  • Images: 100 KB (compressed, encrypted)                          │
│  • Videos: 2 MB (compressed, encrypted)                            │
│  • Voice notes: 50 KB                                              │
│  • Assume 60% images, 30% videos, 10% voice                       │
│  • Average media size: 100×0.6 + 2000×0.3 + 50×0.1 = 665 KB       │
│                                                                      │
│  Daily media messages: 10B × 665 KB = 6.65 PB/day                  │
│  30-day retention: 6.65 PB × 30 = 200 PB                           │
│  With replication (2x for media): 400 PB                           │
│                                                                      │
│  USER DATA:                                                          │
│  ──────────                                                         │
│  • Profile: 5 KB (including profile picture)                       │
│  • Contacts/settings: 10 KB                                        │
│  • Per user: 15 KB                                                 │
│                                                                      │
│  Total: 2B × 15 KB = 30 TB                                         │
│  With replication: 90 TB                                           │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  SUMMARY:                                                            │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  • Text messages (30 days): 2.43 PB                                │
│  • Media (30 days): 400 PB                                         │
│  • User data: 90 TB                                                │
│  • Total: ~403 PB                                                  │
│                                                                      │
│  NOTE: This is why WhatsApp/Signal design for:                      │
│  • Client-side storage (messages stay on device)                   │
│  • Server just relays messages, minimal retention                  │
│  • E2E encryption means server can't deduplicate                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 4️⃣ Storage Optimization Techniques
## ────────────────────────────────────

### Compression

```
┌─────────────────────────────────────────────────────────────────────┐
│              COMPRESSION RATIOS BY DATA TYPE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DATA TYPE          │ ALGORITHM  │ RATIO │ CPU COST │ USE CASE     │
│  ───────────────────│────────────│───────│──────────│──────────────│
│  JSON/Text          │ gzip       │ 5-10x │ Medium   │ APIs, logs   │
│  JSON/Text          │ zstd       │ 6-12x │ Low      │ Storage      │
│  CSV/Columnar       │ Snappy     │ 2-4x  │ Very Low │ Analytics    │
│  Database pages     │ LZ4        │ 2-3x  │ Very Low │ DB storage   │
│  Images (lossy)     │ JPEG/WebP  │ 10-20x│ Medium   │ Photos       │
│  Images (lossless)  │ PNG        │ 2-3x  │ Low      │ Screenshots  │
│  Video              │ H.264/H.265│ 50-200x│ High    │ Streaming    │
│  Time-series        │ Gorilla    │ 10-20x│ Low      │ Metrics      │
│                                                                      │
│  COMPRESSION DECISION TREE:                                          │
│  ──────────────────────────                                         │
│                                                                      │
│  Is data already compressed (images, video)?                       │
│  ├── YES → Don't compress again (waste CPU, minimal gain)          │
│  └── NO → Continue                                                  │
│           │                                                         │
│           ▼                                                         │
│      Is read performance critical?                                  │
│      ├── YES → Use fast decompression (LZ4, Snappy)                │
│      └── NO → Use high ratio (zstd, gzip)                          │
│               │                                                     │
│               ▼                                                     │
│          Is data written once, read rarely?                        │
│          ├── YES → Maximum compression (zstd -19, brotli)          │
│          └── NO → Balanced (zstd -3, gzip -6)                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Deduplication

```
┌─────────────────────────────────────────────────────────────────────┐
│              DEDUPLICATION STRATEGIES                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. FILE-LEVEL DEDUPLICATION                                        │
│  ────────────────────────────                                       │
│  • Hash entire file (SHA-256)                                      │
│  • Store hash → file mapping                                       │
│  • Multiple references point to same file                          │
│  • Good for: Exact duplicates (same photo shared)                  │
│                                                                      │
│  Savings example (photo sharing):                                  │
│  • 100M photos uploaded                                            │
│  • 30% are duplicates (reshares)                                   │
│  • Savings: 30% storage reduction                                  │
│                                                                      │
│  2. BLOCK-LEVEL DEDUPLICATION                                       │
│  ─────────────────────────────                                      │
│  • Split files into fixed-size blocks (4KB-64KB)                  │
│  • Hash each block                                                 │
│  • Store unique blocks only                                        │
│  • Good for: Similar files, incremental backups                   │
│                                                                      │
│  3. CONTENT-AWARE DEDUPLICATION                                     │
│  ───────────────────────────────                                    │
│  • Understand data structure                                       │
│  • Deduplicate at semantic level                                   │
│  • Example: Same video in different qualities                      │
│  • Store base + deltas                                             │
│                                                                      │
│  IMPLEMENTATION:                                                     │
│  ───────────────                                                    │
│                                                                      │
│  def store_file(file_content):                                     │
│      file_hash = sha256(file_content)                              │
│                                                                      │
│      # Check if file already exists                                │
│      existing = lookup_by_hash(file_hash)                          │
│      if existing:                                                   │
│          # Dedupe: just create reference                           │
│          return create_reference(existing.id)                      │
│                                                                      │
│      # New file: store it                                          │
│      return store_new_file(file_content, file_hash)                │
│                                                                      │
│  SAVINGS ESTIMATE:                                                   │
│  ─────────────────                                                  │
│  • Cloud storage (mixed files): 20-40% savings                    │
│  • Backup storage: 60-80% savings                                  │
│  • Media (photos): 10-30% savings                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Tiering

```
┌─────────────────────────────────────────────────────────────────────┐
│              AUTOMATED DATA TIERING                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  S3 LIFECYCLE POLICY EXAMPLE:                                        │
│  ─────────────────────────────                                      │
│                                                                      │
│  {                                                                   │
│    "Rules": [                                                        │
│      {                                                               │
│        "ID": "MoveToIAAfter30Days",                                 │
│        "Status": "Enabled",                                          │
│        "Transitions": [                                              │
│          {                                                           │
│            "Days": 30,                                               │
│            "StorageClass": "STANDARD_IA"                            │
│          },                                                          │
│          {                                                           │
│            "Days": 90,                                               │
│            "StorageClass": "GLACIER"                                │
│          },                                                          │
│          {                                                           │
│            "Days": 365,                                              │
│            "StorageClass": "DEEP_ARCHIVE"                           │
│          }                                                           │
│        ],                                                            │
│        "Expiration": {                                               │
│          "Days": 2555  // ~7 years                                  │
│        }                                                             │
│      }                                                               │
│    ]                                                                 │
│  }                                                                   │
│                                                                      │
│  COST SAVINGS VISUALIZATION:                                         │
│  ────────────────────────────                                       │
│                                                                      │
│  Without tiering (all Standard):                                    │
│  100 TB × $0.023/GB × 12 months = $27,600/year                     │
│                                                                      │
│  With tiering:                                                       │
│  - 10 TB Standard (hot): 10 × $0.023 × 12 = $2,760                │
│  - 20 TB IA (warm): 20 × $0.0125 × 12 = $3,000                    │
│  - 30 TB Glacier: 30 × $0.004 × 12 = $1,440                       │
│  - 40 TB Deep Archive: 40 × $0.001 × 12 = $480                    │
│  - Total = $7,680/year                                              │
│                                                                      │
│  SAVINGS: 72% reduction in storage costs                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 5️⃣ Interview Answer Framework
## ────────────────────────────────────

### Step-by-Step Estimation Process

```
┌─────────────────────────────────────────────────────────────────────┐
│              STORAGE ESTIMATION FRAMEWORK                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: IDENTIFY DATA TYPES                                        │
│  ────────────────────────────                                       │
│  • User data (profiles, settings)                                  │
│  • Content (posts, messages, files)                                │
│  • Metadata (indexes, relationships)                               │
│  • Media (images, videos, audio)                                   │
│  • Logs and analytics                                              │
│                                                                      │
│  STEP 2: ESTIMATE SIZE PER RECORD                                   │
│  ────────────────────────────────                                   │
│  • Break down into fields                                          │
│  • Sum up byte sizes                                               │
│  • Account for encoding overhead (UTF-8 vs ASCII)                 │
│                                                                      │
│  STEP 3: ESTIMATE VOLUME                                             │
│  ────────────────────────                                           │
│  • Daily/Monthly active users                                      │
│  • Actions per user per day                                        │
│  • Calculate daily data creation                                   │
│                                                                      │
│  STEP 4: APPLY RETENTION                                             │
│  ────────────────────────                                           │
│  • How long must data be kept?                                     │
│  • Multiply daily by retention period                              │
│  • Or calculate total over system lifetime                         │
│                                                                      │
│  STEP 5: ADD OVERHEAD                                                │
│  ─────────────────────                                              │
│  • Database overhead: 1.5-3x (indexes, MVCC, fragmentation)       │
│  • Filesystem overhead: 1.1-1.2x                                   │
│  • Compression savings: 0.1-0.5x                                   │
│                                                                      │
│  STEP 6: APPLY REPLICATION                                           │
│  ──────────────────────────                                         │
│  • Database: 3x (primary + 2 replicas)                             │
│  • Object storage: 2-3x (cross-region)                            │
│  • Backups: Add 1x for backups                                     │
│                                                                      │
│  STEP 7: PROJECT GROWTH                                              │
│  ───────────────────────                                            │
│  • Estimate growth rate (users, data per user)                    │
│  • Calculate 1-year, 3-year, 5-year needs                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Sample Interview Answer

**Q: "Estimate storage requirements for a video streaming service like Netflix."**

> "I'll break this down by data type:
>
> **Video Content (the big one):**
> - Assuming 10,000 titles (movies + shows)
> - Average 2 hours per title
> - Multiple quality levels: 4K (10 GB/hr), 1080p (3 GB/hr), 720p (1 GB/hr), 480p (0.5 GB/hr)
> - Per title: ~29 GB across all qualities
> - Total: 10,000 × 29 GB = 290 TB for catalog
> - With 3x replication across regions: ~870 TB
>
> **User Data:**
> - 200 million users
> - Profile + watch history + preferences: ~50 KB/user
> - Total: 200M × 50 KB = 10 TB
> - With replication: 30 TB
>
> **Analytics/Logs:**
> - 200M users × 2 hours/day average watch time
> - Heartbeat event every 30 seconds: 240 events/user/day
> - 200M × 240 × 100 bytes = 4.8 TB/day
> - 30-day retention: 144 TB
>
> **Total: ~1 PB** (dominated by video content)
>
> **Optimization strategies:**
> - CDN edge caching reduces origin storage reads
> - Compression (H.265 vs H.264) can reduce by 50%
> - Cold content moved to cheaper storage
> - Analytics aggregated and raw logs deleted after 7 days"

---

## ────────────────────────────────────
## 6️⃣ Quick Reference Tables
## ────────────────────────────────────

### Common Data Sizes

```
┌─────────────────────────────────────────────────────────────────────┐
│              COMMON DATA SIZE REFERENCE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TEXT DATA:                                                          │
│  ───────────                                                        │
│  • Character (ASCII): 1 byte                                       │
│  • Character (UTF-8): 1-4 bytes (avg 1.5 for English)             │
│  • UUID: 36 bytes (string) or 16 bytes (binary)                   │
│  • Timestamp: 8 bytes                                              │
│  • Email: 50 bytes (avg)                                           │
│  • Username: 20 bytes (avg)                                        │
│  • URL: 100-500 bytes (avg 200)                                    │
│  • Tweet: 280 chars = 560 bytes (UTF-8)                           │
│  • Blog post: 2,000 words ≈ 12 KB                                  │
│                                                                      │
│  MEDIA DATA:                                                         │
│  ────────────                                                       │
│  • Thumbnail (150×150): 10-20 KB                                   │
│  • Photo (Instagram): 500 KB - 2 MB                                │
│  • Photo (original): 3-10 MB                                       │
│  • Audio (1 min MP3): 1 MB                                         │
│  • Video (1 min, 720p): 50-100 MB                                 │
│  • Video (1 min, 1080p): 150-300 MB                               │
│  • Video (1 min, 4K): 350-700 MB                                  │
│                                                                      │
│  SCALE REFERENCE:                                                    │
│  ────────────────                                                   │
│  • 1 KB = 1,000 bytes ≈ 1 paragraph of text                       │
│  • 1 MB = 1,000 KB ≈ 1 photo or 1 minute audio                    │
│  • 1 GB = 1,000 MB ≈ 1 hour video (720p)                          │
│  • 1 TB = 1,000 GB ≈ 500 hours video                              │
│  • 1 PB = 1,000 TB ≈ 1 billion photos                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Powers of 2 for Storage

```
┌─────────────────────────────────────────────────────────────────────┐
│              POWERS OF 2 QUICK REFERENCE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  2^10 = 1,024          ≈ 1 Thousand (Kilo)                         │
│  2^20 = 1,048,576      ≈ 1 Million (Mega)                          │
│  2^30 = 1,073,741,824  ≈ 1 Billion (Giga)                          │
│  2^40 = 1,099,511,627,776 ≈ 1 Trillion (Tera)                      │
│  2^50 ≈ 1 Quadrillion (Peta)                                       │
│  2^60 ≈ 1 Quintillion (Exa)                                        │
│                                                                      │
│  USEFUL SHORTCUTS:                                                   │
│  ─────────────────                                                  │
│  • 1 Million records × 1 KB each = 1 GB                            │
│  • 1 Billion records × 1 KB each = 1 TB                            │
│  • 1 Million records × 1 MB each = 1 TB                            │
│  • 1 Billion records × 1 MB each = 1 PB                            │
│                                                                      │
│  DAILY TO YEARLY:                                                    │
│  ────────────────                                                   │
│  • 1 GB/day = 365 GB/year                                          │
│  • 1 TB/day = 365 TB/year ≈ 0.4 PB/year                           │
│  • 10 TB/day = 3.65 PB/year                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 7️⃣ Pseudocode: Storage Calculator
## ────────────────────────────────────

```python
from dataclasses import dataclass
from enum import Enum
from typing import List

class StorageClass(Enum):
    SSD = "ssd"
    HDD = "hdd"
    OBJECT = "object"
    ARCHIVE = "archive"

@dataclass
class DataType:
    name: str
    size_bytes: int
    daily_volume: int
    retention_days: int
    replication_factor: int
    overhead_factor: float
    compression_ratio: float
    storage_class: StorageClass

class StorageEstimator:
    def __init__(self):
        self.data_types: List[DataType] = []
    
    def add_data_type(self, data_type: DataType):
        self.data_types.append(data_type)
    
    def calculate_storage(self, data_type: DataType) -> dict:
        """Calculate storage for a single data type."""
        # Raw daily data
        daily_raw = data_type.size_bytes * data_type.daily_volume
        
        # Apply compression
        daily_compressed = daily_raw * data_type.compression_ratio
        
        # Total with retention
        total_raw = daily_compressed * data_type.retention_days
        
        # With overhead
        total_with_overhead = total_raw * data_type.overhead_factor
        
        # With replication
        total_replicated = total_with_overhead * data_type.replication_factor
        
        return {
            "name": data_type.name,
            "daily_raw_gb": daily_raw / (1024**3),
            "daily_compressed_gb": daily_compressed / (1024**3),
            "total_raw_tb": total_raw / (1024**4),
            "total_with_overhead_tb": total_with_overhead / (1024**4),
            "total_replicated_tb": total_replicated / (1024**4),
            "storage_class": data_type.storage_class.value
        }
    
    def estimate_all(self) -> dict:
        """Calculate storage for all data types."""
        results = []
        totals = {
            StorageClass.SSD: 0,
            StorageClass.HDD: 0,
            StorageClass.OBJECT: 0,
            StorageClass.ARCHIVE: 0
        }
        
        for dt in self.data_types:
            result = self.calculate_storage(dt)
            results.append(result)
            totals[dt.storage_class] += result["total_replicated_tb"]
        
        return {
            "by_type": results,
            "totals_by_class": {k.value: v for k, v in totals.items()},
            "grand_total_tb": sum(totals.values())
        }
    
    def estimate_costs(self, estimates: dict) -> dict:
        """Estimate monthly costs based on storage class."""
        # Costs per TB per month (approximate)
        costs_per_tb = {
            "ssd": 100,      # $0.10/GB
            "hdd": 25,       # $0.025/GB
            "object": 23,    # $0.023/GB
            "archive": 4     # $0.004/GB
        }
        
        monthly_cost = 0
        cost_breakdown = {}
        
        for storage_class, tb in estimates["totals_by_class"].items():
            cost = tb * costs_per_tb[storage_class]
            cost_breakdown[storage_class] = cost
            monthly_cost += cost
        
        return {
            "monthly_cost": monthly_cost,
            "yearly_cost": monthly_cost * 12,
            "cost_breakdown": cost_breakdown
        }


# Example: Instagram-like application
estimator = StorageEstimator()

# User profiles
estimator.add_data_type(DataType(
    name="User Profiles",
    size_bytes=7 * 1024,  # 7 KB per user
    daily_volume=100_000,  # 100K new users/day
    retention_days=365 * 10,  # 10 years
    replication_factor=3,
    overhead_factor=2.0,  # Database overhead
    compression_ratio=1.0,  # No compression
    storage_class=StorageClass.SSD
))

# Post metadata
estimator.add_data_type(DataType(
    name="Post Metadata",
    size_bytes=1000,  # 1 KB per post
    daily_volume=20_000_000,  # 20M posts/day
    retention_days=365 * 5,  # 5 years
    replication_factor=3,
    overhead_factor=2.5,  # Heavy indexing
    compression_ratio=1.0,
    storage_class=StorageClass.SSD
))

# Images
estimator.add_data_type(DataType(
    name="Images",
    size_bytes=2 * 1024 * 1024,  # 2 MB per image (all sizes)
    daily_volume=20_000_000,  # 20M images/day
    retention_days=365 * 5,  # 5 years
    replication_factor=2,  # Only 2x for object storage
    overhead_factor=1.1,
    compression_ratio=1.0,  # Already compressed
    storage_class=StorageClass.OBJECT
))

# Logs
estimator.add_data_type(DataType(
    name="Application Logs",
    size_bytes=500,  # 500 bytes per log line
    daily_volume=1_000_000_000,  # 1B log lines/day
    retention_days=30,  # 30 days
    replication_factor=2,
    overhead_factor=1.2,
    compression_ratio=0.1,  # 10x compression
    storage_class=StorageClass.HDD
))

# Calculate
estimates = estimator.estimate_all()
costs = estimator.estimate_costs(estimates)

print("=== STORAGE ESTIMATION ===")
for item in estimates["by_type"]:
    print(f"\n{item['name']}:")
    print(f"  Daily (raw): {item['daily_raw_gb']:.2f} GB")
    print(f"  Total (replicated): {item['total_replicated_tb']:.2f} TB")
    print(f"  Storage class: {item['storage_class']}")

print(f"\n=== TOTALS ===")
for storage_class, tb in estimates["totals_by_class"].items():
    print(f"  {storage_class}: {tb:.2f} TB")
print(f"  GRAND TOTAL: {estimates['grand_total_tb']:.2f} TB")

print(f"\n=== COSTS ===")
print(f"  Monthly: ${costs['monthly_cost']:,.2f}")
print(f"  Yearly: ${costs['yearly_cost']:,.2f}")
```

---

## ────────────────────────────────────
## 🔟 Summary Checklist
## ────────────────────────────────────

### Storage Estimation Interview Checklist

```
□ Identify all data types in the system
□ Estimate size per record/file for each type
□ Calculate daily/monthly volume
□ Apply retention periods
□ Add overhead factors (indexes, fragmentation)
□ Apply replication factors
□ Consider compression opportunities
□ Separate by storage tier (hot/warm/cold/archive)
□ Calculate costs
□ Project 1-3-5 year growth
□ Discuss optimization strategies (tiering, deduplication, compression)
```

### Key Numbers to Remember

| Metric | Typical Value |
|--------|---------------|
| Database overhead | 2-3x raw data |
| Standard replication | 3x |
| Compression (text) | 5-10x |
| Compression (logs) | 10-20x |
| Object storage cost | $0.023/GB/month |
| Archive cost | $0.004/GB/month |

---

**Next**: `23_Bandwidth_Estimation.md` - Calculating network throughput requirements
