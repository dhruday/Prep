# 21. Implement LRU Cache (Map + Doubly Linked List)
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"An LRU Cache — Least Recently Used — evicts the least recently accessed item when the cache is at capacity. The key insight is that both `get` and `put` must run in O(1) time. A plain `Map` gives O(1) lookup but not O(1) eviction of the least-recently-used item. The solution is a combination of two data structures: a `Map` for O(1) key lookup, and a doubly linked list to maintain access order — most recently used at the head, least recently used at the tail. On `get`, we look up the node via the Map and move it to the head (mark as most recently used). On `put`, we add a new node to the head; if we're over capacity, we evict the tail node and remove its key from the Map. Every operation is O(1). In practice, JavaScript's built-in `Map` preserves insertion order, so for a simpler implementation you can use Map ordering tricks — but the doubly linked list approach is the correct answer for system design and interview contexts because it generalizes to other eviction policies."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The caching motivation:**
```
Without cache:
  computeTilePermissions(tileId)  → database call (20ms)
  called 200 times per page load  → 4000ms wasted on repeated work

With LRU cache (capacity = 50):
  First call for tileId? → compute, store (20ms)
  Next 199 calls same tileId? → cache hit (< 1ms)
  Cache at 50 entries, new tileId comes in? → evict LEAST recently used
  Most recently used tiles stay hot → hit rate > 90% for typical patterns
```

**Why LRU specifically?**
LRU is optimal when access patterns exhibit temporal locality — recently accessed items are likely to be accessed again soon. For a Fiori tile dashboard (SAP), users typically interact with the same ~5-10 tiles. An LRU of capacity 50 keeps all those hot. Other policies (LFU, LIRS, ARC) exist for different workloads, but LRU is the default and is sufficient for most frontend caching needs.

---

### Data Structure Architecture

```
LRU Cache internals:

  Map (for O(1) key lookup):
    key → Node (pointer to a node in the doubly linked list)

  Doubly Linked List (for O(1) order maintenance):
    HEAD ↔ [most recently used] ↔ ... ↔ [least recently used] ↔ TAIL

  Sentinel nodes:
    head (dummy) — always at the front, never an actual cache entry
    tail (dummy) — always at the back, next eviction target = tail.prev

  Why doubly linked? 
    To remove a node from the middle, need both:
      node.prev.next = node.next  (forward pointer)
      node.next.prev = node.prev  (backward pointer)
    Singly linked: can't get node.prev in O(1) without traversal
```

**Visual state transitions:**

```
Initial state (capacity = 3):
  HEAD ↔ TAIL  (empty)

After put('A', 1):
  HEAD ↔ [A:1] ↔ TAIL

After put('B', 2):
  HEAD ↔ [B:2] ↔ [A:1] ↔ TAIL

After put('C', 3):
  HEAD ↔ [C:3] ↔ [B:2] ↔ [A:1] ↔ TAIL

After get('A') — 'A' moves to head:
  HEAD ↔ [A:1] ↔ [C:3] ↔ [B:2] ↔ TAIL

After put('D', 4) — capacity hit, evict tail.prev = 'B':
  HEAD ↔ [D:4] ↔ [A:1] ↔ [C:3] ↔ TAIL
  'B' evicted (LRU), 'D' inserted at head (MRU)
```

---

### Algorithm: `get(key)` — O(1)

```
1. Look up key in Map → get Node (or null)
2. If null → return -1 (cache miss)
3. If found:
   a. Remove node from its current position in the list: 
        node.prev.next = node.next
        node.next.prev = node.prev
   b. Insert node at head:
        node.next = head.next
        node.prev = head
        head.next.prev = node
        head.next = node
   c. Return node.value
```

### Algorithm: `put(key, value)` — O(1)

```
1. Look up key in Map:
   a. If EXISTS → update value, MOVE node to head (same as get step 3)
   b. If NEW:
      i. Create new Node(key, value)
      ii. Insert at head
      iii. Map.set(key, node)
      iv. this.size++
      v. If this.size > capacity:
           Evict: 
             evicted = tail.prev  (LRU node)
             Remove from list: evicted.prev.next = tail; tail.prev = evicted.prev
             Map.delete(evicted.key)
             this.size--
```

