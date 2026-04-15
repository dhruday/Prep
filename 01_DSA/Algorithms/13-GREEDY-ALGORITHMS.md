# Greedy Algorithms — Complete Pattern Guide

> *"Greedy is the art of proving that being short-sighted is enough. If you can show that the locally optimal choice never needs to be undone, you have a greedy solution."*

---

## Table of Contents

1. [Greedy Thinking Framework](#greedy-thinking-framework)
2. [Exchange Argument](#exchange-argument)
3. [Activity Selection / Interval Scheduling](#activity-selection--interval-scheduling)
4. [Jump Game Family](#jump-game-family)
5. [Gas Station](#gas-station)
6. [Candy (Two-Pass Greedy)](#candy-two-pass-greedy)
7. [Assign Cookies](#assign-cookies)
8. [Partition Labels](#partition-labels)
9. [Queue Reconstruction by Height](#queue-reconstruction-by-height)
10. [Greedy with Sorting](#greedy-with-sorting)
11. [Huffman Encoding](#huffman-encoding)
12. [Greedy vs DP Decision Framework](#greedy-vs-dp-decision-framework)

---

## Greedy Thinking Framework

### What is this approach?

**Intuition:** At each step, make the choice that looks best RIGHT NOW, without worrying about future consequences. A greedy algorithm works when this myopic strategy happens to produce the global optimum.

**The two things you must prove (or intuit):**
1. **Greedy choice property:** A locally optimal choice leads to a globally optimal solution
2. **Optimal substructure:** After making a greedy choice, the remaining problem is a smaller instance of the same problem

### When should I use this?

- Problem asks for minimum/maximum of something
- You can identify a "greedy criterion" for ordering choices
- Making one choice NEVER invalidates future choices
- Keywords: "minimum number of," "maximum number of," "fewest," "most," "earliest"

### When should I NOT use this?

- Current choices affect future options in complex ways → DP
- You need to consider ALL combinations → Backtracking
- The "obvious greedy" gives a counterexample → definitely not greedy
- When you can't prove the greedy choice is safe

### Interview Insights

- **The Greedy Test:** Before committing, try to find a counterexample. If you can construct an input where the greedy fails, it's not greedy.
- **Proof hint:** If the interviewer asks "Why does greedy work here?", use the exchange argument (next section).

---

## Exchange Argument

### What is this approach?

**Intuition:** The standard way to prove a greedy algorithm is correct. "Suppose my greedy solution differs from the optimal solution. I can swap one element to make the optimal look more like the greedy, without worsening it. Therefore, the greedy solution is at least as good as optimal."

### How it works

1. Assume there exists an optimal solution OPT that differs from your greedy solution G
2. Find a specific point where they differ
3. Show that you can modify OPT to be more like G without increasing cost
4. Repeat until OPT = G → G is optimal

### Interview Insights

- You rarely need to write a formal proof in an interview. But if asked "Why does this work?", sketch the exchange argument in 2-3 sentences.
- **Example:** For interval scheduling (sort by end time): "If we chose an interval that ends later than our greedy choice, we can swap it for the earlier-ending interval. This frees up more space for future intervals, so it's at least as good."

---

## Activity Selection / Interval Scheduling

### What is this approach?

**Intuition:** Given intervals, select the maximum number of non-overlapping ones. Sort by END time. Always pick the interval that finishes earliest — this leaves the most room for future intervals.

### When should I use this?

- "Maximum number of non-overlapping intervals"
- "Minimum number of intervals to remove for non-overlapping"
- "Meeting rooms — max meetings attended"
- Keywords: "non-overlapping," "maximum activities," "minimum removal"

### Core Idea

1. Sort intervals by end time
2. Pick the first interval. For each subsequent interval: if its start ≥ previous end, pick it.
3. Count picked intervals = maximum non-overlapping set.

**Minimum removals = total intervals - maximum non-overlapping.**

### Complexity

- **Time:** O(n log n) for sorting
- **Space:** O(1) extra

### Variants

- **Non-overlapping Intervals (minimum removal):** Same algorithm, answer = n - count
- **Minimum Number of Arrows to Burst Balloons:** Intervals = balloons. Arrow at x bursts all balloons containing x. Same as finding minimum points that hit all intervals = total - maximum non-overlapping of the "gaps"

### Interview Insights

- **Trap:** Sort by END time, not start time. Sorting by start time is wrong for this problem.
- **Twist:** "What if we want minimum number of groups to cover all intervals?" → That's Interval Partitioning, solved differently (min meeting rooms = max overlapping at any point).

---

## Jump Game Family

### What is this approach?

**Intuition:** You stand at position 0 in an array where each element tells you the maximum jump length. Can you reach the end? What's the fewest jumps?

### Core Ideas

**Jump Game I (can you reach the end?):**
- Track `farthest` — the farthest index reachable so far
- Scan left to right: farthest = max(farthest, i + nums[i])
- If i > farthest at any point: unreachable. If farthest ≥ last index: reachable.

**Jump Game II (minimum jumps):**
- BFS-like greedy: track the current level's boundary and the farthest reachable
- When you pass the current boundary: increment jump count, update boundary to farthest
- Each "level" = one jump

### Complexity

- **Time:** O(n) for both
- **Space:** O(1)

### Interview Insights

- **Jump Game I** is pure greedy: just track the frontier.
- **Jump Game II** is greedy with a BFS mindset: "what's the farthest I can reach in exactly K jumps?"

---

## Gas Station

### What is this approach?

**Intuition:** N gas stations in a circle. You gain gas[i] at station i and spend cost[i] to travel to i+1. Find the starting station to complete the circuit. If total gas ≥ total cost, a solution exists. The start point is where the running "surplus" is most negative — because starting there means you never go below zero.

### Core Idea

1. If sum(gas) < sum(cost): impossible → return -1
2. Track running surplus = gas[i] - cost[i]. If surplus goes negative, reset: start = i+1, surplus = 0.
3. The final `start` is the answer.

### Complexity

- **Time:** O(n)
- **Space:** O(1)

### Interview Insights

- **Key insight:** If total gas ≥ total cost, a solution ALWAYS exists (provable). The start is the first index after the "lowest valley" of the cumulative surplus.
- **Trap:** Don't simulate from every starting point — that's O(n²).

---

## Candy (Two-Pass Greedy)

### What is this approach?

**Intuition:** Children in a line with ratings. Each child gets at least 1 candy. Higher-rated children get more candy than their neighbors. Two constraints (left neighbor and right neighbor) handled by two passes.

### Core Idea

1. **Left pass:** If rating[i] > rating[i-1], candy[i] = candy[i-1] + 1
2. **Right pass:** If rating[i] > rating[i+1], candy[i] = max(candy[i], candy[i+1] + 1)
3. Total = sum of candy[]

### Complexity

- **Time:** O(n)
- **Space:** O(n)

### Interview Insights

- **Pattern:** **Two-pass greedy** — handle left-looking and right-looking constraints separately. Then combine by taking the stricter (max) of the two.
- **This pattern recurs** in problems like: Trapping Rain Water (left max, right max), Product of Array Except Self (left product, right product).

---

## Assign Cookies

### What is this approach?

**Intuition:** Sort children by greed, sort cookies by size. Assign the smallest sufficient cookie to the least greedy child. This maximizes the number of satisfied children.

### Core Idea

1. Sort both arrays
2. Two pointers: for each child (smallest greed first), find the smallest cookie that satisfies them
3. If cookie ≥ child's greed: assign, move both pointers. Else: move cookie pointer.

### Complexity

- **Time:** O(n log n) for sorting
- **Space:** O(1)

### Interview Insights

- **Classic exchange argument:** If we gave a larger cookie to a small-greed child, we could swap it for the smaller cookie (still satisfying the child) and potentially satisfy a larger-greed child with the larger cookie.

---

## Partition Labels

### What is this approach?

**Intuition:** Partition a string so that each letter appears in at most one part. Find the last occurrence of each character. Expand the current partition to include the last occurrence of every character within it.

### Core Idea

1. Record last occurrence of each character
2. Scan left to right. Track `end` = farthest last occurrence seen so far
3. When current index = end: this is a partition boundary. Record length, start a new partition.

### Complexity

- **Time:** O(n)
- **Space:** O(1) (26 characters)

### Interview Insights

- **Pattern:** "Expand window until constraint is satisfied, then cut." This greedy expansion pattern also appears in merge intervals.

---

## Queue Reconstruction by Height

### What is this approach?

**Intuition:** People described by [height, number of taller-or-equal people in front]. Sort by height descending (ties by k ascending). Insert each person at index k. Taller people are placed first, so their positions are stable when shorter people are inserted.

### Core Idea

1. Sort: descending height, ascending k
2. For each person: insert at index k in the result list
3. Insertion at index k is correct because all previously placed people are ≥ current height

### Complexity

- **Time:** O(n²) due to list insertions
- **Space:** O(n)

### Interview Insights

- **Pattern:** "Process from largest to smallest" greedy. The insight is that inserting smaller elements later doesn't disturb the relative ordering of larger elements.

---

## Greedy with Sorting

### What is this approach?

**Intuition:** Many greedy algorithms start with sorting. The sort order reveals the greedy criterion.

| Sort By | Problem |
|---|---|
| End time | Activity selection, non-overlapping intervals |
| Start time | Merge intervals, meeting rooms |
| Difference (profit - cost) | Task assignment optimization |
| Ratio (value/weight) | Fractional Knapsack |
| Deadline | Job scheduling with deadlines |
| Height descending | Queue reconstruction |

### Interview Insights

- **When in doubt:** Try sorting by different criteria. The right sort order often makes the greedy approach obvious.
- **Pattern:** Sort → scan → greedily pick/skip.

---

## Huffman Encoding

### What is this approach?

**Intuition:** Build an optimal prefix-free encoding for characters based on frequency. More frequent characters get shorter codes. Repeatedly merge the two least frequent characters.

### Core Idea

1. Create a min-heap of character frequencies
2. While heap has > 1 element: extract two minimum, merge them (combined frequency), insert back
3. The resulting tree gives optimal variable-length codes

### Complexity

- **Time:** O(n log n)
- **Space:** O(n)

### Interview Insights

- **Rarity in coding interviews** but common as a concepts question. The greedy principle: always merge the two cheapest.
- **Connection:** This is the same principle as "minimum cost to merge stones" (though that problem has constraints making it an interval DP when merging K at a time, K > 2).

---

## Greedy vs DP Decision Framework

### The Key Question

**"Does my greedy choice ever need to be undone?"**

| Property | Greedy Works | DP Needed |
|---|---|---|
| Choices are independent | Yes | — |
| Current choice constrains future choices | — | Yes |
| Can prove greedy choice property | Yes | — |
| Need to consider multiple previous states | — | Yes |
| Problem has "optimal substructure" only | — | DP |
| Problem has "greedy choice property" too | Greedy | — |

### Classic Examples

| Problem | Greedy? | Why |
|---|---|---|
| Activity Selection | Yes | Earliest end time, choice is final |
| 0/1 Knapsack | No | Taking item A might prevent better combo BC |
| Fractional Knapsack | Yes | Take by value/weight ratio, fractions allowed |
| Coin Change (arbitrary) | No | Greedy fails for certain denomination sets |
| Coin Change (canonical) | Yes | US coin system: greedy works (mathematical property) |
| Jump Game I | Yes | Just need to know if reachable |
| Jump Game II | Yes | BFS-like level processing |
| Edit Distance | No | Need to consider all operations at each position |

### Interview Insights

- **Default assumption:** If you can't quickly prove greedy works, use DP. It's safer.
- **Red flag for greedy:** If the problem involves "choosing a subset" where items interact → probably DP or backtracking.
- **Green flag for greedy:** If the problem involves "ordering" or "scheduling" with a clear priority → likely greedy.

---

*Next: [14-BIT-MANIPULATION.md](14-BIT-MANIPULATION.md) — The hidden language of computers, where XOR is king.*
