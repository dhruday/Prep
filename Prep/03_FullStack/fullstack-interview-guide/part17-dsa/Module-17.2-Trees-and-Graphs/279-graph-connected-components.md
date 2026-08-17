# Graph Connected Components
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Connected component** = a maximal set of nodes where every node is reachable from every other node via graph edges; "maximal" means you can't add any more nodes to the component
- **Algorithm**: outer `for` loop over all nodes; if node is not yet visited, start a BFS or DFS from it (this traces one complete component); increment component count; repeat until all nodes are visited — this is O(V + E)
- **Union-Find (Disjoint Set Union)** is the optimal data structure for connected components when edges are added dynamically — each "find" traces to root in near-O(1) amortised with path compression + union by rank; when edges arrive one at a time and you need the component count after each addition, Union-Find is the right tool
- **Undirected vs directed**: in an undirected graph, add both directions when building the adjacency list; a "connected component" for undirected graphs = any group of mutually reachable nodes; for directed graphs, use "Strongly Connected Components" (Kosaraju's or Tarjan's — two separate algorithms)
- **Common problem patterns**: number of islands (grid = implicit graph, land cells = nodes, adjacency = 4-directional neighbors), number of provinces (adjacency matrix input), number of friend groups, find all nodes with same group ID
- **Grid problems**: treat each `'1'` cell as a graph node; DFS from each unvisited `'1'`, marking visited by flipping to `'0'` (avoids extra visited set); count how many times DFS was started = number of components

---

## 1. One-Line Definition
A connected component is a maximal group of nodes in an undirected graph where every pair of nodes is connected by a path; finding all components means partitioning the graph into these groups so that no path exists between nodes from different groups.

---

## 2. The Problem It Solves

A graph may not be fully connected. In a social network, some users may have no mutual connections. In a delivery network, some warehouses may not be reachable from each other. In a UI component dependency graph, some components may be isolated.

Finding connected components answers:
- How many isolated subgraphs exist?
- Which nodes belong together?
- After removing a node or edge, does the graph become disconnected? (Bridge / articulation point problems extend this)

Real applications:
- Fraud detection: find clusters of accounts with shared transaction patterns
- Network diagnostics: identify isolated subnets
- Product recommendation: group items bought together into clusters
- SAP workflow: find isolated workflow sub-processes that have no dependencies

---

## 3. How It Works Internally

### BFS/DFS Approach — "Paint Each Island a Different Colour"

```
Graph — undirected:
Nodes: 0, 1, 2, 3, 4, 5
Edges: 0-1, 1-2,   3-4

Component 1: {0, 1, 2}   — nodes 0, 1, 2 are all mutually reachable
Component 2: {3, 4}       — nodes 3 and 4 are connected but not to component 1
Component 3: {5}           — node 5 is isolated (no edges), still a component

Algorithm:
  visited = {}
  components = 0
  
  i=0: not visited → BFS from 0 → visits {0, 1, 2} → components=1
  i=1: already visited → skip
  i=2: already visited → skip
  i=3: not visited → BFS from 3 → visits {3, 4} → components=2
  i=4: already visited → skip
  i=5: not visited → BFS from 5 → visits {5} → components=3

Answer: 3 components
```

### Union-Find Approach — "Merge Groups Incrementally"

```
Nodes: 0, 1, 2, 3, 4
Initially: each node is its own component → parent = [0, 1, 2, 3, 4], count = 5

Process edge (0, 1): find(0)=0, find(1)=1 → different → union → parent[1]=0, count=4
Process edge (1, 2): find(1)→find(0)=0, find(2)=2 → different → union → parent[2]=0, count=3
Process edge (3, 4): find(3)=3, find(4)=4 → different → union → parent[4]=3, count=2

Final parent: [0, 0, 0, 3, 3]
Components: 2 (root 0 → {0,1,2}, root 3 → {3,4})
```

---

## 4. The Code

### Wrong Way — Classic Bugs

```java
// ❌ WRONG 1: Building adjacency list with only ONE direction for undirected graph

Map<Integer, List<Integer>> graph = new HashMap<>();
for (int[] edge : edges) {
    graph.computeIfAbsent(edge[0], k -> new ArrayList<>()).add(edge[1]);
    // ❌ Missing the reverse direction:
    // graph.computeIfAbsent(edge[1], k -> new ArrayList<>()).add(edge[0]);
}
// BFS from node A can reach B (A→B edge exists) but BFS from B cannot reach A
// Components are under-counted — the graph behaves as directed instead of undirected
```

