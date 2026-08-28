# Searching Techniques

> **8 algorithms covered:** Classic Binary Search · Find First/Last Position (Lower/Upper Bound) · Binary Search on Answer (Parametric) · Search in Rotated Sorted Array · Find Peak Element · Search in 2D Matrix · Ternary Search · Exponential Search

> *"Binary search is not just an algorithm — it is a way of thinking. Any time you can discard half the possibilities in one step, binary search is hiding in the problem."*

---

## Table of Contents

1. [Classic Binary Search](#classic-binary-search)
2. [Find First / Last Position — Lower / Upper Bound](#find-first--last-position--lowerupper-bound)
3. [Binary Search on Answer (Parametric Search)](#binary-search-on-answer-parametric-search)
4. [Search in Rotated Sorted Array](#search-in-rotated-sorted-array)
5. [Find Peak Element](#find-peak-element)
6. [Search in 2D Matrix](#search-in-2d-matrix)
7. [Ternary Search](#ternary-search)
8. [Exponential Search](#exponential-search)
9. [Quick Reference Cheat Sheet](#quick-reference-cheat-sheet)

---

## Classic Binary Search

### What is it?
Classic binary search finds whether a specific value exists in a sorted array and returns its index. It eliminates half the search space with each comparison, giving O(log n) instead of O(n). Think of the "guess the number" game — every wrong guess halves the remaining possibilities.

### Visual
```
arr = [2, 5, 8, 12, 16, 23, 38, 45]
       0  1  2   3   4   5   6   7

Target = 23

Step 1:  low=0, high=7, mid=3
         [2,  5,  8, 12, 16, 23, 38, 45]
          ^           ^               ^
         low         mid            high
         arr[3]=12 < 23 → discard left half → low = 4

Step 2:  low=4, high=7, mid=5
         [2,  5,  8, 12, 16, 23, 38, 45]
                          ^   ^       ^
                         low mid    high
         arr[5]=23 == 23 → FOUND at index 5
```

### How does it work?
1. Set `low = 0`, `high = n - 1`.
2. While `low <= high`, calculate `mid = low + (high - low) / 2`.
3. If `arr[mid] == target`, return `mid`.
4. If `arr[mid] < target`, the target is in the RIGHT half — set `low = mid + 1`.
5. If `arr[mid] > target`, the target is in the LEFT half — set `high = mid - 1`.
6. Repeat until `low > high`.
7. If the loop ends without returning, the target is not in the array — return `-1`.

### Why does it work?
In a sorted array, if `arr[mid] < target`, then `arr[0]` through `arr[mid]` are ALL less than target and can never be the answer. You safely discard the entire left half in one step. Each step halves the problem, so at most log₂(n) steps are needed.

### When to use?
- The array is sorted (stated explicitly or obvious from context).
- You need to find an exact value and return its index.
- You need an existence check in O(log n).
- The problem says "return -1 if not found."

### When NOT to use?
- The array is unsorted and cannot be sorted.
- You need ALL occurrences of a value — this only finds one arbitrary occurrence.

### How to recognize in a new problem?
Ask: "Is the array sorted? Do I need to find a specific element?" If yes to both, this applies. Concrete signals: "sorted array," "find index of X," "does X exist," "return -1 if not found," "binary search on a 1D sorted array."

### Simple Example
**Input:** `arr = [2, 5, 8, 12, 16, 23, 38, 45]`, `target = 23`
**Expected Output:** `5`

**Step-by-step:**
- `low=0, high=7, mid=3` → `arr[3]=12 < 23` → `low = 4`
- `low=4, high=7, mid=5` → `arr[5]=23 == 23` → return `5`

**Result:** `5`

### Code
```java
// Java
int binarySearch(int[] arr, int target) {
    int low = 0, high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;   // safe from integer overflow
        if (arr[mid] == target) return mid;
        if (arr[mid] < target)  low = mid + 1;
        else                    high = mid - 1;
    }
    return -1;
}
```

```javascript
// JavaScript
function binarySearch(arr, target) {
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

### Dry Run
`arr = [2, 5, 8, 12, 16, 23, 38, 45]`, `target = 23`

| Step | low | high | mid | arr[mid] | Action           |
|------|-----|------|-----|----------|------------------|
| 1    | 0   | 7    | 3   | 12       | 12 < 23 → low=4  |
| 2    | 4   | 7    | 5   | 23       | 23==23 → return 5 |

### Complexity
```
Time:  O(log n) — each step halves the search space, so at most log₂(n) iterations
Space: O(1)     — only two integer pointers, no extra memory
```

### Common Trap
1. **Integer overflow:** Writing `mid = (low + high) / 2`. If both are near `Integer.MAX_VALUE`, their sum overflows. Always write `low + (high - low) / 2`.
2. **Wrong loop condition:** Using `low < high` instead of `low <= high`. When `low == high`, there is still one element to check. Missing `<=` causes you to skip the last candidate.

### Experience Tip
**Experience Tip:** The loop condition `low <= high` and the updates `low = mid + 1` / `high = mid - 1` are a locked-in template. Do not improvise. Every deviation causes either an infinite loop or a missed answer. Memorize this exact form and protect it.

### Do Not Confuse With

|                    | Classic Binary Search                    | Two Pointers                             |
|--------------------|------------------------------------------|------------------------------------------|
| Data requirement   | Must be sorted                           | Often unsorted, checking a sum/condition |
| How pointers move  | Both collapse by halving each step       | Move based on a condition, not halving   |
| Goal               | Find a target at a specific index        | Find a pair, window, or matching values  |
| Example            | "Is 23 in this sorted array?"            | "Find two numbers that sum to target"    |

### LeetCode Practice

| #    | Problem                                          | Difficulty | What to Notice                                                    | Link                                                                               |
|------|--------------------------------------------------|------------|-------------------------------------------------------------------|------------------------------------------------------------------------------------|
| 704  | Binary Search                                    | Easy       | The canonical template — get `low <= high` and `mid±1` exactly right | [Link](https://leetcode.com/problems/binary-search/)                           |
| 35   | Search Insert Position                           | Easy       | After the loop ends, `low` points to where the value would go    | Search Insert Position                                                             |
| 34   | Find First and Last Position of Element          | Medium     | Two separate searches — one for start, one for end               | [Link](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/) |
| 74   | Search a 2D Matrix                               | Medium     | The matrix is one sorted array — map index k to `row=k/cols`, `col=k%cols` | [Link](https://leetcode.com/problems/search-a-2d-matrix/)             |
| 33   | Search in Rotated Sorted Array                   | Medium     | Sorted array with a break — identify which half is still intact  | [Link](https://leetcode.com/problems/search-in-rotated-sorted-array/)             |

### One-Minute Revision
```
ALGORITHM:      Classic Binary Search
IN SIMPLE WORDS: Split sorted array in half each step until target found or space empty
USE WHEN:       Sorted array, need exact index, existence check
DON'T USE WHEN: Unsorted data, need all occurrences
CORE IDEA:      arr[mid] < target means the entire left half is useless — discard it
TRACK:          low and high pointers (current search window)
TIME:           O(log n)
SPACE:          O(1)
COMMON TRAP:    mid = (low+high)/2 overflows — always use low + (high-low)/2
EXPERIENCE TIP: The template is sacred: low<=high, low=mid+1, high=mid-1. Never change it.
```

---

## Find First / Last Position — Lower/Upper Bound

### What is it?
Instead of finding any occurrence of a value, Lower Bound finds the FIRST position where a value appears (or would be inserted). Upper Bound finds the first position AFTER the last occurrence. Together they let you locate first/last occurrence, count duplicates, and find insertion points. This is the most practically useful binary search pattern in real interviews.

### Visual
```
arr = [1, 3, 3, 3, 7, 9]
       0  1  2  3  4  5

Lower Bound for target=3 (first index where arr[i] >= 3):

Step 1: low=0, high=6, mid=3 → arr[3]=3 >= 3 → high=3
        [1,  3,  3,  3,  7,  9]
         ^            ^
        low          high

Step 2: low=0, high=3, mid=1 → arr[1]=3 >= 3 → high=1
        [1,  3,  3,  3,  7,  9]
         ^   ^
        low high

Step 3: low=0, high=1, mid=0 → arr[0]=1 < 3 → low=1
        [1,  3,  3,  3,  7,  9]
              ^
            low=high=1 → return 1  ← first occurrence of 3
```

### How does it work?
1. Set `low = 0`, `high = n` (not `n-1` — the answer can be one past the end).
2. Use `while low < high` (strict — loop ends when `low == high`).
3. Calculate `mid = low + (high - low) / 2`.
4. **Lower Bound:** If `arr[mid] < target`, the boundary is to the right → `low = mid + 1`. Otherwise `high = mid` (mid could be the answer).
5. **Upper Bound:** Only change: if `arr[mid] <= target` → `low = mid + 1`. Otherwise `high = mid`.
6. When the loop ends, `low == high` — that is your answer.
7. For lower bound: verify `arr[low] == target` to confirm the value exists.

### Why does it work?
The invariant is: the answer always lives in `[low, high]`. We never write `high = mid - 1` because `mid` itself might be the first occurrence. The space shrinks every step because `low` always advances by at least 1 via `low = mid + 1`. When `low` meets `high`, they've converged on the exact boundary.

### When to use?
- Find the FIRST or LAST occurrence of a value in a sorted array that may have duplicates.
- Count how many times a value appears: `upperBound(x) - lowerBound(x)`.
- Find the insertion position in a sorted array.
- "First Bad Version" / "first day when condition becomes true" problems.

### When NOT to use?
- You only need any single occurrence — classic binary search is simpler.
- The array is not sorted.

### How to recognize in a new problem?
Signals: "first occurrence," "last occurrence," "how many times does X appear," "find insertion position," "first version/day/index where X is true." The key tell is that you are looking for a BOUNDARY — where something starts or stops being true — not a specific index.

### Simple Example
**Input:** `arr = [1, 3, 3, 3, 7, 9]`, `target = 3`
**Expected Output:** first occurrence = `1`, last occurrence = `3`, count = `3`

**Step-by-step:**
- Lower bound returns `1` (first 3 at index 1).
- Upper bound returns `4` (first element > 3 is at index 4).
- Last occurrence = `4 - 1 = 3`.
- Count = `4 - 1 = 3`.

**Result:** first=`1`, last=`3`, count=`3`

### Code
```java
// Java

// Lower Bound: first index where arr[i] >= target
int lowerBound(int[] arr, int target) {
    int low = 0, high = arr.length;    // high = n, not n-1
    while (low < high) {               // strict < — ends when low == high
        int mid = low + (high - low) / 2;
        if (arr[mid] < target) low = mid + 1;
        else                   high = mid;    // NOT mid-1: mid could be the answer
    }
    return low; // always check: arr[low] == target before using
}

// Upper Bound: first index where arr[i] > target
int upperBound(int[] arr, int target) {
    int low = 0, high = arr.length;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] <= target) low = mid + 1; // only change: <= instead of <
        else                    high = mid;
    }
    return low;
}

// First occurrence of target, or -1 if not found
int firstOccurrence(int[] arr, int target) {
    int pos = lowerBound(arr, target);
    return (pos < arr.length && arr[pos] == target) ? pos : -1;
}

// Last occurrence of target, or -1 if not found
int lastOccurrence(int[] arr, int target) {
    int pos = upperBound(arr, target) - 1;
    return (pos >= 0 && arr[pos] == target) ? pos : -1;
}
```

```javascript
// JavaScript

// Lower Bound: first index where arr[i] >= target
function lowerBound(arr, target) {
    let low = 0, high = arr.length;
    while (low < high) {
        const mid = low + Math.floor((high - low) / 2);
        if (arr[mid] < target) low = mid + 1;
        else                   high = mid;
    }
    return low;
}

// Upper Bound: first index where arr[i] > target
function upperBound(arr, target) {
    let low = 0, high = arr.length;
    while (low < high) {
        const mid = low + Math.floor((high - low) / 2);
        if (arr[mid] <= target) low = mid + 1;
        else                    high = mid;
    }
    return low;
}
```

### Dry Run
`arr = [1, 3, 3, 3, 7, 9]`, `target = 3` — Lower Bound:

| Step | low | high | mid | arr[mid] | Condition | Action  |
|------|-----|------|-----|----------|-----------|---------|
| 1    | 0   | 6    | 3   | 3        | 3 >= 3    | high=3  |
| 2    | 0   | 3    | 1   | 3        | 3 >= 3    | high=1  |
| 3    | 0   | 1    | 0   | 1        | 1 < 3     | low=1   |
| 4    | 1   | 1    | —   | —        | low==high | return 1 |

`arr[1] = 3` confirmed. Upper bound returns `4`, so last = `3`, count = `3`.

### Complexity
```
Time:  O(log n) — same halving argument as classic binary search
Space: O(1)     — only two pointers
```

### Common Trap
1. **Writing `high = mid - 1`:** This is the classic binary search update, NOT the lower bound update. Using it here skips the first occurrence because `mid` itself could be the answer. Always use `high = mid` in lower/upper bound.
2. **Forgetting to verify existence:** Lower bound always returns a valid index in `[0, n]`. If the target is not in the array, `arr[low]` will not equal target. Always check `arr[low] == target` after calling lower bound.

### Experience Tip
**Experience Tip:** The ONLY difference between lower bound and upper bound is one character: `<` vs `<=` in the mid comparison. Lower bound uses `arr[mid] < target` (moves right only when strictly less). Upper bound uses `arr[mid] <= target` (moves right even when equal). That single character shifts the boundary from "first equal" to "first strictly greater."

### Do Not Confuse With

|                    | Lower/Upper Bound                         | Classic Binary Search          |
|--------------------|-------------------------------------------|--------------------------------|
| Goal               | Find boundary position                    | Find exact match               |
| Loop condition     | `while low < high`                        | `while low <= high`            |
| high update        | `high = mid`                              | `high = mid - 1`               |
| Returns            | Position in range `[0, n]`               | Index or `-1`                  |
| Target absent      | Returns insertion point (still valid)     | Returns `-1`                   |

### LeetCode Practice

| #    | Problem                                          | Difficulty | What to Notice                                                    | Link                                                                               |
|------|--------------------------------------------------|------------|-------------------------------------------------------------------|------------------------------------------------------------------------------------|
| 704  | Binary Search                                    | Easy       | Solve it with the lower bound template to practice the new form   | [Link](https://leetcode.com/problems/binary-search/)                               |
| 35   | Search Insert Position                           | Easy       | Pure lower bound — `low` after the loop is exactly the insertion point | Search Insert Position                                                        |
| 34   | Find First and Last Position of Element          | Medium     | One lower bound call + one upper bound call, check existence once | [Link](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/) |
| 162  | Find Peak Element                                | Medium     | Boundary between uphill and downhill — same convergence logic     | [Link](https://leetcode.com/problems/find-peak-element/)                           |
| 875  | Koko Eating Bananas                              | Medium     | Lower bound structure applied to an answer space, not an array    | [Link](https://leetcode.com/problems/koko-eating-bananas/)                         |

### One-Minute Revision
```
ALGORITHM:      Lower/Upper Bound (Find First/Last Position)
IN SIMPLE WORDS: Binary search for a boundary, not an exact match
USE WHEN:       First/last occurrence, insertion point, count in sorted array with duplicates
DON'T USE WHEN: Need any single occurrence (classic BS is simpler), unsorted data
CORE IDEA:      Never exclude mid — it might be the first occurrence. Use high=mid not high=mid-1.
TRACK:          low and high converging to the same boundary point
TIME:           O(log n)
SPACE:          O(1)
COMMON TRAP:    Using high=mid-1 (classic BS update) instead of high=mid — skips the first occurrence
EXPERIENCE TIP: LB vs UB = one char: arr[mid]<target vs arr[mid]<=target. That's it.
```

---

## Binary Search on Answer (Parametric Search)

### What is it?
Instead of searching for a value IN an array, you search for THE ANSWER ITSELF in a range of possible values. You convert "find the minimum X such that condition C holds" into "for any candidate X, can I check in O(n) whether it works?" If the feasibility check is monotonic (once YES, always YES for larger X), you binary search on X. This is the most powerful and underrated binary search pattern in interviews.

### Visual
```
Problem: Find the minimum eating speed so Koko finishes in H hours.

Answer space:  [1,  2,  3,  4,  5,  6,  7,  8,  9,  10,  11]
Feasibility:   [NO, NO, NO, YES, YES, YES, YES, YES, YES, YES, YES]
                             ^
                         Minimum feasible answer = 4

Binary search on this threshold:
lo=1,  hi=11 → mid=6  → feasible (6 hrs) → hi=6
lo=1,  hi=6  → mid=3  → not feasible (10 hrs) → lo=4
lo=4,  hi=6  → mid=5  → feasible (8 hrs) → hi=5
lo=4,  hi=5  → mid=4  → feasible (8 hrs) → hi=4
lo=4,  hi=4  → return 4
```

### How does it work?
1. Define the search range: `lo = minimum possible answer`, `hi = maximum possible answer`.
2. Write a `isFeasible(candidate)` function: given candidate `mid`, can the problem be solved?
3. Use `while lo < hi`.
4. If `isFeasible(mid)` is true: `mid` or something smaller might be the answer → `hi = mid`.
5. If `isFeasible(mid)` is false: `mid` is too small → `lo = mid + 1`.
6. When `lo == hi`, that is the minimum feasible answer.

### Why does it work?
The feasibility function is monotonic: if speed X works, any speed greater than X also works (more capacity = easier). This creates a threshold dividing the answer space into [NO, NO, ..., YES, YES, ...]. Binary search finds that exact threshold in O(log R) steps where R is the answer range.

### When to use?
- Keywords: "minimize the maximum," "maximize the minimum," "minimum capacity/speed/days/size."
- The answer is a number in some bounded range `[lo, hi]`.
- You can write a YES/NO feasibility check for any candidate answer.
- The self-check: "If X works, does X+1 also work?" — if yes, feasibility is monotonic, use this.

### When NOT to use?
- Feasibility is not monotonic (answer can flip YES/NO/YES as X increases).
- You can compute the exact answer directly with math.

### How to recognize in a new problem?
Reasoning flow: "I need the smallest/largest X such that some condition holds." Then ask: "Can I check in O(n) whether any X is feasible?" Dead giveaway phrases: "minimum speed," "minimum days," "minimum capacity," "split into K groups," "allocate K workers." The feasibility check is almost always a greedy O(n) scan.

### Simple Example
**Input:** `piles = [3, 6, 7, 11]`, `H = 8` hours
**Expected Output:** `4` (minimum speed so Koko finishes in ≤ 8 hours)

**Step-by-step:**
- At speed 3: `ceil(3/3)+ceil(6/3)+ceil(7/3)+ceil(11/3) = 1+2+3+4 = 10 > 8`. NOT feasible.
- At speed 4: `ceil(3/4)+ceil(6/4)+ceil(7/4)+ceil(11/4) = 1+2+2+3 = 8 ≤ 8`. Feasible.
- Binary search converges to `4`.

**Result:** `4`

### Code
```java
// Java
int minEatingSpeed(int[] piles, int h) {
    int lo = 1;
    int hi = 0;
    for (int pile : piles) hi = Math.max(hi, pile); // max pile = worst case speed

    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (canFinish(piles, mid, h)) hi = mid;  // feasible — try smaller
        else                          lo = mid + 1; // too slow — need more
    }
    return lo;
}

boolean canFinish(int[] piles, int speed, int h) {
    int hoursNeeded = 0;
    for (int pile : piles) {
        hoursNeeded += (pile + speed - 1) / speed; // ceiling division trick
    }
    return hoursNeeded <= h;
}
```

```javascript
// JavaScript
function minEatingSpeed(piles, h) {
    let lo = 1;
    let hi = Math.max(...piles);

    while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (canFinish(piles, mid, h)) hi = mid;
        else                          lo = mid + 1;
    }
    return lo;
}

function canFinish(piles, speed, h) {
    return piles.reduce((total, pile) => total + Math.ceil(pile / speed), 0) <= h;
}
```

### Dry Run
`piles = [3, 6, 7, 11]`, `H = 8`, search range `[1, 11]`:

| Step | lo | hi | mid | Hours at speed=mid               | Feasible? | Action |
|------|----|----|-----|----------------------------------|-----------|--------|
| 1    | 1  | 11 | 6   | 1+1+2+2=6                        | YES (≤8)  | hi=6   |
| 2    | 1  | 6  | 3   | 1+2+3+4=10                       | NO (>8)   | lo=4   |
| 3    | 4  | 6  | 5   | 1+2+2+3=8                        | YES (≤8)  | hi=5   |
| 4    | 4  | 5  | 4   | 1+2+2+3=8                        | YES (≤8)  | hi=4   |
| 5    | 4  | 4  | —   | —                                | —         | return 4 |

### Complexity
```
Time:  O(n log R) — log R iterations (R = answer range width), each runs O(n) feasibility check
Space: O(1)       — no extra memory beyond what the feasibility check uses
```

### Common Trap
1. **Wrong search range boundaries:** `lo` and `hi` must BRACKET the answer. If `lo` starts too high or `hi` is too low, the real answer is outside your window. Think: what is the absolute minimum and maximum the answer could possibly be?
2. **Maximization vs minimization confusion:** For "maximize the minimum," flip the feasibility direction: if feasible `lo = mid + 1` (push higher); if not `hi = mid - 1`. The template looks the same but the feasibility logic inverts.

### Experience Tip
**Experience Tip:** The binary search wrapper for this pattern is always identical — only `lo`, `hi`, and `isFeasible` change. Once you identify "binary search on answer," the wrapper is free. Put all your thinking into the feasibility function. Write and verify the feasibility check first, then wrap it.

### Do Not Confuse With

|                    | Binary Search on Answer                   | Binary Search on Array Index       |
|--------------------|-------------------------------------------|------------------------------------|
| What you search    | A value in the answer range               | An index in the array              |
| Search space       | Range of possible answer values           | Range `[0, n-1]`                   |
| Comparison         | `isFeasible(mid)` — custom O(n) logic     | `arr[mid] vs target` — O(1)        |
| Example            | Min speed to finish in H hours            | Find index of value 23             |

### LeetCode Practice

| #    | Problem                                          | Difficulty | What to Notice                                                        | Link                                                                               |
|------|--------------------------------------------------|------------|-----------------------------------------------------------------------|------------------------------------------------------------------------------------|
| 875  | Koko Eating Bananas                              | Medium     | Search space is `[1, maxPile]`, not the pile indices                  | [Link](https://leetcode.com/problems/koko-eating-bananas/)                         |
| 1011 | Capacity to Ship Packages Within D Days          | Medium     | Both bounds are meaningful: `lo=maxWeight`, `hi=totalWeight`          | [Link](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/)     |
| 153  | Find Minimum in Rotated Sorted Array             | Medium     | Simpler feasibility: `arr[mid] > arr[high]` means minimum is to the right | [Link](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/)    |
| 410  | Split Array Largest Sum                          | Hard       | Feasibility: can we split into ≤ k parts with each part ≤ mid?        | Split Array Largest Sum                                                            |
| 774  | Minimize Max Distance to Gas Station             | Hard       | Continuous answer space — binary search on a floating-point value     | Minimize Max Distance to Gas Station                                               |

### One-Minute Revision
```
ALGORITHM:      Binary Search on Answer (Parametric Search)
IN SIMPLE WORDS: Binary search for the minimum X where a condition first becomes true
USE WHEN:       "Minimize the maximum," "maximize the minimum," known answer range with YES/NO check
DON'T USE WHEN: Feasibility is not monotonic; answer can be computed directly
CORE IDEA:      Feasibility is monotonic — search for the threshold in answer space
TRACK:          lo and hi bounding the answer range
TIME:           O(n log R) — R is answer range, n is feasibility check cost
SPACE:          O(1)
COMMON TRAP:    Wrong lo/hi bounds — the real answer must be inside your search range
EXPERIENCE TIP: Write the feasibility function first. The binary search wrapper never changes.
```

---

## Search in Rotated Sorted Array

### What is it?
A sorted array that has been "rotated" — shifted at an unknown pivot — looks like `[4,5,6,7,0,1,2]`. It forms two sorted segments. Classic binary search fails because the array is not globally sorted. The key insight: at any midpoint, EXACTLY ONE of the two halves is always fully sorted, and you can use that sorted half to decide where to go.

### Visual
```
arr = [4, 5, 6, 7, 0, 1, 2]
       0  1  2  3  4  5  6

Step 1: low=0, high=6, mid=3, arr[3]=7
        Left  [4,5,6,7]: arr[low]=4 <= arr[mid]=7  → LEFT IS SORTED
        Right [7,0,1,2]: contains the rotation — NOT guaranteed sorted

        Target=0: Is 0 in sorted left range [4..7)? NO → search RIGHT
        low = mid + 1 = 4

Step 2: low=4, high=6, mid=5, arr[5]=1
        Left  [0,1]: arr[low]=0 <= arr[mid]=1  → LEFT IS SORTED
        Target=0: Is 0 in sorted left range [0..1)? YES → search LEFT
        high = mid - 1 = 4

Step 3: low=4, high=4, mid=4, arr[4]=0 == 0 → FOUND at index 4
```

### How does it work?
1. Set `low = 0`, `high = n - 1`. Use `while low <= high`.
2. If `arr[mid] == target`, return `mid`.
3. Check which half is sorted: if `arr[low] <= arr[mid]`, the LEFT half is sorted.
4. **If left is sorted:** check if `arr[low] <= target < arr[mid]`. If yes → go left (`high = mid - 1`). If no → go right (`low = mid + 1`).
5. **If left is NOT sorted** (right must be sorted): check if `arr[mid] < target <= arr[high]`. If yes → go right (`low = mid + 1`). If no → go left (`high = mid - 1`).
6. Return `-1` if not found.

### Why does it work?
At any split point in a rotated sorted array, at least one half is always contiguous and sorted. A sorted half has known, predictable bounds. One comparison tells you whether the target can possibly be in that half. If not, it must be in the other half. This restores the ability to discard half the array per step.

### When to use?
- Problem explicitly says "rotated sorted array" or "circularly sorted."
- Searching for a target or the minimum in a rotated array.
- Array has no duplicate elements (duplicates break the logic).

### When NOT to use?
- Array has duplicate elements (`arr[low] == arr[mid]` makes it impossible to tell which half is sorted — worst case degrades to O(n)).
- Array is fully sorted — plain classic binary search is simpler.

### How to recognize in a new problem?
The giveaway is the word "rotated" or "shifted" in the problem. Also: an array that increases, then drops sharply to a lower value, then increases again. Pattern: "A sorted array was rotated at some unknown pivot."

### Simple Example
**Input:** `arr = [4, 5, 6, 7, 0, 1, 2]`, `target = 0`
**Expected Output:** `4`

**Step-by-step:**
- `low=0, high=6, mid=3, arr[3]=7`. Left `[4..7]` sorted. Is `0` in `[4,7)`? No → `low=4`.
- `low=4, high=6, mid=5, arr[5]=1`. Left `[0..1]` sorted. Is `0` in `[0,1)`? Yes → `high=4`.
- `low=4, high=4, mid=4, arr[4]=0 == 0` → return `4`.

**Result:** `4`

### Code
```java
// Java
int searchRotated(int[] arr, int target) {
    int low = 0, high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;

        if (arr[low] <= arr[mid]) {           // left half is sorted
            if (arr[low] <= target && target < arr[mid]) {
                high = mid - 1;               // target in left half
            } else {
                low = mid + 1;                // target in right half
            }
        } else {                              // right half is sorted
            if (arr[mid] < target && target <= arr[high]) {
                low = mid + 1;                // target in right half
            } else {
                high = mid - 1;               // target in left half
            }
        }
    }
    return -1;
}
```

```javascript
// JavaScript
function searchRotated(arr, target) {
    let low = 0, high = arr.length - 1;
    while (low <= high) {
        const mid = low + Math.floor((high - low) / 2);
        if (arr[mid] === target) return mid;

        if (arr[low] <= arr[mid]) {           // left half is sorted
            if (arr[low] <= target && target < arr[mid]) {
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        } else {                              // right half is sorted
            if (arr[mid] < target && target <= arr[high]) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
    }
    return -1;
}
```

### Dry Run
`arr = [4, 5, 6, 7, 0, 1, 2]`, `target = 0`:

| Step | low | high | mid | arr[mid] | Left sorted? | Target in left range? | Action   |
|------|-----|------|-----|----------|--------------|-----------------------|----------|
| 1    | 0   | 6    | 3   | 7        | 4<=7 YES     | 4<=0<7? NO            | low=4    |
| 2    | 4   | 6    | 5   | 1        | 0<=1 YES     | 0<=0<1? YES           | high=4   |
| 3    | 4   | 4    | 4   | 0        | —            | 0==0 FOUND            | return 4 |

### Complexity
```
Time:  O(log n) — still eliminates half the array each step
Space: O(1)     — only two pointers
Note:  With duplicates (LeetCode 81), worst case degrades to O(n)
```

### Common Trap
1. **Strict vs non-strict boundary:** The check `arr[low] <= target && target < arr[mid]` must use strict `<` on the right side because `arr[mid]` is already checked at the top. Getting this wrong causes skipping the pivot element.
2. **Applying this to arrays with duplicates:** When `arr[low] == arr[mid]`, you cannot determine which half is sorted. You must handle this with `low++, high--` and it degrades to O(n). Do not apply the standard template blindly when duplicates exist.

### Experience Tip
**Experience Tip:** Before coding, draw the two segments on paper. The single question "which half is sorted?" drives the entire algorithm. `arr[low] <= arr[mid]` means no rotation in the left segment — all elements from `low` to `mid` are in clean increasing order. Once you know which half is sorted, the target range check is just comparing to two known endpoints.

### Do Not Confuse With

|                    | Rotated Array Search                      | Classic Binary Search              |
|--------------------|-------------------------------------------|------------------------------------|
| Array structure    | Two sorted segments joined at a pivot     | One fully sorted sequence          |
| Key decision       | Which half is sorted?                     | Is arr[mid] < or > target?         |
| Pitfall            | Breaks with duplicate elements            | No such concern                    |
| Finding minimum    | Use `arr[mid] > arr[high]` comparison     | Not applicable                     |

### LeetCode Practice

| #    | Problem                                          | Difficulty | What to Notice                                                        | Link                                                                               |
|------|--------------------------------------------------|------------|-----------------------------------------------------------------------|------------------------------------------------------------------------------------|
| 153  | Find Minimum in Rotated Sorted Array             | Easy       | No target — just find the pivot where the array "drops"               | [Link](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/)        |
| 33   | Search in Rotated Sorted Array                   | Medium     | Identify the sorted half first — that's the only decision to make     | [Link](https://leetcode.com/problems/search-in-rotated-sorted-array/)             |
| 81   | Search in Rotated Sorted Array II                | Medium     | Same logic, but add `low++, high--` when `arr[low]==arr[mid]==arr[high]` | Search in Rotated Sorted Array II                                               |
| 154  | Find Minimum in Rotated Sorted Array II          | Hard       | Duplicates — same ambiguity trap as 81                                | Find Minimum in Rotated Sorted Array II                                            |

### One-Minute Revision
```
ALGORITHM:      Search in Rotated Sorted Array
IN SIMPLE WORDS: Find target in a sorted array that was shifted at an unknown pivot
USE WHEN:       Array is "rotated sorted," no duplicates
DON'T USE WHEN: Array has duplicates (degrades to O(n) in worst case)
CORE IDEA:      One half is always sorted — use its known bounds to decide which half to search
TRACK:          low, high; which half is sorted at each step
TIME:           O(log n)
SPACE:          O(1)
COMMON TRAP:    arr[low]==arr[mid] with duplicates → can't tell which half is sorted
EXPERIENCE TIP: Draw the two segments first. "Which half is sorted?" is the only question.
```

---

## Find Peak Element

### What is it?
A peak element is greater than both its neighbors. Given an array where no two adjacent elements are equal, find the index of ANY peak. The array does not need to be sorted. The key insight: if the slope at mid goes upward to the right (`arr[mid] < arr[mid+1]`), a peak must exist somewhere to the right. Follow the uphill direction.

### Visual
```
arr = [1, 2, 3, 1]
       0  1  2  3

Step 1: low=0, high=3, mid=1
        arr[1]=2, arr[2]=3 → arr[mid] < arr[mid+1] → UPHILL to the right
        → peak must be at mid+1 or beyond → low = 2

        [1, 2, 3, 1]
               ^   ^
              low high

Step 2: low=2, high=3, mid=2
        arr[2]=3, arr[3]=1 → arr[mid] > arr[mid+1] → DOWNHILL
        → peak is at mid or to the left → high = 2

        [1, 2, 3, 1]
               ^
             low=high=2 → return 2

arr[2]=3 is a peak: arr[1]=2 < 3 > arr[3]=1 ✓
```

### How does it work?
1. Set `low = 0`, `high = n - 1`.
2. Use `while low < high`.
3. Calculate `mid`.
4. If `arr[mid] < arr[mid + 1]`: we are on an upward slope — peak is to the RIGHT → `low = mid + 1`.
5. Otherwise (`arr[mid] >= arr[mid + 1]`): we are on a downward slope or at the peak — peak is at `mid` or to the LEFT → `high = mid`.
6. When `low == high`, that index is a peak.

### Why does it work?
Think of the array as a landscape with virtual walls: `arr[-1] = -∞` and `arr[n] = -∞`. A peak must exist no matter the shape (you cannot go "off the edge" without hitting a peak first). At any midpoint: if the slope to the right is going up, the right side is climbing toward a peak that must exist before the virtual right wall. We always move toward higher ground and are guaranteed to find a peak.

### When to use?
- Find ANY local maximum (not necessarily the global maximum).
- "Peak" means `arr[i] > arr[i-1]` AND `arr[i] > arr[i+1]`.
- Problem guarantees no two adjacent elements are equal.

### When NOT to use?
- You need the GLOBAL maximum — just use `O(n)` linear scan.
- Adjacent elements can be equal — the slope comparison becomes ambiguous.

### How to recognize in a new problem?
Look for: "find a peak element," "find a local maximum," "element greater than its neighbors." The array does NOT need to be sorted. The trick is you only need to find ANY peak, not THE peak — and that freedom is what makes binary search work.

### Simple Example
**Input:** `arr = [1, 2, 1, 3, 5, 6, 4]`
**Expected Output:** `5` (index of value `6`, which is a valid peak)

**Step-by-step (abbreviated):**
- `mid=3`: arr[3]=3 < arr[4]=5 → uphill → `low=4`
- `mid=5`: arr[5]=6 > arr[6]=4 → downhill → `high=5`
- `mid=4`: arr[4]=5 < arr[5]=6 → uphill → `low=5`
- `low=5, high=5` → return `5`

**Result:** `5`

### Code
```java
// Java
int findPeakElement(int[] arr) {
    int low = 0, high = arr.length - 1;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] < arr[mid + 1]) {
            low = mid + 1;  // uphill to the right — peak is right of mid
        } else {
            high = mid;     // downhill — peak is at mid or left
        }
    }
    return low;
}
```

```javascript
// JavaScript
function findPeakElement(arr) {
    let low = 0, high = arr.length - 1;
    while (low < high) {
        const mid = low + Math.floor((high - low) / 2);
        if (arr[mid] < arr[mid + 1]) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low;
}
```

### Dry Run
`arr = [1, 2, 1, 3, 5, 6, 4]`:

| Step | low | high | mid | arr[mid] | arr[mid+1] | Slope    | Action  |
|------|-----|------|-----|----------|------------|----------|---------|
| 1    | 0   | 6    | 3   | 3        | 5          | UPHILL   | low=4   |
| 2    | 4   | 6    | 5   | 6        | 4          | DOWNHILL | high=5  |
| 3    | 4   | 5    | 4   | 5        | 6          | UPHILL   | low=5   |
| 4    | 5   | 5    | —   | —        | —          | —        | return 5 |

`arr[5]=6`: `arr[4]=5 < 6 > arr[6]=4`. Peak confirmed.

### Complexity
```
Time:  O(log n) — halves the search space each step by following the upward slope
Space: O(1)     — only two pointers
```

### Common Trap
1. **Out-of-bounds access on `arr[mid+1]`:** If `high = arr.length - 1` and `mid = high`, accessing `arr[mid+1]` crashes. The `while low < high` condition ensures `mid < high`, so `arr[mid+1]` is always a valid access.
2. **Thinking the array must be sorted:** It does not. The only structure needed is "no two adjacent elements are equal." The slope direction at each midpoint is enough.

### Experience Tip
**Experience Tip:** Think of it as "always walk uphill." If the slope to the right is going up, there must be a peak somewhere to the right before the virtual `−∞` boundary. You are guaranteed to reach it. This intuition — follow the uphill direction — is the entire algorithm in one sentence.

### Do Not Confuse With

|                    | Find Peak Element                         | Classic Binary Search              |
|--------------------|-------------------------------------------|------------------------------------|
| Array requirement  | No sorting needed                         | Must be sorted                     |
| Comparison         | `arr[mid]` vs `arr[mid+1]` (local slope)  | `arr[mid]` vs a specific target    |
| What you find      | Any local maximum index                   | Index of a specific target         |
| Returns            | Always finds something (peak always exists) | Returns `-1` if target absent    |

### LeetCode Practice

| #    | Problem                                          | Difficulty | What to Notice                                                        | Link                                                                               |
|------|--------------------------------------------------|------------|-----------------------------------------------------------------------|------------------------------------------------------------------------------------|
| 852  | Peak Index in a Mountain Array                   | Easy       | Guaranteed single peak — pure uphill/downhill slope logic             | Peak Index in a Mountain Array                                                     |
| 162  | Find Peak Element                                | Medium     | Multiple peaks possible — any is valid; compare mid to mid+1 only    | [Link](https://leetcode.com/problems/find-peak-element/)                           |
| 153  | Find Minimum in Rotated Sorted Array             | Medium     | Same "which side has the answer" slope intuition                      | [Link](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/)        |
| 1095 | Find in Mountain Array                           | Hard       | Find peak first, then binary search each sorted half separately       | Find in Mountain Array                                                             |

### One-Minute Revision
```
ALGORITHM:      Find Peak Element
IN SIMPLE WORDS: Follow the uphill slope until you reach a local maximum
USE WHEN:       Find any local max, array unsorted, no adjacent equals
DON'T USE WHEN: Need global maximum (use linear scan); adjacent elements can be equal
CORE IDEA:      If arr[mid] < arr[mid+1], a peak must exist to the right — follow uphill
TRACK:          low and high converging toward the peak
TIME:           O(log n)
SPACE:          O(1)
COMMON TRAP:    arr[mid+1] out of bounds — "while low < high" prevents mid from reaching high
EXPERIENCE TIP: "Always walk uphill" — the algorithm is just that one intuition.
```

---

## Search in 2D Matrix

### What is it?
Given a 2D matrix where rows are sorted left-to-right AND the first element of each row is greater than the last element of the previous row, find if a target exists. Since rows are globally ordered, the entire matrix is one sorted 1D array laid out in rows. Map any 1D index to 2D coordinates and run standard binary search.

### Visual
```
matrix:
[ 1,  3,  5,  7]   ← row 0: ends at 7
[10, 11, 16, 20]   ← row 1: starts at 10 > 7. Globally sorted!
[23, 30, 34, 60]   ← row 2: starts at 23 > 20

Flattened view (conceptual):
index: 0  1  2  3  4   5   6   7   8   9  10  11
value: 1  3  5  7  10  11  16  20  23  30  34  60

Binary search on index 0..11:
mid=5 → row=5/4=1, col=5%4=1 → matrix[1][1]=11
target=16: 11 < 16 → low=6

mid=8 → row=8/4=2, col=8%4=0 → matrix[2][0]=23
target=16: 23 > 16 → high=7

mid=6 → row=6/4=1, col=6%4=2 → matrix[1][2]=16 == 16 → FOUND
```

### How does it work?
1. Set `low = 0`, `high = rows * cols - 1`.
2. While `low <= high`, calculate `mid`.
3. Convert `mid` to 2D: `row = mid / cols`, `col = mid % cols`.
4. Compare `matrix[row][col]` to target.
5. If equal → return `true`. If less → `low = mid + 1`. If greater → `high = mid - 1`.
6. Return `false` if loop ends.

### Why does it work?
Because the last element of row `i` is less than the first element of row `i+1`, the entire matrix is one giant sorted sequence when read row by row. Flattening it to 1D is conceptually valid. The index mapping `row = mid / cols`, `col = mid % cols` converts back to 2D in O(1).

### When to use?
- 2D matrix where rows are sorted AND globally ordered (last of row i < first of row i+1).
- LeetCode 74 style: explicitly states both row-sorted and globally ordered.
- You need O(log(m·n)) search.

### When NOT to use?
- Rows are sorted but NOT globally ordered (the last element of row i can be larger than the first element of row i+1). That is LeetCode 240 — use the staircase approach from the top-right corner instead.

### How to recognize in a new problem?
The problem will state BOTH: (1) "each row is sorted" AND (2) "the first integer of each row is greater than the last integer of the previous row." Both conditions are required. If only rows are sorted (not globally), you need the staircase approach (O(m+n)) starting from the top-right corner.

### Simple Example
**Input:** `matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]]`, `target = 3`
**Expected Output:** `true`

**Step-by-step** (rows=3, cols=4, total=12):
- `low=0, high=11, mid=5` → row=1, col=1 → `matrix[1][1]=11 > 3` → `high=4`
- `low=0, high=4, mid=2` → row=0, col=2 → `matrix[0][2]=5 > 3` → `high=1`
- `low=0, high=1, mid=0` → row=0, col=0 → `matrix[0][0]=1 < 3` → `low=1`
- `low=1, high=1, mid=1` → row=0, col=1 → `matrix[0][1]=3 == 3` → return `true`

**Result:** `true`

### Code
```java
// Java
boolean searchMatrix(int[][] matrix, int target) {
    int rows = matrix.length;
    int cols = matrix[0].length;
    int low = 0, high = rows * cols - 1;

    while (low <= high) {
        int mid = low + (high - low) / 2;
        int row = mid / cols;
        int col = mid % cols;
        int value = matrix[row][col];

        if (value == target) return true;
        if (value < target)  low = mid + 1;
        else                 high = mid - 1;
    }
    return false;
}
```

```javascript
// JavaScript
function searchMatrix(matrix, target) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    let low = 0, high = rows * cols - 1;

    while (low <= high) {
        const mid = low + Math.floor((high - low) / 2);
        const row = Math.floor(mid / cols);
        const col = mid % cols;
        const value = matrix[row][col];

        if (value === target) return true;
        if (value < target)   low = mid + 1;
        else                  high = mid - 1;
    }
    return false;
}
```

### Dry Run
`matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]]`, `target = 3`, rows=3, cols=4:

| Step | low | high | mid | row | col | value | Action          |
|------|-----|------|-----|-----|-----|-------|-----------------|
| 1    | 0   | 11   | 5   | 1   | 1   | 11    | 11>3 → high=4   |
| 2    | 0   | 4    | 2   | 0   | 2   | 5     | 5>3 → high=1    |
| 3    | 0   | 1    | 0   | 0   | 0   | 1     | 1<3 → low=1     |
| 4    | 1   | 1    | 1   | 0   | 1   | 3     | 3==3 → true     |

### Complexity
```
Time:  O(log(m*n)) — binary search over m*n elements
Space: O(1)        — two pointers plus constant-time row/col calculation
```

### Common Trap
1. **Confusing LeetCode 74 with LeetCode 240:** In LeetCode 74, the globally-ordered property lets you flatten. In LeetCode 240, rows are only individually sorted — flattening does NOT work. For LeetCode 240, start at the top-right corner: move left if too big, move down if too small. Time is O(m+n).
2. **Row/col index math:** `row = mid / cols` uses INTEGER division. In JavaScript, always use `Math.floor(mid / cols)`.

### Experience Tip
**Experience Tip:** The entire trick is the index mapping: `row = mid / cols`, `col = mid % cols`. Once you confirm the matrix is globally ordered (LeetCode 74 style), it is just a 1D binary search with a coordinate conversion. Check the global ordering condition first — that single sentence in the problem statement is the unlock.

### Do Not Confuse With

|                    | Search a 2D Matrix (LC 74)                      | Search a 2D Matrix II (LC 240)               |
|--------------------|-------------------------------------------------|----------------------------------------------|
| Row ordering       | Globally sorted: last of row i < first of row i+1 | Only locally sorted per row and per column |
| Approach           | Flatten to 1D, classic binary search             | Staircase from top-right corner             |
| Time complexity    | O(log(m·n))                                     | O(m+n)                                       |
| Key check          | "First of row i+1 > last of row i"              | Rows and columns individually sorted         |

### LeetCode Practice

| #    | Problem                                          | Difficulty | What to Notice                                                        | Link                                                                               |
|------|--------------------------------------------------|------------|-----------------------------------------------------------------------|------------------------------------------------------------------------------------|
| 1351 | Count Negative Numbers in a Sorted Matrix        | Easy       | Binary search in each row — find the transition point per row         | Count Negative Numbers in a Sorted Matrix                                          |
| 74   | Search a 2D Matrix                               | Medium     | Globally ordered → flatten to 1D with `row=mid/cols, col=mid%cols`    | [Link](https://leetcode.com/problems/search-a-2d-matrix/)                          |
| 240  | Search a 2D Matrix II                            | Medium     | Top-right corner: moving left decreases, moving down increases        | Search a 2D Matrix II                                                              |
| 378  | Kth Smallest Element in a Sorted Matrix          | Medium     | Binary search on VALUE, not index — count elements ≤ mid with staircase | Kth Smallest Element in a Sorted Matrix                                          |
| 668  | Kth Smallest Number in Multiplication Table      | Hard       | Binary search on answer — feasibility counts elements ≤ mid per row  | Kth Smallest Number in Multiplication Table                                        |

### One-Minute Revision
```
ALGORITHM:      Search in 2D Matrix (LC 74)
IN SIMPLE WORDS: Treat globally-ordered matrix as a flat sorted array and binary search
USE WHEN:       Matrix is globally sorted (last of row i < first of row i+1)
DON'T USE WHEN: Matrix only has row/column sort (not globally ordered) — use staircase instead
CORE IDEA:      Index k maps to row=k/cols, col=k%cols — one O(1) formula unlocks the search
TRACK:          low and high on the virtual 1D index [0, rows*cols-1]
TIME:           O(log(m*n))
SPACE:          O(1)
COMMON TRAP:    Applying this to LC 240 (non-globally-ordered) — always check the global sort condition
EXPERIENCE TIP: Check "first of row i+1 > last of row i." If that's true, flatten and search.
```

---

## Quick Reference Cheat Sheet

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
  low=0, high=n              ← n not n-1
  while (low < high):        ← strict <
      mid = low + (high-low)/2
      if arr[mid]<target:  low=mid+1
      else:                high=mid  ← NOT mid-1
  return low                 ← verify arr[low]==target

UPPER BOUND (first index where arr[i] > target)
  Same as lower bound, change condition: arr[mid]<=target → low=mid+1

COUNT OF TARGET IN SORTED ARRAY
  upperBound(arr, x) - lowerBound(arr, x)

BINARY SEARCH ON ANSWER
  lo=minPossibleAnswer, hi=maxPossibleAnswer
  while (lo < hi):
      mid = lo + (hi-lo)/2
      if isFeasible(mid): hi=mid      ← keep mid, it might be the answer
      else:               lo=mid+1    ← discard mid, too small
  return lo

ROTATED SORTED ARRAY
  low=0, high=n-1
  while (low <= high):
      mid = low + (high-low)/2
      if arr[mid]==target: return mid
      if arr[low]<=arr[mid]:           ← left half is sorted
          if arr[low]<=target<arr[mid]: high=mid-1
          else: low=mid+1
      else:                            ← right half is sorted
          if arr[mid]<target<=arr[high]: low=mid+1
          else: high=mid-1
  return -1

FIND PEAK ELEMENT
  low=0, high=n-1
  while (low < high):
      mid = low + (high-low)/2
      if arr[mid]<arr[mid+1]: low=mid+1   ← uphill, peak is right
      else:                   high=mid    ← downhill, peak is here or left
  return low

SEARCH IN 2D MATRIX (globally ordered)
  low=0, high=rows*cols-1
  while (low <= high):
      mid = low + (high-low)/2
      row=mid/cols, col=mid%cols
      if matrix[row][col]==target: return true
      if matrix[row][col]<target:  low=mid+1
      else:                        high=mid-1
  return false

COMPLEXITY SUMMARY
  Classic Binary Search:    O(log n)      O(1) space
  Lower/Upper Bound:        O(log n)      O(1) space
  Rotated Array Search:     O(log n)      O(1) space  [O(n) with duplicates]
  Binary Search on Answer:  O(n log R)    O(1) space  [R = answer range]
  Find Peak Element:        O(log n)      O(1) space
  2D Matrix (LC 74):        O(log(m*n))   O(1) space
  2D Matrix (LC 240):       O(m+n)        O(1) space  [staircase, not binary search]
```

