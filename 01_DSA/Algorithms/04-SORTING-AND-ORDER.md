# Sorting & Order Statistics — 1-Hour Learning Module

> *"Sorting is rarely the answer, but it is often the first step toward the answer."*

**Estimated time:** 60 minutes  
**Goal:** Understand when and why to use each sorting approach at a Google SWE interview.

---

## Table of Contents

- [\[0–10 min\] Big Picture](#010-min-big-picture)
- [\[10–20 min\] Mental Model](#1020-min-mental-model)
- [\[20–35 min\] Core Patterns](#2035-min-core-patterns)
- [\[35–45 min\] Concrete Code + Dry Runs](#3545-min-concrete-code--dry-runs)
- [\[45–55 min\] Pattern Recognition](#4555-min-pattern-recognition)
- [\[55–60 min\] Final Mental Checklist](#5560-min-final-mental-checklist)
- [Active Recall](#active-recall)
- [Recommended Practice Direction](#recommended-practice-direction)
- [2-Minute Cheat Sheet](#2-minute-cheat-sheet)

---

## [0–10 min] Big Picture

### What is sorting and why does it exist?

Imagine you have 1,000 student records in random order. You want to find a specific student by name. Without order, you must check every record — 1,000 lookups in the worst case. Once sorted alphabetically, you can find any student with binary search in just 10 lookups (log₂ 1000 ≈ 10). Sorting transforms chaos into structure, and structure enables faster algorithms.

**The real insight for interviews:** Sorting is almost never the final answer. It is the preprocessing step that makes your actual algorithm possible.

### Real-world analogy

A deck of cards in random order. You cannot do much with it. Once sorted by suit and rank, you can cut to any card in seconds, find pairs, spot patterns. The cost of sorting (one-time effort) is paid back many times over by every subsequent operation.

### What problem does each variant solve?

| Approach | Core problem it solves |
|---|---|
| Merge Sort | Stable, predictable O(n log n); enables counting inversions during merge |
| Quick Sort | In-place O(n log n) average; the partition step is a building block |
| Quick Select | Find the Kth element in O(n) average WITHOUT sorting everything |
| Counting Sort | Sort bounded-range integers faster than O(n log n) |
| Radix Sort | Sort fixed-length integers/strings in O(D × n) |
| Bucket Sort | Sort uniformly distributed values in O(n) average |
| Cyclic Sort | Find missing/duplicate numbers in [1,n] with O(1) space |
| Custom Comparator | Sort by a non-standard rule (e.g. maximize concatenated number) |

---

## [10–20 min] Mental Model

### The comparison-based lower bound — why O(n log n) is the wall

Think about sorting n distinct elements. Every comparison splits the remaining possibilities: "is A before B or after B?" You need enough comparisons to distinguish n! possible orderings.

```
n! orderings need to be resolved.
A binary decision tree of depth d can separate at most 2^d orderings.
We need 2^d >= n!, so d >= log2(n!) ≈ n log n.
```

This means: **any algorithm that only compares elements cannot beat O(n log n) in the worst case.** This is a proven mathematical lower bound.

The only way to beat O(n log n) is to exploit extra information about the values — their range (counting sort), their digits (radix sort), or their distribution (bucket sort).

### Stable vs Unstable sorting

**Simple explanation:** Sorting is "stable" if equal elements keep their original relative order after sorting.

Example: Sort `[(Alice, 90), (Bob, 90), (Carol, 85)]` by grade descending.
- Stable result: `[(Alice, 90), (Bob, 90), (Carol, 85)]` — Alice still before Bob.
- Unstable result: `[(Bob, 90), (Alice, 90), (Carol, 85)]` — order of ties not preserved.

Stability matters when you sort by multiple keys in sequence (e.g. sort by grade, then by name — you sort by name first using a stable sort, then by grade).

| Algorithm | Stable? | In-place? |
|---|---|---|
| Merge Sort | Yes | No (O(n) space) |
| Quick Sort | No | Yes (O(log n) stack) |
| Counting Sort | Yes (careful version) | No |
| Radix Sort | Yes (if using stable sub-sort) | No |
| Cyclic Sort | No | Yes |

### The three families of sorting

```
SORTING ALGORITHMS
│
├── Comparison-based (lower bound: Ω(n log n))
│   ├── Merge Sort   — divide & conquer, stable, O(n) space
│   └── Quick Sort   — partition, in-place, O(n²) worst case
│
├── Non-comparison (can beat Ω(n log n))
│   ├── Counting Sort — needs bounded range [0, K]
│   ├── Radix Sort    — needs fixed number of digits
│   └── Bucket Sort   — needs known, near-uniform distribution
│
└── Index-placement (use value as address)
    └── Cyclic Sort   — needs range [1, n] or [0, n-1]
```

### What state do we maintain, and why?

Each algorithm maintains a different invariant:

- **Merge Sort:** After each level of recursion, subarrays are sorted. The invariant is: *the left and right halves fed into each merge call are already sorted.*
- **Quick Sort:** After partition, the pivot is at its final position. *Elements left of pivot ≤ pivot ≤ elements right of pivot.*
- **Counting Sort:** The count array accurately reflects the frequency of each value. *count[v] = number of times v appears in input.*
- **Cyclic Sort:** After the main pass, every element that could be placed correctly is at its correct index. *arr[i] == i+1 for all correctly-placed elements.*

---

## [20–35 min] Core Patterns

### Pattern 1: Merge Sort & Divide-and-Conquer

**Brute force thought:** To find where each element belongs in a sorted list, you could compare it to every other element — O(n²). Too slow.

**Key observation:** If you have two already-sorted halves, merging them takes only O(n): just walk two pointers, always picking the smaller front element. The sorting work is done by the recursive structure.

**How to derive the algorithm (not memorize it):**
1. A single element is trivially sorted.
2. Two sorted halves can be merged in O(n).
3. Therefore: split until trivial, then merge back up.

```
Array: [5, 2, 4, 1, 3]

                [5,2,4,1,3]
               /           \
           [5,2,4]         [1,3]
           /     \         /   \
         [5,2]  [4]      [1]  [3]
         /   \
       [5]  [2]

Merge up:
[2,5] ← merge [5],[2]
[2,4,5] ← merge [2,5],[4]
[1,3] ← merge [1],[3]
[1,2,3,4,5] ← merge [2,4,5],[1,3]
```

**Why O(n log n)?** The tree has log n levels. At every level, every element participates in exactly one merge. Each level's total merge work = O(n). Multiply: n × log n.

**The merge-step insight (critical for interviews):** During the merge, every time you pick an element from the RIGHT half before exhausting the LEFT half, you know that this right-side element is smaller than all remaining left-side elements. This is how you count inversions. Every element remaining in the left half at that moment forms an inversion with the current right-side element.

**Variants:**
- Standard Merge Sort: stable O(n log n) sort
- Count Inversions: pair (i,j) where i < j but arr[i] > arr[j]. Count during merge: when picking from right half, add `leftRemaining` to inversion count.
- Count of Smaller Numbers After Self: same idea, but track original indices through the merge.
- Merge Sort on Linked Lists: natural fit — merging linked lists is O(1) extra space (re-link pointers). Find midpoint with slow/fast pointer.

**When to use:** Stable sort needed; problem involves the merge step (inversions, count smaller); dividing into halves reveals structure.

**When NOT to use:** O(n) space is unacceptable; simpler sort suffices; in-place required.

---

### Pattern 2: Quick Sort & Partitioning

**Brute force thought:** Compare every element to every other — O(n²).

**Key observation:** If you can place ONE element in its correct final position, you can recurse on the two sides independently. Partition does exactly this for the pivot.

**How to derive the partition step:**
- Goal: all elements ≤ pivot on left, all elements > pivot on right, pivot in the middle.
- Maintain a boundary `i` = rightmost index of "≤ pivot" region.
- Scan `j` from left to right. When arr[j] ≤ pivot: expand region by swapping arr[i+1] and arr[j].
- After scan: swap pivot into position i+1.

```
arr: [3, 6, 8, 10, 1, 2, 1]  pivot = arr[last] = 1
      i                 j

Scan:
arr[j]=3 > 1, skip. arr[j]=6 > 1, skip. ... arr[j]=1 ≤ 1, swap → expand region.
After: pivot placed at correct position.
```

**Why O(n log n) average?** If pivot lands near the middle each time, the recursion tree has log n levels, each with O(n) total partition work. Random pivot selection makes this expected behavior.

**Why O(n²) worst case?** If pivot is always the min or max (e.g. already-sorted array with last-element pivot), one partition has n-1 elements and one has 0. This degrades to O(n²). Randomized pivot selection eliminates this.

**Three-way partition (Dutch National Flag):** For arrays with many duplicates, partition into three regions: < pivot, == pivot, > pivot. Elements equal to pivot are all in their final position after one pass. This makes Quick Sort O(n) on all-equal arrays.

**When to use:** In-place sorting; building Quick Select; implementing custom partitioning.

**When NOT to use:** Stable sort required; guaranteed O(n log n) needed; sorting linked lists.

---

### Pattern 3: Quick Select — Kth Element

**Brute force:** Sort the whole array, return arr[K-1]. O(n log n).

**Key observation:** After partitioning, the pivot is at its FINAL sorted position p. If p == K, you're done. You only need to recurse on ONE side (the side containing index K). You never sort the irrelevant side.

**How to derive from Quick Sort:**
- Quick Sort recurses on BOTH sides.
- Quick Select recurses on only ONE side — the side that contains K.

```
Find 3rd smallest in [7, 2, 1, 6, 5]:

Partition → pivot=5 lands at index 3: [2,1,??,5,7] (simplified)
K=3, p=3 → p > K, so search left side [2,1,??]
Partition → pivot lands at index 2: [1,2,5,5,7]
K=3, p=2 → p < K... 

Actually K is 1-indexed so adjust to 0-indexed K=2:
When p==K return arr[p].
```

**Why O(n) average?** Each call reduces problem size roughly by half: n + n/2 + n/4 + ... = 2n = O(n).

**Why O(n²) worst case?** Same reason as Quick Sort — bad pivot. Randomize to avoid.

**Median-of-Medians:** A deterministic algorithm guaranteeing O(n) worst case by choosing a "good" pivot. Rarely needed in interviews, but worth knowing the name.

**When to use:** Find Kth smallest/largest; find median; top K elements (not sorted).

**When NOT to use:** Need all top-K sorted (use heap); data is streaming (use heap of size K); need guaranteed O(n log n) (use heap for O(n log K)).

---

### Pattern 4: Counting Sort

**Brute force:** Any comparison sort gives O(n log n).

**Key observation:** If values are integers in [0, K], you can use the value itself as an array index. No comparisons needed. Just count occurrences, then reconstruct.

```
Input: [3, 1, 4, 1, 5, 9, 2, 6, 5] — values in [0,9]

count: [0, 2, 1, 1, 1, 2, 1, 0, 0, 1]
index:  0  1  2  3  4  5  6  7  8  9

Reconstruct: 1,1,2,3,4,5,5,6,9
```

**Why faster than O(n log n)?** It never compares elements. It breaks the Ω(n log n) comparison lower bound by using extra information: values are bounded integers. Time is O(n + K). When K = O(n), this is O(n).

**When to use:** Small bounded integer range [0, K]; sorting by frequency; preprocessing for radix sort.

**When NOT to use:** K >> n (wastes space); floating point values; complex objects.

---

### Pattern 5: Radix Sort

**Key observation:** You can decompose a number into its digits. Sort digit-by-digit from least significant to most significant, using a stable sort (counting sort) at each position. After D passes, the array is globally sorted.

**Why least-significant first?** If you sort by the most significant digit first, you need to handle each bucket recursively. Sorting LSD to MSD with a stable sort means that results from earlier passes are preserved correctly by later passes.

**Critical requirement:** Each digit-level sort MUST be stable. If not stable, earlier passes get scrambled by later ones.

**Complexity:** O(D × (n + K)) where D = number of digits, K = base (10 for decimal). When D is small and K = 10, this is effectively O(n).

**When to use:** Sorting large arrays of bounded-length integers; fixed-length strings.

**When NOT to use:** Variable-length data without padding; D proportional to n.

---

### Pattern 6: Bucket Sort

**Key observation:** If values are uniformly distributed in [min, max], create n buckets of equal width. Each bucket will have ≈ 1 element on average. Sorting within each tiny bucket is nearly free. Concatenate for the final result.

**Maximum Gap insight:** If you have n numbers in [min, max], create n buckets. The maximum gap between consecutive sorted elements MUST occur between two non-empty consecutive buckets, not within a bucket (by pigeonhole). So: track only min and max per bucket, then compare adjacent buckets. O(n) solution without sorting.

**Top K Frequent Elements:** Use frequency as the bucket index. bucket[freq] = list of elements with that frequency. Scan from high frequency to low frequency to get top K. O(n) time.

**When to use:** Uniform distribution over known range; maximum gap problem; top K frequent elements in O(n).

**When NOT to use:** Clustered values (one bucket gets everything); worst-case guarantees needed.

---

### Pattern 7: Cyclic Sort

**Brute force for "find missing number":** Hash set, O(n) space. Or sort, O(n log n) time.

**Key observation:** If values are in [1, n], each value has a "correct" position: value v belongs at index v-1. We can place elements at their correct positions using only swaps — O(1) space. After one pass, any index where arr[i] != i+1 reveals a missing or duplicate value.

```
[3, 1, 2] — values in [1,3]

i=0: arr[0]=3, correct position is index 2. Swap arr[0] and arr[2].
     → [2, 1, 3]
i=0: arr[0]=2, correct position is index 1. Swap arr[0] and arr[1].
     → [1, 2, 3]
i=0: arr[0]=1, correct. Move i=1.
i=1: arr[1]=2, correct. Move i=2.
i=2: arr[2]=3, correct. Done.
Scan: all correct → no missing number.
```

**Why O(n)?** Each swap places at least one element at its final correct position. At most n total swaps across the entire array. The outer loop also runs n times. Total: O(n).

**Duplicate detection:** If during a swap, arr[i] == arr[arr[i]-1] (destination already has the right value), the current value is a duplicate. Break and move on.

**Variants:**
- Find missing number (range [0,n]): place at index = value
- Find all missing numbers: after pass, collect all i where arr[i] != i+1
- Find the duplicate: the value that collides during placement
- Find all duplicates: after pass, arr[i] at wrong index — arr[i] is the duplicate
- First missing positive: only place values in [1,n]; ignore others; first wrong index gives answer

**When to use:** Values in contiguous range [1,n] or [0,n-1]; find missing/duplicate; O(1) space required.

**When NOT to use:** Values not in bounded range; problem is not about missing/duplicate detection.

---

### Pattern 8: Custom Comparators

**The problem:** You need a non-standard sort order. Example: arrange numbers to form the largest possible concatenated number.

**Key insight:** Define a pairwise comparison function. a "comes before" b if placing a before b produces a better result than placing b before a. For "Largest Number": a comes before b if str(a)+str(b) > str(b)+str(a).

**Critical requirement:** The comparator must be transitive. If a < b and b < c, then a < c must hold. If not, the sort is mathematically undefined (the result is implementation-dependent and likely wrong). For "Largest Number," transitivity can be proven but is not obvious.

**Variants:**
- Largest Number: compare by string concatenation
- Interval sort: sort by start time, break ties by end time
- Relative Sort Array: sort by reference ordering, then standard order for remainder
- Frequency sort: sort by frequency descending, then by value ascending

**When to use:** Non-standard sort criterion; optimization problems where order is the key decision.

**When NOT to use:** Standard numeric/lexicographic sort suffices; ordering requires global context (use topological sort instead).

---

### Sorting as Preprocessing (Meta-Pattern)

This is not a specific algorithm. It is the habit of asking: "Would this problem become easier if the input were sorted?"

| After Sorting, You Can... | Example Problem |
|---|---|
| Use two pointers for pair finding | 3Sum, 4Sum |
| Binary search for targets | Two Sum (sorted), Search Insert Position |
| Identify clusters and groups | Group consecutive numbers |
| Enable greedy processing | Activity Selection, Meeting Rooms |
| Simplify duplicate handling | Remove Duplicates, 3Sum (skip equal elements) |
| Find gaps and ranges | Missing ranges, Maximum Gap (with bucket) |

**When to sort:** Original index order does not matter (or you can save indices before sorting); O(n log n) sorting cost is acceptable.

**When NOT to sort:** Original order matters (subarray problems, sliding window); hashing gives O(n) without sorting (e.g. Two Sum); the structure is already sorted.

---

## [35–45 min] Concrete Code + Dry Runs

### Example 1: Merge Sort (with Inversion Count)

**Problem:** Count the number of inversions in `[5, 3, 1, 4, 2]`. An inversion is a pair (i, j) where i < j but arr[i] > arr[j].

**Expected output:** 7 inversions: (5,3),(5,1),(5,4),(5,2),(3,1),(3,2),(4,2)

**Java:**
```java
int mergeSort(int[] arr, int[] temp, int left, int right) {
    if (left >= right) return 0;
    int mid = left + (right - left) / 2;
    int count = 0;
    count += mergeSort(arr, temp, left, mid);
    count += mergeSort(arr, temp, mid + 1, right);
    count += merge(arr, temp, left, mid, right);
    return count;
}

int merge(int[] arr, int[] temp, int left, int mid, int right) {
    for (int k = left; k <= right; k++) temp[k] = arr[k];
    int i = left, j = mid + 1, k = left, inversions = 0;
    while (i <= mid && j <= right) {
        if (temp[i] <= temp[j]) {
            arr[k++] = temp[i++];
        } else {
            arr[k++] = temp[j++];
            inversions += (mid - i + 1);
        }
    }
    while (i <= mid) arr[k++] = temp[i++];
    while (j <= right) arr[k++] = temp[j++];
    return inversions;
}
```

**JavaScript:**
```javascript
function mergeSort(arr, left, right) {
    if (left >= right) return 0;
    const mid = Math.floor((left + right) / 2);
    let count = 0;
    count += mergeSort(arr, left, mid);
    count += mergeSort(arr, mid + 1, right);
    count += merge(arr, left, mid, right);
    return count;
}

function merge(arr, left, mid, right) {
    const leftHalf = arr.slice(left, mid + 1);
    const rightHalf = arr.slice(mid + 1, right + 1);
    let i = 0, j = 0, k = left, inversions = 0;
    while (i < leftHalf.length && j < rightHalf.length) {
        if (leftHalf[i] <= rightHalf[j]) {
            arr[k++] = leftHalf[i++];
        } else {
            arr[k++] = rightHalf[j++];
            inversions += leftHalf.length - i;
        }
    }
    while (i < leftHalf.length) arr[k++] = leftHalf[i++];
    while (j < rightHalf.length) arr[k++] = rightHalf[j++];
    return inversions;
}
```

**Dry Run — merge step on [5,3] and [1,4,2] (already sorted halves: [3,5] and [1,2,4]):**

```
Left:  [3, 5]    i=0
Right: [1, 2, 4] j=0

Step | i | j | Compare         | Pick | inversions added | reason
-----|---|---|-----------------|------|------------------|---------------------------
  1  | 0 | 0 | 3 vs 1: 3>1     | 1    | +2               | left has [3,5] remaining = 2
  2  | 0 | 1 | 3 vs 2: 3>2     | 2    | +2               | left has [3,5] remaining = 2
  3  | 0 | 2 | 3 vs 4: 3<4     | 3    | 0                | pick from left
  4  | 1 | 2 | 5 vs 4: 5>4     | 4    | +1               | left has [5] remaining = 1
  5  | 1 | - | left remaining  | 5    | 0                | drain left

Total inversions from this merge = 5
```

**Complexity:** Time O(n log n), Space O(n) for temp array.

---

### Example 2: Quick Select — Kth Largest Element

**Problem:** Find the 2nd largest element in `[3, 2, 1, 5, 6, 4]`. (K=2)

**Expected output:** 5

We want Kth largest = (n - K)th smallest in 0-indexed = index 4 in sorted array.

**Java:**
```java
int findKthLargest(int[] nums, int k) {
    return quickSelect(nums, 0, nums.length - 1, nums.length - k);
}

int quickSelect(int[] nums, int lo, int hi, int targetIndex) {
    if (lo == hi) return nums[lo];
    int pivotIndex = lo + new Random().nextInt(hi - lo + 1);
    swap(nums, pivotIndex, hi);
    int partitionIndex = partition(nums, lo, hi);
    if (partitionIndex == targetIndex) return nums[partitionIndex];
    if (partitionIndex < targetIndex) return quickSelect(nums, partitionIndex + 1, hi, targetIndex);
    return quickSelect(nums, lo, partitionIndex - 1, targetIndex);
}

int partition(int[] nums, int lo, int hi) {
    int pivot = nums[hi], boundary = lo;
    for (int j = lo; j < hi; j++) {
        if (nums[j] <= pivot) swap(nums, boundary++, j);
    }
    swap(nums, boundary, hi);
    return boundary;
}

void swap(int[] nums, int a, int b) {
    int temp = nums[a]; nums[a] = nums[b]; nums[b] = temp;
}
```

**JavaScript:**
```javascript
function findKthLargest(nums, k) {
    return quickSelect(nums, 0, nums.length - 1, nums.length - k);
}

function quickSelect(nums, lo, hi, targetIndex) {
    if (lo === hi) return nums[lo];
    const pivotIndex = lo + Math.floor(Math.random() * (hi - lo + 1));
    [nums[pivotIndex], nums[hi]] = [nums[hi], nums[pivotIndex]];
    const partitionIndex = partition(nums, lo, hi);
    if (partitionIndex === targetIndex) return nums[partitionIndex];
    if (partitionIndex < targetIndex) return quickSelect(nums, partitionIndex + 1, hi, targetIndex);
    return quickSelect(nums, lo, partitionIndex - 1, targetIndex);
}

function partition(nums, lo, hi) {
    const pivot = nums[hi];
    let boundary = lo;
    for (let j = lo; j < hi; j++) {
        if (nums[j] <= pivot) {
            [nums[boundary], nums[j]] = [nums[j], nums[boundary]];
            boundary++;
        }
    }
    [nums[boundary], nums[hi]] = [nums[hi], nums[boundary]];
    return boundary;
}
```

**Dry Run on [3,2,1,5,6,4], K=2, targetIndex=4:**

```
Array: [3, 2, 1, 5, 6, 4]
        0  1  2  3  4  5

Assume pivot = arr[5] = 4, partition:
j scans: 3<=4 → swap(0,0)→boundary=1
         2<=4 → swap(1,1)→boundary=2
         1<=4 → swap(2,2)→boundary=3
         5>4  → skip
         6>4  → skip
After swap pivot: [3,2,1,4,6,5] → partitionIndex=3

partitionIndex=3 < targetIndex=4 → recurse on [4, 3+1..5] = [6,5], lo=4, hi=5

Assume pivot = arr[5] = 5, partition:
j scans: 6>5 → skip
After swap pivot: [3,2,1,4,5,6] → partitionIndex=4

partitionIndex=4 == targetIndex=4 → return arr[4] = 5
```

**Complexity:** Time O(n) average / O(n²) worst case, Space O(1) iterative or O(n) recursive worst case.

---

### Example 3: Cyclic Sort — Find All Missing Numbers

**Problem:** In array `[4, 3, 2, 7, 8, 2, 3, 1]`, values are in [1, 8]. Find all missing numbers.

**Expected output:** [5, 6]

**Java:**
```java
List<Integer> findDisappearedNumbers(int[] nums) {
    int i = 0;
    while (i < nums.length) {
        int correctIndex = nums[i] - 1;
        if (nums[i] != nums[correctIndex]) {
            int temp = nums[i];
            nums[i] = nums[correctIndex];
            nums[correctIndex] = temp;
        } else {
            i++;
        }
    }
    List<Integer> missing = new ArrayList<>();
    for (int j = 0; j < nums.length; j++) {
        if (nums[j] != j + 1) missing.add(j + 1);
    }
    return missing;
}
```

**JavaScript:**
```javascript
function findDisappearedNumbers(nums) {
    let i = 0;
    while (i < nums.length) {
        const correctIndex = nums[i] - 1;
        if (nums[i] !== nums[correctIndex]) {
            [nums[i], nums[correctIndex]] = [nums[correctIndex], nums[i]];
        } else {
            i++;
        }
    }
    const missing = [];
    for (let j = 0; j < nums.length; j++) {
        if (nums[j] !== j + 1) missing.push(j + 1);
    }
    return missing;
}
```

**Dry Run on [4,3,2,7,8,2,3,1]:**

```
i | Array State                 | Action
--|-----------------------------|-----------------------------------------
0 | [4,3,2,7,8,2,3,1]          | arr[0]=4, correctIdx=3. arr[0]!=arr[3]. Swap(0,3).
0 | [7,3,2,4,8,2,3,1]          | arr[0]=7, correctIdx=6. arr[0]!=arr[6]. Swap(0,6).
0 | [3,3,2,4,8,2,7,1]          | arr[0]=3, correctIdx=2. arr[0]!=arr[2]. Swap(0,2).
0 | [2,3,3,4,8,2,7,1]          | arr[0]=2, correctIdx=1. arr[0]!=arr[1]. Swap(0,1).
0 | [3,2,3,4,8,2,7,1]          | arr[0]=3, correctIdx=2. arr[0]==arr[2]=3. Duplicate! i++.
1 | [3,2,3,4,8,2,7,1]          | arr[1]=2, correctIdx=1. arr[1]==1+1=2. Correct. i++.
2 | [3,2,3,4,8,2,7,1]          | arr[2]=3, correctIdx=2. arr[2]==2+1=3. Correct. i++.
3 | [3,2,3,4,8,2,7,1]          | arr[3]=4, correctIdx=3. Correct. i++.
4 | [3,2,3,4,8,2,7,1]          | arr[4]=8, correctIdx=7. Swap(4,7).
4 | [3,2,3,4,1,2,7,8]          | arr[4]=1, correctIdx=0. arr[0]!=arr[correctIdx]. Swap(4,0).
4 | [1,2,3,4,3,2,7,8]          | arr[4]=3, correctIdx=2. arr[4]==arr[2]=3. Duplicate! i++.
5 | [1,2,3,4,3,2,7,8]          | arr[5]=2, correctIdx=1. arr[5]==arr[1]=2. Duplicate! i++.
6 | [1,2,3,4,3,2,7,8]          | arr[6]=7, correctIdx=6. Correct. i++.
7 | [1,2,3,4,3,2,7,8]          | arr[7]=8, correctIdx=7. Correct. i++.

Scan: index 4 has arr[4]=3 != 5. Missing: 5.
      index 5 has arr[5]=2 != 6. Missing: 6.

Result: [5, 6]
```

**Complexity:** Time O(n), Space O(1).

---

## [45–55 min] Pattern Recognition

### Structural clues — what to look for in the problem statement

**Use Merge Sort when:**
- You need a stable sort with guaranteed O(n log n)
- The phrase "count inversions" or "count how many smaller elements appear after" appears
- You're sorting a linked list (merge sort is naturally O(1) space for linked lists)
- Divide-and-conquer applies and merging sorted halves gives useful information

**Use Quick Select when:**
- "Find the Kth largest/smallest element"
- "Find the median"
- "Top K elements" where you need WHICH elements (not in sorted order)
- O(n) average is acceptable and you don't need sorted top-K

**Use Counting Sort when:**
- Values are bounded integers in a small range
- "Sort colors" or any problem with only a few distinct values
- Sorting is a preprocessing step and range is small

**Use Radix Sort when:**
- Sorting integers or fixed-length strings
- N is large but number of digits D is small
- Standard O(n log n) is too slow for the given constraints

**Use Bucket Sort when:**
- "Maximum gap" problem (O(n) by pigeonhole principle on buckets)
- "Top K frequent elements in O(n)" (bucket by frequency)
- Values are described as uniformly distributed

**Use Cyclic Sort when:**
- Values are in range [1, n] or [0, n-1]
- Problem mentions: "missing number," "find duplicate," "find all duplicates," "first missing positive"
- O(1) space is required alongside O(n) time

**Use Custom Comparator when:**
- "Arrange to form the largest number"
- "Sort by X then by Y"
- Any problem where the definition of "comes before" is non-trivial

**Sort as preprocessing when:**
- You can't think of a direct approach, ask: "what if this were sorted?"
- Two-pointer approach would work IF the array were sorted
- Greedy processing needs elements in a specific order

### Questions to ask yourself

```
1. Are values integers in a bounded range?
   YES → Consider counting sort, radix sort, cyclic sort, bucket sort
   NO  → Comparison-based sort (merge sort or quick sort)

2. Do I need the Kth element (not all K)?
   YES → Quick Select (O(n) avg) or Heap (O(n log K) guaranteed)

3. Do I need stability?
   YES → Merge Sort (or counting sort's stable variant)

4. Is space critical (O(1))?
   YES, range [1,n] → Cyclic Sort
   YES, arbitrary → Quick Sort (in-place, O(log n) stack)

5. Is this an inversion-counting or "smaller elements after self" problem?
   YES → Merge Sort with augmented merge step

6. Is the problem about missing/duplicate numbers in [1,n]?
   YES → Cyclic Sort

7. Is the comparison rule non-standard?
   YES → Custom Comparator

8. Would any algorithm after sorting become O(n) or O(n log n)?
   YES → Sort as preprocessing
```

### Distinguishing similar patterns

**Quick Select vs Heap (Top-K):**
- Quick Select: O(n) average, O(n²) worst, gives Kth element (not sorted)
- Heap of size K: O(n log K) guaranteed, gives all K elements sorted
- Use Quick Select when: you only need the Kth value AND average case is acceptable
- Use Heap when: you need all K elements, or streaming data, or guaranteed O(n log K)

**Merge Sort vs Quick Sort:**
- Merge Sort: stable, O(n) space, guaranteed O(n log n)
- Quick Sort: in-place, O(log n) stack space, O(n²) worst case
- Use Merge Sort when: stability needed, linked list sorting, merge step itself is useful
- Use Quick Sort when: in-place needed, average-case performance is the goal

**Counting Sort vs Bucket Sort:**
- Counting Sort: one bucket per distinct value, works for exact integers
- Bucket Sort: one bucket per value range, works when distribution is known
- Counting Sort is a special case of bucket sort where bucket width = 1

**Cyclic Sort vs Hashing for missing numbers:**
- Cyclic Sort: O(1) space, modifies the input array
- Hashing: O(n) space, does not modify input
- If interviewer says "constant space," Cyclic Sort is the intended answer

---

## [55–60 min] Final Mental Checklist

```
WHAT IS IT?
  Sorting = arranging elements in order. A family of algorithms,
  each with different trade-offs and use cases. Rarely the end goal —
  usually the preprocessing step that enables a faster algorithm.

WHEN DO I USE IT?
  - Merge Sort: stable sort, inversion counting, linked list sort
  - Quick Sort: in-place sort, building partitioning logic
  - Quick Select: Kth element in O(n) average
  - Counting/Radix: integers in bounded range, faster than O(n log n)
  - Bucket Sort: uniform distribution, maximum gap, top-K frequent in O(n)
  - Cyclic Sort: missing/duplicate in [1,n], O(1) space
  - Custom Comparator: non-standard ordering
  - Preprocessing: when "what if sorted?" opens a clean algorithm

WHEN DO I NOT USE IT?
  - Merge Sort: O(n) space is unacceptable
  - Quick Sort: stability needed; guaranteed O(n log n) needed
  - Quick Select: streaming data; need sorted top-K
  - Counting Sort: K >> n; floating point values
  - Cyclic Sort: values not in bounded range
  - Sort as preprocessing: when original order matters (subarray,
    sliding window problems)

WHAT IS THE CORE IDEA?
  - Merge Sort: split recursively, merge sorted halves bottom-up
  - Quick Sort: place pivot at correct position, recurse on two sides
  - Quick Select: place pivot, recurse on only the side containing K
  - Counting Sort: use value as array index, no comparisons
  - Cyclic Sort: use value as position, place via swaps

WHAT DO I TRACK?
  - Merge Sort: temporary array for merge; inversion count for augmented version
  - Quick Sort: lo, hi, pivot index, partition boundary
  - Quick Select: lo, hi, target index K
  - Cyclic Sort: current index i, correct index = arr[i]-1
  - Bucket Sort: min/max per bucket

WHAT IS THE INVARIANT/STATE?
  - After each merge: the merged subarray is fully sorted
  - After partition: pivot is at final position; left ≤ pivot ≤ right
  - After cyclic sort pass: every value that could be placed is at arr[v-1]
  - After counting: count[v] = frequency of v in input

HOW DO I RECOGNIZE IT?
  - "Kth" → Quick Select or Heap
  - "inversions" / "smaller after self" → Merge Sort augmentation
  - "missing" / "duplicate" + [1,n] → Cyclic Sort
  - "maximum gap" / "top-K frequent in O(n)" → Bucket Sort
  - "arrange to form largest" → Custom Comparator
  - Can't think of approach → ask "what if sorted?"

WHAT ARE THE COMMON TRAPS?
  - Quick Sort/Select worst case O(n²): always mention randomized pivot
  - Radix Sort: forgetting each digit sort must be STABLE
  - Cyclic Sort: off-by-one in correct index (1-based vs 0-based)
  - Custom Comparator: not proving transitivity
  - Sorting when it destroys original index information
  - Using Quick Select for streaming data (needs all data upfront)

WHAT PATTERNS CAN I CONFUSE IT WITH?
  - Quick Select ↔ Heap: both solve "Kth largest"
  - Cyclic Sort ↔ Hashing: both solve missing/duplicate (trade space vs time)
  - Merge Sort merge step ↔ Two Pointers on sorted arrays
  - Bucket Sort ↔ Counting Sort (bucket sort generalizes counting sort)

WHAT IS THE COMPLEXITY?
  Algorithm         | Time (avg) | Time (worst) | Space
  ------------------|------------|--------------|-------
  Merge Sort        | O(n log n) | O(n log n)   | O(n)
  Quick Sort        | O(n log n) | O(n²)        | O(log n)
  Quick Select      | O(n)       | O(n²)        | O(1) iter
  Counting Sort     | O(n + K)   | O(n + K)     | O(K)
  Radix Sort        | O(D×(n+K)) | O(D×(n+K))  | O(n+K)
  Bucket Sort       | O(n)       | O(n log n)   | O(n)
  Cyclic Sort       | O(n)       | O(n)         | O(1)
```

---

## Advanced Awareness

These topics exist and may come up in follow-ups. Understand the name and one-line description — do not deep-dive unless asked.

- **Median of Medians:** Deterministic O(n) worst-case selection algorithm. Finds a "good" pivot by taking the median of groups of 5. Rarely needed in interviews.
- **TimSort:** Java's `Arrays.sort()` and Python's default sort. Hybrid merge + insertion sort, designed for real-world data patterns. O(n log n) worst case, O(n) best case on nearly-sorted data.
- **Intro Sort:** C++ STL's `std::sort`. Hybrid of Quick Sort + Heap Sort + Insertion Sort. Guarantees O(n log n) worst case while keeping Quick Sort's average performance.
- **External Sort:** Sorting data that doesn't fit in RAM. Uses merge sort's sequential-access property for efficient disk I/O.
- **MSD Radix Sort:** Most Significant Digit first. Natural for lexicographic string sorting. More complex than LSD because it requires recursive partitioning.
- **Floyd's Cycle Detection for Duplicates:** When you cannot modify the array and need O(1) space, treat values as pointers in a linked list and find the cycle. Detects the duplicate in O(n) time O(1) space.

---

## Active Recall

Test yourself — close the file and answer these:

1. Why can comparison-based sorting not beat O(n log n)? Give the argument in 2–3 sentences.
2. In Merge Sort's inversion counting, when you pick an element from the right half, how many inversions does it create? Why?
3. Why is Quick Select O(n) average but not O(n log n) like Quick Sort?
4. You have an array of values in [0, 10000]. The array has 20 elements. Which sorting algorithm is best? Why?
5. When does Counting Sort become worse than Merge Sort in practice?
6. In Cyclic Sort, you encounter arr[i] == arr[arr[i]-1] during a swap attempt. What does this mean, and what do you do?
7. For "Find the Kth Largest" — when would you choose Quick Select over a Heap, and when the reverse?
8. Why must each digit pass in Radix Sort use a stable sort?
9. For "Maximum Gap": why must the maximum gap occur between buckets and not within a bucket?
10. What makes a custom comparator "valid"? What property must it satisfy?

---

## Recommended Practice Direction

Work through problems in this order — each one adds one new dimension:

**Foundational:**
- LeetCode 912 — Sort an Array (implement merge sort from scratch)
- LeetCode 215 — Kth Largest Element in an Array (Quick Select)
- LeetCode 75 — Sort Colors (three-way partition / counting sort)

**Merge Step Augmentation:**
- LeetCode 315 — Count of Smaller Numbers After Self (merge sort + index tracking)
- LeetCode 493 — Reverse Pairs (merge sort + count during merge)

**Cyclic Sort Family:**
- LeetCode 448 — Find All Numbers Disappeared in an Array
- LeetCode 442 — Find All Duplicates in an Array
- LeetCode 41 — First Missing Positive (hardest — handle negatives and out-of-range)

**Bucket Sort Applications:**
- LeetCode 347 — Top K Frequent Elements (bucket sort by frequency)
- LeetCode 164 — Maximum Gap (bucket sort / pigeonhole)

**Custom Comparators:**
- LeetCode 179 — Largest Number (string concatenation comparator)
- LeetCode 56 — Merge Intervals (sort by start time as preprocessing)

**Sort as Preprocessing:**
- LeetCode 15 — 3Sum (sort, then two pointers)
- LeetCode 452 — Minimum Number of Arrows (sort by end, then greedy)

---

## 2-Minute Cheat Sheet

```
SORT CHOICE DECISION:
  Values in [1,n], find missing/dup?       → Cyclic Sort   O(n) / O(1)
  Values bounded integers, small range?    → Counting Sort O(n+K)
  Fixed-length integers, large n?          → Radix Sort    O(D·n)
  Uniform distribution, maximum gap?       → Bucket Sort   O(n) avg
  Kth element, O(n) avg ok?                → Quick Select  O(n) avg
  Kth element, guaranteed O(n log K)?      → Heap
  Stable sort needed?                      → Merge Sort    O(n log n)
  In-place, no stability needed?           → Quick Sort    O(n log n) avg
  Non-standard comparison rule?            → Custom Comparator

KEY FORMULAS:
  Merge Sort:   T(n) = 2T(n/2) + O(n) → O(n log n)
  Quick Select: n + n/2 + n/4 + ... = 2n → O(n) average
  Counting:     O(n + K) where K = value range

KEY INSIGHT — each algorithm's "trick":
  Merge Sort   → sorted halves merge in O(n); merge step reveals relationships
  Quick Sort   → pivot goes to final position; recurse on sides
  Quick Select → pivot goes to final position; recurse on ONE side only
  Counting     → value as array index, no comparisons needed
  Cyclic Sort  → value - 1 = correct index; swap to correct position
  Bucket Sort  → max gap is BETWEEN buckets (pigeonhole); bucket by frequency for top-K

INVERSION COUNTING (merge sort):
  When picking from right half: inversions += (leftPointer's remaining count)

CYCLIC SORT TEMPLATE:
  while arr[i] != correct position:
    if arr[i] == arr[correctIndex]: i++ (duplicate, can't place)
    else: swap(arr[i], arr[correctIndex])
  After pass: scan for arr[i] != i+1 → missing/duplicate

COMPARATOR MUST BE:
  Transitive: a < b && b < c → a < c (otherwise sort is undefined)
```

---

*Next: [05-HASHING-AND-SETS.md](05-HASHING-AND-SETS.md) — The universal optimizer: trade space for time.*
