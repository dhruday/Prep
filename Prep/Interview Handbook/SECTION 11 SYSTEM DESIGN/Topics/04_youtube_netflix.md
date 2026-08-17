# Problem 04 — Design YouTube / Netflix (Video Streaming)

> Frequency: ⭐⭐⭐⭐⭐ | Asked at: Google, Netflix, Amazon, Meta | Difficulty: 🔴 Senior

---

## PART 1 — Problem Statement

### Functional Requirements
- Upload videos
- Stream videos (adaptive bitrate)
- Search for videos
- Like, comment, subscribe
- Recommendation feed
- Video transcoding (multiple qualities)
- Live streaming (bonus)

### Non-Functional Requirements
- **Scale:** 2B users, 500M DAU (YouTube)
- **Upload:** 500 hours of video per minute
- **Streaming:** 1B hours of video watched per day
- **Latency:** Video starts in < 2 seconds
- **Availability:** 99.99%
- **Storage:** Petabytes of video data

### Key Difference: YouTube vs Netflix
```
YouTube:  User-generated content, massive variety, ads, free
Netflix:  Licensed content, curated catalog, subscription, no ads
Both:     CDN-heavy, adaptive streaming, recommendation engine
```

---

## PART 3 — Capacity Estimation

```
=== YOUTUBE SCALE ===
DAU:                500M users
Videos watched/day: 1B hours = 60B minutes = 3.6T seconds
Avg video length:   7 minutes
Videos watched/day: 60B / 7 = 8.6B video views/day
Read QPS:           8.6B / 86,400 ≈ 100,000 video requests/sec

Upload:
500 hours/min × 60 min = 30,000 hours/hour
1 hour of video (1080p) ≈ 2 GB raw → 1 GB compressed
Upload bandwidth:   30,000 GB/hour ≈ 8.3 GB/sec = 66 Gbps

=== STORAGE ===
Transcoding multiplier (360p, 480p, 720p, 1080p, 4K) ≈ 8x storage
Upload per day:     500 × 60 × 24 = 720,000 hours/day
Storage per day:    720,000 hours × 1 GB × 8 resolutions = 5.76 PB/day
Per year:           ~2 EB (exabytes)

=== STREAMING BANDWIDTH ===
Bitrates:
  360p:   0.5 Mbps
  720p:   2.5 Mbps
  1080p:  5 Mbps
  4K:     15-25 Mbps

Avg bitrate assumed: 3 Mbps
Concurrent viewers:  1B hours / 24 hrs ≈ 41M concurrent viewers
Bandwidth needed:   41M × 3 Mbps = 123 Tbps peak

CDN offloads 95%+ → Origin needs only ~6 Tbps
```

---

