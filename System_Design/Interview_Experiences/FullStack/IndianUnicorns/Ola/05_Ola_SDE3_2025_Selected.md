# Ola — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | Staff Engineer |
| **Level** | SDE-3 |
| **YOE** | 8 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/ola-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Ola Maps |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + DSA + System Design + HM)

---

## Round 2: DSA — Shortest Path with Constraints (Modified Dijkstra's)
**Duration:** 45 minutes

### Question: Find the shortest path from source to destination in a road network where each edge has a distance AND a toll. Find the shortest path such that total toll does not exceed a given budget. If no path within budget exists, return -1.

```java
import java.util.*;

/**
 * Shortest Path with Budget Constraint:
 * 
 * State: (node, remainingBudget) — treat as separate vertices in expanded graph.
 * 
 * Use modified Dijkstra's with state = (distance, node, budget_left).
 * Visit (node, budget_left) only once (like standard Dijkstra).
 * 
 * Time: O(V * B * log(V * B)) where B = budget
 * Space: O(V * B)
 * 
 * This is the Constrained Shortest Path Problem (CSPP) — 
 * NP-hard in general, but pseudo-polynomial with integer budgets.
 */
class ConstrainedShortestPath {
    
    static class Edge {
        int to;
        int distance;
        int toll;
        
        Edge(int to, int distance, int toll) {
            this.to = to;
            this.distance = distance;
            this.toll = toll;
        }
    }
    
    static class State implements Comparable<State> {
        int node;
        int distance;
        int budgetLeft;
        
        State(int node, int distance, int budgetLeft) {
            this.node = node;
            this.distance = distance;
            this.budgetLeft = budgetLeft;
        }
        
        public int compareTo(State other) {
            return Integer.compare(this.distance, other.distance);
        }
    }
    
    /**
     * @param n Number of nodes (0-indexed)
     * @param edges [from, to, distance, toll] (bidirectional)
     * @param src Source node
     * @param dst Destination node
     * @param budget Maximum total toll allowed
     * @return Shortest distance within budget, or -1 if impossible
     */
    public int shortestPath(int n, int[][] edges, int src, int dst, int budget) {
        // Build adjacency list
        List<List<Edge>> graph = new ArrayList<>();
        for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
        
        for (int[] e : edges) {
            graph.get(e[0]).add(new Edge(e[1], e[2], e[3]));
            graph.get(e[1]).add(new Edge(e[0], e[2], e[3]));
        }
        
        // dist[node][budgetLeft] = minimum distance to reach node with exactly budgetLeft remaining
        // Initialize to infinity
        int[][] dist = new int[n][budget + 1];
        for (int[] row : dist) Arrays.fill(row, Integer.MAX_VALUE);
        
        PriorityQueue<State> pq = new PriorityQueue<>();
        pq.offer(new State(src, 0, budget));
        dist[src][budget] = 0;
        
        while (!pq.isEmpty()) {
            State curr = pq.poll();
            
            // Reached destination
            if (curr.node == dst) return curr.distance;
            
            // Skip if we've found a better path to this (node, budget) state
            if (curr.distance > dist[curr.node][curr.budgetLeft]) continue;
            
            for (Edge edge : graph.get(curr.node)) {
                int newBudget = curr.budgetLeft - edge.toll;
                if (newBudget < 0) continue; // Can't afford this toll
                
                int newDist = curr.distance + edge.distance;
                
                // Only proceed if this is a better path to (neighbor, newBudget)
                if (newDist < dist[edge.to][newBudget]) {
                    dist[edge.to][newBudget] = newDist;
                    pq.offer(new State(edge.to, newDist, newBudget));
                }
            }
        }
        
        return -1; // No path within budget
    }
}
```

---

## Round 3: System Design — Ola Maps Tile Serving System
**Duration:** 60 minutes

