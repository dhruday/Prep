# Graphs — Complete Pattern Guide

> *"Graphs are everywhere. Social networks, maps, dependencies, states. Whenever you see 'connections' or 'relationships,' think graph."*

---

## Table of Contents

1. [Graph Representations](#graph-representations)
2. [BFS — Breadth-First Search](#bfs--breadth-first-search)
3. [DFS — Depth-First Search](#dfs--depth-first-search)
4. [Grid as Graph](#grid-as-graph)
5. [Topological Sort](#topological-sort)
6. [Cycle Detection](#cycle-detection)
7. [Union-Find (Disjoint Set Union)](#union-find-disjoint-set-union)
8. [Shortest Paths: Dijkstra](#shortest-paths-dijkstra)
9. [Shortest Paths: Bellman-Ford](#shortest-paths-bellman-ford)
10. [Shortest Paths: Floyd-Warshall](#shortest-paths-floyd-warshall)
11. [Minimum Spanning Tree (Kruskal and Prim)](#minimum-spanning-tree-kruskal-and-prim)
12. [Bipartite Check](#bipartite-check)
13. [Strongly Connected Components](#strongly-connected-components)
14. [Bridges and Articulation Points](#bridges-and-articulation-points)
15. [Multi-State BFS](#multi-state-bfs)
16. [0-1 BFS](#0-1-bfs)
17. [Network Flow Concepts](#network-flow-concepts)

---

## Graph Representations

### Core Idea

**Adjacency List:**
- Map each node to a list of its neighbors (plus weights if needed)
- Space: O(V + E); iterate neighbors of a node: O(degree)
- **Default choice for interview problems**

**Adjacency Matrix:**
- V × V matrix; matrix[i][j] = 1 (or weight) if edge exists
- Space: O(V²); check if edge exists: O(1)
- Use when: V is small (~1000), need fast edge existence check, or dense graph

**Edge List:**
- List of (u, v, weight) tuples
- Space: O(E); primarily for Kruskal's (sort edges by weight)

### Interview Insights

- **Default to adjacency list** unless the problem requires matrix (e.g., Floyd-Warshall) or edge list (e.g., Kruskal)
- **Build the graph first** as a preprocessing step. Many interview problems give edges as input that need conversion.

---

## BFS — Breadth-First Search

### What is this approach?

**Intuition:** Explore all neighbors at distance 1, then distance 2, then distance 3… Like ripples spreading from a stone dropped in water. BFS always finds the shortest path in unweighted graphs.

### When should I use this?

- "Shortest path in unweighted graph"
- "Minimum number of steps/moves/transformations"
- "Level-order" anything (trees or graphs)
- "Nearest" or "closest" in a grid/graph
- Keywords: "minimum moves," "shortest path" (unweighted), "level," "fewest"

### When should I NOT use this?

- Weighted graphs with varying weights → Dijkstra
- Problems requiring exploration of all paths → DFS/backtracking
- Problems asking for connectivity/components without shortest paths → DFS is simpler

### Core Idea

1. Queue + visited set
2. Enqueue source, mark visited
3. While queue not empty: dequeue node, process neighbors. For each unvisited neighbor: mark visited, enqueue
4. Track distance by processing level-by-level (like tree BFS)

### Complexity

- **Time:** O(V + E)
- **Space:** O(V) for queue + visited

### Variants

- **Multi-Source BFS:** Enqueue ALL sources initially. Distances expand simultaneously from all sources. Classic: "walls and gates," "rotten oranges," "shortest distance from all buildings."
- **BFS on Grid:** Treat each cell as a node. 4 or 8 neighbors. Use visited matrix.
- **Word Ladder:** Each word is a node. Edges between words differing by one letter. BFS for shortest transformation.
- **BFS with State:** State = (position, extra_info). See Multi-State BFS section below.

### Interview Insights

- **Trap:** Mark as visited WHEN ENQUEUING, not when dequeuing. Otherwise you'll add duplicates to the queue.
- **Trap:** Multi-source BFS — don't run separate BFS from each source. Enqueue all sources first. One BFS pass.

---

## DFS — Depth-First Search

### What is this approach?

**Intuition:** Go as deep as possible before backtracking. Like exploring a maze by always taking the next unexplored turn, backtracking only when stuck.

### When should I use this?

- "Connected components" — count or identify them
- "Can I reach from A to B?"
- "Detect cycle" in directed or undirected graph
- "All paths from source to target"
- "Topological sort"
- "Island" problems (connected components in a grid)
- Keywords: "connected," "reachable," "component," "island," "path exists"

### Core Idea

1. Start at a node, mark visited
2. For each unvisited neighbor: recurse
3. After all neighbors explored: backtrack (this is where postorder processing happens)

**Iterative DFS:** Use a stack instead of recursion. Push source. While stack not empty: pop, if not visited → mark visited, push all unvisited neighbors.

### Complexity

- **Time:** O(V + E)
- **Space:** O(V) for recursion/stack + visited

### Variants

- **Count Connected Components:** Run DFS from each unvisited node. Each DFS = one component.
- **Number of Islands:** Grid DFS/BFS. Each new unvisited land cell starts a new component.
- **Flood Fill:** DFS/BFS from a starting cell, changing color.
- **Clone Graph:** DFS + HashMap (old node → new node). Recursively clone neighbors.
- **All Paths from Source to Target (DAG):** DFS with backtracking. Track current path.

### Interview Insights

- **Trap:** Iterative DFS visits nodes in a different order than recursive DFS (right-to-left vs left-to-right unless you reverse the neighbor list). For most problems this doesn't matter, but be aware.
- **Twist:** "Can you solve Number of Islands with Union-Find?" — Yes. Union adjacent land cells. Count components.

---

## Grid as Graph

### What is this approach?

**Intuition:** A 2D grid is just a graph where each cell is a node connected to its neighbors (up/down/left/right). All graph algorithms apply.

### Core Idea

- **Directions array:** [(0,1), (0,-1), (1,0), (-1,0)] for 4-directional
- **Bounds check:** 0 ≤ nr < rows and 0 ≤ nc < cols
- **Visited:** Use a separate visited matrix OR modify the grid in-place (overwrite with a sentinel value)

### Common Grid Problems

| Problem | Technique |
|---|---|
| Number of Islands | DFS/BFS from each unvisited '1' |
| Surrounded Regions | Start from border 'O's — mark as safe — flip rest |
| Pacific Atlantic Water Flow | Multi-source BFS/DFS from each ocean border, find intersection |
| Shortest Path in Binary Matrix | BFS from (0,0) to (n-1,n-1) |
| Rotting Oranges | Multi-source BFS from all rotten oranges |
| 01 Matrix | Multi-source BFS from all 0s |
| Walls and Gates | Multi-source BFS from all gates |

### Interview Insights

- **Trap:** Surrounded Regions — don't start from interior. Start from borders (outside-in).
- **Pattern:** "Expand from boundaries" — for problems like Pacific Atlantic, Surrounded Regions. Start DFS/BFS from edges of the grid.

---

## Topological Sort

### What is this approach?

**Intuition:** Order tasks so that for every dependency A → B, A comes before B. Like a course prerequisite chain — you must take prerequisites first.

### When should I use this?

- "Order of tasks with dependencies"
- "Course schedule" — can I finish all courses?
- "Alien dictionary" — derive letter ordering
- "Compile order"
- Keywords: "prerequisite," "ordering," "dependency," "schedule," "before"

### When should I NOT use this?

- Undirected graphs (topological sort only applies to DAGs)
- If the graph has a cycle → no valid topological order exists

### Core Idea

**Kahn's Algorithm (BFS-based):**
1. Compute in-degree for every node
2. Enqueue all nodes with in-degree 0
3. While queue not empty: dequeue node → add to result → for each neighbor: decrement in-degree. If in-degree becomes 0: enqueue.
4. If result length < V → cycle exists (not a DAG)

**DFS-based:**
1. DFS from each unvisited node. After visiting all descendants (postorder), push node to stack.
2. Stack order (reversed postorder) = topological order.
3. Detect cycle using three states: white (unvisited), gray (in-progress), black (done). A gray→gray edge = cycle.

### Complexity

- **Time:** O(V + E)
- **Space:** O(V + E)

### Variants

- **Course Schedule I:** "Can I finish?" → Check if topological sort includes all courses (no cycle)
- **Course Schedule II:** "What order?" → Return the topological order
- **Alien Dictionary:** Build graph from adjacent word comparisons. First differing character gives an edge. Topological sort = alien alphabet order.
- **Parallel Courses:** "Minimum semesters?" → BFS topological sort, count levels. Each level = one semester.
- **All Topological Orders:** Backtracking on Kahn's — at each step, try all zero-in-degree nodes.

### Interview Insights

- **Trap:** Alien Dictionary — compare only ADJACENT words in the sorted list, not all pairs. Also handle the edge case where a longer word comes before its prefix (invalid).
- **Twist:** "Unique topological order?" → Yes, if at every step exactly one node has in-degree 0 in Kahn's.

---

## Cycle Detection

### Core Idea

**Undirected Graph:**
- DFS: If you visit a neighbor that's already visited AND it's not the parent → cycle
- Union-Find: If two endpoints of an edge are already in the same set → cycle

**Directed Graph:**
- DFS with three colors: white (unvisited), gray (in current DFS path), black (fully processed)
- A back edge (current → gray node) = cycle
- Kahn's: If topological sort doesn't include all nodes → cycle

### Interview Insights

- **Trap:** In undirected graphs, tracking the parent is essential to avoid false positives (edge back to parent is NOT a cycle).
- **Pattern:** Cycle detection is typically a sub-step within a larger problem (course schedule, deadlock detection, valid tree check).

---

## Union-Find (Disjoint Set Union)

### What is this approach?

**Intuition:** Group elements into sets that can be merged. Like name tags at a party — everyone in the same group wears the same tag. Two operations: find which group you belong to, and union two groups.

### When should I use this?

- "Are these two nodes connected?"
- "How many connected components?"
- "Merge groups dynamically as edges are added"
- Kruskal's MST
- "Redundant connection" — find the extra edge that creates a cycle
- Keywords: "connected components," "merge," "group," "redundant," "cycle in undirected"

### Core Idea

1. `parent[]` array: parent[x] = parent of x. Root: parent[x] = x
2. `find(x)`: Follow parent pointers to root. **Path compression:** Make all nodes point directly to root.
3. `union(x, y)`: Find roots. If different, merge one into the other. **Union by rank/size:** Attach smaller tree under larger.

### Complexity

- **Time:** O(α(n)) ≈ O(1) amortized per operation (with path compression + union by rank)
- **Space:** O(n)

### Variants

- **Redundant Connection:** Process edges one by one. Union-Find each edge. The one that connects two already-connected nodes is redundant.
- **Number of Connected Components:** n - (number of union operations that succeeded)
- **Accounts Merge:** Emails as nodes. Union emails belonging to the same account. Group by root.
- **Satisfiability (990):** Union equal variables. Check if any unequal pair shares a root.

### Interview Insights

- **Trap:** Always use both path compression AND union by rank. Without both, worst case is O(n).
- **Twist:** "What's the advantage over DFS for connected components?" — Union-Find handles DYNAMIC connectivity (edges added over time). DFS requires a full pass each time.

---

## Shortest Paths: Dijkstra

### What is this approach?

**Intuition:** Greedy BFS with a priority queue. Always expand the node with the smallest known distance. Like water flowing downhill — it fills the closest basins first.

### When should I use this?

- "Shortest path in weighted graph with non-negative weights"
- "Minimum cost to reach"
- Keywords: "shortest path," "minimum cost," "weighted graph" (non-negative)

### When should I NOT use this?

- Negative edge weights → Bellman-Ford
- Unweighted graph → plain BFS is simpler and sufficient
- All-pairs shortest paths needed → Floyd-Warshall

### Core Idea

1. dist[] initialized to ∞, dist[source] = 0
2. Priority queue (min-heap): enqueue (0, source)
3. While PQ not empty: extract min (d, u). If d > dist[u]: skip (stale entry). For each neighbor v with weight w: if dist[u] + w < dist[v]: update dist[v], enqueue (dist[v], v).

### Complexity

- **Time:** O((V + E) log V) with binary heap
- **Space:** O(V + E)

### Variants

- **Network Delay Time:** Standard Dijkstra from source. Answer = max of all distances.
- **Cheapest Flights Within K Stops:** Modified Dijkstra/BFS with state (node, stops). Or use Bellman-Ford with K iterations.
- **Path with Minimum Effort:** Dijkstra where "weight" = absolute height difference. Minimize the maximum edge weight on path.
- **Swim in Rising Water:** Dijkstra on grid, weight = max elevation on path.

### Interview Insights

- **Trap:** Dijkstra FAILS with negative weights. Always verify the problem has non-negative weights.
- **Trap:** Don't mark as "visited" — use the "if d > dist[u]: skip" check instead. This handles multiple entries in the PQ.
- **Twist:** "What if K stops limit?" — State = (node, remaining_stops). Explore with modified relaxation.

---

## Shortest Paths: Bellman-Ford

### What is this approach?

**Intuition:** Relax ALL edges V-1 times. Each pass guarantees the shortest path using at most one more edge. After V-1 passes, we've found paths using up to V-1 edges (enough for any shortest path without negative cycles).

### When should I use this?

- Negative edge weights present
- Need to detect negative weight cycles
- "Cheapest Flights Within K Stops" (run only K+1 iterations)

### Core Idea

1. dist[] initialized to ∞, dist[source] = 0
2. Repeat V-1 times: for each edge (u, v, w): if dist[u] + w < dist[v]: update dist[v]
3. One more pass: if any distance still decreases → negative cycle exists

### Complexity

- **Time:** O(V × E)
- **Space:** O(V)

### Variants

- **SPFA (Shortest Path Faster Algorithm):** Queue-based optimization of Bellman-Ford. Average O(E), worst O(V × E).
- **Cheapest Flights Within K Stops:** Run only K+1 relaxation passes. Use a copy of distances from previous iteration to avoid "chain" updates within one pass.

### Interview Insights

- **Trap:** Cheapest Flights — must use a copy of dist[] from previous iteration, not update in place. Otherwise a single iteration can propagate through multiple edges.

---

## Shortest Paths: Floyd-Warshall

### What is this approach?

**Intuition:** Consider every node as a potential "waypoint." For each pair (i, j), check: "Is it shorter to go through node k?" The triple loop systematically checks all intermediaries.

### When should I use this?

- "Shortest paths between ALL pairs of nodes"
- Small graph (V ≤ 400 or so)
- Keywords: "all pairs," "distance matrix"

### Core Idea

1. dist[i][j] = weight of edge (i,j), or ∞ if no edge
2. For k = 0 to V-1: for i = 0 to V-1: for j = 0 to V-1: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])

### Complexity

- **Time:** O(V³)
- **Space:** O(V²)

### Interview Insights

- **Trap:** The k loop MUST be the outermost loop. This is the key correctness requirement.
- **Twist:** Can detect negative cycles: if dist[i][i] < 0 for any i.

---

## Minimum Spanning Tree (Kruskal and Prim)

### What is this approach?

**Intuition:** Connect all nodes with minimum total edge weight, without cycles. Like building the cheapest road network connecting all cities.

### Core Ideas

**Kruskal's:**
1. Sort all edges by weight
2. Process edges smallest first. For each: if it connects two different components (Union-Find), add it to MST
3. Stop after V-1 edges

**Prim's:**
1. Start from any node. Add it to MST.
2. Add all its edges to a priority queue.
3. Extract minimum edge. If it connects to a non-MST node, add that node and its edges. Repeat.

### Complexity

- **Kruskal's:** O(E log E) — dominated by sorting
- **Prim's:** O((V + E) log V) with binary heap

### Variants

- **Min Cost to Connect All Points:** Manhattan distance as weight. Kruskal or Prim.
- **Critical and Pseudo-Critical Edges in MST:** For each edge: try WITHOUT it (if MST cost increases → critical); try FORCING it (if MST cost equals original → pseudo-critical).

### Interview Insights

- **Choice:** Kruskal is simpler to implement with Union-Find. Prim is better for dense graphs. Default to Kruskal in interviews.
- **Trap:** MST is NOT a shortest path tree. MST minimizes TOTAL weight. Shortest path tree minimizes individual path weights.

---

## Bipartite Check

### What is this approach?

**Intuition:** Can you color every node with one of two colors such that no two adjacent nodes share the same color? Like assigning people to two teams where no two friends are on the same team.

### Core Idea

1. BFS/DFS coloring. Start with color 0. Assign opposite color to all neighbors.
2. If a neighbor already has the same color → NOT bipartite.
3. Handle disconnected: check all components.

### Complexity

- **Time:** O(V + E)
- **Space:** O(V)

### Interview Insights

- **Key fact:** A graph is bipartite if and only if it contains NO odd-length cycle.
- **Application:** "Is Graph Bipartite?" and "Possible Bipartition" are classic. Also used in matching problems.

---

## Strongly Connected Components

### What is this approach?

**Intuition:** In a directed graph, an SCC is a maximal group where every node can reach every other node. Like a group of friends who all know each other (directly or indirectly, in both directions).

### Core Ideas

**Kosaraju's:**
1. DFS on original graph → record finish order (postorder)
2. Reverse all edges
3. DFS on reversed graph in reverse finish order → each DFS tree is an SCC

**Tarjan's:**
1. DFS with discovery time and low-link values
2. low[u] = min discovery time reachable from u's subtree
3. If low[u] = disc[u] → u is the root of an SCC. Pop the stack to get the SCC members.

### Complexity

- **Time:** O(V + E) for both
- **Space:** O(V)

### Interview Insights

- **Rarity:** SCCs are less common in interviews but appear in hard problems.
- **Application:** Critical connections, DAG of SCCs (condensation graph), 2-SAT.

---

## Bridges and Articulation Points

### What is this approach?

**Intuition:** A bridge is an edge whose removal disconnects the graph. An articulation point is a node whose removal disconnects the graph. These are "critical" elements.

### Core Idea (Tarjan's Approach)

1. DFS with disc[] and low[] arrays
2. **Bridge:** Edge (u, v) is a bridge if low[v] > disc[u] — meaning v cannot reach u or anything above u without the edge (u, v)
3. **Articulation Point:** Node u is an articulation point if:
   - u is root and has ≥ 2 DFS children, OR
   - u is not root and has a child v where low[v] ≥ disc[u]

### Complexity

- **Time:** O(V + E)
- **Space:** O(V)

### Interview Insights

- **Problem:** "Critical Connections in a Network" — find all bridges. Direct application of Tarjan's bridge-finding.

---

## Multi-State BFS

### What is this approach?

**Intuition:** Standard BFS where the "state" includes more than just position. You might need to track (position, keys_collected), (position, walls_broken), (position, fuel_remaining), etc. The state space expands, but BFS still finds the shortest path IN THAT STATE SPACE.

### When should I use this?

- "Shortest path with constraints" (keys, walls, fuel)
- "Shortest Path in a Grid with Obstacles Elimination"
- "Shortest Path to Get All Keys"
- Keywords: "at most K obstacles," "collect all keys," "minimum steps with constraint"

### Core Idea

1. State = (row, col, extra_dimension). Example: (row, col, walls_remaining)
2. visited is a set of states (not just positions)
3. BFS on this expanded state space

### Complexity

- **Time:** O(V × S) where S = number of possible extra states (e.g., K+1 for K obstacles)
- **Space:** O(V × S)

### Interview Insights

- **Trap:** visited must track the FULL state. Visiting (r,c) with 3 walls remaining is different from visiting (r,c) with 2 walls remaining.
- **Pattern:** When BFS alone doesn't work because of an extra constraint → add that constraint to the state.

---

## 0-1 BFS

### What is this approach?

**Intuition:** Dijkstra for graphs where edge weights are only 0 or 1. Use a deque instead of a priority queue. Weight-0 edges → push to front. Weight-1 edges → push to back. This maintains the sorted order property of Dijkstra without the log(V) overhead.

### When should I use this?

- Graph with only 0 and 1 edge weights
- "Minimum flips/changes to reach a target" (flipping = cost 1, not flipping = cost 0)

### Complexity

- **Time:** O(V + E) — better than Dijkstra's O((V+E) log V)
- **Space:** O(V)

### Interview Insights

- **Pattern:** Recognize when edge weights are binary → 0-1 BFS. It's a deque-based Dijkstra.

---

## Network Flow Concepts

### What is this approach?

**Intuition:** Model as a flow network: source, sink, edges with capacities. Find the maximum flow from source to sink. Max-flow equals min-cut (the minimum total capacity of edges that, if removed, disconnect source from sink).

### When should I use this?

- "Maximum bipartite matching"
- "Minimum cut"
- Very rare in interviews but appears in hard problems

### Core Idea

**Ford-Fulkerson:** Repeatedly find augmenting paths (source → sink with available capacity). Send flow along the path. Update residual graph. Repeat until no augmenting path exists.

**Edmonds-Karp:** Ford-Fulkerson with BFS for augmenting paths. O(V × E²).

### Interview Insights

- **Rarity:** Rarely required. Mentioning it shows breadth. The key insight to carry: **max-flow = min-cut**.
- **Application:** Maximum bipartite matching = max-flow with source/sink connected to the two sides.

---

*Next: [12-HEAPS-AND-PRIORITY-QUEUES.md](12-HEAPS-AND-PRIORITY-QUEUES.md) — The "give me the best so far" data structure.*