## PART 4 — High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Upload Flow                                   │
│                                                                       │
│  Creator ──HTTP──▶ Upload API ──▶ S3 Raw Storage                    │
│                                   │                                   │
│                              Kafka Event                              │
│                                   │                                   │
│                      ┌────────────▼────────────┐                    │
│                      │   Video Processing       │                    │
│                      │   Pipeline               │                    │
│                      │  ┌───────────────────┐   │                    │
│                      │  │ Transcoding Farm  │   │                    │
│                      │  │ (FFmpeg Workers)  │   │                    │
│                      │  │ → 360p            │   │                    │
│                      │  │ → 720p            │   │                    │
│                      │  │ → 1080p           │   │                    │
│                      │  │ → 4K              │   │                    │
│                      │  └───────────────────┘   │                    │
│                      │  ┌───────────────────┐   │                    │
│                      │  │ Thumbnail Gen     │   │                    │
│                      │  │ Metadata Extract  │   │                    │
│                      │  └───────────────────┘   │                    │
│                      └────────────┬────────────┘                    │
│                                   │                                   │
│                            S3 Processed Storage                       │
│                                   │                                   │
│                               CDN Push                                │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        Streaming Flow                                 │
│                                                                       │
│  Viewer ──▶ CDN Edge ──▶ [HIT] ──▶ Stream video segments            │
│             (PoP)        [MISS]──▶ Origin CDN ──▶ S3                │
│                                                                       │
│  Client: ABR player (HLS / MPEG-DASH)                               │
│    → Monitors bandwidth                                               │
│    → Downloads manifest file (.m3u8)                                 │
│    → Requests segments at appropriate quality                         │
│    → Upgrades/downgrades quality seamlessly                          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                       Service Layer                                   │
│                                                                       │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│   │  Search Svc  │  │  Recommend   │  │  Metadata / Comments Svc  │ │
│   │(Elasticsearch│  │  Engine      │  │  (PostgreSQL + Redis)      │ │
│   └──────────────┘  └──────────────┘  └──────────────────────────┘ │
│                                                                       │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│   │  User Svc    │  │  Analytics   │  │  Notification Service      │ │
│   │  (Auth, prof)│  │  (Kafka +    │  │  (Push / Email)            │ │
│   │              │  │   Flink)     │  │                            │ │
│   └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## PART 5 — Data Model

### Videos Table
```sql
CREATE TABLE videos (
    video_id        BIGINT PRIMARY KEY,       -- Snowflake ID
    uploader_id     BIGINT NOT NULL,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    duration_sec    INT,
    status          VARCHAR(20),              -- 'processing', 'published', 'deleted'
    visibility      VARCHAR(20),              -- 'public', 'private', 'unlisted'
    tags            TEXT[],
    category_id     INT,
    thumbnail_url   TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    published_at    TIMESTAMP,
    view_count      BIGINT DEFAULT 0,
    like_count      BIGINT DEFAULT 0,
    comment_count   BIGINT DEFAULT 0
);

CREATE INDEX idx_uploader ON videos(uploader_id, published_at DESC);
CREATE INDEX idx_category ON videos(category_id, view_count DESC);
```

### Video Segments / Manifests (S3 paths stored in metadata)
```
s3://videos-processed/
  {video_id}/
    manifest.m3u8              ← HLS master manifest
    360p/
      segment_0001.ts          ← 2-10 second video chunks
      segment_0002.ts
      ...
    720p/
      segment_0001.ts
      ...
    1080p/
      segment_0001.ts
      ...
    thumbnail.jpg
    thumbnail_animated.webp
```

### Comments (Cassandra for scale)
```sql
CREATE TABLE comments (
    video_id        BIGINT,
    comment_id      TIMEUUID,
    user_id         BIGINT,
    content         TEXT,
    like_count      COUNTER,
    parent_id       TIMEUUID,   -- for nested replies
    
    PRIMARY KEY (video_id, comment_id)
) WITH CLUSTERING ORDER BY (comment_id DESC);
```

### Watch History
```sql
-- Cassandra: partition by user, cluster by watched_at
CREATE TABLE watch_history (
    user_id         BIGINT,
    watched_at      TIMESTAMP,
    video_id        BIGINT,
    watched_pct     FLOAT,      -- percentage watched (for resume)
    resume_pos_sec  INT,        -- resume position
    
    PRIMARY KEY (user_id, watched_at)
) WITH CLUSTERING ORDER BY (watched_at DESC)
  AND default_time_to_live = 7776000;  -- 90 days
```

---

## PART 6 — Video Upload API

```http
# Step 1: Initiate upload (get upload URL)
POST /api/v1/videos/upload
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "My Video",
  "description": "...",
  "duration_sec": 300,
  "file_size": 500000000,
  "content_type": "video/mp4"
}

Response 200:
{
  "video_id": "vid-abc123",
  "upload_url": "https://s3.amazonaws.com/raw-videos/vid-abc123?X-Amz-Signature=...",
  "expires_in": 3600
}

# Step 2: Client uploads directly to S3 (pre-signed URL)
PUT {upload_url}
Content-Type: video/mp4
Body: <video bytes>

# Step 3: Notify server upload complete
POST /api/v1/videos/{video_id}/upload-complete

# Step 4: Processing begins (async)
# Server sends webhook/notification when ready
```

---

## PART 7 — Deep Dive: Video Processing Pipeline

```
Raw Video Uploaded to S3
         │
         ▼
┌────────────────────┐
│   Event Published   │  (S3 event → SNS → SQS → Workers)
│   to Kafka          │
└─────────┬──────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│         Video Processing Workers         │
│                                          │
│  ┌─────────────────┐                    │
│  │ Validation      │  Check format,     │
│  │                 │  duration, content  │
│  └────────┬────────┘                    │
│           │                              │
│  ┌────────▼────────┐                    │
│  │ Transcoding     │  FFmpeg             │
│  │                 │  Parallel encode:   │
│  │  360p (H.264)   │  Multiple workers   │
│  │  480p (H.264)   │  per video          │
│  │  720p (H.264)   │                    │
│  │  1080p (H.264)  │                    │
│  │  4K (H.265/AV1) │                    │
│  └────────┬────────┘                    │
│           │                              │
│  ┌────────▼────────┐                    │
│  │ Segmentation    │  HLS / DASH         │
│  │                 │  2-10 second chunks │
│  └────────┬────────┘                    │
│           │                              │
│  ┌────────▼────────┐                    │
│  │ Thumbnail Gen   │  Frame extraction   │
│  │                 │  Auto + manual      │
│  └────────┬────────┘                    │
│           │                              │
│  ┌────────▼────────┐                    │
│  │ Metadata Extract│  Duration, codec,   │
│  │                 │  resolution detect  │
│  └────────┬────────┘                    │
│           │                              │
│  ┌────────▼────────┐                    │
│  │ Content ID      │  Copyright check    │
│  │ Check           │  (YouTube Content   │
│  │                 │   ID equivalent)    │
│  └────────┬────────┘                    │
└───────────┼─────────────────────────────┘
            │
            ▼ Upload to S3 processed bucket
            │
            ▼ Push to CDN edge nodes
            │
            ▼ Update DB: status = 'published'
            │
            ▼ Notify creator
```

### Adaptive Bitrate Streaming (HLS)

```
Master Manifest (master.m3u8):
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/manifest.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
720p/manifest.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p/manifest.m3u8

Child Manifest (720p/manifest.m3u8):
#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SEGMENT-INFO:start=0,duration=6.0
segment_0001.ts
#EXT-X-SEGMENT-INFO:start=6,duration=6.0
segment_0002.ts
...

ABR Player logic:
  - Downloads manifest → knows available qualities
  - Monitors download speed of segments
  - If bandwidth drops: request lower quality manifest
  - If bandwidth improves: request higher quality
  - Seamless → viewer doesn't notice quality change
```

---

## PART 8 — Scalability

### CDN Strategy

```
Three-tier CDN architecture:

Tier 1: Edge PoPs (1000+ worldwide)
  - Serve most requests (popular content)
  - 2-30 TB storage per PoP
  - 40+ Gbps connectivity

Tier 2: Regional CDN hubs (50-100 worldwide)
  - Cache tier between edge and origin
  - Higher capacity: 100+ TB
  - Serve edge cache misses

Tier 3: Origin (centralized)
  - S3 / object storage
  - Only serve regional hub cache misses (~5% of traffic)

Cache hit rates:
  Top 1% of videos → serve 90% of traffic
  Cache these aggressively: CDN TTL = 24 hours
  Long-tail (uploaded 2 years ago, 100 views): serve from origin directly
```

### Multi-Region Storage

```
Primary: US-East (origin)
Replicas: EU-West, Asia-Pacific, LATAM

Replication:
  After upload+transcode: replicate to all regions
  S3 Cross-Region Replication or custom pipeline

Why not all regions?
  Cost: 5x storage cost
  Solution: Replicate only top N videos to all regions
            Long-tail: transcode on-demand or serve from central
```

---

## PART 9 — View Count (Distributed Counter)

```
Naive approach: UPDATE videos SET view_count = view_count + 1
Problem: 100,000 views/sec → database bottleneck

Solution 1: Redis INCR + periodic flush
  redis.incr("view_count:{video_id}")
  Cron job every 5 minutes: flush Redis counts to DB
  Trade-off: 5-minute eventual consistency on counts

Solution 2: Kafka + Stream Processing
  Click event → Kafka → Flink aggregation (1-min windows) → DB
  Accurate, scalable, async
  
Solution 3: Approximation (HyperLogLog for unique views)
  redis.pfadd("unique_views:{video_id}:{date}", user_id)
  Estimate unique viewers with ~1% error rate
  O(1) space per day per video
```

---

## PART 10 — Recommendation Engine

```
What YouTube recommends influences 70% of watch time.

Signal sources:
  - Watch history (what you watched)
  - Watch duration (did you finish it?)
  - Likes/dislikes/shares
  - Search queries
  - Click-through rate
  - Session satisfaction (did user close app happy?)

Candidate generation:
  1. Collaborative filtering: "Users like you also watched..."
     Matrix factorization (SVD, ALS) on watch history
  
  2. Content-based: "Similar to what you watch"
     Video embeddings (title, description, tags)
     Deep learning: video features → embedding space
  
  3. Trending: most watched in category today

Ranking:
  Neural network scoring of candidates
  Features: user context, video freshness, predicted CTR
  Re-ranking for diversity (don't show all same channel)

Infrastructure:
  Offline: daily model training (Spark + TensorFlow)
  Online: near-real-time feature updates (Kafka → Feature Store)
  Serving: pre-computed candidates + online ranking (< 100ms)
```

---

## PART 16 — Monitoring Key Metrics

```
Streaming Health:
  - Buffering ratio (% of time video is buffering)
  - Video start failure rate
  - Quality of experience (average bitrate)
  - Startup time (< 2 seconds SLO)

Infrastructure:
  - CDN cache hit rate (target > 95%)
  - Origin bandwidth
  - Transcoding queue depth
  - Processing latency (upload → available)

Business:
  - Videos uploaded/hour
  - Watch time / DAU
  - Recommendation CTR
  - Ad completion rate
```

---

## PART 20 — Interview Summary

### 5-Minute Answer
> "YouTube has two main flows: upload and streaming. For upload: creator sends video to upload service → stored in S3 → transcoding workers process it (multiple bitrates via FFmpeg) → segments pushed to CDN. For streaming: viewer requests video → CDN edge serves (>95% cache hit) → client uses HLS adaptive bitrate to pick quality dynamically. Data stored in: video metadata in MySQL, comments in Cassandra, watch history in Cassandra, search in Elasticsearch. Recommendation uses collaborative filtering on watch history."

### 15-Minute Answer
Add:
> "Transcoding pipeline detail: S3 upload triggers SNS → SQS → Worker pool. Workers transcode in parallel (each quality on separate worker for a video). Output: HLS segments (2-10 second .ts files) + manifest (.m3u8) → S3 processed bucket → CDN pre-warming for popular content. View counts: Redis INCR per video → Kafka flush every minute → aggregated in Cassandra for reporting. CDN strategy: 3-tier (edge PoPs → regional hubs → origin). ABR: client monitors segment download speed, switches quality tier seamlessly."

### 45-Minute Deep Dive
Add:
> "Scale details: Content ID system scans new uploads against fingerprint database (acoustic/visual hashing) for copyright. CDN cache eviction: popular content (top 1%) pre-pushed to edge; long-tail served on-demand via pull-through. Video codec evolution: H.264 → H.265 (HEVC) → AV1 (30% smaller at same quality, but 10x more CPU to encode). YouTube encodes everything in VP9/AV1. Storage tiering: recent uploads on SSD, 1-year-old videos on HDD, 5-year-old on object storage (cold). Processing cost optimization: spot instances for transcoding (fault-tolerant, checkpoint per segment). Live streaming: fragmented MP4 pushed from broadcaster → ingestion servers → real-time transcoding → CDN with 3-10 second latency."

---

*Next: `05_twitter_instagram.md`*
