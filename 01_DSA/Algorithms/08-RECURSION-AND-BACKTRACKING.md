# Recursion & Backtracking — Complete Pattern Guide

> *"Recursion is faith: trust that the function will solve the smaller problem correctly. Backtracking is discipline: explore everything, but retreat from dead ends immediately."*

---

## Table of Contents

1. [Recursion Mental Model](#recursion-mental-model)
2. [Subsets (Power Set)](#subsets-power-set)
3. [Combinations](#combinations)
4. [Permutations](#permutations)
5. [N-Queens](#n-queens)
6. [Sudoku Solver](#sudoku-solver)
7. [Word Search (Grid Backtracking)](#word-search-grid-backtracking)
8. [Generate Parentheses](#generate-parentheses)
9. [Palindrome Partitioning](#palindrome-partitioning)
10. [Pruning Strategies](#pruning-strategies)
11. [Decision Tree Visualization](#decision-tree-visualization)
12. [Constraint Satisfaction Framework](#constraint-satisfaction-framework)
13. [Letter Combinations of Phone Number](#letter-combinations-of-phone-number)
14. [Divide and Conquer](#divide-and-conquer)

---

## Recursion Mental Model

### What is this approach?

**Intuition:** Recursion is like Russian nesting dolls. Each doll contains a slightly smaller version of itself. To count all the dolls, open one, count it, and ask the smaller doll to count the rest. The smallest doll (base case) just says "1."

**Formal:** A function calls itself with reduced input. Each call trusts that the recursive call solves the smaller problem correctly. The base case stops the recursion. The recursive case combines the current step with the result of the smaller problem.

### The Three Laws of Recursion

1. **Base Case:** Every recursive function must have a stopping condition
2. **Progress:** Every recursive call must move toward the base case
3. **Trust:** Assume the recursive call returns the correct answer for the smaller problem

### The Call Stack

- Every recursive call adds a "frame" to the call stack (stores local variables, return address)
- When a call finishes, its frame is removed
- Stack overflow = too many frames (too deep recursion, usually > 10⁴ - 10⁵)

### When Does Recursion Become Backtracking?

- **Recursion:** Compute a result from smaller results (think: Fibonacci, tree traversal)
- **Backtracking:** Explore choices, undo if they lead to a dead end. Involves:
  1. **Choose:** Make a decision
  2. **Explore:** Recurse with that decision
  3. **Un-choose (backtrack):** Undo the decision, try the next option

### Interview Insights

- **Trap:** Not all recursive solutions are backtracking. Fibonacci is recursion, not backtracking. Backtracking requires the "choose, explore, un-choose" pattern.
- **Key insight:** "How do I convert this to iterative?" — Use an explicit stack. Every recursive solution can be made iterative with a stack.

---

## Subsets (Power Set)

### What is this approach?

**Intuition:** You are at a buffet with n dishes. For each dish, you make a binary choice: take it or leave it. After n decisions, you have one possible plate. All possible plates = all subsets.

**Formal:** Generate all 2^n subsets of a set of n elements. Each element is either included or excluded. This is the most fundamental backtracking pattern.

### When should I use this?

- "Generate all subsets" / "Power set"
- "Find all combinations that satisfy some property" (subsets with filtering)
- Keywords: "subsets," "power set," "all possible combinations," "all subsets"

### When should I NOT use this?

- You only need subsets of a specific size → use Combinations
- You need ordered arrangements → use Permutations
- n is too large (> 20-25) for 2^n solutions — need DP or mathematical approach instead

### Core Idea

**Approach 1 — Include/Exclude (binary decision tree):**
1. At each position i, make two recursive calls:
   - Include arr[i] in the current subset, recurse on i+1
   - Exclude arr[i], recurse on i+1
2. Base case: when i == n, record the current subset

**Approach 2 — Iterative inclusion:**
1. Start with result = [[]]
2. For each element, create new subsets by adding this element to all existing subsets
3. Add new subsets to result

**Approach 3 — Bitmask:**
1. For each number from 0 to 2^n - 1
2. Each bit represents include/exclude for the corresponding element
3. Construct subset based on set bits

### Complexity

- **Time:** O(n × 2^n) — 2^n subsets, each takes O(n) to copy
- **Space:** O(n) for recursion depth (excluding output)

### Variants

- **Subsets (distinct elements):** Standard approach
- **Subsets with duplicates:** Sort first. When an element equals the previous, only include it if the previous was also included (skip duplicate branches). Or: at each level, skip ahead past duplicate values.
- **Subsets with target sum:** Generate subsets and filter, OR use backtracking with pruning (sort first, prune when current sum > target)

### Related Patterns

- [Combinations](#combinations) (subsets of specific size)
- [Permutations](#permutations) (order matters)
- [Bitmask DP](09-DYNAMIC-PROGRAMMING.md) (using bitmask to represent subsets in DP)
- [Bit Manipulation](14-BIT-MANIPULATION.md) (bitmask enumeration of subsets)

### Interview Insights

- **Trap:** Handling duplicates. Without sorting and duplicate-skipping, [1,2,2] produces duplicate subsets.
- **Twist:** "Find all subsets with sum = K" — Combine with pruning: if current sum > K (assuming positive numbers), prune that branch.
- **Follow-up:** "How many subsets are there?" — 2^n (with or without generating them).

---

## Combinations

### What is this approach?

**Intuition:** From a pool of n people, choose K to form a committee. You go through each person and decide: are they on the committee or not? But you stop adding once you have K members.

**Formal:** Generate all C(n, K) ways to choose K elements from n elements. Like subsets, but with a size constraint. Order does not matter.

### When should I use this?

- "Choose K elements from n" / "All combinations of size K"
- "Combination Sum" — find combinations that add up to a target
- Keywords: "combinations," "choose K," "combination sum"

### When should I NOT use this?

- Order matters → use Permutations
- No size constraint → use Subsets
- You need count only (not enumeration) → use C(n,K) formula or DP

### Core Idea

1. Maintain a current combination and a start index
2. At each level, choose an element from [start, n]
3. Add it to the current combination
4. Recurse with start = chosen + 1 (to avoid duplicates) and reduced remaining count
5. Backtrack: remove the last element
6. Base case: current size == K → record combination

### Complexity

- **Time:** O(K × C(n,K)) — C(n,K) combinations, each takes O(K) to copy
- **Space:** O(K) recursion depth

### Variants

- **Combinations (choose K from [1,n]):** Standard approach
- **Combination Sum (unlimited use, distinct candidates):** Each candidate can be used multiple times. Recurse with start = current (not current + 1).
- **Combination Sum II (each number used once, duplicates in input):** Sort first. Skip duplicates at the same recursive level.
- **Combination Sum III (digits 1-9, K numbers, target sum):** Fixed candidate pool [1-9], choose K numbers.
- **Letter Combinations of Phone Number:** Each digit maps to 3-4 letters. Generate all combinations.

### Related Patterns

- [Subsets](#subsets-power-set) (combinations without size constraint)
- [Permutations](#permutations) (when order matters)
- [Knapsack DP](09-DYNAMIC-PROGRAMMING.md) (when counting is enough, DP is faster)

### Interview Insights

- **Trap:** In "Combination Sum II," handling duplicates at the same level. After using a value, skip all identical values at the same branching point.
- **Twist:** "Combination Sum with unlimited use" — recurse with start = current, not current + 1. This allows reuse.
- **Follow-up:** "Count combinations instead of generating" — DP is more efficient than enumeration for counting.

---

## Permutations

### What is this approach?

**Intuition:** Arranging books on a shelf. For the first position, you have n choices. For the second, n-1 (one is used). For the third, n-2. Etc. Total: n! arrangements.

**Formal:** Generate all n! orderings of n elements. Unlike subsets/combinations, ORDER MATTERS.

### When should I use this?

- "Generate all permutations"
- "All possible orderings"
- Keywords: "permutations," "arrangements," "all orderings"

### When should I NOT use this?

- Order doesn't matter → use Subsets or Combinations
- n is large (> 10-12) — n! grows extremely fast
- You only need a specific permutation (e.g., next permutation) — use a formula, not enumeration

### Core Idea

**Approach 1 — Used Array:**
1. Maintain a boolean array `used[]`
2. At each recursive level, try each unused element
3. Mark as used, add to current permutation, recurse
4. Backtrack: unmark, remove

**Approach 2 — Swap-based:**
1. For position i, swap arr[i] with each arr[j] for j = i to n-1
2. Recurse on position i+1
3. Swap back (backtrack)

### Complexity

- **Time:** O(n × n!) — n! permutations, each takes O(n) to copy
- **Space:** O(n) for recursion depth + used array

### Variants

- **Permutations (distinct elements):** Standard approach
- **Permutations with duplicates:** Sort first. At each level, skip elements that equal the previous choice if the previous wasn't used (or: use a set at each level to avoid picking the same value twice).
- **Next Permutation:** Not backtracking! Find rightmost ascent pair, swap with the smallest larger element to the right, reverse the suffix. O(n) algorithm.
- **Kth Permutation Sequence:** Factorial number system. For each position, determine which element goes there based on K / (remaining)!

### Related Patterns

- [Subsets](#subsets-power-set) (order doesn't matter)
- [Combinations](#combinations) (fixed size, order doesn't matter)
- [N-Queens](#n-queens) (permutation with constraints)

### Interview Insights

- **Trap:** Permutations with duplicates. The swap-based approach is tricky with duplicates — the used-array approach with sorting is safer.
- **Twist:** "Kth Permutation" — Don't generate all n! permutations. Use factorial math to directly compute the Kth one. O(n²) or O(n) with the right data structure.
- **Follow-up:** "Next Permutation" is a VERY common interview problem. It's an O(n) algorithm, not backtracking.

---

## N-Queens

### What is this approach?

**Intuition:** Place N queens on an N×N chessboard so no two queens threaten each other. You place queens one row at a time. For each row, try each column. If the position is safe (no other queen attacks it), place the queen and move to the next row. If you're stuck, go back and try a different column.

**Formal:** Constraint satisfaction via backtracking. Each row has exactly one queen. Try each column position, check diagonal and column constraints, recurse.

### When should I use this?

- Classic backtracking with constraint checking
- Any problem reducible to "place items in positions with constraints"

### When should I NOT use this?

- N is very large — backtracking is exponential. (N-Queens is tractable up to ≈ 15-20 with optimizations.)

### Core Idea

1. Place queens row by row (row 0, 1, 2, ...)
2. For each row, try each column c:
   - Check column constraint: no other queen in column c
   - Check diagonal constraints: no other queen on the two diagonals through (row, c)
3. If safe, place queen and recurse to next row
4. If not safe, try next column
5. If all columns fail, backtrack (remove queen from previous row)

**Constraint checking optimization:**
- Use three sets: `cols`, `diag1` (row - col), `diag2` (row + col)
- Column conflict: c in cols
- Main diagonal conflict: (row - c) in diag1
- Anti-diagonal conflict: (row + c) in diag2

### Complexity

- **Time:** Approximately O(n!) — n choices for first row, ≈ n-2 for second (due to constraints), etc.
- **Space:** O(n) for the board state + recursion depth

### Variants

- **N-Queens (return all solutions):** Full backtracking
- **N-Queens II (count solutions):** Same backtracking but just count, don't store
- **N-Queens with additional constraints:** Extra rules (e.g., some squares blocked)

### Related Patterns

- [Sudoku Solver](#sudoku-solver) (same constraint satisfaction paradigm)
- [Permutations](#permutations) (N-Queens is a constrained permutation of column positions)
- [Bitmask Optimization](14-BIT-MANIPULATION.md) (columns and diagonals can be tracked as bitmasks for speed)

### Interview Insights

- **Trap:** Checking constraints in O(n) per queen placement (scanning previous rows). Use sets for O(1) checking.
- **Twist:** "Just count the solutions" — Same algorithm, simpler implementation (no need to build board strings).
- **Key insight:** N-Queens is the canonical constraint satisfaction problem. Mastering it means you can handle Sudoku, word search, and other constraint problems.

---

## Sudoku Solver

### What is this approach?

**Intuition:** Solving a Sudoku puzzle: for each empty cell, try numbers 1-9. If a number doesn't conflict with the row, column, and box, place it and move on. If you get stuck, erase and try the next number.

**Formal:** Backtracking with three constraint sets (row membership, column membership, 3×3 box membership). Fill cells left-to-right, top-to-bottom. Try each valid number. Backtrack if no number works.

### When should I use this?

- "Solve Sudoku"
- Grid-based constraint satisfaction problems
- Keywords: "Sudoku," "fill grid with constraints"

### When should I NOT use this?

- The puzzle has no solution — backtracking will explore all possibilities and conclude "no solution"
- More efficient techniques exist (constraint propagation, arc consistency) but are rarely needed for interviews

### Core Idea

1. Find the next empty cell
2. For each candidate number (1-9):
   - Check row, column, and box constraints
   - If valid, place the number
   - Recurse to the next empty cell
   - If recursion succeeds, return true
   - Else, backtrack (remove number)
3. If no number works, return false

**Optimization:** Use three 2D boolean arrays (or sets) for row/col/box membership for O(1) constraint checking.

### Complexity

- **Time:** O(9^(empty cells)) theoretical worst case, but constraints prune heavily
- **Space:** O(81) = O(1) for the board + recursion depth (max 81)

### Related Patterns

- [N-Queens](#n-queens) (same paradigm)
- [Constraint Satisfaction](#constraint-satisfaction-framework) (general framework)

### Interview Insights

- **Trap:** Not using efficient constraint tracking. Scanning the row/col/box each time is slow.
- **Twist:** "Is this puzzle solvable?" — Same algorithm. If backtracking exhausts all options, no solution exists.
- **Follow-up:** "Generate a valid Sudoku puzzle" — Solve an empty board with randomization, then remove cells ensuring unique solution.

---

## Word Search (Grid Backtracking)

### What is this approach?

**Intuition:** Searching for a word in a letter grid by walking through adjacent cells. At each cell, if the letter matches, move to a neighbor. Mark your path to avoid revisiting cells. If you hit a dead end, retrace your steps.

**Formal:** Backtracking on a 2D grid. Starting from each cell that matches the first character, explore all four directions recursively to build the word character by character.

### When should I use this?

- "Word Search" — find if a word exists in a grid
- "Word Search II" — find all words from a dictionary in a grid
- Grid exploration with path constraints
- Keywords: "word search," "find word in grid," "path in grid"

### When should I NOT use this?

- You need shortest path — use BFS instead
- No backtracking needed (just checking if a cell is reachable) — DFS or BFS without undo

### Core Idea

1. For each cell (r, c) that matches word[0]:
   - Mark cell as visited (change character to '#' or use visited array)
   - Recursively check four neighbors for word[1], then word[2], etc.
   - If all characters matched, return true
   - Un-mark cell (restore character) — backtrack
2. If no starting cell leads to a complete match, return false

### Complexity

- **Time:** O(m × n × 4^L) where L = word length. For each starting cell, explore up to 4^L paths.
- **Space:** O(L) recursion depth

### Variants

- **Word Search (single word):** Standard backtracking on grid
- **Word Search II (multiple words):** Build a Trie from the word list. Backtrack on the grid but use the Trie to prune: if the current prefix isn't in the Trie, stop. Much faster than searching each word independently.

### Related Patterns

- [Grid BFS/DFS](11-GRAPHS.md) (exploring grids without backtracking)
- [Trie](16-ADVANCED-DATA-STRUCTURES.md) (for Word Search II optimization)

### Interview Insights

- **Trap:** Not restoring the visited mark during backtracking. This causes missed valid paths.
- **Twist:** "Word Search II" — Brute-forcing each word is too slow. Trie + backtracking is the expected approach.
- **Follow-up:** "What if the board is very large?" — Optimize with Trie pruning and early termination.

---

## Generate Parentheses

### What is this approach?

**Intuition:** Building valid parentheses strings character by character. At each position, you can either place an open parenthesis (if you haven't used all n opens) or a close parenthesis (if the number of closes is less than the number of opens placed so far). These two constraints guide the backtracking.

**Formal:** Generate all strings with n pairs of balanced parentheses. Use backtracking with two counters: open_count and close_count.

### When should I use this?

- "Generate all valid parentheses"
- "Catalan number generation" (the count of valid sequences is the nth Catalan number)
- Keywords: "generate parentheses," "valid brackets"

### When should I NOT use this?

- You just need the count — Catalan number formula is O(n)
- n is very large — 2^n strings is too many

### Core Idea

1. Maintain current string, open_count, close_count
2. If open_count < n: add '(', recurse
3. If close_count < open_count: add ')', recurse
4. Base case: length == 2n → add to result

### Complexity

- **Time:** O(4^n / √n) — the nth Catalan number, which is the exact count of valid sequences
- **Space:** O(n) recursion depth

### Variants

- **Generate Parentheses (one type):** As described
- **Multiple types of brackets:** Extend constraints: close bracket must match the most recent open bracket (use a stack to track)

### Related Patterns

- [Catalan Numbers](15-MATH-AND-NUMBER-THEORY.md) (the mathematical foundation)
- [Stack / Parentheses](07-STACKS-AND-QUEUES.md) (validation uses a stack; generation uses backtracking)

### Interview Insights

- **Trap:** Generating all strings then filtering valid ones — much slower than constraint-guided backtracking.
- **Twist:** "Print them in sorted order" — The backtracking approach already generates in sorted order if you always try '(' before ')'.

---

## Palindrome Partitioning

### What is this approach?

**Intuition:** Cut a string into pieces where every piece reads the same forwards and backwards. Try every possible first cut, check if the first piece is a palindrome, then recursively partition the rest.

**Formal:** Find all ways to partition a string such that every substring is a palindrome. Backtracking: at each position, try all possible palindrome prefixes, and recurse on the remainder.

### When should I use this?

- "Palindrome Partitioning" (return all valid partitions)
- "Palindrome Partitioning II" (minimum cuts — this is DP, not backtracking)
- Keywords: "partition into palindromes"

### When should I NOT use this?

- You want MINIMUM cuts (optimization) — use DP, not backtracking
- The string is generated and you need properties (not partitions) — use Manacher's or DP

### Core Idea

1. At position `start`, try every `end` from `start` to `n-1`:
   - If s[start..end] is a palindrome:
     - Add it to current partition
     - Recurse on position end+1
     - Backtrack: remove last piece
2. Base case: start == n → record current partition

**Optimization:** Precompute a 2D boolean table `isPalin[i][j]` so palindrome checks are O(1).

### Complexity

- **Time:** O(n × 2^n) worst case — 2^(n-1) possible partitions, each takes O(n)
- **Space:** O(n) recursion depth + O(n²) for palindrome precomputation

### Related Patterns

- [Dynamic Programming](09-DYNAMIC-PROGRAMMING.md) (Palindrome Partitioning II — min cuts)
- [Manacher's Algorithm](17-STRING-ALGORITHMS.md) (finding all palindromic substrings)

### Interview Insights

- **Trap:** Checking palindrome from scratch at each step — O(n) per check × many checks. Precompute the table.
- **Twist:** "Minimum cuts" (Palindrome Partitioning II) — Switch from backtracking to DP.

---

## Pruning Strategies

### What is this approach?

Pruning = cutting off branches of the decision tree that cannot lead to valid solutions. It turns exponential algorithms from impractical to practical.

### Key Pruning Techniques

| Technique | How It Works | Example |
|---|---|---|
| **Constraint Checking** | Don't explore if the current state violates a constraint | N-Queens: skip columns with existing queens |
| **Bound Checking** | If the current partial answer already exceeds bounds, stop | Combination Sum: if current_sum > target, prune |
| **Sorted Candidates** | Sort candidates first. If current candidate is too large, all further candidates are too | Combination Sum with sorted input |
| **Symmetry Breaking** | Eliminate equivalent branches | For subsets of [1,1,2], skip second 1 at the same level |
| **Forward Checking** | Check if remaining choices can satisfy constraints | If remaining elements can't reach the target sum, prune early |
| **Value Ordering** | Try more promising values first | Place the most constrained variable first in CSPs |

### Interview Insights

- **Key insight:** Every backtracking problem benefits from at least one pruning strategy. Always discuss what pruning you would add.
- **Trap:** Over-pruning (cutting valid branches) is worse than under-pruning. Ensure your pruning condition is correct.

---

## Decision Tree Visualization

### What is this approach?

Before writing any backtracking solution, draw the decision tree. This is the most powerful technique for understanding backtracking problems.

### How to Draw

1. **Root:** The initial state (empty set, empty string, etc.)
2. **Branches:** Each possible choice at the current level
3. **Nodes:** The state after making a choice
4. **Leaves:** Complete solutions (or dead ends)

### Example: Subsets of {1, 2, 3}

```
                    {}
                 /       \
              {1}         {}
             /   \       /  \
          {1,2} {1}    {2}   {}
          / \   / \    / \   / \
      {1,2,3} {1,2} {1,3} {1} {2,3} {2} {3} {}
```

### Why This Matters

- **Branching factor:** How many choices per level → determines time complexity base
- **Depth:** How many levels → determines recursion depth
- **Pruning points:** Where can you cut branches? The more, the better.
- **Time complexity:** Total nodes in the tree ≈ (branching factor)^depth

### Interview Insights

- **Key insight:** In an interview, sketching the decision tree can earn you points even if your implementation has bugs. It shows you understand the problem structure.

---

## Constraint Satisfaction Framework

### What is this approach?

A general framework for all backtracking problems:

1. **Variables:** What decisions are you making? (which column for each queen, which number for each cell, which character at each position)
2. **Domains:** What values can each variable take? (columns 0 to n-1, digits 1-9, letters a-z)
3. **Constraints:** What combinations are forbidden? (same column, same diagonal, same row/box)

### The Algorithm

1. Choose the next unassigned variable
2. For each value in its domain:
   - If the value is consistent with all constraints:
     - Assign the value
     - Recurse
     - Un-assign (backtrack)
3. If no value works, return failure

### Optimization: Variable Ordering

Choose the variable with the **fewest remaining legal values** (MRV — Minimum Remaining Values). This fails sooner when a solution doesn't exist, pruning more effectively.

### Interview Insights

- **Key insight:** Every backtracking problem is a constraint satisfaction problem (CSP). Framing it this way helps you organize your thinking and identify pruning opportunities.

---

## Letter Combinations of Phone Number

### What is this approach?

**Intuition:** Each digit maps to 3-4 letters. For each digit in the input, branch into all corresponding letters. This creates a tree of depth = number of digits, each level branching 3-4 ways.

### When should I use this?

- Each position has a fixed set of choices from a mapping
- Keywords: "letter combinations," "phone keypad"

### Core Idea

1. For each digit, look up the corresponding letters
2. For each letter, add to current combination, recurse on next digit
3. Base case: all digits processed → record combination

### Complexity

- **Time:** O(4^n × n) where n = number of digits (worst case: each digit maps to 4 letters)
- **Space:** O(n) recursion depth

### Interview Insights

- **Trap:** Edge case: input is empty → return empty list
- **Twist:** "What if the phone has a different mapping?" — Parameterize the digit→letter mapping

---

## Divide and Conquer

### What is this approach?

**Intuition:** Divide a big problem into smaller independent pieces, solve each piece, and combine the results. Unlike DP, the subproblems DON'T overlap.

**Formal:** Split the input into parts (usually halves), solve each recursively, and merge the results. The merge step does the real work.

### When should I use this?

- The problem splits into **independent** subproblems
- A "merge" step can combine subproblem results
- Keywords: "merge sort," "count inversions," "closest pair of points," "different ways to add parentheses"

### When should I NOT use this?

- Subproblems **overlap** → use DP instead (otherwise you recompute)
- The "merge" step costs too much to be efficient
- The problem has a simpler iterative solution

### Core Idea

1. **Divide:** Split into subproblems (usually by index range)
2. **Conquer:** Recursively solve each subproblem
3. **Combine:** Merge/combine subproblem results

### Complexity

- Depends on the problem. Use the Master Theorem:
  - T(n) = a × T(n/b) + O(n^d)
  - If d > log_b(a): O(n^d)
  - If d == log_b(a): O(n^d × log n)
  - If d < log_b(a): O(n^(log_b(a)))

### Variants

- **Merge Sort:** Divide at midpoint, merge sorted halves. O(n log n).
- **Count Inversions:** Same as merge sort, count cross-inversions during merge.
- **Closest Pair of Points:** Divide by x-coordinate. Merge: check pairs near the dividing line. O(n log n).
- **Different Ways to Add Parentheses:** For expression with operators, try splitting at each operator. Left and right subexpression results combine via that operator.
- **Maximum Subarray (D&C approach):** Split at mid. Max subarray is in left half, right half, or crosses the midpoint. O(n log n).

### Related Patterns

- [Dynamic Programming](09-DYNAMIC-PROGRAMMING.md) (when subproblems overlap, D&C becomes DP with memoization)
- [Binary Search](03-SEARCHING-TECHNIQUES.md) (also divides the problem, but only recurses on ONE half)
- [Merge Sort](04-SORTING-AND-ORDER.md#merge-sort--divide-and-conquer-patterns) (the canonical D&C algorithm)

### Interview Insights

- **Trap:** Using D&C when subproblems overlap. This causes exponential blowup (see Fibonacci). Add memoization to get DP.
- **Key insight:** D&C and DP are siblings. D&C = independent subproblems. DP = overlapping subproblems.

---

*Next: [09-DYNAMIC-PROGRAMMING.md](09-DYNAMIC-PROGRAMMING.md) — The ultimate pattern recognition challenge.*
