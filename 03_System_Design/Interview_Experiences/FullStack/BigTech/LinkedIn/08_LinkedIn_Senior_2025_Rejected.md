# LinkedIn — Senior SWE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Senior Software Engineer |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Sunnyvale, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + 2 Coding + System Design)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Coding — Implement a Connection Degree Calculator
**Duration:** 45 minutes

### Problem
Given a social graph, find the degree of connection between two users (1st, 2nd, 3rd degree). If beyond 3rd degree, return -1. Optimize for millions of users.

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class ConnectionDegreeCalculator {

    private final Map<Integer, Set<Integer>> graph; // userId -> connections

    public ConnectionDegreeCalculator() {
        this.graph = new HashMap<>();
    }

    public void addConnection(int user1, int user2) {
        graph.computeIfAbsent(user1, k -> new HashSet<>()).add(user2);
        graph.computeIfAbsent(user2, k -> new HashSet<>()).add(user1);
    }

    /**
     * Bidirectional BFS — meets in the middle.
     * Time: O(b^(d/2)) where b = avg degree, d = shortest path length
     * Much faster than single BFS which is O(b^d).
     * 
     * For LinkedIn's graph with avg ~500 connections:
     * - Single BFS for 3rd degree: 500^3 = 125M nodes
     * - Bidirectional BFS: 2 * 500^1.5 ≈ 22K nodes
     */
    public int degreeOfConnection(int source, int target) {
        if (source == target) return 0;
        if (!graph.containsKey(source) || !graph.containsKey(target)) return -1;

        // Forward BFS from source
        Set<Integer> visitedFromSource = new HashSet<>();
        Map<Integer, Integer> distFromSource = new HashMap<>();
        Queue<Integer> queueSource = new LinkedList<>();

        // Backward BFS from target
        Set<Integer> visitedFromTarget = new HashSet<>();
        Map<Integer, Integer> distFromTarget = new HashMap<>();
        Queue<Integer> queueTarget = new LinkedList<>();

        visitedFromSource.add(source);
        distFromSource.put(source, 0);
        queueSource.offer(source);

        visitedFromTarget.add(target);
        distFromTarget.put(target, 0);
        queueTarget.offer(target);

        int maxDegree = 3; // LinkedIn only shows up to 3rd degree

        while (!queueSource.isEmpty() || !queueTarget.isEmpty()) {
            // Expand from the smaller frontier (optimization)
            int result;

            if (!queueSource.isEmpty() &&
                (queueTarget.isEmpty() || queueSource.size() <= queueTarget.size())) {
                result = expandLevel(queueSource, visitedFromSource, distFromSource,
                    visitedFromTarget, distFromTarget, maxDegree);
            } else {
                result = expandLevel(queueTarget, visitedFromTarget, distFromTarget,
                    visitedFromSource, distFromSource, maxDegree);
            }

            if (result != -1) {
                return result <= maxDegree ? result : -1;
            }

            // Check if both sides exceeded max depth
            int minSourceDist = queueSource.isEmpty() ? Integer.MAX_VALUE
                : distFromSource.getOrDefault(queueSource.peek(), Integer.MAX_VALUE);
            int minTargetDist = queueTarget.isEmpty() ? Integer.MAX_VALUE
                : distFromTarget.getOrDefault(queueTarget.peek(), Integer.MAX_VALUE);

            if (minSourceDist + minTargetDist > maxDegree) break;
        }

        return -1;
    }

    private int expandLevel(Queue<Integer> queue, Set<Integer> visited,
                             Map<Integer, Integer> dist,
                             Set<Integer> otherVisited,
                             Map<Integer, Integer> otherDist,
                             int maxDegree) {
        if (queue.isEmpty()) return -1;

        int current = queue.poll();
        int currentDist = dist.get(current);

        if (currentDist >= maxDegree) return -1;

        for (int neighbor : graph.getOrDefault(current, Collections.emptySet())) {
            if (visited.contains(neighbor)) continue;

            visited.add(neighbor);
            dist.put(neighbor, currentDist + 1);
            queue.offer(neighbor);

            // Check if other side has visited this node
            if (otherVisited.contains(neighbor)) {
                return currentDist + 1 + otherDist.get(neighbor);
            }
        }

        return -1;
    }

    /**
     * Get all connections at a specific degree level.
     * Used for "People You May Know" feature.
     */
    public List<Integer> getConnectionsAtDegree(int userId, int degree) {
        if (degree <= 0 || !graph.containsKey(userId)) return Collections.emptyList();

        Set<Integer> visited = new HashSet<>();
        Queue<Integer> queue = new LinkedList<>();
        visited.add(userId);
        queue.offer(userId);

        int level = 0;
        while (!queue.isEmpty() && level < degree) {
            int size = queue.size();
            for (int i = 0; i < size; i++) {
                int current = queue.poll();
                for (int neighbor : graph.getOrDefault(current, Collections.emptySet())) {
                    if (!visited.contains(neighbor)) {
                        visited.add(neighbor);
                        queue.offer(neighbor);
                    }
                }
            }
            level++;
        }

        // Queue now contains nodes at exactly `degree` distance
        return new ArrayList<>(queue);
    }

    /**
     * Count mutual connections between two users.
     * Used for profile display: "25 mutual connections"
     */
    public int countMutualConnections(int user1, int user2) {
        Set<Integer> conn1 = graph.getOrDefault(user1, Collections.emptySet());
        Set<Integer> conn2 = graph.getOrDefault(user2, Collections.emptySet());

        // Iterate over the smaller set
        Set<Integer> smaller = conn1.size() < conn2.size() ? conn1 : conn2;
        Set<Integer> larger = conn1.size() < conn2.size() ? conn2 : conn1;

        int count = 0;
        for (int id : smaller) {
            if (larger.contains(id)) count++;
        }
        return count;
    }

    public static void main(String[] args) {
        ConnectionDegreeCalculator calc = new ConnectionDegreeCalculator();

        // Build a small social graph
        calc.addConnection(1, 2);
        calc.addConnection(1, 3);
        calc.addConnection(2, 4);
        calc.addConnection(3, 4);
        calc.addConnection(4, 5);
        calc.addConnection(5, 6);
        calc.addConnection(6, 7);
        calc.addConnection(7, 8);

        System.out.println("Degree 1→2: " + calc.degreeOfConnection(1, 2)); // 1
        System.out.println("Degree 1→4: " + calc.degreeOfConnection(1, 4)); // 2
        System.out.println("Degree 1→6: " + calc.degreeOfConnection(1, 6)); // 3 (1-2-4-5-6 or shorter)
        System.out.println("Degree 1→8: " + calc.degreeOfConnection(1, 8)); // -1 (>3)

        System.out.println("Mutual(1,4): " + calc.countMutualConnections(1, 4)); // 2 (users 2,3)
        System.out.println("2nd degree of 1: " + calc.getConnectionsAtDegree(1, 2)); // [4]
    }
}
```

## 🎯 Key Takeaways
- LinkedIn loves **graph/social network** problems — degree of connection, mutual connections
- **Bidirectional BFS** is crucial for large graphs — reduces complexity from O(b^d) to O(b^(d/2))
- Always expand from the smaller frontier for optimal performance
- Limit search depth (3 for LinkedIn) to prevent exploring entire graph
- Mutual connections: iterate smaller set, check membership in larger set

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | BFS, Bidirectional Search, Graph |
| Coding 2 | Hard | Topological Sort, Graph Algorithms |
| System Design | Hard | LinkedIn Feed System |
