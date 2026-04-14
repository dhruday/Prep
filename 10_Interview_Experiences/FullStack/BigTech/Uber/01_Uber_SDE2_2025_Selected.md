# Uber — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | Software Engineer II |
| **Level** | L4 (SDE-2) |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 DSA + 1 System Design + 1 HM/Behavioral)
- **Timeline:** 3 weeks
- **Format:** Virtual (Zoom + CoderPad)
- **Note:** Uber interviews are very structured — 2 coding, 1 system design, 1 behavioral

---

## Round 1: Phone Screen
**Duration:** 30 minutes | **Interviewer:** Recruiter

Background discussion, motivation, team preferences (Maps, Rides, Eats, Payments).

---

## Round 2: DSA I
**Duration:** 50 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Design Hit Counter** (LeetCode 362) — Track hits in the past 5 minutes
2. **Follow-up:** Make it thread-safe, then scale to distributed

### 💡 Interview-Ready Answer

```java
class HitCounter {
    private int[] times;  // timestamp buckets
    private int[] hits;   // hit count per bucket
    
    public HitCounter() {
        times = new int[300]; // 300 seconds = 5 minutes
        hits = new int[300];
    }
    
    public void hit(int timestamp) {
        int idx = timestamp % 300;
        if (times[idx] != timestamp) {
            times[idx] = timestamp;
            hits[idx] = 1; // reset — old bucket expired
        } else {
            hits[idx]++;
        }
    }
    
    public int getHits(int timestamp) {
        int count = 0;
        for (int i = 0; i < 300; i++) {
            if (timestamp - times[i] < 300) {
                count += hits[i];
            }
        }
        return count;
    }
}
```
**Time:** hit O(1), getHits O(300) = O(1)
**Space:** O(300) = O(1)

**Thread-safe version:**
```java
class ConcurrentHitCounter {
    private final AtomicIntegerArray times;
    private final AtomicIntegerArray hits;
    
    public ConcurrentHitCounter() {
        times = new AtomicIntegerArray(300);
        hits = new AtomicIntegerArray(300);
    }
    
    public void hit(int timestamp) {
        int idx = timestamp % 300;
        synchronized (this) { // can use striped locks for better perf
            if (times.get(idx) != timestamp) {
                times.set(idx, timestamp);
                hits.set(idx, 1);
            } else {
                hits.incrementAndGet(idx);
            }
        }
    }
    
    public int getHits(int timestamp) {
        int count = 0;
        for (int i = 0; i < 300; i++) {
            if (timestamp - times.get(i) < 300) {
                count += hits.get(i);
            }
        }
        return count;
    }
}
```

**Distributed version:**
```
- Each server maintains local HitCounter
- Periodically (every 1-5 sec), publish local counts to Redis:
  INCRBY "hits:{timestamp_bucket}" {local_count}
- getHits: sum Redis keys for last 300 buckets
- Or: Use Redis HyperLogLog for approximate unique hit counting
```

---

## Round 3: DSA II
**Duration:** 50 minutes | **Interviewer:** Staff SDE

### Questions Asked
1. **Design an In-Memory File System** (LeetCode 588)
   - Implement `mkdir`, `ls`, `addContent`, `readContent`

### 💡 Interview-Ready Answer

```java
class FileSystem {
    class TrieNode {
        Map<String, TrieNode> children = new TreeMap<>(); // sorted for ls
        String content = ""; // empty for directory
        boolean isFile = false;
    }
    
    TrieNode root;
    
    public FileSystem() {
        root = new TrieNode();
    }
    
    public List<String> ls(String path) {
        TrieNode node = traverse(path);
        List<String> result = new ArrayList<>();
        
        if (node.isFile) {
            // Return just the file name
            String[] parts = path.split("/");
            result.add(parts[parts.length - 1]);
        } else {
            result.addAll(node.children.keySet());
        }
        return result;
    }
    
    public void mkdir(String path) {
        traverseOrCreate(path);
    }
    
    public void addContentToFile(String filePath, String content) {
        TrieNode node = traverseOrCreate(filePath);
        node.isFile = true;
        node.content += content; // append
    }
    
    public String readContentFromFile(String filePath) {
        return traverse(filePath).content;
    }
    
    private TrieNode traverse(String path) {
        TrieNode node = root;
        if (path.equals("/")) return node;
        for (String part : path.split("/")) {
            if (part.isEmpty()) continue;
            node = node.children.get(part);
        }
        return node;
    }
    
    private TrieNode traverseOrCreate(String path) {
        TrieNode node = root;
        if (path.equals("/")) return node;
        for (String part : path.split("/")) {
            if (part.isEmpty()) continue;
            node.children.putIfAbsent(part, new TrieNode());
            node = node.children.get(part);
        }
        return node;
    }
}
```

