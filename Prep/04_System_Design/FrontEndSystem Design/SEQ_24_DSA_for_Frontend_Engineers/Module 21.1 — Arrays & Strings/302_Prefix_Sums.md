# 302 – Prefix Sums

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Prefix sum precomputes cumulative sums so any subarray sum can be calculated in O(1) after O(n) preprocessing. `prefixSum[i] = sum of nums[0..i-1]`. Subarray sum from i to j = `prefix[j+1] - prefix[i]`. Essential for range sum queries, subarray sum equals k, and running totals.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// Build prefix sum array
function buildPrefixSum(nums: number[]): number[] {
  const prefix = [0];
  for (let i = 0; i < nums.length; i++) {
    prefix.push(prefix[i] + nums[i]);
  }
  return prefix;
}
// Sum from index i to j (inclusive) = prefix[j+1] - prefix[i]

// Subarray sum equals k — count subarrays
function subarraySum(nums: number[], k: number): number {
  const prefixCount = new Map<number, number>([[0, 1]]);
  let sum = 0, count = 0;
  for (const num of nums) {
    sum += num;
    count += prefixCount.get(sum - k) || 0;
    prefixCount.set(sum, (prefixCount.get(sum) || 0) + 1);
  }
  return count;
}

// 2D prefix sum (for grid/matrix problems)
function buildPrefixSum2D(grid: number[][]): number[][] {
  const m = grid.length, n = grid[0].length;
  const prefix = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      prefix[i][j] = grid[i-1][j-1] + prefix[i-1][j] + prefix[i][j-1] - prefix[i-1][j-1];
  return prefix;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Prefix sum enables O(1) range sum queries after O(n) preprocessing. For subarray sum = k, use hashmap of prefix sums: if current_prefix - k exists in the map, we found a valid subarray."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Running total for dashboard chart data
function cumulativeRevenue(dailyRevenue: number[]): number[] {
  const cumulative: number[] = [];
  let sum = 0;
  for (const revenue of dailyRevenue) { sum += revenue; cumulative.push(sum); }
  return cumulative;
}
```

## 5. 🧠 MEMORY AID
**"Prefix sum = cumulative array. Range sum [i,j] = prefix[j+1] - prefix[i]. Subarray sum=k: hashmap of prefix sums."**

## 6. 🎯 COMPLEXITY
Build: O(n) | Query: O(1) | Space: O(n)