---

## Ternary Search

### What is it?
Ternary search finds the **peak** (maximum or minimum) of a **unimodal function** — a function that rises to one peak then falls (or falls to one valley then rises). Unlike binary search which finds a specific value in a sorted array, ternary search finds WHERE the function is highest. Think of hiking a mountain: at any two test points, you always move toward the higher one, narrowing in on the summit step by step.

### Visual
```
UNIMODAL array — rises to ONE peak, then falls (ternary search works):
[1, 3, 6, 10, 15, 12, 8, 4, 2]
 0  1  2   3   4   5  6  7  8
                PEAK at index 4

NOT unimodal — has TWO peaks (ternary search WILL give wrong answer!):
[1, 5, 3, 8, 2]
    ^     ^
  peak1  peak2

How ternary search narrows down:

Step 1: low=0, high=8
  m1 = 0 + (8-0)/3 = 2  → arr[m1]=6
  m2 = 8 - (8-0)/3 = 5  → arr[m2]=12

  [1, 3,  6,  10, 15, 12,  8, 4, 2]
            ^            ^
           m1           m2
  arr[m1]=6 < arr[m2]=12 → peak is to the RIGHT of m1
  → discard left third: low = m1 + 1 = 3

Step 2: low=3, high=8
  m1 = 3 + (8-3)/3 = 4  → arr[m1]=15
  m2 = 8 - (8-3)/3 = 6  → arr[m2]=8

  arr[m1]=15 > arr[m2]=8 → peak is to the LEFT of m2
  → discard right third: high = m2 - 1 = 5

Step 3: low=3, high=5 (only 3 elements left → scan)
  arr[3]=10, arr[4]=15, arr[5]=12 → PEAK at index 4
```

