# Recursion & Backtracking

> **8 algorithms covered:** Basic Recursion · Subsets / Power Set · Permutations · Combinations (Combination Sum) · Palindrome Partitioning · N-Queens (Constraint Satisfaction) · Grid DFS / Word Search · Sudoku Solver

---

## Table of Contents

1. [Basic Recursion](#basic-recursion)
2. [Subsets / Power Set](#subsets--power-set)
3. [Permutations](#permutations)
4. [Combinations (Combination Sum Style)](#combinations-combination-sum-style)
5. [Palindrome Partitioning](#palindrome-partitioning)
6. [N-Queens (Constraint Satisfaction)](#n-queens-constraint-satisfaction)
7. [Grid DFS / Backtracking (Word Search)](#grid-dfs--backtracking-word-search)
8. [Sudoku Solver](#sudoku-solver)

---

## Basic Recursion

### What is it?
A function that calls itself on a smaller version of the same problem. You define a base case (the simplest input with a known answer) and a recursive case (reduce the problem and call yourself). The call stack handles the rest.

### Visual
```
factorial(4)
└── 4 * factorial(3)
        └── 3 * factorial(2)
                └── 2 * factorial(1)
                        └── base case: return 1
```

### How does it work?
1. Define what the function should return (its contract).
2. Identify the base case — the smallest input you can answer directly.
3. For any other input, express the answer in terms of a smaller call.
4. Trust that the smaller call returns the correct answer (leap of faith).
5. Combine the current step's contribution with the recursive result.
6. Return the combined result.

### Why does it work?
Every recursive call reduces the problem size by at least one step, so eventually you always hit the base case and the stack unwinds with correct answers from the bottom up.

### When to use?
- Computing a value that depends on the same value for a smaller input (factorial, fibonacci, power).
- Tree or linked-list traversal (a subtree is the same structure, just smaller).
- Divide-and-conquer problems (merge sort, binary search).
- When the problem is naturally self-similar.

### When NOT to use?
- When subproblems overlap and you're recomputing the same call many times — add memoization or switch to DP.
- When n is huge (n > 10^5) and the recursion depth would blow the stack.

### How to recognize in a new problem?
Ask: "Can I solve this by solving a slightly smaller version of it?" If yes, recursion fits. Signals: "compute nth value", "traverse a tree", "split and process halves", "reduce by one element each time".

### Simple Example
Input: `n = 4` → Expected output: `24`

`factorial(4)` = 4 × `factorial(3)` = 4 × 3 × `factorial(2)` = 4 × 3 × 2 × `factorial(1)` = 4 × 3 × 2 × 1 = 24

### Code
```java
// Java
int factorial(int n) {
    if (n <= 1) return 1;           // base case
    return n * factorial(n - 1);   // recursive case
}
```
```javascript
// JavaScript
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

### Dry Run
```
factorial(4)
  → 4 * factorial(3)
         → 3 * factorial(2)
                → 2 * factorial(1)
                       → return 1
                → return 2
         → return 6
  → return 24
```

### Complexity
```
Time:  O(n) — one call per value from n down to 1
Space: O(n) — call stack holds n frames at peak depth
```

### Common Trap
1. Forgetting the base case — causes infinite recursion and a stack overflow.
2. Base case is wrong (e.g., using `n == 0` for factorial when the loop should end at 1) — causes off-by-one errors or wrong answers.

### Experience Tip
**Experience Tip:** Before writing any code, write a one-sentence description of what the function returns. If you cannot describe it clearly, you do not understand the recursion yet. That sentence becomes your contract and prevents you from writing recursive calls that violate it.

### Do Not Confuse With
- **Backtracking:** Recursion that also undoes choices to explore alternatives. Basic recursion computes a result; backtracking explores a space.
- **DP:** Recursion with memoization. When the same recursive call gets triggered multiple times, cache it.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 509 | Fibonacci Number | Easy | Direct recursive definition; use to practice base case + trust | https://leetcode.com/problems/fibonacci-number/ |
| 206 | Reverse Linked List | Easy | Recursive: reverse tail, then fix head's link | https://leetcode.com/problems/reverse-linked-list/ |
| 104 | Maximum Depth of Binary Tree | Easy | Tree recursion: depth = 1 + max(left, right) | https://leetcode.com/problems/maximum-depth-of-binary-tree/ |
| 344 | Reverse String | Easy | Swap outer chars, recurse on inner substring | https://leetcode.com/problems/reverse-string/ |
| 50 | Pow(x, n) | Medium | Use x^n = x^(n/2) * x^(n/2) to get O(log n) | https://leetcode.com/problems/powx-n/ |

### One-Minute Revision
```
ALGORITHM:     Basic Recursion
IN SIMPLE WORDS: Function calls itself on a smaller input; base case stops it
USE WHEN:      Problem = same problem on smaller input (tree, linked list, math)
DON'T USE WHEN: Overlapping subproblems (use DP) or n too large (stack overflow)
CORE IDEA:     Trust the recursive call; just handle the current step
TRACK:         Current value + return from recursive call
TIME:          O(n) typically
SPACE:         O(n) call stack depth
COMMON TRAP:   Missing or wrong base case
EXPERIENCE TIP: Write what the function returns in one sentence before coding
```

---

## Subsets / Power Set

### What is it?
Generate every possible subset of a given array (including empty set and the full array). For n elements there are 2^n subsets because each element is either in or out. This is the most fundamental backtracking pattern.

### Visual
```
nums = [1, 2]

                    []
                 /       \
           [1]              []
          /    \           /    \
       [1,2]   [1]       [2]    []
      (record)(record) (record)(record)
```
At each level: left branch = include current element, right branch = exclude it.

### How does it work?
1. Start with an empty current path and index 0.
2. At each call, immediately record the current path as a valid subset.
3. Loop from the current index to end of array.
4. Add `nums[i]` to path (Choose).
5. Recurse with index `i+1` (Explore).
6. Remove last element from path (Undo).
7. The loop naturally handles the "exclude" case by moving to the next element.

### Why does it work?
Recording the path at the start of every call (not just the leaves) captures all subsets — the empty set, all single-element subsets, all two-element subsets, etc. The for-loop starting at `index` ensures elements are never repeated in reverse order, so `[1,2]` and `[2,1]` are not both generated.

### When to use?
- "Generate all subsets / power set."
- "Find all subsequences."
- Any problem where you pick a subset of items and check a condition on it.
- When the answer needs every possible combination without caring about order.

### When NOT to use?
- When you need permutations (order matters) — use the permutation pattern.
- When n is large (> 20) — 2^n explodes.

### How to recognize in a new problem?
The problem asks for "all possible" selections from a set where order does not matter and each element is either included or not. Signals: "all subsets", "all subsequences", "power set", "every possible selection".

### Simple Example
Input: `[1, 2]` → Expected output: `[[], [1], [1,2], [2]]`

Start at index 0, path=[]. Record []. Add 1, path=[1]. Record [1]. Add 2, path=[1,2]. Record [1,2]. Remove 2, path=[1]. Remove 1, path=[]. Add 2, path=[2]. Record [2]. Remove 2, path=[]. Done.

### Code
```java
// Java
public List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), result);
    return result;
}

private void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> result) {
    result.add(new ArrayList<>(path));   // record current subset
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);               // choose
        backtrack(nums, i + 1, path, result); // explore
        path.remove(path.size() - 1);   // undo
    }
}
```
```javascript
// JavaScript
function subsets(nums) {
    const result = [];
    function backtrack(start, path) {
        result.push([...path]);          // record current subset
        for (let i = start; i < nums.length; i++) {
            path.push(nums[i]);          // choose
            backtrack(i + 1, path);     // explore
            path.pop();                  // undo
        }
    }
    backtrack(0, []);
    return result;
}
```

### Dry Run
```
backtrack(start=0, path=[])       → record []
  i=0: add 1, path=[1]
    backtrack(start=1, path=[1])  → record [1]
      i=1: add 2, path=[1,2]
        backtrack(start=2, path=[1,2]) → record [1,2]
      remove 2, path=[1]
    (loop ends)
  remove 1, path=[]
  i=1: add 2, path=[2]
    backtrack(start=2, path=[2])  → record [2]
    (loop ends)
  remove 2, path=[]
(loop ends)

Result: [], [1], [1,2], [2]
```

### Complexity
```
Time:  O(n × 2^n) — 2^n subsets, each takes O(n) to copy into result
Space: O(n) — call stack depth is at most n; path list also O(n)
```

### Common Trap
1. Not making a copy of `path` when recording — you add a reference that gets mutated later, so all entries in result end up being the same empty list.
2. Passing `i` instead of `i+1` — causes each element to be included multiple times in one subset.

### Experience Tip
**Experience Tip:** The for-loop version (record at top, loop from start) is easier to extend than the include/exclude binary-branch version. All combination-style problems use this same skeleton — learn it once.

### Do Not Confuse With
- **Permutations:** Order matters, uses a `used[]` array, not a start index.
- **Combinations of size k:** Same pattern but only record when `path.size() == k`.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 78 | Subsets | Medium | Classic pattern; record at top of every call | https://leetcode.com/problems/subsets/ |
| 90 | Subsets II | Medium | Sort first; skip `nums[i] == nums[i-1]` when `i > start` | https://leetcode.com/problems/subsets-ii/ |
| 784 | Letter Case Permutation | Medium | At each char choose lowercase or uppercase | https://leetcode.com/problems/letter-case-permutation/ |
| 491 | Non-decreasing Subsequences | Medium | Cannot sort; use a set to track used values per level | https://leetcode.com/problems/non-decreasing-subsequences/ |
| 1239 | Maximum Length of a Concatenated String with Unique Characters | Medium | Subset of strings; prune when chars overlap | https://leetcode.com/problems/maximum-length-of-a-concatenated-string-with-unique-characters/ |

### One-Minute Revision
```
ALGORITHM:     Subsets / Power Set
IN SIMPLE WORDS: For each element: include or skip; record every partial state
USE WHEN:      "All subsets", "all subsequences", power set
DON'T USE WHEN: Order matters (use permutations) or n > 20
CORE IDEA:     Record path at top of every call; loop from start to avoid duplicates
TRACK:         current path, current start index
TIME:          O(n × 2^n)
SPACE:         O(n) call stack
COMMON TRAP:   Forget new ArrayList(path) — all results point to same list
EXPERIENCE TIP: For-loop version generalizes to all combination problems; master it
```

---

## Permutations

### What is it?
Generate all orderings of a given array. Unlike subsets, order matters here — `[1,2]` and `[2,1]` are different results. For n distinct elements there are n! permutations. A boolean `used[]` array tracks which elements are already in the current path.

### Visual
```
nums = [1, 2, 3]

                    []
           /         |         \
        [1]         [2]         [3]
       /   \       /   \       /   \
    [1,2] [1,3] [2,1] [2,3] [3,1] [3,2]
      |     |     |     |     |     |
  [1,2,3][1,3,2][2,1,3][2,3,1][3,1,2][3,2,1]
```

### How does it work?
1. Start with an empty path and `used[]` all false.
2. If path length equals nums length, record it as a complete permutation (base case).
3. Loop through every index from 0 to n-1 (Choose from all elements).
4. Skip if `used[i]` is true.
5. Mark `used[i] = true`, add `nums[i]` to path (Choose).
6. Recurse (Explore).
7. Remove last element from path, mark `used[i] = false` (Undo).

### Why does it work?
By iterating from index 0 every time (not from a start index), every element can appear at every position. The `used[]` array prevents an element from being used twice in a single permutation.

### When to use?
- "Generate all permutations / arrangements / orderings."
- When order matters and each element is used exactly once.
- Scheduling problems where you try every sequence.

### When NOT to use?
- When order does not matter (use subsets/combinations).
- When n > 12 — n! is enormous.

### How to recognize in a new problem?
The problem needs every possible ordering of a set of items. Signals: "all permutations", "all arrangements", "rearrange all elements", "every possible sequence".

### Simple Example
Input: `[1, 2]` → Expected output: `[[1,2], [2,1]]`

Path=[]. Try index 0: use 1, path=[1]. Try index 1 (0 is used): use 2, path=[1,2]. Record. Undo. Undo. Try index 1: use 2, path=[2]. Try index 0 (1 not used): use 1, path=[2,1]. Record.

### Code
```java
// Java
public List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    boolean[] used = new boolean[nums.length];
    backtrack(nums, used, new ArrayList<>(), result);
    return result;
}

private void backtrack(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> result) {
    if (path.size() == nums.length) {
        result.add(new ArrayList<>(path));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        path.add(nums[i]);                   // choose
        backtrack(nums, used, path, result); // explore
        path.remove(path.size() - 1);        // undo
        used[i] = false;
    }
}
```
```javascript
// JavaScript
function permute(nums) {
    const result = [];
    const used = new Array(nums.length).fill(false);
    function backtrack(path) {
        if (path.length === nums.length) {
            result.push([...path]);
            return;
        }
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            path.push(nums[i]);    // choose
            backtrack(path);       // explore
            path.pop();            // undo
            used[i] = false;
        }
    }
    backtrack([]);
    return result;
}
```

### Dry Run
```
backtrack(path=[], used=[F,F,F])
  i=0: used[0]=T, path=[1]
    i=1: used[1]=T, path=[1,2]
      i=2: used[2]=T, path=[1,2,3] → RECORD [1,2,3]
      used[2]=F, path=[1,2]
    used[1]=F, path=[1]
    i=2: used[2]=T, path=[1,3]
      i=1: used[1]=T, path=[1,3,2] → RECORD [1,3,2]
      used[1]=F, path=[1,3]
    used[2]=F, path=[1]
  used[0]=F, path=[]
  (continue i=1, i=2 — produces 4 more permutations)
