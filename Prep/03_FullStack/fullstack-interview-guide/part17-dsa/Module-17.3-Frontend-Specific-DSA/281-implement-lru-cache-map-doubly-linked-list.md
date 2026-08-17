# Implement LRU Cache — Map + Doubly Linked List
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **LRU = Least Recently Used**: when the cache is full and a new item arrives, evict the item that was LEAST recently accessed (either read or written); the assumption is that recently used items are more likely to be used again
- **The data structure**: HashMap + Doubly Linked List; HashMap gives O(1) get/put by key; doubly linked list tracks usage order — most recent at the HEAD, least recent at the TAIL; when a node is accessed, MOVE IT TO THE HEAD; when evicting, REMOVE FROM TAIL
- **Two dummy sentinel nodes** (head and tail pointers): avoid special-casing empty list and single-element list; `head.next` = most recently used (MRU); `tail.prev` = least recently used (LRU); all real nodes sit between head and tail
- **Three operations, all O(1)**: get(key) — HashMap lookup + move-to-head; put(key, val) on hit — update value + move-to-head; put(key, val) on miss — create node, add to head + add to HashMap; if over capacity → remove from tail + remove from HashMap
- **Java shortcut**: `LinkedHashMap` with `accessOrder=true` and an overridden `removeEldestEntry`; BUT interviewers often ask for the manual implementation — know THIS one
- **Eviction edge case**: when the cache has capacity=1, a put with a NEW key must evict the existing single entry; sentinel head/tail nodes handle this automatically with no extra code

---

## 1. One-Line Definition
An LRU Cache is a fixed-capacity key-value store that evicts the least recently accessed entry whenever a new entry would exceed capacity, implemented with a HashMap (for O(1) lookup) and a doubly linked list (for O(1) order tracking and eviction).

---

## 2. The Problem It Solves

A simple HashMap cache grows without bound — eventually consuming all memory. A pure doubly linked list provides ordering but requires O(n) search to find a key. LRU combines both structures:

- HashMap handles "does key X exist, and where is its node?" in O(1)
- Doubly linked list handles "what's the current order, what's the LRU, move this node to front" in O(1)

Neither data structure alone achieves O(1) for all operations. Together they do.

Real use cases:
- Browser back/forward page cache (most recently visited pages stay warm)
- React's component rendering cache for memoised selectors
- Spring Boot `@Cacheable` — the underlying implementation for bounded caches
- Redis has LRU and LFU eviction policies configurable as server settings

---

## 3. How It Works Internally

### Data Structure Diagram

```
capacity = 3

After put(1, A), put(2, B), put(3, C):

HashMap:  { 1→Node1, 2→Node2, 3→Node3 }

DoublyLinkedList:
  [HEAD] ↔ [Node3:C] ↔ [Node2:B] ↔ [Node1:A] ↔ [TAIL]
              ↑ MRU (most recently used)       ↑ LRU

get(1):  HashMap finds Node1 → move Node1 to head
  [HEAD] ↔ [Node1:A] ↔ [Node3:C] ↔ [Node2:B] ↔ [TAIL]
              ↑ MRU

put(4, D): cache full, evict LRU = tail.prev = Node2
  Remove Node2 from list; remove key 2 from HashMap
  Add Node4, insert at head
  [HEAD] ↔ [Node4:D] ↔ [Node1:A] ↔ [Node3:C] ↔ [TAIL]

HashMap: { 1→Node1, 3→Node3, 4→Node4 }
```

### Why Doubly Linked (Not Singly)?

To remove a node in O(1), you need to update BOTH its predecessor's `next` pointer and its successor's `prev` pointer. With only a singly linked list, finding the predecessor requires O(n) traversal. Doubly linked list makes node removal O(1) since each node knows its predecessor directly.

---

## 4. The Code

### Wrong Way — Classic Bugs

```java
// ❌ WRONG 1: Using only a HashMap — no eviction order, O(n) to find LRU

class LRUCache {
    private final int capacity;
    private final Map<Integer, Integer> map = new HashMap<>();
    private final Queue<Integer> accessOrder = new LinkedList<>();  // ❌ wrong choice
    
    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        accessOrder.remove(key);  // ❌ O(n) — must scan the entire queue to find key
        accessOrder.offer(key);   // ← re-add to tail
        return map.get(key);
    }
    
    public void put(int key, int value) {
        if (map.containsKey(key)) {
            accessOrder.remove(key);  // ❌ O(n) again
        } else if (map.size() == capacity) {
            int lru = accessOrder.poll();  // ← front = LRU, this part is fine
            map.remove(lru);
        }
        map.put(key, value);
        accessOrder.offer(key);
    }
}
// ❌ get and put are O(n) due to queue.remove(key) scan
// ❌ Does NOT meet the O(1) requirement
```

