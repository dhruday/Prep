# LinkedIn — Staff FullStack Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Staff Software Engineer |
| **Level** | Staff |
| **YOE** | 10 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Sunnyvale, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Behavioral + HM)

---

## Round 1: DSA — Social Network Influence Propagation
**Duration:** 45 minutes

### Q1: Given a social network graph, find the minimum set of users to "seed" so that influence propagates to ALL users. A user becomes influenced if at least K of their connections are already influenced. This is the Minimum Seed Set problem.

```java
import java.util.*;

/**
 * Minimum Seed Set for Influence Propagation:
 * 
 * Model: Linear Threshold Model
 * - Each user has connections with weights
 * - User becomes influenced if sum of influenced neighbor weights >= threshold
 * - Find minimum seed set to influence ALL users
 * 
 * This is NP-Hard in general. Greedy approximation:
 * 1. Start with all nodes as potential seeds
 * 2. Simulate propagation
 * 3. Greedily remove seeds that are not needed (influenced by others)
 * 
 * Alternative for K-threshold (unweighted):
 * - Iteratively remove nodes with in-degree >= K from seed set
 * - They'll be influenced by their already-influenced neighbors
 */
class InfluencePropagation {
    
    /**
     * K-Threshold Influence: user activated if >= K neighbors are active.
     * Find minimum seed set.
     * 
     * Approach (Reverse Peeling):
     * 1. Start: all nodes are seeds
     * 2. Find a seed node s where, if we remove it from seeds,
     *    it would still get activated (>= K of its neighbors are seeds/will be active)
     * 3. Remove s from seeds
     * 4. Repeat until no more removable seeds
     * 
     * Greedy heuristic — not optimal but good approximation.
     * 
     * Time: O(V × (V + E)) in worst case
     */
    Set<Integer> minimumSeedSet(Map<Integer, List<Integer>> graph, int k) {
        Set<Integer> seeds = new HashSet<>(graph.keySet());
        
        boolean changed = true;
        while (changed) {
            changed = false;
            
            for (int node : new ArrayList<>(seeds)) {
                // Try removing this node from seeds
                seeds.remove(node);
                
                // Simulate propagation without this seed
                if (simulateCanActivateAll(graph, seeds, k)) {
                    changed = true; // Successfully removed
                    break; // Start over (greedy restart)
                } else {
                    seeds.add(node); // Can't remove — add back
                }
            }
        }
        
        return seeds;
    }
    
    /**
     * Simulate influence propagation from seed set.
     * BFS-like: activate node when >= K active neighbors.
     * 
     * @return true if ALL nodes become active
     */
    boolean simulateCanActivateAll(Map<Integer, List<Integer>> graph, Set<Integer> seeds, int k) {
        Set<Integer> active = new HashSet<>(seeds);
        Queue<Integer> queue = new LinkedList<>(seeds);
        
        // For each inactive node, track how many active neighbors it has
        Map<Integer, Integer> activeNeighborCount = new HashMap<>();
        for (int node : graph.keySet()) {
            if (!active.contains(node)) {
                int count = 0;
                for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
                    if (active.contains(neighbor)) count++;
                }
                activeNeighborCount.put(node, count);
            }
        }
        
        // Process BFS — when a node becomes active, update its neighbors
        while (!queue.isEmpty()) {
            int current = queue.poll();
            
            for (int neighbor : graph.getOrDefault(current, Collections.emptyList())) {
                if (active.contains(neighbor)) continue;
                
                int newCount = activeNeighborCount.merge(neighbor, 1, Integer::sum);
                
                // Check if neighbor should activate
                if (newCount >= k) {
                    active.add(neighbor);
                    queue.offer(neighbor);
                }
            }
        }
        
        return active.size() == graph.size();
    }
    
    /**
     * Greedy Influence Maximization (Kempe et al.):
     * Find a set of exactly S seeds that maximizes the total number of activated users.
     * 
     * Greedy: repeatedly pick the node that gives maximum marginal gain.
     * Submodular optimization → (1 - 1/e) approximation guarantee.
     */
    List<Integer> greedyInfluenceMax(Map<Integer, List<Integer>> graph, int k, int seedBudget) {
        List<Integer> seeds = new ArrayList<>();
        Set<Integer> seedSet = new HashSet<>();
        
        for (int s = 0; s < seedBudget; s++) {
            int bestNode = -1;
            int bestSpread = 0;
            
            for (int candidate : graph.keySet()) {
                if (seedSet.contains(candidate)) continue;
                
                // Simulate spread with candidate added
                Set<Integer> trialSeeds = new HashSet<>(seedSet);
                trialSeeds.add(candidate);
                
                int spread = simulateSpread(graph, trialSeeds, k);
                
                if (spread > bestSpread) {
                    bestSpread = spread;
                    bestNode = candidate;
                }
            }
            
            if (bestNode == -1) break;
            seeds.add(bestNode);
            seedSet.add(bestNode);
        }
        
        return seeds;
    }
    
    int simulateSpread(Map<Integer, List<Integer>> graph, Set<Integer> seeds, int k) {
        Set<Integer> active = new HashSet<>(seeds);
        Queue<Integer> queue = new LinkedList<>(seeds);
        Map<Integer, Integer> counts = new HashMap<>();
        
        while (!queue.isEmpty()) {
            int curr = queue.poll();
            for (int neighbor : graph.getOrDefault(curr, Collections.emptyList())) {
                if (active.contains(neighbor)) continue;
                int count = counts.merge(neighbor, 1, Integer::sum);
                if (count >= k) {
                    active.add(neighbor);
                    queue.offer(neighbor);
                }
            }
        }
        
        return active.size();
    }
}
```

---

## 🎯 Key Takeaways
- LinkedIn Staff = **Influence propagation — seed set optimization + greedy influence maximization**
- **K-threshold model**: user activates when ≥K neighbors are active — models viral content/endorsements
- **Minimum seed set**: NP-Hard → greedy removal: start with all seeds, try removing one at a time
- **BFS simulation**: when node activates, increment neighbors' active-neighbor count → check threshold
- **Greedy influence maximization (Kempe)**: pick node with max marginal spread — submodular → (1-1/e) ≈ 63% optimal
- **Real-world**: LinkedIn "People You May Know", content distribution, endorsement chains
- **Rejection reason**: system design round on LinkedIn Feed didn't adequately address consistency vs availability tradeoffs at Staff scope

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 (this) | Very Hard | Graph, BFS, Influence Propagation |
| Coding 2 | Hard | DP |
| System Design | Very Hard | LinkedIn Feed Architecture |
| Behavioral | Hard | Staff scope |
| HM | Medium | Culture |
