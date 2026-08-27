# Dynamic Programming — 4 Core Patterns

> **8 DP patterns covered:** 1D Linear DP · 2D Grid DP · 0/1 Knapsack · Unbounded Knapsack · LCS/Edit Distance Family · LIS (Longest Increasing Subsequence) · State Machine DP · Interval DP

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
