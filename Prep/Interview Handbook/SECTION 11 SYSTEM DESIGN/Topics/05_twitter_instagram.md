# Problem 05 — Design Twitter/X + Instagram (Social Media Feed)

> Frequency: ⭐⭐⭐⭐⭐ | Asked at: Meta, Twitter, LinkedIn, Google | Difficulty: 🔴 Senior

---

## PART 1 — Problem Statement

### Functional Requirements
- Post tweets/photos (text, images, video)
- Follow/unfollow users
- View personalized feed (chronological or algorithmic)
- Like, retweet/repost, reply, bookmark
- Search (hashtags, users, content)
- Notifications (new follower, mention, like)
- Explore/trending page
- Stories (Instagram - 24h ephemeral content)

### Non-Functional Requirements
- **Scale:** 300M DAU (Twitter), 500M DAU (Instagram)
- **Tweets/day:** 500M tweets/day
- **Feed read QPS:** 300,000+ reads/sec
- **Latency:** Feed load < 300ms (p99)
- **Availability:** 99.99%
- **Eventual Consistency:** Feed doesn't need to be perfectly real-time

### The Core Challenge: Fan-out Problem
```
Celebrity with 100M followers posts a tweet
→ Need to update 100M feeds
→ 100M DB writes in seconds
→ This is the hardest part of Twitter's architecture
```

---

## PART 2 — Clarification Questions

```
□ Chronological or algorithmic feed?
□ What's the max followers limit? (Twitter: no limit, Instagram: some limits)
□ Do we need real-time push for new posts?
□ What are the read/write patterns? (mostly reads)
□ Need to support verified/important users differently?
□ Video in scope?
□ Stories (24h ephemeral) in scope?
□ DMs in scope?
```

---

## PART 3 — Capacity Estimation

```
=== TWITTER SCALE ===
DAU:                    300M users
Tweets posted/day:      500M tweets/day
Write QPS:              500M / 86,400 ≈ 5,800/sec
Peak write QPS:         ~17,000/sec

Feed reads/day:         300M × 10 feed refreshes × 20 tweets = 60B reads/day
Read QPS:               60B / 86,400 ≈ 694,000/sec
Peak read QPS:          ~2M reads/sec

Read/Write ratio:       120:1 (extremely read-heavy)

=== STORAGE ===
Per tweet:              ~500 bytes (text + metadata)
Daily tweet storage:    500M × 500B = 250 GB/day
Images (20% of tweets): 500M × 20% × 300KB = 30 TB/day
Videos (5% of tweets):  500M × 5% × 10MB = 250 TB/day

Total daily:            ~280 TB/day
Per year:               ~100 PB

=== FEED CACHE ===
Per user feed (100 tweet IDs × 8 bytes): 800 bytes
300M users × 800 bytes = 240 GB in cache
Redis with 64GB nodes: 4 nodes for full cache coverage
```

---

## PART 4 — High-Level Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │           Client (Mobile / Web)               │
                    └────────────────┬─────────────────────────────┘
                                     │
                    ┌────────────────▼────────────────────────────┐
                    │         CDN / API Gateway                    │
                    │     (Rate limiting, Auth, SSL term)          │
                    └──────┬──────────┬───────────┬───────────────┘
                           │          │            │
              ┌────────────▼──┐  ┌────▼──────┐  ┌▼──────────────┐
              │  Tweet Write  │  │ Feed Read │  │ Search / Trend │
              │  Service      │  │ Service   │  │ Service        │
              └───────┬───────┘  └─────┬─────┘  └───────┬────────┘
                      │                │                  │
                      ▼                ▼                  ▼
              ┌────────────┐    ┌────────────┐    ┌────────────────┐
              │ Fan-out    │    │ Feed Cache  │    │ Elasticsearch  │
              │ Service    │    │ (Redis)     │    │                │
              └─────┬──────┘    └────────────┘    └────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
  ┌─────────────┐     ┌──────────────────────────────────────┐
  │ Tweet Store │     │         Message Queue (Kafka)          │
  │ (Cassandra) │     │  Topics: tweet-events, notifications  │
  └─────────────┘     └──────────────────────────────────────┘
                                      │
                     ┌────────────────┼────────────────┐
                     ▼                ▼                ▼
              ┌────────────┐  ┌──────────────┐  ┌──────────────┐
              │  Fan-out   │  │ Notification │  │  Analytics   │
              │  Workers   │  │ Service      │  │  Service     │
              └────────────┘  └──────────────┘  └──────────────┘
