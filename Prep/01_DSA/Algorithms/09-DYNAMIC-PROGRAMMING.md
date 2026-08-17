# Dynamic Programming — Complete Pattern Guide

> *"DP is not about memorizing transitions. DP is about asking: 'What decision did I make LAST, and what smaller problem remains after I undo that decision?'"*

This is the most important and largest section of the knowledge base. DP appears in 30-40% of FAANG interview problems.

---

## Table of Contents

### Foundations
1. [DP Mental Model](#dp-mental-model)
2. [Top-Down vs Bottom-Up](#top-down-vs-bottom-up)
3. [State Definition Methodology](#state-definition-methodology)

### Core Pattern Families
4. [1D DP (Linear)](#1d-dp-linear)
5. [2D DP (Grid / Two-Variable)](#2d-dp-grid--two-variable)
6. [Knapsack Family](#knapsack-family)
7. [LIS / LCS / LPS Patterns](#lis--lcs--lps-patterns)
8. [String DP](#string-dp)
9. [State Machine DP](#state-machine-dp)

### Advanced Patterns
10. [Interval DP](#interval-dp)
11. [Bitmask DP](#bitmask-dp)
12. [Digit DP](#digit-dp)
13. [Tree DP](#tree-dp)
14. [DP on Graphs](#dp-on-graphs)
15. [Game Theory DP](#game-theory-dp)

### Optimizations
16. [Space Optimization](#space-optimization)
17. [DP Optimization Techniques](#dp-optimization-techniques)

---

## DP Mental Model

### What is this approach?

**Intuition:** Imagine you are climbing a mountain with many paths. Some paths share the same intermediate checkpoints. Instead of walking the same path segment twice, you leave a note at each checkpoint: "The best way from here takes X steps." When you return to that checkpoint, you just read the note.

**Formal:** Dynamic Programming solves problems that have two properties:
1. **Optimal Substructure:** The optimal solution to the problem can be constructed from optimal solutions to its subproblems.
2. **Overlapping Subproblems:** The same subproblems are encountered many times during recursive computation.

DP avoids redundant computation by storing subproblem results (memoization or tabulation).

### The Four Steps of DP

1. **Define the state:** What information do you need to describe a subproblem completely?
2. **Define the recurrence:** How does the current state relate to previous states?
3. **Identify base cases:** What are the smallest subproblems whose answers are known?
4. **Determine computation order:** In which order should you fill the DP table? (Ensures dependencies are computed first.)

### How to Know It's a DP Problem

| Signal | Why It Suggests DP |
|---|---|
| "Count the number of ways" | Overlapping subproblems in counting |
| "Minimum/maximum cost" | Optimization over substructure |
| "Can you reach...?" (Yes/No) | Decision problem with substructure |
| "Longest/shortest subsequence" | Subsequence = optimal substructure |
| Exponential brute force with repeated work | Memoization eliminates repeats |
| Choices at each step affect future options | State captures the consequence of choices |

### When should I NOT use DP?

- **No overlapping subproblems:** Divide and conquer is cheaper (no memo table)
- **Greedy works:** If you can prove greedy correctness, it's simpler and often faster
- **The state space is too large:** If the number of states is > 10^7-10^8, DP may be too slow/memory-intensive

### Interview Insights

- **Key insight:** DP is EASIER once you define the state correctly. 80% of the difficulty is defining what the state IS. The recurrence usually follows naturally.
- **Trap:** Not every optimization problem is DP. Some are greedy. The test: does a locally optimal choice guarantee global optimality? If yes, greedy. If you need to "look back," DP.

---

## Top-Down vs Bottom-Up

### Top-Down (Memoization)

**Approach:** Write the natural recursive solution, then add a memo table to cache results.

**Advantages:**
- More intuitive — follows the recursive thinking
- Only computes states that are actually needed (lazy evaluation)
- Natural for problems where state space is sparse

**Disadvantages:**
- Recursion stack overhead (stack overflow for deep recursion)
- Slightly slower due to function call overhead

### Bottom-Up (Tabulation)

**Approach:** Identify the computation order. Fill the DP table from base cases upward.

**Advantages:**
- No recursion overhead
- Easier to apply space optimization (rolling array)
- Usually faster in practice

**Disadvantages:**
- Must determine the correct fill order
- Computes ALL states (even unused ones)

### Which to Use in Interviews?

- Start with **top-down** — it's easier to get right
- Mention that you could convert to bottom-up
- Convert if the interviewer asks for space optimization or iterative solution

### Interview Insights

- **Key insight:** Both are valid in interviews. Top-down is faster to implement; bottom-up is easier to optimize.

---

## State Definition Methodology

### The Hardest Part of DP

**The question:** "What is dp[i]?" or "What does dp[i][j] represent?"

**The process:**
1. Ask: "What decision am I making at each step?"
2. Ask: "After I make that decision, what information do I need to make the NEXT decision?"
3. The answer to #2 IS your state.

### Common State Patterns

| State | Meaning | Used In |
|---|---|---|
| dp[i] | Best answer considering elements [0..i] | 1D DP, LIS |
| dp[i] | Best answer considering elements [i..n-1] | Right-to-left DP |
| dp[i][j] | Best answer for substring s[i..j] | Interval DP, Palindrome |
| dp[i][j] | Best answer matching first i chars of s1 with first j chars of s2 | String DP (LCS, Edit Distance) |
| dp[i][w] | Best answer using first i items with capacity w | Knapsack |
| dp[i][k] | Best answer at position i with k operations remaining | Multi-parameter DP |
| dp[mask] | Best answer with visited set represented by bitmask | Bitmask DP (TSP) |
| dp[i][state] | Best answer at position i in a given state | State Machine DP |

### When the State Isn't Obvious

Try these approaches:
1. Start with the brute force recursive solution. The parameters of the recursive function ARE the state.
2. Ask: "What changes between subproblems?" Those changing quantities are your state dimensions.
3. Look at the constraints: if n ≤ 1000, a 2D DP with O(n²) states is feasible. If n ≤ 20, bitmask DP with 2^n states is feasible.

### Interview Insights

- **Key insight:** If you can clearly define dp[i] (or dp[i][j]) in one sentence, you're 80% done.
- **Trap:** Too many state dimensions → too many states → TLE. Try to reduce dimensions by finding relationships between parameters.

---

## 1D DP (Linear)

### What is this approach?

**Intuition:** You walk along a single path of decisions. At each step, your choice depends only on previous steps along the same path.

**Formal:** dp[i] depends only on dp[i-1], dp[i-2], or some dp[j] where j < i. The state is one-dimensional (just the position or index).

### When should I use this?

- The problem is about **one sequence** processed left-to-right
- Each position's answer depends on a small number of previous positions
- Keywords: "climbing stairs," "house robber," "decode ways," "jump game"

### When should I NOT use this?

- Two sequences being compared → 2D DP
- You need to track additional information (capacity, count) → multi-dimensional DP

### Core Idea

1. Define dp[i]: the answer for the first i elements (or at position i)
2. Express dp[i] in terms of dp[j] for j < i (usually j = i-1 or j = i-2)
3. Base cases: dp[0], dp[1]
4. Fill left to right

### Complexity

- **Time:** O(n) if each state depends on O(1) previous states
- **Space:** O(n), reducible to O(1) if only last few states are needed

### Variants

**Fibonacci / Climbing Stairs:**
- dp[i] = dp[i-1] + dp[i-2]
- "Number of ways to reach step i"

**House Robber:**
- dp[i] = max(dp[i-1], dp[i-2] + nums[i])
- "Max money: either skip current house (dp[i-1]) or rob it plus best from two before (dp[i-2] + nums[i])"
- The decision: "Did I rob the previous house?"

**Decode Ways:**
- dp[i] = dp[i-1] × (valid single digit?) + dp[i-2] × (valid two digits?)
- "Number of decodings of a digit string"
- Tricky edge cases: '0', '06', leading zeros

**Minimum Cost Climbing Stairs:**
- dp[i] = cost[i] + min(dp[i-1], dp[i-2])

**Jump Game (can you reach the end?):**
- Greedy is simpler, but DP also works: dp[i] = true if any j < i with dp[j] == true and j + nums[j] >= i

**Maximum Length of Pair Chain:**
- Sort by end, then LIS-like DP

### Related Patterns

- [Kadane's Algorithm](02-ARRAYS-AND-STRINGS.md#kadanes-algorithm) (max subarray IS a 1D DP problem)
- [Space Optimization](#space-optimization) (1D DP often needs only last 1-2 values)
- [State Machine DP](#state-machine-dp) (when the "state" has multiple modes)

### Interview Insights

- **Trap:** Confusing "number of ways" with "optimal value." Same DP structure, different recurrence (sum vs max/min).
- **Twist:** "House Robber on a circular street" — Two passes: (1) rob houses 0..n-2, (2) rob houses 1..n-1. Take max.
- **Key insight:** If you can solve it with dp[i] = f(dp[i-1], dp[i-2]), you can optimize space to O(1).

---

## 2D DP (Grid / Two-Variable)

### What is this approach?

**Intuition:** Now you have two dimensions: either a 2D grid (row, column) or two sequences being compared. Your state requires two indices.

**Formal:** dp[i][j] represents the answer for a subproblem defined by two parameters. Transitions involve dp[i-1][j], dp[i][j-1], dp[i-1][j-1], or similar neighbors.

### When should I use this?

- **Grid path** problems (count paths, minimum cost path)
- **Two string** comparison (LCS, edit distance)
- **Two parameters** change independently (index + remaining budget)
- Keywords: "unique paths," "minimum path sum," "edit distance," "interleaving strings"

### When should I NOT use this?

- Only one dimension changes → 1D DP
- Three or more parameters → higher-dimensional DP (might need space optimization)

### Core Idea

**Grid Problems:**
1. dp[i][j] = answer at cell (i, j)
2. Transition: dp[i][j] = f(dp[i-1][j], dp[i][j-1])
3. Base: dp[0][0] or first row/column

**Two-Sequence Problems:**
1. dp[i][j] = answer considering first i of sequence1 and first j of sequence2
2. Transition: depends on whether s1[i] matches s2[j]
3. Base: dp[0][j] and dp[i][0] (empty sequence cases)

### Complexity

- **Time:** O(n × m)
- **Space:** O(n × m), often reducible to O(min(n, m))

### Variants

**Unique Paths:**
- dp[i][j] = dp[i-1][j] + dp[i][j-1]
- Count of paths from (0,0) to (m-1,n-1) moving only right or down

**Unique Paths with Obstacles:**
- dp[i][j] = 0 if obstacle at (i,j), else dp[i-1][j] + dp[i][j-1]

**Minimum Path Sum:**
- dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])

**Maximal Square:**
- dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1 if cell is 1
- "Largest square of 1s in a binary matrix"

**Interleaving String:**
- dp[i][j] = whether s3[0..i+j-1] can be formed by interleaving s1[0..i-1] and s2[0..j-1]

### Related Patterns

- [1D DP](#1d-dp-linear) (special case with one dimension)
- [String DP](#string-dp) (two-sequence problems)
- [Space Optimization](#space-optimization) (2D → 1D rolling array)

### Interview Insights

- **Trap:** Maximal Square — the recurrence uses MIN of three neighbors, not MAX or SUM. This is because the limiting factor is the smallest adjacent square.
- **Twist:** "Can you optimize space?" — Most 2D grid DPs only look at the previous row, so one row at a time suffices.

---

## Knapsack Family

### What is this approach?

**Intuition:** You have a backpack with limited capacity. There are items with different weights and values. You want to maximize total value without exceeding capacity. For each item, you decide: take it or leave it?

**Formal:** Given items with weights and values and a capacity W, find the maximum value achievable. The "include or exclude" decision structure creates a DP problem.

### When should I use this?

- "Maximum value with weight constraint" (0/1 knapsack)
- "Can a set be partitioned into equal halves?" (subset sum)
- "Count ways to make a target sum" (coin change)
- "Minimum coins to reach target" (unbounded knapsack)
- Keywords: "knapsack," "subset sum," "partition," "target sum," "coin change," "capacity"

### When should I NOT use this?

- Items have no "weight" concept — different DP pattern
- Greedy works (items can be fractionally taken → fractional knapsack, which is greedy)
- Target is too large for DP table (need optimization or different approach)

### Core Idea

**0/1 Knapsack:**
- dp[i][w] = max value using first i items with capacity w
- dp[i][w] = max(dp[i-1][w], dp[i-1][w - weight[i]] + value[i])
- "Either skip item i (dp[i-1][w]) or take it (need w - weight[i] remaining capacity)"

**Unbounded Knapsack:**
- dp[i][w] = max(dp[i-1][w], dp[i][w - weight[i]] + value[i])
- Note: dp[i] instead of dp[i-1] allows reusing item i

### Complexity

- **Time:** O(n × W) — pseudo-polynomial (depends on the VALUE of W, not the size of input)
- **Space:** O(n × W), reducible to O(W)

### Variants

**0/1 Knapsack (standard):**
- Each item used at most once
- dp[i][w] = max(skip, take if fits)

**Unbounded Knapsack (Coin Change II — count ways):**
- Each item can be used unlimited times
- Example: Coin Change II — count combinations that sum to amount

**Subset Sum (can you achieve exact sum S?):**
- dp[i][s] = true if first i elements can sum to s
- 0/1 knapsack variant where value = weight and you want exact capacity

**Partition Equal Subset Sum:**
- Can the array be split into two subsets with equal sum?
- Equivalent to: does a subset with sum = total/2 exist?
- This IS subset sum with target = total/2

**Target Sum (assign + or - to each number):**
- How many ways to assign +/- to reach target?
- Transform: let P = subset with +, N = subset with -. P - N = target, P + N = total. So P = (target + total) / 2. Count subsets summing to P.

**Coin Change (minimum coins):**
- dp[i] = min coins to reach amount i
- dp[i] = min(dp[i - coin] + 1) for each coin

**Coin Change II (count combinations):**
- dp[i][j] = number of ways to make amount j using first i coins
- Order doesn't matter (combinations, not permutations)

**Bounded Knapsack:**
- Each item has a limited count. Can reduce to 0/1 by expanding items, or use binary representation trick.

### Related Patterns

- [Subset Generation](08-RECURSION-AND-BACKTRACKING.md#subsets-power-set) (knapsack = optimized subset evaluation)
- [Greedy](13-GREEDY-ALGORITHMS.md) (fractional knapsack is greedy, not DP)
- [Bit Manipulation / Bitmask DP](#bitmask-dp) (for small n, bitmask over subsets)

### Interview Insights

- **Trap:** "Coin Change II" asks for combinations (not permutations). If you iterate coins in the OUTER loop and amounts in the INNER loop, you get combinations. Reversed loops give permutations.
- **Trap:** Subset Sum with negative numbers or target that's odd — check edge cases early.
- **Twist:** "Partition into K equal subsets" — This is DFS with bitmask, not straightforward knapsack.
- **Key insight:** Most "can you split?" and "can you reach a sum?" problems reduce to 0/1 knapsack / subset sum.

---

## LIS / LCS / LPS Patterns

### What is this approach?

Three of the most frequently tested DP subsequence patterns.

### LIS — Longest Increasing Subsequence

**Intuition:** Find the longest chain of elements where each is larger than the previous, but they don't need to be adjacent. Like finding the tallest set of stacking blocks where each block is wider than the one below.

**State:** dp[i] = length of LIS ending at index i

**Recurrence:** dp[i] = max(dp[j] + 1) for all j < i where arr[j] < arr[i]

**Complexity:** O(n²) DP, O(n log n) with patience sorting (binary search on tails array)

**O(n log n) — Patience Sorting:**
1. Maintain a "tails" array where tails[k] = smallest tail element for an increasing subsequence of length k+1
2. For each element: binary search for the position to place it in tails
   - If element > all tails: append (extends longest subsequence)
   - Else: replace the first tail ≥ element (optimizes future extensions)
3. Length of tails = LIS length

**Variants:**
- Longest Non-Decreasing Subsequence: change < to ≤
- Longest Decreasing Subsequence: reverse the array or negate values
- Number of LIS: track count alongside length
- Russian Doll Envelopes: 2D LIS — sort by width (ascending), find LIS on heights (with width ties sorted descending to prevent using same width twice)
- Longest Chain of Pairs: sort by second element, then LIS-like

### LCS — Longest Common Subsequence

**Intuition:** Find the longest sequence of characters that appears (in order, not necessarily adjacent) in BOTH strings. Like finding the common plot points between two stories.

**State:** dp[i][j] = LCS length of first i chars of s1 and first j chars of s2

**Recurrence:**
- If s1[i-1] == s2[j-1]: dp[i][j] = dp[i-1][j-1] + 1
- Else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])

**Base:** dp[0][j] = dp[i][0] = 0

**Complexity:** O(n × m) time, O(n × m) space (reducible to O(min(n, m)))

**Variants:**
- Longest Common Substring (contiguous): Reset to 0 when mismatch. dp[i][j] = dp[i-1][j-1] + 1 only on match; 0 otherwise.
- Shortest Common Supersequence: len(s1) + len(s2) - LCS. Construct by tracing the DP table.
- Edit Distance: Same 2D structure (see String DP).
- Diff algorithm: LCS reveals the common parts; the rest are insertions/deletions.

### LPS — Longest Palindromic Subsequence

**Intuition:** Find the longest subsequence of a string that reads the same forwards and backwards.

**State:** dp[i][j] = LPS length for substring s[i..j]

**Recurrence:**
- If s[i] == s[j]: dp[i][j] = dp[i+1][j-1] + 2
- Else: dp[i][j] = max(dp[i+1][j], dp[i][j-1])

**Base:** dp[i][i] = 1 (single character)

**Complexity:** O(n²) time, O(n²) space

**Alternative:** LPS(s) = LCS(s, reverse(s))

**Variants:**
- Minimum deletions to make palindrome: n - LPS
- Longest Palindromic Substring: Different! Use Manacher's (not DP) for O(n), or DP with dp[i][j] = true if s[i..j] is palindrome.

### Interview Insights

- **Trap:** LIS O(n²) is often not enough — interviewers expect the O(n log n) patience sorting approach.
- **Trap:** LCS space can be optimized to O(min(n,m)) by rolling array.
- **Twist:** "Russian Doll Envelopes" — Reduces to LIS after clever sorting. Sort by width ascending, height DESCENDING for equal widths.
- **Key insight:** LIS, LCS, and LPS are the "holy trinity" of subsequence DP. Master all three.

---

## String DP

### What is this approach?

**Intuition:** Two strings being compared character by character. At each step, you ask: "Do these characters match? If so, consume both. If not, what options do I have?"

**Formal:** DP where the state involves positions in one or two strings. Transitions depend on character matches/mismatches.

### When should I use this?

- Comparing, transforming, or matching two strings
- Pattern matching (wildcard, regex)
- Keywords: "edit distance," "wildcard," "regex," "interleaving," "distinct subsequences"

### Core Patterns

**Edit Distance (Levenshtein Distance):**
- dp[i][j] = minimum operations to convert s1[0..i-1] to s2[0..j-1]
- If s1[i-1] == s2[j-1]: dp[i][j] = dp[i-1][j-1] (no operation needed)
- Else: dp[i][j] = 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]) = min(replace, delete, insert)
- Base: dp[i][0] = i, dp[0][j] = j

**Wildcard Matching (? matches one, * matches any sequence):**
- dp[i][j] = does pattern[0..i-1] match string[0..j-1]?
- If pattern[i-1] == '?': dp[i][j] = dp[i-1][j-1]
- If pattern[i-1] == '*': dp[i][j] = dp[i-1][j] (star matches empty) OR dp[i][j-1] (star matches one more char)
- If pattern[i-1] == s[j-1]: dp[i][j] = dp[i-1][j-1]
- Else: false

**Regular Expression Matching (. matches one, * means zero or more of previous):**
- More complex because * modifies the preceding character
- dp[i][j] = does pattern[0..i-1] match string[0..j-1]?
- If pattern[i-1] == '*': dp[i][j] = dp[i-2][j] (zero occurrences) OR (dp[i][j-1] if pattern[i-2] matches s[j-1]) (one more occurrence)
- If pattern[i-1] == '.' or == s[j-1]: dp[i][j] = dp[i-1][j-1]

**Distinct Subsequences:**
- dp[i][j] = number of ways to form t[0..j-1] as a subsequence of s[0..i-1]
- If s[i-1] == t[j-1]: dp[i][j] = dp[i-1][j-1] + dp[i-1][j]
- Else: dp[i][j] = dp[i-1][j]

### Complexity

- **Time:** O(n × m) for all above
- **Space:** O(n × m), reducible to O(m) with rolling array

### Interview Insights

- **Trap:** Regex matching — the '*' refers to the PREVIOUS character, not the current one. This means the transitions look at pattern[i-2].
- **Twist:** "What if there are no wildcards?" — Simple string comparison, no DP needed.
- **Follow-up:** "Edit Distance with only insert/delete (no replace)" — dp[i][j] = dp[i-1][j-1] if match, else 1 + min(dp[i-1][j], dp[i][j-1]).

---

## State Machine DP

### What is this approach?

**Intuition:** You are in one of several "modes" (states), and each input event triggers a transition to another mode. Your answer tracks the best outcome at each mode after processing all inputs.

**Formal:** Define multiple DP arrays, one for each state. At each step, transition between states based on the input. The "Best Time to Buy and Sell Stock" series is the canonical example.

### When should I use this?

- The problem natural has **modes** (holding/not holding, cooldown, etc.)
- Transitions between modes have rules
- Keywords: "buy and sell stock," "cooldown," "fee," "at most K transactions"

### When should I NOT use this?

- There are no clear "modes" — standard DP suffices
- Only one transaction — greedy (find max difference) is simpler

### Core Idea

**Example: Buy and Sell Stock with Cooldown**

States at each day:
- **hold[i]:** Max profit on day i if I currently hold a stock
- **sold[i]:** Max profit on day i if I just sold today
- **rest[i]:** Max profit on day i if I'm resting (no stock, didn't sell today)

Transitions:
- hold[i] = max(hold[i-1], rest[i-1] - price[i]) — keep holding OR buy today
- sold[i] = hold[i-1] + price[i] — sell what I'm holding
- rest[i] = max(rest[i-1], sold[i-1]) — keep resting OR day after selling

Answer: max(sold[n-1], rest[n-1])

### Variants

| Problem | States | Key Transition |
|---|---|---|
| Stock I (one transaction) | Regular greedy or DP | Track min price so far |
| Stock II (unlimited transactions) | hold, not_hold | Can buy/sell any day |
| Stock III (at most 2 transactions) | states × transaction count | 4 states: 1st_buy, 1st_sell, 2nd_buy, 2nd_sell |
| Stock IV (at most K transactions) | dp[k][day] with hold/not_hold | General K-transaction version |
| Stock with Cooldown | hold, sold, rest | Cannot buy day after selling |
| Stock with Transaction Fee | hold, not_hold | Fee subtracted on each sell (or buy) |

### Complexity

- **Time:** O(n) per transaction limit, so O(n × K) for K transactions
- **Space:** O(K) typically

### Interview Insights

- **Trap:** Stock problems look similar but have very different solutions. Identify the constraints: K transactions? Cooldown? Fee?
- **Key insight:** Draw the state transition diagram first. States are circles, transitions are arrows with conditions. The DP follows directly from the diagram.

---

## Interval DP

### What is this approach?

**Intuition:** You have a sequence, and you need to find the optimal way to subdivide it. You try every possible "split point" and ask: "What's the best left part + the best right part + the cost of combining them?"

**Formal:** dp[i][j] represents the answer for the subarray/substring from index i to j. Transitions try every split point k between i and j: dp[i][j] = optimize over k of (dp[i][k] + dp[k+1][j] + merge_cost). Fill diagonally by increasing length.

### When should I use this?

- "Merge stones" / "Burst balloons" / "Matrix chain multiplication"
- The problem is about **splitting or merging a contiguous range**
- Keywords: "merge," "burst," "split," "minimum cost to merge," "matrix chain"

### When should I NOT use this?

- The elements aren't contiguous — interval DP requires contiguous ranges
- The merge order doesn't matter — simpler approach exists

### Core Idea

1. State: dp[i][j] = answer for range [i..j]
2. For each length L from 2 to n:
   - For each start i with end j = i + L - 1:
     - For each split point k from i to j-1:
       - dp[i][j] = optimize(dp[i][k] + dp[k+1][j] + cost(i, j, k))
3. Answer: dp[0][n-1]

**Fill order:** By increasing interval length (length 1, then 2, then 3, ...).

### Complexity

- **Time:** O(n³) — three nested loops (length, start, split)
- **Space:** O(n²) for the table

### Variants

**Matrix Chain Multiplication:**
- dp[i][j] = minimum scalar multiplications to compute product of matrices i through j
- Split: dp[i][j] = min over k of (dp[i][k] + dp[k+1][j] + dim[i] × dim[k+1] × dim[j+1])

**Burst Balloons:**
- dp[i][j] = max coins from bursting all balloons between i and j
- Key insight: think of k as the LAST balloon to burst in [i,j], not the first. Then the boundaries are known.

**Minimum Cost to Merge Stones:**
- dp[i][j] = min cost to merge elements [i..j]
- Each merge combines exactly K adjacent piles

**Palindrome Partitioning II (minimum cuts):**
- dp[i] = min cuts for s[0..i]. Different structure: 1D DP with palindrome precomputation.

**Strange Printer:**
- dp[i][j] = minimum turns to print s[i..j]

### Related Patterns

- [Divide and Conquer](08-RECURSION-AND-BACKTRACKING.md#divide-and-conquer) (same "split and combine" but without overlap)
- [Monotonic DP Optimization](#dp-optimization-techniques) (Knuth's optimization for monotone intervals)

### Interview Insights

- **Trap:** Burst Balloons — thinking about which balloon to burst FIRST leads to wrong subproblems (the boundaries change). Think about the LAST balloon to burst.
- **Twist:** "Matrix Chain Multiplication" is the classic teaching problem, but interviewers more often ask Burst Balloons or Merge Stones which are harder to recognize.
- **Key insight:** The "last operation" trick transforms a problem from difficult to tractable. Always ask: "What is the LAST action in the optimal solution?"

---

## Bitmask DP

### What is this approach?

**Intuition:** You have a small set of items (say 15-20). You need to track which ones you've used. Instead of a boolean array, represent the "used" set as a single integer where each bit corresponds to an item.

**Formal:** dp[mask] (or dp[mask][i]) where mask is a bitmask representing a subset of items. Transitions flip bits to include new items. Works when n ≤ 20-25.

### When should I use this?

- **n ≤ 20** (because 2^20 ≈ 10^6 states, manageable)
- You need to track **which subset of items** has been selected/visited
- Keywords: "assign," "visiting all," "travelling salesman," "minimum cost to visit all"

### When should I NOT use this?

- n > 25 — 2^n is too large
- The problem doesn't require tracking subsets (regular DP suffices)

### Core Idea

**TSP (Travelling Salesman — visit all cities with minimum cost):**
1. dp[mask][i] = minimum cost to visit the set of cities represented by mask, ending at city i
2. Transition: dp[mask | (1 << j)][j] = min(dp[mask][i] + cost[i][j]) for each unvisited city j
3. Base: dp[1 << start][start] = 0
4. Answer: min over all i of (dp[(1<<n) - 1][i] + cost[i][start])

**Checking if bit k is set in mask:** `mask & (1 << k) != 0`
**Setting bit k:** `mask | (1 << k)`
**Clearing bit k:** `mask & ~(1 << k)`

### Complexity

- **Time:** O(2^n × n²) for TSP (2^n masks × n ending cities × n transitions)
- **Space:** O(2^n × n)

### Variants

- **TSP:** Visit all cities, minimum cost cycle
- **Assignment Problem:** Assign n workers to n tasks, minimize total cost
- **Shortest Hamiltonian Path:** Visit all nodes, minimum cost path
- **Can I Partition into K Equal-Sum Subsets?:** dp[mask] = number of elements in current group. When a group reaches target sum, start a new group.
- **Minimum XOR Sum:** Assign pairs between two arrays for minimum XOR sum
- **Enumerate Subsets of a Bitmask:** Use the trick: for sub = mask; sub > 0; sub = (sub - 1) & mask

### Related Patterns

- [Subsets / Backtracking](08-RECURSION-AND-BACKTRACKING.md#subsets-power-set) (bitmask replaces explicit subset generation)
- [Bit Manipulation](14-BIT-MANIPULATION.md) (bit operations are the building blocks)

### Interview Insights

- **Trap:** Forgetting that bitmask DP requires n ≤ 20-25. If n = 50, this approach is impossible.
- **Twist:** "Can I partition into K equal subsets?" — This is a bitmask DP problem, not a simple knapsack.
- **Key insight:** Bitmask DP is the "brute force DP" — it exhaustively tracks subsets. Use it when n is small and no polynomial DP is apparent.

---

## Digit DP

### What is this approach?

**Intuition:** "How many numbers from 1 to N have property X?" You build the number digit by digit, tracking whether you're still "under the limit" (tight constraint) or free to use any digit.

**Formal:** Count numbers in a range [1, N] satisfying a property. Process N digit by digit. At each position, track: (a) whether the number built so far is still equal to N's prefix (tight), and (b) any property-specific state (digit sum, divisibility, etc.).

### When should I use this?

- "Count numbers in [1, N] with property X"
- "Count numbers with digit sum = K"
- "Count numbers without the digit 4"
- Keywords: "count numbers," "range [L, R]," "digit sum," "digit property"

### When should I NOT use this?

- The property doesn't depend on individual digits
- N is small enough to brute-force

### Core Idea

1. Convert N to its digit representation
2. dp[pos][tight][state] where:
   - pos = current digit position (0 to len-1)
   - tight = boolean, whether current prefix matches N's prefix exactly
   - state = problem-specific (digit sum so far, last digit, divisibility remainder, etc.)
3. For each position, try each digit d (0-9):
   - If tight and d > N's digit at pos: skip
   - If tight and d == N's digit: next call is still tight
   - If tight and d < N's digit: next call is not tight
4. Recurse, memoize

**For range [L, R]:** count(R) - count(L-1)

### Complexity

- **Time:** O(digits × states × 10) — typically manageable
- **Space:** O(digits × states)

### Variants

- **Count numbers with digit sum = K:** state = current sum
- **Count numbers without certain digits:** state tracks last digit or presence
- **Count numbers divisible by K:** state = current number mod K

### Related Patterns

- [Math & Number Theory](15-MATH-AND-NUMBER-THEORY.md) (mathematical properties being computed)

### Interview Insights

- **Trap:** Handling leading zeros. Sometimes leading zeros affect the property (e.g., "no leading zeros allowed").
- **Twist:** "Count numbers in [L, R]" — Compute count(R) - count(L-1). This is the standard trick.
- **Note:** Digit DP is more common in competitive programming than FAANG interviews, but it does appear occasionally.

---

## Tree DP

### What is this approach?

**Intuition:** Compute properties of trees bottom-up: solve for leaves first, then use those results for their parents, going up to the root. Each node's answer depends on its children's answers.

**Formal:** DP on tree structure where states are defined at nodes. Typically solved via DFS (post-order): process children first, then compute the node's DP value.

### When should I use this?

- "Maximum path sum in a tree"
- "House Robber III (tree version)"
- "Minimum cameras to cover a binary tree"
- "Diameter of a tree"
- "Count good nodes"
- Keywords: "tree," "maximum path," "select/skip nodes in tree"

### When should I NOT use this?

- The tree structure is not relevant to the problem
- The problem is about tree traversal (not optimization)

### Core Idea

1. Define DP value for each node: dp[node]
2. DFS post-order: first compute dp[child] for all children
3. Combine children's results to compute dp[node]
4. Return dp[root]

**House Robber III:**
- For each node, two states: rob this node, or don't rob it
- rob[node] = node.val + not_rob[left] + not_rob[right]
- not_rob[node] = max(rob[left], not_rob[left]) + max(rob[right], not_rob[right])

**Maximum Path Sum (any-to-any):**
- At each node, compute max single-branch path (going down to one child)
- Update global max with left_branch + node.val + right_branch
- Return single-branch max upward

**Binary Tree Camera:**
- Three states per node: has_camera, covered_no_camera, not_covered
- Greedy DFS: cover uncovered children first

### Complexity

- **Time:** O(n) — visit each node once
- **Space:** O(h) where h = tree height (recursion depth); O(n) worst case for skewed tree

### Variants

- **Tree Diameter:** At each node, longest path through it = left_depth + right_depth. Track max globally.
- **Rerooting DP:** Compute answer for each node as root. Compute for one root, then "move" the root to each neighbor in O(1). Total: O(n).
- **Subtree Sum / Count:** Classic tree DP where each node aggregates children's values.

### Related Patterns

- [Trees](10-TREES.md) (tree traversal and structure)
- [DFS](11-GRAPHS.md) (tree DP = DFS + memoization on trees)

### Interview Insights

- **Trap:** Maximum Path Sum — the path can go through any nodes (not just root-to-leaf). Each node locally decides to extend left, right, or both. The "both" case updates the global max but cannot be returned upward (because the path would bend).
- **Twist:** "House Robber III" — Many candidates use tree DP without realizing they can return TWO values per node (rob, not_rob) to avoid the HashMap.

---

## DP on Graphs

### What is this approach?

**Intuition:** Some graph problems have optimal substructure: the best path or cost to a node can be computed from the best paths to its predecessors.

**Formal:** DP on graph structures, typically DAGs (Directed Acyclic Graphs). Topological order ensures all predecessors are computed before the current node.

### When should I use this?

- The graph is a **DAG** (or can be reduced to one)
- Shortest/longest path on a DAG
- Counting paths in a DAG
- Keywords: "DAG," "counting paths," "shortest path in DAG"

### When should I NOT use this?

- The graph has cycles — DP doesn't work directly (use BFS/Dijkstra or detect impossible)
- The graph is undirected and connected — not a DAG

### Core Idea

1. Topologically sort the DAG
2. Process nodes in topological order
3. dp[node] = f(dp[predecessor] for all predecessors)

**Shortest Path in Weighted DAG:**
- Process in topological order
- dp[v] = min(dp[u] + weight(u,v)) for all edges (u, v)
- Faster than Dijkstra for DAGs: O(V + E) instead of O((V + E) log V)

### Complexity

- **Time:** O(V + E) — topological sort + DP
- **Space:** O(V)

### Related Patterns

- [Topological Sort](11-GRAPHS.md) (prerequisite for graph DP)
- [Bellman-Ford](11-GRAPHS.md) (general shortest path, handles cycles)

### Interview Insights

- **Key insight:** Many problems can be modeled as shortest/longest path on a DAG. If you can find the DAG structure, DP follows.

---

## Game Theory DP

### What is this approach?

**Intuition:** Two players take turns making optimal moves. You need to find the outcome when both play perfectly. At your turn, you maximize your score. On your opponent's turn, they minimize your score (or maximize theirs).

**Formal:** Minimax DP where dp[i][j] represents the best outcome for the current player on the remaining game state [i..j] or similar.

### When should I use this?

- Two-player games with perfect information
- "Predict the winner" / "Stone Game" / "Nim"
- Keywords: "game," "two players," "optimal play," "predict winner," "stone game"

### When should I NOT use this?

- The game has randomness (not a pure strategy game)
- There's a mathematical formula (Nim game = XOR, Sprague-Grundy theory)

### Core Idea

**Stone Game / Predict the Winner:**
- dp[i][j] = maximum score difference the CURRENT player can achieve from pile [i..j]
- Current player can take from left or right:
  - Take left: stone[i] - dp[i+1][j] (opponent then plays optimally on [i+1..j])
  - Take right: stone[j] - dp[i][j-1]
- dp[i][j] = max(stone[i] - dp[i+1][j], stone[j] - dp[i][j-1])

**Why "score difference?"** If dp[0][n-1] ≥ 0, the first player wins (has at least as many points).

### Complexity

- **Time:** O(n²) for array games (interval DP structure)
- **Space:** O(n²)

### Variants

- **Stone Game (always even piles):** First player always wins (mathematical proof), but the DP solution still applies
- **Stone Game variants (I, II, III, IV, ...):** Various constraints on how many stones can be taken
- **Predict the Winner:** Same as stone game
- **Nim Game / Sprague-Grundy:** Mathematical solution (XOR of pile sizes). No DP needed.

### Related Patterns

- [Interval DP](#interval-dp) (game on subarray = interval DP structure)
- [Minimax](19-DESIGN-PATTERNS-AND-META.md) (general game theory approach)

### Interview Insights

- **Trap:** Stone Game I has a mathematical shortcut (first player always wins with even piles). But the interviewer might want the DP solution.
- **Key insight:** "Think about what the CURRENT player can do" — the sign flip (minus dp[next_state]) encodes the opponent playing optimally.

---

## Space Optimization

### What is this approach?

**Intuition:** If dp[i] only depends on dp[i-1] (and maybe dp[i-2]), why keep the entire table? Just keep the last row(s).

**Formal:** Reduce space from O(n × m) to O(m) by only keeping the current and previous rows/columns of the DP table (rolling array technique).

### When should I use this?

- The DP recurrence only looks back a fixed number of rows/columns
- The interviewer asks "can you optimize space?"

### Key Techniques

**1D → O(1):** If dp[i] depends only on dp[i-1] and dp[i-2], use two variables.

**2D → 1D (rolling array):** If dp[i][j] depends only on dp[i-1][...] and dp[i][j-1]:
- Keep one 1D array representing the current row
- Update in the correct order (left-to-right or right-to-left depending on dependencies)

**Knapsack space optimization:** 0/1 knapsack uses dp[i-1][w-weight] — iterate w from RIGHT to LEFT to preserve the previous row's values. Unbounded knapsack uses dp[i][w-weight] — iterate LEFT to RIGHT.

### Interview Insights

- **Trap:** Wrong iteration direction in knapsack. 0/1 = right to left (each item used once). Unbounded = left to right (reuse allowed).
- **Key insight:** Always mention space optimization as a follow-up, even if not asked. It shows depth.

---

## DP Optimization Techniques

### Overview

For advanced DP problems where the naive approach is too slow, these optimization techniques reduce the time complexity.

### Monotonic Queue Optimization

**When:** DP transition is dp[i] = min/max(dp[j] + cost(j, i)) for j in [i-K, i-1] (bounded range).

**Idea:** Maintain a monotonic deque of candidate j values. Each candidate is added/removed once. Reduces O(nK) to O(n).

**Example:** Jump Game with max jump distance K. dp[i] = min(dp[j] + 1) for j in [max(0, i-K), i-1]. Monotonic queue finds the min in the sliding window.

### Convex Hull Trick (CHT)

**When:** DP transition is dp[i] = min(dp[j] + b[j] × a[i]) where the "lines" have monotonically changing slopes.

**Idea:** Each dp[j] defines a line y = b[j] × x + dp[j]. For each new query x = a[i], evaluate the minimum over all lines. Maintain a convex hull of lines.

**Complexity:** O(n) amortized when slopes are sorted; O(n log n) otherwise (Li Chao tree).

### Divide and Conquer Optimization

**When:** dp[i][j] = min(dp[i-1][k] + cost(k+1, j)) for k ∈ [1, j], and the optimal k for j is monotonically non-decreasing as j increases.

**Idea:** Recursively compute dp[i][lo..hi] given that the optimal k is in [klo, khi]. Split at mid, find optimal k, then recurse on both halves.

**Complexity:** O(n × m × log m) reduced from O(n × m²).

### Knuth's Optimization

**When:** Interval DP dp[i][j] = min(dp[i][k] + dp[k][j] + cost(i, j)) where the optimal split point k[i][j] satisfies k[i][j-1] ≤ k[i][j] ≤ k[i+1][j].

**Idea:** Restrict the search for k based on neighbors' optimal splits.

**Complexity:** O(n²) reduced from O(n³).

### Aliens Trick (Lambda Optimization / WQS Binary Search)

**When:** dp with a constraint "use exactly K groups" and the optimal number of groups as K varies is unimodal.

**Idea:** Remove the K constraint, add a penalty λ per group. Binary search on λ to find the value that gives exactly K groups.

### Interview Insights

- **Note:** These optimizations are competitive-programming-level. In FAANG interviews, they appear rarely. But knowing they exist shows mastery.
- **Key insight:** If your DP is O(n³) or O(n²K), ask: "Does the optimal split point have monotonicity?" If yes, one of these optimizations applies.

---

*Next: [10-TREES.md](10-TREES.md) — Hierarchical thinking, from traversals to LCA.*
