# 23. Bandwidth Estimation

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Bandwidth Estimation** is the process of calculating the network throughput your system needs to transfer data between components and to/from users.

### What It Is
Bandwidth measures data transfer capacity:
- **Ingress**: Data coming INTO your system (uploads, API requests)
- **Egress**: Data going OUT of your system (downloads, API responses)
- **Internal**: Data moving between services (database queries, microservice calls)

### Why It Exists
You need bandwidth estimation to:
- **Provision network capacity** (avoid congestion)
- **Budget cloud costs** (egress is expensive!)
- **Design CDN strategy** (offload origin traffic)
- **Set rate limits** (prevent abuse)

### The Problem It Solves
Without proper estimation:
- **Network saturation**: Services become unreachable
- **High latency**: Congested networks increase response times
- **Budget overruns**: Cloud egress fees can be massive
- **Poor user experience**: Slow downloads, buffering

### Where and When It's Used
- **System design interviews**: Always estimate bandwidth
- **Infrastructure planning**: Network capacity, NIC sizing
- **CDN decisions**: When to use CDN, cache strategies
- **Cost optimization**: Reduce egress costs

### Its Role in Large-Scale Distributed Systems
At FAANG scale:
- **Netflix**: 15% of global internet traffic during peak
- **YouTube**: Multiple Tbps of video streaming
- **Cloudflare**: 50+ Tbps capacity across network
- **AWS S3**: Handles exabytes of egress monthly

Bandwidth is often **the most expensive infrastructure cost** for media-heavy applications.

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Bandwidth Calculation Formula

```
┌─────────────────────────────────────────────────────────────────────┐
│              MASTER BANDWIDTH FORMULA                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Bandwidth = (QPS × Average Response Size) + Overhead              │
│                                                                      │
│   BREAKING IT DOWN:                                                  │
│   ─────────────────                                                 │
│                                                                      │
│   Total Bandwidth = Ingress Bandwidth + Egress Bandwidth            │
│                                                                      │
│   Ingress = Σ (Request Rate × Request Size)                        │
│           = API requests + File uploads + Incoming webhooks         │
│                                                                      │
│   Egress = Σ (Response Rate × Response Size)                       │
│          = API responses + File downloads + Streaming               │
│                                                                      │
│   OVERHEAD FACTORS:                                                  │
│   ─────────────────                                                 │
│   • Protocol overhead: HTTP headers (~1 KB per request)            │
│   • TLS overhead: ~1-2 KB per connection setup                     │
│   • TCP overhead: ~5-10% of payload                                │
│   • Retransmissions: ~1-5% of traffic                              │
│   • Total overhead: ~15-20%                                         │
│                                                                      │
│   PRACTICAL FORMULA:                                                 │
│   ──────────────────                                                │
│   Peak Bandwidth = Calculated Bandwidth × 1.2 (overhead)           │
│                    × Peak Multiplier (2-5x average)                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Bandwidth Units

```
┌─────────────────────────────────────────────────────────────────────┐
│              BANDWIDTH UNIT REFERENCE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  UNITS (bits vs bytes):                                              │
│  ──────────────────────                                             │
│  • Network bandwidth: measured in BITS per second (bps)            │
│  • Storage/data: measured in BYTES                                 │
│  • 1 byte = 8 bits                                                  │
│                                                                      │
│  CONVERSION:                                                         │
│  ───────────                                                        │
│  • 1 Mbps = 1,000,000 bits/second = 125 KB/second                  │
│  • 1 Gbps = 1,000 Mbps = 125 MB/second                             │
│  • 1 Tbps = 1,000 Gbps = 125 GB/second                             │
│                                                                      │
│  QUICK CONVERSIONS:                                                  │
│  ──────────────────                                                 │
│  • 100 Mbps → 12.5 MB/s → 1 GB in 80 seconds                       │
│  • 1 Gbps → 125 MB/s → 1 GB in 8 seconds                           │
│  • 10 Gbps → 1.25 GB/s → 1 TB in 13 minutes                        │
│  • 100 Gbps → 12.5 GB/s → 1 TB in 80 seconds                       │
│                                                                      │
│  CONTEXT:                                                            │
│  ────────                                                           │
│  • Home broadband: 100-1000 Mbps                                   │
│  • Server NIC: 1-25 Gbps                                           │
│  • Data center switch: 100-400 Gbps                                │
│  • CDN edge: 10-100+ Tbps (aggregate)                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Traffic Patterns

