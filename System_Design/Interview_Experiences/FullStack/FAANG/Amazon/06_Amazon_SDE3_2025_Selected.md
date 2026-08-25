# Amazon — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Senior SDE |
| **Level** | L6 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + LLD + HLD + Bar Raiser)
- **Timeline:** 2 weeks
- **Format:** Virtual (Loop)
- **Note:** L6 = more system design depth + strong LP with org-level impact

---

## Round 1: Coding + LP
**Duration:** 60 minutes

### Questions Asked
1. **LP (15 min): "Tell me about a time you hired and mentored someone"** (Hire and Develop the Best)
2. **Design Hit Counter** (LeetCode 362) — with follow-ups for distributed version
3. **Maximum Frequency Stack** (LeetCode 895)

### 💡 Interview-Ready Answer — Max Frequency Stack

```java
class FreqStack {
    Map<Integer, Integer> freq;        // val → frequency
    Map<Integer, Deque<Integer>> group; // frequency → stack of values
    int maxFreq;
    
    public FreqStack() {
        freq = new HashMap<>();
        group = new HashMap<>();
        maxFreq = 0;
    }
    
    public void push(int val) {
        int f = freq.merge(val, 1, Integer::sum);
        group.computeIfAbsent(f, k -> new ArrayDeque<>()).push(val);
        maxFreq = Math.max(maxFreq, f);
    }
    
    public int pop() {
        Deque<Integer> stack = group.get(maxFreq);
        int val = stack.pop();
        freq.merge(val, -1, Integer::sum);
        
        if (stack.isEmpty()) {
            group.remove(maxFreq);
            maxFreq--;
        }
        return val;
    }
}
// O(1) push and pop
```

---

## Round 2: System Design (HLD)
**Duration:** 60 minutes

### Questions Asked
1. **LP (10 min): "Tell me about a system you designed end-to-end"** (Ownership)
2. **Design Amazon's Real-Time Inventory Management System**
   - Across warehouses, stores, real-time stock during flash sales

### 💡 Interview-Ready Answer

```
Inventory Management at Scale:
┌──────────────────────────────────────────────────────────────┐
│  Challenge: Flash sale → 100K users trying to buy 500 items │
│  Solution: Inventory reservation with optimistic locking     │
│                                                                │
│  Write Path (Add to Cart → Reserve):                         │
│  1. User clicks "Add to Cart"                                │
│  2. Inventory Service: reserve(sku, qty, userId)             │
│  3. Redis DECR with Lua script (atomic):                     │
│     if redis.get(sku) >= qty then                            │
│       redis.decrby(sku, qty)                                 │
│       redis.setex(sku:reserve:userId, 600, qty) -- 10min TTL│
│       return SUCCESS                                          │
│     else return OUT_OF_STOCK                                  │
│  4. Reservation TTL = 10 minutes (cart timeout)              │
│  5. If user doesn't checkout → reservation expires           │
│     → Redis INCRBY restores inventory                        │
│                                                                │
│  Checkout Path:                                               │
│  1. Verify reservation still active                          │
│  2. Convert reservation → committed allocation               │
│  3. Write to DynamoDB (permanent record)                     │
│  4. Delete reservation from Redis                            │
│  5. Async: update warehouse picking queue                    │
└──────────────────────────────────────────────────────────────┘

Architecture:
┌──────────────────────────────────────────────────────────────┐
│  ┌──────────────────┐                                        │
│  │ Redis Cluster     │ ← Hot inventory (real-time counts)    │
│  │ (Sharded by SKU)  │   Single source of truth for stock   │
│  └────────┬─────────┘                                        │
│           │ Lua scripts for atomic operations                │
│           │                                                   │
│  ┌────────▼─────────┐                                        │
│  │ Inventory Service │ ← Business logic                      │
│  │ (Stateless)       │   Reserve, commit, release, query     │
│  └────────┬─────────┘                                        │
│           │                                                   │
│  ┌────────▼─────────┐                                        │
│  │ DynamoDB          │ ← Permanent records                   │
│  │ inventory_events  │   Event sourcing: every change logged │
│  └────────┬─────────┘                                        │
│           │                                                   │
│  ┌────────▼─────────┐                                        │
│  │ Kinesis Stream    │ ← Real-time inventory events          │
│  │                   │   Consumers: analytics, search index, │
│  │                   │   warehouse coordination              │
│  └──────────────────┘                                        │
└──────────────────────────────────────────────────────────────┘

Multi-Warehouse Coordination:
- ATP (Available to Promise) = on_hand - reserved - safety_stock
- Ship from nearest warehouse (minimize delivery time + cost)
- If nearest OOS → check next nearest (brokering)
- Cross-dock: some items go direct from vendor to customer (no warehouse touch)
```

