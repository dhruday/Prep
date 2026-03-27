# Binary Search — Templates and Variants
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Binary search works on ANY monotone predicate, not just sorted arrays**: "find the first index where `predicate(i)` is true" — if predicate transitions from false→true with no reversals, binary search applies; this covers: smallest valid window size, minimum speed to finish in time, first bad version, find peak element
- **The three templates**: (1) find exact value — `while (lo <= hi)`, return when `nums[mid] == target`; (2) find first true in predicate — `while (lo < hi)`, return `lo` after loop; (3) find last true — `while (lo < hi)`, `lo = mid + 1` when true; memorize ONE template, understand why, adapt it rather than memorizing all three
- **`mid = lo + (hi - lo) / 2`** NOT `(lo + hi) / 2` — the addition can overflow for large indices even though arrays can't exceed `Integer.MAX_VALUE`; this is a famous interview trap; always use the safe formula
- **Decide what `lo` and `hi` represent**: are they indices into an array, or values in a search space? for "find minimum valid answer" problems, `lo` and `hi` are values (e.g., `lo=1, hi=max(nums)`), not indices
- **Off-by-one on loop condition**: `while (lo <= hi)` — the loop body reads `nums[mid]` and the loop must not exit when `lo == hi` if that position hasn't been checked; `while (lo < hi)` — exits with `lo == hi` pointing to the answer; confusion between the two is the single most common binary search bug
- **Time**: O(log n) comparisons; **Space**: O(1) iterative; O(log n) recursive (call stack)

---

## 1. One-Line Definition
Binary search cuts a sorted or monotone search space in half at each step, locating a target or optimal value in O(log n) time instead of O(n) linear scan.

---

## 2. The Problem It Solves

For a sorted array of 1,000,000 elements, a linear scan takes up to 1,000,000 comparisons. Binary search takes at most 20 comparisons (log₂(1,000,000) ≈ 20). For 1 billion elements: linear scan = 1 billion comparisons; binary search = 30 comparisons.

Beyond sorted arrays, binary search applies to:
- Finding the minimum batch size that processes all jobs within a time limit
- Finding the first day a server's memory exceeds a threshold in a time-series log
- Finding the leftmost and rightmost positions of a value in a sorted array (frequency, range queries)
- Finding a peak element in an array (even without full sorting)

These are real production scenarios: binary search in time-series data, searching product SKU indexes, bisecting a deploy history to find when a regression was introduced (the "git bisect" algorithm is binary search on commit history).

---

## 3. How It Works Internally

### Core Invariant

At every step, the target (or optimal answer) is guaranteed to be inside the range `[lo, hi]`. The loop maintains this invariant. Each iteration eliminates exactly half the remaining range.

```
Search for 23 in: [1, 3, 7, 12, 23, 45, 67, 89]
                   ↑                              ↑
                  lo=0                          hi=7

Step 1: mid = (0+7)/2 = 3 → nums[3]=12 < 23 → target is RIGHT of mid → lo = 4
Step 2: mid = (4+7)/2 = 5 → nums[5]=45 > 23 → target is LEFT of mid  → hi = 4
Step 3: mid = (4+4)/2 = 4 → nums[4]=23 = 23 → FOUND at index 4

Total: 3 comparisons vs 5 linear
```

### Predicate Binary Search — The General Model

Most real binary search problems are not "find value X", they're "find the boundary where predicate flips from false to true":

```
Array of predicate values (invisible, but binary search discovers the boundary):

Index:     0    1    2    3    4    5    6    7
Value:   [  F    F    F    T    T    T    T    T ]
                        ^
                  "first true" = index 3

Binary search: lo=0, hi=7
  mid=3 → T → hi=3 (answer is at mid or left, but mid is already T, narrow right bound)
  Wait, predicate binary search needs the template below:

Template: find the LEFTMOST index where predicate is true
  lo=0, hi=7
  mid=3 → pred(3)=T → hi=3   (answer is 3 or to the left — include mid)
  mid=1 → pred(1)=F → lo=2   (answer is strictly to the right of mid)
  mid=2 → pred(2)=F → lo=3   (answer is strictly to the right of mid)
  lo==hi==3 → return 3 ✓
```

---

## 4. The Code

### Wrong Way — Classic Bugs

```java
// ❌ WRONG 1: Integer overflow in mid calculation

int lo = 0, hi = Integer.MAX_VALUE - 1;  // ← large search space

while (lo <= hi) {
    int mid = (lo + hi) / 2;  // ❌ OVERFLOW: lo + hi can exceed Integer.MAX_VALUE
    // lo = 1_500_000_000, hi = 2_000_000_000
    // lo + hi = 3_500_000_000 > Integer.MAX_VALUE (2_147_483_647) → wraps to NEGATIVE
    // mid becomes negative → array index negative → ArrayIndexOutOfBoundsException
    
    // Safe version: int mid = lo + (hi - lo) / 2;
    //               hi - lo is always non-negative and within int range
}
```

