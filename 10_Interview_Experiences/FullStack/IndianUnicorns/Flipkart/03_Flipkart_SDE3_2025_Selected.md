# Flipkart — SDE-3 FullStack Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Machine Coding + 2 DSA + System Design + Bar Raiser)
- **Timeline:** 2 weeks
- **Format:** On-site

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build an In-Memory Key-Value Store** with TTL, nested keys, and transactions

### 💡 Interview-Ready Answer

```java
public class InMemoryKVStore {
    private final Map<String, Entry> store = new ConcurrentHashMap<>();
    private final Deque<Map<String, Entry>> txStack = new ArrayDeque<>(); // Transaction stack
    
    static class Entry {
        Object value;
        Long expiresAt; // null = no TTL
        
        Entry(Object value, Long expiresAt) {
            this.value = value;
            this.expiresAt = expiresAt;
        }
        
        boolean isExpired() {
            return expiresAt != null && System.currentTimeMillis() > expiresAt;
        }
    }
    
    // SET key value [EX seconds]
    public void set(String key, Object value, Integer ttlSeconds) {
        Long expiresAt = ttlSeconds != null ? System.currentTimeMillis() + ttlSeconds * 1000L : null;
        Entry entry = new Entry(value, expiresAt);
        
        if (!txStack.isEmpty()) {
            txStack.peek().put(key, entry); // Write to transaction buffer
        } else {
            store.put(key, entry);
        }
    }
    
    // GET key (supports nested: GET user.name)
    public Object get(String key) {
        // Check transaction buffer first
        for (Map<String, Entry> tx : txStack) {
            if (tx.containsKey(key)) {
                Entry entry = tx.get(key);
                if (entry == null) return null; // Deleted in transaction
                if (entry.isExpired()) return null;
                return entry.value;
            }
        }
        
        // Nested key support: "user.name" → store["user"]["name"]
        if (key.contains(".")) {
            return getNestedValue(key);
        }
        
        Entry entry = store.get(key);
        if (entry == null || entry.isExpired()) {
            if (entry != null && entry.isExpired()) store.remove(key); // Lazy cleanup
            return null;
        }
        return entry.value;
    }
    
    @SuppressWarnings("unchecked")
    private Object getNestedValue(String key) {
        String[] parts = key.split("\\.");
        Object current = get(parts[0]); // Get root
        
        for (int i = 1; i < parts.length && current != null; i++) {
            if (current instanceof Map) {
                current = ((Map<String, Object>) current).get(parts[i]);
            } else {
                return null;
            }
        }
        return current;
    }
    
    // DEL key
    public boolean delete(String key) {
        if (!txStack.isEmpty()) {
            txStack.peek().put(key, null); // Mark as deleted in tx
            return true;
        }
        return store.remove(key) != null;
    }
    
    // BEGIN — start transaction
    public void begin() {
        txStack.push(new LinkedHashMap<>());
    }
    
    // COMMIT — apply transaction
    public void commit() {
        if (txStack.isEmpty()) throw new IllegalStateException("No transaction to commit");
        
        Map<String, Entry> tx = txStack.pop();
        
        if (txStack.isEmpty()) {
            // Apply to main store
            for (var entry : tx.entrySet()) {
                if (entry.getValue() == null) {
                    store.remove(entry.getKey());
                } else {
                    store.put(entry.getKey(), entry.getValue());
                }
            }
        } else {
            // Merge into parent transaction
            txStack.peek().putAll(tx);
        }
    }
    
    // ROLLBACK — discard transaction
    public void rollback() {
        if (txStack.isEmpty()) throw new IllegalStateException("No transaction to rollback");
        txStack.pop(); // Discard
    }
}
```

---

## Round 2: DSA 1
**Duration:** 45 minutes

### Questions Asked
1. **Median of Two Sorted Arrays** (LeetCode 4) — O(log(min(m,n)))
2. **Follow-up: Extend to K sorted arrays**

### 💡 Interview-Ready Answer

```java
public double findMedianSortedArrays(int[] nums1, int[] nums2) {
    // Always binary search on the smaller array
    if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);
    
    int m = nums1.length, n = nums2.length;
    int lo = 0, hi = m;
    
    while (lo <= hi) {
        int i = (lo + hi) / 2;       // Partition point in nums1
        int j = (m + n + 1) / 2 - i; // Partition point in nums2
        
        int maxLeft1 = (i == 0) ? Integer.MIN_VALUE : nums1[i - 1];
        int minRight1 = (i == m) ? Integer.MAX_VALUE : nums1[i];
        int maxLeft2 = (j == 0) ? Integer.MIN_VALUE : nums2[j - 1];
        int minRight2 = (j == n) ? Integer.MAX_VALUE : nums2[j];
        
        if (maxLeft1 <= minRight2 && maxLeft2 <= minRight1) {
            // Found correct partition
            if ((m + n) % 2 == 0) {
                return (Math.max(maxLeft1, maxLeft2) + Math.min(minRight1, minRight2)) / 2.0;
            }
            return Math.max(maxLeft1, maxLeft2);
        } else if (maxLeft1 > minRight2) {
            hi = i - 1; // Move left
        } else {
            lo = i + 1; // Move right
        }
    }
    
    throw new IllegalArgumentException("Input arrays not sorted");
}
// Time: O(log(min(m, n))), Space: O(1)
```

---

## Round 3: DSA 2
**Duration:** 45 minutes

### Questions Asked
1. **Design HashMap** (LeetCode 706) with rehashing
2. **Follow-up: Make it thread-safe without ConcurrentHashMap** (fine-grained locking)

### 💡 Thread-Safe HashMap with Rehashing

