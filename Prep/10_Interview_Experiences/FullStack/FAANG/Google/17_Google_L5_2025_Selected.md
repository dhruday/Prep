# Google — L5 FullStack Interview Experience (2025) — #17

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer L5 |
| **Level** | Senior |
| **YOE** | 8 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Google Cloud Networking |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Googliness + HM)

---

## Round 1: DSA — Minimum Cost to Connect All Servers in a Network
**Duration:** 45 minutes

### Q1: Given N servers and M possible connections with costs, find the minimum cost to connect all servers. Some servers are already connected. Find the minimum additional cost.

> **This is a variation of Minimum Spanning Tree with pre-existing edges (Kruskal's with Union-Find).**

```java
import java.util.*;

/**
 * Minimum Cost to Connect All Servers (MST with Pre-existing Edges):
 * 
 * Approach:
 * 1. Union-Find: start by unioning all pre-existing connections (cost=0)
 * 2. Sort remaining candidate edges by cost
 * 3. Kruskal's: add cheapest edge if it connects two disjoint components
 * 4. Stop when all servers in one component (components == 1)
 * 
 * Time: O(M log M) for sorting + O(M α(N)) for union-find = O(M log M)
 * Space: O(N) for Union-Find
 */
class ServerNetwork {
    
    int[] parent, rank;
    int components;
    
    void init(int n) {
        parent = new int[n];
        rank = new int[n];
        components = n;
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    
    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]); // Path compression
        return parent[x];
    }
    
    boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false; // Already connected
        
        // Union by rank
        if (rank[px] < rank[py]) { int t = px; px = py; py = t; }
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        components--;
        return true;
    }
    
    /**
     * @param n Number of servers (0-indexed)
     * @param existing Pre-existing connections [u, v]
     * @param candidates Possible new connections [u, v, cost]
     * @return Minimum cost to connect all servers, or -1 if impossible
     */
    int minCostToConnectAll(int n, int[][] existing, int[][] candidates) {
        init(n);
        
        // Step 1: Apply pre-existing connections (free)
        for (int[] edge : existing) {
            union(edge[0], edge[1]);
        }
        
        if (components == 1) return 0; // Already fully connected
        
        // Step 2: Sort candidates by cost
        Arrays.sort(candidates, (a, b) -> a[2] - b[2]);
        
        // Step 3: Kruskal's — add cheapest edges that reduce components
        int totalCost = 0;
        
        for (int[] edge : candidates) {
            if (components == 1) break; // All connected
            
            if (union(edge[0], edge[1])) {
                totalCost += edge[2];
            }
        }
        
        return components == 1 ? totalCost : -1; // -1 if impossible
    }
}
```

### Follow-up: What if some connections are unreliable (probability p of failure)? Find the most reliable spanning tree.

```java
/**
 * Most Reliable Spanning Tree:
 * 
 * Reliability of a path = product of edge reliabilities.
 * Maximize ∏(p_i) = Maximize Σ(log p_i).
 * 
 * Since log(p) is negative for p < 1, maximize Σ(log p_i) = 
 * minimize Σ(-log p_i).
 * 
 * → Standard MST with weight = -log(reliability).
 */
class ReliableSpanningTree {
    
    int[] parent, rank;
    int components;
    
    void init(int n) {
        parent = new int[n]; rank = new int[n]; components = n;
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    
    int find(int x) { return parent[x] == x ? x : (parent[x] = find(parent[x])); }
    
    boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false;
        if (rank[px] < rank[py]) { int t = px; px = py; py = t; }
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        components--;
        return true;
    }
    
    /**
     * @param edges [u, v, reliability (0-1)]
     * @return Maximum overall reliability of spanning tree
     */
    double maxReliabilityMST(int n, double[][] edges) {
        init(n);
        
        // Sort by -log(reliability) ascending = log(reliability) descending
        // = reliability descending (since log is monotonic)
        Arrays.sort(edges, (a, b) -> Double.compare(b[2], a[2])); // Most reliable first
        
        double totalReliability = 1.0;
        
        for (double[] edge : edges) {
            int u = (int) edge[0], v = (int) edge[1];
            double p = edge[2];
            
            if (union(u, v)) {
                totalReliability *= p;
            }
        }
        
        return components == 1 ? totalReliability : 0.0; // 0 if disconnected
    }
}
```

---

## Round 2: System Design — Design Google Cloud VPC Networking
**Duration:** 45 minutes

### Architecture:
```
                     ┌──────────────────────────────────────────────────┐
                     │                  Control Plane                    │
                     │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
                     │  │  VPC     │ │  Subnet  │ │  Firewall Rule   │ │
                     │  │  Manager │ │  Manager │ │  Engine          │ │
                     │  └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
                     │       │            │                 │           │
                     │  ┌────┴────────────┴─────────────────┴────────┐  │
                     │  │         Network Intent Store (Spanner)     │  │
                     │  └────────────────┬──────────────────────────┘  │
                     └───────────────────┼──────────────────────────────┘
                                         │ Push config
                     ┌───────────────────┼──────────────────────────────┐
                     │    Data Plane     │                              │
                     │  ┌────────────────▼──────────────────────┐      │
                     │  │  Andromeda (Software-Defined Network)  │      │
                     │  │                                        │      │
                     │  │  ┌──────┐  ┌──────┐  ┌──────┐       │      │
                     │  │  │ VM 1 │  │ VM 2 │  │ VM 3 │       │      │
                     │  │  │ vNIC │  │ vNIC │  │ vNIC │       │      │
                     │  │  └──┬───┘  └──┬───┘  └──┬───┘       │      │
                     │  │     │EncapOuter│        │            │      │
                     │  │  ┌──┴─────────┴────────┴──────┐     │      │
                     │  │  │    Virtual Switch (OVS)     │     │      │
                     │  │  └──────────┬─────────────────┘     │      │
                     │  │             │                        │      │
                     │  │  ┌──────────▼─────────────────┐     │      │
                     │  │  │    Physical NIC (100G)      │     │      │
                     │  │  └────────────────────────────┘     │      │
                     │  └────────────────────────────────────┘      │
                     └──────────────────────────────────────────────────┘
```

### Key Design Decisions:
- **Network virtualization**: Andromeda SDN — encapsulate VM packets in outer IP header (like VXLAN)
- **Control/Data plane split**: Control plane in Spanner (strong consistency), data plane in distributed OVS
- **Firewall rules**: pushed to each host's virtual switch — evaluated at packet level, O(1) using hash-based flow tables
- **VPC peering**: transitive routing via peering hub — no single point of failure
- **Private Google Access**: VMs without external IP can reach Google APIs via internal routes
- **Scale**: millions of VMs across zones — each host pulls only relevant flow rules (per-VM filtering)

---

## 🎯 Key Takeaways
- Google L5 = **MST with pre-existing edges (Kruskal's + Union-Find) + reliability MST variant**
- **Pre-existing edges trick**: union all free edges first → Kruskal's on remaining → reduces components
- **Reliability MST**: `max ∏(p_i) = max Σ(log p_i) = min Σ(-log p_i)` → standard MST on transformed weights
- **Shortcut**: since log is monotonic, just sort by reliability descending (no log needed in Kruskal's)
- **System Design**: VPC networking = control plane (Spanner) + data plane (Andromeda SDN) separation
- **Path compression + union by rank**: O(α(N)) ≈ O(1) per operation

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 (this) | Hard | MST, Union-Find, Probability |
| Coding 2 | Hard | Graph + DP |
| System Design | Very Hard | Cloud Networking, SDN |
| Googliness | Medium | Behavioral |
| HM | Medium | Culture |
