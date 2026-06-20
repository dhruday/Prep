# Foundation 02 — Capacity Estimation

> "Back-of-the-envelope math" is a core senior engineer skill.
> Interviewers want to see your thought process, not a perfect answer.

---

## Why Capacity Estimation Matters

Estimation drives every architectural decision:
- How many servers do I need?
- What's my storage tier? (SSD vs. HDD vs. object storage)
- Do I need a CDN?
- How big does my cache need to be?
- Which database can handle this load?

Getting this wrong = wrong architecture. A system designed for 1,000 QPS won't handle 100,000 QPS without major rework.

---

## The Estimation Mental Model

```
Users → Traffic → Compute → Storage → Bandwidth
```

Always work left to right. Start with users, derive everything else.

---

## Numbers Every Engineer Must Know

### Time Constants

```
1 second  = 1,000 milliseconds
1 day     = 86,400 seconds  (~100K for estimation)
1 month   = 2,592,000 seconds (~3M)
1 year    = 31,536,000 seconds (~30M)
```

### Data Size Constants

```
Character (ASCII)  = 1 byte
Integer            = 4 bytes
Long / UUID        = 8-16 bytes
Timestamp          = 8 bytes

Typical tweet      = 280 bytes
Typical user record = 1 KB
Typical URL record  = 500 bytes
Typical photo (compressed) = 300 KB - 3 MB
Typical audio (1 min) = 1 MB
Typical video (1 min, 720p) = 50 MB
Typical video (1 min, 4K)   = 400 MB
```

### Latency Numbers (L1 Cache → Network)

```
L1 cache reference              0.5 ns
L2 cache reference              7 ns
Main memory reference           100 ns      100x L1 cache
Read 1 MB sequentially from RAM 250 μs
Read 1 MB sequentially from SSD 1 ms         4x memory
Round trip within same DC       0.5 ms
Read 1 MB sequentially from HDD 20 ms        80x SSD
Round trip CA → Netherlands     150 ms
Send 1 MB over 1 Gbps network   10 ms
```

### Power-of-Two Reference

```
2^10  = 1,024            ≈ 1 thousand    (Kilo)
2^20  = 1,048,576        ≈ 1 million     (Mega)
2^30  = 1,073,741,824    ≈ 1 billion     (Giga)
2^40  = ~1.1 trillion    ≈ 1 trillion    (Tera)
2^50  = ~1.1 quadrillion ≈ 1 quadrillion (Peta)
```

---

## Step-by-Step Estimation Process

### Step 1: Establish User Base

```
Total registered users:      X
Daily Active Users (DAU):    Y  (typically 10-30% of registered)
Monthly Active Users (MAU):  Z  (typically 50-70% of registered)

Rule of thumb: DAU = 20% of total users
               MAU = 50% of total users
```

### Step 2: Calculate QPS

```
Average QPS = (DAU × requests per user per day) / seconds per day
            = (DAU × RPU) / 86,400

Peak QPS = Average QPS × peak factor (typically 2-5x)
```

### Step 3: Separate Reads from Writes

```
Total QPS × (read ratio) = Read QPS
Total QPS × (write ratio) = Write QPS

Example (10:1 read/write ratio):
Total = 1,000 QPS
Reads = 909 QPS
Writes = 91 QPS
```

### Step 4: Calculate Storage

```
Storage per day = writes per day × size per record
Storage total   = storage per day × retention period
Storage with replication = storage total × replication factor (3x)

Don't forget:
- Indexes (~30-50% overhead)
- Metadata overhead
- Growth buffer (plan for 3x current)
```

### Step 5: Calculate Bandwidth

```
Inbound bandwidth  = writes per second × average write size
Outbound bandwidth = reads per second × average response size

CDN bandwidth = outbound × CDN offload ratio (80-95%)
```

### Step 6: Estimate Servers

```
Servers needed = peak QPS / QPS per server
              + buffer for headroom (plan for 50-60% utilization)

QPS per server (rule of thumb):
- Simple API (CRUD): 1,000-5,000 QPS
- CPU-intensive:     100-500 QPS
- Database server:   5,000-10,000 QPS (read)
- Cache server:      100,000+ QPS (Redis)
```

---

## Worked Examples

### Example 1: URL Shortener

