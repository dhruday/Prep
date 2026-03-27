# BFS and DFS — Templates
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **BFS = Breadth-First Search = Queue** — explores nodes level by level outward from the start; guarantees shortest path in an unweighted graph; marks nodes VISITED WHEN ENQUEUED (not when dequeued) to prevent duplicate enqueuing
- **DFS = Depth-First Search = Stack or Recursion** — goes as deep as possible down one path before backtracking; uses the call stack (recursive) or an explicit `Deque` (iterative); does NOT guarantee shortest path; better for: connected components, cycle detection, topological sort, path existence
- **Visited set is mandatory in graphs** — unlike trees, graphs can have cycles; without a `visited` set, BFS/DFS loops forever; mark visited at enqueue time for BFS, at entry time for DFS
- **BFS time and space**: O(V + E) time; O(V) space for the queue (could hold all nodes of one large level); **DFS time and space**: O(V + E) time; O(V) space for the recursion stack (could be V deep for a chain graph)
- **When to choose BFS**: shortest path, minimum steps, level-based problems, spreading infection/fire; **When to choose DFS**: path existence, all paths, connected components, islands, cycle detection, topological sort
- **Adjacency list representation**: `Map<Integer, List<Integer>> graph` — every node maps to its list of neighbors; build this first before any traversal

---

## 1. One-Line Definition
BFS and DFS are the two fundamental graph traversal strategies — BFS explores all neighbors at the current distance before moving further (uses a queue), while DFS explores one complete path to its end before trying the next (uses a stack or recursion).

---

## 2. The Problem It Solves

A tree has one path between any two nodes. A graph may have many paths, or none (disconnected graph), or cycles (revisit nodes). Traversal algorithms must:

1. Visit every reachable node from a start node exactly once
2. Not get stuck in an infinite loop when cycles exist
3. Give you enough information to answer questions like: "is there a path?", "what's the shortest path?", "how many components?"

BFS and DFS both do this. The choice between them depends on what the problem asks for:

