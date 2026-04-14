# DSA Algorithms Knowledge Base — MASTER INDEX

## Complete FAANG-Level Algorithmic Thinking System

> *"The goal is not to memorize algorithms — it is to build a mental machine that recognizes patterns and selects the right tool instantly."*

This knowledge base is organized as a **hierarchical pattern system**. Every algorithm is taught intuition-first, then formalized. No code — only thinking frameworks.

---

## How to Use This Knowledge Base

1. **Start with** [01-LEARNING-ROADMAP.md](01-LEARNING-ROADMAP.md) — follow the progression order
2. **Study each category file** in the recommended sequence
3. **Use this index** as a quick-lookup when solving problems
4. **Use the Pattern Decision Flowchart** (below) to map any new problem to an approach

---

## Complete Category Map

| # | File | Core Topics | Difficulty Span |
|---|------|-------------|-----------------|
| 02 | [Arrays & Strings](02-ARRAYS-AND-STRINGS.md) | Two Pointers, Sliding Window, Prefix Sum, Kadane's, Dutch National Flag, Boyer-Moore Voting, Matrix Traversal | Easy → Hard |
| 03 | [Searching Techniques](03-SEARCHING-TECHNIQUES.md) | Binary Search (classic, on answer, rotated), Ternary Search, Exponential Search, 2D Matrix Search | Easy → Hard |
| 04 | [Sorting & Order Statistics](04-SORTING-AND-ORDER.md) | Merge Sort patterns, Quick Select, Counting/Radix/Bucket Sort, Custom Comparators, Cyclic Sort | Easy → Medium |
| 05 | [Hashing & Sets](05-HASHING-AND-SETS.md) | Frequency Counting, Two-Sum family, Group Anagrams, Subarray Sum + HashMap, Rolling Hash | Easy → Medium |
| 06 | [Linked Lists](06-LINKED-LISTS.md) | Fast/Slow Pointers, Reversal, Merge, Cycle Detection, LRU Cache, Deep Clone | Easy → Hard |
| 07 | [Stacks & Queues](07-STACKS-AND-QUEUES.md) | Monotonic Stack, Monotonic Queue, Histogram, Rain Water, Parentheses, Min/Max Stack | Easy → Hard |
| 08 | [Recursion & Backtracking](08-RECURSION-AND-BACKTRACKING.md) | Subsets, Combinations, Permutations, N-Queens, Sudoku, Word Search, Pruning | Medium → Hard |
| 09 | [Dynamic Programming](09-DYNAMIC-PROGRAMMING.md) | 1D/2D DP, Knapsack, LIS/LCS, Interval DP, Bitmask DP, Digit DP, Tree DP, State Machine DP, All Optimizations | Medium → Hard |
| 10 | [Trees](10-TREES.md) | Traversals, BST, LCA, Diameter, Serialize/Deserialize, Morris, Path Sum, Construction | Easy → Hard |
| 11 | [Graphs](11-GRAPHS.md) | BFS, DFS, Topological Sort, Dijkstra, Bellman-Ford, Floyd-Warshall, Union-Find, MST, SCC, Bipartite, Network Flow | Medium → Hard |
| 12 | [Heaps & Priority Queues](12-HEAPS-AND-PRIORITY-QUEUES.md) | Top-K, Merge-K, Two-Heap, Median Stream, Task Scheduler | Easy → Hard |
| 13 | [Greedy Algorithms](13-GREEDY-ALGORITHMS.md) | Exchange Argument, Activity Selection, Jump Game, Gas Station, Candy, Huffman | Medium → Hard |
| 14 | [Bit Manipulation](14-BIT-MANIPULATION.md) | XOR Tricks, Brian Kernighan, Single Number, Bitmask Subsets, Power of Two | Easy → Medium |
| 15 | [Math & Number Theory](15-MATH-AND-NUMBER-THEORY.md) | GCD/LCM, Sieve, Modular Arithmetic, Combinatorics, Catalan Numbers, Reservoir Sampling | Easy → Hard |
| 16 | [Advanced Data Structures](16-ADVANCED-DATA-STRUCTURES.md) | Trie, Segment Tree, Fenwick Tree, Sparse Table, Disjoint Set Union | Medium → Hard |
| 17 | [String Algorithms](17-STRING-ALGORITHMS.md) | KMP, Rabin-Karp, Z-Algorithm, Manacher's, Suffix Arrays | Medium → Hard |
| 18 | [Interval & Sweep Line](18-INTERVAL-AND-SWEEP-LINE.md) | Merge/Insert Intervals, Meeting Rooms, Sweep Line, Range Module | Medium → Hard |
| 19 | [Design Patterns & Meta](19-DESIGN-PATTERNS-AND-META.md) | Iterator, State Machine, Simulation, Minimax, Meet in the Middle, Randomized, Amortized | Medium → Hard |

