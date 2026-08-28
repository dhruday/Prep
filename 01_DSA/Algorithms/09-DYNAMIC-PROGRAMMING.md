# Dynamic Programming — 4 Core Patterns

> **12 DP patterns covered:** 1D Linear DP · 2D Grid DP · 0/1 Knapsack · Unbounded Knapsack · LCS/Edit Distance Family · LIS (Longest Increasing Subsequence) · State Machine DP · Interval DP · Bitmask DP · Digit DP · Tree DP · DP Optimizations

---

## Table of Contents
1. [Pattern 1: 1D Linear DP](#pattern-1-1d-linear-dp)
2. [Pattern 2: 2D Grid DP](#pattern-2-2d-grid-dp)
3. [Pattern 3: 0/1 Knapsack](#pattern-3-01-knapsack)
4. [Pattern 4: Unbounded Knapsack (Coin Change)](#pattern-4-unbounded-knapsack-coin-change)
5. [Pattern 5: LCS / Edit Distance Family](#pattern-5-lcs--edit-distance-family)
6. [Pattern 6: LIS — Longest Increasing Subsequence](#pattern-6-lis--longest-increasing-subsequence)
7. [Pattern 7: State Machine DP (Stock Problems)](#pattern-7-state-machine-dp-stock-problems)
8. [Pattern 8: Interval DP (Palindromes, Matrix Chain)](#pattern-8-interval-dp-palindromes-matrix-chain)
9. [Pattern 9: Bitmask DP](#pattern-9-bitmask-dp)
10. [Pattern 10: Digit DP](#pattern-10-digit-dp)
11. [Pattern 11: Tree DP](#pattern-11-tree-dp)
12. [Pattern 12: DP Optimizations](#pattern-12-dp-optimizations)

---

> *"DP = storing answers to smaller problems so we don't recompute them."*
> *Never start with a formula — always ask: what decision do I make at each step?*

---

## Pattern 1: 1D Linear DP

### What is it?
Process a 1D sequence left-to-right. At each index, make a decision (take/skip, jump/stay). The answer at position `i` depends on a few earlier positions. Classic problems: Climbing Stairs, House Robber.

### Visual
```
nums = [2, 7, 9, 3, 1]
dp:   [ 2, 7, 11, 11, 12 ]
         ↑   ↑
       skip  rob i=2: max(7, 2+9)=11
```

### Derivation
```
Decision: at house i, do I rob it or skip it?
Options:  ROB house i | SKIP house i
dp[i] means: "max money from houses 0..i"
Transition: dp[i] = max(dp[i-1], dp[i-2] + nums[i])
Base case:  dp[0] = nums[0], dp[1] = max(nums[0], nums[1])
```

### When to use / When NOT to use
- Use when decisions at each index only affect a bounded number of future indexes.
- Use for "max/min/count along a sequence" with a no-adjacent or jump constraint.
- NOT for 2D grids or problems where two sequences are compared (use 2D DP).

### How to recognize?
- "Can't pick adjacent elements", "jump up to K steps", "count ways to reach N"
- Single sequence, answer grows left-to-right.

### Why does it work?
The subproblem property — each position's answer can be computed from previously computed positions. No position needs to look ahead, only backward. This is what "optimal substructure" means in practice.

### Simple Example (Climbing Stairs, n=5)
| i | ways |
|---|------|
| 0 | 1    |
| 1 | 1    |
| 2 | 2    |
| 3 | 3    |
| 4 | 5    |
| 5 | 8    |

### Code
```java
// House Robber
public int rob(int[] nums) {
    int n = nums.length;
    if (n == 1) return nums[0];
    int prev2 = nums[0];
    int prev1 = Math.max(nums[0], nums[1]);
    for (int i = 2; i < n; i++) {
        int curr = Math.max(prev1, prev2 + nums[i]);
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}
```
```javascript
function rob(nums) {
    if (nums.length === 1) return nums[0];
    let prev2 = nums[0], prev1 = Math.max(nums[0], nums[1]);
    for (let i = 2; i < nums.length; i++) {
        [prev2, prev1] = [prev1, Math.max(prev1, prev2 + nums[i])];
    }
    return prev1;
}
```

### Dry Run
Climbing Stairs with n=5. dp[i] = number of ways to reach step i.

| Step | i | dp[i] | dp[i-1] | dp[i-2] | Reasoning |
|------|---|-------|---------|---------|-----------|
| Base | 0 | 1     | —       | —       | 1 way to stand at step 0 (do nothing) |
| Base | 1 | 1     | 1       | —       | only 1 way: one single step |
| i=2  | 2 | 2     | 1       | 1       | from step 1 (1-step) or step 0 (2-step): 1+1=2 |
| i=3  | 3 | 3     | 2       | 1       | from step 2 or step 1: 2+1=3 |
| i=4  | 4 | 5     | 3       | 2       | from step 3 or step 2: 3+2=5 |
| i=5  | 5 | 8     | 5       | 3       | from step 4 or step 3: 5+3=8 |

Answer: dp[5] = 8

### Complexity
Time: O(n) — one pass, O(1) work per index
Space: O(1) — only two variables needed (dp[i] uses dp[i-1] and dp[i-2])

### Common Trap + Experience Tip
Trap: forgetting `dp[1] = max(nums[0], nums[1])`, not just `nums[1]`.
Tip: if you can't space-optimize immediately, write the full array first, then shrink.

### Do Not Confuse With
| | 1D Linear DP | 2D DP |
|---|---|---|
| State | One variable defines the state (position, index, amount) | Two variables: two positions, or index + remaining capacity |
| Use when | You can describe the entire state with ONE number | You need two independent dimensions to describe the state |
| Example | House Robber, Climbing Stairs | Unique Paths, Longest Common Subsequence |

**Key distinction:** 1D DP: one variable defines the state (position, index, amount). 2D DP: two variables (two positions, index + remaining capacity). If you can describe the state with ONE number, it's 1D.

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 70 | Climbing Stairs | Easy | Fibonacci in disguise | https://leetcode.com/problems/climbing-stairs/ |
| 198 | House Robber | Medium | skip/take with gap constraint | https://leetcode.com/problems/house-robber/ |
| 746 | Min Cost Climbing Stairs | Easy | dp[i] = cost[i] + min(dp[i-1], dp[i-2]) | https://leetcode.com/problems/min-cost-climbing-stairs/ |
| 91 | Decode Ways | Medium | careful base cases, dp[i] += dp[i-2] only if two-digit valid | https://leetcode.com/problems/decode-ways/ |

### One-Minute Revision
```
PATTERN:    1D Linear DP
dp[i] MEANS: best answer considering elements 0..i
TRANSITION: dp[i] = max/min/sum of dp[i-1], dp[i-2] + current
BASE CASE:  dp[0] = nums[0], dp[1] = max/min(nums[0], nums[1])
TIME/SPACE: O(n) / O(1) after optimization
TRAP:       dp[1] base case must be max/min of first two, not just nums[1]
```

---

## Pattern 2: 2D Grid DP

### What is it?
Fill a 2D table where each cell's answer depends on neighbors (usually from above and left). Used for grid movement problems and problems with two independent varying parameters.

### Visual
```
Unique Paths 3×3:
[ 1, 1, 1 ]   ← top row base case (only move right)
[ 1, 2, 3 ]   ← dp[1][1] = dp[0][1]+dp[1][0] = 2
[ 1, 3, 6 ]   ← dp[2][2] = 3+3 = 6  ✓
```

### Derivation
```
Decision: to reach (i,j), which direction did I come from?
Options:  from above (i-1,j) | from left (i,j-1)
dp[i][j] means: "number of paths (or min cost) to reach cell (i,j)"
Transition: dp[i][j] = dp[i-1][j] + dp[i][j-1]           (Unique Paths)
            dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])  (Min Path Sum)
Base case:  dp[0][j] = 1, dp[i][0] = 1  (top row and left col = 1 path each)
```

### When to use / When NOT to use
- Use when moving through a grid with directional constraints (right/down only).
- Use when state has two dimensions that both change as you make decisions.
- NOT for grids with unrestricted movement (use BFS/DFS instead).

### How to recognize?
- Grid + "how many paths" or "minimum cost path" from top-left to bottom-right.
- Movement restricted to right/down (no backtracking).

### Why does it work?
Every cell's value depends only on the cell above and the cell to the left (for grid problems) or on two independent indices (for two-string problems). This creates a DAG of dependencies that can be filled in one pass.

### Simple Example (Min Path Sum 3×3)
```
grid:        dp:
[1, 3, 1]   [1, 4, 5]
[1, 5, 1]   [2, 7, 6]
[4, 2, 1]   [6, 8, 7]  ← answer = 7
```

### Code
```java
// Unique Paths — space optimized to O(n)
public int uniquePaths(int m, int n) {
    int[] dp = new int[n];
    Arrays.fill(dp, 1);
    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[j] += dp[j - 1]; // dp[j] = above, dp[j-1] = left
        }
    }
    return dp[n - 1];
}
```
```javascript
function uniquePaths(m, n) {
    const dp = new Array(n).fill(1);
    for (let i = 1; i < m; i++)
        for (let j = 1; j < n; j++)
            dp[j] += dp[j - 1];
    return dp[n - 1];
}
```

### Dry Run
Unique Paths on a 3×3 grid. dp[i][j] = number of paths to reach cell (i,j) from (0,0).

|     | j=0 | j=1 | j=2 |
|-----|-----|-----|-----|
| i=0 | 1   | 1   | 1   |
| i=1 | 1   | 2   | 3   |
| i=2 | 1   | 3   | 6   |

Fill order: left to right, top to bottom.
- First row and first column are all 1 (only one direction to reach them).
- dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1 = **2**
- dp[1][2] = dp[0][2] + dp[1][1] = 1 + 2 = **3**
- dp[2][1] = dp[1][1] + dp[2][0] = 2 + 1 = **3**
- dp[2][2] = dp[1][2] + dp[2][1] = 3 + 3 = **6**

Answer: dp[2][2] = 6

### Complexity
Time: O(m×n) — every cell visited once
Space: O(n) — rolling 1D array replaces the 2D table (row only depends on row above)

### Common Trap + Experience Tip
Trap: for obstacles (LC 63), set `dp[0][j] = 0` as soon as you hit a blocked cell in the base case — all cells to the right of a top-row obstacle are unreachable.
Tip: write the 2D table solution first, then collapse to 1D array row-by-row.

### Do Not Confuse With
| | 2D Grid DP | 1D DP (space-optimized) |
|---|---|---|
| Structure | Full 2D table dp[i][j], or collapsed to a rolling 1D array | A 1D array dp[j] that looks identical after optimization |
| Recurrence | dp[i][j] depends on dp[i-1][j] and dp[i][j-1] | Same recurrence — the 1D version is the memory-optimized form |
| Use when | Two independent dimensions govern the state | Single dimension, or you've already collapsed the 2D table |

**Key distinction:** After space-optimizing 2D grid DP, it LOOKS like 1D. They are the same recurrence — the 1D version is just the memory-optimized form.

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 62 | Unique Paths | Medium | Classic 2D DP base pattern | https://leetcode.com/problems/unique-paths/ |
| 64 | Minimum Path Sum | Medium | Same structure, add grid[i][j] cost | https://leetcode.com/problems/minimum-path-sum/ |
| 63 | Unique Paths II | Medium | Blocked cells reset dp to 0 | https://leetcode.com/problems/unique-paths-ii/ |

### One-Minute Revision
```
PATTERN:    2D Grid DP
dp[i][j] MEANS: paths/cost to reach cell (i,j)
TRANSITION: dp[i][j] = dp[i-1][j] + dp[i][j-1]  (or + grid cost)
BASE CASE:  top row = 1, left col = 1 (for paths); row 0 & col 0 from grid (for cost)
TIME/SPACE: O(m×n) / O(n) with rolling array
TRAP:       obstacle in base case row/col zeroes out everything beyond it
```

---

## Pattern 3: 0/1 Knapsack

### What is it?
Given a set of items, each used at most once, decide whether to include each item to hit a target (sum, weight, etc.). Key property: iterating the capacity dimension **right-to-left** ensures each item is used at most once.

### Visual
```
Partition Equal Subset Sum — nums=[1,5,11,5], target=11
      cap: 0  1  2  3  4  5  6  7  8  9 10 11
after 1:  [T, T, F, F, F, F, F, F, F, F, F, F]
after 5:  [T, T, F, F, F, T, T, F, F, F, F, F]
after 11: [T, T, F, F, F, T, T, F, F, F, F, T] ✓
after 5:  [T, T, F, F, F, T, T, F, F, F, T, T] ✓
```

### Derivation
```
Decision: for each item, include it or skip it?
Options:  SKIP item i | TAKE item i (only if nums[i] <= current capacity)
dp[j] means: "can we form sum exactly j using items seen so far?"
Transition: dp[j] = dp[j] || dp[j - nums[i]]   (iterate j from target down to nums[i])
Base case:  dp[0] = true (sum 0 always achievable)
```

### When to use / When NOT to use
- Use when each item can be chosen at most once and you need exact target / feasibility.
- RIGHT-TO-LEFT capacity loop = 0/1 (each item once). LEFT-TO-RIGHT = unbounded.
- NOT when items are reusable (use unbounded knapsack — Pattern 4).

### How to recognize?
- "Partition into two equal subsets", "can we form target sum from a subset?"
- Finite set of items, each used 0 or 1 times.

### Why does it work?
Each item is a binary choice: take it or leave it. The dp[i][w] state captures "the best value using items 0..i with capacity w remaining." Once we've decided on item i, the optimal sub-answer for all remaining items only depends on the remaining capacity — not which specific items we chose.

### Simple Example (Target Sum → subset difference)
nums=[1,1,1,1,1], target=3 → count subsets with sum=4 (out of total sum 5)
dp after processing all 1s — count grows like Pascal's triangle.

### Code
```java
// Partition Equal Subset Sum
public boolean canPartition(int[] nums) {
    int sum = 0;
    for (int n : nums) sum += n;
    if (sum % 2 != 0) return false;
    int target = sum / 2;
    boolean[] dp = new boolean[target + 1];
    dp[0] = true;
    for (int num : nums) {
        for (int j = target; j >= num; j--) { // RIGHT-TO-LEFT = 0/1
            dp[j] = dp[j] || dp[j - num];
        }
    }
    return dp[target];
}
```
```javascript
function canPartition(nums) {
    const sum = nums.reduce((a, b) => a + b, 0);
    if (sum % 2 !== 0) return false;
    const target = sum / 2;
    const dp = new Array(target + 1).fill(false);
    dp[0] = true;
    for (const num of nums) {
        for (let j = target; j >= num; j--) { // RIGHT-TO-LEFT
            dp[j] = dp[j] || dp[j - num];
        }
    }
    return dp[target];
}
```

### Dry Run
3 items: weights=[2,3,4], values=[3,4,5], capacity=5. dp[i][w] = max value using items 0..i with capacity w.

|                    | w=0 | w=1 | w=2 | w=3 | w=4 | w=5 |
|--------------------|-----|-----|-----|-----|-----|-----|
| base (no items)    | 0   | 0   | 0   | 0   | 0   | 0   |
| item 0 (w=2, v=3)  | 0   | 0   | 3   | 3   | 3   | 3   |
| item 1 (w=3, v=4)  | 0   | 0   | 3   | 4   | 4   | 7   |
| item 2 (w=4, v=5)  | 0   | 0   | 3   | 4   | 5   | 7   |

Key take/skip comparisons:
- dp[1][5]: skip item 1 → dp[0][5]=3; take item 1 → dp[0][5-3]+4=3+4=**7** → max=7
- dp[2][5]: skip item 2 → dp[1][5]=7; take item 2 → dp[1][5-4]+5=0+5=5 → max=**7**

Answer: dp[2][5] = 7 (take item 0 value=3 + item 1 value=4)

### Complexity
Time: O(n × target) — n items × target capacity iterations
Space: O(target) — 1D rolling array (collapsed from O(n × target) 2D table)

### Common Trap + Experience Tip
Trap: iterating capacity left-to-right in 0/1 knapsack lets you pick the same item multiple times — always go right-to-left.
Tip: if you forget direction, ask "can I use this item again?" No → right-to-left.

### Do Not Confuse With
| | 0/1 Knapsack | Unbounded Knapsack |
|---|---|---|
| Item usage | Each item used AT MOST ONCE | Items can be reused unlimited times |
| Capacity loop direction | Right to left (j = target down to weight) | Left to right (j = 0 up to target) |
| "Take" recurrence | dp[i-1][w-weight] — previous row, item not re-usable | dp[i][w-weight] — same row, item re-usable |
| Example | Partition Equal Subset Sum | Coin Change |

**Key distinction:** 0/1: each item used AT MOST ONCE → iterate items outer, capacity inner, go right to left. Unbounded: items can repeat → same structure but the recurrence for "take" looks at dp[i][w-weight] not dp[i-1][w-weight].

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 416 | Partition Equal Subset Sum | Medium | Reduce to subset sum, target = sum/2 | https://leetcode.com/problems/partition-equal-subset-sum/ |
| 494 | Target Sum | Medium | Count subsets; transform to (sum+target)/2 | https://leetcode.com/problems/target-sum/ |
| 474 | Ones and Zeroes | Medium | 2D knapsack with two capacity dims | https://leetcode.com/problems/ones-and-zeroes/ |

### One-Minute Revision
```
PATTERN:    0/1 Knapsack
dp[j] MEANS: can we form sum j (or max value with capacity j)?
TRANSITION: dp[j] = dp[j] || dp[j - nums[i]]
BASE CASE:  dp[0] = true (or 0 for max-value variants)
TIME/SPACE: O(n × target) / O(target)
TRAP:       capacity loop must go RIGHT-TO-LEFT to prevent reusing items
```

---

## Pattern 4: Unbounded Knapsack (Coin Change)

### What is it?
Like 0/1 knapsack, but items can be reused unlimited times. Iterating capacity **left-to-right** naturally allows reuse because updated values are immediately available for the same item.

### Visual
```
Coin Change — coins=[1,3,4], amount=6
dp: [0, 1, 2, 1, 1, 2, 2]
     0  1  2  3  4  5  6
dp[3]=1 (one 3-coin), dp[6]=2 (3+3 or 4+1+1 → min=2)
```

### Derivation
```
Decision: what coin do I use last to make amount i?
Options:  each coin c where c <= i
dp[i] means: "minimum coins to make amount i"
Transition: dp[i] = min over all c: (dp[i - c] + 1)
Base case:  dp[0] = 0, dp[1..amount] = Infinity initially
```

### When to use / When NOT to use
- Use when items are reusable and you want min/max/count to reach a target.
- LEFT-TO-RIGHT capacity loop = unbounded. Contrast with 0/1 (right-to-left).
- NOT when each item can only be used once (use 0/1 knapsack).

### How to recognize?
- "Unlimited coins/items", "fewest coins to make change", "number of combinations"
- "Integer break", "decode" problems where you split a number repeatedly.

### Why does it work?
Since items can be used multiple times, "using item i and still considering item i" is valid. The state dp[w] means "best value achievable with exactly capacity w." Each new capacity can build on any earlier capacity — including itself after a previous update in the same pass.

### Simple Example (Coin Change II — count ways, coins=[1,2,5], amount=5)
| amount | ways |
|--------|------|
| 0 | 1 |
| 1 | 1 |
| 2 | 2 |
| 3 | 2 |
| 4 | 3 |
| 5 | 4 |

### Code
```java
// Coin Change — minimum coins
public int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1); // sentinel for "impossible"
    dp[0] = 0;
    for (int i = 1; i <= amount; i++) {
        for (int coin : coins) {
            if (coin <= i) {
                dp[i] = Math.min(dp[i], dp[i - coin] + 1);
            }
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}
```
```javascript
function coinChange(coins, amount) {
    const dp = new Array(amount + 1).fill(amount + 1);
    dp[0] = 0;
    for (let i = 1; i <= amount; i++) {
        for (const coin of coins) {
            if (coin <= i) dp[i] = Math.min(dp[i], dp[i - coin] + 1);
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}
```

### Dry Run
Coin Change — coins=[1,2,5], amount=6. dp[w] = minimum coins to make amount w.

| w      | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|--------|---|---|---|---|---|---|---|
| Init   | 0 | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ |
| Result | 0 | 1 | 1 | 2 | 2 | 1 | 2 |

Fill trace (all coins tried at each amount):
- dp[1]: coin=1 → dp[0]+1=1. **dp[1]=1**
- dp[2]: coin=1 → dp[1]+1=2; coin=2 → dp[0]+1=1. **dp[2]=1**
- dp[3]: coin=1 → dp[2]+1=2; coin=2 → dp[1]+1=2. **dp[3]=2**
- dp[4]: coin=1 → dp[3]+1=3; coin=2 → dp[2]+1=2. **dp[4]=2**
- dp[5]: coin=1 → dp[4]+1=3; coin=2 → dp[3]+1=3; coin=5 → dp[0]+1=1. **dp[5]=1**
- dp[6]: coin=1 → dp[5]+1=2; coin=2 → dp[4]+1=3; coin=5 → dp[1]+1=2. **dp[6]=2**

Answer: dp[6] = 2 (coins: 1+5)

### Complexity
Time: O(amount × coins.length) — fill each amount slot by trying every coin
Space: O(amount) — only the 1D dp array needed

### Common Trap + Experience Tip
Trap: initializing dp with 0 instead of Infinity means impossible states silently return 0 — always use a sentinel like `amount + 1`.
Tip: Coin Change (min coins) vs Coin Change II (count ways) differ only in the transition (`min` vs `+=`). Know both.

### Do Not Confuse With
| | Unbounded Knapsack | 0/1 Knapsack |
|---|---|---|
| Item usage | Items can be reused unlimited times | Each item used AT MOST ONCE |
| Capacity loop direction | Left to right (j = 0 up to target) | Right to left (j = target down to weight) |
| "Take" recurrence | dp[i][w-weight] — same row, item re-usable | dp[i-1][w-weight] — previous row, item not re-usable |
| Example | Coin Change, Integer Break | Partition Equal Subset Sum |

**Key distinction:** Unbounded: items can repeat → left to right, "take" reads dp[i][w-weight]. 0/1: each item once → right to left, "take" reads dp[i-1][w-weight].

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 322 | Coin Change | Medium | Min coins; fill with sentinel infinity | https://leetcode.com/problems/coin-change/ |
| 518 | Coin Change II | Medium | Count combinations; dp[i] += dp[i-coin] | https://leetcode.com/problems/coin-change-ii/ |
| 343 | Integer Break | Medium | dp[i] = max split into 2+ parts | https://leetcode.com/problems/integer-break/ |

### One-Minute Revision
```
PATTERN:    Unbounded Knapsack
dp[i] MEANS: min coins (or ways) to form amount i
TRANSITION: dp[i] = min(dp[i - coin] + 1)  for each coin
BASE CASE:  dp[0] = 0, rest = Infinity (or 0 for count problems)
TIME/SPACE: O(amount × coins) / O(amount)
TRAP:       initialize dp with sentinel (amount+1), not 0 — else impossible→0
```

---

## DP Quick Reference

| Pattern | State | Transition | Capacity Loop | Time | Space |
|---------|-------|------------|---------------|------|-------|
| **1D Linear** | `dp[i]` | `max(dp[i-1], dp[i-2] + val)` | left → right | O(n) | O(1) |
| **2D Grid** | `dp[i][j]` | `dp[i-1][j] + dp[i][j-1]` | row by row | O(m×n) | O(n) |
| **0/1 Knapsack** | `dp[j]` | `dp[j] \|\| dp[j-num]` | **right → left** | O(n×W) | O(W) |
| **Unbounded Knapsack** | `dp[i]` | `min(dp[i-coin]+1)` | **left → right** | O(W×coins) | O(W) |

**The one rule to remember:**
- 0/1 (each item once) → iterate capacity **right-to-left**
- Unbounded (items reusable) → iterate capacity **left-to-right**

---

## Pattern 5: LCS / Edit Distance Family

### What is it?
2D DP on two strings. `dp[i][j]` encodes the answer for the first i characters of s1 and first j characters of s2. When characters match, extend the diagonal; on mismatch, take the best of neighboring cells.

### Visual
LCS of "ABCBDAB" (m=7) and "BDCAB" (n=5):
```
    ""  B  D  C  A  B
""   0  0  0  0  0  0
A    0  0  0  0  1  1
B    0  1  1  1  1  2
C    0  1  1  2  2  2
B    0  1  1  2  2  3
D    0  1  2  2  2  3
A    0  1  2  2  3  3
B    0  1  2  2  3  4   ← LCS length = 4
```

### How does it work?
Build a 2D table row by row. For each pair (i, j):
- If `s1[i-1] == s2[j-1]`: characters match, so extend the best answer from `dp[i-1][j-1]` by 1.
- Otherwise: take the better of ignoring s1's last char (`dp[i-1][j]`) or s2's last char (`dp[i][j-1]`).

### Why does it work?
Optimal substructure: LCS of s1[0..i] and s2[0..j] reduces to a smaller subproblem. If the last chars match, they must both be in the LCS. If not, at least one is excluded, so we try both exclusions and take the max. This holds for Edit Distance too, with three operations (delete, insert, replace) instead of two directions.

### When to use? / When NOT to use?
- Use when the problem involves comparing two sequences for common elements, minimum edits, or interleaving.
- Use for "transform string A into string B", "longest common …", "shortest supersequence".
- NOT for single-string palindrome problems (use Interval DP — Pattern 8).
- NOT when elements must be contiguous — that's sliding window or 1D DP.

### How to recognize it in a problem?
- Two strings/arrays as input and the answer relates both.
- Keywords: "common subsequence", "edit distance", "minimum insertions/deletions", "interleaving".
- State naturally has two indices, one per string.

### Example problem
**Longest Common Subsequence** — given s1="abcde", s2="ace", find the length of the longest common subsequence → 3 ("ace").

### Code
```java
// Longest Common Subsequence
public int longestCommonSubsequence(String s1, String s2) {
    int m = s1.length(), n = s2.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}

// Edit Distance
public int minDistance(String word1, String word2) {
    int m = word1.length(), n = word2.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1.charAt(i - 1) == word2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],
                               Math.min(dp[i - 1][j], dp[i][j - 1]));
            }
        }
    }
    return dp[m][n];
}
```
```javascript
// Longest Common Subsequence
function longestCommonSubsequence(s1, s2) {
    const m = s1.length, n = s2.length;
    const dp = Array.from({length: m + 1}, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i-1][j-1] + 1;
            else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        }
    }
    return dp[m][n];
}

// Edit Distance
function minDistance(word1, word2) {
    const m = word1.length, n = word2.length;
    const dp = Array.from({length: m + 1}, (_, i) =>
        Array.from({length: n + 1}, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (word1[i-1] === word2[j-1]) dp[i][j] = dp[i-1][j-1];
            else dp[i][j] = 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
        }
    }
    return dp[m][n];
}
```

### Dry Run
LCS("abcde", "ace"):
```
    ""  a  c  e
""   0  0  0  0
a    0  1  1  1
b    0  1  1  1
c    0  1  2  2
d    0  1  2  2
e    0  1  2  3   ← answer = 3
```

### Complexity
Time: O(m×n) — fill every cell of the 2D table once
Space: O(m×n) full table; reducible to O(min(m,n)) by keeping only two rows at a time

### Common traps
- Forgetting Edit Distance base cases: `dp[i][0] = i` and `dp[0][j] = j` (cost of inserting all characters from scratch).
- Confusing LCS (max, diagonal extension) with Edit Distance (min of three operations).
- Off-by-one: always use `s1.charAt(i-1)` not `s1.charAt(i)` because the dp table has an extra row/column.

### Experience Tip
For space optimization, keep only the previous row (`prev[]`) and the current row. For Edit Distance you can do it with a single row plus one variable for the diagonal value. Know this trick — it often comes up in follow-up questions.

### Do Not Confuse With
- **Longest Common Substring** (contiguous): `dp[i][j] = dp[i-1][j-1] + 1` on match, else 0 — no max-of-neighbors step.
- **Interval DP** (palindromes): single string, indices expand from both ends.
- **Edit Distance** is the same 2D pattern as LCS but with three operations instead of two directions.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 1143 | Longest Common Subsequence | Medium | Diagonal extension on match | https://leetcode.com/problems/longest-common-subsequence/ |
| 72 | Edit Distance | Hard | Three operations: delete / insert / replace | https://leetcode.com/problems/edit-distance/ |
| 1092 | Shortest Common Supersequence | Hard | SCS length = m + n − LCS | https://leetcode.com/problems/shortest-common-supersequence/ |
| 1035 | Uncrossed Lines | Medium | Identical to LCS — lines = common elements | https://leetcode.com/problems/uncrossed-lines/ |
| 97 | Interleaving String | Medium | dp[i][j] = can form t[0..i+j] from s1[0..i] and s2[0..j] | https://leetcode.com/problems/interleaving-string/ |

### One-Minute Revision
```
PATTERN:    LCS / Edit Distance Family (2D String DP)
dp[i][j] MEANS: answer for s1[0..i-1] and s2[0..j-1]
TRANSITION: match → dp[i-1][j-1]+1  |  mismatch → max(dp[i-1][j], dp[i][j-1])
BASE CASE:  dp[i][0]=i, dp[0][j]=j (edit dist) or all 0s (LCS)
TIME/SPACE: O(m×n) / O(min(m,n)) with row optimization
TRAP:       index into strings with i-1 (extra row/col shifts indices by 1)
```

---

## Pattern 6: LIS — Longest Increasing Subsequence

### What is it?
Find the length of the longest strictly increasing subsequence. Two approaches:
1. O(n²) DP: `dp[i]` = length of LIS ending at index i
2. O(n log n) Patience Sorting: maintain a `tails` array where binary search finds the correct insertion point

### Visual
Patience Sorting on arr = [10, 9, 2, 5, 3, 7, 101, 18]:
```
Process  10: tails = [10]
Process   9: replace 10  → tails = [9]
Process   2: replace  9  → tails = [2]
Process   5: extend      → tails = [2, 5]
Process   3: replace  5  → tails = [2, 3]
Process   7: extend      → tails = [2, 3, 7]
Process 101: extend      → tails = [2, 3, 7, 101]
Process  18: replace 101 → tails = [2, 3, 7, 18]
LIS length = tails.size() = 4
```

### How does it work?
**O(n²):** For each index i, scan every j < i. If `arr[j] < arr[i]`, arr[i] can extend the LIS ending at j. Take the maximum over all such j.

**O(n log n):** Maintain `tails` where `tails[k]` is the smallest possible tail element of any increasing subsequence of length k+1. For each new element, binary search for the leftmost position in `tails` that is >= the element, then replace (or extend if past the end).

### Why does it work?
The `tails` array is always sorted (invariant), enabling binary search. Replacing `tails[pos]` doesn't destroy any existing valid subsequence — it only makes future extensions cheaper by having a smaller tail element. The length of `tails` equals the LIS length at every step.

### When to use? / When NOT to use?
- Use for "longest increasing/non-decreasing subsequence", "maximum chain", envelope-nesting problems.
- Use O(n log n) when n can be up to 10^5.
- NOT for counting all LIS (requires O(n²) with a parallel count array).
- NOT when "subsequence" must be contiguous (use Kadane's or a sliding window).

### How to recognize it in a problem?
- "Longest increasing sequence", "maximum number of nested envelopes/boxes"
- After sorting one dimension of pairs, the problem reduces to LIS on the other dimension
- Chain-building where each element must be strictly greater than the previous

### Example problem
**Longest Increasing Subsequence** — given [10,9,2,5,3,7,101,18], return 4. One valid LIS is [2,3,7,18].

### Code
```java
// O(n²) DP
public int lengthOfLIS_n2(int[] nums) {
    int n = nums.length, max = 1;
    int[] dp = new int[n];
    Arrays.fill(dp, 1);
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
        }
        max = Math.max(max, dp[i]);
    }
    return max;
}

// O(n log n) Patience Sorting
public int lengthOfLIS(int[] nums) {
    List<Integer> tails = new ArrayList<>();
    for (int num : nums) {
        int lo = 0, hi = tails.size();
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            if (tails.get(mid) < num) lo = mid + 1;
            else hi = mid;
        }
        if (lo == tails.size()) tails.add(num);
        else tails.set(lo, num);
    }
    return tails.size();
}
```
```javascript
// O(n²) DP
function lengthOfLIS_n2(nums) {
    const n = nums.length;
    const dp = new Array(n).fill(1);
    let max = 1;
    for (let i = 1; i < n; i++) {
        for (let j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
        }
        max = Math.max(max, dp[i]);
    }
    return max;
}

// O(n log n) Patience Sorting
function lengthOfLIS(nums) {
    const tails = [];
    for (const num of nums) {
        let lo = 0, hi = tails.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (tails[mid] < num) lo = mid + 1;
            else hi = mid;
        }
        tails[lo] = num;
    }
    return tails.length;
}
```

### Dry Run
arr = [3, 10, 2, 1, 20] using O(n²):
```
dp[0]=1 (base)
dp[1]: nums[0]=3 < nums[1]=10 → dp[1]=dp[0]+1=2
dp[2]: no j where nums[j]<2   → dp[2]=1
dp[3]: no j where nums[j]<1   → dp[3]=1
dp[4]: j=0(3<20)→2, j=1(10<20)→3, j=2(2<20)→2, j=3(1<20)→2 → dp[4]=3
Answer: max(dp) = 3  (subsequence [3,10,20])
```

### Complexity
Time: O(n²) for naive DP; O(n log n) with patience sorting + binary search
Space: O(n) for the dp / tails array

### Common traps
- Using `<=` instead of `<` produces a non-decreasing (not strictly increasing) LIS.
- The `tails` array in patience sorting does NOT represent the actual LIS sequence — only its length. To reconstruct, maintain a separate parent/predecessor array.
- For Russian Doll Envelopes (2D), sort by width ASC and height DESC before LIS — the DESC prevents using two envelopes with the same width in the same subsequence.

### Experience Tip
Whenever you see "sort one dimension, then LIS on the other", the DESC trick on the second dimension is the standard interview curveball for 2D variants. Memorize it with the envelope analogy.

### Do Not Confuse With
- **Longest Common Subsequence**: two strings, 2D DP indexed by both strings — LIS is one array, 1D DP.
- **Longest Increasing Subarray** (contiguous): O(n) scan, no DP needed.
- **Maximum Sum Increasing Subsequence**: same O(n²) structure but accumulate sum instead of count.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 300 | Longest Increasing Subsequence | Medium | Implement both O(n²) and O(n log n) | https://leetcode.com/problems/longest-increasing-subsequence/ |
| 673 | Number of Longest Increasing Subsequences | Medium | Parallel count[] array alongside dp[] | https://leetcode.com/problems/number-of-longest-increasing-subsequences/ |
| 334 | Increasing Triplet Subsequence | Medium | Greedy with two variables — LIS idea compressed | https://leetcode.com/problems/increasing-triplet-subsequence/ |
| 354 | Russian Doll Envelopes | Hard | Sort w ASC h DESC; LIS on h values only | https://leetcode.com/problems/russian-doll-envelopes/ |
| 1048 | Longest String Chain | Medium | Sort by word length; LIS variant on word chains | https://leetcode.com/problems/longest-string-chain/ |

### One-Minute Revision
```
PATTERN:    LIS — Longest Increasing Subsequence
dp[i] MEANS: length of LIS ending at index i
TRANSITION: dp[i] = max(dp[j]+1) for all j<i where arr[j]<arr[i]
BASE CASE:  dp[i] = 1 (each element alone is a subsequence of length 1)
TIME/SPACE: O(n²)/O(n) naive | O(n log n)/O(n) patience sort
TRAP:       tails[] ≠ actual LIS; use DESC sort trick for 2D envelope problems
```

---

## Pattern 7: State Machine DP (Stock Problems)

### What is it?
Model the problem as transitions between explicit states (holding / not holding stock, cooldown, transaction count). `dp[day][state]` tracks maximum profit. At each step, decide which state to move to based on allowed transitions.

### Visual
State diagram for buy/sell with cooldown:
```
         buy                sell
NOT_HELD ──────────► HELD ──────────► COOLDOWN
   ▲                                      │
   └──────────────────────────────────────┘
              (next day: exit cooldown)

held     = max profit while holding stock
not_held = max profit while not holding, ready to buy
cooldown = max profit on the day immediately after selling
```

### How does it work?
Define one variable per state. Each day, derive new state values from the previous day's values:
- `held     = max(held, notHeld - price)` — keep holding, or buy today
- `cooldown = prevHeld + price`           — sell today (must use yesterday's held)
- `notHeld  = max(notHeld, cooldown)`     — stay idle, or exit yesterday's cooldown

### Why does it work?
Optimal substructure: max profit on day i in any given state depends only on day i-1 states. No earlier days matter, so O(1) variables suffice. The state machine forces enumeration of all legal transitions, preventing invalid sequences such as buying twice without selling in between.

### When to use? / When NOT to use?
- Use when the problem has discrete states with explicit allowed transitions (hold/sell/cooldown).
- Use when there is a transaction limit (at most k buys/sells adds a transaction dimension).
- NOT for grid/subsequence problems — different state shapes apply.
- NOT when operation order is unconstrained (greedy or sorting often suffices).

### How to recognize it in a problem?
- "Buy and sell stock", "at most k transactions", "with cooldown", "with fee"
- Explicit sequencing constraint: can't buy before selling, cooldown after sell, etc.
- State transitions form a small finite automaton over days

### Example problem
**Best Time to Buy and Sell Stock with Cooldown** — prices=[1,2,3,0,2], answer=3 (buy@1, sell@3, cooldown, buy@0, sell@2).

### Code
```java
// Best Time to Buy and Sell Stock with Cooldown
public int maxProfit(int[] prices) {
    int held = Integer.MIN_VALUE; // max profit while holding
    int notHeld = 0;              // max profit not holding, not in cooldown
    int cooldown = 0;             // max profit on cooldown day (just sold)
    for (int price : prices) {
        int prevHeld = held;
        held     = Math.max(held, notHeld - price); // keep holding or buy
        notHeld  = Math.max(notHeld, cooldown);     // stay idle or exit cooldown
        cooldown = prevHeld + price;                // sell today
    }
    return Math.max(notHeld, cooldown);
}

// At Most 2 Transactions (Stock III)
public int maxProfitIII(int[] prices) {
    int buy1 = Integer.MIN_VALUE, sell1 = 0;
    int buy2 = Integer.MIN_VALUE, sell2 = 0;
    for (int p : prices) {
        buy1  = Math.max(buy1,  -p);
        sell1 = Math.max(sell1, buy1 + p);
        buy2  = Math.max(buy2,  sell1 - p);
        sell2 = Math.max(sell2, buy2 + p);
    }
    return sell2;
}
```
```javascript
// Best Time to Buy and Sell Stock with Cooldown
function maxProfit(prices) {
    let held = -Infinity, notHeld = 0, cooldown = 0;
    for (const price of prices) {
        const prevHeld = held;
        held     = Math.max(held, notHeld - price);
        notHeld  = Math.max(notHeld, cooldown);
        cooldown = prevHeld + price;
    }
    return Math.max(notHeld, cooldown);
}

// At Most 2 Transactions (Stock III)
function maxProfitIII(prices) {
    let buy1 = -Infinity, sell1 = 0, buy2 = -Infinity, sell2 = 0;
    for (const p of prices) {
        buy1  = Math.max(buy1,  -p);
        sell1 = Math.max(sell1, buy1 + p);
        buy2  = Math.max(buy2,  sell1 - p);
        sell2 = Math.max(sell2, buy2 + p);
    }
    return sell2;
}
```

### Dry Run
prices = [1, 2, 3, 0, 2], cooldown variant:
```
Start:  held=-∞, notHeld=0, cooldown=0
Day 0 (p=1): prevHeld=-∞; held=max(-∞,0-1)=-1;  notHeld=max(0,0)=0;  cooldown=-∞+1≈-∞
Day 1 (p=2): prevHeld=-1; held=max(-1,0-2)=-1;  notHeld=max(0,-∞)=0; cooldown=-1+2=1
Day 2 (p=3): prevHeld=-1; held=max(-1,0-3)=-1;  notHeld=max(0,1)=1;  cooldown=-1+3=2
Day 3 (p=0): prevHeld=-1; held=max(-1,1-0)=1;   notHeld=max(1,2)=2;  cooldown=-1+0=-1
Day 4 (p=2): prevHeld=1;  held=max(1,2-2)=1;    notHeld=max(2,-1)=2; cooldown=1+2=3
Answer: max(notHeld=2, cooldown=3) = 3 ✓
```

### Complexity
Time: O(n) — single pass through prices
Space: O(1) — a constant number of state variables regardless of k (for fixed-k variants)

### Common traps
- Using the already-updated `held` (not `prevHeld`) when computing `cooldown` — this silently buys and sells on the same day.
- Initializing `held` to 0 instead of `-Infinity` — you spent money buying, so the initial profit from holding must start negative.
- For "at most k transactions" with large k, the 4-variable (k=2) trick generalizes to a 2D array `dp[k][2]`.

### Experience Tip
Draw the state machine on paper first — nodes are states, directed edges are transitions, edge labels are profit changes. Then each node becomes one variable and each edge becomes one `max(...)` line in code. This one-to-one mapping eliminates off-by-one errors.

### Do Not Confuse With
- **Greedy for unlimited transactions** (Stock II): simply sum all positive daily differences — no DP or state machine needed.
- **1D Linear DP**: no explicit finite states or transition diagram, just a recurrence over index.
- **LCS**: two-string comparison problem, not state transitions over time.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 121 | Best Time to Buy and Sell Stock | Easy | Single transaction; track running minimum | https://leetcode.com/problems/best-time-to-buy-and-sell-stock/ |
| 122 | Best Time to Buy and Sell Stock II | Medium | Unlimited transactions; greedy sum of positive gains | https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/ |
| 309 | Best Time to Buy and Sell Stock with Cooldown | Medium | Three-state machine: held / notHeld / cooldown | https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/ |
| 714 | Best Time to Buy and Sell Stock with Transaction Fee | Medium | Subtract fee on sell; two states suffice | https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/ |
| 123 | Best Time to Buy and Sell Stock III | Hard | At most 2 transactions; 4 variables buy1/sell1/buy2/sell2 | https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iii/ |

### One-Minute Revision
```
PATTERN:    State Machine DP (Stock Problems)
STATE:      held / notHeld / cooldown  (or buy1/sell1/buy2/sell2)
TRANSITION: held    = max(held, notHeld - price)
            cooldown = prevHeld + price
            notHeld  = max(notHeld, prev_cooldown)
TIME/SPACE: O(n) / O(1)
TRAP:       snapshot prevHeld before updating held; initialize held = -∞ not 0
```

---

## Pattern 8: Interval DP (Palindromes, Matrix Chain)

### What is it?
DP over all substrings/subarrays of increasing length. `dp[i][j]` answers the question for the range from index i to j. The outer loop runs over length, inner loops over start index and (for optimization problems) split point k.

### Visual
Diagonal filling of the dp table for palindrome detection on "babad":
```
     b  a  b  a  d
b  [ T  F  T  F  F ]   len=1: all T (single chars are palindromes)
a  [ -  T  F  T  F ]   len=2: T only if s[i]==s[j]
b  [ -  -  T  F  F ]   len=3: T if s[i]==s[j] AND dp[i+1][j-1]
a  [ -  -  -  T  F ]
d  [ -  -  -  -  T ]

Fill order: diagonals, from main diagonal outward →
Palindromic substrings: b, a, b, a, d, bab, aba  = 7 total
```

### How does it work?
Fill the table diagonal by diagonal (increasing length):
1. Base case (len=1): all single characters are palindromes, `dp[i][i] = true`.
2. Length 2: `dp[i][j] = (s[i] == s[j])`.
3. Length >= 3: `dp[i][j] = (s[i] == s[j]) && dp[i+1][j-1]`.

For optimization problems (burst balloons, matrix chain), enumerate all split points k in `[i, j-1]` and take `min/max(dp[i][k] + dp[k+1][j] + cost(i,k,j))`.

### Why does it work?
A substring s[i..j] is a palindrome if and only if its two outer characters match AND the inner substring s[i+1..j-1] is also a palindrome. Filling by increasing length guarantees that all inner (shorter) subproblems are already solved before the outer (longer) one is computed.

### When to use? / When NOT to use?
- Use when the answer for range [i,j] depends on answers for sub-ranges of the same array/string.
- Use for palindrome counting/subsequence, matrix chain multiplication, balloon bursting, "minimum cost to cut/merge".
- NOT for two-string problems (use 2D LCS DP — Pattern 5).
- NOT for non-overlapping interval scheduling (greedy, not DP).

### How to recognize it in a problem?
- Single array/string; the answer is defined over a contiguous range [i, j].
- Keywords: "palindromic substrings/subsequences", "minimum cost to split or merge intervals".
- Recurrence references `dp[i+1][j-1]` (shrink from outside) or `dp[i][k] + dp[k+1][j]` (split at k).

### Example problem
**Palindromic Substrings** — given "abc", count all palindromic substrings → 3 ("a","b","c"). Given "aaa" → 6 ("a","a","a","aa","aa","aaa").

### Code
```java
// Palindromic Substrings — count all
public int countSubstrings(String s) {
    int n = s.length(), count = 0;
    boolean[][] dp = new boolean[n][n];
    for (int len = 1; len <= n; len++) {
        for (int i = 0; i + len - 1 < n; i++) {
            int j = i + len - 1;
            if (s.charAt(i) == s.charAt(j) && (len <= 2 || dp[i + 1][j - 1])) {
                dp[i][j] = true;
                count++;
            }
        }
    }
    return count;
}

// Longest Palindromic Subsequence
public int longestPalindromeSubseq(String s) {
    int n = s.length();
    int[][] dp = new int[n][n];
    for (int i = 0; i < n; i++) dp[i][i] = 1;
    for (int len = 2; len <= n; len++) {
        for (int i = 0; i + len - 1 < n; i++) {
            int j = i + len - 1;
            if (s.charAt(i) == s.charAt(j)) dp[i][j] = dp[i + 1][j - 1] + 2;
            else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
        }
    }
    return dp[0][n - 1];
}
```
```javascript
// Palindromic Substrings — count all
function countSubstrings(s) {
    const n = s.length;
    const dp = Array.from({length: n}, () => new Array(n).fill(false));
    let count = 0;
    for (let len = 1; len <= n; len++) {
        for (let i = 0; i + len - 1 < n; i++) {
            const j = i + len - 1;
            if (s[i] === s[j] && (len <= 2 || dp[i+1][j-1])) {
                dp[i][j] = true;
                count++;
            }
        }
    }
    return count;
}

// Longest Palindromic Subsequence
function longestPalindromeSubseq(s) {
    const n = s.length;
    const dp = Array.from({length: n}, (_, i) =>
        Array.from({length: n}, (_, j) => i === j ? 1 : 0));
    for (let len = 2; len <= n; len++) {
        for (let i = 0; i + len - 1 < n; i++) {
            const j = i + len - 1;
            if (s[i] === s[j]) dp[i][j] = dp[i+1][j-1] + 2;
            else dp[i][j] = Math.max(dp[i+1][j], dp[i][j-1]);
        }
    }
    return dp[0][n-1];
}
```

### Dry Run
Longest Palindromic Subsequence on "bbbab":
```
len=1: dp[0][0]=dp[1][1]=dp[2][2]=dp[3][3]=dp[4][4]=1
len=2: b==b→dp[0][1]=2; b==b→dp[1][2]=2; b!=a→dp[2][3]=1; a!=b→dp[3][4]=1
len=3: b==b→dp[0][2]=dp[1][1]+2=3; b!=a→dp[1][3]=max(dp[2][3],dp[1][2])=max(1,2)=2
       b!=b? s[2]='b',s[4]='b'→dp[2][4]=dp[3][3]+2=3
len=4: b!=a→dp[0][3]=max(dp[1][3],dp[0][2])=max(2,3)=3
       b==b→dp[1][4]=dp[2][3]+2=1+2=3
len=5: b==b (s[0]='b',s[4]='b')→dp[0][4]=dp[1][3]+2=2+2=4
Answer: dp[0][4] = 4  ✓  (subsequence "bbbb")
```

### Complexity
Time: O(n²) for palindrome check/count; O(n³) when enumerating split points (matrix chain, burst balloons)
Space: O(n²) for the 2D table

### Common traps
- Iterating by starting index (outer i, inner j) rather than by length — you access `dp[i+1][j-1]` before it is computed.
- For Longest Palindromic Subsequence, on mismatch take `max(dp[i+1][j], dp[i][j-1])`, NOT `dp[i+1][j-1]`.
- When len == 2, `dp[i+1][j-1]` means `dp[j][i]` which is out of range — always guard with `len <= 2` before checking the inner cell.

### Experience Tip
Always fill interval DP tables by increasing length, never by starting index. Sketch the diagonal sweep direction on paper first. For "split point" problems the inner loop over k is the telltale sign — it pushes time complexity from O(n²) to O(n³), so mention it when discussing trade-offs.

### Do Not Confuse With
- **LCS / Edit Distance**: two separate strings with a 2D table indexed by a position in each — not a single-string range [i,j].
- **Expand Around Center** (Manacher's): O(n) technique for longest palindromic substring (contiguous), not subsequences.
- **Greedy Interval Scheduling**: selects non-overlapping intervals without any recurrence over sub-intervals.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 647 | Palindromic Substrings | Medium | Fill by length; count every cell where dp[i][j]=true | https://leetcode.com/problems/palindromic-substrings/ |
| 516 | Longest Palindromic Subsequence | Medium | LPS = LCS(s, reverse(s)) — or direct interval DP | https://leetcode.com/problems/longest-palindromic-subsequence/ |
| 1547 | Minimum Cost to Cut a Stick | Hard | dp[i][j] = min cost to make all cuts within segment; O(n³) | https://leetcode.com/problems/minimum-cost-to-cut-a-stick/ |
| 664 | Strange Printer | Hard | dp[i][j]: minimum turns to print s[i..j] | https://leetcode.com/problems/strange-printer/ |
| 312 | Burst Balloons | Hard | Enumerate last balloon to burst in range [i,j] | https://leetcode.com/problems/burst-balloons/ |

### One-Minute Revision
```
PATTERN:    Interval DP (Palindromes, Matrix Chain, Burst Balloons)
dp[i][j] MEANS: answer for the range / substring from i to j inclusive
TRANSITION: match   → dp[i+1][j-1] + 2
            mismatch→ max(dp[i+1][j], dp[i][j-1])
            split   → min/max over k: dp[i][k] + dp[k+1][j] + cost
BASE CASE:  dp[i][i] = 1 (single char); dp[i][i-1] = 0 (empty)
TIME/SPACE: O(n²) palindrome | O(n³) with split point | O(n²) space
TRAP:       fill by LENGTH not by index; guard len==2 before accessing dp[i+1][j-1]
```

---

## Pattern 9: Bitmask DP

### What is it?
A **bitmask** is an integer where each bit represents whether something is "in the set" or "not in the set". For example, with 3 cities labeled 0, 1, 2: the integer `5` in binary is `101`, meaning cities 0 and 2 are visited and city 1 is not. Bitmask DP uses these integers as DP state, letting you track all possible subsets of a small set (n ≤ 20) without storing a list — one integer encodes the entire subset.

### Visual
```
3 cities: 0, 1, 2
All possible masks (which cities have been visited):
  000 = 0  → {}        010 = 2  → {1}       100 = 4  → {2}
  001 = 1  → {0}       011 = 3  → {0,1}     101 = 5  → {0,2}
                        110 = 6  → {1,2}     111 = 7  → {0,1,2} ← all visited

State: dp[mask][last] = min cost to visit exactly the cities in mask, ending at city last

Initial:
  dp[001][0] = 0   (start at city 0, only city 0 visited, cost 0)
  all other dp = ∞

Expand dp[001][0]=0 using dist=[[0,10,15],[10,0,20],[15,20,0]]:
  → go to city 1: dp[011][1] = 0 + dist[0][1] = 10
  → go to city 2: dp[101][2] = 0 + dist[0][2] = 15

Expand dp[011][1]=10:
  → go to city 2: dp[111][2] = 10 + dist[1][2] = 30

Expand dp[101][2]=15:
  → go to city 1: dp[111][1] = 15 + dist[2][1] = 35

Final: min(dp[111][1]+dist[1][0], dp[111][2]+dist[2][0]) = min(35+10, 30+15) = 45
```

### How does it work?
1. **State definition:** `dp[mask][i]` = minimum cost to visit exactly the cities encoded in `mask`, with the last city visited being city `i`.
2. **Initialize:** `dp[1 << start][start] = 0`. All other states = infinity.
3. **Transition:** For each (mask, i) pair where city i is in mask, try every unvisited city j:
   `dp[mask | (1 << j)][j] = min(dp[mask | (1 << j)][j],  dp[mask][i] + dist[i][j])`
4. **Answer:** After processing all masks, return `min over all i` of `dp[(1<<n)-1][i] + dist[i][start]`.

### Why does it work?
The key insight: two paths that visited the same set of cities and ended at the same city are interchangeable for any future decision. No matter how a path arrived at city i having visited set S, the cheapest way to complete the tour from that point is identical. The bitmask captures exactly that "what matters" state — which subset was visited and where we are now.

### When to use?
- Traveling Salesman Problem (TSP): shortest route visiting all cities exactly once.
- Assignment problems: assign n workers to n tasks at minimum total cost, where n ≤ 15.
- "Cover all elements" problems where you need to track which elements from a small set have been handled.

### When NOT to use?
- When n > 20: the state space 2^n × n grows exponentially (2^20 = ~1M states is manageable; 2^25 is not).
- When a simpler DP pattern applies — if items are independent and you just need a subset sum, use 0/1 Knapsack instead.

### How to recognize in a new problem?
The problem involves a small set (n ≤ 20) and asks for the min/max cost to process all elements, where the order or assignment matters.
Key signals:
- "Visit all cities/nodes exactly once"
- "Assign each person to exactly one task" with small n
- "Minimum cost to cover all elements"
- "Number of ways to pair up all elements"

### Simple Example
**Problem:** TSP — find the shortest round trip visiting all 3 cities exactly once.
**Input:** dist = [[0,10,15],[10,0,20],[15,20,0]], start = city 0
**State definition:** dp[mask][i] = min cost visiting cities in mask, ending at city i
**Recurrence:** `dp[mask | (1<<j)][j] = min(dp[mask | (1<<j)][j], dp[mask][i] + dist[i][j])`
**Trace:** (see Visual above — answer is 45)

### Code
```java
// Java — Bitmask DP (TSP)
public int tsp(int[][] dist) {
    int n = dist.length;
    int full = (1 << n) - 1;            // bitmask with all cities visited
    int[][] dp = new int[1 << n][n];
    for (int[] row : dp) Arrays.fill(row, Integer.MAX_VALUE / 2);
    dp[1][0] = 0;                        // start at city 0, cost 0

    for (int mask = 1; mask <= full; mask++) {
        for (int i = 0; i < n; i++) {
            if ((mask & (1 << i)) == 0) continue;  // city i not in mask — skip
            if (dp[mask][i] == Integer.MAX_VALUE / 2) continue;
            for (int j = 0; j < n; j++) {
                if ((mask & (1 << j)) != 0) continue;  // city j already visited
                int next = mask | (1 << j);
                dp[next][j] = Math.min(dp[next][j], dp[mask][i] + dist[i][j]);
            }
        }
    }

    int ans = Integer.MAX_VALUE;
    for (int i = 1; i < n; i++) {
        ans = Math.min(ans, dp[full][i] + dist[i][0]); // return to start city 0
    }
    return ans;
}
```
```javascript
// JavaScript — Bitmask DP (TSP)
function tsp(dist) {
    const n = dist.length;
    const full = (1 << n) - 1;
    const INF = Infinity;
    const dp = Array.from({length: 1 << n}, () => new Array(n).fill(INF));
    dp[1][0] = 0;  // start at city 0

    for (let mask = 1; mask <= full; mask++) {
        for (let i = 0; i < n; i++) {
            if (!(mask & (1 << i))) continue;   // city i not in mask
            if (dp[mask][i] === INF) continue;
            for (let j = 0; j < n; j++) {
                if (mask & (1 << j)) continue;  // city j already visited
                const next = mask | (1 << j);
                dp[next][j] = Math.min(dp[next][j], dp[mask][i] + dist[i][j]);
            }
        }
    }

    let ans = INF;
    for (let i = 1; i < n; i++) {
        if (dp[full][i] < INF) ans = Math.min(ans, dp[full][i] + dist[i][0]);
    }
    return ans;
}
```

### Dry Run
dist (3 cities): [[0,10,15],[10,0,20],[15,20,0]]
```
mask=001(1), i=0: dp[001][0]=0
  → j=1: dp[011][1] = min(INF, 0+10) = 10
  → j=2: dp[101][2] = min(INF, 0+15) = 15

mask=011(3), i=1: dp[011][1]=10
  → j=2: dp[111][2] = min(INF, 10+20) = 30

mask=101(5), i=2: dp[101][2]=15
  → j=1: dp[111][1] = min(INF, 15+20) = 35

mask=111(7): all cities visited, no expansion

Answer = min(dp[111][1]+dist[1][0], dp[111][2]+dist[2][0])
       = min(35+10, 30+15) = 45
```

### Complexity
```
Time:  O(2^n × n²) — 2^n masks × n possible last cities × n candidate next cities
Space: O(2^n × n) — the dp table
```

### Common Trap
Beginners forget to check that city i is actually in the current mask before treating it as the "current city". Always guard with `if ((mask & (1 << i)) == 0) continue` — otherwise you compute transitions from cities you haven't visited yet, producing garbage values.

### Experience Tip
The two bitwise operations to internalize: `mask & (1 << i)` tests if city i is in the set; `mask | (1 << j)` produces a new set with city j added. Practice reading masks as binary strings out loud until these feel like second nature. Once you can draw one expansion step on paper, the full algorithm follows automatically.

### Do Not Confuse With

| | Bitmask DP | 0/1 Knapsack |
|---|---|---|
| State represents | Which subset of nodes/tasks was processed | Whether each item is included (budget constraint) |
| Use when | n ≤ 20, order/assignment of the full set matters | Items have a capacity limit; order doesn't matter |
| Example | TSP, minimum cost assignment | Partition equal subset sum |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 847 | Shortest Path Visiting All Nodes | Hard | "Visit all nodes" on small graph (n ≤ 12) | https://leetcode.com/problems/shortest-path-visiting-all-nodes/ |
| 526 | Beautiful Arrangement | Medium | Count permutations of small n (n ≤ 15) | https://leetcode.com/problems/beautiful-arrangement/ |
| 698 | Partition to K Equal Sum Subsets | Medium | Assign each element to one of k buckets | https://leetcode.com/problems/partition-to-k-equal-sum-subsets/ |
| 1434 | Number of Ways to Wear Different Hats | Hard | Assign hats to people; bitmask over people | https://leetcode.com/problems/number-of-ways-to-wear-different-hats-to-each-other/ |
| 1986 | Minimum Work Sessions to Finish Tasks | Medium | Pack tasks into sessions; subset tracking | https://leetcode.com/problems/minimum-number-of-work-sessions-to-finish-the-tasks/ |
| 1879 | Minimum XOR Sum of Two Arrays | Hard | Pair up all elements; bitmask over assignments | https://leetcode.com/problems/minimum-xor-sum-of-two-arrays/ |

### One-Minute Revision
```
DP PATTERN:      Bitmask DP
STATE MEANS:     dp[mask][i] = min cost visiting cities in mask, ending at city i
USE WHEN:        n ≤ 20 and you must track which subset of elements was chosen
RECURRENCE:      dp[mask|(1<<j)][j] = min(dp[mask|(1<<j)][j], dp[mask][i] + cost[i][j])
TIME/SPACE:      O(2^n × n²) / O(2^n × n)
TRAP:            Only treat city i as "current" if (mask & (1<<i)) != 0
SIGNAL:          "visit all", "assign each to exactly one", "cover all elements"
```

---

## Pattern 10: Digit DP

### What is it?
Digit DP counts how many integers in a range [0, N] satisfy some digit-by-digit constraint (digit sum ≤ k, no two consecutive digits the same, no digit 4, etc.). You build the answer digit by digit from the most significant position. The crucial idea is a boolean **tight** flag: if tight is `true`, the digit you place right now cannot exceed N's digit at that position (because your prefix already equals N's prefix exactly). If tight is `false`, you exceeded some earlier digit of N, so you are "free" and can place 0–9 anywhere.

### Visual
```
Count numbers in [1, 23] where all digits are distinct:
N = "23"

Position 0 (tens digit), tight=true:
  d=0: prefix "0" < N's "2" → next position is FREE (tight=false)
  d=1: prefix "1" < N's "2" → next position is FREE (tight=false)
  d=2: prefix "2" = N's "2" → next position is TIGHT (tight=true)
  d=3..9: NOT allowed (tight=true and N's digit is 2, so limit is 2)

Position 1 (units digit):
  tight=false → digits 0..9 all available → 10 choices each (for prefixes "0_" and "1_")
  tight=true  → digits 0..3 available (≤ N's units digit 3) → 4 choices (for prefix "2_")

Total = 10 + 10 + 4 = 24 numbers (including 00=0, subtract if needed)
```

### How does it work?
1. Convert N to its digit array: `digits = [2, 3]` for N=23.
2. Write a memoized recursive function `solve(pos, tight, ...other_state...)`.
3. At each position, iterate digit d from 0 to `limit` where `limit = digits[pos]` if tight, else 9.
4. Recurse: `solve(pos+1, tight && (d == digits[pos]), updated_state)`.
5. The "other state" tracks whatever constraint you need (digit sum so far, last digit placed, count of zeros, etc.).
6. Memoize on `(pos, tight, other_state)` — the count is identical whenever these three match, regardless of how we reached this state.

### Why does it work?
Once tight becomes false, the remaining suffix is unconstrained and its count depends only on how many positions remain and the current tracked state — not on the specific prefix chosen. Memoization reuses these identical sub-problems. The tight flag precisely separates the one "constrained" path down N's digits from all the "free" paths below it.

### When to use?
- Count integers in [0, N] satisfying a property expressible digit-by-digit.
- Count integers in [L, R] (compute f(R) − f(L−1)).
- Problems phrased as "how many numbers from 1 to n have property X on their digits".

### When NOT to use?
- When N is small (n ≤ 10^4): just iterate and check each number directly.
- When the constraint cannot be decomposed digit-by-digit (e.g., "is the number prime?" — primality testing cannot be tracked with a small state per digit).

### How to recognize in a new problem?
The problem asks to count or sum something over all integers in a range, and the condition decomposes cleanly one digit at a time.
Key signals:
- "Count integers from 1 to n with [digit property]"
- "Digit sum equal to / at most k"
- "No two consecutive digits are the same"
- "Digits in non-decreasing order"

### Simple Example
**Problem:** Count numbers in [1, N] whose digit sum is at most S.
**Input:** N = 20, S = 3
**State definition:** `dp[pos][sum][tight]` = count of valid completions from position `pos` onward, given digit sum so far = `sum`, tight flag = `tight`
**Recurrence:** `dp[pos][sum][tight] = sum over d in [0..limit] of dp[pos+1][sum+d][newTight]`
**Trace:**
```
N = "20", S = 3
Numbers ≤ 20 with digit sum ≤ 3:
  1,2,3,10,11,12,20 → 7 numbers (plus 0, so count including 0 = 8)

solve(pos=0, sum=0, tight=true):
  d=0: solve(1, 0, false)  → free, digits 0..9, sum+d≤3 → d can be 0,1,2,3 → 4 numbers
  d=1: solve(1, 1, false)  → free, sum+d≤2 → d can be 0,1,2 → 3 numbers
  d=2: solve(1, 2, tight=true) → limit=0 (N's digit is 0), only d=0 → 1 number (20)
  Total including 0 = 4+3+1 = 8 → subtract 1 for zero = 7
```

### Code
```java
// Java — Digit DP (count numbers in [1,n] with digit sum ≤ sumLimit)
class DigitDP {
    int[] digits;
    int sumLimit;
    int[][][] memo; // [pos][currentSum][tight]

    public int count(int n, int sumLimit) {
        this.sumLimit = sumLimit;
        String s = Integer.toString(n);
        digits = new int[s.length()];
        for (int i = 0; i < s.length(); i++) digits[i] = s.charAt(i) - '0';
        memo = new int[digits.length][sumLimit + 1][2];
        for (int[][] a : memo) for (int[] b : a) Arrays.fill(b, -1);
        return solve(0, 0, 1) - 1; // subtract 1 to exclude 0 itself
    }

    int solve(int pos, int sum, int tight) {
        if (sum > sumLimit) return 0;        // digit sum exceeded limit
        if (pos == digits.length) return 1;  // placed all digits, valid number
        if (memo[pos][sum][tight] != -1) return memo[pos][sum][tight];

        int limit = tight == 1 ? digits[pos] : 9;
        int result = 0;
        for (int d = 0; d <= limit; d++) {
            int newTight = (tight == 1 && d == digits[pos]) ? 1 : 0;
            result += solve(pos + 1, sum + d, newTight);
        }
        return memo[pos][sum][tight] = result;
    }
}
```
```javascript
// JavaScript — Digit DP (count numbers in [1,n] with digit sum ≤ sumLimit)
function countDigitDP(n, sumLimit) {
    const digits = String(n).split('').map(Number);
    const len = digits.length;
    // memo[pos][sum][tight (0 or 1)]
    const memo = Array.from({length: len}, () =>
        Array.from({length: sumLimit + 1}, () => new Array(2).fill(-1)));

    function solve(pos, sum, tight) {
        if (sum > sumLimit) return 0;
        if (pos === len) return 1;
        if (memo[pos][sum][tight] !== -1) return memo[pos][sum][tight];

        const limit = tight ? digits[pos] : 9;
        let result = 0;
        for (let d = 0; d <= limit; d++) {
            const newTight = (tight && d === digits[pos]) ? 1 : 0;
            result += solve(pos + 1, sum + d, newTight);
        }
        return memo[pos][sum][tight] = result;
    }

    return solve(0, 0, 1) - 1; // subtract 1 to exclude 0
}
```

### Dry Run
Count numbers ≤ 15 that contain no digit > 5:
```
digits = [1, 5]

solve(pos=0, sum=0, tight=true):
  d=0: tight→false; solve(1,0,false): d=0..5 → 6 numbers (00..05)
  d=1: tight→true;  solve(1,0,true):  limit=5; d=0..5 → 6 numbers (10..15)
  d=2..9: not allowed (tight=true, limit=digits[0]=1)

Total including 0 = 6+6 = 12 → subtract 0 → 11 valid numbers: {1,2,3,4,5,10,11,12,13,14,15}
```

### Complexity
```
Time:  O(len × S × 2 × 10) — positions × state values × tight flag × 10 digit choices
Space: O(len × S × 2) — the memoization table
```

### Common Trap
Forgetting **leading zeros**. If the number "007" should be treated as "7" (a 1-digit number), a plain digit DP may count the zero digits toward your constraint. The fix: add a `started` boolean flag that turns true once the first non-zero digit is placed, and skip constraints while `started` is false.

### Experience Tip
Always build digit DP as top-down memoized recursion first — the recursive structure mirrors the decision tree naturally. Get the skeleton (pos, tight, base cases) working before adding your specific constraint state. Once you understand why tight works, every digit DP problem reduces to "what additional state do I need beyond pos and tight?"

### Do Not Confuse With

| | Digit DP | 1D Linear DP |
|---|---|---|
| State represents | Digits of a number being constructed | Elements of a given sequence |
| Use when | Counting integers in a range with digit constraints | Optimize over a 1D array |
| Example | Count numbers with digit sum ≤ k | House Robber, Climbing Stairs |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 357 | Count Numbers with Unique Digits | Medium | Gentle intro — count valid digit choices at each position | https://leetcode.com/problems/count-numbers-with-unique-digits/ |
| 2376 | Count Special Integers | Hard | No repeated digit in [1, n]; tight constraint on digits | https://leetcode.com/problems/count-special-integers/ |
| 233 | Number of Digit One | Hard | Count occurrences of digit '1' across all numbers ≤ n | https://leetcode.com/problems/number-of-digit-one/ |
| 600 | Non-negative Integers without Consecutive Ones | Hard | Binary representation; no two consecutive 1-bits | https://leetcode.com/problems/non-negative-integers-without-consecutive-ones/ |
| 902 | Numbers At Most N Given Digit Set | Hard | Build number using only specified digits, value ≤ N | https://leetcode.com/problems/numbers-at-most-n-given-digit-set/ |
| 1012 | Numbers With Repeated Digits | Hard | Complement trick: total − unique-digit count | https://leetcode.com/problems/numbers-with-repeated-digits/ |

### One-Minute Revision
```
DP PATTERN:      Digit DP
STATE MEANS:     dp[pos][...constraint state...][tight] = count of valid completions
USE WHEN:        Count integers in [0, N] satisfying a per-digit property
RECURRENCE:      for d in [0..limit]: result += solve(pos+1, newState, tight&&d==digits[pos])
TIME/SPACE:      O(len × states × 10) / O(len × states × 2)
TRAP:            Handle leading zeros with a "started" flag when constraint involves digit count
SIGNAL:          "count numbers 1 to n", "digit sum", "no consecutive equal digits"
```

---

## Pattern 11: Tree DP

### What is it?
Tree DP computes DP values on a tree by processing nodes **bottom-up**: solve leaf nodes first, then use their results to solve their parents, continuing up to the root. Because trees have no cycles, rooting the tree creates a natural parent-child dependency — each node only depends on its children, never the other way around. This makes a DFS post-order traversal the perfect computation order.

### Visual
```
Tree rooted at node 1:
         1
        / \
       2   3
      / \
     4   5

Problem: Maximum Independent Set (select max nodes so no two are adjacent)
State: dp[node][0] = max nodes in node's subtree if node is EXCLUDED
       dp[node][1] = max nodes in node's subtree if node is INCLUDED

Leaves first (bottom-up):
  dp[4] = [0, 1]   (exclude: 0 nodes; include: 1 node)
  dp[5] = [0, 1]
  dp[3] = [0, 1]

Node 2 (children: 4 and 5):
  dp[2][1] = 1 + dp[4][0] + dp[5][0] = 1+0+0 = 1  (include 2 → must exclude children)
  dp[2][0] = max(dp[4][0],dp[4][1]) + max(dp[5][0],dp[5][1]) = 1+1 = 2  (exclude 2 → children free)

Node 1 (children: 2 and 3):
  dp[1][1] = 1 + dp[2][0] + dp[3][0] = 1+2+0 = 3
  dp[1][0] = max(dp[2]) + max(dp[3]) = 2+1 = 3

Answer: max(dp[1][0], dp[1][1]) = 3  (select nodes {1,4,5} or {2,3})
```

### How does it work?
1. Root the tree at any node (usually node 0 or 1).
2. Run DFS post-order (process all children before the current node).
3. **State definition:** `dp[node][state]` = best answer for the subtree rooted at `node`, where `state` encodes a decision about `node` itself (e.g., 0=excluded, 1=included).
4. **Base case:** At leaf nodes, compute dp values directly — no children to combine.
5. **Transition:** Combine the dp values of all children to compute the parent's dp value.
6. The root's dp value is the final answer.

### Why does it work?
Trees have no cycles, so once a subtree is fully computed, nothing from outside can change it. Post-order DFS guarantees all children are solved before their parent. This is optimal substructure in action: the best answer for a node's subtree can always be expressed purely in terms of the best answers for its children's subtrees.

### When to use?
- Maximum independent set on a tree (can't pick two adjacent nodes).
- Tree diameter (longest path between any two nodes).
- Problems like "each employee reports to a manager; maximize attendance" (LC 337 style).
- Any problem where you must choose or assign values to nodes respecting parent-child constraints.

### When NOT to use?
- When the graph has cycles — use BFS/DFS or standard graph DP instead.
- When the problem is on a linear array or path, not an actual tree — use 1D or 2D DP.

### How to recognize in a new problem?
The input is a tree (given as a parent array, edge list, or `TreeNode` structure) and the answer involves making optimal choices over nodes or edges respecting their hierarchy.
Key signals:
- "Select nodes such that no two are adjacent (in a tree)"
- "Longest path between any two nodes"
- "Each employee has subordinates; maximize X without including a person and their direct manager"
- "Compute something bottom-up on the tree"

### Simple Example
**Problem:** Maximum Independent Set — given a tree with 5 nodes, select the maximum number of nodes such that no two selected nodes share an edge.
**Input:** 5 nodes, edges: 1-2, 1-3, 2-4, 2-5 (rooted at node 1)
**State definition:** `dp[node][0]` = max nodes in subtree if node excluded; `dp[node][1]` = max nodes if included
**Recurrence:**
```
dp[node][1] = 1 + sum of dp[child][0] for each child   (include node → all children excluded)
dp[node][0] = sum of max(dp[child][0], dp[child][1])   (exclude node → each child is free)
```
**Trace:** (see Visual above — answer = 3)

### Code
```java
// Java — Tree DP (Maximum Independent Set)
class TreeDP {
    List<List<Integer>> adj;
    int[][] dp; // dp[node][0=exclude, 1=include]

    public int maxIndependentSet(int n, int[][] edges) {
        adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        dp = new int[n + 1][2];
        dfs(1, 0);  // root = 1, parent = 0 (sentinel, no real parent)
        return Math.max(dp[1][0], dp[1][1]);
    }

    void dfs(int node, int parent) {
        dp[node][1] = 1; // include this node (counts as 1)
        dp[node][0] = 0; // exclude this node
        for (int child : adj.get(node)) {
            if (child == parent) continue;  // CRITICAL: don't recurse to parent
            dfs(child, node);
            // if we include node, children must be excluded
            dp[node][1] += dp[child][0];
            // if we exclude node, each child can be either included or excluded
            dp[node][0] += Math.max(dp[child][0], dp[child][1]);
        }
    }
}
```
```javascript
// JavaScript — Tree DP (Maximum Independent Set)
function maxIndependentSet(n, edges) {
    const adj = Array.from({length: n + 1}, () => []);
    for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }
    const dp = Array.from({length: n + 1}, () => [0, 0]);

    function dfs(node, parent) {
        dp[node][1] = 1;  // include node
        dp[node][0] = 0;  // exclude node
        for (const child of adj[node]) {
            if (child === parent) continue;  // don't go back to parent
            dfs(child, node);
            dp[node][1] += dp[child][0];                           // include → child excluded
            dp[node][0] += Math.max(dp[child][0], dp[child][1]);   // exclude → child free
        }
    }

    dfs(1, 0);
    return Math.max(dp[1][0], dp[1][1]);
}
```

### Dry Run
Edges: 1-2, 1-3, 2-4, 2-5 (rooted at 1):
```
dfs(4, parent=2): leaf → dp[4][1]=1, dp[4][0]=0
dfs(5, parent=2): leaf → dp[5][1]=1, dp[5][0]=0
dfs(2, parent=1):
  child 4: dp[2][1] += dp[4][0]=0 → dp[2][1]=1
           dp[2][0] += max(0,1)=1  → dp[2][0]=1
  child 5: dp[2][1] += dp[5][0]=0 → dp[2][1]=1
           dp[2][0] += max(0,1)=1  → dp[2][0]=2
  final: dp[2]=[2,1]
dfs(3, parent=1): leaf → dp[3]=[0,1]
dfs(1, parent=0):
  child 2: dp[1][1] += dp[2][0]=2 → dp[1][1]=3
           dp[1][0] += max(2,1)=2  → dp[1][0]=2
  child 3: dp[1][1] += dp[3][0]=0 → dp[1][1]=3
           dp[1][0] += max(0,1)=1  → dp[1][0]=3
Answer: max(dp[1][0]=3, dp[1][1]=3) = 3
```

### Complexity
```
Time:  O(n) — each node and each edge visited exactly once in DFS
Space: O(n) — dp array of size n, plus O(n) recursion stack (O(log n) for balanced trees)
```

### Common Trap
Always pass `parent` to the DFS function and skip the edge back to the parent with `if (child == parent) continue`. Without this guard, the DFS follows the undirected edge back to the parent, creating an infinite recursion (stack overflow) or corrupted DP values.

### Experience Tip
Many tree DP problems have a **rerooting** variant: after computing dp values from an arbitrary root in O(n), re-derive what dp[node] would be if every node were the root, again in O(n). This turns "find for every node the answer as if it were the root" from O(n²) to O(n). It's a common interview follow-up — learn the two-DFS rerooting pattern after mastering basic tree DP.

### Do Not Confuse With

| | Tree DP | Interval DP |
|---|---|---|
| State represents | Answer for the subtree rooted at a given node | Answer for a contiguous range [i, j] of a sequence |
| Use when | Input is an actual tree structure | Input is a linear array or string |
| Example | Max independent set on tree, tree diameter | Palindrome substrings, burst balloons |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 337 | House Robber III | Medium | Binary tree; can't rob a node and its direct child | https://leetcode.com/problems/house-robber-iii/ |
| 543 | Diameter of Binary Tree | Easy | dp[node] = longest one-sided path; diameter = best two children combined | https://leetcode.com/problems/diameter-of-binary-tree/ |
| 1245 | Tree Diameter | Medium | Same diameter idea on a general (non-binary) tree | https://leetcode.com/problems/tree-diameter/ |
| 968 | Binary Tree Cameras | Hard | Three states per node: covered by child, covering parent, uncovered | https://leetcode.com/problems/binary-tree-cameras/ |
| 2246 | Longest Path With Different Adjacent Characters | Hard | Pick best + second-best child paths; combine at each node | https://leetcode.com/problems/longest-path-with-different-adjacent-characters/ |
| 1373 | Maximum Sum BST in Binary Tree | Hard | Track (isBST, min, max, sum) per subtree bottom-up | https://leetcode.com/problems/maximum-sum-bst-in-binary-tree/ |

### One-Minute Revision
```
DP PATTERN:      Tree DP
STATE MEANS:     dp[node][state] = best answer for the subtree rooted at node
USE WHEN:        Input is a tree; answer involves choosing/optimizing over nodes or edges
RECURRENCE:      Post-order DFS: dp[node] = combine(dp[child1], dp[child2], ...) after all children done
TIME/SPACE:      O(n) / O(n)
TRAP:            Pass parent to DFS and skip child==parent to avoid infinite recursion
SIGNAL:          "no two adjacent nodes selected", "longest path in tree", "subtree property"
```

---

## Pattern 12: DP Optimizations

### What is it?
Some DP recurrences have a special mathematical structure that makes the naive O(n²) or O(n³) approach unnecessarily slow for large n. Three classical techniques exploit these structures: **Monotone Queue DP** turns a sliding-window max/min over DP values from O(nk) into O(n); **Convex Hull Trick (CHT)** turns a "minimum of linear functions" recurrence from O(n²) into O(n) or O(n log n); **Divide & Conquer Optimization** cuts an O(n³) layer-by-layer DP to O(n² log n) when the optimal split point is monotone.

These techniques are advanced. They appear only on hard optimization problems with n ≥ 10^5. You will not need them for easy or most medium problems.

### Visual
```
─────────────────────────────────────────────────────────
MONOTONE QUEUE DP
─────────────────────────────────────────────────────────
dp[i] = nums[i] + max(dp[j])  for j in [i-k .. i-1]

Naive: scan all j in window → O(nk)

Deque approach (decreasing order of dp values):
  i=0: dp[0]=1;  deque=[0]
  i=1: dp[1]=nums[1]+dp[0];  drop back if dp[0]≤dp[1]; deque=[...]
  i=3: pop FRONT if deque[front] < i-k  (expired index)
       best j = deque[front];  dp[3]=nums[3]+dp[front]
  → Each index enters and leaves deque at most once → O(n) total

─────────────────────────────────────────────────────────
CONVEX HULL TRICK
─────────────────────────────────────────────────────────
dp[i] = min over j<i of { dp[j] + b[j] * a[i] }
Each j defines a LINE: y = b[j]*x + dp[j], query at x = a[i]

    y │  line j=0 (steep slope)
      │ ╲  line j=1
      │  ╲╲
      │   ╲╲  line j=2 (gentle slope)
      │    ╲╲╲___
      └─────────→ x = a[i]
  At each x, take the MINIMUM y across all lines.
  Lines on the lower convex hull answer all queries → O(n) amortized

─────────────────────────────────────────────────────────
DIVIDE & CONQUER OPTIMIZATION
─────────────────────────────────────────────────────────
dp[k][i] = min over j in [0..i-1] of { dp[k-1][j] + cost(j, i) }

Key property: opt(i) ≤ opt(i+1)  (optimal split never moves left)
  Solve dp[k][mid] first → find opt(mid) = j*
  Left half [lo..mid-1] can only have opt in [optLo .. j*]
  Right half [mid+1..hi] can only have opt in [j* .. optHi]
  → Total work per layer: O(n log n) instead of O(n²)
```

### How does it work?

**Monotone Queue DP — when to use it:**
The recurrence is `dp[i] = cost(i) + max(dp[j])` where j ranges over a fixed-size window `[i-k, i-1]`. Maintain a deque of indices in decreasing order of dp values. Before computing dp[i]: (1) pop the front if it has expired (index < i-k); (2) the front now holds the best j; (3) after computing dp[i], pop the back while dp[back] ≤ dp[i], then push i. Each index enters and leaves once → O(n) total.

**Convex Hull Trick — when to use it:**
The recurrence is `dp[i] = min over j < i of { m[j] * x[i] + b[j] }`. Each previous state j defines a line y = m[j]*x + b[j]. You need the minimum y at query x = x[i]. If slopes m[j] are monotone decreasing and queries x[i] are monotone increasing, maintain a lower convex hull with a pointer — O(n) total. For non-monotone cases, use a Li Chao segment tree for O(n log n).

**Divide & Conquer Optimization — when to use it:**
The recurrence is `dp[k][i] = min over j of { dp[k-1][j] + cost(j, i) }` where cost satisfies the quadrangle inequality (making opt(i) monotone). Instead of scanning all j for every i, recurse: compute dp for the middle index of [lo, hi], find its optimal j*, then recurse left with opt search space [optLo, j*] and right with [j*, optHi]. Each level costs O(n) and there are O(log n) levels → O(n log n) per DP layer.

### Why does it work?
Each optimization exploits a monotonicity or linearity property that makes the naive "scan all j" approach do redundant work:
- Monotone queue: the window's best j can only advance forward, never retreat — stale candidates are discarded permanently.
- CHT: lines on a convex hull can be queried with a single forward scan when queries are monotone — no need to check every line.
- D&C opt: optimal split points never cross between adjacent dp[k][i] and dp[k][i+1] — the total search space across all recursive subproblems is bounded.

### When to use?
- Monotone Queue DP: `dp[i] = cost[i] + max/min(dp[j])` over a fixed sliding window.
- Convex Hull Trick: `dp[i] = min(m[j] * x[i] + b[j])` — a cost that factors as a product of a j-dependent slope and an i-dependent query.
- D&C Optimization: `dp[k][i] = min(dp[k-1][j] + cost(j,i))` and cost satisfies the quadrangle inequality (opt monotonicity holds).

### When NOT to use?
- When n ≤ 5000: O(n²) is almost always fast enough; no optimization needed.
- When the recurrence does not have the required structure — applying CHT to a non-linear recurrence or D&C opt without opt-monotonicity gives wrong answers.

### How to recognize in a new problem?
The naive DP is O(n²) or O(n³) and n ≥ 10^5. Look at the recurrence and ask: "Does the transition look like a linear function of j evaluated at i?" → CHT. "Is j restricted to a window?" → Monotone Queue. "Does the optimal j for dp[i] monotonically increase with i?" → D&C Opt.
Key signals:
- "Maximize over last k positions" → Monotone Queue
- "Cost = slope × value" or "DP transition multiplies two different indices' values" → CHT
- "Partition into exactly k groups minimizing total cost" with concave/convex cost → D&C Opt or CHT

### Simple Example
**Monotone Queue DP (Jump Game VI):** given nums[] and k, at each step jump 1..k positions forward. Maximize sum of visited elements.
**State definition:** `dp[i]` = max sum to reach index i
**Naive recurrence (O(nk)):** `dp[i] = nums[i] + max(dp[i-k], dp[i-k+1], ..., dp[i-1])`
**With monotone deque:** maintain deque of indices with decreasing dp values. The front is always the best j in the window. O(n).

### Code
```java
// Java — Monotone Queue DP (Jump Game VI, LC 1696)
public int maxResult(int[] nums, int k) {
    int n = nums.length;
    int[] dp = new int[n];
    dp[0] = nums[0];
    Deque<Integer> deque = new ArrayDeque<>();
    deque.addLast(0);

    for (int i = 1; i < n; i++) {
        // Remove indices that have fallen out of the window
        while (!deque.isEmpty() && deque.peekFirst() < i - k) deque.pollFirst();

        // Best dp in the window is at the front
        dp[i] = nums[i] + dp[deque.peekFirst()];

        // Maintain decreasing order: remove back elements smaller than dp[i]
        while (!deque.isEmpty() && dp[deque.peekLast()] <= dp[i]) deque.pollLast();
        deque.addLast(i);  // add AFTER computing dp[i]
    }
    return dp[n - 1];
}
```
```javascript
// JavaScript — Monotone Queue DP (Jump Game VI, LC 1696)
function maxResult(nums, k) {
    const n = nums.length;
    const dp = new Array(n).fill(0);
    dp[0] = nums[0];
    const deque = [0];  // stores indices; front has highest dp value

    for (let i = 1; i < n; i++) {
        // Remove expired front (outside window of size k)
        while (deque.length > 0 && deque[0] < i - k) deque.shift();

        // Best in window
        dp[i] = nums[i] + dp[deque[0]];

        // Maintain decreasing order from back
        while (deque.length > 0 && dp[deque[deque.length - 1]] <= dp[i]) deque.pop();
        deque.push(i);  // add AFTER computing dp[i]
    }
    return dp[n - 1];
}
```

### Dry Run
nums = [1, -1, -2, 4, -7, 3], k = 2:
```
dp[0]=1,    deque=[0]
i=1: front=0(valid); dp[1]=-1+1=0;  dp[0]=1>dp[1]=0→keep 0; deque=[0,1]
i=2: front=0(valid, i-k=0); dp[2]=-2+dp[0]=-1; dp[1]=0>-1→keep; deque=[0,1,2]
i=3: front=0, i-k=1 → 0<1 → pop front; deque=[1,2]
     front=1; dp[3]=4+dp[1]=4+0=4
     dp[2]=-1<4→pop; dp[1]=0<4→pop; deque=[3]
i=4: front=3(valid, i-k=2); dp[4]=-7+dp[3]=-3; dp[3]=4>-3→keep; deque=[3,4]
i=5: front=3(valid, i-k=3); dp[5]=3+dp[3]=7;
     dp[4]=-3<7→pop; dp[3]=4<7→pop; deque=[5]
Answer: dp[5] = 7
```

### Complexity
```
Monotone Queue DP:  Time O(n), Space O(k) — each element enters/leaves deque at most once
Convex Hull Trick:  Time O(n) with monotone slopes+queries; O(n log n) with Li Chao tree
D&C Optimization:  Time O(n log n) per DP layer (vs O(n²) naive); Space O(n) per layer
```

### Common Trap
For Monotone Queue DP: always add the new index to the deque **after** computing `dp[i]`. If you push i before computing dp[i], you might pick dp[i] as the "best j" for dp[i] itself — using the current position as its own predecessor.

### Experience Tip
At interviews, never start by implementing CHT or D&C Opt. State the naive O(n²) solution first and make sure it's correct. Then say "this can be optimized — the recurrence has the form of a linear function in j evaluated at i, so Convex Hull Trick applies, reducing it to O(n)." This shows depth and structured thinking. Full CHT implementation is rarely required under time pressure; identifying the pattern is what matters.

### Do Not Confuse With

| | Monotone Queue DP | Sliding Window Maximum (LC 239) |
|---|---|---|
| State represents | DP values computed during the DP itself | Raw input array values |
| Use when | dp[i] = f(i) + max(dp[j]) for j in a window | Find max of raw values in a fixed window |
| Example | Jump Game VI (LC 1696) | Maximum in sliding window (LC 239) |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 1696 | Jump Game VI | Hard | max(dp[j]) over last k steps → monotone deque | https://leetcode.com/problems/jump-game-vi/ |
| 239 | Sliding Window Maximum | Hard | Pure deque warm-up before applying to DP values | https://leetcode.com/problems/sliding-window-maximum/ |
| 1425 | Constrained Subsequence Sum | Hard | dp[i]=nums[i]+max(0, max dp[j] for j in [i-k,i-1]) | https://leetcode.com/problems/constrained-subsequence-sum/ |
| 1687 | Delivering Boxes from Storage to Ports | Hard | Monotone deque DP with compound cost function | https://leetcode.com/problems/delivering-boxes-from-storage-to-ports/ |
| 188 | Best Time to Buy and Sell Stock IV | Hard | k-transaction DP; CHT reduces per-layer cost | https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iv/ |
| 1235 | Maximum Profit in Job Scheduling | Hard | DP + binary search; bridge to CHT-style thinking | https://leetcode.com/problems/maximum-profit-in-job-scheduling/ |

### One-Minute Revision
```
DP PATTERN:      DP Optimizations
MONOTONE QUEUE:  dp[i] = cost + max(dp[j]) in window [i-k, i-1]; deque → O(n)
CHT:             dp[i] = min(m[j]*x[i] + dp[j]); lower convex hull of lines → O(n)
D&C OPT:         dp[k][i] = min(dp[k-1][j] + cost(j,i)); opt monotone → O(n log n) / layer
USE WHEN:        Naive DP is O(n²) or O(n³) and n ≥ 10^5
TRAP:            Add index to deque AFTER computing dp[i], not before
SIGNAL:          "max over last k steps" → deque; "cost = slope × query" → CHT
```

---

*Next: [10-TREES.md](10-TREES.md) — Binary Trees, BSTs, Tries, Segment Trees*
