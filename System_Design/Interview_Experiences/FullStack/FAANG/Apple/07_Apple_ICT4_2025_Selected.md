# Apple — Senior SWE FullStack Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Senior Software Engineer |
| **Level** | ICT4 |
| **YOE** | 9 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Cupertino, CA |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Apple-Interview-Questions-E1138.htm) |
| **Author** | Anonymous |
| **Team** | Apple Music Backend |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 6 (Phone Screen + 5 Onsite)

---

## Round 1: Coding — Design a Concurrent LRU Cache with Read-Write Lock
**Duration:** 45 minutes

### Question: Implement a thread-safe LRU cache optimized for read-heavy workloads (95% reads, 5% writes). Use a ReadWriteLock so multiple readers can access simultaneously.

```java
import java.util.concurrent.locks.*;
import java.util.*;

/**
 * Concurrent LRU Cache with ReadWriteLock.
 * 
 * Read-heavy optimization:
 * - ReadLock: shared — multiple threads can read simultaneously  
 * - WriteLock: exclusive — one thread for put/evict/reorder
 * 
 * Problem: get() needs to update access order (write operation).
 * Solution: Deferred reorder — mark nodes as "accessed" during read,
 *           batch-move to front on next write.
 * 
 * Alternative: Use StampedLock with optimistic read for even better perf.
 * 
 * Time: get() O(1) amortized, put() O(1) amortized
 * Space: O(capacity)
 */
class ConcurrentLRUCache<K, V> {
    
    private final int capacity;
    private final Map<K, Node<K, V>> map;
    private final Node<K, V> head, tail; // Doubly linked list sentinel nodes
    private final ReadWriteLock rwLock = new ReentrantReadWriteLock();
    private final Lock readLock = rwLock.readLock();
    private final Lock writeLock = rwLock.writeLock();
    
    // Deferred access log: nodes that were read and need reordering
    private final Queue<K> accessLog = new java.util.concurrent.ConcurrentLinkedQueue<>();
    private static final int REORDER_BATCH_SIZE = 64;
    
    static class Node<K, V> {
        K key;
        V value;
        Node<K, V> prev, next;
        volatile boolean accessed; // Flag for deferred reorder
        
        Node(K key, V value) {
            this.key = key;
            this.value = value;
        }
    }
    
    public ConcurrentLRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>(capacity * 4 / 3 + 1);
        
        this.head = new Node<>(null, null);
        this.tail = new Node<>(null, null);
        head.next = tail;
        tail.prev = head;
    }
    
    /**
     * Get with ReadLock — multiple threads can read concurrently.
     * Instead of moving to front (which requires WriteLock), 
     * we add to accessLog for deferred reordering.
     */
    public V get(K key) {
        readLock.lock();
        try {
            Node<K, V> node = map.get(key);
            if (node == null) return null;
            
            // Mark as accessed for deferred reorder (lock-free queue)
            accessLog.offer(key);
            
            return node.value;
        } finally {
            readLock.unlock();
        }
    }
    
    /**
     * Put with WriteLock — exclusive access for modifications.
     * Also processes deferred access log to update order.
     */
    public void put(K key, V value) {
        writeLock.lock();
        try {
            // Process deferred access log first
            processDeferredAccesses();
            
            Node<K, V> existing = map.get(key);
            if (existing != null) {
                existing.value = value;
                removeNode(existing);
                addToFront(existing);
                return;
            }
            
            // New entry
            if (map.size() >= capacity) {
                // Evict LRU (tail.prev)
                Node<K, V> lru = tail.prev;
                removeNode(lru);
                map.remove(lru.key);
            }
            
            Node<K, V> newNode = new Node<>(key, value);
            addToFront(newNode);
            map.put(key, newNode);
        } finally {
            writeLock.unlock();
        }
    }
    
    /**
     * Process all deferred accesses — move accessed nodes to front.
     * Called under WriteLock.
     */
    private void processDeferredAccesses() {
        int processed = 0;
        K key;
        while ((key = accessLog.poll()) != null && processed < REORDER_BATCH_SIZE) {
            Node<K, V> node = map.get(key);
            if (node != null) {
                removeNode(node);
                addToFront(node);
            }
            processed++;
        }
    }
    
    private void removeNode(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    private void addToFront(Node<K, V> node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
    
    /**
     * Alternative: StampedLock with optimistic read for even better perf.
     * 
     * StampedLock stampedLock = new StampedLock();
     * 
     * V get(K key) {
     *     long stamp = stampedLock.tryOptimisticRead();
     *     Node<K,V> node = map.get(key);
     *     V value = node != null ? node.value : null;
     *     
     *     if (!stampedLock.validate(stamp)) {
     *         // Optimistic read failed — fall back to read lock
     *         stamp = stampedLock.readLock();
     *         try {
     *             node = map.get(key);
     *             value = node != null ? node.value : null;
     *         } finally {
     *             stampedLock.unlockRead(stamp);
     *         }
     *     }
     *     
     *     accessLog.offer(key);
     *     return value;
     * }
     */
}
```

