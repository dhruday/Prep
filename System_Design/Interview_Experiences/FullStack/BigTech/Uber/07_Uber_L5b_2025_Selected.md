# Uber — L5 FullStack Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | Staff Software Engineer |
| **Level** | L5b |
| **YOE** | 9 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Uber Eats |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Cultural + HM)

---

## Round 1: DSA — Real-Time Delivery ETA Estimation with Traffic Graph
**Duration:** 45 minutes

### Q1: Given a road network as a weighted directed graph where edge weights change dynamically (real-time traffic), find the shortest path from source to destination. Update edge weights efficiently.

```java
import java.util.*;

/**
 * Dynamic Shortest Path with Real-Time Traffic Updates:
 * 
 * Core: Dijkstra's with lazy re-computation.
 * 
 * Optimization: Instead of full Dijkstra on every query, maintain:
 * 1. A* with landmark-based heuristic for faster shortest path
 * 2. Incremental updates: only re-compute affected paths when edge weight changes
 * 
 * But for interview: clean Dijkstra + edge update + A* heuristic.
 * 
 * Time: O((V + E) log V) per query
 * Space: O(V + E)
 */
class TrafficGraph {
    
    // Adjacency list: node → [(neighbor, weight)]
    private final Map<Integer, List<int[]>> graph = new HashMap<>();
    private final int numNodes;
    
    // For A* heuristic: precomputed straight-line distances from landmarks
    private final double[] latitudes;
    private final double[] longitudes;
    
    TrafficGraph(int numNodes, double[] latitudes, double[] longitudes) {
        this.numNodes = numNodes;
        this.latitudes = latitudes;
        this.longitudes = longitudes;
        for (int i = 0; i < numNodes; i++) graph.put(i, new ArrayList<>());
    }
    
    void addEdge(int from, int to, int weight) {
        graph.get(from).add(new int[]{to, weight});
    }
    
    /**
     * Update edge weight (traffic change).
     * O(E) in worst case — acceptable for real-time updates at low frequency.
     */
    void updateEdgeWeight(int from, int to, int newWeight) {
        for (int[] edge : graph.getOrDefault(from, Collections.emptyList())) {
            if (edge[0] == to) {
                edge[1] = newWeight;
                return;
            }
        }
    }
    
    /**
     * Standard Dijkstra's shortest path.
     * Returns (distance, path).
     */
    Result dijkstra(int source, int target) {
        int[] dist = new int[numNodes];
        int[] prev = new int[numNodes];
        Arrays.fill(dist, Integer.MAX_VALUE);
        Arrays.fill(prev, -1);
        dist[source] = 0;
        
        // Min-heap: (distance, node)
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        pq.offer(new int[]{0, source});
        
        while (!pq.isEmpty()) {
            int[] curr = pq.poll();
            int d = curr[0], u = curr[1];
            
            if (u == target) break; // Early termination
            if (d > dist[u]) continue; // Stale entry
            
            for (int[] edge : graph.getOrDefault(u, Collections.emptyList())) {
                int v = edge[0], w = edge[1];
                int newDist = dist[u] + w;
                
                if (newDist < dist[v]) {
                    dist[v] = newDist;
                    prev[v] = u;
                    pq.offer(new int[]{newDist, v});
                }
            }
        }
        
        // Reconstruct path
        List<Integer> path = new ArrayList<>();
        if (dist[target] != Integer.MAX_VALUE) {
            for (int node = target; node != -1; node = prev[node]) {
                path.add(node);
            }
            Collections.reverse(path);
        }
        
        return new Result(dist[target] == Integer.MAX_VALUE ? -1 : dist[target], path);
    }
    
    /**
     * A* with haversine heuristic (straight-line distance).
     * Admissible heuristic: h(n) <= actual distance — never overestimates.
     */
    Result aStarSearch(int source, int target) {
        int[] gScore = new int[numNodes];
        int[] prev = new int[numNodes];
        Arrays.fill(gScore, Integer.MAX_VALUE);
        Arrays.fill(prev, -1);
        gScore[source] = 0;
        
        // Min-heap: (fScore, node) where fScore = gScore + heuristic
        PriorityQueue<double[]> pq = new PriorityQueue<>((a, b) -> Double.compare(a[0], b[0]));
        double h = heuristic(source, target);
        pq.offer(new double[]{h, source});
        
        boolean[] visited = new boolean[numNodes];
        
        while (!pq.isEmpty()) {
            double[] curr = pq.poll();
            int u = (int) curr[1];
            
            if (u == target) break;
            if (visited[u]) continue;
            visited[u] = true;
            
            for (int[] edge : graph.getOrDefault(u, Collections.emptyList())) {
                int v = edge[0], w = edge[1];
                int tentativeG = gScore[u] + w;
                
                if (tentativeG < gScore[v]) {
                    gScore[v] = tentativeG;
                    prev[v] = u;
                    double fScore = tentativeG + heuristic(v, target);
                    pq.offer(new double[]{fScore, v});
                }
            }
        }
        
        List<Integer> path = new ArrayList<>();
        if (gScore[target] != Integer.MAX_VALUE) {
            for (int node = target; node != -1; node = prev[node]) path.add(node);
            Collections.reverse(path);
        }
        
        return new Result(gScore[target] == Integer.MAX_VALUE ? -1 : gScore[target], path);
    }
    
    /**
     * Haversine heuristic — straight-line distance.
     * Convert to "time units" assuming average speed on road.
     */
    double heuristic(int a, int b) {
        double R = 6371; // km
        double dLat = Math.toRadians(latitudes[b] - latitudes[a]);
        double dLon = Math.toRadians(longitudes[b] - longitudes[a]);
        double sinLat = Math.sin(dLat / 2), sinLon = Math.sin(dLon / 2);
        double h = sinLat * sinLat + Math.cos(Math.toRadians(latitudes[a])) * 
                   Math.cos(Math.toRadians(latitudes[b])) * sinLon * sinLon;
        double distKm = R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
        
        // Convert km to "time" assuming max speed 80 km/h → min time = dist/80 hours * 60 min
        return distKm / 80.0 * 60; // minutes
    }
    
    /**
     * Multi-destination: find shortest paths from source to multiple targets.
     * Uses single-source Dijkstra and reads off distances to all targets.
     */
    Map<Integer, Integer> shortestPathMultiTarget(int source, Set<Integer> targets) {
        int[] dist = new int[numNodes];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[source] = 0;
        
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        pq.offer(new int[]{0, source});
        
        int found = 0;
        
        while (!pq.isEmpty() && found < targets.size()) {
            int[] curr = pq.poll();
            int d = curr[0], u = curr[1];
            if (d > dist[u]) continue;
            
            if (targets.contains(u)) found++;
            
            for (int[] edge : graph.getOrDefault(u, Collections.emptyList())) {
                int v = edge[0], w = edge[1];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.offer(new int[]{dist[v], v});
                }
            }
        }
        
        Map<Integer, Integer> result = new HashMap<>();
        for (int t : targets) {
            result.put(t, dist[t] == Integer.MAX_VALUE ? -1 : dist[t]);
        }
        return result;
    }
    
    static class Result {
        int distance;
        List<Integer> path;
        Result(int distance, List<Integer> path) {
            this.distance = distance; this.path = path;
        }
    }
}
```

---

## 🎯 Key Takeaways
- Uber L5b = **Dynamic shortest path with traffic — Dijkstra + A* + multi-target**
- **A* heuristic**: haversine straight-line distance / max_speed → admissible (never overestimates time)
- **Edge weight update**: O(E) scan — in production, use adjacency list with HashMap for O(1) lookup
- **Multi-target Dijkstra**: single-source, early termination when all targets found — O((V+E) log V)
- **Stale entry check**: `if (d > dist[u]) continue` — handles duplicate PQ entries without decrease-key
- **Path reconstruction**: `prev[]` array backtracking from target to source → reverse
- **Real-time traffic**: edge weights represent travel time in minutes — updated via traffic sensors/GPS
- **Production note**: Uber uses Contraction Hierarchies (CH) for fast shortest path, not plain Dijkstra — but Dijkstra is the interview-expected answer

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 (this) | Hard | Dijkstra, A*, Graph |
| Coding 2 | Hard | DP + String |
| System Design | Very Hard | Food Delivery Logistics |
| Cultural | Medium | Values |
| HM | Medium | Culture |
