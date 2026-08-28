# Interval and Sweep Line

> **6 algorithms covered:** Merge Intervals · Insert Interval · Non-Overlapping Intervals (Minimum Removal) · Meeting Rooms II (Minimum Rooms) · Minimum Arrows to Burst Balloons · Sweep Line for Counting Overlaps

> "An interval is a range represented as [start, end]. Almost every interval problem reduces to: sort them, then scan left to right."

---

## Table of Contents

1. [Merge Intervals](#merge-intervals)
2. [Insert Interval](#insert-interval)
3. [Non-Overlapping Intervals (Minimum Removal)](#non-overlapping-intervals-minimum-removal)
4. [Meeting Rooms II (Minimum Rooms)](#meeting-rooms-ii-minimum-rooms)
5. [Minimum Arrows to Burst Balloons](#minimum-arrows-to-burst-balloons)
6. [Sweep Line for Counting Overlaps](#sweep-line-for-counting-overlaps)
7. [Range Module (Dynamic Interval Coverage)](#range-module-dynamic-interval-coverage)

---

## Merge Intervals

### What is it?
You are given a list of intervals — each interval is a range represented as [start, end] — that may overlap each other. Your job is to combine all overlapping intervals into the smallest possible list of non-overlapping intervals. Think of it as "flattening" a messy schedule into clean, non-repeating time blocks.

### Visual
```
Input intervals (unsorted):
[1,3]   [----]
[2,6]      [--------]
[8,10]                  [----]
[15,18]                            [------]

After sorting by start:
1    2    3    4    5    6    7    8    9   10   11  ...  15   16   17   18
[====A====]
     [=========B=========]
                              [====C====]
                                                   [=========D=========]

[1,3] and [2,6] overlap (2 <= 3), merge to [1,6]
[1,6] and [8,10] do NOT overlap (8 > 6), keep separate
[8,10] and [15,18] do NOT overlap (15 > 10), keep separate

Output: [1,6], [8,10], [15,18]
```

### How does it work?
1. Sort all intervals by their start value (smallest start first).
2. Create a result list and put the first interval in it.
3. For each remaining interval (left to right):
4. Look at the last interval in your result list.
5. If the current interval's start is less than or equal to the last interval's end, they overlap — extend the last interval's end to `max(last.end, current.end)`.
6. If there is no overlap, just append the current interval to the result list.
7. Return the result list.

### Why does it work?
Once you sort by start, any interval that overlaps the previous one must start at or before the previous one ends — so you only ever need to compare against the last interval in your result. The `max` on the end handles the case where one interval is completely swallowed inside another.

### When to use?
- Problem says "merge overlapping intervals" or "return non-overlapping ranges."
- You need to find the total covered length (union of all intervals).
- You need to find gaps or free time: first merge, then look between merged intervals.
- Keywords: "combine," "merge," "overlapping," "union of ranges."

### When NOT to use?
- You need to insert a new interval into an already-sorted list — use Insert Interval (three-phase approach, no re-sorting needed).
- You need to count the maximum overlap at any point — use Sweep Line.

### How to recognize in a new problem?
Ask: "Am I being given a messy list of ranges and need to clean them up into non-overlapping blocks?" If yes, Merge Intervals. Concrete signals:
- "Given a collection of intervals, merge all overlapping intervals."
- "Find the total time a server was busy" (merge the busy windows, sum lengths).
- "Find free time in a calendar" (merge busy intervals, then find gaps).

### Simple Example
Input: `[[1,3],[2,6],[8,10],[15,18]]`
Expected output: `[[1,6],[8,10],[15,18]]`

```
Number line trace (sorted already):
[1,3] → result: [[1,3]]
[2,6] → 2 <= 3, overlap! extend end: result: [[1,6]]
[8,10] → 8 > 6, no overlap. result: [[1,6],[8,10]]
[15,18] → 15 > 10, no overlap. result: [[1,6],[8,10],[15,18]]
```

### Code
```java
// Java
public int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]); // sort by start

    List<int[]> result = new ArrayList<>();
    result.add(intervals[0]);

    for (int i = 1; i < intervals.length; i++) {
        int[] last = result.get(result.size() - 1);
        int[] curr = intervals[i];

        if (curr[0] <= last[1]) {
            // overlap: extend the end of the last interval
            last[1] = Math.max(last[1], curr[1]);
        } else {
            // no overlap: add as a new interval
            result.add(curr);
        }
    }

    return result.toArray(new int[result.size()][]);
}
```

```javascript
// JavaScript
function merge(intervals) {
    intervals.sort((a, b) => a[0] - b[0]); // sort by start

    const result = [intervals[0]];

    for (let i = 1; i < intervals.length; i++) {
        const last = result[result.length - 1];
        const curr = intervals[i];

        if (curr[0] <= last[1]) {
            // overlap: stretch end if needed
            last[1] = Math.max(last[1], curr[1]);
        } else {
            // no overlap: push as new entry
            result.push(curr);
        }
    }

    return result;
}
```

### Dry Run
```
Input: [[3,6],[1,3],[2,6],[8,10],[9,11]]

Step 0 — Sort by start:
  [[1,3],[2,6],[3,6],[8,10],[9,11]]

Step 1 — Initialize result with first interval:
  result = [[1,3]]

Step 2 — curr=[2,6]: 2 <= 3? YES → merge. end = max(3,6) = 6
  result = [[1,6]]

Step 3 — curr=[3,6]: 3 <= 6? YES → merge. end = max(6,6) = 6
  result = [[1,6]]

Step 4 — curr=[8,10]: 8 <= 6? NO → new interval
  result = [[1,6],[8,10]]

Step 5 — curr=[9,11]: 9 <= 10? YES → merge. end = max(10,11) = 11
  result = [[1,6],[8,11]]

Final output: [[1,6],[8,11]]
```

### Complexity
```
Time:  O(n log n) — sorting dominates; the scan after is O(n)
Space: O(n)       — result list holds up to n merged intervals
```

### Common Trap
1. Using `last[1] = curr[1]` instead of `last[1] = Math.max(last[1], curr[1])`. If a previous interval completely contains the current one (e.g., [1,10] and [2,5]), you would wrongly shrink the end to 5.
2. Forgetting to handle the single-element input case — always check `intervals.length == 0` or initialize result with `intervals[0]`.

### Experience Tip
**Experience Tip:** Sort by start, then it becomes a simple "can I extend the last block?" loop. The only gotcha is the `max` on the end. If you remember nothing else, remember: sort by start, extend with max.

### Do Not Confuse With
- **Insert Interval (LC 57):** Input is already sorted and non-overlapping. You add one new interval and merge. No re-sorting. Three distinct phases.
- **Non-overlapping Intervals (LC 435):** You want to REMOVE the minimum number of intervals so nothing overlaps. Sort by END, not start.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 56 | Merge Intervals | Medium | Sort by start, extend end with max | https://leetcode.com/problems/merge-intervals/ |
| 986 | Interval List Intersections | Medium | Two sorted lists, advance the pointer with the smaller end | https://leetcode.com/problems/interval-list-intersections/ |
| 759 | Employee Free Time | Hard (premium) | Merge all busy intervals across all employees, then find gaps | https://leetcode.com/problems/employee-free-time/ |
| 1094 | Car Pooling | Medium | Treat pickup as +passengers, dropoff as -passengers, sweep | https://leetcode.com/problems/car-pooling/ |
| 763 | Partition Labels | Medium | Find the last occurrence of each char, merge those ranges | https://leetcode.com/problems/partition-labels/ |

### One-Minute Revision
```
PATTERN:          Merge Intervals
IN SIMPLE WORDS:  Combine all overlapping [start,end] ranges into one
OVERLAP CONDITION: curr.start <= last.end
SORT BY:          start (ascending)
USE WHEN:         "merge overlapping," "union of intervals," "total coverage," "find free time"
DON'T USE WHEN:   Input already sorted + inserting one interval (use Insert Interval)
TIME:             O(n log n)
SPACE:            O(n)
COMMON TRAP:      Use max(last.end, curr.end), not just curr.end
EXPERIENCE TIP:   Sort by start, extend with max — that's the whole algorithm
```

---

## Insert Interval

### What is it?
You are given a list of non-overlapping intervals — each is a range represented as [start, end] — already sorted by start. You need to insert one new interval and merge any overlaps that result. Because the input is already sorted, you do NOT sort again — you just do three phases in one pass.

### Visual
```
Existing intervals (sorted, non-overlapping):
[1,3]  [----]
[6,9]           [------]

New interval to insert: [2,5]
     [-------]

1    2    3    4    5    6    7    8    9
[====A====]
     [=====NEW=====]
                    [=======B=======]

A and NEW overlap (2 <= 3). Merge to [1,5].
NEW-merged and B do NOT overlap (6 > 5). Keep B.

Output: [1,5],[6,9]
```

### How does it work?
1. Walk through the existing intervals from left to right.
2. **Phase 1 — Before:** While the current interval ends before the new interval starts (`curr.end < new.start`), it has no overlap — add it to result unchanged.
3. **Phase 2 — Merge:** While the current interval starts before or at the new interval's end (`curr.start <= new.end`), they overlap — expand new interval: `new.start = min(new.start, curr.start)`, `new.end = max(new.end, curr.end)`.
4. After the merge loop, add the (now expanded) new interval to result.
5. **Phase 3 — After:** Add all remaining intervals unchanged.

### Why does it work?
The input is sorted, so all intervals that could possibly overlap with the new interval form one contiguous block. Everything before that block is untouched. Everything after is untouched. You only need to expand the new interval to absorb the overlapping ones.

### When to use?
- Input is already sorted and non-overlapping.
- You are inserting exactly one new interval and must merge.
- Keywords: "insert interval," "add a meeting to a sorted calendar."

### When NOT to use?
- Input is unsorted or you have many new intervals to insert — use Merge Intervals with re-sorting.

### How to recognize in a new problem?
Ask: "Is the input list already sorted and clean, and am I adding exactly one new range?" Concrete signals:
- "Given sorted non-overlapping intervals and a new interval, insert and merge."
- "Add a booking to a calendar that is already conflict-free."

### Simple Example
Input: `intervals = [[1,3],[6,9]]`, `newInterval = [2,5]`
Expected output: `[[1,5],[6,9]]`

```
Phase 1: [1,3] — does 3 < 2? NO. Stop.
Phase 2: [1,3] — does 1 <= 5? YES. Expand: new = [min(2,1), max(5,3)] = [1,5]
         [6,9] — does 6 <= 5? NO. Stop. Add [1,5] to result.
Phase 3: Add [6,9]

Result: [[1,5],[6,9]]
```

### Code
```java
// Java
public int[][] insert(int[][] intervals, int[] newInterval) {
    List<int[]> result = new ArrayList<>();
    int i = 0;
    int n = intervals.length;

    // Phase 1: intervals that end before newInterval starts — no overlap
    while (i < n && intervals[i][1] < newInterval[0]) {
        result.add(intervals[i++]);
    }

    // Phase 2: merge all overlapping intervals into newInterval
    while (i < n && intervals[i][0] <= newInterval[1]) {
        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
        i++;
    }
    result.add(newInterval); // add the merged interval

    // Phase 3: intervals that start after newInterval ends — no overlap
    while (i < n) {
        result.add(intervals[i++]);
    }

    return result.toArray(new int[result.size()][]);
}
```

```javascript
// JavaScript
function insert(intervals, newInterval) {
    const result = [];
    let i = 0;

    // Phase 1: before — no overlap
    while (i < intervals.length && intervals[i][1] < newInterval[0]) {
        result.push(intervals[i++]);
    }

    // Phase 2: overlap — absorb into newInterval
    while (i < intervals.length && intervals[i][0] <= newInterval[1]) {
        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
        i++;
    }
    result.push(newInterval);

    // Phase 3: after — no overlap
    while (i < intervals.length) {
        result.push(intervals[i++]);
    }

    return result;
}
```

### Dry Run
```
Input: intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]

Number line:
1  2  3  4  5  6  7  8  9 10 11 12 ... 16
[A]  [==B==] [C] [===D===]    [====E====]
         [========NEW========]

Phase 1 — find intervals ending before 4:
  [1,2]: 2 < 4? YES → add to result. result = [[1,2]]
  [3,5]: 5 < 4? NO  → stop.

Phase 2 — merge overlapping intervals (start <= 8):
  [3,5]: 3 <= 8? YES → new = [min(4,3), max(8,5)] = [3,8]
  [6,7]: 6 <= 8? YES → new = [min(3,6), max(8,7)] = [3,8]
  [8,10]: 8 <= 8? YES → new = [min(3,8), max(8,10)] = [3,10]
  [12,16]: 12 <= 8? NO → stop.
  Add [3,10] to result. result = [[1,2],[3,10]]

Phase 3 — remaining intervals:
  Add [12,16]. result = [[1,2],[3,10],[12,16]]

Output: [[1,2],[3,10],[12,16]]
```

### Complexity
```
Time:  O(n) — single left-to-right pass (no sorting needed)
Space: O(n) — result list
```

### Common Trap
1. Phase boundary condition: Phase 1 ends when `curr.end < new.start`. Phase 2 ends when `curr.start > new.end`. Getting the `<` vs `<=` wrong causes missed merges or wrong splits.
2. Forgetting to `result.add(newInterval)` between Phase 2 and Phase 3 — the merged new interval must be explicitly added.

### Experience Tip
**Experience Tip:** Think of it as three zones on a sorted number line: left of new, overlapping with new, right of new. Walk through once and handle each zone. The three while-loops map directly to those three zones.

### Do Not Confuse With
- **Merge Intervals (LC 56):** Input is unsorted and you merge everything. Sort first, then scan.
- **Non-overlapping Intervals (LC 435):** You REMOVE intervals to eliminate overlap; sort by end.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 57 | Insert Interval | Medium | Three phases: before / overlap / after | https://leetcode.com/problems/insert-interval/ |
| 56 | Merge Intervals | Medium | Do this first to understand overlap merging | https://leetcode.com/problems/merge-intervals/ |
| 986 | Interval List Intersections | Medium | Two sorted lists intersecting; similar three-zone thinking | https://leetcode.com/problems/interval-list-intersections/ |

### One-Minute Revision
```
PATTERN:          Insert Interval
IN SIMPLE WORDS:  Slot a new [start,end] into a sorted list, merging overlaps
OVERLAP CONDITION: curr.start <= new.end AND curr.end >= new.start
SORT BY:          No sorting — input is already sorted
USE WHEN:         Sorted non-overlapping input, inserting exactly one new interval
DON'T USE WHEN:   Input is unsorted or multiple new intervals (use Merge Intervals)
TIME:             O(n)
SPACE:            O(n)
COMMON TRAP:      Forgetting to add newInterval to result after Phase 2
EXPERIENCE TIP:   Three while-loops: before / overlap / after — clean and direct
```

---

## Non-Overlapping Intervals (Minimum Removal)

### What is it?
You are given a list of intervals — each is a range represented as [start, end] — and you need to find the minimum number of intervals to remove so that the remaining intervals do not overlap at all. This is the classic Activity Selection problem in disguise: instead of counting removals, think of it as keeping the maximum number of non-overlapping intervals.

### Visual
```
Input:
[1,2]  [-]
[2,3]     [-]
[3,4]        [-]
[1,3]  [---]

1    2    3    4
[=A=]
     [=B=]
          [=C=]
[===D===]

Sorted by END: [1,2], [1,3], [2,3], [3,4]

Greedy: pick [1,2] (ends earliest).
        [1,3] overlaps [1,2] → REMOVE.
        [2,3] overlaps [1,2] → REMOVE.
        [3,4] does NOT overlap [1,2] → KEEP.

Kept: 2 intervals. Removed: 2. But wait —

Correct greedy trace (sort by end):
  [1,2]: keep. lastEnd = 2
  [1,3]: starts 1 < 2 (overlap) → remove. count++
  [2,3]: starts 2 >= 2 (no overlap) → keep. lastEnd = 3
  [3,4]: starts 3 >= 3 (no overlap) → keep. lastEnd = 4

Removed: 1. Output: 1
```

### How does it work?
1. Sort all intervals by their **end value** (earliest end first).
2. Initialize `lastEnd = -infinity` and `removed = 0`.
3. For each interval (left to right after sorting):
4. If `interval.start >= lastEnd`: no overlap — keep this interval, update `lastEnd = interval.end`.
5. If `interval.start < lastEnd`: overlap — remove this interval (increment `removed`). Do NOT update lastEnd (the kept interval still ends at lastEnd).
6. Return `removed`.

### Why does it work?
Sorting by end and greedily keeping the interval with the earliest end leaves the most room on the right for future intervals. This is provably optimal — any other choice keeps fewer intervals total.

### When to use?
- "Minimum number of intervals to remove to make the rest non-overlapping."
- "Maximum number of non-overlapping intervals you can keep" (answer = total - removed).
- Keywords: "non-overlapping," "minimum removal," "activity selection."
- You can keep at most k non-overlapping intervals.

### When NOT to use?
- You want to merge intervals (keep all, combine overlapping ones) — use Merge Intervals.
- You need minimum rooms/arrows — different greedy formulation.

### How to recognize in a new problem?
Ask: "Am I trying to select the most events that don't conflict?" Concrete signals:
- "Remove the fewest intervals so none overlap."
- "Schedule the most tasks given their time windows."
- "Each task has a deadline — maximize completed tasks."

### Simple Example
Input: `[[1,2],[2,3],[3,4],[1,3]]`
Expected output: `1` (remove `[1,3]`)

```
Sort by end: [1,2], [1,3], [2,3], [3,4]

lastEnd = -inf, removed = 0

[1,2]: start=1 >= -inf → KEEP. lastEnd = 2
[1,3]: start=1 < 2    → REMOVE. removed = 1
[2,3]: start=2 >= 2   → KEEP. lastEnd = 3
[3,4]: start=3 >= 3   → KEEP. lastEnd = 4

Output: 1
```

### Code
```java
// Java
public int eraseOverlapIntervals(int[][] intervals) {
    // Sort by end time — greedy activity selection
    Arrays.sort(intervals, (a, b) -> a[1] - b[1]);

    int removed = 0;
    int lastEnd = Integer.MIN_VALUE;

    for (int[] interval : intervals) {
        if (interval[0] >= lastEnd) {
            // No overlap with last kept interval — keep it
            lastEnd = interval[1];
        } else {
            // Overlap — remove this interval
            removed++;
        }
    }

    return removed;
}
```

```javascript
// JavaScript
function eraseOverlapIntervals(intervals) {
    // Sort by end time
    intervals.sort((a, b) => a[1] - b[1]);

    let removed = 0;
    let lastEnd = -Infinity;

    for (const [start, end] of intervals) {
        if (start >= lastEnd) {
            // No overlap — keep this interval
            lastEnd = end;
        } else {
            // Overlap — remove
            removed++;
        }
    }

    return removed;
}
```

### Dry Run
```
Input: [[1,100],[11,22],[1,11],[2,12]]

Sort by END: [1,11], [2,12], [11,22], [1,100]

1    2   11  12   22                     100
[=============A=================================]
[====B====]
     [=====C=====]
          [=========D=========]

lastEnd = -inf, removed = 0

[1,11]:   start=1  >= -inf → KEEP.  lastEnd = 11
[2,12]:   start=2  < 11   → REMOVE. removed = 1
[11,22]:  start=11 >= 11  → KEEP.  lastEnd = 22
[1,100]:  start=1  < 22   → REMOVE. removed = 2

Output: 2
```

### Complexity
```
Time:  O(n log n) — sorting dominates
Space: O(1)       — only tracking lastEnd and removed count
```

### Common Trap
1. **Sorting by START instead of END.** This is the single most common mistake. Sorting by end is what makes the greedy choice work. Sorting by start gives wrong answers.
2. Overlap condition when `start == lastEnd`: intervals `[1,3]` and `[3,5]` — if start equals end, they are touching but NOT overlapping (use `>=`, not `>`).

### Experience Tip
**Experience Tip:** "Sort by end for activity selection" is one of the most well-known greedy rules in competitive programming. The intuition: finish earliest, leave most room. Tattoo it to memory before your interview.

### Do Not Confuse With
- **Merge Intervals (LC 56):** You keep all intervals and merge overlapping ones. No removal.
- **Minimum Arrows to Burst Balloons (LC 452):** Very similar greedy, but you count "groups," not removals. Sort by end, count arrows needed.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 435 | Non-overlapping Intervals | Medium | Sort by end, greedy keep | https://leetcode.com/problems/non-overlapping-intervals/ |
| 452 | Minimum Number of Arrows to Burst Balloons | Medium | Same sort-by-end greedy; count groups instead of removals | https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/ |
| 56 | Merge Intervals | Medium | Contrast: sort by start, keep all | https://leetcode.com/problems/merge-intervals/ |
| 763 | Partition Labels | Medium | Find max reach, extend greedily — same flavor | https://leetcode.com/problems/partition-labels/ |

### One-Minute Revision
```
PATTERN:          Non-Overlapping Intervals (Minimum Removal)
IN SIMPLE WORDS:  Remove fewest [start,end] so none overlap
OVERLAP CONDITION: curr.start < lastEnd  (strictly less)
SORT BY:          end (ascending) — THIS IS THE KEY
USE WHEN:         "minimum removal," "maximum non-overlapping," "activity selection"
DON'T USE WHEN:   Want to merge (not remove) overlapping intervals
TIME:             O(n log n)
SPACE:            O(1)
COMMON TRAP:      Sorting by start instead of end — completely wrong greedy
EXPERIENCE TIP:   Sort by end = "finish early, leave room" = classic greedy
```

---

## Meeting Rooms II (Minimum Rooms)

### What is it?
You are given a list of meetings, each represented as an interval [start, end]. You need to find the minimum number of conference rooms required to hold all meetings simultaneously. This equals the maximum number of meetings that overlap at any single point in time. Use a min-heap to efficiently track when rooms become free.

### Visual
```
Meetings:
[0,30]  [==============================]
[5,10]       [=====]
[15,20]               [=====]

0    5   10   15   20   25   30
[============A====================]
     [==B==]
               [==C==]

At time 0: A starts.  Active: {A}      → 1 room
At time 5: B starts.  Active: {A,B}    → 2 rooms  ← PEAK
At time 10: B ends.   Active: {A}      → 1 room
At time 15: C starts. Active: {A,C}    → 2 rooms
At time 20: C ends.   Active: {A}      → 1 room
At time 30: A ends.   Active: {}       → 0 rooms

Answer: 2 (peak simultaneous meetings)
```

### How does it work?
1. Sort meetings by **start time**.
2. Use a min-heap that stores the **end times** of currently-running meetings (the heap top = the meeting ending soonest).
3. For each meeting (in sorted order):
4. If the heap is not empty and the top of the heap (earliest ending meeting) ends at or before this meeting's start, pop it — that room is free, reuse it.
5. Push the current meeting's end time onto the heap (assign it a room).
6. After processing all meetings, the heap size equals the number of rooms in use = answer.

### Why does it work?
The heap always tells you the soonest a room becomes free. If a room is free by the time the next meeting starts, reuse it. Otherwise open a new room. Heap size at the end = peak rooms used = minimum rooms needed.

### When to use?
- "Minimum conference rooms / resources needed."
- "Maximum meetings active at the same time."
- "How many workers needed to handle all tasks simultaneously?"
- Any "peak simultaneous resources" question.

### When NOT to use?
- You only need to check if one person can attend ALL meetings (no overlap check) — sort by start, check consecutive pairs. No heap needed.

### How to recognize in a new problem?
Ask: "What is the most X happening at the same time?" Concrete signals:
- "How many rooms do we need?"
- "Maximum simultaneous connections."
- "Minimum platforms needed at a train station."

### Simple Example
Input: `[[0,30],[5,10],[15,20]]`
Expected output: `2`

```
Sort by start: [0,30], [5,10], [15,20]
Heap (min-heap of end times): []

[0,30]:  heap empty → push 30.    heap = [30]       rooms needed: 1
[5,10]:  heap top = 30; 5 < 30 → can't reuse. push 10. heap = [10,30]  rooms: 2
[15,20]: heap top = 10; 15 >= 10 → reuse! pop 10. push 20. heap = [20,30] rooms: 2

Heap size = 2. Output: 2
```

### Code
```java
// Java
public int minMeetingRooms(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]); // sort by start

    // min-heap: tracks end times of active meetings
    PriorityQueue<Integer> minHeap = new PriorityQueue<>();

    for (int[] meeting : intervals) {
        // If a room is free (earliest end <= this meeting's start), reuse it
        if (!minHeap.isEmpty() && minHeap.peek() <= meeting[0]) {
            minHeap.poll();
        }
        // Assign this meeting to a room (track when it ends)
        minHeap.offer(meeting[1]);
    }

    return minHeap.size(); // number of rooms in use = answer
}
```

```javascript
// JavaScript
// Note: JavaScript has no built-in min-heap. Using a sorted array for clarity.
// In interviews, explain you would use a priority queue.
function minMeetingRooms(intervals) {
    intervals.sort((a, b) => a[0] - b[0]); // sort by start

    const endTimes = []; // simulates min-heap (kept sorted for clarity)

    for (const [start, end] of intervals) {
        // Find the smallest end time that is <= start
        const idx = endTimes.findIndex(e => e <= start);
        if (idx !== -1) {
            endTimes.splice(idx, 1); // reuse that room
        }
        endTimes.push(end);
        endTimes.sort((a, b) => a - b);
    }

    return endTimes.length;
}
```

### Dry Run
```
Input: [[9,10],[4,9],[4,17]]

Sort by start: [[4,9],[4,17],[9,10]]

Heap = [] (min-heap of end times)

Meeting [4,9]:
  Heap empty → no room to reuse.
  Push 9. heap = [9]
  Rooms used: 1

Meeting [4,17]:
  Heap top = 9. Does 9 <= 4? NO (meeting starts at 4, room free at 9).
  Can't reuse. Push 17. heap = [9, 17]
  Rooms used: 2

Meeting [9,10]:
  Heap top = 9. Does 9 <= 9? YES → reuse that room. Pop 9.
  Push 10. heap = [10, 17]
  Rooms used: 2

Heap size = 2. Output: 2
```

### Complexity
```
Time:  O(n log n) — sorting is O(n log n); each heap push/pop is O(log n), done n times
Space: O(n)       — heap can hold up to n end times in worst case
```

### Common Trap
1. Using `<` instead of `<=` when checking if a room is free: `heap.peek() <= meeting.start` means the previous meeting ended exactly when this one starts — that room IS free (assuming non-overlapping endpoints).
2. Returning `heap.peek()` instead of `heap.size()` — you want the total rooms used, not the earliest end time.

### Experience Tip
**Experience Tip:** The heap always contains the end times of currently-occupied rooms. Its size IS the answer. Visualize it as a list of "when does each room next become free?" — if the smallest value is <= the next meeting's start, recycle that room.

### Do Not Confuse With
- **Meeting Rooms I (LC 252):** Just check if any two meetings overlap. Sort by start, check consecutive pairs. No heap.
- **Non-overlapping Intervals (LC 435):** You REMOVE meetings to eliminate overlap; sort by end.
- **Sweep Line for counting (see below):** Equivalent approach, different code style; gives same answer.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 253 | Meeting Rooms II | Medium (premium) | Sort by start, min-heap of end times | https://leetcode.com/problems/meeting-rooms-ii/ |
| 1094 | Car Pooling | Medium | Same pattern: track running count of passengers vs capacity | https://leetcode.com/problems/car-pooling/ |
| 759 | Employee Free Time | Hard (premium) | Merge all intervals, find gaps between merged result | https://leetcode.com/problems/employee-free-time/ |
| 56 | Merge Intervals | Medium | Prerequisite understanding for overlap logic | https://leetcode.com/problems/merge-intervals/ |

### One-Minute Revision
```
PATTERN:          Meeting Rooms II (Minimum Rooms)
IN SIMPLE WORDS:  Find peak simultaneous [start,end] overlaps using a heap
OVERLAP CONDITION: heap.peek() > meeting.start  (room NOT free yet)
SORT BY:          start (ascending)
USE WHEN:         "minimum rooms," "max concurrent," "peak simultaneous resources"
DON'T USE WHEN:   Just checking if one person can attend all (sort + consecutive check)
TIME:             O(n log n)
SPACE:            O(n)
COMMON TRAP:      Use heap.size() as answer, not heap.peek()
EXPERIENCE TIP:   Heap = currently occupied rooms. If smallest end <= next start, recycle
```

---

## Minimum Arrows to Burst Balloons

### What is it?
You are given a list of balloons, each occupying a horizontal range represented as [xstart, xend]. An arrow shot vertically at position x bursts every balloon whose range contains x. Find the minimum number of arrows needed to burst all balloons. This is equivalent to finding the minimum number of "groups" of overlapping intervals where all intervals in a group share at least one common point.

### Visual
```
Balloons:
[10,16]  [=======]
[2,8]  [=====]
[1,6]  [====]
[7,12]       [======]

1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16
[========C========]
   [=======B=======]
               [========D========]
                        [===========A===========]

Sort by end: [1,6], [2,8], [7,12], [10,16]

Arrow 1 at x=6: bursts [1,6] and [2,8]  (both contain 6)
Arrow 2 at x=11 or 12: bursts [7,12] and [10,16] (both contain 11 or 12)

Minimum arrows: 2
```

### How does it work?
1. Sort all balloon ranges by their **end value** (rightmost point).
2. Shoot the first arrow at the end of the first balloon (this is the optimal position — burst as many as possible).
3. Track `arrowPos` = end of the last-shot arrow.
4. For each subsequent balloon (sorted by end):
5. If this balloon's start is greater than `arrowPos`, it is NOT burst by the current arrow — shoot a new arrow at this balloon's end, increment arrow count.
6. If this balloon's start is at or before `arrowPos`, the current arrow already bursts it — skip.
7. Return the total arrow count.

### Why does it work?
By sorting by end and always shooting at the earliest possible end, you burst the maximum balloons per arrow. Any balloon starting after the current arrow position cannot be burst by it, so a new arrow is always necessary.

### When to use?
- "Minimum number of arrows/points/lines to cover all intervals."
- "Minimum number of groups of overlapping intervals."
- "How many times do you need to 'stamp' to cover all ranges?"
- Keywords: "burst," "pierce," "cover," minimum count of overlapping groups.

### When NOT to use?
- You need to remove intervals (use Non-overlapping Intervals).
- You need to count how many rooms (use Meeting Rooms II).

### How to recognize in a new problem?
Ask: "Can I find a single point that is inside multiple intervals, and I want to minimize how many such points I need?" Concrete signals:
- "Minimum number of arrows to pop all balloons."
- "Minimum number of points that hit every interval."
- "Minimum overlapping groups."

### Simple Example
Input: `[[10,16],[2,8],[1,6],[7,12]]`
Expected output: `2`

```
Sort by end: [1,6],[2,8],[7,12],[10,16]

arrowPos = -inf, arrows = 0

[1,6]:   start=1 > -inf → NEW ARROW at 6.  arrowPos=6,  arrows=1
[2,8]:   start=2 <= 6   → already burst. Skip.
[7,12]:  start=7 > 6    → NEW ARROW at 12. arrowPos=12, arrows=2
[10,16]: start=10 <= 12 → already burst. Skip.

Output: 2
```

### Code
```java
// Java
public int findMinArrowShots(int[][] points) {
    // Sort by end position
    Arrays.sort(points, (a, b) -> Integer.compare(a[1], b[1]));
    // NOTE: use Integer.compare to avoid integer overflow (not a[1]-b[1])

    int arrows = 1;
    int arrowPos = points[0][1]; // shoot first arrow at end of first balloon

    for (int i = 1; i < points.length; i++) {
        if (points[i][0] > arrowPos) {
            // This balloon is not burst — need a new arrow
            arrowPos = points[i][1];
            arrows++;
        }
        // else: current arrow already bursts this balloon
    }

    return arrows;
}
```

```javascript
// JavaScript
function findMinArrowShots(points) {
    // Sort by end position
    points.sort((a, b) => a[1] - b[1]);

    let arrows = 1;
    let arrowPos = points[0][1]; // first arrow at end of first balloon

    for (let i = 1; i < points.length; i++) {
        if (points[i][0] > arrowPos) {
            // Not burst — shoot new arrow
            arrowPos = points[i][1];
            arrows++;
        }
    }

    return arrows;
}
```

### Dry Run
```
Input: [[1,2],[3,4],[5,6],[7,8]]

Sort by end: [[1,2],[3,4],[5,6],[7,8]] (already sorted)

1  2  3  4  5  6  7  8
[A]  [B]  [C]  [D]

No balloons overlap at all — each needs its own arrow.

arrowPos = 2, arrows = 1

[3,4]: start=3 > 2 → NEW ARROW at 4. arrowPos=4, arrows=2
[5,6]: start=5 > 4 → NEW ARROW at 6. arrowPos=6, arrows=3
[7,8]: start=7 > 6 → NEW ARROW at 8. arrowPos=8, arrows=4

Output: 4
```

### Complexity
```
Time:  O(n log n) — sorting dominates
Space: O(1)       — only tracking arrowPos and count
```

### Common Trap
1. Using `a[1] - b[1]` as comparator for sorting. This causes **integer overflow** when values are large (e.g., near `Integer.MAX_VALUE`). Always use `Integer.compare(a[1], b[1])` in Java.
2. Confusing with Non-overlapping Intervals: the overlap condition here uses `>` (strict), not `>=`. If `start == arrowPos`, the arrow still bursts the balloon (`start <= arrowPos`).

### Experience Tip
**Experience Tip:** This problem is almost identical in structure to Non-overlapping Intervals — both sort by end and scan greedily. The difference: here you COUNT arrow groups (non-overlapping groups). There you COUNT removals. The code looks almost the same; the interpretation differs.

### Do Not Confuse With
- **Non-overlapping Intervals (LC 435):** "Remove minimum to make non-overlapping." Answer = n - (groups counted here). Same greedy, different question framing.
- **Meeting Rooms II (LC 253):** Counts maximum simultaneous overlaps. Different: here you count minimum independent groups.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 452 | Minimum Number of Arrows to Burst Balloons | Medium | Sort by end, shoot at end of first unbursted balloon | https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/ |
| 435 | Non-overlapping Intervals | Medium | Nearly identical greedy; different question framing | https://leetcode.com/problems/non-overlapping-intervals/ |
| 56 | Merge Intervals | Medium | Same sort-by-start flavor; understand the contrast | https://leetcode.com/problems/merge-intervals/ |

### One-Minute Revision
```
PATTERN:          Minimum Arrows to Burst Balloons
IN SIMPLE WORDS:  Minimum points that collectively pierce every [start,end] range
OVERLAP CONDITION: curr.start <= arrowPos  (arrow still reaches it)
SORT BY:          end (ascending)
USE WHEN:         "minimum arrows/points/groups to cover all intervals"
DON'T USE WHEN:   Counting simultaneous overlaps (use sweep line / Meeting Rooms)
TIME:             O(n log n)
SPACE:            O(1)
COMMON TRAP:      Use Integer.compare for sort comparator (avoid overflow)
EXPERIENCE TIP:   Same greedy as non-overlapping intervals; count groups, not removals
```

---

## Sweep Line for Counting Overlaps

### What is it?
The Sweep Line technique treats each interval as two point events: a +1 event at its start and a -1 event at its end. You sort all these events and walk through them left to right, maintaining a running count. This running count tells you how many intervals are "active" at any moment. It directly answers: "What is the maximum number of overlapping intervals at any single point?"

### Visual
```
Intervals:
[1,4]  [----]
[2,6]     [--------]
[5,8]           [------]

Events on a number line:
1    2    4    5    6    8
+1   +1   -1   +1   -1   -1

Sweep left to right:
pos=1: +1 → count=1
pos=2: +1 → count=2   ← overlap of [1,4] and [2,6]
pos=4: -1 → count=1
pos=5: +1 → count=2   ← overlap of [2,6] and [5,8]
pos=6: -1 → count=1
pos=8: -1 → count=0

Max count = 2 → maximum 2 intervals overlap at any point
```

### How does it work?
1. For each interval [start, end], create two events: `(start, +1)` and `(end, -1)`.
2. Sort all events by position. Tie-breaking: process ends (-1) before starts (+1) at the same position (so a room freed at time T can be reused by a meeting starting at T).
3. Walk through all events left to right, maintaining a running `count`.
4. Add the delta (+1 or -1) to count at each event.
5. Track the maximum count seen — this is the answer.
6. Return the maximum count.

### Why does it work?
At any position x, the running count equals the number of intervals that have started but not yet ended — exactly the number of active (overlapping) intervals at that point. The maximum of this running count is the peak overlap.

### When to use?
- "Maximum number of intervals/meetings/events active at the same time."
- "Minimum resources needed to handle all tasks simultaneously."
- "Is there any point covered by more than k intervals?"
- Any question asking about the "peak" count at any moment.

### When NOT to use?
- You need to merge intervals into one output list — use Merge Intervals.
- You need minimum removals — use Non-overlapping Intervals (sort by end, greedy).

### How to recognize in a new problem?
Ask: "Does the problem ask 'how many X are happening at the same time' or 'what is the peak'?" Concrete signals:
- "At any given moment, what is the maximum number of active meetings?"
- "What is the maximum overlap?"
- "Car pooling: does the passenger count ever exceed the capacity?"

### Simple Example
Input: `[[1,4],[2,6],[5,8]]`
Expected output: `2` (max 2 intervals overlap at any point)

```
Events: (1,+1), (2,+1), (4,-1), (5,+1), (6,-1), (8,-1)

Sorted: [(1,+1),(2,+1),(4,-1),(5,+1),(6,-1),(8,-1)]

count=0, maxCount=0

(1,+1) → count=1, max=1
(2,+1) → count=2, max=2
(4,-1) → count=1, max=2
(5,+1) → count=2, max=2
(6,-1) → count=1, max=2
(8,-1) → count=0, max=2

Output: 2
```

### Code
```java
// Java
public int maxOverlap(int[][] intervals) {
    List<int[]> events = new ArrayList<>();

    for (int[] interval : intervals) {
        events.add(new int[]{interval[0], 1});  // start: +1
        events.add(new int[]{interval[1], -1}); // end: -1
    }

    // Sort by position; at same position, process ends (-1) before starts (+1)
    events.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);

    int count = 0;
    int maxCount = 0;

    for (int[] event : events) {
        count += event[1];
        maxCount = Math.max(maxCount, count);
    }

    return maxCount;
}
```

```javascript
// JavaScript
function maxOverlap(intervals) {
    const events = [];

    for (const [start, end] of intervals) {
        events.push([start, 1]);   // start: +1
        events.push([end, -1]);    // end: -1
    }

    // Sort by position; at tie, ends (-1) before starts (+1)
    events.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);

    let count = 0;
    let maxCount = 0;

    for (const [pos, delta] of events) {
        count += delta;
        maxCount = Math.max(maxCount, count);
    }

    return maxCount;
}
```

### Dry Run
```
Input: [[0,30],[5,10],[15,20]]  (Meeting Rooms II example)

Events:
  (0,+1), (5,+1), (10,-1), (15,+1), (20,-1), (30,-1)

Sorted (no ties here):
  (0,+1), (5,+1), (10,-1), (15,+1), (20,-1), (30,-1)

count=0, max=0

(0, +1): count=1, max=1   ← meeting A starts
(5, +1): count=2, max=2   ← meeting B starts (A still running)
(10,-1): count=1, max=2   ← meeting B ends
(15,+1): count=2, max=2   ← meeting C starts (A still running)
(20,-1): count=1, max=2   ← meeting C ends
(30,-1): count=0, max=2   ← meeting A ends

Max simultaneous = 2 → need 2 rooms
```

### Complexity
```
Time:  O(n log n) — creating 2n events then sorting them
Space: O(n)       — storing 2n events
```

### Common Trap
1. Tie-breaking order matters: if a meeting ends at time T and another starts at T, process the end (-1) first. Otherwise you count T as a moment of overlap when the room was actually being freed. This is why the sort uses `a[1] - b[1]` as the tiebreaker (−1 sorts before +1).
2. Taking the max AFTER adding delta (not before) — you want the count with the current event applied.

### Experience Tip
**Experience Tip:** Sweep line is the most flexible interval tool. Once you understand events (+1/-1), you can solve Meeting Rooms II, Car Pooling, city event overlap, and more — all with the same template. Master this template and you have a universal tool.

### Do Not Confuse With
- **Meeting Rooms II (heap approach):** Same answer, different code. Heap is more intuitive to explain step-by-step; sweep line is more generalizable.
- **Merge Intervals:** You output a list of merged ranges; sweep line outputs a count.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 253 | Meeting Rooms II | Medium (premium) | Sweep line gives minimum rooms; same as max overlap | https://leetcode.com/problems/meeting-rooms-ii/ |
| 1094 | Car Pooling | Medium | Sweep: +passengers at pickup, -passengers at dropoff; check vs capacity | https://leetcode.com/problems/car-pooling/ |
| 56 | Merge Intervals | Medium | Contrast: outputs a list, not a peak count | https://leetcode.com/problems/merge-intervals/ |
| 452 | Minimum Number of Arrows to Burst Balloons | Medium | Counts groups; related but uses greedy, not sweep | https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/ |

### One-Minute Revision
```
PATTERN:          Sweep Line for Counting Overlaps
IN SIMPLE WORDS:  +1 at start, -1 at end; sort events; track running max count
OVERLAP CONDITION: count > 1 at any point means intervals overlap there
SORT BY:          event position; tie-break: ends (-1) before starts (+1)
USE WHEN:         "max simultaneous," "peak overlap," "minimum rooms/resources"
DON'T USE WHEN:   Need to output a merged list (use Merge Intervals)
TIME:             O(n log n)
SPACE:            O(n)
COMMON TRAP:      Tie-break ends before starts; take max AFTER applying delta
EXPERIENCE TIP:   Universal template: works for meetings, car pooling, skyline, and more
```

---

## Quick Reference: Which Pattern?

| Signal in the Problem | Pattern to Use | Sort By |
|---|---|---|
| "Merge overlapping intervals" | Merge Intervals | start |
| "Total coverage / union length" | Merge Intervals | start |
| "Free time / gaps between intervals" | Merge Intervals → find gaps | start |
| "Insert one interval into sorted list" | Insert Interval | no sort (already sorted) |
| "Minimum removal to make non-overlapping" | Non-overlapping Intervals | end |
| "Maximum non-overlapping intervals" | Non-overlapping Intervals | end |
| "Minimum conference rooms / resources" | Meeting Rooms II (heap) or Sweep Line | start (heap) or events |
| "Maximum simultaneous active intervals" | Sweep Line | events by position |
| "Minimum arrows / points to pierce all" | Minimum Arrows (greedy) | end |
| "Intersection of two sorted interval lists" | Two Pointers | already sorted |
| "Dynamic add/remove/query on covered intervals" | Range Module | TreeMap sorted by start |

## Overlap Condition Reference
```
A = [a1, a2],  B = [b1, b2]

OVERLAP:     a1 < b2  AND  b1 < a2
NO OVERLAP:  a2 <= b1  OR  b2 <= a1
A contains B:  a1 <= b1  AND  b2 <= a2
Touching:    a2 == b1  (may or may not count as overlap — clarify with interviewer)
```

---

---

## Range Module (Dynamic Interval Coverage)

### What is it?
The Range Module problem asks you to dynamically maintain a set of covered intervals — you can add a range, remove a range, and query whether a range is fully covered — with updates and queries interleaved at any time. Unlike Merge Intervals (which takes a static list and produces a single merged output), Range Module must handle thousands of operations efficiently in any order.

Think of it like a music playlist editor where you can add a song block (a time range), delete part of a block, and check whether a full time range plays uninterrupted — all at any time, in any order.

### Visual
```
Start: nothing covered.

addRange(10, 20):    covered: [10,20)
                     |--------|

addRange(6, 8):      covered: [6,8) [10,20)
                     |--| |--------|

queryRange(6, 8):    Is [6,8) fully covered? YES ✓
queryRange(6, 10):   Is [6,10) fully covered? NO ✗ — gap at [8,10)

addRange(8, 10):     [6,8)+[8,10)+[10,20) merge → [6,20)
                     |----------------|

removeRange(9, 12):  split [6,20) → [6,9) and [12,20)
                     |---| |------|

queryRange(6, 9):    Is [6,9) fully covered? YES ✓
queryRange(6, 12):   Is [6,12) fully covered? NO ✗ — gap at [9,12)
```

### How does it work?
Maintain a **sorted list of non-overlapping intervals** (sorted by start). Java's `TreeMap<Integer, Integer>` (start → end) is ideal.

**addRange(left, right):**
1. Find any existing interval that starts just before `left` (could overlap on the left side).
2. If it overlaps, expand `left` to its start and `right` to `max(right, its end)`.
3. Repeatedly consume any interval that starts inside `[left, right)`, expanding `right` if needed.
4. Remove all consumed intervals and insert the single merged `[left, right)`.

**removeRange(left, right):**
1. Find any existing interval that starts before `left` and extends into `[left, right)` — save and trim its right portion to end at `left`.
2. Find any existing interval that starts inside `[left, right)` and extends past `right` — save its `[right, end)` portion before removing it.
3. Delete all intervals fully inside `[left, right)`.
4. Re-insert any saved left/right remnants.

**queryRange(left, right):**
1. Use `floorKey(left)` to find the interval whose start ≤ left (the only candidate that could fully contain [left, right)).
2. If it exists and its `end ≥ right`, the entire range is covered → return `true`.
3. Otherwise → return `false`.

### Why does it work?
Maintaining the invariant that intervals are sorted and non-overlapping means any query is a single O(log n) lookup: a range [left, right) is fully covered if and only if there is exactly one interval in the set that starts at or before `left` and ends at or after `right`. The TreeMap's `floorKey` finds that candidate in O(log n). Each add/remove operation touches only the intervals that overlap the changed range, and since each interval is added at most once and removed at most once, the amortized cost per operation is O(log n).

### When to use?
- Dynamic interval coverage: queries and updates are interleaved.
- "Track covered ranges with frequent add/remove/query" operations.
- Calendar systems, network coverage tracking, resource allocation with dynamic reservations.
- Any problem that provides a class interface with addRange, removeRange, queryRange methods.

### When NOT to use?
- Static interval problems with no updates — use Merge Intervals, Sweep Line, etc.
- When you only need to answer queries on a fixed input — sorting and binary search is simpler.
- When ranges are small integers with a known bound — a segment tree or BIT may be faster.

### How to recognize in a new problem?
Signals:
- A `RangeModule`, `MyCalendar`, or dynamic coverage class design problem.
- Operations named `addRange`, `removeRange`, `queryRange` (or `book`, `cancel`, `query`).
- The word "dynamic" combined with "intervals" or "coverage."
- Multiple update and query operations interleaved in any order.

### Simple Example
**Operations and expected results:**
```
addRange(10, 20)   → covered: [10,20)
addRange(6,  8)    → covered: [6,8), [10,20)
queryRange(6, 8)   → true  (fully covered)
queryRange(6, 10)  → false (gap at [8,10))
removeRange(14,16) → covered: [6,8), [10,14), [16,20)
queryRange(10, 14) → true
queryRange(10, 16) → false (gap at [14,16))
```

### Code
```java
// Java — TreeMap<start, end> with half-open intervals [left, right)
class RangeModule {
    private TreeMap<Integer, Integer> map = new TreeMap<>();

    public void addRange(int left, int right) {
        // Check if an existing interval starts just before 'left' and overlaps
        Integer lo = map.floorKey(left);
        if (lo != null && map.get(lo) >= left) {
            left  = Math.min(left, lo);
            right = Math.max(right, map.get(lo));
            map.remove(lo);
        }
        // Absorb all intervals that start inside [left, right)
        while (true) {
            Integer next = map.ceilingKey(left);
            if (next == null || next > right) break;
            right = Math.max(right, map.get(next));
            map.remove(next);
        }
        map.put(left, right);
    }

    public boolean queryRange(int left, int right) {
        Integer lo = map.floorKey(left);
        // One interval must start at or before 'left' and end at or after 'right'
        return lo != null && map.get(lo) >= right;
    }

    public void removeRange(int left, int right) {
        // Handle interval starting before 'left' that extends into [left, right)
        Integer lo = map.floorKey(left);
        if (lo != null && map.get(lo) > left) {
            int savedEnd = map.get(lo);
            map.put(lo, left);               // trim: keep [lo, left)
            if (savedEnd > right) {
                map.put(right, savedEnd);    // split: keep [right, savedEnd)
            }
        }
        // Remove intervals fully inside [left, right); save any right overhang
        while (true) {
            Integer next = map.ceilingKey(left);
            if (next == null || next >= right) break;
            int end = map.get(next);
            map.remove(next);
            if (end > right) {
                map.put(right, end);         // keep [right, end)
                break;
            }
        }
    }
}
```
```javascript
// JavaScript — sorted array of [start, end] pairs (half-open intervals)
class RangeModule {
    constructor() { this.ranges = []; }

    addRange(left, right) {
        const result = [];
        let added = false;
        for (const [s, e] of this.ranges) {
            if (e < left) {
                result.push([s, e]);           // completely before — keep as-is
            } else if (s > right) {
                if (!added) { result.push([left, right]); added = true; }
                result.push([s, e]);           // completely after — keep as-is
            } else {
                left  = Math.min(left, s);     // overlaps — expand boundaries
                right = Math.max(right, e);
            }
        }
        if (!added) result.push([left, right]);
        this.ranges = result;
    }

    queryRange(left, right) {
        for (const [s, e] of this.ranges) {
            if (s <= left && e >= right) return true;
            if (s > left) break;
        }
        return false;
    }

    removeRange(left, right) {
        const result = [];
        for (const [s, e] of this.ranges) {
            if (e <= left || s >= right) {
                result.push([s, e]);           // no overlap — keep
            } else {
                if (s < left)  result.push([s, left]);   // left remnant
                if (e > right) result.push([right, e]);  // right remnant
            }
        }
        this.ranges = result;
    }
}
```

### Dry Run
**Sequence:** `addRange(10,20)` → `addRange(6,8)` → `removeRange(14,16)` → `queryRange(10,14)` → `queryRange(10,16)`

| Operation | TreeMap state (start→end) | Result |
|-----------|---------------------------|--------|
| addRange(10,20) | {10→20} | — |
| addRange(6,8) | {6→8, 10→20} | — |
| removeRange(14,16) | {6→8, 10→14, 16→20} | — |
| queryRange(10,14) | floorKey(10)=10, map.get(10)=14 ≥ 14? YES | true |
| queryRange(10,16) | floorKey(10)=10, map.get(10)=14 ≥ 16? NO | false |

### Complexity
```
addRange:    O(k log n) where k = intervals merged; amortized O(log n) per call
queryRange:  O(log n)   — single floorKey lookup
removeRange: O(k log n) where k = intervals removed; amortized O(log n) per call
Space:       O(n) — at most n non-overlapping intervals stored
```

### Common Trap
**Half-open vs closed intervals.** LeetCode 715 (Range Module) uses half-open intervals `[left, right)` — the right endpoint is NOT included. This changes the overlap condition: `[a, b)` and `[b, c)` are NOT overlapping (they just touch at b). Using closed intervals `[left, right]` will produce wrong answers on edge cases. Always confirm whether the problem uses `[a,b]` (closed) or `[a,b)` (half-open) before writing any overlap condition.

### Experience Tip
**Experience Tip:** The `TreeMap.floorKey(left)` call is the anchor for all three operations — it finds "the interval that might contain `left`" in O(log n). Once you have that anchor, everything else is careful bookkeeping of left/right remnants. In interviews, draw the three removeRange cases on paper before coding: (1) interval extends left of `left`, (2) interval extends right of `right`, (3) interval fully inside [left, right). Sketching these prevents the most common mistakes.

### Do Not Confuse With

| | Range Module (dynamic) | Merge Intervals (static) | Insert Interval (static) |
|--|--|--|--|
| Input style | Interleaved add/remove/query calls | One-shot unsorted list | Sorted list + one new interval |
| Updates supported | Yes — frequent add and remove | No | One insert only |
| Core data structure | TreeMap / sorted live list | Sort then scan | Scan sorted list |
| Time per operation | O(log n) amortized | O(n log n) total | O(n) total |
| Use when | Dynamic coverage tracking | Batch merge | Insert one into sorted list |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal | Link |
|---|---------|------------|----------------|------|
| 715 | Range Module | Hard | Dynamic add/remove/query — TreeMap with floorKey | https://leetcode.com/problems/range-module/ |
| 729 | My Calendar I | Medium | Dynamic interval: add only, no remove, detect double-booking | https://leetcode.com/problems/my-calendar-i/ |
| 731 | My Calendar II | Medium | Add intervals; allow at most double-booking | https://leetcode.com/problems/my-calendar-ii/ |
| 732 | My Calendar III | Hard | Add intervals; find the maximum k-booking count — TreeMap sweep | https://leetcode.com/problems/my-calendar-iii/ |
| 57 | Insert Interval | Medium | Simpler: one-time insert into a sorted static list | https://leetcode.com/problems/insert-interval/ |
| 56 | Merge Intervals | Medium | Static batch merge — understand this before Range Module | https://leetcode.com/problems/merge-intervals/ |
| 759 | Employee Free Time | Hard | Static batch: merge all intervals, find free gaps | https://leetcode.com/problems/employee-free-time/ |

### One-Minute Revision
```
PATTERN:        Range Module (Dynamic Interval Coverage)
IN SIMPLE WORDS: Maintain a live set of covered intervals. O(log n) add/remove/query.
USE WHEN:       Interleaved add, remove, query on interval coverage (dynamic, not one-shot).
DON'T USE WHEN: One-shot merge (Merge Intervals); one insert (Insert Interval).
CORE STRUCTURE: TreeMap<start, end> — sorted, non-overlapping, half-open [start, end).
addRange:       Merge all overlapping intervals into one entry.
removeRange:    Trim or split intervals at the remove boundaries; save remnants.
queryRange:     floorKey(left) — if that interval's end ≥ right, return true.
TIME:           O(log n) per query; O(k log n) per add/remove (amortized O(log n))
SPACE:          O(n)
COMMON TRAP:    Half-open [left,right) — touching intervals do NOT overlap. Wrong overlap
                condition is the #1 source of bugs.
EXPERIENCE TIP: Sketch the 3 removeRange cases before coding. floorKey is the anchor for all ops.
```

---

*Next: [19-DESIGN-PATTERNS-AND-META.md](19-DESIGN-PATTERNS-AND-META.md)*