```

### Complexity
```
Time:  O(n × n!) — n! permutations, each takes O(n) to copy
Space: O(n) — used array O(n) + call stack depth O(n)
```

### Common Trap
1. Forgetting to reset `used[i] = false` after the recursive call — future iterations think that element is still in use.
2. Using a start index (like subsets) instead of iterating from 0 — you will miss permutations.

### Experience Tip
**Experience Tip:** For Permutations II (with duplicates), sort the array first then add: `if (i > 0 && nums[i] == nums[i-1] && !used[i-1]) continue;`. The `!used[i-1]` condition skips a duplicate only when the previous identical element was NOT used in this path (meaning it was already counted at this level), preventing identical permutations.

### Do Not Confuse With
- **Subsets:** Order does not matter, use start index. Permutations use `used[]` and restart loop from 0.
- **Combinations:** Pick k elements, order does not matter, use start index.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 46 | Permutations | Medium | Classic; used[] array, restart loop from 0 each level | https://leetcode.com/problems/permutations/ |
| 47 | Permutations II | Medium | Sort + skip when nums[i]==nums[i-1] && !used[i-1] | https://leetcode.com/problems/permutations-ii/ |
| 31 | Next Permutation | Medium | Not backtracking but tests understanding of permutation order | https://leetcode.com/problems/next-permutation/ |
| 60 | Permutation Sequence | Hard | Find kth permutation without generating all — math + backtracking | https://leetcode.com/problems/permutation-sequence/ |
| 567 | Permutation in String | Medium | Sliding window; tests permutation recognition, not generation | https://leetcode.com/problems/permutation-in-string/ |

### One-Minute Revision
```
ALGORITHM:     Permutations
IN SIMPLE WORDS: Try every element at each position; skip already-used ones
USE WHEN:      Order matters, use each element once, generate all orderings
DON'T USE WHEN: Order doesn't matter (use subsets/combos) or n > 12
CORE IDEA:     Loop from 0 every time + used[] array to avoid reuse
TRACK:         current path, used[] boolean array
TIME:          O(n × n!)
SPACE:         O(n) call stack + used array
COMMON TRAP:   Forget used[i]=false on undo; or use start index instead of 0
EXPERIENCE TIP: Permutations II — sort + !used[i-1] condition handles duplicates
```

---

## Combinations (Combination Sum Style)

### What is it?
Pick numbers from a list to reach a target sum. There are two sub-variants: (1) each number can be used unlimited times (Combination Sum), (2) each number used at most once (Combination Sum II). The for-loop-with-start-index is the core skeleton. Recording only happens at the leaves (when target is met), unlike subsets.

### Visual
```
candidates = [2, 3, 6, 7], target = 7

                       []  target=7
              /         |         \       \
          [2] t=5    [3] t=4    [6] t=1  [7] t=0
         / | \       / \          |        RECORD
      [2,2][2,3][2,6][3,3][3,6] [6,6]
      t=3  t=2  t=-1  t=1  t=-2  t=-5
      ...