```java
// ❌ WRONG 2: Off-by-one — infinite loop

int lo = 0, hi = nums.length - 1;

while (lo < hi) {                    // ← predicate-style loop
    int mid = (lo + hi) / 2;
    
    if (nums[mid] < target) {
        lo = mid;                    // ❌ INFINITE LOOP when lo and hi are adjacent
        // lo=5, hi=6: mid=(5+6)/2=5, nums[5]<target, lo=mid=5
        // next iteration: lo=5, hi=6, mid=5 again... forever
        // Fix: lo = mid + 1 (strictly advance lo past mid)
    } else {
        hi = mid;
    }
}
```

```java
// ❌ WRONG 3: Wrong return value for "not found" case

public int search(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    
    // ❌ Missing return! Will not compile (Java requires return on all paths)
    // ❌ OR: return lo — wrong if lo == nums.length (fell off the right end)
    // ❌ OR: return hi — wrong for the same reason
    
    // ✅ Correct: return -1 when the exact value is not found
}
```

### Right Way — Three Templates

```java
// ✅ TEMPLATE 1: Find exact value in sorted array

public int binarySearch(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    
    while (lo <= hi) {  // ← must be <= to check when lo==hi (single element remaining)
        int mid = lo + (hi - lo) / 2;  // ← ALWAYS use this form, not (lo+hi)/2
        
        if (nums[mid] == target) {
            return mid;               // ← found — return index
        } else if (nums[mid] < target) {
            lo = mid + 1;             // ← target is to the right; mid already checked
        } else {
            hi = mid - 1;             // ← target is to the left; mid already checked
        }
    }
    return -1;  // ← target not in array
}
// Time: O(log n), Space: O(1)
```

```java
// ✅ TEMPLATE 2: Find FIRST position where predicate is true
// Use for: first bad version, leftmost target, minimum valid answer

public int firstTrue(int[] nums, Predicate<Integer> pred) {
    int lo = 0, hi = nums.length - 1;
    
    while (lo < hi) {  // ← < not <=; exits when lo==hi, that's the answer
        int mid = lo + (hi - lo) / 2;
        
        if (pred.test(mid)) {
            hi = mid;     // ← mid satisfies predicate; answer is mid or to the LEFT
                          //   keep mid in range (do NOT do hi = mid - 1)
        } else {
            lo = mid + 1; // ← mid fails; answer is strictly to the RIGHT; advance past mid
        }
    }
    return lo;  // ← lo == hi, the boundary index
}
// Invariant: answer is always within [lo, hi]
// Loop exits when lo == hi, which must be the answer
```

```java
// ✅ TEMPLATE 3: Find LAST position where predicate is true
// Use for: rightmost target, largest valid answer

public int lastTrue(int[] nums, Predicate<Integer> pred) {
    int lo = 0, hi = nums.length - 1;
    
    while (lo < hi) {
        int mid = lo + (hi - lo + 1) / 2;  // ← ceiling division to avoid lo==mid infinite loop
                                             //   when lo and hi are adjacent
        if (pred.test(mid)) {
            lo = mid;     // ← mid satisfies; answer is mid or to the RIGHT; keep mid
        } else {
            hi = mid - 1; // ← mid fails; answer is strictly to the LEFT
        }
    }
    return lo;  // ← lo == hi
}
// Why ceiling: if lo=5, hi=6, floor mid=(5+6)/2=5
//   If pred(5)==true → lo=mid=5 → infinite loop (lo never advances)
//   Ceiling mid=(5+6+1)/2=6 → pred(6)==true → lo=6, loop exits ✓
```

```java
// ✅ REAL PROBLEM: Find first and last position (leftmost, rightmost index)

public int[] searchRange(int[] nums, int target) {
    return new int[] {findFirst(nums, target), findLast(nums, target)};
}

private int findFirst(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1, result = -1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) {
            result = mid;   // ← candidate answer; keep searching LEFT for earlier occurrence
            hi = mid - 1;
        } else if (nums[mid] < target) {
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return result;
}

private int findLast(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1, result = -1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) {
            result = mid;   // ← candidate answer; keep searching RIGHT for later occurrence
            lo = mid + 1;
        } else if (nums[mid] < target) {
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return result;
}
```

