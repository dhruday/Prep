# 317 – Classic DP Problems

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
The classic DP problems every frontend engineer should know: Fibonacci, climbing stairs, coin change, longest common subsequence (LCS), knapsack, longest increasing subsequence (LIS), edit distance. Pattern: define state, recurrence relation, base case.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── COIN CHANGE (min coins to make amount) ────
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i) dp[i] = Math.min(dp[i], dp[i - coin] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}

// ──── LONGEST COMMON SUBSEQUENCE ────
function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length, n = text2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

// ──── 0/1 KNAPSACK ────
function knapsack(weights: number[], values: number[], capacity: number): number {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w]; // skip item
      if (weights[i - 1] <= w)
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
    }
  }
  return dp[n][capacity];
}

// ──── LONGEST INCREASING SUBSEQUENCE ────
function lengthOfLIS(nums: number[]): number {
  // O(n log n) with binary search
  const tails: number[] = [];
  for (const num of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      tails[mid] < num ? (lo = mid + 1) : (hi = mid);
    }
    tails[lo] = num;
  }
  return tails.length;
}

// ──── EDIT DISTANCE ────
function minDistance(word1: string, word2: string): number {
  const m = word1.length, n = word2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => 
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ──── HOUSE ROBBER ────
function rob(nums: number[]): number {
  let prev2 = 0, prev1 = 0;
  for (const num of nums) { const curr = Math.max(prev1, prev2 + num); prev2 = prev1; prev1 = curr; }
  return prev1;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I categorize DP by pattern: 1D linear (stairs, house robber), 2D grid (unique paths, LCS, edit distance), knapsack (coin change, 0/1 knapsack). Steps: define state, write recurrence, set base case, optimize space if possible."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Edit distance for fuzzy search (typo tolerance)
function fuzzyMatch(query: string, candidates: string[], maxDistance: number): string[] {
  return candidates.filter(c => minDistance(query.toLowerCase(), c.toLowerCase()) <= maxDistance);
}
```

## 5. 🧠 MEMORY AID
**"DP steps: 1) Define state 2) Recurrence relation 3) Base case 4) Iteration order 5) Space optimization. Categories: 1D linear, 2D grid, knapsack."**

## 6. 🎯 COMPLEXITY
Coin Change: O(amount × coins) | LCS/Edit Distance: O(m×n) | LIS: O(n log n) | Knapsack: O(n × capacity)
