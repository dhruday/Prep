# 146. Real-World Architectures (FAANG & Top Tech Companies)

## 📌 Purpose

Understanding **how real companies architect their systems** at scale provides invaluable insights for system design interviews. This document covers actual architectures from top tech companies.

---

## 🎯 Netflix — Video Streaming at Global Scale

### **Scale**

- **230+ million subscribers** globally
- **1+ billion hours** watched per week
- **15,000+ video titles**
- **200+ million API requests per day**

### **Architecture Overview**

```
User
  ↓
CDN (Open Connect) — 17,000+ servers in ISPs globally
  ↓ (Cache miss)
AWS Cloud
  ├── API Gateway (Zuul)
  ├── Microservices (Spring Boot + gRPC)
  │   ├── User Service
  │   ├── Recommendation Service (ML-based)
  │   ├── Playback Service
  │   └── Billing Service
  ├── Data Storage
  │   ├── Cassandra (user data, viewing history)
  │   ├── MySQL (billing, subscriptions)
  │   ├── ElasticSearch (search)
  │   └── S3 (video files)
  └── Messaging
      ├── Kafka (event streaming)
      └── SQS (async processing)
```

### **Key Design Decisions**

**1. Open Connect CDN (Custom CDN)**

**Why?**
- Third-party CDNs couldn't handle Netflix's scale
- Cost: Reduce AWS egress costs (millions saved)
- Performance: <100ms latency globally

**How?**
- Netflix places servers **inside ISP networks**
- Pre-fills popular content during off-peak hours
- 95%+ of traffic served from Open Connect (not AWS)

---

**2. Microservices Architecture**

**Count:** 1000+ microservices

**Why?**
- Teams scale independently
- Deploy 4,000+ times per day
- Failure isolation (one service down ≠ entire site down)

**Challenges:**
- Service discovery (Eureka)
- Circuit breakers (Hystrix)
- Distributed tracing (Zipkin)

---

**3. Chaos Engineering**

**Tool:** Chaos Monkey (open source)

**Purpose:** Randomly kill production instances to test resilience

**Philosophy:** "If it can fail, it will fail"

**Example:**
```
Chaos Monkey randomly terminates 10% of instances
→ System must auto-recover (no manual intervention)
→ Forces teams to design for failure
```

---

**4. Recommendation Engine**

**Algorithm:** Collaborative filtering + Deep learning (TensorFlow)

**Data:**
- Watch history
- Search queries
- Time of day
- Device type
- Pause/rewind behavior

**Result:** 80%+ of watched content comes from recommendations

---

**5. Encoding (Per-Title Optimization)**

**Problem:** Fixed bitrate wastes bandwidth

**Solution:** ML-based per-title encoding

**Example:**
```
Action movie (high motion): 5 Mbps for 1080p
Documentary (low motion): 2 Mbps for 1080p
→ 20% bandwidth savings
```

---

### **Lessons for Interviews**

✅ **CDN is critical for video streaming** (Open Connect custom CDN)  
✅ **Microservices enable scale** (1000+ services, 4000+ deploys/day)  
✅ **Design for failure** (Chaos Monkey, circuit breakers)  
✅ **ML drives recommendations** (80% of views from recommendations)  
✅ **Per-title encoding** (save bandwidth, ML-optimized)

---

## 🎯 Uber — Real-Time Ride Matching

### **Scale**

- **130+ million users**
- **23+ million trips per day**
- **10,000+ cities** across 70+ countries
- **6.3+ billion trips per year**

### **Architecture Overview**

```
Rider App / Driver App
  ↓
API Gateway (HTTP/2 + gRPC)
  ↓
Microservices Layer
  ├── Dispatch Service (ride matching)
  ├── Pricing Service (surge pricing)
  ├── ETA Service (estimated time)
  ├── Maps Service (routing)
  └── Payment Service
  ↓
Data Layer
  ├── Schemaless (MySQL + blob storage for fast writes)
  ├── Cassandra (trip history, driver locations)
  ├── Redis (driver geo-location, real-time state)
  └── PostgreSQL (payments, accounting)
  ↓
Streaming
  ├── Kafka (event streaming)
  └── Flink (real-time analytics)
```

### **Key Design Decisions**

