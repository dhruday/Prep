# Graphs — Google Interview Deep Dive

> **11 algorithms covered:** BFS (Shortest Path Unweighted) · DFS (Connected Components / Cycle Detection) · Topological Sort (Kahn's Algorithm) · Dijkstra (Weighted Shortest Path) · Union-Find / DSU · Bellman-Ford · Floyd-Warshall · MST (Kruskal's + Prim's) · SCC (Tarjan's + Kosaraju's) · Bipartite Check · Network Flow (Ford-Fulkerson)

> Read fast. Understand deeply. Go practice on LeetCode immediately.

---

## Table of Contents

- [BFS — Shortest Path (Unweighted)](#bfs--shortest-path-unweighted)
- [DFS — Connected Components and Cycle Detection](#dfs--connected-components-and-cycle-detection)
- [Topological Sort — Kahn's Algorithm](#topological-sort--kahns-algorithm)
- [Dijkstra — Weighted Shortest Path](#dijkstra--weighted-shortest-path)
- [Union-Find / DSU — Dynamic Connectivity](#union-find--dsu--dynamic-connectivity)
- [Bellman-Ford Algorithm](#bellman-ford-algorithm)
- [Floyd-Warshall Algorithm](#floyd-warshall-algorithm)
- [Minimum Spanning Tree — Kruskal's and Prim's](#minimum-spanning-tree--kruskals-and-prims)
- [Strongly Connected Components — SCC (Tarjan's + Kosaraju's)](#strongly-connected-components--scc-tarjans--kosarajus)
- [Bipartite Graph Check](#bipartite-graph-check)
- [Network Flow — Max Flow / Ford-Fulkerson Concept](#network-flow--max-flow--ford-fulkerson-concept)

---

## BFS — Shortest Path (Unweighted)

### What is it?

A **graph** is a set of **nodes** (also called vertices — think cities, people, web pages) connected by **edges** (roads, friendships, links). Edges can be **directed** (one-way, like Twitter follows) or **undirected** (two-way, like Facebook friends). BFS (Breadth-First Search) explores a graph level by level — all nodes 1 hop away, then all nodes 2 hops away, and so on — using a queue.

### Visual

```
Graph:
    A --- B --- D
    |     |
    C --- E

BFS from A:

Level 0:  Queue: [A]          Visited: [A]
Level 1:  Dequeue A → enqueue B, C
          Queue: [B, C]       Visited: [A, B, C]
Level 2:  Dequeue B → enqueue D, E (C already visited)
          Queue: [C, D, E]    Visited: [A, B, C, D, E]
          Dequeue C → no new neighbors
          Queue: [D, E]
Level 3:  Dequeue D → done
          Dequeue E → done
          Queue: []

Visit order: A → B → C → D → E
```

### How does it work?

1. Put the source node in a queue and mark it visited.
2. While the queue is not empty:
3. Dequeue the front node.
4. For each unvisited neighbor of that node:
5. Mark the neighbor visited immediately (on enqueue, not later).
6. Record its distance as current node's distance + 1.
7. Enqueue the neighbor.

### Why does it work?

The core idea: a queue enforces FIFO order, so you always finish all nodes at distance d before touching any node at distance d+1. This means the FIRST time BFS reaches any node, it has taken the shortest possible route to get there.

### When to use?

- "Minimum number of steps / hops / moves from A to B" in an unweighted graph.
- Level-order processing: "how many levels / rounds does this take?"
- Multiple sources: "shortest distance from ANY of these starting points" (multi-source BFS).
- Grid traversal where each cell-to-cell move costs 1.

### When NOT to use?

- Edges have different weights (costs vary): use Dijkstra instead.
- You need to explore all paths or detect cycles: DFS is more natural.

### How to recognize in a new problem?

Ask: "Does every move/step/edge cost the same?" If yes, BFS gives shortest path for free.

Signals:
- "Minimum number of moves/steps/transformations."
- Grid problem where you move up/down/left/right and want the shortest route.
- "How many rounds until all cells are infected/rotten/filled?" (multi-source BFS from all infected cells at once).

Many grid problems (number-of-islands, rotting-oranges) look like 2D arrays but are secretly graphs — each cell is a node, adjacent cells are edges.

### Simple Example

```
Graph (undirected):
    0 --- 1
    |     |
    2 --- 3

Source: 0,  Destination: 3

Expected output: 2  (path: 0 → 1 → 3  or  0 → 2 → 3)
```

### Code

```java
// Java — adjacency list BFS for shortest path
public int bfsShortestPath(Map<Integer, List<Integer>> graph, int src, int dst, int n) {
    int[] dist = new int[n];
    Arrays.fill(dist, -1);
    dist[src] = 0;

    Queue<Integer> queue = new LinkedList<>();
    queue.offer(src);                          // mark visited ON ENQUEUE

    while (!queue.isEmpty()) {
        int node = queue.poll();
        for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
            if (dist[neighbor] == -1) {        // not visited yet
                dist[neighbor] = dist[node] + 1;
                if (neighbor == dst) return dist[neighbor];
                queue.offer(neighbor);
            }
        }
    }
    return -1; // destination not reachable
}

// Build adjacency list from edge list (undirected)
Map<Integer, List<Integer>> buildGraph(int n, int[][] edges) {
    Map<Integer, List<Integer>> graph = new HashMap<>();
    for (int i = 0; i < n; i++) graph.put(i, new ArrayList<>());
    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        graph.get(e[1]).add(e[0]);
    }
    return graph;
}
```

```javascript
// JavaScript
function bfsShortestPath(graph, src, dst, n) {
    const dist = new Array(n).fill(-1);
    dist[src] = 0;
    const queue = [src];
    let head = 0;                              // use pointer instead of shift() for O(1)

    while (head < queue.length) {
        const node = queue[head++];
        for (const neighbor of (graph.get(node) || [])) {
            if (dist[neighbor] === -1) {       // not visited yet
                dist[neighbor] = dist[node] + 1;
                if (neighbor === dst) return dist[neighbor];
                queue.push(neighbor);          // mark visited ON ENQUEUE
            }
        }
    }
    return -1;
}

// Build adjacency list (undirected)
function buildGraph(n, edges) {
    const graph = new Map();
    for (let i = 0; i < n; i++) graph.set(i, []);
    for (const [u, v] of edges) {
        graph.get(u).push(v);
        graph.get(v).push(u);
    }
    return graph;
}
```

### Dry Run

```
Graph: 0-[1,2], 1-[0,3], 2-[0,3], 3-[1,2]
Source=0, Destination=3

dist[] = [-1, -1, -1, -1]  →  start: dist[0]=0
Queue: [0]

--- Dequeue 0 ---
  neighbor 1: dist[1] == -1 → dist[1]=1, enqueue 1
  neighbor 2: dist[2] == -1 → dist[2]=1, enqueue 2
  Queue: [1, 2]     dist: [0, 1, 1, -1]   Visited: {0,1,2}

--- Dequeue 1 ---
  neighbor 0: dist[0]=0 ≠ -1 → skip
  neighbor 3: dist[3] == -1 → dist[3]=2, return 2
  Queue: [2, 3]     dist: [0, 1, 1, 2]    ← ANSWER: 2
```

### Complexity

```
Time:  O(V + E)  — each vertex dequeued once (V), each edge checked once (E)
Space: O(V)      — queue holds at most V nodes; dist[] array of size V
```

### Common Trap

1. **Marking visited on dequeue instead of enqueue.** If you wait until dequeue to mark visited, the same node gets enqueued multiple times before it is processed — causing redundant work and wrong distances. Mark visited the moment you add to the queue.
2. **Multi-source BFS done wrong.** If there are multiple starting points (e.g., all rotten oranges), do NOT run separate BFS from each — that overcounts time. Enqueue ALL sources at time=0 and run ONE BFS pass.

### Experience Tip

**Experience Tip:** In grid BFS, encode position as a single integer `row * cols + col` instead of a pair — it is faster to hash and easier to store in visited. When the problem says "minimum" and the graph is unweighted, reach for BFS before thinking of anything fancier.

### Do Not Confuse With

- **DFS:** Goes deep first, not level by level. Does not guarantee shortest path.
- **Dijkstra:** BFS with a min-heap to handle unequal edge weights. When all weights are 1, Dijkstra reduces to BFS — use plain BFS because it is simpler and faster.
- **Topological Sort:** BFS variant (Kahn's) for ordering a DAG, not for shortest paths.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 994 | Rotting Oranges | Medium | Multi-source BFS from all rotten cells at time=0 | https://leetcode.com/problems/rotting-oranges/ |
| 127 | Word Ladder | Hard | Each word is a node; one-letter changes are edges; BFS finds min transformations | https://leetcode.com/problems/word-ladder/ |
| 733 | Flood Fill | Easy | BFS/DFS on grid; 4-directional neighbors | https://leetcode.com/problems/flood-fill/ |
| 200 | Number of Islands | Medium | BFS from each unvisited '1'; count how many times you start fresh | https://leetcode.com/problems/number-of-islands/ |
| 695 | Max Area of Island | Medium | BFS from each island, accumulate cell count, track max | https://leetcode.com/problems/max-area-of-island/ |

### One-Minute Revision

```
ALGORITHM:      BFS — Breadth-First Search
IN SIMPLE WORDS: Explore all neighbors at distance 1, then distance 2, then 3...
USE WHEN:       Shortest path in unweighted graph; level-order; multi-source distance
DON'T USE WHEN: Edges have different costs (use Dijkstra); need all paths (use DFS)
CORE IDEA:      Queue = FIFO → first time you reach a node is shortest path
TRACK:          dist[] array (or visited set), queue
TIME:           O(V + E)
SPACE:          O(V)
COMMON TRAP:    Mark visited ON ENQUEUE not on dequeue; multi-source = one BFS, not N BFS
EXPERIENCE TIP: If problem says "minimum steps" and graph is unweighted, BFS is almost always right
```

---

## DFS — Connected Components and Cycle Detection

### What is it?

DFS (Depth-First Search) explores a graph by going as deep as possible down one path before backtracking and trying another. It uses a stack (or the call stack via recursion). A **connected component** is a group of nodes where you can reach any node from any other — if you start DFS from node A and can reach node B, they are in the same component.

### Visual

```
Graph:
    1 --- 2
    |
    3     4 --- 5

DFS from 1 (recursive call stack shown):

DFS(1) enters → mark 1 visited
  DFS(2) enters → mark 2 visited
    neighbor 1: already visited → backtrack
  DFS(2) returns
  DFS(3) enters → mark 3 visited
    neighbor 1: already visited → backtrack
  DFS(3) returns
DFS(1) returns  ← component 1 done: {1, 2, 3}

4 not visited → DFS(4) enters → mark 4 visited
  DFS(5) enters → mark 5 visited
  DFS(5) returns
DFS(4) returns  ← component 2 done: {4, 5}

Total components: 2
```

### How does it work?

1. Maintain a `visited[]` boolean array (or set).
2. Loop over every node. If a node is not yet visited, start a DFS from it and increment component count.
3. Inside DFS: mark the current node visited.
4. For each unvisited neighbor, recursively call DFS.
5. When DFS returns, the entire component reachable from the start has been marked.
6. For **cycle detection in directed graphs**: use a three-color system — white (unvisited), gray (currently in the call stack), black (fully done). If DFS encounters a gray node, there is a cycle.
7. For **cycle detection in undirected graphs**: if a visited neighbor is not the direct parent of the current node, there is a cycle.

### Why does it work?

DFS naturally exhausts one path completely before trying another. Because of this, a single DFS call starting at node X will visit every node reachable from X — exactly one connected component. Run it repeatedly for each unvisited node and you count every component.

### When to use?

- "How many islands / components / groups are there?"
- "Can node A reach node B?" (reachability)
- Cycle detection in directed or undirected graphs.
- Generating topological order (postorder DFS).
- Any problem requiring path exploration or backtracking.

### When NOT to use?

- You need the shortest path: BFS guarantees shortest path, DFS does not.
- The graph is very deep and you risk stack overflow: use iterative BFS instead.

### How to recognize in a new problem?

Ask: "Do I need to explore/count/label entire regions?" DFS is the natural fit.

Signals:
- "Count the number of islands / groups / connected regions."
- "Can I reach X from Y?" — run DFS from Y, check if X gets visited.
- Grid where cells form blobs and you need to measure or count them.
- "Detect a cycle" or "check if there is a circular dependency."

### Simple Example

```
Graph (undirected, 6 nodes, 0-indexed):
    0 --- 1     3 --- 4
    |               |
    2               5

Expected output: 2 connected components
Trace: DFS(0) visits {0,1,2}. Node 3 unvisited → DFS(3) visits {3,4,5}. Count = 2.
```

### Code

```java
// Java — count connected components with DFS
public int countComponents(int n, int[][] edges) {
    Map<Integer, List<Integer>> graph = new HashMap<>();
    for (int i = 0; i < n; i++) graph.put(i, new ArrayList<>());
    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        graph.get(e[1]).add(e[0]);
    }

    boolean[] visited = new boolean[n];
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (!visited[i]) {
            dfs(graph, visited, i);
            count++;
        }
    }
    return count;
}

private void dfs(Map<Integer, List<Integer>> graph, boolean[] visited, int node) {
    visited[node] = true;
    for (int neighbor : graph.get(node)) {
        if (!visited[neighbor]) dfs(graph, visited, neighbor);
    }
}

// Java — cycle detection in directed graph (three-color DFS)
// color: 0 = white, 1 = gray, 2 = black
public boolean hasCycle(int n, Map<Integer, List<Integer>> graph) {
    int[] color = new int[n];
    for (int i = 0; i < n; i++) {
        if (color[i] == 0 && dfsCycle(graph, color, i)) return true;
    }
    return false;
}

private boolean dfsCycle(Map<Integer, List<Integer>> graph, int[] color, int node) {
    color[node] = 1; // mark gray: currently in stack
    for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
        if (color[neighbor] == 1) return true;          // gray → back edge → cycle
        if (color[neighbor] == 0 && dfsCycle(graph, color, neighbor)) return true;
    }
    color[node] = 2; // mark black: fully done
    return false;
}
```

```javascript
// JavaScript — count connected components with DFS
function countComponents(n, edges) {
    const graph = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) {
        graph[u].push(v);
        graph[v].push(u);
    }

    const visited = new Array(n).fill(false);
    let count = 0;

    function dfs(node) {
        visited[node] = true;
        for (const neighbor of graph[node]) {
            if (!visited[neighbor]) dfs(neighbor);
        }
    }

    for (let i = 0; i < n; i++) {
        if (!visited[i]) {
            dfs(i);
            count++;
        }
    }
    return count;
}

// JavaScript — cycle detection in directed graph (three-color)
function hasCycle(n, graph) {
    const color = new Array(n).fill(0); // 0=white, 1=gray, 2=black

    function dfs(node) {
        color[node] = 1;
        for (const neighbor of (graph.get(node) || [])) {
            if (color[neighbor] === 1) return true;     // back edge → cycle
            if (color[neighbor] === 0 && dfs(neighbor)) return true;
        }
        color[node] = 2;
        return false;
    }

    for (let i = 0; i < n; i++) {
        if (color[i] === 0 && dfs(i)) return true;
    }
    return false;
}
```

### Dry Run

```
Graph: 5 nodes, edges: [0-1],[0-2],[3-4]
visited = [F, F, F, F, F]

Loop i=0: visited[0]=false → call DFS(0), count=1
  DFS(0): visited[0]=true  → visited=[T,F,F,F,F]
    neighbor 1: not visited → DFS(1)
      DFS(1): visited[1]=true → visited=[T,T,F,F,F]
        neighbor 0: visited → skip
      DFS(1) returns
    neighbor 2: not visited → DFS(2)
      DFS(2): visited[2]=true → visited=[T,T,T,F,F]
        neighbor 0: visited → skip
      DFS(2) returns
  DFS(0) returns

Loop i=1: visited[1]=true → skip
Loop i=2: visited[2]=true → skip
Loop i=3: visited[3]=false → call DFS(3), count=2
  DFS(3): visited[3]=true → visited=[T,T,T,T,F]
    neighbor 4: not visited → DFS(4)
      DFS(4): visited[4]=true → visited=[T,T,T,T,T]
        neighbor 3: visited → skip
      DFS(4) returns
  DFS(3) returns

Loop i=4: visited[4]=true → skip

Answer: 2 components
```

### Complexity

```
Time:  O(V + E)  — each vertex visited once, each edge traversed once
Space: O(V)      — visited[] array + recursion stack depth up to V
```

### Common Trap

1. **Forgetting to mark visited before recursing.** If you only check `!visited` at the top but do not set it immediately, you can enter the same node multiple times before the check runs — causing infinite loops on cycles.
2. **Using a boolean visited[] for directed cycle detection.** A simple boolean cannot tell you "is this node in the CURRENT path" vs "was this node visited in an earlier path." Use three colors (white/gray/black) for directed graphs.

### Experience Tip

**Experience Tip:** For grid problems (number-of-islands, flood fill), DFS is often one line shorter than BFS and just as valid when shortest path is not needed. When stack overflow is a concern on very large grids, switch to iterative DFS using an explicit stack. Always loop over ALL nodes (not just node 0) — the graph may be disconnected.

### Do Not Confuse With

- **BFS:** Explores level by level; guarantees shortest path in unweighted graphs. DFS explores depth first — does not guarantee shortest path.
- **Topological Sort:** Uses DFS postorder OR Kahn's BFS — it is a specific application, not raw DFS.
- **Dijkstra:** Handles weighted shortest paths. DFS has no concept of edge weight.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 200 | Number of Islands | Medium | DFS from each unvisited '1', count restarts | https://leetcode.com/problems/number-of-islands/ |
| 133 | Clone Graph | Medium | DFS with a HashMap to avoid re-cloning visited nodes | https://leetcode.com/problems/clone-graph/ |
| 130 | Surrounded Regions | Medium | DFS from border 'O's to mark safe, then flip everything else | https://leetcode.com/problems/surrounded-regions/ |
| 417 | Pacific Atlantic Water Flow | Medium | DFS from each ocean's border cells inward, find intersection | https://leetcode.com/problems/pacific-atlantic-water-flow/ |
| 695 | Max Area of Island | Medium | DFS returns cell count; track the maximum | https://leetcode.com/problems/max-area-of-island/ |

### One-Minute Revision

```
ALGORITHM:      DFS — Depth-First Search
IN SIMPLE WORDS: Go deep into one path until stuck, backtrack, try next path
USE WHEN:       Count components; detect cycles; check reachability; explore all paths
DON'T USE WHEN: Need shortest path (use BFS); graph is huge and deep (stack overflow risk)
CORE IDEA:      One DFS call exhausts one entire connected component
TRACK:          visited[] boolean (undirected) or color[] 0/1/2 (directed cycle detection)
TIME:           O(V + E)
SPACE:          O(V)
COMMON TRAP:    Boolean visited is wrong for directed cycle detection — use three colors
EXPERIENCE TIP: Loop over ALL nodes (not just 0) in case graph is disconnected
```

---

## Topological Sort — Kahn's Algorithm

### What is it?

Topological sort produces a linear ordering of nodes in a **directed acyclic graph** (DAG — a directed graph with no cycles) such that for every directed edge A → B, node A appears before node B in the ordering. This is how you schedule tasks when some tasks must happen before others. A **directed** edge means the relationship is one-way (course A is a prerequisite for course B, not the other way around).

### Visual

```
Directed graph (course prerequisites):
    0 → 2
    1 → 2
    2 → 3

In-degree: node 0 = 0, node 1 = 0, node 2 = 2, node 3 = 1

Step 1: Enqueue all nodes with in-degree 0
        Queue: [0, 1]   Result: []

Step 2: Dequeue 0 → add to result, decrement neighbors
        node 2: in-degree 2→1
        Queue: [1]      Result: [0]

Step 3: Dequeue 1 → add to result, decrement neighbors
        node 2: in-degree 1→0 → enqueue 2
        Queue: [2]      Result: [0, 1]

Step 4: Dequeue 2 → add to result, decrement neighbors
        node 3: in-degree 1→0 → enqueue 3
        Queue: [3]      Result: [0, 1, 2]

Step 5: Dequeue 3 → add to result
        Queue: []       Result: [0, 1, 2, 3]

Valid topological order: [0, 1, 2, 3]
```

### How does it work?

1. Build adjacency list and compute **in-degree** (number of incoming edges) for every node.
2. Enqueue all nodes whose in-degree is 0 (they have no prerequisites).
3. While queue is not empty: dequeue node u, add u to result.
4. For each neighbor v of u: decrement in-degree[v] by 1.
5. If in-degree[v] becomes 0: enqueue v (all its prerequisites are done).
6. After the loop: if result size equals total nodes, ordering is valid. If result size is less than total nodes, there is a cycle — no valid ordering exists.

### Why does it work?

A node enters the queue only after all its prerequisites have been processed. The moment a node's in-degree hits zero, every edge pointing into it has been "consumed," meaning all its prerequisites are already in the result. This greedy property guarantees the output is a valid topological ordering.

### When to use?

- "Given prerequisites / dependencies, find a valid ordering."
- "Can all tasks be completed?" (cycle detection as a side effect).
- Build systems, compiler dependency resolution, task scheduling.
- Any problem with "A must come before B" constraints.

### When NOT to use?

- The graph has cycles — topological sort is undefined for cyclic graphs (and Kahn's will tell you by producing an incomplete result).
- The graph is undirected — topological sort only makes sense for directed edges.

### How to recognize in a new problem?

Ask: "Are there ordering constraints?" or "Does completing X depend on completing Y first?"

Signals:
- "Prerequisite," "dependency," "before," "schedule," "build order."
- A list of pairs [a, b] meaning "a must come before b."
- "Can you finish all courses?" — this is asking whether the dependency graph is acyclic.

### Simple Example

```
Directed graph:
    5 → 0 ← 4
    5 → 2 ← 4
        ↓
        3 → 1

Edges: [5→0],[5→2],[4→0],[4→2],[2→3],[3→1]
One valid output: [4, 5, 2, 3, 1, 0]
(Multiple valid orderings can exist)
```

### Code

```java
// Java — Kahn's topological sort
public int[] topologicalSort(int n, int[][] prerequisites) {
    List<List<Integer>> graph = new ArrayList<>();
    int[] inDegree = new int[n];

    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] pre : prerequisites) {
        graph.get(pre[1]).add(pre[0]); // pre[1] must come before pre[0]
        inDegree[pre[0]]++;
    }

    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < n; i++) {
        if (inDegree[i] == 0) queue.offer(i); // no prerequisites
    }

    int[] order = new int[n];
    int idx = 0;
    while (!queue.isEmpty()) {
        int node = queue.poll();
        order[idx++] = node;
        for (int neighbor : graph.get(node)) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] == 0) queue.offer(neighbor);
        }
    }

    // idx < n means cycle exists — no valid ordering
    return idx == n ? order : new int[0];
}
```

```javascript
// JavaScript — Kahn's topological sort
function topologicalSort(n, prerequisites) {
    const graph = Array.from({ length: n }, () => []);
    const inDegree = new Array(n).fill(0);

    for (const [course, pre] of prerequisites) {
        graph[pre].push(course); // pre must come before course
        inDegree[course]++;
    }

    const queue = [];
    for (let i = 0; i < n; i++) {
        if (inDegree[i] === 0) queue.push(i);
    }

    const order = [];
    let head = 0;
    while (head < queue.length) {
        const node = queue[head++];
        order.push(node);
        for (const neighbor of graph[node]) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) queue.push(neighbor);
        }
    }

    return order.length === n ? order : []; // empty = cycle detected
}
```

### Dry Run

```
n=4, prerequisites: [[1,0],[2,0],[3,1],[3,2]]
Meaning: 0→1, 0→2, 1→3, 2→3

graph: 0:[1,2], 1:[3], 2:[3], 3:[]
inDegree: [0, 1, 1, 2]

Step 1: in-degree 0 → enqueue 0
        Queue: [0]    order: []

Step 2: Dequeue 0, order=[0]
        neighbor 1: inDegree[1] = 1→0 → enqueue 1
        neighbor 2: inDegree[2] = 1→0 → enqueue 2
        Queue: [1, 2]   inDegree: [0, 0, 0, 2]

Step 3: Dequeue 1, order=[0,1]
        neighbor 3: inDegree[3] = 2→1
        Queue: [2]      inDegree: [0, 0, 0, 1]

Step 4: Dequeue 2, order=[0,1,2]
        neighbor 3: inDegree[3] = 1→0 → enqueue 3
        Queue: [3]      inDegree: [0, 0, 0, 0]

Step 5: Dequeue 3, order=[0,1,2,3]
        Queue: []

order.length == n == 4 → no cycle → valid ordering: [0, 1, 2, 3]
```

### Complexity

```
Time:  O(V + E)  — each node enqueued/dequeued once (V); each edge decrements in-degree once (E)
Space: O(V + E)  — adjacency list (E), inDegree array (V), queue (V), result (V)
```

### Common Trap

1. **Forgetting to check `result.size() == n`.** If there is a cycle, some nodes never reach in-degree 0 and are never enqueued. The result is silently incomplete. Always validate the result size.
2. **Confusing edge direction.** If the input says "course A requires course B as prerequisite," the directed edge goes B → A (B must appear before A). Getting this backwards produces a wrong graph and wrong cycle detection.

### Experience Tip

**Experience Tip:** Kahn's is preferred over DFS-based topological sort in interviews for two reasons: it detects cycles automatically (result size check), and it is iterative — no risk of stack overflow on large inputs. Whenever you see "can all tasks be completed?" treat it as cycle detection and return `result.size() == n`.

### Do Not Confuse With

- **BFS:** General BFS for shortest paths — Kahn's is a specialised BFS for ordering DAGs, not for distances.
- **DFS:** DFS-based topological sort uses postorder traversal + reversal — valid but trickier; Kahn's is more interview-friendly.
- **Dijkstra:** Shortest weighted path — entirely different goal. Topological sort says nothing about distances.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 207 | Course Schedule | Medium | Cycle detection: if result.size() < n, return false | https://leetcode.com/problems/course-schedule/ |
| 210 | Course Schedule II | Medium | Return the actual topological order; empty array if cycle | https://leetcode.com/problems/course-schedule-ii/ |
| 743 | Network Delay Time | Medium | Build directed graph first; then Dijkstra — note the graph-building step | https://leetcode.com/problems/network-delay-time/ |
| 399 | Evaluate Division | Medium | Build weighted directed graph; BFS/DFS to compute ratios | https://leetcode.com/problems/evaluate-division/ |
| 684 | Redundant Connection | Medium | Add edges one by one; cycle appears when both endpoints already connected | https://leetcode.com/problems/redundant-connection/ |

### One-Minute Revision

```
ALGORITHM:      Topological Sort — Kahn's Algorithm (BFS-based)
IN SIMPLE WORDS: Process nodes with no remaining prerequisites first; unlock next nodes
USE WHEN:       DAG with "A before B" ordering constraints; check if cycle exists
DON'T USE WHEN: Graph has cycles (undefined); graph is undirected (no meaning)
CORE IDEA:      Node enters queue only when all its prerequisites are done (in-degree = 0)
TRACK:          inDegree[] array, adjacency list, queue, result list
TIME:           O(V + E)
SPACE:          O(V + E)
COMMON TRAP:    Must check result.size() == n to confirm no cycle; watch edge direction
EXPERIENCE TIP: "Can all tasks complete?" = cycle detection = check result.size() == n
```

---

## Dijkstra — Weighted Shortest Path

### What is it?

Dijkstra's algorithm finds the shortest path from a source node to every other node in a **weighted** graph (a graph where each edge has a numeric cost). It uses a **min-heap** (priority queue) to always process the cheapest-known node next — a greedy approach. It only works when all edge weights are non-negative.

### Visual

```
Weighted directed graph:
    0 --2--> 1
    |        |
    4        1
    v        v
    2 --1--> 3

Initial: dist = [0, ∞, ∞, ∞]   Heap: [(0, node=0)]

Extract (0, 0): process node 0
  edge to 1, cost 2: 0+2=2 < ∞ → dist[1]=2, push (2,1)
  edge to 2, cost 4: 0+4=4 < ∞ → dist[2]=4, push (4,2)
  dist = [0, 2, 4, ∞]   Heap: [(2,1),(4,2)]

Extract (2, 1): process node 1
  edge to 3, cost 1: 2+1=3 < ∞ → dist[3]=3, push (3,3)
  dist = [0, 2, 4, 3]   Heap: [(3,3),(4,2)]

Extract (3, 3): process node 3  (no outgoing edges here)
  Heap: [(4,2)]

Extract (4, 2): process node 2
  edge to 3, cost 1: 4+1=5 > dist[3]=3 → skip
  Heap: []

Final dist = [0, 2, 4, 3]
```

### How does it work?

1. Initialize `dist[]` array: dist[source] = 0, all others = infinity.
2. Push (0, source) into a min-heap (cost, node).
3. While heap is not empty: extract the entry with minimum cost (d, u).
4. **Stale check:** if d > dist[u], skip this entry — a better path to u was already found.
5. For each neighbor v of u with edge weight w:
6. If dist[u] + w < dist[v]: update dist[v] = dist[u] + w and push (dist[v], v) into heap.
7. When heap empties, dist[] holds shortest distance from source to every node.

### Why does it work?

When you extract a node from the min-heap, you have found the globally shortest path to it — because any alternative path would have been blocked by a larger cumulative cost, and there are no negative edges to make a later detour cheaper. This greedy guarantee is exactly what breaks down with negative edge weights.

### When to use?

- Minimum cost / cheapest path in a weighted graph with non-negative weights.
- "Find the time for a signal to reach all nodes" (network delay).
- Grid problems where cells have different travel costs.
- Any weighted graph problem that does not involve negative edge weights.

### When NOT to use?

- Negative edge weights exist: use Bellman-Ford instead.
- All edges have equal weight (cost = 1): use BFS — it is O(V+E) vs Dijkstra's O((V+E) log V).

### How to recognize in a new problem?

Ask: "Do edges have different costs AND do I need the minimum total cost path?"

Signals:
- "Cheapest / minimum cost / minimum weight path."
- Weighted edge list given explicitly (e.g., `[u, v, cost]`).
- "Find if you can reach destination within budget K" — Dijkstra with an extra state dimension.
- Grid where each cell has a numeric value representing traversal cost.

### Simple Example

```
Graph: 4 nodes
Edges (directed, weighted): 0→1 cost 1, 0→2 cost 4, 1→2 cost 2, 1→3 cost 5, 2→3 cost 1

Source: 0
Expected shortest distances: [0, 1, 3, 4]

Trace: 
  0→1 (cost 1), then 1→2 (cost 2): total 3 to reach node 2 (better than direct 0→2 = 4)
  0→1→2→3 (cost 1+2+1=4) is cheaper than 0→1→3 (cost 1+5=6)
```

### Code

```java
// Java — Dijkstra with adjacency list
// graph: Map<node, List<[neighbor, weight]>>
public int[] dijkstra(Map<Integer, List<int[]>> graph, int src, int n) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;

    // min-heap ordered by distance: [distance, node]
    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
    pq.offer(new int[]{0, src});

    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        int d = curr[0], u = curr[1];

        if (d > dist[u]) continue; // stale entry — skip

        for (int[] edge : graph.getOrDefault(u, Collections.emptyList())) {
            int v = edge[0], w = edge[1];
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.offer(new int[]{dist[v], v});
            }
        }
    }
    return dist; // dist[i] = shortest distance from src to i; MAX_VALUE = unreachable
}
```

```javascript
// JavaScript — Dijkstra
// JavaScript does not have a built-in min-heap.
// Use a simple array with sort for clarity (replace with MinHeap for O((V+E)logV)).
function dijkstra(graph, src, n) {
    const dist = new Array(n).fill(Infinity);
    dist[src] = 0;

    const heap = [[0, src]]; // [distance, node]

    while (heap.length > 0) {
        heap.sort((a, b) => a[0] - b[0]);     // real solution: use MinHeap
        const [d, u] = heap.shift();

        if (d > dist[u]) continue;             // stale entry — skip

        for (const [v, w] of (graph.get(u) || [])) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                heap.push([dist[v], v]);
            }
        }
    }
    return dist;
}
```

### Dry Run

```
4 nodes, edges: 0→1(1), 0→2(4), 1→2(2), 1→3(5), 2→3(1)
dist = [0, ∞, ∞, ∞]    Heap: [(0,0)]

Extract (0,0): d=0 == dist[0]=0 → process
  neighbor 1, w=1: 0+1=1 < ∞ → dist[1]=1, push (1,1)
  neighbor 2, w=4: 0+4=4 < ∞ → dist[2]=4, push (4,2)
  dist=[0,1,4,∞]   Heap: [(1,1),(4,2)]

Extract (1,1): d=1 == dist[1]=1 → process
  neighbor 2, w=2: 1+2=3 < 4 → dist[2]=3, push (3,2)
  neighbor 3, w=5: 1+5=6 < ∞ → dist[3]=6, push (6,3)
  dist=[0,1,3,6]   Heap: [(3,2),(4,2),(6,3)]

Extract (3,2): d=3 == dist[2]=3 → process
  neighbor 3, w=1: 3+1=4 < 6 → dist[3]=4, push (4,3)
  dist=[0,1,3,4]   Heap: [(4,2),(4,3),(6,3)]

Extract (4,2): d=4 > dist[2]=3 → STALE, skip

Extract (4,3): d=4 == dist[3]=4 → process, no outgoing edges

Extract (6,3): d=6 > dist[3]=4 → STALE, skip

Final dist = [0, 1, 3, 4]
```

### Complexity

```
Time:  O((V + E) log V)  — each node extracted from heap once (V log V);
                            each edge may add one heap entry (E log V)
Space: O(V + E)          — dist[] array (V) + heap can hold up to E entries
```

### Common Trap

1. **Skipping the stale entry check.** Because you can push the same node multiple times with different distances, old entries linger in the heap. Always check `if (d > dist[u]) continue` immediately after extracting. Without this, you waste time re-processing nodes with worse distances — and in some implementations you get wrong answers.
2. **Using Dijkstra when negative weights exist.** A negative edge can make a "already processed" node's true shortest path shorter, but Dijkstra never revisits finalized nodes. The algorithm silently produces wrong answers with negative weights.

### Experience Tip

**Experience Tip:** In Java, `PriorityQueue<int[]>` needs a comparator — always write it explicitly: `Comparator.comparingInt(a -> a[0])`. Forgetting this causes a ClassCastException at runtime. In problems like "cheapest flights within K stops," add the extra constraint (stops remaining) as a second dimension in the state: push `[cost, node, stopsLeft]` and track visited by `(node, stopsLeft)`.

### Do Not Confuse With

- **BFS:** Correct for unweighted graphs (all edges cost 1). Dijkstra becomes BFS when all weights equal 1, but BFS is simpler and faster in that case.
- **Topological Sort:** Orders a DAG by dependencies — has nothing to do with edge weights or shortest paths.
- **Bellman-Ford:** Handles negative weights by relaxing all edges V-1 times — slower O(V×E) but necessary when Dijkstra cannot be used.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 743 | Network Delay Time | Medium | Standard Dijkstra; answer is max of all dist values; -1 if any unreachable | https://leetcode.com/problems/network-delay-time/ |
| 787 | Cheapest Flights Within K Stops | Medium | Dijkstra with state (node, stops); or Bellman-Ford with K iterations | https://leetcode.com/problems/cheapest-flights-within-k-stops/ |
| 399 | Evaluate Division | Medium | Build weighted directed graph; BFS/DFS to multiply weights along path | https://leetcode.com/problems/evaluate-division/ |
| 127 | Word Ladder | Hard | Unweighted → BFS, but shows how BFS and Dijkstra relate | https://leetcode.com/problems/word-ladder/ |
| 417 | Pacific Atlantic Water Flow | Medium | Not Dijkstra, but good contrast — shows when BFS/DFS suffices instead | https://leetcode.com/problems/pacific-atlantic-water-flow/ |

### One-Minute Revision

```
ALGORITHM:      Dijkstra — Weighted Shortest Path
IN SIMPLE WORDS: Always expand the cheapest-known node next using a min-heap
USE WHEN:       Weighted graph, non-negative costs, minimum distance/cost from source
DON'T USE WHEN: Negative weights (Bellman-Ford); all weights equal (plain BFS)
CORE IDEA:      Greedy: first extraction of a node from min-heap = its final shortest dist
TRACK:          dist[] array, min-heap of (distance, node)
TIME:           O((V + E) log V)
SPACE:          O(V + E)
COMMON TRAP:    Must check d > dist[u] to skip stale heap entries; fails on negative weights
EXPERIENCE TIP: In Java, always pass explicit comparator to PriorityQueue<int[]>
```

---

## Union-Find / DSU — Dynamic Connectivity

### What is it?

Union-Find (also called Disjoint Set Union / DSU) is a data structure that efficiently answers two questions: "Are nodes A and B in the same connected group?" and "Merge the groups containing A and B." Each group has a **representative root**. Two operations: `find(x)` returns the root of x's group; `union(x, y)` merges the groups of x and y. Two optimizations — path compression and union by rank — make both operations nearly O(1) in practice.

### Visual

```
Initial: 5 nodes, each its own group
parent = [0, 1, 2, 3, 4]   (each node is its own root)
rank   = [0, 0, 0, 0, 0]

union(0, 1):
  find(0)=0, find(1)=1 → different roots → merge
  parent = [0, 0, 2, 3, 4]  (1's root becomes 0)

union(1, 2):
  find(1)→parent[1]=0→root=0
  find(2)=2 → different roots → merge
  parent = [0, 0, 0, 3, 4]

union(3, 4):
  parent = [0, 0, 0, 3, 3]

find(2) with path compression:
  parent[2]=0 → root=0, parent[2] already points to root → done

Are 0 and 2 connected? find(0)=0, find(2)=0 → same root → YES
Are 0 and 3 connected? find(0)=0, find(3)=3 → different roots → NO

2 components: {0,1,2} and {3,4}
```

### How does it work?

1. Initialize `parent[i] = i` for all nodes (each node is its own root).
2. Initialize `rank[i] = 0` for all nodes.
3. `find(x)`: if `parent[x] == x`, return x (it is the root). Otherwise, recursively find root and apply **path compression**: set `parent[x] = find(parent[x])` so x points directly to root.
4. `union(x, y)`: find roots px = find(x) and py = find(y). If same root, they are already connected (adding this edge creates a cycle — return false). Otherwise merge using **union by rank**: attach the smaller-rank tree under the larger-rank root. If equal ranks, pick either and increment that root's rank.
5. Repeat for each edge. After all unions, call `find()` on any pair to check connectivity.

### Why does it work?

Path compression flattens the tree so future `find()` calls skip directly to the root. Union by rank keeps trees shallow, preventing any chain from growing long. Together they reduce amortized cost per operation to O(α(n)) — the inverse Ackermann function, which is at most 4 for any realistic input size.

### When to use?

- "Are A and B in the same group?" — especially when edges are added one at a time.
- Cycle detection in undirected graphs: if `union(u, v)` returns false, edge (u,v) creates a cycle.
- "Find redundant connection" — the first edge where both endpoints already share a root.
- Counting connected components dynamically as edges are added.

### When NOT to use?

- You need the actual path between two nodes — Union-Find only tells you connectivity, not the path.
- The graph is directed — Union-Find is designed for undirected connectivity.

### How to recognize in a new problem?

Ask: "Are edges being added incrementally?" or "Do I need to repeatedly merge groups and check membership?"

Signals:
- "Redundant connection" or "detect cycle as edges arrive."
- "Accounts merge" — group items by shared identifier.
- Problems where BFS/DFS would work but re-scanning the graph after each edge addition is too slow.

### Simple Example

```
5 nodes, edges added one by one: [0,1],[1,2],[3,4],[1,3],[0,4]

After [0,1]: groups = {0,1}, {2}, {3}, {4}
After [1,2]: groups = {0,1,2}, {3}, {4}
After [3,4]: groups = {0,1,2}, {3,4}
After [1,3]: groups = {0,1,2,3,4}
After [0,4]: find(0)=root, find(4)=same root → CYCLE — this is the redundant edge
```

### Code

```java
// Java — Union-Find with path compression and union by rank
class UnionFind {
    int[] parent, rank;

    UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i; // each node is its own root
    }

    int find(int x) {
        if (parent[x] != x)
            parent[x] = find(parent[x]); // path compression: point directly to root
        return parent[x];
    }

    // Returns true if merged successfully; false if already in same component (cycle)
    boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false; // same root → adding this edge creates a cycle

        // union by rank: attach smaller tree under larger
        if (rank[px] < rank[py]) { int tmp = px; px = py; py = tmp; }
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        return true;
    }

    boolean connected(int x, int y) {
        return find(x) == find(y);
    }
}

// Example: find redundant connection
public int[] findRedundantConnection(int[][] edges) {
    int n = edges.length;
    UnionFind uf = new UnionFind(n + 1);
    for (int[] edge : edges) {
        if (!uf.union(edge[0], edge[1])) return edge; // this edge creates a cycle
    }
    return new int[0];
}
```

```javascript
// JavaScript — Union-Find
class UnionFind {
    constructor(n) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }

    find(x) {
        if (this.parent[x] !== x)
            this.parent[x] = this.find(this.parent[x]); // path compression
        return this.parent[x];
    }

    // Returns true if merged; false if already connected (cycle)
    union(x, y) {
        let px = this.find(x), py = this.find(y);
        if (px === py) return false;

        if (this.rank[px] < this.rank[py]) [px, py] = [py, px]; // union by rank
        this.parent[py] = px;
        if (this.rank[px] === this.rank[py]) this.rank[px]++;
        return true;
    }

    connected(x, y) {
        return this.find(x) === this.find(y);
    }
}

// Example: find redundant connection
function findRedundantConnection(edges) {
    const uf = new UnionFind(edges.length + 1);
    for (const [u, v] of edges) {
        if (!uf.union(u, v)) return [u, v];
    }
    return [];
}
```

### Dry Run

```
5 nodes (0..4), edges: [0,1],[1,2],[2,0] — cycle check

Initial parent = [0,1,2,3,4]   rank = [0,0,0,0,0]

union(0, 1):
  find(0)=0, find(1)=1 → different → parent[1]=0, rank[0]=1
  parent=[0,0,2,3,4]   returns true (merged)

union(1, 2):
  find(1)→parent[1]=0→root=0
  find(2)=2 → different → parent[2]=0 (rank[0]=1 > rank[2]=0)
  parent=[0,0,0,3,4]   returns true (merged)

union(2, 0):
  find(2)→parent[2]=0→root=0  [path already compressed]
  find(0)=0 → SAME ROOT → return false → CYCLE DETECTED

Redundant edge: [2, 0]
```

### Complexity

```
Time:  O(α(n)) per operation  — effectively O(1); α(n) ≤ 4 for n < 10^600
Space: O(n)                   — parent[] and rank[] arrays, each of size n

Without both optimizations: O(n) per find in worst case (linked-list shaped tree)
```

### Common Trap

1. **Missing path compression OR union by rank.** You need both. Without path compression, `find()` traverses long chains. Without union by rank, `union()` can create tall trees that path compression can't fully fix. Either optimization alone gives O(log n); both together give O(α(n)).
2. **Using Union-Find for directed graphs.** Union-Find merges groups symmetrically — it cannot distinguish direction. For directed cycle detection, use DFS three-color or Kahn's topological sort.

### Experience Tip

**Experience Tip:** In "accounts merge" and similar grouping problems, Union-Find is cleaner than BFS/DFS because you process one connection at a time without rebuilding traversal structures. A common pattern: assign integer IDs to string keys using a HashMap, then run Union-Find on the integer IDs. Always remember to call `find()` on every element at the end to ensure path compression is fully applied before final grouping.

### Do Not Confuse With

- **BFS/DFS for components:** BFS/DFS is better when you need the actual component contents or the graph is static and known upfront. Union-Find is better when edges arrive one at a time and you only need "same group?" queries.
- **Topological Sort:** Detects cycles in directed graphs as a side effect — Union-Find detects cycles in undirected graphs. They answer different questions.
- **Dijkstra:** Shortest weighted path — no relationship to Union-Find.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 684 | Redundant Connection | Medium | First edge where union() returns false is the answer | https://leetcode.com/problems/redundant-connection/ |
| 721 | Accounts Merge | Medium | Map email strings to integer IDs; union by shared email; group at end | https://leetcode.com/problems/accounts-merge/ |
| 200 | Number of Islands | Medium | Can solve with DFS/BFS or Union-Find; compare both approaches | https://leetcode.com/problems/number-of-islands/ |
| 130 | Surrounded Regions | Medium | Union border 'O' cells with a virtual node; anything NOT connected to it gets flipped | https://leetcode.com/problems/surrounded-regions/ |
| 207 | Course Schedule | Medium | Contrast: this needs directed cycle detection (Kahn's), not Union-Find | https://leetcode.com/problems/course-schedule/ |

### One-Minute Revision

```
ALGORITHM:      Union-Find / DSU — Disjoint Set Union
IN SIMPLE WORDS: Group nodes together; answer "same group?" and "merge groups" efficiently
USE WHEN:       Dynamic connectivity; undirected cycle detection; grouping/merging problems
DON'T USE WHEN: Need actual path; graph is directed; need more than connectivity info
CORE IDEA:      find() returns group root; same root = same group; union() merges two groups
TRACK:          parent[] array, rank[] array
TIME:           O(α(n)) ≈ O(1) per operation
SPACE:          O(n)
COMMON TRAP:    Need BOTH path compression AND union by rank; wrong for directed graphs
EXPERIENCE TIP: Map string keys to integer IDs before running Union-Find
```

---

## Graph Algorithm Quick Reference

```
CHOOSE YOUR ALGORITHM
=====================

Shortest path, unweighted (all edges = 1)?     → BFS             O(V+E)
Shortest path, weighted, non-negative?          → Dijkstra        O((V+E)logV)
Shortest path, negative weights?                → Bellman-Ford    O(V×E)
Count/label connected components?               → DFS loop        O(V+E)
Detect cycle, directed graph?                   → DFS 3-color OR Kahn's  O(V+E)
Detect cycle, undirected graph?                 → DFS + parent check OR Union-Find
Ordering with dependencies (DAG)?               → Kahn's Topo Sort  O(V+E)
Dynamic connectivity (edges added over time)?   → Union-Find      O(α(n))

ALWAYS DO
=========
□ Build adjacency list before coding the algorithm
□ Mark visited ON ENQUEUE (BFS) or ON ENTRY (DFS)
□ Loop over ALL nodes — the graph may be disconnected
□ Multi-source BFS: enqueue ALL sources at time=0, run ONE pass
□ Dijkstra: check if d > dist[u] to skip stale heap entries
□ Topological sort: verify result.size() == n after Kahn's
□ Union-Find: use BOTH path compression AND union by rank

GRID PROBLEMS ARE GRAPH PROBLEMS
=================================
Each cell = node.  Adjacent cells = edges.
4-directional moves: up/down/left/right  (add diagonal if stated)
Multi-source BFS: enqueue ALL sources first (rotten oranges, 0-1 matrix)
Border-to-inward DFS: start from border cells (surrounded regions, pacific atlantic)
```

---

## Bellman-Ford Algorithm

### What is it?
Imagine you are booking flights where some routes give a cash-back rebate — so the "cost" of a leg can be negative. Dijkstra would give wrong answers here because it assumes going farther never reduces cost. Bellman-Ford handles negative edge weights by doing something simpler but slower: it relaxes every single edge, V-1 times in a row, guaranteeing it has found the true shortest path even when edges have negative costs.

### Visual
```
Graph (directed, weighted — node labels 0..4, source = 0):
  0 --(-1)--> 1
  0 ---4----> 2
  1 ---3----> 2
  1 ---2----> 3
  1 ---2----> 4
  4 --(-3)--> 3

Initial dist: [0, ∞, ∞, ∞, ∞]

Round 1 — relax ALL edges:
  0→1 w=-1: 0+(-1)=-1 < ∞  → dist[1]=-1
  0→2 w= 4: 0+ 4  = 4 < ∞  → dist[2]= 4
  1→2 w= 3: -1+3  = 2 < 4  → dist[2]= 2   ← better!
  1→3 w= 2: -1+2  = 1 < ∞  → dist[3]= 1
  1→4 w= 2: -1+2  = 1 < ∞  → dist[4]= 1
  4→3 w=-3: 1+(-3)=-2 < 1  → dist[3]=-2   ← better!
  After Round 1: [0, -1, 2, -2, 1]

Round 2 — relax ALL edges again:
  No edge improves any distance.
  After Round 2: [0, -1, 2, -2, 1]

Rounds 3 and 4: no changes — converged.

Extra pass (cycle check): no dist[v] still improves → no negative cycle.
Final: [0, -1, 2, -2, 1]
```

### How does it work?
1. Set dist[source] = 0, all other dist[i] = infinity.
2. Repeat exactly V-1 times (V = total number of nodes):
3.   Loop over every edge (u, v, weight) in the graph.
4.   If dist[u] is not infinity AND dist[u] + weight < dist[v]: update dist[v] = dist[u] + weight. (This is called "relaxing" the edge.)
5.   Optionally break early if a full round makes zero updates — already converged.
6. Do one final extra pass over all edges. If any edge can still be relaxed, a negative-weight cycle exists.

### Why does it work?
The shortest path between any two nodes uses at most V-1 edges (a longer path would revisit a node, forming a cycle). After round k, dist[] correctly holds the shortest path that uses at most k edges. By round V-1, every possible shortest path has been found. A round V improvement means a cycle keeps reducing cost — a negative-weight cycle.

### When to use?
- Shortest path when edge weights can be negative (profit/loss, cash-back, currency arbitrage).
- Detecting negative-weight cycles — the extra Vth pass is the standard test.
- "Cheapest flights within K stops" — run exactly K rounds instead of V-1.

### When NOT to use?
- All edge weights are non-negative: use Dijkstra — it is O((V+E) log V) vs Bellman-Ford's O(V×E).
- Very large, dense graphs: V×E operations become too slow.

### How to recognize in a new problem?
Ask: "Can edge weights be negative?" or "Is there a constraint on the number of edges in the path?"

Key signals in problem statement:
- "Edge weights can be negative" or "profit and loss on edges"
- "At most K stops / hops / edges" — run exactly K Bellman-Ford rounds
- "Detect if infinite profit is possible" — negative cycle detection

### Simple Example
**Input:** 5 nodes, edges: 0→1(−1), 0→2(4), 1→2(3), 1→3(2), 1→4(2), 4→3(−3). Source = 0.
**Expected Output:** dist = [0, −1, 2, −2, 1]
**Trace:** Round 1 relaxes 0→1 (dist[1]=−1), then propagates: 1→2 beats direct 0→2 giving dist[2]=2, 1→3 gives dist[3]=1, 1→4 gives dist[4]=1, then 4→3 gives dist[3]=−2. Round 2 makes no further changes. Converged.

### Code
```java
// Java — Bellman-Ford
// edges: int[][] where each row = [u, v, weight]
public int[] bellmanFord(int n, int[][] edges, int src) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;

    // Relax all edges V-1 times
    for (int round = 0; round < n - 1; round++) {
        boolean updated = false;
        for (int[] edge : edges) {
            int u = edge[0], v = edge[1], w = edge[2];
            // Guard: skip if u is unreachable (avoid overflow when adding w)
            if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                updated = true;
            }
        }
        if (!updated) break; // early exit: no change this round, already optimal
    }

    // One extra pass: if anything still improves, there is a negative-weight cycle
    for (int[] edge : edges) {
        int u = edge[0], v = edge[1], w = edge[2];
        if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
            return null; // null = signal that a negative cycle was found
        }
    }
    return dist;
}
```
```javascript
// JavaScript — Bellman-Ford
function bellmanFord(n, edges, src) {
    const dist = new Array(n).fill(Infinity);
    dist[src] = 0;

    // Relax all edges V-1 times
    for (let round = 0; round < n - 1; round++) {
        let updated = false;
        for (const [u, v, w] of edges) {
            if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                updated = true;
            }
        }
        if (!updated) break; // converged early
    }

    // Extra pass: negative cycle check
    for (const [u, v, w] of edges) {
        if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
            return null; // negative cycle detected
        }
    }
    return dist;
}
```

### Dry Run

| Step | Round | Edge | dist[0] | dist[1] | dist[2] | dist[3] | dist[4] | Action |
|------|-------|------|---------|---------|---------|---------|---------|--------|
| Init | — | — | 0 | ∞ | ∞ | ∞ | ∞ | Source set to 0 |
| 1 | 1 | 0→1 w=−1 | 0 | −1 | ∞ | ∞ | ∞ | 0+(−1)=−1 < ∞ |
| 2 | 1 | 0→2 w=4 | 0 | −1 | 4 | ∞ | ∞ | 0+4=4 < ∞ |
| 3 | 1 | 1→2 w=3 | 0 | −1 | 2 | ∞ | ∞ | −1+3=2 < 4 |
| 4 | 1 | 1→3 w=2 | 0 | −1 | 2 | 1 | ∞ | −1+2=1 < ∞ |
| 5 | 1 | 1→4 w=2 | 0 | −1 | 2 | 1 | 1 | −1+2=1 < ∞ |
| 6 | 1 | 4→3 w=−3 | 0 | −1 | 2 | −2 | 1 | 1+(−3)=−2 < 1 |
| 7 | 2 | all | 0 | −1 | 2 | −2 | 1 | No improvement → break |
| Done | — | extra pass | 0 | −1 | 2 | −2 | 1 | No edge improves → no cycle |

### Complexity
```
Time:  O(V × E) — V-1 rounds, each scans all E edges
Space: O(V)     — just the dist[] array of size V
```

### Common Trap
**Not guarding against infinity overflow.** If dist[u] equals Integer.MAX_VALUE and you compute dist[u] + w without checking first, Java wraps around to a large negative number and incorrectly "relaxes" the edge. Always check `dist[u] != Integer.MAX_VALUE` (Java) or `dist[u] !== Infinity` (JS) before the addition.

### Experience Tip
For the "K stops" variant (LeetCode 787), run exactly K rounds — not V-1. Also, use a *copy* of the previous round's dist[] when updating, so updates within a single round do not chain into each other. Without that copy, one round can propagate a relaxation through multiple hops, which violates the "at most K stops" constraint.

### Do Not Confuse With

| | Bellman-Ford | Dijkstra |
|---|---|---|
| Use case | Shortest path with possible negative weights | Shortest path, non-negative weights only |
| Key difference | Relaxes ALL edges V-1 times; no heap needed | Greedily expands cheapest node via min-heap |
| When it's better | Negative weights present; need negative-cycle detection | Non-negative weights; need faster O((V+E) log V) |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 743 | Network Delay Time | Medium | Standard single-source shortest path; Bellman-Ford works when weights given as edge list | https://leetcode.com/problems/network-delay-time/ |
| 787 | Cheapest Flights Within K Stops | Medium | "At most K stops" = run exactly K Bellman-Ford rounds; copy dist before each round | https://leetcode.com/problems/cheapest-flights-within-k-stops/ |
| 1334 | Find the City With Smallest Neighbors at Threshold | Medium | All-pairs within threshold — run Bellman-Ford from each node or use Floyd-Warshall | https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/ |
| 1514 | Path With Maximum Probability | Medium | Maximize product of probabilities — negate log-probabilities, then minimize sum | https://leetcode.com/problems/path-with-maximum-probability/ |
| 675 | Cut Off Trees for Golf Event | Hard | Multi-source BFS between targets; shows contrast where BFS beats Bellman-Ford | https://leetcode.com/problems/cut-off-trees-for-golf-event/ |
| 399 | Evaluate Division | Medium | Weighted directed graph; BFS/DFS with weight multiplication; Bellman-Ford also works | https://leetcode.com/problems/evaluate-division/ |
| 1162 | As Far from Land as Possible | Medium | Multi-source BFS; contrast to see when uniform-cost BFS beats Bellman-Ford | https://leetcode.com/problems/as-far-from-land-as-possible/ |
| 2192 | All Ancestors of a Node in a DAG | Medium | Directed reachability; reverse edges pattern similar to Bellman-Ford propagation | https://leetcode.com/problems/all-ancestors-of-a-node-in-a-directed-acyclic-graph/ |

### One-Minute Revision
```
ALGORITHM:       Bellman-Ford
IN SIMPLE WORDS: Relax every edge V-1 times; works even with negative weights
USE WHEN:        Negative edge weights; detect negative cycles; "at most K hops" variant
CORE IDEA:       After round k, dist[] = shortest path using at most k edges
TIME/SPACE:      O(V × E) / O(V)
TRAP:            Guard dist[u] != MAX_VALUE before adding weight — overflow!
SIGNAL:          "negative weights", "arbitrage", "at most K stops/hops"
```

---

## Floyd-Warshall Algorithm

### What is it?
A travel agency needs the cheapest fare between *every* pair of cities, not just from one hub. Floyd-Warshall answers this all-pairs shortest path problem in one shot. The idea is simple dynamic programming: for each possible "layover city" k, check whether routing every (source, destination) pair through k makes the trip cheaper. After trying all V cities as layovers, you have the globally optimal distance for every pair.

### Visual
```
Graph (3 nodes, directed, weighted):
  Edges: 0→1(3), 0→2(7), 1→2(2), 2→0(−1)

Initial dist matrix (∞ = no direct edge):
      0    1    2
  0 [ 0,   3,   7 ]
  1 [ ∞,   0,   2 ]
  2 [ −1,  ∞,   0 ]

k=0 (try node 0 as layover for every (i,j) pair):
  (2,1): dist[2][0]+dist[0][1] = −1+3 = 2 < ∞  → dist[2][1] = 2
  All other pairs: no improvement
  Matrix after k=0:
      0    1    2
  0 [ 0,   3,   7 ]
  1 [ ∞,   0,   2 ]
  2 [ −1,  2,   0 ]

k=1 (try node 1 as layover):
  (0,2): dist[0][1]+dist[1][2] = 3+2 = 5 < 7  → dist[0][2] = 5
  Matrix after k=1:
      0    1    2
  0 [ 0,   3,   5 ]
  1 [ ∞,   0,   2 ]
  2 [ −1,  2,   0 ]

k=2 (try node 2 as layover):
  (1,0): dist[1][2]+dist[2][0] = 2+(−1) = 1 < ∞  → dist[1][0] = 1
  (1,1): dist[1][2]+dist[2][1] = 2+2 = 4 > 0 → no change
  Matrix after k=2:
      0    1    2
  0 [ 0,   3,   5 ]
  1 [ 1,   0,   2 ]
  2 [ −1,  2,   0 ]

Negative cycle check: dist[i][i] < 0 for any i? All diagonals = 0 → none.
Final all-pairs shortest distances found.
```

### How does it work?
1. Create a V×V distance matrix. Set dist[i][i] = 0. For each direct edge (u, v, w) set dist[u][v] = w (take the minimum if parallel edges exist). All other entries = infinity.
2. For k from 0 to V-1 (each node as a potential intermediate):
3.   For every source i from 0 to V-1:
4.     For every destination j from 0 to V-1:
5.       If dist[i][k] + dist[k][j] < dist[i][j]: update dist[i][j].
6. After all V iterations, dist[i][j] = shortest path from i to j.
7. If dist[i][i] < 0 for any i, a negative-weight cycle passes through node i.

### Why does it work?
This is dynamic programming on intermediate nodes. After the k-th outer iteration, dist[i][j] holds the shortest path from i to j using only nodes 0 through k as allowed intermediates. When k reaches V-1, every node is an allowed intermediate — giving the globally optimal answer for all pairs.

### When to use?
- Need shortest paths between ALL pairs of nodes, not just from one source.
- Graph is small (V ≤ ~400) so O(V³) is affordable.
- Mixed positive and negative edge weights exist (but no negative cycles).

### When NOT to use?
- You only need distances from one source: Dijkstra or Bellman-Ford is faster.
- Graph is large: V³ operations are too slow. Instead, run Dijkstra from each node.

### How to recognize in a new problem?
Ask: "Do I need the distance between every pair of nodes?" If yes and V is small, Floyd-Warshall is the cleanest solution.

Key signals in problem statement:
- "Find the shortest path between every pair of cities/nodes"
- "Find all reachable pairs" or "transitive closure" (can i reach j?)
- "Find the city with the fewest neighbors within distance threshold" — needs all-pairs distances

### Simple Example
**Input:** 4 nodes, edges: 0→1(3), 0→3(7), 1→0(8), 1→2(2), 2→0(5), 2→3(1), 3→0(2)
**Expected Output:** dist[0][2] = 5 (via 0→1→2), dist[3][1] = 5 (via 3→0→1)
**Trace:** k=0 unlocks paths through 0; k=1 unlocks 0→1→2 = 5 (beats no direct path); k=2 improves 0→2→3 = 5+1 = 6 < 7 for dist[0][3]; k=3 improves dist[1][1] via 1→3→0→1? No, diagonal stays 0.

### Code
```java
// Java — Floyd-Warshall all-pairs shortest path
public int[][] floydWarshall(int n, int[][] edges) {
    // Use INF/2 to avoid integer overflow when summing two INF values
    int INF = Integer.MAX_VALUE / 2;
    int[][] dist = new int[n][n];

    // Initialize: 0 on diagonal, INF everywhere else
    for (int[] row : dist) Arrays.fill(row, INF);
    for (int i = 0; i < n; i++) dist[i][i] = 0;

    // Set direct edge weights (take minimum for parallel edges)
    for (int[] edge : edges) {
        int u = edge[0], v = edge[1], w = edge[2];
        dist[u][v] = Math.min(dist[u][v], w);
    }

    // Core: try each node k as an intermediate stop
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
        }
    }

    // Negative cycle detection: any negative diagonal?
    for (int i = 0; i < n; i++) {
        if (dist[i][i] < 0) return null; // negative cycle exists
    }
    return dist;
}
```
```javascript
// JavaScript — Floyd-Warshall
function floydWarshall(n, edges) {
    const INF = 1e9; // large sentinel; avoid Number overflow
    // Initialize matrix
    const dist = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 0 : INF))
    );

    // Set direct edges (handle parallel edges with Math.min)
    for (const [u, v, w] of edges) {
        dist[u][v] = Math.min(dist[u][v], w);
    }

    // Try each node as intermediate
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
        }
    }

    // Negative cycle check
    for (let i = 0; i < n; i++) {
        if (dist[i][i] < 0) return null;
    }
    return dist;
}
```

### Dry Run

| Step | k | Pair (i,j) updated | Old value | New value | Reason |
|------|---|--------------------|-----------|-----------|--------|
| Init | — | all | — | — | Direct edges + diagonal zeros |
| 1 | 0 | (2,1) | ∞ | 2 | dist[2][0]+dist[0][1] = −1+3 = 2 |
| 2 | 1 | (0,2) | 7 | 5 | dist[0][1]+dist[1][2] = 3+2 = 5 |
| 3 | 2 | (1,0) | ∞ | 1 | dist[1][2]+dist[2][0] = 2+(−1) = 1 |
| Done | — | check diagonals | — | all 0 | No negative cycle |

### Complexity
```
Time:  O(V³) — three nested loops, each running V times
Space: O(V²) — the V×V distance matrix
```

### Common Trap
**Initializing with Integer.MAX_VALUE instead of MAX_VALUE/2.** When computing dist[i][k] + dist[k][j] and both values equal Integer.MAX_VALUE, Java integer addition overflows to a negative number, which incorrectly improves the path. Always use `Integer.MAX_VALUE / 2` in Java or a large-but-safe sentinel like `1e9` in JavaScript.

### Experience Tip
Floyd-Warshall also solves **transitive closure** — "can node i reach node j at all?" Replace edge weights with `true/false` and replace the min with a logical OR: `reach[i][j] = reach[i][j] || (reach[i][k] && reach[k][j])`. This is a frequent interview variation (LeetCode 1462 — Course Schedule IV).

### Do Not Confuse With

| | Floyd-Warshall | Bellman-Ford |
|---|---|---|
| Use case | All-pairs shortest path (every i to every j) | Single-source shortest path (one source to all) |
| Key difference | O(V³) DP on intermediate nodes; V×V matrix | O(V×E) repeated edge relaxation; 1D dist array |
| When it's better | Need distances for all pairs; V is small (≤ 400) | Need one source; graph is large or sparse |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 1334 | Find the City With Smallest Number of Neighbors at Threshold | Medium | "All pairs within distance threshold" — the phrase "all pairs" is the key signal | https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/ |
| 1462 | Course Schedule IV | Medium | "Can course i reach course j?" for all pairs — transitive closure via Floyd-Warshall | https://leetcode.com/problems/course-schedule-iv/ |
| 399 | Evaluate Division | Medium | All-pairs reachability with weighted edges — Floyd-Warshall or BFS both work | https://leetcode.com/problems/evaluate-division/ |
| 787 | Cheapest Flights Within K Stops | Medium | Single-source with constraint; contrast shows when Bellman-Ford beats Floyd-Warshall | https://leetcode.com/problems/cheapest-flights-within-k-stops/ |
| 743 | Network Delay Time | Medium | Single source; Dijkstra is faster but Floyd-Warshall also correct here | https://leetcode.com/problems/network-delay-time/ |
| 2642 | Design Graph With Shortest Path Calculator | Hard | Dynamic graph with addEdge(); re-run Floyd-Warshall or incremental Dijkstra | https://leetcode.com/problems/design-graph-with-shortest-path-calculator/ |
| 847 | Shortest Path Visiting All Nodes | Hard | Bitmask BFS; Floyd-Warshall pre-computes all-pairs distances as a useful first step | https://leetcode.com/problems/shortest-path-visiting-all-nodes/ |
| 1976 | Number of Ways to Arrive at Destination | Medium | Count shortest paths; runs Dijkstra but all-pairs thinking helps set up the DP | https://leetcode.com/problems/number-of-ways-to-arrive-at-destination/ |

### One-Minute Revision
```
ALGORITHM:       Floyd-Warshall
IN SIMPLE WORDS: Try every node as a "layover stop" to improve all (i, j) distances
USE WHEN:        Need ALL-PAIRS shortest paths; V is small (≤ ~400)
CORE IDEA:       DP — dist[i][j] via intermediates {0..k} = min(current, go through k)
TIME/SPACE:      O(V³) / O(V²)
TRAP:            Use INF/2, not MAX_VALUE — overflow when summing two INFs
SIGNAL:          "shortest path between every pair", "all pairs", "transitive closure"
```

---

## Minimum Spanning Tree — Kruskal's and Prim's

### What is it?
You need to wire up every house in a neighborhood with cable, using as little cable as possible — every house must be connected but you do not need redundant paths. A **Minimum Spanning Tree (MST)** is a subset of edges that connects all V nodes using exactly V-1 edges with the minimum possible total weight. **Kruskal's** builds the MST by greedily adding the cheapest edge that does not create a cycle. **Prim's** builds it by greedily growing one connected tree, always adding the cheapest edge that extends it to a new node.

### Visual
```
Undirected weighted graph (4 nodes):
  Edges: 0-1(4), 0-2(3), 1-2(1), 1-3(2), 2-3(4)

KRUSKAL'S:
Sort all edges by weight: (1-2,1), (1-3,2), (0-2,3), (0-1,4), (2-3,4)

Step 1: Edge 1-2 weight 1. find(1)≠find(2) → ADD. union(1,2).
         MST edges: {1-2}    Total cost: 1    Components: {0},{1,2},{3}

Step 2: Edge 1-3 weight 2. find(1)≠find(3) → ADD. union(1,3).
         MST edges: {1-2,1-3}    Total: 3    Components: {0},{1,2,3}

Step 3: Edge 0-2 weight 3. find(0)≠find(2) → ADD. union(0,2).
         MST edges: {1-2,1-3,0-2}    Total: 6    Components: {0,1,2,3}
         3 edges added = V-1 = 3 → DONE ✓

PRIM'S (start from node 0):
inMST = {0}    Available edges from {0}: 0-1(4), 0-2(3)

Step 1: Cheapest available: 0-2(3). Add node 2. Total: 3.
         inMST = {0,2}    New edges: 2-1(1), 2-3(4), 0-1(4)

Step 2: Cheapest available: 2-1(1). Add node 1. Total: 4.
         inMST = {0,1,2}    New edges: 1-3(2)

Step 3: Cheapest available: 1-3(2). Add node 3. Total: 6.
         inMST = {0,1,2,3}    All nodes in → DONE ✓

Both produce MST with total weight 6.
```

### How does it work?

**Kruskal's:**
1. Sort all edges by weight (cheapest first).
2. Initialize Union-Find — each node is its own component.
3. For each edge (u, v, w) in sorted order:
4.   If find(u) ≠ find(v): the edge connects two different components — add it to MST, call union(u, v).
5.   If find(u) == find(v): both ends already connected — skip (adding this edge would create a cycle).
6. Stop once V-1 edges have been added to the MST.

**Prim's:**
1. Initialize dist[start] = 0, all other dist[i] = infinity.
2. Use a min-heap of (edgeWeight, node) entries.
3. Extract the minimum-weight node u not yet in MST.
4. Mark u as in the MST, add its edge weight to the total.
5. For each neighbor v of u not yet in MST: push (edgeWeight, v) onto the heap.
6. Repeat until all nodes are in MST.

### Why does it work?
Both rely on the **Cut Property**: for any way of splitting graph nodes into two groups, the minimum-weight edge that crosses between the two groups must belong to some MST. Kruskal's enforces this by using Union-Find to avoid intra-component edges (those don't cross any cut). Prim's enforces it by always picking the cheapest edge from the current tree to an outside node.

### When to use?
- "Minimum cost to connect all nodes/cities/points" — the classic MST phrase.
- "Minimum weight to make the graph fully connected."
- Cluster analysis: remove the heaviest MST edges to split into clusters.

### When NOT to use?
- You need the shortest path between two specific nodes — that is Dijkstra, not MST.
- The graph is directed — standard MST is for undirected graphs (directed MST needs a different algorithm).

### How to recognize in a new problem?
Ask: "Must ALL nodes be connected, and should I minimize total edge weight?"

Key signals in problem statement:
- "Minimum cost to connect all points/cities/nodes"
- "Minimum spanning network" or "minimum total cable/road/pipe length"
- Coordinates given with Euclidean or Manhattan distance as the edge weight

### Simple Example
**Input:** 4 nodes, edges: 0-1(4), 0-2(3), 1-2(1), 1-3(2), 2-3(4)
**Expected Output:** MST total weight = 6, using edges {1-2(1), 1-3(2), 0-2(3)}
**Trace (Kruskal's):** Sort: (1-2,1),(1-3,2),(0-2,3),(0-1,4),(2-3,4). Add 1-2 → merge {1,2}. Add 1-3 → merge {1,2,3}. Add 0-2 → merge {0,1,2,3}. 3=V-1 edges → done. Total = 1+2+3 = 6.

### Code
```java
// Java — Kruskal's MST (uses Union-Find)
// edges: int[][] where each row = [u, v, weight]
public int kruskalMST(int n, int[][] edges) {
    Arrays.sort(edges, (a, b) -> a[2] - b[2]); // sort by weight ascending

    int[] parent = new int[n];
    int[] rank = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i; // each node its own root

    int totalCost = 0;
    int edgesAdded = 0;

    for (int[] edge : edges) {
        int u = edge[0], v = edge[1], w = edge[2];
        int pu = find(parent, u), pv = find(parent, v);
        if (pu != pv) {              // different components — safe to add
            union(parent, rank, pu, pv);
            totalCost += w;
            edgesAdded++;
            if (edgesAdded == n - 1) break; // MST complete
        }
    }
    // If edgesAdded < n-1, graph is disconnected — no spanning tree exists
    return edgesAdded == n - 1 ? totalCost : -1;
}

private int find(int[] parent, int x) {
    if (parent[x] != x) parent[x] = find(parent, parent[x]); // path compression
    return parent[x];
}

private void union(int[] parent, int[] rank, int px, int py) {
    if (rank[px] < rank[py]) { int t = px; px = py; py = t; }
    parent[py] = px;
    if (rank[px] == rank[py]) rank[px]++;
}

// Java — Prim's MST (uses min-heap)
// graph: Map<node, List<[neighbor, weight]>>
public int primMST(int n, Map<Integer, List<int[]>> graph) {
    boolean[] inMST = new boolean[n];
    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
    pq.offer(new int[]{0, 0}); // [edgeWeight, node]; start at node 0 with cost 0

    int totalCost = 0, nodesAdded = 0;

    while (!pq.isEmpty() && nodesAdded < n) {
        int[] curr = pq.poll();
        int w = curr[0], u = curr[1];
        if (inMST[u]) continue;    // already part of the tree — skip stale entry
        inMST[u] = true;
        totalCost += w;
        nodesAdded++;

        for (int[] edge : graph.getOrDefault(u, Collections.emptyList())) {
            int v = edge[0], weight = edge[1];
            if (!inMST[v]) pq.offer(new int[]{weight, v});
        }
    }
    return nodesAdded == n ? totalCost : -1; // -1 if graph is disconnected
}
```
```javascript
// JavaScript — Kruskal's MST
function kruskalMST(n, edges) {
    edges.sort((a, b) => a[2] - b[2]); // sort by weight

    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = new Array(n).fill(0);

    function find(x) {
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
    }

    function union(x, y) {
        let px = find(x), py = find(y);
        if (px === py) return false; // same component — would create cycle
        if (rank[px] < rank[py]) [px, py] = [py, px];
        parent[py] = px;
        if (rank[px] === rank[py]) rank[px]++;
        return true;
    }

    let totalCost = 0, edgesAdded = 0;
    for (const [u, v, w] of edges) {
        if (union(u, v)) {
            totalCost += w;
            edgesAdded++;
            if (edgesAdded === n - 1) break;
        }
    }
    return edgesAdded === n - 1 ? totalCost : -1;
}
```

### Dry Run

| Step | Algorithm | Edge considered | Action | MST edges | Total cost |
|------|-----------|----------------|--------|-----------|------------|
| Init | Kruskal's | Sort: (1-2,1),(1-3,2),(0-2,3),(0-1,4),(2-3,4) | — | {} | 0 |
| 1 | Kruskal's | 1-2 weight 1 | find(1)≠find(2) → ADD, union | {1-2} | 1 |
| 2 | Kruskal's | 1-3 weight 2 | find(1)≠find(3) → ADD, union | {1-2, 1-3} | 3 |
| 3 | Kruskal's | 0-2 weight 3 | find(0)≠find(2) → ADD, union | {1-2, 1-3, 0-2} | 6 |
| 4 | Kruskal's | edgesAdded=3=V-1 | DONE | Final MST | 6 |

### Complexity
```
Kruskal's:
  Time:  O(E log E) — sorting edges dominates; Union-Find is nearly O(1) per operation
  Space: O(V)       — Union-Find parent/rank arrays

Prim's:
  Time:  O((V + E) log V) — each node/edge pushed to heap once; heap ops are O(log V)
  Space: O(V + E)         — heap + adjacency list
```

### Common Trap
**Not checking if the graph is connected after Kruskal's.** If the graph has disconnected parts, you will finish with fewer than V-1 edges added, but `totalCost` will be a misleading partial answer. Always verify `edgesAdded == n - 1` (Kruskal's) or `nodesAdded == n` (Prim's) and return -1 if the condition fails.

### Experience Tip
Prefer **Kruskal's** when the problem gives you an edge list — sorting edges is direct and Union-Find is straightforward. Prefer **Prim's** when the graph is given as an adjacency list and is very dense (many edges). For interview problems like LeetCode 1584 "Min Cost to Connect All Points," Kruskal's with Union-Find is the cleanest and most common solution.

### Do Not Confuse With

| | MST (Kruskal's / Prim's) | Dijkstra |
|---|---|---|
| Use case | Connect ALL nodes with minimum total edge weight | Shortest path from one source to all nodes |
| Key difference | Minimizes sum of all V-1 tree edges | Minimizes path distance to reach each node |
| When it's better | "Connect everything cheapest" | "Reach a specific destination cheapest" |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 1584 | Min Cost to Connect All Points | Medium | "Minimum cost to connect ALL points" — classic Kruskal's/Prim's trigger | https://leetcode.com/problems/min-cost-to-connect-all-points/ |
| 1135 | Connecting Cities With Minimum Cost | Medium | "Minimum cost to make graph connected" — Kruskal's directly | https://leetcode.com/problems/connecting-cities-with-minimum-cost/ |
| 1168 | Optimize Water Distribution in a Village | Hard | Add virtual source node with well costs; then MST on the extended graph | https://leetcode.com/problems/optimize-water-distribution-in-a-village/ |
| 684 | Redundant Connection | Medium | The edge that causes union() to return false is the MST cycle-creating edge | https://leetcode.com/problems/redundant-connection/ |
| 1489 | Find Critical and Pseudo-Critical Edges in MST | Hard | "Critical edge" = MST breaks if removed; run MST with/without each edge | https://leetcode.com/problems/find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree/ |
| 778 | Swim in Rising Water | Hard | Minimize the maximum edge weight on any path — binary search + BFS or Kruskal-like | https://leetcode.com/problems/swim-in-rising-water/ |
| 1061 | Lexicographically Smallest Equivalent String | Medium | Union-Find to merge character groups; represents same component-grouping as MST | https://leetcode.com/problems/lexicographically-smallest-equivalent-string/ |
| 1579 | Remove Max Edges to Keep Graph Traversable | Hard | Total edges minus MST edges = removable; run Kruskal's twice (one per traversal type) | https://leetcode.com/problems/remove-max-number-of-edges-to-keep-graph-fully-traversable/ |

### One-Minute Revision
```
ALGORITHM:       Minimum Spanning Tree — Kruskal's / Prim's
IN SIMPLE WORDS: Connect all nodes with the minimum possible total edge cost
USE WHEN:        "Minimum cost to connect all nodes/points/cities"
CORE IDEA:       Cut Property — cheapest edge crossing any cut must belong to an MST
TIME/SPACE:      Kruskal: O(E log E)/O(V) | Prim: O((V+E) log V)/O(V+E)
TRAP:            Check edgesAdded == V-1; fewer means graph is disconnected → return -1
SIGNAL:          "minimum cost to connect all", "minimum spanning network"
```

---

## Strongly Connected Components — SCC (Tarjan's + Kosaraju's)

### What is it?
Imagine a one-way street network. Some neighborhoods are "roundabouts" — once you enter, you can drive to any street within that neighborhood. A **Strongly Connected Component (SCC)** is exactly this: a maximal group of nodes in a directed graph where every node can reach every other node within the group. **Kosaraju's** finds all SCCs using two DFS passes — one on the original graph, one on the reversed graph. **Tarjan's** finds all SCCs in a single DFS pass using discovery timestamps and a concept called "low-link values."

### Visual
```
Directed graph (5 nodes):
  Edges: 0→1, 1→2, 2→0,   ← cycle: SCC = {0,1,2}
         1→3,              ← 3 has no path back to 1
         4→3               ← 4 alone

SCCs: {0,1,2}, {3}, {4}

KOSARAJU'S STEP 1 — DFS on original graph; push node to stack when it FINISHES:
  DFS(0): visits 0→1→2→(0 already visited) → 2 finishes → push 2
                    → 1→3→3 finishes → push 3
               → 1 finishes → push 1
           → 0 finishes → push 0
  DFS(4): 4 finishes → push 4
  Finish stack (top = last finished): [2, 3, 1, 0, 4]   ← pop from top

KOSARAJU'S STEP 2 — Reverse ALL edges (1→0, 2→1, 0→2, 3→1);
                    pop from stack, DFS on reversed graph:

  Pop 4: DFS on reversed from 4 — no reversed outgoing edges → SCC: {4}
  Pop 0: DFS on reversed from 0: 0→2(rev)→1(rev)→(0 visited) → SCC: {0,2,1}
  Pop 1: already visited → skip
  Pop 2: already visited → skip
  Pop 3: DFS on reversed from 3 — 3→1(rev) but 1 already visited → SCC: {3}

Result: 3 SCCs: {0,1,2}, {4}, {3}
```

### How does it work?

**Kosaraju's (two passes — easier to explain in an interview):**
1. Run DFS on the original graph. Push each node onto a stack the moment it fully finishes (all its descendants have been explored).
2. Build the reversed graph (flip the direction of every edge).
3. While the stack is not empty: pop a node. If it has not been visited yet, run DFS from it on the reversed graph — every node visited in this DFS forms one SCC.

**Tarjan's (one pass — more efficient but harder to code under pressure):**
1. Run DFS. Track `disc[u]` (discovery order) and `low[u]` (lowest discovery order reachable via the current DFS path including back-edges). Also maintain a stack.
2. Push each node onto the stack on entry.
3. When DFS finishes node u: if `low[u] == disc[u]`, node u is the "root" of an SCC. Pop nodes off the stack until u is popped — they form one SCC.

### Why does it work?
In Kosaraju's: a node that finishes DFS last in the original graph is the "source" of the condensed DAG (the graph of SCCs). In the reversed graph, DFS from that source can only reach nodes in the same SCC — it cannot escape to other SCCs, because the reversed edges cut off those paths. Processing in reverse finish order exploits this property to peel off one SCC at a time.

### When to use?
- Finding all groups of mutually reachable nodes in a directed graph.
- Detecting whether a directed graph is strongly connected (answer: exactly one SCC).
- Condensing a directed graph into a DAG of SCCs for further analysis.

### When NOT to use?
- Undirected graph — every connected component is trivially "strongly connected"; use plain DFS.
- You only need single-source reachability — one DFS from the source is enough.

### How to recognize in a new problem?
Ask: "Are edges directed? Do I need to find groups where every node can reach every other within the group?"

Key signals in problem statement:
- "Strongly connected" or "mutual reachability" in a directed graph
- "Group nodes that form cycles" in a directed graph
- "Find all nodes that are part of a cycle" — each SCC with more than one node contains a cycle

### Simple Example
**Input:** 5 nodes, edges: 0→1, 1→2, 2→0, 1→3, 4→3
**Expected Output:** 3 SCCs: {0,1,2}, {3}, {4}
**Trace:** 0→1→2→0 is a cycle — one SCC. Node 3 is reached from 1 and 4 but has no outgoing edges — isolated SCC. Node 4 has no incoming edges from the cycle — isolated SCC.

### Code
```java
// Java — Kosaraju's SCC Algorithm
public List<List<Integer>> kosarajuSCC(int n, int[][] edges) {
    List<List<Integer>> graph = new ArrayList<>(), reversed = new ArrayList<>();
    for (int i = 0; i < n; i++) {
        graph.add(new ArrayList<>());
        reversed.add(new ArrayList<>());
    }
    for (int[] e : edges) {
        graph.get(e[0]).add(e[1]);
        reversed.get(e[1]).add(e[0]); // reverse the edge direction
    }

    // Pass 1: DFS on original; push to stack when node fully finishes
    boolean[] visited = new boolean[n];
    Deque<Integer> stack = new ArrayDeque<>();
    for (int i = 0; i < n; i++) {
        if (!visited[i]) dfsFinish(graph, visited, stack, i);
    }

    // Pass 2: DFS on reversed graph, in reverse-finish order
    Arrays.fill(visited, false);
    List<List<Integer>> sccs = new ArrayList<>();
    while (!stack.isEmpty()) {
        int node = stack.pop();
        if (!visited[node]) {
            List<Integer> scc = new ArrayList<>();
            dfsCollect(reversed, visited, scc, node);
            sccs.add(scc);
        }
    }
    return sccs;
}

private void dfsFinish(List<List<Integer>> graph, boolean[] visited,
                        Deque<Integer> stack, int node) {
    visited[node] = true;
    for (int neighbor : graph.get(node)) {
        if (!visited[neighbor]) dfsFinish(graph, visited, stack, neighbor);
    }
    stack.push(node); // push AFTER all descendants have finished
}

private void dfsCollect(List<List<Integer>> graph, boolean[] visited,
                         List<Integer> scc, int node) {
    visited[node] = true;
    scc.add(node);
    for (int neighbor : graph.get(node)) {
        if (!visited[neighbor]) dfsCollect(graph, visited, scc, neighbor);
    }
}
```
```javascript
// JavaScript — Kosaraju's SCC
function kosarajuSCC(n, edges) {
    const graph = Array.from({ length: n }, () => []);
    const reversed = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) {
        graph[u].push(v);
        reversed[v].push(u); // reversed edge
    }

    // Pass 1: DFS; record finish order
    const visited = new Array(n).fill(false);
    const stack = [];

    function dfsFinish(node) {
        visited[node] = true;
        for (const neighbor of graph[node]) {
            if (!visited[neighbor]) dfsFinish(neighbor);
        }
        stack.push(node); // push after all descendants finish
    }

    for (let i = 0; i < n; i++) {
        if (!visited[i]) dfsFinish(i);
    }

    // Pass 2: DFS on reversed graph, pop in reverse-finish order
    visited.fill(false);
    const sccs = [];

    function dfsCollect(node, scc) {
        visited[node] = true;
        scc.push(node);
        for (const neighbor of reversed[node]) {
            if (!visited[neighbor]) dfsCollect(neighbor, scc);
        }
    }

    while (stack.length > 0) {
        const node = stack.pop();
        if (!visited[node]) {
            const scc = [];
            dfsCollect(node, scc);
            sccs.push(scc);
        }
    }
    return sccs;
}
```

### Dry Run

| Step | Pass | Action | Stack | SCCs found | Visited |
|------|------|--------|-------|-----------|---------|
| 1 | 1 | DFS(0): visits 0→1→2→(0 visited), 2 finishes | [2] | — | {0,1,2} |
| 2 | 1 | 1→3→3 finishes, push 3; 1 finishes, push 1 | [2,3,1] | — | {0,1,2,3} |
| 3 | 1 | 0 finishes, push 0 | [2,3,1,0] | — | {0,1,2,3} |
| 4 | 1 | DFS(4): 4 finishes, push 4 | [2,3,1,0,4] | — | all |
| 5 | 2 | Pop 4: DFS reversed from 4 — no edges | [2,3,1,0] | [{4}] | {4} |
| 6 | 2 | Pop 0: DFS reversed: 0→2→1→(3 visited skip) | [2,3,1] | [{4},{0,2,1}] | {4,0,2,1} |
| 7 | 2 | Pop 1,2: already visited → skip | [2,3] | same | same |
| 8 | 2 | Pop 3: DFS reversed: no unvisited neighbors | [] | [{4},{0,2,1},{3}] | all |

### Complexity
```
Time:  O(V + E) — two DFS passes each O(V+E); building reversed graph O(E)
Space: O(V + E) — adjacency lists for both graphs, visited array, finish stack
```

### Common Trap
**Pushing a node to the stack when it is first visited instead of when it finishes.** The entire correctness of Kosaraju's Pass 1 depends on finish order — a node must go onto the stack only after all of its reachable descendants have also been fully processed. Pushing on entry (like a "visited" flag) destroys the finish ordering and mixes up different SCCs in Pass 2.

### Experience Tip
In interviews, Kosaraju's is almost always preferred over Tarjan's because it has two clear, explainable passes. Tarjan's is more efficient (single pass, no graph reversal) but requires tracking `disc[]`, `low[]`, and an on-stack boolean simultaneously — error-prone under time pressure. Know Kosaraju's deeply; mention Tarjan's by name as an optimization.

### Do Not Confuse With

| | SCC (Kosaraju's / Tarjan's) | DFS Connected Components |
|---|---|---|
| Use case | Directed graph: groups where every node reaches every other | Undirected graph: groups of nodes reachable from each other |
| Key difference | Two passes or low-link tracking; edge direction is critical | One DFS pass; direction does not apply |
| When it's better | Directed graph, mutual reachability needed | Undirected graph; simpler problem |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 802 | Find Eventual Safe States | Medium | "Safe node" = not in or leading to a cycle — SCC with size >1 is a cycle | https://leetcode.com/problems/find-eventual-safe-states/ |
| 1192 | Critical Connections in a Network | Hard | "Bridge" = edge whose removal disconnects graph; uses Tarjan's low-link concept | https://leetcode.com/problems/critical-connections-in-a-network/ |
| 207 | Course Schedule | Medium | Directed cycle detection; any SCC with >1 node means a cycle → return false | https://leetcode.com/problems/course-schedule/ |
| 323 | Number of Connected Components | Medium | Undirected version; warmup before tackling directed SCC | https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/ |
| 2101 | Detonate the Maximum Bombs | Medium | Directed reachability: DFS from each bomb; shows single-source DFS vs full SCC | https://leetcode.com/problems/detonate-the-maximum-bombs/ |
| 2876 | Count Visited Nodes in a Directed Graph | Hard | Functional graph (each node has one outgoing edge); find cycles then label SCCs | https://leetcode.com/problems/count-visited-nodes-in-a-directed-graph/ |
| 1568 | Minimum Days to Disconnect Island | Hard | Articulation point detection — same low-link idea underpins Tarjan's SCC | https://leetcode.com/problems/minimum-number-of-days-to-disconnect-island/ |
| 261 | Graph Valid Tree | Medium | Undirected: check single component + no cycle; contrast with directed SCC | https://leetcode.com/problems/graph-valid-tree/ |

### One-Minute Revision
```
ALGORITHM:       SCC — Strongly Connected Components (Kosaraju's)
IN SIMPLE WORDS: Groups in a directed graph where every node can reach every other
USE WHEN:        Directed graph; mutual reachability groups; detect directed cycles
CORE IDEA:       Pass 1 = finish order on original graph; Pass 2 = DFS on reversed in that order
TIME/SPACE:      O(V + E) / O(V + E)
TRAP:            Push to stack AFTER all descendants finish — not on node entry
SIGNAL:          "strongly connected", "mutual reachability", "condense to DAG"
```

---

## Bipartite Graph Check

### What is it?
A bipartite graph can be split into exactly two groups so that every edge goes between a node in group A and a node in group B — no edge connects two nodes within the same group. Think of a school dance: students on one side, teachers on the other, and only student-teacher pairs dance together. Checking bipartiteness is equivalent to asking: "Can I color every node either RED or BLUE so that no two neighboring nodes share the same color?" — this is called **2-coloring**.

### Visual
```
BIPARTITE (valid 2-coloring — a square):
    0 --- 1
    |     |
    3 --- 2

Color 0=RED, then neighbors: 1=BLUE, 3=BLUE
Color 1=BLUE, then neighbor 2=RED
Color 3=BLUE, then neighbor 2 should be RED — check: 2 is already RED ✓
No conflict → BIPARTITE ✓

NOT BIPARTITE (odd cycle — a triangle):
    0 --- 1
     \   /
       2

Color 0=RED
Neighbor 1=BLUE, neighbor 2=BLUE
Check edge 1-2: color[1]=BLUE, color[2]=BLUE — SAME COLOR → CONFLICT
Cannot 2-color → NOT BIPARTITE ✗

BFS coloring trace on square graph starting at node 0:
Queue: [0], color[0]=0
  Dequeue 0: neighbor 1 → color[1]=1, enqueue; neighbor 3 → color[3]=1, enqueue
Queue: [1,3], colors: [0,1,?,1]
  Dequeue 1: neighbor 0 (color 0 ≠ 1 ✓); neighbor 2 → color[2]=0, enqueue
  Dequeue 3: neighbor 0 (color 0 ≠ 1 ✓); neighbor 2 (color 0 ≠ 1 ✓)
Queue: [2], colors: [0,1,0,1]
  Dequeue 2: neighbor 1 (color 1 ≠ 0 ✓); neighbor 3 (color 1 ≠ 0 ✓)
Queue empty. No conflicts found → BIPARTITE ✓
```

### How does it work?
1. Initialize a `color[]` array with -1 (uncolored) for every node.
2. For each unvisited node, start a BFS from it, assigning it color 0.
3. For each neighbor of the current node in the BFS:
4.   If neighbor is uncolored: assign it the opposite color (`1 - currentColor`) and enqueue it.
5.   If neighbor is already colored AND has the same color as the current node: return false (not bipartite — odd cycle found).
6. If no conflict is found after processing all nodes: return true.

### Why does it work?
A graph is bipartite if and only if it contains no odd-length cycles. The BFS 2-coloring algorithm naturally forces alternating colors level by level. If an odd cycle exists, at some point BFS will reach a node via a path of odd length — then discover its neighbor (already colored) has the same color. This is exactly when the contradiction is detected.

### When to use?
- "Can you divide nodes into two groups with no edges within a group?"
- Detecting whether a graph has an odd-length cycle.
- Problems involving matching or assignment between two sets (bipartite matching).

### When NOT to use?
- K-coloring for K > 2 — those problems are NP-hard in general.
- The graph is directed and the question is not about 2-coloring.

### How to recognize in a new problem?
Ask: "Is there a two-sided partition requirement where edges only go across the two sides?"

Key signals in problem statement:
- "Divide into two groups" where "no two people in the same group should conflict/be enemies"
- "Is the graph bipartite?" stated directly
- "Can you 2-color this graph?"
- Any employee/student assignment problem where pairs of people cannot be on the same team

### Simple Example
**Input:** 4 nodes, edges: 0-1, 1-2, 2-3, 3-0 (a square — even cycle)
**Expected Output:** true
**Trace:** BFS from 0: color[0]=0, color[1]=1, color[3]=1, color[2]=0. Check all edges: 0-1 (0≠1 ✓), 1-2 (1≠0 ✓), 2-3 (0≠1 ✓), 3-0 (1≠0 ✓). No conflict → true.

**Counter-example:** 3 nodes, edges: 0-1, 1-2, 2-0 (triangle — odd cycle)
**Expected Output:** false
**Trace:** color[0]=0, color[1]=1, color[2]=0. Edge 2-0: color[2]=0 == color[0]=0 → CONFLICT → false.

### Code
```java
// Java — Bipartite Check using BFS
// graph[i] = array of neighbors of node i (LeetCode adjacency list format)
public boolean isBipartite(int[][] graph) {
    int n = graph.length;
    int[] color = new int[n];
    Arrays.fill(color, -1); // -1 = uncolored

    for (int start = 0; start < n; start++) {
        if (color[start] != -1) continue; // already colored in a previous component

        Queue<Integer> queue = new LinkedList<>();
        queue.offer(start);
        color[start] = 0; // assign first color

        while (!queue.isEmpty()) {
            int node = queue.poll();
            for (int neighbor : graph[node]) {
                if (color[neighbor] == -1) {
                    // Uncolored neighbor: assign opposite color
                    color[neighbor] = 1 - color[node];
                    queue.offer(neighbor);
                } else if (color[neighbor] == color[node]) {
                    // Same color as current node → odd cycle → not bipartite
                    return false;
                }
            }
        }
    }
    return true; // no conflict found in any component
}
```
```javascript
// JavaScript — Bipartite Check using BFS
function isBipartite(graph) {
    const n = graph.length;
    const color = new Array(n).fill(-1); // -1 = uncolored

    for (let start = 0; start < n; start++) {
        if (color[start] !== -1) continue; // already processed

        const queue = [start];
        color[start] = 0;
        let head = 0;

        while (head < queue.length) {
            const node = queue[head++];
            for (const neighbor of graph[node]) {
                if (color[neighbor] === -1) {
                    color[neighbor] = 1 - color[node]; // opposite color
                    queue.push(neighbor);
                } else if (color[neighbor] === color[node]) {
                    return false; // same color = odd cycle = not bipartite
                }
            }
        }
    }
    return true;
}
```

### Dry Run

| Step | Queue | Current node | Neighbor | Neighbor's color | Action |
|------|-------|-------------|----------|-----------------|--------|
| Init | [0] | — | — | — | color[0]=0 |
| 1 | [0] | 0 | 1 | −1 | color[1]=1, enqueue 1 |
| 2 | [0] | 0 | 3 | −1 | color[3]=1, enqueue 3 |
| 3 | [1,3] | 1 | 0 | 0 ≠ 1 | OK |
| 4 | [1,3] | 1 | 2 | −1 | color[2]=0, enqueue 2 |
| 5 | [3,2] | 3 | 0 | 0 ≠ 1 | OK |
| 6 | [3,2] | 3 | 2 | 0 ≠ 1 | OK |
| 7 | [2] | 2 | 1 | 1 ≠ 0 | OK |
| 8 | [2] | 2 | 3 | 1 ≠ 0 | OK |
| Done | [] | — | — | — | No conflict → BIPARTITE ✓ |

### Complexity
```
Time:  O(V + E) — BFS visits each node once and each edge twice (undirected)
Space: O(V)     — color[] array + BFS queue holds at most V nodes
```

### Common Trap
**Forgetting to handle disconnected components.** A single BFS starting from node 0 will only visit nodes reachable from 0. If the graph is disconnected and a separate component contains an odd cycle, you will miss it and incorrectly return true. The outer `for` loop over every node is essential — never skip it.

### Experience Tip
The 2-coloring idiom — `color[neighbor] = 1 - color[node]` — is the entire algorithm compressed to one line. Memorize this. When you see a problem asking you to partition people into two groups with a "conflict" graph, draw a few examples first: if two conflicting people ever end up in the same group, you will see an odd cycle. That mental model helps confirm whether bipartite check is the right tool.

### Do Not Confuse With

| | Bipartite Check | Cycle Detection (DFS) |
|---|---|---|
| Use case | Detect odd cycles; 2-color nodes with no same-color edges | Detect any cycle (odd or even) |
| Key difference | Even cycles are fine; only odd cycles break bipartiteness | Any cycle at all breaks acyclicity |
| When it's better | "Divide into 2 groups", odd-cycle detection, matching | General cycle detection, topological sort prerequisite |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 785 | Is Graph Bipartite? | Medium | Directly asks "is it bipartite?" — BFS 2-coloring, return false on color conflict | https://leetcode.com/problems/is-graph-bipartite/ |
| 886 | Possible Bipartition | Medium | "Divide into 2 groups with no internal dislikes" = bipartite check on the dislike graph | https://leetcode.com/problems/possible-bipartition/ |
| 1042 | Flower Planting With No Adjacent | Medium | Graph coloring with 4 colors available — same detection framework, easier constraints | https://leetcode.com/problems/flower-planting-with-no-adjacent/ |
| 2493 | Divide Nodes Into Maximum Number of Groups | Hard | Bipartite check per component + BFS to find the maximum group count | https://leetcode.com/problems/divide-nodes-into-the-maximum-number-of-groups/ |
| 684 | Redundant Connection | Medium | Contrast: any cycle breaks a tree; bipartite only breaks on odd cycles | https://leetcode.com/problems/redundant-connection/ |
| 207 | Course Schedule | Medium | Directed cycle check; contrast with undirected bipartite check | https://leetcode.com/problems/course-schedule/ |
| 1615 | Maximal Network Rank | Medium | Graph degree problem; good warmup for graph traversal before bipartite | https://leetcode.com/problems/maximal-network-rank/ |
| 959 | Regions Cut By Slashes | Medium | Grid as graph; DFS/BFS connected-component thinking prerequisite for bipartite | https://leetcode.com/problems/regions-cut-by-slashes/ |

### One-Minute Revision
```
ALGORITHM:       Bipartite Graph Check (2-Coloring)
IN SIMPLE WORDS: Can you color every node RED or BLUE so no two neighbors share a color?
USE WHEN:        "Divide into 2 groups with no intra-group edges"; detect odd cycles
CORE IDEA:       BFS: assign each neighbor the opposite color; same color = not bipartite
TIME/SPACE:      O(V + E) / O(V)
TRAP:            Loop over ALL nodes — disconnected components must each be checked
SIGNAL:          "divide into two groups", "no two adjacent same team", "bipartite"
```

---

## Network Flow — Max Flow / Ford-Fulkerson Concept

### What is it?
Imagine water flowing through a network of pipes from a source to a drain. Each pipe has a maximum capacity. **Max Flow** asks: what is the maximum total flow that can reach the drain? **Ford-Fulkerson** is the foundational approach: repeatedly find any path from source to sink that still has unused capacity (called an **augmenting path**), push as much flow as possible along it, and repeat until no such path exists. **Edmonds-Karp** is Ford-Fulkerson with BFS to find the shortest augmenting path, which guarantees a polynomial-time bound.

### Visual
```
Flow network (s=source, t=sink, numbers=capacity):
  s → A  capacity 6
  s → B  capacity 7
  A → t  capacity 5
  B → t  capacity 3
  A → B  capacity 2   (internal edge)

FORD-FULKERSON:

Step 1: Find path s→A→t.  Bottleneck = min(6,5) = 5.  Push 5 units.
  Residual: s→A has 1 left, A→t is FULL (0 left), back-edges t→A(5) and A→s(5) added.

Step 2: Find path s→B→t.  Bottleneck = min(7,3) = 3.  Push 3 units.
  Residual: s→B has 4 left, B→t is FULL (0 left).

Step 3: Find path s→A→B→t? A→t is full, but A→B(2) still open, B→t is full → blocked.
         No more augmenting paths from s to t.

Max flow = 5 + 3 = 8.

MIN-CUT (Max-Flow Min-Cut Theorem):
  The minimum cut separating s from t has edges {A→t(5), B→t(3)} = 8.
  Max flow always equals min cut capacity. ✓

WHY RESIDUAL GRAPH MATTERS:
  If you had sent s→A→B first (flow=2), then s→B→t (flow=3), then s→A→t (flow=3),
  the residual back-edge B→A(2) allows "undoing" the A→B flow, effectively rerouting.
  This is why back-edges are critical — they give the algorithm a way to correct mistakes.
```

### How does it work?
1. Build a **residual graph**: for each edge (u→v, capacity c), also track the reverse edge (v→u, capacity 0 initially). The residual capacity of u→v is `c - flowAlreadySent`.
2. While an augmenting path exists from source to sink in the residual graph (use BFS for Edmonds-Karp):
3.   Find the bottleneck: the minimum residual capacity along the path.
4.   For each edge (u→v) on the path: reduce residual capacity of u→v by bottleneck; increase residual capacity of v→u by bottleneck (the "cancel" back-edge).
5.   Add the bottleneck to the total flow.
6. When no augmenting path exists, the total flow accumulated is the maximum flow.

### Why does it work?
The **Max-Flow Min-Cut Theorem** guarantees this: the maximum flow from source to sink always equals the minimum capacity of any cut that separates source from sink. When no augmenting path exists in the residual graph, the set of nodes reachable from the source defines a minimum cut. The back-edges in the residual graph allow the algorithm to "undo" earlier routing decisions — without them, a greedy path choice could block a better global solution.

### When to use?
- "Maximum flow" or "maximum number of edge-disjoint paths" from source to sink.
- Bipartite matching — model as a flow network with a super-source and super-sink.
- Problems about capacitated routing, scheduling, or resource allocation.

### When NOT to use?
- Simple shortest path — Dijkstra or BFS is far simpler.
- The graph has no capacity constraints or the problem doesn't involve flow.

### How to recognize in a new problem?
Ask: "Is there a concept of capacity/bandwidth on edges, and do I want to maximize how much I can push from one node to another?"

Key signals in problem statement:
- "Maximum flow", "maximum throughput", "maximum bandwidth"
- "Maximum number of edge-disjoint paths" from s to t — each path carries 1 unit of flow
- "Maximum bipartite matching" — classic flow reduction
- "Minimum cut" — directly answered by max-flow min-cut theorem

### Simple Example
**Input:** 4 nodes (s=0, t=3), edges: 0→1(cap 10), 0→2(cap 10), 1→2(cap 1), 1→3(cap 10), 2→3(cap 10)
**Expected Output:** Max flow = 20
**Trace:** Path 0→1→3, bottleneck = min(10,10) = 10. Push 10. Path 0→2→3, bottleneck = min(10,10) = 10. Push 10. No more augmenting paths. Total = 20.

### Code
```java
// Java — Edmonds-Karp (Ford-Fulkerson with BFS)
// capacity[u][v] = remaining capacity from u to v (also encodes back-edges)
public int edmondsKarp(int[][] capacity, int source, int sink) {
    int n = capacity.length;
    int maxFlow = 0;

    while (true) {
        // BFS to find shortest augmenting path (Edmonds-Karp improvement)
        int[] parent = new int[n];
        Arrays.fill(parent, -1);
        parent[source] = source;
        Queue<Integer> queue = new LinkedList<>();
        queue.offer(source);

        while (!queue.isEmpty() && parent[sink] == -1) {
            int u = queue.poll();
            for (int v = 0; v < n; v++) {
                // Visit v if unvisited and there is remaining capacity
                if (parent[v] == -1 && capacity[u][v] > 0) {
                    parent[v] = u;
                    queue.offer(v);
                }
            }
        }

        if (parent[sink] == -1) break; // no augmenting path found → done

        // Find bottleneck along the path
        int pathFlow = Integer.MAX_VALUE;
        for (int v = sink; v != source; v = parent[v]) {
            int u = parent[v];
            pathFlow = Math.min(pathFlow, capacity[u][v]);
        }

        // Update residual capacities along the path
        for (int v = sink; v != source; v = parent[v]) {
            int u = parent[v];
            capacity[u][v] -= pathFlow; // forward edge: reduce capacity
            capacity[v][u] += pathFlow; // back edge: increase reverse capacity
        }

        maxFlow += pathFlow;
    }
    return maxFlow;
}
```
```javascript
// JavaScript — Edmonds-Karp (Ford-Fulkerson with BFS)
function edmondsKarp(capacity, source, sink) {
    const n = capacity.length;
    let maxFlow = 0;

    while (true) {
        // BFS to find shortest augmenting path
        const parent = new Array(n).fill(-1);
        parent[source] = source;
        const queue = [source];
        let head = 0;

        while (head < queue.length && parent[sink] === -1) {
            const u = queue[head++];
            for (let v = 0; v < n; v++) {
                if (parent[v] === -1 && capacity[u][v] > 0) {
                    parent[v] = u;
                    queue.push(v);
                }
            }
        }

        if (parent[sink] === -1) break; // no augmenting path — done

        // Bottleneck along the found path
        let pathFlow = Infinity;
        for (let v = sink; v !== source; v = parent[v]) {
            pathFlow = Math.min(pathFlow, capacity[parent[v]][v]);
        }

        // Update residual capacities
        for (let v = sink; v !== source; v = parent[v]) {
            const u = parent[v];
            capacity[u][v] -= pathFlow; // reduce forward capacity
            capacity[v][u] += pathFlow; // increase back-edge capacity
        }

        maxFlow += pathFlow;
    }
    return maxFlow;
}
```

### Dry Run

| Step | Augmenting path | Bottleneck | Residual update | Total flow |
|------|----------------|-----------|----------------|-----------|
| Init | — | — | capacity matrix initialized | 0 |
| 1 | s(0)→A(1)→t(3) | min(6,5)=5 | cap[0][1]:6→1, cap[1][3]:5→0, back-edges +5 | 5 |
| 2 | s(0)→B(2)→t(3) | min(7,3)=3 | cap[0][2]:7→4, cap[2][3]:3→0, back-edges +3 | 8 |
| 3 | BFS finds no path (A→t full, B→t full) | — | — | 8 |
| Done | Max flow = 8 | — | Min cut = {A→t(5), B→t(3)} = 8 ✓ | 8 |

### Complexity
```
Edmonds-Karp (BFS augmenting paths):
  Time:  O(V × E²) — at most O(V×E) augmenting paths, each BFS costs O(E)
  Space: O(V²)     — the capacity/residual matrix is V×V

Ford-Fulkerson with DFS (original):
  Time:  O(E × maxFlow) — can be slow if max flow is large and paths are chosen badly
  Space: O(V + E)
```

### Common Trap
**Forgetting to add back-edges to the residual graph.** Without the back-edge from v to u, the algorithm cannot "undo" flow sent along a suboptimal path. This means early greedy choices permanently block better solutions — you get a flow value that is less than the true maximum. Every edge (u→v, cap c) must have a corresponding entry capacity[v][u] initialized to 0 and updated as flow passes through.

### Experience Tip
Max flow problems rarely appear on LeetCode in pure form — they are more common in competitive programming. In interviews, the max flow connection usually hides behind **bipartite matching** ("maximum matching" = max flow on a bipartite network with unit capacities) or **minimum cut** questions. When you see "maximum number of disjoint paths," think max flow with each edge having capacity 1.

### Do Not Confuse With

| | Max Flow (Ford-Fulkerson) | Shortest Path (Dijkstra/BFS) |
|---|---|---|
| Use case | Maximize flow through a capacitated network | Minimize distance/cost to reach a node |
| Key difference | Uses residual graph with back-edges; iterative augmentation | No back-edges; single-pass (BFS) or greedy expansion (Dijkstra) |
| When it's better | Capacity constraints; matching; cut problems | No capacities; just edge costs or hop counts |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 1557 | Minimum Number of Vertices to Reach All Nodes | Medium | Nodes with in-degree 0 must be sources — flow/reachability reasoning | https://leetcode.com/problems/minimum-number-of-vertices-to-reach-all-nodes/ |
| 1376 | Time Needed to Inform All Employees | Medium | Tree propagation; good warmup for directed flow thinking | https://leetcode.com/problems/time-needed-to-inform-all-employees/ |
| 765 | Couples Holding Hands | Hard | Matching/swap problem; can be modeled as flow or solved with union-find | https://leetcode.com/problems/couples-holding-hands/ |
| 1579 | Remove Max Edges to Keep Graph Traversable | Hard | Maximize removed edges = minimize required edges (MST-flow hybrid thinking) | https://leetcode.com/problems/remove-max-number-of-edges-to-keep-graph-fully-traversable/ |
| 2092 | Find All People With Secret | Hard | Timed reachability propagation — flow of information through time-ordered edges | https://leetcode.com/problems/find-all-people-with-secret/ |
| 1059 | All Paths from Source Lead to Destination | Medium | All paths must flow to one sink — directed reachability check | https://leetcode.com/problems/all-paths-from-source-lead-to-destination/ |
| 882 | Reachable Nodes in Subdivided Graph | Hard | Weighted BFS/Dijkstra; edge subdivision is a capacity-like constraint | https://leetcode.com/problems/reachable-nodes-in-subdivided-graph/ |
| 1203 | Sort Items by Groups Respecting Dependencies | Hard | Two-level topological sort; flow-like dependency propagation | https://leetcode.com/problems/sort-items-by-groups-respecting-dependencies/ |

### One-Minute Revision
```
ALGORITHM:       Max Flow — Ford-Fulkerson / Edmonds-Karp
IN SIMPLE WORDS: Repeatedly find a path with spare capacity; push flow; repeat until stuck
USE WHEN:        Maximize flow through a network; bipartite matching; minimum cut
CORE IDEA:       Residual graph with back-edges lets you "undo" bad routing choices
TIME/SPACE:      Edmonds-Karp O(V × E²) / O(V²)
TRAP:            Always add back-edges to the residual graph — without them, results are wrong
SIGNAL:          "maximum flow", "edge-disjoint paths", "maximum matching", "minimum cut"
```

---

*Next: [12-HEAPS-AND-PRIORITY-QUEUES.md](12-HEAPS-AND-PRIORITY-QUEUES.md)*
