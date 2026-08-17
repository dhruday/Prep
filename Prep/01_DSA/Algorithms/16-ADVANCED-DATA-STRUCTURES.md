# Advanced Data Structures — Complete Pattern Guide

> *"Standard arrays and hash maps solve 80% of problems. These structures handle the remaining 20% — the hard problems that separate good from great."*

---

## Table of Contents

1. [Trie (Prefix Tree)](#trie-prefix-tree)
2. [XOR Trie](#xor-trie)
3. [Segment Tree](#segment-tree)
4. [Segment Tree with Lazy Propagation](#segment-tree-with-lazy-propagation)
5. [Fenwick Tree (Binary Indexed Tree)](#fenwick-tree-binary-indexed-tree)
6. [Sparse Table](#sparse-table)
7. [Disjoint Set Union (DSU) — Advanced](#disjoint-set-union-dsu--advanced)
8. [Balanced BST Concepts (AVL, Red-Black)](#balanced-bst-concepts-avl-red-black)
9. [Ordered Set / Sorted Container](#ordered-set--sorted-container)

---

## Trie (Prefix Tree)

### What is this approach?

**Intuition:** A tree where each edge represents a character and each path from root to a node represents a prefix. Like a dictionary organized letter by letter. Searching for "apple" means following edges a→p→p→l→e. Shared prefixes share paths.

### When should I use this?

- "Implement autocomplete/prefix search"
- "Word search in a grid" (Trie + backtracking)
- "Add and search words with wildcards"
- "Longest common prefix"
- "Count words with a given prefix"
- Keywords: "prefix," "dictionary," "word search," "autocomplete"

### When should I NOT use this?

- Simple string matching (hash set is simpler)
- Few strings, no prefix queries (overhead not worth it)

### Core Idea

**Structure:** Each node has:
- children: map from character to child node (array of 26 for lowercase, or HashMap)
- is_end: boolean marking if a word ends here
- (optional) count: number of words passing through or ending here

**Operations:**
- **Insert word:** Walk down, creating nodes as needed. Mark last node as is_end.
- **Search word:** Walk down following characters. Return true if last node exists AND is_end.
- **StartsWith prefix:** Walk down. Return true if all characters found (don't need is_end).
- **Delete word:** Walk down, decrement counts, remove nodes if count reaches 0.

### Complexity

- **Time:** O(L) per operation where L = word length
- **Space:** O(total characters across all words)

### Variants

- **Word Search II:** Build Trie from word list. DFS on grid, walk Trie simultaneously. Prune branches that don't match any remaining word.
- **Add and Search Words (with '.'):** Search with DFS. On '.', try all children.
- **Map Sum Pairs:** Trie where each node stores sum of values of words passing through it.
- **Longest Word in Dictionary:** Trie + BFS/DFS. A word is valid only if every prefix is also a word.

### Interview Insights

- **Word Search II** is much more efficient with a Trie than searching each word independently. The Trie prunes the grid search.
- **Optimization:** After finding a word in Word Search II, remove it from the Trie (prune empty branches) to avoid duplicate findings.

---

## XOR Trie

### What is this approach?

**Intuition:** A Trie built on binary representations of numbers (from MSB to LSB). Used to find maximum XOR pairs efficiently. At each bit, choose the OPPOSITE bit (to maximize XOR) if available.

### When should I use this?

- "Maximum XOR of two numbers in an array"
- "Maximum XOR with an element from array"
- "Count pairs with XOR in range"

### Core Idea

1. Insert each number into the binary Trie (bit by bit, from MSB)
2. To find max XOR with a query number: walk the Trie, at each bit preferring the opposite bit
3. Result = the XOR value accumulated along the chosen path

### Complexity

- **Time:** O(32 × n) = O(n) for n numbers
- **Space:** O(32 × n)

### Interview Insights

- **Maximum XOR of Two Numbers:** Insert all numbers, then query each number against the Trie. O(n).
- **Maximum XOR With Constraints:** Sort by constraint, insert numbers into Trie as they become eligible. Offline query processing.

---

## Segment Tree

### What is this approach?

**Intuition:** An array is like a flat list. A segment tree builds a hierarchy of ranges on top of it. The root covers the entire array, children cover halves, and so on. Any range query is answered by combining O(log n) pre-computed segments.

### When should I use this?

- "Range query + point update" (sum, min, max, GCD of a range)
- "Range query + range update" (with lazy propagation)
- "Count of elements in range satisfying a condition"
- Keywords: "range query," "update," "interval," "sum of subarray"

### When should I NOT use this?

- Static array, no updates → Prefix sum or Sparse Table is simpler
- Only point queries → Just use the array

### Core Idea

**Build:** Recursively divide [l, r] into [l, mid] and [mid+1, r]. Leaf = single element. Internal node = merge of children (e.g., sum, min, max).

**Point Update:** Walk from root to the leaf, update the leaf, then propagate the change up (recompute parents).

**Range Query:** Walk the tree. If the query range fully covers a node's range: return node's value. If partially overlaps: recurse into children and merge results.

### Complexity

- **Build:** O(n)
- **Point Update:** O(log n)
- **Range Query:** O(log n)
- **Space:** O(4n) ≈ O(n) (array-based implementation uses ~4n space)

### Variants

**Merge Sort Tree:** Each segment tree node stores a sorted list of elements in that range. Range queries like "count of elements ≤ X in [l, r]" answered with binary search at O(log² n).

**Persistent Segment Tree:** Keep all versions after updates. Each update creates O(log n) new nodes, sharing the rest. Used for "Kth smallest in any range."

### Interview Insights

- **Implementation:** Array-based segment tree is standard. Node i has children 2i and 2i+1. Parent of i is i/2.
- **When overkill:** If the problem only needs prefix sums with no updates, a simple prefix sum array is better.
- **Rarity:** Segment trees are uncommon in standard FAANG interviews but appear in competitive programming and hard interview rounds.

---

## Segment Tree with Lazy Propagation

### What is this approach?

**Intuition:** When you need to update an ENTIRE RANGE (e.g., "add 5 to all elements in [l, r]"), visiting every element is O(n). Lazy propagation defers updates: mark a node as "has pending update" and only push the update down when its children are actually needed.

### Core Idea

- Each node has a `lazy` value (pending update not yet applied to children)
- **Range Update:** If node's range is fully covered: update node's value, set lazy on node (don't go deeper)
- **Push Down:** Before accessing children, apply pending lazy update to both children and clear it
- **Range Query:** Same as normal, but push down lazy before descending

### Complexity

- **Range Update:** O(log n)
- **Range Query:** O(log n)

### Interview Insights

- **Pattern:** "Range update + range query" = segment tree with lazy propagation. Without lazy, range update is O(n).
- **Common lazy operations:** Range add (lazy stores addend), range set (lazy stores set value), range flip (lazy stores toggle).

---

## Fenwick Tree (Binary Indexed Tree)

### What is this approach?

**Intuition:** A simpler, more space-efficient alternative to a segment tree for PREFIX operations. Uses the binary representation of indices to cleverly partition the array into overlapping ranges.

### When should I use this?

- "Prefix sum with point updates"
- "Count inversions"
- "Count of smaller numbers after self"
- When you need segment tree functionality but only for PREFIX queries (not arbitrary range)

### Core Idea

- **Key trick:** The lowest set bit of index i determines the range that position i covers
- **Update index i:** Add delta to position i, then move to i + (i & -i), repeat until > n
- **Prefix sum [1, i]:** Sum up values at i, then move to i - (i & -i), repeat until 0
- **Range query [l, r]:** prefix(r) - prefix(l-1)

### Complexity

- **Update:** O(log n)
- **Prefix Query:** O(log n)
- **Space:** O(n) (just one array, half the space of segment tree)

### Variants

- **Count Inversions:** Process array right to left. For each element, query "how many smaller elements have I already seen?" using Fenwick tree on values.
- **Count of Smaller Numbers After Self:** Same as count inversions but store results per element.
- **2D Fenwick Tree:** For 2D prefix sums with updates. Nested BIT operations.

### Interview Insights

- **Fenwick vs Segment Tree:** Fenwick is simpler (half the code) and uses less space, but segment tree is more general (supports arbitrary range queries, not just prefix).
- **1-indexed:** Fenwick trees are naturally 1-indexed. Don't forget to adjust.

---

## Sparse Table

### What is this approach?

**Intuition:** Precompute answers for ALL ranges of length 2^k. Any range query is answered by combining at most 2 precomputed ranges that together cover the query range. For idempotent operations (min, max, GCD), those two ranges can OVERLAP and still give the correct answer — O(1) query.

### When should I use this?

- "Static array, range min/max/GCD queries, no updates"
- Keywords: "range minimum query (RMQ)," "static," "no updates"

### When should I NOT use this?

- Array has updates → use Segment Tree or Fenwick Tree
- Range SUM queries → overlapping ranges would double-count. Use prefix sums instead.

### Core Idea

- **Build:** table[k][i] = answer for range [i, i + 2^k - 1]. Build for k = 0, 1, 2, ... log(n).
- table[0][i] = arr[i]; table[k][i] = merge(table[k-1][i], table[k-1][i + 2^(k-1)])
- **Query [l, r]:** k = floor(log2(r - l + 1)). Answer = merge(table[k][l], table[k][r - 2^k + 1]).

### Complexity

- **Build:** O(n log n)
- **Query:** O(1) for idempotent operations (min, max, GCD)
- **Space:** O(n log n)

### Interview Insights

- **Niche:** Sparse Table is rare in interviews but demonstrates deep knowledge. Useful for LCA (reduce to RMQ using Euler tour).

---

## Disjoint Set Union (DSU) — Advanced

### Beyond Basic Union-Find

**Weighted DSU:** Each edge in the union carries a weight/value. During `find`, accumulate weights along the path. Used for problems like "Is the equation consistent?"

**DSU with Rollback:** In offline algorithms, you might need to undo union operations. Maintain a stack of previous states. Use union by rank (not path compression, which can't be easily undone).

**DSU on Tree (Small to Large Merging):** When merging info from child subtrees, always merge the smaller set into the larger one. Total work: O(n log n) — each element is moved at most O(log n) times.

### Interview Insights

- **Weighted DSU** appears in "Evaluate Division" (graph of equations a/b = k → weighted edges).
- **Small-to-large merging** is a powerful technique for tree problems involving set operations on subtrees.

---

## Balanced BST Concepts (AVL, Red-Black)

### What is this approach?

**Intuition:** Regular BSTs can degrade to O(n) for skewed inputs. Self-balancing BSTs maintain height O(log n) through rotations after insertions/deletions.

### Key Concepts

**AVL Tree:** Strictly balanced (height difference ≤ 1). After insertion: check balance factor, rotate if needed (LL, RR, LR, RL rotations). Faster lookups than Red-Black (more balanced) but slower insertions.

**Red-Black Tree:** Every node is red or black. Rules ensure the tree stays approximately balanced. Used in most standard library implementations (TreeMap, set in C++).

### Interview Insights

- **You will NOT implement AVL/RB in an interview.** But you should:
  - Know they exist and provide O(log n) guarantees
  - Know when to use an "ordered set/map" (which is a balanced BST underneath)
  - Understand rotations conceptually

---

## Ordered Set / Sorted Container

### What is this approach?

**Intuition:** A data structure that maintains elements in sorted order with O(log n) insert, delete, and lookup. Also supports operations like "find the smallest element ≥ x" (ceiling) and "find the largest element ≤ x" (floor).

### When should I use this?

- "Find the nearest value to X in a dynamic collection"
- "Sliding window with sorted order"
- "Count elements in a range"
- Keywords: "sorted order," "nearest," "floor," "ceiling," "rank"

### Implementation

- C++: `std::set`, `std::multiset`, `std::map`
- Java: `TreeSet`, `TreeMap`
- Python: `sortedcontainers.SortedList` (third-party) or simulate with bisect

### Interview Applications

| Problem | Use |
|---|---|
| Contains Duplicate III | Sorted set with sliding window. Check if any element within value range exists. |
| My Calendar | Sorted set of intervals. Binary search for conflicts. |
| Count of Range Sum | Merge sort or Fenwick/BIT approach. |
| Data Stream as Disjoint Intervals | TreeMap with interval merging. |

### Interview Insights

- **Python limitation:** No built-in balanced BST. Use `bisect` module for binary search on sorted list (O(n) insert) or mention `SortedList` from `sortedcontainers`.
- **When to use:** Dynamic collection needing both ordered iteration AND fast insert/delete.

---

*Next: [17-STRING-ALGORITHMS.md](17-STRING-ALGORITHMS.md) — Pattern matching, the art of finding needles in haystacks.*
