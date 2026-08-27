# Trees — Google Interview Prep

> **7 algorithms covered:** DFS Traversals (Inorder/Preorder/Postorder) · BFS Level-Order · Tree Height / Depth · Tree Diameter · Path Sum (Root-to-Leaf) · BST Validate / Search / Insert · Serialize and Deserialize

> Goal: Read fast, understand deeply, go practice on LeetCode immediately.

---

## Table of Contents

1. [DFS Traversals (Inorder / Preorder / Postorder)](#dfs-traversals-inorder--preorder--postorder)
2. [BFS Level-Order Traversal](#bfs-level-order-traversal)
3. [Tree Height / Depth](#tree-height--depth)
4. [Tree Diameter](#tree-diameter)
5. [Path Sum (Root-to-Leaf)](#path-sum-root-to-leaf)
6. [Lowest Common Ancestor (LCA)](#lowest-common-ancestor-lca)
7. [BST Validate / Search / Insert](#bst-validate--search--insert)
8. [Serialize and Deserialize](#serialize-and-deserialize)

---

## DFS Traversals (Inorder / Preorder / Postorder)

### What is it?

A tree is made of **nodes** (boxes holding a value), connected by edges. The topmost node is the **root**. A node with no children is a **leaf**. DFS traversal means visiting every node by going deep before going wide — and depending on when you process the current node, you get three distinct orders: preorder (process first), inorder (process in the middle), postorder (process last).

### Visual

```
        1
       / \
      2   3
     / \
    4   5
```

Preorder  (Root → Left → Right): 1, 2, 4, 5, 3
Inorder   (Left → Root → Right): 4, 2, 5, 1, 3
Postorder (Left → Right → Root): 4, 5, 2, 3, 1

### How does it work?

**Preorder:**
1. If node is null, return.
2. Process current node (print it / add to list).
3. Recurse left.
4. Recurse right.

**Inorder:**
1. If node is null, return.
2. Recurse left.
3. Process current node.
4. Recurse right.

**Postorder:**
1. If node is null, return.
2. Recurse left.
3. Recurse right.
4. Process current node.

### Why does it work?

The key idea: recursion naturally visits every node exactly once. The only thing that changes between the three orders is *when* you look at the current node relative to its children. That single timing choice changes what problems each order is best suited for.

### When to use?

- **Preorder:** copying or serializing a tree; problems where a parent's value is needed before going into children.
- **Inorder:** BST problems — inorder of a BST gives sorted order.
- **Postorder:** computing something that depends on the results from both children (height, diameter, balanced check).

### When NOT to use?

- When you need level-by-level information (use BFS instead).
- When the problem asks for "right side view" or "minimum depth" (BFS is cleaner).

### How to recognize in a new problem?

Ask: "Do I need to visit every node?" and "Does the order of visiting matter?" If the answer is yes to both, it is a traversal problem. Concrete signals: "return the inorder traversal," "print all nodes," "copy the tree."

### Simple Example

Tree:
```
    2
   / \
  1   3
```
Inorder expected output: [1, 2, 3]

Recursion trace for inorder:
- inorder(2) → go left first
  - inorder(1) → go left
    - inorder(null) → return
  - add 1
  - go right: inorder(null) → return
- add 2
- go right: inorder(3) → go left
    - inorder(null) → return
  - add 3
  - go right: inorder(null) → return

Result: [1, 2, 3]

### Code

```java
// Java — Inorder (change position of "result.add" for pre/post)
List<Integer> inorder(TreeNode node, List<Integer> result) {
    if (node == null) return result;
    inorder(node.left, result);      // Left
    result.add(node.val);            // Root (move this line for pre/post)
    inorder(node.right, result);     // Right
    return result;
}
```

```javascript
// JavaScript — Inorder
function inorder(node, result = []) {
    if (node === null) return result;
    inorder(node.left, result);      // Left
    result.push(node.val);           // Root (move this line for pre/post)
    inorder(node.right, result);     // Right
    return result;
}
```

### Dry Run

Inorder on the tree above (root=2):

```
inorder(2)
  inorder(1)
    inorder(null) → return
    add 1
    inorder(null) → return
  add 2
  inorder(3)
    inorder(null) → return
    add 3
    inorder(null) → return
Final list: [1, 2, 3]
```

### Complexity

```
Time:  O(n) — visit every node once
Space: O(h) — call stack depth equals tree height h
              (O(n) worst case for skewed tree, O(log n) for balanced)
```

### Common Trap

1. Forgetting the null check at the top — your code will crash with a NullPointerException.
2. Mixing up which line the `result.add` belongs to when switching between pre/in/post — always double-check the order.

### Experience Tip

**Experience Tip:** In interviews, if you say "inorder gives sorted output on a BST," the interviewer immediately knows you understand BSTs. That one sentence scores points fast. For postorder, remember: children always finish before the parent. This is the foundation of all bottom-up tree algorithms.

### Do Not Confuse With

BFS (level-order): BFS uses a queue and visits nodes level by level. DFS uses recursion (or a stack) and goes deep first. They produce completely different orderings.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 94 | Binary Tree Inorder Traversal | Easy | Classic inorder — also try the iterative version with a stack | https://leetcode.com/problems/binary-tree-inorder-traversal/ |
| 144 | Binary Tree Preorder Traversal | Easy | Preorder — root comes out first | https://leetcode.com/problems/binary-tree-preorder-traversal/ |
| 226 | Invert Binary Tree | Easy | Preorder: swap children, then recurse — order matters | https://leetcode.com/problems/invert-binary-tree/ |
| 101 | Symmetric Tree | Easy | Mirror recursion: check left.left vs right.right and left.right vs right.left | https://leetcode.com/problems/symmetric-tree/ |
| 105 | Construct Binary Tree from Preorder and Inorder Traversal | Medium | Preorder[0] is root; find root in inorder to split left/right | https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/ |

### One-Minute Revision

```
PATTERN:           DFS Traversals (Inorder / Preorder / Postorder)
IN SIMPLE WORDS:   Visit every node; timing of when you process the node changes the order
USE WHEN:          Need to visit all nodes; BST sorted order (inorder); bottom-up compute (postorder)
DON'T USE WHEN:    Need level-by-level info — use BFS
KEY QUESTION:      When do I process the current node — before, between, or after its children?
RETURN FROM EACH:  Void (add to result list as side effect) or the result list itself
TIME:              O(n)
SPACE:             O(h)
COMMON TRAP:       Missing null check; wrong placement of result.add line
EXPERIENCE TIP:    Inorder on BST = sorted. Say that in every BST interview.
```

---

## BFS Level-Order Traversal

### What is it?

BFS (Breadth-First Search) visits every node level by level, left to right. It uses a **queue** (first in, first out) instead of recursion. The **root** (top node) is visited first, then its children, then their children, and so on until every **leaf** (node with no children) is reached.

### Visual

```
        1
       / \
      2   3
     / \
    4   5
```

Level 0: [1]
Level 1: [2, 3]
Level 2: [4, 5]

Output: [[1], [2, 3], [4, 5]]

### How does it work?

1. If root is null, return empty result.
2. Put root in a queue.
3. While the queue is not empty:
   a. Snapshot the current queue size — this is the number of nodes on the current level.
   b. Loop exactly that many times, pulling one node out each time.
   c. Add that node's value to the current level's list.
   d. Push its left child (if exists) and right child (if exists) into the queue.
   e. After the loop, add the current level's list to the result.
4. Return the result.

### Why does it work?

The key idea: snapshotting `size = queue.size()` before the inner loop freezes the count of nodes belonging to the current level. Without this snapshot, you would process newly added children in the same iteration and blur level boundaries.

### When to use?

- Problem mentions "level," "depth," "level-order," "width," or "side view."
- Need minimum depth (first leaf you encounter in BFS is the closest).
- Right/left side view (last/first element of each level).

### When NOT to use?

- When you need path information from root to leaf (DFS is more natural).
- When the tree is very wide (last level can have n/2 nodes — queue can get large).

### How to recognize in a new problem?

If the problem asks "for each level..." or "at each depth..." or "how many levels..." — it is a BFS problem. Concrete signals: "right side view," "average of levels," "zigzag level order," "minimum depth."

### Simple Example

Tree:
```
    1
   / \
  2   3
```
Expected output: [[1], [2, 3]]

### Code

```java
// Java
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int size = queue.size();           // snapshot current level count
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

```javascript
// JavaScript
function levelOrder(root) {
    const result = [];
    if (root === null) return result;
    const queue = [root];
    while (queue.length > 0) {
        const size = queue.length;         // snapshot current level count
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

### Dry Run

Tree: 1 → [2, 3]

| Round | Queue entering loop | size | Level collected | Queue after loop |
|-------|---------------------|------|-----------------|------------------|
| 1     | [1]                 | 1    | [1]             | [2, 3]           |
| 2     | [2, 3]              | 2    | [2, 3]          | []               |

Result: [[1], [2, 3]]

### Complexity

```
Time:  O(n) — visit every node once
Space: O(w) — queue holds at most one full level; w = max width
              worst case w = n/2 (last level of perfect binary tree)
```

### Common Trap

1. Not snapshotting `size` before the inner loop — children from the next level get mixed into the current level.
2. Using `queue.size()` inside the loop condition instead of a fixed snapshot — the size grows as you enqueue children.

### Experience Tip

**Experience Tip:** In Google interviews, BFS variants show up constantly: right side view, zigzag traversal, average of levels. Once you have the level-order template memorized cold, all of these become small modifications — last element per level, alternating direction, averaging. The template is the same every time.

### Do Not Confuse With

DFS preorder: DFS also visits root first, but then goes all the way down the left subtree before touching the right subtree. BFS goes wide — it finishes the entire current level before touching the next.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 102 | Binary Tree Level Order Traversal | Medium | The core BFS template — memorize this one | https://leetcode.com/problems/binary-tree-level-order-traversal/ |
| 199 | Binary Tree Right Side View | Medium | Last element of each level | https://leetcode.com/problems/binary-tree-right-side-view/ |
| 637 | Average of Levels in Binary Tree | Easy | Average each level's values | https://leetcode.com/problems/average-of-levels-in-binary-tree/ |
| 111 | Minimum Depth of Binary Tree | Easy | First leaf reached by BFS = min depth | https://leetcode.com/problems/minimum-depth-of-binary-tree/ |
| 103 | Binary Tree Zigzag Level Order Traversal | Medium | Flip direction with a boolean flag each level | https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/ |

### One-Minute Revision

```
PATTERN:           BFS Level-Order Traversal
IN SIMPLE WORDS:   Visit nodes level by level using a queue
USE WHEN:          Level info, side view, min depth, width, zigzag
DON'T USE WHEN:    Path from root to leaf, height, or anything needing recursion naturally
KEY QUESTION:      How do I separate one level from the next in the queue?
RETURN FROM EACH:  N/A — BFS is iterative; you build a result list level by level
TIME:              O(n)
SPACE:             O(w) where w is max width of tree
COMMON TRAP:       Not snapshotting queue size before inner loop — levels bleed together
EXPERIENCE TIP:    All BFS variants (right view, zigzag, average) are the same template with tiny tweaks
```

---

## Tree Height / Depth

### What is it?

The **height** of a tree is the number of nodes on the longest path from the **root** (the top node) to any **leaf** (a node with no children). Sometimes called "maximum depth." A single-node tree has height 1. An empty tree has height 0.

### Visual

```
        5
       / \
      3   8
     / \
    1   4
```

Height of this tree = 3 (path: 5 → 3 → 1 or 5 → 3 → 4)

Height at each node:
- height(1) = 1
- height(4) = 1
- height(3) = 2  (1 + max(1, 1))
- height(8) = 1
- height(5) = 3  (1 + max(2, 1))

### How does it work?

1. If the node is null, return 0 (empty subtree has height 0).
2. Recursively compute the height of the left subtree.
3. Recursively compute the height of the right subtree.
4. Return 1 + max(left height, right height).

The "+1" accounts for the current node itself. Taking the max picks the longer branch.

### Why does it work?

The key idea: the height of any node is determined by its taller child. The current node adds 1 to whatever the tallest path below it is. Since each leaf returns 1 (base case: null returns 0, so leaf = 1 + max(0,0) = 1), the answer builds up correctly from the bottom.

### When to use?

- Problem asks for "maximum depth," "height," or "number of levels."
- As a helper inside other algorithms (diameter, balanced check).
- Any time you need a bottom-up numeric property of the tree.

### When NOT to use?

- When you need the path itself, not just the length (use DFS with path tracking).
- When you need minimum depth (use BFS or a modified DFS checking leaf nodes).

### How to recognize in a new problem?

If the problem asks "how deep/tall is the tree?" or "how many levels?" it is a height problem. Also recognize it as a subroutine when you see "balanced" or "diameter" — both depend on height internally.

### Simple Example

Tree:
```
    1
   /
  2
 /
3
```
Expected height: 3

### Code

```java
// Java
int maxDepth(TreeNode node) {
    if (node == null) return 0;
    int leftHeight  = maxDepth(node.left);
    int rightHeight = maxDepth(node.right);
    return 1 + Math.max(leftHeight, rightHeight);
}
```

```javascript
// JavaScript
function maxDepth(node) {
    if (node === null) return 0;
    const leftHeight  = maxDepth(node.left);
    const rightHeight = maxDepth(node.right);
    return 1 + Math.max(leftHeight, rightHeight);
}
```

### Dry Run

Tree: 1 → 2 → 3 (left-skewed)

```
maxDepth(1)
  maxDepth(2)
    maxDepth(3)
      maxDepth(null) → 0
      maxDepth(null) → 0
      return 1 + max(0, 0) = 1
    maxDepth(null) → 0
    return 1 + max(1, 0) = 2
  maxDepth(null) → 0
  return 1 + max(2, 0) = 3
```

Each node returns: null→0, node3→1, node2→2, node1→3.

### Complexity

```
Time:  O(n) — visit every node once
Space: O(h) — call stack depth = tree height
              O(n) worst case (skewed), O(log n) for balanced
```

### Common Trap

1. Returning -1 for null instead of 0 — shifts all heights by 1 and breaks the formula.
2. Forgetting to add the "+1" for the current node — you get heights that are one too short.

### Experience Tip

**Experience Tip:** This is the "hello world" of tree recursion. If you can write this from memory in 30 seconds, the recursion pattern is in your muscle memory. Nearly every other tree problem is a variation of this template.

### Do Not Confuse With

Depth of a specific node (distance from root down to that node — top-down) versus height of a node (distance from that node down to the farthest leaf — bottom-up). Height is computed bottom-up; depth is computed top-down.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 104 | Maximum Depth of Binary Tree | Easy | Exact implementation of this pattern | https://leetcode.com/problems/maximum-depth-of-binary-tree/ |
| 110 | Balanced Binary Tree | Easy | Height helper returning -1 as sentinel for "unbalanced" | https://leetcode.com/problems/balanced-binary-tree/ |
| 111 | Minimum Depth of Binary Tree | Easy | Must reach a leaf — don't return 1 when only one child exists | https://leetcode.com/problems/minimum-depth-of-binary-tree/ |
| 559 | Maximum Depth of N-ary Tree | Easy | Same idea, but loop over all children | https://leetcode.com/problems/maximum-depth-of-n-ary-tree/ |
| 1448 | Count Good Nodes in Binary Tree | Medium | Pass max-so-far top-down; count node if node.val >= max | https://leetcode.com/problems/count-good-nodes-in-binary-tree/ |

### One-Minute Revision

```
PATTERN:           Tree Height / Depth
IN SIMPLE WORDS:   How tall is this tree? Ask both children, take the max, add 1
USE WHEN:          Max depth, number of levels, height-based checks, as a helper
DON'T USE WHEN:    Need the actual path, not just the count
KEY QUESTION:      What is the longest path from this node down to any leaf?
RETURN FROM EACH:  The height of the subtree rooted at this node (an integer)
TIME:              O(n)
SPACE:             O(h)
COMMON TRAP:       Null returns 0, not -1. Don't forget the +1 for the current node.
EXPERIENCE TIP:    Memorize this cold — it is a subroutine inside diameter, balanced, and others
```

---

## Tree Diameter

### What is it?

The diameter of a binary tree is the length of the longest path between any two **nodes** (boxes holding values). The path does not have to pass through the **root** (top node). The length is measured in number of edges (not nodes). A single node has diameter 0.

### Visual

```
        1
       / \
      2   3
     / \
    4   5
```

The longest path is 4 → 2 → 1 → 3 (length 3 edges) or 4 → 2 → 5 (length 2 edges).
Diameter = 3.

At each node, the path going through it = left_height + right_height.
- At node 2: 1 + 1 = 2
- At node 1: 2 + 1 = 3  ← global max

### How does it work?

1. Track a global variable `maxDiameter = 0`.
2. For each node (null returns 0):
   a. Recursively get the height of the left subtree.
   b. Recursively get the height of the right subtree.
   c. The path through the current node = left_height + right_height. Update `maxDiameter` if this is larger.
   d. Return 1 + max(left_height, right_height) — this is the height of the current subtree (needed by the parent).
3. After DFS finishes, return `maxDiameter`.

### Why does it work?

The key idea: for any node, the longest path that passes through it goes left_height steps down the left side and right_height steps down the right side. By computing this at every node and taking the global max, you capture the longest path even if it does not pass through the root. The function returns height (not diameter) because the parent needs heights to compute its own path length.

### When to use?

- Problem asks for "longest path between any two nodes" or "diameter."
- Any time the answer might be in a subtree rather than passing through the root.

### When NOT to use?

- When the path must start or end at the root (use height directly).

### How to recognize in a new problem?

If the problem asks for the "longest path" and does not restrict it to root-to-leaf, think diameter. Signal: "the path may or may not pass through the root."

### Simple Example

Tree:
```
    1
   / \
  2   3
```
Diameter: 2 (path: 2 → 1 → 3)

At node 2: left=0, right=0, path through 2 = 0. Returns 1.
At node 3: left=0, right=0, path through 3 = 0. Returns 1.
At node 1: left=1, right=1, path through 1 = 2. maxDiameter = 2. Returns 2.

### Code

```java
// Java
int maxDiameter = 0;

int diameterOfBinaryTree(TreeNode root) {
    dfs(root);
    return maxDiameter;
}

int dfs(TreeNode node) {
    if (node == null) return 0;
    int leftHeight  = dfs(node.left);
    int rightHeight = dfs(node.right);
    maxDiameter = Math.max(maxDiameter, leftHeight + rightHeight);
    return 1 + Math.max(leftHeight, rightHeight);
}
```

```javascript
// JavaScript
function diameterOfBinaryTree(root) {
    let maxDiameter = 0;

    function dfs(node) {
        if (node === null) return 0;
        const leftHeight  = dfs(node.left);
        const rightHeight = dfs(node.right);
        maxDiameter = Math.max(maxDiameter, leftHeight + rightHeight);
        return 1 + Math.max(leftHeight, rightHeight);
    }

    dfs(root);
    return maxDiameter;
}
```

### Dry Run

Tree: 1→[2→[4,5], 3]

```
dfs(4): left=0, right=0, path=0, maxD=0, returns 1
dfs(5): left=0, right=0, path=0, maxD=0, returns 1
dfs(2): left=1, right=1, path=2, maxD=2, returns 2
dfs(3): left=0, right=0, path=0, maxD=2, returns 1
dfs(1): left=2, right=1, path=3, maxD=3, returns 3
```

Final maxDiameter = 3.

### Complexity

```
Time:  O(n) — visit every node once
Space: O(h) — call stack depth = tree height
```

### Common Trap

1. Returning the diameter from `dfs` instead of the height — the parent cannot compute its own path if you return the diameter.
2. Putting the global max variable inside the helper function — you lose it between calls.

### Experience Tip

**Experience Tip:** The diameter problem is a perfect example of "global state + local return." The function returns height locally so the parent can use it, but updates a global max as a side effect. This split responsibility pattern appears in many hard tree problems (max path sum, for example). Once you see it here, you will spot it elsewhere.

### Do Not Confuse With

Tree height: height is the longest path from the root down to a leaf. Diameter is the longest path between any two nodes anywhere in the tree. They are related — diameter at the root equals left_height + right_height — but diameter can be inside any subtree.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 543 | Diameter of Binary Tree | Easy | Return height locally, update global diameter | https://leetcode.com/problems/diameter-of-binary-tree/ |
| 110 | Balanced Binary Tree | Easy | Same "return height, check condition globally" pattern | https://leetcode.com/problems/balanced-binary-tree/ |
| 124 | Binary Tree Maximum Path Sum | Hard | Same structure — return best single branch, update global max with both branches | https://leetcode.com/problems/binary-tree-maximum-path-sum/ |
| 687 | Longest Univalue Path | Medium | Diameter variant — path must have all same values | https://leetcode.com/problems/longest-univalue-path/ |
| 1245 | Tree Diameter | Medium | Same idea on a general tree (not just binary) | https://leetcode.com/problems/tree-diameter/ |

### One-Minute Revision

```
PATTERN:           Tree Diameter
IN SIMPLE WORDS:   Longest path between any two nodes; path can be anywhere in the tree
USE WHEN:          "Longest path," "diameter," path not restricted to root
DON'T USE WHEN:    Path must go through root or must start/end at root
KEY QUESTION:      What is the longest path passing through this node?
RETURN FROM EACH:  Height of the subtree (not diameter) — parent needs height to compute its own path
TIME:              O(n)
SPACE:             O(h)
COMMON TRAP:       Returning diameter instead of height — breaks parent's computation
EXPERIENCE TIP:    "Global state + local return" pattern — learn it here, apply it to max path sum
```

---

## Path Sum (Root-to-Leaf)

### What is it?

A root-to-leaf path starts at the **root** (top node) and follows edges down to a **leaf** (a node with no children). A path sum problem asks: does any root-to-leaf path have values that sum to a given target? Or: find all such paths. The key insight is to carry the remaining target downward as you recurse.

### Visual

```
        5
       / \
      4   8
     /   / \
    11  13  4
   /  \      \
  7    2      1
```

Target = 22.
Path 5 → 4 → 11 → 2 sums to 22. Answer: true.

### How does it work?

1. If node is null, return false (fell off the tree).
2. Subtract the current node's value from the target: `remaining = target - node.val`.
3. If the node is a leaf (no left child and no right child):
   - Return true if `remaining == 0`, false otherwise.
4. Recursively check the left subtree with `remaining`.
5. Recursively check the right subtree with `remaining`.
6. Return `left result OR right result`.

### Why does it work?

The key idea: instead of carrying a running sum downward, carry the *remaining* amount. When you reach a leaf, you only need to ask "is remaining == 0?" This avoids having to compare a running sum against the target only at leaves.

### When to use?

- Problem mentions "root-to-leaf path" and a target sum.
- Any problem where you track state along a single path from top to bottom.

### When NOT to use?

- Path can start or end anywhere (not just root-to-leaf) — use prefix sum with HashMap instead.
- Need to count paths rather than just check existence (Path Sum III pattern).

### How to recognize in a new problem?

"Root-to-leaf," "from root," "sum along a path" are strong signals. The path must start at the root and end at a leaf — if not, it is a different pattern.

### Simple Example

Tree:
```
    1
   / \
  2   3
```
Target = 3. Path 1→2 sums to 3. Answer: true.

Trace:
- hasPathSum(1, 3): remaining = 2, not a leaf → check children.
- hasPathSum(2, 2): remaining = 0, IS a leaf → return true.

### Code

```java
// Java
boolean hasPathSum(TreeNode node, int target) {
    if (node == null) return false;
    int remaining = target - node.val;
    if (node.left == null && node.right == null) {
        return remaining == 0;           // leaf check
    }
    return hasPathSum(node.left,  remaining)
        || hasPathSum(node.right, remaining);
}
```

```javascript
// JavaScript
function hasPathSum(node, target) {
    if (node === null) return false;
    const remaining = target - node.val;
    if (node.left === null && node.right === null) {
        return remaining === 0;          // leaf check
    }
    return hasPathSum(node.left,  remaining)
        || hasPathSum(node.right, remaining);
}
```

For "Path Sum II" (find all paths), collect nodes along the way and backtrack:

```java
// Java — Path Sum II (all paths)
void dfs(TreeNode node, int remaining, List<Integer> path, List<List<Integer>> result) {
    if (node == null) return;
    path.add(node.val);
    remaining -= node.val;
    if (node.left == null && node.right == null && remaining == 0) {
        result.add(new ArrayList<>(path));   // found a valid path — copy it
    }
    dfs(node.left,  remaining, path, result);
    dfs(node.right, remaining, path, result);
    path.remove(path.size() - 1);            // backtrack
}
```

```javascript
// JavaScript — Path Sum II (all paths)
function dfs(node, remaining, path, result) {
    if (node === null) return;
    path.push(node.val);
    remaining -= node.val;
    if (!node.left && !node.right && remaining === 0) {
        result.push([...path]);              // found a valid path — copy it
    }
    dfs(node.left,  remaining, path, result);
    dfs(node.right, remaining, path, result);
    path.pop();                              // backtrack
}
```

### Dry Run

Tree: 5 → [4 → [11 → [7, 2]], 8 → [13, 4 → [null, 1]]], Target = 22.

```
hasPathSum(5, 22): remaining=17
  hasPathSum(4, 17): remaining=13
    hasPathSum(11, 13): remaining=2
      hasPathSum(7, 2): remaining=-5, leaf → false
      hasPathSum(2, 2): remaining=0, leaf → TRUE
    return true
  return true
```

### Complexity

```
Time:  O(n) — visit every node in the worst case
Space: O(h) — call stack depth = tree height
```

### Common Trap

1. Checking `remaining == 0` at any node instead of only at a leaf — internal nodes with matching sums will give false positives.
2. In Path Sum II, forgetting to call `path.remove` (backtrack) — the same path list is mutated for all branches.

### Experience Tip

**Experience Tip:** The backtracking version (Path Sum II) is a very common Google interview question. The three steps are always the same: add to path, recurse, remove from path. If you forget the remove, all your paths will contain garbage from other branches. Test by drawing out the backtrack call on paper first.

### Do Not Confuse With

Path Sum III (any downward path, not just root-to-leaf): that problem uses a prefix sum HashMap technique and is significantly harder. Root-to-leaf path sum carries remaining downward; Path Sum III carries a running sum and looks up in a map.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 112 | Path Sum | Easy | Base pattern — check remaining == 0 only at leaves | https://leetcode.com/problems/path-sum/ |
| 113 | Path Sum II | Medium | Backtracking — add to path, recurse, remove from path | https://leetcode.com/problems/path-sum-ii/ |
| 257 | Binary Tree Paths | Easy | Collect all root-to-leaf paths as strings | https://leetcode.com/problems/binary-tree-paths/ |
| 129 | Sum Root to Leaf Numbers | Medium | Build the number digit by digit as you go down | https://leetcode.com/problems/sum-root-to-leaf-numbers/ |
| 124 | Binary Tree Maximum Path Sum | Hard | Any path (not root-to-leaf) — drop negative branches | https://leetcode.com/problems/binary-tree-maximum-path-sum/ |

### One-Minute Revision

```
PATTERN:           Path Sum (Root-to-Leaf)
IN SIMPLE WORDS:   Carry remaining target downward; at a leaf, check if remaining == 0
USE WHEN:          Path starts at root and ends at a leaf; collecting paths (backtrack)
DON'T USE WHEN:    Path can start/end anywhere — use prefix sum + HashMap
KEY QUESTION:      Have I reached a leaf with exactly 0 remaining?
RETURN FROM EACH:  Boolean (does this subtree contain a valid path?) or void with backtrack
TIME:              O(n)
SPACE:             O(h)
COMMON TRAP:       Leaf check missing — checking remaining at internal nodes gives false positives
EXPERIENCE TIP:    Backtrack = add, recurse, remove. In that exact order, every time.
```

---

## Lowest Common Ancestor (LCA)

### What is it?

Given two **nodes** (boxes holding values) p and q in a binary tree, the Lowest Common Ancestor is the deepest node that is an ancestor of both p and q. A node is considered an ancestor of itself. The **root** (top node) is always a common ancestor — we want the deepest (lowest) one.

### Visual

```
        3
       / \
      5   1
     / \ / \
    6  2 0  8
      / \
     7   4
```

LCA(5, 1) = 3
LCA(5, 4) = 5  (5 is an ancestor of itself)
LCA(6, 4) = 5

### How does it work?

**General Binary Tree (post-order search):**
1. If node is null, return null.
2. If node is p or q, return node (found one of them).
3. Recursively search the left subtree for p or q.
4. Recursively search the right subtree for p or q.
5. If both left and right returned non-null, the current node is the LCA — return it.
6. Otherwise, return whichever side is non-null (bubble it up).

**BST (use ordering to skip subtrees):**
1. If both p.val and q.val are less than node.val — LCA is in the left subtree.
2. If both p.val and q.val are greater than node.val — LCA is in the right subtree.
3. Otherwise (they straddle the current node, or one equals current) — current node is the LCA.

### Why does it work?

The key idea (general tree): the first node where p and q are found in *different* subtrees (left returned non-null AND right returned non-null) must be their deepest common ancestor. If one is in the left subtree and the other is in the right, this node is where they "split." The non-null result bubbles upward until it reaches the caller.

### When to use?

- Problem explicitly asks for "lowest common ancestor."
- Any problem asking "what is the closest shared parent of two nodes?"

### When NOT to use?

- When you have parent pointers (treat it like linked list intersection — find depths, align, walk up together).
- When you need to find LCA of many node pairs (use binary lifting for O(log n) per query).

### How to recognize in a new problem?

"Find the deepest node that is an ancestor of both..." or "find their closest common parent." Also shows up disguised as: "find the distance between two nodes" (LCA + depth math).

### Simple Example

Tree:
```
    3
   / \
  5   1
```
LCA(5, 1) = 3

Trace:
- lca(3, 5, 1): not 5 or 1, recurse.
  - lca(5, 5, 1): node == p (5) → return node 5.
  - lca(1, 5, 1): node == q (1) → return node 1.
- left = 5 (non-null), right = 1 (non-null) → return node 3.

### Code

```java
// Java — General Binary Tree
TreeNode lowestCommonAncestor(TreeNode node, TreeNode p, TreeNode q) {
    if (node == null || node == p || node == q) return node;
    TreeNode left  = lowestCommonAncestor(node.left,  p, q);
    TreeNode right = lowestCommonAncestor(node.right, p, q);
    if (left != null && right != null) return node;  // split here = LCA
    return left != null ? left : right;              // bubble up the find
}
```

```javascript
// JavaScript — General Binary Tree
function lowestCommonAncestor(node, p, q) {
    if (node === null || node === p || node === q) return node;
    const left  = lowestCommonAncestor(node.left,  p, q);
    const right = lowestCommonAncestor(node.right, p, q);
    if (left !== null && right !== null) return node;
    return left !== null ? left : right;
}
```

```java
// Java — BST version (exploits ordering)
TreeNode lcaBST(TreeNode node, TreeNode p, TreeNode q) {
    while (node != null) {
        if (p.val < node.val && q.val < node.val) {
            node = node.left;   // both smaller, go left
        } else if (p.val > node.val && q.val > node.val) {
            node = node.right;  // both larger, go right
        } else {
            return node;        // they straddle — current is LCA
        }
    }
    return null;
}
```

```javascript
// JavaScript — BST version
function lcaBST(node, p, q) {
    while (node !== null) {
        if (p.val < node.val && q.val < node.val) {
            node = node.left;
        } else if (p.val > node.val && q.val > node.val) {
            node = node.right;
        } else {
            return node;
        }
    }
    return null;
}
```

### Dry Run

General tree, find LCA(6, 4) in the full example tree above:

```
lca(3, 6, 4): not 6 or 4, recurse
  lca(5, 6, 4): not 6 or 4, recurse
    lca(6, 6, 4): node == p(6) → return node 6
    lca(2, 6, 4): not 6 or 4, recurse
      lca(7, 6, 4): not found, returns null
      lca(4, 6, 4): node == q(4) → return node 4
    left=null, right=4 → return node 4
  left=6, right=4 → BOTH non-null → return node 5
lca(1, 6, 4): returns null (6 and 4 not in right subtree)
left=5, right=null → return node 5
```

LCA(6, 4) = 5. Correct.

### Complexity

```
Time:  O(n) — general tree visits all nodes in worst case
       O(h) — BST version skips one subtree at each level
Space: O(h) — call stack for recursive version; O(1) for iterative BST
```

### Common Trap

1. Assuming both p and q are guaranteed to exist in the tree — confirm with the interviewer. If not guaranteed, add a presence check.
2. In the BST version, forgetting that a node is an ancestor of itself — if node equals p or q, return it immediately.

### Experience Tip

**Experience Tip:** The general binary tree LCA is one of the most-asked Google tree problems. Practice explaining the logic out loud: "If both subtrees return non-null, that means p and q are on opposite sides, so this node is the split point — it must be the LCA." Interviewers love hearing that explanation.

### Do Not Confuse With

BST LCA vs general tree LCA: BST LCA is O(h) and iterative because you can skip half the tree. General tree LCA is O(n) because you might have to search everywhere. Never use the BST trick on a general binary tree.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 236 | Lowest Common Ancestor of a Binary Tree | Medium | Post-order: both sides non-null means split at current node | https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/ |
| 235 | Lowest Common Ancestor of a Binary Search Tree | Medium | BST: straddle means current is LCA; can do iteratively | https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/ |
| 1650 | Lowest Common Ancestor of a Binary Tree III | Medium | Has parent pointers — linked list intersection technique | https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree-iii/ |
| 1644 | Lowest Common Ancestor of a Binary Tree II | Medium | p or q might not exist — must visit full tree | https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree-ii/ |
| 1676 | Lowest Common Ancestor of a Binary Tree IV | Medium | Multiple nodes, not just two | https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree-iv/ |

### One-Minute Revision

```
PATTERN:           Lowest Common Ancestor (LCA)
IN SIMPLE WORDS:   Find the deepest node that is a parent of both p and q
USE WHEN:          "Closest shared ancestor," "deepest common parent"
DON'T USE WHEN:    Has parent pointers (use linked list intersection) or many queries (binary lifting)
KEY QUESTION:      Where do the paths to p and q first split?
RETURN FROM EACH:  The node if it is p, q, or their LCA; otherwise null
TIME:              O(n) general tree, O(h) BST
SPACE:             O(h)
COMMON TRAP:       Assuming both nodes exist; forgetting a node is an ancestor of itself
EXPERIENCE TIP:    Explain "both sides non-null = split point = LCA" — that sentence impresses interviewers
```

---

## BST Validate / Search / Insert

### What is it?

A Binary Search Tree (BST) is a binary tree where every **node** (box holding a value) satisfies: all values in its left subtree are strictly smaller, all values in its right subtree are strictly larger. The **root** (top node) divides the whole tree. **Leaves** (nodes with no children) are the endpoints. This ordering property makes search, insert, and validation O(h) — tree height — instead of O(n).

### Visual

```
        4
       / \
      2   6
     / \ / \
    1  3 5  7
```

BST property at node 4: left subtree {1,2,3} all < 4, right subtree {5,6,7} all > 4.
BST property at node 2: left subtree {1} < 2, right subtree {3} > 2.

Search for 5: start at 4 (5 > 4 → go right), at 6 (5 < 6 → go left), at 5 → found.

### How does it work?

**Search:**
1. If node is null, return null (not found).
2. If target == node.val, return node (found).
3. If target < node.val, search left subtree.
4. If target > node.val, search right subtree.

**Insert:**
1. If node is null, create and return a new node with the value.
2. If value < node.val, recurse into left: `node.left = insert(node.left, value)`.
3. If value > node.val, recurse into right: `node.right = insert(node.right, value)`.
4. Return node (unchanged).

**Validate:**
1. Pass a valid range [min, max] from the top downward.
2. At root: range is (-infinity, +infinity).
3. At each node: if node.val is not in (min, max), return false.
4. Recurse left with range (min, node.val).
5. Recurse right with range (node.val, max).
6. Return true only if both subtrees are valid.

### Why does it work?

The key idea: the BST property gives you a "valid range" for every node. The range narrows as you go deeper. When you go left from a node with value V, every node in that subtree must be less than V. When you go right, every node must be greater than V. Passing the full valid range (not just checking against the immediate parent) catches cases like the trap below.

### When to use?

- Problem says "BST" and involves search, insert, delete, or validation.
- Need sorted order from a binary tree (inorder traversal).
- Need kth smallest/largest element.

### When NOT to use?

- The tree is a general binary tree with no ordering guarantee.
- You need to handle duplicate values (standard BST does not allow them).

### How to recognize in a new problem?

"Binary Search Tree" in the problem statement is the obvious signal. Also: "find kth smallest," "check if valid BST," "insert into BST," "range sum of BST."

### Simple Example

Validate this tree (it looks like a BST but is not valid):
```
    5
   / \
  1   4
     / \
    3   6
```
Node 4 is in the right subtree of 5, so it must be > 5. But 4 < 5. Invalid BST.

Trace with range passing:
- validate(5, -inf, +inf): 5 is in range, ok.
  - validate(1, -inf, 5): 1 is in range, ok.
  - validate(4, 5, +inf): 4 is NOT > 5. Return false.

### Code

```java
// Java — Validate BST
boolean isValidBST(TreeNode node, long min, long max) {
    if (node == null) return true;
    if (node.val <= min || node.val >= max) return false;
    return isValidBST(node.left,  min,      node.val)
        && isValidBST(node.right, node.val, max);
}
// Call: isValidBST(root, Long.MIN_VALUE, Long.MAX_VALUE)
```

```java
// Java — Search BST
TreeNode searchBST(TreeNode node, int target) {
    if (node == null || node.val == target) return node;
    if (target < node.val) return searchBST(node.left,  target);
    else                   return searchBST(node.right, target);
}
```

```java
// Java — Insert into BST
TreeNode insertIntoBST(TreeNode node, int value) {
    if (node == null) return new TreeNode(value);
    if (value < node.val) node.left  = insertIntoBST(node.left,  value);
    else                  node.right = insertIntoBST(node.right, value);
    return node;
}
```

```javascript
// JavaScript — Validate BST
function isValidBST(node, min = -Infinity, max = Infinity) {
    if (node === null) return true;
    if (node.val <= min || node.val >= max) return false;
    return isValidBST(node.left,  min,      node.val)
        && isValidBST(node.right, node.val, max);
}
```

```javascript
// JavaScript — Search BST
function searchBST(node, target) {
    if (node === null || node.val === target) return node;
    if (target < node.val) return searchBST(node.left,  target);
    else                   return searchBST(node.right, target);
}
```

```javascript
// JavaScript — Insert into BST
function insertIntoBST(node, value) {
    if (node === null) return { val: value, left: null, right: null };
    if (value < node.val) node.left  = insertIntoBST(node.left,  value);
    else                  node.right = insertIntoBST(node.right, value);
    return node;
}
```

### Dry Run

Validate BST on the invalid tree above (root=5):

```
isValidBST(5, -inf, +inf): 5 in range → ok
  isValidBST(1, -inf, 5): 1 in range → ok
    isValidBST(null, ...) → true
    isValidBST(null, ...) → true
    return true
  isValidBST(4, 5, +inf): 4 <= 5 → return false
return false
```

### Complexity

```
Time:  O(h) for search/insert/validate on one path
       O(n) for validate (must check all nodes)
Space: O(h) — call stack depth

h = O(log n) for balanced BST, O(n) for skewed BST
```

### Common Trap

1. Validating only against the immediate parent — this misses cases where a node in the left subtree is larger than an ancestor further up. Always pass the full valid range.
2. Using `Integer.MIN_VALUE` instead of `Long.MIN_VALUE` — if the tree contains `Integer.MIN_VALUE`, the comparison fails. Use long or -Infinity.

### Experience Tip

**Experience Tip:** The validate trap (checking only against immediate parent) is extremely common in interviews. Almost everyone's first instinct is wrong. When the interviewer asks "are you sure this handles all cases?" — draw a counterexample tree where a right-subtree node is smaller than a grandparent. That drawing + the fix (passing min/max range) shows strong problem-solving instinct.

### Do Not Confuse With

General binary tree search: without the BST property you cannot skip subtrees and must do O(n) DFS. Always ask yourself: "Is this guaranteed to be a BST?" If yes, exploit the ordering. If not, fall back to general DFS.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 98 | Validate Binary Search Tree | Medium | Pass min/max range — do not just check against parent | https://leetcode.com/problems/validate-binary-search-tree/ |
| 700 | Search in a Binary Search Tree | Easy | Go left if smaller, right if larger | https://leetcode.com/problems/search-in-a-binary-search-tree/ |
| 701 | Insert into a Binary Search Tree | Medium | Recurse to the right spot, return node back up | https://leetcode.com/problems/insert-into-a-binary-search-tree/ |
| 230 | Kth Smallest Element in a BST | Medium | Inorder gives sorted order — count inorder visits | https://leetcode.com/problems/kth-smallest-element-in-a-bst/ |
| 235 | Lowest Common Ancestor of a Binary Search Tree | Medium | Straddle condition: both p,q on same side means LCA deeper | https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/ |

### One-Minute Revision

```
PATTERN:           BST Validate / Search / Insert
IN SIMPLE WORDS:   BST orders every node: left < node < right. Use it to skip half the tree.
USE WHEN:          Tree is a BST; search, insert, validate, kth smallest
DON'T USE WHEN:    General binary tree with no ordering guarantee
KEY QUESTION:      What is the valid range for this node?
RETURN FROM EACH:  Validate: boolean. Search: node or null. Insert: updated node.
TIME:              O(h) per operation; O(n) for full validate
SPACE:             O(h)
COMMON TRAP:       Only checking against the immediate parent — pass full min/max range
EXPERIENCE TIP:    Draw the counterexample tree to show why parent-only check fails — very impressive
```

---

## Serialize and Deserialize

### What is it?

Serialization converts a binary tree into a string (or array) so it can be stored or transmitted. Deserialization reconstructs the exact same tree from that string. Every **node** (box with a value), every **leaf** (node with no children), and even the absence of a child (null) must be encoded so the tree can be perfectly rebuilt. The goal is a lossless round-trip: serialize → deserialize → same tree.

### Visual

```
        1
       / \
      2   3
         / \
        4   5
```

Preorder traversal with null markers:
`1, 2, null, null, 3, 4, null, null, 5, null, null`

Reading left-to-right during deserialization:
- 1 is root
- 2 is root's left child
- null, null: node 2 has no children (it is a leaf)
- 3 is root's right child
- 4 is 3's left child
- null, null: node 4 is a leaf
- 5 is 3's right child
- null, null: node 5 is a leaf

### How does it work?

**Serialize (preorder + null markers):**
1. If node is null, append "null" to the output.
2. Otherwise, append node.val.
3. Recurse left.
4. Recurse right.

**Deserialize:**
1. Maintain a pointer (or iterator/queue) into the serialized list.
2. Read the next token.
3. If it is "null", return null.
4. Create a new node with this value.
5. Recursively build the left subtree (reads from the same pointer).
6. Recursively build the right subtree.
7. Return the node.

### Why does it work?

The key idea: preorder visits root first, then left subtree, then right subtree. With null markers, you always know exactly where a subtree ends — a null stops you from going deeper. When deserializing, you consume tokens in the same preorder order, so you rebuild the exact same structure. Without null markers, inorder or preorder alone is ambiguous (multiple different trees can produce the same sequence).

### When to use?

- Problem asks to "serialize and deserialize" a tree.
- Need to transmit a tree over a network or store it in a file.
- Need to clone a tree structurally.

### When NOT to use?

- When the tree is guaranteed to be a BST — preorder alone (without null markers) is sufficient for BSTs because the ordering constraint resolves ambiguity.
- When you only need the values, not the structure.

### How to recognize in a new problem?

"Convert tree to string/array," "reconstruct from string," "encode/decode tree." Also appears as: "design a data structure that supports serialization."

### Simple Example

Tree:
```
    1
   / \
  2   3
```

Serialized: "1,2,null,null,3,null,null"

Deserialization trace:
- Read 1 → create node 1
  - Read 2 → create node 2
    - Read null → return null (node 2's left)
    - Read null → return null (node 2's right)
  - node 2 complete, assign to node 1's left
  - Read 3 → create node 3
    - Read null → return null (node 3's left)
    - Read null → return null (node 3's right)
  - node 3 complete, assign to node 1's right
- Return node 1 (root)

### Code

```java
// Java — Serialize and Deserialize
public String serialize(TreeNode root) {
    if (root == null) return "null";
    return root.val + "," + serialize(root.left) + "," + serialize(root.right);
}

public TreeNode deserialize(String data) {
    Queue<String> tokens = new LinkedList<>(Arrays.asList(data.split(",")));
    return buildTree(tokens);
}

private TreeNode buildTree(Queue<String> tokens) {
    String token = tokens.poll();
    if (token.equals("null")) return null;
    TreeNode node = new TreeNode(Integer.parseInt(token));
    node.left  = buildTree(tokens);
    node.right = buildTree(tokens);
    return node;
}
```

```javascript
// JavaScript — Serialize and Deserialize
function serialize(root) {
    if (root === null) return "null";
    return root.val + "," + serialize(root.left) + "," + serialize(root.right);
}

function deserialize(data) {
    const tokens = data.split(",");
    let index = 0;

    function buildTree() {
        const token = tokens[index++];
        if (token === "null") return null;
        const node = { val: parseInt(token), left: null, right: null };
        node.left  = buildTree();
        node.right = buildTree();
        return node;
    }

    return buildTree();
}
```

### Dry Run

Serialize tree 1→[2, 3]:

```
serialize(1):
  serialize(2):
    serialize(null) → "null"
    serialize(null) → "null"
    return "2,null,null"
  serialize(3):
    serialize(null) → "null"
    serialize(null) → "null"
    return "3,null,null"
  return "1,2,null,null,3,null,null"
```

Deserialize "1,2,null,null,3,null,null":

```
tokens = [1, 2, null, null, 3, null, null]
buildTree(): token=1, node=1
  buildTree(): token=2, node=2
    buildTree(): token=null → return null
    buildTree(): token=null → return null
    return node 2
  buildTree(): token=3, node=3
    buildTree(): token=null → return null
    buildTree(): token=null → return null
    return node 3
  return node 1
```

### Complexity

```
Time:  O(n) — visit every node once for both serialize and deserialize
Space: O(n) — the serialized string has O(n) tokens
              O(h) call stack during recursion
```

### Common Trap

1. Using inorder without null markers — inorder alone cannot uniquely reconstruct a tree (multiple trees can produce the same inorder sequence).
2. Using a shared integer index directly in recursion without a wrapper — use a Queue or a single-element array to share state across recursive calls in Java.

### Experience Tip

**Experience Tip:** Interviewers sometimes ask: "Could you use inorder instead of preorder?" The answer is no — without null markers, inorder is ambiguous. A tree [1, null, 2] and [1, 2, null] both produce inorder [1, 2]. Preorder with nulls is the canonical solution. Know why, not just what.

### Do Not Confuse With

Constructing a tree from preorder + inorder arrays (LeetCode 105): that problem gives you two traversal arrays with no null markers and asks you to reconstruct the tree by finding the root in the inorder array. Serialize/deserialize encodes the shape using null markers in a single traversal.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 297 | Serialize and Deserialize Binary Tree | Hard | Preorder + null markers; use a queue to consume tokens | https://leetcode.com/problems/serialize-and-deserialize-binary-tree/ |
| 449 | Serialize and Deserialize BST | Medium | BST: preorder alone (no nulls) works because ordering resolves ambiguity | https://leetcode.com/problems/serialize-and-deserialize-bst/ |
| 105 | Construct Binary Tree from Preorder and Inorder Traversal | Medium | Different problem — uses two arrays, splits by inorder index | https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/ |
| 606 | Construct String from Binary Tree | Easy | Preorder with parentheses instead of null tokens | https://leetcode.com/problems/construct-string-from-binary-tree/ |
| 536 | Construct Binary Tree from String | Medium | Reverse of 606 — parse parentheses to rebuild tree | https://leetcode.com/problems/construct-binary-tree-from-string/ |

### One-Minute Revision

```
PATTERN:           Serialize and Deserialize
IN SIMPLE WORDS:   Encode tree to string using preorder + null markers; rebuild by consuming tokens
USE WHEN:          Need lossless tree encoding; transmit or store a tree
DON'T USE WHEN:    Tree is BST (preorder without nulls is sufficient); only values needed
KEY QUESTION:      How do I know where one subtree ends and another begins?
RETURN FROM EACH:  Serialize: string. Deserialize buildTree: the reconstructed node.
TIME:              O(n)
SPACE:             O(n) string, O(h) call stack
COMMON TRAP:       Using inorder without null markers — inorder alone is ambiguous
EXPERIENCE TIP:    Know WHY preorder works but inorder does not — interviewers test understanding
```

---

## Quick Reference

### DFS vs BFS Decision

```
Is the problem about levels / side views / width / min depth?
  YES → BFS (level-order with queue)
  NO  → DFS (recursion)

Which DFS order?
  Need to pass info from parent to child (top-down)? → Preorder
  Need sorted order from BST?                        → Inorder
  Need child results before computing parent?        → Postorder

Is it a path problem?
  Root-to-leaf?           → Carry remaining sum downward (preorder)
  Any path (LCA, diameter, max sum)? → Post-order with global max

Is it a BST problem?
  Always exploit left < node < right
  Search, LCA, validate: O(h) by choosing one side
  Kth smallest: inorder
```

### The DFS Recursion Template

```
f(node):
    if node is null:
        return base_case         // what does empty mean?

    left  = f(node.left)         // ask left child
    right = f(node.right)        // ask right child

    return combine(left, right, node.val)
```

### Complexity Summary

```
Pattern              Time    Space   Notes
-----------          ------  ------  --------------------------
DFS Traversals       O(n)    O(h)    h = log n balanced, n skewed
BFS Level-Order      O(n)    O(w)    w = max width (up to n/2)
Tree Height          O(n)    O(h)
Tree Diameter        O(n)    O(h)    global max tracked separately
Path Sum             O(n)    O(h)    backtrack for all-paths version
LCA (general)        O(n)    O(h)    worst case visits all nodes
LCA (BST)            O(h)    O(1)    iterative, skips subtrees
BST Search/Insert    O(h)    O(h)
BST Validate         O(n)    O(h)    must check all nodes
Serialize            O(n)    O(n)    string + call stack
Deserialize          O(n)    O(n)
```

---

*Next: [11-GRAPHS.md](11-GRAPHS.md)*
