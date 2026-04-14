# LinkedIn — SDE-2 FullStack Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Software Engineer |
| **Level** | Senior (E5) |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Coding + System Design + Behavioral)
- **Timeline:** 2 weeks
- **Format:** Virtual

---

## Round 1: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **All Nodes Distance K in Binary Tree** (LeetCode 863)
2. **Follow-up: What if the tree is very deep (1M nodes) and target is near the bottom?**

### 💡 Interview-Ready Answer

```java
public List<Integer> distanceK(TreeNode root, TreeNode target, int k) {
    // Step 1: Build parent pointers using DFS
    Map<TreeNode, TreeNode> parent = new HashMap<>();
    buildParentMap(root, null, parent);
    
    // Step 2: BFS from target, going up (parent) and down (children)
    Queue<TreeNode> queue = new LinkedList<>();
    Set<TreeNode> visited = new HashSet<>();
    queue.offer(target);
    visited.add(target);
    
    int distance = 0;
    while (!queue.isEmpty()) {
        if (distance == k) {
            return queue.stream().map(n -> n.val).collect(Collectors.toList());
        }
        
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            TreeNode node = queue.poll();
            
            // Explore all three directions: left, right, parent
            for (TreeNode neighbor : new TreeNode[]{node.left, node.right, parent.get(node)}) {
                if (neighbor != null && visited.add(neighbor)) {
                    queue.offer(neighbor);
                }
            }
        }
        distance++;
    }
    
    return new ArrayList<>();
}

private void buildParentMap(TreeNode node, TreeNode par, Map<TreeNode, TreeNode> parent) {
    if (node == null) return;
    parent.put(node, par);
    buildParentMap(node.left, node, parent);
    buildParentMap(node.right, node, parent);
}
// Time: O(n), Space: O(n)
```

---

## Round 2: Coding 2
**Duration:** 45 minutes

### Questions Asked
1. **Design an LRU Cache** (LeetCode 146)
2. **Follow-up: Implement with TTL + eviction callback**

### 💡 LRU Cache with Eviction Callback

