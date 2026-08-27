# Dynamic Programming — 4 Core Patterns

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

### Complexity
Time: O(n) — one pass, O(1) work per index
Space: O(1) — only two variables needed (dp[i] uses dp[i-1] and dp[i-2])

### Common Trap + Experience Tip
Trap: forgetting `dp[1] = max(nums[0], nums[1])`, not just `nums[1]`.
Tip: if you can't space-optimize immediately, write the full array first, then shrink.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
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

### Complexity
Time: O(m×n) — every cell visited once
Space: O(n) — rolling 1D array replaces the 2D table (row only depends on row above)

### Common Trap + Experience Tip
Trap: for obstacles (LC 63), set `dp[0][j] = 0` as soon as you hit a blocked cell in the base case — all cells to the right of a top-row obstacle are unreachable.
Tip: write the 2D table solution first, then collapse to 1D array row-by-row.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
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

### Complexity
Time: O(n × target) — n items × target capacity iterations
Space: O(target) — 1D rolling array (collapsed from O(n × target) 2D table)

### Common Trap + Experience Tip
Trap: iterating capacity left-to-right in 0/1 knapsack lets you pick the same item multiple times — always go right-to-left.
Tip: if you forget direction, ask "can I use this item again?" No → right-to-left.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
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

### Complexity
Time: O(amount × coins.length) — fill each amount slot by trying every coin
Space: O(amount) — only the 1D dp array needed

### Common Trap + Experience Tip
Trap: initializing dp with 0 instead of Infinity means impossible states silently return 0 — always use a sentinel like `amount + 1`.
Tip: Coin Change (min coins) vs Coin Change II (count ways) differ only in the transition (`min` vs `+=`). Know both.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
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
