# 🚀 Week 3: Advanced Dynamic Programming — Complete Master Notes

> **Goal**: Master the hardest DP patterns that appear in FAANG interviews. After this, you'll tackle problems that make others give up.

---

## 📌 Table of Contents

1. [Gap Method](#1-gap-method)
2. [Multi-Dimensional DP](#2-multi-dimensional-dp)
3. [Identifying Hard DP Problems](#3-identifying-hard-dp-problems)
4. [Optimization Strategies](#4-optimization-strategies)
5. [Time Complexity Mastery](#5-time-complexity-mastery)
6. [LIVE Problem Solving Patterns](#6-live-problem-solving-patterns)

---

# 1. Gap Method

## 1.1 Concept Intuition (Real World Analogy)

### 🪜 The Ladder Analogy
Imagine painting a tall ladder:
- **Normal approach:** Start from bottom rung, paint each rung going up
- **Gap method:** Start with adjacent rungs (gap=1), then rungs 2 apart (gap=2), then 3 apart...
- **Why?** Some problems naturally depend on "distance" between positions

### 🎯 The Core Idea
```
Gap Method = Processing intervals by their LENGTH
           = Start with smallest intervals (length 1)
           = Then length 2, length 3, ...
           = Each larger interval uses smaller intervals already computed
```

Instead of iterating `i=0 to n`, we iterate by **gap (length)** and then by **starting position**.

## 1.2 Core Theory (Simple Words)

### What is the Gap Method?

The **Gap Method** is a way to iterate through intervals [i, j] by their **length (gap = j - i)** rather than by their endpoints.

### Why Use Gap Method?

**When the solution for interval [i, j] depends on:**
- All smaller intervals WITHIN [i, j]
- The LENGTH of the interval matters
- You need to split the interval at different points

### Standard Iteration vs Gap Method

**Standard (Wrong for interval DP):**
```python
for i in range(n):
    for j in range(i, n):
        dp[i][j] = ...  # ❌ May use dp[i+1][j-1] before it's computed!
```

**Gap Method (Correct):**
```python
# Iterate by length (gap)
for gap in range(n):
    for i in range(n - gap):
        j = i + gap
        dp[i][j] = ...  # ✅ All smaller intervals already computed
```

### Visual: Filling Order

**Standard iteration:** (row by row)
```
  0 1 2 3 4
0 1 2 3 4 5
1   6 7 8 9
2     10 11 12
3        13 14
4           15

Order: 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15
```

**Gap method:** (diagonal by diagonal)
```
  0 1 2 3 4
0 1 2 4 7 11
1   3 5 8 12
2     6 9 13
3       10 14
4          15

Order: 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15
Ensures dependencies are met!
```

## 1.3 The Gap Method Template

```python
def gap_method_dp(arr):
    n = len(arr)
    dp = [[0] * n for _ in range(n)]
    
    # STEP 1: Base case - intervals of length 1 (gap = 0)
    for i in range(n):
        dp[i][i] = base_value(arr[i])
    
    # STEP 2: Iterate by gap (length - 1)
    for gap in range(1, n):  # gap = j - i
        # STEP 3: For each starting position
        for i in range(n - gap):
            j = i + gap  # ending position
            
            # STEP 4: Try all ways to split [i, j]
            dp[i][j] = initial_value
            for k in range(i, j):  # split point
                # Combine left [i,k] and right [k+1,j]
                dp[i][j] = optimize(
                    dp[i][j],
                    dp[i][k] + dp[k+1][j] + cost(i, j, k)
                )
    
    # STEP 5: Answer is full interval [0, n-1]
    return dp[0][n-1]
```

## 1.4 Example: Palindrome Partitioning II

**Problem:** Minimum cuts needed to partition string into palindromes.

### Step 1: Build Palindrome Table
```python
def is_palindrome_table(s):
    n = len(s)
    is_pal = [[False] * n for _ in range(n)]
    
    # Every single character is palindrome
    for i in range(n):
        is_pal[i][i] = True
    
    # Check by gap
    for gap in range(1, n):
        for i in range(n - gap):
            j = i + gap
            if s[i] == s[j]:
                if gap == 1:
                    is_pal[i][j] = True
                else:
                    is_pal[i][j] = is_pal[i+1][j-1]
    
    return is_pal
```

### Step 2: Minimum Cuts DP
```python
def min_cut(s):
    n = len(s)
    is_pal = is_palindrome_table(s)
    
    # dp[i][j] = min cuts for substring s[i:j+1]
    dp = [[0] * n for _ in range(n)]
    
    # Base case: single character needs 0 cuts
    for i in range(n):
        dp[i][i] = 0
    
    # Gap method
    for gap in range(1, n):
        for i in range(n - gap):
            j = i + gap
            
            if is_pal[i][j]:
                # Whole substring is palindrome
                dp[i][j] = 0
            else:
                # Try all partition points
                dp[i][j] = float('inf')
                for k in range(i, j):
                    dp[i][j] = min(
                        dp[i][j],
                        dp[i][k] + dp[k+1][j] + 1  # +1 for the cut
                    )
    
    return dp[0][n-1]
```

## 1.5 Example: Matrix Chain Multiplication

**Problem:** Find minimum operations to multiply matrices with given dimensions.

```python
def matrix_chain_order(dims):
    """
    dims[i] = dimensions of matrix i
    Matrix i has dimensions dims[i-1] x dims[i]
    """
    n = len(dims) - 1  # number of matrices
    dp = [[0] * n for _ in range(n)]
    
    # Base case: single matrix needs 0 operations
    for i in range(n):
        dp[i][i] = 0
    
    # Gap method: iterate by chain length
    for gap in range(1, n):  # gap = length - 1
        for i in range(n - gap):
            j = i + gap
            dp[i][j] = float('inf')
            
            # Try all split points
            for k in range(i, j):
                # Cost = left_chain + right_chain + merge_cost
                cost = (dp[i][k] + 
                       dp[k+1][j] + 
                       dims[i] * dims[k+1] * dims[j+1])
                dp[i][j] = min(dp[i][j], cost)
    
    return dp[0][n-1]
```

**Example:**
```
Matrices: A(10×30), B(30×5), C(5×60)
dims = [10, 30, 5, 60]

Parenthesizations:
1. ((AB)C) = (10×30×5) + (10×5×60) = 1500 + 3000 = 4500
2. (A(BC)) = (30×5×60) + (10×30×60) = 9000 + 18000 = 27000

Minimum: 4500 ✅
```

## 1.6 Example: Burst Balloons

**Problem:** Burst balloons in optimal order to maximize coins.

```python
def max_coins(nums):
    # Add 1 at boundaries to simplify
    balloons = [1] + nums + [1]
    n = len(balloons)
    dp = [[0] * n for _ in range(n)]
    
    # Gap method
    for gap in range(2, n):  # Start from gap=2 (need at least 3 balloons)
        for left in range(n - gap):
            right = left + gap
            
            # Try bursting each balloon LAST in [left, right]
            for i in range(left + 1, right):
                # If i is burst last in [left, right]:
                # - left and right are still there
                # - All balloons between left and i are gone
                # - All balloons between i and right are gone
                coins = balloons[left] * balloons[i] * balloons[right]
                coins += dp[left][i] + dp[i][right]
                dp[left][right] = max(dp[left][right], coins)
    
    return dp[0][n-1]
```

**Key Insight:** Think "which balloon to burst LAST" rather than "first".

## 1.7 When to Use Gap Method

### ✅ Use Gap Method When:
- Problem involves intervals [i, j]
- Solution for [i, j] depends on smaller intervals WITHIN [i, j]
- Need to try different split points
- Dependencies form a specific pattern

### 🔍 Signal Phrases:
- "Optimal way to split/partition interval"
- "Parenthesization"
- "Chain of operations"
- "Burst/remove elements in order"
- "Minimum cost to merge"

### Common Problems:
- Matrix Chain Multiplication
- Burst Balloons
- Palindrome Partitioning
- Boolean Parenthesization
- Optimal Binary Search Tree
- Stone Game variants

## 1.8 Mental Checklist for Gap Method

```
□ Does problem involve intervals [i, j]?
□ Do I need to split interval at different points?
□ Does solution for [i, j] use solutions for smaller intervals?
□ Should I iterate by LENGTH rather than endpoints?

If YES to all → Use Gap Method!

□ Initialize base case (gap = 0 or gap = 1)
□ Iterate gap from 1 (or 2) to n-1
□ For each gap, iterate starting position i
□ Calculate j = i + gap
□ Try all split points k in [i, j)
□ Return dp[0][n-1]
```

---

# 2. Multi-Dimensional DP

## 2.1 Concept Intuition (Real World Analogy)

### 🗺️ The GPS Analogy
- **1D DP:** Position on a line (latitude only)
- **2D DP:** Position on a map (latitude + longitude)
- **3D DP:** Position in 3D space (latitude + longitude + altitude)
- **4D+ DP:** Position in spacetime (+ time, + other constraints)

Each dimension represents a **state variable** that affects your decision.

### 🎯 The Core Idea
```
Multi-Dimensional DP = Multiple state variables
                     = Each variable is an index in DP table
                     = n variables → n-dimensional array
```

## 2.2 Core Theory

### What is Multi-Dimensional DP?

**When state requires tracking multiple independent variables:**
- 2D: `dp[i][j]` = two variables
- 3D: `dp[i][j][k]` = three variables
- 4D: `dp[i][j][k][l]` = four variables

### Common Multi-Dimensional States:

| Dimensions | State Variables | Example Problems |
|------------|----------------|------------------|
| 2D | Position in two sequences | LCS, Edit Distance |
| 2D | Index + remaining capacity | Knapsack |
| 3D | Two sequences + operation count | Edit Distance with limit |
| 3D | Position + two constraints | Stock with cooldown & transactions |
| 4D | Two positions + two constraints | DP on two arrays with constraints |

## 2.3 Example: 2D DP — Longest Common Subsequence

```python
def lcs(text1, text2):
    m, n = len(text1), len(text2)
    # State: (position in text1, position in text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    
    return dp[m][n]
```

**State:** `dp[i][j]` = LCS length for `text1[0:i]` and `text2[0:j]`

## 2.4 Example: 3D DP — Edit Distance with Limit

**Problem:** Convert string1 to string2 with at most K operations.

```python
def is_transformable(s1, s2, k):
    m, n = len(s1), len(s2)
    
    # State: (position in s1, position in s2, operations used)
    dp = [[[False] * (k + 1) for _ in range(n + 1)] for _ in range(m + 1)]
    
    # Base case: empty to empty with 0 operations
    dp[0][0][0] = True
    
    # Delete from s1
    for i in range(1, m + 1):
        for ops in range(1, min(i, k) + 1):
            dp[i][0][ops] = dp[i-1][0][ops-1]
    
    # Insert into s1
    for j in range(1, n + 1):
        for ops in range(1, min(j, k) + 1):
            dp[0][j][ops] = dp[0][j-1][ops-1]
    
    # Fill table
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            for ops in range(k + 1):
                # Match (no operation)
                if s1[i-1] == s2[j-1]:
                    dp[i][j][ops] = dp[i][j][ops] or dp[i-1][j-1][ops]
                
                if ops > 0:
                    # Replace
                    dp[i][j][ops] = dp[i][j][ops] or dp[i-1][j-1][ops-1]
                    # Delete
                    dp[i][j][ops] = dp[i][j][ops] or dp[i-1][j][ops-1]
                    # Insert
                    dp[i][j][ops] = dp[i][j][ops] or dp[i][j-1][ops-1]
    
    # Check if possible with at most k operations
    for ops in range(k + 1):
        if dp[m][n][ops]:
            return True
    return False
```

**State:** `dp[i][j][ops]` = can we transform `s1[0:i]` to `s2[0:j]` with exactly `ops` operations?

## 2.5 Example: 3D DP — Best Time to Buy/Sell Stock with Cooldown

```python
def max_profit(prices):
    if not prices:
        return 0
    
    n = len(prices)
    # State: (day, holding_stock, cooldown)
    # holding: 0 or 1 (not holding or holding)
    
    # Simplified: 2D with implicit states
    # hold[i] = max profit on day i if holding stock
    # sold[i] = max profit on day i if just sold (cooldown next day)
    # rest[i] = max profit on day i if resting (can buy)
    
    hold = [0] * n
    sold = [0] * n
    rest = [0] * n
    
    hold[0] = -prices[0]
    sold[0] = 0
    rest[0] = 0
    
    for i in range(1, n):
        hold[i] = max(hold[i-1], rest[i-1] - prices[i])
        sold[i] = hold[i-1] + prices[i]
        rest[i] = max(rest[i-1], sold[i-1])
    
    return max(sold[n-1], rest[n-1])
```

**State transitions:**
```
rest[i] = max(rest[i-1], sold[i-1])
          (rest yesterday or cooldown from selling)

hold[i] = max(hold[i-1], rest[i-1] - prices[i])
          (held yesterday or buy today from rest)

sold[i] = hold[i-1] + prices[i]
          (must have held yesterday to sell today)
```

## 2.6 Example: 3D DP — Cherry Pickup

**Problem:** Pick maximum cherries going from (0,0) to (n-1,n-1) and back.

```python
def cherry_pickup(grid):
    n = len(grid)
    # State: (r1, c1, r2, c2) but r1+c1 = r2+c2 (same step count)
    # So we can use (r1, c1, r2) and compute c2 = r1+c1-r2
    
    # Simplified: Think as two people going forward simultaneously
    dp = [[[-1] * n for _ in range(n)] for _ in range(n)]
    
    def dfs(r1, c1, r2):
        c2 = r1 + c1 - r2
        
        # Out of bounds or blocked
        if (r1 >= n or c1 >= n or r2 >= n or c2 >= n or
            grid[r1][c1] == -1 or grid[r2][c2] == -1):
            return float('-inf')
        
        # Both reached bottom-right
        if r1 == n-1 and c1 == n-1:
            return grid[r1][c1]
        
        # Memoized
        if dp[r1][c1][r2] != -1:
            return dp[r1][c1][r2]
        
        # Collect cherries at current positions
        cherries = grid[r1][c1]
        if r1 != r2:  # Don't double count if same cell
            cherries += grid[r2][c2]
        
        # Try all 4 combinations of moves
        cherries += max(
            dfs(r1+1, c1, r2+1),  # both down
            dfs(r1+1, c1, r2),    # p1 down, p2 right
            dfs(r1, c1+1, r2+1),  # p1 right, p2 down
            dfs(r1, c1+1, r2)     # both right
        )
        
        dp[r1][c1][r2] = cherries
        return cherries
    
    result = dfs(0, 0, 0)
    return max(0, result)
```

**State:** Position of two people walking simultaneously.

## 2.7 Example: 4D DP — Two Players Game

**Problem:** Two players pick from two ends of array optimally.

```python
def predict_the_winner(nums):
    n = len(nums)
    # State: (left, right, turn)
    # But can optimize to 2D since turn can be derived
    
    # dp[i][j] = max advantage of current player for nums[i:j+1]
    dp = [[0] * n for _ in range(n)]
    
    # Base case: single element
    for i in range(n):
        dp[i][i] = nums[i]
    
    # Gap method
    for gap in range(1, n):
        for i in range(n - gap):
            j = i + gap
            # Pick left: nums[i] - dp[i+1][j]
            # (opponent gets advantage in remaining)
            pick_left = nums[i] - dp[i+1][j]
            # Pick right: nums[j] - dp[i][j-1]
            pick_right = nums[j] - dp[i][j-1]
            dp[i][j] = max(pick_left, pick_right)
    
    return dp[0][n-1] >= 0
```

## 2.8 Managing High-Dimensional DP

### Memory Optimization Strategies:

#### 1. **Rolling Array** (for dimensions that only need previous values)
```python
# Instead of dp[i][j][k]
# Use curr[j][k] and prev[j][k] if only need previous i
```

#### 2. **Dictionary/HashMap** (for sparse states)
```python
# If most states are never visited
dp = {}  # Use tuple as key: dp[(i, j, k)] = value
```

#### 3. **Implicit State** (reduce dimensions by deriving some variables)
```python
# If r + c = steps (same step count)
# Store dp[r][c] instead of dp[r][c][steps]
```

#### 4. **State Compression** (bit manipulation for boolean states)
```python
# If tracking which items are used (bitmask)
# state can be integer representing set of items
```

## 2.9 When to Use Multi-Dimensional DP

### ✅ Use When:
- Multiple independent variables affect state
- Can't derive one variable from others
- Each dimension has small range
- Clear transitions between states

### ❌ Avoid When:
- Too many dimensions (5+) → exponential memory
- Some dimensions have huge ranges
- States are very sparse → use memoization instead

## 2.10 Mental Checklist

```
□ How many variables define a subproblem?
□ What does each dimension represent?
□ What are the ranges of each dimension?
□ Can I derive any dimension from others?
□ What are the base cases for each dimension?
□ What are the transitions?
□ Can I optimize space by reducing dimensions?
□ Is memory feasible? (n^d for d dimensions)
```

---

# 3. Identifying Hard DP Problems

## 3.1 What Makes a DP Problem "Hard"?

### Difficulty Levels:

| Level | Characteristics | Examples |
|-------|----------------|----------|
| **Easy** | 1D, clear pattern, standard template | Climbing Stairs, House Robber |
| **Medium** | 2D, multiple choices, needs some insight | LCS, Coin Change, Unique Paths |
| **Hard** | 3D+, tricky state, non-obvious recurrence | Edit Distance with limit, Cherry Pickup |
| **Very Hard** | Multiple dimensions, optimization tricks, edge cases | Burst Balloons, Palindrome Partitioning III |

## 3.2 Red Flags: This is a Hard DP

### 🚩 Red Flag #1: Non-Obvious State Definition

**Example:** Cherry Pickup
- Not just "max cherries from (0,0) to (n-1,n-1)"
- Need to think: "Two people going forward simultaneously"

**Tip:** If you can't immediately see what `dp[i]` should represent, it's hard.

### 🚩 Red Flag #2: Optimization Within Optimization

**Example:** Best Time to Buy/Sell Stock with K Transactions
- Optimize profit (outer optimization)
- While tracking limited transactions (inner constraint)
- Multiple states: day, transactions, holding_stock

### 🚩 Red Flag #3: Tricky Base Cases

**Example:** Palindrome Partitioning
- Need to pre-compute palindrome table
- Multiple interacting DPs

### 🚩 Red Flag #4: Non-Standard Transitions

**Example:** Burst Balloons
- Think "which to burst LAST" not "first"
- Counter-intuitive approach

### 🚩 Red Flag #5: Multiple Constraints

**Example:** Profitable Schemes
- Constraint 1: At most n people
- Constraint 2: At least minProfit profit
- Constraint 3: Choose from m crimes
- State: `dp[crimes][people][profit]`

### 🚩 Red Flag #6: Reverse Thinking Required

**Example:** Stone Game variants
- Think from opponent's perspective
- Minimax strategy

## 3.3 Pattern Recognition for Hard DP

### Pattern 1: **Interval DP with Twist**

**Characteristics:**
- Standard interval [i, j] structure
- But with additional constraints or modifications

**Examples:**
- Burst Balloons (burst last, not first)
- Remove Boxes (same color boxes, not adjacent)
- Strange Printer (minimize prints, overlapping)

**Approach:**
- Start with gap method template
- Identify the "twist"
- Adjust state/transitions accordingly

---

### Pattern 2: **Multi-Path DP**

**Characteristics:**
- Multiple entities moving/acting
- Paths can interact or be independent
- Need to track all paths simultaneously

**Examples:**
- Cherry Pickup (two people)
- Paint House III (multiple houses, constraints)

**Approach:**
- Think of entities moving together
- State includes position of all entities
- Be careful about double-counting

---

### Pattern 3: **DP with Game Theory**

**Characteristics:**
- Two players playing optimally
- Minimax strategy
- Current player maximizes, opponent minimizes

**Examples:**
- Stone Game variants
- Predict the Winner

**Approach:**
```python
dp[i][j] = max advantage current player can get
         = max(
             value_at_i - dp[i+1][j],
             value_at_j - dp[i][j-1]
           )
```

---

### Pattern 4: **Constrained Optimization DP**

**Characteristics:**
- Optimize something
- With K constraints/limitations
- Each constraint adds a dimension

**Examples:**
- Best Time to Buy/Sell Stock (K transactions, cooldown)
- Profitable Schemes (people limit, profit threshold)

**Approach:**
- Add dimension for each constraint
- Track constraint usage in state
- Careful with base cases for constraints

---

### Pattern 5: **DP on Strings with Operations**

**Characteristics:**
- String manipulation
- Multiple types of operations
- Need to track operation types/counts

**Examples:**
- Regular Expression Matching
- Wildcard Matching
- Scramble String

**Approach:**
- State includes positions in both strings
- Transitions based on operation types
- Many edge cases to handle

---

### Pattern 6: **Probability DP**

**Characteristics:**
- Compute probabilities
- Expected values
- Transitions are probabilistic

**Examples:**
- Knight Probability in Chessboard
- Soup Servings
- New 21 Game

**Approach:**
```python
dp[state] = sum(probability * dp[next_state] 
                for each possible next_state)
```

---

## 3.4 How to Approach Hard DP in Interviews

### Step-by-Step Strategy:

```
1. DON'T PANIC
   Hard DP is meant to be hard. Take your time.

2. START WITH BRUTE FORCE
   How would you solve with recursion/backtracking?

3. IDENTIFY OVERLAPPING SUBPROBLEMS
   Where are you solving the same thing repeatedly?

4. DEFINE STATE CAREFULLY
   This is the HARDEST part. Take time here.
   Ask yourself: "What information do I NEED to solve subproblem?"

5. WRITE RECURRENCE IN WORDS
   Before code, explain the logic verbally.

6. CODE MEMOIZATION FIRST
   Top-down is easier to debug.

7. TEST WITH SMALL EXAMPLES
   Manually trace through.

8. OPTIMIZE IF TIME PERMITS
   Convert to bottom-up, optimize space.
```

### Interview Communication:

**Bad:**
> "I'm not sure... maybe DP? Let me try..."

**Good:**
> "This looks like DP because I see overlapping subproblems. Let me define the state. I think `dp[i][j]` should represent... Actually, I also need to track [constraint], so maybe `dp[i][j][k]`. Let me verify this works for the base case..."

Show your **thought process**, not just the answer.

## 3.5 Common Mistakes in Hard DP

| Mistake | Why It Happens | How to Avoid |
|---------|---------------|--------------|
| Wrong state definition | Rushing to code | Spend time on state design |
| Missing dimension | Not tracking all variables | List all factors affecting decision |
| Wrong base cases | Not considering edge cases | Test base cases separately |
| Wrong iteration order | Dependencies not met | Draw dependency graph |
| Off-by-one errors | Index confusion | Use meaningful variable names |
| Forgetting to memoize | Implementation error | Always check if state is cached |

## 3.6 Practice Strategy for Hard DP

```
Week 1: Easy DP (10-15 problems)
        → Build pattern recognition

Week 2: Medium DP (15-20 problems)
        → Understand state transitions

Week 3: Hard DP (10-15 problems)
        → Start with hints, then solo

Week 4: Very Hard DP (5-10 problems)
        → Accept you'll struggle. That's OK.

Week 5+: Mix of all levels
         → Maintain skills
```

**Key:** Don't just read solutions. **Struggle first**, then learn.

---

# 4. Optimization Strategies

## 4.1 Space Optimization Techniques

### Technique 1: **Rolling Array**

**When to Use:** Current row only depends on previous row.

**Before:**
```python
dp = [[0] * n for _ in range(m)]
for i in range(m):
    for j in range(n):
        dp[i][j] = f(dp[i-1][j], dp[i][j-1])
```

**After:**
```python
prev = [0] * n
curr = [0] * n
for i in range(m):
    for j in range(n):
        curr[j] = f(prev[j], curr[j-1])
    prev, curr = curr, prev
```

**Space:** O(m×n) → O(n)

---

### Technique 2: **In-Place Update**

**When to Use:** Can update array in-place without losing needed values.

**Before:**
```python
dp = [0] * n
for i in range(1, n):
    new_dp = [0] * n
    for j in range(n):
        new_dp[j] = f(dp[j-1])
    dp = new_dp
```

**After:**
```python
dp = [0] * n
for i in range(1, n):
    for j in range(n-1, -1, -1):  # Right to left!
        dp[j] = f(dp[j-1])
```

**Key:** Iterate in reverse to avoid overwriting values you need.

---

### Technique 3: **State Compression (Bitmask)**

**When to Use:** State is a subset of items (which items are used).

**Example:** Traveling Salesman Problem

**Before:**
```python
# visited = set of visited cities
dp[(city, tuple(visited))]  # Tuple as key, slow
```

**After:**
```python
# visited = bitmask (bit i = 1 if city i visited)
dp[(city, visited)]  # Integer, fast!
```

**Operations:**
```python
# Add city i to visited
visited |= (1 << i)

# Check if city i is visited
if visited & (1 << i):
    ...

# Remove city i
visited &= ~(1 << i)
```

---

### Technique 4: **Sparse DP (Dictionary)**

**When to Use:** Most states are never reached.

**Before:**
```python
dp = [[[0] * P for _ in range(N)] for _ in range(M)]
# Wastes space if most dp[i][j][k] = 0
```

**After:**
```python
dp = {}  # Only store non-zero states
dp[(i, j, k)] = value
```

---

### Technique 5: **Coordinate Compression**

**When to Use:** Dimensions have huge range but few actual values.

**Example:** Values can be up to 10^9, but only 100 unique values.

```python
# Compress coordinates
unique_values = sorted(set(all_values))
compressed = {v: i for i, v in enumerate(unique_values)}

# Use compressed indices in DP
dp = [0] * len(unique_values)
```

---

## 4.2 Time Optimization Techniques

### Technique 1: **Monotonic Queue/Stack Optimization**

**When to Use:** Need min/max in sliding window during DP.

**Problem:** House Robber with window constraint (can't rob within K houses).

**Naive:** O(n×k)
```python
for i in range(n):
    for j in range(max(0, i-k), i):
        dp[i] = max(dp[i], dp[j] + nums[i])
```

**Optimized with Monotonic Queue:** O(n)
```python
from collections import deque

dq = deque()
for i in range(n):
    # Remove old elements outside window
    while dq and dq[0] < i - k:
        dq.popleft()
    
    # dp[i] = max in window + nums[i]
    dp[i] = (dp[dq[0]] if dq else 0) + nums[i]
    
    # Maintain decreasing queue
    while dq and dp[dq[-1]] <= dp[i]:
        dq.pop()
    dq.append(i)
```

---

### Technique 2: **Matrix Exponentiation**

**When to Use:** Linear recurrence with huge n.

**Problem:** Fibonacci with n = 10^18

**Naive:** O(n) - Too slow!

**Optimized with Matrix Exponentiation:** O(log n)
```python
def matrix_mult(A, B):
    return [[A[0][0]*B[0][0] + A[0][1]*B[1][0],
             A[0][0]*B[0][1] + A[0][1]*B[1][1]],
            [A[1][0]*B[0][0] + A[1][1]*B[1][0],
             A[1][0]*B[0][1] + A[1][1]*B[1][1]]]

def matrix_pow(M, n):
    if n == 1:
        return M
    if n % 2 == 0:
        half = matrix_pow(M, n // 2)
        return matrix_mult(half, half)
    else:
        return matrix_mult(M, matrix_pow(M, n - 1))

def fib(n):
    if n <= 1:
        return n
    M = [[1, 1], [1, 0]]
    result = matrix_pow(M, n)
    return result[0][1]
```

**Recurrence:** `[F(n), F(n-1)] = [[1,1],[1,0]]^n * [1, 0]`

---

### Technique 3: **Convex Hull Optimization (CHT)**

**When to Use:** DP with transition like `dp[i] = min(dp[j] + cost[j] * val[i])`

**Reduces:** O(n²) → O(n log n) or O(n)

**Advanced topic** - used in problems like:
- USACO Commute
- Convex Hull Trick problems

---

### Technique 4: **Divide and Conquer Optimization**

**When to Use:** DP where optimal split point is monotonic.

**Problem:** `dp[i][j] = min(dp[i-1][k] + cost[k][j])` for k < j

**If:** optimal k is monotonically increasing with j

**Reduces:** O(k×n²) → O(k×n log n)

---

### Technique 5: **Knuth's Optimization**

**When to Use:** Interval DP with special cost function properties.

**If cost satisfies:**
- Quadrangle inequality
- Monotonicity

**Reduces:** O(n³) → O(n²)

**Example:** Optimal Binary Search Tree

---

## 4.3 Optimization Decision Tree

```
Can I reduce space?
├─ YES: Current depends only on previous?
│   └─ Use rolling array / in-place update
├─ YES: Most states never visited?
│   └─ Use dictionary (sparse DP)
└─ NO: Need all states
    └─ Consider state compression

Can I reduce time?
├─ YES: Need min/max in window?
│   └─ Use monotonic queue/stack
├─ YES: Linear recurrence, huge n?
│   └─ Matrix exponentiation
├─ YES: Transition has specific structure?
│   └─ CHT, D&C, Knuth optimization
└─ NO: Accept current complexity
```

## 4.4 When NOT to Optimize

### ⚠️ Don't Optimize If:

1. **In interview and time is limited**
   - Get working solution first
   - Mention optimization as follow-up

2. **Optimization makes code unreadable**
   - Unless specifically asked for optimal solution

3. **Current solution passes time limit**
   - "Premature optimization is the root of all evil"

4. **You're not 100% sure optimization is correct**
   - Working O(n²) > Broken O(n)

---

# 5. Time Complexity Mastery

## 5.1 Quick Complexity Estimation

### For Standard DP Patterns:

| Pattern | States | Time per State | Total Time |
|---------|--------|---------------|------------|
| 1D Linear | O(n) | O(1) | **O(n)** |
| 1D with Loop | O(n) | O(n) | **O(n²)** |
| 2D Grid | O(m×n) | O(1) | **O(m×n)** |
| 2D Sequence | O(m×n) | O(1) | **O(m×n)** |
| Interval DP | O(n²) | O(n) | **O(n³)** |
| 3D DP | O(n³) | O(1) | **O(n³)** |
| Knapsack | O(n×W) | O(1) | **O(n×W)** |

### Mental Math Shortcuts:

```
n ≤ 10          → O(n!) is OK
n ≤ 20          → O(2^n) is OK
n ≤ 500         → O(n³) is OK
n ≤ 5,000       → O(n²) is OK
n ≤ 100,000     → O(n log n) is OK
n ≤ 1,000,000   → O(n) is OK
n > 1,000,000   → O(log n) or O(1) needed
```

## 5.2 Complexity Analysis Examples

### Example 1: LCS
```python
def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n+1) for _ in range(m+1)]
    
    for i in range(1, m+1):          # O(m)
        for j in range(1, n+1):      # O(n)
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1    # O(1)
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])  # O(1)
    
    return dp[m][n]
```

**Analysis:**
- States: O(m×n)
- Time per state: O(1)
- **Total: O(m×n)**
- **Space: O(m×n)**

---

### Example 2: Burst Balloons
```python
def max_coins(nums):
    balloons = [1] + nums + [1]
    n = len(balloons)
    dp = [[0] * n for _ in range(n)]
    
    for gap in range(2, n):              # O(n)
        for left in range(n-gap):        # O(n)
            right = left + gap
            for i in range(left+1, right):  # O(n)
                coins = balloons[left] * balloons[i] * balloons[right]
                coins += dp[left][i] + dp[i][right]
                dp[left][right] = max(dp[left][right], coins)
```

**Analysis:**
- States: O(n²) intervals
- Time per state: O(n) to try all split points
- **Total: O(n³)**
- **Space: O(n²)**

---

### Example 3: 0/1 Knapsack
```python
def knapsack(values, weights, capacity):
    n = len(values)
    dp = [[0] * (capacity+1) for _ in range(n+1)]
    
    for i in range(1, n+1):               # O(n)
        for w in range(1, capacity+1):    # O(capacity)
            if weights[i-1] <= w:
                dp[i][w] = max(
                    dp[i-1][w],
                    dp[i-1][w-weights[i-1]] + values[i-1]
                )  # O(1)
            else:
                dp[i][w] = dp[i-1][w]
```

**Analysis:**
- States: O(n × capacity)
- Time per state: O(1)
- **Total: O(n × capacity)**
- **Space: O(n × capacity)** → optimizable to O(capacity)

**Note:** This is **pseudo-polynomial** time! (Depends on value, not size)

---

### Example 4: Edit Distance with K Operations
```python
def is_transformable(s1, s2, k):
    m, n = len(s1), len(s2)
    dp = [[[False]*(k+1) for _ in range(n+1)] for _ in range(m+1)]
    
    # ... initialization ...
    
    for i in range(1, m+1):        # O(m)
        for j in range(1, n+1):    # O(n)
            for ops in range(k+1): # O(k)
                # 4 operations to check
                ...  # O(1) each
```

**Analysis:**
- States: O(m × n × k)
- Time per state: O(1)
- **Total: O(m × n × k)**
- **Space: O(m × n × k)**

---

## 5.3 Amortized Analysis

Some DP solutions have better **amortized** complexity than worst-case.

### Example: Fibonacci with Memoization

```python
@lru_cache(None)
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)
```

**First call to fib(n):**
- Computes fib(0), fib(1), ..., fib(n) once each
- O(n) time

**Subsequent calls:**
- O(1) each (cached)

**Amortized over multiple calls:** Very efficient!

---

## 5.4 Space-Time Trade-offs

Sometimes you can trade space for time or vice versa.

| Optimization | Time | Space | When to Use |
|--------------|------|-------|-------------|
| Full DP table | Faster | O(n²) | Space available |
| Rolling array | Same | O(n) | Space limited, time critical |
| Recompute on demand | Slower | O(1) | Severe space constraints |
| Sparse (dict) | Slower access | O(used) | Most states unused |

---

## 5.5 Recognizing Optimal Complexity

### How to Know if Your Solution is Optimal?

1. **Compare with lower bound:**
   - Must read all input: Ω(n)
   - Must compare all pairs: Ω(n²)
   - If your solution matches lower bound → optimal!

2. **Check problem constraints:**
   - If n ≤ 1000 and you have O(n²) → likely optimal
   - If n ≤ 10^6 and you have O(n) → likely optimal

3. **Look for inherent complexity:**
   - Sorting-based: at least O(n log n)
   - Comparing all pairs: at least O(n²)
   - Interval DP: usually O(n³)

### Red Flags Your Solution Might Not Be Optimal:

- Your O(n³) but problem has n ≤ 10^5 (too slow!)
- You're recomputing same values
- You have nested loops that could be optimized

---

# 6. LIVE Problem Solving Patterns

## 6.1 Pattern 1: Interval DP (Gap Method)

### Problem: Minimum Score Triangulation of Polygon

**Description:** Given polygon with n vertices, split into triangles to minimize total score.

```python
def min_score_triangulation(values):
    n = len(values)
    dp = [[0] * n for _ in range(n)]
    
    # Gap method: iterate by interval length
    for gap in range(2, n):
        for i in range(n - gap):
            j = i + gap
            dp[i][j] = float('inf')
            
            # Try all points k to form triangle (i, k, j)
            for k in range(i + 1, j):
                cost = values[i] * values[k] * values[j]
                dp[i][j] = min(dp[i][j], 
                              dp[i][k] + dp[k][j] + cost)
    
    return dp[0][n-1]
```

**Time:** O(n³)  
**Space:** O(n²)

---

### Problem: Remove Boxes

**Description:** Given boxes with colors, remove k consecutive boxes of same color to get k² points. Maximize points.

```python
def remove_boxes(boxes):
    n = len(boxes)
    # dp[i][j][k] = max points for boxes[i:j+1] with k boxes of same color as boxes[j] attached
    dp = [[[0] * n for _ in range(n)] for _ in range(n)]
    
    def calculate(i, j, k):
        if i > j:
            return 0
        if dp[i][j][k] > 0:
            return dp[i][j][k]
        
        # Count consecutive same-color boxes before j
        while i < j and boxes[j] == boxes[j-1]:
            j -= 1
            k += 1
        
        # Option 1: Remove j with its k attached boxes
        dp[i][j][k] = calculate(i, j-1, 0) + (k+1) * (k+1)
        
        # Option 2: Find earlier box with same color, remove middle first
        for m in range(i, j):
            if boxes[m] == boxes[j]:
                dp[i][j][k] = max(dp[i][j][k],
                                 calculate(i, m, k+1) + calculate(m+1, j-1, 0))
        
        return dp[i][j][k]
    
    return calculate(0, n-1, 0)
```

**Time:** O(n⁴)  
**Space:** O(n³)

**Key Insight:** Track attached boxes of same color!

---

## 6.2 Pattern 2: Multi-Path DP

### Problem: Cherry Pickup

**Description:** Go from (0,0) to (n-1,n-1) and back, maximize cherries.

```python
def cherry_pickup(grid):
    n = len(grid)
    # Two people go forward simultaneously
    # dp[r1][c1][r2] where c2 = r1+c1-r2
    dp = {}
    
    def dfs(r1, c1, r2):
        c2 = r1 + c1 - r2
        
        # Out of bounds or obstacle
        if (r1 >= n or c1 >= n or r2 >= n or c2 >= n or
            grid[r1][c1] == -1 or grid[r2][c2] == -1):
            return float('-inf')
        
        # Both reached end
        if r1 == n-1 and c1 == n-1:
            return grid[r1][c1]
        
        # Memoized
        if (r1, c1, r2) in dp:
            return dp[(r1, c1, r2)]
        
        # Collect cherries
        result = grid[r1][c1]
        if r1 != r2:  # Different cells
            result += grid[r2][c2]
        
        # Try all 4 move combinations
        result += max(
            dfs(r1+1, c1, r2+1),
            dfs(r1, c1+1, r2+1),
            dfs(r1+1, c1, r2),
            dfs(r1, c1+1, r2)
        )
        
        dp[(r1, c1, r2)] = result
        return result
    
    return max(0, dfs(0, 0, 0))
```

---

### Problem: Cherry Pickup II

**Description:** Two robots start at top, move down simultaneously, maximize cherries.

```python
def cherry_pickup_ii(grid):
    m, n = len(grid), len(grid[0])
    # dp[row][col1][col2] = max cherries
    dp = {}
    
    def dfs(row, col1, col2):
        # Out of bounds
        if col1 < 0 or col1 >= n or col2 < 0 or col2 >= n:
            return float('-inf')
        
        # Bottom row reached
        if row == m:
            return 0
        
        # Memoized
        if (row, col1, col2) in dp:
            return dp[(row, col1, col2)]
        
        # Collect cherries
        result = grid[row][col1]
        if col1 != col2:
            result += grid[row][col2]
        
        # Try all 9 combinations of moves (3×3)
        max_below = float('-inf')
        for dc1 in [-1, 0, 1]:
            for dc2 in [-1, 0, 1]:
                max_below = max(max_below, 
                               dfs(row+1, col1+dc1, col2+dc2))
        
        result += max_below
        dp[(row, col1, col2)] = result
        return result
    
    return dfs(0, 0, n-1)
```

**Time:** O(m × n² × 9) = O(m × n²)  
**Space:** O(m × n²)

---

## 6.3 Pattern 3: Game Theory DP

### Problem: Stone Game

**Description:** Two players pick from ends of array optimally. Player 1 maximizes, Player 2 minimizes.

```python
def stone_game(piles):
    n = len(piles)
    # dp[i][j] = max advantage player can get for piles[i:j+1]
    dp = [[0] * n for _ in range(n)]
    
    # Base case: single pile
    for i in range(n):
        dp[i][i] = piles[i]
    
    # Gap method
    for gap in range(1, n):
        for i in range(n - gap):
            j = i + gap
            # Pick left: get piles[i], opponent gets advantage in [i+1, j]
            pick_left = piles[i] - dp[i+1][j]
            # Pick right: get piles[j], opponent gets advantage in [i, j-1]
            pick_right = piles[j] - dp[i][j-1]
            dp[i][j] = max(pick_left, pick_right)
    
    return dp[0][n-1] > 0
```

**Key Insight:** Advantage = my_score - opponent_score

---

### Problem: Stone Game II

**Description:** Pick X piles (1 ≤ X ≤ 2M), then M = max(M, X).

```python
def stone_game_ii(piles):
    n = len(piles)
    # Suffix sums for quick range sum
    suffix = [0] * n
    suffix[-1] = piles[-1]
    for i in range(n-2, -1, -1):
        suffix[i] = suffix[i+1] + piles[i]
    
    # dp[i][m] = max stones current player can get from piles[i:] with M=m
    dp = {}
    
    def dfs(i, m):
        if i >= n:
            return 0
        if i + 2*m >= n:
            # Can take all remaining
            return suffix[i]
        if (i, m) in dp:
            return dp[(i, m)]
        
        # Try taking 1 to 2*m piles
        max_stones = 0
        for x in range(1, 2*m + 1):
            # Get piles[i:i+x], opponent plays optimally
            current = suffix[i] - dfs(i+x, max(m, x))
            max_stones = max(max_stones, current)
        
        dp[(i, m)] = max_stones
        return max_stones
    
    return dfs(0, 1)
```

---

## 6.4 Pattern 4: DP with Constraints

### Problem: Best Time to Buy/Sell Stock with Transaction Fee

**Description:** At most K transactions, with fee per transaction.

```python
def max_profit(k, prices, fee):
    if not prices:
        return 0
    
    n = len(prices)
    # dp[i][j][0] = max profit on day i with j transactions, not holding
    # dp[i][j][1] = max profit on day i with j transactions, holding
    
    # Space optimized: only need previous day
    dp = [[0, 0] for _ in range(k+1)]
    
    # Initially, if holding, we must have bought
    for j in range(k+1):
        dp[j][1] = -prices[0]
    
    for i in range(1, n):
        new_dp = [[0, 0] for _ in range(k+1)]
        for j in range(k+1):
            # Not holding: either didn't hold yesterday, or sold today
            new_dp[j][0] = max(dp[j][0], dp[j][1] + prices[i] - fee)
            
            # Holding: either held yesterday, or bought today
            if j > 0:
                new_dp[j][1] = max(dp[j][1], dp[j-1][0] - prices[i])
            else:
                new_dp[j][1] = dp[j][1]
        
        dp = new_dp
    
    return max(state[0] for state in dp)
```

---

### Problem: Profitable Schemes

**Description:** n people, m crimes, each crime has people needed and profit. Count schemes with ≥ minProfit.

```python
def profitable_schemes(n, min_profit, group, profit):
    MOD = 10**9 + 7
    # dp[people][earned] = number of ways
    dp = [[0] * (min_profit + 1) for _ in range(n + 1)]
    dp[0][0] = 1
    
    for g, p in zip(group, profit):
        # Iterate backwards to avoid using same crime twice
        new_dp = [row[:] for row in dp]
        for people in range(g, n + 1):
            for earned in range(min_profit + 1):
                # Use this crime
                new_earned = min(min_profit, earned + p)
                new_dp[people][new_earned] += dp[people - g][earned]
                new_dp[people][new_earned] %= MOD
        dp = new_dp
    
    # Sum all ways with ≥ minProfit using ≤ n people
    result = 0
    for people in range(n + 1):
        result = (result + dp[people][min_profit]) % MOD
    
    return result
```

---

## 6.5 Pattern 5: String DP with Operations

### Problem: Regular Expression Matching

**Description:** Match string with pattern containing '.' and '*'.

```python
def is_match(s, p):
    m, n = len(s), len(p)
    # dp[i][j] = does s[0:i] match p[0:j]?
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    
    # Base case: empty matches empty
    dp[0][0] = True
    
    # Pattern like a* can match empty
    for j in range(2, n + 1):
        if p[j-1] == '*':
            dp[0][j] = dp[0][j-2]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j-1] == '*':
                # Option 1: * matches zero occurrences
                dp[i][j] = dp[i][j-2]
                
                # Option 2: * matches one or more
                if p[j-2] == s[i-1] or p[j-2] == '.':
                    dp[i][j] = dp[i][j] or dp[i-1][j]
            elif p[j-1] == '.' or p[j-1] == s[i-1]:
                # Characters match
                dp[i][j] = dp[i-1][j-1]
    
    return dp[m][n]
```

---

### Problem: Wildcard Matching

**Description:** Match string with pattern containing '?' and '*'.

```python
def is_match_wildcard(s, p):
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    
    dp[0][0] = True
    
    # Pattern starting with * can match empty
    for j in range(1, n + 1):
        if p[j-1] == '*':
            dp[0][j] = dp[0][j-1]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j-1] == '*':
                # * can match empty or any sequence
                dp[i][j] = dp[i][j-1] or dp[i-1][j]
            elif p[j-1] == '?' or p[j-1] == s[i-1]:
                dp[i][j] = dp[i-1][j-1]
    
    return dp[m][n]
```

---

## 6.6 Pattern 6: Probability DP

### Problem: Knight Probability in Chessboard

**Description:** Knight makes K moves on N×N board, find probability it stays on board.

```python
def knight_probability(n, k, row, col):
    # Possible knight moves
    moves = [(-2,-1),(-2,1),(-1,-2),(-1,2),
             (1,-2),(1,2),(2,-1),(2,1)]
    
    # dp[r][c] = probability of being at (r,c)
    dp = [[0] * n for _ in range(n)]
    dp[row][col] = 1
    
    for _ in range(k):
        new_dp = [[0] * n for _ in range(n)]
        
        for r in range(n):
            for c in range(n):
                if dp[r][c] > 0:
                    # Try all 8 moves
                    for dr, dc in moves:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < n and 0 <= nc < n:
                            # Each move has probability 1/8
                            new_dp[nr][nc] += dp[r][c] / 8
        
        dp = new_dp
    
    # Sum all probabilities (knight on board)
    return sum(sum(row) for row in dp)
```

**Time:** O(k × n²)  
**Space:** O(n²)

---

## 6.7 Master Problem-Solving Checklist (Hard DP)

```
□ UNDERSTAND DEEPLY
  □ What exactly am I optimizing/counting?
  □ What are ALL the constraints?
  □ What makes this problem "hard"?

□ IDENTIFY THE TWIST
  □ Is it standard pattern + twist?
  □ What's non-obvious about the state?
  □ Is there a counter-intuitive insight?

□ TRY SMALL EXAMPLES
  □ Work through n=2, n=3 manually
  □ Identify the pattern
  □ How would I extend this?

□ DEFINE STATE CAREFULLY
  □ List ALL factors affecting decision
  □ Do I need multiple dimensions?
  □ Can I derive any dimension?
  □ What does dp[...] represent IN WORDS?

□ WRITE RECURRENCE
  □ How do I break into subproblems?
  □ What are my choices?
  □ How do I combine results?

□ CHECK DEPENDENCIES
  □ What order should I compute states?
  □ Gap method needed?
  □ Can I use memoization to avoid ordering?

□ HANDLE EDGE CASES
  □ Empty input?
  □ Single element?
  □ All same values?
  □ Maximum constraints?

□ CODE & TEST
  □ Start with memoization (easier)
  □ Test on small examples
  □ Check boundary conditions

□ OPTIMIZE IF NEEDED
  □ Can I reduce space?
  □ Can I reduce time?
  □ Is current complexity acceptable?
```

---

# 📋 Quick Reference Card

## Hard DP Patterns

| Pattern | Key Insight | Example |
|---------|------------|---------|
| **Gap Method** | Iterate by interval length | Matrix Chain, Burst Balloons |
| **Multi-Path** | Track multiple entities | Cherry Pickup |
| **Game Theory** | Advantage = my score - opponent | Stone Game |
| **With Constraints** | Add dimension per constraint | Stock with K transactions |
| **String Operations** | Position in both + operation | Regex Matching |
| **Probability** | Sum of probabilities | Knight Probability |

## Optimization Techniques

| Technique | From → To | When to Use |
|-----------|-----------|-------------|
| Rolling Array | O(m×n) → O(n) | Current depends on previous |
| In-Place | O(n) extra → O(1) | Careful iteration order |
| Bitmask | Subset tracking | State is set of items |
| Sparse DP | O(n²) → O(used) | Most states unused |
| Monotonic Queue | O(n×k) → O(n) | Min/max in window |
| Matrix Exp | O(n) → O(log n) | Linear recurrence, huge n |

## Complexity Benchmarks

```
n ≤ 10         → O(n!) or O(2^n × n²)
n ≤ 20         → O(2^n × n)
n ≤ 100        → O(n³)
n ≤ 500        → O(n² × log n)
n ≤ 10^4       → O(n²)
n ≤ 10^5       → O(n × log n) or O(n√n)
n ≤ 10^6       → O(n)
n > 10^6       → O(log n) or O(1)
```

---

**🎯 You're now equipped to tackle the HARDEST DP problems in FAANG interviews!**

Master these patterns, and you'll be in the top 5% of candidates.

---

*End of Week 3: Advanced Dynamic Programming Complete Notes*
