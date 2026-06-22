# Problem 11 — Design a Search Engine

> Frequency: ⭐⭐⭐⭐ | Asked at: Google, Elasticsearch, LinkedIn | Difficulty: 🔥 Staff

---

## PART 1 — Problem Statement

### Functional Requirements
- Crawl the web and index pages
- Handle search queries (keywords, phrases, boolean)
- Return ranked results (relevance + freshness)
- Autocomplete / query suggestions
- Spelling correction
- Search filters (date, type, domain)

### Non-Functional Requirements
- **Web scale:** 10B+ pages indexed
- **Query QPS:** 100K queries/sec (Google scale)
- **Latency:** Results in < 300ms
- **Freshness:** Major pages indexed within hours
- **Index size:** Petabytes of data

---

## PART 4 — High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        Web Crawler                             │
│                                                                │
│  Seed URLs → URL Frontier (priority queue) → Fetcher Cluster  │
│                    │                               │          │
│              DNS Resolver                    HTML Parser      │
│                                              URL Extractor    │
│                                                    │          │
│                                             Back to Frontier  │
└───────────────────────────────────────────────────────────────┘
                        │
                        ▼ Crawled content
┌───────────────────────────────────────────────────────────────┐
│                    Indexing Pipeline                           │
│                                                                │
│  HTML Parser → Content Extractor → Text Processor →           │
│  Deduplication → Link Analyzer → Indexer                      │
└───────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│                    Index Storage                               │
│                                                                │
│  Forward Index:  doc_id → {title, url, snippet, terms}        │
│  Inverted Index: term → [doc_id, position, frequency...]      │
│                                                                │
│  Stored in: Bigtable / Cassandra / custom store               │
└───────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│                     Query Service                              │
│                                                                │
│  Query → Parser → Rewriter → Index Lookup → Ranker → Results  │
└───────────────────────────────────────────────────────────────┘
```

---

## PART 7 — Deep Dive: Components

### Web Crawler

```
URL Frontier (Priority Queue):
  Priority based on:
  - Page rank (important pages crawled more often)
  - Freshness (news sites: every hour; Wikipedia: daily; static: weekly)
  - Robots.txt compliance

Politeness:
  - One request per domain per second (avoid DDoSing sites)
  - Respect Crawl-Delay in robots.txt
  - User-Agent string identifies crawler

Architecture:
  URL Frontier (Redis sorted set, score = next_crawl_time)
      │
  Dispatcher distributes URLs to Fetcher servers
      │
  Fetcher cluster (thousands of servers): HTTP fetch
      │
  Content queue → Parser workers → Extracted links back to Frontier

Scale:
  Google crawls ~1B pages/day
  Need: 10K+ fetcher servers
  DNS resolution: local DNS cache (massively reduces DNS load)
  Dedup: Bloom filter for already-crawled URLs
```

### Inverted Index

```
How it works:
  Documents: 
    Doc1: "Python is great"
    Doc2: "Python and Java"
    Doc3: "Java is popular"
  
  Inverted Index:
    "python" → [(Doc1, pos:0, freq:1), (Doc2, pos:0, freq:1)]
    "java"   → [(Doc2, pos:2, freq:1), (Doc3, pos:0, freq:1)]
    "great"  → [(Doc1, pos:2, freq:1)]
    "popular"→ [(Doc3, pos:2, freq:1)]

Posting list: sorted list of (doc_id, frequency, positions)
Compressed: delta encoding for doc IDs, variable-byte encoding

Query "python java":
  Intersect posting lists for "python" and "java"
  → Doc2 appears in both → candidate result

Index sharding:
  Document-based sharding: shard N handles docs N*M to (N+1)*M
  Term-based sharding: shard N handles certain terms
  Hybrid: typically document-based for balanced load
```

### Ranking (PageRank + Relevance)

```
TF-IDF (Term Frequency - Inverse Document Frequency):
  TF:  How often term appears in this document
  IDF: How rare is this term across all documents
  Score = TF × IDF
  
  "the" → high TF, very low IDF (common word) → low score
  "Python" → medium TF, medium IDF → decent score

