# Sorting & Order — Complete Interview Guide

> **5 algorithms covered:** Merge Sort · Counting Sort · Cyclic Sort · Custom Comparator Sorting · Sorting as Preprocessing

> Read fast. Understand deeply. Go practice on LeetCode immediately.

---

## Table of Contents

- [Merge Sort](#merge-sort)
- [Quick Sort](#quick-sort)
- [Quick Select — Kth Element](#quick-select--kth-element)
- [Counting Sort](#counting-sort)
- [Cyclic Sort](#cyclic-sort)
- [Custom Comparator Sorting](#custom-comparator-sorting)
- [Sorting as Preprocessing](#sorting-as-preprocessing)

---

## Merge Sort

### What is it?
Split the array in half repeatedly until each piece has one element. A single element is already sorted. Then merge sorted pieces back together, two at a time, until the whole array is sorted.

### Visual
```
Split down:
[5, 2, 4, 1, 3]
    /         \
[5, 2, 4]   [1, 3]
  /    \      /  \
[5,2]  [4]  [1]  [3]
 / \
[5] [2]

Merge up:
[2,5]  ← merge [5],[2]
[2,4,5]  ← merge [2,5],[4]
[1,3]  ← merge [1],[3]
[1,2,3,4,5]  ← merge [2,4,5],[1,3]
```

### How does it work?
1. If the array has 0 or 1 elements, it's already sorted — return.
2. Find the middle index.
3. Recursively sort the left half.
4. Recursively sort the right half.
5. Merge the two sorted halves into one sorted array.
6. In the merge: use two pointers, always pick the smaller front element, advance that pointer.
7. After one side is exhausted, copy the rest of the other side.

### Why does it work?
If both halves are sorted, you only ever need to compare the front elements of each half — the smallest remaining in each. This makes merging two sorted halves take O(n), and the recursion tree has log n levels, giving O(n log n) total.

### When to use?
- You need a **stable sort** (equal elements keep their original order).
- The problem says "count inversions" or "count how many smaller elements appear after each element."
- You are sorting a **linked list** (merge sort is naturally O(1) extra space for linked lists).
- Divide-and-conquer structure fits and the merge step itself reveals useful information.

### When NOT to use?
- O(n) extra space is unacceptable — merge sort always needs O(n) for the temp array.
- Simple comparison-based sort is enough and you don't need the merge step's special properties.

### How to recognize in a new problem?
Ask: does the answer involve counting relationships between pairs (i, j) where i < j? That screams merge sort inversion counting. Also: any "sort a linked list" problem — merge sort is the canonical solution.

Concrete signals:
- "Count the number of inversions in the array."
- "For each element, count how many elements to the right are smaller."
- "Sort the linked list."

### Simple Example
Input: `[5, 3, 1, 4, 2]`
Expected output (sorted): `[1, 2, 3, 4, 5]`
Expected inversions: 7 — pairs (5,3),(5,1),(5,4),(5,2),(3,1),(3,2),(4,2)

Trace: Split → `[5,3,1]` and `[4,2]`. Split again → `[5,3]`,`[1]` and `[4]`,`[2]`. Merge `[5]`,`[3]` → `[3,5]`. Merge `[3,5]`,`[1]` → `[1,3,5]`. Merge `[4]`,`[2]` → `[2,4]`. Merge `[1,3,5]`,`[2,4]` → `[1,2,3,4,5]`.

### Code
```java
// Java
int[] mergeSort(int[] arr, int left, int right) {
    if (left >= right) return new int[]{arr[left]};
    int mid = left + (right - left) / 2;
    int[] leftSorted = mergeSort(arr, left, mid);
    int[] rightSorted = mergeSort(arr, mid + 1, right);
    return merge(leftSorted, rightSorted);
}

int[] merge(int[] left, int[] right) {
    int[] result = new int[left.length + right.length];
    int i = 0, j = 0, k = 0;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) result[k++] = left[i++];
        else result[k++] = right[j++];
    }
    while (i < left.length) result[k++] = left[i++];
    while (j < right.length) result[k++] = right[j++];
    return result;
}

// Inversion count variant: when you pick from right, add leftRemaining
int mergeCount(int[] arr, int[] temp, int left, int mid, int right) {
    for (int k = left; k <= right; k++) temp[k] = arr[k];
    int i = left, j = mid + 1, k = left, inversions = 0;
    while (i <= mid && j <= right) {
        if (temp[i] <= temp[j]) {
            arr[k++] = temp[i++];
        } else {
            arr[k++] = temp[j++];
            inversions += (mid - i + 1); // all remaining left elements form inversions
        }
    }
    while (i <= mid) arr[k++] = temp[i++];
    while (j <= right) arr[k++] = temp[j++];
    return inversions;
}
```
```javascript
// JavaScript
function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));
    return merge(left, right);
}

function merge(left, right) {
    const result = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) result.push(left[i++]);
        else result.push(right[j++]);
    }
    return result.concat(left.slice(i)).concat(right.slice(j));
}

// Inversion count variant
function mergeSortCount(arr, left, right) {
    if (left >= right) return 0;
    const mid = Math.floor((left + right) / 2);
    let count = mergeSortCount(arr, left, mid);
    count += mergeSortCount(arr, mid + 1, right);
    count += mergeCount(arr, left, mid, right);
    return count;
}

function mergeCount(arr, left, mid, right) {
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

### Dry Run
Merge step on sorted halves `[3, 5]` and `[1, 2, 4]`:

| Step | i | j | Compare | Pick | Inversions Added | Reason |
|------|---|---|---------|------|-----------------|--------|
| 1 | 0 | 0 | 3 vs 1 | 1 (right) | +2 | 3 and 5 both > 1 |
| 2 | 0 | 1 | 3 vs 2 | 2 (right) | +2 | 3 and 5 both > 2 |
| 3 | 0 | 2 | 3 vs 4 | 3 (left) | 0 | 3 < 4 |
| 4 | 1 | 2 | 5 vs 4 | 4 (right) | +1 | 5 > 4 |
| 5 | 1 | - | drain left | 5 | 0 | |
Total inversions from this merge: 5

### Complexity
```
Time:  O(n log n) — log n levels in the recursion tree, O(n) merge work at each level
Space: O(n) — temp array needed for merging; O(log n) recursion stack on top
```

### Common Trap
- **Forgetting the inversion count formula:** when picking from the right half, add `(mid - i + 1)` — that is, ALL remaining elements in the left half, not just the current pointer.
- **Linked list merge:** don't copy to a new array. Re-link the `next` pointers in place — merge sort on linked lists needs O(1) extra space per merge.

### Experience Tip
**Experience Tip:** The merge step is the heart of the algorithm — understanding *why* you add `mid - i + 1` inversions is more important than memorizing the code. Once you see that every remaining left element is greater than the current right element, the formula is obvious.

### Do Not Confuse With
- **Quick Sort:** also O(n log n) average but NOT stable and in-place. Merge sort needs extra space but guarantees stability.
- **Two Pointers on a sorted array:** the merge step looks like two pointers, but the array is not pre-sorted — merge sort *creates* the sorted order bottom-up.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 912 | Sort an Array | Medium | Implement merge sort from scratch | https://leetcode.com/problems/sort-an-array/ |
| 148 | Sort List | Medium | Merge sort on linked list — use slow/fast pointer to find midpoint | https://leetcode.com/problems/sort-list/ |
| 88 | Merge Sorted Array | Easy | Pure merge step — start from the back to avoid overwriting | https://leetcode.com/problems/merge-sorted-array/ |
| 315 | Count of Smaller Numbers After Self | Hard | Track original indices through the merge | https://leetcode.com/problems/count-of-smaller-numbers-after-self/ |
| 493 | Reverse Pairs | Hard | Count pairs during merge before merging | https://leetcode.com/problems/reverse-pairs/ |

### One-Minute Revision
```
ALGORITHM:    Merge Sort
IN SIMPLE WORDS: Split in half recursively, merge sorted halves back up
USE WHEN:     Stable sort needed; counting inversions; sorting linked lists
DON'T USE WHEN: O(n) extra space not allowed
CORE IDEA:    Two sorted halves can be merged in O(n) using two pointers
TRACK:        Temp array for merge; two pointers i, j; inversion count
TIME:         O(n log n) — n work per level × log n levels
SPACE:        O(n) for temp array
COMMON TRAP:  Inversion count = (mid - i + 1), not just +1
EXPERIENCE TIP: Master the merge step — it appears in many non-obvious problems
```

---

## Quick Sort

### What is it?
Pick one element as the "pivot." Rearrange the array so everything smaller than the pivot is on its left, and everything larger is on its right. The pivot is now at its final sorted position. Recursively sort the two sides.

### Visual
```
[3, 6, 8, 10, 1, 2, 1]   pivot = 3 (first element)

After partition:
[1, 2, 1, 3, 6, 8, 10]
 <-- ≤3 --> ^  <-- >3 -->
            pivot at final position (index 3)

Recurse on [1,2,1] and [6,8,10] separately.
```

### How does it work?
1. If array has 0 or 1 elements, return — already sorted.
2. Choose a pivot (last element, random element, or median-of-three).
3. Move pivot to the end temporarily (swap with last element).
4. Maintain a `boundary` pointer starting at the beginning.
5. Scan through the array. If current element ≤ pivot, swap it with `arr[boundary]` and advance `boundary`.
6. After the scan, swap pivot (at end) into `arr[boundary]` — pivot is now in its final position.
7. Recurse on `[left, boundary - 1]` and `[boundary + 1, right]`.

### Why does it work?
After partitioning, the pivot is at its exact final sorted index — everything to its left is smaller and everything to its right is larger. Recursing on both sides independently sorts the whole array, because each recursive call also places its own pivot at its final position.

### When to use?
- You need an in-place sort with O(log n) extra space (just the recursion stack).
- Average-case performance matters and guaranteed worst-case is not required.
- You are implementing Quick Select (the partition step is the building block).
- You need a three-way partition for arrays with many duplicates.

### When NOT to use?
- You need a stable sort — Quick Sort is NOT stable.
- You need a guaranteed O(n log n) worst case — use Merge Sort or heap sort instead.

### How to recognize in a new problem?
Any problem that says "sort in-place" or where you need to partition values around a threshold. Also: Dutch National Flag (sort 0s, 1s, 2s) is literally a three-way Quick Sort partition.

Concrete signals:
- "Sort the array in-place without extra space."
- "Given an array with only 0, 1, 2 — sort it." (three-way partition)
- "Partition array into elements less than, equal to, greater than a value."

### Simple Example
Input: `[3, 6, 8, 10, 1, 2, 1]`
Expected output: `[1, 1, 2, 3, 6, 8, 10]`

Trace one partition step with pivot = `3`:
- boundary = 0
- 6 > 3: skip. 8 > 3: skip. 10 > 3: skip. 1 ≤ 3: swap(boundary=0, j=4) → boundary=1. 2 ≤ 3: swap(boundary=1, j=5) → boundary=2. 1 ≤ 3: swap(boundary=2, j=6) → boundary=3.
- Swap pivot(index 0) with arr[boundary=3] → `[1, 2, 1, 3, 6, 8, 10]`. Pivot 3 is at index 3.

### Code
```java
// Java
void quickSort(int[] arr, int low, int high) {
    if (low >= high) return;
    int pivotIndex = partition(arr, low, high);
    quickSort(arr, low, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, high);
}

int partition(int[] arr, int low, int high) {
    // Randomize pivot to avoid O(n^2) on sorted input
    int randomIndex = low + (int)(Math.random() * (high - low + 1));
    swap(arr, randomIndex, high);
    int pivot = arr[high];
    int boundary = low;
    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) swap(arr, boundary++, j);
    }
    swap(arr, boundary, high);
    return boundary;
}

void swap(int[] arr, int a, int b) {
    int temp = arr[a]; arr[a] = arr[b]; arr[b] = temp;
}

// Three-way partition (Dutch National Flag) for duplicates
void threeWayPartition(int[] arr, int low, int high) {
    if (low >= high) return;
    int pivot = arr[low + (high - low) / 2];
    int lt = low, gt = high, i = low;
    while (i <= gt) {
        if (arr[i] < pivot) swap(arr, lt++, i++);
        else if (arr[i] > pivot) swap(arr, i, gt--);
        else i++;
    }
    // arr[low..lt-1] < pivot, arr[lt..gt] == pivot, arr[gt+1..high] > pivot
    threeWayPartition(arr, low, lt - 1);
    threeWayPartition(arr, gt + 1, high);
}
```
```javascript
// JavaScript
function quickSort(arr, low = 0, high = arr.length - 1) {
    if (low >= high) return;
    const pivotIndex = partition(arr, low, high);
    quickSort(arr, low, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, high);
}

function partition(arr, low, high) {
    const randomIndex = low + Math.floor(Math.random() * (high - low + 1));
    [arr[randomIndex], arr[high]] = [arr[high], arr[randomIndex]];
    const pivot = arr[high];
    let boundary = low;
    for (let j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            [arr[boundary], arr[j]] = [arr[j], arr[boundary]];
            boundary++;
        }
    }
    [arr[boundary], arr[high]] = [arr[high], arr[boundary]];
    return boundary;
}
```

### Dry Run
Input: `[5, 3, 1, 4, 2]`, pivot = last element = 2

| j | arr[j] | Action | Array State | boundary |
|---|--------|--------|-------------|----------|
| 0 | 5 | 5 > 2, skip | [5,3,1,4,2] | 0 |
| 1 | 3 | 3 > 2, skip | [5,3,1,4,2] | 0 |
| 2 | 1 | 1 ≤ 2, swap(0,2) | [1,3,5,4,2] | 1 |
| 3 | 4 | 4 > 2, skip | [1,3,5,4,2] | 1 |
| - | - | swap pivot: swap(1,4) | [1,2,5,4,3] | - |

Pivot 2 is now at index 1. Recurse on `[1]` (trivial) and `[5,4,3]`.

### Complexity
```
Time:  O(n log n) average — pivot lands near middle on average, log n levels, O(n) per level
       O(n^2) worst case — pivot is always min or max (avoid with random pivot!)
Space: O(log n) — recursion stack depth on average
       O(n) worst case recursion stack if always unbalanced
```

### Common Trap
- **Forgetting to randomize the pivot.** If you always pick the last element, a sorted input causes O(n²). Always pick a random pivot or say you would in an interview.
- **Three-way partition off-by-one.** The `lt`, `i`, `gt` pointers all start at specific places and the loop condition is `i <= gt`, not `i < gt`.

### Experience Tip
**Experience Tip:** The partition function is the core building block. Once you can write it cleanly in 8 lines, Quick Sort and Quick Select both follow naturally. Practice partition alone until it's automatic.

### Do Not Confuse With
- **Merge Sort:** Merge Sort splits first then merges. Quick Sort partitions first then recurses. Merge Sort is stable; Quick Sort is not. Merge Sort needs O(n) space; Quick Sort is in-place.
- **Quick Select:** Same partition step, but Quick Select only recurses on ONE side.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 75 | Sort Colors | Medium | Three-way partition — lt/i/gt pointers | https://leetcode.com/problems/sort-colors/ |
| 912 | Sort an Array | Medium | Implement quick sort from scratch with random pivot | https://leetcode.com/problems/sort-an-array/ |
| 280 | Wiggle Sort | Medium | One pass partitioning around a condition | https://leetcode.com/problems/wiggle-sort/ |

### One-Minute Revision
```
ALGORITHM:    Quick Sort
IN SIMPLE WORDS: Pick pivot, partition array around it, recurse both sides
USE WHEN:     In-place sort needed; three-way partition (duplicates); building Quick Select
DON'T USE WHEN: Stable sort required; guaranteed O(n log n) worst case required
CORE IDEA:    Pivot lands at its final sorted index after one partition pass
TRACK:        boundary pointer (rightmost index of ≤ pivot region); lo and hi of current range
TIME:         O(n log n) average, O(n^2) worst case
SPACE:        O(log n) recursion stack average
COMMON TRAP:  Always randomize pivot — sorted input causes O(n^2) with last-element pivot
EXPERIENCE TIP: Master partition() alone first — it's the building block for Quick Select too
```

---

## Quick Select — Kth Element

### What is it?
Find the Kth smallest (or largest) element without sorting the whole array. Uses the same partition step as Quick Sort, but only recurses on the ONE side that contains the Kth position. Average time is O(n) instead of O(n log n).

### Visual
```
Find 3rd smallest in [7, 2, 1, 6, 5, 4]
Target index (0-based) = 2

After partition (pivot=4 lands at index 3):
[2, 1, _, 4, 7, 6]  (simplified)
 0  1  2  3  4  5
           ^
       pivot at 3

Target index 2 < pivot index 3 → only recurse LEFT side [2,1,_]

After next partition (pivot=1 lands at index 0):
[1, 2, _]
 0  1  2
        ^
   target index 2 == length-1 of this subrange

... until pivot lands exactly at target index 2 → return arr[2]
```

### How does it work?
1. If `low == high`, return `arr[low]` — only one element left.
2. Choose a random pivot and move it to the end (swap with `arr[high]`).
3. Partition the current range — pivot lands at position `p`.
4. If `p == targetIndex`, return `arr[p]` — found it!
5. If `p < targetIndex`, the Kth element is in the right side — recurse on `[p+1, high]`.
6. If `p > targetIndex`, the Kth element is in the left side — recurse on `[low, p-1]`.
7. Never recurse on both sides.

### Why does it work?
After partitioning, the pivot is at its exact final sorted position. So we know with certainty which side our target is on — we discard the other side completely. Each call roughly halves the problem: n + n/2 + n/4 + ... = 2n = O(n) total work on average.

### When to use?
- "Find the Kth largest/smallest element."
- "Find the median of an unsorted array."
- "Return the top K elements" — you only need to know WHICH elements, not in sorted order.
- O(n) average is acceptable and you have all data upfront (not streaming).

### When NOT to use?
- Data is **streaming** (you don't have all data upfront) — use a min-heap of size K instead.
- You need the **top K elements in sorted order** — Quick Select gives you the set, not sorted.
- You need a **guaranteed** O(n) (not average) — then use Median-of-Medians or a heap.

### How to recognize in a new problem?
Any problem with "Kth largest," "Kth smallest," or "median" where O(n) average is good enough. The key tell: you don't need the other elements sorted, you just need the one value at position K.

Concrete signals:
- "Find the Kth largest element in an unsorted array."
- "Find the median of an unsorted list."
- "Return the K closest points to the origin."

### Simple Example
Input: `[3, 2, 1, 5, 6, 4]`, K = 2 (find 2nd largest)
Expected output: `5`

2nd largest = element at 0-based index `n - K = 4` in sorted order.
Sorted: `[1, 2, 3, 4, 5, 6]` — index 4 = `5`. Correct.

### Code
```java
// Java
int findKthLargest(int[] nums, int k) {
    int targetIndex = nums.length - k; // kth largest = (n-k)th smallest
    return quickSelect(nums, 0, nums.length - 1, targetIndex);
}

int quickSelect(int[] nums, int low, int high, int targetIndex) {
    if (low == high) return nums[low];
    // Random pivot to avoid O(n^2) worst case
    int randomIndex = low + (int)(Math.random() * (high - low + 1));
    swap(nums, randomIndex, high);
    int pivotPos = partition(nums, low, high);
    if (pivotPos == targetIndex) return nums[pivotPos];
    if (pivotPos < targetIndex) return quickSelect(nums, pivotPos + 1, high, targetIndex);
    return quickSelect(nums, low, pivotPos - 1, targetIndex);
}

int partition(int[] nums, int low, int high) {
    int pivot = nums[high], boundary = low;
    for (int j = low; j < high; j++) {
        if (nums[j] <= pivot) swap(nums, boundary++, j);
    }
    swap(nums, boundary, high);
    return boundary;
}

void swap(int[] nums, int a, int b) {
    int temp = nums[a]; nums[a] = nums[b]; nums[b] = temp;
}
```
```javascript
// JavaScript
function findKthLargest(nums, k) {
    const targetIndex = nums.length - k; // kth largest = (n-k)th smallest (0-indexed)
    return quickSelect(nums, 0, nums.length - 1, targetIndex);
}

function quickSelect(nums, low, high, targetIndex) {
    if (low === high) return nums[low];
    const randomIndex = low + Math.floor(Math.random() * (high - low + 1));
    [nums[randomIndex], nums[high]] = [nums[high], nums[randomIndex]];
    const pivotPos = partition(nums, low, high);
    if (pivotPos === targetIndex) return nums[pivotPos];
    if (pivotPos < targetIndex) return quickSelect(nums, pivotPos + 1, high, targetIndex);
    return quickSelect(nums, low, pivotPos - 1, targetIndex);
}

function partition(nums, low, high) {
    const pivot = nums[high];
    let boundary = low;
    for (let j = low; j < high; j++) {
        if (nums[j] <= pivot) {
            [nums[boundary], nums[j]] = [nums[j], nums[boundary]];
            boundary++;
        }
    }
    [nums[boundary], nums[high]] = [nums[high], nums[boundary]];
    return boundary;
}
```

### Dry Run
Input: `[3, 2, 1, 5, 6, 4]`, K=2, targetIndex=4

| Call | Range | Pivot | Pivot Lands At | Decision |
|------|-------|-------|----------------|----------|
| 1 | [0..5] | 4 (index 5) | index 3 | 3 < 4 → recurse right [4..5] |
| 2 | [4..5] | 6 (index 5) | index 5 | 5 > 4 → recurse left [4..4] |
| 3 | [4..4] | only 1 element | index 4 | 4 == 4 → return arr[4] = 5 |

Answer: `5`

### Complexity
```
Time:  O(n) average — each call halves the remaining range on average
       O(n^2) worst case — always picking min/max as pivot (random pivot prevents this)
Space: O(n) worst case recursion stack, O(log n) average
       Can be made O(1) with iterative version
```

### Common Trap
- **Confusing Kth largest vs Kth smallest.** Kth largest maps to targetIndex `n - K` (0-based). Kth smallest maps to targetIndex `K - 1` (0-based). Double-check before coding.
- **Not randomizing the pivot.** On a sorted input, non-random pivot causes O(n²). Always randomize or mention it.

### Experience Tip
**Experience Tip:** Quick Select modifies the input array. If the problem requires you not to modify input, either copy it first or use a heap. Always clarify with the interviewer whether the array can be modified.

### Do Not Confuse With
- **Heap (Top-K):** Heap gives all K elements in O(n log K) — use when you need sorted top-K, streaming data, or guaranteed worst case. Quick Select gives one element in O(n) average — use when you only need the value at position K and have all data.
- **Quick Sort:** Quick Sort recurses on BOTH sides and sorts everything. Quick Select recurses on ONE side only.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 215 | Kth Largest Element in an Array | Medium | Classic Quick Select — map Kth largest to targetIndex = n-k | https://leetcode.com/problems/kth-largest-element-in-an-array/ |
| 75 | Sort Colors | Medium | Three-way partition is related — practice partitioning around a value | https://leetcode.com/problems/sort-colors/ |
| 973 | K Closest Points to Origin | Medium | Quick Select on distance, not value directly | https://leetcode.com/problems/k-closest-points-to-origin/ |
| 347 | Top K Frequent Elements | Medium | Quick Select on frequency buckets | https://leetcode.com/problems/top-k-frequent-elements/ |
| 324 | Wiggle Sort II | Hard | Needs median via Quick Select, then placement | https://leetcode.com/problems/wiggle-sort-ii/ |

### One-Minute Revision
```
ALGORITHM:    Quick Select
IN SIMPLE WORDS: Partition around pivot, only recurse on the side containing index K
USE WHEN:     Kth largest/smallest; median; top-K elements (set, not sorted order)
DON'T USE WHEN: Streaming data; sorted top-K needed; guaranteed worst-case needed
CORE IDEA:    After partition, pivot is at final index → only ONE side contains K
TRACK:        targetIndex (0-based); low and high of current range
TIME:         O(n) average, O(n^2) worst case
SPACE:        O(log n) average recursion stack
COMMON TRAP:  Kth largest → targetIndex = n-k (not k-1); always randomize pivot
EXPERIENCE TIP: Quick Select modifies the array — clarify with interviewer first
```

---

## Counting Sort

### What is it?
If all values are integers within a small known range [0, K], count how many times each value appears, then reconstruct the sorted array from those counts. No comparisons needed — values become array indices directly.

### Visual
```
Input: [3, 1, 4, 1, 5, 9, 2, 6, 5]   range: [0, 9]

Step 1 — Count occurrences:
index:  0  1  2  3  4  5  6  7  8  9
count: [0, 2, 1, 1, 1, 2, 1, 0, 0, 1]

Step 2 — Reconstruct from counts:
1 appears 2 times → output 1, 1
2 appears 1 time  → output 2
3 appears 1 time  → output 3
...
Output: [1, 1, 2, 3, 4, 5, 5, 6, 9]
```

### How does it work?
1. Find the minimum and maximum values in the input.
2. Create a `count` array of size `(max - min + 1)`, initialized to 0.
3. For each element in the input, increment `count[element - min]`.
4. To reconstruct: for each index `i` in `count`, write `i + min` to the output `count[i]` times.
5. (For stable version: compute prefix sums of count, then place elements from right to left.)

### Why does it work?
Instead of comparing elements to each other, each value directly tells you its position via `count[value]`. This bypasses the O(n log n) comparison lower bound entirely. The total work is O(n) to fill counts + O(K) to scan the count array = O(n + K).

### When to use?
- Values are integers in a **small bounded range** (e.g., [0, 1000], ages 0-120, grades 0-100).
- Only a **few distinct values** exist (like "sort 0s, 1s, 2s").
- Sorting is a preprocessing step and range K is small enough that O(K) extra space is fine.
- You need a stable O(n) sort as a sub-step inside Radix Sort.

### When NOT to use?
- K >> n — for example, sorting 10 elements where values can be up to 10^9 wastes massive space.
- Values are floats, strings, or complex objects.
- Range is not known in advance.

### How to recognize in a new problem?
The tell is a small integer range explicitly mentioned in the constraints, or only a handful of possible values (like RGB colors, ratings 1-5, characters a-z).

Concrete signals:
- "Values are in the range [0, 1000]."
- "Array contains only 0, 1, and 2."
- "Characters are all lowercase English letters."

### Simple Example
Input: `[2, 0, 2, 1, 1, 0]`
Expected output: `[0, 0, 1, 1, 2, 2]`

Count: `count[0]=2, count[1]=2, count[2]=2`
Reconstruct: 0,0 then 1,1 then 2,2 → `[0, 0, 1, 1, 2, 2]`

### Code
```java
// Java
int[] countingSort(int[] arr, int maxVal) {
    int[] count = new int[maxVal + 1];
    for (int num : arr) count[num]++;

    int[] sorted = new int[arr.length];
    int idx = 0;
    for (int val = 0; val <= maxVal; val++) {
        while (count[val]-- > 0) sorted[idx++] = val;
    }
    return sorted;
}

// Sort Colors (LeetCode 75) — only 0,1,2
void sortColors(int[] nums) {
    int[] count = new int[3];
    for (int num : nums) count[num]++;
    int idx = 0;
    for (int color = 0; color < 3; color++) {
        while (count[color]-- > 0) nums[idx++] = color;
    }
}
```
```javascript
// JavaScript
function countingSort(arr, maxVal) {
    const count = new Array(maxVal + 1).fill(0);
    for (const num of arr) count[num]++;

    const sorted = [];
    for (let val = 0; val <= maxVal; val++) {
        while (count[val]-- > 0) sorted.push(val);
    }
    return sorted;
}

// Sort Colors variant
function sortColors(nums) {
    const count = [0, 0, 0];
    for (const num of nums) count[num]++;
    let idx = 0;
    for (let color = 0; color < 3; color++) {
        while (count[color]-- > 0) nums[idx++] = color;
    }
}
```

### Dry Run
Input: `[2, 0, 2, 1, 1, 0]`, maxVal = 2

| Step | Action | State |
|------|--------|-------|
| Count pass | count each element | count = [2, 2, 2] |
| Reconstruct val=0 | count[0]=2, write 0 twice | output = [0, 0] |
| Reconstruct val=1 | count[1]=2, write 1 twice | output = [0, 0, 1, 1] |
| Reconstruct val=2 | count[2]=2, write 2 twice | output = [0, 0, 1, 1, 2, 2] |

### Complexity
```
Time:  O(n + K) — O(n) to count, O(K) to scan count array
       When K = O(n), this is O(n) — faster than any comparison sort
Space: O(K) for the count array
```

### Common Trap
- **Forgetting to handle a range offset.** If values start at min (not 0), use `count[value - min]` as the index. Forgetting this causes index-out-of-bounds.
- **Using counting sort when K is huge.** If the problem says values up to 10^9, you cannot allocate a count array of that size — use a different algorithm.

### Experience Tip
**Experience Tip:** Counting sort is the intended O(n) solution whenever the problem gives you a small explicit value range. The moment you see "values are in [0, K]" with small K in the constraints, think counting sort before reaching for comparison sort.

### Do Not Confuse With
- **Bucket Sort:** Bucket sort groups a range of values into one bucket; counting sort has one bucket per exact value. Counting sort is a special case of bucket sort with bucket width = 1.
- **Radix Sort:** Radix sort uses counting sort as a subroutine, applying it digit by digit.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 75 | Sort Colors | Medium | Three distinct values — counting sort in one pass | https://leetcode.com/problems/sort-colors/ |
| 1122 | Relative Sort Array | Easy | Count first array's elements, then reconstruct with reference order | https://leetcode.com/problems/relative-sort-array/ |
| 164 | Maximum Gap | Hard | Counting/bucket sort to get O(n) without comparison sort | https://leetcode.com/problems/maximum-gap/ |
| 347 | Top K Frequent Elements | Medium | Bucket by frequency (variation of counting sort concept) | https://leetcode.com/problems/top-k-frequent-elements/ |
| 268 | Missing Number | Easy | XOR or math, but counting array approach is the simplest mental model | https://leetcode.com/problems/missing-number/ |

### One-Minute Revision
```
ALGORITHM:    Counting Sort
IN SIMPLE WORDS: Count occurrences of each value, reconstruct sorted order from counts
USE WHEN:     Integer values in small known range [0, K]; K is much smaller than n^2
DON'T USE WHEN: K >> n; floats or complex objects; range unknown
CORE IDEA:    Value IS the index — no comparisons needed, breaks O(n log n) lower bound
TRACK:        count[value] = frequency; index pointer for reconstruction
TIME:         O(n + K)
SPACE:        O(K)
COMMON TRAP:  Offset values by min; don't use when K is too large
EXPERIENCE TIP: Small integer range in constraints = strong signal to use counting sort
```

---

## Cyclic Sort

### What is it?
When array values are in the range [1, n], each value has exactly one "correct" index (value `v` belongs at index `v - 1`). Cyclic sort places every element at its correct index using only swaps — no extra space. After one pass, missing and duplicate numbers are trivially identified.

### Visual
```
Input: [3, 1, 2]   values in [1, 3]

i=0: arr[0]=3, correct index = 3-1 = 2. arr[0] ≠ arr[2]. Swap.
     [2, 1, 3]
i=0: arr[0]=2, correct index = 2-1 = 1. arr[0] ≠ arr[1]. Swap.
     [1, 2, 3]
i=0: arr[0]=1, correct index = 0. arr[0] = arr[0]. Move i forward.
i=1: arr[1]=2, correct index = 1. Already correct. Move i forward.
i=2: arr[2]=3, correct index = 2. Already correct. Done.

Result: [1, 2, 3] — no missing, no duplicate.
```

### How does it work?
1. Start with `i = 0`.
2. Calculate `correctIndex = arr[i] - 1` (where this value should live).
3. If `arr[i] != arr[correctIndex]` (destination has a different value), swap `arr[i]` and `arr[correctIndex]` — do NOT advance `i`.
4. If `arr[i] == arr[correctIndex]` (destination already has this value — duplicate!), advance `i`.
5. If `arr[i] == i + 1` (already at correct index), advance `i`.
6. After the pass, scan: if `arr[j] != j + 1`, then `j + 1` is the missing number and `arr[j]` is the duplicate.

### Why does it work?
Each swap places at least one element at its final correct position. So across the entire array, there can be at most n swaps — each element gets placed at most once. The outer loop runs n times. Total: O(n). The O(1) space comes from doing everything in-place.

### When to use?
- Values are in the range `[1, n]` or `[0, n-1]`.
- The problem asks to find missing numbers, duplicate numbers, or the first missing positive.
- O(1) extra space is required.
- Any of these LeetCode signals: "array of n integers where each integer is in [1, n]."

### When NOT to use?
- Values are not in a bounded contiguous range starting at 1 or 0.
- You cannot modify the input array (cyclic sort rearranges it in place).

### How to recognize in a new problem?
The clearest signal is "n integers in range [1, n]" combined with "find missing" or "find duplicate." If you see both, cyclic sort is the intended O(n) / O(1) solution.

Concrete signals:
- "Find all numbers from 1 to n that are missing from the array."
- "Find the duplicate number in an array of n+1 integers where values are in [1, n]."
- "Find the first missing positive integer."

### Simple Example
Input: `[4, 3, 2, 7, 8, 2, 3, 1]`, values in [1, 8]
Expected output: missing = `[5, 6]`

Trace: Place each element at its correct index, then scan for `arr[j] != j + 1`.

### Code
```java
// Java — Find All Missing Numbers (LeetCode 448)
List<Integer> findDisappearedNumbers(int[] nums) {
    int i = 0;
    while (i < nums.length) {
        int correctIndex = nums[i] - 1;
        if (nums[i] != nums[correctIndex]) {
            // Swap to place nums[i] at its correct index
            int temp = nums[i];
            nums[i] = nums[correctIndex];
            nums[correctIndex] = temp;
        } else {
            i++; // Already correct OR duplicate — move forward
        }
    }
    List<Integer> missing = new ArrayList<>();
    for (int j = 0; j < nums.length; j++) {
        if (nums[j] != j + 1) missing.add(j + 1);
    }
    return missing;
}

// Find the Duplicate Number (LeetCode 287)
int findDuplicate(int[] nums) {
    int i = 0;
    while (i < nums.length) {
        if (nums[i] != i + 1) {
            int correctIndex = nums[i] - 1;
            if (nums[i] != nums[correctIndex]) {
                int temp = nums[i];
                nums[i] = nums[correctIndex];
                nums[correctIndex] = temp;
            } else {
                return nums[i]; // duplicate found — same value at two places
            }
        } else {
            i++;
        }
    }
    return -1;
}
```
```javascript
// JavaScript — Find All Missing Numbers
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

### Dry Run
Input: `[4, 3, 2, 7, 8, 2, 3, 1]`

| i | Array State | arr[i] | correctIndex | Action |
|---|-------------|--------|--------------|--------|
| 0 | [4,3,2,7,8,2,3,1] | 4 | 3 | arr[0]≠arr[3] → swap(0,3) |
| 0 | [7,3,2,4,8,2,3,1] | 7 | 6 | arr[0]≠arr[6] → swap(0,6) |
| 0 | [3,3,2,4,8,2,7,1] | 3 | 2 | arr[0]≠arr[2] → swap(0,2) |
| 0 | [2,3,3,4,8,2,7,1] | 2 | 1 | arr[0]≠arr[1] → swap(0,1) |
| 0 | [3,2,3,4,8,2,7,1] | 3 | 2 | arr[0]==arr[2]=3 → duplicate! i++ |
| 1 | [3,2,3,4,8,2,7,1] | 2 | 1 | arr[1]==2==1+1 → i++ |
| 2 | ... | 3 | 2 | arr[2]==3==2+1 → i++ |
| 3 | ... | 4 | 3 | arr[3]==4==3+1 → i++ |
| 4 | ... | 8 | 7 | swap(4,7) → arr becomes [3,2,3,4,1,2,7,8] |
| 4 | [3,2,3,4,1,2,7,8] | 1 | 0 | swap(4,0) → [1,2,3,4,3,2,7,8] |
| 4 | [1,2,3,4,3,2,7,8] | 3 | 2 | arr[4]==arr[2]=3 → duplicate! i++ |
| 5 | ... | 2 | 1 | arr[5]==arr[1]=2 → duplicate! i++ |
| 6 | ... | 7 | 6 | arr[6]==7==6+1 → i++ |
| 7 | ... | 8 | 7 | arr[7]==8==7+1 → i++ |

Scan: index 4 has arr[4]=3 ≠ 5 → missing 5. Index 5 has arr[5]=2 ≠ 6 → missing 6.
Result: `[5, 6]`

### Complexity
```
Time:  O(n) — at most n swaps total (each swap places at least one element correctly)
Space: O(1) — all work done in-place; only a few pointers
```

### Common Trap
- **Off-by-one in correctIndex.** If values are in [1, n], `correctIndex = arr[i] - 1`. If values are in [0, n-1], `correctIndex = arr[i]`. Mix these up and you get wrong answers or index-out-of-bounds.
- **Infinite loop on duplicate.** If you swap when `arr[i] == arr[correctIndex]` (same value at both positions), you swap identical values forever. Always check for this before swapping — if equal, just advance `i`.

### Experience Tip
**Experience Tip:** The swap-or-advance decision is the entire algorithm. If you can place the element, place it. If the destination already has the right value (either it's correct or it's a duplicate), move on. The second scan is trivial once the placement pass is done.

### Do Not Confuse With
- **Hash Set approach for missing numbers:** Uses O(n) space but does not modify the array — use when you cannot modify input. Cyclic sort is the O(1) space alternative.
- **Floyd's Cycle Detection (LeetCode 287 alternative):** Also finds duplicates in O(1) space without modifying the array, by treating values as pointers. More complex — cyclic sort is simpler when modification is allowed.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 268 | Missing Number | Easy | Simplest cyclic sort application — range [0, n] | https://leetcode.com/problems/missing-number/ |
| 448 | Find All Numbers Disappeared in an Array | Easy | Multiple missing values — scan after placement pass | https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array/ |
| 442 | Find All Duplicates in an Array | Medium | Values appearing twice — same placement logic | https://leetcode.com/problems/find-all-duplicates-in-an-array/ |
| 287 | Find the Duplicate Number | Medium | Range [1, n] with n+1 elements — one must repeat | https://leetcode.com/problems/find-the-duplicate-number/ |
| 41 | First Missing Positive | Hard | Place only values in [1, n], ignore others; first wrong index is answer | https://leetcode.com/problems/first-missing-positive/ |

### One-Minute Revision
```
ALGORITHM:    Cyclic Sort
IN SIMPLE WORDS: Place each value at index (value-1) using swaps, then scan for mismatches
USE WHEN:     Values in [1,n] or [0,n-1]; find missing/duplicate; O(1) space required
DON'T USE WHEN: Values not in bounded range; cannot modify input array
CORE IDEA:    Value determines its correct index — swap to place, scan to find mismatches
TRACK:        i (current position); correctIndex = arr[i] - 1
TIME:         O(n)
SPACE:        O(1)
COMMON TRAP:  Check arr[i] == arr[correctIndex] before swapping — prevents infinite loop on duplicates
EXPERIENCE TIP: swap-or-advance is the whole algorithm; the second scan is just reading results
```

---

## Custom Comparator Sorting

### What is it?
Sometimes the natural sort order (ascending numeric, alphabetical) does not give the right answer. Custom comparator sorting lets you define a "comes before" rule for any two elements, then uses that rule to sort. The classic example: arrange numbers to form the largest possible concatenated number.

### Visual
```
Problem: Arrange [3, 30, 34, 5, 9] to form the largest number.

Naive ascending: 3, 5, 9, 30, 34 → "35930340" (wrong)
Naive descending: 9, 5, 34, 30, 3 → "9534303" (close but wrong)

Custom rule: compare by string concatenation
  "9" vs "5":  "95" > "59"  → 9 comes first
  "5" vs "34": "534" > "345" → 5 comes before 34
  "34" vs "3": "343" > "334" → 34 comes before 3
  "3" vs "30": "330" > "303" → 3 comes before 30

Custom sorted: 9, 5, 34, 3, 30 → "9534330" ✓
```

### How does it work?
1. Identify the correct "comes before" rule for the problem (the hard part).
2. Write a comparator: a function `compare(a, b)` that returns negative if `a` should come before `b`, positive if `b` should come before `a`, zero if equal.
3. Pass the comparator to the standard sort function.
4. The sort arranges elements such that `compare(arr[i], arr[i+1]) <= 0` for all `i`.

### Why does it work?
Any standard comparison sort (merge sort, quick sort, timsort) works correctly as long as the comparator defines a valid total order — meaning it is consistent and transitive (if a < b and b < c, then a < c). The sort finds the unique arrangement satisfying the comparator for all adjacent pairs.

### When to use?
- You need a non-standard ordering: sort by end time, sort by frequency, sort strings by concatenation result.
- The problem says "arrange X to maximize/minimize some property" — the arrangement is a sorting problem with a custom rule.
- You need to sort objects by multiple fields (primary key, then tiebreaker).

### When NOT to use?
- The ordering depends on global context (e.g., topological sort) — custom comparator only uses pairwise comparison.
- Standard numeric or lexicographic sort already gives the right result.

### How to recognize in a new problem?
The tell: the problem asks you to "arrange" or "order" elements to achieve some goal, and the right arrangement can be determined by comparing any two elements in isolation.

Concrete signals:
- "Arrange numbers to form the largest number."
- "Sort intervals by start time, breaking ties by end time."
- "Sort by frequency descending, then by value ascending."

### Simple Example
Input: `[10, 2]`
Expected output: `"210"` (not `"102"`)

Compare `"10"` and `"2"`: `"210"` (2 first) vs `"102"` (10 first). `"210" > "102"` → 2 comes before 10.

### Code
```java
// Java — Largest Number (LeetCode 179)
String largestNumber(int[] nums) {
    String[] strs = new String[nums.length];
    for (int i = 0; i < nums.length; i++) strs[i] = String.valueOf(nums[i]);

    // Custom comparator: a comes before b if a+b > b+a (as strings)
    Arrays.sort(strs, (a, b) -> (b + a).compareTo(a + b));

    if (strs[0].equals("0")) return "0"; // edge case: all zeros
    return String.join("", strs);
}

// Sort intervals by start time, breaking ties by end time
int[][] sortIntervals(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> {
        if (a[0] != b[0]) return a[0] - b[0]; // sort by start ascending
        return a[1] - b[1]; // break ties by end ascending
    });
    return intervals;
}
```
```javascript
// JavaScript — Largest Number
function largestNumber(nums) {
    const strs = nums.map(String);
    strs.sort((a, b) => (b + a) > (a + b) ? 1 : -1);
    if (strs[0] === "0") return "0";
    return strs.join("");
}

// Sort intervals by start time
function sortIntervals(intervals) {
    return intervals.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
}
```

### Dry Run
Input: `[3, 30, 34, 5, 9]`

Comparisons (b+a vs a+b):

| a | b | a+b | b+a | Winner (larger concatenation first) |
|---|---|-----|-----|-------------------------------------|
| "3" | "30" | "330" | "303" | "330" > "303" → 3 before 30 |
| "3" | "34" | "334" | "343" | "343" > "334" → 34 before 3 |
| "5" | "34" | "534" | "345" | "534" > "345" → 5 before 34 |
| "9" | "5" | "95" | "59" | "95" > "59" → 9 before 5 |

After sort: `["9", "5", "34", "3", "30"]` → `"9534330"`

### Complexity
```
Time:  O(n log n) — standard sort with custom comparator
       For "Largest Number": each comparison is O(L) where L = digits per number,
       so O(n * L * log n) total
Space: O(n) — for the string conversion array; sort is in-place or O(log n) stack
```

### Common Trap
- **Comparator must be transitive.** For "Largest Number," transitivity holds mathematically but is not obvious — if you invent your own comparator, always verify it can't create cycles (a < b < c < a).
- **Edge case: all zeros.** `[0, 0]` should return `"0"` not `"00"`. Always check if the first element in the sorted result is `"0"`.

### Experience Tip
**Experience Tip:** For "Largest Number" type problems, always think "what two-element comparison rule gives the right answer?" Test it on `[3, 30]` — that's the trickiest pair. If your rule handles `[3, 30]` correctly, it almost certainly generalizes.

### Do Not Confuse With
- **Topological Sort:** Topological sort determines order from dependencies (edges in a graph). Custom comparator sort determines order from pairwise element comparison. They solve completely different problems.
- **Greedy ordering:** Sometimes greedy algorithms also produce a specific order (e.g., activity selection by end time). The difference: greedy reasoning determines the rule; custom comparator implements that rule.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 179 | Largest Number | Medium | Comparator: (b+a).compareTo(a+b) — why does string concat comparison work? | https://leetcode.com/problems/largest-number/ |
| 435 | Non-overlapping Intervals | Medium | Sort by end time — greedy on sorted intervals | https://leetcode.com/problems/non-overlapping-intervals/ |
| 56 | Merge Intervals | Medium | Sort by start time, then linear scan | https://leetcode.com/problems/merge-intervals/ |
| 1029 | Two City Scheduling | Medium | Sort by cost difference to allocate optimally | https://leetcode.com/problems/two-city-scheduling/ |
| 937 | Reorder Data in Log Files | Medium | Multi-field comparator: letter logs by content then identifier | https://leetcode.com/problems/reorder-data-in-log-files/ |

### One-Minute Revision
```
ALGORITHM:    Custom Comparator Sorting
IN SIMPLE WORDS: Define your own "comes before" rule, use it with standard sort
USE WHEN:     Non-standard order needed; "arrange to maximize/minimize"; multi-field sort
DON'T USE WHEN: Order requires global context (use topological sort); standard sort works
CORE IDEA:    Any pairwise comparison function that is transitive can drive a sort
TRACK:        The comparator function; edge cases (all zeros, all equal)
TIME:         O(n log n) — standard sort with custom comparator
SPACE:        O(n) for string conversions if needed; O(log n) sort stack
COMMON TRAP:  Verify transitivity; handle all-zeros edge case in "Largest Number"
EXPERIENCE TIP: Test your comparator on the trickiest pair first (e.g., [3, 30] for largest number)
```

---

## Sorting as Preprocessing

### What is it?
Sorting is not always the final answer — it is often a first step that makes your actual algorithm possible or much simpler. Sorting trades O(n log n) time to impose order, which then lets you use faster techniques (two pointers, binary search, greedy) on the sorted data.

### Visual
```
Without sort (3Sum brute force):
For each triple (i,j,k): check if sum == 0    → O(n^3)

With sort as preprocessing:
Sort the array → O(n log n)
For each i, use two pointers on the rest → O(n^2) total
                                         → 10x faster!

Pattern: Sort enables two-pointer / binary search / greedy
```

### How does it work?
1. Ask: "Would this problem become simpler if the input were sorted?"
2. If yes, sort first (usually O(n log n)).
3. Apply the simpler algorithm on the sorted data (often O(n) or O(n log n)).
4. Total complexity: usually O(n log n).

### Why does it work?
Sorting creates structure. Structure eliminates uncertainty. With sorted data:
- Two pointers work because moving left pointer always increases sum, moving right always decreases it.
- Binary search works because you can eliminate half the search space per step.
- Greedy works because processing elements in order (by start time, end time, value) guarantees locally optimal choices are globally optimal.

### When to use?
- You need to find pairs or triples summing to a target — sort enables two pointers.
- Intervals need to be processed in order — sort by start or end time.
- Original element order does not matter for the answer.
- You cannot think of a direct approach — "what if sorted?" often unlocks a clean solution.

### When NOT to use?
- Original order matters: subarray problems, sliding window, contiguous sequences.
- Hashing gives O(n) without sorting (e.g., Two Sum with a hash map — no need to sort).
- The array is already logically sorted (don't sort again).

### How to recognize in a new problem?
If you're stuck, ask yourself: "What if the array were sorted — would the solution be obvious?" If yes, sort first. The most common pattern: you need pairs/triples with a property, sorting lets you use two pointers.

Concrete signals:
- "Find pairs that sum to X." (Sort, then two pointers from both ends.)
- "Merge overlapping intervals." (Sort by start, then linear scan.)
- "Select maximum non-overlapping intervals." (Sort by end time, greedy.)

### Simple Example
Input: `[[1,3],[2,6],[8,10],[15,18]]` (intervals)
Expected output: `[[1,6],[8,10],[15,18]]` (merged overlapping intervals)

Without sorting: hard to know which intervals to merge.
After sorting by start time: `[1,3], [2,6], [8,10], [15,18]` — scan left to right, extend current interval if next overlaps.

### Code
```java
// Java — Merge Intervals (LeetCode 56)
int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]); // sort by start time

    List<int[]> merged = new ArrayList<>();
    int[] current = intervals[0];

    for (int i = 1; i < intervals.length; i++) {
        if (intervals[i][0] <= current[1]) {
            // Overlapping: extend the current interval's end
            current[1] = Math.max(current[1], intervals[i][1]);
        } else {
            // No overlap: save current, move to next
            merged.add(current);
            current = intervals[i];
        }
    }
    merged.add(current);
    return merged.toArray(new int[0][]);
}

// Non-overlapping Intervals (LeetCode 435) — sort by END time, greedy
int eraseOverlapIntervals(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[1] - b[1]); // sort by end time
    int removals = 0;
    int lastEnd = intervals[0][1];
    for (int i = 1; i < intervals.length; i++) {
        if (intervals[i][0] < lastEnd) {
            removals++; // overlap — remove this interval
        } else {
            lastEnd = intervals[i][1]; // no overlap — keep this interval
        }
    }
    return removals;
}
```
```javascript
// JavaScript — Merge Intervals
function merge(intervals) {
    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
        const current = merged[merged.length - 1];
        if (intervals[i][0] <= current[1]) {
            current[1] = Math.max(current[1], intervals[i][1]);
        } else {
            merged.push(intervals[i]);
        }
    }
    return merged;
}

// 3Sum with sort + two pointers
function threeSum(nums) {
    nums.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] === nums[i - 1]) continue; // skip duplicates
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
Input intervals: `[[2,6],[1,3],[8,10],[15,18]]`

| Step | Action | merged |
|------|--------|--------|
| Sort by start | `[[1,3],[2,6],[8,10],[15,18]]` | - |
| current = [1,3] | - | [[1,3]] |
| [2,6]: 2 ≤ 3 → overlap | extend end to max(3,6)=6 | current=[1,6] |
| [8,10]: 8 > 6 → no overlap | save [1,6], current=[8,10] | [[1,6]] |
| [15,18]: 15 > 10 → no overlap | save [8,10], current=[15,18] | [[1,6],[8,10]] |
| End | save [15,18] | [[1,6],[8,10],[15,18]] |

### Complexity
```
Time:  O(n log n) — dominated by the sort; subsequent scan is O(n)
Space: O(log n) — sort stack; O(n) if output array is counted
```

### Common Trap
- **Sorting when original order matters.** Subarray problems (maximum subarray sum, sliding window) depend on element positions. Sorting destroys this. Never sort blindly.
- **Forgetting to handle duplicates after sorting.** In 3Sum, after sorting, skip equal values at the same pointer position to avoid duplicate triplets.

### Experience Tip
**Experience Tip:** "What if sorted?" is one of the most powerful questions in an interview. When stuck, say it aloud — it signals good thinking AND often unlocks the solution. Many O(n²) brute-force solutions become O(n log n) after sorting plus a linear scan.

### Do Not Confuse With
- **Sorting as the final answer:** Some problems literally just ask you to sort. Here we mean sorting as a *step* to enable a better algorithm.
- **Greedy without sorting:** Some greedy algorithms do not need an explicit sort step if input is already structured. Check first before adding O(n log n) overhead.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 56 | Merge Intervals | Medium | Sort by start; linear scan to merge overlapping pairs | https://leetcode.com/problems/merge-intervals/ |
| 435 | Non-overlapping Intervals | Medium | Sort by end time; greedy count of intervals to remove | https://leetcode.com/problems/non-overlapping-intervals/ |
| 15 | 3Sum | Medium | Sort first; two pointers eliminate O(n^3) brute force | https://leetcode.com/problems/3sum/ |
| 452 | Minimum Number of Arrows to Burst Balloons | Medium | Sort by end; same greedy structure as non-overlapping intervals | https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/ |
| 164 | Maximum Gap | Hard | Bucket sort insight: max gap must be between buckets, not within | https://leetcode.com/problems/maximum-gap/ |

### One-Minute Revision
```
ALGORITHM:    Sorting as Preprocessing
IN SIMPLE WORDS: Sort first to impose order, then apply a simpler linear algorithm
USE WHEN:     Pairs/triples with a target sum; interval merging/selection; original order irrelevant
DON'T USE WHEN: Original order matters (subarray, sliding window); hashing gives O(n) without sort
CORE IDEA:    Sorted order removes uncertainty — enables two pointers, binary search, greedy
TRACK:        Depends on follow-up algorithm — usually left/right pointers or current interval
TIME:         O(n log n) dominated by sort; follow-up algorithm often O(n)
SPACE:        O(log n) sort stack; follow-up may need O(n) output
COMMON TRAP:  Don't sort when subarray structure matters; handle duplicates after sorting
EXPERIENCE TIP: "What if sorted?" is a powerful unstick technique — say it aloud in interviews
```

---

## Quick Reference — Choosing the Right Sort

| Signal in Problem | Algorithm | Time | Space |
|---|---|---|---|
| Values in [1,n], find missing/duplicate, O(1) space | Cyclic Sort | O(n) | O(1) |
| Integer values in small range [0, K] | Counting Sort | O(n+K) | O(K) |
| Kth largest/smallest element | Quick Select | O(n) avg | O(1) iter |
| Kth + streaming data OR sorted top-K | Heap | O(n log K) | O(K) |
| Stable sort needed | Merge Sort | O(n log n) | O(n) |
| Count inversions / count smaller after self | Merge Sort (augmented) | O(n log n) | O(n) |
| Sort linked list | Merge Sort | O(n log n) | O(1) extra |
| In-place sort, no stability needed | Quick Sort | O(n log n) avg | O(log n) |
| Non-standard "comes before" rule | Custom Comparator + sort | O(n log n) | O(n) |
| Intervals need ordered processing | Sort as Preprocessing | O(n log n) | O(log n) |
| Pairs/triples summing to target | Sort + Two Pointers | O(n log n) | O(log n) |

---

*Next: [05-HASHING-AND-SETS.md](05-HASHING-AND-SETS.md) — Trade space for time: the universal optimizer.*
