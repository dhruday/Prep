# Stacks & Queues — 1-Hour Learning Module

> "A stack is a time machine that lets you undo. A monotonic stack is a crystal ball that lets you see the future."

**Target:** Google SWE interview preparation
**Time budget:** 60 minutes total — follow the section timers

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
10. [Advanced Awareness](#advanced-awareness)

---

## [0–10 min] Big Picture

### What is a Stack?

A stack is a container where you can only add and remove from the **top**. Last item in is the first item out — **LIFO**.

Real-world analogy: A pile of plates in a cafeteria. You put clean plates on top, and you always pick from the top. You cannot grab the plate at the bottom without removing everything above it first.

**What problem does it solve?**

Any time you need to remember "what was I doing before this?" — that is a stack problem. Nested structure means the most recently opened thing must be closed first. Your function call stack IS a literal stack: each call "opens" a frame, and when it returns, that frame is "closed" and you're back to the previous one.

Tiny example: validating `"({[]})"`:
```
See (  → push (
See {  → push {
See [  → push [
See ]  → top is [, which matches ] → pop
See }  → top is {, which matches } → pop
See )  → top is (, which matches ) → pop
Stack empty → VALID
```

### What is a Queue?

A queue is a container where you add to the back and remove from the front — **FIFO**.

Real-world analogy: A line at a coffee shop. First person in line gets served first.

**What problem does it solve?**

Level-by-level processing. When you explore a graph and need to visit all neighbors at distance 1 before any neighbor at distance 2 (BFS), you need the order in which things arrived to be preserved.

### What is a Monotonic Stack?

A stack that maintains elements in a strictly sorted order (either always increasing or always decreasing from bottom to top). When a new element would break that order, you pop until the order is restored.

Real-world analogy: You are in a queue at a theme park ride. Everyone can see who is directly in front of them. A "bouncer" rule says: if you are shorter than the person behind you, you must step out of line. You stay as long as the person behind you is shorter. Now for any person in line, the first person **in front of them** who is taller is immediately visible.

**What problem does it solve?**

Finding the nearest element in one direction that is larger (or smaller) than the current one — in O(n) instead of O(n²).

---

## [10–20 min] Mental Model

### Stack: "What was I doing before this?"

```
PUSH 3          PUSH 7          POP             PUSH 2
+---------+     +---------+     +---------+     +---------+
|    3    | →   |    7    | →   |    3    | →   |    2    |
+---------+     |    3    |     +---------+     |    3    |
                +---------+                     +---------+

Top always = most recently added, most recently unresolved item
```

**Key observation:** Every time you open a parenthesis / start a nested scope / enter a new level, push. Every time you close / finish / return, pop. The stack naturally tracks nesting depth.

**What do you maintain?**
- The "open" items that have not yet been resolved
- Enough context to know when they ARE resolved

### Monotonic Stack: "The next answer is waiting for me"

Imagine heights: `[2, 1, 5, 6, 2, 3]`

You want: for each bar, the first bar to its right that is taller.

**Brute force:** For each bar, scan right until you find a taller one. O(n²).

**Key observation:** When you find a bar taller than previous bars, those previous bars have found their answer simultaneously. Instead of re-scanning them, keep them in a stack and resolve them all at once.

```
Process index 0 (height=2): stack empty, push. Stack: [0]
Process index 1 (height=1): 1 < 2, push.       Stack: [0,1]
Process index 2 (height=5): 5 > 1 → index 1's answer = index 2 (height 5). Pop.
                             5 > 2 → index 0's answer = index 2 (height 5). Pop.
                             Stack empty. Push.  Stack: [2]
Process index 3 (height=6): 6 > 5 → index 2's answer = index 3 (height 6). Pop.
                             Stack empty. Push.  Stack: [3]
Process index 4 (height=2): 2 < 6, push.        Stack: [3,4]
Process index 5 (height=3): 3 > 2 → index 4's answer = index 5 (height 3). Pop.
                             3 < 6, push.        Stack: [3,5]
End: indices 3, 5 remain → no next greater element.

Result: [5, 5, 6, -1, 3, -1]
```

**What invariant does the stack maintain?**

At any point during a left-to-right scan with a **decreasing** monotonic stack:
- Elements in the stack are in strictly decreasing order (bottom to top)
- Every element in the stack has NOT YET found its next greater element
- When a new element is pushed, all smaller elements that just got popped have found THEIR answer (it is the new element)

**Decreasing stack** → finds **Next Greater Element**
**Increasing stack** → finds **Next Smaller Element**

### Queue / Deque: "Level-by-level or sliding window"

```
Deque (double-ended queue):
Front ←  [3, 1, 5, 4]  ← Back

addFirst / removeFirst  ←→  addLast / removeLast

Use case: sliding window maximum
- Add new elements from the back (pop smaller ones first)
- Remove expired elements from the front
- Front always = current window maximum
```

---

## [20–35 min] Core Pattern

### When to Use Stack

| Signal | Structure |
|--------|-----------|
| Matching nested structures (brackets, tags) | Stack |
| "Undo" / backspace simulation | Stack |
| Explicit DFS without recursion | Stack |
| Most recently opened / unresolved item | Stack |
| "Valid," "matching," "nested," "backspace" in problem | Stack |

### When NOT to Use Stack

- You need first-in-first-out order → use a Queue
- You need random access → use an array or map
- You need the Kth nearest, not the 1st nearest → different structure
- The problem is about "levels" or "shortest path" → BFS with Queue

---

### Core Stack Patterns

#### Pattern 1: Parentheses Matching

Brute force: Check every possible pairing — exponential.
Observation: The most recently opened bracket must be the next one closed. This is exactly what a stack tracks.

Algorithm:
```
for each character c:
    if c is an opening bracket:
        push c
    if c is a closing bracket:
        if stack is empty OR stack.top != matching opener:
            return INVALID
        pop
return stack.isEmpty()
```

#### Pattern 2: Monotonic Stack — Next Greater Element

**Brute force:** For every index i, scan j from i+1 to n-1 until height[j] > height[i]. O(n²).

**Why is it slow?** You re-examine elements you've already seen.

**Key observation:** If height[j] is the next greater for both index i and index i+1, you only need to "discover" height[j] once and resolve all pending elements simultaneously.

**Optimized:** Maintain a decreasing stack. When a new element arrives and is greater than the stack top, the stack top has found its answer. Pop and record. Continue popping until the invariant is restored.

```
Algorithm (left to right, decreasing stack):

result = array of size n, filled with -1
stack = empty  (stores indices)

for i from 0 to n-1:
    while stack is not empty AND height[stack.top] < height[i]:
        idx = stack.pop()
        result[idx] = height[i]   // height[i] is the next greater for idx
    stack.push(i)

// elements remaining in stack have no next greater element (result stays -1)
```

**Why does this work?**
- When element at `idx` is popped, `height[i]` is guaranteed to be the NEAREST greater element to its right. Why? Because if there were any element between `idx` and `i` that was greater, it would have already popped `idx` before now.

**Time complexity:** O(n) — each element is pushed once and popped at most once. Total operations ≤ 2n.

---

### Specialized Patterns Built on Monotonic Stack

#### Largest Rectangle in Histogram

**Intuition:** For each bar, the rectangle it can anchor extends left and right until a shorter bar blocks it. Find those boundaries using a monotonic stack.

**Brute force:** For each pair (i, j), the rectangle height is `min(height[i..j])` and width is `j-i+1`. O(n³) or O(n²) with smarter scanning.

**Key observation:** For each bar `h`, its maximum rectangle has height `h` and extends between its previous-smaller-bar on the left and its next-smaller-bar on the right. Both boundaries can be found in one pass with a monotonic increasing stack.

```
Algorithm:

stack = empty  (stores indices; increasing order of heights)
maxArea = 0
Append a sentinel bar of height 0 to the heights array

for i from 0 to n (including sentinel):
    while stack is not empty AND height[stack.top] > height[i]:
        h = height[stack.pop()]
        width = (stack is empty) ? i : i - stack.top - 1
        maxArea = max(maxArea, h * width)
    stack.push(i)

return maxArea
```

**Why the sentinel?** Without a height-0 bar at the end, bars remaining in the stack after the loop are never processed. The sentinel forces all remaining bars to pop and compute their areas.

**Why `i - stack.top - 1` for width?**
After popping bar at index `popped`, the new stack top is the nearest bar shorter than `popped` to its left. The current index `i` is the first bar shorter than `popped` to its right. So the valid width is exactly `i - stack.top - 1`.

---

#### Trapping Rain Water

**Intuition:** Water at any position is determined by the shorter of the tallest wall to its left and the tallest wall to its right, minus the bar's own height.

**Approach 1 — Precompute (O(n) time, O(n) space):**
```
max_left[i]  = max of height[0..i]
max_right[i] = max of height[i..n-1]
water[i]     = max(0, min(max_left[i], max_right[i]) - height[i])
answer       = sum of water[i]
```

**Approach 2 — Two Pointers (O(n) time, O(1) space):**
```
left = 0, right = n-1, left_max = 0, right_max = 0, total = 0

while left <= right:
    if height[left] <= height[right]:
        if height[left] >= left_max:
            left_max = height[left]
        else:
            total += left_max - height[left]
        left++
    else:
        if height[right] >= right_max:
            right_max = height[right]
        else:
            total += right_max - height[right]
        right--
```

**Why two-pointer works:** Water at position `left` is `min(left_max, right_max) - height[left]`. If `left_max <= right_max`, then `min(left_max, right_max) = left_max` regardless of what exactly `right_max` is. So we can process `left` definitively without knowing the full right side.

---

#### Min Stack

**Problem:** Design a stack that supports push, pop, top, and getMin — all in O(1).

**Brute force:** After each pop, scan the entire stack for the new minimum. O(n) per pop.

**Key observation:** The minimum can only change when you push or pop. Store the minimum at the time of each push alongside the element itself.

```
Each stack entry: (value, current_min_at_time_of_push)

Push(x):
    new_min = (stack empty) ? x : min(x, stack.top.current_min)
    stack.push( (x, new_min) )

getMin():
    return stack.top.current_min
```

When you pop, the previous element's stored min is automatically correct — no scanning needed.

---

#### Monotonic Queue — Sliding Window Maximum

**Intuition:** As the window slides, you are adding one element to the right and removing one from the left. You need the current maximum efficiently.

**Brute force:** For each window position, scan all K elements. O(nK).

**Key observation:** If element A is to the LEFT of element B inside the window, and A ≤ B, then A can never be the window maximum for any future window (B will still be in the window when A leaves). So A is useless and can be discarded immediately.

**Algorithm (Decreasing Deque):**
```
deque = empty  (stores indices)
result = []

for i from 0 to n-1:
    // Step 1: Remove elements outside window from front
    while deque is not empty AND deque.front < i - k + 1:
        deque.removeFirst()

    // Step 2: Remove useless smaller elements from back
    while deque is not empty AND height[deque.back] <= height[i]:
        deque.removeLast()

    deque.addLast(i)

    // Step 3: Front is the maximum for this window
    if i >= k - 1:
        result.add(height[deque.front])
```

---

### Expression Evaluation

**Calculator with +, -, ×, / (no parentheses):**

Process numbers one by one. Apply the PREVIOUS operator to the current number and interact with the stack based on operator precedence:
- `+`: push `+number`
- `-`: push `-number`
- `×`: pop, multiply, push result
- `/`: pop, divide, push result

At the end, sum the stack.

**Why?** Multiplication/division must happen before addition/subtraction. By pushing + and - operands and immediately evaluating × and /, you handle precedence naturally.

**Add parentheses:** When you see `(`, push the current running total and current sign onto a "context stack", reset. When you see `)`, pop the context and combine.

---

### Stack-Based Simulation Patterns

These do not fit a named category but share the insight: process left to right, use the stack to represent current state, pop (undo) when a better option appears.

**Asteroid Collision:** Positive asteroids go right, negative go left. Push positive onto stack. When negative arrives, compare with stack top (positive). Larger in magnitude survives; equal → both destroyed.

**Remove K Digits (make smallest number):** Maintain a monotonically increasing stack. If current digit < stack top AND you still have removals remaining (K > 0), pop the stack top (remove that digit). This greedily keeps the smallest possible prefix.

**Remove Duplicate Letters (smallest lexicographic subsequence):** If current char < stack top AND the stack top character appears again later in the string AND current char is not already in the result: pop the stack top. Use a frequency count array and a boolean "in-stack" set.

---

## [35–45 min] Concrete Code + Dry Run

### Pattern 1: Valid Parentheses

**Input:** `"({[]})"`
**Expected output:** `true`

**Java:**
```java
boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    Map<Character, Character> matching = Map.of(')', '(', '}', '{', ']', '[');

    for (char c : s.toCharArray()) {
        if (!matching.containsKey(c)) {
            stack.push(c);
        } else {
            if (stack.isEmpty() || stack.peek() != matching.get(c)) {
                return false;
            }
            stack.pop();
        }
    }
    return stack.isEmpty();
}
```

**JavaScript:**
```javascript
function isValid(s) {
    const stack = [];
    const matching = { ')': '(', '}': '{', ']': '[' };

    for (const c of s) {
        if (!matching[c]) {
            stack.push(c);
        } else {
            if (stack.length === 0 || stack[stack.length - 1] !== matching[c]) {
                return false;
            }
            stack.pop();
        }
    }
    return stack.length === 0;
}
```

**Dry Run for `"({[]})"`:**

| Step | Char | Action | Stack |
|------|------|--------|-------|
| 1 | `(` | push | `[(]` |
| 2 | `{` | push | `[(, {]` |
| 3 | `[` | push | `[(, {, []` |
| 4 | `]` | match `[`, pop | `[(, {]` |
| 5 | `}` | match `{`, pop | `[(]` |
| 6 | `)` | match `(`, pop | `[]` |
| End | — | stack empty | return `true` |

**Complexity:** O(n) time, O(n) space

---

### Pattern 2: Daily Temperatures (Next Greater Element)

**Input:** `[73, 74, 75, 71, 69, 72, 76, 73]`
**Expected output:** `[1, 1, 4, 2, 1, 1, 0, 0]`

**Java:**
```java
int[] dailyTemperatures(int[] temps) {
    int n = temps.length;
    int[] result = new int[n];
    Deque<Integer> stack = new ArrayDeque<>();

    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && temps[stack.peek()] < temps[i]) {
            int prevDay = stack.pop();
            result[prevDay] = i - prevDay;
        }
        stack.push(i);
    }
    return result;
}
```

**JavaScript:**
```javascript
function dailyTemperatures(temps) {
    const n = temps.length;
    const result = new Array(n).fill(0);
    const stack = [];

    for (let i = 0; i < n; i++) {
        while (stack.length > 0 && temps[stack[stack.length - 1]] < temps[i]) {
            const prevDay = stack.pop();
            result[prevDay] = i - prevDay;
        }
        stack.push(i);
    }
    return result;
}
```

**Dry Run for `[73, 74, 75, 71, 69, 72, 76, 73]`:**

| i | temp | Stack before | Action | Stack after | Records |
|---|------|--------------|--------|-------------|---------|
| 0 | 73 | `[]` | push 0 | `[0]` | — |
| 1 | 74 | `[0]` | 74>73 → pop 0, result[0]=1 | `[]` → push 1 | `[0]=1` |
| 2 | 75 | `[1]` | 75>74 → pop 1, result[1]=1 | `[]` → push 2 | `[1]=1` |
| 3 | 71 | `[2]` | 71<75 → push 3 | `[2,3]` | — |
| 4 | 69 | `[2,3]` | 69<71 → push 4 | `[2,3,4]` | — |
| 5 | 72 | `[2,3,4]` | 72>69 → pop 4, result[4]=1; 72>71 → pop 3, result[3]=2; 72<75 → push 5 | `[2,5]` | `[4]=1,[3]=2` |
| 6 | 76 | `[2,5]` | 76>72 → pop 5, result[5]=1; 76>75 → pop 2, result[2]=4; push 6 | `[6]` | `[5]=1,[2]=4` |
| 7 | 73 | `[6]` | 73<76 → push 7 | `[6,7]` | — |
| End | — | `[6,7]` | no more temps → result[6]=0, result[7]=0 (default) | `[]` | — |

**Result:** `[1, 1, 4, 2, 1, 1, 0, 0]` ✓

**Complexity:** O(n) time, O(n) space

---

### Pattern 3: Largest Rectangle in Histogram

**Input:** `[2, 1, 5, 6, 2, 3]`
**Expected output:** `10`

**Java:**
```java
int largestRectangleArea(int[] heights) {
    int n = heights.length;
    int[] h = Arrays.copyOf(heights, n + 1);
    h[n] = 0;
    Deque<Integer> stack = new ArrayDeque<>();
    int maxArea = 0;

    for (int i = 0; i <= n; i++) {
        while (!stack.isEmpty() && h[stack.peek()] > h[i]) {
            int height = h[stack.pop()];
            int width = stack.isEmpty() ? i : i - stack.peek() - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    return maxArea;
}
```

**JavaScript:**
```javascript
function largestRectangleArea(heights) {
    const h = [...heights, 0];
    const stack = [];
    let maxArea = 0;

    for (let i = 0; i < h.length; i++) {
        while (stack.length > 0 && h[stack[stack.length - 1]] > h[i]) {
            const height = h[stack.pop()];
            const leftBoundary = stack.length === 0 ? -1 : stack[stack.length - 1];
            const width = i - leftBoundary - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    return maxArea;
}
```

**Dry Run for `[2, 1, 5, 6, 2, 3, 0]` (0 is sentinel):**

| i | h[i] | Stack (indices) | Pops | Area computed | maxArea |
|---|------|-----------------|------|---------------|---------|
| 0 | 2 | `[]` → push 0 | — | — | 0 |
| 1 | 1 | `[0]` → 2>1 → pop 0 | pop 0: h=2, left=-1, width=1 | 2×1=2 | 2 |
| 1 | 1 | `[]` → push 1 | — | — | 2 |
| 2 | 5 | `[1]` → push 2 | — | — | 2 |
| 3 | 6 | `[1,2]` → push 3 | — | — | 2 |
| 4 | 2 | `[1,2,3]` → 6>2 → pop 3 | pop 3: h=6, left=2, width=1 | 6×1=6 | 6 |
| 4 | 2 | `[1,2]` → 5>2 → pop 2 | pop 2: h=5, left=1, width=2 | 5×2=10 | 10 |
| 4 | 2 | `[1]` → 1≤2 → push 4 | — | — | 10 |
| 5 | 3 | `[1,4]` → push 5 | — | — | 10 |
| 6 | 0 | `[1,4,5]` → 3>0 pop 5 | pop 5: h=3, left=4, width=1 | 3×1=3 | 10 |
| 6 | 0 | `[1,4]` → 2>0 pop 4 | pop 4: h=2, left=1, width=4 | 2×4=8 | 10 |
| 6 | 0 | `[1]` → 1>0 pop 1 | pop 1: h=1, left=-1, width=6 | 1×6=6 | 10 |
| 6 | 0 | `[]` → push 6 | — | — | 10 |

**Result:** `10` ✓

**Complexity:** O(n) time, O(n) space

---

### Pattern 4: Sliding Window Maximum

**Input:** `nums = [1, 3, -1, -3, 5, 3, 6, 7]`, `k = 3`
**Expected output:** `[3, 3, 5, 5, 6, 7]`

**Java:**
```java
int[] maxSlidingWindow(int[] nums, int k) {
    int n = nums.length;
    int[] result = new int[n - k + 1];
    Deque<Integer> deque = new ArrayDeque<>();

    for (int i = 0; i < n; i++) {
        while (!deque.isEmpty() && deque.peekFirst() < i - k + 1) {
            deque.pollFirst();
        }
        while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) {
            deque.pollLast();
        }
        deque.offerLast(i);
        if (i >= k - 1) {
            result[i - k + 1] = nums[deque.peekFirst()];
        }
    }
    return result;
}
```

**JavaScript:**
```javascript
function maxSlidingWindow(nums, k) {
    const n = nums.length;
    const result = [];
    const deque = [];

    for (let i = 0; i < n; i++) {
        while (deque.length > 0 && deque[0] < i - k + 1) {
            deque.shift();
        }
        while (deque.length > 0 && nums[deque[deque.length - 1]] <= nums[i]) {
            deque.pop();
        }
        deque.push(i);
        if (i >= k - 1) {
            result.push(nums[deque[0]]);
        }
    }
    return result;
}
```

**Dry Run for `[1,3,-1,-3,5,3,6,7]`, k=3:**

| i | nums[i] | Remove expired | Remove smaller | Deque (indices) | Window max |
|---|---------|----------------|----------------|-----------------|------------|
| 0 | 1 | — | — | [0] | — |
| 1 | 3 | — | pop 0 (1≤3) | [1] | — |
| 2 | -1 | — | -1<3, keep | [1,2] | nums[1]=**3** |
| 3 | -3 | — | -3<-1, keep | [1,2,3] | nums[1]=**3** |
| 4 | 5 | pop 1 (expired) | pop 3(-3≤5),pop 2(-1≤5) | [4] | nums[4]=**5** |
| 5 | 3 | — | 3<5, keep | [4,5] | nums[4]=**5** |
| 6 | 6 | — | pop 5(3≤6),pop 4(5≤6) | [6] | nums[6]=**6** |
| 7 | 7 | — | pop 6(6≤7) | [7] | nums[7]=**7** |

**Result:** `[3, 3, 5, 5, 6, 7]` ✓

**Complexity:** O(n) time, O(k) space

---

## [45–55 min] Pattern Recognition

### How to Spot Each Pattern in a New Problem

**Use a plain Stack when you see:**
- "Valid," "matching," "balanced" → parentheses/bracket matching
- "Undo," "backspace," "delete previous" → pop on delete signal
- "Nested" structure to decode or evaluate → push context on enter, pop on exit
- Simulating DFS without recursion → explicit stack
- "Cancel" or "destroy" mechanics (asteroid collision) → push/pop simulation

**Structural clue:** "Do I need the most recently unresolved item?"
If yes → stack.

---

**Use a Monotonic Stack when you see:**
- "Next greater/smaller element"
- "Previous greater/smaller element"
- "How many days until warmer" / "stock span"
- "Largest rectangle" / "histogram" / "maximal rectangle"
- "For each element, contribution as min/max of subarrays"
- "Remove digits/characters to minimize/maximize lexicographic result"

**Structural clue:** "Am I waiting for the next element that beats the current one?"
If yes → decreasing stack (next greater) or increasing stack (next smaller).

**Direction guide:**
- Want next greater to the RIGHT → scan left to right, decreasing stack
- Want next smaller to the RIGHT → scan left to right, increasing stack
- Want previous greater to the LEFT → scan left to right, decreasing stack (answer = current stack top before push)
- Circular array → iterate twice (2n), use index mod n

---

**Use a Monotonic Queue (Deque) when you see:**
- "Maximum/minimum in every window of size K"
- "Sliding window" + "maximum/minimum"
- DP transition with "max/min over a sliding range of previous states"

**Structural clue:** "Do I need the max/min of a fixed-size sliding window efficiently?"
If yes → monotonic deque.

**Deque direction guide:**
- Sliding window maximum → decreasing deque (front = max)
- Sliding window minimum → increasing deque (front = min)

---

**Use a Queue (plain BFS) when you see:**
- Shortest path in unweighted graph
- "Minimum steps/moves/jumps"
- Level-order tree traversal
- "All nodes at distance K"
- "Rotting oranges," "word ladder," "gates and rooms"

**Structural clue:** "Do I need to process things in the order they were discovered?"
If yes → queue (BFS).

---

### Common Confusion Pairs

| Confused pattern | How to tell them apart |
|------------------|------------------------|
| Monotonic Stack vs Two Pointers | Monotonic stack finds nearest neighbor relationship; two pointers find a pair satisfying a global condition |
| Monotonic Stack vs DP | Monotonic stack finds O(1) boundary lookups; DP combines subproblem answers. Some problems use both. |
| Monotonic Queue vs Heap | Deque is O(n) total; heap is O(n log k). Use deque when window slides uniformly; heap when access pattern is irregular. |
| Trapping Rain Water vs Container With Most Water | Rain water: all bars fixed, find total water. Container: choose exactly two bars, maximize area between them. |
| Stack (for DFS) vs Queue (for BFS) | Stack → depth first (go deep then backtrack). Queue → breadth first (explore all neighbors before going deeper). |

---

## [55–60 min] Final Mental Checklist

```
WHAT IS IT?
  Stack: LIFO structure. O(1) push/pop/peek.
  Monotonic Stack: Stack maintaining sorted order. Pops resolve pending answers.
  Queue/Deque: FIFO or double-ended. Monotonic deque for sliding window max/min.

WHEN DO I USE IT?
  Stack: nesting, matching, undo, DFS
  Monotonic Stack: nearest greater/smaller, histogram area, subarray contribution
  Queue: BFS, level-order, FIFO simulation
  Deque: sliding window max/min, DP range optimization

WHEN DO I NOT USE IT?
  Stack: when you need FIFO, random access, or global min/max in O(1) forever
  Monotonic Stack: when you need Kth nearest, not 1st nearest
  Queue: when order does not matter or you need depth-first exploration

WHAT IS THE CORE IDEA?
  Stack: The most recently opened item must be the next one closed.
  Monotonic Stack: When a new element resolves multiple pending elements simultaneously, handle them all at once.
  Monotonic Queue: Eliminate elements that can never be the window answer before they're ever queried.

WHAT DO I TRACK?
  Stack: the open/unresolved items (values or indices)
  Monotonic Stack: indices (so you can compute distances/widths)
  Monotonic Queue: indices (so you can detect expiration)
  Min Stack: (value, current_min) pairs

WHAT IS THE INVARIANT/STATE?
  Decreasing monotonic stack: top is the smallest so far; every element not yet popped has no next-greater answer yet.
  Increasing monotonic stack: top is the largest so far; every element not yet popped has no next-smaller answer yet.
  Monotonic deque: front is the current window max; all elements are in decreasing order of value.

HOW DO I RECOGNIZE IT?
  "Nearest," "next," "previous" + "greater/smaller" → monotonic stack
  "Maximum/minimum in sliding window" → monotonic deque
  "Nested," "matching," "undo," "balanced" → plain stack
  "Shortest path," "level-order," "minimum steps" → queue (BFS)

WHAT ARE THE COMMON TRAPS?
  - Storing values instead of indices in monotonic stack/queue (you need indices to compute width/distance/expiry)
  - Forgetting the sentinel bar (height=0) at the end of histogram problems
  - Width formula in histogram: i - stack.peek() - 1 (not i - popped_index)
  - In Sum of Subarray Minimums: use strict inequality on one side to avoid double-counting duplicates
  - In Min Stack space optimization: push to min-stack on duplicates too, not just new minimums
  - In "Remove Duplicate Letters": only pop if the character appears again later (check remaining frequency)

WHAT PATTERNS CAN I CONFUSE IT WITH?
  - Monotonic Stack ↔ Two Pointers (different relationship type)
  - Monotonic Queue ↔ Heap (same complexity class, different constant; deque is faster when window is uniform)
  - Stack simulation ↔ Greedy (they often combine; the stack IS the greedy state)

WHAT IS THE COMPLEXITY?
  All monotonic stack operations: O(n) total (amortized O(1) per element — each element pushed and popped at most once)
  Monotonic queue: O(n) total
  Plain stack (parentheses, etc.): O(n) time, O(n) space
  Min Stack: O(1) per operation, O(n) space
```

---

## Active Recall

Answer these without looking above. If you can't, re-read the relevant section.

1. Explain in one sentence why parentheses matching is a stack problem and not a queue problem.
2. What is the invariant of a decreasing monotonic stack? What breaks it and what happens when it breaks?
3. In the Largest Rectangle in Histogram, why do you append a sentinel bar of height 0? What would go wrong without it?
4. In the width formula `i - stack.peek() - 1`, what does each term represent? Why isn't it simply `i - poppedIndex`?
5. Why does the two-pointer approach for Trapping Rain Water work? What guarantee allows you to process one side without knowing the exact other side?
6. In Sliding Window Maximum, why do you store indices in the deque rather than values? Give a concrete example where storing values would fail.
7. You see the problem "Sum of Subarray Minimums." How do you decompose it into a monotonic stack problem? What does the contribution formula look like?
8. What is the difference between "Trapping Rain Water" and "Container With Most Water"? Why do they require different approaches?
9. In Min Stack, why do you need to push to the secondary min-stack even when the new element equals the current minimum (not just strictly less)?
10. A problem says: "For each element, find the nearest element to its left that is strictly smaller." Which stack direction do you use? Which direction do you scan?

---

## Recommended Practice Direction

**Start here (build intuition):**
- Valid Parentheses (LeetCode 20)
- Daily Temperatures (LeetCode 739)
- Min Stack (LeetCode 155)

**Core skill builders:**
- Next Greater Element I (LeetCode 496)
- Next Greater Element II — circular array (LeetCode 503)
- Online Stock Span (LeetCode 901)
- Sliding Window Maximum (LeetCode 239)
- Basic Calculator II (LeetCode 227)

**Hard — must be able to derive, not just recall:**
- Largest Rectangle in Histogram (LeetCode 84)
- Trapping Rain Water (LeetCode 42) — solve all three approaches
- Sum of Subarray Minimums (LeetCode 907)
- Remove K Digits (LeetCode 402)
- Remove Duplicate Letters (LeetCode 316)

**Google-specific awareness:**
- Maximal Rectangle in Binary Matrix (LeetCode 85) — reduces to Histogram per row
- Trapping Rain Water II / 2D version (LeetCode 407) — BFS + min-heap, completely different
- Largest Rectangle problem is a known Google hard interview question

---

## 2-Minute Cheat Sheet

```
STACK
  Signal:  "nested," "matching," "undo," "most recent unresolved"
  Use:     push on open, pop on close/match
  Trap:    store indices not values when distances matter

MONOTONIC STACK
  Signal:  "next/previous greater/smaller," "histogram," "span"
  Decreasing (next greater): while top < current → pop + record answer → push
  Increasing (next smaller): while top > current → pop + record answer → push
  O(n) total because each element pushed/popped at most once
  Trap:    histogram needs sentinel 0 at end; width = i - newTop - 1

MONOTONIC QUEUE (sliding window max/min)
  Signal:  "maximum/minimum in every window of size K"
  Decreasing deque: front = current max
  Step 1 Remove expired from front (index < i-k+1)
  Step 2 Remove smaller from back (value ≤ current)
  Step 3 Push current index to back
  Step 4 Front is the answer for this window
  Trap:    store indices, not values

MIN STACK
  Each entry = (value, min_at_time_of_push)
  getMin() = stack.top.min — O(1), no scanning

TRAPPING RAIN WATER
  Two pointers: if left_max ≤ right_max → process left side (water = left_max - height[left])
  Bottleneck is always the smaller of the two maxes → process that side confidently

EXPRESSION EVALUATION
  +/-: push ±number onto stack
  */: pop, apply, push result
  (): push context (current sum + sign) on (, pop and combine on )
  Sum the stack at the end
```

---

## Advanced Awareness

These topics appear rarely in interviews but are good to know exist:

**Sum of Subarray Ranges / Sum of Subarray Minimums:** Uses monotonic stack to compute, for each element, how many subarrays it is the minimum of. The contribution formula is `element × left_count × right_count`, where boundaries are found via "previous smaller" (left) and "next smaller or equal" (right). The strict/non-strict asymmetry prevents double-counting duplicates.

**Maximal Rectangle in Binary Matrix (LeetCode 85):** Run Largest Rectangle in Histogram once per row, using a running height array where height[j] resets to 0 when the cell is 0. O(rows × cols) total.

**Trapping Rain Water II (3D / matrix, LeetCode 407):** Completely different from 1D. Uses a min-heap BFS starting from boundary cells. Process cells from lowest boundary inward. Water at each interior cell = max(current water level, height) - height. No monotonic stack applies here.

**Monotonic Queue for DP Optimization:** When a DP recurrence has the form `dp[i] = max(dp[j] for j in [i-K, i-1]) + cost(i)`, replace the O(K) inner scan with a monotonic deque to achieve O(1) per transition and O(n) total. This optimization appears in problems like Jump Game VI (LeetCode 1696).

**Max Stack with popMax() (LeetCode 716):** Requires a doubly linked list + TreeMap (sorted multiset) to find and remove the maximum in O(log n). The simple "store min with each element" trick does not extend to arbitrary-position removal.

---

*Next: [08-RECURSION-AND-BACKTRACKING.md](08-RECURSION-AND-BACKTRACKING.md) — The art of organized exploration.*
