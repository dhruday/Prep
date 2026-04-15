# Stacks & Queues — Complete Pattern Guide

> *"A stack is a time machine that lets you undo. A monotonic stack is a crystal ball that lets you see the future."*

---

## Table of Contents

1. [Stack Fundamentals & Parentheses Family](#stack-fundamentals--parentheses-family)
2. [Monotonic Stack](#monotonic-stack)
3. [Largest Rectangle in Histogram](#largest-rectangle-in-histogram)
4. [Trapping Rain Water](#trapping-rain-water)
5. [Min Stack / Max Stack](#min-stack--max-stack)
6. [Monotonic Queue (Sliding Window Maximum)](#monotonic-queue-sliding-window-maximum)
7. [Expression Evaluation](#expression-evaluation)
8. [Stock Span & Daily Temperatures](#stock-span--daily-temperatures)
9. [Stack-Based Simulation Patterns](#stack-based-simulation-patterns)

---

## Stack Fundamentals & Parentheses Family

### What is this approach?

**Intuition:** A stack is like a stack of plates: you can only add to the top and remove from the top. This Last-In-First-Out (LIFO) property is perfect for matching nested structures — the most recently opened thing must be closed first.

**Formal:** A stack provides O(1) push, pop, and peek operations. It is the natural data structure for problems involving nesting, matching, undo operations, and maintaining a "most recent" context.

### When should I use this?

- **Matching**: Parentheses, brackets, tags
- **Nesting**: Evaluate nested expressions, decode nested strings
- **Undo**: Backspace operations, browser history
- **DFS on trees/graphs** (explicit stack instead of recursion)
- Keywords: "valid parentheses," "matching brackets," "nested," "backspace," "undo"

### When should I NOT use this?

- You need FIFO (first-in-first-out) order — use a queue
- You need random access to elements — use an array
- The problem involves "levels" or "shortest path" — BFS with a queue

### Core Idea

**Parentheses Matching:**
1. For each character:
   - If opening bracket: push onto stack
   - If closing bracket: check if stack top is the matching opener. If yes, pop. If no, invalid.
2. At the end, if stack is empty, valid. If not, invalid.

### Complexity

- **Time:** O(n) — single pass
- **Space:** O(n) — worst case all opening brackets

### Variants

- **Valid Parentheses:** Three types of brackets. Map each closer to its opener.
- **Minimum Remove to Make Valid:** Track indices of unmatched brackets. Remove them.
- **Longest Valid Parentheses:** Stack stores indices. At each step, compute length as current_index - stack_top.
- **Generate Parentheses:** Not a stack problem — it's backtracking. But the validity check uses the stack mental model.
- **Decode String:** "3[a2[c]]" → "accaccacc". Stack stores (current_string, repeat_count) when entering a bracket.
- **Remove All Adjacent Duplicates:** Stack stores characters. If top == current, pop (cancel). Otherwise push.
- **Backspace String Compare:** Process each string with a stack (# pops), compare results.
- **Asteroid Collision:** Stack simulation. Positive asteroids go right, negative go left. Collision when positive on stack meets negative incoming.

### Related Patterns

- [Monotonic Stack](#monotonic-stack) (specialized stack usage)
- [Recursion](08-RECURSION-AND-BACKTRACKING.md) (the call stack IS a stack)
- [DFS](11-GRAPHS.md) (DFS with explicit stack)

### Interview Insights

- **Trap:** In "Longest Valid Parentheses," using the stack correctly requires storing INDICES, not characters. The base index on the stack enables length computation.
- **Twist:** "Remove duplicate letters (keep one of each, smallest lexicographic order)" — Greedy + stack: pop from stack if top > current AND top appears later.
- **Follow-up:** "What about multiple types of brackets with custom nesting rules?" — Same stack approach, different matching logic.

---

## Monotonic Stack

### What is this approach?

**Intuition:** You are standing in a line of people with different heights. You want to know, for each person, who is the first person taller than them when looking to the right. Instead of checking everyone, maintain a "line of sight" — a stack of people in decreasing height order. When a taller person arrives, everyone shorter can now see them.

**Formal:** A stack that maintains elements in monotonically increasing or decreasing order. When a new element arrives and would break the monotonic property, pop elements until the property is restored. Each popped element "found its answer" (the new element is its next greater/smaller).

### When should I use this?

- **"Next Greater Element"** to the right (or left)
- **"Next Smaller Element"** to the right (or left)
- **"How far does element i's influence extend?"** (previous greater/smaller)
- **"Find the nearest element with a specific relationship"** in one direction
- **Contribution counting:** "For each element, how many subarrays is it the min/max of?"
- Keywords: "next greater," "next smaller," "daily temperatures," "stock span," "histogram"

### When should I NOT use this?

- You need the Kth next greater (not just the first) — monotonic stack finds only the nearest
- You need global maximum/minimum — just scan linearly
- The relationship isn't "nearest in one direction" — might need different structure

### Core Idea

**Next Greater Element (to the right):**
1. Initialize an empty stack. Result array filled with -1 (default: no greater element).
2. Iterate from LEFT to RIGHT (or right to left — both work; different stack content).
3. **From right to left approach:** For each element:
   - While stack is not empty AND stack top ≤ current: pop (these can't be the answer for anyone more to the left)
   - If stack top > current: that's the next greater element. Record it.
   - Push current onto stack.
4. **From left to right approach:** For each element:
   - While stack is not empty AND stack top < current element: pop, and current element is the answer for the popped element.
   - Push current onto stack.

**Monotonic Decreasing Stack:** Maintains elements in decreasing order (top is smallest). Pops when a larger element arrives. Finds NEXT GREATER element.

**Monotonic Increasing Stack:** Maintains elements in increasing order (top is largest). Pops when a smaller element arrives. Finds NEXT SMALLER element.

### Complexity

- **Time:** O(n) — every element is pushed and popped AT MOST once. Total operations = 2n.
- **Space:** O(n) — worst case everything on the stack

**Why O(n)?** The push-pop argument: each of the n elements enters the stack once and leaves at most once. So total pushes + pops ≤ 2n.

### Variants

- **Next Greater Element I, II, III:** Various LeetCode problems using this pattern
- **Next Smaller Element:** Use increasing monotonic stack instead of decreasing
- **Previous Greater/Smaller Element:** Scan from left to right (or right to left, reversed)
- **Sum of Subarray Minimums:** For each element, find how many subarrays it is the minimum of. Use monotonic stack to find previous-smaller and next-smaller boundaries. Contribution = element × left_count × right_count.
- **Sum of Subarray Ranges:** Sum of (max - min) over all subarrays. Decompose into sum of maximums - sum of minimums. Each uses monotonic stack.
- **Online Stock Span:** How many consecutive previous days had price ≤ today. Equivalent to "previous greater element" distance.

### Related Patterns

- [Largest Rectangle in Histogram](#largest-rectangle-in-histogram) (the canonical hard monotonic stack problem)
- [Trapping Rain Water](#trapping-rain-water) (can be solved with monotonic stack)
- [Daily Temperatures / Stock Span](#stock-span--daily-temperatures) (direct applications)
- [Sliding Window](02-ARRAYS-AND-STRINGS.md#sliding-window--variable-size) (when combined with a monotonic structure)

### Interview Insights

- **Trap:** Confusing which direction to scan and which stack order to use. Draw it out. "Next Greater" = decreasing stack, "Next Smaller" = increasing stack.
- **Trap:** In "Sum of Subarray Minimums," handling duplicates. Use strict inequality on one side and non-strict on the other to avoid double-counting.
- **Twist:** "Circular array" for Next Greater — iterate through the array twice (2n elements, index mod n). Stack sees the "wraparound."
- **Key insight:** The core monotonic stack logic is always the same — only the comparison direction and what you record change. Master one direction, and the other is a mirror.

---

## Largest Rectangle in Histogram

### What is this approach?

**Intuition:** You have a city skyline of bars. What's the biggest rectangle you can fit under the skyline? For each bar, the rectangle it can form extends left and right until a shorter bar blocks it. The left boundary is the "previous smaller element" and the right boundary is the "next smaller element."

**Formal:** Given an array of bar heights, find the largest rectangular area under the histogram. For each bar, find the maximum width it can extend using a monotonic stack to find left and right boundaries.

### When should I use this?

- "Largest rectangle in histogram" (the literal problem)
- "Maximal rectangle in binary matrix" (reduces to histogram per row)
- Keywords: "largest rectangle," "histogram," "maximal rectangle"

### When should I NOT use this?

- The shapes aren't rectangular — different geometry problem
- The bars aren't adjacent — not a histogram

### Core Idea

1. Use a monotonic increasing stack (stores indices of bars in increasing height order)
2. For each bar (and a sentinel 0-height bar at the end):
   - While stack top's height > current height: pop the bar at stack top
   - The popped bar's height is the rectangle's height
   - Width = current_index - stack_top_after_pop - 1 (distance between current bar and the new stack top)
   - Compute area = height × width, update maximum
3. Push current index onto stack

**Mental model:** The stack maintains bars that could still extend rightward. When a shorter bar appears, all taller bars on the stack have found their right boundary. Pop them and compute their areas.

### Complexity

- **Time:** O(n) — each element pushed and popped once
- **Space:** O(n) — stack

### Variants

- **Largest Rectangle in Histogram:** Direct application
- **Maximal Rectangle in Binary Matrix:** For each row, compute histogram heights (cumulative 1s above). Apply histogram algorithm per row. Track maximum across all rows. Total: O(rows × cols).
- **Stream of histogram columns:** Process columns online using the stack approach

### Related Patterns

- [Monotonic Stack](#monotonic-stack) (this IS a monotonic stack problem)
- [Dynamic Programming](09-DYNAMIC-PROGRAMMING.md) (the matrix variant involves DP for histogram heights)

### Interview Insights

- **Trap:** Not adding a sentinel bar of height 0 at the end. Without it, bars remaining in the stack after the loop aren't processed.
- **Trap:** The width calculation. It's current_index - stack[top-1] - 1, NOT current_index - popped_index. The stack top AFTER popping gives the left boundary.
- **Twist:** "Maximal Rectangle in Binary Matrix" is a classic follow-up. It reduces to running histogram on each row. A very common hard problem at Google.
- **Follow-up:** "What about maximal square?" — Different approach: 2D DP with min of three neighbors.

---

## Trapping Rain Water

### What is this approach?

**Intuition:** After it rains, water settles between tall buildings. At each position, the water level is determined by the shorter of the tallest building to the left and the tallest to the right, minus the building's own height.

**Formal:** Given an array of heights, compute how much water can be trapped between the bars. At each position i, water[i] = min(max_left[i], max_right[i]) - height[i], where max_left and max_right are the maximum heights to the left and right.

### When should I use this?

- "Trapping rain water" (1D or 2D)
- Any problem about water/level between barriers
- Keywords: "trapping rain water," "water between bars"

### When should I NOT use this?

- The barriers can be moved or removed — different problem
- 3D terrain — elevation-based approaches (BFS with priority queue)

### Core Idea

**Approach 1 — Precompute max_left and max_right arrays:**
1. max_left[i] = max of heights[0..i]
2. max_right[i] = max of heights[i..n-1]
3. water[i] = max(0, min(max_left[i], max_right[i]) - height[i])
4. Time: O(n), Space: O(n)

**Approach 2 — Two Pointers (optimal):**
1. `left = 0, right = n-1, left_max = 0, right_max = 0`
2. Process from the side with the smaller max:
   - If left_max ≤ right_max: water at left is determined by left_max. Process left, advance left.
   - Else: water at right is determined by right_max. Process right, advance right.
3. Time: O(n), Space: O(1)

**Why two-pointer works:** Water at any position is determined by the SMALLER of the two maxes. If left_max < right_max, we don't need to know the exact right_max — we know the bottleneck is left_max.

**Approach 3 — Monotonic Stack:**
1. Maintain a decreasing stack. When current bar > stack top, water forms between stack top and current bar above the (now popped) shorter bar.
2. For each popped bar: width = current - stack_top_after_pop - 1, height = min(current_height, stack_top_height) - popped_height, area = width × height.

### Complexity

- **Two Pointers:** O(n) time, O(1) space (optimal)
- **Precompute:** O(n) time, O(n) space
- **Stack:** O(n) time, O(n) space

### Variants

- **Trapping Rain Water 1D:** As described
- **Trapping Rain Water 2D (matrix):** BFS with min-heap. Start from boundary cells, process from lowest boundary inward. Water at each cell = max(current_level, height) - height.
- **Container With Most Water:** Different problem! You choose two walls, not all walls. Uses two-pointer but different logic.

### Related Patterns

- [Two Pointers — Opposite Direction](02-ARRAYS-AND-STRINGS.md#two-pointers--opposite-direction) (the optimal approach)
- [Monotonic Stack](#monotonic-stack) (alternative approach)
- [Heaps](12-HEAPS-AND-PRIORITY-QUEUES.md) (the 2D variant)

### Interview Insights

- **Trap:** Confusing "Trapping Rain Water" with "Container With Most Water." They look similar but are fundamentally different problems.
- **Twist:** "2D version" — Much harder. Uses a min-heap BFS from the boundary. Not commonly asked, but Google has.
- **Follow-up:** "Can you do it in O(1) space?" — Yes, two pointers.

---

## Min Stack / Max Stack

### What is this approach?

**Intuition:** A regular stack, but you can also ask "what's the smallest element currently in the stack?" in O(1) time. The trick: alongside each element, store what the minimum was at the time it was pushed.

**Formal:** Augment each stack entry with metadata (the current min/max). When an element is pushed, the metadata is min(element, previous_min). When popped, the metadata naturally reflects the correct state.

### When should I use this?

- "Design a stack that supports push, pop, top, and getMin in O(1)"
- You need to track the minimum/maximum across a dynamic collection where removal is LIFO
- Keywords: "min stack," "max stack," "getMin O(1)"

### When should I NOT use this?

- Removal is not LIFO (arbitrary removal) — use a different structure
- You need the Kth smallest — use a more complex structure

### Core Idea

**Min Stack:**
1. Each stack entry stores (value, current_min)
2. Push: new_min = min(value, stack_top.current_min). Push (value, new_min).
3. Pop: just pop the top. The next element already has the correct min.
4. getMin: return stack_top.current_min

**Space Optimization:** Instead of storing min with every element, use a second "min stack" that only pushes when a new minimum is found (or when the minimum is duplicated).

### Complexity

- **Time:** O(1) for all operations
- **Space:** O(n) — each element has associated min

### Variants

- **Min Stack:** As described
- **Max Stack:** Same idea with max instead of min
- **Max Stack with popMax():** Much harder — need to find and remove the max efficiently. Use doubly linked list + TreeMap.

### Related Patterns

- [Monotonic Stack](#monotonic-stack) (maintains order in the stack)
- [Two Heaps](12-HEAPS-AND-PRIORITY-QUEUES.md) (for more complex min/max tracking)

### Interview Insights

- **Trap:** Using the space-optimized version incorrectly. If the minimum value is pushed again, you must push to the min stack again (not skip it).
- **Twist:** "Max Stack with popMax" — This requires a doubly linked list for O(1) removal + a sorted structure for finding max. Total: O(log n) per operation.

---

## Monotonic Queue (Sliding Window Maximum)

### What is this approach?

**Intuition:** You are looking through a window that slides across a row of numbers. At each position, you need the maximum visible number. Instead of rescanning all K elements, maintain a "candidates list" where each candidate is bigger than all candidates after it. When the window slides, new candidates join from the right (pushing out smaller ones), and old ones exit from the left.

**Formal:** A deque (double-ended queue) that maintains elements in monotonically decreasing order. The front always holds the current maximum. Elements are added from the back (popping smaller elements) and removed from the front (when they slide out of the window).

### When should I use this?

- **"Sliding Window Maximum"** (or minimum)
- Maximum/minimum over all subarrays of size K
- DP optimization where you need max/min over a range that slides
- Keywords: "sliding window maximum," "sliding window minimum," "maximum in each window"

### When should I NOT use this?

- You need sum, not max/min — use prefix sum or running sum
- The window doesn't slide (different positions for each query) — use segment tree or sparse table
- The window size varies — still works, but need to track indices carefully

### Core Idea

1. Use a deque storing indices (not values) in decreasing order of their values
2. For each new element (enter from right):
   - While deque is not empty AND value at deque's back ≤ current value: pop from back (these can never be the max)
   - Push current index to back
3. Remove expired elements (exit from left):
   - While deque front's index < window's left boundary: pop from front
4. The front of the deque is the maximum for the current window

### Complexity

- **Time:** O(n) — each element enters and exits the deque at most once
- **Space:** O(K) where K is the window size

### Variants

- **Sliding Window Maximum:** Decreasing deque
- **Sliding Window Minimum:** Increasing deque (mirror)
- **Sliding Window Median:** Not solvable with monotonic queue alone — use two heaps or sorted set
- **DP Optimization:** Some DP transitions involve "max of dp[j] for j in [i-K, i-1]." Replace the O(K) scan with a monotonic queue for O(1) per transition, reducing total DP from O(nK) to O(n).

### Related Patterns

- [Monotonic Stack](#monotonic-stack) (the stack version — one-directional instead of window)
- [Sliding Window](02-ARRAYS-AND-STRINGS.md#sliding-window--fixed-size) (this is the "max in window" specialization)
- [DP Optimization](09-DYNAMIC-PROGRAMMING.md) (monotonic queue optimization of DP)
- [Heaps](12-HEAPS-AND-PRIORITY-QUEUES.md) (alternative: max-heap of window elements, but O(n log K) not O(n))

### Interview Insights

- **Trap:** Storing values instead of indices. You need indices to know when elements expire (slide out of window).
- **Twist:** "What about median in each window?" — Monotonic queue doesn't help. Use two heaps (max-heap for lower half, min-heap for upper half) with lazy deletion.
- **Follow-up:** "Optimize a DP recurrence" — If the DP transition is dp[i] = max(dp[j] for j in [i-K, i-1]) + something, use a monotonic queue to find the max in O(1).

---

## Expression Evaluation

### What is this approach?

**Intuition:** When you calculate "3 + 4 × 2," you can't just go left to right — you need to handle operator precedence. A stack naturally handles this: push when you see something that "waits" (lower precedence), pop and compute when something higher-priority appears.

**Formal:** Use a stack to evaluate arithmetic expressions with operator precedence and parentheses. Operators are pushed onto the stack, and computation is triggered when a higher-priority context closes (closing parenthesis) or a lower-priority operator appears.

### When should I use this?

- "Evaluate expression" (infix, postfix, prefix)
- "Basic Calculator" (with +, -, *, /, parentheses)
- Keywords: "calculator," "evaluate expression," "parse"

### When should I NOT use this?

- The expression is in postfix/RPN — evaluate directly with a value stack (simpler)
- The expression is trivially parsed (no precedence or parentheses)

### Core Idea

**Basic Calculator (+ - with parentheses):**
1. Value stack tracks running results. Sign variable tracks current sign.
2. When opening parenthesis: push current result and sign onto stack. Reset.
3. When closing parenthesis: pop sign and previous result. Combine.

**Calculator with ×, /, +, -:**
1. Process each number. Apply the PREVIOUS operator to the number:
   - If previous op is +: push +number onto stack
   - If previous op is -: push -number onto stack
   - If previous op is ×: pop stack top, push top × number
   - If previous op is /: pop stack top, push top / number
2. At the end, sum all stack values.

**General Infix Evaluation (Shunting Yard):**
1. Two stacks: values and operators
2. When a number: push to value stack
3. When an operator: while operator stack top has ≥ precedence, evaluate (pop operator, pop two values, compute, push result). Then push current operator.
4. When ( : push to operator stack
5. When ) : evaluate until ( is found

### Complexity

- **Time:** O(n)
- **Space:** O(n)

### Variants

- **Basic Calculator I:** + - and parentheses
- **Basic Calculator II:** + - × / without parentheses
- **Basic Calculator III:** + - × / with parentheses (combination of I and II)
- **Evaluate Reverse Polish Notation:** Simple — read token, if number push, if operator pop two and compute

### Related Patterns

- [Stack Fundamentals](#stack-fundamentals--parentheses-family) (parentheses matching is the foundation)
- [Recursion](08-RECURSION-AND-BACKTRACKING.md) (recursive descent parser is an alternative to stack-based evaluation)

### Interview Insights

- **Trap:** Integer division truncation. Clarify: truncate toward zero or floor?
- **Twist:** "What about unary minus?" — Handle negative numbers at the start or after open parenthesis.
- **Follow-up:** "Add support for custom functions like sin(), max(a,b)" — Extend the parser with function tokens.

---

## Stock Span & Daily Temperatures

### What is this approach?

These are direct applications of the [Monotonic Stack](#monotonic-stack). Included here to highlight the pattern recognition.

### Stock Span

**Problem:** For each day, how many consecutive previous days had price ≤ today's price?

**Pattern:** Previous Greater Element. Use a decreasing monotonic stack of (price, index). For each new price, pop all elements with price ≤ current. Span = current_index - stack_top_index (or start of array if stack is empty).

### Daily Temperatures

**Problem:** For each day, how many days until a warmer temperature?

**Pattern:** Next Greater Element. Use a decreasing monotonic stack of indices. For each new temperature, pop all elements with temperature < current. For each popped element, answer = current_index - popped_index.

### Interview Insights

- These are the most direct monotonic stack applications. If you can't recognize them as monotonic stack instantly, go back and study that section.
- **Twist:** "Online stock span" — Process one day at a time. The monotonic stack naturally supports this.

---

## Stack-Based Simulation Patterns

### What is this approach?

Some problems don't fit neat categories but use stacks for simulation: processing elements with "undo" or "destruction" mechanics.

### Common Simulation Problems

**Asteroid Collision:**
- Positive asteroids move right, negative move left
- Process left to right. Push positive. When negative arrives, compare with stack top (positive): larger survives. Equal → both destroyed. Negative larger → pop and continue colliding.

**Remove K Digits:**
- Remove K digits to make the number smallest
- Greedy with monotonic stack: if current digit < stack top and K > 0, pop stack top (remove it)
- This creates a monotonically increasing sequence (smallest possible)

**Remove Duplicate Letters (Smallest Subsequence):**
- Keep one of each letter, maintain smallest lexicographic order
- If current < stack top AND stack top appears later in string AND current not already in result: pop stack top
- Use a set to track what's in the stack, and a count array for remaining occurrences

### Interview Insights

- These problems seem unique but share the pattern: "process sequentially, use stack to represent current state, undo (pop) when a better option appears."
- **Key insight:** If the problem involves processing elements from left to right with potential "cancellation" or "replacement" of previous elements, a stack is likely the right structure.

---

*Next: [08-RECURSION-AND-BACKTRACKING.md](08-RECURSION-AND-BACKTRACKING.md) — The art of organized exploration.*