### How does it work?
1. Set `low = 0`, `high = n - 1`.
2. While `high - low > 2`, compute two midpoints that divide the range into thirds:
   - `m1 = low + (high - low) / 3`
   - `m2 = high - (high - low) / 3`
3. Compare `arr[m1]` and `arr[m2]`:
   - If `arr[m1] < arr[m2]`: the left third is going downhill — peak is RIGHT of m1. Set `low = m1 + 1`.
   - If `arr[m1] > arr[m2]`: the right third is going downhill — peak is LEFT of m2. Set `high = m2 - 1`.
4. When `high - low <= 2`, scan the remaining 2–3 elements for the maximum.

### Why does it work?
The array is unimodal (rises then falls). At any two test points m1 < m2:
- If `arr[m1] < arr[m2]`: the array is still rising at m1. The peak cannot be at m1 or anywhere to its left — discard the entire left third.
- If `arr[m1] > arr[m2]`: the array is already falling at m2. The peak cannot be at m2 or to its right — discard the entire right third.

Each step discards one-third of the search space. After log₃(n) steps, only a handful of elements remain.

### When to use?
- The array is **unimodal**: values increase to a single peak, then decrease (or decrease to a single valley, then increase).
- You need to find the **peak value or its index**, not a specific target value.
- Competitive programming: maximizing/minimizing a unimodal continuous or discrete function.