```java
// ❌ WRONG 2: Not moving a node on get (access order broken)

class LRUCacheWrong {
    // ... HashMap + doubly linked list ...
    
    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        // ❌ Reads the node but does NOT move it to the head
        // The node's position in the list doesn't change
        // So this "recently accessed" item might be evicted soon — wrong LRU semantics
        return map.get(key).val;
    }
}
```

```java
// ❌ WRONG 3: Forgetting to remove old node from list on put(key, existingKey)

class LRUCacheWrong {
    public void put(int key, int value) {
        if (!map.containsKey(key)) {  // ← only handles the "new key" case
            if (map.size() == capacity) evictLRU();
            createAndInsertNode(key, value);
        } else {
            // ❌ Missing: for an existing key, must REMOVE the old node from its current position
            // then RE-INSERT it at the head
            // Without removal, the old node stays in its old position AND a new node is added at head
            // → duplicate entries for the same key in different list positions
            // → when evicting, one "ghost" node remains; HashMap lookup points to wrong node
            Node n = new Node(key, value);
            addToHead(n);
            map.put(key, n);
        }
    }
}
```

### Right Way — Full O(1) Implementation

```java
// ✅ CORRECT LRU CACHE with HashMap + Doubly Linked List

class LRUCache {
    
    // ✅ Node: doubly linked with key (needed for HashMap removal on evict)
    private static class Node {
        int key, val;
        Node prev, next;
        Node(int key, int val) { this.key = key; this.val = val; }
    }
    
    private final int capacity;
    private final Map<Integer, Node> map;   // key → Node (O(1) lookup)
    private final Node head;                 // dummy: head.next = MRU
    private final Node tail;                 // dummy: tail.prev = LRU
    
    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        
        // ✅ Sentinel nodes — no null checks in add/remove operations
        head = new Node(0, 0);
        tail = new Node(0, 0);
        head.next = tail;
        tail.prev = head;
    }
    
    // ✅ Get: O(1) — lookup + move to head
    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        
        Node node = map.get(key);
        moveToHead(node);    // ✅ update access order — recently used → head
        return node.val;
    }
    
    // ✅ Put: O(1) — update/insert + evict if over capacity
    public void put(int key, int value) {
        if (map.containsKey(key)) {
            // ✅ Existing key: update value + move to head
            Node node = map.get(key);
            node.val = value;
            moveToHead(node);
        } else {
            // ✅ New key: create node, add to head
            Node node = new Node(key, value);
            map.put(key, node);
            addToHead(node);
            
            // ✅ Over capacity: evict LRU (tail.prev)
            if (map.size() > capacity) {
                Node lru = tail.prev;  // ← tail.prev is the least recently used node
                removeNode(lru);
                map.remove(lru.key);   // ← lru.key is why Node stores the key
            }
        }
    }
    
    // ✅ Helper: remove a node from its current position in the doubly linked list
    private void removeNode(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    // ✅ Helper: insert a node right after the dummy head (= MRU position)
    private void addToHead(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
    
    // ✅ Helper: move an existing node to the head (remove then insert at head)
    private void moveToHead(Node node) {
        removeNode(node);
        addToHead(node);
    }
}
// Time: O(1) for get and put
// Space: O(capacity) — at most capacity nodes in the list and map
```

```java
// ✅ Java shortcut: LinkedHashMap (know this alternative, but show the manual impl in interviews)

class LRUCacheSimple {
    private final LinkedHashMap<Integer, Integer> cache;
    
    public LRUCacheSimple(int capacity) {
        // ✅ LinkedHashMap with accessOrder=true: get() and put() update access order
        cache = new LinkedHashMap<>(capacity, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
                return size() > capacity;  // ✅ auto-evict LRU when over capacity
            }
        };
    }
    
    public int get(int key) {
        return cache.getOrDefault(key, -1);
    }
    
    public void put(int key, int value) {
        cache.put(key, value);
    }
}
// ✅ Works correctly; O(1) amortised for get/put
// ❌ Interviewers expect the manual Node + DLL implementation to test your understanding
```