**Follow-up: Add delete, move, and permissions**
```java
// Delete: find parent, remove from children map
public void delete(String path) {
    String[] parts = path.split("/");
    TrieNode parent = root;
    for (int i = 1; i < parts.length - 1; i++) {
        parent = parent.children.get(parts[i]);
    }
    parent.children.remove(parts[parts.length - 1]);
}

// Move: delete from source, re-add at destination path
public void move(String source, String dest) {
    TrieNode node = traverse(source);
    delete(source);
    // Re-attach at new parent
    TrieNode destParent = traverseOrCreate(dest.substring(0, dest.lastIndexOf("/")));
    String name = dest.substring(dest.lastIndexOf("/") + 1);
    destParent.children.put(name, node);
}
```

---

## Round 4: System Design
**Duration:** 60 minutes | **Interviewer:** Staff SDE

### Questions Asked
1. **Design Uber's Ride Matching System**
   - Match riders to nearest available drivers in real-time
   - Handle 100K concurrent rides, < 5 second match time

### 💡 Interview-Ready Answer

#### Architecture
```
Rider requests ride
        │
        ▼
┌──────────────┐     ┌──────────────────────┐
│  Ride        │────▶│  Matching Service     │
│  Request     │     │                       │
│  API         │     │  1. Find nearby       │
│              │     │     drivers (geo)      │
└──────────────┘     │  2. Score & rank      │
                     │  3. Dispatch to top    │
                     └──────────┬────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              ▼                 ▼                   ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │  Geospatial  │  │  Driver      │  │  Pricing     │
     │  Index       │  │  Location    │  │  Service     │
     │  (Quad-tree/ │  │  Service     │  │  (Surge      │
     │   Geohash)   │  │  (Real-time) │  │   pricing)   │
     └──────────────┘  └──────────────┘  └──────────────┘
              │
              ▼
     ┌──────────────┐
     │  Redis       │
     │  (Driver     │
     │   locations) │
     │  GEO cmds    │
     └──────────────┘
```

#### Geospatial Matching
```
Option 1: Redis GEO (simple, good for most cases)
  GEOADD drivers:available {lng} {lat} {driver_id}
  GEORADIUS drivers:available {rider_lng} {rider_lat} 5 km COUNT 20 ASC
  → Returns 20 nearest available drivers within 5km

Option 2: Geohash + Grid (Uber's actual approach)
  - Divide city into S2 cells (Google S2 Geometry)
  - Each cell is ~1km x 1km
  - Driver updates: HSET cell:{geohash} {driver_id} {lat,lng,timestamp}
  - Rider match: check current cell + 8 neighboring cells
  - If < 5 drivers found, expand to 24 next-ring cells

Option 3: Quadtree (in-memory)
  - Dynamically subdivide regions with many drivers
  - Leaf nodes contain driver lists
  - Range query: traverse from root, collect all drivers in range
```

#### Driver Location Pipeline
```
Driver app sends GPS every 4 seconds
        │
        ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  WebSocket   │────▶│  Kafka       │────▶│  Location    │
│  Gateway     │     │  (driver-    │     │  Processor   │
│  (persistent │     │   locations  │     │  (Update     │
│   connection)│     │   topic)     │     │   geo-index) │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                          ┌───────┴───────┐
                                          ▼               ▼
                                   ┌──────────┐   ┌──────────┐
                                   │  Redis   │   │  Cassandra│
                                   │  GEO     │   │  (History)│
                                   │  (Live)  │   │           │
                                   └──────────┘   └──────────┘
```

