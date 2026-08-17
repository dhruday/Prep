# Netflix — Senior Software Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Software Engineer |
| **Level** | Senior (L5 equivalent) |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos, CA (Remote) |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Netflix-Software-Engineer-Interview-Questions-EI_IE11891.0,7_KO8,25.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Virtual Onsite)
- **Timeline:** 3 weeks
- **Format:** Virtual (Zoom + CoderPad)
- **Note:** Netflix interviews are very senior-focused. No LeetCode-style grinding — it's real-world design + code quality.

---

## Round 1: Phone Screen — Coding
**Duration:** 60 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Design and implement a Rate Limiter**
   - Multiple algorithms, thread safety, distributed version

### 💡 Interview-Ready Answer

```java
// Token Bucket algorithm — most common for API rate limiting
class TokenBucketRateLimiter {
    private final int maxTokens;
    private final double refillRate; // tokens per second
    private double currentTokens;
    private long lastRefillTime;
    
    public TokenBucketRateLimiter(int maxTokens, double refillRate) {
        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.currentTokens = maxTokens;
        this.lastRefillTime = System.nanoTime();
    }
    
    public synchronized boolean allowRequest() {
        refill();
        if (currentTokens >= 1) {
            currentTokens -= 1;
            return true;
        }
        return false;
    }
    
    private void refill() {
        long now = System.nanoTime();
        double elapsed = (now - lastRefillTime) / 1e9; // seconds
        currentTokens = Math.min(maxTokens, currentTokens + elapsed * refillRate);
        lastRefillTime = now;
    }
}

// Sliding Window Counter — more precise than fixed window
class SlidingWindowRateLimiter {
    private final int maxRequests;
    private final long windowSizeMs;
    private final TreeMap<Long, Integer> requestCounts = new TreeMap<>();
    
    public SlidingWindowRateLimiter(int maxRequests, long windowSizeMs) {
        this.maxRequests = maxRequests;
        this.windowSizeMs = windowSizeMs;
    }
    
    public synchronized boolean allowRequest() {
        long now = System.currentTimeMillis();
        long windowStart = now - windowSizeMs;
        
        // Remove expired entries
        requestCounts.headMap(windowStart).clear();
        
        // Count requests in current window
        int totalRequests = requestCounts.values().stream().mapToInt(Integer::intValue).sum();
        
        if (totalRequests < maxRequests) {
            requestCounts.merge(now, 1, Integer::sum);
            return true;
        }
        return false;
    }
}
```

**Distributed Rate Limiter (Redis-based):**
```lua
-- Redis Lua script for atomic sliding window
local key = KEYS[1]
local window = tonumber(ARGV[1])    -- window size in ms
local limit = tonumber(ARGV[2])      -- max requests
local now = tonumber(ARGV[3])        -- current timestamp

-- Remove old entries
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current requests
local count = redis.call('ZCARD', key)

if count < limit then
    -- Add request
    redis.call('ZADD', key, now, now .. ':' .. math.random())
    redis.call('PEXPIRE', key, window)
    return 1  -- allowed
end

return 0  -- rate limited
```

---

## Round 2: Onsite — System Design I
**Duration:** 60 minutes | **Interviewer:** Staff Engineer

### Questions Asked
1. **Design Netflix's Video Streaming Pipeline**
   - Upload, transcoding, storage, adaptive streaming, CDN delivery

### 💡 Interview-Ready Answer

#### Architecture
```
┌──────────────────────────────────────────────────────────────┐
│                     Content Pipeline                          │
│                                                               │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │  Content     │    │  Transcoding │    │  Quality       │  │
│  │  Ingestion   │───▶│  Pipeline    │───▶│  Assessment    │  │
│  │  (Upload)    │    │  (Media      │    │  (VMAF Score)  │  │
│  │              │    │   Processing)│    │                │  │
│  └─────────────┘    └──────┬───────┘    └────────────────┘  │
│                            │                                  │
│                     ┌──────▼───────┐                         │
│                     │  Asset Store │                         │
│                     │  (S3)        │                         │
│                     │  Multiple    │                         │
│                     │  renditions  │                         │
│                     └──────┬───────┘                         │
│                            │                                  │
└────────────────────────────┼──────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                     Delivery Pipeline                         │
│                                                               │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │  Manifest    │    │  CDN Router  │    │  Open Connect  │  │
│  │  Service     │───▶│  (Steering)  │───▶│  (ISP-local    │  │
│  │  (per-title  │    │              │    │   CDN boxes)   │  │
│  │   encoding)  │    │              │    │                │  │
│  └─────────────┘    └──────────────┘    └────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### Per-Title Encoding (Netflix's Innovation)
```
Traditional: Same encoding ladder for all content
  1080p @ 5800 kbps
  720p  @ 3000 kbps
  480p  @ 1500 kbps

Netflix Per-Title: Analyze content complexity, generate custom ladder
  
  Simple content (e.g., animated show):
    1080p @ 2000 kbps  (looks great — simple visuals)
    720p  @ 1200 kbps
    480p  @ 600 kbps

  Complex content (e.g., action movie with explosions):
    1080p @ 8000 kbps  (needs more bits for detail)
    720p  @ 4500 kbps
    480p  @ 2000 kbps

