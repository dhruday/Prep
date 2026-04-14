# Uber — SDE-2 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | Senior Software Engineer |
| **Level** | L5a |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | San Francisco, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Uber Maps |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Domain + Cultural)

---

## Round 1: Coding
**Duration:** 45 minutes

### Questions Asked
1. **A* Search Algorithm for Shortest Path** (weighted graph with heuristic)
2. **Follow-up: Implement with landmarks-based heuristic (ALT algorithm)**

### 💡 A* Search with Euclidean Heuristic

```java
/**
 * A* search for shortest path on weighted graph (road network).
 * h(n) = Euclidean distance to target (admissible heuristic).
 * f(n) = g(n) + h(n) where g(n) = actual cost from start.
 * 
 * A* guarantees optimal path if heuristic is admissible (never overestimates).
 * Euclidean distance ≤ road distance → admissible.
 * 
 * Time: O(E log V) same as Dijkstra worst case, but A* explores fewer nodes.
 * Space: O(V) for priority queue + visited set.
 */
class AStarSearch {
    
    record Node(int id, double lat, double lng) {}
    record Edge(int to, double weight) {} // weight = road distance or time
    
    // Returns: List of node IDs from start to end (shortest path)
    List<Integer> findPath(
        Map<Integer, Node> nodes,
        Map<Integer, List<Edge>> graph,
        int startId, int endId
    ) {
        Node target = nodes.get(endId);
        
        // Priority queue: (f-score, nodeId)
        PriorityQueue<double[]> pq = new PriorityQueue<>((a, b) -> Double.compare(a[0], b[0]));
        
        Map<Integer, Double> gScore = new HashMap<>(); // Actual cost from start
        Map<Integer, Integer> cameFrom = new HashMap<>(); // For path reconstruction
        Set<Integer> visited = new HashSet<>();
        
        gScore.put(startId, 0.0);
        pq.offer(new double[]{heuristic(nodes.get(startId), target), startId});
        
        while (!pq.isEmpty()) {
            double[] current = pq.poll();
            int currentId = (int) current[1];
            
            if (currentId == endId) {
                return reconstructPath(cameFrom, endId);
            }
            
            if (visited.contains(currentId)) continue;
            visited.add(currentId);
            
            for (Edge edge : graph.getOrDefault(currentId, List.of())) {
                if (visited.contains(edge.to)) continue;
                
                double tentativeG = gScore.get(currentId) + edge.weight;
                
                if (tentativeG < gScore.getOrDefault(edge.to, Double.MAX_VALUE)) {
                    gScore.put(edge.to, tentativeG);
                    cameFrom.put(edge.to, currentId);
                    double f = tentativeG + heuristic(nodes.get(edge.to), target);
                    pq.offer(new double[]{f, edge.to});
                }
            }
        }
        
        return List.of(); // No path found
    }
    
    // Euclidean distance heuristic (admissible for road networks)
    double heuristic(Node from, Node to) {
        // Haversine formula for real-world lat/lng
        double R = 6371000; // Earth radius in meters
        double dLat = Math.toRadians(to.lat - from.lat);
        double dLng = Math.toRadians(to.lng - from.lng);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(from.lat)) * Math.cos(Math.toRadians(to.lat))
            * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    
    List<Integer> reconstructPath(Map<Integer, Integer> cameFrom, int current) {
        List<Integer> path = new ArrayList<>();
        while (cameFrom.containsKey(current)) {
            path.add(current);
            current = cameFrom.get(current);
        }
        path.add(current); // Add start node
        Collections.reverse(path);
        return path;
    }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Uber's ETA Prediction System**
   - Predict arrival time for: ride request, driver ETA, trip ETA
   - Account for: traffic, road closures, weather, events
   - Real-time updates during trip
   - Accuracy requirement: within 2 minutes for 90% of trips
   - Scale: 20M trips/day, 100M ETA calculations/day

### 💡 ETA Prediction Architecture

```
ETA Types:
1. Pickup ETA: time for nearest driver to reach rider
2. Dropoff ETA: time from pickup to destination
3. Route ETA: real-time update during trip (remaining time)

