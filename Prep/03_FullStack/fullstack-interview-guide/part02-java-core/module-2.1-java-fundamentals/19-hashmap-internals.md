# HashMap Internals — Hashing, Collision, Load Factor
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- HashMap is backed by an array of "buckets." Each bucket is a linked list (or tree after Java 8 when a bucket gets 8+ entries).
- `put(key, value)`: hash the key → find the bucket index → store there.
- `get(key)`: hash the key → find the bucket → walk the bucket using `equals()` to find exact match.
- **Load factor** (default 0.75) = when 75% of buckets are used, HashMap doubles in size and rehashes everything. This is the expensive operation.
- **Collision** = two different keys hash to the same bucket. Handled by chaining (linked list), converted to a tree (Red-Black) at 8 entries per bucket since Java 8.
- The interview killer question: "What happens if two objects are `equals()` but have different `hashCode`?" → They land in different buckets → `get()` can never find the second one. HashMap is broken.

---

## 1. One-Line Definition
A HashMap is a data structure that gives O(1) average-time key lookups by converting keys to array indices through a hash function and storing values at those indices.

---

## 2. The Problem It Solves

Imagine you have 10 million user records. A new HTTP request arrives with a session token. You need to find the user who owns that token — fast. If you store users in a `List<User>`, finding the right user means scanning every record one by one until you find the matching token. For 10 million users, that's potentially 10 million comparisons per request. At 1,000 requests per second, your server dies.

A HashMap solves this. You put all users into a `HashMap<String, User>` keyed by token. When a request arrives, `map.get(token)` does one hash calculation, goes directly to the right slot in memory, and returns the user. One operation. Doesn't matter if you have 100 users or 100 million — the time is constant on average.

This is why HashMap is the most important data structure in Java application development. Every cache, every session store, every lookup table uses it. Understanding how it works internally lets you use it correctly and debug it when it breaks.

---

## 3. How It Works Internally

### The Mental Model
Think of HashMap as a very large apartment building with thousands of apartments. Each apartment has a number (the bucket index). When you move in (put a key-value pair), the building manager takes your name (the key), does a calculation (hash function), and assigns you to apartment 347. When someone wants to visit you (get by key), they give your name to the manager, he does the same calculation, goes to apartment 347, and finds you.

The problem: sometimes two people hash to the same apartment (collision). The original resident and the new arrival both end up at 347. The building handles this by letting them share — both live in 347, and visitors ask each person "are you the one I'm looking for?" until they find the right one.

### The Mechanism — Step by Step

**Step 1: Hash the key**
```
int hash = key.hashCode();
hash = hash ^ (hash >>> 16);  // Java's spread function — distributes bits better
```
This is called hash spreading. It makes the hash more uniform — avoids many collisions when keys have similar low-order bits.

**Step 2: Find the bucket index**
```
int index = hash & (capacity - 1);  // capacity is always a power of 2
// Equivalent to: hash % capacity, but faster with bitwise AND
```
Default initial capacity: 16 buckets.

**Step 3: Store in the bucket**
- If the bucket is empty → create a new node there.
- If the bucket has entries (collision) → walk the linked list, checking `key.equals()` on each.
    - If a matching key is found → update the value.
    - If no match → append a new node to the list.

**Step 4: Treeify at 8 (Java 8+)**
When a single bucket accumulates 8 or more entries (very bad hash distribution), Java converts the linked list in that bucket to a Red-Black tree. This makes the worst-case lookup for that bucket O(log n) instead of O(n). The tree is converted back to a linked list when entries drop back to 6.

**Load Factor and Resize**
- **Load factor** = `size / capacity`. Default is 0.75.
- When the map is 75% full, `resize()` is triggered.
- Resize doubles the capacity (e.g., 16 → 32) and **rehashes every entry** into the new larger array.
- Rehashing is O(n) — every entry must be re-placed.
- This is why large HashMap initialisation helps: `new HashMap<>(1000000, 0.75f)` avoids multiple resize cycles.

### ASCII Diagram

