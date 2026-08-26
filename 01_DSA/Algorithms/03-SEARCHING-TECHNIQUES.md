# Searching Techniques — 1-Hour Learning Module

> *"Binary search is not just an algorithm — it is a way of thinking. Any time you can discard half the possibilities in one step, binary search is hiding in the problem."*

---

## Table of Contents

- [[0–10 min] Big Picture](#010-min-big-picture)
- [[10–20 min] Mental Model](#1020-min-mental-model)
- [[20–35 min] Core Patterns](#2035-min-core-patterns)
- [[35–45 min] Concrete Code + Dry Run](#3545-min-concrete-code--dry-run)
- [[45–55 min] Pattern Recognition](#4555-min-pattern-recognition)
- [[55–60 min] Final Mental Checklist](#5560-min-final-mental-checklist)
- [Active Recall](#active-recall)
- [Recommended Practice Direction](#recommended-practice-direction)
- [2-Minute Cheat Sheet](#2-minute-cheat-sheet)

---

## [0–10 min] Big Picture

### What is Searching? Why Does It Exist?

You have data. You need to find something in it. The naive way: check every element one by one. That is O(n). For a million elements, that is a million checks.

The smarter way: if your data has **structure** (specifically, a sorted or monotonic order), you can eliminate large chunks of the search space with a single comparison. That is the core idea behind all searching techniques in this module.

### The Real-World Analogy

Think about a guessing game. Someone picks a number between 1 and 1,000. You guess 500. They say "too high." You now know the answer is in 1–499. You just eliminated half the possibilities in one step. Guess 250. "Too low." Now it's in 251–499. One step, half gone again.

After 10 guesses, you can narrow down 1,024 possibilities to exactly one. That is O(log n) — the power of eliminating half the space each step.

This is binary search. Every other technique in this module is a variation of this same insight applied to a different shape of problem.

### One Tiny Example

```
Array: [2, 5, 8, 12, 16, 23, 38, 45]
Target: 23

Naive: check 2... 5... 8... 12... 16... 23 ✓  (6 comparisons)

Binary: check middle 12 → too small → right half
        check middle 23 → found!              (2 comparisons)
```

### What This Module Covers

| Pattern | Core Question |
|---|---|
| Classic Binary Search | "Is the target in this sorted array?" |
| Lower / Upper Bound | "Where is the first/last position of this value?" |
| Rotated Array Search | "Sorted, but shifted — where is the target?" |
| Binary Search on Answer | "What is the minimum feasible value?" |
| Search in 2D Matrix | "Where is the target in a sorted grid?" |
| Exponential Search | "Array is unbounded — where is the target?" |
| Ternary Search | "Where is the peak of this unimodal function?" |
| Median of Two Sorted Arrays | "Median without merging?" |

---

## [10–20 min] Mental Model

### The Central Insight: Search Space Reduction

Do not think of binary search as "compute mid, compare, repeat." Think of it as:

> At each step, I define a **search space** — the range of indices (or values) that might contain the answer. I make one observation that lets me **cut the search space in half**. I repeat until the space has one element.

Three things must be true for this to work:

1. **The search space has a structure** you can navigate (sorted order, or a monotonic property).
2. **One comparison tells you which half to discard** — the side that cannot contain the answer.
3. **The search space shrinks every step** — you never re-check eliminated elements.

### What Is "Monotonic Property"?

Before the formal term: imagine a light switch that starts OFF and flips to ON at some point, and stays ON forever. Any sequence with this shape is monotonic — it changes direction at most once.

Formal: a function f is monotonic if it is either non-decreasing (always goes up or flat) or non-increasing (always goes down or flat).

Binary search works on any monotonic property. "Sorted array" is the most common example, but it is not the only one.

### Key Observation

In a sorted array, for any index `mid`:
- Everything to the **left** of `mid` is **smaller or equal**
- Everything to the **right** of `mid` is **larger or equal**

So when you compare `arr[mid]` to your target, you learn not just about `mid` — you learn about an entire half of the array.

```
arr = [2, 5, 8, 12, 16, 23, 38, 45]
       0  1  2   3   4   5   6   7

low=0, high=7, mid=3 → arr[3]=12

Target=23: 23 > 12
           EVERYTHING at index 0,1,2,3 is ≤ 12 < 23
           → target cannot be in [0..3]
           → eliminate the entire left half in one step
```

### What State Do We Maintain and Why?

We maintain two pointers: `low` and `high`, representing the **current search space**.

- `low` = smallest index that might contain the answer
- `high` = largest index that might contain the answer

Invariant: the answer (if it exists) is always within `[low, high]`.

Every update must preserve this invariant:
- When we move `low` up (`low = mid + 1`): we are saying "the answer is not at `mid` or anything smaller"
- When we move `high` down (`high = mid - 1`): we are saying "the answer is not at `mid` or anything larger"

### ASCII Diagram: Shrinking Search Space

```
Step 0:  [2,  5,  8, 12, 16, 23, 38, 45]
          ^                           ^
         low=0                     high=7
         mid = (0+7)/2 = 3 → arr[3]=12, target=23, 12<23

Step 1:  [2,  5,  8, 12, 16, 23, 38, 45]
                          ^           ^
                        low=4       high=7
                        mid = (4+7)/2 = 5 → arr[5]=23 ✓ FOUND
```

---

## [20–35 min] Core Patterns

### Pattern 1: Classic Binary Search

**When to use:**
- The array is sorted
- You need to check if an exact value exists
- You need O(log n) lookup

**When NOT to use:**
- Data is unsorted and cannot be sorted without losing information
- You need all occurrences (this only finds one)
- No monotonic property exists to guide which half to discard

**Brute Force → Observation → Optimization:**

Brute force: scan left to right. O(n).

Observation: In a sorted array, if `arr[mid] < target`, then `arr[0]` through `arr[mid]` are all less than the target. We can skip all of them in one step.

Optimization: Keep halving the search space.

**Algorithm:**

```
low = 0, high = n - 1

while low <= high:
    mid = low + (high - low) / 2    ← avoid integer overflow
    if arr[mid] == target: return mid
    if arr[mid] < target:  low = mid + 1
    if arr[mid] > target:  high = mid - 1

return -1
```

**Why `mid = low + (high - low) / 2` not `(low + high) / 2`?**

If `low = 1,000,000,000` and `high = 2,000,000,000`, their sum overflows a 32-bit integer. The safe form avoids this entirely.

**Why `low <= high` and not `low < high`?**

With `<=`, when `low == high` we still check that single element. Missing this check would skip the last candidate.

---

### Pattern 2: Lower Bound / Upper Bound (The Real Interview Pattern)

**The real shift in thinking:** Instead of "where IS the target?" ask "where SHOULD the target go?"

- **Lower Bound**: the leftmost position where we could insert `target` without breaking sort order. Equivalently: first index `i` where `arr[i] >= target`.
- **Upper Bound**: first index `i` where `arr[i] > target`. One past the last occurrence.

**When to use:**
- Find the **first occurrence** of a value → lower_bound, check if `arr[result] == target`
- Find the **last occurrence** → upper_bound - 1, check if `arr[result] == target`
- Count occurrences → `upper_bound(x) - lower_bound(x)`
- Find first element ≥ X (ceiling)
- Find last element ≤ X (floor) → `upper_bound(x) - 1`
- "How many elements are less than X?" → `lower_bound(x)`
- "First Bad Version" style problems

**When NOT to use:**
- You just need any occurrence — classic binary search is simpler

**Brute Force → Observation → Optimization:**

Brute force: scan left to right for the first match. O(n).

Observation: We are not looking for a specific index. We are looking for the **boundary** between elements that satisfy a condition and elements that do not. This boundary always exists, and we can binary search for it.

Optimization: Converge `low` and `high` to the same point — that point is the boundary.

**Lower Bound Algorithm:**

```
low = 0, high = n        ← high = n, not n-1! insertion can be past the end

while low < high:          ← strict < because low==high means converged
    mid = low + (high - low) / 2
    if arr[mid] < target:  low = mid + 1
    else:                  high = mid    ← not mid-1! mid itself might be the answer

return low
```

**Upper Bound Algorithm (only one line changes):**

```
low = 0, high = n

while low < high:
    mid = low + (high - low) / 2
    if arr[mid] <= target: low = mid + 1   ← <= instead of <
    else:                  high = mid

return low
```

**The critical asymmetry:** `high = mid` (not `mid - 1`) is intentional. We cannot exclude `mid` because it might be the first element satisfying our condition. But we always make progress because `low = mid + 1` shrinks the space.

**Why does this converge?** The space `[low, high)` strictly shrinks each iteration. When `low == high`, we have our answer.

---

### Pattern 3: Binary Search on Rotated Sorted Array

**The situation:** A sorted array like `[1,3,5,7,9,11]` is rotated at some unknown pivot to become `[7,9,11,1,3,5]`. It is now in two sorted segments.

**The key insight:** At any midpoint, at least one of the two halves `[low..mid]` or `[mid..high]` is **guaranteed to be sorted**. You can check which one, then decide if the target belongs there.

```
[7, 9, 11, 1, 3, 5]
 ^       ^        ^
low     mid     high

Left half [7,9,11]: arr[low]=7 <= arr[mid]=11 → left half IS sorted
Target = 3: is 3 in [7,11]? No → go right
```

**When to use:**
- "Rotated sorted array" explicitly stated
- "Circularly sorted" or "shifted sorted"
- Finding the minimum in a rotated sorted array

**When NOT to use:**
- Duplicates present — with duplicates, you cannot always determine which half is sorted, worst case O(n)

**Algorithm (search for target):**

```
low = 0, high = n - 1

while low <= high:
    mid = low + (high - low) / 2
    if arr[mid] == target: return mid

    if arr[low] <= arr[mid]:           ← left half is sorted
        if arr[low] <= target < arr[mid]:
            high = mid - 1
        else:
            low = mid + 1
    else:                              ← right half is sorted
        if arr[mid] < target <= arr[high]:
            low = mid + 1
        else:
            high = mid - 1

return -1
```

**Algorithm (find minimum — finds the rotation point):**

```
low = 0, high = n - 1

while low < high:
    mid = low + (high - low) / 2
    if arr[mid] > arr[high]:
        low = mid + 1         ← minimum is in the right segment
    else:
        high = mid            ← minimum is at mid or to the left

return arr[low]
```

---

### Pattern 4: Binary Search on Answer (Parametric Search)

**This is the most underrated pattern in interviews.**

Instead of searching for an element in an array, you search for **the answer itself** in a range of possible answers.

**The core transformation:**
- Original problem: "What is the minimum X such that condition C holds?"
- Transformed: "Is X = candidate feasible (does condition C hold)?" → Yes/No question

If the feasibility function is **monotonic** (once it becomes YES it stays YES, or once it becomes NO it stays NO), you can binary search on the answer.

**When to use:**
- "Minimize the maximum" — classic signal
- "Maximize the minimum" — classic signal
- "What is the minimum capacity/speed/distance such that..."
- The answer is a number in a known range
- You can write a YES/NO feasibility check for any candidate

**When NOT to use:**
- The feasibility function is not monotonic (it can flip back and forth)
- You can compute the exact answer directly with math

**Algorithm structure:**

```
lo = minimum_possible_answer
hi = maximum_possible_answer

while lo < hi:
    mid = lo + (hi - lo) / 2
    if isFeasible(mid):
        hi = mid          ← mid might be the answer, keep it
    else:
        lo = mid + 1      ← mid is not feasible, discard it

return lo
```

**The feasibility check** is usually a greedy O(n) scan. This is where domain-specific logic lives. The binary search wrapper is always the same.

**Why this works:** Imagine a dial from `lo` to `hi`. At some threshold T: every answer ≥ T is feasible, every answer < T is not (or the other way). You are binary searching for T.

```
lo ──────────────────────── hi
[NOT feasible][feasible, feasible, feasible...]
              ^
              T  ← binary search finds this
```

**Classic examples and their feasibility checks:**

| Problem | Search Range | Feasibility Check |
|---|---|---|
| Ship packages in D days | [max_weight, total_weight] | Can we ship all packages in D days at capacity=mid? (greedy) |
| Koko Eating Bananas | [1, max_pile] | Can Koko eat all bananas in H hours at speed=mid? |
| Split Array Largest Sum | [max_element, total_sum] | Can we split into ≤ k parts where max part ≤ mid? |
| Aggressive Cows | [1, max_gap] | Can we place k cows with min distance ≥ mid? (greedy) |
| Painter's Partition | [max_board, total_boards] | Can k painters finish if max time = mid? |
| Min Days for M Bouquets | [1, max_bloom_day] | By day=mid, can we form M adjacent bouquets? |

---

### Pattern 5: Search in 2D Matrix (Two Variants)

**Variant 1 — Fully sorted matrix (LeetCode 74):**
Rows are sorted, AND the last element of each row < first element of next row. This means if you flatten the matrix, it is one sorted array.

Treat index `k` as: `row = k / cols`, `col = k % cols`. Binary search normally. Time: O(log(m × n)).

**Variant 2 — Row-sorted AND column-sorted (LeetCode 240):**
Each row is sorted left to right, each column is sorted top to bottom. Rows are NOT concatenated in order.

Start at **top-right corner**. This is the key insight: at this corner, moving left decreases the value, moving down increases it. You have two knobs, and one comparison tells you which way to turn.

```
matrix:
 [1,  4,  7, 11]
 [2,  5,  8, 12]
 [3,  6,  9, 16]
 [10, 13, 14, 17]

Start at top-right: 11. Target = 5.
11 > 5 → move left
 7 > 5 → move left
 4 < 5 → move down
 5 == 5 → FOUND
```

Algorithm: `row=0, col=n-1`. While in bounds: if `matrix[row][col] == target` return true; if `> target` do `col--`; else do `row++`.

Time: O(m + n) — each step eliminates a row or column, and there are m+n total.

---

### Pattern 6: Exponential Search

**The situation:** The array is sorted but its size is unknown (or effectively infinite).

**The idea:** First find the right range by doubling: check index 1, 2, 4, 8, 16... until you overshoot the target. Then binary search within `[bound/2, bound]`.

```
Start: bound = 1
while arr[bound] < target: bound *= 2
Binary search in [bound/2, min(bound, n-1)]
```

Time: O(log n). Finding the range takes O(log n) doublings; binary search in the range also takes O(log n).

Useful when: unbounded sorted array, or target is likely near the beginning (exponential growth reaches a small target quickly).

---

### Pattern 7: Ternary Search

**The situation:** You want the peak (maximum) of a **unimodal function** — one that increases then decreases (or decreases then increases). This is NOT about sorted arrays.

**The idea:** Sample two points `m1` and `m2` inside `[low, high]`. On a hill, if `f(m1) < f(m2)`, the peak cannot be to the left of `m1` — eliminate `[low, m1]`. Otherwise eliminate `[m2, high]`. You eliminate one-third per step.

```
m1 = low + (high - low) / 3
m2 = high - (high - low) / 3

if f(m1) < f(m2): low = m1 + 1
else:             high = m2 - 1
```

Time: O(log₃ n) = O(log n).

**Important:** For "find peak element" in a discrete array, binary search comparing `arr[mid]` vs `arr[mid+1]` is simpler and preferred in interviews. Ternary search is more common in competitive programming.

---

### Pattern 8: Median of Two Sorted Arrays

**The problem:** Given two sorted arrays A (size m) and B (size n), find the median of their merged result in O(log(min(m, n))) without actually merging.

**The insight:** A median splits all elements into a left half and a right half of equal size. You need to find the right number of elements from A and B to put in the left half — binary search on this count.

Binary search on partition index `i` in A (0 to m). For each `i`, `j = (m + n + 1)/2 - i` elements come from B. The split is valid when `maxLeft_A <= minRight_B AND maxLeft_B <= minRight_A`.

```
A: [1, 3, 5]   B: [2, 4, 6, 8]    total = 7, left half needs 4 elements

Try i=1 (1 element from A in left, 3 from B):
  maxLeft_A=1, minRight_A=3
  maxLeft_B=4, minRight_B=6
  Is 1 <= 6? Yes. Is 4 <= 3? NO → i too small, search right

Try i=2 (2 elements from A, 2 from B):
  maxLeft_A=3, minRight_A=5
  maxLeft_B=4, minRight_B=6
  Is 3 <= 6? Yes. Is 4 <= 5? Yes → VALID
```

Always binary search on the **smaller** array. Handle edge cases (i=0 or i=m) with -∞ and +∞ sentinels.

---

## [35–45 min] Concrete Code + Dry Run

### Classic Binary Search

**Example:** `arr = [2, 5, 8, 12, 16, 23, 38, 45]`, target = `23`

**Java:**
```java
int binarySearch(int[] arr, int target) {
    int low = 0, high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target)  low = mid + 1;
        else                    high = mid - 1;
    }
    return -1;
}
```

**TypeScript:**
```typescript
function binarySearch(arr: number[], target: number): number {
    let low = 0, high = arr.length - 1;
    while (low <= high) {
        const mid = low + Math.floor((high - low) / 2);
        if (arr[mid] === target) return mid;
        if (arr[mid] < target)   low = mid + 1;
        else                     high = mid - 1;
    }
    return -1;
}
```

**Dry Run Table:**

| Step | low | high | mid | arr[mid] | Action |
|------|-----|------|-----|----------|--------|
| 1 | 0 | 7 | 3 | 12 | 12 < 23 → low = 4 |
| 2 | 4 | 7 | 5 | 23 | 23 == 23 → return 5 |

Result: index 5. Complexity: O(log n) time, O(1) space.

---

### Lower Bound

**Example:** `arr = [1, 3, 3, 3, 7, 9]`, find first occurrence of `3`

**Java:**
```java
int lowerBound(int[] arr, int target) {
    int low = 0, high = arr.length;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] < target) low = mid + 1;
        else                   high = mid;
    }
    return low;
}
```

**TypeScript:**
```typescript
function lowerBound(arr: number[], target: number): number {
    let low = 0, high = arr.length;
    while (low < high) {
        const mid = low + Math.floor((high - low) / 2);
        if (arr[mid] < target) low = mid + 1;
        else                   high = mid;
    }
    return low;
}
```

**Dry Run Table** (`arr = [1, 3, 3, 3, 7, 9]`, target = `3`):

| Step | low | high | mid | arr[mid] | Condition | Action |
|------|-----|------|-----|----------|-----------|--------|
| 1 | 0 | 6 | 3 | 3 | 3 >= 3 | high = 3 |
| 2 | 0 | 3 | 1 | 3 | 3 >= 3 | high = 1 |
| 3 | 0 | 1 | 0 | 1 | 1 < 3 | low = 1 |
| 4 | 1 | 1 | — | — | low==high | return 1 |

Result: index 1. `arr[1] = 3` → first occurrence confirmed.

For **last occurrence**: `upperBound(arr, 3) - 1 = 4 - 1 = 3`. `arr[3] = 3` confirmed.

Complexity: O(log n) time, O(1) space.

---

### Binary Search on Answer — Koko Eating Bananas

**Problem:** Piles = `[3, 6, 7, 11]`, H = 8 hours. Find minimum eating speed so Koko finishes all bananas in ≤ H hours.

**Search range:** speed ∈ [1, max_pile=11].

**Feasibility check:** At speed `s`, pile `p` takes `ceil(p/s)` hours. Sum all hours. Is total ≤ H?

**Java:**
```java
int minEatingSpeed(int[] piles, int h) {
    int low = 1, high = Arrays.stream(piles).max().getAsInt();
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (canFinish(piles, mid, h)) high = mid;
        else                          low = mid + 1;
    }
    return low;
}

boolean canFinish(int[] piles, int speed, int h) {
    int hoursNeeded = 0;
    for (int pile : piles) {
        hoursNeeded += (pile + speed - 1) / speed;
    }
    return hoursNeeded <= h;
}
```

**TypeScript:**
```typescript
function minEatingSpeed(piles: number[], h: number): number {
    let low = 1, high = Math.max(...piles);
    while (low < high) {
        const mid = low + Math.floor((high - low) / 2);
        if (canFinish(piles, mid, h)) high = mid;
        else                          low = mid + 1;
    }
    return low;
}

function canFinish(piles: number[], speed: number, h: number): boolean {
    return piles.reduce((total, pile) => total + Math.ceil(pile / speed), 0) <= h;
}
```

**Dry Run Table** (`piles = [3, 6, 7, 11]`, H = 8):

| Step | low | high | mid=speed | Hours at speed | Feasible? | Action |
|------|-----|------|-----------|----------------|-----------|--------|
| 1 | 1 | 11 | 6 | ceil(3/6)+ceil(6/6)+ceil(7/6)+ceil(11/6) = 1+1+2+2 = 6 | 6≤8 YES | high=6 |
| 2 | 1 | 6 | 3 | ceil(3/3)+ceil(6/3)+ceil(7/3)+ceil(11/3) = 1+2+3+4 = 10 | 10>8 NO | low=4 |
| 3 | 4 | 6 | 5 | ceil(3/5)+ceil(6/5)+ceil(7/5)+ceil(11/5) = 1+2+2+3 = 8 | 8≤8 YES | high=5 |
| 4 | 4 | 5 | 4 | ceil(3/4)+ceil(6/4)+ceil(7/4)+ceil(11/4) = 1+2+2+3 = 8 | 8≤8 YES | high=4 |
| 5 | 4 | 4 | — | — | — | return 4 |

Answer: 4. Complexity: O(n log m) where m = max pile size.

---

### Binary Search on Rotated Array

**Example:** `arr = [4, 5, 6, 7, 0, 1, 2]`, target = `0`

**Java:**
```java
int searchRotated(int[] arr, int target) {
    int low = 0, high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[low] <= arr[mid]) {
            if (arr[low] <= target && target < arr[mid]) high = mid - 1;
            else                                          low = mid + 1;
        } else {
            if (arr[mid] < target && target <= arr[high]) low = mid + 1;
            else                                           high = mid - 1;
        }
    }
    return -1;
}
```

**TypeScript:**
```typescript
function searchRotated(arr: number[], target: number): number {
    let low = 0, high = arr.length - 1;
    while (low <= high) {
        const mid = low + Math.floor((high - low) / 2);
        if (arr[mid] === target) return mid;
        if (arr[low] <= arr[mid]) {
            if (arr[low] <= target && target < arr[mid]) high = mid - 1;
            else                                          low = mid + 1;
        } else {
            if (arr[mid] < target && target <= arr[high]) low = mid + 1;
            else                                           high = mid - 1;
        }
    }
    return -1;
}
```

**Dry Run Table** (`arr = [4,5,6,7,0,1,2]`, target = `0`):

| Step | low | high | mid | arr[mid] | Left sorted? | Target in left? | Action |
|------|-----|------|-----|----------|-------------|-----------------|--------|
| 1 | 0 | 6 | 3 | 7 | arr[0]=4≤arr[3]=7 YES | Is 4≤0<7? NO | low=4 |
| 2 | 4 | 6 | 5 | 1 | arr[4]=0≤arr[5]=1 YES | Is 0≤0<1? YES | high=4 |
| 3 | 4 | 4 | 4 | 0 | — | arr[4]==0 | return 4 |

Answer: index 4. Complexity: O(log n) time, O(1) space.

---

## [45–55 min] Pattern Recognition

### Structural Clues — How to Recognize Each Pattern

**Classic Binary Search:**
- Array is sorted (explicitly stated or obvious)
- Task: find exact value, check existence, find index
- Ask yourself: "If I look at the middle, does it immediately tell me which half the answer is in?"

**Lower / Upper Bound:**
- Array has duplicates AND you need first/last occurrence
- Task: count elements in a range, find insertion point, "first version where X happens"
- Ask yourself: "Am I looking for a boundary between elements that satisfy a condition and those that don't?"
- Clue: the answer is not "is it here" but "where does it start/stop"

**Rotated Array:**
- Problem says "rotated" or "shifted" sorted array
- Ask yourself: "Is there a sorted half I can use to narrow down?"
- Draw the two segments on paper before coding

**Binary Search on Answer:**
- Keywords: "minimum capacity," "maximum allowed," "minimum speed," "split into K parts"
- Keywords: "minimize the maximum" or "maximize the minimum"
- Ask yourself: "Can I phrase this as: for a given candidate answer X, can I check YES/NO in O(n)?"
- Ask yourself: "If X=10 works, does X=11 also work (or similarly monotonic)?"
- The feasibility function is almost always a greedy scan

**Search in 2D Matrix:**
- 2D grid, rows sorted, columns sorted
- If fully sorted (last of row < first of next row) → binary search on flattened 1D
- Otherwise → staircase search from top-right or bottom-left

**Exponential Search:**
- "Infinite sorted array" or size unknown
- Double the bound until you overshoot, then binary search in the range

**Ternary Search:**
- "Find maximum" or "find minimum" of a function
- The function is unimodal (one peak or one valley)
- NOT about finding a target in a sorted array

### Distinguish From Similar Patterns

| Situation | Use |
|---|---|
| Find exact value in sorted array | Classic Binary Search |
| Find first position ≥ X in sorted array | Lower Bound |
| Find last position ≤ X in sorted array | Upper Bound − 1 |
| Sorted array, unknown rotation, find value | Rotated Array Search |
| "Minimize the maximum value of something" | Binary Search on Answer |
| Find peak in unimodal function | Ternary Search or Binary Search on derivative |
| Find element in sorted grid | 2D Matrix Search (pick variant) |

### The Reasoning Flow for Any Searching Problem

```
Is the data sorted (or does it have a monotonic property)?
    NO  → Can we sort it? → If not, linear scan only
    YES → Is it a rotated sorted array?
              YES → Rotated Array Search
              NO  → Are we looking for the answer in a VALUE RANGE
                    (not an index range)?
                        YES → Binary Search on Answer
                        NO  → Are we looking for an exact match?
                                  YES → Classic Binary Search
                                  NO  → Lower Bound / Upper Bound
```

### Common Traps

1. **`mid = (low + high) / 2` overflow:** Always use `low + (high - low) / 2`.
2. **Classic vs Bound convergence:** Classic uses `low <= high` and `high = mid - 1`. Bound-finding uses `low < high` and `high = mid`. Mixing these causes infinite loops or off-by-one errors.
3. **Lower bound returns a valid index even when target is absent:** Always check `arr[result] == target` after calling lower bound.
4. **Rotated array with duplicates:** `arr[low] == arr[mid] == arr[high]` — cannot determine sorted half. Must do `low++, high--`. Worst case O(n).
5. **Binary search on answer — wrong range:** `lo` and `hi` must bracket the answer. Think: what is the absolute minimum and maximum possible answer?
6. **Ternary search on discrete vs continuous:** Discrete arrays often need `low`, `high` adjusted carefully to avoid infinite loops at small ranges.

---

## [55–60 min] Final Mental Checklist

```
WHAT IS IT?
  A family of algorithms that exploit monotonic structure to eliminate
  half (or more) of the search space per step, achieving O(log n).

WHEN DO I USE IT?
  - Data is sorted or has a monotonic property
  - Finding a target, boundary, or optimal answer in a known range
  - "Minimize the maximum" / "maximize the minimum" type problems

WHEN DO I NOT USE IT?
  - Data is unsorted with no sortable structure
  - Multiple peaks/valleys (ternary search fails)
  - Rotated array with all duplicates (degrades to O(n))
  - You can compute the exact answer directly

WHAT IS THE CORE IDEA?
  At each step, one comparison tells you which half of the current
  search space cannot contain the answer. Discard it. Repeat.

WHAT DO I TRACK?
  low and high pointers defining the current search space.
  The invariant: the answer is always within [low, high].

WHAT IS THE INVARIANT/STATE?
  Classic:    answer (if it exists) is in [low, high] inclusive
  Bound:      answer is in [low, high) — they converge to the same point
  On Answer:  the minimum feasible answer is in [low, high]

HOW DO I RECOGNIZE IT?
  - Sorted data → binary search on indices
  - "Minimize the maximum" or "maximize the minimum" → search on values
  - "First Bad Version" / boundary problems → lower/upper bound
  - "Rotated sorted" → identify sorted half at each step
  - Peak of unimodal function → ternary search

WHAT ARE THE COMMON TRAPS?
  1. Integer overflow: use low + (high - low) / 2
  2. Wrong loop condition: <= for classic, < for bound-finding
  3. Wrong boundary update: high=mid-1 in classic, high=mid in bound
  4. Lower bound doesn't check if target actually exists
  5. Rotated array: duplicates break the "which half is sorted" logic
  6. Wrong answer range in parametric search

WHAT PATTERNS CAN I CONFUSE IT WITH?
  - Two Pointers: both use low/high but two-pointer collapses an array,
    binary search halves a search space
  - Sliding Window: maintains a range of elements; binary search
    maintains a range of candidate answers/positions
  - Greedy: often USED INSIDE binary search on answer as the
    feasibility check, not a replacement

WHAT IS THE COMPLEXITY?
  Classic Binary Search:       O(log n) time,     O(1) space
  Lower / Upper Bound:         O(log n) time,     O(1) space
  Rotated Array Search:        O(log n) time,     O(1) space
    (with duplicates worst case O(n))
  Binary Search on Answer:     O(n log R) time,   O(1) space
    (R = answer range, n = feasibility check cost)
  2D Matrix Variant 1:         O(log(m*n)) time,  O(1) space
  2D Matrix Variant 2:         O(m + n) time,     O(1) space
  Exponential Search:          O(log n) time,     O(1) space
  Ternary Search:              O(log n) time,     O(1) space
  Median of Two Sorted Arrays: O(log(min(m,n))),  O(1) space
```

---

## Advanced Awareness

These are real patterns but require deeper study beyond this module:

- **Median of Two Sorted Arrays in O(log(min(m,n))):** Partition-based approach. Binary search on the partition of the smaller array. One of the hardest binary search problems.
- **Binary Search on Floating Point:** Binary search on continuous ranges (e.g., find the square root). Use an epsilon convergence criterion instead of `low == high`.
- **Fractional Cascading:** Speed up binary search across multiple sorted arrays from O(k log n) to O(k + log n). Rarely asked in interviews but worth knowing exists.
- **Find Kth Smallest in Sorted Matrix:** Binary search on value with an O(m+n) count function. Combines matrix staircase search with binary search on answer.

---

## Active Recall

Test yourself. Close the file first.

1. Why does `mid = (low + high) / 2` cause a bug, and what is the fix?
2. What is the difference between the loop condition in classic binary search (`low <= high`) and bound-finding (`low < high`)? Why does this difference exist?
3. You have a sorted array `[1, 2, 2, 2, 3, 4]`. How do you find the count of occurrences of `2` using binary search?
4. You are given a rotated sorted array `[5, 6, 7, 1, 2, 3, 4]`. Trace through one iteration of the rotated array search for target = `1`. Which half is sorted? Is the target in that half?
5. A problem says "find the minimum speed such that all workers finish within T hours." What pattern is this? What is the search range? What is the feasibility check?
6. What makes a function "monotonic" in the context of binary search on answer? Give an example of a feasibility function that IS monotonic and one that is NOT.
7. You have a sorted matrix where `matrix[i][j] < matrix[i][j+1]` and `matrix[i][j] < matrix[i+1][j]`, but the last element of row i is NOT less than the first element of row i+1. Which 2D matrix variant applies, and what is the time complexity?
8. What are the sentinels needed in the median of two sorted arrays algorithm, and when are they used?
9. Ternary search eliminates one-third of the space per step. Why do we prefer binary search on the derivative over ternary search for "find peak element" in practice?
10. Binary Search on Answer vs Two Pointers: both produce a single number as an answer. How do you decide which applies?

---

## Recommended Practice Direction

Work through these in order. Each level adds one layer of complexity.

**Level 1 — Core mechanics (must be flawless):**
- LeetCode 704 — Binary Search (classic, get the template right)
- LeetCode 35 — Search Insert Position (lower bound, understand the template)
- LeetCode 34 — Find First and Last Position of Element in Sorted Array (lower + upper bound together)

**Level 2 — Structural variation:**
- LeetCode 33 — Search in Rotated Sorted Array (rotated, no duplicates)
- LeetCode 81 — Search in Rotated Sorted Array II (rotated, with duplicates — O(n) worst case)
- LeetCode 153 — Find Minimum in Rotated Sorted Array

**Level 3 — Binary Search on Answer (the most interview-relevant):**
- LeetCode 875 — Koko Eating Bananas (gentle intro to parametric search)
- LeetCode 1011 — Capacity to Ship Packages Within D Days
- LeetCode 410 — Split Array Largest Sum (harder feasibility check)

**Level 4 — 2D and combined:**
- LeetCode 74 — Search a 2D Matrix (Variant 1)
- LeetCode 240 — Search a 2D Matrix II (Variant 2, staircase)

**Level 5 — Advanced (awareness):**
- LeetCode 4 — Median of Two Sorted Arrays (the hardest binary search)
- LeetCode 162 — Find Peak Element (binary search on derivative, O(log n))

---

## 2-Minute Cheat Sheet

```
CLASSIC BINARY SEARCH
  low=0, high=n-1
  while (low <= high):
      mid = low + (high-low)/2
      if arr[mid]==target: return mid
      if arr[mid]<target:  low=mid+1
      else:                high=mid-1
  return -1

LOWER BOUND (first index where arr[i] >= target)
  low=0, high=n
  while (low < high):
      mid = low + (high-low)/2
      if arr[mid] < target: low=mid+1
      else:                 high=mid
  return low                         ← always verify arr[low]==target

UPPER BOUND (first index where arr[i] > target)
  Same as lower bound, change condition to: arr[mid] <= target → low=mid+1

ROTATED ARRAY
  Same loop as classic, but at each step:
  if arr[low] <= arr[mid]: LEFT half is sorted → check if target fits
  else:                    RIGHT half is sorted → check if target fits

BINARY SEARCH ON ANSWER
  lo=min_answer, hi=max_answer
  while (lo < hi):
      mid = lo + (hi-lo)/2
      if isFeasible(mid): hi=mid
      else:               lo=mid+1
  return lo

2D MATRIX (row+col sorted, NOT concatenated)
  row=0, col=n-1
  while in bounds:
      if matrix[row][col]==target: return true
      if matrix[row][col]>target:  col--
      else:                        row++
  return false

KEY NUMBERS
  Classic:        O(log n)
  Bounds:         O(log n)
  Rotated:        O(log n), O(n) with duplicates
  Param Search:   O(n log R)   R = answer range
  2D Staircase:   O(m + n)
  Median Two Arr: O(log min(m,n))
```

---

*Next: [04-SORTING-AND-ORDER.md](04-SORTING-AND-ORDER.md) — Sorting as a problem-solving tool, not just a utility.*
