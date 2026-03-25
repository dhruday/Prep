# Java Collections — List, Map, Set Internals
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **List** = ordered, allows duplicates. `ArrayList` is backed by an array — fast for random reads, slow for inserts-in-middle. `LinkedList` is backed by nodes — fast for inserts at head/tail, slow for random access.
- **Map** = key-value pairs, keys are unique. `HashMap` is the default — O(1) average get/put, unordered. `LinkedHashMap` keeps insertion order. `TreeMap` keeps sorted order — O(log n).
- **Set** = unique elements only. `HashSet` is backed by a HashMap — O(1). `TreeSet` keeps sorted order — O(log n). `LinkedHashSet` keeps insertion order.
- The critical interview answer on `ArrayList` vs `LinkedList`: use `ArrayList` almost always. `LinkedList` only wins when you are inserting/deleting many times at the beginning — rare in practice.
- The critical interview answer on `HashSet`: backed by a `HashMap` where every value is a dummy object. That's why `HashSet` requires `equals()` and `hashCode()` to be correct on the stored type.

---

## 1. One-Line Definition
Java Collections is the framework of data structures — interfaces like `List`, `Map`, `Set` and implementations like `ArrayList`, `HashMap`, `HashSet` — that forms the backbone of every Java application.

---

## 2. The Problem It Solves

Before Java Collections (pre-Java 2), developers used raw arrays. Arrays have a fixed size — you must declare the size upfront. Adding one more element when the array is full means creating a new, bigger array and copying everything over. Finding an element means scanning every position. Most Java code had the same array management logic copy-pasted everywhere.

Java Collections gave standard, tested, type-safe implementations of every common data structure. `ArrayList` handles resizing automatically. `HashMap` gives sub-millisecond key lookups. `HashSet` handles uniqueness checking without any custom code.

Today, in every Spring Boot application at SAP or Oracle, collections are everywhere: the list of `Order` objects returned from a repository, the map of `userId → User` cached in memory, the set of role names on a `UserDetails` object for Spring Security. Getting the choice and usage right directly affects performance.

Pick the wrong collection — like using a `LinkedList` for a search-heavy list, or a `List` when uniqueness is required — and you build in silent bugs and slow operations.

---

## 3. How It Works Internally

### The Mental Model
Think of the collection interfaces as job descriptions, and the implementations as people hired for those jobs.

- `List`: "I need something that remembers order and can have duplicates." `ArrayList` says "I'll use a fast bookshelf." `LinkedList` says "I'll use a chain of sticky notes."
- `Map`: "I need to look up a value by a key instantly." `HashMap` says "I'll use a magic filing cabinet with labelled slots."
- `Set`: "I need unique values only." `HashSet` says "I'll use that same magic filing cabinet — just store the names, not values."

The right implementation depends on which operations you call most.

### The Mechanism — Internals of Each

**ArrayList**
- Backed by an Object array internally.
- Default initial capacity: 10.
- When full, it grows by 50% — creates a new array of size `current * 1.5`, copies all elements over.
- `get(index)` → O(1) — direct array access by index.
- `add(element)` at end → amortised O(1) — usually fast, occasionally O(n) during growth.
- `add(index, element)` in the middle → O(n) — must shift all elements after the insertion point.
- `contains(element)` → O(n) — must scan every element.

**LinkedList**
- Backed by doubly-linked nodes — each node holds the element, a pointer to the next node, and a pointer to the previous node.
- `get(index)` → O(n) — must walk the chain from head or tail.
- `add(element)` at head or tail → O(1) — just update two pointers.
- `add(index, element)` in the middle → O(n) to find the position, O(1) to insert once found.
- Implements `Deque` — can be used as a stack or queue.

**HashMap** (deep internals in Topic 19 — brief here)
- Array of "buckets" (linked lists or tree nodes since Java 8).
- `put(key, value)` → hash the key → find the bucket → store.
- `get(key)` → hash the key → find the bucket → find by equals().
- Average O(1), worst case O(n) with bad hash function.

**TreeMap**
- Backed by a Red-Black tree (self-balancing binary search tree).
- Keys must be `Comparable` or a `Comparator` must be provided.
- All operations O(log n) — slower than HashMap but always sorted.
- Use when you need: sorted iteration, `firstKey()`, `lastKey()`, `headMap()`, `tailMap()`.

**HashSet**
- Backed by a `HashMap<E, Object>`.
- Every element stored as a key. Value is a dummy constant `PRESENT`.
- `add(element)` → `map.put(element, PRESENT)` — O(1).
- `contains(element)` → `map.containsKey(element)` — O(1).
- Requires correct `equals()` and `hashCode()` on elements — otherwise duplicates slip through.

