# 🧠 90-Day DSA Interview Preparation Roadmap
### For Senior Frontend Engineers at Big Tech
#### Google · Meta · Microsoft · Stripe · Netflix · Airbnb · Uber · Adobe · Cisco · Qualcomm · Salesforce

> **Every day has: topic, pattern template, problems to solve, complete solutions, interview questions.**
> **JavaScript-first. Frontend-contextualized. Interview-focused.**

---

## Phase Overview
- Phase 1 (Days 1–8): Arrays & Strings
- Phase 2 (Days 9–18): Trees & Graphs  
- Phase 3 (Days 19–25): Stacks, Queues & Linked Lists
- Phase 4 (Days 26–31): Recursion & Backtracking
- Phase 5 (Days 32–41): Dynamic Programming
- Phase 6 (Days 42–56): Frontend-Specific Implementations
- Phase 7 (Days 57–64): System Design Coding
- Phase 8 (Days 65–74): Mock Interviews
- Revision (Days 75–90): Peak Performance

---

## Daily Structure
```
0:00–0:10  Pattern study (core idea + template)
0:10–0:50  Solve 3 problems (easy → medium → hard)
0:50–1:10  Review solutions + edge cases
1:10–1:20  Interview Q&A practice
```

## Problem Solving Protocol
1. Read → restate in your own words
2. Examples → trace 2–3 manually
3. Brute force → state it even if O(n²)
4. Optimize → find the pattern
5. Code → clean JavaScript
6. Test → empty, single, all-same, negatives
7. Complexity → time AND space

---

# PHASE 1: ARRAYS & STRINGS (Days 1–8)

## DAY 1 — Two Pointers Pattern

**Core Idea:** Two indices moving toward each other (or same direction) to avoid nested loops.

```javascript
// Opposite direction (sorted array)
function twoPointers(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    const sum = arr[left] + arr[right];
    if (sum === target) return [left, right];
    else if (sum < target) left++;
    else right--;
  }
  return [];
}

// Same direction (fast/slow — remove duplicates)
function removeDuplicates(arr) {
  let slow = 0;
  for (let fast = 1; fast < arr.length; fast++) {
    if (arr[fast] !== arr[slow]) arr[++slow] = arr[fast];
  }
  return slow + 1;
}

// 3Sum — sort + two pointers
function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i-1]) continue;
    let left = i + 1, right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]]);
        while (left < right && nums[left] === nums[left+1]) left++;
        while (left < right && nums[right] === nums[right-1]) right--;
        left++; right--;
      } else if (sum < 0) left++;
      else right--;
    }
  }
  return result;
}
```

**Solve Today:** Valid Palindrome | Two Sum II | Container With Most Water | 3Sum

**📝 Day 1 Interview Questions:**
1. (Medium | Google, Meta) Why does two-pointer work on sorted arrays? What property makes it correct?
2. (Medium | All) In 3Sum, why sort first? What breaks without sorting?
3. (Hard | Google) Trapping Rain Water — two pointers O(n) O(1). Why move the shorter pointer?
4. (Medium | Stripe) Implement removeDuplicates in-place. Prove it never goes out of bounds.
5. (Medium | Meta) Container With Most Water — prove moving the shorter side is always safe.
6. (Hard | Google) 4Sum — extend 3Sum. What is the time complexity?
7. (Medium | Adobe) Find all pairs in a DOM element array sorted by offsetTop that are exactly 100px apart.
8. (Medium | All) When does the opposite-direction two pointer fail? What condition must the array satisfy?

---

## DAY 2 — Sliding Window Pattern

**Core Idea:** Maintain a window [left, right] that expands/shrinks to find optimal subarray.

```javascript
// Variable window — longest substring without repeating chars
function lengthOfLongestSubstring(s) {
  const seen = new Map();
  let left = 0, maxLen = 0;
  for (let right = 0; right < s.length; right++) {
    if (seen.has(s[right]) && seen.get(s[right]) >= left) {
      left = seen.get(s[right]) + 1;
    }
    seen.set(s[right], right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}

// Fixed window — max sum subarray of size k
function maxSumSubarray(arr, k) {
  let windowSum = arr.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum = windowSum;
  for (let i = k; i < arr.length; i++) {
    windowSum += arr[i] - arr[i - k];
    maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
}

// Minimum size subarray sum
function minSubArrayLen(target, nums) {
  let left = 0, sum = 0, minLen = Infinity;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum >= target) {
      minLen = Math.min(minLen, right - left + 1);
      sum -= nums[left++];
    }
  }
  return minLen === Infinity ? 0 : minLen;
}
```

**Solve Today:** Longest Substring Without Repeating | Min Size Subarray Sum | At Most K Distinct | Sliding Window Maximum (preview)

**📝 Day 2 Interview Questions:**
1. (Medium | All) Fixed vs variable sliding window — what signals which type to use?
2. (Medium | Google) Why check `seen.get(s[right]) >= left`? What bug does this prevent?
3. (Hard | Meta) "Minimum Window Substring" — describe the algorithm before coding. What two maps/counters do you need?
4. (Medium | Netflix) A stream of user events — find time window with highest event density. Which window type?
5. (Hard | Google) "Sliding Window Maximum" — why deque and not a sorted structure? What invariant does the deque maintain?
6. (Medium | All) Prove the variable sliding window template is O(n): why does left move at most n times total?
7. (Medium | Stripe) At most K distinct characters — what changes in the template vs "no repeating chars"?
8. (Hard | Airbnb) "Longest Repeating Character Replacement" — how does the formula `right - left + 1 - maxCount > k` drive the shrink?

---

## DAY 3 — Prefix Sum & Hash Maps

**Core Idea:** Precompute cumulative sums for O(1) range queries. Pair with hash map for subarray problems.

```javascript
// Subarray sum equals K
function subarraySum(nums, k) {
  const map = new Map([[0, 1]]); // sum → count; init for subarrays starting at index 0
  let count = 0, sum = 0;
  for (const num of nums) {
    sum += num;
    count += (map.get(sum - k) || 0);
    map.set(sum, (map.get(sum) || 0) + 1);
  }
  return count;
}

// Contiguous array (equal 0s and 1s — replace 0 with -1)
function findMaxLength(nums) {
  const map = new Map([[0, -1]]);
  let maxLen = 0, sum = 0;
  for (let i = 0; i < nums.length; i++) {
    sum += nums[i] === 0 ? -1 : 1;
    if (map.has(sum)) maxLen = Math.max(maxLen, i - map.get(sum));
    else map.set(sum, i);
  }
  return maxLen;
}

// 2D prefix sum
function buildPrefix2D(matrix) {
  const m = matrix.length, n = matrix[0].length;
  const pre = Array.from({length: m+1}, () => new Array(n+1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      pre[i][j] = matrix[i-1][j-1] + pre[i-1][j] + pre[i][j-1] - pre[i-1][j-1];
  return pre; // query(r1,c1,r2,c2) = pre[r2+1][c2+1] - pre[r1][c2+1] - pre[r2+1][c1] + pre[r1][c1]
}
```

**Solve Today:** Range Sum Query | Subarray Sum Equals K | Contiguous Array | Product of Array Except Self

**📝 Day 3 Interview Questions:**
1. (Medium | All) Why initialize `map.set(0, 1)` in subarray sum? What case does it handle?
2. (Medium | Google) "Product of Array Except Self" — solve without division using prefix + suffix product arrays.
3. (Hard | Meta) Explain the "replace 0 with -1" trick for equal 0s and 1s. Why does it reduce to "sum equals 0"?
4. (Medium | Stripe) API response times array — find subarray of length ≥ 3 with minimum average using prefix sums.
5. (Hard | Google) Can prefix sums work with multiplication? What problem does this solve? What edge case breaks it?
6. (Medium | All) Space-time tradeoff of prefix sums — when is the O(n) extra space NOT worth it?
7. (Hard | Meta) "Minimum Operations to Reduce X to Zero" — how does the complement (total - 2*prefix) approach work?
8. (Medium | Adobe) 2D matrix: find the rectangle with maximum sum using 2D prefix sums. What is the complexity?

---

## DAY 4 — Binary Search Pattern

**Core Idea:** Eliminate half the search space each iteration. Works on sorted arrays AND on answer spaces.

```javascript
// Standard binary search
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = left + ((right - left) >> 1);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

// Left boundary (first occurrence)
function leftBound(arr, target) {
  let left = 0, right = arr.length;
  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if (arr[mid] < target) left = mid + 1;
    else right = mid;
  }
  return left; // returns arr.length if not found
}

// Search in rotated sorted array
function searchRotated(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const mid = left + ((right - left) >> 1);
    if (nums[mid] === target) return mid;
    if (nums[left] <= nums[mid]) { // left half sorted
      if (nums[left] <= target && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else { // right half sorted
      if (nums[mid] < target && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }
  return -1;
}

// Binary search on answer space
function binarySearchOnAnswer(lo, hi, feasible) {
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (feasible(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
```

**Solve Today:** Binary Search | Search Rotated Array | Find Peak Element | Koko Eating Bananas | Median of Two Sorted Arrays

**📝 Day 4 Interview Questions:**
1. (Easy | All) Why `left + ((right - left) >> 1)` instead of `(left + right) / 2`? When does it matter in JS?
2. (Medium | Google) Search Rotated Array — prove at least one half is always sorted.
3. (Medium | All) What is "binary search on answer"? Give 3 problems where you search the answer space.
4. (Hard | Google) Median of Two Sorted Arrays O(log min(m,n)) — explain the partition invariant.
5. (Medium | Netflix) 1000 A/B test results sorted by timestamp — find first where error rate > 5%. Which template?
6. (Medium | All) Difference between lower_bound and upper_bound — implement both.
7. (Hard | Google) "Find K Closest Elements" — binary search the left boundary of the answer window.
8. (Medium | Stripe) "Capacity to Ship Packages Within D Days" — binary search on answer. What is feasible(mid)?

---

## DAY 5 — Sorting, Intervals & Greedy

```javascript
// Merge intervals
function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  const result = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1];
    if (intervals[i][0] <= last[1]) last[1] = Math.max(last[1], intervals[i][1]);
    else result.push(intervals[i]);
  }
  return result;
}

// Insert interval
function insert(intervals, newInterval) {
  const result = [];
  let i = 0;
  while (i < intervals.length && intervals[i][1] < newInterval[0]) result.push(intervals[i++]);
  while (i < intervals.length && intervals[i][0] <= newInterval[1]) {
    newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
    newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
    i++;
  }
  result.push(newInterval);
  while (i < intervals.length) result.push(intervals[i++]);
  return result;
}

// Non-overlapping (greedy: keep interval with earliest end)
function eraseOverlapIntervals(intervals) {
  intervals.sort((a, b) => a[1] - b[1]); // sort by END time
  let count = 0, end = -Infinity;
  for (const [s, e] of intervals) {
    if (s >= end) end = e;
    else count++; // overlap — remove this one
  }
  return count;
}
```

**Solve Today:** Merge Intervals | Insert Interval | Non-Overlapping Intervals | Meeting Rooms II | Jump Game

**📝 Day 5 Interview Questions:**
1. (Medium | Meta) Merge Intervals — why sort by START? What breaks if you sort by end?
2. (Medium | All) Non-Overlapping Intervals — why sort by END for greedy? Prove the greedy choice is optimal.
3. (Hard | Google) "Employee Free Time" — N employees, find all intervals where everyone is free.
4. (Medium | Stripe) Rate limiting: given [userId, timestamp] log, find users with >10 requests in any 60s window.
5. (Medium | All) Jump Game — greedy vs DP. Why is greedy O(n) and DP O(n²)?
6. (Hard | Netflix) "Video Stitching" — minimum clips to cover [0, T]. Greedy approach?
7. (Medium | Airbnb) Build a calendar — implement "find available slots" given busy intervals.
8. (Medium | All) "Task Scheduler" — minimum time to finish tasks with cooldown n. Walk through greedy approach.

---

## DAY 6 — Hash Maps & String Manipulation

```javascript
// Group anagrams
function groupAnagrams(strs) {
  const map = new Map();
  for (const s of strs) {
    const key = s.split('').sort().join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.values()];
}

// Longest consecutive sequence — O(n)
function longestConsecutive(nums) {
  const set = new Set(nums);
  let maxLen = 0;
  for (const n of set) {
    if (!set.has(n - 1)) { // only start from sequence beginning
      let len = 1;
      while (set.has(n + len)) len++;
      maxLen = Math.max(maxLen, len);
    }
  }
  return maxLen;
}

// Top K frequent (bucket sort O(n))
function topKFrequent(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);
  const buckets = Array.from({length: nums.length + 1}, () => []);
  for (const [num, count] of freq) buckets[count].push(num);
  const result = [];
  for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
    result.push(...buckets[i]);
  }
  return result.slice(0, k);
}

// Decode string
function decodeString(s) {
  const stack = [];
  let currentStr = '', currentNum = 0;
  for (const c of s) {
    if (c >= '0' && c <= '9') currentNum = currentNum * 10 + +c;
    else if (c === '[') { stack.push([currentStr, currentNum]); currentStr = ''; currentNum = 0; }
    else if (c === ']') { const [prevStr, num] = stack.pop(); currentStr = prevStr + currentStr.repeat(num); }
    else currentStr += c;
  }
  return currentStr;
}
```

