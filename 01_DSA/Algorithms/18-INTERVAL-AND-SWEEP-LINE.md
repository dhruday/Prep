# Interval and Sweep Line — Complete Pattern Guide

> *"Intervals are ranges on a number line. Most interval problems reduce to: sort them, then scan left to right, merging or counting as you go."*

---

## Table of Contents

1. [Interval Representation and Sorting](#interval-representation-and-sorting)
2. [Merge Intervals](#merge-intervals)
3. [Insert Interval](#insert-interval)
4. [Non-overlapping Intervals (Minimum Removal)](#non-overlapping-intervals-minimum-removal)
5. [Meeting Rooms I and II](#meeting-rooms-i-and-ii)
6. [Sweep Line Technique](#sweep-line-technique)
7. [Interval Intersection](#interval-intersection)
8. [Range Module / My Calendar](#range-module--my-calendar)
9. [Interval Scheduling Maximization](#interval-scheduling-maximization)
10. [Interval Decision Guide](#interval-decision-guide)

---

## Interval Representation and Sorting

### Core Idea

An interval is [start, end]. The first decision in any interval problem: **how to sort.**

| Sort By | When |
|---|---|
| Start time | Merging intervals, insert interval, intersection |
| End time | Activity selection (maximize non-overlapping) |
| Start time, then end time descending | Specific overlap problems |

### Overlap Detection

Two intervals [a1, a2] and [b1, b2] overlap if and only if: a1 < b2 AND b1 < a2

They do NOT overlap if: a2 ≤ b1 OR b2 ≤ a1 (one ends before the other starts)

---

## Merge Intervals

### What is this approach?

**Intuition:** Sort intervals by start time. Scan left to right. If the current interval overlaps with the previous, merge them (extend the end). Otherwise, start a new group.

### When should I use this?

- "Merge overlapping intervals"
- "Total coverage of intervals"
- "Employee free time"
- Keywords: "merge," "overlapping intervals," "combine ranges"

### Core Idea

1. Sort by start time
2. Initialize result with first interval
3. For each subsequent interval:
   - If current.start ≤ result[-1].end: merge → result[-1].end = max(result[-1].end, current.end)
   - Else: append current to result

### Complexity

- **Time:** O(n log n) for sorting
- **Space:** O(n) for result

### Variants

- **Employee Free Time:** Merge all busy intervals across employees. Free time = gaps between merged intervals.
- **Total Covered Length:** After merging, sum up (end - start) for each merged interval.

### Interview Insights

- **Trap:** Merge uses MAX of end times, not just the new interval's end. An earlier interval might extend further right.
- **Edge case:** Intervals that touch: [1,3] and [3,5]. Whether they merge depends on the problem definition (inclusive vs exclusive endpoints).

---

## Insert Interval

### What is this approach?

**Intuition:** Given sorted, non-overlapping intervals and a new interval, insert it and merge if needed. Three phases: add all intervals that end BEFORE the new one, merge all intervals that overlap with the new one, add all intervals that start AFTER.

### Core Idea

1. Add all intervals with end < new.start (no overlap, come before)
2. Merge all intervals that overlap with new: new.start = min(new.start, current.start), new.end = max(new.end, current.end)
3. Add the merged new interval
4. Add all remaining intervals

### Complexity

- **Time:** O(n)
- **Space:** O(n)

### Interview Insights

- **No sorting needed** — the input is already sorted.
- **Pattern:** The three-phase approach (before / overlap / after) is clean and avoids complex case analysis.

---

## Non-overlapping Intervals (Minimum Removal)

### What is this approach?

**Intuition:** Remove the minimum number of intervals so that the rest don't overlap. Equivalently: KEEP the maximum number of non-overlapping intervals.

### Core Idea

1. Sort by END time
2. Greedily select intervals: pick the first, then always pick the next interval whose start ≥ previous end
3. Answer = total intervals - selected count

### Complexity

- **Time:** O(n log n)
- **Space:** O(1)

### Interview Insights

- **This IS the Activity Selection problem** (see [13-GREEDY-ALGORITHMS.md](13-GREEDY-ALGORITHMS.md#activity-selection--interval-scheduling)). Sorting by END time is critical.
- **Why end time?** An interval that ends earlier leaves more room for subsequent intervals.

---

## Meeting Rooms I and II

### Meeting Rooms I (Can one person attend all meetings?)

**Core Idea:** Sort by start time. If any meeting starts before the previous one ends → overlap → cannot attend all.

**Complexity:** O(n log n)

### Meeting Rooms II (Minimum rooms needed)

**Intuition:** The minimum rooms = maximum number of meetings happening simultaneously at any point.

**Approach 1 — Sweep Line (preferred):**
1. Create events: +1 at each start time, -1 at each end time
2. Sort events by time (if tied, process ends before starts)
3. Scan left to right, maintaining a running count. Maximum count = answer.

**Approach 2 — Min-Heap:**
1. Sort by start time
2. Min-heap tracks end times of current rooms
3. For each meeting: if meeting.start ≥ heap.peek(): reuse that room (pop + push new end). Else: allocate new room (push new end).
4. Heap size = rooms needed.

### Complexity

- **Sweep Line:** O(n log n)
- **Heap:** O(n log n)

### Interview Insights

- **Meeting Rooms II** is a top-tier interval problem. Both approaches should be familiar.
- **Sweep Line** generalizes better (see below). **Heap** is more intuitive for this specific problem.

---

## Sweep Line Technique

### What is this approach?

**Intuition:** Convert intervals into point events (start = +1, end = -1). Sort events by position. Sweep left to right, maintaining a "counter." The counter at any point tells you how many intervals are active there.

### When should I use this?

- "Maximum overlap at any point" (meeting rooms)
- "Skyline problem"
- "Rectangle area/perimeter"
- "Points covered by most intervals"
- "Car pooling" (capacity constraint)
- Keywords: "maximum overlap," "skyline," "concurrent," "at the same time"

### Core Idea

1. For each interval [start, end]: create two events — (start, +1) and (end, -1)
2. Sort events by coordinate. Tie-breaking depends on problem:
   - Meeting rooms: end before start (free a room before needing one)
   - Skyline: start before end at the same x, and among starts, taller first
3. Sweep left to right, maintaining current state (count, max-height, etc.)

### Complexity

- **Time:** O(n log n) for sorting events
- **Space:** O(n)

### Variants

**Car Pooling:** Events = (location, +passengers) and (location, -passengers). Sweep by location. If running total ever exceeds capacity → false.

**The Skyline Problem:**
- Events: building start = add height, building end = remove height
- Use a max-heap (or sorted multiset) to track active heights
- At each event: if the max active height changes → add a key point to result

**Rectangle Area Union:** Sweep horizontal line top to bottom. At each y-event, compute the union of active x-intervals (merge intervals or segment tree for efficiency).

### Interview Insights

- **The Skyline Problem** combines sweep line with a max-heap/multiset. It's one of the hardest classical interview problems.
- **Pattern recognition:** "At any point, how many X are active?" → sweep line.
- **2D sweep:** For 2D problems (rectangle union), sweep in one dimension and use a 1D structure (segment tree, merge intervals) for the other.

---

## Interval Intersection

### What is this approach?

**Intuition:** Given two lists of sorted, non-overlapping intervals, find all intersections. Use two pointers, one for each list. The interval that ends first advances.

### Core Idea

1. Two pointers: i for list A, j for list B
2. At each step, check overlap: lo = max(A[i].start, B[j].start), hi = min(A[i].end, B[j].end)
3. If lo ≤ hi: record [lo, hi] as an intersection
4. Advance the pointer with the smaller end time

### Complexity

- **Time:** O(n + m)
- **Space:** O(1) extra (excluding output)

### Interview Insights

- **Two pointers on intervals** — advance the one that ends first. This is the key insight.

---

## Range Module / My Calendar

### What is this approach?

**Intuition:** Dynamic interval management: add intervals, remove intervals, query if a point/range is covered. Like a calendar where you book, cancel, and check availability.

### Core Ideas

**My Calendar I:** No double booking. Before adding [start, end), check if it conflicts with any existing interval. Use a sorted list + binary search.

**My Calendar II:** Allow single overlap, reject triple booking. Maintain "bookings" and "double-bookings." On new booking: check if it overlaps any double-booking (→ reject). Otherwise add, and update double-bookings.

**My Calendar III:** Return the max overlap count. Sweep line: maintain event map, return max concurrent.

**Range Module:** Track disjoint intervals. Operations: addRange, removeRange, queryRange. Use a sorted set of intervals with merge/split operations.

### Interview Insights

- **Sorted container** is the backbone. In interviews, describe the data structure choice clearly.
- **My Calendar** series escalates from simple overlap detection to full sweep-line counting.

---

## Interval Scheduling Maximization

### Overview

This is covered in detail in the Greedy chapter. Summary:

| Problem | Approach |
|---|---|
| Max non-overlapping intervals | Sort by end time, greedy pick |
| Min intervals to cover a range | Sort by start, greedy extend |
| Min removal for non-overlapping | Total - max non-overlapping |
| Min points to hit all intervals | Sort by end, place point at each end |

---

## Interval Decision Guide

| Problem Type | Key Technique |
|---|---|
| Merge overlapping | Sort by start, scan and merge |
| Insert into sorted intervals | Three-phase: before/overlap/after |
| Max non-overlapping (keep) | Sort by END, greedy select |
| Min removal for non-overlapping | Total - max non-overlapping |
| Min rooms / max concurrent | Sweep line (+1/-1 events) |
| Intersection of two interval lists | Two pointers |
| Dynamic add/remove/query | Sorted container + merge/split |
| Skyline | Sweep line + max-heap |
| Range coverage | Sort by start, greedy extend |

### The Universal First Step

**Sort the intervals.** Almost every interval problem starts here. The only question is: sort by START or by END?

- **Start:** Merging, inserting, intersection, coverage
- **End:** Activity selection, maximum non-overlapping, minimum removal

---

*Next: [19-DESIGN-PATTERNS-AND-META.md](19-DESIGN-PATTERNS-AND-META.md) — The patterns that don't fit neatly into one category.*
