# DAY 4 — DEEP MASTERY: RECURSION ON TREES

> *"A tree is a recursive structure. A node is a tree. Recursion on trees isn't a technique — it's the tree expressing its own nature."*

---

## SECTION 1: WHY TREES ARE NATURALLY RECURSIVE

### What Is a Tree?

A tree is a collection of **nodes** connected by **edges**, with two key properties:
- There is exactly one **root** node at the top.
- Every other node has exactly one **parent**, and any number of **children**.

But here is the property that makes trees deeply special:

> **Every subtree of a tree is itself a tree.**

This isn't a rule you apply — it's the definition. When you remove the root and look at the subtree rooted at the left child, it is a complete, valid tree. That subtree has its own root. Its subtrees are also trees. All the way down.

```
          Root
         /    \
        L      R
       / \    / \
      LL  LR RL  RR

Zoom in on L:
        L           ← This is a complete, valid tree by itself
       / \
      LL  LR

Zoom in on LL:
        LL          ← Also a complete, valid tree
```

This self-similarity IS what recursion is designed to exploit. Recursion is the algorithmic expression of a self-similar structure.

### Why Recursion Is the Most Natural Fit

When you want to compute something about a tree — its height, all its paths, whether it's balanced — you can ask:

> *"If I already knew the answer for all subtrees, could I compute the answer for the whole tree?"*

For almost every tree problem, the answer is **yes**. That's the recursive insight.

- **Height of tree** = 1 + max(height of left subtree, height of right subtree)
- **Sum of all nodes** = node.value + sum(left subtree) + sum(right subtree)
- **Count of nodes** = 1 + count(left subtree) + count(right subtree)
- **Tree is balanced?** = left is balanced AND right is balanced AND heights differ by ≤ 1

Every single one of these reduces to: solve the smaller version, combine.

That is recursion.

### Why Iterative Solutions Are Harder to Think About

To traverse a tree iteratively, you must manually simulate what recursion does automatically — manage a stack of "pending work." You have to explicitly push nodes, track whether you've visited left children, pop states, etc.

Recursion offloads all stack management to the language runtime. The call stack IS the stack you'd manage manually. The result: recursive tree code reads almost like the problem statement itself, while iterative code reads like a low-level simulation.

### Four Analogies to Build Intuition

**Family Hierarchy**
You are a node. Your parents are your ancestors. Your children are your descendants. To find how many descendants you have: count your children's descendants and add them. Each child does the same for their children. This IS the recursive count.

**Company Organization Chart**
A CEO has VPs. Each VP has Directors. Each Director has Managers. To find the total headcount under any executive: sum up the headcounts of everyone reporting to them. Each person computes this the same way for their own reports. Pure tree recursion.

**Folder Structure**
A folder contains files and subfolders. Each subfolder contains more files and subfolders. To find total size of a folder: sum up sizes of all files + recursively sum sizes of all subfolders. Every operating system's `du` (disk usage) command works exactly this way — recursive descent through a tree.

**Management Hierarchy for Decision Making**
A board decision flows down: CEO tells VPs, VPs tell Directors. Information also flows up: each team reports status to their manager, who aggregates and reports upward. This **bidirectional flow** — downward (top-down) and upward (bottom-up) — maps precisely to the two fundamental information-flow patterns in tree recursion.

---

## SECTION 2: TREE TERMINOLOGY

*Precision in language is precision in thinking. Use these terms exactly.*

### The Reference Tree

```
                  1                 ← Root
                /   \
               2     3              ← Children of 1 (siblings to each other)
              / \     \
             4   5     6            ← Grandchildren of 1
            / \
           7   8                    ← Leaves (no children)
```

---

**ROOT** — The single topmost node with no parent.
Node `1` is the root. Every tree has exactly one root. It is the entry point for all recursive calls.

**PARENT** — The node directly above another node.
- Parent of `2` is `1`
- Parent of `4` is `2`
- Parent of `7` is `4`
The root is the only node with no parent.

**CHILD** — A node directly below another node.
- Children of `1`: `{2, 3}`
- Children of `2`: `{4, 5}`
- Children of `4`: `{7, 8}`
- Children of `3`: `{6}`

**LEAF NODE** — A node with no children.
Nodes `7`, `8`, `5`, `6` are leaves. In recursion, leaf nodes are almost always **base cases** — where recursion stops and returns a direct answer.

**INTERNAL NODE** — Any non-leaf node (has at least one child).
Nodes `1`, `2`, `3`, `4` are internal nodes.

**SIBLING** — Nodes that share the same parent.
- `2` and `3` are siblings (both children of `1`)
- `7` and `8` are siblings (both children of `4`)

**ANCESTOR** — Any node on the path from a node up to the root.
Ancestors of `7`: `4`, `2`, `1` (the root).

**DESCENDANT** — Any node reachable from a given node going downward.
Descendants of `2`: `4`, `5`, `7`, `8`.

**HEIGHT (of a node)** — The length of the longest path from that node DOWN to a leaf.
```
Height of node 7 = 0   (leaf)
Height of node 4 = 1   (one step to leaf 7 or 8)
Height of node 2 = 2   (4 → 7 is longest path)
Height of node 1 = 3   (1 → 2 → 4 → 7 is longest path)
```

**HEIGHT (of the tree)** = Height of the root = 3 in this example.

**DEPTH (of a node)** — The length of the path from the ROOT down to that node.
```
Depth of node 1 = 0   (it is the root)
Depth of node 2 = 1
Depth of node 4 = 2
Depth of node 7 = 3
```

**LEVEL** — Nodes at the same depth share the same level.
```
Level 0: {1}          ← root
Level 1: {2, 3}
Level 2: {4, 5, 6}
Level 3: {7, 8}       ← deepest level
```

### Critical Insight: Height vs Depth

```
DEPTH = distance from ROOT (top-down measurement)
HEIGHT = distance to FARTHEST LEAF (bottom-up measurement)

For any node X:
  depth(X) + height(X) ≠ height(tree) in general

For the root:
  depth(root) = 0
  height(root) = height(tree)
```

Interviewers often ask: *"What is the height of this tree?"* and *"What is the depth of node X?"* Know the difference precisely.

---

## SECTION 3: THE RECURSIVE TREE MINDSET

### The Shift That Changes Everything

Amateur recursive thinking asks:
> *"How do I traverse this entire tree?"*

This question immediately gets overwhelming. You start thinking about loops, tracking which nodes you've visited, managing state globally. You're trying to solve everything at once.

Expert recursive thinking asks:
> *"What should THIS SINGLE NODE do? What should it return?"*

This question is answerable. You don't worry about the whole tree. You solve for one node, trusting that the exact same logic will apply everywhere.

### The Three Questions of Expert Tree Recursion

Every tree problem becomes tractable once you answer these three questions precisely:

**Question 1: What should each node DO?**
What computation happens at this node? Do you check a condition? Collect a value? Compare children?

**Question 2: What should each node RETURN to its parent?**
What information does the parent need from this node? Height? Count? A boolean? A sum? A reference?

**Question 3: What information flows DOWNWARD from parent to child?**
Does the parent need to pass anything down? Current depth? A target sum? A running state? Some problems need nothing passed down. Others depend on it.

### The Trust Principle

This is the hardest mental leap for beginners:

> *When you write the recursion, trust that the recursive calls are correct. Don't trace through them in your head.*

When you write `left_height = height(node.left)`, trust that this returns the correct height of the left subtree. You don't need to mentally simulate what happens inside that call.

This is the same as mathematical induction:
- Base case: the smallest inputs work correctly.
- Inductive step: if it works for smaller inputs, you can use those results to handle the current input.

The recursive call IS the inductive step. Trust it.

### Mindset in Practice

Given problem: *"Find the height of a binary tree."*

Wrong thinking: *"I need to go through all the nodes, keep a counter, track which level I'm on, find the maximum..."*

Right thinking:
- What does THIS node do? Return `1 + max(height of left, height of right)`.
- What does THIS node return? Its own height.
- What's the base case? If node is null, return -1 (or 0, depending on height definition).

That's the entire algorithm. Three sentences.

---

## SECTION 4: THE MAGIC QUESTION

> *"What information should a node return to its parent?"*

This question is the master key to tree interview problems. Get this right, and the rest of the solution follows naturally.

### Why This Question Is So Powerful

In a tree, every non-root node has exactly one parent. That parent is waiting for the node to finish and return something. The **something** it returns determines everything:
- What variables you need in your recursive function signature
- What your base cases look like
- What computation happens at each node
- What gets propagated upward

### Gallery of Examples

**Problem: Find the height of the tree**
- Node returns: its own height (integer)
- Logic: `return 1 + max(left_child.return_value, right_child.return_value)`
- Base case (null node): return -1

```
         1     ← "I got 2 from left, 0 from right. I return 3."
        / \
       2   3   ← 2 returns 2, 3 returns 0 (it's a leaf)
      / \
     4   5  ← 4 returns 0, 5 returns 0 (both leaves)
```

**Problem: Count total nodes**
- Node returns: count of nodes in its subtree (integer)
- Logic: `return 1 + left_child.return_value + right_child.return_value`
- Base case (null node): return 0

**Problem: Does any root-to-leaf path sum to target?**
- Node returns: boolean (true/false)
- Logic: `return path_exists(left, target - node.val) OR path_exists(right, target - node.val)`
- Base case (null node): return false
- Base case (leaf): return node.val == target

