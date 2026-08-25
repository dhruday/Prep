# Binary Tree Traversals — Inorder, Preorder, Postorder, Level Order
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Four traversals, four distinct visit orders**: Inorder = Left → Root → Right (gives BST sorted order); Preorder = Root → Left → Right (copy a tree, serialise a tree); Postorder = Left → Right → Root (delete a tree, evaluate expression tree, compute subtree sizes); Level Order = row by row top to bottom (shortest path, level-based problems, zigzag)
- **Recursive is one-liners**: inorder: `visit(left), process(root), visit(right)`; preorder and postorder swap the process step; the simplest code to write and is always correct — use it first to verify logic, then convert to iterative if asked
- **Iterative requires an explicit stack**: preorder with stack — push root, loop: pop + process, push right then push LEFT (so left pops first); inorder with stack — "go left as far as possible, process node, then go right"; postorder is trickier — reverse of a modified preorder or use two stacks
- **Level order = BFS with Queue**: `Queue<TreeNode> q = new ArrayDeque<>();`, enqueue root, loop while not empty: dequeue, process, enqueue left then right; capture level size with `int levelSize = q.size()` BEFORE the inner loop to process one level at a time
- **NULL check is the base case for everything**: every recursive tree function starts with `if (root == null) return;` or `if (root == null) return 0;` — missing this causes NPE
- **Most tree interview problems decompose into one of these four traversals** — recognise which traversal the problem needs before writing any code

---

## 1. One-Line Definition
Tree traversals define the order in which all nodes of a tree are visited; the four standard orders differ in when the current node is processed relative to its left and right subtrees, and each order is optimal for a specific class of problems.

---

## 2. The Problem It Solves

A tree can only be accessed starting from the root. To reach any node you must make choices at every branch. Different problems need different visit orders:

- **Printing a BST in sorted order** → inorder (left subtree contains all smaller values, right subtree all larger — inorder visits in ascending order automatically)
- **Serialising a tree to a string or file** → preorder (root value comes first, so deserialisation can reconstruct the root before processing children)
- **Computing the size or sum of every subtree** → postorder (a node's subtree result depends on BOTH children's results — you must process children before the parent)
- **Finding the shortest path, minimum depth, level-based structure** → level order (BFS gives you level information naturally; DFS in any order does not)

---

## 3. How It Works Internally

### Visualising the Four Orders on the Same Tree

```
            1
           / \
          2   3
         / \
        4   5

Inorder   (L → Root → R): 4, 2, 5, 1, 3
Preorder  (Root → L → R): 1, 2, 4, 5, 3
Postorder (L → R → Root): 4, 5, 2, 3, 1
Level Order (row by row): 1, 2, 3, 4, 5
```

### Memory Aid

```
Pre  = ROOT first  → "Preview" — see the root before diving into subtrees
In   = ROOT middle → "Infix" expression notation (natural reading order for BST)
Post = ROOT last   → "Post-processing" — finish both children before the parent
Level = row by row → "Layer by layer" with a queue
```

---

## 4. The Code

### Wrong Way — Missing Base Case and Wrong Return Type

```java
// ❌ WRONG 1: Missing null check — NullPointerException

public void inorder(TreeNode root) {
    // ❌ If root is null, root.left throws NullPointerException immediately
    inorder(root.left);       // ← NPE when root==null
    System.out.println(root.val);
    inorder(root.right);
}

// ❌ WRONG 2: Modifying the result list inside but returning nothing

public List<Integer> inorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    // ❌ Helper builds a separate list but forgets to pass result down
    helper(root);              // ← helper creates its own local list, modifies it, result remains empty
    return result;             // ← always returns empty list
}

private void helper(TreeNode root) {
    if (root == null) return;
    helper(root.left);
    List<Integer> localList = new ArrayList<>();  // ❌ new list every call, not the outer result
    localList.add(root.val);
    helper(root.right);
}

// ❌ WRONG 3: Level order — forgetting to snapshot queue size

public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    Queue<TreeNode> q = new ArrayDeque<>();
    if (root != null) q.offer(root);
    
    List<Integer> level = new ArrayList<>();
    while (!q.isEmpty()) {
        TreeNode node = q.poll();
        level.add(node.val);
        if (node.left != null) q.offer(node.left);
        if (node.right != null) q.offer(node.right);
        // ❌ When does one level end and the next begin?
        // Queue now contains nodes from BOTH current and next level mixed together
        // level.clear() never called → all nodes go into one flat list
        // No way to group by level without the size snapshot
    }
    result.add(level);
    return result;  // ← returns [[1, 2, 3, 4, 5]] instead of [[1], [2,3], [4,5]]
}
```