**LinkedHashSet / LinkedHashMap**
- Backed by hash table + doubly-linked list that preserves insertion order.
- Same O(1) performance as HashMap/HashSet but iterates in insertion order.
- Slightly more memory and overhead than the non-linked versions.

### ASCII Diagram

```
COLLECTION HIERARCHY:
────────────────────────────────────────────────────────────────────
          Collection
          ├── List           (ordered, allows duplicates)
          │   ├── ArrayList  ← array-backed, fast random access
          │   └── LinkedList ← node-backed, fast head/tail insert
          │
          ├── Set            (unique elements only)
          │   ├── HashSet    ← HashMap-backed, O(1), unordered
          │   ├── LinkedHashSet ← insertion-order
          │   └── TreeSet    ← Red-Black tree, sorted O(log n)
          │
          └── Queue / Deque  (FIFO / double-ended)
              ├── LinkedList ← also a Deque
              ├── ArrayDeque ← resizable circular array (prefer over LinkedList)
              └── PriorityQueue ← heap, retrieves min/max first

          Map (not a Collection, but part of the framework)
          ├── HashMap        ← O(1) avg, unordered
          ├── LinkedHashMap  ← insertion-order
          ├── TreeMap        ← sorted, O(log n)
          └── ConcurrentHashMap ← thread-safe HashMap (Topic 20)

OPERATION COMPLEXITY SUMMARY:
────────────────────────────────────────────────────────────────────
              get(i)  add(end)  add(mid)  contains  remove(i)
ArrayList      O(1)   O(1)*     O(n)      O(n)      O(n)
LinkedList     O(n)   O(1)      O(n)      O(n)      O(1)**
HashMap        O(1)   O(1)       -        O(1)      O(1)
TreeMap       O(log n) O(log n) -         O(log n)  O(log n)
HashSet        -      O(1)       -        O(1)      O(1)
TreeSet        -      O(log n)   -        O(log n)  O(log n)
* amortised  ** once position found
────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — Collection Misuse in Production
```java
// WRONG 1: Using LinkedList for random access (slow and common mistake)
List<User> users = new LinkedList<>();
userRepository.findAll().forEach(users::add);
User user = users.get(500);  // O(n) — walks 500 nodes. Should be ArrayList.

// WRONG 2: Using List when uniqueness is required
List<String> assignedRoles = new ArrayList<>();
assignedRoles.add("ADMIN");
assignedRoles.add("USER");
assignedRoles.add("ADMIN");  // Duplicate silently added. No error.
// Spring Security reads this List — ADMIN appears twice. Logic may break.

// WRONG 3: Using HashMap iteration where order matters
Map<String, Integer> scores = new HashMap<>();
scores.put("Alice", 95);
scores.put("Bob", 87);
scores.put("Charlie", 92);
// Printing for a scorecard:
for (Map.Entry<String, Integer> e : scores.entrySet()) {
    System.out.println(e.getKey() + ": " + e.getValue());
}
// Output order is unpredictable — HashMap doesn't preserve insertion order.
// Scorecard shows random order every time. Use LinkedHashMap here.

// WRONG 4: Storing mutable objects in a HashSet without proper equals/hashCode
Set<User> users = new HashSet<>();
User u1 = new User("hruday@sap.com");
users.add(u1);
u1.setEmail("hruday@gmail.com");  // Mutated the object after adding to Set
users.contains(u1);  // May return FALSE — the hash changed, HashSet can't find it
// Set is now corrupted. Duplicate entries possible.
```

### Right Way — Choosing the Right Collection
```java
// RIGHT 1: ArrayList for random access reads
List<ProductDTO> products = new ArrayList<>();  // Default choice for any list

// RIGHT 2: Set for uniqueness
Set<String> assignedRoles = new HashSet<>();
assignedRoles.add("ADMIN");
assignedRoles.add("USER");
assignedRoles.add("ADMIN");  // Silently ignored — Set guarantees uniqueness
// Spring Security: roles.contains("ADMIN") → O(1) lookup, correct uniqueness

// RIGHT 3: LinkedHashMap when insertion order matters
Map<String, Integer> scores = new LinkedHashMap<>();
scores.put("Alice", 95);
scores.put("Bob", 87);
scores.put("Charlie", 92);
// Iterates in insertion order: Alice, Bob, Charlie. Predictable for reporting.

// RIGHT 4: TreeMap when sorted order matters
Map<String, Integer> leaderboard = new TreeMap<>(Comparator.reverseOrder());
// Will iterate in reverse alphabetical order — or use a custom Comparator

// RIGHT 5: ArrayDeque as a stack or queue (prefer over Stack/LinkedList)
Deque<String> taskQueue = new ArrayDeque<>();
taskQueue.offer("task1");   // enqueue
taskQueue.offer("task2");
String next = taskQueue.poll();  // dequeue — "task1"

