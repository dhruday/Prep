# Searching Techniques — Complete Pattern Guide

> *"Binary search is not just an algorithm — it is a way of thinking. Any time you can discard half the possibilities in one step, binary search is hiding in the problem."*

---

## Table of Contents

1. [Binary Search — Classic](#binary-search--classic)
2. [Binary Search — Lower Bound / Upper Bound](#binary-search--lower-bound--upper-bound)
3. [Binary Search on Rotated Sorted Array](#binary-search-on-rotated-sorted-array)
4. [Binary Search on Answer (Parametric Search)](#binary-search-on-answer-parametric-search)
5. [Search in 2D Matrix](#search-in-2d-matrix)
6. [Exponential Search](#exponential-search)
7. [Ternary Search](#ternary-search)
8. [Median of Two Sorted Arrays Pattern](#median-of-two-sorted-arrays-pattern)

---

## Binary Search — Classic

### What is this approach?

**Intuition:** You are playing a number guessing game. Someone picks a number between 1 and 100. Each time you guess, they say "higher" or "lower." The smartest strategy? Always guess the middle. Each guess eliminates half the possibilities.

**Formal:** Given a sorted array, repeatedly divide the search space in half by comparing the target with the middle element. If target equals mid, found. If target < mid, search left half. If target > mid, search right half. Continue until the space is empty.

### When should I use this?

- The data is **sorted** or has a **monotonic property**
- You need to find a specific element in O(log n) time
- Keywords: "sorted array," "find target," "search," "log n"

### When should I NOT use this?

- The data is **unsorted** and cannot be sorted without losing needed information
- You need to find **all** occurrences (binary search finds one; then expand or use lower/upper bound)
- The search space doesn't have a monotonic property — no way to decide which half to discard

### Core Idea

1. Set `low = 0`, `high = n - 1`
2. While `low <= high`:
   - `mid = low + (high - low) / 2` (avoid overflow!)
   - If `arr[mid] == target`, return mid
   - If `arr[mid] < target`, set `low = mid + 1`
   - If `arr[mid] > target`, set `high = mid - 1`
3. If loop ends, target not found

**Mental model:** You have a sorted bookshelf. You open to the middle. The book title tells you whether to look left or right. Each step halves the shelf.

### Complexity

- **Time:** O(log n) — search space halves each iteration, so you need at most log₂(n) iterations
- **Space:** O(1) iterative, O(log n) recursive (call stack)

**Why O(log n)?** Starting with n elements, after k steps you have n/2^k elements left. When n/2^k = 1, k = log₂(n).

### Variants

- **Iterative vs Recursive:** Iterative is preferred (no stack overhead). Recursive is clearer for teaching.
- **Find first/last occurrence:** See Lower Bound / Upper Bound below.
- **Search in infinite array:** See Exponential Search below.

### Related Patterns

- [Lower Bound / Upper Bound](#binary-search--lower-bound--upper-bound) (the real interview version)
- [Binary Search on Answer](#binary-search-on-answer-parametric-search) (search on the answer space)
- [Binary Search on Rotated Array](#binary-search-on-rotated-sorted-array) (when sorted property is partially broken)

### Interview Insights

- **Trap:** Integer overflow with `mid = (low + high) / 2`. Use `mid = low + (high - low) / 2`.
- **Trap:** Infinite loops from incorrect boundary updates. Remember: `low = mid + 1` and `high = mid - 1` (not `high = mid` in the standard version).
- **Twist:** Most binary search interview problems are NOT "find exact target." They are boundary-finding problems (see next section).
- **Follow-up:** "What if there are duplicates?" → Standard binary search finds any one. You need lower/upper bound for first/last occurrence.

---

## Binary Search — Lower Bound / Upper Bound

### What is this approach?

**Intuition:** Instead of asking "where IS the target?" you ask "where WOULD the target go if I inserted it?" Lower bound finds the first position where you could insert the target without breaking sort order. Upper bound finds the last such position.

**Formal:**
- **Lower Bound (bisect_left):** Find the smallest index i such that arr[i] >= target. This is the insertion point from the left.
- **Upper Bound (bisect_right):** Find the smallest index i such that arr[i] > target. This is the insertion point from the right.

### When should I use this?

- Find the **first occurrence** of a value (lower bound)
- Find the **last occurrence** of a value (upper bound - 1)
- Count occurrences of a value (upper bound - lower bound)
- Find the **first element ≥ target** or **first element > target**
- "How many elements are less than X?"
- Keywords: "first position," "last position," "count," "range," "insertion point"

### When should I NOT use this?

- You need the exact position and don't care about boundaries — classic binary search is simpler
- The array is not sorted

### Core Idea

**Lower Bound:**
1. `low = 0`, `high = n` (note: high = n, not n-1, because the insertion point can be past the end)
2. While `low < high` (note: strict less-than, not ≤):
   - `mid = low + (high - low) / 2`
   - If `arr[mid] < target`, `low = mid + 1`
   - Else, `high = mid` (not mid - 1! We might want mid itself)
3. Return low (= high)

**Upper Bound:**
1. Same structure, but change the condition:
   - If `arr[mid] <= target`, `low = mid + 1`
   - Else, `high = mid`

**Mental model:** Lower bound asks "what is the leftmost position where target could live?" Upper bound asks "what is the rightmost position + 1 where target could live?"

**The key difference from classic binary search:**
- Classic: `low <= high`, low and high can cross → finds exact match or reports not found
- Bound-finding: `low < high`, they converge to the same point → always returns a valid insertion point

### Complexity

- **Time:** O(log n)
- **Space:** O(1)

### Variants

- **First occurrence of target:** lower_bound(target). Check if arr[result] == target.
- **Last occurrence of target:** upper_bound(target) - 1. Check if that position has the target.
- **Count of target:** upper_bound(target) - lower_bound(target)
- **First element greater than X:** upper_bound(X)
- **Last element less than X:** lower_bound(X) - 1
- **Ceiling (smallest element ≥ X):** lower_bound(X)
- **Floor (largest element ≤ X):** upper_bound(X) - 1

### Related Patterns

- [Binary Search — Classic](#binary-search--classic) (simpler but less versatile)
- [Binary Search on Answer](#binary-search-on-answer-parametric-search) (uses the same convergence pattern)

### Interview Insights

- **Trap:** Off-by-one errors in boundary updates. The #1 cause of binary search bugs. Practice: `high = mid` (not mid-1) and `low = mid + 1` for lower bound. The asymmetry is intentional.
- **Trap:** Forgetting to check whether the result actually contains the target (lower bound always returns a valid index, even if target doesn't exist).
- **Twist:** "Find the first bad version" — This IS lower bound. The predicate changes from "arr[mid] < target" to "not isBad(mid)."
- **Key insight:** Almost every binary search interview problem is secretly a lower/upper bound problem with a custom predicate. Master this, and you've mastered binary search.

---

## Binary Search on Rotated Sorted Array

### What is this approach?

**Intuition:** A sorted array that has been rotated is like a clock whose numbers got shifted. It's still "sorted" but in two segments. At any midpoint, at least one half is guaranteed to be properly sorted — you can exploit that to decide which half the target lives in.

**Formal:** A sorted array is rotated at some pivot unknown to you. Despite the rotation, binary search still works because at any index, one of the two halves [low, mid] or [mid, high] is sorted. Check which half is sorted, then determine if the target falls in that sorted half.

### When should I use this?

- The problem explicitly says "rotated sorted array"
- You need to search in a "almost sorted" array where one rotation happened
- Finding the minimum in a rotated sorted array
- Keywords: "rotated sorted," "shifted," "circularly sorted"

### When should I NOT use this?

- The array is not rotated (use normal binary search)
- There are many duplicates — worst case degrades to O(n) because you can't determine which half is sorted

### Core Idea

**Search for target:**
1. `low = 0`, `high = n - 1`
2. Calculate `mid`
3. If `arr[mid] == target`, found
4. Determine which half is sorted:
   - If `arr[low] <= arr[mid]` → left half is sorted
     - If `arr[low] <= target < arr[mid]` → target in left half → `high = mid - 1`
     - Else → target in right half → `low = mid + 1`
   - Else → right half is sorted
     - If `arr[mid] < target <= arr[high]` → target in right half → `low = mid + 1`
     - Else → target in left half → `high = mid - 1`

**Find minimum (rotation point):**
1. If `arr[low] < arr[high]` → array not rotated, minimum is arr[low]
2. Calculate `mid`
3. If `arr[mid] > arr[high]` → minimum is in [mid+1, high]
4. Else → minimum is in [low, mid]

**Mental model:** At every step, one half of the array looks normal (sorted). Check if your target could possibly be in that normal half. If yes, go there. If no, it must be in the weird (rotated) half.

### Complexity

- **Time:** O(log n) without duplicates; O(n) worst case with duplicates
- **Space:** O(1)

**Why O(n) with duplicates?** When arr[low] == arr[mid] == arr[high], you can't determine which half is sorted. You can only shrink by one element: low++ or high--.

### Variants

- **Search target in rotated array (no duplicates):** Standard approach above
- **Search target in rotated array (with duplicates):** Same, but when arr[low] == arr[mid] == arr[high], do low++, high--
- **Find minimum in rotated array (no duplicates):** Compare mid with high
- **Find minimum in rotated array (with duplicates):** When arr[mid] == arr[high], do high--
- **Find rotation count:** Index of minimum element = rotation count

### Related Patterns

- [Binary Search — Classic](#binary-search--classic) (base technique)
- [Binary Search on Answer](#binary-search-on-answer-parametric-search) (another "modified predicate" search)

### Interview Insights

- **Trap:** The duplicate case. If all elements are the same, you can't binary search at all. Always ask: "Can there be duplicates?"
- **Trap:** Confusing which comparisons to use. Draw a picture of the two sorted segments on paper every time.
- **Twist:** "Find the peak element in a mountain array" — Similar idea: at any point, you can determine if you're on the ascending or descending side.
- **Follow-up:** "Search in a rotated array that's also shifted by K" — Same algorithm; K is irrelevant because you don't need to know K.

---

## Binary Search on Answer (Parametric Search)

### What is this approach?

**Intuition:** Instead of searching for an element in an array, you are searching for THE ANSWER ITSELF in a range of possible answers. You ask: "Is answer = X feasible?" If yes, try smaller (or larger). If no, try the other direction. You are binary searching on the answer space, not the data.

**Formal:** When the answer lies in a continuous or discrete range [lo, hi], and there exists a monotonic feasibility function (if X works, then X+1 also works, or vice versa), binary search on the answer X. For each candidate X, run a feasibility check (often greedy) in O(n). Total: O(n log(range)).

### When should I use this?

- **"Minimize the maximum"** or **"Maximize the minimum"** — CLASSIC signal
- The answer is a **number in a range**, and you can **check feasibility** of any candidate
- The feasibility function is **monotonic** — there's a tipping point, and all values above (or below) it are feasible
- Keywords: "minimum capacity," "maximum distance," "split array," "allocate pages," "koko eating bananas," "minimum speed"

### When should I NOT use this?

- The feasibility function is NOT monotonic (feasibility can flip back and forth)
- You can compute the exact answer directly (e.g., math formula) — no need to search
- The answer space is exponentially large AND the feasibility check is expensive

### Core Idea

1. Identify the answer range: [lo, hi]. Often lo = minimum possible, hi = maximum possible.
2. Binary search on this range:
   - mid = lo + (hi - lo) / 2
   - Run feasibility check: "Can we achieve the goal with answer = mid?"
   - If feasible and we want the minimum feasible answer: hi = mid
   - If not feasible: lo = mid + 1
3. Return lo (the minimum feasible answer)

**The feasibility check** is usually a greedy O(n) scan. This is where domain-specific logic lives.

**Mental model:** Imagine a dial you can turn from 0 to 100. At some point on the dial, things start working. You binary search for that tipping point. The "does it work?" check is a separate function you design.

### Complexity

- **Time:** O(n × log(answer_range)) — binary search does log(range) iterations, each iteration runs an O(n) feasibility check
- **Space:** O(1) typically

**Why is this powerful?** It converts an optimization problem into a decision problem. "What is the minimum X such that..." becomes "Is X feasible?" which is often much easier to answer.

### Variants

- **Minimum capacity to ship packages in D days:** Binary search on capacity [max_weight, total_weight]. Feasibility: greedily assign packages to days without exceeding capacity. Count days needed.
- **Koko Eating Bananas:** Binary search on eating speed [1, max_pile]. Feasibility: compute total hours at that speed.
- **Split Array Largest Sum:** Binary search on the largest subarray sum [max_element, total_sum]. Feasibility: greedily split, counting groups.
- **Aggressive Cows (Maximize Minimum Distance):** Binary search on minimum distance [1, max_gap]. Feasibility: greedily place cows with at least that gap.
- **Painter's Partition:** Binary search on maximum time per painter.
- **Minimum Days to Make M Bouquets:** Binary search on days [1, max_bloom_day]. Feasibility: check if M adjacent bouquets can be formed by that day.

### Related Patterns

- [Binary Search — Lower Bound](#binary-search--lower-bound--upper-bound) (same convergence pattern, different domain)
- [Greedy Algorithms](13-GREEDY-ALGORITHMS.md) (the feasibility check is often greedy)
- [Prefix Sum](02-ARRAYS-AND-STRINGS.md#prefix-sum) (sometimes used inside the feasibility check)

### Interview Insights

- **Trap:** Not recognizing that a problem is binary search on answer. The keyword "minimize the maximum" or "maximize the minimum" should immediately trigger this pattern.
- **Trap:** Getting the binary search boundaries wrong. Think carefully: what is the smallest possible answer? What is the largest?
- **Twist:** "What if the feasibility check isn't O(n)?" — The approach still works, but the total complexity changes. E.g., if feasibility is O(n log n), total is O(n log n × log(range)).
- **Key insight:** This is the most underrated binary search pattern. It appears in 15-20% of hard LeetCode problems. Master it.
- **Follow-up:** "Can you prove your feasibility function is correct?" — You need to argue that your greedy check correctly determines feasibility for any candidate answer.

---

## Search in 2D Matrix

### What is this approach?

**Intuition:** You have a 2D grid where numbers increase left-to-right and top-to-bottom. You start at a corner where one direction is "smaller" and the other is "larger." Each comparison eliminates a row or column.

**Formal:** For a matrix where each row and each column is sorted independently, start from the top-right (or bottom-left) corner. If the current element is too large, move left. If too small, move down. This eliminates one row or column per step.

### When should I use this?

- Matrix where **each row is sorted AND each column is sorted**
- "Search in a 2D matrix" (two variants — see below)
- Keywords: "2D matrix," "sorted rows and columns," "search matrix"

### When should I NOT use this?

- The matrix is not sorted in any useful way
- The matrix is sorted as one flat array (rows concatenated) — just binary search treating it as a 1D array

### Core Idea

**Variant 1 — Fully sorted (each row's last element < next row's first element):**
- Treat the entire matrix as a sorted 1D array
- Binary search with index mapping: row = idx / cols, col = idx % cols
- Time: O(log(m × n))

**Variant 2 — Row-sorted and column-sorted independently (240. Search a 2D Matrix II):**
- Start at top-right corner (row = 0, col = n-1)
- If current == target: found
- If current > target: move left (col--)
- If current < target: move down (row++)
- Each step eliminates a row or column
- Time: O(m + n)

**Mental model for Variant 2:** You're standing at a corner where going left makes numbers smaller and going down makes numbers larger. You have two "knobs" to turn. At each step, exactly one knob gives you useful information.

### Complexity

- **Variant 1:** O(log(m × n)) = O(log m + log n)
- **Variant 2:** O(m + n)
- **Space:** O(1) for both

### Variants

- **Search a 2D Matrix (LeetCode 74):** Variant 1 — fully sorted
- **Search a 2D Matrix II (LeetCode 240):** Variant 2 — row/column sorted
- **Kth Smallest Element in Sorted Matrix:** Binary search on value with count feasibility check, or use heap

### Related Patterns

- [Binary Search — Classic](#binary-search--classic) (variant 1 is just 1D binary search on mapped indices)
- [Heaps](12-HEAPS-AND-PRIORITY-QUEUES.md) (Kth smallest in matrix uses min-heap)

### Interview Insights

- **Trap:** Confusing the two variants. One allows full binary search, the other doesn't (because rows aren't concatenated in sorted order).
- **Twist:** "Kth smallest element in this matrix" — Binary search on the value (not index). For each candidate value, count how many elements are ≤ it using the staircase method (O(m + n) count). Total: O((m + n) × log(max - min)).
- **Follow-up:** "Can you do better than O(m + n) for variant 2?" — For square matrices, there are O(m log n) approaches using binary search on each row, but O(m + n) is usually optimal enough.

---

## Exponential Search

### What is this approach?

**Intuition:** You don't know the size of the array (or it's unbounded). So you start with a tiny range and keep doubling it: check 1, 2, 4, 8, 16... until you overshoot. Then binary search within the found range.

**Formal:** Find the range where the target could be by exponentially increasing the upper bound. Once the range [bound/2, bound] is found, apply binary search within it.

### When should I use this?

- The array size is **unknown or unbounded**
- "Search in an infinite sorted array"
- The target is likely near the beginning (exponential search is good when the target is early)
- Keywords: "unbounded array," "infinite sorted list," "search without knowing length"

### When should I NOT use this?

- You know the array size — just use binary search directly
- The array is not sorted

### Core Idea

1. Start with bound = 1
2. While arr[bound] < target: bound *= 2
3. Binary search in range [bound/2, min(bound, n-1)]

**Mental model:** You are casting a fishing net that doubles in size each time. Once you catch something bigger than your target, you know the target is somewhere in the net. Then you search within the net.

### Complexity

- **Time:** O(log n) — finding the range takes O(log n) steps (each doubles), then binary search takes O(log n)
- **Space:** O(1)

### Variants

- **Search in infinite array:** The classic use case
- **Find the first element ≥ target in a stream:** Exponential search to find the range, then binary search

### Related Patterns

- [Binary Search — Classic](#binary-search--classic) (the second phase)

### Interview Insights

- **Trap:** Array bounds. When doubling, you might go past the array. Always use min(bound, n-1) for the upper limit.
- **Twist:** Usually combined with other problems as a sub-technique.

---

## Ternary Search

### What is this approach?

**Intuition:** Binary search finds a target in a sorted array. Ternary search finds the peak (or valley) of a unimodal function — one that goes up then down (or down then up).

**Formal:** For a function that first increases then decreases (unimodal), divide the search space into three parts using two mid-points. Compare function values at the two mids to determine which third to eliminate. Converge to the maximum.

### When should I use this?

- Finding the **maximum or minimum** of a **unimodal function** (not a sorted array!)
- The function has exactly one peak (or valley)
- Keywords: "peak element," "maximum of a bitonic array," "minimize a convex function"

### When should I NOT use this?

- The function is monotonic (just use binary search — it's simpler and faster)
- The function has multiple peaks — ternary search only works for unimodal functions
- You can use binary search on the derivative — often simpler than ternary search

### Core Idea

1. `low`, `high` = search bounds
2. `m1 = low + (high - low) / 3`
3. `m2 = high - (high - low) / 3`
4. If f(m1) < f(m2): maximum is NOT in [low, m1] → `low = m1 + 1`
5. Else: maximum is NOT in [m2, high] → `high = m2 - 1`
6. Repeat until low >= high

**Mental model:** You sample two points inside the range. On a hill, if the left sample is lower than the right, the peak must be to the right (or at the right sample). You eliminate the definite non-peak third.

### Complexity

- **Time:** O(log₃ n) ≈ O(log n) — eliminates 1/3 of the space each step
- **Space:** O(1)

**Note:** O(log₃ n) = O(log n / log 3) — it's still logarithmic but with a larger constant than binary search. In practice, binary search on the derivative (when possible) is preferred.

### Variants

- **Find Peak Element:** Can also be solved with binary search (compare mid with mid+1)
- **Minimize/Maximize a unimodal function:** Classic ternary search application
- **Bitonic array maximum:** Find the peak in an array that increases then decreases

### Related Patterns

- [Binary Search — Classic](#binary-search--classic) (binary search on derivative is often a simpler alternative)

### Interview Insights

- **Trap:** In practice, most interviewers prefer binary search with derivative comparison over ternary search. For "find peak element," comparing arr[mid] with arr[mid+1] is simpler.
- **Twist:** "What if the function has noise?" — Ternary search requires a clean unimodal function. Noise breaks it.
- **Note:** Ternary search is more common in competitive programming than in FAANG interviews. Know it exists, but prioritize binary search mastery.

---

## Median of Two Sorted Arrays Pattern

### What is this approach?

**Intuition:** You have two sorted lines of people. You want to find the person who would be in the middle if both lines merged — WITHOUT actually merging. You binary search on how many people from the first line go to the left half of the merged result. The rest of the left half comes from the second line. Check if this split is valid.

**Formal:** Find the median of two sorted arrays of sizes m and n in O(log(min(m, n))) time. Binary search on the partition of the smaller array. For each partition, verify that the left-side maximums are ≤ the right-side minimums.

### When should I use this?

- Specifically: "Find the median of two sorted arrays"
- More generally: "Find the Kth element in two sorted arrays"
- Keywords: "two sorted arrays," "median," "merge without merging"

### When should I NOT use this?

- Arrays are not sorted — sort them first (but then the problem changes)
- You can afford O(m + n) time — just merge and find median directly
- Only one array — use standard median finding

### Core Idea

1. Ensure you binary search on the **smaller** array (swap if needed). Let it have size m, the other n.
2. Binary search on partition index i in [0, m] for the smaller array.
3. j = (m + n + 1) / 2 - i gives the partition for the larger array.
4. This creates a split: left half = first i elements of array1 + first j elements of array2. Right half = the rest.
5. **Validity check:** maxLeft1 ≤ minRight2 AND maxLeft2 ≤ minRight1.
6. If maxLeft1 > minRight2: i is too large, search left.
7. If maxLeft2 > minRight1: i is too small, search right.
8. When valid, the median is computed from the boundary elements.

**Mental model:** You are cutting a deck of m cards and a deck of n cards such that the left pile has exactly (m+n)/2 cards total. You adjust where you cut the first deck; the cut in the second deck is determined. You check if the split creates a valid "lower half" and "upper half."

### Complexity

- **Time:** O(log(min(m, n))) — binary search on the smaller array
- **Space:** O(1)

**Why log(min(m, n))?** You binary search on the smaller array's partition (at most m+1 possible partitions). The larger array's partition is determined.

### Variants

- **Median of two sorted arrays:** The canonical problem
- **Kth element of two sorted arrays:** Adjust the partition target to K instead of (m+n)/2

### Related Patterns

- [Binary Search — Classic](#binary-search--classic) (binary search on partition)
- [Merge K Sorted Lists](12-HEAPS-AND-PRIORITY-QUEUES.md) (generalized merge)

### Interview Insights

- **Trap:** Edge cases where i = 0 or i = m (all elements of one array go to one side). Handle with -∞ and +∞ sentinel values.
- **Trap:** Even vs odd total length changes how you compute the median.
- **Twist:** "What about the Kth smallest?" — Same approach, just change the partition target.
- **Note:** This is one of the hardest binary search problems. It's a Google/Meta classic. Understanding the partition logic is more important than memorizing the steps.
- **Follow-up:** "What if there are K sorted arrays?" — Use a min-heap (merge K sorted) or divide and conquer.

---

*Next: [04-SORTING-AND-ORDER.md](04-SORTING-AND-ORDER.md) — Sorting as a problem-solving tool, not just a utility.*