```java
// ❌ WRONG 2: Forgetting isolated nodes (nodes with no edges)

// Building graph from edges only:
for (int[] edge : edges) {
    graph.computeIfAbsent(edge[0], k -> new ArrayList<>()).add(edge[1]);
    graph.computeIfAbsent(edge[1], k -> new ArrayList<>()).add(edge[0]);
}
// ❌ If node 5 has no edges, it's never added to the graph map
// The outer loop: for (int i = 0; i < n; i++) if (!visited.contains(i)) ...
//   reaches i=5, finds it unvisited, calls BFS(5)
//   BFS: graph.get(5) returns null → NullPointerException

// ✅ Fix: initialise all n nodes in the graph before processing edges
for (int i = 0; i < n; i++) graph.put(i, new ArrayList<>());  // ← initialise ALL nodes first
```

```java
// ❌ WRONG 3: Union-Find without path compression — O(n) find in worst case

int[] parent = new int[n];
for (int i = 0; i < n; i++) parent[i] = i;

// Without path compression, a sequence of unions creates a chain:
// union(0,1): parent[1]=0
// union(1,2): parent[2]=1 → chain: 2→1→0
// union(2,3): parent[3]=2 → chain: 3→2→1→0
// find(3): 3→2→1→0 = 4 steps → O(n) per find

int find(int x) {
    // ❌ No path compression — walk up the chain every time
    while (parent[x] != x) x = parent[x];
    return x;
}
```

### Right Way — Three Approaches

```java
// ✅ APPROACH 1: BFS Connected Components

public int countComponentsBFS(int n, int[][] edges) {
    // ✅ Step 1: Build adjacency list, initialise ALL nodes
    Map<Integer, List<Integer>> graph = new HashMap<>();
    for (int i = 0; i < n; i++) graph.put(i, new ArrayList<>());
    for (int[] edge : edges) {
        graph.get(edge[0]).add(edge[1]);
        graph.get(edge[1]).add(edge[0]);  // ✅ undirected — both directions
    }
    
    Set<Integer> visited = new HashSet<>();
    int components = 0;
    
    // ✅ Step 2: Visit every node; BFS from each unvisited node traces one component
    for (int i = 0; i < n; i++) {
        if (!visited.contains(i)) {
            bfs(graph, i, visited);
            components++;  // ✅ one complete component found per BFS call
        }
    }
    return components;
}

private void bfs(Map<Integer, List<Integer>> graph, int start, Set<Integer> visited) {
    Queue<Integer> q = new ArrayDeque<>();
    visited.add(start);    // ✅ mark at enqueue
    q.offer(start);
    
    while (!q.isEmpty()) {
        int node = q.poll();
        for (int neighbor : graph.get(node)) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);  // ✅ mark at enqueue
                q.offer(neighbor);
            }
        }
    }
}
```

```java
// ✅ APPROACH 2: DFS Connected Components (Grid — Number of Islands)

public int numIslands(char[][] grid) {
    int rows = grid.length, cols = grid[0].length;
    int islands = 0;
    
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == '1') {  // ✅ unvisited land cell = new component
                dfsFlood(grid, r, c, rows, cols);
                islands++;
            }
        }
    }
    return islands;
}

private void dfsFlood(char[][] grid, int r, int c, int rows, int cols) {
    // ✅ Boundary check + already-visited check (in-place by flipping '1' to '0')
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1') return;
    
    grid[r][c] = '0';  // ✅ mark visited — avoids extra Set<>; mutates input (acceptable unless problem forbids it)
    
    dfsFlood(grid, r+1, c, rows, cols);
    dfsFlood(grid, r-1, c, rows, cols);
    dfsFlood(grid, r, c+1, rows, cols);
    dfsFlood(grid, r, c-1, rows, cols);
}
// Time: O(rows × cols), Space: O(rows × cols) worst case call stack
```

