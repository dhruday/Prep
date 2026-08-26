# Interval and Sweep Line — 1-Hour Learning Module

> *"Intervals are ranges on a number line. Most interval problems reduce to: sort them, then scan left to right, merging or counting as you go."*

**Total Time:** 60 minutes | **Difficulty:** Medium | **Google Frequency:** Very High

---

## Table of Contents

1. [[0–10 min] Big Picture](#0-10-min-big-picture)
2. [[10–20 min] Mental Model](#10-20-min-mental-model)
3. [[20–35 min] Core Patterns](#20-35-min-core-patterns)
4. [[35–45 min] Concrete Code + Dry Run](#35-45-min-concrete-code--dry-run)
5. [[45–55 min] Pattern Recognition](#45-55-min-pattern-recognition)
6. [[55–60 min] Final Mental Checklist](#55-60-min-final-mental-checklist)
7. [Active Recall Questions](#active-recall-questions)
8. [Recommended Practice Direction](#recommended-practice-direction)
9. [2-Minute Cheat Sheet](#2-minute-cheat-sheet)

---

## [0–10 min] Big Picture

### What Is an Interval Problem?

An interval problem gives you one or more ranges on a timeline (or number line) — think `[start, end]` — and asks you to do something with them: merge them, count how many overlap, find gaps, or check whether a new range fits without conflict.

**Real-world analogies:**

- **Calendar events:** You have meetings `[9:00, 10:00]`, `[9:30, 11:00]`, `[12:00, 13:00]`. Do any overlap? How many rooms do you need?
- **Time ranges on a streaming platform:** Users were active during `[0s, 30s]`, `[25s, 60s]`. What is the total watched time (no double-counting)?
- **Construction crew schedules:** Workers are busy during certain intervals. When are they ALL free?

### What Is Sweep Line?

A sweep line is a vertical line (or "cursor") that you mentally slide from left to right across a number line. As it crosses each event (a start or an end), you update a counter or state. At any point, you know exactly what is "active."

Think of it like a spotlight scanning a stage — when it hits someone walking on, they are active; when it hits someone walking off, they become inactive.

### What Problems Do They Solve?

| Real Problem | Interval Framing |
|---|---|
| "Can one person attend all meetings?" | Do any intervals overlap? |
| "How many conference rooms do we need?" | Max simultaneous active intervals |
| "What is the total time our server was busy?" | Union/merge of all intervals |
| "Find free time in everyone's calendars" | Gaps between merged intervals |
| "Can I book this meeting slot?" | Does new interval conflict with existing ones? |
| "What is the city skyline silhouette?" | Sweep line + max-height tracking |

**Key insight:** Almost every interval problem is solved by sorting + one linear scan. The only real decision is *what* to sort by and *what* to track during the scan.

---

## [10–20 min] Mental Model

### Intervals as [start, end] Pairs

Every interval is just two numbers: where it begins and where it ends.

```
Interval A: [1, 5]   ----AAAA----
Interval B: [3, 8]       ----BBBB----
Interval C: [9, 12]               ---CCC---

Number line:
0    1    2    3    4    5    6    7    8    9   10   11   12
     [====A=====]
               [========B========]
                                   [=====C======]
```

### Overlap Detection Intuition

Two intervals [a1, a2] and [b1, b2] **overlap** when neither one is completely to the left or right of the other.

They do NOT overlap if:
- A ends before B starts: `a2 <= b1`
- B ends before A starts: `b2 <= a1`

So they **DO** overlap if: `a1 < b2 AND b1 < a2`

Visually:

```
NO OVERLAP:
[===A===]            [===A===]
          [===B===]
                     [===B===]

OVERLAP (any of these):
[===A===]
    [===B===]

[===A=======]
    [===B===]

    [===A===]
[===B=======]
```

**The simplest overlap check in code:**
```
overlap = (A.start < B.end) && (B.start < A.end)
```

### Sorting: The Universal First Step

Before almost anything else, sort the intervals. The only question is: **sort by start time or end time?**

- **Sort by start time:** Merging, inserting, finding intersections, coverage
- **Sort by end time:** Keeping maximum non-overlapping intervals (greedy)

### Sweep Line: "Scan Left to Right, Track What's Active"

Convert each interval into two point events:
- At `start`: something begins (+1)
- At `end`: something ends (-1)

Sort all events by position. Walk through them left to right, maintaining a running count.

```
Intervals: [1,4], [2,6], [5,8]

Events sorted:
  pos=1 (+1)  --> count becomes 1
  pos=2 (+1)  --> count becomes 2
  pos=4 (-1)  --> count becomes 1
  pos=5 (+1)  --> count becomes 2
  pos=6 (-1)  --> count becomes 1
  pos=8 (-1)  --> count becomes 0

Max count seen = 2 (two intervals were active at the same time)
```

This "maximum count" directly answers: "What is the peak overlap / minimum rooms needed?"

---

## [20–35 min] Core Patterns

### Pattern 1: Merge Intervals

**Problem:** Given a list of intervals that may overlap, merge all overlapping ones and return a minimal list.

**When to use:**
- "Merge overlapping intervals"
- "Total coverage / union of intervals"
- "Employee free time" (merge all busy intervals, gaps = free time)
- Keywords: "merge," "overlapping intervals," "combine ranges"

**Algorithm:**
1. Sort by start time
2. Initialize result with the first interval
3. For each subsequent interval:
   - If `current.start <= result.last.end`: they overlap — extend: `result.last.end = max(result.last.end, current.end)`
   - Else: no overlap — append current to result

**Key trap:** Use `max(result.last.end, current.end)` — not just `current.end`. A previous interval might extend farther right.

**Edge case:** Touching intervals like `[1,3]` and `[3,5]` — whether they merge depends on the problem (inclusive vs. exclusive endpoints). Clarify with the interviewer.

```
Before sort: [3,6], [1,3], [2,6], [8,10], [9,11]
After sort:  [1,3], [2,6], [3,6], [8,10], [9,11]

Merge pass:
  Start with [1,3]
  [2,6]: 2 <= 3, merge -> [1,6]
  [3,6]: 3 <= 6, merge -> [1,6] (max(6,6)=6)
  [8,10]: 8 > 6, new interval -> result: [1,6], [8,10]
  [9,11]: 9 <= 10, merge -> [8,11]

Result: [1,6], [8,11]
```

**Complexity:** Time O(n log n), Space O(n)

---

### Pattern 2: Meeting Rooms / Minimum Rooms (Sweep Line)

**Meeting Rooms I — Can one person attend all meetings?**

Sort by start time. If any meeting starts before the previous one ends, there is a conflict.

**Meeting Rooms II — How many rooms do we need?**

This equals the maximum number of meetings happening simultaneously.

**Sweep Line Approach (preferred, generalizes broadly):**
1. Create events: `+1` at each start, `-1` at each end
2. Sort events by time. Tie-breaking: **process ends before starts** (free a room before needing a new one at the same instant)
3. Sweep left to right, track running count. Answer = max count seen.

**Min-Heap Approach (more intuitive for this problem):**
1. Sort meetings by start time
2. Use a min-heap of end times
3. For each meeting: if `meeting.start >= heap.min()`, reuse that room (pop + push new end). Else: new room (push new end)
4. `heap.size()` = rooms needed at the end

Both approaches are O(n log n). Know both — the sweep line generalizes, the heap is easier to explain step by step.

---

### Pattern 3: Insert Interval

**Problem:** Given a sorted list of non-overlapping intervals, insert a new interval and merge if needed.

**When to use:** When the input is already sorted and you need to slot in a new range.

**No sorting needed** — the input is already sorted.

**Three-phase algorithm:**
1. **Before:** Add all intervals that end BEFORE `new.start` — they are untouched
2. **Overlap:** Merge all intervals that overlap with new: `new.start = min(new.start, current.start)`, `new.end = max(new.end, current.end)`
3. **After:** Add all remaining intervals — they start after `new.end`

This clean three-phase approach avoids complex case analysis.

**Complexity:** Time O(n), Space O(n)

---

### Pattern 4: Non-Overlapping Intervals (Minimum Removal)

**Problem:** Remove the minimum number of intervals so the rest do not overlap.

**Equivalently:** Keep the *maximum* number of non-overlapping intervals. Answer = total - kept.

This is the classic Activity Selection problem.

**Algorithm:**
1. Sort by **END time** (not start)
2. Greedily select: pick the interval with the earliest end that does not conflict with the last picked
3. Count how many you kept; answer = total - kept

**Why sort by end?** An interval that ends earlier leaves the most room for future intervals. This greedy choice is provably optimal.

**Complexity:** Time O(n log n), Space O(1)

---

### Pattern 5: General Sweep Line

**The sweep line template:**

```
events = []
for each interval [s, e]:
    events.add((s, +1))
    events.add((e, -1))

sort events by position
  (tie-break depends on problem: usually ends before starts)

count = 0, maxCount = 0
for each (pos, delta) in events:
    count += delta
    maxCount = max(maxCount, count)

return maxCount
```

**Variants and what changes:**

| Problem | What you track | Tie-break rule |
|---|---|---|
| Meeting rooms | running count | ends before starts |
| Car pooling | running passenger count, check capacity | ends before starts |
| Skyline | max-heap of active heights | starts before ends |
| Rectangle area union | active x-intervals | depends |

**Recognizing sweep line:** "At any point, how many X are active?" or "What is the maximum overlap?" → reach for sweep line.

---

### Pattern 6: Interval Intersection (Two Pointer)

**Problem:** Given two sorted, non-overlapping interval lists A and B, find all pairs that intersect.

**Algorithm:**
1. Two pointers `i` on A, `j` on B
2. Compute candidate intersection: `lo = max(A[i].start, B[j].start)`, `hi = min(A[i].end, B[j].end)`
3. If `lo <= hi`: record `[lo, hi]`
4. Advance the pointer with the **smaller end time** (that interval is "used up")

**Complexity:** Time O(n + m), Space O(1) extra

---

## [35–45 min] Concrete Code + Dry Run

### Merge Intervals — Java

```java
public int[][] merge(int[][] intervals) {
    // Step 1: sort by start time
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);

    List<int[]> result = new ArrayList<>();
    result.add(intervals[0]);

    for (int i = 1; i < intervals.length; i++) {
        int[] last = result.get(result.size() - 1);
        int[] curr = intervals[i];

        if (curr[0] <= last[1]) {
            // Overlap: extend the end
            last[1] = Math.max(last[1], curr[1]);
        } else {
            // No overlap: start a new interval
            result.add(curr);
        }
    }

    return result.toArray(new int[result.size()][]);
}
```

### Merge Intervals — TypeScript

```typescript
function merge(intervals: number[][]): number[][] {
    intervals.sort((a, b) => a[0] - b[0]);

    const result: number[][] = [intervals[0]];

    for (let i = 1; i < intervals.length; i++) {
        const last = result[result.length - 1];
        const curr = intervals[i];

        if (curr[0] <= last[1]) {
            last[1] = Math.max(last[1], curr[1]);
        } else {
            result.push(curr);
        }
    }

    return result;
}
```

**Dry Run for Merge:**

```
Input: [[1,3],[2,6],[8,10],[15,18]]

After sort: [[1,3],[2,6],[8,10],[15,18]]  (already sorted)

Number line:
0    1    2    3    4    5    6    7    8    9   10   11  ... 15   16   17   18
     [==A==]
          [====B====]
                         [====C====]
                                               [======D======]

Step 1: result = [[1,3]]
Step 2: curr=[2,6], 2 <= 3 => overlap, extend: result = [[1,6]]
Step 3: curr=[8,10], 8 > 6 => new, result = [[1,6],[8,10]]
Step 4: curr=[15,18], 15 > 10 => new, result = [[1,6],[8,10],[15,18]]

Output: [[1,6],[8,10],[15,18]]
```

---

### Meeting Rooms II — Sweep Line — Java

```java
public int minMeetingRooms(int[][] intervals) {
    int n = intervals.length;
    int[] starts = new int[n];
    int[] ends   = new int[n];

    for (int i = 0; i < n; i++) {
        starts[i] = intervals[i][0];
        ends[i]   = intervals[i][1];
    }

    Arrays.sort(starts);
    Arrays.sort(ends);

    int rooms = 0, endPtr = 0;
    for (int i = 0; i < n; i++) {
        if (starts[i] < ends[endPtr]) {
            rooms++; // Need a new room
        } else {
            endPtr++; // Reuse a room (one ended)
        }
    }
    return rooms;
}
```

### Meeting Rooms II — Sweep Line — TypeScript

```typescript
function minMeetingRooms(intervals: number[][]): number {
    const starts = intervals.map(i => i[0]).sort((a, b) => a - b);
    const ends   = intervals.map(i => i[1]).sort((a, b) => a - b);

    let rooms = 0, endPtr = 0;
    for (let i = 0; i < intervals.length; i++) {
        if (starts[i] < ends[endPtr]) {
            rooms++;
        } else {
            endPtr++;
        }
    }
    return rooms;
}
```

**Dry Run for Meeting Rooms II:**

```
Input: [[0,30],[5,10],[15,20]]

Timeline:
0    5    10   15   20   25   30
[==========A====================]
     [==B==]
               [==C==]

starts sorted: [0,  5, 15]
ends   sorted: [10, 20, 30]

i=0: starts[0]=0  < ends[0]=10  → need new room, rooms=1
i=1: starts[1]=5  < ends[0]=10  → need new room, rooms=2
i=2: starts[2]=15 >= ends[0]=10 → reuse a room, endPtr=1, rooms stays 2

Answer: 2 rooms needed
```

---

### Insert Interval — Java

```java
public int[][] insert(int[][] intervals, int[] newInterval) {
    List<int[]> result = new ArrayList<>();
    int i = 0, n = intervals.length;

    // Phase 1: all intervals ending before newInterval starts
    while (i < n && intervals[i][1] < newInterval[0]) {
        result.add(intervals[i++]);
    }

    // Phase 2: merge all overlapping intervals
    while (i < n && intervals[i][0] <= newInterval[1]) {
        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
        i++;
    }
    result.add(newInterval);

    // Phase 3: all intervals starting after newInterval ends
    while (i < n) {
        result.add(intervals[i++]);
    }

    return result.toArray(new int[result.size()][]);
}
```

### Insert Interval — TypeScript

```typescript
function insert(intervals: number[][], newInterval: number[]): number[][] {
    const result: number[][] = [];
    let i = 0;

    // Phase 1: before
    while (i < intervals.length && intervals[i][1] < newInterval[0]) {
        result.push(intervals[i++]);
    }

    // Phase 2: merge overlaps
    while (i < intervals.length && intervals[i][0] <= newInterval[1]) {
        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
        i++;
    }
    result.push(newInterval);

    // Phase 3: after
    while (i < intervals.length) {
        result.push(intervals[i++]);
    }

    return result;
}
```

**Dry Run for Insert Interval:**

```
Input: intervals=[[1,3],[6,9]], newInterval=[2,5]

Number line:
0    1    2    3    4    5    6    7    8    9
     [==A==]
          [=====NEW=====]
                         [====B====]

Phase 1: intervals[0]=[1,3], 3 < 2? No. Stop.
Phase 2: intervals[0]=[1,3], 1 <= 5? Yes.
           newInterval = [min(2,1), max(5,3)] = [1,5]
         intervals[1]=[6,9], 6 <= 5? No. Stop.
         Push newInterval [1,5] to result.
Phase 3: Push [6,9]

Result: [[1,5],[6,9]]
```

---

## [45–55 min] Pattern Recognition

### Signal → Strategy Map

| Signal in the Problem | Strategy |
|---|---|
| "Overlapping intervals", "merge" | Sort by start, scan and merge |
| "Minimum rooms", "concurrent events", "max overlap" | Sweep line (+1/-1) or min-heap |
| "Insert a new interval" (already sorted input) | Three-phase: before / merge / after |
| "Maximum non-overlapping", "minimum removal" | Sort by END, greedy |
| "Intersection of two interval lists" | Two pointers, advance smaller end |
| "Free time", "gaps" | Merge all, then find gaps |
| "Skyline", "rectangle area" | Sweep line + max-heap (Advanced) |
| "Calendar booking", "no double booking" | Sorted structure + binary search |

### Overlap Check Reference

```
A overlaps B:    A.start < B.end  AND  B.start < A.end
A touches B:     A.end == B.start  (may or may not "overlap" — clarify)
A contains B:    A.start <= B.start AND B.end <= A.end
A is before B:   A.end <= B.start
```

### When Sorting + Greedy Is Enough

Sorting + a single greedy scan works when:
- You merge based only on adjacent (after sorting) pairs
- The optimal local choice (pick earliest end, extend furthest) is globally optimal
- No backtracking or range-query is needed

### When You Need More

- **Max-heap / min-heap:** When you need to track the "next thing to finish" (meeting rooms with heap)
- **Sorted set / TreeMap:** When you dynamically add/remove intervals and need O(log n) lookup (My Calendar, Range Module)
- **Segment tree:** When you query "is point X covered?" over a range that changes frequently in O(log n) (Range Module advanced version)

### Common Sorting Pitfalls

1. **Sort by start but forget max-end during merge.** `last.end = max(last.end, curr.end)` — not just `curr.end`
2. **Wrong sort key.** Merge/insert → start. Activity selection/min-removal → end. Mixing these up gives wrong answers.
3. **Tie-breaking in sweep line.** At the same position, should ends or starts come first? For meeting rooms: end before start (free room before needing it). For half-open intervals `[s, e)`: careful with boundary conditions.
4. **Inclusive vs. exclusive endpoints.** `[1,3]` and `[3,5]` — do they overlap? Ask.

---

## [55–60 min] Final Mental Checklist

When you see an interval problem in a Google interview, run through this checklist in under 30 seconds:

```
[ ] Are inputs sorted? If not, sort first.
    --> Sort by START for merge/insert/intersection
    --> Sort by END for max-non-overlapping/min-removal

[ ] Am I merging?
    --> Sort by start, scan with: if curr.start <= last.end -> merge (max end)

[ ] Am I counting max overlaps / min rooms?
    --> Sweep line: +1 at start, -1 at end, sort events, scan for max count

[ ] Am I inserting into sorted intervals?
    --> Three-phase: before / merge overlapping / after

[ ] Am I intersecting two sorted lists?
    --> Two pointers: record if lo <= hi, advance smaller end

[ ] Am I maximizing non-overlapping count?
    --> Sort by end, greedy pick, answer = total - picked

[ ] Am I doing something dynamic (add/remove/query)?
    --> TreeMap / sorted set + binary search
```

**The one sentence that covers 90% of interval problems:**

> Sort by start time, then scan left to right — if the current interval overlaps the last one, merge (extend end); otherwise, keep it as a new interval.

---

## Advanced Awareness

These topics come up at Google L5+ / hard LeetCode. You do not need to master them in this session, but know they exist:

- **Skyline Problem:** Sweep line + max-heap of active building heights. Key point is added when the max height changes. One of the most complex classical problems.
- **Rectangle Area Union (2D sweep):** Sweep a horizontal line. At each y-event, compute the union length of active x-intervals using a segment tree.
- **Range Module / My Calendar series:** Dynamic interval management with `addRange`, `removeRange`, `queryRange`. Backed by a sorted set of disjoint intervals.
- **Car Pooling:** Sweep line over pickup/dropoff locations, check if running passenger count ever exceeds capacity.
- **My Calendar II / III:** Escalating versions — allow single overlap, reject triple; count max concurrent bookings.

---

## Active Recall Questions

Test yourself without looking at the notes:

1. Two intervals `[a1, a2]` and `[b1, b2]` overlap. Write the boolean condition in one line.
2. In the Merge Intervals algorithm, why do you use `max(last.end, curr.end)` instead of just `curr.end`?
3. What is the sort key difference between "merge intervals" and "remove minimum intervals"?
4. Describe the three phases of the Insert Interval algorithm.
5. In the sweep line for Meeting Rooms II, when there is a tie (a meeting ends and another starts at the same time), which event do you process first? Why?
6. In the interval intersection (two pointer) problem, after checking if the two intervals intersect, which pointer do you advance? Why?
7. You are given `n` intervals. You want to find the point on the number line that is covered by the most intervals. What algorithm do you use?
8. What data structure would you use if intervals are dynamically added and removed and you need O(log n) queries?
9. Without sorting — given a new interval and a sorted list — how many passes through the list does the Insert Interval algorithm require?
10. You want to keep the maximum number of non-overlapping intervals. Should you sort by start time or end time, and why?

---

## Recommended Practice Direction

**Start here (core):**
1. LeetCode 56 — Merge Intervals
2. LeetCode 57 — Insert Interval
3. LeetCode 252 — Meeting Rooms
4. LeetCode 253 — Meeting Rooms II
5. LeetCode 435 — Non-overlapping Intervals

**Then level up:**
6. LeetCode 986 — Interval List Intersections
7. LeetCode 1851 — Minimum Interval to Include Each Query
8. LeetCode 759 — Employee Free Time
9. LeetCode 1094 — Car Pooling

**Advanced (awareness):**
10. LeetCode 218 — The Skyline Problem
11. LeetCode 731 — My Calendar II
12. LeetCode 732 — My Calendar III
13. LeetCode 715 — Range Module

**Suggested order:** Do 56, 253, 57 in one sitting. They cover merge, sweep line, and insert — the three most common Google patterns.

---

## 2-Minute Cheat Sheet

```
SORT KEY
  Sort by START  -->  merge, insert, intersection
  Sort by END    -->  max non-overlapping, min removal

MERGE INTERVALS
  sort by start
  if curr.start <= last.end:  last.end = max(last.end, curr.end)
  else:  append curr

INSERT INTERVAL (already sorted input)
  Phase 1: while interval.end < new.start  -->  add as-is
  Phase 2: while interval.start <= new.end  -->  merge into new
  Phase 3: add remaining

SWEEP LINE (min rooms / max overlap)
  +1 at start, -1 at end
  sort (tie: end before start)
  scan, track running count, return max

INTERVAL INTERSECTION (two sorted lists)
  lo = max(A[i].start, B[j].start)
  hi = min(A[i].end,   B[j].end)
  if lo <= hi: record [lo, hi]
  advance pointer with smaller end

OVERLAP CHECK
  overlap: A.start < B.end AND B.start < A.end
  no overlap: A.end <= B.start OR B.end <= A.start

COMPLEXITY
  Most interval problems: O(n log n) time, O(n) space
```

---

*Next: [19-DESIGN-PATTERNS-AND-META.md](19-DESIGN-PATTERNS-AND-META.md) — The patterns that don't fit neatly into one category.*
