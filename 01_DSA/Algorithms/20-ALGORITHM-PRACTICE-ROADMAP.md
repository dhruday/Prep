# 🚀 Algorithm-Wise DSA Practice Roadmap

> *"Don't study topics. Study patterns. Every interview problem is a disguised version of a pattern you've already seen."*

**Purpose:** Pattern-first daily practice tracker for Google / Big Tech interviews.
**Philosophy:** Read question → Recognize pattern → Know why it works → Solve → Practice variations.
**Deep theory lives in files 02–19. This file answers: "What pattern? Which problems? What next?"**

---

## 🎯 How to Use This Roadmap

1. Pick a pattern from the **Master Index** below
2. Read the **Recognition Trigger** — memorize the keywords
3. Solve problems in order: 🟢 Foundation → 🟡 Intermediate → 🔴 Advanced
4. Check off `- [x]` as you complete each problem
5. Move to the next pattern only after you can solve Medium without hints
6. Revisit **Hard** problems after 1–2 weeks

**Priority guide:**
- 🔥 `HIGH` = Appears in almost every Google loop — master this
- ⭐⭐⭐⭐⭐ = Very important, high frequency
- ⭐⭐⭐⭐ = Important, medium frequency
- ⭐⭐⭐ = Useful, lower frequency or specialized

---

## ⚡ Pattern Recognition Cheat Sheet

| Question Clue | Think Algorithm |
|---|---|
| Range sum / sum from L to R | **Prefix Sum** |
| Subarray sum equals K / count subarrays with sum K | **Prefix Sum + HashMap** |
| Subarray XOR equals K | **Prefix XOR + HashMap** |
| Maximum/minimum contiguous subarray sum | **Kadane's Algorithm** |
| Sorted array + pair/triplet with sum | **Two Pointers** |
| Three numbers + target sum | **3Sum / Three Pointers** |
| Positive numbers + contiguous window | **Sliding Window** |
| At most K distinct / longest without repeating | **Sliding Window (Variable)** |
| Sorted array + search | **Binary Search** |
| Find minimum valid answer / feasibility check | **Binary Search on Answer** |
| Top K / K-th largest / K-th smallest | **Heap (Priority Queue)** |
| Next greater element / histogram | **Monotonic Stack** |
| Sliding window maximum/minimum | **Monotonic Deque** |
| Dependencies / course schedule / build order | **Topological Sort** |
| Connected components / number of islands | **BFS / DFS / DSU** |
| Shortest path (unweighted) | **BFS** |
| Shortest path (weighted, non-negative) | **Dijkstra** |
| Shortest path (negative weights) | **Bellman-Ford** |
| All-pairs shortest path | **Floyd-Warshall** |
| Minimum spanning tree | **Kruskal / Prim** |
| Generate all subsets / permutations / combinations | **Backtracking** |
| Optimal substructure + overlapping subproblems | **Dynamic Programming** |
| Greedy: can prove no regret at each step | **Greedy** |
| String pattern matching | **KMP / Z-Algorithm / Rabin-Karp** |
| Prefix/word search / autocomplete | **Trie** |
| Range queries (point update) | **Segment Tree / Fenwick Tree** |
| XOR of missing/single number | **Bit Manipulation (XOR)** |
| Overlapping intervals / meeting rooms | **Intervals / Sweep Line** |
| Cycle in linked list / find middle | **Fast/Slow Pointers** |
| Majority element | **Boyer-Moore Majority Vote** |
| 0-1 decisions + maximize/minimize value | **0/1 Knapsack DP** |
| Distinct chars budget / replacement cost | **Sliding Window (Variable)** |

---

## 📊 Master Algorithm Index