- **Shortest path in unweighted graph** → BFS (first time a node is reached, that's the shortest path to it)
- **Connected components, path existence, all paths** → DFS (simpler, lower overhead, doesn't need level tracking)
- **Cycle detection** → DFS (track visited + in-current-stack)
- **Topological sort** → DFS postorder (process node after all dependencies processed)

---

## 3. How It Works Internally

### BFS on a Graph — Level-by-Level Expansion

```
Graph (adjacency list):
0 → [1, 2]
1 → [0, 3]
2 → [0, 4]
3 → [1]
4 → [2]

BFS from 0:

Queue: [0]        visited: {0}
Dequeue 0 → process → enqueue neighbors 1, 2 (not yet visited)
Queue: [1, 2]     visited: {0, 1, 2}

Dequeue 1 → process → enqueue neighbors 0 (visited!), 3
Queue: [2, 3]     visited: {0, 1, 2, 3}

Dequeue 2 → process → enqueue neighbors 0 (visited!), 4
Queue: [3, 4]     visited: {0, 1, 2, 3, 4}

Dequeue 3 → process → no unvisited neighbors
Dequeue 4 → process → no unvisited neighbors
Queue: []   DONE

Visit order: 0, 1, 2, 3, 4
Distance from 0: 0→0, 1→1, 2→1, 3→2, 4→2
```

### DFS on a Graph — Deep Before Wide

```
Same graph, DFS from 0 (iterative with stack, push right-to-left for left-first order):

Stack: [0]         visited: {}
Pop 0 → process → mark visited → push neighbors [2, 1] (reverse of adjacency list for left-first)
Stack: [2, 1]      visited: {0}

Pop 1 → process → mark visited → push unvisited neighbors [3] (0 already visited)
Stack: [2, 3]      visited: {0, 1}

Pop 3 → process → mark visited → no unvisited neighbors
Stack: [2]         visited: {0, 1, 3}

Pop 2 → process → mark visited → push unvisited neighbors [4] (0 already visited)
Stack: [4]         visited: {0, 1, 2, 3}

Pop 4 → process → mark visited → no unvisited neighbors
Stack: []    DONE

Visit order: 0, 1, 3, 2, 4  ← different from BFS: went deep on 1→3 before 2
```

### Key Difference Visualised

```
BFS (concentric rings from source):
     0
    ↙↘
   1   2       ← Level 1 — both explored before going deeper
  ↓   ↓
  3   4         ← Level 2

DFS (one path at a time):
0 → 1 → 3      ← go as deep as possible on LEFT side first
↩ backtrack
0 → 2 → 4      ← then explore secondary path
```

---

## 4. The Code

### Wrong Way — Classic Bugs

```java
// ❌ WRONG 1: No visited set — infinite loop on any cycle

public void bfs(Map<Integer, List<Integer>> graph, int start) {
    Queue<Integer> q = new ArrayDeque<>();
    q.offer(start);
    
    while (!q.isEmpty()) {
        int node = q.poll();
        System.out.println(node);
        // ❌ No visited set — node 0's neighbor 1 is enqueued
        // then node 1's neighbor 0 is enqueued again
        // then 0 again, then 1 again... forever
        for (int neighbor : graph.get(node)) {
            q.offer(neighbor);
        }
    }
}
```

```java
// ❌ WRONG 2: Mark visited at DEQUEUE instead of ENQUEUE (BFS shortest path bug)

public Map<Integer, Integer> bfsDistance(Map<Integer, List<Integer>> graph, int start) {
    Map<Integer, Integer> dist = new HashMap<>();
    Queue<Integer> q = new ArrayDeque<>();
    q.offer(start);
    dist.put(start, 0);
    
    while (!q.isEmpty()) {
        int node = q.poll();
        
        for (int neighbor : graph.get(node)) {
            if (!dist.containsKey(neighbor)) {
                // ✅ This is actually correct — dist is also the visited check
                // But if you use a SEPARATE visited set and mark on DEQUEUE:
                
                // ❌ The bug: the same neighbor can be enqueued multiple times
                //    before it's dequeued (if two nodes at the same level both point to it)
                //    Leading to MULTIPLE entries in the queue for the same node
                //    Queue bloats, distance may be wrong, performance degrades
                
                // ✅ Rule: mark visited (or record distance) when ENQUEUING, not dequeuing
                dist.put(neighbor, dist.get(node) + 1);
                q.offer(neighbor);
            }
        }
    }
    return dist;
}
```

```java
// ❌ WRONG 3: NullPointerException when graph node has no entry in adjacency map

public void dfs(Map<Integer, List<Integer>> graph, int node, Set<Integer> visited) {
    if (visited.contains(node)) return;
    visited.add(node);
    System.out.println(node);
    // ❌ If some nodes are leaf nodes with no outgoing edges, graph.get(node) is null
    // → NullPointerException on the for-each loop
    for (int neighbor : graph.get(node)) {  // ← NPE if node has no entry
        dfs(graph, neighbor, visited);
    }
    
    // ✅ Fix: graph.getOrDefault(node, Collections.emptyList())
}
```

### Right Way — Four Clean Templates

```java
// ✅ TEMPLATE 1: BFS — Shortest Path / Level Distance

public int bfsShortestPath(Map<Integer, List<Integer>> graph, int start, int target) {
    if (start == target) return 0;
    
    Set<Integer> visited = new HashSet<>();
    Queue<Integer> q = new ArrayDeque<>();
    
    // ✅ Mark visited AND enqueue at the same time — never enqueue unvisited twice
    visited.add(start);
    q.offer(start);
    int steps = 0;
    
    while (!q.isEmpty()) {
        int levelSize = q.size();  // ✅ snapshot for level tracking
        steps++;
        
        for (int i = 0; i < levelSize; i++) {
            int node = q.poll();
            
            for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
                if (neighbor == target) return steps;  // ✅ found target
                
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);   // ✅ mark at enqueue time
                    q.offer(neighbor);
                }
            }
        }
    }
    return -1;  // ← no path exists
}
```

```java
// ✅ TEMPLATE 2: DFS — Recursive (Path Existence / Connected Component)

public boolean dfsHasPath(Map<Integer, List<Integer>> graph, int node, int target,
                           Set<Integer> visited) {
    if (node == target) return true;               // ✅ base case: reached target
    if (visited.contains(node)) return false;       // ✅ cycle guard
    
    visited.add(node);   // ✅ mark at entry — before processing any neighbors
    
    for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
        if (dfsHasPath(graph, neighbor, target, visited)) return true;
    }
    return false;
}

// Caller:
// dfsHasPath(graph, start, target, new HashSet<>())
```

```java
// ✅ TEMPLATE 3: DFS — Iterative with Explicit Stack

public Set<Integer> dfsIterative(Map<Integer, List<Integer>> graph, int start) {
    Set<Integer> visited = new HashSet<>();
    Deque<Integer> stack = new ArrayDeque<>();
    
    stack.push(start);
    
    while (!stack.isEmpty()) {
        int node = stack.pop();
        
        if (visited.contains(node)) continue;  // ✅ skip already-processed nodes
        visited.add(node);
        // ← process node here
        
        for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
            if (!visited.contains(neighbor)) {
                stack.push(neighbor);
            }
        }
    }
    return visited;
}
// Note: iterative DFS marks visited at POP, not at PUSH
// This is because the stack can hold the same node multiple times (pushed from different parents)
// Marking at pop is safer for iterative DFS; BFS MUST mark at enqueue (queue has no duplicates otherwise)
```

```java
// ✅ TEMPLATE 4: Connected Components — BFS/DFS on every unvisited node

public int countComponents(int n, int[][] edges) {
    // Build adjacency list
    Map<Integer, List<Integer>> graph = new HashMap<>();
    for (int i = 0; i < n; i++) graph.put(i, new ArrayList<>());
    for (int[] edge : edges) {
        graph.get(edge[0]).add(edge[1]);
        graph.get(edge[1]).add(edge[0]);  // ← undirected graph — add both directions
    }
    
    Set<Integer> visited = new HashSet<>();
    int components = 0;
    
    for (int i = 0; i < n; i++) {
        if (!visited.contains(i)) {
            // ✅ Start a new BFS from each unvisited node
            //    Each BFS call visits one complete connected component
            bfsComponent(graph, i, visited);
            components++;
        }
    }
    return components;
}

private void bfsComponent(Map<Integer, List<Integer>> graph, int start, Set<Integer> visited) {
    Queue<Integer> q = new ArrayDeque<>();
    visited.add(start);
    q.offer(start);
    
    while (!q.isEmpty()) {
        int node = q.poll();
        for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                q.offer(neighbor);
            }
        }
    }
}
```

```java
// ✅ NUMBER OF ISLANDS — DFS on a 2D grid (treat grid as implicit graph)

public int numIslands(char[][] grid) {
    int rows = grid.length, cols = grid[0].length;
    int islands = 0;
    
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == '1') {     // ✅ found an unvisited land cell
                islands++;
                dfsIsland(grid, r, c, rows, cols);  // ← mark all connected land as visited
            }
        }
    }
    return islands;
}

private void dfsIsland(char[][] grid, int r, int c, int rows, int cols) {
    // ✅ Boundary and visited check — treat out-of-bounds or '0' as base case
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1') return;
    
    grid[r][c] = '0';  // ✅ mark visited by modifying in place (avoids extra visited set)
    
    // ✅ Explore all 4 directions
    dfsIsland(grid, r + 1, c, rows, cols);
    dfsIsland(grid, r - 1, c, rows, cols);
    dfsIsland(grid, r, c + 1, rows, cols);
    dfsIsland(grid, r, c - 1, rows, cols);
}
// Time: O(rows × cols), Space: O(rows × cols) worst case call stack for all-land grid
```

```typescript
// ✅ TypeScript — BFS for dependency resolution (Frontend: module dependency graph)

function buildOrder(modules: string[], deps: [string, string][]): string[] | null {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialise
    for (const m of modules) {
        graph.set(m, []);
        inDegree.set(m, 0);
    }
    
    // Build directed graph: dep[1] must come before dep[0]
    for (const [mod, dependency] of deps) {
        graph.get(dependency)!.push(mod);
        inDegree.set(mod, (inDegree.get(mod) ?? 0) + 1);
    }
    
    // BFS topological sort (Kahn's algorithm)
    const queue: string[] = [];
    for (const [mod, degree] of inDegree) {
        if (degree === 0) queue.push(mod);  // ← no dependencies → start here
    }
    
    const order: string[] = [];
    while (queue.length > 0) {
        const mod = queue.shift()!;
        order.push(mod);
        for (const dependent of (graph.get(mod) ?? [])) {
            const newDegree = (inDegree.get(dependent) ?? 0) - 1;
            inDegree.set(dependent, newDegree);
            if (newDegree === 0) queue.push(dependent);
        }
    }
    
    return order.length === modules.length ? order : null;  // null = cycle detected
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you pick BFS over DFS and vice versa?"

**Hruday's answer:**
> I choose BFS for shortest path problems — when the graph is unweighted and I need the minimum number of steps from source to target. BFS guarantees that the first time I reach any node, it's via the shortest path. DFS does not have this property.
>
> I choose DFS for: connected components (can I reach this node from that one?), cycle detection (track which nodes are in the current DFS stack), topological sort (dependencies must be processed before dependents — DFS postorder gives correct topological order), and "all paths" problems (backtracking naturally uses DFS).
>
> One practical rule: if the problem mentions "level", "distance", "steps", "closest", "minimum hops" → BFS. If it mentions "path", "component", "cycle", "order", "dependency" → DFS.

---

### Q2 — Deep Dive
**Interviewer asks:** "In BFS, why must you mark a node as visited when you enqueue it rather than when you dequeue it?"

**Hruday's answer:**
> Because of how BFS processes nodes in waves. Consider a node N at level 2 that two different level-1 nodes both point to. BFS processes level-1 nodes from the queue. When processing node A at level 1, it finds N unvisited and adds N to the queue. When processing node B at level 1 next, it also finds N's visited status — IF we haven't marked it yet — and adds N to the queue a SECOND time.
>
> Now N is in the queue twice. When N is first dequeued and marked visited, all its neighbors are explored. When N is dequeued the second time, if we mark visited at dequeue, it looks unvisited — so all its neighbors are explored again, possibly adding MORE duplicate entries.
>
> In the worst case (a complete graph), queue size explodes from O(V) to O(V²) or worse. For shortest path calculation, N's distance might be incorrectly computed twice.
>
> Marking at enqueue solves this: by the time node B tries to enqueue N, N is already in the visited set. B skips N entirely. N enters the queue exactly once.

---

### Q3 — Application
**Interviewer asks:** "How does DFS help with cycle detection in a directed graph?"

**Hruday's answer:**
> For undirected graphs, tracking a single `visited` set is enough — if a DFS encounters an already-visited neighbor that isn't the direct parent, there's a cycle.
>
> For directed graphs it's trickier. A node can be visited without being part of a cycle in the CURRENT path. For example, in `A→C` and `B→C→D`, if DFS processes path `A→C→D` and then tries path `B→C`, C is already visited but there's no cycle — C is just reachable from both A and B.
>
> For directed graphs, I maintain two sets: `visited` (ever visited) and `inStack` (in the current DFS path). A cycle exists if and only if DFS reaches a node that is already in `inStack` — that means I found a back edge in the current path. When DFS backtracks from a node (returns from recursive call), I remove it from `inStack`.
>
> At SAP, we used this exact algorithm for detecting circular dependencies in a product configuration rule engine — if rule A's evaluation triggered rule B which triggered rule C which triggered rule A again, that's a directed cycle and the engine would infinite-loop without detection.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Marking visited at wrong time in BFS | "I'll mark the node visited when I dequeue it so the mark is right next to where I process it" | Marking at dequeue causes the same node to be enqueued multiple times by different parent nodes at the same level; for correctness AND performance, BFS requires marking visited at enqueue time — the moment a node is added to the queue, it must be in the visited set so no other node can add it again; this is one of the most commonly failed BFS implementations at interview |
| Using visited check for iterative DFS in same position as BFS | "For iterative DFS I'll mark visited at push, same as BFS enqueue" | Marking at push in iterative DFS can cause issues: a node might be pushed multiple times before it's popped (if multiple parent paths lead to it); when it's popped and processed, neighbors are then pushed and potentially the original node is pushed again; the most common correct approach is to check `if visited, skip` at the TOP of the pop loop rather than preventing pushing; alternatively, mark at push AND add an early-return check — being explicit about WHICH approach you're using prevents subtle bugs |
| Forgetting `graph.getOrDefault` for leaf nodes | "I'll just use `graph.get(node)`" | In any adjacency list graph built with a Map, leaf nodes (no outgoing edges) may not have an entry in the Map if you only added entries when building edges; `graph.get(leafNode)` returns null; iterating over null throws a NullPointerException; always use `graph.getOrDefault(node, Collections.emptyList())` or initialise every node's entry when building the graph |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a workflow system where each workflow step could depend on other steps — a directed dependency graph. The workflow engine needed to:
>
> 1. Detect circular dependencies before executing (DFS cycle detection with a `dfsStack` set)
> 2. Execute steps in the correct order respecting all dependencies (BFS topological sort / Kahn's algorithm)
> 3. Find the maximum parallelism — which steps could run simultaneously (level-by-level BFS)
>
> All three requirements mapped to BFS or DFS variants. The cycle detection caught a configuration bug in a production workflow before it reached execution — instead of an infinite loop, the system returned a clear error: 'circular dependency between steps A and C'. That direct mapping from graph algorithm to production problem is exactly what interviewers are probing for."

---

## 8. Scale Evolution

**1,000 users →** In-memory adjacency list, recursive DFS with visited Set, ArrayDeque for BFS. Works for graphs up to ~100,000 nodes. Recursion depth ≤ V is safe for typical graphs.

**100,000 users →** Graph stored in a database (Neo4j, or relational table of edges). BFS is an SQL recursive CTE query (`WITH RECURSIVE` for shortest path). DFS for connected components becomes a batch job — not a single recursive call. Stack overflow risk for very deep DFS — convert to iterative.

**10 million users →** Distributed graph processing frameworks (Apache Giraph, Spark GraphX). BFS becomes "parallel BFS" — all nodes at current distance (current frontier) are processed simultaneously across machines; each machine processes its partition, then communicates the frontier to adjacent machines; the BFS level model maps directly to the iteration model in Pregel-style frameworks.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment gateway graph — each gateway is a node, compatibility constraints are edges; BFS finds shortest/cheapest valid routing; DFS for checking if any path exists between merchant and payment method | BFS for shortest path; practical payment routing framing |
| Swiggy / Meesho | Delivery network as a graph — BFS for minimum hops from warehouse to delivery zone; DFS for finding all delivery paths; Number of Islands variant for zone clustering | Number of Islands pattern; BFS delivery hop count |
| Adobe / Microsoft | "Number of Islands", "Course Schedule" (DFS cycle detection), "Word Ladder" (BFS shortest path), "Clone Graph" are standard Microsoft rounds; expected to code both BFS and DFS templates cleanly | Template fluency; both visited-at-enqueue and visited-at-entry rules explained correctly |
| SAP Labs | Workflow dependency cycle detection (DirectedGraph DFS with inStack); workflow parallelism via level-order BFS; product configuration graph traversal | Production DFS cycle detection story; workflow engine context |

---

## 10. Related Topics — What to Study Next

- **Topic 277 — Binary Tree Traversals** — level order IS BFS on a tree (no visited set needed since trees have no cycles); inorder/preorder/postorder are DFS on a tree; after mastering BFS/DFS on general graphs, tree traversals become a simpler special case
- **Topic 279 — Graph Connected Components** — counting connected components uses the "outer loop over all nodes + BFS/DFS from each unvisited node" pattern introduced in this topic; Topic 279 goes deeper into undirected vs directed component counting and Union-Find as an alternative
- **Topic 280 — DOM Tree Traversal as Graph Problem** — the browser DOM is an N-ary tree; traversal for React reconciliation, event delegation, CSS specificity uses DFS (preorder for render) and BFS (for breadth-based matching like CSS sibling selectors); knowing BFS/DFS deeply makes DOM algorithm discussions concrete

---

*Part 17 · BFS and DFS Templates · Full Stack Interview Guide · Hruday D · 2026*