```
┌─────────────────────────────────────────────────────────────────────┐
│              INGRESS VS EGRESS BY APPLICATION TYPE                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  APPLICATION        │ INGRESS  │ EGRESS   │ RATIO  │ DOMINANT      │
│  ───────────────────│──────────│──────────│────────│───────────────│
│  Video Streaming    │ Low      │ Very High│ 1:1000 │ Egress        │
│  Photo Sharing      │ High     │ Very High│ 1:100  │ Egress        │
│  Social Feed        │ Medium   │ High     │ 1:20   │ Egress        │
│  E-commerce         │ Low      │ Medium   │ 1:10   │ Egress        │
│  Chat/Messaging     │ Medium   │ Medium   │ 1:1    │ Balanced      │
│  File Backup        │ High     │ Medium   │ 2:1    │ Ingress       │
│  IoT/Telemetry      │ High     │ Low      │ 10:1   │ Ingress       │
│  Video Upload       │ Very High│ Low      │ 100:1  │ Ingress       │
│  API Service        │ Low      │ Medium   │ 1:5    │ Egress        │
│                                                                      │
│  VISUALIZATION:                                                      │
│  ──────────────                                                     │
│                                                                      │
│  Video Streaming (Netflix):                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ INGRESS ▓ (requests)                                        │   │
│  │ EGRESS  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (video data)  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  File Backup (Dropbox):                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ INGRESS ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (file uploads)            │   │
│  │ EGRESS  ▓▓▓▓▓▓▓▓▓▓▓▓ (file downloads)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Messaging (WhatsApp):                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ INGRESS ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (send messages)                    │   │
│  │ EGRESS  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (receive messages)                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 3️⃣ Bandwidth Estimation Examples
## ────────────────────────────────────

### Example 1: Video Streaming Service (Netflix Clone)

```
┌─────────────────────────────────────────────────────────────────────┐
│              NETFLIX CLONE BANDWIDTH ESTIMATION                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ASSUMPTIONS:                                                        │
│  ─────────────                                                      │
│  • 200 million subscribers                                         │
│  • 50% watch on any given day (100M daily active)                 │
│  • Average watch time: 2 hours/day                                 │
│  • Peak hours: 7 PM - 11 PM (4 hours)                             │
│  • 60% of daily viewing happens during peak                       │
│                                                                      │
│  VIDEO BITRATES:                                                     │
│  ───────────────                                                    │
│  • 4K HDR: 25 Mbps                                                 │
│  • 4K: 15 Mbps                                                     │
│  • 1080p: 5 Mbps                                                   │
│  • 720p: 3 Mbps                                                    │
│  • 480p: 1 Mbps                                                    │
│                                                                      │
│  Quality distribution:                                              │
│  • 4K: 10% → 15 Mbps avg                                           │
│  • 1080p: 40% → 5 Mbps                                             │
│  • 720p: 30% → 3 Mbps                                              │
│  • 480p: 20% → 1 Mbps                                              │
│  • Weighted average: 0.1×15 + 0.4×5 + 0.3×3 + 0.2×1 = 4.6 Mbps    │
│                                                                      │
│  AVERAGE BANDWIDTH:                                                  │
│  ─────────────────                                                  │
│                                                                      │
│  Daily viewing hours: 100M users × 2 hours = 200M hours            │
│  Daily data transfer: 200M hours × 4.6 Mbps × 3600 sec/hr         │
│                      = 200M × 16.56 GB = 3.3 exabytes/day          │
│  Average bandwidth: 3.3 EB / 86,400 sec = 38.2 Tbps average       │
│                                                                      │
│  PEAK BANDWIDTH:                                                     │
│  ────────────────                                                   │
│                                                                      │
│  Peak viewing (60% in 4 hours):                                    │
│  = 200M hours × 0.6 / 4 hours = 30M concurrent streams            │
│                                                                      │
│  Peak bandwidth: 30M × 4.6 Mbps = 138 Tbps                         │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  SUMMARY:                                                            │
│  ════════════════════════════════════════════════════════════════  │
│  • Average egress: ~40 Tbps                                        │
│  • Peak egress: ~140 Tbps                                          │
│  • Daily data transfer: ~3.3 exabytes                             │
│  • Monthly data transfer: ~100 exabytes                           │
│                                                                      │
│  COST (at $0.05/GB egress):                                         │
│  3.3 EB/day × 30 days × $0.05/GB = $5 billion/month               │
│  (This is why Netflix uses its own CDN - Open Connect!)           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Example 2: Instagram Clone