```

---

## PART 5 — Data Model

### Tweets (Cassandra)
```sql
CREATE TABLE tweets (
    tweet_id        BIGINT PRIMARY KEY,     -- Snowflake ID (time-ordered)
    user_id         BIGINT NOT NULL,
    content         TEXT,                   -- max 280 chars
    media_urls      LIST<TEXT>,             -- S3 URLs
    reply_to_id     BIGINT,                 -- null if original
    retweet_of_id   BIGINT,
    hashtags        LIST<TEXT>,
    created_at      TIMESTAMP,
    like_count      BIGINT,
    retweet_count   BIGINT,
    reply_count     BIGINT,
    is_deleted      BOOLEAN DEFAULT FALSE
);

-- User's tweets timeline (for profile page)
CREATE TABLE user_tweets (
    user_id     BIGINT,
    tweet_id    BIGINT,
    created_at  TIMESTAMP,
    PRIMARY KEY (user_id, tweet_id)
) WITH CLUSTERING ORDER BY (tweet_id DESC);
```

### Social Graph (Users / Follows)
```sql
-- Relational DB (MySQL/PostgreSQL) - follower counts are manageable
CREATE TABLE users (
    user_id         BIGINT PRIMARY KEY,
    username        VARCHAR(50) UNIQUE,
    display_name    VARCHAR(100),
    bio             TEXT,
    profile_pic_url TEXT,
    follower_count  BIGINT DEFAULT 0,
    following_count BIGINT DEFAULT 0,
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP
);

CREATE TABLE follows (
    follower_id     BIGINT,
    followee_id     BIGINT,
    created_at      TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, followee_id)
);

CREATE INDEX idx_followees ON follows(followee_id);  -- "who follows me"
```

### Feed (Redis - sorted set per user)
```
Key:   "feed:{user_id}"
Type:  Sorted Set
Score: tweet_id (Snowflake → time-ordered)
Value: tweet_id

Operations:
  ZADD feed:{user_id} tweet_id tweet_id    → Add tweet to feed
  ZREVRANGE feed:{user_id} 0 19            → Get latest 20 tweets
  ZREMRANGEBYRANK feed:{user_id} 0 -501    → Trim to 500 tweets
  
Memory: 300M users × 100 tweet IDs × 8 bytes ≈ 240 GB
        Feasible with Redis Cluster (4 × 64GB nodes)
```

### Likes (Cassandra)
```sql
CREATE TABLE likes (
    tweet_id    BIGINT,
    user_id     BIGINT,
    created_at  TIMESTAMP,
    PRIMARY KEY (tweet_id, user_id)
);

-- User's liked tweets (for profile)
CREATE TABLE user_likes (
    user_id     BIGINT,
    tweet_id    BIGINT,
    created_at  TIMESTAMP,
    PRIMARY KEY (user_id, tweet_id)
) WITH CLUSTERING ORDER BY (tweet_id DESC);
```

---

## PART 6 — API Design

```http
# Post tweet
POST /api/v1/tweets
Authorization: Bearer {token}
{ "content": "Hello world! #first", "media_ids": ["img-abc"] }
Response 201: { "tweet_id": "1234567890", ... }

# Get feed (home timeline)
GET /api/v1/feed?cursor={last_tweet_id}&limit=20
Response 200: {
  "tweets": [...],
  "next_cursor": "tweet_id_for_next_page",
  "has_more": true
}

# Upload media
POST /api/v1/media
Content-Type: multipart/form-data
→ Returns { "media_id": "img-abc", "url": "..." }

# Like tweet
POST /api/v1/tweets/{tweet_id}/like
DELETE /api/v1/tweets/{tweet_id}/like

# Follow user
POST /api/v1/users/{user_id}/follow
DELETE /api/v1/users/{user_id}/follow

