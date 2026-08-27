# Design Patterns and Meta-Strategies — Google Interview Thinking Framework

> **13 patterns covered:** Universal Problem-Solving Framework · Design Patterns Overview · Iterator Pattern · State Machine · Simulation · Minimax / Game Theory · Meet in the Middle · Randomized Algorithms · Amortized Analysis · Monotonic Patterns · Reverse Thinking · Add / Remove Constraint · Design Problems

> Read this file to internalize HOW to think, not just what to code.
> Goal: read fast, get the frameworks into your head, apply them immediately.

---

## Table of Contents

1. [Universal Problem-Solving Framework](#1-universal-problem-solving-framework)
2. [Constraint → Complexity Table](#2-constraint--complexity-table)
3. [Pattern Recognition Flowchart](#3-pattern-recognition-flowchart)
4. [Design Patterns and Meta-Patterns](#4-design-patterns-and-meta-patterns)
   - [Iterator Pattern](#iterator-pattern)
   - [State Machine](#state-machine)
   - [Simulation](#simulation)
   - [Minimax / Game Theory](#minimax--game-theory)
   - [Meet in the Middle](#meet-in-the-middle)
   - [Randomized Algorithms](#randomized-algorithms)
   - [Amortized Analysis](#amortized-analysis)
   - [Monotonic Patterns](#monotonic-patterns)
   - [Reverse Thinking](#reverse-thinking)
   - [Add / Remove Constraint](#add--remove-constraint)
5. [Common Interview Mistakes](#5-common-interview-mistakes)

---

## 1. Universal Problem-Solving Framework

Apply this 13-step sequence to EVERY problem. Do not skip steps under pressure — that is exactly when skipping them hurts you.

```
1.  Understand the problem
      Restate it in your own words. What goes in? What comes out?

2.  Identify input structure
      Array? Graph? String? Tree? Sorted? Duplicates? Negative values?

3.  Look at constraints
      What is n? This tells you your TARGET COMPLEXITY (see Section 2).

4.  Think brute force
      Always state the naive solution first. It grounds the conversation.

5.  Find repeated work / useful property
      Where is brute force doing redundant computation?
      Is there sorted order, monotonicity, or a recurrence to exploit?

6.  Identify candidate pattern
      Based on structure + constraint, which pattern fits? (See Section 3.)

7.  Define state / variables
      What exactly do your variables represent? Say it out loud before coding.

8.  Derive transitions
      How does state change as you process each element?

9.  Dry run on small example
      Trace through by hand before writing a single line of code.

10. Analyze complexity
      State time AND space complexity. Does it fit the constraint budget?

11. Check edge cases
      Empty input. Single element. All identical. Maximum n. Negative values.

12. Implement
      Write clean code. Name variables meaningfully. Narrate as you type.

13. Optimize if needed
      Only AFTER a correct solution exists. Ask interviewer before optimizing.
```

### How to Handle an Unfamiliar Problem

1. Do NOT go silent. Narrate what you observe.
2. Apply steps 1-3 (understand, structure, constraints). This alone narrows the field.
3. Solve a stripped-down version first — remove one constraint, solve that, then add it back.
4. Ask: "What if I solved the opposite problem?" (Reverse Thinking, Section 4.)
5. The thing brute force does *repeatedly* is your optimization target.

---

## 2. Constraint → Complexity Table

**Read this first on EVERY problem. The constraint tells you which algorithms are allowed.**

```
╔══════════════════╦═══════════════╦═══════════════════════════════════════════╗
║  n (input size)  ║  Max Allowed  ║  What to reach for                        ║
╠══════════════════╬═══════════════╬═══════════════════════════════════════════╣
║  n ≤ 20          ║  O(2^n)       ║  Backtracking, bitmask DP, subset enum    ║
║  n ≤ 40          ║  O(2^(n/2))   ║  Meet in the Middle                       ║
║  n ≤ 500         ║  O(n³)        ║  Interval DP, Floyd-Warshall              ║
║  n ≤ 1,000       ║  O(n²)        ║  Nested loops OK, simple DP               ║
║  n ≤ 100,000     ║  O(n log n)   ║  Sort, heap, binary search, BIT           ║
║  n ≤ 1,000,000   ║  O(n)         ║  Single pass, hashing, two pointers       ║
║  n ≤ 10^9        ║  O(log n)     ║  Binary search on answer, math            ║
╚══════════════════╩═══════════════╩═══════════════════════════════════════════╝
```

### How to use this in an interview

1. Read constraint on n.
2. Immediately say: "With n up to X, I need an O(Y) solution."
3. Only consider patterns that can achieve O(Y).

### Examples for each row

| Constraint | Example Problem | Algorithm |
|---|---|---|
| n ≤ 20 | All subsets / permutations | Backtracking or bitmask DP |
| n ≤ 40 | Subset sum, n=38 | Split halves, Meet in the Middle |
| n ≤ 500 | Burst Balloons, Matrix Chain | Interval DP |
| n ≤ 1,000 | Longest common subsequence | O(n²) DP |
| n ≤ 100,000 | Find kth largest in stream | Min-heap O(n log n) |
| n ≤ 1,000,000 | Two Sum, longest substring | HashMap or two pointers |
| n ≤ 10^9 | Find sqrt(n) | Binary search on answer |

---

## 3. Pattern Recognition Flowchart

Start here when you cannot immediately identify a pattern.

```
WHAT IS THE INPUT SHAPE?
│
├── ARRAY / STRING
│     ├── Sorted?            → Binary Search, Two Pointers
│     ├── Subarray / Window  → Sliding Window, Prefix Sum + HashMap
│     ├── Top-K / Kth        → Heap or Quick Select
│     ├── Permutations?      → Backtracking
│     └── Subsets?           → Backtracking or Bitmask DP (n ≤ 20)
│
├── LINKED LIST
│     ├── Cycle?             → Floyd's fast/slow pointers
│     ├── Middle / Kth?      → Two pointers (fast/slow)
│     └── Reverse / Merge?   → Pointer manipulation
│
├── TREE
│     ├── Any path / value   → DFS (recursion)
│     ├── Level by level     → BFS (queue)
│     ├── BST property       → Inorder = sorted, binary search
│     └── Iterator needed    → Stack-based lazy traversal
│
├── GRAPH
│     ├── Shortest path, unweighted    → BFS
│     ├── Shortest path, non-neg wts   → Dijkstra
│     ├── Shortest path, neg weights   → Bellman-Ford
│     ├── All-pairs shortest paths     → Floyd-Warshall
│     ├── Connected components         → DFS / BFS / Union-Find
│     └── Ordering with dependencies   → Topological Sort
│
└── PROBLEM TYPE CLUES
      ├── "Optimal", repeated subproblems → DP
      ├── "Greedy choice works"           → Greedy + proof
      ├── "Two players, optimal play"     → Minimax or Game DP
      ├── "Validate / parse format"       → State Machine
      ├── "Simulate step by step"         → Simulation
      ├── "Iterator / next()"             → Iterator Pattern
      ├── "Stuck on forward pass"         → Reverse Thinking
      └── "Problem too hard as-is"        → Add/Remove Constraint
```

### Quick keyword lookup

| If you see this... | Try this pattern |
|---|---|
| Sorted array | Binary search, two pointers |
| "Top K" / "Kth largest" | Min-heap or Quick Select |
| Shortest path, unweighted | BFS |
| Shortest path, weighted | Dijkstra |
| Permutations / combinations / subsets | Backtracking |
| Overlapping subproblems | Dynamic Programming |
| Interval merging / scheduling | Sort by start, sweep line |
| Prefix matching / autocomplete | Trie |
| n ≤ 20, subsets | Bitmask DP |
| n ≤ 40, subset sum | Meet in the Middle |
| Subarray sum / running sum | Prefix sum + HashMap |
| Parentheses / matching brackets | Stack |
| Stream / online algorithm | Heap, reservoir sampling |
| "Validate", "parse", "legal format" | State Machine |
| "Simulate", "apply rules", "N steps" | Simulation |
| "Surrounded", "not reachable" | BFS/DFS + Reverse Thinking |

---

## 4. Design Patterns and Meta-Patterns

---

## Iterator Pattern

### What is it?
An Iterator gives sequential access to elements of a complex data structure without exposing its internals. In interviews, you implement `next()` and `hasNext()` using a stack for lazy (on-demand) traversal.

### When to use?
- Problem says "implement an iterator" for a BST, nested list, or multi-source structure.
- You need to flatten a complex structure one element at a time.
- Keywords: `next()`, `hasNext()`, `peek()`, "lazy access", "flatten on demand".
- The structure is too large to fully traverse upfront.

### Simple Example
**Binary Search Tree Iterator:** You need `next()` to return the next smallest value in O(1) amortized.

Instead of doing a full inorder traversal upfront and storing it (uses O(n) space all at once), use a stack. Push all left-spine nodes at start. When `next()` is called, pop the top, then push its right child's entire left spine. Each node is pushed and popped exactly once.

### Experience Tip
**Experience Tip:** The key insight is lazy evaluation — only compute the next element when asked. This is almost always implemented with a stack. When you see "iterator", think "stack + controlled traversal".

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---|---|---|---|
| 173 | Binary Search Tree Iterator | Medium | Stack, push left-spine, O(1) amortized | https://leetcode.com/problems/binary-search-tree-iterator/ |
| 341 | Flatten Nested List Iterator | Medium | Stack, reverse push, flatten top lazily | https://leetcode.com/problems/flatten-nested-list-iterator/ |
| 284 | Peeking Iterator | Medium | Cache the next value, `peek()` returns cache | https://leetcode.com/problems/peeking-iterator/ |
| 155 | Min Stack | Easy | Two stacks — one for data, one for minimums | https://leetcode.com/problems/min-stack/ |

### One-Minute Revision
```
PATTERN:   Iterator (Stack-based Lazy Traversal)
USE WHEN:  "Implement next()/hasNext()" for BST, nested list, multiple sources
KEY STEP:  Use a stack. Only advance the traversal when next() is called.
           Each element pushed/popped once → O(1) amortized.
```

---

## State Machine

### What is it?
A State Machine models a problem as a finite set of states and explicit rules for transitioning between them. At each step, your current state plus the current input determines the next state.

### When to use?
- String parsing with complex multi-character rules (e.g., "Valid Number").
- Problem has "modes" or "phases" — the meaning of an input depends on context.
- Stock buy/sell problems (holding, not holding, cooldown) — this is an implicit state machine.
- Keywords: "validate format", "parse", "legal sequence", "modes".

### Simple Example
**Valid Number:** Is a string like `"-3.5e2"` a valid number? You have states like `START`, `SIGN`, `DIGIT`, `DOT`, `EXPONENT`, `INVALID`. Each character transitions you between states. If you end in a valid state, the number is valid.

Draw the state diagram on paper first — the code becomes mechanical once the diagram is clear.

### Experience Tip
**Experience Tip:** Always draw the state diagram before writing code. Label each arrow with what input causes the transition. The diagram IS the solution — code just implements it.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---|---|---|---|
| 65 | Valid Number | Hard | Draw the state diagram first; ~6 states | https://leetcode.com/problems/valid-number/ |
| 926 | Flip String to Monotone Increasing | Medium | Two states: seen 0s, seen 1s | https://leetcode.com/problems/flip-string-to-monotone-increasing/ |
| 309 | Best Time to Buy and Sell Stock with Cooldown | Medium | States: held, sold, rest — implicit state machine DP | https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/ |

### One-Minute Revision
```
PATTERN:   State Machine
USE WHEN:  "Validate format", "parse string", "modes", "phases"
KEY STEP:  1. Define states  2. Define transitions (state + input → next state)
           3. Define accepting states  4. Process input left to right
```

---

## Simulation

### What is it?
When there is no clever mathematical shortcut, do exactly what the problem says. Follow the rules literally, step by step. Simulation tests implementation precision, not algorithmic cleverness.

### When to use?
- Problem says "simulate", "apply rules", "after N steps".
- Rules are clear and the grid/board is small enough to iterate.
- You cannot find a pattern or formula to skip steps.
- Keywords: "spiral", "robot", "game board", "next state", "step".

### Simple Example
**Spiral Matrix:** Traverse a matrix in spiral order. No clever formula — just maintain four boundary pointers (top, bottom, left, right). Traverse right → down → left → up. Shrink boundaries after each direction. Stop when boundaries cross.

The trap is off-by-one errors in boundary conditions. Slow down and be precise.

### Experience Tip
**Experience Tip:** For simulation, slow is fast. Write careful, explicit boundary handling. The most common bugs are off-by-one at edges. Consider: can you detect a cycle to avoid simulating all N steps?

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---|---|---|---|
| 54 | Spiral Matrix | Medium | 4 boundary pointers, shrink after each pass | https://leetcode.com/problems/spiral-matrix/ |
| 289 | Game of Life | Medium | Encode intermediate states in-place to avoid copy | https://leetcode.com/problems/game-of-life/ |
| 1041 | Robot Bounded in Circle | Medium | After 1 cycle: if at origin OR direction changed → loops | https://leetcode.com/problems/robot-bounded-in-circle/ |
| 735 | Asteroid Collision | Medium | Stack-based simulation; handle collision cases carefully | https://leetcode.com/problems/asteroid-collision/ |

### One-Minute Revision
```
PATTERN:   Simulation
USE WHEN:  Follow rules literally; no formula to skip steps
KEY STEP:  Write slow, careful code. Handle boundaries explicitly.
           Ask: can I detect cycles to skip N steps?
```

---

## Minimax / Game Theory

### What is it?
Two players alternate turns. One maximizes the score, the other minimizes. At each game state, the current player picks the move that is best for them, assuming the opponent also plays perfectly.

### When to use?
- Two players, turn-based, both playing optimally.
- Keywords: "predict the winner", "stone game", "optimal play", "both players play best".
- When the game state space is small enough for recursion + memoization.

### Simple Example
**Stone Game:** Two piles of stones at each end of an array. Players alternate picking from either end. The player with more stones wins. Who wins?

Define `dp[i][j]` = the maximum score difference (your score minus opponent's score) the current player can achieve on the subarray `[i..j]`. The transition: pick left or pick right, whichever gives better score difference. `dp[i][i] = stones[i]`.

### Experience Tip
**Experience Tip:** Before building a game tree, check if there is a mathematical pattern. Nim Game (take 1-3 stones): you lose if `n % 4 == 0`. Always try small cases to find a formula before coding a full minimax tree.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---|---|---|---|
| 877 | Stone Game | Medium | Interval DP or notice first player always wins | https://leetcode.com/problems/stone-game/ |
| 486 | Predict the Winner | Medium | Interval DP: dp[i][j] = score difference for current player | https://leetcode.com/problems/predict-the-winner/ |
| 292 | Nim Game | Easy | Pure math: lose if n % 4 == 0 | https://leetcode.com/problems/nim-game/ |

### One-Minute Revision
```
PATTERN:   Minimax / Game Theory DP
USE WHEN:  Two players, turn-based, optimal play
KEY STEP:  dp[i][j] = max score difference current player achieves on [i..j]
           Try small cases for math shortcut before building a full game tree
```

---

## Meet in the Middle

### What is it?
Split the input in half. Solve each half independently (enumerate all possibilities). Combine the two halves. This converts O(2^n) to O(2^(n/2) * n) — a massive speedup.

### When to use?
- Subset sum or subset enumeration with n between 30 and 40.
- Pure backtracking O(2^n) is too slow (n > 25) but O(n^2) DP is also too slow.
- Constraint signal: n ≤ 40 is the canonical trigger.

### Simple Example
**Subset sum, n = 38, target T:** O(2^38) is way too slow. Split into two halves of 19. Generate all 2^19 ≈ 524k subset sums for each half. Sort one half. For each sum in the first half, binary search in the sorted second half for `T - sum`. Total: ~10 million operations — fits easily.

### Experience Tip
**Experience Tip:** When you see n ≤ 40 and the problem involves choosing/not choosing elements, your brain should immediately fire "Meet in the Middle". It is one of the few situations where this exact technique applies.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---|---|---|---|
| 1755 | Closest Subsequence Sum | Hard | Classic Meet in the Middle on subsequence sums | https://leetcode.com/problems/closest-subsequence-sum/ |
| 2035 | Partition Array Into Two Arrays to Minimize Difference | Hard | Split halves, sort, binary search for complement | https://leetcode.com/problems/partition-array-into-two-arrays-to-minimize-sum-difference/ |

### One-Minute Revision
```
PATTERN:   Meet in the Middle
USE WHEN:  n ≤ 40, subset enumeration, O(2^n) too slow
KEY STEP:  Split in half → enumerate both halves → sort one → binary search
           Complexity: O(2^(n/2) * n) instead of O(2^n)
```

---

## Randomized Algorithms

### What is it?
Use randomness to get good average-case performance or to handle adversarial inputs. The two main types: Las Vegas (always correct, variable time) and Monte Carlo (always fast, occasionally wrong).

### When to use?
- "Kth largest element" in O(n) average → Quick Select with random pivot.
- "Uniform random sample from unknown-length stream" → Reservoir Sampling.
- "Random shuffle" → Fisher-Yates.
- "Pick random index weighted by probabilities" → Prefix sum + binary search on random float.

### Simple Example
**Random Pick with Weight:** Array `weights = [1, 3, 2]`. Pick index 0 with probability 1/6, index 1 with probability 3/6, index 2 with probability 2/6.

Build prefix sums `[1, 4, 6]`. Generate a random float in `[0, 6)`. Binary search to find which bucket it falls in. That is your index.

### Experience Tip
**Experience Tip:** "Random pick by weight" almost always reduces to prefix sum + binary search on a random value. Reservoir sampling rule: at step i, replace any reservoir element with probability K/i. These two patterns cover 90% of randomized interview questions.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---|---|---|---|
| 528 | Random Pick with Weight | Medium | Prefix sum + binary search on random float | https://leetcode.com/problems/random-pick-with-weight/ |
| 215 | Kth Largest Element in an Array | Medium | Quick Select with random pivot — O(n) average | https://leetcode.com/problems/kth-largest-element-in-an-array/ |
| 382 | Linked List Random Node | Medium | Reservoir sampling (K=1 case) | https://leetcode.com/problems/linked-list-random-node/ |
| 384 | Shuffle an Array | Medium | Fisher-Yates: swap arr[i] with arr[random(0,i)] | https://leetcode.com/problems/shuffle-an-array/ |

### One-Minute Revision
```
PATTERN:   Randomized Algorithms
USE WHEN:  "Random pick", "Kth largest", "shuffle", "stream sampling"
KEY STEP:  Weighted pick → prefix sum + binary search on random value
           Stream sampling → Reservoir: replace slot i with prob K/i
```

---

## Amortized Analysis

### What is it?
Some operations look expensive in isolation but are cheap when averaged over many operations. Amortized analysis spreads the total cost evenly. An "expensive" operation is only possible after many cheap ones have been done — so the average is still low.

### When to use?
- Justifying why a monotonic stack with many pops is still O(n) total.
- Explaining why dynamic array push is O(1) average despite occasional O(n) resize.
- Whenever an interviewer challenges "isn't that O(n²)?" on a stack or queue operation.

### Simple Example
**Monotonic Stack:** In Largest Rectangle in Histogram, each bar is pushed once and popped once. Even though one bar might trigger a cascade of pops, the total number of pops across the entire array is at most n. So the algorithm is O(n) total, not O(n²).

This is the amortized argument: total work = n pushes + n pops = O(n).

### Experience Tip
**Experience Tip:** When an interviewer asks "isn't that O(n²) because of the pops?", say: "No, because each element is pushed exactly once and popped at most once across the entire array. The total work is O(n) amortized."

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---|---|---|---|
| 84 | Largest Rectangle in Histogram | Hard | Each bar pushed/popped once — total O(n) | https://leetcode.com/problems/largest-rectangle-in-histogram/ |
| 155 | Min Stack | Easy | Push/pop — track min alongside data | https://leetcode.com/problems/min-stack/ |

### One-Minute Revision
```
PATTERN:   Amortized Analysis
USE WHEN:  Stack/queue with many pops; dynamic array resize; Union-Find
KEY STEP:  Count TOTAL work across ALL operations, not worst-case per step.
           "Each element pushed once, popped once → O(n) total"
```

---

## Monotonic Patterns

### What is it?
Maintain a stack or deque that is always sorted (ascending or descending). When a new element arrives, pop all elements that violate the monotonic property before pushing. This gives you O(n) solutions to "next greater/smaller element" and "sliding window max/min" problems.

### When to use?
- "Next greater element" / "next smaller element" for each position.
- "Largest rectangle" / "trapping rain water" — spans determined by boundaries.
- "Sliding window maximum" — need max of a window as it slides.
- DP optimization over a sliding range.

### Simple Example
**Next Greater Element:** For each element, find the next element to the right that is larger.

Use a decreasing monotonic stack. Process left to right. When element `x` arrives, pop all stack elements smaller than `x` — `x` is their "next greater". Push `x`. Elements still in the stack at the end have no next greater element.

### Experience Tip
**Experience Tip:** Decide direction first: "next greater to the RIGHT" → process left-to-right, decreasing stack. "next smaller to the LEFT" → process right-to-left or use the reverse. Drawing the stack state for 3-4 elements usually makes the direction clear.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---|---|---|---|
| 496 | Next Greater Element I | Easy | Decreasing stack, process left to right | https://leetcode.com/problems/next-greater-element-i/ |
| 739 | Daily Temperatures | Medium | Same idea: decreasing stack, record distances | https://leetcode.com/problems/daily-temperatures/ |
| 84 | Largest Rectangle in Histogram | Hard | Increasing stack, pop when height drops | https://leetcode.com/problems/largest-rectangle-in-histogram/ |
| 239 | Sliding Window Maximum | Hard | Monotonic deque, maintain decreasing front = max | https://leetcode.com/problems/sliding-window-maximum/ |

### One-Minute Revision
```
PATTERN:   Monotonic Stack / Deque
USE WHEN:  "Next greater/smaller", "largest rectangle", "sliding window max"
KEY STEP:  Each element enters and exits at most once → O(n) total.
           Decreasing stack → next greater. Increasing stack → next smaller.
```

---

## Reverse Thinking

### What is it?
When the forward problem is hard, solve the reverse. Instead of asking "where does this go?", ask "where did this come from?". Instead of building forward, start from the end state and work backwards.

### When to use?
- You are stuck on the forward pass and cannot find an efficient approach.
- "Not reachable" or "not surrounded" is easier to characterize than "is surrounded".
- The problem involves "minimum deletions" — flip it to "maximum valid elements kept".
- You need to undo operations in reverse order.

### Simple Example
**Surrounded Regions (LC 130):** Flip all 'O' regions fully surrounded by 'X'. Forward approach: check each 'O' cell, DFS to border — O(n^2 * m^2), too slow.

Reverse: "not surrounded" = "connected to the border". BFS/DFS from all border 'O' cells, mark them safe. Then flip everything remaining. O(m*n).

| Forward Direction (Hard) | Reverse Direction (Easier) |
|---|---|
| Find surrounded regions from inside | Start from border O's, BFS outward, flip the rest |
| Count elements removed | Count elements kept; removals = total - kept |
| Minimum deletions for valid string | Maximum valid subsequence; deletions = n - max_valid |
| Build answer step by step | Start from answer, undo operations in reverse |

### Experience Tip
**Experience Tip:** The trigger phrase is "I'm stuck on the forward pass". The moment you feel that, explicitly ask yourself: "What is the reverse of this problem? What if I started from the answer?" This alone unblocks a surprising number of hard problems.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---|---|---|---|
| 130 | Surrounded Regions | Medium | BFS from border 'O' cells, flip the rest | https://leetcode.com/problems/surrounded-regions/ |
| 417 | Pacific Atlantic Water Flow | Medium | BFS from both oceans inward, find intersection | https://leetcode.com/problems/pacific-atlantic-water-flow/ |
| 1293 | Shortest Path in a Grid with Obstacles Elimination | Hard | BFS forward but state includes eliminations used | https://leetcode.com/problems/shortest-path-in-a-grid-with-obstacles-elimination/ |

### One-Minute Revision
```
PATTERN:   Reverse Thinking
USE WHEN:  Stuck on forward pass; "not X" is easier than "X"; min deletions
KEY STEP:  Ask: "What is the OPPOSITE of what I'm trying to find?"
           Solve the reverse, then map back to original answer.
```

---

## Add / Remove Constraint

### What is it?
If a problem is too hard as stated, temporarily simplify it by adding a constraint or removing one. Solve the easier version first. Then generalize back to the original problem. This is how you make progress on unfamiliar problems.

### When to use?
- You encounter a completely unfamiliar problem.
- The problem has multiple interacting constraints and you are overwhelmed.
- You want to show structured thinking even if you do not have the full solution yet.
- Use this to start any problem — solve it for K=1, or n=1, or the unweighted version.

### Simple Example
**Longest Substring with at most K Distinct Characters:** Hard for general K.

Simplify: K = 1 (longest run of the same character). Easy — one pass. Now generalize: use sliding window + HashMap to track distinct character counts. When `HashMap.size() > K`, shrink from left. The same sliding window idea scales to any K.

| Hard Version | Simplified Version | How to Generalize |
|---|---|---|
| At most K distinct chars | K = 1 (single char runs) | Sliding window + HashMap |
| Search in 2D matrix | 1D binary search first | Map row/col to index |
| Weighted shortest path | Unweighted BFS first | Add weights → Dijkstra |
| Subset sum, n = 40 | n = 20 (brute force) | Meet in the Middle |

### Experience Tip
**Experience Tip:** In an interview, saying "Let me solve the K=1 case first to understand the structure" is a strong signal. It shows methodical thinking. The interviewer knows you know it is simplified — that is fine.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---|---|---|---|
| 340 | Longest Substring with At Most K Distinct Characters | Medium | Start with K=1, generalize to K with HashMap | https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters/ |
| 239 | Sliding Window Maximum | Hard | Solve for window=1 first, then extend | https://leetcode.com/problems/sliding-window-maximum/ |
| 76 | Minimum Window Substring | Hard | First: does a valid window exist? Then: minimize it | https://leetcode.com/problems/minimum-window-substring/ |

### One-Minute Revision
```
PATTERN:   Add / Remove Constraint
USE WHEN:  Problem feels too complex; you are stuck; unfamiliar territory
KEY STEP:  Solve for K=1, n=1, or the unweighted/single-constraint version.
           Show it working. Then generalize step by step.
```

---

## Design Problems (System-Level)

### What is it?
You are asked to implement a data structure or system: "Design a LRU Cache", "Design a HashMap", "Design Twitter". These test your ability to combine basic data structures into a working system.

### When to use?
- Problem says "Design", "Implement", "Build" a data structure or service.
- You need O(1) lookups AND O(1) insertions/deletions simultaneously.
- The problem has multiple operations with different complexity requirements.

### Simple Example
**LRU Cache (LC 146):** O(1) get and put. Need fast lookup (HashMap) AND ordered eviction (know which is least recently used). 

Combine: HashMap (key → node) + Doubly Linked List (order by recency). Get/put: move node to front of list (O(1) with pointers). Evict: remove from tail (O(1)).

### Experience Tip
**Experience Tip:** Most O(1) design problems use HashMap + LinkedList together. The HashMap gives fast lookup; the LinkedList gives ordered traversal or O(1) insertion/deletion at known positions. When you see "O(1) get and O(1) insert", think this combo immediately.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---|---|---|---|
| 146 | LRU Cache | Medium | HashMap + Doubly Linked List | https://leetcode.com/problems/lru-cache/ |
| 706 | Design HashMap | Easy | Array of buckets + linked list for collisions | https://leetcode.com/problems/design-hashmap/ |
| 705 | Design HashSet | Easy | Same as HashMap without values | https://leetcode.com/problems/design-hashset/ |
| 232 | Implement Queue using Stacks | Easy | Two stacks: inbox and outbox — amortized O(1) | https://leetcode.com/problems/implement-queue-using-stacks/ |
| 225 | Implement Stack using Queues | Easy | One queue, rotate elements on push | https://leetcode.com/problems/implement-stack-using-queues/ |
| 355 | Design Twitter | Medium | Heap for feed merge; HashMap for follow sets | https://leetcode.com/problems/design-twitter/ |

### One-Minute Revision
```
PATTERN:   Design Problems
USE WHEN:  "Design X", "Implement X" — multiple O(1) operations required
KEY STEP:  Identify ALL operations and their required complexity.
           O(1) lookup → HashMap. O(1) ordered access → LinkedList. Combine.
```

---

## 5. Common Interview Mistakes

### Mistake 1: Jumping to code without a plan
**Why it happens:** Nervousness. You recognize a pattern and want to prove it quickly.
**Why it hurts:** You miss edge cases, implement the wrong thing, and waste time debugging.
**Fix:** Spend the first 5-10 minutes on understanding + approach. Code should be the LAST step.

---

### Mistake 2: Not stating the brute force
**Why it happens:** You think skipping straight to optimal shows intelligence.
**Why it hurts:** The brute force confirms you understood the problem and gives a baseline to improve from.
**Fix:** Always say "The naive approach is... with O(?) complexity." Then optimize from there.

---

### Mistake 3: Silent coding
**Why it happens:** Concentrating on getting code right.
**Why it hurts:** The interviewer cannot evaluate your thinking. Silence looks like you are lost.
**Fix:** Narrate everything. "I'm using a HashMap here because I need O(1) lookup. I'll use the key as the value and..." Talk the entire time.

---

### Mistake 4: Ignoring edge cases until the very end
**Why it happens:** You are focused on the happy path.
**Why it hurts:** Edge cases often reveal a fundamental flaw in your approach — too late to fix if discovered after implementation.
**Fix:** Ask about edge cases BEFORE designing: "Can the array be empty? Negative values? All duplicates?"

---

### Mistake 5: Stubbornly debugging a fundamentally wrong approach
**Why it happens:** Sunk-cost fallacy. You have spent 10 minutes on this approach.
**Why it hurts:** You waste time and never recover.
**Fix:** After 5 minutes of trying, say: "I think this approach has a fundamental problem with X. Let me step back and reconsider." Pivoting gracefully is a POSITIVE signal.

---

### Mistake 6: Memorizing solutions instead of patterns
**Why it happens:** You grind LeetCode by reading solutions.
**Why it hurts:** Solutions do not transfer to new problems. Patterns do.
**Fix:** After each problem, write: "The PATTERN here is ___. USE WHEN: ___." Practice recognizing the pattern, not the problem.

---

### Mistake 7: Stating complexity incorrectly
**Why it happens:** Common misconceptions.

| Common Wrong Statement | Correct Statement |
|---|---|
| "HashMap lookup is O(1)" | O(1) average, O(n) worst case due to collisions |
| "Sorting is O(n)" | O(n log n) for comparison-based sort |
| "DFS on graph is O(n)" | O(V + E) — edges matter |
| "Binary search is O(n)" | O(log n) |
| "Monotonic stack is O(n²)" | O(n) amortized — each element pushed/popped once |

---

### Mistake 8: Not asking clarifying questions
**Why it happens:** You assume the input is "normal".
**Why it hurts:** You build a solution for the wrong problem.
**Fix:** Before coding, always ask: "Can the array be empty? Are there duplicates? Can values be negative? Can I modify the input?"

---

## Quick Reference Cheat Sheet

```
╔══════════════════════════════════════════════════════════════════════╗
║  CONSTRAINT → COMPLEXITY (memorize this)                             ║
║  n ≤ 20          → O(2^n)         Backtracking / Bitmask DP         ║
║  n ≤ 40          → O(2^(n/2))     Meet in the Middle                ║
║  n ≤ 500         → O(n³)          Interval DP                       ║
║  n ≤ 1,000       → O(n²)          Nested loops / simple DP          ║
║  n ≤ 100,000     → O(n log n)     Sort / Heap / Binary Search        ║
║  n ≤ 1,000,000   → O(n)           Two pointers / Sliding window      ║
║  n ≤ 10^9        → O(log n)       Binary search on answer            ║
╠══════════════════════════════════════════════════════════════════════╣
║  13-STEP FRAMEWORK                                                   ║
║  1.Understand  2.Structure  3.Constraints  4.Brute force             ║
║  5.Repeated work  6.Pattern  7.State  8.Transition                   ║
║  9.Dry run  10.Complexity  11.Edge cases  12.Implement  13.Optimize  ║
╠══════════════════════════════════════════════════════════════════════╣
║  META-PATTERNS                                                       ║
║  Stuck on forward?   → Reverse Thinking                             ║
║  Too complex?        → Add/Remove Constraint (solve K=1 first)      ║
║  "O(n²)?" on stack   → Amortized: each element pushed/popped once   ║
║  n in [30,40]?       → Meet in the Middle                           ║
╠══════════════════════════════════════════════════════════════════════╣
║  PRE-CODING CHECKLIST                                                ║
║  [ ] Restated the problem in my own words                           ║
║  [ ] Identified input structure                                      ║
║  [ ] Read constraint → stated target complexity                      ║
║  [ ] Stated brute force and its complexity                           ║
║  [ ] Identified pattern and explained why                            ║
║  [ ] Dry-ran on a small example                                     ║
║  [ ] Asked about edge cases                                          ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

*Return to [00-MASTER-INDEX.md](00-MASTER-INDEX.md) for the complete guide map.*
