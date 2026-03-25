# ConcurrentHashMap vs HashMap vs Hashtable
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **HashMap**: fast, not thread-safe. Use only in single-threaded code or with external locking.
- **Hashtable**: thread-safe by putting a `synchronized` lock on every method — locks the entire table. Legacy. Avoid. Replaced by `ConcurrentHashMap`.
- **ConcurrentHashMap**: thread-safe, high performance. Multiple threads can read simultaneously. Writes lock only the affected bucket (segment-level or CAS in Java 8+), not the whole map.
- The interview answer when asked "why ConcurrentHashMap over Hashtable": Hashtable locks the entire map for every operation — one thread blocks all others. ConcurrentHashMap locks only a small section, so multiple threads work concurrently.
- Caveat: `ConcurrentHashMap` does NOT allow null keys or null values. `HashMap` does. This surprises people in migration.

---

## 1. One-Line Definition
`ConcurrentHashMap` is a thread-safe map that allows multiple threads to read and write concurrently with high throughput by locking only individual buckets during writes, not the entire map.

---

## 2. The Problem It Solves

A Spring Boot service handles 2,000 requests per second. It has an in-memory session cache: `Map<String, User> sessionCache`. Multiple threads read from this map on every request. Multiple threads write to it when users log in.

If you use `HashMap`: it's not thread-safe. Two threads writing at the same time can corrupt the internal array during a resize. In Java 7, two concurrent writes can create a circular linked list in a bucket — `get()` enters an infinite loop and the thread hangs forever. The server stops responding.

If you use `Hashtable`: every `get()` and `put()` acquires a lock on the entire table. Thread 1 is writing → Thread 2's read blocks → Thread 3's read blocks → all 2,000 concurrent requests wait their turn. Throughput collapses.

If you use `ConcurrentHashMap`: reads are lock-free (using `volatile` reads). Writes lock only the specific bucket being written to (16 segments in Java 7, or fine-grained CAS in Java 8+). 1,999 reads and the one write can all happen at the same time as long as they're hitting different buckets. Throughput scales with the number of cores.

`ConcurrentHashMap` was built specifically to solve the "shared mutable map in a multi-threaded application" problem correctly and efficiently.

---

## 3. How It Works Internally

### The Mental Model
Think of a library.

**`HashMap`**: One table with no librarian watching it. Readers and writers come and go freely. Sometimes two writers collide and tear pages out by accident. Chaos.

**`Hashtable`**: One table with one librarian who handles everything. Every time anyone wants to read a book OR return a book, they must wait for the librarian to finish with the current person. Only one person at the table at a time. Safe, but very slow at busy hours.

**`ConcurrentHashMap`**: One large room divided into 16 sections (or more). Each section has its own librarian. A reader in section 3 doesn't bother the librarian in section 11. Multiple readers can read from ANY section at the same time — no waiting at all. A writer in section 3 only blocks others writing to section 3 — everyone else works freely.

### The Mechanism — Evolution Through Java Versions

**Java 7 — Segment-based locking:**
```
The map was divided into 16 segments (default).
Each segment was essentially a small HashMap with its own ReentrantLock.
A put() locked only the segment that contained the target bucket.
A get() was mostly lock-free.
```

**Java 8 — CAS + bin-level locking:**
```
Segments were removed entirely.
Java 8 uses Compare-And-Swap (CAS) — a hardware instruction that atomically
  checks a value and updates it only if it matches the expected value.
Reads are always lock-free — they use volatile reads.
Writes try CAS first (optimistic): "change value from X to Y if it's still X."
  - If CAS succeeds: no lock taken, extremely fast.
  - If CAS fails (contention on that bucket): fall back to synchronized on that bucket.
This makes Java 8's ConcurrentHashMap faster than Java 7's segment approach
  under low-to-medium contention.
```

### Key Behavioural Differences

```
                    HashMap       Hashtable     ConcurrentHashMap
────────────────────────────────────────────────────────────────────
Thread-safe?        No            Yes (slow)    Yes (fast)
Null keys?          1 allowed     No            No
Null values?        Yes           No            No
Locking             None          Full map      Per-bucket (CAS)
                                  synchronized  + volatile reads
Read lock           None          Full lock     Lock-free
Write lock          None          Full lock     Bin-level only
Performance         Highest       Lowest        Near-HashMap
 (single-threaded)
Performance         Broken        Very low      High
 (multi-threaded)
Recommended?        Single-thread Never         Multi-threaded
                    only
Size method         O(1)          O(1)          O(n) - approximate
Iteration           Fail-fast     Fail-fast     Weakly-consistent
                    (ConcModExc)  (ConcModExc)  (no exception)
```

