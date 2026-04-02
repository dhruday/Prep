# 309 – Queue-Based BFS

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
BFS uses a queue (FIFO) to explore nodes level by level. Essential for: shortest path in unweighted graphs, level-order tree traversal, flood fill, word ladder, and DOM traversal. Pattern: enqueue start → while queue not empty → dequeue → process → enqueue neighbors.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// BFS Template
function bfs(graph: Map<string, string[]>, start: string): string[] {
  const visited = new Set<string>([start]);
  const queue: string[] = [start];
  const order: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return order;
}

// Level-order traversal with level tracking
interface TreeNode { val: number; left: TreeNode | null; right: TreeNode | null; }
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  while (queue.length > 0) {
    const levelSize = queue.length;
    const level: number[] = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}

// Shortest path in grid (0=open, 1=wall)
function shortestPath(grid: number[][], start: [number, number], end: [number, number]): number {
  const [rows, cols] = [grid.length, grid[0].length];
  const directions = [[0,1],[0,-1],[1,0],[-1,0]];
  const queue: [number, number, number][] = [[start[0], start[1], 0]];
  const visited = new Set<string>([`${start[0]},${start[1]}`]);
  while (queue.length > 0) {
    const [r, c, dist] = queue.shift()!;
    if (r === end[0] && c === end[1]) return dist;
    for (const [dr, dc] of directions) {
      const [nr, nc] = [r + dr, c + dc];
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc] && !visited.has(key)) {
        visited.add(key);
        queue.push([nr, nc, dist + 1]);
      }
    }
  }
  return -1;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"BFS explores level by level using a queue. Guarantees shortest path in unweighted graphs. Template: queue + visited set + process each level. For level tracking, use queue.length snapshot per iteration."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Find all child DOM elements at depth N
function getElementsAtDepth(root: Element, depth: number): Element[] {
  let queue: Element[] = [root];
  let currentDepth = 0;
  while (queue.length > 0 && currentDepth < depth) {
    const nextLevel: Element[] = [];
    for (const el of queue) {
      nextLevel.push(...Array.from(el.children));
    }
    queue = nextLevel;
    currentDepth++;
  }
  return queue;
}
```

## 5. 🧠 MEMORY AID
**"BFS = Queue. DFS = Stack/Recursion. BFS finds shortest path, processes level by level. Template: enqueue → dequeue → visit → enqueue neighbors."**

## 6. 🎯 COMPLEXITY
Time: O(V + E) | Space: O(V) for queue and visited set