**Key implementation detail — sentinel nodes:**
Using dummy head and tail nodes eliminates all null-pointer edge cases. When inserting at head: `newNode.next = head.next; head.next = newNode` always works because `head.next` is never null (it's either another node or the tail). Same for removal — `tail.prev` is always a valid node (or the head when empty).

---

### JavaScript `Map` Iteration Order Trick

JavaScript's `Map` preserves insertion order and is iterable in insertion order. This enables a simpler LRU implementation:

```
Simple Map-based LRU (valid but less generalizable):
  
  get(key):
    if (!map.has(key)) return -1;
    const value = map.get(key)!;
    map.delete(key);    // remove
    map.set(key, value); // re-insert → now at END of iteration order
    return value;

  put(key, value):
    if (map.has(key)) map.delete(key); // remove old entry
    map.set(key, value);               // insert at END (most recently used)
    if (map.size > capacity) {
      // First key of map = least recently used = beginning of insertion order
      map.delete(map.keys().next().value);
    }
```

**Pros:** Extremely concise (~15 lines). **Cons:** Relies on Map insertion order (JavaScript-specific), not as educational for interviews, less generalizable to LFU or other caches. Interviewers expecting doubly linked list implementation will note the difference.

---

### Production Extensions

```typescript
// LRU with TTL (time-to-live per entry):
interface NodeWithTTL<K, V> {
  key: K;
  value: V;
  expiresAt: number; // Date.now() + ttlMs
}

get(key: K): V | null {
  if (!this.map.has(key)) return null;
  const node = this.map.get(key)!;
  if (Date.now() > node.expiresAt) {
    this.remove(node);
    this.map.delete(key);
    return null; // expired
  }
  this.moveToHead(node);
  return node.value;
}

// LRU with hit/miss statistics:
interface Stats { hits: number; misses: number; evictions: number; }
```

---

### Architecture: Browser Caching System Analogy

```
HTTP Cache (browser) uses LRU-like principles:
  Cache-Control: max-age=3600 → TTL
  Memory cache (in-browser) → LRU of parsed resources
  Disk cache → LFU/LRU hybrid

CPU L1/L2/L3 cache → LRU set-associative caching
  Same principle our LRU implements, in hardware

Frontend application examples:
  SAP Fiori: tile permission cache (LRU<tileId, permissions[]>)
  React Query: query result cache (LRU of query keys → data)
  Apollo GraphQL: normalized entity cache (not pure LRU, but eviction concepts apply)
  Next.js: ISR (Incremental Static Regeneration) — page-level LRU + TTL
```

---

### Performance & Complexity

| Operation | LRU Cache (doubly-linked list + Map) | Simple array/object cache | Why |
|---|---|---|---|
| `get(key)` | O(1) | O(1) lookup, O(n) reorder | Map lookup + pointer rewiring |
| `put(key, value)` | O(1) | O(1) insert, O(n) eviction | Map + pointer rewiring |
| Space | O(capacity) | O(capacity) | n nodes + n Map entries |

---

### ⚠️ Anti-Patterns & Pitfalls

- **Using Array for the doubly linked list** — `array.splice(index, 1)` is O(n) and defeats the purpose. The doubly linked list gives O(1) remove because each node has pointers to prev and next.

- **Not handling the `put` of an existing key** — If you `put('A', newValue)` and 'A' already exists, you must: update the value AND move the node to head (it was just accessed/updated → MRU). Bug if you only update value without moving.

- **Off-by-one in capacity check** — Check `if (this.size > capacity)` AFTER incrementing size and adding the new node. Evict the tail.prev node (LRU). If you evict tail itself (the sentinel dummy node), you've corrupted the list.

- **Not storing the key in the Node** — During eviction you need to remove the key from the Map: `map.delete(tail.prev.key)`. Forgetting to store `key` in the Node means you can't perform this deletion.

- **Forgetting to handle capacity of 0 or 1** — Edge cases: capacity 0 means every `put` immediately evicts. Capacity 1 means each `put` replaces the only entry.

---

## 🏭 3. Real-World Examples

**SAP Fiori — Tile Permission Cache:**

SAP Fiori Launchpad renders hundreds of tiles on the home page. Each tile has permission checks (canRead, canEdit, canAdmin). These permissions are fetched from the backend and are expensive (authorization service calls). An LRU cache of capacity 100 keyed by `${tileId}:${userId}` means repeated navigation to the same tiles costs nothing after first load. The LRU eviction ensures permissions for old tiles (ones the user never returns to) don't occupy memory indefinitely, while permissions for the user's 5-10 favorite tiles remain hot.

**React Query & Apollo Client — query caching:**

React Query uses an LRU-like cache keyed by serialized query keys. When `gcTime` (formerly `cacheTime`) passes and the query has no active subscribers, it becomes eligible for eviction. Apollo Client's `InMemoryCache` normalizes entities by `__typename:id` and uses a similar MRU ordering for garbage collection. These libraries implement production-quality LRU so you don't have to — but understanding the internals is required to tune `maxSize`, `staleTime`, and `gcTime` effectively.

**Microsoft Azure SDK — HTTP response cache:**

The Azure SDK for JavaScript uses an LRU cache internally for access tokens and service discovery results. Access tokens are valid for ~3600 seconds; frequently used tokens stay in cache, reducing redundant `POST /oauth2/token` calls. The LRU cap prevents unbounded growth when the SDK manages tokens for many identities.

**Cisco WebEx — thumbnail/avatar cache:**

WebEx caches participant avatar images in an LRU keyed by `participantId:resolution`. In a large meeting (100+ participants), the visible participants (grid view, active speaker view) are MRU entries that stay in cache. Off-screen participants gradually move toward LRU and get evicted. Re-entering video causes a cache miss and re-fetches — the tradeoff is acceptable bandwidth cost vs. unbounded memory for all participant images.

---

## 💬 4. Interview Execution

### Sample Answer (live coding framing)

> "LRU Cache requires O(1) get and O(1) put. A Map alone gives me O(1) lookup but can't efficiently tell me 'which entry was least recently used without scanning all entries.' A doubly linked list maintains access order — I keep MRU at the head, LRU at the tail. Together they give me O(1) everything. I'll use dummy head and tail sentinel nodes to eliminate null-pointer edge cases in my pointer rewiring code. Each node stores both the key (for Map deletion during eviction) and the value."

---

### Likely Follow-up Questions

1. **Why doubly linked and not singly linked?** → I need to remove a node from the middle of the list in O(1). For that I need to update `node.prev.next` — the pointer of the predecessor. A singly linked list doesn't give me `node.prev` without traversal from head. Doubly linked means each node has both `prev` and `next`, enabling O(1) removal from any position.

2. **Why sentinel (dummy) nodes?** → Without sentinel nodes, inserting at head when list is empty and removing the last node require special-case null checks. Sentinel head and tail are always present — they're never evicted, never returned as real nodes. Code is simpler and less bug-prone.

3. **What if two different keys are put with my capacity at limit?** → For each new `put` of a key not in the cache: create node, insert at head, increment size, then check if `size > capacity` → evict `tail.prev` (the LRU), delete its key from Map, decrement size. Final size = capacity.

4. **How would you extend this to support TTL (expiration)?** → Add an `expiresAt: number` field to each node. In `get`, after the Map lookup, check `Date.now() > node.expiresAt` — if expired, remove the node and return null/miss. In `put`, accept an optional `ttlMs` argument and set `expiresAt = Date.now() + ttlMs`.

5. **Can you implement LFU (Least Frequently Used) similarly?** → LFU is harder. It needs a frequency counter per key and the ability to find the key with minimum frequency in O(1). The standard O(1) LFU uses two Maps: `key → {value, freq}` and `freq → Set<key>` (ordered), plus a `minFreq` pointer. More complex than LRU but uses similar data structure reasoning.

---

### vs Alternatives

| LRU Cache | `Map` alone | WeakMap | `Object` | Choose when |
|---|---|---|---|---|
| O(1) get + eviction | O(1) get, no eviction | Auto-eviction by GC | O(1) get, no eviction | LRU: bounded memory + access order |
| Bounded size | Unbounded growth | Size unknown | Unbounded | LRU: must limit memory |
| Explicit control | Memory leak risk | No size control | Memory leak risk | LRU: production caching |
| More code | Trivial | Trivial | Trivial | Others: prototype/throw-away caching |

---

### How to Signal Senior Thinking

> "Beyond the data structure itself, the production question is: *what's your eviction policy for distributed state?* For a single browser tab, Map-based LRU works fine. For server-side rendering (Next.js), you need either a per-request cache (no eviction needed — request ends, cache garbage collected) or a shared in-process cache (LRU, but shared state is dangerous in serverless where you want stateless functions). For a Redis-backed shared cache (Salesforce's scale), you'd use Redis's built-in `maxmemory-policy allkeys-lru`. Understanding when NOT to implement a custom LRU — and when to delegate to Redis — is the senior signal."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: Full LRU Cache — doubly linked list + Map (O(1) all ops)
// ============================================================

interface LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
}

