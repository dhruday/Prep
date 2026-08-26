# Graphs — 1-Hour Learning Module

> *"Graphs are everywhere. Social networks, maps, dependencies, states. Whenever you see 'connections' or 'relationships,' think graph."*

**Estimated Time:** 60 minutes
**Goal:** Walk into a Google interview and confidently identify, model, and solve graph problems.

---

## Table of Contents

- [[0–10 min] Big Picture](#0-10-min-big-picture)
- [[10–20 min] Mental Model](#10-20-min-mental-model)
- [[20–35 min] Core Patterns](#20-35-min-core-patterns)
- [[35–45 min] Concrete Code + Dry Run](#35-45-min-concrete-code--dry-run)
- [[45–55 min] Pattern Recognition](#45-55-min-pattern-recognition)
- [[55–60 min] Final Mental Checklist](#55-60-min-final-mental-checklist)
- [Active Recall](#active-recall)
- [Recommended Practice Direction](#recommended-practice-direction)
- [2-Minute Cheat Sheet](#2-minute-cheat-sheet)
- [Advanced Awareness](#advanced-awareness)

---

## [0–10 min] Big Picture

### What is a Graph?

A graph is a collection of **nodes** (also called vertices) connected by **edges**. That's it.

The reason graphs matter: many real problems are secretly "what is connected to what?" problems. Once you model a problem as a graph, you have a powerful set of algorithms at your disposal.

### Real-World Analogies

| Real World | Graph Model |
|---|---|
| City road network | Nodes = cities, Edges = roads |
| Social network (Twitter) | Nodes = users, Edges = "follows" |
| Course prerequisites | Nodes = courses, Edges = "must take before" |
| Webpage links | Nodes = pages, Edges = hyperlinks |
| Electrical circuit | Nodes = junctions, Edges = wires |
| Spreadsheet cell dependencies | Nodes = cells, Edges = "depends on" |

### Essential Vocabulary

**Node / Vertex:** A single entity (a city, a user, a task).

**Edge:** A connection between two nodes.

**Directed vs. Undirected:**
- **Undirected:** Edge between A and B means you can travel both ways. (Friendship on Facebook: if I'm your friend, you're mine.)
- **Directed:** Edge from A to B means you can only travel A → B. (Twitter follow: I can follow you without you following me.)

**Weighted vs. Unweighted:**
- **Unweighted:** All edges are equal. (Is there a road? Yes/No.)
- **Weighted:** Edges have costs. (How long is that road? 5 km? 100 km?)

**Degree:** Number of edges connected to a node.
- In a directed graph: **in-degree** (edges coming in) and **out-degree** (edges going out).

**Path:** A sequence of nodes where each consecutive pair is connected by an edge.

**Cycle:** A path that starts and ends at the same node.

**DAG:** Directed Acyclic Graph — a directed graph with no cycles. Very common in interview problems (course schedules, build dependencies).

**Connected Component:** A group of nodes where every node can reach every other node. A graph can have multiple disconnected components.

### Graph Representations (How to Store a Graph in Code)

**Adjacency List (default for interviews):**
- Map each node to a list of its neighbors (plus weights if needed).
- Space: O(V + E). Iterate neighbors: O(degree).
- Use this unless you have a reason not to.

**Adjacency Matrix:**
- V × V grid. matrix[i][j] = 1 (or weight) if edge exists.
- Space: O(V²). Check if edge exists: O(1).
- Use when: V is small (~1000), you need fast edge existence checks, or the graph is dense.

**Edge List:**
- A flat list of (u, v, weight) tuples.
- Space: O(E). Primarily used in Kruskal's MST (sort edges by weight).

```
Adjacency List for this graph:
    1 -- 2
    |    |
    3 -- 4

graph = {
  1: [2, 3],
  2: [1, 4],
  3: [1, 4],
  4: [2, 3]
}
```

---

## [10–20 min] Mental Model

### The Core Question for Every Graph Problem

**"How are states connected, and how should I explore them?"**

Every graph algorithm is an answer to this question. The "states" are your nodes. The "connections" are your edges. The "how to explore" is your traversal strategy.

### BFS — Explore Level by Level

**Mental image:** Drop a stone in a pond. Ripples spread outward. Every node at distance 1 is visited before any node at distance 2.

```
Start at node 1. BFS explores in this order:

       1          <-- Level 0 (start)
      / \
     2   3        <-- Level 1
    / \   \
   4   5   6      <-- Level 2

Queue after start:  [1]
Process 1:          [2, 3]
Process 2:          [3, 4, 5]
Process 3:          [4, 5, 6]
...
```

**When BFS:** "I want the shortest path" or "I want level-order processing."
- BFS guarantees the FIRST time you reach a node, you've found the shortest path (in an unweighted graph).

### DFS — Explore as Deep as Possible

**Mental image:** Exploring a maze. You always pick one direction and follow it all the way until you hit a dead end, then backtrack.

```
Start at node 1. DFS explores (one possible order):

    1
   / \
  2   5
 / \
3   4

Call stack:
DFS(1) → DFS(2) → DFS(3) → backtrack → DFS(4) → backtrack → backtrack → DFS(5)
```

**When DFS:** "I want to explore all possibilities" or "I need to detect cycles" or "I need a topological order."

### The Visited Array — Why It's Critical

Without a visited check, you'll loop forever in a graph with cycles.

```
Without visited, BFS on this graph loops forever:

    1 -- 2
    |    |
    3 -- 4

Process 1: enqueue 2, 3
Process 2: enqueue 1 (already done!), 4
Process 1 again: enqueue 2, 3 again... infinite loop
```

**Rule:** Mark a node as visited the MOMENT you enqueue it (for BFS) or the moment you enter it (for DFS). Not when you process it — too late.

### visited[] vs color[] (Three-Color DFS)

For simple connectivity, a boolean `visited[]` is enough.

For **cycle detection in directed graphs**, you need three states:

| Color | Meaning |
|---|---|
| WHITE (0) | Not yet visited |
| GRAY (1) | Currently in the DFS call stack (being processed) |
| BLACK (2) | Fully processed (all descendants explored) |

**Key insight:** If during DFS you encounter a GRAY node, you've found a back edge — which means a cycle.

```
Directed graph with cycle: A → B → C → A

DFS(A): color A = GRAY
  DFS(B): color B = GRAY
    DFS(C): color C = GRAY
      neighbor A is GRAY → CYCLE DETECTED
```

A boolean visited[] would have caught this too, but gray/black is the correct framework for directed cycle detection because it distinguishes "visited in THIS path" (gray) from "visited in a previous path" (black). A black node is fine to re-encounter.

---

## [20–35 min] Core Patterns

### Pattern 1: BFS for Shortest Path (Unweighted)

**Problem solved:** "What is the minimum number of steps/hops/moves to get from A to B?"

**Why BFS?** BFS processes nodes in order of distance. When you first reach the destination, the distance counter gives you the shortest path. DFS would find A path, but not necessarily the shortest one.

```
Algorithm:
1. Put source in queue, mark visited, distance = 0
2. While queue not empty:
   - Dequeue node u
   - If u == destination: return distance
   - For each neighbor v of u:
     - If v not visited: mark visited, enqueue v, distance[v] = distance[u] + 1
```

**Multi-Source BFS:** What if there are multiple sources? (e.g., "shortest distance from any gate to each empty room")
- Enqueue ALL sources at the start with distance 0.
- Run one BFS. Distances expand simultaneously from all sources.
- Do NOT run separate BFS from each source — that's O(sources × V) instead of O(V + E).

### Pattern 2: DFS for Components, Connectivity, Paths

**Problem solved:** "How many islands are there?" "Can I reach B from A?" "Are there any cycles?"

**Why DFS?** DFS naturally explores one connected region at a time. Count how many times you have to start a fresh DFS = number of components.

```
Count connected components:
count = 0
for each node u:
  if not visited[u]:
    DFS(u)       ← explores entire component reachable from u
    count += 1
return count
```

### Pattern 3: Topological Sort (DAGs Only)

**Problem solved:** "Given dependencies A must come before B, give a valid ordering."

**When to use:** Any time you see "prerequisites," "build order," "task scheduling with dependencies."

**Why it only works on DAGs:** If there's a cycle (A depends on B depends on A), there's no valid ordering.

**Kahn's Algorithm (BFS-based — recommended):**
```
1. Compute in-degree for every node
2. Enqueue all nodes with in-degree 0 (no prerequisites)
3. While queue not empty:
   - Dequeue node u, add to result
   - For each neighbor v: decrement in-degree[v]
   - If in-degree[v] == 0: enqueue v
4. If result.size() < V: cycle exists (not a valid DAG)
```

**DFS-based (postorder):**
```
1. DFS from each unvisited node
2. After exploring ALL descendants: push node onto a stack
3. Reverse the stack = topological order
```

**Cycle detection is a byproduct:** Kahn's tells you there's a cycle if the result is incomplete. DFS three-color tells you via a GRAY encounter.

### Pattern 4: Dijkstra — Shortest Path in Weighted Graphs

**Problem solved:** "What is the minimum COST to reach each node?" (non-negative weights only)

**Why not BFS?** BFS treats all edges as cost 1. If road A costs 1 and road B costs 100, BFS would wrongly say they're equal.

**Why a priority queue?** We always want to process the "cheapest so far" node next — greedy. A min-heap gives us this efficiently.

```
Algorithm:
1. dist[] = infinity for all nodes. dist[source] = 0.
2. Min-heap with (0, source)
3. While heap not empty:
   - Extract (d, u) with minimum d
   - If d > dist[u]: SKIP (stale entry — we already found a better path)
   - For each neighbor v with edge weight w:
     - If dist[u] + w < dist[v]:
       - dist[v] = dist[u] + w
       - Push (dist[v], v) into heap
```

**Critical:** Dijkstra FAILS with negative weights. Use Bellman-Ford if negative weights exist.

**BFS vs Dijkstra decision:**
- Unweighted (all edges = 1)? → BFS is sufficient and faster.
- Weighted (varying costs), non-negative? → Dijkstra.
- Weighted with negative costs? → Bellman-Ford.

### Pattern 5: Union-Find — Dynamic Connectivity

**Problem solved:** "Are nodes A and B in the same connected group? Merge two groups."

**When to use:** When edges are added one at a time and you need to check connectivity dynamically. Also: "detect cycle in undirected graph," "find redundant connection," "number of components."

**Two operations:**
- `find(x)`: Which group does x belong to? (Returns root of x's component)
- `union(x, y)`: Merge the groups containing x and y.

**Two optimizations (both required for near-O(1) performance):**
- **Path compression:** When finding root of x, make x (and all nodes on the path) point directly to the root.
- **Union by rank/size:** When merging, attach the smaller tree under the larger tree root.

```
With both optimizations: O(α(n)) ≈ O(1) amortized per operation
Without both: worst case O(n) per operation
```

**BFS/DFS vs Union-Find:**
- BFS/DFS: static graph, need to find components once.
- Union-Find: dynamic — edges added over time, need to query connectivity after each addition.

---

## [35–45 min] Concrete Code + Dry Run

### Graph Setup (Both Languages)

```java
// Java: Build adjacency list from edge list
Map<Integer, List<Integer>> graph = new HashMap<>();
int[][] edges = {{0,1},{0,2},{1,3},{2,3}};

for (int[] e : edges) {
    graph.computeIfAbsent(e[0], k -> new ArrayList<>()).add(e[1]);
    graph.computeIfAbsent(e[1], k -> new ArrayList<>()).add(e[0]); // undirected
}
```

```javascript
// JavaScript: Build adjacency list from edge list
const graph = new Map();
const edges = [[0,1],[0,2],[1,3],[2,3]];

for (const [u, v] of edges) {
    if (!graph.has(u)) graph.set(u, []);
    if (!graph.has(v)) graph.set(v, []);
    graph.get(u).push(v);
    graph.get(v).push(u); // undirected
}
```

---

### BFS — Shortest Path (Unweighted)

**Problem:** Find shortest path from node 0 to node 3 in this graph.

```
Graph:
    0 --- 1
    |     |
    2 --- 3

Adjacency list:
0: [1, 2]
1: [0, 3]
2: [0, 3]
3: [1, 2]
```

**Dry Run:**

```
Start: node 0, dist[0] = 0

Step 1: Queue = [(0)]
  Dequeue 0
  Neighbors: 1 (unvisited → dist[1]=1, enqueue), 2 (unvisited → dist[2]=1, enqueue)
  Queue = [(1), (2)]
  Visited = {0, 1, 2}

Step 2: Queue = [(1), (2)]
  Dequeue 1
  Neighbors: 0 (visited, skip), 3 (unvisited → dist[3]=2, enqueue)
  Queue = [(2), (3)]
  Visited = {0, 1, 2, 3}

Step 3: Dequeue 2
  Neighbors: 0 (visited), 3 (visited, dist[3] already 2)
  Queue = [(3)]

Step 4: Dequeue 3 → reached destination!
Answer: dist[3] = 2
```

**Java:**
```java
public int bfsShortestPath(Map<Integer, List<Integer>> graph, int src, int dst, int n) {
    int[] dist = new int[n];
    Arrays.fill(dist, -1);
    dist[src] = 0;

    Queue<Integer> queue = new LinkedList<>();
    queue.offer(src);

    while (!queue.isEmpty()) {
        int node = queue.poll();
        for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
            if (dist[neighbor] == -1) {         // not visited
                dist[neighbor] = dist[node] + 1;
                queue.offer(neighbor);           // mark visited ON ENQUEUE
                if (neighbor == dst) return dist[neighbor];
            }
        }
    }
    return -1; // unreachable
}
// Time: O(V + E)  Space: O(V)
```

**JavaScript:**
```javascript
function bfsShortestPath(graph, src, dst, n) {
    const dist = new Array(n).fill(-1);
    dist[src] = 0;
    const queue = [src];
    let head = 0;

    while (head < queue.length) {
        const node = queue[head++];
        for (const neighbor of (graph.get(node) || [])) {
            if (dist[neighbor] === -1) {        // not visited
                dist[neighbor] = dist[node] + 1;
                queue.push(neighbor);            // mark visited ON ENQUEUE
                if (neighbor === dst) return dist[neighbor];
            }
        }
    }
    return -1;
}
// Time: O(V + E)  Space: O(V)
```

---

### DFS — Connected Components

**Problem:** Count connected components in the same graph.

**Dry Run (recursive DFS):**

```
Graph:
    0 --- 1     4 --- 5
    |
    2     3

Call order:
Start loop i=0: visited[0]=false → DFS(0), count=1
  DFS(0): mark 0, neighbors=[1,2]
    DFS(1): mark 1, neighbors=[0] → 0 visited, return
    DFS(2): mark 2, neighbors=[0] → 0 visited, return
  DFS(0) done

i=1: visited[1]=true → skip
i=2: visited[2]=true → skip
i=3: visited[3]=false → DFS(3), count=2
  DFS(3): mark 3, neighbors=[] → return

i=4: visited[4]=false → DFS(4), count=3
  DFS(4): mark 4, neighbors=[5]
    DFS(5): mark 5, neighbors=[4] → 4 visited, return
  DFS(4) done

i=5: visited[5]=true → skip

Answer: 3 components
```

**Java:**
```java
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
// Time: O(V + E)  Space: O(V) for visited + recursion stack
```

**JavaScript:**
```javascript
function countComponents(n, edges) {
    const graph = Array.from({length: n}, () => []);
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
// Time: O(V + E)  Space: O(V)
```

---

### Dijkstra — Weighted Shortest Path

**Problem:** Find shortest path from node 0 in this weighted graph.

```
Weighted directed graph:
    0 --2--> 1
    |        |
    4        1
    |        v
    v        3
    2 --1--> 3

Edge weights: (0→1)=2, (0→2)=4, (1→3)=1, (2→3)=1
```

**Dry Run:**

```
Initial: dist = [0, ∞, ∞, ∞]
Heap = [(0, node=0)]

Step 1: Extract (0, 0). d=0 == dist[0]=0, process.
  neighbor 1: dist[0]+2=2 < dist[1]=∞ → dist[1]=2, push (2,1)
  neighbor 2: dist[0]+4=4 < dist[2]=∞ → dist[2]=4, push (4,2)
  Heap = [(2,1), (4,2)]   dist = [0, 2, 4, ∞]

Step 2: Extract (2, 1). d=2 == dist[1]=2, process.
  neighbor 3: dist[1]+1=3 < dist[3]=∞ → dist[3]=3, push (3,3)
  Heap = [(3,3), (4,2)]   dist = [0, 2, 4, 3]

Step 3: Extract (3, 3). d=3 == dist[3]=3, process.
  (no unvisited neighbors in this example)
  Heap = [(4,2)]

Step 4: Extract (4, 2). d=4 == dist[2]=4, process.
  neighbor 3: dist[2]+1=5 > dist[3]=3 → skip
  Heap = []

Final dist = [0, 2, 4, 3]
```

**Java:**
```java
public int[] dijkstra(Map<Integer, List<int[]>> graph, int src, int n) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;

    // PriorityQueue: [distance, node]
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
    return dist;
}
// Time: O((V + E) log V)  Space: O(V + E)
```

**JavaScript:**
```javascript
// Simple min-heap implementation or use a library.
// Here we use a sorted array for clarity (not optimal but correct):
function dijkstra(graph, src, n) {
    const dist = new Array(n).fill(Infinity);
    dist[src] = 0;

    // [distance, node] — use a proper MinHeap in production
    const heap = [[0, src]];

    while (heap.length > 0) {
        heap.sort((a, b) => a[0] - b[0]); // inefficient, use real MinHeap
        const [d, u] = heap.shift();

        if (d > dist[u]) continue; // stale entry

        for (const [v, w] of (graph.get(u) || [])) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                heap.push([dist[v], v]);
            }
        }
    }
    return dist;
}
// Time: O((V + E) log V) with proper MinHeap  Space: O(V + E)
```

---

### Union-Find

**Java:**
```java
class UnionFind {
    int[] parent, rank;

    UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i; // each node is its own root
    }

    int find(int x) {
        if (parent[x] != x)
            parent[x] = find(parent[x]); // path compression
        return parent[x];
    }

    boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false; // already same component — adding edge creates cycle
        // union by rank
        if (rank[px] < rank[py]) { int tmp = px; px = py; py = tmp; }
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        return true; // successfully merged
    }
}
// find: O(α(n)) ≈ O(1) amortized  Space: O(n)
```

**JavaScript:**
```javascript
class UnionFind {
    constructor(n) {
        this.parent = Array.from({length: n}, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }

    find(x) {
        if (this.parent[x] !== x)
            this.parent[x] = this.find(this.parent[x]); // path compression
        return this.parent[x];
    }

    union(x, y) {
        let px = this.find(x), py = this.find(y);
        if (px === py) return false; // cycle detected
        if (this.rank[px] < this.rank[py]) [px, py] = [py, px];
        this.parent[py] = px;
        if (this.rank[px] === this.rank[py]) this.rank[px]++;
        return true;
    }
}
```

---

## [45–55 min] Pattern Recognition

### Recognizing Graph Problems in Disguise

Many problems don't say "graph" but are secretly graph problems. Watch for these signals:

| If you see... | Think... |
|---|---|
| Grid of cells, move to adjacent cells | BFS/DFS on grid (each cell = node) |
| Words transforming into other words | BFS, word = node, valid transform = edge |
| Tasks with dependencies / prerequisites | Topological sort on DAG |
| "Are A and B connected?" | BFS/DFS or Union-Find |
| "Minimum steps / shortest path" (unweighted) | BFS |
| "Minimum cost / cheapest path" (weighted) | Dijkstra |
| "Count groups / components / islands" | DFS + component counter |
| "Detect a cycle" | DFS (color array) or Union-Find |
| "Dynamic connectivity: add edges one by one" | Union-Find |
| "Order with constraints" | Topological sort |

### BFS vs DFS vs Dijkstra vs Topological Sort

**Use BFS when:**
- You need the shortest path and the graph is unweighted.
- You need level-order processing (e.g., "how many levels deep?").
- Multi-source shortest distance (rotten oranges, walls and gates).
- Keywords: "minimum steps," "minimum moves," "shortest (unweighted)," "nearest."

**Use DFS when:**
- You need to explore all possibilities (backtracking).
- You need to detect cycles.
- You need topological order (postorder DFS).
- You need to count / identify connected components.
- Keywords: "all paths," "connected," "reachable," "component," "island," "cycle."

**Use Dijkstra when:**
- BFS is insufficient because edges have different costs.
- Weights are non-negative.
- Keywords: "minimum cost," "cheapest," "weighted graph," "shortest path with weights."

**Use Topological Sort when:**
- There's an explicit or implied ordering constraint.
- The graph is directed and should be acyclic (DAG).
- Keywords: "prerequisite," "before," "dependency," "schedule," "ordering."

**Use Union-Find when:**
- You need to merge groups and query group membership dynamically.
- Detecting cycles in undirected graphs (edge connects same component = cycle).
- Keywords: "merge," "redundant connection," "group," "connected components" (dynamic).

### BFS vs Dijkstra — The Exact Decision Boundary

```
Edge weights all equal (or unweighted)?
   YES → BFS. O(V+E), simpler, no heap needed.
   NO  → all non-negative weights? → Dijkstra. O((V+E) log V)
          some negative weights? → Bellman-Ford. O(V×E)
          need all-pairs distances? → Floyd-Warshall. O(V³)
```

### Grid Problem Patterns

```
Grid BFS/DFS template decision:

Start from a single source?     → BFS (shortest path) or DFS (reachability)
Start from multiple sources?    → Multi-source BFS (enqueue ALL sources first)
Start from the border?          → DFS/BFS from all border cells (Surrounded Regions, Pacific Atlantic)
```

Common grid problem patterns:

| Problem | Key Insight |
|---|---|
| Number of Islands | DFS/BFS from each unvisited '1', count starts |
| Surrounded Regions | Work backwards: mark border-connected 'O's as safe, flip rest |
| Pacific Atlantic | Multi-source BFS from each ocean's border, find intersection |
| Shortest Path (binary grid) | BFS from (0,0) to (n-1,n-1) |
| Rotting Oranges / 01 Matrix / Walls and Gates | Multi-source BFS from all rotten/zero/gate cells |

### Cycle Detection Quick Reference

```
Undirected graph cycle:
  DFS: neighbor is visited AND not the direct parent → cycle
  Union-Find: edge (u,v) where find(u) == find(v) → cycle

Directed graph cycle:
  DFS three-color: encounter a GRAY node → cycle
  Kahn's (topo sort): result.size() < V → cycle
```

---

## [55–60 min] Final Mental Checklist

When you see a graph problem in an interview:

```
Step 1: IDENTIFY
  □ Is this a graph problem? (connections, relationships, networks, grids)
  □ Directed or undirected?
  □ Weighted or unweighted?
  □ Is there a cycle? Is it a DAG?

Step 2: REPRESENT
  □ How am I building the graph? (adjacency list, grid, implicit edges)
  □ Do I need to build it explicitly or can I generate neighbors on-the-fly?

Step 3: CHOOSE ALGORITHM
  □ Shortest path, unweighted? → BFS
  □ Shortest path, weighted, non-negative? → Dijkstra
  □ All components? Count islands? → DFS + loop
  □ Ordering with dependencies? → Topological sort (Kahn's preferred)
  □ Cycle detection? → DFS color array (directed) or Union-Find (undirected)
  □ Dynamic connectivity? → Union-Find

Step 4: HANDLE EDGE CASES
  □ Disconnected graph → loop over all nodes
  □ Mark visited ON ENQUEUE (BFS) or ON ENTRY (DFS)
  □ Multi-source? → enqueue all sources before starting
  □ Dijkstra: skip stale heap entries (d > dist[u])

Step 5: COMPLEXITY
  □ BFS/DFS: O(V + E) time, O(V) space
  □ Dijkstra: O((V + E) log V) time, O(V + E) space
  □ Topological sort: O(V + E) time, O(V + E) space
  □ Union-Find: O(α(n)) ≈ O(1) per operation, O(n) space
```

---

## Active Recall

Test yourself before moving on. Cover the answers and answer from memory.

1. **You have an unweighted graph and need the minimum number of moves from A to B. Which algorithm?**
   *(BFS — it processes nodes in order of distance, so the first time you reach B is the shortest path.)*

2. **You have a weighted graph with non-negative costs. Which algorithm?**
   *(Dijkstra — greedy BFS with a min-heap.)*

3. **BFS marks visited when enqueuing. Why not when dequeuing?**
   *(If you mark on dequeue, the same node can be enqueued multiple times before it's processed, leading to redundant work and potentially wrong distances.)*

4. **Why does Dijkstra fail on negative edge weights?**
   *(Dijkstra assumes that once a node is extracted from the heap with the minimum distance, that distance is final. A negative edge later in the path could yield a shorter route, violating this assumption.)*

5. **In Kahn's topological sort, what does it mean if result.size() < V?**
   *(There is a cycle — some nodes could never reach in-degree 0 because they're waiting on each other circularly.)*

6. **What are the two Union-Find optimizations, and why do you need both?**
   *(Path compression + union by rank. Without path compression, find() is O(depth). Without union by rank, the tree can become a linked list of depth O(n). Together: O(α(n)) ≈ O(1) amortized.)*

7. **When would you use Union-Find over DFS for connected components?**
   *(When edges are added dynamically over time and you need to query connectivity after each addition. DFS requires re-scanning the entire graph each time.)*

8. **What is the difference between WHITE, GRAY, and BLACK in DFS cycle detection?**
   *(WHITE = not visited. GRAY = currently in the recursion stack. BLACK = fully processed. Finding a GRAY node during DFS means there's a back edge → cycle.)*

9. **You're doing multi-source BFS for "rotten oranges." Should you run BFS from each rotten orange separately?**
   *(No. Enqueue ALL rotten oranges at the start with time=0. One BFS pass propagates simultaneously from all sources. Running separate BFS would overcount time.)*

10. **For topological sort, when would you prefer Kahn's (BFS) over DFS?**
    *(Kahn's is usually preferred in interviews: it directly detects cycles (result.size() < V), it's iterative (no stack overflow risk), and it directly produces the ordering without reversal. DFS-based is useful when you want postorder processing naturally.)*

---

## Recommended Practice Direction

Work through problems in this order. Each tier builds on the last.

**Tier 1 — Get the mechanics right (do these first):**
- Number of Islands (LC 200) — basic DFS/BFS on grid
- Clone Graph (LC 133) — DFS with HashMap
- Course Schedule (LC 207) — cycle detection via topological sort
- Binary Tree Level Order Traversal (LC 102) — BFS warmup

**Tier 2 — Core patterns:**
- Rotting Oranges (LC 994) — multi-source BFS
- Course Schedule II (LC 210) — actual topological ordering
- Number of Connected Components in Undirected Graph (LC 323) — components
- Pacific Atlantic Water Flow (LC 417) — multi-source BFS from borders
- Network Delay Time (LC 743) — standard Dijkstra
- Word Ladder (LC 127) — BFS on implicit graph

**Tier 3 — Harder applications:**
- Cheapest Flights Within K Stops (LC 787) — Dijkstra with state or Bellman-Ford
- Alien Dictionary (LC 269) — topological sort from comparisons
- Redundant Connection (LC 684) — Union-Find cycle detection
- Accounts Merge (LC 721) — Union-Find grouping
- Shortest Path in Binary Matrix (LC 1091) — BFS on grid
- Find if Path Exists in Graph (LC 1971) — BFS/DFS/Union-Find

**Tier 4 — Advanced:**
- Swim in Rising Water (LC 778) — Dijkstra on grid
- Shortest Path to Get All Keys (LC 864) — multi-state BFS
- Critical Connections in a Network (LC 1192) — Tarjan's bridges

---

## 2-Minute Cheat Sheet

```
GRAPH ALGORITHM QUICK REFERENCE
================================

BFS (shortest path, unweighted):
  queue, visited, mark ON ENQUEUE
  O(V+E) time, O(V) space

DFS (components, cycles, all paths):
  recursive or stack, visited
  O(V+E) time, O(V) space

Topological Sort (DAG ordering):
  Kahn's: in-degree array + BFS queue
  O(V+E) time, O(V+E) space
  Cycle if result.size() < V

Dijkstra (weighted shortest path, non-neg):
  min-heap of (dist, node), skip if stale
  O((V+E) log V) time, O(V+E) space
  FAILS with negative weights

Union-Find (dynamic connectivity):
  parent[] + rank[], path compression + union by rank
  O(α(n)) ≈ O(1) per operation, O(n) space

GRAPH REPRESENTATIONS
  Adjacency List: O(V+E) — DEFAULT
  Adjacency Matrix: O(V²) — use for dense/small V
  Edge List: O(E) — use for Kruskal's

CYCLE DETECTION
  Undirected: visited + parent check (DFS) or Union-Find
  Directed: 3-color DFS (WHITE/GRAY/BLACK) or Kahn's

KEY TRAPS
  BFS: mark visited ON ENQUEUE, not dequeue
  Multi-source BFS: enqueue ALL sources, ONE pass
  Dijkstra: skip stale heap entries (d > dist[u])
  Topological sort: only works on DAGs
  Union-Find: need BOTH path compression AND union by rank
```

---

## Advanced Awareness

These topics appear rarely in standard interviews but may come up in system design, hard LeetCode, or specialist roles. Know what they are and when to reach for them.

**Bellman-Ford:** Relax ALL edges V-1 times. Handles negative edge weights. Detects negative cycles on pass V. O(V×E). Use when Dijkstra can't (negative weights present).

**Floyd-Warshall:** Triple nested loop. Finds shortest paths between ALL pairs of nodes. O(V³) time, O(V²) space. k loop must be outermost. Use for small graphs needing all-pairs distances.

**Kruskal's MST:** Sort edges by weight, union-find to avoid cycles, add V-1 edges. O(E log E). Use to connect all nodes with minimum total edge cost.

**Prim's MST:** Greedy expansion from one node using a min-heap, like Dijkstra but tracking minimum edge weight to tree. O((V+E) log V). Better than Kruskal's for dense graphs.

**0-1 BFS:** Graph with only 0 and 1 edge weights. Use deque: push weight-0 edges to front, weight-1 edges to back. O(V+E) — faster than Dijkstra's O((V+E) log V) for binary weights.

**Multi-State BFS:** State = (position, extra_info). Example: (row, col, walls_remaining). Visited tracks full state, not just position. Use when there's a constraint that changes the meaning of "visiting" a location.

**Bipartite Check:** Color nodes with 2 colors via BFS/DFS. If a neighbor has the same color → not bipartite. A graph is bipartite if and only if it has no odd-length cycles.

**Strongly Connected Components (SCCs):** Maximal groups in directed graphs where every node can reach every other. Kosaraju's (two DFS passes) and Tarjan's (one DFS with low-link values) both run in O(V+E).

**Bridges and Articulation Points (Tarjan's):** Edge (u,v) is a bridge if low[v] > disc[u]. Node u is an articulation point if it has a child v where low[v] >= disc[u]. Critical for network reliability problems.

**Network Flow (Ford-Fulkerson / Edmonds-Karp):** Find maximum flow from source to sink. Max-flow = min-cut theorem. Rarely required in interviews. Key insight: maximum bipartite matching reduces to max-flow.

---

*Next: [12-HEAPS-AND-PRIORITY-QUEUES.md](12-HEAPS-AND-PRIORITY-QUEUES.md) — The "give me the best so far" data structure.*
