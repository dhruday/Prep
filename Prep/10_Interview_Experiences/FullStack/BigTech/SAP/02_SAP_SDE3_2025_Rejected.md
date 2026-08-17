# SAP — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP |
| **Role** | Senior Software Development Engineer |
| **Level** | SDE-3 / T3 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Online Assessment + 2 Technical + 1 Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Design a Rate Limiter with Sliding Window Counter**
   - Implement a rate limiter supporting multiple strategies: fixed window, sliding window log, and sliding window counter.
   - Must handle concurrent requests.

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class RateLimiter {

    // Strategy interface
    interface RateLimitStrategy {
        boolean allowRequest(String clientId);
    }

    // ============================================
    // Strategy 1: Fixed Window Counter
    // ============================================
    static class FixedWindowCounter implements RateLimitStrategy {
        private final int maxRequests;
        private final long windowSizeMs;
        private final ConcurrentHashMap<String, long[]> windows = new ConcurrentHashMap<>();
        // windows value: [windowStart, count]

        FixedWindowCounter(int maxRequests, long windowSizeMs) {
            this.maxRequests = maxRequests;
            this.windowSizeMs = windowSizeMs;
        }

        @Override
        public boolean allowRequest(String clientId) {
            long now = System.currentTimeMillis();
            long currentWindow = now / windowSizeMs;

            windows.compute(clientId, (key, val) -> {
                if (val == null || val[0] != currentWindow) {
                    return new long[]{currentWindow, 1};
                }
                val[1]++;
                return val;
            });

            return windows.get(clientId)[1] <= maxRequests;
        }
    }

    // ============================================
    // Strategy 2: Sliding Window Log
    // ============================================
    static class SlidingWindowLog implements RateLimitStrategy {
        private final int maxRequests;
        private final long windowSizeMs;
        private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Long>> logs = new ConcurrentHashMap<>();

        SlidingWindowLog(int maxRequests, long windowSizeMs) {
            this.maxRequests = maxRequests;
            this.windowSizeMs = windowSizeMs;
        }

        @Override
        public boolean allowRequest(String clientId) {
            long now = System.currentTimeMillis();
            long windowStart = now - windowSizeMs;

            ConcurrentLinkedDeque<Long> timestamps = logs.computeIfAbsent(
                clientId, k -> new ConcurrentLinkedDeque<>()
            );

            // Remove expired timestamps
            while (!timestamps.isEmpty() && timestamps.peekFirst() <= windowStart) {
                timestamps.pollFirst();
            }

            if (timestamps.size() < maxRequests) {
                timestamps.addLast(now);
                return true;
            }
            return false;
        }
    }

    // ============================================
    // Strategy 3: Sliding Window Counter (Hybrid)
    // ============================================
    static class SlidingWindowCounter implements RateLimitStrategy {
        private final int maxRequests;
        private final long windowSizeMs;
        private final ConcurrentHashMap<String, long[]> counters = new ConcurrentHashMap<>();
        // counters value: [prevWindowStart, prevCount, currWindowStart, currCount]

        SlidingWindowCounter(int maxRequests, long windowSizeMs) {
            this.maxRequests = maxRequests;
            this.windowSizeMs = windowSizeMs;
        }

        @Override
        public boolean allowRequest(String clientId) {
            long now = System.currentTimeMillis();
            long currentWindow = (now / windowSizeMs) * windowSizeMs;
            long prevWindow = currentWindow - windowSizeMs;

            counters.compute(clientId, (key, val) -> {
                if (val == null) {
                    return new long[]{0, 0, currentWindow, 1};
                }

                // Rotate windows if needed
                if (val[2] != currentWindow) {
                    if (val[2] == prevWindow) {
                        // Previous current becomes prev
                        val[0] = val[2];
                        val[1] = val[3];
                    } else {
                        // Both windows expired
                        val[0] = 0;
                        val[1] = 0;
                    }
                    val[2] = currentWindow;
                    val[3] = 0;
                }

                val[3]++;
                return val;
            });

            long[] val = counters.get(clientId);

            // Weighted count: prevCount * overlapRatio + currentCount
            double elapsed = now - currentWindow;
            double overlapRatio = Math.max(0, (windowSizeMs - elapsed) / windowSizeMs);
            double weightedCount = val[1] * overlapRatio + val[3];

            return weightedCount <= maxRequests;
        }
    }

    // ============================================
    // Rate Limiter Facade
    // ============================================
    private final RateLimitStrategy strategy;

    public RateLimiter(RateLimitStrategy strategy) {
        this.strategy = strategy;
    }

    public boolean tryAcquire(String clientId) {
        return strategy.allowRequest(clientId);
    }

    public static void main(String[] args) throws InterruptedException {
        // Sliding Window Counter: 5 requests per 10 seconds
        RateLimiter limiter = new RateLimiter(
            new SlidingWindowCounter(5, 10_000)
        );

        String client = "user-123";
        for (int i = 0; i < 8; i++) {
            boolean allowed = limiter.tryAcquire(client);
            System.out.printf("Request %d: %s%n", i + 1, allowed ? "ALLOWED" : "DENIED");
        }
        // Requests 1-5: ALLOWED, 6-8: DENIED
    }
}
```

**Complexity (Sliding Window Counter):**
- **Time:** O(1) per request
- **Space:** O(N) where N = unique clients

**Trade-offs:**

| Strategy | Time | Space | Accuracy |
|----------|------|-------|----------|
| Fixed Window | O(1) | O(N) | Low — burst at window boundaries |
| Sliding Log | O(1) amortized | O(N × W) | High — exact |
| Sliding Counter | O(1) | O(N) | Medium — approximate but space-efficient |

## Round 2: Technical Interview — Data Structures
**Duration:** 60 minutes | **Interviewer:** Staff Engineer

### Questions Asked
1. **LRU Cache with O(1) Get/Put and Frequency Tracking**
   - Design an LRU cache where get/put are O(1)
   - Track access frequency per key
   - Evict least recently used, breaking ties by lowest frequency

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class FrequencyAwareLRUCache<K, V> {

    private static class Node<K, V> {
        K key;
        V value;
        int frequency;
        Node<K, V> prev, next;

        Node(K key, V value) {
            this.key = key;
            this.value = value;
            this.frequency = 1;
        }
    }

    private static class DoublyLinkedList<K, V> {
        Node<K, V> head, tail;
        int size;

        DoublyLinkedList() {
            head = new Node<>(null, null);
            tail = new Node<>(null, null);
            head.next = tail;
            tail.prev = head;
        }

        void addFirst(Node<K, V> node) {
            node.next = head.next;
            node.prev = head;
            head.next.prev = node;
            head.next = node;
            size++;
        }

        void remove(Node<K, V> node) {
            node.prev.next = node.next;
            node.next.prev = node.prev;
            size--;
        }

        Node<K, V> removeLast() {
            if (size == 0) return null;
            Node<K, V> last = tail.prev;
            remove(last);
            return last;
        }

        boolean isEmpty() {
            return size == 0;
        }
    }

    private final int capacity;
    private final Map<K, Node<K, V>> cache;
    private final TreeMap<Integer, DoublyLinkedList<K, V>> freqMap; // freq -> LRU list
    private int minFreq;

    public FrequencyAwareLRUCache(int capacity) {
        this.capacity = capacity;
        this.cache = new HashMap<>();
        this.freqMap = new TreeMap<>();
        this.minFreq = 0;
    }

    public V get(K key) {
        Node<K, V> node = cache.get(key);
        if (node == null) return null;

        updateFrequency(node);
        return node.value;
    }

    public void put(K key, V value) {
        if (capacity <= 0) return;

        Node<K, V> existing = cache.get(key);
        if (existing != null) {
            existing.value = value;
            updateFrequency(existing);
            return;
        }

        if (cache.size() >= capacity) {
            evict();
        }

        Node<K, V> newNode = new Node<>(key, value);
        cache.put(key, newNode);
        freqMap.computeIfAbsent(1, k -> new DoublyLinkedList<>()).addFirst(newNode);
        minFreq = 1;
    }

    private void updateFrequency(Node<K, V> node) {
        int oldFreq = node.frequency;
        DoublyLinkedList<K, V> oldList = freqMap.get(oldFreq);
        oldList.remove(node);

        if (oldList.isEmpty()) {
            freqMap.remove(oldFreq);
            if (minFreq == oldFreq) minFreq++;
        }

        node.frequency++;
        freqMap.computeIfAbsent(node.frequency, k -> new DoublyLinkedList<>()).addFirst(node);
    }

    private void evict() {
        DoublyLinkedList<K, V> minFreqList = freqMap.get(minFreq);
        Node<K, V> evicted = minFreqList.removeLast();

        if (minFreqList.isEmpty()) {
            freqMap.remove(minFreq);
        }

        cache.remove(evicted.key);
    }

    public static void main(String[] args) {
        FrequencyAwareLRUCache<String, Integer> cache = new FrequencyAwareLRUCache<>(3);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.put("c", 3);
        cache.get("a"); // freq(a)=2
        cache.get("b"); // freq(b)=2
        cache.put("d", 4); // evicts "c" (freq=1, LRU)
        System.out.println(cache.get("c")); // null
        System.out.println(cache.get("a")); // 1
    }
}
```

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design SAP's Event Mesh — Multi-Tenant Event Broker**
   - Support pub/sub with topic-based routing
   - Multi-tenant isolation with quota management
   - At-least-once delivery guarantee

## Round 4: Hiring Manager
**Duration:** 45 minutes

### Result
- Rejected after R3 — the interviewer felt the event ordering guarantees discussion was insufficient
- Feedback: Strong on coding rounds, needed deeper distributed systems knowledge for SDE-3 level

## 🎯 Key Takeaways
- SAP SDE-3 bar requires **deep distributed systems** knowledge, not just correct code
- Rate limiter is an evergreen question — know all 3 strategies cold
- LFU + LRU hybrid is a common follow-up to basic LRU questions
- System design at senior level requires discussing **trade-offs for each decision**, not just architecture

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Medium-Hard | Rate Limiting, Concurrency |
| Technical (DS) | Hard | LFU + LRU hybrid, HashMap + DLL |
| System Design | Hard | Event-driven, Multi-tenancy, Ordering |
| Hiring Manager | Medium | Behavioral |
