# Learning Roadmap — DSA Mastery Progression

> *"You cannot fight what you do not understand. Learn the foundations deeply, then the advanced patterns become obvious."*

This roadmap defines **exactly** what to study, in what order, and why. Each phase builds on the previous. Do NOT skip ahead — the dependencies are real.

---

## Overview: Three Phases

| Phase | Duration Target | Focus | Files |
|---|---|---|---|
| **Phase 1: Foundations** | Weeks 1-4 | Core data structures, basic patterns, searching, sorting | 02, 03, 04, 05, 06, 07 |
| **Phase 2: Paradigms** | Weeks 5-10 | Recursion, backtracking, DP, greedy, trees, graphs, heaps | 08, 09, 10, 11, 12, 13 |
| **Phase 3: Advanced & Specialized** | Weeks 11-14 | Bit manipulation, math, advanced DS, string algos, intervals, meta-patterns | 14, 15, 16, 17, 18, 19 |

---

## Dependency Graph

```
Arrays & Strings (02) ─────────────────────────────────┐
    │                                                   │
    ├──► Searching (03) ──────────────────────────┐     │
    │                                              │     │
    ├──► Sorting (04) ───────────────────────┐     │     │
    │                                         │     │     │
    ├──► Hashing (05) ──────────────────┐     │     │     │
    │                                    │     │     │     │
    ├──► Linked Lists (06)               │     │     │     │
    │                                    │     │     │     │
    └──► Stacks & Queues (07) ──────┐   │     │     │     │
                                     │   │     │     │     │
                                     ▼   ▼     ▼     ▼     ▼
                              Recursion & Backtracking (08)
                                     │
                          ┌──────────┼──────────┐
                          ▼          ▼          ▼
                      Trees (10)  DP (09)   Greedy (13)
                          │          │          │
                          ▼          │          │
                      Graphs (11)◄───┘          │
                          │                     │
                          ▼                     ▼
                   Heaps & PQ (12) ◄────────────┘
                          │
              ┌───────────┼───────────┬───────────┬───────────┐
              ▼           ▼           ▼           ▼           ▼
        Bit Manip (14) Math (15)  Adv DS (16) Strings (17) Intervals (18)
              │           │           │           │           │
              └───────────┴───────────┴───────────┴───────────┘
                                      │
                                      ▼
                          Design Patterns & Meta (19)
```

---

## Phase 1: Foundations (Weeks 1-4)

> **Goal:** Master the building blocks. Every advanced technique is built on these primitives.

### Week 1: Arrays, Strings & Two Pointers

**Study:** [02-ARRAYS-AND-STRINGS.md](02-ARRAYS-AND-STRINGS.md)

**Topics in order:**
1. **Two Pointers (Opposite Direction)** — Start here. The simplest pattern in DSA. Teaches the concept of narrowing a search space.
2. **Two Pointers (Same Direction)** — Extends the mental model. Introduces the idea of a "fast" and "slow" scanner.
3. **Sliding Window (Fixed Size)** — Natural extension of two pointers. Teaches maintaining a "window" of data.
4. **Sliding Window (Variable Size)** — More complex. Teaches expand/shrink logic.
5. **Prefix Sum** — A completely different idea: precompute cumulative information so range queries become O(1).
6. **Kadane's Algorithm** — Specific application of the "current vs global best" mental model.
7. **Dutch National Flag** — Three-way partitioning. Teaches in-place classification.
8. **Boyer-Moore Voting** — Teaches the "cancellation" intuition.
9. **Matrix Traversal Patterns** — Extends 1D patterns to 2D.

**Why this order:** Two pointers is the simplest "smart" technique. Sliding window is two pointers + a state. Prefix sum is a precomputation technique. Together, they cover 70%+ of array problems.

**Milestone:** You should be able to identify whether a problem needs two pointers, sliding window, or prefix sum within 30 seconds of reading it.

---

### Week 2: Searching & Sorting

**Study:** [03-SEARCHING-TECHNIQUES.md](03-SEARCHING-TECHNIQUES.md) then [04-SORTING-AND-ORDER.md](04-SORTING-AND-ORDER.md)

