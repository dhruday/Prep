# 304 – Frequency Maps Pattern

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Frequency maps count occurrences of elements using a hashmap. Foundation for: majority element, top-k frequent elements, first unique character, character counting problems. Map<T, number> gives O(1) lookup/update.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// Build frequency map
function freqMap<T>(arr: T[]): Map<T, number> {
  const freq = new Map<T, number>();
  for (const item of arr) freq.set(item, (freq.get(item) || 0) + 1);
  return freq;
}

// Majority element (appears > n/2 times) — Boyer-Moore Voting
function majorityElement(nums: number[]): number {
  let candidate = nums[0], count = 1;
  for (let i = 1; i < nums.length; i++) {
    if (count === 0) { candidate = nums[i]; count = 1; }
    else count += nums[i] === candidate ? 1 : -1;
  }
  return candidate;
}

// Top K frequent elements
function topKFrequent(nums: number[], k: number): number[] {
  const freq = freqMap(nums);
  // Bucket sort: index = frequency, value = elements with that frequency
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [num, count] of freq) buckets[count].push(num);
  const result: number[] = [];
  for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
    result.push(...buckets[i]);
  }
  return result.slice(0, k);
}

// First unique character
function firstUniqChar(s: string): number {
  const freq = freqMap([...s]);
  for (let i = 0; i < s.length; i++) {
    if (freq.get(s[i]) === 1) return i;
  }
  return -1;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Frequency maps are my go-to for counting problems. Build with Map, then query. For top-k: bucket sort beats heap when k is large. For majority: Boyer-Moore O(1) space. First unique: two-pass with freq map."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Most clicked feature in analytics
function topFeatures(clicks: string[], k: number): string[] {
  const freq = new Map<string, number>();
  clicks.forEach(f => freq.set(f, (freq.get(f) || 0) + 1));
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([f]) => f);
}
```

## 5. 🧠 MEMORY AID
**"Frequency map = Map<element, count>. Top-K: bucket sort. Majority: Boyer-Moore. Always think 'count occurrences first'."**

## 6. 🎯 COMPLEXITY
Build: O(n) | Query: O(1) | Top-K bucket sort: O(n)
