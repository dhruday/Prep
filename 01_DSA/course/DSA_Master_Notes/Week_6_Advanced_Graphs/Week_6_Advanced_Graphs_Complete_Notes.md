# 🚀 Week 6: Advanced Graphs — Complete Master Notes

> **Goal**: Master advanced graph algorithms and patterns that separate FAANG candidates from the rest. After this, you'll confidently tackle the hardest graph problems in interviews.

---

## 📌 Table of Contents

1. [Hard Graph Problem Identification](#1-hard-graph-problem-identification)
2. [Advanced Algorithms](#2-advanced-algorithms)
3. [Time & Space Optimization](#3-time--space-optimization)
4. [Interview-Focused Graph Problems](#4-interview-focused-graph-problems)
5. [FAANG Problem Patterns](#5-faang-problem-patterns)
6. [Interview Prep Tips](#6-interview-prep-tips)

---

# 1. Hard Graph Problem Identification

## 1.1 Recognizing Hard Graph Problems

### 🎯 Red Flags That Signal "Hard Graph Problem"

#### 1. **Multiple Constraints**
```
Problem: Find shortest path with:
- At most K stops
- Avoiding certain nodes
- Within budget limit
- Multiple sources

⚠️ Multiple constraints = State-based graph problem
```

#### 2. **State Space Explosion**
```
Problem: Sliding puzzle, Rubik's cube
- Not just node positions
- Entire configuration is a state
- Millions of possible states

⚠️ Need BFS with state hashing
```

#### 3. **Optimization + Constraint**
```
Problem: Minimum cost with maximum K edges
- Not just shortest path
- Must satisfy constraint
- Need modified Dijkstra/BFS

⚠️ Standard algorithms won't work as-is
```

#### 4. **Multi-Dimensional Tracking**
```
Problem: Track position + direction + steps + cost
- State = (x, y, dir, steps, cost)
- Can't just use visited[node]
- Need visited[(node, state)]

⚠️ High-dimensional state space
```

#### 5. **Bidirectional Relationship**
```
Problem: A affects B, B affects C, C affects A
- Circular dependencies
- Need SCC (Strongly Connected Components)
- Or cycle detection with grouping

⚠️ Complex graph structure
```

## 1.2 Classification Framework

### Problem Type Matrix:

| Characteristic | Easy | Medium | Hard |
|----------------|------|--------|------|
| **Graph Type** | Simple tree | Basic graph | Multi-state graph |
| **Constraints** | None | 1-2 simple | 3+ complex |
| **State** | Node only | Node + 1 var | Node + multiple vars |
| **Algorithm** | Standard BFS/DFS | Modified BFS/DFS | Custom algorithm |
| **Optimization** | None | Single metric | Multiple metrics |

### Hard Problem Signatures:

```python
# Signature 1: State Tuple in Visited Set
visited = set()
visited.add((node, state1, state2, state3))  # Multi-dimensional

# Signature 2: Priority Queue with Complex Key
pq = [(cost, node, k_remaining, path_length, state)]

# Signature 3: Multiple Passes
first_pass = bfs()
second_pass = process(first_pass)
result = combine(first_pass, second_pass)

# Signature 4: Union-Find with Extra Logic
uf = UnionFind()
# Plus additional tracking structures

# Signature 5: DP + Graph
dp[node][state] = min(dp[node][state], ...)
```

## 1.3 Pattern Recognition Guide

### When You See These Keywords:

| Keyword | Likely Algorithm |
|---------|------------------|
| "Minimum cost with K stops" | Modified Dijkstra/BFS |
| "Strongly connected" | Kosaraju's/Tarjan's |
| "Articulation points" | Tarjan's Algorithm |
| "Minimum spanning tree" | Kruskal's/Prim's |
| "Maximum flow" | Ford-Fulkerson/Dinic's |
| "Eulerian path" | Hierholzer's |
| "Traveling salesman" | DP with bitmask |
| "Graph coloring" | Backtracking/Greedy |
| "Satisfy dependencies" | Topological Sort |

## 1.4 The 5-Question Framework

Before coding, ask:

```
1️⃣ What makes this problem HARD?
   - Multiple states?
   - Complex constraints?
   - Optimization with conditions?

2️⃣ What is the REAL state space?
   - Just node position?
   - Node + additional variables?
   - Entire configuration?

3️⃣ Can I use STANDARD algorithm?
   - Plain BFS/DFS?
   - Standard Dijkstra?
   - Or need modification?

4️⃣ What DATA STRUCTURES do I need?
   - Priority queue?
   - Multiple visited sets?
   - Union-Find?
   - DP array?

5️⃣ What's the BOTTLENECK?
   - Time complexity?
   - Space complexity?
   - Both?
```

## 1.5 Hard Problem Categories

### Category 1: **Multi-State Graph Problems**
```
Example: Cheapest Flights Within K Stops

State = (city, stops_remaining, cost)
NOT just visited[city]!

visited = set()
visited.add((city, stops))
```

### Category 2: **Graph + DP Problems**
```
Example: Number of Ways to Reach Target

dp[node][sum] = number of ways to reach node with sum
Combine graph traversal + DP
```

### Category 3: **Advanced Graph Structures**
```
Example: Critical Connections (Bridges)

Need to understand:
- Discovery time
- Low link values
- Tarjan's algorithm
```

### Category 4: **Optimization with Constraints**
```
Example: Minimize cost while visiting all nodes

Not just shortest path!
Need to track which nodes visited (bitmask)
```

### Category 5: **Implicit Graph Problems**
```
Example: Word Ladder II (all shortest paths)

Graph not given explicitly
Must construct on the fly
Exponential state space
```

---

# 2. Advanced Algorithms

## 2.1 Dijkstra's Variants

### Standard Dijkstra Recap:
```python
def dijkstra(graph, start):
    dist = {start: 0}
    pq = [(0, start)]
    
    while pq:
        d, node = heapq.heappop(pq)
        
        if d > dist.get(node, float('inf')):
            continue
        
        for neighbor, weight in graph[node]:
            new_dist = d + weight
            if new_dist < dist.get(neighbor, float('inf')):
                dist[neighbor] = new_dist
                heapq.heappush(pq, (new_dist, neighbor))
    
    return dist
```

### Variant 1: **Dijkstra with K Stops**
```python
def cheapest_flight_k_stops(n, flights, src, dst, k):
    graph = defaultdict(list)
    for u, v, price in flights:
        graph[u].append((v, price))
    
    # (cost, node, stops_remaining)
    pq = [(0, src, k + 1)]
    visited = {}  # (node, stops): min_cost
    
    while pq:
        cost, node, stops = heapq.heappop(pq)
        
        if node == dst:
            return cost
        
        if stops > 0:
            for neighbor, price in graph[node]:
                new_cost = cost + price
                
                # Only proceed if this state is better
                if (neighbor, stops - 1) not in visited or \
                   visited[(neighbor, stops - 1)] > new_cost:
                    visited[(neighbor, stops - 1)] = new_cost
                    heapq.heappush(pq, (new_cost, neighbor, stops - 1))
    
    return -1
```

**Key Insight:** State = (node, stops_remaining), not just node!

### Variant 2: **Dijkstra with Path Tracking**
```python
def shortest_path_with_path(graph, start, end):
    dist = {start: 0}
    parent = {start: None}
    pq = [(0, start)]
    
    while pq:
        d, node = heapq.heappop(pq)
        
        if node == end:
            break
        
        if d > dist.get(node, float('inf')):
            continue
        
        for neighbor, weight in graph[node]:
            new_dist = d + weight
            if new_dist < dist.get(neighbor, float('inf')):
                dist[neighbor] = new_dist
                parent[neighbor] = node
                heapq.heappush(pq, (new_dist, neighbor))
    
    # Reconstruct path
    path = []
    curr = end
    while curr is not None:
        path.append(curr)
        curr = parent.get(curr)
    
    return dist.get(end, -1), path[::-1]
```

### Variant 3: **Dijkstra with Multiple Sources**
```python
def shortest_from_multiple_sources(graph, sources, target):
    dist = {}
    pq = []
    
    # Start from all sources
    for src in sources:
        dist[src] = 0
        heapq.heappush(pq, (0, src))
    
    while pq:
        d, node = heapq.heappop(pq)
        
        if node == target:
            return d
        
        if d > dist.get(node, float('inf')):
            continue
        
        for neighbor, weight in graph[node]:
            new_dist = d + weight
            if new_dist < dist.get(neighbor, float('inf')):
                dist[neighbor] = new_dist
                heapq.heappush(pq, (new_dist, neighbor))
    
    return -1
```

## 2.2 Strongly Connected Components (SCC)

### Concept:
In directed graph, SCC = maximal set of vertices where every vertex is reachable from every other vertex.

### Visual Example:
```
    1 ──→ 2 ──→ 3
    ↑     ↓     ↓
    └─────┴─────┘
    
    4 ──→ 5
    ↑     ↓
    └─────┘

SCCs: {1,2,3}, {4,5}
```

### Kosaraju's Algorithm:
```python
def kosaraju_scc(graph, n):
    # Step 1: Get finishing order (DFS postorder)
    visited = set()
    stack = []
    
    def dfs1(node):
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                dfs1(neighbor)
        stack.append(node)  # Add after visiting all descendants
    
    for node in range(n):
        if node not in visited:
            dfs1(node)
    
    # Step 2: Create reverse graph
    reverse_graph = defaultdict(list)
    for node in graph:
        for neighbor in graph[node]:
            reverse_graph[neighbor].append(node)
    
    # Step 3: DFS in reverse graph in reverse finishing order
    visited = set()
    sccs = []
    
    def dfs2(node, component):
        visited.add(node)
        component.append(node)
        for neighbor in reverse_graph[node]:
            if neighbor not in visited:
                dfs2(neighbor, component)
    
    while stack:
        node = stack.pop()
        if node not in visited:
            component = []
            dfs2(node, component)
            sccs.append(component)
    
    return sccs
```

**Time:** O(V + E)  
**Space:** O(V + E)

### Tarjan's Algorithm (One Pass):
```python
def tarjan_scc(graph, n):
    index_counter = [0]
    stack = []
    lowlinks = {}
    index = {}
    on_stack = set()
    sccs = []
    
    def dfs(node):
        index[node] = index_counter[0]
        lowlinks[node] = index_counter[0]
        index_counter[0] += 1
        stack.append(node)
        on_stack.add(node)
        
        for neighbor in graph[node]:
            if neighbor not in index:
                dfs(neighbor)
                lowlinks[node] = min(lowlinks[node], lowlinks[neighbor])
            elif neighbor in on_stack:
                lowlinks[node] = min(lowlinks[node], index[neighbor])
        
        # Root of SCC
        if lowlinks[node] == index[node]:
            component = []
            while True:
                w = stack.pop()
                on_stack.remove(w)
                component.append(w)
                if w == node:
                    break
            sccs.append(component)
    
    for node in range(n):
        if node not in index:
            dfs(node)
    
    return sccs
```

**Time:** O(V + E)  
**Space:** O(V)

**When to use:** Finding cycles in directed graphs, dependency analysis, compiler optimization.

## 2.3 Articulation Points & Bridges

### Articulation Point:
Vertex whose removal increases number of connected components.

### Bridge:
Edge whose removal increases number of connected components.

### Tarjan's Algorithm for Bridges:
```python
def find_bridges(n, connections):
    graph = defaultdict(list)
    for u, v in connections:
        graph[u].append(v)
        graph[v].append(u)
    
    discovery = [-1] * n
    low = [-1] * n
    parent = [-1] * n
    time = [0]
    bridges = []
    
    def dfs(u):
        discovery[u] = low[u] = time[0]
        time[0] += 1
        
        for v in graph[u]:
            if discovery[v] == -1:  # Not visited
                parent[v] = u
                dfs(v)
                
                low[u] = min(low[u], low[v])
                
                # Bridge condition
                if low[v] > discovery[u]:
                    bridges.append([u, v])
            
            elif v != parent[u]:  # Back edge
                low[u] = min(low[u], discovery[v])
    
    for i in range(n):
        if discovery[i] == -1:
            dfs(i)
    
    return bridges
```

**Bridge condition:** `low[v] > discovery[u]`  
- Means no back edge from subtree of v to ancestors of u

### Articulation Points:
```python
def find_articulation_points(n, edges):
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    discovery = [-1] * n
    low = [-1] * n
    parent = [-1] * n
    time = [0]
    ap = set()
    
    def dfs(u):
        children = 0
        discovery[u] = low[u] = time[0]
        time[0] += 1
        
        for v in graph[u]:
            if discovery[v] == -1:
                children += 1
                parent[v] = u
                dfs(v)
                
                low[u] = min(low[u], low[v])
                
                # AP condition 1: Not root and low[v] >= discovery[u]
                if parent[u] != -1 and low[v] >= discovery[u]:
                    ap.add(u)
                
                # AP condition 2: Root with 2+ children
                if parent[u] == -1 and children > 1:
                    ap.add(u)
            
            elif v != parent[u]:
                low[u] = min(low[u], discovery[v])
    
    for i in range(n):
        if discovery[i] == -1:
            dfs(i)
    
    return list(ap)
```

## 2.4 Minimum Spanning Tree (MST)

### Kruskal's Algorithm (Union-Find):
```python
def kruskal_mst(n, edges):
    # edges = [(u, v, weight), ...]
    edges.sort(key=lambda x: x[2])  # Sort by weight
    
    uf = UnionFind(n)
    mst = []
    total_cost = 0
    
    for u, v, weight in edges:
        if uf.union(u, v):  # If doesn't create cycle
            mst.append((u, v, weight))
            total_cost += weight
            
            if len(mst) == n - 1:  # MST complete
                break
    
    return mst, total_cost
```

**Time:** O(E log E)  
**Space:** O(V)

### Prim's Algorithm (Priority Queue):
```python
def prim_mst(graph, n):
    # graph[u] = [(v, weight), ...]
    visited = set([0])
    edges = [(weight, 0, v) for v, weight in graph[0]]
    heapq.heapify(edges)
    
    mst = []
    total_cost = 0
    
    while edges and len(visited) < n:
        weight, u, v = heapq.heappop(edges)
        
        if v not in visited:
            visited.add(v)
            mst.append((u, v, weight))
            total_cost += weight
            
            for neighbor, w in graph[v]:
                if neighbor not in visited:
                    heapq.heappush(edges, (w, v, neighbor))
    
    return mst, total_cost
```

**Time:** O((V + E) log V)  
**Space:** O(V)

## 2.5 Floyd-Warshall (All Pairs Shortest Path)

```python
def floyd_warshall(n, edges):
    # Initialize distance matrix
    dist = [[float('inf')] * n for _ in range(n)]
    
    for i in range(n):
        dist[i][i] = 0
    
    for u, v, weight in edges:
        dist[u][v] = weight
        # dist[v][u] = weight  # If undirected
    
    # Floyd-Warshall
    for k in range(n):  # Intermediate vertex
        for i in range(n):
            for j in range(n):
                dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
    
    return dist
```

**Time:** O(V³)  
**Space:** O(V²)

**When to use:** 
- Small graphs (V ≤ 400)
- Need all pairs distances
- Graph may have negative edges (but no negative cycles)

### Detecting Negative Cycle:
```python
def has_negative_cycle(dist, n):
    for i in range(n):
        if dist[i][i] < 0:
            return True
    return False
```

## 2.6 A* Search Algorithm

### Concept:
Dijkstra + heuristic to guide search toward goal.

```python
def a_star(graph, start, goal, heuristic):
    # heuristic(node) = estimated cost from node to goal
    
    g_score = {start: 0}  # Actual cost from start
    f_score = {start: heuristic(start)}  # g + h
    
    pq = [(f_score[start], start)]
    parent = {start: None}
    
    while pq:
        _, current = heapq.heappop(pq)
        
        if current == goal:
            # Reconstruct path
            path = []
            while current:
                path.append(current)
                current = parent[current]
            return path[::-1]
        
        for neighbor, weight in graph[current]:
            tentative_g = g_score[current] + weight
            
            if tentative_g < g_score.get(neighbor, float('inf')):
                parent[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + heuristic(neighbor)
                heapq.heappush(pq, (f_score[neighbor], neighbor))
    
    return []  # No path
```

**Heuristic examples:**
- Manhattan distance: `|x1 - x2| + |y1 - y2|`
- Euclidean distance: `sqrt((x1-x2)² + (y1-y2)²)`

**Key:** Heuristic must be admissible (never overestimate) for optimality.

## 2.7 Bidirectional BFS

```python
def bidirectional_bfs(graph, start, end):
    if start == end:
        return 0
    
    # Two BFS from both ends
    forward_visited = {start: 0}
    backward_visited = {end: 0}
    forward_queue = deque([start])
    backward_queue = deque([end])
    
    level = 0
    
    while forward_queue and backward_queue:
        # Alternate between forward and backward
        if len(forward_queue) <= len(backward_queue):
            # Forward BFS
            for _ in range(len(forward_queue)):
                node = forward_queue.popleft()
                
                for neighbor in graph[node]:
                    if neighbor in backward_visited:
                        return forward_visited[node] + 1 + backward_visited[neighbor]
                    
                    if neighbor not in forward_visited:
                        forward_visited[neighbor] = forward_visited[node] + 1
                        forward_queue.append(neighbor)
        else:
            # Backward BFS
            for _ in range(len(backward_queue)):
                node = backward_queue.popleft()
                
                for neighbor in graph[node]:
                    if neighbor in forward_visited:
                        return backward_visited[node] + 1 + forward_visited[neighbor]
                    
                    if neighbor not in backward_visited:
                        backward_visited[neighbor] = backward_visited[node] + 1
                        backward_queue.append(neighbor)
    
    return -1
```

**Time:** O(b^(d/2)) vs O(b^d) for regular BFS  
where b = branching factor, d = distance

---

# 3. Time & Space Optimization

## 3.1 State Space Reduction

### Technique 1: **Canonical Representation**

Problem: Avoid exploring equivalent states.

```python
# Bad: Track (a, b) and (b, a) separately
visited = set()
visited.add((1, 2))
visited.add((2, 1))  # Duplicate for undirected!

# Good: Use canonical form
def canonical(a, b):
    return (min(a, b), max(a, b))

visited = set()
visited.add(canonical(1, 2))  # Only one entry
```

### Technique 2: **Bitmask for State**

Problem: Track which nodes visited.

```python
# Bad: Use set or list
visited_nodes = {1, 3, 5}  # O(n) space per state

# Good: Use bitmask
visited_mask = 0
visited_mask |= (1 << 1)  # Visit node 1
visited_mask |= (1 << 3)  # Visit node 3
visited_mask |= (1 << 5)  # Visit node 5

# Check if visited
if visited_mask & (1 << node):
    # Node visited
```

**Space:** O(2^n) states but each state is O(1) integer!

### Technique 3: **Hash State Efficiently**

```python
# Bad: Use tuple of lists
state = ([1, 2, 3], [4, 5], 'config')  # Unhashable!

# Good: Convert to hashable
state = (tuple([1, 2, 3]), tuple([4, 5]), 'config')

# Better: Use string representation
state = "1,2,3|4,5|config"

# Best: Use integer encoding when possible
state = encode(positions)  # Custom encoding
```

## 3.2 Early Termination

### Optimization 1: **Best-First Search**

```python
# Always explore most promising path first
pq = [(heuristic(start), start)]

while pq:
    _, node = heapq.heappop(pq)
    
    if node == goal:
        return True  # Found! Stop immediately
    
    # Continue...
```

### Optimization 2: **Prune Impossible Paths**

```python
def search(state, target, budget):
    if budget < 0:
        return None  # Impossible, prune
    
    if lower_bound(state, target) > budget:
        return None  # Can't possibly succeed, prune
    
    # Continue search...
```

### Optimization 3: **Memoization**

```python
@lru_cache(maxsize=None)
def dfs(node, state):
    # Memoize by (node, state)
    # Avoid recomputing same subproblems
    pass
```

## 3.3 Space Optimization Techniques

### Technique 1: **Iterative Deepening DFS**

Trade time for space: O(V) space instead of O(V^d).

```python
def iddfs(graph, start, goal, max_depth):
    for depth in range(max_depth):
        visited = set()
        if dfs_limited(graph, start, goal, depth, visited):
            return True
    return False

def dfs_limited(graph, node, goal, depth, visited):
    if node == goal:
        return True
    
    if depth == 0:
        return False
    
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            if dfs_limited(graph, neighbor, goal, depth - 1, visited):
                return True
    visited.remove(node)
    
    return False
```

### Technique 2: **Rolling Hash for Visited**

```python
# Instead of set of all states (large space)
# Use rolling hash with collision handling

visited = {}  # hash -> count
MAX_SIZE = 100000

def add_state(state):
    h = hash(state) % MAX_SIZE
    visited[h] = visited.get(h, 0) + 1

def has_state(state):
    h = hash(state) % MAX_SIZE
    return h in visited
```

### Technique 3: **Implicit Graph (Don't Store Graph)**

```python
# Bad: Build entire graph first
graph = {}
for i in range(n):
    graph[i] = generate_neighbors(i)  # O(n) space

# Good: Generate neighbors on the fly
def bfs_implicit(start):
    queue = deque([start])
    visited = {start}
    
    while queue:
        node = queue.popleft()
        
        # Generate neighbors dynamically
        for neighbor in generate_neighbors(node):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
```

## 3.4 Time Optimization Techniques

### Technique 1: **Bidirectional Search**

Reduces time from O(b^d) to O(b^(d/2)).

```python
# Meet in the middle
forward_search(start)
backward_search(end)
if forward_visited & backward_visited:
    return combined_distance
```

### Technique 2: **A* with Good Heuristic**

```python
# Bad heuristic: always returns 0
def bad_heuristic(node):
    return 0  # Degrades to Dijkstra

# Good heuristic: Manhattan distance
def good_heuristic(node, goal):
    return abs(node[0] - goal[0]) + abs(node[1] - goal[1])
```

### Technique 3: **Parallel BFS (Level Synchronization)**

```python
def parallel_bfs(graph, start):
    current_level = [start]
    visited = {start}
    level = 0
    
    while current_level:
        next_level = []
        
        for node in current_level:
            for neighbor in graph[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_level.append(neighbor)
        
        current_level = next_level
        level += 1
```

## 3.5 Memory Management for Large Graphs

### Strategy 1: **Streaming Processing**

```python
# Don't load entire graph into memory
def process_large_graph(edge_file):
    for line in edge_file:
        u, v, weight = parse_edge(line)
        process_edge(u, v, weight)
        # Don't keep all edges in memory
```

### Strategy 2: **Compressed Representations**

```python
# Use numpy arrays for large adjacency matrices
import numpy as np

# Instead of list of lists
matrix = np.zeros((n, n), dtype=np.int8)  # Smaller data type

# Or use sparse matrix
from scipy.sparse import csr_matrix
sparse_matrix = csr_matrix((data, (row, col)), shape=(n, n))
```

### Strategy 3: **External Memory Algorithms**

For graphs that don't fit in RAM, use disk-based algorithms (beyond interview scope).

## 3.6 Complexity Optimization Cheat Sheet

| Optimization | Time Saved | Space Saved | Complexity |
|--------------|------------|-------------|------------|
| **Bidirectional BFS** | O(b^d) → O(b^(d/2)) | Same | Medium |
| **A\*** | Variable | None | Medium |
| **Memoization** | Exponential | O(states) | Easy |
| **Bitmask** | None | Significant | Easy |
| **Early termination** | Variable | None | Easy |
| **IDDFS** | None | O(V^d) → O(V) | Medium |
| **Implicit graph** | None | O(V+E) → O(V) | Easy |

---

# 4. Interview-Focused Graph Problems

## 4.1 Problem: Network Delay Time (Dijkstra)

```python
def network_delay_time(times, n, k):
    """
    times[i] = (u, v, w) means signal takes w time from u to v
    Return minimum time for all n nodes to receive signal from k
    """
    graph = defaultdict(list)
    for u, v, w in times:
        graph[u].append((v, w))
    
    dist = {k: 0}
    pq = [(0, k)]
    
    while pq:
        time, node = heapq.heappop(pq)
        
        if time > dist.get(node, float('inf')):
            continue
        
        for neighbor, weight in graph[node]:
            new_time = time + weight
            if new_time < dist.get(neighbor, float('inf')):
                dist[neighbor] = new_time
                heapq.heappush(pq, (new_time, neighbor))
    
    return max(dist.values()) if len(dist) == n else -1
```

**Complexity:** O((E + V) log V)

---

## 4.2 Problem: Course Schedule II (Topological Sort)

```python
def find_order(numCourses, prerequisites):
    """
    Return ordering to take all courses, or [] if impossible
    """
    graph = defaultdict(list)
    indegree = [0] * numCourses
    
    for course, prereq in prerequisites:
        graph[prereq].append(course)
        indegree[course] += 1
    
    queue = deque([i for i in range(numCourses) if indegree[i] == 0])
    order = []
    
    while queue:
        course = queue.popleft()
        order.append(course)
        
        for next_course in graph[course]:
            indegree[next_course] -= 1
            if indegree[next_course] == 0:
                queue.append(next_course)
    
    return order if len(order) == numCourses else []
```

**Complexity:** O(V + E)

---

## 4.3 Problem: Critical Connections (Bridges)

```python
def critical_connections(n, connections):
    """
    Find all critical connections (bridges) in network
    """
    graph = defaultdict(list)
    for u, v in connections:
        graph[u].append(v)
        graph[v].append(u)
    
    discovery = [-1] * n
    low = [-1] * n
    parent = [-1] * n
    time = [0]
    bridges = []
    
    def dfs(u):
        discovery[u] = low[u] = time[0]
        time[0] += 1
        
        for v in graph[u]:
            if discovery[v] == -1:
                parent[v] = u
                dfs(v)
                
                low[u] = min(low[u], low[v])
                
                if low[v] > discovery[u]:
                    bridges.append([u, v])
            
            elif v != parent[u]:
                low[u] = min(low[u], discovery[v])
    
    for i in range(n):
        if discovery[i] == -1:
            dfs(i)
    
    return bridges
```

**Complexity:** O(V + E)

---

## 4.4 Problem: Minimum Cost to Connect All Cities (MST)

```python
def minimum_cost(n, connections):
    """
    connections[i] = [city1, city2, cost]
    Return minimum cost to connect all cities, or -1 if impossible
    """
    connections.sort(key=lambda x: x[2])
    
    uf = UnionFind(n)
    total_cost = 0
    edges_used = 0
    
    for city1, city2, cost in connections:
        if uf.union(city1 - 1, city2 - 1):
            total_cost += cost
            edges_used += 1
            
            if edges_used == n - 1:
                return total_cost
    
    return -1  # Can't connect all cities
```

**Complexity:** O(E log E)

---

## 4.5 Problem: Shortest Path with Alternating Colors

```python
def shortest_alternating_paths(n, red_edges, blue_edges):
    """
    Find shortest path from 0 to each node with alternating colors
    """
    graph = defaultdict(lambda: defaultdict(list))
    for u, v in red_edges:
        graph[u]['red'].append(v)
    for u, v in blue_edges:
        graph[u]['blue'].append(v)
    
    # BFS with state (node, last_color)
    RED, BLUE = 0, 1
    queue = deque([(0, RED, 0), (0, BLUE, 0)])  # (node, last_color, dist)
    visited = {(0, RED), (0, BLUE)}
    answer = [-1] * n
    answer[0] = 0
    
    while queue:
        node, last_color, dist = queue.popleft()
        
        # Try opposite color
        next_color = 'blue' if last_color == RED else 'red'
        next_color_code = BLUE if last_color == RED else RED
        
        for neighbor in graph[node][next_color]:
            if (neighbor, next_color_code) not in visited:
                visited.add((neighbor, next_color_code))
                queue.append((neighbor, next_color_code, dist + 1))
                
                if answer[neighbor] == -1:
                    answer[neighbor] = dist + 1
    
    return answer
```

**Complexity:** O(V + E)

---

## 4.6 Problem: Reconstruct Itinerary (Hierholzer's)

```python
def find_itinerary(tickets):
    """
    Eulerian path in directed graph
    Return itinerary starting from JFK
    """
    graph = defaultdict(list)
    
    for src, dst in sorted(tickets)[::-1]:
        graph[src].append(dst)
    
    route = []
    
    def dfs(airport):
        while graph[airport]:
            next_airport = graph[airport].pop()
            dfs(next_airport)
        route.append(airport)
    
    dfs('JFK')
    return route[::-1]
```

**Complexity:** O(E log E)

---

## 4.7 Problem: Swim in Rising Water

```python
def swim_in_water(grid):
    """
    Find minimum time to reach bottom-right from top-left
    Can only move when water level >= grid value
    """
    n = len(grid)
    pq = [(grid[0][0], 0, 0)]  # (time, row, col)
    visited = {(0, 0)}
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    
    while pq:
        time, r, c = heapq.heappop(pq)
        
        if r == n - 1 and c == n - 1:
            return time
        
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            
            if (0 <= nr < n and 0 <= nc < n and
                (nr, nc) not in visited):
                visited.add((nr, nc))
                new_time = max(time, grid[nr][nc])
                heapq.heappush(pq, (new_time, nr, nc))
    
    return -1
```

**Complexity:** O(N² log N) where N = grid size

---

## 4.8 Problem: Minimize Malware Spread

```python
def min_malware_spread(graph, initial):
    """
    Remove one initially infected node to minimize final spread
    """
    n = len(graph)
    
    # Find connected components using Union-Find
    uf = UnionFind(n)
    for i in range(n):
        for j in range(i + 1, n):
            if graph[i][j] == 1:
                uf.union(i, j)
    
    # Count component sizes
    component_size = defaultdict(int)
    for i in range(n):
        root = uf.find(i)
        component_size[root] += 1
    
    # Count infected nodes per component
    infected_count = defaultdict(int)
    for node in initial:
        root = uf.find(node)
        infected_count[root] += 1
    
    # Find best node to remove
    best_node = min(initial)
    max_saved = 0
    
    for node in initial:
        root = uf.find(node)
        
        # Only save if this is the only infected node in component
        if infected_count[root] == 1:
            saved = component_size[root]
            if saved > max_saved or (saved == max_saved and node < best_node):
                max_saved = saved
                best_node = node
    
    return best_node
```

**Complexity:** O(N²)

---

# 5. FAANG Problem Patterns

## 5.1 Pattern: Multi-State BFS

### Problem: Minimum Knight Moves

```python
def min_knight_moves(x, y):
    """
    Minimum moves for knight to reach (x, y) from (0, 0)
    """
    # Knight moves
    directions = [
        (2, 1), (2, -1), (-2, 1), (-2, -1),
        (1, 2), (1, -2), (-1, 2), (-1, -2)
    ]
    
    # Work in positive quadrant (by symmetry)
    x, y = abs(x), abs(y)
    
    queue = deque([(0, 0, 0)])  # (x, y, moves)
    visited = {(0, 0)}
    
    while queue:
        cx, cy, moves = queue.popleft()
        
        if cx == x and cy == y:
            return moves
        
        for dx, dy in directions:
            nx, ny = cx + dx, cy + dy
            
            # Optimization: don't go too far from target
            if (nx, ny) not in visited and -2 <= nx <= x + 2 and -2 <= ny <= y + 2:
                visited.add((nx, ny))
                queue.append((nx, ny, moves + 1))
    
    return -1
```

---

## 5.2 Pattern: Graph + DP

### Problem: Minimum Path Sum with K Removals

```python
def shortest_path_k_removals(grid, k):
    """
    Find shortest path allowing removal of up to k obstacles
    State: (row, col, removals_remaining)
    """
    rows, cols = len(grid), len(grid[0])
    
    # (distance, row, col, removals_left)
    pq = [(0, 0, 0, k)]
    visited = {(0, 0, k): 0}
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    
    while pq:
        dist, r, c, rem = heapq.heappop(pq)
        
        if r == rows - 1 and c == cols - 1:
            return dist
        
        if dist > visited.get((r, c, rem), float('inf')):
            continue
        
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            
            if 0 <= nr < rows and 0 <= nc < cols:
                new_rem = rem - grid[nr][nc]
                
                if new_rem >= 0:
                    new_dist = dist + 1
                    
                    if new_dist < visited.get((nr, nc, new_rem), float('inf')):
                        visited[(nr, nc, new_rem)] = new_dist
                        heapq.heappush(pq, (new_dist, nr, nc, new_rem))
    
    return -1
```

---

## 5.3 Pattern: Implicit Graph with State Hashing

### Problem: Sliding Puzzle

```python
def sliding_puzzle(board):
    """
    Minimum moves to solve 2x3 sliding puzzle
    """
    target = "123450"
    start = "".join(str(num) for row in board for num in row)
    
    if start == target:
        return 0
    
    # Possible moves for each position
    neighbors = {
        0: [1, 3], 1: [0, 2, 4], 2: [1, 5],
        3: [0, 4], 4: [1, 3, 5], 5: [2, 4]
    }
    
    queue = deque([(start, 0)])
    visited = {start}
    
    while queue:
        state, moves = queue.popleft()
        
        zero_pos = state.index('0')
        
        for next_pos in neighbors[zero_pos]:
            # Swap
            state_list = list(state)
            state_list[zero_pos], state_list[next_pos] = \
                state_list[next_pos], state_list[zero_pos]
            new_state = "".join(state_list)
            
            if new_state == target:
                return moves + 1
            
            if new_state not in visited:
                visited.add(new_state)
                queue.append((new_state, moves + 1))
    
    return -1
```

---

## 5.4 Pattern: TSP with Bitmask DP

### Problem: Shortest Path Visiting All Nodes

```python
def shortest_path_all_nodes(graph):
    """
    Minimum path length to visit all nodes (can revisit)
    """
    n = len(graph)
    target = (1 << n) - 1  # All nodes visited
    
    # (distance, node, visited_mask)
    queue = deque()
    visited = set()
    
    # Can start from any node
    for i in range(n):
        mask = 1 << i
        queue.append((0, i, mask))
        visited.add((i, mask))
    
    while queue:
        dist, node, mask = queue.popleft()
        
        if mask == target:
            return dist
        
        for neighbor in graph[node]:
            new_mask = mask | (1 << neighbor)
            
            if (neighbor, new_mask) not in visited:
                visited.add((neighbor, new_mask))
                queue.append((dist + 1, neighbor, new_mask))
    
    return -1
```

**Complexity:** O(2^N × N²)

---

## 5.5 Pattern: Graph Transformation

### Problem: Bus Routes

```python
def num_buses_to_destination(routes, source, target):
    """
    Treat buses as nodes, create graph of connected buses
    """
    if source == target:
        return 0
    
    # Map stop -> buses serving that stop
    stop_to_buses = defaultdict(set)
    for bus, route in enumerate(routes):
        for stop in route:
            stop_to_buses[stop].add(bus)
    
    # BFS on buses
    visited_buses = set()
    visited_stops = {source}
    queue = deque([source])
    buses_taken = 0
    
    while queue:
        buses_taken += 1
        
        for _ in range(len(queue)):
            stop = queue.popleft()
            
            for bus in stop_to_buses[stop]:
                if bus in visited_buses:
                    continue
                
                visited_buses.add(bus)
                
                for next_stop in routes[bus]:
                    if next_stop == target:
                        return buses_taken
                    
                    if next_stop not in visited_stops:
                        visited_stops.add(next_stop)
                        queue.append(next_stop)
    
    return -1
```

---

## 5.6 Pattern: Binary Search + Graph

### Problem: Path with Maximum Minimum Value

```python
def maximum_minimum_path(grid):
    """
    Find path from top-left to bottom-right maximizing minimum value
    """
    rows, cols = len(grid), len(grid[0])
    
    # Binary search on answer
    left, right = 0, min(grid[0][0], grid[rows-1][cols-1])
    
    def can_reach(threshold):
        if grid[0][0] < threshold:
            return False
        
        visited = {(0, 0)}
        stack = [(0, 0)]
        directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
        
        while stack:
            r, c = stack.pop()
            
            if r == rows - 1 and c == cols - 1:
                return True
            
            for dr, dc in directions:
                nr, nc = r + dr, c + dc
                
                if (0 <= nr < rows and 0 <= nc < cols and
                    (nr, nc) not in visited and grid[nr][nc] >= threshold):
                    visited.add((nr, nc))
                    stack.append((nr, nc))
        
        return False
    
    result = 0
    while left <= right:
        mid = (left + right) // 2
        
        if can_reach(mid):
            result = mid
            left = mid + 1
        else:
            right = mid - 1
    
    return result
```

---

# 6. Interview Prep Tips

## 6.1 Pre-Interview Preparation

### Week Before Interview:

```
Day 1-2: Graph Fundamentals
- BFS/DFS templates
- Topological sort
- Union-Find

Day 3-4: Shortest Path
- Dijkstra variants
- BFS with states
- Bellman-Ford

Day 5-6: Advanced
- SCC (Kosaraju/Tarjan)
- Bridges & articulation points
- MST (Kruskal/Prim)

Day 7: Mock Interviews
- Time yourself
- Practice whiteboarding
- Explain out loud
```

## 6.2 During the Interview

### The 5-Step Process:

```
1️⃣ UNDERSTAND (5 min)
   □ Draw the graph
   □ Identify type (directed/undirected, weighted/unweighted)
   □ Clarify constraints
   □ Ask about edge cases

2️⃣ DESIGN (10 min)
   □ Identify problem type
   □ Choose algorithm
   □ Discuss time/space complexity
   □ Get buy-in before coding

3️⃣ CODE (20 min)
   □ Start with template
   □ Add logic incrementally
   □ Explain as you code
   □ Keep it clean

4️⃣ TEST (5 min)
   □ Walk through example
   □ Check edge cases
   □ Fix bugs

5️⃣ OPTIMIZE (5 min)
   □ Discuss improvements
   □ Alternative approaches
   □ Trade-offs
```

## 6.3 Common Interview Questions & Templates

### Question Types Frequency (FAANG):

| Problem Type | Frequency | Must Know |
|--------------|-----------|-----------|
| **BFS/DFS** | ⭐⭐⭐⭐⭐ | YES |
| **Shortest Path** | ⭐⭐⭐⭐ | YES |
| **Topological Sort** | ⭐⭐⭐⭐ | YES |
| **Union-Find** | ⭐⭐⭐ | YES |
| **SCC/Bridges** | ⭐⭐ | Nice to have |
| **MST** | ⭐⭐ | Nice to have |
| **Max Flow** | ⭐ | Rare |

### Must-Know Templates:

#### 1. **BFS Template**
```python
def bfs(graph, start):
    visited = {start}
    queue = deque([start])
    
    while queue:
        node = queue.popleft()
        # Process node
        
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
```

#### 2. **DFS Template**
```python
def dfs(graph, node, visited):
    visited.add(node)
    # Process node
    
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
```

#### 3. **Dijkstra Template**
```python
def dijkstra(graph, start):
    dist = {start: 0}
    pq = [(0, start)]
    
    while pq:
        d, node = heapq.heappop(pq)
        
        if d > dist.get(node, float('inf')):
            continue
        
        for neighbor, weight in graph[node]:
            new_dist = d + weight
            if new_dist < dist.get(neighbor, float('inf')):
                dist[neighbor] = new_dist
                heapq.heappush(pq, (new_dist, neighbor))
    
    return dist
```

#### 4. **Union-Find Template**
```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
    
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x, y):
        root_x, root_y = self.find(x), self.find(y)
        
        if root_x == root_y:
            return False
        
        if self.rank[root_x] < self.rank[root_y]:
            self.parent[root_x] = root_y
        elif self.rank[root_x] > self.rank[root_y]:
            self.parent[root_y] = root_x
        else:
            self.parent[root_y] = root_x
            self.rank[root_x] += 1
        
        return True
```

#### 5. **Topological Sort Template**
```python
def topological_sort(graph, n):
    indegree = [0] * n
    for node in graph:
        for neighbor in graph[node]:
            indegree[neighbor] += 1
    
    queue = deque([i for i in range(n) if indegree[i] == 0])
    result = []
    
    while queue:
        node = queue.popleft()
        result.append(node)
        
        for neighbor in graph[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    
    return result if len(result) == n else []
```

## 6.4 Common Pitfalls & How to Avoid

### Pitfall 1: **Wrong Visited Tracking**

❌ **Wrong:**
```python
# Checking visited AFTER popping from queue
while queue:
    node = queue.popleft()
    if node in visited:  # Too late!
        continue
    visited.add(node)
```

✅ **Correct:**
```python
# Mark visited WHEN adding to queue
while queue:
    node = queue.popleft()
    
    for neighbor in graph[node]:
        if neighbor not in visited:
            visited.add(neighbor)  # Mark here!
            queue.append(neighbor)
```

### Pitfall 2: **Forgetting Bidirectional Edges**

❌ **Wrong:**
```python
for u, v in edges:
    graph[u].append(v)  # Only one direction!
```

✅ **Correct:**
```python
for u, v in edges:
    graph[u].append(v)
    graph[v].append(u)  # Bidirectional!
```

### Pitfall 3: **Not Handling Disconnected Components**

❌ **Wrong:**
```python
dfs(0)  # Only explores component containing 0
```

✅ **Correct:**
```python
for node in range(n):
    if node not in visited:
        dfs(node)  # Explore all components
```

### Pitfall 4: **Infinite Loop in Cycle**

❌ **Wrong:**
```python
def dfs(node):
    for neighbor in graph[node]:
        dfs(neighbor)  # Infinite loop if cycle!
```

✅ **Correct:**
```python
def dfs(node, visited):
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(neighbor, visited)
```

### Pitfall 5: **Wrong State for Multi-State Problems**

❌ **Wrong:**
```python
visited = set()
visited.add(node)  # Not enough for state = (node, k, dir)
```

✅ **Correct:**
```python
visited = set()
visited.add((node, k, dir))  # Full state!
```

## 6.5 Communication Tips

### What to Say During Interview:

#### When Starting:
```
"Let me first understand the problem...
- This is a directed/undirected graph
- We need to find [objective]
- Constraints are [X, Y, Z]
- I'm thinking we can use [algorithm] because..."
```

#### When Designing:
```
"I'll use BFS because we need shortest path.
Time complexity will be O(V + E).
Space complexity O(V) for the queue.
Does this approach sound good?"
```

#### When Coding:
```
"I'll start with the standard BFS template...
Now I'll add the logic to handle [constraint]...
Let me add this visited set to avoid cycles..."
```

#### When Testing:
```
"Let me walk through this example:
- Start: node 0
- First iteration: visit neighbors 1 and 2
- Second iteration: ...
- Result: [expected output]"
```

#### When Stuck:
```
"I'm considering two approaches:
1. [Approach A] - faster but more complex
2. [Approach B] - simpler but slower
Which would you prefer I implement?"
```

## 6.6 Problem-Solving Checklist

```
Before Interview:
□ Memorize BFS/DFS/Dijkstra/Union-Find templates
□ Practice 50+ graph problems
□ Know all graph types and properties
□ Understand time/space complexity for each algorithm

During Problem Understanding:
□ Draw the graph
□ Identify graph type
□ Clarify constraints
□ Ask about edge cases (empty graph, cycles, disconnected)

During Design:
□ Identify problem pattern
□ Choose appropriate algorithm
□ Discuss complexity
□ Get interviewer agreement

During Coding:
□ Start with template
□ Handle visited tracking correctly
□ Remember bidirectional edges for undirected graphs
□ Add comments for clarity

During Testing:
□ Test normal case
□ Test edge cases (single node, no edges, cycle)
□ Dry run with example
□ Check for off-by-one errors

During Optimization:
□ Can we terminate early?
□ Is there redundant work?
□ Can we use better data structure?
□ Trade-offs?
```

## 6.7 Last-Minute Review (Night Before)

### Top 20 Must-Practice Problems:

1. **Number of Islands** (DFS/BFS basics)
2. **Course Schedule** (Cycle detection)
3. **Course Schedule II** (Topological sort)
4. **Clone Graph** (BFS/DFS with cloning)
5. **Pacific Atlantic Water Flow** (Multi-source)
6. **Word Ladder** (BFS on implicit graph)
7. **Network Delay Time** (Dijkstra)
8. **Cheapest Flights Within K Stops** (Modified Dijkstra)
9. **Number of Connected Components** (Union-Find)
10. **Graph Valid Tree** (Cycle + connectivity)
11. **Accounts Merge** (Union-Find with strings)
12. **Redundant Connection** (Union-Find cycle detection)
13. **Critical Connections** (Bridges - Tarjan)
14. **Min Cost to Connect All Points** (MST)
15. **Rotting Oranges** (Multi-source BFS)
16. **Walls and Gates** (Multi-source BFS)
17. **Shortest Path in Binary Matrix** (BFS on grid)
18. **Is Graph Bipartite?** (2-coloring)
19. **All Paths from Source to Target** (DFS backtracking)
20. **Reconstruct Itinerary** (Eulerian path)

### Quick Complexity Reference:

| Algorithm | Time | Space | Use Case |
|-----------|------|-------|----------|
| BFS/DFS | O(V+E) | O(V) | Traversal, connectivity |
| Dijkstra | O((V+E)logV) | O(V) | Weighted shortest path |
| Union-Find | O(Eα(V)) | O(V) | Dynamic connectivity |
| Topological Sort | O(V+E) | O(V) | Ordering with dependencies |
| Kruskal | O(ElogE) | O(V) | Minimum spanning tree |
| Tarjan (SCC/Bridges) | O(V+E) | O(V) | Critical connections |
| Floyd-Warshall | O(V³) | O(V²) | All pairs shortest path |

---

# 📋 Final Quick Reference Card

## Graph Problem Decision Tree

```
┌─ Is it a tree? ─────────────────────→ DFS/BFS + Tree patterns
│
├─ Need shortest path?
│  ├─ Unweighted ────────────────────→ BFS
│  ├─ Weighted (non-negative) ───────→ Dijkstra
│  ├─ Weighted (negative) ───────────→ Bellman-Ford
│  └─ All pairs ─────────────────────→ Floyd-Warshall
│
├─ Need to find cycles?
│  ├─ Undirected ────────────────────→ DFS or Union-Find
│  └─ Directed ──────────────────────→ DFS with colors
│
├─ Need ordering with dependencies? ──→ Topological Sort
│
├─ Need connectivity?
│  ├─ Static ────────────────────────→ DFS/BFS
│  └─ Dynamic ───────────────────────→ Union-Find
│
├─ Need minimum spanning tree? ───────→ Kruskal or Prim
│
└─ Need critical connections? ────────→ Tarjan's Algorithm
```

## Complexity Quick Reference

```
Sparse (E ≈ V):      Most algorithms ~ O(V)
Dense (E ≈ V²):      Most algorithms ~ O(V²)
Complete (E = V²):   Use adjacency matrix

Space:
- Adjacency list:    O(V + E)
- Adjacency matrix:  O(V²)
- BFS queue:         O(V)
- DFS stack:         O(V)
```

## Interview Day Mantras

```
✅ Draw the graph first
✅ Clarify directed vs undirected
✅ Ask about cycles
✅ Discuss complexity before coding
✅ Use standard templates
✅ Test with examples
✅ Handle edge cases
✅ Communicate throughout
```

---

**🎉 Congratulations! You've completed the entire DSA Master Course!**

**You now have the knowledge to:**
- Recognize any graph problem pattern instantly
- Choose the right algorithm for any situation
- Implement solutions efficiently
- Optimize for time and space
- Ace FAANG-level graph interviews

**Go crush those interviews! 💪**

---

*End of Week 6: Advanced Graphs Complete Notes*

*🎓 DSA Master Course: COMPLETE! 🎓*
