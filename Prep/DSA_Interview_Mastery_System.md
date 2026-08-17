# 🧠 DSA Interview Mastery System
## Big-Tech Interview Readiness — JavaScript | 3-Month Program

> **Goal:** At any point in the next 3 months, if Google, Microsoft, Salesforce, Adobe, Cisco, Qualcomm, Oracle, or another major tech company gives a DSA interview with 7–20 days notice, I should already have the pattern recognition, problem-solving ability, speed, and confidence required to clear it.

- **Language:** JavaScript only
- **Daily time:** 1.5–2 hours
- **Starting point:** ~150 LeetCode problems solved (intermediate-to-strong)
- **Optimization target:** Pattern recognition, not problem count

---

## Table of Contents

1. [Pattern Taxonomy](#part-a-pattern-taxonomy)
2. [300-Problem Master Bank](#part-b-300-problem-master-bank)
   - [Tier 1 — Must Master](#tier-1--must-master-110-problems)
   - [Tier 2 — High-Value Variations](#tier-2--high-value-variations-120-problems)
   - [Tier 3 — Advanced / Hard / Unseen-Style](#tier-3--advanced--hard--unseen-style-70-problems)
3. [12-Week Roadmap](#part-c-12-week-roadmap)
4. [Daily Routine](#part-d-daily-routine)
5. [Progress Tracker](#part-e-progress-tracker)
6. [Weakness Detection System](#part-f-weakness-detection-system)
7. [Interview Modes](#interview-modes)
8. [Error Log System](#error-log-system)
9. [Solution Explanation Format](#solution-explanation-format)
10. [Mastery Classification](#mastery-classification)

---

## PART A: Pattern Taxonomy

| # | Pattern Family | Key Sub-Patterns |
|---|----------------|-----------------|
| 1 | Arrays & Hashing | Frequency map, prefix sum, difference array, subarray, sorting-based |
| 2 | Two Pointers | Opposite-direction, same-direction, fast/slow, partition |
| 3 | Sliding Window | Fixed, variable, at-most-K, frequency-based |
| 4 | Binary Search | Standard, search on answer, first/last occurrence, rotated, monotonic predicate |
| 5 | Stack | Monotonic stack, next greater/smaller, parentheses, expression eval |
| 6 | Queue / Deque | Monotonic deque, BFS queue, sliding-window max |
| 7 | Linked Lists | Reversal, fast/slow, merge, cycle, reorder |
| 8 | Trees | DFS/BFS, BST, LCA, construction, diameter, path sum, serialization |
| 9 | Heaps | Top-K, K-way merge, two-heaps, streaming, greedy+heap |
| 10 | Intervals | Merge, overlap, meeting rooms, sweep line |
| 11 | Greedy | Scheduling, jump games, greedy+sort, greedy+heap |
| 12 | Backtracking | Subsets, permutations, combinations, constraint pruning |
| 13 | Graphs | BFS, DFS, components, topo sort, Dijkstra, Union-Find, MST, multi-source BFS |
| 14 | Dynamic Programming | 1D/2D, knapsack, subsequence, string, interval, state-machine, partition |
| 15 | Trie | Prefix search, word problems, Trie+DFS, Trie+backtracking |
| 16 | Bit Manipulation | XOR, bitmask, counting bits, power-of-2 |
| 17 | Math / Misc | GCD/LCM, modular arithmetic, matrix, number theory |

### Important Hybrid Patterns

- Hash Map + Sliding Window
- Sorting + Two Pointers
- Binary Search + Greedy
- Heap + Greedy
- BFS + State
- DFS + Memoization
- Graph + Union Find
- Trie + Backtracking
- DP + Hash Map
- Prefix Sum + Hash Map
- Monotonic Stack + Array

---

## PART B: 300-Problem Master Bank

**Difficulty target:**
- Easy: 20–25%
- Medium: 55–60%
- Hard: 20–25%

**Tier legend:**
- **T1** = Must Master
- **T2** = High-Value Variation
- **T3** = Advanced / Hard / Unseen

---

## Tier 1 — Must Master (~110 Problems)

### Arrays & Hashing

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 1 | Two Sum | [🔗](https://leetcode.com/problems/two-sum/) | Easy | Hash Map | Arrays | T1 | Foundation of complement-lookup; appears at almost every company |
| 2 | Contains Duplicate | [🔗](https://leetcode.com/problems/contains-duplicate/) | Easy | Hash Set | Arrays | T1 | Teaches Set usage; classic warm-up pattern |
| 3 | Group Anagrams | [🔗](https://leetcode.com/problems/group-anagrams/) | Medium | Hash Map | Sorting | T1 | Key frequency-map + grouping pattern |
| 4 | Top K Frequent Elements | [🔗](https://leetcode.com/problems/top-k-frequent-elements/) | Medium | Hash Map + Heap | Bucket Sort | T1 | Critical pattern: frequency + selection |
| 5 | Product of Array Except Self | [🔗](https://leetcode.com/problems/product-of-array-except-self/) | Medium | Prefix/Suffix | Arrays | T1 | Must-know prefix product trick; no division allowed |
| 6 | Longest Consecutive Sequence | [🔗](https://leetcode.com/problems/longest-consecutive-sequence/) | Medium | Hash Set | Arrays | T1 | O(N) set-based sequence pattern |
| 7 | Valid Anagram | [🔗](https://leetcode.com/problems/valid-anagram/) | Easy | Frequency Count | Hash Map | T1 | Foundation frequency-counting pattern |
| 8 | Encode and Decode Strings | [🔗](https://leetcode.com/problems/encode-and-decode-strings/) | Medium | Strings | Design | T1 | System design + string encoding; frequently asked |
| 9 | Subarray Sum Equals K | [🔗](https://leetcode.com/problems/subarray-sum-equals-k/) | Medium | Prefix Sum + Hash Map | Arrays | T1 | Critical hybrid: prefix sum + complement lookup |
| 10 | Range Sum Query - Immutable | [🔗](https://leetcode.com/problems/range-sum-query-immutable/) | Easy | Prefix Sum | Arrays | T1 | Foundation of prefix sum pattern |

### Two Pointers

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 11 | Valid Palindrome | [🔗](https://leetcode.com/problems/valid-palindrome/) | Easy | Two Pointers | Strings | T1 | Foundational opposite-direction pointer |
| 12 | Two Sum II – Input Array Is Sorted | [🔗](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) | Medium | Two Pointers | Arrays | T1 | Sorted-array two-pointer template |
| 13 | 3Sum | [🔗](https://leetcode.com/problems/3sum/) | Medium | Two Pointers | Sorting | T1 | Must-know; very frequently asked |
| 14 | Container With Most Water | [🔗](https://leetcode.com/problems/container-with-most-water/) | Medium | Two Pointers | Greedy | T1 | Classic two-pointer reduction insight |
| 15 | Trapping Rain Water | [🔗](https://leetcode.com/problems/trapping-rain-water/) | Hard | Two Pointers | Monotonic Stack | T1 | Canonical hard problem; multiple valid approaches |
| 16 | Move Zeroes | [🔗](https://leetcode.com/problems/move-zeroes/) | Easy | Two Pointers (same dir) | Arrays | T1 | Partition pattern; clean warm-up |
| 17 | Sort Colors | [🔗](https://leetcode.com/problems/sort-colors/) | Medium | Two Pointers | Partition | T1 | Dutch national flag; 3-way partition |

### Sliding Window

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 18 | Best Time to Buy and Sell Stock | [🔗](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) | Easy | Sliding Window | Greedy | T1 | Classic single-pass min tracking |
| 19 | Longest Substring Without Repeating Characters | [🔗](https://leetcode.com/problems/longest-substring-without-repeating-characters/) | Medium | Sliding Window | Hash Map | T1 | Variable window with set; extremely common |
| 20 | Longest Repeating Character Replacement | [🔗](https://leetcode.com/problems/longest-repeating-character-replacement/) | Medium | Sliding Window | Frequency Map | T1 | At-most-K replacement pattern |
| 21 | Minimum Window Substring | [🔗](https://leetcode.com/problems/minimum-window-substring/) | Hard | Sliding Window | Hash Map | T1 | Canonical hard sliding window; must master |
| 22 | Sliding Window Maximum | [🔗](https://leetcode.com/problems/sliding-window-maximum/) | Hard | Monotonic Deque | Sliding Window | T1 | Deque optimization; top pattern |
| 23 | Permutation in String | [🔗](https://leetcode.com/problems/permutation-in-string/) | Medium | Sliding Window | Frequency Map | T1 | Fixed-window frequency matching |
| 24 | Fruits Into Baskets | [🔗](https://leetcode.com/problems/fruit-into-baskets/) | Medium | Sliding Window | Hash Map | T1 | At-most-K distinct pattern |

### Binary Search

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 25 | Binary Search | [🔗](https://leetcode.com/problems/binary-search/) | Easy | Binary Search | Arrays | T1 | Template foundation |
| 26 | Find Minimum in Rotated Sorted Array | [🔗](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) | Medium | Binary Search | Rotated Array | T1 | Rotated array pattern — must know |
| 27 | Search in Rotated Sorted Array | [🔗](https://leetcode.com/problems/search-in-rotated-sorted-array/) | Medium | Binary Search | Rotated Array | T1 | Variant with target; commonly asked |
| 28 | Koko Eating Bananas | [🔗](https://leetcode.com/problems/koko-eating-bananas/) | Medium | Binary Search on Answer | Greedy | T1 | Paradigm shift: search on answer space |
| 29 | Find Peak Element | [🔗](https://leetcode.com/problems/find-peak-element/) | Medium | Binary Search | Arrays | T1 | Monotonic predicate binary search |
| 30 | Time-Based Key-Value Store | [🔗](https://leetcode.com/problems/time-based-key-value-store/) | Medium | Binary Search | Design | T1 | BS on sorted timestamps; design variant |
| 31 | Median of Two Sorted Arrays | [🔗](https://leetcode.com/problems/median-of-two-sorted-arrays/) | Hard | Binary Search | Arrays | T1 | O(log N) partition — hardest BS problem |
| 32 | Search a 2D Matrix | [🔗](https://leetcode.com/problems/search-a-2d-matrix/) | Medium | Binary Search | Matrix | T1 | 2D→1D index mapping |

### Stack

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 33 | Valid Parentheses | [🔗](https://leetcode.com/problems/valid-parentheses/) | Easy | Stack | Strings | T1 | Foundation stack pattern |
| 34 | Min Stack | [🔗](https://leetcode.com/problems/min-stack/) | Medium | Stack | Design | T1 | Augmented stack; design insight |
| 35 | Daily Temperatures | [🔗](https://leetcode.com/problems/daily-temperatures/) | Medium | Monotonic Stack | Arrays | T1 | Canonical next-greater pattern |
| 36 | Car Fleet | [🔗](https://leetcode.com/problems/car-fleet/) | Medium | Monotonic Stack | Sorting | T1 | Stack simulation on sorted data |
| 37 | Largest Rectangle in Histogram | [🔗](https://leetcode.com/problems/largest-rectangle-in-histogram/) | Hard | Monotonic Stack | Arrays | T1 | Must-know hard stack problem |
| 38 | Evaluate Reverse Polish Notation | [🔗](https://leetcode.com/problems/evaluate-reverse-polish-notation/) | Medium | Stack | Math | T1 | Expression evaluation stack |
| 39 | Generate Parentheses | [🔗](https://leetcode.com/problems/generate-parentheses/) | Medium | Backtracking | Stack | T1 | Critical crossover: backtracking via stack insight |

### Linked Lists

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 40 | Reverse Linked List | [🔗](https://leetcode.com/problems/reverse-linked-list/) | Easy | Linked List | Two Pointers | T1 | Foundation reversal — used everywhere |
| 41 | Merge Two Sorted Lists | [🔗](https://leetcode.com/problems/merge-two-sorted-lists/) | Easy | Linked List | Two Pointers | T1 | Merge pattern foundation |
| 42 | Linked List Cycle | [🔗](https://leetcode.com/problems/linked-list-cycle/) | Easy | Fast/Slow Pointers | Linked List | T1 | Floyd's cycle detection |
| 43 | Reorder List | [🔗](https://leetcode.com/problems/reorder-list/) | Medium | Linked List | Fast/Slow | T1 | Multi-step manipulation: find mid + reverse + merge |
| 44 | Remove Nth Node From End | [🔗](https://leetcode.com/problems/remove-nth-node-from-end-of-list/) | Medium | Two Pointers | Linked List | T1 | Two-pointer with gap technique |
| 45 | Copy List with Random Pointer | [🔗](https://leetcode.com/problems/copy-list-with-random-pointer/) | Medium | Hash Map | Linked List | T1 | Deep copy with map; pointer aliasing |
| 46 | Find the Duplicate Number | [🔗](https://leetcode.com/problems/find-the-duplicate-number/) | Medium | Fast/Slow Pointers | Arrays | T1 | Array-as-linked-list cycle detection insight |
| 47 | LRU Cache | [🔗](https://leetcode.com/problems/lru-cache/) | Medium | Linked List + Hash Map | Design | T1 | Critical design problem; asked at every company |

### Trees

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 48 | Invert Binary Tree | [🔗](https://leetcode.com/problems/invert-binary-tree/) | Easy | Tree DFS | Recursion | T1 | Foundational recursive tree pattern |
| 49 | Maximum Depth of Binary Tree | [🔗](https://leetcode.com/problems/maximum-depth-of-binary-tree/) | Easy | Tree DFS | Recursion | T1 | Foundation: postorder return |
| 50 | Diameter of Binary Tree | [🔗](https://leetcode.com/problems/diameter-of-binary-tree/) | Easy | Tree DFS | Path | T1 | Global variable pattern in trees |
| 51 | Balanced Binary Tree | [🔗](https://leetcode.com/problems/balanced-binary-tree/) | Easy | Tree DFS | Recursion | T1 | Height + validity propagation |
| 52 | Same Tree | [🔗](https://leetcode.com/problems/same-tree/) | Easy | Tree DFS | Recursion | T1 | Structural comparison |
| 53 | Subtree of Another Tree | [🔗](https://leetcode.com/problems/subtree-of-another-tree/) | Easy | Tree DFS | Recursion | T1 | Nested DFS call pattern |
| 54 | Lowest Common Ancestor of BST | [🔗](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/) | Medium | BST | Tree DFS | T1 | BST property-based LCA |
| 55 | Binary Tree Level Order Traversal | [🔗](https://leetcode.com/problems/binary-tree-level-order-traversal/) | Medium | Tree BFS | Queue | T1 | Canonical BFS on tree |
| 56 | Binary Tree Right Side View | [🔗](https://leetcode.com/problems/binary-tree-right-side-view/) | Medium | Tree BFS | Queue | T1 | BFS with last-node tracking |
| 57 | Count Good Nodes in Binary Tree | [🔗](https://leetcode.com/problems/count-good-nodes-in-binary-tree/) | Medium | Tree DFS | Recursion | T1 | Max-tracking along path |
| 58 | Validate Binary Search Tree | [🔗](https://leetcode.com/problems/validate-binary-search-tree/) | Medium | BST | Tree DFS | T1 | Range-propagation BST validation |
| 59 | Kth Smallest Element in a BST | [🔗](https://leetcode.com/problems/kth-smallest-element-in-a-bst/) | Medium | BST | Inorder | T1 | Inorder = sorted; clean BST property |
| 60 | Construct Binary Tree from Pre/Inorder | [🔗](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/) | Medium | Tree Construction | Recursion | T1 | Tree construction — must understand root selection |
| 61 | Binary Tree Maximum Path Sum | [🔗](https://leetcode.com/problems/binary-tree-maximum-path-sum/) | Hard | Tree DFS | Path | T1 | Hardest recursive path problem; global max pattern |
| 62 | Serialize and Deserialize Binary Tree | [🔗](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) | Hard | Tree BFS/DFS | Design | T1 | Classic hard; frequently asked at FAANG |

### Heaps

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 63 | Kth Largest Element in Array | [🔗](https://leetcode.com/problems/kth-largest-element-in-an-array/) | Medium | Heap / Quickselect | Sorting | T1 | Core selection problem; multiple approaches |
| 64 | K Closest Points to Origin | [🔗](https://leetcode.com/problems/k-closest-points-to-origin/) | Medium | Heap | Sorting | T1 | Top-K with custom comparator |
| 65 | Task Scheduler | [🔗](https://leetcode.com/problems/task-scheduler/) | Medium | Heap + Greedy | Scheduling | T1 | Greedy scheduling with heap; key insight |
| 66 | Design Twitter | [🔗](https://leetcode.com/problems/design-twitter/) | Medium | Heap | Design | T1 | K-way merge with design; real-world modeling |
| 67 | Find Median from Data Stream | [🔗](https://leetcode.com/problems/find-median-from-data-stream/) | Hard | Two Heaps | Design | T1 | Two-heap pattern — canonical streaming median |
| 68 | Merge K Sorted Lists | [🔗](https://leetcode.com/problems/merge-k-sorted-lists/) | Hard | Heap (K-way merge) | Linked List | T1 | K-way merge with min-heap; must master |

### Intervals

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 69 | Meeting Rooms | [🔗](https://leetcode.com/problems/meeting-rooms/) | Easy | Intervals | Sorting | T1 | Foundation: overlap detection |
| 70 | Meeting Rooms II | [🔗](https://leetcode.com/problems/meeting-rooms-ii/) | Medium | Intervals + Heap | Greedy | T1 | Heap-based room counting; very frequently asked |
| 71 | Merge Intervals | [🔗](https://leetcode.com/problems/merge-intervals/) | Medium | Intervals | Sorting | T1 | Core merge pattern |
| 72 | Insert Interval | [🔗](https://leetcode.com/problems/insert-interval/) | Medium | Intervals | Arrays | T1 | Insertion + merging; binary search variant |
| 73 | Non-Overlapping Intervals | [🔗](https://leetcode.com/problems/non-overlapping-intervals/) | Medium | Greedy + Intervals | Sorting | T1 | Interval scheduling maximization |

### Greedy

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 74 | Jump Game | [🔗](https://leetcode.com/problems/jump-game/) | Medium | Greedy | Arrays | T1 | Local max-reach greedy; foundational |
| 75 | Jump Game II | [🔗](https://leetcode.com/problems/jump-game-ii/) | Medium | Greedy | Arrays | T1 | BFS-style greedy; minimum jumps |
| 76 | Gas Station | [🔗](https://leetcode.com/problems/gas-station/) | Medium | Greedy | Arrays | T1 | Circular greedy; reset technique |
| 77 | Hand of Straights | [🔗](https://leetcode.com/problems/hand-of-straights/) | Medium | Greedy | Hash Map | T1 | Greedy + sorted map pattern |
| 78 | Partition Labels | [🔗](https://leetcode.com/problems/partition-labels/) | Medium | Greedy | Two Pointers | T1 | Last-occurrence greedy |

### Backtracking

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 79 | Subsets | [🔗](https://leetcode.com/problems/subsets/) | Medium | Backtracking | Recursion | T1 | Foundation: power set generation |
| 80 | Permutations | [🔗](https://leetcode.com/problems/permutations/) | Medium | Backtracking | Recursion | T1 | Foundation: permutation generation |
| 81 | Combination Sum | [🔗](https://leetcode.com/problems/combination-sum/) | Medium | Backtracking | Recursion | T1 | Reuse-allowed combination; critical pattern |
| 82 | Word Search | [🔗](https://leetcode.com/problems/word-search/) | Medium | Backtracking | DFS | T1 | Grid DFS + backtrack; must know |
| 83 | N-Queens | [🔗](https://leetcode.com/problems/n-queens/) | Hard | Backtracking | Constraint | T1 | Constraint pruning; interview classic |
| 84 | Palindrome Partitioning | [🔗](https://leetcode.com/problems/palindrome-partitioning/) | Medium | Backtracking | DP | T1 | Backtrack + check; frequently asked |

### Graphs

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 85 | Number of Islands | [🔗](https://leetcode.com/problems/number-of-islands/) | Medium | Graph DFS/BFS | Grid | T1 | Canonical connected-components grid problem |
| 86 | Clone Graph | [🔗](https://leetcode.com/problems/clone-graph/) | Medium | Graph DFS/BFS | Hash Map | T1 | Graph traversal + deep copy |
| 87 | Pacific Atlantic Water Flow | [🔗](https://leetcode.com/problems/pacific-atlantic-water-flow/) | Medium | Graph BFS/DFS | Grid | T1 | Multi-source reverse BFS; key insight |
| 88 | Course Schedule | [🔗](https://leetcode.com/problems/course-schedule/) | Medium | Topological Sort | Graph DFS | T1 | Cycle detection in DAG; must master |
| 89 | Course Schedule II | [🔗](https://leetcode.com/problems/course-schedule-ii/) | Medium | Topological Sort | Kahn's Algo | T1 | Ordering + cycle detection |
| 90 | Number of Connected Components | [🔗](https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/) | Medium | Union Find | Graph DFS | T1 | Union-Find vs DFS comparison |
| 91 | Graph Valid Tree | [🔗](https://leetcode.com/problems/graph-valid-tree/) | Medium | Union Find | Graph DFS | T1 | Tree = connected + N-1 edges + no cycle |
| 92 | Walls and Gates | [🔗](https://leetcode.com/problems/walls-and-gates/) | Medium | Multi-source BFS | Grid | T1 | Multi-source BFS from all gates simultaneously |
| 93 | Rotting Oranges | [🔗](https://leetcode.com/problems/rotting-oranges/) | Medium | Multi-source BFS | Grid | T1 | BFS simulation with time tracking |
| 94 | Network Delay Time | [🔗](https://leetcode.com/problems/network-delay-time/) | Medium | Dijkstra | Graphs | T1 | Canonical shortest path; Dijkstra template |
| 95 | Reconstruct Itinerary | [🔗](https://leetcode.com/problems/reconstruct-itinerary/) | Hard | Graph DFS | Eulerian Path | T1 | DFS + edge removal; unique pattern |

### Dynamic Programming

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 96 | Climbing Stairs | [🔗](https://leetcode.com/problems/climbing-stairs/) | Easy | 1D DP | Fibonacci | T1 | Foundation DP; recurrence setup |
| 97 | House Robber | [🔗](https://leetcode.com/problems/house-robber/) | Medium | 1D DP | Arrays | T1 | Skip-or-take DP; foundational |
| 98 | House Robber II | [🔗](https://leetcode.com/problems/house-robber-ii/) | Medium | 1D DP | Circular | T1 | Circular array DP; run twice insight |
| 99 | Coin Change | [🔗](https://leetcode.com/problems/coin-change/) | Medium | 1D DP | Unbounded Knapsack | T1 | Canonical BFS/DP; minimum-coins |
| 100 | Longest Increasing Subsequence | [🔗](https://leetcode.com/problems/longest-increasing-subsequence/) | Medium | 1D DP + BS | Subsequence | T1 | O(N log N) patience sorting; important |
| 101 | Unique Paths | [🔗](https://leetcode.com/problems/unique-paths/) | Medium | 2D DP / Grid | Combinatorics | T1 | Grid DP foundation |
| 102 | Partition Equal Subset Sum | [🔗](https://leetcode.com/problems/partition-equal-subset-sum/) | Medium | DP (0/1 Knapsack) | Arrays | T1 | Classic knapsack disguised; must recognize |
| 103 | Longest Common Subsequence | [🔗](https://leetcode.com/problems/longest-common-subsequence/) | Medium | 2D DP | String DP | T1 | Canonical string DP table |
| 104 | Edit Distance | [🔗](https://leetcode.com/problems/edit-distance/) | Medium | 2D DP | String DP | T1 | 3-operation string DP; must master |
| 105 | Word Break | [🔗](https://leetcode.com/problems/word-break/) | Medium | 1D DP | Trie/Set | T1 | DP + set lookup; very frequently asked |
| 106 | Decode Ways | [🔗](https://leetcode.com/problems/decode-ways/) | Medium | 1D DP | Strings | T1 | Conditional DP with string parsing |
| 107 | Burst Balloons | [🔗](https://leetcode.com/problems/burst-balloons/) | Hard | Interval DP | Arrays | T1 | Interval DP; think "last balloon" insight |
| 108 | Regular Expression Matching | [🔗](https://leetcode.com/problems/regular-expression-matching/) | Hard | 2D DP | String DP | T1 | Wildcard + state; hard but important |

---

## Tier 2 — High-Value Variations (~120 Problems)

### Arrays & Hashing

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 109 | 4Sum | [🔗](https://leetcode.com/problems/4sum/) | Medium | Two Pointers + Sorting | Arrays | T2 | Generalization of 3Sum |
| 110 | Sort an Array | [🔗](https://leetcode.com/problems/sort-an-array/) | Medium | Sorting | Arrays | T2 | Implement merge sort / quicksort in JS |
| 111 | Find All Anagrams in a String | [🔗](https://leetcode.com/problems/find-all-anagrams-in-a-string/) | Medium | Sliding Window | Hash Map | T2 | Fixed window frequency variation |
| 112 | Contiguous Array | [🔗](https://leetcode.com/problems/contiguous-array/) | Medium | Prefix Sum + Hash Map | Arrays | T2 | 0→-1 trick; balance prefix sum |
| 113 | Continuous Subarray Sum | [🔗](https://leetcode.com/problems/continuous-subarray-sum/) | Medium | Prefix Sum + Hash Map | Math | T2 | Modular prefix sum; tricky constraint |
| 114 | Random Pick with Weight | [🔗](https://leetcode.com/problems/random-pick-with-weight/) | Medium | Prefix Sum + BS | Math | T2 | Weighted random; binary search on prefix |
| 115 | Majority Element | [🔗](https://leetcode.com/problems/majority-element/) | Easy | Boyer-Moore | Arrays | T2 | Vote algorithm; space optimization insight |
| 116 | Set Matrix Zeroes | [🔗](https://leetcode.com/problems/set-matrix-zeroes/) | Medium | Arrays | Matrix | T2 | In-place matrix marking |
| 117 | Spiral Matrix | [🔗](https://leetcode.com/problems/spiral-matrix/) | Medium | Matrix Simulation | Arrays | T2 | Direction cycling; interview staple |
| 118 | Rotate Image | [🔗](https://leetcode.com/problems/rotate-image/) | Medium | Matrix | In-place | T2 | Transpose + reverse; in-place insight |

### Two Pointers

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 119 | 3Sum Closest | [🔗](https://leetcode.com/problems/3sum-closest/) | Medium | Two Pointers | Sorting | T2 | 3Sum with closest-sum tracking |
| 120 | Remove Duplicates from Sorted Array II | [🔗](https://leetcode.com/problems/remove-duplicates-from-sorted-array-ii/) | Medium | Two Pointers | Arrays | T2 | Allow-K-duplicates write pointer |
| 121 | Squares of a Sorted Array | [🔗](https://leetcode.com/problems/squares-of-a-sorted-array/) | Easy | Two Pointers | Arrays | T2 | Inward merge from both ends |
| 122 | Boats to Save People | [🔗](https://leetcode.com/problems/boats-to-save-people/) | Medium | Two Pointers | Greedy | T2 | Greedy pairing from both ends |
| 123 | Minimum Size Subarray Sum | [🔗](https://leetcode.com/problems/minimum-size-subarray-sum/) | Medium | Two Pointers | Sliding Window | T2 | Variable window with sum threshold |

### Sliding Window

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 124 | Longest Subarray of 1s After Deleting One Element | [🔗](https://leetcode.com/problems/longest-subarray-of-1s-after-deleting-one-element/) | Medium | Sliding Window | Arrays | T2 | At-most-1 zero window |
| 125 | Max Consecutive Ones III | [🔗](https://leetcode.com/problems/max-consecutive-ones-iii/) | Medium | Sliding Window | Binary Array | T2 | At-most-K flips window |
| 126 | Number of Subarrays with Bounded Maximum | [🔗](https://leetcode.com/problems/number-of-subarrays-with-bounded-maximum/) | Medium | Sliding Window | Arrays | T2 | Count-based window technique |
| 127 | Subarrays with K Different Integers | [🔗](https://leetcode.com/problems/subarrays-with-k-different-integers/) | Hard | Sliding Window | Hash Map | T2 | Exactly-K = at-most-K minus at-most-(K-1) |

### Binary Search

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 128 | Capacity To Ship Packages Within D Days | [🔗](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) | Medium | Binary Search on Answer | Greedy | T2 | Feasibility check + BS on answer |
| 129 | Split Array Largest Sum | [🔗](https://leetcode.com/problems/split-array-largest-sum/) | Hard | Binary Search on Answer | DP | T2 | Minimize max sum; BS + greedy check |
| 130 | Find K Closest Elements | [🔗](https://leetcode.com/problems/find-k-closest-elements/) | Medium | Binary Search | Two Pointers | T2 | BS to find window start |
| 131 | Search a 2D Matrix II | [🔗](https://leetcode.com/problems/search-a-2d-matrix-ii/) | Medium | Binary Search | Matrix | T2 | Staircase search from top-right |
| 132 | Count of Smaller Numbers After Self | [🔗](https://leetcode.com/problems/count-of-smaller-numbers-after-self/) | Hard | Binary Search / Merge Sort | Arrays | T2 | Inversion count; advanced pattern |
| 133 | Minimum Number of Days to Make m Bouquets | [🔗](https://leetcode.com/problems/minimum-number-of-days-to-make-m-bouquets/) | Medium | Binary Search on Answer | Arrays | T2 | Another feasibility-BS problem |

### Stack

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 134 | Next Greater Element I | [🔗](https://leetcode.com/problems/next-greater-element-i/) | Easy | Monotonic Stack | Hash Map | T2 | Simpler monotonic stack for pattern recognition |
| 135 | Next Greater Element II | [🔗](https://leetcode.com/problems/next-greater-element-ii/) | Medium | Monotonic Stack | Circular Array | T2 | Circular array with modulo trick |
| 136 | Asteroid Collision | [🔗](https://leetcode.com/problems/asteroid-collision/) | Medium | Stack | Simulation | T2 | Stack-based state machine |
| 137 | Remove K Digits | [🔗](https://leetcode.com/problems/remove-k-digits/) | Medium | Monotonic Stack | Greedy | T2 | Greedy + monotonic stack combination |
| 138 | Basic Calculator II | [🔗](https://leetcode.com/problems/basic-calculator-ii/) | Medium | Stack | Math | T2 | Operator-precedence stack |
| 139 | Decode String | [🔗](https://leetcode.com/problems/decode-string/) | Medium | Stack | Strings | T2 | Nested stack state; frequently asked |
| 140 | Maximal Rectangle | [🔗](https://leetcode.com/problems/maximal-rectangle/) | Hard | Monotonic Stack | DP | T2 | Apply histogram solution per row |

### Linked Lists

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 141 | Swap Nodes in Pairs | [🔗](https://leetcode.com/problems/swap-nodes-in-pairs/) | Medium | Linked List | Recursion | T2 | Pairwise reversal |
| 142 | Reverse Nodes in k-Group | [🔗](https://leetcode.com/problems/reverse-nodes-in-k-group/) | Hard | Linked List | Recursion | T2 | Generalized group reversal; hard but asked |
| 143 | Odd Even Linked List | [🔗](https://leetcode.com/problems/odd-even-linked-list/) | Medium | Linked List | Two Pointers | T2 | Split and rejoin pattern |
| 144 | Add Two Numbers | [🔗](https://leetcode.com/problems/add-two-numbers/) | Medium | Linked List | Math | T2 | Carry propagation with pointers |
| 145 | Sort List | [🔗](https://leetcode.com/problems/sort-list/) | Medium | Linked List | Merge Sort | T2 | Merge sort on linked list |

### Trees

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 146 | Lowest Common Ancestor of Binary Tree | [🔗](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/) | Medium | Tree DFS | LCA | T2 | General tree LCA (harder than BST version) |
| 147 | Binary Tree Zigzag Level Order | [🔗](https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/) | Medium | Tree BFS | Queue | T2 | BFS with direction flip |
| 148 | Populating Next Right Pointers | [🔗](https://leetcode.com/problems/populating-next-right-pointers-in-each-node/) | Medium | Tree BFS | Pointers | T2 | Level-linking without extra space |
| 149 | Flatten Binary Tree to Linked List | [🔗](https://leetcode.com/problems/flatten-binary-tree-to-linked-list/) | Medium | Tree DFS | Linked List | T2 | Morris/reverse-postorder pattern |
| 150 | Path Sum II | [🔗](https://leetcode.com/problems/path-sum-ii/) | Medium | Tree DFS | Backtracking | T2 | Root-to-leaf path tracking |
| 151 | Sum Root to Leaf Numbers | [🔗](https://leetcode.com/problems/sum-root-to-leaf-numbers/) | Medium | Tree DFS | Math | T2 | Path-as-number accumulation |
| 152 | Binary Search Tree Iterator | [🔗](https://leetcode.com/problems/binary-search-tree-iterator/) | Medium | BST | Stack | T2 | Iterative inorder with lazy stack |
| 153 | Recover Binary Search Tree | [🔗](https://leetcode.com/problems/recover-binary-search-tree/) | Medium | BST | Inorder | T2 | Two-node swap detection via inorder |
| 154 | Vertical Order Traversal | [🔗](https://leetcode.com/problems/vertical-order-traversal-of-a-binary-tree/) | Hard | Tree BFS | Sorting | T2 | BFS with (row, col) coordinate tracking |
| 155 | Binary Tree Cameras | [🔗](https://leetcode.com/problems/binary-tree-cameras/) | Hard | Tree DFS | Greedy | T2 | Greedy state-machine on tree |

### Heaps

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 156 | Kth Largest Element in a Stream | [🔗](https://leetcode.com/problems/kth-largest-element-in-a-stream/) | Easy | Heap | Design | T2 | Min-heap of size K |
| 157 | Last Stone Weight | [🔗](https://leetcode.com/problems/last-stone-weight/) | Easy | Heap | Greedy | T2 | Max-heap simulation |
| 158 | Reorganize String | [🔗](https://leetcode.com/problems/reorganize-string/) | Medium | Heap + Greedy | Strings | T2 | Most-frequent first greedy with heap |
| 159 | Smallest Range Covering Elements from K Lists | [🔗](https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/) | Hard | Heap | Sliding Window | T2 | K-way merge + window tracking |
| 160 | IPO | [🔗](https://leetcode.com/problems/ipo/) | Hard | Two Heaps + Greedy | Scheduling | T2 | Greedy unlock + max-heap selection |

### Graphs

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 161 | Max Area of Island | [🔗](https://leetcode.com/problems/max-area-of-island/) | Medium | Graph DFS | Grid | T2 | DFS returning value; extension of #85 |
| 162 | Surrounded Regions | [🔗](https://leetcode.com/problems/surrounded-regions/) | Medium | Graph DFS/BFS | Grid | T2 | Boundary DFS to mark safe cells |
| 163 | Redundant Connection | [🔗](https://leetcode.com/problems/redundant-connection/) | Medium | Union Find | Graph | T2 | Cycle detection with DSU |
| 164 | Cheapest Flights Within K Stops | [🔗](https://leetcode.com/problems/cheapest-flights-within-k-stops/) | Medium | Bellman-Ford / BFS | Graphs | T2 | K-constrained shortest path |
| 165 | Find Critical and Pseudo-Critical Edges | [🔗](https://leetcode.com/problems/find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree/) | Hard | MST (Kruskal) | Union Find | T2 | Advanced MST; tests Union-Find mastery |
| 166 | Word Ladder | [🔗](https://leetcode.com/problems/word-ladder/) | Hard | BFS | State Space | T2 | Word transformation as graph BFS |
| 167 | Alien Dictionary | [🔗](https://leetcode.com/problems/alien-dictionary/) | Hard | Topological Sort | Graph | T2 | Build graph from character order; topo sort |
| 168 | Swim in Rising Water | [🔗](https://leetcode.com/problems/swim-in-rising-water/) | Hard | Dijkstra / Binary Search | Graphs | T2 | Minimize max path; Dijkstra or BS+BFS |
| 169 | Bus Routes | [🔗](https://leetcode.com/problems/bus-routes/) | Hard | BFS | Graphs | T2 | BFS on routes not stops; modeling insight |
| 170 | Accounts Merge | [🔗](https://leetcode.com/problems/accounts-merge/) | Medium | Union Find | Graphs | T2 | DSU on emails; real-world modeling |

### Dynamic Programming

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 171 | Longest Palindromic Substring | [🔗](https://leetcode.com/problems/longest-palindromic-substring/) | Medium | 2D DP / Expand | Strings | T2 | DP or expand-from-center; two approaches |
| 172 | Palindromic Substrings | [🔗](https://leetcode.com/problems/palindromic-substrings/) | Medium | 2D DP / Expand | Strings | T2 | Count variant of palindrome |
| 173 | Coin Change II | [🔗](https://leetcode.com/problems/coin-change-2/) | Medium | DP (Unbounded Knapsack) | Combinatorics | T2 | Count combinations; unbounded knapsack |
| 174 | Target Sum | [🔗](https://leetcode.com/problems/target-sum/) | Medium | DP / Backtracking | Arrays | T2 | +/- assignment DP; knapsack disguise |
| 175 | Maximum Product Subarray | [🔗](https://leetcode.com/problems/maximum-product-subarray/) | Medium | 1D DP | Arrays | T2 | Track max AND min; sign flip |
| 176 | Jump Game III | [🔗](https://leetcode.com/problems/jump-game-iii/) | Medium | BFS / DFS | Graphs | T2 | BFS/DFS reachability; DP or graph |
| 177 | Minimum Cost For Tickets | [🔗](https://leetcode.com/problems/minimum-cost-for-tickets/) | Medium | 1D DP | Arrays | T2 | Multi-option day DP |
| 178 | Triangle | [🔗](https://leetcode.com/problems/triangle/) | Medium | 2D DP | Arrays | T2 | Bottom-up triangle DP |
| 179 | Stone Game | [🔗](https://leetcode.com/problems/stone-game/) | Medium | DP | Game Theory | T2 | Minimax DP; Math insight shortcut |
| 180 | Interleaving String | [🔗](https://leetcode.com/problems/interleaving-string/) | Medium | 2D DP | Strings | T2 | 2D DP on interleave decision |
| 181 | Distinct Subsequences | [🔗](https://leetcode.com/problems/distinct-subsequences/) | Hard | 2D DP | Strings | T2 | Count distinct subsequences |
| 182 | Best Time to Buy/Sell Stock III | [🔗](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iii/) | Hard | State Machine DP | Arrays | T2 | 4-state DP machine; important pattern |
| 183 | Best Time to Buy/Sell Stock with Cooldown | [🔗](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/) | Medium | State Machine DP | Arrays | T2 | 3-state DP; state diagram critical |
| 184 | Minimum Number of Removals to Make Mountain Array | [🔗](https://leetcode.com/problems/minimum-number-of-removals-to-make-mountain-array/) | Hard | 1D DP | Arrays | T2 | LIS from left + right; combination |

### Trie

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 185 | Implement Trie (Prefix Tree) | [🔗](https://leetcode.com/problems/implement-trie-prefix-tree/) | Medium | Trie | Design | T2 | Foundation Trie implementation |
| 186 | Design Add and Search Words | [🔗](https://leetcode.com/problems/design-add-and-search-words-data-structure/) | Medium | Trie + DFS | Design | T2 | Wildcard matching via Trie DFS |
| 187 | Word Search II | [🔗](https://leetcode.com/problems/word-search-ii/) | Hard | Trie + Backtracking | Grid DFS | T2 | Multi-word search; Trie pruning |
| 188 | Replace Words | [🔗](https://leetcode.com/problems/replace-words/) | Medium | Trie | Strings | T2 | Prefix replacement using Trie |
| 189 | Search Suggestions System | [🔗](https://leetcode.com/problems/search-suggestions-system/) | Medium | Trie / Binary Search | Strings | T2 | Autocomplete; Trie or sorted+BS |
| 190 | Map Sum Pairs | [🔗](https://leetcode.com/problems/map-sum-pairs/) | Medium | Trie | Design | T2 | Aggregated prefix sums in Trie |

### Bit Manipulation

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 191 | Number of 1 Bits | [🔗](https://leetcode.com/problems/number-of-1-bits/) | Easy | Bit Manipulation | Math | T2 | Foundation: bit counting |
| 192 | Counting Bits | [🔗](https://leetcode.com/problems/counting-bits/) | Easy | Bit Manipulation + DP | Arrays | T2 | DP recurrence via last bit |
| 193 | Reverse Bits | [🔗](https://leetcode.com/problems/reverse-bits/) | Easy | Bit Manipulation | Math | T2 | Bit shifting technique |
| 194 | Missing Number | [🔗](https://leetcode.com/problems/missing-number/) | Easy | Bit Manipulation (XOR) | Math | T2 | XOR self-cancellation |
| 195 | Single Number | [🔗](https://leetcode.com/problems/single-number/) | Easy | Bit Manipulation (XOR) | Arrays | T2 | XOR pairs cancel; must know |
| 196 | Single Number II | [🔗](https://leetcode.com/problems/single-number-ii/) | Medium | Bit Manipulation | Arrays | T2 | 3-time occurrence; bit counting |
| 197 | Sum of Two Integers | [🔗](https://leetcode.com/problems/sum-of-two-integers/) | Medium | Bit Manipulation | Math | T2 | Add without + operator; carry via XOR |
| 198 | Pow(x, n) | [🔗](https://leetcode.com/problems/powx-n/) | Medium | Math + Recursion | Binary Exponentiation | T2 | Fast exponentiation; edge cases |
| 199 | Power of Two | [🔗](https://leetcode.com/problems/power-of-two/) | Easy | Bit Manipulation | Math | T2 | n & (n-1) == 0 insight |

### Backtracking

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 200 | Combination Sum II | [🔗](https://leetcode.com/problems/combination-sum-ii/) | Medium | Backtracking | Arrays | T2 | No-reuse variant; duplicate pruning |
| 201 | Subsets II | [🔗](https://leetcode.com/problems/subsets-ii/) | Medium | Backtracking | Arrays | T2 | Duplicate handling in subsets |
| 202 | Permutations II | [🔗](https://leetcode.com/problems/permutations-ii/) | Medium | Backtracking | Arrays | T2 | Duplicate-aware permutations |
| 203 | Letter Combinations of Phone Number | [🔗](https://leetcode.com/problems/letter-combinations-of-a-phone-number/) | Medium | Backtracking | Strings | T2 | Mapping + recursive combination |
| 204 | Sudoku Solver | [🔗](https://leetcode.com/problems/sudoku-solver/) | Hard | Backtracking | Constraint | T2 | Constraint satisfaction; advanced pruning |
| 205 | Expression Add Operators | [🔗](https://leetcode.com/problems/expression-add-operators/) | Hard | Backtracking | Math | T2 | Operator placement; complex pruning |
| 206 | Word Break II | [🔗](https://leetcode.com/problems/word-break-ii/) | Hard | Backtracking + Memoization | Trie | T2 | All valid decompositions; DP + backtrack |

---

## Tier 3 — Advanced / Hard / Unseen-Style (~70 Problems)

### Advanced Arrays & Strings

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 207 | Minimum Window Subsequence | [🔗](https://leetcode.com/problems/minimum-window-subsequence/) | Hard | Two Pointers | Sliding Window | T3 | Harder window variant; subsequence not substring |
| 208 | Longest Duplicate Substring | [🔗](https://leetcode.com/problems/longest-duplicate-substring/) | Hard | Binary Search + Rolling Hash | Strings | T3 | Rabin-Karp + BS; top Google problem |
| 209 | Shortest Palindrome | [🔗](https://leetcode.com/problems/shortest-palindrome/) | Hard | KMP / Hashing | Strings | T3 | KMP failure function application |
| 210 | Text Justification | [🔗](https://leetcode.com/problems/text-justification/) | Hard | Simulation | Strings | T3 | String manipulation; Google-style problem |

### Advanced Binary Search

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 211 | Find in Mountain Array | [🔗](https://leetcode.com/problems/find-in-mountain-array/) | Hard | Binary Search | Arrays | T3 | Two-phase BS on bitonic array |
| 212 | K-th Smallest Prime Fraction | [🔗](https://leetcode.com/problems/k-th-smallest-prime-fraction/) | Hard | Binary Search + Heap | Math | T3 | Fractional BS; advanced technique |
| 213 | Divide Chocolate | [🔗](https://leetcode.com/problems/divide-chocolate/) | Hard | Binary Search on Answer | Greedy | T3 | Maximize minimum; BS + greedy |

### Advanced Stack & Monotonic

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 214 | Maximum Width Ramp | [🔗](https://leetcode.com/problems/maximum-width-ramp/) | Medium | Monotonic Stack | Arrays | T3 | Decreasing stack + right scan |
| 215 | Sum of Subarray Minimums | [🔗](https://leetcode.com/problems/sum-of-subarray-minimums/) | Medium | Monotonic Stack | Math | T3 | Contribution technique with stack |
| 216 | Number of Visible People in Queue | [🔗](https://leetcode.com/problems/number-of-visible-people-in-a-queue/) | Hard | Monotonic Stack | Arrays | T3 | Right-to-left stack; visibility counting |
| 217 | Max Value of Equation | [🔗](https://leetcode.com/problems/max-value-of-equation/) | Hard | Monotonic Deque | Sliding Window | T3 | Transform + deque optimization |

### Advanced Graphs

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 218 | Minimum Cost to Connect All Points | [🔗](https://leetcode.com/problems/minimum-cost-to-connect-all-points/) | Medium | MST (Prim/Kruskal) | Graphs | T3 | MST on dense graph |
| 219 | Shortest Path in Binary Matrix | [🔗](https://leetcode.com/problems/shortest-path-in-binary-matrix/) | Medium | BFS | Grid | T3 | 8-directional BFS |
| 220 | Find All People With Secret | [🔗](https://leetcode.com/problems/find-all-people-with-secret/) | Hard | Union Find / BFS | Graphs | T3 | Time-ordered event graph |
| 221 | Reachable Nodes in Subdivided Graph | [🔗](https://leetcode.com/problems/reachable-nodes-in-subdivided-graph/) | Hard | Dijkstra | Graphs | T3 | Modified Dijkstra with edge subdivision |
| 222 | Minimum Number of Vertices to Reach All Nodes | [🔗](https://leetcode.com/problems/minimum-number-of-vertices-to-reach-all-nodes/) | Medium | Graphs | Topological | T3 | In-degree zero nodes; elegant insight |
| 223 | Parallel Courses II | [🔗](https://leetcode.com/problems/parallel-courses-ii/) | Hard | DP + Bitmask | Graphs | T3 | Bitmask DP on DAG |
| 224 | Path with Maximum Probability | [🔗](https://leetcode.com/problems/path-with-maximum-probability/) | Medium | Dijkstra (max variant) | Graphs | T3 | Modified Dijkstra for max probability |

### Advanced Dynamic Programming

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 225 | Wildcard Matching | [🔗](https://leetcode.com/problems/wildcard-matching/) | Hard | 2D DP | Strings | T3 | Simpler wildcard vs. regex |
| 226 | Strange Printer | [🔗](https://leetcode.com/problems/strange-printer/) | Hard | Interval DP | Strings | T3 | Interval DP insight: same-char merge |
| 227 | Minimum Insertion Steps to Make String Palindrome | [🔗](https://leetcode.com/problems/minimum-insertion-steps-to-make-a-string-a-palindrome/) | Hard | Interval DP / LCS | Strings | T3 | LCS-based palindrome DP |
| 228 | Maximal Square | [🔗](https://leetcode.com/problems/maximal-square/) | Medium | 2D DP | Matrix | T3 | DP recurrence on squares; elegant |
| 229 | Dungeon Game | [🔗](https://leetcode.com/problems/dungeon-game/) | Hard | 2D DP (reverse) | Grid | T3 | Reverse DP; must compute from end |
| 230 | Cherry Pickup | [🔗](https://leetcode.com/problems/cherry-pickup/) | Hard | 3D DP | Grid | T3 | Simultaneous path DP; advanced |
| 231 | Number of Music Playlists | [🔗](https://leetcode.com/problems/number-of-music-playlists/) | Hard | 2D DP | Combinatorics | T3 | State: (songs played, unique songs) |
| 232 | Minimum Cost to Cut a Stick | [🔗](https://leetcode.com/problems/minimum-cost-to-cut-a-stick/) | Hard | Interval DP | Arrays | T3 | Similar to burst balloons insight |
| 233 | Count Different Palindromic Subsequences | [🔗](https://leetcode.com/problems/count-different-palindromic-subsequences/) | Hard | Interval DP | Strings | T3 | Complex palindrome counting |
| 234 | Maximum AND Sum of Array | [🔗](https://leetcode.com/problems/maximum-and-sum-of-array/) | Hard | DP + Bitmask | Arrays | T3 | Bitmask DP assignment |

### Advanced Trie

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 235 | Maximum XOR of Two Numbers in Array | [🔗](https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/) | Medium | Trie | Bit Manipulation | T3 | Bit Trie for XOR maximization |
| 236 | Palindrome Pairs | [🔗](https://leetcode.com/problems/palindrome-pairs/) | Hard | Trie / Hash Map | Strings | T3 | Complex Trie pattern; Google-level |
| 237 | Concatenated Words | [🔗](https://leetcode.com/problems/concatenated-words/) | Hard | Trie + DP | Strings | T3 | Trie + word break DP |

### Advanced Heap

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 238 | Trapping Rain Water II | [🔗](https://leetcode.com/problems/trapping-rain-water-ii/) | Hard | Heap + BFS | Grid | T3 | 3D extension of rain water; min-heap BFS |
| 239 | Maximum Performance of a Team | [🔗](https://leetcode.com/problems/maximum-performance-of-a-team/) | Hard | Heap + Greedy | Sorting | T3 | Sort + min-heap sliding window |
| 240 | Minimum Interval to Include Each Query | [🔗](https://leetcode.com/problems/minimum-interval-to-include-each-query/) | Hard | Sweep Line + Heap | Intervals | T3 | Offline query processing + heap |
| 241 | Minimum Cost to Hire K Workers | [🔗](https://leetcode.com/problems/minimum-cost-to-hire-k-workers/) | Hard | Greedy + Heap | Sorting | T3 | Ratio-sort then max-heap |

### Design Problems

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 242 | Design HashMap | [🔗](https://leetcode.com/problems/design-hashmap/) | Easy | Design | Hash Map | T3 | Understand underlying hash mechanics |
| 243 | Design Circular Queue | [🔗](https://leetcode.com/problems/design-circular-queue/) | Medium | Design | Queue | T3 | Array-based circular buffer |
| 244 | All O(1) Data Structure | [🔗](https://leetcode.com/problems/all-oone-data-structure/) | Hard | Design | Linked List + Hash | T3 | Min/max O(1); doubly-linked + map |
| 245 | Snapshot Array | [🔗](https://leetcode.com/problems/snapshot-array/) | Medium | Design | Binary Search | T3 | Snapshot via map + binary search |
| 246 | Maximum Frequency Stack | [🔗](https://leetcode.com/problems/maximum-frequency-stack/) | Hard | Design + Hash Map | Stack | T3 | Frequency-group stack; elegant design |

### Math & Miscellaneous

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 247 | Happy Number | [🔗](https://leetcode.com/problems/happy-number/) | Easy | Math + Fast/Slow | Hash Set | T3 | Cycle detection with math |
| 248 | Pow(x, n) | [🔗](https://leetcode.com/problems/powx-n/) | Medium | Math + Recursion | Binary Exponentiation | T3 | Fast exponentiation; edge cases |
| 249 | Count Primes | [🔗](https://leetcode.com/problems/count-primes/) | Medium | Math | Sieve | T3 | Sieve of Eratosthenes |
| 250 | Fraction to Recurring Decimal | [🔗](https://leetcode.com/problems/fraction-to-recurring-decimal/) | Medium | Math + Hash Map | Strings | T3 | Long division with cycle detection |
| 251 | Max Points on a Line | [🔗](https://leetcode.com/problems/max-points-on-a-line/) | Hard | Math + Hash Map | Geometry | T3 | Slope as fraction; GCD normalization |

### High-Value Mixed Problems

| # | Problem | Link | Diff | Pattern | Secondary | Tier | Why Selected |
|---|---------|------|------|---------|-----------|------|--------------|
| 252 | First Missing Positive | [🔗](https://leetcode.com/problems/first-missing-positive/) | Hard | Arrays | Index as Hash | T2 | Array as hash map; O(N) O(1) space |
| 253 | Longest Valid Parentheses | [🔗](https://leetcode.com/problems/longest-valid-parentheses/) | Hard | Stack / DP | Strings | T2 | Two approaches; important hard problem |
| 254 | Minimum Path Sum | [🔗](https://leetcode.com/problems/minimum-path-sum/) | Medium | Grid DP | 2D DP | T2 | Clean grid DP |
| 255 | Find K Pairs with Smallest Sums | [🔗](https://leetcode.com/problems/find-k-pairs-with-smallest-sums/) | Medium | Heap | K-way Merge | T2 | Multi-list K-way merge variant |
| 256 | Maximum Profit in Job Scheduling | [🔗](https://leetcode.com/problems/maximum-profit-in-job-scheduling/) | Hard | DP + Binary Search | Intervals | T2 | Weighted interval scheduling; critical |
| 257 | Largest Number | [🔗](https://leetcode.com/problems/largest-number/) | Medium | Greedy + Custom Sort | Strings | T2 | Custom comparator: which concat is bigger |
| 258 | Minimum Number of Arrows to Burst Balloons | [🔗](https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/) | Medium | Greedy + Intervals | Sorting | T2 | End-point greedy; interval overlap |
| 259 | Path With Minimum Effort | [🔗](https://leetcode.com/problems/path-with-minimum-effort/) | Medium | Dijkstra / Binary Search | Graphs | T2 | Minimize max edge; two approaches |
| 260 | Maximum Number of Events That Can Be Attended | [🔗](https://leetcode.com/problems/maximum-number-of-events-that-can-be-attended/) | Medium | Greedy + Heap | Intervals | T2 | Attend earliest-ending available event |
| 261 | Shortest Unsorted Continuous Subarray | [🔗](https://leetcode.com/problems/shortest-unsorted-continuous-subarray/) | Medium | Arrays | Two Pointers | T2 | Min/max boundary shrinking |
| 262 | Maximum Swap | [🔗](https://leetcode.com/problems/maximum-swap/) | Medium | Greedy | Arrays | T2 | Last-occurrence greedy from right |
| 263 | Find the Celebrity | [🔗](https://leetcode.com/problems/find-the-celebrity/) | Medium | Two Pointers | Graph | T2 | Elimination-based pointer |
| 264 | My Calendar I | [🔗](https://leetcode.com/problems/my-calendar-i/) | Medium | Intervals | Binary Search | T2 | Interval insertion with overlap check |
| 265 | Count Servers That Communicate | [🔗](https://leetcode.com/problems/count-servers-that-communicate/) | Medium | Graph DFS | Grid | T2 | Row/column count; non-obvious graph |
| 266 | Minimum Swaps to Group All 1s Together | [🔗](https://leetcode.com/problems/minimum-swaps-to-group-all-1s-together-ii/) | Medium | Sliding Window | Arrays | T2 | Fixed window = count of 1s |
| 267 | K-th Symbol in Grammar | [🔗](https://leetcode.com/problems/k-th-symbol-in-grammar/) | Medium | Recursion | Math | T2 | Parent-child recursion insight |
| 268 | Longest Arithmetic Subsequence | [🔗](https://leetcode.com/problems/longest-arithmetic-subsequence/) | Medium | DP + Hash Map | Arrays | T3 | DP with difference as key |
| 269 | Number of Subarrays with Sum = Goal | [🔗](https://leetcode.com/problems/number-of-subarrays-with-sum-equal-to-goal/) | Medium | Prefix Sum | Sliding Window | T2 | At-most-K trick; binary 0/1 array |
| 270 | Count Submatrices With All Ones | [🔗](https://leetcode.com/problems/count-submatrices-with-all-ones/) | Medium | DP + Stack | Matrix | T3 | Histogram DP per row |
| 271 | Count Vowels Permutation | [🔗](https://leetcode.com/problems/count-vowels-permutation/) | Hard | 1D DP | Math | T3 | State-machine DP on vowel rules |
| 272 | Count of Range Sum | [🔗](https://leetcode.com/problems/count-of-range-sum/) | Hard | Merge Sort | Prefix Sum | T3 | Inversion count variant on prefix sums |
| 273 | Find the Longest Valid Obstacle Course | [🔗](https://leetcode.com/problems/find-the-longest-valid-obstacle-course-at-each-position/) | Hard | DP + Binary Search | Arrays | T3 | LIS variant for each position |
| 274 | Painting the Walls | [🔗](https://leetcode.com/problems/painting-the-walls/) | Hard | 1D DP (Knapsack) | Arrays | T3 | Reframe as knapsack; insight-heavy |
| 275 | Count Nodes Equal to Average of Subtree | [🔗](https://leetcode.com/problems/count-nodes-equal-to-average-of-subtree/) | Medium | Tree DFS | Math | T2 | Sum + count propagation |
| 276 | Kth Largest Sum in Binary Tree | [🔗](https://leetcode.com/problems/kth-largest-sum-in-a-binary-tree/) | Medium | Tree BFS + Heap | Trees | T3 | Level sum + heap selection |
| 277 | Maximum Elegance of K-Length Subsequence | [🔗](https://leetcode.com/problems/maximum-elegance-of-a-k-length-subsequence/) | Hard | Greedy + Heap | Sorting | T3 | Exchange argument greedy |
| 278 | Recover a Tree From Preorder Traversal | [🔗](https://leetcode.com/problems/recover-a-tree-from-preorder-traversal/) | Hard | Tree DFS | Strings | T3 | Stack-based reconstruction with depth |
| 279 | Minimum Deletions to Make Character Frequencies Unique | [🔗](https://leetcode.com/problems/minimum-deletions-to-make-character-frequencies-unique/) | Medium | Greedy | Strings | T2 | Frequency decrement greedy |
| 280 | Maximum Number of Events That Can Be Attended II | [🔗](https://leetcode.com/problems/maximum-number-of-events-that-can-be-attended-ii/) | Hard | DP + Binary Search | Intervals | T3 | Weighted k-events; DP + BS |
| 281 | Find Minimum in Rotated Sorted Array II | [🔗](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array-ii/) | Hard | Binary Search | Arrays | T2 | Duplicates break the standard approach |
| 282 | Minimum Interval to Include Each Query | [🔗](https://leetcode.com/problems/minimum-interval-to-include-each-query/) | Hard | Sweep Line + Heap | Intervals | T3 | Offline query processing + heap |
| 283 | Check if Array Is Sorted and Rotated | [🔗](https://leetcode.com/problems/check-if-array-is-sorted-and-rotated/) | Easy | Arrays | Two Pointers | T2 | Rotation detection |
| 284 | Maximum Units on a Truck | [🔗](https://leetcode.com/problems/maximum-units-on-a-truck/) | Easy | Greedy + Sort | Arrays | T2 | Greedy sort descending |
| 285 | Decode XORed Array | [🔗](https://leetcode.com/problems/decode-xored-array/) | Easy | Bit Manipulation | Arrays | T2 | XOR prefix recovery |
| 286 | Minimum Moves to Reach Target with Rotations | [🔗](https://leetcode.com/problems/minimum-moves-to-reach-target-with-rotations/) | Hard | BFS | State Space | T3 | State-space BFS (snake game) |
| 287 | Design File System | [🔗](https://leetcode.com/problems/design-file-system/) | Medium | Trie / Hash Map | Design | T2 | Path decomposition design |
| 288 | Largest Rectangle in Histogram (variant) — Campus Bikes | [🔗](https://leetcode.com/problems/campus-bikes/) | Medium | Greedy + Sorting | Heap | T3 | Priority-based matching |
| 289 | Swim in Rising Water | [🔗](https://leetcode.com/problems/swim-in-rising-water/) | Hard | Dijkstra / Binary Search | Graphs | T3 | Minimize max path; two approaches |
| 290 | Maximum AND Sum of Array | [🔗](https://leetcode.com/problems/maximum-and-sum-of-array/) | Hard | DP + Bitmask | Arrays | T3 | Bitmask DP for assignment |

---

## PART C: 12-Week Roadmap

> **Core principle:** Every week has new patterns, revision of old patterns, mixed/unseen problems, timed problems, and at least one interview simulation.

### Week Overview

| Week | Focus | New Patterns | Key Revision | Readiness Target |
|------|-------|-------------|--------------|-----------------|
| 1 | Foundation | Arrays, Hashing, Two Pointers, Sliding Window (fixed) | — | 15% |
| 2 | Search & Stack | Binary Search (all variants), Monotonic Stack, Variable Window | Two Pointers, Hashing | 25% |
| 3 | Linked Lists & Tree DFS | LL reversal/cycle/merge, Tree DFS recursion, BST | Stack, Sliding Window | 32% |
| 4 | Trees (BFS/Advanced) & Heaps | Tree BFS, LCA, paths, Min/Max heap, Two-heaps | Trees DFS, Binary Search | 42% |
| 5 | Intervals, Greedy, Backtracking | Merge intervals, Greedy local-optimal, BT templates | Heaps, Two Pointers | 50% |
| 6 | Graphs I | BFS/DFS, connected components, cycle detection, topo sort, Union-Find | BT, Trees | 58% |
| 7 | DP I | 1D DP, 2D DP, grid DP, 0/1 knapsack, unbounded knapsack | Graphs, Binary Search | 62% |
| 8 | DP II | String DP, LCS, Edit Distance, Interval DP, State Machine DP | 1D/2D DP, Graphs | 68% |
| 9 | Graphs II & Trie | Dijkstra, MST, advanced graph patterns, Trie | Topo sort, DP, Trees | 73% |
| 10 | Bit Manipulation & Design | Bit tricks, XOR, Design problems (LRU, LFU) | DP, Trie, Graphs | 78% |
| 11 | Mixed Pattern Recognition | Hard/Tier 3 problems; pattern recognition without hints | All weak patterns | 84% |
| 12 | Full Interview Simulation | No new patterns; pure interview readiness + 3 full mocks | Every major pattern | 90%+ |

### Detailed Week-by-Week

#### Week 1 — Foundation Patterns
```
Mon: Arrays & Hashing (Two Sum, Contains Duplicate, Valid Anagram)
Tue: Hash Map deep patterns (Group Anagrams, Top K Frequent, Product Except Self)
Wed: Prefix Sum (Subarray Sum Equals K, Range Sum Query)
Thu: Two Pointers — opposite direction (Valid Palindrome, Two Sum II, 3Sum)
Fri: Two Pointers — partition (Sort Colors, Move Zeroes, Container With Water)
Sat: Sliding Window fixed (Best Time to Buy/Sell, Permutation in String)
Sun: Interview sim + review all Week 1 patterns
```

#### Week 2 — Binary Search + Stack
```
Mon: Binary Search templates (Binary Search, Search 2D Matrix)
Tue: Binary Search on rotated arrays (Find Min Rotated, Search Rotated)
Wed: Binary Search on answer (Koko Eating Bananas, Find Peak)
Thu: Monotonic Stack (Daily Temperatures, Next Greater Element I/II)
Fri: Hard stack (Largest Rectangle in Histogram, Car Fleet)
Sat: Variable sliding window (Longest Substring No Repeat, Longest Repeating Char)
Sun: Interview sim — BS problem + review
```

#### Week 3 — Linked Lists + Tree DFS
```
Mon: LL foundations (Reverse LL, Merge Two Sorted, Linked List Cycle)
Tue: LL advanced (Reorder List, Remove Nth Node, Copy with Random Pointer)
Wed: LL design (LRU Cache, Find Duplicate Number)
Thu: Tree DFS basics (Invert, Max Depth, Diameter, Balanced)
Fri: Tree DFS advanced (Count Good Nodes, Validate BST, Kth Smallest BST)
Sat: Tree construction + paths (Construct from Pre/Inorder, Serialize/Deserialize)
Sun: Interview sim — LL manipulation
```

#### Week 4 — Trees (BFS, Advanced) + Heaps
```
Mon: Tree BFS (Level Order, Right Side View, Zigzag Level Order)
Tue: LCA patterns (LCA BST, LCA Binary Tree)
Wed: Tree path problems (Binary Tree Max Path Sum, Path Sum II, Sum Root to Leaf)
Thu: Heap basics (Kth Largest, K Closest Points, Last Stone Weight)
Fri: Heap advanced (Task Scheduler, Find Median from Data Stream)
Sat: K-way merge (Merge K Sorted Lists, Design Twitter)
Sun: Interview sim — tree + heap combo
```

#### Week 5 — Intervals + Greedy + Backtracking
```
Mon: Intervals (Meeting Rooms I/II, Merge Intervals)
Tue: Interval advanced (Insert Interval, Non-Overlapping Intervals)
Wed: Greedy foundations (Jump Game, Jump Game II, Gas Station)
Thu: Greedy advanced (Partition Labels, Hand of Straights)
Fri: Backtracking foundations (Subsets, Permutations, Combination Sum)
Sat: Backtracking advanced (Word Search, Palindrome Partitioning, N-Queens)
Sun: Interview sim — greedy / interval problem
```

#### Week 6 — Graphs I
```
Mon: Graph BFS/DFS basics (Number of Islands, Clone Graph)
Tue: Grid graphs (Pacific Atlantic Water Flow, Max Area of Island, Surrounded Regions)
Wed: Multi-source BFS (Walls and Gates, Rotting Oranges)
Thu: Topological sort (Course Schedule I/II, Alien Dictionary)
Fri: Union-Find (Number of Connected Components, Graph Valid Tree, Redundant Connection)
Sat: Dijkstra (Network Delay Time, Path with Min Effort)
Sun: Interview sim — graph problem
```

#### Week 7 — Dynamic Programming I
```
Mon: 1D DP (Climbing Stairs, House Robber, House Robber II)
Tue: 1D DP advanced (Coin Change, LIS, Decode Ways, Word Break)
Wed: Grid DP (Unique Paths, Minimum Path Sum, Triangle)
Thu: 0/1 Knapsack (Partition Equal Subset Sum, Target Sum)
Fri: Unbounded Knapsack (Coin Change II, Minimum Cost For Tickets)
Sat: Max Product Subarray, Jump Game III, Stone Game
Sun: Interview sim — DP problem
```

#### Week 8 — Dynamic Programming II
```
Mon: String DP (LCS, Edit Distance, Distinct Subsequences)
Tue: Palindrome DP (Longest Palindromic Substring, Palindromic Substrings)
Wed: Interleaving String, Wildcard Matching
Thu: Interval DP (Burst Balloons, Minimum Cost to Cut a Stick)
Fri: State Machine DP (Stock problems: I/II/III/Cooldown)
Sat: Regular Expression Matching, Strange Printer
Sun: Interview sim — medium-hard DP
```

#### Week 9 — Graphs II + Trie
```
Mon: Dijkstra advanced (Cheapest Flights K Stops, Swim in Rising Water, Path Max Probability)
Tue: MST (Minimum Cost Connect All Points, Find Critical Edges)
Wed: Advanced BFS (Word Ladder, Bus Routes, Find All People With Secret)
Thu: Trie (Implement Trie, Design Add/Search Words, Replace Words)
Fri: Trie advanced (Word Search II, Search Suggestions, Map Sum Pairs)
Sat: Trie + Bit (Max XOR of Two Numbers, Concatenated Words)
Sun: Interview sim — graph/Dijkstra
```

#### Week 10 — Bit Manipulation + Math + Design
```
Mon: Bit basics (Number of 1 Bits, Counting Bits, Reverse Bits, Missing Number)
Tue: XOR patterns (Single Number I/II, Sum of Two Integers, Decode XORed Array)
Wed: Design problems (LRU Cache revisit, Maximum Frequency Stack)
Thu: Design advanced (All O(1) Data Structure, Snapshot Array)
Fri: Math problems (Pow(x,n), Count Primes, Max Points on Line)
Sat: Mixed unseen — pattern recognition drill (no hints)
Sun: Interview sim — design + algorithm
```

#### Week 11 — Mixed Pattern Recognition + Tier 3
```
Mon: Hard unseen (no pattern label given) × 2 problems
Tue: Tier 3 DP (Cherry Pickup, Maximum AND Sum, Number of Music Playlists)
Wed: Tier 3 Graphs (Parallel Courses II, Reachable Nodes, Find All People)
Thu: Tier 3 Strings (Text Justification, Shortest Palindrome, Longest Duplicate Substring)
Fri: Tier 3 Heap (Trapping Rain Water II, Max Performance of Team)
Sat: Full 45-min mock — blind, no pattern label
Sun: Weak area reinforcement + review error log
```

#### Week 12 — Full Interview Simulation
```
Mon: Pattern recall drills (all 17 families, recognition signals, complexity)
Tue: Weak areas — targeted problems (based on error log)
Wed: FULL MOCK INTERVIEW #1 (45 min, 2 problems, scored)
Thu: Review mock + fix weak spots
Fri: FULL MOCK INTERVIEW #2 (45 min, 2 problems, scored)
Sat: High-confidence medium problems — build speed
Sun: FULL MOCK INTERVIEW #3 (45 min, 2 problems, scored) + final review
```

---

## PART D: Daily Routine

```
────────────────────────────────────────────────────
📅 DEFAULT 1.5–2 HOUR DSA SESSION
────────────────────────────────────────────────────

⏱ BLOCK 1 — Pattern Recall                [10–15 min]

  Before solving anything.
  3–5 rapid-fire questions:
  - When does [pattern] apply?
  - What's the key signal in the problem?
  - What's the time/space complexity?
  - What's the most common mistake?
  - Trace through a small example.

  You answer. Coach corrects or confirms.
  No problem revealed yet.

⏱ BLOCK 2 — Main Problem                  [35–45 min]

  One meaningful Medium or Hard problem.
  Pattern is NOT revealed upfront.

  Hint system (sequential):
  → Hint 1: Conceptual nudge only
  → Hint 2: Relevant pattern / data structure
  → Hint 3: Key observation spelled out
  → Solution: Only after Hint 3 if still stuck

  You must explain your approach before seeing code.

⏱ BLOCK 3 — Variation / Second Problem    [25–35 min]

  Same pattern, different problem.
  Tests: did you internalize it, or just solve one?
  Sometimes given with no pattern label (unseen test).

⏱ BLOCK 4 — Review & Log                  [10–15 min]

  Record after every session:
  - Pattern used
  - Key insight
  - Time taken
  - Mistakes made
  - Complexity
  - Confidence: X/10
  - Hints used: 0/1/2/3
  - Status: Mastered / Developing / Weak / Critical
────────────────────────────────────────────────────
```

---

## PART E: Progress Tracker

Update this after every session.

| Pattern | Solved | Accuracy | Avg Time | Hint Dep. | Confidence | Last Practiced | Status |
|---------|--------|----------|----------|-----------|------------|----------------|--------|
| Arrays & Hashing | 0 | — | — | — | — | — | 🔵 Pending |
| Two Pointers | 0 | — | — | — | — | — | 🔵 Pending |
| Sliding Window | 0 | — | — | — | — | — | 🔵 Pending |
| Binary Search | 0 | — | — | — | — | — | 🔵 Pending |
| Stack | 0 | — | — | — | — | — | 🔵 Pending |
| Queue / Deque | 0 | — | — | — | — | — | 🔵 Pending |
| Linked Lists | 0 | — | — | — | — | — | 🔵 Pending |
| Trees | 0 | — | — | — | — | — | 🔵 Pending |
| Heaps | 0 | — | — | — | — | — | 🔵 Pending |
| Intervals | 0 | — | — | — | — | — | 🔵 Pending |
| Greedy | 0 | — | — | — | — | — | 🔵 Pending |
| Backtracking | 0 | — | — | — | — | — | 🔵 Pending |
| Graphs | 0 | — | — | — | — | — | 🔵 Pending |
| Dynamic Programming | 0 | — | — | — | — | — | 🔵 Pending |
| Trie | 0 | — | — | — | — | — | 🔵 Pending |
| Bit Manipulation | 0 | — | — | — | — | — | 🔵 Pending |
| Math / Misc | 0 | — | — | — | — | — | 🔵 Pending |
| **TOTAL** | **0/300** | — | — | — | — | — | |

**Interview Readiness: 0%**

### Spaced Repetition Schedule

When a problem is solved successfully, schedule mental review at:
- Day +1
- Day +3
- Day +7
- Day +14
- Day +30

Prefer **same pattern → different problem** over repeating the exact same problem.

---

## PART F: Weakness Detection System

```
SELECTION ALGORITHM (runs before every session)
─────────────────────────────────────────────────

IF pattern has < 3 problems solved:
    → Force as "new pattern" session (20% slot)

IF accuracy < 60%:
    → Classify as 🔴 WEAK → gets 40% slot
    → Also bump into tomorrow's session

IF accuracy 60–75%:
    → Classify as 🟡 DEVELOPING → gets 25% slot

IF accuracy > 75% AND last reviewed > 7 days:
    → Schedule for 🟢 spaced repetition (25% slot)

IF pattern is MASTERED:
    → Appears ONLY in mixed/unseen sessions

IF error log shows repeated same error type:
    → Increase that pattern's weight by +10%

DAILY MIX WEIGHTS:
  40% → Weak / Critical patterns
  25% → Spaced repetition (due patterns)
  20% → New pattern introduction
  15% → Mixed / unseen (pattern label withheld)

Adjust weights dynamically based on rolling performance.
```

---

## Interview Modes

When you say **"I have a [Company] interview in X days"**, switch immediately to the appropriate mode.

### 7-Day Mode
- Day 1: Assess current state; identify top 3 weak areas
- Days 2–3: High-frequency patterns only (Arrays, Trees, Graphs, DP basics)
- Days 4–5: Timed medium problems; pattern recognition drills
- Day 6: Mock interview + error review
- Day 7: Morning recall → afternoon weak areas → evening light mock

### 10-Day Mode
- Days 1–2: Diagnosis + weak area identification
- Days 3–6: High-priority patterns (Tier 1 only) + variations
- Days 7–8: Timed medium/hard problems; mixed unseen
- Day 9: Full mock interview
- Day 10: Recall only; templates; confidence building

### 14-Day Mode
- Days 1–2: Diagnosis
- Days 3–8: All Tier 1 patterns; variations
- Days 9–11: Tier 2 high-value problems; timed sessions
- Days 12–13: Mock interviews × 2
- Day 14: Review only

### 20-Day Mode
- Days 1–3: Diagnosis + Tier 1 foundations
- Days 4–10: All Tier 1 + priority Tier 2
- Days 11–15: Hard problems + Tier 3 selected
- Days 16–18: Mock interviews × 3
- Days 19–20: Recall + templates + confidence

### 30-Day Mode
- Week 1: Tier 1 mastery
- Week 2: Tier 2 coverage + pattern variations
- Week 3: Tier 3 + hard problems + unseen drills
- Week 4: Mock interviews + targeted weak area fixes

### Last-Minute Mode (Interview Tomorrow)
```
Morning:   Pattern recall only — no new problems
           Run through all 17 pattern families
           For each: signal, approach, complexity

Afternoon: 2–3 problems from current weak areas
           Timed: 25 min each
           Focus on recognition, not perfection

Evening:   One timed mock interview (45 min)
           Review approach, not result

Final:     Read through templates only:
           ✓ Two Pointers
           ✓ Binary Search (standard + on-answer)
           ✓ Sliding Window
           ✓ BFS / DFS
           ✓ Tree traversal
           ✓ Dijkstra
           ✓ Backtracking
           ✓ 1D DP / 2D DP
           ✓ Union-Find
           ✓ Monotonic Stack
           
           Focus: confidence and recall
           Do NOT try to learn anything new.
```

---

## Error Log System

Every mistake is classified:

| Code | Type | Description | Response |
|------|------|-------------|----------|
| A | Pattern Recognition Error | Didn't identify the correct approach | +40% weight to that pattern |
| B | Logic Error | Pattern identified, reasoning wrong | Revisit problem next day |
| C | Coding Error | Algorithm correct, code buggy | Code review + clean rewrite |
| D | Complexity Error | Approach correct, inefficient | Review optimal approach |
| E | Edge Case Error | Missed important case | Add to personal edge case list |
| F | Communication Error | Couldn't explain clearly | Explain out loud before coding |
| G | Pressure Error | Knew concept, failed under time | More timed practice |

> **Rule:** 3 errors of the same type on the same pattern → pattern automatically promoted to WEAK regardless of accuracy score.

---

## Solution Explanation Format

When a solution is revealed, always follow this structure:

```
### 1. Intuition
Explain the key idea in plain English. No code yet.

### 2. Pattern
Name the DSA pattern(s) used.

### 3. Why This Pattern?
What signals in the problem pointed here?

### 4. Brute Force
Brief description of the O(N²) or naive approach.

### 5. Optimal Approach
How and why we improve it.

### 6. Step-by-Step Walkthrough
Trace through a concrete small example.

### 7. JavaScript Solution
Clean, interview-ready JS code.

### 8. Complexity
- Time: O(...)
- Space: O(...)

### 9. Edge Cases
List at least 3 important ones.

### 10. Interview Variations
2–4 ways the interviewer could modify this problem.

### 11. Recognition Rule
"When you see X + Y + Z, think ______."
```

---

## Mastery Classification

### 🟢 MASTERED
Can solve unfamiliar variations independently. Explains clearly. No hints needed. Pattern recognized within 2 minutes.

### 🟡 DEVELOPING
Understands pattern but needs occasional prompting. May require Hint 1. Takes 30–40 min for medium problems.

### 🔴 WEAK
Frequently fails to identify or implement the pattern. Requires multiple hints. Should appear in 40% of future sessions.

### ⚫ CRITICAL
Repeatedly fails even after revision and seeing solutions. Requires structured remediation starting from the simplest variant.

---

## Weekly Assessment

Every Sunday, answer these questions honestly:

**Pattern Recognition** (score /10): Can I identify patterns in unseen problems?

**Problem Solving** (score /10): Do I reach correct solutions?

**Coding** (score /10): Is my JS clean and bug-free?

**Speed** (score /10): Am I within 25–30 min for mediums?

**Complexity** (score /10): Do I know the complexity of everything I write?

**Retention** (score /10): Are older patterns still solid?

**Interview Readiness** (%): Honest percentage

> "If I received a Google/Microsoft/Salesforce interview next week, how ready am I?"
> Give a realistic number. Do not inflate.

---

## Mastery Definition

A problem is **NOT MASTERED** until I can:

1. Identify the pattern from a cold reading
2. Explain the intuition without prompting
3. Derive the approach independently
4. Implement clean, correct JS
5. State time and space complexity
6. Handle at least 3 edge cases
7. Solve a meaningful variation

Completing a problem is not the same as mastering it.

---

## JavaScript Interview Notes

### Data Structures
```javascript
// Map (preferred over Object for arbitrary keys)
const map = new Map();
map.set(key, value);
map.get(key);
map.has(key);

// Set
const set = new Set();
set.add(value);
set.has(value);
set.delete(value);

// Min-Heap (manual implementation for interviews)
class MinHeap {
  constructor() { this.heap = []; }
  push(val) {
    this.heap.push(val);
    this._bubbleUp(this.heap.length - 1);
  }
  pop() {
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }
  peek() { return this.heap[0]; }
  size() { return this.heap.length; }
  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent] > this.heap[i]) {
        [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
        i = parent;
      } else break;
    }
  }
  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let min = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l] < this.heap[min]) min = l;
      if (r < n && this.heap[r] < this.heap[min]) min = r;
      if (min === i) break;
      [this.heap[min], this.heap[i]] = [this.heap[i], this.heap[min]];
      i = min;
    }
  }
}
```

### Common Pitfalls
```javascript
// Numeric sort (WRONG — lexicographic by default)
[10, 2, 1].sort();              // [1, 10, 2] ❌
[10, 2, 1].sort((a, b) => a - b); // [1, 2, 10] ✓

// Integer division
Math.floor(a / b);  // Use this, not | 0 for negative numbers

// String to array of chars
[...str]  // or str.split('')

// Queue using array (O(N) shift — acceptable for interviews)
const queue = [];
queue.push(val);   // enqueue
queue.shift();     // dequeue — O(N), note for interviewer

// Modulo for circular arrays
const next = (i + 1) % n;
```

### Complexity Reference

| Operation | Array | Hash Map | Set | Heap | BST |
|-----------|-------|----------|-----|------|-----|
| Access | O(1) | O(1) | — | — | O(log N) |
| Search | O(N) | O(1) | O(1) | O(N) | O(log N) |
| Insert | O(1) amortized | O(1) | O(1) | O(log N) | O(log N) |
| Delete | O(N) | O(1) | O(1) | O(log N) | O(log N) |

---

## Interview Score Template

Use this after every mock interview:

| Category | Score |
|----------|-------|
| Problem Understanding | /10 |
| Pattern Recognition | /10 |
| Approach | /10 |
| Coding | /10 |
| Complexity Analysis | /10 |
| Edge Cases | /10 |
| Communication | /10 |
| Recovery From Mistakes | /10 |
| **Overall** | **/10** |

---

## Constraint-Driven Thinking Checklist

Before choosing an approach, ask:

```
□ What is N?
□ What complexity is acceptable?
  - N ≤ 20       → Backtracking / bitmask DP
  - N ≤ 100      → O(N³) DP, interval DP
  - N ≤ 1,000    → O(N²) DP, O(N² log N)
  - N ≤ 100,000  → O(N log N)
  - N ≤ 1,000,000 → O(N) or O(N log N)

□ Is the input sorted?         → Binary search, two pointers
□ Is there repeated subproblem? → DP / memoization
□ Is this graph-like?          → BFS/DFS/Union-Find
□ Is this an interval problem? → Sort + greedy or sweep
□ Can I use a hash map?        → O(N) lookup complement
□ Is the input monotonic?      → Binary search on answer
□ Do I need K smallest/largest? → Heap
□ Is there a stack-like structure? → Monotonic stack
□ Do I need prefix information? → Prefix sum
```

---

*Last updated: Day 1, Week 1*

*Total problems in bank: 300*
*Interview Readiness: 0%*
*Next session: Day 1 — Arrays & Hashing + Two Pointers*
