# Advanced Data Structures — 1-Hour Google Interview Learning Module

> *"Standard arrays and hash maps solve 80% of problems. These structures handle the remaining 20% — the hard problems that separate good from great."*

**Estimated time:** 60 minutes  
**Difficulty:** Advanced  
**Interview frequency:** Medium–Low (but high signal when needed)

---

## Structures Covered

| Structure | Core Problem It Solves |
|---|---|
| Trie (Prefix Tree) | Fast prefix/word search over strings |
| XOR Trie | Maximum XOR pair in O(n) |
| Segment Tree | Range queries + updates on arrays |
| Segment Tree + Lazy | Range updates in O(log n) |
| Fenwick Tree (BIT) | Prefix sums with updates, shorter code |
| Sparse Table | O(1) range min/max, static arrays only |
| DSU Advanced | Dynamic connectivity, weighted unions, rollback |
| Balanced BST / Ordered Set | Sorted dynamic collection, floor/ceiling queries |

---

## [0–10 min] Big Picture — Why Do These Exist?

### The Problem With Simple Structures

Arrays are great — O(1) access. But they fail when you ask:
- "What's the sum of elements from index 3 to 97?" — You'd need O(n) time each query.
- "Which words in this dictionary start with 'pre'?" — Scanning all words is slow.
- "What's the max XOR of any two numbers in this array?" — Brute force is O(n²).

Advanced data structures pre-process your data so repeated queries become fast. Think of them as "pre-computed indexes" on top of your raw data.

### One-Line Analogy for Each

**Trie** — A dictionary organized letter-by-letter. Finding "apple" means walking a→p→p→l→e. All words sharing a prefix share a path.

**XOR Trie** — Same idea, but the "letters" are bits (0 or 1) of a number. You walk the bits to find the best XOR partner.

**Segment Tree** — A tournament bracket. Each match-up stores the winner (min, max, sum) of its range. Any range query is answered by consulting O(log n) brackets.

**Fenwick Tree (BIT)** — A clever shortcut for prefix sums. Instead of summing everything from index 1 to i, it stores partial sums in a way that lets you leap across the array using bit tricks.

**Sparse Table** — Flash cards for range queries. Precompute answers for every range of length 1, 2, 4, 8… Then answer any query by looking up two pre-computed cards. Works in O(1) for min/max.

**DSU Advanced** — A weighted version of Union-Find. Instead of just "are A and B connected?", it also tracks "what is the relationship between A and B?" along the path.

**Balanced BST / Ordered Set** — A sorted list that stays balanced. Insert, delete, and look up the nearest value, all in O(log n).

---

## [10–20 min] Mental Model — Core Ideas + When to Use Each

### Trie vs Hash Set

```
                  root
                 /    \
               'a'    'b'
               |       |
              'p'     'a'
               |       |
              'p'     't'
               |       |
              'l'      * (end: "bat")
               |
              'e'
               * (end: "apple")
```

Use **Trie** when:
- You need prefix matching ("starts with"), not just exact match
- You're building autocomplete, spell-check, word search
- You have many strings sharing prefixes (Trie is more space-efficient than storing each separately)

Use **Hash Set** instead when:
- You only need exact membership lookup
- Prefix queries are not required

### Segment Tree vs Prefix Sum vs Fenwick Tree

```
                  [0-7] sum
                 /          \
           [0-3] sum       [4-7] sum
           /     \          /     \
       [0-1]   [2-3]    [4-5]   [6-7]
       /   \   /   \    /   \   /   \
      a0  a1  a2  a3  a4  a5  a6  a7
```

| Situation | Best Choice |
|---|---|
| Static array, only prefix sums | Prefix sum array |
| Static array, range min/max, no updates | Sparse Table (O(1) query!) |
| Point updates + range queries | Fenwick Tree (simpler code) |
| Range updates + range queries | Segment Tree with Lazy Propagation |

**Key insight:** Fenwick trees are NOT more powerful than Segment Trees — they are simpler and faster for the prefix-sum use case only. If you need arbitrary range updates, you need a Segment Tree.

### DSU Advanced vs Regular DSU

Regular DSU answers: "Are nodes A and B in the same component?"  
Weighted DSU answers: "What is the ratio/difference between A and B?" (e.g., a/b = 2.0, b/c = 3.0, so a/c = 6.0)

### Balanced BST / Ordered Set vs Sorted Array