```java
// ✅ APPROACH 3: Union-Find (DSU) with Path Compression + Union by Rank
// Use when: edges arrive dynamically, need to query "same component?" after each edge

public class UnionFind {
    private final int[] parent;
    private final int[] rank;      // ← rank/size for union by rank
    private int components;
    
    public UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        components = n;             // ← initially n separate components
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    
    // ✅ Find with PATH COMPRESSION — makes all nodes on the path point directly to root
    public int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);  // ✅ recursive path compression
        }
        return parent[x];
    }
    
    // ✅ Union by RANK — attach shorter tree under taller tree to keep height small
    public boolean union(int x, int y) {
        int rootX = find(x);
        int rootY = find(y);
        if (rootX == rootY) return false;  // ← already same component
        
        if (rank[rootX] < rank[rootY]) {
            parent[rootX] = rootY;
        } else if (rank[rootX] > rank[rootY]) {
            parent[rootY] = rootX;
        } else {
            parent[rootY] = rootX;
            rank[rootX]++;         // ← equal rank — one tree grows taller
        }
        components--;
        return true;  // ← successfully merged two different components
    }
    
    public int getComponents() { return components; }
}

// Usage: count components after processing all edges
public int countComponents(int n, int[][] edges) {
    UnionFind uf = new UnionFind(n);
    for (int[] edge : edges) {
        uf.union(edge[0], edge[1]);
    }
    return uf.getComponents();
}
// Time: O(E × α(n)) where α is inverse Ackermann — practically O(1) per operation
// Space: O(n)
```