**1. DISCO (Dispatch Optimization)**

**Problem:** Match rider with nearest driver in <1 second

**Algorithm:**
```
1. Rider requests ride → Location (lat, lon)
2. Query Redis Geo Index: GEORADIUS 37.7749 -122.4194 5km
   → Returns drivers within 5km
3. Filter available drivers (not in trip, online)
4. Calculate ETA for each driver
5. Rank by ETA + driver rating
6. Send request to top 3 drivers (parallel)
7. First driver to accept wins
```

**Optimization:** Redis Geo Index (sorted set with geohashes)

---

**2. Schemaless (Custom MySQL Wrapper)**

**Problem:** MySQL too slow for high write throughput

**Solution:** Schemaless = MySQL sharding + blob storage

**Architecture:**
```sql
CREATE TABLE trips (
    id BIGINT PRIMARY KEY,
    data BLOB  -- JSON blob (all trip data)
);

-- Shard by trip_id (hash-based)
shard = trip_id % 1024  -- 1024 shards
```

**Benefits:**
- 10x faster writes (no complex schema)
- Schema changes don't require migrations

**Trade-off:** Can't query by nested fields (no indexes on JSON)

---

**3. Real-Time Location Tracking**

**Challenge:** Track 100k+ drivers in real-time

**Solution:**
```
Driver app → WebSocket → Location Service → Redis (GEOADD)

GEOADD drivers 37.7749 -122.4194 driver_123
→ Updates every 5 seconds
```

**Query:**
```
GEORADIUS drivers 37.7749 -122.4194 5 km WITHDIST
→ Returns drivers within 5km with distance
```

**Scale:** 100k drivers × 12 updates/min = 1.2M writes/min

---

**4. Surge Pricing**

**Algorithm:**
```
1. Divide city into hexagonal grid (H3 by Uber)
2. Track supply (available drivers) and demand (ride requests) per hex
3. If demand > supply × threshold:
   surge_multiplier = demand / supply
4. Apply multiplier to base price
```

**Example:**
```
Base price: $10
Surge multiplier: 2.5x
Final price: $25
```

**Why hexagons?** Uniform distance from center (better than squares)

---

**5. Trip Ranking (Machine Learning)**

**Model:** XGBoost (gradient boosting)

**Features:**
- Historical trip data
- Driver rating
- Driver acceptance rate
- Distance to pickup
- Time of day

**Goal:** Maximize driver acceptance rate (reduce wait time)

---

### **Lessons for Interviews**

✅ **Geo-indexing is critical** (Redis GEORADIUS for driver matching)  
✅ **Schemaless design for high writes** (MySQL sharding + blob storage)  
✅ **Real-time location tracking** (WebSocket + Redis Geo)  
✅ **Dynamic pricing** (H3 hexagonal grid, supply/demand)  
✅ **ML-based ranking** (XGBoost for driver selection)

---

## 🎯 Twitter — Real-Time Tweet Feed

### **Scale**

- **450+ million users**
- **500+ million tweets per day**
- **6,000 tweets per second** (average)
- **150,000+ tweets per second** (peak, e.g., World Cup)

### **Architecture Overview**

```
User
  ↓
API Gateway (HTTP/2)
  ↓
Services
  ├── Tweet Service (write tweets)
  ├── Timeline Service (read home timeline)
  ├── Fanout Service (push to followers)
  └── Search Service (ElasticSearch)
  ↓
Storage
  ├── Manhattan (distributed key-value store)
  ├── Gizzard (MySQL sharding framework)
  ├── Redis (timeline cache)
  └── FlockDB (social graph)
  ↓
Streaming
  └── Kafka (event streaming)
```

### **Key Design Decisions**

**1. Tweet Fanout (Hybrid Push/Pull)**

**Problem:** Celebrity tweets → 100M followers → 100M writes (bottleneck)

**Solution:** Hybrid approach
```
Regular users (<10k followers):
  → Push (Fanout-on-write)
  → When user tweets, push to all followers' timelines

Celebrities (>10k followers):
  → Pull (Fanout-on-read)
  → When follower reads timeline, query celebrity tweets on-demand
```