```
┌─────────────────────────────────────────────────────────────────────┐
│              INSTAGRAM CLONE BANDWIDTH ESTIMATION                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ASSUMPTIONS:                                                        │
│  ─────────────                                                      │
│  • 500 million DAU                                                 │
│  • Average session: 30 minutes                                     │
│  • User views: 100 posts per session                               │
│  • Image sizes: 200 KB (feed) + 50 KB (thumbnail)                 │
│  • 10% also watch Reels (15 videos × 3 MB each)                   │
│                                                                      │
│  EGRESS (Downloads):                                                 │
│  ───────────────────                                                │
│                                                                      │
│  Feed images per user:                                             │
│  = 100 posts × (200 KB + 50 KB) = 25 MB                           │
│                                                                      │
│  Reels (10% of users):                                             │
│  = 15 videos × 3 MB = 45 MB per user who watches                  │
│                                                                      │
│  Average per user:                                                  │
│  = 25 MB + (0.1 × 45 MB) = 29.5 MB ≈ 30 MB                        │
│                                                                      │
│  Daily egress:                                                      │
│  = 500M users × 30 MB = 15 PB/day                                  │
│  = 15 PB / 86,400 sec = 174 Tbps average                          │
│                                                                      │
│  Peak (3x average):                                                │
│  = 522 Tbps                                                         │
│                                                                      │
│  Wait, that seems high. Let's recalculate with caching:           │
│  • CDN cache hit rate: 95%                                         │
│  • Origin egress: 15 PB × 0.05 = 750 TB/day                       │
│  • Origin bandwidth: 750 TB / 86,400 sec = 8.7 Tbps average       │
│                                                                      │
│  INGRESS (Uploads):                                                  │
│  ────────────────────                                               │
│                                                                      │
│  Daily uploads: 100M posts                                         │
│  • Photo: 2 MB (original)                                          │
│  • Story: 5 MB (video/image)                                       │
│  • Reel: 50 MB (video)                                             │
│                                                                      │
│  Distribution: 60% photos, 30% stories, 10% reels                 │
│  Average upload: 0.6×2 + 0.3×5 + 0.1×50 = 7.7 MB                  │
│                                                                      │
│  Daily ingress:                                                     │
│  = 100M × 7.7 MB = 770 TB/day                                      │
│  = 8.9 Tbps average                                                │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  SUMMARY:                                                            │
│  ════════════════════════════════════════════════════════════════  │
│  • CDN egress: ~175 Tbps average, ~525 Tbps peak                  │
│  • Origin egress: ~9 Tbps average (with 95% cache hit)            │
│  • Ingress: ~9 Tbps average                                        │
│  • Daily CDN data: 15 PB                                           │
│  • Daily origin data: 750 TB                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Example 3: Chat Application (WhatsApp Clone)

```
┌─────────────────────────────────────────────────────────────────────┐
│              WHATSAPP CLONE BANDWIDTH ESTIMATION                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ASSUMPTIONS:                                                        │
│  ─────────────                                                      │
│  • 2 billion MAU, 500 million DAU                                  │
│  • 100 messages sent per user per day                              │
│  • Message size: 200 bytes (text, encrypted)                       │
│  • 10% are media messages (avg 500 KB)                             │
│                                                                      │
│  TEXT MESSAGE BANDWIDTH:                                             │
│  ────────────────────────                                           │
│                                                                      │
│  Daily text messages: 500M × 100 × 0.9 = 45B messages             │
│  Daily text data: 45B × 200 bytes = 9 TB/day                       │
│  Text bandwidth: 9 TB / 86,400 sec = 104 Gbps                      │
│                                                                      │
│  MEDIA MESSAGE BANDWIDTH:                                            │
│  ─────────────────────────                                          │
│                                                                      │
│  Daily media messages: 500M × 100 × 0.1 = 5B messages             │
│  Daily media data: 5B × 500 KB = 2.5 PB/day                        │
│  Media bandwidth: 2.5 PB / 86,400 sec = 29 Tbps                    │
│                                                                      │
│  DELIVERY (Egress):                                                  │
│  ─────────────────                                                  │
│                                                                      │
│  Messages are sent to recipients (1:1 or group)                    │
│  Average 1.5 recipients per message (includes groups)              │
│                                                                      │
│  Egress = Ingress × 1.5                                             │
│  Text egress: 104 Gbps × 1.5 = 156 Gbps                            │
│  Media egress: 29 Tbps × 1.5 = 43.5 Tbps                           │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  SUMMARY:                                                            │
│  ════════════════════════════════════════════════════════════════  │
│  • Ingress: ~29 Tbps (dominated by media)                          │
│  • Egress: ~44 Tbps                                                │
│  • Total: ~73 Tbps bidirectional                                   │
│  • Daily data: ~5 PB                                               │
│                                                                      │
│  NOTE: This is server-relayed bandwidth. With E2E encryption      │
│  and peer-to-peer for media, actual server bandwidth is lower.    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Example 4: API Service

