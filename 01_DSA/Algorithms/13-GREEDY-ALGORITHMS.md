# Greedy Algorithms — 1-Hour Learning Module

> *"Greedy is the art of proving that being short-sighted is enough. If you can show that the locally optimal choice never needs to be undone, you have a greedy solution."*

**Estimated Time:** 60 minutes | **Level:** Beginner-Intermediate | **Goal:** Google SWE Interview Readiness

---

## Table of Contents

1. [[0–10 min] Big Picture](#0-10-min-big-picture)
2. [[10–20 min] Mental Model](#10-20-min-mental-model)
3. [[20–35 min] Core Pattern](#20-35-min-core-pattern)
4. [[35–45 min] Concrete Code + Dry Run](#35-45-min-concrete-code--dry-run)
5. [[45–55 min] Pattern Recognition](#45-55-min-pattern-recognition)
6. [[55–60 min] Final Mental Checklist](#55-60-min-final-mental-checklist)
7. [Active Recall](#active-recall)
8. [Recommended Practice Direction](#recommended-practice-direction)
9. [2-Minute Cheat Sheet](#2-minute-cheat-sheet)
10. [Advanced Awareness](#advanced-awareness)

---

## [0–10 min] Big Picture

### What is Greedy and Why Does It Exist?

Imagine you are making change for 41 cents using US coins (quarters, dimes, nickels, pennies). The intuitive strategy: always pick the largest coin that fits. 25 + 10 + 5 + 1 = 41 cents in 4 coins. Could you do better? No. This is a greedy algorithm — at each step, make the locally best choice, and it turns out that produces the globally best answer.

Greedy algorithms exist because many optimization problems have a magical property: you do not need to try all combinations. One pass, one decision at a time, always choosing the "best-looking" option — and you are done. This gives you O(n) or O(n log n) solutions to problems that might otherwise require exponential backtracking or O(n²) dynamic programming.

**The core idea in one sentence:** Make the locally optimal choice at each step and never look back.

### The Problem Greedy Solves

Without greedy thinking, optimization problems default to:
- **Brute force / backtracking:** Try everything — exponential time.
- **Dynamic programming:** Store all subproblem solutions — polynomial but often O(n²) or O(n³) space/time.

Greedy cuts through this when the problem structure allows it: you never need to reconsider a decision.

### A Second Analogy: Activity Scheduling

You have a room and a list of meetings with start/end times. You want to fit as many meetings as possible. Greedy answer: always pick the meeting that ends the soonest. Why? Because finishing early leaves the most room for future meetings. This is not obvious — it requires proof — but it works. That proof is what separates a correct greedy algorithm from a lucky guess.

### Keywords That Suggest Greedy

- "Minimum number of..." / "Maximum number of..."
- "Fewest..." / "Most..."
- "Earliest..." / "Optimal ordering..."
- "Can you reach..." / "Minimum cost to..."

---

## [10–20 min] Mental Model

### The Greedy Choice Property

A greedy algorithm is correct when it has the **greedy choice property**: a locally optimal choice leads to a globally optimal solution. This is not true for all problems. For 0/1 Knapsack, taking the highest-value item first can prevent you from filling the bag with a better combination. The property must be proven, not assumed.

**Why does it hold for some problems?**

Think of it this way: if your greedy choice at step 1 is always "at least as good as" any other first choice, and the remaining subproblem is structurally identical to the original (optimal substructure), then induction does the rest. The greedy choice never closes off a better path — it either opens the same paths or more.

### The Exchange Argument (Correctness Intuition)

This is the standard way to prove a greedy algorithm correct. You do not need to write a formal proof in an interview — but you need to be able to sketch the argument in 2–3 sentences.

**Structure of the exchange argument:**
1. Assume there exists an optimal solution OPT that differs from your greedy solution G.
2. Find the first point where they differ.
3. Show you can swap OPT's choice at that point to match G's choice without making the solution worse.
4. Repeat until OPT = G. Therefore G is optimal.

**Example — Activity Selection (sort by end time):**
"Suppose the optimal solution chose interval A that ends later than our greedy choice B (which ends earlier). We can swap A for B in the optimal solution. B ends earlier, so it conflicts with at most as many future intervals as A did. The solution is no worse. Therefore, always picking the earliest-ending interval is safe."

**Example — Assign Cookies:**
"If we gave a large cookie to a small-greed child, we could swap it for the smallest cookie that still satisfies that child, freeing the large cookie for a harder-to-satisfy child. This can only improve or maintain the count of satisfied children."

### When Greedy FAILS

The exchange argument breaks when one choice genuinely forecloses a better combination:

| Problem | Why Greedy Fails |
|---|---|
| 0/1 Knapsack | Taking item A might prevent the better combo B+C |
| Coin Change (arbitrary denominations) | Example: coins [1,3,4], amount=6. Greedy picks 4+1+1=3 coins. Optimal is 3+3=2 coins. |
| Longest Common Subsequence | Greedy matching misses globally longer matches |
| Edit Distance | Local cheapest operation ≠ globally cheapest sequence |

**The test for greedy:** Before committing to a greedy approach in an interview, mentally try to construct a counterexample. If you can find one input where the greedy fails, it is not greedy. If you cannot find one after 30 seconds of trying, argue the exchange argument.

### The Mental Model to Carry

> **"Can I make a locally optimal decision that is provably safe?"**
>
> Always ask: what is my greedy choice? Why won't I regret it later?

---

## [20–35 min] Core Pattern

### How to Recognize a Greedy Problem

1. The problem asks for an **optimal value** (min/max count, cost, length).
2. You can identify a **clear ordering or priority** for decisions.
3. Making a choice **does not invalidate** future choices in a way that requires revisiting.
4. You can argue (even informally) that the choice is **safe via exchange argument**.
5. There are **no overlapping subproblems** that need to be memoized — each step is fresh.

### Why Greedy is NOT Dynamic Programming

DP stores solutions to overlapping subproblems because the answer to subproblem (i) is needed by multiple larger subproblems. Greedy never needs to look back — there is only one relevant "current state," and the greedy choice moves it forward irreversibly. If you find yourself thinking "I need to remember what I chose 3 steps ago to decide now," that is DP, not greedy.

### Classic Greedy Patterns

#### Pattern 1: Sort + Scan (Activity Selection / Interval Scheduling)

**The greedy choice:** Always pick the interval that ends earliest.

**Why is it safe?** Any interval ending earlier than another can substitute for it in any valid solution (exchange argument above). By always picking the earliest-ending valid interval, we maximize room for future intervals.

**Algorithm:**
1. Sort intervals by end time.
2. Pick the first interval. Track `lastEnd`.
3. For each subsequent interval: if `start >= lastEnd`, pick it (update `lastEnd`).
4. Count = maximum non-overlapping intervals.

**Variants:**
- **Non-overlapping Intervals (minimum removal):** Answer = total intervals − count above.
- **Minimum Arrows to Burst Balloons:** Same structure. An arrow at x bursts all balloons whose range contains x. Minimum arrows = minimum set of "stab points" = equivalent to maximum non-overlapping intervals.

**Complexity:** O(n log n) time, O(1) space.

#### Pattern 2: Track Frontier (Jump Game Family)

**Jump Game I — can you reach the end?**

**The greedy choice:** At each position, extend the farthest reachable index.

**Why is it safe?** If you can reach index i, you can reach every index up to `i + nums[i]`. There is no benefit to "saving" a jump — reaching farther is always better.

- Track `farthest = 0`.
- At each index i (while i ≤ farthest): `farthest = max(farthest, i + nums[i])`.
- If `farthest >= last index`: return true.

**Jump Game II — minimum jumps:**

**The greedy choice:** From your current "level" (the range reachable in exactly k jumps), always jump to the farthest reachable position.

**Why is it safe?** You are making a BFS-level-by-level expansion. Every position in the current level can be reached in k jumps. The next level is everything reachable from the current level in one more jump. You want the widest possible next level.

- `jumps = 0`, `curEnd = 0`, `farthest = 0`.
- For each i from 0 to n-2: `farthest = max(farthest, i + nums[i])`. When `i == curEnd`: `jumps++`, `curEnd = farthest`.

**Complexity:** O(n) time, O(1) space.

#### Pattern 3: Running Surplus Reset (Gas Station)

**The greedy choice:** If your running tank surplus goes negative, the current start is impossible — move start to the next station.

**Why is it safe?** If you cannot complete the circuit starting at any station in [0, k], you cannot complete it starting at any station in [0, k] even with a running start — the cumulative deficit is too large. The valid start must come after the "lowest valley" of the cumulative surplus. This is a one-pass reset argument.

**Algorithm:**
1. If sum(gas) < sum(cost): impossible, return -1.
2. Track `surplus = 0`, `start = 0`.
3. For each i: `surplus += gas[i] - cost[i]`. If `surplus < 0`: `start = i+1`, `surplus = 0`.
4. Return `start`.

**Complexity:** O(n) time, O(1) space.

#### Pattern 4: Two-Pass Greedy (Candy)

**The greedy choice:** Handle left-neighbor constraint left-to-right, then right-neighbor constraint right-to-left. Combine by taking the stricter (max) of the two passes.

**Why is it safe?** The two constraints are independent directionally. Satisfying each in its natural direction and combining guarantees both are met simultaneously.

**Algorithm:**
1. Initialize `candy[i] = 1` for all i.
2. Left pass: if `rating[i] > rating[i-1]`: `candy[i] = candy[i-1] + 1`.
3. Right pass: if `rating[i] > rating[i+1]`: `candy[i] = max(candy[i], candy[i+1] + 1)`.
4. Return sum of `candy[]`.

**Complexity:** O(n) time, O(n) space.

**This two-pass pattern recurs in:** Trapping Rain Water (left max, right max), Product of Array Except Self (left product, right product).

#### Pattern 5: Sort Both Arrays (Assign Cookies)

**The greedy choice:** Assign the smallest cookie that satisfies the least greedy child first.

**Why is it safe?** Exchange argument: if you gave a larger cookie to a less greedy child, you could swap it with the smaller cookie (still satisfying that child) and potentially satisfy a greedier child with the larger cookie. Wasting larger cookies on smaller greed is never optimal.

**Algorithm:**
1. Sort both `greed[]` and `sizes[]`.
2. Two pointers g (children) and s (cookies), both start at 0.
3. If `sizes[s] >= greed[g]`: satisfied, g++, s++. Else: s++.
4. Return g (number of satisfied children).

**Complexity:** O(n log n) time, O(1) space.

#### Pattern 6: Expand Window Until Cut (Partition Labels)

**The greedy choice:** Expand the current partition to include the last occurrence of every character seen within it.

**Why is it safe?** Any character that appears within the current window must be fully contained in the partition (otherwise it appears in two partitions). So you must extend at least until all last occurrences are covered. Cutting exactly there (and not later) is the greedy minimum.

**Algorithm:**
1. Record `last[c]` = last index where character c appears.
2. Scan left to right. Track `end = last[s[0]]`, `partitionStart = 0`.
3. At each index i: `end = max(end, last[s[i]])`.
4. When `i == end`: partition boundary found. Record length = `i - partitionStart + 1`. Set `partitionStart = i+1`.

**Complexity:** O(n) time, O(1) space (26-character alphabet).

#### Pattern 7: Process Largest First, Insert at Index k (Queue Reconstruction by Height)

**The greedy choice:** Sort by height descending (ties: k ascending). Insert each person at index k.

**Why is it safe?** When inserting person P, all previously placed people are taller or equal. So the count of people ≥ P's height in front of P equals exactly k (counting only the already-placed people, which are all ≥ P). Inserting at index k is therefore always correct for P. Shorter people placed later do not affect P's count because P is taller than them.

**Algorithm:**
1. Sort: descending height, ascending k for ties.
2. Result list starts empty.
3. For each person: `result.add(k, person)` (insert at index k).
4. Return result.

**Complexity:** O(n²) due to list insertions, O(n) space.

### The Sort Order Is the Greedy Criterion

Many greedy algorithms are primarily about *what to sort by*. The sort reveals the priority:

| Sort By | Problem |
|---|---|
| End time | Activity selection, non-overlapping intervals |
| Start time | Merge intervals, meeting rooms |
| Value/weight ratio | Fractional Knapsack |
| Height descending | Queue reconstruction |
| Frequency ascending | Huffman encoding (min-heap) |
| Difference (profit - cost) | Task assignment optimization |

---

## [35–45 min] Concrete Code + Dry Run

### Pattern 1: Activity Selection — Non-overlapping Intervals

**Problem:** Given intervals, find the minimum number to remove so no two overlap.
(Equivalently: find the maximum number of non-overlapping intervals, then subtract from total.)

**Java:**
```java
import java.util.Arrays;

public int eraseOverlapIntervals(int[][] intervals) {
    if (intervals.length == 0) return 0;
    // Sort by end time — greedy criterion
    Arrays.sort(intervals, (a, b) -> a[1] - b[1]);
    int count = 1;          // always keep the first interval
    int lastEnd = intervals[0][1];
    for (int i = 1; i < intervals.length; i++) {
        if (intervals[i][0] >= lastEnd) {
            // No overlap: greedy pick
            count++;
            lastEnd = intervals[i][1];
        }
        // Otherwise: skip (remove this interval)
    }
    return intervals.length - count;
}
```

**TypeScript:**
```typescript
function eraseOverlapIntervals(intervals: number[][]): number {
    if (intervals.length === 0) return 0;
    // Sort by end time
    intervals.sort((a, b) => a[1] - b[1]);
    let count = 1;
    let lastEnd = intervals[0][1];
    for (let i = 1; i < intervals.length; i++) {
        if (intervals[i][0] >= lastEnd) {
            count++;
            lastEnd = intervals[i][1];
        }
    }
    return intervals.length - count;
}
```

**Dry Run** on `[[1,2],[2,3],[3,4],[1,3]]`:

After sorting by end time: `[[1,2],[2,3],[1,3],[3,4]]`

| Step | Interval | Start >= lastEnd? | Action | count | lastEnd |
|---|---|---|---|---|---|
| Init | [1,2] | — | Keep first | 1 | 2 |
| i=1 | [2,3] | 2 >= 2? YES | Keep | 2 | 3 |
| i=2 | [1,3] | 1 >= 3? NO | Skip | 2 | 3 |
| i=3 | [3,4] | 3 >= 3? YES | Keep | 3 | 4 |

Maximum non-overlapping = 3. Minimum removals = 4 - 3 = **1**. (Remove [1,3].)

**Greedy choices made:** At i=2, [1,3] conflicts with [2,3] which we already kept. We skip [1,3] because it ends later and already overlaps — keeping it would only hurt future choices. This is the exchange argument in action.

---

### Pattern 2: Jump Game II — Minimum Jumps

**Problem:** Given `nums`, find the minimum number of jumps to reach the last index.

**Java:**
```java
public int jump(int[] nums) {
    int jumps = 0;
    int curEnd = 0;    // boundary of current "level"
    int farthest = 0;  // farthest reachable from current level
    for (int i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (i == curEnd) {
            // Must jump: extend to the farthest we can reach
            jumps++;
            curEnd = farthest;
        }
    }
    return jumps;
}
```

**TypeScript:**
```typescript
function jump(nums: number[]): number {
    let jumps = 0;
    let curEnd = 0;
    let farthest = 0;
    for (let i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (i === curEnd) {
            jumps++;
            curEnd = farthest;
        }
    }
    return jumps;
}
```

**Dry Run** on `[2, 3, 1, 1, 4]`:

| i | nums[i] | farthest | i == curEnd? | jumps | curEnd |
|---|---|---|---|---|---|
| 0 | 2 | max(0, 0+2)=2 | YES (0==0) | 1 | 2 |
| 1 | 3 | max(2, 1+3)=4 | NO | 1 | 2 |
| 2 | 1 | max(4, 2+1)=4 | YES (2==2) | 2 | 4 |
| 3 | 1 | max(4, 3+1)=4 | NO | 2 | 4 |

Loop ends (i only goes to n-2=3). Answer = **2** jumps. (Jump from 0→1, then 1→4.)

**Greedy choices made:** At i=0 (curEnd hit), we jump and extend to farthest=2. At i=2 (curEnd hit again), we jump and extend to 4. We always use the jump that reaches the farthest possible next level — that is the greedy choice.

---

## [45–55 min] Pattern Recognition

### When to Choose Greedy Over DP

| Signal | Lean Toward |
|---|---|
| "Can I always pick the best available option without regret?" | Greedy |
| "Does picking item A prevent a better combo B+C?" | DP |
| "The problem is about ordering/scheduling/selection with a natural priority" | Greedy |
| "I need to track multiple previous states to decide now" | DP |
| "Exchange argument works: swap greedy choice in with no penalty" | Greedy |
| "Counterexample exists for any greedy I try" | DP or Backtracking |

### Structural Clues for Greedy

1. **Sorting reveals the answer:** If sorting by some criterion makes the optimal choice obvious at each step, it is probably greedy.
2. **One decision variable moves forward:** There is a single "frontier" (lastEnd, farthest, surplus) that advances monotonically.
3. **No state explosion:** You do not need an array of previous solutions — just a few variables.
4. **"Always pick the extreme":** Always pick the earliest-ending, farthest-reaching, smallest-sufficient, most-frequent — one superlative drives the whole algorithm.

### Distinguishing Greedy vs DP vs Sorting-Based Solutions

| Problem | Approach | Key Reason |
|---|---|---|
| Activity Selection | Greedy | Earliest end time; exchange argument holds |
| 0/1 Knapsack | DP | Taking one item can prevent better combinations |
| Fractional Knapsack | Greedy | Can take fractions; best ratio always safe |
| Coin Change (arbitrary coins) | DP | Greedy fails: [1,3,4], amount=6 |
| Coin Change (US coins) | Greedy | Mathematical property of canonical coin systems |
| Jump Game I | Greedy | Just track farthest frontier |
| Jump Game II | Greedy | BFS-level extension; always extend to max |
| Edit Distance | DP | Local cheapest op ≠ globally cheapest sequence |
| Merge Intervals | Sort + Scan | Sort by start, merge overlapping — not an optimization problem |
| Trapping Rain Water | Two-pass Greedy / Two-pointer | Left max, right max determines water at each cell |

### Common Greedy Mistakes in Interviews

1. **Not explaining WHY.** Saying "this is greedy, sort by X" without explaining the exchange argument will cost you points at Google.
2. **Sorting by the wrong criterion.** For activity selection, sorting by START time is wrong; sort by END time.
3. **Confusing "sorting-based" with "greedy."** Merge Intervals is sort + scan, not a greedy optimization. Know the difference.
4. **Assuming greedy works without checking.** Always try a quick counterexample mentally before committing.
5. **Missing edge cases.** What if all intervals overlap? What if the array has one element?

---

## [55–60 min] Final Mental Checklist

When you see an optimization problem in an interview, run through this checklist:

**Step 1: Identify the type**
- [ ] Does it ask for min/max count, cost, or value?
- [ ] Is there a natural "best" choice at each step?

**Step 2: Formulate the greedy choice**
- [ ] What exactly is the "locally optimal" decision?
- [ ] Can I state it in one sentence? ("Always pick the interval that ends earliest.")

**Step 3: Prove it (exchange argument sketch)**
- [ ] If I swap my greedy choice for any other choice in an optimal solution, does it get worse?
- [ ] Can I argue in 2 sentences that the swap is safe?

**Step 4: Check for counterexamples**
- [ ] Can I build an input where the greedy fails?
- [ ] If yes → DP. If no after 30 seconds of trying → proceed with greedy.

**Step 5: Identify the sort order (if any)**
- [ ] Does sorting by some criterion make the greedy choice obvious?
- [ ] What is the correct sort key? (end time vs start time vs ratio vs height, etc.)

**Step 6: Code it**
- [ ] Use a single pass after sorting (most greedy algorithms).
- [ ] Track only the necessary state variables (lastEnd, farthest, surplus, count).
- [ ] Handle edge cases: empty input, single element, all overlapping.

**Step 7: Verify complexity**
- [ ] Most greedy algorithms: O(n log n) due to sorting, O(1) extra space.
- [ ] If you need O(n²), ask yourself if there is a smarter data structure (heap, etc.).

---

## Active Recall

Test yourself before moving on. Close your notes and answer these:

1. What are the two properties a problem must have for greedy to work?
2. Explain the exchange argument in your own words. How would you sketch it for Activity Selection in an interview?
3. For Interval Scheduling (maximum non-overlapping intervals), why do we sort by END time and not START time?
4. Jump Game I and Jump Game II both use greedy. What is the greedy choice in each? Why is each choice safe?
5. Gas Station: if the running surplus goes negative at station k, why can we safely reset start to k+1 (and not k+2 or earlier)?
6. Candy: why does a two-pass greedy work? Why can't you do it in one pass?
7. For Coin Change with coins [1, 3, 4] and amount 6, show that greedy fails and DP gives the correct answer of 2.
8. What is the difference between "greedy" and "sort + scan"? Give an example of each.
9. Queue Reconstruction by Height: why must we insert shorter people AFTER taller people? What breaks if you reverse the order?
10. You see a new problem: "minimum number of platforms needed at a railway station." Is this greedy, DP, or something else? How would you start?

---

## Recommended Practice Direction

Work through these in order. For each problem, before looking at the solution: (a) state the greedy choice, (b) argue why it is safe, (c) then code it.

**Tier 1 — Must-solve for interviews:**
- LeetCode 435: Non-overlapping Intervals
- LeetCode 452: Minimum Number of Arrows to Burst Balloons
- LeetCode 55: Jump Game
- LeetCode 45: Jump Game II
- LeetCode 134: Gas Station
- LeetCode 455: Assign Cookies
- LeetCode 763: Partition Labels

**Tier 2 — Solidify the patterns:**
- LeetCode 135: Candy
- LeetCode 406: Queue Reconstruction by Height
- LeetCode 56: Merge Intervals (sort + scan, not optimization)
- LeetCode 253: Meeting Rooms II (interval partitioning — NOT greedy, use heap)
- LeetCode 860: Lemonade Change
- LeetCode 1029: Two City Scheduling

**Tier 3 — Stretch problems:**
- LeetCode 621: Task Scheduler (greedy + counting)
- LeetCode 1353: Maximum Number of Events That Can Be Attended
- LeetCode 1647: Minimum Deletions to Make Character Frequencies Unique
- LeetCode 2136: Earliest Possible Day of Full Bloom

**When practicing, always ask yourself:** "Is this actually greedy, or is it DP that happens to look greedy?" The Coin Change problem is the canonical example of a greedy intuition that is wrong.

---

## 2-Minute Cheat Sheet

```
GREEDY ALGORITHM — QUICK REFERENCE
====================================

IDENTIFY:   Problem asks for min/max. Clear priority/ordering exists.
            Making one choice does NOT invalidate others.

PROVE:      Exchange argument: "Swapping greedy choice in never worsens the solution."

SORT KEY MATTERS:
  Intervals (max non-overlapping) → sort by END time
  Intervals (merge)               → sort by START time
  Cookies / Fractional knapsack   → sort both arrays, match greedily
  Queue reconstruction            → sort by height desc, k asc

PATTERNS:
  1. Sort + Scan            → Activity Selection, Non-overlapping Intervals
  2. Track Frontier         → Jump Game I (farthest) / Jump Game II (level ends)
  3. Running Surplus Reset  → Gas Station (reset start when surplus < 0)
  4. Two-Pass Greedy        → Candy (left pass + right pass, take max)
  5. Sort Both Arrays       → Assign Cookies (two pointers after sort)
  6. Expand Until Cut       → Partition Labels (expand window to last occurrence)
  7. Insert at Index k      → Queue Reconstruction (largest first, insert at k)

GREEDY vs DP:
  Greedy: choices are independent; exchange argument holds
  DP:     one choice can block a better future combination

COMPLEXITY:
  Typical: O(n log n) time (sort) + O(1) extra space
  Exception: Queue Reconstruction O(n²) due to insertions

WARN: Greedy fails for 0/1 Knapsack, arbitrary Coin Change, Edit Distance
```

---

## Advanced Awareness

The following topics use greedy at their core but are less common in coding interviews and more common in system design or CS theory discussions. You should be able to explain the greedy principle behind each.

**Huffman Encoding:**
Build an optimal prefix-free code by repeatedly merging the two least-frequent symbols. Greedy choice: always merge the two cheapest nodes (min-heap). This is safe because in any optimal tree, the two rarest symbols must be the deepest leaves (exchange argument). Used in compression algorithms (ZIP, JPEG). Complexity: O(n log n).

**Kruskal's Algorithm (Minimum Spanning Tree):**
Sort all edges by weight. Add the cheapest edge that does not form a cycle (use Union-Find). Greedy choice: always take the globally cheapest safe edge. Safe because adding a non-cycle edge to a partial MST never prevents the final MST from being optimal (cycle property of MSTs). Complexity: O(E log E).

**Prim's Algorithm (Minimum Spanning Tree):**
Start from any node. At each step, add the cheapest edge connecting the current tree to a new vertex (min-heap). Greedy choice: always extend via the minimum-weight frontier edge. Safe by the cut property of MSTs. Complexity: O(E log V) with a binary heap.

**Dijkstra's Algorithm (Shortest Path):**
At each step, finalize the vertex with the current shortest known distance (min-heap). Greedy choice: a finalized vertex's distance is already optimal and will never be improved. Safe because all edge weights are non-negative — you cannot "go around" and find a shorter path through unvisited vertices. Fails with negative weights (use Bellman-Ford instead).

**Connection to interviews:** If asked about Kruskal/Prim/Dijkstra in an interview, you should be able to name the greedy choice and explain in one sentence why it is safe. You will rarely be asked to implement them from scratch at Google, but understanding the greedy principle behind them shows depth.

---

*Next: [14-BIT-MANIPULATION.md](14-BIT-MANIPULATION.md) — The hidden language of computers, where XOR is king.*