| # | Algorithm / Pattern | Category | Priority | Status |
|---|---|---|---|---|
| 1 | Prefix Sum | Arrays | 🔥 HIGH | ⬜ |
| 2 | Prefix Sum + HashMap | Arrays | 🔥 HIGH | ⬜ |
| 3 | Prefix XOR + HashMap | Arrays | ⭐⭐⭐⭐ | ⬜ |
| 4 | Difference Array | Arrays | ⭐⭐⭐ | ⬜ |
| 5 | 2D Prefix Sum | Arrays | ⭐⭐⭐ | ⬜ |
| 6 | Kadane's Algorithm | Arrays | 🔥 HIGH | ⬜ |
| 7 | Two Pointers (Opposite Ends) | Arrays | 🔥 HIGH | ⬜ |
| 8 | Two Pointers (Same Direction / Fast-Slow) | Arrays | ⭐⭐⭐⭐ | ⬜ |
| 9 | Three Pointers / 3Sum | Arrays | 🔥 HIGH | ⬜ |
| 10 | Sliding Window (Fixed Size) | Arrays | ⭐⭐⭐⭐ | ⬜ |
| 11 | Sliding Window (Variable Size) | Arrays | 🔥 HIGH | ⬜ |
| 12 | Dutch National Flag | Arrays | ⭐⭐⭐⭐ | ⬜ |
| 13 | Cyclic Sort | Arrays | ⭐⭐⭐ | ⬜ |
| 14 | Boyer-Moore Majority Vote | Arrays | ⭐⭐⭐⭐ | ⬜ |
| 15 | In-Place / Matrix Manipulation | Arrays | ⭐⭐⭐⭐ | ⬜ |
| 16 | Binary Search (Classic) | Searching | 🔥 HIGH | ⬜ |
| 17 | Binary Search on Answer | Searching | 🔥 HIGH | ⬜ |
| 18 | Lower/Upper Bound | Searching | ⭐⭐⭐⭐ | ⬜ |
| 19 | Search in Rotated Sorted Array | Searching | 🔥 HIGH | ⬜ |
| 20 | Peak Finding | Searching | ⭐⭐⭐⭐ | ⬜ |
| 21 | Merge Sort | Sorting | 🔥 HIGH | ⬜ |
| 22 | Quick Sort / Quick Select | Sorting | 🔥 HIGH | ⬜ |
| 23 | Counting / Radix / Bucket Sort | Sorting | ⭐⭐⭐ | ⬜ |
| 24 | Cyclic Sort (Finding Missing) | Sorting | ⭐⭐⭐ | ⬜ |
| 25 | Custom Comparator / Sort as Preprocessing | Sorting | ⭐⭐⭐⭐ | ⬜ |
| 26 | Frequency Count (HashMap) | Hashing | 🔥 HIGH | ⬜ |
| 27 | Complement Lookup (Two Sum) | Hashing | 🔥 HIGH | ⬜ |
| 28 | Grouping by Key (Anagrams) | Hashing | ⭐⭐⭐⭐ | ⬜ |
| 29 | Rolling Hash / Rabin-Karp | Hashing | ⭐⭐⭐ | ⬜ |
| 30 | Fast/Slow Pointers (Cycle) | Linked Lists | 🔥 HIGH | ⬜ |
| 31 | In-Place Reversal | Linked Lists | 🔥 HIGH | ⬜ |
| 32 | Merge K Sorted Lists | Linked Lists | 🔥 HIGH | ⬜ |
| 33 | Dummy Node Trick | Linked Lists | ⭐⭐⭐⭐ | ⬜ |
| 34 | LRU / LFU Cache | Linked Lists | 🔥 HIGH | ⬜ |
| 35 | Monotonic Stack (Next Greater) | Stacks | 🔥 HIGH | ⬜ |
| 36 | Monotonic Stack (Histogram) | Stacks | ⭐⭐⭐⭐ | ⬜ |
| 37 | Monotonic Deque (Sliding Max) | Stacks | ⭐⭐⭐⭐ | ⬜ |
| 38 | Min Stack / Expression Eval | Stacks | ⭐⭐⭐⭐ | ⬜ |
| 39 | DFS (Tree Traversals) | Trees | 🔥 HIGH | ⬜ |
| 40 | BFS / Level-Order | Trees | 🔥 HIGH | ⬜ |
| 41 | Lowest Common Ancestor | Trees | 🔥 HIGH | ⬜ |
| 42 | BST Operations | Trees | 🔥 HIGH | ⬜ |
| 43 | Tree DP (Diameter / Path Sum) | Trees | ⭐⭐⭐⭐ | ⬜ |
| 44 | Serialize / Deserialize Tree | Trees | ⭐⭐⭐⭐ | ⬜ |
| 45 | BFS (Graph) | Graphs | 🔥 HIGH | ⬜ |
| 46 | DFS (Graph / Islands) | Graphs | 🔥 HIGH | ⬜ |
| 47 | Multi-Source BFS | Graphs | 🔥 HIGH | ⬜ |
| 48 | Topological Sort (Kahn's) | Graphs | 🔥 HIGH | ⬜ |
| 49 | Union-Find / DSU | Graphs | 🔥 HIGH | ⬜ |
| 50 | Dijkstra | Graphs | 🔥 HIGH | ⬜ |
| 51 | Bellman-Ford | Graphs | ⭐⭐⭐⭐ | ⬜ |
| 52 | Floyd-Warshall | Graphs | ⭐⭐⭐ | ⬜ |
| 53 | Kruskal / Prim (MST) | Graphs | ⭐⭐⭐⭐ | ⬜ |
| 54 | Bridges & Articulation Points | Graphs | ⭐⭐⭐ | ⬜ |
| 55 | Bipartite Check | Graphs | ⭐⭐⭐⭐ | ⬜ |
| 56 | 1D Linear DP | DP | 🔥 HIGH | ⬜ |
| 57 | 2D Grid DP | DP | 🔥 HIGH | ⬜ |
| 58 | 0/1 Knapsack | DP | 🔥 HIGH | ⬜ |
| 59 | Unbounded Knapsack | DP | ⭐⭐⭐⭐ | ⬜ |
| 60 | Subset Sum / Partition DP | DP | 🔥 HIGH | ⬜ |
| 61 | LCS / Edit Distance | DP | 🔥 HIGH | ⬜ |
| 62 | LIS (Longest Increasing Subsequence) | DP | 🔥 HIGH | ⬜ |
| 63 | State Machine DP | DP | ⭐⭐⭐⭐ | ⬜ |
| 64 | Interval DP | DP | ⭐⭐⭐⭐ | ⬜ |
| 65 | Bitmask DP | DP | ⭐⭐⭐ | ⬜ |
| 66 | Tree DP | DP | ⭐⭐⭐⭐ | ⬜ |
| 67 | Digit DP | DP | ⭐⭐⭐ | ⬜ |
| 68 | Interval Scheduling / Activity Selection | Greedy | 🔥 HIGH | ⬜ |
| 69 | Jump Game | Greedy | 🔥 HIGH | ⬜ |
| 70 | Gas Station / Task Scheduling | Greedy | ⭐⭐⭐⭐ | ⬜ |
| 71 | Subsets / Permutations / Combinations | Backtracking | 🔥 HIGH | ⬜ |
| 72 | N-Queens / Sudoku | Backtracking | ⭐⭐⭐⭐ | ⬜ |
| 73 | Word Search / Grid DFS | Backtracking | 🔥 HIGH | ⬜ |
| 74 | String Sliding Window | Strings | 🔥 HIGH | ⬜ |
| 75 | KMP / Z-Algorithm | Strings | ⭐⭐⭐⭐ | ⬜ |
| 76 | Manacher's Algorithm | Strings | ⭐⭐⭐ | ⬜ |
| 77 | Trie (Prefix Tree) | Strings | 🔥 HIGH | ⬜ |
| 78 | Top-K / Kth Element | Heaps | 🔥 HIGH | ⬜ |
| 79 | Two Heaps (Median) | Heaps | 🔥 HIGH | ⬜ |
| 80 | XOR Tricks | Bit Manip | 🔥 HIGH | ⬜ |
| 81 | Bitmask / Bit Counting | Bit Manip | ⭐⭐⭐⭐ | ⬜ |
| 82 | Merge / Insert Intervals | Intervals | 🔥 HIGH | ⬜ |
| 83 | Meeting Rooms / Sweep Line | Intervals | 🔥 HIGH | ⬜ |
| 84 | Difference Array | Intervals | ⭐⭐⭐ | ⬜ |
| 85 | GCD / Sieve / Fast Power | Math | ⭐⭐⭐⭐ | ⬜ |
| 86 | Modular Arithmetic / Combinatorics | Math | ⭐⭐⭐⭐ | ⬜ |
| 87 | Segment Tree | Advanced DS | ⭐⭐⭐⭐ | ⬜ |
| 88 | Fenwick Tree / BIT | Advanced DS | ⭐⭐⭐⭐ | ⬜ |
| 89 | Sparse Table (RMQ) | Advanced DS | ⭐⭐⭐ | ⬜ |
| 90 | Meet in the Middle | Meta | ⭐⭐⭐ | ⬜ |

---

## 1. 🗂 Arrays & Subarray Patterns

> *Deep theory:* `02-ARRAYS-AND-STRINGS.md`

---

### 1.1 Prefix Sum 🔥

**What is it?** Precompute cumulative sums so any range sum `[L,R]` is answered in O(1).

**When to think of it?**
- "range sum query", "sum from index L to R"
- "multiple queries on same array"
- "subarray sum" + no negative numbers + asking for equality

**Core Idea:** `prefix[i] = arr[0] + arr[1] + ... + arr[i]` → `sum(L,R) = prefix[R] - prefix[L-1]`

**Complexity:** Time O(n) build + O(1) query | Space O(n)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"range sum" OR "sum from L to R"
        ↓
THINK: PRECOMPUTE prefix[] ARRAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Running Sum of 1d Array — LC #1480 — https://leetcode.com/problems/running-sum-of-1d-array/
- [ ] Range Sum Query — Immutable — LC #303 — https://leetcode.com/problems/range-sum-query-immutable/ ⭐⭐⭐⭐⭐
- [ ] Find Pivot Index — LC #724 — https://leetcode.com/problems/find-pivot-index/

🟡 Intermediate
- [ ] Subarray Sum Equals K — LC #560 — https://leetcode.com/problems/subarray-sum-equals-k/ 🔥
- [ ] Contiguous Array — LC #525 — https://leetcode.com/problems/contiguous-array/
- [ ] Product of Array Except Self — LC #238 — https://leetcode.com/problems/product-of-array-except-self/ 🔥
- [ ] Range Sum Query 2D — LC #304 — https://leetcode.com/problems/range-sum-query-2d-immutable/

🔴 Advanced
- [ ] Count Number of Nice Subarrays — LC #1248 — https://leetcode.com/problems/count-number-of-nice-subarrays/
- [ ] Number of Submatrices That Sum to Target — LC #1074 — https://leetcode.com/problems/number-of-submatrices-that-sum-to-target/

---

### 1.2 Prefix Sum + HashMap 🔥

**What is it?** Combine prefix sums with a HashMap to count/find subarrays with a specific sum in O(n).

**When to think of it?**
- "count subarrays with sum = K"
- "subarray sum equals K" + **negative numbers may exist**
- "contiguous" + "sum" + "how many"

**Core Idea:** At each index `i`, check if `prefix[i] - K` exists in the HashMap. That means there's a subarray ending at `i` with sum K.

**Key formula:** `count += map.getOrDefault(prefix - K, 0)`

**Complexity:** Time O(n) | Space O(n)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"subarray" + "sum = K" + (negative numbers)
        ↓
THINK: PREFIX SUM + HASHMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Two Sum — LC #1 — https://leetcode.com/problems/two-sum/ 🔥 *(warm-up for pattern)*
- [ ] Subarray Sum Equals K — LC #560 — https://leetcode.com/problems/subarray-sum-equals-k/ 🔥

🟡 Intermediate
- [ ] Contiguous Array — LC #525 — https://leetcode.com/problems/contiguous-array/ 🔥
- [ ] Longest Subarray with Sum K — *(GFG / DSA 450 variant)*
- [ ] Path Sum III — LC #437 — https://leetcode.com/problems/path-sum-iii/ *(tree variant)*
- [ ] Count Number of Nice Subarrays — LC #1248 — https://leetcode.com/problems/count-number-of-nice-subarrays/

🔴 Advanced
- [ ] Subarray Sums Divisible by K — LC #974 — https://leetcode.com/problems/subarray-sums-divisible-by-k/
- [ ] Make Sum Divisible by P — LC #1590 — https://leetcode.com/problems/make-sum-divisible-by-p/

---

### 1.3 Prefix XOR + HashMap ⭐⭐⭐⭐

**What is it?** XOR prefix array + HashMap to count subarrays with XOR = K.

**When to think of it?**
- "subarray XOR equals K"
- "XOR" + "count" + "subarray"

**Core Idea:** `XOR(L,R) = prefix_xor[R] ^ prefix_xor[L-1]`. If we want XOR = K: `prefix_xor[R] ^ K` should exist in the map.

**Complexity:** Time O(n) | Space O(n)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"XOR" + "subarray" + "equals K"
        ↓
THINK: PREFIX XOR + HASHMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Single Number — LC #136 — https://leetcode.com/problems/single-number/ *(XOR warm-up)*
- [ ] XOR Queries of a Subarray — LC #1310 — https://leetcode.com/problems/xor-queries-of-a-subarray/

🟡 Intermediate
- [ ] Count Triplets That Can Form Two Arrays of Equal XOR — LC #1442 — https://leetcode.com/problems/count-triplets-that-can-form-two-arrays-of-equal-xor/
- [ ] Subarrays with XOR = K — *(GFG / DSA 450 — classic problem)*

🔴 Advanced
- [ ] Minimum Operations to Make Array XOR Equal to K — LC #2997 — https://leetcode.com/problems/minimum-operations-to-make-array-xor-equal-to-k/

---

### 1.4 Difference Array ⭐⭐⭐

**What is it?** Efficiently apply range increment/decrement operations, then reconstruct.

**When to think of it?**
- "add value to all elements from L to R"
- "multiple range updates" + "query final array"
- "flight bookings", "corporate flight bookings"

**Core Idea:** `diff[L] += val; diff[R+1] -= val;` then prefix-sum the diff array to get final values.

**Complexity:** Time O(n + q) | Space O(n)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"range update" + "final array"
        ↓
THINK: DIFFERENCE ARRAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Corporate Flight Bookings — LC #1109 — https://leetcode.com/problems/corporate-flight-bookings/

🟡 Intermediate
- [ ] Car Pooling — LC #1094 — https://leetcode.com/problems/car-pooling/
- [ ] Shifting Letters II — LC #2381 — https://leetcode.com/problems/shifting-letters-ii/

🔴 Advanced
- [ ] Number of Flowers in Full Bloom — LC #2251 — https://leetcode.com/problems/number-of-flowers-in-full-bloom/

---

### 1.5 Kadane's Algorithm 🔥

**What is it?** Find the maximum sum contiguous subarray in O(n).

**When to think of it?**
- "maximum subarray sum"
- "contiguous" + "maximum sum"
- "max profit" variants

**Core Idea:** At each index, decide: extend current subarray OR start fresh. `maxEndingHere = max(arr[i], maxEndingHere + arr[i])`

**Complexity:** Time O(n) | Space O(1)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"maximum" + "contiguous subarray" + "sum"
        ↓
THINK: KADANE'S ALGORITHM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Maximum Subarray — LC #53 — https://leetcode.com/problems/maximum-subarray/ 🔥

🟡 Intermediate
- [ ] Maximum Product Subarray — LC #152 — https://leetcode.com/problems/maximum-product-subarray/ 🔥
- [ ] Best Time to Buy and Sell Stock — LC #121 — https://leetcode.com/problems/best-time-to-buy-and-sell-stock/ *(Kadane variant)*
- [ ] Maximum Sum Circular Subarray — LC #918 — https://leetcode.com/problems/maximum-sum-circular-subarray/

🔴 Advanced
- [ ] Maximum Subarray Sum with One Deletion — LC #1186 — https://leetcode.com/problems/maximum-subarray-sum-with-one-deletion/
- [ ] K-Concatenation Maximum Sum — LC #1191 — https://leetcode.com/problems/k-concatenation-maximum-sum/

---

### 1.6 Two Pointers (Opposite Ends) 🔥

**What is it?** One pointer at start, one at end. Move based on comparison to reduce search space.

**When to think of it?**
- **Sorted** array + find pair/triplet with target sum
- "remove duplicates from sorted array"
- "container with most water"

**Core Idea:** If `arr[left] + arr[right] > target`, move right left. Else move left right.

**Complexity:** Time O(n) | Space O(1)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SORTED + "find pair/triplet" + "sum condition"
        ↓
THINK: TWO POINTERS (opposite ends)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Two Sum II — Input Array Is Sorted — LC #167 — https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/ 🔥
- [ ] Valid Palindrome — LC #125 — https://leetcode.com/problems/valid-palindrome/
- [ ] Reverse String — LC #344 — https://leetcode.com/problems/reverse-string/

🟡 Intermediate
- [ ] 3Sum — LC #15 — https://leetcode.com/problems/3sum/ 🔥
- [ ] Container With Most Water — LC #11 — https://leetcode.com/problems/container-with-most-water/ 🔥
- [ ] 3Sum Closest — LC #16 — https://leetcode.com/problems/3sum-closest/
- [ ] 4Sum — LC #18 — https://leetcode.com/problems/4sum/

🔴 Advanced
- [ ] Trapping Rain Water — LC #42 — https://leetcode.com/problems/trapping-rain-water/ 🔥 *(also Monotonic Stack)*

---

### 1.7 Sliding Window — Fixed Size ⭐⭐⭐⭐

**What is it?** Window of fixed size k slides across array. Add new element, remove old one.

**When to think of it?**
- "subarray of size k" + maximum/minimum/average
- "maximum sum of k consecutive elements"

**Core Idea:** `sum += arr[i]; sum -= arr[i-k];` maintain window invariant.

**Complexity:** Time O(n) | Space O(1)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"window of size k" + max/min/sum
        ↓
THINK: SLIDING WINDOW (fixed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Maximum Average Subarray I — LC #643 — https://leetcode.com/problems/maximum-average-subarray-i/
- [ ] Maximum Sum of K Consecutive — *(GFG / DSA 450 basic)*

🟡 Intermediate
- [ ] Find All Anagrams in a String — LC #438 — https://leetcode.com/problems/find-all-anagrams-in-a-string/ 🔥
- [ ] Permutation in String — LC #567 — https://leetcode.com/problems/permutation-in-string/ 🔥
- [ ] Sliding Window Maximum — LC #239 — https://leetcode.com/problems/sliding-window-maximum/ *(use Deque)*

---

### 1.8 Sliding Window — Variable Size 🔥

**What is it?** Expand right pointer freely, shrink left pointer when constraint is violated.

**When to think of it?**
- "longest/shortest subarray/substring" + condition
- "at most k distinct characters"
- "without repeating characters"
- Positive numbers only (no prefix sum needed)

**Complexity:** Time O(n) | Space O(k)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"longest/shortest" + "subarray/substring" + constraint
        ↓
EXPAND right, SHRINK left when violated
THINK: SLIDING WINDOW (variable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Longest Substring Without Repeating Characters — LC #3 — https://leetcode.com/problems/longest-substring-without-repeating-characters/ 🔥
- [ ] Maximum Consecutive Ones III — LC #1004 — https://leetcode.com/problems/max-consecutive-ones-iii/

🟡 Intermediate
- [ ] Longest Substring with At Most K Distinct Characters — LC #340 — https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters/ 🔥
- [ ] Minimum Size Subarray Sum — LC #209 — https://leetcode.com/problems/minimum-size-subarray-sum/ 🔥
- [ ] Fruit Into Baskets — LC #904 — https://leetcode.com/problems/fruit-into-baskets/
- [ ] Minimum Window Substring — LC #76 — https://leetcode.com/problems/minimum-window-substring/ 🔥

🔴 Advanced
- [ ] Substring with Concatenation of All Words — LC #30 — https://leetcode.com/problems/substring-with-concatenation-of-all-words/
- [ ] Sliding Window Median — LC #480 — https://leetcode.com/problems/sliding-window-median/

---

### 1.9 Dutch National Flag / 3-Way Partition ⭐⭐⭐⭐

**What is it?** Sort array with 3 values (0s, 1s, 2s) in one pass using 3 pointers.

**When to think of it?**
- "sort array with only 0s, 1s, 2s"
- "partition around pivot" (3-way)
- "sort colors"

**Complexity:** Time O(n) | Space O(1)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"three categories" + "in-place sort" + O(n) O(1)
        ↓
THINK: DUTCH NATIONAL FLAG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Sort Colors — LC #75 — https://leetcode.com/problems/sort-colors/ 🔥

🟡 Intermediate
- [ ] Wiggle Sort II — LC #324 — https://leetcode.com/problems/wiggle-sort-ii/
- [ ] Partition Array into Three Parts with Equal Sum — LC #1013 — https://leetcode.com/problems/partition-array-into-three-parts-with-equal-sum/

---

### 1.10 Cyclic Sort ⭐⭐⭐

**What is it?** When array has numbers in range [1,n], place each number at its correct index via swaps.

**When to think of it?**
- "find missing number", "find duplicate", "first missing positive"
- Numbers in range [1,n] or [0,n]

**Complexity:** Time O(n) | Space O(1)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Numbers in range [1..n] + find missing/duplicate
        ↓
THINK: CYCLIC SORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Find the Missing Number — LC #268 — https://leetcode.com/problems/missing-number/
- [ ] Find All Numbers Disappeared in an Array — LC #448 — https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array/

🟡 Intermediate
- [ ] Find the Duplicate Number — LC #287 — https://leetcode.com/problems/find-the-duplicate-number/ 🔥
- [ ] First Missing Positive — LC #41 — https://leetcode.com/problems/first-missing-positive/ 🔥

---

### 1.11 Boyer-Moore Majority Vote ⭐⭐⭐⭐

**What is it?** Find majority element (appears > n/2 times) in O(n) O(1).

**When to think of it?**
- "majority element" (> n/2 times)
- "element appears more than n/3 times"

**Complexity:** Time O(n) | Space O(1)

**Practice Problems:**

🟢 Foundation
- [ ] Majority Element — LC #169 — https://leetcode.com/problems/majority-element/ 🔥

🟡 Intermediate
- [ ] Majority Element II — LC #229 — https://leetcode.com/problems/majority-element-ii/ *(n/3 variant)*

---

### 1.12 In-Place Matrix Manipulation ⭐⭐⭐⭐

**Practice Problems:**

🟢 Foundation
- [ ] Transpose Matrix — LC #867 — https://leetcode.com/problems/transpose-matrix/

🟡 Intermediate
- [ ] Rotate Image — LC #48 — https://leetcode.com/problems/rotate-image/ 🔥
- [ ] Set Matrix Zeroes — LC #73 — https://leetcode.com/problems/set-matrix-zeroes/ 🔥
- [ ] Spiral Matrix — LC #54 — https://leetcode.com/problems/spiral-matrix/ 🔥

🔴 Advanced
- [ ] Game of Life — LC #289 — https://leetcode.com/problems/game-of-life/

---

## 2. 🔎 Searching

> *Deep theory:* `03-SEARCHING-TECHNIQUES.md`

---

### 2.1 Binary Search (Classic) 🔥

**What is it?** Find target in sorted array by repeatedly halving the search space.

**When to think of it?**
- Sorted array + find index/value
- "search in O(log n)"

**Key invariant:** Maintain `lo`, `hi` such that answer is always in `[lo, hi]`.

**Complexity:** Time O(log n) | Space O(1)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SORTED + "find" / "search" + O(log n) hint
        ↓
THINK: BINARY SEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Binary Search — LC #704 — https://leetcode.com/problems/binary-search/ 🔥
- [ ] Search Insert Position — LC #35 — https://leetcode.com/problems/search-insert-position/
- [ ] First Bad Version — LC #278 — https://leetcode.com/problems/first-bad-version/

🟡 Intermediate
- [ ] Find First and Last Position of Element in Sorted Array — LC #34 — https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/ 🔥
- [ ] Search a 2D Matrix — LC #74 — https://leetcode.com/problems/search-a-2d-matrix/ 🔥
- [ ] Find Minimum in Rotated Sorted Array — LC #153 — https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/ 🔥

🔴 Advanced
- [ ] Median of Two Sorted Arrays — LC #4 — https://leetcode.com/problems/median-of-two-sorted-arrays/ 🔥

---

### 2.2 Binary Search on Answer 🔥

**What is it?** When the answer has a monotonic property (if X works, X-1 also works), binary search on the answer space.

**When to think of it?**
- "minimum maximum" or "maximum minimum"
- "can we achieve X?" (feasibility check is easy, finding X is hard)
- "capacity", "speed", "days"

**Template:**
```
lo = min_possible, hi = max_possible
while lo < hi:
    mid = (lo + hi) // 2
    if feasible(mid): hi = mid
    else: lo = mid + 1
```

**Complexity:** Time O(n log(answer_range)) | Space O(1)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"minimize the maximum" / "maximize the minimum"
        ↓
THINK: BINARY SEARCH ON ANSWER + FEASIBILITY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Koko Eating Bananas — LC #875 — https://leetcode.com/problems/koko-eating-bananas/ 🔥
- [ ] Capacity To Ship Packages Within D Days — LC #1011 — https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/ 🔥

🟡 Intermediate
- [ ] Find the Smallest Divisor Given a Threshold — LC #1283 — https://leetcode.com/problems/find-the-smallest-divisor-given-a-threshold/
- [ ] Minimum Number of Days to Make m Bouquets — LC #1482 — https://leetcode.com/problems/minimum-number-of-days-to-make-m-bouquets/
- [ ] Split Array Largest Sum — LC #410 — https://leetcode.com/problems/split-array-largest-sum/ 🔥
- [ ] Magnetic Force Between Two Balls — LC #1552 — https://leetcode.com/problems/magnetic-force-between-two-balls/

🔴 Advanced
- [ ] Minimize Max Distance to Gas Station — LC #774 — https://leetcode.com/problems/minimize-max-distance-to-gas-station/
- [ ] Paint House III — LC #1473 — https://leetcode.com/problems/paint-house-iii/

---

### 2.3 Search in Rotated Sorted Array 🔥

**When to think of it?**
- Sorted array, but rotated at some pivot
- "rotated", "no duplicate", "find target"

**Practice Problems:**

🟢 Foundation
- [ ] Find Minimum in Rotated Sorted Array — LC #153 — https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/ 🔥
- [ ] Search in Rotated Sorted Array — LC #33 — https://leetcode.com/problems/search-in-rotated-sorted-array/ 🔥

🟡 Intermediate
- [ ] Search in Rotated Sorted Array II (duplicates) — LC #81 — https://leetcode.com/problems/search-in-rotated-sorted-array-ii/

---

### 2.4 Peak Finding ⭐⭐⭐⭐

**When to think of it?**
- "find a peak element" (greater than neighbors)
- "mountain array"

**Practice Problems:**

🟢 Foundation
- [ ] Find Peak Element — LC #162 — https://leetcode.com/problems/find-peak-element/ 🔥

🟡 Intermediate
- [ ] Peak Index in a Mountain Array — LC #852 — https://leetcode.com/problems/peak-index-in-a-mountain-array/
- [ ] Find in Mountain Array — LC #1095 — https://leetcode.com/problems/find-in-mountain-array/

---

## 3. 🔃 Sorting

> *Deep theory:* `04-SORTING-AND-ORDER.md`

---

### 3.1 Merge Sort 🔥

**Why interview-relevant:** Divide-and-conquer paradigm. Also used for counting inversions.

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"count inversions" / "merge two sorted" / stable sort needed
        ↓
THINK: MERGE SORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Merge Sorted Array — LC #88 — https://leetcode.com/problems/merge-sorted-array/ 🔥
- [ ] Sort List — LC #148 — https://leetcode.com/problems/sort-list/

🟡 Intermediate
- [ ] Count of Smaller Numbers After Self — LC #315 — https://leetcode.com/problems/count-of-smaller-numbers-after-self/ *(merge sort + inversion count)*

🔴 Advanced
- [ ] Reverse Pairs — LC #493 — https://leetcode.com/problems/reverse-pairs/

---

### 3.2 Quick Sort / Quick Select 🔥

**Why interview-relevant:** Quick Select finds Kth element in average O(n).

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Kth largest / smallest" WITHOUT extra memory
        ↓
THINK: QUICK SELECT (partition-based)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟡 Intermediate
- [ ] Kth Largest Element in an Array — LC #215 — https://leetcode.com/problems/kth-largest-element-in-an-array/ 🔥
- [ ] Top K Frequent Elements — LC #347 — https://leetcode.com/problems/top-k-frequent-elements/ 🔥 *(also Heap)*

---

### 3.3 Custom Comparator / Sort as Preprocessing ⭐⭐⭐⭐

**When to think of it?**
- "arrange numbers to form largest"
- "sort intervals by start time"
- Greedy solutions that need sorted order

**Practice Problems:**

🟡 Intermediate
- [ ] Largest Number — LC #179 — https://leetcode.com/problems/largest-number/ 🔥
- [ ] Sort Characters By Frequency — LC #451 — https://leetcode.com/problems/sort-characters-by-frequency/
- [ ] Minimum Number of Arrows to Burst Balloons — LC #452 — https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/

---

## 4. 🗃 Hashing

> *Deep theory:* `05-HASHING-AND-SETS.md`

---

### 4.1 Frequency Count 🔥

**Practice Problems:**

🟢 Foundation
- [ ] Two Sum — LC #1 — https://leetcode.com/problems/two-sum/ 🔥
- [ ] Valid Anagram — LC #242 — https://leetcode.com/problems/valid-anagram/
- [ ] First Unique Character in a String — LC #387 — https://leetcode.com/problems/first-unique-character-in-a-string/

🟡 Intermediate
- [ ] Top K Frequent Elements — LC #347 — https://leetcode.com/problems/top-k-frequent-elements/ 🔥
- [ ] Group Anagrams — LC #49 — https://leetcode.com/problems/group-anagrams/ 🔥
- [ ] Longest Consecutive Sequence — LC #128 — https://leetcode.com/problems/longest-consecutive-sequence/ 🔥

---

### 4.2 Complement Lookup (Two Sum Pattern) 🔥

**Core Idea:** Store visited elements in HashMap. For each element, check if its complement (`target - x`) already exists.

**Practice Problems:**

🟢 Foundation
- [ ] Two Sum — LC #1 — https://leetcode.com/problems/two-sum/ 🔥

🟡 Intermediate
- [ ] 4Sum II — LC #454 — https://leetcode.com/problems/4sum-ii/
- [ ] Pairs of Songs With Total Durations Divisible by 60 — LC #1010 — https://leetcode.com/problems/pairs-of-songs-with-total-durations-divisible-by-60/

---

### 4.3 Grouping by Key ⭐⭐⭐⭐

**Core Idea:** Compute a canonical key for each element; group elements by that key.

**Practice Problems:**

🟡 Intermediate
- [ ] Group Anagrams — LC #49 — https://leetcode.com/problems/group-anagrams/ 🔥
- [ ] Find Duplicate File in System — LC #609 — https://leetcode.com/problems/find-duplicate-file-in-system/

---

## 5. 🔗 Linked Lists

> *Deep theory:* `06-LINKED-LISTS.md`

---

### 5.1 Fast/Slow Pointers 🔥

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"detect cycle" / "find middle" / "Nth from end"
        ↓
THINK: FAST/SLOW POINTERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Linked List Cycle — LC #141 — https://leetcode.com/problems/linked-list-cycle/ 🔥
- [ ] Middle of the Linked List — LC #876 — https://leetcode.com/problems/middle-of-the-linked-list/

🟡 Intermediate
- [ ] Linked List Cycle II — LC #142 — https://leetcode.com/problems/linked-list-cycle-ii/ 🔥 *(find cycle start)*
- [ ] Remove Nth Node From End of List — LC #19 — https://leetcode.com/problems/remove-nth-node-from-end-of-list/ 🔥
- [ ] Happy Number — LC #202 — https://leetcode.com/problems/happy-number/

---

### 5.2 In-Place Reversal 🔥

**Practice Problems:**

🟢 Foundation
- [ ] Reverse Linked List — LC #206 — https://leetcode.com/problems/reverse-linked-list/ 🔥

🟡 Intermediate
- [ ] Reverse Linked List II — LC #92 — https://leetcode.com/problems/reverse-linked-list-ii/ 🔥
- [ ] Reorder List — LC #143 — https://leetcode.com/problems/reorder-list/ 🔥
- [ ] Palindrome Linked List — LC #234 — https://leetcode.com/problems/palindrome-linked-list/

🔴 Advanced
- [ ] Reverse Nodes in k-Group — LC #25 — https://leetcode.com/problems/reverse-nodes-in-k-group/ 🔥

---

### 5.3 Merge K Sorted Lists 🔥

**Practice Problems:**

🟡 Intermediate
- [ ] Merge Two Sorted Lists — LC #21 — https://leetcode.com/problems/merge-two-sorted-lists/ 🔥

🔴 Advanced
- [ ] Merge K Sorted Lists — LC #23 — https://leetcode.com/problems/merge-k-sorted-lists/ 🔥 *(Heap or Divide & Conquer)*

---

### 5.4 LRU / LFU Cache 🔥

**Practice Problems:**

🔴 Advanced
- [ ] LRU Cache — LC #146 — https://leetcode.com/problems/lru-cache/ 🔥 *(HashMap + Doubly Linked List)*
- [ ] LFU Cache — LC #460 — https://leetcode.com/problems/lfu-cache/

---

## 6. 📚 Stacks & Queues

> *Deep theory:* `07-STACKS-AND-QUEUES.md`

---

### 6.1 Monotonic Stack (Next Greater Element) 🔥

**What is it?** Maintain a stack of "candidates" in monotonic order to answer Next Greater/Smaller queries in O(n).

**When to think of it?**
- "next greater element"
- "previous smaller element"
- "daily temperatures"
- "stock span"

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"next greater" / "previous smaller" / "span"
        ↓
THINK: MONOTONIC STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Next Greater Element I — LC #496 — https://leetcode.com/problems/next-greater-element-i/
- [ ] Daily Temperatures — LC #739 — https://leetcode.com/problems/daily-temperatures/ 🔥

🟡 Intermediate
- [ ] Next Greater Element II — LC #503 — https://leetcode.com/problems/next-greater-element-ii/ *(circular array)*
- [ ] Online Stock Span — LC #901 — https://leetcode.com/problems/online-stock-span/
- [ ] Sum of Subarray Minimums — LC #907 — https://leetcode.com/problems/sum-of-subarray-minimums/ 🔥

🔴 Advanced
- [ ] Largest Rectangle in Histogram — LC #84 — https://leetcode.com/problems/largest-rectangle-in-histogram/ 🔥
- [ ] Maximal Rectangle — LC #85 — https://leetcode.com/problems/maximal-rectangle/

---

### 6.2 Monotonic Deque (Sliding Window Max) ⭐⭐⭐⭐

**When to think of it?**
- "maximum/minimum in sliding window of size k"
- Need O(n) for sliding window extremes

**Practice Problems:**

🟡 Intermediate
- [ ] Sliding Window Maximum — LC #239 — https://leetcode.com/problems/sliding-window-maximum/ 🔥

🔴 Advanced
- [ ] Shortest Subarray with Sum at Least K — LC #862 — https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/
- [ ] Constrained Subsequence Sum — LC #1425 — https://leetcode.com/problems/constrained-subsequence-sum/

---

### 6.3 Expression Evaluation / Min Stack ⭐⭐⭐⭐

**Practice Problems:**

🟡 Intermediate
- [ ] Min Stack — LC #155 — https://leetcode.com/problems/min-stack/ 🔥
- [ ] Valid Parentheses — LC #20 — https://leetcode.com/problems/valid-parentheses/ 🔥
- [ ] Evaluate Reverse Polish Notation — LC #150 — https://leetcode.com/problems/evaluate-reverse-polish-notation/

🔴 Advanced
- [ ] Basic Calculator II — LC #227 — https://leetcode.com/problems/basic-calculator-ii/
- [ ] Basic Calculator — LC #224 — https://leetcode.com/problems/basic-calculator/

---

## 7. 🌳 Trees

> *Deep theory:* `10-TREES.md`

---

### 7.1 DFS Tree Traversals 🔥

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"traverse all nodes" / "path" / "leaf to root"
        ↓
THINK: DFS (recursive or iterative)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Binary Tree Inorder Traversal — LC #94 — https://leetcode.com/problems/binary-tree-inorder-traversal/ 🔥
- [ ] Maximum Depth of Binary Tree — LC #104 — https://leetcode.com/problems/maximum-depth-of-binary-tree/ 🔥
- [ ] Same Tree — LC #100 — https://leetcode.com/problems/same-tree/
- [ ] Invert Binary Tree — LC #226 — https://leetcode.com/problems/invert-binary-tree/ 🔥

🟡 Intermediate
- [ ] Path Sum II — LC #113 — https://leetcode.com/problems/path-sum-ii/ 🔥
- [ ] Flatten Binary Tree to Linked List — LC #114 — https://leetcode.com/problems/flatten-binary-tree-to-linked-list/
- [ ] Binary Tree Right Side View — LC #199 — https://leetcode.com/problems/binary-tree-right-side-view/ 🔥

---

### 7.2 BFS / Level-Order Traversal 🔥

**When to think of it?**
- "level by level"
- "minimum depth" / "minimum steps in tree"
- "zigzag traversal"

**Practice Problems:**

🟢 Foundation
- [ ] Binary Tree Level Order Traversal — LC #102 — https://leetcode.com/problems/binary-tree-level-order-traversal/ 🔥

🟡 Intermediate
- [ ] Binary Tree Zigzag Level Order Traversal — LC #103 — https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/ 🔥
- [ ] Minimum Depth of Binary Tree — LC #111 — https://leetcode.com/problems/minimum-depth-of-binary-tree/
- [ ] Populating Next Right Pointers in Each Node — LC #116 — https://leetcode.com/problems/populating-next-right-pointers-in-each-node/

---

### 7.3 Lowest Common Ancestor 🔥

**Practice Problems:**

🟡 Intermediate
- [ ] Lowest Common Ancestor of a Binary Tree — LC #236 — https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/ 🔥
- [ ] Lowest Common Ancestor of a BST — LC #235 — https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/ 🔥

🔴 Advanced
- [ ] Kth Ancestor of a Tree Node — LC #1483 — https://leetcode.com/problems/kth-ancestor-of-a-tree-node/ *(Binary Lifting)*

---

### 7.4 BST Operations 🔥

**Practice Problems:**

🟢 Foundation
- [ ] Validate Binary Search Tree — LC #98 — https://leetcode.com/problems/validate-binary-search-tree/ 🔥
- [ ] Search in a Binary Search Tree — LC #700 — https://leetcode.com/problems/search-in-a-binary-search-tree/

🟡 Intermediate
- [ ] Kth Smallest Element in a BST — LC #230 — https://leetcode.com/problems/kth-smallest-element-in-a-bst/ 🔥
- [ ] Convert Sorted Array to Binary Search Tree — LC #108 — https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/
- [ ] Delete Node in a BST — LC #450 — https://leetcode.com/problems/delete-node-in-a-bst/

---

### 7.5 Tree DP (Diameter, Path Sum) ⭐⭐⭐⭐

**Key idea:** At each node, return info about its subtree to compute a global answer.

**Practice Problems:**

🟡 Intermediate
- [ ] Diameter of Binary Tree — LC #543 — https://leetcode.com/problems/diameter-of-binary-tree/ 🔥
- [ ] Binary Tree Maximum Path Sum — LC #124 — https://leetcode.com/problems/binary-tree-maximum-path-sum/ 🔥

---

### 7.6 Serialize / Deserialize Tree ⭐⭐⭐⭐

**Practice Problems:**

🔴 Advanced
- [ ] Serialize and Deserialize Binary Tree — LC #297 — https://leetcode.com/problems/serialize-and-deserialize-binary-tree/ 🔥
- [ ] Construct Binary Tree from Preorder and Inorder Traversal — LC #105 — https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/ 🔥

---

## 8. 🕸 Graphs

> *Deep theory:* `11-GRAPHS.md`

---

### 8.1 BFS (Graph) 🔥

**When to think of it?**
- Unweighted shortest path
- "minimum steps", "minimum moves"
- Grid problems: "minimum steps to reach"

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"shortest path" + UNWEIGHTED graph/grid
        ↓
THINK: BFS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Number of Islands — LC #200 — https://leetcode.com/problems/number-of-islands/ 🔥
- [ ] Flood Fill — LC #733 — https://leetcode.com/problems/flood-fill/

🟡 Intermediate
- [ ] Binary Matrix — Shortest Path — LC #1091 — https://leetcode.com/problems/shortest-path-in-binary-matrix/ 🔥
- [ ] Rotting Oranges — LC #994 — https://leetcode.com/problems/rotting-oranges/ 🔥
- [ ] Word Ladder — LC #127 — https://leetcode.com/problems/word-ladder/ 🔥
- [ ] Clone Graph — LC #133 — https://leetcode.com/problems/clone-graph/

🔴 Advanced
- [ ] Minimum Moves to Move a Box to Their Target Location — LC #1263 — https://leetcode.com/problems/minimum-moves-to-move-a-box-to-their-target-location/

---

### 8.2 DFS (Graph / Islands) 🔥

**Practice Problems:**

🟢 Foundation
- [ ] Number of Islands — LC #200 — https://leetcode.com/problems/number-of-islands/ 🔥
- [ ] Max Area of Island — LC #695 — https://leetcode.com/problems/max-area-of-island/

🟡 Intermediate
- [ ] Pacific Atlantic Water Flow — LC #417 — https://leetcode.com/problems/pacific-atlantic-water-flow/ 🔥
- [ ] Number of Connected Components in Undirected Graph — LC #323 — https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/
- [ ] Course Schedule — LC #207 — https://leetcode.com/problems/course-schedule/ 🔥 *(DFS cycle detection)*

---

### 8.3 Multi-Source BFS 🔥

**When to think of it?**
- "shortest distance from ANY of multiple sources"
- "01 matrix" — distance from nearest 0

**Practice Problems:**

🟡 Intermediate
- [ ] 01 Matrix — LC #542 — https://leetcode.com/problems/01-matrix/ 🔥
- [ ] Walls and Gates — LC #286 — https://leetcode.com/problems/walls-and-gates/
- [ ] As Far from Land as Possible — LC #1162 — https://leetcode.com/problems/as-far-from-land-as-possible/

🔴 Advanced
- [ ] Minimum Number of Days to Disconnect Island — LC #1568 — https://leetcode.com/problems/minimum-number-of-days-to-disconnect-island/

---

### 8.4 Topological Sort (Kahn's Algorithm) 🔥

**When to think of it?**
- "course prerequisites", "build dependencies"
- "ordering tasks with constraints"
- Directed Acyclic Graph (DAG) ordering

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"dependencies" / "prerequisites" / "task ordering"
        ↓
THINK: TOPOLOGICAL SORT (Kahn's BFS or DFS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟡 Intermediate
- [ ] Course Schedule — LC #207 — https://leetcode.com/problems/course-schedule/ 🔥
- [ ] Course Schedule II — LC #210 — https://leetcode.com/problems/course-schedule-ii/ 🔥
- [ ] Find Order of Alien Dictionary — LC #269 — https://leetcode.com/problems/alien-dictionary/ 🔥

🔴 Advanced
- [ ] Parallel Courses III — LC #2050 — https://leetcode.com/problems/parallel-courses-iii/
- [ ] Minimum Height Trees — LC #310 — https://leetcode.com/problems/minimum-height-trees/

---

### 8.5 Union-Find / DSU 🔥

**When to think of it?**
- "connected components" + dynamic unions
- "can we connect?", "same group?"
- Kruskal's MST, redundant connections

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"connected" + dynamic edges + "same component"
        ↓
THINK: UNION-FIND (DSU)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Number of Provinces — LC #547 — https://leetcode.com/problems/number-of-provinces/ 🔥

🟡 Intermediate
- [ ] Redundant Connection — LC #684 — https://leetcode.com/problems/redundant-connection/ 🔥
- [ ] Accounts Merge — LC #721 — https://leetcode.com/problems/accounts-merge/ 🔥
- [ ] Graph Valid Tree — LC #261 — https://leetcode.com/problems/graph-valid-tree/

🔴 Advanced
- [ ] Smallest String With Swaps — LC #1202 — https://leetcode.com/problems/smallest-string-with-swaps/
- [ ] Number of Islands II — LC #305 — https://leetcode.com/problems/number-of-islands-ii/

---

### 8.6 Dijkstra's Algorithm 🔥

**When to think of it?**
- Weighted graph + shortest path from source
- **Non-negative weights only**
- "minimum cost", "minimum time"

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEIGHTED graph + SHORTEST PATH + non-negative weights
        ↓
THINK: DIJKSTRA (min-heap + relaxation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟡 Intermediate
- [ ] Network Delay Time — LC #743 — https://leetcode.com/problems/network-delay-time/ 🔥
- [ ] Path With Minimum Effort — LC #1631 — https://leetcode.com/problems/path-with-minimum-effort/ 🔥
- [ ] Cheapest Flights Within K Stops — LC #787 — https://leetcode.com/problems/cheapest-flights-within-k-stops/

🔴 Advanced
- [ ] Find the City With the Smallest Number of Neighbors — LC #1334 — https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/
- [ ] Minimum Cost to Reach Destination in Time — LC #1928 — https://leetcode.com/problems/minimum-cost-to-reach-destination-in-time/

---

### 8.7 Bellman-Ford ⭐⭐⭐⭐

**When to think of it?**
- Negative weights exist
- "detect negative cycle"
- "at most K edges" constraint

**Practice Problems:**

🟡 Intermediate
- [ ] Cheapest Flights Within K Stops — LC #787 — https://leetcode.com/problems/cheapest-flights-within-k-stops/ 🔥 *(BF with K relaxations)*
- [ ] Bellman-Ford Algorithm — *(GFG / DSA 450 standard)*

---

### 8.8 Floyd-Warshall ⭐⭐⭐

**When to think of it?**
- "all-pairs shortest path"
- Small graph (n ≤ 500)

**Practice Problems:**

🟡 Intermediate
- [ ] Find the City With the Smallest Number of Neighbors — LC #1334 — https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/
- [ ] All Pairs Shortest Path — *(GFG / CP classic)*

---

### 8.9 Minimum Spanning Tree (Kruskal / Prim) ⭐⭐⭐⭐

**When to think of it?**
- "minimum cost to connect all nodes"
- "minimum network wiring"

**Practice Problems:**

🟡 Intermediate
- [ ] Min Cost to Connect All Points — LC #1584 — https://leetcode.com/problems/min-cost-to-connect-all-points/ 🔥

🔴 Advanced
- [ ] Minimum Spanning Tree — *(GFG / Kruskal's + Prim's standard)*
- [ ] Critical Connections in a Network — LC #1192 — https://leetcode.com/problems/critical-connections-in-a-network/ *(Bridges — Tarjan)*

---

### 8.10 Bipartite Check ⭐⭐⭐⭐

**When to think of it?**
- "2-colorable", "can we divide into two groups"
- "possible bipartition"

**Practice Problems:**

🟡 Intermediate
- [ ] Is Graph Bipartite? — LC #785 — https://leetcode.com/problems/is-graph-bipartite/ 🔥
- [ ] Possible Bipartition — LC #886 — https://leetcode.com/problems/possible-bipartition/

---

## 9. 💡 Dynamic Programming

> *Deep theory:* `09-DYNAMIC-PROGRAMMING.md`

---

### 9.1 1D Linear DP 🔥

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"optimal" + linear sequence + "choices at each step"
        ↓
THINK: 1D DP — dp[i] = f(dp[i-1], dp[i-2], ...)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Climbing Stairs — LC #70 — https://leetcode.com/problems/climbing-stairs/ 🔥
- [ ] House Robber — LC #198 — https://leetcode.com/problems/house-robber/ 🔥
- [ ] Min Cost Climbing Stairs — LC #746 — https://leetcode.com/problems/min-cost-climbing-stairs/

🟡 Intermediate
- [ ] House Robber II — LC #213 — https://leetcode.com/problems/house-robber-ii/
- [ ] Decode Ways — LC #91 — https://leetcode.com/problems/decode-ways/ 🔥
- [ ] Jump Game — LC #55 — https://leetcode.com/problems/jump-game/ 🔥
- [ ] Jump Game II — LC #45 — https://leetcode.com/problems/jump-game-ii/ 🔥

🔴 Advanced
- [ ] Palindromic Substrings — LC #647 — https://leetcode.com/problems/palindromic-substrings/
- [ ] Longest Palindromic Substring — LC #5 — https://leetcode.com/problems/longest-palindromic-substring/ 🔥

---

### 9.2 2D Grid DP 🔥

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"grid" + "robot/paths/moves" + "count/min/max"
        ↓
THINK: 2D DP — dp[i][j] = f(dp[i-1][j], dp[i][j-1])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Unique Paths — LC #62 — https://leetcode.com/problems/unique-paths/ 🔥
- [ ] Unique Paths II — LC #63 — https://leetcode.com/problems/unique-paths-ii/

🟡 Intermediate
- [ ] Minimum Path Sum — LC #64 — https://leetcode.com/problems/minimum-path-sum/ 🔥
- [ ] Triangle — LC #120 — https://leetcode.com/problems/triangle/
- [ ] Maximal Square — LC #221 — https://leetcode.com/problems/maximal-square/ 🔥

🔴 Advanced
- [ ] Dungeon Game — LC #174 — https://leetcode.com/problems/dungeon-game/
- [ ] Cherry Pickup — LC #741 — https://leetcode.com/problems/cherry-pickup/

---

### 9.3 0/1 Knapsack 🔥

**Core Idea:** Each item: include it (value + subproblem without it) OR skip it.
`dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight[i]] + value[i])`

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"subset" + "maximize value" + "capacity constraint"
"each item used AT MOST once"
        ↓
THINK: 0/1 KNAPSACK DP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] 0/1 Knapsack — *(GFG / DSA 450 classic — must implement)*

🟡 Intermediate
- [ ] Partition Equal Subset Sum — LC #416 — https://leetcode.com/problems/partition-equal-subset-sum/ 🔥
- [ ] Last Stone Weight II — LC #1049 — https://leetcode.com/problems/last-stone-weight-ii/
- [ ] Target Sum — LC #494 — https://leetcode.com/problems/target-sum/ 🔥

🔴 Advanced
- [ ] Ones and Zeroes — LC #474 — https://leetcode.com/problems/ones-and-zeroes/
- [ ] Profitable Schemes — LC #879 — https://leetcode.com/problems/profitable-schemes/

---

### 9.4 Unbounded Knapsack ⭐⭐⭐⭐

**Core Idea:** Each item can be used unlimited times.
`dp[w] = max(dp[w], dp[w-weight[i]] + value[i])`

**Practice Problems:**

🟢 Foundation
- [ ] Coin Change — LC #322 — https://leetcode.com/problems/coin-change/ 🔥
- [ ] Coin Change II — LC #518 — https://leetcode.com/problems/coin-change-ii/ 🔥

🟡 Intermediate
- [ ] Perfect Squares — LC #279 — https://leetcode.com/problems/perfect-squares/ 🔥
- [ ] Integer Break — LC #343 — https://leetcode.com/problems/integer-break/
- [ ] Word Break — LC #139 — https://leetcode.com/problems/word-break/ 🔥

---

### 9.5 Subset Sum / Partition DP 🔥

**Practice Problems:**

🟡 Intermediate
- [ ] Partition Equal Subset Sum — LC #416 — https://leetcode.com/problems/partition-equal-subset-sum/ 🔥
- [ ] Subset Sum — *(GFG / DSA 450 classic)*
- [ ] Count of Subsets with Sum K — *(DSA 450 variant)*

🔴 Advanced
- [ ] Partition to K Equal Sum Subsets — LC #698 — https://leetcode.com/problems/partition-to-k-equal-sum-subsets/

---

### 9.6 LCS / Edit Distance 🔥

**Core Idea:** `dp[i][j]` = answer for prefixes of length i, j.
- LCS: `dp[i][j] = dp[i-1][j-1]+1` if match, else `max(dp[i-1][j], dp[i][j-1])`

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TWO strings/arrays + "common subsequence" / "convert"
        ↓
THINK: LCS / EDIT DISTANCE DP — dp[i][j]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Longest Common Subsequence — LC #1143 — https://leetcode.com/problems/longest-common-subsequence/ 🔥
- [ ] Edit Distance — LC #72 — https://leetcode.com/problems/edit-distance/ 🔥

🟡 Intermediate
- [ ] Shortest Common Supersequence — LC #1092 — https://leetcode.com/problems/shortest-common-supersequence/
- [ ] Distinct Subsequences — LC #115 — https://leetcode.com/problems/distinct-subsequences/
- [ ] Delete Operation for Two Strings — LC #583 — https://leetcode.com/problems/delete-operation-for-two-strings/

🔴 Advanced
- [ ] Minimum ASCII Delete Sum for Two Strings — LC #712 — https://leetcode.com/problems/minimum-ascii-delete-sum-for-two-strings/
- [ ] Interleaving String — LC #97 — https://leetcode.com/problems/interleaving-string/

---

### 9.7 LIS — Longest Increasing Subsequence 🔥

**Complexity:** O(n²) DP or O(n log n) with patience sorting.

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"longest increasing/non-decreasing subsequence"
        ↓
THINK: LIS DP or Binary Search (patience sorting)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟡 Intermediate
- [ ] Longest Increasing Subsequence — LC #300 — https://leetcode.com/problems/longest-increasing-subsequence/ 🔥
- [ ] Number of Longest Increasing Subsequences — LC #673 — https://leetcode.com/problems/number-of-longest-increasing-subsequences/
- [ ] Russian Doll Envelopes — LC #354 — https://leetcode.com/problems/russian-doll-envelopes/ *(2D LIS)*

🔴 Advanced
- [ ] Maximum Height by Stacking Cuboids — LC #1691 — https://leetcode.com/problems/maximum-height-by-stacking-cuboids/

---

### 9.8 State Machine DP ⭐⭐⭐⭐

**When to think of it?**
- Multiple "states" you can be in (holding/not-holding stock)
- "cooldown", "fee", "transitions"

**Practice Problems:**

🟡 Intermediate
- [ ] Best Time to Buy and Sell Stock with Cooldown — LC #309 — https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/ 🔥
- [ ] Best Time to Buy and Sell Stock with Transaction Fee — LC #714 — https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/
- [ ] Best Time to Buy and Sell Stock III (at most 2) — LC #123 — https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iii/ 🔥
- [ ] Best Time to Buy and Sell Stock IV (at most k) — LC #188 — https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iv/

---

### 9.9 Interval DP ⭐⭐⭐⭐

**When to think of it?**
- "burst balloons", "matrix chain multiplication"
- "remove stones/characters to maximize score"
- Answer depends on subintervals

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"optimal cost on intervals" / "order of operations matters"
        ↓
THINK: INTERVAL DP — dp[l][r] = f(dp[l][k], dp[k+1][r])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟡 Intermediate
- [ ] Burst Balloons — LC #312 — https://leetcode.com/problems/burst-balloons/ 🔥
- [ ] Strange Printer — LC #664 — https://leetcode.com/problems/strange-printer/
- [ ] Minimum Cost to Cut a Stick — LC #1547 — https://leetcode.com/problems/minimum-cost-to-cut-a-stick/

🔴 Advanced
- [ ] Zuma Game — LC #488 — https://leetcode.com/problems/zuma-game/
- [ ] Remove Boxes — LC #546 — https://leetcode.com/problems/remove-boxes/

---

### 9.10 Bitmask DP ⭐⭐⭐

**When to think of it?**
- Small n (≤ 20) + visiting all subsets
- "traveling salesman", "assignment problem"

**Practice Problems:**

🔴 Advanced
- [ ] Travelling Salesman Problem / Shortest Path Visiting All Nodes — LC #847 — https://leetcode.com/problems/shortest-path-visiting-all-nodes/ 🔥
- [ ] Minimum XOR Sum of Two Arrays — LC #1879 — https://leetcode.com/problems/minimum-xor-sum-of-two-arrays/
- [ ] Stickers to Spell Word — LC #691 — https://leetcode.com/problems/stickers-to-spell-word/

---

### 9.11 Tree DP ⭐⭐⭐⭐

**Practice Problems:**

🟡 Intermediate
- [ ] House Robber III — LC #337 — https://leetcode.com/problems/house-robber-iii/ 🔥
- [ ] Binary Tree Cameras — LC #968 — https://leetcode.com/problems/binary-tree-cameras/

🔴 Advanced
- [ ] Maximum Product of Splitted Binary Tree — LC #1339 — https://leetcode.com/problems/maximum-product-of-splitted-binary-tree/

---

### 9.12 Digit DP ⭐⭐⭐

**When to think of it?**
- "count numbers from 1 to N with property X"
- "numbers with digit sum K", "no consecutive same digit"

**Practice Problems:**

🔴 Advanced
- [ ] Count Digit One — LC #233 — https://leetcode.com/problems/number-of-digit-one/
- [ ] Non-negative Integers without Consecutive Ones — LC #600 — https://leetcode.com/problems/non-negative-integers-without-consecutive-ones/
- [ ] Count Numbers with Unique Digits — LC #357 — https://leetcode.com/problems/count-numbers-with-unique-digits/

---

## 10. 💰 Greedy Algorithms

> *Deep theory:* `13-GREEDY-ALGORITHMS.md`

---

### 10.1 Interval Scheduling / Activity Selection 🔥

**Key insight:** Sort by END time. Always pick the activity that ends earliest.

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"maximum non-overlapping intervals" / "remove minimum intervals"
        ↓
THINK: SORT BY END TIME → GREEDY SWEEP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Meeting Rooms — LC #252 — https://leetcode.com/problems/meeting-rooms/

🟡 Intermediate
- [ ] Non-overlapping Intervals — LC #435 — https://leetcode.com/problems/non-overlapping-intervals/ 🔥
- [ ] Merge Intervals — LC #56 — https://leetcode.com/problems/merge-intervals/ 🔥
- [ ] Minimum Number of Arrows to Burst Balloons — LC #452 — https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/

---

### 10.2 Jump Game 🔥

**Practice Problems:**

🟡 Intermediate
- [ ] Jump Game — LC #55 — https://leetcode.com/problems/jump-game/ 🔥
- [ ] Jump Game II — LC #45 — https://leetcode.com/problems/jump-game-ii/ 🔥 *(min jumps)*

🔴 Advanced
- [ ] Jump Game III — LC #1306 — https://leetcode.com/problems/jump-game-iii/
- [ ] Jump Game VII — LC #1871 — https://leetcode.com/problems/jump-game-vii/

---

### 10.3 Gas Station / Task Scheduling ⭐⭐⭐⭐

**Practice Problems:**

🟡 Intermediate
- [ ] Gas Station — LC #134 — https://leetcode.com/problems/gas-station/ 🔥
- [ ] Task Scheduler — LC #621 — https://leetcode.com/problems/task-scheduler/ 🔥
- [ ] Candy — LC #135 — https://leetcode.com/problems/candy/

🔴 Advanced
- [ ] IPO — LC #502 — https://leetcode.com/problems/ipo/

---

## 11. 🔄 Backtracking

> *Deep theory:* `08-RECURSION-AND-BACKTRACKING.md`

---

### 11.1 Subsets / Permutations / Combinations 🔥

**Template:**
```
backtrack(start, current_set):
    add current_set to result
    for i from start to n:
        current_set.add(arr[i])
        backtrack(i+1, current_set)
        current_set.remove(arr[i])
```

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"generate all" + "subsets / permutations / combinations"
        ↓
THINK: BACKTRACKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Subsets — LC #78 — https://leetcode.com/problems/subsets/ 🔥
- [ ] Permutations — LC #46 — https://leetcode.com/problems/permutations/ 🔥
- [ ] Combinations — LC #77 — https://leetcode.com/problems/combinations/

🟡 Intermediate
- [ ] Subsets II (with duplicates) — LC #90 — https://leetcode.com/problems/subsets-ii/
- [ ] Permutations II (with duplicates) — LC #47 — https://leetcode.com/problems/permutations-ii/
- [ ] Combination Sum — LC #39 — https://leetcode.com/problems/combination-sum/ 🔥
- [ ] Combination Sum II — LC #40 — https://leetcode.com/problems/combination-sum-ii/
- [ ] Letter Combinations of a Phone Number — LC #17 — https://leetcode.com/problems/letter-combinations-of-a-phone-number/ 🔥

🔴 Advanced
- [ ] Palindrome Partitioning — LC #131 — https://leetcode.com/problems/palindrome-partitioning/ 🔥
- [ ] Generate Parentheses — LC #22 — https://leetcode.com/problems/generate-parentheses/ 🔥

---

### 11.2 N-Queens / Sudoku ⭐⭐⭐⭐

**Practice Problems:**

🔴 Advanced
- [ ] N-Queens — LC #51 — https://leetcode.com/problems/n-queens/ 🔥
- [ ] Sudoku Solver — LC #37 — https://leetcode.com/problems/sudoku-solver/ 🔥

---

### 11.3 Word Search / Grid DFS 🔥

**Practice Problems:**

🟡 Intermediate
- [ ] Word Search — LC #79 — https://leetcode.com/problems/word-search/ 🔥

🔴 Advanced
- [ ] Word Search II — LC #212 — https://leetcode.com/problems/word-search-ii/ *(Trie + Backtracking)*
- [ ] Robot Room Cleaner — LC #489 — https://leetcode.com/problems/robot-room-cleaner/

---

## 12. 📝 Strings

> *Deep theory:* `17-STRING-ALGORITHMS.md`

---

### 12.1 String Sliding Window 🔥

*(See also: Sliding Window Variable Size in Section 1)*

**Practice Problems:**

🟡 Intermediate
- [ ] Minimum Window Substring — LC #76 — https://leetcode.com/problems/minimum-window-substring/ 🔥
- [ ] Longest Substring with At Most Two Distinct Characters — LC #159 — https://leetcode.com/problems/longest-substring-with-at-most-two-distinct-characters/
- [ ] Longest Repeating Character Replacement — LC #424 — https://leetcode.com/problems/longest-repeating-character-replacement/ 🔥

---

### 12.2 KMP / Z-Algorithm ⭐⭐⭐⭐

**When to think of it?**
- "pattern matching" in O(n+m)
- "repeated substring pattern"

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"find pattern in text" + O(n+m) required
        ↓
THINK: KMP (failure function) or Z-Algorithm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟡 Intermediate
- [ ] Implement strStr() — LC #28 — https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/ 🔥
- [ ] Repeated Substring Pattern — LC #459 — https://leetcode.com/problems/repeated-substring-pattern/
- [ ] Shortest Palindrome — LC #214 — https://leetcode.com/problems/shortest-palindrome/ *(KMP)*

---

### 12.3 Manacher's Algorithm ⭐⭐⭐

**When to think of it?**
- "longest palindromic substring" in O(n)

**Practice Problems:**

🟡 Intermediate
- [ ] Longest Palindromic Substring — LC #5 — https://leetcode.com/problems/longest-palindromic-substring/ 🔥 *(expand-around-center or Manacher)*
- [ ] Palindromic Substrings — LC #647 — https://leetcode.com/problems/palindromic-substrings/

---

### 12.4 Trie (Prefix Tree) 🔥

**When to think of it?**
- "prefix search", "autocomplete"
- "word dictionary" + wildcard matching
- "XOR maximum in array" (XOR Trie)

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"prefix" + "word" + search/insert/startsWith
        ↓
THINK: TRIE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Implement Trie (Prefix Tree) — LC #208 — https://leetcode.com/problems/implement-trie-prefix-tree/ 🔥

🟡 Intermediate
- [ ] Design Add and Search Words Data Structure — LC #211 — https://leetcode.com/problems/design-add-and-search-words-data-structure/ 🔥
- [ ] Replace Words — LC #648 — https://leetcode.com/problems/replace-words/
- [ ] Word Search II — LC #212 — https://leetcode.com/problems/word-search-ii/ 🔥

🔴 Advanced
- [ ] Maximum XOR of Two Numbers in an Array — LC #421 — https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/ *(XOR Trie)*
- [ ] Palindrome Pairs — LC #336 — https://leetcode.com/problems/palindrome-pairs/

---

## 13. 🏔 Heaps & Priority Queues

> *Deep theory:* `12-HEAPS-AND-PRIORITY-QUEUES.md`

---

### 13.1 Top-K Elements 🔥

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"top K" / "K largest" / "K most frequent"
        ↓
THINK: MIN-HEAP of size K
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Kth Largest Element in an Array — LC #215 — https://leetcode.com/problems/kth-largest-element-in-an-array/ 🔥

🟡 Intermediate
- [ ] Top K Frequent Elements — LC #347 — https://leetcode.com/problems/top-k-frequent-elements/ 🔥
- [ ] K Closest Points to Origin — LC #973 — https://leetcode.com/problems/k-closest-points-to-origin/ 🔥
- [ ] Top K Frequent Words — LC #692 — https://leetcode.com/problems/top-k-frequent-words/
- [ ] Kth Smallest Element in a Sorted Matrix — LC #378 — https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/

---

### 13.2 Two Heaps (Running Median) 🔥

**When to think of it?**
- "median of a stream"
- "median of sliding window"

**Core Idea:** Max-heap for lower half, Min-heap for upper half. Rebalance after each insert.

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"median" + "stream" / "dynamic data"
        ↓
THINK: TWO HEAPS (max-heap + min-heap)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🔴 Advanced
- [ ] Find Median from Data Stream — LC #295 — https://leetcode.com/problems/find-median-from-data-stream/ 🔥
- [ ] Sliding Window Median — LC #480 — https://leetcode.com/problems/sliding-window-median/

---

### 13.3 Merge K Sorted / Scheduling 🔥

**Practice Problems:**

🟡 Intermediate
- [ ] Merge K Sorted Lists — LC #23 — https://leetcode.com/problems/merge-k-sorted-lists/ 🔥
- [ ] Smallest Range Covering Elements from K Lists — LC #632 — https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/

🔴 Advanced
- [ ] IPO — LC #502 — https://leetcode.com/problems/ipo/
- [ ] Meeting Rooms III — LC #2402 — https://leetcode.com/problems/meeting-rooms-iii/

---

## 14. ⚡ Bit Manipulation

> *Deep theory:* `14-BIT-MANIPULATION.md`

---

### 14.1 XOR Tricks 🔥

**Core XOR properties:**
- `a ^ a = 0`
- `a ^ 0 = a`
- XOR is commutative and associative

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"single number" / "missing number" / "pairs cancel"
        ↓
THINK: XOR — pairs cancel out
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Single Number — LC #136 — https://leetcode.com/problems/single-number/ 🔥
- [ ] Missing Number — LC #268 — https://leetcode.com/problems/missing-number/

🟡 Intermediate
- [ ] Single Number II — LC #137 — https://leetcode.com/problems/single-number-ii/
- [ ] Single Number III — LC #260 — https://leetcode.com/problems/single-number-iii/
- [ ] Number of Bit Changes to Make Two Integers Equal — LC #2997 — https://leetcode.com/problems/minimum-operations-to-make-array-xor-equal-to-k/

---

### 14.2 Bit Counting / Brian Kernighan ⭐⭐⭐⭐

**Key tricks:**
- `n & (n-1)` removes the lowest set bit
- `n & (-n)` isolates the lowest set bit
- Brian Kernighan: count set bits in O(set bits count)

**Practice Problems:**

🟢 Foundation
- [ ] Number of 1 Bits — LC #191 — https://leetcode.com/problems/number-of-1-bits/ 🔥
- [ ] Power of Two — LC #231 — https://leetcode.com/problems/power-of-two/
- [ ] Counting Bits — LC #338 — https://leetcode.com/problems/counting-bits/ 🔥

🟡 Intermediate
- [ ] Reverse Bits — LC #190 — https://leetcode.com/problems/reverse-bits/
- [ ] Sum of Two Integers (no +) — LC #371 — https://leetcode.com/problems/sum-of-two-integers/ 🔥

---

### 14.3 Bitmask (Subsets via Bits) ⭐⭐⭐⭐

**Core Idea:** Enumerate all subsets of size n in O(2^n) using bit positions.

**Practice Problems:**

🟡 Intermediate
- [ ] Subsets — LC #78 — https://leetcode.com/problems/subsets/ *(iterative bitmask)*
- [ ] Maximum XOR of Two Numbers in an Array — LC #421 — https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/ 🔥

🔴 Advanced
- [ ] Shortest Path Visiting All Nodes — LC #847 — https://leetcode.com/problems/shortest-path-visiting-all-nodes/ *(bitmask BFS)*

---

## 15. 📅 Intervals & Sweep Line

> *Deep theory:* `18-INTERVAL-AND-SWEEP-LINE.md`

---

### 15.1 Merge Intervals 🔥

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"merge overlapping intervals"
        ↓
SORT by start → merge if overlap: end = max(end, cur.end)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Merge Intervals — LC #56 — https://leetcode.com/problems/merge-intervals/ 🔥

🟡 Intermediate
- [ ] Insert Interval — LC #57 — https://leetcode.com/problems/insert-interval/ 🔥
- [ ] Non-overlapping Intervals — LC #435 — https://leetcode.com/problems/non-overlapping-intervals/ 🔥
- [ ] Interval List Intersections — LC #986 — https://leetcode.com/problems/interval-list-intersections/

---

### 15.2 Meeting Rooms / Count Overlaps 🔥

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"minimum rooms needed" / "maximum simultaneous events"
        ↓
THINK: SORT + MIN-HEAP end times OR SWEEP LINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟢 Foundation
- [ ] Meeting Rooms — LC #252 — https://leetcode.com/problems/meeting-rooms/ 🔥

🟡 Intermediate
- [ ] Meeting Rooms II — LC #253 — https://leetcode.com/problems/meeting-rooms-ii/ 🔥
- [ ] Car Pooling — LC #1094 — https://leetcode.com/problems/car-pooling/

🔴 Advanced
- [ ] My Calendar III — LC #732 — https://leetcode.com/problems/my-calendar-iii/

---

### 15.3 Sweep Line ⭐⭐⭐

**Core Idea:** Create events (start, +1) and (end, -1), sort all events, sweep left to right.

**Practice Problems:**

🟡 Intermediate
- [ ] Employee Free Time — LC #759 — https://leetcode.com/problems/employee-free-time/
- [ ] Number of Flowers in Full Bloom — LC #2251 — https://leetcode.com/problems/number-of-flowers-in-full-bloom/
- [ ] The Skyline Problem — LC #218 — https://leetcode.com/problems/the-skyline-problem/ 🔥

---

## 16. 🔢 Math & Number Theory

> *Deep theory:* `15-MATH-AND-NUMBER-THEORY.md`

---

### 16.1 GCD / LCM / Euclidean ⭐⭐⭐⭐

**Practice Problems:**

🟢 Foundation
- [ ] GCD of Strings — LC #1071 — https://leetcode.com/problems/greatest-common-divisor-of-strings/
- [ ] Find Greatest Common Divisor of Array — LC #1979 — https://leetcode.com/problems/find-greatest-common-divisor-of-array/

🟡 Intermediate
- [ ] Fraction Addition and Subtraction — LC #592 — https://leetcode.com/problems/fraction-addition-and-subtraction/
- [ ] Ugly Number II — LC #264 — https://leetcode.com/problems/ugly-number-ii/

---

### 16.2 Sieve of Eratosthenes ⭐⭐⭐⭐

**When to think of it?**
- "count primes up to N"
- "prime factorization" of many numbers

**Practice Problems:**

🟢 Foundation
- [ ] Count Primes — LC #204 — https://leetcode.com/problems/count-primes/ 🔥

🟡 Intermediate
- [ ] Ugly Number — LC #263 — https://leetcode.com/problems/ugly-number/

---

### 16.3 Fast Power / Binary Exponentiation ⭐⭐⭐⭐

**Practice Problems:**

🟡 Intermediate
- [ ] Pow(x, n) — LC #50 — https://leetcode.com/problems/powx-n/ 🔥
- [ ] Super Pow — LC #372 — https://leetcode.com/problems/super-pow/

---

### 16.4 Modular Arithmetic / Combinatorics ⭐⭐⭐⭐

**Practice Problems:**

🟡 Intermediate
- [ ] Pascal's Triangle — LC #118 — https://leetcode.com/problems/pascals-triangle/
- [ ] Unique Paths — LC #62 — https://leetcode.com/problems/unique-paths/ *(nCr formula)*

🔴 Advanced
- [ ] K-th Smallest in Lexicographical Order — LC #440 — https://leetcode.com/problems/k-th-smallest-in-lexicographical-order/

---

## 17. 🏗 Advanced Data Structures

> *Deep theory:* `16-ADVANCED-DATA-STRUCTURES.md`

---

### 17.1 Segment Tree ⭐⭐⭐⭐

**When to think of it?**
- "range sum / min / max query" + **point updates**
- "dynamic range queries"

```
RECOGNITION TRIGGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"range query" + "point/range updates" + O(log n)
        ↓
THINK: SEGMENT TREE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Practice Problems:**

🟡 Intermediate
- [ ] Range Sum Query — Mutable — LC #307 — https://leetcode.com/problems/range-sum-query-mutable/ 🔥

🔴 Advanced
- [ ] Count of Smaller Numbers After Self — LC #315 — https://leetcode.com/problems/count-of-smaller-numbers-after-self/
- [ ] Queue Reconstruction by Height — LC #406 — https://leetcode.com/problems/queue-reconstruction-by-height/
- [ ] My Calendar II — LC #731 — https://leetcode.com/problems/my-calendar-ii/

---

### 17.2 Fenwick Tree / BIT ⭐⭐⭐⭐

**When to think of it?**
- Range sum queries with point updates, simpler than Segment Tree
- "prefix sum with updates"

**Practice Problems:**

🟡 Intermediate
- [ ] Range Sum Query — Mutable — LC #307 — https://leetcode.com/problems/range-sum-query-mutable/ 🔥 *(BIT solution)*

🔴 Advanced
- [ ] Count of Smaller Numbers After Self — LC #315 — https://leetcode.com/problems/count-of-smaller-numbers-after-self/ *(BIT approach)*
- [ ] Reverse Pairs — LC #493 — https://leetcode.com/problems/reverse-pairs/

---

### 17.3 Sparse Table (RMQ) ⭐⭐⭐

**When to think of it?**
- Range Minimum / Maximum Query with **no updates**
- O(n log n) build, O(1) query

**Practice Problems:**

🟡 Intermediate
- [ ] Minimum Number of Hops — *(GFG / CP classic — RMQ variant)*

🔴 Advanced
- [ ] Sliding Window Maximum — LC #239 — *(sparse table solution approach)*

---

## 18. 🧠 Special / Meta Patterns

> *Deep theory:* `19-DESIGN-PATTERNS-AND-META.md`

---

### 18.1 Meet in the Middle ⭐⭐⭐

**When to think of it?**
- n ≈ 40, brute force is O(2^n) — split into halves of O(2^(n/2))
- "subset sum close to target" with large n

**Practice Problems:**

🔴 Advanced
- [ ] Partition Array Into Two Arrays to Minimize Sum Difference — LC #2035 — https://leetcode.com/problems/partition-array-into-two-arrays-to-minimize-sum-difference/
- [ ] Maximum Fruit Into Baskets (MITM variant) — *(CP classic)*

---

### 18.2 Two-Pass / Reverse Thinking ⭐⭐⭐⭐

**When to think of it?**
- "Trapping Rain Water" — left_max and right_max arrays
- "Product of Array Except Self" — left product then right product

**Practice Problems:**

🟡 Intermediate
- [ ] Trapping Rain Water — LC #42 — https://leetcode.com/problems/trapping-rain-water/ 🔥
- [ ] Product of Array Except Self — LC #238 — https://leetcode.com/problems/product-of-array-except-self/ 🔥
- [ ] Candy — LC #135 — https://leetcode.com/problems/candy/

---

### 18.3 Reservoir Sampling / Randomized ⭐⭐⭐

**When to think of it?**
- "random pick from stream of unknown length"
- "random node in linked list"

**Practice Problems:**

🟡 Intermediate
- [ ] Linked List Random Node — LC #382 — https://leetcode.com/problems/linked-list-random-node/
- [ ] Random Pick with Weight — LC #528 — https://leetcode.com/problems/random-pick-with-weight/

---

### 18.4 Amortized / Lazy Propagation ⭐⭐⭐

**Practice Problems:**

🔴 Advanced
- [ ] Range Add, Range Sum — *(Segment Tree with Lazy Propagation — GFG / CP)*
- [ ] Count of Range Sum — LC #327 — https://leetcode.com/problems/count-of-range-sum/

---

## 📋 Coverage & Completeness Audit

### ✅ Algorithms Included

| Category | Count |
|---|---|
| Arrays & Subarray Patterns | 12 patterns |
| Searching | 4 patterns |
| Sorting | 3 patterns |
| Hashing | 3 patterns |
| Linked Lists | 4 patterns |
| Stacks & Queues | 3 patterns |
| Trees | 6 patterns |
| Graphs | 10 patterns |
| Dynamic Programming | 12 patterns |
| Greedy | 3 patterns |
| Backtracking | 3 patterns |
| Strings | 4 patterns |
| Heaps & Priority Queues | 3 patterns |
| Bit Manipulation | 3 patterns |
| Intervals & Sweep Line | 3 patterns |
| Math & Number Theory | 4 patterns |
| Advanced Data Structures | 3 patterns |
| Special / Meta | 4 patterns |
| **TOTAL** | **~90 patterns** |

### ✅ NeetCode 150 Cross-Reference

All NeetCode 150 problem categories are covered:
- Arrays & Hashing ✅ (Sections 1, 4)
- Two Pointers ✅ (Section 1.6, 1.7)
- Sliding Window ✅ (Section 1.7, 1.8)
- Stack ✅ (Section 6)
- Binary Search ✅ (Section 2)
- Linked List ✅ (Section 5)
- Trees ✅ (Section 7)
- Tries ✅ (Section 12.4)
- Heap / Priority Queue ✅ (Section 13)
- Backtracking ✅ (Section 11)
- Graphs ✅ (Section 8)
- Advanced Graphs ✅ (Section 8.6–8.9)
- 1D DP ✅ (Section 9.1)
- 2D DP ✅ (Section 9.2)
- Greedy ✅ (Section 10)
- Intervals ✅ (Section 15)
- Math & Geometry ✅ (Section 16)
- Bit Manipulation ✅ (Section 14)

### ✅ DSA 450 Pattern Coverage

All major DSA 450 categories mapped:
- Arrays ✅, Strings ✅, Linked Lists ✅, Trees ✅, BST ✅
- Greedy ✅, Backtracking ✅, Stacks & Queues ✅, Heap ✅
- DP ✅, Graph ✅, Trie ✅, Binary Search ✅, Bit Manipulation ✅

### ⚠️ Intentionally Excluded / Reduced

| Pattern | Reason |
|---|---|
| Suffix Array / Suffix Automaton | Extremely rare in interviews; covered briefly in 17-STRING-ALGORITHMS.md |
| Sqrt Decomposition | Almost never appears in Google interviews; use Segment Tree instead |
| Heavy-Light Decomposition | Competitive programming — not Google interview scope |
| Euler Tour / LCA with Binary Lifting | Only for competitive programming |
| Network Flow (Dinic, Ford-Fulkerson) | Covered in 11-GRAPHS.md; extremely rare at Google |
| Matrix Exponentiation | Covered in 15-MATH; rare in interviews |
| Palindromic Tree (Eertree) | Highly specialized — not interview scope |
| KMP failure function build (full code) | Deep theory in 17-STRING-ALGORITHMS.md |

### 📊 File Statistics

| Metric | Count |
|---|---|
| Total algorithm patterns | ~90 |
| Total practice problems | ~420+ |
| LeetCode problems (verified slugs) | ~380+ |
| Non-LC problems (GFG/DSA450 noted) | ~40 |
| 🔥 HIGH priority patterns | 38 |
| ⭐⭐⭐⭐⭐ patterns | 20+ |
| Patterns with Recognition Triggers | 90 (all) |

---

> *"The goal is not to memorize solutions. The goal is to recognize patterns so quickly that your first instinct is the right algorithm."*

**Read fast. Understand deeply. Go practice on LeetCode immediately.**