```java
public class ThreadSafeHashMap<K, V> {
    private static final int INITIAL_CAPACITY = 16;
    private static final float LOAD_FACTOR = 0.75f;
    
    private volatile Node<K, V>[] buckets;
    private final Object[] locks; // Striped locks — one per bucket group
    private volatile int size;
    
    @SuppressWarnings("unchecked")
    public ThreadSafeHashMap() {
        this.buckets = new Node[INITIAL_CAPACITY];
        this.locks = new Object[INITIAL_CAPACITY];
        for (int i = 0; i < INITIAL_CAPACITY; i++) locks[i] = new Object();
    }
    
    private int hash(K key) {
        int h = key.hashCode();
        return (h ^ (h >>> 16)) & (buckets.length - 1); // Spread bits
    }
    
    public V get(K key) {
        int idx = hash(key);
        Node<K, V> node = buckets[idx];
        
        while (node != null) {
            if (node.key.equals(key)) return node.value;
            node = node.next;
        }
        return null;
    }
    
    public void put(K key, V value) {
        int idx = hash(key);
        int lockIdx = idx % locks.length;
        
        synchronized (locks[lockIdx]) {
            Node<K, V> node = buckets[idx];
            
            while (node != null) {
                if (node.key.equals(key)) {
                    node.value = value; // Update
                    return;
                }
                node = node.next;
            }
            
            // Insert at head
            Node<K, V> newNode = new Node<>(key, value);
            newNode.next = buckets[idx];
            buckets[idx] = newNode;
            size++;
        }
        
        if (size > buckets.length * LOAD_FACTOR) {
            rehash();
        }
    }
    
    @SuppressWarnings("unchecked")
    private synchronized void rehash() {
        if (size <= buckets.length * LOAD_FACTOR) return; // Double-check
        
        int newCapacity = buckets.length * 2;
        Node<K, V>[] newBuckets = new Node[newCapacity];
        
        for (Node<K, V> head : buckets) {
            while (head != null) {
                Node<K, V> next = head.next;
                int idx = (head.key.hashCode() ^ (head.key.hashCode() >>> 16)) & (newCapacity - 1);
                head.next = newBuckets[idx];
                newBuckets[idx] = head;
                head = next;
            }
        }
        
        this.buckets = newBuckets;
    }
    
    static class Node<K, V> {
        K key;
        V value;
        Node<K, V> next;
        
        Node(K key, V value) { this.key = key; this.value = value; }
    }
}
```

---

## Round 4: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Flipkart's Flash Sale System**
   - Handle 1M requests in first 10 seconds, prevent overselling, fair ordering

### 💡 Interview-Ready Answer

```
Flash Sale Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Challenge: 1M users → 500 items in 10 seconds              │
│  Must: no overselling, fair (FIFO), fast response            │
│                                                                │
│  Pre-Sale (T-1 hour):                                        │
│  - Warm CDN cache with product page (static HTML)            │
│  - Pre-load inventory count into Redis                       │
│  - Generate CAPTCHA tokens for registered users              │
│  - Enable queue system                                        │
│                                                                │
│  Queue-Based Architecture:                                    │
│  ┌──────────┐   ┌───────────────┐   ┌──────────────┐        │
│  │  Client   │──▶│  API Gateway  │──▶│ Request Queue │       │
│  │  (CAPTCHA)│   │  (Rate Limit) │   │  (Kafka)      │       │
│  └──────────┘   └───────────────┘   └──────┬───────┘        │
│                                             │                │
│  ┌──────────────────────────────────────────▼──────────┐     │
│  │  Inventory Worker (Consumer):                        │     │
│  │  1. Dequeue request                                  │     │
│  │  2. Redis DECR (atomic) — check stock > 0            │     │
│  │  3. If stock available:                              │     │
│  │     a. Reserve in Redis (10-min TTL)                 │     │
│  │     b. Push to "checkout-allowed" topic              │     │
│  │     c. Notify user via WebSocket: "You're in!"       │     │
│  │  4. If stock = 0:                                    │     │
│  │     a. Notify user: "Sold out"                       │     │
│  │     b. Stop consuming (or route to waitlist)         │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                                │
│  User Experience:                                             │
│  T-0: User clicks "Buy Now"                                  │
│  → Show "You're in queue" (position: #4,523)                 │
│  → WebSocket pushes position updates                         │
│  → If selected: redirect to checkout (10-min window)         │
│  → If not: "Sold out — added to waitlist"                    │
│                                                                │
│  Anti-Abuse:                                                  │
│  - CAPTCHA on "Buy Now" click                                │
│  - 1 purchase per user per flash sale (user_id dedup in Set) │
│  - Rate limit: 1 req/sec per IP at gateway                   │
│  - Bot detection: behavioral analysis (mouse movement, timing)│
│  - Device fingerprinting + session validation                │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Flipkart SDE-3 = **deep DSA + system design + machine coding** — all must be strong
- **In-Memory KV Store** with transactions is Flipkart's signature machine coding question
- **Median of Two Sorted Arrays** → binary search on smaller array — must derive the invariant
- **Thread-Safe HashMap** → striped locking (per-bucket-group, not global lock)
- **Flash Sale** = queue-based architecture + Redis atomic DECR + reservation TTL
- **Anti-abuse** (CAPTCHA, rate limiting, bot detection) expected in flash sale design
- At SDE-3, Flipkart expects **trade-off discussions**: "Why Kafka, not SQS? Why Redis, not DB?"

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | KV Store, Transactions, TTL |
| DSA 1 | Very Hard | Binary Search, Median of Two Arrays |
| DSA 2 | Hard | HashMap, Rehashing, Thread Safety |
| System Design | Very Hard | Flash Sale, Queue, Anti-Abuse |
| Bar Raiser | Hard | LP + Quick Problem |