# Search
GET /api/v1/search?q=python&type=tweets&cursor=...
GET /api/v1/search?q=@elonmusk&type=users
```

---

## PART 7 — Deep Dive: The Fan-out Problem

### Three Approaches to Feed Generation

#### Option 1: Fan-out on Write (Push Model)
```
When user posts tweet:
  1. Write tweet to DB
  2. Look up all followers (could be 100M for celebrity)
  3. Insert tweet_id into each follower's feed cache

Pros:  Feed reads are O(1) — pre-computed
Cons:  Write amplification! Celebrity with 100M followers
       = 100M Redis writes per tweet
       = system overwhelmed on viral tweet
```

#### Option 2: Fan-out on Read (Pull Model)
```
When user opens feed:
  1. Get list of all people I follow
  2. Fetch recent tweets from each
  3. Merge and sort by time

Pros:  No write amplification, writes are fast
Cons:  Read is slow (O(following_count) lookups)
       User follows 1000 people → 1000 DB reads per feed load
```

#### Option 3: Hybrid (Twitter's Actual Approach)
```
Regular users (< 10K followers): Fan-out on WRITE
  → Push tweet to all followers' feeds immediately

Celebrities (> 10K followers): Fan-out on READ
  → Don't push to followers
  → On feed load, fetch celebrity's recent tweets separately
  → Merge with precomputed feed from others

Implementation:
  Celebrity tweet → write to their own feed only (user_tweets table)
  On feed read:
    1. Load user's precomputed feed from Redis
    2. Fetch accounts user follows that are "celebrities"
    3. Fetch recent tweets from celebrities
    4. Merge and deduplicate
    5. Return sorted result

Threshold: ~10,000 followers (configurable)
```

```python
# Fan-out worker (for regular users)
def fan_out(tweet_id, author_id):
    tweet = db.get_tweet(tweet_id)
    followers = db.get_followers(author_id)  # all followers
    
    # Batch write to Redis
    pipeline = redis.pipeline()
    for follower_id in followers:
        cache_key = f"feed:{follower_id}"
        pipeline.zadd(cache_key, {tweet_id: tweet_id})  # score = tweet_id (time-ordered)
        pipeline.zremrangebyrank(cache_key, 0, -501)     # keep only latest 500
    pipeline.execute()

# Feed read service
def get_feed(user_id, cursor=None, limit=20):
    # 1. Get precomputed feed from Redis
    feed_key = f"feed:{user_id}"
    if cursor:
        tweet_ids = redis.zrevrangebyscore(feed_key, cursor-1, 0, count=limit)
    else:
        tweet_ids = redis.zrevrange(feed_key, 0, limit-1)
    
    # 2. Fetch tweets I follow from "celebrities" (accounts with >10K followers)
    celebrity_follows = db.get_celebrity_follows(user_id)
    celebrity_tweets = db.get_recent_tweets_from(celebrity_follows, limit=limit)
    
    # 3. Merge and sort
    all_tweet_ids = list(tweet_ids) + [t.id for t in celebrity_tweets]
    all_tweet_ids = sorted(set(all_tweet_ids), reverse=True)[:limit]
    
    # 4. Hydrate tweets (batch fetch from cache/DB)
    tweets = batch_get_tweets(all_tweet_ids)
    return tweets
```

---

## PART 8 — Scalability: Feed at Scale

### 10K Users
```
Single server, PostgreSQL for everything
Pull model (fan-out on read) — simple
No caching needed
```

### 1M Users
```
Redis for feed cache (push model for all users)
Separate tweet store
Background workers for fan-out
Read replicas for PostgreSQL
```

### 10M Users
```
Cassandra for tweets (write scale)
Redis Cluster for feeds
Kafka for async fan-out
Separate services: tweet, feed, follow, notification
Media on S3 + CDN
```

### 100M Users
```
Hybrid fan-out (celebrity detection)
Multiple Kafka partitions per user shard
Elasticsearch for search
Dedicated recommendation team
Multi-region deployment
```

### 300M+ DAU (Twitter Scale)
```
Thousands of servers per service
GraphQL API layer
ML-based algorithmic timeline
Real-time trending detection
Custom distributed cache (Manhattan at Twitter)
Content moderation at scale (ML + human review)
```

---

## PART 9 — Algorithmic Feed

```
Modern Twitter/Instagram: Algorithmic by default (not pure chronological)