```
┌─────────────────────────────────────────────────────────────────────┐
│              API SERVICE BANDWIDTH ESTIMATION                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ASSUMPTIONS:                                                        │
│  ─────────────                                                      │
│  • 100,000 QPS average                                             │
│  • Request size: 1 KB (JSON payload + headers)                     │
│  • Response size: 5 KB (JSON response + headers)                   │
│                                                                      │
│  CALCULATION:                                                        │
│  ────────────                                                       │
│                                                                      │
│  Ingress (requests):                                                │
│  = 100,000 QPS × 1 KB = 100 MB/s = 800 Mbps                        │
│                                                                      │
│  Egress (responses):                                                │
│  = 100,000 QPS × 5 KB = 500 MB/s = 4 Gbps                          │
│                                                                      │
│  Total bandwidth: ~5 Gbps                                           │
│                                                                      │
│  With 3x peak: ~15 Gbps                                            │
│                                                                      │
│  SERVER SIZING:                                                      │
│  ───────────────                                                    │
│  • Server with 10 Gbps NIC handles: 10 Gbps / 5 KB = 250K QPS     │
│  • For 100K QPS average: 1 server sufficient                       │
│  • For 300K QPS peak: 2 servers minimum (with headroom: 4)        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 4️⃣ CDN and Caching Impact
## ────────────────────────────────────

### CDN Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│              CDN BANDWIDTH OFFLOADING                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WITHOUT CDN:                                                        │
│  ─────────────                                                      │
│                                                                      │
│  Users ──────────────────────────────────────────▶ Origin Server   │
│  100% of traffic goes to origin                                    │
│  Origin bandwidth: 100 Tbps (expensive, single point)             │
│                                                                      │
│  WITH CDN:                                                           │
│  ──────────                                                         │
│                                                                      │
│  Users ──▶ CDN Edge (95% cache hit) ──▶ Origin (5% cache miss)    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                                                            │    │
│  │   User ──▶ CDN Edge PoP ──▶ CDN Regional ──▶ Origin       │    │
│  │             │                    │              │          │    │
│  │         Cache hit 80%        Cache hit 15%   Miss 5%      │    │
│  │                                                            │    │
│  │   95% of requests never reach origin!                     │    │
│  │                                                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  CDN bandwidth: 100 Tbps (distributed across many PoPs)           │
│  Origin bandwidth: 5 Tbps (manageable, redundant)                 │
│                                                                      │
│  CACHE HIT RATES BY CONTENT TYPE:                                   │
│  ─────────────────────────────────                                  │
│  • Static assets (JS, CSS, images): 95-99%                        │
│  • Product images: 90-95%                                          │
│  • Video chunks: 80-95%                                            │
│  • User-specific content: 0% (can't cache)                        │
│  • API responses: 0-50% (depends on cacheability)                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Bandwidth Cost Optimization

```
┌─────────────────────────────────────────────────────────────────────┐
│              EGRESS COST COMPARISON                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CLOUD PROVIDER EGRESS COSTS (approx):                              │
│  ─────────────────────────────────────                              │
│                                                                      │
│  │ Provider      │ First 10TB │ 10-50TB │ 50-150TB │ 150TB+ │      │
│  │───────────────│────────────│─────────│──────────│────────│      │
│  │ AWS           │ $0.09/GB   │ $0.085  │ $0.07    │ $0.05  │      │
│  │ GCP           │ $0.12/GB   │ $0.11   │ $0.08    │ $0.06  │      │
│  │ Azure         │ $0.087/GB  │ $0.083  │ $0.07    │ $0.05  │      │
│  │ Cloudflare    │ $0.00/GB   │ $0.00   │ $0.00    │ $0.00  │      │
│  │ (bandwidth)   │            │         │          │        │      │
│                                                                      │
│  EXAMPLE COST CALCULATION:                                           │
│  ──────────────────────────                                         │
│                                                                      │
│  Monthly egress: 500 TB                                             │
│                                                                      │
│  Direct from AWS:                                                   │
│  = 10 × $0.09 + 40 × $0.085 + 100 × $0.07 + 350 × $0.05           │
│  = $0.9 + $3.4 + $7 + $17.5 = $28.8K/month                        │
│                                                                      │
│  Via CloudFront (CDN):                                              │
│  = 500 TB × $0.02/GB (CDN pricing) = $10K/month                    │
│  + Origin to CloudFront (usually free or cheap)                    │
│                                                                      │
│  Via Cloudflare (included):                                         │
│  = $0 bandwidth (but pay for compute/requests)                     │
│                                                                      │
│  SAVINGS: 65-100% by using CDN strategically                       │
│                                                                      │
│  OPTIMIZATION STRATEGIES:                                            │
│  ─────────────────────────                                          │
│  1. Use CDN for static content (massive savings)                   │
│  2. Compress responses (gzip/brotli → 60-80% reduction)           │
│  3. Use efficient formats (WebP vs PNG, H.265 vs H.264)           │
│  4. Multi-CDN strategy (route to cheapest/fastest)                │
│  5. Edge compute (process at edge, reduce origin traffic)         │
│  6. Private peering (direct connections, bypass internet)         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 5️⃣ Internal Bandwidth Estimation
## ────────────────────────────────────

