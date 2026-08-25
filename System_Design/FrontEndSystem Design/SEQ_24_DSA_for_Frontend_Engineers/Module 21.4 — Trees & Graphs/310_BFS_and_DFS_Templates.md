# 310 – BFS and DFS Templates

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
BFS (Breadth-First Search) explores level by level using a queue. DFS (Depth-First Search) goes as deep as possible before backtracking using recursion or an explicit stack. Both visit every node once: O(V+E). BFS finds shortest path; DFS is simpler for connected components, cycle detection, and topological sort.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
type Graph = Map<string, string[]>;

// ──── DFS TEMPLATES ────

// Recursive DFS
function dfsRecursive(graph: Graph, node: string, visited = new Set<string>()): string[] {
  if (visited.has(node)) return [];
  visited.add(node);
  const result = [node];
  for (const neighbor of graph.get(node) || []) {
    result.push(...dfsRecursive(graph, neighbor, visited));
  }
  return result;
}

// Iterative DFS (using stack)
function dfsIterative(graph: Graph, start: string): string[] {
  const visited = new Set<string>();
  const stack = [start];
  const result: string[] = [];
  while (stack.length) {
    const node = stack.pop()!;
    if (visited.has(node)) continue;
    visited.add(node);
    result.push(node);
    for (const neighbor of (graph.get(node) || []).reverse()) {
      stack.push(neighbor);
    }
  }
  return result;
}

// ──── BFS TEMPLATE ────
function bfs(graph: Graph, start: string): string[] {
  const visited = new Set<string>([start]);
  const queue = [start];
  const result: string[] = [];
  while (queue.length) {
    const node = queue.shift()!;
    result.push(node);
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return result;
}

// ──── BFS WITH LEVEL TRACKING ────
function bfsLevels(graph: Graph, start: string): string[][] {
  const visited = new Set<string>([start]);
  let queue = [start];
  const levels: string[][] = [];
  while (queue.length) {
    levels.push([...queue]);
    const next: string[] = [];
    for (const node of queue) {
      for (const neighbor of graph.get(node) || []) {
        if (!visited.has(neighbor)) { visited.add(neighbor); next.push(neighbor); }
      }
    }
    queue = next;
  }
  return levels;
}

// ──── WHEN TO USE WHICH ────
// BFS: shortest path, level-order, closest node
// DFS: all paths, connected components, cycle detection, topological sort
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"DFS uses recursion/stack, goes deep first — use for connected components, cycle detection, topological sort. BFS uses queue, goes wide first — use for shortest path, level-order. Both O(V+E)."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: DFS to find all focusable elements in DOM tree
function findFocusable(root: Element): Element[] {
  const focusable: Element[] = [];
  const stack: Element[] = [root];
  while (stack.length) {
    const el = stack.pop()!;
    if ((el as HTMLElement).tabIndex >= 0) focusable.push(el);
    for (let i = el.children.length - 1; i >= 0; i--) stack.push(el.children[i]);
  }
  return focusable;
}
```

## 5. 🧠 MEMORY AID
**"DFS = Stack/Recursion → go deep. BFS = Queue → go wide. DFS for 'find all'. BFS for 'find shortest'. Both O(V+E)."**

## 6. 🎯 COMPLEXITY
Time: O(V + E) | Space: O(V)