**Solve Today:** Group Anagrams | Longest Consecutive | Top K Frequent | Decode String | Valid Anagram

**📝 Day 6 Interview Questions:**
1. (Medium | Google) Longest Consecutive Sequence — why check `!set.has(n-1)` before counting? Time complexity proof.
2. (Medium | All) Top K Frequent — bucket sort vs heap. When does O(n) bucket sort beat O(n log k) heap?
3. (Medium | Stripe) Parse a CSS property string `"margin: 10px 20px 5px"` into `{top:10, right:20, bottom:5, left:15}`.
4. (Medium | All) What is the worst-case time complexity of JavaScript Map operations? What causes degradation?
5. (Hard | Meta) "4Sum II" — count quadruples from 4 arrays summing to zero. Two-pass hash map reduces O(n⁴) to O(n²)?
6. (Medium | Adobe) Parse a log line `"[2024-01] ERROR user=123 msg=timeout"` into structured key-value object.
7. (Medium | All) Decode String — what does the stack store? Trace `"3[a2[c]]"` step by step.
8. (Hard | Airbnb) "Minimum Window Substring" — implement with two pointers + hash maps. State all edge cases first.

---

## DAY 7 — Two Pointers + Sliding Window Hard Problems

**Sprint day — harder applications of Phase 1 patterns.**

```javascript
// Trapping Rain Water — two pointers O(n) O(1)
function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0, water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) leftMax = height[left];
      else water += leftMax - height[left];
      left++;
    } else {
      if (height[right] >= rightMax) rightMax = height[right];
      else water += rightMax - height[right];
      right--;
    }
  }
  return water;
}

// Minimum Window Substring
function minWindow(s, t) {
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  let have = 0, required = need.size;
  let left = 0, minLen = Infinity, minStart = 0;
  const window = new Map();
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) || 0) + 1);
    if (need.has(c) && window.get(c) === need.get(c)) have++;
    while (have === required) {
      if (right - left + 1 < minLen) { minLen = right - left + 1; minStart = left; }
      const lc = s[left];
      window.set(lc, window.get(lc) - 1);
      if (need.has(lc) && window.get(lc) < need.get(lc)) have--;
      left++;
    }
  }
  return minLen === Infinity ? '' : s.slice(minStart, minStart + minLen);
}
```

**Solve Today:** Trapping Rain Water | Minimum Window Substring | Longest Repeating Char Replacement | Sliding Window Maximum

**📝 Day 7 Interview Questions:**
1. (Hard | Google) Trapping Rain Water — prove why moving the shorter-side pointer is always safe.
2. (Hard | Meta) Minimum Window Substring — code it from scratch. What are `have` and `required` tracking?
3. (Hard | Google) Sliding Window Maximum — deque invariant: always decreasing. Trace `[2,3,4,2,6,2,5,1]`, k=3.
4. (Medium | All) "Longest Repeating Character Replacement" — what does `maxCount` track? Why don't we update it when shrinking?
5. (Hard | Google) "Substring with Concatenation of All Words" — sliding window with word-level granularity.
6. (Medium | Netflix) A sequence of API calls — find longest window where error rate stays below 5%.
7. (Hard | Meta) "Minimum Size Subarray Sum" — follow-up: if nums has negatives, does sliding window still work?
8. (Medium | All) Compare all Phase 1 patterns: two pointers / sliding window / prefix sum / binary search — when does each apply?

---

## DAY 8 — Phase 1 Checkpoint Sprint

**Sprint (75 min timed, no hints):**

| Problem | Time Limit | Pattern |
|---|---|---|
| 3Sum | 20 min | Two pointers |
| Minimum Window Substring | 25 min | Sliding window |
| Subarray Sum Equals K | 15 min | Prefix sum |
| Search in Rotated Array | 15 min | Binary search |

**Phase 1 Checklist:**
- [ ] Two pointers: sorted pair problems, 3Sum, trapping rain water
- [ ] Sliding window: fixed and variable templates memorized
- [ ] Prefix sum: subarray sum K, contiguous array, 2D prefix
- [ ] Hash maps: frequency, complement lookup, anagram grouping
- [ ] Binary search: 3 templates (standard, left bound, answer space)
- [ ] Intervals: merge, insert, non-overlapping greedy

**📝 Day 8 Interview Questions:**
1. A Google interviewer asks: "Given array, find max sum subarray." State all approaches from brute to Kadane's.
2. (Hard) Median of Two Sorted Arrays — O(log min(m,n)). Explain the partition. Code it.
3. (Medium | All) Implement binary search for first AND last position of target. Two separate passes.
4. (Hard | Meta) "Longest Substring with At Most K Distinct Chars" — trace the window for `"eceba"`, k=2.
5. (Medium | All) Rotate Array in-place. Three-reversal trick. Prove it works.

---

# PHASE 2: TREES & GRAPHS (Days 9–18)

## DAY 9 — Binary Tree BFS & DFS

```javascript
// BFS — level order
function levelOrder(root) {
  if (!root) return [];
  const result = [], queue = [root];
  while (queue.length) {
    const size = queue.length, level = [];
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}

// DFS — all three orders iterative
function preorder(root) {
  if (!root) return [];
  const result = [], stack = [root];
  while (stack.length) {
    const node = stack.pop();
    result.push(node.val);
    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
  }
  return result;
}

function inorderIterative(root) {
  const result = [], stack = [];
  let curr = root;
  while (curr || stack.length) {
    while (curr) { stack.push(curr); curr = curr.left; }
    curr = stack.pop();
    result.push(curr.val);
    curr = curr.right;
  }
  return result;
}
```

**Solve Today:** Level Order | Max Depth | Zigzag Level Order | Right Side View | Symmetric Tree

**📝 Day 9 Interview Questions:**
1. (Medium | All) When BFS vs DFS for trees? What signals in the problem tell you which?
2. (Medium | Google) Implement iterative inorder without recursion. Why push left nodes onto stack first?
3. (Hard | Google) "Vertical Order Traversal" — nodes at same column sorted by value. Design the data structure.
4. (Medium | Meta, Adobe) DOM tree: implement `findAllByClassName(root, cls)` using BFS.
5. (Medium | All) Space complexity of BFS vs DFS on a balanced tree? On a skewed tree?
6. (Medium | Airbnb) `findLCA(domNode1, domNode2)` — without using parentNode. Pure traversal.
7. (Hard | Google) "Serialize and Deserialize Binary Tree" — why is BFS serialization simpler to deserialize?
8. (Medium | All) "Binary Tree Right Side View" — solve with BFS AND DFS. Compare.

---

## DAY 10 — Binary Search Trees

```javascript
// BST validation — pass min/max bounds
function isValidBST(root, min = -Infinity, max = Infinity) {
  if (!root) return true;
  if (root.val <= min || root.val >= max) return false;
  return isValidBST(root.left, min, root.val) && isValidBST(root.right, root.val, max);
}

// LCA of BST — use BST property
function lcaBST(root, p, q) {
  if (p.val < root.val && q.val < root.val) return lcaBST(root.left, p, q);
  if (p.val > root.val && q.val > root.val) return lcaBST(root.right, p, q);
  return root; // split point = LCA
}

// Kth smallest — inorder traversal stops at k
function kthSmallest(root, k) {
  let count = 0, result = null;
  function inorder(node) {
    if (!node || result) return;
    inorder(node.left);
    if (++count === k) { result = node.val; return; }
    inorder(node.right);
  }
  inorder(root);
  return result;
}

// Delete BST node
function deleteNode(root, key) {
  if (!root) return null;
  if (key < root.val) { root.left = deleteNode(root.left, key); return root; }
  if (key > root.val) { root.right = deleteNode(root.right, key); return root; }
  if (!root.left) return root.right;
  if (!root.right) return root.left;
  let successor = root.right;
  while (successor.left) successor = successor.left;
  root.val = successor.val;
  root.right = deleteNode(root.right, successor.val);
  return root;
}
```

**Solve Today:** Validate BST | Kth Smallest | LCA of BST | Sorted Array to BST | BST Iterator

**📝 Day 10 Interview Questions:**
1. (Medium | All) Why does BST validation need min/max bounds, not just comparing with parent?
2. (Medium | Google) "Inorder Successor in BST" — two cases: right subtree exists or doesn't.
3. (Hard | Meta) "Recover BST" — two nodes swapped. Find and fix. Morris traversal for O(1) space.
4. (Medium | All) Average vs worst-case BST height. When does BST degrade and what replaces it?
5. (Medium | Stripe) "Range Sum BST" — sum all values in [low, high]. How does BST property prune?
6. (Hard | Google) BST serialization — why more efficient than general binary tree serialization?
7. (Medium | Adobe) Balance an unbalanced BST. What is your approach?
8. (Hard | Google) "Count of Smaller Numbers After Self" — how does an augmented BST help?

---

## DAY 11 — Tree Advanced: Path Sum, Construction, Diameter

```javascript
// Binary Tree Max Path Sum
let maxPathSum = -Infinity;
function maxPathSumHelper(node) {
  if (!node) return 0;
  const left = Math.max(0, maxPathSumHelper(node.left));
  const right = Math.max(0, maxPathSumHelper(node.right));
  maxPathSum = Math.max(maxPathSum, left + right + node.val);
  return node.val + Math.max(left, right); // return ONE side only
}

// Construct from preorder + inorder
function buildTree(preorder, inorder) {
  const map = new Map(inorder.map((v, i) => [v, i]));
  let pre = 0;
  function build(left, right) {
    if (left > right) return null;
    const root = new TreeNode(preorder[pre++]);
    const mid = map.get(root.val);
    root.left = build(left, mid - 1);
    root.right = build(mid + 1, right);
    return root;
  }
  return build(0, inorder.length - 1);
}

// Diameter of binary tree
let diameter = 0;
function height(node) {
  if (!node) return 0;
  const left = height(node.left), right = height(node.right);
  diameter = Math.max(diameter, left + right);
  return 1 + Math.max(left, right);
}
```

**Solve Today:** Binary Tree Max Path Sum | Construct from Pre+Inorder | Diameter | Path Sum II | Flatten to Linked List

**📝 Day 11 Interview Questions:**
1. (Hard | Meta, Google) Max Path Sum — why does the helper return one side, while updating global max with both?
2. (Medium | All) Tree construction from pre+inorder — why hash map for inorder indices?
3. (Medium | All) Diameter — can the path go through the root? Prove both cases are handled.
4. (Hard | Google) "Binary Tree Cameras" — greedy from leaves. Why is bottom-up greedy optimal?
5. (Medium | All) "Flatten Binary Tree to Linked List" in-place. Morris-style trick?
6. (Hard | Meta) "Count Complete Tree Nodes" — O(log²n) using the complete tree property.
7. (Medium | Stripe) JSON object as tree — find deepest nested key using DFS.
8. (Hard | Google) "Sum Root to Leaf Numbers" — accumulate path value through recursion.

---

## DAY 12 — DOM Tree Problems (Frontend Specific)

```javascript
// Deep clone DOM tree
function cloneDOM(node) {
  if (!node) return null;
  const clone = node.cloneNode(false);
  for (const child of node.children) clone.appendChild(cloneDOM(child));
  return clone;
}

// Get CSS selector path from element to root
function getElementPath(el) {
  const parts = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.tagName.toLowerCase();
    if (el.id) { parts.unshift('#' + el.id); break; }
    const siblings = Array.from(el.parentNode?.children || []);
    if (siblings.length > 1) {
      const idx = siblings.indexOf(el) + 1;
      selector += `:nth-child(${idx})`;
    }
    parts.unshift(selector);
    el = el.parentNode;
  }
  return parts.join(' > ');
}

// Flatten nested comment thread with depth
function flattenComments(nodes, depth = 0) {
  return nodes.flatMap(node => [
    { id: node.id, text: node.text, depth },
    ...flattenComments(node.replies || [], depth + 1)
  ]);
}

// Simple querySelector for .class, #id, tag
function querySelector(root, selector) {
  const results = [];
  function dfs(node) {
    if (!node) return;
    if (selector.startsWith('#') && node.id === selector.slice(1)) results.push(node);
    else if (selector.startsWith('.') && node.classList?.contains(selector.slice(1))) results.push(node);
    else if (node.tagName?.toLowerCase() === selector.toLowerCase()) results.push(node);
    for (const child of node.children || []) dfs(child);
  }
  dfs(root);
  return results;
}
```

**Solve Today:** querySelectorAll for .class and #id | findLCA of two DOM nodes | DOM diff | flatten comment tree | getElementPath

**📝 Day 12 Interview Questions:**
1. (Hard | Meta, Airbnb) `findDeepestCommonAncestor(node1, node2)` without parentNode or DOM API.
2. (Hard | Meta) Virtual DOM diff — given oldVNode and newVNode trees, produce minimal DOM operations list.
3. (Medium | Adobe) Implement event delegation on a parent that handles clicks on dynamically added children.
4. (Medium | All) Flatten a nested object `{a:{b:{c:1}}}` to `{'a.b.c':1}` and `unflattenObject` as inverse.
5. (Hard | Meta) Serialize a DOM tree to JSON preserving: tag, attributes, text content, children.
6. (Medium | Airbnb) Traverse a React component VNode tree — find all components of a given type name.
7. (Medium | Adobe) Walk up DOM tree collecting inherited CSS properties — implement `getComputedStyles(el)`.
8. (Hard | Meta) Virtual scrolling: 10,000 items, viewport shows 10. Render only visible items, update on scroll.