```typescript
// ✅ TypeScript — Connected components for UI feature flag dependency graph

class UnionFind {
    private parent: number[];
    private rank: number[];
    public components: number;
    
    constructor(n: number) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
        this.components = n;
    }
    
    find(x: number): number {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);  // path compression
        }
        return this.parent[x];
    }
    
    union(x: number, y: number): boolean {
        const rootX = this.find(x);
        const rootY = this.find(y);
        if (rootX === rootY) return false;
        
        if (this.rank[rootX] < this.rank[rootY]) {
            this.parent[rootX] = rootY;
        } else if (this.rank[rootX] > this.rank[rootY]) {
            this.parent[rootY] = rootX;
        } else {
            this.parent[rootY] = rootX;
            this.rank[rootX]++;
        }
        this.components--;
        return true;
    }
}

// E.g. find isolated feature groups in a feature-flag dependency graph
function countFeatureGroups(featureCount: number, deps: [number, number][]): number {
    const uf = new UnionFind(featureCount);
    for (const [a, b] of deps) uf.union(a, b);
    return uf.components;
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the time complexity of finding all connected components using BFS?"

**Hruday's answer:**
> O(V + E) — the same as a single BFS traversal. Here's why: the outer loop runs V times (once per node). But each node is visited exactly once — after it's visited, it's never processed again. Each edge is "examined" twice in an undirected graph (once from each endpoint), but only at the point when one of its endpoints is dequeued. Total work: O(V) from the outer loop visits + O(E) from examining all edges = O(V + E).
>
> Space complexity: O(V) for the visited set plus O(V) for the BFS queue in the worst case (one level with all nodes). Adjacency list storage itself is O(V + E) but that's input, not extra space used by the algorithm.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain how Union-Find's path compression works and why it's important."

**Hruday's answer:**
> Without path compression, Union-Find can degrade to O(n) per `find` operation. Imagine a series of unions that produces a long chain: 1→2→3→4→5→6 where 6 is the root. Finding the root of 1 walks the entire chain — 6 steps.
>
> Path compression flattens the chain. During `find(1)`, we recursively discover the root (6). On the way back up, we set `parent[1] = 6`, `parent[2] = 6`, `parent[3] = 6`, and so on. Next `find(1)` is 1 step: `parent[1] = 6`.
>
> Combined with union by rank (always attach the shorter tree under the taller), the amortised cost per operation becomes O(α(n)) — where α is the inverse Ackermann function. For any practical n, α(n) ≤ 4. So Union-Find with both optimisations is effectively O(1) per operation.
>
> Why it matters at SAP: we used Union-Find for user permission group merging — when two organisational units merge, their permission sets merge. With O(1) per merge and O(1) per "same group?" query, this scaled to millions of users with no performance issue.

---

### Q3 — Application
**Interviewer asks:** "How do you count connected components in an adjacency matrix instead of an adjacency list?"

**Hruday's answer:**
> An adjacency matrix `isConnected[i][j] == 1` means node i and node j are directly connected. I build the adjacency list from the matrix first — iterate over all pairs, add neighbours where `isConnected[i][j] == 1` (skip self-loops `i == j`). Then run the standard outer BFS/DFS loop.
>
> Or skip the list conversion and use the matrix directly in BFS: when processing node `i`, check `isConnected[i][j]` for all `j` to find neighbours. Time O(V²) because checking all potential neighbours for each node is O(V) and there are V nodes — compared to O(V + E) for adjacency list, but adjacency matrix input is already O(V²) to read, so the overall complexity is the same given the input size.
>
> LeetCode's "Number of Provinces" problem gives an adjacency matrix and asks for component count — it's exactly this pattern.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Forgetting to initialise all nodes before adding edges | "I'll add nodes when I process edges" | If some nodes are only in edges (not the full 0..n-1 range) or if some nodes have NO edges (isolated nodes), the graph map won't contain entries for them; `graph.get(isolatedNode)` returns null; either use `computeIfAbsent` when adding neighbors, OR initialise ALL n nodes at the start of graph construction — the latter is safer and clearer; this bug often only surfaces when test cases include isolated nodes |
| One-directional adjacency list for undirected graph | "I'll add `A→B` for each edge (A, B)" | For undirected graphs, both directions must be in the adjacency list; BFS from B will never reach A if only the A→B direction is stored; the fix is one extra line per edge: `graph.get(edge[1]).add(edge[0])`; this bug is common because adjacency list code for directed graphs looks identical except for this one missing line — easy to overlook under interview pressure |
| Union-Find without path compression bottleneck | "Union-Find is O(n) per find — that's acceptable" | Without path compression and union by rank, O(n) per find makes the total complexity O(n × E) in pathological cases; with path compression AND union by rank, each operation is amortised O(α(n)) ≈ O(1); always implement BOTH optimisations together — path compression alone gets you to O(log n), union by rank alone gets you to O(log n), but together they achieve near-constant time |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we built a feature-flag dependency analysis tool for our UI platform. Feature flags could depend on other flags (e.g., 'new checkout flow' depended on 'unified cart' and 'payment redesign'). The business question was: if we toggle this flag, which other flags are in its connected dependency group?
>
> We modelled this as an undirected graph (flags = nodes, dependencies = edges) and ran Union-Find. Each flag had an ID; each dependency was a `union(flagA, flagB)` call. When a PO asked 'how many independent feature groups do we have?', the answer was `uf.getComponents()` — one call, instant result.
>
> This replaced a slow ad-hoc SQL query that joined the flag table recursively and timed out for large flag trees. Union-Find reduced the diagnostic query from 8 seconds to under 1ms."

---

## 8. Scale Evolution

**1,000 users →** BFS/DFS in memory, Java HashSet + ArrayDeque. Works for graphs up to millions of nodes in modern JVM. Union-Find for dynamic edge addition use cases.

**100,000 users →** Graph stored in a database (Neo4j for native graph queries; PostgreSQL with recursive CTEs). "Find all friends of friends" is a connected component query on a social graph — done via graph traversal in Neo4j or BFS-style SQL CTE.

**10 million users →** Spark GraphX or Apache Giraph for distributed connected components. The "label propagation" algorithm: each node broadcasts its current label to neighbours; neighbours update to the minimum label they receive; repeat until stable — partition count = number of unique labels. Scales to graphs with billions of edges.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant account clustering for fraud detection (connected components of shared device fingerprints / bank accounts); gateway network connectivity check (is a payment path reachable?) | Fraud detection framing; Union-Find for real-time edge addition |
| Swiggy / Meesho | Restaurant delivery zone clustering (which restaurants belong to the same delivery area?); product category graph — disconnected sub-graphs = isolated categories with no cross-links (business signal) | Grid/zone component analysis; BFS component counting |
| Adobe / Microsoft | "Number of Provinces", "Number of Islands", "Accounts Merge" (Union-Find) are standard medium problems at Microsoft rounds; clean Union-Find with both optimisations expected | Union-Find implementation; path compression + union by rank both present |
| SAP Labs | Feature-flag dependency Union-Find (8s → 1ms story); org unit permission group merging after acquisition; product category graph isolation detection | Production Union-Find story; clear performance numbers |

---

## 10. Related Topics — What to Study Next

- **Topic 278 — BFS and DFS Templates** — connected component counting uses BFS or DFS as a subroutine; Topic 278 covers the templates that power the component-tracing BFS/DFS calls; strong BFS/DFS foundations are a prerequisite for efficient component counting
- **Topic 280 — DOM Tree Traversal as Graph Problem** — the browser DOM can be viewed as a connected graph; understanding connected components helps reason about DOM subtree isolation, shadow DOM boundaries, and React tree reconciliation scopes
- **Topic 301 — System Design: Design a Social Graph** — at system design scale, connected components become the "who is reachable from whom?" query; distributed graph algorithms and adjacency representation choices at billion-node scale build directly on the algorithmic foundations here

---

*Part 17 · Graph Connected Components · Full Stack Interview Guide · Hruday D · 2026*
