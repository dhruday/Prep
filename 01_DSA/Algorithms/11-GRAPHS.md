# Graphs — Google Interview Deep Dive

> Read fast. Understand deeply. Go practice on LeetCode immediately.

---

## Table of Contents

- [BFS — Shortest Path (Unweighted)](#bfs--shortest-path-unweighted)
- [DFS — Connected Components and Cycle Detection](#dfs--connected-components-and-cycle-detection)
- [Topological Sort — Kahn's Algorithm](#topological-sort--kahns-algorithm)
- [Dijkstra — Weighted Shortest Path](#dijkstra--weighted-shortest-path)
- [Union-Find / DSU — Dynamic Connectivity](#union-find--dsu--dynamic-connectivity)

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

*Next: [12-HEAPS-AND-PRIORITY-QUEUES.md](12-HEAPS-AND-PRIORITY-QUEUES.md)*
