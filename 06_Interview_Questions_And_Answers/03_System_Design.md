# 🏗️ System Design - FAANG Level (Frontend + Backend)

> **Target:** L5/E5/SDE-3 System Design Mastery  
> **Duration:** 45-60 minutes per interview  
> **Evaluation:** Architecture, Scalability, Trade-offs, Production Thinking

---

## 📋 Table of Contents

1. [System Design Framework](#framework)
2. [Scalability Fundamentals](#scalability)
3. [Database Design](#database-design)
4. [Caching Strategies](#caching)
5. [Load Balancing](#load-balancing)
6. [Microservices Patterns](#microservices)
7. [Complete System Designs](#complete-designs)
8. [Frontend System Design](#frontend-design)

---

## 🎯 System Design Framework

### The 7-Step Approach

```
1. Clarify Requirements (5 min)
   ├── Functional Requirements
   ├── Non-Functional Requirements
   └── Scale Estimation

2. High-Level Design (10 min)
   ├── Core Components
   ├── Data Flow
   └── APIs

3. Data Model (5 min)
   ├── Database Choice
   ├── Schema Design
   └── Partitioning Strategy

4. Deep Dive (20 min)
   ├── Bottlenecks
   ├── Scaling Strategy
   ├── Consistency vs Availability
   └── Failure Handling

5. Trade-offs Discussion (5 min)
   ├── Different Approaches
   ├── Pros and Cons
   └── Why This Choice

6. Additional Topics (5 min)
   ├── Monitoring
   ├── Security
   └── Cost Optimization

7. Q&A (5 min)
```

---

## 📈 Scalability Fundamentals

### Back-of-the-Envelope Calculations

**Key Numbers to Remember:**

```
Latency Comparison
────────────────────────────────────
L1 cache reference              0.5 ns
Main memory reference         100   ns
Send 1KB over 1 Gbps         10    µs
SSD random read             150    µs
Read 1MB from SSD           1      ms
Disk seek                  10      ms
Read 1MB from disk         20      ms
Send packet CA→Europe     150      ms
```

**Storage & QPS Calculations:**

```
Twitter Example:
- 500M DAU
- 100M tweets/day
- Each tweet: 280 bytes

Daily storage: 100M × 280 = 28 GB/day
5-year storage: 28 GB × 365 × 5 = 51 TB

Peak QPS: 100M / 86400 × 3 = ~3500 tweets/sec
Read QPS (100:1 ratio): 350K reads/sec
```

---

## 💾 Complete Design: Twitter

### 1. Requirements

**Functional:**
- Post tweets (280 chars)
- Follow/unfollow users
- View home timeline
- Search tweets

**Non-Functional:**
- 500M MAU
- Read:Write = 100:1
- p99 latency < 500ms
- 99.9% availability

### 2. High-Level Architecture

```
┌──────────┐
│ Clients  │
└────┬─────┘
     ↓
┌────────────┐
│    CDN     │
└────┬───────┘
     ↓
┌────────────┐
│Load Balancer│
└────┬───────┘
     ↓
┌────────────┐
│API Gateway │
└──┬──┬──┬──┘
   ↓  ↓  ↓
┌─────┐ ┌────────┐ ┌────────┐
│Tweet│ │Timeline│ │  User  │
│Svc  │ │Service │ │Service │
└──┬──┘ └───┬────┘ └───┬────┘
   ↓        ↓           ↓
┌──────────────────────────┐
│    Kafka (Message Bus)    │
└──────────────────────────┘
   ↓
┌──────────┐
│  Fanout  │
│  Worker  │
└─────┬────┘
      ↓
┌──────────┐  ┌──────────┐
│  Redis   │  │Cassandra │
│(Timeline)│  │ (Tweets) │
└──────────┘  └──────────┘
```

### 3. Data Model

**Cassandra (Tweets):**
```cql
CREATE TABLE tweets (
    tweet_id BIGINT,
    user_id BIGINT,
    text VARCHAR,
    created_at TIMESTAMP,
    PRIMARY KEY (user_id, created_at, tweet_id)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

**PostgreSQL (Users/Follows):**
```sql
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    created_at TIMESTAMP
);

CREATE TABLE follows (
    follower_id BIGINT,
    followee_id BIGINT,
    created_at TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id)
);
```

**Redis (Timeline Cache):**
```
Key: timeline:user:{user_id}
Value: Sorted Set of tweet_ids
TTL: 1 hour
```

### 4. Timeline Generation - Hybrid Approach

```java
// Fanout on Write (for normal users)
public void postTweet(Tweet tweet) {
    tweetRepository.save(tweet);
    
    int followerCount = getFollowerCount(tweet.getUserId());
    
    if (followerCount < 10000) {
        // Fanout to all followers
        List<String> followers = getFollowers(tweet.getUserId());
        for (String followerId : followers) {
            redis.zAdd("timeline:" + followerId, 
                      tweet.timestamp, tweet.id);
        }
    }
    // Celebrities: no fanout (pulled on demand)
}

// Read Timeline
public List<Tweet> getTimeline(String userId) {
    // Get from Redis cache
    Set<String> tweetIds = redis.zRevRange(
        "timeline:" + userId, 0, 19
    );
    
    // Merge with celebrity tweets
    List<String> celebrities = getCelebritiesFollowed(userId);
    for (String celeb : celebrities) {
        List<Tweet> celebTweets = getRecentTweets(celeb, 20);
        tweetIds.addAll(celebTweets);
    }
    
    return getTweetsByIds(tweetIds);
}
```

### 5. Scaling Strategies

**Write Scaling:**
- Shard Cassandra by user_id (10 nodes, ~600 tweets/sec each)
- Async fanout via Kafka (50 workers)
- Rate limiting: 5 tweets/min per user

**Read Scaling:**
- Redis cluster (20 nodes, 5K reads/sec each)
- CDN for media (99% cache hit rate)
- Multi-level caching (client → CDN → Redis → DB)

---

## 🏗️ Complete Design: URL Shortener

### Requirements

**Functional:**
- Shorten long URL → short code (7 chars)
- Redirect short → long URL
- Custom aliases (optional)
- Analytics (click count)

**Scale:**
- 100M URLs created/month
- 10B redirects/month
- Read:Write = 100:1

### High-Level Design

```
┌──────────┐
│  Client  │
└────┬─────┘
     ↓
┌────────────┐
│    CDN     │ (Cache popular URLs)
└────┬───────┘
     ↓
┌────────────┐
│API Gateway │
└────┬───────┘
     ↓
┌────────────┐
│ URL Service│
└─────┬──────┘
      ↓
┌──────────┐  ┌──────────┐
│  Redis   │  │PostgreSQL│
│ (Cache)  │  │(URL Map) │
└──────────┘  └──────────┘
```

### Key Design Decisions

**1. Short Code Generation:**

```java
// Approach 1: Base62 encoding of auto-increment ID
public String generateShortCode(long id) {
    String chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    StringBuilder sb = new StringBuilder();
    
    while (id > 0) {
        sb.append(chars.charAt((int)(id % 62)));
        id /= 62;
    }
    
    return sb.reverse().toString();
}

// ID: 1000000 → Short Code: "4c92"
// Guarantees uniqueness (ID is unique)
// Predictable (can guess next URLs)

// Approach 2: Hash + Collision Resolution
public String generateShortCode(String longUrl) {
    String hash = MD5(longUrl);
    String shortCode = hash.substring(0, 7);
    
    while (exists(shortCode)) {
        // Collision! Add salt and retry
        hash = MD5(longUrl + System.nanoTime());
        shortCode = hash.substring(0, 7);
    }
    
    return shortCode;
}

// Random, hard to predict
// Collisions possible (requires DB check)

// Approach 3: Pre-generated pool (Twitter Snowflake style)
public String generateShortCode() {
    // Use distributed ID generator
    long id = snowflake.nextId();  // 64-bit unique ID
    return base62Encode(id).substring(0, 7);
}

// Fast (no DB check)
// Unique across distributed system
// Used by Twitter, Instagram
```

**2. Database Schema:**

```sql
CREATE TABLE urls (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    long_url TEXT NOT NULL,
    user_id BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    click_count BIGINT DEFAULT 0
);

CREATE INDEX idx_short_code ON urls(short_code);
CREATE INDEX idx_user_id ON urls(user_id);

-- Partitioning by created_at (time-based)
-- Old URLs archived to cold storage after 1 year
```

**3. Redirect Flow:**

```java
@GetMapping("/{shortCode}")
public ResponseEntity<Void> redirect(@PathVariable String shortCode) {
    // 1. Check Redis cache
    String longUrl = redis.get("url:" + shortCode);
    
    if (longUrl == null) {
        // 2. Cache miss - fetch from DB
        URL url = urlRepository.findByShortCode(shortCode);
        if (url == null) {
            return ResponseEntity.notFound().build();
        }
        
        longUrl = url.getLongUrl();
        
        // 3. Update cache
        redis.setEx("url:" + shortCode, 3600, longUrl);
    }
    
    // 4. Increment click count (async)
    analyticsQueue.send(new ClickEvent(shortCode));
    
    // 5. Redirect (301 permanent or 302 temporary)
    return ResponseEntity.status(HttpStatus.FOUND)
        .header("Location", longUrl)
        .build();
}

// Analytics worker (separate service)
@KafkaListener(topics = "click-events")
public void processClick(ClickEvent event) {
    redis.incr("clicks:" + event.getShortCode());
    
    // Batch update DB every 5 minutes
    if (shouldFlushToDb()) {
        flushClicksToDatabase();
    }
}
```

**4. Rate Limiting:**

```java
// Prevent abuse: Max 100 URLs/hour per user
public boolean createShortUrl(String longUrl, String userId) {
    String rateLimitKey = "rate_limit:" + userId;
    
    long count = redis.incr(rateLimitKey);
    if (count == 1) {
        redis.expire(rateLimitKey, 3600);  // 1 hour window
    }
    
    if (count > 100) {
        throw new RateLimitExceededException();
    }
    
    // Create short URL
    return shortUrlService.create(longUrl, userId);
}
```

---

## 🌐 Frontend System Design: Infinite Scroll

### Requirements
- Load 20 items initially
- Load more on scroll
- 60fps performance
- Handle network failures

### Implementation

```typescript
function InfiniteScroll() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver>();
  
  // Intersection Observer for scroll detection
  const lastItemRef = useCallback((node: HTMLElement) => {
    if (loading) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    }, { rootMargin: '100px' });  // Load before reaching bottom
    
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore]);
  
  const loadMore = async () => {
    setLoading(true);
    try {
      const newItems = await fetchItems(items.length, 20);
      setItems(prev => [...prev, ...newItems]);
      setHasMore(newItems.length === 20);
    } catch (error) {
      // Retry logic with exponential backoff
      retryWithBackoff(() => loadMore());
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <VirtualList items={items}>
      {(item, index) => (
        <div ref={index === items.length - 1 ? lastItemRef : null}>
          <ItemCard item={item} />
        </div>
      )}
    </VirtualList>
  );
}

// Virtual scrolling for performance
function VirtualList({ items, itemHeight = 200 }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerHeight = window.innerHeight;
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  const visibleItems = items.slice(
    Math.max(0, startIndex - 5),  // Buffer
    Math.min(items.length, endIndex + 5)
  );
  
  // Only render visible items + buffer
  return (
    <div 
      style={{ height: items.length * itemHeight }}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      {visibleItems.map(item => (
        <div 
          key={item.id}
          style={{ 
            position: 'absolute',
            top: item.index * itemHeight 
          }}
        >
          <ItemCard item={item} />
        </div>
      ))}
    </div>
  );
}
```

### Optimizations

```typescript
// 1. Debounced scroll
const debouncedLoadMore = useMemo(
  () => debounce(loadMore, 300),
  []
);

// 2. Request deduplication
const loadingRef = useRef<Promise<void> | null>(null);
const loadMore = () => {
  if (loadingRef.current) return loadingRef.current;
  
  loadingRef.current = fetchItems().finally(() => {
    loadingRef.current = null;
  });
  
  return loadingRef.current;
};

// 3. Lazy image loading
<img
  src={item.imageUrl}
  loading="lazy"
  decoding="async"
  onError={e => e.currentTarget.src = fallbackImage}
/>

// 4. Skeleton loading
{loading && <ItemSkeleton count={3} />}

// 5. Error retry with backoff
const retryWithBackoff = async (fn: Function, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);  // 1s, 2s, 4s
    }
  }
};
```

---

## 📊 Monitoring & Observability

### Key Metrics

```yaml
Application Metrics:
  - Request rate (RPS)
  - Error rate (%)
  - Latency (p50, p95, p99)
  - Success rate (%)

Infrastructure:
  - CPU/Memory usage
  - Network I/O
  - Disk usage
  - Connection pool stats

Business:
  - Daily/Monthly Active Users
  - Conversion rate
  - Revenue
```

### Logging Strategy

```json
{
  "timestamp": "2026-02-20T10:00:00Z",
  "level": "INFO",
  "service": "api-gateway",
  "trace_id": "abc123",
  "user_id": "user456",
  "endpoint": "/api/tweets",
  "method": "POST",
  "status": 201,
  "latency_ms": 45,
  "error": null
}
```

### Distributed Tracing

```
Client → API Gateway → Tweet Service → Database
  50ms      10ms           30ms          60ms

Total: 150ms (60ms in DB query is bottleneck)
```

---

**This is a comprehensive foundation. Would you like me to continue with:**
1. Spring Boot & Microservices deep dive
2. Frontend (React) advanced topics
3. Behavioral interview questions with STAR examples
4. More complete system designs (Payment Gateway, Uber, Netflix, etc.)

Let me know which sections you'd like next!