### ASCII Diagram

```
CONCURRENT WRITE BEHAVIOR:
────────────────────────────────────────────────────────────────────
HASHTABLE (synchronized entire map):
  Thread A: put("alice", u1) ──→ LOCK ENTIRE MAP ──→ write ──→ UNLOCK
  Thread B: put("bob", u2)   ──→ WAIT ─────────────────────→ LOCK → write
  Thread C: get("carol")     ──→ WAIT ─────────────────────────────→ read
  Throughput: 1 operation at a time. Terrible.

CONCURRENTHASHMAP (Java 8, per-bucket CAS):
  Thread A: put("alice", u1) → hash → bucket 5 → CAS bucket 5 → write
  Thread B: put("bob", u2)   → hash → bucket 9 → CAS bucket 9 → write  (same time!)
  Thread C: get("carol")     → hash → bucket 3 → volatile read           (same time!)
  All three run concurrently. No thread blocked by another's key.

  (Only conflict if two threads hit THE SAME BUCKET at the same time)
────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — The Classic HashMap Thread-Safety Bug
```java
// WRONG: Plain HashMap in a multi-threaded Spring Boot service

@Service
public class SessionService {
    // Shared mutable state across threads — DANGER
    private final Map<String, UserSession> sessions = new HashMap<>();

    // Called by multiple request handler threads simultaneously
    public void createSession(String token, UserSession session) {
        sessions.put(token, session);  // NOT THREAD SAFE
    }

    public UserSession getSession(String token) {
        return sessions.get(token);   // NOT THREAD SAFE
    }
}

// What can go wrong:
// 1. Two threads calling put() during a resize can corrupt the internal array.
// 2. In Java 7: infinite loop in get() due to circular linked list from concurrent resize.
// 3. Data loss: one thread's put() overwrites another's without either knowing.
// This will work fine in development (single-threaded tests) and fail randomly in production.

// ALSO WRONG: Hashtable — safe but crushes throughput
private final Map<String, UserSession> sessions = new Hashtable<>();
// Every request doing getSession() must wait for other requests to finish.
// At 500 concurrent users: 499 requests blocked while 1 reads.
```

### Right Way — ConcurrentHashMap in a Spring Boot Service
```java
// RIGHT: ConcurrentHashMap for thread-safe in-memory shared state

@Service
public class SessionService {
    // Thread-safe map — multiple reads concurrent, writes fine-grained
    private final ConcurrentHashMap<String, UserSession> sessions =
        new ConcurrentHashMap<>(1024, 0.75f, 32);
    //  Initial capacity: 1024 — avoids resizing for typical session counts
    //  Load factor: 0.75 — standard
    //  Concurrency level: 32 — hint for expected concurrent write threads (Java 7 only,
    //                           Java 8 ignores this but it's harmless)

    public void createSession(String token, UserSession session) {
        sessions.put(token, session);  // Thread-safe
    }

    public UserSession getSession(String token) {
        return sessions.get(token);  // Lock-free volatile read
    }

    public void removeSession(String token) {
        sessions.remove(token);  // Thread-safe
    }

    // Atomic check-then-act — avoid race conditions in session renewal
    public boolean renewSession(String token, UserSession newSession) {
        UserSession existing = sessions.get(token);
        if (existing == null) return false;
        // putIfAbsent / replace are atomic operations on ConcurrentHashMap
        return sessions.replace(token, existing, newSession);
        // replace(key, expectedOldValue, newValue) — atomic CAS
        // Only replaces if current value is still 'existing'
        // Returns false if another thread already changed it
    }

    // Rate limiter — atomic increment
    private final ConcurrentHashMap<String, AtomicInteger> requestCounts =
        new ConcurrentHashMap<>();

    public int incrementAndGetRequestCount(String userId) {
        return requestCounts
            .computeIfAbsent(userId, k -> new AtomicInteger(0))
            .incrementAndGet();
        // computeIfAbsent is atomic — creates the AtomicInteger only once
        // even if two threads call it for the same userId simultaneously
    }
}

// Important: ConcurrentHashMap does NOT allow null keys or null values
Map<String, String> map = new ConcurrentHashMap<>();
map.put(null, "value");     // Throws NullPointerException!
map.put("key", null);       // Throws NullPointerException!
// HashMap allows null key and null values.
// If migrating from HashMap to ConcurrentHashMap, check for nulls first.
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why would you use ConcurrentHashMap instead of Hashtable if both are thread-safe?"

