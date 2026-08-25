# 312 – Level Order Traversal

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Level-order traversal visits tree nodes breadth-first, level by level. Uses a queue. Each level is processed as a batch by snapshotting `queue.length` before processing. Variations: zigzag, right side view, average of levels, maximum width.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
interface TreeNode { val: number; left: TreeNode | null; right: TreeNode | null; }

// Standard level order
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  while (queue.length) {
    const size = queue.length;
    const level: number[] = [];
    for (let i = 0; i < size; i++) {
      const node = queue.shift()!;
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}

// Zigzag level order
function zigzagLevelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const result: number[][] = [];
  const queue: TreeNode[] = [root];
  let leftToRight = true;
  while (queue.length) {
    const size = queue.length;
    const level: number[] = [];
    for (let i = 0; i < size; i++) {
      const node = queue.shift()!;
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(leftToRight ? level : level.reverse());
    leftToRight = !leftToRight;
  }
  return result;
}

// Right side view
function rightSideView(root: TreeNode | null): number[] {
  if (!root) return [];
  const result: number[] = [];
  const queue: TreeNode[] = [root];
  while (queue.length) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const node = queue.shift()!;
      if (i === size - 1) result.push(node.val); // last node in level
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  return result;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Level order uses BFS with queue. Key trick: snapshot queue.length at start of each level to know how many nodes belong to current level. Zigzag: alternate reverse. Right view: take last element per level."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Get components at each depth of component tree
interface Component { name: string; children: Component[]; }
function componentsByDepth(root: Component): string[][] {
  const result: string[][] = [];
  let queue = [root];
  while (queue.length) {
    result.push(queue.map(c => c.name));
    queue = queue.flatMap(c => c.children);
  }
  return result;
}
```

## 5. 🧠 MEMORY AID
**"Level order = BFS + snapshot queue.length per level. Variations: zigzag (alternate reverse), right view (last per level), width (first and last indices)."**

## 6. 🎯 COMPLEXITY
Time: O(n) | Space: O(w) where w = max width of tree