### Microservices Communication

```
┌─────────────────────────────────────────────────────────────────────┐
│              INTERNAL BANDWIDTH (EAST-WEST TRAFFIC)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CHALLENGE:                                                          │
│  ──────────                                                         │
│  • Microservices call each other (service mesh)                    │
│  • One user request may trigger 10-50 internal calls               │
│  • Internal traffic often >> external traffic                      │
│                                                                      │
│  FANOUT PATTERN:                                                     │
│  ────────────────                                                   │
│                                                                      │
│  User Request (1)                                                   │
│       │                                                              │
│       ▼                                                              │
│  API Gateway ────┬────┬────┬────┬────▶ 5 service calls             │
│                  │    │    │    │                                   │
│                  ▼    ▼    ▼    ▼                                   │
│              Service calls to DB, cache, other services            │
│                  │    │    │    │                                   │
│               (3)  (2)  (4)  (2) = 11 more calls                   │
│                                                                      │
│  Total internal calls: 1 + 5 + 11 = 17 calls per user request     │
│  Internal/External ratio: 17:1                                     │
│                                                                      │
│  BANDWIDTH CALCULATION:                                              │
│  ──────────────────────                                             │
│                                                                      │
│  External: 100K QPS × 5 KB avg = 500 MB/s = 4 Gbps                │
│  Internal: 100K × 17 × 1 KB avg = 1.7 GB/s = 13.6 Gbps            │
│  Total internal: ~14 Gbps (3.5x external)                          │
│                                                                      │
│  DATABASE TRAFFIC:                                                   │
│  ─────────────────                                                  │
│  • 100K QPS external → 500K QPS to database                       │
│  • Query: 200 bytes, Response: 2 KB                                │
│  • DB bandwidth: 500K × 2.2 KB = 1.1 GB/s = 8.8 Gbps              │
│                                                                      │
│  CACHE TRAFFIC:                                                      │
│  ───────────────                                                    │
│  • Cache hit rate: 90%                                             │
│  • 500K QPS to cache (before DB)                                   │
│  • 450K cache hits × 1 KB = 450 MB/s = 3.6 Gbps                   │
│  • 50K cache misses → DB                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Center Network Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│              DATA CENTER BANDWIDTH ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TYPICAL TOPOLOGY (Spine-Leaf):                                      │
│  ───────────────────────────────                                    │
│                                                                      │
│                    ┌─────────────────────────────┐                  │
│                    │      INTERNET/WAN           │                  │
│                    │      (100+ Gbps)            │                  │
│                    └──────────┬──────────────────┘                  │
│                               │                                      │
│              ┌────────────────┼────────────────┐                    │
│              │                │                │                    │
│         ┌────▼────┐      ┌────▼────┐     ┌────▼────┐               │
│         │ Spine 1 │      │ Spine 2 │     │ Spine 3 │               │
│         │ 400Gbps │      │ 400Gbps │     │ 400Gbps │               │
│         └────┬────┘      └────┬────┘     └────┬────┘               │
│              │                │                │                    │
│    ┌─────────┼────────────────┼────────────────┼─────────┐         │
│    │         │                │                │         │         │
│ ┌──▼──┐   ┌──▼──┐   ┌──▼──┐   ┌──▼──┐   ┌──▼──┐   ┌──▼──┐        │
│ │Leaf1│   │Leaf2│   │Leaf3│   │Leaf4│   │Leaf5│   │Leaf6│        │
│ │100G │   │100G │   │100G │   │100G │   │100G │   │100G │        │
│ └──┬──┘   └──┬──┘   └──┬──┘   └──┬──┘   └──┬──┘   └──┬──┘        │
│    │         │         │         │         │         │            │
│ ┌──▼──┐   ┌──▼──┐   ┌──▼──┐   ┌──▼──┐   ┌──▼──┐   ┌──▼──┐        │
│ │Rack │   │Rack │   │Rack │   │Rack │   │Rack │   │Rack │        │
│ │40×  │   │40×  │   │40×  │   │40×  │   │40×  │   │40×  │        │
│ │25G  │   │25G  │   │25G  │   │25G  │   │25G  │   │25G  │        │
│ │NIC  │   │NIC  │   │NIC  │   │NIC  │   │NIC  │   │NIC  │        │
│ └─────┘   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘        │
│                                                                      │
│  CAPACITY PLANNING:                                                  │
│  ──────────────────                                                 │
│  • Server NIC: 10-25 Gbps (shared among services on server)        │
│  • Leaf switch: 100 Gbps uplinks (40 servers × 25G = 1 Tbps down) │
│  • Spine switch: 400 Gbps (aggregates multiple leaves)            │
│  • Oversubscription ratio: 4:1 to 8:1 typical                      │
│                                                                      │
│  BOTTLENECK ANALYSIS:                                                │
│  ─────────────────────                                              │
│  • Within rack: Full bandwidth (leaf to server)                    │
│  • Cross-rack: May hit leaf uplink limits                         │
│  • Cross-pod: May hit spine capacity                               │
│                                                                      │
│  BEST PRACTICE:                                                      │
│  ──────────────                                                     │
│  Keep communicating services in same rack when possible            │
│  (e.g., app server and its database replica)                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 6️⃣ Interview Answer Framework
## ────────────────────────────────────

### Step-by-Step Estimation Process

```
BANDWIDTH ESTIMATION CHECKLIST:
───────────────────────────────

