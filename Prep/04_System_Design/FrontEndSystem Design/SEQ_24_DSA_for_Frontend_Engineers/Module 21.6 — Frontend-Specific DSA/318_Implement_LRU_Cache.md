# 318 – Implement LRU Cache

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
LRU (Least Recently Used) Cache evicts the least recently accessed item when at capacity. Requires O(1) `get` and `put`. Implementation: **HashMap + Doubly Linked List**. Map gives O(1) lookup; DLL gives O(1) insert/delete for recency tracking.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
class DLLNode {
  key: number; value: number;
  prev: DLLNode | null = null; next: DLLNode | null = null;
  constructor(key: number, value: number) { this.key = key; this.value = value; }
}

class LRUCache {
  private capacity: number;
  private map = new Map<number, DLLNode>();
  private head = new DLLNode(0, 0); // dummy head (most recent)
  private tail = new DLLNode(0, 0); // dummy tail (least recent)

  constructor(capacity: number) {
    this.capacity = capacity;
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: number): number {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key)!;
    this.remove(node);
    this.addToFront(node);
    return node.value;
  }

  put(key: number, value: number): void {
    if (this.map.has(key)) {
      const node = this.map.get(key)!;
      node.value = value;
      this.remove(node);
      this.addToFront(node);
    } else {
      if (this.map.size === this.capacity) {
        const lru = this.tail.prev!;
        this.remove(lru);
        this.map.delete(lru.key);
      }
      const node = new DLLNode(key, value);
      this.addToFront(node);
      this.map.set(key, node);
    }
  }

  private addToFront(node: DLLNode): void {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  private remove(node: DLLNode): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }
}

// ──── SIMPLER VERSION USING MAP (ordered insertion) ────
class LRUCacheSimple {
  private cache = new Map<number, number>();
  constructor(private capacity: number) {}

  get(key: number): number {
    if (!this.cache.has(key)) return -1;
    const val = this.cache.get(key)!;
    this.cache.delete(key);   // remove
    this.cache.set(key, val); // re-insert (most recent)
    return val;
  }

  put(key: number, value: number): void {
    this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.capacity) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
  }
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"LRU Cache = HashMap + Doubly Linked List. Map stores key→node for O(1) lookup. DLL maintains recency order — most recent at head, least recent at tail. On get/put: move node to front. On eviction: remove tail.prev. Bonus: JS Map preserves insertion order, enabling a simpler implementation."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Cache API responses with LRU eviction
const apiCache = new LRUCacheSimple(50);
async function fetchWithCache(url: string): Promise<unknown> {
  const cached = apiCache.get(hashCode(url));
  if (cached !== -1) return cached;
  const response = await fetch(url);
  const data = await response.json();
  apiCache.put(hashCode(url), data);
  return data;
}
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
```

## 5. 🧠 MEMORY AID
**"LRU = Map (O(1) lookup) + DLL (O(1) recency). Get: move to front. Put: add to front, evict tail. Simple version: JS Map preserves order."**

## 6. 🎯 COMPLEXITY
Get/Put: O(1) | Space: O(capacity)
