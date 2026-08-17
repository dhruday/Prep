# 316 – Memoization vs Tabulation

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Memoization** (top-down): recursive with cache, computes only needed subproblems. **Tabulation** (bottom-up): iterative, fills table from base case up. Both achieve O(n) for problems like Fibonacci. Memoization is easier to code; tabulation avoids stack overflow and can optimize space.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── MEMOIZATION (Top-Down) ────
function climbStairsMemo(n: number, memo = new Map<number, number>()): number {
  if (n <= 2) return n;
  if (memo.has(n)) return memo.get(n)!;
  const result = climbStairsMemo(n - 1, memo) + climbStairsMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}

// ──── TABULATION (Bottom-Up) ────
function climbStairsTab(n: number): number {
  if (n <= 2) return n;
  const dp = new Array(n + 1);
  dp[1] = 1; dp[2] = 2;
  for (let i = 3; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
  return dp[n];
}

// ──── SPACE-OPTIMIZED TABULATION ────
function climbStairsOptimized(n: number): number {
  if (n <= 2) return n;
  let prev2 = 1, prev1 = 2;
  for (let i = 3; i <= n; i++) { const curr = prev1 + prev2; prev2 = prev1; prev1 = curr; }
  return prev1;
}

// ──── COMPARISON ────
// Memoization:
//   ✅ Natural recursive thinking
//   ✅ Only computes needed subproblems
//   ❌ Stack overflow risk for large n
//   ❌ Map/object overhead

// Tabulation:
//   ✅ No stack overflow
//   ✅ Can optimize space (sliding window of variables)
//   ✅ Better cache performance (sequential memory access)
//   ❌ Must figure out correct iteration order

// ──── 2D DP EXAMPLE: Unique Paths ────
function uniquePathsMemo(m: number, n: number, memo = new Map<string, number>()): number {
  if (m === 1 || n === 1) return 1;
  const key = `${m},${n}`;
  if (memo.has(key)) return memo.get(key)!;
  const result = uniquePathsMemo(m - 1, n, memo) + uniquePathsMemo(m, n - 1, memo);
  memo.set(key, result);
  return result;
}

function uniquePathsTab(m: number, n: number): number {
  const dp = Array.from({ length: m }, () => new Array(n).fill(1));
  for (let i = 1; i < m; i++)
    for (let j = 1; j < n; j++)
      dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
  return dp[m - 1][n - 1];
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I start with memoization because it maps directly to the recursive thinking. Once it works, I convert to tabulation for better performance and space optimization. For 1D DP like Fibonacci/stairs, I optimize to O(1) space with two variables."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Memoized expensive computation (layout calculation cache)
function createMemoizedLayout() {
  const cache = new Map<string, { width: number; height: number }>();
  return function computeLayout(componentId: string, props: Record<string, unknown>) {
    const key = `${componentId}:${JSON.stringify(props)}`;
    if (cache.has(key)) return cache.get(key)!;
    // expensive layout calculation...
    const layout = { width: 100, height: 50 }; // placeholder
    cache.set(key, layout);
    return layout;
  };
}
```

## 5. 🧠 MEMORY AID
**"Memo = top-down + cache (easy to write). Tab = bottom-up + iterate (no stack overflow). Space optimize 1D DP: keep only prev values."**

## 6. 🎯 COMPLEXITY
Both: Time O(n), Space O(n) → optimized to O(1) for 1D