```

### How does it work?
1. Start with empty path, target remaining = original target.
2. If remaining == 0, record the current path (base case — found a valid combination).
3. If remaining < 0, return (pruning — overshot, no point continuing).
4. Loop from current start index to end of candidates.
5. Add `candidates[i]` to path, subtract from remaining (Choose).
6. Recurse with `i` as start (for reuse) or `i+1` (no reuse) (Explore).
7. Remove last element, restore remaining (Undo).

### Why does it work?
Passing `i` (not `i+1`) as the next start index allows reusing the same element. Passing `i+1` prevents reuse. The start index always moves forward, so you never generate `[2,3]` and `[3,2]` as separate answers — order is fixed by construction.

### When to use?
- "Find all combinations that sum to target."
- Picking items with or without replacement where you need all valid picks.
- "Choose k numbers from 1..9 that sum to target" (Combination Sum III).

### When NOT to use?
- When you need all subsets regardless of any constraint — use the subsets pattern.
- When only the count matters and n is large — use DP.

### How to recognize in a new problem?
The problem asks for all ways to reach a target by summing elements. Signals: "combination sum", "find all combinations", "reach target by adding", "choose numbers that add to".

### Simple Example
Input: `candidates = [2, 3]`, `target = 5` → Expected output: `[[2,2,2,... no], [2,3], [3,2]... wait]`
Correct: `[[2,3], [3,2]` are the same combination — output is `[[2,3]]` because we go left to right.

Trace: path=[], rem=5. Take 2, path=[2], rem=3. Take 2 again, path=[2,2], rem=1. Take 2, rem=-1 → prune. Back. Take 3, path=[2,3], rem=0 → RECORD. Back. Back. Take 3, path=[3], rem=2. Take 3, rem=-1 → prune. Back.
Result: `[[2,3]]`

### Code
```java
// Java — Combination Sum (unlimited reuse, LC 39)
public List<List<Integer>> combinationSum(int[] candidates, int target) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(candidates, 0, target, new ArrayList<>(), result);
    return result;
}

private void backtrack(int[] candidates, int start, int remaining,
                        List<Integer> path, List<List<Integer>> result) {
    if (remaining == 0) {
        result.add(new ArrayList<>(path));
        return;
    }
    for (int i = start; i < candidates.length; i++) {
        if (candidates[i] > remaining) break; // prune (works when sorted)
        path.add(candidates[i]);
        backtrack(candidates, i, remaining - candidates[i], path, result); // i not i+1
        path.remove(path.size() - 1);
    }
}
```
```javascript
// JavaScript — Combination Sum (unlimited reuse, LC 39)
function combinationSum(candidates, target) {
    const result = [];
    candidates.sort((a, b) => a - b);
    function backtrack(start, remaining, path) {
        if (remaining === 0) {
            result.push([...path]);
            return;
        }
        for (let i = start; i < candidates.length; i++) {
            if (candidates[i] > remaining) break;
            path.push(candidates[i]);
            backtrack(i, remaining - candidates[i], path); // i not i+1
            path.pop();
        }
    }
    backtrack(0, target, []);
    return result;
}
```

### Dry Run
```
candidates=[2,3,6,7], target=7

backtrack(start=0, rem=7, path=[])
  i=0 (val=2): path=[2], rem=5
    i=0 (val=2): path=[2,2], rem=3
      i=0 (val=2): path=[2,2,2], rem=1
        i=0 (val=2): 2>1 → break (pruned)
      remove 2, path=[2,2]
      i=1 (val=3): 3>1 → break (pruned)
    remove 2, path=[2]
    i=1 (val=3): path=[2,3], rem=0 → RECORD [2,3]
    remove 3
    i=2 (val=6): 6>2 → break
  remove 2
  i=1 (val=3): path=[3], rem=4
    i=1 (val=3): path=[3,3], rem=1 → all > 1 → break
    remove 3
  remove 3
  i=2 (val=6): 6>7? no. path=[6], rem=1 → 2>1 → break
  remove 6
  i=3 (val=7): path=[7], rem=0 → RECORD [7]
  remove 7

