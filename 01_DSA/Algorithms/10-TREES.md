# Trees — 1-Hour Learning Module

> *"A tree is a graph that chose simplicity: one parent, no cycles. This simplicity is what makes trees so powerful — recursion flows naturally through them."*

**Total time: ~60 minutes**

---

## Table of Contents

1. [[0–10 min] Big Picture](#0-10-min-big-picture)
2. [[10–20 min] Mental Model](#10-20-min-mental-model)
3. [[20–35 min] Core Patterns](#20-35-min-core-patterns)
4. [[35–45 min] Concrete Code + Dry Run](#35-45-min-concrete-code--dry-run)
5. [[45–55 min] Pattern Recognition](#45-55-min-pattern-recognition)
6. [[55–60 min] Final Mental Checklist](#55-60-min-final-mental-checklist)
7. [Active Recall](#active-recall)
8. [Recommended Practice Direction](#recommended-practice-direction)
9. [2-Minute Cheat Sheet](#2-minute-cheat-sheet)
10. [Advanced Awareness](#advanced-awareness)

---

## [0–10 min] Big Picture

### What is a Tree and why does it exist?

A **binary tree** is a linked data structure where each node has at most two children (left and right). Trees exist because many real-world relationships are naturally hierarchical — and hierarchical structure eliminates the need to search everything linearly.

**The key property that makes trees powerful:** you can *divide* the problem at every node. Go left or go right. Recurse on the left half or the right half. This is why tree algorithms are almost always O(n) or O(h) — never O(n²).

### Real-world analogy

Think of a company org chart. The CEO is the root. Each manager is an internal node. Each individual contributor is a leaf. When you want to find someone, you don't check every employee — you narrow down by department (subtree), then team (subtree), then person. That narrowing-by-subtree is the essence of tree algorithms.

### Visual: anatomy of a binary tree

```
        1          ← root (depth 0)
       / \
      2   3        ← internal nodes (depth 1)
     / \    \
    4   5    6     ← leaves (depth 2)
```

**Key vocabulary:**
- **Root:** node with no parent (node 1)
- **Leaf:** node with no children (4, 5, 6)
- **Height of tree:** longest path from root to a leaf = 2 here
- **Height of a node:** longest path from that node to a leaf
- **Depth of a node:** distance from root to that node
- **Subtree:** a node and all its descendants

### Binary Search Tree (BST) — the most important variant

```
        4
       / \
      2   6
     / \ / \
    1  3 5  7
```

**The BST property:** for every node, all values in the left subtree are smaller, all values in the right subtree are larger. This ordering enables O(h) search instead of O(n).

---

## [10–20 min] Mental Model

### The single most important question for tree problems

> **"What information should this node receive from its children?"**

Every tree recursion follows this shape:
1. Ask left subtree for some information
2. Ask right subtree for some information
3. Combine that information to answer the question for the current node
4. Return the answer upward

This is **post-order reasoning**: you compute bottom-up, from leaves to root.

### The three traversal orders

```
        1
       / \
      2   3
     / \
    4   5
```

**Preorder (Root → Left → Right):** `1, 2, 4, 5, 3`
Read the node before descending. Useful for: copying a tree, serializing, top-down problems.

**Inorder (Left → Root → Right):** `4, 2, 5, 1, 3`
Read the node between subtrees. Critical insight: **inorder of a BST gives sorted order.**

**Postorder (Left → Right → Root):** `4, 5, 2, 3, 1`
Read the node after both subtrees. Useful for: bottom-up computations (height, diameter, balanced check).

### DFS vs BFS on trees

**DFS** (depth-first, via recursion or stack):
- Goes deep before wide
- Natural fit for: path problems, height/depth, LCA, anything recursive
- Space: O(h) — stack depth equals tree height

**BFS** (breadth-first, via queue):
- Goes level by level
- Natural fit for: level-order problems, minimum depth, right/left side view, width
- Space: O(w) — queue holds one level at a time (up to n/2 nodes for last level)

### How recursion flows through a tree

For this tree, tracing a simple height calculation:

```
        1
       / \
      2   3
     /
    4
```

```
height(1)
  ├─ calls height(2)
  │    ├─ calls height(4)
  │    │    ├─ calls height(null) → returns 0
  │    │    └─ calls height(null) → returns 0
  │    │    → returns 1 + max(0,0) = 1
  │    └─ calls height(null) → returns 0
  │    → returns 1 + max(1,0) = 2
  └─ calls height(3)
       ├─ calls height(null) → returns 0
       └─ calls height(null) → returns 0
       → returns 1 + max(0,0) = 1
  → returns 1 + max(2,1) = 3
```

Notice: **information flows up.** The node asks its children, not the other way around.

---

## [20–35 min] Core Patterns

### Pattern 1: The DFS Recursive Template

Every tree DFS follows this skeleton:

```
result = DFS(node):
    if node is null:
        return base_case

    left_info  = DFS(node.left)
    right_info = DFS(node.right)

    return combine(left_info, right_info, node.val)
```

The key decisions:
- What is the **base case** (null node)?
- What **information** do you collect from children?
- How do you **combine** it?

### Pattern 2: When to use DFS vs BFS on trees

| Use DFS when... | Use BFS when... |
|---|---|
| You need path info (root-to-leaf, any path) | You need level-by-level info |
| You need height, depth, or diameter | You need minimum depth (first leaf) |
| You need LCA | You need right/left side view |
| You need to check structural properties | You need maximum width |
| BST property is involved | Keywords: "level," "width," "side view" |

### Pattern 3: BST properties — use them aggressively

A BST is not just a binary tree. It has an ordering constraint you must exploit:

1. **Inorder = sorted order.** Kth smallest? Inorder and count. Validate BST? Inorder, check ascending.
2. **Search is O(h).** At each node, go left if target < node.val, right otherwise.
3. **LCA in BST is simpler.** Both nodes left of current? Go left. Both right? Go right. Split? Current is LCA.
4. **Trim BST to range [lo, hi].** If node.val < lo, the answer is in right subtree. If node.val > hi, it's in left subtree.

### Pattern 4: Post-order reasoning for bottom-up problems

Use **post-order** when the answer for a node depends on the answers from its subtrees.

**Height:** `height(node) = 1 + max(height(left), height(right))`

**Diameter (longest path between any two nodes):**

```
        1
       / \
      2   3
     / \
    4   5
```

At node 2: path through 2 = height(left) + height(right) = 1 + 1 = 2
At node 1: path through 1 = height(left subtree rooted at 2) + height(right subtree rooted at 3) = 2 + 1 = 3

Critical insight: **the diameter does not have to pass through the root.** You must track a global maximum across all nodes. The function returns height (not diameter) upward so the parent can compute its own path length.

**Balanced check:**
A tree is height-balanced if `|height(left) - height(right)| <= 1` for EVERY node (not just the root). Propagate -1 upward as a sentinel when any subtree is unbalanced.

### Pattern 5: Path sum problems

**Root-to-leaf path sum:** pass the remaining target downward. At a leaf, check if remaining == leaf.val.

**Any downward path with target sum (Path Sum III):** this is "subarray sum = K" adapted to trees.
- Maintain a running prefix sum from root to current node
- Use a HashMap: count of prefix sums seen so far
- At each node: check if (current_prefix - target) exists in the map
- **Backtrack:** remove current prefix from the map before returning

**Maximum path sum (any nodes, any direction):**
- At each node: the best single branch going down = max(left_branch, 0) + node.val (drop negative branches)
- The path through this node = left_branch + node.val + right_branch — update global max
- Return the single branch upward (you can only extend in one direction when going up)

### Pattern 6: LCA (Lowest Common Ancestor)

**Binary tree (general):** post-order search.
1. If current node is p or q, return current node
2. Recurse left and right
3. Both sides non-null? → current node is LCA
4. One side null? → return the other side

**BST:** use the ordering.
1. Both p,q < current → LCA is in left subtree
2. Both p,q > current → LCA is in right subtree
3. They straddle current (or one equals current) → current is LCA

**With parent pointers:** treat it like finding the intersection of two linked lists.
1. Find depths of p and q
2. Advance the deeper node up to match depth
3. Move both upward simultaneously until they meet

### Pattern 7: Serialize and Deserialize

**Preorder + null markers** is the standard approach:
- Serialize: preorder traversal, emit "null" for null children
- Deserialize: consume values in order; first value is root, recursively build left then right

**Why inorder alone is insufficient:** multiple different trees can produce the same inorder sequence. Preorder + null markers uniquely encodes the tree shape.

**BST special case:** preorder alone (without null markers) is sufficient because the BST constraint allows reconstruction — you know which values belong left vs right.

### Pattern 8: Construct Tree from Traversals

**Preorder + Inorder:**
- Preorder[0] = root
- Find root in inorder → everything left is left subtree, right is right subtree
- The size of the left inorder chunk tells you how many preorder values belong to the left subtree
- Recurse. Use a HashMap for O(1) inorder lookup (avoid O(n²))

**Postorder + Inorder:** same idea, but postorder[last] = root.

---

## [35–45 min] Concrete Code + Dry Run

### Node definition (used by all examples)

**Java:**
```java
class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}
```

**JavaScript:**
```javascript
class TreeNode {
    constructor(val) {
        this.val = val;
        this.left = null;
        this.right = null;
    }
}
```

---

### Example 1: Tree Height (post-order)

**Java:**
```java
int height(TreeNode node) {
    if (node == null) return 0;
    int left  = height(node.left);
    int right = height(node.right);
    return 1 + Math.max(left, right);
}
```

**JavaScript:**
```javascript
function height(node) {
    if (node === null) return 0;
    const left  = height(node.left);
    const right = height(node.right);
    return 1 + Math.max(left, right);
}
```

**Dry run on:**
```
    1
   / \
  2   3
 /
4
```

| Call | Returns |
|---|---|
| height(4) | 1 + max(0, 0) = 1 |
| height(2) | 1 + max(1, 0) = 2 |
| height(3) | 1 + max(0, 0) = 1 |
| height(1) | 1 + max(2, 1) = **3** |

**Complexity:** Time O(n), Space O(h)

---

### Example 2: Diameter of Binary Tree

The diameter is the longest path between any two nodes (may not pass through root).

**Java:**
```java
int maxDiameter = 0;

int diameter(TreeNode node) {
    if (node == null) return 0;
    int left  = diameter(node.left);
    int right = diameter(node.right);
    maxDiameter = Math.max(maxDiameter, left + right);
    return 1 + Math.max(left, right);
}
```

**JavaScript:**
```javascript
function diameterOfBinaryTree(root) {
    let maxDiameter = 0;

    function dfs(node) {
        if (node === null) return 0;
        const left  = dfs(node.left);
        const right = dfs(node.right);
        maxDiameter = Math.max(maxDiameter, left + right);
        return 1 + Math.max(left, right);
    }

    dfs(root);
    return maxDiameter;
}
```

**Dry run on:**
```
    1
   / \
  2   3
 / \
4   5
```

| Call | left | right | left+right (path at this node) | returns |
|---|---|---|---|---|
| dfs(4) | 0 | 0 | 0 | 1 |
| dfs(5) | 0 | 0 | 0 | 1 |
| dfs(2) | 1 | 1 | **2** | 2 |
| dfs(3) | 0 | 0 | 0 | 1 |
| dfs(1) | 2 | 1 | **3** | 3 |

maxDiameter = **3** (path 4→2→5 has length 2, path 4→2→1→3 has length 3)

**Key insight:** the function returns height (not diameter), so the parent can compute path lengths. The diameter is a side-effect tracked globally.

---

### Example 3: LCA of a Binary Tree (post-order search)

**Java:**
```java
TreeNode lca(TreeNode node, TreeNode p, TreeNode q) {
    if (node == null || node == p || node == q) return node;
    TreeNode left  = lca(node.left,  p, q);
    TreeNode right = lca(node.right, p, q);
    if (left != null && right != null) return node;
    return left != null ? left : right;
}
```

**JavaScript:**
```javascript
function lca(node, p, q) {
    if (node === null || node === p || node === q) return node;
    const left  = lca(node.left,  p, q);
    const right = lca(node.right, p, q);
    if (left !== null && right !== null) return node;
    return left !== null ? left : right;
}
```

**Dry run** — find LCA(4, 5) in:
```
    1
   / \
  2   3
 / \
4   5
```

- lca(4, p=4, q=5): node == p → return node 4
- lca(5, p=4, q=5): node == q → return node 5
- lca(2): left=4, right=5, both non-null → **return node 2**
- lca(3): left=null, right=null → return null
- lca(1): left=2, right=null → return 2 (bubble up)

Result: **node 2**

---

### Example 4: Level-Order Traversal (BFS)

**Java:**
```java
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int size = queue.size();
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left  != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        result.add(level);
    }
    return result;
}
```

**JavaScript:**
```javascript
function levelOrder(root) {
    const result = [];
    if (root === null) return result;
    const queue = [root];
    while (queue.length > 0) {
        const size = queue.length;
        const level = [];
        for (let i = 0; i < size; i++) {
            const node = queue.shift();
            level.push(node.val);
            if (node.left)  queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        result.push(level);
    }
    return result;
}
```

**Dry run on:**
```
    1
   / \
  2   3
 / \
4   5
```

| Iteration | Queue entering loop | size | Level processed | Queue after |
|---|---|---|---|---|
| 1 | [1] | 1 | [1] | [2, 3] |
| 2 | [2, 3] | 2 | [2, 3] | [4, 5] |
| 3 | [4, 5] | 2 | [4, 5] | [] |

Result: `[[1], [2, 3], [4, 5]]`

**Why `size = queue.size()` before the inner loop?** This snapshot freezes the current level's count. Without it, newly enqueued children would blur the level boundary.

---

### Example 5: Path Sum III (prefix sum on trees)

**Java:**
```java
int pathSum(TreeNode root, int target) {
    Map<Long, Integer> prefixCounts = new HashMap<>();
    prefixCounts.put(0L, 1);
    return dfs(root, 0L, target, prefixCounts);
}

int dfs(TreeNode node, long curr, int target, Map<Long, Integer> map) {
    if (node == null) return 0;
    curr += node.val;
    int count = map.getOrDefault(curr - target, 0);
    map.merge(curr, 1, Integer::sum);
    count += dfs(node.left,  curr, target, map);
    count += dfs(node.right, curr, target, map);
    map.merge(curr, -1, Integer::sum);
    return count;
}
```

**JavaScript:**
```javascript
function pathSum(root, target) {
    const map = new Map([[0, 1]]);

    function dfs(node, curr) {
        if (node === null) return 0;
        curr += node.val;
        let count = map.get(curr - target) || 0;
        map.set(curr, (map.get(curr) || 0) + 1);
        count += dfs(node.left,  curr);
        count += dfs(node.right, curr);
        map.set(curr, map.get(curr) - 1);
        return count;
    }

    return dfs(root, 0);
}
```

**The backtrack line** (`map.merge(curr, -1, ...)`) is critical: it removes the current node's prefix sum from the map before returning to the parent, so sibling subtrees don't see it.

---

## [45–55 min] Pattern Recognition

### How to recognize tree problems

When you see these keywords, think trees:
- "binary tree," "BST," "root," "node," "leaf," "subtree," "ancestor"
- "traverse," "path," "depth," "height," "level," "width"

### Decision tree for approach selection

```
Is the problem about levels / side views / width?
  YES → BFS (level-order)
  NO  → DFS

Is DFS the right choice?
  Does the answer depend on subtree results? → Post-order
  Do I need to pass info from parent to child? → Pre-order
  Is it a BST and do I need sorted order? → Inorder

Is it a path problem?
  Root-to-leaf? → Pass remaining sum downward (preorder)
  Any downward path? → Prefix sum + HashMap (backtrack on exit)
  Any path (can go up)? → Max single branch, global max (postorder)

Is it a BST problem?
  Exploit left < node < right at every step
  Search/LCA/trim: O(h) by choosing one child
  Inorder for sorted order
```

### What to ask yourself when you see a tree problem

1. **Is it a BST?** If yes, can I exploit the ordering property?
2. **Top-down or bottom-up?** Do I need parent info to solve children, or child info to solve parent?
3. **What does each recursive call return?** This is the hardest part. Think carefully.
4. **Is there a global state** (diameter, max path sum) vs a **local return value** (height)?
5. **Do I need level info?** → BFS. Otherwise → DFS.
6. **Can negative values appear?** This affects path sum problems (don't drop a branch just because it's small).

### Common traps

| Trap | Correct approach |
|---|---|
| Diameter passes through root | Diameter can be in any subtree. Track global max. |
| Balanced check only at root | Every node must be balanced. Propagate -1 upward as sentinel. |
| O(n) inorder lookup in tree construction | Use HashMap for O(1) index lookup. |
| Path Sum III without backtracking | Backtrack the prefix map on exit or siblings will see stale values. |
| Max path sum: keep negative branches | Drop negative branches with max(..., 0). |
| Serialization: inorder without null markers | Inorder alone is ambiguous. Use preorder + null markers. |
| BFS width: integer overflow on node indices | Normalize indices at each level start. |
| LCA: assuming both nodes exist | Confirm with interviewer. If not guaranteed, add existence check. |

### Recursive vs iterative on trees

**Recursive** is natural and preferred for most tree problems. Use it by default.

**Iterative inorder** is a key pattern: push all left children onto stack, then pop → process → push all left children of right child.

**Iterative postorder** is the hardest: use two stacks or a "last visited" tracker. Know it exists; implement it only if asked.

**Morris traversal** achieves O(1) space by threading predecessor pointers temporarily. Mention it as a follow-up when asked about O(1) space traversal.

---

## [55–60 min] Final Mental Checklist

Before you write a single line of code on a tree problem:

- [ ] Is it a BST? Can I exploit the ordering?
- [ ] What does my recursive function return? Write the return type and meaning explicitly.
- [ ] Base case: what does null return?
- [ ] Am I bottom-up (post-order) or top-down (pre-order)?
- [ ] Do I need a global variable (diameter, max path) alongside local returns?
- [ ] Is there backtracking needed? (Path Sum III, all-paths problems)
- [ ] Is BFS a better fit? (level info, minimum depth, width, side view)
- [ ] Can I exploit BST property to avoid a full O(n) scan?
- [ ] Watch for: negative values in path problems, both nodes not guaranteed to exist for LCA, integer overflow in BFS width

---

## Active Recall

Test yourself before moving on. Cover the answers and answer out loud or in writing.

1. What are the three DFS traversal orders? What is each used for?
2. What is the key property of inorder traversal on a BST?
3. What single question should you ask yourself to design any tree recursive function?
4. Why does the diameter function return height rather than the diameter itself?
5. How does BFS level-order work? Why do you snapshot `queue.size()` before the inner loop?
6. Explain the prefix sum + HashMap technique for Path Sum III. Why must you backtrack?
7. How does LCA work on a general binary tree? What does it mean when both subtrees return non-null?
8. How is LCA on a BST simpler than on a general binary tree?
9. Why is inorder serialization alone insufficient to uniquely reconstruct a binary tree?
10. What is Morris traversal and when would you mention it in an interview?

---

## Recommended Practice Direction

Work through problems roughly in this order:

**Warm-up (traversals + height):**
- Binary Tree Inorder Traversal (iterative)
- Maximum Depth of Binary Tree
- Symmetric Tree

**Core patterns:**
- Diameter of Binary Tree
- Balanced Binary Tree
- Path Sum II (backtracking)
- Binary Tree Level Order Traversal
- Binary Tree Right Side View

**Medium difficulty:**
- Lowest Common Ancestor of a Binary Tree
- Path Sum III (prefix sum + HashMap)
- Validate Binary Search Tree
- Kth Smallest Element in a BST
- Binary Tree Maximum Path Sum

**Harder:**
- Serialize and Deserialize Binary Tree
- Construct Binary Tree from Preorder and Inorder Traversal
- BST Iterator
- Maximum Width of Binary Tree

**BST cluster:** after mastering general trees, do a focused pass on BST problems using the ordering property: search, insert, delete, validate, trim, convert sorted array to BST.

---

## 2-Minute Cheat Sheet

```
TRAVERSAL ORDERS
  Preorder  (NLR): node → left → right   [top-down, copy, serialize]
  Inorder   (LNR): left → node → right   [BST sorted order]
  Postorder (LRN): left → right → node   [bottom-up: height, diameter, balanced]

RECURSION TEMPLATE
  f(node):
    if null: return base_case
    left  = f(node.left)
    right = f(node.right)
    return combine(left, right, node.val)

DFS vs BFS
  DFS: path, height, LCA, structural checks, BST
  BFS: levels, side views, width, min depth

BST PROPERTIES
  left < node < right (use to narrow search to one subtree)
  Inorder = sorted order

KEY PATTERNS
  Height:          1 + max(left, right)
  Diameter:        max(left + right) globally, return height locally
  Balanced:        return -1 as sentinel for unbalanced subtree
  LCA (general):   post-order, both sides non-null → current is LCA
  LCA (BST):       both < node → left; both > node → right; split → current
  Path Sum III:    prefix sum + HashMap, backtrack on exit
  Max Path Sum:    drop negative branches (max with 0), global max
  Serialize:       preorder + "null" markers
  Reconstruct:     preorder[0]=root, split inorder, HashMap for O(1) lookup

COMPLEXITIES
  Most DFS problems:    Time O(n), Space O(h)
  BST operations:       Time O(h) = O(log n) balanced, O(n) skewed
  Level-order (BFS):    Time O(n), Space O(w) max width
  Tree construction:    Time O(n) with HashMap, O(n²) without
```

---

## Advanced Awareness

These topics appear in harder interviews. You don't need to implement them from memory today, but knowing they exist and roughly how they work is valuable.

**Morris Traversal:** inorder traversal in O(1) space by temporarily threading the rightmost predecessor of each left subtree back to the current node. Modifies the tree during traversal and restores it. Time O(n), Space O(1). Useful to mention as a follow-up when asked about O(1) space traversal.

**Binary Lifting for LCA:** when you need to answer many LCA queries efficiently. Preprocessing: for each node, store its 1st, 2nd, 4th, 8th... ancestor. Build in O(n log n). Each LCA query: O(log n). Used in competitive programming; worth knowing the concept for system design discussions about hierarchical data.

**Vertical Order Traversal:** assign column numbers (root=0, left child=col-1, right child=col+1). Group nodes by column, sort within each column by (row, value). BFS naturally handles row ordering. Time O(n log n) due to sorting within columns.

**Boundary Traversal:** three-pass approach — left boundary excluding leaves (top-down), all leaves (left-to-right), right boundary excluding leaves (bottom-up).

**BST Iterator (pausable traversal):** use a stack to hold the "frontier" of an iterative inorder traversal. `next()`: pop, push all left children of the popped node's right child. Amortized O(1) per call, O(h) space. The stack state represents the "paused" position.

**Segment Trees / Fenwick Trees:** different kind of tree used for range query problems. Not a binary search tree; conceptually separate topic.

**AVL Trees / Red-Black Trees:** self-balancing BSTs that maintain O(log n) height via rotations. Rarely implemented in interviews; know that they exist and guarantee O(log n) operations.

---

*Next: [11-GRAPHS.md](11-GRAPHS.md) — Trees generalized: cycles allowed, no parent constraint. The richest and most diverse algorithmic playground.*