Result: 20% bandwidth savings with SAME visual quality (measured by VMAF)
```

#### Adaptive Bitrate Streaming (ABR)
```javascript
// Client-side ABR algorithm (simplified)
class ABRController {
    constructor() {
        this.bufferHealth = 0;        // seconds of buffered video
        this.bandwidth = 0;            // estimated bandwidth
        this.lastBitrate = 0;
        this.switchHistory = [];
    }
    
    selectNextBitrate(availableRenditions) {
        // 1. Estimate bandwidth (EWMA - Exponentially Weighted Moving Average)
        this.bandwidth = this.estimateBandwidth();
        
        // 2. Buffer-based selection
        if (this.bufferHealth < 5) {
            // Low buffer: drop to lowest quality immediately
            return availableRenditions[0]; // lowest bitrate
        }
        
        // 3. Bandwidth-based selection (leave 30% margin)
        const safeBandwidth = this.bandwidth * 0.7;
        
        let selected = availableRenditions[0];
        for (const rendition of availableRenditions) {
            if (rendition.bitrate <= safeBandwidth) {
                selected = rendition;
            }
        }
        
        // 4. Anti-oscillation: don't switch quality too frequently
        if (this.switchHistory.length > 3) {
            const recentSwitches = this.switchHistory.slice(-3);
            const oscillating = recentSwitches.some((s, i) => 
                i > 0 && s.direction !== recentSwitches[i-1].direction
            );
            if (oscillating) return { ...selected, bitrate: this.lastBitrate }; // stay
        }
        
        return selected;
    }
    
    estimateBandwidth() {
        // EWMA: weight recent measurements more heavily
        // bandwidth_new = α * measured + (1-α) * bandwidth_old
        // α = 0.3 (smooth out spikes)
    }
}
```

#### Open Connect CDN
```
Netflix doesn't use traditional CDNs (Akamai/CloudFront) for video.
Instead: Open Connect Appliances (OCAs) — custom servers placed inside ISPs.

How it works:
1. Netflix analyzes what content is popular in each region
2. Overnight: pre-populate ISP-local OCAs with predicted popular content
3. When user hits play:
   a. Manifest service returns list of OCAs that have this content
   b. CDN router selects best OCA (closest, least loaded)
   c. User streams directly from ISP's local OCA
   
Benefits:
- Video traffic stays within ISP's network → ultra-low latency
- Netflix saves ~95% on transit costs
- 15,000+ OCA servers in 1000+ ISP locations worldwide
```

---

## Round 3: Onsite — Coding
**Duration:** 60 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Design a cache with TTL support and LRU eviction**
2. **Follow-up: Make it thread-safe without global locks**

### 💡 Interview-Ready Answer

```java
class TTLCache<K, V> {
    private final int capacity;
    private final Map<K, Node<K, V>> map;
    private final Node<K, V> head, tail;
    private final ScheduledExecutorService cleaner;
    private final ReadWriteLock rwLock = new ReentrantReadWriteLock();
    
    static class Node<K, V> {
        K key;
        V value;
        long expiresAt; // epoch millis
        Node<K, V> prev, next;
        
        Node(K key, V value, long ttlMs) {
            this.key = key;
            this.value = value;
            this.expiresAt = System.currentTimeMillis() + ttlMs;
        }
        
        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }
    
    public TTLCache(int capacity) {
        this.capacity = capacity;
        this.map = new ConcurrentHashMap<>();
        this.head = new Node<>(null, null, Long.MAX_VALUE);
        this.tail = new Node<>(null, null, Long.MAX_VALUE);
        head.next = tail;
        tail.prev = head;
        
        // Background cleanup of expired entries every 1 second
        this.cleaner = Executors.newSingleThreadScheduledExecutor();
        this.cleaner.scheduleAtFixedRate(this::cleanExpired, 1, 1, TimeUnit.SECONDS);
    }
    
    public V get(K key) {
        rwLock.readLock().lock();
        try {
            Node<K, V> node = map.get(key);
            if (node == null) return null;
            
            if (node.isExpired()) {
                // Lazy deletion
                rwLock.readLock().unlock();
                rwLock.writeLock().lock();
                try {
                    remove(node);
                    map.remove(key);
                    return null;
                } finally {
                    rwLock.writeLock().unlock();
                    rwLock.readLock().lock();
                }
            }
            
            moveToHead(node);
            return node.value;
        } finally {
            rwLock.readLock().unlock();
        }
    }
    
    public void put(K key, V value, long ttlMs) {
        rwLock.writeLock().lock();
        try {
            Node<K, V> existing = map.get(key);
            if (existing != null) {
                existing.value = value;
                existing.expiresAt = System.currentTimeMillis() + ttlMs;
                moveToHead(existing);
                return;
            }
            
            Node<K, V> node = new Node<>(key, value, ttlMs);
            map.put(key, node);
            addToHead(node);
            
            // Evict LRU if over capacity
            while (map.size() > capacity) {
                Node<K, V> lru = tail.prev;
                remove(lru);
                map.remove(lru.key);
            }
        } finally {
            rwLock.writeLock().unlock();
        }
    }
    