---

## DAY 13 — Graph BFS & Multi-Source BFS

```javascript
// BFS on graph
function bfsGraph(graph, start) {
  const visited = new Set([start]), queue = [start];
  while (queue.length) {
    const node = queue.shift();
    for (const neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
    }
  }
}

// Multi-source BFS (rotten oranges)
function orangesRotting(grid) {
  const m = grid.length, n = grid[0].length;
  const queue = [], dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  let fresh = 0, minutes = 0;
  for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
    if (grid[r][c] === 2) queue.push([r, c]);
    if (grid[r][c] === 1) fresh++;
  }
  while (queue.length && fresh > 0) {
    const size = queue.length; minutes++;
    for (let i = 0; i < size; i++) {
      const [r, c] = queue.shift();
      for (const [dr, dc] of dirs) {
        const nr = r+dr, nc = c+dc;
        if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] === 1) {
          grid[nr][nc] = 2; fresh--; queue.push([nr, nc]);
        }
      }
    }
  }
  return fresh === 0 ? minutes : -1;
}
```

**Solve Today:** Number of Islands | Rotten Oranges | Word Ladder | 01 Matrix | Pacific Atlantic Water Flow

**📝 Day 13 Interview Questions:**
1. (Medium | All) BFS vs DFS for graphs — what does "shortest path" imply about which to use?
2. (Medium | Google) Multi-source BFS — why more natural than separate BFS from each source?
3. (Hard | Google) "Word Ladder II" — all shortest paths. BFS builds layers + DFS backtracks.
4. (Medium | All) How do you represent a graph: adjacency list vs matrix? When does each win?
5. (Medium | Airbnb) City map graph — all locations reachable within 5 stops from user position.
6. (Hard | Meta, Google) "Walls and Gates" — fill each room with distance to nearest gate. Multi-source BFS.
7. (Medium | All) Prove BFS finds shortest path in unweighted graph.
8. (Medium | Stripe) Package dependency resolver — installation order using BFS topological sort.

---

## DAY 14 — Graph DFS, Cycle Detection, Connected Components

```javascript
// DFS cycle detection (directed graph — 3 colors)
function hasCycle(n, edges) {
  const adj = Array.from({length: n}, () => []);
  for (const [a, b] of edges) adj[a].push(b);
  const state = new Array(n).fill(0); // 0=unvisited, 1=in-progress, 2=done
  function dfs(node) {
    state[node] = 1;
    for (const next of adj[node]) {
      if (state[next] === 1) return true; // back edge
      if (state[next] === 0 && dfs(next)) return true;
    }
    state[node] = 2;
    return false;
  }
  return state.some((s, i) => s === 0 && dfs(i));
}

// Union-Find for undirected cycle + components
class UnionFind {
  constructor(n) {
    this.parent = Array.from({length: n}, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.components = n;
  }
  find(x) { return this.parent[x] === x ? x : this.parent[x] = this.find(this.parent[x]); }
  union(x, y) {
    const px = this.find(x), py = this.find(y);
    if (px === py) return false;
    if (this.rank[px] < this.rank[py]) this.parent[px] = py;
    else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
    else { this.parent[py] = px; this.rank[px]++; }
    this.components--;
    return true;
  }
}
```

**Solve Today:** Course Schedule (cycle detect) | Number of Connected Components | Clone Graph | Redundant Connection

**📝 Day 14 Interview Questions:**
1. (Medium | All) Directed vs undirected cycle detection — why different approaches?
2. (Medium | All) 3-color DFS — what does "gray" (in-progress) represent? Why need 3 colors not 2?
3. (Hard | Google) "Critical Connections" — find bridges using Tarjan's. Explain the lowlink concept.
4. (Medium | Google) "Redundant Connection" — why is Union-Find more natural than DFS here?
5. (Hard | Meta) "Clone Graph" — why keep a map of original→clone? What happens without it on cycles?
6. (Medium | Uber) City road network — find all "critical roads" whose removal disconnects the city.
7. (Medium | All) Iterative DFS on graph — why does neighbor processing order matter?
8. (Medium | All) When to use Union-Find vs DFS for connectivity? Give 3 scenarios for each.

---

## DAY 15 — Topological Sort & Shortest Path

```javascript
// Kahn's algorithm (BFS topological sort)
function topoSort(n, edges) {
  const adj = Array.from({length: n}, () => []);
  const inDegree = new Array(n).fill(0);
  for (const [a, b] of edges) { adj[b].push(a); inDegree[a]++; }
  const queue = [];
  for (let i = 0; i < n; i++) if (inDegree[i] === 0) queue.push(i);
  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    for (const next of adj[node]) if (--inDegree[next] === 0) queue.push(next);
  }
  return order.length === n ? order : []; // empty if cycle
}

// Dijkstra (min-heap simulation with sorted array for interviews)
function dijkstra(graph, start, n) {
  const dist = new Array(n).fill(Infinity);
  dist[start] = 0;
  const heap = [[0, start]]; // [dist, node]
  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0]); // use real min-heap in production
    const [d, node] = heap.shift();
    if (d > dist[node]) continue;
    for (const [next, weight] of (graph[node] || [])) {
      if (dist[node] + weight < dist[next]) {
        dist[next] = dist[node] + weight;
        heap.push([dist[next], next]);
      }
    }
  }
  return dist;
}
```

**Solve Today:** Course Schedule II | Alien Dictionary | Network Delay Time | Cheapest Flights K Stops

**📝 Day 15 Interview Questions:**
1. (Medium | All) Kahn's algorithm step by step. How does in-degree tracking produce topological order?
2. (Hard | Google) "Alien Dictionary" — constructing graph from word pairs is the hard part. Walk through edge cases.
3. (Medium | All) When does Dijkstra fail? What handles negative edge weights?
4. (Medium | Uber) Build system with file dependencies — valid build order using topological sort.
5. (Hard | Meta, Google) "Cheapest Flights K Stops" — why does standard Dijkstra fail? Bellman-Ford fix?
6. (Medium | All) Dijkstra complexity with binary heap vs sorted array. Real interview answer?
7. (Medium | Google) CSS `@import` circular dependency detection using topological sort.
8. (Hard | Google) "Parallel Courses III" — minimum time with prerequisites and durations.

---

## DAY 16 — Trie Data Structure

```javascript
class Trie {
  constructor() { this.root = {}; }
  insert(word) {
    let node = this.root;
    for (const c of word) { if (!node[c]) node[c] = {}; node = node[c]; }
    node.isEnd = true;
  }
  search(word) {
    let node = this.root;
    for (const c of word) { if (!node[c]) return false; node = node[c]; }
    return !!node.isEnd;
  }
  startsWith(prefix) {
    let node = this.root;
    for (const c of prefix) { if (!node[c]) return false; node = node[c]; }
    return true;
  }
  // Get top-3 suggestions for prefix
  getSuggestions(prefix, k = 3) {
    let node = this.root;
    for (const c of prefix) { if (!node[c]) return []; node = node[c]; }
    const results = [];
    function dfs(n, path) {
      if (results.length >= k) return;
      if (n.isEnd) results.push(path);
      for (const [c, child] of Object.entries(n)) {
        if (c !== 'isEnd') dfs(child, path + c);
      }
    }
    dfs(node, prefix);
    return results;
  }
}
```

**Solve Today:** Implement Trie | Word Search II | Design Search Autocomplete System | Palindrome Pairs

**📝 Day 16 Interview Questions:**
1. (Medium | Google) Why is Trie more efficient than a hash set for prefix queries?
2. (Hard | Meta, Google) "Word Search II" — how does Trie prune the DFS backtracking?
3. (Medium | All) Implement autocomplete returning top-3 suggestions ranked by frequency.
4. (Hard | Google) "Palindrome Pairs" — Trie-based approach. What is the key insight?
5. (Medium | All) Memory usage: Trie vs hash set for 1 million English words with many shared prefixes.
6. (Hard | Stripe) Implement a URL prefix router using a Trie: `/users/:id/posts` matches `/users/123/posts`.
7. (Medium | Adobe) Trie-based spell checker — find all words within edit distance 1 of a query.
8. (Hard | Google) "Replace Words" — replace words in sentence with shortest root in dictionary. Trie approach.

---

## DAY 17 — Graph Advanced: Dijkstra + Bellman-Ford + MST

**Conceptual + implementation day.**

```javascript
// Bellman-Ford — handles negative weights
function bellmanFord(n, edges, start) {
  const dist = new Array(n).fill(Infinity);
  dist[start] = 0;
  for (let i = 0; i < n - 1; i++) { // n-1 iterations
    for (const [u, v, w] of edges) {
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
  }
  // Check for negative cycles
  for (const [u, v, w] of edges) {
    if (dist[u] !== Infinity && dist[u] + w < dist[v]) return null; // negative cycle
  }
  return dist;
}

// Prim's MST (greedy)
function primMST(graph, n) {
  const inMST = new Array(n).fill(false);
  const key = new Array(n).fill(Infinity);
  key[0] = 0;
  let totalWeight = 0;
  for (let i = 0; i < n; i++) {
    const u = key.reduce((min, k, idx) => (!inMST[idx] && k < key[min]) ? idx : min, 0);
    inMST[u] = true;
    totalWeight += key[u];
    for (const [v, w] of (graph[u] || [])) {
      if (!inMST[v] && w < key[v]) key[v] = w;
    }
  }
  return totalWeight;
}
```

**Solve Today:** Network Delay Time | Cheapest Flights | Min Cost Connect All Points | Path with Max Probability

**📝 Day 17 Interview Questions:**
1. (Hard | Google) Bellman-Ford vs Dijkstra — when do you use each? Why can't Dijkstra handle negative edges?
2. (Medium | All) "Path with Maximum Probability" — how do you adapt Dijkstra for maximizing a product?
3. (Hard | Meta) "Min Cost to Connect All Points" — Prim's vs Kruskal's. Which is better for dense graphs?
4. (Medium | Uber) Model a city road network with weighted edges (traffic time). Find shortest commute route.
5. (Hard | Google) "Find the City with Smallest Number of Neighbors" — Floyd-Warshall all-pairs shortest path.
6. (Medium | All) What is a Minimum Spanning Tree? What does it minimize?
7. (Hard | Google) "Swim in Rising Water" — modified Dijkstra or binary search + BFS. Explain both.
8. (Medium | Netflix) Content delivery network — find server with minimum latency to all client nodes.

---

## DAY 18 — Phase 2 Checkpoint Sprint

**Sprint (75 min, timed, no hints):**

| Problem | Time | Pattern |
|---|---|---|
| Binary Tree Max Path Sum | 20 min | DFS + global |
| Course Schedule II | 20 min | Topological sort |
| Word Ladder | 20 min | BFS |
| Implement Trie | 15 min | Trie |

**Phase 2 Checklist:**
- [ ] BFS: level-order, multi-source, shortest path
- [ ] DFS: all 3 orders iterative, path problems, tree construction
- [ ] BST: validation, insert, delete, LCA, kth smallest
- [ ] DOM trees: 5 problems (querySelectorAll, LCA, diff, flatten, clone)
- [ ] Topological sort: Kahn's algorithm
- [ ] Union-Find: path compression + union by rank
- [ ] Trie: insert, search, startsWith, autocomplete
- [ ] Dijkstra: conceptual + implementation

**📝 Day 18 Interview Questions:**
1. (Hard | Google) "Serialize and Deserialize BST" — more efficient than general tree. Why?
2. (Hard | Meta) "Accounts Merge" — union-find on email strings.
3. (Hard | Google) "Alien Dictionary" — edge case: when is ordering impossible vs ambiguous?

---

# PHASE 3: STACKS, QUEUES & LINKED LISTS (Days 19–25)

## DAY 19 — Stack Patterns

```javascript
// Min Stack — O(1) getMin
class MinStack {
  constructor() { this.stack = []; this.minStack = []; }
  push(val) {
    this.stack.push(val);
    this.minStack.push(Math.min(val, this.minStack.at(-1) ?? Infinity));
  }
  pop() { this.stack.pop(); this.minStack.pop(); }
  top() { return this.stack.at(-1); }
  getMin() { return this.minStack.at(-1); }
}

// Basic Calculator II — handles +, -, *, /
function calculate(s) {
  const stack = [];
  let num = 0, sign = '+';
  for (let i = 0; i <= s.length; i++) {
    const c = s[i];
    if (c >= '0' && c <= '9') { num = num * 10 + +c; continue; }
    if (c === ' ' && i !== s.length) continue;
    if (sign === '+') stack.push(num);
    else if (sign === '-') stack.push(-num);
    else if (sign === '*') stack.push(stack.pop() * num);
    else if (sign === '/') stack.push(Math.trunc(stack.pop() / num));
    sign = c; num = 0;
  }
  return stack.reduce((a, b) => a + b, 0);
}
```

**Solve Today:** Valid Parentheses | Min Stack | Daily Temperatures | Evaluate RPN | Basic Calculator II | Decode String