Architecture:
┌────────────────────────────────────────────────────┐
│                    ETA Service                      │
│                                                     │
│  1. Routing Engine (OSRM / Valhalla):               │
│     • Graph of road network (nodes = intersections) │
│     • Edge weights = traversal time                 │
│     • A* or Contraction Hierarchies for speed       │
│     • Pre-computed: 10x faster than real-time A*    │
│                                                     │
│  2. Traffic Overlay:                                │
│     • Real-time speed data from GPS pings           │
│     • Edge weights adjusted by actual traffic       │
│     • Historical patterns: rush hour, weekends      │
│     • Update frequency: every 2 minutes             │
│                                                     │
│  3. ML Correction Model:                            │
│     • Input features:                               │
│       - Routing engine ETA (base)                   │
│       - Current traffic conditions (segment speeds) │
│       - Time of day, day of week                    │
│       - Weather (rain → +15%, snow → +30%)          │
│       - Special events (concert, game)              │
│       - Historical accuracy for this route          │
│       - Pickup location type (airport, downtown)    │
│     • Output: corrected ETA                         │
│     • Model: Gradient Boosted Trees (XGBoost)       │
│     • Trained on 50M historical trips               │
│                                                     │
│  4. Final ETA = ML_correction(routing_ETA,features) │
└────────────────────────────────────────────────────┘

Data Pipeline:
┌──────────────────────────────────────────────────┐
│ GPS Pings (from all active drivers/riders):       │
│ • 4-second intervals                              │
│ • ~5M active devices → ~75M pings/min             │
│                                                   │
│ Pipeline:                                         │
│ GPS Ping → Kafka →                                │
│   ├── Map Matching Service                        │
│   │   (snap GPS to road segment using HMM)        │
│   │   → which road is this driver on?             │
│   │                                               │
│   ├── Speed Aggregation (Flink)                   │
│   │   Group by: road_segment × time_bucket(2min)  │
│   │   Compute: median speed per segment           │
│   │   → Redis (live traffic layer)                │
│   │                                               │
│   └── Trip Tracking (per-trip ETA updates)        │
│       Every 30s: recalculate remaining ETA         │
│       Push update to rider app via WebSocket       │
└──────────────────────────────────────────────────┘

Contraction Hierarchies (for fast routing):
┌──────────────────────────────────────────────────┐
│ Problem: A* on full road graph is too slow for    │
│ production (millions of nodes per city)           │
│                                                   │
│ Solution: Contraction Hierarchies (CH)            │
│                                                   │
│ Preprocessing (offline, per city):                │
│ 1. Rank nodes by "importance" (highways > local)  │
│ 2. Contract least important nodes:                │
│    Remove node, add shortcut edges to preserve    │
│    shortest paths                                 │
│ 3. Result: hierarchical graph where querying      │
│    only explores "upward" then "downward"         │
│                                                   │
│ Query time: O(log V) vs O(E log V) for Dijkstra  │
│ Typical: 0.5ms vs 100ms for city-scale queries    │
│                                                   │
│ Tradeoff: preprocessing takes 30+ min per city    │
│ → run nightly, traffic overlay applied at runtime │
└──────────────────────────────────────────────────┘

ETA During Trip (Real-Time Updates):
┌──────────────────────────────────────────────────┐
│ 1. Trip starts, initial route computed             │
│ 2. Every 30 seconds:                               │
│    a. Driver's current GPS → map-matched position  │
│    b. Remaining route = route[current_pos:]        │
│    c. Re-query traffic layer for segment speeds    │
│    d. remaining_ETA = Σ(segment_length / speed)    │
│    e. ML correction applied                        │
│    f. Push to rider app via WebSocket              │
│                                                   │
│ 3. Route deviation detection:                      │
│    If driver deviates >200m from route:            │
│    → Reroute entirely (new A*/CH query)            │
│    → Update ETA with new route                     │
│                                                   │
│ 4. Arrival detection:                              │
│    Geofence (100m radius) around destination       │
│    → Trigger "arriving" notification               │
│    → Stop ETA updates                              │
└──────────────────────────────────────────────────┘

Accuracy Monitoring:
- Compare predicted vs actual trip duration
- P50 error: < 1 min, P90 error: < 2 min
- Dashboard: error by city, time of day, distance
- Feedback loop: prediction errors → ML retraining (weekly)
```

---

## 🎯 Key Takeaways
- Uber L5a = **A* with Haversine heuristic + ETA prediction system**
- **A* admissibility**: Euclidean/Haversine ≤ road distance → always finds optimal path
- **Contraction Hierarchies**: 200x faster than Dijkstra — preprocess offline, query in <1ms
- **Map matching**: snap noisy GPS to road segments using HMM — essential for speed aggregation
- **ML ETA correction**: routing engine gives base ETA, ML model corrects for traffic/weather/events
- **Real-time speed**: aggregate GPS pings per road segment per 2-min bucket → Redis traffic layer
- **Route deviation**: if driver >200m off route → full reroute + new ETA
- Uber interviews: **maps/routing is core** — know A*, CH, map matching, geospatial indexing

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | A* Search, Haversine |
| System Design | Very Hard | ETA Prediction, Routing, ML |
| Domain | Hard | Maps, Traffic, Real-Time |
| Cultural | Medium | Uber Values |
| Coding 2 | Medium-Hard | Graph / DP |