```
HASHMAP INTERNAL STRUCTURE (capacity = 8, simplified):
────────────────────────────────────────────────────────────────────
  put("Alice", 95):
    hash("Alice") → index 2
  put("Bob", 87):
    hash("Bob") → index 5
  put("Charlie", 92):
    hash("Charlie") → index 2  ← COLLISION with Alice at index 2

  BUCKET ARRAY:
  ┌───┐
  │ 0 │→ null
  ├───┤
  │ 1 │→ null
  ├───┤
  │ 2 │→ [Alice:95] → [Charlie:92] → null   ← Linked list (collision)
  ├───┤
  │ 3 │→ null
  ├───┤
  │ 4 │→ null
  ├───┤
  │ 5 │→ [Bob:87] → null
  ├───┤
  │ 6 │→ null
  ├───┤
  │ 7 │→ null
  └───┘

  get("Charlie"):
    hash("Charlie") → index 2
    Walk list: [Alice:95] → "Alice".equals("Charlie")? NO
               [Charlie:92] → "Charlie".equals("Charlie")? YES ✓
    Return 92

  AFTER 6 MORE ENTRIES IN BUCKET 2 (8 total):
  ┌───┤
  │ 2 │→ [Red-Black Tree] ← converted for O(log n) worst case
  └───┤
────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — The equals/hashCode Time Bomb
```java
// WRONG: Custom class as HashMap key without overriding equals and hashCode

public class OrderId {
    private final String id;

    public OrderId(String id) {
        this.id = id;  // No equals(), no hashCode()
    }
}

HashMap<OrderId, Order> orderCache = new HashMap<>();
OrderId key1 = new OrderId("ORD-001");
orderCache.put(key1, new Order("ORD-001", 500.0));

// Later in code, create "the same" key:
OrderId key2 = new OrderId("ORD-001");
Order found = orderCache.get(key2);  // Returns NULL!

// Why: key1 and key2 are different objects.
// Default hashCode() uses memory address → different addresses → different buckets.
// Even if they represent the same order, HashMap can't find it.
// The cache is functionally broken — every lookup on a new OrderId object will miss.

// This bug is devastating in caching layers:
Cache<OrderId, Order> cache = Caffeine.newBuilder().build();
Order order = cache.get(new OrderId("ORD-001"), k -> loadFromDB(k));
// Every call creates a new OrderId → cache miss every time → DB hammered
```

### Right Way — HashMap Used Correctly
```java
// RIGHT: equals() and hashCode() implemented correctly

public class OrderId {
    private final String id;

    public OrderId(String id) {
        Objects.requireNonNull(id, "Order ID cannot be null");
        this.id = id;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof OrderId)) return false;
        OrderId otherId = (OrderId) o;
        return this.id.equals(otherId.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);  // Consistent with equals
    }
}

// Now HashMap works correctly:
HashMap<OrderId, Order> orderCache = new HashMap<>(
    initialCapacity(), 0.75f  // Pre-size to avoid rehashing
);
OrderId key1 = new OrderId("ORD-001");
orderCache.put(key1, new Order("ORD-001", 500.0));

OrderId key2 = new OrderId("ORD-001");
Order found = orderCache.get(key2);  // Returns the order ✓
// key1.equals(key2) → true, key1.hashCode() == key2.hashCode() → same bucket → found

// Pre-sizing for known large capacity:
int expectedSize = 100_000;
int initialCapacity = (int) (expectedSize / 0.75) + 1;  // ~133,334
HashMap<String, UserProfile> userCache = new HashMap<>(initialCapacity);
// Avoids 3 resize operations that would occur with default capacity of 16