**📝 Day 19 Interview Questions:**
1. (Medium | All) Daily Temperatures — why store indices not values in the stack? Trace `[73,74,75,71,69,72,76,73]`.
2. (Hard | Meta) Basic Calculator II — what does the stack store? How does it handle operator precedence?
3. (Medium | Airbnb) Implement browser history (back/forward) using two stacks.
4. (Hard | Google) "Largest Rectangle in Histogram" — describe the monotonic stack approach before coding.
5. (Medium | All) Min Stack — why use a parallel min-stack instead of sorting the stack?
6. (Hard | Netflix) "Remove K Digits" — greedy + monotonic stack to get smallest number.
7. (Medium | All) Decode String — what does the stack store at `[`? Trace `"3[a2[c]]"`.
8. (Hard | Google) "Maximal Rectangle" — reduce each row to histogram, then apply histogram solution.

---

## DAY 20 — Monotonic Stack

```javascript
// Next Greater Element
function nextGreaterElement(nums) {
  const result = new Array(nums.length).fill(-1);
  const stack = []; // stores indices
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack.at(-1)] < nums[i]) {
      result[stack.pop()] = nums[i];
    }
    stack.push(i);
  }
  return result;
}

// Largest Rectangle in Histogram
function largestRectangleArea(heights) {
  const stack = [-1]; // sentinel
  let maxArea = 0;
  heights.push(0); // trigger remaining stack pops
  for (let i = 0; i < heights.length; i++) {
    while (stack.at(-1) !== -1 && heights[stack.at(-1)] >= heights[i]) {
      const h = heights[stack.pop()];
      const w = i - stack.at(-1) - 1;
      maxArea = Math.max(maxArea, h * w);
    }
    stack.push(i);
  }
  return maxArea;
}

// Trapping Rain Water — monotonic stack approach
function trapStack(height) {
  const stack = [];
  let water = 0;
  for (let i = 0; i < height.length; i++) {
    while (stack.length && height[stack.at(-1)] < height[i]) {
      const bottom = stack.pop();
      if (!stack.length) break;
      const left = stack.at(-1);
      const h = Math.min(height[left], height[i]) - height[bottom];
      const w = i - left - 1;
      water += h * w;
    }
    stack.push(i);
  }
  return water;
}
```

**Solve Today:** NGE | Largest Rectangle | Trapping Rain Water (stack) | Sum of Subarray Minimums | Sliding Window Max

**📝 Day 20 Interview Questions:**
1. (Medium | All) Monotonic stack invariant — what makes it "monotonic decreasing"? What does each element represent?
2. (Hard | Google) Largest Rectangle in Histogram — trace `[6,2,5,4,5,1,6]` step by step through the stack.
3. (Hard | Google) Trapping Rain Water — compare two-pointer and monotonic stack approaches. When is each cleaner?
4. (Hard | Meta) "Sum of Subarray Minimums" — contribution technique with monotonic stack.
5. (Hard | Google) Sliding Window Maximum — monotonic deque. Invariant: always decreasing from front.
6. (Medium | Netflix) Stock span: consecutive days where price ≤ today's price. Monotonic stack solution.
7. (Hard | Google) "Maximum Width Ramp" — two-pass monotonic stack. What does each pass find?
8. (Medium | All) When can you use a monotonic stack vs a sorted multiset? Trade-offs?

---

## DAY 21 — Priority Queue & Heap Patterns

```javascript
// Kth Largest — min heap of size k
function findKthLargest(nums, k) {
  // Simulate min-heap with sorted approach for interviews
  nums.sort((a, b) => a - b);
  return nums[nums.length - k];
  // Real implementation: maintain min-heap of size k, O(n log k)
}

// Merge K sorted arrays — min heap
function mergeKSorted(arrays) {
  const result = [];
  // heap: [value, arrayIdx, elementIdx]
  const heap = arrays.map((arr, i) => [arr[0], i, 0]).filter(([v]) => v !== undefined);
  heap.sort((a, b) => a[0] - b[0]); // use real min-heap
  while (heap.length) {
    const [val, ai, ei] = heap.shift();
    result.push(val);
    if (ei + 1 < arrays[ai].length) {
      heap.push([arrays[ai][ei+1], ai, ei+1]);
      heap.sort((a, b) => a[0] - b[0]);
    }
  }
  return result;
}

// Find median from data stream — two heaps
class MedianFinder {
  constructor() { this.lo = []; this.hi = []; } // lo=max-heap(negate), hi=min-heap
  addNum(num) {
    this.lo.push(-num); this.lo.sort((a,b)=>a-b); // max-heap via negation
    this.hi.push(-this.lo.shift()); this.hi.sort((a,b)=>a-b);
    if (this.lo.length < this.hi.length) { this.lo.push(-this.hi.shift()); this.lo.sort((a,b)=>a-b); }
  }
  findMedian() {
    return this.lo.length > this.hi.length ? -this.lo[0] : (-this.lo[0] + this.hi[0]) / 2;
  }
}
```

**Solve Today:** Kth Largest | Task Scheduler | Find Median from Stream | Top K Frequent Elements | K Closest Points

**📝 Day 21 Interview Questions:**
1. (Hard | All) "Find Median from Data Stream" — two heaps. What invariant do you maintain?
2. (Medium | All) "Task Scheduler" — why does greedy with priority queue work? Walk through `["A","A","A","B","B"], n=2`.
3. (Hard | Meta) "Design Twitter" — merge k sorted lists (user timelines). What data structure?
4. (Medium | All) Kth largest — quickselect vs min-heap of size k. When does each win?
5. (Medium | All) Implement a min-heap from scratch with `push`, `pop`, `peek`, `_bubbleUp`, `_sinkDown`.
6. (Hard | Google) "Smallest Range Covering Elements from K Lists" — heap + sliding window.
7. (Medium | Netflix) "Reorganize String" — greedy with max-heap. When is it impossible?
8. (Hard | Google) "Find K Pairs with Smallest Sums" — heap-based approach. How do you avoid duplicates?

---

## DAY 22 — Linked List Fundamentals

```javascript
// Reverse — iterative O(n) O(1)
function reverseList(head) {
  let prev = null, curr = head;
  while (curr) { const next = curr.next; curr.next = prev; prev = curr; curr = next; }
  return prev;
}

// Floyd's cycle detection — find cycle start
function detectCycle(head) {
  let slow = head, fast = head;
  while (fast?.next) {
    slow = slow.next; fast = fast.next.next;
    if (slow === fast) { // cycle exists
      slow = head;
      while (slow !== fast) { slow = slow.next; fast = fast.next; }
      return slow; // cycle start
    }
  }
  return null;
}

// Merge two sorted lists — dummy head
function mergeTwoLists(l1, l2) {
  const dummy = new ListNode(0);
  let curr = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { curr.next = l1; l1 = l1.next; }
    else { curr.next = l2; l2 = l2.next; }
    curr = curr.next;
  }
  curr.next = l1 || l2;
  return dummy.next;
}

// Remove nth from end — two-pointer with gap
function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let fast = dummy, slow = dummy;
  for (let i = 0; i <= n; i++) fast = fast.next;
  while (fast) { slow = slow.next; fast = fast.next; }
  slow.next = slow.next.next;
  return dummy.next;
}
```

**Solve Today:** Reverse Linked List (iterative + recursive) | Detect Cycle II | Merge Two Sorted | Remove Nth | Middle of List

**📝 Day 22 Interview Questions:**
1. (Medium | All) Reverse linked list iteratively AND recursively. Which is O(1) space?
2. (Medium | Google, Meta) Floyd's cycle detection — why do they meet? Why does restarting slow from head find cycle start? (Prove it)
3. (Medium | All) Merge two sorted lists — why the dummy head pattern?
4. (Hard | Meta) Merge K sorted lists — divide and conquer approach. Complexity?
5. (Medium | All) Remove nth from end in ONE pass — two-pointer with n-gap. Trace through.
6. (Hard | Google) Sort a linked list O(n log n) time O(1) space — why merge sort over quick sort?
7. (Medium | All) Find middle of linked list — fast/slow pointers. What if you need the first middle vs second middle of even-length?
8. (Hard | Meta) "Reverse Nodes in K-Group" — recursive approach. What is the base case?

---

## DAY 23 — Linked List Advanced + LRU Cache

```javascript
// LRU Cache — O(1) get/put
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = { key: 0, val: 0, prev: null, next: null };
    this.tail = { key: 0, val: 0, prev: this.head, next: null };
    this.head.next = this.tail;
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._remove(node); this._addFront(node);
    return node.val;
  }
  put(key, val) {
    if (this.map.has(key)) this._remove(this.map.get(key));
    const node = { key, val };
    this._addFront(node); this.map.set(key, node);
    if (this.map.size > this.capacity) {
      const lru = this.tail.prev;
      this._remove(lru); this.map.delete(lru.key);
    }
  }
  _remove(node) { node.prev.next = node.next; node.next.prev = node.prev; }
  _addFront(node) {
    node.next = this.head.next; node.prev = this.head;
    this.head.next.prev = node; this.head.next = node;
  }
}
```

**Solve Today:** LRU Cache | Copy List with Random Pointer | Reorder List | Sort List (merge sort)

**📝 Day 23 Interview Questions:**
1. (Hard | Google, Meta, Netflix) LRU Cache — walk through get and put with dummy head/tail. Why doubly linked list?
2. (Medium | All) Copy List with Random Pointer — two-pass hash map approach. The O(1) space trick?
3. (Hard | Google) Sort linked list O(n log n) O(1) space — bottom-up merge sort on linked list.
4. (Medium | Meta) Reorder List — three steps: find middle, reverse second half, merge alternately.
5. (Hard | All) Extend LRU to LFU Cache — what additional data structure do you need?
6. (Medium | Stripe) Rate limiter using sliding window linked list — evict old timestamps efficiently.
7. (Hard | Google) "Flatten a Multilevel Doubly Linked List" — DFS on the list structure.
8. (Medium | All) "Palindrome Linked List" — O(1) space. Find middle, reverse second half, compare.

---

## DAY 24 — Phase 3 Sprint

**Sprint (75 min timed):**

| Problem | Time | Pattern |
|---|---|---|
| Largest Rectangle Histogram | 20 min | Monotonic stack |
| LRU Cache | 20 min | HashMap + DLL |
| Sliding Window Maximum | 20 min | Monotonic deque |
| Reverse Nodes in K-Group | 15 min | Linked list |

---

## DAY 25 — Phase 3 Checkpoint

**Phase 3 Checklist:**
- [ ] Stack: valid parens, min stack, monotonic stack (NGE + histogram)
- [ ] Monotonic deque: sliding window maximum
- [ ] Priority queue: median finder, task scheduler, merge k lists
- [ ] Linked list: reverse, cycle, merge, remove nth, reorder
- [ ] LRU Cache: full O(1) implementation memorized

**📝 Day 25 Interview Questions:**
1. (Hard | All) LRU Cache from memory — 20 minutes. Zero hints.
2. (Hard | Google) Largest Rectangle in Histogram — code in 15 minutes. Trace through.
3. (Medium | All) Design browser history with back(k), forward(k), visit(url) — two stacks or doubly linked list?
4. (Hard | Meta) Merge K sorted lists with a heap — O(n log k).
5. (Medium | Stripe) Rate limiter: allow at most N requests per minute per user — queue-based implementation.

---

# PHASE 4: RECURSION & BACKTRACKING (Days 26–31)

## DAY 26 — Divide and Conquer

```javascript
// Merge sort
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return [...result, ...left.slice(i), ...right.slice(j)];
}

// Quick select — O(n) average for Kth largest
function quickSelect(nums, left, right, k) {
  if (left === right) return nums[left];
  const pivotIdx = partition(nums, left, right);
  if (pivotIdx === k) return nums[k];
  return pivotIdx < k ? quickSelect(nums, pivotIdx+1, right, k) : quickSelect(nums, left, pivotIdx-1, k);
}
function partition(nums, left, right) {
  const pivot = nums[right];
  let i = left;
  for (let j = left; j < right; j++) if (nums[j] <= pivot) [nums[i], nums[j]] = [nums[j], nums[i++]];
  [nums[i], nums[right]] = [nums[right], nums[i]];
  return i;
}

// Fast exponentiation
function myPow(x, n) {
  if (n === 0) return 1;
  if (n < 0) { x = 1/x; n = -n; }
  return n % 2 === 0 ? myPow(x*x, n/2) : x * myPow(x*x, (n-1)/2);
}
```

**Solve Today:** Merge Sort | Count Inversions | Kth Largest (quickselect) | Pow(x,n) | Find Peak Element

**📝 Day 26 Interview Questions:**
1. (Medium | All) Recurrence T(n)=2T(n/2)+O(n) — Master Theorem. What is the result?
2. (Medium | Google) Quickselect — average vs worst-case. How to avoid worst case in practice?
3. (Hard | Google) Count inversions — how does merge sort count swaps across the merge?
4. (Medium | All) Pow(x,n) — handle negative n. Complexity vs naive loop?
5. (Hard | Meta) "Expression Add Operators" — D&C on digit string. Why D&C over iteration?
6. (Medium | All) Iterative vs recursive merge sort — stack space difference?
7. (Hard | Google) "Reverse Pairs" — count pairs where nums[i] > 2*nums[j], i<j. Merge sort variant.
8. (Medium | Google) "Find Peak Element" — binary search on unsorted array. Justify why it works.

