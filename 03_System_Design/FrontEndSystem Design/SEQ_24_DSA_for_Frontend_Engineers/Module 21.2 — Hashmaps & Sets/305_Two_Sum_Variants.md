# 305 – Two-Sum Variants

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Two-Sum is the foundation problem: find two numbers that add to a target. Variants include: unsorted (hashmap O(n)), sorted (two pointers O(n)), three-sum, four-sum, two-sum with index pairs, and two-sum in BST. The hashmap approach: for each number, check if `target - num` exists.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// Classic Two Sum (unsorted) — hashmap
function twoSum(nums: number[], target: number): [number, number] {
  const seen = new Map<number, number>(); // value → index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement)!, i];
    seen.set(nums[i], i);
  }
  return [-1, -1];
}

// Two Sum II — sorted array, two pointers
function twoSumSorted(nums: number[], target: number): [number, number] {
  let l = 0, r = nums.length - 1;
  while (l < r) {
    const sum = nums[l] + nums[r];
    if (sum === target) return [l, r];
    sum < target ? l++ : r--;
  }
  return [-1, -1];
}

// Three Sum — sort + two pointers for inner pair
function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b);
  const result: number[][] = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue; // skip duplicates
    let l = i + 1, r = nums.length - 1;
    while (l < r) {
      const sum = nums[i] + nums[l] + nums[r];
      if (sum === 0) {
        result.push([nums[i], nums[l], nums[r]]);
        while (l < r && nums[l] === nums[l + 1]) l++;
        while (l < r && nums[r] === nums[r - 1]) r--;
        l++; r--;
      } else if (sum < 0) l++;
      else r--;
    }
  }
  return result;
}

// Two Sum — return all pairs (not just first)
function twoSumAllPairs(nums: number[], target: number): [number, number][] {
  const seen = new Map<number, number[]>();
  const pairs: [number, number][] = [];
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      for (const j of seen.get(complement)!) pairs.push([j, i]);
    }
    if (!seen.has(nums[i])) seen.set(nums[i], []);
    seen.get(nums[i])!.push(i);
  }
  return pairs;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Two-Sum: hashmap for unsorted O(n), two pointers for sorted O(n). Three-Sum: sort + fix one element + two pointers for inner pair O(n²). Always clarify: sorted? return indices or values? multiple pairs?"*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Find product bundles that match a price target
function findBundles(catalog: { name: string; price: number }[], budget: number) {
  const result: string[][] = [];
  const map = new Map<number, string>();
  for (const item of catalog) {
    const complement = budget - item.price;
    if (map.has(complement)) result.push([map.get(complement)!, item.name]);
    map.set(item.price, item.name);
  }
  return result;
}
```

## 5. 🧠 MEMORY AID
**"Unsorted → hashmap. Sorted → two pointers. Three-sum → sort + fix one + two pointers. Always think complement = target - current."**

## 6. 🎯 COMPLEXITY
Two-Sum: O(n) time, O(n) space | Three-Sum: O(n²) time, O(1) space
