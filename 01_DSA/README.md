# 01_DSA — Data Structures & Algorithms

A complete FAANG-level DSA knowledge base focused on **pattern recognition** — understanding why an algorithm works, when to apply it, and how to identify it in an interview.

---

## How to Use

1. Start with [Algorithms/00-MASTER-INDEX.md](Algorithms/00-MASTER-INDEX.md) — the pattern decision flowchart maps any problem to an approach in seconds
2. Follow [Algorithms/01-LEARNING-ROADMAP.md](Algorithms/01-LEARNING-ROADMAP.md) for the recommended study sequence
3. Study each algorithm file: intuition → core idea → when to use → practice problems
4. Use the **Pattern Signal** column in each practice table to train pattern recognition for interviews

---

## Algorithms — Pattern Reference

Each file covers: visual explanation · when to use / when NOT to use · code (Java + JS) · dry run · complexity · traps · LeetCode practice table with pattern signals.

| # | Topic | Patterns Covered |
|---|-------|-----------------|
| [02](Algorithms/02-ARRAYS-AND-STRINGS.md) | Arrays & Strings | Two Pointers, Sliding Window (Fixed/Variable), Prefix Sum, Kadane's, Dutch National Flag, Boyer-Moore, Matrix Traversal |
| [03](Algorithms/03-SEARCHING-TECHNIQUES.md) | Searching Techniques | Classic Binary Search, Lower/Upper Bound, Binary Search on Answer, Rotated Array, Peak Element, 2D Matrix Search |
| [04](Algorithms/04-SORTING-AND-ORDER.md) | Sorting & Order Statistics | Merge Sort, Quick Select, Counting/Radix/Bucket Sort, Cyclic Sort, Custom Comparators |
| [05](Algorithms/05-HASHING-AND-SETS.md) | Hashing & Sets | Frequency Counting, Two-Sum family, Group Anagrams, Subarray Sum + HashMap, Rolling Hash |
| [06](Algorithms/06-LINKED-LISTS.md) | Linked Lists | Fast/Slow Pointers, Reversal, Merge, Cycle Detection, LRU Cache, Deep Clone |
| [07](Algorithms/07-STACKS-AND-QUEUES.md) | Stacks & Queues | Monotonic Stack, Monotonic Queue, Histogram, Rain Water, Parentheses, Min/Max Stack |
| [08](Algorithms/08-RECURSION-AND-BACKTRACKING.md) | Recursion & Backtracking | Subsets, Combinations, Permutations, N-Queens, Sudoku, Word Search, Pruning |
| [09](Algorithms/09-DYNAMIC-PROGRAMMING.md) | Dynamic Programming | 1D/2D DP, Knapsack, LIS/LCS, Interval DP, Bitmask DP, State Machine DP, Digit DP |
| [10](Algorithms/10-TREES.md) | Trees | Traversals, BST, LCA, Diameter, Serialize/Deserialize, Morris, Path Sum, Construction |
| [11](Algorithms/11-GRAPHS.md) | Graphs | BFS, DFS, Topological Sort, Dijkstra, Bellman-Ford, Floyd-Warshall, Union-Find, MST, Bipartite |
| [12](Algorithms/12-HEAPS-AND-PRIORITY-QUEUES.md) | Heaps & Priority Queues | Top-K, Merge-K, Two-Heap, Median Stream, Task Scheduler |
| [13](Algorithms/13-GREEDY-ALGORITHMS.md) | Greedy Algorithms | Exchange Argument, Activity Selection, Jump Game, Gas Station, Candy, Huffman |
| [14](Algorithms/14-BIT-MANIPULATION.md) | Bit Manipulation | XOR Tricks, Brian Kernighan, Single Number, Bitmask Subsets, Power of Two |
| [15](Algorithms/15-MATH-AND-NUMBER-THEORY.md) | Math & Number Theory | GCD/LCM, Sieve of Eratosthenes, Modular Arithmetic, Combinatorics, Reservoir Sampling |
| [16](Algorithms/16-ADVANCED-DATA-STRUCTURES.md) | Advanced Data Structures | Trie, Segment Tree, Fenwick Tree (BIT), Sparse Table, Disjoint Set Union |
| [17](Algorithms/17-STRING-ALGORITHMS.md) | String Algorithms | KMP, Rabin-Karp, Z-Algorithm, Manacher's, Suffix Arrays |
| [18](Algorithms/18-INTERVAL-AND-SWEEP-LINE.md) | Interval & Sweep Line | Merge/Insert Intervals, Meeting Rooms, Sweep Line, Range Module |
| [19](Algorithms/19-DESIGN-PATTERNS-AND-META.md) | Design Patterns & Meta | Iterator, State Machine, Simulation, Minimax, Meet in the Middle, Randomized |

