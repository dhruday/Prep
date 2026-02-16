# 140. Feed System (Social Media like Facebook, Twitter)

## 📌 Problem Statement

**Design a news feed system** that shows posts from followed users/pages.

**Example**:
```
User follows: Alice, Bob, Charlie
Feed shows: Latest posts from Alice, Bob, Charlie (chronological or ranked)
```

---

## 🎯 Step 1: Requirements

### **Functional Requirements**

1. **Create post**: User creates post (text, image, video)
2. **Follow/unfollow**: User follows other users
3. **View feed**: User sees posts from followed users
4. **Like/comment**: User interacts with posts
5. **Feed types**: Chronological or ranked (algorithmic)

### **Non-Functional Requirements**

1. **Low latency**: Feed loads in < 2 seconds
2. **High availability**: 99.9% uptime
3. **Scalability**: 1 billion users, 100 million DAU
4. **Consistency**: Eventually consistent (acceptable)

---

## 🎯 Step 2: Capacity Estimation

### **Users**

```
Total users: 1 billion
Daily active users (DAU): 100 million
Average follows per user: 200
```

### **Posts**

```
Posts per day: 100M × 2 = 200 million posts
Posts per second: 200M / 86400 = 2.3k posts/sec
```

### **Feed Reads**

```
Feed views per day: 100M × 10 = 1 billion views
Feed views per second: 1B / 86400 = 11.5k req/sec
```

### **Storage**

```
Post size: 1 KB (text + metadata)
Media size: 100 KB average (compressed)

Text storage per day: 200M × 1 KB = 200 GB
Media storage per day: 200M × 100 KB = 20 TB
Total over 5 years: 200 GB × 365 × 5 = 365 TB (text)
                    20 TB × 365 × 5 = 36.5 PB (media)
```

---

## 🎯 Step 3: API Design

### **1. Create Post**

**Request**:
```http
POST /api/posts
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Hello world!",
  "media_urls": ["https://cdn.example.com/image1.jpg"],
  "visibility": "public"  // public, friends, private
}
```

**Response**:
```json
{
  "post_id": 123,
  "user_id": 456,
  "content": "Hello world!",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### **2. Get Feed**

**Request**:
```http
GET /api/feed?limit=20&before=123
```

**Response**:
```json
{
  "posts": [
    {
      "post_id": 122,
      "user_id": 789,
      "username": "alice",
      "content": "Great day!",
      "likes_count": 50,
      "comments_count": 10,
      "created_at": "2024-01-15T09:30:00Z"
    },
    ...
  ],
  "next_cursor": 100
}
```

---

### **3. Like Post**

**Request**:
```http
POST /api/posts/123/like
```

---

### **4. Follow User**

**Request**:
```http
POST /api/users/789/follow
```

---

## 🎯 Step 4: Database Schema

### **Users Table**

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    bio TEXT,
    followers_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **Posts Table**

```sql
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    content TEXT,
    media_urls JSONB,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_created (user_id, created_at DESC)
);
```

### **Follows Table**

```sql
CREATE TABLE follows (
    follower_id BIGINT NOT NULL,
    followee_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, followee_id),
    INDEX idx_follower (follower_id),
    INDEX idx_followee (followee_id)
);
```

### **Likes Table**

```sql
CREATE TABLE likes (
    user_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id),
    INDEX idx_post (post_id)
);
```

---

## 🎯 Step 5: Feed Generation Approaches

### **Approach 1: Pull (Fanout on Read)**

**Concept**: Generate feed when user requests it (pull from followed users' posts)

**Algorithm**:
```python
def get_feed(user_id, limit=20):
    # 1. Get list of followed users
    following = db.query('SELECT followee_id FROM follows WHERE follower_id=?', user_id)
    following_ids = [f['followee_id'] for f in following]  # [Alice, Bob, Charlie]
    
    # 2. Get latest posts from followed users
    posts = db.query('''
        SELECT * FROM posts
        WHERE user_id IN (?)
        ORDER BY created_at DESC
        LIMIT ?
    ''', following_ids, limit)
    
    return posts