### Architecture:
```
┌───────────────────────────────────────────────────────────────┐
│              Ola Maps Tile Serving System                      │
│                                                               │
│  Map Tiles: Pre-rendered image tiles at various zoom levels   │
│  Notation: /{z}/{x}/{y}.png (zoom, column, row)              │
│                                                               │
│  Zoom levels: 0-18 (0 = whole world, 18 = street level)      │
│  Tiles per zoom: 4^z (z=0: 1 tile, z=18: ~69 billion)       │
│                                                               │
│  Serving Architecture:                                        │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Client (Mobile/Web):                                    │   │
│  │  - User pans/zooms → calculate visible tile coordinates │   │
│  │  - Request: GET /tiles/{z}/{x}/{y}.png                  │   │
│  │  - Client-side LRU cache (50MB) for recently viewed     │   │
│  │  - Request deduplication (don't re-request in-flight)   │   │
│  │  - Priority: center tiles first, then edges             │   │
│  └────────────────────────┬───────────────────────────────┘   │
│                           │                                   │
│  ┌────────────────────────▼───────────────────────────────┐   │
│  │ CDN (Cloudflare / Akamai):                              │   │
│  │  - Cache tiles at edge PoPs globally                    │   │
│  │  - Cache-Control: public, max-age=86400 (1 day)         │   │
│  │  - ~95% cache hit rate for zoom 0-14                    │   │
│  │  - Lower hit rate for zoom 15-18 (too many unique tiles)│   │
│  └────────────────────────┬───────────────────────────────┘   │
│                           │ CDN miss                          │
│  ┌────────────────────────▼───────────────────────────────┐   │
│  │ Tile Server (Stateless):                                │   │
│  │                                                         │   │
│  │ Two approaches:                                         │   │
│  │                                                         │   │
│  │ 1. Pre-rendered (Raster):                               │   │
│  │    - Tiles pre-generated for all z/x/y combinations     │   │
│  │    - Stored in S3-compatible object storage              │   │
│  │    - Fast: just a storage lookup                         │   │
│  │    - Storage: ~50 TB for India (all zoom levels)        │   │
│  │    - Update: regenerate affected tiles when map data     │   │
│  │      changes (expensive for zoom 15-18)                  │   │
│  │                                                         │   │
│  │ 2. On-demand (Vector):                                  │   │
│  │    - Store raw vector data (PostGIS / GeoJSON)           │   │
│  │    - Render tile on request using Mapnik/OpenMapTiles    │   │
│  │    - More flexible (style changes, real-time data)       │   │
│  │    - Slower: 50-200ms render time per tile               │   │
│  │    - Cache aggressively after first render               │   │
│  │                                                         │   │
│  │ Ola approach: Hybrid                                    │   │
│  │    - Pre-render zoom 0-14 (few tiles, high reuse)        │   │
│  │    - On-demand render zoom 15-18 (too many to pre-render)│   │
│  │    - Vector tiles for dynamic layers (traffic, EV)       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  Data Pipeline:                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Map Data Sources:                                       │   │
│  │  - OpenStreetMap (base map data)                        │   │
│  │  - Ola's own GPS trace data (road corrections)          │   │
│  │  - Satellite imagery (land use classification)          │   │
│  │  - Government data (boundaries, addresses)              │   │
│  │                                                         │   │
│  │ Processing Pipeline:                                    │   │
│  │  Raw data → Conflation → Tile generation → S3 + CDN     │   │
│  │  Frequency: daily batch + real-time for traffic layer    │   │
│  │                                                         │   │
│  │ Traffic overlay:                                        │   │
│  │  - Real-time GPS data from Ola drivers                  │   │
│  │  - Segment speeds → color-coded traffic tiles            │   │
│  │  - 30-second refresh, very short TTL                    │   │
│  │  - Served as separate transparent overlay tiles          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  Scale: 50M+ tile requests/day, ~5K req/sec peak             │
│  Latency: < 50ms for CDN hit, < 200ms for cache miss         │
└───────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Ola SDE-3 = **Constrained shortest path (modified Dijkstra's) + Ola Maps tile serving**
- **Constrained Dijkstra**: state = `(node, budgetLeft)` — expanded graph with `V × B` states
- **Key insight**: standard Dijkstra only tracks `dist[node]`, but with constraints need `dist[node][budget]`
- **Early termination**: return as soon as destination is popped — Dijkstra's guarantee
- **Tile system**: `/{z}/{x}/{y}.png` — quad-tree subdivision, 4^z tiles per zoom level
- **Hybrid approach**: pre-render low zoom (0-14), on-demand high zoom (15-18)
- **Traffic overlay**: separate transparent tile layer, 30s TTL, real-time from GPS traces
- **CDN caching**: 95%+ hit rate for popular zoom levels — tiles are highly cacheable (static content + unique URL)
- Ola = **maps + rides + EV** — expect geo-spatial, routing, and EV charging questions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| DSA | Very Hard | Modified Dijkstra, Budget Constraint |
| System Design | Very Hard | Maps Tile System |
| HM | Medium | Culture Fit |