#### Matching Algorithm
```java
class RideMatchingService {
    List<DriverCandidate> findDrivers(RideRequest request) {
        // 1. Geo query: find drivers within expanding radius
        List<Driver> nearbyDrivers = geoService.findNearby(
            request.pickupLat, request.pickupLng, 
            initialRadius: 3_000, // 3km
            maxRadius: 10_000,    // expand up to 10km
            minDrivers: 5         // need at least 5 candidates
        );
        
        // 2. Filter: available, correct vehicle type, rating > 4.0
        nearbyDrivers = nearbyDrivers.stream()
            .filter(d -> d.isAvailable())
            .filter(d -> d.vehicleType.matches(request.rideType))
            .filter(d -> d.rating >= 4.0)
            .collect(Collectors.toList());
        
        // 3. Score drivers
        return nearbyDrivers.stream()
            .map(d -> new DriverCandidate(d, scoreDriver(d, request)))
            .sorted(Comparator.comparingDouble(DriverCandidate::score).reversed())
            .limit(1) // top driver
            .collect(Collectors.toList());
    }
    
    double scoreDriver(Driver driver, RideRequest request) {
        double etaMinutes = mapsService.getETA(driver.location, request.pickup);
        double distanceKm = geoService.distance(driver.location, request.pickup);
        double acceptRate = driver.acceptanceRate; // historical
        
        // Weighted score: lower ETA = better, higher acceptance = better
        return (1.0 / (etaMinutes + 1)) * 0.5    // ETA weight: 50%
             + acceptRate * 0.3                     // Acceptance: 30%
             + driver.rating / 5.0 * 0.2;          // Rating: 20%
    }
}
```

#### Surge Pricing
```
- Monitor: supply (available drivers) vs demand (ride requests) per S2 cell
- If demand/supply > 1.5 → apply surge multiplier
- Multiplier = 1 + (demand/supply - 1) * 0.5 (capped at 3x)
- Display surge to rider before confirmation
- Recalculate every 30 seconds per cell
```

---

## Round 5: Hiring Manager / Behavioral
**Duration:** 45 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **"Tell me about a system you designed end-to-end"**
2. **"How do you handle conflicting priorities from different stakeholders?"**
3. **"Describe a time you mentored a junior engineer"**

### 💡 Interview-Ready Answer — Mentoring

**Situation:** A new college hire (3 months in) on my team was struggling with code reviews — PRs were getting 20+ comments and taking 3-4 review cycles to merge. Team morale was affected; the hire was considering quitting.

**Task:** Help them level up without being condescending or doing their work for them.

**Action:**
1. **Set up weekly 1:1 code review sessions** (30 min) — I'd review their PR WITH them before submitting
2. **Created a "PR Checklist"** specific to our codebase — naming conventions, error handling patterns, test expectations
3. **Pair programmed** on 2 features — modeled my thought process (how I structure code, when I add tests, why I chose certain patterns)
4. **Gradually reduced involvement** — went from reviewing every PR to every other PR to spot-checks only
5. **Celebrated publicly** when their PR got merged with zero comments for the first time

**Result:** After 2 months, average review comments dropped from 20+ to 2-3. They became one of our fastest shippers (3 features/sprint). They stayed on the team and later mentored the next new hire using the same PR checklist I'd created.

---

## 🎯 Key Takeaways
- Uber values **geospatial systems knowledge** — understand S2 cells, Geohash, Quadtrees
- **Hit Counter** is a staple Uber question — know the circular buffer approach
- System design at Uber revolves around **real-time, location-based systems** — rides, delivery, ETA
- **Trie-based file systems** test data structure design ability — common at Uber/Google
- **Surge pricing** is a great deep-dive topic — shows you understand Uber's core business
- Behavioral at Uber focuses on **technical leadership and mentoring** — prepare concrete stories

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 2 | Medium | Circular Buffer, Concurrency |
| Round 3 | Medium-Hard | Trie Design, File System |
| Round 4 | Hard | Geospatial Systems, Real-time Matching |
| Round 5 | Medium | Behavioral, Mentoring, Conflict |