### When NOT to use?
- Array has **multiple peaks** — ternary search picks one arbitrarily and may miss the global peak.
- You want to find a **specific target value** — use binary search (simpler, also O(log n)).
- Array is **fully sorted** — binary search is cleaner.

### How to recognize in a new problem?
Ask: "Does the function first rise then fall (or fall then rise) with exactly one peak?" If yes, ternary search applies.

Decision chain:
```
Is there exactly ONE peak/valley? → Ternary Search
Is the array sorted (monotone)?   → Binary Search
Any local peak is acceptable?     → "Find Peak Element" binary approach (simpler!)
```

Key signals in problem statement: "mountain array," "unimodal function," "maximize f(x) over a range," "array increases then decreases."

### Simple Example
**Input:** `arr = [1, 3, 6, 10, 15, 12, 8, 4, 2]`
**Trace:** Find the index of the maximum.

### Code
```java
// Java — Find peak index in a unimodal array
int ternarySearch(int[] arr) {
    int low = 0, high = arr.length - 1;
    while (high - low > 2) {
        int m1 = low + (high - low) / 3;
        int m2 = high - (high - low) / 3;
        if (arr[m1] < arr[m2]) {
            low = m1 + 1;   // peak is to the right of m1
        } else {
            high = m2 - 1;  // peak is to the left of m2
        }
    }
    // Scan the remaining small window (at most 3 elements)
    int peakIdx = low;
    for (int i = low + 1; i <= high; i++) {
        if (arr[i] > arr[peakIdx]) peakIdx = i;
    }
    return peakIdx;
}
```
```javascript
// JavaScript — Find peak index in a unimodal array
function ternarySearch(arr) {
    let low = 0, high = arr.length - 1;
    while (high - low > 2) {
        const m1 = low + Math.floor((high - low) / 3);
        const m2 = high - Math.floor((high - low) / 3);
        if (arr[m1] < arr[m2]) {
            low = m1 + 1;
        } else {
            high = m2 - 1;
        }
    }
    let peakIdx = low;
    for (let i = low + 1; i <= high; i++) {
        if (arr[i] > arr[peakIdx]) peakIdx = i;
    }
    return peakIdx;
}
```

