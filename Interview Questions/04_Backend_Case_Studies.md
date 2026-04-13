# 🏛️ PART 04 — Backend System Design Case Studies

> **25 complete system designs** | 10 from index + 15 high-frequency FAANG additions
> Each case study follows the interview framework: Requirements → Estimation → HLD → Deep Dive → Scaling

---

## 📚 Table of Contents

### Classic Case Studies (From Index)
- [1. URL Shortener (TinyURL)](#1-url-shortener-tinyurl)
- [2. Rate Limiter](#2-rate-limiter)
- [3. Notification System](#3-notification-system)
- [4. Messaging / Chat System (WhatsApp)](#4-messaging--chat-system-whatsapp)
- [5. Feed System (Social Media)](#5-feed-system-social-media)
- [6. Search System](#6-search-system)
- [7. File Storage System (Dropbox)](#7-file-storage-system-dropbox)
- [8. Video Streaming Platform (YouTube)](#8-video-streaming-platform-youtube)
- [9. Payment System](#9-payment-system)
- [10. Analytics / Metrics Platform](#10-analytics--metrics-platform)

### NEW High-Frequency FAANG Case Studies
- [11. Distributed Cache (Redis-like)](#11-distributed-cache-redis-like)
- [12. Task Scheduler / Job Queue](#12-task-scheduler--job-queue)
- [13. Email Service (SendGrid)](#13-email-service-sendgrid)
- [14. Ride-Sharing Service (Uber)](#14-ride-sharing-service-uber)
- [15. Key-Value Store (DynamoDB)](#15-key-value-store-dynamodb)
- [16. Web Crawler (Google)](#16-web-crawler-google)
- [17. Typeahead / Autocomplete](#17-typeahead--autocomplete)
- [18. Distributed Logging System (ELK)](#18-distributed-logging-system-elk)
- [19. Ad Click Aggregation (Google Ads)](#19-ad-click-aggregation-google-ads)
- [20. Proximity / Nearby Service (Yelp)](#20-proximity--nearby-service-yelp)
- [21. Hotel / Flight Booking (Booking.com)](#21-hotel--flight-booking-bookingcom)
- [22. Google Maps (Routing + Tiles)](#22-google-maps-routing--tiles)
- [23. Ticket Booking (BookMyShow)](#23-ticket-booking-bookmyshow)
- [24. Code Deployment System (CI/CD)](#24-code-deployment-system-cicd)
- [25. Pastebin / GitHub Gist](#25-pastebin--github-gist)

---
---

## 1. URL Shortener (TinyURL)

### Q1: Design a URL shortening service like TinyURL or Bit.ly

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Shorten a long URL → short URL; redirect short → long; custom aliases (optional); expiry (optional); analytics (click count)
- Non-Functional: 100M URLs/day created, 10B redirects/day, <10ms redirect latency, 99.99% availability, URLs shouldn't be guessable

**Estimation:**
- Write QPS: 100M / 86,400 ≈ 1,200 QPS (peak: ~3,600)
- Read QPS: 10B / 86,400 ≈ 116K QPS (peak: ~350K) → 100:1 read-write ratio
- Storage: 100M/day × 500 bytes × 365 × 5 years ≈ 91 TB
- Cache: Top 20% of URLs = 20M entries × 500 bytes ≈ 10 GB (fits in a single Redis node)

**High-Level Design:**
```
Client → API Gateway → URL Service → Database (PostgreSQL/DynamoDB)
                                    ↳ Cache (Redis) ← Read path
                                    ↳ Analytics Queue (Kafka)
```

**Deep Dive — Short Code Generation (3 approaches):**

| Approach | How | Pros | Cons |
|----------|-----|------|------|
| Base62 encoding of auto-increment ID | DB generates ID → encode to base62 | Simple, no collisions | Predictable, requires centralized ID generator |
| MD5/SHA256 hash + truncate | Hash URL → take first 7 chars | Distributed, no single point | Collisions possible, need collision resolution |
| Pre-generated key pool | Generate keys ahead in a KGS (Key Generation Service) | Fast, no collision at runtime | Requires KGS service, synchronization complexity |

**Recommended**: Pre-generated key pool for production scale
- KGS generates 7-char base62 keys (62^7 = 3.5 trillion unique keys — enough for centuries)
- KGS keeps unused keys in a DB. App servers request batches of 1000 keys at once
- Used keys moved to a "used" table. If KGS dies, some unused keys are lost (acceptable)

**Database Design:**
```sql
urls (
  short_code VARCHAR(7) PRIMARY KEY,  -- from KGS
  original_url TEXT NOT NULL,
  user_id BIGINT,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  click_count BIGINT DEFAULT 0
)
```

**Read Path (Redirect — latency critical):**
1. Client requests `short.url/abc1234`
2. Check Redis cache → if found, return 301/302 redirect (cache hit ~85%)
3. If cache miss → query PostgreSQL → return redirect + populate cache
4. Async: push click event to Kafka for analytics

**301 vs 302 redirect**: 301 (permanent) → browser caches, fewer server hits, but can't track analytics. 302 (temporary) → every click hits server, better analytics. **Choose 302** for analytics, 301 for cost optimization

**Follow-ups interviewer may ask:**
- "How do you handle custom aliases?" → Check uniqueness against DB. Reserve it. If taken, return error
- "How do you prevent abuse?" → Rate limiting per user/IP (token bucket). Block known spam domains. Require auth for high-volume usage
- "How do you handle expiry?" → TTL in cache. Background job cleans expired URLs from DB. Lazy deletion: check expiry on read, return 404 if expired
- "Scale to 1M writes/sec?" → Shard DB by short_code hash. Distribute KGS across regions. Use DynamoDB (auto-scales writes). Multi-region deployment
- "How do you make short URLs non-guessable?" → Use random base62 instead of sequential. The pre-generated pool approach already handles this
- "How would you add analytics?" → Kafka consumer processes click events → aggregate in ClickHouse/Druid → dashboard shows clicks per URL, geographic distribution, referrer, device type

🔥 **Most Important Questions**: Q1 (full design with KGS), 301 vs 302 trade-off
⚠️ **Common Mistakes**: Using MD5 hash without collision handling; not separating read/write paths; forgetting about analytics
🧠 **How to Answer**: Start with estimation (shows the system is read-heavy), then focus on the key generation approach — that's the unique part of this design

---

## 2. Rate Limiter

### Q1: Design a rate limiter that can handle millions of requests per second

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Limit requests per user/IP/API key. Configurable rules (100 req/min, 1000 req/hour). Return 429 Too Many Requests when limit exceeded
- Non-Functional: <1ms added latency per request, distributed (works across multiple servers), highly available, accurate counting

**Where to place it:**
- **API Gateway level** (recommended): Centralized, consistent, handles auth + rate limiting. AWS API Gateway, Kong, Envoy
- **Application level**: More control, can rate-limit specific business operations
- **Both**: Gateway for global limits, application for business-specific limits

**Algorithms (the core interview question):**

| Algorithm | How It Works | Pros | Cons |
|-----------|-------------|------|------|
| **Token Bucket** | Bucket holds tokens, refilled at fixed rate. Each request takes 1 token | Allows bursts, simple, memory efficient | Burst can overwhelm downstream |
| **Leaky Bucket** | Requests enter bucket, processed at fixed rate. Overflow rejected | Smooth output rate | No burst tolerance, queue adds latency |
| **Fixed Window** | Counter per time window (e.g., 0:00-0:59). Reset at window boundary | Simple, low memory | Boundary problem: 2x burst at window edge |
| **Sliding Window Log** | Store timestamp of each request. Count in sliding window | Accurate | High memory (stores every timestamp) |
| **Sliding Window Counter** | Weighted sum of current + previous window | Memory efficient + accurate | ~1% inaccuracy (acceptable) |

**Recommended**: Token Bucket (used by Stripe, AWS) or Sliding Window Counter (used by Cloudflare)

**Distributed Rate Limiting — the hard part:**
- **Centralized counter (Redis)**: All servers check/increment a shared counter in Redis
  - `INCR user:{id}:minute:{timestamp}` with TTL
  - Pros: Accurate, consistent
  - Cons: Redis becomes SPOF, network latency for every request
- **Local counters + sync**: Each server counts locally, periodic sync to central store
  - Pros: No latency penalty for reads
  - Cons: Inaccurate during sync intervals (may allow slight over-limit)
- **Race condition fix**: Use Redis `MULTI`/`EXEC` or Lua script for atomic check-and-increment:
  ```lua
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return current
  ```

**HLD:**
```
Client → Load Balancer → Rate Limiter (Redis check) → API Server → Backend
                              ↓
                        Rules Engine (config DB)
                              ↓
                        Redis Cluster (counters)
```

**Follow-ups interviewer may ask:**
- "What if Redis goes down?" → Fail open (allow requests) vs fail closed (block all). Typically fail open — a brief period without rate limiting is better than blocking all traffic
- "How do you handle distributed rate limiting across regions?" → Each region has its own Redis. Accept slight over-limit globally. For strict global limits, use a centralized Redis with higher latency trade-off
- "How do you configure rules?" → YAML/JSON config in a rules DB. Rules like: `{ api: "/api/search", limit: 100, window: "1m", key: "user_id" }`. Hot reload without restart
- "How do you inform the client?" → Response headers: `X-RateLimit-Limit: 100`, `X-RateLimit-Remaining: 43`, `X-RateLimit-Reset: 1620000060`. Return 429 with `Retry-After` header
- "Rate limiting for different tiers?" → Bronze: 100 req/min. Silver: 1,000. Gold: 10,000. Key by API key tier. Store tier in user metadata

🔥 **Most Important Questions**: Q1 (algorithm comparison + distributed Redis approach)
⚠️ **Common Mistakes**: Not addressing the distributed case; not handling the race condition; using only fixed window
🧠 **How to Answer**: Compare 2-3 algorithms quickly, pick Token Bucket, then spend most time on the distributed Redis implementation

---

## 3. Notification System

### Q1: Design a notification system that supports push, email, and SMS at scale

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Send push notifications (iOS/Android), email, SMS. User preferences (opt-in/out per channel). Templated messages. Scheduling. Priority levels
- Non-Functional: 10M+ notifications/day, delivery within 5 seconds for real-time, at-least-once delivery, track delivery status

**HLD:**
```
Trigger Source → Notification Service → Priority Queue (Kafka)
                                            ↓
                   ┌─────────────────┬──────┴──────┬─────────────┐
                   Push Worker       Email Worker   SMS Worker
                   (APNs/FCM)        (SES/SendGrid) (Twilio)
                                            ↓
                              Delivery Tracker → Analytics DB
```

**Key Components:**
1. **Notification Service**: Receives requests, validates, checks user preferences, templates the message, routes to appropriate queue
2. **Priority Queue**: High priority (auth codes, password reset) → fast lane. Low priority (marketing) → slow lane. Use separate Kafka topics per priority
3. **Workers per channel**: Each channel has independent workers. Push worker talks to APNs/FCM. Email worker talks to SES. SMS worker talks to Twilio
4. **Delivery Tracker**: Track delivery status — queued, sent, delivered, failed, bounced. Store in Cassandra for time-series queries
5. **User Preference Service**: What channels does the user want? Quiet hours? Frequency caps?

**Deep Dive — Reliability:**
- **At-least-once delivery**: Messages in Kafka are durable. Workers ack only after successful vendor API call. If worker dies, message is re-delivered
- **Deduplication**: Each notification gets a unique `notification_id`. Workers check a dedup cache (Redis with TTL) before sending. Prevents duplicate push/email/SMS
- **Retry with backoff**: If vendor API fails → retry 3 times with exponential backoff (1s, 4s, 16s). After that → move to dead letter queue (DLQ) for manual investigation
- **Circuit breaker**: If APNs is returning 500s for >50% of requests → trip circuit breaker → stop sending → retry after 30 seconds

**Follow-ups interviewer may ask:**
- "How do you handle 100M notifications for a flash sale?" → Pre-generate messages in batch. Distribute across 100+ workers. Stagger delivery over 5-10 minutes to avoid overwhelming vendor APIs
- "How do you track delivery?" → Push: FCM/APNs provides delivery receipts. Email: SES provides sent/delivered/bounced/complained webhooks. SMS: Twilio provides status callbacks. Store all in analytics DB
- "How do you prevent notification fatigue?" → Frequency capping: max 5 push/day per user. Digest mode: batch low-priority notifications into daily summary. Smart sending: ML model for optimal send time
- "How do you handle template rendering?" → Handlebars/Mustache template engine. Template stored in DB: "Hi {{name}}, your order {{order_id}} has shipped". Variables injected at send time
- "International notifications?" → i18n templates per locale. Time-zone aware scheduling. Character encoding (UTF-8). SMS character limits differ by encoding (160 ASCII vs 70 Unicode)

🔥 **Most Important Questions**: Q1 (multi-channel architecture with priority queues)
⚠️ **Common Mistakes**: Not handling failures/retries; treating all notifications the same priority; forgetting user preferences
🧠 **How to Answer**: Draw the fan-out architecture (one service → multiple channel workers), then deep-dive on reliability

---

## 4. Messaging / Chat System (WhatsApp)

### Q1: Design a messaging system like WhatsApp supporting 1B+ users

**Answer (Interview-Ready):**

**Requirements:**
- Functional: 1-on-1 chat, group chat (up to 500 members), sent/delivered/read receipts, media sharing, online/offline status
- Non-Functional: <500ms message delivery, 99.99% availability, end-to-end encryption, support offline users (deliver when back online), message ordering within a conversation

**Estimation:**
- 500M DAU × 40 messages/day = 20B messages/day
- Write QPS: 20B / 86,400 ≈ 231K QPS
- Storage: 20B × 100 bytes = 2 TB/day raw → with replication = 6 TB/day
- Connections: 500M concurrent WebSocket connections (at peak)

**HLD:**
```
Sender → WebSocket Gateway → Chat Service → Message Queue (Kafka)
                                                    ↓
                                   Message Storage (Cassandra)
                                                    ↓
                                   Receiver's WebSocket Gateway → Receiver
                                   (or Push Notification if offline)
```

**Deep Dive — Message Delivery:**

1. **Sender sends message** via WebSocket to their connected gateway server
2. **Chat Service** validates, generates `message_id` (Snowflake ID for ordering), stores in Cassandra
3. **Lookup receiver's gateway server** from a presence service (Redis: `user_id → gateway_server_id`)
4. **If receiver online**: Route message to receiver's gateway → push via WebSocket
5. **If receiver offline**: Store in "undelivered" queue. When receiver connects, flush all pending messages
6. **Receipts**: Sent (✓ when stored), Delivered (✓✓ when receiver's device acks), Read (blue ✓✓ when user opens chat)

**Group Chat:**
- Small groups (<100): Fan-out on write — sender's service writes one message per member to their inbox
- Large groups (100-500): Fan-out on read — store one copy, members fetch on demand
- **Trade-off**: Fan-out on write is faster for readers but expensive for writers in large groups

**Data Model (Cassandra — optimized for time-series chat):**
```
messages_by_conversation (
  conversation_id UUID,
  message_id BIGINT,         -- Snowflake ID (sortable by time)
  sender_id UUID,
  content TEXT,
  media_url TEXT,
  created_at TIMESTAMP,
  PRIMARY KEY (conversation_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);
```

**Handling 500M concurrent connections:**
- Each gateway server handles ~100K WebSocket connections
- Need ~5,000 gateway servers
- Use consistent hashing to map users to gateway servers
- Service discovery via ZooKeeper/etcd

**Follow-ups interviewer may ask:**
- "How does end-to-end encryption work?" → Signal Protocol. Each user has a public/private key pair. Messages encrypted with receiver's public key on sender's device. Server never sees plaintext. Key exchange via X3DH (Extended Triple Diffie-Hellman)
- "How do you handle message ordering?" → Snowflake IDs are time-sortable. Within a conversation, messages are ordered by `message_id`. Cross-device ordering uses vector clocks
- "How do you sync across devices?" → Each device has a last-synced `message_id`. On connect, fetch all messages with ID > last-synced. Use pagination for large backlogs
- "How do you handle media?" → Upload media to S3 → generate URL → send URL in message → receiver downloads from S3/CDN. Thumbnail generated asynchronously. Original stored encrypted
- "What about message deletion?" → Soft delete: mark as deleted, hide from clients. Hard delete: overwrite content. "Delete for everyone" requires sending a delete signal to all recipients' devices

🔥 **Most Important Questions**: Q1 (full design with delivery flow + group chat fan-out)
⚠️ **Common Mistakes**: Not addressing offline users; ignoring message ordering; underestimating connection count
🧠 **How to Answer**: Focus on the message delivery flow (online vs offline) and the group chat fan-out trade-off

---

## 5. Feed System (Social Media)

### Q1: Design a social media feed like Twitter/Instagram

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Users follow others. Home feed shows posts from followed users, ranked by relevance. Post creation (text, image, video). Like, comment, share
- Non-Functional: Feed loads in <500ms, 500M DAU, 100K+ QPS for feed reads, eventually consistent (can be 5-10s stale)

**The Central Question — Feed Generation Approach:**

| Approach | How | Best For | Weakness |
|----------|-----|----------|----------|
| **Fan-out on Write (Push)** | When user posts, write to every follower's feed cache | Users with <10K followers (99% of users) | Celebrity with 100M followers → 100M writes per post |
| **Fan-out on Read (Pull)** | When user opens feed, query posts from all followed users | Users with millions of followers | Slow — need to merge N timelines in real-time |
| **Hybrid (Twitter's approach)** | Push for regular users, Pull for celebrities | Production at scale | Complex to implement |

**Hybrid approach (recommended):**
1. When a regular user posts → fan-out to all followers' feeds in cache (Redis sorted set)
2. When a celebrity posts → store in celebrity posts table only
3. When a user opens feed → fetch pre-built feed from cache + merge in celebrity posts in real-time → rank → return top N

**HLD:**
```
Post Creation:
User → Post Service → Posts DB (write)
                     → Fan-out Service → Kafka → Feed Workers → Redis (per-user feed cache)

Feed Read:
User → Feed Service → Redis (pre-built feed) + Celebrity Posts DB → Merge + Rank → Return
```

**Feed Ranking:**
- Simple: Reverse chronological (newest first)
- ML-based: Score = f(recency, engagement, user affinity, content type). Features: time since post, likes/comments, poster-viewer interaction history, content type preference
- **Trade-off**: Chronological is simple but lower engagement. ML-ranked is complex but increases time-on-platform by 20-30%

**Data Model:**
```sql
-- Posts table
posts (post_id, user_id, content, media_urls, created_at, like_count, comment_count)

-- Feed cache (Redis sorted set per user)
feed:{user_id} → sorted set of (post_id, score/timestamp)
-- Each user's feed stores the top 800 post IDs
```

**Follow-ups interviewer may ask:**
- "How do you handle a celebrity with 100M followers who posts 10 times/day?" → Pull model for celebrities. Follower count threshold (e.g., >100K followers = celebrity). Their posts are fetched and merged at read time
- "How do you handle the feed for a new user?" → Cold start: show trending/popular posts. As they follow people, gradually build their feed
- "How do you implement infinite scroll?" → Cursor-based pagination. Client sends `last_post_id`, server returns next 20 posts after that ID. No double posts, handles new posts arriving
- "How do you count likes in real-time?" → Redis `INCR` for approximate real-time count. Periodic flush to DB for durability. Show approximate ("10K likes" not "10,247")
- "Feed consistency during deployment?" → Blue-green deployment. Feed cache is persistent (Redis with AOF). Workers can be restarted without losing feed state

🔥 **Most Important Questions**: Q1 (push vs pull vs hybrid)
⚠️ **Common Mistakes**: Using only push or only pull; not addressing the celebrity problem; not mentioning ranking
🧠 **How to Answer**: The hybrid approach is THE answer. Start with explaining why pure push/pull fail, then present hybrid

---

## 6. Search System

### Q1: Design a search system like Google Search or Elasticsearch

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Full-text search across billions of documents. Ranked results. Autocomplete/typeahead. Spell correction. Filters and facets
- Non-Functional: <200ms query latency, 100K+ QPS, index billions of documents, near-real-time indexing (new content searchable within minutes)

**Core Concept — Inverted Index:**
```
Forward Index:  doc1 → ["system", "design", "interview"]
                doc2 → ["design", "patterns", "java"]

Inverted Index: "system"    → [doc1]
                "design"    → [doc1, doc2]
                "interview" → [doc1]
                "patterns"  → [doc2]
                "java"      → [doc2]
```
- Search for "design" → instantly returns [doc1, doc2] from inverted index
- Without inverted index, every search would scan every document (O(N)). With it, O(1) lookup

**HLD:**
```
Query → Query Parser → Search Service → Index Shards (parallel query) → Merge + Rank → Return

Document Ingestion:
New Doc → Ingestion Queue (Kafka) → Indexer → Index Shards (inverted index)
```

**Search Pipeline:**
1. **Query Parser**: Tokenize, remove stop words, stem/lemmatize, handle operators ("AND", "OR", quotes for exact match)
2. **Index Lookup**: Fan out query to all index shards in parallel
3. **Scoring/Ranking**: TF-IDF or BM25 for relevance. PageRank for authority. Freshness boost. Personalization
4. **Merge**: Collect top-K results from each shard → global top-K
5. **Post-processing**: Snippet generation, spell check suggestions, related searches

**Sharding the Index:**
- **By document ID**: Each shard has all terms for a subset of documents. Query goes to ALL shards → merge
- **By term**: Each shard owns a subset of terms. Query goes to specific shards. Better locality but hotspot risk ("the" is in every query)
- **Recommended**: By document ID (simpler, used by Elasticsearch)

**Follow-ups interviewer may ask:**
- "How does autocomplete work?" → Trie data structure in memory. As user types, traverse trie to find top completions. Precomputed from query logs. Updated daily. Served from edge cache for lowest latency
- "How do you handle typos?" → Edit distance (Levenshtein). Precomputed correction dictionary from query logs. "Did you mean: system design?" → if original query has <10 results and correction has >1000
- "Near-real-time indexing?" → New documents → Kafka → Indexer creates segment in memory (searchable immediately). Periodically flush to disk and merge with main index. Similar to LSM-tree approach
- "How does Google handle billions of documents?" → Thousands of index shards across data centers. Each query fans out to all shards in parallel. Response time = slowest shard (tail latency management)
- "How do you prevent search abuse?" → Rate limiting per user. Block known bot patterns. CAPTCHA for suspicious volume. Query complexity limits

🔥 **Most Important Questions**: Q1 (inverted index + sharding)
⚠️ **Common Mistakes**: Not explaining inverted index; not addressing how ranking works; forgetting about index updates
🧠 **How to Answer**: Draw the inverted index first (the key insight), then the search pipeline, then sharding

---

## 7. File Storage System (Dropbox)

### Q1: Design a cloud file storage system like Dropbox or Google Drive

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Upload/download files, sync across devices, file versioning, sharing (links, permissions), folder hierarchy
- Non-Functional: Support files up to 10GB, 500M users, 99.99% availability, strong consistency for metadata, eventual consistency for file content across devices

**The Key Insight — Chunking:**
- Don't upload a 5GB file as one blob. Split into fixed-size chunks (4MB each)
- Benefits: (1) Resume interrupted uploads (re-upload only failed chunks), (2) Deduplication (same chunk in different files stored once), (3) Delta sync (if 1 byte changes in a 5GB file, re-upload only the changed chunk)
- **Chunking algorithm**: Rolling hash (Rabin fingerprint) for content-defined chunking. Boundaries based on content, not position → better dedup

**HLD:**
```
Client → API Server → Metadata Service → Metadata DB (PostgreSQL)
    ↓
    → Upload Service → Block Storage (S3)
    ↓
    → Sync Service (WebSocket) ← Notification Service (Kafka)
```

**Upload Flow:**
1. Client splits file into 4MB chunks, computes hash for each
2. Client asks server: "Which chunks do you already have?" (dedup check)
3. Upload only new chunks to Block Storage (S3)
4. Update metadata: file → list of chunk hashes → version number
5. Sync Service notifies other devices via WebSocket

**Sync Protocol:**
- Each device maintains a local snapshot of file metadata (SQLite DB)
- On change: compare local snapshot with server → compute diff → upload/download changed chunks
- Conflict resolution: Last-writer-wins for most cases. Create "conflicted copy" for simultaneous edits to same file

**Metadata Schema:**
```sql
files (file_id, name, parent_folder_id, user_id, latest_version, size, created_at, updated_at)
file_versions (file_id, version, chunk_list JSONB, created_at, created_by)
chunks (chunk_hash PRIMARY KEY, size, storage_url, ref_count)
```

**Follow-ups interviewer may ask:**
- "How does deduplication work?" → SHA-256 hash of each chunk. Before storing, check if chunk_hash exists. If yes, just increment ref_count. Across ALL users — if 1M users upload the same PDF, it's stored once
- "How do you handle versioning?" → Each file has a version history. Each version points to a list of chunk hashes. Rolling back = pointing latest_version to an older version's chunk list. Storage cost: only delta chunks between versions
- "How do you handle large file upload reliability?" → Resumable uploads. Client tracks which chunks uploaded. On failure, resume from next unchunked chunk. Each chunk upload is idempotent (based on hash)
- "How do you scale to petabytes?" → S3 handles the actual storage (virtually unlimited). Metadata DB: shard by user_id. Chunk dedup index: distributed hash table
- "How do you handle sharing?" → Sharing = granting access to file_id for another user_id. Permission levels: view, edit, admin. Shared files don't duplicate storage — they reference the same chunks

🔥 **Most Important Questions**: Q1 (chunking + dedup + sync)
⚠️ **Common Mistakes**: Treating files as single blobs; not mentioning deduplication; ignoring multi-device sync
🧠 **How to Answer**: The chunking insight is the key differentiator. Start there, then build the sync protocol

---

## 8. Video Streaming Platform (YouTube)

### Q1: Design a video streaming platform like YouTube or Netflix

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Upload videos, transcode to multiple resolutions, stream with adaptive bitrate, search, recommendations, comments, likes
- Non-Functional: <2s start time for playback, support 1B DAU, 500 hours of video uploaded per minute, CDN delivery globally, 99.99% availability

**Estimation:**
- Storage: 500 hrs/min × 60 min/hr × 24 hr × 365 days = 263M hours/year. At 1 GB/hr (compressed) × 5 resolutions = 1.3 PB/year
- Streaming bandwidth: 100M concurrent viewers × 4 Mbps = 400 Tbps (must use CDN)

**HLD:**
```
Upload Path:
Creator → Upload Service → Object Storage (S3) → Transcoding Pipeline (Kafka + FFmpeg workers) → CDN

Watch Path:
Viewer → CDN (cache hit 95%+) → Origin Storage (S3)
Viewer → API Server → Video Metadata DB → Return video URL + metadata
```

**Transcoding Pipeline (the hard part):**
1. User uploads original video to S3
2. Upload triggers message to Kafka
3. **Transcoding workers** (hundreds of EC2 instances with FFmpeg):
   - Split video into segments (10s each) for parallel processing
   - Encode each segment in multiple resolutions: 240p, 360p, 480p, 720p, 1080p, 4K
   - Encode in multiple codecs: H.264 (compatibility), H.265 (better compression), VP9 (royalty-free), AV1 (best compression)
   - Generate thumbnails at key frames
4. Output: HLS/DASH manifest file pointing to segmented video files in S3
5. Push to CDN for distribution

**Adaptive Bitrate Streaming (ABR):**
- Client starts playing at medium quality
- Measures download speed continuously
- If bandwidth drops → switches to lower resolution seamlessly (no rebuffer)
- If bandwidth increases → switches to higher resolution
- Protocol: HLS (Apple) or DASH (Google). Both use segment-based approach with manifest files

**Follow-ups interviewer may ask:**
- "How does the CDN handle this?" → Videos cached at edge locations worldwide. Popular videos (<1% of catalog) = 80% of views → hot cache. Long-tail videos served from origin
- "How do you handle copyright?" → Content ID system: fingerprint every uploaded video + compare against known copyrighted content database. If match found, block or monetize for rights holder
- "How do you reduce storage costs?" → Cold storage for old videos with <10 views/month. Remove low-quality encodings for unpopular videos. AV1 codec reduces bitrate by 30% vs H.264
- "Live streaming?" → Different pipeline: Ingest (RTMP from broadcaster) → Transcode in real-time → Segment → CDN → Viewers. Latency target: 5-15s for standard live, <2s for ultra-low-latency (WebRTC)
- "Recommendations?" → Collaborative filtering (users who watched X also watched Y) + content-based (similar metadata/tags) + deep learning (YouTube's two-tower model). Serve from a precomputed candidate set

🔥 **Most Important Questions**: Q1 (transcoding pipeline + ABR)
⚠️ **Common Mistakes**: Ignoring the transcoding pipeline; not mentioning CDN; not discussing multiple resolutions
🧠 **How to Answer**: Draw two paths clearly — upload path (with transcoding) and watch path (with CDN). The transcoding pipeline is the unique challenge

---

## 9. Payment System

### Q1: Design a payment system like Stripe or PayPal

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Process payments (credit card, bank transfer, wallet), refunds, payment history, receipts, merchant settlement
- Non-Functional: **Exactly-once processing** (most critical — no double-charging), strong consistency, PCI DSS compliance, 99.999% availability for payment processing, <1s transaction time

**The #1 Principle: Idempotency**
- Payment systems must NEVER process the same payment twice
- Every payment request from client includes an `idempotency_key` (UUID)
- Server checks: has this idempotency_key been processed? If yes → return cached result. If no → process and store result
- This handles retries, network failures, and duplicate submissions safely

**HLD:**
```
Client → Payment Service → Payment Gateway (Stripe API)
              ↓                        ↓
        Payment DB (PostgreSQL)   External Bank/Card Network
              ↓
        Ledger Service (double-entry bookkeeping)
              ↓
        Settlement Service (pays merchants)
```

**Payment Flow (the critical path):**
1. Client sends payment request with `idempotency_key`
2. Payment Service creates record with status `PENDING`
3. Calls Payment Gateway (Stripe/Adyen) → gateway talks to card network → returns success/failure
4. Update status to `COMPLETED` or `FAILED`
5. Write to ledger (double-entry: debit buyer account, credit merchant account)
6. Return result to client
7. Async: send receipt email, update analytics

**Handling Failures:**
- Payment Service crashes after calling gateway but before updating DB → On restart, reconcile with gateway using `idempotency_key`
- Gateway times out → Don't retry immediately (might double-charge). Query gateway for payment status first
- DB write fails → Retry with same idempotency_key. Gateway returns cached result

**Double-Entry Ledger (auditing foundation):**
```
Every transaction creates 2 entries:
  DEBIT:  buyer_account  - $100
  CREDIT: merchant_account + $100
Sum of all entries MUST always be 0. If not, there's a bug.
```

**Follow-ups interviewer may ask:**
- "How do you handle refunds?" → Create reverse ledger entries (debit merchant, credit buyer). Call gateway refund API. Idempotent with same pattern
- "How do you prevent fraud?" → ML model scoring transactions (amount, location, velocity, device). Rules engine (first transaction > $1000 → flag). 3D Secure for high-risk transactions
- "PCI DSS compliance?" → Never store raw card numbers. Use tokenization — gateway returns a token. Store token, not card data. Use separate PCI-compliant environment for any card data processing
- "Reconciliation?" → Daily batch job compares your ledger with bank/gateway statements. Flag discrepancies for manual review. This is the "last line of defense" against bugs
- "Multi-currency?" → Store amounts in smallest unit (cents) to avoid floating point. Convert using exchange rate at transaction time. Store both original and converted amounts

🔥 **Most Important Questions**: Q1 (idempotency + double-entry ledger)
⚠️ **Common Mistakes**: Not emphasizing idempotency; using floating point for money; not mentioning PCI compliance
🧠 **How to Answer**: Start with "The #1 requirement for a payment system is exactly-once processing via idempotency" — that immediately signals seniority

---

## 10. Analytics / Metrics Platform

### Q1: Design an analytics platform like Google Analytics or Mixpanel

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Collect events (page views, clicks, custom events), real-time dashboards, historical analysis, funnels, cohort analysis, segmentation
- Non-Functional: Handle 100K+ events/second ingestion, query response <5s for dashboards, data retention 2 years, eventual consistency acceptable, cost-efficient storage

**The Challenge:** Write-heavy system with complex read queries on massive datasets

**HLD:**
```
SDK (browser/mobile) → Event Collector (API) → Kafka → Stream Processor (Flink/Spark)
                                                              ↓
                                               ┌──────────────┴──────────────┐
                                         Real-Time Store              Batch Store
                                         (Redis/Druid)               (ClickHouse/BigQuery)
                                               ↓                          ↓
                                         Real-Time Dashboard        Historical Queries
```

**Ingestion Pipeline:**
1. SDK sends events as JSON: `{ user_id, event_type, properties, timestamp, session_id, device_info }`
2. Event Collector validates, enriches (geo-IP, device parsing), writes to Kafka
3. Kafka partitioned by `user_id` for ordering within user sessions
4. Stream processor: real-time aggregations (active users now, events/minute)
5. Batch processor: writes raw events to columnar store for historical queries

**Storage — Why Columnar?**
- Analytics queries scan millions of rows but few columns: "COUNT events WHERE event_type = 'purchase' AND date BETWEEN '2024-01-01' AND '2024-01-31'"
- Columnar DBs (ClickHouse, BigQuery, Druid) store each column separately → read only needed columns → 10-100x faster than row-based
- Compression: similar values in a column compress extremely well (90%+ compression ratio)

**Real-Time vs Batch Processing:**
| | Real-Time (Lambda: speed layer) | Batch (Lambda: batch layer) |
|---|---|---|
| Latency | Seconds | Hours |
| Accuracy | Approximate | Exact |
| Store | Redis, Druid | ClickHouse, BigQuery |
| Use case | "Active users right now" | "Monthly funnel analysis" |

**Follow-ups interviewer may ask:**
- "How do you handle 100K events/sec?" → Kafka handles ingestion easily (millions/sec). Batch writes to ClickHouse in chunks of 10K events. Partition tables by date for fast range queries
- "How do you track unique users?" → HyperLogLog for approximate unique counts (1.5% error, constant memory). Exact counts stored in ClickHouse for precise queries
- "How do you build funnels?" → Store events with session_id and timestamp. Query: "Users who did A, then B, then C within 7 days." Window functions in ClickHouse handle this efficiently
- "How do you handle PII?" → Hash user IDs at collection time. Separate PII store with restricted access. GDPR: support "right to erasure" — delete user's events from all stores
- "How do you prevent event loss?" → SDK buffers events locally (IndexedDB). Retries failed sends. Server-side: Kafka replication factor 3. Consumer offsets committed after processing

🔥 **Most Important Questions**: Q1 (Lambda architecture + columnar storage)
⚠️ **Common Mistakes**: Using a row-based DB for analytics; not separating real-time and batch paths; ignoring data volume
🧠 **How to Answer**: Emphasize the write-heavy nature and why columnar storage is essential. The Lambda architecture (real-time + batch) is the key pattern

---
---

# NEW HIGH-FREQUENCY FAANG CASE STUDIES

---

## 11. Distributed Cache (Redis-like)

### Q1: Design a distributed caching system like Redis or Memcached

**Answer (Interview-Ready):**

**Requirements:**
- Functional: GET/SET/DELETE with TTL, support complex data structures (strings, hashes, lists, sorted sets), pub-sub
- Non-Functional: <1ms read latency, 1M+ QPS per node, horizontal scaling, high availability, data persistence optional

**Core Design Decisions:**

**1. Data Partitioning (Sharding):**
- **Consistent hashing with virtual nodes**: Each physical node mapped to 100-200 virtual nodes on hash ring
- Key → hash → map to nearest virtual node on ring → route to physical node
- Adding/removing a node only moves ~1/N of keys (minimal disruption)

**2. Replication:**
- Each key replicated to N nodes (typically 3) — primary + 2 replicas
- **Async replication** for speed (Redis default) — risk of losing last few writes on primary failure
- **Sync replication** for durability — every write waits for majority ack (slower, but data-safe)

**3. Eviction Policies:**
| Policy | Description | Best For |
|--------|-------------|----------|
| LRU | Evict least recently used | General purpose cache |
| LFU | Evict least frequently used | Skewed access patterns |
| TTL | Evict expired keys first | Time-sensitive data |
| Random | Evict random key | Simple, surprisingly effective |

**4. Persistence (optional):**
- **RDB snapshots**: Periodic full dump to disk. Fast recovery but may lose recent data
- **AOF (Append Only File)**: Log every write. Slower but minimal data loss. Can compact periodically
- **Hybrid**: RDB for fast recovery + AOF for completeness (Redis 7+ default)

**HLD:**
```
Client → Client Library (consistent hashing) → Cache Node (primary)
                                                      ↓
                                              Replica Nodes (async replication)
                                              
Cluster Manager (sentinel/gossip protocol) → Monitors health → Triggers failover
```

**Follow-ups interviewer may ask:**
- "Cache stampede — what is it and how do you prevent it?" → Popular key expires → 1000 concurrent requests hit DB simultaneously → DB overloaded. Solutions: (1) Lock: first request locks, others wait. (2) Early refresh: refresh before TTL. (3) Jittered TTL: add random seconds to TTL to stagger expiry
- "How does Redis Cluster handle failover?" → Sentinel or Cluster mode. Sentinel monitors primary. If primary unreachable for N seconds, sentinel promotes a replica. Clients get redirected (`MOVED` response). Failover time: 15-30 seconds
- "Hot key problem?" → One key gets 90% of traffic → one node overloaded. Solutions: (1) Read replicas for that key, (2) Client-side caching, (3) Shard the hot key (key_1, key_2, key_3 with random suffix)
- "Memory management?" → Set maxmemory policy. When memory full, eviction kicks in. Monitor memory fragmentation ratio. Use quicklist (linked list of ziplists) for memory efficiency

🔥 **Most Important Questions**: Q1 (consistent hashing + eviction + stampede)
⚠️ **Common Mistakes**: Not addressing cache stampede; using naive modular hashing instead of consistent hashing; ignoring replication
🧠 **How to Answer**: Consistent hashing is the centerpiece. Draw the hash ring, then discuss eviction and replication

---

## 12. Task Scheduler / Job Queue

### Q1: Design a distributed task scheduler like Celery or AWS SQS

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Submit tasks (immediate or scheduled), priority-based execution, retries on failure, task status tracking, recurring tasks (cron-like)
- Non-Functional: At-least-once execution, <100ms scheduling latency, handle 1M+ tasks/day, no task loss, horizontal scaling of workers

**HLD:**
```
Task Submitter → Task Service → Task Queue (Redis/Kafka)
                      ↓                    ↓
               Task DB (PostgreSQL)    Worker Pool (N workers)
                      ↓                    ↓
               Scheduler (cron)      Dead Letter Queue (DLQ)
```

**Key Components:**
1. **Task Service**: Accepts task submissions, validates, schedules
2. **Task Queue**: Immediate tasks → Kafka/Redis queue. Scheduled tasks → sorted set (Redis ZADD with execute_at as score)
3. **Scheduler**: Polls scheduled tasks every second. If `execute_at <= now`, move to active queue
4. **Workers**: Pull tasks from queue, execute, report status
5. **DLQ**: Tasks that fail after max retries → moved here for investigation

**Scheduled Tasks — How?**
```
Redis Sorted Set:
  ZADD scheduled_tasks <execute_timestamp> <task_id>
  
Scheduler loop (every 1s):
  tasks = ZRANGEBYSCORE scheduled_tasks 0 <now>
  for task in tasks:
    move to active queue
    ZREM scheduled_tasks task
```

**Exactly-Once Execution (the hard part):**
- **Problem**: Worker crashes after completing task but before ACK → task re-delivered → executed twice
- **Solution**: Make tasks idempotent + use visibility timeout
  1. Worker takes task → task becomes "invisible" for N minutes
  2. Worker completes → ACK → task deleted permanently
  3. Worker crashes → after timeout, task becomes visible again → another worker picks it up
  4. Task handler must be idempotent (use task_id as dedup key)

**Follow-ups interviewer may ask:**
- "How do you handle priority?" → Multiple queues: HIGH, MEDIUM, LOW. Workers check HIGH first, then MEDIUM, then LOW. Or weighted: 60% capacity on HIGH, 30% MEDIUM, 10% LOW
- "Recurring tasks (cron)?" → Store cron expression in DB. Scheduler evaluates cron expressions every minute. Generates next execution time. Creates new task instance. Handles: what if scheduler misses a tick? → Catch-up mode
- "How do you scale workers?" → Auto-scale based on queue depth. If pending tasks > threshold → add workers. Use Kubernetes HPA or AWS auto-scaling
- "How do you prevent task starvation?" → Age-based priority boost. Tasks waiting >5 min get priority bumped. Also: per-tenant fair scheduling (round-robin across tenants)

🔥 **Most Important Questions**: Q1 (scheduled execution + idempotency)
⚠️ **Common Mistakes**: Not making tasks idempotent; confusing at-least-once with exactly-once; ignoring the visibility timeout pattern
🧠 **How to Answer**: Focus on scheduled task execution (Redis sorted set trick) and the idempotency requirement

---

## 13. Email Service (SendGrid)

### Q1: Design an email delivery service like SendGrid or Amazon SES

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Send transactional and marketing emails, templates, attachments, tracking (open, click), bounce handling, unsubscribe
- Non-Functional: Send 1B+ emails/day, delivery within 30 seconds for transactional, high deliverability (>95% inbox rate), GDPR compliant

**HLD:**
```
Client API → Validation & Rate Limiting → Priority Queue (Kafka)
                                               ↓
                                    ┌──────────┴──────────┐
                              Transactional Queue    Marketing Queue
                                    ↓                     ↓
                              SMTP Workers (high priority)  SMTP Workers (throttled)
                                    ↓
                              Recipient MTA (Gmail, Outlook)
                                    ↓
                              Webhook Processor ← Bounce/complaint notifications
```

**Deliverability — the critical challenge:**
- **IP Reputation**: Sending IPs must be "warmed up" — start sending 100/day, gradually increase to millions. New IPs sending millions immediately = instant blacklist
- **Authentication**: SPF (authorized senders), DKIM (signed content), DMARC (policy) — all three mandatory for inbox delivery
- **Bounce Handling**: Hard bounces (invalid address) → remove from list immediately (sending to invalid addresses tanks reputation). Soft bounces (mailbox full) → retry 3 times over 72 hours
- **Complaint Handling**: If user marks as spam → feedback loop from ISP → immediately unsubscribe user + reduce sending to that domain

**Tracking:**
- **Open tracking**: Inject invisible 1×1 pixel image `<img src="track.sendgrid.com/open?id=xxx">`. When user's email client loads the image → record "opened"
- **Click tracking**: Replace all links with tracking redirects. `<a href="track.sendgrid.com/click?id=xxx&url=original">`. Click → record event → redirect to original URL

**Follow-ups interviewer may ask:**
- "How do you send 1B emails/day?" → Distributed SMTP workers across IP pools. Throttle per-domain (Gmail limits ~500/hr per IP). With 500 IPs → 250K/hr to Gmail alone. Pool management is the scaling bottleneck
- "How do you handle templates?" → Handlebars/Liquid templating. Template compiled once, cached. Variables injected at send time. Support conditional blocks, loops for dynamic content
- "Marketing vs transactional — why separate?" → Different SLAs (transactional = immediate, marketing = can be batched). Different IP pools (marketing generates more complaints → protect transactional IP reputation). Different throttling rules

🔥 **Most Important Questions**: Q1 (deliverability + IP reputation)
⚠️ **Common Mistakes**: Ignoring deliverability; treating email as simple API call; not separating transactional vs marketing
🧠 **How to Answer**: Deliverability is the unique challenge. Any system can send an email; getting it to the inbox is the hard part

---

## 14. Ride-Sharing Service (Uber)

### Q1: Design a ride-sharing system like Uber or Lyft

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Rider requests ride, system matches with nearby driver, real-time tracking, fare calculation, payment, rating
- Non-Functional: Match within 10 seconds, handle 20M rides/day, real-time location updates every 3s, 99.99% availability

**The Core Challenge — Location-Based Matching:**

**Approach: Geospatial Indexing**
- Divide the world into grid cells (e.g., using Google S2 cells or Uber's H3 hexagonal grid)
- Each cell is ~1km². Store active drivers in each cell
- When rider requests: find drivers in rider's cell + adjacent cells → rank by distance → send request to nearest driver

**Data Structure:**
```
Redis GeoSet or in-memory spatial index:
  GEOADD drivers:<city> <longitude> <latitude> <driver_id>
  GEORADIUS drivers:<city> <rider_lng> <rider_lat> 5 km COUNT 20
```

**HLD:**
```
Rider App → Ride Service → Matching Service → Driver Location Service (Redis Geo)
                                                        ↑
                                              Driver App (location updates every 3s)
    
Ride Service → Trip Service → Fare Calculator → Payment Service → Notification
```

**Matching Algorithm:**
1. Rider requests ride → Ride Service gets rider location
2. Query nearby drivers (5km radius) from spatial index
3. Filter: available drivers only, matching vehicle type
4. Rank by: distance, ETA, driver rating, acceptance rate
5. Send request to top driver → driver has 15s to accept
6. If declined → next driver. After 3 declines → expand radius
7. Once matched → start trip, begin real-time tracking

**Location Updates at Scale:**
- 1M active drivers × update every 3s = 333K location updates/second
- Write to Redis Geo + publish to Kafka for trip tracking
- Riders subscribe to their driver's location via WebSocket → push updates every 3 seconds

**Follow-ups interviewer may ask:**
- "How does surge pricing work?" → Divide city into zones. If demand/supply ratio > threshold in a zone → apply multiplier. Multiplier increases until enough drivers enter the zone (economic incentive). Display to rider before confirming
- "ETA calculation?" → Pre-computed road network graph + Dijkstra/A*. Use historical traffic data to weight edges by time-of-day. Update weights with real-time traffic from driver GPS data
- "How do you handle driver going offline during a ride?" → Ride doesn't cancel — assume temporary network loss. If no update for 5 min → alert rider, attempt to reassign. Trip continues offline, data syncs when driver reconnects
- "Scale to 100 cities?" → Per-city deployment. Each city is independent (drivers and riders are local). Shared: user accounts, payment, rating. City-specific: matching, pricing, maps

🔥 **Most Important Questions**: Q1 (geospatial matching + location updates at scale)
⚠️ **Common Mistakes**: Not using a spatial index; ignoring driver location update volume; not addressing the matching timeout
🧠 **How to Answer**: The spatial index (Geo) is the core. Start there, then walk through the matching flow

---

## 15. Key-Value Store (DynamoDB)

### Q1: Design a distributed key-value store like DynamoDB or Cassandra

**Answer (Interview-Ready):**

**Requirements:**
- Functional: GET(key), PUT(key, value), DELETE(key). Range queries on sort key. TTL support
- Non-Functional: <10ms read/write at P99, millions of QPS, horizontally scalable, tunable consistency, high availability

**Core Design — Based on Amazon's Dynamo Paper:**

**1. Partitioning**: Consistent hashing with virtual nodes. Key → hash → partition → node

**2. Replication**: Each key replicated to N nodes (typically 3). Coordinator writes to N nodes. Quorum reads/writes for consistency:
- W + R > N → strong consistency. Example: N=3, W=2, R=2
- W=1, R=1 → eventual consistency (fastest)
- W=N, R=1 → write-slow, read-fast (durability focused)

**3. Conflict Resolution**: 
- Vector clocks track causal history
- On conflict (concurrent writes to different replicas): application resolves (shopping cart: merge) or last-writer-wins (timestamp)

**4. Storage Engine — LSM Tree:**
```
Write → MemTable (in-memory balanced tree)
         → When full, flush to SSTable (sorted on disk)
SSTable compaction: merge + remove duplicates → larger SSTables
Read → Check MemTable → Check Bloom filter → Check SSTables (newest first)
```
- Writes are O(1) (append to memory). Reads may check multiple SSTables → Bloom filters skip irrelevant SSTables (false positive rate <1%)

**5. Failure Detection**: Gossip protocol — each node periodically pings random peers. If a node isn't pinged for T seconds → marked as suspect → if still unreachable → marked as dead. No single point of failure in detection

**Follow-ups interviewer may ask:**
- "What's the advantage of LSM over B-tree?" → LSM is write-optimized (all writes are sequential). B-tree is read-optimized (direct seek) but writes require random I/O. For write-heavy KV stores, LSM wins
- "How does DynamoDB achieve single-digit ms latency?" → Data partitioned and co-located with compute. SSD storage. Request routed directly to partition owner (no intermediate hops). Bloom filters prevent unnecessary disk reads
- "How do you handle hot partitions?" → Auto-split: if one partition gets >3000 RCUs, split it. Adaptive capacity: borrow unused capacity from cold partitions. Explicit key design: add random suffix to distribute writes
- "How does auto-scaling work?" → Monitor throughput per partition. If consistently at >80% capacity → split partition and redistribute. Cloud provider handles this transparently (DynamoDB on-demand mode)

🔥 **Most Important Questions**: Q1 (consistent hashing + LSM tree + quorum)
⚠️ **Common Mistakes**: Not explaining the write path (LSM tree); confusing replication with sharding; not discussing consistency tuning
🧠 **How to Answer**: This is THE fundamental distributed systems question. Nail consistent hashing, quorum, and LSM tree

---

## 16. Web Crawler (Google)

### Q1: Design a web crawler that can index billions of pages

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Crawl web pages, extract content, follow links, respect robots.txt, handle different content types
- Non-Functional: Crawl 1B+ pages/day, politeness (don't DDoS websites), freshness (re-crawl updated pages), fault tolerance

**HLD:**
```
Seed URLs → URL Frontier (Priority Queue)
                    ↓
              DNS Resolver (cache)
                    ↓
              Fetcher (HTTP client pool)
                    ↓
              Content Parser (HTML → text + links)
                    ↓
         ┌─────────┴─────────┐
    Content Store        URL Extractor
    (S3 / HDFS)              ↓
                        URL Filter (dedup, robots.txt)
                              ↓
                        URL Frontier (loop)
```

**URL Frontier — the brain:**
- **Politeness**: Separate queue per domain. Only one request at a time per domain. Configurable delay between requests (robots.txt Crawl-delay). This prevents overloading any single website
- **Priority**: Important pages (popular sites, news) crawled first. Priority based on: PageRank, freshness, change frequency
- **Deduplication**: Bloom filter (space-efficient) or hash set to track visited URLs. Before adding URL to frontier, check if already crawled

**Politeness Constraint:**
```
Per-domain queue → Rate limiter (1 request/sec per domain)
Domain: google.com → queue: [url1, url2, url3] → process 1/sec
Domain: github.com → queue: [url4, url5] → process 1/sec  
Multiple domains processed in parallel → high aggregate throughput
```

**Follow-ups interviewer may ask:**
- "How do you handle duplicate content?" → Compute fingerprint (SimHash) of page content. If near-identical to existing page, mark as duplicate. Don't store/index duplicates
- "How do you decide when to re-crawl?" → Track change frequency per URL. News sites: re-crawl hourly. Static docs: re-crawl weekly. Use HTTP `Last-Modified` and `ETag` headers. If-Modified-Since reduces bandwidth
- "How do you handle spider traps?" → Set max depth per domain. Detect URL patterns that generate infinite pages (calendars, session IDs in URLs). Max pages per domain limit
- "Scale to 1B pages/day?" → 1B / 86,400 ≈ 11,500 pages/sec. With 1000 fetcher threads, each handling 1 page/100ms = 10,000 pages/sec. Add more fetcher instances to scale linearly
- "How does Google actually do it?" → Caffeine (continuous crawling, not batch). Prioritizes freshness for news, comprehensiveness for everything else. Estimated 100,000+ servers dedicated to crawling

🔥 **Most Important Questions**: Q1 (URL frontier + politeness)
⚠️ **Common Mistakes**: Ignoring politeness (DDoSing websites); not deduplicating URLs; using BFS without priority
🧠 **How to Answer**: The URL Frontier is the key component. Spend most time on politeness and priority

---

## 17. Typeahead / Autocomplete

### Q1: Design a typeahead/autocomplete system like Google Search suggestions

**Answer (Interview-Ready):**

**Requirements:**
- Functional: As user types, show top 5-10 suggestions. Rank by popularity. Update suggestions based on new queries. Filter offensive content
- Non-Functional: <100ms latency per keystroke, handle 100K QPS, fresh suggestions (updated hourly)

**Core Data Structure — Trie:**
```
        root
       / | \
      s   d   ...
     /
    sy
   /
  sys     ← "system" → frequency: 50,000
   |
  syst
   |
  syste
   |  \
  system  system design  ← frequency: 30,000
```
- Each node stores: character, children, top-K suggestions (precomputed)
- Lookup: traverse trie following typed prefix → return stored top-K suggestions from the prefix node
- Precomputing top-K at each node: eliminates real-time sorting → O(prefix_length) lookup

**HLD:**
```
User types → CDN/Edge Cache → Trie Service (in-memory) → Return top 5

Data Pipeline (offline):
Query Logs → Kafka → Aggregator → Frequency Map → Trie Builder → Push to Trie Service
```

**Optimization — Only query after 2+ characters and with 200ms debounce:**
- "s" → too many results, don't query
- "sy" → query (debounced 200ms after last keystroke)
- This reduces QPS by 50-70%

**Trie Update Strategy:**
- Don't update trie on every query (too expensive — trie is read-optimized)
- Batch update: aggregate query logs hourly → rebuild/update trie → deploy to all trie servers
- Two-tier: small "recent" trie updated every 15 min + large "stable" trie updated daily. Merge results at query time

**Follow-ups interviewer may ask:**
- "How much memory does the trie use?" → 50M unique prefixes × ~50 bytes per node = ~2.5 GB. Fits in a single server's memory. Replicate to N servers for availability
- "How do you personalize suggestions?" → User-level: track user's recent searches, boost those. Global: use overall popularity. Blend: 70% global + 30% personal
- "How do you filter offensive suggestions?" → Blocklist checked at trie build time. ML classifier for new queries that might be offensive. Human review for edge cases. Real-time filter as final check
- "Multi-language?" → Separate trie per language. Detect language from user's locale. Unicode normalization for consistent matching. Consider transliteration (typing in English for Hindi queries)
- "How does Google's autocomplete actually work?" → Not just a trie — uses ML models trained on query logs, user behavior, trending topics, personalization. But the underlying principle is prefix-based lookup with popularity ranking

🔥 **Most Important Questions**: Q1 (trie + precomputed top-K + update strategy)
⚠️ **Common Mistakes**: Real-time sorting at query time (too slow); updating trie on every keystroke; not debouncing
🧠 **How to Answer**: Draw the trie, explain precomputed top-K at each node, then discuss the offline update pipeline

---

## 18. Distributed Logging System (ELK)

### Q1: Design a distributed logging system like ELK Stack or Splunk

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Ingest logs from thousands of services, full-text search, structured query, dashboards, alerts, log retention (30 days hot, 1 year cold)
- Non-Functional: Handle 1M+ log events/second, <5s from log emission to searchable, no log loss, cost-efficient storage

**HLD:**
```
Services → Log Agent (Filebeat) → Kafka (buffer)
                                       ↓
                              Log Processor (Logstash/Flink)
                                  ↓          ↓
                          Index (Elasticsearch)  Cold Storage (S3)
                                  ↓
                          Query/Dashboard (Kibana/Grafana)
```

**Why Kafka in the middle?**
- Decouples producers from consumers — if Elasticsearch is slow, logs aren't lost
- Buffer during traffic spikes — services emit more logs during incidents (exactly when you need them)
- Multiple consumers: Elasticsearch for search, S3 for archive, Flink for real-time alerting

**Log Processing (the ETL step):**
- Parse unstructured logs into structured fields (timestamp, level, service, message, trace_id)
- Enrich: add metadata (region, environment, team)
- Filter: drop DEBUG logs in production (reduces volume by 50-70%)
- Transform: normalize timestamps to UTC, mask PII (credit card numbers, emails)

**Elasticsearch Internals:**
- Documents indexed with inverted index (same as search system)
- Index-per-day pattern: `logs-2024-01-15`. Makes retention easy — delete old indices
- Sharding: 5 primary shards per index, 1 replica each. Distributes across cluster
- Hot-warm architecture: recent indices on SSD (hot), older on HDD (warm), archived to S3 (cold)

**Follow-ups interviewer may ask:**
- "How do you handle 1M events/sec?" → Kafka partitioned by service name (10-50 partitions). Elasticsearch bulk indexing (batch 1000 docs per request). Horizontal scale: add more ES nodes and Kafka partitions
- "How do you search efficiently?" → Elasticsearch inverted index. Time-range filter first (narrows to specific indices). Then term/text search within that range. Most queries have time range → extremely efficient
- "Alerting?" → Stream processor (Flink) watches for patterns: error rate > 5%, specific error messages, anomaly detection. Triggers → PagerDuty/Slack notification
- "Cost optimization?" → (1) Filter at source (don't ship DEBUG). (2) Compress in Kafka (LZ4). (3) Hot-warm: SSD for 7 days, HDD for 30 days, S3 for 1 year. (4) Index lifecycle management (ILM) automates aging

🔥 **Most Important Questions**: Q1 (Kafka buffer + hot-warm storage)
⚠️ **Common Mistakes**: Sending logs directly to Elasticsearch (no buffer); not implementing retention policies; ignoring cost
🧠 **How to Answer**: The Kafka buffer is the key insight. Then hot-warm-cold storage architecture

---

## 19. Ad Click Aggregation (Google Ads)

### Q1: Design a real-time ad click aggregation system

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Count ad clicks in real-time, aggregate by ad_id / campaign / time_window, detect fraud (bot clicks), billing per click
- Non-Functional: Handle 10B+ clicks/day (~115K clicks/sec), real-time aggregation (within 1 minute), exactly-once counting for billing, fault-tolerant

**Why this is hard:** Money is directly tied to click counts. Overcounting = advertisers pay too much = lawsuits. Undercounting = platform loses revenue

**HLD:**
```
Ad Click → Click Collector → Kafka (partitioned by ad_id)
                                    ↓
                        ┌───────────┴───────────┐
                   Fraud Detector          Aggregation (Flink)
                   (ML + rules)                  ↓
                        ↓               ┌────────┴────────┐
                   Flag/Reject    Real-Time Store      Batch Store
                                  (Redis: minute counts) (ClickHouse: detailed)
                                        ↓
                                  Billing Service
                                  Dashboard/Reporting
```

**Aggregation — MapReduce mindset:**
```
Window: 1-minute tumbling windows
Key: (ad_id, minute_timestamp)
Value: count

Flink processes:
  Click{ad_id=123, ts=10:03:45} → key=(123, "10:03") → count++
  After window closes (10:04:00) → emit (123, "10:03", count=547)
  → Write to Redis for real-time dashboard
  → Write to ClickHouse for historical queries
```

**Exactly-Once Counting:**
- Each click has a unique `click_id` (generated by client SDK)
- Kafka exactly-once semantics: idempotent producer + transactional consumer
- Flink checkpointing: periodic snapshots of aggregation state. On failure, restore from checkpoint → reprocess from Kafka offset → same result (deterministic)

**Fraud Detection:**
- **Rule-based**: Same IP clicking same ad >10 times/minute → fraud. Same device_id, different user accounts → suspicious
- **ML-based**: Click pattern analysis (click timing, mouse movement, conversion rate). Bot detection model trained on historical fraud data
- **Action**: Flag fraudulent clicks → exclude from billing → still store for forensics

**Follow-ups interviewer may ask:**
- "How do you handle late-arriving clicks?" → Flink watermarking: allow 5-minute late arrival window. Late clicks update already-emitted aggregations (correction events). For billing: reconciliation runs at end of day to catch all late data
- "How do you handle 10B clicks efficiently?" → Kafka with 100+ partitions. Flink with 50+ task managers. Pre-aggregate at collector level (batch clicks per ad per 10s before writing to Kafka → 10x reduction in Kafka messages)
- "Dashboard latency?" → Redis stores latest minute counts. Dashboard polls every 5 seconds. Total latency: click → Kafka (100ms) → Flink (1s window) → Redis (10ms) → Dashboard = ~2-3 seconds

🔥 **Most Important Questions**: Q1 (exactly-once + fraud detection)
⚠️ **Common Mistakes**: Not achieving exactly-once (critical for billing); ignoring fraud; using batch processing instead of stream
🧠 **How to Answer**: Emphasize that money depends on accuracy. Exactly-once semantics + fraud detection are the differentiators

---

## 20. Proximity / Nearby Service (Yelp)

### Q1: Design a proximity service that finds nearby businesses/places

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Given user location, return businesses within a radius. Filter by category, rating. Business registration
- Non-Functional: <100ms query latency, handle 100K QPS, 200M+ businesses in DB

**Core Challenge — Geospatial Query: "Find all restaurants within 5km"**

**Approach: Geohash-based indexing**
- Geohash encodes lat/lng into a string: (37.7749, -122.4194) → "9q8yyk"
- Nearby locations share a common prefix: "9q8yy" covers a ~1km² area
- **Query**: Find all businesses with geohash starting with "9q8yy" + adjacent cells → simple prefix query

| Geohash Length | Cell Size |
|---------------|-----------|
| 4 chars | ~39km × 20km |
| 5 chars | ~5km × 5km |
| 6 chars | ~1.2km × 0.6km |
| 7 chars | ~153m × 153m |

**Why geohash over raw lat/lng?**
- Lat/lng requires expensive range query: `WHERE lat BETWEEN x1 AND x2 AND lng BETWEEN y1 AND y2`
- Geohash converts 2D problem to 1D prefix search → uses standard B-tree index → much faster

**HLD:**
```
User → API Server → Search Service → Read Replica DB (PostgreSQL + geohash index)
                                    → Cache (Redis GeoSet for hot locations)

Business → Business Service → Write DB → replicate to Read Replicas
```

**Schema:**
```sql
businesses (
  id BIGINT PRIMARY KEY,
  name VARCHAR,
  category VARCHAR,
  geohash VARCHAR(7),  -- indexed
  latitude DECIMAL,
  longitude DECIMAL,
  rating FLOAT,
  ...
)
CREATE INDEX idx_geohash ON businesses(geohash);
```

**Query:**
```sql
SELECT * FROM businesses 
WHERE geohash LIKE '9q8yy%' 
  AND category = 'restaurant'
ORDER BY rating DESC
LIMIT 20;
```

**Follow-ups interviewer may ask:**
- "Edge case: user is at the boundary of a geohash cell?" → Query the target cell + all 8 adjacent cells. This guarantees coverage even at boundaries
- "How does Google Maps do it?" → Google S2 library: maps Earth's surface to a 1D Hilbert curve. More uniform cell sizes than geohash. Used internally at Google for all geospatial operations
- "How do you rank results?" → Distance + rating + relevance. Distance approximation from geohash center is fast. Exact distance (Haversine formula) for the final 20 results only
- "Real-time business updates?" → Business updates go through write path → DB → eventual consistency to read replicas (1-2s lag). Cache invalidation for that business's geohash cells. Acceptable for non-real-time use case

🔥 **Most Important Questions**: Q1 (geohash-based indexing)
⚠️ **Common Mistakes**: Using raw lat/lng range queries (slow at scale); not handling cell boundary edge case
🧠 **How to Answer**: Geohash is the key insight. Explain how it converts 2D to 1D, then show the prefix query

---

## 21. Hotel / Flight Booking (Booking.com)

### Q1: Design a hotel/flight booking system like Booking.com

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Search available rooms/flights, view details, book, payment, cancellation, dynamic pricing
- Non-Functional: 10M searches/day, <500ms search latency, strong consistency for bookings (no double-booking), handle flash sales/peak demand

**The Core Challenge: Inventory Management (No Double Booking)**

**Approach: Pessimistic Locking + Reservations**
1. User searches → returns available options (read from cache/read replica)
2. User clicks "Book" → system creates a **reservation** (hold for 15 minutes)
3. During reservation: inventory decremented, other users see reduced availability
4. User completes payment within 15 min → reservation → confirmed booking
5. If payment fails or timeout → reservation released → inventory restored

**Why not optimistic locking?** At high concurrency (1000 users trying to book the last room), optimistic locking causes too many retries and poor UX. Pessimistic approach (hold + confirm) provides better user experience

**Inventory Schema:**
```sql
rooms (hotel_id, room_type, date, total_count, reserved_count, booked_count)
-- Available = total_count - reserved_count - booked_count

-- Booking:
BEGIN TRANSACTION;
UPDATE rooms SET reserved_count = reserved_count + 1 
  WHERE hotel_id = 123 AND room_type = 'deluxe' AND date = '2024-07-15'
  AND (reserved_count + booked_count) < total_count;  -- check availability
IF rows_affected = 1 THEN
  INSERT INTO reservations (user_id, hotel_id, room_type, date, expires_at);
  COMMIT;
ELSE
  ROLLBACK; -- no availability
END;
```

**Search Optimization:**
- Search is read-heavy (1000:1 read-write ratio)
- Elasticsearch for complex searches (filter by city, date range, price range, amenities, rating)
- Cache popular searches (Redis: "NYC, July 4-7, 2 guests" → cached results for 5 min)
- Denormalized search index updated from booking DB via CDC (Change Data Capture)

**Follow-ups interviewer may ask:**
- "Dynamic pricing?" → Price varies based on: occupancy rate, day of week, season, competitor prices, demand forecast. ML model predicts optimal price. Updated multiple times daily
- "How do you handle flash sales?" → Pre-warm caches. Rate limiting on booking endpoint. Queue over-demand (500 requests for 10 rooms → first 10 succeed, rest waitlisted). Show real-time availability updates via WebSocket
- "Distributed transactions across hotel and payment?" → Saga pattern: (1) Reserve room → (2) Process payment → (3) Confirm booking. If payment fails → compensating action: release reservation. Each step is a separate service with its own DB
- "Multi-timezone and multi-currency?" → Store all dates in UTC, convert for display. Store prices in hotel's local currency. Convert at booking time using exchange rate. Show both currencies to user

🔥 **Most Important Questions**: Q1 (inventory management + no double-booking)
⚠️ **Common Mistakes**: Not handling double-booking; using optimistic locking for high-contention scenarios; ignoring reservation expiry
🧠 **How to Answer**: The reservation hold pattern is the core. Walk through the full lifecycle: search → reserve → pay → confirm → or → timeout → release

---

## 22. Google Maps (Routing + Tiles)

### Q1: Design a navigation/maps system like Google Maps

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Map rendering (zoom/pan), search for places, navigation (A to B routing), real-time traffic, ETA
- Non-Functional: <500ms for map tile loading, <2s for route calculation, support 1B users, real-time traffic updates

**Two Distinct Subsystems:**

**1. Map Rendering — Tile-Based Architecture:**
- World map divided into tiles at each zoom level. Zoom 0 = 1 tile (whole world). Zoom 1 = 4 tiles. Zoom Z = 4^Z tiles
- Zoom level 18 (street level) = ~70 billion tiles
- Pre-render tiles and store on CDN. Client requests tile by (x, y, zoom) coordinates
- **Vector tiles** (modern): Send raw geometry data, client renders. Smaller than raster tiles. Client can rotate/style
- **Raster tiles** (legacy): Pre-rendered images. Larger but no client processing needed

**2. Routing — Graph Algorithm:**
- Road network modeled as weighted directed graph: intersections = nodes, roads = edges, weight = travel time
- Naive Dijkstra/A* works for small areas but too slow for continent-scale routes

**Hierarchical Routing (how Google actually does it):**
1. Precompute highway-level graph (Contraction Hierarchies)
2. Short routes: Dijkstra/A* on local road graph
3. Long routes: A* on local graph to nearest highway → precomputed highway graph → A* from highway exit to destination
4. This reduces computation from millions of nodes to thousands → sub-second routing

**Real-Time Traffic:**
- Source: Anonymized GPS data from millions of active Android/iOS users
- Processing: Aggregate speed data per road segment per 5-minute window
- Apply to routing weights: if a road normally takes 5 min but current speed suggests 15 min → update edge weight
- ETA: Sum of edge weights along the route + ML correction factor (learned from historical trips)

**Follow-ups interviewer may ask:**
- "How do tiles scale to 1B users?" → CDN. 95%+ of tile requests served from edge cache. Only cold tiles (unpopular areas, high zoom) hit origin server
- "How do you update maps?" → Satellite imagery + street view + user reports + partner data (municipalities). ML detects new roads from satellite imagery. Updates propagated to tile renderer and routing graph weekly
- "How does offline maps work?" → Download pre-computed tiles + routing graph for a region. Store on device. Route computation runs locally using downloaded graph
- "Multi-modal routing (drive + walk + transit)?" → Separate graphs per mode. At transit stops, edges connect walk graph to transit graph. Query spans multiple graphs. Complicated but same fundamental approach

🔥 **Most Important Questions**: Q1 (tile rendering + hierarchical routing)
⚠️ **Common Mistakes**: Trying to route on full raw graph (too slow); not using pre-rendered tiles; ignoring real-time traffic
🧠 **How to Answer**: Two clear subsystems: rendering (tiles) and routing (graph). Spend time on hierarchical routing — that's the unique challenge

---

## 23. Ticket Booking (BookMyShow)

### Q1: Design a ticket booking system for events/movies (BookMyShow/Ticketmaster)

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Browse events, view seat map, select seats, hold seats temporarily, payment, e-ticket generation
- Non-Functional: Handle 100K concurrent users for popular events, no double-booking of seats, <30s total booking flow, seat selection visible in near-real-time across all users

**The Core Challenge: Seat-Level Concurrency**
- Unlike hotel booking (room types), each seat is unique
- 10,000 seats, 500K users trying to book simultaneously → extreme contention

**Approach: Distributed Lock + Temporary Hold**
1. User views seat map → see real-time availability (WebSocket updates)
2. User selects seats → system acquires **distributed lock** on those specific seats (Redis + Lua script)
3. Seats marked as "HELD" for 10 minutes → other users see them as unavailable instantly
4. User pays → seats move to "BOOKED" → lock released
5. Timeout without payment → seats released back to "AVAILABLE"

**Seat Locking (Redis Lua for atomicity):**
```lua
-- Reserve seats atomically
local seats = cjson.decode(ARGV[1])  -- ["A1", "A2", "A3"]
for _, seat in ipairs(seats) do
  local status = redis.call('GET', 'seat:' .. KEYS[1] .. ':' .. seat)
  if status ~= nil then return 0 end  -- seat already held/booked
end
for _, seat in ipairs(seats) do
  redis.call('SET', 'seat:' .. KEYS[1] .. ':' .. seat, ARGV[2], 'EX', 600)  -- hold 10min
end
return 1
```

**HLD:**
```
User → CDN (static seat map SVG) → API Server → Seat Service → Redis (seat locks)
                                                              → PostgreSQL (bookings)
         ↓
WebSocket Server ← Seat updates broadcasted via Redis Pub/Sub
```

**Handling Taylor Swift-Level Demand:**
- **Virtual queue**: Instead of letting 500K users hit the booking page simultaneously, assign queue positions. Process in batches of 1000
- **Pre-sale by tier**: Fan club first, then credit card holders, then general public. Spreads load over hours
- **Rate limiting**: Max 4 tickets per user. Captcha before booking. Bot detection

**Follow-ups interviewer may ask:**
- "How do you show real-time seat availability?" → WebSocket. When a seat's status changes (AVAILABLE → HELD → BOOKED), publish to Redis Pub/Sub → broadcast to all connected clients viewing that event
- "What if Redis goes down?" → Seat lock info is critical. Use Redis Cluster with replication. Backup: fall back to DB-level locking (SELECT FOR UPDATE). Slower but correct
- "Dynamic pricing?" → Popular events: price increases as availability decreases. Price tiers based on: demand velocity, remaining seats, time until event. Surge pricing for high-demand moments

🔥 **Most Important Questions**: Q1 (seat-level locking + virtual queue)
⚠️ **Common Mistakes**: Not handling the massive concurrency for popular events; using DB-level locks (too slow); not implementing a virtual queue
🧠 **How to Answer**: Start with the concurrency challenge, then present Redis locking + virtual queue as the solution

---

## 24. Code Deployment System (CI/CD)

### Q1: Design a CI/CD system like GitHub Actions or Jenkins

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Define pipelines (YAML), trigger on events (push, PR), run build/test/deploy steps, parallel execution, artifacts management, environment variables/secrets
- Non-Functional: Handle 100K+ builds/day, <30s to start a build, isolated execution (builds don't affect each other), secure secrets handling

**HLD:**
```
Git Push → Webhook → Pipeline Orchestrator → Job Scheduler → Worker Pool (containers)
                           ↓                                       ↓
                     Pipeline DB (PostgreSQL)               Artifact Store (S3)
                           ↓                                       ↓
                     Log Aggregator                          Container Registry
```

**Pipeline Execution Model:**
```yaml
# Pipeline definition
pipeline:
  trigger: push to main
  stages:
    - name: build
      steps: [checkout, install, compile]
    - name: test
      parallel:
        - unit-tests
        - integration-tests
        - lint
    - name: deploy
      steps: [docker-build, push-registry, deploy-k8s]
      requires: [build, test]  # DAG dependency
```

**Execution as DAG (Directed Acyclic Graph):**
- Parse pipeline YAML → build DAG of stages/steps
- Scheduler executes nodes in topological order
- Independent nodes run in parallel (test stages above)
- Node failure → stop downstream dependents → mark pipeline failed

**Isolation: Each job runs in a fresh container**
- Spin up ephemeral container per job
- Container image based on user's specification (Node 18, Python 3.11)
- No cross-contamination between builds
- Clean up after completion (no leftover state)

**Secrets Management:**
- Encrypted at rest (AES-256) in a secrets vault (HashiCorp Vault or AWS Secrets Manager)
- Injected as environment variables into container at runtime
- Never written to logs (redacted automatically)
- Scoped: repo-level, org-level, environment-level

**Follow-ups interviewer may ask:**
- "How do you handle 100K builds/day?" → Worker pool auto-scales based on queue depth. Use spot/preemptible instances for cost efficiency. Queue + scheduler pattern: builds queued → scheduler assigns to available worker → scales up if queue grows
- "Caching for faster builds?" → Cache dependencies (node_modules, .m2) by hash of lock file. If lock file unchanged → restore cache → skip install step. Saves 30-60% build time
- "Blue-green deployment?" → Two environments: blue (current) and green (new). Deploy to green → health check → swap traffic (DNS or load balancer). If green fails → instant rollback by swapping back to blue. Zero downtime
- "How do you handle flaky tests?" → Tag historically flaky tests. Re-run failed tests once. If passes on retry → mark as flaky, still pass the build (with warning). Track flake rate over time. Quarantine tests with >10% flake rate

🔥 **Most Important Questions**: Q1 (DAG execution + container isolation + secrets)
⚠️ **Common Mistakes**: Not using containers for isolation; not addressing caching; sequential execution without parallelism
🧠 **How to Answer**: DAG-based pipeline execution is the key abstraction. Draw the DAG, explain parallel execution, then discuss isolation

---

## 25. Pastebin / GitHub Gist

### Q1: Design a text-sharing service like Pastebin or GitHub Gist

**Answer (Interview-Ready):**

**Requirements:**
- Functional: Create text paste with unique URL, set expiry, syntax highlighting, public/private/unlisted visibility, edit, version history
- Non-Functional: Read-heavy (100:1), 10M pastes/day created, 1B reads/day, <100ms read latency, paste size up to 10MB

**This is a simpler system — focus on getting it RIGHT, not complex:**

**Estimation:**
- Write QPS: 10M / 86,400 ≈ 116 QPS (very manageable)
- Read QPS: 1B / 86,400 ≈ 11,600 QPS (moderate)
- Storage: 10M pastes/day × 10KB avg × 365 days × 5 years ≈ 183 TB

**HLD:**
```
Client → API Gateway → Paste Service → Metadata DB (PostgreSQL)
                                       → Content Store (S3)
         ↓
    CDN (for popular paste reads)
         ↓  
    Client ← rendered paste with syntax highlighting
```

**Design Decisions:**
- **Separate metadata from content**: Metadata (title, language, created_at, owner, visibility) in PostgreSQL. Actual text content in S3 (cheap, scalable, durable)
- **URL generation**: Same as URL shortener — base62 encoding of auto-increment ID or pre-generated key pool
- **Syntax highlighting**: Client-side (Prism.js/highlight.js). Content served as raw text, client renders with highlighting. This offloads compute from server
- **Expiry**: Background job runs every minute, cleans expired pastes. Or lazy deletion: check expiry on read, return 404 if expired

**Schema:**
```sql
pastes (
  paste_id VARCHAR(8) PRIMARY KEY,
  title VARCHAR(255),
  language VARCHAR(50),
  visibility ENUM('public', 'private', 'unlisted'),
  user_id BIGINT,
  content_url VARCHAR(255),  -- S3 URL
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  view_count BIGINT DEFAULT 0
)
```

**Caching Strategy:**
- Cache popular pastes in Redis (paste_id → content). Cache hot 1% = huge read reduction
- Use CDN for public pastes (CDN-friendly: content doesn't change often, identifiable by URL)
- Cache-Control: public pastes → `max-age=3600`. Private → `no-cache, private`

**Follow-ups interviewer may ask:**
- "How do you handle 10MB pastes?" → Store in S3 directly (no DB blob). Multipart upload for large pastes. Serve via CDN. Set size limit to prevent abuse
- "Versioning?" → Each edit creates a new content object in S3 with a version suffix. Metadata stores current_version + list of version IDs. Diff view: compute diff between versions client-side
- "How do you prevent abuse?" → Rate limiting (50 pastes/hour per IP). Content scanning for malware/phishing URLs. CAPTCHA for anonymous users. Auto-expire anonymous pastes after 30 days
- "Scale to 1B reads/day?" → CDN handles 90%+ of reads for public pastes. PostgreSQL read replicas for metadata. Redis cache for recent/popular pastes. The 11,600 QPS is very manageable with caching

🔥 **Most Important Questions**: Q1 (simple but correct design)
⚠️ **Common Mistakes**: Over-engineering (this is a simple system — show you know when to keep it simple); storing large content in the DB instead of object storage
🧠 **How to Answer**: This is a great opportunity to show engineering judgment — keep it simple, explain why you're NOT adding complexity. That scores points at senior level

---
---

> **End of Part 04 — Backend System Design Case Studies**
> 25 complete designs: 10 classic + 15 high-frequency FAANG additions
> Next: [05 — Frontend System Design Case Studies](05_Frontend_Case_Studies.md)

<!-- END_OF_CONTENT -->