class LRUCache<K = number, V = number> {
  private capacity: number;
  private map: Map<K, LRUNode<K, V>>;
  private head: LRUNode<K, V>; // dummy head (MRU side)
  private tail: LRUNode<K, V>; // dummy tail (LRU side)

  constructor(capacity: number) {
    if (capacity <= 0) throw new Error('Capacity must be positive');
    this.capacity = capacity;
    this.map = new Map();

    // Sentinel nodes — never hold real data, eliminate null-check edge cases
    this.head = { key: null as unknown as K, value: null as unknown as V, prev: null, next: null };
    this.tail = { key: null as unknown as K, value: null as unknown as V, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: K): V | -1 {
    const node = this.map.get(key);
    if (!node) return -1; // cache miss
    this.moveToHead(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);

    if (existing) {
      existing.value = value;    // update value
      this.moveToHead(existing); // mark as most recently used
      return;
    }

    // New entry
    const node: LRUNode<K, V> = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.addToHead(node);

    if (this.map.size > this.capacity) {
      const evicted = this.removeTail(); // LRU node
      this.map.delete(evicted.key);
    }
  }

  // --- Private helpers ---

  private addToHead(node: LRUNode<K, V>): void {
    // Insert between head and head.next
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  private removeNode(node: LRUNode<K, V>): void {
    // Unlink from doubly linked list
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private moveToHead(node: LRUNode<K, V>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): LRUNode<K, V> {
    const lruNode = this.tail.prev!; // actual LRU node
    this.removeNode(lruNode);
    return lruNode;
  }

  // --- Utility ---
  get size(): number { return this.map.size; }
  
  has(key: K): boolean { return this.map.has(key); }
  
  peek(key: K): V | undefined {
    // Read without updating recency order (useful for debugging/stats)
    return this.map.get(key)?.value;
  }

  // Returns keys from MRU → LRU order
  keys(): K[] {
    const result: K[] = [];
    let cur = this.head.next;
    while (cur !== this.tail) {
      result.push(cur!.key);
      cur = cur!.next;
    }
    return result;
  }
}

// ============================================================
// DEMO 2: Test & walkthrough
// ============================================================

const cache = new LRUCache<number, string>(3);

cache.put(1, 'A'); // HEAD ↔ [1:A] ↔ TAIL
cache.put(2, 'B'); // HEAD ↔ [2:B] ↔ [1:A] ↔ TAIL
cache.put(3, 'C'); // HEAD ↔ [3:C] ↔ [2:B] ↔ [1:A] ↔ TAIL

console.log(cache.get(1));    // 'A'  — moves 1 to head
// HEAD ↔ [1:A] ↔ [3:C] ↔ [2:B] ↔ TAIL

cache.put(4, 'D');            // capacity exceeded → evict LRU (tail.prev = 2:B)
// HEAD ↔ [4:D] ↔ [1:A] ↔ [3:C] ↔ TAIL, key 2 evicted
console.log(cache.get(2));    // -1 (evicted)
console.log(cache.get(3));    // 'C' — moves 3 to head
// HEAD ↔ [3:C] ↔ [4:D] ↔ [1:A] ↔ TAIL

console.log(cache.keys());    // [3, 4, 1] (MRU → LRU)

// update existing key:
cache.put(1, 'A_updated');    // updates value, moves 1 to head
// HEAD ↔ [1:A_updated] ↔ [3:C] ↔ [4:D] ↔ TAIL
console.log(cache.get(1));    // 'A_updated'

// ============================================================
// DEMO 3: Simple Map-based LRU (interview shortcut, ~15 lines)
// ============================================================

class SimpleMapLRU<K, V> {
  private map = new Map<K, V>();

  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key)!;
    // Trick: delete and re-insert → moves to end of Map iteration order = MRU
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  put(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key); // remove old position
    this.map.set(key, value); // insert at end = MRU
    if (this.map.size > this.capacity) {
      // First key in Map = oldest inserted = LRU
      this.map.delete(this.map.keys().next().value);
    }
  }
}

// ============================================================
// DEMO 4: SAP-inspired tile permission cache
// ============================================================

interface TilePermission {
  canRead: boolean;
  canEdit: boolean;
  canAdmin: boolean;
}

class TilePermissionCache {
  private cache = new LRUCache<string, TilePermission>(100);
  private hits = 0;
  private misses = 0;