```

**Pros**:
- Simple
- No storage overhead (compute on-demand)
- Handles unfollows instantly (no stale data)

**Cons**:
- Slow for users following many people (200+ follows → 200 table scans)
- High database load (every feed request queries database)

**When to use**: Small social networks, fewer follows

---

### **Approach 2: Push (Fanout on Write)**

**Concept**: Pre-compute feed when post is created (push to followers' feeds)

**Algorithm**:
```python
def create_post(user_id, content):
    # 1. Create post
    post_id = db.insert('INSERT INTO posts (user_id, content) VALUES (?, ?)', user_id, content)
    
    # 2. Get followers
    followers = db.query('SELECT follower_id FROM follows WHERE followee_id=?', user_id)
    
    # 3. Fanout: Add post to each follower's feed (Redis)
    for follower in followers:
        redis.lpush(f'feed:{follower["follower_id"]}', post_id)
        redis.ltrim(f'feed:{follower["follower_id"]}', 0, 999)  # Keep latest 1000
    
    return post_id

def get_feed(user_id, limit=20):
    # Read from pre-computed feed (Redis)
    post_ids = redis.lrange(f'feed:{user_id}', 0, limit - 1)
    
    # Hydrate posts (get full post data)
    posts = db.query('SELECT * FROM posts WHERE id IN (?)', post_ids)
    
    return posts
```

**Pros**:
- Fast reads (pre-computed, no computation on read)
- Low latency (< 100ms)

**Cons**:
- Storage overhead (1000 posts × 100M users = 100B feed entries)
- Hotspots (celebrity with 100M followers → 100M writes per post)
- Stale data (if user unfollows, feed has old posts)

**When to use**: Large social networks, fast reads required

---

### **Approach 3: Hybrid (Push + Pull)**

**Concept**: Push for most users, pull for celebrities

**Algorithm**:
```python
def create_post(user_id, content):
    post_id = db.insert('INSERT INTO posts (user_id, content) VALUES (?, ?)', user_id, content)
    
    followers_count = db.query('SELECT followers_count FROM users WHERE id=?', user_id)['followers_count']
    
    if followers_count < 10000:
        # Regular user → Push (fanout on write)
        followers = db.query('SELECT follower_id FROM follows WHERE followee_id=?', user_id)
        for follower in followers:
            redis.lpush(f'feed:{follower["follower_id"]}', post_id)
    else:
        # Celebrity → Don't push (too many followers)
        # Will be fetched on-demand (pull)
        pass
    
    return post_id

def get_feed(user_id, limit=20):
    # 1. Get pre-computed feed (push)
    feed_ids = redis.lrange(f'feed:{user_id}', 0, limit - 1)
    
    # 2. Get celebrities you follow (pull)
    celebrities = db.query('''
        SELECT followee_id FROM follows
        WHERE follower_id=? AND followee_id IN (
            SELECT id FROM users WHERE followers_count > 10000
        )
    ''', user_id)
    
    celebrity_posts = db.query('''
        SELECT * FROM posts
        WHERE user_id IN (?)
        ORDER BY created_at DESC
        LIMIT 10
    ''', [c['followee_id'] for c in celebrities])
    
    # 3. Merge and sort
    all_posts = merge_and_sort(feed_ids, celebrity_posts, limit)
    
    return all_posts
```

**Pros**:
- Fast reads (most users)
- No hotspots (celebrities use pull)

**Cons**:
- Complexity (two code paths)

**When to use**: Large social networks with celebrities (Facebook, Twitter)

---

## 🎯 Step 6: High-Level Design (Hybrid)

```
┌─────────────┐
│   User      │ Creates post
└──────┬──────┘
       │
       │ 1. POST /api/posts
       ▼
┌─────────────────────────────────────┐
│      Post Service (API)             │
│  - Save post to database            │
│  - Publish to fanout queue          │
└──────────────┬──────────────────────┘
               │
               │ 2. Fanout to followers
               ▼
┌─────────────────────────────────────┐
│      Message Queue (Kafka)          │
│  - Topic: posts                     │
└──────────────┬──────────────────────┘
               │
               │ 3. Fanout workers
               ▼
┌─────────────────────────────────────┐
│      Fanout Workers                 │
│  - Get followers                    │
│  - Push post_id to Redis feeds      │
└──────────────┬──────────────────────┘
               │
               │ 4. Store in Redis
               ▼
┌─────────────────────────────────────┐
│         Redis (Feed Cache)          │
│  - Key: feed:{user_id}              │
│  - Value: [post_id1, post_id2, ...] │
└─────────────────────────────────────┘


Feed Read Flow:
┌─────────────┐
│   User      │ Requests feed
└──────┬──────┘
       │
       │ 1. GET /api/feed
       ▼
┌─────────────────────────────────────┐
│      Feed Service (API)             │
│  - Read from Redis (pre-computed)   │
│  - Pull celebrity posts (database)  │
│  - Merge and rank                   │
└──────────────┬──────────────────────┘
               │
               │ 2. Hydrate posts
               ▼