Result: [[2,3],[7]]
```

### Complexity
```
Time:  O(n^(T/M)) — T=target, M=min candidate; branching factor n, depth T/M
Space: O(T/M) — call stack depth (path length bounded by target/min)
```

### Common Trap
1. Passing `i+1` instead of `i` for Combination Sum — you will miss combinations that reuse an element.
2. Not sorting candidates before using the `break` pruning — the break only works correctly when candidates are in ascending order.

### Experience Tip
**Experience Tip:** Combination Sum II (LC 40) uses `i+1` (no reuse) and requires duplicate handling: sort the array, then inside the loop add `if (i > start && candidates[i] == candidates[i-1]) continue;`. This skips starting a new branch with a value already tried at this level — preventing duplicate combinations.

### Do Not Confuse With
- **Subsets:** No target sum, record everything. Combinations record only when target is met.
- **Permutations:** Order matters, candidates are distinct positions.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 39 | Combination Sum | Medium | Reuse allowed — pass i not i+1; sort + break to prune | https://leetcode.com/problems/combination-sum/ |
| 40 | Combination Sum II | Medium | No reuse, duplicates in input — sort + skip same val at same level | https://leetcode.com/problems/combination-sum-ii/ |
| 216 | Combination Sum III | Medium | Choose k numbers from 1-9 summing to n; add size check | https://leetcode.com/problems/combination-sum-iii/ |
| 377 | Combination Sum IV | Medium | Count combinations (order matters) — use DP, not backtracking | https://leetcode.com/problems/combination-sum-iv/ |
| 17 | Letter Combinations of a Phone Number | Medium | Map digit → letters; same for-loop skeleton over mapped chars | https://leetcode.com/problems/letter-combinations-of-a-phone-number/ |

### One-Minute Revision
```
ALGORITHM:     Combinations / Combination Sum
IN SIMPLE WORDS: Pick numbers adding to target; use start index to avoid duplicate combos
USE WHEN:      "All combinations summing to target", pick-with-or-without-replacement
DON'T USE WHEN: Only count needed (use DP) or n large
CORE IDEA:     Record at rem==0; pass i (reuse) or i+1 (no reuse)
TRACK:         path, start index, remaining target
TIME:          O(n^(T/M)) roughly
SPACE:         O(T/M) call stack
COMMON TRAP:   i vs i+1 confusion; forgetting to sort before break-pruning
EXPERIENCE TIP: Combo Sum II — sort + skip nums[i]==nums[i-1] when i>start
```

---

## Palindrome Partitioning

### What is it?
Split a string into all possible substrings such that every substring is a palindrome. This combines backtracking (try all split points) with a palindrome check at each step. Every valid complete partition (where all parts together equal the original string) is recorded.

### Visual
```
s = "aab"

                     ""  (start=0)
              /             \
           "a"               "aa"
          (start=1)          (start=2)
          /    \                 \
       "a"     "ab"             "b"
      (start=2) (not full)     (start=3 = end)
          \                    RECORD ["aa","b"]
          "b"
         (start=3)
         RECORD ["a","a","b"]
```

### How does it work?
1. Start with an empty path and index 0.
2. If index equals string length, record the current path (base case — full string partitioned).
3. Loop from index to end of string (try every possible first cut).
4. Extract the substring from index to i (inclusive).
5. If it is a palindrome: add it to path (Choose), recurse with start = i+1 (Explore), remove it (Undo).
6. If not a palindrome: skip (prune).

### Why does it work?
By trying all cut points, you explore every possible way to split the string. The palindrome check at each step prunes branches early — if a prefix is not a palindrome, no point exploring deeper with that prefix.

### When to use?
- "Partition a string such that every part is a palindrome."
- Any string splitting problem where every segment must satisfy a property.

### When NOT to use?
- When you only need the minimum cuts (use DP — Palindrome Partitioning II).

### How to recognize in a new problem?
"Partition" + "every part must be X" is the signal. The pattern: try all prefixes, check the condition, recurse on the remaining suffix.

### Simple Example
Input: `"aab"` → Expected output: `[["a","a","b"], ["aa","b"]]`

At index 0: try "a" (palindrome) → recurse on "ab". At index 1: try "a" (palindrome) → recurse on "b". At index 2: "b" palindrome → RECORD ["a","a","b"]. Back. Try "ab" — not palindrome, skip. Back. Try "aa" (palindrome) → recurse on "b". "b" palindrome → RECORD ["aa","b"]. Try "aab" — not palindrome, skip.

### Code
```java
// Java
public List<List<String>> partition(String s) {
    List<List<String>> result = new ArrayList<>();
    backtrack(s, 0, new ArrayList<>(), result);
    return result;
}

private void backtrack(String s, int start, List<String> path, List<List<String>> result) {
    if (start == s.length()) {
        result.add(new ArrayList<>(path));
        return;
    }
    for (int end = start; end < s.length(); end++) {
        if (isPalindrome(s, start, end)) {
            path.add(s.substring(start, end + 1)); // choose
            backtrack(s, end + 1, path, result);   // explore
            path.remove(path.size() - 1);           // undo
        }
    }
}

private boolean isPalindrome(String s, int left, int right) {
    while (left < right) {
        if (s.charAt(left++) != s.charAt(right--)) return false;
    }
    return true;
}
```
```javascript
// JavaScript
function partition(s) {
    const result = [];
    function isPalindrome(left, right) {
        while (left < right) {
            if (s[left++] !== s[right--]) return false;
        }
        return true;
    }
    function backtrack(start, path) {
        if (start === s.length) {
            result.push([...path]);
            return;
        }
        for (let end = start; end < s.length; end++) {
            if (isPalindrome(start, end)) {
                path.push(s.slice(start, end + 1)); // choose
                backtrack(end + 1, path);           // explore
                path.pop();                          // undo
            }
        }
    }
    backtrack(0, []);
    return result;
}
```

### Dry Run
```
s = "aab"

backtrack(start=0, path=[])
  end=0: "a" isPalin? yes → path=["a"]
    backtrack(start=1, path=["a"])
      end=1: "a" isPalin? yes → path=["a","a"]
        backtrack(start=2, path=["a","a"])
          end=2: "b" isPalin? yes → path=["a","a","b"]
            backtrack(start=3) → start==len → RECORD ["a","a","b"]
          remove "b"
      remove "a"
      end=2: "ab" isPalin? no → skip
    remove "a"
  end=1: "aa" isPalin? yes → path=["aa"]
    backtrack(start=2, path=["aa"])
      end=2: "b" isPalin? yes → path=["aa","b"]
        backtrack(start=3) → RECORD ["aa","b"]
      remove "b"
  remove "aa"
  end=2: "aab" isPalin? no → skip