---

## DAY 27 — Backtracking Fundamentals

```javascript
// Backtracking template
function backtrack(result, current, choices, start) {
  if (isComplete(current)) { result.push([...current]); return; }
  for (let i = start; i < choices.length; i++) {
    if (shouldSkip(i, choices, current)) continue; // pruning
    current.push(choices[i]);
    backtrack(result, current, choices, i + 1); // i+1 for combinations
    current.pop();
  }
}

// Subsets
function subsets(nums) {
  const result = [];
  function bt(start, curr) {
    result.push([...curr]);
    for (let i = start; i < nums.length; i++) {
      curr.push(nums[i]); bt(i+1, curr); curr.pop();
    }
  }
  bt(0, []);
  return result;
}

// Combination Sum (with repetition)
function combinationSum(candidates, target) {
  const result = [];
  function bt(start, curr, remaining) {
    if (remaining === 0) { result.push([...curr]); return; }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break; // pruning (sorted)
      curr.push(candidates[i]);
      bt(i, curr, remaining - candidates[i]); // i not i+1 (repetition allowed)
      curr.pop();
    }
  }
  candidates.sort((a,b)=>a-b);
  bt(0, [], target);
  return result;
}
```

**Solve Today:** Subsets | Subsets II (duplicates) | Combination Sum | Combination Sum II | Combinations nCk

**📝 Day 27 Interview Questions:**
1. (Medium | All) Time complexity: all subsets (2ⁿ), all permutations (n!), nCk combinations — justify each.
2. (Medium | Meta) Combination Sum II — why skip `nums[i]===nums[i-1]` when `i>start`? What bug does this prevent?
3. (Hard | Google) Draw recursion tree for `subsets([1,2,3])` — how many nodes? How many leaves?
4. (Medium | All) Difference between combination and permutation in backtracking — what changes in the loop?
5. (Medium | Stripe) Generate all valid hex color codes (6-digit). Structure the backtracking choices.
6. (Hard | Meta) "Palindrome Partitioning" — backtracking + DP (precompute palindromes). Why precompute?
7. (Medium | All) What is pruning in backtracking? Give 3 concrete pruning conditions from problems you know.
8. (Hard | Google) "Word Search" — DFS + backtracking on grid. Time complexity? How avoid revisiting?

---

## DAY 28 — Permutations, N-Queens, Generate Parentheses

```javascript
// Permutations II (with duplicates) — swap based
function permuteUnique(nums) {
  const result = [];
  nums.sort((a,b)=>a-b);
  function bt(start) {
    if (start === nums.length) { result.push([...nums]); return; }
    const seen = new Set();
    for (let i = start; i < nums.length; i++) {
      if (seen.has(nums[i])) continue;
      seen.add(nums[i]);
      [nums[start], nums[i]] = [nums[i], nums[start]];
      bt(start + 1);
      [nums[start], nums[i]] = [nums[i], nums[start]];
    }
  }
  bt(0); return result;
}

// Generate Parentheses — pruning with open/close counts
function generateParenthesis(n) {
  const result = [];
  function bt(curr, open, close) {
    if (curr.length === 2*n) { result.push(curr); return; }
    if (open < n) bt(curr+'(', open+1, close);
    if (close < open) bt(curr+')', open, close+1);
  }
  bt('', 0, 0); return result;
}

// N-Queens — bitmask optimization
function solveNQueens(n) {
  const result = [];
  const board = Array.from({length:n}, ()=>'.'.repeat(n));
  const cols = new Set(), diag = new Set(), antiDiag = new Set();
  function bt(row) {
    if (row === n) { result.push(board.slice()); return; }
    for (let col = 0; col < n; col++) {
      if (cols.has(col) || diag.has(row-col) || antiDiag.has(row+col)) continue;
      cols.add(col); diag.add(row-col); antiDiag.add(row+col);
      board[row] = '.'.repeat(col) + 'Q' + '.'.repeat(n-col-1);
      bt(row+1);
      cols.delete(col); diag.delete(row-col); antiDiag.delete(row+col);
      board[row] = '.'.repeat(n);
    }
  }
  bt(0); return result;
}
```

**Solve Today:** Permutations I & II | Generate Parentheses | N-Queens | Letter Combinations Phone | Restore IP

**📝 Day 28 Interview Questions:**
1. (Medium | All) Generate Parentheses — two pruning conditions: `open < n` and `close < open`. Why do they guarantee validity?
2. (Hard | Google) N-Queens — diagonal constraint: `row - col` is constant on main diagonal, `row + col` on anti-diagonal. Prove it.
3. (Medium | All) Permutations swap-based vs remaining-array approach — space and time tradeoffs?
4. (Hard | Google) "Bitmask N-Queens" — three integers tracking cols, diags, anti-diags. Faster than sets?
5. (Hard | Meta) "Remove Invalid Parentheses" — minimum removals. BFS guarantees minimum; backtracking finds all.
6. (Medium | All) "Restore IP Addresses" — what pruning conditions exist for valid IP segments?
7. (Hard | Google) "Word Break II" — backtracking + memoization. What do you memoize?
8. (Medium | All) What makes a backtracking problem have exponential complexity? Can all be improved with DP?

---

## DAYS 29–31 — Backtracking Advanced + Phase 4 Checkpoint

### DAY 29 — Grid Backtracking + Harder Problems

**Solve:** Word Search | Word Search II (with Trie) | Sudoku Solver | Knight's Tour

**📝 Day 29 Questions:**
1. (Hard | Meta, Google) Word Search II — Trie prunes DFS: if prefix not in Trie, stop immediately.
2. (Medium | All) In grid backtracking, modify in-place vs visited set — tradeoffs?
3. (Hard | Google) Sudoku Solver — what three constraint checks run for each placement?

---

### DAY 30 — Backtracking → DP Transition

**Key insight:** When backtracking has overlapping subproblems, add memoization → it becomes top-down DP.

**Solve:** Target Sum (backtrack → DP knapsack) | Predict the Winner | Beautiful Arrangement | Palindrome Partitioning II

**📝 Day 30 Questions:**
1. (Hard | Meta) "Target Sum" — how do you reduce backtracking (+/-) to knapsack DP?
2. (Medium | All) "Predict the Winner" — minimax. Why is the recurrence `max(left - dp(i+1,j), right - dp(i,j-1))`?
3. (Hard | Google) "Beautiful Arrangement" — bitmask DP vs backtracking. When does bitmask DP win?

---

### DAY 31 — Phase 4 Checkpoint

**Checklist:**
- [ ] Backtracking template: choose → recurse → unchoose
- [ ] Subsets, Combinations, Permutations — all variants including duplicates
- [ ] N-Queens with diagonal constraint sets
- [ ] Generate Parentheses with pruning
- [ ] Word Search: grid DFS + backtrack with in-place marking
- [ ] Understand: when backtracking + memo = DP

---

# PHASE 5: DYNAMIC PROGRAMMING (Days 32–41)

## DAY 32 — DP Fundamentals

```javascript
// 5-step DP framework: define → recurrence → base → order → answer

// Fibonacci — 3 approaches
const fibMemo = (n, m={}) => n<=1 ? n : (m[n] ??= fibMemo(n-1,m) + fibMemo(n-2,m));
const fibTab = n => { const dp=[0,1]; for(let i=2;i<=n;i++) dp[i]=dp[i-1]+dp[i-2]; return dp[n]; };
const fibOpt = n => { let a=0,b=1; for(let i=2;i<=n;i++)[a,b]=[b,a+b]; return b; };

// House Robber — dp[i] = max(dp[i-1], dp[i-2] + nums[i])
function rob(nums) {
  let prev2 = 0, prev1 = 0;
  for (const n of nums) { const curr = Math.max(prev1, prev2 + n); prev2 = prev1; prev1 = curr; }
  return prev1;
}

// Coin Change — dp[i] = min coins to make amount i
function coinChange(coins, amount) {
  const dp = new Array(amount+1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= amount; i++)
    for (const c of coins)
      if (c <= i) dp[i] = Math.min(dp[i], dp[i-c] + 1);
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

**Solve Today:** Fibonacci (3 approaches) | House Robber I & II & III | Climbing Stairs | Min Cost Climbing | Coin Change

**📝 Day 32 Interview Questions:**
1. (Medium | All) Two necessary conditions for DP: overlapping subproblems AND optimal substructure. Give examples of each failing.
2. (Medium | All) House Robber — define dp[i], recurrence, base case, space-optimize to O(1).
3. (Medium | All) Memoization vs tabulation — when is each preferred?
4. (Hard | All) House Robber III (binary tree) — what does each node return? How does it change vs 1D?
5. (Medium | Stripe) "Decode Ways" — define dp[i] carefully. What does it represent?
6. (Medium | All) Coin Change — why is the recurrence `dp[i] = min(dp[i], dp[i-coin]+1)` correct?
7. (Hard | Google) Jump Game IV — BFS vs DP. When is BFS the better tool?
8. (Medium | All) Climbing Stairs with k steps — how does the recurrence generalize?

---

## DAY 33 — LIS & 1D DP Hard Problems

```javascript
// LIS — O(n²)
function lis(nums) {
  const dp = new Array(nums.length).fill(1);
  let max = 1;
  for (let i=1; i<nums.length; i++) {
    for (let j=0; j<i; j++) if (nums[j]<nums[i]) dp[i] = Math.max(dp[i], dp[j]+1);
    max = Math.max(max, dp[i]);
  }
  return max;
}

// LIS — O(n log n) patience sorting
function lisOptimal(nums) {
  const tails = [];
  for (const n of nums) {
    let lo=0, hi=tails.length;
    while (lo<hi) { const mid=lo+hi>>1; tails[mid]<n ? lo=mid+1 : hi=mid; }
    tails[lo] = n;
  }
  return tails.length;
}

// Max Product Subarray — track both max and min
function maxProduct(nums) {
  let maxP=nums[0], minP=nums[0], res=nums[0];
  for (let i=1; i<nums.length; i++) {
    if (nums[i]<0) [maxP,minP]=[minP,maxP];
    maxP = Math.max(nums[i], maxP*nums[i]);
    minP = Math.min(nums[i], minP*nums[i]);
    res = Math.max(res, maxP);
  }
  return res;
}
```

**Solve Today:** LIS (O(n²) and O(n log n)) | Max Product Subarray | Decode Ways | Word Break | Jump Game II

**📝 Day 33 Interview Questions:**
1. (Medium | Google, Meta) Coin Change — prove dp[i] = min(dp[i], dp[i-coin]+1) is correct via induction.
2. (Hard | Google) LIS in O(n log n) — patience sorting intuition. Why does binary search on tails work?
3. (Medium | All) Max Product Subarray — why track both max and min? When does min become new max?
4. (Hard | Google) "Russian Doll Envelopes" — 2D LIS. Sort width ascending, height DESCENDING. Why?
5. (Medium | All) Word Break — DP or BFS? Show both. What is dp[i] in the DP version?
6. (Hard | Google) "Jump Game II" — min jumps. Greedy O(n) vs DP O(n²). Why is greedy correct?
7. (Medium | All) "Perfect Squares" — DP or BFS? What is the BFS graph model?
8. (Hard | Meta) "Longest String Chain" — LIS variant on strings. Define predecessor relationship.

---

## DAY 34 — Knapsack Pattern

```javascript
// 0/1 Knapsack — 1D space-optimized (RIGHT TO LEFT)
function knapsack(weights, values, capacity) {
  const dp = new Array(capacity+1).fill(0);
  for (let i=0; i<weights.length; i++)
    for (let w=capacity; w>=weights[i]; w--) // RIGHT TO LEFT prevents reuse
      dp[w] = Math.max(dp[w], dp[w-weights[i]] + values[i]);
  return dp[capacity];
}

// Unbounded Knapsack (LEFT TO RIGHT — allows reuse)
function unbounded(weights, values, capacity) {
  const dp = new Array(capacity+1).fill(0);
  for (let w=0; w<=capacity; w++)
    for (let i=0; i<weights.length; i++)
      if (weights[i]<=w) dp[w] = Math.max(dp[w], dp[w-weights[i]]+values[i]);
  return dp[capacity];
}

// Partition equal subset sum — 0/1 knapsack variant
function canPartition(nums) {
  const sum = nums.reduce((a,b)=>a+b,0);
  if (sum%2) return false;
  const target = sum/2;
  const dp = new Array(target+1).fill(false);
  dp[0] = true;
  for (const n of nums)
    for (let j=target; j>=n; j--)
      dp[j] = dp[j] || dp[j-n];
  return dp[target];
}
```

**Solve Today:** 0/1 Knapsack | Partition Equal Subset | Target Sum | Coin Change II | Last Stone Weight II

**📝 Day 34 Interview Questions:**
1. (Medium | Google) Why does 1D 0/1 knapsack traverse RIGHT TO LEFT? What goes wrong left-to-right?
2. (Medium | All) Coin Change II (count ways) vs Coin Change I (min coins) — how does the DP differ?
3. (Hard | Meta) "Target Sum" — reduce backtracking (+/-) to subset sum. Derive the transformation.
4. (Medium | All) "Ones and Zeroes" — 2D knapsack with two constraints. Define the DP state.
5. (Hard | Google) "Profitable Schemes" — 3D knapsack. Define dp[k][n][p] and the transition.
6. (Medium | All) Difference between 0/1 knapsack (each item once) and unbounded knapsack (unlimited use) — what changes?
7. (Medium | Stripe) A/B tests: given N tests with estimated values and costs, maximize value under budget. Which knapsack?
8. (Hard | Google) "Maximum Profit in Job Scheduling" — knapsack on time intervals with binary search.

---

## DAY 35 — LCS, Edit Distance, Subsequences

```javascript
// LCS — O(m*n) time, O(n) space
function lcs(t1, t2) {
  const m=t1.length, n=t2.length;
  const dp = Array.from({length:m+1},()=>new Array(n+1).fill(0));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = t1[i-1]===t2[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j],dp[i][j-1]);
  return dp[m][n];
}

