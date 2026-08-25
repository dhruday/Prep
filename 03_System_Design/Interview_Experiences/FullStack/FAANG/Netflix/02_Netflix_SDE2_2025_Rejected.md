# Netflix — SDE-2 FullStack Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Los Gatos, CA |
| **Source** | [Blind](https://www.teamblind.com/post/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 3 Technical + Culture Fit)
- **Timeline:** 4 weeks
- **Rejection Reason:** Culture fit — didn't demonstrate enough "freedom and responsibility" mindset
- **Note:** Netflix is famously the hardest culture fit interview in tech

---

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Design a Rate Limiter** (implement Token Bucket + explain Leaky Bucket)
2. **Follow-up: Distributed rate limiter across multiple servers**

### 💡 Interview-Ready Answer — Distributed Rate Limiter

```java
// Local Token Bucket (see earlier files for implementation)
// Distributed version: Redis-based sliding window

class DistributedRateLimiter {
    private final JedisPool jedisPool;
    private final int maxRequests;
    private final long windowMs;
    
    DistributedRateLimiter(JedisPool jedisPool, int maxRequests, long windowMs) {
        this.jedisPool = jedisPool;
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    
    boolean isAllowed(String clientId) {
        String key = "rate:" + clientId;
        long now = System.currentTimeMillis();
        
        // Lua script for atomic sliding window check
        String luaScript = """
            local key = KEYS[1]
            local now = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local maxReqs = tonumber(ARGV[3])
            
            -- Remove entries outside the window
            redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
            
            -- Count current entries in window
            local count = redis.call('ZCARD', key)
            
            if count < maxReqs then
                -- Allow: add timestamp as both score and member
                redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
                redis.call('PEXPIRE', key, window)
                return 1
            else
                return 0
            end
        """;
        
        try (Jedis jedis = jedisPool.getResource()) {
            Object result = jedis.eval(luaScript, 
                List.of(key), 
                List.of(String.valueOf(now), String.valueOf(windowMs), String.valueOf(maxRequests)));
            return ((Long) result) == 1;
        }
    }
}

// Trade-offs:
// Sliding Window Log: precise, but O(n) memory per client
// Fixed Window Counter: simple, but boundary burst problem
// Sliding Window Counter: best of both (approximate, low memory)
// Token Bucket: allows controlled bursts
// Leaky Bucket: fixed output rate (no bursts)
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Netflix's A/B Testing Platform**
   - Feature flags, experiment assignment, metric collection, statistical analysis

### 💡 Interview-Ready Answer

```
A/B Testing Platform:
┌──────────────────────────────────────────────────────────────┐
│  Netflix runs ~300 A/B tests concurrently across:            │
│  - UI changes (recommendation row layout)                    │
│  - Algorithm changes (personalization model)                 │
│  - Infrastructure changes (video encoding)                   │
│                                                                │
│  Experiment Assignment:                                       │
│  - Deterministic: hash(userId + experimentId) → bucket       │
│  - Consistent: same user always in same bucket               │
│  - Independent: experiments don't interfere with each other  │
│                                                                │
│  Assignment algorithm:                                        │
│  hash = MD5(userId + ":" + experimentId)                     │
│  bucket = hash % 100                                         │
│  if bucket < control_percentage → CONTROL (50%)              │
│  else → TREATMENT (50%)                                      │
│                                                                │
│  Interaction handling (multi-experiment):                     │
│  - Layer system: experiments in same "layer" are mutually    │
│    exclusive (user in only one experiment per layer)         │
│  - Experiments in different layers can overlap               │
│  - Layer assignment: hash(userId + layerId) → experiment     │
│                                                                │
│  Architecture:                                                │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │ Experiment  │  │ Assignment   │  │ Client SDK       │     │
│  │ Config API  │─▶│ Service      │◀─│ (Netflix app)    │     │
│  │ (CRUD)      │  │              │  │ getExperiment()  │     │
│  └────────────┘  └──────┬───────┘  └──────────────────┘     │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐     │
│  │  Event Pipeline:                                     │     │
│  │  User action → Kafka → metric aggregation            │     │
│  │  → Flink (streaming) → pre-aggregated metrics        │     │
│  │  → Druid (OLAP) → statistical analysis               │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                                │
│  Metrics:                                                     │
│  - Primary: streaming hours, retention (did user come back?) │
│  - Secondary: click-through rate, browse time, search usage  │
│  - Guardrail: error rate, latency, crash rate (don't degrade)│
│                                                                │
│  Statistical Analysis:                                        │
│  - Sequential testing (not just p-value at end)              │
│  - False discovery rate control (300 tests → many false +)   │
│  - Bayesian approach for faster decisions                    │
│  - Minimum detectable effect (MDE) → sample size calculator  │
│  - Typically 2-4 weeks per experiment for significance       │
│                                                                │
│  Feature Flags (non-experimental):                            │
│  - canary: 1% → 5% → 25% → 100% rollout                    │
│  - kill switch: instant 0% (override all experiments)        │
│  - Regional targeting: country/device-specific flags         │
│  - Client caches assignment for 24h (reduce API calls)       │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 3: Coding
**Duration:** 60 minutes

### Questions Asked
1. **LRU Cache with TTL** (combination of LeetCode 146 + expiry)
2. **Follow-up: Thread-safe version with concurrent reads**

### 💡 Thread-Safe LRU Cache with TTL

```java
class ConcurrentLRUCache<K, V> {
    private final int capacity;
    private final long defaultTTLMs;
    private final Map<K, Node<K, V>> map;
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    private final Node<K, V> head, tail;
    
    ConcurrentLRUCache(int capacity, long defaultTTLMs) {
        this.capacity = capacity;
        this.defaultTTLMs = defaultTTLMs;
        this.map = new HashMap<>();
        head = new Node<>(null, null, 0);
        tail = new Node<>(null, null, 0);
        head.next = tail;
        tail.prev = head;
    }
    
    V get(K key) {
        lock.readLock().lock();
        try {
            Node<K, V> node = map.get(key);
            if (node == null) return null;
            if (isExpired(node)) {
                // Need write lock to remove
                lock.readLock().unlock();
                lock.writeLock().lock();
                try {
                    removeNode(node);
                    map.remove(key);
                    return null;
                } finally {
                    lock.readLock().lock(); // Downgrade
                    lock.writeLock().unlock();
                }
            }
            // Move to head needs write lock
            return node.value; // Read without moving (trade-off for concurrency)
        } finally {
            lock.readLock().unlock();
        }
    }
    
    void put(K key, V value) {
        put(key, value, defaultTTLMs);
    }
    
    void put(K key, V value, long ttlMs) {
        lock.writeLock().lock();
        try {
            Node<K, V> existing = map.get(key);
            if (existing != null) {
                existing.value = value;
                existing.expiresAt = System.currentTimeMillis() + ttlMs;
                moveToHead(existing);
            } else {
                if (map.size() >= capacity) evict();
                
                Node<K, V> node = new Node<>(key, value, System.currentTimeMillis() + ttlMs);
                map.put(key, node);
                addToHead(node);
            }
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    private void evict() {
        // Try to evict expired first
        Node<K, V> curr = tail.prev;
        long now = System.currentTimeMillis();
        while (curr != head) {
            if (now > curr.expiresAt) {
                Node<K, V> prev = curr.prev;
                removeNode(curr);
                map.remove(curr.key);
                return;
            }
            curr = curr.prev;
        }
        // No expired → evict LRU
        Node<K, V> lru = tail.prev;
        if (lru != head) {
            removeNode(lru);
            map.remove(lru.key);
        }
    }
    
    private boolean isExpired(Node<K, V> node) {
        return System.currentTimeMillis() > node.expiresAt;
    }
    
    private void addToHead(Node<K, V> node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
    
    private void removeNode(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    private void moveToHead(Node<K, V> node) {
        removeNode(node);
        addToHead(node);
    }
    
    static class Node<K, V> {
        K key; V value; long expiresAt;
        Node<K, V> prev, next;
        Node(K k, V v, long exp) { key = k; value = v; expiresAt = exp; }
    }
}
```

---

## Round 4: Culture Fit
**Duration:** 60 minutes | **Interviewers:** 2 senior engineers

### Netflix Culture Core Values Discussed
```
1. Judgment (make wise decisions despite ambiguity)
2. Communication (candid, direct, even when uncomfortable)
3. Impact (accomplish amazing amounts of important work)
4. Curiosity (learn rapidly and eagerly)
5. Innovation (create new ideas that prove useful)
6. Courage (say what you think; make tough decisions)
7. Passion (inspire others with your thirst for excellence)
8. Honesty (non-political; admit mistakes freely)
9. Selflessness (help colleagues succeed)
```

### Questions Asked
1. **"Tell me about a time you made a decision that was unpopular but right"** (Courage)
2. **"How do you handle a team member who consistently underperforms?"** (Honesty + Judgment)
3. **"Describe a situation where you took on a project outside your comfort zone"** (Curiosity)

---

## 🎯 Key Takeaways
- Netflix culture fit is **pass/fail and extremely hard** — prepare deeply
- **A/B Testing platform** = Netflix's unique system design question — know layers, assignment, metrics
- **Rate Limiter** at the distributed level → Redis Lua script for atomicity
- **Concurrent LRU Cache** → ReadWriteLock, trade-off: exact LRU vs concurrency
- Netflix expects **"freedom and responsibility"** — show you can operate autonomously
- I got **rejected on culture fit** — my answers showed too much reliance on management approval
- Netflix wants people who **make decisions, not seek permission**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | Rate Limiter, Distributed, Redis |
| System Design | Very Hard | A/B Testing, Experimentation, Stats |
| Coding | Hard | LRU + TTL, Concurrency, ReadWriteLock |
| Culture Fit | Very Hard | Netflix Culture Values |
