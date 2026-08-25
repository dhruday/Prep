# Apple — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | ICT-3 FullStack |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Apple Maps |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite — Coding x2 + System Design + HM)
- **Timeline:** 4 weeks

---

## Round 1: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Design Tic-Tac-Toe** (LeetCode 348)
2. **Follow-up: Generalize to N×N board, check winner in O(1)**

### 💡 O(1) Move Validation Tic-Tac-Toe

```java
class TicTacToe {
    private final int[] rows, cols;
    private int diagonal, antiDiagonal;
    private final int n;
    
    public TicTacToe(int n) {
        this.n = n;
        rows = new int[n];
        cols = new int[n];
    }
    
    // player 1 → +1, player 2 → -1
    // Returns 0 (no winner), 1 (player 1 wins), 2 (player 2 wins)
    public int move(int row, int col, int player) {
        int delta = player == 1 ? 1 : -1;
        
        rows[row] += delta;
        cols[col] += delta;
        
        if (row == col) diagonal += delta;
        if (row + col == n - 1) antiDiagonal += delta;
        
        // Check if any line sums to ±n
        if (Math.abs(rows[row]) == n ||
            Math.abs(cols[col]) == n ||
            Math.abs(diagonal) == n ||
            Math.abs(antiDiagonal) == n) {
            return player;
        }
        
        return 0;
    }
}
// Time: O(1) per move
// Space: O(n) for row/col arrays
```

---

## Round 2: Coding
**Duration:** 45 minutes

### Questions Asked
1. **LRU Cache with TTL and Priority** (combined problem)
   - GET, PUT with TTL
   - When cache is full, evict: expired first, then lowest priority, then LRU

### 💡 LRU Cache with TTL + Priority

```java
class PriorityLRUCache {
    private final int capacity;
    private final Map<String, Node> map;
    private final TreeMap<Integer, LinkedList<Node>> priorityBuckets; // priority → LRU list
    
    static class Node {
        String key, value;
        int priority;
        long expiresAt; // epoch millis, -1 = no expiry
        Node prev, next;
        
        Node(String key, String value, int priority, long ttlMs) {
            this.key = key;
            this.value = value;
            this.priority = priority;
            this.expiresAt = ttlMs > 0 ? System.currentTimeMillis() + ttlMs : -1;
        }
        
        boolean isExpired() {
            return expiresAt > 0 && System.currentTimeMillis() > expiresAt;
        }
    }
    
    PriorityLRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        this.priorityBuckets = new TreeMap<>();
    }
    
    String get(String key) {
        Node node = map.get(key);
        if (node == null) return null;
        
        if (node.isExpired()) {
            remove(node);
            return null;
        }
        
        // Move to front of its priority bucket (most recently used)
        moveToFront(node);
        return node.value;
    }
    
    void put(String key, String value, int priority, long ttlMs) {
        if (map.containsKey(key)) {
            Node existing = map.get(key);
            removeFromBucket(existing);
            existing.value = value;
            existing.priority = priority;
            existing.expiresAt = ttlMs > 0 ? System.currentTimeMillis() + ttlMs : -1;
            addToBucketFront(existing);
            return;
        }
        
        // Evict if full
        while (map.size() >= capacity) {
            evict();
        }
        
        Node newNode = new Node(key, value, priority, ttlMs);
        map.put(key, newNode);
        addToBucketFront(newNode);
    }
    
    private void evict() {
        // Strategy: expired first → lowest priority → LRU within priority
        
        // 1. Try to evict any expired key
        for (var entry : priorityBuckets.entrySet()) {
            LinkedList<Node> bucket = entry.getValue();
            for (Node node : bucket) {
                if (node.isExpired()) {
                    remove(node);
                    return;
                }
            }
        }
        
        // 2. Evict LRU from lowest priority bucket
        var lowestEntry = priorityBuckets.firstEntry(); // TreeMap: lowest key first
        if (lowestEntry != null) {
            LinkedList<Node> bucket = lowestEntry.getValue();
            Node lru = bucket.removeLast(); // Last = least recently used
            map.remove(lru.key);
            if (bucket.isEmpty()) priorityBuckets.remove(lowestEntry.getKey());
        }
    }
    
    private void remove(Node node) {
        removeFromBucket(node);
        map.remove(node.key);
    }
    
    private void removeFromBucket(Node node) {
        LinkedList<Node> bucket = priorityBuckets.get(node.priority);
        if (bucket != null) {
            bucket.remove(node);
            if (bucket.isEmpty()) priorityBuckets.remove(node.priority);
        }
    }
    
    private void addToBucketFront(Node node) {
        priorityBuckets.computeIfAbsent(node.priority, k -> new LinkedList<>()).addFirst(node);
    }
    
    private void moveToFront(Node node) {
        removeFromBucket(node);
        addToBucketFront(node);
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Apple Maps Tile Server System**
   - Serve raster + vector map tiles (like z/x/y tile scheme)
   - Multi-resolution: zoom levels 0-22
   - Offline map downloads (region packs)
   - Real-time traffic overlay

### 💡 Key Design Points

```
Tile Addressing: /{z}/{x}/{y}.{format}
- z = zoom level (0-22), x,y = tile coordinates
- Quad-tree tiling: each zoom level divides parent tile into 4
- Vector tiles: Protocol Buffers (Mapbox Vector Tile spec)
- Raster tiles: PNG/WebP (pre-rendered for satellite view)