**Hruday's answer:**
> Both are thread-safe, but the way they achieve safety is completely different — and the difference matters enormously at scale.
>
> `Hashtable` uses a `synchronized` keyword on every single method — `get()`, `put()`, `remove()`, even `size()`. Every method call locks the entire table. Only one thread can do anything at a time. If Thread A is reading key "foo," Thread B must wait — even if Thread B wants to read key "bar" from a completely different part of the map. That's unnecessary contention.
>
> `ConcurrentHashMap` uses fine-grained locking. In Java 8, reads are entirely lock-free — they use `volatile` reads. Writes use CAS (a hardware atomic operation) on the specific bucket being modified. Thread A writing to bucket 5 and Thread B writing to bucket 9 don't block each other at all. Multiple threads can read and write simultaneously as long as they're working with different keys.
>
> At 500 concurrent requests in a Spring Boot service, `Hashtable` serialises all map operations — you get 1x throughput. `ConcurrentHashMap` lets hundreds of reads and writes run in parallel — you get near-linear throughput scaling.
>
> `Hashtable` was the Java 1.0 answer (1996). `ConcurrentHashMap` is the Java 5+ answer (2004). `Hashtable` is effectively deprecated for new code.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain how ConcurrentHashMap achieves thread safety in Java 8."

**Hruday's answer:**
> Java 8 rewrote `ConcurrentHashMap` completely, removing the segment-based approach from Java 7 and using two mechanisms:
>
> First: **`volatile` reads.** The bucket array is declared `volatile`. Every read operation uses a volatile read — which guarantees visibility without any locking. Thread A writes a value, and Thread B's next volatile read on that bucket will see the latest write. No lock required for reads.
>
> Second: **CAS (Compare-And-Swap) for writes.** CAS is a hardware-level atomic instruction: "If the current value at this memory location is X, replace it with Y. Otherwise do nothing, and tell me it failed."
>
> When a thread writes to `ConcurrentHashMap`, it tries CAS on the target bucket's head node:
> - If the bucket is empty: CAS from `null` to the new node. If this succeeds, done — no lock.
> - If another thread also tries CAS on the same empty bucket at the same time: one of them wins, one sees the CAS failed and falls back to the synchronized path.
> - If the bucket is non-empty: `synchronized(bucket head)` — locks just that single bucket, adds the value, unlocks.
>
> The result: under low contention (different keys), threads never block each other. Under high contention (same bucket), only the threads colliding on that one bucket block each other. The rest of the map is unaffected.
>
> The iteration is also "weakly consistent" — you won't get a `ConcurrentModificationException` even if the map is modified during iteration. You might see some new entries or miss some that were removed concurrently — the spec calls this acceptable.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Is there a scenario where you'd still choose HashMap over ConcurrentHashMap?"

**Hruday's answer:**
> Yes — when there's guaranteed no concurrent access, or when you control all access through external synchronisation.
>
> The clearest case: local variables. A `HashMap` created inside a method and never passed to another thread is perfectly safe — it's not shared, so thread safety is irrelevant. And `HashMap` is slightly faster than `ConcurrentHashMap` for single-threaded use because it has no atomic operations or volatile reads.
>
> Another case: building a map in a single-threaded setup phase, then making it read-only with `Collections.unmodifiableMap()` before sharing it across threads. The unmodifiable wrapper + immutable map gives zero-cost reads — no volatile overhead, no CAS. For a lookup table built once at startup (like a country code map or a config map), this is the right choice.
>
> The third case: Java 9's `Map.of(...)` and `Map.copyOf(...)`. These return truly immutable maps — internally even more optimised than `unmodifiableMap`. If your data is read-only after creation, this is the fastest and safest option.
>
> Rule: if the map is accessed from multiple threads and any thread writes → `ConcurrentHashMap`. If the map is read-only after setup → immutable map. If it's single-threaded → `HashMap`.

---

### Q4 — Scenario Question
**Interviewer asks:** "You need to count how many requests each user makes. Multiple threads increment the same user's counter. What's your implementation?"

