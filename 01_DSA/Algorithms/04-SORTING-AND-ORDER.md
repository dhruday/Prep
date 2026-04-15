# Sorting & Order Statistics — Complete Pattern Guide

> *"Sorting is rarely the answer, but it is often the first step toward the answer."*

---

## Table of Contents

1. [Merge Sort & Divide-and-Conquer Patterns](#merge-sort--divide-and-conquer-patterns)
2. [Quick Sort & Partitioning](#quick-sort--partitioning)
3. [Quick Select — Kth Element](#quick-select--kth-element)
4. [Counting Sort](#counting-sort)
5. [Radix Sort](#radix-sort)
6. [Bucket Sort](#bucket-sort)
7. [Cyclic Sort](#cyclic-sort)
8. [Custom Comparators](#custom-comparators)
9. [Sorting as Preprocessing](#sorting-as-preprocessing)

---

## Merge Sort & Divide-and-Conquer Patterns

### What is this approach?

**Intuition:** To organize a messy pile of 1000 papers, split it in half. Organize each half (by the same method — split again). Once you have small organized piles, merge them by picking the top paper from whichever pile has the smaller value. This merging of two sorted halves IS the key insight.

**Formal:** Divide the array into two halves, recursively sort each half, then merge the two sorted halves. The "merge" step is where all the interesting work happens — and it is the step that solves many problems beyond just sorting.

### When should I use this?

- You need a **stable** O(n log n) sort
- The problem is secretly about the **merge step**: counting inversions, counting smaller elements after self, etc.
- You need to apply **divide-and-conquer** where combining sorted halves gives useful information
- Keywords: "count inversions," "count of smaller numbers after self," "merge sort"

### When should I NOT use this?

- A simpler sort suffices and you don't need the merge-step pattern
- The problem doesn't benefit from divide-and-conquer thinking
- You need in-place sorting with O(1) space — merge sort uses O(n) space

### Core Idea

1. **Divide:** Split array at midpoint
2. **Conquer:** Recursively sort left and right halves
3. **Combine (Merge):** Walk two pointers through the sorted halves, producing a merged sorted result

**The pattern insight:** During the merge step, every time you pick from the RIGHT half before the LEFT is exhausted, you know something about the relationship between elements — this is how you count inversions.

### Complexity

- **Time:** O(n log n) — log n levels of recursion, each level does O(n) merge work
- **Space:** O(n) for the temporary merge array

**Why exactly n log n?** The recursion tree has log n levels. At each level, every element participates in exactly one merge. Each merge is linear. Total: n × log n.

### Variants

- **Standard Merge Sort:** Sort an array in O(n log n) time, stable
- **Count Inversions:** An inversion is a pair (i, j) where i < j but arr[i] > arr[j]. During merge, when you pick from the right half, the number of remaining elements in the left half = inversions caused by this element. Count them during merge.
- **Count of Smaller Numbers After Self:** For each element, count how many smaller elements appear to its right. Merge sort with index tracking.
- **Merge Sort on Linked Lists:** Particularly natural because merging linked lists is O(1) space (just re-link pointers). Find midpoint with slow/fast pointer.
- **External Sort:** When data doesn't fit in memory. Merge sort's sequential access pattern is ideal for disk I/O.

### Related Patterns

- [Merge K Sorted Lists](12-HEAPS-AND-PRIORITY-QUEUES.md) (merge step generalized to K lists)
- [Quick Sort](#quick-sort--partitioning) (the other great O(n log n) sort — different core idea)
- [Divide and Conquer](08-RECURSION-AND-BACKTRACKING.md) (general paradigm)

### Interview Insights

- **Trap:** Counting inversions with brute force is O(n²). Merge sort brings it to O(n log n). Recognize this pattern.
- **Twist:** "Count of Smaller Numbers After Self" — Harder variant because you need to tracking original indices through the merge process.
- **Follow-up:** "Can you sort a linked list in O(n log n)?" — Merge sort is ideal here (O(1) extra space for linked list merge).

---

## Quick Sort & Partitioning

### What is this approach?

**Intuition:** Pick any element (the "pivot"). Rearrange everything smaller to its left and everything larger to its right. Now the pivot is in its final sorted position. Recursively do the same for the left group and the right group.

**Formal:** Choose a pivot, partition the array so elements ≤ pivot are on the left and elements > pivot are on the right. The pivot is now at its final position. Recursively sort the left and right partitions.

### When should I use this?

- You need in-place sorting with good average performance
- The **partitioning step** is the useful operation (Quick Select, below)
- You are building a custom partitioning scheme (three-way partition, etc.)

### When should I NOT use this?

- You need a **stable** sort — Quick Sort is not stable
- You need **guaranteed** O(n log n) — Quick Sort's worst case is O(n²)
- You are sorting a linked list — Merge Sort is better

### Core Idea

1. Choose a pivot (last element, random, or median-of-three)
2. **Partition:** Rearrange array so that all elements ≤ pivot are on the left, all > pivot on the right
3. Place pivot at the boundary (its final sorted position)
4. Recursively sort left and right subarrays

**Partitioning (Lomuto scheme):**
- Maintain a boundary index `i`. Scan with `j`.
- If arr[j] ≤ pivot, swap arr[i] and arr[j], advance i.
- After scanning, swap pivot into position i.

**Partitioning (Hoare scheme):**
- Two pointers from both ends, moving toward each other, swapping when they find out-of-place elements.
- More efficient (fewer swaps) but trickier to implement.

### Complexity

- **Time:** O(n log n) average, O(n²) worst case (sorted array with bad pivot)
- **Space:** O(log n) average (recursion stack), O(n) worst case
- **Randomized pivot** makes worst case extremely unlikely

### Variants

- **Randomized Quick Sort:** Choose pivot randomly to avoid worst case
- **Three-Way Partition (Dutch National Flag Quick Sort):** Handles duplicates efficiently by partitioning into <, =, > regions
- **Tail-Call Optimization:** Recurse on the smaller partition first, iterate on the larger

### Related Patterns

- [Quick Select](#quick-select--kth-element) (the selection algorithm derived from partitioning)
- [Dutch National Flag](02-ARRAYS-AND-STRINGS.md#dutch-national-flag--three-way-partition) (three-way partition)
- [Merge Sort](#merge-sort--divide-and-conquer-patterns) (alternative O(n log n) sort)

### Interview Insights

- **Trap:** Not handling the worst case. Always mention randomized pivot selection.
- **Twist:** "What if there are many duplicates?" — Three-way partition handles this, reducing Quick Sort's O(n²) on all-equal arrays to O(n).
- **Note:** In interviews, the partitioning step is more important than the full Quick Sort. It's the building block for Quick Select.

---

## Quick Select — Kth Element

### What is this approach?

**Intuition:** You need the 5th smallest playing card from a shuffled deck. Pick a random card (pivot), split the deck into "smaller" and "larger." Count the smaller pile. If it has 4 cards, the pivot is your answer. If more than 4, the answer is in the smaller pile. If fewer, the answer is in the larger pile. You never need to fully sort.

**Formal:** Find the Kth smallest (or largest) element without fully sorting. Use Quick Sort's partitioning step. After partitioning, the pivot is at its final position p. If p == K, done. If p > K, recurse on the left. If p < K, recurse on the right. Only recurse on ONE side.

### When should I use this?

- Find the **Kth smallest** or **Kth largest** element
- Find the **median** (K = n/2)
- You want **average O(n)** time without fully sorting
- Keywords: "kth largest," "kth smallest," "median," "top K" (when you need the Kth, not all K)

### When should I NOT use this?

- You need a **guaranteed** O(n log n) — Quick Select's worst case is O(n²) (use heap for guaranteed O(n log K) or intro-select for guaranteed O(n))
- You need **all Top-K elements sorted** — Quick Select gives Kth element but doesn't sort the top K. Use Heap for sorted Top-K.
- The data is a stream — Quick Select needs all data upfront

### Core Idea

1. Choose a random pivot, partition the array
2. Let p = pivot's final index
3. If p == K, return arr[p]
4. If K < p, recurse on left [lo, p-1]
5. If K > p, recurse on right [p+1, hi]

**Mental model:** It's like Quick Sort, but you're lazy — you only sort the half that contains what you need.

### Complexity

- **Time:** O(n) average, O(n²) worst case
- **Space:** O(1) if iterative (tail recursion), O(n) worst case recursive

**Why O(n) average?** Each recursive call works on roughly half the data: n + n/2 + n/4 + ... = 2n = O(n).

**Median-of-Medians:** A deterministic variant that guarantees O(n) worst case. Rarely needed in interviews but good to mention.

### Variants

- **Kth Smallest Element:** Direct application
- **Kth Largest Element:** K → n - K (or use max-partition)
- **Median:** K = n/2
- **Top K Elements (unsorted):** After Quick Select for Kth, all elements in [0, K-1] are ≤ K (but not sorted among themselves)

### Related Patterns

- [Quick Sort & Partitioning](#quick-sort--partitioning) (same partition subroutine)
- [Heaps / Top-K](12-HEAPS-AND-PRIORITY-QUEUES.md) (alternative for top K)
- [Binary Search on Answer](03-SEARCHING-TECHNIQUES.md#binary-search-on-answer-parametric-search) (alternative for Kth-related optimization)

### Interview Insights

- **Trap:** Worst case O(n²). Always mention randomized pivot. If interviewer pushes, mention median-of-medians for guaranteed O(n).
- **Twist:** "Find the Kth largest" — Just K → n - K for Kth smallest. Or negate all values.
- **Follow-up:** "What if the data is streaming?" — Quick Select doesn't work. Use a heap of size K instead.

---

## Counting Sort

### What is this approach?

**Intuition:** If students all have grades from 0 to 100, don't compare them to sort — just count how many got each grade, then rebuild the list from the counts.

**Formal:** Count the frequency of each value in the array. Then reconstruct the sorted array by outputting each value according to its count. Works when values are in a known, limited range.

### When should I use this?

- Values are in a **small, bounded range** [0, K] where K is reasonable
- You need **O(n + K)** sorting when K is small
- Sorting as a preprocessing step when values are bounded
- Keywords: "sort colors" (three values), "sort by frequency," "bucket," "limited range"

### When should I NOT use this?

- Values span a huge range (K >> n) — wastes space on empty counts
- Values are floating point or complex objects (can't index by value)
- You need a stable sort but the basic version isn't set up for it (the stable version exists but adds complexity)

### Core Idea

1. Find the maximum value K in the array
2. Create a count array of size K+1, initialized to 0
3. Count occurrences: for each element, count[element]++
4. Reconstruct: iterate through count array, output each value count[i] times

### Complexity

- **Time:** O(n + K) where K is the range of values
- **Space:** O(K) for the count array

**Why faster than O(n log n)?** It doesn't compare elements. It uses values as indices. This breaks the comparison-sort lower bound of Ω(n log n).

### Variants

- **Basic Counting Sort:** As described above
- **Stable Counting Sort:** Use cumulative counts to determine output positions, preserving relative order of equal elements
- **Sort Colors (0, 1, 2):** Counting sort with K=2 (or Dutch National Flag for single-pass)

### Related Patterns

- [Radix Sort](#radix-sort) (uses counting sort as a subroutine)
- [Bucket Sort](#bucket-sort) (similar idea, different bucketing)
- [Dutch National Flag](02-ARRAYS-AND-STRINGS.md#dutch-national-flag--three-way-partition) (in-place alternative for small K)

### Interview Insights

- **Trap:** Assuming you always need comparison-based sorting. When values are bounded, counting sort is strictly better.
- **Twist:** "Sort given that values are in range [0, 9]" — Counting sort is the optimal answer, not quicksort.

---

## Radix Sort

### What is this approach?

**Intuition:** To sort a stack of papers by 3-digit numbers, first sort by the last digit, then by the middle digit, then by the first digit — each time using a stable sort (like counting sort). After processing all digits, the entire stack is sorted.

**Formal:** Sort elements by processing from the least significant digit to the most significant digit, using a stable sort (typically counting sort) at each digit position.

### When should I use this?

- Sorting **integers** or **fixed-length strings**
- N is large but the number of digits D is small
- You want **O(D × (n + K))** where D = digits, K = base (typically 10)
- Keywords: "sort large numbers of bounded-length integers"

### When should I NOT use this?

- Elements vary widely in length (variable-length strings without padding)
- The number of digits is proportional to n (then it's not better than O(n log n))
- You're sorting arbitrary objects without a natural digit decomposition

### Core Idea

1. Find the maximum element to determine the number of digits D
2. For each digit position (from least significant to most significant):
   - Apply counting sort using only that digit as the key
   - The sort MUST be stable (elements with equal digits maintain their relative order from the previous pass)
3. After D passes, the array is sorted

### Complexity

- **Time:** O(D × (n + K)) where D = number of digits, K = base
- **Space:** O(n + K)

### Variants

- **LSD Radix Sort:** Least Significant Digit first (most common)
- **MSD Radix Sort:** Most Significant Digit first (like sorting strings lexicographically)
- **Maximum Gap:** "Given unsorted array, find max difference between consecutive elements in sorted form." Use radix/bucket sort idea to solve in O(n).

### Related Patterns

- [Counting Sort](#counting-sort) (the subroutine)
- [Bucket Sort](#bucket-sort) (similar non-comparison approach)

### Interview Insights

- **Trap:** Forgetting that each digit-level sort MUST be stable. If not stable, earlier passes get scrambled.
- **Note:** Radix sort is rarely asked directly in FAANG interviews, but the concept of "sorting by digit/character" appears in string problems.

---

## Bucket Sort

### What is this approach?

**Intuition:** If students' heights range from 150cm to 200cm, create 5 buckets (150-159, 160-169, etc.). Put each student in their bucket. Sort within each bucket. Concatenate. Because each bucket is small, the total work is less than sorting the entire array.

**Formal:** Distribute elements into a fixed number of "buckets" based on value ranges. Sort each bucket individually. Concatenate all buckets. When elements are uniformly distributed, each bucket has ≈ n/k elements, and sorting each is fast.

### When should I use this?

- Values are **uniformly distributed** over a known range
- You want **average O(n)** when distribution is uniform
- "Find the maximum gap between consecutive elements in sorted order" — bucket-based approach avoids full sorting
- Keywords: "uniform distribution," "maximum gap," "top frequent"

### When should I NOT use this?

- Values cluster in one region (all elements in one bucket → O(n log n) for that bucket)
- You need worst-case guarantees

### Core Idea

1. Determine the range [min, max] and the number of buckets B
2. Bucket width = (max - min + 1) / B
3. Place each element in bucket index = (element - min) / width
4. Sort each bucket (insertion sort for small buckets)
5. Concatenate all buckets

### Complexity

- **Time:** O(n) average when uniformly distributed; O(n log n) worst case
- **Space:** O(n + B)

### Variants

- **Maximum Gap Problem:** Create n buckets. The maximum gap must occur between buckets (not within). Track only min/max per bucket. O(n) time, O(n) space.
- **Top K Frequent Elements:** Use bucket sort on frequencies. Bucket index = frequency. O(n) time.

### Related Patterns

- [Counting Sort](#counting-sort) (special case where each "bucket" is one value)
- [Radix Sort](#radix-sort) (uses buckets at each digit level)
- [Heaps](12-HEAPS-AND-PRIORITY-QUEUES.md) (alternative for Top K)

### Interview Insights

- **Trap:** The "maximum gap" problem. Many try to sort. The O(n) bucket approach is the optimal solution.
- **Twist:** "Top K Frequent Elements in O(n)" — Use frequency as bucket index. Bucket[freq] contains all elements with that frequency. Scan buckets from high to low.

---

## Cyclic Sort

### What is this approach?

**Intuition:** You have boxes numbered 1 through N, and balls numbered 1 through N scattered randomly in them. The simplest fix: go through each box. If box #i has ball #j (and j ≠ i), swap ball #j into box #j. Keep swapping from the current box until it has the right ball. Then move to the next box.

**Formal:** When elements are in the range [1, n] (or [0, n-1]), each element has a "correct" position. Cycle through the array, placing each element at its correct index via swaps. After the pass, any index where the element doesn't match reveals a missing or duplicate number.

### When should I use this?

- Elements are in a **contiguous range** [1, n] or [0, n-1]
- Finding **missing numbers**, **duplicate numbers**, or **first missing positive**
- In-place with O(1) extra space
- Keywords: "missing number," "find duplicate," "find all duplicates," "first missing positive," "numbers in range 1 to n"

### When should I NOT use this?

- Values are NOT in a bounded range — cyclic sort requires a known range to determine "correct positions"
- The problem asks for something other than missing/duplicate identification
- You can use XOR or math (sum formula) for simpler cases

### Core Idea

1. Iterate through the array with index i
2. While arr[i] is not at its correct position (arr[i] != i + 1 for 1-based):
   - Swap arr[i] with arr[arr[i] - 1] (put arr[i] where it belongs)
   - If arr[i] == arr[arr[i] - 1], break (duplicate detected — can't place, move on)
3. After the full pass, scan: any index where arr[i] != i + 1 is a missing number

### Complexity

- **Time:** O(n) — each element is swapped at most once to its correct position
- **Space:** O(1)

**Why O(n)?** Each swap places at least one element in its final position. At most n swaps total across the entire array.

### Variants

- **Find the Missing Number (range [0, n]):** Place each element at index = value. The empty slot is the missing number.
- **Find All Missing Numbers:** After cyclic sort, all indices where arr[i] != i+1 are missing.
- **Find the Duplicate Number:** During cyclic sort, when you try to swap and the destination already has the correct value, you've found the duplicate.
- **Find All Duplicates:** After cyclic sort, indices where arr[i] != i+1 — arr[i] is a duplicate.
- **First Missing Positive:** Only place positive integers in range [1, n]. Ignore others. After placement, the first index where arr[i] != i+1 gives the first missing positive.
- **Find Corrupt Pair (one missing, one duplicated):** After cyclic sort, the misplaced element is the duplicate, and the expected element at that index is the missing one.

### Related Patterns

- [In-Place Array Manipulation](02-ARRAYS-AND-STRINGS.md#in-place-array-manipulation) (same philosophy of using the array as its own hash table)
- [Bit Manipulation / XOR](14-BIT-MANIPULATION.md) (alternative for single missing/duplicate)
- [Hashing](05-HASHING-AND-SETS.md) (O(n) space alternative)

### Interview Insights

- **Trap:** "First Missing Positive" is hard because you must handle negative numbers and values > n. The key insight: the first missing positive must be in [1, n+1]. Only place values in this range.
- **Twist:** "What if the range is [0, n] instead of [1, n]?" — Adjust the "correct position" formula. arr[i] should be at index arr[i].
- **Follow-up:** "Can you find the duplicate without modifying the array?" — Floyd's cycle detection (treat values as pointers). See Linked Lists.

---

## Custom Comparators

### What is this approach?

**Intuition:** Sometimes the problem requires sorting by a rule that isn't simple numeric order. "Largest Number" asks you to arrange numbers so the concatenation is maximized. You need a custom ordering rule: compare AB vs BA.

**Formal:** Define a custom comparison function for sorting. Instead of default a < b, define a rule like "a should come before b if some_condition(a, b)." Pass this custom comparator to the sorting function.

### When should I use this?

- The sort order depends on a **non-standard criterion**
- The problem requires a specific ordering for optimization
- Keywords: "arrange to form largest number," "sort by... then by...," "custom order"

### When should I NOT use this?

- Standard numeric or lexicographic sort suffices
- The ordering requires global information (not just pairwise comparison) — might need bucket sort or topological sort instead

### Core Idea

1. Define the comparison rule: given two elements a and b, which should come first?
2. Pass this rule to the sorting function
3. The comparison must be **transitive** (if a < b and b < c, then a < c) — otherwise the sort is ill-defined

**For "Largest Number":** Compare by string concatenation: a comes before b if str(a) + str(b) > str(b) + str(a).

### Complexity

- **Time:** O(n log n) — sorting with a custom comparator has the same complexity as normal sorting
- **Space:** O(n) or O(log n) depending on the sorting algorithm

### Variants

- **Largest Number:** Sort strings by concatenation comparison
- **Meeting Rooms / Interval Sort:** Sort by start time, break ties by end time
- **Relative Sort Array:** Sort based on a reference ordering + standard order for the rest
- **Custom Frequency Sort:** Sort by frequency (descending), then by value (ascending)

### Related Patterns

- [Sorting as Preprocessing](#sorting-as-preprocessing) (sorting is the setup, not the answer)
- [Greedy Algorithms](13-GREEDY-ALGORITHMS.md) (custom sort order often enables greedy solutions)

### Interview Insights

- **Trap:** Not proving transitivity of the comparator. For "Largest Number," you must argue that if AB > BA and BC > CB, then AC > CA.
- **Twist:** "Sort but maintain original order for ties" — You need a **stable** sort.
- **Follow-up:** "What if two elements always compare equal but should have a specific relative order?" — This is a topological sort constraint, not a comparison sort.

---

## Sorting as Preprocessing

### What is this approach?

This is not a specific algorithm but a **meta-pattern**: sort the array first to enable a faster algorithm.

### Common Preprocessing Patterns

| After Sorting, You Can... | Example Problem |
|---|---|
| Use two pointers for pair finding | 3Sum, 4Sum |
| Binary search for targets | Two Sum (sorted), Search Insert Position |
| Identify clusters/groups | Group consecutive numbers |
| Enable greedy processing | Activity Selection, Meeting Rooms |
| Simplify duplicate handling | Remove Duplicates, 3Sum (skip equal) |
| Find gaps and ranges | Missing ranges, Maximum Gap (with bucket) |

### When to sort

- The problem doesn't depend on original index order, OR you can save indices before sorting
- Sorting enables a clear O(n) or O(n log n) follow-up pass
- The O(n log n) sorting cost is acceptable given the problem constraints

### When NOT to sort

- Original order matters (subarray problems, sliding window) and you need original indices
- You can do better without sorting (hashing gives O(n) for Two Sum)
- The problem is already about a sorted structure (BST, sorted array)

### Interview Insights

- **Trap:** Sorting when it destroys needed information (original indices). Save indices first if needed.
- **Key insight:** When you can't think of an approach, ask: "What if this were sorted?" Often, sorting reveals the structure.

---

*Next: [05-HASHING-AND-SETS.md](05-HASHING-AND-SETS.md) — The universal optimizer: trade space for time.*