Architecture:
Client (MapKit JS) → CDN (CloudFront) → Tile Server → Tile Storage (S3)
                                       ↓
                                  PostGIS (vector data)
                                  
Rendering Pipeline:
1. Raw geodata (OpenStreetMap / Apple proprietary) → PostGIS
2. Tile renderer: PostGIS → MVT (Mapbox Vector Tile) per z/x/y
3. Pre-render popular tiles (zoom 0-14) → S3
4. On-demand render for zoom 15-22 → cache in CDN

Offline Packs:
- Region = bounding box + zoom range
- Pre-compute tile list: all z/x/y within region
- Package as SQLite (MBTiles format): z,x,y → tile_data (BLOB)
- Delta updates: only download changed tiles since last sync
- Size estimation: city ~100MB, country ~2GB at zoom 0-16

Traffic Overlay:
- Traffic data: GPS probes from iPhones (anonymized) → Kafka
- Aggregate: road segment → speed/congestion every 30s
- Traffic tiles: separate layer, short TTL (30s cache)
- Color coding: green (free flow), yellow (slow), red (congested)
- WebSocket push for real-time updates to active viewers

Scale:
- 1 billion daily tile requests
- CDN hit rate: 95%+ (tiles are highly cacheable)
- ~50TB total tile storage across all zoom levels
- Popular tiles (z0-z10): pre-rendered, ~5GB
- Long tail (z15-z22): rendered on-demand, cached 1 hour
```

---

## 🎯 Key Takeaways
- Apple = **clean design, efficient algorithms, high polish expected**
- **Tic-Tac-Toe O(1)**: track row/col/diagonal sums — ±n means winner
- **Priority LRU**: TreeMap<priority, LinkedList> — evict expired → lowest priority → LRU
- **Map tiles**: z/x/y addressing, quad-tree spatial indexing, pre-render popular + on-demand long tail
- **MBTiles for offline**: SQLite-based tile package — standard in mapping industry
- **Traffic overlay**: separate tile layer with 30s TTL — high freshness, low cache hit rate is OK
- Apple values: **privacy-first**, attention to detail, performance on Apple hardware

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium | Tic-Tac-Toe, O(1) Design |
| Coding 2 | Hard | LRU + TTL + Priority |
| System Design | Hard | Map Tiles, CDN, Offline |
| HM | Medium | Apple Values, Privacy |
