# Design Patterns and Meta-Strategies — Complete Pattern Guide

> *"These are the patterns that transcend categories — the thinking tools that experienced problem solvers reach for when the problem doesn't fit a single label."*

---

## Table of Contents

1. [Iterator Pattern](#iterator-pattern)
2. [State Machine](#state-machine)
3. [Simulation](#simulation)
4. [Minimax and Game Theory](#minimax-and-game-theory)
5. [Meet in the Middle](#meet-in-the-middle)
6. [Randomized Algorithms](#randomized-algorithms)
7. [Amortized Analysis](#amortized-analysis)
8. [Monotonic Patterns Recap](#monotonic-patterns-recap)
9. [The "Reverse Thinking" Meta-Pattern](#the-reverse-thinking-meta-pattern)
10. [The "Add Constraint / Remove Constraint" Meta-Pattern](#the-add-constraint--remove-constraint-meta-pattern)
11. [Problem Solving Frameworks](#problem-solving-frameworks)
12. [Common Interview Anti-Patterns](#common-interview-anti-patterns)

---

## Iterator Pattern

### What is this approach?

**Intuition:** Provide a way to access elements of a collection sequentially without exposing its underlying representation. In interview context: implement `next()` and `hasNext()` over a complex data structure.

### When should I use this?

- "Implement an iterator for a BST/Linked List/Nested List"
- "Flatten Nested List Iterator"
- "Peeking Iterator"
- "Zigzag Iterator"

### Core Ideas

**BST Iterator:** Controlled inorder traversal using a stack. Push all left children. `next()` pops, pushes right child's left chain. See [10-TREES.md](10-TREES.md#bst-iterator).

**Flatten Nested List Iterator:** Stack-based. Push elements in reverse order. Before `next()`/`hasNext()`, keep flattening the top element if it's a list.

**Peeking Iterator:** Wrapper around an existing iterator. Cache the next value. `peek()` returns cached. `next()` returns cached and advances.

**Zigzag Iterator:** Two (or K) iterators. Round-robin: advance each in turn. Use a queue of iterators.

### Interview Insights

- **Key design principle:** Lazy evaluation. Only compute the next element when asked. Don't flatten everything upfront.
- **Stack is the standard tool** for iterators over hierarchical structures.

---

## State Machine

### What is this approach?

**Intuition:** Model the problem as states and transitions. At each step, you're in some state. Input determines the next state. The answer depends on which states you visit or end in.

### When should I use this?

- "Valid Number" (string parsing with complex rules)
- "Regular Expression Matching" (NFA simulation)
- "UTF-8 Validation"
- "Text Justification"
- "Best Time to Buy and Sell Stock" series (see DP)
- Keywords: "validate format," "parse," "state transitions"

### Core Idea

1. Define states (e.g., START, SEEN_DIGIT, SEEN_DOT, SEEN_E, ...)
2. Define transitions: for each (state, input_character) → next state
3. Define accepting states
4. Process input character by character, following transitions

### Variants

**Explicit State Machine (Valid Number):**
- States: start, integer, decimal, fraction, exponent_sign, exponent, etc.
- Transitions based on char type: digit, '+'/'-', '.', 'e'/'E'
- Accepting states: integer, decimal with digits, fraction, exponent with digits

**Implicit State Machine (Stock Problems):**
- States: holding stock, not holding, in cooldown
- DP transitions between states (see [09-DYNAMIC-PROGRAMMING.md](09-DYNAMIC-PROGRAMMING.md))

### Interview Insights

- **Valid Number** is a great example of a state machine problem. Drawing the state diagram first makes the implementation clean.
- **Pattern:** When the problem has a "finite set of modes/phases" with rules about transitioning between them → state machine.

---

## Simulation

### What is this approach?

**Intuition:** When there's no clever mathematical shortcut, just... do what the problem says. Step by step. Follow the rules literally.

### When should I use this?

- "Spiral Matrix" (walk the matrix in spiral order)
- "Robot bounded in circle"
- "Game of Life"
- "Asteroid collision"
- "Simulate a queue/stack with another structure"
- Keywords: "simulate," "step by step," "follow rules"

### Core Ideas

**Spiral Matrix:** Maintain boundaries (top, bottom, left, right). Traverse in order: right across top → down right side → left across bottom → up left side. Shrink boundaries after each pass.

**Game of Life:** Compute next state for each cell based on neighbors. Use in-place encoding (e.g., encode "was alive, now dead" as a special value) to avoid needing a copy.

**Robot Bounded in Circle:** Simulate one cycle of instructions. After one cycle: if robot is back at origin, OR its direction changed → it will eventually return.

### Interview Insights

- **Simulation problems test implementation precision,** not algorithmic insight. The algorithm IS the simulation.
- **Key skill:** Handle edge cases meticulously. Off-by-one errors are the main trap.
- **Optimization question:** "Can you avoid simulating all N steps?" → Look for cycles (like detecting a cycle in the robot problem, or Game of Life periodicity).

---

## Minimax and Game Theory

### What is this approach?

**Intuition:** Two players alternate turns. One maximizes the score, the other minimizes it. At each state, the current player makes the optimal choice assuming the opponent also plays optimally.

### When should I use this?

- "Stone Game" variants
- "Predict the Winner"
- "Nim Game"
- "Tic-Tac-Toe AI"
- Keywords: "two players," "optimal play," "game," "turn-based"

### Core Idea

**Minimax:**
1. Build a game tree: each node is a game state
2. Maximizer's turn: choose the child with maximum value
3. Minimizer's turn: choose the child with minimum value
4. Evaluate leaves (terminal states)

**Alpha-Beta Pruning:** Optimize minimax by pruning branches that can't affect the decision. Maintain alpha (best for maximizer) and beta (best for minimizer). Prune when alpha ≥ beta.

**DP Approach (Stone Game):** Often minimax reduces to DP. State = remaining elements. dp[i][j] = max score difference the current player can achieve from subarray [i, j].

### Complexity

- **Minimax:** O(b^d) where b = branching factor, d = depth
- **With Alpha-Beta:** O(b^(d/2)) in best case
- **DP Stone Game:** O(n²)

### Interview Insights

- **Stone Game variants** are typically DP problems disguised as game theory.
- **Nim Game:** n stones, take 1-3 per turn. You lose if n % 4 == 0. Pure math, no search needed.
- **Pattern:** "First player wins if..." → Look for a mathematical pattern. Try small cases first.

---

## Meet in the Middle

### What is this approach?

**Intuition:** Split the input into two halves. Solve each half independently. Combine the results. Reduces 2ⁿ to 2 × 2^(n/2) = 2^(n/2+1).

### When should I use this?

- "Subset sum with n up to 40" (too large for 2ⁿ, but 2²⁰ ≈ 10⁶ is fine for each half)
- "Count pairs with XOR/sum in range"
- "Closest subsequence sum"
- Keywords: "n ≤ 40," "subset," "two halves"

### Core Idea

1. Split input into two halves A and B
2. Generate all 2^(n/2) subset sums/values for each half
3. For each value in A, binary search in sorted B for the complement
4. Combine results

### Complexity

- **Time:** O(2^(n/2) × log(2^(n/2))) = O(2^(n/2) × n)
- **Space:** O(2^(n/2))

### Interview Insights

- **Constraint signal:** n ≤ 40 is the classic signal for Meet in the Middle. Too large for O(2ⁿ), too small for polynomial DP.
- **Closest Subsequence Sum:** Split array, generate all subset sums for each half, sort one half, for each sum in the other half binary search for the closest complement to the target.

---

## Randomized Algorithms

### Key Algorithms

**Quick Select (randomized pivot):** Find Kth element in O(n) average. Random pivot avoids worst-case O(n²).

**Reservoir Sampling:** Random sample from a stream. See [15-MATH-AND-NUMBER-THEORY.md](15-MATH-AND-NUMBER-THEORY.md#reservoir-sampling).

**Fisher-Yates Shuffle:** Uniform random permutation. See [15-MATH-AND-NUMBER-THEORY.md](15-MATH-AND-NUMBER-THEORY.md#fisher-yates-shuffle).

**Random Pick with Weight:** Given weights, pick index i with probability weight[i]/total_weight. Use prefix sum + binary search on a random value in [0, total_weight).

**Monte Carlo vs Las Vegas:**
- Monte Carlo: always fast, might be wrong (Rabin-Karp with hash collisions)
- Las Vegas: always correct, might be slow (Randomized Quick Sort)

### Interview Insights

- **"Random Pick" problems** usually reduce to: prefix sum + binary search.
- **Linked List Random Node:** Reservoir Sampling with K=1.

---

## Amortized Analysis

### What is this approach?

**Intuition:** Some operations are expensive occasionally but cheap most of the time. Amortized analysis averages the cost over a sequence of operations. Like a prepaid card — you pay upfront, then spend gradually.

### Key Examples

| Operation | Worst Case | Amortized |
|---|---|---|
| Dynamic array push | O(n) when resizing | O(1) |
| Union-Find (path compression) | O(log n) | O(α(n)) ≈ O(1) |
| Splay tree access | O(n) | O(log n) |
| BST Iterator next() | O(h) | O(1) |
| Stack-based (monotonic stack) | O(n) total for n pushes | O(1) per operation |

### Interview Insights

- **You won't prove amortized bounds in an interview.** But you should recognize when an expensive operation doesn't make the total time worse.
- **Monotonic stack:** Each element is pushed once and popped once → total O(n), not O(n²).
- **BST Iterator:** Each node visited once across all next() calls → O(n) total for n calls → O(1) amortized.

---

## Monotonic Patterns Recap

Monotonic structures appear across multiple categories:

| Structure | Chapter | Use |
|---|---|---|
| Monotonic Stack | [07-STACKS-AND-QUEUES.md](07-STACKS-AND-QUEUES.md) | Next greater/smaller element |
| Monotonic Queue | [07-STACKS-AND-QUEUES.md](07-STACKS-AND-QUEUES.md) | Sliding window max/min |
| Monotonic Deque for DP | [09-DYNAMIC-PROGRAMMING.md](09-DYNAMIC-PROGRAMMING.md) | DP optimization |

**The one-line summary:** Maintain a stack/queue that's always sorted. Incoming elements pop all that violate the order. Each element enters and exits at most once → O(n) total.

---

## The "Reverse Thinking" Meta-Pattern

### Core Idea

Sometimes the forward problem is hard but the reverse is easy. Instead of building up, tear down. Instead of asking "where does this go?", ask "where did this come from?"

### Examples

| Forward (Hard) | Reverse (Easier) |
|---|---|
| Find surrounded regions from inside | Start from border O's (unsurrounded), flip the rest |
| Can we reach the end from start? | Can we reach the start from a reachable end? |
| Build the final answer step by step | Start from the answer, undo operations |
| Count elements removed | Count elements kept (total - kept = removed) |
| Minimum deletions for valid | Maximum valid subsequence length, then subtract |

### Interview Insights

- **When stuck:** Ask yourself "What if I solved the opposite problem?" or "What if I worked backwards?"
- **Surrounded Regions** is the classic example: DFS from borders is FAR simpler than DFS from interior cells.

---

## The "Add Constraint / Remove Constraint" Meta-Pattern

### Core Idea

If a problem is too hard as stated, temporarily add a constraint to make it easier. Solve the easier version. Then figure out how to remove the constraint.

### Examples

- **Problem:** "Longest substring with at most K distinct characters." **Easier version:** Start with K=1 (just find runs of same character). Then generalize using sliding window + HashMap.
- **Problem:** "Find in a 2D matrix." **Easier version:** Think of it as 1D binary search first. Then extend to 2D.
- **Problem:** "Graph with arbitrary weights." **Easier version:** Solve unweighted first (BFS). Then add weights (Dijkstra).

### Interview Insights

- **This is how to approach unfamiliar problems:** Simplify until you can solve it, then gradually reintroduce complexity.

---

## Problem Solving Frameworks

### The 5-Step FAANG Interview Framework

**Step 1 — Understand**
- Restate the problem in your own words
- Clarify inputs, outputs, constraints, edge cases
- Ask: sorted? duplicates? negative numbers? empty input?

**Step 2 — Examples**
- Work through 2-3 examples by hand
- Include edge cases (empty, single element, all same)

**Step 3 — Approach**
- State brute force: "The naive approach is..." + its complexity
- Identify which pattern applies (use pattern triggers from [00-MASTER-INDEX.md](00-MASTER-INDEX.md))
- Explain the optimized approach at a high level

**Step 4 — Implement**
- Write clean, modular code
- Name variables meaningfully
- Talk through your code as you write

**Step 5 — Verify**
- Trace through your example
- Check edge cases
- Analyze time and space complexity

### Pattern Recognition Quick Guide

| If you see... | Think... |
|---|---|
| "Sorted array" | Binary search, two pointers |
| "Top K" / "Kth" | Heap, quick select |
| "Tree" | Recursion, DFS, BFS |
| "Graph, unweighted shortest path" | BFS |
| "Graph, weighted shortest path" | Dijkstra (non-negative), Bellman-Ford (negative) |
| "Permutations/Combinations" | Backtracking |
| "Overlapping subproblems" | DP |
| "O(1) space, find duplicate" | Floyd's cycle, XOR, math trick |
| "Intervals" | Sort + scan, sweep line |
| "Prefix/Dictionary" | Trie |
| "Stream / online" | Heap, reservoir sampling |
| "n ≤ 20" | Bitmask, backtracking |
| "n ≤ 40" | Meet in the middle |
| "String matching" | KMP, rolling hash, or Trie |
| "Sliding window" | Two pointers, deque |
| "Parentheses/Nesting" | Stack |
| "Connected components" | DFS/BFS/Union-Find |
| "Ordering with dependencies" | Topological sort |

---

## Common Interview Anti-Patterns

### Things to Avoid

**1. Jumping to code too fast**
- Spend 5-10 minutes understanding and planning. Coding should be the LAST step.

**2. Over-engineering the first solution**
- Start with brute force. Optimize only after stating it.

**3. Not communicating**
- Interview is a conversation. Narrate your thinking. Silent coding feels like a black box.

**4. Ignoring edge cases until the end**
- Consider them DURING design, not as an afterthought.

**5. Fighting instead of adapting**
- If your approach hits a wall, acknowledge it and pivot. Don't spend 20 minutes debugging a fundamentally wrong approach.

**6. Memorizing solutions instead of patterns**
- Solutions don't transfer. Patterns do. "This looks like a sliding window problem" is more valuable than "I've seen LeetCode #3 before."

**7. Confusing time complexity**

| Common Mistakes | Correct |
|---|---|
| "HashMap is O(1)" | O(1) average, O(n) worst |
| "Sorting is O(n)" | O(n log n) comparison-based |
| "DFS is O(n)" | O(V + E) for graphs |
| "Binary search is O(n)" | O(log n) |

**8. Not asking clarifying questions**
- "Can the array be empty?" "Are there duplicates?" "Are values always positive?" These questions prevent entire categories of bugs.

---

*This concludes the DSA Knowledge Base. Return to [00-MASTER-INDEX.md](00-MASTER-INDEX.md) for the complete guide map.*