// In Spring Boot: String keys are fine (String overrides equals/hashCode correctly)
Map<String, UserProfile> sessionCache = new HashMap<>();
sessionCache.put(sessionToken, userProfile);
UserProfile user = sessionCache.get(sessionToken);  // Always works with String keys
```

> **Important:** Java Records (Java 16+) automatically generate correct `equals()` and `hashCode()`. `public record OrderId(String id) { }` is safe to use as a HashMap key without any extra code.

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does HashMap work internally?"

**Hruday's answer:**
> A HashMap is backed by an array. The array slots are called buckets. When you put a key-value pair, it does three things: hash the key to get a number, use that number to find the bucket index in the array, then store the value there.
>
> When you do get(key), the same process runs: hash the key, find the bucket. Then it walks the entries in that bucket using `equals()` until it finds the exact key you asked for.
>
> The critical detail: if two different keys hash to the same bucket — collision — they both live in that bucket as a linked list. Java 8 made this better by converting a bucket's linked list into a Red-Black tree once it reaches 8 entries, so the worst case goes from O(n) to O(log n) per bucket.
>
> The load factor — default 0.75 — is the fullness threshold. When 75% of buckets are in use, the entire array doubles in size and every entry is rehashed into the new array. That's an O(n) operation — expensive. For a large HashMap, you should pre-size it to avoid multiple resizes.
>
> The invariant that makes everything work: equal keys must have equal hash codes. If you break that — override `equals()` without overriding `hashCode()` — the HashMap puts equal keys into different buckets and `get()` can never find them. Silent data loss.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the time complexity of HashMap's get() in the worst case, and when does worst case happen?"

**Hruday's answer:**
> The worst case is O(n) before Java 8, and O(log n) since Java 8.
>
> Worst case happens when every key you store hashes to the same bucket. All entries pile into one bucket as a linked list. Getting any entry means walking the entire list — O(n) for n entries.
>
> Before Java 8: this was a real security vulnerability. An attacker could craft HTTP request parameters with keys designed to all hash to the same bucket. The server's request parameter map would have O(n²) processing time for n parameters — a denial-of-service attack exploiting hash collision. This was CVE-2011-4462 and affected many frameworks.
>
> Java 8 introduced treeification: when a bucket reaches 8 entries, it's converted to a Red-Black tree. This limits the worst case to O(log n) per bucket, even under malicious input.
>
> Java 8 also introduced a hash randomisation tweak — the spread function `hash ^ (hash >>> 16)` — which makes it harder to craft adversarial key sets.
>
> In practice, with good keys (String, Long, Integer — all have well-distributed hash codes), bucket lengths are 0, 1, or 2. Average get is O(1). The tree conversion almost never triggers.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "HashMap is not thread-safe. What are your options when you need concurrent access?"

**Hruday's answer:**
> Three options, each with different trade-offs:
>
> **Option 1: `ConcurrentHashMap`** — Thread-safe without locking the whole map. It uses segment-level locks (or CAS in Java 8+). Multiple threads can read and write simultaneously as long as they're writing to different buckets. This is the right choice for most concurrent use cases. I'll cover this deeply in Topic 20.
>
> **Option 2: `Collections.synchronizedMap(new HashMap<>())`** — Wraps the HashMap and adds a single global lock on every operation. Every get or put locks the entire map. Only one thread can do anything at a time. Safe but slow — terrible throughput under contention. Use only if you need a drop-in safe wrapper and concurrent performance doesn't matter.
>
> **Option 3: Immutable Map** — If the map is built once and then only read (no writes after creation), thread safety isn't a concern. `Map.of(...)` in Java 9+ and Guava's `ImmutableMap` are read-only. Multiple threads can read concurrently with zero synchronisation overhead. This is the fastest option — used for configuration maps, constant lookup tables.
>
> My default: `ConcurrentHashMap` for mutable shared state, immutable maps for read-only shared config.

---

### Q4 — Scenario Question
**Interviewer asks:** "You're building an in-memory rate limiter where the key is a user ID and the value is the number of requests in the last minute. Multiple threads update this map. What do you use?"

**Hruday's answer:**
> `ConcurrentHashMap<String, AtomicInteger>`.
>
> `ConcurrentHashMap` handles the thread-safe map access. But the increment operation — `count + 1` — also needs to be atomic. If two threads both read the count as 9 at the same time and both write 10, you've lost a request count. That's a race condition even with `ConcurrentHashMap`.
>
> `AtomicInteger` solves the increment atomically. `count.incrementAndGet()` is one atomic operation — guaranteed to never lose an increment.
>
> Full flow:
> ```java
> ConcurrentHashMap<String, AtomicInteger> rateLimiter = new ConcurrentHashMap<>();
>
> // On each request:
> rateLimiter.computeIfAbsent(userId, k -> new AtomicInteger(0))
>            .incrementAndGet();
>
> int count = rateLimiter.getOrDefault(userId, new AtomicInteger(0)).get();
> if (count > 100) throw new RateLimitExceededException();
> ```
>
> `computeIfAbsent` itself is atomic in `ConcurrentHashMap` — thread-safe initialisation of the counter on first request.
>
> For the actual rate limiting in production, I'd use Redis with TTL-based keys — INCR command is atomic, and keys expire after 60 seconds automatically. In-process solutions are limited to one JVM instance. Redis works across multiple service instances.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| equals without hashCode | "I override equals() to compare by field." | "Always override hashCode() when you override equals(). HashMap uses hashCode first — if it's wrong, get() breaks." |
| "O(1) always" | "HashMap is always O(1)." | "O(1) on average. Worst case O(log n) since Java 8 (treeified bucket). O(n) if using a terrible hash function." |
| Ignoring initial capacity | "I just do new HashMap<>()." | "For large expected sizes, pre-size: new HashMap<>(expectedSize / 0.75 + 1). Avoids multiple expensive resize/rehash operations." |
| Thread safety | "HashMap is fine for concurrent use." | "HashMap is NOT thread-safe. Concurrent puts with resizing can create an infinite loop (Java 7) or data corruption. Use ConcurrentHashMap." |

---

## 7. Hruday's Real Experience Hook

> "At Capgemini, we built a caching layer for a product catalog. Keys were custom `ProductCode` objects — a wrapper around a String. The engineer who built it didn't override `equals()` or `hashCode()`, so the cache was backed by a HashMap that used memory addresses as hash codes. The cache always missed — every lookup created a new `ProductCode` object, which hashed to a different bucket than the cached one. The cache hit rate was 0%. The DB query rate stayed as high as without caching. We only found it in load testing when the DB maxed out and the cache metrics showed 0% hit rate for a two-month-old cache. Adding five lines — proper `equals()` and `hashCode()` — fixed everything. Thirty-second deploy. Two months of performance degradation avoided retroactively. That taught me to treat equals+hashCode as a test-time checklist item, not a nice-to-have."

---

## 8. Scale Evolution

**Junior engineer →** Uses HashMap without overriding equals/hashCode on custom keys. Doesn't know about load factor or resizing.

**Mid-level engineer →** Knows to override equals/hashCode. Uses String and Long as keys (safe defaults). Knows about ConcurrentHashMap for thread safety.

**Senior engineer →** Pre-sizes HashMaps for large data. Understands treeification. Knows when HashMap is the wrong tool (sorted data → TreeMap, thread-safe → ConcurrentHashMap, read-only → ImmutableMap).

**Staff engineer →** Reviews HashMap usage in code as a performance signal. Tracks cache hit rates and GC impact from large HashMap resizes. Decides when to move from in-process HashMap to Redis.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | In-memory deduplication of transaction events, session caching | "You pre-sized the HashMap and chose ConcurrentHashMap for the multi-threaded rate limiter. Correct." |
| Swiggy / Meesho | Product catalog caching, order deduplication | "You caught the equals/hashCode contract break that would make the cache not work." |
| Adobe / SAP | Enterprise Java — DI containers use maps internally, Spring bean registry is a HashMap | "You explained resize complexity and why we pre-size for known large collections." |
| Google / Amazon | Classic interview question at SDE-2 — expect follow-ups on thread safety and resize | "What's the time complexity of HashMap.get() in the worst case and why?" |

---

## 10. Related Topics — What to Study Next

- **ConcurrentHashMap vs HashMap vs Hashtable (Topic 20)** — The next topic. Thread-safe map access — essential for multi-threaded Spring Boot apps.
- **Java Collections (Topic 18)** — The broader context — where HashMap fits in the Collection hierarchy and when to use TreeMap or LinkedHashMap instead.
- **Java Concurrency — Thread Pools (Topic 26)** — Thread pools share state through maps and queues. Understanding HashMap thread safety is prerequisite.
- **Caching — Redis and Caffeine (Part 9)** — Production caching. When HashMap as an in-process cache is insufficient and what to use instead.

---

*Part 2 · HashMap Internals — Hashing, Collision, Load Factor · Full Stack Interview Guide · Hruday D · 2026*