---

## Round 2: System Design — Apple Music Streaming Platform
**Duration:** 60 minutes

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│               Apple Music Streaming Architecture                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Client (iOS/Android/Web)                                  │   │
│  │                                                           │   │
│  │ Audio Playback:                                           │   │
│  │   - AVPlayer (iOS) / MediaSession API (Web)               │   │
│  │   - Codec: AAC-LC 256kbps, ALAC (lossless), Dolby Atmos  │   │
│  │   - Adaptive bitrate: select quality based on bandwidth   │   │
│  │   - Gapless playback: decode next track while playing     │   │
│  │   - Offline cache: encrypted downloaded tracks            │   │
│  │     DRM: FairPlay (Apple) / Widevine (Android/Web)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │ API Gateway + CDN                                         │   │
│  │                                                           │   │
│  │ CDN (Akamai/CloudFront):                                  │   │
│  │   - Audio files cached at edge (most popular → pre-warmed)│   │
│  │   - Cache hit ratio: > 95% for popular tracks             │   │
│  │   - Signed URLs with TTL for DRM content                  │   │
│  │                                                           │   │
│  │ API:                                                      │   │
│  │   - REST for catalog browse, search, playlist CRUD        │   │
│  │   - gRPC for real-time: play/pause/skip events            │   │
│  │   - WebSocket: lyrics sync, collaborative listening       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Services                                                  │   │
│  │                                                           │   │
│  │ Catalog Service:                                          │   │
│  │   - 100M+ tracks metadata (title, artist, album, genre)  │   │
│  │   - Elasticsearch for full-text search + fuzzy matching   │   │
│  │   - PostgreSQL for structured metadata + relationships    │   │
│  │                                                           │   │
│  │ Recommendation Engine:                                    │   │
│  │   - Collaborative filtering: users with similar taste     │   │
│  │   - Content-based: audio features (tempo, key, mood)      │   │
│  │   - Contextual: time of day, activity, location           │   │
│  │   - Model: two-tower (user embedding ↔ track embedding)   │   │
│  │   - Offline: train on Spark, export embeddings to Redis   │   │
│  │   - Online: ANN (Approximate Nearest Neighbor) for realtime│  │
│  │                                                           │   │
│  │ Playback Service:                                         │   │
│  │   - Track play counts (idempotent: dedup within 30s)      │   │
│  │   - Royalty attribution: > 30s of play = 1 stream         │   │
│  │   - Queue management: shuffle (Fisher-Yates), repeat      │   │
│  │   - Cross-device sync: play on iPhone → continue on Mac   │   │
│  │                                                           │   │
│  │ Audio Ingestion Pipeline:                                 │   │
│  │   - Artist uploads FLAC/WAV master                        │   │
│  │   - Transcode: AAC 256/128/64, ALAC, Dolby Atmos         │   │
│  │   - Loudness normalization: -16 LUFS (Sound Check)        │   │
│  │   - Fingerprinting: Chromaprint for dedup + Shazam match  │   │
│  │   - Waveform generation: peaks for visual display         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Scale: 100M+ subscribers, 100M+ track catalog,                │
│  10M+ concurrent streams, 500TB+ audio storage                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Apple ICT4 = **Concurrent LRU cache (ReadWriteLock) + Music streaming system design**
- **ReadWriteLock for read-heavy**: readers share lock, writer is exclusive — 95/5 read/write ratio = huge win
- **Deferred reorder**: avoid WriteLock on get() — log accesses in ConcurrentLinkedQueue, batch-process on next write
- **StampedLock optimistic read**: even faster — read without locking, validate stamp, retry if changed
- **FairPlay DRM**: Apple's content protection — signed URLs + encrypted audio + device binding
- **Gapless playback**: decode next track while current plays — cross-fade or precise sample alignment
- **Royalty attribution**: > 30 seconds = 1 stream — idempotent counting with dedup window
- Apple = **concurrency + audio domain expertise** — show deep understanding of threading, codecs, DRM

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | DSA |
| Coding | Very Hard | Concurrency, ReadWriteLock |
| System Design | Very Hard | Streaming, DRM, CDN |
| Domain | Hard | Audio Processing |
| Behavioral | Medium | Apple values |
