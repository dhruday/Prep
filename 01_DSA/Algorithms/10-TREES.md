# Trees — Complete Pattern Guide

> *"A tree is a graph that chose simplicity: one parent, no cycles. This simplicity is what makes trees so powerful — recursion flows naturally through them."*

---

## Table of Contents

1. [Binary Tree Traversals](#binary-tree-traversals)
2. [Level-Order Traversal (BFS)](#level-order-traversal-bfs)
3. [BST Operations](#bst-operations)
4. [Lowest Common Ancestor (LCA)](#lowest-common-ancestor-lca)
5. [Tree Dimensions (Height, Diameter, Balanced)](#tree-dimensions-height-diameter-balanced)
6. [Path Sum Patterns](#path-sum-patterns)
7. [Serialize and Deserialize](#serialize-and-deserialize)
8. [Construct Tree from Traversals](#construct-tree-from-traversals)
9. [Morris Traversal](#morris-traversal)
10. [Vertical and Boundary Traversal](#vertical-and-boundary-traversal)
11. [BST Iterator](#bst-iterator)

---

## Binary Tree Traversals

### What is this approach?

**Intuition:** Three ways to visit every node in a binary tree, differing in WHEN you process the current node relative to its children. Think of it as: "When do I read the chapter title — before, between, or after reading the subchapters?"

**Formal:**
- **Preorder (NLR):** Process node, then left subtree, then right subtree
- **Inorder (LNR):** Process left subtree, then node, then right subtree
- **Postorder (LRN):** Process left subtree, then right subtree, then node

### When should I use this?

| Traversal | Use Case |
|---|---|
| **Preorder** | Copy a tree, serialize, prefix expression, build from top-down |
| **Inorder** | BST gives sorted order, kth smallest in BST |
| **Postorder** | Delete tree, evaluate expression tree, bottom-up computation (height, size) |

### Core Idea

**Recursive:** Trivial — call left, process node, call right (adjust order for pre/post).

**Iterative Inorder:**
1. Push all left children onto stack
2. Pop → process → move to right child → push all its left children
3. Repeat until stack empty and no right child

**Iterative Preorder:**
1. Push root. While stack not empty: pop, process, push right then left (left on top)

**Iterative Postorder:**
1. Tricky. Use two stacks, OR use one stack with a "last visited" tracker

### Complexity

- **Time:** O(n) — visit every node once
- **Space:** O(h) where h = height (O(n) worst case skewed, O(log n) balanced)

### Variants

- **Inorder of BST = sorted order:** The #1 BST property
- **Kth Smallest in BST:** Inorder traversal, count to K
- **Validate BST:** Inorder — each value must be > previous
- **Flatten Binary Tree to Linked List:** Preorder traversal, then link nodes

### Interview Insights

- **Trap:** Iterative postorder is the hardest to implement. Practice it.
- **Twist:** "Iterative inorder of BST" is a building block for BST Iterator (see below).
- **Follow-up:** "Can you do it in O(1) space?" → Morris Traversal.

---

## Level-Order Traversal (BFS)

### What is this approach?

**Intuition:** Visit the tree level by level, like reading a spreadsheet row by row. Use a queue: process all nodes at the current level, enqueue their children for the next level.

### When should I use this?

- "Level-order traversal"
- "Zigzag level-order"
- "Right side view" / "Left side view"
- "Maximum width of binary tree"
- "Minimum depth"
- Keywords: "level," "breadth-first," "right view," "width"

### Core Idea

1. Enqueue root
2. While queue not empty:
   - level_size = queue.size()
   - For i in 0..level_size-1:
     - Dequeue node, process it
     - Enqueue left and right children
3. Each iteration of the outer loop = one level

### Complexity

- **Time:** O(n)
- **Space:** O(w) where w = maximum width of tree (up to n/2 for last level of complete tree)

### Variants

- **Zigzag Level Order:** Alternate left-to-right and right-to-left per level
- **Right Side View:** Take the last node of each level
- **Average of Levels:** Sum each level, divide by count
- **Maximum Width:** Track node positions (index left child = 2i+1, right = 2i+2). Width = rightmost - leftmost + 1 per level.
- **Minimum Depth:** First leaf node encountered in BFS = minimum depth

### Interview Insights

- **Trap:** Maximum Width — node positions can overflow. Normalize by subtracting the leftmost position at each level.
- **Twist:** "N-ary tree level order" — Same approach, just enqueue all children.

---

## BST Operations

### What is this approach?

**Intuition:** A BST is a binary tree where left < node < right. This ordering enables efficient search by always choosing one child (like binary search on a linked structure).

### When should I use this?

- "Search for a value in a BST"
- "Insert/Delete in a BST"
- "Validate if a tree is a BST"
- "Trim a BST to a range"
- Keywords: "BST," "binary search tree," "validate," "insert," "delete"

### Core Idea

**Search:** Compare target with current node. Go left if smaller, right if larger. O(h) time.

**Insert:** Search for the position where the key should be. Insert as a leaf.

**Delete:** Three cases:
1. Node is a leaf: remove directly
2. Node has one child: replace node with its child
3. Node has two children: replace with inorder successor (smallest in right subtree) or predecessor (largest in left subtree). Delete that successor/predecessor.

**Validate BST:**
- Maintain a valid range [min, max] for each node
- Root: [-∞, ∞]. Left child of node with value v: [-∞, v). Right child: (v, ∞).
- OR: Inorder traversal, checking each value is > previous

**Trim BST to range [lo, hi]:**
- If node.val < lo: trim right subtree (left subtree is all < lo)
- If node.val > hi: trim left subtree
- Else: recursively trim both subtrees

### Complexity

- **Time:** O(h) per operation (O(log n) balanced, O(n) skewed)
- **Space:** O(h) for recursion

### Interview Insights

- **Trap:** Delete with two children. The inorder successor approach is standard but easy to mess up. Practice the pointer manipulation.
- **Twist:** "Convert sorted array to BST" — Pick middle as root, recurse on left and right halves. O(n).
- **Follow-up:** "What about self-balancing BSTs?" — Mention AVL/Red-Black trees conceptually. Rarely need to implement in interviews.

---

## Lowest Common Ancestor (LCA)

### What is this approach?

**Intuition:** Two people start at different nodes and walk toward the root. The first node where their paths converge is the LCA. Alternatively: from the root, the LCA is the deepest node that is an ancestor of both.

### When should I use this?

- "Find lowest common ancestor of two nodes"
- "Distance between two nodes" (= depth(a) + depth(b) - 2 × depth(LCA))
- Keywords: "LCA," "common ancestor," "lowest ancestor"

### Core Idea

**Binary Tree (general):**
1. Recursively check left and right subtrees
2. If current node is p or q, return current node
3. If left returns non-null and right returns non-null → current node is LCA
4. If one side is null, return the other

**BST (optimized):**
1. If both p and q are smaller than current → go left
2. If both are larger → go right
3. Otherwise → current node is LCA (the paths diverge here)

**With Parent Pointers:**
1. Find depths of p and q
2. Move the deeper one up to match depths
3. Move both up simultaneously until they meet = LCA

### Complexity

- **Binary Tree LCA:** O(n) time, O(h) space
- **BST LCA:** O(h) time, O(h) or O(1) space (iterative)
- **Parent Pointer LCA:** O(h) time, O(1) space

### Variants

- **LCA in Binary Tree:** Standard recursive
- **LCA in BST:** Use sorted property
- **LCA with Parent Pointers:** Two-pointer technique (like linked list intersection)
- **LCA for N-ary Tree:** Same recursive approach, but check all children
- **LCA Queries (many queries):** Preprocess with Binary Lifting (O(n log n) build, O(log n) per query)

### Interview Insights

- **Trap:** The recursive binary tree LCA assumes both p and q exist in the tree. If one might not exist, you need an additional check.
- **Twist:** "What if the tree has parent pointers?" — Use the linked-list intersection technique.

---

## Tree Dimensions (Height, Diameter, Balanced)

### What is this approach?

**Intuition:** These are bottom-up computations. Start at the leaves (height 0), and build upward: parent's height = 1 + max of children's heights.

### Core Ideas

**Height:**
- height(node) = 1 + max(height(left), height(right))
- Base: height(null) = 0 (or -1, depending on convention)

**Diameter (longest path between any two nodes):**
- At each node: path through this node = height(left) + height(right)
- Update global max with this value
- Return height upward (not diameter — avoid the common mistake)

**Balanced Check:**
- A tree is balanced if |height(left) - height(right)| ≤ 1 for EVERY node
- Compute height bottom-up; return -1 if any subtree is unbalanced

### Complexity

- **Time:** O(n) for all (single DFS pass)
- **Space:** O(h) recursion

### Interview Insights

- **Trap:** Diameter — the diameter does NOT have to pass through the root. It can be in any subtree. You must track the global maximum across all nodes.
- **Trap:** Balanced check — checking only root's children is not enough. EVERY node must be balanced.

---

## Path Sum Patterns

### What is this approach?

**Intuition:** Walk from root to leaf (or any node to any other), accumulating a sum. Check if the sum matches a target.

### Variants

**Path Sum (root-to-leaf, exact target):**
- Subtract current value from target. At leaf, check if remaining = 0.

**Path Sum II (return all root-to-leaf paths with target):**
- Backtracking: maintain current path list, add paths when leaf matches.

**Path Sum III (any-to-any downward path with target):**
- Use the prefix sum + HashMap technique ON TREES
- Track prefix sum from root. At each node, check if (current_prefix - target) exists in the HashMap
- Backtrack: remove current prefix from HashMap when returning

**Binary Tree Maximum Path Sum (any nodes, not just downward):**
- At each node: max single branch = max(left_branch, right_branch, 0) + node.val
- Update global max with left_branch + node.val + right_branch
- Return single branch upward

### Complexity

- **Time:** O(n) for all variants
- **Space:** O(h) for recursion + O(n) for HashMap in Path Sum III

### Interview Insights

- **Trap:** Path Sum III — this is the "subarray sum = K" pattern adapted to trees. The HashMap + prefix sum technique is the key.
- **Trap:** Maximum Path Sum — negative branches should be dropped (take max with 0). And the "both branches" case updates the global max but cannot be returned upward.

---

## Serialize and Deserialize

### What is this approach?

**Intuition:** Convert a tree to a string (serialize) and back again (deserialize). Like saving and loading a game.

### Core Idea

**Preorder + Null Markers:**
1. Serialize: Preorder traversal, output each node's value. Output "null" for null children.
2. Deserialize: Read values in order. First value is root. Recursively build left subtree (consuming values until "null"), then right subtree.

**Level-Order (BFS):**
1. Serialize: BFS, output each level. Output "null" for null children of non-null nodes.
2. Deserialize: BFS, read values and link children.

### Complexity

- **Time:** O(n)
- **Space:** O(n) for the string

### Interview Insights

- **Trap:** The serialized format must unambiguously represent the tree. Inorder alone is NOT sufficient (many trees have the same inorder). Preorder + null markers is the standard approach.
- **Twist:** "What about BST specifically?" — Preorder alone (without null markers) is sufficient because BST property constrains reconstruction.

---

## Construct Tree from Traversals

### What is this approach?

**Intuition:** Given two traversals, you can reconstruct the original tree because they encode different information. Inorder tells you left vs right subtree. Preorder/postorder tells you the root.

### Core Idea

**From Preorder + Inorder:**
1. Preorder's first element = root
2. Find root's position in inorder → everything left of it is left subtree, right is right subtree
3. Recursively construct left and right subtrees

**From Postorder + Inorder:**
1. Postorder's last element = root
2. Same inorder splitting logic
3. Build right subtree first (postorder processes right before left from the end)

**From Preorder + Postorder (only for full binary trees):**
1. Preorder's first = root, second = left subtree's root
2. Find left root in postorder to determine left subtree size
3. Split and recurse

### Complexity

- **Time:** O(n) with HashMap for inorder index lookup; O(n²) without
- **Space:** O(n)

### Interview Insights

- **Trap:** Using O(n) search for root's inorder position each time → O(n²). Use a HashMap (value → index).
- **Twist:** "What if there are duplicates?" — Cannot uniquely reconstruct. Clarify with interviewer.

---

## Morris Traversal

### What is this approach?

**Intuition:** Traverse the tree without recursion and without a stack — O(1) extra space. The trick: temporarily create "threads" (links) from the rightmost node of left subtrees back to their predecessors. Follow these threads to return upward without a stack.

### When should I use this?

- "Traverse in O(1) space"
- When stack space is a concern
- "Flatten BST to sorted linked list in-place"

### Core Idea (Inorder)

1. current = root
2. While current is not null:
   - If current has no left child: process current, move right
   - Else: find the inorder predecessor (rightmost node of left subtree)
     - If predecessor's right is null: create thread (predecessor.right = current), move left
     - If predecessor's right is current: remove thread, process current, move right

### Complexity

- **Time:** O(n) — each edge is traversed at most twice (once to create thread, once to remove)
- **Space:** O(1) — no stack, no recursion

### Interview Insights

- **Trap:** Morris modifies the tree temporarily. Must restore afterward.
- **Note:** Impressive to mention in interviews but rarely required. Shows deep understanding.

---

## Vertical and Boundary Traversal

### What is this approach?

**Vertical Order Traversal:**
- Assign each node a column number (root = 0, left child = col-1, right = col+1)
- Group nodes by column, sort within each column by row then value
- BFS or DFS with column tracking + sorting

**Boundary Traversal:**
- Left boundary (excluding leaves), leaf nodes (left to right), right boundary (bottom to top, excluding leaves)
- Often a three-pass DFS/BFS approach

### Complexity

- **Time:** O(n log n) for vertical (due to sorting within columns); O(n) for boundary
- **Space:** O(n)

### Interview Insights

- **Trap:** Vertical Order — when two nodes share the same (row, col), sort by value. BFS processes level-by-level, which handles row ordering naturally.
- **Twist:** "What about boundary with only left boundary?" — Simpler. DFS down the leftmost path (skip leaves).

---

## BST Iterator

### What is this approach?

**Intuition:** Provide a "pause-and-resume" inorder traversal. Each call to `next()` returns the next smallest element. Internally, this is an iterative inorder traversal that yields one node at a time.

### Core Idea

1. Use a stack. Push all left children of root initially.
2. `next()`: Pop top (smallest), push all left children of its right child. Return popped value.
3. `hasNext()`: Stack is not empty.

### Complexity

- **Time:** O(1) average per call (amortized — each node pushed and popped once)
- **Space:** O(h) for the stack

### Interview Insights

- **Trap:** This is a "controlled" inorder traversal. The stack state represents the "paused" position.
- **Twist:** "What if you need prev() too?" — Then you need a doubly-linked list or two stacks.

---

*Next: [11-GRAPHS.md](11-GRAPHS.md) — The richest and most diverse algorithmic playground.*