### Right Way — All Four Traversals

```java
// ✅ INORDER — Recursive (Left → Root → Right)
// Use for: BST sorted order, validate BST, kth smallest in BST

public List<Integer> inorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    inorderHelper(root, result);
    return result;
}

private void inorderHelper(TreeNode root, List<Integer> result) {
    if (root == null) return;         // ✅ base case FIRST
    inorderHelper(root.left, result); // ← visit left subtree
    result.add(root.val);             // ← process root BETWEEN left and right
    inorderHelper(root.right, result);// ← visit right subtree
}
```

```java
// ✅ PREORDER — Recursive (Root → Left → Right)
// Use for: serialise a tree, copy a tree, top-down aggregations

public List<Integer> preorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    preorderHelper(root, result);
    return result;
}

private void preorderHelper(TreeNode root, List<Integer> result) {
    if (root == null) return;          // ✅ base case
    result.add(root.val);              // ← process root FIRST
    preorderHelper(root.left, result);
    preorderHelper(root.right, result);
}
```

```java
// ✅ POSTORDER — Recursive (Left → Right → Root)
// Use for: compute subtree sizes, evaluate expression trees, delete tree

public List<Integer> postorderTraversal(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    postorderHelper(root, result);
    return result;
}

private void postorderHelper(TreeNode root, List<Integer> result) {
    if (root == null) return;           // ✅ base case
    postorderHelper(root.left, result);
    postorderHelper(root.right, result);
    result.add(root.val);               // ← process root LAST (after both children)
}
```

```java
// ✅ LEVEL ORDER — Iterative with Queue (row by row)
// Use for: minimum depth, level averages, zigzag traversal, connect level-adjacent nodes

public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;   // ✅ empty tree guard
    
    Queue<TreeNode> q = new ArrayDeque<>();
    q.offer(root);
    
    while (!q.isEmpty()) {
        int levelSize = q.size();      // ✅ CRITICAL: snapshot queue size BEFORE inner loop
                                       //    queue will grow as we enqueue children
                                       //    snapshot tells us exactly how many nodes are in THIS level
        List<Integer> level = new ArrayList<>();
        
        for (int i = 0; i < levelSize; i++) {  // ← process exactly this level's nodes
            TreeNode node = q.poll();
            level.add(node.val);
            
            if (node.left != null)  q.offer(node.left);   // ← enqueue next level
            if (node.right != null) q.offer(node.right);
        }
        
        result.add(level);  // ← one complete level collected
    }
    return result;
}
```

```java
// ✅ ITERATIVE INORDER — Stack-based (asked in interviews as follow-up)

public List<Integer> inorderIterative(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode current = root;
    
    while (current != null || !stack.isEmpty()) {
        // ✅ Phase 1: go left as far as possible
        while (current != null) {
            stack.push(current);
            current = current.left;
        }
        
        // ✅ Phase 2: process the leftmost unprocessed node
        current = stack.pop();
        result.add(current.val);  // ← process node (inorder = after all left children)
        
        // ✅ Phase 3: move to right subtree
        current = current.right;
        // if right is null, next iteration goes to Phase 2 again (pops next from stack)
    }
    return result;
}
```