// Edit Distance
function minDistance(w1, w2) {
  const m=w1.length, n=w2.length;
  const dp = Array.from({length:m+1},(_,i)=>new Array(n+1).fill(0).map((_,j)=>i||j ? i+j : 0));
  for (let i=0;i<=m;i++) dp[i][0]=i;
  for (let j=0;j<=n;j++) dp[0][j]=j;
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = w1[i-1]===w2[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}
```

**Solve Today:** LCS | Edit Distance | Distinct Subsequences | Longest Common Substring | Shortest Common Supersequence

**📝 Day 35 Interview Questions:**
1. (Medium | Google, Microsoft) Edit Distance — 3 sub-problems represent insert/delete/replace. Explain each.
2. (Hard | Google) "Interleaving String" — define dp[i][j]. What does it represent?
3. (Medium | All) "Distinct Subsequences" — count occurrences of t in s as subsequence. Write the recurrence.
4. (Medium | Meta, Adobe) Edit distance used in: spell check, DNA alignment, git diff. Describe the real product use.
5. (Hard | Google) "Minimum ASCII Delete Sum" — weighted deletion variant of edit distance. How does DP change?
6. (Medium | All) "Longest Palindromic Subsequence" — reduces to LCS with reverse(s). Why?
7. (Hard | Microsoft) "Wildcard Matching" with `?` and `*` — how does `*` change the DP recurrence?
8. (Medium | Stripe) Implement a line-level diff (like git diff) using LCS. Show added/removed lines.

---

## DAYS 36–41 — DP Advanced + Phase 5 Checkpoint

### DAY 36 — Grid DP + Palindrome DP
```javascript
// Unique paths
function uniquePaths(m,n){const dp=Array.from({length:m},()=>new Array(n).fill(1));for(let i=1;i<m;i++)for(let j=1;j<n;j++)dp[i][j]=dp[i-1][j]+dp[i][j-1];return dp[m-1][n-1];}
// Maximal square — dp[i][j] = side of largest square ending at (i,j)
function maximalSquare(matrix){let max=0;const dp=matrix.map(r=>[...r].map(Number));for(let i=1;i<matrix.length;i++)for(let j=1;j<matrix[0].length;j++)if(matrix[i][j]==='1'){dp[i][j]=Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1])+1;max=Math.max(max,dp[i][j]);}return max*max;}
```
**Solve:** Unique Paths I & II | Minimum Path Sum | Maximal Square | Triangle | Dungeon Game

### DAY 37 — Interval DP
```javascript
// Burst Balloons — think about LAST balloon burst
function maxCoins(nums){nums=[1,...nums,1];const n=nums.length;const dp=Array.from({length:n},()=>new Array(n).fill(0));for(let len=2;len<n;len++)for(let l=0;l<n-len;l++){const r=l+len;for(let k=l+1;k<r;k++)dp[l][r]=Math.max(dp[l][r],dp[l][k]+dp[k][r]+nums[l]*nums[k]*nums[r]);}return dp[0][n-1];}
```
**Solve:** Burst Balloons | Strange Printer | Minimum Cost to Merge Stones | Predict the Winner

### DAY 38 — State Machine DP (Stock Problems)
```javascript
// Stock with cooldown — 3 states
function stockCooldown(prices){let held=-Infinity,sold=0,rest=0;for(const p of prices){[held,sold,rest]=[Math.max(held,rest-p),held+p,Math.max(rest,sold)];}return Math.max(sold,rest);}
```
**Solve:** All 6 stock problems (Best Time I, II, III, IV, Cooldown, Fee)

### DAY 39 — DP for Frontend
```javascript
// Simplified Myers Diff using LCS
function diff(oldArr, newArr){const m=oldArr.length,n=newArr.length,dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)dp[i][j]=oldArr[i-1]===newArr[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);const ops=[];let i=m,j=n;while(i>0||j>0){if(i>0&&j>0&&oldArr[i-1]===newArr[j-1]){i--;j--;}else if(j>0&&(i===0||dp[i][j-1]>=dp[i-1][j])){ops.unshift({type:'INSERT',val:newArr[j-1]});j--;}else{ops.unshift({type:'DELETE',val:oldArr[i-1]});i--;}}return ops;}
```
**Solve:** Simplified React reconciler diff | Text Justification | Wildcard Matching

### DAYS 40–41 — Phase 5 Sprint + Checkpoint
**Phase 5 Checklist:**
- [ ] 1D DP: fibonacci, house robber, LIS (O(n²) and O(n log n)), coin change
- [ ] Knapsack: 0/1 and unbounded, space-optimized to 1D
- [ ] Subsequences: LCS, edit distance, distinct subsequences
- [ ] Palindromes: expand center, palindrome partition DP
- [ ] Grid DP: unique paths, maximal square, dungeon game
- [ ] Interval DP: burst balloons ("last burst" insight)
- [ ] State machine DP: all 6 stock problems
- [ ] Frontend DP: diff algorithm, text wrapping

**📝 Day 40–41 Interview Questions:**
1. (Hard | Google) Burst Balloons — explain "last burst" reasoning. Code it cold.
2. (Hard | All) Stock problems — unify all 6 under dp[i][k][0/1] framework.
3. (Medium | All) Maximal Square — dp[i][j] = min(left, up, diagonal) + 1. Prove correctness.
4. (Hard | Google) "Interleaving String" — dp[i][j] means s3[0..i+j-1] formed by s1[0..i-1] and s2[0..j-1].
5. (Hard | Meta) "Minimum Distance to Type a Word" — DP on two-finger positions. Define the state.

---

# PHASE 6: FRONTEND IMPLEMENTATIONS (Days 42–56)

## DAY 42 — Debounce & Throttle
```javascript
function debounce(fn, delay, {leading=false, trailing=true}={}) {
  let timer=null, lastArgs=null;
  function debounced(...args) {
    lastArgs=args;
    const isFirst=leading&&!timer;
    clearTimeout(timer);
    timer=setTimeout(()=>{timer=null;if(trailing&&!isFirst)fn.apply(this,lastArgs);},delay);
    if(isFirst)fn.apply(this,args);
  }
  debounced.cancel=()=>{clearTimeout(timer);timer=null;};
  debounced.flush=()=>{clearTimeout(timer);fn.apply(this,lastArgs);};
  return debounced;
}