**Code:**
```python
def create_tweet(user_id, content):
    tweet_id = save_tweet(user_id, content)
    
    followers_count = get_followers_count(user_id)
    
    if followers_count < 10000:
        # Push to followers' timelines
        followers = get_followers(user_id)
        for follower_id in followers:
            redis.lpush(f"timeline:{follower_id}", tweet_id)
            redis.ltrim(f"timeline:{follower_id}", 0, 999)  # Keep latest 1000
    else:
        # Celebrity: don't push (pull on read)
        pass
```

---

**2. Timeline Assembly**

**Algorithm:**
```
1. Get pre-computed timeline from Redis (regular users' tweets)
2. Query celebrity tweets (users with >10k followers that user follows)
3. Merge and sort by timestamp
4. Hydrate tweet data (fetch full tweet objects)
5. Apply ranking algorithm (if not chronological)
```

**Code:**
```python
def get_timeline(user_id, limit=20):
    # 1. Pre-computed timeline (pushed tweets)
    timeline_ids = redis.lrange(f"timeline:{user_id}", 0, limit - 1)
    
    # 2. Celebrity tweets (pull)
    celebrities = get_following_celebrities(user_id)
    celebrity_tweets = []
    for celeb_id in celebrities:
        tweets = db.query(
            "SELECT id FROM tweets WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
            celeb_id
        )
        celebrity_tweets.extend(tweets)
    
    # 3. Merge and sort
    all_tweet_ids = timeline_ids + celebrity_tweets
    all_tweet_ids.sort(key=lambda t: t.created_at, reverse=True)
    
    # 4. Hydrate (fetch full tweet data)
    tweets = db.query("SELECT * FROM tweets WHERE id IN (?)", all_tweet_ids[:limit])
    
    return tweets
```

---

**3. Manhattan (Distributed Key-Value Store)**

**Why custom database?**
- Cassandra didn't meet latency requirements (P99 <5ms)
- Need strong consistency for critical data (tweets, users)

**Architecture:**
- LSM tree-based storage (like RocksDB)
- Multi-datacenter replication
- P99 latency: <1ms reads, <5ms writes

---

**4. Snowflake ID Generation**

**Problem:** Need unique tweet IDs across distributed system

**Solution:** Snowflake algorithm

**Format:**
```
64 bits:
  - 41 bits: timestamp (milliseconds since epoch)
  - 10 bits: machine ID (supports 1024 machines)
  - 12 bits: sequence (4096 IDs per millisecond per machine)

Example: 266664624238387200 (tweet ID)
```

**Benefits:**
- Sortable by time (first 41 bits)
- No coordination needed (each machine generates independently)
- 4.1 million IDs per second per machine

---

**5. Rate Limiting**

**Algorithm:** Token bucket (per user, per endpoint)

**Example:**
```
User 123, endpoint /api/tweets:
  - Limit: 300 tweets per 3 hours
  - Bucket: 300 tokens
  - Refill: 100 tokens/hour

If user exceeds → 429 Too Many Requests
Response headers:
  X-Rate-Limit-Limit: 300
  X-Rate-Limit-Remaining: 250
  X-Rate-Limit-Reset: 1704000000
```

---

### **Lessons for Interviews**

✅ **Hybrid fanout for scalability** (push for regular users, pull for celebrities)  
✅ **Custom distributed database** (Manhattan for <1ms P99 latency)  
✅ **Snowflake IDs** (distributed unique ID generation, sortable)  
✅ **Timeline assembly** (merge pre-computed + celebrity tweets)  
✅ **Token bucket rate limiting** (300 tweets/3 hours)

---

## 🎯 WhatsApp — Messaging at Scale

### **Scale**

- **2+ billion users**
- **100+ billion messages per day**
- **450 million voice/video calls per day**

### **Architecture Overview**

```
Client App
  ↓
WebSocket Connection
  ↓
Chat Servers (Erlang/OTP)
  ├── Connection Manager (maintain connections)
  ├── Message Router (route to recipient)
  └── Offline Storage (queue messages)
  ↓
Database
  ├── Mnesia (in-memory, distributed)
  └── MySQL (user metadata)
  ↓
Media Storage
  └── S3 (images, videos, encrypted)
```

### **Key Design Decisions**

**1. Erlang for Concurrency**

**Why Erlang?**
- Designed for telecom (99.9999% uptime)
- Lightweight processes (10k+ connections per server)
- Hot code swapping (deploy without downtime)

