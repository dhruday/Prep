# 311 – Binary Tree Traversals

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Three traversal orders: **Inorder** (Left→Root→Right, gives sorted order for BST), **Preorder** (Root→Left→Right, serialization), **Postorder** (Left→Right→Root, deletion/evaluation). Each can be done recursively or iteratively with a stack.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
interface TreeNode { val: number; left: TreeNode | null; right: TreeNode | null; }

// ──── RECURSIVE ────
function inorder(root: TreeNode | null): number[] {
  if (!root) return [];
  return [...inorder(root.left), root.val, ...inorder(root.right)];
}

function preorder(root: TreeNode | null): number[] {
  if (!root) return [];
  return [root.val, ...preorder(root.left), ...preorder(root.right)];
}

function postorder(root: TreeNode | null): number[] {
  if (!root) return [];
  return [...postorder(root.left), ...postorder(root.right), root.val];
}

// ──── ITERATIVE INORDER (Morris or Stack) ────
function inorderIterative(root: TreeNode | null): number[] {
  const result: number[] = [];
  const stack: TreeNode[] = [];
  let curr = root;
  while (curr || stack.length) {
    while (curr) { stack.push(curr); curr = curr.left; }
    curr = stack.pop()!;
    result.push(curr.val);
    curr = curr.right;
  }
  return result;
}

// ──── ITERATIVE PREORDER ────
function preorderIterative(root: TreeNode | null): number[] {
  if (!root) return [];
  const result: number[] = [];
  const stack = [root];
  while (stack.length) {
    const node = stack.pop()!;
    result.push(node.val);
    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
  }
  return result;
}

// ──── COMMON INTERVIEW PROBLEMS ────
// Max depth
function maxDepth(root: TreeNode | null): number {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

// Is BST valid
function isValidBST(root: TreeNode | null, min = -Infinity, max = Infinity): boolean {
  if (!root) return true;
  if (root.val <= min || root.val >= max) return false;
  return isValidBST(root.left, min, root.val) && isValidBST(root.right, root.val, max);
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Inorder for sorted BST traversal, preorder for serialization, postorder for deletion. Iterative inorder: push all left nodes, pop and process, go right. Max depth, valid BST are the most common tree problems."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Traverse component tree for debugging
interface ComponentNode { name: string; props: Record<string, unknown>; children: ComponentNode[]; }
function listComponents(root: ComponentNode): string[] {
  const result = [root.name];
  for (const child of root.children) result.push(...listComponents(child));
  return result;
}
```

## 5. 🧠 MEMORY AID
**"In = L-Root-R (sorted BST). Pre = Root-L-R (serialize). Post = L-R-Root (delete). Iterative inorder: push all left → pop → go right."**

## 6. 🎯 COMPLEXITY
Time: O(n) | Space: O(h) recursion stack, O(n) worst case