STEP 1: IDENTIFY TRAFFIC TYPES
□ User-facing requests (API calls)
□ Static content (images, JS, CSS)
□ Media streaming (video, audio)
□ File uploads/downloads
□ Background sync

STEP 2: FOR EACH TRAFFIC TYPE, CALCULATE:
□ Request/response size
□ Requests per second (average and peak)
□ Multiply: QPS × Size = Bandwidth

STEP 3: SUM UP:
□ Total ingress bandwidth
□ Total egress bandwidth
□ Apply overhead factor (1.2x)
□ Calculate peak (2-5x average)

STEP 4: CONSIDER CDN:
□ What percentage can be cached?
□ What's the cache hit rate?
□ Calculate origin bandwidth (cache misses only)

STEP 5: COST ESTIMATION:
□ Egress cost per GB
□ Monthly/yearly cost
□ Optimization opportunities
```

### Sample Interview Answer

**Q: "Estimate bandwidth requirements for a photo-sharing app with 100M daily users."**

> "Let me break this down:
>
> **Assumptions:**
> - 100M DAU, each viewing 50 photos per session
> - Average photo size: 200 KB (compressed for feed)
> - 10% of users upload 2 photos/day
> - Upload size: 2 MB (before compression)
>
> **Egress (Downloads):**
> - Photos viewed: 100M × 50 × 200 KB = 1 PB/day
> - Spread over 24 hours: 1 PB / 86,400 sec = 11.6 Tbps average
> - Peak (3x): ~35 Tbps
>
> **With CDN (95% cache hit):**
> - Origin egress: 1 PB × 5% = 50 TB/day = 580 Gbps average
>
> **Ingress (Uploads):**
> - Photos uploaded: 100M × 10% × 2 × 2 MB = 40 TB/day
> - Bandwidth: 40 TB / 86,400 sec = 463 Gbps average
>
> **Summary:**
> - CDN handles: 35 Tbps peak
> - Origin egress: ~600 Gbps average, ~2 Tbps peak
> - Origin ingress: ~500 Gbps average, ~1.5 Tbps peak
>
> **Cost at $0.05/GB egress:**
> - CDN: 1 PB × 30 days × $0.02 = $600K/month
> - Origin (without CDN): 1 PB × 30 × $0.05 = $1.5M/month
>
> CDN saves ~$900K/month while improving latency."

---

## ────────────────────────────────────
## 7️⃣ Quick Reference
## ────────────────────────────────────

### Bandwidth Estimation Table

| Scenario | Ingress | Egress | Ratio |
|----------|---------|--------|-------|
| Video streaming | Low | Very High | 1:1000 |
| Photo app | Medium | High | 1:20 |
| Chat app | Medium | Medium | 1:1.5 |
| API service | Low | Medium | 1:5 |
| File backup | High | Low | 5:1 |
| IoT/telemetry | High | Very Low | 100:1 |

### Common Bitrates

| Content Type | Bitrate | Per Hour |
|--------------|---------|----------|
| Audio (MP3) | 128 Kbps | 57 MB |
| Audio (Hi-Fi) | 320 Kbps | 144 MB |
| Video 480p | 1 Mbps | 450 MB |
| Video 720p | 3 Mbps | 1.35 GB |
| Video 1080p | 5 Mbps | 2.25 GB |
| Video 4K | 15 Mbps | 6.75 GB |
| Video 4K HDR | 25 Mbps | 11.25 GB |

### Quick Formulas

```
Bandwidth (Gbps) = QPS × Response Size (KB) × 8 / 1,000,000