```java
// ✅ PRACTICAL: Max depth using postorder logic (process after children)

public int maxDepth(TreeNode root) {
    if (root == null) return 0;              // ✅ base case: null node has depth 0
    int leftDepth  = maxDepth(root.left);    // ← compute left subtree depth first
    int rightDepth = maxDepth(root.right);   // ← compute right subtree depth first
    return 1 + Math.max(leftDepth, rightDepth); // ← THIS node: takes the deeper side + 1
}

// ✅ PRACTICAL: Level order minimum depth variant

public int minDepth(TreeNode root) {
    if (root == null) return 0;
    Queue<TreeNode> q = new ArrayDeque<>();
    q.offer(root);
    int depth = 1;
    
    while (!q.isEmpty()) {
        int levelSize = q.size();
        for (int i = 0; i < levelSize; i++) {
            TreeNode node = q.poll();
            
            // ✅ If a LEAF is found, this is the minimum depth (BFS guarantees closest first)
            if (node.left == null && node.right == null) return depth;
            
            if (node.left  != null) q.offer(node.left);
            if (node.right != null) q.offer(node.right);
        }
        depth++;
    }
    return depth;
}
```

```typescript
// ✅ TypeScript — Level order traversal on a config/component tree (Frontend context)

interface TreeNode {
    val: number;
    children?: TreeNode[];
}

// N-ary tree level order (matches DOM/component tree structure)
function levelOrder(root: TreeNode | null): number[][] {
    if (!root) return [];
    
    const result: number[][] = [];
    const queue: TreeNode[] = [root];
    
    while (queue.length > 0) {
        const levelSize = queue.length;   // ← snapshot before modifying queue
        const level: number[] = [];
        
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift()!;
            level.push(node.val);
            for (const child of (node.children ?? [])) {
                queue.push(child);
            }
        }
        result.push(level);
    }
    return result;
}
// Note: queue.shift() is O(n) — for performance-critical code use a proper deque index
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "In what order does inorder traversal visit nodes of a BST?"

**Hruday's answer:**
> Inorder traversal visits nodes in strictly ascending order for a valid BST. The reason is how BSTs are defined: every node in the left subtree is smaller than the current node, and every node in the right subtree is larger. Inorder traversal visits the entire left subtree first (all smaller values), then the current node, then the entire right subtree (all larger values). This produces a sorted sequence.
>
> This property is frequently used in problems like "validate BST" (check that inorder sequence is strictly increasing), "kth smallest element in BST" (track inorder count), and "convert sorted array to BST" (the inverse operation).

---

### Q2 — Deep Dive
**Interviewer asks:** "Why is postorder traversal necessary for computing subtree properties like subtree sum or subtree size?"

**Hruday's answer:**
> Because a node's subtree property depends on the properties of BOTH children. To compute the sum of a node's subtree, I need the left subtree sum and the right subtree sum first, then I add the current node's value. In postorder, I visit both children before the current node — so by the time I compute `subtreeSum(node)`, both `subtreeSum(node.left)` and `subtreeSum(node.right)` are already known.
>
> If I tried preorder instead, I'd be at the root before I had any information from the children — I'd have to do extra work or two passes. Postorder makes the dependency order explicit in the traversal: children are always ready before their parent is processed.
>
> In expression tree evaluation, the same logic holds: to evaluate an `+` operator node, I need both operand subtrees evaluated first. That's postorder.

---

### Q3 — Application
**Interviewer asks:** "How would you print a binary tree level by level in zigzag order — left to right for even levels, right to left for odd levels?"

**Hruday's answer:**
> I start with standard BFS level order. The only change: for odd-depth levels, I reverse the collected level list before adding it to the result. Track the current depth starting at 0, increment after each level.
>
> Or — slightly more efficient — use a `Deque<Integer>` as the level collector instead of a list. For left-to-right levels, add values to the back. For right-to-left levels, add values to the front. When the level ends, convert to list. No extra reversal pass needed.
>
> The BFS structure stays identical — snapshot queue size, inner loop, enqueue children. The only difference is how nodes within each level are collected. This is a clean pattern: isolate the variation (collection order) from the invariant (BFS loop structure).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Forgetting level size snapshot in BFS | "I'll use the queue directly and figure out levels by counting" | Without `int levelSize = q.size()` before the inner loop, there's no way to tell where one level ends and the next begins — the queue holds a mix of nodes from two consecutive levels after you start enqueuing children; the size snapshot at the START of each outer loop iteration is exactly the count of nodes in the current level; this is the single most common bug in level order traversal |
| Returning early from a recursive helper that accumulates into a list | "My helper function adds to the list inside" | When the helper takes the result list as a parameter and returns void, it works correctly; when the helper is expected to RETURN the result list and a new list is created inside at each call, the outer result is never populated; always choose one of: (a) pass the list as a parameter to a void helper, or (b) have the recursive function return the SAME list after adding to it — never create a new list at each recursive level and expect the outer call to see it |
| Inorder vs preorder for tree serialisation | "Any traversal can serialise a tree" | Inorder traversal of a GENERAL binary tree cannot be used to reconstruct the tree uniquely — the same inorder sequence can come from multiple different tree shapes; preorder CAN reconstruct the tree because the first element is always the root (dequeue root, then recursively build left subtree from the next n elements, then right subtree); this is why Leetcode's tree serialisation codec uses preorder (or level order) — not inorder |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a component configuration tree representing a product's bill of materials — components containing sub-components, each with a price. The business logic was: the total price of a component = sum of all sub-component prices + its own price.
>
> The first version was a naive DFS with no thought about traversal order — it happened to produce correct results because the subtree computation was embedded in the return value, which implicitly made it postorder. When we refactored to an iterative version for performance (deep BOMs were hitting stack limits), we explicitly used a postorder iterative traversal with a stack, and the logic was exactly 'process children first, then the current node'.
>
> This real-world decomposition — subtree result depends on children results → postorder — is the pattern I now explain in every tree interview question."

---

## 8. Scale Evolution

**1,000 users →** Recursive traversals fine for trees with depth up to ~10,000 (JVM default stack). Any interview tree problem fits. BFS with ArrayDeque is O(n) time and O(w) space (w = max width).

**100,000 users →** DOM trees in real browsers are traversed iteratively; browsers use iterative algorithms precisely to avoid call stack limits on deeply nested HTML. Very deep DOM trees (> ~5,000 nested elements) can still hit issues — the same stack overflow risk applies in Node.js too.

**10 million users →** Large-scale tree processing (product taxonomy trees with millions of nodes, org charts at enterprise scale) moves to distributed tree processing — MapReduce or Spark with serialised tree structures; level order decomposition maps naturally to Spark's RDD operations (process each level as a partition); the BFS level-by-level model is the distributed version.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Decision tree traversal for payment routing logic; expression tree evaluation for fee calculation rules; postorder for evaluating nested conditions | Postorder rationale; practical business logic mapping |
| Swiggy / Meesho | Category hierarchy traversal (parent → child categories); BFS for breadth-first recommendation expansion (level = distance from queried item); level order for product catalogue structure display | Level order application; BFS vs DFS trade-off reasoning |
| Adobe / Microsoft | Full coverage expected: inorder sorted BST output, validate BST, serialize/deserialize, zigzag level order, max/min depth, diameter of tree — all are common Microsoft rounds; clean code for all four traversals | Code fluency; traversal selection reasoning; iterative inorder |
| SAP Labs | Bill of materials subtree cost computation (postorder); organisational hierarchy BFS for permissions propagation; component tree iteration → stack limit fix → iterative postorder with explicit stack | Production iterative travel conversion story; postorder rationale |

---

## 10. Related Topics — What to Study Next

- **Topic 278 — BFS and DFS Templates** — level order traversal of a tree IS BFS; DFS is inorder/preorder/postorder; Topic 278 extends these patterns to general graphs (where nodes can have cycles and need a `visited` set), which trees don't require
- **Topic 279 — Graph Connected Components** — connected components use BFS or DFS on a graph; the same traversal templates apply, the difference being the need for cycle detection; once tree traversals are solid, graph traversals are a straightforward extension
- **Topic 280 — DOM Tree Traversal as Graph Problem** — the browser DOM is an N-ary tree; traversing it for virtual DOM diffing (React's reconciliation), CSS specificity calculation, or event delegation uses exactly the preorder and level-order patterns from tree traversal, applied to N-ary trees

---

*Part 17 · Binary Tree Traversals · Full Stack Interview Guide · Hruday D · 2026*
