# Design Patterns and Meta-Strategies — Google Interview Thinking Framework

> **13 patterns covered:** Universal Problem-Solving Framework · Design Patterns Overview · Iterator Pattern · State Machine · Simulation · Minimax / Game Theory · Meet in the Middle · Randomized Algorithms · Amortized Analysis · Monotonic Patterns · Reverse Thinking · Add / Remove Constraint · Design Problems

> Read this file to internalize HOW to think, not just what to code.
> Goal: read fast, get the frameworks into your head, apply them immediately.

---

## Table of Contents

1. [Universal Problem-Solving Framework](#1-universal-problem-solving-framework)
2. [Constraint → Complexity Table](#2-constraint--complexity-table)
3. [Pattern Recognition Flowchart](#3-pattern-recognition-flowchart)
4. [Design Patterns and Meta-Patterns](#4-design-patterns-and-meta-patterns)
   - [Iterator Pattern](#iterator-pattern)
   - [State Machine](#state-machine)
   - [Simulation](#simulation)
   - [Minimax / Game Theory](#minimax--game-theory)
   - [Meet in the Middle](#meet-in-the-middle)
   - [Randomized Algorithms](#randomized-algorithms)
   - [Amortized Analysis](#amortized-analysis)
   - [Monotonic Patterns](#monotonic-patterns)
   - [Reverse Thinking](#reverse-thinking)
   - [Add / Remove Constraint](#add--remove-constraint)
5. [Common Interview Mistakes](#5-common-interview-mistakes)

---

## 1. Universal Problem-Solving Framework

Apply this 13-step sequence to EVERY problem. Do not skip steps under pressure — that is exactly when skipping them hurts you.

```
1.  Understand the problem
      Restate it in your own words. What goes in? What comes out?

2.  Identify input structure
      Array? Graph? String? Tree? Sorted? Duplicates? Negative values?

3.  Look at constraints
      What is n? This tells you your TARGET COMPLEXITY (see Section 2).

4.  Think brute force
      Always state the naive solution first. It grounds the conversation.

5.  Find repeated work / useful property
      Where is brute force doing redundant computation?
      Is there sorted order, monotonicity, or a recurrence to exploit?

6.  Identify candidate pattern
      Based on structure + constraint, which pattern fits? (See Section 3.)

7.  Define state / variables
      What exactly do your variables represent? Say it out loud before coding.

8.  Derive transitions
      How does state change as you process each element?

9.  Dry run on small example
      Trace through by hand before writing a single line of code.

10. Analyze complexity
      State time AND space complexity. Does it fit the constraint budget?

11. Check edge cases
      Empty input. Single element. All identical. Maximum n. Negative values.

12. Implement
      Write clean code. Name variables meaningfully. Narrate as you type.

13. Optimize if needed
      Only AFTER a correct solution exists. Ask interviewer before optimizing.
```

### How to Handle an Unfamiliar Problem

1. Do NOT go silent. Narrate what you observe.
2. Apply steps 1-3 (understand, structure, constraints). This alone narrows the field.
3. Solve a stripped-down version first — remove one constraint, solve that, then add it back.
4. Ask: "What if I solved the opposite problem?" (Reverse Thinking, Section 4.)
5. The thing brute force does *repeatedly* is your optimization target.

---

## 2. Constraint → Complexity Table

**Read this first on EVERY problem. The constraint tells you which algorithms are allowed.**

```
╔══════════════════╦═══════════════╦═══════════════════════════════════════════╗
║  n (input size)  ║  Max Allowed  ║  What to reach for                        ║
╠══════════════════╬═══════════════╬═══════════════════════════════════════════╣
║  n ≤ 20          ║  O(2^n)       ║  Backtracking, bitmask DP, subset enum    ║
║  n ≤ 40          ║  O(2^(n/2))   ║  Meet in the Middle                       ║
║  n ≤ 500         ║  O(n³)        ║  Interval DP, Floyd-Warshall              ║
║  n ≤ 1,000       ║  O(n²)        ║  Nested loops OK, simple DP               ║
║  n ≤ 100,000     ║  O(n log n)   ║  Sort, heap, binary search, BIT           ║
║  n ≤ 1,000,000   ║  O(n)         ║  Single pass, hashing, two pointers       ║
║  n ≤ 10^9        ║  O(log n)     ║  Binary search on answer, math            ║
╚══════════════════╩═══════════════╩═══════════════════════════════════════════╝
```

### How to use this in an interview

1. Read constraint on n.
2. Immediately say: "With n up to X, I need an O(Y) solution."
3. Only consider patterns that can achieve O(Y).

### Examples for each row

| Constraint | Example Problem | Algorithm |
|---|---|---|
| n ≤ 20 | All subsets / permutations | Backtracking or bitmask DP |
| n ≤ 40 | Subset sum, n=38 | Split halves, Meet in the Middle |
| n ≤ 500 | Burst Balloons, Matrix Chain | Interval DP |
| n ≤ 1,000 | Longest common subsequence | O(n²) DP |
| n ≤ 100,000 | Find kth largest in stream | Min-heap O(n log n) |
| n ≤ 1,000,000 | Two Sum, longest substring | HashMap or two pointers |
| n ≤ 10^9 | Find sqrt(n) | Binary search on answer |

---

## 3. Pattern Recognition Flowchart

Start here when you cannot immediately identify a pattern.

```
WHAT IS THE INPUT SHAPE?
│
├── ARRAY / STRING
│     ├── Sorted?            → Binary Search, Two Pointers
│     ├── Subarray / Window  → Sliding Window, Prefix Sum + HashMap
│     ├── Top-K / Kth        → Heap or Quick Select
│     ├── Permutations?      → Backtracking
│     └── Subsets?           → Backtracking or Bitmask DP (n ≤ 20)
│
├── LINKED LIST
│     ├── Cycle?             → Floyd's fast/slow pointers
│     ├── Middle / Kth?      → Two pointers (fast/slow)
│     └── Reverse / Merge?   → Pointer manipulation
│
├── TREE
│     ├── Any path / value   → DFS (recursion)
│     ├── Level by level     → BFS (queue)
│     ├── BST property       → Inorder = sorted, binary search
│     └── Iterator needed    → Stack-based lazy traversal
│
├── GRAPH
│     ├── Shortest path, unweighted    → BFS
│     ├── Shortest path, non-neg wts   → Dijkstra
│     ├── Shortest path, neg weights   → Bellman-Ford
│     ├── All-pairs shortest paths     → Floyd-Warshall
│     ├── Connected components         → DFS / BFS / Union-Find
│     └── Ordering with dependencies   → Topological Sort
│
└── PROBLEM TYPE CLUES
      ├── "Optimal", repeated subproblems → DP
      ├── "Greedy choice works"           → Greedy + proof
      ├── "Two players, optimal play"     → Minimax or Game DP
      ├── "Validate / parse format"       → State Machine
      ├── "Simulate step by step"         → Simulation
      ├── "Iterator / next()"             → Iterator Pattern
      ├── "Stuck on forward pass"         → Reverse Thinking
      └── "Problem too hard as-is"        → Add/Remove Constraint
```

### Quick keyword lookup

| If you see this... | Try this pattern |
|---|---|
| Sorted array | Binary search, two pointers |
| "Top K" / "Kth largest" | Min-heap or Quick Select |
| Shortest path, unweighted | BFS |
| Shortest path, weighted | Dijkstra |
| Permutations / combinations / subsets | Backtracking |
| Overlapping subproblems | Dynamic Programming |
| Interval merging / scheduling | Sort by start, sweep line |
| Prefix matching / autocomplete | Trie |
| n ≤ 20, subsets | Bitmask DP |
| n ≤ 40, subset sum | Meet in the Middle |
| Subarray sum / running sum | Prefix sum + HashMap |
| Parentheses / matching brackets | Stack |
| Stream / online algorithm | Heap, reservoir sampling |
| "Validate", "parse", "legal format" | State Machine |
| "Simulate", "apply rules", "N steps" | Simulation |
| "Surrounded", "not reachable" | BFS/DFS + Reverse Thinking |

---

## 4. Design Patterns and Meta-Patterns

---

## Iterator Pattern

### What is it?
An Iterator gives sequential access to elements of a complex data structure without exposing its internals. In interviews, you implement `next()` and `hasNext()` using a stack for lazy (on-demand) traversal.

### When to use?
- Problem says "implement an iterator" for a BST, nested list, or multi-source structure.
- You need to flatten a complex structure one element at a time.
- Keywords: `next()`, `hasNext()`, `peek()`, "lazy access", "flatten on demand".
- The structure is too large to fully traverse upfront.

### Simple Example
**Binary Search Tree Iterator:** You need `next()` to return the next smallest value in O(1) amortized.

Instead of doing a full inorder traversal upfront and storing it (uses O(n) space all at once), use a stack. Push all left-spine nodes at start. When `next()` is called, pop the top, then push its right child's entire left spine. Each node is pushed and popped exactly once.

### Visual

```
Input: [[1,1],2,[1,1]]

Stack evolution (top of stack shown on the right):

Init:       push entire outer list  → stack: [ [[1,1],2,[1,1]] ]

hasNext() → top is a list → expand: pop it, push children in reverse
             push [1,1], push 2, push [1,1]
             → stack: [ [1,1], 2, [1,1] ]
             top [1,1] still a list → expand: push 1, push 1
             → stack: [ [1,1], 2, 1, 1 ]  top = 1 (int) → true

next()    → pop 1  → return 1    stack: [ [1,1], 2, 1 ]
hasNext() → top = 1 (int)        → true
next()    → pop 1  → return 1    stack: [ [1,1], 2 ]
next()    → pop 2  → return 2    stack: [ [1,1] ]
hasNext() → top [1,1] is list → expand: push 1, 1
             → stack: [ 1, 1 ]   → true
next()    → pop 1  → return 1    stack: [ 1 ]
next()    → pop 1  → return 1    stack: []
hasNext() → stack empty          → false
```

### Code (Java + JavaScript)

```java
// Java: Flatten Nested List Iterator (LC 341)
import java.util.*;
public class NestedIterator implements Iterator<Integer> {
    private Deque<NestedInteger> stack = new ArrayDeque<>();

    public NestedIterator(List<NestedInteger> nestedList) {
        for (int i = nestedList.size() - 1; i >= 0; i--)
            stack.push(nestedList.get(i)); // push in reverse so first is on top
    }

    @Override
    public Integer next() {
        flatten();
        return stack.pop().getInteger();
    }

    @Override
    public boolean hasNext() {
        flatten();
        return !stack.isEmpty();
    }

    private void flatten() {
        while (!stack.isEmpty() && !stack.peek().isInteger()) {
            List<NestedInteger> list = stack.pop().getList();
            for (int i = list.size() - 1; i >= 0; i--)
                stack.push(list.get(i));
        }
    }
}
```

```javascript
// JavaScript: Flatten Nested List Iterator (LC 341)
class NestedIterator {
    constructor(nestedList) {
        this.stack = [];
        for (let i = nestedList.length - 1; i >= 0; i--)
            this.stack.push(nestedList[i]);
    }
    hasNext() {
        this._flatten();
        return this.stack.length > 0;
    }
    next() {
        this._flatten();
        return this.stack.pop().getInteger();
    }
    _flatten() {
        while (this.stack.length > 0 && !this.stack[this.stack.length - 1].isInteger()) {
            const list = this.stack.pop().getList();
            for (let i = list.length - 1; i >= 0; i--)
                this.stack.push(list[i]);
        }
    }
}
```

### Dry Run

Call sequence on `[[1,1],2,[1,1]]`:

| Call | Stack before flatten | Action | Stack after | Return |
|------|---------------------|--------|-------------|--------|
| hasNext() | [outer list] | expand outer, expand leading [1,1] | [[1,1],2,1,1] | true |
| next() | [[1,1],2,1,1] | pop top int | [[1,1],2,1] | 1 |
| hasNext() | [[1,1],2,1] | top=1 (int) | [[1,1],2,1] | true |
| next() | [[1,1],2,1] | pop top | [[1,1],2] | 1 |
| next() | [[1,1],2] | pop top (int 2) | [[1,1]] | 2 |
| hasNext() | [[1,1]] | expand [1,1] | [1,1] | true |
| next() | [1,1] | pop top | [1] | 1 |
| next() | [1] | pop top | [] | 1 |
| hasNext() | [] | empty | [] | false |

### Complexity

- **Time:** O(n) total across all `next()` and `hasNext()` calls — each element is pushed and popped at most once regardless of nesting depth.
- **Space:** O(d) where d = maximum nesting depth. The stack holds at most one open list per nesting level at any moment.

### Do Not Confuse With

| | Iterator Pattern | Recursive DFS |
|---|---|---|
| **Computation timing** | Lazy — computes next element only when asked | Eager — traverses everything upfront |
| **Space** | O(d) stack depth at any moment | O(n) to store all results upfront |
| **Interface** | Supports `next()` / `hasNext()` on-demand | Returns a full list at once |
| **Use when** | Structure is large; caller needs one element at a time | All elements are needed immediately |

### Experience Tip
**Experience Tip:** The key insight is lazy evaluation — only compute the next element when asked. This is almost always implemented with a stack. When you see "iterator", think "stack + controlled traversal".

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---|---|---|---|
| 173 | Binary Search Tree Iterator | Medium | Stack, push left-spine, O(1) amortized | https://leetcode.com/problems/binary-search-tree-iterator/ |
| 341 | Flatten Nested List Iterator | Medium | Stack, reverse push, flatten top lazily | https://leetcode.com/problems/flatten-nested-list-iterator/ |
| 284 | Peeking Iterator | Medium | Cache the next value, `peek()` returns cache | https://leetcode.com/problems/peeking-iterator/ |
| 155 | Min Stack | Easy | Two stacks — one for data, one for minimums | https://leetcode.com/problems/min-stack/ |

### One-Minute Revision
```
PATTERN:   Iterator (Stack-based Lazy Traversal)
USE WHEN:  "Implement next()/hasNext()" for BST, nested list, multiple sources
KEY STEP:  Use a stack. Only advance the traversal when next() is called.
           Each element pushed/popped once → O(1) amortized.
```

---

## State Machine

### What is it?
A State Machine models a problem as a finite set of states and explicit rules for transitioning between them. At each step, your current state plus the current input determines the next state.

### When to use?
- String parsing with complex multi-character rules (e.g., "Valid Number").
- Problem has "modes" or "phases" — the meaning of an input depends on context.
- Stock buy/sell problems (holding, not holding, cooldown) — this is an implicit state machine.
- Keywords: "validate format", "parse", "legal sequence", "modes".

### Simple Example
**Valid Number:** Is a string like `"-3.5e2"` a valid number? You have states like `START`, `SIGN`, `DIGIT`, `DOT`, `EXPONENT`, `INVALID`. Each character transitions you between states. If you end in a valid state, the number is valid.

Draw the state diagram on paper first — the code becomes mechanical once the diagram is clear.

### Visual

```
Stock Buy/Sell with Cooldown — state diagram:

           buy (pay price)          sell (gain price)
  COOLDOWN ─────────────→  HELD  ──────────────────→  SOLD
     ↑   \                                              │
     │    └────── rest (no-op) ─────────────────────── │
     │                                                  │
     └──────────────── 1-day cooldown ─────────────────┘

Three states:
  HELD     = currently holding a stock
  SOLD     = just sold today (must rest tomorrow)
  COOLDOWN = resting / free to act

Transitions:
  HELD     + sell  →  SOLD
  SOLD     + rest  →  COOLDOWN  (forced 1-day cooldown)
  COOLDOWN + buy   →  HELD
  COOLDOWN + rest  →  COOLDOWN
  HELD     + rest  →  HELD      (continue holding)
```

### Code (Java + JavaScript)

```java
// Java: Best Time to Buy and Sell Stock with Cooldown (LC 309)
public int maxProfit(int[] prices) {
    // held  = max profit while holding a stock
    // sold  = max profit on the day we just sold
    // cool  = max profit while in cooldown/rest
    int held = Integer.MIN_VALUE, sold = 0, cool = 0;

    for (int price : prices) {
        int prevHeld = held, prevSold = sold, prevCool = cool;
        held = Math.max(prevHeld, prevCool - price); // hold or buy from cooldown
        sold = prevHeld + price;                      // sell today
        cool = Math.max(prevCool, prevSold);          // rest (came from sold or stayed)
    }
    return Math.max(sold, cool); // never beneficial to end while holding
}
```

```javascript
// JavaScript: Best Time to Buy and Sell Stock with Cooldown (LC 309)
function maxProfit(prices) {
    let held = -Infinity, sold = 0, cool = 0;
    for (const price of prices) {
        const [ph, ps, pc] = [held, sold, cool];
        held = Math.max(ph, pc - price); // hold or buy
        sold = ph + price;               // sell today
        cool = Math.max(pc, ps);         // rest
    }
    return Math.max(sold, cool);
}
```

### Dry Run

`prices = [1, 2, 3, 0, 2]`

| Day | Price | held (prev) | sold (prev) | cool (prev) | held (new) | sold (new) | cool (new) |
|-----|-------|------------|------------|------------|-----------|-----------|-----------|
| 0 | 1 | -∞ | 0 | 0 | max(-∞, 0-1)= **-1** | -∞+1= -∞ | max(0,0)= **0** |
| 1 | 2 | -1 | -∞ | 0 | max(-1, 0-2)= **-1** | -1+2= **1** | max(0,-∞)= **0** |
| 2 | 3 | -1 | 1 | 0 | max(-1, 0-3)= **-1** | -1+3= **2** | max(0,1)= **1** |
| 3 | 0 | -1 | 2 | 1 | max(-1, 1-0)= **1** | -1+0= **-1** | max(1,2)= **2** |
| 4 | 2 | 1 | -1 | 2 | max(1, 2-2)= **1** | 1+2= **3** | max(2,-1)= **2** |

Result: `max(sold=3, cool=2)` = **3**

### Complexity

- **Time:** O(n) — single pass through prices. Three state variables updated each step.
- **Space:** O(1) — only three integer state variables (held, sold, cool); no DP array needed.

### Do Not Confuse With

| | State Machine DP | Regular DP |
|---|---|---|
| **State naming** | States have semantic labels (HELD, SOLD, COOLDOWN) | States are indices/values (dp[i], dp[i][j]) |
| **Conceptual model** | Explicitly models transitions between named phases | Optimizes a recurrence relation |
| **Relationship** | State Machine IS DP — just with named states | General technique |
| **Advantage** | Transitions are self-documenting and easy to verify visually | More flexible for arbitrary recurrences |

### Experience Tip
**Experience Tip:** Always draw the state diagram before writing code. Label each arrow with what input causes the transition. The diagram IS the solution — code just implements it.

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---|---|---|---|
| 65 | Valid Number | Hard | Draw the state diagram first; ~6 states | https://leetcode.com/problems/valid-number/ |
| 926 | Flip String to Monotone Increasing | Medium | Two states: seen 0s, seen 1s | https://leetcode.com/problems/flip-string-to-monotone-increasing/ |
| 309 | Best Time to Buy and Sell Stock with Cooldown | Medium | States: held, sold, rest — implicit state machine DP | https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/ |

### One-Minute Revision
```
PATTERN:   State Machine
USE WHEN:  "Validate format", "parse string", "modes", "phases"
KEY STEP:  1. Define states  2. Define transitions (state + input → next state)
           3. Define accepting states  4. Process input left to right
```

---

## Simulation

### What is it?
When there is no clever mathematical shortcut, do exactly what the problem says. Follow the rules literally, step by step. Simulation tests implementation precision, not algorithmic cleverness.

### When to use?
- Problem says "simulate", "apply rules", "after N steps".
- Rules are clear and the grid/board is small enough to iterate.
- You cannot find a pattern or formula to skip steps.
- Keywords: "spiral", "robot", "game board", "next state", "step".

### Simple Example
**Spiral Matrix:** Traverse a matrix in spiral order. No clever formula — just maintain four boundary pointers (top, bottom, left, right). Traverse right → down → left → up. Shrink boundaries after each direction. Stop when boundaries cross.

The trap is off-by-one errors in boundary conditions. Slow down and be precise.

### Visual

```
Spiral Matrix 3×3:
┌─────────────────┐
│  1    2    3    │  ← pass 1: traverse RIGHT  (top row, top=0→1)
│  4    5    6    │
│  7    8    9    │
└─────────────────┘
Boundaries: top=0 bot=2 lft=0 rgt=2

After → pass: top becomes 1
          ↓ pass: traverse DOWN right col → 6, 9   (rgt=2→1)
          ← pass: traverse LEFT bottom row → 8, 7  (bot=2→1)
          ↑ pass: traverse UP left col → 4          (lft=0→1)
          → pass: traverse RIGHT middle row → 5    (top=1, single row)

Pass | Dir | Elements  | top | bot | lft | rgt
  1  |  →  | 1, 2, 3   |  1  |  2  |  0  |  2
  2  |  ↓  | 6, 9      |  1  |  2  |  0  |  1
  3  |  ←  | 8, 7      |  1  |  1  |  0  |  1
  4  |  ↑  | 4         |  1  |  1  |  1  |  1
  5  |  →  | 5         |  2  |  1  |  1  |  1  ← top>bot → stop

Result: [1, 2, 3, 6, 9, 8, 7, 4, 5]
```

### Code (Java + JavaScript)

```java
// Java: Spiral Matrix (LC 54)
public List<Integer> spiralOrder(int[][] matrix) {
    List<Integer> res = new ArrayList<>();
    int top = 0, bottom = matrix.length - 1;
    int left = 0, right = matrix[0].length - 1;

    while (top <= bottom && left <= right) {
        for (int c = left;   c <= right;  c++) res.add(matrix[top][c]);
        top++;
        for (int r = top;    r <= bottom; r++) res.add(matrix[r][right]);
        right--;
        if (top <= bottom) {
            for (int c = right; c >= left; c--) res.add(matrix[bottom][c]);
            bottom--;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; r--) res.add(matrix[r][left]);
            left++;
        }
    }
    return res;
}
```

```javascript
// JavaScript: Spiral Matrix (LC 54)
function spiralOrder(matrix) {
    const res = [];
    let top = 0, bottom = matrix.length - 1;
    let left = 0, right = matrix[0].length - 1;

    while (top <= bottom && left <= right) {
        for (let c = left;   c <= right;  c++) res.push(matrix[top][c]);
        top++;
        for (let r = top;    r <= bottom; r++) res.push(matrix[r][right]);
        right--;
        if (top <= bottom) {
            for (let c = right; c >= left; c--) res.push(matrix[bottom][c]);
            bottom--;
        }
        if (left <= right) {
            for (let r = bottom; r >= top; r--) res.push(matrix[r][left]);
            left++;
        }
    }
    return res;
}
```

### Dry Run

3×3 matrix `[[1,2,3],[4,5,6],[7,8,9]]`:

| Pass | Direction | Elements Read | top | bottom | left | right |
|------|-----------|--------------|-----|--------|------|-------|
| 1 | → (right) | 1, 2, 3 | 1 | 2 | 0 | 2 |
| 2 | ↓ (down) | 6, 9 | 1 | 2 | 0 | 1 |
| 3 | ← (left) | 8, 7 | 1 | 1 | 0 | 1 |
| 4 | ↑ (up) | 4 | 1 | 1 | 1 | 1 |
| 5 | → (right) | 5 | 2 | 1 | 1 | 1 |
| — | top>bottom | stop | — | — | — | — |

Result: `[1, 2, 3, 6, 9, 8, 7, 4, 5]`

### Complexity

- **Time:** O(m×n) — every cell is visited exactly once.
- **Space:** O(1) extra (the output list is not counted). The four boundary pointers are the only state needed.

### Do Not Confuse With

| | Simulation | BFS / DFS |
|---|---|---|
| **Decision** | One deterministic path — rules fully specify next action | Branches at each node, explores all reachable states |
| **Purpose** | Execute a defined sequence of operations | Find reachability, shortest paths, connected components |
| **Use when** | Rules completely specify the next step | Need to explore multiple possibilities |
| **Example** | Spiral Matrix, Robot Instructions | Shortest path in grid, connected islands |

### Experience Tip
**Experience Tip:** For simulation, slow is fast. Write careful, explicit boundary handling. The most common bugs are off-by-one at edges. Consider: can you detect a cycle to avoid simulating all N steps?

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---|---|---|---|
| 54 | Spiral Matrix | Medium | 4 boundary pointers, shrink after each pass | https://leetcode.com/problems/spiral-matrix/ |
| 289 | Game of Life | Medium | Encode intermediate states in-place to avoid copy | https://leetcode.com/problems/game-of-life/ |
| 1041 | Robot Bounded in Circle | Medium | After 1 cycle: if at origin OR direction changed → loops | https://leetcode.com/problems/robot-bounded-in-circle/ |
| 735 | Asteroid Collision | Medium | Stack-based simulation; handle collision cases carefully | https://leetcode.com/problems/asteroid-collision/ |

### One-Minute Revision
```
PATTERN:   Simulation
USE WHEN:  Follow rules literally; no formula to skip steps
KEY STEP:  Write slow, careful code. Handle boundaries explicitly.
           Ask: can I detect cycles to skip N steps?
```

---

## Minimax / Game Theory

### What is it?
Two players alternate turns. One maximizes the score, the other minimizes. At each game state, the current player picks the move that is best for them, assuming the opponent also plays perfectly.

### When to use?
- Two players, turn-based, both playing optimally.
- Keywords: "predict the winner", "stone game", "optimal play", "both players play best".
- When the game state space is small enough for recursion + memoization.

### Simple Example
**Stone Game:** Two piles of stones at each end of an array. Players alternate picking from either end. The player with more stones wins. Who wins?

Define `dp[i][j]` = the maximum score difference (your score minus opponent's score) the current player can achieve on the subarray `[i..j]`. The transition: pick left or pick right, whichever gives better score difference. `dp[i][i] = stones[i]`.

### Visual

```
2-pile Nim: piles=[5,3]   MAX=Player1  MIN=Player2

                     MAX node: pick left(5) or right(3)
                    /                                   \
         pick left=5                              pick right=3
         P1 score=5                               P1 score=3
              |                                        |
         MIN node: [3] left                     MIN node: [5] left
         P2 picks 3                              P2 picks 5
         diff = 5-3 = +2                         diff = 3-5 = -2

MAX chooses max(+2, -2) = +2  →  Player 1 picks left pile

Stone Game DP for piles=[5,3,4,5]:
dp[i][j] = best score difference (current player - opponent) on piles[i..j]

Base (len=1): dp[0][0]=5  dp[1][1]=3  dp[2][2]=4  dp[3][3]=5

len=2:
  dp[0][1]=max(5-dp[1][1], 3-dp[0][0])=max(5-3, 3-5)=max(2,-2)= 2
  dp[1][2]=max(3-dp[2][2], 4-dp[1][1])=max(3-4, 4-3)=max(-1,1)= 1
  dp[2][3]=max(4-dp[3][3], 5-dp[2][2])=max(4-5, 5-4)=max(-1,1)= 1

len=3:
  dp[0][2]=max(5-dp[1][2], 4-dp[0][1])=max(5-1, 4-2)=max(4,2)= 4
  dp[1][3]=max(3-dp[2][3], 5-dp[1][2])=max(3-1, 5-1)=max(2,4)= 4

len=4:
  dp[0][3]=max(5-dp[1][3], 5-dp[0][2])=max(5-4, 5-4)=max(1,1)= 1 ≥ 0 → P1 wins
```

### Code (Java + JavaScript)

```java
// Java: Predict the Winner / Stone Game generalized (LC 486)
public boolean predictTheWinner(int[] nums) {
    int n = nums.length;
    int[][] dp = new int[n][n];
    for (int i = 0; i < n; i++) dp[i][i] = nums[i]; // base case

    for (int len = 2; len <= n; len++) {
        for (int i = 0; i <= n - len; i++) {
            int j = i + len - 1;
            // current player picks nums[i] or nums[j]
            dp[i][j] = Math.max(nums[i] - dp[i+1][j],
                                nums[j] - dp[i][j-1]);
        }
    }
    return dp[0][n-1] >= 0; // player 1 wins or ties
}
```

```javascript
// JavaScript: Predict the Winner (LC 486)
function predictTheWinner(nums) {
    const n = nums.length;
    const dp = Array.from({length: n}, (_, i) =>
        Array.from({length: n}, (_, j) => (i === j ? nums[i] : 0)));

    for (let len = 2; len <= n; len++) {
        for (let i = 0; i <= n - len; i++) {
            const j = i + len - 1;
            dp[i][j] = Math.max(nums[i] - dp[i+1][j],
                                nums[j] - dp[i][j-1]);
        }
    }
    return dp[0][n-1] >= 0;
}
```

### Dry Run

`piles = [5, 3, 4, 5]`:

| len | i | j | pick left | pick right | dp[i][j] |
|-----|---|---|-----------|------------|----------|
| 2 | 0 | 1 | 5 - dp[1][1]=3 → 2 | 3 - dp[0][0]=5 → -2 | **2** |
| 2 | 1 | 2 | 3 - dp[2][2]=4 → -1 | 4 - dp[1][1]=3 → 1 | **1** |
| 2 | 2 | 3 | 4 - dp[3][3]=5 → -1 | 5 - dp[2][2]=4 → 1 | **1** |
| 3 | 0 | 2 | 5 - dp[1][2]=1 → 4 | 4 - dp[0][1]=2 → 2 | **4** |
| 3 | 1 | 3 | 3 - dp[2][3]=1 → 2 | 5 - dp[1][2]=1 → 4 | **4** |
| 4 | 0 | 3 | 5 - dp[1][3]=4 → 1 | 5 - dp[0][2]=4 → 1 | **1** ≥ 0 → P1 wins |

### Complexity

- **Time:** O(n²) — filling an n×n DP table, each cell in O(1).
- **Space:** O(n²) for the DP table. Can be reduced to O(n) with a 1D rolling array.
- Naive recursive minimax without memoization: O(2^n).

### Do Not Confuse With

| | Minimax / Game DP | Greedy |
|---|---|---|
| **Horizon** | Simulates ALL future moves by BOTH players optimally | Looks only at the current best local choice |
| **Opponent** | Assumes opponent also plays optimally (adversarial) | No opponent; single decision-maker |
| **Use when** | Two-player, turn-based, adversarial | Greedy-choice property provably holds |
| **Example** | Stone Game, Predict the Winner | Jump Game, Activity Selection |

### Experience Tip
**Experience Tip:** Before building a game tree, check if there is a mathematical pattern. Nim Game (take 1-3 stones): you lose if `n % 4 == 0`. Always try small cases to find a formula before coding a full minimax tree.

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---|---|---|---|
| 877 | Stone Game | Medium | Interval DP or notice first player always wins | https://leetcode.com/problems/stone-game/ |
| 486 | Predict the Winner | Medium | Interval DP: dp[i][j] = score difference for current player | https://leetcode.com/problems/predict-the-winner/ |
| 292 | Nim Game | Easy | Pure math: lose if n % 4 == 0 | https://leetcode.com/problems/nim-game/ |

### One-Minute Revision
```
PATTERN:   Minimax / Game Theory DP
USE WHEN:  Two players, turn-based, optimal play
KEY STEP:  dp[i][j] = max score difference current player achieves on [i..j]
           Try small cases for math shortcut before building a full game tree
```

---

## Meet in the Middle

### What is it?
Split the input in half. Solve each half independently (enumerate all possibilities). Combine the two halves. This converts O(2^n) to O(2^(n/2) * n) — a massive speedup.

### When to use?
- Subset sum or subset enumeration with n between 30 and 40.
- Pure backtracking O(2^n) is too slow (n > 25) but O(n^2) DP is also too slow.
- Constraint signal: n ≤ 40 is the canonical trigger.

### Simple Example
**Subset sum, n = 38, target T:** O(2^38) is way too slow. Split into two halves of 19. Generate all 2^19 ≈ 524k subset sums for each half. Sort one half. For each sum in the first half, binary search in the sorted second half for `T - sum`. Total: ~10 million operations — fits easily.

### Visual

```
Array: [1, 2, 3, 4]   Target = 5
Split: Left = [1, 2]   Right = [3, 4]

Left half — all 2^2 = 4 subset sums:
  {}    → 0
  {1}   → 1
  {2}   → 2
  {1,2} → 3
  Sorted: [0, 1, 2, 3]

Right half — all 2^2 = 4 subset sums:
  {}    → 0
  {3}   → 3
  {4}   → 4
  {3,4} → 7
  Sorted: [0, 3, 4, 7]

Binary search step (for each left sum L, look for target-L in right):
  L=0 → need 5 → not found in [0,3,4,7]
  L=1 → need 4 → FOUND  →  subset {1} ∪ {4} = {1,4} sums to 5 ✓
  L=2 → need 3 → FOUND  →  subset {2} ∪ {3} = {2,3} sums to 5 ✓
  L=3 → need 2 → not found

Speedup: O(2^4)=16  →  O(2^2 × 2)=8  (tiny example; real gain at n=40: 10^12 → ~20M)
```

### Code (Java + JavaScript)

```java
// Java: Subset sum using Meet in the Middle
import java.util.*;
public boolean subsetSumMITM(int[] nums, int target) {
    int n = nums.length, half = n / 2;
    List<Integer> leftSums = new ArrayList<>(), rightSums = new ArrayList<>();

    for (int mask = 0; mask < (1 << half); mask++) {
        int s = 0;
        for (int i = 0; i < half; i++)
            if ((mask >> i & 1) == 1) s += nums[i];
        leftSums.add(s);
    }
    for (int mask = 0; mask < (1 << (n - half)); mask++) {
        int s = 0;
        for (int i = 0; i < n - half; i++)
            if ((mask >> i & 1) == 1) s += nums[half + i];
        rightSums.add(s);
    }

    Collections.sort(rightSums);
    for (int ls : leftSums) {
        int need = target - ls;
        if (Collections.binarySearch(rightSums, need) >= 0) return true;
    }
    return false;
}
```

```javascript
// JavaScript: Subset sum using Meet in the Middle
function subsetSumMITM(nums, target) {
    const n = nums.length, half = Math.floor(n / 2);
    const leftSums = [], rightSums = [];

    for (let mask = 0; mask < (1 << half); mask++) {
        let s = 0;
        for (let i = 0; i < half; i++)
            if ((mask >> i) & 1) s += nums[i];
        leftSums.push(s);
    }
    for (let mask = 0; mask < (1 << (n - half)); mask++) {
        let s = 0;
        for (let i = 0; i < n - half; i++)
            if ((mask >> i) & 1) s += nums[half + i];
        rightSums.push(s);
    }

    rightSums.sort((a, b) => a - b);
    for (const ls of leftSums) {
        const need = target - ls;
        let lo = 0, hi = rightSums.length - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (rightSums[mid] === need) return true;
            else if (rightSums[mid] < need) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return false;
}
```

### Dry Run

`nums = [1, 2, 3, 4]`, `target = 5`:

| Step | Action | Data |
|------|--------|------|
| 1 | Enumerate left half [1,2] | leftSums = [0, 1, 2, 3] |
| 2 | Enumerate right half [3,4] | rightSums = [0, 3, 4, 7] |
| 3 | Sort rightSums | [0, 3, 4, 7] |
| 4 | L=0, need=5 | binary search → not found |
| 5 | L=1, need=4 | binary search → found at index 2 → **return true** |

Subset `{1} ∪ {4}` = `{1, 4}` sums to 5.

### Complexity

- **Time:** O(2^(n/2) × n) — generating sums: O(2^(n/2) × n/2); sorting: O(2^(n/2) × n/2); search: O(2^(n/2) × log(2^(n/2))). All terms are O(2^(n/2) × n).
- **Space:** O(2^(n/2)) to store subset sums for each half.
- Comparison: naive O(2^n); MITM O(2^(n/2) × n). For n=40: ~10^12 vs ~20 million.

### Do Not Confuse With

| | Meet in the Middle | Divide and Conquer |
|---|---|---|
| **Split purpose** | Create two enumeration halves; combine their OUTPUT SUMS | Divide input into independent subproblems |
| **Combination** | Search one half's results for complement of other half | Merge sub-results structurally |
| **Subproblems** | Dependent (outputs combined via search) | Independent (each solved in isolation) |
| **Example** | Subset sum n=38 | Merge Sort, Binary Search |

### Experience Tip
**Experience Tip:** When you see n ≤ 40 and the problem involves choosing/not choosing elements, your brain should immediately fire "Meet in the Middle". It is one of the few situations where this exact technique applies.

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---|---|---|---|
| 1755 | Closest Subsequence Sum | Hard | Classic Meet in the Middle on subsequence sums | https://leetcode.com/problems/closest-subsequence-sum/ |
| 2035 | Partition Array Into Two Arrays to Minimize Difference | Hard | Split halves, sort, binary search for complement | https://leetcode.com/problems/partition-array-into-two-arrays-to-minimize-sum-difference/ |

### One-Minute Revision
```
PATTERN:   Meet in the Middle
USE WHEN:  n ≤ 40, subset enumeration, O(2^n) too slow
KEY STEP:  Split in half → enumerate both halves → sort one → binary search
           Complexity: O(2^(n/2) * n) instead of O(2^n)
```

---

## Randomized Algorithms

### What is it?
Use randomness to get good average-case performance or to handle adversarial inputs. The two main types: Las Vegas (always correct, variable time) and Monte Carlo (always fast, occasionally wrong).

### When to use?
- "Kth largest element" in O(n) average → Quick Select with random pivot.
- "Uniform random sample from unknown-length stream" → Reservoir Sampling.
- "Random shuffle" → Fisher-Yates.
- "Pick random index weighted by probabilities" → Prefix sum + binary search on random float.

### Simple Example
**Random Pick with Weight:** Array `weights = [1, 3, 2]`. Pick index 0 with probability 1/6, index 1 with probability 3/6, index 2 with probability 2/6.

Build prefix sums `[1, 4, 6]`. Generate a random float in `[0, 6)`. Binary search to find which bucket it falls in. That is your index.

### Visual

```
Fisher-Yates Shuffle on [1, 2, 3, 4, 5]
At step i, pick random j in [0..i] and swap arr[i] with arr[j].
Process from right to left (i = n-1 down to 1).

Initial:  [ 1,  2,  3,  4,  5 ]

i=4, j=1 (random):  swap arr[4] ↔ arr[1]
          [ 1,  5,  3,  4,  2 ]   ← 2 fixed at position 4

i=3, j=3 (random):  swap arr[3] ↔ arr[3]  (no-op)
          [ 1,  5,  3,  4,  2 ]   ← 4 fixed at position 3

i=2, j=0 (random):  swap arr[2] ↔ arr[0]
          [ 3,  5,  1,  4,  2 ]   ← 1 fixed at position 2

i=1, j=1 (random):  swap arr[1] ↔ arr[1]  (no-op)
          [ 3,  5,  1,  4,  2 ]   ← 5 fixed at position 1

Done. Shuffled result: [ 3, 5, 1, 4, 2 ]
Each of 5! = 120 permutations is equally likely.
```

### Code (Java + JavaScript)

```java
// Java: Fisher-Yates Shuffle (LC 384)
import java.util.Random;
public void shuffle(int[] arr) {
    Random rand = new Random();
    for (int i = arr.length - 1; i > 0; i--) {
        int j = rand.nextInt(i + 1);           // j in [0, i]
        int tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
}
```

```javascript
// JavaScript: Fisher-Yates Shuffle (LC 384)
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // j in [0, i]
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
```

### Dry Run

`arr = [1, 2, 3, 4, 5]`:

| i | j (random) | Swap | Array state after swap |
|---|-----------|------|------------------------|
| 4 | 1 | arr[4] ↔ arr[1] | [1, 5, 3, 4, 2] |
| 3 | 3 | arr[3] ↔ arr[3] | [1, 5, 3, 4, 2] |
| 2 | 0 | arr[2] ↔ arr[0] | [3, 5, 1, 4, 2] |
| 1 | 1 | arr[1] ↔ arr[1] | [3, 5, 1, 4, 2] |

Final: `[3, 5, 1, 4, 2]`

### Complexity

- **Time:** O(n) — one pass, exactly one swap per element.
- **Space:** O(1) — in-place shuffle; no auxiliary array needed.

### Do Not Confuse With

| | Fisher-Yates Shuffle | Sort-based Shuffle |
|---|---|---|
| **Algorithm** | Swap each element with a random earlier position | Assign random keys, then sort by those keys |
| **Time** | O(n) | O(n log n) |
| **Uniformity** | Provably uniform — each permutation equally likely | Also uniform, but wasteful |
| **Use when** | Performance matters; standard interview answer | Never — Fisher-Yates is always preferable |

### Experience Tip
**Experience Tip:** "Random pick by weight" almost always reduces to prefix sum + binary search on a random value. Reservoir sampling rule: at step i, replace any reservoir element with probability K/i. These two patterns cover 90% of randomized interview questions.

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---|---|---|---|
| 528 | Random Pick with Weight | Medium | Prefix sum + binary search on random float | https://leetcode.com/problems/random-pick-with-weight/ |
| 215 | Kth Largest Element in an Array | Medium | Quick Select with random pivot — O(n) average | https://leetcode.com/problems/kth-largest-element-in-an-array/ |
| 382 | Linked List Random Node | Medium | Reservoir sampling (K=1 case) | https://leetcode.com/problems/linked-list-random-node/ |
| 384 | Shuffle an Array | Medium | Fisher-Yates: swap arr[i] with arr[random(0,i)] | https://leetcode.com/problems/shuffle-an-array/ |

### One-Minute Revision
```
PATTERN:   Randomized Algorithms
USE WHEN:  "Random pick", "Kth largest", "shuffle", "stream sampling"
KEY STEP:  Weighted pick → prefix sum + binary search on random value
           Stream sampling → Reservoir: replace slot i with prob K/i
```

---

## Amortized Analysis

### What is it?
Some operations look expensive in isolation but are cheap when averaged over many operations. Amortized analysis spreads the total cost evenly. An "expensive" operation is only possible after many cheap ones have been done — so the average is still low.

### When to use?
- Justifying why a monotonic stack with many pops is still O(n) total.
- Explaining why dynamic array push is O(1) average despite occasional O(n) resize.
- Whenever an interviewer challenges "isn't that O(n²)?" on a stack or queue operation.

### Simple Example
**Monotonic Stack:** In Largest Rectangle in Histogram, each bar is pushed once and popped once. Even though one bar might trigger a cascade of pops, the total number of pops across the entire array is at most n. So the algorithm is O(n) total, not O(n²).

This is the amortized argument: total work = n pushes + n pops = O(n).

### Visual

```
Dynamic Array: start with capacity=1, double when full.

Push # | size | capacity | Resize? | Copy cost | Cumulative cost
-------|------|----------|---------|-----------|----------------
  1    |  1   |    1     |  No     |     0     |       1
  2    |  2   |    2     |  Yes    |     1     |       3   ← copies 1 elem
  3    |  3   |    4     |  Yes    |     2     |       6   ← copies 2 elems
  4    |  4   |    4     |  No     |     0     |       7
  5    |  5   |    8     |  Yes    |     4     |      12   ← copies 4 elems
  6    |  6   |    8     |  No     |     0     |      13
  7    |  7   |    8     |  No     |     0     |      14
  8    |  8   |    8     |  No     |     0     |      15

Total work = 8 pushes + (0+1+2+0+4+0+0+0) copies = 8 + 7 = 15
Amortized cost per push = 15 / 8 ≈ 2 = O(1)

Key insight: copy costs form a geometric series  1+2+4+...+n/2 < 2n
So total work for n pushes ≤ n + 2n = 3n = O(n) → O(1) amortized each.
```

### Code (Java + JavaScript)

```java
// Java: Dynamic Array with amortized O(1) push
import java.util.Arrays;
public class DynamicArray {
    private int[] data = new int[1];
    private int size = 0;

    public void push(int val) {
        if (size == data.length) {
            data = Arrays.copyOf(data, data.length * 2); // O(n) — happens rarely
        }
        data[size++] = val;                              // O(1) — happens always
    }

    public int get(int i)  { return data[i]; }
    public int size()      { return size; }
}
```

```javascript
// JavaScript: Dynamic Array with amortized O(1) push
class DynamicArray {
    constructor() {
        this.data = new Array(1);
        this.size = 0;
        this.capacity = 1;
    }
    push(val) {
        if (this.size === this.capacity) {
            const bigger = new Array(this.capacity * 2);
            for (let i = 0; i < this.size; i++) bigger[i] = this.data[i];
            this.data = bigger;
            this.capacity *= 2;
        }
        this.data[this.size++] = val;
    }
    get(i) { return this.data[i]; }
}
```

### Dry Run

8 pushes (values a–h):

| Push | val | size | capacity | Resize? | Copy cost | capacity after |
|------|-----|------|----------|---------|-----------|----------------|
| 1 | a | 0→1 | 1 | No | 0 | 1 |
| 2 | b | 1→2 | 1 | Yes (1→2) | 1 | 2 |
| 3 | c | 2→3 | 2 | Yes (2→4) | 2 | 4 |
| 4 | d | 3→4 | 4 | No | 0 | 4 |
| 5 | e | 4→5 | 4 | Yes (4→8) | 4 | 8 |
| 6 | f | 5→6 | 8 | No | 0 | 8 |
| 7 | g | 6→7 | 8 | No | 0 | 8 |
| 8 | h | 7→8 | 8 | No | 0 | 8 |

Total copy cost = 0+1+2+0+4+0+0+0 = **7**; total work = 7+8 = **15**; amortized = 15/8 ≈ **2** = O(1)

### Complexity

- **Time:** O(1) amortized per push — total work for n pushes is O(n) because copy costs sum to at most 2n.
- **Time:** O(n) worst case for one individual push that triggers a doubling.
- **Space:** O(n) — at any point, capacity ≤ 2 × size, so wasted space is at most a constant factor.

### Do Not Confuse With

| | Amortized Analysis | Average-case Analysis |
|---|---|---|
| **Guarantee** | O(1) per operation across ANY sequence (deterministic) | O(1) only on average across random inputs |
| **Adversarial input** | Safe — holds even for worst-case sequences | Can be broken by adversarial input |
| **Basis** | Total cost of n operations ≤ c×n (proven) | Expected cost over probability distribution |
| **Example** | Dynamic array push, monotonic stack pops | Quick Sort with random pivot on random input |

### Experience Tip
**Experience Tip:** When an interviewer asks "isn't that O(n²) because of the pops?", say: "No, because each element is pushed exactly once and popped at most once across the entire array. The total work is O(n) amortized."

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---|---|---|---|
| 84 | Largest Rectangle in Histogram | Hard | Each bar pushed/popped once — total O(n) | https://leetcode.com/problems/largest-rectangle-in-histogram/ |
| 155 | Min Stack | Easy | Push/pop — track min alongside data | https://leetcode.com/problems/min-stack/ |

### One-Minute Revision
```
PATTERN:   Amortized Analysis
USE WHEN:  Stack/queue with many pops; dynamic array resize; Union-Find
KEY STEP:  Count TOTAL work across ALL operations, not worst-case per step.
           "Each element pushed once, popped once → O(n) total"
```

---

## Monotonic Patterns

### What is it?
Maintain a stack or deque that is always sorted (ascending or descending). When a new element arrives, pop all elements that violate the monotonic property before pushing. This gives you O(n) solutions to "next greater/smaller element" and "sliding window max/min" problems.

### When to use?
- "Next greater element" / "next smaller element" for each position.
- "Largest rectangle" / "trapping rain water" — spans determined by boundaries.
- "Sliding window maximum" — need max of a window as it slides.
- DP optimization over a sliding range.

### Simple Example
**Next Greater Element:** For each element, find the next element to the right that is larger.

Use a decreasing monotonic stack. Process left to right. When element `x` arrives, pop all stack elements smaller than `x` — `x` is their "next greater". Push `x`. Elements still in the stack at the end have no next greater element.

### Visual

```
Next Greater Element for [2, 1, 2, 4, 3]
Decreasing monotonic stack (stores values). Process left to right.

i=0, val=2:  stack empty → push 2.          stack: [2]
i=1, val=1:  1 < top(2) → no pop → push 1. stack: [2, 1]
i=2, val=2:  2 > top(1) → pop 1, NGE[1]=2
             2 = top(2) → not strictly greater → push 2.
                                                stack: [2, 2]
i=3, val=4:  4 > top(2) → pop 2, NGE[2]=4
             4 > top(2) → pop 2, NGE[0]=4
             stack empty → push 4.             stack: [4]
i=4, val=3:  3 < top(4) → push 3.             stack: [4, 3]

End: remaining elements have no NGE → NGE[3]=-1, NGE[4]=-1

Result: NGE = [4, 2, 4, -1, -1]
         idx:  0  1  2   3   4
```

### Code (Java + JavaScript)

```java
// Java: Next Greater Element I (LC 496)
public int[] nextGreaterElement(int[] nums1, int[] nums2) {
    Map<Integer, Integer> nge = new HashMap<>();
    Deque<Integer> stack = new ArrayDeque<>();  // decreasing stack

    for (int val : nums2) {
        while (!stack.isEmpty() && stack.peek() < val)
            nge.put(stack.pop(), val);   // val is the next greater for popped element
        stack.push(val);
    }
    while (!stack.isEmpty()) nge.put(stack.pop(), -1); // no next greater

    int[] res = new int[nums1.length];
    for (int i = 0; i < nums1.length; i++)
        res[i] = nge.get(nums1[i]);
    return res;
}
```

```javascript
// JavaScript: Next Greater Element I (LC 496)
function nextGreaterElement(nums1, nums2) {
    const nge = new Map();
    const stack = [];  // decreasing stack

    for (const val of nums2) {
        while (stack.length && stack[stack.length - 1] < val)
            nge.set(stack.pop(), val);
        stack.push(val);
    }
    while (stack.length) nge.set(stack.pop(), -1);

    return nums1.map(n => nge.get(n));
}
```

### Dry Run

`nums2 = [2, 1, 2, 4, 3]`:

| i | val | Stack before | Pops (element → NGE) | Stack after |
|---|-----|-------------|----------------------|-------------|
| 0 | 2 | [] | — | [2] |
| 1 | 1 | [2] | — (1 < 2, no pop) | [2, 1] |
| 2 | 2 | [2, 1] | 1 → 2 | [2, 2] |
| 3 | 4 | [2, 2] | 2 → 4, 2 → 4 | [4] |
| 4 | 3 | [4] | — (3 < 4, no pop) | [4, 3] |
| end | — | [4, 3] | 4 → -1, 3 → -1 | [] |

NGE map: `{1→2, 2→4, 4→-1, 3→-1}`

### Complexity

- **Time:** O(n) — each element is pushed onto the stack exactly once and popped at most once. Total pushes + pops ≤ 2n.
- **Space:** O(n) — the stack holds at most n elements; the HashMap stores n entries.

### Do Not Confuse With

| | Monotonic Stack | Sorting |
|---|---|---|
| **Purpose** | Find relationships between elements at their ORIGINAL positions | Rearrange elements by value |
| **Position** | Preserves original indices — output is per-index | Destroys original order |
| **Output** | NGE[i], span widths, rectangle areas | Ordered sequence of values |
| **Example** | Next Greater Element, Daily Temperatures | Find k-th largest value |

### Experience Tip
**Experience Tip:** Decide direction first: "next greater to the RIGHT" → process left-to-right, decreasing stack. "next smaller to the LEFT" → process right-to-left or use the reverse. Drawing the stack state for 3-4 elements usually makes the direction clear.

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---|---|---|---|
| 496 | Next Greater Element I | Easy | Decreasing stack, process left to right | https://leetcode.com/problems/next-greater-element-i/ |
| 739 | Daily Temperatures | Medium | Same idea: decreasing stack, record distances | https://leetcode.com/problems/daily-temperatures/ |
| 84 | Largest Rectangle in Histogram | Hard | Increasing stack, pop when height drops | https://leetcode.com/problems/largest-rectangle-in-histogram/ |
| 239 | Sliding Window Maximum | Hard | Monotonic deque, maintain decreasing front = max | https://leetcode.com/problems/sliding-window-maximum/ |

### One-Minute Revision
```
PATTERN:   Monotonic Stack / Deque
USE WHEN:  "Next greater/smaller", "largest rectangle", "sliding window max"
KEY STEP:  Each element enters and exits at most once → O(n) total.
           Decreasing stack → next greater. Increasing stack → next smaller.
```

---

## Reverse Thinking

### What is it?
When the forward problem is hard, solve the reverse. Instead of asking "where does this go?", ask "where did this come from?". Instead of building forward, start from the end state and work backwards.

### When to use?
- You are stuck on the forward pass and cannot find an efficient approach.
- "Not reachable" or "not surrounded" is easier to characterize than "is surrounded".
- The problem involves "minimum deletions" — flip it to "maximum valid elements kept".
- You need to undo operations in reverse order.

### Simple Example
**Surrounded Regions (LC 130):** Flip all 'O' regions fully surrounded by 'X'. Forward approach: check each 'O' cell, DFS to border — O(n^2 * m^2), too slow.

Reverse: "not surrounded" = "connected to the border". BFS/DFS from all border 'O' cells, mark them safe. Then flip everything remaining. O(m*n).

| Forward Direction (Hard) | Reverse Direction (Easier) |
|---|---|
| Find surrounded regions from inside | Start from border O's, BFS outward, flip the rest |
| Count elements removed | Count elements kept; removals = total - kept |
| Minimum deletions for valid string | Maximum valid subsequence; deletions = n - max_valid |
| Build answer step by step | Start from answer, undo operations in reverse |

### Visual

```
Problem: Count inversions in [3, 1, 2]
(pairs (i,j) where i<j AND arr[i]>arr[j])

Forward brute force O(n²): check every pair
  (i=0,j=1): arr[0]=3 > arr[1]=1 ✓  inversion
  (i=0,j=2): arr[0]=3 > arr[2]=2 ✓  inversion
  (i=1,j=2): arr[1]=1 > arr[2]=2 ✗
  Total = 2

Reverse Thinking — reformulate as merge sort O(n log n):
  Instead of "for each pair, is it an inversion?"
  Ask: "during merge, how many left elements are > a right element?"
  Each such event is an inversion we can count in bulk.

Merge sort tree for [3,1,2]:
         [3,1,2]
        /        \
      [3]        [1,2]
                /     \
             [1]       [2]

Merge [1] and [2]: 1≤2 → 0 inversions  → merged: [1,2]
Merge [3] and [1,2]:
  Compare 3 vs 1: 3>1 → 1 goes first; all remaining left ([3]) are > 1
                  → count += 1 (1 element left on left side)
  Compare 3 vs 2: 3>2 → 2 goes first; count += 1
  → merged: [1,2,3]   inversions from this merge = 2

Total inversions = 0 + 2 = 2  ✓
```

### Code (Java + JavaScript)

```java
// Java: Count Inversions via Merge Sort (Reverse Thinking)
public int countInversions(int[] nums) {
    return mergeSort(nums, 0, nums.length - 1);
}

private int mergeSort(int[] arr, int left, int right) {
    if (left >= right) return 0;
    int mid = (left + right) / 2;
    int count = mergeSort(arr, left, mid) + mergeSort(arr, mid + 1, right);
    return count + merge(arr, left, mid, right);
}

private int merge(int[] arr, int left, int mid, int right) {
    int[] tmp = new int[right - left + 1];
    int i = left, j = mid + 1, k = 0, count = 0;
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) {
            tmp[k++] = arr[i++];
        } else {
            count += (mid - i + 1); // all remaining left elements > arr[j]
            tmp[k++] = arr[j++];
        }
    }
    while (i <= mid)   tmp[k++] = arr[i++];
    while (j <= right) tmp[k++] = arr[j++];
    System.arraycopy(tmp, 0, arr, left, tmp.length);
    return count;
}
```

```javascript
// JavaScript: Count Inversions via Merge Sort
function countInversions(nums) {
    return mergeSort(nums, 0, nums.length - 1);
}
function mergeSort(arr, left, right) {
    if (left >= right) return 0;
    const mid = (left + right) >> 1;
    let count = mergeSort(arr, left, mid) + mergeSort(arr, mid + 1, right);
    const tmp = [];
    let i = left, j = mid + 1;
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) tmp.push(arr[i++]);
        else {
            count += (mid - i + 1); // all remaining left elements > arr[j]
            tmp.push(arr[j++]);
        }
    }
    while (i <= mid)   tmp.push(arr[i++]);
    while (j <= right) tmp.push(arr[j++]);
    arr.splice(left, tmp.length, ...tmp);
    return count;
}
```

### Dry Run

`arr = [3, 1, 2]`:

| Step | Merge call | Left part | Right part | Inversions found | Merged result |
|------|-----------|-----------|------------|-----------------|---------------|
| 1 | merge([1],[2]) | [1] | [2] | 0 (1≤2) | [1,2] |
| 2 | merge([3],[1,2]) | [3] | [1,2] | 3>1 → count+=1; 3>2 → count+=1 | [1,2,3] |
| Total | | | | **2** | [1,2,3] |

Inversions: (3,1) and (3,2).

### Complexity

- **Time:** O(n log n) — same as merge sort. Counting inversions adds O(1) work per merge step.
- **Space:** O(n) — temporary array for merging.

### Do Not Confuse With

| | Reverse Thinking | Brute Force |
|---|---|---|
| **Approach** | Reformulates the problem to enable a faster algorithm | Directly checks all combinations |
| **Complexity** | O(n log n) for inversion counting | O(n²) — checks all pairs |
| **Key move** | Change WHAT you are counting so bulk work is possible | Try every (i,j) pair explicitly |
| **Example** | Merge sort to count inversions | Two nested loops over all pairs |

### Experience Tip
**Experience Tip:** The trigger phrase is "I'm stuck on the forward pass". The moment you feel that, explicitly ask yourself: "What is the reverse of this problem? What if I started from the answer?" This alone unblocks a surprising number of hard problems.

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---|---|---|---|
| 130 | Surrounded Regions | Medium | BFS from border 'O' cells, flip the rest | https://leetcode.com/problems/surrounded-regions/ |
| 417 | Pacific Atlantic Water Flow | Medium | BFS from both oceans inward, find intersection | https://leetcode.com/problems/pacific-atlantic-water-flow/ |
| 1293 | Shortest Path in a Grid with Obstacles Elimination | Hard | BFS forward but state includes eliminations used | https://leetcode.com/problems/shortest-path-in-a-grid-with-obstacles-elimination/ |

### One-Minute Revision
```
PATTERN:   Reverse Thinking
USE WHEN:  Stuck on forward pass; "not X" is easier than "X"; min deletions
KEY STEP:  Ask: "What is the OPPOSITE of what I'm trying to find?"
           Solve the reverse, then map back to original answer.
```

---

## Add / Remove Constraint

### What is it?
If a problem is too hard as stated, temporarily simplify it by adding a constraint or removing one. Solve the easier version first. Then generalize back to the original problem. This is how you make progress on unfamiliar problems.

### When to use?
- You encounter a completely unfamiliar problem.
- The problem has multiple interacting constraints and you are overwhelmed.
- You want to show structured thinking even if you do not have the full solution yet.
- Use this to start any problem — solve it for K=1, or n=1, or the unweighted version.

### Simple Example
**Longest Substring with at most K Distinct Characters:** Hard for general K.

Simplify: K = 1 (longest run of the same character). Easy — one pass. Now generalize: use sliding window + HashMap to track distinct character counts. When `HashMap.size() > K`, shrink from left. The same sliding window idea scales to any K.

| Hard Version | Simplified Version | How to Generalize |
|---|---|---|
| At most K distinct chars | K = 1 (single char runs) | Sliding window + HashMap |
| Search in 2D matrix | 1D binary search first | Map row/col to index |
| Weighted shortest path | Unweighted BFS first | Add weights → Dijkstra |
| Subset sum, n = 40 | n = 20 (brute force) | Meet in the Middle |

### Visual

```
Problem: Jump Game II — reach end of [2,3,1,1,4] in minimum jumps.

Step 1 — Remove constraint (ask: can you reach the end at all?):
  Track maxReach. If i > maxReach → stuck. Ignore jump count for now.

  i=0: nums[0]=2, reach=max(0, 0+2)=2
  i=1: nums[1]=3, reach=max(2, 1+3)=4  ← can reach index 4 = end ✓

Step 2 — Add constraint back (count minimum jumps):
  Use greedy: track currentEnd (boundary of current jump level)
              and farthest (best index reachable from this level).
  When i reaches currentEnd → forced to jump → jumps++, currentEnd=farthest.

  i=0: farthest=2, i==currentEnd(0)? Yes → jumps=1, currentEnd=2
  i=1: farthest=max(2,4)=4
  i=2: farthest=max(4,3)=4,  i==currentEnd(2)? Yes → jumps=2, currentEnd=4
  i=3: farthest=max(4,4)=4
  Loop ends (i < n-1 = 4, so last element not processed in loop)

  Answer: 2 jumps  (e.g. index 0→1→4)
```

### Code (Java + JavaScript)

```java
// Java: Jump Game II — minimum jumps (LC 45)
public int jump(int[] nums) {
    int jumps = 0, currentEnd = 0, farthest = 0;
    for (int i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (i == currentEnd) {       // must use a jump here
            jumps++;
            currentEnd = farthest;
        }
    }
    return jumps;
}
```

```javascript
// JavaScript: Jump Game II — minimum jumps (LC 45)
function jump(nums) {
    let jumps = 0, currentEnd = 0, farthest = 0;
    for (let i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (i === currentEnd) {
            jumps++;
            currentEnd = farthest;
        }
    }
    return jumps;
}
```

### Dry Run

`nums = [2, 3, 1, 1, 4]`:

| i | nums[i] | farthest | currentEnd | i == currentEnd? | jumps | currentEnd after |
|---|---------|----------|------------|-----------------|-------|-----------------|
| 0 | 2 | max(0, 0+2)=2 | 0 | Yes | 1 | 2 |
| 1 | 3 | max(2, 1+3)=4 | 2 | No | 1 | 2 |
| 2 | 1 | max(4, 2+1)=4 | 2 | Yes | 2 | 4 |
| 3 | 1 | max(4, 3+1)=4 | 4 | No | 2 | 4 |

Loop ends at i=3 (< n-1=4). Answer: **2 jumps**.

### Complexity

- **Time:** O(n) — single pass through the array; three integer variables updated each step.
- **Space:** O(1) — no extra data structures.

### Do Not Confuse With

| | Add / Remove Constraint | Divide and Conquer |
|---|---|---|
| **Simplification** | Modifies the problem's RULES to find structure | Splits the INPUT spatially into halves |
| **Goal** | Solve an easier version; generalize back | Conquer independent subproblems; merge results |
| **Use when** | Problem feels too complex or unfamiliar | Problem has recursive spatial structure |
| **Example** | Jump Game (remove jump limit first, then add it back) | Merge Sort, Closest Pair of Points |

### Experience Tip
**Experience Tip:** In an interview, saying "Let me solve the K=1 case first to understand the structure" is a strong signal. It shows methodical thinking. The interviewer knows you know it is simplified — that is fine.

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---|---|---|---|
| 340 | Longest Substring with At Most K Distinct Characters | Medium | Start with K=1, generalize to K with HashMap | https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters/ |
| 239 | Sliding Window Maximum | Hard | Solve for window=1 first, then extend | https://leetcode.com/problems/sliding-window-maximum/ |
| 76 | Minimum Window Substring | Hard | First: does a valid window exist? Then: minimize it | https://leetcode.com/problems/minimum-window-substring/ |

### One-Minute Revision
```
PATTERN:   Add / Remove Constraint
USE WHEN:  Problem feels too complex; you are stuck; unfamiliar territory
KEY STEP:  Solve for K=1, n=1, or the unweighted/single-constraint version.
           Show it working. Then generalize step by step.
```

---

## Design Problems (System-Level)

### What is it?
You are asked to implement a data structure or system: "Design a LRU Cache", "Design a HashMap", "Design Twitter". These test your ability to combine basic data structures into a working system.

### When to use?
- Problem says "Design", "Implement", "Build" a data structure or service.
- You need O(1) lookups AND O(1) insertions/deletions simultaneously.
- The problem has multiple operations with different complexity requirements.

### Simple Example
**LRU Cache (LC 146):** O(1) get and put. Need fast lookup (HashMap) AND ordered eviction (know which is least recently used). 

Combine: HashMap (key → node) + Doubly Linked List (order by recency). Get/put: move node to front of list (O(1) with pointers). Evict: remove from tail (O(1)).

### Visual

```
LFU Cache, capacity=2:

Three data structures:
  key_to_val  : {key → value}
  key_to_freq : {key → access frequency}
  freq_to_keys: {freq → LinkedHashSet(keys)}  ← insertion order = recency
  min_freq    : lowest frequency in cache

put(1,1):
  key_to_val:   {1→1}
  key_to_freq:  {1→1}
  freq_to_keys: {1→[1]}         min_freq=1

put(2,2):
  key_to_val:   {1→1, 2→2}
  key_to_freq:  {1→1, 2→1}
  freq_to_keys: {1→[1,2]}       min_freq=1

get(1) → returns 1, freq(1) bumped 1→2:
  key_to_val:   {1→1, 2→2}
  key_to_freq:  {1→2, 2→1}
  freq_to_keys: {1→[2], 2→[1]}  min_freq=1 (key 2 still at freq 1)

put(3,3) → cache full, evict LFU key:
  min_freq=1 → freq_to_keys[1]=[2] → evict key 2 (oldest at min_freq)
  then insert key 3:
  key_to_val:   {1→1, 3→3}
  key_to_freq:  {1→2, 3→1}
  freq_to_keys: {1→[3], 2→[1]}  min_freq=1
```

### Code (Java + JavaScript)

```java
// Java: LFU Cache (LC 460) — O(1) get and put
import java.util.*;
class LFUCache {
    private final int cap;
    private int minFreq;
    private final Map<Integer, Integer> keyToVal  = new HashMap<>();
    private final Map<Integer, Integer> keyToFreq = new HashMap<>();
    private final Map<Integer, LinkedHashSet<Integer>> freqToKeys = new HashMap<>();

    public LFUCache(int capacity) { this.cap = capacity; }

    public int get(int key) {
        if (!keyToVal.containsKey(key)) return -1;
        updateFreq(key);
        return keyToVal.get(key);
    }

    public void put(int key, int value) {
        if (cap == 0) return;
        if (keyToVal.containsKey(key)) {
            keyToVal.put(key, value);
            updateFreq(key);
        } else {
            if (keyToVal.size() == cap) evict();
            keyToVal.put(key, value);
            keyToFreq.put(key, 1);
            freqToKeys.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);
            minFreq = 1;
        }
    }

    private void updateFreq(int key) {
        int f = keyToFreq.get(key);
        keyToFreq.put(key, f + 1);
        freqToKeys.get(f).remove(key);
        if (freqToKeys.get(f).isEmpty()) {
            freqToKeys.remove(f);
            if (minFreq == f) minFreq++;
        }
        freqToKeys.computeIfAbsent(f + 1, k -> new LinkedHashSet<>()).add(key);
    }

    private void evict() {
        LinkedHashSet<Integer> keys = freqToKeys.get(minFreq);
        int evictKey = keys.iterator().next(); // oldest at minFreq
        keys.remove(evictKey);
        if (keys.isEmpty()) freqToKeys.remove(minFreq);
        keyToVal.remove(evictKey);
        keyToFreq.remove(evictKey);
    }
}
```

```javascript
// JavaScript: LFU Cache (LC 460)
class LFUCache {
    constructor(capacity) {
        this.cap = capacity;
        this.minFreq = 0;
        this.keyToVal   = new Map();
        this.keyToFreq  = new Map();
        this.freqToKeys = new Map(); // Map<freq, Set<key>> (insertion-ordered Set)
    }
    get(key) {
        if (!this.keyToVal.has(key)) return -1;
        this._updateFreq(key);
        return this.keyToVal.get(key);
    }
    put(key, value) {
        if (this.cap === 0) return;
        if (this.keyToVal.has(key)) {
            this.keyToVal.set(key, value);
            this._updateFreq(key);
        } else {
            if (this.keyToVal.size === this.cap) this._evict();
            this.keyToVal.set(key, value);
            this.keyToFreq.set(key, 1);
            if (!this.freqToKeys.has(1)) this.freqToKeys.set(1, new Set());
            this.freqToKeys.get(1).add(key);
            this.minFreq = 1;
        }
    }
    _updateFreq(key) {
        const f = this.keyToFreq.get(key);
        this.keyToFreq.set(key, f + 1);
        this.freqToKeys.get(f).delete(key);
        if (this.freqToKeys.get(f).size === 0) {
            this.freqToKeys.delete(f);
            if (this.minFreq === f) this.minFreq++;
        }
        if (!this.freqToKeys.has(f + 1)) this.freqToKeys.set(f + 1, new Set());
        this.freqToKeys.get(f + 1).add(key);
    }
    _evict() {
        const keys = this.freqToKeys.get(this.minFreq);
        const evictKey = keys.values().next().value; // oldest at minFreq
        keys.delete(evictKey);
        if (keys.size === 0) this.freqToKeys.delete(this.minFreq);
        this.keyToVal.delete(evictKey);
        this.keyToFreq.delete(evictKey);
    }
}
```

### Dry Run

`capacity=2`, operations: `put(1,1)`, `put(2,2)`, `get(1)`, `put(3,3)`:

| Operation | min_freq | key_to_val | key_to_freq | freq_to_keys | Return |
|-----------|----------|-----------|------------|--------------|--------|
| put(1,1) | 1 | {1→1} | {1→1} | {1→[1]} | — |
| put(2,2) | 1 | {1→1,2→2} | {1→1,2→1} | {1→[1,2]} | — |
| get(1) | 1 | {1→1,2→2} | {1→2,2→1} | {1→[2],2→[1]} | **1** |
| put(3,3) | 1 | {1→1,3→3} | {1→2,3→1} | {1→[3],2→[1]} | — (evicted key 2) |

### Complexity

- **Time:** O(1) per `get` and `put` — all HashMap and LinkedHashSet (insertion-ordered Set in JS) operations are O(1).
- **Space:** O(capacity) — each of the three maps holds at most `capacity` entries.

### Do Not Confuse With

| | LFU Cache | LRU Cache |
|---|---|---|
| **Eviction policy** | Evicts LEAST FREQUENTLY USED key | Evicts LEAST RECENTLY USED key |
| **Tie-breaking** | Among equal frequencies, evicts least recently used | N/A — recency is the only criterion |
| **Data structures** | 3 maps: key→val, key→freq, freq→keys | 1 HashMap + 1 Doubly Linked List |
| **Use when** | Popular (frequently accessed) items should be kept | Recently accessed items are likely to be reused |

### Experience Tip
**Experience Tip:** Most O(1) design problems use HashMap + LinkedList together. The HashMap gives fast lookup; the LinkedList gives ordered traversal or O(1) insertion/deletion at known positions. When you see "O(1) get and O(1) insert", think this combo immediately.

### LeetCode Practice
| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---|---|---|---|
| 146 | LRU Cache | Medium | HashMap + Doubly Linked List | https://leetcode.com/problems/lru-cache/ |
| 706 | Design HashMap | Easy | Array of buckets + linked list for collisions | https://leetcode.com/problems/design-hashmap/ |
| 705 | Design HashSet | Easy | Same as HashMap without values | https://leetcode.com/problems/design-hashset/ |
| 232 | Implement Queue using Stacks | Easy | Two stacks: inbox and outbox — amortized O(1) | https://leetcode.com/problems/implement-queue-using-stacks/ |
| 225 | Implement Stack using Queues | Easy | One queue, rotate elements on push | https://leetcode.com/problems/implement-stack-using-queues/ |
| 355 | Design Twitter | Medium | Heap for feed merge; HashMap for follow sets | https://leetcode.com/problems/design-twitter/ |

### One-Minute Revision
```
PATTERN:   Design Problems
USE WHEN:  "Design X", "Implement X" — multiple O(1) operations required
KEY STEP:  Identify ALL operations and their required complexity.
           O(1) lookup → HashMap. O(1) ordered access → LinkedList. Combine.
```

---

## 5. Common Interview Mistakes

### Mistake 1: Jumping to code without a plan
**Why it happens:** Nervousness. You recognize a pattern and want to prove it quickly.
**Why it hurts:** You miss edge cases, implement the wrong thing, and waste time debugging.
**Fix:** Spend the first 5-10 minutes on understanding + approach. Code should be the LAST step.

---

### Mistake 2: Not stating the brute force
**Why it happens:** You think skipping straight to optimal shows intelligence.
**Why it hurts:** The brute force confirms you understood the problem and gives a baseline to improve from.
**Fix:** Always say "The naive approach is... with O(?) complexity." Then optimize from there.

---

### Mistake 3: Silent coding
**Why it happens:** Concentrating on getting code right.
**Why it hurts:** The interviewer cannot evaluate your thinking. Silence looks like you are lost.
**Fix:** Narrate everything. "I'm using a HashMap here because I need O(1) lookup. I'll use the key as the value and..." Talk the entire time.

---

### Mistake 4: Ignoring edge cases until the very end
**Why it happens:** You are focused on the happy path.
**Why it hurts:** Edge cases often reveal a fundamental flaw in your approach — too late to fix if discovered after implementation.
**Fix:** Ask about edge cases BEFORE designing: "Can the array be empty? Negative values? All duplicates?"

---

### Mistake 5: Stubbornly debugging a fundamentally wrong approach
**Why it happens:** Sunk-cost fallacy. You have spent 10 minutes on this approach.
**Why it hurts:** You waste time and never recover.
**Fix:** After 5 minutes of trying, say: "I think this approach has a fundamental problem with X. Let me step back and reconsider." Pivoting gracefully is a POSITIVE signal.

---

### Mistake 6: Memorizing solutions instead of patterns
**Why it happens:** You grind LeetCode by reading solutions.
**Why it hurts:** Solutions do not transfer to new problems. Patterns do.
**Fix:** After each problem, write: "The PATTERN here is ___. USE WHEN: ___." Practice recognizing the pattern, not the problem.

---

### Mistake 7: Stating complexity incorrectly
**Why it happens:** Common misconceptions.

| Common Wrong Statement | Correct Statement |
|---|---|
| "HashMap lookup is O(1)" | O(1) average, O(n) worst case due to collisions |
| "Sorting is O(n)" | O(n log n) for comparison-based sort |
| "DFS on graph is O(n)" | O(V + E) — edges matter |
| "Binary search is O(n)" | O(log n) |
| "Monotonic stack is O(n²)" | O(n) amortized — each element pushed/popped once |

---

### Mistake 8: Not asking clarifying questions
**Why it happens:** You assume the input is "normal".
**Why it hurts:** You build a solution for the wrong problem.
**Fix:** Before coding, always ask: "Can the array be empty? Are there duplicates? Can values be negative? Can I modify the input?"

---

## Quick Reference Cheat Sheet

```
╔══════════════════════════════════════════════════════════════════════╗
║  CONSTRAINT → COMPLEXITY (memorize this)                             ║
║  n ≤ 20          → O(2^n)         Backtracking / Bitmask DP         ║
║  n ≤ 40          → O(2^(n/2))     Meet in the Middle                ║
║  n ≤ 500         → O(n³)          Interval DP                       ║
║  n ≤ 1,000       → O(n²)          Nested loops / simple DP          ║
║  n ≤ 100,000     → O(n log n)     Sort / Heap / Binary Search        ║
║  n ≤ 1,000,000   → O(n)           Two pointers / Sliding window      ║
║  n ≤ 10^9        → O(log n)       Binary search on answer            ║
╠══════════════════════════════════════════════════════════════════════╣
║  13-STEP FRAMEWORK                                                   ║
║  1.Understand  2.Structure  3.Constraints  4.Brute force             ║
║  5.Repeated work  6.Pattern  7.State  8.Transition                   ║
║  9.Dry run  10.Complexity  11.Edge cases  12.Implement  13.Optimize  ║
╠══════════════════════════════════════════════════════════════════════╣
║  META-PATTERNS                                                       ║
║  Stuck on forward?   → Reverse Thinking                             ║
║  Too complex?        → Add/Remove Constraint (solve K=1 first)      ║
║  "O(n²)?" on stack   → Amortized: each element pushed/popped once   ║
║  n in [30,40]?       → Meet in the Middle                           ║
╠══════════════════════════════════════════════════════════════════════╣
║  PRE-CODING CHECKLIST                                                ║
║  [ ] Restated the problem in my own words                           ║
║  [ ] Identified input structure                                      ║
║  [ ] Read constraint → stated target complexity                      ║
║  [ ] Stated brute force and its complexity                           ║
║  [ ] Identified pattern and explained why                            ║
║  [ ] Dry-ran on a small example                                     ║
║  [ ] Asked about edge cases                                          ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

*Return to [00-MASTER-INDEX.md](00-MASTER-INDEX.md) for the complete guide map.*
