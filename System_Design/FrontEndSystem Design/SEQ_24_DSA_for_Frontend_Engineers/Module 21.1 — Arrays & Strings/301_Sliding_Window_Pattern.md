# 301 – Sliding Window Pattern

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Sliding window maintains a window (subarray/substring) that grows or shrinks to find optimal subarrays. Two types: **fixed-size** (max sum of k elements) and **variable-size** (smallest subarray with sum ≥ target). Converts O(n²) brute force to O(n).

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// Fixed window: max sum of k consecutive elements
function maxSumSubarray(nums: number[], k: number): number {
  let windowSum = nums.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum = windowSum;
  for (let i = k; i < nums.length; i++) {
    windowSum += nums[i] - nums[i - k]; // slide: add right, remove left
    maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
}

// Variable window: longest substring without repeating characters
function lengthOfLongestSubstring(s: string): number {
  const seen = new Map<string, number>();
  let maxLen = 0, start = 0;
  for (let end = 0; end < s.length; end++) {
    if (seen.has(s[end]) && seen.get(s[end])! >= start) {
      start = seen.get(s[end])! + 1;
    }
    seen.set(s[end], end);
    maxLen = Math.max(maxLen, end - start + 1);
  }
  return maxLen;
}

// Variable window: minimum window substring
function minWindow(s: string, t: string): string {
  const need = new Map<string, number>();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  let have = 0, required = need.size;
  let left = 0, result = '', minLen = Infinity;
  const window = new Map<string, number>();
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) || 0) + 1);
    if (need.has(c) && window.get(c) === need.get(c)) have++;
    while (have === required) {
      if (right - left + 1 < minLen) { minLen = right - left + 1; result = s.slice(left, right + 1); }
      const lc = s[left];
      window.set(lc, window.get(lc)! - 1);
      if (need.has(lc) && window.get(lc)! < need.get(lc)!) have--;
      left++;
    }
  }
  return result;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Sliding window handles subarray/substring problems in O(n). Fixed window: slide by adding right and removing left. Variable window: expand right, shrink left when condition met. Template: for(right...) { add; while(valid) { update result; remove left; } }."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Rate limiting — count events in sliding time window
function isRateLimited(timestamps: number[], windowMs: number, maxRequests: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const recentRequests = timestamps.filter(t => t > windowStart);
  return recentRequests.length >= maxRequests;
}
```

## 5. 🧠 MEMORY AID
**"Fixed window: add right, remove left. Variable window: expand right, shrink left when valid."**

## 6. 🎯 COMPLEXITY
Time: O(n) | Space: O(k) or O(alphabet)
