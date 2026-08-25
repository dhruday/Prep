# 80. Cache Eviction Policies (LRU, LFU, FIFO)

---

## 1. High-Level Explanation

**Cache eviction policies** determine which cached items to remove when the cache is full. Common policies include:

- **LRU (Least Recently Used)**: Evict items not accessed recently
- **LFU (Least Frequently Used)**: Evict items accessed least often  
- **FIFO (First In First Out)**: Evict oldest items first
- **LRU-K, 2Q, ARC**: Advanced hybrid policies

**Why It Matters**: Wrong eviction policy can drop from 99% → 70% cache hit ratio, increasing database load 30x and latency 10x.

---

## 2. Deep-Dive Explanation

### LRU (Least Recently Used)

**Algorithm**: Evict item that hasn't been accessed for the longest time.

**Implementation** (doubly-linked list + hash map):
```python
class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}  # key → node
        self.head = Node(0, 0)  # Dummy head (most recent)
        self.tail = Node(0, 0)  # Dummy tail (least recent)
        self.head.next = self.tail
        self.tail.prev = self.head
    
    def get(self, key):
        if key in self.cache:
            node = self.cache[key]
            self._remove(node)
            self._add_to_head(node)  # Move to front (most recent)
            return node.value
        return -1  # Cache miss
    
    def put(self, key, value):
        if key in self.cache:
            self._remove(self.cache[key])
        
        node = Node(key, value)
        self._add_to_head(node)
        self.cache[key] = node
        
        if len(self.cache) > self.capacity:
            # Evict least recently used (tail)
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]
    
    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev
    
    def _add_to_head(self, node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

# Time: O(1) get/put, Space: O(capacity)
```

**Pros**: Simple, works well for temporal locality (recent items likely accessed again)  
**Cons**: Doesn't consider access frequency (one-time spike evicts frequently used items)

**Redis implementation**:
```bash
redis-cli CONFIG SET maxmemory 100mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
# When memory exceeds 100MB, evict least recently used keys
```

---

### LFU (Least Frequently Used)

**Algorithm**: Evict item accessed least often.

**Implementation** (min-heap + hash map):
```python
from collections import defaultdict
import heapq

class LFUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}  # key → (value, freq)
        self.freq_map = defaultdict(list)  # freq → [keys]
        self.min_freq = 0
    
    def get(self, key):
        if key not in self.cache:
            return -1  # Cache miss
        
        value, freq = self.cache[key]
        self._update_freq(key, value, freq)
        return value
    
    def put(self, key, value):
        if self.capacity == 0:
            return
        
        if key in self.cache:
            _, freq = self.cache[key]
            self._update_freq(key, value, freq)
        else:
            if len(self.cache) >= self.capacity:
                # Evict least frequently used
                evict_key = self.freq_map[self.min_freq].pop(0)
                del self.cache[evict_key]
            
            self.cache[key] = (value, 1)
            self.freq_map[1].append(key)
            self.min_freq = 1
    
    def _update_freq(self, key, value, freq):
        self.freq_map[freq].remove(key)
        if not self.freq_map[freq] and freq == self.min_freq:
            self.min_freq += 1
        
        self.cache[key] = (value, freq + 1)
        self.freq_map[freq + 1].append(key)

# Time: O(1) average, Space: O(capacity)
```

**Pros**: Evicts rarely-used items, good for frequency-based patterns  
**Cons**: Slow to adapt (old items with high frequency persist even if not accessed recently)

**Redis implementation**:
```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lfu
# Evict least frequently used keys (with decay over time)
```

---

### FIFO (First In First Out)

**Algorithm**: Evict oldest cached item (insertion order).

**Implementation** (queue):
```python
from collections import deque

class FIFOCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}
        self.queue = deque()  # Track insertion order
    
    def get(self, key):
        return self.cache.get(key, -1)
    
    def put(self, key, value):
        if key not in self.cache:
            if len(self.cache) >= self.capacity:
                # Evict oldest (FIFO)
                oldest = self.queue.popleft()
                del self.cache[oldest]
            self.queue.append(key)
        
        self.cache[key] = value

# Time: O(1), Space: O(capacity)
```

**Pros**: Simple, predictable, fair eviction  
**Cons**: Ignores access patterns (may evict frequently-used old items)

---

## 3. Comparison & Real-World Usage

| Policy | Best For | Example | Hit Ratio (typical) |
|--------|----------|---------|---------------------|
| **LRU** | Temporal locality (recent items accessed again) | User sessions, browsing history | 95-99% |
| **LFU** | Frequency matters (hot items stay cached) | Popular products, trending posts | 90-95% |
| **FIFO** | Fair eviction, simple workloads | Logs, batch processing | 70-85% |
| **TTL** | Time-sensitive data | API responses, product prices | 85-95% |

**Real-world**:
- **Netflix**: LRU for user profiles (recent viewers likely to return)
- **YouTube**: LFU for videos (popular videos stay cached)
- **Twitter**: LRU for timelines (recent tweets more relevant)
- **Amazon**: Hybrid (LRU + TTL for product catalog)

---

## 4. Interview Answer

**"Cache eviction determines which items to remove when cache is full. LRU (Least Recently Used) evicts items not accessed recently, good for temporal locality like user sessions (95-99% hit ratio). LFU (Least Frequently Used) evicts items accessed least often, good for frequency-based patterns like popular videos (90-95% hit). FIFO (First In First Out) evicts oldest items, simple but ignores access patterns (70-85% hit). Redis supports all three (CONFIG SET maxmemory-policy allkeys-lru/lfu/fifo). Choose based on access pattern: LRU for recency (session store), LFU for popularity (content cache), TTL for freshness (API responses). Real-world: Netflix uses LRU for profiles (recently viewed users return), YouTube uses LFU for videos (popular videos stay cached), Twitter uses LRU for timelines (recent tweets matter). Wrong policy drops hit ratio 99% → 70% = 30x database load increase."**

---

## 5. Bottom Line

**Cache eviction policies are critical for maintaining high hit ratios (95-99%) when cache fills up. Choose LRU for temporal locality (user sessions, recent data matters), LFU for frequency-based patterns (popular content, trending items), FIFO for simple fairness (logs, batch jobs). Redis supports all policies (maxmemory-policy), monitor hit ratio (INFO stats) and adjust based on workload. Wrong policy can drop hit ratio from 99% to 70%, increasing database load 30x and latency 10x. Real-world: Netflix LRU for profiles (recent viewers return 99% hit), YouTube LFU for videos (popular videos cached 95% hit), Twitter LRU for timelines (recent tweets matter 98% hit).**

