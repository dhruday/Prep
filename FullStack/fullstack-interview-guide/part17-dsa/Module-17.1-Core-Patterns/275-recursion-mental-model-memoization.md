# Recursion Mental Model and Memoization
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Recursion mental model**: trust the function; define what it returns for the BASE CASE first; then assume it works correctly for a SMALLER input and write the RECURSIVE CASE using that result; never trace through every level — that's what breaks your thinking under pressure
- **Base case first, always**: if the base case is wrong, everything is wrong; common base cases: empty array → return 0 or [], null node → return 0 or null, n==0 or n==1 → return the trivial answer
- **The call stack**: each recursive call adds a stack frame; a list of 10,000 elements → 10,000 stack frames → StackOverflowError; always ask "what is the recursion depth?" if it's > 10,000, consider iteration instead
- **Memoization = cache the work**: if the same subproblem is solved more than once (overlapping subproblems), store its result in a HashMap keyed on the input; `memo.put(n, result)` before returning; check `memo.containsKey(n)` at the start; turns exponential O(2^n) into polynomial O(n)
- **Top-down vs bottom-up**: memoization is top-down (recursive, cache results); tabulation is bottom-up (iterative, fill a table); both give the same time complexity; top-down is easier to reason about; bottom-up avoids stack overflow and is usually faster due to no function call overhead
- **Fibonacci without memoization**: O(2^n) tree of calls; WITH memoization: O(n) unique calls, O(n) time, O(n) space — demonstrating memoization impact is the most common interview illustration

---

## 1. One-Line Definition
Recursion solves a problem by breaking it into a smaller version of the same problem until reaching a base case; memoization prevents redundant work by caching the answer to each unique subproblem the first time it's computed.

---

## 2. The Problem It Solves

Calculating Fibonacci(40) without memoization: `fib(40)` calls `fib(39)` and `fib(38)`; `fib(39)` calls `fib(38)` and `fib(37)`; `fib(38)` is computed twice, `fib(37)` three times, and so on. The call tree has 2^40 ≈ 1 trillion nodes. It takes minutes on modern hardware.

With memoization: `fib(38)` is computed once, stored in a map. The second call to `fib(38)` returns instantly from the cache. The call tree collapses to 40 unique nodes — one per distinct input. Runtime: microseconds.

This pattern underlies real product features:
- Calculating the minimum cost path through a decision tree (pricing engine, delivery routing)
- Counting unique ways to arrange products in a grid (layout generation)
- Parsing nested expressions in a rule engine

---

## 3. How It Works Internally

### The Recursion Trust Model

```
Problem: Find the sum of all elements in an array.

Step 1 — Base case: empty array → return 0
Step 2 — Recursive case: assume sum([rest of array]) works correctly
          sum([first, ...rest]) = first + sum([rest])

DO NOT trace through this. Trust it.

sum([1, 2, 3, 4])
= 1 + sum([2, 3, 4])   ← trust this returns 9
= 1 + 9 = 10 ✓
```

### Fibonacci Call Tree — Without vs With Memoization

```
WITHOUT MEMOIZATION — fib(5) = 25 calls, fib(40) = 2^40 calls

                fib(5)
               /      \
           fib(4)    fib(3)
           /   \     /   \
       fib(3) fib(2) fib(2) fib(1)   ← fib(3) AND fib(2) computed TWICE
       / \    ...    ...

WITH MEMOIZATION — fib(5) = 9 calls, fib(n) = O(n) calls

fib(5)
 ↓ calls fib(4)
   ↓ calls fib(3)
     ↓ calls fib(2)
       ↓ calls fib(1) → return 1 (cached)
       ↓ calls fib(0) → return 0 (cached)
       return 1 → cache memo[2]=1
     ↓ calls fib(1) → return 1 (from cache, instant)
     return 2 → cache memo[3]=2
   ↓ calls fib(2) → return 1 (from cache, instant)
   return 3 → cache memo[4]=3
 ↓ calls fib(3) → return 2 (from cache, instant)
 return 5 → cache memo[5]=5
```

---

## 4. The Code

### Wrong Way — No Base Case, No Memoization

```java
// ❌ WRONG 1: Missing base case — infinite recursion, StackOverflowError

public int factorial(int n) {
    // ❌ No base case! factorial(0) calls factorial(-1) → factorial(-2) → ...
    return n * factorial(n - 1);
}
```

