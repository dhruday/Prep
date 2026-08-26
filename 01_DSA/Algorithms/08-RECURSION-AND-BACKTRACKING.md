# Recursion & Backtracking — 1-Hour Learning Module

> *"Recursion is faith: trust that the function will solve the smaller problem correctly. Backtracking is discipline: explore everything, but retreat from dead ends immediately."*

**Target:** Google SWE interview prep | Estimated time: 60 minutes

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

---

## [0–10 min] Big Picture

### What is Recursion?

A function that calls itself on a **smaller version of the same problem** until it hits a trivially solvable case (the base case).

**Why does it exist?** Some problems are naturally self-similar — a tree node has subtrees that are also trees, a list has a head and a smaller list as its tail, a problem of size n depends on a solution of size n-1. Recursion lets you express that self-similarity directly in code.

**Real-world analogy — Russian nesting dolls (Matryoshka):**
To count all dolls, open the outermost one, count it (1), then ask: "how many dolls are inside?" The inner doll answers the same question on a smaller input. The smallest doll that can't open answers: "just me — 1." You combine: 1 + answer from inner = total.

```
countDolls(doll) =
  1  +  countDolls(inner doll)    ← recursive case
  1                               ← base case: no inner doll
```

### What is Backtracking?

Recursion where you **make a choice, explore it, then undo it** to try the next choice.

**Real-world analogy — solving a maze:**
At each fork, pick a direction and walk. If you hit a dead end, walk back to the last fork and try the other direction. You undo your steps to try alternatives. Backtracking is systematic maze-solving.

### One Tiny Example

**Problem:** Print all subsets of `[1, 2]`.

At each element, you make a binary decision: include or exclude.

```
Start: []
  Include 1 → [1]
    Include 2 → [1, 2]   ✓ record
    Exclude 2 → [1]      ✓ record
  Exclude 1 → []
    Include 2 → [2]      ✓ record
    Exclude 2 → []       ✓ record

Result: [1,2], [1], [2], []
```

Every backtracking problem is a decision tree like this. Your job is to draw that tree and write code that walks it.

---

## [10–20 min] Mental Model

### What Is Actually Happening: The Call Stack

Every recursive call creates a **stack frame** that stores:
- Local variables (current element, current path, counters)
- A return address (where to go when done)

When the call returns, its frame is popped. Backtracking exploits this: the calling frame's state is automatically restored when the recursive call returns. Any mutations you made explicitly (pushing to a list) must be manually undone.

```
solve([], index=0)
  solve([1], index=1)
    solve([1,2], index=2)   ← base case, record [1,2], RETURN
    ← back here, undo: remove 2
    solve([1], index=2)     ← base case, record [1], RETURN
  ← back here, undo: remove 1
  solve([], index=1)
    solve([2], index=2)     ← base case, record [2], RETURN
    ← back here, undo: remove 2
    solve([], index=2)      ← base case, record [], RETURN
```

### Key Insight: Trust the Recursion

The hardest thing for beginners: **you do not need to mentally simulate the full recursion**. Instead, ask:

1. What does this function represent (its contract)?
2. What is the base case?
3. Assuming the recursive call returns the correct answer for a smaller input, how do I use it to answer the current input?

This is called the **leap of faith**. Fibonacci: `fib(n) = fib(n-1) + fib(n-2)` — trust that `fib(n-1)` and `fib(n-2)` are correct. Your only job is to combine them.

### The Three Laws Every Recursive Function Must Follow

1. **Base case:** A condition that stops the recursion (no more recursive call)
2. **Progress:** Every recursive call must move closer to the base case
3. **Trust:** Assume the recursive call is correct and use its result

### Recursion vs Backtracking: The Core Difference

| | Recursion | Backtracking |
|---|---|---|
| Goal | Compute a result | Explore all possibilities |
| Undo step? | No | Yes — un-choose after exploring |
| Example | Fibonacci, factorial, tree traversal | Subsets, permutations, N-Queens |
| Return type | Usually a single value | Usually void, collects into a result list |

**Recursion:** `f(n) = combine(current, f(n-1))`

