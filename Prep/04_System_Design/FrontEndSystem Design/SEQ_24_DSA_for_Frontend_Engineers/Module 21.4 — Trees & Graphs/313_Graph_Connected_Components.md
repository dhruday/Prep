# 313 – Graph Connected Components

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Connected components are groups of nodes where every node is reachable from every other node in the group. Found using DFS/BFS from each unvisited node. Applications: number of islands, friend circles, network clusters. Union-Find is an alternative approach for dynamic connectivity.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// Count connected components in adjacency list
function countComponents(n: number, edges: [number, number][]): number {
  const graph = new Map<number, number[]>();
  for (let i = 0; i < n; i++) graph.set(i, []);
  for (const [u, v] of edges) { graph.get(u)!.push(v); graph.get(v)!.push(u); }

  const visited = new Set<number>();
  let components = 0;

  function dfs(node: number) {
    visited.add(node);
    for (const neighbor of graph.get(node)!) {
      if (!visited.has(neighbor)) dfs(neighbor);
    }
  }

  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) { dfs(i); components++; }
  }
  return components;
}

// Number of Islands (2D grid)
function numIslands(grid: string[][]): number {
  const rows = grid.length, cols = grid[0].length;
  let count = 0;

  function dfs(r: number, c: number) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '0'; // mark visited
    dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
  }

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] === '1') { dfs(r, c); count++; }
  return count;
}

// Union-Find (Disjoint Set)
class UnionFind {
  parent: number[];
  rank: number[];
  count: number;

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.count = n;
  }

  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]); // path compression
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const px = this.find(x), py = this.find(y);
    if (px === py) return;
    if (this.rank[px] < this.rank[py]) this.parent[px] = py;
    else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
    else { this.parent[py] = px; this.rank[px]++; }
    this.count--;
  }
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Connected components: iterate all nodes, DFS/BFS from unvisited ones, count groups. Number of islands: DFS on grid, mark visited by setting to 0. Union-Find: O(α(n)) per operation with path compression and union by rank."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Group related modules into chunks
function findModuleGroups(deps: [string, string][]): Set<string>[] {
  const graph = new Map<string, string[]>();
  for (const [a, b] of deps) {
    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);
    graph.get(a)!.push(b);
    graph.get(b)!.push(a);
  }
  const visited = new Set<string>();
  const groups: Set<string>[] = [];
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      const group = new Set<string>();
      const stack = [node];
      while (stack.length) {
        const n = stack.pop()!;
        if (visited.has(n)) continue;
        visited.add(n); group.add(n);
        stack.push(...(graph.get(n) || []));
      }
      groups.push(group);
    }
  }
  return groups;
}
```

## 5. 🧠 MEMORY AID
**"DFS/BFS from each unvisited node = one component per call. Islands = DFS on grid. Union-Find for dynamic connectivity (path compression + rank)."**

## 6. 🎯 COMPLEXITY
DFS/BFS: O(V + E) | Union-Find: O(α(n)) per operation ≈ O(1)