```

### Complexity
```
Time:  O(n × 2^n) — 2^(n-1) ways to partition, palindrome check O(n) each
Space: O(n) — call stack depth O(n), path length O(n)
```

### Common Trap
1. Using `s.substring(start, end)` (exclusive end) when you mean `s.substring(start, end+1)` — off-by-one misses the last character.
2. Not checking isPalindrome before recursing — this wastes time and generates invalid partitions.

### Experience Tip
**Experience Tip:** For large inputs, precompute a 2D boolean table `dp[i][j] = true if s[i..j] is palindrome` in O(n^2) time and O(n^2) space. Then each palindrome check during backtracking is O(1). This optimization is often expected at Google level.

### Do Not Confuse With
- **Palindrome Partitioning II (LC 132):** Only asks for minimum cuts — use DP, not backtracking.
- **Valid Palindrome:** Single string check, no partitioning.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 131 | Palindrome Partitioning | Medium | Classic; try all prefixes, check palindrome, recurse on suffix | https://leetcode.com/problems/palindrome-partitioning/ |
| 132 | Palindrome Partitioning II | Hard | Min cuts only — switch to DP here | https://leetcode.com/problems/palindrome-partitioning-ii/ |
| 93 | Restore IP Addresses | Medium | Same structure: try all split points with a validity check instead | https://leetcode.com/problems/restore-ip-addresses/ |
| 139 | Word Break | Medium | Can the string be split into valid words — DP or backtrack+memo | https://leetcode.com/problems/word-break/ |
| 140 | Word Break II | Hard | All ways to split — backtracking; add memo for efficiency | https://leetcode.com/problems/word-break-ii/ |

### One-Minute Revision
```
ALGORITHM:     Palindrome Partitioning
IN SIMPLE WORDS: Try all ways to cut the string; keep only palindrome cuts
USE WHEN:      "All partitions where every part is a palindrome"
DON'T USE WHEN: Only min cuts needed (use DP instead)
CORE IDEA:     For-loop over all end points; check palindrome; recurse on rest
TRACK:         current path of substrings, start index
TIME:          O(n × 2^n)
SPACE:         O(n) call stack
COMMON TRAP:   substring end index off-by-one; skipping palindrome check
EXPERIENCE TIP: Precompute dp[i][j] palindrome table for O(1) checks during backtrack
```

---

## N-Queens (Constraint Satisfaction)

### What is it?
Place n queens on an n×n chessboard so no two queens attack each other (no shared row, column, or diagonal). Place one queen per row; at each row try every column that does not conflict with already-placed queens. Three hash sets give O(1) conflict checking for columns and both diagonal directions.

### Visual
```
n = 4, placing row by row:

Row 0: try col 0,1,2,3
  col 0: place Q at (0,0)
    Row 1: col 0 blocked (same col), col 1 blocked (diag), col 2: place Q at (1,2)
      Row 2: check all cols...
        col 0: blocked by row1 diag? (2-0=2, 1-0=1 diff diag)
        ... eventually finds no valid placement → backtrack
    col 1: place Q at (0,1) → explore row 1...
    ...

Two solutions for n=4:
  .Q..    ..Q.
  ...Q    Q...
  Q...    ...Q
  ..Q.    .Q..
```

### How does it work?
1. Process one row at a time. When `row == n`, all queens placed — record the board.
2. For the current row, try each column from 0 to n-1 (Choose column).
3. Check three constraints: column already used? main diagonal `(row-col)` already used? anti-diagonal `(row+col)` already used?
4. If any conflict, skip this column.
5. If valid: record queen at `board[row] = col`, add to all three sets (Choose).
6. Recurse on `row+1` (Explore).
7. Remove from all three sets (Undo).

### Why does it work?
Since exactly one queen is placed per row (we go row by row), row conflicts are impossible by design. Columns and two diagonal directions are the only remaining constraints. The `row-col` value is constant along any main diagonal; `row+col` is constant along any anti-diagonal. Hash sets make each constraint check O(1).

### When to use?
- Placement problems where constraints eliminate most choices.
- "Place n items satisfying mutual exclusion constraints."
- Any grid constraint-satisfaction problem.

### When NOT to use?
- When there is no constraint to prune — pure brute force has no advantage.
- When you only need to know whether a solution exists (not all solutions) — stop at first.

### How to recognize in a new problem?
Grid + mutual constraint + "find all valid placements / configurations". Signals: "place pieces", "no two can attack", "satisfy constraints", "fill the board".

### Simple Example
Input: `n = 4` → Expected output: 2 solutions (see Visual above)

At row 0 col 1: place queen. At row 1 col 3: place queen. At row 2 col 0: place queen. At row 3 col 2: place queen. Row 4 == n → record first solution.

### Code
```java
// Java
public List<List<String>> solveNQueens(int n) {
    List<List<String>> result = new ArrayList<>();
    int[] board = new int[n];   // board[row] = col of queen in that row
    Set<Integer> cols = new HashSet<>();
    Set<Integer> diag1 = new HashSet<>();  // row - col
    Set<Integer> diag2 = new HashSet<>();  // row + col
    backtrack(0, n, board, cols, diag1, diag2, result);
    return result;
}

