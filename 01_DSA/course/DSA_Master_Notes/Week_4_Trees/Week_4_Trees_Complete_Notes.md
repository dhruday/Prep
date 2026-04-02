# 🌳 Week 4: Trees — Complete Master Notes

> **Goal**: Master tree data structures from basics to advanced patterns. After this, you'll solve tree problems with the intuition of a FAANG senior engineer.

---

## 📌 Table of Contents

1. [Basics of Trees](#1-basics-of-trees)
2. [Tree Traversals (DFS, BFS)](#2-tree-traversals-dfs-bfs)
3. [Recursive Tree Problems](#3-recursive-tree-problems)
4. [Binary Search Trees (BST)](#4-binary-search-trees-bst)
5. [Balanced Trees Concepts](#5-balanced-trees-concepts)
6. [Time Complexity Analysis](#6-time-complexity-analysis)
7. [LIVE Problem Solving Patterns](#7-live-problem-solving-patterns)

---

# 1. Basics of Trees

## 1.1 Concept Intuition (Real World Analogy)

### 🌳 The Family Tree Analogy
- **Root:** Your great-great-grandparent (top of tree)
- **Parent-Child:** Direct lineage
- **Siblings:** Children of same parent
- **Leaves:** People with no children (bottom of tree)
- **Ancestors:** All parents going up
- **Descendants:** All children going down

### 🏢 The Organization Chart Analogy
```
                    CEO (root)
                   /    |    \
              VP1      VP2      VP3 (children)
             /  \      /  \
          Mgr1 Mgr2  Mgr3 Mgr4 (grandchildren)
          /  \
       Emp1 Emp2 (leaves)
```

### 🎯 The Core Idea
```
Tree = Hierarchical data structure
     = One root node
     = Each node has zero or more children
     = No cycles (unlike graphs)
     = Represents hierarchical relationships
```

## 1.2 Core Theory (Simple Words)

### What is a Tree?

A **tree** is a data structure consisting of nodes connected by edges, where:
1. There's exactly ONE root node (no parent)
2. Every other node has exactly ONE parent
3. There are NO cycles
4. All nodes are connected (it's a connected graph)

### Tree Terminology:

```
               1 (root)
              / \
             2   3 (children of 1, siblings)
            / \   \
           4   5   6 (leaves - no children)
          /
         7 (leaf)

Key Terms:
- Root: Top node (1)
- Parent: Node with children (1, 2, 3)
- Child: Node with a parent (2, 3, 4, 5, 6, 7)
- Leaf: Node with no children (5, 6, 7)
- Siblings: Nodes with same parent (2 and 3)
- Internal node: Node with children (1, 2, 3)
- Edge: Connection between nodes
```

### Important Properties:

| Property | Value |
|----------|-------|
| **Height** | Longest path from root to leaf |
| **Depth** | Distance from root to node |
| **Level** | Depth + 1 (root is level 0 or 1, depends on convention) |
| **Size** | Total number of nodes |
| **Degree** | Number of children of a node |

### Height vs Depth:
```
               1        ← depth=0, level=0
              / \
             2   3      ← depth=1, level=1
            / \   \
           4   5   6    ← depth=2, level=2
          /
         7              ← depth=3, level=3

Height of tree = 3 (longest path: 1→2→4→7)
Height of node 2 = 2 (longest path from 2 to leaf: 2→4→7)
```

## 1.3 Types of Trees

### 1. **Binary Tree**
Each node has **at most 2 children** (left and right).

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

```
       1
      / \
     2   3
    / \
   4   5
```

### 2. **Binary Search Tree (BST)**
Binary tree with **ordering property**:
- Left subtree < Node < Right subtree

```
       5
      / \
     3   8
    / \   \
   1   4   9

All values in left < 5 < All values in right
```

### 3. **Complete Binary Tree**
All levels are full except possibly the last, which fills left to right.

```
       1
      / \
     2   3
    / \  /
   4  5 6    ✅ Complete

       1
      / \
     2   3
    /     \
   4       5  ❌ Not complete (gap in last level)
```

### 4. **Full Binary Tree**
Every node has 0 or 2 children (no node with 1 child).

```
       1
      / \
     2   3
    / \
   4   5    ✅ Full

       1
      / \
     2   3
    /
   4        ❌ Not full (node 2 has only 1 child)
```

### 5. **Perfect Binary Tree**
All internal nodes have 2 children AND all leaves at same level.

```
       1
      / \
     2   3
    / \ / \
   4  5 6  7  ✅ Perfect (2^h - 1 nodes)
```

### 6. **Balanced Binary Tree**
Height of left and right subtrees differ by at most 1, recursively.

```
       1
      / \
     2   3
    / \
   4   5    ✅ Balanced

       1
      /
     2
    /
   3
  /
 4          ❌ Unbalanced (skewed)
```

### 7. **N-ary Tree**
Each node can have up to N children.

```python
class Node:
    def __init__(self, val=0, children=None):
        self.val = val
        self.children = children if children else []
```

```
       1
     / | \
    2  3  4
   /|  |
  5 6  7
```

## 1.4 Tree Properties and Formulas

### For Binary Tree:

| Property | Formula | Example (h=3) |
|----------|---------|---------------|
| Max nodes at level L | 2^L | Level 2: 2^2 = 4 |
| Max nodes with height h | 2^(h+1) - 1 | 2^4 - 1 = 15 |
| Min nodes with height h | h + 1 | 3 + 1 = 4 |
| Height with n nodes | log₂(n) to n-1 | log₂(15)≈4 to 14 |
| Leaves in full BT | (n + 1) / 2 | (7+1)/2 = 4 |

### Relationship Between Nodes:
```
For binary tree with n nodes:
- n = n₀ + n₁ + n₂
  where n₀ = leaves, n₁ = nodes with 1 child, n₂ = nodes with 2 children

- n₀ = n₂ + 1 (in any binary tree!)
  (Number of leaves = Number of nodes with 2 children + 1)
```

## 1.5 Tree Representations

### 1. **Node Class (Most Common)**
```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

# Creating a tree
root = TreeNode(1)
root.left = TreeNode(2)
root.right = TreeNode(3)
root.left.left = TreeNode(4)
```

### 2. **Array Representation (Complete Binary Tree)**
```
For node at index i:
- Left child: 2*i + 1
- Right child: 2*i + 2
- Parent: (i - 1) // 2

       1           Array: [1, 2, 3, 4, 5, 6]
      / \          Index:  0  1  2  3  4  5
     2   3
    / \ /
   4  5 6

Index 1 (value 2):
- Left child: 2*1+1 = 3 (value 4)
- Right child: 2*1+2 = 4 (value 5)
- Parent: (1-1)//2 = 0 (value 1) ✅
```

**Advantage:** Space efficient for complete trees, easy parent/child access.
**Disadvantage:** Wastes space for sparse trees.

### 3. **Parent Array**
```python
parent = [-1, 0, 0, 1, 1, 2]
#         0   1  2  3  4  5
#        root  nodes...

parent[i] = index of parent of node i
parent[root] = -1
```

## 1.6 Common Tree Operations

### 1. **Creating a Node**
```python
def create_node(val):
    return TreeNode(val)
```

### 2. **Inserting a Node (General Tree)**
```python
def insert_left(parent, val):
    parent.left = TreeNode(val)

def insert_right(parent, val):
    parent.right = TreeNode(val)
```

### 3. **Finding Size**
```python
def size(root):
    if not root:
        return 0
    return 1 + size(root.left) + size(root.right)
```

### 4. **Finding Height**
```python
def height(root):
    if not root:
        return -1  # or 0, depends on definition
    return 1 + max(height(root.left), height(root.right))
```

### 5. **Checking if Empty**
```python
def is_empty(root):
    return root is None
```

## 1.7 Why Trees Matter

### Trees Model Real-World Hierarchies:
- **File systems:** Folders and files
- **Organization charts:** Company structure
- **HTML DOM:** Web page structure
- **Expression trees:** Mathematical expressions
- **Decision trees:** Machine learning
- **Family trees:** Genealogy

### Efficiency:
- **Search:** O(log n) in balanced trees vs O(n) in arrays
- **Insert/Delete:** O(log n) in balanced trees
- **Hierarchical relationships:** Natural representation

## 1.8 Mental Checklist for Tree Basics

```
□ What type of tree is it?
  □ Binary tree?
  □ Binary Search Tree?
  □ Complete? Full? Perfect? Balanced?

□ What properties does it have?
  □ How many nodes?
  □ What's the height?
  □ Is it balanced?

□ What representation is used?
  □ Node class?
  □ Array?
  □ Parent array?

□ What operation am I performing?
  □ Traversal?
  □ Search?
  □ Insert/Delete?
  □ Modification?
```

---

# 2. Tree Traversals (DFS, BFS)

## 2.1 Concept Intuition (Real World Analogy)

### 📚 The Library Analogy

**DFS (Depth-First Search):** 
- Like reading a book from start to finish before picking another
- Go deep into one topic before exploring others

**BFS (Breadth-First Search):**
- Like skimming all book titles on a shelf before diving into any
- Explore all options at current level before going deeper

### 🎯 The Core Idea
```
Traversal = Visiting every node exactly once
          = Different orders give different insights
          = Choice depends on problem requirements
```

## 2.2 Depth-First Search (DFS)

### The Three DFS Orders:

```
       1
      / \
     2   3
    / \
   4   5

Preorder (Root → Left → Right):   1, 2, 4, 5, 3
Inorder (Left → Root → Right):    4, 2, 5, 1, 3
Postorder (Left → Right → Root):  4, 5, 2, 3, 1
```

### Mnemonics:
- **Pre**order: Process root **before** (pre) children
- **In**order: Process root **in between** children
- **Post**order: Process root **after** (post) children

## 2.3 Preorder Traversal (Root → Left → Right)

### Recursive Implementation:
```python
def preorder(root):
    if not root:
        return []
    
    result = []
    result.append(root.val)           # Process root
    result.extend(preorder(root.left))    # Traverse left
    result.extend(preorder(root.right))   # Traverse right
    return result
```

### Iterative Implementation (Stack):
```python
def preorder_iterative(root):
    if not root:
        return []
    
    result = []
    stack = [root]
    
    while stack:
        node = stack.pop()
        result.append(node.val)       # Process current
        
        # Push right first so left is processed first
        if node.right:
            stack.append(node.right)
        if node.left:
            stack.append(node.left)
    
    return result
```

### When to Use Preorder:
- Creating a copy of tree
- Prefix expression evaluation
- Serializing a tree
- Tree topology problems

## 2.4 Inorder Traversal (Left → Root → Right)

### Recursive Implementation:
```python
def inorder(root):
    if not root:
        return []
    
    result = []
    result.extend(inorder(root.left))     # Traverse left
    result.append(root.val)               # Process root
    result.extend(inorder(root.right))    # Traverse right
    return result
```

### Iterative Implementation (Stack):
```python
def inorder_iterative(root):
    result = []
    stack = []
    current = root
    
    while current or stack:
        # Go to leftmost node
        while current:
            stack.append(current)
            current = current.left
        
        # Process node
        current = stack.pop()
        result.append(current.val)
        
        # Move to right subtree
        current = current.right
    
    return result
```

### When to Use Inorder:
- **BST:** Gives sorted order! (Most important use)
- Validating BST
- Finding kth smallest/largest in BST
- Converting BST to sorted array

## 2.5 Postorder Traversal (Left → Right → Root)

### Recursive Implementation:
```python
def postorder(root):
    if not root:
        return []
    
    result = []
    result.extend(postorder(root.left))    # Traverse left
    result.extend(postorder(root.right))   # Traverse right
    result.append(root.val)                # Process root
    return result
```

### Iterative Implementation (Two Stacks):
```python
def postorder_iterative(root):
    if not root:
        return []
    
    stack1 = [root]
    stack2 = []
    
    # Push to stack2 in reverse postorder
    while stack1:
        node = stack1.pop()
        stack2.append(node)
        
        if node.left:
            stack1.append(node.left)
        if node.right:
            stack1.append(node.right)
    
    # Pop stack2 for correct postorder
    result = []
    while stack2:
        result.append(stack2.pop().val)
    
    return result
```

### When to Use Postorder:
- Deleting a tree (delete children before parent)
- Computing height/size
- Postfix expression evaluation
- Finding space used by files in directories

## 2.6 Level Order Traversal (BFS)

### The Concept:
Visit nodes level by level, left to right.

```
       1           Level 0: [1]
      / \          Level 1: [2, 3]
     2   3         Level 2: [4, 5, 6]
    / \ /
   4  5 6

Output: [1, 2, 3, 4, 5, 6]
```

### Implementation (Queue):
```python
from collections import deque

def level_order(root):
    if not root:
        return []
    
    result = []
    queue = deque([root])
    
    while queue:
        node = queue.popleft()
        result.append(node.val)
        
        if node.left:
            queue.append(node.left)
        if node.right:
            queue.append(node.right)
    
    return result
```

### Level-by-Level (With Separation):
```python
def level_order_levels(root):
    if not root:
        return []
    
    result = []
    queue = deque([root])
    
    while queue:
        level_size = len(queue)
        current_level = []
        
        for _ in range(level_size):
            node = queue.popleft()
            current_level.append(node.val)
            
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        
        result.append(current_level)
    
    return result

# Output: [[1], [2, 3], [4, 5, 6]]
```

## 2.7 DFS vs BFS Comparison

| Aspect | DFS | BFS |
|--------|-----|-----|
| **Data Structure** | Stack (recursion or explicit) | Queue |
| **Space** | O(h) - height | O(w) - width |
| **Use Case** | Path finding, topology | Shortest path, level problems |
| **Memory** | Better for tall trees | Better for wide trees |
| **Implementation** | Simpler (recursion) | Requires queue |

### When to Use DFS:
- Tree/graph has many nodes, fewer branches (tall and narrow)
- Finding paths
- Topological sort
- Detecting cycles
- Exploring all possibilities

### When to Use BFS:
- Finding shortest path (unweighted)
- Level-based problems
- Nodes close to root more important
- Tree is very deep

## 2.8 Traversal Patterns and Tricks

### Pattern 1: Recursive Template
```python
def traverse(root):
    if not root:
        return base_case
    
    # Preorder: Process here
    
    left_result = traverse(root.left)
    
    # Inorder: Process here
    
    right_result = traverse(root.right)
    
    # Postorder: Process here
    
    return combine(left_result, right_result)
```

### Pattern 2: Iterative DFS with Explicit Stack
```python
def dfs_iterative(root):
    if not root:
        return []
    
    result = []
    stack = [root]
    
    while stack:
        node = stack.pop()
        result.append(node.val)
        
        # Add children (right first for left-first processing)
        if node.right:
            stack.append(node.right)
        if node.left:
            stack.append(node.left)
    
    return result
```

### Pattern 3: Morris Traversal (O(1) Space!)
Inorder without stack or recursion using threading.

```python
def morris_inorder(root):
    result = []
    current = root
    
    while current:
        if not current.left:
            # No left child, process and go right
            result.append(current.val)
            current = current.right
        else:
            # Find inorder predecessor
            pred = current.left
            while pred.right and pred.right != current:
                pred = pred.right
            
            if not pred.right:
                # Create thread
                pred.right = current
                current = current.left
            else:
                # Remove thread
                pred.right = None
                result.append(current.val)
                current = current.right
    
    return result
```

**Time:** O(n), **Space:** O(1) — Amazing for interviews!

## 2.9 Traversal Complexity

| Traversal | Time | Space (Recursive) | Space (Iterative) |
|-----------|------|-------------------|-------------------|
| Preorder | O(n) | O(h) | O(h) |
| Inorder | O(n) | O(h) | O(h) |
| Postorder | O(n) | O(h) | O(h) |
| Level Order | O(n) | - | O(w) |
| Morris | O(n) | - | O(1) |

Where:
- n = number of nodes
- h = height (O(log n) balanced, O(n) worst case)
- w = maximum width

## 2.10 Mental Checklist for Traversals

```
□ What order do I need to process nodes?
  □ Parent before children? → Preorder
  □ Children before parent? → Postorder
  □ Left before parent before right? → Inorder
  □ Level by level? → BFS

□ What's more important?
  □ Memory efficiency? → DFS (if tall), Morris
  □ Shortest path? → BFS
  □ Sorted order (BST)? → Inorder

□ Recursive or Iterative?
  □ Recursive: Simpler, uses call stack
  □ Iterative: More control, explicit stack/queue

□ Do I need to track levels?
  □ Yes → BFS with level counting
  □ No → Simple traversal
```

---

# 3. Recursive Tree Problems

## 3.1 The Recursive Mindset for Trees

### 🎯 The Golden Rule
```
Solve for root using solutions from left and right subtrees.

tree_property(root) = combine(
    tree_property(root.left),
    tree_property(root.right),
    root.val
)
```

### The Pattern:
1. **Base case:** What if tree is empty/single node?
2. **Recursive case:** Assume subtrees are solved, how to use them?
3. **Combine:** How to merge left, right, and current results?

## 3.2 Pattern 1: Compute a Value

### Problem: Tree Height
```python
def height(root):
    # Base case: empty tree
    if not root:
        return 0
    
    # Recursive case
    left_height = height(root.left)
    right_height = height(root.right)
    
    # Combine: max of subtrees + 1
    return 1 + max(left_height, right_height)
```

### Problem: Tree Size (Count Nodes)
```python
def size(root):
    if not root:
        return 0
    
    return 1 + size(root.left) + size(root.right)
```

### Problem: Sum of All Nodes
```python
def tree_sum(root):
    if not root:
        return 0
    
    return root.val + tree_sum(root.left) + tree_sum(root.right)
```

### Problem: Maximum Value in Tree
```python
def max_in_tree(root):
    if not root:
        return float('-inf')
    
    left_max = max_in_tree(root.left)
    right_max = max_in_tree(root.right)
    
    return max(root.val, left_max, right_max)
```

## 3.3 Pattern 2: Check a Property (Boolean)

### Problem: Is Tree Symmetric?
```python
def is_symmetric(root):
    def is_mirror(left, right):
        # Both null
        if not left and not right:
            return True
        # One null
        if not left or not right:
            return False
        # Check value and recurse
        return (left.val == right.val and
                is_mirror(left.left, right.right) and
                is_mirror(left.right, right.left))
    
    return is_mirror(root, root)
```

### Problem: Is Same Tree?
```python
def is_same_tree(p, q):
    # Both empty
    if not p and not q:
        return True
    # One empty
    if not p or not q:
        return False
    # Check value and both subtrees
    return (p.val == q.val and
            is_same_tree(p.left, q.left) and
            is_same_tree(p.right, q.right))
```

### Problem: Is Balanced?
Height of left and right subtrees differ by at most 1.

```python
def is_balanced(root):
    def check_height(node):
        if not node:
            return 0
        
        left_height = check_height(node.left)
        if left_height == -1:
            return -1
        
        right_height = check_height(node.right)
        if right_height == -1:
            return -1
        
        # Check if balanced
        if abs(left_height - right_height) > 1:
            return -1
        
        return 1 + max(left_height, right_height)
    
    return check_height(root) != -1
```

**Key Insight:** Return -1 to signal unbalanced, propagate up.

## 3.4 Pattern 3: Path Problems

### Problem: Has Path with Sum
```python
def has_path_sum(root, target_sum):
    if not root:
        return False
    
    # Leaf node: check if sum matches
    if not root.left and not root.right:
        return root.val == target_sum
    
    # Recurse: subtract current value from target
    return (has_path_sum(root.left, target_sum - root.val) or
            has_path_sum(root.right, target_sum - root.val))
```

### Problem: All Root-to-Leaf Paths
```python
def all_paths(root):
    if not root:
        return []
    
    # Leaf node
    if not root.left and not root.right:
        return [[root.val]]
    
    paths = []
    
    # Get paths from left subtree
    for path in all_paths(root.left):
        paths.append([root.val] + path)
    
    # Get paths from right subtree
    for path in all_paths(root.right):
        paths.append([root.val] + path)
    
    return paths
```

### Problem: Maximum Path Sum
```python
def max_path_sum(root):
    max_sum = [float('-inf')]  # Use list to modify in nested function
    
    def max_gain(node):
        if not node:
            return 0
        
        # Only take positive gains
        left_gain = max(max_gain(node.left), 0)
        right_gain = max(max_gain(node.right), 0)
        
        # Path through this node
        current_path = node.val + left_gain + right_gain
        
        # Update global max
        max_sum[0] = max(max_sum[0], current_path)
        
        # Return max gain if we continue path through parent
        return node.val + max(left_gain, right_gain)
    
    max_gain(root)
    return max_sum[0]
```

**Key Insight:** Each node considers: path through it vs path continuing up.

## 3.5 Pattern 4: Modification Problems

### Problem: Invert Binary Tree
```python
def invert_tree(root):
    if not root:
        return None
    
    # Swap children
    root.left, root.right = root.right, root.left
    
    # Recurse
    invert_tree(root.left)
    invert_tree(root.right)
    
    return root
```

### Problem: Flatten to Linked List (Preorder)
```python
def flatten(root):
    if not root:
        return
    
    # Flatten subtrees
    flatten(root.left)
    flatten(root.right)
    
    # Save right subtree
    right = root.right
    
    # Move left to right
    root.right = root.left
    root.left = None
    
    # Attach old right to end of new right
    current = root
    while current.right:
        current = current.right
    current.right = right
```

## 3.6 Pattern 5: Lowest Common Ancestor (LCA)

### Problem: LCA of Two Nodes
```python
def lowest_common_ancestor(root, p, q):
    # Base case
    if not root or root == p or root == q:
        return root
    
    # Look in left and right subtrees
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    
    # If both found, root is LCA
    if left and right:
        return root
    
    # Return whichever is not None
    return left if left else right
```

**Key Insight:**
- If both found in different subtrees → current node is LCA
- If both in same subtree → LCA is in that subtree

## 3.7 Pattern 6: Diameter/Width Problems

### Problem: Diameter of Binary Tree
Longest path between any two nodes (may not pass through root).

```python
def diameter(root):
    max_diameter = [0]
    
    def height(node):
        if not node:
            return 0
        
        left_height = height(node.left)
        right_height = height(node.right)
        
        # Diameter through this node
        max_diameter[0] = max(max_diameter[0], 
                             left_height + right_height)
        
        # Return height
        return 1 + max(left_height, right_height)
    
    height(root)
    return max_diameter[0]
```

## 3.8 Pattern 7: Building Trees

### Problem: Build from Preorder and Inorder
```python
def build_tree(preorder, inorder):
    if not preorder or not inorder:
        return None
    
    # First element in preorder is root
    root_val = preorder[0]
    root = TreeNode(root_val)
    
    # Find root in inorder
    mid = inorder.index(root_val)
    
    # Left subtree: left part of inorder
    root.left = build_tree(preorder[1:mid+1], inorder[:mid])
    
    # Right subtree: right part of inorder
    root.right = build_tree(preorder[mid+1:], inorder[mid+1:])
    
    return root
```

**Key Insight:**
- Preorder gives root
- Inorder splits left/right subtrees

## 3.9 The Recursive Template

```python
def solve_tree_problem(root):
    # BASE CASE
    if not root:
        return base_value
    
    # RECURSIVE CALLS
    left_result = solve_tree_problem(root.left)
    right_result = solve_tree_problem(root.right)
    
    # COMBINE
    current_result = combine(left_result, right_result, root.val)
    
    # SIDE EFFECTS (if needed)
    update_global_state(current_result)
    
    # RETURN
    return current_result
```

## 3.10 Mental Checklist for Recursive Tree Problems

```
□ BASE CASE
  □ What if tree is null?
  □ What if tree has single node?

□ RECURSIVE HYPOTHESIS
  □ Assume left and right subtrees are solved
  □ What do I get from them?

□ COMBINE
  □ How do I use left_result, right_result, and root.val?
  □ Do I need max? min? sum? boolean and/or?

□ GLOBAL STATE
  □ Do I need to track something across calls?
  □ Use list/dict for mutable reference

□ RETURN VALUE
  □ What should I return to parent?
  □ Is it different from what I track globally?
```

---

# 4. Binary Search Trees (BST)

## 4.1 Concept Intuition (Real World Analogy)

### 📖 The Dictionary Analogy
Looking up a word in a dictionary:
- Words are alphabetically ordered
- To find "middle": Open middle → if your word is before, look left half, else right
- Each step eliminates half the possibilities
- **That's binary search, BST enables this!**

### 🎯 The Core Idea
```
BST Property: For every node N:
- All nodes in left subtree < N
- All nodes in right subtree > N
- This applies recursively to all subtrees

Result: Inorder traversal gives SORTED sequence!
```

## 4.2 Core Theory

### BST Definition:
```
       5
      / \
     3   8
    / \   \
   1   4   9

Properties:
- 1, 3, 4 < 5 < 8, 9 ✅
- Inorder: 1, 3, 4, 5, 8, 9 (sorted!) ✅
```

### Why BSTs are Powerful:
| Operation | Average | Worst (Unbalanced) | Balanced |
|-----------|---------|-------------------|----------|
| Search | O(log n) | O(n) | O(log n) |
| Insert | O(log n) | O(n) | O(log n) |
| Delete | O(log n) | O(n) | O(log n) |
| Min/Max | O(log n) | O(n) | O(log n) |

## 4.3 BST Operations

### 1. Search
```python
def search(root, target):
    if not root or root.val == target:
        return root
    
    if target < root.val:
        return search(root.left, target)
    else:
        return search(root.right, target)

# Iterative
def search_iterative(root, target):
    while root and root.val != target:
        if target < root.val:
            root = root.left
        else:
            root = root.right
    return root
```

### 2. Insert
```python
def insert(root, val):
    if not root:
        return TreeNode(val)
    
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    
    return root

# Iterative
def insert_iterative(root, val):
    if not root:
        return TreeNode(val)
    
    current = root
    while True:
        if val < current.val:
            if not current.left:
                current.left = TreeNode(val)
                break
            current = current.left
        else:
            if not current.right:
                current.right = TreeNode(val)
                break
            current = current.right
    
    return root
```

### 3. Delete (Trickiest!)
```python
def delete(root, key):
    if not root:
        return None
    
    # Search for node to delete
    if key < root.val:
        root.left = delete(root.left, key)
    elif key > root.val:
        root.right = delete(root.right, key)
    else:
        # Found node to delete
        
        # Case 1: Leaf node or one child
        if not root.left:
            return root.right
        if not root.right:
            return root.left
        
        # Case 2: Two children
        # Find inorder successor (smallest in right subtree)
        successor = root.right
        while successor.left:
            successor = successor.left
        
        # Replace value
        root.val = successor.val
        
        # Delete successor
        root.right = delete(root.right, successor.val)
    
    return root
```

**Delete Cases:**
```
Case 1: Leaf node → Just remove

       5                5
      / \              /
     3   8     →      3
    /
   2 (delete)

Case 2: One child → Replace with child

       5                5
      / \              /
     3   8     →      4
      \
       4
   (delete 3)

Case 3: Two children → Replace with successor/predecessor

       5                6
      / \              / \
     3   8     →      3   8
    / \   \          / \
   2   4   9        2   4
       \
        6
   (delete 5, replace with successor 6)
```

### 4. Find Min/Max
```python
def find_min(root):
    if not root:
        return None
    while root.left:
        root = root.left
    return root.val

def find_max(root):
    if not root:
        return None
    while root.right:
        root = root.right
    return root.val
```

## 4.4 Validating BST

### Problem: Is Valid BST?

**WRONG approach:**
```python
def is_valid_bst_wrong(root):
    if not root:
        return True
    
    # ❌ Only checks immediate children!
    if root.left and root.left.val >= root.val:
        return False
    if root.right and root.right.val <= root.val:
        return False
    
    return is_valid_bst_wrong(root.left) and is_valid_bst_wrong(root.right)

# Fails for:
     5
    / \
   1   6
      / \
     4   7
# Node 4 < 5, but it's in right subtree! ❌
```

**CORRECT approach:**
```python
def is_valid_bst(root):
    def validate(node, min_val, max_val):
        if not node:
            return True
        
        # Check current node is in valid range
        if node.val <= min_val or node.val >= max_val:
            return False
        
        # Validate subtrees with updated ranges
        return (validate(node.left, min_val, node.val) and
                validate(node.right, node.val, max_val))
    
    return validate(root, float('-inf'), float('inf'))
```

**Key Insight:** Pass valid range down the tree!

## 4.5 BST to Sorted Array and Vice Versa

### BST → Sorted Array (Inorder)
```python
def bst_to_array(root):
    result = []
    
    def inorder(node):
        if not node:
            return
        inorder(node.left)
        result.append(node.val)
        inorder(node.right)
    
    inorder(root)
    return result
```

### Sorted Array → Balanced BST
```python
def sorted_array_to_bst(nums):
    if not nums:
        return None
    
    mid = len(nums) // 2
    root = TreeNode(nums[mid])
    
    root.left = sorted_array_to_bst(nums[:mid])
    root.right = sorted_array_to_bst(nums[mid+1:])
    
    return root
```

**Key Insight:** Pick middle element as root for balance!

## 4.6 Kth Smallest/Largest in BST

### Kth Smallest (Inorder)
```python
def kth_smallest(root, k):
    count = [0]
    result = [None]
    
    def inorder(node):
        if not node or result[0] is not None:
            return
        
        inorder(node.left)
        
        count[0] += 1
        if count[0] == k:
            result[0] = node.val
            return
        
        inorder(node.right)
    
    inorder(root)
    return result[0]
```

### Kth Largest
```python
def kth_largest(root, k):
    # Reverse inorder: right → root → left
    count = [0]
    result = [None]
    
    def reverse_inorder(node):
        if not node or result[0] is not None:
            return
        
        reverse_inorder(node.right)
        
        count[0] += 1
        if count[0] == k:
            result[0] = node.val
            return
        
        reverse_inorder(node.left)
    
    reverse_inorder(root)
    return result[0]
```

## 4.7 BST Iterator

Implement iterator with O(1) average time per next() call.

```python
class BSTIterator:
    def __init__(self, root):
        self.stack = []
        self._push_left(root)
    
    def _push_left(self, node):
        while node:
            self.stack.append(node)
            node = node.left
    
    def next(self):
        node = self.stack.pop()
        self._push_left(node.right)
        return node.val
    
    def has_next(self):
        return len(self.stack) > 0

# Usage
# iterator = BSTIterator(root)
# while iterator.has_next():
#     print(iterator.next())
```

## 4.8 Common BST Patterns

### Pattern 1: Range Queries
```python
def range_sum_bst(root, low, high):
    if not root:
        return 0
    
    # If current node < low, go right
    if root.val < low:
        return range_sum_bst(root.right, low, high)
    
    # If current node > high, go left
    if root.val > high:
        return range_sum_bst(root.left, low, high)
    
    # Current node in range
    return (root.val + 
            range_sum_bst(root.left, low, high) +
            range_sum_bst(root.right, low, high))
```

### Pattern 2: Closest Value
```python
def closest_value(root, target):
    closest = root.val
    
    while root:
        # Update closest if current is closer
        if abs(root.val - target) < abs(closest - target):
            closest = root.val
        
        # Go left or right based on target
        if target < root.val:
            root = root.left
        else:
            root = root.right
    
    return closest
```

## 4.9 Mental Checklist for BST Problems

```
□ Is the BST property maintained?
  □ Left < Root < Right (everywhere)?

□ What's the best traversal?
  □ Need sorted order? → Inorder
  □ Building tree? → Preorder
  □ Deleting tree? → Postorder

□ Can I use BST property to optimize?
  □ Eliminate half the tree each step?
  □ Valid range for values?

□ Do I need to validate it's a BST?
  □ Use range-based validation

□ Iterative or Recursive?
  □ Search/Insert: Iterative simpler
  □ Delete/Validate: Recursive cleaner
```

---

# 5. Balanced Trees Concepts

## 5.1 Why Balance Matters

### The Problem with Unbalanced Trees:

```
Balanced (O(log n) height):     Unbalanced (O(n) height):
       4                              1
      / \                              \
     2   6                              2
    / \ / \                              \
   1  3 5  7                              3
                                           \
                                            4
                                             \
Operations: O(log n) ✅                      5
                                          
                                     Operations: O(n) ❌
```

### Height Comparison:
| Tree Type | Height | Operations |
|-----------|--------|------------|
| Perfect | log₂(n) | O(log n) |
| Balanced | ≈ log₂(n) | O(log n) |
| Skewed | n | O(n) |

## 5.2 Balance Definition

### Strictly Balanced:
Every level except possibly the last is completely filled.

### Height-Balanced (Common Definition):
For every node, heights of left and right subtrees differ by at most 1.

```
Height-Balanced:               Not Height-Balanced:
       3                              3
      / \                            /
     2   4                          2
    /                              /
   1                              1
                                 /
                                0
|height_diff| ≤ 1 ✅          |height_diff| = 2 ❌
```

## 5.3 Checking if Tree is Balanced

```python
def is_balanced(root):
    def check(node):
        if not node:
            return 0  # Height of empty tree
        
        left_height = check(node.left)
        if left_height == -1:  # Left subtree unbalanced
            return -1
        
        right_height = check(node.right)
        if right_height == -1:  # Right subtree unbalanced
            return -1
        
        # Check if current node is balanced
        if abs(left_height - right_height) > 1:
            return -1
        
        return 1 + max(left_height, right_height)
    
    return check(root) != -1
```

**Time:** O(n) — each node visited once
**Space:** O(h) — recursion stack

## 5.4 Self-Balancing Trees (Overview)

### 1. AVL Trees
- **Strictly balanced:** Height difference ≤ 1
- **Rotations:** Single and double rotations
- **Height:** Always O(log n)
- **Use:** When lookups >> insertions/deletions

### 2. Red-Black Trees
- **Less strictly balanced:** Black height balanced
- **Rules:** 
  - Every node is red or black
  - Root and leaves (NIL) are black
  - Red nodes have black children
  - All paths from node to descendants have same number of black nodes
- **Height:** ≤ 2 log₂(n+1)
- **Use:** General purpose (e.g., C++ `std::map`)

### 3. B-Trees
- **Multi-way search trees:** Each node has multiple keys
- **Height:** Very shallow
- **Use:** Databases, file systems

## 5.5 AVL Tree Rotations (Conceptual)

### Single Right Rotation (LL Case):
```
       z                                y 
      / \                             /   \
     y   T4     Right Rotate (z)     x     z
    / \        - - - - - - - - ->   / \   / \
   x   T3                          T1 T2 T3 T4
  / \
 T1  T2
```

### Single Left Rotation (RR Case):
```
   z                                y
  / \                             /   \
 T1  y      Left Rotate(z)       z     x
    / \    - - - - - - - ->     / \   / \
   T2  x                       T1 T2 T3 T4
      / \
     T3 T4
```

### Left-Right Rotation (LR Case):
```
     z                            z                          x
    / \                          / \                       /   \
   y   T4  Left Rotate (y)      x   T4  Right Rotate(z)  y     z
  / \      - - - - - - - ->    / \       - - - - - - ->  / \   / \
 T1  x                        y   T3                    T1 T2 T3 T4
    / \                      / \
   T2 T3                    T1 T2
```

## 5.6 Balancing a BST

### Problem: Balance a BST
```python
def balance_bst(root):
    # Step 1: Inorder traversal to get sorted array
    nodes = []
    def inorder(node):
        if not node:
            return
        inorder(node.left)
        nodes.append(node.val)
        inorder(node.right)
    
    inorder(root)
    
    # Step 2: Build balanced BST from sorted array
    def build(left, right):
        if left > right:
            return None
        
        mid = (left + right) // 2
        node = TreeNode(nodes[mid])
        node.left = build(left, mid - 1)
        node.right = build(mid + 1, right)
        return node
    
    return build(0, len(nodes) - 1)
```

**Time:** O(n)  
**Space:** O(n)

## 5.7 Properties of Balanced Trees

| Property | Balanced Tree | Unbalanced (Worst) |
|----------|--------------|-------------------|
| Height | O(log n) | O(n) |
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| Space | O(n) | O(n) |

## 5.8 Interview Insights on Balance

### When Interviewers Ask About Balance:

**Q: "Is this tree balanced?"**
- Check height difference at each node ≤ 1

**Q: "How would you balance this BST?"**
- Inorder traversal → sorted array → build balanced tree from middle

**Q: "What's the height of a balanced tree with n nodes?"**
- ⌈log₂(n+1)⌉

**Q: "Why use self-balancing trees?"**
- Guarantee O(log n) operations even with adversarial input

---

# 6. Time Complexity Analysis

## 6.1 Tree Operation Complexities

### For General Binary Tree:

| Operation | Best | Average | Worst | Notes |
|-----------|------|---------|-------|-------|
| Access node | - | - | O(n) | No order, must search |
| Search | - | - | O(n) | No order |
| Insert | O(1) | O(1) | O(1) | If position known |
| Delete | O(1) | O(1) | O(1) | If position known |
| Traversal | O(n) | O(n) | O(n) | Must visit all |

### For Binary Search Tree:

| Operation | Balanced | Unbalanced (Worst) |
|-----------|----------|-------------------|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| Find Min/Max | O(log n) | O(n) |
| Successor/Predecessor | O(log n) | O(n) |
| Range Query | O(log n + k) | O(n) |

Where k = number of elements in range

### For Self-Balancing BST (AVL, Red-Black):

| Operation | Time Complexity |
|-----------|----------------|
| Search | O(log n) ✅ |
| Insert | O(log n) ✅ |
| Delete | O(log n) ✅ |
| Min/Max | O(log n) ✅ |

**Guaranteed** O(log n) due to balancing!

## 6.2 Space Complexity Analysis

### Recursive Algorithms:

| Algorithm | Space | Explanation |
|-----------|-------|-------------|
| Recursive traversal | O(h) | Call stack depth = height |
| Balanced tree | O(log n) | h = log n |
| Skewed tree | O(n) | h = n |

### Iterative Algorithms:

| Algorithm | Space | Explanation |
|-----------|-------|-------------|
| Iterative DFS | O(h) | Explicit stack |
| BFS | O(w) | Queue width |
| Morris Traversal | O(1) | No extra space! |

Where:
- h = height
- w = maximum width (nodes at a level)

### Worst Case Width:
```
For balanced tree:     For complete tree:
Max width ≈ n/2       Max width at last level = ⌈n/2⌉

     1                     1
    / \                   / \
   2   3                 2   3
  / \ / \               / \ /|
 4 5 6  7              4 5 6 7
```

## 6.3 Analyzing Specific Problems

### Example 1: Tree Height
```python
def height(root):
    if not root:
        return 0
    return 1 + max(height(root.left), height(root.right))
```

**Analysis:**
- Visits each node once: O(n)
- Each call does O(1) work
- **Time:** O(n)
- **Space:** O(h) for recursion stack

### Example 2: Path Sum
```python
def has_path_sum(root, target):
    if not root:
        return False
    if not root.left and not root.right:
        return root.val == target
    return (has_path_sum(root.left, target - root.val) or
            has_path_sum(root.right, target - root.val))
```

**Analysis:**
- Worst case: visit all nodes (no early return): O(n)
- Best case: find path quickly: O(log n) in balanced tree
- **Time:** O(n)
- **Space:** O(h)

### Example 3: Level Order Traversal
```python
def level_order(root):
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        node = queue.popleft()
        result.append(node.val)
        if node.left:
            queue.append(node.left)
        if node.right:
            queue.append(node.right)
    return result
```

**Analysis:**
- Each node enqueued and dequeued once: O(n)
- **Time:** O(n)
- **Space:** O(w) where w = max width ≈ n/2 = O(n)

### Example 4: Serialize and Deserialize
```python
def serialize(root):
    if not root:
        return "null"
    return f"{root.val},{serialize(root.left)},{serialize(root.right)}"

def deserialize(data):
    def helper(values):
        val = next(values)
        if val == "null":
            return None
        node = TreeNode(int(val))
        node.left = helper(values)
        node.right = helper(values)
        return node
    return helper(iter(data.split(',')))
```

**Analysis:**
- Serialize: Visit each node once: O(n)
- Deserialize: Process each token once: O(n)
- **Time:** O(n) for both
- **Space:** O(n) for storing string + O(h) for recursion

## 6.4 Complexity by Tree Type

### Complete Binary Tree (n nodes):
```
Height: ⌊log₂ n⌋
Max nodes at level i: 2^i
Total nodes in perfect tree: 2^(h+1) - 1
```

### Full Binary Tree (n nodes):
```
If n internal nodes: 2n + 1 total nodes
If n total nodes: (n-1)/2 internal nodes, (n+1)/2 leaves
```

### Perfect Binary Tree (height h):
```
Nodes: 2^(h+1) - 1
Leaves: 2^h
Internal nodes: 2^h - 1
```

## 6.5 Quick Complexity Reference

| Operation | Description | Time | Space |
|-----------|-------------|------|-------|
| **DFS** | All nodes | O(n) | O(h) |
| **BFS** | All nodes | O(n) | O(w) |
| **Search (BST)** | Find value | O(h) | O(1) iterative, O(h) recursive |
| **Insert (BST)** | Add node | O(h) | O(1) iterative, O(h) recursive |
| **Delete (BST)** | Remove node | O(h) | O(1) iterative, O(h) recursive |
| **LCA** | Lowest common ancestor | O(n) | O(h) |
| **Path exists** | Root to leaf | O(n) | O(h) |
| **Diameter** | Longest path | O(n) | O(h) |
| **Serialize** | To string | O(n) | O(n) |
| **Validate BST** | Check property | O(n) | O(h) |
| **Balance BST** | Rebalance | O(n) | O(n) |

## 6.6 Mental Math for Tree Complexity

### Quick Estimates:
```
Balanced tree with n nodes:
- Height ≈ log₂ n
- Operations ≈ O(log n)

Skewed tree with n nodes:
- Height = n
- Operations = O(n) (like linked list)

Perfect tree:
- n = 2^h - 1 nodes for height h
- h = ⌊log₂(n+1)⌋ - 1
```

### Space for Recursion:
```
Balanced tree:  O(log n)
Skewed tree:    O(n)
Complete tree:  O(log n)
```

---

# 7. LIVE Problem Solving Patterns

## 7.1 Pattern 1: DFS — Top-Down (Preorder)

**Use when:** Need to pass info from parent to children.

### Problem: Path Sum II (All Paths)
```python
def path_sum(root, target_sum):
    result = []
    
    def dfs(node, current_sum, path):
        if not node:
            return
        
        # Add current node
        path.append(node.val)
        current_sum += node.val
        
        # Check if leaf and sum matches
        if not node.left and not node.right and current_sum == target_sum:
            result.append(path[:])  # Copy!
        
        # Recurse
        dfs(node.left, current_sum, path)
        dfs(node.right, current_sum, path)
        
        # Backtrack
        path.pop()
    
    dfs(root, 0, [])
    return result
```

---

### Problem: Binary Tree Paths
```python
def binary_tree_paths(root):
    if not root:
        return []
    
    paths = []
    
    def dfs(node, path):
        if not node.left and not node.right:
            # Leaf: add path
            paths.append(path + str(node.val))
            return
        
        # Recurse with updated path
        if node.left:
            dfs(node.left, path + str(node.val) + "->")
        if node.right:
            dfs(node.right, path + str(node.val) + "->")
    
    dfs(root, "")
    return paths
```

---

## 7.2 Pattern 2: DFS — Bottom-Up (Postorder)

**Use when:** Need to collect info from children to compute parent.

### Problem: Maximum Depth
```python
def max_depth(root):
    if not root:
        return 0
    
    left_depth = max_depth(root.left)
    right_depth = max_depth(root.right)
    
    return 1 + max(left_depth, right_depth)
```

---

### Problem: Count Good Nodes
A node is "good" if no node in path from root has greater value.

```python
def good_nodes(root):
    def dfs(node, max_so_far):
        if not node:
            return 0
        
        # Is current node good?
        count = 1 if node.val >= max_so_far else 0
        
        # Update max
        new_max = max(max_so_far, node.val)
        
        # Count in subtrees
        count += dfs(node.left, new_max)
        count += dfs(node.right, new_max)
        
        return count
    
    return dfs(root, root.val)
```

---

### Problem: Subtree of Another Tree
```python
def is_subtree(root, sub_root):
    def is_same(p, q):
        if not p and not q:
            return True
        if not p or not q:
            return False
        return (p.val == q.val and
                is_same(p.left, q.left) and
                is_same(p.right, q.right))
    
    if not root:
        return False
    
    # Check if trees match from current root
    if is_same(root, sub_root):
        return True
    
    # Check in left and right subtrees
    return is_subtree(root.left, sub_root) or is_subtree(root.right, sub_root)
```

---

## 7.3 Pattern 3: BFS — Level Order

**Use when:** Need to process nodes level by level.

### Problem: Right Side View
```python
def right_side_view(root):
    if not root:
        return []
    
    result = []
    queue = deque([root])
    
    while queue:
        level_size = len(queue)
        
        for i in range(level_size):
            node = queue.popleft()
            
            # Rightmost node of level
            if i == level_size - 1:
                result.append(node.val)
            
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
    
    return result
```

---

### Problem: Zigzag Level Order
```python
def zigzag_level_order(root):
    if not root:
        return []
    
    result = []
    queue = deque([root])
    left_to_right = True
    
    while queue:
        level_size = len(queue)
        level = []
        
        for _ in range(level_size):
            node = queue.popleft()
            level.append(node.val)
            
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        
        # Reverse if needed
        if not left_to_right:
            level.reverse()
        
        result.append(level)
        left_to_right = not left_to_right
    
    return result
```

---

### Problem: Vertical Order Traversal
```python
def vertical_order(root):
    if not root:
        return []
    
    # column -> list of (row, val)
    columns = defaultdict(list)
    queue = deque([(root, 0, 0)])  # (node, row, col)
    
    while queue:
        node, row, col = queue.popleft()
        columns[col].append((row, node.val))
        
        if node.left:
            queue.append((node.left, row + 1, col - 1))
        if node.right:
            queue.append((node.right, row + 1, col + 1))
    
    # Sort columns and within each column sort by row
    result = []
    for col in sorted(columns.keys()):
        # Sort by row, then by value
        column_vals = [val for row, val in sorted(columns[col])]
        result.append(column_vals)
    
    return result
```

---

## 7.4 Pattern 4: BST Operations

### Problem: Convert BST to Greater Tree
Each node's value = sum of all nodes greater than or equal to it.

```python
def convert_bst(root):
    total = [0]  # Running sum
    
    def reverse_inorder(node):
        if not node:
            return
        
        # Right first (larger values)
        reverse_inorder(node.right)
        
        # Update current node
        total[0] += node.val
        node.val = total[0]
        
        # Left
        reverse_inorder(node.left)
    
    reverse_inorder(root)
    return root
```

---

### Problem: Inorder Successor in BST
```python
def inorder_successor(root, p):
    successor = None
    
    while root:
        if p.val < root.val:
            # Current could be successor, go left
            successor = root
            root = root.left
        else:
            # Go right
            root = root.right
    
    return successor
```

---

### Problem: Lowest Common Ancestor in BST
```python
def lowest_common_ancestor_bst(root, p, q):
    while root:
        # Both in left subtree
        if p.val < root.val and q.val < root.val:
            root = root.left
        # Both in right subtree
        elif p.val > root.val and q.val > root.val:
            root = root.right
        else:
            # Split point or one equals root
            return root
```

---

## 7.5 Pattern 5: Construction Problems

### Problem: Build Tree from Inorder and Postorder
```python
def build_tree(inorder, postorder):
    if not inorder or not postorder:
        return None
    
    # Last element in postorder is root
    root_val = postorder[-1]
    root = TreeNode(root_val)
    
    # Find root in inorder
    mid = inorder.index(root_val)
    
    # Build subtrees
    root.left = build_tree(inorder[:mid], postorder[:mid])
    root.right = build_tree(inorder[mid+1:], postorder[mid:-1])
    
    return root
```

---

### Problem: Serialize and Deserialize Binary Tree
```python
class Codec:
    def serialize(self, root):
        def dfs(node):
            if not node:
                vals.append("null")
                return
            vals.append(str(node.val))
            dfs(node.left)
            dfs(node.right)
        
        vals = []
        dfs(root)
        return ",".join(vals)
    
    def deserialize(self, data):
        def dfs():
            val = next(vals)
            if val == "null":
                return None
            node = TreeNode(int(val))
            node.left = dfs()
            node.right = dfs()
            return node
        
        vals = iter(data.split(","))
        return dfs()
```

---

## 7.6 Pattern 6: Tree Modification

### Problem: Delete Nodes and Return Forest
```python
def del_nodes(root, to_delete):
    to_delete_set = set(to_delete)
    forest = []
    
    def dfs(node, is_root):
        if not node:
            return None
        
        # Check if node should be deleted
        deleted = node.val in to_delete_set
        
        # If not deleted and is root, add to forest
        if is_root and not deleted:
            forest.append(node)
        
        # Recurse: children become roots if parent deleted
        node.left = dfs(node.left, deleted)
        node.right = dfs(node.right, deleted)
        
        # Return None if deleted, else return node
        return None if deleted else node
    
    dfs(root, True)
    return forest
```

---

### Problem: Trim BST to Range [low, high]
```python
def trim_bst(root, low, high):
    if not root:
        return None
    
    # If root < low, trim left subtree (all < low)
    if root.val < low:
        return trim_bst(root.right, low, high)
    
    # If root > high, trim right subtree (all > high)
    if root.val > high:
        return trim_bst(root.left, low, high)
    
    # Root in range, trim both subtrees
    root.left = trim_bst(root.left, low, high)
    root.right = trim_bst(root.right, low, high)
    
    return root
```

---

## 7.7 Pattern 7: Advanced Tree Problems

### Problem: All Nodes Distance K
Find all nodes at distance K from target node.

```python
def distance_k(root, target, k):
    # Build parent pointers
    parent = {}
    
    def build_parent(node, par):
        if not node:
            return
        parent[node] = par
        build_parent(node.left, node)
        build_parent(node.right, node)
    
    build_parent(root, None)
    
    # BFS from target
    queue = deque([(target, 0)])
    visited = {target}
    result = []
    
    while queue:
        node, dist = queue.popleft()
        
        if dist == k:
            result.append(node.val)
            continue
        
        # Explore neighbors (left, right, parent)
        for neighbor in [node.left, node.right, parent[node]]:
            if neighbor and neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1))
    
    return result
```

---

### Problem: Recover BST (Two Swapped Nodes)
```python
def recover_tree(root):
    first = second = prev = None
    
    def inorder(node):
        nonlocal first, second, prev
        
        if not node:
            return
        
        inorder(node.left)
        
        # Check if previous value > current (violation)
        if prev and prev.val > node.val:
            if not first:
                first = prev
            second = node
        
        prev = node
        inorder(node.right)
    
    inorder(root)
    
    # Swap values
    first.val, second.val = second.val, first.val
```

---

## 7.8 Master Problem-Solving Checklist

```
□ UNDERSTAND THE PROBLEM
  □ What type of tree? (Binary, BST, etc.)
  □ What am I computing? (Value, boolean, list?)
  □ What are constraints?

□ CHOOSE TRAVERSAL STRATEGY
  □ Need sorted order? → Inorder (if BST)
  □ Process parent before children? → Preorder
  □ Process children before parent? → Postorder
  □ Process by level? → BFS

□ DEFINE RECURSIVE STRUCTURE
  □ What's the base case?
  □ What do I get from left/right subtrees?
  □ How do I combine them?

□ CONSIDER SPACE/TIME TRADE-OFFS
  □ Recursive or iterative?
  □ Extra space acceptable?
  □ Can I use Morris traversal?

□ HANDLE EDGE CASES
  □ Empty tree?
  □ Single node?
  □ Skewed tree?
  □ Null children?

□ TEST
  □ Small example
  □ Edge cases
  □ Balanced vs unbalanced
```

---

# 📋 Quick Reference Card

## Tree Types

| Type | Definition | Properties |
|------|------------|-----------|
| **Binary Tree** | ≤ 2 children | - |
| **BST** | Left < Root < Right | Inorder = sorted |
| **Complete** | Filled left to right | Efficient array representation |
| **Full** | 0 or 2 children | - |
| **Perfect** | All levels full | 2^h - 1 nodes |
| **Balanced** | Height difference ≤ 1 | O(log n) operations |

## Traversal Summary

| Traversal | Order | Use Case | Iterative Data Structure |
|-----------|-------|----------|-------------------------|
| **Preorder** | Root → L → R | Copy, serialize | Stack |
| **Inorder** | L → Root → R | BST sorted order | Stack |
| **Postorder** | L → R → Root | Delete, compute | Two stacks |
| **Level Order** | Level by level | Shortest path | Queue |

## BST Operations

| Operation | Time (Balanced) | Time (Worst) |
|-----------|----------------|--------------|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| Min/Max | O(log n) | O(n) |
| Kth element | O(k) with inorder | O(n) |

## Common Patterns

| Pattern | When to Use | Key Technique |
|---------|-------------|---------------|
| **Top-Down** | Pass info to children | Preorder + parameters |
| **Bottom-Up** | Collect from children | Postorder + return values |
| **Level Processing** | Process by levels | BFS with queue |
| **Path Problems** | Root to leaf | DFS with backtracking |
| **BST Properties** | Use ordering | Compare with root value |

---

**🎯 You've mastered Trees! Practice these patterns and you'll solve any tree problem in FAANG interviews with confidence!**

---

*End of Week 4: Trees Complete Notes*