### Dry Run
`arr = [1, 3, 6, 10, 15, 12, 8, 4, 2]`

| Step | low | high | m1 | m2 | arr[m1] | arr[m2] | Action         |
|------|-----|------|----|----|---------|---------|----------------|
| 1    | 0   | 8    | 2  | 5  | 6       | 12      | 6<12 → low=3   |
| 2    | 3   | 8    | 4  | 6  | 15      | 8       | 15>8 → high=5  |
| 3    | 3   | 5    | —  | —  | high-low=2, scan [3..5]: arr[4]=15 is max |

**Result:** index `4` (value `15`)

### Complexity
```
Time:  O(log₃ n) ≈ O(log n) — each step discards one-third of the range
       Slightly more steps than binary search (log₃ vs log₂), same Big-O class
Space: O(1)     — only a few index variables
```

### Common Trap
**Confusing ternary search with binary search.** Binary search finds a specific TARGET in a sorted array — it compares `arr[mid]` to a value you're looking for. Ternary search finds the PEAK of a unimodal array — it compares two internal points to each other. They look similar but solve completely different problems. If a problem says "find value X," use binary search. If it says "find the maximum," and there is exactly one peak, use ternary search.

### Experience Tip
**Experience Tip:** In LeetCode interviews, the "Follow the uphill" binary search approach (comparing `arr[mid]` to `arr[mid+1]`) solves "Find Peak Element" in O(log n) with a simpler template and works even when there are multiple local peaks. Ternary search shines in competitive programming where the function is provably unimodal and you want to maximize/minimize it over a large continuous range. Know both — default to the binary "uphill" approach for LeetCode, save ternary search for truly unimodal optimization problems.