**Backtracking:**
```
explore(state, choices):
  if done: record(state); return
  for each choice in choices:
    make(choice)       ← add to state
    explore(state, remaining choices)
    undo(choice)       ← remove from state
```

### Call Tree: Fibonacci (Pure Recursion)

```
fib(4)
├── fib(3)
│   ├── fib(2)
│   │   ├── fib(1) = 1
│   │   └── fib(0) = 0
│   └── fib(1) = 1
└── fib(2)
    ├── fib(1) = 1
    └── fib(0) = 0
```

Notice: fib(2) is computed twice. This is the overlap problem — recursion without memoization recomputes. That is why DP exists (but more on that in [Pattern Recognition](#45-55-min-pattern-recognition)).

### Call Tree: Subsets of [1,2] (Backtracking)

```
solve(path=[], i=0)
├── include 1 → solve(path=[1], i=1)
│   ├── include 2 → solve(path=[1,2], i=2) → record [1,2]
│   └── exclude 2 → solve(path=[1], i=2)  → record [1]
└── exclude 1 → solve(path=[], i=1)
    ├── include 2 → solve(path=[2], i=2)   → record [2]
    └── exclude 2 → solve(path=[], i=2)    → record []
```

Depth = n (number of elements). Leaves = 2^n (all subsets). Every non-leaf node makes exactly two choices.

---

## [20–35 min] Core Pattern

### When to Use Recursion

- The problem decomposes into the **same problem on a smaller input**
- Tree/graph traversal (a subtree is a smaller tree)
- Divide and conquer (merge sort, binary search)
- Computing values that depend on smaller values (Fibonacci, factorial)

### When to Use Backtracking

- You need to **enumerate all possible configurations** (all subsets, all permutations, all valid placements)
- You are building a solution incrementally and need to **explore choices and abandon dead ends**
- Problems with the word "all," "every possible," "generate all," "find all valid"

### When NOT to Use Either

- **Use DP instead:** if you need the optimal solution (min/max) and subproblems overlap (Fibonacci, knapsack)
- **Use BFS instead:** if you need the shortest path (BFS explores by layers, backtracking explores depth-first)
- **Use a formula:** if you only need the count, not the actual configurations (C(n,k), Catalan number)
- If n is large: 2^n or n! grows fast. Backtracking is only practical for small n (typically n ≤ 20 for 2^n, n ≤ 12 for n!).

### How to Recognize Backtracking in a Problem Statement

- "Generate all..."
- "Find all subsets / combinations / permutations / arrangements"
- "Place N queens... return all solutions"
- "Partition the string such that..."
- "Find all paths..."
- A constraint satisfaction problem where you must try possibilities and check validity

### The Universal Backtracking Template

Every backtracking problem fits this shape:

```
backtrack(current_state, available_choices):
    if current_state is complete:
        record(current_state)
        return

    for each choice in available_choices:
        if isValid(choice, current_state):    ← optional: prune early
            make(choice)                       ← modify state
            backtrack(updated_state, remaining_choices)
            undo(choice)                       ← restore state
```

**The six variables you always need to identify:**

| Variable | Question to ask |
|---|---|
| State | What am I building? (current path, current board, current string) |
| Choices | What can I add at this step? |
| Validity | What makes a choice legal right now? |
| Termination | How do I know I'm done? |
| Recording | When and how do I save a solution? |
| Undo | What exactly must I reverse after exploring? |

### The Five Most Important Backtracking Patterns

#### Pattern 1: Include/Exclude (Subsets)

At each index, binary choice: include this element or skip it. Produces all 2^n subsets.

```
subsets(nums, index, current, result):
    if index == nums.length:
        result.add(copy of current)
        return
    current.add(nums[index])          ← include
    subsets(nums, index+1, current, result)
    current.remove(last)               ← undo include
    subsets(nums, index+1, current, result)  ← exclude (no undo needed)
```

**Why it works:** Every element is independently included or excluded. The recursion depth is n. Each leaf represents one unique decision sequence → one unique subset.

**Handles duplicates:** Sort first. Before making the "include" call, skip if this element equals the previous AND the previous was not included at this level. More commonly: at a for-loop level (see Combinations), after processing `nums[i]`, skip all `nums[i+1] == nums[i]`.

#### Pattern 2: For-Loop with Start Index (Combinations)

Choose k elements from n, order doesn't matter. Use a start index to avoid picking the same element twice (in different orders).

```
combine(nums, start, k, current, result):
    if current.size == k:
        result.add(copy of current)
        return
    for i from start to nums.length - 1:
        current.add(nums[i])
        combine(nums, i+1, k, current, result)   ← i+1 prevents reuse
        current.remove(last)

    // Pruning: if nums.length - i < k - current.size, not enough elements left → stop
```

**Combination Sum (unlimited reuse):** Pass `i` instead of `i+1` to allow re-picking the same element.

**Combination Sum II (input has duplicates):** Sort first. Inside the loop, `if (i > start && nums[i] == nums[i-1]) continue;` — skip duplicates at the same recursive level.

#### Pattern 3: Used Array (Permutations)

Order matters. Each element can appear once per permutation. Track which elements are used.

```
permute(nums, used, current, result):
    if current.size == nums.length:
        result.add(copy of current)
        return
    for i from 0 to nums.length - 1:
        if used[i]: continue
        used[i] = true
        current.add(nums[i])
        permute(nums, used, current, result)
        current.remove(last)
        used[i] = false
```

**With duplicates:** Sort first. Add condition: `if (i > 0 && nums[i] == nums[i-1] && !used[i-1]) continue;`

**Swap-based alternative:** Swap `nums[i]` with `nums[start]`, recurse on `start+1`, swap back. Avoids the `used` array but is harder to reason about with duplicates.

#### Pattern 4: Constraint Sets (N-Queens / Sudoku)

Placement problems where constraints reduce the choice domain.

```
placeQueens(row, cols, diag1, diag2, board, result):
    if row == n:
        result.add(buildBoard(board))
        return
    for col from 0 to n-1:
        if col in cols or (row-col) in diag1 or (row+col) in diag2:
            continue                           ← constraint check
        board[row] = col
        add col to cols, (row-col) to diag1, (row+col) to diag2
        placeQueens(row+1, cols, diag1, diag2, board, result)
        remove col from cols, (row-col) from diag1, (row+col) from diag2
```

**Insight:** Use three hash sets for O(1) constraint checking. Column conflict: `c in cols`. Main diagonal: `(row - col)` is constant. Anti-diagonal: `(row + col)` is constant.

#### Pattern 5: Grid DFS with Undo (Word Search)

Walk through a 2D grid, marking visited cells. Undo the mark when backtracking.

```
search(board, word, r, c, index):
    if index == word.length: return true
    if r/c out of bounds or board[r][c] != word[index]: return false
    temp = board[r][c]
    board[r][c] = '#'                  ← mark visited
    found = search(..., r+1,c, index+1) OR search(..., r-1,c, ...) OR ...
    board[r][c] = temp                 ← restore (undo)
    return found
```

### Pruning: The Difference Between Passing and Failing

Pruning = cutting branches of the decision tree that cannot lead to a solution.

| Technique | When to apply | Example |
|---|---|---|
| Constraint check | Before making a choice | N-Queens: skip columns with attacking queens |
| Bound check | Current partial sum exceeds target | Combination Sum: prune if `current_sum > target` |
| Sort + early exit | Sorted candidates, too large means all remaining are too large | `if (nums[i] > remaining) break;` in Combination Sum |
| Symmetry breaking | Duplicate elements at the same level | Skip `nums[i] == nums[i-1]` at same depth |
| Forward checking | Can remaining choices even satisfy the constraint? | If remaining length < characters still needed in Word Search |

**Always discuss pruning in an interview.** Unpruned backtracking may time out; pruning is the difference between exponential and practical.

---

## [35–45 min] Concrete Code + Dry Run

### Example 1: Subsets

**Input:** `nums = [1, 2, 3]`
**Output:** `[[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]`

**Java:**
```java
public List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), result);
    return result;
}

private void backtrack(int[] nums, int index, List<Integer> current, List<List<Integer>> result) {
    result.add(new ArrayList<>(current));
    for (int i = index; i < nums.length; i++) {
        current.add(nums[i]);
        backtrack(nums, i + 1, current, result);
        current.remove(current.size() - 1);
    }
}
```

**JavaScript:**
```javascript
function subsets(nums) {
    const result = [];
    function backtrack(index, current) {
        result.push([...current]);
        for (let i = index; i < nums.length; i++) {
            current.push(nums[i]);
            backtrack(i + 1, current);
            current.pop();
        }
    }
    backtrack(0, []);
    return result;
}
```

**Dry Run for `[1, 2, 3]` — Call Tree:**
```
backtrack(i=0, path=[])         → record []
  add 1 → backtrack(i=1, [1])  → record [1]
    add 2 → backtrack(i=2, [1,2])  → record [1,2]
      add 3 → backtrack(i=3, [1,2,3]) → record [1,2,3]
      remove 3
    remove 2
    add 3 → backtrack(i=3, [1,3])  → record [1,3]
    remove 3
  remove 1
  add 2 → backtrack(i=2, [2])  → record [2]
    add 3 → backtrack(i=3, [2,3])  → record [2,3]
    remove 3
  remove 2
  add 3 → backtrack(i=3, [3])  → record [3]
  remove 3
```

**Complexity:** Time O(n × 2^n) — 2^n subsets, each O(n) to copy. Space O(n) recursion depth.

---

### Example 2: Permutations

**Input:** `nums = [1, 2, 3]`
**Output:** `[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]`

**Java:**
```java
public List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    boolean[] used = new boolean[nums.length];
    backtrack(nums, used, new ArrayList<>(), result);
    return result;
}

private void backtrack(int[] nums, boolean[] used, List<Integer> current, List<List<Integer>> result) {
    if (current.size() == nums.length) {
        result.add(new ArrayList<>(current));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        current.add(nums[i]);
        backtrack(nums, used, current, result);
        current.remove(current.size() - 1);
        used[i] = false;
    }
}
```

**JavaScript:**
```javascript
function permute(nums) {
    const result = [];
    const used = new Array(nums.length).fill(false);
    function backtrack(current) {
        if (current.length === nums.length) {
            result.push([...current]);
            return;
        }
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            current.push(nums[i]);
            backtrack(current);
            current.pop();
            used[i] = false;
        }
    }
    backtrack([]);
    return result;
}
```

**Dry Run for `[1, 2, 3]` (first branch only):**
```
backtrack(path=[], used=[F,F,F])
  i=0: used[0]=T, path=[1]
    i=1: used[1]=T, path=[1,2]
      i=2: used[2]=T, path=[1,2,3] → record [1,2,3]
      used[2]=F, path=[1,2]
    used[1]=F, path=[1]
    i=2: used[2]=T, path=[1,3]
      i=1: used[1]=T, path=[1,3,2] → record [1,3,2]
      used[1]=F, path=[1,3]
    used[2]=F, path=[1]
  used[0]=F, path=[]
  ... (continue for i=1, i=2)
```

**Complexity:** Time O(n × n!) — n! permutations, each O(n) to copy. Space O(n) for `used` array and recursion depth.

---

### Example 3: Generate Parentheses

**Input:** `n = 3`
**Output:** `["((()))","(()())","(())()","()(())","()()()"]`

**Java:**
```java
public List<String> generateParenthesis(int n) {
    List<String> result = new ArrayList<>();
    backtrack(n, 0, 0, new StringBuilder(), result);
    return result;
}

private void backtrack(int n, int open, int close, StringBuilder current, List<String> result) {
    if (current.length() == 2 * n) {
        result.add(current.toString());
        return;
    }
    if (open < n) {
        current.append('(');
        backtrack(n, open + 1, close, current, result);
        current.deleteCharAt(current.length() - 1);
    }
    if (close < open) {
        current.append(')');
        backtrack(n, open, close + 1, current, result);
        current.deleteCharAt(current.length() - 1);
    }
}
```

**JavaScript:**
```javascript
function generateParenthesis(n) {
    const result = [];
    function backtrack(open, close, current) {
        if (current.length === 2 * n) {
            result.push(current);
            return;
        }
        if (open < n) backtrack(open + 1, close, current + '(');
        if (close < open) backtrack(open, close + 1, current + ')');
    }
    backtrack(0, 0, '');
    return result;
}
```

**Why the constraints work:** Adding `(` is valid whenever `open < n`. Adding `)` is valid whenever `close < open` (you can only close what you've opened). These two rules eliminate all invalid strings upfront — no need to generate and filter.

**Call Tree for n=2:**
```
backtrack(open=0, close=0, "")
  add ( → backtrack(1, 0, "(")
    add ( → backtrack(2, 0, "((")
      add ) → backtrack(2, 1, "(()")
        add ) → backtrack(2, 2, "(())") → record
    add ) → backtrack(2, 1, "()")     ← wait: open=1, close can be added
    (actually add ( → open=2 → then close twice)
```

**Complexity:** Time O(4^n / √n) — the nth Catalan number. Space O(n) recursion depth.

---

### Example 4: N-Queens

**Input:** `n = 4`
**Output:** `[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]`

**Java:**
```java
public List<List<String>> solveNQueens(int n) {
    List<List<String>> result = new ArrayList<>();
    int[] board = new int[n];
    Set<Integer> cols = new HashSet<>(), diag1 = new HashSet<>(), diag2 = new HashSet<>();
    backtrack(0, n, board, cols, diag1, diag2, result);
    return result;
}

private void backtrack(int row, int n, int[] board, Set<Integer> cols,
                        Set<Integer> diag1, Set<Integer> diag2, List<List<String>> result) {
    if (row == n) {
        result.add(buildBoard(board, n));
        return;
    }
    for (int col = 0; col < n; col++) {
        if (cols.contains(col) || diag1.contains(row - col) || diag2.contains(row + col))
            continue;
        board[row] = col;
        cols.add(col); diag1.add(row - col); diag2.add(row + col);
        backtrack(row + 1, n, board, cols, diag1, diag2, result);
        cols.remove(col); diag1.remove(row - col); diag2.remove(row + col);
    }
}

private List<String> buildBoard(int[] board, int n) {
    List<String> rows = new ArrayList<>();
    for (int row = 0; row < n; row++) {
        char[] line = new char[n];
        Arrays.fill(line, '.');
        line[board[row]] = 'Q';
        rows.add(new String(line));
    }
    return rows;
}
```

**Key insight on diagonals:**
- On a main diagonal (top-left to bottom-right): every cell has `row - col = constant`
- On an anti-diagonal (top-right to bottom-left): every cell has `row + col = constant`

Two queens share a diagonal if and only if they have the same `row - col` or `row + col` value.

**Complexity:** Time approximately O(n!) in the worst case, but constraints prune heavily. Space O(n) for board + sets.

---

## [45–55 min] Pattern Recognition

### Structural Clues in Problem Statements

| Clue | Likely approach |
|---|---|
| "Generate all", "find all", "enumerate" | Backtracking |
| "Minimum", "maximum", "optimal" | DP (if overlapping subproblems) or Greedy |
| "Is it possible" | DFS/BFS or backtracking with early return |
| "Shortest path" | BFS |
| "Tree traversal", "tree height" | Recursion |
| "Split array/string into parts" | Recursion or DP |
| "Sort then choose k" | Combinations with pruning |
| Choices at each step, choices are independent | Backtracking |
| Choices at each step, result can be reused | DP |

### What to Ask Yourself

1. Am I computing a **single value** from smaller values? → Recursion (possibly with memoization → DP)
2. Am I **exploring all configurations** and collecting valid ones? → Backtracking
3. Do subproblems **overlap** (same subproblem solved multiple times)? → Add memoization (DP)
4. Do I need the **shortest / fewest** steps? → BFS (not backtracking)
5. After making a choice, do I need to **undo it** to try others? → Backtracking (not just DFS)

### Recursion vs Backtracking

| | Recursion | Backtracking |
|---|---|---|
| State change | Passed as argument (immutable from caller's view) | Modified shared structure |
| Undo step | Not needed | Always present |
| Use case | Compute and return a value | Collect all valid configurations |
| Pattern | `return f(n) = combine(current, f(n-1))` | `choose → explore → undo` |

### Backtracking vs Dynamic Programming

Both use recursion. The key question: **do subproblems overlap?**

- **Backtracking:** Each path in the decision tree is unique. No repeated subproblems. Cannot memoize (state includes full path).
- **DP:** The same subproblem (e.g., Fibonacci(3)) is reached from multiple paths. Memoize to avoid recomputation.

```
Fibonacci: fib(3) called from fib(5) AND from fib(4) → overlap → use DP
Subsets: [1,2,3] path is unique per branch → no overlap → backtracking
```

**Practical test:** If your recursive state includes a **list/path being built**, it's backtracking — you can't memoize it because two calls with the same `index` but different `path` contents are NOT the same subproblem.

### DFS vs Backtracking

| | DFS | Backtracking |
|---|---|---|
| Undo required? | No — just visiting nodes | Yes — undo after exploring each child |
| Mutates state? | No (or uses a visited set without undoing) | Yes (modifies path/board, then undoes) |
| Goal | Traverse/reach nodes | Build and collect all valid configurations |
| Example | Find if path exists | Find all paths |

DFS on a graph is not backtracking unless you're explicitly undoing state to explore alternative paths (e.g., Word Search marks a cell visited and then unmarks it — that is backtracking, not pure DFS).

### Recognizing Which Backtracking Sub-Pattern

| Problem type | Pattern to use | Key variable |
|---|---|---|
| All subsets | Include/exclude binary tree | index |
| All combinations of size k | For-loop with start index | start, remaining count |
| Combination sum | For-loop with start, allow reuse | start (pass `i` not `i+1` for reuse) |
| All permutations | For-loop with `used[]` | used boolean array |
| Grid path / word search | 4-directional DFS with mark/unmark | visited state on board |
| Constraint satisfaction (N-Queens, Sudoku) | For-loop with constraint sets | sets for O(1) validity check |
| String partition | For-loop over all split points | start index |
| Phone letter combinations | For-loop over mapped letters | digit index |

### Divide and Conquer vs Backtracking

Both use recursion. Key difference: **what happens to subproblem results**.

- **Divide and Conquer:** Split into independent subproblems, solve each, **merge** results. Subproblems do not share state. (Merge Sort, Count Inversions)
- **Backtracking:** Build a configuration step by step, trying all choices. No merge — just collect complete configurations at leaves.

D&C is top-down decomposition. Backtracking is bottom-up construction through exploration.

**Master Theorem for D&C complexity:** T(n) = a × T(n/b) + O(n^d)
- d > log_b(a): O(n^d)
- d = log_b(a): O(n^d × log n)
- d < log_b(a): O(n^(log_b a))

---

## [55–60 min] Final Mental Checklist

Before writing any recursion/backtracking solution, answer these 7 questions:

```
[ ] 1. What does my function represent? (contract: given this state, it does what?)
[ ] 2. What is the base case? (termination condition)
[ ] 3. Does every recursive call make progress toward the base case?
[ ] 4. What is my state? (what am I building? what have I used?)
[ ] 5. What are my choices at each step?
[ ] 6. What do I need to undo after each recursive call?
[ ] 7. What pruning can I add? (sort + early break, constraint sets, bound checks)
```

After writing the solution:
```
[ ] Does the base case correctly terminate recursion?
[ ] Do I make a COPY of the current path when recording? (not a reference)
[ ] Do I undo EXACTLY what I did before the recursive call?
[ ] Are duplicates handled? (sort first + skip same value at same level)
[ ] Stack overflow risk? (n > 10^4 → consider iterative with explicit stack)
[ ] Complexity: is 2^n or n! acceptable for given n?
```

---

## Active Recall

Test yourself without looking at the notes:

1. What are the three laws every recursive function must follow?
2. What is the "choose, explore, undo" pattern and why is the undo step necessary?
3. Draw the complete call tree for `subsets([1, 2])`. How many nodes? How many leaves?
4. In the Combinations pattern, why do we pass `i+1` instead of `i` to the recursive call? When would you pass `i`?
5. In Permutations with duplicates, what exact condition do you add to skip duplicates, and why does it require sorting first?
6. For N-Queens, what mathematical property identifies a main diagonal? An anti-diagonal?
7. What is the difference between DFS on a graph and backtracking on a grid (Word Search)?
8. When should you switch from backtracking to DP? Give a concrete example.
9. How do you handle duplicates in Subsets vs Combination Sum II — what is the difference in approach?
10. What does the Catalan number count? Which problems from this module have Catalan-number counts?

---

## Recommended Practice Direction

**Start here (core patterns, must-solve):**
- LeetCode 78 — Subsets (include/exclude pattern)
- LeetCode 46 — Permutations (used-array pattern)
- LeetCode 77 — Combinations (for-loop with start index)
- LeetCode 39 — Combination Sum (allow reuse: pass `i` not `i+1`)
- LeetCode 22 — Generate Parentheses (constraint-guided backtracking)

**After the above feel solid:**
- LeetCode 40 — Combination Sum II (duplicates in input, skip at same level)
- LeetCode 90 — Subsets II (subsets with duplicates)
- LeetCode 47 — Permutations II (permutations with duplicates)
- LeetCode 131 — Palindrome Partitioning (backtracking + precompute palindrome table)
- LeetCode 17 — Letter Combinations of a Phone Number

**Grid and constraint satisfaction:**
- LeetCode 79 — Word Search (grid backtracking, mark/unmark)
- LeetCode 51 — N-Queens (constraint sets for O(1) validity)
- LeetCode 37 — Sudoku Solver (same paradigm as N-Queens)

**Advanced:**
- LeetCode 212 — Word Search II (backtracking + Trie for pruning)
- LeetCode 332 — Reconstruct Itinerary (backtracking with graph structure)
- LeetCode 93 — Restore IP Addresses (constrained string partitioning)

**For Divide and Conquer specifically:**
- LeetCode 241 — Different Ways to Add Parentheses
- LeetCode 315 — Count of Smaller Numbers After Self (merge sort variant)

---

## 2-Minute Cheat Sheet

```
RECURSION
  f(n) = combine(current step, f(n-1))
  Base case → Progress → Trust

BACKTRACKING TEMPLATE
  backtrack(state):
    if done: record(state); return
    for each choice:
      if valid(choice):
        make(choice)
        backtrack(state)
        undo(choice)

PATTERNS AT A GLANCE
  Subsets      → include/exclude binary tree, 2^n leaves
  Combinations → for-loop + start index, no reuse
  Comb Sum     → for-loop + start index, pass i (reuse)
  Permutations → for-loop + used[] array, n! leaves
  N-Queens     → constraint sets cols/diag1/diag2, O(1) checks
  Word Search  → 4-dir DFS, mark '#'/unmark
  Gen Parens   → open<n → add (, close<open → add )

DUPLICATE HANDLING
  Sort first, then:
  • In for-loop: if (i > start && nums[i] == nums[i-1]) continue
  • In used-array: if (i > 0 && nums[i] == nums[i-1] && !used[i-1]) continue

DECISION KEY
  "All configurations"    → Backtracking
  "Optimal value"         → DP (if overlapping) / Greedy
  "Shortest path"         → BFS
  "Overlapping subprobs"  → Add memoization → DP
  "Same problem smaller"  → Recursion / D&C

COMPLEXITY
  Subsets/Combinations: O(n × 2^n)
  Permutations: O(n × n!)
  Gen Parens: O(4^n / √n)   [Catalan number]
  N-Queens: O(n!)            [heavily pruned in practice]
  Word Search: O(m×n × 4^L) [L = word length]
```

---

*Next: [09-DYNAMIC-PROGRAMMING.md](09-DYNAMIC-PROGRAMMING.md) — When subproblems overlap, backtracking becomes DP.*
