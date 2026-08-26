# Arrays & Strings — 1-Hour Learning Module

> *"Arrays are the soil from which all other data structures grow. Master them, and you master the foundation of everything."*

**Estimated time:** 60 minutes  
**Target:** Google SWE interview preparation  
**Level:** Beginner-friendly, interview-depth

---

## Table of Contents

- [[0–10 min] Big Picture](#0-10-min-big-picture)
- [[10–20 min] Mental Model](#10-20-min-mental-model)
- [[20–35 min] Core Patterns](#20-35-min-core-patterns)
- [[35–45 min] Concrete Code + Dry Run](#35-45-min-concrete-code--dry-run)
- [[45–55 min] Pattern Recognition](#45-55-min-pattern-recognition)
- [[55–60 min] Final Mental Checklist](#55-60-min-final-mental-checklist)
- [Active Recall](#active-recall)
- [Recommended Practice Direction](#recommended-practice-direction)
- [2-Minute Cheat Sheet](#2-minute-cheat-sheet)

---

## [0–10 min] Big Picture

### What is an array? Why does it exist?

An array is the simplest possible way to store multiple values: a fixed-size, contiguous block of memory where every slot is the same size and has a number (its index).

The problem it solves: "I need to store N items and access any one of them instantly."

**Real-world analogy:** Think of a parking lot with numbered spaces. Space 0, space 1, space 2, ... space n-1. To find your car, you don't walk from space 0 — you go directly to the number you wrote down. That direct jump is O(1) access. An array works exactly the same way.

**Why is access O(1)?**  
Because the memory address of any element is `base_address + index * element_size`. One multiplication, one addition. No searching.

**A string is just a character array.** All array patterns apply to strings as well.

### One tiny example

```
arr = [3, 1, 4, 1, 5, 9, 2, 6]
       0  1  2  3  4  5  6  7
```

- `arr[0]` = 3 (instant)
- `arr[5]` = 9 (instant)
- Sum of `arr[2..5]` = 4+1+5+9 = 19 (but you had to visit 4 elements — this is where patterns like prefix sum help)

### What are the patterns in this module?

Every array/string problem is really asking you to efficiently explore a range or a pair of indices. The patterns in this module are strategies for that exploration:

| Pattern | One-line description |
|---|---|
| Two Pointers (Opposite) | Squeeze from both ends of a sorted array |
| Two Pointers (Same Direction) | Fast/slow scan to filter or compress |
| Three Pointers | Partition into three regions in one pass |
| Sliding Window (Fixed) | Maintain a window of size K efficiently |
| Sliding Window (Variable) | Expand/shrink a window under a constraint |
| Sliding Window + HashMap | Variable window where state = frequencies |
| Prefix Sum | Pre-compute cumulative sums for O(1) range queries |
| Prefix XOR | Same idea but with XOR instead of addition |
| Kadane's Algorithm | Maximum sum subarray in O(n) |
| Dutch National Flag | Sort three categories in one pass |
| Boyer-Moore Voting | Find majority element in O(1) space |
| In-Place Manipulation | Use the array itself as scratch space |
| Matrix Traversal | Spiral, diagonal, rotation patterns |
| Rotate Array | Triple-reverse trick for O(1) space rotation |

---

## [10–20 min] Mental Model

### Key observation: all array problems are about "which indices to look at"

The difference between O(n) and O(n²) is almost always: "Did you avoid looking at every pair of indices?"

**The naive approach** for any "find a pair" problem: check every pair. That's O(n²).  
**The insight** for every pattern in this module: use structure (sorted order, running state, precomputed sums) to skip pairs you don't need.

### Critical vocabulary: Subarray vs Subsequence vs Substring

Get this wrong and you apply the wrong technique entirely.

| Term | Contiguous? | Order? | Example from [1,2,3,4] |
|---|---|---|---|
| **Subarray** | Yes | Original | [2,3,4], [1,2], [3] |
| **Substring** | Yes | Original | Same concept, but for strings |
| **Subsequence** | No | Original | [1,3,4], [2,4], [1,4] |
| **Subset** | No | Any | {3,1}, {2,4}, {1,2,3} |

**Why it matters:**
- Subarray/Substring problems → Sliding Window, Prefix Sum, Kadane's, Two Pointers
- Subsequence problems → DP (LIS, LCS), Binary Search
- Subset problems → Backtracking, Bitmask DP

**Trap:** If the problem says "subsequence" and you apply sliding window, you will get it wrong. Always clarify: "Does this mean adjacent elements?"

### Mental model for Two Pointers

Two pointers maintain two "cursors" in the array. The question is always: which one should move, and when?

```
Opposite direction (sorted array, find pair):
[1, 2, 4, 7, 11, 15]
 L                 R
  -> L moves right when sum too small
  -> R moves left when sum too large

Same direction (filter/compress):
[3, 2, 2, 3, 1, 2]
 S                   S = slow (writer)
    F                F = fast (reader/scanner)
  -> F scans all, S writes only what we keep
```

**Key insight for opposite-direction:** On a sorted array, moving left forward increases the sum; moving right backward decreases it. You can always eliminate one candidate per step.

**Key insight for same-direction:** Slow is the write head. Fast is the read head. The gap between them is the "discarded" region. After fast finishes, `arr[0..slow-1]` is your result.

### Mental model for Sliding Window

```
Fixed window (K=3):
[2, 1, 5, 1, 3, 2]
[2, 1, 5]          sum=8
   [1, 5, 1]       sum=7  (subtract 2, add 1)
      [5, 1, 3]    sum=9  (subtract 1, add 3)
         [1, 3, 2] sum=6  (subtract 5, add 2)

Variable window (sum < 7, find longest):
[2, 1, 5, 1, 3, 2]
 L
       R            expand until violation
         L          shrink to fix
```

**Key insight for sliding window:** Left never moves backward. The inner shrink loop's total work across the entire algorithm is at most n steps. So the total is O(n), not O(n²).

### Mental model for Prefix Sum

```
arr     = [3,  1,  4,  1,  5,  9]
prefix  = [0,  3,  4,  8,  9, 14, 23]
           ^                        ^
           always 0                 sum of all

Sum of arr[2..4] = prefix[5] - prefix[2] = 14 - 4 = 10
                              (index 2,3,4 = 4+1+5 = 10) correct!
```

**Key insight:** prefix[i] = total distance traveled to reach checkpoint i. Any range sum = distance[end] - distance[start]. One subtraction, no looping.

### Mental model for Kadane's Algorithm

```
arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4]

At each position: "Should I extend the current subarray, or start fresh here?"
If current running sum < 0, it only hurts future elements. Start fresh.

running: -2 → 1 → -2 → 4 → 3 → 5 → 6 → 1 → 5
           ^start   ^start fresh  
max seen:  -2  1    1   4   4   5   6   6   6 → answer = 6
```

**Key insight:** A negative running prefix can never help. Discard it and start fresh. This is actually a 1D dynamic programming problem with space optimization.

---

## [20–35 min] Core Patterns

### Pattern 1: Two Pointers — Opposite Direction

**When to use:**
- The array/string is sorted (or can be sorted without losing needed information)
- You need a pair satisfying a condition (sum, difference, symmetry)
- You are checking palindromes
- Keywords: "pair with sum," "two numbers that," "is palindrome," "container with most water"

**When NOT to use:**
- Array is unsorted AND sorting loses original index information — use HashMap instead
- Problem is about contiguous subarrays — sliding window is better

**Brute force → observation → optimized:**

Brute force (O(n²)): Check every pair (i, j) where i < j.

Observation: On a sorted array, if arr[left] + arr[right] > target, moving right left makes the sum smaller. If sum < target, moving left right makes it larger. Each step eliminates one index from consideration.

Optimized (O(n)): Initialize left=0, right=n-1. Move one pointer per step based on comparison.

**Algorithm:**
1. left = 0, right = n-1
2. If condition met → record answer, move both (skip duplicates)
3. If "too small" → left++
4. If "too large" → right--
5. Stop when left >= right

**Complexity:** Time O(n), Space O(1) — each pointer moves at most n times, total work ≤ 2n.

**Variants:**
- Two Sum (sorted array): move left if sum too small, right if too large
- Container With Most Water: move the pointer at the shorter line (moving the taller line can only decrease or maintain the height limit)
- Trapping Rain Water: track left_max and right_max; process from the smaller side
- Valid Palindrome: compare characters at left and right, skip non-alphanumeric
- Remove Duplicates (sorted): slow pointer marks write position, fast pointer scans

**Interview traps:**
- Forgetting to skip duplicates in 3Sum: after finding a match, advance both pointers past all equal values
- "What if unsorted?" — HashMap is O(n) time O(n) space; sorting + two pointers is O(n log n) time O(1) space. Know the tradeoff.

---

### Pattern 2: Two Pointers — Same Direction (Fast/Slow)

**When to use:**
- Remove or filter elements in-place
- Compress or deduplicate a sorted array
- Keywords: "remove element," "move zeroes," "remove duplicates in-place"

**When NOT to use:**
- Finding a pair with a target sum — use opposite-direction
- Needing a contiguous window — use sliding window

**Algorithm:**
1. slow = 0, fast = 0
2. fast scans through entire array
3. When fast finds an element worth keeping, write it to arr[slow], slow++
4. After fast finishes, arr[0..slow-1] is the result

**Mental model:** slow = writer, fast = reader. Writer only writes when reader finds something worth keeping.

**Complexity:** Time O(n), Space O(1)

**Variants:**
- Remove Element: skip elements equal to a target value
- Remove Duplicates (sorted): keep only first of each value
- Remove Duplicates (allow at most K): keep at most K copies — check if arr[slow - K] == arr[fast]
- Move Zeroes: preserve order of non-zeroes, zeroes go to end

**Interview traps:**
- If order must be preserved, you must use slow/fast, not swap with the end
- "At most K duplicates" generalization: if slow >= K and arr[slow - K] == arr[fast], skip it

---

### Pattern 3: Three Pointers (Dutch National Flag)

**When to use:**
- Partition into exactly three categories in-place
- Keywords: "sort colors," "three values," "0s 1s 2s," "negatives zeros positives"

**When NOT to use:**
- Two categories — standard two-pointer partition suffices
- More than three categories — counting sort or bucket approach
- Stability required — this is not a stable sort

**Algorithm:**
1. low = 0, mid = 0, high = n-1
2. Invariant: [0, low) = category 1, [low, mid) = category 2, (high, n-1] = category 3
3. While mid <= high:
   - arr[mid] is category 1 → swap(low, mid), low++, mid++
   - arr[mid] is category 2 → mid++
   - arr[mid] is category 3 → swap(mid, high), high-- (do NOT advance mid)

**Critical:** After swapping with high, the element at mid is unknown — it just arrived. You must inspect it before advancing mid.

**Complexity:** Time O(n), Space O(1) — mid traverses the array once.

**Variants:**
- Sort Colors (the canonical LeetCode problem)
- Three-way partition in Quick Sort (handles duplicate pivot values efficiently)
- Separate negatives, zeros, positives

---

### Pattern 4: Sliding Window — Fixed Size

**When to use:**
- "Subarray/substring of exactly size K"
- Computing an aggregate (sum, average, frequency) over every window of size K
- Keywords: "K consecutive elements," "average of K," "subarray of size K"

**When NOT to use:**
- Window size is variable — use variable sliding window
- You need min/max within each window — requires monotonic deque (O(n), but different technique)

**Brute force → observation → optimized:**

Brute force: For each starting position, sum K elements. O(n*K).

Observation: When the window slides one step, only one element enters and one element leaves. The rest are unchanged. You don't need to recompute K elements — just add one and remove one.

Optimized (O(n)): Maintain a running aggregate. At each step: aggregate += enter - leave.

**Algorithm:**
1. Compute aggregate for arr[0..K-1]
2. For i from K to n-1: aggregate += arr[i] - arr[i-K], track best
3. Each element enters once and leaves once → 2n total operations

**Complexity:** Time O(n), Space O(1) for numeric aggregates; O(K) if storing window contents

**Variants:**
- Maximum Sum Subarray of Size K
- Average of All Subarrays of Size K
- String permutation check (fixed window of size len(pattern), frequency matching)
- Max of each window of size K: requires monotonic deque — see Advanced Awareness

**Interview traps:**
- Using prefix sum for this works but misses the point. Interviewer wants to see sliding window because it generalizes to non-sum aggregates.
- Adding a HashMap for frequency matching: combine with character frequency tracking for anagram/permutation problems.

---

### Pattern 5: Sliding Window — Variable Size

**When to use:**
- "Longest/shortest subarray/substring such that [condition]"
- The condition is monotonic: if a window is invalid, adding more elements can only make it more invalid (or vice versa)
- Keywords: "longest substring," "minimum window," "at most K," "subarray with sum ≤ / ≥"

**When NOT to use:**
- The condition is NOT monotonic (e.g., "subarray with sum exactly K" and array has negative numbers — shrinking from left doesn't reliably decrease the sum). Use prefix sum + HashMap instead.
- Problem is about subsequences — sliding window only applies to contiguous ranges

**Brute force → observation → optimized:**

Brute force: For every pair (l, r), check if the window arr[l..r] satisfies the condition. O(n²).

Observation: If a window arr[l..r] is invalid, arr[l..r+1] is also invalid (for the "too long" direction). So once left finds a valid position, all positions to its left are also invalid.

Optimized (O(n)): Right expands greedily. Left shrinks only when needed. Left never moves backward.

**Two templates:**

*Find longest valid window:*
```
left = 0
for right in 0..n-1:
    add arr[right] to window state
    while window is INVALID:
        remove arr[left] from window state
        left++
    best = max(best, right - left + 1)
```

*Find shortest valid window:*
```
left = 0
for right in 0..n-1:
    add arr[right] to window state
    while window is VALID:    <- note: while valid, try to shrink
        best = min(best, right - left + 1)
        remove arr[left] from window state
        left++
```

**Why O(n)?** Left never moves backward. The total number of times left advances across the entire algorithm is at most n. Total operations = O(n) outer + O(n) total inner = O(n).

**Variants:**
- Longest Substring Without Repeating Characters: window state = set; shrink when repeat appears
- Minimum Window Substring: expand until all target characters covered, shrink to minimize
- Longest Substring with At Most K Distinct Characters: frequency map, shrink when distinct count > K
- Subarray Product Less Than K: running product, shrink when product >= K
- Minimum Size Subarray Sum: shortest subarray with sum >= target

**Interview traps:**
- Trying to use this for negative-number exact-sum problems. The shrink logic breaks because adding elements doesn't monotonically change the sum.
- Off-by-one: when left=2 and right=5, window size = right - left + 1 = 4.
- "Count all valid subarrays" (not just longest): for the "at most K" variant, number of valid subarrays ending at right = (right - left + 1). Sum this across all right positions.
- "Exactly K distinct" = atMost(K) - atMost(K-1). This is a powerful reduction.

---

### Pattern 6: Sliding Window with HashMap

**When to use:**
- Variable sliding window where validity condition depends on character/element frequencies
- Keywords: "anagram," "permutation," "minimum window substring," "all characters included"

**When NOT to use:**
- Condition is a simple numeric threshold (sum, product) — a running variable suffices
- Fixed small alphabet — a 26-element frequency array is faster (constant factor optimization)

**Core idea:**

The HashMap IS the window state. You maintain:
1. A frequency map of elements in the current window
2. A counter of how many conditions are currently "satisfied"

Expanding right: add element to map, check if this element's count now matches the requirement, increment satisfied counter if so.  
Shrinking left: if removing left causes a count to drop below requirement, decrement satisfied counter, remove from map if count reaches zero.

**Mental model:** The HashMap is a scoreboard. Expanding adds points. Shrinking removes points. You track when the score reaches "all conditions met."

**Complexity:** Time O(n) — map operations are O(1) amortized. Space O(K) where K = distinct elements.

**Variants:**
- Find All Anagrams in a String: fixed window of size len(pattern), frequency map match
- Minimum Window Substring: variable window covering all target characters
- Longest Substring with At Most K Distinct Characters: shrink when distinct count > K
- Permutation in String: fixed window, frequency match

**Interview traps:**
- Recomputing the entire frequency map at each step instead of incrementally updating — turns O(n) into O(n*K).
- Target has duplicate characters: your "satisfied" counter must track individual character fulfillment, not just presence.

---

### Pattern 7: Prefix Sum

**When to use:**
- Multiple range sum queries on a static array
- "Subarray sum equals K" (combine with HashMap)
- Comparing sums of different regions
- Keywords: "range sum," "subarray sum," "sum between indices," "sum equals K"

**When NOT to use:**
- Array is modified between queries — use Fenwick Tree or Segment Tree
- Only one range sum needed — compute directly in O(n)
- Operation is min/max (not sum) — use Sparse Table or Segment Tree

**Brute force → observation → optimized:**

Brute force for range sum query [l, r]: iterate from l to r, sum up. O(n) per query.

Observation: If we know the sum of arr[0..r] and the sum of arr[0..l-1], we get arr[l..r] = total[r] - total[l-1]. Both are precomputed.

Optimized: Build prefix array in O(n). Every query is O(1).

**Algorithm:**
1. Build: prefix[0] = 0; prefix[i] = prefix[i-1] + arr[i-1]  (prefix has n+1 elements)
2. Query: sum(l, r) = prefix[r+1] - prefix[l]  (inclusive l, r)

**For "subarray sum equals K" (with HashMap):**
- At each index i, we have prefix[i]
- We want to know: how many previous indices j have prefix[i] - prefix[j] = K?
- That means prefix[j] = prefix[i] - K
- Maintain a HashMap: {prefix_value → count of times seen}
- At each step: count += map.get(prefix[i] - K), then add prefix[i] to map
- Start with map = {0: 1} (empty prefix sum of 0 seen once)

**Complexity:** Build O(n), Query O(1). For subarray sum = K: O(n) time, O(n) space.

**Variants:**
- 2D Prefix Sum: prefix[i][j] = sum of rectangle (0,0) to (i-1,j-1). Rectangle query uses inclusion-exclusion: sum(r1,c1,r2,c2) = prefix[r2+1][c2+1] - prefix[r1][c2+1] - prefix[r2+1][c1] + prefix[r1][c1]
- Prefix Sum + HashMap (subarray sum = K): as above
- Prefix Sum with modular arithmetic: "subarray sum divisible by K" — track prefix_sum % K in HashMap
- Difference Array: inverse of prefix sum — for range updates: add value to [l, r] in O(1), reconstruct with prefix sum

**Interview traps:**
- Off-by-one: prefix[0] = 0, so prefix has n+1 elements. Range [l, r] inclusive = prefix[r+1] - prefix[l].
- For "subarray sum = K" with negative numbers, you MUST use prefix sum + HashMap. Sliding window fails because shrinking doesn't reliably decrease the sum.
- "2D version": the inclusion-exclusion formula catches candidates off guard — practice deriving it from the fence-post analogy applied to a rectangle.
- "What if array gets updated?" — Mention Fenwick Tree / Segment Tree for dynamic prefix sums.

---

### Pattern 8: Prefix XOR

**When to use:**
- XOR of subarrays
- "Find subarray with XOR equal to K"
- Keywords: "XOR," "subarray XOR"

**When NOT to use:**
- Operation is addition — use prefix sum
- Dynamic updates needed — XOR prefix doesn't support this easily

**Core idea:**

Same fence-post idea as prefix sum, but XOR is its own inverse (a XOR a = 0), so "subtraction" is also XOR.

1. Build: prefixXOR[0] = 0; prefixXOR[i] = prefixXOR[i-1] XOR arr[i-1]
2. Range XOR of [l, r] = prefixXOR[r+1] XOR prefixXOR[l]
3. For "count subarrays with XOR = K": use HashMap on prefixXOR values (identical pattern to subarray sum = K)

**Complexity:** Time O(n) build, O(1) per query. Space O(n).

**Variants:**
- Count subarrays with XOR = K: HashMap of prefix XOR values
- Maximum XOR subarray: combine with Trie for bit-by-bit greedy (Advanced Awareness)

**Interview traps:**
- Forgetting that XOR is its own inverse — no need for "subtraction," just XOR again.
- "Maximum XOR subarray" needs a Trie, not just prefix XOR. Don't conflate.

---

### Pattern 9: Kadane's Algorithm

**When to use:**
- "Maximum subarray sum" — the classic application
- Any problem reducible to "best contiguous segment"
- Keywords: "maximum subarray," "largest sum contiguous," "best time to buy and sell stock (one transaction)"

**When NOT to use:**
- You need the actual subarray (not just sum) — track indices additionally
- Circular array — need the circular variant
- Constraints on subarray length (e.g., length >= K) — need modified approach
- Subsequences (non-contiguous) — Kadane's only works for contiguous subarrays

**Brute force → observation → optimized:**

Brute force: Try all (l, r) pairs, compute sum. O(n²) or O(n³).

Observation: When you're building up a subarray element by element, if the running sum becomes negative, it can only hurt whatever comes next. Better to start a fresh subarray at the current position.

Optimized (O(n)): At each element, decide: extend the current subarray (current_sum + arr[i]) or start fresh (arr[i]). Take the max.

**Algorithm:**
1. current_sum = arr[0], global_max = arr[0]
2. For each element from index 1:
   - current_sum = max(arr[i], current_sum + arr[i])
   - global_max = max(global_max, current_sum)
3. Return global_max

**Why does this work?** Kadane's is a DP where dp[i] = max sum subarray ending at index i. The recurrence is dp[i] = max(arr[i], dp[i-1] + arr[i]). Since dp[i] only depends on dp[i-1], we don't need the array — just one variable.

**Complexity:** Time O(n), Space O(1)

**Variants:**
- Maximum Subarray Sum — Circular Array: max(standard_kadane, total_sum - min_subarray_sum). The circular case wraps around: the max wrapping subarray = total minus the min non-wrapping subarray. Edge case: if all elements negative, use standard result.
- Maximum Product Subarray: track both current_max and current_min because negative × negative = positive. new_max = max(arr[i], current_max * arr[i], current_min * arr[i]).
- Maximum Sum of Two Non-Overlapping Subarrays: run Kadane's from left and right, combine.
- Best Time to Buy and Sell Stock (one transaction): transform to max subarray of daily price differences.
- Max Subarray with at Least K Elements: use prefix sum + sliding window min.

**Interview traps:**
- Circular variant: many know standard Kadane's but freeze on circular. Key: max_circular = total - min_subarray. Handle all-negative edge case.
- Maximum product: MUST track both max and min at each step because of negatives.
- Finding the actual subarray: track start_index and end_index, reset start_index when starting fresh.
- 2D max subarray (max sum rectangle): fix two rows, compute column sums, apply 1D Kadane's. O(n²m) for n×m matrix.

---

### Pattern 10: Boyer-Moore Voting Algorithm

**When to use:**
- Finding element appearing more than n/2 times
- Finding elements appearing more than n/3 times (extended)
- Keywords: "majority element," "more than half," "most frequent element"

**When NOT to use:**
- Majority element is not guaranteed to exist — do a second pass to verify
- You need element appearing exactly K times — use HashMap frequency counting
- You need all frequencies — HashMap

**Core idea:**

Maintain a candidate and a count. Each element either reinforces the candidate (+1) or cancels one supporter (-1). When count hits zero, the next element becomes the new candidate. A true majority (> n/2) has more occurrences than all other elements combined — it can never be fully eliminated.

**Algorithm:**
1. candidate = arr[0], count = 1
2. For each subsequent element:
   - If count == 0: candidate = current, count = 1
   - Else if current == candidate: count++
   - Else: count--
3. Candidate is the majority element (verify with a second pass if not guaranteed)

**Complexity:** Time O(n) (or 2n with verification), Space O(1)

**Variants:**
- Majority Element (> n/2): standard Boyer-Moore, one candidate
- Elements appearing > n/3 times: at most 2 such elements — use two candidates and two counts, then a verification pass
- Elements appearing > n/k times: at most k-1 candidates — generalized Boyer-Moore

**Interview traps:**
- Assuming the majority always exists. Boyer-Moore returns a candidate regardless — it might be wrong. Always ask: "Is a majority element guaranteed?"
- "More than n/3 times" variant is a tricky implementation. Two candidates with careful bookkeeping.

---

### Pattern 11: In-Place Array Manipulation

**When to use:**
- Space constraint is O(1)
- Array values are in a known range (often [1, n] or [0, n-1])
- Keywords: "O(1) extra space," "in-place," "find duplicate," "find missing," "first missing positive"

**When NOT to use:**
- Values have no exploitable range
- Modifying the input is not allowed
- A cleaner O(n) space solution is acceptable and simpler

**Common tricks:**

*Negation marking:* For values in [1, n], visit arr[abs(arr[i]) - 1] and negate it. Positive positions at the end = unvisited indices (i.e., the missing numbers are (index+1)).

*Modular encoding:* Store two pieces of info in one cell: new_val = original + new * n. Extract original: val % n. Extract new: val / n.

*Cyclic placement:* Place each element at its "correct" position (arr[i] should be i+1 for values 1..n). Swap until done. Used in Cyclic Sort.

**Complexity:** Time O(n), Space O(1)

**Variants:**
- Find All Duplicates: negate at index arr[i]-1; if already negative, it's a duplicate
- Find All Missing Numbers: after negation marking, positive positions are missing
- First Missing Positive: cyclic placement (or negation) for range [1, n]
- Set Matrix Zeroes: use first row/column as markers instead of extra space

**Interview traps:**
- Forgetting to use absolute value when reading negated cells: always use abs(arr[i]) as the index.
- "First Missing Positive" is one of the hardest array problems — you must first ignore non-positive and out-of-range values, then apply cyclic placement only on valid elements.
- "What if modifying input is not allowed?" — switch to hashing or bit manipulation.

---

### Pattern 12: Matrix Traversal Patterns

**When to use:**
- "Print matrix in spiral order," "traverse diagonals," "rotate matrix 90 degrees"
- Keywords: "spiral," "diagonal," "rotate," "layer," "zigzag"

**When NOT to use:**
- Graph traversal on a grid (BFS/DFS) — that's a graph problem
- Matrix DP problems — see DP section

**Spiral:** Maintain four boundaries (top, bottom, left, right). Walk right across top, down right column, left across bottom, up left column. Shrink boundaries after each direction. Repeat.

```
top=0, bottom=3, left=0, right=3

→ → → →
        ↓
← ← ← ↓
↑       ↓
↑ ← ← ←
```

**90-degree Rotation (clockwise):** Transpose the matrix (swap arr[i][j] with arr[j][i]), then reverse each row.

**Diagonal:** For diagonal d where row + col = d, iterate cells (i, d-i) for valid i.

**Complexity:** Time O(m × n) — visit each cell once. Space O(1) extra.

**Variants:**
- Spiral Matrix: return elements in spiral order
- Spiral Matrix II: fill n×n matrix with 1 to n² in spiral order
- Rotate Image: 90-degree clockwise rotation in place
- Diagonal Traverse: zigzag along diagonals

**Interview traps:**
- Off-by-one on spiral boundaries — always test with a 4×4 and a 3×3 matrix.
- "Rotate in place" — interviewer tests whether you know transpose + reverse.
- Non-square matrices: spiral works; rotation is only defined for square (otherwise it's a transpose).

---

### Pattern 13: Rotate Array / Reverse Trick

**When to use:**
- "Rotate array by K positions"
- Any cyclic shift of a block of elements
- Keywords: "rotate," "circular shift"

**When NOT to use:**
- Dynamic rotation at each step — precompute modular indices instead
- Array is a linked list — just re-link pointers

**Brute force → observation → optimized:**

Brute force: Shift elements one position at a time, K times. O(n*K).

Observation: Rotating right by K = moving last K elements to the front. [A | B] → [B | A]. We need to reverse both parts and then reverse the whole, or vice versa.

Optimized (O(n), O(1) space): Triple reverse.

**Algorithm (rotate right by K):**
1. K = K % n (K > n reduces to K mod n)
2. Reverse entire array [0, n-1]
3. Reverse first K elements [0, K-1]
4. Reverse remaining [K, n-1]

**Why does this work?**  
[A | B] → reverse all → [B^R | A^R] → reverse first K → [B | A^R] → reverse rest → [B | A]

**Complexity:** Time O(n), Space O(1)

**Variants:**
- Rotate Left by K: reverse first K, reverse last n-K, reverse all
- Rotate String: check if s2 is a rotation of s1 by checking if s2 is a substring of s1+s1

**Interview traps:**
- Forgetting K = K % n. If K > n, rotating more than a full cycle is redundant.
- "How to check if two arrays are rotations of each other?" — concatenate one with itself and check if the other is a subarray.

---

## [35–45 min] Concrete Code + Dry Run

Four representative problems, each with Java + JavaScript code and a step-by-step dry run table.

---

### Example 1: Two Sum II — Two Pointers Opposite Direction

**Problem:** Given sorted array `numbers`, find indices of two numbers that add to `target`. (1-indexed output)

**Input:** numbers = [2, 7, 11, 15], target = 9  
**Expected output:** [1, 2] (numbers[0] + numbers[1] = 2 + 7 = 9)

**Java:**
```java
public int[] twoSum(int[] numbers, int target) {
    int left = 0;
    int right = numbers.length - 1;
    while (left < right) {
        int sum = numbers[left] + numbers[right];
        if (sum == target) {
            return new int[]{left + 1, right + 1};
        } else if (sum < target) {
            left++;
        } else {
            right--;
        }
    }
    return new int[]{-1, -1};
}
```

**JavaScript:**
```javascript
function twoSum(numbers, target) {
    let left = 0;
    let right = numbers.length - 1;
    while (left < right) {
        const sum = numbers[left] + numbers[right];
        if (sum === target) return [left + 1, right + 1];
        if (sum < target) left++;
        else right--;
    }
    return [-1, -1];
}
```

**Dry run:** numbers = [2, 7, 11, 15], target = 9

| Step | left | right | numbers[left] | numbers[right] | sum | Action |
|---|---|---|---|---|---|---|
| 1 | 0 | 3 | 2 | 15 | 17 | sum > 9, right-- |
| 2 | 0 | 2 | 2 | 11 | 13 | sum > 9, right-- |
| 3 | 0 | 1 | 2 | 7 | 9 | sum == 9, return [1, 2] |

**Complexity:** Time O(n), Space O(1). Each pointer moves at most n times.

---

### Example 2: Longest Substring Without Repeating Characters — Variable Sliding Window

**Problem:** Given string s, find the length of the longest substring without repeating characters.

**Input:** s = "abcabcbb"  
**Expected output:** 3 (the substring "abc")

**Java:**
```java
public int lengthOfLongestSubstring(String s) {
    Set<Character> windowChars = new HashSet<>();
    int left = 0;
    int best = 0;
    for (int right = 0; right < s.length(); right++) {
        while (windowChars.contains(s.charAt(right))) {
            windowChars.remove(s.charAt(left));
            left++;
        }
        windowChars.add(s.charAt(right));
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```

**JavaScript:**
```javascript
function lengthOfLongestSubstring(s) {
    const windowChars = new Set();
    let left = 0;
    let best = 0;
    for (let right = 0; right < s.length; right++) {
        while (windowChars.has(s[right])) {
            windowChars.delete(s[left]);
            left++;
        }
        windowChars.add(s[right]);
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```

**Dry run:** s = "abcabcbb"

| right | char | action | window | left | best |
|---|---|---|---|---|---|
| 0 | 'a' | add | {a} | 0 | 1 |
| 1 | 'b' | add | {a,b} | 0 | 2 |
| 2 | 'c' | add | {a,b,c} | 0 | 3 |
| 3 | 'a' | 'a' in set → remove 'a', left=1; add 'a' | {b,c,a} | 1 | 3 |
| 4 | 'b' | 'b' in set → remove 'b', left=2; add 'b' | {c,a,b} | 2 | 3 |
| 5 | 'c' | 'c' in set → remove 'c', left=3; add 'c' | {a,b,c} | 3 | 3 |
| 6 | 'b' | 'b' in set → remove 'a', left=4; 'b' still in set → remove 'b', left=5; add 'b' | {c,b} | 5 | 3 |
| 7 | 'b' | 'b' in set → remove 'c', left=6; 'b' still in set → remove 'b', left=7; add 'b' | {b} | 7 | 3 |

**Result:** 3

**Complexity:** Time O(n) — left and right each move at most n times total. Space O(min(n, alphabet_size)).

---

### Example 3: Subarray Sum Equals K — Prefix Sum + HashMap

**Problem:** Given integer array nums and integer k, return the number of subarrays whose sum equals k.

**Input:** nums = [1, 1, 1], k = 2  
**Expected output:** 2 (subarrays [1,1] appear twice: indices 0-1 and 1-2)

**Java:**
```java
public int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> prefixCounts = new HashMap<>();
    prefixCounts.put(0, 1);
    int prefixSum = 0;
    int count = 0;
    for (int num : nums) {
        prefixSum += num;
        count += prefixCounts.getOrDefault(prefixSum - k, 0);
        prefixCounts.put(prefixSum, prefixCounts.getOrDefault(prefixSum, 0) + 1);
    }
    return count;
}
```

**JavaScript:**
```javascript
function subarraySum(nums, k) {
    const prefixCounts = new Map([[0, 1]]);
    let prefixSum = 0;
    let count = 0;
    for (const num of nums) {
        prefixSum += num;
        count += prefixCounts.get(prefixSum - k) ?? 0;
        prefixCounts.set(prefixSum, (prefixCounts.get(prefixSum) ?? 0) + 1);
    }
    return count;
}
```

**Dry run:** nums = [1, 1, 1], k = 2

| index | num | prefixSum | prefixSum - k | map.get(prefixSum-k) | count | map after |
|---|---|---|---|---|---|---|
| init | — | 0 | — | — | 0 | {0:1} |
| 0 | 1 | 1 | -1 | 0 (not found) | 0 | {0:1, 1:1} |
| 1 | 1 | 2 | 0 | 1 | 1 | {0:1, 1:1, 2:1} |
| 2 | 1 | 3 | 1 | 1 | 2 | {0:1, 1:1, 2:1, 3:1} |

**Result:** 2

**Why `map.put(0, 1)` at the start?** This handles the case where a prefix sum from the beginning equals k. The "empty prefix" has sum 0 and needs to be counted as a valid starting point.

**Complexity:** Time O(n), Space O(n) for the prefix sum map.

---

### Example 4: Maximum Subarray — Kadane's Algorithm

**Problem:** Find the contiguous subarray with the largest sum and return its sum.

**Input:** nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]  
**Expected output:** 6 (subarray [4, -1, 2, 1])

**Java:**
```java
public int maxSubArray(int[] nums) {
    int currentSum = nums[0];
    int globalMax = nums[0];
    for (int i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        globalMax = Math.max(globalMax, currentSum);
    }
    return globalMax;
}
```

**JavaScript:**
```javascript
function maxSubArray(nums) {
    let currentSum = nums[0];
    let globalMax = nums[0];
    for (let i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        globalMax = Math.max(globalMax, currentSum);
    }
    return globalMax;
}
```

**Dry run:** nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]

| i | nums[i] | currentSum + nums[i] | currentSum (max of two) | globalMax |
|---|---|---|---|---|
| 0 | -2 | — (init) | -2 | -2 |
| 1 | 1 | -2 + 1 = -1 | max(1, -1) = 1 | 1 |
| 2 | -3 | 1 + (-3) = -2 | max(-3, -2) = -2 | 1 |
| 3 | 4 | -2 + 4 = 2 | max(4, 2) = 4 | 4 |
| 4 | -1 | 4 + (-1) = 3 | max(-1, 3) = 3 | 4 |
| 5 | 2 | 3 + 2 = 5 | max(2, 5) = 5 | 5 |
| 6 | 1 | 5 + 1 = 6 | max(1, 6) = 6 | 6 |
| 7 | -5 | 6 + (-5) = 1 | max(-5, 1) = 1 | 6 |
| 8 | 4 | 1 + 4 = 5 | max(4, 5) = 5 | 6 |

**Result:** 6

**Complexity:** Time O(n) — single pass. Space O(1) — two variables.

---

## [45–55 min] Pattern Recognition

### How to decide which pattern to use in a new problem

Don't memorize by keyword. Ask these questions in order:

**Step 1: What is the structure of what you're looking for?**
- A single pair of elements → Two Pointers (Opposite if sorted, Same-direction if filtering)
- A contiguous range (subarray/substring) → Sliding Window or Prefix Sum
- A single element with a property → Kadane's, Boyer-Moore, or simple scan
- Partitioning the array → Two/Three Pointers or Dutch National Flag
- Grid/matrix problem → Matrix Traversal

**Step 2: Is there a constraint on the window/range?**
- Fixed size K → Fixed Sliding Window
- Variable size under a monotonic condition (sum ≤ K, all unique, at most K distinct) → Variable Sliding Window
- Exact sum/count, possibly with negatives → Prefix Sum + HashMap

**Step 3: Is the array sorted? Can I sort it?**
- Sorted + pair search → Two Pointers Opposite
- Sorting would lose original indices → HashMap approach
- Three categories to partition → Dutch National Flag (no sort needed, one pass)

**Step 4: Space constraints?**
- O(1) space required → Two Pointers, Kadane's, Boyer-Moore, In-Place Manipulation, Rotate Trick
- O(n) space acceptable → Prefix Sum, Sliding Window + HashMap

### Structural clues and what they suggest

| You see this in the problem | Think this |
|---|---|
| Sorted array, find a pair | Two Pointers Opposite |
| "In-place," "O(1) space," "remove elements" | Two Pointers Same Direction |
| "Exactly three values / sort 0s 1s 2s" | Dutch National Flag |
| "Subarray of exactly size K" | Fixed Sliding Window |
| "Longest/shortest subarray/substring where [monotonic condition]" | Variable Sliding Window |
| "Minimum window," "anagram," "permutation in string" | Sliding Window + HashMap |
| "Subarray sum equals K," "count subarrays with sum" | Prefix Sum + HashMap |
| "Maximum subarray sum" | Kadane's |
| "Majority element," "more than half" | Boyer-Moore |
| "Spiral," "rotate matrix," "diagonal" | Matrix Traversal |
| "Rotate array by K" | Triple Reverse |
| "Find missing / duplicate," "O(1) space," values in [1,n] | In-Place Manipulation (Negation/Cyclic) |

### How to distinguish similar patterns

**Two Pointers Opposite vs. Sliding Window:**
- Two Pointers Opposite: fixed endpoints, move toward each other, problem about a PAIR of elements
- Sliding Window: continuous range of elements, expand/shrink based on a condition about the RANGE

**Sliding Window vs. Prefix Sum + HashMap:**
- Sliding Window: works when the condition is monotonic (if window [l, r] is invalid, [l, r+1] is also invalid)
- Prefix Sum + HashMap: needed when the condition is NOT monotonic (e.g., exact sum with negative numbers — expanding doesn't consistently make things worse)

**Kadane's vs. Prefix Sum for max subarray:**
- Both work. Kadane's is O(1) space and more elegant.
- Prefix Sum connection: max subarray sum = max over all j of (prefix[j] - min prefix[0..j-1])
- Kadane's implicitly maintains this "minimum prefix seen so far" as currentSum

**Boyer-Moore vs. HashMap:**
- Boyer-Moore: O(1) space, finds majority (> n/2). Cannot directly find frequency of all elements.
- HashMap: O(n) space, finds any element by frequency, works for all variants.

**Fixed Sliding Window vs. Prefix Sum for range sum:**
- Fixed window: O(n) for all windows of size K simultaneously
- Prefix Sum: O(1) per individual query after O(n) build — better when many arbitrary queries are needed

### What to ask yourself at the start of a problem

1. "Is it asking about a pair, a range, or a single element?"
2. "Is the array sorted? Does order matter?"
3. "Is the condition monotonic?" (If window is invalid, does adding more make it strictly worse?)
4. "Am I allowed to modify the array? Is there a space constraint?"
5. "Is 'subarray' here truly contiguous, or is it 'subsequence'?"

---

## [55–60 min] Final Mental Checklist

```
PATTERN: Two Pointers — Opposite Direction
WHAT IS IT?      Two indices from both ends moving toward each other
WHEN TO USE?     Sorted array, find a pair, palindrome check, partition
WHEN NOT TO?     Unsorted + need original indices; contiguous range problems
CORE IDEA?       Eliminate one candidate per step by moving the pointer that helps
WHAT DO I TRACK? left index, right index
INVARIANT?       arr[left..right] is the unprocessed search space
HOW TO RECOGNIZE? Sorted + pair condition, or "squeeze from both ends"
TRAPS?           Duplicates in 3Sum; unsorted array losing index info
CONFUSED WITH?   Sliding window (that's about a range, not a pair)
COMPLEXITY?      O(n) time, O(1) space


PATTERN: Two Pointers — Same Direction (Fast/Slow)
WHAT IS IT?      Fast reader, slow writer, both moving left to right
WHEN TO USE?     Filter/remove/compress elements in-place
WHEN NOT TO?     Pair search; window-based problems
CORE IDEA?       slow is the write head; write only when fast finds a keeper
WHAT DO I TRACK? slow (next write position), fast (current read position)
INVARIANT?       arr[0..slow-1] = processed result, arr[fast..] = unread
HOW TO RECOGNIZE? "Remove element," "move zeroes," "deduplicate"
TRAPS?           Swapping with end loses order; "at most K" needs generalization
CONFUSED WITH?   Sliding window (similar structure, different intent)
COMPLEXITY?      O(n) time, O(1) space


PATTERN: Sliding Window — Variable Size
WHAT IS IT?      Left + right pointers forming a window that expands and shrinks
WHEN TO USE?     Longest/shortest subarray under a monotonic condition
WHEN NOT TO?     Non-monotonic conditions (exact sum with negatives); subsequences
CORE IDEA?       Right expands greedily; left shrinks only when constraint violated
WHAT DO I TRACK? left, right, window state (sum, set, frequency map)
INVARIANT?       Window [left..right] always satisfies the constraint (after shrink)
HOW TO RECOGNIZE? "Longest/shortest ... such that ..." with a monotonic condition
TRAPS?           Exact sum + negatives → use prefix sum; off-by-one on window size
CONFUSED WITH?   Prefix sum + HashMap (use that when condition is non-monotonic)
COMPLEXITY?      O(n) time, O(1) or O(K) space


PATTERN: Prefix Sum
WHAT IS IT?      Pre-computed cumulative sum array enabling O(1) range queries
WHEN TO USE?     Multiple range sum queries; subarray sum = K (with HashMap)
WHEN NOT TO?     Dynamic updates (use Fenwick Tree); single query; min/max queries
CORE IDEA?       prefix[i] = total from start to i. Range = prefix[r+1] - prefix[l]
WHAT DO I TRACK? prefix array (or running sum + HashMap for count problems)
INVARIANT?       prefix[0] = 0, prefix[i] = prefix[i-1] + arr[i-1]
HOW TO RECOGNIZE? Range sum queries; "subarray sum equals K"
TRAPS?           Off-by-one (prefix has n+1 elements); sliding window for negatives
CONFUSED WITH?   Sliding window (use prefix sum when condition is non-monotonic)
COMPLEXITY?      O(n) build, O(1) query, O(n) space


PATTERN: Kadane's Algorithm
WHAT IS IT?      1D DP (space-optimized) for maximum sum contiguous subarray
WHEN TO USE?     Max subarray sum; max product; circular variant
WHEN NOT TO?     Subsequences; length constraints; need to find the actual subarray
CORE IDEA?       Extend or start fresh — a negative prefix only hurts future elements
WHAT DO I TRACK? currentSum (best ending here), globalMax (best seen so far)
INVARIANT?       currentSum = max sum subarray ending at current index
HOW TO RECOGNIZE? "Maximum subarray sum," "best contiguous segment"
TRAPS?           Circular variant (total - min subarray); product variant (track min too)
CONFUSED WITH?   Prefix sum (also works but O(n) space; Kadane's is O(1))
COMPLEXITY?      O(n) time, O(1) space


PATTERN: Dutch National Flag / Three Pointers
WHAT IS IT?      Partition array into three regions in a single pass
WHEN TO USE?     Three distinct values/categories, in-place
WHEN NOT TO?     More than three categories; stability required
CORE IDEA?       low/mid/high boundaries; DO NOT advance mid after swapping with high
WHAT DO I TRACK? low, mid, high pointers
INVARIANT?       [0,low)=cat1, [low,mid)=cat2, (high,n-1]=cat3, [mid,high]=unknown
HOW TO RECOGNIZE? "Sort colors," "0s 1s 2s," "three-way partition"
TRAPS?           Advancing mid after swap with high (that element is uninspected)
CONFUSED WITH?   Two-pointer partition (that's only two categories)
COMPLEXITY?      O(n) time, O(1) space


PATTERN: Boyer-Moore Voting
WHAT IS IT?      Find majority element (> n/2) using O(1) space
WHEN TO USE?     Guaranteed majority exists; or verify after
WHEN NOT TO?     No guaranteed majority; need all frequencies; exact counts
CORE IDEA?       Supporters cancel opposition; true majority survives all cancellations
WHAT DO I TRACK? candidate, count
INVARIANT?       candidate is the majority among elements seen if majority exists
HOW TO RECOGNIZE? "Majority element," "more than n/2 times"
TRAPS?           Majority not guaranteed — always verify with second pass
CONFUSED WITH?   HashMap frequency counting (use that for all frequencies)
COMPLEXITY?      O(n) time, O(1) space
```

---

## Advanced Awareness

These topics are related to this module but require deeper treatment than fits here:

- **Monotonic Deque:** Max/min in each sliding window of size K in O(n). See Stacks & Queues module.
- **Fenwick Tree / Segment Tree:** Dynamic prefix sums with updates. See Advanced Data Structures module.
- **Prefix XOR + Trie:** Maximum XOR subarray. See Tries module.
- **Cyclic Sort:** Systematic O(n) sorting when values are 1..n. See Sorting module.
- **2D Max Subarray (Max Sum Rectangle):** Fix two rows, apply column-sum Kadane's. O(n²m) for n×m.
- **Generalized Boyer-Moore (> n/k):** At most k-1 candidates. See Hashing module.
- **Difference Array:** Range updates in O(1). The inverse of prefix sum. Reconstruct with prefix sum.

---

## Active Recall

Test yourself before moving on. If you can't answer these from memory, re-read that section.

1. Why does a variable sliding window run in O(n) even though there's an inner while loop? Where does the amortization come from?

2. You have a sorted array and want to find all pairs with sum = target (not just one pair). How do you extend the basic two-pointer approach to handle duplicates?

3. In the Dutch National Flag algorithm, you swap arr[mid] with arr[high] and then do NOT advance mid. Why? What would go wrong if you did advance mid?

4. The "subarray sum equals K" problem cannot be solved with a sliding window when the array has negative numbers. Explain specifically why the shrink step breaks down, and what technique you use instead.

5. Kadane's recurrence is: current = max(arr[i], current + arr[i]). Translate this into a plain English sentence about the decision you are making at each step.

6. What is the difference between a subarray and a subsequence? Give an example of a problem that looks like one but is actually the other.

7. You want to rotate an array right by K positions in O(n) time and O(1) space. Describe the three-reverse steps and explain WHY they produce the correct rotation (don't just state the steps).

8. Boyer-Moore returns a candidate even when no majority element exists. How do you handle this in code?

9. For the prefix sum formula, why is prefix defined with n+1 elements (prefix[0] = 0)? What problem does this solve?

10. When should you use prefix sum + HashMap vs. sliding window for counting subarrays with a given sum property? What specific condition determines the choice?

---

## Recommended Practice Direction

Work problems in this order to build intuition progressively:

**Foundation (do these first):**
- Two Sum II (LeetCode 167) — opposite-direction two pointers on sorted array
- Remove Duplicates from Sorted Array (LeetCode 26) — same-direction two pointers
- Maximum Average Subarray I (LeetCode 643) — fixed sliding window
- Running Sum of 1D Array (LeetCode 1480) — prefix sum basics

**Core patterns (cement understanding):**
- Longest Substring Without Repeating Characters (LeetCode 3) — variable sliding window
- Minimum Size Subarray Sum (LeetCode 209) — variable sliding window
- Subarray Sum Equals K (LeetCode 560) — prefix sum + HashMap
- Maximum Subarray (LeetCode 53) — Kadane's

**Harder applications (push your understanding):**
- Minimum Window Substring (LeetCode 76) — sliding window + HashMap
- Sort Colors (LeetCode 75) — Dutch National Flag
- Majority Element (LeetCode 169) — Boyer-Moore
- Find All Duplicates in an Array (LeetCode 442) — in-place negation marking
- Rotate Image (LeetCode 48) — matrix rotation (transpose + reverse)
- Maximum Product Subarray (LeetCode 152) — Kadane's variant (track min too)
- Container With Most Water (LeetCode 11) — greedy two pointers
- Spiral Matrix (LeetCode 54) — matrix traversal

**Google-style stretch problems:**
- Sliding Window Maximum (LeetCode 239) — requires monotonic deque
- Minimum Window Substring (LeetCode 76) — full HashMap sliding window
- Subarray Sum Divisible by K (LeetCode 974) — prefix sum mod + HashMap
- Maximum Sum Circular Subarray (LeetCode 918) — Kadane's circular variant
- Find All Numbers Disappeared in an Array (LeetCode 448) — in-place manipulation

---

## 2-Minute Cheat Sheet

```
ARRAYS & STRINGS — QUICK REFERENCE

Two Pointers (Opposite)    Sorted array + pair condition
  left=0, right=n-1        O(n) time, O(1) space
  Move smaller toward larger; stop when left>=right

Two Pointers (Same Dir)    Filter/compress in-place
  slow=writer, fast=reader  O(n) time, O(1) space
  Write arr[slow++] when fast finds a keeper

Sliding Window (Fixed K)   Every subarray of size K
  running aggregate         O(n) time, O(1) space
  add incoming, subtract outgoing

Sliding Window (Variable)  Longest/shortest under monotonic condition
  expand right always       O(n) time, O(1) or O(K) space
  shrink left when invalid
  -- NOT for exact sum with negatives --

Prefix Sum                 Range sum queries; subarray sum = K
  prefix[0]=0, prefix[i]=prefix[i-1]+arr[i-1]   O(n) build, O(1) query
  range[l,r] = prefix[r+1] - prefix[l]
  + HashMap for "subarray sum = K": count += map[prefixSum - K]

Kadane's Algorithm         Max subarray sum
  current = max(arr[i], current+arr[i])          O(n) time, O(1) space
  globalMax = max(globalMax, current)
  -- Circular: max(kadane, total - minSubarray) --

Dutch National Flag        Partition 3 categories
  low=0, mid=0, high=n-1   O(n) time, O(1) space
  DO NOT advance mid after swap with high

Boyer-Moore                Majority element (>n/2)
  candidate + count        O(n) time, O(1) space
  count==0 → new candidate; always verify if majority not guaranteed

In-Place Manipulation      Find missing/duplicate, O(1) space
  Negation: arr[abs(arr[i])-1] *= -1             O(n) time, O(1) space
  Cyclic: swap until arr[i] == i+1

Rotate Array               Rotate right by K
  reverse all, reverse [0,K-1], reverse [K,n-1]  O(n) time, O(1) space
  K = K % n first!

KEY DECISIONS:
  Sorted + pair → Two Pointers Opposite
  Remove/filter in-place → Two Pointers Same Dir
  Window with monotonic condition → Sliding Window
  Exact sum (negatives possible) → Prefix Sum + HashMap
  Max contiguous sum → Kadane's
  Three categories in-place → Dutch National Flag
  Majority in O(1) space → Boyer-Moore
  Subarray vs Subsequence → determines which technique family
```

---

*Next: [03-SEARCHING-TECHNIQUES.md](03-SEARCHING-TECHNIQUES.md) — Master Binary Search and its hidden power.*