**Given:** 100M DAU, 10:1 read:write

```
=== WRITES (URL Creation) ===
Assume 1% of DAU create a URL per day:
  Daily writes = 100M × 1% = 1M URLs/day
  Write QPS    = 1M / 86,400 ≈ 12 writes/sec
  Peak write   = 12 × 3 = 36 writes/sec

=== READS (URL Redirects) ===
Read QPS = write QPS × 10 = 120 reads/sec
Peak QPS = 360 reads/sec

=== STORAGE ===
Per URL record:
  - Short URL hash:  7 bytes
  - Original URL:    200 bytes (avg)
  - Created at:      8 bytes
  - User ID:         8 bytes
  - Click count:     8 bytes
  Total per record ≈ 231 bytes ≈ ~500 bytes with overhead

Storage per year:
  1M URLs/day × 365 days = 365M URLs/year
  365M × 500 bytes ≈ 182 GB/year
  With 3x replication ≈ 546 GB/year

=== BANDWIDTH ===
Read:  360 req/s × 500 bytes  = 180 KB/s  (~1.5 Mbps)
Write: 36 req/s  × 500 bytes  = 18 KB/s   (~0.15 Mbps)
(Very low — this is primarily redirect traffic)
```

**Conclusion:** URL shortener at this scale is tiny. Single server easily handles it. Focus on consistency of hash generation, not scale.

---

### Example 2: WhatsApp

**Given:** 500M DAU, each user sends avg 40 messages/day

```
=== MESSAGE THROUGHPUT ===
Total messages/day = 500M × 40 = 20B messages/day
Messages per second = 20B / 86,400 ≈ 231,000 msg/sec
Peak messages/sec   = 231K × 3 = ~700K msg/sec

=== STORAGE ===
Avg message size = 100 bytes (text)
Media message    = 100 KB (compressed)
Assume 10% messages have media:
  Effective avg size = (90% × 100B) + (10% × 100KB)
                     = 90B + 10,000B = ~10,090B ≈ 10 KB

Storage per day  = 231K msg/s × 86,400 × 10 KB
                 = 231K × 86,400 × 10,000 bytes
                 = ~200 TB/day

Wait — check: 20B messages × 10KB = 200 TB/day ✓

With 3x replication: 600 TB/day
Per year: ~200 PB

=== SERVERS ===
Message servers: 700K msg/sec / 5K per server = 140 servers
Storage: Cassandra cluster, 600 TB/day needs ~1,000 nodes
         (each 1 TB SSD node handles ~600 TB / 1 year retention)
```

**Conclusion:** Massive write-heavy system. Need distributed storage (Cassandra), message queues (Kafka), horizontal scaling from day one.

---

### Example 3: YouTube

**Given:** 2B MAU, 500M DAU, 500 hours of video uploaded per minute

```
=== UPLOAD THROUGHPUT ===
500 hours/min × 60 min = 30,000 hours/hour
Video size: 1 GB/hour (compressed, 1080p)
Upload bandwidth: 30,000 GB/hour = 500 GB/min ≈ 8.3 GB/sec

=== VIEWING THROUGHPUT ===
DAU = 500M, average watch time = 30 min/day
Total viewing = 500M × 30 min = 15B min/day = 250M hours/day
Peak viewing  = 5x average
= at any given second, 250M hours / 86400 sec × 5
≈ ~14.5M concurrent streams at peak

Bandwidth for streaming:
14.5M streams × 5 Mbps (1080p) = 72.5 Tbps
With CDN serving 95%: Origin serves 3.6 Tbps
(This is why YouTube has 1000s of CDN edge nodes)

=== STORAGE ===
Upload: 500 hours/min × 60 × 24 = 720K hours/day
Multiple resolutions (360p, 480p, 720p, 1080p, 4K) = ~10x storage
720K hours × 1 GB/hour × 10 = 7.2 PB/day raw

With deduplication (~30% reduction): ~5 PB/day
Per year: ~1.8 EB (exabytes)
```

**Conclusion:** YouTube is primarily a CDN and storage problem. The origin doesn't serve most video — CDN does. Focus on video encoding pipeline and CDN strategy.

---

### Example 4: Twitter

**Given:** 300M MAU, 100M DAU, avg 5 tweets/day per active user

