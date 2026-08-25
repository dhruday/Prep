# Microsoft — L63 (Senior SDE) Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Software Development Engineer |
| **Level** | L63 |
| **YOE** | 6 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/microsoft-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + 3 Onsite — Coding + Design + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Phone Screen — Design a Concurrent LRU Cache with TTL
**Duration:** 45 minutes

### 💡 Interview-Ready Answer

```java
import java.util.concurrent.*;
import java.util.concurrent.locks.*;

public class ConcurrentTTLLRUCache<K, V> {

    private final int capacity;
    private final long defaultTTLMillis;
    private final ConcurrentHashMap<K, Node<K, V>> map;
    private final ReadWriteLock lock = new ReentrantReadWriteLock();

    // Doubly linked list sentinel nodes
    private final Node<K, V> head;
    private final Node<K, V> tail;

    // Background cleanup
    private final ScheduledExecutorService cleaner;

    static class Node<K, V> {
        K key;
        V value;
        long expiryTime;
        Node<K, V> prev;
        Node<K, V> next;

        Node(K key, V value, long expiryTime) {
            this.key = key;
            this.value = value;
            this.expiryTime = expiryTime;
        }
    }

    public ConcurrentTTLLRUCache(int capacity, long defaultTTLMillis) {
        this.capacity = capacity;
        this.defaultTTLMillis = defaultTTLMillis;
        this.map = new ConcurrentHashMap<>(capacity);

        this.head = new Node<>(null, null, 0);
        this.tail = new Node<>(null, null, 0);
        head.next = tail;
        tail.prev = head;

        // Background thread evicts expired entries every second
        this.cleaner = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "cache-cleaner");
            t.setDaemon(true);
            return t;
        });
        cleaner.scheduleAtFixedRate(this::evictExpired, 1, 1, TimeUnit.SECONDS);
    }

    public V get(K key) {
        lock.readLock().lock();
        try {
            Node<K, V> node = map.get(key);
            if (node == null) return null;

            // Check expiry
            if (System.currentTimeMillis() > node.expiryTime) {
                // Upgrade to write lock for removal
                lock.readLock().unlock();
                lock.writeLock().lock();
                try {
                    // Re-check after acquiring write lock
                    node = map.get(key);
                    if (node != null && System.currentTimeMillis() > node.expiryTime) {
                        removeNode(node);
                        map.remove(key);
                    }
                    return null;
                } finally {
                    lock.readLock().lock(); // Downgrade
                    lock.writeLock().unlock();
                }
            }

            return node.value;
        } finally {
            lock.readLock().unlock();
        }
    }

    public void put(K key, V value) {
        put(key, value, defaultTTLMillis);
    }

    public void put(K key, V value, long ttlMillis) {
        lock.writeLock().lock();
        try {
            long expiry = System.currentTimeMillis() + ttlMillis;

            Node<K, V> existing = map.get(key);
            if (existing != null) {
                existing.value = value;
                existing.expiryTime = expiry;
                moveToFront(existing);
                return;
            }

            // Evict LRU if at capacity
            while (map.size() >= capacity) {
                Node<K, V> lru = tail.prev;
                if (lru == head) break;
                removeNode(lru);
                map.remove(lru.key);
            }

            Node<K, V> newNode = new Node<>(key, value, expiry);
            addToFront(newNode);
            map.put(key, newNode);

        } finally {
            lock.writeLock().unlock();
        }
    }

    public boolean remove(K key) {
        lock.writeLock().lock();
        try {
            Node<K, V> node = map.remove(key);
            if (node != null) {
                removeNode(node);
                return true;
            }
            return false;
        } finally {
            lock.writeLock().unlock();
        }
    }

    public int size() {
        return map.size();
    }

    // === Doubly Linked List Operations ===

    private void addToFront(Node<K, V> node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }

    private void removeNode(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void moveToFront(Node<K, V> node) {
        removeNode(node);
        addToFront(node);
    }

    private void evictExpired() {
        lock.writeLock().lock();
        try {
            long now = System.currentTimeMillis();
            Node<K, V> current = tail.prev;
            while (current != head) {
                Node<K, V> prev = current.prev;
                if (now > current.expiryTime) {
                    removeNode(current);
                    map.remove(current.key);
                }
                current = prev;
            }
        } finally {
            lock.writeLock().unlock();
        }
    }

    public void shutdown() {
        cleaner.shutdown();
    }

    public static void main(String[] args) throws InterruptedException {
        ConcurrentTTLLRUCache<String, Integer> cache =
            new ConcurrentTTLLRUCache<>(3, 5000); // capacity 3, 5s TTL

        cache.put("a", 1);
        cache.put("b", 2);
        cache.put("c", 3);
        System.out.println("Size: " + cache.size()); // 3
        System.out.println("Get a: " + cache.get("a")); // 1

        cache.put("d", 4); // evicts LRU (b, since a was just accessed)
        System.out.println("Get b: " + cache.get("b")); // null (evicted)
        System.out.println("Get d: " + cache.get("d")); // 4

        // Test TTL
        cache.put("e", 5, 1000); // 1 second TTL
        System.out.println("Get e: " + cache.get("e")); // 5
        Thread.sleep(1500);
        System.out.println("Get e after TTL: " + cache.get("e")); // null

        cache.shutdown();
        System.out.println("Done.");
    }
}
```

## Round 2: System Design — Design a Distributed Rate Limiter
**Duration:** 60 minutes

Discussed sliding window log + token bucket approaches, Redis-based distributed state, and race condition handling with Lua scripts.

## 🎯 Key Takeaways
- **Concurrent LRU + TTL** is a Microsoft staple — combines data structures + concurrency
- ReadWriteLock provides better throughput than synchronized for read-heavy caches
- Background cleanup thread prevents stale entries from consuming capacity
- Always use sentinel nodes for doubly linked list to avoid null checks

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | LRU Cache, TTL, Concurrency, ReadWriteLock |
| System Design | Hard | Distributed Rate Limiter, Redis, Lua |
| Hiring Manager | Medium | Behavioral, Leadership |