| Operation | Sorted Array | TreeSet/TreeMap |
|---|---|---|
| Insert | O(n) — shift elements | O(log n) |
| Delete | O(n) | O(log n) |
| Floor/Ceiling | O(log n) via binary search | O(log n) |
| Iteration in order | O(n) | O(n) |

Use Ordered Set when: data is dynamic (many inserts/deletes) AND you need floor/ceiling queries.

---

## [20–35 min] Core Patterns — Operations, Complexity, Interview Applications

### 1. Trie

**Key operations:**

| Operation | Time | What It Does |
|---|---|---|
| insert(word) | O(L) | Walk down, create nodes, mark end |
| search(word) | O(L) | Walk down, check is_end at final node |
| startsWith(prefix) | O(L) | Walk down, just confirm path exists |
| delete(word) | O(L) | Walk down, unmark end, prune empty nodes |

L = length of word/prefix.

**Common interview applications:**

- **Word Search II (LC 212):** Build Trie from word list. DFS on grid, simultaneously walk Trie. If Trie path doesn't exist, prune. O(m*n * 4^L) reduced significantly by pruning.
- **Add and Search Words (LC 211):** On '.', try all 26 children (DFS branching).
- **Longest Word in Dictionary (LC 720):** BFS/DFS through Trie; a word is valid only if every prefix is also a word (every node on the path has is_end=true).
- **Map Sum Pairs (LC 677):** Store sum values in nodes; propagate sums upward.

**Recognition signal:** The word "prefix" + "dictionary" + "search" in the same problem = Trie.

---

### 2. XOR Trie

**Core pattern:** Build a Trie from the binary representation of numbers (32 bits, MSB first). To find the number in the Trie that maximizes XOR with query q, at each bit greedily pick the OPPOSITE bit if available.

```
Numbers: [3, 10, 5, 25, 2, 8]
To maximize XOR with 25 (11001):

At each bit of 25, try to go the opposite direction in the Trie.
Bit = 1 → try 0 branch
Bit = 1 → try 0 branch
Bit = 0 → try 1 branch
...
```

**Complexity:** O(32 * n) = O(n) for n numbers.

**Interview applications:**
- Maximum XOR of Two Numbers in Array (LC 421)
- Maximum XOR With Constraints: Sort by constraint, insert eligible numbers as you process queries.

---

### 3. Segment Tree

**Array-based layout:** Node at index i has children at 2i and 2i+1. Root at index 1. Leaf nodes start at index n.

**Three key operations:**

**Build:** O(n) — bottom-up. Leaves = array values. Internal node = merge(left child, right child).

**Point Update:** O(log n) — walk root to leaf (update leaf), then recompute parents bottom-up.

**Range Query [l, r]:** O(log n) — recursive. Three cases:
1. Node's range fully outside [l, r]: return identity (0 for sum, INF for min)
2. Node's range fully inside [l, r]: return node's value
3. Partial overlap: recurse into both children, merge results

**Common merge functions:** sum, min, max, GCD, product, bitwise OR/AND.

---

### 4. Segment Tree with Lazy Propagation

When you need "add 5 to all elements in [l, r]" — without lazy, this is O(n). With lazy:

```
lazy[node] = pending update not yet pushed to children

Range update steps:
1. If node's range fully covered → update node.val, set lazy[node], STOP
2. Otherwise → push down lazy to children, recurse, merge up

Query steps:
1. Before accessing children → always push down lazy first
```

**Key:** Lazy stores WHAT update is pending, not WHO has been updated. Push it down just before you need children's values.

---

### 5. Fenwick Tree (Binary Indexed Tree)

**The bit trick:** Index i covers a range whose size is the lowest set bit of i.

```
Index in binary:  update path (add lowest set bit each time)
i=6 (110) → 8 (1000) → done

Query path (subtract lowest set bit each time):
prefix(6) = tree[6] + tree[4] → sum from 1..6
```

**Two operations (both O(log n)):**

```
update(i, delta):
    while i <= n:
        tree[i] += delta
        i += i & (-i)   // add lowest set bit

prefix(i):  // sum from 1..i
    total = 0
    while i > 0:
        total += tree[i]
        i -= i & (-i)   // remove lowest set bit
    return total

range(l, r) = prefix(r) - prefix(l-1)
```

**Interview applications:**
- Count Inversions: Process right to left, for each element query "how many already-seen elements are smaller?"
- Count of Smaller Numbers After Self (LC 315)
- Range Sum Query Mutable (LC 307)