**Hruday's answer:**
> `ConcurrentHashMap<String, AtomicLong>` — one map entry per user, one atomic counter as the value.
>
> The `ConcurrentHashMap` handles thread-safe access to the map itself — multiple threads can read and write to the map concurrently.
>
> The `AtomicLong` handles thread-safe increment — `incrementAndGet()` is a single atomic operation, never loses a count under concurrent increments.
>
> Code:
> ```java
> ConcurrentHashMap<String, AtomicLong> requestCounts = new ConcurrentHashMap<>();
>
> // On each request from userId:
> requestCounts.computeIfAbsent(userId, k -> new AtomicLong(0))
>              .incrementAndGet();
> ```
>
> `computeIfAbsent` is atomic on `ConcurrentHashMap` — if two threads call it for a new userId at the same time, only one `AtomicLong` is created and stored. No duplicate creation.
>
> Java 8 also has `merge` for cleaner counter code:
> ```java
> requestCounts.merge(userId, 1L, Long::sum);
> // "Add 1 to existing value, or start at 1 if key doesn't exist" — atomic
> ```
>
> For high-frequency counters, `LongAdder` is even better than `AtomicLong` — it uses multiple cells to reduce contention under very high concurrent writes. `LongAdder.increment()` then `sum()` to read. But for most use cases, `AtomicLong` is sufficient.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "ConcurrentHashMap is fully atomic" | "All compound operations on ConcurrentHashMap are atomic." | "Individual put/get are atomic. Compound operations like check-then-put are NOT — use computeIfAbsent, putIfAbsent, replace(k, old, new) for atomicity." |
| "Hashtable is thread-safe, so it's fine" | "I use Hashtable for thread safety." | "Hashtable locks the entire map on every operation. Use ConcurrentHashMap — same safety, much higher throughput." |
| Null key gotcha | "I'll migrate from HashMap to ConcurrentHashMap." | "Check for null keys/values first. ConcurrentHashMap throws NullPointerException on null keys or values. HashMap allows both." |
| Size() accuracy | "ConcurrentHashMap.size() tells me exactly how many entries there are." | "size() is approximate under concurrent modification. Use it for estimates, not exact counts in concurrent scenarios." |

---

## 7. Hruday's Real Experience Hook

> "At Bosch, our industrial dashboard service had a shared in-memory map that tracked the most recent sensor reading per device — `Map<DeviceId, SensorReading>`. It started as a `HashMap` in the proof-of-concept. In production, with 50 WebSocket connections updating the map simultaneously, the server hung every few hours. Thread dump showed threads in an infinite loop inside `HashMap.get()` — the Java 7 circular linked list issue during concurrent resize. Replacing `HashMap` with `ConcurrentHashMap` was a one-line fix. No more hangs, no more circular lists. Production stable immediately. That's when I made it a personal rule: any map that's accessed from more than one thread gets `ConcurrentHashMap` automatically. No exceptions, no 'it's probably safe.'"

---

## 8. Scale Evolution

**Junior engineer →** Uses `HashMap` everywhere. Doesn't know about thread safety risks. Hasn't hit the bug yet.

**Mid-level engineer →** Knows to use `ConcurrentHashMap` for shared maps. Knows `Hashtable` is legacy. May not know the Java 7 infinite loop risk.

**Senior engineer →** Understands CAS mechanism. Uses `computeIfAbsent`, `merge`, `replace` for atomic compounds. Knows null restriction. Knows `size()` is approximate.

**Staff engineer →** Evaluates whether in-process `ConcurrentHashMap` is sufficient or whether Redis is needed (multi-instance, persistence, TTL). Knows `LongAdder` for high-throughput counters. Reviews concurrent data access patterns in new services proactively.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | High-concurrency payment processing — shared rate limiters, session caches, deduplication maps | "You used ConcurrentHashMap + AtomicLong for the rate limiter. Correct atomic compound operation." |
| Swiggy / Meesho | Real-time order tracking — multiple threads updating order state maps | "You called out the Java 7 circular linked list bug — that's production depth, not textbook knowledge." |
| Adobe / SAP | Enterprise Java — Spring beans are singletons, any shared state in them must be thread-safe | "You knew ConcurrentHashMap.size() is approximate — that matters for metrics accuracy." |
| Google / Amazon | Java concurrency questions at SDE-2 — ConcurrentHashMap vs Hashtable is a standard question | "Explain exactly how ConcurrentHashMap achieves thread safety in Java 8." |

---

## 10. Related Topics — What to Study Next

- **Thread Lifecycle and States (Topic 25)** — Understanding how threads block and run helps explain why Hashtable's full lock is such a throughput killer.
- **synchronized vs ReentrantLock vs volatile (Topic 27)** — The locking primitives that ConcurrentHashMap uses internally under contention.
- **Deadlock — Detection and Prevention (Topic 28)** — ConcurrentHashMap is designed to be deadlock-free. Understanding deadlock shows why this design matters.
- **CompletableFuture (Topic 29)** — Async patterns in Spring Boot. ConcurrentHashMap is frequently used as shared state in async processing pipelines.

---

*Part 2 · ConcurrentHashMap vs HashMap vs Hashtable · Full Stack Interview Guide · Hruday D · 2026*
