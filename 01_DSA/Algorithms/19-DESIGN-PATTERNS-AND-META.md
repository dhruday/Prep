# Design Patterns and Meta-Strategies — 1-Hour Learning Module

> *"These are the patterns that transcend categories — the thinking tools that experienced problem solvers reach for when the problem doesn't fit a single label."*

**Time budget:** 60 minutes total. Timestamps guide your pacing.

---

## Table of Contents

1. [[0–10 min] Big Picture](#0-10-min-big-picture)
2. [[10–20 min] Mental Model](#10-20-min-mental-model)
3. [[20–35 min] Core Patterns and Meta-Strategies](#20-35-min-core-patterns-and-meta-strategies)
4. [[35–45 min] Concrete Examples](#35-45-min-concrete-examples)
5. [[45–55 min] Pattern Recognition at the Meta Level](#45-55-min-pattern-recognition-at-the-meta-level)
6. [[55–60 min] Final Mental Checklist](#55-60-min-final-mental-checklist)
7. [Active Recall Questions](#active-recall-questions)
8. [Recommended Practice Direction](#recommended-practice-direction)
9. [2-Minute Cheat Sheet](#2-minute-cheat-sheet)

---

## [0–10 min] Big Picture

### What are design patterns in the DSA/interview context?

Most DSA topics teach you *specific* algorithms: BFS, DP, binary search. This module is different. It teaches you **how to think** — the meta-layer above all specific algorithms.

Design patterns in interviews are reusable problem-solving strategies that cut across algorithm categories. They are:

- **Iterator Pattern:** Give sequential access to complex structures without exposing internals.
- **State Machine:** Model problems with finite modes and transitions between them.
- **Simulation:** Follow the rules of the problem literally, step by step.
- **Minimax / Game Theory:** Optimal play with two adversarial players.
- **Meet in the Middle:** Split the input, solve each half, combine — turns O(2ⁿ) into O(2^(n/2)).
- **Randomized Algorithms:** Use probability to get good average-case performance.
- **Amortized Analysis:** Understand why an "expensive" operation is actually cheap in total.
- **Monotonic Patterns:** Maintain a sorted stack/queue to answer range queries in O(n).

On top of these, there are two meta-patterns that are pure thinking tools:

- **Reverse Thinking:** When the forward problem is hard, solve its reverse.
- **Add/Remove Constraint:** Simplify the problem to a tractable version, then generalize.

### What meta-skills does this file cover?

1. A universal 13-step problem-solving framework you can apply to ANY problem.
2. How to recognize which pattern to reach for from the problem statement alone.
3. How constraints (the size of `n`) mechanically narrow down your algorithm choice.
4. Common interview anti-patterns that cost candidates offers.

### Why do these matter for Google interviews?

Google interviewers are not checking whether you memorized a solution. They are evaluating:

- **Structured thinking:** Do you approach the problem methodically?
- **Pattern recognition:** Can you see through the surface story to the underlying structure?
- **Communication:** Do you narrate your reasoning, or do you silently code and hope for the best?
- **Adaptability:** When your first approach fails, do you pivot gracefully?

The content in this module is what separates candidates who "can code" from candidates who "can solve problems." These are exactly the skills Google's rubric rewards at the "Googley" and "Hire" levels.

---

## [10–20 min] Mental Model

### Universal Problem-Solving Framework

Internalize this 13-step sequence. It works on every problem you will ever see. Do not skip steps under pressure — that is exactly when skipping them hurts you.

```
1.  Understand the problem
      - Restate it in your own words. What are the inputs? What are the outputs?

2.  Identify input structure
      - Is it an array, tree, graph, string, stream?
      - Is it sorted? Does it have duplicates? Can values be negative?

3.  Understand constraints
      - What is n? What are the value ranges?
      - This step tells you your target complexity (see constraint table below).

4.  Think about brute force
      - State the naive O(2ⁿ) or O(n²) solution out loud. Always. It grounds discussion.

5.  Find repeated work / useful property
      - Where is the brute force doing redundant computation?
      - Is there monotonicity, sorted order, or a recurrence to exploit?

6.  Identify candidate pattern
      - Based on structure + constraint, which pattern fits? (See pattern table in section 5.)

7.  Define state / variables
      - What do your variables represent? State this precisely before coding.

8.  Derive transition
      - How does state change as you process each element?

9.  Dry run
      - Trace through a small example by hand before writing a single line of code.

10. Analyze complexity
      - State time and space complexity. Does it fit within the constraint budget?

11. Check edge cases
      - Empty input, single element, all identical values, maximum n, negative values.

12. Implement
      - Write clean, modular code. Name variables meaningfully. Talk as you type.

13. Optimize if needed
      - Only after a correct solution exists. Ask the interviewer before optimizing.
```

### How to approach an unfamiliar problem

When you see a problem you have never encountered:

1. **Do not panic and do not go silent.** Narrate what you observe.
2. Apply steps 1–3 (understand, identify structure, read constraints). This alone narrows the field dramatically.
3. Solve a stripped-down version first. Remove one constraint. Solve the simpler problem. Then add the constraint back.
4. Ask: "What if I solved the opposite problem?" (Reverse Thinking).
5. Look for the thing the brute force does *repeatedly* — that is your optimization target.

### Pattern recognition meta-skills

The best interviewers do not recognize problems by name ("oh this is LeetCode 322"). They recognize them by shape:

- **Shape of the input** (sorted array, tree, directed graph) → narrows data structures
- **Shape of the query** (range query, shortest path, count subsets) → narrows algorithms
- **Shape of the constraint** (n ≤ 20 vs n ≤ 10⁶) → narrows complexity class

Practice reading the problem statement and immediately asking: "What shape is this?"

---

## [20–35 min] Core Patterns and Meta-Strategies

### Iterator Pattern

**Core intuition:** Provide sequential access to elements of a complex structure without exposing its internal representation. In interviews: implement `next()` and `hasNext()`.

**When to use:**
- "Implement an iterator for a BST / Linked List / Nested List"
- "Flatten Nested List Iterator," "Peeking Iterator," "Zigzag Iterator"

**How it works:**

- **BST Iterator:** Controlled inorder traversal using a stack. Push all left children upfront. `next()` pops the top, then pushes the right child's entire left chain.
- **Flatten Nested List Iterator:** Stack-based. Push elements in reverse order. Before `next()` / `hasNext()`, keep flattening the top element if it is still a list.
- **Peeking Iterator:** Wrapper around an existing iterator. Cache the next value. `peek()` returns the cache. `next()` returns the cache and advances.
- **Zigzag Iterator:** Two (or K) iterators. Round-robin: advance each in turn. Use a queue of iterators.

**Key design principle:** Lazy evaluation. Only compute the next element when asked. Do not flatten the entire structure upfront.

**Amortized cost:** Each element is visited once across all `next()` calls → O(1) amortized per call, O(n) total.

---

### State Machine

**Core intuition:** Model the problem as a finite set of states and rules for transitioning between them. At each step, your current state plus the current input determines the next state.

**When to use:**
- "Valid Number" — string parsing with complex multi-character rules
- "Regular Expression Matching" — NFA simulation
- "UTF-8 Validation"
- Keywords: "validate format," "parse," "modes," "phases"
- Also: Stock Buy/Sell problems (holding, not holding, in cooldown) — this is an *implicit* state machine solved with DP

**How it works (explicit):**
1. Define states (e.g., `START`, `SEEN_DIGIT`, `SEEN_DOT`, `SEEN_E`, `INVALID`)
2. Define transitions: for each `(current_state, input_char_type)` → `next_state`
3. Define accepting states (valid end states)
4. Process the string character by character, following transitions

**Trick:** Draw the state diagram on paper before coding. The diagram makes the implementation mechanical.

**Pattern recognition signal:** "Finite set of modes with rules about how to move between them" → state machine.

---

### Simulation

**Core intuition:** When there is no clever mathematical shortcut, do exactly what the problem says. Step by step, follow the rules literally.

**When to use:**
- "Spiral Matrix," "Robot Bounded in Circle," "Game of Life," "Asteroid Collision"
- Keywords: "simulate," "step by step," "apply rules"

**Key techniques:**
- **Spiral Matrix:** Maintain boundary pointers (top, bottom, left, right). Traverse right → down → left → up. Shrink boundaries after each pass.
- **Game of Life:** Compute next state per cell based on neighbors. Encode intermediate states in-place (e.g., `2` = was alive, now dead) to avoid a copy array.
- **Robot Bounded in Circle:** Simulate one instruction cycle. After one cycle: if robot is back at origin OR direction changed → the robot will loop and return.

**Interview insight:** Simulation problems test *implementation precision*, not algorithmic cleverness. The main trap is off-by-one errors in boundary conditions. Write slow and careful.

**Optimization question:** Ask yourself "Can I avoid simulating all N steps?" → Look for cycles in the state space.

---

### Minimax and Game Theory

**Core intuition:** Two players alternate turns. One maximizes the score, the other minimizes. At each state, the current player makes the locally optimal choice, assuming the opponent also plays optimally.

**When to use:**
- "Stone Game" variants, "Predict the Winner," "Nim Game," "Tic-Tac-Toe AI"
- Keywords: "two players," "optimal play," "game," "turn-based"

**How it works:**
1. Build the game tree: each node is a game state
2. At maximizer's turn: pick the child with the maximum value
3. At minimizer's turn: pick the child with the minimum value
4. Evaluate leaves (terminal states) directly

**Alpha-Beta Pruning:** Prune subtrees that cannot affect the final decision. Maintain `alpha` (best guaranteed score for maximizer) and `beta` (best guaranteed score for minimizer). Prune when `alpha >= beta`. Reduces O(b^d) to O(b^(d/2)) best case.

**DP reduction:** Many minimax problems collapse to interval DP. For Stone Game: `dp[i][j]` = maximum score *difference* the current player can achieve on subarray `[i..j]`.

**Complexity:**
- Raw minimax: O(b^d) — b = branching factor, d = depth
- With alpha-beta: O(b^(d/2)) best case
- Stone Game DP: O(n²)

**Key shortcut — Nim Game:** n stones, take 1–3 per turn. You lose if `n % 4 == 0`. Pure math — no tree search needed. Always try small cases to find the mathematical pattern before building a game tree.

---

### Meet in the Middle

**Core intuition:** Split the input in half. Solve each half independently (enumerate all possibilities). Combine the results. Converts O(2ⁿ) to O(2^(n/2) * n).

**When to use:**
- "Subset sum with n up to 40" — too large for O(2ⁿ), but 2²⁰ ≈ 10⁶ is fine per half
- "Closest Subsequence Sum," "Count pairs with XOR/sum in range"
- **Constraint signal:** n ≤ 40 is the canonical trigger

**How it works:**
1. Split input into two halves A and B
2. Generate all 2^(n/2) subset sums for each half
3. Sort one half
4. For each value in A, binary search in sorted B for the complement (or closest value)
5. Combine

**Complexity:**
- Time: O(2^(n/2) * n)
- Space: O(2^(n/2))

---

### Randomized Algorithms

**Key algorithms:**

- **Quick Select (randomized pivot):** Find the Kth smallest element in O(n) average. Random pivot prevents worst-case O(n²) degenerate behavior.
- **Reservoir Sampling:** Uniformly random sample of K elements from a stream of unknown length. Maintain a reservoir; at step i, replace a random element with probability K/i.
- **Fisher-Yates Shuffle:** Uniform random permutation. Iterate i from n-1 to 1, swap `arr[i]` with `arr[random(0, i)]`.
- **Random Pick with Weight:** Pick index i with probability `weight[i] / total_weight`. Use prefix sum array + binary search on a uniform random float in `[0, total_weight)`.

**Monte Carlo vs. Las Vegas:**
- Monte Carlo: always finishes fast, may produce a wrong answer (e.g., Rabin-Karp with hash collisions)
- Las Vegas: always produces the correct answer, but runtime varies (e.g., Randomized Quick Sort)

**Interview insight:** "Random pick" problems almost always reduce to: prefix sum array + binary search on a random value.

---

### Amortized Analysis

**Core intuition:** Some operations are expensive occasionally but cheap almost always. Amortized analysis spreads the cost of expensive operations over the entire sequence. Like a prepaid card — you pay a large cost once, then spend gradually.

**Key examples to know:**

| Operation | Worst-Case Single | Amortized per Operation |
|---|---|---|
| Dynamic array push | O(n) when resizing | O(1) |
| Union-Find (path compression) | O(log n) | O(α(n)) ≈ O(1) |
| Monotonic stack (n total pushes) | O(n) for a single push | O(1) |
| BST Iterator next() (n total calls) | O(h) per call | O(1) |

**Why this matters in interviews:** When you use a monotonic stack and the interviewer asks "isn't this O(n²) because of all the pops?" — the answer is no. Each element is pushed once and popped once. Total work across all iterations is O(n). This is amortized O(1) per operation.

---

### Monotonic Patterns Recap

Monotonic structures appear across multiple algorithm categories but share one idea: maintain a stack or queue that is always sorted (either ascending or descending). Incoming elements pop all prior elements that violate the monotonic property.

| Structure | Use Case |
|---|---|
| Monotonic Stack (decreasing) | Next greater element, largest rectangle in histogram |
| Monotonic Stack (increasing) | Next smaller element, trapping rain water |
| Monotonic Deque (max) | Sliding window maximum |
| Monotonic Deque for DP | DP optimization over a sliding range |

**One-line rule:** Each element enters and exits at most once → O(n) total regardless of how many pops happen.

---

### Meta-Pattern: Reverse Thinking

**Core idea:** Sometimes the forward problem is hard but the reverse is easy. Instead of building forward, tear down from the end. Instead of "where does this go?" ask "where did this come from?"

| Forward Direction (Hard) | Reverse Direction (Easier) |
|---|---|
| Find surrounded regions from inside | Start from border O's (unsurrounded), DFS/BFS outward, flip the rest |
| Reach end from start | Reach start from all valid ends |
| Build final answer step by step | Start from the answer, undo operations in reverse |
| Count elements removed | Count elements kept; answer = total − kept |
| Minimum deletions for valid string | Maximum valid subsequence length; deletions = n − max_valid |

**When to reach for this:** You are stuck on the forward pass and your approach feels like brute force with no clear optimization. Ask: "What if I solved the *opposite* problem?"

---

### Meta-Pattern: Add Constraint / Remove Constraint

**Core idea:** If a problem is too hard as stated, temporarily add a simplifying constraint to make it tractable. Solve the easier version. Then gradually remove the constraint.

**Examples:**

| Hard Version | Simplified Version | How to Generalize |
|---|---|---|
| Longest substring with at most K distinct chars | K = 1 (runs of same char) | Use sliding window + HashMap for arbitrary K |
| Search in 2D matrix | 1D binary search first | Extend to 2D by mapping row/col |
| Graph with arbitrary weights (shortest path) | Unweighted BFS first | Add weights → Dijkstra |
| All subsets summing to target (n up to 40) | n up to 20 (brute force) | Split + Meet in the Middle |

**When to reach for this:** You encounter a completely unfamiliar problem. Solve the K=1 / n=1 / unweighted / single-constraint version. Show your thinking. Then build toward the full solution.

---

### Interview Process: How to Communicate

**Step 1 — Understand (2–3 min)**
Restate in your own words. Clarify inputs, outputs, constraints, edge cases. Ask:
- Is the input sorted? Can there be duplicates? Negative numbers? Empty input?

**Step 2 — Examples (2–3 min)**
Work through 2–3 examples by hand. Include at least one edge case (empty, single element, all same).

**Step 3 — Approach (3–5 min)**
- State brute force first: "The naive approach is... with O(?) complexity."
- Identify the pattern: "This looks like a [sliding window / BFS / DP / monotonic stack] problem because..."
- Explain the optimized approach at a high level before touching code.

**Step 4 — Implement (10–15 min)**
Write clean, modular code. Name variables meaningfully. Narrate as you type.

**Step 5 — Verify (2–3 min)**
Trace your example through the code. Check edge cases. State time and space complexity.

---

### Common Interview Anti-Patterns to Eliminate

**1. Jumping to code without planning**
Spend 5–10 minutes on understanding and approach. Coding should be the *last* step, not the first.

**2. Starting with the optimal solution**
Always state the brute force. It shows you understand the problem. Optimize from there.

**3. Silent coding**
The interview is a conversation. Narrate your thinking at all times. Silent coding looks like a black box to the interviewer.

**4. Ignoring edge cases until the end**
Consider edge cases during design, not as an afterthought. They often reveal a flaw in the approach.

**5. Stubbornly debugging a wrong approach**
If your approach hits a fundamental wall after 5 minutes of trying, acknowledge it and pivot. Say: "I think this approach has a problem with... let me reconsider."

**6. Memorizing solutions instead of patterns**
Solutions are not transferable. Patterns are. "This looks like a sliding window problem" is worth far more than "I saw this exact problem on LeetCode."

**7. Stating complexity incorrectly**

| Common Mistake | Correct Statement |
|---|---|
| "HashMap lookup is O(1)" | O(1) average, O(n) worst case due to collisions |
| "Sorting is O(n)" | O(n log n) for comparison-based sorting |
| "DFS on a graph is O(n)" | O(V + E) — edges matter |
| "Binary search is O(n)" | O(log n) |

**8. Not asking clarifying questions**
"Can the array be empty?" "Are there negative values?" "Can I modify the input?" These prevent entire categories of bugs.

---

## [35–45 min] Concrete Examples

### Walkthrough: Universal Framework on "Surrounded Regions"

**Problem:** Given a 2D grid of `'X'` and `'O'`, flip all `'O'` regions that are fully surrounded by `'X'` to `'X'`. Leave `'O'` cells connected to the border unchanged.

Apply the 13 steps:

**Step 1 — Understand:** Input is a 2D char grid. Output is the same grid, modified in-place. "Surrounded" means no path to the border.

**Step 2 — Identify input structure:** 2D grid. Classic DFS/BFS territory.

**Step 3 — Understand constraints:** Typical constraint is m, n ≤ 200. Target: O(m*n).

**Step 4 — Brute force:** For every `'O'` cell, DFS to check if it can reach the border. If not, flip it. Cost: O((m*n)²) — too slow.

**Step 5 — Find repeated work / useful property:** The brute force re-explores cells repeatedly. Also: "not surrounded" is equivalent to "connected to the border." This is the reverse problem.

**Step 6 — Identify candidate pattern:** Reverse Thinking + BFS/DFS from border.

**Step 7 — Define state:** Mark border-connected `'O'` cells with a temporary marker `'S'`.

**Step 8 — Derive transition:**
1. DFS/BFS from all border `'O'` cells. Mark reachable `'O'` cells as `'S'`.
2. Scan entire grid: `'O'` → `'X'` (was surrounded), `'S'` → `'O'` (restore border-connected).

**Step 9 — Dry run:**
```
Input:          After DFS from border:   Final:
X X X X         X X X X                  X X X X
X O O X    →   X O O X    →             X X X X
X X O X         X X O X                  X X X X
X O X X         X S X X                  X O X X
```
The bottom-left `'O'` touches the border → marked `'S'` → restored to `'O'`. The interior `'O'` cells get flipped.

**Step 10 — Complexity:** O(m*n) time, O(m*n) space for the recursion stack.

**Step 11 — Edge cases:** All border cells are `'O'` → nothing flipped. Single-cell grid. Grid with no `'O'` at all.

**Step 12 — Implement:** (standard DFS/BFS from border — straightforward given the plan above)

**Step 13 — Optimize:** Already O(m*n). No further optimization needed.

---

### Walkthrough: How Constraints Narrowed the Choice

**Problem:** "Subset sum, n = 38, target T. Does any subset sum to T?"

**Step 3 — Constraints:** n = 38. Let's apply the constraint table.

- n ≤ 20: pure bitmask backtracking, O(2²⁰) ≈ 10⁶ — fine.
- n = 38: O(2³⁸) ≈ 2.7 × 10¹¹ — way too slow.
- DP approach: values could be huge (e.g., up to 10⁹ each), so a `dp[target]` DP table is infeasible.
- n ≤ 40: **Meet in the Middle signal fires.**

**Decision:** Split array into two halves of size 19. Generate all 2¹⁹ ≈ 524k subset sums per half. Sort one half. For each sum in the first half, binary search for `T - sum` in the second half. Total: O(2^(n/2) * n) ≈ 10 million operations. Fits in time.

This is how constraints force your hand to the right algorithm.

---

## [45–55 min] Pattern Recognition at the Meta Level

### Constraint Table: n → Target Complexity → Candidate Patterns

This table is one of the most useful tools you can internalize. Read constraints first, map to complexity, then narrow to patterns.

| Constraint (n =) | Target Complexity | Candidate Patterns |
|---|---|---|
| n ≤ 10–15 | O(n! ) or O(2ⁿ) | Pure backtracking, permutation enumeration |
| n ≤ 20 | O(2ⁿ) or O(n * 2ⁿ) | Bitmask DP, subset enumeration, backtracking |
| n ≤ 40 | O(2^(n/2) * n) | Meet in the Middle |
| n ≤ 300–500 | O(n³) | Interval DP, Floyd-Warshall, matrix chain |
| n ≤ 1,000–5,000 | O(n²) | Two-pointer on sorted, simple DP, bubble/selection sort |
| n ≤ 100,000 | O(n log n) | Sorting, binary search, heap, merge sort, BIT/segment tree |
| n ≤ 1,000,000 | O(n) | Linear scan, two pointers, sliding window, counting sort, BFS/DFS |
| n ≤ 10⁹ | O(log n) or O(√n) | Binary search on answer, math, sieve up to √n |
| n is a very large number | O(log n) or O(1) | Math formula, modular exponentiation, cycle detection |

**How to use this table in an interview:**
1. Read the constraint on n.
2. Immediately state: "With n up to X, I need an O(Y) solution."
3. Now only consider patterns that can achieve O(Y).

---

### Keyword → Pattern Quick Guide

| If the problem mentions... | Reach for... |
|---|---|
| Sorted array | Binary search, two pointers |
| "Top K" / "Kth largest/smallest" | Heap (min/max), Quick Select |
| Tree traversal or path | DFS (recursion), BFS (level-order) |
| Shortest path, unweighted graph | BFS |
| Shortest path, weighted, non-negative | Dijkstra |
| Shortest path, negative weights | Bellman-Ford |
| All-pairs shortest paths | Floyd-Warshall |
| Permutations / combinations / subsets | Backtracking |
| Overlapping subproblems, optimal substructure | Dynamic Programming |
| O(1) space, find duplicate or missing | Floyd's cycle, XOR trick, math |
| Interval scheduling / merging | Sort by start/end, sweep line |
| Prefix matching / autocomplete | Trie |
| Stream / online algorithm | Heap, reservoir sampling |
| n ≤ 20, choose/not-choose | Bitmask DP |
| n ≤ 40, subset sum | Meet in the Middle |
| String matching / substring search | KMP, rolling hash (Rabin-Karp), Trie |
| Subarray sum / window condition | Sliding window, prefix sum + HashMap |
| Parentheses, nesting, matching brackets | Stack |
| Connected components in a graph | DFS / BFS / Union-Find |
| Ordering with dependencies | Topological sort (Kahn's / DFS) |
| "Surrounded," "not reachable," "components" | BFS/DFS + Reverse Thinking |
| Game, two players, optimal play | Minimax, DP interval game |
| "Validate," "parse," "legal format" | State machine |
| "Iterator," "next," "lazy access" | Iterator pattern with stack |
| "Simulate," "apply rules," "N steps" | Simulation |

---

### How to pick when the problem type is unclear

When you genuinely cannot identify the pattern from the problem statement, apply this triage sequence:

1. **Read constraints** → determine target complexity class.
2. **Identify input structure** → array / tree / graph / string? Each has a natural set of operations.
3. **Try the simplest approach that fits the complexity budget.** If O(n log n) is needed and input is unsorted, sorting + a linear scan is often the solution.
4. **Ask: "Does the brute force have repeated subproblems?"** → If yes, DP. If no, probably greedy or direct.
5. **Ask: "Is there monotonicity or a sortable property?"** → Binary search / greedy / monotonic stack.
6. **Ask: "Would the reverse problem be easier?"** → Reverse Thinking.
7. **Ask: "Can I solve a simpler version?"** → Add/Remove Constraint meta-pattern.

---

## [55–60 min] Final Mental Checklist

Before you start typing, verify every item:

```
BEFORE CODING
[ ] I restated the problem and confirmed I understand it
[ ] I identified the input structure (array / tree / graph / string / stream)
[ ] I read and mapped the constraint (n ≤ ?) to a target complexity class
[ ] I stated the brute force and its complexity out loud
[ ] I identified which pattern applies and explained why
[ ] I defined what my key variables / state represents
[ ] I dry-ran the logic on a small example

DURING CODING
[ ] I am narrating my reasoning as I type
[ ] Variable names are descriptive, not single letters (except loop counters)
[ ] I am handling the base case / loop boundary before the general case

AFTER CODING
[ ] I traced my code on the original example
[ ] I checked edge cases: empty input, single element, all same, max n
[ ] I stated time complexity and space complexity with justification
[ ] I asked the interviewer if further optimization is desired
```

---

## Active Recall Questions

Test yourself. Cover the answers and try to answer from memory.

1. You see a problem with n ≤ 40 and it involves subsets. What algorithm should you think of first, and why?

2. The brute force for a string parsing problem is a large nested if-else chain that's hard to extend. What design pattern cleans this up? What are the three things you must define?

3. Explain why a monotonic stack that performs O(n) total pops is not O(n²). What technique is this reasoning called?

4. You are stuck on "find all surrounded regions." The forward DFS from each interior `'O'` is complicated. What meta-pattern applies? What does the reverse problem look like?

5. A problem asks you to find the Kth largest element in an unsorted array. What two algorithms can solve this? What are their average-case complexities?

6. You need to sample K random elements from a stream of unknown length, each with equal probability. What algorithm handles this? Describe the core rule for deciding whether to replace a reservoir element.

7. Your Monte Carlo algorithm sometimes gives wrong answers due to hash collisions. How would you convert it to a Las Vegas algorithm?

8. Explain the "Add/Remove Constraint" meta-pattern. Give one concrete example of simplifying a hard problem and then generalizing.

9. In minimax, what is alpha-beta pruning and what is the best-case complexity improvement?

10. You are given a Peeking Iterator to implement around an existing iterator. What state does your wrapper need, and what is the implementation of `peek()` vs. `next()`?

---

## Recommended Practice Direction

**Week 1 — Simulation and State Machine**
- Spiral Matrix (LC 54)
- Game of Life (LC 289)
- Valid Number (LC 65) — build the full state machine diagram first
- Robot Bounded in Circle (LC 1041)

**Week 2 — Iterator and Amortized Reasoning**
- Binary Search Tree Iterator (LC 173)
- Flatten Nested List Iterator (LC 341)
- Peeking Iterator (LC 284)
- Zigzag Iterator (LC 281)

**Week 3 — Game Theory and Meet in the Middle**
- Stone Game (LC 877)
- Predict the Winner (LC 486)
- Partition Array Into Two Arrays to Minimize Sum Difference (LC 2035) — Meet in the Middle
- Closest Subset Sum (LC 1755)

**Week 4 — Meta-patterns and Hard Mixed Problems**
- Surrounded Regions (LC 130) — Reverse Thinking
- Number of Islands II (LC 305)
- Random Pick with Weight (LC 528)
- Any 3 problems where you apply the full 13-step framework and write it out

---

## 2-Minute Cheat Sheet

```
CONSTRAINT → COMPLEXITY MAP
n ≤ 20        →  O(2ⁿ)         Bitmask / Backtracking
n ≤ 40        →  O(2^(n/2))    Meet in the Middle
n ≤ 500       →  O(n³)         Interval DP
n ≤ 5,000     →  O(n²)         Nested loops / simple DP
n ≤ 100,000   →  O(n log n)    Sort / Heap / Binary Search
n ≤ 1,000,000 →  O(n)          Two pointers / Sliding window
n ≤ 10⁹       →  O(log n)      Binary search on answer

KEYWORD → PATTERN
Sorted array         → Binary search / Two pointers
Top-K / Kth          → Heap / Quick Select
Unweighted SP        → BFS
Weighted SP          → Dijkstra (non-neg) / Bellman-Ford (neg)
Permutations/subsets → Backtracking
Repeated subproblems → DP
Intervals            → Sort + sweep
Prefix match         → Trie
Stream               → Heap / Reservoir Sampling
n ≤ 20, subsets      → Bitmask DP
String matching      → KMP / Rolling hash
Subarray sum         → Prefix sum + HashMap / Sliding window
Nesting / matching   → Stack
Components           → DFS / BFS / Union-Find
Dependencies         → Topological sort
Two players, optimal → Minimax / Game DP
Validate / parse     → State machine
Iterator, next()     → Stack-based lazy iterator

META-PATTERNS
Stuck on forward? → Reverse Thinking (start from the answer / border)
Problem too hard? → Add/Remove Constraint (simplify, then generalize)
Expensive op? → Amortized: count total work, not per-step worst case
n in [20, 40]? → Split in half, Meet in the Middle

13-STEP FRAMEWORK (memorize this order)
1. Understand  2. Input structure  3. Constraints  4. Brute force
5. Repeated work  6. Candidate pattern  7. Define state  8. Transition
9. Dry run  10. Complexity  11. Edge cases  12. Implement  13. Optimize
```

---

*Return to [00-MASTER-INDEX.md](00-MASTER-INDEX.md) for the complete guide map.*