Daily Data = Bandwidth (Gbps) × 86,400 seconds × 0.125 (GB/Gbps)

Monthly Cost = Daily Data (TB) × 30 × Price per GB
```

---

## ────────────────────────────────────
## 8️⃣ Pseudocode: Bandwidth Calculator
## ────────────────────────────────────

```python
from dataclasses import dataclass
from enum import Enum
from typing import List

class TrafficDirection(Enum):
    INGRESS = "ingress"
    EGRESS = "egress"

@dataclass
class TrafficStream:
    name: str
    direction: TrafficDirection
    qps: float
    size_bytes: int
    cacheable: bool = False
    cache_hit_rate: float = 0.0

class BandwidthEstimator:
    def __init__(self):
        self.streams: List[TrafficStream] = []
        self.overhead_factor = 1.2  # Protocol overhead
        self.peak_multiplier = 3.0  # Peak vs average
    
    def add_stream(self, stream: TrafficStream):
        self.streams.append(stream)
    
    def calculate_bandwidth(self, stream: TrafficStream) -> dict:
        """Calculate bandwidth for a traffic stream."""
        # Raw bandwidth in bits per second
        raw_bps = stream.qps * stream.size_bytes * 8
        
        # Apply cache (for egress only)
        effective_bps = raw_bps
        cache_offload = 0
        if stream.cacheable and stream.direction == TrafficDirection.EGRESS:
            cache_offload = raw_bps * stream.cache_hit_rate
            effective_bps = raw_bps * (1 - stream.cache_hit_rate)
        
        # Apply overhead
        with_overhead = effective_bps * self.overhead_factor
        
        # Calculate peak
        peak_bps = with_overhead * self.peak_multiplier
        
        return {
            "name": stream.name,
            "direction": stream.direction.value,
            "raw_gbps": raw_bps / 1e9,
            "cache_offload_gbps": cache_offload / 1e9,
            "effective_gbps": effective_bps / 1e9,
            "with_overhead_gbps": with_overhead / 1e9,
            "peak_gbps": peak_bps / 1e9,
            "daily_tb": with_overhead * 86400 / 8 / 1e12
        }
    
    def estimate_all(self) -> dict:
        """Calculate bandwidth for all streams."""
        results = []
        total_ingress_avg = 0
        total_egress_avg = 0
        total_ingress_peak = 0
        total_egress_peak = 0
        total_cache_offload = 0
        
        for stream in self.streams:
            result = self.calculate_bandwidth(stream)
            results.append(result)
            
            if stream.direction == TrafficDirection.INGRESS:
                total_ingress_avg += result["with_overhead_gbps"]
                total_ingress_peak += result["peak_gbps"]
            else:
                total_egress_avg += result["with_overhead_gbps"]
                total_egress_peak += result["peak_gbps"]
                total_cache_offload += result["cache_offload_gbps"]
        
        return {
            "streams": results,
            "totals": {
                "ingress_avg_gbps": total_ingress_avg,
                "ingress_peak_gbps": total_ingress_peak,
                "egress_avg_gbps": total_egress_avg,
                "egress_peak_gbps": total_egress_peak,
                "cache_offload_gbps": total_cache_offload,
                "total_avg_gbps": total_ingress_avg + total_egress_avg,
                "total_peak_gbps": total_ingress_peak + total_egress_peak
            }
        }
    
    def estimate_costs(self, estimates: dict, 
                       ingress_price_per_gb: float = 0.0,
                       egress_price_per_gb: float = 0.05,
                       cdn_price_per_gb: float = 0.02) -> dict:
        """Estimate monthly bandwidth costs."""
        # Daily data in GB
        daily_ingress_gb = sum(
            r["daily_tb"] * 1024 
            for r in estimates["streams"] 
            if r["direction"] == "ingress"
        )
        daily_egress_gb = sum(
            r["daily_tb"] * 1024 
            for r in estimates["streams"] 
            if r["direction"] == "egress"
        )
        daily_cdn_gb = estimates["totals"]["cache_offload_gbps"] * 86400 / 8 * 1024 / 1e9
        
        # Monthly costs
        monthly_ingress = daily_ingress_gb * 30 * ingress_price_per_gb
        monthly_egress = daily_egress_gb * 30 * egress_price_per_gb
        monthly_cdn = daily_cdn_gb * 30 * cdn_price_per_gb
        
        return {
            "monthly_ingress_cost": monthly_ingress,
            "monthly_egress_cost": monthly_egress,
            "monthly_cdn_cost": monthly_cdn,
            "monthly_total": monthly_ingress + monthly_egress + monthly_cdn,
            "yearly_total": (monthly_ingress + monthly_egress + monthly_cdn) * 12
        }