#### Lua Script for Atomic Reservation
```lua
-- Redis Lua script: reserve_inventory.lua
-- KEYS[1] = sku:inventory (available count)
-- KEYS[2] = sku:reserve:{userId} (reservation key)
-- ARGV[1] = quantity requested
-- ARGV[2] = TTL in seconds (600 = 10 minutes)

local available = tonumber(redis.call('GET', KEYS[1]) or 0)
local qty = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

if available >= qty then
    redis.call('DECRBY', KEYS[1], qty)
    redis.call('SETEX', KEYS[2], ttl, qty)
    return 1 -- SUCCESS
else
    return 0 -- OUT_OF_STOCK
end
```

---

## Round 3: LLD + LP
**Duration:** 60 minutes

### Questions Asked
1. **LP (15 min): "Tell me about a time you simplified something complex"** (Invent and Simplify)
2. **Design Amazon's Recommendation Engine** (LLD: collaborative filtering)

### 💡 Interview-Ready Answer

```java
class RecommendationEngine {
    // Item-based collaborative filtering
    // "Users who bought X also bought Y"
    
    Map<String, Set<String>> userPurchases;     // userId → set of productIds
    Map<String, Map<String, Integer>> cooccurrence; // productId → {productId → count}
    
    void buildCooccurrenceMatrix(Map<String, Set<String>> userPurchases) {
        for (Set<String> purchases : userPurchases.values()) {
            List<String> items = new ArrayList<>(purchases);
            for (int i = 0; i < items.size(); i++) {
                for (int j = i + 1; j < items.size(); j++) {
                    incrementCooccurrence(items.get(i), items.get(j));
                    incrementCooccurrence(items.get(j), items.get(i));
                }
            }
        }
    }
    
    List<String> recommend(String userId, int k) {
        Set<String> purchased = userPurchases.getOrDefault(userId, Set.of());
        
        // Score each candidate product
        Map<String, Double> scores = new HashMap<>();
        
        for (String ownedItem : purchased) {
            Map<String, Integer> related = cooccurrence.getOrDefault(ownedItem, Map.of());
            for (var entry : related.entrySet()) {
                if (purchased.contains(entry.getKey())) continue; // Already owns
                
                // Score = sum of co-occurrence counts across all owned items
                scores.merge(entry.getKey(), (double) entry.getValue(), Double::sum);
            }
        }
        
        // Return top K by score
        return scores.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(k)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }
}
```

---

## Round 4: Bar Raiser
**Duration:** 60 minutes

### Questions Asked
1. **LP Deep Dive: Ownership, Think Big, Earn Trust**
2. **Quick Coding: Implement LRU with TTL** (combine LRU eviction with time-based expiry)

### 💡 LRU with TTL

```java
class LRUCacheWithTTL<K, V> {
    int capacity;
    long defaultTTLMs;
    Map<K, Node<K, V>> map;
    Node<K, V> head, tail; // doubly linked list
    
    V get(K key) {
        Node<K, V> node = map.get(key);
        if (node == null) return null;
        
        // Check TTL
        if (System.currentTimeMillis() > node.expiresAt) {
            remove(node);
            map.remove(key);
            return null;
        }
        
        moveToHead(node);
        return node.value;
    }
    
    void put(K key, V value, long ttlMs) {
        if (map.containsKey(key)) {
            Node<K, V> node = map.get(key);
            node.value = value;
            node.expiresAt = System.currentTimeMillis() + ttlMs;
            moveToHead(node);
        } else {
            if (map.size() >= capacity) evict();
            
            Node<K, V> node = new Node<>(key, value, System.currentTimeMillis() + ttlMs);
            map.put(key, node);
            addToHead(node);
        }
    }
    
    void evict() {
        // First try to evict expired entries
        Node<K, V> curr = tail.prev;
        long now = System.currentTimeMillis();
        while (curr != head) {
            if (now > curr.expiresAt) {
                Node<K, V> prev = curr.prev;
                remove(curr);
                map.remove(curr.key);
                return;
            }
            curr = curr.prev;
        }
        // No expired entries → evict LRU (tail)
        Node<K, V> lru = tail.prev;
        remove(lru);
        map.remove(lru.key);
    }
}
```

---

## 🎯 Key Takeaways
- Amazon L6 = **deep system design + strong LP stories with org-level impact**
- **Max Frequency Stack** = HashMap + freq-group stacks — O(1) operations
- **Redis Lua scripts** for atomic inventory operations — critical for flash sales
- **Reservation-based inventory** with TTL prevents overselling
- **Item-based collaborative filtering** for recommendations — simple but effective
- **LRU with TTL** combines two eviction strategies — commonly asked in Bar Raiser
- At L6, LP stories should show **hiring, mentoring, cross-team influence, org-wide impact**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding + LP | Hard | FreqStack, Hit Counter, Distributed |
| System Design | Very Hard | Inventory, Redis Lua, Flash Sales |
| LLD + LP | Hard | Recommendation Engine, Collab Filtering |
| Bar Raiser | Very Hard | LP + LRU with TTL |