```java
class LRUCache<K, V> {
    interface EvictionListener<K, V> {
        void onEvict(K key, V value, EvictionReason reason);
    }
    
    enum EvictionReason { CAPACITY, TTL, MANUAL }
    
    private final int capacity;
    private final Map<K, Node<K, V>> map;
    private final Node<K, V> head, tail;
    private EvictionListener<K, V> listener;
    
    LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        head = new Node<>(null, null);
        tail = new Node<>(null, null);
        head.next = tail;
        tail.prev = head;
    }
    
    void setEvictionListener(EvictionListener<K, V> listener) {
        this.listener = listener;
    }
    
    V get(K key) {
        Node<K, V> node = map.get(key);
        if (node == null) return null;
        
        // Check TTL
        if (node.ttl > 0 && System.currentTimeMillis() > node.expiresAt) {
            evict(node, EvictionReason.TTL);
            return null;
        }
        
        moveToHead(node);
        return node.value;
    }
    
    void put(K key, V value) {
        put(key, value, 0); // No TTL
    }
    
    void put(K key, V value, long ttlMs) {
        Node<K, V> existing = map.get(key);
        if (existing != null) {
            existing.value = value;
            if (ttlMs > 0) {
                existing.ttl = ttlMs;
                existing.expiresAt = System.currentTimeMillis() + ttlMs;
            }
            moveToHead(existing);
            return;
        }
        
        while (map.size() >= capacity) {
            evict(tail.prev, EvictionReason.CAPACITY);
        }
        
        Node<K, V> node = new Node<>(key, value);
        if (ttlMs > 0) {
            node.ttl = ttlMs;
            node.expiresAt = System.currentTimeMillis() + ttlMs;
        }
        map.put(key, node);
        addToHead(node);
    }
    
    private void evict(Node<K, V> node, EvictionReason reason) {
        removeNode(node);
        map.remove(node.key);
        if (listener != null) {
            listener.onEvict(node.key, node.value, reason);
        }
    }
    
    private void addToHead(Node<K, V> node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
    
    private void removeNode(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    private void moveToHead(Node<K, V> node) {
        removeNode(node);
        addToHead(node);
    }
    
    static class Node<K, V> {
        K key; V value;
        Node<K, V> prev, next;
        long ttl, expiresAt;
        Node(K k, V v) { key = k; value = v; }
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design LinkedIn's Connection Recommendation System (PYMK — People You May Know)**
   - Suggest mutual connections, 2nd-degree connections, company/school-based

### 💡 Interview-Ready Answer

```
PYMK (People You May Know) Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Signal Sources (Ranked by weight):                          │
│  1. Mutual connections (40% weight) — strongest signal       │
│  2. Same company + department (20%)                          │
│  3. Same school + graduation year (15%)                      │
│  4. Profile viewers who viewed you (10%)                     │
│  5. Same groups / interests (10%)                            │
│  6. Location proximity (5%)                                  │
│                                                                │
│  Algorithm — 2nd Degree Connections:                          │
│  For user U:                                                  │
│  1. Get all connections of U → Set<Friend>                   │
│  2. For each friend F:                                       │
│     Get connections of F → Set<FriendOfFriend>               │
│  3. For each FoF:                                            │
│     score += mutual_count * 40 + same_company * 20 + ...    │
│  4. Filter: remove existing connections, blocked users       │
│  5. Rank by score, return top K                              │
│                                                                │
│  Challenge: LinkedIn has 1B+ members, avg 500 connections    │
│  → For one user: 500 friends × 500 FoF = 250K candidates    │
│  → Can't compute in real-time for every page load            │
│                                                                │
│  Architecture:                                                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Offline Pipeline (daily):                               ││
│  │  1. Graph stored in custom graph DB (not Neo4j at scale) ││
│  │  2. MapReduce: for each user, compute PYMK candidates    ││
│  │  3. Score + rank → store top 100 per user in key-value   ││
│  │  4. Data: Voldemort/Espresso (LinkedIn's KV stores)      ││
│  │                                                           ││
│  │  Online Serving (per request):                           ││
│  │  1. Fetch pre-computed top 100 from KV store             ││
│  │  2. Apply real-time filters: blocked, recently dismissed ││
│  │  3. Re-rank with real-time signals (profile views today) ││
│  │  4. Return top 10 to display                             ││
│  └──────────────────────────────────────────────────────────┘│
│                                                                │
│  Graph Storage:                                               │
│  - Adjacency list in custom format                           │
│  - Partitioned by userId (shard key)                         │
│  - Each partition: user → sorted list of connection IDs      │
│  - Bloom filter per user for fast "is connected?" check      │
│                                                                │
│  Anti-Spam:                                                   │
│  - Don't suggest: blocked users, reported users              │
│  - Don't suggest: already dismissed (user clicked "X")       │
│  - Rate limit: don't show same suggestion after 3 dismissals │
│  - Diversity: mix of company, school, mutual-based           │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- LinkedIn coding = **graph problems + cache design** — very consistent
- **Distance K in Binary Tree** → convert tree to graph using parent map, then BFS
- **LRU with eviction callback** → Observer pattern on top of standard LRU
- **PYMK is LinkedIn's #1 system design question** — know offline + online serving
- **Pre-compute daily, serve from KV store** is the standard pattern for recommendation
- **Bloom filter** for fast "already connected?" check — O(1) with false positive trade-off
- LinkedIn interviews are **less intense** than Meta/Google but still technically deep

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium-Hard | Tree→Graph, BFS, Parent Map |
| Coding 2 | Medium | LRU Cache, TTL, Observer Pattern |
| System Design | Hard | PYMK, Graph, MapReduce, KV Store |
| Behavioral | Medium | Collaboration, Growth |
