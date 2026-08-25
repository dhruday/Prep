# Uber — SDE-3 FullStack Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | Senior Software Engineer |
| **Level** | L5b |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Blind](https://www.teamblind.com/post/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Behavioral)
- **Timeline:** 3 weeks
- **Format:** Virtual

---

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Design a Parking Lot System** (LLD)
2. **Implement the core classes with type-safe generics**

### 💡 Interview-Ready Answer

```java
// Enums
enum VehicleType { MOTORCYCLE, CAR, BUS }
enum SpotSize { SMALL, MEDIUM, LARGE }

// Vehicle hierarchy
abstract class Vehicle {
    private final String licensePlate;
    private final VehicleType type;
    
    Vehicle(String licensePlate, VehicleType type) {
        this.licensePlate = licensePlate;
        this.type = type;
    }
    
    String getLicensePlate() { return licensePlate; }
    VehicleType getType() { return type; }
    abstract SpotSize getRequiredSpotSize();
}

class Car extends Vehicle {
    Car(String plate) { super(plate, VehicleType.CAR); }
    @Override SpotSize getRequiredSpotSize() { return SpotSize.MEDIUM; }
}

// Parking spot
class ParkingSpot {
    private final int id;
    private final SpotSize size;
    private final int floor;
    private Vehicle occupant;
    
    ParkingSpot(int id, SpotSize size, int floor) {
        this.id = id;
        this.size = size;
        this.floor = floor;
    }
    
    boolean canFit(Vehicle vehicle) {
        return occupant == null && size.ordinal() >= vehicle.getRequiredSpotSize().ordinal();
    }
    
    void park(Vehicle vehicle) {
        if (!canFit(vehicle)) throw new IllegalStateException("Cannot park here");
        this.occupant = vehicle;
    }
    
    Vehicle unpark() {
        Vehicle v = this.occupant;
        this.occupant = null;
        return v;
    }
    
    boolean isAvailable() { return occupant == null; }
}

// Parking Lot with strategy
class ParkingLot {
    private final List<List<ParkingSpot>> floors; // floor → list of spots
    private final Map<String, ParkingSpot> vehicleToSpot; // plate → spot
    private final ParkingStrategy strategy;
    
    ParkingLot(int numFloors, int spotsPerFloor, ParkingStrategy strategy) {
        this.strategy = strategy;
        this.vehicleToSpot = new ConcurrentHashMap<>();
        this.floors = new ArrayList<>();
        
        for (int f = 0; f < numFloors; f++) {
            List<ParkingSpot> floorSpots = new ArrayList<>();
            for (int s = 0; s < spotsPerFloor; s++) {
                SpotSize size = s < spotsPerFloor / 4 ? SpotSize.SMALL :
                                s < spotsPerFloor * 3 / 4 ? SpotSize.MEDIUM : SpotSize.LARGE;
                floorSpots.add(new ParkingSpot(f * spotsPerFloor + s, size, f));
            }
            floors.add(floorSpots);
        }
    }
    
    synchronized ParkingTicket park(Vehicle vehicle) {
        ParkingSpot spot = strategy.findSpot(floors, vehicle);
        if (spot == null) throw new ParkingFullException("No available spot");
        
        spot.park(vehicle);
        vehicleToSpot.put(vehicle.getLicensePlate(), spot);
        
        return new ParkingTicket(vehicle.getLicensePlate(), spot.getId(), LocalDateTime.now());
    }
    
    synchronized ParkingReceipt unpark(ParkingTicket ticket) {
        ParkingSpot spot = vehicleToSpot.remove(ticket.getLicensePlate());
        if (spot == null) throw new IllegalArgumentException("Vehicle not found");
        
        spot.unpark();
        
        Duration duration = Duration.between(ticket.getEntryTime(), LocalDateTime.now());
        BigDecimal fee = calculateFee(duration, spot.getSize());
        
        return new ParkingReceipt(ticket, fee, duration);
    }
    
    private BigDecimal calculateFee(Duration duration, SpotSize size) {
        long hours = Math.max(1, duration.toHours() + (duration.toMinutesPart() > 0 ? 1 : 0));
        BigDecimal rate = switch (size) {
            case SMALL -> BigDecimal.valueOf(20);
            case MEDIUM -> BigDecimal.valueOf(40);
            case LARGE -> BigDecimal.valueOf(60);
        };
        return rate.multiply(BigDecimal.valueOf(hours));
    }
}

// Strategy Pattern for spot selection
interface ParkingStrategy {
    ParkingSpot findSpot(List<List<ParkingSpot>> floors, Vehicle vehicle);
}

class NearestFirstStrategy implements ParkingStrategy {
    @Override
    public ParkingSpot findSpot(List<List<ParkingSpot>> floors, Vehicle vehicle) {
        // Nearest = lowest floor, first available spot
        for (List<ParkingSpot> floor : floors) {
            for (ParkingSpot spot : floor) {
                if (spot.canFit(vehicle)) return spot;
            }
        }
        return null;
    }
}
```

---

## Round 2: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Design and Implement Consistent Hashing**
2. **With virtual nodes for load balancing**

### 💡 Consistent Hashing Implementation

```java
class ConsistentHash<T> {
    private final TreeMap<Long, T> ring = new TreeMap<>();
    private final int virtualNodes;
    private final MessageDigest md;
    
    ConsistentHash(int virtualNodes) {
        this.virtualNodes = virtualNodes;
        try { this.md = MessageDigest.getInstance("MD5"); }
        catch (Exception e) { throw new RuntimeException(e); }
    }
    
    void addNode(T node) {
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(node.toString() + "#VN" + i);
            ring.put(hash, node);
        }
    }
    
    void removeNode(T node) {
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(node.toString() + "#VN" + i);
            ring.remove(hash);
        }
    }
    
    T getNode(String key) {
        if (ring.isEmpty()) return null;
        
        long hash = hash(key);
        // Find the first node clockwise from the hash
        Map.Entry<Long, T> entry = ring.ceilingEntry(hash);
        if (entry == null) {
            entry = ring.firstEntry(); // Wrap around to start
        }
        return entry.getValue();
    }
    
    private long hash(String key) {
        md.reset();
        byte[] digest = md.digest(key.getBytes());
        // Use first 8 bytes for long hash
        long hash = 0;
        for (int i = 0; i < 8; i++) {
            hash = (hash << 8) | (digest[i] & 0xFF);
        }
        return hash;
    }
}

// Usage:
ConsistentHash<String> ch = new ConsistentHash<>(150); // 150 virtual nodes per server
ch.addNode("server-1");
ch.addNode("server-2");
ch.addNode("server-3");

ch.getNode("user:12345"); // → "server-2"

// Adding server-4: only ~1/N keys need to be remapped (not all like modular hashing)
ch.addNode("server-4");
```

---

## Round 3: Coding 2
**Duration:** 45 minutes

### Questions Asked
1. **Find the Shortest Path in a Weighted Graph** (Dijkstra's)
2. **Follow-up: Bidirectional Dijkstra for faster path finding**

### 💡 Dijkstra's with Path Reconstruction

```java
public List<Integer> shortestPath(int n, int[][] edges, int src, int dst) {
    // Build adjacency list: node → [(neighbor, weight)]
    Map<Integer, List<int[]>> graph = new HashMap<>();
    for (int[] edge : edges) {
        graph.computeIfAbsent(edge[0], k -> new ArrayList<>()).add(new int[]{edge[1], edge[2]});
        graph.computeIfAbsent(edge[1], k -> new ArrayList<>()).add(new int[]{edge[0], edge[2]});
    }
    
    // Min-heap: [distance, node]
    PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
    long[] dist = new long[n];
    int[] prev = new int[n]; // For path reconstruction
    Arrays.fill(dist, Long.MAX_VALUE);
    Arrays.fill(prev, -1);
    
    dist[src] = 0;
    pq.offer(new long[]{0, src});
    
    while (!pq.isEmpty()) {
        long[] curr = pq.poll();
        long d = curr[0];
        int u = (int) curr[1];
        
        if (u == dst) break; // Early termination
        if (d > dist[u]) continue; // Stale entry
        
        for (int[] edge : graph.getOrDefault(u, List.of())) {
            int v = edge[0];
            long newDist = d + edge[1];
            
            if (newDist < dist[v]) {
                dist[v] = newDist;
                prev[v] = u;
                pq.offer(new long[]{newDist, v});
            }
        }
    }
    
    // Reconstruct path
    if (dist[dst] == Long.MAX_VALUE) return List.of(); // Unreachable
    
    List<Integer> path = new ArrayList<>();
    for (int node = dst; node != -1; node = prev[node]) {
        path.add(node);
    }
    Collections.reverse(path);
    return path;
}
// Time: O((V + E) log V), Space: O(V + E)
```

---

## Round 4: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Uber's ETA (Estimated Time of Arrival) System**
   - Real-time ETA for riders and drivers, considering traffic, road closures, historical data

### 💡 Interview-Ready Answer

```
ETA System Architecture:
┌──────────────────────────────────────────────────────────────┐
│  ETA Calculation Pipeline:                                    │
│                                                                │
│  Input: (origin_lat, origin_lng) → (dest_lat, dest_lng)     │
│  Output: estimated_minutes, route_polyline, confidence        │
│                                                                │
│  Step 1: Road Network Graph                                   │
│  - OpenStreetMap data → directed weighted graph               │
│  - Nodes = intersections, Edges = road segments              │
│  - Edge weight = travel time (not distance!)                 │
│  - Weight = distance / speed, where speed varies by:         │
│    a. Road type (highway vs residential)                     │
│    b. Time of day (rush hour multipliers)                    │
│    c. Real-time traffic (from GPS probes)                    │
│    d. Weather conditions                                      │
│                                                                │
│  Step 2: Graph Partitioning (for scale)                      │
│  - Entire city graph too large for single query              │
│  - Use Contraction Hierarchies (CH):                         │
│    a. Preprocess: rank nodes by importance                   │
│    b. Add "shortcut" edges between important nodes           │
│    c. Query: bidirectional Dijkstra on contracted graph      │
│    d. Result: exact shortest path, 1000x faster than naive   │
│                                                                │
│  Step 3: Real-Time Traffic Integration                        │
│  - GPS probes from all active Uber drivers (every 4 seconds) │
│  - Map-match GPS to road segments                            │
│  - Calculate average speed per segment per time window       │
│  - Update edge weights in graph (every 1-2 minutes)         │
│  - Kafka pipeline: GPS events → speed aggregation → graph    │
│                                                                │
│  Step 4: ML-Based ETA Correction                             │
│  - Graph-based ETA is a good baseline but not perfect        │
│  - ML model features:                                        │
│    a. Graph-computed ETA (baseline)                           │
│    b. Day of week, hour, minute                              │
│    c. Weather (rain/snow → slower)                           │
│    d. Special events (concert, sports game in area)          │
│    e. Historical actual vs predicted for this route          │
│  - Model output: correction factor (multiply graph ETA)      │
│  - Uber's paper: "DeepETA" — graph neural network            │
│                                                                │
│  Architecture:                                                │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │ GPS Probes  │─▶│ Traffic Svc  │─▶│ Road Segment     │     │
│  │ (Drivers)   │  │ (Kafka)      │  │ Speed Cache      │     │
│  └────────────┘  └──────────────┘  │ (Redis)           │     │
│                                     └────────┬─────────┘     │
│                                              │               │
│  ┌────────────┐  ┌──────────────┐  ┌────────▼─────────┐     │
│  │ Rider App   │─▶│ ETA Service  │─▶│ Routing Engine    │     │
│  │ Request     │  │              │  │ (CH + A*)         │     │
│  └────────────┘  │  ┌────────┐  │  └──────────────────┘     │
│                   │  │ ML Model│  │                           │
│                   │  │ (DeepETA)│  │                           │
│                   │  └────────┘  │                            │
│                   └──────────────┘                            │
│                                                                │
│  Scale:                                                       │
│  - 20M ETA requests/minute at peak                           │
│  - Latency target: < 100ms p99                               │
│  - Graph: ~100M nodes, ~200M edges (per city)                │
│  - Traffic update: every 60-120 seconds                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Uber = **graph algorithms + geospatial + real-time systems**
- **Consistent Hashing** with virtual nodes — critical for distributed systems at Uber
- **Contraction Hierarchies** = how routing engines achieve sub-100ms path queries
- **ETA = graph-based baseline + ML correction** — know both components
- **GPS probe → speed aggregation → graph weight update** = real-time traffic pipeline
- Uber expects **production-scale numbers** in system design (20M req/min, 100M nodes)
- At L5b, behavioral focuses on **cross-team influence and technical leadership**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | LLD Parking Lot, Strategy Pattern |
| Coding 1 | Hard | Consistent Hashing, Virtual Nodes |
| Coding 2 | Hard | Dijkstra's, Path Reconstruction |
| System Design | Very Hard | ETA, Routing, Graph, ML |
| Behavioral | Medium-Hard | Leadership |