---

## Pattern Decision Flowchart

Use this flowchart when you read a new problem and need to decide which approach to try.

### Step 1: What is the input?

| Input Type | Go To |
|---|---|
| Array / String | Step 2A |
| Linked List | [Linked Lists](06-LINKED-LISTS.md) |
| Tree | [Trees](10-TREES.md) |
| Graph / Grid (connections between nodes) | [Graphs](11-GRAPHS.md) |
| Intervals / Ranges | [Interval & Sweep Line](18-INTERVAL-AND-SWEEP-LINE.md) |
| Number / Mathematical | [Math & Number Theory](15-MATH-AND-NUMBER-THEORY.md) |
| Stream of data | [Heaps](12-HEAPS-AND-PRIORITY-QUEUES.md) or [Design Patterns](19-DESIGN-PATTERNS-AND-META.md) |

### Step 2A: Array / String — What is being asked?

| Question Type | Primary Approach |
|---|---|
| Find a pair/triplet with a target sum | [Hashing](05-HASHING-AND-SETS.md) or [Two Pointers](02-ARRAYS-AND-STRINGS.md#two-pointers) |
| Contiguous subarray with property X | [Sliding Window](02-ARRAYS-AND-STRINGS.md#sliding-window) or [Prefix Sum](02-ARRAYS-AND-STRINGS.md#prefix-sum) |
| Longest/Shortest substring with constraint | [Sliding Window](02-ARRAYS-AND-STRINGS.md#sliding-window) |
| Find element in sorted data | [Binary Search](03-SEARCHING-TECHNIQUES.md) |
| Find minimum/maximum that satisfies a condition | [Binary Search on Answer](03-SEARCHING-TECHNIQUES.md#binary-search-on-answer) |
| Subsets / Combinations / Permutations | [Backtracking](08-RECURSION-AND-BACKTRACKING.md) |
| Count ways / Optimal value over substructure | [Dynamic Programming](09-DYNAMIC-PROGRAMMING.md) |
| Sort or order-related | [Sorting](04-SORTING-AND-ORDER.md) |
| Next greater / smaller element | [Monotonic Stack](07-STACKS-AND-QUEUES.md#monotonic-stack) |
| Pattern matching in string | [String Algorithms](17-STRING-ALGORITHMS.md) |
| Grouping / Categorization | [Hashing](05-HASHING-AND-SETS.md) |
| Missing / Duplicate in range [1, n] | [Cyclic Sort](04-SORTING-AND-ORDER.md#cyclic-sort) or [Bit Manipulation](14-BIT-MANIPULATION.md) |

### Step 2B: Graph/Grid — What is being asked?

| Question Type | Primary Approach |
|---|---|
| Shortest path (unweighted) | BFS |
| Shortest path (weighted, non-negative) | Dijkstra |
| Shortest path (negative weights) | Bellman-Ford |
| All-pairs shortest path | Floyd-Warshall |
| Connected components / Islands | BFS/DFS or Union-Find |
| Detect cycle | DFS (directed) or Union-Find (undirected) |
| Ordering with dependencies | Topological Sort |
| Minimum cost to connect all | MST (Kruskal's / Prim's) |
| Is graph 2-colorable? | Bipartite Check (BFS/DFS) |
| Bridges / Critical connections | Tarjan's Algorithm |

### Step 2C: Optimization Problem — Which paradigm?

| Signal | Paradigm |
|---|---|
| "Make a choice at each step, never look back" | [Greedy](13-GREEDY-ALGORITHMS.md) |
| "Count ways" or "min/max over all possibilities" with overlapping subproblems | [Dynamic Programming](09-DYNAMIC-PROGRAMMING.md) |
| "Generate all valid configurations" | [Backtracking](08-RECURSION-AND-BACKTRACKING.md) |
| "Kth largest/smallest" or "Top K" or "Median" | [Heap](12-HEAPS-AND-PRIORITY-QUEUES.md) |
| "Find if achievable" with monotonic feasibility | [Binary Search on Answer](03-SEARCHING-TECHNIQUES.md#binary-search-on-answer) |

---

## Quick Pattern-Trigger Lookup Table

This table maps **keywords / phrases you see in problem statements** directly to approaches.

| Keyword / Phrase | Likely Approach | File |
|---|---|---|
| "sorted array" | Binary Search | [03](03-SEARCHING-TECHNIQUES.md) |
| "subarray sum" | Prefix Sum + HashMap | [02](02-ARRAYS-AND-STRINGS.md), [05](05-HASHING-AND-SETS.md) |
| "contiguous subarray" | Sliding Window or Kadane's | [02](02-ARRAYS-AND-STRINGS.md) |
| "anagram" / "permutation of" | Frequency Count / Sliding Window | [05](05-HASHING-AND-SETS.md) |
| "palindrome" | Two Pointers / DP / Manacher's | [02](02-ARRAYS-AND-STRINGS.md), [09](09-DYNAMIC-PROGRAMMING.md), [17](17-STRING-ALGORITHMS.md) |
| "parentheses" / "brackets" | Stack | [07](07-STACKS-AND-QUEUES.md) |
| "next greater" / "next smaller" | Monotonic Stack | [07](07-STACKS-AND-QUEUES.md) |
| "merge intervals" / "overlapping" | Interval patterns / Sweep Line | [18](18-INTERVAL-AND-SWEEP-LINE.md) |
| "number of islands" / "connected" | BFS/DFS/Union-Find | [11](11-GRAPHS.md) |
| "shortest path" | BFS or Dijkstra | [11](11-GRAPHS.md) |
| "topological" / "prerequisites" / "order of tasks" | Topological Sort | [11](11-GRAPHS.md) |
| "all subsets" / "power set" | Backtracking or Bitmask | [08](08-RECURSION-AND-BACKTRACKING.md), [14](14-BIT-MANIPULATION.md) |
| "minimum cost" / "maximum profit" / "count ways" | DP | [09](09-DYNAMIC-PROGRAMMING.md) |
| "kth largest" / "top k" / "k closest" | Heap / Quick Select | [12](12-HEAPS-AND-PRIORITY-QUEUES.md), [04](04-SORTING-AND-ORDER.md) |
| "median" / "running median" | Two Heaps | [12](12-HEAPS-AND-PRIORITY-QUEUES.md) |
| "LRU" / "LFU" / "cache" | LinkedList + HashMap | [06](06-LINKED-LISTS.md) |
| "bit" / "XOR" / "single number" | Bit Manipulation | [14](14-BIT-MANIPULATION.md) |
| "trie" / "prefix" / "autocomplete" | Trie | [16](16-ADVANCED-DATA-STRUCTURES.md) |
| "range query" / "range sum" / "range update" | Segment Tree / Fenwick / Prefix Sum | [16](16-ADVANCED-DATA-STRUCTURES.md) |
| "minimum spanning tree" | Kruskal's / Prim's | [11](11-GRAPHS.md) |
| "buy and sell stock" | State Machine DP / Greedy | [09](09-DYNAMIC-PROGRAMMING.md) |
| "robot" / "grid paths" / "unique paths" | 2D DP or BFS | [09](09-DYNAMIC-PROGRAMMING.md) |
| "knapsack" / "partition" / "subset sum" | Knapsack DP | [09](09-DYNAMIC-PROGRAMMING.md) |
| "longest increasing subsequence" | LIS (DP + Binary Search) | [09](09-DYNAMIC-PROGRAMMING.md) |
| "edit distance" / "transform" | String DP | [09](09-DYNAMIC-PROGRAMMING.md) |
| "schedule" / "meeting rooms" | Greedy / Sweep Line / Heap | [13](13-GREEDY-ALGORITHMS.md), [18](18-INTERVAL-AND-SWEEP-LINE.md) |
| "design" / "implement" | Design Pattern | [19](19-DESIGN-PATTERNS-AND-META.md) |
| "random" / "shuffle" / "reservoir" | Randomized / Math | [15](15-MATH-AND-NUMBER-THEORY.md), [19](19-DESIGN-PATTERNS-AND-META.md) |
| "game" / "player 1 vs player 2" / "minimax" | Game Theory DP / Minimax | [09](09-DYNAMIC-PROGRAMMING.md), [19](19-DESIGN-PATTERNS-AND-META.md) |

---

## Cross-Category Connections Map

Many real interview problems require **combining techniques**. Here are the most important connections:

| Combined Pattern | Example Scenario |
|---|---|
| Binary Search + Greedy | "Minimum capacity to ship packages in D days" — binary search the answer, greedy to check feasibility |
| BFS + DP | "Shortest path with state" — BFS over states, DP to avoid revisits |
| Sorting + Two Pointers | "3Sum" — sort first, then two-pointer scan |
| Heap + Greedy | "Task Scheduler" — greedily pick highest-frequency task using a heap |
| HashMap + Sliding Window | "Longest substring without repeating characters" — hashmap tracks last seen position inside the window |
| Trie + Backtracking | "Word Search II" — trie holds dictionary, backtracking explores grid |
| Union-Find + Sorting | "Accounts Merge" — sort, then union connected components |
| Monotonic Stack + DP | "Sum of Subarray Minimums" — monotonic stack finds contribution ranges, DP accumulates |
| Binary Search + Prefix Sum | "Split Array Largest Sum" — binary search the answer, prefix sum checks feasibility |
| DFS + Memoization | Tree DP, graph DP — DFS explores structure, memoization avoids re-exploration |
| Bit Manipulation + DP | Bitmask DP — represent visited set as bitmask, DP over subsets |
| Segment Tree + Coordinate Compression | "Count of Smaller Numbers After Self" — compress values, segment tree for range queries |

---

## The Five Meta-Strategies for Any FAANG Interview Problem

Before diving into specific algorithms, internalize these five meta-strategies:

### 1. Simplify First
- Can you solve a simpler version of the problem?
- What if the array were sorted? What if the tree were a BST? What if the graph were a DAG?
- Solve the simple case, then add back the constraints.

### 2. Think About the Brute Force
- Always start by stating the brute force approach.
- What is its time complexity?
- Where is the redundant work? What is being recomputed?
- The answer to "what is being recomputed" directly tells you which optimization to apply.

### 3. Work Backwards from the Answer
- What does the answer look like?
- What was the last decision made?
- This reveals the recurrence for DP or the choice structure for greedy/backtracking.

### 4. Identify the Constraint Bottleneck
- What constraint makes this problem hard?
- If n ≤ 20, bitmask DP or backtracking is fine.
- If n ≤ 10^5, you need O(n log n) or better.
- If n ≤ 10^9, you **must** use binary search on answer or math.
- The constraint tells you the acceptable complexity, which narrows the algorithm choices.

### 5. Transform the Problem
- Can you restate this problem as another known problem?
- "Find if two strings are rotations" → "Is s2 a substring of s1+s1?"
- "Shortest path in unweighted graph" → BFS
- "Maximum flow" → Can be reduced to min-cut
- Problem transformation is the highest-level skill in algorithmic thinking.

---

## Complexity Quick Reference

| Complexity | Typical n | Common Algorithms |
|---|---|---|
| O(1) | Any | Hash lookup, math formula |
| O(log n) | Up to 10^18 | Binary search |
| O(√n) | Up to 10^12 | Prime check, sqrt decomposition |
| O(n) | Up to 10^7-10^8 | Linear scan, two pointers, sliding window |
| O(n log n) | Up to 10^5-10^6 | Sorting, merge sort patterns, heap operations |
| O(n²) | Up to 3000-5000 | Nested loops, 2D DP |
| O(n³) | Up to 400-500 | Floyd-Warshall, interval DP |
| O(2^n) | Up to 20-25 | Subsets, bitmask DP |
| O(n!) | Up to 10-12 | Permutations, brute force backtracking |
| O(n × 2^n) | Up to 15-20 | TSP bitmask DP |

---

*This index is your compass. Return here whenever you feel lost. Now begin with [01-LEARNING-ROADMAP.md](01-LEARNING-ROADMAP.md).*