```
=== WRITE (TWEET CREATION) ===
Daily tweets = 100M × 5 = 500M tweets/day
Write QPS    = 500M / 86,400 ≈ 5,800 tweets/sec
Peak write   = 5,800 × 3 = ~17,400 tweets/sec

=== READ (TIMELINE) ===
Assume each user reads feed 5x/day, 20 tweets per load:
Read requests/day = 100M × 5 = 500M requests
Each returns 20 tweets: 500M × 20 = 10B tweet reads/day
Read QPS = 10B / 86,400 ≈ 115,000 reads/sec
Peak Read QPS ≈ 350,000 reads/sec

Read/Write ratio ≈ 115K / 5.8K ≈ 20:1

=== TWEET STORAGE ===
Per tweet:
  tweet_id:    8 bytes
  user_id:     8 bytes
  content:     280 bytes max
  timestamp:   8 bytes
  metadata:    ~100 bytes
  Total:       ~500 bytes

Daily storage = 500M × 500 bytes = 250 GB/day
With media tweets (photos: 30%, video: 5%):
  Photo: 500KB × 30% of 500M = ~75 TB/day
  Video: 10MB × 5% of 500M  = ~250 TB/day
  Total with media ≈ 325 TB/day

=== TIMELINE CACHE ===
Assume we cache last 100 tweets per user (push model):
100M users × 100 tweets × 500 bytes = 5 TB in cache
Redis (64 GB nodes) = 5TB / 64GB ≈ 80 Redis nodes
```

---

## Estimation Cheat Sheet

### Common Request Rates

```
Small startup:      100-1,000 RPS
Medium company:     1,000-50,000 RPS
Large company:      50,000-500,000 RPS
Google/Amazon:      1M+ RPS
```

### Storage Growth Rates

```
1M users × 1 profile (1KB)        = 1 GB
1M users × 1 photo (1MB)          = 1 TB
100M messages/day × 1KB           = 100 GB/day
1M video uploads × 1GB            = 1 PB/day
```

### Server Capacity Rules of Thumb

```
Web/API server:   5,000 RPS (stateless, 8 core)
PostgreSQL:       10,000 reads/sec, 2,000 writes/sec (single)
MySQL:            5,000 reads/sec, 1,000 writes/sec (single)
Redis:            100,000 ops/sec (single node)
Cassandra node:   10,000-30,000 writes/sec
Kafka partition:  100,000 msgs/sec
Elasticsearch:    1,000-5,000 queries/sec (node)
```

---

## Estimation in Interviews: Dos and Don'ts

### ✅ DO
- Round generously (100K not 86,400 for seconds/day)
- State your assumptions out loud
- Show the formula before plugging in numbers
- Cross-check: "Does this make intuitive sense?"
- Connect estimates to architectural decisions

### ❌ DON'T
- Get lost in precision — this is ballpark math
- Skip estimation entirely
- Forget peak vs. average
- Forget replication factor in storage
- Forget bandwidth calculations

### The "Sanity Check" Pattern

After every estimation, do a sanity check:

> "I got 350K reads/sec. That's roughly what Twitter serves. They use ~3,000 servers. 
> With ~100 reads/sec per server, 350K / 100 = 3,500 servers needed. That seems 
> consistent with what's publicly known, so my estimate feels right."

---

## Template: Capacity Estimation Table

Fill this in during your interview:

```
=== [SYSTEM NAME] CAPACITY ESTIMATION ===

USERS
  Total users:          _______________
  DAU:                  _______________
  MAU:                  _______________

TRAFFIC
  Reads/user/day:       _______________
  Writes/user/day:      _______________
  Read QPS (avg):       _______________
  Write QPS (avg):      _______________
  Peak Read QPS:        _______________
  Peak Write QPS:       _______________
  Read:Write ratio:     _______________

STORAGE
  Data size per record: _______________
  Daily write volume:   _______________
  Retention period:     _______________
  Total storage needed: _______________
  With replication:     _______________

BANDWIDTH
  Inbound:              _______________
  Outbound:             _______________
  CDN offload needed:   _______________

SERVERS (rough)
  App servers:          _______________
  DB servers:           _______________
  Cache servers:        _______________
  Message brokers:      _______________
```

---

*Next: `03_distributed_systems.md`*