```java
// ❌ WRONG 2: Fibonacci without memoization — exponential time

public int fib(int n) {
    if (n <= 1) return n;   // base case is correct
    return fib(n - 1) + fib(n - 2);  // ❌ no caching — fib(38) computed 2^12 times
}
// fib(45) takes ~30 seconds on a modern CPU
// fib(100) effectively never finishes
```

```java
// ❌ WRONG 3: Memoization with wrong cache key (for multi-parameter problems)

Map<Integer, Integer> memo = new HashMap<>();

// For a problem with params (amount, coinIndex):
public int coinChange(int amount, int coinIndex, int[] coins) {
    // ❌ Caching only on amount — ignores coinIndex
    // Same amount with different coinIndex = different subproblem
    if (memo.containsKey(amount)) return memo.get(amount);
    
    // ... logic ...
    
    memo.put(amount, result);  // ❌ wrong key
    return result;
}
// Produces wrong answers for problems with 2+ parameters
// Cache key must encode ALL parameters that define the subproblem
```

### Right Way — Trust, Base Case, Memoization

```java
// ✅ FIBONACCI with top-down memoization

public int fib(int n) {
    return fibHelper(n, new HashMap<>());
}

private int fibHelper(int n, Map<Integer, Integer> memo) {
    // ✅ Base case FIRST
    if (n <= 1) return n;
    
    // ✅ Cache hit — return immediately
    if (memo.containsKey(n)) return memo.get(n);
    
    // ✅ Recursive case — trust the smaller subproblems
    int result = fibHelper(n - 1, memo) + fibHelper(n - 2, memo);
    
    // ✅ Store before returning
    memo.put(n, result);
    return result;
}
// Time: O(n), Space: O(n) for memo + O(n) call stack
```

```java
// ✅ COIN CHANGE — Memoization with composite key

public int coinChange(int[] coins, int amount) {
    Map<Integer, Integer> memo = new HashMap<>();
    int result = helper(coins, amount, memo);
    return result == Integer.MAX_VALUE ? -1 : result;
}

private int helper(int[] coins, int remaining, Map<Integer, Integer> memo) {
    // ✅ Base cases
    if (remaining == 0) return 0;       // ← used exactly the right amount
    if (remaining < 0) return Integer.MAX_VALUE;  // ← overshot — invalid path
    
    // ✅ Cache hit
    if (memo.containsKey(remaining)) return memo.get(remaining);
    
    int min = Integer.MAX_VALUE;
    
    for (int coin : coins) {
        int sub = helper(coins, remaining - coin, memo);
        if (sub != Integer.MAX_VALUE) {
            // ✅ +1 for using this coin; take minimum across all coin choices
            min = Math.min(min, sub + 1);
        }
    }
    
    memo.put(remaining, min);
    return min;
}
// Time: O(amount × coins.length), Space: O(amount)
```

```java
// ✅ HOUSE ROBBER — Classic DP memoization with single-parameter cache

public int rob(int[] nums) {
    // ✅ Top-down with memo
    return robFrom(0, nums, new int[nums.length]);
}

private int robFrom(int i, int[] nums, int[] memo) {
    // ✅ Base case: gone past the last house
    if (i >= nums.length) return 0;
    
    // ✅ Cache hit — using array index directly (faster than HashMap for sequential ints)
    if (memo[i] != 0) return memo[i];
    
    // ✅ Choice at each house: rob this one (skip next → move to i+2)
    //                          OR skip this one (move to i+1)
    int result = Math.max(
        nums[i] + robFrom(i + 2, nums, memo),   // ← rob house i, skip i+1
        robFrom(i + 1, nums, memo)               // ← skip house i
    );
    
    memo[i] = result;
    return result;
}
// Time: O(n), Space: O(n)

// ✅ Even cleaner: bottom-up tabulation (no recursion overhead)
public int robBottomUp(int[] nums) {
    int n = nums.length;
    if (n == 1) return nums[0];
    
    int[] dp = new int[n];
    dp[0] = nums[0];
    dp[1] = Math.max(nums[0], nums[1]);
    
    for (int i = 2; i < n; i++) {
        dp[i] = Math.max(dp[i-1], dp[i-2] + nums[i]);
        //       ↑ skip this   ↑ rob this + best up to i-2
    }
    return dp[n-1];
}
```