// RIGHT 6: Check contains on a Set, not a List — O(1) vs O(n)
Set<Long> processedOrderIds = new HashSet<>();
// When processing 1M orders, checking contains on a Set is critical:
if (!processedOrderIds.contains(orderId)) {
    processOrder(orderId);
    processedOrderIds.add(orderId);
}
// List.contains on 1M items = O(n) × n events = O(n²) total. Unusable.
// Set.contains = O(1) × n events = O(n) total. Production-safe.

// Spring Boot example — UserDetails with a Set of roles (correct)
public class UserPrincipal implements UserDetails {
    private final Set<GrantedAuthority> authorities;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.unmodifiableSet(authorities);  // Immutable view
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you use ArrayList vs LinkedList?"

**Hruday's answer:**
> I use `ArrayList` in almost every case. Here's why.
>
> `ArrayList` is backed by an array. `get(index)` is O(1) — direct array position access. `add()` at the end is amortised O(1). The resizing happens infrequently and modern JVMs handle it efficiently.
>
> `LinkedList` is fast for add at head or tail — O(1). But `get(index)` is O(n) — it has to walk the linked nodes from the start or end to reach position n. That's a deal-breaker for any list you need to read or iterate frequently.
>
> The real practical issue: `LinkedList` has terrible cache performance. Array elements are contiguous in memory — the CPU prefetches them and they're already in cache when you read. Linked list nodes are scattered across the heap. Every node access is potentially a cache miss. In benchmarks, `ArrayList` often beats `LinkedList` even on insert-heavy operations because cache misses are so expensive.
>
> The one case where `LinkedList` legitimately wins: you need a FIFO queue where you add to one end and remove from the other, and you never access by index. For that, `ArrayDeque` is actually even better than `LinkedList` — it's an array-based circular buffer with O(1) head and tail operations and good cache performance.
>
> Summary: ArrayList for lists. ArrayDeque for queues and stacks. LinkedList almost never.

---

### Q2 — Deep Dive
**Interviewer asks:** "What happens when you store a custom object in a HashSet and don't override equals() and hashCode()?"

**Hruday's answer:**
> The HashSet breaks silently. It's one of the most insidious Java bugs.
>
> By default, every Java object inherits `equals()` from `Object`. The default `Object.equals()` checks reference equality — two objects are equal only if they are literally the same object in memory, the same reference.
>
> So if I create two `User` objects with the same email address and add both to a `HashSet` — and I haven't overridden `equals()` — the HashSet sees them as different objects (different references) and stores both. My "set of unique users" now has duplicates. The uniqueness guarantee is broken.
>
> The deeper problem with `hashCode()`: even if I override `equals()` to compare by email, if I don't also override `hashCode()`, the HashSet can still store duplicates. Two equal objects must have the same hash code — that's the contract. `HashSet` uses the hash code first to find the right bucket. If two equal objects hash to different buckets, the HashSet never even calls `equals()` — it just puts them in different buckets and you have duplicates.
>
> The rule: always override equals AND hashCode together. IntelliJ and Lombok both generate them correctly. For JPA entities, use `@EqualsAndHashCode` on the natural ID (not the database-generated primary key — before the entity is saved, the ID is null, so two unsaved entities would be equal, which is wrong).
>
> In production: I've seen this exact bug cause duplicate entries in a `Set<User>` used for permission lookups. Access control was inconsistent depending on which `User` instance the set was populated from.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you choose a TreeMap over a HashMap?"

**Hruday's answer:**
> TreeMap when you need the keys in sorted order. HashMap when you just need fast lookups.
>
> HashMap is O(1) average for get and put. No ordering guaranteed. If you just need to cache user sessions by session ID — HashMap, no question.
>
> TreeMap is O(log n) for everything — it's backed by a Red-Black tree that keeps keys sorted. Slower than HashMap but gives you sorted iteration and range queries.
>
> Real cases where TreeMap wins:
>
> First: leaderboards. You need the top 10 scores. With a `TreeMap<Integer, String>` sorted in reverse, `firstKey()` is always the highest score. O(log n) to insert, O(1) to read the max.
>
> Second: time-series data. You have events keyed by timestamp and you want all events between 9am and 5pm. `treeMap.subMap(9am, 5pm)` gives you exactly that range as a view. HashMap can't do this efficiently.
>
> Third: ordered menus or configuration files. If you're serialising a map to a config file and want keys alphabetically sorted for human readability — `new TreeMap<>(configMap)` sorts on creation.
>
> Cost of TreeMap: every operation is O(log n), not O(1). For a million entries, that's roughly 20 comparisons per lookup vs 1 for HashMap. For lookup-heavy applications, HashMap wins.

---

### Q4 — Scenario Question
**Interviewer asks:** "You're building a cache of 1 million user profiles. Users are fetched by ID. What collection do you use and why?"

**Hruday's answer:**
> `HashMap<Long, UserProfile>` — no question.
>
> The access pattern is purely by key — `cache.get(userId)`. There's no need for sorted order, no need for ordered iteration, no need for range queries. That's a pure key-value lookup by a known key.
>
> HashMap gives O(1) average for get and put. At 1 million entries with a reasonable load factor (default 0.75), it will have about 1.33 million buckets. Most gets resolve in one hash operation and one equality check.
>
> What I'd also think about for a real cache of this size:
>
> First: memory. 1 million UserProfile objects. If each is ~200 bytes (rough), that's 200MB just for values, plus HashMap overhead (about 48 bytes per entry in Java) — roughly 250MB total. Fine for an in-process cache. If memory is a concern, use a proper cache like Caffeine with eviction policy.
>
> Second: thread safety. If multiple threads read and write this map — `ConcurrentHashMap` instead of `HashMap`. Plain `HashMap` is not thread-safe.
>
> Third: eviction. A pure `HashMap` grows without bound. For a real cache I'd use `Caffeine` — which uses a `ConcurrentHashMap` internally and adds TTL-based expiry, max size with LRU eviction, and hit-rate metrics.
>
> But if the question is purely about which collection type — `HashMap<Long, UserProfile>`.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use LinkedList for insertions" | "LinkedList is better for inserts." | "ArrayList add-at-end is amortised O(1) and has much better cache performance. LinkedList rarely wins in practice." |
| HashSet without equals/hashCode | "I store my objects in a HashSet." | "Does your object override equals() AND hashCode()? Without them, HashSet gives you silent duplicates." |
| Using List for membership checks | "I call list.contains(item) to check if it's already processed." | "List.contains is O(n). Use HashSet for membership checks — O(1)." |
| HashMap for sorted output | "I use HashMap and sort before returning." | "LinkedHashMap preserves insertion order. TreeMap sorts by key. No sort-before-return needed." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, we built a permission system where each user could have multiple roles. Early in the project, roles were stored as `List<String>`. The `setupDefaultRoles()` method was called on multiple code paths accidentally — so some users had 'ADMIN' three times in the list. Spring Security's `getAuthorities()` returned duplicates and certain permission checks behaved inconsistently between calls. When I traced the bug, the fix was one word: change `List<String>` to `Set<String>`. Duplicates gone, permission checks consistent. That was the day I deeply understood: the collection type is part of your domain invariant. When you need uniqueness — use a Set. It's not just a preference — it's a contract enforced by the data structure."

---

## 8. Scale Evolution

**Junior engineer →** Uses `ArrayList` for everything. Knows names of other collections but not when to use them.

**Mid-level engineer →** Uses `HashMap` for lookups, `HashSet` for uniqueness, `ArrayList` for lists. Knows about thread-safety concerns with `HashMap`.

**Senior engineer →** Selects collection based on access pattern analysis. Knows time complexities cold. Knows `equals()`/`hashCode()` contract deeply. Uses `LinkedHashMap`, `TreeMap`, `ArrayDeque` when appropriate.

**Staff engineer →** Audits collection choices in code reviews as a performance signal. Catches O(n) operations inside O(n) loops early. Evaluates whether an in-process collection or an external cache (Redis, Caffeine) is the right level for the data.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | High-throughput transaction processing — collection choice at every hot path | "You chose HashSet for the processed-transaction deduplication check. Exactly right for O(1) lookup." |
| Swiggy / Meesho | Catalog with millions of products — map indexing, set-based deduplication | "You identified that contains() on a List at 1M entries is O(n²) total. Critical catch." |
| Adobe / SAP | Enterprise Java — Spring Security roles, JPA entity sets, DTO mapping | "You explained equals/hashCode contract on entities. That's the most common JPA bug we see." |
| Google / Amazon | Data-structure questions and Java internals in SDE-2 interviews | "What's the time complexity of HashMap.get() in the worst case and why?" |

---

## 10. Related Topics — What to Study Next

- **HashMap Internals (Topic 19)** — The deep dive into how HashMap's hashing, collision handling, tree bins, and load factor work.
- **ConcurrentHashMap vs HashMap vs Hashtable (Topic 20)** — Thread safety with collections — when to use each in multithreaded Spring Boot apps.
- **Java Streams API (Topic 31)** — Streams operate on Collections. Knowing collection types helps write correct and efficient stream pipelines.
- **JVM Memory — Heap (Topic 21)** — Collections live on the heap. Large collections are a primary cause of GC pressure and OutOfMemoryError.

---

*Part 2 · Java Collections — List, Map, Set Internals · Full Stack Interview Guide · Hruday D · 2026*