Ranking signals:
  - Engagement rate of author (likes, retweets per impression)
  - Relationship strength (how often do you interact with this user?)
  - Content relevance (topics you engage with)
  - Recency (newer content ranked higher)
  - Media type (video gets boost on Instagram)
  - Predicted CTR (will you click?)
  
Architecture:
  Candidate generation (recall):
    → Get 1000 tweets from your network
    → Use collaborative filtering + content signals
  
  Ranking (precision):
    → Neural network scores each candidate
    → Re-rank for diversity (don't show all same author)
    → Apply filters (spam, sensitive content)
  
  Output: 20-50 ranked tweets

Pipeline:
  Offline (hourly):   Retrain ranking model on engagement data
  Near-real-time:     Update user interest vectors (Flink)
  Online (per request): Candidate fetch + score + rank (< 100ms)
```

---

## PART 10 — Instagram Stories

```
Stories are ephemeral (24-hour TTL)

Storage:
  CREATE TABLE stories (
    story_id     BIGINT PRIMARY KEY,
    user_id      BIGINT,
    media_url    TEXT,          -- S3 URL
    media_type   VARCHAR(20),   -- 'image', 'video'
    created_at   TIMESTAMP,
    expires_at   TIMESTAMP,     -- created_at + 24 hours
    view_count   INT DEFAULT 0
  );

  TTL in Cassandra → auto-delete after 24 hours

Story views (who viewed my story?):
  CREATE TABLE story_views (
    story_id    BIGINT,
    viewer_id   BIGINT,
    viewed_at   TIMESTAMP,
    PRIMARY KEY (story_id, viewer_id)
  );
  TTL: 24 hours (deleted with story)

Feed of stories:
  Redis sorted set: "stories_feed:{user_id}"
  Score = story expiry timestamp
  Auto-prune expired stories with ZREMRANGEBYSCORE

Ordering:
  Users you interact with most → first in story tray
  Close friends ring: special subset
```

---

## PART 16 — Monitoring

```
Key Metrics:
  - Tweet delivery latency (p50, p99)
  - Feed load time (p50, p99, p999)
  - Fan-out queue depth (Kafka lag)
  - Cache hit rate (target > 95%)
  - CDN cache hit rate for media
  - Error rate per API endpoint

Alerts:
  - Fan-out lag > 30 seconds → celebrity tweet storm
  - Cache hit rate drops → cache warming issue
  - Write QPS spike → bot activity / viral event
```

---

## PART 20 — Interview Summary

### 5-Minute Answer
> "Twitter's core challenge is the fan-out problem. When a celebrity with 50M followers tweets, you can't write to 50M Redis feeds simultaneously. The solution is a hybrid model: regular users use push (fan-out on write, tweet_ids stored in each follower's Redis sorted set). Celebrities use pull (fetched at read time and merged). Tweets are stored in Cassandra (write-scale), feed in Redis sorted sets, social graph in MySQL, media in S3+CDN."

### 15-Minute Answer
Add:
> "Data model details: tweets use Snowflake IDs (time-ordered, no coordination). Feed is a Redis sorted set per user (score = tweet_id, gives time ordering for free). Fan-out happens asynchronously via Kafka workers after write. Celebrity threshold: ~10K followers. Feed read merges Redis feed + celebrity tweets, hydrates tweet objects (also cached), returns paginated with cursor. For search: Elasticsearch indexes tweet content with near-real-time lag. Trending: Flink stream processing counts hashtag frequency in sliding windows."

### 45-Minute Deep Dive
Add:
> "At Twitter scale: algorithmic timeline (not just chronological) requires ML candidate generation + ranking. Manhattan (Twitter's custom distributed KV store) replaced Redis for feeds at billion-user scale. Real-time events (World Cup, elections) cause massive write spikes — auto-scaling fan-out workers with Kafka consumer groups handles this. Media: CDN pre-warms popular images; video uses adaptive bitrate. Snowflake ID service: each DC has unique machine ID, generates 4096 IDs/millisecond, globally unique. Social graph: at 300M users, follow relationships are stored in a sharded graph DB (FlockDB at Twitter). Content moderation: ML classifier on all tweets, human review queue for borderline cases."

---

*Next: `06_uber_maps.md`*