```java
// ✅ RECURSION ON TREE — Trust the recursive case

// Count total nodes in a tree
public int countNodes(TreeNode root) {
    // ✅ Base case: null node → 0 nodes
    if (root == null) return 0;
    
    // ✅ Trust: countNodes(left) gives the count of the left subtree
    //           countNodes(right) gives the count of the right subtree
    // ✅ This node itself = 1
    return 1 + countNodes(root.left) + countNodes(root.right);
}

// Maximum depth of a binary tree
public int maxDepth(TreeNode root) {
    if (root == null) return 0;
    
    // ✅ Trust both recursive calls; take the deeper subtree + 1 for this node
    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

```typescript
// ✅ TypeScript — Memoization decorator pattern (Frontend context)

// Generic memoize function — wraps any function with a results cache
function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
    const cache = new Map<string, unknown>();
    
    return ((...args: unknown[]) => {
        const key = JSON.stringify(args);  // ← serialize all args as cache key
        
        if (cache.has(key)) {
            return cache.get(key);
        }
        
        const result = fn(...args);
        cache.set(key, result);
        return result;
    }) as T;
}

// Usage: expensive React computation or selector
const getFilteredProducts = memoize((products: Product[], filters: FilterState) => {
    return products.filter(p => matchesFilters(p, filters));
});
// React's useMemo is the hooks-level version of this pattern
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between memoization and tabulation?"

**Hruday's answer:**
> Both solve the same problem — avoiding redundant computation of overlapping subproblems. The difference is direction and approach.
>
> Memoization is top-down: I write a recursive function that starts from the original problem, breaks it into subproblems recursively, and caches each result the first time it's computed. When the same subproblem is reached again, I return the cached result immediately. It's intuitive because it mirrors the natural recursive thinking — I don't need to figure out which subproblems are needed in what order; the recursion figures that out automatically.
>
> Tabulation is bottom-up: I fill in a table of answers starting from the smallest subproblems and building up to the original problem. No recursion — pure iteration. For Fibonacci, that's computing `dp[0]=0`, `dp[1]=1`, `dp[2]=dp[1]+dp[0]=1`, etc., up to `dp[n]`.
>
> Time complexity is the same for both. Tabulation is usually faster in practice — no function call overhead, no stack frames, no risk of StackOverflowError on large inputs. Memoization is easier to reason about and write correctly when the recursion structure is complex. I typically start with top-down memoization to verify correctness, then convert to bottom-up tabulation if performance matters.

---

### Q2 — Deep Dive
**Interviewer asks:** "Walk me through the recurrence for coin change and why memoization makes it efficient."

**Hruday's answer:**
> The coin change problem: given coins `[1, 2, 5]` and amount `11`, find the fewest coins that sum to 11.
>
> The recurrence: `minCoins(amount) = 1 + min(minCoins(amount - coin) for each coin)`. In words: the minimum coins to make `amount` is the minimum of (use coin c, then solve for what remains) across all coin denominations c.
>
> Without memoization, this is a tree of calls. `minCoins(11)` branches into `minCoins(10)`, `minCoins(9)`, `minCoins(6)`. Each of those branches three ways. Total calls grow exponentially — O(denominations^amount).
>
> With memoization: each unique value from 0 to 11 is computed exactly once. `minCoins(6)` might be reached from multiple paths, but the second time it's looked up from the cache in O(1). Total unique subproblems: `amount + 1` = 12. Total time: O(amount × coins.length) = O(12 × 3) = 36 operations. From potentially billions to 36 — that's the power of recognizing overlapping subproblems.

---

### Q3 — Application
**Interviewer asks:** "How does React's useMemo relate to the memoization pattern you described?"