### Do Not Confuse With

|                    | Ternary Search                            | Binary Search                            |
|--------------------|-------------------------------------------|------------------------------------------|
| Array structure    | Unimodal (rises to ONE peak, then falls)  | Sorted (strictly monotone)               |
| What you find      | The PEAK (maximum or minimum)             | A specific TARGET value                  |
| Midpoints used     | Two — m1 and m2 (divides into thirds)     | One — mid (divides in half)              |
| Comparison         | arr[m1] vs arr[m2] (internal comparison)  | arr[mid] vs target (vs known value)      |
| Discards per step  | One-third                                 | One-half                                 |
| Key requirement    | Exactly one peak                          | Sorted array                             |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal | Link |
|---|---------|------------|----------------|------|
| 852 | Peak Index in a Mountain Array | Easy | Classic unimodal — can use ternary or binary "uphill" approach | [Link](https://leetcode.com/problems/peak-index-in-a-mountain-array/) |
| 162 | Find Peak Element | Medium | Any local peak valid — binary "uphill" is preferred here | [Link](https://leetcode.com/problems/find-peak-element/) |
| 1095 | Find in Mountain Array | Hard | Find peak first (ternary), then binary search each sorted half | [Link](https://leetcode.com/problems/find-in-mountain-array/) |
| 1802 | Maximum Value at a Given Index in a Bounded Array | Medium | Binary search on answer over a unimodal feasibility space | [Link](https://leetcode.com/problems/maximum-value-at-a-given-index-in-a-bounded-array/) |
| 1539 | Kth Missing Positive Number | Easy | Binary search on a monotonic function — recognizing the search space | [Link](https://leetcode.com/problems/kth-missing-positive-number/) |
| 410 | Split Array Largest Sum | Hard | Binary search on answer — monotonic feasibility boundary | [Link](https://leetcode.com/problems/split-array-largest-sum/) |

### One-Minute Revision
```
ALGORITHM:  Ternary Search
USE WHEN:   Array is unimodal (rises to ONE peak then falls); find the peak/maximum
CORE IDEA:  Split range into thirds with m1, m2; arr[m1]<arr[m2] → peak is right of m1;
            arr[m1]>arr[m2] → peak is left of m2; discard one-third each step
TIME/SPACE: O(log n) / O(1)
TRAP:       ONLY works on unimodal (single peak) data; do NOT confuse with binary search
            (binary search finds a VALUE; ternary search finds the PEAK)
```

---

## Exponential Search

### What is it?
Exponential search finds a target in a sorted array when the array size is **unknown** or **very large** — like searching an infinitely long sorted list. It works in two phases: first it doubles an index (1, 2, 4, 8, 16, ...) until it overshoots the target, then it runs binary search in that last doubled window. Think of it as first asking "how big is the haystack?" then "find the needle in the right-sized haystack."

### Visual
```
Sorted array — imagine it could go on forever (size unknown):
[2, 5, 8, 12, 16, 23, 38, 45, 67, 89, 102, ...]
 0  1  2   3   4   5   6   7   8   9   10

Target = 23

PHASE 1 — Doubling (locate the window):
  i=1:  arr[1]=5   < 23 → double → i=2
  i=2:  arr[2]=8   < 23 → double → i=4
  i=4:  arr[4]=16  < 23 → double → i=8
  i=8:  arr[8]=67  > 23 → STOP!

  Window found: [i/2, i] = [4, 8]
  (The target MUST be somewhere in this range)

       [4           8]
  [2, 5, 8, 12, 16, 23, 38, 45, 67, ...]
                   ^-----------^
                  low=4       high=8

PHASE 2 — Binary Search within window [4, 8]:
  low=4, high=8, mid=6 → arr[6]=38 > 23 → high=5
  low=4, high=5, mid=4 → arr[4]=16 < 23 → low=5
  low=5, high=5, mid=5 → arr[5]=23 == 23 → FOUND at index 5
```

### How does it work?
1. Check index `0` — if it matches, return `0`.
2. Start `i = 1`. While `i < n` AND `arr[i] < target`, double: `i = i * 2`.
3. After the loop, target is in the window `[i/2, min(i, n-1)]`.
4. Run classic binary search within that window.

### Why does it work?
Doubling covers exponentially more ground: after k doublings, you've probed index 2^k. So it takes only O(log p) doublings to reach or surpass the target's position p. The binary search window `[i/2, i]` has size at most `i/2 = p`, so binary search also takes O(log p) steps. Total: **O(log p)** — much faster than O(log n) when the target is near the start.

### When to use?
- Array size is **unknown** (e.g., infinite sorted list, hidden array API).
- Array is very large and the target is likely **near the beginning**.
- You need **O(log p)** instead of O(log n), where p is the target's index.

### When NOT to use?
- Array size is known and not huge — plain binary search is simpler.
- Array is unsorted.
- The target is always near the end — exponential search offers no advantage.

### How to recognize in a new problem?
Key signals: "sorted array of unknown size," "infinite sorted list," "you can only call `get(i)` but don't know the length," "find in a stream of sorted data." The giveaway is you cannot set `high = n - 1` because `n` is unknown.

### Simple Example
**Input:** `arr = [2, 5, 8, 12, 16, 23, 38, 45, 67, 89, 102]`, `target = 23`
**Trace:**
- Phase 1: i=1→5<23→i=2, i=2→8<23→i=4, i=4→16<23→i=8, i=8→67>23→STOP. Window=[4,8].
- Phase 2: binary search [4,8] → finds 23 at index 5.

### Code
```java
// Java — Exponential Search
int exponentialSearch(int[] arr, int target) {
    int n = arr.length;
    if (arr[0] == target) return 0;

    // Phase 1: double until we overshoot or hit the end
    int i = 1;
    while (i < n && arr[i] < target) {
        i *= 2;
    }

    // Phase 2: binary search in window [i/2, min(i, n-1)]
    int low = i / 2;
    int high = Math.min(i, n - 1);  // IMPORTANT: cap at n-1
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target)  low = mid + 1;
        else                    high = mid - 1;
    }
    return -1;
}
```
```javascript
// JavaScript — Exponential Search
function exponentialSearch(arr, target) {
    const n = arr.length;
    if (arr[0] === target) return 0;

    // Phase 1: double until we overshoot or hit the end
    let i = 1;
    while (i < n && arr[i] < target) {
        i *= 2;
    }

    // Phase 2: binary search in window [i/2, min(i, n-1)]
    let low = Math.floor(i / 2);
    let high = Math.min(i, n - 1);  // IMPORTANT: cap at n-1
    while (low <= high) {
        const mid = low + Math.floor((high - low) / 2);
        if (arr[mid] === target) return mid;
        if (arr[mid] < target)   low = mid + 1;
        else                     high = mid - 1;
    }
    return -1;
}
```

### Dry Run
`arr = [2, 5, 8, 12, 16, 23, 38, 45, 67, 89, 102]`, `target = 23`, n=11

**Phase 1 — Doubling:**

| i  | arr[i] | arr[i] < 23? | Action  |
|----|--------|--------------|---------|
| 1  | 5      | YES          | i=2     |
| 2  | 8      | YES          | i=4     |
| 4  | 16     | YES          | i=8     |
| 8  | 67     | NO           | STOP    |

Window: low=4, high=min(8,10)=8

**Phase 2 — Binary Search [4, 8]:**

| Step | low | high | mid | arr[mid] | Action           |
|------|-----|------|-----|----------|------------------|
| 1    | 4   | 8    | 6   | 38       | 38>23 → high=5   |
| 2    | 4   | 5    | 4   | 16       | 16<23 → low=5    |
| 3    | 5   | 5    | 5   | 23       | FOUND → return 5 |

### Complexity
```
Time:  O(log p) — p is the index (position) of the target
       Phase 1 (doubling):     O(log p) steps to reach index ≥ p
       Phase 2 (binary search): window size ≤ p, so O(log p) more steps
       When p << n: MUCH faster than binary search's O(log n)
       When p ≈ n:  same as binary search
Space: O(1) — only a handful of index variables
```

### Common Trap
**Forgetting to cap the binary search `high` at `n - 1`.** After the doubling phase, `i` can overshoot the end of the array. If you pass `i` directly as `high`, you'll access `arr[i]` out of bounds on a finite array. Always write `high = Math.min(i, n - 1)`.

### Experience Tip
**Experience Tip:** In interviews, when an array is described as "infinite" or "size unknown," exponential search is the expected pattern. The two-phase structure is the entire insight: Phase 1 locates the right neighborhood in O(log p) by doubling; Phase 2 finds the exact element in O(log p) by binary search. When p (position of target) is much smaller than n (array size), this is strictly faster than binary search — a useful talking point in an interview.

### Do Not Confuse With

|                    | Exponential Search                         | Binary Search                       |
|--------------------|--------------------------------------------|-------------------------------------|
| When to use        | Unknown array size; target near the start  | Known array size                    |
| Phase 1            | Doubling (1, 2, 4, 8, ...) to find window  | Not needed — search whole array     |
| Phase 2            | Binary search in the found window          | Binary search on full array         |
| Time complexity    | O(log p) — p = target's index              | O(log n) — n = array size           |
| Best case          | Target near start → very fast              | Always O(log n), no early advantage |
| Requires size?     | NO — works without knowing n               | YES — needs `high = n - 1`          |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal | Link |
|---|---------|------------|----------------|------|
| 704 | Binary Search | Easy | Master Phase 2 first — binary search is the core subroutine | [Link](https://leetcode.com/problems/binary-search/) |
| 702 | Search in a Sorted Array of Unknown Size | Medium | Classic exponential search — array size hidden behind an API | [Link](https://leetcode.com/problems/search-in-a-sorted-array-of-unknown-size/) |
| 35 | Search Insert Position | Easy | Lower-bound binary search — the exact Phase 2 pattern | [Link](https://leetcode.com/problems/search-insert-position/) |
| 374 | Guess Number Higher or Lower | Easy | Interactive doubling guess — conceptually similar to Phase 1 | [Link](https://leetcode.com/problems/guess-number-higher-or-lower/) |
| 1060 | Missing Element in Sorted Array | Medium | Binary search on sorted array — exponential useful if very large | [Link](https://leetcode.com/problems/missing-element-in-sorted-array/) |
| 744 | Find Smallest Letter Greater Than Target | Easy | Binary search variant — upper-bound pattern recognition | [Link](https://leetcode.com/problems/find-smallest-letter-greater-than-target/) |

### One-Minute Revision
```
ALGORITHM:  Exponential Search
USE WHEN:   Sorted array of UNKNOWN or very large size; target likely near the start
CORE IDEA:  Phase 1 — double i (1→2→4→8...) until arr[i] >= target (O(log p))
            Phase 2 — binary search in window [i/2, min(i, n-1)] (O(log p))
TIME/SPACE: O(log p) where p = target's position / O(1)
TRAP:       Always cap high = min(i, n-1) — i from doubling can exceed array bounds
```

---

*Next: [04-SORTING-AND-ORDER.md](04-SORTING-AND-ORDER.md) — Sorting as a problem-solving tool, not just a utility.*