function throttle(fn, limit) {
  let last=0, timer=null;
  return function(...args) {
    const now=Date.now(), remaining=limit-(now-last);
    if(remaining<=0){clearTimeout(timer);timer=null;last=now;fn.apply(this,args);}
    else if(!timer){timer=setTimeout(()=>{last=Date.now();timer=null;fn.apply(this,args);},remaining);}
  };
}
```
**📝 Day 42 Questions:** (see original Phase 6 Day 42 questions above)

## DAY 43 — Deep Clone & Deep Equal
## DAY 44 — EventEmitter from Scratch
## DAY 45 — Promise Combinators from Scratch
## DAY 46 — Curry, Compose, Pipe
## DAY 47 — Memoize & Cache Strategies
## DAY 48 — Flatten Nested Structures
## DAY 49 — Virtual DOM & Diff Algorithm
## DAY 50 — Mini Redux & Reactive Store
## DAY 51 — LRU Cache + LFU Cache
## DAY 52 — Client-Side Router
## DAY 53 — Infinite Scroll & Virtual List
## DAY 54 — Autocomplete with Trie

*(Full implementations for Days 43–54 are identical to those detailed in the roadmap sections above)*

## DAY 55 — Phase 6 Sprint
**Sprint:** Re-implement 3 of: LRU Cache, EventEmitter, Promise.all, debounce, deepClone, curry, createStore — all from memory, timed.

## DAY 56 — Phase 6 Checkpoint
**Checklist:** debounce+throttle | deepClone | EventEmitter | Promise combinators | curry/compose/pipe | memoize | flattenObject | Virtual DOM | Mini Redux | LRU Cache | LFU Cache | Router | Virtual List | Autocomplete Trie

---

# PHASE 7: SYSTEM DESIGN CODING (Days 57–64)

## DAY 57 — Rate Limiter
```javascript
class TokenBucket{constructor(cap,rate){this.cap=cap;this.tokens=cap;this.rate=rate;this.last=Date.now();}consume(n=1){const now=Date.now();this.tokens=Math.min(this.cap,this.tokens+(now-this.last)*this.rate);this.last=now;if(this.tokens>=n){this.tokens-=n;return true;}return false;}}
class SlidingWindowRL{constructor(window,max){this.window=window;this.max=max;this.requests=new Map();}allow(id){const now=Date.now(),start=now-this.window;const ts=(this.requests.get(id)||[]).filter(t=>t>start);if(ts.length>=this.max)return false;ts.push(now);this.requests.set(id,ts);return true;}}
```

## DAY 58 — Pub/Sub & Observable
## DAY 59 — Task Scheduler
## DAY 60 — State Machine
## DAY 61 — Web Worker Communication
## DAY 62 — Phase 7 Sprint: Circuit Breaker + Request Deduplicator
## DAY 63 — Phase 7 Checkpoint
## DAY 64 — Integration: Full API Client

*(Implementations identical to those in the detailed Phase 7 sections)*

---

# PHASE 8: MOCK INTERVIEWS (Days 65–74)

## DAY 65 — Mock 1: Warm-Up (Easy/Medium)
## DAY 66 — Mock 2: Medium Set
## DAY 67 — Mock 3: Hard Problem
## DAY 68 — Mock 4: Frontend Specific
## DAY 69 — Mock 5: Full 60-Minute Session
## DAY 70 — Mock 6: Complete Interview Loop
## DAY 71 — Weak Area Focus Day 1
## DAY 72 — Weak Area Focus Day 2
## DAY 73 — Speed Run: All Pattern Templates
## DAY 74 — Final Phase Mock

---

# REVISION & PEAK PERFORMANCE (Days 75–90)

## DAY 75 — Arrays & Strings Revision Sprint
## DAY 76 — Trees & Graphs Revision Sprint
## DAY 77 — DP Revision Sprint
## DAY 78 — Frontend Implementations Revision
## DAY 79 — Stacks, Queues, Linked Lists Revision
## DAY 80 — Backtracking Revision
## DAY 81 — System Design Coding Revision
## DAY 82 — Full Mock Simulation #1
## DAY 83 — Full Mock Simulation #2
## DAY 84 — Pattern Recognition Drill
## DAY 85 — Hard Problem Deep Dive
## DAY 86 — Full Mock Simulation #3
## DAY 87 — Speed Coding: 10 Problems in 90 Minutes
## DAY 88 — Complexity Analysis Master Class
## DAY 89 — Final Weak Spot Elimination
## DAY 90 — Peak Confidence + Complete Review

*(Full content for all revision days identical to the detailed Day 75–90 sections)*


---

## DAY 40 — DP for Frontend: Diff Algorithm + Text Wrapping

**Why it matters:** These are DP problems with direct frontend engineering applications. The Myers diff algorithm powers React's reconciler and git. Text wrapping DP is used in CSS layout engines and text editors.

**Diff Algorithm (LCS-based):**
```javascript
// Produce minimal edit operations from two arrays
function diffArrays(oldArr, newArr) {
  const m = oldArr.length, n = newArr.length;
  // Build LCS table
  const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oldArr[i-1] === newArr[j-1]
        ? dp[i-1][j-1] + 1
        : Math.max(dp[i-1][j], dp[i][j-1]);

  // Backtrack to produce operations
  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldArr[i-1] === newArr[j-1]) {
      ops.unshift({ type: 'KEEP', val: oldArr[i-1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      ops.unshift({ type: 'INSERT', val: newArr[j-1] });
      j--;
    } else {
      ops.unshift({ type: 'DELETE', val: oldArr[i-1] });
      i--;
    }
  }
  return ops;
}

// Text Justification — greedy (what most editors use)
function fullJustify(words, maxWidth) {
  const result = [];
  let line = [], lineLen = 0;
  for (const word of words) {
    if (lineLen + word.length + line.length > maxWidth) {
      result.push(formatLine(line, lineLen, maxWidth, false));
      line = []; lineLen = 0;
    }
    line.push(word); lineLen += word.length;
  }
  result.push(formatLine(line, lineLen, maxWidth, true)); // last line left-aligned
  return result;
}
function formatLine(words, lineLen, maxWidth, isLast) {
  if (words.length === 1 || isLast) return words.join(' ').padEnd(maxWidth);
  const totalSpaces = maxWidth - lineLen;
  const gaps = words.length - 1;
  const spacePerGap = Math.floor(totalSpaces / gaps);
  const extra = totalSpaces % gaps;
  let line = '';
  for (let i = 0; i < words.length - 1; i++) {
    line += words[i] + ' '.repeat(spacePerGap + (i < extra ? 1 : 0));
  }
  return line + words[words.length - 1];
}

// Wildcard Matching — DP with '?' and '*'
function isMatch(s, p) {
  const m = s.length, n = p.length;
  const dp = Array.from({length: m+1}, () => new Array(n+1).fill(false));
  dp[0][0] = true;
  // '*' can match empty string
  for (let j = 1; j <= n; j++) if (p[j-1] === '*') dp[0][j] = dp[0][j-1];
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (p[j-1] === '*') dp[i][j] = dp[i-1][j] || dp[i][j-1]; // match 1+ or 0
      else if (p[j-1] === '?' || p[j-1] === s[i-1]) dp[i][j] = dp[i-1][j-1];
    }
  }
  return dp[m][n];
}
```

**Problems to Solve Today:**
1. Implement `diffArrays(oldArr, newArr)` — produce minimal INSERT/DELETE/KEEP operations
2. Text Justification — format words into justified lines
3. Wildcard Matching with `?` and `*`
4. Implement `reactReconcile(oldVNodes, newVNodes)` — simplified version that produces DOM patches

**Expected Outcome:** You can explain how React's reconciliation uses a diff algorithm and why it's O(n) not O(n³).

---

**📝 Day 40 Interview Practice Questions**

1. **(Hard | Meta)** How does React's reconciliation differ from the classic LCS-based diff algorithm? What heuristics make it O(n)?

2. **(Medium | All Companies)** "Text Justification" — greedy works but DP produces globally optimal line breaks. When does the greedy approach fail?

3. **(Hard | Microsoft)** "Wildcard Matching" — `*` matches any sequence including empty. How is the DP recurrence different from Regular Expression Matching?

4. **(Medium | All Companies)** What are the 4 operation types in a diff algorithm (INSERT, DELETE, KEEP, REPLACE)? How do you reconstruct them from the LCS table?

5. **(Hard | Google)** Myers diff algorithm — the paper describes an O(nd) algorithm where d is the edit distance. How does this outperform the LCS approach?

6. **(Medium | Meta, Adobe)** The `key` prop in React prevents unnecessary re-renders. Connect this to the diff algorithm — what does key enable in the comparison?

7. **(Hard | All Companies)** Implement a DP-based line-break algorithm (Knuth-Plass) that minimizes the total "badness" (squared whitespace) across all lines.

8. **(Medium | Google, Stripe)** You receive two versions of a JSON config file. Implement a structured diff that shows exactly which keys changed, added, or were removed.

---

## DAY 41 — Phase 5 Final Checkpoint + DP Pattern Master Review

**Why it matters:** Before entering Phase 6, you must be able to: identify a DP problem in under 60 seconds, write the recurrence without looking it up, and code it cleanly under time pressure.

**Study Agenda (75 min)**

**First 20 min — DP Pattern Recognition Drill:**
For each problem description below, state: (a) DP type, (b) state definition dp[i] or dp[i][j], (c) recurrence. Do NOT solve — just identify.

| Problem | DP Type | dp[i] means | Recurrence |
|---|---|---|---|
| House Robber | 1D | max money up to house i | `max(dp[i-1], dp[i-2]+nums[i])` |
| Coin Change | 1D unbounded | min coins for amount i | `min(dp[i], dp[i-c]+1)` for each coin c |
| LCS | 2D | length of LCS of first i chars of t1, j chars of t2 | match: `dp[i-1][j-1]+1`, else: `max(dp[i-1][j], dp[i][j-1])` |
| Edit Distance | 2D | min edits to convert t1[0..i] to t2[0..j] | match: `dp[i-1][j-1]`, else: `1+min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])` |
| Unique Paths | 2D grid | paths to reach cell (i,j) | `dp[i-1][j] + dp[i][j-1]` |
| Burst Balloons | Interval | max coins for interval (l,r) | `max(dp[l][k]+dp[k][r]+nums[l]*nums[k]*nums[r])` for k in (l,r) |
| Stock Cooldown | State machine | — | 3 states: held, sold, rest |
| 0/1 Knapsack | 1D (space opt) | max value with capacity w | RIGHT TO LEFT: `max(dp[w], dp[w-wt]+val)` |

**Next 30 min — Solve 3 problems cold (no hints, timed):**

| Problem | Time Limit | DP Type |
|---|---|---|
| Burst Balloons | 25 min | Interval DP |
| Partition Equal Subset Sum | 15 min | 0/1 Knapsack |
| Longest Palindromic Subsequence | 15 min | LCS variant |

**Final 25 min — Phase 5 Completion Checklist:**

- [ ] 1D DP: house robber, LIS (O(n²) and O(n log n)), coin change, word break
- [ ] Knapsack 0/1: space-optimized RIGHT-TO-LEFT traversal
- [ ] Unbounded knapsack: LEFT-TO-RIGHT traversal (why different)
- [ ] LCS and edit distance: 2D table, all transitions
- [ ] Palindrome DP: expand-around-center and DP table precomputation
- [ ] Grid DP: unique paths, maximal square, dungeon game
- [ ] Interval DP: burst balloons ("last burst" key insight memorized)
- [ ] State machine DP: all 6 stock problems under unified framework
- [ ] Frontend DP: diff algorithm producing edit operations

**Phase 5 Self-Assessment — Rate yourself 1–5:**

| Topic | Score (1-5) | Can code in < time? |
|---|---|---|
| Coin Change (define dp, recurrence, base) | | 10 min |
| LCS (2D table setup) | | 12 min |
| Edit Distance (all 3 transitions) | | 15 min |
| Burst Balloons (interval DP setup) | | 20 min |
| All 6 stock problems | | 25 min |
| 0/1 Knapsack (space optimized) | | 12 min |
| LIS in O(n log n) | | 15 min |

**Target:** All scores ≥ 4 before moving to Phase 6.

---

**📝 Day 41 Interview Practice Questions**

1. **(Hard | Google)** A Google interviewer gives you a new DP problem. Walk through your 5-step framework applied to: "Given an array of non-negative integers, find the maximum sum you can get by picking non-adjacent elements. Elements wrap around (circular array)."

2. **(Hard | Meta)** Burst Balloons — explain the "last balloon" insight and code it from memory in 25 minutes.

3. **(Medium | All Companies)** What are the 2 necessary conditions for a problem to be solvable with DP? Give an example of a problem that has one but not the other.

4. **(Hard | Google)** "Scramble String" — 3D DP on string partitioning. Define the state and write the recurrence before coding.

5. **(Hard | Stripe)** "Minimum Number of Refueling Stops" — can be solved with DP or greedy + heap. Which is better and when?

6. **(Hard | Google)** "Largest Divisible Subset" — LIS variant. How does the recurrence relate to divisibility?

7. **(Medium | All Companies)** Given any backtracking problem, describe when and how to add memoization to convert it to top-down DP.

8. **(Hard | Meta)** "Best Time to Buy and Sell Stock IV" — generalize from k=2 to arbitrary k. How does the O(nk) DP work?

9. **(Medium | All Companies)** Space optimization: how do you go from 2D O(m×n) to 1D O(n) for both LCS and edit distance?

10. **(Hard | Google)** "Palindrome Partitioning II" — two-step: precompute all palindromes in O(n²), then DP for minimum cuts in O(n²). Walk through the precomputation.


---

## DAY 29 — Grid Backtracking + Hard Backtracking Problems

**Focus:** Apply backtracking to 2D grids. Master Word Search, Word Search II (Trie pruning), and Sudoku Solver.

**Key Code:**
```javascript
// Word Search — DFS + backtracking on grid
function exist(board, word) {
  const m = board.length, n = board[0].length;
  function dfs(r, c, idx) {
    if (idx === word.length) return true;
    if (r<0||r>=m||c<0||c>=n||board[r][c]!==word[idx]) return false;
    const temp = board[r][c];
    board[r][c] = '#'; // mark visited in-place
    const found = dfs(r+1,c,idx+1)||dfs(r-1,c,idx+1)||dfs(r,c+1,idx+1)||dfs(r,c-1,idx+1);
    board[r][c] = temp; // restore (backtrack)
    return found;
  }
  for (let r=0;r<m;r++) for (let c=0;c<n;c++) if (dfs(r,c,0)) return true;
  return false;
}
```

**Solve Today:** Word Search | Word Search II (with Trie) | Sudoku Solver | Knight's Tour (conceptual)

**📝 Day 29 Interview Practice Questions**

1. **(Hard | Meta, Google)** Word Search II — why build a Trie of all words first? How does it prune the DFS?
2. **(Medium | All)** In grid backtracking: modify in-place vs use a `visited` Set — trade-offs?
3. **(Hard | Google)** Sudoku Solver — what 3 constraint checks run for each cell placement?
4. **(Medium | All)** Word Search time complexity — O(m×n×4^L) where L = word length. Explain.
5. **(Hard | Meta)** Word Search II — when you find a word, remove it from the Trie. Why?
6. **(Medium | All)** Grid DFS: when does BFS make more sense than DFS for grid problems?
7. **(Hard | Google)** "N-Queens" using bitmask — 3 integers for cols/diag/anti-diag. How?
8. **(Medium | All)** "Path Sum II" — how does the path tracking in tree DFS resemble grid backtracking?

---

## DAY 30 — Backtracking → DP Transition

**Why it matters:** When a backtracking solution has overlapping subproblems, memoization converts it to DP. Recognizing this transition is a senior-level skill.

**Key Examples:**
```javascript
// Target Sum: backtracking → subset sum DP
// Naive: O(2^n) backtracking
function findTargetSumWays_BT(nums, target) {
  let count = 0;
  function bt(i, remaining) {
    if (i === nums.length) { if (remaining === 0) count++; return; }
    bt(i+1, remaining - nums[i]); // assign +
    bt(i+1, remaining + nums[i]); // assign -
  }
  bt(0, target);
  return count;
}
// Optimal: O(n × sum) DP knapsack
function findTargetSumWays_DP(nums, target) {
  const sum = nums.reduce((a,b)=>a+b,0);
  if ((sum + target) % 2 !== 0 || Math.abs(target) > sum) return 0;
  const s = (sum + target) / 2; // subset sum target
  const dp = new Array(s+1).fill(0); dp[0] = 1;
  for (const n of nums) for (let j=s; j>=n; j--) dp[j] += dp[j-n];
  return dp[s];
}

// Predict the Winner — minimax with memoization
function predictTheWinner(nums) {
  const memo = new Map();
  function dp(i, j) {
    const key = `${i},${j}`;
    if (memo.has(key)) return memo.get(key);
    if (i === j) { memo.set(key, nums[i]); return nums[i]; }
    const val = Math.max(nums[i] - dp(i+1,j), nums[j] - dp(i,j-1));
    memo.set(key, val);
    return val;
  }
  return dp(0, nums.length-1) >= 0;
}
```

**Solve Today:** Target Sum (BT → DP) | Predict the Winner | Beautiful Arrangement | Word Break II

**📝 Day 30 Interview Practice Questions**

1. **(Hard | Meta)** Target Sum — derive the transformation from backtracking to knapsack. What is the subset sum target?
2. **(Medium | All)** Predict the Winner — minimax recurrence: why `max(left - dp(i+1,j), right - dp(i,j-1))`?
3. **(Hard | Google)** Beautiful Arrangement — bitmask DP vs backtracking. When does bitmask DP outperform?
4. **(Medium | All)** What two conditions identify that a backtracking problem can be memoized?
5. **(Hard | Meta)** Word Break II — find all sentences. What do you memoize: (start_index → list of sentences)?
6. **(Medium | All)** Palindrome Partitioning — pure backtracking is O(n × 2^n). Adding palindrome precomputation reduces it to O(n × 2^n) but faster in practice. How?
7. **(Hard | Google)** "Stickers to Spell Word" — bitmask DP. State = bitmask of characters covered. Why bitmask?
8. **(Medium | All)** What is "optimal substructure"? Does the game theory problem "Predict the Winner" have it? Prove it.

---

## DAY 31 — Phase 4 Final Checkpoint

**Study Agenda (75 min)**

**First 20 min — Templates from memory (no looking):**
1. Backtracking template (choose/recurse/unchoose)
2. Merge Sort
3. Quick Select partition
4. N-Queens with diagonal constraints

**Next 40 min — Timed Sprint:**

| Problem | Time Limit | Pattern |
|---|---|---|
| Subsets II (with duplicates) | 12 min | Backtracking + dedup |
| Generate Parentheses | 12 min | Backtracking + pruning |
| N-Queens | 16 min | Backtracking + constraints |

**Final 15 min — Phase 4 Completion Checklist:**
- [ ] Merge Sort: full implementation
- [ ] Quick Select: partition-based Kth element
- [ ] Backtracking template: memorized cold
- [ ] Subsets, Combinations, Permutations — all variants including with duplicates
- [ ] N-Queens with diagonal constraint sets (or bitmask)
- [ ] Generate Parentheses with correct pruning
- [ ] Word Search: in-place marking + restore
- [ ] Understand: when backtracking + memoization → DP

**📝 Day 31 Interview Practice Questions**

1. **(Hard | All)** Implement N-Queens cold — 20 minutes. How do you track diagonal constraints efficiently?
2. **(Medium | All)** Permutations II — two approaches: sort+skip vs swap-based. Code the swap-based version.
3. **(Hard | Google)** Word Search II — Trie + DFS. When you find a complete word, why remove it from Trie?
4. **(Medium | All)** Combination Sum II — `if (i > start && nums[i] === nums[i-1]) continue`. Why `i > start`?
5. **(Hard | Meta)** Sudoku Solver — implement with backtracking + constraint sets for rows/cols/boxes.
6. **(Medium | All)** Time complexity of generate parentheses: O(4^n / sqrt(n)) — the Catalan number. Why?
7. **(Hard | Google)** "Expression Add Operators" — insert +/-/* between digits to reach target. Walk through.
8. **(Medium | All)** What is the stack depth of backtracking for N-Queens? What N causes stack overflow?

---

## DAY 36 — Grid DP + Palindrome DP

**Key implementations:**
```javascript
// Unique Paths — dp[i][j] = dp[i-1][j] + dp[i][j-1]
function uniquePaths(m, n) {
  const dp = Array.from({length:m}, ()=>new Array(n).fill(1));
  for (let i=1;i<m;i++) for (let j=1;j<n;j++) dp[i][j]=dp[i-1][j]+dp[i][j-1];
  return dp[m-1][n-1];
}
// Space optimize: O(n)
function uniquePathsOpt(m, n) {
  const dp = new Array(n).fill(1);
  for (let i=1;i<m;i++) for (let j=1;j<n;j++) dp[j]+=dp[j-1];
  return dp[n-1];
}