**Hruday's answer:**
> They're the same concept at different levels of abstraction. Both prevent redundant computation by caching a result and using the cached version when the inputs haven't changed.
>
> In the algorithmic context, memoization caches the return value of a function by its input parameters — typically a HashMap from input → result.
>
> In React, `useMemo` caches the result of an expensive computation based on its dependency array. If none of the dependencies changed since last render, React returns the cached value instead of recomputing. `useCallback` is the same idea applied to functions instead of values.
>
> The practical rule is the same: memoize only when the computation is actually expensive. In pure DSA, I always memoize recursive functions with overlapping subproblems — the saving is often exponential. In React, I use `useMemo` for expensive derivations like filtering/sorting large arrays or complex calculations inside render, not for simple property accesses or string concatenations where the memoization overhead (dependency array comparison) exceeds the computation cost.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Tracing through every recursive call | "Let me trace through fib(5): fib(5) calls fib(4) and fib(3), fib(4) calls fib(3) and fib(2)..." | Tracing every call is the wrong mental model and breaks under pressure for deep recursion; the correct approach is the "trust" model: (1) define the base case, (2) assume the recursive call returns the correct answer for a smaller input, (3) write the current case using that assumed-correct result; for the interviewer, end with "the base case handles n=0 and n=1, and the recursive step correctly handles everything else by the inductive assumption" — this is how experienced engineers think about recursion |
| Missing the memo before the recursive call | "I put memo.put(result) at the end, before returning" | The `if (memo.containsKey(n)) return memo.get(n)` check must be at the START of the function — before any computation or recursive calls; if you forget it, you still compute every subproblem without cache benefits (just also store results that are never read); the pattern must be exactly: (1) base case check, (2) memo hit check, (3) recursive computation, (4) store in memo, (5) return — any other order breaks memoization |
| Wrong cache key for multi-parameter DP | "I'll use the first parameter as the key" | For DP problems with two or more parameters (like `dp(row, col)` for grid problems or `dp(start, end)` for string partitioning), the cache key must uniquely identify ALL parameters; use `String.format("%d,%d", row, col)` as a String key, or encode as `row * COLS + col` for a flattened 2D array; using only one parameter when two matter causes cache collisions — `dp(3, 5)` and `dp(7, 5)` both get cached at key 5, with the second call returning the first call's result |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I built a pricing rule engine that evaluated nested discount conditions — 'if this product is in category A AND the cart total exceeds amount B, apply discount C'. For complex rule trees with many repeated sub-evaluations, the naive recursive evaluation was hitting timeouts on large catalogues.
>
> Adding a memoization layer — caching the evaluation result for each (ruleId, cartState) combination — brought the evaluation from 800ms to 12ms for the heaviest rules. The pattern was exactly the top-down memoization I'd learned from DP problems: check the cache first, compute only if not cached, store before returning.
>
> When I was asked in an interview about dynamic programming, this real example immediately grounded my explanation in something concrete."

---

## 8. Scale Evolution

**1,000 users →** Top-down memoization in Java/TypeScript works fine. In-memory HashMap cache. Recursion depth up to ~10,000 safe in JVM (configurable with `-Xss`). Bottom-up tabulation preferred for inputs > 10,000.

**100,000 users →** Memoization of shared computations across requests becomes a distributed caching concern — move the memo cache to Redis for results shared across multiple service instances. The algorithmic pattern stays the same; the cache implementation changes from HashMap to Redis `GET/SET`.

**10 million users →** Large-scale DP computations (recommendation scoring, price optimization) run in distributed compute frameworks (Spark, Flink) where the "memo table" is distributed across partitions; the bottom-up tabulation mental model (fill cells in order of dependency) maps directly to how Spark partitions computation graphs.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Pricing calculation with nested discount rules (overlapping subproblems); shortest payment path among multiple gateway options (DP on graph); combinatorial optimization for batch payment settlement | Multi-parameter DP; pricing engine optimization; combinatorial subproblem recognition |
| Swiggy / Meesho | Delivery route cost minimization (DP for shortest path variants); offer eligibility calculation with nested conditions (memoized rule evaluation); product ranking with DP-based relevance scoring | Route optimization; rule engine memoization; order of magnitude performance improvement |
| Adobe / Microsoft | Senior engineers expected to solve medium-hard DP problems; house robber, coin change, unique paths, longest common subsequence are standard interview problems; clean top-down with memo OR bottom-up tabulation both acceptable — the interviewer cares about reasoning | DP problem fluency; top-down vs bottom-up explanation; time/space complexity articulation |
| SAP Labs | Pricing rule engine memoization (800ms → 12ms); concrete before/after performance story; practical application of academic pattern in production TypeScript code | Production application story; performance numbers; real-system grounding |

---

## 10. Related Topics — What to Study Next

- **Topic 276 — Binary Search** — binary search is a form of divide and conquer (cut search space in half each step); the mental model of "trust the sub-range result" is similar to the recursion trust model here; binary search appears as a subroutine in many DP-optimized solutions
- **Topic 277 — Binary Tree Traversals** — all recursive tree algorithms use the same mental model: base case (null node), trust the left subtree result, trust the right subtree result, combine; once the recursion mental model is solid, any tree problem becomes approachable
- **Topic 208 — Dynamic Programming** — memoization IS top-down DP; the transition from "recognizing overlapping subproblems" to "writing the DP recurrence" to "optimizing space" is the full DP skillset; Part 8 of the DSA folder (if present) goes deeper into classic DP patterns (knapsack, LIS, edit distance) that all use this foundation

---

*Part 17 · Recursion Mental Model and Memoization · Full Stack Interview Guide · Hruday D · 2026*