```typescript
// ✅ TypeScript LRU Cache — same structure, TypeScript types

class LRUCacheTS {
    private capacity: number;
    private map: Map<number, { key: number; val: number; prev: any; next: any }>;
    private head: { key: number; val: number; prev: any; next: any };
    private tail: { key: number; val: number; prev: any; next: any };
    
    constructor(capacity: number) {
        this.capacity = capacity;
        this.map = new Map();
        this.head = { key: 0, val: 0, prev: null, next: null };  // dummy head
        this.tail = { key: 0, val: 0, prev: null, next: null };  // dummy tail
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }
    
    get(key: number): number {
        if (!this.map.has(key)) return -1;
        const node = this.map.get(key)!;
        this.moveToHead(node);
        return node.val;
    }
    
    put(key: number, value: number): void {
        if (this.map.has(key)) {
            const node = this.map.get(key)!;
            node.val = value;
            this.moveToHead(node);
        } else {
            const node = { key, val: value, prev: null as any, next: null as any };
            this.map.set(key, node);
            this.addToHead(node);
            if (this.map.size > this.capacity) {
                const lru = this.tail.prev;
                this.removeNode(lru);
                this.map.delete(lru.key);
            }
        }
    }
    
    private removeNode(node: any): void {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    private addToHead(node: any): void {
        node.next = this.head.next;
        node.prev = this.head;
        this.head.next.prev = node;
        this.head.next = node;
    }
    
    private moveToHead(node: any): void {
        this.removeNode(node);
        this.addToHead(node);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why do you store the key in the Node, not just the value?"

**Hruday's answer:**
> When evicting the LRU entry, I remove `tail.prev` from the doubly linked list. But I also need to remove its entry from the HashMap. To call `map.remove(key)`, I need the key.
>
> If the Node only stored the value, I'd have no way to look up which key to remove from the HashMap given just the node reference. I'd have to scan the entire HashMap to find the entry pointing to this node — that's O(n), breaking the O(1) guarantee.
>
> Storing the key in the Node means eviction is two O(1) operations: `removeNode(tail.prev)` and `map.remove(tail.prev.key)`. The tiny extra storage per node (one integer) pays for the O(1) eviction.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why use sentinel (dummy) head and tail nodes instead of just null pointers?"

**Hruday's answer:**
> Without sentinels, every `addToHead` and `removeNode` operation needs special cases for when the list is empty or the node being removed is the first or last real node.
>
> For example, when removing the only real node: its `prev` is `head` (null if no sentinel) and its `next` is `tail` (null if no sentinel). I'd need `if (node.prev != null) node.prev.next = node.next; else head = node.next;` — doubled branching for every operation.
>
> With sentinel head and tail: `head.next` always points to the MRU node (or `tail` if empty), and `tail.prev` always points to the LRU node (or `head` if empty). Every `removeNode` call is the same two-line pointer update regardless of position. Every `addToHead` is the same four-line update. No null checks, no branches — clean O(1) with no edge cases to worry about under pressure.

---

### Q3 — Application
**Interviewer asks:** "How would you extend this to an LFU (Least Frequently Used) cache?"

**Hruday's answer:**
> LFU is more complex than LRU. Instead of ordering by recency, I order by frequency — the item with the FEWEST accesses is evicted. Among items with equal frequency, the LEAST RECENTLY USED among them is evicted.
>
> The standard O(1) LFU implementation uses three HashMaps:
> - `keyToVal`: key → value
> - `keyToFreq`: key → current access frequency
> - `freqToKeys`: frequency → ordered set (LinkedHashSet in Java) of keys at that frequency
>
> And a `minFreq` variable tracking the current minimum frequency.
>
> On `get(key)`: increment frequency, move key from `freqToKeys[oldFreq]` to `freqToKeys[newFreq]`. If `minFreq` bucket becomes empty, increment `minFreq`.
>
> On `put(key, val)`: if at capacity, evict the OLDEST key in `freqToKeys[minFreq]` (LinkedHashSet keeps insertion order = LRU within the same frequency). Then insert the new key at frequency 1 and set `minFreq = 1`.
>
> Much more complex than LRU; I default to LRU unless the problem explicitly requires frequency-based eviction.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Using a HashMap + Queue/List for O(n) LRU | "I can sort by timestamp or use a priority queue" | A priority queue gives O(log n) per operation, which meets some requirements; a plain list scan is O(n); but the LRU cache problem SPECIFICALLY requires O(1) for both get and put — any approach that doesn't combine HashMap with doubly linked list fails this requirement; sentinels + DLL is the only way to achieve O(1) without language-provided LinkedHashMap |
| Forgetting to update access order on GET | "I update the order on PUT but GET is just a read" | LRU = Least RECENTLY USED — "recently used" includes reads; a cache entry accessed via GET must move to the MRU position otherwise it can be evicted even though it was just used, which violates LRU semantics; a node that is read 1,000 times but never written should be the LAST item evicted, not the first |
| `addToHead` pointer update order | "I'll just set the four pointers for addToHead in any order" | The four pointer updates in `addToHead` have a specific required order; updating `head.next` last is critical: `node.next = head.next` first (captures the current first real node), `node.prev = head`, `head.next.prev = node` (the old first node now points back to the new node), `head.next = node` (finally connect head to the new node); if `head.next = node` is done earlier, `head.next.prev = node` applies to the NEW node itself (self-loop), not the old first node |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a product details API that fetched from a slow external ERP system — 400ms per call. The product catalogue had 50,000 SKUs but only the top ~500 were used 95% of the time (power law distribution).
>
> I implemented an LRU cache in front of the ERP client: capacity 500, key = SKU ID, value = product detail response. Every cache hit saved 400ms. With the LRU eviction policy, the popular SKUs stayed warm while rarely-accessed products were evicted automatically.
>
> Cache hit rate stabilised at 91% within 30 minutes of a warm start. Average latency dropped from 400ms to 38ms (90th percentile). Total calls to ERP dropped by 91%.
>
> When I explained this in an interview, I described the HashMap + DLL implementation and why the O(1) constraint mattered — with 50,000 possible keys and 10,000 requests/minute, anything worse than O(1) per cache operation would have added measurable overhead."

---

## 8. Scale Evolution

**1,000 users →** In-process Java/TypeScript LRU cache. Single JVM instance. Fixed capacity set based on memory constraints. `LinkedHashMap` shortcut fine here; custom DLL when capacity is very large (> 100,000 entries) to save overhead.

**100,000 users →** Multiple service instances → in-process cache has per-instance state (cache misses in one instance aren't served by another instance's cache). Move to distributed cache (Redis with LRU eviction policy: `maxmemory-policy allkeys-lru`). Application-level LRU becomes a Redis client with `maxmemory` set.

**10 million users →** Cache stampede problem: when the LRU evicts a popular item, many requests miss simultaneously and all hit the database. Solutions: cache-aside with short jitter on TTL, or "thundering herd" prevention with a mutex lock on cache miss (only one request fetches, others wait). At this scale, LRU is often complemented with a separate hot-key cache tier (e.g., in-process LRU for top 100 items + Redis LRU for the next 10,000).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment gateway response caching — recently used gateway configs stay warm; merchant account details LRU cache to avoid ERP lookups; O(1) get/put required at payment throughput | O(1) constraint justification; production cache hit rate story |
| Swiggy / Meesho | Restaurant menu caching — most recently viewed restaurants stay warm; product recommendation LRU to avoid re-scoring; image URL → CDN URL mapping cache | High-access vs rarely-accessed item distribution; LRU hit rate |
| Adobe / Microsoft | "LRU Cache" is one of the MOST common Microsoft senior/SDE-II coding interviews — clean implementation expected in 20-25 minutes; both Java and TypeScript/JavaScript implementations possible | Sentinel node explanation; pointer order in addToHead; O(1) proof |
| SAP Labs | ERP product detail LRU (400ms → 38ms, 91% cache hit rate story); Spring Boot `@Cacheable` with bounded caffeine cache (built on LRU/LFU); production capacity sizing story | Concrete SAP production story; latency numbers; cache hit rate metric |

---

## 10. Related Topics — What to Study Next

- **Topic 282 — Implement EventEmitter / Pub-Sub** — event systems are another classic "implement from scratch" interview problem and appear frequently alongside LRU; both test your ability to build clean O(1) data structures with correct pointer management
- **Topic 283 — Implement Deep Clone and Deep Equal** — deep clone/equal rely on tree traversal (either DFS from topics 277-278 or iterative stack-based); both test structural thinking similar to pointer management in LRU
- **Topic 274 — Stacks / Queues / Monotonic Stack** — the doubly linked list in LRU is an ordered data structure; understanding the `ArrayDeque` and when to prefer it over `LinkedList` (LRU node pool) helps choose the right underlying data structure for bounded queue/deque use cases

---

*Part 17 · Implement LRU Cache · Full Stack Interview Guide · Hruday D · 2026*