┌─────────────────────────────────────┐
│    Database (PostgreSQL/Cassandra)  │
│  - Posts table                      │
└─────────────────────────────────────┘
```

---

## 🎯 Step 7: Ranking Algorithm

**Chronological** (simple): Sort by time (latest first)

```python
posts = sorted(posts, key=lambda p: p['created_at'], reverse=True)
```

---

**Algorithmic** (Facebook, Twitter): Rank by relevance

**Factors**:
1. **Recency**: Newer posts score higher
2. **Engagement**: More likes/comments score higher
3. **Affinity**: Posts from close friends score higher
4. **Content type**: Video scores higher than text

**Example scoring**:
```python
def calculate_score(post, user):
    recency_score = 1 / (time.time() - post['created_at'])  # Decay over time
    engagement_score = post['likes_count'] + post['comments_count'] * 2
    affinity_score = get_affinity(user, post['user_id'])  # 0-1 (interaction history)
    
    score = recency_score * 0.3 + engagement_score * 0.4 + affinity_score * 0.3
    return score

posts = sorted(posts, key=lambda p: calculate_score(p, user), reverse=True)
```

---

## 🎯 Step 8: Optimizations

### **1. Cache Recent Posts (Redis)**

```python
def get_post(post_id):
    # 1. Check cache
    post = redis.get(f'post:{post_id}')
    
    if post:
        return json.loads(post)
    
    # 2. Cache miss → Query database
    post = db.query('SELECT * FROM posts WHERE id=?', post_id)
    
    # 3. Store in cache (TTL = 1 hour)
    redis.setex(f'post:{post_id}', 3600, json.dumps(post))
    
    return post
```

---

### **2. CDN for Media**

**Problem**: Images/videos served from origin (slow, expensive)

**Solution**: CDN (CloudFront, Cloudflare)

```
User requests image: https://cdn.example.com/image1.jpg
CDN checks cache → If hit, return
              → If miss, fetch from S3, cache, return
```

---

### **3. Pagination (Cursor-Based)**

**Problem**: Offset-based pagination slow for large datasets

**Solution**: Cursor-based (use last post_id)

```http
GET /api/feed?limit=20&before=123

# Returns posts with id < 123
# Next request: GET /api/feed?limit=20&before=100
```

---

## 🎯 Step 9: Real-World Examples

### **1. Facebook**

**Scale**: 2.9 billion users

**Algorithm**: Ranked feed (EdgeRank algorithm)
- Affinity: How often you interact with poster
- Weight: Likes/comments/shares
- Decay: Older posts score lower

**Architecture**: Hybrid (push for friends, pull for pages/celebrities)

---

### **2. Twitter**

**Scale**: 330 million users

**Algorithm**: Home timeline (mix of chronological + ranked)
- Chronological: "Latest tweets" tab
- Ranked: "Home" tab (algorithmic)

**Architecture**: Hybrid (push for most users, pull for high-follower accounts)

---

### **3. Instagram**

**Scale**: 1 billion users

**Algorithm**: Ranked feed (engagement-based)
- Factors: Likes, comments, saves, time spent viewing

**Architecture**: Push (fanout on write) + ranking on read

---

## 🎓 Interview Tips

**Q: "How do you design a news feed system?"**

A: "I use a **hybrid approach** (push + pull):

**Push (Fanout on Write)**:
- When user creates post → Push to all followers' feeds (Redis)
- Works for regular users (<10k followers)
- Fast reads (pre-computed feeds)

**Pull (Fanout on Read)**:
- For celebrities (>10k followers) → Don't push
- When user requests feed → Pull latest posts from celebrities
- Merge with pushed feed, rank, return

**Architecture**:
1. **Post creation**: Save to DB → Fanout workers push to Redis feeds
2. **Feed read**: Read from Redis (pushed) + Query DB (celebrities) → Merge & rank

**Ranking**: Score = Recency × 0.3 + Engagement × 0.4 + Affinity × 0.3

**Scale**: 100M DAU, 11.5k feed reads/sec, <2s latency

Real-world: Facebook (hybrid push/pull), Twitter (ranked timeline)"

---

## 📚 Summary

**Approaches**: Pull (fanout on read, slow), Push (fanout on write, fast), Hybrid (best of both)

**Architecture**: Post Service → Kafka → Fanout Workers → Redis (feed cache)

**Ranking**: Recency + Engagement + Affinity

**Scale**: 100M DAU, 2.3k posts/sec, 11.5k feed reads/sec

**Real-world**: Facebook (EdgeRank), Twitter (Home timeline), Instagram (engagement-based) 🚀

