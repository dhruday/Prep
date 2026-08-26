# Dynamic Programming — 1-Hour Learning Module

> *"DP is not about memorizing transitions. DP is about asking: 'What decision did I make, and what smaller problem remains after I make it?'"*

**Estimated time:** 60 minutes | **Difficulty:** Medium-Hard | **Interview frequency:** 30–40% of FAANG problems

---

## Table of Contents

- [[0–10 min] Big Picture](#0-10-min-big-picture)
- [[10–20 min] Mental Model](#10-20-min-mental-model)
- [[20–35 min] Core Pattern — How to Derive DP](#20-35-min-core-pattern--how-to-derive-dp)
- [[35–45 min] Concrete Code + Dry Run](#35-45-min-concrete-code--dry-run)
- [[45–55 min] Pattern Recognition](#45-55-min-pattern-recognition)
- [[55–60 min] Final Mental Checklist](#55-60-min-final-mental-checklist)
- [Active Recall Questions](#active-recall-questions)
- [Recommended Practice Direction](#recommended-practice-direction)
- [2-Minute Cheat Sheet](#2-minute-cheat-sheet)
- [Advanced Awareness](#advanced-awareness)

---

## [0–10 min] Big Picture

### What is Dynamic Programming?

Dynamic Programming (DP) is a technique for solving problems where the same sub-calculation appears over and over again. Instead of recomputing it each time, you compute it once and remember the answer.

That's it. Everything else is a variation of this idea.

### The Analogy: Mountain Checkpoint Notes

Imagine you are hiking a mountain with many branching trails. Some trails share checkpoints — you might pass Checkpoint C whether you came from Path A or Path B. Without DP, you recompute "best route from Checkpoint C to the top" every single time you arrive at C. With DP, you leave a note at C: *"From here, the best route takes 4 more hours."* The next time you arrive, you just read the note.

**Repeated subproblems = wasted work. Remember answers = DP.**

### The Tiny Example: Fibonacci

What is `fib(5)`?

```
fib(5) = fib(4) + fib(3)
fib(4) = fib(3) + fib(2)
fib(3) = fib(2) + fib(1)
fib(2) = fib(1) + fib(0)
```

Notice: `fib(3)` is computed TWICE. `fib(2)` is computed THREE times. For `fib(50)`, the brute-force recursion makes 2^50 calls — which is over a quadrillion calls. With DP, it takes 50 steps.

**This is why DP exists: exponential recursion → polynomial computation by remembering answers.**

### Why It Matters for Google Interviews

DP appears in 30–40% of hard and medium interview problems. Problems about finding the *minimum cost*, *maximum profit*, *count of ways*, or *longest/shortest sequence* almost always have a DP solution. Getting comfortable with DP derivation is one of the highest-return investments you can make in interview prep.

---

## [10–20 min] Mental Model

### The Chain of Reasoning

Before writing any formula, ask these questions in sequence:

```
Big Problem
  → Can I break it into smaller problems?
     → Do smaller problems repeat?
        → If yes: REMEMBER their answers
           → This is Dynamic Programming
```

### The Two Core Properties

**1. Optimal Substructure (plain English first):**
The best solution to the whole problem can be built from the best solutions to its parts.

*Example:* The shortest path from A to C through B is: (shortest path A→B) + (shortest path B→C). If you had a suboptimal path from A→B, you could just swap it for the optimal one. The subproblems are independent.

*Formal term:* Optimal Substructure.

**2. Overlapping Subproblems:**
If you solve the problem recursively, the same sub-calls appear many times.

*Example:* In Fibonacci, `fib(3)` is called from both `fib(4)` and `fib(5)`. This is an overlapping subproblem.

Both properties together → DP works and is worth applying.

### Memoization vs Tabulation

These are two ways to implement the same idea:

| | Memoization (Top-Down) | Tabulation (Bottom-Up) |
|---|---|---|
| **Approach** | Write natural recursion, add a cache | Fill a table from base cases upward |
| **Direction** | Starts at the big problem, goes down | Starts at base cases, goes up |
| **Computes** | Only the states actually needed | All states (even unused ones) |
| **Space** | Recursion stack + cache | Table only (no stack) |
| **Interview** | Faster to write, more intuitive | Easier to space-optimize |
| **Pitfall** | Stack overflow for large inputs | Must figure out fill order |

**Interview strategy:** Start with top-down memoization. Mention you could convert to bottom-up. Convert if asked for space optimization.

### The Four Steps of Any DP Problem

1. **Define the state:** What is `dp[i]` or `dp[i][j]`? Say it in one sentence.
2. **Define the recurrence:** How does `dp[i]` relate to smaller states?
3. **Identify base cases:** What do you know without any computation?
4. **Determine fill order:** Which direction ensures dependencies are computed first?

**If you can clearly define the state in one sentence, you are 80% done.**

---

## [20–35 min] Core Pattern — How to Derive DP

### The Derivation Process

Never memorize DP formulas. Instead, derive them every time using this process:

```
1. What DECISION am I making at each step?
2. What CHOICES exist at each decision point?
3. After I make a choice, what SMALLER PROBLEM remains?
4. What CHANGES between one subproblem and the next?
5. What must I REMEMBER to make the next decision?
   → These remembered things define your STATE.
6. Define dp[state] in one sentence.
7. Derive the TRANSITION from the decision + choices.
8. What are the BASE CASES? (smallest subproblems with known answers)
9. What is the COMPUTATION ORDER? (fill base cases first, then build up)
10. Can I optimize SPACE? (do I only need the last row/last few values?)
```

### Worked Derivation: House Robber

**Problem:** You are a robber. Houses in a line each have some money. You cannot rob two adjacent houses. What is the maximum money you can steal?

**Step 1 — What decision am I making at each step?**
At each house, I decide: rob this house, or skip it.

**Step 2 — What choices exist?**
Two choices: ROB or SKIP.

**Step 3 — After I choose, what smaller problem remains?**
- If I rob house i: I cannot rob house i-1. The remaining problem is houses 0..i-2.
- If I skip house i: I can rob or skip house i-1. The remaining problem is houses 0..i-1.

**Step 4 — What changes between subproblems?**
The index i (how far along the street I am).

**Step 5 — What must I remember?**
Just the index i. I don't need to remember which specific houses I robbed before — only the best total from that position onward matters.

**Step 6 — Define dp[i]:**
`dp[i]` = maximum money I can steal from houses 0 through i.

**Step 7 — Derive the transition:**
- Option A: Rob house i → I earn `nums[i]`, plus best from houses 0..i-2 → `nums[i] + dp[i-2]`
- Option B: Skip house i → I earn whatever I got from houses 0..i-1 → `dp[i-1]`
- Take the best: `dp[i] = max(dp[i-1], nums[i] + dp[i-2])`

**Step 8 — Base cases:**
- `dp[0] = nums[0]` (only one house, rob it)
- `dp[1] = max(nums[0], nums[1])` (two houses, rob the richer one)

**Step 9 — Computation order:**
Left to right. `dp[i]` depends on `dp[i-1]` and `dp[i-2]`, which are always computed first.

**Step 10 — Space optimization:**
`dp[i]` only uses `dp[i-1]` and `dp[i-2]`. Keep two variables instead of a full array: O(n) space → O(1) space.

### Worked Derivation: Coin Change

**Problem:** Given coins of different denominations and a total amount, find the minimum number of coins to make that amount. You have unlimited coins of each denomination.

**Step 1 — What decision?**
At each total amount I want to reach, I decide which coin to use as the LAST coin.

**Step 2 — What choices?**
For each coin denomination `c` in `coins[]`, I can use it if `c <= amount`.

**Step 3 — Smaller problem after choice?**
If I use coin `c` last, the remaining problem is making amount `amount - c`.

**Step 4 — What changes?**
The remaining amount to make.

**Step 5 — What to remember?**
Just the remaining amount.

**Step 6 — Define dp[i]:**
`dp[i]` = minimum coins to make amount i.

**Step 7 — Transition:**
`dp[i] = min over all coins c where c <= i: (dp[i - c] + 1)`

**Step 8 — Base cases:**
`dp[0] = 0` (zero coins needed to make amount 0)
`dp[i] = infinity` initially (impossible until proven otherwise)

**Step 9 — Computation order:**
Left to right (amount 0 to target). `dp[i]` depends on `dp[i - c]` for `c > 0`, so smaller amounts are always computed first.

**Step 10 — Space:**
Already O(amount). Cannot reduce further because all previous values are needed.

### Worked Derivation: Unique Paths (2D)

**Problem:** An m×n grid. Move only right or down. Count paths from top-left to bottom-right.

**Step 1 — What decision?**
At each cell, I decide: move right or move down.

**Step 2 — What choices?**
Two: move right (to `[i][j+1]`) or move down (to `[i+1][j]`).

**Step 3 — Smaller problem?**
"How did I get to cell (i, j)?" Either from (i-1, j) by moving down, or from (i, j-1) by moving right.

**Step 4 — What changes?**
Both row index i and column index j.

**Step 5 — What to remember?**
The current position (i, j).

**Step 6 — Define dp[i][j]:**
`dp[i][j]` = number of distinct paths from (0,0) to (i,j).

**Step 7 — Transition:**
`dp[i][j] = dp[i-1][j] + dp[i][j-1]`
(paths arriving from above + paths arriving from the left)

**Step 8 — Base cases:**
`dp[0][j] = 1` for all j (top row: only one way — always move right)
`dp[i][0] = 1` for all i (left column: only one way — always move down)

**Step 9 — Computation order:**
Row by row, left to right. Each cell depends on the cell above and the cell to the left, both already computed.

**Step 10 — Space optimization:**
`dp[i][j]` only depends on the previous row and current row. Keep a single 1D array of size n and update in place: O(m*n) space → O(n) space.

---

## [35–45 min] Concrete Code + Dry Run

### Pattern 1 — 1D Array DP: House Robber

**Input:** `nums = [2, 7, 9, 3, 1]`

**Dry Run — DP Table:**

| i | nums[i] | dp[i-2] + nums[i] | dp[i-1] | dp[i] |
|---|---------|-------------------|---------|-------|
| 0 | 2       | — (base case)     | —       | 2     |
| 1 | 7       | — (base case)     | —       | 7     |
| 2 | 9       | 2 + 9 = 11        | 7       | 11    |
| 3 | 3       | 7 + 3 = 10        | 11      | 11    |
| 4 | 1       | 11 + 1 = 12       | 11      | 12    |

**Answer: dp[4] = 12** (rob houses 0, 2, 4 → 2 + 9 + 1 = 12)

**Where each formula came from:**
- `dp[2] = max(dp[1], dp[0] + nums[2]) = max(7, 2+9) = 11` — skipping house 2 only gives 7, robbing house 2 gives 11.
- `dp[3] = max(dp[2], dp[1] + nums[3]) = max(11, 7+3) = 11` — robbing house 3 (7+3=10) is worse than skipping it (11).
- `dp[4] = max(dp[3], dp[2] + nums[4]) = max(11, 11+1) = 12` — robbing house 4 adds 1 on top of the best from houses 0-2.

**Java:**
```java
public int rob(int[] nums) {
    int n = nums.length;
    if (n == 1) return nums[0];
    
    // Space-optimized: only keep prev2 and prev1
    int prev2 = nums[0];
    int prev1 = Math.max(nums[0], nums[1]);
    
    for (int i = 2; i < n; i++) {
        int curr = Math.max(prev1, prev2 + nums[i]);
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}
// Time: O(n), Space: O(1)
```

**JavaScript / TypeScript:**
```typescript
function rob(nums: number[]): number {
    const n = nums.length;
    if (n === 1) return nums[0];
    
    let prev2 = nums[0];
    let prev1 = Math.max(nums[0], nums[1]);
    
    for (let i = 2; i < n; i++) {
        const curr = Math.max(prev1, prev2 + nums[i]);
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}
// Time: O(n), Space: O(1)
```

**Why O(n) time?** One pass through the array. Each step is O(1). Total: O(n).
**Why O(1) space?** `dp[i]` only needs `dp[i-1]` and `dp[i-2]`. Two variables replace the whole array.

---

### Pattern 2 — 2D Grid DP: Unique Paths

**Input:** `m = 3, n = 3` (3×3 grid)

**Dry Run — DP Table:**

Starting state: fill base cases first (all 1s in row 0 and column 0).

```
    j=0  j=1  j=2
i=0 [ 1,   1,   1 ]   <- base case: top row always = 1
i=1 [ 1,   ?,   ? ]
i=2 [ 1,   ?,   ? ]
```

Fill cell (1,1): `dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1 = 2`
Fill cell (1,2): `dp[1][2] = dp[0][2] + dp[1][1] = 1 + 2 = 3`
Fill cell (2,1): `dp[2][1] = dp[1][1] + dp[2][0] = 2 + 1 = 3`
Fill cell (2,2): `dp[2][2] = dp[1][2] + dp[2][1] = 3 + 3 = 6`

```
    j=0  j=1  j=2
i=0 [ 1,   1,   1 ]
i=1 [ 1,   2,   3 ]
i=2 [ 1,   3,   6 ]
```

**Answer: dp[2][2] = 6** (there are 6 unique paths from top-left to bottom-right in a 3×3 grid)

**Where the formula came from:** To reach (i,j), I must have come from either directly above (i-1,j) or directly to the left (i,j-1). The number of ways to reach (i,j) is the sum of ways to reach each of those two cells.

**Java:**
```java
public int uniquePaths(int m, int n) {
    // Space-optimized: one row at a time
    int[] dp = new int[n];
    Arrays.fill(dp, 1); // base case: top row all 1s
    
    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[j] = dp[j] + dp[j - 1];
            // dp[j] (before update) = value from row above = dp[i-1][j]
            // dp[j-1] (already updated) = value from same row, left = dp[i][j-1]
        }
    }
    return dp[n - 1];
}
// Time: O(m*n), Space: O(n)
```

**JavaScript / TypeScript:**
```typescript
function uniquePaths(m: number, n: number): number {
    const dp: number[] = new Array(n).fill(1); // top row = all 1s
    
    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            dp[j] = dp[j] + dp[j - 1];
        }
    }
    return dp[n - 1];
}
// Time: O(m*n), Space: O(n)
```

**Why O(m*n) time?** Every cell is visited exactly once. m rows × n columns = m*n operations.
**Why O(n) space after optimization?** We only need the current row and the previous row. We process cells left-to-right in each row. `dp[j]` before update holds `dp[i-1][j]` (above), and `dp[j-1]` after update holds `dp[i][j-1]` (left). One array suffices.

---

### The Call Tree: Why Naive Recursion Fails

Before DP, consider naive recursion for `fib(5)`:

```
                    fib(5)
                  /        \
            fib(4)          fib(3)          <- fib(3) called twice
           /      \        /      \
        fib(3)  fib(2)  fib(2)  fib(1)     <- fib(2) called 3 times
        /    \
    fib(2)  fib(1)
```

`fib(3)` is called 2 times. `fib(2)` is called 3 times. For `fib(50)`, this is 2^50 calls.

With memoization: once `fib(3)` is computed, every future call returns in O(1). Total calls: exactly 49 unique subproblems. O(n) time.

**This visual is your justification for DP every time you use it in an interview.**

---

## [45–55 min] Pattern Recognition

### How to Recognize DP in a New Problem

When you see a problem, look for these signals:

| Signal in Problem | DP Likely Because |
|---|---|
| "Minimum cost" / "Maximum profit" | Optimization over substructure |
| "Count the number of ways" | Overlapping subproblems in counting paths |
| "Can you reach / is it possible?" | Decision problem with substructure |
| "Longest / shortest subsequence" | Subsequence selection with optimal substructure |
| Exponential brute force exists | Memoization can collapse repeated subtrees |
| "Choices at each step affect future options" | State captures consequence of choices |

### Distinguishing DP vs Greedy vs Recursion vs Backtracking

This is a critical distinction. Getting it wrong wastes interview time.

**Pure Recursion:**
- Breaks into subproblems, no overlap, no memoization needed.
- Example: Merge sort. Left half and right half never share sub-calls.
- No "remembering" needed because you never revisit the same subproblem.

**Backtracking:**
- Explores all possibilities via recursion, but prunes branches early.
- Used when you need to enumerate all valid solutions, not find the optimal one.
- Example: Permutations, N-Queens, Sudoku solver.
- Key sign: you are building a solution step by step and undoing choices ("backtracking") when a constraint is violated.
- DP does NOT backtrack. DP commits to a state and builds forward.

**Greedy:**
- At each step, make the locally optimal choice and never reconsider it.
- Works when local optimum guarantees global optimum (provable by exchange argument).
- Example: Activity selection (always pick the job that finishes earliest), fractional knapsack.
- Test: "If I always make the best local choice, am I guaranteed a globally optimal result?" If yes → greedy. If you need to look back → DP.

**Dynamic Programming:**
- Overlapping subproblems + optimal substructure.
- You "try all choices" at each step but remember past results to avoid recomputation.
- Example: 0/1 Knapsack (greedy fails — you can't just take the best value-to-weight ratio item because weights must fit exactly).

```
Brute Force Recursion
    |
    +---> No overlap between subproblems? --> Divide & Conquer (e.g., merge sort)
    |
    +---> Subproblems overlap?
              |
              +---> Need to enumerate ALL solutions? --> Backtracking + Pruning
              |
              +---> Need optimal/count solution?
                        |
                        +---> Local greedy choice provably optimal? --> Greedy
                        |
                        +---> Need to consider all choices, remember past? --> DP
```

### The Common DP Families

Know which family a problem belongs to. This guides your state definition immediately.

| Family | State Shape | Key Signal | Classic Examples |
|---|---|---|---|
| **1D Linear** | `dp[i]` | One sequence, left-to-right decisions | Climbing Stairs, House Robber, Decode Ways |
| **2D Grid** | `dp[i][j]` | Grid movement, or two varying parameters | Unique Paths, Min Path Sum, Maximal Square |
| **Two-Sequence** | `dp[i][j]` | Two strings/arrays being compared | LCS, Edit Distance, Wildcard Matching |
| **Knapsack** | `dp[i][w]` | Items with weights, capacity constraint | 0/1 Knapsack, Subset Sum, Coin Change |
| **Interval** | `dp[i][j]` | Splitting or merging a contiguous range | Matrix Chain, Burst Balloons, Palindrome Partition |
| **State Machine** | Multiple 1D arrays | Distinct "modes" with transitions | Stock Buy/Sell series, Cooldown, Fee |
| **Subsequence** | `dp[i]` or `dp[i][j]` | Longest/shortest non-contiguous selection | LIS, LCS, LPS |
| **Tree** | Per-node value | Tree structure, bottom-up aggregation | House Robber III, Max Path Sum, Tree Diameter |
| **Bitmask** | `dp[mask]` | Small n (≤20), track visited subset | TSP, Assignment, Partition into K subsets |

### Complexity Intuition

- **1D DP:** O(n) states × O(1) transition each = **O(n) time, O(n) space** (often O(1) space after optimization)
- **2D DP:** O(m×n) states × O(1) transition each = **O(m×n) time, O(m×n) space** (often O(n) after optimization)
- **Knapsack:** O(n × W) states = **O(n×W) time, O(W) space** (pseudo-polynomial — depends on VALUE of W)
- **Interval DP:** O(n²) states × O(n) split points = **O(n³) time, O(n²) space**
- **Bitmask DP:** O(2^n × n) states = **O(2^n × n) time** (only feasible for n ≤ 20–25)

---

## [55–60 min] Final Mental Checklist

Before writing any DP code in an interview, run through this checklist mentally:

```
Step 1: Is this DP?
  [ ] Does the problem ask for min/max/count/feasibility?
  [ ] Can I express the answer in terms of answers to smaller versions?
  [ ] Do subproblems repeat (call tree has repeated branches)?
  --> If yes to all three: DP.

Step 2: Define the state
  [ ] What is changing as I make decisions? (These are your state dimensions)
  [ ] Can I say "dp[i] = ..." in one clean sentence?
  [ ] Is the state space tractable? (n ≤ 1000 → O(n²) OK; n ≤ 20 → bitmask OK)

Step 3: Derive the transition
  [ ] What decision do I make at each state?
  [ ] What choices exist?
  [ ] After each choice, what is the remaining subproblem?
  --> dp[state] = combine(choice1, choice2, ...)

Step 4: Base cases
  [ ] What is the smallest subproblem I know the answer to without recursion?
  [ ] Have I handled edge cases (empty array, amount = 0, single element)?

Step 5: Fill order
  [ ] Which direction ensures all dependencies are filled first?
  [ ] (Left-to-right for 1D; row-by-row for 2D; increasing length for interval DP)

Step 6: Space optimization (mention as a follow-up)
  [ ] Does dp[i] only depend on dp[i-1] and dp[i-2]? → O(1) space
  [ ] Does dp[i][j] only depend on dp[i-1][...]? → rolling 1D array, O(n) space

Step 7: Verify with a small example
  [ ] Manually trace the DP table on a tiny input before coding
```

---

## Active Recall Questions

Answer these from memory before checking back:

1. What two properties make a problem solvable by DP? Define each in your own words.
2. Draw the recursive call tree for `fib(5)` and circle the repeated subproblems.
3. What is the difference between memoization and tabulation? When would you prefer each?
4. Walk through the 10-step derivation process for the Coin Change problem from scratch (no peeking).
5. In a 2D knapsack `dp[i][w]`, what does `dp[i][w]` represent? What is the recurrence?
6. Why does the 0/1 knapsack space optimization iterate from RIGHT to LEFT, while unbounded knapsack iterates LEFT to RIGHT?
7. What is the difference between DP and backtracking? Give one problem that is DP, and one that is backtracking.
8. How would you recognize that a problem belongs to the "interval DP" family? Give two examples.
9. Explain in one sentence why the Burst Balloons problem requires thinking about the LAST balloon burst, not the first.
10. For the LIS problem, what is the O(n²) approach and what is the O(n log n) approach? When would each matter?

---

## Recommended Practice Direction

Work through problems in this order (each builds on the last):

**Week 1 — 1D DP foundations:**
- Climbing Stairs (LC 70) — simplest possible DP
- House Robber (LC 198) — decisions with constraints
- House Robber II (LC 213) — circular variant (two-pass trick)
- Coin Change (LC 322) — unbounded, minimize
- Coin Change II (LC 518) — combinations vs permutations
- Decode Ways (LC 91) — careful base case handling

**Week 2 — 2D and two-sequence DP:**
- Unique Paths (LC 62) — 2D grid, no obstacles
- Unique Paths II (LC 63) — with obstacles
- Minimum Path Sum (LC 64) — grid with costs
- Longest Common Subsequence (LC 1143) — canonical two-sequence DP
- Edit Distance (LC 72) — harder two-sequence DP
- Maximal Square (LC 221) — 2D DP with non-obvious recurrence

**Week 3 — Knapsack and subsequences:**
- Partition Equal Subset Sum (LC 416) — subset sum as knapsack
- Target Sum (LC 494) — transform to subset sum
- Longest Increasing Subsequence (LC 300) — both O(n²) and O(n log n)
- Russian Doll Envelopes (LC 354) — 2D LIS after clever sort

**Week 4 — Advanced patterns:**
- Buy and Sell Stock with Cooldown (LC 309) — state machine
- Buy and Sell Stock with at most K transactions (LC 188) — general K
- Burst Balloons (LC 312) — interval DP, think LAST operation
- Palindrome Partitioning II (LC 132) — 1D DP + palindrome precompute
- Regular Expression Matching (LC 10) — string DP with tricky transitions

---

## 2-Minute Cheat Sheet

```
DP = Overlapping Subproblems + Optimal Substructure

THE DERIVATION PROCESS:
  Decision → Choices → Smaller problem → State → Transition → Base → Order → Space

1D:    dp[i] = f(dp[i-1], dp[i-2])     → O(n) time, O(1) space possible
2D:    dp[i][j] = f(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])  → O(mn) time, O(n) space
Knapsack: dp[i][w] = max(skip, take if fits)  → iterate w RIGHT-TO-LEFT for 0/1
LCS:   match → dp[i-1][j-1]+1; else → max(dp[i-1][j], dp[i][j-1])
LIS:   dp[i] = max(dp[j]+1 for j<i where arr[j]<arr[i])
Edit:  match → dp[i-1][j-1]; else → 1 + min(replace, delete, insert)
Stock: states = {hold, sold, rest}; transitions follow state diagram

DP vs Greedy:  Greedy = local choice always globally optimal. DP = must try all choices.
DP vs BT:     Backtracking = enumerate all; DP = remember best seen so far.
DP vs D&C:    Divide & Conquer = no subproblem overlap; DP = subproblems overlap.

COMPLEXITY:
  1D      → O(n) time
  2D grid → O(m*n) time
  Knapsack → O(n*W) pseudo-polynomial
  Interval → O(n^3) time (3 nested loops)
  Bitmask  → O(2^n * n) time (n ≤ 20 only)
```

---

## Advanced Awareness

These patterns appear rarely in FAANG interviews but demonstrate mastery. Know they exist; do not memorize the full implementations unless targeting competitive programming.

**Digit DP:** Count numbers in [1, N] with a digit property (digit sum = K, no repeated digits, etc.). Build the number digit by digit, tracking a `tight` flag (are we still equal to N's prefix?) and a property-specific state. Complexity: O(digits × states × 10).

**Tree DP (Rerooting):** Compute an answer for every node as if it were the root. Compute for one root (O(n)), then "re-root" to each neighbor in O(1) by adjusting the DP values. Total: O(n). Used in problems like "minimum distance from each node to all others."

**Bitmask DP:** State is a bitmask representing which subset of n items (n ≤ 20) has been selected/visited. Canonical example: TSP. `dp[mask][i]` = min cost to visit exactly the cities in `mask`, ending at city i. Transition: extend to each unvisited city. Complexity: O(2^n × n²).

**DP Optimization Techniques** (for competitive programming):
- **Monotonic Queue Optimization:** When dp[i] = min(dp[j]) for j in a sliding window. Reduces O(nK) → O(n).
- **Convex Hull Trick (CHT):** When dp[i] = min(dp[j] + b[j] × a[i]). Each j defines a line; query is the minimum at x = a[i]. O(n) amortized with sorted slopes.
- **Divide & Conquer DP:** When the optimal split point k[i][j] is monotonically non-decreasing. Reduces O(n²K) → O(nK log n).
- **Knuth's Optimization:** Interval DP where optimal split point has monotone property. Reduces O(n³) → O(n²).
- **Aliens Trick (WQS Binary Search):** "Use exactly K groups" constraint. Binary search on a per-group penalty λ to force exactly K groups. Reduces one dimension of state.

These optimizations matter when naive DP is too slow (usually O(n³) or O(n²K)). In FAANG interviews, they appear very rarely but knowing they exist shows depth.

**Game Theory DP:** Two-player zero-sum games with perfect information. `dp[i][j]` = maximum score difference the CURRENT player achieves on game state [i..j]. The sign flip (minus dp[next_state]) encodes the opponent playing optimally. Nim games: XOR solution, no DP needed.

---

*Next: [10-TREES.md](10-TREES.md) — Hierarchical thinking, from traversals to LCA.*
