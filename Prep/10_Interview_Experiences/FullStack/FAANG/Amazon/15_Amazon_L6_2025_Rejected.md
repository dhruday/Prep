# Amazon — L6 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-3 (Senior) |
| **Level** | L6 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 4 Onsite: 2 Coding + System Design + Bar Raiser)
- **Timeline:** 3 weeks
- **Format:** Virtual Loop

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Optimize Warehouse Picking Routes**
   - Given a warehouse grid with item locations, find the optimal path to pick all items in an order.
   - Minimize total walking distance. Items must not exceed weight capacity.
   - Essentially: Traveling Salesman variant on a 2D grid.

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class WarehousePickingOptimizer {

    static class Point {
        int row, col;
        String itemId;
        double weight;

        Point(int row, int col, String itemId, double weight) {
            this.row = row;
            this.col = col;
            this.itemId = itemId;
            this.weight = weight;
        }
    }

    /**
     * BFS-based shortest distance between any two points in grid.
     * Precompute all-pairs distances for the items + start position.
     */
    static int[][] computeDistances(int rows, int cols, List<Point> points, boolean[][] blocked) {
        int n = points.size();
        int[][] dist = new int[n][n];

        for (int i = 0; i < n; i++) {
            int[] bfsDistances = bfsFrom(rows, cols, points.get(i), blocked);
            for (int j = 0; j < n; j++) {
                dist[i][j] = bfsDistances[points.get(j).row * cols + points.get(j).col];
            }
        }
        return dist;
    }

    private static int[] bfsFrom(int rows, int cols, Point start, boolean[][] blocked) {
        int[] dist = new int[rows * cols];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[start.row * cols + start.col] = 0;

        Queue<int[]> queue = new LinkedList<>();
        queue.offer(new int[]{start.row, start.col});
        int[][] dirs = {{0, 1}, {0, -1}, {1, 0}, {-1, 0}};

        while (!queue.isEmpty()) {
            int[] pos = queue.poll();
            int r = pos[0], c = pos[1];
            int curDist = dist[r * cols + c];

            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                    && !blocked[nr][nc]
                    && curDist + 1 < dist[nr * cols + nc]) {
                    dist[nr * cols + nc] = curDist + 1;
                    queue.offer(new int[]{nr, nc});
                }
            }
        }
        return dist;
    }

    /**
     * TSP via bitmask DP.
     * dp[mask][i] = minimum distance to visit items in 'mask' ending at item i.
     *
     * Time: O(2^N * N^2) where N = number of items
     * Space: O(2^N * N)
     *
     * Practical for N ≤ 20 items per order (typical warehouse constraint).
     */
    static int[] solveTSP(int[][] dist, int n) {
        int fullMask = (1 << n) - 1;
        int[][] dp = new int[1 << n][n];
        int[][] parent = new int[1 << n][n];

        for (int[] row : dp) Arrays.fill(row, Integer.MAX_VALUE);
        for (int[] row : parent) Arrays.fill(row, -1);

        // Start from node 0 (start position)
        dp[1][0] = 0;

        for (int mask = 1; mask <= fullMask; mask++) {
            for (int u = 0; u < n; u++) {
                if ((mask & (1 << u)) == 0 || dp[mask][u] == Integer.MAX_VALUE) continue;

                for (int v = 0; v < n; v++) {
                    if ((mask & (1 << v)) != 0 || dist[u][v] == Integer.MAX_VALUE) continue;

                    int newMask = mask | (1 << v);
                    int newDist = dp[mask][u] + dist[u][v];

                    if (newDist < dp[newMask][v]) {
                        dp[newMask][v] = newDist;
                        parent[newMask][v] = u;
                    }
                }
            }
        }

        // Find best end point and reconstruct path
        int minDist = Integer.MAX_VALUE;
        int lastNode = -1;
        for (int i = 1; i < n; i++) {
            int totalDist = dp[fullMask][i] + dist[i][0]; // return to start
            if (totalDist < minDist) {
                minDist = totalDist;
                lastNode = i;
            }
        }

        // Reconstruct
        int[] path = new int[n];
        int mask = fullMask;
        for (int idx = n - 1; idx >= 0; idx--) {
            path[idx] = lastNode;
            int prev = parent[mask][lastNode];
            mask ^= (1 << lastNode);
            lastNode = prev;
        }

        return path;
    }

    /**
     * Follow-up: Weight capacity constraint.
     * Split items into batches that fit capacity, then solve TSP per batch.
     */
    static List<List<Point>> batchByCapacity(List<Point> items, double maxWeight) {
        List<List<Point>> batches = new ArrayList<>();
        
        // Greedy: order by proximity, fill batches until capacity reached
        List<Point> remaining = new ArrayList<>(items);
        while (!remaining.isEmpty()) {
            List<Point> batch = new ArrayList<>();
            double currentWeight = 0;

            Iterator<Point> it = remaining.iterator();
            while (it.hasNext()) {
                Point item = it.next();
                if (currentWeight + item.weight <= maxWeight) {
                    batch.add(item);
                    currentWeight += item.weight;
                    it.remove();
                }
            }
            batches.add(batch);
        }
        return batches;
    }

    public static void main(String[] args) {
        int rows = 10, cols = 10;
        boolean[][] blocked = new boolean[rows][cols];

        // Start position + 5 items to pick
        List<Point> points = new ArrayList<>();
        points.add(new Point(0, 0, "START", 0));     // index 0: start
        points.add(new Point(2, 3, "ITEM-A", 2.5));
        points.add(new Point(5, 7, "ITEM-B", 1.8));
        points.add(new Point(1, 8, "ITEM-C", 3.0));
        points.add(new Point(7, 2, "ITEM-D", 2.2));
        points.add(new Point(9, 9, "ITEM-E", 1.5));

        int[][] dist = computeDistances(rows, cols, points, blocked);
        int[] path = solveTSP(dist, points.size());

        System.out.println("Optimal picking route:");
        int totalDist = 0;
        for (int i = 0; i < path.length; i++) {
            Point p = points.get(path[i]);
            System.out.printf("  %d. %s (%d,%d)%n", i + 1, p.itemId, p.row, p.col);
            if (i > 0) totalDist += dist[path[i - 1]][path[i]];
        }
        totalDist += dist[path[path.length - 1]][0]; // return to start
        System.out.println("Total distance: " + totalDist + " steps");
    }
}
```

## Round 2: Coding Onsite 1
**Duration:** 60 minutes
**LP Focus:** Invent and Simplify

### Questions Asked
1. **Design a LRU Cache with TTL eviction** — similar to Redis EXPIRE functionality

## Round 3: Coding Onsite 2
**Duration:** 60 minutes
**LP Focus:** Bias for Action

### Questions Asked
1. **Find Minimum Window Substring** — classic sliding window with character counts

## Round 4: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Amazon's Order Tracking System**
   - Real-time package tracking across fulfillment centers
   - Push notifications on status changes
   - Handle 100M+ active orders

## Round 5: Bar Raiser
**Duration:** 60 minutes
**LP Focus:** Earn Trust, Have Backbone

### Result
- Rejected — Bar Raiser felt the system design lacked depth on failure handling and the behavioral stories didn't demonstrate enough L6-level scope
- Feedback: "Strong coder, needs to demonstrate more org-level impact for L6"

## 🎯 Key Takeaways
- Amazon L6 expects **org-level impact stories** in behavioral rounds — project-level isn't enough
- TSP with bitmask DP is a practical algorithm for warehouse optimization (N ≤ 20)
- Bar Raiser round is truly independent — they can and will reject despite strong coding
- System design at L6 needs **failure modes, SLAs, and operational excellence** discussion
- Always tie each answer to an **Amazon Leadership Principle**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Hard | TSP, BFS on Grid, Bitmask DP |
| Coding 1 | Medium-Hard | LRU + TTL, LinkedHashMap |
| Coding 2 | Medium | Sliding Window, Two Pointers |
| System Design | Hard | Order Tracking, Event Streaming |
| Bar Raiser | Hard | Behavioral, L6 Scope |