**Example:**
```erlang
% Each connection = 1 Erlang process
handle_message(UserId, Message) ->
    % Route to recipient
    RecipientPid = find_process(Message.recipient_id),
    RecipientPid ! {new_message, Message},
    % Acknowledge to sender
    {reply, ok}.
```

---

**2. End-to-End Encryption (Signal Protocol)**

**Algorithm:** Double Ratchet Algorithm

**Flow:**
```
1. Alice and Bob exchange public keys
2. Derive shared secret (ECDH)
3. Each message encrypted with unique key (ratchet forward)
4. Server never sees plaintext (only encrypted blob)
```

**Benefits:**
- Even WhatsApp can't read messages
- Forward secrecy (compromised key doesn't decrypt past messages)

---

**3. Offline Message Delivery**

**Problem:** Recipient offline → Store message until online

**Solution:**
```
1. Sender sends message to server
2. Server checks if recipient online
3. If online → Push via WebSocket
4. If offline → Store in offline queue (up to 30 days)
5. When recipient reconnects → Deliver all queued messages
```

**Storage:** Mnesia in-memory database (persisted to disk)

---

**4. Media Compression**

**Problem:** Images/videos consume bandwidth

**Solution:**
- Images: Compress to 75% quality (JPEG)
- Videos: Re-encode to lower bitrate (H.264)
- Audio: Opus codec (16 kbps)

**Example:**
```
Original image: 5 MB
Compressed: 500 KB (10x reduction)
```

---

**5. Status Updates (Stories)**

**Storage:** Ephemeral (24 hours)

**Architecture:**
```
User uploads status (image/video)
  ↓
Upload to S3 (encrypted)
  ↓
Store metadata in Cassandra (TTL = 24 hours)
  ↓
Auto-delete after 24 hours
```

---

### **Lessons for Interviews**

✅ **Erlang for massive concurrency** (10k+ connections per server)  
✅ **End-to-end encryption** (Signal Protocol, server can't read messages)  
✅ **Offline message queue** (Mnesia, store up to 30 days)  
✅ **Media compression** (10x reduction, Opus/H.264)  
✅ **Ephemeral storage** (status/stories auto-delete after 24h)

---

## 🎯 Instagram — Photo Sharing & Feed

### **Scale**

- **1+ billion users**
- **95+ million photos/videos per day**
- **4.2+ billion likes per day**

### **Architecture Overview**

```
Client App
  ↓
API Gateway (Django/Python)
  ↓
Services
  ├── Feed Service (generate feed)
  ├── Upload Service (photos/videos)
  ├── Likes Service
  └── Comments Service
  ↓
Storage
  ├── PostgreSQL (users, posts metadata)
  ├── Cassandra (feed, activity)
  ├── Redis (timeline cache)
  └── S3 (photos, videos)
  ↓
CDN (CloudFront)
```

### **Key Design Decisions**

**1. Feed Generation (Ranked)**

**Algorithm:** ML-based ranking

**Factors:**
- Interest (how often you interact with poster)
- Timeliness (recent posts higher)
- Relationship (close friends higher)
- Engagement (likes, comments, saves)

**Score:**
```python
score = (
    0.3 * interest_score +
    0.2 * recency_score +
    0.2 * relationship_score +
    0.3 * engagement_score
)
```

**Feed assembly:**
```python
def get_feed(user_id, limit=20):
    # 1. Get posts from last 7 days (following users)
    following = get_following(user_id)
    candidate_posts = db.query(
        "SELECT * FROM posts WHERE user_id IN (?) AND created_at > NOW() - INTERVAL 7 DAY",
        following
    )
    
    # 2. Rank by ML model
    ranked_posts = ml_model.predict(user_id, candidate_posts)
    
    # 3. Return top N
    return ranked_posts[:limit]
```

---

**2. Photo Upload (Multi-Step)**

**Flow:**
```
1. Client requests upload URL (presigned S3 URL)
2. Client uploads photo directly to S3
3. Client calls /api/posts/create with S3 key
4. Server generates thumbnails (3 sizes: 150px, 320px, 640px)
5. Server saves post metadata to database
6. Server pushes post_id to followers' feeds (fanout)
```

**Code:**
```python
@app.route('/api/posts/upload', methods=['POST'])
def upload_post():
    # 1. Generate presigned URL
    photo_key = f"photos/{user_id}/{uuid.uuid4()}.jpg"
    presigned_url = s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': 'instagram-photos', 'Key': photo_key},
        ExpiresIn=3600
    )
    
    return {'upload_url': presigned_url, 'photo_key': photo_key}

@app.route('/api/posts/create', methods=['POST'])
def create_post():
    # 2. Generate thumbnails
    generate_thumbnails(photo_key)
    
    # 3. Save to database
    post_id = db.insert("INSERT INTO posts (user_id, photo_url) VALUES (?, ?)")
    
    # 4. Fanout to followers
    followers = get_followers(user_id)
    for follower_id in followers:
        redis.lpush(f"feed:{follower_id}", post_id)
    
    return {'post_id': post_id}
```

---

**3. Cassandra for Feed Storage**

**Why Cassandra?**
- Write-heavy workload (95M posts/day)
- High availability (no single point of failure)
- Tunable consistency (eventual consistency OK for feeds)

**Schema:**
```cql
CREATE TABLE user_feed (
    user_id bigint,
    post_id bigint,
    created_at timestamp,
    PRIMARY KEY (user_id, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Query: Get latest 20 posts for user
SELECT * FROM user_feed WHERE user_id = 123 LIMIT 20;
```

---

**4. Explore Page (Discovery)**

**Algorithm:** Collaborative filtering

**Example:**
```
User A likes posts from users X, Y, Z
User B also likes posts from X, Y, Z
→ Recommend posts from User B to User A
```

**Implementation:** Apache Spark for batch processing

---

**5. Stories (Ephemeral Content)**

**Storage:** Redis (TTL = 24 hours)

**Architecture:**
```
User uploads story
  ↓
Upload to S3 (encrypted)
  ↓
Store in Redis: stories:{user_id} = [story_ids] (TTL = 24 hours)
  ↓
Auto-expire after 24 hours
```

---

### **Lessons for Interviews**

✅ **ML-based feed ranking** (interest, recency, relationship, engagement)  
✅ **Multi-step photo upload** (presigned S3 URL, thumbnail generation, fanout)  
✅ **Cassandra for feeds** (write-heavy, high availability, tunable consistency)  
✅ **Explore page** (collaborative filtering, Apache Spark)  
✅ **Stories ephemeral storage** (Redis TTL 24 hours)

---

## 📚 Summary Table

| Company   | Scale                  | Key Tech                     | Main Challenge             | Solution                        |
|-----------|------------------------|------------------------------|----------------------------|---------------------------------|
| Netflix   | 230M users, 1B hrs/wk  | Open Connect CDN, Cassandra  | Global video streaming     | Custom CDN in ISPs              |
| Uber      | 23M trips/day          | Schemaless, Redis Geo        | Real-time ride matching    | Redis GEORADIUS, H3 grid        |
| Twitter   | 500M tweets/day        | Manhattan KV, Snowflake ID   | Celebrity fanout bottleneck| Hybrid push/pull                |
| WhatsApp  | 100B messages/day      | Erlang, Signal Protocol      | End-to-end encryption      | Double Ratchet Algorithm        |
| Instagram | 95M posts/day          | Cassandra, ML ranking        | Ranked feed generation     | Collaborative filtering, Spark  |

---

## 🎓 Interview Takeaways

**When discussing real-world architectures:**

1. **Mention scale** (users, QPS, data volume)
2. **Explain key tech choices** (why Cassandra, Redis, custom CDN)
3. **Highlight trade-offs** (consistency vs availability, push vs pull)
4. **Discuss evolution** (started simple, scaled to millions)
5. **Reference failures** (how they handled outages)

**Example Answer:**

> "Instagram uses **Cassandra for feed storage** because it's write-heavy (95M posts/day). They use **ML-based ranking** (interest, recency, engagement) instead of chronological. For photo uploads, they use **presigned S3 URLs** (client uploads directly, reducing server load). Stories use **Redis with TTL=24h** for ephemeral storage. The feed generation is a **hybrid approach**: pre-compute for regular users, pull on-demand for high-follower accounts."

🚀