  async getPermission(tileId: string, userId: string): Promise<TilePermission> {
    const cacheKey = `${tileId}:${userId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached !== -1) {
      this.hits++;
      return cached;
    }

    this.misses++;
    // Cache miss → fetch from authorization service
    const perms = await this.fetchFromAuthService(tileId, userId);
    this.cache.put(cacheKey, perms);
    return perms;
  }

  private async fetchFromAuthService(
    tileId: string, userId: string
  ): Promise<TilePermission> {
    // Simulated: real impl calls SAP authorization API
    return { canRead: true, canEdit: false, canAdmin: false };
  }

  get hitRate(): string {
    const total = this.hits + this.misses;
    return total === 0 ? '0%' : `${((this.hits / total) * 100).toFixed(1)}%`;
  }
}
```

**Interview vs Production difference:**
- **Interview:** Demo 1 — write the doubly linked list + Map LRU from scratch. The sentinel nodes, `addToHead` / `removeNode` / `moveToHead` helpers, and "key must be in node for eviction" are the key insights examiners look for.
- **Production:** Demo 3 (SimpleMapLRU) is often sufficient for application-level caching. Demo 4 shows real integration. LeetCode #146 is the canonical interview problem this maps to — get both `get` and `put` to O(1) runtime.

---

## 🧠 6. Memory Aid

**Mental Model:** An LRU cache is like a VIP line at a club. The most recently active guests are at the front (head). When a guest arrives but the club is full, the guest who's been idle the longest (at the tail) gets moved out. A Map is the bouncer's clipboard for instant name lookup; the doubly linked list is the physical queue that tracks access order.

**If you go blank:** *"LRU = Map for O(1) lookup + doubly linked list for O(1) order. Sentinel head (MRU) and tail (LRU). get: lookup Map → move to head. put: add to head → if over capacity, remove tail.prev and delete its key from Map. KEY: store key IN the Node so eviction can remove from Map."*

**Mnemonic:** **MESH-TAIL** — **M**ap (lookup), **E**xisting key? update + move to head, **S**entinel nodes (dummy head/tail), **H**ead = MRU; **T**ail = LRU, **A**dd to head on put, **I**f over capacity → evict, **L**RU node key stored for Map deletion.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Caching eliminates redundant computation and network requests. At SAP, LRU-caching tile permissions reduced the average page load authorization cost from 20+ parallel API calls to < 2 on repeat navigation — a measurable improvement in Fiori Launchpad time-to-interactive.
→ **Performance:** O(1) get and put are non-negotiable for hot-path caching. A naive array-based cache at O(n) eviction degrades proportionally with cache size; the doubly linked list + Map solution is constant regardless of capacity.
→ **Business:** LRU Cache is LeetCode's most popular Hard-level question and appears in nearly every senior frontend/full-stack interview at Microsoft, Amazon, Google, and Cisco. Beyond interviews, React Query, Apollo Client, and the browser HTTP cache all implement LRU principles. Understanding data structure internals enables developers to correctly configure and extend these caching layers.

**How it works (3 sentences):**
An LRU Cache combines a `Map<K, Node<K,V>>` for O(1) key-to-node lookup and a doubly linked list to track access order — the head sentinel demarcates the MRU side and the tail sentinel the LRU side, with actual cache nodes always between them. `get(key)` retrieves the node via Map, moves it to the head (re-marking it as most recently used), and returns its value; `put(key, value)` either updates and head-moves an existing node or creates a new head node, then evicts `tail.prev` (the LRU node) and removes its key from the Map if size exceeds capacity. Both operations are O(1) because Map lookup is hash-based O(1) and doubly linked list node removal and insertion are pointer-rewiring O(1) operations that require no traversal.

**Company relevance:**
- **Microsoft:** LRU is the canonical O(1) cache question in Microsoft SDE2/SDE3 interviews. Azure SDK uses LRU for access token and service metadata caching. VS Code uses bounded caches for filesystem watcher data, extension output, and search results.
- **Adobe:** Adobe Creative Cloud's thumbnail and preview cache uses LRU — recently opened assets stay hot, older ones are evicted from memory. Lightroom's metadata cache (LRDB) applies similar principles at the application layer.
- **Salesforce:** Salesforce's Apex data cache and LWC component registry both use LRU-type eviction. The Salesforce Experience Cloud CDN uses LRU for edge-cached page variants.
- **Cisco:** WebEx's video frame buffer pool uses bounded LRU for decoded video frames — the most recently decoded frames stay in memory for scrubbing/replay; older frames are evicted as frame count grows.

---

✅ **Topic 21/486 complete.**

---

# ✅ SEQ 1 COMPLETE — 21/486 topics done.

**Sequence 1: JavaScript Engine & Runtime** — all 21 topics generated:

| # | Topic | File |
|---|---|---|
| 1 | JavaScript Execution Model | `01_JavaScript_Execution_Model.md` |
| 2 | Event Loop — Microtasks vs Macrotasks | `02_Event_Loop_Microtasks_vs_Macrotasks.md` |
| 3 | Main Thread vs Worker Threads | `03_Main_Thread_vs_Worker_Threads.md` |
| 4 | Call Stack, Task Queue, Microtask Queue | `04_Call_Stack_Task_Queue_Microtask_Queue.md` |
| 5 | Closures — Scope Chain, Lexical Environment | `05_Closures_Scope_Chain_Lexical_Environment.md` |
| 6 | Prototypal Inheritance — Prototype Chain | `06_Prototypal_Inheritance_Prototype_Chain.md` |
| 7 | this Keyword — All 4 Contexts | `07_this_Keyword_All_4_Contexts.md` |
| 8 | Hoisting — var vs let vs const vs function | `08_Hoisting_var_let_const_function.md` |
| 9 | Garbage Collection & Memory Leaks | `09_Garbage_Collection_Memory_Leaks.md` |
| 10 | Promises Internals | `10_Promises_Internals.md` |
| 11 | async/await Internals | `11_Async_Await_Internals.md` |
| 12 | Promise.all / race / allSettled / any | `12_Promise_Combinators.md` |
| 13 | Generators and Iterators | `13_Generators_and_Iterators.md` |
| 14 | AbortController & Request Cancellation | `14_AbortController_Request_Cancellation.md` |
| 15 | Implement debounce | `15_Implement_Debounce.md` |
| 16 | Implement throttle | `16_Implement_Throttle.md` |
| 17 | Implement curry, memoize, once, pipe | `17_Implement_Curry_Memoize_Once_Pipe.md` |
| 18 | Implement Deep Clone & Deep Equal | `18_Implement_Deep_Clone_and_Deep_Equal.md` |
| 19 | Implement Promise combinators from scratch | `19_Implement_Promise_Combinators_From_Scratch.md` |
| 20 | Implement EventEmitter / Pub-Sub | `20_Implement_EventEmitter_PubSub.md` |
| 21 | Implement LRU Cache | `21_Implement_LRU_Cache.md` |

---

**Say GO to start SEQ 2: Browser & Web Platform Internals**