# Example: Photo sharing app
estimator = BandwidthEstimator()

# API requests
estimator.add_stream(TrafficStream(
    name="API Requests",
    direction=TrafficDirection.INGRESS,
    qps=100_000,
    size_bytes=1024  # 1 KB
))

# API responses
estimator.add_stream(TrafficStream(
    name="API Responses",
    direction=TrafficDirection.EGRESS,
    qps=100_000,
    size_bytes=5 * 1024,  # 5 KB
    cacheable=False
))

# Photo uploads
estimator.add_stream(TrafficStream(
    name="Photo Uploads",
    direction=TrafficDirection.INGRESS,
    qps=5_000,  # 5K uploads/sec
    size_bytes=2 * 1024 * 1024  # 2 MB
))

# Photo downloads (cacheable)
estimator.add_stream(TrafficStream(
    name="Photo Downloads",
    direction=TrafficDirection.EGRESS,
    qps=500_000,  # 500K downloads/sec
    size_bytes=200 * 1024,  # 200 KB
    cacheable=True,
    cache_hit_rate=0.95
))

# Calculate
estimates = estimator.estimate_all()
costs = estimator.estimate_costs(estimates)

print("=== BANDWIDTH ESTIMATION ===")
for stream in estimates["streams"]:
    print(f"\n{stream['name']} ({stream['direction']}):")
    print(f"  Raw: {stream['raw_gbps']:.2f} Gbps")
    print(f"  Cache offload: {stream['cache_offload_gbps']:.2f} Gbps")
    print(f"  Effective: {stream['effective_gbps']:.2f} Gbps")
    print(f"  Peak: {stream['peak_gbps']:.2f} Gbps")
    print(f"  Daily: {stream['daily_tb']:.2f} TB")

print(f"\n=== TOTALS ===")
totals = estimates["totals"]
print(f"  Ingress: {totals['ingress_avg_gbps']:.2f} Gbps avg, {totals['ingress_peak_gbps']:.2f} Gbps peak")
print(f"  Egress: {totals['egress_avg_gbps']:.2f} Gbps avg, {totals['egress_peak_gbps']:.2f} Gbps peak")
print(f"  CDN offload: {totals['cache_offload_gbps']:.2f} Gbps")

print(f"\n=== COSTS ===")
print(f"  Monthly: ${costs['monthly_total']:,.2f}")
print(f"  Yearly: ${costs['yearly_total']:,.2f}")
```

---

**Next**: `24_Latency_Budgets.md` - Breaking down end-to-end latency requirements