**Problem: Diameter of binary tree (longest path between any two nodes)**
- Node returns: its HEIGHT (not the diameter itself!)
- Side effect: updates global maximum diameter = left_height + right_height at each node
- This is a subtle but critical pattern — what you return ≠ what you're looking for

```
         1     ← height=3. Diameter passing through 1 = height(L) + height(R) = 2+0=2
        / \
       2   3   ← 2 returns height=2. Diameter at 2 = height(4)+height(5) = 1+1=2
      / \
     4   5  ← both return height=1
    /
   7        ← returns height=0
```

*Longest path = 3 (7→4→2→5 or 7→4→2→3). Diameter = 3.*

**Problem: Validate BST (is every left < node < every right?)**
- Node returns: (is_valid, min_value_in_subtree, max_value_in_subtree)
- A node needs to know the min and max of each subtree to validate properly
- Returns a tuple — not all returns are simple integers!

### The Meta-Pattern

```
Return type hints at the approach:

Integer  → aggregation problems (height, count, sum)
Boolean  → validation problems (balanced?, valid BST?, path exists?)
Node     → search problems (find LCA, find node with value X)
Tuple    → complex validation (valid BST with range tracking)
```

Identify what the parent needs → define the return type → write the logic.

---

## SECTION 5: DEPTH-FIRST SEARCH (DFS)

### What DFS Really Means

Depth-First Search means: **go as deep as possible before exploring siblings**.

In a tree, this translates to: completely finish exploring a subtree before moving to the sibling subtree.

```
Tree:
       1
      / \
     2   3
    / \
   4   5

DFS visits: 1 → 2 → 4 → (backtrack) → 5 → (backtrack) → 3

It goes all the way down the left branch (1→2→4),
comes back, goes right (4's sibling 5),
comes back, then explores 3.
```

### Why Recursion Naturally Performs DFS

Recursion uses the **call stack** to manage execution order. When you call `traverse(node.left)`, you don't come back to `traverse(node.right)` until the entire left subtree is finished.

This is exactly DFS behavior — and it happens automatically.

The call stack IS the DFS stack.

### Visualizing the Call Stack

```
Tree:       1
           / \
          2   3
         /
        4

Recursive call: traverse(1)

CALL STACK GROWTH:
─────────────────────────────────
Step 1: traverse(1) called
  Stack: [traverse(1)]

Step 2: traverse(1) calls traverse(2)
  Stack: [traverse(2)]     ← top
         [traverse(1)]     ← waiting

Step 3: traverse(2) calls traverse(4)
  Stack: [traverse(4)]     ← top (at the deepest point)
         [traverse(2)]     ← waiting for traverse(4) to finish
         [traverse(1)]     ← waiting for traverse(2) to finish

Step 4: traverse(4) finishes (leaf), returns
  Stack: [traverse(2)]     ← resumes. No left child of 4 to explore.
         [traverse(1)]     

Step 5: traverse(2) calls traverse(null for right of 2)
        then traverse(2) finishes, returns
  Stack: [traverse(1)]     ← resumes, now calls traverse(3)

Step 6: traverse(3) executes and returns
  Stack: [traverse(1)]     ← resumes, all done, returns

Stack empty → DFS complete
─────────────────────────────────
```

Each frame on the call stack represents a node "waiting" for its subtrees to be processed. This is automatic DFS.

### DFS vs BFS: The Core Difference

```
DFS (Depth-First):   Process fully one subtree before the other
  Uses: recursion (implicitly) or explicit stack
  Explores: depth before breadth
  Natural for: most tree problems

BFS (Breadth-First): Process all nodes at level k before any at level k+1
  Uses: queue
  Explores: breadth before depth
  Natural for: level-order traversal, shortest path, "by level" problems
```

Rule of thumb: if a problem mentions *path from root to leaf*, *any branch*, *depth of tree*, or *comparison within subtrees* → think DFS. If it mentions *level*, *level-by-level*, *shortest path*, or *nearest* → think BFS.

---

## SECTION 6: PREORDER TRAVERSAL

### The Pattern: Root → Left → Right

In preorder, you process the **current node first**, then recursively process the left subtree, then the right subtree.

```
Template:
  preorder(node):
    if node is null: return
    PROCESS node          ← Root first
    preorder(node.left)   ← Then Left
    preorder(node.right)  ← Then Right
```

### Complete Trace on Sample Tree

```
Tree:
          1
         / \
        2   3
       / \   \
      4   5   6
```

**Preorder sequence: 1 → 2 → 4 → 5 → 3 → 6**

Visual trace showing the visit order:
```
Visit 1 ✓             Process root first
  └─ Go left → 2
     Visit 2 ✓          Process 2
       └─ Go left → 4
          Visit 4 ✓       Process 4 (leaf)
          No left child
          No right child
          Return to 2
       └─ Go right → 5
          Visit 5 ✓       Process 5 (leaf)
          Return to 2
     Return to 1
  └─ Go right → 3
     Visit 3 ✓          Process 3
       No left child
       └─ Go right → 6
          Visit 6 ✓       Process 6 (leaf)
     Return to 1
Done.
```

### Use Cases for Preorder

**Copying/cloning a tree:** You must create a node before creating its children. Preorder: create root, then create left subtree, then right.

**Serialization:** Store the tree as a string for network transfer. Preorder records the root before subtrees, so deserialization can reconstruct by reading the root first.

**Prefix expressions:** In expression trees (`+` node with `3` and `4` children), preorder gives `+ 3 4` — the prefix (Polish) notation.

**Directory listing with parent first:** Print a folder name, then recursively print its contents.

### The Intuition

*"I introduce myself before introducing my children."*

---

## SECTION 7: INORDER TRAVERSAL

### The Pattern: Left → Root → Right

In inorder, you recursively process the left subtree first, then the current node, then the right subtree.

```
Template:
  inorder(node):
    if node is null: return
    inorder(node.left)    ← Left first
    PROCESS node          ← Then Root
    inorder(node.right)   ← Then Right
```

### Complete Trace on Sample Tree

```
Tree:
          4
         / \
        2   6
       / \ / \
      1  3 5  7
```

**Inorder sequence: 1 → 2 → 3 → 4 → 5 → 6 → 7** ← Sorted order!

```
Go all the way left first:
  1 → (leftmost)  VISIT 1 ✓
Return to 2:       VISIT 2 ✓
Go to 3:           VISIT 3 ✓
Return to 4:       VISIT 4 ✓  (root, processed after entire left subtree)
Go to 5:           VISIT 5 ✓
Return to 6:       VISIT 6 ✓
Go to 7:           VISIT 7 ✓
```

### Why BSTs Use Inorder: The Sorted Order Property

In a **Binary Search Tree (BST)**, for every node:
- All values in the **left subtree** are **less than** the node's value
- All values in the **right subtree** are **greater than** the node's value

Inorder visits: Left (smaller) → Current → Right (larger)

This produces values in **ascending sorted order**. This property is the foundation of BST-based problems:
- "Find kth smallest element in BST" → inorder, count to k
- "Validate a BST" → inorder should produce strictly increasing sequence
- "BST to sorted array" → inorder traversal

### The Intuition

*"I let my left side finish speaking before I speak. My right side speaks after me."*

In sorted order thinking: *"I announce my value only after all smaller values have been announced."*

---

## SECTION 8: POSTORDER TRAVERSAL

### The Pattern: Left → Right → Root

In postorder, you recursively process both subtrees first, then the current node.

```
Template:
  postorder(node):
    if node is null: return
    postorder(node.left)   ← Left first
    postorder(node.right)  ← Then Right
    PROCESS node           ← Root last
```

### Complete Trace on Sample Tree

```
Tree:
          1
         / \
        2   3
       / \   \
      4   5   6
```

**Postorder sequence: 4 → 5 → 2 → 6 → 3 → 1**

```
Going to leaves first:
  Visit 4 ✓   (left child of 2, leaf)
  Visit 5 ✓   (right child of 2, leaf)
  Visit 2 ✓   (only after BOTH children are done)
  Visit 6 ✓   (right child of 3, leaf)
  Visit 3 ✓   (only after 6 is done)
  Visit 1 ✓   (only after BOTH subtrees 2 and 3 are fully processed)
```

### Why Most Hard Tree Problems Are Postorder Problems

The deep insight: **postorder is the natural order when a node needs information from its children before it can compute its own answer**.

Think about it:
- "What is MY height?" → I need my children's heights first. Postorder.
- "Am I balanced?" → I need to know if my subtrees are balanced first. Postorder.
- "What is my subtree's sum?" → I need my children's sums first. Postorder.
- "What is the diameter passing through me?" → I need my children's heights first. Postorder.

**Any problem where the answer at a node depends on answers from its children → postorder.**

This covers:

| Problem | Why Postorder |
|---------|---------------|
| Height of tree | Need children's heights to compute current height |
| Diameter | Need children's heights to compute diameter through current node |
| Balanced tree check | Need both subtrees' validity and heights |
| Tree sum | Need children's sums to compute subtree sum |
| Count nodes | Need children's counts to compute subtree count |
| Delete a tree | Must delete children before current node (can't delete root of a subtree that still has live children) |
| Evaluate expression tree | Must evaluate children's expressions before applying operator at current node |

### The Intuition

*"My children must complete their work before I can complete mine."*

*"I am the last to leave the meeting — I summarize what my team reported."*

---

## SECTION 9: VISUALIZING RECURSION ON TREES

*Complete step-by-step execution trace. No steps skipped.*

### The Tree and Goal

```
Tree:
        1
       / \
      2   3
     /
    4

Goal: Compute height of the tree.
Convention: height(null) = -1, height(leaf) = 0
```

### Full Execution Trace

```
CALL: height(1)
│
├── Executes: calls height(1.left) = height(2)
│   │
│   ├── Executes: calls height(2.left) = height(4)
│   │   │
│   │   ├── Executes: calls height(4.left) = height(null)
│   │   │   └── BASE CASE: returns -1
│   │   │
│   │   ├── Executes: calls height(4.right) = height(null)
│   │   │   └── BASE CASE: returns -1
│   │   │
│   │   └── Computes: 1 + max(-1, -1) = 1 + (-1) = 0
│   │       RETURNS: 0                 ← height(4) = 0 ✓ (leaf)
│   │
│   ├── Executes: calls height(2.right) = height(null)
│   │   └── BASE CASE: returns -1
│   │
│   └── Computes: 1 + max(0, -1) = 1 + 0 = 1
│       RETURNS: 1                     ← height(2) = 1 ✓
│
├── Executes: calls height(1.right) = height(3)
│   │
│   ├── Executes: calls height(3.left) = height(null)
│   │   └── BASE CASE: returns -1
│   │
│   ├── Executes: calls height(3.right) = height(null)
│   │   └── BASE CASE: returns -1
│   │
│   └── Computes: 1 + max(-1, -1) = 0
│       RETURNS: 0                     ← height(3) = 0 ✓ (leaf)
│
└── Computes: 1 + max(1, 0) = 1 + 1 = 2
    RETURNS: 2                         ← height(1) = 2 ✓ (correct answer)
```

### Call Stack Snapshots at Each Moment

```
MOMENT 1 (deepest call for left branch):
┌─────────────────────────────────────┐
│ height(null) ← ACTIVE (returns -1)  │ ← TOP of stack
│ height(4)    ← WAITING              │
│ height(2)    ← WAITING              │
│ height(1)    ← WAITING              │ ← BOTTOM of stack
└─────────────────────────────────────┘

MOMENT 2 (height(4) computing):
┌─────────────────────────────────────┐
│ height(4) ← ACTIVE (computing 0)    │ ← TOP
│ height(2) ← WAITING                 │
│ height(1) ← WAITING                 │
└─────────────────────────────────────┘

MOMENT 3 (height(2) computing):
┌─────────────────────────────────────┐
│ height(2) ← ACTIVE (computing 1)    │ ← TOP
│ height(1) ← WAITING                 │
└─────────────────────────────────────┘

MOMENT 4 (height(3) executing):
┌─────────────────────────────────────┐
│ height(3) ← ACTIVE (computing 0)    │ ← TOP
│ height(1) ← WAITING                 │
└─────────────────────────────────────┘

MOMENT 5 (height(1) computing final):
┌─────────────────────────────────────┐
│ height(1) ← ACTIVE: max(1,0)+1 = 2  │ ← TOP and ONLY frame
└─────────────────────────────────────┘
RETURNS 2. Stack empty.
```

### Key Observations from the Trace

1. **The stack depth equals the depth of the current node being processed.** Maximum stack size = height of tree.
2. **Each node is visited exactly once.** Total calls = number of nodes + number of null children.
3. **Children return before parents compute.** Postorder behavior is automatic in bottom-up recursion.
4. **The undo step isn't needed** (unlike backtracking) because trees don't require "un-visiting" nodes — the structure is fixed.

---

## SECTION 10: INFORMATION FLOW IN TREES

### The Two Directions of Information

Information in tree recursion flows in two directions, and choosing the right one is essential:

```
            TOP-DOWN                    BOTTOM-UP
         ┌──────────┐               ┌──────────┐
         │  Parent  │               │  Parent  │
         │ sends    │               │ receives │
         │ info     │               │ info     │
         └────┬─────┘               └────▲─────┘
              │ ↓                        │ ↑
         ┌────▼─────┐               ┌────┴─────┐
         │  Child   │               │  Child   │
         │ receives │               │ computes │
         │ context  │               │ & sends  │
         └──────────┘               └──────────┘

Parent → Children           Children → Parent
(function parameters)       (return values)
```

---

### Top-Down Information Flow

**What it means:** The parent passes state to its children through function parameters.

**When to use:** When a node needs to know something about its **ancestors** or its **position in the path from root** to compute its answer.

**Examples:**

*Current Depth*: To assign a depth to each node, pass depth as a parameter, incrementing it at each level.
```
label(node, depth):
  node.depth = depth          ← use what parent sent
  label(node.left, depth+1)   ← pass incremented depth to children
  label(node.right, depth+1)
```

*Remaining Target Sum*: To check if a root-to-leaf path sums to target, pass the remaining sum downward.
```
hasPathSum(node, remaining):
  if node is leaf:
    return remaining == node.val   ← check at leaf
  return hasPathSum(node.left, remaining - node.val)
      OR hasPathSum(node.right, remaining - node.val)
```

*BST Valid Range*: To validate a BST properly, pass min/max bounds down.
```
isValid(node, min_bound, max_bound):
  if node.val <= min_bound OR node.val >= max_bound: return false
  return isValid(node.left, min_bound, node.val)
     AND isValid(node.right, node.val, max_bound)
```

---

### Bottom-Up Information Flow

**What it means:** Children compute and return information to their parent through return values.

**When to use:** When a node needs to **aggregate** or **combine** results from its subtrees.

**Examples:**

*Height*: Each node returns its height to its parent.
```
height(node):
  if null: return -1
  left_h  = height(node.left)    ← receive from left child
  right_h = height(node.right)   ← receive from right child
  return 1 + max(left_h, right_h) ← compute and return upward
```

*Subtree Sum*: Each node returns the sum of its subtree.
```
subtreeSum(node):
  if null: return 0
  return node.val + subtreeSum(node.left) + subtreeSum(node.right)
```

*Node Count*: Each node returns how many nodes are in its subtree.
```
count(node):
  if null: return 0
  return 1 + count(node.left) + count(node.right)
```

---

### The Hybrid: Both Directions Simultaneously

Some problems use both flows at once.

**Example: Maximum Path Sum**
- Top-down: nothing needs to be passed (we use a global variable)
- Bottom-up: each node returns its maximum "gain" it can contribute to a path going upward
- Side effect: at each node, consider the path that goes THROUGH this node (left_gain + node.val + right_gain) and update global maximum

This hybrid pattern appears in many hard tree problems.

---

### Decision Framework: Which Direction?

```
Question you're answering                     → Direction

"What is this node's contribution to its       BOTTOM-UP
  parent given what its subtrees provided?"    (return values)

"What does this node need to know about        TOP-DOWN
  its location/ancestors?"                     (parameters)

"Both: node needs ancestor context AND          HYBRID
  must aggregate subtree results"
```

---

## SECTION 11: TREE RECURSION PATTERNS

*Five patterns that cover virtually every tree interview problem.*

---

### Pattern 1: Visit Every Node (Simple Traversal)

**What it is:** Go to every node and do something simple — print, collect, count, modify.

**Signature:** The function doesn't need to return anything meaningful (often void or simple accumulation).

**Recognition signal:** "Print all nodes," "count all nodes," "add 1 to every value," "collect all values."

```
Structure:
  traverse(node):
    if null: return
    DO SOMETHING at node
    traverse(node.left)
    traverse(node.right)

The "do something" can be before (preorder), between (inorder), or after (postorder) the recursive calls.
```

**Examples:** Print all nodes, collect values into a list, increment each node's value.

---

### Pattern 2: Collect Information From Children (Bottom-Up Aggregation)

**What it is:** Each node asks its children for their results, combines them, and returns the combination.

**Signature:** Function returns a meaningful value (integer, boolean, etc.).

**Recognition signal:** "Height," "depth," "sum," "count," "balanced," "maximum," "minimum."

```
Structure:
  aggregate(node):
    if null: return base_value
    left_result  = aggregate(node.left)    ← ask left child
    right_result = aggregate(node.right)   ← ask right child
    return combine(node.val, left_result, right_result)  ← report up
```

This is postorder in spirit — children finish before parent.

**Examples:** Height, count nodes, sum all values, check if tree is symmetric.

---

### Pattern 3: Pass Information Downward (Top-Down State)

**What it is:** Parent computes something and passes it as context to its children.

**Signature:** Function takes extra parameters that encode state passed from the parent.

**Recognition signal:** "At depth k," "path from root," "BST validation," "assign level," "remaining sum."

```
Structure:
  topDown(node, context):
    if null: return
    USE context at this node
    topDown(node.left,  updated_context)
    topDown(node.right, updated_context)
```

**Examples:** Path sum validation, BST range validation, assign depths, find level-order values.

---

### Pattern 4: Path-Based Problems

**What it is:** Track the path from root to current node (or any path in the tree).

**Signature:** Carries a "current path" that is built going down and unbuilt (backtracked) going up.

**Recognition signal:** "All root-to-leaf paths," "paths summing to k," "find path between two nodes."

```
Structure:
  pathSolve(node, current_path):
    if null: return
    current_path.append(node.val)     ← extend path going down

    if leaf:
      process(current_path)           ← arrived at destination

    pathSolve(node.left,  current_path)
    pathSolve(node.right, current_path)

    current_path.pop()                ← UNDO path extension going up
```

Notice the explicit undo step — this IS backtracking within tree traversal.

**Examples:** Print all root-to-leaf paths, path sum II, path with maximum sum.

---

### Pattern 5: Subtree-Based Problems

**What it is:** At each node, consider the entire subtree rooted there as a unit.

**Signature:** Often returns multiple pieces of information (tuple/struct) or uses a global variable.

**Recognition signal:** "Is there a subtree that...," "find the largest subtree that...," "check if one tree is subtree of another," "diameter."

```
Structure:
  subtreeSolve(node):
    if null: return (base_info)
    left_info  = subtreeSolve(node.left)
    right_info = subtreeSolve(node.right)

    # Compute answer FOR THIS SUBTREE using both children's info
    current_subtree_property = compute(node, left_info, right_info)

    # Potentially update global answer
    global_max = max(global_max, current_subtree_property)

    # Return what parent needs (might differ from local answer)
    return what_parent_needs
```

**Examples:** Diameter (return height, update global diameter), balanced tree (return height or -1 if unbalanced), largest BST subtree.

---

## SECTION 12: HOW TO IDENTIFY TREE RECURSION PROBLEMS

### The Problem Recognition Checklist

```
READ THE PROBLEM. Then check:

☐ Is the input a tree? (Binary tree, N-ary tree, BST, trie)
  YES → recursion is almost certainly the right approach

☐ Does the problem involve a "path"?
  YES → Pattern 4 (path-based), likely DFS

☐ Does it ask for a property "of the tree" (height, diameter, balance)?
  YES → Pattern 2 (bottom-up aggregation), postorder

☐ Does it ask about relationship to root/ancestors (depth, level, root-to-leaf)?
  YES → Pattern 3 (top-down state passing)

☐ Does it say "all," "every," "list all," "collect"?
  YES → Pattern 1 (visit every node) or Pattern 4 (all paths)

☐ Does it involve subtrees as units ("is subtree of," "largest subtree")?
  YES → Pattern 5 (subtree-based)

☐ Does it involve a BST specifically?
  YES → Inorder traversal often solves or simplifies it
```

### DFS vs BFS Signals for Trees

```
Use DFS (recursion) when:
  ├── "Any path from root to leaf..."
  ├── "Does there exist a path..."
  ├── "Height / depth of tree..."
  ├── "Validate property..."
  ├── "Compare subtrees..."
  └── Any problem where you need to go deep before broad

Use BFS (queue) when:
  ├── "Level order traversal..."
  ├── "By level..."
  ├── "Nearest node to..."
  ├── "Minimum depth..." (shortest root-to-leaf path)
  └── Any problem involving "level" or "layer"
```

### When Postorder Thinking Is Required

The clearest signal: *"The answer at a node depends on the answer at its children."*

Run this mental check: "Can I compute the answer for this node without first knowing the answer for my left and right subtrees?"

- If **NO** (I need children first): Postorder.
- If **YES** (I can compute from just what I know at this node): Preorder or simple traversal.

*Height? I need children's heights first → Postorder.*
*Print node value? I just print it, no children needed → Preorder.*
*BST range check? I just check node.val against bounds → Preorder (top-down).*

---

## SECTION 13: COMPLEXITY ANALYSIS

### Time Complexity: The Universal Rule

For most tree traversal problems:

> **Time = O(N)** where N = number of nodes

Why? Because you visit each node exactly once, and do O(1) work per node (the computation at each node doesn't depend on N).

**When it's more than O(N):**
- If you do O(N) work per node (e.g., copying a path at every leaf): multiply
- Path sum (all paths): O(N) nodes × O(H) per path = O(N × H)
- Balanced: O(N log N). Skewed: O(N²)
- Subtree matching: can be O(N²) naively (checking if T2 matches at every node of T1)

### Space Complexity: The Recursion Stack

> **Space = O(H)** where H = height of tree

Why? Because at any point during DFS, the call stack holds frames for every node on the current root-to-current-node path. The deepest path has length H.

**Two cases for H:**

```
BALANCED TREE:                    SKEWED TREE:
        1                         1
       / \                         \
      2   3                         2
     / \   \                         \
    4   5   6                         3
                                       \
H = O(log N)                           4
Space = O(log N)             H = O(N)
                             Space = O(N)
```

For a balanced tree with N=1000 nodes, stack depth ≈ 10.
For a skewed (chain-like) tree with N=1000 nodes, stack depth = 1000.

This is why problems always ask: "What if the tree is not balanced?" — space complexity changes.

### The Height vs Node Count Relationship

```
PERFECT BINARY TREE (most balanced):
  Level 0: 1 node
  Level 1: 2 nodes
  Level 2: 4 nodes
  Level k: 2^k nodes
  Total N nodes → H = O(log N)
  Space: O(log N)

SKEWED TREE (least balanced):
  Each node has only one child
  N nodes → H = N - 1 = O(N)
  Space: O(N)

AVERAGE BINARY TREE:
  H ≈ O(log N) to O(N) depending on structure
```

### Complete Complexity Table

| Problem | Time | Space | Notes |
|---------|------|-------|-------|
| Height | O(N) | O(H) | Visit each node once |
| Count nodes | O(N) | O(H) | Visit each node once |
| Sum all values | O(N) | O(H) | Visit each node once |
| BST search | O(H) | O(H) | Only one path traversed |
| Inorder traversal | O(N) | O(H) | Visit each node once |
| Balanced check | O(N) | O(H) | Postorder, visit each once |
| Diameter | O(N) | O(H) | Postorder, visit each once |
| Path sum (all paths) | O(N·H) | O(H) | Copy path at each leaf |
| Level order (BFS) | O(N) | O(W) | W = max width |

---

## SECTION 14: COMMON INTERVIEW MISTAKES

### Mistake 1: Forgetting Null Checks

```
WRONG:
  height(node):
    return 1 + max(height(node.left), height(node.right))
    ↑ If node.left is null, this crashes on null.left access

CORRECT:
  height(node):
    if node is null: return -1    ← Always check null first
    return 1 + max(height(node.left), height(node.right))
```

Every recursive tree function must handle null as its first line. Null IS a valid input (empty subtree). Forgetting this causes crashes on leaves or empty trees.

---

### Mistake 2: Wrong Base Cases

```
WRONG (off-by-one in height):
  height(node):
    if node is null: return 0    ← Null subtree has height 0?
    return 1 + max(height(node.left), height(node.right))
  Result: leaf node height = 1 + max(0, 0) = 1 ← Should be 0!

CORRECT:
  height(node):
    if node is null: return -1   ← Null subtree: -1
    return 1 + max(...)
  Result: leaf node height = 1 + max(-1, -1) = 0 ✓
```

The base case definition affects all downstream values. Think carefully: what should a null node return so that a leaf node computes correctly?

---

### Mistake 3: Confusing Preorder and Postorder

```
POSTORDER MISTAKE (computing answer before children finish):

  heightWRONG(node):
    if null: return -1
    my_height = 1 + max(heightWRONG(node.left), heightWRONG(node.right))
    # WAIT — this is actually correct postorder!
    # The operations happen AFTER the recursive calls return.

The confusion comes from code reading order vs execution order:
  a = f(left)     ← LEFT executes first (left subtree done)
  b = f(right)    ← RIGHT executes second (right subtree done)
  return 1+max(a,b) ← ROOT computes third: this IS postorder!
```

When you call `f(node.left)` on the second line, the ENTIRE left subtree executes before line 3. Even if line 2 appears "early" in the code, it represents postorder execution.

---

### Mistake 4: Returning the Wrong Information

```
WRONG: Computing diameter but returning diameter
  diameter(node):
    if null: return 0
    left_d  = diameter(node.left)   ← this returns diameter, not height
    right_d = diameter(node.right)
    return left_d + right_d + 1     ← THIS IS WRONG
    # You're adding diameters, not heights

CORRECT: Return HEIGHT, use global variable for diameter
  global max_diameter = 0
  height(node):           ← function name reflects what it returns
    if null: return -1
    left_h  = height(node.left)
    right_h = height(node.right)
    max_diameter = max(max_diameter, left_h + right_h + 2)  ← update side effect
    return 1 + max(left_h, right_h)  ← return HEIGHT, not diameter
```

The return value and the answer are often different things. Identify what the parent needs, not just what the problem asks for.

---

### Mistake 5: Double-Counting Nodes

```
Wrong tree sum (double-counting root):
  sumWRONG(node):
    if null: return 0
    return node.val
         + node.val                 ← counting root AGAIN
         + sumWRONG(node.left)
         + sumWRONG(node.right)

Why this happens: candidate "starts" the sum with node.val
and then recursively includes it again.

CORRECT:
  sum(node):
    if null: return 0
    return node.val + sum(node.left) + sum(node.right)
```

---

### Mistake 6: Incorrect Complexity Analysis

```
COMMON WRONG CLAIM: "My tree algorithm is O(N log N)"
TRUTH: Most single-pass DFS tree algorithms are O(N).

When O(N log N) IS correct:
  - Problems where you do O(log N) work per node (e.g., BST insert)
  - Problems where you copy O(log N) data per node

When O(N²) IS correct:
  - Path printing: O(N) nodes × O(N) path length each = O(N²)
    (on a skewed tree, every "root-to-leaf path" has length N)

When interviewer asks complexity:
  - Always distinguish TIME (number of node visits × work per visit)
  - From SPACE (recursion stack depth = tree height)
  - And clarify: balanced tree vs skewed tree for space
```

---

## SECTION 15: GOOGLE INTERVIEW THINKING

*The exact mental process top engineers use before writing a line of code.*

### Step 1: Clarify the Tree Structure

Ask (or state your assumption):
- Binary tree or N-ary tree?
- BST or general binary tree?
- Can values be negative? (matters for path sums)
- Can the tree be empty? (null root case)
- Is the tree balanced? (matters for space complexity)

### Step 2: Identify the Pattern

Run through the five patterns (Section 11) and identify which fits:
- "This is bottom-up aggregation (Pattern 2) because the answer at each node depends on its children."
- "This is top-down state passing (Pattern 3) because I need to know current depth."
- "This is path-based (Pattern 4) because I need to track a running path."

Say this out loud. Interviewers reward explicit pattern identification.

### Step 3: Answer the Magic Questions

Before writing any code, state answers to:
- **What does my function return?** (be precise about type and meaning)
- **What are the base cases?** (null node? leaf node?)
- **What happens at each internal node?** (how does it combine children's results?)
- **Do I need a global variable?** (for problems like diameter where return value ≠ answer)

### Step 4: Dry-Run on a Small Tree

Draw a tree with 3–5 nodes. Trace your algorithm manually. Verify:
- Null handling
- Leaf handling
- A node with both children

### Step 5: State Complexity Before Coding

"This will be O(N) time and O(H) space — O(log N) for balanced, O(N) worst case for skewed."

### The Google Mental Checklist

```
[ ] Clarify: tree type, BST or general, null/negative handling?
[ ] Identify: which of the 5 patterns applies?
[ ] Define: what does my function return? (type + meaning)
[ ] Define: base cases (null + leaf if different)
[ ] Define: logic at internal nodes
[ ] Decide: top-down or bottom-up or both?
[ ] Do I need a global/outer variable for the final answer?
[ ] State complexity (time + space for both balanced and skewed)
[ ] Dry-run on a 3-5 node example
[ ] THEN write code
```

---

## SECTION 16: ADVANCED RECURSIVE THINKING

*Deep problem reasoning without code — pure thinking.*

---

### Tree Height

**What each node returns:** Its own height (integer).
**Base case:** Null returns -1 (so leaves compute 1 + max(-1,-1) = 0 ✓).
**Logic:** I am 1 level above my children. My height = 1 + max(left height, right height).
**Pattern:** Bottom-up aggregation (Pattern 2).
**Complexity:** O(N) time, O(H) space.

---

### Diameter of Binary Tree

**Key insight:** Diameter = longest path between any two nodes. This path may or may not pass through the root.

**Trap:** You might return the diameter from each node. Wrong. The diameter passing through a node = left_height + right_height + 2 (or +0 depending on convention). But what you return to the parent is the HEIGHT — because the parent needs heights to compute ITS diameter.

**What each node returns:** Its HEIGHT.
**Side effect:** At each node, compute (left_height + right_height + 2) and compare to global maximum.
**Why height and not diameter?** Because the parent needs heights to compute the longest path going through itself. The diameter might be deep in a subtree — that's the global maximum's job to track.
**Pattern:** Subtree-based (Pattern 5) with global variable.
**Complexity:** O(N) time, O(H) space.

---

### Path Sum II (All Paths Summing to Target)

**What each node returns:** Void (no meaningful return — answers are accumulated in results list).
**What flows downward:** Current path list + remaining target sum.
**Logic:** At each node, add current node to path. At leaf, if remaining == node.val, record path. Recurse on children with remaining - node.val. After recursion, remove node from path (undo/backtrack).
**Why backtracking?** The path list is shared — after exploring one branch, you must restore it for the other.
**Pattern:** Path-based (Pattern 4) with top-down state.
**Complexity:** O(N·H) time — up to N/2 leaves, each with a path of length H copied. O(H) stack space.

---

### Lowest Common Ancestor (LCA)

**What each node returns:** The LCA node if found in its subtree (or null if neither p nor q is in this subtree).
**Key insight:** If left subtree returns p and right subtree returns q → current node IS the LCA. If only one side returns something → propagate that result up.
**Nuanced base cases:** If node == p or node == q, return node immediately (don't recurse further — if the other target is a descendant, this node is still the LCA).
**Logic:**
- left_result = lca(node.left, p, q)
- right_result = lca(node.right, p, q)
- If both non-null → return node (it's the LCA)
- If only one non-null → return that non-null result
- If both null → return null
**Pattern:** Bottom-up aggregation (Pattern 2) — complex return logic.
**Complexity:** O(N) time, O(H) space.

---

### Balanced Tree Validation

**What each node returns:** Either its height (if balanced) or -1 (sentinel for "unbalanced").
**Why -1 as sentinel?** Heights are always ≥ 0, so -1 uniquely signals "unbalanced — abort."
**Logic at each node:**
- left_h = checkBalanced(left)
- right_h = checkBalanced(right)
- If either is -1 → return -1 (propagate unbalanced signal upward)
- If |left_h - right_h| > 1 → return -1 (current node makes tree unbalanced)
- Otherwise → return 1 + max(left_h, right_h)
**Why this is elegant:** The -1 sentinel propagates up immediately without needing a global flag. Once unbalanced is detected, all subsequent calls return -1 without doing real work.
**Pattern:** Bottom-up aggregation with sentinel value.
**Complexity:** O(N) time, O(H) space.

---

### Subtree Matching (Is T2 a Subtree of T1?)

**Naive approach:** At every node of T1, check if the tree rooted there equals T2. Check = O(M) where M = nodes in T2. N nodes in T1.
**Time:** O(N × M). For balanced trees: O(N × M). Can be slow.

**What each node returns:** Boolean — is T2 found rooted at this node or in its subtrees?
**Logic:**
- Check if the tree rooted at current node EQUALS T2 (separate function: isSameTree)
- OR recursively check left subtree
- OR recursively check right subtree
**Pattern:** Subtree-based (Pattern 5) combined with same-tree check.
**Complexity:** O(N × M) time, O(H1) space for traversal + O(H2) for comparison.

---

## SECTION 17: VISUAL MIND MAP

```
                  ┌─────────────────────────────────┐
                  │             TREES                │
                  │  Self-similar hierarchical       │
                  │  structure: every subtree        │
                  │  is itself a tree                │
                  └──────────────┬──────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
     ┌────────────┐      ┌──────────────┐     ┌──────────────┐
     │  RECURSION │      │     DFS      │     │ TERMINOLOGY  │
     │            │      │              │     │              │
     │ Trust the  │      │ Call stack   │     │ Root,Parent  │
     │ smaller    │      │ = DFS stack  │     │ Child,Leaf   │
     │ version    │      │ automatically│     │ Height,Depth │
     └─────┬──────┘      └──────┬───────┘     └──────────────┘
           │                    │
     ┌─────▼──────────────────┐ │
     │   THE MAGIC QUESTION   │ │
     │ "What should each      │ │
     │  node RETURN to its    │ │
     │  parent?"              │ │
     └─────┬──────────────────┘ │
           │                    │
     ┌─────▼──────────────────┐ │
     │   INFORMATION FLOW     │◄┘
     │                        │
     │  TOP-DOWN (parameters) │
     │  BOTTOM-UP (returns)   │
     └─────┬──────────────────┘
           │
     ┌─────▼────────────────────────────────────────┐
     │               TRAVERSALS                     │
     ├───────────────┬──────────────┬───────────────┤
     │   PREORDER    │   INORDER    │  POSTORDER    │
     │ Root→L→R      │ L→Root→R    │  L→R→Root     │
     │ Use: serialize│ Use: BSTs,  │  Use: height  │
     │ copy tree     │ sorted order │  diameter     │
     │               │              │  most hard    │
     └───────────────┴──────────────┴───────────────┘
           │
     ┌─────▼───────────────────────────────────────┐
     │              5 PATTERNS                     │
     ├──────────┬─────────┬────────┬───────┬───────┤
     │  Visit   │Collect  │  Pass  │ Path  │Subtree│
     │  Every   │From     │  Down  │ Based │ Based │
     │  Node    │Children │  ward  │       │       │
     └──────────┴─────────┴────────┴───────┴───────┘
           │
     ┌─────▼──────────────────────────────────────┐
     │            COMPLEXITY                      │
     │                                            │
     │  Time: O(N) for single-pass DFS            │
     │  Space: O(H)  ← stack depth = height       │
     │                                            │
     │  Balanced tree: H = O(log N) → O(log N) sp │
     │  Skewed tree:   H = O(N)    → O(N) space   │
     └────────────────────────────────────────────┘
```

---

## SECTION 18: PRACTICE PROBLEMS

### BEGINNER (5 Problems)

---

**B1: Maximum Depth of Binary Tree**
*"Given a binary tree, return its maximum depth (number of levels)."*

- **Pattern:** Bottom-up aggregation (Pattern 2). Postorder.
- **Recursive thinking:** Each node asks: what's the depth of my left subtree? Right subtree? My depth = 1 + max of those. Null returns 0 (or -1, depending on convention).
- **Complexity:** Time O(N) — visit every node once. Space O(H).
- **Key lesson:** The simplest bottom-up tree problem. Master this first. Understand how the answer bubbles up from leaves to root. This exact pattern underlies dozens of problems.

---

**B2: Symmetric Tree**
*"Is a binary tree a mirror image of itself?"*

- **Pattern:** Subtree comparison — compare left subtree and right subtree recursively.
- **Recursive thinking:** Reformulate: are node.left and node.right mirror images? Two nodes are mirror images if: they have the same value, the left child of one mirrors the right child of the other, and vice versa. Recurse on (node.left.left, node.right.right) and (node.left.right, node.right.left) simultaneously.
- **Complexity:** Time O(N) — visit each node at most twice. Space O(H).
- **Key lesson:** Sometimes the natural recursive question ("is this tree symmetric?") becomes clearer when reformulated ("are these two subtrees mirrors?"). Practice reformulating.

---

**B3: Invert Binary Tree**
*"Given a binary tree, invert it (mirror it left-right)."*

- **Pattern:** Visit every node (Pattern 1) — preorder.
- **Recursive thinking:** Inverting a tree = swap the left and right children of every node. At each node: swap its children, then recursively invert the left subtree (originally right), then the right (originally left). The swap at THIS node happens before recursion → preorder.
- **Complexity:** Time O(N), Space O(H).
- **Key lesson:** Simple preorder mutation. The key insight: after swapping, recursing on "left" visits what was originally the right subtree. This is fine — you just swap first, then recurse.

---

**B4: Same Tree**
*"Given two binary trees, return true if they are structurally identical with the same values."*

- **Pattern:** Simultaneous traversal of two trees — bottom-up or simple recursive check.
- **Recursive thinking:** Two trees are the same if: both null (true), one null and one not (false), values differ (false), OR values match AND left subtrees are same AND right subtrees are same. The last condition is the recursive step.
- **Complexity:** Time O(min(N, M)) — stop as soon as a mismatch found. Space O(min(H1, H2)).
- **Key lesson:** Building block for harder problems (subtree check, symmetric tree). Master the pattern of "check two trees simultaneously."

---

**B5: Path Sum**
*"Does any root-to-leaf path sum to target?"*

- **Pattern:** Top-down state passing (Pattern 3).
- **Recursive thinking:** Pass `remaining = target - current_node.value` downward. At a leaf: check if remaining == 0. At an internal node: return (path exists in left subtree OR path exists in right subtree).
- **Complexity:** Time O(N) — might visit every node in the worst case. Space O(H).
- **Key lesson:** The "remaining sum" top-down pattern. Notice: a leaf node is where you CHECK — not null. Null after a leaf should return false. Confusing leaf-check with null-check is a common mistake here.

---

### EASY (5 Problems)

---

**E1: Diameter of Binary Tree**
*"Return the length of the longest path between any two nodes."*

- **Pattern:** Subtree-based (Pattern 5) — return height, update global diameter.
- **Recursive thinking:** The diameter through a given node = left_height + right_height + 2 (edges). But you return HEIGHT to parent (because parent needs heights for its OWN diameter computation). Use a global variable to track the maximum diameter seen across all nodes.
- **Complexity:** Time O(N), Space O(H).
- **Key lesson:** Classic example of return value ≠ answer. Deeply internalize: what you RETURN and what you're LOOKING FOR are often different. This split thinking is essential for hard problems.

---

**E2: Binary Tree Level Order Traversal**
*"Return values level by level."*

- **Pattern:** BFS with a queue — NOT the standard DFS recursion.
- **Recursive thinking (alternative):** Can use DFS with a `depth` parameter: pass depth top-down (Pattern 3), append node value to result[depth]. This is a valid DFS solution.
- **Complexity:** Time O(N), Space O(W) for BFS where W = max width.
- **Key lesson:** Not every tree problem needs DFS recursion. BFS is cleaner when the problem is explicitly "level by level." But knowing the DFS alternative (pass depth parameter) demonstrates deeper understanding.

---

**E3: Count Complete Tree Nodes**
*"Count nodes in a complete binary tree (last level may not be full)."*

- **Pattern:** Exploits the complete tree structure — don't just do O(N) traversal.
- **Recursive thinking:** At each node, find the leftmost depth (go always left) and rightmost depth (go always right). If equal → perfect binary tree rooted here → 2^depth - 1 nodes, compute directly. If unequal → recurse on both subtrees. For a complete tree, at least one subtree is always a perfect binary tree.
- **Complexity:** Time O(log²N) — at each of O(log N) levels, compute depth in O(log N). Space O(log N).
- **Key lesson:** Problem-specific optimization can dramatically improve over the naive O(N). Recognizing the complete-tree structure unlocks a fundamentally better algorithm. Think before blindly traversing.

---

**E4: Validate Binary Search Tree**
*"Is this tree a valid BST?"*

- **Pattern:** Top-down range passing (Pattern 3).
- **Recursive thinking:** Each node must satisfy: min_bound < node.val < max_bound. Pass these bounds downward. Left subtree: max_bound = node.val. Right subtree: min_bound = node.val. Initial bounds: (-∞, +∞). Common mistake: only checking parent-child relationship (doesn't catch grandchild violations).
- **Complexity:** Time O(N), Space O(H).
- **Key lesson:** The bounds-passing pattern is the canonical BST validation approach. The naive "left < node < right" check is WRONG. Stress-test your understanding with examples like [5, 4, 6, null, null, 3, 7] — where 3 < 5 but is in the right subtree.

---

**E5: Subtree of Another Tree**
*"Is tree T2 a subtree of tree T1?"*

- **Pattern:** Subtree-based (Pattern 5) combined with same-tree check.
- **Recursive thinking:** At every node of T1, check if T2 is rooted here (using the Same Tree function from B4). If yes, return true. Otherwise, check if T2 is a subtree of T1's left or right subtrees. The isSameTree check is O(M) per node.
- **Complexity:** Time O(N × M), Space O(H1 + H2).
- **Key lesson:** Combining two recursive functions (isSubtree and isSameTree). Knowing how to compose tree functions is a valuable interview skill.

---

### MEDIUM (10 Problems)

---

**M1: Binary Tree Maximum Path Sum**
*"Find the path (any node to any node) with the maximum sum. Values can be negative."*

- **Pattern:** Subtree-based (Pattern 5) with global maximum.
- **Recursive thinking:** What each node returns: the maximum "gain" it can contribute to a path going UPWARD through its parent. Gain = node.val + max(0, left_gain) + max(0, right_gain) — use 0 instead of negative child, because including a negative child hurts. The path through THIS node = node.val + max(0, left_gain) + max(0, right_gain). Update global max with this path. Return: node.val + max(0, max(left_gain, right_gain)) — you can only pick ONE direction to continue upward (not both).
- **Complexity:** Time O(N), Space O(H).
- **Key lesson:** The "you can take both children for local computation but must pick one to return upward" pattern. Extremely common in hard tree problems.

---

**M2: Lowest Common Ancestor**
*"Given binary tree and nodes p, q — find their lowest common ancestor."*

- **Pattern:** Bottom-up aggregation with nuanced return logic.
- **Recursive thinking:** Return the LCA if found, else null. If node == p or node == q, return node (don't recurse further). If both children return non-null, this node IS the LCA. If only one child returns non-null, propagate that result. The elegance: if p is an ancestor of q, then when we find p and return it, the recursion naturally handles q being in p's subtree.
- **Complexity:** Time O(N), Space O(H).
- **Key lesson:** Return semantics can be non-obvious. Practice articulating precisely: "I return the LCA if found in my subtree, or null if neither p nor q is in my subtree."

---

**M3: Construct Binary Tree from Preorder and Inorder Traversal**
*"Reconstruct the binary tree given its preorder and inorder sequences."*

- **Pattern:** Divide and conquer on arrays.
- **Recursive thinking:** Preorder[0] is always the root. Find that value in inorder: everything to its left is the left subtree, everything to its right is the right subtree. The size of the left inorder section tells you how many elements belong to the left subtree in preorder. Recurse on each part.
- **Complexity:** Time O(N²) naive (linear search in inorder each time), O(N) with hash map. Space O(N).
- **Key lesson:** Tree reconstruction = divide-and-conquer on the sequence. The index arithmetic is the tricky part — practice tracing through a 3-node example.

---

**M4: Flatten Binary Tree to Linked List**
*"Flatten a binary tree in-place to a linked list (using right pointers, in preorder)."*

- **Pattern:** Subtree-based postorder modification.
- **Recursive thinking:** Flatten the left subtree and right subtree first (postorder). Then: attach the flattened left list to root.right, move it there, set root.left = null, traverse to the end of the (originally left) list, attach the flattened right list there.
- **Complexity:** Time O(N), Space O(H).
- **Key lesson:** In-place tree modification requires postorder thinking. Children must be flattened BEFORE you reconnect them. Trying to flatten top-down gets messy.

---

**M5: Kth Smallest Element in BST**
*"Find the kth smallest value in a BST."*

- **Pattern:** Inorder traversal with counter (combination of Pattern 1 and top-down state).
- **Recursive thinking:** Inorder gives sorted order. Pass a counter down; decrement when visiting each node; stop when counter hits 0. Alternatively, use a global counter and set a "found" flag.
- **Complexity:** Time O(H + k) — traverse to kth element. Space O(H).
- **Key lesson:** BST + "kth" → immediately think inorder. This association should be automatic. The inorder-gives-sorted-order property is one of the most important BST properties in interviews.

---

**M6: Sum Root to Leaf Numbers**
*"Each root-to-leaf path forms a number. Return the total sum of all these numbers."*

- **Pattern:** Top-down state passing (Pattern 3) combined with bottom-up aggregation.
- **Recursive thinking:** Pass the "current number so far" downward: current = current * 10 + node.val. At a leaf, return current (this leaf's complete number). Internal nodes return left_sum + right_sum.
- **Complexity:** Time O(N), Space O(H).
- **Key lesson:** Elegant combination of top-down (building the number) and bottom-up (summing at leaves). The "build a number digit by digit as you go down" pattern appears in problems like root-to-leaf path to string.

---

**M7: Find All Paths with Given Sum**
*"Return all root-to-leaf paths where values sum to target."*

- **Pattern:** Path-based (Pattern 4) with backtracking.
- **Recursive thinking:** Pass current path and remaining sum downward. At leaf: if remaining == node.val, add path to results. Otherwise return. After exploring both children, REMOVE current node from path (backtrack). This restores the path for the next branch.
- **Complexity:** Time O(N·H) — copying path at leaves costs O(H) each, up to N/2 leaves. Space O(H) for stack.
- **Key lesson:** Path problems require backtracking (explicit undo). This is where tree DFS intersects with backtracking. The pattern of "append, recurse, pop" appears in countless interview problems.

---

**M8: Binary Tree Zigzag Level Order Traversal**
*"Return level-order traversal, but alternate direction: left-to-right, then right-to-left."*

- **Pattern:** BFS (level order) with direction flag — OR DFS with depth parameter.
- **Recursive thinking (DFS):** Pass depth down (Pattern 3). If depth is even, append to front of result[depth]; if odd, append to back. This achieves zigzag without BFS.
- **Complexity:** Time O(N), Space O(N) for result.
- **Key lesson:** Level-aware DFS using depth parameter. When a problem alternates behavior by level, the depth parameter switches the logic.

---

**M9: Recover Binary Search Tree**
*"Two nodes of a BST are swapped by mistake. Recover the tree."*

- **Pattern:** Inorder traversal with state tracking.
- **Recursive thinking:** Inorder of a valid BST is sorted. When two nodes are swapped, the inorder sequence will have at most two "inversions" (places where previous > current). Find the two culprit nodes (first is the larger of the first inversion pair; second is the smaller of the last inversion pair). Swap their values.
- **Complexity:** Time O(N), Space O(H). Can do O(1) space with Morris traversal.
- **Key lesson:** BST problems often reduce to "what's wrong with inorder?" Wrong inorder → wrong BST. Finding the anomaly in the sorted sequence solves the problem.

---

**M10: Right Side View of Binary Tree**
*"Return the values visible when looking at the tree from the right side."*

- **Pattern:** DFS with depth tracking (Pattern 3 — top-down) OR BFS (take last element of each level).
- **Recursive thinking (DFS):** Pass depth down. Traverse right subtree BEFORE left. The first node visited at each depth = rightmost node at that depth. Store depth → value mapping.
- **Complexity:** Time O(N), Space O(H).
- **Key lesson:** "Visible from right" = "rightmost node at each depth." Traversing right-before-left in DFS ensures you see the rightmost node first at each depth. Elegantly solves without BFS.

---

## SECTION 19: SPEAKING NOTES

*Mental anchors for natural explanation — not a script.*

---

### Opening Hook

> "Trees are the most recursive data structure ever created. They're not recursive because we want them to be — they're recursive because that's how they're defined. Every subtree is a tree. That means every tree problem is secretly a smaller version of itself."

---

### Why Trees Love Recursion

Key anchors:
- The self-similarity property: a subtree IS a tree
- The trust principle: when you recurse, you trust the smaller solution works
- Examples: height of tree, sum of all nodes, count of nodes — all reduce to "do it for children, combine"
- Contrast: iterative tree traversal requires manually simulating what recursion does automatically

---

### The Magic Question

Key anchors:
- "What should this node RETURN to its parent?"
- This one question unlocks most tree problems
- Return type hints at the approach: integer = aggregation, boolean = validation, node = search, tuple = complex validation
- Diameter example: you return HEIGHT, not diameter — the answer and the return value are different!
- State the return value explicitly before writing any code

---

### DFS Thinking

Key anchors:
- DFS = go deep first, come back, explore next branch
- Recursion IS DFS — the call stack is the DFS stack
- Visualize: at the deepest point, the stack holds one frame per node on the current path
- Maximum stack depth = height of tree = O(H) space

---

### Preorder

Key anchors:
- Root first, then left subtree, then right subtree
- "I introduce myself before my children"
- Use cases: serialization, copying, prefix expressions
- Key signal: problems that need parent info BEFORE going deeper

---

### Inorder

Key anchors:
- Left subtree, then root, then right subtree
- "I speak after all smaller values have spoken"
- BST superpower: inorder = sorted order
- Key signal: BST + "kth smallest" or "sorted" → immediately inorder

---

### Postorder

Key anchors:
- Left subtree, then right subtree, then root
- "My children finish before I do"
- The most important traversal for hard problems
- Key signal: "answer at this node depends on children's answers" → postorder

---

### Information Flow

Key anchors:
- Two directions: top-down (parameters) and bottom-up (return values)
- Top-down: when node needs to know about its ancestors (depth, remaining sum, valid range)
- Bottom-up: when parent needs to aggregate children's results (height, sum, validity)
- Hybrid: when you need both (complex path problems)
- "Which direction does the information you need travel?"

---

### Interview Insights

Key anchors:
- State the pattern before coding
- Explicitly answer the magic question before coding
- Google evaluates: pattern recognition + precise state definition + complexity analysis
- Always distinguish: balanced tree complexity (O(log N) space) vs skewed (O(N) space)
- Follow-up pattern: interviewer will push on edge cases (negative values, skewed tree, null tree)

---

### Common Mistakes

Key anchors:
- Forgetting null check at the start (every tree function!)
- Wrong base case (off-by-one in height: null returns -1, not 0)
- Returning the wrong information (diameter vs height)
- Forgetting to backtrack in path problems (pop after recursion)
- Claiming O(N log N) for simple DFS (it's O(N))

---

### Summary

> "Tree recursion is three questions: What does each node return? What do the base cases return? What does each internal node compute from its children? Answer these three precisely — in English, before touching code — and the implementation becomes obvious."

---

## SECTION 20: GOOGLE-STYLE THINKING EXERCISES

*10 unseen tree problems. No solutions. Focus entirely on thought process.*

---

**Exercise 1:**
*"Find the vertical order traversal of a binary tree — nodes in the same vertical column are listed top-to-bottom, and within the same column+row, sorted by value."*

- **Pattern to recognize:** DFS with coordinate tracking (top-down) + grouping/sorting.
- **What each node returns:** Nothing — side effect of updating a map from (column) → list of (row, value) pairs.
- **What flows downward:** Column index (root=0, left child=col-1, right child=col+1) and row/depth.
- **Traversal style:** Any DFS works (preorder), since you're collecting coordinates, not relying on traversal order.
- **Complexity discussion:** Time O(N log N) — sorting within columns. Space O(N) for the map.

---

**Exercise 2:**
*"In a binary tree, find the number of nodes that are 'good' — a node is good if no node on the path from root to it has a value greater than it."*

- **Pattern to recognize:** Top-down state passing (Pattern 3). Pass the maximum value seen so far on the root-to-current path.
- **What each node returns:** Count of good nodes in its subtree (integer).
- **What flows downward:** max_so_far = max(parent's max_so_far, parent's value).
- **Traversal style:** Preorder thinking — check this node with inherited max before recursing.
- **Complexity discussion:** O(N) time, O(H) space.

---

**Exercise 3:**
*"Serialize and deserialize a binary tree — convert to a string and back."*

- **Pattern to recognize:** Preorder traversal (serialize), then preorder reconstruction (deserialize).
- **What each node returns (serialize):** Its preorder string representation.
- **What each node returns (deserialize):** The reconstructed tree node, consuming from a queue/iterator of tokens.
- **Traversal style:** Preorder — root first, then left, then right. Null nodes are encoded as a special marker.
- **Complexity discussion:** O(N) time and O(N) space for both operations. The key insight: preorder uniquely identifies a tree when null nodes are recorded.

---

**Exercise 4:**
*"Given a binary tree, find the length of the longest path where all node values are the same (univalue path). The path doesn't need to pass through the root."*

- **Pattern to recognize:** Subtree-based (Pattern 5) — return the longest univalue "arm" extending from this node, update global max with both arms.
- **What each node returns:** The length of the longest univalue chain that starts at this node and goes downward. If child has same value, chain extends; otherwise, chain = 0.
- **Why the global variable matters:** The longest path might pass through any node, not just the root.
- **Traversal style:** Postorder — need children's chain lengths before computing current node's contribution.
- **Complexity discussion:** O(N) time, O(H) space.

---

**Exercise 5:**
*"Given a BST, find the kth largest element."*

- **Pattern to recognize:** Reverse inorder (right → root → left) gives descending order. Kth in descending = kth largest.
- **What each node returns:** Nothing meaningful — side effect of counting to k.
- **What flows downward:** Counter k, or use a global counter.
- **Traversal style:** Reverse inorder (right subtree first).
- **Complexity discussion:** O(H + k) time — traverse to the kth element from the right. O(H) space. Note: this is NOT O(N) if k is small and tree is balanced.

---

**Exercise 6:**
*"Merge two binary trees — overlapping nodes are summed; non-overlapping nodes are kept as-is."*

- **Pattern to recognize:** Simultaneous traversal of two trees (like Same Tree, but with merging).
- **What each node returns:** The merged tree node.
- **Logic:** If one is null, return the other. If both exist, add values, recurse on children pairs. If both null, return null.
- **Traversal style:** Preorder — create/modify root node first, then recurse on children.
- **Complexity discussion:** O(min(N,M)) time — stop early if one tree runs out. Space O(min(H1, H2)).

---

**Exercise 7:**
*"In a binary tree, find all nodes that are at distance k from a given target node."*

- **Pattern to recognize:** This problem has distance in TWO directions — downward (into subtrees) and upward (back to ancestors, then down other branches). Requires parent pointers or two-phase approach.
- **What each node returns:** Distance from this node to the target if target is in its subtree, or -1 if not.
- **Strategy:** When going down and you find the node at distance d from target, you can also go UP by d and find nodes at distance k from target on the other branch. Return d+1 to parent, who can explore its OTHER child at remaining distance.
- **Traversal style:** DFS postorder — find target in subtree, compute distances.
- **Complexity discussion:** O(N) time, O(N) space (parent map or recursion stack for all nodes).

---

**Exercise 8:**
*"Given a binary tree with 0s and 1s, remove all subtrees that consist entirely of 0s."*

- **Pattern to recognize:** Postorder — you must check children FIRST before deciding to prune current node.
- **What each node returns:** The node itself if it should stay, or null if it should be removed.
- **Logic:** Recursively prune left and right subtrees first. Then: if current node = 0 AND both children are null (after pruning) → return null. Otherwise → return current node.
- **Why postorder is essential:** You can't decide whether to remove this node until you know if its subtrees are all-zeros. Children must be resolved first.
- **Complexity discussion:** O(N) time, O(H) space.

---

**Exercise 9:**
*"Find the maximum width of a binary tree (maximum number of nodes in any level, including nulls between leftmost and rightmost non-null nodes)."*

- **Pattern to recognize:** BFS (level order) with index assignment — OR DFS with depth + index tracking.
- **What each node carries:** A positional index (root=0, left child=2i, right child=2i+1 — like a heap's array representation).
- **Width of a level:** last_index - first_index + 1.
- **Traversal style:** BFS (natural for level-by-level) or DFS with (depth, index) top-down.
- **Complexity discussion:** O(N) time, O(W) space for BFS where W = max width. Caution: index can overflow for deep trees — normalize indices at each level.

---

**Exercise 10:**
*"Convert a Binary Search Tree to a sorted circular doubly linked list in-place."*

- **Pattern to recognize:** Inorder traversal (BST → sorted order) with pointer manipulation instead of value collection.
- **What each node returns:** Nothing — the modification is in-place.
- **State flowing through recursion:** Previous node in the inorder sequence (to link nodes as you go).
- **Logic:** Inorder traversal. When visiting a node: link previous.right = current and current.left = previous. Update previous = current. After full traversal, link head and tail to close the circle.
- **Traversal style:** Inorder — because you're building a sorted structure.
- **Complexity discussion:** O(N) time, O(H) space for recursion stack. O(1) extra space ignoring the call stack.

---

## SECTION 21: SELF-ASSESSMENT

### 15 Conceptual Questions

1. Explain from first principles why every subtree of a binary tree is itself a binary tree. How does this property directly motivate using recursion for tree problems?

2. What is the difference between the height and depth of a node? If a tree has N nodes and is perfectly balanced, what are the maximum height and maximum depth? Are they always equal?

3. In the recursive computation of tree height, why does a null node return -1 instead of 0? What would go wrong if it returned 0?

4. Why is postorder traversal the natural choice for problems where a node's answer depends on its children? Give two concrete examples and explain the dependency.

5. Explain the distinction between top-down and bottom-up information flow in tree recursion. For each direction, give a problem where that direction is the natural fit and explain why.

6. For the diameter problem, explain precisely why each node should return its height rather than its diameter. What would break if each node returned the diameter of its subtree?

7. What is the maximum depth of the recursion call stack when traversing a balanced binary tree with N nodes? What about a completely skewed tree? Why does this matter in practice?

8. In the Lowest Common Ancestor problem, why do we return the node itself when we find p or q, even if the other target might be in that node's subtree? Why does this still give the correct answer?

9. Explain why inorder traversal of a BST produces a sorted sequence. Start from the BST property definition and derive why the traversal order must be sorted.

10. For balanced tree validation, explain why using -1 as a sentinel value (for "unbalanced") is more elegant than using a global boolean flag. What does this tell you about designing recursive return values?

11. When is BFS more appropriate than DFS for a tree problem? Give three concrete signals from a problem statement that should make you immediately reach for BFS.

12. Explain the "path-based" pattern and why it requires backtracking. What would happen if you forgot to remove the current node from the path after recursion? Give a concrete example of the wrong output.

13. A problem asks for the sum of all nodes. A student writes: `return node.val + sum(node.left) + sum(node.right)`. Another writes: `total += node.val; sum(node.left); sum(node.right)`. Both produce the correct answer. Explain the difference in design philosophy and when each approach is preferable.

14. For a skewed binary tree (each node has only a right child), what is the time and space complexity of a simple DFS traversal? How does this compare to a balanced tree?

15. A tree has N nodes. Another tree problem requires comparing every pair of nodes. What is the time complexity? Why is this O(N²) rather than O(N)?

---

### 10 Interview-Style Questions

1. *"You're given a binary tree. Write a function to find the second largest element. Walk me through your recursive thinking before writing anything."*

2. *"Your solution to 'find all root-to-leaf paths' runs correctly on balanced trees but causes a stack overflow on a chain-like input tree. How would you diagnose this? What's the root cause? How would you fix it?"*

3. *"I give you a binary tree problem. You write a recursive solution. I ask: what is the space complexity? You say O(H). I follow up: but the output array is also storing data. How do you account for that in space analysis?"*

4. *"You correctly solve the balanced tree problem in O(N). I ask: can you solve it in O(N) time AND O(1) extra space (not counting the call stack)? Is this even possible? Explain."*

5. *"Here is a binary tree: the root value is 5. You're asked to find the node with value 7. Describe your recursive approach. How does it change if the tree is a BST vs a general binary tree?"*

6. *"Two students give different solutions to 'invert binary tree.' Student A processes the root first, then swaps children, then recurses (preorder). Student B recurses first, then swaps (postorder). Are both correct? Does one have an edge case the other doesn't?"*

7. *"Write the algorithm to find the kth smallest element in a BST. After you explain it, I say: 'Now the BST is modified by frequent insertions and deletions. Calling this function 1000 times is too slow. How do you optimize?'"*

8. *"You claim your tree algorithm is O(N). I draw a specific tree on the whiteboard and ask you to count the exact number of recursive calls your algorithm makes. Demonstrate your claim."*

9. *"Given a tree with N nodes, your solution generates all root-to-leaf paths. You claim O(N × H) time. I push back: in a balanced binary tree, isn't the number of root-to-leaf paths O(N), and each has length O(log N)? That's O(N log N), not O(N × H). Who is right, and why?"*

10. *"I give you a very large binary tree (10 million nodes) and ask you to find the LCA of two nodes. Your recursive solution might hit stack overflow. How do you handle this? Walk me through alternatives."*

---

### 5 Advanced Reasoning Questions

1. Prove that the sum of all node heights in a balanced binary tree is O(N). This means the total work done in a naive "compute height for each node separately" approach is actually O(N), not O(N log N) as a student might assume. How does this relate to the O(N) complexity of a single postorder traversal?

2. Consider a binary tree where each node has a random value from 1 to 10^9. For a random query node q, the expected number of nodes you examine before finding q with a simple DFS is N/2. However, for a BST with the same values, you can find any node in O(H) time. Formalize why: what property of BSTs enables this, and what specific guarantee does the BST property provide that a random binary tree does not?

3. The Morris Traversal algorithm performs inorder traversal of a binary tree in O(N) time and O(1) extra space (no recursion, no explicit stack). It does this by temporarily modifying the tree (threading pointers) and then restoring it. Using your understanding of what the call stack does during inorder traversal, explain conceptually how Morris Traversal replaces the stack. What "information" does the stack normally hold that Morris Traversal must encode another way?

4. In the "Flatten Binary Tree to Linked List" problem, a student argues: "I can flatten top-down — flatten root's left, attach it between root and root's right, then flatten the new right subtree." Analyze this approach. Does it work? What is its time complexity? Compare it to the postorder approach. Which is more efficient and why?

5. Segment Trees and Fenwick Trees are tree data structures that support range queries and updates in O(log N). Their algorithms are all recursive. Using your understanding of tree recursion patterns — specifically information flow and postorder vs preorder thinking — explain: (a) when you BUILD a segment tree, which traversal order does it use, and why? (b) when you QUERY a segment tree for a range sum, is this top-down or bottom-up, and why?

---

*End of Day 4 Mastery Document*

---

> **Prioritized Next Steps:**
> 1. Draw the five tree traversal patterns (preorder, inorder, postorder, top-down, bottom-up) as diagrams on paper using a 7-node tree. No notes. Test recall.
> 2. Answer the magic question for the first 5 practice problems (B1–B5) IN WORDS before thinking about code: "My function returns ___ because the parent needs ___."
> 3. Trace the complete call stack (like Section 9) for height computation on a 5-node balanced tree. Write every stack frame.
> 4. Attempt Exercise 8 (subtree pruning) from Section 20 — it's a pure postorder problem, perfect for testing that pattern recognition.
> 5. Explain the diameter problem (why you return height, not diameter) out loud in under 90 seconds.
