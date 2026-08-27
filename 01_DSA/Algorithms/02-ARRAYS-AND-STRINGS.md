# Arrays & Strings — Pattern Reference

> **13 algorithms covered:** Two Pointers (Opposite Ends) · Two Pointers (Fast/Slow) · Sliding Window (Fixed) · Sliding Window (Variable) · Prefix Sum · Kadane's Algorithm · Three Pointers · Prefix XOR · Boyer-Moore Majority Vote · Dutch National Flag · In-Place Manipulation · Matrix Traversal · Rotate Array

---

## Table of Contents
1. [Two Pointers — Opposite Ends](#two-pointers--opposite-ends)
2. [Two Pointers — Same Direction (Fast/Slow)](#two-pointers--same-direction-fastslow)
3. [Sliding Window — Fixed Size](#sliding-window--fixed-size)
4. [Sliding Window — Variable Size](#sliding-window--variable-size)
5. [Prefix Sum](#prefix-sum)
6. [Kadane's Algorithm (Maximum Subarray)](#kadanes-algorithm-maximum-subarray)
7. [Three Pointers](#three-pointers)
8. [Prefix XOR](#prefix-xor)
9. [Boyer-Moore Majority Vote](#boyer-moore-majority-vote)
10. [Dutch National Flag (3-way partition)](#dutch-national-flag-3-way-partition)
11. [In-Place Manipulation](#in-place-manipulation)
12. [Matrix Traversal](#matrix-traversal)
13. [Rotate Array](#rotate-array)

---

## Two Pointers — Opposite Ends

### What is it?
Two indices start at both ends of a sorted array and move toward each other. Each step eliminates one candidate based on whether the current value is too small or too large.

### Visual
```
[1, 2, 4, 7, 11, 15]   target = 9
 L                 R    sum=16 > 9 → R--
 L            R         sum=12 > 9 → R--
 L       R              sum=8  < 9 → L++
    L    R              sum=9  ✓
```

### How does it work?
1. Set `left = 0`, `right = n - 1`.
2. Compute the value of the pair (sum, difference, etc.).
3. If condition met → record answer, advance both (skip duplicates).
4. If "too small" → `left++`.
5. If "too large" → `right--`.
6. Stop when `left >= right`.

### Why does it work?
On a sorted array, every step provably eliminates one index from the search space. You never need to revisit it because sorting guarantees the direction of change.

### When to use? / When NOT to use?
- Use: sorted array + find pair/triplet with target sum
- Use: palindrome check, container/water problems
- NOT: unsorted + original indices matter (use HashMap)
- NOT: contiguous range problems (use sliding window)

### How to recognize?
Is the array sorted? → Are you looking for a pair/triple? → Can you move one pointer per step?
- Signal: "find two numbers that sum to target"
- Signal: "sorted array", "two numbers"
- Signal: "container with most water", "trap rain water"

### Simple Example
Input: `[2, 7, 11, 15]`, target = 9
Output: `[1, 2]` (1-indexed)
Trace: L=0(2), R=3(15) → sum=17, R--; L=0(2), R=2(11) → sum=13, R--; L=0(2), R=1(7) → sum=9 ✓

### Code
```java
public int[] twoSum(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    while (left < right) {
        int sum = nums[left] + nums[right];
        if (sum == target)  return new int[]{left + 1, right + 1};
        else if (sum < target) left++;
        else right--;
    }
    return new int[]{-1, -1};
}
```
```javascript
function twoSum(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left < right) {
        const sum = nums[left] + nums[right];
        if (sum === target) return [left + 1, right + 1];
        else if (sum < target) left++;
        else right--;
    }
}
```

### Dry Run
| Step | L | R | nums[L] | nums[R] | Sum | Action |
|------|---|---|---------|---------|-----|--------|
| 1 | 0 | 3 | 2 | 15 | 17 | > 9, R-- |
| 2 | 0 | 2 | 2 | 11 | 13 | > 9, R-- |
| 3 | 0 | 1 | 2 | 7  | 9  | match ✓ |

### Complexity
Time: O(n) — each pointer moves at most n steps total
Space: O(1) — two index variables only

### Common Trap + Experience Tip
**Trap:** In 3Sum, forgetting to skip duplicates after a match causes repeated triplets. After match, advance both pointers past all equal values.
**Tip:** Container With Most Water — always move the pointer at the *shorter* line; moving the taller one can only shrink or maintain height, never improve.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 167 | Two Sum II | Easy | Classic template | https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/ |
| 15 | 3Sum | Medium | Skip duplicates at each pointer | https://leetcode.com/problems/3sum/ |
| 11 | Container With Most Water | Medium | Move shorter line | https://leetcode.com/problems/container-with-most-water/ |
| 42 | Trapping Rain Water | Hard | Track left_max & right_max | https://leetcode.com/problems/trapping-rain-water/ |

### One-Minute Revision
```
PATTERN:    Two Pointers — Opposite Ends
USE WHEN:   Sorted array, find pair/triplet with sum condition
CORE IDEA:  Each step eliminates one index via sorted order
TRACK:      left index, right index
TIME/SPACE: O(n) / O(1)
TRAP:       Skip duplicates in 3Sum; won't work on unsorted + need indices
```

---

## Two Pointers — Same Direction (Fast/Slow)

### What is it?
Two pointers both move left-to-right. `fast` reads every element; `slow` only advances when `fast` finds a value worth keeping. Result lives in `arr[0..slow-1]`.

### Visual
```
[3, 2, 2, 3, 1]   remove value 3
 S
 F               arr[F]=3, skip
    F            arr[F]=2, keep → arr[S]=2, S++
       F         arr[F]=2, keep → arr[S]=2, S++
          F      arr[F]=3, skip
             F   arr[F]=1, keep → arr[S]=1, S++
Result: [2, 2, 1], return S=3
```

### How does it work?
1. `slow = 0`, `fast = 0`.
2. `fast` scans every element.
3. If `arr[fast]` is worth keeping → write `arr[slow] = arr[fast]`, then `slow++`.
4. Always `fast++`.
5. After loop ends, `slow` is the new length; `arr[0..slow-1]` is the result.

### Why does it work?
`slow` is the write head — it only moves when a valid element is written. The gap `[slow..fast-1]` is the discarded region. No element is visited more than once.

### When to use? / When NOT to use?
- Use: remove elements in-place, move zeroes, deduplicate sorted array
- Use: "O(1) extra space", "modify array in-place"
- NOT: looking for a pair (use opposite-direction)
- NOT: need a contiguous window of elements (use sliding window)

### How to recognize?
Does the problem ask to remove/filter elements in-place? → Is order of remaining elements preserved? → Can you decide keep/skip one element at a time?
- Signal: "remove element", "move zeroes to end"
- Signal: "remove duplicates from sorted array"

### Simple Example
Input: `[0, 1, 0, 3, 12]`, move zeroes to end
Output: `[1, 3, 12, 0, 0]`
Trace: slow=0; fast hits 0 (skip), 1 (write→slow=1), 0 (skip), 3 (write→slow=2), 12 (write→slow=3). Fill rest with 0.

### Code
```java
public int removeElement(int[] nums, int val) {
    int slow = 0;
    for (int fast = 0; fast < nums.length; fast++) {
        if (nums[fast] != val) nums[slow++] = nums[fast];
    }
    return slow;
}
```
```javascript
function removeElement(nums, val) {
    let slow = 0;
    for (let fast = 0; fast < nums.length; fast++) {
        if (nums[fast] !== val) nums[slow++] = nums[fast];
    }
    return slow;
}
```

### Dry Run
Input: `[3, 2, 2, 3]`, val = 3
| fast | nums[fast] | Keep? | slow after | Array state |
|------|-----------|-------|-----------|-------------|
| 0 | 3 | No | 0 | [3,2,2,3] |
| 1 | 2 | Yes | 1 | [2,2,2,3] |
| 2 | 2 | Yes | 2 | [2,2,2,3] |
| 3 | 3 | No | 2 | done → len=2 |

### Complexity
Time: O(n) — fast visits every element exactly once
Space: O(1) — in-place, no extra storage

### Common Trap + Experience Tip
**Trap:** Swapping element with the tail (like a partition) changes order — only safe if order doesn't matter. For "move zeroes" where relative order must be preserved, use slow/fast write, don't swap with end.
**Tip:** "Allow at most K duplicates" generalization: keep if `slow < k || nums[slow - k] != nums[fast]`.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 27 | Remove Element | Easy | Basic slow/fast template | https://leetcode.com/problems/remove-element/ |
| 26 | Remove Duplicates from Sorted Array | Easy | Keep first of each value | https://leetcode.com/problems/remove-duplicates-from-sorted-array/ |
| 283 | Move Zeroes | Easy | Write non-zeros, fill rest | https://leetcode.com/problems/move-zeroes/ |

### One-Minute Revision
```
PATTERN:    Two Pointers — Same Direction (Fast/Slow)
USE WHEN:   In-place filter/remove/compress
CORE IDEA:  slow = write head, fast = read head; write only keepers
TRACK:      slow (next write position)
TIME/SPACE: O(n) / O(1)
TRAP:       Swap-with-tail breaks order; use write pattern instead
```

---

## Sliding Window — Fixed Size

### What is it?
Maintain a window of exactly K elements. Instead of recomputing the aggregate from scratch each step, subtract the element leaving and add the element entering. One pass, O(n).

### Visual
```
[2, 1, 5, 1, 3, 2]  K=3
[2, 1, 5]           sum=8
   [1, 5, 1]        sum=8-2+1=7
      [5, 1, 3]     sum=7-1+3=9  ← max
         [1, 3, 2]  sum=9-5+2=6
```

### How does it work?
1. Compute aggregate for first K elements.
2. Track this as `best`.
3. For each next element `i` from `K` to `n-1`: `windowVal += arr[i] - arr[i - K]`.
4. Update `best`.
5. Return `best`.

### Why does it work?
Each element enters the window once and leaves once — 2n operations total regardless of K. The "remove-one-add-one" update replaces recomputing K elements each step.

### When to use? / When NOT to use?
- Use: "subarray of exactly size K", "average of every K elements"
- Use: fixed-size anagram/permutation check
- NOT: window size can vary (use variable sliding window)
- NOT: need min/max inside each window (use monotonic deque)

### How to recognize?
Is K given explicitly and fixed? → Is the problem about every window of that size?
- Signal: "maximum average subarray of length k"
- Signal: "find all anagrams" (window size = pattern length)

### Simple Example
Input: `[1, 12, -5, -6, 50, 3]`, K=4
Output: max average = `12.75` (window `[12,-5,-6,50]` → sum=51)
Trace: initial sum=1+12-5-6=2; +50-1=51 (best); +3-12=42. Max=51, avg=12.75.

### Code
```java
public double findMaxAverage(int[] nums, int k) {
    double windowSum = 0;
    for (int i = 0; i < k; i++) windowSum += nums[i];
    double best = windowSum;
    for (int i = k; i < nums.length; i++) {
        windowSum += nums[i] - nums[i - k];
        best = Math.max(best, windowSum);
    }
    return best / k;
}
```
```javascript
function findMaxAverage(nums, k) {
    let windowSum = nums.slice(0, k).reduce((a, b) => a + b, 0);
    let best = windowSum;
    for (let i = k; i < nums.length; i++) {
        windowSum += nums[i] - nums[i - k];
        best = Math.max(best, windowSum);
    }
    return best / k;
}
```

### Dry Run
Input: `[2, 1, 5, 1, 3, 2]`, K=3
| i | Enter | Leave | windowSum | best |
|---|-------|-------|-----------|------|
| init | — | — | 8 | 8 |
| 3 | 1 | 2 | 7 | 8 |
| 4 | 3 | 1 | 9 | 9 |
| 5 | 2 | 5 | 6 | 9 |

### Complexity
Time: O(n) — each element added and removed exactly once
Space: O(1) for sum; O(K) if storing a frequency map

### Common Trap + Experience Tip
**Trap:** For anagram problems, comparing full frequency maps each step is O(26·n). Instead, maintain a `matchCount` integer — increment when a char's count hits the required value, decrement when it drops below.
**Tip:** Initialize the first window before the loop; start the loop at index K, not 0.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 643 | Maximum Average Subarray I | Easy | Basic template | https://leetcode.com/problems/maximum-average-subarray-i/ |
| 438 | Find All Anagrams in a String | Medium | Track matchCount not full map | https://leetcode.com/problems/find-all-anagrams-in-a-string/ |

### One-Minute Revision
```
PATTERN:    Sliding Window — Fixed Size
USE WHEN:   Exact window size K given; compute aggregate over every window
CORE IDEA:  windowVal += enter - leave (no full recompute)
TRACK:      running aggregate, best seen so far
TIME/SPACE: O(n) / O(1)
TRAP:       Don't recompute full window; init first K before loop starts
```

---

## Sliding Window — Variable Size

### What is it?
A window `[left..right]` that expands right on every step and shrinks from the left only when a constraint is violated. Left never moves backward. Total left moves across entire run ≤ n → O(n).

### Visual
```
Find longest substring with all unique chars: "abcabcbb"
a b c a b c b b
L R             add 'a' → {a}
L   R           add 'b' → {a,b}
L     R         add 'c' → {a,b,c}  len=3 ✓
  L     R       'a' dup → shrink: remove 'a', L++; add 'a' → {b,c,a}
```

### How does it work?
1. `left = 0`, window state = empty.
2. For each `right`: add `arr[right]` to window state.
3. While window is **invalid**: remove `arr[left]`, `left++`.
4. Window is now valid → update `best = max(best, right - left + 1)`.
5. Repeat until `right` reaches end.

### Why does it work?
`left` only ever moves right. Over the entire algorithm, `left` advances at most n times. Combined with n right-pointer steps: O(2n) = O(n).

### When to use? / When NOT to use?
- Use: "longest/shortest subarray satisfying condition" where condition is monotonic
- Use: "at most K distinct characters", "no repeating characters"
- NOT: exact sum with negative numbers (shrinking doesn't reliably reduce sum → use prefix sum + HashMap)
- NOT: subsequences (non-contiguous)

### How to recognize?
Does the problem ask for longest/shortest? → Is there a constraint on the window's contents? → If window is invalid, does adding more always keep it invalid?
- Signal: "longest substring without repeating characters"
- Signal: "minimum size subarray with sum ≥ target"
- Signal: "longest repeating character replacement"

### Simple Example
Input: `s = "abcabcbb"`, find longest substring without repeats
Output: `3` ("abc")
Trace: right expands; at right=3 ('a'), 'a' already in set → shrink left until 'a' removed, then add new 'a'. Best stays 3.

### Code
```java
public int lengthOfLongestSubstring(String s) {
    Set<Character> window = new HashSet<>();
    int left = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        while (window.contains(s.charAt(right))) {
            window.remove(s.charAt(left++));
        }
        window.add(s.charAt(right));
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```
```javascript
function lengthOfLongestSubstring(s) {
    const window = new Set();
    let left = 0, best = 0;
    for (let right = 0; right < s.length; right++) {
        while (window.has(s[right])) window.delete(s[left++]);
        window.add(s[right]);
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```

### Dry Run
Input: `"abca"`, find longest no-repeat
| right | char | window before | action | window after | left | best |
|-------|------|--------------|--------|-------------|------|------|
| 0 | a | {} | add | {a} | 0 | 1 |
| 1 | b | {a} | add | {a,b} | 0 | 2 |
| 2 | c | {a,b} | add | {a,b,c} | 0 | 3 |
| 3 | a | {a,b,c} | shrink(rm a,L=1), add | {b,c,a} | 1 | 3 |

### Complexity
Time: O(n) — left and right each advance at most n times
Space: O(min(n, alphabet)) — window set size bounded by unique chars

### Common Trap + Experience Tip
**Trap:** Using sliding window for "subarray sum equals K" when array has negatives. Shrinking from left doesn't reliably decrease the sum. Use prefix sum + HashMap instead.
**Tip:** "Exactly K" problems often reduce to `atMost(K) - atMost(K-1)`. Write one helper function, call it twice.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 3 | Longest Substring Without Repeating Characters | Medium | Classic template | https://leetcode.com/problems/longest-substring-without-repeating-characters/ |
| 209 | Minimum Size Subarray Sum | Medium | Shrink while valid (not while invalid) | https://leetcode.com/problems/minimum-size-subarray-sum/ |
| 424 | Longest Repeating Character Replacement | Medium | Window valid if len - maxFreq ≤ k | https://leetcode.com/problems/longest-repeating-character-replacement/ |

### One-Minute Revision
```
PATTERN:    Sliding Window — Variable Size
USE WHEN:   Longest/shortest subarray under a monotonic constraint
CORE IDEA:  right always expands; left shrinks only on violation
TRACK:      left, window state (set/map/sum), best length
TIME/SPACE: O(n) / O(k) where k = distinct elements
TRAP:       Not for exact sum + negatives; window size = right - left + 1
```

---

## Prefix Sum

### What is it?
Precompute a cumulative sum array so any range sum `[l..r]` is answered in O(1) with one subtraction. Combined with a HashMap, it solves "count subarrays with sum = K" in O(n) even with negatives.

### Visual
```
arr    =  [3,  1,  4,  1,  5]
prefix = [0,  3,  4,  8,  9, 14]
          ↑ always 0

sum(1..3) = prefix[4] - prefix[1] = 9 - 3 = 6  ✓ (1+4+1=6)
```

### How does it work?
1. Build: `prefix[0] = 0`; `prefix[i] = prefix[i-1] + arr[i-1]`. Size = n+1.
2. Range query `[l, r]` (inclusive, 0-indexed): `prefix[r+1] - prefix[l]`.
3. For "count subarrays with sum = K": want `prefix[j] - prefix[i] = K`, i.e., `prefix[i] = prefix[j] - K`.
4. Maintain `map = {0: 1}`. For each `j`: `count += map[prefix[j] - K]`, then add `prefix[j]` to map.

### Why does it work?
`prefix[i]` is the total distance traveled to checkpoint `i`. Any range is the difference between two checkpoints — no re-traversal needed.

### When to use? / When NOT to use?
- Use: multiple range sum queries on a static array
- Use: "count subarrays with sum = K" (works with negatives!)
- NOT: array is modified between queries (use Fenwick Tree)
- NOT: only a single range query needed (just loop)

### How to recognize?
Is there a range sum query? → Are there multiple queries or unknown subarrays to check? → Does "subarray sum = K" appear with possible negative numbers?
- Signal: "range sum query", "sum between indices i and j"
- Signal: "number of subarrays with sum equal to k"
- Signal: "product of array except self" (use prefix + suffix product)

### Simple Example
Input: `[1, 1, 1]`, K=2, count subarrays
Output: `2` (indices 0-1 and 1-2)
Trace: map={0:1}; i=0: sum=1, need -1 (0), count=0, map={0:1,1:1}; i=1: sum=2, need 0 (1), count=1, map={0:1,1:1,2:1}; i=2: sum=3, need 1 (1), count=2.

### Code
```java
public int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> prefixCount = new HashMap<>();
    prefixCount.put(0, 1);
    int prefixSum = 0, count = 0;
    for (int num : nums) {
        prefixSum += num;
        count += prefixCount.getOrDefault(prefixSum - k, 0);
        prefixCount.merge(prefixSum, 1, Integer::sum);
    }
    return count;
}
```
```javascript
function subarraySum(nums, k) {
    const map = new Map([[0, 1]]);
    let prefixSum = 0, count = 0;
    for (const num of nums) {
        prefixSum += num;
        count += map.get(prefixSum - k) ?? 0;
        map.set(prefixSum, (map.get(prefixSum) ?? 0) + 1);
    }
    return count;
}
```

### Dry Run
Input: `[1, 1, 1]`, K=2
| i | num | prefixSum | need (sum-K) | map.get(need) | count | map |
|---|-----|-----------|--------------|---------------|-------|-----|
| — | — | 0 | — | — | 0 | {0:1} |
| 0 | 1 | 1 | -1 | 0 | 0 | {0:1,1:1} |
| 1 | 1 | 2 | 0 | 1 | 1 | {0:1,1:1,2:1} |
| 2 | 1 | 3 | 1 | 1 | 2 | {0:1,1:1,2:1,3:1} |

### Complexity
Time: O(n) — single pass through array
Space: O(n) — prefix sum map stores up to n distinct values

### Common Trap + Experience Tip
**Trap:** Off-by-one. `prefix` has `n+1` elements. Range `[l, r]` inclusive = `prefix[r+1] - prefix[l]`, not `prefix[r] - prefix[l-1]`.
**Tip:** Always seed the map with `{0: 1}` before the loop. Without it, subarrays starting at index 0 (where prefixSum itself equals K) are missed.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 303 | Range Sum Query - Immutable | Easy | Basic prefix build + query | https://leetcode.com/problems/range-sum-query-immutable/ |
| 560 | Subarray Sum Equals K | Medium | Prefix + HashMap, seed {0:1} | https://leetcode.com/problems/subarray-sum-equals-k/ |
| 238 | Product of Array Except Self | Medium | Prefix product + suffix product | https://leetcode.com/problems/product-of-array-except-self/ |

### One-Minute Revision
```
PATTERN:    Prefix Sum
USE WHEN:   Range sum queries; count subarrays with sum = K (even w/ negatives)
CORE IDEA:  prefix[r+1] - prefix[l] = sum[l..r]; map lookup replaces brute search
TRACK:      prefix array OR running sum + frequency map
TIME/SPACE: O(n) build + O(1) query / O(n)
TRAP:       Off-by-one on indices; forget to seed map with {0:1}
```

---

## Kadane's Algorithm (Maximum Subarray)

### What is it?
At each element, decide: extend the current running sum, or start fresh here. A negative running prefix only hurts what comes next — discard it. One pass, O(n), O(1) space.

### Visual
```
[-2, 1, -3, 4, -1, 2, 1, -5, 4]
  ↓  ↓   ↓  ↓   ↓  ↓  ↓   ↓  ↓
cur -2  1  -2  4   3  5  6   1  5
max -2  1   1  4   4  5  6   6  6  ← answer = 6
         ↑ start fresh (cur was -2, new=1 wins)
```

### How does it work?
1. `currentSum = nums[0]`, `globalMax = nums[0]`.
2. For each element from index 1:
3. `currentSum = max(nums[i], currentSum + nums[i])` — extend or restart.
4. `globalMax = max(globalMax, currentSum)`.
5. Return `globalMax`.

### Why does it work?
This is DP: `dp[i]` = max sum subarray ending at `i` = `max(arr[i], dp[i-1] + arr[i])`. Since `dp[i]` only needs `dp[i-1]`, the array collapses to one variable.

### When to use? / When NOT to use?
- Use: "maximum sum contiguous subarray"
- Use: "best time to buy/sell stock" (convert to max subarray of daily differences)
- NOT: non-contiguous (subsequence) → different DP
- NOT: circular array → need `total - minSubarray` variant

### How to recognize?
Is the goal to maximize (or minimize) a sum over a contiguous range? → Are there negative numbers that should sometimes be skipped?
- Signal: "maximum subarray", "largest sum contiguous"
- Signal: "best time to buy and sell stock" (one transaction)
- Signal: "maximum product subarray" (Kadane's variant with min tracking)

### Simple Example
Input: `[-2, 1, -3, 4, -1, 2, 1, -5, 4]`
Output: `6` (subarray `[4, -1, 2, 1]`)
Trace: running sums: -2 → 1 → -2 → 4 → 3 → 5 → 6 → 1 → 5. Global max=6.

### Code
```java
public int maxSubArray(int[] nums) {
    int currentSum = nums[0], globalMax = nums[0];
    for (int i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        globalMax = Math.max(globalMax, currentSum);
    }
    return globalMax;
}
```
```javascript
function maxSubArray(nums) {
    let currentSum = nums[0], globalMax = nums[0];
    for (let i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        globalMax = Math.max(globalMax, currentSum);
    }
    return globalMax;
}
```

### Dry Run
Input: `[-2, 1, -3, 4, -1, 2, 1]`
| i | nums[i] | cur+nums[i] | currentSum | globalMax |
|---|---------|-------------|------------|-----------|
| 0 | -2 | — | -2 | -2 |
| 1 | 1 | -1 | 1 | 1 |
| 2 | -3 | -2 | -2 | 1 |
| 3 | 4 | 2 | 4 | 4 |
| 4 | -1 | 3 | 3 | 4 |
| 5 | 2 | 5 | 5 | 5 |
| 6 | 1 | 6 | 6 | 6 |

### Complexity
Time: O(n) — single pass, one decision per element
Space: O(1) — two variables only

### Common Trap + Experience Tip
**Trap:** Maximum *product* subarray — can't just track current max. A large negative times another negative becomes positive. Track both `currentMax` and `currentMin` at every step.
**Tip:** Start `currentSum` and `globalMax` at `nums[0]`, not `0`. Initializing at `0` breaks for all-negative arrays (answer would be wrongly `0`).

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 53 | Maximum Subarray | Easy | Classic Kadane's template | https://leetcode.com/problems/maximum-subarray/ |
| 152 | Maximum Product Subarray | Medium | Track both max and min | https://leetcode.com/problems/maximum-product-subarray/ |
| 121 | Best Time to Buy and Sell Stock | Easy | Max subarray of daily diffs | https://leetcode.com/problems/best-time-to-buy-and-sell-stock/ |

### One-Minute Revision
```
PATTERN:    Kadane's Algorithm
USE WHEN:   Maximum sum contiguous subarray
CORE IDEA:  Extend or restart — negative prefix only hurts future elements
TRACK:      currentSum (best ending here), globalMax (best ever)
TIME/SPACE: O(n) / O(1)
TRAP:       Init at nums[0] not 0; product variant must track min too
```

---

## Pattern Selection Guide

| Clue in the Problem | Pattern |
|---------------------|---------|
| Sorted array + find pair with sum | Two Pointers — Opposite Ends |
| Remove/filter elements in-place, preserve order | Two Pointers — Same Direction |
| "Subarray of exactly size K", every window | Sliding Window — Fixed Size |
| "Longest/shortest subarray where [condition]" (monotonic) | Sliding Window — Variable Size |
| "Sum of subarray [i..j]", range queries, subarray sum = K | Prefix Sum (+HashMap) |
| "Maximum sum contiguous subarray" | Kadane's Algorithm |
| Exact sum = K with **negatives**, count subarrays | Prefix Sum + HashMap (not sliding window) |
| Window condition is not monotonic | Prefix Sum + HashMap |
| O(1) space required + pair/filter/subarray | Two Pointers or Kadane's |

**Subarray vs Subsequence check:** If elements must be contiguous → subarray → use patterns above. If elements can be non-contiguous → subsequence → use DP.

---

## Three Pointers

### What is it?
Three index variables (commonly named `low`, `mid`, `high` or `i`, `j`, `k`) operating simultaneously to partition or categorize array elements into three groups in a single pass, or to fix one element and use two-pointer search on the rest.

### Visual
```
Sort Colors (Dutch National Flag): arr = [2, 0, 2, 1, 1, 0]
low=0, mid=0, high=5

[2, 0, 2, 1, 1, 0]   arr[mid]=2 → swap(mid,high), high--
 L  M           H
[0, 0, 2, 1, 1, 2]   arr[mid]=0 → swap(low,mid), low++, mid++
 L  M        H
[0, 0, 2, 1, 1, 2]   arr[mid]=2 → swap(mid,high), high--
    L  M     H
[0, 0, 1, 1, 2, 2]   arr[mid]=1 → mid++
    L     H
       M              mid > high → done!
Result: [0, 0, 1, 1, 2, 2]
```

### How does it work?
**For Dutch National Flag / 3-way partition:**
1. `low = 0`, `mid = 0`, `high = n - 1`.
2. While `mid <= high`:
   - `arr[mid] == 0`: swap(`arr[low]`, `arr[mid]`), `low++`, `mid++`.
   - `arr[mid] == 1`: `mid++`.
   - `arr[mid] == 2`: swap(`arr[mid]`, `arr[high]`), `high--` (do NOT `mid++`).
3. Invariants: `[0..low-1]` = 0s, `[low..mid-1]` = 1s, `[high+1..n-1]` = 2s.

**For 3Sum (sorted triplets):**
1. Sort the array. Fix `i`, use two-pointer `left = i+1`, `right = n-1`.
2. If sum < target → `left++`; if sum > target → `right--`; if match → record and skip duplicates.

### Why does it work?
Each pointer partitions a known region. When `mid` advances, the element is classified. When `high` retreats, an unprocessed element arrives at `mid` — hence `mid` must not advance. The three invariant regions are maintained at every step. Total work = O(n).

### When to use? / When NOT to use?
- Use: partition array into exactly three categories in one pass
- Use: find all unique triplets summing to a target (after sorting)
- NOT: more than three categories in one pass (use counting sort)
- NOT: unsorted + three-sum without sorting (use nested HashMap for O(n²))

### How to recognize?
Is the problem sorting/grouping into exactly three categories? Or finding three elements with a sum condition?
- Signal: "sort colors", "partition into three groups"
- Signal: "3Sum", "triplets", "three numbers summing to target"
- Signal: low/mid/high style partitioning, or fix-one + two-pointer structure

### Simple Example
Input: `[2, 0, 2, 1, 1, 0]` (Sort Colors)
Output: `[0, 0, 1, 1, 2, 2]`
Trace: `mid` processes each element — swaps 0s toward `low`, swaps 2s toward `high`, leaves 1s in place. Single pass, no extra space.

### Code
```java
// Sort Colors — Dutch National Flag (three pointers)
public void sortColors(int[] nums) {
    int low = 0, mid = 0, high = nums.length - 1;
    while (mid <= high) {
        if (nums[mid] == 0) {
            int tmp = nums[low]; nums[low] = nums[mid]; nums[mid] = tmp;
            low++; mid++;
        } else if (nums[mid] == 1) {
            mid++;
        } else {
            int tmp = nums[mid]; nums[mid] = nums[high]; nums[high] = tmp;
            high--; // do NOT mid++ — unprocessed element just arrived
        }
    }
}

// 3Sum — find all unique triplets summing to 0
public List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> result = new ArrayList<>();
    for (int i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        int left = i + 1, right = nums.length - 1;
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            if (sum == 0) {
                result.add(Arrays.asList(nums[i], nums[left], nums[right]));
                while (left < right && nums[left] == nums[left + 1]) left++;
                while (left < right && nums[right] == nums[right - 1]) right--;
                left++; right--;
            } else if (sum < 0) left++;
            else right--;
        }
    }
    return result;
}
```
```javascript
// Sort Colors — Dutch National Flag
function sortColors(nums) {
    let low = 0, mid = 0, high = nums.length - 1;
    while (mid <= high) {
        if (nums[mid] === 0) {
            [nums[low], nums[mid]] = [nums[mid], nums[low]];
            low++; mid++;
        } else if (nums[mid] === 1) {
            mid++;
        } else {
            [nums[mid], nums[high]] = [nums[high], nums[mid]];
            high--;
        }
    }
}

// 3Sum
function threeSum(nums) {
    nums.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] === nums[i - 1]) continue;
        let left = i + 1, right = nums.length - 1;
        while (left < right) {
            const sum = nums[i] + nums[left] + nums[right];
            if (sum === 0) {
                result.push([nums[i], nums[left], nums[right]]);
                while (left < right && nums[left] === nums[left + 1]) left++;
                while (left < right && nums[right] === nums[right - 1]) right--;
                left++; right--;
            } else if (sum < 0) left++;
            else right--;
        }
    }
    return result;
}
```

### Dry Run
Input (3Sum): `[-4, -1, -1, 0, 1, 2]` (already sorted)
| i | nums[i] | left | right | sum | action |
|---|---------|------|-------|-----|--------|
| 0 | -4 | 1 | 5 | -4-1+2=-3 | sum<0, left++ |
| 0 | -4 | 2 | 5 | -4-1+2=-3 | sum<0, left++ |
| 0 | -4 | 3 | 5 | -4+0+2=-2 | sum<0, left++ |
| 0 | -4 | 4 | 5 | -4+1+2=-1 | sum<0, left++ |
| 1 | -1 | 2 | 5 | -1-1+2=0 | match → [−1,−1,2] |
| 1 | -1 | 3 | 4 | -1+0+1=0 | match → [−1,0,1] |

### Complexity
Time: O(n²) for 3Sum (outer loop × two-pointer inner); O(n) for Sort Colors / partition
Space: O(1) auxiliary (O(n) for 3Sum result list)

### Common Trap + Experience Tip
**Trap:** In 3Sum, when a match is found, forgetting to skip all duplicate `left` and `right` values before advancing both pointers — produces repeated triplets in the output.
**Tip:** For Sort Colors, do NOT increment `mid` after swapping with `high`. The element that just arrived at `mid` from the right has not been categorized yet.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 15 | 3Sum | Medium | Sort first; skip duplicates at all three pointer positions | https://leetcode.com/problems/3sum/ |
| 16 | 3Sum Closest | Medium | Track minimum absolute difference; two-pointer inner loop per i | https://leetcode.com/problems/3sum-closest/ |
| 75 | Sort Colors | Medium | mid does not advance after swap with high | https://leetcode.com/problems/sort-colors/ |
| 80 | Remove Duplicates from Sorted Array II | Medium | Keep element if slow < 2 or nums[slow-2] != nums[fast] | https://leetcode.com/problems/remove-duplicates-from-sorted-array-ii/ |
| 18 | 4Sum | Medium | Two nested loops reduce to two-pointer inner loop; skip duplicates at all four levels | https://leetcode.com/problems/4sum/ |

### One-Minute Revision
```
PATTERN:    Three Pointers
USE WHEN:   Partition into 3 groups (one pass) OR find triplets with sum condition
CORE IDEA:  low/mid/high maintain three invariant regions simultaneously
TRACK:      low (next < boundary), mid (current), high (next > boundary)
TIME/SPACE: O(n²) for 3Sum / O(n) for partition; O(1) extra
TRAP:       Never advance mid after swap with high; skip all duplicates in 3Sum
```

---

## Prefix XOR

### What is it?
Build a prefix XOR array where `prefix[i] = arr[0] XOR arr[1] XOR ... XOR arr[i-1]`. The XOR of any subarray `[l..r]` equals `prefix[r+1] XOR prefix[l]`. This works because XOR is its own inverse: `a XOR a = 0`.

### Visual
```
arr    =  [1,  3,  2,  3,  1]
prefix = [0,  1,  2,  0,  3,  2]
          ↑ always 0

XOR(0..2) = prefix[3] XOR prefix[0] = 0 XOR 0 = 0   ✓ (1^3^2=0)
XOR(1..3) = prefix[4] XOR prefix[1] = 3 XOR 1 = 2   ✓ (3^2^3=2)
XOR(0..4) = prefix[5] XOR prefix[0] = 2 XOR 0 = 2   ✓
```

### How does it work?
1. Build: `prefix[0] = 0`; `prefix[i] = prefix[i-1] XOR arr[i-1]`. Size = n+1.
2. Range XOR query `[l, r]` (0-indexed, inclusive): `prefix[r+1] XOR prefix[l]`.
3. For "count triplets where XOR(A) == XOR(B)": this holds iff `XOR(arr[i..k]) = 0`. If `prefix[i] == prefix[k+1]`, any split `j` (i ≤ j < k) works, contributing `k - i` valid triplets.

### Why does it work?
XOR is associative, commutative, and self-inverse (`a XOR a = 0`). `prefix[r+1] XOR prefix[l]` cancels out the first `l` elements, leaving exactly the XOR of elements from index `l` to `r`.

### When to use? / When NOT to use?
- Use: multiple range XOR queries on a static array
- Use: "count subarrays/pairs/triplets with XOR = K"
- NOT: range sum or product queries (use prefix sum or prefix product)
- NOT: array is modified between queries (use a segment tree)

### How to recognize?
Does the problem involve XOR across a subarray or range? Are there multiple range XOR queries?
- Signal: "XOR of all elements between indices i and j"
- Signal: "count triplets that can form two arrays of equal XOR"
- Signal: "find subarray where XOR equals k"

### Simple Example
Input: `arr = [1, 3, 2, 3, 1]`, queries `[[0,2],[1,3]]`
Output: `[0, 2]`
Trace: prefix=[0,1,2,0,3,2]. Query[0,2]: prefix[3]^prefix[0]=0^0=0. Query[1,3]: prefix[4]^prefix[1]=3^1=2.

### Code
```java
// XOR Queries of a Subarray
public int[] xorQueries(int[] arr, int[][] queries) {
    int n = arr.length;
    int[] prefix = new int[n + 1];
    for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] ^ arr[i];
    int[] result = new int[queries.length];
    for (int i = 0; i < queries.length; i++) {
        result[i] = prefix[queries[i][1] + 1] ^ prefix[queries[i][0]];
    }
    return result;
}
```
```javascript
// XOR Queries of a Subarray
function xorQueries(arr, queries) {
    const n = arr.length;
    const prefix = new Array(n + 1).fill(0);
    for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] ^ arr[i];
    return queries.map(([l, r]) => prefix[r + 1] ^ prefix[l]);
}
```

### Dry Run
Input: `arr = [1, 3, 2, 3, 1]`
| i | arr[i] | prefix[i+1] = prefix[i] ^ arr[i] |
|---|--------|----------------------------------|
| 0 | 1 | 0 ^ 1 = 1 |
| 1 | 3 | 1 ^ 3 = 2 |
| 2 | 2 | 2 ^ 2 = 0 |
| 3 | 3 | 0 ^ 3 = 3 |
| 4 | 1 | 3 ^ 1 = 2 |

prefix = [0, 1, 2, 0, 3, 2]. Query [0,2]: prefix[3]^prefix[0] = 0^0 = 0 ✓

### Complexity
Time: O(n) to build prefix array; O(1) per query
Space: O(n) for the prefix XOR array

### Common Trap + Experience Tip
**Trap:** Off-by-one on indices — identical to prefix sum. Range `[l, r]` inclusive = `prefix[r+1] XOR prefix[l]`, not `prefix[r] XOR prefix[l-1]`.
**Tip:** For "count triplets where XOR(i..k) = 0": if `prefix[i] == prefix[k+1]`, any split point `j` where `i <= j < k` is valid. That contributes `k - i` triplets without inner-loop enumeration.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 1310 | XOR Queries of a Subarray | Medium | Direct prefix XOR range query — identical structure to prefix sum | https://leetcode.com/problems/xor-queries-of-a-subarray/ |
| 2425 | Bitwise XOR of All Pairings | Medium | Count parity of occurrences in each array using XOR properties | https://leetcode.com/problems/bitwise-xor-of-all-pairings/ |
| 1442 | Count Triplets That Can Form Two Arrays of Equal XOR | Medium | If prefix[i]==prefix[k+1], any split j in range contributes k−i triplets | https://leetcode.com/problems/count-triplets-that-can-form-two-arrays-of-equal-xor/ |
| 2997 | Minimum Number of Operations to Make Array XOR Equal to K | Medium | XOR of entire array reveals exactly which bits differ from K | https://leetcode.com/problems/minimum-number-of-operations-to-make-array-xor-equal-to-k/ |
| 1829 | Maximum XOR for Each Query | Medium | Prefix XOR of first k elements; observe the greedy bit-mask construction per query | https://leetcode.com/problems/maximum-xor-for-each-query/ |

### One-Minute Revision
```
PATTERN:    Prefix XOR
USE WHEN:   Range XOR queries; count subarrays/triplets with XOR = K
CORE IDEA:  prefix[r+1] ^ prefix[l] = XOR of arr[l..r]; XOR cancels itself
TRACK:      Prefix XOR array (size n+1, seed prefix[0]=0)
TIME/SPACE: O(n) build + O(1) query / O(n)
TRAP:       Off-by-one same as prefix sum; always seed prefix[0]=0
```

---

## Boyer-Moore Majority Vote

### What is it?
Find the element appearing more than n/2 times in O(n) time and O(1) space. Maintain a `candidate` and a `count` — matching votes increment count, mismatching votes decrement it. When count drops to 0, switch to a new candidate. The majority element always outlives all cancellations.

### Visual
```
arr = [2, 2, 1, 1, 1, 2, 2]

Step:    2   2   1   1   1   2   2
cand:    2   2   2   2   1   1   2
count:   1   2   1   0   1   0   1  ← final candidate = 2

Verify: 2 appears 4 times > 7/2 = 3.5 ✓
```

### How does it work?
1. `candidate = nums[0]`, `count = 1`.
2. For each element from index 1:
   - If `count == 0`: `candidate = nums[i]`, `count = 1`.
   - Else if `nums[i] == candidate`: `count++`.
   - Else: `count--`.
3. `candidate` is the majority element if one is guaranteed to exist.
4. If not guaranteed: do a second pass to verify `candidate` appears more than n/2 times.

### Why does it work?
A majority element has more than n/2 votes. Every cancellation removes one majority vote and one non-majority vote. Because majority votes outnumber all non-majority votes combined, the majority element always has net positive votes remaining after all cancellations.

### When to use? / When NOT to use?
- Use: find element appearing > n/2 times in O(1) space
- Use: find all elements appearing > n/3 times (two-candidate extension)
- NOT: find the most frequent element when no majority guaranteed (use HashMap)
- NOT: k > 3 threshold (Boyer-Moore extends, but HashMap is simpler)

### How to recognize?
Is the problem asking for an element appearing more than half the time? Is O(1) space required?
- Signal: "majority element", "more than half", "more than n/2 times"
- Signal: "find dominant element in O(1) space"
- Signal: "majority vote"

### Simple Example
Input: `[3, 2, 3]`
Output: `3`
Trace: candidate=3, count=1; num=2 → count=0; num=3 → candidate=3, count=1. Return 3.

### Code
```java
public int majorityElement(int[] nums) {
    int candidate = nums[0], count = 1;
    for (int i = 1; i < nums.length; i++) {
        if (count == 0) { candidate = nums[i]; count = 1; }
        else if (nums[i] == candidate) count++;
        else count--;
    }
    return candidate; // guaranteed majority exists in this problem
}
```
```javascript
function majorityElement(nums) {
    let candidate = nums[0], count = 1;
    for (let i = 1; i < nums.length; i++) {
        if (count === 0) { candidate = nums[i]; count = 1; }
        else if (nums[i] === candidate) count++;
        else count--;
    }
    return candidate;
}
```

### Dry Run
Input: `[2, 2, 1, 1, 1, 2, 2]`
| i | nums[i] | action | candidate | count |
|---|---------|--------|-----------|-------|
| 0 | 2 | init | 2 | 1 |
| 1 | 2 | match | 2 | 2 |
| 2 | 1 | diff | 2 | 1 |
| 3 | 1 | diff | 2 | 0 |
| 4 | 1 | reset | 1 | 1 |
| 5 | 2 | diff | 1 | 0 |
| 6 | 2 | reset | 2 | 1 |

Final candidate = 2. Count in array: 4 > 7/2 = 3.5 ✓

### Complexity
Time: O(n) — one pass to find candidate; one optional pass to verify
Space: O(1) — only two variables (candidate and count)

### Common Trap + Experience Tip
**Trap:** The algorithm always returns *some* candidate, even if no majority element exists. If the problem does not guarantee a majority (e.g., Majority Element II), always do a verification pass after the vote phase.
**Tip:** For elements appearing > n/3 times, maintain two candidates with two counts. At most 2 such elements can exist. Run the vote phase with both candidates, then verify each with a count pass.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 169 | Majority Element | Easy | Majority guaranteed — single vote pass is sufficient | https://leetcode.com/problems/majority-element/ |
| 229 | Majority Element II | Medium | At most 2 candidates for >n/3; must verify both after voting | https://leetcode.com/problems/majority-element-ii/ |
| 1150 | Check If a Number Is Majority Element in a Sorted Array | Easy | Binary search for first/last occurrence; count by subtraction | https://leetcode.com/problems/check-if-a-number-is-majority-element-in-a-sorted-array/ |
| 2404 | Most Frequent Even Element | Easy | Most frequent is NOT necessarily majority — observe that HashMap is needed here | https://leetcode.com/problems/most-frequent-even-element/ |
| 1287 | Element Appearing More Than 25% In Sorted Array | Easy | Candidate must be at index n/4, n/2, or 3n/4 in the sorted array | https://leetcode.com/problems/element-appearing-more-than-25-in-sorted-array/ |

### One-Minute Revision
```
PATTERN:    Boyer-Moore Majority Vote
USE WHEN:   Find element appearing > n/2 times in O(1) space
CORE IDEA:  Non-majority votes cancel majority votes; majority outlives all cancellations
TRACK:      candidate (current leader), count (net votes for candidate)
TIME/SPACE: O(n) / O(1)
TRAP:       Algorithm always returns a candidate — verify if majority not guaranteed
```

---

## Dutch National Flag (3-way partition)

### What is it?
Partition an array into three groups — elements less than a pivot, equal to the pivot, and greater than the pivot — in a single O(n) pass using three pointers: `low`, `mid`, and `high`. Named after the three-color bands of the Dutch national flag.

### Visual
```
arr = [2, 0, 2, 1, 1, 0], pivot = 1

Invariants maintained at all times:
  [0 .. low-1]   → all < pivot  (0s)
  [low .. mid-1] → all == pivot (1s)
  [mid .. high]  → unprocessed
  [high+1 .. n-1] → all > pivot (2s)

Initial: [2, 0, 2, 1, 1, 0]   low=0, mid=0, high=5
arr[mid]=2 → swap(mid,high), high--  → [0, 0, 2, 1, 1, 2], high=4
arr[mid]=0 → swap(low,mid), low++, mid++ → [0, 0, 2, 1, 1, 2], low=1, mid=1
arr[mid]=0 → swap(low,mid), low++, mid++ → low=2, mid=2
arr[mid]=2 → swap(mid,high), high--  → [0, 0, 1, 1, 2, 2], high=3
arr[mid]=1 → mid++   → mid=3
arr[mid]=1 → mid++   → mid=4 > high=3 → DONE
Result:  [0, 0, 1, 1, 2, 2]
```

### How does it work?
1. `low = 0`, `mid = 0`, `high = n - 1`.
2. While `mid <= high`:
   - `arr[mid] < pivot`: swap `arr[low]` ↔ `arr[mid]`, `low++`, `mid++`.
   - `arr[mid] == pivot`: `mid++` only.
   - `arr[mid] > pivot`: swap `arr[mid]` ↔ `arr[high]`, `high--` (do NOT `mid++`).
3. After loop: `[0..low-1]` all < pivot, `[low..mid-1]` all == pivot, `[high+1..n-1]` all > pivot.

### Why does it work?
Every step either advances `mid` (element classified) or shrinks the unprocessed region `[mid..high]` from the right. Each element is processed at most once by `mid`. When swapped from `high`, the new element at `mid` is from the unprocessed region and must be examined — hence no `mid++`.

### When to use? / When NOT to use?
- Use: sort an array of exactly 3 distinct values in O(n) one pass
- Use: 3-way pivot partition in QuickSort for arrays with many repeated elements
- NOT: more than 3 distinct groups to partition (use counting sort)
- NOT: general arbitrary-integer sort (standard sort or two-pointer partition)

### How to recognize?
Are there exactly three categories of values to sort or partition in O(n)?
- Signal: "sort array with only 0s, 1s, and 2s"
- Signal: partition around a pivot with many equal elements (QuickSort 3-way)
- Signal: "sort by three categories" (e.g., negative / zero / positive)

### Simple Example
Input: `[2, 0, 1, 2, 1, 0]`
Output: `[0, 0, 1, 1, 2, 2]`
Trace: Three-pointer sweep places 0s at the left, 1s in the middle, 2s at the right — one single O(n) pass with O(1) extra space.

### Code
```java
// Sort Colors — Dutch National Flag
public void sortColors(int[] nums) {
    int low = 0, mid = 0, high = nums.length - 1;
    while (mid <= high) {
        if (nums[mid] == 0) {
            int tmp = nums[low]; nums[low] = nums[mid]; nums[mid] = tmp;
            low++; mid++;
        } else if (nums[mid] == 1) {
            mid++;
        } else {            // nums[mid] == 2
            int tmp = nums[mid]; nums[mid] = nums[high]; nums[high] = tmp;
            high--;         // DO NOT mid++ — unprocessed element just arrived at mid
        }
    }
}

// Generic 3-way partition around any pivot value
public void threeWayPartition(int[] arr, int pivot) {
    int low = 0, mid = 0, high = arr.length - 1;
    while (mid <= high) {
        if (arr[mid] < pivot) {
            int tmp = arr[low]; arr[low] = arr[mid]; arr[mid] = tmp;
            low++; mid++;
        } else if (arr[mid] == pivot) {
            mid++;
        } else {
            int tmp = arr[mid]; arr[mid] = arr[high]; arr[high] = tmp;
            high--;
        }
    }
}
```
```javascript
// Sort Colors — Dutch National Flag
function sortColors(nums) {
    let low = 0, mid = 0, high = nums.length - 1;
    while (mid <= high) {
        if (nums[mid] === 0) {
            [nums[low], nums[mid]] = [nums[mid], nums[low]];
            low++; mid++;
        } else if (nums[mid] === 1) {
            mid++;
        } else {
            [nums[mid], nums[high]] = [nums[high], nums[mid]];
            high--;
        }
    }
}
```

### Dry Run
Input: `[2, 0, 2, 1, 1, 0]`
| low | mid | high | arr[mid] | action | array |
|-----|-----|------|----------|--------|-------|
| 0 | 0 | 5 | 2 | swap(0,5), high-- | [0,0,2,1,1,2] |
| 0 | 0 | 4 | 0 | swap(0,0), low++,mid++ | [0,0,2,1,1,2] |
| 1 | 1 | 4 | 0 | swap(1,1), low++,mid++ | [0,0,2,1,1,2] |
| 2 | 2 | 4 | 2 | swap(2,4), high-- | [0,0,1,1,2,2] |
| 2 | 2 | 3 | 1 | mid++ | [0,0,1,1,2,2] |
| 2 | 3 | 3 | 1 | mid++ | [0,0,1,1,2,2] |
| 2 | 4 | 3 | — | mid>high, stop | [0,0,1,1,2,2] |

### Complexity
Time: O(n) — each element processed by `mid` at most once
Space: O(1) — in-place, three pointer variables only

### Common Trap + Experience Tip
**Trap:** Incrementing `mid` after swapping with `high` — the newly arrived element at `mid` has not been processed, so advancing `mid` skips it and leaves the partition invariant broken.
**Tip:** The invariant "everything before `low` is < pivot, everything before `mid` is == pivot" is the key. Print low/mid/high boundaries after each step when debugging.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 75 | Sort Colors | Medium | Classic DNF — do not increment mid after swap with high | https://leetcode.com/problems/sort-colors/ |
| 905 | Sort Array By Parity | Easy | Two-group version; notice how DNF reduces to a two-pointer when there are only 2 categories | https://leetcode.com/problems/sort-array-by-parity/ |
| 922 | Sort Array By Parity II | Easy | Even-indexed positions need even values — track two independent write pointers | https://leetcode.com/problems/sort-array-by-parity-ii/ |
| 2149 | Rearrange Array Elements by Sign | Medium | Alternating positive/negative placement — observe separate write indices per sign | https://leetcode.com/problems/rearrange-array-elements-by-sign/ |
| 905 | Partition Array into Three Parts With Equal Sum | Easy | Check total divisible by 3; greedily find three prefix sums equal to total/3 | https://leetcode.com/problems/partition-array-into-three-parts-with-equal-sum/ |

### One-Minute Revision
```
PATTERN:    Dutch National Flag (3-way partition)
USE WHEN:   Sort/partition array with exactly 3 distinct values in one O(n) pass
CORE IDEA:  low/mid/high maintain strict invariant regions; mid examines each element once
TRACK:      low (next < slot), mid (current element under inspection), high (next > slot)
TIME/SPACE: O(n) / O(1)
TRAP:       Never increment mid after swap with high — unprocessed element just arrived
```

---

## In-Place Manipulation

### What is it?
Modify an array using O(1) extra space by reusing the array itself to encode extra information — using value signs (negative marking), index arithmetic, or cyclic swaps to track which elements have been seen or where elements belong.

### Visual
```
Find all duplicates in [4, 3, 2, 7, 8, 2, 3, 1] via negative marking:
Use sign of arr[|val|-1] as a "visited" flag.

i=0, val=4  → mark arr[3]=-7:   [4, 3, 2, -7, 8, 2, 3, 1]
i=1, val=3  → mark arr[2]=-2:   [4, 3, -2, -7, 8, 2, 3, 1]
i=2, val=-2 → |val|=2, mark arr[1]=-3: [4, -3, -2, -7, 8, 2, 3, 1]
i=3, val=-7 → |val|=7, mark arr[6]=-3: [4, -3, -2, -7, 8, 2, -3, 1]
i=4, val=8  → mark arr[7]=-1:   [4, -3, -2, -7, 8, 2, -3, -1]
i=5, val=2  → arr[1] already < 0 → 2 is a DUPLICATE!
i=6, val=-3 → arr[2] already < 0 → 3 is a DUPLICATE!
```

### How does it work?
**Negative marking** (values in range [1, n]):
1. For each index `i`, let `idx = |arr[i]| - 1`.
2. If `arr[idx] > 0`: mark `arr[idx] = -arr[idx]` (first visit).
3. If `arr[idx] < 0`: value `idx + 1` has been seen before → it is a duplicate.

**Cyclic sort** (place each value at its correct index):
1. While `arr[i] != i + 1` and `arr[i]` is in `[1, n]` and `arr[arr[i]-1] != arr[i]`: swap `arr[i]` with `arr[arr[i]-1]`.
2. After the sort pass, indices where `arr[i] != i + 1` reveal missing or extra values.

### Why does it work?
When values are in `[1, n]` and indices are in `[0, n-1]`, each value `v` maps to index `v-1`. Using the sign of that slot as a single extra bit per element encodes visit information without extra space. Original values are preserved as absolute values.

### When to use? / When NOT to use?
- Use: detect duplicates or find missing numbers when values are in `[1, n]`
- Use: "O(1) space" + "in-place" + bounded positive integer values
- NOT: values outside `[1, n]` range (negative marking and cyclic sort break down)
- NOT: when the original array must be preserved after the call (signs get mutated)

### How to recognize?
Values in range `[1, n]`, O(1) space required, finding duplicates or missing numbers?
- Signal: "find all duplicates / missing numbers in array of size n, values 1..n"
- Signal: "first missing positive" with O(1) extra space
- Signal: in-place, O(1) space, bounded positive integer values

### Simple Example
Input: `[4, 3, 2, 7, 8, 2, 3, 1]`
Output (duplicates): `[2, 3]`
Trace: As shown in the Visual above — negative-mark `arr[|val|-1]` on first visit; already-negative on second visit means duplicate.

### Code
```java
// Find All Duplicates — negative marking
public List<Integer> findDuplicates(int[] nums) {
    List<Integer> result = new ArrayList<>();
    for (int i = 0; i < nums.length; i++) {
        int idx = Math.abs(nums[i]) - 1;
        if (nums[idx] < 0) result.add(idx + 1); // already visited → duplicate
        else nums[idx] = -nums[idx];             // first visit → mark negative
    }
    return result;
}

// First Missing Positive — cyclic sort
public int firstMissingPositive(int[] nums) {
    int n = nums.length;
    for (int i = 0; i < n; i++) {
        // Swap nums[i] to its correct position nums[i]-1
        while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
            int tmp = nums[nums[i] - 1];
            nums[nums[i] - 1] = nums[i];
            nums[i] = tmp;
        }
    }
    for (int i = 0; i < n; i++) {
        if (nums[i] != i + 1) return i + 1;
    }
    return n + 1;
}
```
```javascript
// Find All Duplicates — negative marking
function findDuplicates(nums) {
    const result = [];
    for (let i = 0; i < nums.length; i++) {
        const idx = Math.abs(nums[i]) - 1;
        if (nums[idx] < 0) result.push(idx + 1);
        else nums[idx] = -nums[idx];
    }
    return result;
}

// First Missing Positive — cyclic sort
function firstMissingPositive(nums) {
    const n = nums.length;
    for (let i = 0; i < n; i++) {
        while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] !== nums[i]) {
            const j = nums[i] - 1;
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }
    }
    for (let i = 0; i < n; i++) {
        if (nums[i] !== i + 1) return i + 1;
    }
    return n + 1;
}
```

### Dry Run
Input: `[3, 1, 3, 4, 2]` — find duplicates via negative marking
| i | nums[i] | idx=\|val\|-1 | nums[idx] | action | result |
|---|---------|--------------|-----------|--------|--------|
| 0 | 3 | 2 | 3 (pos) | mark nums[2]=-3 | [] |
| 1 | 1 | 0 | 3 (pos) | mark nums[0]=-3 | [] |
| 2 | -3 | 2 | -3 (neg) | 3 is duplicate! | [3] |
| 3 | 4 | 3 | 4 (pos) | mark nums[3]=-4 | [3] |
| 4 | 2 | 1 | 1 (pos) | mark nums[1]=-1 | [3] |

### Complexity
Time: O(n) — each element visited at most twice; cyclic sort total swaps ≤ n
Space: O(1) — no extra arrays; information encoded in existing array signs

### Common Trap + Experience Tip
**Trap:** The cyclic sort inner `while` loop will spin infinitely if a duplicate occupies the target slot — always guard with `nums[nums[i]-1] != nums[i]` before swapping.
**Tip:** After negative marking, if you need to return the original array, multiply every negative back to positive. For result collection, use `Math.abs(nums[i])` when reading values mid-loop.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 448 | Find All Numbers Disappeared in an Array | Easy | Negative-mark visited positions; unvisited indices hold missing numbers | https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array/ |
| 442 | Find All Duplicates in an Array | Medium | Mark negative on first visit; already-negative index reveals duplicate value | https://leetcode.com/problems/find-all-duplicates-in-an-array/ |
| 73 | Set Matrix Zeroes | Medium | Use first row and first col as zero-flags; handle row-0 and col-0 edge cases separately | https://leetcode.com/problems/set-matrix-zeroes/ |
| 41 | First Missing Positive | Hard | Cyclic sort places each value v at index v-1; first mismatch is the answer | https://leetcode.com/problems/first-missing-positive/ |
| 344 | Reverse String | Easy | Two-pointer in-place swap — the simplest form of in-place manipulation | https://leetcode.com/problems/reverse-string/ |

### One-Minute Revision
```
PATTERN:    In-Place Manipulation
USE WHEN:   Values in [1,n], O(1) space, find duplicates or missing numbers
CORE IDEA:  Use sign of arr[|val|-1] as visited bit; cyclic sort maps val to index val-1
TRACK:      Index mapping: value v → position v-1
TIME/SPACE: O(n) / O(1)
TRAP:       Guard cyclic-sort swap to prevent infinite loop on duplicates
```

---

## Matrix Traversal

### What is it?
Navigate a 2D grid using systematic index arithmetic — a 4-directional delta array for BFS/DFS from a cell, or boundary-shrinking loops for spiral and layer-by-layer traversal patterns.

### Visual
```
4-directional delta array (up, down, left, right):
dirs = [[-1,0], [1,0], [0,-1], [0,1]]

BFS/DFS from cell (r,c):
  for [dr,dc] in dirs:
      nr, nc = r+dr, c+dc
      if 0 <= nr < rows and 0 <= nc < cols and valid:
          process(nr, nc)

Spiral traversal boundaries (shrink inward after each pass):
  top=0, bottom=m-1, left=0, right=n-1
  → right along top row → down along right col
  → left along bottom row (if top<=bottom)
  → up along left col (if left<=right)
  → top++, right--, bottom--, left++; repeat
```

### How does it work?
**4-directional BFS/DFS:**
1. Define `dirs = [[-1,0],[1,0],[0,-1],[0,1]]`.
2. From cell `(r, c)`, generate neighbor `(r+dr, c+dc)` for each direction.
3. Bounds-check: `0 <= nr < rows && 0 <= nc < cols`.
4. Validity check: not visited, not blocked.
5. BFS: enqueue; DFS: recurse or push to stack.

**Spiral:**
1. Maintain `top`, `bottom`, `left`, `right` boundaries.
2. Four passes per layer: left→right across `top`, top→bottom along `right`, right→left across `bottom` (if `top <= bottom`), bottom→top along `left` (if `left <= right`).
3. Shrink all four boundaries after each full layer. Stop when `top > bottom` or `left > right`.

### Why does it work?
The delta array encapsulates all four direction offsets so a single loop replaces four separate if-statements. Spiral boundary contraction guarantees each cell is visited exactly once per layer traversal. Both patterns are O(m×n) because every cell is processed exactly once.

### When to use? / When NOT to use?
- Use: island/region counting, flood fill, shortest path in a grid (BFS)
- Use: spiral output, 90° rotation, layer-by-layer processing
- NOT: tree or graph problems without a grid structure (no delta array needed)
- NOT: 1D array problems (linear pointers, not 2D deltas)

### How to recognize?
Is the input a 2D grid? Do you need to visit neighbors or traverse in a geometric pattern?
- Signal: "number of islands", "flood fill", "connected cells"
- Signal: "spiral matrix", "rotate image", "layer traversal"
- Signal: "shortest path in grid", "minimum steps" (use BFS)

### Simple Example
Input: `[[1,2,3],[4,5,6],[7,8,9]]`
Spiral output: `[1,2,3,6,9,8,7,4,5]`
Trace: top row→[1,2,3]; right col→[6,9]; bottom row reversed→[8,7]; left col reversed→[4]; boundaries shrink to center→[5].

### Code
```java
// Spiral Matrix
public List<Integer> spiralOrder(int[][] matrix) {
    List<Integer> result = new ArrayList<>();
    int top = 0, bottom = matrix.length - 1;
    int left = 0, right = matrix[0].length - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++)  result.add(matrix[top][c]);
        top++;
        for (int r = top; r <= bottom; r++)  result.add(matrix[r][right]);
        right--;
        if (top <= bottom)
            for (int c = right; c >= left; c--) result.add(matrix[bottom][c]);
        bottom--;
        if (left <= right)
            for (int r = bottom; r >= top; r--) result.add(matrix[r][left]);
        left++;
    }
    return result;
}

// Number of Islands — DFS flood fill
public int numIslands(char[][] grid) {
    int count = 0;
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    for (int r = 0; r < grid.length; r++)
        for (int c = 0; c < grid[0].length; c++)
            if (grid[r][c] == '1') { count++; dfs(grid, r, c, dirs); }
    return count;
}
private void dfs(char[][] grid, int r, int c, int[][] dirs) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] != '1') return;
    grid[r][c] = '0'; // mark visited
    for (int[] d : dirs) dfs(grid, r + d[0], c + d[1], dirs);
}
```
```javascript
// Spiral Matrix
function spiralOrder(matrix) {
    const result = [];
    let top = 0, bottom = matrix.length - 1;
    let left = 0, right = matrix[0].length - 1;
    while (top <= bottom && left <= right) {
        for (let c = left; c <= right; c++) result.push(matrix[top][c]);
        top++;
        for (let r = top; r <= bottom; r++) result.push(matrix[r][right]);
        right--;
        if (top <= bottom)
            for (let c = right; c >= left; c--) result.push(matrix[bottom][c]);
        bottom--;
        if (left <= right)
            for (let r = bottom; r >= top; r--) result.push(matrix[r][left]);
        left++;
    }
    return result;
}

// Number of Islands — DFS
function numIslands(grid) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    const dfs = (r, c) => {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] !== '1') return;
        grid[r][c] = '0';
        dirs.forEach(([dr, dc]) => dfs(r + dr, c + dc));
    };
    let count = 0;
    for (let r = 0; r < grid.length; r++)
        for (let c = 0; c < grid[0].length; c++)
            if (grid[r][c] === '1') { count++; dfs(r, c); }
    return count;
}
```

### Dry Run
Spiral on `[[1,2,3],[4,5,6],[7,8,9]]`:
| Pass | Boundary condition | Cells added | Result so far |
|------|--------------------|-------------|---------------|
| Right along top=0 | left=0, right=2 | 1,2,3 | [1,2,3] |
| Down right=2 | top=1, bottom=2 | 6,9 | [1,2,3,6,9] |
| Left along bottom=2 | top(1)<=bottom(2) | 8,7 | [1,2,3,6,9,8,7] |
| Up left=0 | left(0)<=right(1) | 4 | [1,2,3,6,9,8,7,4] |
| Right along top=1 | left=1, right=1 | 5 | [1,2,3,6,9,8,7,4,5] |

### Complexity
Time: O(m×n) — every cell visited exactly once
Space: O(m×n) for BFS queue / O(min(m,n)) recursion depth for DFS; O(1) extra for spiral

### Common Trap + Experience Tip
**Trap:** In spiral traversal, omitting the `if (top <= bottom)` and `if (left <= right)` guards before the bottom-row and left-col passes causes double-counting the center row or column in non-square matrices.
**Tip:** For "Rotate Image" (90° clockwise in-place): (1) transpose the matrix (swap `[r][c]` with `[c][r]`), then (2) reverse each row. No extra O(m×n) array needed.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 54 | Spiral Matrix | Medium | Guard the bottom and left passes with boundary checks to avoid duplicate cells | https://leetcode.com/problems/spiral-matrix/ |
| 48 | Rotate Image | Medium | Transpose then reverse each row — two O(n²) in-place passes, no extra matrix | https://leetcode.com/problems/rotate-image/ |
| 73 | Set Matrix Zeroes | Medium | Use first row and first column as in-place flags for O(1) extra space | https://leetcode.com/problems/set-matrix-zeroes/ |
| 200 | Number of Islands | Medium | DFS marks '1'→'0' in-place to avoid a separate visited array — observe grid mutation | https://leetcode.com/problems/number-of-islands/ |
| 733 | Flood Fill | Easy | 4-directional DFS from source; guard against revisiting original color when new==old | https://leetcode.com/problems/flood-fill/ |

### One-Minute Revision
```
PATTERN:    Matrix Traversal
USE WHEN:   2D grid: island/region problems, spiral output, rotation, shortest path
CORE IDEA:  Delta array [[-1,0],[1,0],[0,-1],[0,1]] for neighbors; boundary vars for spiral
TRACK:      Visited status (mutate grid or boolean[][]); boundary indices top/bottom/left/right
TIME/SPACE: O(m×n) / O(m×n) BFS queue or O(1) spiral
TRAP:       Guard spiral's bottom and left passes against boundary crossover
```

---

## Rotate Array

### What is it?
Rotate an array `k` positions to the right in O(n) time and O(1) space using the three-reversal technique: reverse the entire array, then reverse the first `k` elements, then reverse the remaining `n-k` elements.

### Visual
```
arr = [1, 2, 3, 4, 5, 6, 7],  k = 3

Step 1 — Reverse all:          [7, 6, 5, 4, 3, 2, 1]
Step 2 — Reverse first k=3:    [5, 6, 7, 4, 3, 2, 1]
Step 3 — Reverse last n-k=4:   [5, 6, 7, 1, 2, 3, 4]

Result: [5, 6, 7, 1, 2, 3, 4]  ✓  (last 3 elements moved to front)
```

### How does it work?
1. Normalize: `k = k % n` (handles k ≥ n; also short-circuit if k == 0).
2. Reverse entire array: indices `[0, n-1]`.
3. Reverse first segment: indices `[0, k-1]`.
4. Reverse second segment: indices `[k, n-1]`.

Helper: in-place reverse `arr[left..right]` by swapping and moving both pointers inward until they meet.

### Why does it work?
Rotating right by `k` means the last `k` elements become the first `k`. Reversing the full array places them at the front but in reverse order. The two partial reverses restore correct forward order within each segment. Three reversals of total length 2n → O(n).

### When to use? / When NOT to use?
- Use: rotate array in-place with O(1) extra space
- Use: "reverse words in a string" (same three-reversal idea applied to characters)
- NOT: k == 0 or k % n == 0 — no-op; handle with guard
- NOT: when a new array is acceptable — simply index with `result[i] = arr[(i + n - k) % n]`

### How to recognize?
Is the problem asking to cyclically shift elements? O(1) space required?
- Signal: "rotate array by k positions right"
- Signal: "reverse words in a string" (reverse all → reverse each word)
- Signal: "cyclic rotation", "shift elements right by k"

### Simple Example
Input: `[1, 2, 3, 4, 5, 6, 7]`, k=3
Output: `[5, 6, 7, 1, 2, 3, 4]`
Trace: k%7=3. Reverse all→[7,6,5,4,3,2,1]. Reverse 0..2→[5,6,7,4,3,2,1]. Reverse 3..6→[5,6,7,1,2,3,4].

### Code
```java
public void rotate(int[] nums, int k) {
    int n = nums.length;
    k %= n;
    if (k == 0) return;
    reverse(nums, 0, n - 1);
    reverse(nums, 0, k - 1);
    reverse(nums, k, n - 1);
}
private void reverse(int[] nums, int left, int right) {
    while (left < right) {
        int tmp = nums[left];
        nums[left++] = nums[right];
        nums[right--] = tmp;
    }
}
```
```javascript
function rotate(nums, k) {
    const n = nums.length;
    k %= n;
    if (k === 0) return;
    const rev = (l, r) => {
        while (l < r) {
            [nums[l], nums[r]] = [nums[r], nums[l]];
            l++; r--;
        }
    };
    rev(0, n - 1);
    rev(0, k - 1);
    rev(k, n - 1);
}
```

### Dry Run
Input: `[1, 2, 3, 4, 5]`, k=2
| Step | Operation | Array |
|------|-----------|-------|
| Start | k%5=2 | [1, 2, 3, 4, 5] |
| Reverse all | rev(0,4) | [5, 4, 3, 2, 1] |
| Reverse first 2 | rev(0,1) | [4, 5, 3, 2, 1] |
| Reverse last 3 | rev(2,4) | [4, 5, 1, 2, 3] |

Result: `[4, 5, 1, 2, 3]` ✓ (last 2 elements moved to front)

### Complexity
Time: O(n) — three passes, each reversing at most n/2 pairs
Space: O(1) — all swaps in-place, no extra array

### Common Trap + Experience Tip
**Trap:** Forgetting `k %= n` — if k equals n the array is unchanged but ranges become incorrect; if k > n the reversal indices go out of bounds or produce wrong results.
**Tip:** The three-reversal technique unifies "Rotate Array", "Reverse Words in a String", and rotation-based string problems. Recognizing this pattern saves derivation time under interview pressure.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 189 | Rotate Array | Medium | Apply k %= n first; three-reversal avoids O(n) extra space | https://leetcode.com/problems/rotate-array/ |
| 48 | Rotate Image | Medium | Transpose then reverse rows achieves 90° in-place rotation — same reversal intuition | https://leetcode.com/problems/rotate-image/ |
| 151 | Reverse Words in a String | Medium | Reverse all characters, then reverse each word — identical three-reversal pattern | https://leetcode.com/problems/reverse-words-in-a-string/ |
| 796 | Rotate String | Easy | Check if s + s contains goal — observe that this avoids manual rotation | https://leetcode.com/problems/rotate-string/ |
| 61 | Rotate List | Medium | Find tail, re-link at position n-k — notice how k %= n applies to linked lists too | https://leetcode.com/problems/rotate-list/ |

### One-Minute Revision
```
PATTERN:    Rotate Array
USE WHEN:   Cyclic right-shift by k positions in O(n) time, O(1) space
CORE IDEA:  Reverse all → reverse first k → reverse last n-k
TRACK:      k after k %= n; two boundary indices for each of the three reversal calls
TIME/SPACE: O(n) / O(1)
TRAP:       Always apply k %= n first; it takes exactly three reversals, not two
```