**Topics in order:**
1. **Binary Search (Classic)** — The most important algorithmic idea in CS. Teaches halving a search space.
2. **Binary Search Variants (Lower Bound, Upper Bound)** — Teaches boundary-finding, which is what most interview binary search problems actually ask.
3. **Binary Search on Rotated Array** — Teaches how to adapt binary search when the standard invariant is broken.
4. **Binary Search on Answer (Parametric Search)** — The most underrated technique. "If I guess the answer is X, can I check it quickly?"
5. **Merge Sort Patterns** — Not just sorting — teaches divide-and-conquer and the "merge step" as a pattern (count inversions, etc.).
6. **Quick Select** — Finding the Kth element without full sorting. Teaches partial sorting.
7. **Counting/Radix/Bucket Sort** — When comparison-based sorting is too slow. Teaches exploiting value ranges.
8. **Cyclic Sort** — The elegance of "every element has a correct position." Perfect for missing/duplicate number problems.
9. **Custom Comparators** — Teaches flexible ordering (largest number, meeting rooms sort).

**Why this order:** Binary search is foundational — it appears everywhere (arrays, trees, answer spaces, DP optimization). Sorting is a preprocessing step for many other techniques. Cyclic sort is a hidden gem that solves a specific class of problems instantly.

**Milestone:** Given a problem, you should be able to determine whether binary search applies (and on WHAT you're binary searching) within 60 seconds.

---

### Week 3: Hashing & Linked Lists

**Study:** [05-HASHING-AND-SETS.md](05-HASHING-AND-SETS.md) then [06-LINKED-LISTS.md](06-LINKED-LISTS.md)

**Topics in order:**
1. **Frequency Counting** — The simplest hash pattern: count occurrences.
2. **Two-Sum Family** — The canonical hashing problem. Extends to 3Sum, 4Sum (combine with sorting/two pointers).
3. **Group Anagrams / Isomorphic Strings** — Hashing as grouping/classification.
4. **Subarray Sum Equals K** — The powerful "prefix sum + hashmap" combination.
5. **Rolling Hash** — Hashing for string matching (connects to Rabin-Karp later).
6. **Fast/Slow Pointer on Linked Lists** — Floyd's cycle detection. Teaches pointer arithmetic.
7. **Linked List Reversal** — The fundamental linked list operation.
8. **Merge Lists** — Combining sorted structures.
9. **LRU Cache** — The most important linked list interview problem. Teaches combining data structures.

**Why this order:** Hashing is the single most versatile tool for reducing time complexity. 80%+ of "optimize from O(n²) to O(n)" solutions use hashing. Linked lists are less frequent in FAANG but LRU Cache alone makes them critical.

**Milestone:** You should automatically think "can I use a hashmap to avoid a nested loop?" for every problem.

---

### Week 4: Stacks & Queues

**Study:** [07-STACKS-AND-QUEUES.md](07-STACKS-AND-QUEUES.md)

**Topics in order:**
1. **Stack Basics & Parentheses Family** — Matching and nesting problems.
2. **Monotonic Stack** — THE most important stack pattern for interviews. "Next greater/smaller element."
3. **Largest Rectangle in Histogram** — The hardest standard monotonic stack problem.
4. **Trapping Rain Water** — Can be solved multiple ways; stack approach teaches contribution-based thinking.
5. **Min Stack / Max Stack** — Augmented stacks. Teaches "carry extra info per element."
6. **Monotonic Queue** — Extension of monotonic stack for sliding windows.
7. **Expression Evaluation** — Stack for operator precedence.

**Why this order:** Parentheses problems build stack intuition. Monotonic stack is the real prize — it appears in disguised form in many hard problems. Monotonic queue extends it to sliding windows.

**Milestone:** When you see "next greater element" or "how far does this element's influence extend," you should immediately think monotonic stack.

---

## Phase 2: Algorithmic Paradigms (Weeks 5-10)

> **Goal:** Master the three great paradigms (recursion/backtracking, DP, greedy) and the two great structures (trees, graphs). This is where FAANG interviews really live.

### Week 5: Recursion & Backtracking

**Study:** [08-RECURSION-AND-BACKTRACKING.md](08-RECURSION-AND-BACKTRACKING.md)

**Topics in order:**
1. **Recursion Mental Model** — The call stack, base case, recursive case. Think of it as "trust the function to handle the smaller problem."
2. **Subsets** — The foundational backtracking pattern: include or exclude each element.
3. **Combinations** — Subsets with a size constraint.
4. **Permutations** — Order matters now. Teaches "used" tracking.
5. **N-Queens** — The canonical constraint satisfaction problem.
6. **Sudoku Solver** — Extends N-Queens with more complex constraints.
7. **Word Search** — Backtracking on a grid. Combines grid traversal with backtracking.
8. **Generate Parentheses** — Constraint-guided generation.
9. **Pruning Strategies** — How to make backtracking fast enough for interviews.

**Why this order:** Subsets → Combinations → Permutations forms a natural progression. Each adds one new concept. N-Queens and Sudoku teach constraint-checking. Pruning is the optimization layer on top.

**Milestone:** Given any "generate all valid X" problem, you should be able to draw the decision tree and identify the branching factor, depth, and pruning conditions.

---

### Weeks 6-8: Dynamic Programming (THE BIG ONE)

**Study:** [09-DYNAMIC-PROGRAMMING.md](09-DYNAMIC-PROGRAMMING.md)

> DP is the single most important topic for FAANG interviews. Spend the most time here.

**Topics in order:**

**Week 6 — DP Foundations:**
1. **DP Mental Model** — Overlapping subproblems + optimal substructure. The "what if I already solved all smaller versions?" thought experiment.
2. **Top-Down vs Bottom-Up** — Memoization vs tabulation. Two implementations of the same idea.
3. **State Definition Methodology** — The hardest part of DP. "What information do I need to make a decision at step i?"
4. **1D DP (Linear)** — Fibonacci, Climbing Stairs, House Robber, Decode Ways. One decision chain.
5. **2D DP** — Unique Paths, Edit Distance. Two dimensions of state.

**Week 7 — DP Pattern Families:**
6. **Knapsack Family** — 0/1 Knapsack, Unbounded, Subset Sum, Partition Equal Subset. The "include or exclude" framework.
7. **LIS / LCS / LPS** — Subsequence patterns. The most tested DP family.
8. **String DP** — Wildcard Matching, Regex Matching, Distinct Subsequences. Two-string comparison.
9. **State Machine DP** — Buy and Sell Stock series. States with transitions.

**Week 8 — Advanced DP:**
10. **Interval DP** — Matrix Chain Multiplication, Burst Balloons. "Solve subproblems on subranges."
11. **Bitmask DP** — Travelling Salesman, Assignment Problem. Represent visited set as bits.
12. **Digit DP** — Count numbers with a property. Digit-by-digit construction.
13. **Tree DP** — House Robber III, Camera placement. DFS + memoization on tree structure.
14. **DP on Graphs** — Shortest paths on DAGs, counting paths.
15. **Game Theory DP** — Stone games, optimal play.
16. **DP Optimizations** — Space optimization, Monotonic Queue optimization, Convex Hull Trick, Knuth's, D&C optimization.

**Why this order:** Foundations first (mental model → state definition → 1D → 2D). Then pattern families (knapsack teaches include/exclude, LIS/LCS teaches subsequences, strings teach two-string comparison). Then advanced (interval, bitmask, digit — each is a specialized state space).

**Milestone:** Given any DP problem, you should be able to (1) define the state, (2) write the recurrence in English, (3) identify the base cases, (4) determine the iteration order, and (5) identify potential space optimizations.

---

### Week 9: Trees & Graphs

**Study:** [10-TREES.md](10-TREES.md) then [11-GRAPHS.md](11-GRAPHS.md)

**Topics in order:**

**Trees (first half of week):**
1. **Tree Traversals** — Inorder, preorder, postorder (recursive & iterative). Level-order (BFS).
2. **BST Operations** — Search, insert, delete, validate. The sorted-order property.
3. **LCA (Lowest Common Ancestor)** — Binary tree version, BST version, with parent pointers.
4. **Diameter, Height, Balanced Check** — Tree property computations.
5. **Path Sum Family** — Root-to-leaf, any-to-any path sums.
6. **Serialize/Deserialize** — Converting tree to/from string.
7. **Construct from Traversals** — Building tree from inorder+preorder, etc.
8. **Morris Traversal** — O(1) space traversal.

**Graphs (second half of week):**
9. **Graph Representation** — Adjacency list vs matrix. When to use which.
10. **BFS** — Level-by-level exploration. Shortest path in unweighted graphs. Multi-source BFS.
11. **DFS** — Deep exploration. Connected components. Cycle detection.
12. **Topological Sort** — Kahn's (BFS) and DFS-based. Ordering with dependencies.
13. **Dijkstra** — Shortest path with non-negative weights.
14. **Bellman-Ford** — Handles negative weights. Detect negative cycles.
15. **Union-Find** — Dynamic connectivity. Connected components.
16. **MST (Kruskal's, Prim's)** — Minimum cost to connect all nodes.
17. **Bipartite, SCC, Bridges** — Advanced graph properties.

**Why this order:** Trees are simpler graphs — one direction, no cycles. Master them first. Then graphs add cycles, multiple paths, and weights. Each graph algorithm provides a different "lens" for graph problems.

**Milestone:** Given a graph problem, you should identify in 30 seconds (1) what the nodes and edges represent, (2) whether it's directed/undirected, weighted/unweighted, (3) which algorithm applies.

---

### Week 10: Heaps & Greedy

**Study:** [12-HEAPS-AND-PRIORITY-QUEUES.md](12-HEAPS-AND-PRIORITY-QUEUES.md) then [13-GREEDY-ALGORITHMS.md](13-GREEDY-ALGORITHMS.md)

**Topics in order:**
1. **Heap Fundamentals** — Min-heap, max-heap. When to use each.
2. **Top-K Elements** — Kth largest/smallest using a heap of size K.
3. **Merge K Sorted Lists** — Multi-way merge using a min-heap.
4. **Two-Heap Pattern (Median Stream)** — Max-heap for lower half, min-heap for upper half.
5. **Task Scheduler** — Greedy + heap combination.
6. **Greedy Choice Property** — When a locally optimal choice leads to a globally optimal solution.
7. **Activity Selection / Interval Scheduling** — The canonical greedy problem.
8. **Jump Game Family** — Greedy forward sweep.
9. **Exchange Argument** — How to prove a greedy solution is correct.
10. **Greedy vs DP Decision Framework** — When greedy works and when it doesn't.

**Why this order:** Heaps provide the data structure that makes many greedy algorithms efficient. Understanding heaps first makes greedy + heap combinations natural.

**Milestone:** You should be able to (1) recognize "Top K" patterns instantly, (2) set up a two-heap for median problems, and (3) distinguish greedy-solvable problems from those requiring DP.

---

## Phase 3: Advanced & Specialized (Weeks 11-14)

> **Goal:** Fill in specialized techniques that appear in hard problems and distinguish you from other candidates.

### Week 11: Bit Manipulation & Math

**Study:** [14-BIT-MANIPULATION.md](14-BIT-MANIPULATION.md) then [15-MATH-AND-NUMBER-THEORY.md](15-MATH-AND-NUMBER-THEORY.md)

**Topics in order:**
1. **Bitwise Operations** — AND, OR, XOR, NOT, shifts. The building blocks.
2. **XOR Tricks** — Find missing number, find the single number. The "cancellation" property.
3. **Brian Kernighan's Algorithm** — Count set bits efficiently.
4. **Bitmask for Subsets** — Enumerate all subsets using bit patterns.
5. **GCD / LCM** — Euclidean algorithm. Appears in fraction, ratio, and periodicity problems.
6. **Sieve of Eratosthenes** — Generate all primes. Preprocessing for prime-related problems.
7. **Modular Arithmetic** — Mod properties, fast exponentiation, mod inverse. Critical for combinatorics.
8. **Combinatorics & Catalan Numbers** — nCr, Pascal's triangle, Catalan formula.
9. **Reservoir Sampling & Fisher-Yates** — Randomized algorithms for streams and shuffling.

**Why this order:** Bit manipulation is a quick win — small topic, high impact on specific problem types. Math/number theory fills in gaps that appear in medium-hard problems.

---

### Week 12: Advanced Data Structures

**Study:** [16-ADVANCED-DATA-STRUCTURES.md](16-ADVANCED-DATA-STRUCTURES.md)

**Topics in order:**
1. **Trie (Prefix Tree)** — Autocomplete, word search, prefix matching.
2. **XOR Trie** — Maximum XOR pair. Teaches trie on bits instead of characters.
3. **Disjoint Set Union** — Union by rank, path compression. Dynamic connectivity.
4. **Segment Tree** — Range queries, point updates, range updates with lazy propagation.
5. **Fenwick Tree (BIT)** — Simpler range sum queries and point updates.
6. **Sparse Table** — Static range minimum queries in O(1) after O(n log n) preprocessing.

**Why this order:** Trie is the most commonly asked advanced data structure. DSU appears in graph problems. Segment Tree and Fenwick Tree cover range query problems.

---

### Week 13: String Algorithms & Intervals

**Study:** [17-STRING-ALGORITHMS.md](17-STRING-ALGORITHMS.md) then [18-INTERVAL-AND-SWEEP-LINE.md](18-INTERVAL-AND-SWEEP-LINE.md)

**Topics in order:**
1. **KMP Algorithm** — Pattern matching with the failure function.
2. **Rabin-Karp** — Pattern matching with rolling hash.
3. **Z-Algorithm** — Pattern matching via Z-array.
4. **Manacher's Algorithm** — All palindromic substrings in linear time.
5. **Merge Intervals** — The foundational interval problem.
6. **Sweep Line** — Event-based processing for interval problems.
7. **Meeting Rooms Family** — Interval scheduling and counting overlaps.

**Why this order:** String matching algorithms (KMP, Rabin-Karp, Z) form a family — study them together. Interval problems are a well-defined category that combines sorting + greedy + sweep.

---

### Week 14: Design Patterns & Meta-Algorithms

**Study:** [19-DESIGN-PATTERNS-AND-META.md](19-DESIGN-PATTERNS-AND-META.md)

**Topics in order:**
1. **Iterator Pattern** — Flatten Nested List, BST Iterator.
2. **State Machine** — Regular expression matching, string parsing.
3. **Simulation** — Robot movement, spiral matrix.
4. **Minimax** — Game theory, alpha-beta pruning.
5. **Meet in the Middle** — Split problem in half, combine.
6. **Randomized Algorithms** — Reservoir Sampling, Quick Select, Skip List.
7. **Amortized Analysis** — Understanding amortized O(1) operations.

**Why this order:** These are meta-patterns that don't fit neatly into one category. They complete your toolkit for the most unusual FAANG problems.

---

## Post-Roadmap: LeetCode Practice Strategy

After completing all 14 weeks of study, apply your knowledge with this practice strategy:

### Step 1: Pattern Practice (2-3 weeks)
- Pick a pattern from the knowledge base (e.g., Sliding Window)
- Solve 5-8 problems tagged with that pattern
- After each problem, verify your pattern recognition was correct

### Step 2: Mixed Practice (2-3 weeks)
- Solve random problems (use LeetCode random or contests)
- For each problem, FIRST identify the pattern using the Master Index flowchart
- THEN solve it
- Track your accuracy: did you identify the correct pattern?

### Step 3: Timed Practice (1-2 weeks)
- Simulate interview conditions: 45 minutes per problem
- If you can't identify the pattern in 5 minutes, that's a knowledge gap — go back to the relevant file
- If you can identify the pattern but can't solve it, that's a practice gap — drill more problems of that type

### Step 4: Mock Interviews
- Do at least 10 mock interviews before a real interview
- Focus on communication and structured thinking, not just solving

---

## How to Study Each File

For each category file in this knowledge base:

1. **First read:** Read the entire file start to finish. Build the overview.
2. **Second read:** For each algorithm, close your eyes and try to recall the "Core Idea" from memory. If you can't, re-read that section.
3. **Third read:** Focus on "When should I use this?" and "When should I NOT use this?" — these are the pattern recognition triggers.
4. **Practice:** Solve 3-5 problems for each algorithm. After solving (or failing to solve), re-read the "Interview Insights" section.
5. **Review:** Every weekend, review the patterns you studied that week. Spaced repetition is key.

---

## Progress Tracking Checklist

Use this checklist to track your progress:

### Phase 1: Foundations
- [ ] Arrays & Strings: Two Pointers, Sliding Window, Prefix Sum mastered
- [ ] Binary Search: Classic, on answer, rotated mastered
- [ ] Sorting: Merge sort patterns, Quick Select, Cyclic Sort mastered
- [ ] Hashing: Two-Sum family, Subaray Sum + HashMap mastered
- [ ] Linked Lists: Fast/Slow, Reversal, LRU Cache mastered
- [ ] Stacks: Monotonic Stack, Histogram, Rain Water mastered

### Phase 2: Paradigms
- [ ] Recursion: Can draw decision trees for any backtracking problem
- [ ] DP Foundations: Can define state and recurrence for 1D/2D problems
- [ ] DP Patterns: Knapsack, LIS/LCS, String DP mastered
- [ ] DP Advanced: Interval, Bitmask, Tree DP understood
- [ ] Trees: All traversals, BST, LCA, construction mastered
- [ ] Graphs: BFS, DFS, Topo sort, Dijkstra, Union-Find mastered
- [ ] Heaps: Top-K, Two-Heap, Merge-K mastered
- [ ] Greedy: Can apply exchange argument, distinguish from DP

### Phase 3: Specialized
- [ ] Bit Manipulation: XOR tricks, bitmask subsets mastered
- [ ] Math: GCD, Sieve, modular arithmetic understood
- [ ] Trie: Prefix matching, XOR trie mastered
- [ ] Segment Tree / Fenwick Tree: Range query patterns understood
- [ ] String Algorithms: KMP / Z-Algorithm understood
- [ ] Intervals: Merge, Sweep Line mastered
- [ ] Meta-patterns: Meet in the Middle, State Machine understood

---

*Now begin your study with [02-ARRAYS-AND-STRINGS.md](02-ARRAYS-AND-STRINGS.md). Good luck — and remember, pattern recognition is built through understanding, not repetition.*