// Maximal Square — dp[i][j] = side of largest square ending at (i,j)
function maximalSquare(matrix) {
  let maxSide = 0;
  const dp = matrix.map(r => r.map(v => +v));
  for (let i=1;i<matrix.length;i++) {
    for (let j=1;j<matrix[0].length;j++) {
      if (matrix[i][j]==='1') {
        dp[i][j] = Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1;
        maxSide = Math.max(maxSide, dp[i][j]);
      }
    }
  }
  return maxSide * maxSide;
}

// Longest Palindromic Substring — expand around center
function longestPalindrome(s) {
  let start=0, maxLen=1;
  function expand(l, r) {
    while (l>=0 && r<s.length && s[l]===s[r]) { l--; r++; }
    if (r-l-1>maxLen) { maxLen=r-l-1; start=l+1; }
  }
  for (let i=0;i<s.length;i++) { expand(i,i); expand(i,i+1); }
  return s.slice(start, start+maxLen);
}
```

**Solve Today:** Unique Paths I & II | Minimum Path Sum | Maximal Square | Longest Palindromic Substring | Count Palindromic Substrings

**📝 Day 36 Interview Practice Questions**

1. **(Medium | All)** Unique Paths — space optimize from O(m×n) to O(n). Which direction do you iterate?
2. **(Medium | Google, Meta)** Maximal Square — dp[i][j] = min(left, up, diagonal) + 1. Prove this is correct.
3. **(Hard | Google)** "Dungeon Game" — why must you fill bottom-up (from bottom-right to top-left)?
4. **(Medium | All)** "Largest Rectangle in Matrix" — reduce each row to a histogram problem.
5. **(Medium | All)** Expand-around-center for palindromes — why check both odd and even length?
6. **(Hard | Google)** Manacher's Algorithm — O(n) longest palindromic substring. Explain the key insight.
7. **(Medium | All)** Count all palindromic substrings — expand around center in O(n²).
8. **(Hard | Google)** "Palindrome Partitioning II" — precompute isPalin[i][j] then DP for min cuts.

---

## DAY 37 — Interval DP

**Why it matters:** Interval DP is the pattern for "optimal way to process a range." Burst Balloons is the canonical problem — mastering it unlocks all interval DP problems.

**Key insight for Burst Balloons:** Think about which balloon is burst LAST in the range (l, r), not first. This eliminates dependency issues.

```javascript
// Burst Balloons — O(n³)
function maxCoins(nums) {
  nums = [1, ...nums, 1];
  const n = nums.length;
  const dp = Array.from({length:n}, ()=>new Array(n).fill(0));
  // len = interval length, from smallest to largest
  for (let len = 2; len < n; len++) {
    for (let left = 0; left < n - len; left++) {
      const right = left + len;
      for (let k = left + 1; k < right; k++) { // k = last balloon in (left,right)
        dp[left][right] = Math.max(
          dp[left][right],
          dp[left][k] + dp[k][right] + nums[left] * nums[k] * nums[right]
        );
      }
    }
  }
  return dp[0][n-1];
}

// Strange Printer — dp[i][j] = min turns to print s[i..j]
function strangePrinter(s) {
  const n = s.length;
  const dp = Array.from({length:n}, (_,i)=>new Array(n).fill(0).map((_,j)=>j-i+1));
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n-len; i++) {
      const j = i+len-1;
      dp[i][j] = dp[i][j-1] + 1; // print s[j] separately
      for (let k = i; k < j; k++) {
        if (s[k] === s[j]) dp[i][j] = Math.min(dp[i][j], dp[i][k] + (k+1<=j-1?dp[k+1][j-1]:0));
      }
    }
  }
  return dp[0][n-1];
}
```

**Solve Today:** Burst Balloons | Strange Printer | Minimum Cost to Merge Stones | Predict the Winner | Optimal BST (conceptual)

**📝 Day 37 Interview Practice Questions**

1. **(Hard | Google)** Burst Balloons — why do we think about the LAST balloon burst? Trace through `[3,1,5,8]`.
2. **(Hard | Google)** Strange Printer — define dp[i][j]. What does the condition `s[k] === s[j]` enable?
3. **(Hard | Meta)** "Minimum Cost to Merge Stones" — when is it impossible? What's the divisibility condition?
4. **(Medium | All)** Predict the Winner — is this interval DP or state machine DP? Justify.
5. **(Hard | Google)** Matrix Chain Multiplication — the original interval DP problem. How does it relate to Burst Balloons?
6. **(Medium | All)** Interval DP always has O(n³) time. At what n does this become too slow (say, > 1 second)?
7. **(Hard | Google)** "Zuma Game" — interval DP where you remove groups of same-colored balls. Define the state.
8. **(Medium | All)** "Remove Boxes" — 3D interval DP. Why do you need a third dimension?

---

## DAY 38 — State Machine DP: All 6 Stock Problems

**The unified framework:** `dp[i][k][0/1]` = max profit on day i, with at most k transactions, not holding (0) or holding (1) stock.

```javascript
// The 6 stock problems — all under one framework

// Stock I: k=1 (buy once sell once)
function maxProfit1(prices) {
  let minPrice = Infinity, maxP = 0;
  for (const p of prices) { minPrice = Math.min(minPrice, p); maxP = Math.max(maxP, p-minPrice); }
  return maxP;
}

// Stock II: unlimited transactions
function maxProfit2(prices) {
  let profit = 0;
  for (let i=1;i<prices.length;i++) if(prices[i]>prices[i-1]) profit+=prices[i]-prices[i-1];
  return profit;
}

// Stock III: k=2 transactions
function maxProfit3(prices) {
  let buy1=-Infinity, sell1=0, buy2=-Infinity, sell2=0;
  for (const p of prices) {
    buy1 = Math.max(buy1, -p);
    sell1 = Math.max(sell1, buy1+p);
    buy2 = Math.max(buy2, sell1-p);
    sell2 = Math.max(sell2, buy2+p);
  }
  return sell2;
}

// Stock IV: at most k transactions
function maxProfit4(k, prices) {
  const n = prices.length;
  if (k >= n/2) return prices.reduce((s,p,i)=>i?s+Math.max(0,p-prices[i-1]):s, 0);
  const buy = new Array(k+1).fill(-Infinity);
  const sell = new Array(k+1).fill(0);
  for (const p of prices) {
    for (let j=k;j>=1;j--) {
      buy[j] = Math.max(buy[j], sell[j-1]-p);
      sell[j] = Math.max(sell[j], buy[j]+p);
    }
  }
  return sell[k];
}

// Stock with Cooldown
function maxProfitCooldown(prices) {
  let held=-Infinity, sold=0, rest=0;
  for (const p of prices) [held,sold,rest]=[Math.max(held,rest-p), held+p, Math.max(rest,sold)];
  return Math.max(sold,rest);
}

// Stock with Transaction Fee
function maxProfitFee(prices, fee) {
  let cash=0, hold=-Infinity;
  for (const p of prices) { cash=Math.max(cash,hold+p-fee); hold=Math.max(hold,cash-p); }
  return cash;
}
```

**Solve Today:** All 6 stock problems. Time yourself: can you code each from memory in under 8 minutes?

**📝 Day 38 Interview Practice Questions**

1. **(Hard | Meta)** Unify all 6 stock problems under the `dp[i][k][0/1]` framework. What do 0 and 1 represent?
2. **(Medium | All)** Stock I — why is tracking `minPrice` equivalent to a DP formulation?
3. **(Hard | Google)** Stock IV (at most k transactions) — why is `if (k >= n/2)` a special case treated as unlimited?
4. **(Medium | All)** Stock with Cooldown — draw the state machine: held → sold → rest → held. What transitions are valid?
5. **(Hard | Meta)** Stock with Transaction Fee — how does the fee change the "sell" transition?
6. **(Medium | All)** Stock II (unlimited) — why does the greedy "buy every valley, sell every peak" equal the DP solution?
7. **(Hard | Google)** Stock III — why use 4 variables (buy1, sell1, buy2, sell2) instead of a 2D array?
8. **(Medium | All)** Which stock problem has O(1) space? Which requires O(k) space? Which requires O(n) space?

---

## DAY 39 — DP Advanced: Bitmask DP + Advanced Patterns

**Why it matters:** Bitmask DP handles small sets (n ≤ 20) where state is a subset. Appears in traveling salesman, assignment problems, and game theory.

```javascript
// Bitmask DP — Traveling Salesman Problem (conceptual)
function tsp(dist) {
  const n = dist.length;
  const FULL = (1 << n) - 1;
  // dp[mask][i] = min cost to visit all cities in mask, ending at city i
  const dp = Array.from({length: 1<<n}, ()=>new Array(n).fill(Infinity));
  dp[1][0] = 0; // start at city 0
  for (let mask = 1; mask < (1<<n); mask++) {
    for (let u = 0; u < n; u++) {
      if (!(mask & (1<<u)) || dp[mask][u]===Infinity) continue;
      for (let v = 0; v < n; v++) {
        if (mask & (1<<v)) continue; // already visited
        const newMask = mask | (1<<v);
        dp[newMask][v] = Math.min(dp[newMask][v], dp[mask][u] + dist[u][v]);
      }
    }
  }
  return Math.min(...Array.from({length:n}, (_,i)=>dp[FULL][i]+dist[i][0]));
}

// Beautiful Arrangement — bitmask DP
function countArrangement(n) {
  const dp = new Array(1<<n).fill(0);
  dp[0] = 1;
  for (let mask=0; mask<(1<<n); mask++) {
    const pos = mask.toString(2).split('').filter(c=>c==='1').length + 1;
    for (let i=0; i<n; i++) {
      if (!(mask & (1<<i)) && ((i+1)%pos===0 || pos%(i+1)===0)) {
        dp[mask|(1<<i)] += dp[mask];
      }
    }
  }
  return dp[(1<<n)-1];
}

// DP on DAG (Longest Path in DAG)
function longestPathDAG(graph, n) {
  const dp = new Array(n).fill(-1);
  function dfs(u) {
    if (dp[u] !== -1) return dp[u];
    dp[u] = 0;
    for (const [v, w] of (graph[u]||[])) dp[u] = Math.max(dp[u], dfs(v)+w);
    return dp[u];
  }
  return Math.max(...Array.from({length:n}, (_,i)=>dfs(i)));
}
```

**Solve Today:** Beautiful Arrangement | Shortest Path Visiting All Nodes | Stickers to Spell Word | Minimum XOR Sum of Two Arrays

**📝 Day 39 Interview Practice Questions**

1. **(Hard | Google)** "Shortest Path Visiting All Nodes" — bitmask BFS. State = (node, visited_mask). Why BFS not DP here?
2. **(Hard | Meta)** "Stickers to Spell Word" — bitmask DP on character coverage. Define the state and transition.
3. **(Medium | Google)** Beautiful Arrangement — bitmask DP. What does dp[mask] represent? How do you iterate masks?
4. **(Hard | Google)** TSP with bitmask DP — O(n² × 2^n) time. At what n is this feasible? (n ≤ 20)
5. **(Hard | Meta)** "Minimum XOR Sum of Two Arrays" — Hungarian algorithm or bitmask DP. Why bitmask for small n?
6. **(Medium | All)** When does bitmask DP beat backtracking? What is the mathematical advantage?
7. **(Hard | Google)** "Partition to K Equal Sum Subsets" — bitmask DP. Define the state and prove correctness.
8. **(Medium | All)** Memoization on (index, remaining_bitmask) — what problems have this structure? Give 3 examples.

---

