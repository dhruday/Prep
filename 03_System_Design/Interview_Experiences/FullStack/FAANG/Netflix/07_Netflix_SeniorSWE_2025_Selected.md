# Netflix — Senior SWE FullStack Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Software Engineer |
| **Level** | Senior |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos, CA |
| **Source** | [Levels.fyi](https://www.levels.fyi/blog/) |
| **Author** | Anonymous |
| **Team** | Personalization & Algorithms |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Design a Priority Expiring Cache** (LRU + TTL + Priority)
2. **Follow-up: Items with higher priority should be evicted last even if LRU**

### 💡 Priority-Expiring Cache

```java
/**
 * Eviction order:
 * 1. Expired entries (always evicted first, regardless of priority)
 * 2. Among non-expired: lowest priority first, then LRU within same priority
 * 
 * Data structures:
 * - HashMap: key → CacheEntry (O(1) lookup)
 * - TreeMap<Priority, LinkedHashMap>: priority → LRU ordered map at that priority level
 * - PriorityQueue<(expiresAt, key)>: min-heap for efficient expiry checking
 */
class PriorityExpiringCache<K, V> {
    private final int capacity;
    private final Map<K, CacheEntry<K, V>> map;
    private final TreeMap<Integer, LinkedHashMap<K, CacheEntry<K, V>>> priorityBuckets;
    private final PriorityQueue<long[]> expiryHeap; // [expiresAt, entryId]
    private final Map<K, Long> keyToEntryId; // For invalidating stale expiry entries
    private long nextEntryId = 0;
    
    PriorityExpiringCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        this.priorityBuckets = new TreeMap<>();
        this.expiryHeap = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        this.keyToEntryId = new HashMap<>();
    }
    
    V get(K key) {
        evictExpired();
        
        CacheEntry<K, V> entry = map.get(key);
        if (entry == null) return null;
        
        if (entry.isExpired()) {
            remove(key);
            return null;
        }
        
        // Move to end of LRU within its priority bucket (most recently used)
        LinkedHashMap<K, CacheEntry<K, V>> bucket = priorityBuckets.get(entry.priority);
        bucket.remove(key);
        bucket.put(key, entry);
        
        return entry.value;
    }
    
    void put(K key, V value, int priority, long ttlMs) {
        evictExpired();
        
        if (map.containsKey(key)) {
            remove(key);
        }
        
        if (map.size() >= capacity) {
            evictOne();
        }
        
        long expiresAt = System.currentTimeMillis() + ttlMs;
        long entryId = nextEntryId++;
        
        CacheEntry<K, V> entry = new CacheEntry<>(key, value, priority, expiresAt, entryId);
        map.put(key, entry);
        keyToEntryId.put(key, entryId);
        
        priorityBuckets
            .computeIfAbsent(priority, p -> new LinkedHashMap<>(16, 0.75f, true))
            .put(key, entry);
        
        expiryHeap.offer(new long[]{expiresAt, entryId});
    }
    
    private void evictExpired() {
        long now = System.currentTimeMillis();
        
        while (!expiryHeap.isEmpty()) {
            long[] top = expiryHeap.peek();
            
            if (top[0] > now) break; // No more expired entries
            
            expiryHeap.poll();
            
            // Check if this expiry entry is still valid (not stale)
            // Find the key with this entryId
            for (var kv : keyToEntryId.entrySet()) {
                if (kv.getValue() == top[1]) {
                    CacheEntry<K, V> entry = map.get(kv.getKey());
                    if (entry != null && entry.entryId == top[1] && entry.isExpired()) {
                        remove(kv.getKey());
                    }
                    break;
                }
            }
        }
    }
    
    private void evictOne() {
        if (map.isEmpty()) return;
        
        // Find lowest priority bucket
        Map.Entry<Integer, LinkedHashMap<K, CacheEntry<K, V>>> lowest = priorityBuckets.firstEntry();
        if (lowest == null) return;
        
        // Remove LRU entry from that bucket (first entry in LinkedHashMap)
        LinkedHashMap<K, CacheEntry<K, V>> bucket = lowest.getValue();
        K lruKey = bucket.keySet().iterator().next();
        remove(lruKey);
    }
    
    private void remove(K key) {
        CacheEntry<K, V> entry = map.remove(key);
        if (entry == null) return;
        
        keyToEntryId.remove(key);
        
        LinkedHashMap<K, CacheEntry<K, V>> bucket = priorityBuckets.get(entry.priority);
        if (bucket != null) {
            bucket.remove(key);
            if (bucket.isEmpty()) priorityBuckets.remove(entry.priority);
        }
    }
    
    static class CacheEntry<K, V> {
        K key;
        V value;
        int priority;
        long expiresAt;
        long entryId;
        
        CacheEntry(K key, V value, int priority, long expiresAt, long entryId) {
            this.key = key; this.value = value; this.priority = priority;
            this.expiresAt = expiresAt; this.entryId = entryId;
        }
        
        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Netflix's Recommendation System**
   - Personalized home page: rows of content
   - Row selection: which categories to show
   - Within-row ranking: which titles in what order
   - Real-time signal incorporation: just watched → update recs
   - Cold start: new user with no history
   - Scale: 300M subscribers, 15K titles, <200ms response

### 💡 Recommendation System Architecture

```
Netflix Home Page Structure:
┌──────────────────────────────────────────────┐
│ Because you watched "Stranger Things"        │
│ [Title1] [Title2] [Title3] [Title4] →       │
├──────────────────────────────────────────────┤
│ Trending Now                                 │
│ [Title5] [Title6] [Title7] [Title8] →       │
├──────────────────────────────────────────────┤
│ Top Picks for {User}                        │
│ [Title9] [Title10] [Title11] [Title12] →    │
├──────────────────────────────────────────────┤
│ New Releases                                 │
│ ...                                          │
└──────────────────────────────────────────────┘

Two-Phase Recommendation:
Phase 1: Offline (Batch, runs daily/hourly)
┌──────────────────────────────────────────────┐
│ Input signals:                                │
│ • Watch history (what, when, how long)        │
│ • Explicit ratings (thumbs up/down)           │
│ • Browse history (impressions, scroll depth)  │
│ • Search queries                              │
│ • Device, time of day, day of week            │
│ • Content features (genre, actors, language)   │
│                                               │
│ Models (Spark + TensorFlow):                  │
│                                               │
│ 1. Collaborative Filtering                    │
│    • Matrix Factorization (SVD++)            │
│    • User embedding × Item embedding = score  │
│    • Handles implicit feedback (watch time)   │
│                                               │
│ 2. Content-Based                              │
│    • Title embeddings (genre, actors, themes)  │
│    • User profile = weighted avg of watched    │
│    • Cosine similarity for recommendations     │
│                                               │
│ 3. Deep Learning Ranker                       │
│    • Two-tower model: user tower + item tower  │
│    • Candidate generation: top 1000 per user   │
│    • Ranking: score each candidate             │
│    • Features: user-title interaction history   │
│                                               │
│ Output: pre-computed recommendation lists      │
│ stored in Cassandra (partition: userId)        │
│ ~40 rows × 75 items per row = 3000 items/user │
└──────────────────────────────────────────────┘

Phase 2: Online (Real-time, at request time)
┌──────────────────────────────────────────────┐
│ 1. Fetch pre-computed rows from Cassandra     │
│                                               │
│ 2. Row Selection (which rows to show):        │
│    • MAB (Multi-Armed Bandit) per row         │
│    • Thompson Sampling: explore vs exploit     │
│    • "Because you watched X" only if X was     │
│      recent (last 7 days) and watched >60%    │
│                                               │
│ 3. Row Ordering (which row goes where):       │
│    • Page-level optimization model             │
│    • Maximize probability of engagement        │
│    • Top row = most likely to drive a play     │
│                                               │
│ 4. Within-Row Ranking (fine-tuning):          │
│    • Incorporate real-time signals:            │
│      - Just finished a show → boost similar    │
│      - Time of day: morning = short content    │
│      - Device: TV = cinematic, phone = mobile  │
│    • Artwork personalization:                  │
│      - Multiple artwork variants per title     │
│      - MAB selects which artwork for this user │
│      - Action fan → action scene artwork       │
│      - Romance fan → romance scene artwork     │
│                                               │
│ 5. Filtering:                                 │
│    • Remove already watched (90%+ completion)  │
│    • Remove titles leaving soon (unless started)│
│    • Parental controls / profile restrictions   │
│    • Regional availability                     │
│                                               │
│ Response time budget: < 200ms                  │
│ Cassandra read: 20ms                          │
│ Row selection: 30ms                           │
│ Filtering + ranking: 50ms                     │
│ Artwork selection: 20ms                       │
│ Network + serialization: 80ms                 │
└──────────────────────────────────────────────┘

Cold Start (New User):
┌──────────────────────────────────────────────┐
│ Progressive disclosure:                       │
│                                               │
│ 1. Sign-up: ask for 3 favorite titles/genres  │
│    → Seed user embedding from selections      │
│                                               │
│ 2. First session: popularity-based rows       │
│    + genre rows matching selections            │
│    + "Trending Now" (universal)               │
│                                               │
│ 3. After 5+ watches: switch to collaborative  │
│    filtering (enough signal for embeddings)   │
│                                               │
│ 4. After 20+ watches: full personalization    │
│    model kicks in                             │
│                                               │
│ Exploration: always include 10-20% diverse    │
│ recommendations (avoid filter bubble)         │
└──────────────────────────────────────────────┘

A/B Testing:
- Every model change A/B tested (1-2% of traffic initially)
- Key metrics: hours played per member, retention rate, search rate
- Netflix runs 100+ A/B tests simultaneously
- Interleaving for ranking: combine A and B results, measure preference
```

---

## 🎯 Key Takeaways
- Netflix Senior = **Priority+TTL cache + Recommendation system design**
- **Priority-Expiring Cache**: TreeMap of priority buckets, each an LRU LinkedHashMap — evict lowest priority first, then LRU within
- **Expiry heap**: min-heap of `(expiresAt, entryId)` — entry IDs prevent stale eviction after updates
- **Two-phase recommendation**: offline (batch, heavy ML) → online (real-time personalization, <200ms)
- **Artwork personalization**: MAB selects which artwork variant to show per user — significant engagement lift
- **Cold start**: progressive — ask preferences → popularity → collaborative filtering → full personalization
- **Multi-Armed Bandit**: Thompson Sampling for row selection — balance exploration vs exploitation
- Netflix interviews: **high bar on system design** — expect deep diving into ML pipeline + real-time serving

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Cache with Priority + TTL |
| System Design | Very Hard | Recommendation System, ML Serving |
| Technical 2 | Hard | Distributed Systems |
| Culture Fit | Medium | Netflix Freedom & Responsibility |
| Bar Raiser | Hard | Technical Depth |
