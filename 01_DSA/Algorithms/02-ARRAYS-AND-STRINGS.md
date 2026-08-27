# Arrays & Strings — Pattern Reference

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