PageRank:
  Importance of a page = weighted sum of incoming links
  Pages with many high-quality links rank higher
  Recursive: links from important pages count more

Modern ranking (ML-based, Google's approach):
  200+ signals: PageRank, content relevance, freshness, 
  user click data, page speed, mobile-friendly, HTTPS...
  Learned ranking model (LambdaRank, neural ranking)
  BERT for semantic understanding (since 2019)
```

### Autocomplete

```
Trie data structure:
  p → py → pyt → pyth → pytho → python
  
  PATRICIA trie / Compressed trie for space efficiency
  Store top-K suggestions at each node (precomputed)
  
Distributed Trie:
  Too large for single server
  Shard by first 2 characters: "py" → Shard 1, "ja" → Shard 2
  
Real-time updates:
  Log search queries → Kafka → Flink aggregation (1-hour windows)
  Top queries per prefix → update trie
  
Implementation: Elasticsearch completion suggester (simpler than custom trie)
```

---

## PART 20 — Search Summary

### 5-Minute Answer
> "A search engine has four parts: crawler (fetches web pages, respects robots.txt, priority queue for freshness), indexer (builds inverted index: term → list of documents), ranker (TF-IDF for relevance, PageRank for authority, ML model combining 200+ signals), and query service (parse query → look up inverted index → intersect posting lists → rank → return). At scale: inverted index sharded by document ID, replicated for fault tolerance. Autocomplete: trie sharded by prefix, top-K stored at each node, updated from query logs."

---

---

# Problem 12 — Design a News Feed

> Frequency: ⭐⭐⭐⭐⭐ | Asked at: Meta, LinkedIn, Twitter | Difficulty: 🔴 Senior

---

## PART 1 — Problem Statement

### Functional Requirements
- Users see posts from friends/connections
- Feed supports: text, images, links, videos
- Like, comment, share actions
- Real-time updates (new posts appear)
- Pagination (infinite scroll)
- Feed algorithm (relevance, not just chronological)

### Non-Functional Requirements
- **Scale:** 500M DAU, 100M posts/day
- **Feed load:** < 500ms
- **Consistency:** Eventual (slight delay is acceptable)
- **Availability:** 99.99%

---

## PART 3 — Capacity Estimation

```
DAU:                500M
Posts/day:          100M (1 post per 5 users)
Write QPS:          100M / 86,400 ≈ 1,200/sec
Peak write:         ~5,000/sec

Feed reads/day:     500M × 10 = 5B feed loads
Read QPS:           5B / 86,400 ≈ 58,000/sec
Peak read:          ~180,000/sec

Read:Write = ~50:1 (extremely read-heavy)
Optimize heavily for reads!
```

---

## PART 4 — Architecture

```
Write Path:
  Post Created → Write Service → DB + Cache + Kafka
                                     │
                               Fan-out Workers
                                     │
                           Update each follower's feed cache

Read Path:
  User opens app → Feed Service → Redis (user's feed)
                                → Hydrate post objects
                                → Return ranked results
```

Same hybrid fan-out as Twitter (see Problem 05) applies here.

---

## PART 5 — Data Model

```sql
-- Posts
CREATE TABLE posts (
    post_id     BIGINT PRIMARY KEY,    -- Snowflake
    user_id     BIGINT NOT NULL,
    content     TEXT,
    media_urls  JSONB,
    type        VARCHAR(20),           -- 'text', 'photo', 'video', 'link'
    privacy     VARCHAR(20),           -- 'public', 'friends', 'only_me'
    created_at  TIMESTAMP,
    like_count  BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0
);

-- Feed cache (Redis)
-- Key: "feed:{user_id}"
-- Type: Sorted Set  
-- Score: post_id (Snowflake → time-ordered)
-- Value: post_id (hydrate separately)
-- Size: keep latest 200 posts per user

-- Friendship graph (MySQL - managed scale)
CREATE TABLE friendships (
    user_id     BIGINT,
    friend_id   BIGINT,
    status      VARCHAR(20),    -- 'pending', 'accepted', 'blocked'
    created_at  TIMESTAMP,
    PRIMARY KEY (user_id, friend_id)
);
```

---

## PART 7 — Feed Ranking Algorithm

```
Simple chronological:
  Sort by post_id (time) DESC
  Problem: User might miss posts if they don't check often

Facebook-style ranking (EdgeRank, now ML):
  Score = affinity × weight × time_decay
  
  affinity:     How close are you to the poster? (interaction history)
  weight:       Content type (video > photo > link > text)
  time_decay:   Newer posts score higher (exponential decay)
  
Modern ML approach:
  Candidate retrieval: Get 500 posts from network
  Feature extraction: post age, type, creator engagement rate,
                      your interaction with this creator, etc.
  Neural network ranking: predict "will user engage?"
  Re-rank for diversity: not all from same person
  Filter: spam, sensitive content, already seen
  
Output: Top 20 ranked posts for this user
```

---

## PART 20 — News Feed Summary

### 5-Minute Answer
> "News Feed is a read-heavy system (50:1 read/write). On post creation: write to DB, then fan-out worker pushes post_id to followers' Redis sorted sets (score = post_id for time ordering). On feed read: fetch post_ids from Redis, batch-hydrate post objects from cache/DB, apply ranking (affinity × recency), return top 20. Celebrity exception: users with >10K followers don't fan-out; their posts are fetched at read time and merged. Feed stored in Redis as sorted set per user (max 200 posts)."

---

---

# Problem 13 — Design a Distributed Cache

> Frequency: ⭐⭐⭐⭐ | Asked at: Amazon, Google, Microsoft | Difficulty: 🔥 Staff

---

## PART 1 — Problem Statement

Build a distributed cache system like Redis/Memcached:
- Get/Set/Delete operations
- TTL support (auto-expiry)
- Eviction when memory full
- Distributed (multiple nodes)
- Fault tolerant (handle node failures)
- Consistent hashing for key distribution

---

## PART 4 — Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Client Library                         │
│                                                          │
│  - Consistent hashing to pick node                       │
│  - Connection pooling                                     │
│  - Retry logic / failover                                │
└──────────────────┬───────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Cache    │ │ Cache    │ │ Cache    │  ... N nodes
  │ Node 1   │ │ Node 2   │ │ Node 3   │
  │          │ │          │ │          │
  │ In-memory│ │ In-memory│ │ In-memory│
  │ hash map │ │ hash map │ │ hash map │
  │ + LRU    │ │ + LRU    │ │ + LRU    │
  └──────────┘ └──────────┘ └──────────┘
```

---

## PART 7 — Core Implementation

### Data Structure Per Node

```python
class CacheNode:
    def __init__(self, capacity_bytes):
        self.capacity = capacity_bytes
        self.used = 0
        self.data = {}          # key → (value, expire_at)
        self.lru = OrderedDict()  # for LRU eviction order
        self.lock = threading.RWLock()
    
    def get(self, key):
        with self.lock.read():
            if key not in self.data:
                return None
            value, expire_at = self.data[key]
            if expire_at and time.time() > expire_at:
                self._delete(key)
                return None
            self.lru.move_to_end(key)  # LRU: mark as recently used
            return value
    
    def set(self, key, value, ttl_sec=None):
        with self.lock.write():
            size = sys.getsizeof(value)
            while self.used + size > self.capacity:
                self._evict_lru()
            expire_at = time.time() + ttl_sec if ttl_sec else None
            self.data[key] = (value, expire_at)
            self.lru[key] = True
            self.lru.move_to_end(key)
            self.used += size
    
    def _evict_lru(self):
        oldest_key, _ = self.lru.popitem(last=False)
        del self.data[oldest_key]
```

### Consistent Hashing (Client-Side)

```python
import hashlib
from sortedcontainers import SortedList

class ConsistentHashRing:
    def __init__(self, nodes, virtual_nodes=150):
        self.ring = SortedList()
        self.node_map = {}
        for node in nodes:
            self.add_node(node, virtual_nodes)
    
    def add_node(self, node, virtual_nodes=150):
        for i in range(virtual_nodes):
            key = self._hash(f"{node}:vn{i}")
            self.ring.add(key)
            self.node_map[key] = node
    
    def remove_node(self, node, virtual_nodes=150):
        for i in range(virtual_nodes):
            key = self._hash(f"{node}:vn{i}")
            self.ring.remove(key)
            del self.node_map[key]
    
    def get_node(self, cache_key):
        if not self.ring:
            return None
        key_hash = self._hash(cache_key)
        # Find first node clockwise from key_hash
        idx = self.ring.bisect_left(key_hash) % len(self.ring)
        ring_key = self.ring[idx]
        return self.node_map[ring_key]
    
    def _hash(self, key):
        return int(hashlib.md5(key.encode()).hexdigest(), 16)
```

### Replication for Fault Tolerance

```
For each key: write to primary + N-1 replicas
  Primary node:   selected by consistent hashing
  Replica nodes:  next N-1 nodes clockwise on ring

Read quorum R, Write quorum W, N replicas:
  W + R > N → strong consistency
  W=2, R=2, N=3 → consistent (Cassandra-style)
  W=1, R=1, N=3 → fast but eventual

On node failure:
  Reads: try next N nodes until quorum met
  Writes: write to available replicas, hinted handoff for failed nodes
```

---

## PART 20 — Distributed Cache Summary

### 5-Minute Answer
> "A distributed cache uses consistent hashing to map keys to nodes. Each node is an in-memory hash map with LRU eviction. Client library hashes the key → finds the node on the ring → sends GET/SET directly. Virtual nodes (150 per server) ensure even distribution. For fault tolerance: replicate each key to the next 2 nodes on the ring. TTL implemented with lazy expiry (check on access) + background TTL sweeper. On node failure: consistent hashing redirects to next available node; replica data available; hinted handoff buffers writes for the failed node when it recovers."

---

---

# Problem 14 — Design a Distributed File System

> Frequency: ⭐⭐⭐ | Asked at: Google, Amazon, Meta | Difficulty: 🔥 Staff

---

## PART 4 — Architecture (GFS-inspired)

```
Clients
  │
  ├──▶ Master Server (metadata only, NOT data)
  │         │
  │    Stores: namespace tree, file→chunk mapping, 
  │            chunk→chunkserver mapping, chunk replicas
  │
  └──▶ ChunkServers (actual data, 64MB chunks)
            │
            Replicate chunks across 3 chunkservers
            (rack-aware placement)
```

### Key Design Decisions

```
Chunk size: 64 MB (large)
  Reduces metadata size (fewer chunks to track)
  Clients hold chunk location longer (fewer master requests)
  Better for large sequential reads (MapReduce workloads)

Single Master:
  Simpler coordination
  All metadata in memory → fast lookups
  Bottleneck at massive scale → mitigated by:
    - Large chunk size (fewer client→master interactions)
    - Shadow masters (read-only replicas)

Replica placement (rack-aware):
  Chunk → ChunkServer1 (rack A) + ChunkServer2 (rack B) + ChunkServer3 (rack C)
  Tolerates: individual server failures AND rack-level switch failures
```

### 5-Minute Answer
> "A distributed file system (GFS-style) has two components: a Master node (stores metadata: namespace, file-to-chunk mapping, chunk locations) and ChunkServers (store actual 64MB chunks of data). Clients ask Master for chunk locations, then read/write directly from ChunkServers. Each chunk replicated to 3 servers (rack-aware). Master is lightweight (no data traffic). Single-master design simplified by large chunk sizes (fewer client→master metadata requests per operation)."

---

*Next: `15_booking_systems.md`*