private void backtrack(int row, int n, int[] board,
                        Set<Integer> cols, Set<Integer> diag1, Set<Integer> diag2,
                        List<List<String>> result) {
    if (row == n) {
        result.add(buildBoard(board, n));
        return;
    }
    for (int col = 0; col < n; col++) {
        if (cols.contains(col) || diag1.contains(row - col) || diag2.contains(row + col))
            continue;
        board[row] = col;
        cols.add(col);
        diag1.add(row - col);
        diag2.add(row + col);
        backtrack(row + 1, n, board, cols, diag1, diag2, result); // explore
        cols.remove(col);
        diag1.remove(row - col);
        diag2.remove(row + col);
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
```javascript
// JavaScript
function solveNQueens(n) {
    const result = [];
    const board = new Array(n).fill(0);
    const cols = new Set(), diag1 = new Set(), diag2 = new Set();

    function backtrack(row) {
        if (row === n) {
            result.push(board.map(c => '.'.repeat(c) + 'Q' + '.'.repeat(n - c - 1)));
            return;
        }
        for (let col = 0; col < n; col++) {
            if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) continue;
            board[row] = col;
            cols.add(col); diag1.add(row - col); diag2.add(row + col);
            backtrack(row + 1);
            cols.delete(col); diag1.delete(row - col); diag2.delete(row + col);
        }
    }
    backtrack(0);
    return result;
}
```

### Dry Run
```
n=4, row=0:
  col=0: cols={0}, diag1={0}, diag2={0}, board[0]=0
    row=1:
      col=0: cols has 0 → skip
      col=1: diag2 has 0+1=1? no. diag1 has 1-1=0? yes → skip
      col=2: all clear → cols={0,2}, diag1={0,-1}, diag2={0,3}, board[1]=2
        row=2:
          col=0: diag2 has 2+0=2? no. diag1 has 2-0=2? no. cols has 0? yes → skip
          col=1: diag1 has 2-1=1? no. diag2 has 2+1=3? yes → skip
          col=2: cols has 2 → skip
          col=3: diag2 has 2+3=5? no. diag1 has 2-3=-1? yes → skip
        → no valid col at row=2 → backtrack
      remove col=2 → ...
      col=3: all clear → board[1]=3, ...
        row=2: col=1 valid → board[2]=1
          row=3: col=2 valid → board[3]=2 → row=4=n → RECORD [".Q..","...Q","Q...","..Q."]
```

### Complexity
```
Time:  O(n!) — at row 0: n choices, row 1: at most n-1, etc.; constraints prune heavily
Space: O(n) — board array O(n) + three sets O(n) + call stack depth O(n)
```

### Common Trap
1. Using a 2D boolean array `visited[row][col]` to check conflicts — O(n) per check. Use three hash sets (or three boolean arrays indexed by col, row-col+n, row+col) for O(1).
2. Forgetting to remove from all three sets on undo — one forgotten removal corrupts future placements.

### Experience Tip
**Experience Tip:** The diagonal insight is the key interview talking point: on any main diagonal, `row - col` is constant; on any anti-diagonal, `row + col` is constant. If you can explain this clearly and use it for O(1) checking, you demonstrate strong problem decomposition skill.

### Do Not Confuse With
- **Sudoku Solver (LC 37):** Same paradigm — constraint sets per row/col/box, try all digits, backtrack. Slightly more complex state but identical skeleton.
- **Grid DFS:** Just visiting/counting, no conflict constraints, no undo of constraint sets.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 51 | N-Queens | Hard | Classic; three sets for O(1) constraint check | https://leetcode.com/problems/n-queens/ |
| 52 | N-Queens II | Hard | Count solutions only; same backtracking, skip board building | https://leetcode.com/problems/n-queens-ii/ |
| 37 | Sudoku Solver | Hard | Same pattern; constraint sets per row, col, 3x3 box | https://leetcode.com/problems/sudoku-solver/ |
| 22 | Generate Parentheses | Medium | Simpler constraint: open<n and close<open; good warm-up | https://leetcode.com/problems/generate-parentheses/ |
| 1001 | Grid Illumination | Hard | Constraint tracking across placements — advanced variant | https://leetcode.com/problems/grid-illumination/ |

### One-Minute Revision
```
ALGORITHM:     N-Queens / Constraint Satisfaction
IN SIMPLE WORDS: Place one queen per row; skip any column that conflicts; backtrack
USE WHEN:      Grid placement with mutual exclusion constraints
DON'T USE WHEN: No constraints to prune (pure brute force offers no speedup)
CORE IDEA:     row-col constant on main diag; row+col constant on anti-diag
TRACK:         cols set, diag1 set (row-col), diag2 set (row+col), board[] array
TIME:          O(n!) heavily pruned
SPACE:         O(n) sets + call stack
COMMON TRAP:   Forget to remove from all 3 sets on undo; using O(n) conflict scan
EXPERIENCE TIP: Explain the diagonal math clearly — it signals real understanding
```

---

## Grid DFS / Backtracking (Word Search)

### What is it?
Navigate a 2D grid by making a sequence of moves (up/down/left/right), building up a path. To avoid revisiting a cell in the same path, temporarily mark it as visited and restore it when backtracking. Word Search is the canonical problem: find a word by walking adjacent cells.

### Visual
```
board:
  A B C E
  S F C S
  A D E E

Searching for "ABCCED":

(0,0)A → (0,1)B → (0,2)C → (0,3)? no, need C
                           → (1,2)C → (2,2)E → (2,3)? no, need D
                                              → (2,1)? 'D' → match! → ...
```

### How does it work?
1. For each cell in the grid, try starting the search from it.
2. At each recursive step, check: out of bounds? cell already visited? cell letter doesn't match word[index]? If any → return false.
3. If `index == word.length`, all letters matched → return true.
4. Mark current cell as visited (e.g., replace with `#`) (Choose).
5. Try all 4 directions recursively for `word[index+1]` (Explore).
6. Restore the cell's original character (Undo).
7. Return true if any direction succeeded.

### Why does it work?
Marking the cell prevents the path from looping back on itself (using the same cell twice). Restoring it after backtracking allows other starting paths to use that cell freely — the mark is path-local, not global.

### When to use?
- "Find a word / path in a grid."
- "Count distinct paths with constraints."
- Any problem that walks a grid and needs to avoid revisiting cells in the current path.

### When NOT to use?
- When you need the shortest path — use BFS.
- When you need to visit every cell (no constraint on revisiting) — plain DFS without undo.

### How to recognize in a new problem?
Grid + sequence/word/path matching + cannot reuse cells in one path. Signals: "word search", "find path spelling", "walk adjacent cells", "path visiting each cell once".

### Simple Example
Input: `board = [["A","B"],["C","D"]]`, `word = "ABD"` → Expected output: `true`

Start at (0,0)='A', match word[0]. Move right to (0,1)='B', match word[1]. From (0,1) try down to (1,1)='D', match word[2]. `index == word.length` → return true.

### Code
```java
// Java
public boolean exist(char[][] board, String word) {
    int rows = board.length, cols = board[0].length;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (dfs(board, word, r, c, 0)) return true;
        }
    }
    return false;
}

private boolean dfs(char[][] board, String word, int r, int c, int index) {
    if (index == word.length()) return true;
    if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) return false;
    if (board[r][c] != word.charAt(index)) return false;

    char temp = board[r][c];
    board[r][c] = '#';                          // mark visited (choose)

    boolean found = dfs(board, word, r + 1, c, index + 1) ||
                    dfs(board, word, r - 1, c, index + 1) ||
                    dfs(board, word, r, c + 1, index + 1) ||
                    dfs(board, word, r, c - 1, index + 1); // explore all 4 dirs

    board[r][c] = temp;                         // restore (undo)
    return found;
}
```
```javascript
// JavaScript
function exist(board, word) {
    const rows = board.length, cols = board[0].length;
    function dfs(r, c, index) {
        if (index === word.length) return true;
        if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
        if (board[r][c] !== word[index]) return false;

        const temp = board[r][c];
        board[r][c] = '#';                      // mark visited (choose)

        const found = dfs(r + 1, c, index + 1) ||
                      dfs(r - 1, c, index + 1) ||
                      dfs(r, c + 1, index + 1) ||
                      dfs(r, c - 1, index + 1); // explore

        board[r][c] = temp;                     // restore (undo)
        return found;
    }
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (dfs(r, c, 0)) return true;
    return false;
}
```

### Dry Run
```
board = [['A','B'],['C','D']], word = "ABD"

Start outer loop: r=0, c=0, board[0][0]='A' == word[0]
dfs(0,0, index=0):
  match 'A'. mark board[0][0]='#'
  try dfs(1,0, index=1): board[1][0]='C' != 'B' → false
  try dfs(-1,0, index=1): out of bounds → false
  try dfs(0,1, index=1): board[0][1]='B' == 'B'
    dfs(0,1, index=1):
      match 'B'. mark board[0][1]='#'
      try dfs(1,1, index=2): board[1][1]='D' == 'D'
        dfs(1,1, index=2):
          match 'D'. mark board[1][1]='#'
          index+1=3 == word.length → return true ← FOUND
      restore board[0][1]='B'
      return true
  restore board[0][0]='A'
  return true

exist returns true
```

### Complexity
```
Time:  O(m × n × 4^L) — start from each of m×n cells, explore 4 directions up to L steps
Space: O(L) — call stack depth equals word length L
```

### Common Trap
1. Using a separate `visited[][]` boolean array but forgetting to reset it after backtracking — cells incorrectly stay blocked for subsequent starting positions.
2. Checking bounds after accessing `board[r][c]` — always check bounds first to avoid array index out of bounds.

### Experience Tip
**Experience Tip:** Modifying the board in-place (marking `#`) is cleaner and saves space compared to a separate visited array — and is expected at Google. Just make sure your restore step is unconditional (runs even when the recursive call returns false) so the board is always left intact.

### Do Not Confuse With
- **Plain DFS on a graph:** No undo — once visited, stay visited. Grid DFS with backtracking undoes the visit for the next starting path.
- **BFS on a grid:** Finds shortest path, not a specific sequence of characters.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 79 | Word Search | Medium | Classic grid backtracking; mark '#' then restore | https://leetcode.com/problems/word-search/ |
| 212 | Word Search II | Hard | Multiple words — use Trie to prune dead branches early | https://leetcode.com/problems/word-search-ii/ |
| 200 | Number of Islands | Medium | DFS on grid (no undo needed — just mark and count) | https://leetcode.com/problems/number-of-islands/ |
| 329 | Longest Increasing Path in a Matrix | Hard | DFS with memo (no undo — no revisit within one path either) | https://leetcode.com/problems/longest-increasing-path-in-a-matrix/ |
| 980 | Unique Paths III | Hard | Visit every non-obstacle cell exactly once — classic grid backtracking | https://leetcode.com/problems/unique-paths-iii/ |

### One-Minute Revision
```
ALGORITHM:     Grid DFS / Backtracking (Word Search)
IN SIMPLE WORDS: Walk the grid matching chars; mark cell visited, explore 4 dirs, restore
USE WHEN:      Grid path matching, visit cells once per path, explore all routes
DON'T USE WHEN: Need shortest path (BFS) or cells can be reused (plain DFS)
CORE IDEA:     board[r][c]='#' before recursing; restore after — undo is the key
TRACK:         current (r,c), index into word, in-place board marks
TIME:          O(m × n × 4^L)
SPACE:         O(L) call stack
COMMON TRAP:   Bounds check must come before board access; restore must be unconditional
EXPERIENCE TIP: In-place marking avoids a separate visited array — cleaner and expected
```

---

## Sudoku Solver

### What is it?
Fill a partially-completed 9×9 grid so that every row, every column, and every 3×3 box contains the digits 1–9 exactly once. This is a **constraint satisfaction** problem: at each empty cell, try each digit 1–9; if the digit violates any constraint, skip it; if you get stuck with no valid digit, undo the last placement and try the next option (backtrack).

Think of it like filling in a crossword: you write a letter, keep going, and when a later word won't fit, you erase back to the choice that caused the conflict and try something else.

### Visual

```
The 9 boxes, numbered 0 to 8 — beginners always need this map:

+-------+-------+-------+
| 0 0 0 | 1 1 1 | 2 2 2 |
| 0 0 0 | 1 1 1 | 2 2 2 |
| 0 0 0 | 1 1 1 | 2 2 2 |
+-------+-------+-------+
| 3 3 3 | 4 4 4 | 5 5 5 |
| 3 3 3 | 4 4 4 | 5 5 5 |
| 3 3 3 | 4 4 4 | 5 5 5 |
+-------+-------+-------+
| 6 6 6 | 7 7 7 | 8 8 8 |
| 6 6 6 | 7 7 7 | 8 8 8 |
| 6 6 6 | 7 7 7 | 8 8 8 |
+-------+-------+-------+

Box index formula:  box = (row / 3) * 3 + (col / 3)

Derivation (say it out loud until it sticks):
  row / 3  gives 0, 1, or 2  → which ROW of boxes (top / middle / bottom)
  × 3      maps it to 0, 3, or 6  (starting box index of that row)
  col / 3  gives 0, 1, or 2  → which COLUMN of boxes (left / center / right)
  Add them → final box index

Concrete examples:
  cell (0, 0) → box = (0/3)*3 + (0/3) = 0*3 + 0 = 0  (top-left box)     ✓
  cell (4, 7) → box = (4/3)*3 + (7/3) = 1*3 + 2 = 5  (middle-right box) ✓
  cell (8, 8) → box = (8/3)*3 + (8/3) = 2*3 + 2 = 8  (bottom-right box) ✓

The three constraint sets for cell (row, col):
  1. Row   row           — no digit repeated in the same row
  2. Col   col           — no digit repeated in the same column
  3. Box   (row/3)*3 + (col/3) — no digit repeated in the same 3×3 box
```

### How does it work?

1. Scan left-to-right, top-to-bottom to find the next empty cell (`.`).
2. **Base case:** No empty cell found → the board is completely filled → return `true`.
3. For digits `'1'` to `'9'`:
   a. Check: does this digit already appear in the same row? Same column? Same 3×3 box?
   b. If any conflict → skip this digit.
   c. If valid → place the digit on the board (Choose).
   d. Recurse. If recursion returns `true` → propagate `true` upward.
   e. Recursion returned `false` → undo the placement (Undo): set cell back to `'.'`.
4. If no digit 1–9 worked at this cell → return `false` (signal the caller to backtrack).

### Why does it work?
Sudoku is constraint satisfaction: three independent constraint sets (row, column, box) each demand the digits 1–9 with no repeats. Backtracking systematically places digits and prunes branches the moment a constraint is violated. Because each cell has at most 9 choices and violations are caught immediately, most branches are pruned very early. Every valid solution is eventually found; every invalid dead-end is abandoned as soon as it is detected.

### When to use?
- "Solve the Sudoku" or any grid-fill problem with mutual exclusion constraints.
- Constraint satisfaction problems: fill values into positions where each position and each group must have unique values.

### When NOT to use?
- Only checking if a given board is valid (not solving it) — just scan rows, cols, boxes once.
- Problems solvable purely by logical deduction rules (no guessing needed) — backtracking is the general fallback.

### How to recognize in a new problem?
"Fill in the missing values" + "each row / column / region must contain each value exactly once." Also: any puzzle where choices are constrained and a dead end requires undoing a previous decision.

### Simple Example

Consider a nearly-complete board with one empty cell at (0,0):
```
[.][5][3][...]    Row 0 already has: 5,3,...
[6][...]          Col 0 already has: 6,...
Box 0 already has: 5,3,6,...
```
Try '1': if '1' is not in row 0, not in col 0, not in box 0 → place it → recurse → board complete → done.
If '1' conflicts → try '2', '3', ... until a valid digit is found.

### Code

```java
// Java
public void solveSudoku(char[][] board) {
    solve(board);
}

private boolean solve(char[][] board) {
    for (int row = 0; row < 9; row++) {
        for (int col = 0; col < 9; col++) {
            if (board[row][col] == '.') {          // found an empty cell
                for (char c = '1'; c <= '9'; c++) {
                    if (isValid(board, row, col, c)) {
                        board[row][col] = c;        // place digit (choose)
                        if (solve(board)) return true; // explore
                        board[row][col] = '.';      // undo — CRITICAL
                    }
                }
                return false; // no digit 1-9 worked → backtrack to caller
            }
        }
    }
    return true; // no empty cell found → board is solved
}

private boolean isValid(char[][] board, int row, int col, char c) {
    for (int i = 0; i < 9; i++) {
        if (board[row][i]   == c) return false; // same row
        if (board[i][col]   == c) return false; // same column
        // same 3×3 box — map loop index i to (boxRow, boxCol)
        int boxRow = (row / 3) * 3 + i / 3;
        int boxCol = (col / 3) * 3 + i % 3;
        if (board[boxRow][boxCol] == c) return false;
    }
    return true;
}
```

```javascript
// JavaScript
function solveSudoku(board) {
    solve(board);
}

function solve(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === '.') {
                for (let d = 1; d <= 9; d++) {
                    const c = String(d);
                    if (isValid(board, row, col, c)) {
                        board[row][col] = c;              // place (choose)
                        if (solve(board)) return true;    // explore
                        board[row][col] = '.';            // undo
                    }
                }
                return false; // backtrack
            }
        }
    }
    return true; // solved
}

function isValid(board, row, col, c) {
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === c) return false;            // row
        if (board[i][col] === c) return false;            // col
        const boxRow = Math.floor(row / 3) * 3 + Math.floor(i / 3);
        const boxCol = Math.floor(col / 3) * 3 + (i % 3);
        if (board[boxRow][boxCol] === c) return false;    // box
    }
    return true;
}
```

### Dry Run

Trace the first empty cell at position (0, 0):

| Step | Cell | Digit | Row OK? | Col OK? | Box OK? | Action |
|------|------|-------|---------|---------|---------|--------|
| 1 | (0,0) | '1' | yes | yes | yes | Place '1', recurse |
| 2 | (next empty) | ... | ... | ... | ... | Continue placing... |
| N | (r,c) | '1'–'9' | — | — | — | All fail → return false |
| N+1 | (0,0) | '1' undone | — | — | — | board[0][0]='.' again |
| N+2 | (0,0) | '2' | check | check | check | Try next digit |

The recursion unwinds back through each placement until it finds a digit that keeps all branches solvable.

### Complexity

```
Time:  O(9^m)  where m = number of empty cells
               Worst case (empty board): 9^81 ≈ enormous
               In practice: a standard 9×9 puzzle has ~50 given clues → ~9^31 attempts
               Constraints prune the vast majority of branches early — runs in milliseconds

Space: O(m) — call stack depth = number of empty cells (each frame holds one placement)
              The board is modified in-place, so no extra grid storage needed
```

### Common Trap

Forgetting `board[row][col] = '.'` after a failed recursion call. Without the undo, the cell stays filled with the wrong digit. Future recursive calls see it as a given clue, not an empty cell — the board gets corrupted and no solution is found (or a wrong one is returned). The undo line is not optional.

### Experience Tip

The box index formula `(row/3)*3 + col/3` trips up almost every beginner under interview pressure. Derive it out loud once: "row/3 gives 0, 1, or 2 — which row of boxes. Multiply by 3 to get the starting index: 0, 3, or 6. col/3 gives 0, 1, or 2 — which column of boxes. Add them." If you can reconstruct the derivation verbally, you can write it correctly from scratch every time. Just memorizing the formula without understanding it fails the moment you second-guess yourself.

### Do Not Confuse With

| | N-Queens | Sudoku Solver |
|---|---|---|
| Grid size | n×n, variable | 9×9, fixed |
| Constraints | row / col / diagonal | row / col / 3×3 box |
| Choices per step | n column positions | 9 digits |
| Box index needed | No | Yes: `(row/3)*3 + col/3` |
| What is returned | All valid boards | One valid board (in-place) |
| Skeleton | Identical backtrack loop | Identical backtrack loop |

Both use the same choose → explore → undo skeleton. The only differences are what the constraints check and how the board is scanned.

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal | Link |
|---|---------|------------|----------------|------|
| 37 | Sudoku Solver | Hard | Classic — implement isValid with row/col/box; undo is mandatory | https://leetcode.com/problems/sudoku-solver/ |
| 36 | Valid Sudoku | Medium | Check-only version — learn the constraint check before trying to solve | https://leetcode.com/problems/valid-sudoku/ |
| 51 | N-Queens | Hard | Same backtrack skeleton; different constraints (diagonal instead of box) | https://leetcode.com/problems/n-queens/ |
| 22 | Generate Parentheses | Medium | Simpler constraint satisfaction — good warm-up | https://leetcode.com/problems/generate-parentheses/ |
| 1307 | Verbal Arithmetic Puzzle | Hard | Digit-assignment backtracking — same idea with letter→digit mapping | https://leetcode.com/problems/verbal-arithmetic-puzzle/ |
| 980 | Unique Paths III | Hard | Grid backtracking with constraint (visit every cell exactly once) | https://leetcode.com/problems/unique-paths-iii/ |

### One-Minute Revision

```
PATTERN:           Sudoku Solver
IN SIMPLE WORDS:   Find empty cell. Try digits 1-9. Check row + col + box. Place if valid.
                   Recurse. If stuck, undo and try next digit.
USE WHEN:          Constraint satisfaction: fill a grid with mutual exclusion rules
DON'T USE WHEN:    Only checking validity (just scan); puzzle solvable by pure logic
KEY QUESTION:      Is this digit valid in this row, this column, AND this 3×3 box?
BOX FORMULA:       box = (row / 3) * 3 + (col / 3)
RETURN:            true when no empty cell remains; false when no digit 1-9 works here
TIME:              O(9^m), m = empty cells; constraints prune heavily in practice
SPACE:             O(m) call stack
COMMON TRAP:       Forgetting board[row][col]='.' after failed recursion — board gets corrupted
EXPERIENCE TIP:    Derive box formula out loud: (row/3)=box-row, ×3 + (col/3)=box index
```

---

## Quick Reference: Choosing the Right Pattern

| Signal in problem | Pattern | Key variable |
|---|---|---|
| "All subsets", "all subsequences" | Subsets (record at top, for-loop from start) | start index |
| "All permutations", "all orderings" | Permutations (used[] array, loop from 0) | used[] boolean |
| "Combinations summing to target" | Combination Sum (for-loop, pass i or i+1) | start, remaining |
| "Partition string, each part satisfies X" | Palindrome Partitioning (try all prefixes) | start index |
| "Place N items with mutual constraints" | N-Queens (constraint sets, row by row) | cols/diag1/diag2 sets |
| "Find word/path in grid, no cell reuse" | Grid DFS (mark '#', explore 4 dirs, restore) | (r, c), index |
| "Fill grid, row/col/region unique values" | Sudoku Solver (try 1-9, check 3 constraints, undo) | row/col/box index |

## Duplicate Handling Cheat Sheet

```
// In for-loop patterns (subsets, combos, palindrome partitioning):
// Sort first, then:
if (i > start && nums[i] == nums[i-1]) continue;

// In permutation used-array pattern:
// Sort first, then:
if (i > 0 && nums[i] == nums[i-1] && !used[i-1]) continue;
```

## Decision: Backtracking vs DP vs BFS

```
"All configurations / all solutions"  → Backtracking
"Optimal (min/max) + overlapping subs" → DP
"Shortest path / fewest steps"         → BFS
"Single recursive value, no overlap"   → Pure Recursion
```
