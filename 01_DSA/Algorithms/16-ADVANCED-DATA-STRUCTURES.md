# Advanced Data Structures — Google Interview Prep

> **9 data structures covered:** Trie (Prefix Tree) · Union-Find / DSU · Segment Tree · Fenwick Tree / BIT · Monotonic Deque · XOR Trie · Sparse Table · Weighted DSU · Balanced BST / Ordered Set

---

## Table of Contents
1. [Trie (Prefix Tree)](#trie-prefix-tree)
2. [Union-Find / DSU](#union-find--dsu)
3. [Segment Tree](#segment-tree)
4. [Fenwick Tree / BIT](#fenwick-tree--bit)
5. [Monotonic Deque](#monotonic-deque)
6. [XOR Trie (Binary Trie)](#xor-trie-binary-trie)
7. [Sparse Table](#sparse-table)
8. [Weighted DSU / DSU with Rollback](#weighted-dsu--dsu-with-rollback)
9. [Balanced BST / Ordered Set](#balanced-bst--ordered-set)

---

> Read fast. Understand deeply. Go practice on LeetCode immediately.

---

## Trie (Prefix Tree)

### What is it?
A tree where each path from root to a node spells out a prefix. It exists because hash sets can only tell you if an EXACT word exists — a Trie can tell you if ANY word starts with "app" in O(L) time, where L is the prefix length.

### Visual
```
Insert: "apple", "app", "bat"

          root
         /    \
       'a'    'b'
        |      |
       'p'    'a'
        |      |
       'p'    't'  <-- isEnd=true ("bat")
        |
       'l'  <-- isEnd=true ("app")
        |
       'e'  <-- isEnd=true ("apple")
```

### Key Operations
| Operation | Time Complexity | Brief Description |
|---|---|---|
| insert(word) | O(L) | Walk down, create nodes as needed, mark isEnd |
| search(word) | O(L) | Walk down, check isEnd at final node |
| startsWith(prefix) | O(L) | Walk down, just confirm path exists |
| delete(word) | O(L) | Walk down, unmark isEnd, prune empty nodes |

L = length of word or prefix.

### How does it work?
1. Each node has up to 26 children (one per letter a–z).
2. To **insert** "cat": start at root, go to child 'c', then child 'a', then child 't'. Mark the 't' node as isEnd=true.
3. To **search** "cat": same walk. If any step has no child, return false. At the end, return isEnd.
4. To **startsWith** "ca": same walk. Do NOT check isEnd — just confirm the path exists.
5. All words sharing a prefix share the same nodes in the tree.

### Why does it work?
The key idea is that the structure of the tree encodes all prefixes automatically — inserting "apple" creates the path for "app", "ap", "a" as a side effect. Every prefix lookup is just a path traversal.

### When to use?
- Problem says "find all words with prefix X" or "autocomplete".
- Multiple words share common prefixes and you need to search all of them.
- "Word search in a grid" with a dictionary (combine Trie + DFS backtracking to prune early).
- Problem involves checking if any word in a list starts with a given prefix repeatedly.

### When NOT to use?
- You only need exact word lookup — a HashSet is simpler and faster.
- The strings are numbers or non-letter characters (use a HashMap for children instead, or reconsider).

### How to recognize in a new problem?
Ask: "Does the problem involve searching multiple words or checking prefixes?" If yes, think Trie.

Concrete signals:
- "Implement autocomplete / search suggestions"
- "Find all words from a dictionary that appear in a grid"
- "Design a structure that supports insert and prefix search"

### Simple Example
Problem: Insert "apple" and "app". Does "app" exist? Does "ap" exist?

Trace:
```
insert("apple"): root->'a'->'p'->'p'->'l'->'e'(isEnd)
insert("app"):   root->'a'->'p'->'p'(isEnd)   [shares path with "apple"]

search("app"):   walk to second 'p', isEnd=true  → TRUE
search("ap"):    walk to 'p' after 'a', isEnd=false → FALSE
startsWith("ap"): path exists → TRUE
```

### Code
```java
// Java — core operations
class TrieNode {
    TrieNode[] children = new TrieNode[26];
    boolean isEnd = false;
}

class Trie {
    TrieNode root = new TrieNode();

    public void insert(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            int i = c - 'a';
            if (node.children[i] == null)
                node.children[i] = new TrieNode();
            node = node.children[i];
        }
        node.isEnd = true;
    }

    public boolean search(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            int i = c - 'a';
            if (node.children[i] == null) return false;
            node = node.children[i];
        }
        return node.isEnd;
    }

    public boolean startsWith(String prefix) {
        TrieNode node = root;
        for (char c : prefix.toCharArray()) {
            int i = c - 'a';
            if (node.children[i] == null) return false;
            node = node.children[i];
        }
        return true; // do NOT check isEnd for prefix
    }
}
```

```javascript
// JavaScript — core operations
class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word) {
        let node = this.root;
        for (const ch of word) {
            if (!node.children[ch]) node.children[ch] = new TrieNode();
            node = node.children[ch];
        }
        node.isEnd = true;
    }

    search(word) {
        let node = this.root;
        for (const ch of word) {
            if (!node.children[ch]) return false;
            node = node.children[ch];
        }
        return node.isEnd;
    }

    startsWith(prefix) {
        let node = this.root;
        for (const ch of prefix) {
            if (!node.children[ch]) return false;
            node = node.children[ch];
        }
        return true;
    }
}
```

### Dry Run
Insert "apple", "app", "apt". Then search("app"), startsWith("ap"), search("ap").

| Operation | Characters processed | Node path | isEnd touched |
|---|---|---|---|
| insert("apple") | a→p→p→l→e | root→a→p→p→l→e | e.isEnd = true |
| insert("app") | a→p→p | root→a→p→p | p(3rd).isEnd = true (shared path with "apple") |
| insert("apt") | a→p→t | root→a→p→t | t.isEnd = true (new branch at 3rd level) |
| search("app") | a→p→p | root→a→p→p | check isEnd at p(3rd) = **true** → TRUE |
| startsWith("ap") | a→p | root→a→p | NOT checked (prefix only) → TRUE (path exists) |
| search("ap") | a→p | root→a→p | check isEnd at p(2nd) = **false** → FALSE |

### Complexity Summary
```
Insert:  O(L)  — L = word length
Search:  O(L)
Prefix:  O(L)
Space:   O(N * L * 26)  — N words, average length L, 26 children per node
```

### Common Trap
- Forgetting to check `isEnd` in `search()` but not in `startsWith()`. "app" and "apple" share a path — only the node marked `isEnd=true` is a complete word.
- Using `children = new TrieNode[26]` assumes lowercase a–z only. If the input has uppercase or digits, use a `HashMap<Character, TrieNode>` instead.

### Experience Tip
**Experience Tip:** In Word Search II (LC 212), build the Trie from the word list, then run DFS on the grid. At each DFS step, if the current character has no Trie child, prune immediately — this is the whole speedup over brute-force. Also remove found words from the Trie to avoid duplicates.

### Do Not Confuse With
| | Trie | HashMap |
|---|---|---|
| **Use when** | Need prefix operations (autocomplete, startsWith) | Only need exact-word lookup |
| **Key difference** | Shares prefix nodes; O(L) per op where L=word length | O(1) average per op but no prefix support |
| **Wrong choice** | HashMap when: "find all words with prefix X" | Trie when: only exact membership check needed |

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 208 | Implement Trie (Prefix Tree) | Medium | Build it from scratch — the foundation | https://leetcode.com/problems/implement-trie-prefix-tree/ |
| 212 | Word Search II | Hard | Trie + DFS; prune when Trie path ends | https://leetcode.com/problems/word-search-ii/ |
| 211 | Design Add and Search Words Data Structure | Medium | '.' wildcard = try all 26 children recursively | https://leetcode.com/problems/design-add-and-search-words-data-structure/ |

### One-Minute Revision
```
STRUCTURE:       Trie (Prefix Tree)
IN SIMPLE WORDS: Tree where each path spells a prefix. Each node = one character.
USE WHEN:        Prefix search, autocomplete, word search in grid + dictionary
DON'T USE WHEN:  Only exact word lookup (use HashSet instead)
KEY OPERATIONS:  insert O(L), search O(L), startsWith O(L)
TIME:            O(L) per operation
SPACE:           O(N * L * 26)
COMMON TRAP:     search() checks isEnd; startsWith() does not
```

---

## Union-Find / DSU (Disjoint Set Union)

### What is it?
A structure that groups elements into sets and answers one question blazing fast: "Are these two elements in the same group?" It exists because graph traversal (BFS/DFS) to check connectivity would be O(n) per query — DSU answers the same question in nearly O(1).

### Visual
```
Before any union:       After union(0,1), union(1,2), union(3,4):
0  1  2  3  4           0–1–2    3–4
(each is its own group) (two groups)

parent array:  [0, 0, 0, 3, 3]
               (0 is root of {0,1,2}; 3 is root of {3,4})
```

### Key Operations
| Operation | Time Complexity | Brief Description |
|---|---|---|
| find(x) | O(α(n)) ≈ O(1) | Find the root/representative of x's group |
| union(x, y) | O(α(n)) ≈ O(1) | Merge the groups containing x and y |
| connected(x, y) | O(α(n)) ≈ O(1) | Check if x and y share a root |

α(n) = inverse Ackermann function — effectively constant for all practical n.

### How does it work?
1. Start: every element is its own parent (`parent[i] = i`).
2. **find(x):** Follow parent pointers until you reach the root (a node that is its own parent).
3. **Path compression:** While finding, point every node directly to the root. Makes future finds faster.
4. **union(x, y):** Find root of x, find root of y. If different, make one the parent of the other.
5. **Union by rank:** Always attach the smaller tree under the larger one. Keeps trees flat.
6. **connected(x, y):** Simply check `find(x) == find(y)`.

### Why does it work?
Path compression + union by rank together ensure the tree stays almost flat, so every find operation is nearly O(1). The two optimizations compound each time you use the structure.

### When to use?
- Problem asks "are X and Y connected?" or "how many connected components are there?"
- You're building a graph and need to detect if adding an edge creates a cycle.
- Problem involves grouping/merging elements over time (accounts merge, friends list).
- "Minimum spanning tree" (Kruskal's algorithm uses DSU at its core).

### When NOT to use?
- You need to find the actual path between two nodes — DSU only tells you IF they're connected, not HOW.
- You need to remove elements from a group — DSU does not support splits.

### How to recognize in a new problem?
Ask: "Does the problem involve grouping things together over time, or asking if two things are in the same group?" That's DSU.

Concrete signals:
- "Find the number of connected components in a graph"
- "Detect a cycle in an undirected graph"
- "Merge accounts / friends / cities that belong to the same group"

### Simple Example
Problem: Given edges [0-1], [1-2], [3-4], how many connected components?

Trace:
```
Start:  parent = [0, 1, 2, 3, 4]  (5 components)

union(0, 1): find(0)=0, find(1)=1, different → parent[1]=0  → 4 components
union(1, 2): find(1)=0, find(2)=2, different → parent[2]=0  → 3 components
union(3, 4): find(3)=3, find(4)=4, different → parent[4]=3  → 2 components

Answer: 2 connected components
```

### Code
```java
// Java — core operations
class DSU {
    int[] parent, rank;

    DSU(int n) {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    int find(int x) {
        if (parent[x] != x)
            parent[x] = find(parent[x]); // path compression
        return parent[x];
    }

    boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false; // already connected — cycle detected!
        if (rank[px] < rank[py]) { int tmp = px; px = py; py = tmp; }
        parent[py] = px;           // attach smaller under larger
        if (rank[px] == rank[py]) rank[px]++;
        return true;
    }

    boolean connected(int x, int y) {
        return find(x) == find(y);
    }
}
```

```javascript
// JavaScript — core operations
class DSU {
    constructor(n) {
        this.parent = Array.from({length: n}, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }

    find(x) {
        if (this.parent[x] !== x)
            this.parent[x] = this.find(this.parent[x]); // path compression
        return this.parent[x];
    }

    union(x, y) {
        const px = this.find(x), py = this.find(y);
        if (px === py) return false; // already connected
        if (this.rank[px] < this.rank[py]) [px, py] = [py, px]; // won't work — let me rewrite
        // attach smaller under larger
        if (this.rank[px] >= this.rank[py]) {
            this.parent[py] = px;
            if (this.rank[px] === this.rank[py]) this.rank[px]++;
        } else {
            this.parent[px] = py;
        }
        return true;
    }

    connected(x, y) {
        return this.find(x) === this.find(y);
    }
}
```

### Dry Run
5 nodes (0–4). Operations: union(0,1), union(1,2), union(3,4), then connectivity checks.

| Operation | parent[] after | Notes |
|---|---|---|
| Initial state | [0, 1, 2, 3, 4] | Each node is its own root |
| union(0,1) | [0, 0, 2, 3, 4] | find(0)=0, find(1)=1; rank equal → parent[1]=0, rank[0]++ |
| union(1,2) | [0, 0, 0, 3, 4] | find(1): 1→0 (path compress, parent[1]=0); parent[2]=0 |
| union(3,4) | [0, 0, 0, 3, 3] | find(3)=3, find(4)=4 → parent[4]=3 |
| find(0)==find(2)? | — | find(2)=0 (direct), find(0)=0 → **0==0 → TRUE** |
| find(0)==find(3)? | — | find(0)=0, find(3)=3 → **0≠3 → FALSE** |

**Path compression in action (find(2) in step 3):**
Before compression: 2→1→0. Call find(2) → recurse find(1) → find(0)=0.
On return: parent[1] = 0 (already is), parent[2] = 0 (compressed, skipping 1).
Result: 2 now points directly to root 0 — future find(2) is O(1), one hop.

### Complexity Summary
```
find(x):       O(α(n)) ≈ O(1) amortized
union(x, y):   O(α(n)) ≈ O(1) amortized
connected:     O(α(n)) ≈ O(1) amortized
Space:         O(n)
```

### Common Trap
- Calling `union(x, y)` and not checking its return value — if it returns false, x and y were already connected, meaning you found a cycle. Many cycle-detection problems depend on catching this.
- Forgetting path compression or union by rank — without both, find() degrades to O(n) in the worst case.

### Experience Tip
**Experience Tip:** For "number of connected components", initialize a counter at n, then decrement by 1 every time union() returns true (meaning two previously separate groups merged). The final counter is your answer. This pattern appears in Accounts Merge, Number of Provinces, and Redundant Connection.

### Do Not Confuse With
| | Union-Find | BFS/DFS |
|---|---|---|
| **Use when** | Dynamic connectivity — unions happen while querying | Static graph — edges all known upfront |
| **Key difference** | O(α(n)) per query, processes edges one at a time | O(V+E) one-time traversal |
| **Wrong choice** | BFS/DFS when edges arrive incrementally | Union-Find when you need path or level information |

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 684 | Redundant Connection | Medium | union() returns false = cycle found = that's the redundant edge | https://leetcode.com/problems/redundant-connection/ |
| 721 | Accounts Merge | Medium | Emails are nodes; same account = union them; group by root at end | https://leetcode.com/problems/accounts-merge/ |
| 547 | Number of Provinces | Medium | Classic connected components — count successful unions | https://leetcode.com/problems/number-of-provinces/ |

### One-Minute Revision
```
STRUCTURE:       Union-Find / DSU (Disjoint Set Union)
IN SIMPLE WORDS: Groups elements into sets; answers "same group?" in near O(1)
USE WHEN:        Connected components, cycle detection, merging groups
DON'T USE WHEN:  Need actual path, need to split groups
KEY OPERATIONS:  find(x), union(x,y), connected(x,y)
TIME:            O(α(n)) ≈ O(1) per operation
SPACE:           O(n)
COMMON TRAP:     union() returns false = cycle; don't ignore the return value
```

---

## Segment Tree

### What is it?
A binary tree built on top of an array where every node stores the answer (sum, min, max) for a range of the array. It exists because prefix sums break down when the array has updates — a Segment Tree handles BOTH range queries AND point updates in O(log n).

### Visual
```
Array: [2, 1, 5, 3]

            [0-3] sum=11
           /            \
      [0-1] sum=3      [2-3] sum=8
      /       \         /       \
  [0] 2     [1] 1   [2] 5     [3] 3
  (leaf)   (leaf)  (leaf)   (leaf)
```

### Key Operations
| Operation | Time Complexity | Brief Description |
|---|---|---|
| build(arr) | O(n) | Build the tree bottom-up from the array |
| update(i, val) | O(log n) | Change arr[i] to val, recompute affected nodes |
| query(l, r) | O(log n) | Get sum/min/max for any range [l, r] |

### How does it work?
1. **Build:** Leaves store the original array values. Each internal node stores `merge(left child, right child)` — e.g., sum, min, or max.
2. **Query(l, r):** Start at root. Three cases at each node:
   - If node's range is completely OUTSIDE [l, r]: return identity (0 for sum, INF for min).
   - If node's range is completely INSIDE [l, r]: return this node's stored value directly.
   - If PARTIAL overlap: recurse into both children and merge results.
3. **Update(i, val):** Walk from root to the leaf at index i. Update the leaf. On the way back UP, recompute every ancestor as `merge(left child, right child)`.
4. The tree has 4*n nodes (safe allocation size).
5. Node at index `node` has children at `2*node+1` (left) and `2*node+2` (right).

### Why does it work?
Any range [l, r] can be decomposed into at most O(log n) non-overlapping segments that are already pre-computed as tree nodes. You just look them up and merge — no scanning.

### When to use?
- "Range sum / min / max" query AND the array can be updated.
- You need to query arbitrary ranges (not just prefix sums).
- Need to count inversions or answer range-frequency queries.
- Any problem with repeated queries on a changing dataset.

### When NOT to use?
- Array never changes — use a simple prefix sum array (O(1) query, O(n) build, far simpler).
- You only need prefix sums with updates — a Fenwick Tree has less code.

### How to recognize in a new problem?
Ask: "Do I need to query a range AND update elements?" If both are yes, think Segment Tree.

Concrete signals:
- "Given an array, answer sum/min/max queries for range [l, r]" + "there will also be update operations"
- "Count how many elements in range [l, r] are less than X"
- Any problem with the word "mutable" in the title

### Simple Example
Problem: Array = [2, 1, 5, 3]. Query sum(1, 3). Then update index 1 to 7. Query sum(1, 3) again.

Trace:
```
query(1, 3):
  Root [0-3]: partial → recurse
  Left [0-1]: partial → recurse
    Left [0]: outside [1,3] → return 0
    Right [1]: fully inside [1,3] → return 1
  Right [2-3]: fully inside [1,3] → return 8
  Result: 0 + 1 + 8 = 9  ✓ (1+5+3=9)

update(1, 7):
  Walk to leaf [1], set to 7
  Recompute [0-1] = 2+7 = 9
  Recompute [0-3] = 9+8 = 17

query(1, 3) = 7+5+3 = 15  ✓
```

### Code
```java
// Java — core operations (range sum, point update)
class SegmentTree {
    int[] tree;
    int n;

    SegmentTree(int[] arr) {
        n = arr.length;
        tree = new int[4 * n];
        build(arr, 0, 0, n - 1);
    }

    void build(int[] arr, int node, int l, int r) {
        if (l == r) { tree[node] = arr[l]; return; }
        int mid = (l + r) / 2;
        build(arr, 2*node+1, l, mid);
        build(arr, 2*node+2, mid+1, r);
        tree[node] = tree[2*node+1] + tree[2*node+2];
    }

    void update(int node, int l, int r, int idx, int val) {
        if (l == r) { tree[node] = val; return; }
        int mid = (l + r) / 2;
        if (idx <= mid) update(2*node+1, l, mid, idx, val);
        else            update(2*node+2, mid+1, r, idx, val);
        tree[node] = tree[2*node+1] + tree[2*node+2];
    }

    int query(int node, int l, int r, int ql, int qr) {
        if (qr < l || r < ql) return 0;           // no overlap
        if (ql <= l && r <= qr) return tree[node]; // full overlap
        int mid = (l + r) / 2;
        return query(2*node+1, l, mid, ql, qr)
             + query(2*node+2, mid+1, r, ql, qr);
    }

    // Public API (0-indexed)
    public void update(int idx, int val) { update(0, 0, n-1, idx, val); }
    public int query(int l, int r)       { return query(0, 0, n-1, l, r); }
}
```

```javascript
// JavaScript — core operations (range sum, point update)
class SegmentTree {
    constructor(arr) {
        this.n = arr.length;
        this.tree = new Array(4 * this.n).fill(0);
        this.build(arr, 0, 0, this.n - 1);
    }

    build(arr, node, l, r) {
        if (l === r) { this.tree[node] = arr[l]; return; }
        const mid = (l + r) >> 1;
        this.build(arr, 2*node+1, l, mid);
        this.build(arr, 2*node+2, mid+1, r);
        this.tree[node] = this.tree[2*node+1] + this.tree[2*node+2];
    }

    update(idx, val, node=0, l=0, r=this.n-1) {
        if (l === r) { this.tree[node] = val; return; }
        const mid = (l + r) >> 1;
        if (idx <= mid) this.update(idx, val, 2*node+1, l, mid);
        else            this.update(idx, val, 2*node+2, mid+1, r);
        this.tree[node] = this.tree[2*node+1] + this.tree[2*node+2];
    }

    query(ql, qr, node=0, l=0, r=this.n-1) {
        if (qr < l || r < ql) return 0;
        if (ql <= l && r <= qr) return this.tree[node];
        const mid = (l + r) >> 1;
        return this.query(ql, qr, 2*node+1, l, mid)
             + this.query(ql, qr, 2*node+2, mid+1, r);
    }
}
```

### Dry Run
Array [1, 3, 5, 7, 9, 11]. Build, then query(1,3), then update(1, 10).

| Node (index) | Range | Value (before update) | Value (after update(1,10)) |
|---|---|---|---|
| 0 (root) | [0–5] | 36 | 43 |
| 1 | [0–2] | 9 | 16 |
| 2 | [3–5] | 27 | 27 |
| 3 | [0–1] | 4 | 11 |
| 4 | [2–2] | 5 | 5 |
| 5 | [3–4] | 16 | 16 |
| 6 | [5–5] | 11 | 11 |
| 7 (leaf) | [0–0] | 1 | 1 |
| 8 (leaf) | [1–1] | 3 | **10** |

**query(1, 3):** Root [0–5] partial → left [0–2] partial → [0–1] partial → [0] outside → 0; [1] inside → 3. [2] inside → 5. Right [3–5] partial → [3–4] partial → [3] inside → 7; [4] outside. Result: 0+3+5+7 = **15** ✓

**update(1, 10):** Walk root→[0–2]→[0–1]→leaf[1]. Set leaf[1]=10. Recompute up: [0–1]=1+10=11, [0–2]=11+5=16, root=16+27=43. ✓

### Complexity Summary
```
Build:   O(n)
Update:  O(log n)
Query:   O(log n)
Space:   O(n)  — allocate 4*n nodes to be safe
```

### Common Trap
- Allocating only `2*n` nodes instead of `4*n` — causes index out of bounds for non-power-of-2 sized arrays.
- Using 0 as identity for min queries — use Integer.MAX_VALUE instead, or your min will always return 0.

### Experience Tip
**Experience Tip:** For Range Sum Query Mutable (LC 307), a Fenwick Tree is actually simpler to code. Use a Segment Tree only when you need range min/max or more complex merge operations that Fenwick can't express. In interviews, it's fine to say "I'll use a Segment Tree for generality."

### Do Not Confuse With
| | Segment Tree | Fenwick Tree |
|---|---|---|
| **Use when** | Range queries with range updates, or non-commutative operations (min/max) | Prefix sum queries with point updates |
| **Key difference** | More powerful, handles range update + lazy propagation | Simpler, smaller constant, only supports prefix operations |
| **Wrong choice** | Fenwick for range min/max — it can't do those | Segment Tree when Fenwick's simplicity is enough |

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 307 | Range Sum Query - Mutable | Medium | Classic point update + range sum — the template problem | https://leetcode.com/problems/range-sum-query-mutable/ |
| 315 | Count of Smaller Numbers After Self | Hard | Coordinate compress values, then use Seg Tree / BIT to count | https://leetcode.com/problems/count-of-smaller-numbers-after-self/ |
| 303 | Range Sum Query - Immutable | Easy | No updates → use plain prefix sum, NOT Segment Tree | https://leetcode.com/problems/range-sum-query-immutable/ |

### One-Minute Revision
```
STRUCTURE:       Segment Tree
IN SIMPLE WORDS: Binary tree on array; each node = answer for its range
USE WHEN:        Range query (sum/min/max) + point updates on same array
DON'T USE WHEN:  No updates (use prefix sum); only prefix sums with updates (use Fenwick)
KEY OPERATIONS:  build O(n), update O(log n), query O(log n)
TIME:            O(log n) per update/query
SPACE:           O(n), allocate 4*n nodes
COMMON TRAP:     Use 4*n not 2*n; use INF not 0 as identity for min queries
```

---

## Fenwick Tree / BIT (Binary Indexed Tree)

### What is it?
A compact array that supports two operations: update a value at index i, and query the prefix sum from 1 to i — both in O(log n). It exists because a plain prefix sum array breaks when you update a value (you'd have to rebuild the whole thing), while a Fenwick Tree updates in O(log n).

### Visual
```
Array (1-indexed): [_, 3, 2, -1, 6, 5]
                        1  2   3  4  5

BIT internal:  tree[1] covers [1,1]
               tree[2] covers [1,2]
               tree[3] covers [3,3]
               tree[4] covers [1,4]
               tree[5] covers [5,5]

The "range" each index covers = lowest set bit of that index.
index 6 = 110 in binary → lowest set bit = 2 → covers 2 elements
```

### Key Operations
| Operation | Time Complexity | Brief Description |
|---|---|---|
| update(i, delta) | O(log n) | Add delta to index i, propagate up |
| prefix(i) | O(log n) | Sum of elements from index 1 to i |
| range(l, r) | O(log n) | Sum from l to r = prefix(r) - prefix(l-1) |

### How does it work?
1. **The trick:** For index i, the number of elements it "covers" equals the lowest set bit of i. E.g., i=6 (binary 110) covers 2 elements.
2. **update(i, delta):** Add delta to tree[i], then jump to the next responsible index by adding the lowest set bit: `i += i & (-i)`. Repeat until i > n.
3. **prefix(i):** Add tree[i] to the total, then jump to the previous responsible index by removing the lowest set bit: `i -= i & (-i)`. Repeat until i = 0.
4. `i & (-i)` extracts the lowest set bit of i — this is the entire magic of the structure.
5. **range(l, r):** = `prefix(r) - prefix(l-1)`.

### Why does it work?
Every prefix [1..i] can be decomposed into a small number of non-overlapping sub-ranges, each stored as exactly one tree entry. The bit manipulation navigates these stored sub-ranges perfectly.

### When to use?
- You need prefix sums AND elements can be updated.
- "Count of smaller / larger elements" problems (coordinate compress + BIT).
- Counting inversions in an array.
- Simpler and faster to code than a Segment Tree when prefix sums are all you need.

### When NOT to use?
- You need range min/max — Fenwick Trees only work cleanly for operations where the inverse exists (like sum). Use a Segment Tree for min/max.
- You need range updates — Fenwick is awkward; use a Segment Tree with Lazy Propagation.

### How to recognize in a new problem?
Ask: "Do I need prefix counts or prefix sums, and can values change?" If yes, Fenwick Tree.

Concrete signals:
- "Count elements to the right that are smaller than current element"
- "How many numbers in range [1, x] have been inserted so far?"
- Array updates + range sum queries (also solved by Segment Tree but Fenwick is shorter)

### Simple Example
Problem: Array = [3, 2, -1, 6]. Build a Fenwick Tree, then query sum(2, 4) after updating index 3 to +5.

Trace:
```
Build: update(1,3), update(2,2), update(3,-1), update(4,6)

query range(2, 4) = prefix(4) - prefix(1)
  prefix(4): tree[4]=10 (covers [1..4]), i=4-4=0 → stop → 10
  prefix(1): tree[1]=3  (covers [1..1]), i=1-1=0 → stop → 3
  range(2,4) = 10 - 3 = 7  ✓ (2 + -1 + 6 = 7)

update(3, +5):  tree[3]+=5, then 3+1=4 → tree[4]+=5
query range(2, 4) = prefix(4) - prefix(1) = 15 - 3 = 12  ✓ (2 + 4 + 6 = 12)
```

### Code
```java
// Java — core operations (1-indexed)
class FenwickTree {
    int[] tree;
    int n;

    FenwickTree(int n) {
        this.n = n;
        this.tree = new int[n + 1]; // 1-indexed, index 0 unused
    }

    // Add delta to position i (1-indexed)
    void update(int i, int delta) {
        for (; i <= n; i += i & (-i))
            tree[i] += delta;
    }

    // Sum from 1 to i (1-indexed)
    int prefix(int i) {
        int sum = 0;
        for (; i > 0; i -= i & (-i))
            sum += tree[i];
        return sum;
    }

    // Sum from l to r (1-indexed)
    int range(int l, int r) {
        return prefix(r) - prefix(l - 1);
    }
}
```

```javascript
// JavaScript — core operations (1-indexed)
class FenwickTree {
    constructor(n) {
        this.n = n;
        this.tree = new Array(n + 1).fill(0); // 1-indexed
    }

    update(i, delta) {
        for (; i <= this.n; i += i & (-i))
            this.tree[i] += delta;
    }

    prefix(i) {
        let sum = 0;
        for (; i > 0; i -= i & (-i))
            sum += this.tree[i];
        return sum;
    }

    range(l, r) {
        return this.prefix(r) - this.prefix(l - 1);
    }
}
```

### Dry Run
Array [1,3,5,7,9] (0-indexed). BIT uses 1-indexed internally (add 1 to each 0-based index).

**Build — BIT state after inserting all elements:**

| i (1-indexed) | bit[i] covers (1-indexed) | bit[i] value |
|---|---|---|
| 1 | [1,1] → arr[0]=1 | 1 |
| 2 | [1,2] → arr[0]+arr[1] | 4 |
| 3 | [3,3] → arr[2]=5 | 5 |
| 4 | [1,4] → arr[0..3] | 16 |
| 5 | [5,5] → arr[4]=9 | 9 |

**prefixSum(arr[0..3]) = 1+3+5+7 = 16:** Call prefix(4) internally.
- i=4: sum += bit[4]=16. i -= 4&(-4)=4 → i=0. Stop. Return **16** ✓

**update(2, +4) — 0-based index 2 → 1-indexed position 3, arr[2]: 5→9:**
- i=3: bit[3] += 4 → bit[3]=9. i += 3&(-3)=1 → i=4
- i=4: bit[4] += 4 → bit[4]=20. i += 4&(-4)=4 → i=8 > 5. Stop.
- Nodes updated: **bit[3]** and **bit[4]** — the two nodes whose coverage range includes position 3.

### Complexity Summary
```
update(i, delta): O(log n)
prefix(i):        O(log n)
range(l, r):      O(log n)
Space:            O(n)
```

### Common Trap
- Fenwick Trees MUST be 1-indexed. If your array is 0-indexed, add 1 to every index before calling update/prefix. This is the #1 source of bugs.
- Using Fenwick for range min/max — it only works correctly for operations where computing the inverse (like subtraction) is meaningful. Sum works; min does not.

### Experience Tip
**Experience Tip:** For "Count of Smaller Numbers After Self" (LC 315), coordinate-compress the values to map them to [1, n], then process the array right to left. For each element, first query prefix(val-1) to count how many already-inserted elements are smaller, then update(val, 1) to mark it as inserted.

### Do Not Confuse With
| | Fenwick Tree (BIT) | Prefix Sum Array |
|---|---|---|
| **Use when** | Frequent point updates AND range queries | Array is static (no updates); range queries only |
| **Key difference** | O(log n) update + O(log n) query | O(1) query but O(n) to rebuild after any update |
| **Wrong choice** | Prefix Sum when array has updates | Fenwick when array never changes |

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 307 | Range Sum Query - Mutable | Medium | Direct BIT application — start here | https://leetcode.com/problems/range-sum-query-mutable/ |
| 315 | Count of Smaller Numbers After Self | Hard | Coordinate compress + BIT; process right to left | https://leetcode.com/problems/count-of-smaller-numbers-after-self/ |

### One-Minute Revision
```
STRUCTURE:       Fenwick Tree / BIT (Binary Indexed Tree)
IN SIMPLE WORDS: Compact array for prefix sums with updates; uses bit tricks
USE WHEN:        Prefix sums + point updates; counting elements in ranges
DON'T USE WHEN:  Need range min/max (use Segment Tree); no updates (use prefix array)
KEY OPERATIONS:  update O(log n), prefix O(log n), range O(log n)
TIME:            O(log n) per operation
SPACE:           O(n)
COMMON TRAP:     Must be 1-indexed — always add 1 to 0-based indices
```

---

## Monotonic Deque

### What is it?
A double-ended queue (deque) that is always kept in sorted order (either always increasing or always decreasing) by removing elements from the back before inserting. It exists to answer "what is the maximum/minimum in this sliding window?" in O(1) per step — impossible with a plain queue.

### Visual
```
Array: [3, 1, 2, 5, 4],  window size k=3

Processing element 5 (index 3):
  Deque before: [1, 2] (stores indices, values 1 and 2)
  5 > 2, so pop 2. 5 > 1, so pop 1.
  Push index 3 (value 5).
  Deque: [3]  → window max = arr[3] = 5  ✓

The deque stores INDICES. It is monotonically DECREASING by value.
Front of deque = index of the max element in the current window.
```

### Key Operations
| Operation | Time Complexity | Brief Description |
|---|---|---|
| addElement(i) | O(1) amortized | Pop from back while back < arr[i], then push i |
| getMax() | O(1) | Peek at front of deque (it's always the max) |
| removeOutdated(l) | O(1) | Pop front if its index < left boundary l |

### How does it work?
1. The deque stores **indices** (not values) of array elements.
2. It is maintained in **monotonically decreasing order of values** (for maximum; flip for minimum).
3. When you add index i: pop from the **back** of the deque while `arr[deque.back()] <= arr[i]`. Then push i to the back.
4. When the window slides (left boundary moves to l): if the front of the deque is < l, pop it from the **front**.
5. The **front** of the deque is always the index of the maximum element in the current window.
6. Every element is pushed and popped at most once → O(n) total across all windows.

### Why does it work?
Any element that is smaller than a newer element can NEVER be the window maximum while that newer element is still in the window. So it is safe to discard it immediately, keeping the deque clean.

### When to use?
- "Sliding window maximum or minimum" — the canonical use case.
- Any problem where you repeatedly ask "what is the best element in a recent window?"
- Problems involving "next greater element" or "previous smaller element" patterns.
- Optimizing DP transitions where you're tracking the best result in a recent range.

### When NOT to use?
- Window size is fixed and small — a simple loop is fine.
- You need both max AND min simultaneously — you'd need two separate deques.

### How to recognize in a new problem?
Ask: "Is there a sliding window, and I need the max/min of that window efficiently?"

Concrete signals:
- "Sliding window of size k, find maximum in each window"
- "Find the maximum minus minimum in any subarray of length k"
- "Jump game" variants where you track max reachability in a recent window

### Simple Example
Problem: Array = [1, 3, -1, -3, 5, 3, 6, 7], window k = 3. Find max in each window.

Trace:
```
i=0 (val=1):  deque=[0]
i=1 (val=3):  3>1, pop 0. Push 1. deque=[1]  (window not full yet)
i=2 (val=-1): -1<3, just push 2. deque=[1,2]  window=[1,3,-1] max=arr[1]=3 ✓
i=3 (val=-3): -3<-1, push 3. deque=[1,2,3]  window=[3,-1,-3] max=arr[1]=3 ✓
i=4 (val=5):  remove front 1 (index 1 < left boundary 2). deque=[2,3].
              5>-3 pop 3; 5>-1 pop 2. Push 4. deque=[4]  max=arr[4]=5 ✓
i=5 (val=3):  3<5, push 5. deque=[4,5]  window=[−1,5,3] max=arr[4]=5 ✓
i=6 (val=6):  remove front 4 (index 4 < left boundary 4? No, boundary is 4).
              6>3 pop 5; 6>5 pop 4. Push 6. deque=[6]  max=arr[6]=6 ✓
i=7 (val=7):  7>6, pop 6. Push 7. deque=[7]  max=arr[7]=7 ✓

Output: [3, 3, 5, 5, 6, 7]
```

### Code
```java
// Java — sliding window maximum
import java.util.ArrayDeque;
import java.util.Deque;

public int[] maxSlidingWindow(int[] nums, int k) {
    int n = nums.length;
    int[] result = new int[n - k + 1];
    Deque<Integer> deque = new ArrayDeque<>(); // stores indices

    for (int i = 0; i < n; i++) {
        // Remove indices that are outside the window
        while (!deque.isEmpty() && deque.peekFirst() < i - k + 1)
            deque.pollFirst();

        // Remove indices whose values are less than nums[i] (they can never be max)
        while (!deque.isEmpty() && nums[deque.peekLast()] < nums[i])
            deque.pollLast();

        deque.offerLast(i);

        // Window is full
        if (i >= k - 1)
            result[i - k + 1] = nums[deque.peekFirst()];
    }
    return result;
}
```

```javascript
// JavaScript — sliding window maximum
function maxSlidingWindow(nums, k) {
    const n = nums.length;
    const result = [];
    const deque = []; // stores indices

    for (let i = 0; i < n; i++) {
        // Remove indices outside the window
        while (deque.length > 0 && deque[0] < i - k + 1)
            deque.shift();

        // Remove indices whose values are smaller than nums[i]
        while (deque.length > 0 && nums[deque[deque.length - 1]] < nums[i])
            deque.pop();

        deque.push(i);

        // Window is full
        if (i >= k - 1)
            result.push(nums[deque[0]]);
    }
    return result;
}
```

### Dry Run
Array [1,3,-1,-3,5,3,6,7], k=3. Deque stores indices; values shown in parentheses.

| i | arr[i] | Action | Deque (indices) | Window | Max |
|---|---|---|---|---|---|
| 0 | 1 | push 0 | [0] | — | — |
| 1 | 3 | 3>1: pop 0, push 1 | [1] | — | — |
| 2 | -1 | -1<3: push 2 | [1,2] | [1,3,-1] | arr[1]=**3** |
| 3 | -3 | -3<-1: push 3 | [1,2,3] | [3,-1,-3] | arr[1]=**3** |
| 4 | 5 | expire front 1 (1<2); 5>-3: pop 3; 5>-1: pop 2; push 4 | [4] | [-1,-3,5] | arr[4]=**5** |
| 5 | 3 | 3<5: push 5 | [4,5] | [-3,5,3] | arr[4]=**5** |
| 6 | 6 | expire front 4 (4<4? No); 6>3: pop 5; 6>5: pop 4; push 6 | [6] | [5,3,6] | arr[6]=**6** |
| 7 | 7 | 7>6: pop 6; push 7 | [7] | [3,6,7] | arr[7]=**7** |

Output: [3, 3, 5, 5, 6, 7] ✓

### Complexity Summary
```
Per element:  O(1) amortized (each element pushed and popped at most once)
Total:        O(n) for n elements
Space:        O(k) — deque holds at most k indices at any time
```

### Common Trap
- Storing values in the deque instead of indices — you cannot check if the front element has "fallen out" of the window without knowing its original index.
- Forgetting to check if the front of the deque is out of the window (before reading it as the max). This causes stale maximums.

### Experience Tip
**Experience Tip:** The deque always represents a "useful candidates" list. An element is popped from the back because "a newer, bigger element makes this one permanently useless." An element is popped from the front because "it's too old — it fell off the left edge of the window." These two cleanup rules together define the pattern.

### Do Not Confuse With
| | Monotonic Deque | Monotonic Stack |
|---|---|---|
| **Use when** | Sliding window max/min — elements expire from FRONT | Next greater/smaller — elements expire from BACK only |
| **Key difference** | Supports removal from BOTH ends (expired + dominated) | Supports removal from BACK only |
| **Wrong choice** | Stack for sliding window (can't remove expired front elements) | Deque for simple next-greater (deque is overkill) |

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 239 | Sliding Window Maximum | Hard | The canonical monotonic deque problem — implement this cold | https://leetcode.com/problems/sliding-window-maximum/ |

### One-Minute Revision
```
STRUCTURE:       Monotonic Deque
IN SIMPLE WORDS: A deque kept in sorted order; front = max (or min) of window
USE WHEN:        Sliding window max/min; "best element in recent range"
DON'T USE WHEN:  Small fixed window (plain loop); need both max and min (use two deques)
KEY OPERATIONS:  addElement O(1), getMax O(1), removeOutdated O(1)
TIME:            O(n) total — each element added/removed at most once
SPACE:           O(k) — deque size bounded by window size
COMMON TRAP:     Store INDICES not values; check if front is out-of-window before reading
```

---

## Quick Decision Guide

```
WHAT DOES YOUR PROBLEM NEED?               USE THIS
─────────────────────────────────────────────────────────
Prefix search / autocomplete / dictionary   Trie
Word search in grid + multiple words        Trie + DFS backtracking
─────────────────────────────────────────────────────────
"Same group?" / connected components        DSU (Union-Find)
Cycle detection in undirected graph         DSU (union returns false = cycle)
Merging accounts / groups over time         DSU
─────────────────────────────────────────────────────────
Range sum/min/max + point UPDATES           Segment Tree (or Fenwick for sum)
Range sum with RANGE updates                Segment Tree with Lazy Propagation
Prefix sums + point updates (simplest)      Fenwick Tree / BIT
Range sum, NO updates                       Plain prefix sum array
─────────────────────────────────────────────────────────
Sliding window MAX or MIN                   Monotonic Deque
"Next greater element" pattern              Monotonic Stack (variant)
─────────────────────────────────────────────────────────
```

*Next: [17-STRING-ALGORITHMS.md](17-STRING-ALGORITHMS.md)*

---

## XOR Trie (Binary Trie)

### What is it?
A binary trie that stores integers bit-by-bit from the most significant bit (bit 31 down to bit 0). Used to find the maximum XOR pair in O(32) per query instead of O(n²) brute force. Each node has exactly 2 children: one for bit 0, one for bit 1.

### Visual
```
Inserting [3, 10, 5, 25, 2, 8] — showing top 5 bits (bit4..bit0):
  3  = 00011
  10 = 01010
  5  = 00101
  25 = 11001
  2  = 00010
  8  = 01000

              root
             /    \
           [0]    [1]          ← bit 4  (25 goes right; rest go left)
           / \      \
         [0] [1]   [1]         ← bit 3
         /\   \      \
       [0][0] [0]   [0]        ← bit 2  ...

Query maxXOR(25 = 11001):
  bit4: x=1 → want 0-child (exists: 3,10,5,2,8) → result |= bit4 → go left
  bit3: x=1 → want 0-child (exists) → result |= bit3 → go left
  bit2: x=0 → want 1-child (exists: 5=00101) → result |= bit2 → go right
  bit1: x=0 → want 1-child (exists: 5 has bit1=0... let's check 3=011) → result |= bit1
  bit0: x=1 → want 0-child → result |= bit0
  maxXOR(25) = 28  (25 XOR 5 = 11001 XOR 00101 = 11100 = 28)
```

### How does it work?
1. Each node has 2 children: `children[0]` and `children[1]`.
2. **Insert:** For each bit from bit 31 down to bit 0, go to the child corresponding to that bit, creating it if absent.
3. **Query maxXOR(x):** At each bit position of x, greedily try to go to the OPPOSITE bit's child (to produce a 1 in the XOR result). If the opposite child exists, go there and add 2^bit to the result. Otherwise go to the same child (XOR gets 0 for this bit).
4. Repeat for all 32 bits.

### Why does it work?
XOR is maximized when corresponding bits differ. By greedily choosing the opposite bit at each step from MSB to LSB, we maximize the most significant differences first. A 1 in a higher bit always outweighs any combination of 1s in lower bits, so this greedy choice is always globally optimal.

### When to use?
- "Find the maximum XOR of any two numbers in an array."
- "Given a query x, find the number in the set that maximizes XOR with x."
- Any problem involving maximizing a bitwise XOR metric over a set of integers.

### When NOT to use?
- XOR is not part of the problem — don't reach for this structure unless XOR is explicit.
- Input size is tiny (n ≤ 1000) — O(n²) brute force is acceptable and simpler.

### How to recognize it in a problem?
Ask: "Does the problem involve maximizing XOR between elements, or finding a number that XORs best with a query?"

Concrete signals:
- "Maximum XOR of two numbers"
- "For each query, find the element maximizing XOR with it"
- "Path XOR" or "subarray XOR" maximization

### Example problem
Array = [3, 10, 5, 25, 2, 8]. Find the maximum XOR of any two numbers.

### Code
```java
// Java — XOR Trie (32-bit integers)
class XORTrie {
    int[][] children;
    int cnt = 1; // node 0 is root

    XORTrie(int maxNodes) {
        children = new int[maxNodes][2];
    }

    void insert(int num) {
        int node = 0;
        for (int i = 31; i >= 0; i--) {
            int bit = (num >> i) & 1;
            if (children[node][bit] == 0)
                children[node][bit] = cnt++;
            node = children[node][bit];
        }
    }

    int maxXOR(int num) {
        int node = 0, result = 0;
        for (int i = 31; i >= 0; i--) {
            int bit = (num >> i) & 1;
            int want = 1 - bit; // opposite bit maximizes XOR
            if (children[node][want] != 0) {
                result |= (1 << i);
                node = children[node][want];
            } else {
                node = children[node][bit];
            }
        }
        return result;
    }
}

// LC 421: Maximum XOR of Two Numbers in an Array
class Solution {
    public int findMaximumXOR(int[] nums) {
        XORTrie trie = new XORTrie(32 * nums.length + 5);
        int max = 0;
        for (int n : nums) trie.insert(n);
        for (int n : nums) max = Math.max(max, trie.maxXOR(n));
        return max;
    }
}
```

```javascript
// JavaScript — XOR Trie
class XORTrieNode {
    constructor() { this.children = [null, null]; }
}

class XORTrie {
    constructor() { this.root = new XORTrieNode(); }

    insert(num) {
        let node = this.root;
        for (let i = 31; i >= 0; i--) {
            const bit = (num >>> i) & 1;
            if (!node.children[bit]) node.children[bit] = new XORTrieNode();
            node = node.children[bit];
        }
    }

    maxXOR(num) {
        let node = this.root, result = 0;
        for (let i = 31; i >= 0; i--) {
            const bit = (num >>> i) & 1;
            const want = 1 - bit;
            if (node.children[want]) {
                result |= (1 << i);
                node = node.children[want];
            } else {
                node = node.children[bit];
            }
        }
        return result;
    }
}

// LC 421
function findMaximumXOR(nums) {
    const trie = new XORTrie();
    nums.forEach(n => trie.insert(n));
    return nums.reduce((max, n) => Math.max(max, trie.maxXOR(n)), 0);
}
```

### Dry Run
```
nums = [3, 10, 5, 25, 2, 8]
After inserting all 6 numbers, trie has 32-level paths for each.

maxXOR(25 = 11001):
  Greedy traversal from bit 31 → bit 0.
  At bits 31-5: 25 has 0s, opposite is 1, but no numbers have those high bits set → same child
  bit4: 25=1 → want 0-child (exists: 3,10,5,2,8 all have bit4=0) → result |= 16
  bit3: 25=1 → want 0-child (exists) → result |= 8
  bit2: 25=0 → want 1-child (5=00101 has bit2=1) → result |= 4
  bit1: 25=0 → want 1-child (from 5's path) → result |= 2
  bit0: 25=1 → want 0-child (5's bit0=1, so 0-child from 5 path... 3=011 has bit0=1)
  maxXOR(25) = 28  (25 XOR 5 = 28)  ✓
```

### Complexity
```
Insert:  O(32) per number
Query:   O(32) per query
Total:   O(32n) for n numbers
Space:   O(32n) nodes in the worst case
```

### Common traps
- Using 31 bits instead of 32 — numbers up to 2^31-1 need bits 31 down to 0 (32 iterations: `i = 31; i >= 0`).
- In JavaScript, use `>>>` (unsigned right shift) instead of `>>` to avoid sign-bit issues with negative numbers.
- Forgetting that `want = 1 - bit` is the XOR-maximizing choice, not `bit` itself.

### Experience Tip
**Experience Tip:** For "Maximum XOR With an Element From Array" (LC 1707), sort both queries and the array, then process queries offline in increasing order of their limit. Insert numbers into the trie only when they are ≤ the current query's limit. This turns an O(n²) problem into O((n+q) log(n+q) + 32(n+q)).

### Do Not Confuse With
- **Regular Trie:** Stores characters (a–z), up to 26 children per node. XOR Trie stores bits (0/1), exactly 2 children per node.
- **Bitmask DP:** Used for small sets (n ≤ 20). XOR Trie handles large integer values and large arrays.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 421 | Maximum XOR of Two Numbers in an Array | Medium | Insert all, then query maxXOR for each — the template | https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/ |
| 1707 | Maximum XOR With an Element From Array | Hard | Offline queries sorted by limit; insert numbers as limit grows | https://leetcode.com/problems/maximum-xor-with-an-element-from-array/ |
| 1803 | Count Pairs With XOR in a Range | Hard | Trie + count paths giving XOR ≤ upper minus XOR ≤ lower | https://leetcode.com/problems/count-pairs-with-xor-in-a-range/ |
| 1938 | Maximum Genetic Difference Query | Hard | Tree path XOR + offline DFS with trie insert/remove | https://leetcode.com/problems/maximum-genetic-difference-query/ |
| 2935 | Maximum Strong Pair XOR II | Hard | Sliding window + XOR trie under a size constraint | https://leetcode.com/problems/maximum-strong-pair-xor-ii/ |

### One-Minute Revision
```
STRUCTURE:       XOR Trie (Binary Trie)
IN SIMPLE WORDS: Binary trie on integer bits; greedy opposite-bit traversal maximizes XOR
USE WHEN:        Maximize XOR of two numbers; "best XOR match" queries
DON'T USE WHEN:  XOR not involved; tiny input (use O(n²))
KEY OPERATIONS:  insert O(32), maxXOR O(32)
TIME:            O(32n) total
SPACE:           O(32n) nodes
COMMON TRAP:     Loop from bit 31 to 0 (32 iterations); want = 1 - currentBit
```

---

## Sparse Table

### What is it?
A static data structure for range minimum/maximum queries (RMQ) with O(1) query time after O(n log n) preprocessing. Works only on immutable arrays and idempotent functions — functions where applying them twice on the same data gives the same result (min, max, GCD). Does NOT work for range sum.

### Visual
```
Array (0-indexed): [2, 4, 3, 1, 6, 7, 8, 9]
                    0  1  2  3  4  5  6  7

sparse[i][j] = min of arr[i .. i + 2^j - 1]

j=0 (length 1): [2, 4, 3, 1, 6, 7, 8, 9]
j=1 (length 2): [2, 3, 1, 1, 6, 7, 8, -]
  sparse[0][1]=min(2,4)=2  sparse[1][1]=min(4,3)=3  sparse[2][1]=min(3,1)=1  ...
j=2 (length 4): [1, 1, 1, 1, 6, -, -, -]
  sparse[0][2]=min(sparse[0][1],sparse[2][1])=min(2,1)=1  ...
j=3 (length 8): [1, -, -, -, -, -, -, -]

Query min(2, 6): length=5, k=floor(log2(5))=2 (2^2=4)
  min(sparse[2][2], sparse[6-4+1][2]) = min(sparse[2][2], sparse[3][2]) = min(1,1) = 1 ✓
  (The two ranges [2..5] and [3..6] overlap — OK because min is idempotent)
```

### How does it work?
1. **Build:** `sparse[i][0] = arr[i]`. For j ≥ 1: `sparse[i][j] = func(sparse[i][j-1], sparse[i + 2^(j-1)][j-1])`. Each cell stores the answer for a range of length 2^j starting at i.
2. **Query(l, r):** Compute `k = floor(log2(r - l + 1))`. Return `func(sparse[l][k], sparse[r - 2^k + 1][k])`.
3. The two query ranges of length 2^k together cover all of [l, r] (possibly with overlap).
4. Overlap is harmless because min/max/GCD are idempotent.
5. Precompute a `log2[]` integer array to make step 2 a simple lookup.

### Why does it work?
Any range of length n can be covered by two (possibly overlapping) ranges of length 2^k where k = floor(log2(n)). Since min/max are idempotent — min(min(a,b), min(b,c)) = min(a,b,c) — the overlap does not double-count or corrupt the answer.

### When to use?
- Static array (no updates) with repeated range min, max, or GCD queries.
- Situations requiring O(1) per query (tight time limits, massive query counts).
- LCA (Lowest Common Ancestor) via Euler tour + Sparse Table for RMQ.

### When NOT to use?
- Array has updates — Sparse Table is static; any update requires full O(n log n) rebuild. Use Segment Tree.
- You need range sum — sum is NOT idempotent (overlap would double-count). Use Fenwick Tree or prefix sum array.

### How to recognize it in a problem?
Ask: "Do I have a fixed array and need many fast range min/max queries?"

Concrete signals:
- "Array is fixed, answer Q range minimum queries efficiently"
- "LCA in a tree" (Euler tour reduces to RMQ)
- Problems requiring O(1) per range query after preprocessing

### Example problem
Array = [2, 4, 3, 1, 6, 7, 8, 9]. Answer: min(0,5), min(2,7), min(3,6).

### Code
```java
// Java — Sparse Table for Range Minimum Query
class SparseTable {
    int[][] sparse;
    int[] log2;
    int n;

    SparseTable(int[] arr) {
        n = arr.length;
        int LOG = 1;
        while ((1 << LOG) <= n) LOG++;
        sparse = new int[n][LOG];
        log2 = new int[n + 1];

        log2[1] = 0;
        for (int i = 2; i <= n; i++) log2[i] = log2[i / 2] + 1;

        for (int i = 0; i < n; i++) sparse[i][0] = arr[i];

        for (int j = 1; j < LOG; j++)
            for (int i = 0; i + (1 << j) <= n; i++)
                sparse[i][j] = Math.min(sparse[i][j-1],
                                        sparse[i + (1 << (j-1))][j-1]);
    }

    // O(1) range minimum query [l, r] inclusive
    int query(int l, int r) {
        int k = log2[r - l + 1];
        return Math.min(sparse[l][k], sparse[r - (1 << k) + 1][k]);
    }
}
```

```javascript
// JavaScript — Sparse Table for Range Minimum Query
class SparseTable {
    constructor(arr) {
        this.n = arr.length;
        const LOG = Math.floor(Math.log2(this.n)) + 2;
        this.sparse = Array.from({length: this.n}, () => new Array(LOG).fill(0));
        this.log2 = new Array(this.n + 1).fill(0);

        for (let i = 2; i <= this.n; i++) this.log2[i] = this.log2[i >> 1] + 1;

        for (let i = 0; i < this.n; i++) this.sparse[i][0] = arr[i];

        for (let j = 1; j < LOG; j++)
            for (let i = 0; i + (1 << j) <= this.n; i++)
                this.sparse[i][j] = Math.min(this.sparse[i][j-1],
                                              this.sparse[i + (1 << (j-1))][j-1]);
    }

    // O(1) range minimum query [l, r] inclusive
    query(l, r) {
        const k = this.log2[r - l + 1];
        return Math.min(this.sparse[l][k], this.sparse[r - (1 << k) + 1][k]);
    }
}
```

### Dry Run
```
arr = [2, 4, 3, 1, 6, 7, 8, 9], n=8

Build:
  sparse[i][0] = arr[i]:   [2, 4, 3, 1, 6, 7, 8, 9]
  sparse[i][1] (len 2):    [2, 3, 1, 1, 6, 7, 8, -]
  sparse[i][2] (len 4):    [1, 1, 1, 1, 6, -, -, -]
  sparse[i][3] (len 8):    [1, -, -, -, -, -, -, -]

query(0, 5): length=6, k=log2[6]=2 (2^2=4)
  min(sparse[0][2], sparse[5-4+1][2]) = min(sparse[0][2], sparse[2][2])
  = min(1, 1) = 1  ✓  (min of [2,4,3,1,6,7] = 1)

query(2, 7): length=6, k=2
  min(sparse[2][2], sparse[4][2]) = min(1, 6) = 1  ✓  (min of [3,1,6,7,8,9] = 1)

query(3, 6): length=4, k=2
  min(sparse[3][2], sparse[3][2]) = 1  ✓  (min of [1,6,7,8] = 1)
```

### Complexity
```
Build:   O(n log n) time, O(n log n) space
Query:   O(1) — exactly two table lookups + a min/max
Log precompute: O(n)
Note:    NOT for range sum (not idempotent); NOT for mutable arrays
```

### Common traps
- Using Sparse Table for range sum — sum is NOT idempotent; overlapping ranges double-count. Only valid for min, max, GCD.
- Updating the array after building — Sparse Table is fully static. Any change requires a complete rebuild.
- Off-by-one in query formula: right anchor is `r - (1 << k) + 1`, not `r - (1 << k)`.
- Using `Math.log2()` in the query itself — floating-point errors can give wrong k. Always use a precomputed integer `log2[]` array.

### Experience Tip
**Experience Tip:** Precompute `log2[i] = log2[i/2] + 1` as an integer array (starting from `log2[1] = 0`) rather than calling `Math.log()` or `(int)(Math.log(x)/Math.log(2))` on every query. Floating-point can give k = 2 when k should be 3 for some inputs near powers of 2.

### Do Not Confuse With
- **Segment Tree:** Supports updates O(log n) and any merge function. Sparse Table is faster for static queries but cannot update.
- **Fenwick Tree:** For prefix sums with point updates. Cannot do range min/max.
- **Prefix Sum Array:** O(1) range sum on static arrays — but only for sum, not min/max.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 239 | Sliding Window Maximum | Hard | Sparse Table gives O(1) per window query vs O(n) deque total | https://leetcode.com/problems/sliding-window-maximum/ |
| 1793 | Maximum Score of a Good Subarray | Hard | Range minimum within a fixed center — sparse table enables O(1) checks | https://leetcode.com/problems/maximum-score-of-a-good-subarray/ |
| 2866 | Beautiful Towers II | Hard | Range max queries for each candidate peak position | https://leetcode.com/problems/beautiful-towers-ii/ |
| 1567 | Maximum Length of Subarray With Positive Product | Medium | Range product sign queries — sparse table for static subarrays | https://leetcode.com/problems/maximum-length-of-subarray-with-positive-product/ |
| 2104 | Sum of Subarray Ranges | Medium | Range min and max queries — sparse table accelerates O(n²) to O(n log n) | https://leetcode.com/problems/sum-of-subarray-ranges/ |

### One-Minute Revision
```
STRUCTURE:       Sparse Table
IN SIMPLE WORDS: 2D precomputed table; any range min/max answered in O(1) via two lookups
USE WHEN:        Static array, many range min/max/GCD queries, O(1) query needed
DON'T USE WHEN:  Array has updates (use Segment Tree); range SUM (use prefix array/Fenwick)
KEY OPERATIONS:  build O(n log n), query O(1)
TIME:            O(1) query after O(n log n) build
SPACE:           O(n log n)
COMMON TRAP:     NOT for sum (not idempotent); static only; use integer log2 array
```

---

## Weighted DSU / DSU with Rollback

### What is it?
Two powerful extensions of the standard Union-Find:
- **Weighted DSU:** Each node stores a weight relative to its parent. Enables finding the relative ratio or difference between any two connected nodes without storing absolute values.
- **DSU with Rollback:** Can undo union operations by maintaining a stack of changes. Required for offline dynamic connectivity (edges added AND removed over time). Must use union by rank WITHOUT path compression — path compression changes multiple parent pointers and cannot be reversed.

### Visual
```
Weighted DSU — a/b=2.0, b/c=3.0 (weight[x] = value[x] / value[parent[x]]):
  union(a→0, b→1, ratio=2.0): parent[0]=1, weight[0]=2.0
  union(b→1, c→2, ratio=3.0): parent[1]=2, weight[1]=3.0

  find(0): root=2, weight[0] = 2.0 * 3.0 = 6.0  (path compression composes weights)
  query(0, 2): weight[0]/weight[2] = 6.0/1.0 = 6.0  → a/c = 6  ✓

DSU with Rollback — stack of reversible changes:
  state:  parent=[0,1,2,3,4]  (each is its own root)
  union(1,2) → push {node=1, oldParent=1, rankOf2=0}; parent[1]=2
  union(0,2) → push {node=0, oldParent=0, rankOf2=1}; parent[0]=2
  rollback() → pop: restore parent[0]=0, rank[2] as saved
  rollback() → pop: restore parent[1]=1, rank[2] as saved
  state:  parent=[0,1,2,3,4]  (fully restored) ✓
```

### How does it work?
**Weighted DSU:**
1. `weight[x]` = `value[x] / value[parent[x]]`. Roots have `weight[root] = 1.0`.
2. `find(x)`: recurse to root, compose weights with path compression. After `find(x)`, `weight[x] = value[x] / value[root]`.
3. `union(x, y, r)` where `r = value[x] / value[y]`: find roots, set `parent[rootX] = rootY`, compute `weight[rootX] = r * weight[y] / weight[x]`.
4. `query(x, y)`: if same root, return `weight[x] / weight[y]`.

**DSU with Rollback:**
1. `find(x)`: plain iterative walk up, NO path compression.
2. `union(x, y)`: find roots, attach smaller-rank root under larger. Push `{node, oldParent, oldRankOfNewRoot}` to stack.
3. `rollback()`: pop stack entry, reverse the single parent-pointer change and rank change.

### Why does it work?
Weighted DSU: path compression propagates composed weights, so after any `find`, the weight is always relative to the root — enabling O(1) ratio queries.

Rollback DSU: union by rank makes exactly ONE structural change (one `parent[y] = x`), which is trivially reversible. Path compression would change O(log n) pointers per call — impossible to roll back without storing the entire path.

### When to use?
- **Weighted DSU:** "Given ratios or differences between pairs of variables, answer queries about their relative values."
- **DSU with Rollback:** Offline queries with both edge insertions and deletions (dynamic connectivity); backtracking search where you try unions and undo them.

### When NOT to use?
- Standard DSU is sufficient when no weights and no rollback are needed.
- Online edge deletions only (no insertions) — consider link-cut trees instead.

### How to recognize it in a problem?
Ask: "Do nodes have relative weights/ratios between them?" → Weighted DSU.
Ask: "Do I need to undo union operations or process edge deletions?" → DSU with Rollback.

Concrete signals:
- "Given equations a/b = k, evaluate a/c"
- "Dynamic connectivity: add and remove edges, answer connectivity queries"
- "Persistent or rollback-capable union-find"

### Example problem
Weighted DSU — Given a/b = 2.0, b/c = 3.0. Evaluate a/c and c/a.

### Code
```java
// Java — Weighted DSU (ratios: value[x] / value[parent[x]] = weight[x])
class WeightedDSU {
    int[] parent;
    double[] weight; // weight[x] = value[x] / value[parent[x]]

    WeightedDSU(int n) {
        parent = new int[n];
        weight = new double[n];
        Arrays.fill(weight, 1.0);
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    int find(int x) {
        if (parent[x] == x) return x;
        int root = find(parent[x]);
        weight[x] *= weight[parent[x]]; // compose: weight[x] = value[x]/value[root]
        parent[x] = root;               // path compression
        return root;
    }

    // union(x, y, r): value[x] / value[y] = r
    void union(int x, int y, double r) {
        int px = find(x), py = find(y);
        if (px == py) return;
        // weight[x] = value[x]/value[px], weight[y] = value[y]/value[py]
        // want weight[px] = value[px]/value[py] = (1/weight[x]) * r * weight[y]
        parent[px] = py;
        weight[px] = r * weight[y] / weight[x];
    }

    // Returns value[x] / value[y], or -1 if not connected
    double query(int x, int y) {
        if (find(x) != find(y)) return -1.0;
        return weight[x] / weight[y];
    }
}

// Java — DSU with Rollback (NO path compression; union by rank only)
class RollbackDSU {
    int[] parent, rank;
    Deque<int[]> stack = new ArrayDeque<>(); // [node, oldParent, oldRank]

    RollbackDSU(int n) {
        parent = new int[n]; rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    int find(int x) { // NO path compression
        while (parent[x] != x) x = parent[x];
        return x;
    }

    void union(int x, int y) {
        x = find(x); y = find(y);
        if (x == y) { stack.push(new int[]{-1, -1, -1}); return; } // no-op sentinel
        if (rank[x] < rank[y]) { int t = x; x = y; y = t; }
        stack.push(new int[]{y, parent[y], rank[x]});
        parent[y] = x;
        if (rank[x] == rank[y]) rank[x]++;
    }

    void rollback() {
        int[] entry = stack.pop();
        if (entry[0] == -1) return;
        int y = entry[0];
        int x = parent[y]; // current parent (the root we attached y under)
        rank[x] = entry[2];
        parent[y] = entry[1];
    }

    boolean connected(int x, int y) { return find(x) == find(y); }
}
```

```javascript
// JavaScript — Weighted DSU
class WeightedDSU {
    constructor(n) {
        this.parent = Array.from({length: n}, (_, i) => i);
        this.weight = new Array(n).fill(1.0);
    }

    find(x) {
        if (this.parent[x] === x) return x;
        const root = this.find(this.parent[x]);
        this.weight[x] *= this.weight[this.parent[x]];
        this.parent[x] = root;
        return root;
    }

    union(x, y, r) {
        const px = this.find(x), py = this.find(y);
        if (px === py) return;
        this.parent[px] = py;
        this.weight[px] = r * this.weight[y] / this.weight[x];
    }

    query(x, y) {
        if (this.find(x) !== this.find(y)) return -1.0;
        return this.weight[x] / this.weight[y];
    }
}

// JavaScript — DSU with Rollback
class RollbackDSU {
    constructor(n) {
        this.parent = Array.from({length: n}, (_, i) => i);
        this.rank = new Array(n).fill(0);
        this.stack = [];
    }

    find(x) {
        while (this.parent[x] !== x) x = this.parent[x]; // NO path compression
        return x;
    }

    union(x, y) {
        x = this.find(x); y = this.find(y);
        if (x === y) { this.stack.push(null); return; }
        if (this.rank[x] < this.rank[y]) { [x, y] = [y, x]; }
        this.stack.push([y, this.parent[y], this.rank[x]]);
        this.parent[y] = x;
        if (this.rank[x] === this.rank[y]) this.rank[x]++;
    }

    rollback() {
        const entry = this.stack.pop();
        if (!entry) return;
        const [y, oldParent, oldRank] = entry;
        this.rank[this.parent[y]] = oldRank;
        this.parent[y] = oldParent;
    }

    connected(x, y) { return this.find(x) === this.find(y); }
}
```

### Dry Run
```
Weighted DSU — equations: a/b=2, b/c=3 (map a→0, b→1, c→2)

union(0, 1, 2.0): find(0)=0, find(1)=1 → parent[0]=1, weight[0]=2.0*1.0/1.0=2.0
union(1, 2, 3.0): find(1)=1, find(2)=2 → parent[1]=2, weight[1]=3.0*1.0/1.0=3.0

query(0, 2) — a/c:
  find(0): parent[0]=1→find(1): parent[1]=2→find(2)=2
           weight[1] *= weight[2]=1.0 → weight[1]=3.0, parent[1]=2
           weight[0] *= weight[1]=3.0 → weight[0]=6.0, parent[0]=2
  find(2)=2, weight[2]=1.0
  Same root: return weight[0]/weight[2] = 6.0/1.0 = 6.0  ✓  (a/c = a/b * b/c = 2*3=6)

query(2, 0) — c/a:
  return weight[2]/weight[0] = 1.0/6.0 ≈ 0.167  ✓
```

### Complexity
```
Weighted DSU:
  find / union / query: O(α(n)) amortized (path compression + union by rank)
  Space: O(n)

DSU with Rollback:
  find:     O(log n) — no path compression; tree height = O(log n) with union by rank
  union:    O(log n)
  rollback: O(1) per call
  Space:    O(n + number of unions stored on stack)
```

### Common traps
- Using path compression with rollback DSU — path compression modifies multiple parent pointers per call, making rollback impossible. Use union by rank ONLY for rollback.
- Weight direction in Weighted DSU: `weight[x] = value[x] / value[parent[x]]`. During path compression, weights must be multiplied (composed), not assigned directly.
- Not handling the "no-op" case in rollback (when x and y were already connected) — push a sentinel so every union has a matching rollback.

### Experience Tip
**Experience Tip:** For Evaluate Division (LC 399), map variable names to integers via a HashMap, then use Weighted DSU. The query answer for a/b is `weight[a] / weight[b]` after both find calls — you never need to track absolute variable values. If a query involves an unknown variable, return -1.0 immediately before even calling find.

### Do Not Confuse With
- **Standard DSU:** No weights, no rollback — simpler, and O(α(n)) vs O(log n) for rollback variant.
- **Bellman-Ford / BFS on a weighted graph:** Valid alternative for ratio queries but O(V+E) per query vs O(α(n)) amortized with Weighted DSU.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 399 | Evaluate Division | Medium | Classic weighted DSU — variable ratios as edge weights | https://leetcode.com/problems/evaluate-division/ |
| 721 | Accounts Merge | Medium | Standard DSU — same email means same person | https://leetcode.com/problems/accounts-merge/ |
| 685 | Redundant Connection II | Hard | Directed graph: DSU + case analysis for in-degree-2 nodes | https://leetcode.com/problems/redundant-connection-ii/ |
| 2421 | Number of Good Paths | Hard | Sort edges by value; DSU merges groups with matching endpoint values | https://leetcode.com/problems/number-of-good-paths/ |
| 1168 | Optimize Water Distribution in a Village | Hard | Add virtual well node 0; Kruskal's MST with standard DSU | https://leetcode.com/problems/optimize-water-distribution-in-a-village/ |

### One-Minute Revision
```
STRUCTURE:       Weighted DSU / DSU with Rollback
IN SIMPLE WORDS: DSU with edge weights for ratio queries, or with undo stack for dynamic connectivity
USE WHEN:        Ratio/difference queries between connected nodes; offline add+delete edge queries
DON'T USE WHEN:  No weights and no deletions needed (standard DSU is faster)
KEY OPERATIONS:  find/query O(α(n)) weighted; find O(log n) rollback; rollback O(1)
TIME:            O(α(n)) weighted; O(log n) rollback
SPACE:           O(n)
COMMON TRAP:     NO path compression with rollback; compose weights on path compression
```

---

## Balanced BST / Ordered Set (TreeMap / TreeSet)

### What is it?
A self-balancing binary search tree that maintains elements in sorted order and supports O(log n) insert, delete, floor (largest key ≤ x), ceiling (smallest key ≥ x), and range queries. In Java: `TreeMap<K,V>` and `TreeSet<E>` (Red-Black Tree internally). In JavaScript: no built-in equivalent — use a sorted array with binary search for simple cases, or an AVL/Red-Black library for production.

### Visual
```
TreeSet after inserting [5, 3, 7, 1, 4, 6, 9]:

         5 (Black)
        / \
     3(R)   7(R)
     / \    / \
  1(B) 4(B) 6(B) 9(B)
  (Red-Black Tree — self-balancing, height ≤ 2 log n)

Key queries on this set:
  floor(4.5)  → 4    (largest element ≤ 4.5)
  ceiling(4.5)→ 5    (smallest element ≥ 4.5)
  lower(3)    → 1    (strictly less than 3)
  higher(3)   → 4    (strictly greater than 3)
  first()     → 1    (minimum)
  last()      → 9    (maximum)
  subSet(3,7) → [3, 4, 5, 6]  (elements in [3, 7))
```

### How does it work?
1. Internally a Red-Black Tree ensures height = O(log n) via color-based rotation rules after every insert/delete.
2. **insert(x):** BST-insert at correct sorted position, then rebalance.
3. **delete(x):** BST-delete, then rebalance.
4. **floorKey(x):** Walk BST; at each node, if `node.key ≤ x` it is a candidate; take the best one found.
5. **ceilingKey(x):** Same, but take the best candidate where `node.key ≥ x`.
6. **subMap(l, r):** Returns a live sorted view of all keys in [l, r). Iteration is O(log n + k).

### Why does it work?
Red-Black Tree rotations and recoloring maintain the invariant that the longest path is at most 2× the shortest, guaranteeing O(log n) height. This gives O(log n) worst-case for all operations — unlike a plain BST which degrades to O(n) for sorted or adversarial input.

### When to use?
- "Find the closest number to x in a dynamic set."
- "Check if any two elements in a sliding window are within k of each other."
- Interval scheduling — find the nearest non-overlapping event using floor/ceiling.
- Sliding window median (two TreeSets acting as a lower/upper half).

### When NOT to use?
- You only need O(1) existence check — use HashSet.
- The dataset is static and sorted — use binary search on a plain array.
- You need frequent access by rank/index — TreeMap does not support O(log n) rank queries without augmentation.

### How to recognize it in a problem?
Ask: "Do I need to dynamically maintain a sorted set and query floor/ceiling of a value?"

Concrete signals:
- "Find if any two elements in the array are within k indices AND t values of each other"
- "My Calendar" — find the nearest non-overlapping interval
- "Sliding window median" — order statistics on a changing window
- "Count elements in range [l, r]" on a changing dataset

### Example problem
Problem: Contains Duplicate III — for any pair (i, j) with |i-j| ≤ k, is |nums[i] - nums[j]| ≤ t?

Trace:
```
Maintain a TreeSet as a sliding window of size k.
For each nums[i]:
  Check: does the set contain any value in [nums[i]-t, nums[i]+t]?
  Java: Long floor = set.floor(n+t); return floor != null && floor >= n-t;
  Add nums[i]. If window size > k, remove nums[i-k].
```

### Code
```java
// Java — TreeMap and TreeSet key operations
import java.util.TreeMap;
import java.util.TreeSet;

// TreeSet — ordered set
TreeSet<Integer> set = new TreeSet<>();
set.add(3); set.add(7); set.add(1); set.add(5);
set.floor(4);    // 3 — largest element ≤ 4
set.ceiling(4);  // 5 — smallest element ≥ 4
set.lower(3);    // 1 — strictly less than 3
set.higher(3);   // 5 — strictly greater than 3
set.first();     // 1 — minimum
set.last();      // 7 — maximum

// TreeMap — sorted key-value map
TreeMap<Integer, Integer> map = new TreeMap<>();
map.put(1, 100); map.put(3, 300); map.put(5, 500);
map.floorKey(4);              // 3
map.ceilingKey(4);            // 5
map.headMap(4).keySet();      // [1, 3] — all keys < 4
map.tailMap(3).keySet();      // [3, 5] — all keys >= 3
map.subMap(2, 5).keySet();    // [3]    — keys in [2, 5)
map.getOrDefault(3, 0);       // 300

// LC 220: Contains Duplicate III
class Solution {
    public boolean containsNearbyAlmostDuplicate(int[] nums, int k, long t) {
        TreeSet<Long> set = new TreeSet<>();
        for (int i = 0; i < nums.length; i++) {
            long n = (long) nums[i];
            Long floor = set.floor(n + t);
            if (floor != null && floor >= n - t) return true;
            set.add(n);
            if (i >= k) set.remove((long) nums[i - k]);
        }
        return false;
    }
}
```

```javascript
// JavaScript — no native TreeSet; use sorted array + binary search
// Binary search: index of first element >= target
function lowerBound(arr, target) {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// floor(x): largest element <= x
function floorVal(arr, x) {
    const i = lowerBound(arr, x + 1) - 1;
    return i >= 0 ? arr[i] : undefined;
}

// ceiling(x): smallest element >= x
function ceilingVal(arr, x) {
    const i = lowerBound(arr, x);
    return i < arr.length ? arr[i] : undefined;
}

// Sorted insert — O(n) due to splice; acceptable for small windows
function sortedInsert(arr, val) {
    arr.splice(lowerBound(arr, val), 0, val);
}

function sortedRemove(arr, val) {
    const i = lowerBound(arr, val);
    if (i < arr.length && arr[i] === val) arr.splice(i, 1);
}

// LC 220: Contains Duplicate III
function containsNearbyAlmostDuplicate(nums, k, t) {
    const window = [];
    for (let i = 0; i < nums.length; i++) {
        const n = nums[i];
        const f = floorVal(window, n + t);
        if (f !== undefined && f >= n - t) return true;
        sortedInsert(window, n);
        if (i >= k) sortedRemove(window, nums[i - k]);
    }
    return false;
}
// Note: JS sorted array insert/remove is O(n); for O(log n), use a BST library.
```

### Dry Run
```
LC 220: nums=[1,5,9,1,5,9], k=2, t=3

i=0: n=1. window=[]. No floor. Insert 1. window=[1]
i=1: n=5. floor(5+3=8)=1. Is 1 >= 5-3=2? No. Insert 5. window=[1,5]
i=2: n=9. floor(9+3=12)=5. Is 5 >= 9-3=6? No. Insert 9. Remove nums[0]=1. window=[5,9]
i=3: n=1. floor(1+3=4)=undefined (window=[5,9], no elem ≤ 4). Insert 1. Remove nums[1]=5.
     window=[1,9]
i=4: n=5. floor(5+3=8)=1. Is 1 >= 5-3=2? No. Insert 5. Remove nums[2]=9. window=[1,5]
i=5: n=9. floor(9+3=12)=5. Is 5 >= 9-3=6? No. window=[1,5,9]... wait remove nums[3]=1 first.
     Remove 1, window=[5]. floor(12)=5. Is 5 >= 6? No. Return false. ✓ (no such pair exists)
```

### Complexity
```
Java TreeSet / TreeMap:
  insert, delete, floor, ceiling, lower, higher: O(log n) each
  subSet / headSet / tailSet (view):             O(log n) to obtain the view
  Iterating a view of k elements:                O(log n + k)
  Space: O(n)

JavaScript sorted array workaround:
  floor, ceiling (binary search): O(log n)
  insert, remove (array splice):  O(n) — not suitable for large inputs
  For O(log n) all ops in JS: use a BST library (e.g., 'sorted-btree', 'avl')
```

### Common traps
- In Java, `floor(x)` and `ceiling(x)` return `null` when no qualifying element exists — always null-check before using the result.
- Confusing `floor`/`lower` and `ceiling`/`higher`: `floor(x)` includes x (≤ x); `lower(x)` is strictly less (< x). Same distinction for `ceiling` (≥) vs `higher` (>).
- In JavaScript, `splice` makes sorted-array insert/remove O(n) — this breaks performance guarantees for large inputs.
- Using `TreeSet` when there are duplicates — TreeSet ignores duplicates. Use `TreeMap<Integer, Integer>` (value = count) to track frequencies.

### Experience Tip
**Experience Tip:** For "My Calendar I" (LC 729), store bookings in a TreeMap keyed by start time. For a new booking [s, e), call `floorKey(s)` to get the previous event and check if it ends after s; call `ceilingKey(s)` to get the next event and check if it starts before e. Both checks are O(log n) — far cleaner than scanning an interval list.

### Do Not Confuse With
- **PriorityQueue / Heap:** O(1) peek at min/max, but no floor/ceiling, and arbitrary deletes are O(n).
- **HashSet / HashMap:** O(1) lookup but NO ordering — cannot find floor or ceiling.
- **Sorted Array:** O(log n) binary search but O(n) insert/delete — fine for static data, not for dynamic.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 220 | Contains Duplicate III | Hard | Sliding window TreeSet; floor/ceiling to check value proximity | https://leetcode.com/problems/contains-duplicate-iii/ |
| 729 | My Calendar I | Medium | TreeMap floor/ceiling for O(log n) overlap detection | https://leetcode.com/problems/my-calendar-i/ |
| 731 | My Calendar II | Medium | TreeMap difference array: +1 at start, -1 at end; scan for overlap count ≥ 2 | https://leetcode.com/problems/my-calendar-ii/ |
| 315 | Count of Smaller Numbers After Self | Hard | TreeMap as frequency map; count smaller elements to the right | https://leetcode.com/problems/count-of-smaller-numbers-after-self/ |
| 480 | Sliding Window Median | Hard | Two TreeMaps (for duplicates): lower half max-side + upper half min-side | https://leetcode.com/problems/sliding-window-median/ |

### One-Minute Revision
```
STRUCTURE:       Balanced BST / Ordered Set (TreeMap / TreeSet)
IN SIMPLE WORDS: Sorted dynamic set with O(log n) insert/delete/floor/ceiling
USE WHEN:        Closest element to x; sorted dynamic collection; interval overlap checks
DON'T USE WHEN:  Only exact lookup (HashMap); static data (sorted array + binary search)
KEY OPERATIONS:  insert/delete/floor/ceiling: O(log n) each
TIME:            O(log n) per operation
SPACE:           O(n)
COMMON TRAP:     floor() returns null in Java — always null-check; no native TreeSet in JS
```