    private void cleanExpired() {
        rwLock.writeLock().lock();
        try {
            Node<K, V> current = tail.prev;
            while (current != head) {
                Node<K, V> prev = current.prev;
                if (current.isExpired()) {
                    remove(current);
                    map.remove(current.key);
                }
                current = prev;
            }
        } finally {
            rwLock.writeLock().unlock();
        }
    }
    
    // Standard doubly-linked list operations
    private void addToHead(Node<K, V> node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
    
    private void remove(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    private void moveToHead(Node<K, V> node) {
        remove(node);
        addToHead(node);
    }
}
```

**Lock-Free Alternative (StampedLock):**
Netflix interviewer asked about reducing lock contention:
- Use `StampedLock` with optimistic reads for `get()`
- ConcurrentLinkedDeque + ConcurrentHashMap for lock-free structure
- Segmented locking (like ConcurrentHashMap) — divide cache into N segments, each with its own lock

---

## Round 4: Onsite — System Design II + Behavioral
**Duration:** 60 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **Design Netflix's Recommendation System** (30 min)
2. **Behavioral questions** (30 min)

### 💡 Interview-Ready Answer — Recommendation System

```
┌─────────────────────────────────────────────────────────────┐
│                   Data Collection Layer                       │
│                                                               │
│  User Signals:                                                │
│  - Explicit: ratings (thumbs up/down), watchlist additions   │
│  - Implicit: watch duration, pause points, rewind zones,    │
│              scroll behavior, time of day, device type       │
│  - Contextual: location, language, trending in region        │
│                                                               │
│  Ingestion: Kafka → Flink/Spark Streaming → Data Lake (S3)  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Model Training (Offline)                    │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Collaborative│  │ Content-Based│  │ Deep Learning    │   │
│  │ Filtering   │  │ Filtering    │  │ (Neural CF)      │   │
│  │ (User-User, │  │ (Genre, Cast,│  │ Embeddings +     │   │
│  │  Item-Item) │  │  Director)   │  │ Attention        │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          ▼                                    │
│              ┌──────────────────┐                            │
│              │  Ensemble Model  │  (weighted combination)    │
│              │  (candidate      │                            │
│              │   generation +   │                            │
│              │   ranking)       │                            │
│              └────────┬─────────┘                            │
│                       │                                      │
│                       ▼                                      │
│              ┌──────────────────┐                            │
│              │  Model Registry  │  (versioned models)        │
│              │  (MLflow)        │                            │
│              └──────────────────┘                            │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   Serving Layer (Online)                       │
│                                                                │
│  Request: "Recommend for user_123 on homepage"                │
│                                                                │
│  Step 1: Candidate Generation                                 │
│    - Collaborative filtering: 500 candidates                  │
│    - Content-based: 200 candidates                            │
│    - Trending/Popular: 100 candidates                         │
│    - Personalized page rows: 50 candidates per row            │
│                                                                │
│  Step 2: Ranking (ML model)                                   │
│    - Input: user features + item features + context           │
│    - Output: P(user will watch and enjoy)                     │
│    - Rank all candidates → top-K per row                      │
│                                                                │
│  Step 3: Filtering & Business Rules                           │
│    - Remove already watched                                   │
│    - Apply content maturity filters                           │
│    - Diversity injection (avoid 10 thrillers in a row)        │
│    - Freshness boost for new releases                         │
│                                                                │
│  Step 4: Artwork Personalization                              │
│    - Choose thumbnail image most likely to appeal to user     │
│    - A/B tested: personalized artwork → 20% more clicks       │
│                                                                │
│  Response time: < 100ms (pre-computed + cached in Redis)      │
└──────────────────────────────────────────────────────────────┘
```

**Netflix's Two-Stage Approach:**
1. **Candidate Generation:** Fast, broad retrieval (ANN — Approximate Nearest Neighbors using user/item embeddings). Retrieves ~1000 candidates in <10ms.
2. **Ranking:** Expensive ML model scores each candidate. Features include: user's viewing history, time since last watch, genre affinity scores, cast popularity, item freshness, social signals.

---

## 🎯 Key Takeaways
- Netflix interviews **don't focus on LeetCode** — it's about real-world engineering quality
- Rate Limiter must include **multiple algorithms** (Token Bucket, Sliding Window, Leaky Bucket)
- **Per-Title Encoding** and **Open Connect** are Netflix's key differentiators — mention them
- **ABR algorithm** is a great deep-dive topic for streaming system design
- **TTL + LRU Cache** with thread safety is a Netflix coding favorite
- Recommendation system design: know **two-stage architecture** (candidate gen + ranking)
- Netflix culture: **"Context, not Control"** — show you can make independent decisions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | Rate Limiting, Concurrency |
| Round 2 | Very Hard | Video Pipeline, CDN, ABR |
| Round 3 | Hard | Cache + TTL + Thread Safety |
| Round 4 | Hard | Recommendation System, ML at Scale |
