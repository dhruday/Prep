# Arrays & Strings — Complete Pattern Guide

> *"Arrays are the soil from which all other data structures grow. Master them, and you master the foundation of everything."*

---

## Table of Contents

1. [Two Pointers — Opposite Direction](#two-pointers--opposite-direction)
2. [Two Pointers — Same Direction](#two-pointers--same-direction)
3. [Three Pointers](#three-pointers)
4. [Sliding Window — Fixed Size](#sliding-window--fixed-size)
5. [Sliding Window — Variable Size](#sliding-window--variable-size)
6. [Sliding Window with HashMap](#sliding-window-with-hashmap)
7. [Prefix Sum](#prefix-sum)
8. [Prefix XOR](#prefix-xor)
9. [Kadane's Algorithm](#kadanes-algorithm)
10. [Dutch National Flag / Three-Way Partition](#dutch-national-flag--three-way-partition)
11. [Boyer-Moore Voting Algorithm](#boyer-moore-voting-algorithm)
12. [In-Place Array Manipulation](#in-place-array-manipulation)
13. [Matrix Traversal Patterns](#matrix-traversal-patterns)
14. [Subarray vs Subsequence vs Substring](#subarray-vs-subsequence-vs-substring)
15. [Rotate Array / Reverse Trick](#rotate-array--reverse-trick)

---

## Two Pointers — Opposite Direction

### What is this approach?

**Intuition:** Imagine you and a friend stand at opposite ends of a corridor. You walk toward each other, checking something at each step. You stop when you meet. That is opposite-direction two pointers.

**Formal:** Maintain two indices, one starting at the beginning (left) and one at the end (right) of a sorted array or string. Move them toward each other based on a condition, eliminating portions of the search space with each step.

### When should I use this?

- The array or string is **sorted** (or can be sorted without affecting the answer)
- You need to find a **pair** that satisfies a condition (sum, difference, etc.)
- You are checking **symmetry** (palindromes)
- You need to **partition** elements based on a condition
- Keywords: "pair with sum," "two numbers that," "is palindrome," "container with most water"

### When should I NOT use this?

- The array is unsorted AND sorting would lose information (e.g., you need original indices) — use HashMap instead
- You need to find **all pairs** (not just one) — consider combining with other techniques
- The problem is about **contiguous subarrays** — sliding window is likely better

### Core Idea

1. Initialize `left = 0`, `right = n - 1`
2. Evaluate a condition involving elements at left and right
3. If the condition suggests "too small," move left forward (increase the value)
4. If the condition suggests "too large," move right backward (decrease the value)
5. If matched, record the answer and decide which pointer to move
6. Stop when left >= right

**Mental model:** You are squeezing a search space from both ends. Each step guarantees you eliminate at least one candidate.

### Complexity

- **Time:** O(n) — each pointer moves at most n times, and they never cross, so total work is at most 2n
- **Space:** O(1) — only two index variables

### Variants

- **Two Sum (sorted array):** Move left if sum too small, right if too large
- **Container With Most Water:** Move the pointer pointing to the shorter line (greedy: moving the taller line can never help)
- **Trapping Rain Water (two-pointer version):** Track left_max and right_max; process from the smaller side
- **Valid Palindrome:** Compare characters at left and right, skip non-alphanumeric
- **Remove Duplicates from Sorted Array:** Slow pointer marks write position, fast pointer scans

### Related Patterns

- [Two Pointers — Same Direction](#two-pointers--same-direction) (different pointer movement)
- [Sliding Window](02-ARRAYS-AND-STRINGS.md#sliding-window--variable-size) (same direction, but window-based)
- [Binary Search](03-SEARCHING-TECHNIQUES.md) (also halves search space, but on a different axis)

### Interview Insights

- **Trap:** Forgetting to handle duplicates in problems like 3Sum. After finding a pair, you must skip duplicate values for both pointers to avoid duplicate results.
- **Twist:** "What if the array isn't sorted?" — The interviewer is testing if you know that sorting + two pointers = O(n log n), while HashMap = O(n). Discuss the tradeoff.
- **Follow-up:** "Can you find all pairs?" — You continue moving both pointers inward after each match, skipping duplicates.

---

## Two Pointers — Same Direction

### What is this approach?

**Intuition:** Imagine two people walking in the same direction, but at different speeds. The slow one processes elements carefully; the fast one scouts ahead. This is the fast/slow pointer pattern on arrays.

**Formal:** Two indices both start at the beginning (or near it) and move in the same direction. The fast pointer advances every step; the slow pointer advances only when a condition is met. The gap between them represents a filtered or processed region.

### When should I use this?

- You need to **remove** or **filter** elements in place
- You need to **compress** or **deduplicate** a sorted array
- You need to partition into "processed" and "unprocessed" regions
- Keywords: "remove element," "move zeroes," "remove duplicates"

### When should I NOT use this?

- You need to find a **pair with a target sum** — use opposite-direction instead
- You need a **window** of contiguous elements — sliding window is more appropriate
- The problem requires knowing both ends — use opposite-direction

### Core Idea

1. Initialize `slow = 0`, `fast = 0`
2. Fast pointer scans through the entire array
3. When fast pointer finds an element that should be "kept," copy it to the slow position and advance slow
4. After fast reaches the end, everything from 0 to slow-1 is the processed result

**Mental model:** Slow is the "writer." Fast is the "reader." The writer only writes when the reader finds something worth keeping.

### Complexity

- **Time:** O(n) — fast pointer visits each element exactly once
- **Space:** O(1) — in-place modification

### Variants

- **Remove Element:** Skip elements equal to a target
- **Remove Duplicates from Sorted Array:** Keep only the first of each value
- **Remove Duplicates (allow at most K):** Keep at most K copies
- **Move Zeroes:** Move all zeroes to the end while preserving order of non-zeroes

### Related Patterns

- [Two Pointers — Opposite Direction](#two-pointers--opposite-direction) (different pointer setup)
- [Fast/Slow Pointer on Linked Lists](06-LINKED-LISTS.md) (same idea, different data structure)
- [Sliding Window](#sliding-window--variable-size) (two same-direction pointers, but focused on a "window")

### Interview Insights

- **Trap:** Not maintaining relative order. If the problem says "maintain order," you must use the slow/fast approach, not swap with the end.
- **Twist:** "Do it with O(1) extra space" — if you weren't already thinking in-place, the interviewer is pushing you toward two-pointer.
- **Follow-up:** "What if duplicates can appear at most K times?" — Generalize: slow pointer is at position j, check if arr[j - K] == arr[fast]. If not, keep it.

---

## Three Pointers

### What is this approach?

**Intuition:** Sometimes two pointers aren't enough because you need to track three regions. Think of sorting laundry into three piles — you process each item and toss it into the correct pile while tracking the boundaries of all three.

**Formal:** Three pointers partition the array into three (or four) regions simultaneously. Used when elements belong to one of three categories.

### When should I use this?

- You need to partition an array into **three categories** in place
- The problem involves **three groups** (e.g., negatives, zeroes, positives)
- Keywords: "sort colors," "three-way partition," "separate into three groups"

### When should I NOT use this?

- Only two categories — two pointers suffice
- More than three categories — consider counting sort or bucket approach
- Element order within categories matters — this approach doesn't guarantee stability

### Core Idea

1. Three pointers: `low = 0`, `mid = 0`, `high = n - 1`
2. `[0, low)` = category 1, `[low, mid)` = category 2, `(high, n-1]` = category 3
3. Scan with `mid`:
   - If arr[mid] is category 1 → swap with low, advance both low and mid
   - If arr[mid] is category 2 → just advance mid
   - If arr[mid] is category 3 → swap with high, decrement high (do NOT advance mid — the swapped element needs inspection)
4. Stop when mid > high

### Complexity

- **Time:** O(n) — mid pointer traverses the array once
- **Space:** O(1)

### Variants

- **Sort Colors (Dutch National Flag)** — The canonical problem (0s, 1s, 2s)
- **Three-way partition around pivot** — Used as a subroutine in Quick Sort (fat partition)
- **Separate negatives, zeroes, positives**

### Related Patterns

- [Dutch National Flag](#dutch-national-flag--three-way-partition) (same concept with detailed treatment)
- [Two Pointers — Opposite Direction](#two-pointers--opposite-direction) (the two-category version)

### Interview Insights

- **Trap:** Advancing mid after a swap with high. The element you just swapped in from the high end hasn't been examined yet — you must check it before moving on.
- **Twist:** "Can you do it in one pass?" — This is exactly the three-pointer approach. Two-pass solutions (count then fill) are O(n) too but use two passes.

---

## Sliding Window — Fixed Size

### What is this approach?

**Intuition:** Imagine looking through a window of fixed width that slides across a long wall of paintings. At each position, you see exactly K paintings. Instead of re-examining all K paintings each time, you just note what new painting entered and what old painting left.

**Formal:** Maintain a window of exactly K elements. Slide it across the array one element at a time. At each step, add the incoming element's contribution and remove the outgoing element's contribution. This avoids recomputing the entire window from scratch.

### When should I use this?

- The problem mentions a **subarray/substring of fixed size K**
- You need to compute an aggregate (sum, max, average) over **every window of size K**
- Keywords: "subarray of size K," "K consecutive elements," "average of K"

### When should I NOT use this?

- The window size is **variable** (depends on a condition) — use variable sliding window
- You need to process **all** possible subarray sizes — different approach needed
- The aggregate is not incrementally computable (e.g., median — need augmented structures)

### Core Idea

1. Initialize the window with the first K elements. Compute the initial aggregate.
2. Slide: add element at position `right + 1`, remove element at position `left`
3. Update the aggregate incrementally
4. Track the best aggregate across all windows
5. Repeat until the right edge reaches the end

**Mental model:** You are maintaining a "running total" and making two O(1) modifications per step instead of recomputing K elements.

### Complexity

- **Time:** O(n) — each element enters and leaves the window exactly once
- **Space:** O(1) for sum/average; O(K) if you need to store window contents

**Why O(n)?** Even though the window size is K, each element is added once and removed once. Total operations = 2n.

### Variants

- **Maximum Sum Subarray of Size K**
- **Average of All Subarrays of Size K**
- **Max of Each Window of Size K** — Requires monotonic deque for O(n), not just simple sliding window (see [Monotonic Queue](07-STACKS-AND-QUEUES.md#monotonic-queue))
- **String permutation check** — Fixed window of size len(pattern) with frequency matching

### Related Patterns

- [Sliding Window — Variable Size](#sliding-window--variable-size) (when K isn't fixed)
- [Prefix Sum](#prefix-sum) (alternative for range sum)
- [Monotonic Queue](07-STACKS-AND-QUEUES.md) (when you need min/max within the window)

### Interview Insights

- **Trap:** Using prefix sum for this. It works but misses the point — the interviewer wants to see the sliding window technique because it generalizes to non-sum aggregates.
- **Twist:** "What about duplicates in the window?" — Combine sliding window with a HashMap to track frequencies.
- **Follow-up:** "Find max in each window" — This upgrades from basic sliding window to monotonic deque.

---

## Sliding Window — Variable Size

### What is this approach?

**Intuition:** Now the window has no fixed width. It expands to the right until a condition is violated, then shrinks from the left until the condition is restored. Like a rubber band that stretches and contracts.

**Formal:** Maintain two pointers (left, right) representing a window. Expand right to include elements until a constraint is violated, then advance left to shrink the window until the constraint is restored. Track the optimal window throughout.

### When should I use this?

- "Longest/shortest subarray/substring such that some condition holds"
- The condition is about a **property of the window** (sum ≤ K, all unique characters, at most K distinct values, etc.)
- The condition is **monotonic**: if a window fails, adding more elements to the right can only make it worse (or vice versa)
- Keywords: "longest substring," "minimum window," "at most K," "subarray with sum ≤ / ≥"

### When should I NOT use this?

- The condition is NOT monotonic (e.g., "subarray with sum exactly K" for arrays with negative numbers — the window can't simply shrink from left)
- You need ALL windows, not just the longest/shortest — consider prefix sum with HashMap
- The problem is about subsequences (not contiguous) — sliding window only works for contiguous ranges

### Core Idea

1. Initialize `left = 0`, `right = 0`
2. Expand: Move right forward, update window state
3. Check: If the window violates the constraint, shrink from left until the constraint is restored
4. Track: At each valid window, update the best answer (longest or shortest)
5. Repeat until right reaches the end

**Mental model:** Right pointer is greedy — it always wants to expand. Left pointer is the disciplinarian — it shrinks when things go wrong. The answer hides in the tension between them.

**The two templates:**
- **Longest valid window:** Expand right always. Shrink left only when invalid. Track max(right - left + 1).
- **Shortest valid window:** Expand right until valid. Then shrink left as much as possible while staying valid. Track min(right - left + 1).

### Complexity

- **Time:** O(n) — each of left and right moves at most n times. Total operations = 2n.
- **Space:** O(1) or O(K) depending on the window state (frequency map, etc.)

**Why O(n) and not O(n²)?** Key insight: left never moves backward. The inner "shrink" loop across ALL iterations of the outer loop moves left at most n total times.

### Variants

- **Longest Substring Without Repeating Characters:** Window state = set of characters. Shrink when a repeat appears.
- **Minimum Window Substring:** Expand until all target characters are covered. Shrink to minimize. Track shortest.
- **Longest Substring with At Most K Distinct Characters:** Window state = frequency map. Shrink when distinct count > K.
- **Subarray Product Less Than K:** Window state = running product. Shrink when product ≥ K.
- **Minimum Size Subarray Sum:** Shortest subarray with sum ≥ target.

### Related Patterns

- [Sliding Window — Fixed Size](#sliding-window--fixed-size) (simpler special case)
- [Sliding Window with HashMap](#sliding-window-with-hashmap) (when window state needs a frequency map)
- [Two Pointers — Same Direction](#two-pointers--same-direction) (same pointer structure, different intent)
- [Prefix Sum + HashMap](05-HASHING-AND-SETS.md) (alternative when sliding window doesn't apply due to negative numbers)

### Interview Insights

- **Trap:** Trying to use sliding window when the array has negative numbers and you want exact sum. The shrink logic breaks because adding elements doesn't monotonically change the sum direction. Use prefix sum + hashmap instead.
- **Trap:** Off-by-one errors on window size. Practice mentally: when left = 2 and right = 5, the window size is right - left + 1 = 4.
- **Twist:** "Count all valid subarrays (not just the longest)" — For the "at most K" variant, the number of valid subarrays ending at right is (right - left + 1). Sum these across all right positions.
- **Follow-up:** "What if we need exactly K distinct characters?" — Use the trick: exactly(K) = atMost(K) - atMost(K-1).

---

## Sliding Window with HashMap

### What is this approach?

**Intuition:** The variable sliding window, but now you need to track frequencies, counts, or conditions that require a lookup table. The HashMap IS the window state.

**Formal:** A variable sliding window where the window's validity condition depends on frequency counts or membership, tracked via a HashMap (or frequency array for limited character sets).

### When should I use this?

- Window validity depends on **character frequency** or **element count**
- Problems involving **anagrams**, **permutations within a string**, or **minimum window covering all characters**
- Keywords: "anagram," "permutation," "minimum window substring," "all characters included"

### When should I NOT use this?

- The window condition is a simple numeric threshold (sum, product) — a running variable suffices, no need for a map
- The alphabet is fixed and small — a frequency array is faster (constant factor optimization)

### Core Idea

1. Maintain a HashMap for the window's character/element frequencies
2. Maintain a counter tracking how many characters/conditions are "satisfied"
3. Expand right: add element to map, update counter if this element's condition is now fully met
4. When all conditions are met, shrink left as much as possible, updating the map and counter
5. Track the optimum

**Mental model:** The HashMap is a scoreboard. Expanding right adds points. Shrinking left removes points. You track when the score reaches "winning."

### Complexity

- **Time:** O(n) — same argument as variable sliding window; map operations are O(1) amortized
- **Space:** O(K) where K = number of distinct elements (26 for lowercase English letters)

### Variants

- **Find All Anagrams in a String:** Fixed window of size len(pattern), frequency map match
- **Minimum Window Substring:** Variable window covering all target characters
- **Longest Substring with At Most K Distinct Characters:** Frequency map, shrink when distinctCount > K
- **Permutation in String:** Fixed window, frequency match check

### Related Patterns

- [Sliding Window — Variable Size](#sliding-window--variable-size) (general framework)
- [Hashing & Frequency Counting](05-HASHING-AND-SETS.md) (the data structure used inside the window)

### Interview Insights

- **Trap:** Recomputing the entire frequency map at each step instead of incrementally updating. This turns O(n) into O(n×K).
- **Twist:** "What if the target has duplicate characters?" — Your "satisfied" counter must track individual character fulfillment, not just presence.
- **Follow-up:** "Can you make it work for Unicode?" — HashMap instead of 26-element array. Mention the tradeoff.

---

## Prefix Sum

### What is this approach?

**Intuition:** Imagine numbering every fence post along a road with the total distance from the start. Now if someone asks "what's the distance between post 3 and post 7?" you just subtract: distance[7] - distance[3]. That's prefix sum.

**Formal:** Precompute an array where prefix[i] = sum of elements from index 0 to i-1. Then the sum of any subarray [l, r] = prefix[r+1] - prefix[l]. This transforms range-sum queries from O(n) to O(1) after O(n) preprocessing.

### When should I use this?

- You need to compute **many range sum queries** on a static array
- The problem asks about **subarray sums** (especially "subarray sum equals K" combined with HashMap)
- You need to **compare** sums of different regions
- Keywords: "range sum," "subarray sum," "sum between indices," "sum equals K"

### When should I NOT use this?

- The array is **modified** between queries — use Fenwick Tree or Segment Tree instead
- You only need one range sum — just compute it directly in O(n)
- The operation is min/max (not sum) — use Sparse Table or Segment Tree

### Core Idea

1. Build prefix array: prefix[0] = 0, prefix[i] = prefix[i-1] + arr[i-1]
2. Range sum [l, r] = prefix[r+1] - prefix[l]
3. For "subarray sum equals K": iterate through prefix sums, using a HashMap to count how many previous prefix sums equal (current_prefix - K)

**Mental model:** Prefix sum converts a "segment question" into a "two-point subtraction." Every range sum is encoded as the difference between two checkpoints.

### Complexity

- **Time:** O(n) to build, O(1) per query
- **Space:** O(n) for the prefix array

**Why O(1) per query?** Because the prefix array has already accumulated all the partial sums. Any range sum is just one subtraction.

### Variants

- **1D Prefix Sum:** Standard range sum queries
- **2D Prefix Sum:** Range sum in a matrix. prefix[i][j] = sum of rectangle from (0,0) to (i-1, j-1). Uses inclusion-exclusion for rectangle queries.
- **Prefix Sum + HashMap (Subarray Sum = K):** Count subarrays with exact sum = K. Track counts of each prefix sum in a HashMap. At each index, check if (current_prefix - K) exists in the map.
- **Prefix Sum with Modular Arithmetic:** "Subarray sum divisible by K" — track prefix_sum % K in a HashMap.
- **Difference Array:** The inverse of prefix sum. Used for **range updates**: add value to a range [l, r] in O(1), then reconstruct with prefix sum.

### Related Patterns

- [Kadane's Algorithm](#kadanes-algorithm) (max subarray sum — optimized beyond prefix sum)
- [Prefix XOR](#prefix-xor) (same idea but with XOR)
- [Subarray Sum + HashMap](05-HASHING-AND-SETS.md) (prefix sum as a building block)
- [Fenwick Tree / Segment Tree](16-ADVANCED-DATA-STRUCTURES.md) (dynamic version with updates)

### Interview Insights

- **Trap:** Off-by-one in prefix sum indexing. Convention: prefix[0] = 0, so prefix has n+1 elements. Range [l, r] inclusive = prefix[r+1] - prefix[l].
- **Trap:** For "subarray sum = K" with negative numbers, you MUST use prefix sum + HashMap. Sliding window fails here because shrinking from left doesn't necessarily decrease the sum.
- **Twist:** "2D version" — Prefix sum on a matrix. The interviewer tests if you can apply inclusion-exclusion: sum(r1,c1,r2,c2) = prefix[r2+1][c2+1] - prefix[r1][c2+1] - prefix[r2+1][c1] + prefix[r1][c1].
- **Follow-up:** "What if the array gets updated?" — Mention Fenwick Tree / Segment Tree for dynamic prefix sums.

---

## Prefix XOR

### What is this approach?

**Intuition:** Same fence-post idea as prefix sum, but using XOR instead of addition. Since XOR is its own inverse (a ⊕ a = 0), the "subtraction" is also XOR.

**Formal:** Precompute prefixXOR[i] = arr[0] ⊕ arr[1] ⊕ ... ⊕ arr[i-1]. Then XOR of any subarray [l, r] = prefixXOR[r+1] ⊕ prefixXOR[l].

### When should I use this?

- Problems involving **XOR of subarrays**
- "Find subarray with XOR equal to K"
- Keywords: "XOR," "subarray XOR," "XOR sum"

### When should I NOT use this?

- The operation is addition, not XOR — use prefix sum
- You need range updates — XOR prefix doesn't support dynamic updates easily

### Core Idea

1. Build prefixXOR array (same as prefix sum but with ⊕)
2. Range XOR = prefixXOR[r+1] ⊕ prefixXOR[l]
3. For "count subarrays with XOR = K": use HashMap on prefixXOR values (same pattern as subarray sum = K)

### Complexity

- **Time:** O(n) build, O(1) per query
- **Space:** O(n)

### Variants

- **Count subarrays with XOR = K:** HashMap of prefix XOR values
- **Maximum XOR subarray:** Combine with Trie for bit-by-bit greedy

### Related Patterns

- [Prefix Sum](#prefix-sum) (same technique, different operator)
- [Bit Manipulation](14-BIT-MANIPULATION.md) (XOR properties)
- [Trie / XOR Trie](16-ADVANCED-DATA-STRUCTURES.md) (maximum XOR problems)

### Interview Insights

- **Trap:** Forgetting that XOR is its own inverse. No need for "subtraction" — just XOR again.
- **Twist:** "Maximum XOR subarray" — This needs a Trie, not just prefix XOR.

---

## Kadane's Algorithm

### What is this approach?

**Intuition:** You are walking along a number line collecting coins (positive numbers) and paying tolls (negative numbers). At each step, you decide: "Should I keep the running total, or start fresh from here?" If the running total is negative, it's better to start fresh — a negative prefix can only hurt you.

**Formal:** Find the maximum sum contiguous subarray. Maintain a running sum; at each element, decide whether to extend the current subarray or start a new one. The decision is: current = max(arr[i], current + arr[i]).

### When should I use this?

- **"Maximum subarray sum"** — the classic application
- Any problem reducible to "best contiguous segment"
- Keywords: "maximum subarray," "largest sum contiguous," "best time to buy and sell" (one transaction)

### When should I NOT use this?

- You need the actual subarray (not just the sum) — Kadane's finds the sum; tracking indices requires extra work
- The array is circular — need the circular variant (below)
- You need max sum with **constraints** (e.g., subarray length ≥ K) — need modified approach
- The problem asks about subsequences (non-contiguous) — Kadane's only works for contiguous subarrays

### Core Idea

1. Initialize `current_sum = arr[0]`, `global_max = arr[0]`
2. For each element from index 1:
   - `current_sum = max(arr[i], current_sum + arr[i])`
   - If current_sum > global_max, update global_max
3. Return global_max

**Mental model:** At each position, you ask: "Is it better to join the party (extend current subarray) or start my own party (new subarray from here)?" You start your own party whenever the existing one has negative value.

### Complexity

- **Time:** O(n) — single pass
- **Space:** O(1) — only two variables

**Why O(n)?** Each element is considered exactly once. The decision at each step is O(1).

### Variants

- **Maximum Subarray Sum (standard):** As described above
- **Maximum Subarray Sum — Circular Array:** max(standard_kadane, total_sum - min_subarray_sum). The idea: the max circular subarray is either (a) a regular subarray, or (b) total minus the minimum subarray (the wraparound case). Edge case: if all elements are negative, use scenario (a).
- **Maximum Subarray Sum with at Least K Elements:** Use prefix sum + sliding window min.
- **Maximum Product Subarray:** Track both current_max and current_min (because a negative times a negative can become the max). At each step: new_max = max(arr[i], current_max * arr[i], current_min * arr[i]), similarly for new_min.
- **Maximum Sum of Two Non-Overlapping Subarrays:** Run Kadane's from left and right, combine.
- **Best Time to Buy and Sell Stock (one transaction):** Transform to "max subarray of daily differences."

### Related Patterns

- [Prefix Sum](#prefix-sum) (alternative approach: max subarray sum = max(prefix[j] - prefix[i]) for j > i)
- [Dynamic Programming](09-DYNAMIC-PROGRAMMING.md) (Kadane's IS a 1D DP with space optimization)
- [Divide and Conquer](04-SORTING-AND-ORDER.md) (alternative O(n log n) approach via merge sort)

### Interview Insights

- **Trap:** The circular variant. Many candidates know standard Kadane's but freeze on circular. Remember: max_circular = total - min_subarray (unless all elements negative).
- **Trap:** Maximum product subarray — you MUST track both max and min at each step because of negative numbers.
- **Twist:** "What if you want the actual subarray, not just the sum?" — Track start and end indices. Reset start when you start a new subarray.
- **Follow-up:** "What about 2D max subarray (max sum rectangle)?" — Fix two rows, compute column sums, apply 1D Kadane's. O(n²m) for n×m matrix.

---

## Dutch National Flag / Three-Way Partition

### What is this approach?

**Intuition:** You have a pile of red, white, and blue balls. You want them sorted: all reds, then whites, then blues. You scan through, tossing each ball to the correct region, using three markers to track region boundaries.

**Formal:** Partition an array into three regions around a pivot value: elements < pivot, elements == pivot, elements > pivot. Done in a single pass with three pointers.

### When should I use this?

- Sort an array with **exactly three distinct values** (or three categories)
- **Three-way partitioning** step in Quick Sort (handles duplicate pivot values)
- Keywords: "sort colors," "three values," "0s, 1s, 2s"

### When should I NOT use this?

- More than three categories — use counting sort or bucket approach
- Two categories — standard partition (two pointers) is simpler
- Elements need to maintain relative order within categories — this approach is not stable

### Core Idea

See [Three Pointers](#three-pointers) for the detailed algorithm. The Dutch National Flag is the canonical application.

### Complexity

- **Time:** O(n) — single pass
- **Space:** O(1) — in-place

### Variants

- **Sort Colors:** The classic LeetCode problem
- **Three-Way Partition for Quick Sort:** Improves Quick Sort performance on arrays with many duplicates
- **Partition into negatives, zeros, positives**

### Related Patterns

- [Three Pointers](#three-pointers) (identical technique)
- [Quick Select / Quick Sort](04-SORTING-AND-ORDER.md) (uses partitioning as subroutine)

### Interview Insights

- **Trap:** Moving mid forward after swapping with high — don't do it. The swapped element hasn't been inspected yet.
- **Twist:** "Can you do it in one pass?" — That's the whole point of this algorithm.

---

## Boyer-Moore Voting Algorithm

### What is this approach?

**Intuition:** Imagine a crowd at an election rally. Everyone holds up a sign with their candidate's name. You go through person by person: if the current person supports the same candidate as your current "leader," the leader's count goes up. If they support a different candidate, the leader loses a supporter. When the count hits zero, the next person becomes the new leader. If any candidate has a true majority (> n/2), they WILL survive this process.

**Formal:** Find an element that appears more than n/2 times (majority element). Maintain a candidate and a count. For each element, if count is 0, set the new candidate. Increment count if the element matches, decrement otherwise. The surviving candidate is the majority element (if one exists).

### When should I use this?

- Finding the element that appears **more than n/2 times** (guaranteed to exist)
- Finding elements appearing **more than n/3 times** (extended version)
- Keywords: "majority element," "more than half," "most frequent element"

### When should I NOT use this?

- The majority element is **not guaranteed** to exist — you must do a second pass to verify
- You need the element appearing **exactly K times** — use HashMap frequency counting
- You need **all** frequencies — not just the majority

### Core Idea

1. Initialize candidate = first element, count = 1
2. For each subsequent element:
   - If count == 0, set candidate = current element, count = 1
   - Else if current == candidate, count++
   - Else count--
3. The surviving candidate is the majority element (verify with a second pass if not guaranteed)

**Mental model:** Think of it as a battle. Each element "fights" the current leader. When the leader's army reaches zero, a new leader rises. The true majority can never be fully eliminated because it has more supporters than all others combined.

### Complexity

- **Time:** O(n) — single pass (or two passes with verification)
- **Space:** O(1) — only candidate and count

### Variants

- **Majority Element (> n/2):** Standard Boyer-Moore, one candidate
- **Elements appearing > n/3 times:** At most 2 such elements. Use two candidates and two counts. Requires a verification pass.
- **Elements appearing > n/k times:** At most k-1 candidates. Generalized Boyer-Moore.

### Related Patterns

- [Hashing / Frequency Counting](05-HASHING-AND-SETS.md) (O(n) time O(n) space alternative)
- [Sorting](04-SORTING-AND-ORDER.md) (sort and check middle element — O(n log n) approach)
- [Quick Select](04-SORTING-AND-ORDER.md) (find median — also O(n) average)

### Interview Insights

- **Trap:** Assuming the majority element always exists. If it doesn't, Boyer-Moore still returns a candidate, but it's wrong. Always clarify: "Is a majority element guaranteed?"
- **Twist:** "What about elements appearing more than n/3 times?" — Extend to two candidates. Tricky implementation.
- **Follow-up:** "Can you prove this works?" — The key insight: a majority element has more than n/2 occurrences, so it can never be completely "voted out."

---

## In-Place Array Manipulation

### What is this approach?

**Intuition:** You are given strict instructions: "No extra rooms. You must rearrange everything in the space you already have." In-place manipulation means using the array itself as your workspace, encoding information into existing cells.

**Formal:** Modify the array in-place to achieve a desired result using O(1) extra space. Often involves using the array itself to store additional information (e.g., marking visited elements by negating them, using values mod n to encode two numbers in one slot).

### When should I use this?

- Space constraint is O(1)
- The array contains values in a known range (often [1, n] or [0, n-1])
- You need to "mark" elements as visited or processed
- Keywords: "O(1) extra space," "in-place," "find duplicate," "find missing," "first missing positive"

### When should I NOT use this?

- The array values can be anything (no useful range to exploit)
- Modifying the input is not allowed
- A cleaner O(n) space solution is acceptable and simpler

### Core Idea

Common tricks:
- **Negation marking:** For values in [1, n], visit arr[abs(arr[i]) - 1] and negate it. Positive values at the end indicate unvisited indices.
- **Modular encoding:** Store two pieces of information in one cell as `original + new * n`. Extract original with `val % n`, extract new with `val / n`.
- **Cyclic placement:** Place each element at its "correct" position (arr[i] should be i+1). Swap until done.

### Complexity

- **Time:** O(n) typically
- **Space:** O(1) — the whole point

### Variants

- **Find All Duplicates:** Negate values at index arr[i]-1; if already negative, it's a duplicate
- **Find All Missing Numbers:** After negation marking, positive positions are missing
- **First Missing Positive:** Cyclic placement (or negation) restricted to range [1, n]
- **Set Matrix Zeroes:** Use first row/column as markers

### Related Patterns

- [Cyclic Sort](04-SORTING-AND-ORDER.md) (systematic approach to "place each at correct position")
- [Bit Manipulation](14-BIT-MANIPULATION.md) (alternative for O(1) space encoding)

### Interview Insights

- **Trap:** Forgetting to handle the absolute value when reading negated cells.
- **Twist:** "First Missing Positive" is one of the hardest array problems because you must first ignore non-positive and out-of-range values, then apply cyclic placement only on valid elements.
- **Follow-up:** "What if modifying the array is not allowed?" — Then you cannot use in-place techniques; switch to hashing or bit manipulation.

---

## Matrix Traversal Patterns

### What is this approach?

**Intuition:** Navigating a 2D grid in specific patterns: spiral, diagonal, zigzag, or layer-by-layer. Each has its own "walking rule."

**Formal:** Systematic ways to visit all cells of an m×n matrix in a specific order, typically requiring boundary tracking or direction vectors.

### When should I use this?

- "Print matrix in spiral order"
- "Traverse diagonals"
- "Rotate matrix 90 degrees"
- Keywords: "spiral," "diagonal," "rotate," "layer," "zigzag"

### When should I NOT use this?

- You need graph traversal on a grid (BFS/DFS) — that's a graph problem, not a traversal pattern
- The problem is about matrix DP (unique paths, etc.) — see DP section

### Core Idea

**Spiral:** Maintain four boundaries (top, bottom, left, right). Walk right across top row, down right column, left across bottom row, up left column. Shrink boundaries after each direction. Repeat.

**Diagonal:** For each diagonal d (sum of indices = d), iterate cells (i, d-i) for valid i.

**90-degree Rotation:** Transpose the matrix, then reverse each row (clockwise). Or reverse each row then transpose (counterclockwise).

**Layer-by-Layer (Onion Peeling):** Process outermost ring, then move inward. Useful for rotation in place.

### Complexity

- **Time:** O(m × n) — visit each cell once
- **Space:** O(1) extra (excluding output)

### Variants

- **Spiral Matrix:** Return elements in spiral order
- **Spiral Matrix II:** Fill an n×n matrix with 1 to n² in spiral order
- **Rotate Image:** 90-degree clockwise rotation in place
- **Diagonal Traverse:** Zigzag along diagonals (alternating direction)

### Related Patterns

- [Grid-based BFS/DFS](11-GRAPHS.md) (when the grid represents a graph problem)
- [2D Prefix Sum](#prefix-sum) (when the problem is about region sums)

### Interview Insights

- **Trap:** Off-by-one on spiral boundaries. Draw a 4×4 and 3×3 example to verify your boundary update logic.
- **Twist:** "Rotate in place" — The interviewer tests whether you know transpose + reverse, or whether you try to move elements one by one.
- **Follow-up:** "What about non-square matrices?" — Spiral works the same. Rotation is only defined for square matrices (or you're transposing a rectangular one).

---

## Subarray vs Subsequence vs Substring

### What is this approach?

This is not an algorithm but a critical **vocabulary distinction** that determines which techniques apply.

### Definitions

| Term | Contiguous? | Order? | Example from [1,2,3,4] |
|---|---|---|---|
| **Subarray** | Yes | Original | [2,3,4], [1,2], [3] |
| **Substring** | Yes | Original | Same as subarray but for strings |
| **Subsequence** | No | Original | [1,3,4], [2,4], [1,4] |
| **Subset** | No | Any | {3,1}, {2,4}, {1,2,3} |

### Why this matters

- **Subarray/Substring problems:** Sliding Window, Prefix Sum, Kadane's, Two Pointers
- **Subsequence problems:** DP (LIS, LCS), Backtracking, Binary Search
- **Subset problems:** Backtracking, Bitmask, DP (knapsack)

### Interview Insights

- **Trap:** Confusing subarray and subsequence. If you apply sliding window to a subsequence problem, you will get it wrong. Always clarify: "Does contiguous mean adjacent elements?"
- **Trap:** The number of subarrays of length n is n(n+1)/2. The number of subsequences is 2^n. The number of subsets is 2^n. These different magnitudes affect what techniques are feasible.

---

## Rotate Array / Reverse Trick

### What is this approach?

**Intuition:** Rotating an array by K positions is the same as cutting a deck of cards at position K and swapping the two halves. The clever trick: three reverses achieve this in place.

**Formal:** To rotate an array right by K positions in O(n) time and O(1) space: reverse the entire array, reverse the first K elements, reverse the remaining n-K elements.

### When should I use this?

- "Rotate array by K positions"
- Any problem where you need to shift a block of elements cyclically
- Keywords: "rotate," "circular shift"

### When should I NOT use this?

- You need to rotate by a dynamic amount at each step — precompute modular indices instead
- The array is a linked list — just re-link pointers

### Core Idea

To rotate right by K:
1. K = K % n (handle K > n)
2. Reverse entire array [0, n-1]
3. Reverse [0, K-1]
4. Reverse [K, n-1]

**Why does this work?** Think of the array as [A | B] where B is the last K elements. You want [B | A]. Reversing gives [A^R | B^R → whole^R], then reversing each half un-reverses them individually, giving [B | A].

### Complexity

- **Time:** O(n) — three passes
- **Space:** O(1)

### Variants

- **Rotate Left by K:** Reverse first K, reverse last n-K, reverse all
- **Rotate String:** Check if s2 is a rotation of s1 by checking if s2 is a substring of s1+s1

### Related Patterns

- [In-Place Array Manipulation](#in-place-array-manipulation) (same philosophy)
- [String Algorithms](17-STRING-ALGORITHMS.md) (for string rotation problems)

### Interview Insights

- **Trap:** Forgetting K = K % n. If K > n, you rotate more than a full cycle, which is redundant.
- **Twist:** "Can you do it in O(1) extra space?" — That's the entire point of the triple-reverse trick.
- **Follow-up:** "How would you check if two arrays are rotations of each other?" — Concatenate one with itself and check if the other is a subarray.

---

*Next: [03-SEARCHING-TECHNIQUES.md](03-SEARCHING-TECHNIQUES.md) — Master Binary Search and its hidden power.*