**1-indexed:** Fenwick trees require 1-based indexing. Add 1 to all indices if your array is 0-based.

---

### 6. Sparse Table

**Build (O(n log n)):**

```
table[k][i] = answer for range [i, i + 2^k - 1]

table[0][i] = arr[i]
table[k][i] = merge(table[k-1][i], table[k-1][i + 2^(k-1)])
```

**Query (O(1) for idempotent ops like min/max/GCD):**

```
k = floor(log2(r - l + 1))
answer = merge(table[k][l], table[k][r - 2^k + 1])
// The two ranges overlap — OK for min/max/GCD because merge(x, x) = x
```

**Why it DOESN'T work for sum:** merge(x, x) = 2x ≠ x. Overlapping ranges double-count. Use prefix sums for range sum queries.

---

### 7. DSU — Advanced Variants

**Weighted DSU:** Each node stores `weight[i]` = "value of i relative to its parent."

On `find(x)`: path compress AND accumulate weights. On `union(x, y, w)`: set weights so the relationship holds transitively.

**Interview problem:** Evaluate Division (LC 399) — each equation a/b = k is a weighted edge. Weighted DSU (or BFS/DFS on graph) handles transitivity.

**DSU with Rollback:** When you need to undo unions (offline algorithms):
- Use union by rank ONLY (no path compression — it's irreversible)
- Maintain a stack of (node, old_parent, old_rank) states
- Rollback = pop from stack and restore

**Small-to-Large Merging (DSU on Tree):**
- When merging data from child subtrees (e.g., count distinct colors in subtree)
- Always merge smaller set INTO larger set
- Each element moves at most O(log n) times → total O(n log n)

---

### 8. Ordered Set / Sorted Container

**Operations (all O(log n)):**

| Operation | Java | What It Does |
|---|---|---|
| Insert | `treeSet.add(x)` | Insert x |
| Delete | `treeSet.remove(x)` | Delete x |
| Floor | `treeSet.floor(x)` | Largest element ≤ x |
| Ceiling | `treeSet.ceiling(x)` | Smallest element ≥ x |
| First/Last | `treeSet.first()` | Min/max element |

**Interview applications:**

| Problem | Pattern |
|---|---|
| Contains Duplicate III (LC 220) | Sliding window + TreeSet. For each new element x, check if floor or ceiling is within value range k. |
| My Calendar I/II (LC 729/731) | TreeMap of intervals. Use floor/ceiling to find conflicts. |
| Data Stream as Disjoint Intervals (LC 352) | TreeMap with interval merging on insert. |
| Sliding Window Median (LC 480) | Two heaps OR two ordered multisets (smaller half + larger half). |

---

## [35–45 min] Concrete Code + Dry Run

### Trie — Java

```java
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
        return true;  // don't check isEnd
    }
}
```

**Dry run — insert "cat", search "ca":**

```
insert("cat"):  root → [c] → [a] → [t].isEnd = true
search("ca"):   root → [c] → [a] → isEnd = false → return false
startsWith("ca"): root → [c] → [a] → path exists → return true
```

---

### Trie — TypeScript

```typescript
class TrieNode {
    children: Map<string, TrieNode> = new Map();
    isEnd = false;
}

class Trie {
    root = new TrieNode();

    insert(word: string): void {
        let node = this.root;
        for (const ch of word) {
            if (!node.children.has(ch))
                node.children.set(ch, new TrieNode());
            node = node.children.get(ch)!;
        }
        node.isEnd = true;
    }

    search(word: string): boolean {
        let node = this.root;
        for (const ch of word) {
            if (!node.children.has(ch)) return false;
            node = node.children.get(ch)!;
        }
        return node.isEnd;
    }

    startsWith(prefix: string): boolean {
        let node = this.root;
        for (const ch of prefix) {
            if (!node.children.has(ch)) return false;
            node = node.children.get(ch)!;
        }
        return true;
    }
}
```

---

### Fenwick Tree — Java

```java
class FenwickTree {
    int[] tree;
    int n;

    FenwickTree(int n) {
        this.n = n;
        this.tree = new int[n + 1]; // 1-indexed
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

**Dry run — array [3, 2, -1, 6, 5], sum of [2..4]:**

```
Build: update(1,3), update(2,2), update(3,-1), update(4,6), update(5,5)

range(2, 4) = prefix(4) - prefix(1)
prefix(4): tree[4] + tree[0... wait, 4 → 4-4=0 stop] = tree[4] = 10
prefix(1): tree[1] = 3
range(2,4) = 10 - 3 = 7 ✓ (2 + -1 + 6 = 7)
```

---

### Fenwick Tree — TypeScript

```typescript
class FenwickTree {
    private tree: number[];
    private n: number;

    constructor(n: number) {
        this.n = n;
        this.tree = new Array(n + 1).fill(0);
    }

    update(i: number, delta: number): void {
        for (; i <= this.n; i += i & (-i))
            this.tree[i] += delta;
    }

    prefix(i: number): number {
        let sum = 0;
        for (; i > 0; i -= i & (-i))
            sum += this.tree[i];
        return sum;
    }

    range(l: number, r: number): number {
        return this.prefix(r) - this.prefix(l - 1);
    }
}
```

---

### Segment Tree (Range Sum, Point Update) — Java

```java
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

---

### Ordered Set Usage — Java TreeSet

```java
// Contains Duplicate III (LC 220): sliding window + floor/ceiling
public boolean containsNearbyAlmostDuplicate(int[] nums, int k, int t) {
    TreeSet<Long> window = new TreeSet<>();
    for (int i = 0; i < nums.length; i++) {
        long x = nums[i];
        // Check if there's any value in [x-t, x+t]
        Long floor = window.floor(x + t);
        if (floor != null && floor >= x - t) return true;

        window.add(x);
        if (window.size() > k) window.remove((long) nums[i - k]);
    }
    return false;
}
```

---

## [45–55 min] Pattern Recognition — When Does Each Structure Signal Itself?

### Recognition Table

| Clue in Problem | Structure to Consider |
|---|---|
| "words with prefix", "autocomplete", "dictionary search" | Trie |
| "word search in grid" + "multiple words" | Trie + DFS backtracking |
| "maximum XOR of two numbers" | XOR Trie |
| "range sum/min/max" + "updates allowed" | Segment Tree or Fenwick Tree |
| "range updates" (add to all in [l,r]) + "range queries" | Segment Tree with Lazy |
| "range sum with point updates" | Fenwick Tree (simpler choice) |
| "count inversions", "count smaller elements to the right" | Fenwick Tree |
| "static array", "range min/max", "no updates" | Sparse Table |
| "connected components" + "weighted edges" + "ratio queries" | Weighted DSU |
| "nearest value", "floor/ceiling", "dynamic sorted collection" | Ordered Set (TreeSet/TreeMap) |
| "sliding window" + "need sorted access" | Ordered Set |
| "merge subtree data" + "tree problem" + large n | Small-to-large merging (DSU on Tree) |

### Constraint Signals

```
Array size n:
  n <= 10^5 with Q queries → O(n log n) preprocessing is fine
  n <= 10^6 → lean toward Fenwick (less constant factor than segment tree)
  "static, no updates" → Sparse Table for O(1) queries

String keywords:
  "prefix", "starts with", "dictionary" → Trie
  "XOR" + "pair" + "maximum" → XOR Trie

Update keywords:
  "point update" → Fenwick or Segment Tree
  "range update" → Segment Tree with Lazy (Fenwick can't do this cleanly)
  "no update at all" → Sparse Table or prefix sum

Query keywords:
  "prefix sum" → Fenwick or prefix array
  "arbitrary range" → Segment Tree
  "idempotent (min/max/GCD)" + "no updates" → Sparse Table
```

### Common Mistakes to Avoid

1. **Using Segment Tree when Prefix Sum is enough** — If there are no updates, prefix sum is simpler and O(1) per query.
2. **Forgetting 1-indexed Fenwick** — Off-by-one errors are the #1 bug. Always confirm your indexing.
3. **Using Sparse Table for range sum** — Overlapping ranges double-count sums. Only works for idempotent operations.
4. **Choosing Trie for exact-match-only problems** — A hash set is simpler and sufficient.
5. **Trying to implement AVL/Red-Black from scratch in an interview** — Use language built-ins (TreeSet/TreeMap in Java, SortedList in Python).

---

## [55–60 min] Final Mental Checklist

```
Before writing any code, ask yourself:

1. STRING PROBLEM?
   └─ Need prefix/pattern search?
      └─ Multiple words, shared prefixes? → Trie
      └─ Just exact match? → HashMap/HashSet

2. RANGE QUERY PROBLEM?
   └─ Has updates?
      └─ Point updates only? → Fenwick Tree (prefix) or Segment Tree (any range)
      └─ Range updates? → Segment Tree with Lazy Propagation
   └─ No updates (static)?
      └─ Sum/other non-idempotent? → Prefix Sum array
      └─ Min/Max/GCD (idempotent)? → Sparse Table (O(1) query)

3. NUMBER XOR PROBLEM?
   └─ Maximum XOR pair? → XOR Trie

4. CONNECTIVITY/GROUPING PROBLEM?
   └─ Simple "same group"? → Basic DSU
   └─ Need weighted relationships (ratios, differences)? → Weighted DSU
   └─ Need to undo operations? → DSU with rollback

5. SORTED DYNAMIC COLLECTION?
   └─ Need floor/ceiling/rank? → TreeSet/TreeMap (Java), SortedList (Python)
   └─ Just sorted output, no dynamic inserts? → Sort the array
```

---

## Active Recall — Test Yourself

Answer these before looking back at the notes:

1. What is the time complexity of Trie insert and search? What variable does it depend on?
2. When would you use a Sparse Table over a Segment Tree? What's the key restriction?
3. What operation does `i & (-i)` perform, and where is it used in a Fenwick Tree?
4. Why can't Sparse Table answer range SUM queries correctly?
5. In Segment Tree with Lazy Propagation, when do you "push down" the lazy value?
6. What is the difference between `floor(x)` and `ceiling(x)` in a TreeSet?
7. If you see "maximum XOR of two numbers in array", which data structure gives O(n) solution?
8. Weighted DSU is useful for which famous LeetCode problem? What does the weight represent?
9. What is "small-to-large merging" and what is its total time complexity?
10. In an interview, when should you prefer Fenwick Tree over Segment Tree?

---

## Recommended Practice Direction

**Start here (most interview-relevant):**
- LC 208 — Implement Trie (Prefix Tree) ← implement this from scratch
- LC 307 — Range Sum Query Mutable (Fenwick or Segment Tree)
- LC 212 — Word Search II (Trie + backtracking)
- LC 315 — Count of Smaller Numbers After Self (Fenwick)

**Stretch problems:**
- LC 421 — Maximum XOR of Two Numbers in an Array (XOR Trie)
- LC 729 — My Calendar I (TreeMap / Ordered Set)
- LC 220 — Contains Duplicate III (TreeSet sliding window)
- LC 399 — Evaluate Division (Weighted DSU or graph)

**For competitive programming depth (optional, not typical FAANG):**
- Segment Tree with Lazy Propagation (range add, range query)
- Persistent Segment Tree (Kth smallest in range)
- Sparse Table for LCA (via Euler Tour + RMQ)

---

## 2-Minute Cheat Sheet

```
STRUCTURE         TIME (query/update)    USE WHEN
─────────────────────────────────────────────────────────────────
Trie              O(L) all ops           Prefix/word search
XOR Trie          O(32) ≈ O(1)          Max XOR pair
Segment Tree      O(log n)              Range query + point update
Seg Tree + Lazy   O(log n)              Range update + range query
Fenwick Tree      O(log n)              Prefix sum + point update
                                        (simpler than Seg Tree)
Sparse Table      O(1) query            Static array, min/max/GCD only
                  O(n log n) build      NO updates, NO sum queries
Weighted DSU      O(α(n)) ≈ O(1)       Weighted connectivity,
                                        ratio/difference queries
Ordered Set       O(log n) all ops      Sorted dynamic set,
(TreeSet/TreeMap)                       floor/ceiling/nearest

KEY FORMULAS:
  Fenwick update:  i += i & (-i)
  Fenwick query:   i -= i & (-i)
  Seg Tree nodes:  parent = i/2, children = 2i and 2i+1 (1-indexed)
  Sparse Table:    k = floor(log2(r-l+1)), query two overlapping 2^k ranges

LANGUAGE SHORTCUTS:
  Java:    TreeSet, TreeMap (floor/ceiling/higher/lower built-in)
  Python:  No built-in balanced BST; use bisect or sortedcontainers.SortedList
  JS/TS:   No built-in; simulate with sorted array + binary search (small n only)
```

---

*Next: [17-STRING-ALGORITHMS.md](17-STRING-ALGORITHMS.md) — Pattern matching, the art of finding needles in haystacks.*
