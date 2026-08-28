# Greedy Algorithms — Pattern-by-Pattern Guide

> **6 algorithms covered:** Activity Selection / Non-Overlapping Intervals · Jump Game I · Jump Game II · Gas Station · Task Scheduler · Candy

> "Make the best-looking choice at each step. If you can prove you will never regret it, that is greedy."

**Goal:** Read each pattern, understand the core idea, then go practice on LeetCode immediately.

---

## Table of Contents

1. [Activity Selection / Non-overlapping Intervals](#activity-selection--non-overlapping-intervals)
2. [Jump Game I — Can You Reach the End?](#jump-game-i--can-you-reach-the-end)
3. [Jump Game II — Minimum Jumps](#jump-game-ii--minimum-jumps)
4. [Gas Station — Running Surplus Reset](#gas-station--running-surplus-reset)
5. [Task Scheduler — Frequency and Idle Slots](#task-scheduler--frequency-and-idle-slots)
6. [Candy — Two-Pass Greedy](#candy--two-pass-greedy)
7. [Exchange Argument (Proof Technique)](#exchange-argument-proof-technique)
8. [Huffman Coding](#huffman-coding)
9. [Quick Comparison Table](#quick-comparison-table)
10. [When Greedy Fails — Use DP Instead](#when-greedy-fails--use-dp-instead)

---

## Activity Selection / Non-overlapping Intervals

### What is it?
You have a list of intervals (start, end). You want to fit as many as possible without any two overlapping. Greedy means: make the best-looking choice at each step without going back. The greedy choice here is to always pick the interval that ends the soonest — finishing early leaves the most room for future intervals. The Minimum Arrows to Burst Balloons problem (LeetCode 452) uses the exact same algorithm and is covered as a variant below.

### Visual
```
Intervals sorted by end time:
[1,2]   [2,3]   [1,3]   [3,4]

Step 1: Keep [1,2]  →  lastEnd = 2
Step 2: Keep [2,3]  →  2 >= 2 (no overlap)  →  lastEnd = 3
Step 3: SKIP [1,3]  →  1 < 3  (overlaps [2,3])
Step 4: Keep [3,4]  →  3 >= 3 (no overlap)  →  lastEnd = 4

Kept: 3 intervals  →  Removed: 4 - 3 = 1
```

### How does it work?
1. Sort all intervals by their **end time** (not start time).
2. Take the first interval. Set `lastEnd = intervals[0][1]`.
3. For each remaining interval:
   - If `interval.start >= lastEnd`: no overlap. Keep it. Update `lastEnd = interval.end`.
   - Otherwise: skip it (it overlaps the last kept interval).
4. Count how many you kept.
5. Answer = `total intervals - kept` (minimum removals).
6. The greedy choice is: always pick the earliest-ending valid interval.
7. Why is it safe? Any interval that ends later could be swapped for the earlier-ending one without losing future options (exchange argument).

### Why does it work?
The key idea: an interval that ends earlier blocks fewer future intervals. If an optimal solution chose interval A (ends later) instead of B (ends earlier and does not overlap), swapping A for B in that solution can only open up more future choices — never fewer. So always choosing the earliest-ending non-overlapping interval is always at least as good as any other choice.

### When to use?
- "Maximum number of non-overlapping intervals."
- "Minimum number of intervals to remove so none overlap."
- "Minimum arrows/points to pierce all ranges."
- You can sort the input and scan once to make decisions.

### When NOT to use?
- When intervals have weights and you want maximum total weight (not count) — use DP (weighted interval scheduling).
- When you need to count how many intervals overlap simultaneously (e.g., meeting rooms needed) — use a min-heap.

### How to recognize in a new problem?
Ask yourself: "Am I choosing a subset of ranges to maximize count (or minimize removals)?" If all intervals have equal importance and you want as many as possible, this is activity selection. Signals: "non-overlapping," "minimum removals," "maximum events," "schedule as many as possible," "minimum arrows to cover all ranges."

### Simple Example
Input: `[[1,2],[2,3],[3,4],[1,3]]`
Expected output: `1` (remove 1 interval)

Sorted by end: `[[1,2],[2,3],[1,3],[3,4]]`
- Keep [1,2]. lastEnd = 2.
- Keep [2,3] because 2 >= 2. lastEnd = 3.
- Skip [1,3] because 1 < 3 (overlaps).
- Keep [3,4] because 3 >= 3. lastEnd = 4.

Kept 3 of 4 → remove **1**.

### Code
```java
// Java
import java.util.Arrays;

public int eraseOverlapIntervals(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[1] - b[1]); // sort by end time
    int kept = 1;
    int lastEnd = intervals[0][1];
    for (int i = 1; i < intervals.length; i++) {
        if (intervals[i][0] >= lastEnd) {  // no overlap
            kept++;
            lastEnd = intervals[i][1];
        }
        // else: overlaps → skip this interval
    }
    return intervals.length - kept;
}
```
```javascript
// JavaScript
function eraseOverlapIntervals(intervals) {
    intervals.sort((a, b) => a[1] - b[1]); // sort by end time
    let kept = 1;
    let lastEnd = intervals[0][1];
    for (let i = 1; i < intervals.length; i++) {
        if (intervals[i][0] >= lastEnd) {  // no overlap
            kept++;
            lastEnd = intervals[i][1];
        }
        // else: overlaps → skip
    }
    return intervals.length - kept;
}
```

### Dry Run
Input: `[[1,2],[2,3],[1,3],[3,4]]` (already sorted by end time)

| i | Interval | start >= lastEnd? | kept | lastEnd |
|---|----------|-------------------|------|---------|
| — | [1,2] | init | 1 | 2 |
| 1 | [2,3] | 2 >= 2 YES | 2 | 3 |
| 2 | [1,3] | 1 >= 3 NO | 2 | 3 |
| 3 | [3,4] | 3 >= 3 YES | 3 | 4 |

Answer: 4 - 3 = **1**

### Complexity
```
Time:  O(n log n) — sorting dominates; the single scan after is O(n)
Space: O(1) — only tracking lastEnd and a count
```

### Common Trap
1. Sorting by **start time** instead of end time. Earliest start does not maximize future capacity — earliest end does. This is the single most common mistake on this pattern.
2. Using `>` instead of `>=` for the overlap check. If one interval ends exactly where the next starts (`[1,2],[2,3]`), they do NOT overlap. Use `>=`.

### Experience Tip
**Experience Tip:** This is greedy, not DP, because the exchange argument holds perfectly — an earlier-ending interval can always replace a later-ending one in any solution without making it worse. DP would require a 2D table (which intervals are compatible with which). Here, one variable (`lastEnd`) captures everything you need — that single-variable state is the hallmark of greedy.

### Do Not Confuse With
- **Merge Intervals (LeetCode 56):** Sort by start time and merge overlapping intervals. That is not an optimization problem — no greedy choice is made. You are just combining, not selecting.
- **Meeting Rooms II (LeetCode 253):** "How many rooms are needed simultaneously?" Not greedy in the same way — use a min-heap to track when rooms free up.
- **Weighted Interval Scheduling:** If intervals have values and you want to maximize total value (not count), greedy fails. Use DP.

---

### Variant: Minimum Arrows to Burst Balloons (LeetCode 452)

**Problem:** Balloons are represented as intervals on a number line. An arrow shot at x bursts all balloons whose range contains x. Find the minimum number of arrows.

**Key insight:** This is the same algorithm. Overlapping balloons can all be burst by one arrow. Sort by end coordinate. Every time a new balloon starts after the previous group's end, you need a new arrow.

**The only difference from non-overlapping intervals:** Use `>` instead of `>=` for the overlap check (balloons touching at a single point CAN be burst by the same arrow).

```java
// Java
public int findMinArrowShots(int[][] points) {
    Arrays.sort(points, (a, b) -> Integer.compare(a[1], b[1])); // avoid overflow with compare
    int arrows = 1;
    int arrowPos = points[0][1];
    for (int i = 1; i < points.length; i++) {
        if (points[i][0] > arrowPos) {  // balloon starts AFTER current arrow — need new arrow
            arrows++;
            arrowPos = points[i][1];
        }
    }
    return arrows;
}
```
```javascript
// JavaScript
function findMinArrowShots(points) {
    points.sort((a, b) => a[1] - b[1]);
    let arrows = 1;
    let arrowPos = points[0][1];
    for (let i = 1; i < points.length; i++) {
        if (points[i][0] > arrowPos) {  // new group needed
            arrows++;
            arrowPos = points[i][1];
        }
    }
    return arrows;
}
```

**Minimum arrows = minimum number of "groups" of overlapping intervals = total - maximum non-overlapping + 1.** The structure is identical; just the counting changes.

---

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 455 | Assign Cookies | Easy | Sort both arrays; a cookie that barely satisfies is better than a large one wasted | https://leetcode.com/problems/assign-cookies/ |
| 435 | Non-overlapping Intervals | Medium | Count max non-overlapping intervals kept, then subtract from total | https://leetcode.com/problems/non-overlapping-intervals/ |
| 452 | Minimum Number of Arrows to Burst Balloons | Medium | All mutually overlapping balloons can share one arrow; same sort-by-end structure | https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/ |
| 853 | Car Fleet | Medium | Sort cars by position descending; if a rear car arrives no later than the one ahead, it joins its fleet | https://leetcode.com/problems/car-fleet/ |

### One-Minute Revision
```
PATTERN:        Activity Selection / Non-overlapping Intervals
IN SIMPLE WORDS: Always pick the interval that ends the earliest
GREEDY CHOICE:  Among valid (non-overlapping) intervals, take the one with the smallest end time
WHY IT'S SAFE:  Exchange argument: swapping a later-ending interval for an earlier-ending one
                never reduces future options
USE WHEN:       "Max non-overlapping intervals," "min removals," "min arrows to cover ranges"
DON'T USE WHEN: Intervals have weights (use DP) or need simultaneous resource count (use heap)
TIME:           O(n log n)
SPACE:          O(1)
COMMON TRAP:    Sorting by start time (wrong); using > instead of >= for overlap check
EXPERIENCE TIP: One variable (lastEnd) captures all state — that is the hallmark of greedy
```

---

## Jump Game I — Can You Reach the End?

### What is it?
You are at index 0 of an array. `nums[i]` tells you the maximum number of steps you can jump from index `i`. The question is: can you reach the last index? Greedy means: at every position, track the farthest index you can currently reach. If you ever find yourself at a position beyond your current reach, you are stuck — return false.

### Visual
```
Index:  0    1    2    3    4
nums:   2    3    1    1    4
        |
farthest starts at 0

i=0: farthest = max(0, 0+2) = 2
i=1: farthest = max(2, 1+3) = 4  ← already covers the last index!
i=2: farthest = max(4, 2+1) = 4
i=3: farthest = max(4, 3+1) = 4

farthest(4) >= last index(4)  →  TRUE
```

### How does it work?
1. Track `farthest = 0` (the farthest index reachable so far).
2. Walk through each index `i` from 0 to n-1.
3. **Before anything:** if `i > farthest`, you cannot reach index `i` — return `false`.
4. Update: `farthest = max(farthest, i + nums[i])`.
5. If the loop completes without returning false: return `true`.
6. The greedy choice: extend `farthest` as far as possible from every position you can reach.
7. Why is it safe? Reaching a farther index is always at least as good as reaching a closer one. You never regret extending the frontier.

### Why does it work?
If you can reach index `i`, you can jump anywhere up to `i + nums[i]`. It does not matter HOW you reached `i`. All that matters is whether you CAN reach it. Tracking the single variable `farthest` captures everything — a position is reachable if and only if it is `<= farthest`. There is no subproblem structure to cache; one number tells you the complete story.

### When to use?
- "Can you reach position X from position 0?"
- "Is the end reachable?"
- You have jump ranges and need a yes/no feasibility answer.
- A single frontier value captures all reachable positions.

### When NOT to use?
- When you need the minimum number of jumps (use Jump Game II pattern below).
- When each jump has a different cost and you want to minimize total cost (use DP).

### How to recognize in a new problem?
You are scanning an array and at each index you get a "reach" or "resource." You want to know if you can get to the end. The phrase "can you reach" or "is it possible" combined with jump/range values is the signal. If you need the COUNT of operations (not just yes/no), look at Jump Game II instead.

### Simple Example
Input: `[3, 2, 1, 0, 4]`
Expected output: `false`

- i=0: farthest = max(0, 0+3) = 3
- i=1: farthest = max(3, 1+2) = 3
- i=2: farthest = max(3, 2+1) = 3
- i=3: farthest = max(3, 3+0) = 3
- i=4: 4 > farthest(3) → return `false`

The zero at index 3 creates a wall you cannot get past.

### Code
```java
// Java
public boolean canJump(int[] nums) {
    int farthest = 0;
    for (int i = 0; i < nums.length; i++) {
        if (i > farthest) return false;  // stuck: cannot reach this index
        farthest = Math.max(farthest, i + nums[i]);
    }
    return true;
}
```
```javascript
// JavaScript
function canJump(nums) {
    let farthest = 0;
    for (let i = 0; i < nums.length; i++) {
        if (i > farthest) return false;  // stuck: cannot reach this index
        farthest = Math.max(farthest, i + nums[i]);
    }
    return true;
}
```

### Dry Run
Input: `[2, 3, 1, 1, 4]`

| i | nums[i] | i > farthest? | farthest |
|---|---------|---------------|----------|
| 0 | 2 | 0 > 0 NO | max(0, 0+2) = 2 |
| 1 | 3 | 1 > 2 NO | max(2, 1+3) = 4 |
| 2 | 1 | 2 > 4 NO | max(4, 2+1) = 4 |
| 3 | 1 | 3 > 4 NO | max(4, 3+1) = 4 |
| 4 | 4 | 4 > 4 NO | max(4, 4+4) = 8 |

Loop ends normally → return **true**.

### Complexity
```
Time:  O(n) — single pass through the array
Space: O(1) — only one variable (farthest)
```

### Common Trap
1. Checking `nums[i] == 0` to decide if you are stuck. Wrong — you may have jumped OVER that zero without landing on it. The correct check is `i > farthest`.
2. Returning false when `nums[i] == 0` and `i != n-1`. You might not even land on that index.

### Experience Tip
**Experience Tip:** This is greedy because extending `farthest` as much as possible is always the right move — reaching farther now never blocks you from reaching farther later. DP would store `canReach[i]` for every `i` (O(n) space, O(n²) time). The greedy insight is that reachability collapses to a single frontier number.

### Do Not Confuse With
- **Jump Game II (LeetCode 45):** That asks for the MINIMUM number of jumps. Different algorithm — see next section.
- **DP approach to Jump Game I:** O(n²) and unnecessary. If `dp[i] = true` iff index i is reachable, you still only need to track the frontier, making the O(n) greedy strictly better.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 860 | Lemonade Change | Easy | At each customer, greedily make change using the largest bills you have | https://leetcode.com/problems/lemonade-change/ |
| 122 | Best Time to Buy and Sell Stock II | Easy | Every time the price rises, that gap is a profit opportunity — take every upslope | https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/ |
| 55 | Jump Game | Medium | Track only one number: the farthest index reachable so far | https://leetcode.com/problems/jump-game/ |
| 45 | Jump Game II | Medium | Builds directly on Jump I — now count how many times you must extend the frontier | https://leetcode.com/problems/jump-game-ii/ |

### One-Minute Revision
```
PATTERN:        Jump Game I — Greedy Frontier
IN SIMPLE WORDS: Track farthest reachable index; if current index exceeds it, return false
GREEDY CHOICE:  At each index, extend farthest as far as possible
WHY IT'S SAFE:  Reaching farther now never closes off any path you could otherwise take
USE WHEN:       "Can you reach the end?" with jump/range values at each position
DON'T USE WHEN: Need minimum jumps (use Jump Game II); jumps have variable costs (use DP)
TIME:           O(n)
SPACE:          O(1)
COMMON TRAP:    Checking nums[i]==0 instead of i > farthest
EXPERIENCE TIP: One variable captures all reachability — that is why greedy beats DP here
```

---

## Jump Game II — Minimum Jumps

### What is it?
Same setup as Jump Game I, but now you are guaranteed to reach the end and need the MINIMUM number of jumps. Greedy means: think in "levels." A level is all positions reachable in exactly k jumps. When you hit the end of the current level, you must take one more jump — always jump to the farthest position reachable from the current level. This is like BFS without a queue.

### Visual
```
Index:  0    1    2    3    4
nums:   2    3    1    1    4

Level 0 (0 jumps): positions [0]
  Scan level 0: farthest reachable = 0+2 = 2
  Hit end of level 0 at i=0 → JUMP #1. Next level boundary = 2.

Level 1 (1 jump): positions [0,1,2]
  i=1: farthest = max(2, 1+3) = 4
  i=2: farthest = max(4, 2+1) = 4
  Hit end of level 1 at i=2 → JUMP #2. Next level boundary = 4.

Level 2 (2 jumps): positions [0..4]
  Reached index 4!

Answer: 2 jumps
```

### How does it work?
1. Initialize: `jumps = 0`, `currentEnd = 0` (end of current level), `farthest = 0`.
2. Loop from `i = 0` to `n-2` (you never need to jump FROM the last index).
3. At every index: update `farthest = max(farthest, i + nums[i])`.
4. When `i == currentEnd`: you have exhausted the current level — you MUST use one jump.
   - `jumps++`
   - `currentEnd = farthest` (advance to the next level's boundary)
5. Return `jumps`.
6. The greedy choice: when forced to jump (level boundary hit), always jump to `farthest`.
7. Why is it safe? The next level covers every position reachable from the current level. Jumping to the farthest point maximizes the next level's coverage.

### Why does it work?
This is implicit BFS. Each "level" is all positions reachable in exactly k jumps. You scan each position in the current level to find the farthest position for the next level. Since you want to cover the most ground per jump, always extending to `farthest` minimizes the total number of levels (jumps). Every position in `[0, farthest]` is reachable from the current level, so you never miss anything.

### When to use?
- "Minimum number of jumps/steps/hops to reach the end."
- You have range values and need the minimum count of expansions.
- You can think in rounds: "what is the farthest I can reach in exactly k steps?"

### When NOT to use?
- When each jump has a different cost (use DP — minimum cost path).
- When you just need to know IF you can reach the end (use Jump Game I).

### How to recognize in a new problem?
The key phrase is "minimum number of jumps/steps/hops." You have positions with max-reach values. If you find yourself thinking in "rounds" or "levels" — what is the farthest I can cover in one more step? — this pattern applies.

### Simple Example
Input: `[2, 3, 0, 1, 4]`
Expected output: `2`

- i=0: farthest=2. i==currentEnd(0) → jump! jumps=1, currentEnd=2.
- i=1: farthest = max(2,1+3) = 4.
- i=2: farthest = max(4,2+0) = 4. i==currentEnd(2) → jump! jumps=2, currentEnd=4.
- i=3: farthest = max(4,3+1) = 4.

Loop ends (goes to n-2=3). Return **2**.

### Code
```java
// Java
public int jump(int[] nums) {
    int jumps = 0;
    int currentEnd = 0;
    int farthest = 0;
    for (int i = 0; i < nums.length - 1; i++) {  // stop at n-2
        farthest = Math.max(farthest, i + nums[i]);
        if (i == currentEnd) {  // end of current level — must jump
            jumps++;
            currentEnd = farthest;
        }
    }
    return jumps;
}
```
```javascript
// JavaScript
function jump(nums) {
    let jumps = 0;
    let currentEnd = 0;
    let farthest = 0;
    for (let i = 0; i < nums.length - 1; i++) {  // stop at n-2
        farthest = Math.max(farthest, i + nums[i]);
        if (i === currentEnd) {  // end of current level — must jump
            jumps++;
            currentEnd = farthest;
        }
    }
    return jumps;
}
```

### Dry Run
Input: `[2, 3, 1, 1, 4]`, n=5, loop goes i=0 to i=3

| i | nums[i] | farthest | i == currentEnd? | jumps | currentEnd |
|---|---------|----------|-----------------|-------|------------|
| 0 | 2 | max(0,2)=2 | 0==0 YES → jump | 1 | 2 |
| 1 | 3 | max(2,4)=4 | 1==2 NO | 1 | 2 |
| 2 | 1 | max(4,3)=4 | 2==2 YES → jump | 2 | 4 |
| 3 | 1 | max(4,4)=4 | 3==4 NO | 2 | 4 |

Return **2**.

### Complexity
```
Time:  O(n) — single pass; loop stops at n-2
Space: O(1) — three variables only
```

### Common Trap
1. Running the loop to `i < n` instead of `i < n-1`. If `i == currentEnd` triggers at the last index, you count one extra jump you did not need.
2. Forgetting to update `farthest` BEFORE checking `i == currentEnd`. The order matters: compute next level boundary first, then check if you have crossed the current level boundary.

### Experience Tip
**Experience Tip:** This is greedy (not DP) because when you hit a level boundary, the only correct move is to jump to the farthest reachable position — there is no reason to jump shorter. DP would compute minimum jumps for each individual position in O(n²). The BFS-level insight makes it O(n) in a single pass.

### Do Not Confuse With
- **Jump Game I (LeetCode 55):** Just returns a boolean — can you reach the end? Same `farthest` variable, no jump counting. Solve this first.
- **DP solution:** O(n²). For each position, check all previous positions that can reach it. The greedy O(n) solution is strictly better.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 55 | Jump Game | Easy (prerequisite) | Solve this first — same farthest-frontier concept, just returns a boolean | https://leetcode.com/problems/jump-game/ |
| 45 | Jump Game II | Medium | Count how many times you exhaust a level boundary | https://leetcode.com/problems/jump-game-ii/ |

### One-Minute Revision
```
PATTERN:        Jump Game II — BFS-Level Greedy
IN SIMPLE WORDS: Expand level by level; each time you hit a level boundary, that costs one jump
GREEDY CHOICE:  When forced to jump, always extend to the farthest reachable position
WHY IT'S SAFE:  More coverage per jump = fewer total jumps needed (BFS optimality)
USE WHEN:       "Minimum jumps/steps/hops to reach end" with max-range values at each index
DON'T USE WHEN: Jumps have variable costs (use DP); just need feasibility (use Jump Game I)
TIME:           O(n)
SPACE:          O(1)
COMMON TRAP:    Loop to i < n instead of i < n-1 → counts one extra jump
EXPERIENCE TIP: "Level" = all positions reachable in exactly k jumps — BFS without a queue
```

---

## Gas Station — Running Surplus Reset

### What is it?
You have gas stations arranged in a circle. Each station gives you some gas and costs some gas to reach the next station. Find the starting station that lets you complete the full circle without running out of gas. Greedy means: if your running gas surplus ever goes negative, the current starting station (and all stations tried up to this point) is impossible — reset and try the next one. You never need to go back.

### Visual
```
Station:    0     1     2     3     4
Gas:        1     2     3     4     5
Cost:       3     4     5     1     2
Diff:      -2    -2    -2    +3    +3

Attempt start=0:
  After station 0: surplus = -2  ← NEGATIVE! Start=0 impossible.
  Reset: start=1, surplus=0

Attempt start=1:
  After station 1: surplus = -2  ← NEGATIVE! Start=1 impossible.
  Reset: start=2, surplus=0

Attempt start=2:
  After station 2: surplus = -2  ← NEGATIVE! Start=2 impossible.
  Reset: start=3, surplus=0

Attempt start=3:
  After station 3: surplus = +3  ← OK
  After station 4: surplus = +6  ← OK, loop complete!

Answer: start = 3
```

### How does it work?
1. Check feasibility: compute `totalSurplus = sum(gas[i] - cost[i])`. If negative: impossible, return -1.
2. Walk through all stations once. Track `currentSurplus = 0` and `startStation = 0`.
3. At each station i: `currentSurplus += gas[i] - cost[i]`.
4. If `currentSurplus < 0`: starting from `startStation` is impossible. Greedy reset: `startStation = i + 1`, `currentSurplus = 0`.
5. Return `startStation` (guaranteed valid since `totalSurplus >= 0`).
6. The greedy choice: when surplus goes negative, the valid start must be AFTER the failing station.
7. Why is it safe? Any station between the old start and the failing station would also accumulate that same deficit — they are all impossible starting points.

### Why does it work?
The "valley argument": if the running surplus hits a negative at station `k`, then starting at any station in `[startStation, k]` will fail — because starting at a later station in that range means you entered the same stretch with LESS surplus (you skipped earlier gains). The valid start must come after the lowest valley in the cumulative surplus curve. Since `totalSurplus >= 0`, a valid start is guaranteed to exist and the one-pass reset finds it correctly.

### When to use?
- "Find a starting point for a circular traversal."
- "Is there a position from which you can complete the loop with limited resources?"
- Running total that must stay non-negative throughout a circle.
- Circular array where feasibility depends on the starting index.

### When NOT to use?
- When there are multiple valid starting positions and you need all of them.
- When the cost to reach the next station depends on your history or path taken.

### How to recognize in a new problem?
You have a circular array and need to find a starting index such that some running total never goes negative. Key signals: "circular route," "complete the circuit," "sufficient resources at each step." Check if total resources >= total costs (necessary condition), then use the reset trick.

### Simple Example
Input: `gas = [1,2,3,4,5]`, `cost = [3,4,5,1,2]`
Expected output: `3`

Total gas = 15, total cost = 15. Total surplus = 0 >= 0, so a solution exists.
One-pass reset finds start = 3 (stations 0, 1, 2 each cause a negative and get skipped).

### Code
```java
// Java
public int canCompleteCircuit(int[] gas, int[] cost) {
    int totalSurplus = 0;
    int currentSurplus = 0;
    int startStation = 0;
    for (int i = 0; i < gas.length; i++) {
        int diff = gas[i] - cost[i];
        totalSurplus += diff;
        currentSurplus += diff;
        if (currentSurplus < 0) {    // failed from startStation
            startStation = i + 1;    // greedy reset: try next station
            currentSurplus = 0;
        }
    }
    return totalSurplus >= 0 ? startStation : -1;
}
```
```javascript
// JavaScript
function canCompleteCircuit(gas, cost) {
    let totalSurplus = 0;
    let currentSurplus = 0;
    let startStation = 0;
    for (let i = 0; i < gas.length; i++) {
        const diff = gas[i] - cost[i];
        totalSurplus += diff;
        currentSurplus += diff;
        if (currentSurplus < 0) {    // failed from startStation
            startStation = i + 1;    // greedy reset: try next station
            currentSurplus = 0;
        }
    }
    return totalSurplus >= 0 ? startStation : -1;
}
```

### Dry Run
`gas = [1,2,3,4,5]`, `cost = [3,4,5,1,2]`

| i | diff | currentSurplus | < 0 → reset? | startStation |
|---|------|----------------|--------------|--------------|
| 0 | -2 | -2 | YES | 1 |
| 1 | -2 | -2 | YES | 2 |
| 2 | -2 | -2 | YES | 3 |
| 3 | +3 | +3 | NO | 3 |
| 4 | +3 | +6 | NO | 3 |

totalSurplus = 0 >= 0 → return **3**.

### Complexity
```
Time:  O(n) — single pass through all stations
Space: O(1) — three variables only
```

### Common Trap
1. Checking only `totalSurplus >= 0` and returning 0 as the answer — that forgets to track WHERE the valid start actually is.
2. Trying all n starting positions naively — O(n²). The one-pass greedy reset is the key insight that makes this O(n).

### Experience Tip
**Experience Tip:** This is greedy because of the valley argument — once you identify that a stretch of stations is impossible, you can skip them all in one shot without revisiting. There are no overlapping subproblems to memoize. DP would not help here; this is a mathematical property of cumulative sums on a circular array.

### Do Not Confuse With
- **Prefix sum / maximum subarray:** Gas station is not about finding a maximum subarray. It is about finding a starting index for circular feasibility.
- **Simulation:** Do not simulate the full loop from each station — O(n²). The one-pass reset is the entire algorithm.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 860 | Lemonade Change | Easy | Track bills in hand; greedily use the largest valid bill when making change | https://leetcode.com/problems/lemonade-change/ |
| 134 | Gas Station | Medium | Running surplus going negative means the current start candidate is impossible | https://leetcode.com/problems/gas-station/ |

### One-Minute Revision
```
PATTERN:        Gas Station — Running Surplus Reset
IN SIMPLE WORDS: If running surplus goes negative, reset start to the next station
GREEDY CHOICE:  When currentSurplus < 0, valid start must be after the failing station
WHY IT'S SAFE:  Any station between old start and the failing station inherits the same deficit
USE WHEN:       Circular route, running total must stay non-negative, find the starting index
DON'T USE WHEN: Multiple valid starts needed; cost depends on full history
TIME:           O(n)
SPACE:          O(1)
COMMON TRAP:    Returning 0 when totalSurplus >= 0 (forgot to track startStation via reset)
EXPERIENCE TIP: The "valley argument" — valid start is always after the cumulative minimum
```

---

## Task Scheduler — Frequency and Idle Slots

### What is it?
You have a list of tasks labeled A–Z. The CPU must wait at least `n` time units between two executions of the same task (cooldown). Find the minimum total time to finish all tasks. Greedy means: the most frequent task drives the entire schedule structure. Arrange the schedule around it and fill remaining slots with other tasks. Make the best-looking choice at each step without going back.

### Visual
```
Tasks: [A,A,A,B,B,C]   n=2  (2-slot cooldown between same tasks)

Most frequent task: A with count=3.
Frame of size n+1 = 3: each "frame" is [A, _, _]
                                        ↑ fill with other tasks

Frames:  [A, B, C]  [A, B, _]  [A]
                           ↑ idle slot
Time = 3 + 3 + 1 = 7

Formula:
  maxCount = 3
  idleSlots = (maxCount - 1) * n = (3-1) * 2 = 4
  Fill with B (2 slots): idleSlots = 4 - 2 = 2
  Fill with C (1 slot):  idleSlots = 2 - 1 = 1
  Answer = tasks.length + max(0, idleSlots) = 6 + 1 = 7
```

### How does it work?
1. Count the frequency of each task.
2. Find `maxCount` = the highest frequency among all tasks.
3. Compute idle slots forced by the most frequent task: `idleSlots = (maxCount - 1) * n`.
4. Fill idle slots with other tasks (process by frequency descending). Each task of frequency `f` fills `min(f, maxCount - 1)` slots.
5. Remaining idle: `max(0, idleSlots)` — never negative (if tasks are diverse enough, no idle needed).
6. Answer = `tasks.length + remaining idle slots`.
7. The greedy choice: always fill idle slots with the most frequent remaining tasks first.

### Why does it work?
The most frequent task forces the frame structure: there must be `(maxCount - 1)` gaps of `n` slots between its runs. Other tasks fill those gaps. If enough tasks exist to fill all gaps, idle time = 0 and the answer is just `tasks.length`. If not, some idle time is unavoidable. The key insight: filling gaps with the MOST frequent tasks is optimal — it minimizes leftover idle time because those tasks have the most slots to fill.

### When to use?
- "Minimum time to complete all tasks with a cooldown constraint."
- "CPU scheduling where the same task must wait n units."
- Frequency-based constraints on ordering — the most frequent element dominates.

### When NOT to use?
- When tasks have dependencies or ordering constraints beyond cooldown (use topological sort).
- When you need the actual schedule sequence, not just the minimum time (simulate with a max-heap / priority queue).

### How to recognize in a new problem?
You have items of different types, and the same type cannot appear within `n` positions of each other. You want the minimum total length of the sequence. The most frequent type dominates the answer. Key signals: "cooldown," "at least n apart," "same task cannot repeat within k steps."

### Simple Example
Input: `tasks = ['A','A','A','B','B','C']`, `n = 2`
Expected output: `7`

freq: A=3, B=2, C=1. maxCount=3.
idleSlots = (3-1)*2 = 4.
Fill B: 4 - min(2,2) = 2.
Fill C: 2 - min(1,2) = 1.
Answer = 6 + max(0,1) = **7**.

Schedule: `A B C A B _ A`

### Code
```java
// Java
import java.util.Arrays;

public int leastInterval(char[] tasks, int n) {
    int[] freq = new int[26];
    for (char task : tasks) freq[task - 'A']++;
    Arrays.sort(freq);
    int maxCount = freq[25];
    int idleSlots = (maxCount - 1) * n;
    for (int i = 24; i >= 0 && freq[i] > 0; i--) {
        idleSlots -= Math.min(freq[i], maxCount - 1);
    }
    return tasks.length + Math.max(0, idleSlots);
}
```
```javascript
// JavaScript
function leastInterval(tasks, n) {
    const freq = new Array(26).fill(0);
    for (const task of tasks) freq[task.charCodeAt(0) - 65]++;
    freq.sort((a, b) => a - b);
    const maxCount = freq[25];
    let idleSlots = (maxCount - 1) * n;
    for (let i = 24; i >= 0 && freq[i] > 0; i--) {
        idleSlots -= Math.min(freq[i], maxCount - 1);
    }
    return tasks.length + Math.max(0, idleSlots);
}
```

### Dry Run
`tasks = ['A','A','A','B','B','C']`, `n = 2`

After counting: A→freq[0]=3, B→freq[1]=2, C→freq[2]=1.
After sort: `[0, 0, ..., 0, 1, 2, 3]` — freq[23]=1, freq[24]=2, freq[25]=3.

maxCount = 3
idleSlots = (3-1)*2 = 4

| i | freq[i] | min(freq[i], maxCount-1) | idleSlots |
|---|---------|--------------------------|-----------|
| 24 | 2 | min(2,2)=2 | 4-2=2 |
| 23 | 1 | min(1,2)=1 | 2-1=1 |
| 22 | 0 | stop | — |

Answer = 6 + max(0,1) = **7**

### Complexity
```
Time:  O(n) — count tasks O(n) + sort 26 buckets O(1) + one pass O(1)
Space: O(1) — freq array of fixed size 26
```

### Common Trap
1. Forgetting `max(0, idleSlots)`. When tasks are very diverse, the formula can yield negative idle slots — that just means zero idle time, not a negative result.
2. Forgetting that the answer can never be less than `tasks.length`. The correct formula already handles this via `max(0, idleSlots)` since `tasks.length + 0 = tasks.length`.

### Experience Tip
**Experience Tip:** This is greedy + math, not DP or simulation. The key insight is that the MOST FREQUENT task drives the entire structure — you derive the answer from frequency counting, not by simulating every time slot. DP would need to track the full state of all 26 task frequencies at every time step, which is intractable.

### Do Not Confuse With
- **Actual schedule simulation:** If you need the literal task sequence (not just the length), use a max-heap to always pick the highest-frequency available task. The formula here only gives minimum time.
- **Round-robin scheduling:** This is not round-robin. Tasks with equal frequency can be scheduled in any order within a frame.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 621 | Task Scheduler | Medium | Most frequent task sets the frame size; other tasks fill idle slots in the frames | https://leetcode.com/problems/task-scheduler/ |

### One-Minute Revision
```
PATTERN:        Task Scheduler — Frequency and Idle Slots
IN SIMPLE WORDS: Most frequent task forces idle gaps; fill those gaps with other tasks
GREEDY CHOICE:  Fill idle slots with the most frequent remaining tasks first
WHY IT'S SAFE:  High-frequency tasks consume the most idle slots, minimizing wasted time
USE WHEN:       Tasks with cooldown n; CPU scheduling; "at least n apart" constraints
DON'T USE WHEN: Tasks have ordering dependencies; need actual schedule (use max-heap)
TIME:           O(n)
SPACE:          O(1) — 26-bucket freq array is constant size
COMMON TRAP:    Forgetting max(0, idleSlots); answer can never be less than tasks.length
EXPERIENCE TIP: Frequency math replaces simulation — derive the answer, do not build it
```

---

## Candy — Two-Pass Greedy

### What is it?
Children stand in a line, each with a rating. Every child must get at least 1 candy. Any child with a strictly higher rating than their immediate neighbor must get more candy than that neighbor. Find the minimum total candies needed. Greedy means: handle the left-neighbor constraint in a left-to-right pass, handle the right-neighbor constraint in a right-to-left pass, then combine both results by taking the max at each position. Make the locally correct choice at each step without going back.

### Visual
```
Ratings:   1     0     2

Start:   [1]   [1]   [1]   (everyone gets 1 candy initially)

Left pass (if ratings[i] > ratings[i-1], give one more than left neighbor):
  i=1: 0 > 1? NO  → candy[1] stays 1
  i=2: 2 > 0? YES → candy[2] = candy[1]+1 = 2
After left pass: [1, 1, 2]

Right pass (if ratings[i] > ratings[i+1], must beat right neighbor):
  i=1: 0 > 2? NO  → candy[1] stays 1
  i=0: 1 > 0? YES → candy[0] = max(candy[0]=1, candy[1]+1=2) = 2
After right pass: [2, 1, 2]

Total: 2 + 1 + 2 = 5
```

### How does it work?
1. Start with `candy[i] = 1` for all children.
2. **Left pass** (left to right, i = 1 to n-1): If `ratings[i] > ratings[i-1]`, set `candy[i] = candy[i-1] + 1`. This ensures every child beats their left neighbor if their rating is higher.
3. **Right pass** (right to left, i = n-2 to 0): If `ratings[i] > ratings[i+1]`, set `candy[i] = max(candy[i], candy[i+1] + 1)`. This ensures every child beats their right neighbor if their rating is higher.
4. The `max` in step 3 is critical — it preserves the left-pass result if it was already large enough.
5. Sum all `candy[i]`.
6. The greedy choice: give each child exactly as many candies as needed — one more than the neighbor they outrank — no more.

### Why does it work?
The left-neighbor constraint and the right-neighbor constraint are independent directional problems. You can satisfy each in its natural direction without affecting the other. The left pass only uses left neighbors; the right pass only uses right neighbors. Taking `max` combines both results: if a child must beat both neighbors, they need the larger of the two requirements — not the sum. This is safe because each pass only ever increases candy counts, never decreases them.

### When to use?
- Two opposing directional constraints on an array (beat left neighbor AND beat right neighbor).
- "Each element must satisfy a condition relative to both its immediate neighbors."
- The two directions can be handled independently.

### When NOT to use?
- When constraints are cyclic (the last element must also beat the first).
- When the constraint involves more than two neighbors or complex multi-element dependencies.

### How to recognize in a new problem?
You have an array where each element must be "greater than" both its left and right neighbors under certain conditions. The two directions can be handled separately. Signals: "each child must get more than adjacent children with lower ratings," "each element must dominate its neighbors." If you can split the constraint into "left pass" and "right pass," two-pass greedy applies.

### Simple Example
Input: `ratings = [1, 2, 2]`
Expected output: `4`

Left pass: [1, 2, 1] (third child equals second, no increase needed)
Right pass: [1, 2, 1] (no child beats its right neighbor by rating)
Sum: 1+2+1 = **4**

### Code
```java
// Java
import java.util.Arrays;

public int candy(int[] ratings) {
    int n = ratings.length;
    int[] candy = new int[n];
    Arrays.fill(candy, 1);
    // Left pass: satisfy left-neighbor constraint
    for (int i = 1; i < n; i++) {
        if (ratings[i] > ratings[i - 1]) {
            candy[i] = candy[i - 1] + 1;
        }
    }
    // Right pass: satisfy right-neighbor constraint
    for (int i = n - 2; i >= 0; i--) {
        if (ratings[i] > ratings[i + 1]) {
            candy[i] = Math.max(candy[i], candy[i + 1] + 1);
        }
    }
    int total = 0;
    for (int c : candy) total += c;
    return total;
}
```
```javascript
// JavaScript
function candy(ratings) {
    const n = ratings.length;
    const candy = new Array(n).fill(1);
    // Left pass: satisfy left-neighbor constraint
    for (let i = 1; i < n; i++) {
        if (ratings[i] > ratings[i - 1]) {
            candy[i] = candy[i - 1] + 1;
        }
    }
    // Right pass: satisfy right-neighbor constraint
    for (let i = n - 2; i >= 0; i--) {
        if (ratings[i] > ratings[i + 1]) {
            candy[i] = Math.max(candy[i], candy[i + 1] + 1);
        }
    }
    return candy.reduce((sum, c) => sum + c, 0);
}
```

### Dry Run
Input: `ratings = [1, 0, 2]`

Initial candy: `[1, 1, 1]`

Left pass:
| i | ratings[i] > ratings[i-1]? | action | candy |
|---|---------------------------|--------|-------|
| 1 | 0 > 1? NO | stay | [1,1,1] |
| 2 | 2 > 0? YES | candy[2]=candy[1]+1=2 | [1,1,2] |

Right pass:
| i | ratings[i] > ratings[i+1]? | action | candy |
|---|---------------------------|--------|-------|
| 1 | 0 > 2? NO | stay | [1,1,2] |
| 0 | 1 > 0? YES | candy[0]=max(1, candy[1]+1)=max(1,2)=2 | [2,1,2] |

Total: 2+1+2 = **5**

### Complexity
```
Time:  O(n) — two passes through the array
Space: O(n) — the candy array (unavoidable; both pass results must be stored simultaneously)
```

### Common Trap
1. Forgetting the `max()` in the right pass. If you just write `candy[i] = candy[i+1] + 1`, you overwrite the left-pass result and violate the left-neighbor constraint.
2. Trying to do it in one pass. The two directional constraints genuinely require independent passes — you cannot satisfy both simultaneously in a single left-to-right scan.

### Experience Tip
**Experience Tip:** This is greedy (not DP) because at each position, you only need to look one step in each direction — not the entire subproblem history. DP on this would require storing results for all subranges, which is O(n²). The two-pass trick makes each directional constraint independent and O(n). Note that O(n) space is unavoidable here — unlike most greedy patterns that use O(1) space.

### Do Not Confuse With
- **Product of Array Except Self (LeetCode 238):** Uses the same two-pass "left product, right product" structure. But that is a computation problem, not a greedy optimization. The structure is the same; the purpose is different.
- **Trapping Rain Water (LeetCode 42):** Also uses left-max and right-max passes. Recognizing the two-pass structure across these three problems is a useful meta-pattern.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 455 | Assign Cookies | Easy | Simpler one-direction greedy — sort and match smallest sufficient resource | https://leetcode.com/problems/assign-cookies/ |
| 135 | Candy | Hard | Two independent directional constraints; left pass then right pass; take max to combine | https://leetcode.com/problems/candy/ |

### One-Minute Revision
```
PATTERN:        Candy — Two-Pass Greedy
IN SIMPLE WORDS: Left pass handles left-neighbor; right pass handles right-neighbor; take max
GREEDY CHOICE:  Give each child exactly one more candy than the neighbor they outrank
WHY IT'S SAFE:  Two directional constraints are independent; max() combines them correctly
USE WHEN:       "Each element must beat both neighbors" under a condition
DON'T USE WHEN: Cyclic constraints; more than two neighbors; complex multi-element dependencies
TIME:           O(n)
SPACE:          O(n) — candy array is necessary (unlike most greedy patterns)
COMMON TRAP:    Forgetting max() in the right pass; trying a single-pass solution
EXPERIENCE TIP: O(n) space is the price of two independent directional passes
```

---

## Quick Comparison Table

| Pattern | Sort? | Key State Variable(s) | Greedy Choice | Time | Space |
|---------|-------|-----------------------|---------------|------|-------|
| Activity Selection | Yes — by end time | `lastEnd` | Earliest-ending non-overlapping interval | O(n log n) | O(1) |
| Jump Game I | No | `farthest` | Extend frontier as far as possible | O(n) | O(1) |
| Jump Game II | No | `farthest`, `currentEnd` | At level boundary, jump to farthest | O(n) | O(1) |
| Gas Station | No | `currentSurplus`, `start` | Reset start when surplus goes negative | O(n) | O(1) |
| Task Scheduler | Sort freq (26 buckets) | `idleSlots` | Fill idle slots with most frequent tasks | O(n) | O(1) |
| Candy | No | `candy[]` | Give exactly 1 more than the neighbor beaten | O(n) | O(n) |

---

## When Greedy Fails — Use DP Instead

| Problem | Why Greedy Fails | Use Instead |
|---------|-----------------|-------------|
| 0/1 Knapsack | Taking the "best" item blocks a better combination of other items | DP |
| Coin Change (arbitrary coins) | coins=[1,3,4], amount=6: greedy picks 4+1+1=3 coins; optimal is 3+3=2 coins | DP |
| Longest Common Subsequence | A local character match can block a longer global match | DP |
| Edit Distance | The cheapest local edit does not lead to the cheapest global sequence | DP |
| Weighted Interval Scheduling | Taking the highest-value interval early can exclude a better set of intervals | DP |

**The test before committing to greedy:** Try to construct a counterexample for your greedy strategy. If you can find one input where it fails, switch to DP. If you cannot find one after 30 seconds of trying, sketch the exchange argument: "If I swap my greedy choice into any optimal solution, the solution does not get worse."

---

---

## Exchange Argument (Proof Technique)

### What is it?
The exchange argument is NOT an algorithm — it is a **proof technique** used to show that a greedy algorithm is correct. Here is the core idea: assume there is some optimal solution that makes a DIFFERENT choice from your greedy algorithm at some step. Show that if you "swap" its choice to match your greedy choice, the solution does not get worse (it stays equally good or improves). Therefore your greedy choice is at least as good as the optimal choice — and so the greedy algorithm produces an optimal solution.

Think of it like sorting socks: you claim "always grab the matching pair that is easiest to finish first." The exchange argument says: "If the optimal method grabs a different pair first, I can swap the order and the total time cannot go up."

### Visual
```
Problem: Schedule the maximum number of non-overlapping intervals.
Greedy:  Always pick the interval with the EARLIEST END TIME.

Suppose optimal solution OPT uses interval A (ends at time 8)
instead of our greedy choice B (ends at time 5) at step k:

Time:  1   2   3   4   5   6   7   8   9   10
       [     B     ]                           ← greedy choice (ends at 5)
       [             A             ]           ← OPT's choice (ends at 8)
                           [  C  ]             ← next interval, starts at 9

Exchange: in OPT, swap A → B.
  B ends at 5 instead of 8.
  Any interval that could follow A (starts ≥ 8) can still follow B (starts ≥ 5).
  PLUS new intervals starting in [6,7] might now also fit — they couldn't after A.
  → Swapped solution is AT LEAST AS GOOD as OPT. Never worse.

Conclusion: The greedy choice (earliest end) is always at least as good as any other choice.
Therefore the greedy algorithm is optimal. □
```

### How does it work?
To write an exchange argument for any problem:
1. **Name your greedy choice** clearly: "My algorithm always picks X."
2. **Assume OPT differs**: "Suppose an optimal solution OPT makes a different choice Y at some step."
3. **Construct the swap**: "Take OPT and swap Y → X at that step."
4. **Show the swap does not hurt**: "After the swap, the objective value is the same or better."
5. **Conclude**: "So there always exists an optimal solution that agrees with the greedy at every step, meaning our greedy is optimal."

### Why does it work?
If swapping ANY deviation from greedy toward greedy never makes things worse, you can repeatedly apply this swap until the optimal solution looks exactly like the greedy solution. Since you can transform any OPT into a greedy solution without losing quality, the greedy solution must be optimal.

### When to use?
- You need to PROVE that a greedy algorithm is correct.
- An interviewer says "why does your greedy work?" or "prove your solution is optimal."
- Any time you have a sorting-based greedy and need to justify the sort order.

### When NOT to use?
- When no simple swap can be shown to be harmless — greedy likely fails, switch to DP.
- This is a proof technique only; it does not help you design the algorithm itself.

### How to recognize in a new problem?
When an interviewer asks **"Why is your greedy correct?"** or **"Prove your greedy is optimal"** — that is your cue to use the exchange argument. The structure is always: name the greedy choice, name the deviation, show the swap, conclude.

### Simple Example
**Problem:** Job Scheduling — prove that scheduling tasks in order of increasing deadline maximizes tasks completed.

**Exchange argument:**
- Suppose OPT schedules task A (deadline 5) before task B (deadline 3) and they conflict.
- Swap: put B (deadline 3) before A (deadline 5).
- B now runs earlier — it is more likely to meet its deadline (deadline 3 is tighter).
- A runs later — since B finishes at the same time or earlier than A did, and A's deadline (5) is LARGER than B's (3), A still meets its deadline.
- No deadline is newly violated. The swap is harmless.
- By repeatedly swapping any out-of-order adjacent pair, we reach deadline-sorted order — proving it is optimal.

### Code
```java
// There is no code for the exchange argument — it is a proof, not an algorithm.
// The Activity Selection greedy below is proven correct BY exchange argument:

// PROVEN by exchange argument:
// "Picking the interval with the smallest end time is always at least
//  as good as picking any other interval."
public int maxNonOverlapping(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[1] - b[1]); // sort by end time
    int count = 1, lastEnd = intervals[0][1];
    for (int i = 1; i < intervals.length; i++) {
        if (intervals[i][0] >= lastEnd) {
            count++;
            lastEnd = intervals[i][1];
        }
    }
    return count;
}
// The exchange argument JUSTIFIES why sorting by end time is correct.
```
```javascript
// JavaScript — same algorithm, justified by exchange argument
function maxNonOverlapping(intervals) {
    intervals.sort((a, b) => a[1] - b[1]); // sort by end time (exchange argument justifies this)
    let count = 1, lastEnd = intervals[0][1];
    for (let i = 1; i < intervals.length; i++) {
        if (intervals[i][0] >= lastEnd) {
            count++;
            lastEnd = intervals[i][1];
        }
    }
    return count;
}
```

### Dry Run
**Proving the swap is harmless for Activity Selection:**

| Step | OPT chooses | Our greedy | After swap to greedy | Worse? |
|------|------------|------------|----------------------|--------|
| 1 | A (ends at 8) | B (ends at 5) | Replace A with B in OPT | No — B ends earlier, never blocks more future intervals |
| 2+ | Intervals fitting after A | Intervals fitting after B | Everything that fit after A also fits after B, plus more | Never worse |

### Complexity
```
Time/Space: N/A — this is a proof technique, not an algorithm.
The Activity Selection algorithm it justifies runs in O(n log n).
```

### Common Trap
**Not doing the swap properly.** Beginners often say "obviously greedy works" without constructing the swap. Interviewers want to hear: (1) assume OPT differs, (2) define the swap, (3) show it does not hurt, (4) conclude. Skipping any step is not a complete proof and leaves the interviewer unconvinced.

### Experience Tip
**Experience Tip:** When an interviewer asks "why does your greedy work?", say: "I'll prove it by exchange argument." Then walk through the four steps. Even a brief, sketch-level exchange argument impresses interviewers — most candidates just say "it's intuitive." Saying "exchange argument" by name shows you know proof theory, not just gut feeling.

### Do Not Confuse With

| | Exchange Argument | Inductive Proof | Contradiction |
|--|--|--|--|
| What it is | Swap any OPT deviation toward greedy; show it's not worse | Prove base case + inductive step | Assume greedy is wrong, derive contradiction |
| When to use | Greedy correctness proofs | DP optimality, inductive structures | General algorithm correctness |
| Common in | Interval scheduling, job sequencing, Huffman coding | Shortest paths, DP tables | NP-hardness reductions |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal | Link |
|---|---------|------------|----------------|------|
| 435 | Non-overlapping Intervals | Medium | Sort-by-end greedy proven by exchange argument | https://leetcode.com/problems/non-overlapping-intervals/ |
| 452 | Minimum Number of Arrows to Burst Balloons | Medium | Same exchange argument justifies sort-by-end | https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/ |
| 1029 | Two City Scheduling | Medium | Sort by cost difference; exchange argument justifies this ordering | https://leetcode.com/problems/two-city-scheduling/ |
| 455 | Assign Cookies | Easy | Greedy: assign smallest sufficient cookie; exchange argument shows swapping never helps | https://leetcode.com/problems/assign-cookies/ |
| 135 | Candy | Hard | Two-pass greedy; each pass independently justified by local exchange | https://leetcode.com/problems/candy/ |
| 406 | Queue Reconstruction by Height | Medium | Greedy sort order proven by exchange argument | https://leetcode.com/problems/queue-reconstruction-by-height/ |

### One-Minute Revision
```
TECHNIQUE:      Exchange Argument
IN SIMPLE WORDS: To prove greedy is correct: assume OPT differs at some step,
                 swap OPT's choice to match greedy, show the swap never makes things worse.
USE WHEN:       Interviewer asks "why does your greedy work?" or "prove optimality."
STEPS:          1. Name the greedy choice.
                2. Assume OPT makes a different choice somewhere.
                3. Swap OPT's choice to the greedy choice.
                4. Show the swap does not increase cost or decrease value.
                5. Conclude greedy is optimal.
KEY EXAMPLES:   Activity Selection (sort by end), Job Sequencing by deadline, Huffman Coding.
COMMON TRAP:    Just saying "it's obvious" — you MUST show the swap is harmless explicitly.
EXPERIENCE TIP: Say "exchange argument" by name and walk all 4 steps. Most candidates skip this.
```

---

## Huffman Coding

### What is it?
Huffman Coding is a lossless data compression algorithm. The core idea: assign shorter binary codes to characters that appear MORE frequently, and longer codes to characters that appear less frequently. This is **variable-length encoding** — unlike fixed-length encoding where every character gets the same number of bits, frequent characters get cheap (short) codes.

Real-world analogy: Morse code does this intuitively — the letter 'E' (most common in English) is just one dot `.`, while 'Z' (rare) is `--..`. Huffman Coding makes this formally optimal using a min-heap and a binary tree.

### Visual
```
Characters and their frequencies: a:5  b:3  c:1  d:1

Step 1 — Load all into a min-heap (smallest frequency = highest priority):
  Heap: [c:1, d:1, b:3, a:5]

Step 2 — Pop two smallest (c:1 and d:1), merge into internal node cd:2, push back:
  Heap: [cd:2, b:3, a:5]

Step 3 — Pop two smallest (cd:2 and b:3), merge into node cdb:5, push back:
  Heap: [a:5, cdb:5]

Step 4 — Pop two smallest (a:5 and cdb:5), merge into root:10.
  Heap: [root:10]  ← done (one node left)

Final Huffman Tree:
         [root:10]
        /          \
      a:5          [5]
    (left=0)      /    \
                b:3    [2]
              (left=0) /    \
                      c:1   d:1
                    (left=0)(right=1)

Codes (path from root: left edge = 0, right edge = 1):
  a → 0      (1 bit  — most frequent, shortest code)
  b → 10     (2 bits)
  c → 110    (3 bits)
  d → 111    (3 bits — least frequent, longest code)
```

### How does it work?
1. Count the frequency of each character in the input.
2. Insert all characters into a **min-heap** (priority queue, lowest frequency first).
3. While the heap has more than one node:
   - Pop the two nodes with the smallest frequencies (`left` and `right`).
   - Create a new internal node: `freq = left.freq + right.freq`.
   - Set `left` and `right` as its children.
   - Push the new node back into the heap.
4. The last remaining node is the **root** of the Huffman tree.
5. Traverse the tree: going LEFT appends `0`, going RIGHT appends `1`. The path from root to each leaf is that character's code.

### Why does it work?
By always merging the two LEAST frequent nodes, less frequent characters end up deeper in the tree (longer path = longer code) while frequent characters stay near the root (shorter path = shorter code). This is provably optimal: Huffman coding produces the minimum possible average code length for a given frequency distribution. The exchange argument confirms this — swapping the two least-frequent nodes with any other pair only increases the average code length.

### When to use?
- Data compression: file compression (ZIP, gzip use variants of this idea).
- When you need an optimal prefix-free code for a known frequency distribution.
- Any problem that says "repeatedly merge the two smallest items and minimize total cost" — that is Huffman in disguise.

### When NOT to use?
- When character frequencies are not known in advance (use adaptive Huffman coding).
- When you only need to compress once and decode speed matters most (Arithmetic coding may be better).

### How to recognize in a new problem?
Signals:
- "Build an optimal encoding where more frequent characters have shorter codes."
- "Minimum total cost to merge all items, where cost = sum of the two merged items."
- "Connect ropes with minimum cost" — any problem where you iteratively merge the two cheapest things is essentially Huffman Coding.

### Simple Example
**Input:** `frequencies = {a:5, b:3, c:1, d:1}`
**Output:** Codes `{a:"0", b:"10", c:"110", d:"111"}`

**Bit cost comparison:**
```
Huffman:
  a: 5 × 1 bit  =  5 bits
  b: 3 × 2 bits =  6 bits
  c: 1 × 3 bits =  3 bits
  d: 1 × 3 bits =  3 bits
  Total: 17 bits

Fixed-length (need 2 bits per char since 4 chars need ⌈log2(4)⌉=2 bits):
  Total = (5+3+1+1) × 2 = 20 bits

Huffman saves 3 bits — bigger savings on realistic text.
```

### Code
```java
// Java — Build Huffman tree and extract codes
import java.util.PriorityQueue;

class HuffmanNode {
    char ch; int freq;
    HuffmanNode left, right;
    HuffmanNode(char ch, int freq) { this.ch = ch; this.freq = freq; }
    HuffmanNode(int freq, HuffmanNode l, HuffmanNode r) {
        this.ch = '\0'; this.freq = freq; this.left = l; this.right = r;
    }
}

public Map<Character, String> buildHuffman(Map<Character, Integer> freqMap) {
    PriorityQueue<HuffmanNode> minHeap =
        new PriorityQueue<>((a, b) -> a.freq - b.freq);

    for (Map.Entry<Character, Integer> e : freqMap.entrySet()) {
        minHeap.offer(new HuffmanNode(e.getKey(), e.getValue()));
    }

    while (minHeap.size() > 1) {
        HuffmanNode left  = minHeap.poll();  // smallest frequency
        HuffmanNode right = minHeap.poll();  // second smallest
        minHeap.offer(new HuffmanNode(left.freq + right.freq, left, right));
    }

    Map<Character, String> codes = new HashMap<>();
    traverse(minHeap.poll(), "", codes);
    return codes;
}

private void traverse(HuffmanNode node, String code, Map<Character, String> codes) {
    if (node == null) return;
    if (node.left == null && node.right == null) {   // leaf node
        codes.put(node.ch, code.isEmpty() ? "0" : code);  // handle single-char input
        return;
    }
    traverse(node.left,  code + "0", codes);
    traverse(node.right, code + "1", codes);
}
```
```javascript
// JavaScript — Huffman Coding (using sorted array as simple min-heap)
function buildHuffman(freqMap) {
    let heap = Object.entries(freqMap)
        .map(([ch, freq]) => ({ ch, freq, left: null, right: null }))
        .sort((a, b) => a.freq - b.freq);

    while (heap.length > 1) {
        const left  = heap.shift();  // smallest
        const right = heap.shift();  // second smallest
        const merged = { ch: null, freq: left.freq + right.freq, left, right };
        // Insert merged back in sorted position
        const idx = heap.findIndex(n => n.freq > merged.freq);
        heap.splice(idx === -1 ? heap.length : idx, 0, merged);
    }

    const codes = {};
    function traverse(node, code) {
        if (!node.left && !node.right) { codes[node.ch] = code || "0"; return; }
        traverse(node.left,  code + "0");
        traverse(node.right, code + "1");
    }
    traverse(heap[0], "");
    return codes;
}
```

### Dry Run
**Input:** `{a:5, b:3, c:1, d:1}`

| Step | Heap contents (sorted by freq) | Action |
|------|-------------------------------|--------|
| Start | [c:1, d:1, b:3, a:5] | — |
| 1 | Pop c:1 and d:1 → merge to cd:2 → push | [cd:2, b:3, a:5] |
| 2 | Pop cd:2 and b:3 → merge to cdb:5 → push | [a:5, cdb:5] |
| 3 | Pop a:5 and cdb:5 → merge to root:10 → push | [root:10] |
| Done | One node remains — traverse for codes | |

**Codes (left=0, right=1):**
- root → left → a: `"0"`
- root → right → left → b: `"10"`
- root → right → right → left → c: `"110"`
- root → right → right → right → d: `"111"`

### Complexity
```
Time:  O(n log n) — n-1 merges, each heap push/pop costs O(log n)
Space: O(n) — heap and tree nodes; O(n) for the codes map
```

### Common Trap
**Forgetting the single-character case.** If the input has only one distinct character (e.g., `"aaaaa"`), the heap starts with one node and the `while` loop never runs. That character gets no tree path — you must assign it code `"0"` manually. The `code.isEmpty() ? "0" : code` guard in the leaf check handles this correctly.

### Experience Tip
**Experience Tip:** In interviews, Huffman Coding appears most often disguised as a "minimum cost to merge all elements" problem. "Connect ropes with minimum cost" (LeetCode 1167), "minimum cost to combine stones," "least cost to merge sorted files" — all of these reduce to: always merge the two cheapest items, total cost = sum of all merge costs. Recognize this shape: two smallest items + merge + push back = Huffman.

### Do Not Confuse With

| | Huffman Coding | Fixed-Length Encoding |
|--|--|--|
| Code length per char | Variable — frequent chars get shorter codes | Same for every character |
| Optimality | Provably optimal for known frequency distribution | Simple but wasteful |
| Example | 'e' might get 3 bits, 'z' might get 12 bits | ASCII: every char is always 8 bits |
| Requires | Frequency table + prefix-free tree construction | Just the alphabet size |
| Compression ratio | Better — exploits frequency skew | None, or minimal |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal | Link |
|---|---------|------------|----------------|------|
| 1167 | Minimum Cost to Connect Sticks | Medium | Merge two smallest sticks repeatedly — Huffman in disguise | https://leetcode.com/problems/minimum-cost-to-connect-sticks/ |
| 1046 | Last Stone Weight | Easy | Merge two largest stones — same heap mechanic, inverted | https://leetcode.com/problems/last-stone-weight/ |
| 23 | Merge K Sorted Lists | Hard | Min-heap merge — same heap mechanics as Huffman tree building | https://leetcode.com/problems/merge-k-sorted-lists/ |
| 621 | Task Scheduler | Medium | Frequency-driven greedy — same core intuition | https://leetcode.com/problems/task-scheduler/ |
| 347 | Top K Frequent Elements | Medium | Build frequency map then heap — Huffman warm-up | https://leetcode.com/problems/top-k-frequent-elements/ |
| 502 | IPO | Hard | Two-heap greedy — min-heap for cost, max-heap for profit | https://leetcode.com/problems/ipo/ |

### One-Minute Revision
```
ALGORITHM:      Huffman Coding
IN SIMPLE WORDS: Assign shorter codes to more frequent characters using a min-heap tree.
                 Always merge the two LEAST frequent nodes.
USE WHEN:       Optimal prefix-free encoding; "connect ropes/stones with minimum cost."
DON'T USE WHEN: Frequencies unknown in advance; very large alphabets with decode speed focus.
CORE IDEA:      Frequent chars → close to root → short path → short code.
BUILD:          1. Add all chars to min-heap.
                2. Pop 2 smallest, merge (sum frequencies), push back. Repeat until 1 node.
                3. Traverse tree: left edge = 0, right edge = 1.
TIME:           O(n log n)
SPACE:          O(n)
COMMON TRAP:    Single-character input — loop never runs; assign code "0" manually.
EXPERIENCE TIP: "Connect ropes with min cost" = Huffman. Always merge the two cheapest.
VS FIXED-LENGTH: Variable-length saves bits by exploiting frequency skew; fixed is simpler.
```

---

*Next: [14-BIT-MANIPULATION.md](14-BIT-MANIPULATION.md)*
