# 🔁 Week 1: Recursion — Complete Master Notes

> **Goal**: Build unshakeable recursion intuition from scratch. After this, you'll SEE recursion patterns instantly in interviews.

---

## 📌 Table of Contents

1. [Basic Understanding](#1-basic-understanding)
2. [Recursive Stack Visualization](#2-recursive-stack-visualization)
3. [Head and Tail Recursion](#3-head-and-tail-recursion)
4. [Backtracking](#4-backtracking)
5. [Identifying Recursion Problems](#5-identifying-recursion-problems)
6. [Time Complexity Analysis](#6-time-complexity-analysis)
7. [LIVE Problem Solving Patterns](#7-live-problem-solving-patterns)

---

# 1. Basic Understanding

## 1.1 Concept Intuition (Real World Analogy)

### 🪞 The Mirror Analogy
Imagine standing between two mirrors facing each other. You see infinite reflections of yourself, each one smaller. That's recursion — **a function calling itself**, creating smaller versions of the same problem.

### 📦 The Russian Doll Analogy
Open a Russian doll → find a smaller doll inside → open that → find even smaller → keep going until you find the tiniest doll (base case). Then you close them back up in reverse order.

### 🎯 The Core Idea
```
Recursion = Breaking a BIG problem into SMALLER identical sub-problems
            + Solving the smallest version directly (base case)
            + Combining results back up
```

## 1.2 Core Theory (Simple Words)

### What is Recursion?
A function that calls itself to solve a smaller version of the same problem.

### Three Essential Parts of Every Recursive Function:

```
┌─────────────────────────────────────────────────────────────┐
│  1. BASE CASE      → When to STOP (prevents infinite loop)  │
│  2. RECURSIVE CASE → Call yourself with SMALLER input       │
│  3. PROGRESS       → Each call MUST move toward base case   │
├─────────────────────────────────────────────────────────────┤
│  Missing any of these = BROKEN RECURSION                    │
└─────────────────────────────────────────────────────────────┘
```

### Simplest Example: Factorial

```python
def factorial(n):
    # BASE CASE: smallest problem we can solve directly
    if n == 0 or n == 1:
        return 1
    
    # RECURSIVE CASE: break into smaller problem
    # PROGRESS: n-1 is smaller than n, moving toward base case
    return n * factorial(n - 1)
```

**Mental Trace for factorial(4):**
```
factorial(4) = 4 * factorial(3)
                   └── 3 * factorial(2)
                            └── 2 * factorial(1)
                                     └── 1 (BASE CASE HIT!)

Now bubble back up:
factorial(1) = 1
factorial(2) = 2 * 1 = 2
factorial(3) = 3 * 2 = 6
factorial(4) = 4 * 6 = 24 ✅
```

## 1.3 How Interviewers Think About It

Interviewers want to see:

| What They Check | What They Want to See |
|-----------------|----------------------|
| Base case identification | Can you find the stopping condition? |
| Recursive relation | Can you express big problem in terms of smaller? |
| Trust the recursion | Do you understand that if the smaller problem is solved, your solution works? |
| Edge cases | Empty input, single element, negative numbers |
| Complexity analysis | Can you analyze time/space of recursive solutions? |

### 🚨 Interviewer Red Flags:
- Writing code without clearly stating the base case first
- Not being able to trace through a simple example
- Saying "I don't understand how it works but it works"

## 1.4 The "Leap of Faith" Principle

> **This is the #1 mindset shift for mastering recursion.**

**DON'T** try to trace every recursive call in your head.

**DO** trust that if your function works for smaller inputs, it will work for larger inputs.

### Example: Sum of array
```python
def array_sum(arr, n):
    # Assume array_sum works correctly for n-1 elements
    # Then for n elements: answer = arr[n-1] + sum of first n-1 elements
    
    if n == 0:
        return 0
    return arr[n-1] + array_sum(arr, n-1)
```

**The Leap of Faith:**
- Assume `array_sum(arr, n-1)` correctly returns sum of first n-1 elements
- Then `arr[n-1] + array_sum(arr, n-1)` correctly returns sum of first n elements
- Base case ensures we stop
- **Done!** Don't trace further.

## 1.5 Common Mistakes (Beginners)

| Mistake | Why It's Wrong | Fix |
|---------|---------------|-----|
| No base case | Infinite recursion → Stack Overflow | Always write base case FIRST |
| Base case doesn't return | Function returns None | Every base case needs explicit return |
| Not progressing toward base case | Infinite recursion | Ensure input gets smaller each call |
| Modifying input incorrectly | Wrong results | Be careful with mutable objects (lists) |
| Over-thinking | Paralysis | Trust the leap of faith |

## 1.6 Mental Checklist for Any Recursion Problem

```
□ What is the SMALLEST valid input? (base case)
□ What should I return for that smallest input?
□ If I had the answer for a SMALLER problem, how do I use it?
□ Am I DEFINITELY making progress toward base case?
□ Did I handle ALL edge cases in base case?
```

---

# 2. Recursive Stack Visualization

## 2.1 Concept Intuition

### 🍽️ The Stack of Plates Analogy
Imagine a stack of plates in a cafeteria:
- You can only add a plate on TOP (push)
- You can only remove the TOP plate (pop)
- Last plate added = First plate removed (LIFO)

**Each recursive call = adding a plate**
**Each return = removing a plate**

## 2.2 Core Theory: The Call Stack

When a function calls itself:
1. Current function **PAUSES**
2. New function call is **PUSHED** onto the stack
3. New function executes
4. When new function returns, it's **POPPED** off
5. Previous function **RESUMES** from where it paused

### Visual: factorial(4) Call Stack

```
STEP 1: factorial(4) called
┌─────────────────┐
│ factorial(4)    │ ← Currently executing
│ n = 4           │
│ waiting for     │
│ factorial(3)    │
└─────────────────┘

STEP 2: factorial(3) called
┌─────────────────┐
│ factorial(3)    │ ← Currently executing
│ n = 3           │
├─────────────────┤
│ factorial(4)    │ ← PAUSED, waiting
│ n = 4           │
└─────────────────┘

STEP 3: factorial(2) called
┌─────────────────┐
│ factorial(2)    │ ← Currently executing
│ n = 2           │
├─────────────────┤
│ factorial(3)    │ ← PAUSED
├─────────────────┤
│ factorial(4)    │ ← PAUSED
└─────────────────┘

STEP 4: factorial(1) called — BASE CASE!
┌─────────────────┐
│ factorial(1)    │ ← Returns 1
│ n = 1           │
├─────────────────┤
│ factorial(2)    │
├─────────────────┤
│ factorial(3)    │
├─────────────────┤
│ factorial(4)    │
└─────────────────┘

STEP 5: Unwinding begins
┌─────────────────┐
│ factorial(2)    │ ← Resumes: 2 * 1 = 2, returns 2
├─────────────────┤
│ factorial(3)    │
├─────────────────┤
│ factorial(4)    │
└─────────────────┘

STEP 6:
┌─────────────────┐
│ factorial(3)    │ ← Resumes: 3 * 2 = 6, returns 6
├─────────────────┤
│ factorial(4)    │
└─────────────────┘

STEP 7:
┌─────────────────┐
│ factorial(4)    │ ← Resumes: 4 * 6 = 24, returns 24
└─────────────────┘

STEP 8: Stack empty, final answer = 24 ✅
```

## 2.3 Stack Frame Contents

Each stack frame stores:
```
┌──────────────────────────────┐
│ 1. Function parameters       │
│ 2. Local variables           │
│ 3. Return address            │
│    (where to resume after    │
│     this call returns)       │
└──────────────────────────────┘
```

## 2.4 Why Stack Visualization Matters

### For Debugging:
- Stack Overflow = Too many calls = Missing/wrong base case
- Wrong answer = Something wrong in how values pass up/down

### For Complexity:
- **Space Complexity = Maximum stack depth**
- For `factorial(n)`: space = O(n) because n frames on stack

### For Interviews:
- Interviewers LOVE asking: "Walk me through the stack for input X"
- If you can visualize, you can debug

## 2.5 Pro Trick: Drawing Stack on Whiteboard

```
Input: factorial(3)

Going DOWN (calls):          Going UP (returns):
                             
f(3) ──┐                     f(3) ←── 6 (3*2)
       │                            ↑
       ▼                            │
     f(2) ──┐                     f(2) ←── 2 (2*1)
            │                          ↑
            ▼                          │
          f(1) ── returns 1 ─────────►┘
```

## 2.6 Stack Overflow: When Things Go Wrong

```python
# BROKEN: No base case
def infinite(n):
    return infinite(n - 1)  # Never stops!

# BROKEN: Wrong direction
def wrong_direction(n):
    if n == 0:
        return 0
    return wrong_direction(n + 1)  # n grows, never reaches 0!
```

**Stack Overflow** = Stack grows beyond memory limit (typically ~1000-10000 calls in Python)

---

# 3. Head and Tail Recursion

## 3.1 Concept Intuition

### 🎭 Two Personalities of Recursion

**Head Recursion**: "I'll figure out my part AFTER I see what my smaller self does"
- Work happens AFTER recursive call returns

**Tail Recursion**: "I'll do my work FIRST, then hand off to my smaller self"
- Work happens BEFORE recursive call
- Nothing to do after recursive call returns

## 3.2 Core Theory

### Head Recursion
```python
def head_factorial(n):
    if n == 0:
        return 1
    
    # FIRST: Make recursive call
    smaller_result = head_factorial(n - 1)
    # THEN: Do work with the result
    return n * smaller_result
```

**Characteristics:**
- Recursive call happens FIRST
- Computation happens AFTER call returns
- Must wait for all calls to finish before computing
- Stack must remember all intermediate states

### Tail Recursion
```python
def tail_factorial(n, accumulator=1):
    if n == 0:
        return accumulator
    
    # Do work FIRST (multiply into accumulator)
    # THEN: Make recursive call as the LAST thing
    return tail_factorial(n - 1, n * accumulator)
```

**Characteristics:**
- All computation done BEFORE recursive call
- Recursive call is the LAST operation
- Nothing to do after call returns
- Result passes DOWN through parameters

## 3.3 Visual Comparison

### Head Recursion: factorial(4)
```
GOING DOWN:                  COMING BACK UP:
f(4)                         f(4): 4 * 6 = 24 ← WORK HERE
  └─► f(3)                   f(3): 3 * 2 = 6  ← WORK HERE
        └─► f(2)             f(2): 2 * 1 = 2  ← WORK HERE
              └─► f(1)       f(1): 1 * 1 = 1  ← WORK HERE
                    └─► f(0) = 1 (base)
```
**Work happens on the way UP**

### Tail Recursion: factorial(4, 1)
```
GOING DOWN (work happens here):
f(4, 1)    → 4 * 1 = 4, pass down
  └─► f(3, 4)    → 3 * 4 = 12, pass down
        └─► f(2, 12)   → 2 * 12 = 24, pass down
              └─► f(1, 24)  → 1 * 24 = 24, pass down
                    └─► f(0, 24) = 24 (base, just return)

COMING BACK UP: Nothing to do, just return 24
```
**Work happens on the way DOWN**

## 3.4 Why Tail Recursion Matters

### Tail Call Optimization (TCO)

Some languages (Scheme, Scala, certain compilers) can OPTIMIZE tail recursion:
- Since nothing happens after the recursive call, no need to keep stack frame
- Compiler can REUSE the same stack frame
- **O(n) space → O(1) space!**

```
Without TCO:          With TCO:
┌─────┐               ┌─────┐
│ f(3)│               │ f(3)│ → reused for f(2) → reused for f(1)...
├─────┤               └─────┘
│ f(2)│               Only 1 frame ever!
├─────┤
│ f(1)│
└─────┘
```

### ⚠️ Python Does NOT Have TCO
Python intentionally doesn't optimize tail recursion (for better stack traces).
But understanding tail recursion helps you:
1. Convert to iteration easily
2. Write better code in languages that DO have TCO
3. Understand the concept for interviews

## 3.5 Converting Head to Tail Recursion

**Pattern**: Move computation INTO an accumulator parameter

### Example: Sum of 1 to n

**Head Version:**
```python
def sum_head(n):
    if n == 0:
        return 0
    return n + sum_head(n - 1)  # Work after recursive call
```

**Tail Version:**
```python
def sum_tail(n, acc=0):
    if n == 0:
        return acc
    return sum_tail(n - 1, acc + n)  # Work before, call is last
```

### Example: Reverse a list

**Head Version:**
```python
def reverse_head(lst):
    if len(lst) <= 1:
        return lst
    return reverse_head(lst[1:]) + [lst[0]]  # Concatenation after
```

**Tail Version:**
```python
def reverse_tail(lst, acc=[]):
    if len(lst) == 0:
        return acc
    return reverse_tail(lst[1:], [lst[0]] + acc)  # Work in acc
```

## 3.6 Interview Insight

**Q: "Can you convert this to tail recursion?"**

**Strategy:**
1. Identify what work happens AFTER recursive call
2. Create an accumulator parameter to carry that work
3. Do the work BEFORE the recursive call
4. Pass result in accumulator

## 3.7 Mental Checklist

```
□ Is the recursive call the LAST thing in the function?
□ Is there ANY operation after the recursive call returns?
   - If yes → Head recursion
   - If no  → Tail recursion
□ Can I add an accumulator to make it tail recursive?
```

---

# 4. Backtracking

## 4.1 Concept Intuition

### 🗺️ The Maze Analogy
You're in a maze trying to find the exit:
1. At each junction, pick a path
2. Walk down that path
3. Hit a dead end? **BACKTRACK** to the last junction
4. Try a different path
5. Repeat until you find the exit or exhaust all paths

### 🌳 The Decision Tree
Every backtracking problem is exploring a tree of decisions:
```
                    START
                   /  |  \
                 A    B    C      ← Choose first item
                /|\  /|\  /|\
               ...  ...  ...      ← Choose second item
              
Each path = one possible solution
Backtracking = DFS on this decision tree
```

## 4.2 Core Theory

### What is Backtracking?
**Backtracking = Recursion + Undo**

It's an algorithmic technique for finding ALL (or some) solutions by:
1. Building solutions incrementally
2. Abandoning a path as soon as it CAN'T lead to a valid solution
3. "Undoing" the last choice and trying alternatives

### The Template (MEMORIZE THIS!)

```python
def backtrack(current_state, choices):
    # BASE CASE: Is current_state a complete solution?
    if is_solution(current_state):
        save_or_process(current_state)
        return
    
    # Try each available choice
    for choice in choices:
        # CONSTRAINT: Can we make this choice?
        if is_valid(choice, current_state):
            # MAKE the choice
            make_choice(current_state, choice)
            
            # RECURSE with updated state
            backtrack(current_state, updated_choices)
            
            # UNDO the choice (BACKTRACK!)
            undo_choice(current_state, choice)
```

### Key Components:

| Component | Purpose |
|-----------|---------|
| `current_state` | What we've built so far |
| `choices` | What options we can pick next |
| `is_solution()` | Have we found a complete answer? |
| `is_valid()` | Can we make this choice? (pruning) |
| `make_choice()` | Add choice to current state |
| `undo_choice()` | Remove choice (backtrack) |

## 4.3 Classic Example: Generate All Subsets

```python
def subsets(nums):
    result = []
    
    def backtrack(start, current):
        # Every state is a valid subset
        result.append(current[:])  # Save a copy
        
        for i in range(start, len(nums)):
            # MAKE choice: include nums[i]
            current.append(nums[i])
            
            # RECURSE: consider elements after i
            backtrack(i + 1, current)
            
            # UNDO choice: exclude nums[i]
            current.pop()
    
    backtrack(0, [])
    return result

# subsets([1,2,3]) → [[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]
```

### Visual Decision Tree for [1,2,3]:
```
                        []
            /           |           \
          [1]          [2]          [3]
         /   \          |
      [1,2]  [1,3]    [2,3]
        |
     [1,2,3]
```

## 4.4 Classic Example: N-Queens

Place N queens on N×N board so no two attack each other.

```python
def solve_n_queens(n):
    result = []
    board = [['.'] * n for _ in range(n)]
    
    def is_safe(row, col):
        # Check column above
        for i in range(row):
            if board[i][col] == 'Q':
                return False
        
        # Check upper-left diagonal
        i, j = row - 1, col - 1
        while i >= 0 and j >= 0:
            if board[i][j] == 'Q':
                return False
            i -= 1
            j -= 1
        
        # Check upper-right diagonal
        i, j = row - 1, col + 1
        while i >= 0 and j < n:
            if board[i][j] == 'Q':
                return False
            i -= 1
            j += 1
        
        return True
    
    def backtrack(row):
        # BASE: All queens placed
        if row == n:
            result.append([''.join(r) for r in board])
            return
        
        for col in range(n):
            if is_safe(row, col):
                # MAKE choice
                board[row][col] = 'Q'
                
                # RECURSE to next row
                backtrack(row + 1)
                
                # UNDO choice
                board[row][col] = '.'
    
    backtrack(0)
    return result
```

## 4.5 Backtracking vs Plain Recursion

| Aspect | Plain Recursion | Backtracking |
|--------|-----------------|--------------|
| Purpose | Compute single result | Find all/some solutions |
| State | Usually immutable | Mutable, modified & restored |
| Key Operation | Just recurse | Recurse + UNDO |
| Pruning | Usually no | Essential for efficiency |

## 4.6 Pro Tricks for Backtracking

### 1. State Representation Matters
```python
# SLOW: Creating new lists
backtrack(path + [choice])  # Creates copy each time

# FAST: Modify in place + undo
path.append(choice)
backtrack(path)
path.pop()  # Undo
```

### 2. Pruning is Everything
Bad pruning = exploring useless branches = TLE

```python
# WITHOUT pruning: checks everything
for choice in choices:
    make_choice()
    backtrack()
    undo_choice()

# WITH pruning: skip invalid branches early
for choice in choices:
    if not is_valid(choice):  # PRUNE!
        continue
    make_choice()
    backtrack()
    undo_choice()
```

### 3. Use Sets for O(1) Constraint Checking
```python
# N-Queens optimization
cols = set()      # columns with queens
diag1 = set()     # main diagonals (row - col)
diag2 = set()     # anti diagonals (row + col)

def is_safe(row, col):
    return col not in cols and \
           (row - col) not in diag1 and \
           (row + col) not in diag2
```

## 4.7 Common Backtracking Problems

| Problem | Choices | Constraint |
|---------|---------|------------|
| Subsets | Include/exclude each element | None |
| Permutations | Which element next | Not already used |
| Combinations | Which elements to pick | Count = k |
| N-Queens | Which column for this row | Not attacking |
| Sudoku | Which digit for this cell | Row/col/box valid |
| Word Search | Which direction to go | Matches next char |
| Palindrome Partitioning | Where to cut | Each part palindrome |

## 4.8 Mental Checklist for Backtracking

```
□ What is my STATE? (what am I building?)
□ What are my CHOICES at each step?
□ What are my CONSTRAINTS? (when is a choice invalid?)
□ When is a state a COMPLETE SOLUTION?
□ How do I UNDO a choice?
□ What can I PRUNE to avoid useless work?
```

---

# 5. Identifying Recursion Problems

## 5.1 The Golden Question

> **"Can I solve this problem by solving smaller versions of the SAME problem?"**

If YES → Recursion is likely a good fit.

## 5.2 Pattern Recognition: When to Use Recursion

### Pattern 1: The Problem Has Natural Sub-Structure

**Signal words in problem:**
- "subarray", "substring", "subset"
- "left subtree", "right subtree"
- "first half", "second half"
- "remaining elements"

**Examples:**
- Binary search → search left half OR right half
- Merge sort → sort left half, sort right half, merge
- Tree traversals → process left, process right

### Pattern 2: Choices Lead to Branching

**Signal:**
- At each step, you have multiple choices
- Each choice leads to a different sub-problem
- Need to explore all/some paths

**Examples:**
- Generate permutations → pick each unused element
- N-Queens → try each column
- Maze solving → try each direction

### Pattern 3: The Problem is Defined Recursively

**Signal:**
- Mathematical definition is recursive
- "The nth term depends on previous terms"

**Examples:**
- Fibonacci: F(n) = F(n-1) + F(n-2)
- Factorial: n! = n × (n-1)!
- Tree height: 1 + max(left_height, right_height)

### Pattern 4: Data Structure is Recursive

**Signal:**
- Working with trees, graphs, linked lists
- Nested structures (JSON, XML, file systems)

**Examples:**
- Tree problems → recurse on children
- Linked list → recurse on next node
- Nested arrays → recurse on inner arrays

### Pattern 5: "Find All" or "Count All"

**Signal:**
- Find all combinations/permutations/paths
- Count ways to do something

**Examples:**
- All paths from root to leaf
- All valid parentheses combinations
- Number of ways to climb stairs

## 5.3 Decision Flowchart

```
                    ┌─────────────────────────────┐
                    │ Can problem be broken into  │
                    │ SMALLER IDENTICAL problems? │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                   YES                           NO
                    │                             │
                    ▼                             ▼
        ┌───────────────────┐         ┌──────────────────────┐
        │ Is there a clear  │         │ Consider iteration,  │
        │ BASE CASE?        │         │ DP, greedy, etc.     │
        └─────────┬─────────┘         └──────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
       YES                 NO
        │                   │
        ▼                   ▼
   ┌──────────┐    ┌────────────────────┐
   │ USE      │    │ Find the smallest  │
   │ RECURSION│    │ input that's       │
   └──────────┘    │ trivially solvable │
                   └────────────────────┘
```

## 5.4 Anti-Patterns: When NOT to Use Recursion

### ❌ Don't Use Recursion When:

1. **Simple iteration works**
   - Summing an array → use a loop
   - Linear search → use a loop

2. **Recursion depth could be huge**
   - If n could be 10^6, recursion will stack overflow
   - Convert to iteration

3. **Same subproblems solved repeatedly**
   - Naive recursive Fibonacci is O(2^n)
   - Use memoization (DP) instead

4. **Order matters strictly**
   - Processing items must be in exact order
   - Iteration is clearer

## 5.5 Recursion vs Iteration Decision

| Use Recursion | Use Iteration |
|---------------|---------------|
| Tree/graph traversal | Simple loops |
| Divide & conquer | Linear processing |
| Backtracking/search | When stack depth is concerning |
| When code is cleaner recursive | When performance is critical |
| Exploring branching paths | Sequential operations |

## 5.6 Interview Pro Tip

**When you see a recursion-suitable problem:**

1. **First, state the recurrence relation in words:**
   > "The answer for n elements = [something with] answer for n-1 elements"

2. **Then identify base case:**
   > "When input is empty/single element, answer is X"

3. **Only then write code**

This shows clear thinking and impresses interviewers.

---

# 6. Time Complexity Analysis

## 6.1 Concept Intuition

### 🌳 Think of Recursion as a Tree

Every recursive function creates a "recursion tree":
- **Root** = initial call
- **Children** = recursive calls made
- **Leaves** = base cases

```
Total Work = (Work per node) × (Number of nodes)
```

## 6.2 Core Method: The Recursion Tree

### Example 1: Factorial
```
factorial(4)
    └── factorial(3)
            └── factorial(2)
                    └── factorial(1)
                            └── factorial(0) ← base
```

**Analysis:**
- Each call does O(1) work (just one multiplication)
- Number of calls = n + 1
- **Total: O(n)**

### Example 2: Fibonacci (Naive)
```python
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)
```

```
                    fib(5)
                   /      \
              fib(4)      fib(3)
             /    \       /    \
         fib(3) fib(2) fib(2) fib(1)
         /   \
     fib(2) fib(1)
```

**Analysis:**
- Each call does O(1) work
- Tree has height n
- Each level roughly doubles (branching factor ~2)
- Number of nodes ≈ 2^n
- **Total: O(2^n)** — This is why naive Fibonacci is terrible!

## 6.3 The Master Theorem (Simplified)

For recurrences of form: **T(n) = aT(n/b) + O(n^d)**

Where:
- a = number of recursive calls
- n/b = size of each subproblem
- O(n^d) = work done outside recursive calls

| Condition | Time Complexity |
|-----------|-----------------|
| a < b^d | O(n^d) |
| a = b^d | O(n^d log n) |
| a > b^d | O(n^(log_b(a))) |

### Common Examples:

| Algorithm | Recurrence | Result |
|-----------|------------|--------|
| Binary Search | T(n) = T(n/2) + O(1) | O(log n) |
| Merge Sort | T(n) = 2T(n/2) + O(n) | O(n log n) |
| Linear Recursion | T(n) = T(n-1) + O(1) | O(n) |
| Fibonacci (naive) | T(n) = T(n-1) + T(n-2) | O(2^n) |

## 6.4 Space Complexity: The Stack

### Rule: Space = Maximum Recursion Depth

```python
def factorial(n):       # Depth = n → O(n) space
    if n == 0: return 1
    return n * factorial(n-1)

def binary_search(arr, target, lo, hi):  # Depth = log n → O(log n) space
    if lo > hi: return -1
    mid = (lo + hi) // 2
    if arr[mid] == target: return mid
    if arr[mid] < target: return binary_search(arr, target, mid+1, hi)
    return binary_search(arr, target, lo, mid-1)
```

### Space for Different Patterns:

| Pattern | Max Depth | Space |
|---------|-----------|-------|
| Linear (n-1 each time) | n | O(n) |
| Binary (n/2 each time) | log n | O(log n) |
| Branching (2 calls, n-1 each) | n | O(n) |

**Note for branching:** Even though there are 2^n total calls, the MAXIMUM depth at any time is n (one path from root to leaf).

## 6.5 Complexity Intuition Shortcuts

### Quick Rules:

| Pattern | Time | Space |
|---------|------|-------|
| Single call, subtract 1 | O(n) | O(n) |
| Single call, divide by 2 | O(log n) | O(log n) |
| Two calls, subtract 1 each | O(2^n) | O(n) |
| Two calls, divide by 2 each | O(n) | O(log n) |
| k choices at each of n levels | O(k^n) | O(n) |

### Backtracking Complexity:

Generating all subsets of n elements:
- 2 choices per element (include/exclude)
- n elements
- **Time: O(2^n)**

Generating all permutations of n elements:
- n! total permutations
- **Time: O(n!)**

## 6.6 Pro Trick: Counting Nodes in Recursion Tree

If you can't use Master Theorem:

1. **Draw a few levels of the tree**
2. **Count nodes at each level**
3. **Sum across all levels**

```
Level 0:  1 node
Level 1:  2 nodes
Level 2:  4 nodes
...
Level k:  2^k nodes

If tree has height h:
Total = 1 + 2 + 4 + ... + 2^h = 2^(h+1) - 1 = O(2^h)
```

## 6.7 Interview Complexity Questions

**Q: What's the time complexity of this recursive function?**

**Your approach:**
1. How many times is the function called? (count nodes in tree)
2. What work does each call do? (excluding recursive calls)
3. Multiply them.

**Q: What's the space complexity?**

**Your approach:**
1. What's the maximum depth of recursion?
2. How much space does each call use?
3. Max depth × space per call.

---

# 7. LIVE Problem Solving Patterns

## 7.1 Pattern 1: Linear Recursion

### Template:
```python
def linear_recursion(input, index):
    # Base case
    if index == len(input):  # or index < 0
        return base_value
    
    # Process current element
    current_result = process(input[index])
    
    # Recurse on rest
    rest_result = linear_recursion(input, index + 1)
    
    # Combine
    return combine(current_result, rest_result)
```

### Example: Sum of Array
```python
def array_sum(arr, i=0):
    if i == len(arr):
        return 0
    return arr[i] + array_sum(arr, i + 1)
```

### Example: Check if Array is Sorted
```python
def is_sorted(arr, i=0):
    if i >= len(arr) - 1:
        return True
    if arr[i] > arr[i + 1]:
        return False
    return is_sorted(arr, i + 1)
```

**Time: O(n), Space: O(n)**

---

## 7.2 Pattern 2: Divide and Conquer

### Template:
```python
def divide_conquer(input, lo, hi):
    # Base case
    if lo >= hi:
        return base_value
    
    # Divide
    mid = (lo + hi) // 2
    
    # Conquer (recurse on halves)
    left_result = divide_conquer(input, lo, mid)
    right_result = divide_conquer(input, mid + 1, hi)
    
    # Combine
    return merge(left_result, right_result)
```

### Example: Merge Sort
```python
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
```

### Example: Maximum Subarray (Divide & Conquer)
```python
def max_crossing_sum(arr, lo, mid, hi):
    # Max sum including mid going left
    left_sum = float('-inf')
    curr_sum = 0
    for i in range(mid, lo - 1, -1):
        curr_sum += arr[i]
        left_sum = max(left_sum, curr_sum)
    
    # Max sum including mid+1 going right
    right_sum = float('-inf')
    curr_sum = 0
    for i in range(mid + 1, hi + 1):
        curr_sum += arr[i]
        right_sum = max(right_sum, curr_sum)
    
    return left_sum + right_sum

def max_subarray(arr, lo, hi):
    if lo == hi:
        return arr[lo]
    
    mid = (lo + hi) // 2
    
    left_max = max_subarray(arr, lo, mid)
    right_max = max_subarray(arr, mid + 1, hi)
    cross_max = max_crossing_sum(arr, lo, mid, hi)
    
    return max(left_max, right_max, cross_max)
```

**Time: O(n log n), Space: O(log n)**

---

## 7.3 Pattern 3: Tree Recursion

### Template:
```python
def tree_recursion(node):
    # Base case
    if node is None:
        return base_value
    
    # Recurse on children
    left_result = tree_recursion(node.left)
    right_result = tree_recursion(node.right)
    
    # Combine with current node
    return combine(node.val, left_result, right_result)
```

### Example: Tree Height
```python
def tree_height(root):
    if root is None:
        return 0
    
    left_height = tree_height(root.left)
    right_height = tree_height(root.right)
    
    return 1 + max(left_height, right_height)
```

### Example: Check if Tree is Balanced
```python
def is_balanced(root):
    def check(node):
        if node is None:
            return 0  # height
        
        left_h = check(node.left)
        if left_h == -1:
            return -1
        
        right_h = check(node.right)
        if right_h == -1:
            return -1
        
        if abs(left_h - right_h) > 1:
            return -1
        
        return 1 + max(left_h, right_h)
    
    return check(root) != -1
```

**Time: O(n), Space: O(h) where h = tree height**

---

## 7.4 Pattern 4: Subsets/Combinations (Backtracking)

### Template:
```python
def generate_subsets(nums):
    result = []
    
    def backtrack(start, current):
        result.append(current[:])
        
        for i in range(start, len(nums)):
            current.append(nums[i])
            backtrack(i + 1, current)
            current.pop()
    
    backtrack(0, [])
    return result
```

### Example: Combinations of size k
```python
def combinations(n, k):
    result = []
    
    def backtrack(start, current):
        if len(current) == k:
            result.append(current[:])
            return
        
        # Pruning: if not enough elements left, stop
        if len(current) + (n - start + 1) < k:
            return
        
        for i in range(start, n + 1):
            current.append(i)
            backtrack(i + 1, current)
            current.pop()
    
    backtrack(1, [])
    return result
```

**Time: O(2^n) for subsets, O(C(n,k)) for combinations**

---

## 7.5 Pattern 5: Permutations (Backtracking)

### Template:
```python
def permutations(nums):
    result = []
    used = [False] * len(nums)
    
    def backtrack(current):
        if len(current) == len(nums):
            result.append(current[:])
            return
        
        for i in range(len(nums)):
            if used[i]:
                continue
            
            used[i] = True
            current.append(nums[i])
            backtrack(current)
            current.pop()
            used[i] = False
    
    backtrack([])
    return result
```

### Example: Permutations with Duplicates
```python
def permutations_unique(nums):
    result = []
    nums.sort()  # Important for handling duplicates
    used = [False] * len(nums)
    
    def backtrack(current):
        if len(current) == len(nums):
            result.append(current[:])
            return
        
        for i in range(len(nums)):
            if used[i]:
                continue
            # Skip duplicate: same value as previous AND previous not used
            if i > 0 and nums[i] == nums[i-1] and not used[i-1]:
                continue
            
            used[i] = True
            current.append(nums[i])
            backtrack(current)
            current.pop()
            used[i] = False
    
    backtrack([])
    return result
```

**Time: O(n!), Space: O(n)**

---

## 7.6 Pattern 6: Path Finding (Grid/Graph)

### Template for Grid:
```python
def find_paths(grid):
    rows, cols = len(grid), len(grid[0])
    result = []
    
    def backtrack(r, c, path):
        # Base case: reached destination
        if r == rows - 1 and c == cols - 1:
            result.append(path[:])
            return
        
        # Mark visited
        temp = grid[r][c]
        grid[r][c] = '#'
        
        # Try all 4 directions
        directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != '#':
                path.append((nr, nc))
                backtrack(nr, nc, path)
                path.pop()
        
        # Unmark visited
        grid[r][c] = temp
    
    backtrack(0, 0, [(0, 0)])
    return result
```

---

## 7.7 Pattern 7: String Recursion

### Template:
```python
def string_recursion(s, index):
    if index == len(s):
        return base_value
    
    # Process current character
    char = s[index]
    
    # Recurse on rest
    rest_result = string_recursion(s, index + 1)
    
    # Combine
    return combine(char, rest_result)
```

### Example: Generate All Substrings
```python
def all_substrings(s):
    result = []
    
    def generate(start, end):
        if start == len(s):
            return
        if end > len(s):
            generate(start + 1, start + 2)
            return
        
        result.append(s[start:end])
        generate(start, end + 1)
    
    generate(0, 1)
    return result
```

### Example: Palindrome Partitioning
```python
def partition(s):
    result = []
    
    def is_palindrome(sub):
        return sub == sub[::-1]
    
    def backtrack(start, current):
        if start == len(s):
            result.append(current[:])
            return
        
        for end in range(start + 1, len(s) + 1):
            substring = s[start:end]
            if is_palindrome(substring):
                current.append(substring)
                backtrack(end, current)
                current.pop()
    
    backtrack(0, [])
    return result
```

---

## 7.8 Master Problem-Solving Checklist

```
□ UNDERSTAND THE PROBLEM
  □ What is the input?
  □ What is the expected output?
  □ What are the constraints?

□ IDENTIFY THE PATTERN
  □ Is it linear recursion?
  □ Is it divide and conquer?
  □ Is it tree recursion?
  □ Is it backtracking?
  □ Does it need memoization?

□ DEFINE THE RECURSION
  □ What is the base case?
  □ What is the recursive relation?
  □ Am I making progress toward base case?

□ WRITE THE CODE
  □ Base case first
  □ Recursive case
  □ Handle edge cases

□ ANALYZE COMPLEXITY
  □ Time: How many calls × work per call?
  □ Space: Max recursion depth

□ TEST
  □ Trace through a small example
  □ Check edge cases: empty, single element, large
```

---

# 📋 Quick Reference Card

## The 5 Rules of Recursion

1. **BASE CASE** — Always have one (or more)
2. **PROGRESS** — Always move toward base case
3. **TRUST** — Believe smaller calls work correctly
4. **RETURN** — Always return something
5. **UNDO** — In backtracking, always undo your changes

## Complexity Quick Guide

| Pattern | Time | Space |
|---------|------|-------|
| Linear (subtract 1) | O(n) | O(n) |
| Binary (divide by 2) | O(log n) | O(log n) |
| Two branches (subtract 1) | O(2^n) | O(n) |
| Generate subsets | O(2^n) | O(n) |
| Generate permutations | O(n!) | O(n) |

## Backtracking Template

```python
def backtrack(state):
    if is_complete(state):
        save(state)
        return
    
    for choice in choices:
        if is_valid(choice):
            make(choice)
            backtrack(state)
            undo(choice)
```

---

**🎯 You're now equipped with everything you need to tackle recursion in FAANG interviews!**

Practice these patterns, understand the WHY behind each technique, and you'll see recursion problems as simple, structured puzzles.

---

*End of Week 1: Recursion Complete Notes*
