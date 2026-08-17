# 💎 Week 2: Dynamic Programming — Complete Master Notes

> **Goal**: Transform you from someone who "doesn't get DP" to someone who SEES DP patterns instantly and solves them with confidence.

---

## 📌 Table of Contents

1. [Dynamic Programming Basics](#1-dynamic-programming-basics)
2. [Recursion to DP (Top-Down / Memoization)](#2-recursion-to-dp-top-down--memoization)
3. [Iterative DP (Bottom-Up)](#3-iterative-dp-bottom-up)
4. [Space Optimization Techniques](#4-space-optimization-techniques)
5. [Time Complexity Analysis](#5-time-complexity-analysis)
6. [LIVE Problem Solving Patterns](#6-live-problem-solving-patterns)

---

# 1. Dynamic Programming Basics

## 1.1 Concept Intuition (Real World Analogy)

### 📝 The Homework Analogy
Imagine solving math homework with 50 similar problems:

**Without DP (Naive Approach):**
- Problem 1: Solve from scratch (takes 5 minutes)
- Problem 2: Solve from scratch (takes 5 minutes)
- Problem 3: Solve from scratch (takes 5 minutes)
- ...you solve the SAME sub-problems over and over

**With DP (Smart Approach):**
- Problem 1: Solve from scratch (5 minutes), write answer in notebook
- Problem 2: Uses answer from Problem 1, just plug it in (30 seconds)
- Problem 3: Uses answers from 1 & 2 (30 seconds)
- Total time: Way less!

### 🏗️ The Construction Analogy
Building a skyscraper floor by floor:
- You don't rebuild floor 1 when building floor 2
- Floor 2 uses (depends on) floor 1
- Floor 3 uses floors 1 and 2
- Each floor builds on previous floors (optimal substructure)
- You never rebuild completed floors (store solutions)

### 🎯 The Core Idea
```
Dynamic Programming = Smart Recursion
                    = Recursion + Memory (Memoization)
                    = Solving each sub-problem ONCE
                    = Storing results to avoid re-computation
```

## 1.2 Core Theory (Simple Words)

### What is Dynamic Programming?

**DP is an optimization technique** that:
1. Breaks problems into smaller overlapping sub-problems
2. Solves each sub-problem ONCE
3. Stores the result
4. Reuses stored results instead of re-computing

### Two Key Properties Required for DP:

```
┌──────────────────────────────────────────────────────────────┐
│  1. OPTIMAL SUBSTRUCTURE                                     │
│     → Optimal solution contains optimal solutions to         │
│       sub-problems                                           │
│     → If you know best way to do smaller problems,          │
│       you can build best way to do bigger problem           │
├──────────────────────────────────────────────────────────────┤
│  2. OVERLAPPING SUBPROBLEMS                                  │
│     → Same sub-problems are solved multiple times           │
│     → (If each sub-problem is unique, DP won't help)        │
└──────────────────────────────────────────────────────────────┘
```

### Why Plain Recursion Fails: Fibonacci Example

```python
def fib_recursive(n):
    if n <= 1:
        return n
    return fib_recursive(n-1) + fib_recursive(n-2)
```

**Call tree for fib(5):**
```
                        fib(5)
                       /      \
                   fib(4)      fib(3)
                  /     \      /     \
              fib(3)  fib(2) fib(2) fib(1)
             /    \    /   \   /   \
         fib(2) fib(1) f(1) f(0) f(1) f(0)
         /   \
     fib(1) fib(0)
```

**Notice:**
- `fib(3)` computed 2 times
- `fib(2)` computed 3 times
- `fib(1)` computed 5 times
- **Massive waste!**

**Complexity: O(2^n)** — grows exponentially!

For `fib(50)`, you'd make **1,125,899,906,842,624** calls! 💥

## 1.3 DP vs Divide & Conquer

| Aspect | Divide & Conquer | Dynamic Programming |
|--------|------------------|---------------------|
| Sub-problems | Independent | Overlapping |
| Recalculation | Each unique | Same ones multiple times |
| Storage | Not needed | Required (memoization) |
| Examples | Merge Sort, Binary Search | Fibonacci, Knapsack |
| When to use | No repeated work | Repeated work |

## 1.4 How Interviewers Think About DP

### What They Look For:

| Stage | What They Want to See |
|-------|----------------------|
| Recognition | Can you identify this is a DP problem? |
| Recurrence | Can you define the recursive relation? |
| Base Cases | Did you identify all base cases correctly? |
| Optimization | Can you go from recursion → memoization → tabulation? |
| Space Optimization | Can you reduce space further? |
| Complexity | Can you analyze time and space? |

### 🚨 Interviewer Red Flags:
- Jumping to code without stating the recurrence relation
- Not recognizing overlapping sub-problems
- Unable to explain WHY your DP solution works
- Not discussing trade-offs between approaches

## 1.5 The Golden Recognition Pattern

> **How to know a problem needs DP?**

Ask yourself these questions:

```
□ Can I break this into smaller sub-problems?
□ Do these sub-problems overlap (same computation repeated)?
□ Can I express solution in terms of solutions to smaller problems?
□ Am I counting something or optimizing something?
```

### Signal Words That Scream "DP!":
- "Find the **maximum/minimum**..."
- "How many **ways** to..."
- "Is it **possible** to..."
- "Find the **longest/shortest**..."
- "**Optimize** something with constraints"

### Problem Types That Often Use DP:
1. **Counting problems** (number of ways)
2. **Optimization problems** (min/max)
3. **Yes/No problems** (is it possible)
4. **Subsequence/substring** problems
5. **Partitioning** problems
6. **Game theory** problems

## 1.6 The DP Problem-Solving Framework

```
STEP 1: DEFINE THE STATE
        → What information do I need to solve sub-problem?
        → Usually parameters of recursive function

STEP 2: DEFINE THE RECURRENCE RELATION
        → How does dp[i] relate to smaller states?
        → This is the HEART of DP

STEP 3: IDENTIFY BASE CASES
        → What are the smallest sub-problems?
        → What should they return?

STEP 4: DECIDE THE DIRECTION
        → Top-down (recursion + memoization) or
        → Bottom-up (iterative tabulation)?

STEP 5: OPTIMIZE SPACE (if possible)
        → Can I reduce dimensions?
        → Do I only need previous row/column?
```

## 1.7 Common Mistakes (Beginners)

| Mistake | Why It's Wrong | Fix |
|---------|---------------|-----|
| No clear state definition | Can't build the solution | Define what dp[i] means in words first |
| Wrong recurrence relation | Wrong answers | Trace through small examples manually |
| Missing base cases | Runtime errors or wrong answers | Handle all edge cases |
| Incorrect iteration order | Using values before computing them | Ensure dependencies are computed first |
| Not initializing DP table | Garbage values | Initialize all cells properly |

## 1.8 Mental Checklist for Any DP Problem

```
□ UNDERSTAND THE PROBLEM
  □ What am I trying to find?
  □ What are the constraints?

□ IDENTIFY DP APPLICABILITY
  □ Overlapping sub-problems? ✓
  □ Optimal substructure? ✓

□ DEFINE THE STATE
  □ What does dp[i] or dp[i][j] represent?

□ WRITE THE RECURRENCE
  □ How do I compute dp[i] from smaller states?

□ IDENTIFY BASE CASES
  □ What's the smallest valid input?

□ CHOOSE APPROACH
  □ Top-down (easier to think) or
  □ Bottom-up (better space)?

□ CODE & TEST
  □ Test with small examples first
  □ Check edge cases
```

---

# 2. Recursion to DP (Top-Down / Memoization)

## 2.1 Concept Intuition

### 🗂️ The Cache Analogy
Think of your computer's browser cache:
- First time loading a website: slow (download everything)
- Second time: fast! (loads from cache)
- Memoization = adding a cache to your recursion

### The Process
```
Plain Recursion → Add a memo dictionary → Memoization (Top-Down DP)
                  (store computed results)
```

## 2.2 Core Theory

### What is Memoization?

**Memoization** = Memory + Optimization
- Write recursive solution naturally (top-down)
- Before computing, check if already computed
- If yes, return stored result
- If no, compute and store it

### The Template

```python
def dp_top_down(n, memo=None):
    # Initialize memo on first call
    if memo is None:
        memo = {}
    
    # BASE CASE
    if n <= base_condition:
        return base_value
    
    # CHECK MEMO (key step!)
    if n in memo:
        return memo[n]
    
    # COMPUTE (recursive relation)
    result = compute_using(dp_top_down(n-1, memo), 
                          dp_top_down(n-2, memo))
    
    # STORE IN MEMO
    memo[n] = result
    
    return result
```

## 2.3 Example: Fibonacci (Memoization)

### Step 1: Start with Recursion
```python
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)
```

### Step 2: Add Memoization
```python
def fib_memo(n, memo=None):
    if memo is None:
        memo = {}
    
    # Base case
    if n <= 1:
        return n
    
    # Check cache
    if n in memo:
        return memo[n]
    
    # Compute and store
    memo[n] = fib_memo(n-1, memo) + fib_memo(n-2, memo)
    
    return memo[n]
```

### Visual: Call tree with memoization for fib(5)
```
                        fib(5) → compute
                       /      \
                   fib(4)      fib(3)
                  /     \      /     \
              fib(3)  fib(2) [cached] [cached]
             /    \    /   \   
         fib(2) fib(1) [cached] [cached]
         /   \
     fib(1) fib(0)

Calls made: ~9 (vs 15 without memoization for fib(5))
For fib(50): 99 calls instead of 1,125,899,906,842,624! 🚀
```

**Complexity:**
- **Time: O(n)** — each sub-problem computed once
- **Space: O(n)** — memo storage + recursion stack

## 2.4 Example: Climbing Stairs

**Problem:** You can climb 1 or 2 steps. How many ways to climb n steps?

### Step 1: Identify Pattern
```
n = 1: 1 way (1)
n = 2: 2 ways (1+1, 2)
n = 3: 3 ways (1+1+1, 1+2, 2+1)
n = 4: 5 ways

Pattern: ways(n) = ways(n-1) + ways(n-2)
(reach n from step n-1 or n-2)
```

### Step 2: Recursive Relation
```
dp(n) = dp(n-1) + dp(n-2)
Base: dp(1) = 1, dp(2) = 2
```

### Step 3: Code with Memoization
```python
def climb_stairs(n, memo=None):
    if memo is None:
        memo = {}
    
    # Base cases
    if n <= 2:
        return n
    
    # Check memo
    if n in memo:
        return memo[n]
    
    # Recurrence
    memo[n] = climb_stairs(n-1, memo) + climb_stairs(n-2, memo)
    
    return memo[n]
```

## 2.5 Example: House Robber

**Problem:** Rob houses with max money, but can't rob adjacent houses.

```python
def rob(nums, i=0, memo=None):
    if memo is None:
        memo = {}
    
    # Base case: no houses left
    if i >= len(nums):
        return 0
    
    # Check memo
    if i in memo:
        return memo[i]
    
    # Choice 1: Rob this house + skip next
    rob_current = nums[i] + rob(nums, i+2, memo)
    
    # Choice 2: Skip this house
    skip_current = rob(nums, i+1, memo)
    
    # Take maximum
    memo[i] = max(rob_current, skip_current)
    
    return memo[i]
```

## 2.6 When to Use Top-Down (Memoization)

### ✅ Advantages:
- **Natural to think about** (follows recursive intuition)
- **Only computes needed states** (if some states never reached, they're skipped)
- **Easy to code** (just add memo to recursion)
- **Good for interviews** (faster to write, less error-prone)

### ❌ Disadvantages:
- **Function call overhead** (slower than bottom-up)
- **Stack space** (O(n) for recursion stack)
- **Stack overflow risk** for large inputs

### Use When:
- Problem naturally recursive
- Not all states need computation
- Easier to visualize recursively
- In time-pressured interviews

## 2.7 Pro Tips for Memoization

### Tip 1: Choose the Right Key
```python
# 1D DP: key = single parameter
memo[n] = result

# 2D DP: key = tuple
memo[(i, j)] = result

# Multiple parameters
memo[(i, j, k)] = result
```

### Tip 2: Python's @lru_cache Decorator
```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)

# That's it! Auto-memoization! 🎉
```

### Tip 3: Be Careful with Mutable Defaults
```python
# ❌ WRONG: Memo persists across calls
def dp(n, memo={}):
    ...

# ✅ CORRECT: Fresh memo each time
def dp(n, memo=None):
    if memo is None:
        memo = {}
    ...
```

---

# 3. Iterative DP (Bottom-Up)

## 3.1 Concept Intuition

### 🧱 The Building Blocks Analogy
Instead of starting from the top and breaking down:
- Start from the smallest building block
- Build up layer by layer
- Each layer uses the previous layers
- Until you reach the final answer

### Top-Down vs Bottom-Up
```
TOP-DOWN (Memoization):        BOTTOM-UP (Tabulation):
    fib(5)                         fib(0) = 0
      ↓                            fib(1) = 1
  needs fib(4), fib(3)            fib(2) = 0 + 1 = 1
      ↓                            fib(3) = 1 + 1 = 2
  needs fib(2), fib(1)            fib(4) = 1 + 2 = 3
      ↓                            fib(5) = 2 + 3 = 5
   Start here                          ↑
                                  End here
```

## 3.2 Core Theory

### What is Bottom-Up DP?

**Bottom-Up (Tabulation)** means:
1. Create a table (array/matrix) to store results
2. Initialize base cases
3. Fill table iteratively in order
4. Each cell uses previously computed cells
5. Final answer is in last cell

### The Template

```python
def dp_bottom_up(n):
    # STEP 1: Create DP table
    dp = [0] * (n + 1)
    
    # STEP 2: Initialize base cases
    dp[0] = base_case_0
    dp[1] = base_case_1
    
    # STEP 3: Fill table iteratively
    for i in range(2, n + 1):
        # Use recurrence relation
        dp[i] = compute_from(dp[i-1], dp[i-2])
    
    # STEP 4: Return final answer
    return dp[n]
```

## 3.3 Example: Fibonacci (Bottom-Up)

```python
def fib_bottom_up(n):
    # Edge case
    if n <= 1:
        return n
    
    # Create table
    dp = [0] * (n + 1)
    
    # Base cases
    dp[0] = 0
    dp[1] = 1
    
    # Fill table
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    
    return dp[n]
```

### Trace for fib(5):
```
dp[0] = 0
dp[1] = 1
dp[2] = dp[1] + dp[0] = 1 + 0 = 1
dp[3] = dp[2] + dp[1] = 1 + 1 = 2
dp[4] = dp[3] + dp[2] = 2 + 1 = 3
dp[5] = dp[4] + dp[3] = 3 + 2 = 5 ✅

Table: [0, 1, 1, 2, 3, 5]
```

## 3.4 Example: Climbing Stairs (Bottom-Up)

```python
def climb_stairs(n):
    if n <= 2:
        return n
    
    dp = [0] * (n + 1)
    dp[1] = 1
    dp[2] = 2
    
    for i in range(3, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    
    return dp[n]
```

## 3.5 Example: House Robber (Bottom-Up)

```python
def rob(nums):
    if not nums:
        return 0
    if len(nums) == 1:
        return nums[0]
    
    n = len(nums)
    dp = [0] * n
    
    # Base cases
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])
    
    # Fill table
    for i in range(2, n):
        # Rob this house + best up to i-2
        rob_current = nums[i] + dp[i-2]
        # Skip this house, take best up to i-1
        skip_current = dp[i-1]
        dp[i] = max(rob_current, skip_current)
    
    return dp[n-1]
```

## 3.6 2D DP Example: Unique Paths

**Problem:** Robot in m×n grid, can only move right or down. How many paths to bottom-right?

### Step 1: Define State
```
dp[i][j] = number of ways to reach cell (i, j)
```

### Step 2: Recurrence Relation
```
dp[i][j] = dp[i-1][j] + dp[i][j-1]
(can reach (i,j) from top or left)
```

### Step 3: Base Cases
```
dp[0][j] = 1  (first row: only one way)
dp[i][0] = 1  (first column: only one way)
```

### Step 4: Code
```python
def unique_paths(m, n):
    # Create table
    dp = [[0] * n for _ in range(m)]
    
    # Base cases: first row and column
    for i in range(m):
        dp[i][0] = 1
    for j in range(n):
        dp[0][j] = 1
    
    # Fill table
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i-1][j] + dp[i][j-1]
    
    return dp[m-1][n-1]
```

### Visual for 3×3 grid:
```
     0   1   2
   ┌───┬───┬───┐
 0 │ 1 │ 1 │ 1 │
   ├───┼───┼───┤
 1 │ 1 │ 2 │ 3 │
   ├───┼───┼───┤
 2 │ 1 │ 3 │ 6 │ ← Answer: 6 paths
   └───┴───┴───┘
```

## 3.7 When to Use Bottom-Up (Tabulation)

### ✅ Advantages:
- **No recursion overhead** (faster)
- **No stack space** (O(1) call stack)
- **No stack overflow risk**
- **Often easier to optimize space**
- **Better for production code**

### ❌ Disadvantages:
- **Harder to think about initially**
- **Must compute ALL states** (even if not needed)
- **Iteration order can be tricky**

### Use When:
- Performance critical
- Large inputs (avoid stack overflow)
- All states need computation anyway
- Production code (more robust)

## 3.8 Top-Down vs Bottom-Up: Side-by-Side

| Aspect | Top-Down (Memoization) | Bottom-Up (Tabulation) |
|--------|------------------------|------------------------|
| Approach | Recursion + Cache | Iteration + Table |
| Direction | Problem → sub-problems | Base cases → problem |
| Space | O(n) memo + O(n) stack | O(n) table only |
| Speed | Slower (function calls) | Faster |
| Ease of coding | Easier (natural) | Requires more thought |
| States computed | Only needed ones | All states |
| Stack overflow risk | Yes (large inputs) | No |
| Interview | Often preferred | Good for follow-up |

---

# 4. Space Optimization Techniques

## 4.1 Concept Intuition

### 🗃️ The Rolling File Cabinet Analogy
Imagine filing papers:
- **Naive:** Keep every paper ever (O(n) space)
- **Smart:** Only keep last 2 years of papers (O(1) space)
- You discard old papers you'll never need again

### The Key Insight
```
If dp[i] only depends on dp[i-1], dp[i-2]...
Do we REALLY need to store dp[0], dp[1], ..., dp[i-100]?

NO! Just keep the recent ones you need! 🎯
```

## 4.2 Core Theory

### Space Optimization Principle

**After computing dp[i], if you never need smaller indices again, discard them!**

### Common Patterns:

#### Pattern 1: Need Only Previous State
```
If: dp[i] = f(dp[i-1])
Then: O(n) space → O(1) space
```

#### Pattern 2: Need Last 2 States
```
If: dp[i] = f(dp[i-1], dp[i-2])
Then: O(n) space → O(1) space (keep 2 variables)
```

#### Pattern 3: 2D DP, Need Only Previous Row
```
If: dp[i][j] = f(dp[i-1][j], dp[i][j-1])
Then: O(m×n) space → O(n) space (keep 1 row)
```

## 4.3 Example: Fibonacci Space Optimization

### Original: O(n) Space
```python
def fib(n):
    dp = [0] * (n + 1)
    dp[0] = 0
    dp[1] = 1
    
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    
    return dp[n]
```

### Optimized: O(1) Space
```python
def fib_optimized(n):
    if n <= 1:
        return n
    
    # Only keep last 2 values
    prev2 = 0  # fib(i-2)
    prev1 = 1  # fib(i-1)
    
    for i in range(2, n + 1):
        current = prev1 + prev2
        # Slide the window
        prev2 = prev1
        prev1 = current
    
    return prev1
```

### Visual:
```
Iteration  prev2  prev1  current
    0        0      1       -
    1        0      1       1     (0+1)
    2        1      1       2     (1+1)
    3        1      2       3     (1+2)
    4        2      3       5     (2+3)
                           ↑
                      Answer!
```

## 4.4 Example: Climbing Stairs Space Optimization

### Original: O(n) Space
```python
def climb_stairs(n):
    dp = [0] * (n + 1)
    dp[1] = 1
    dp[2] = 2
    
    for i in range(3, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    
    return dp[n]
```

### Optimized: O(1) Space
```python
def climb_stairs_optimized(n):
    if n <= 2:
        return n
    
    prev2 = 1  # ways to climb 1 step
    prev1 = 2  # ways to climb 2 steps
    
    for i in range(3, n + 1):
        current = prev1 + prev2
        prev2 = prev1
        prev1 = current
    
    return prev1
```

## 4.5 Example: House Robber Space Optimization

### Original: O(n) Space
```python
def rob(nums):
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])
    
    for i in range(2, n):
        dp[i] = max(nums[i] + dp[i-2], dp[i-1])
    
    return dp[n-1]
```

### Optimized: O(1) Space
```python
def rob_optimized(nums):
    if len(nums) == 1:
        return nums[0]
    
    prev2 = nums[0]
    prev1 = max(nums[0], nums[1])
    
    for i in range(2, len(nums)):
        current = max(nums[i] + prev2, prev1)
        prev2 = prev1
        prev1 = current
    
    return prev1
```

## 4.6 2D DP Space Optimization: Unique Paths

### Original: O(m×n) Space
```python
def unique_paths(m, n):
    dp = [[0] * n for _ in range(m)]
    
    for i in range(m):
        dp[i][0] = 1
    for j in range(n):
        dp[0][j] = 1
    
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i-1][j] + dp[i][j-1]
    
    return dp[m-1][n-1]
```

### Observation:
```
dp[i][j] only needs:
  - dp[i-1][j] (cell above)
  - dp[i][j-1] (cell to the left)

We only need current row and previous row!
```

### Optimized: O(n) Space
```python
def unique_paths_optimized(m, n):
    # Only keep previous row
    prev = [1] * n  # Initialize first row
    
    for i in range(1, m):
        current = [1]  # First column always 1
        
        for j in range(1, n):
            # current[j] = prev[j] + current[j-1]
            current.append(prev[j] + current[j-1])
        
        prev = current  # Current becomes previous for next iteration
    
    return prev[n-1]
```

### Even More Optimized: Single Array
```python
def unique_paths_ultra_optimized(m, n):
    dp = [1] * n  # Single row
    
    for i in range(1, m):
        for j in range(1, n):
            # dp[j] = dp[j] (from above) + dp[j-1] (from left)
            dp[j] += dp[j-1]
    
    return dp[n-1]
```

**How this works:**
- When computing `dp[j]`, it still has old value (acts as "above")
- `dp[j-1]` has new value (acts as "left")
- Update in place!

## 4.7 The Space Optimization Process

```
STEP 1: Identify dependencies
        → What previous states does dp[i] need?

STEP 2: Check if older states are needed
        → After computing dp[i], will you ever use dp[i-3], dp[i-4], etc.?

STEP 3: Keep only necessary states
        → If only need dp[i-1], dp[i-2], use 2 variables
        → If only need previous row, use 1D array

STEP 4: Update carefully
        → Make sure you don't overwrite values you still need
        → Sometimes need temp variables
```

## 4.8 Common Space Optimization Patterns

| Original Dependencies | Optimized Space | Technique |
|----------------------|-----------------|-----------|
| dp[i] depends on dp[i-1] | O(1) | Single variable |
| dp[i] depends on dp[i-1], dp[i-2] | O(1) | Two variables |
| dp[i] depends on dp[i-k] for k values | O(k) | Sliding window of k variables |
| dp[i][j] depends on dp[i-1][j], dp[i][j-1] | O(n) | Keep one row/column |
| dp[i][j] depends on dp[i-1][...] | O(n) | Keep previous row |

## 4.9 Pro Tips for Space Optimization

### Tip 1: Optimize After Getting It Working
```
1. First: Get correct answer with naive space
2. Then: Analyze dependencies
3. Finally: Optimize space
```

Don't optimize prematurely in interviews!

### Tip 2: Watch Out for Reading Old Values
```python
# ❌ WRONG: Overwrites value you still need
for i in range(n):
    dp[i] = dp[i] + dp[i-1]  # dp[i] gets overwritten too early

# ✅ CORRECT: Use temp variable
for i in range(n):
    temp = dp[i]
    dp[i] = dp[i] + dp[i-1]
    # or better: iterate right to left
```

### Tip 3: Sometimes Space Optimization Isn't Worth It
If the code becomes significantly more complex for marginal space gain, stick with clearer version (especially in interviews).

---

# 5. Time Complexity Analysis

## 5.1 Concept Intuition

### 📊 The Speedometer Analogy
Time complexity tells you:
- How fast your algorithm "drives"
- How speed changes as "distance" (input size) increases
- Whether you're on a bicycle (O(2^n)), car (O(n²)), or jet (O(n))

### The Key Insight for DP
```
Time Complexity = (Number of states) × (Time per state)
```

## 5.2 Core Analysis Method

### Step 1: Count Total States

**1D DP:**
```
If state is defined by single parameter i (0 to n):
Number of states = n + 1 = O(n)
```

**2D DP:**
```
If state is defined by (i, j) where i: 0 to m, j: 0 to n:
Number of states = (m+1) × (n+1) = O(m×n)
```

**3D DP:**
```
State (i, j, k):
Number of states = O(m×n×k)
```

### Step 2: Compute Time Per State

**Count operations inside the state computation** (excluding recursive calls):
- Single arithmetic operation: O(1)
- Loop of size k: O(k)
- Nested loop: O(k²)

### Step 3: Multiply

```
Total Time = States × Time per state
```

## 5.3 Examples with Analysis

### Example 1: Fibonacci

```python
def fib(n):
    dp = [0] * (n + 1)
    dp[0], dp[1] = 0, 1
    
    for i in range(2, n + 1):  # ← Loop runs n-1 times
        dp[i] = dp[i-1] + dp[i-2]  # ← O(1) work
    
    return dp[n]
```

**Analysis:**
- States: i from 0 to n → **O(n) states**
- Work per state: One addition → **O(1)**
- **Total: O(n) × O(1) = O(n)**
- **Space: O(n)** for array

### Example 2: Climbing Stairs

```python
def climb_stairs(n):
    dp = [0] * (n + 1)
    dp[1], dp[2] = 1, 2
    
    for i in range(3, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    
    return dp[n]
```

**Analysis:**
- States: **O(n)**
- Work per state: **O(1)**
- **Total: O(n)**

### Example 3: Longest Common Subsequence (LCS)

```python
def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    
    return dp[m][n]
```

**Analysis:**
- States: (i, j) where i: 1 to m, j: 1 to n → **O(m×n) states**
- Work per state: Comparison and max → **O(1)**
- **Total: O(m×n)**
- **Space: O(m×n)**

### Example 4: 0/1 Knapsack

```python
def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            if weights[i-1] <= w:
                dp[i][w] = max(
                    values[i-1] + dp[i-1][w - weights[i-1]],  # Include
                    dp[i-1][w]  # Exclude
                )
            else:
                dp[i][w] = dp[i-1][w]
    
    return dp[n][capacity]
```

**Analysis:**
- States: (i, w) where i: 0 to n, w: 0 to capacity → **O(n × capacity) states**
- Work per state: **O(1)**
- **Total: O(n × capacity)**
- **Space: O(n × capacity)**

### Example 5: Coin Change (Min Coins)

```python
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    
    for i in range(1, amount + 1):
        for coin in coins:  # ← Inner loop!
            if i >= coin:
                dp[i] = min(dp[i], dp[i - coin] + 1)
    
    return dp[amount] if dp[amount] != float('inf') else -1
```

**Analysis:**
- States: i from 0 to amount → **O(amount) states**
- Work per state: Loop through coins → **O(len(coins))**
- **Total: O(amount × len(coins))**
- **Space: O(amount)**

## 5.4 Memoization vs Tabulation Complexity

### Memoization (Top-Down)
```
Time = States × Time per state
     + Only states that are REACHED

Space = DP table + Recursion stack
      = O(n) + O(n) = O(n)
```

### Tabulation (Bottom-Up)
```
Time = States × Time per state
     + ALL states computed

Space = DP table only
      = O(n)
```

**Usually:** Tabulation is faster in practice (no recursion overhead).

## 5.5 Common DP Time Complexities

| Pattern | Example Problems | Time Complexity |
|---------|------------------|-----------------|
| 1D DP with O(1) transition | Fibonacci, Climbing Stairs | O(n) |
| 1D DP with O(n) transition | Coin Change, Jump Game II | O(n²) |
| 2D DP with O(1) transition | LCS, Edit Distance, Unique Paths | O(m×n) |
| 2D DP with O(n) transition | Burst Balloons | O(n³) |
| Subset/Knapsack | 0/1 Knapsack | O(n × W) |
| String DP | LCS, Edit Distance | O(m × n) |

## 5.6 Complexity Trap: Pseudo-Polynomial Time

**Knapsack is O(n × W), but is this polynomial?**

```
NO! W is the VALUE of capacity, not size of input.
If W = 2^32, but input size is just 32 bits, it's exponential!

This is called "pseudo-polynomial" time.
```

**Rule:** If complexity depends on the VALUE (not count) of a number in input, it's pseudo-polynomial.

## 5.7 Quick Complexity Estimation Trick

```
1D DP:
  1 loop → O(n)
  2 nested loops → O(n²)

2D DP:
  2 loops → O(m×n)
  3 loops → O(m×n×k) or O(m×n²)

With memoization:
  Add O(n) to space for recursion stack
```

## 5.8 Interview Complexity Discussion

**Interviewer:** "What's the time complexity?"

**You:** 
1. "We have X states..."
2. "For each state, we do Y work..."
3. "So total is O(X × Y)"
4. "Space is O(X) for the DP table [+ O(depth) for recursion if memoization]"

**Follow-up:** "Can you optimize?"

**You:**
- Time: Usually can't reduce below O(states) unless you change algorithm
- Space: "We only need previous K states, so we can reduce to O(K)"

---

# 6. LIVE Problem Solving Patterns

## 6.1 Pattern 1: 1D DP — Linear Sequence

### When to Use:
- Processing array/sequence from left to right
- Decision at each position depends on previous positions
- State is defined by single index

### Template:
```python
def linear_dp(arr):
    n = len(arr)
    dp = [0] * n
    
    # Base case
    dp[0] = base_value
    
    # Fill table
    for i in range(1, n):
        dp[i] = compute_from(dp[i-1], dp[i-2], ..., arr[i])
    
    return dp[n-1]
```

### Example: Maximum Sum Subarray Ending at Each Position

```python
def max_subarray(nums):
    n = len(nums)
    dp = [0] * n
    
    # dp[i] = maximum sum subarray ending at index i
    dp[0] = nums[0]
    max_sum = dp[0]
    
    for i in range(1, n):
        # Either extend previous subarray or start fresh
        dp[i] = max(nums[i], dp[i-1] + nums[i])
        max_sum = max(max_sum, dp[i])
    
    return max_sum
```

**Recurrence:** `dp[i] = max(nums[i], dp[i-1] + nums[i])`

---

### Example: Longest Increasing Subsequence (LIS)

```python
def length_of_lis(nums):
    if not nums:
        return 0
    
    n = len(nums)
    dp = [1] * n  # Each element is a subsequence of length 1
    
    for i in range(1, n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    
    return max(dp)
```

**Time:** O(n²)  
**Space:** O(n)

**Recurrence:** `dp[i] = max(dp[j] + 1)` for all `j < i` where `nums[j] < nums[i]`

---

## 6.2 Pattern 2: 1D DP — Choice at Each Step

### When to Use:
- At each step, you have multiple choices
- Want to optimize something (min/max)
- "Should I do X or Y at position i?"

### Template:
```python
def choice_dp(arr):
    n = len(arr)
    dp = [0] * n
    
    # Base case
    dp[0] = base_value
    
    for i in range(1, n):
        # Try each choice
        choice1 = compute_choice1(dp, i)
        choice2 = compute_choice2(dp, i)
        dp[i] = best_of(choice1, choice2)
    
    return dp[n-1]
```

### Example: House Robber (Revisited)

```python
def rob(nums):
    if not nums:
        return 0
    if len(nums) == 1:
        return nums[0]
    
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])
    
    for i in range(2, n):
        rob_this = nums[i] + dp[i-2]   # Rob this house
        skip_this = dp[i-1]             # Skip this house
        dp[i] = max(rob_this, skip_this)
    
    return dp[n-1]
```

---

### Example: Jump Game II (Min Jumps)

```python
def jump(nums):
    n = len(nums)
    dp = [float('inf')] * n
    dp[0] = 0
    
    for i in range(n):
        # From position i, try all possible jumps
        for jump_size in range(1, nums[i] + 1):
            next_pos = i + jump_size
            if next_pos < n:
                dp[next_pos] = min(dp[next_pos], dp[i] + 1)
    
    return dp[n-1]
```

**Time:** O(n × max_jump)

---

## 6.3 Pattern 3: 2D DP — Grid/Matrix

### When to Use:
- 2D grid/matrix
- Can move in certain directions
- State depends on (row, col)

### Template:
```python
def grid_dp(grid):
    m, n = len(grid), len(grid[0])
    dp = [[0] * n for _ in range(m)]
    
    # Initialize first row/column
    initialize_base_cases()
    
    # Fill table
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = compute_from(dp[i-1][j], dp[i][j-1], grid[i][j])
    
    return dp[m-1][n-1]
```

### Example: Minimum Path Sum

```python
def min_path_sum(grid):
    m, n = len(grid), len(grid[0])
    dp = [[0] * n for _ in range(m)]
    
    # Base case
    dp[0][0] = grid[0][0]
    
    # First column
    for i in range(1, m):
        dp[i][0] = dp[i-1][0] + grid[i][0]
    
    # First row
    for j in range(1, n):
        dp[0][j] = dp[0][j-1] + grid[0][j]
    
    # Fill rest
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])
    
    return dp[m-1][n-1]
```

---

### Example: Unique Paths II (With Obstacles)

```python
def unique_paths_with_obstacles(grid):
    if not grid or grid[0][0] == 1:
        return 0
    
    m, n = len(grid), len(grid[0])
    dp = [[0] * n for _ in range(m)]
    dp[0][0] = 1
    
    # First column
    for i in range(1, m):
        dp[i][0] = dp[i-1][0] if grid[i][0] == 0 else 0
    
    # First row
    for j in range(1, n):
        dp[0][j] = dp[0][j-1] if grid[0][j] == 0 else 0
    
    # Fill rest
    for i in range(1, m):
        for j in range(1, n):
            if grid[i][j] == 1:
                dp[i][j] = 0
            else:
                dp[i][j] = dp[i-1][j] + dp[i][j-1]
    
    return dp[m-1][n-1]
```

---

## 6.4 Pattern 4: 2D DP — Two Sequences

### When to Use:
- Comparing two strings/arrays
- State: position in both sequences
- LCS, Edit Distance, etc.

### Template:
```python
def two_sequence_dp(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    # Initialize base cases (usually row 0 and column 0)
    initialize_bases()
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if condition(s1[i-1], s2[j-1]):
                dp[i][j] = compute_match(dp, i, j)
            else:
                dp[i][j] = compute_no_match(dp, i, j)
    
    return dp[m][n]
```

### Example: Longest Common Subsequence (LCS)

```python
def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                # Characters match: extend diagonal
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                # No match: take best of top or left
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    
    return dp[m][n]
```

**Recurrence:**
```
if s1[i] == s2[j]:
    dp[i][j] = dp[i-1][j-1] + 1
else:
    dp[i][j] = max(dp[i-1][j], dp[i][j-1])
```

---

### Example: Edit Distance (Levenshtein)

```python
def edit_distance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    # Base cases
    for i in range(m + 1):
        dp[i][0] = i  # Delete all characters
    for j in range(n + 1):
        dp[0][j] = j  # Insert all characters
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i-1] == word2[j-1]:
                # Characters match: no operation needed
                dp[i][j] = dp[i-1][j-1]
            else:
                # Try all 3 operations, take minimum
                insert = dp[i][j-1] + 1
                delete = dp[i-1][j] + 1
                replace = dp[i-1][j-1] + 1
                dp[i][j] = min(insert, delete, replace)
    
    return dp[m][n]
```

---

## 6.5 Pattern 5: Coin Change / Unbounded Knapsack

### When to Use:
- Unlimited use of items
- "How many ways" or "minimum number" problems
- Target sum with coins/items

### Template:
```python
def coin_change_template(coins, target):
    dp = [initial_value] * (target + 1)
    dp[0] = base_case
    
    for amount in range(1, target + 1):
        for coin in coins:
            if amount >= coin:
                dp[amount] = update(dp[amount], dp[amount - coin])
    
    return dp[target]
```

### Example: Coin Change — Minimum Coins

```python
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    
    for amt in range(1, amount + 1):
        for coin in coins:
            if amt >= coin:
                dp[amt] = min(dp[amt], dp[amt - coin] + 1)
    
    return dp[amount] if dp[amount] != float('inf') else -1
```

---

### Example: Coin Change — Number of Ways

```python
def coin_change_ways(coins, amount):
    dp = [0] * (amount + 1)
    dp[0] = 1  # One way to make 0: use no coins
    
    for coin in coins:  # ← Loop order matters!
        for amt in range(coin, amount + 1):
            dp[amt] += dp[amt - coin]
    
    return dp[amount]
```

**Why loop order matters:**
- Outer loop on coins → counts combinations (avoids duplicates)
- Outer loop on amount → counts permutations (allows duplicates)

---

## 6.6 Pattern 6: 0/1 Knapsack

### When to Use:
- Each item can be used ONCE
- "Include or exclude" decision
- Maximize/minimize with capacity constraint

### Template:
```python
def knapsack_01(items, capacity):
    n = len(items)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            # Choice 1: Don't include item i
            exclude = dp[i-1][w]
            
            # Choice 2: Include item i (if fits)
            include = 0
            if items[i-1].weight <= w:
                include = items[i-1].value + dp[i-1][w - items[i-1].weight]
            
            dp[i][w] = max(exclude, include)
    
    return dp[n][capacity]
```

### Example: Partition Equal Subset Sum

```python
def can_partition(nums):
    total = sum(nums)
    if total % 2 != 0:
        return False
    
    target = total // 2
    n = len(nums)
    
    # dp[i][j] = can we make sum j using first i numbers?
    dp = [[False] * (target + 1) for _ in range(n + 1)]
    
    # Base case: sum 0 always possible (take nothing)
    for i in range(n + 1):
        dp[i][0] = True
    
    for i in range(1, n + 1):
        for j in range(1, target + 1):
            # Don't include nums[i-1]
            dp[i][j] = dp[i-1][j]
            
            # Include nums[i-1] (if possible)
            if j >= nums[i-1]:
                dp[i][j] = dp[i][j] or dp[i-1][j - nums[i-1]]
    
    return dp[n][target]
```

---

## 6.7 Pattern 7: Interval DP

### When to Use:
- Problem involves intervals [i, j]
- Breaking intervals into smaller intervals
- Optimal way to split/merge intervals

### Template:
```python
def interval_dp(arr):
    n = len(arr)
    dp = [[0] * n for _ in range(n)]
    
    # Base case: intervals of length 1
    for i in range(n):
        dp[i][i] = base_value
    
    # Iterate by length of interval
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float('inf')  # or -inf for max
            
            # Try all split points
            for k in range(i, j):
                dp[i][j] = optimize(dp[i][j], 
                                   dp[i][k] + dp[k+1][j] + cost(i, j, k))
    
    return dp[0][n-1]
```

### Example: Burst Balloons

```python
def max_coins(nums):
    # Add 1 at both ends to simplify
    nums = [1] + nums + [1]
    n = len(nums)
    dp = [[0] * n for _ in range(n)]
    
    # length of interval
    for length in range(1, n - 1):
        for left in range(1, n - length):
            right = left + length - 1
            
            # Try bursting each balloon last in this interval
            for i in range(left, right + 1):
                coins = nums[left-1] * nums[i] * nums[right+1]
                coins += dp[left][i-1] + dp[i+1][right]
                dp[left][right] = max(dp[left][right], coins)
    
    return dp[1][n-2]
```

**Time:** O(n³)

---

## 6.8 Pattern 8: DP on Trees

### When to Use:
- Binary tree problems
- Optimize something on tree
- State includes subtree info

### Template:
```python
def tree_dp(root):
    def dfs(node):
        if not node:
            return base_value
        
        left_result = dfs(node.left)
        right_result = dfs(node.right)
        
        # Compute result for this node
        result = combine(node.val, left_result, right_result)
        
        return result
    
    return dfs(root)
```

### Example: House Robber III (Tree Version)

```python
def rob_tree(root):
    def dfs(node):
        if not node:
            return (0, 0)  # (rob, not_rob)
        
        left_rob, left_not_rob = dfs(node.left)
        right_rob, right_not_rob = dfs(node.right)
        
        # If rob this node, can't rob children
        rob = node.val + left_not_rob + right_not_rob
        
        # If not rob this node, take max from children
        not_rob = max(left_rob, left_not_rob) + max(right_rob, right_not_rob)
        
        return (rob, not_rob)
    
    rob, not_rob = dfs(root)
    return max(rob, not_rob)
```

---

## 6.9 Master DP Checklist

```
□ UNDERSTAND THE PROBLEM
  □ What am I optimizing/counting?
  □ What are the constraints?
  □ Sample inputs/outputs clear?

□ CHECK IF IT'S DP
  □ Overlapping sub-problems? ✓
  □ Optimal substructure? ✓
  □ Can brute force be memoized? ✓

□ DEFINE THE STATE
  □ What information defines a sub-problem?
  □ 1D? 2D? More?
  □ What does dp[i] or dp[i][j] represent IN WORDS?

□ WRITE THE RECURRENCE
  □ How does dp[i] relate to smaller states?
  □ What choices do I have at each step?
  □ Write it mathematically

□ IDENTIFY BASE CASES
  □ What's the smallest/trivial case?
  □ How should dp[0] or dp[0][0] be initialized?

□ CHOOSE APPROACH
  □ Top-down (memoization) — easier to think
  □ Bottom-up (tabulation) — better performance

□ CODE IT
  □ Initialize DP table
  □ Handle base cases
  □ Fill table in correct order
  □ Return final answer

□ OPTIMIZE (if time permits)
  □ Can I reduce space?
  □ Can I improve time?

□ TEST
  □ Small examples
  □ Edge cases: empty, single element
  □ Large examples mentally
```

---

## 6.10 Quick Pattern Recognition Guide

| If Problem Says... | Pattern | Example |
|--------------------|---------|---------|
| "Maximize/minimize something" | Choice DP | House Robber |
| "How many ways" | Counting DP | Climbing Stairs, Coin Change |
| "Is it possible" | Boolean DP | Partition Equal Subset |
| "Longest/shortest subsequence" | 2D Sequence DP | LCS, LIS |
| "Edit distance" | 2D String DP | Levenshtein |
| "Grid path" | 2D Grid DP | Unique Paths |
| "Coins, unlimited use" | Unbounded Knapsack | Coin Change |
| "Items, use once" | 0/1 Knapsack | Subset Sum |
| "Break into intervals" | Interval DP | Burst Balloons |
| "Optimize on tree" | Tree DP | House Robber III |

---

# 📋 Quick Reference Card

## The 5 Steps of DP

1. **DEFINE STATE** — What is dp[i]?
2. **WRITE RECURRENCE** — How does dp[i] relate to previous?
3. **BASE CASES** — Initialize smallest cases
4. **ITERATION ORDER** — Compute in correct sequence
5. **RETURN ANSWER** — Usually dp[n] or dp[m][n]

## Complexity Quick Guide

| Pattern | Time | Space |
|---------|------|-------|
| 1D DP, O(1) transition | O(n) | O(n) → O(1) |
| 1D DP, O(n) transition | O(n²) | O(n) |
| 2D DP, O(1) transition | O(m×n) | O(m×n) → O(n) |
| 2D DP, O(n) transition | O(m×n²) or O(n³) | O(m×n) |
| Knapsack | O(n×W) | O(n×W) → O(W) |

## Top-Down vs Bottom-Up

| | Top-Down | Bottom-Up |
|-|----------|-----------|
| **Style** | Recursion + Memo | Iteration + Table |
| **Thinking** | Natural, easier | Requires practice |
| **Speed** | Slower | Faster |
| **Space** | O(n) + O(n) stack | O(n) only |
| **Interview** | Preferred (faster to code) | Good for follow-up |

---

**🎯 You're now equipped to tackle ANY DP problem in FAANG interviews!**

The key is PRACTICE. Do 30-50 DP problems, and the patterns will become second nature.

---

*End of Week 2: Dynamic Programming Complete Notes*
