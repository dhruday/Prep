# Advanced Data Structures — Google Interview Prep

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

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
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

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
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

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
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

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
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

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
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