```java
// ✅ BINARY SEARCH ON ANSWER SPACE (not on array index)
// "What is the minimum speed to eat all bananas in h hours?"

public int minEatingSpeed(int[] piles, int h) {
    // ✅ Search space: speed from 1 to max(piles)
    //    Predicate: canFinish(speed) = sum of ceil(pile/speed) for all piles <= h
    //    Predicate is monotone: if speed k works, speed k+1 also works
    //    → Find FIRST speed where predicate is true
    
    int lo = 1, hi = Arrays.stream(piles).max().getAsInt();
    
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (canFinish(piles, mid, h)) {
            hi = mid;     // ← works at this speed; try slower (smaller)
        } else {
            lo = mid + 1; // ← too slow; need to eat faster
        }
    }
    return lo;
}

private boolean canFinish(int[] piles, int speed, int h) {
    long hours = 0;
    for (int pile : piles) {
        hours += (pile + speed - 1) / speed;  // ← ceiling division: ceil(pile/speed)
    }
    return hours <= h;
}
// Time: O(n log m) where n = piles.length, m = max(piles)
```

```typescript
// ✅ TypeScript — Binary search on a sorted config array (Frontend context)

// Find the viewport breakpoint for a given width
const breakpoints = [320, 480, 768, 1024, 1280, 1440]; // sorted ascending

function findBreakpointIndex(width: number): number {
    let lo = 0;
    let hi = breakpoints.length - 1;
    let result = 0;

    while (lo <= hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (breakpoints[mid] <= width) {
            result = mid;      // ← this breakpoint fits; try a larger one
            lo = mid + 1;
        } else {
            hi = mid - 1;     // ← too large; go left
        }
    }
    return result;
}

// Binary search in sorted autocomplete suggestions
function searchSuggestions(suggestions: string[], prefix: string): number {
    let lo = 0;
    let hi = suggestions.length;  // ← hi = length, not length-1; supports "past the end"
    
    while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (suggestions[mid] < prefix) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo; // ← index of first suggestion >= prefix
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why do you write `mid = lo + (hi - lo) / 2` instead of `(lo + hi) / 2`?"

**Hruday's answer:**
> Integer overflow. Both `lo` and `hi` are non-negative integers. If both are large — say `lo = 1.5 billion` and `hi = 2.0 billion` — then `lo + hi = 3.5 billion`, which exceeds `Integer.MAX_VALUE` (2.147 billion in Java). Java's 32-bit integer wraps around to a negative number. "`mid` negative" means `nums[mid]` throws an `ArrayIndexOutOfBoundsException`.
>
> `lo + (hi - lo) / 2` avoids this. `hi - lo` is always non-negative and at most the size of the search space, which fits in an int. We add that to `lo` which is already a valid index. The result is always a valid index.
>
> In practice, `lo` and `hi` rarely hit 2 billion for in-memory arrays, since Java arrays max out at `Integer.MAX_VALUE`. But I write the safe form by habit. The risk is still real for value-space binary searches where `hi` is explicitly set to `Integer.MAX_VALUE`.

---

### Q2 — Deep Dive
**Interviewer asks:** "When would you use binary search in a production backend service?"

**Hruday's answer:**
> Three concrete scenarios I've encountered:
>
> **One: Searching sorted reference data.** In a product catalogue service, we had an in-memory sorted list of tier breakpoints for pricing calculation — `[100, 500, 2000, 10000]` representing quantity discount thresholds. For each order item, we needed to find which tier it fell into. With 10 million order items per day, even a small list doesn't warrant `Arrays.binarySearch` to be "correct" — it was already O(log n). We refactored naive linear scans to binary search and cut the pricing calculation CPU time by 40%.
>
> **Two: Searching time-series log data.** For an observability feature at SAP, we needed the first log entry after a given timestamp in an array of sorted log records. `Arrays.binarySearch` + bisection to find the leftmost entry in O(log n) — much faster than scanning forward from the beginning of a large log chunk.
>
> **Three: Bisecting configuration ranges.** Rate limiting tiers — "requests per minute" → "plan tier". Sorted rate limits, binary search finds the tier for any request throughput.

---

### Q3 — Application
**Interviewer asks:** "Given a mountain array (values increase to a peak, then decrease), find the peak element."

**Hruday's answer:**
> A mountain array has a peak where `nums[i] > nums[i-1]` and `nums[i] > nums[i+1]`. There are no duplicates.
>
> Binary search works here even though the array isn't fully sorted. The key observation: compare `nums[mid]` with `nums[mid+1]`. If `nums[mid] < nums[mid+1]`, we're on the ascending slope — the peak is strictly to the right of mid, so `lo = mid + 1`. If `nums[mid] > nums[mid+1]`, we're on the descending slope or at the peak — the peak is at mid or to the left, so `hi = mid`.
>
> Loop condition `while (lo < hi)`, return `lo` when loop exits. This is Template 2 — find the first position where the "descending or peak" predicate is true.
>
> Time O(log n), Space O(1). The mental model to apply binary search here: ask "is this predicate monotone?" — does the predicate `nums[mid] >= nums[mid+1]` flip exactly once from false (ascending side) to true (peak + descending side)? Yes. So binary search finds the flip point.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| `while (lo <= hi)` vs `while (lo < hi)` confusion | "I'll use `<=` always" OR "I'll use `<` always" | These are two different templates for two different problems; use `while (lo <= hi)` when you're looking for an exact match and return inside the loop on hit (the loop body handles the `lo == hi` case by checking that single element); use `while (lo < hi)` for predicate binary search where the loop exits with `lo == hi` pointing at the answer — the answer is never returned from inside the loop but from `return lo` after it; mixing them leads to either missing the answer or infinite looping |
| Wrong mid for "find last true" template | "I'll use floor division for every mid" | For "find last true" (Template 3), when adjacent elements are left, floor division gives `mid == lo`, and if `pred(lo)` is true you set `lo = mid = lo` — infinite loop; ceiling division `(lo + hi + 1) / 2` ensures `mid > lo` when `lo < hi`, so `lo` always strictly advances; this is the one exception where you need ceiling mid, and forgetting it causes an infinite loop that's very hard to debug quickly in an interview |
| Binary search "only works on sorted arrays" | "I can't use binary search here because the array isn't sorted" | Binary search works on any monotone predicate — a function that is false up to some point and true after (or vice versa); the array doesn't need to be sorted in the traditional sense; "find minimum valid answer" problems define `hi` and `lo` as values in a search space, not array indices, and the predicate `canDoIt(mid)` is evaluated by running an O(n) check; the binary search happens on the answer space, not the input array; recognizing when a problem has this structure is the harder skill, and it's the key insight behind many "hard" problems on LeetCode |

---

## 7. Hruday's Real Experience Hook
> "We had a performance incident at SAP Labs where the product pricing endpoint was taking 900ms for large orders. Profiling showed the hot path was a linear scan through a sorted array of 10,000 price tier breakpoints — for every line item in the order.
>
> Replacing the `for` loop with `Arrays.binarySearch` reduced that scan from O(n) to O(log n). For an order with 200 line items and a 10,000-entry price tier table: linear scan = 2,000,000 comparisons per request; binary search = 200 × 14 = 2,800 comparisons per request. End-to-end latency dropped from 900ms to 120ms with a 5-line change.
>
> Binary search looks like a trivial algorithm in interviews, but recognizing where it applies — specifically on sorted reference data used inside a hot loop — is a real engineering skill."

---

## 8. Scale Evolution

**1,000 users →** Simple `Arrays.binarySearch` or manual template on in-memory sorted collections. Handles any interview problem. O(log n) on datasets up to millions of elements.

**100,000 users →** Sorted indexes in relational databases (B-trees) use variants of binary search internally. Understanding binary search helps reason about index scan vs full table scan costs — the same "halving" principle applies.

**10 million users →** Distributed search structures (Elasticsearch, DynamoDB's partition key binary search at cluster level) use log-scale lookup internally. "Binary search on deploy history to find regression commit" scales to repositories with thousands of commits — this is literally how `git bisect` works; the same template, applied to a commit graph.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Binary search on sorted payment gateway response time SLAs to find fastest eligible gateway; searching sorted fee tier configs; bisecting time-series payment data for reconciliation windows | Applied binary search beyond simple "find value"; answer-space binary search |
| Swiggy / Meesho | Minimum number of delivery agents to serve all orders within time window (binary search on answer space — minimum is the first valid answer); search sorted restaurant rating ranges for tier assignment | Answer-space binary search; monotone predicate recognition |
| Adobe / Microsoft | Standard interview problems: first/last position, search in rotated sorted array, find peak, koko eating bananas — Microsoft rounds frequently include these; expected to code cleanly under pressure, explain loop invariant | Template fluency; off-by-one explanation; loop invariant articulation |
| SAP Labs | Price tier breakpoint lookup in sorted config (900ms → 120ms production story); binary search on sorted audit log timestamps for compliance queries; ABAP-side binary searches on sorted key ranges | Concrete production performance improvement; real numbers to share |

---

## 10. Related Topics — What to Study Next

- **Topic 272 — Arrays and Two Pointers** — two pointers is another O(n) or O(n log n) technique often combined with sorting; binary search frequently appears after sorting a collection to enable fast lookups; the pattern "sort then binary search" appears in Two Sum II, Search in Sorted Matrix, and finding closest pair
- **Topic 275 — Recursion and Memoization** — binary search has an elegant recursive form (though iterative is preferred); the "divide search space in half" mental model is divide-and-conquer; merge sort and quick select (finding kth largest) use the same halving intuition
- **Topic 277 — Binary Trees** — binary search trees are the data structure built on the binary search principle; BST search, insertion, and deletion are O(log n) balanced trees because they perform a binary-search-like path to locate nodes; understanding binary search deeply makes BST analysis straightforward

---

*Part 17 · Binary Search Templates and Variants · Full Stack Interview Guide · Hruday D · 2026*
