# 🕸️ Week 5: Graphs — Complete Master Notes

> **Goal**: Master graph data structures and algorithms from fundamentals to advanced patterns. After this, you'll tackle graph problems that make other candidates struggle.

---

## 📌 Table of Contents

1. [Basics of Graphs](#1-basics-of-graphs)
2. [Graph Representations](#2-graph-representations)
3. [BFS & DFS Traversals](#3-bfs--dfs-traversals)
4. [Common Graph Algorithms](#4-common-graph-algorithms)
5. [Cycle Detection](#5-cycle-detection)
6. [Shortest Path Basics](#6-shortest-path-basics)
7. [Time Complexity Analysis](#7-time-complexity-analysis)
8. [LIVE Problem Solving Patterns](#8-live-problem-solving-patterns)

---

# 1. Basics of Graphs

## 1.1 Concept Intuition (Real World Analogy)

### 🗺️ The Road Map Analogy
- **Cities** = Nodes (vertices)
- **Roads** = Edges (connections)
- **One-way streets** = Directed edges
- **Two-way streets** = Undirected edges
- **Distance/toll** = Weighted edges

### 📱 The Social Network Analogy
- **People** = Nodes
- **Friendships** = Edges
- **Following** = Directed edges (A follows B doesn't mean B follows A)
- **Mutual friends** = Undirected edges

### 🎯 The Core Idea
```
Graph = Set of nodes (vertices) + Set of connections (edges)
      = Most flexible data structure
      = Models relationships between entities
      = More general than trees (can have cycles)
```

## 1.2 Core Theory (Simple Words)

### What is a Graph?

A **graph** G = (V, E) consists of:
- **V**: Set of vertices (nodes)
- **E**: Set of edges (connections between vertices)

```
Graph Example:
    1 --- 2
    |     |
    |     |
    3 --- 4

V = {1, 2, 3, 4}
E = {(1,2), (1,3), (2,4), (3,4)}
```

### Key Terminology:

```
       1 ------ 2
      /|        |
     / |        |
    3  |        4
     \ |       /
      \|      /
       5 ----/

Terms:
- Vertex/Node: Points in graph (1, 2, 3, 4, 5)
- Edge: Connection between vertices
- Adjacent: Nodes connected by edge (1 and 2 are adjacent)
- Degree: Number of edges connected to a vertex
  - degree(1) = 3 (connected to 2, 3, 5)
- Path: Sequence of vertices connected by edges
  - Path from 1 to 4: 1→2→4 or 1→5→4
- Cycle: Path that starts and ends at same vertex
  - Cycle: 1→2→4→5→1
- Connected: All vertices reachable from any vertex
```

## 1.3 Types of Graphs

### 1. **Undirected Graph**
Edges have no direction (two-way relationship).

```
    1 --- 2
    |     |
    3 --- 4

Edge (1,2) means: 1↔2 (bidirectional)
```

```python
# Representation
graph = {
    1: [2, 3],
    2: [1, 4],
    3: [1, 4],
    4: [2, 3]
}
```

### 2. **Directed Graph (Digraph)**
Edges have direction (one-way relationship).

```
    1 ──→ 2
    ↑     ↓
    ↑     ↓
    3 ←── 4

Edge 1→2 means: Can go from 1 to 2 (NOT 2 to 1)
```

```python
graph = {
    1: [2],
    2: [4],
    3: [1],
    4: [3]
}
```

### 3. **Weighted Graph**
Edges have weights (costs/distances).

```
    1 --5-- 2
    |       |
    3       7
    |       |
    3 --2-- 4

Edge (1,2) has weight 5
```

```python
graph = {
    1: [(2, 5), (3, 3)],
    2: [(1, 5), (4, 7)],
    3: [(1, 3), (4, 2)],
    4: [(2, 7), (3, 2)]
}
```

### 4. **Unweighted Graph**
All edges have same weight (usually 1).

```
    1 --- 2
    |     |
    3 --- 4
```

### 5. **Cyclic Graph**
Contains at least one cycle.

```
    1 --- 2
    |     |
    3 --- 4
    
Cycle: 1→2→4→3→1
```

### 6. **Acyclic Graph**
No cycles. If undirected and acyclic = Tree!

```
    1 --- 2
    |     
    3     4
```

### 7. **Directed Acyclic Graph (DAG)**
Directed + No cycles. Used in task scheduling, dependency resolution.

```
    1 ──→ 2
    ↓     ↓
    3 ──→ 4

No way to return to starting point!
```

### 8. **Connected Graph**
Path exists between any two vertices (undirected).

```
Connected:              Disconnected:
    1 --- 2                 1 --- 2    5
    |     |                 |     |    |
    3 --- 4                 3 --- 4    6
```

### 9. **Strongly Connected Graph**
In directed graph, path exists between all pairs in both directions.

```
Strongly Connected:     Weakly Connected:
    1 ←→ 2                 1 ──→ 2
    ↕    ↕                 ↑     ↓
    3 ←→ 4                 3 ←── 4
```

### 10. **Complete Graph**
Every pair of vertices is connected.

```
    1 --- 2
    |\ /|
    | X |
    |/ \|
    3 --- 4

All possible edges exist!
n vertices → n(n-1)/2 edges
```

### 11. **Bipartite Graph**
Vertices can be divided into two sets; edges only between sets.

```
Set A: {1, 3}       1 --- 2
Set B: {2, 4}       |     |
                    3 --- 4

No edge within same set!
Use case: Matching problems
```

## 1.4 Graph Properties and Formulas

### Basic Properties:

| Property | Undirected | Directed |
|----------|-----------|----------|
| Max edges | n(n-1)/2 | n(n-1) |
| Min edges (connected) | n-1 | n-1 |
| Sum of degrees | 2 × |E| | |E| (in) + |E| (out) |
| Degree per vertex | 0 to n-1 | 0 to n-1 |

### Handshaking Lemma (Undirected):
```
Sum of all degrees = 2 × Number of edges

Why? Each edge contributes to degree of 2 vertices.
```

### For Complete Graph with n vertices:
```
Edges = n(n-1)/2
Degree of each vertex = n-1
```

### For Tree (special acyclic graph):
```
Vertices = n
Edges = n - 1
```

## 1.5 Special Graph Types in Problems

### 1. **Grid Graph (2D Matrix)**
```
[0,0] - [0,1] - [0,2]
  |       |       |
[1,0] - [1,1] - [1,2]
  |       |       |
[2,0] - [2,1] - [2,2]

Each cell = vertex
Adjacent cells (up/down/left/right) = edges
```

### 2. **Implicit Graph**
Graph not explicitly given, needs to be constructed.

Example: Word Ladder (transform one word to another)
- Each word = vertex
- Edge if words differ by one letter

### 3. **Tree**
Connected acyclic undirected graph.
- Any two vertices connected by exactly one path
- n vertices → n-1 edges

### 4. **Forest**
Collection of disjoint trees.

## 1.6 Graph Applications

### Real-World Uses:
| Domain | Nodes | Edges |
|--------|-------|-------|
| **Social Networks** | People | Friendships/Follows |
| **Maps** | Locations | Roads/Routes |
| **Internet** | Computers | Connections |
| **Dependencies** | Tasks | Prerequisites |
| **Molecules** | Atoms | Bonds |
| **Recommendation** | Users/Items | Interactions |
| **Compilers** | Variables | Dependencies |

### Common Graph Problems:
- Finding shortest path (GPS navigation)
- Detecting cycles (deadlock detection)
- Finding connected components (network clusters)
- Topological sorting (task scheduling)
- Minimum spanning tree (network design)
- Maximum flow (resource allocation)

## 1.7 Mental Checklist for Graph Basics

```
□ What type of graph?
  □ Directed or undirected?
  □ Weighted or unweighted?
  □ Cyclic or acyclic?
  □ Connected or disconnected?

□ What's being asked?
  □ Traversal?
  □ Shortest path?
  □ Connectivity?
  □ Cycle detection?
  □ Topological order?

□ What representation is best?
  □ Adjacency list? (sparse graph)
  □ Adjacency matrix? (dense graph)
  □ Edge list? (specific algorithms)

□ What constraints matter?
  □ Number of vertices (V)
  □ Number of edges (E)
  □ Memory limits
  □ Time limits
```

---

# 2. Graph Representations

## 2.1 The Three Main Representations

### Overview:

| Representation | Space | Check Edge | Get Neighbors | Best For |
|---------------|-------|------------|---------------|----------|
| **Adjacency Matrix** | O(V²) | O(1) | O(V) | Dense graphs, quick edge lookup |
| **Adjacency List** | O(V+E) | O(degree) | O(degree) | Sparse graphs, most problems |
| **Edge List** | O(E) | O(E) | O(E) | Simple algorithms (Kruskal's) |

## 2.2 Adjacency Matrix

### Concept:
2D array where `matrix[i][j] = 1` if edge from i to j exists.

### Undirected Graph:
```
    0 --- 1
    |     |
    2 --- 3

Matrix:
     0  1  2  3
  0 [0, 1, 1, 0]
  1 [1, 0, 0, 1]
  2 [1, 0, 0, 1]
  3 [0, 1, 1, 0]

Symmetric! matrix[i][j] = matrix[j][i]
```

### Directed Graph:
```
    0 ──→ 1
    ↓     ↓
    2 ←── 3

Matrix:
     0  1  2  3
  0 [0, 1, 0, 0]
  1 [0, 0, 0, 1]
  2 [0, 0, 0, 0]
  3 [0, 0, 1, 0]

Not symmetric!
```

### Weighted Graph:
```
    0 --5-- 1
    |       |
    3       7
    |       |
    2 --2-- 3

Matrix:
     0  1  2  3
  0 [0, 5, 3, 0]
  1 [5, 0, 0, 7]
  2 [3, 0, 0, 2]
  3 [0, 7, 2, 0]

Use weight instead of 1, 0/∞ for no edge
```

### Implementation:
```python
class GraphMatrix:
    def __init__(self, vertices):
        self.V = vertices
        self.graph = [[0] * vertices for _ in range(vertices)]
    
    def add_edge(self, u, v, weight=1):
        self.graph[u][v] = weight
        # For undirected:
        # self.graph[v][u] = weight
    
    def has_edge(self, u, v):
        return self.graph[u][v] != 0
    
    def get_neighbors(self, u):
        return [v for v in range(self.V) if self.graph[u][v] != 0]
```

### Pros:
- ✅ O(1) edge lookup
- ✅ Simple to implement
- ✅ Good for dense graphs
- ✅ Easy to check if edge exists

### Cons:
- ❌ O(V²) space (wastes space for sparse graphs)
- ❌ O(V²) to initialize
- ❌ O(V) to get all neighbors

### When to Use:
- Dense graphs (many edges)
- Need quick edge existence checks
- V is small (< 1000)

## 2.3 Adjacency List

### Concept:
Array of lists. `adj[i]` = list of neighbors of vertex i.

### Undirected Graph:
```
    0 --- 1
    |     |
    2 --- 3

Adjacency List:
0: [1, 2]
1: [0, 3]
2: [0, 3]
3: [1, 2]
```

### Directed Graph:
```
    0 ──→ 1
    ↓     ↓
    2 ←── 3

Adjacency List:
0: [1, 2]
1: [3]
2: []
3: [2]
```

### Weighted Graph:
```
    0 --5-- 1
    |       |
    3       7
    |       |
    2 --2-- 3

Adjacency List (with weights):
0: [(1,5), (2,3)]
1: [(0,5), (3,7)]
2: [(0,3), (3,2)]
3: [(1,7), (2,2)]
```

### Implementation:
```python
from collections import defaultdict

class Graph:
    def __init__(self):
        self.graph = defaultdict(list)
    
    def add_edge(self, u, v, weight=None):
        if weight is None:
            self.graph[u].append(v)
            # For undirected:
            # self.graph[v].append(u)
        else:
            self.graph[u].append((v, weight))
            # For undirected:
            # self.graph[v].append((u, weight))
    
    def get_neighbors(self, u):
        return self.graph[u]
```

### Using Dictionary:
```python
graph = {
    0: [1, 2],
    1: [0, 3],
    2: [0, 3],
    3: [1, 2]
}
```

### Using List of Lists:
```python
# For n vertices
graph = [[] for _ in range(n)]
graph[0].append(1)  # Edge 0→1
graph[0].append(2)  # Edge 0→2
```

### Pros:
- ✅ O(V+E) space (space efficient for sparse graphs)
- ✅ O(1) to add edge
- ✅ O(degree) to iterate neighbors
- ✅ Most commonly used in interviews!

### Cons:
- ❌ O(degree) to check if specific edge exists
- ❌ Harder to check for edge existence

### When to Use:
- Sparse graphs (E << V²)
- Most graph problems!
- BFS/DFS traversals
- When memory is concern

## 2.4 Edge List

### Concept:
List of all edges as tuples.

### Unweighted:
```
    0 --- 1
    |     |
    2 --- 3

Edge List:
[(0,1), (0,2), (1,3), (2,3)]
```

### Weighted:
```
Edge List:
[(0,1,5), (0,2,3), (1,3,7), (2,3,2)]
```

### Implementation:
```python
edges = []
edges.append((0, 1))      # Unweighted
edges.append((0, 2, 5))   # Weighted (u, v, weight)
```

### Pros:
- ✅ Simple representation
- ✅ Easy to sort by weight
- ✅ Good for Kruskal's MST algorithm
- ✅ Space efficient: O(E)

### Cons:
- ❌ Inefficient for most operations
- ❌ Hard to find neighbors

### When to Use:
- Kruskal's algorithm
- Union-Find problems
- Simple edge processing

## 2.5 Comparison Example

### Graph:
```
    0 --5-- 1
    |       |
    3       7
    |       |
    2 --2-- 3
```

### Adjacency Matrix:
```python
graph = [
    [0, 5, 3, 0],
    [5, 0, 0, 7],
    [3, 0, 0, 2],
    [0, 7, 2, 0]
]
```

### Adjacency List:
```python
graph = {
    0: [(1,5), (2,3)],
    1: [(0,5), (3,7)],
    2: [(0,3), (3,2)],
    3: [(1,7), (2,2)]
}
```

### Edge List:
```python
edges = [
    (0, 1, 5),
    (0, 2, 3),
    (1, 3, 7),
    (2, 3, 2)
]
```

## 2.6 Special Cases

### 1. **Grid as Graph**
```python
# 2D grid
grid = [
    [1, 0, 1],
    [1, 1, 0],
    [0, 1, 1]
]

# Get neighbors of cell (r, c)
def get_neighbors(grid, r, c):
    rows, cols = len(grid), len(grid[0])
    neighbors = []
    directions = [(0,1), (1,0), (0,-1), (-1,0)]  # right, down, left, up
    
    for dr, dc in directions:
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            neighbors.append((nr, nc))
    
    return neighbors
```

### 2. **Implicit Graph (State Space)**
```python
# Example: Generate all states from current state
def get_neighbors(state):
    neighbors = []
    # Generate next possible states
    # Example: Sliding puzzle, word ladder, etc.
    return neighbors
```

## 2.7 Building Graph from Input

### From Edge List:
```python
def build_graph(n, edges):
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)  # If undirected
    return graph
```

### From Adjacency Matrix:
```python
def matrix_to_list(matrix):
    n = len(matrix)
    graph = defaultdict(list)
    for i in range(n):
        for j in range(n):
            if matrix[i][j] != 0:
                graph[i].append(j)
    return graph
```

### From Prerequisites (Common in Problems):
```python
# Input: numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]
# Meaning: To take course 1, must complete course 0
def build_graph(numCourses, prerequisites):
    graph = defaultdict(list)
    for course, prereq in prerequisites:
        graph[prereq].append(course)
    return graph
```

## 2.8 Mental Checklist for Representation

```
□ How many vertices and edges?
  □ Sparse (E ≈ V)? → Adjacency List
  □ Dense (E ≈ V²)? → Adjacency Matrix

□ What operations are needed?
  □ Check if edge exists? → Matrix
  □ Iterate neighbors? → List
  □ Sort edges? → Edge List

□ Memory constraints?
  □ Limited? → Adjacency List
  □ Plenty? → Adjacency Matrix (simpler)

□ Problem type?
  □ Most traversals/pathfinding → Adjacency List
  □ MST with Kruskal → Edge List
  □ Dense connectivity → Matrix
```

---

# 3. BFS & DFS Traversals

## 3.1 Concept Intuition

### 🌊 BFS: The Ripple Analogy
Drop a stone in water:
- Ripples spread outward in circles
- First wave hits closest points
- Then next wave hits points farther out
- **BFS explores level by level**

### 🏃 DFS: The Maze Exploration Analogy
Exploring a maze:
- Go as deep as possible in one direction
- When you hit a dead end, backtrack
- Try next direction
- **DFS explores as deep as possible before backtracking**

## 3.2 Breadth-First Search (BFS)

### The Algorithm:
1. Start from source vertex
2. Visit all neighbors (distance 1)
3. Then visit all their neighbors (distance 2)
4. Continue level by level

### Visualization:
```
       0
      /|\
     1 2 3
    /|   |\
   4 5   6 7

BFS from 0: 0, 1, 2, 3, 4, 5, 6, 7
Level 0: [0]
Level 1: [1, 2, 3]
Level 2: [4, 5, 6, 7]
```

### Template Implementation:
```python
from collections import deque

def bfs(graph, start):
    visited = set()
    queue = deque([start])
    visited.add(start)
    
    while queue:
        vertex = queue.popleft()
        print(vertex, end=' ')  # Process vertex
        
        for neighbor in graph[vertex]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
```

### BFS with Levels:
```python
def bfs_levels(graph, start):
    visited = set([start])
    queue = deque([start])
    level = 0
    
    while queue:
        level_size = len(queue)
        print(f"Level {level}:", end=' ')
        
        for _ in range(level_size):
            vertex = queue.popleft()
            print(vertex, end=' ')
            
            for neighbor in graph[vertex]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        
        print()  # New line after each level
        level += 1
```

### BFS with Distance:
```python
def bfs_distance(graph, start):
    visited = {start: 0}  # vertex: distance from start
    queue = deque([start])
    
    while queue:
        vertex = queue.popleft()
        
        for neighbor in graph[vertex]:
            if neighbor not in visited:
                visited[neighbor] = visited[vertex] + 1
                queue.append(neighbor)
    
    return visited  # Returns distance to each reachable vertex
```

### BFS with Path Tracking:
```python
def bfs_path(graph, start, goal):
    visited = set([start])
    queue = deque([[start]])  # Queue of paths
    
    while queue:
        path = queue.popleft()
        vertex = path[-1]
        
        if vertex == goal:
            return path  # Found path!
        
        for neighbor in graph[vertex]:
            if neighbor not in visited:
                visited.add(neighbor)
                new_path = path + [neighbor]
                queue.append(new_path)
    
    return None  # No path found
```

## 3.3 Depth-First Search (DFS)

### The Algorithm:
1. Start from source vertex
2. Go as deep as possible on one path
3. When stuck, backtrack
4. Try next unexplored path

### Visualization:
```
       0
      /|\
     1 2 3
    /|   |\
   4 5   6 7

DFS from 0: 0, 1, 4, 5, 2, 3, 6, 7
(Assuming we visit children left to right)
```

### Recursive DFS (Most Common):
```python
def dfs_recursive(graph, vertex, visited=None):
    if visited is None:
        visited = set()
    
    visited.add(vertex)
    print(vertex, end=' ')  # Process vertex
    
    for neighbor in graph[vertex]:
        if neighbor not in visited:
            dfs_recursive(graph, neighbor, visited)
```

### Iterative DFS (Using Stack):
```python
def dfs_iterative(graph, start):
    visited = set()
    stack = [start]
    
    while stack:
        vertex = stack.pop()
        
        if vertex not in visited:
            visited.add(vertex)
            print(vertex, end=' ')  # Process vertex
            
            # Add neighbors in reverse to maintain left-to-right order
            for neighbor in reversed(graph[vertex]):
                if neighbor not in visited:
                    stack.append(neighbor)
```

### DFS with Path:
```python
def dfs_path(graph, start, goal, path=None, visited=None):
    if path is None:
        path = []
    if visited is None:
        visited = set()
    
    path = path + [start]
    visited.add(start)
    
    if start == goal:
        return path
    
    for neighbor in graph[start]:
        if neighbor not in visited:
            new_path = dfs_path(graph, neighbor, goal, path, visited)
            if new_path:
                return new_path
    
    return None
```

### DFS with Pre/Post Order:
```python
def dfs_order(graph, vertex, visited, preorder, postorder):
    visited.add(vertex)
    preorder.append(vertex)  # Before exploring children
    
    for neighbor in graph[vertex]:
        if neighbor not in visited:
            dfs_order(graph, neighbor, visited, preorder, postorder)
    
    postorder.append(vertex)  # After exploring children

# Usage
visited = set()
preorder = []
postorder = []
dfs_order(graph, start, visited, preorder, postorder)
```

## 3.4 BFS vs DFS Comparison

| Aspect | BFS | DFS |
|--------|-----|-----|
| **Data Structure** | Queue | Stack (or recursion) |
| **Exploration** | Level by level | As deep as possible |
| **Space** | O(V) - wider tree | O(h) - height |
| **Shortest Path** | ✅ Yes (unweighted) | ❌ No |
| **All Paths** | Harder | Easier |
| **Cycle Detection** | Possible | Easier |
| **Completeness** | ✅ Yes | ✅ Yes |
| **Optimality** | ✅ For unweighted | ❌ |

### When to Use BFS:
- ✅ Finding shortest path (unweighted graph)
- ✅ Level-order traversal
- ✅ Finding connected components
- ✅ Finding all nodes within k distance
- ✅ Testing bipartiteness
- ✅ Web crawling (breadth-first)

### When to Use DFS:
- ✅ Detecting cycles
- ✅ Topological sorting
- ✅ Finding strongly connected components
- ✅ Solving puzzles (backtracking)
- ✅ Path finding (if any path, not shortest)
- ✅ Tree traversals
- ✅ Maze solving

## 3.5 Complete Examples

### Example: Connected Components
```python
def count_components(n, edges):
    # Build graph
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    visited = set()
    count = 0
    
    def dfs(node):
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                dfs(neighbor)
    
    for node in range(n):
        if node not in visited:
            dfs(node)
            count += 1
    
    return count
```

### Example: Shortest Path in Unweighted Graph
```python
def shortest_path(graph, start, end):
    if start == end:
        return 0
    
    visited = set([start])
    queue = deque([(start, 0)])  # (node, distance)
    
    while queue:
        node, dist = queue.popleft()
        
        for neighbor in graph[node]:
            if neighbor == end:
                return dist + 1
            
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1))
    
    return -1  # No path
```

### Example: All Paths from Source to Target
```python
def all_paths(graph, start, end):
    paths = []
    
    def dfs(node, path):
        if node == end:
            paths.append(path[:])
            return
        
        for neighbor in graph[node]:
            if neighbor not in path:  # Avoid cycles
                path.append(neighbor)
                dfs(neighbor, path)
                path.pop()  # Backtrack
    
    dfs(start, [start])
    return paths
```

## 3.6 Grid Traversal

### BFS on Grid:
```python
def bfs_grid(grid, start_r, start_c):
    rows, cols = len(grid), len(grid[0])
    visited = set([(start_r, start_c)])
    queue = deque([(start_r, start_c)])
    directions = [(0,1), (1,0), (0,-1), (-1,0)]
    
    while queue:
        r, c = queue.popleft()
        
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if (0 <= nr < rows and 0 <= nc < cols and
                (nr, nc) not in visited and grid[nr][nc] != 0):
                visited.add((nr, nc))
                queue.append((nr, nc))
```

### DFS on Grid:
```python
def dfs_grid(grid, r, c, visited):
    rows, cols = len(grid), len(grid[0])
    
    if (r < 0 or r >= rows or c < 0 or c >= cols or
        (r, c) in visited or grid[r][c] == 0):
        return
    
    visited.add((r, c))
    
    # Explore 4 directions
    dfs_grid(grid, r+1, c, visited)  # Down
    dfs_grid(grid, r-1, c, visited)  # Up
    dfs_grid(grid, r, c+1, visited)  # Right
    dfs_grid(grid, r, c-1, visited)  # Left
```

## 3.7 Common Patterns

### Pattern 1: Multi-Source BFS
```python
def multi_source_bfs(grid, sources):
    rows, cols = len(grid), len(grid[0])
    visited = set(sources)
    queue = deque(sources)  # Start from all sources
    
    while queue:
        r, c = queue.popleft()
        # Process...
        
        for dr, dc in [(0,1), (1,0), (0,-1), (-1,0)]:
            nr, nc = r + dr, c + dc
            if (0 <= nr < rows and 0 <= nc < cols and
                (nr, nc) not in visited):
                visited.add((nr, nc))
                queue.append((nr, nc))
```

### Pattern 2: BFS with Multiple States
```python
def bfs_with_state(graph, start, start_state):
    visited = set([(start, start_state)])
    queue = deque([(start, start_state, 0)])  # (node, state, dist)
    
    while queue:
        node, state, dist = queue.popleft()
        
        # Generate next states...
        for neighbor, new_state in get_next_states(node, state):
            if (neighbor, new_state) not in visited:
                visited.add((neighbor, new_state))
                queue.append((neighbor, new_state, dist + 1))
```

## 3.8 Mental Checklist for Traversals

```
□ Which traversal to use?
  □ Need shortest path? → BFS
  □ Need any path? → DFS
  □ Exploring all possibilities? → DFS
  □ Level-based processing? → BFS

□ Graph characteristics?
  □ Directed or undirected?
  □ Weighted or unweighted?
  □ Might have cycles?

□ Implementation details?
  □ Track visited nodes (set)
  □ Use queue for BFS, stack/recursion for DFS
  □ Handle disconnected components?

□ What to track?
  □ Just visited? → Boolean
  □ Distance? → Integer
  □ Path? → List
  □ Parent? → Dictionary
```

---

# 4. Common Graph Algorithms

## 4.1 Topological Sort

### Concept:
Linear ordering of vertices such that for every edge u→v, u comes before v.

**Only works on DAG (Directed Acyclic Graph)!**

### Use Cases:
- Course scheduling (prerequisites)
- Build systems (dependencies)
- Task scheduling

### Example:
```
    0 ──→ 1 ──→ 3
    ↓           ↑
    2 ──────────┘

Topological Orders:
- [0, 2, 1, 3]
- [0, 1, 2, 3]

Both valid!
```

### Method 1: DFS-based (Kahn's Algorithm - Postorder)
```python
def topological_sort_dfs(graph, n):
    visited = set()
    result = []
    
    def dfs(node):
        visited.add(node)
        
        for neighbor in graph[node]:
            if neighbor not in visited:
                dfs(neighbor)
        
        result.append(node)  # Add to result AFTER visiting children
    
    for node in range(n):
        if node not in visited:
            dfs(node)
    
    return result[::-1]  # Reverse to get topological order
```

### Method 2: BFS-based (Kahn's Algorithm - Indegree)
```python
from collections import deque, defaultdict

def topological_sort_bfs(graph, n):
    # Calculate indegrees
    indegree = [0] * n
    for node in graph:
        for neighbor in graph[node]:
            indegree[neighbor] += 1
    
    # Start with nodes having no prerequisites
    queue = deque([i for i in range(n) if indegree[i] == 0])
    result = []
    
    while queue:
        node = queue.popleft()
        result.append(node)
        
        for neighbor in graph[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    
    # If result has all nodes, valid topological sort
    return result if len(result) == n else []
```

### Detecting Cycle (No topological sort possible):
```python
def can_finish(numCourses, prerequisites):
    graph = defaultdict(list)
    indegree = [0] * numCourses
    
    for course, prereq in prerequisites:
        graph[prereq].append(course)
        indegree[course] += 1
    
    queue = deque([i for i in range(numCourses) if indegree[i] == 0])
    count = 0
    
    while queue:
        node = queue.popleft()
        count += 1
        
        for neighbor in graph[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    
    return count == numCourses  # True if no cycle
```

## 4.2 Union-Find (Disjoint Set Union)

### Concept:
Data structure to track disjoint sets and merge them efficiently.

### Operations:
- **Find**: Which set does element belong to?
- **Union**: Merge two sets

### Use Cases:
- Connected components
- Cycle detection (undirected graph)
- Kruskal's MST algorithm
- Network connectivity

### Implementation with Path Compression & Union by Rank:
```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
    
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]
    
    def union(self, x, y):
        root_x = self.find(x)
        root_y = self.find(y)
        
        if root_x == root_y:
            return False  # Already in same set
        
        # Union by rank
        if self.rank[root_x] < self.rank[root_y]:
            self.parent[root_x] = root_y
        elif self.rank[root_x] > self.rank[root_y]:
            self.parent[root_y] = root_x
        else:
            self.parent[root_y] = root_x
            self.rank[root_x] += 1
        
        return True
    
    def connected(self, x, y):
        return self.find(x) == self.find(y)
```

### Example: Count Connected Components
```python
def count_components(n, edges):
    uf = UnionFind(n)
    
    for u, v in edges:
        uf.union(u, v)
    
    # Count unique roots
    return len(set(uf.find(i) for i in range(n)))
```

### Example: Redundant Connection (Find Cycle)
```python
def find_redundant_connection(edges):
    uf = UnionFind(len(edges))
    
    for u, v in edges:
        if not uf.union(u-1, v-1):  # Already connected
            return [u, v]  # This edge creates cycle
    
    return []
```

## 4.3 Bipartite Graph Check

### Concept:
Can we color graph with 2 colors such that no adjacent nodes have same color?

### Use Cases:
- Matching problems
- Scheduling
- Graph coloring

### BFS Approach:
```python
def is_bipartite(graph):
    n = len(graph)
    color = [-1] * n  # -1: uncolored, 0: color1, 1: color2
    
    for start in range(n):
        if color[start] != -1:
            continue
        
        # BFS
        queue = deque([start])
        color[start] = 0
        
        while queue:
            node = queue.popleft()
            
            for neighbor in graph[node]:
                if color[neighbor] == -1:
                    # Color with opposite color
                    color[neighbor] = 1 - color[node]
                    queue.append(neighbor)
                elif color[neighbor] == color[node]:
                    # Same color as neighbor!
                    return False
    
    return True
```

### DFS Approach:
```python
def is_bipartite_dfs(graph):
    n = len(graph)
    color = [-1] * n
    
    def dfs(node, c):
        color[node] = c
        for neighbor in graph[node]:
            if color[neighbor] == -1:
                if not dfs(neighbor, 1 - c):
                    return False
            elif color[neighbor] == c:
                return False
        return True
    
    for i in range(n):
        if color[i] == -1:
            if not dfs(i, 0):
                return False
    
    return True
```

## 4.4 Flood Fill

### Concept:
Fill connected region with new color (like paint bucket tool).

### Implementation:
```python
def flood_fill(image, sr, sc, new_color):
    rows, cols = len(image), len(image[0])
    original_color = image[sr][sc]
    
    if original_color == new_color:
        return image
    
    def dfs(r, c):
        if (r < 0 or r >= rows or c < 0 or c >= cols or
            image[r][c] != original_color):
            return
        
        image[r][c] = new_color
        
        dfs(r+1, c)
        dfs(r-1, c)
        dfs(r, c+1)
        dfs(r, c-1)
    
    dfs(sr, sc)
    return image
```

## 4.5 Island Problems

### Count Islands:
```python
def num_islands(grid):
    if not grid:
        return 0
    
    rows, cols = len(grid), len(grid[0])
    visited = set()
    count = 0
    
    def dfs(r, c):
        if (r < 0 or r >= rows or c < 0 or c >= cols or
            grid[r][c] == '0' or (r, c) in visited):
            return
        
        visited.add((r, c))
        dfs(r+1, c)
        dfs(r-1, c)
        dfs(r, c+1)
        dfs(r, c-1)
    
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1' and (r, c) not in visited:
                dfs(r, c)
                count += 1
    
    return count
```

### Max Area of Island:
```python
def max_area_of_island(grid):
    rows, cols = len(grid), len(grid[0])
    visited = set()
    
    def dfs(r, c):
        if (r < 0 or r >= rows or c < 0 or c >= cols or
            grid[r][c] == 0 or (r, c) in visited):
            return 0
        
        visited.add((r, c))
        area = 1
        area += dfs(r+1, c)
        area += dfs(r-1, c)
        area += dfs(r, c+1)
        area += dfs(r, c-1)
        return area
    
    max_area = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1 and (r, c) not in visited:
                max_area = max(max_area, dfs(r, c))
    
    return max_area
```

---

# 5. Cycle Detection

## 5.1 Why Detect Cycles?

### Real-World Applications:
- Deadlock detection
- Dependency resolution
- Finding infinite loops
- Course scheduling validation

## 5.2 Cycle Detection in Undirected Graph

### Using DFS:
```python
def has_cycle_undirected(graph, n):
    visited = set()
    
    def dfs(node, parent):
        visited.add(node)
        
        for neighbor in graph[node]:
            if neighbor not in visited:
                if dfs(neighbor, node):
                    return True
            elif neighbor != parent:
                # Visited neighbor that's not parent = cycle!
                return True
        
        return False
    
    for node in range(n):
        if node not in visited:
            if dfs(node, -1):
                return True
    
    return False
```

### Using Union-Find:
```python
def has_cycle_undirected_uf(n, edges):
    uf = UnionFind(n)
    
    for u, v in edges:
        if not uf.union(u, v):
            # Already connected = cycle!
            return True
    
    return False
```

## 5.3 Cycle Detection in Directed Graph

### Using DFS with Colors:
```python
def has_cycle_directed(graph, n):
    # WHITE: unvisited
    # GRAY: in current path (visiting)
    # BLACK: completely processed
    
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    
    def dfs(node):
        color[node] = GRAY  # Mark as visiting
        
        for neighbor in graph[node]:
            if color[neighbor] == GRAY:
                # Back edge to node in current path = cycle!
                return True
            if color[neighbor] == WHITE:
                if dfs(neighbor):
                    return True
        
        color[node] = BLACK  # Mark as processed
        return False
    
    for node in range(n):
        if color[node] == WHITE:
            if dfs(node):
                return True
    
    return False
```

### Using DFS with Recursion Stack:
```python
def has_cycle_directed_v2(graph, n):
    visited = set()
    rec_stack = set()  # Nodes in current recursion path
    
    def dfs(node):
        visited.add(node)
        rec_stack.add(node)
        
        for neighbor in graph[node]:
            if neighbor not in visited:
                if dfs(neighbor):
                    return True
            elif neighbor in rec_stack:
                # Neighbor in current path = cycle!
                return True
        
        rec_stack.remove(node)  # Remove from recursion stack
        return False
    
    for node in range(n):
        if node not in visited:
            if dfs(node):
                return True
    
    return False
```

### Using Topological Sort:
```python
def has_cycle_topological(graph, n):
    indegree = [0] * n
    
    for node in graph:
        for neighbor in graph[node]:
            indegree[neighbor] += 1
    
    queue = deque([i for i in range(n) if indegree[i] == 0])
    count = 0
    
    while queue:
        node = queue.popleft()
        count += 1
        
        for neighbor in graph[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    
    return count != n  # If can't process all nodes, there's a cycle
```

## 5.4 Finding the Cycle

### Find Cycle in Undirected Graph:
```python
def find_cycle_undirected(graph, n):
    visited = set()
    parent = {}
    
    def dfs(node, par):
        visited.add(node)
        parent[node] = par
        
        for neighbor in graph[node]:
            if neighbor not in visited:
                cycle = dfs(neighbor, node)
                if cycle:
                    return cycle
            elif neighbor != par:
                # Found cycle! Reconstruct it
                cycle = [neighbor, node]
                curr = node
                while parent[curr] != neighbor:
                    curr = parent[curr]
                    cycle.append(curr)
                return cycle
        
        return None
    
    for node in range(n):
        if node not in visited:
            cycle = dfs(node, -1)
            if cycle:
                return cycle
    
    return None
```

### Find Cycle in Directed Graph:
```python
def find_cycle_directed(graph, n):
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    parent = {}
    
    def dfs(node):
        color[node] = GRAY
        
        for neighbor in graph[node]:
            parent[neighbor] = node
            
            if color[neighbor] == GRAY:
                # Found cycle! Reconstruct it
                cycle = [neighbor]
                curr = node
                while curr != neighbor:
                    cycle.append(curr)
                    curr = parent[curr]
                cycle.append(neighbor)
                return cycle[::-1]
            
            if color[neighbor] == WHITE:
                cycle = dfs(neighbor)
                if cycle:
                    return cycle
        
        color[node] = BLACK
        return None
    
    for node in range(n):
        if color[node] == WHITE:
            cycle = dfs(node)
            if cycle:
                return cycle
    
    return None
```

## 5.5 Cycle Detection Summary

| Graph Type | Method | Time | Space |
|------------|--------|------|-------|
| **Undirected** | DFS | O(V+E) | O(V) |
| **Undirected** | Union-Find | O(E×α(V)) | O(V) |
| **Directed** | DFS (Colors) | O(V+E) | O(V) |
| **Directed** | Topological Sort | O(V+E) | O(V) |

Where α is inverse Ackermann function (practically constant).

---

# 6. Shortest Path Basics

## 6.1 Problem Types

### Shortest Path Variants:
1. **Single Source Shortest Path** (SSSP): From one vertex to all others
2. **Single Pair Shortest Path**: From one vertex to another
3. **All Pairs Shortest Path** (APSP): Between all pairs

## 6.2 BFS for Unweighted Graphs

### Concept:
In unweighted graph, BFS naturally finds shortest path (fewest edges).

### Implementation:
```python
def shortest_path_unweighted(graph, start, end):
    if start == end:
        return 0
    
    visited = {start}
    queue = deque([(start, 0)])
    
    while queue:
        node, dist = queue.popleft()
        
        for neighbor in graph[node]:
            if neighbor == end:
                return dist + 1
            
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1))
    
    return -1  # No path exists
```

### With Path Reconstruction:
```python
def shortest_path_with_path(graph, start, end):
    if start == end:
        return 0, [start]
    
    visited = {start}
    queue = deque([(start, 0, [start])])
    
    while queue:
        node, dist, path = queue.popleft()
        
        for neighbor in graph[node]:
            if neighbor == end:
                return dist + 1, path + [neighbor]
            
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1, path + [neighbor]))
    
    return -1, []
```

### All Distances from Source:
```python
def shortest_paths_from_source(graph, start):
    distances = {start: 0}
    queue = deque([start])
    
    while queue:
        node = queue.popleft()
        
        for neighbor in graph[node]:
            if neighbor not in distances:
                distances[neighbor] = distances[node] + 1
                queue.append(neighbor)
    
    return distances
```

## 6.3 Dijkstra's Algorithm (Weighted Graphs)

### Concept:
Finds shortest path in weighted graph with non-negative edge weights.

### Greedy Approach:
Always extend the shortest known path.

### Implementation with Priority Queue:
```python
import heapq

def dijkstra(graph, start):
    # graph[u] = [(v, weight), ...]
    distances = {start: 0}
    pq = [(0, start)]  # (distance, node)
    
    while pq:
        curr_dist, node = heapq.heappop(pq)
        
        # Skip if we've already found a better path
        if curr_dist > distances.get(node, float('inf')):
            continue
        
        for neighbor, weight in graph[node]:
            new_dist = curr_dist + weight
            
            if new_dist < distances.get(neighbor, float('inf')):
                distances[neighbor] = new_dist
                heapq.heappush(pq, (new_dist, neighbor))
    
    return distances
```

### With Path Reconstruction:
```python
def dijkstra_with_path(graph, start, end):
    distances = {start: 0}
    parent = {start: None}
    pq = [(0, start)]
    
    while pq:
        curr_dist, node = heapq.heappop(pq)
        
        if node == end:
            break
        
        if curr_dist > distances.get(node, float('inf')):
            continue
        
        for neighbor, weight in graph[node]:
            new_dist = curr_dist + weight
            
            if new_dist < distances.get(neighbor, float('inf')):
                distances[neighbor] = new_dist
                parent[neighbor] = node
                heapq.heappush(pq, (new_dist, neighbor))
    
    # Reconstruct path
    if end not in distances:
        return float('inf'), []
    
    path = []
    curr = end
    while curr is not None:
        path.append(curr)
        curr = parent[curr]
    
    return distances[end], path[::-1]
```

### Complexity:
- **Time:** O((V + E) log V) with binary heap
- **Space:** O(V)

## 6.4 Bellman-Ford Algorithm

### Concept:
Handles negative edge weights. Can detect negative cycles.

### Implementation:
```python
def bellman_ford(graph, n, start):
    # graph = [(u, v, weight), ...]
    distances = [float('inf')] * n
    distances[start] = 0
    
    # Relax edges V-1 times
    for _ in range(n - 1):
        for u, v, weight in graph:
            if distances[u] != float('inf'):
                if distances[u] + weight < distances[v]:
                    distances[v] = distances[u] + weight
    
    # Check for negative cycles
    for u, v, weight in graph:
        if distances[u] != float('inf'):
            if distances[u] + weight < distances[v]:
                return None  # Negative cycle detected
    
    return distances
```

### Complexity:
- **Time:** O(V × E)
- **Space:** O(V)

## 6.5 Shortest Path Algorithms Comparison

| Algorithm | Graph Type | Negative Weights | Time | Space | Use Case |
|-----------|------------|------------------|------|-------|----------|
| **BFS** | Unweighted | N/A | O(V+E) | O(V) | Simple, fast |
| **Dijkstra** | Weighted | ❌ No | O((V+E)logV) | O(V) | Most common |
| **Bellman-Ford** | Weighted | ✅ Yes | O(V×E) | O(V) | Negative weights |
| **Floyd-Warshall** | Weighted | ✅ Yes | O(V³) | O(V²) | All pairs |

## 6.6 Special Cases

### Shortest Path in DAG:
Can use topological sort + relaxation for O(V+E) time!

```python
def shortest_path_dag(graph, n, start):
    # Topological sort
    indegree = [0] * n
    for node in graph:
        for neighbor, _ in graph[node]:
            indegree[neighbor] += 1
    
    queue = deque([i for i in range(n) if indegree[i] == 0])
    topo_order = []
    
    while queue:
        node = queue.popleft()
        topo_order.append(node)
        
        for neighbor, _ in graph[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    
    # Relaxation in topological order
    distances = [float('inf')] * n
    distances[start] = 0
    
    for node in topo_order:
        if distances[node] != float('inf'):
            for neighbor, weight in graph[node]:
                distances[neighbor] = min(distances[neighbor],
                                         distances[node] + weight)
    
    return distances
```

### 0-1 BFS (Edges with weight 0 or 1):
```python
def zero_one_bfs(graph, start, end):
    distances = {start: 0}
    deque_bfs = deque([start])
    
    while deque_bfs:
        node = deque_bfs.popleft()
        
        for neighbor, weight in graph[node]:
            new_dist = distances[node] + weight
            
            if new_dist < distances.get(neighbor, float('inf')):
                distances[neighbor] = new_dist
                
                if weight == 0:
                    deque_bfs.appendleft(neighbor)  # Priority
                else:
                    deque_bfs.append(neighbor)
    
    return distances.get(end, -1)
```

---

# 7. Time Complexity Analysis

## 7.1 Graph Traversal Complexities

### BFS and DFS:

| Representation | Time | Space | Notes |
|---------------|------|-------|-------|
| **Adjacency List** | O(V + E) | O(V) | Most common |
| **Adjacency Matrix** | O(V²) | O(V) | Must check all entries |
| **Edge List** | O(V × E) | O(V) | Inefficient |

**Where:**
- V = number of vertices
- E = number of edges

### Breakdown:
```
BFS/DFS Time = O(V + E)

Why?
- Visit each vertex once: O(V)
- Explore each edge once (undirected: twice): O(E)
- Total: O(V + E)
```

## 7.2 Algorithm Complexities

| Algorithm | Time | Space | Notes |
|-----------|------|-------|-------|
| **DFS** | O(V+E) | O(V) | Recursion stack |
| **BFS** | O(V+E) | O(V) | Queue |
| **Topological Sort** | O(V+E) | O(V) | DFS or BFS based |
| **Union-Find** | O(E×α(V)) | O(V) | α ≈ constant |
| **Dijkstra** | O((V+E)logV) | O(V) | With binary heap |
| **Bellman-Ford** | O(V×E) | O(V) | V-1 iterations |
| **Floyd-Warshall** | O(V³) | O(V²) | All pairs |
| **Kruskal's MST** | O(ElogE) | O(V) | Sort edges |
| **Prim's MST** | O((V+E)logV) | O(V) | With binary heap |

## 7.3 Space Complexity Details

### DFS Space:
```
Recursive: O(h) where h = height
- Best case (balanced): O(log V)
- Worst case (linear): O(V)

Iterative: O(V) for explicit stack
```

### BFS Space:
```
O(w) where w = max width
- Best case (linear): O(1)
- Worst case (complete graph): O(V)

Practical: O(V)
```

### Additional Space:
```
Visited set: O(V)
Distance array: O(V)
Parent tracking: O(V)
Adjacency list: O(V + E)
Adjacency matrix: O(V²)
```

## 7.4 Complexity by Graph Density

### Sparse Graph (E ≈ V):
```
BFS/DFS: O(V + E) = O(V)
Dijkstra: O(V log V)
```

### Dense Graph (E ≈ V²):
```
BFS/DFS: O(V + E) = O(V²)
Dijkstra: O(V² log V)

Better to use adjacency matrix!
```

### Complete Graph (E = V²):
```
All algorithms become quadratic or worse
```

## 7.5 Practical Complexity Analysis

### Example: Number of Islands
```python
def num_islands(grid):
    rows, cols = len(grid), len(grid[0])
    # ... DFS implementation
```

**Analysis:**
- V = rows × cols (each cell is a vertex)
- E ≤ 4V (each cell has at most 4 neighbors)
- **Time:** O(rows × cols)
- **Space:** O(rows × cols) for visited set + recursion

### Example: Course Schedule
```python
def can_finish(numCourses, prerequisites):
    # Build graph: O(E)
    # Topological sort: O(V + E)
```

**Analysis:**
- V = numCourses
- E = len(prerequisites)
- **Time:** O(V + E)
- **Space:** O(V + E) for adjacency list

### Example: Network Delay Time (Dijkstra)
```python
def network_delay_time(times, n, k):
    # Dijkstra implementation
```

**Analysis:**
- V = n nodes
- E = len(times) edges
- **Time:** O((V + E) log V)
- **Space:** O(V + E)

## 7.6 Optimization Considerations

### When to Optimize:

| Constraint | Approach |
|------------|----------|
| V ≤ 100 | Any algorithm works |
| V ≤ 10,000 | O(V²) acceptable |
| V ≤ 100,000 | Need O(V log V) or O(V + E) |
| V > 1,000,000 | Need O(V) or better |

### Space Optimization:
- Use adjacency list for sparse graphs
- Use visited array instead of set for small V
- Iterative over recursive when possible

---

# 8. LIVE Problem Solving Patterns

## 8.1 Pattern 1: Connected Components

### Problem: Number of Connected Components
```python
def count_components(n, edges):
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    visited = set()
    count = 0
    
    def dfs(node):
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                dfs(neighbor)
    
    for node in range(n):
        if node not in visited:
            dfs(node)
            count += 1
    
    return count
```

---

### Problem: Friend Circles
```python
def find_circle_num(is_connected):
    n = len(is_connected)
    visited = set()
    count = 0
    
    def dfs(person):
        visited.add(person)
        for friend in range(n):
            if is_connected[person][friend] == 1 and friend not in visited:
                dfs(friend)
    
    for person in range(n):
        if person not in visited:
            dfs(person)
            count += 1
    
    return count
```

---

## 8.2 Pattern 2: Island Problems

### Problem: Surrounded Regions
Flip 'O's not connected to boundary to 'X'.

```python
def solve(board):
    if not board:
        return
    
    rows, cols = len(board), len(board[0])
    
    def dfs(r, c):
        if (r < 0 or r >= rows or c < 0 or c >= cols or
            board[r][c] != 'O'):
            return
        
        board[r][c] = 'T'  # Mark as boundary-connected
        dfs(r+1, c)
        dfs(r-1, c)
        dfs(r, c+1)
        dfs(r, c-1)
    
    # Mark all 'O's connected to boundary
    for r in range(rows):
        dfs(r, 0)
        dfs(r, cols-1)
    for c in range(cols):
        dfs(0, c)
        dfs(rows-1, c)
    
    # Flip remaining 'O's to 'X', restore 'T's to 'O'
    for r in range(rows):
        for c in range(cols):
            if board[r][c] == 'O':
                board[r][c] = 'X'
            elif board[r][c] == 'T':
                board[r][c] = 'O'
```

---

### Problem: Number of Distinct Islands
```python
def num_distinct_islands(grid):
    rows, cols = len(grid), len(grid[0])
    visited = set()
    islands = set()
    
    def dfs(r, c, r0, c0, shape):
        if (r < 0 or r >= rows or c < 0 or c >= cols or
            grid[r][c] == 0 or (r, c) in visited):
            return
        
        visited.add((r, c))
        shape.append((r - r0, c - c0))  # Relative position
        
        dfs(r+1, c, r0, c0, shape)
        dfs(r-1, c, r0, c0, shape)
        dfs(r, c+1, r0, c0, shape)
        dfs(r, c-1, r0, c0, shape)
    
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1 and (r, c) not in visited:
                shape = []
                dfs(r, c, r, c, shape)
                islands.add(tuple(shape))
    
    return len(islands)
```

---

## 8.3 Pattern 3: Shortest Path Problems

### Problem: Shortest Path in Binary Matrix
```python
def shortest_path_binary_matrix(grid):
    n = len(grid)
    
    if grid[0][0] == 1 or grid[n-1][n-1] == 1:
        return -1
    
    if n == 1:
        return 1
    
    visited = {(0, 0)}
    queue = deque([(0, 0, 1)])  # (row, col, distance)
    directions = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
    
    while queue:
        r, c, dist = queue.popleft()
        
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            
            if nr == n-1 and nc == n-1:
                return dist + 1
            
            if (0 <= nr < n and 0 <= nc < n and
                grid[nr][nc] == 0 and (nr, nc) not in visited):
                visited.add((nr, nc))
                queue.append((nr, nc, dist + 1))
    
    return -1
```

---

### Problem: Word Ladder
```python
def ladder_length(beginWord, endWord, wordList):
    if endWord not in wordList:
        return 0
    
    wordList = set(wordList)
    queue = deque([(beginWord, 1)])
    
    while queue:
        word, length = queue.popleft()
        
        if word == endWord:
            return length
        
        # Try all possible one-letter changes
        for i in range(len(word)):
            for c in 'abcdefghijklmnopqrstuvwxyz':
                next_word = word[:i] + c + word[i+1:]
                
                if next_word in wordList:
                    wordList.remove(next_word)
                    queue.append((next_word, length + 1))
    
    return 0
```

---

## 8.4 Pattern 4: Topological Sort Problems

### Problem: Course Schedule II
```python
def find_order(numCourses, prerequisites):
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

---

### Problem: Alien Dictionary
```python
def alien_order(words):
    graph = defaultdict(set)
    indegree = {c: 0 for word in words for c in word}
    
    # Build graph
    for i in range(len(words) - 1):
        w1, w2 = words[i], words[i + 1]
        min_len = min(len(w1), len(w2))
        
        # Check for invalid case
        if len(w1) > len(w2) and w1[:min_len] == w2[:min_len]:
            return ""
        
        for j in range(min_len):
            if w1[j] != w2[j]:
                if w2[j] not in graph[w1[j]]:
                    graph[w1[j]].add(w2[j])
                    indegree[w2[j]] += 1
                break
    
    # Topological sort
    queue = deque([c for c in indegree if indegree[c] == 0])
    order = []
    
    while queue:
        char = queue.popleft()
        order.append(char)
        
        for neighbor in graph[char]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    
    if len(order) < len(indegree):
        return ""  # Cycle detected
    
    return "".join(order)
```

---

## 8.5 Pattern 5: Union-Find Problems

### Problem: Accounts Merge
```python
def accounts_merge(accounts):
    email_to_name = {}
    graph = defaultdict(list)
    
    # Build graph
    for account in accounts:
        name = account[0]
        first_email = account[1]
        
        for email in account[1:]:
            graph[first_email].append(email)
            graph[email].append(first_email)
            email_to_name[email] = name
    
    # DFS to find connected components
    visited = set()
    result = []
    
    def dfs(email, component):
        visited.add(email)
        component.append(email)
        for neighbor in graph[email]:
            if neighbor not in visited:
                dfs(neighbor, component)
    
    for email in graph:
        if email not in visited:
            component = []
            dfs(email, component)
            result.append([email_to_name[email]] + sorted(component))
    
    return result
```

---

### Problem: Number of Provinces
```python
def find_circle_num(is_connected):
    n = len(is_connected)
    uf = UnionFind(n)
    
    for i in range(n):
        for j in range(i + 1, n):
            if is_connected[i][j] == 1:
                uf.union(i, j)
    
    return len(set(uf.find(i) for i in range(n)))
```

---

## 8.6 Pattern 6: Bipartite & Coloring

### Problem: Possible Bipartition
```python
def possible_bipartition(n, dislikes):
    graph = defaultdict(list)
    for u, v in dislikes:
        graph[u].append(v)
        graph[v].append(u)
    
    color = {}
    
    def dfs(node, c):
        color[node] = c
        for neighbor in graph[node]:
            if neighbor not in color:
                if not dfs(neighbor, 1 - c):
                    return False
            elif color[neighbor] == c:
                return False
        return True
    
    for node in range(1, n + 1):
        if node not in color:
            if not dfs(node, 0):
                return False
    
    return True
```

---

## 8.7 Pattern 7: Matrix/Grid Problems

### Problem: Rotting Oranges
```python
def oranges_rotting(grid):
    rows, cols = len(grid), len(grid[0])
    queue = deque()
    fresh = 0
    
    # Find all rotten oranges and count fresh
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                queue.append((r, c, 0))
            elif grid[r][c] == 1:
                fresh += 1
    
    if fresh == 0:
        return 0
    
    minutes = 0
    directions = [(0,1), (1,0), (0,-1), (-1,0)]
    
    while queue:
        r, c, minutes = queue.popleft()
        
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            
            if (0 <= nr < rows and 0 <= nc < cols and
                grid[nr][nc] == 1):
                grid[nr][nc] = 2
                fresh -= 1
                queue.append((nr, nc, minutes + 1))
    
    return minutes if fresh == 0 else -1
```

---

### Problem: Walls and Gates
```python
def walls_and_gates(rooms):
    if not rooms:
        return
    
    rows, cols = len(rooms), len(rooms[0])
    queue = deque()
    
    # Find all gates
    for r in range(rows):
        for c in range(cols):
            if rooms[r][c] == 0:
                queue.append((r, c))
    
    directions = [(0,1), (1,0), (0,-1), (-1,0)]
    
    while queue:
        r, c = queue.popleft()
        
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            
            if (0 <= nr < rows and 0 <= nc < cols and
                rooms[nr][nc] == 2147483647):
                rooms[nr][nc] = rooms[r][c] + 1
                queue.append((nr, nc))
```

---

## 8.8 Master Problem-Solving Checklist

```
□ UNDERSTAND THE GRAPH
  □ Directed or undirected?
  □ Weighted or unweighted?
  □ Dense or sparse?
  □ Can have cycles?

□ IDENTIFY THE PROBLEM TYPE
  □ Traversal? → DFS/BFS
  □ Shortest path? → BFS/Dijkstra
  □ Connectivity? → Union-Find/DFS
  □ Ordering? → Topological Sort
  □ Cycle? → DFS with colors

□ CHOOSE DATA STRUCTURE
  □ Adjacency list (most common)
  □ Adjacency matrix (dense)
  □ Edge list (MST)

□ PICK ALGORITHM
  □ Graph given explicitly? → Build and traverse
  □ Implicit graph? → Generate states
  □ Grid? → Treat as graph

□ HANDLE EDGE CASES
  □ Empty graph
  □ Single node
  □ Disconnected components
  □ Self-loops
  □ Duplicate edges

□ OPTIMIZE
  □ Early termination?
  □ Bidirectional search?
  □ Visited set?
```

---

# 📋 Quick Reference Card

## Graph Types Quick Reference

| Type | Edges | Use Case |
|------|-------|----------|
| **Undirected** | Bidirectional | Social networks |
| **Directed** | One-way | Dependencies |
| **Weighted** | With costs | Maps, networks |
| **DAG** | Directed, no cycles | Task scheduling |
| **Bipartite** | Two sets | Matching problems |

## Traversal Quick Reference

| Algorithm | Data Structure | Use For |
|-----------|---------------|---------|
| **BFS** | Queue | Shortest path, levels |
| **DFS** | Stack/Recursion | Cycles, paths, topology |

## Algorithm Selection Guide

| Problem | Algorithm | Time |
|---------|-----------|------|
| Unweighted shortest path | BFS | O(V+E) |
| Weighted shortest path | Dijkstra | O((V+E)logV) |
| Negative weights | Bellman-Ford | O(V×E) |
| Ordering with deps | Topological Sort | O(V+E) |
| Connectivity | Union-Find | O(E×α(V)) |
| Cycle detection | DFS | O(V+E) |
| Connected components | DFS/BFS | O(V+E) |

## Complexity Cheat Sheet

```
Sparse graph: E ≈ V → O(V+E) = O(V)
Dense graph: E ≈ V² → O(V+E) = O(V²)

DFS/BFS: O(V + E) time, O(V) space
Dijkstra: O((V + E) log V)
Union-Find: O(E × α(V)) ≈ O(E)
```

---

**🎯 You've mastered Graphs! These patterns will help you solve ANY graph problem in FAANG interviews!**

---

*End of Week 5: Graphs Complete Notes*