---

## AlgoExpert Problems

Organized by difficulty with Java solutions.

| Difficulty | Folder |
|------------|--------|
| Easy | [AlgoExpert/code/1. Easy/](AlgoExpert/code/1.%20Easy/) |
| Medium | [AlgoExpert/code/2. Medium/](AlgoExpert/code/2.%20Medium/) |
| Hard | [AlgoExpert/code/3. Hard/](AlgoExpert/code/3.%20Hard/) |
| Very Hard | [AlgoExpert/code/4. Very%20Hard/](AlgoExpert/code/4.%20Very%20Hard/) |
| Extremely Hard | [AlgoExpert/code/5. Extremely Hard/](AlgoExpert/code/5.%20Extremely%20Hard/) |

Full problem list with LeetCode mappings: [AlgoExpert/AlgoExpert_FrontendExpert_Questions.md](AlgoExpert/AlgoExpert_FrontendExpert_Questions.md)

---

## Quick Pattern Lookup

| Interview Signal | Pattern | File |
|-----------------|---------|------|
| Sorted array + find target | Binary Search | [03](Algorithms/03-SEARCHING-TECHNIQUES.md) |
| "Minimize the maximum" / "maximize the minimum" | Binary Search on Answer | [03](Algorithms/03-SEARCHING-TECHNIQUES.md) |
| Contiguous subarray with property | Sliding Window | [02](Algorithms/02-ARRAYS-AND-STRINGS.md) |
| Exact subarray sum = K | Prefix Sum + HashMap | [02](Algorithms/02-ARRAYS-AND-STRINGS.md) |
| Pair/triplet summing to target | Two Pointers or HashMap | [02](Algorithms/02-ARRAYS-AND-STRINGS.md) |
| Next greater / smaller element | Monotonic Stack | [07](Algorithms/07-STACKS-AND-QUEUES.md) |
| Shortest path (unweighted) | BFS | [11](Algorithms/11-GRAPHS.md) |
| Shortest path (weighted) | Dijkstra | [11](Algorithms/11-GRAPHS.md) |
| Dependencies / ordering | Topological Sort | [11](Algorithms/11-GRAPHS.md) |
| "Top K" / "Kth largest" | Heap or Quick Select | [12](Algorithms/12-HEAPS-AND-PRIORITY-QUEUES.md) |
| Count ways / min-max over substructure | Dynamic Programming | [09](Algorithms/09-DYNAMIC-PROGRAMMING.md) |
| Generate all valid configurations | Backtracking | [08](Algorithms/08-RECURSION-AND-BACKTRACKING.md) |
| XOR / bit tricks | Bit Manipulation | [14](Algorithms/14-BIT-MANIPULATION.md) |
| Prefix / autocomplete / word dictionary | Trie | [16](Algorithms/16-ADVANCED-DATA-STRUCTURES.md) |
| Overlapping intervals | Interval / Sweep Line | [18](Algorithms/18-INTERVAL-AND-SWEEP-LINE.md) |
