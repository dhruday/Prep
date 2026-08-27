# Stacks & Queues

---

## Stack Basics — Parentheses Matching

### What is it?
A **stack** is a container where you can only add and remove from the top — last in, first out (LIFO). Parentheses matching uses a stack to verify that every opening bracket has a corresponding closing bracket in the correct order. When you open a bracket, push it; when you close one, pop and check.

### Visual
```
Input: ( { [ ] } )

Push (    Push {    Push [    ] arrives   } arrives   ) arrives
+-----+   +-----+   +-----+   +-----+    +-----+    +-----+
|  (  |   |  {  |   |  [  |   |  {  |    |  (  |    |     |
+-----+   |  (  |   |  {  |   |  (  |    +-----+    +-----+
          +-----+   |  (  |   +-----+    
                    +-----+   pop [, matches ] ✓
                              pop {, matches } ✓
                              pop (, matches ) ✓
                              stack empty → VALID
```

### How does it work?
1. Create an empty stack and a map of closing → opening bracket pairs.
2. Scan the string character by character left to right.
3. If the character is an opening bracket `(`, `{`, or `[`, push it onto the stack.
4. If it is a closing bracket `)`, `}`, or `]`, check the stack top.
5. If the stack is empty or the top does not match the expected opener, return false.
6. Otherwise pop the top.
7. After the loop, return true only if the stack is empty (every opener was closed).

### Why does it work?
The most recently opened bracket must be the next one closed — this is exactly the LIFO property of a stack. No other data structure captures this "last opened = first to close" rule in O(1).

### When to use?
- The problem involves matched or nested structures: brackets, parentheses, HTML tags.
- You need to validate or decode something with open/close symmetry.
- The word "balanced," "valid," or "matching" appears in the problem.
- Nested scopes need to be evaluated from innermost outward.

### When NOT to use?
- You need first-in-first-out order (use a queue).
- There is no nesting or matching relationship — just linear processing.

### How to recognize in a new problem?
Ask: "Does something that opens need to be closed, and does the most recently opened one close first?"
- Problem says "valid parentheses," "balanced brackets," "matching tags."
- Problem says "decode string" or "evaluate nested expression."
- Problem has a cancel/undo mechanic (backspace, asteroid collision) where the most recent item is affected first.

### Simple Example
Input: `"({[]})"`
Expected output: `true`

Trace:
```
( → push        stack: [ ( ]
{ → push        stack: [ (, { ]
[ → push        stack: [ (, {, [ ]
] → top is [, matches ] → pop    stack: [ (, { ]
} → top is {, matches } → pop    stack: [ ( ]
) → top is (, matches ) → pop    stack: [ ]
Empty stack → true
```

### Code
```java
// Java
boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    Map<Character, Character> matching = Map.of(')', '(', '}', '{', ']', '[');

    for (char c : s.toCharArray()) {
        if (!matching.containsKey(c)) {
            stack.push(c);                          // opening bracket
        } else {
            if (stack.isEmpty() || stack.peek() != matching.get(c)) {
                return false;                       // no match
            }
            stack.pop();
        }
    }
    return stack.isEmpty();
}
```
```javascript
// JavaScript
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

### Dry Run
Input: `"({[]})"`

| Step | Char | Stack |
|------|------|-------|
| 1 | `(` | `[(]` |
| 2 | `{` | `[(, {]` |
| 3 | `[` | `[(, {, []` |
| 4 | `]` | top `[` matches `]` → pop → `[(, {]` |
| 5 | `}` | top `{` matches `}` → pop → `[(]` |
| 6 | `)` | top `(` matches `)` → pop → `[]` |
| End | — | empty → return `true` |

### Complexity
```
Time:  O(n) — one pass through the string
Space: O(n) — stack holds at most n/2 openers in the worst case
```

### Common Trap
- Checking `stack.peek() != matching.get(c)` without first checking `stack.isEmpty()` causes a NullPointerException / crash.
- Returning `true` at the end without checking `stack.isEmpty()` — a string like `"((("` would incorrectly return true.

### Experience Tip
**Experience Tip:** Always store the opener on push, not the closer — then the match check is simply "does the top equal the expected opener." Keeping the map as `closing → opening` makes the code read naturally.

### Do Not Confuse With
- **Monotonic Stack:** Parentheses matching pops only when there is an exact character match. Monotonic stack pops based on a numeric comparison (greater/smaller). Different trigger condition entirely.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 20 | Valid Parentheses | Easy | Classic push/pop with a match map | https://leetcode.com/problems/valid-parentheses/ |
| 394 | Decode String | Medium | Push count + partial string on `[`, pop and expand on `]` | https://leetcode.com/problems/decode-string/ |
| 71 | Simplify Path | Medium | Push directory names, skip `.` and `..` with a pop | https://leetcode.com/problems/simplify-path/ |
| 150 | Evaluate Reverse Polish Notation | Medium | Push operands, pop two and push result on operator | https://leetcode.com/problems/evaluate-reverse-polish-notation/ |
| 155 | Min Stack | Medium | Pairs of (value, min-so-far) on the stack | https://leetcode.com/problems/min-stack/ |

### One-Minute Revision
```
ALGORITHM:        Stack Basics — Parentheses Matching
IN SIMPLE WORDS:  Push openers, pop on closers and check the match
USE WHEN:         Nested/matching structures, balanced brackets, undo mechanics
DON'T USE WHEN:   FIFO order needed, no open/close symmetry exists
CORE IDEA:        Most recently opened must be the next to close (LIFO)
TRACK:            The opening brackets not yet closed
TIME:             O(n)
SPACE:            O(n)
COMMON TRAP:      Check isEmpty() before peeking; check isEmpty() before returning true
EXPERIENCE TIP:   Map closing → opening so match check is just "top == expected opener"
```

---

## Monotonic Stack — Next Greater Element

### What is it?
A **monotonic stack** is a stack where elements are always kept in sorted order (all increasing or all decreasing from bottom to top). When a new element would break that order, you pop elements until the order is restored — and each pop is the moment that popped element "finds its answer." For Next Greater Element: for each index, find the first element to its right that is strictly larger.

### Visual
```
Heights: [ 2, 1, 5, 6, 2, 3 ]
           0  1  2  3  4  5

Stack stores indices. Elements in stack are in DECREASING order of height.

i=0 h=2  stack empty → push 0          stack: [0]       (heights: [2])
i=1 h=1  1 < 2 → push 1                stack: [0,1]     (heights: [2,1])
i=2 h=5  5 > 1 → pop 1, ans[1]=5
         5 > 2 → pop 0, ans[0]=5
         push 2                         stack: [2]       (heights: [5])
i=3 h=6  6 > 5 → pop 2, ans[2]=6
         push 3                         stack: [3]       (heights: [6])
i=4 h=2  2 < 6 → push 4                stack: [3,4]     (heights: [6,2])
i=5 h=3  3 > 2 → pop 4, ans[4]=3
         3 < 6 → push 5                 stack: [3,5]     (heights: [6,3])
End: indices 3,5 remain → no next greater → ans[3]=ans[5]=-1

Result: [5, 5, 6, -1, 3, -1]
```

### How does it work?
1. Initialize a result array filled with -1 (default: no greater element).
2. Initialize an empty stack that will store **indices** (not values).
3. Iterate left to right. For each index `i`:
4. While the stack is not empty AND the height at the stack top is less than `heights[i]`: pop the top index. The current element `heights[i]` is its next greater element — record it.
5. Push the current index `i` onto the stack.
6. After the loop, all indices still in the stack have no next greater element (result stays -1).

### Why does it work?
When element at index `idx` is popped, `heights[i]` is guaranteed to be the **nearest** greater element to its right. If any element between `idx` and `i` had been greater, it would have already popped `idx` earlier. So the first pop trigger = the nearest greater neighbor.

### When to use?
- "Next greater element" or "next smaller element" to the right.
- "Previous greater element" or "previous smaller element" to the left.
- "How many days until a warmer temperature" (daily temperatures).
- "Stock span" — how many consecutive days the price was lower.

### When NOT to use?
- You need the Kth nearest element, not the 1st nearest.
- The comparison is not strict left-to-right — use a different structure.

### How to recognize in a new problem?
Ask: "For each element, am I looking for the nearest element in one direction that beats it?"
- Problem says "next greater," "next smaller," "previous larger," "days until."
- Problem asks about spans or distances to the nearest boundary.
- Problem involves circular arrays with the same "nearest" flavor (iterate 2n, use index mod n).

### Simple Example
Input: `temps = [73, 74, 75, 71, 69, 72, 76, 73]`
Expected output: `[1, 1, 4, 2, 1, 1, 0, 0]`
(Each value = how many days until a warmer day; 0 means none.)

### Code
```java
// Java
int[] dailyTemperatures(int[] temps) {
    int n = temps.length;
    int[] result = new int[n];
    Deque<Integer> stack = new ArrayDeque<>();  // stores indices

    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && temps[stack.peek()] < temps[i]) {
            int prevDay = stack.pop();
            result[prevDay] = i - prevDay;      // distance to warmer day
        }
        stack.push(i);
    }
    return result;  // unresolved indices stay 0 (default)
}
```
```javascript
// JavaScript
function dailyTemperatures(temps) {
    const n = temps.length;
    const result = new Array(n).fill(0);
    const stack = [];  // stores indices

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

### Dry Run
Input: `[73, 74, 75, 71, 69, 72, 76, 73]`

| i | temp | Stack (indices) | Action | result update |
|---|------|-----------------|--------|---------------|
| 0 | 73 | `[]` | push 0 | — |
| 1 | 74 | `[0]` | 74>73 → pop 0, dist=1 → push 1 | result[0]=1 |
| 2 | 75 | `[1]` | 75>74 → pop 1, dist=1 → push 2 | result[1]=1 |
| 3 | 71 | `[2]` | 71<75 → push 3 | — |
| 4 | 69 | `[2,3]` | 69<71 → push 4 | — |
| 5 | 72 | `[2,3,4]` | 72>69 pop 4 dist=1; 72>71 pop 3 dist=2; 72<75 push 5 | result[4]=1, result[3]=2 |
| 6 | 76 | `[2,5]` | 76>72 pop 5 dist=1; 76>75 pop 2 dist=4; push 6 | result[5]=1, result[2]=4 |
| 7 | 73 | `[6]` | 73<76 → push 7 | — |
| End | — | `[6,7]` | no warmer → stay 0 | — |

Final: `[1, 1, 4, 2, 1, 1, 0, 0]` ✓

### Complexity
```
Time:  O(n) — each index is pushed once and popped at most once (≤ 2n operations)
Space: O(n) — stack holds at most n indices
```

### Common Trap
- Storing **values** instead of **indices** in the stack — you need the index to compute the distance `i - prevDay` and to write back into the result array at the correct position.
- Using `<=` instead of `<` in the while condition changes the semantics to "next greater or equal" — read the problem statement carefully.

### Experience Tip
**Experience Tip:** The decreasing monotonic stack is the default for "next greater element." If you need "next smaller element," flip to an increasing stack (pop while `stack.top > current`). The code shape is identical — only the comparison changes.

### Do Not Confuse With
- **Two Pointers:** Two pointers find a pair satisfying a global condition (e.g., sum = target). Monotonic stack finds the nearest neighbor relationship for every element independently. Different goal.
- **Brute Force O(n²):** Same correct answer, 100x slower. If n > 10,000, you need the stack.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 739 | Daily Temperatures | Medium | Classic next-greater — store indices, answer is distance | https://leetcode.com/problems/daily-temperatures/ |
| 496 | Next Greater Element I | Easy | Find NGE in nums2, then look up results for nums1 using a map | https://leetcode.com/problems/next-greater-element-i/ |
| 503 | Next Greater Element II | Medium | Circular array: iterate 2n, use index mod n | https://leetcode.com/problems/next-greater-element-ii/ |
| 901 | Online Stock Span | Medium | "Previous greater to the left" — same pattern, reversed direction | https://leetcode.com/problems/online-stock-span/ |
| 84 | Largest Rectangle in Histogram | Hard | Previous smaller left + next smaller right — both via one stack pass | https://leetcode.com/problems/largest-rectangle-in-histogram/ |

### One-Minute Revision
```
ALGORITHM:        Monotonic Stack — Next Greater Element
IN SIMPLE WORDS:  Keep a decreasing stack; when a bigger element arrives, pop and record answers
USE WHEN:         Next/previous greater or smaller element, spans, distances
DON'T USE WHEN:   Kth nearest needed, not 1st nearest
CORE IDEA:        First element that breaks the decreasing order IS the next greater for all popped elements
TRACK:            Indices (not values) of unresolved elements
TIME:             O(n) — each element pushed and popped at most once
SPACE:            O(n)
COMMON TRAP:      Store indices not values; use strict < for next-strictly-greater
EXPERIENCE TIP:   Swap < to > in the while condition to get next-smaller-element for free
```

---

## Monotonic Decreasing Stack — Largest Rectangle in Histogram

### What is it?
A **monotonic increasing stack** (elements increase bottom to top) finds, for each bar, the nearest shorter bar to its left and right. The rectangle anchored by that bar extends horizontally between those two shorter boundaries. This lets us compute the maximum rectangle area in one O(n) pass instead of O(n²).

### Visual
```
Heights: [2, 1, 5, 6, 2, 3]
          0  1  2  3  4  5

     6
   5 |
   | |   3
   | | 2 |
 2 | | | |
 | 1 | | |
 | | | | |
 0 1 2 3 4 5

When we reach index 4 (height=2):
  - Bar at index 3 (h=6): right boundary = index 4, left boundary = index 2 (top of stack after pop)
    width = 4 - 2 - 1 = 1, area = 6×1 = 6
  - Bar at index 2 (h=5): right boundary = index 4, left boundary = index 1 (top of stack after pop)
    width = 4 - 1 - 1 = 2, area = 5×2 = 10  ← maximum
```

### How does it work?
1. Append a sentinel bar of height 0 to the end of the heights array (forces all remaining bars to be processed).
2. Use a stack to store indices in increasing order of height (monotonic increasing stack).
3. For each index `i` from 0 to n (inclusive, with sentinel):
4. While the stack top has a height greater than `heights[i]`: pop it.
5. The popped bar's right boundary is the current index `i`.
6. The popped bar's left boundary is the new stack top (or -1 if stack is empty).
7. Width = `i - newTop - 1`. Compute area = `height × width`. Update max.
8. Push index `i`.

### Why does it work?
When bar `h` is popped, `i` is the first bar to its right that is shorter (that is what triggered the pop), and the new stack top is the first bar to its left that is shorter (it survived because it was shorter — the old shorter bars to the left are already resolved). So the space between them is exactly how far bar `h` can extend horizontally.

### When to use?
- "Largest rectangle in histogram."
- Any problem reducible to histogram area (maximal rectangle in binary matrix).
- Problems asking for the maximum area or width bounded by a height constraint.

### When NOT to use?
- You need total water trapped, not rectangle area (different formula — use Trapping Rain Water approach).
- The boundaries are not determined by "first shorter bar" on each side.

### How to recognize in a new problem?
Ask: "Is there a bar that defines a height, and does the usable width depend on the nearest shorter bars on both sides?"
- Problem has heights/bars and asks for maximum area.
- Problem gives a 2D binary matrix and asks for the largest rectangle of 1s (run histogram per row).
- Problem has "contribution of element as minimum of a range."

### Simple Example
Input: `heights = [2, 1, 5, 6, 2, 3]`
Expected output: `10` (rectangle of height 5 and width 2, covering bars at index 2 and 3)

### Code
```java
// Java
int largestRectangleArea(int[] heights) {
    int n = heights.length;
    int[] h = Arrays.copyOf(heights, n + 1);
    h[n] = 0;                              // sentinel
    Deque<Integer> stack = new ArrayDeque<>();
    int maxArea = 0;

    for (int i = 0; i <= n; i++) {
        while (!stack.isEmpty() && h[stack.peek()] > h[i]) {
            int height = h[stack.pop()];
            int leftBoundary = stack.isEmpty() ? -1 : stack.peek();
            int width = i - leftBoundary - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    return maxArea;
}
```
```javascript
// JavaScript
function largestRectangleArea(heights) {
    const h = [...heights, 0];             // append sentinel
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

### Dry Run
Input: `[2, 1, 5, 6, 2, 3]` → with sentinel: `[2, 1, 5, 6, 2, 3, 0]`

| i | h[i] | Stack | Pop | Area computed | maxArea |
|---|------|-------|-----|---------------|---------|
| 0 | 2 | `[]` → push 0 | — | — | 0 |
| 1 | 1 | `[0]`: 2>1 → pop 0 | h=2, left=-1, w=1 | 2×1=2 | 2 |
| 1 | 1 | `[]` → push 1 | — | — | 2 |
| 2 | 5 | `[1]` → push 2 | — | — | 2 |
| 3 | 6 | `[1,2]` → push 3 | — | — | 2 |
| 4 | 2 | `[1,2,3]`: 6>2 → pop 3 | h=6, left=2, w=1 | 6×1=6 | 6 |
| 4 | 2 | `[1,2]`: 5>2 → pop 2 | h=5, left=1, w=2 | 5×2=10 | 10 |
| 4 | 2 | `[1]`: 1≤2 → push 4 | — | — | 10 |
| 5 | 3 | `[1,4]` → push 5 | — | — | 10 |
| 6 | 0 | `[1,4,5]`: 3>0 → pop 5 | h=3, left=4, w=1 | 3×1=3 | 10 |
| 6 | 0 | `[1,4]`: 2>0 → pop 4 | h=2, left=1, w=4 | 2×4=8 | 10 |
| 6 | 0 | `[1]`: 1>0 → pop 1 | h=1, left=-1, w=6 | 1×6=6 | 10 |
| 6 | 0 | `[]` → push 6 | — | — | 10 |

Final: `10` ✓

### Complexity
```
Time:  O(n) — each index pushed once and popped at most once
Space: O(n) — stack holds at most n indices
```

### Common Trap
- Forgetting the sentinel `0` at the end — bars that are never popped during the loop (all bars in the final stack) never get their area computed.
- Using `i - poppedIndex` for width instead of `i - newStackTop - 1` — the left boundary is the new stack top after popping, not the popped index itself.

### Experience Tip
**Experience Tip:** The width formula `i - stack.peek() - 1` trips up almost everyone. After popping, the new stack top is the first bar shorter than the popped bar to its left. So the rectangle spans from `newTop + 1` to `i - 1`, giving width `(i - 1) - (newTop + 1) + 1 = i - newTop - 1`. Draw it out once and it will stick.

### Do Not Confuse With
- **Trapping Rain Water:** Water is trapped above each bar based on min of tallest walls on both sides minus bar height. Rectangle is max height × width of consecutive bars. Completely different formula and logic.
- **Next Greater Element:** That finds the first taller bar. Histogram uses the first shorter bar (to know when a rectangle's height can no longer extend).

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 84 | Largest Rectangle in Histogram | Hard | Sentinel 0 at end; width = i - newTop - 1 | https://leetcode.com/problems/largest-rectangle-in-histogram/ |
| 85 | Maximal Rectangle | Hard | Run histogram problem once per row; heights[j]=0 on cell '0' | https://leetcode.com/problems/maximal-rectangle/ |
| 42 | Trapping Rain Water | Hard | Related but different formula — min of max walls, not max rectangle | https://leetcode.com/problems/trapping-rain-water/ |
| 907 | Sum of Subarray Minimums | Medium | Contribution = element × (left count) × (right count) via prev/next smaller | https://leetcode.com/problems/sum-of-subarray-minimums/ |
| 496 | Next Greater Element I | Easy | Warm-up; same stack mechanics, simpler trigger | https://leetcode.com/problems/next-greater-element-i/ |

### One-Minute Revision
```
ALGORITHM:        Monotonic Increasing Stack — Largest Rectangle in Histogram
IN SIMPLE WORDS:  Pop when current bar is shorter; popped bar's rectangle spans between the two shorter neighbors
USE WHEN:         Largest rectangle area, histogram area, maximal rectangle of 1s in matrix
DON'T USE WHEN:   Trapping water (different formula), nearest greater element (use decreasing stack)
CORE IDEA:        When a bar is popped, its left and right shorter boundaries are both known
TRACK:            Indices in increasing order of height
TIME:             O(n)
SPACE:            O(n)
COMMON TRAP:      Must append sentinel 0; width = i - newTop - 1, not i - poppedIndex
EXPERIENCE TIP:   Draw width formula once: newTop+1 to i-1 → width = i - newTop - 1
```

---

## Trapping Rain Water

### What is it?
Water trapped at any position equals the height of the shorter of the tallest wall on its left and the tallest wall on its right, minus the bar's own height. Two pointer approach eliminates O(n) extra space by exploiting the fact that the side with the smaller max determines the water level — you can process that side immediately without knowing the exact value of the other max.

### Visual
```
heights: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]

         |
     |   |
     | ~ | ~ | ~ |
     | ~ | ~ | ~ | ~ |
 _ _ | _ | _ _ | _ | _  (bars)
 0 1 2 3 4 5 6 7 8 9 10 11

Water (shown as ~) = min(leftMax, rightMax) - height at each position
Position 5: min(2,3) - 0 = 2 units of water
```

### How does it work?
Two-pointer approach (O(1) space):
1. Place `left = 0`, `right = n-1`, `leftMax = 0`, `rightMax = 0`, `total = 0`.
2. While `left <= right`:
3. If `height[left] <= height[right]`: the water at `left` is bounded by `leftMax` (not rightMax — rightMax is at least as large). If `height[left] >= leftMax`, update `leftMax`. Otherwise add `leftMax - height[left]` to total. Move `left++`.
4. If `height[right] < height[left]`: same logic on the right side. Move `right--`.
5. Return total.

### Why does it work?
At any point, if `height[left] <= height[right]`, then `leftMax <= rightMax` (because rightMax includes the current right boundary which is taller). So `min(leftMax, rightMax) = leftMax`. Water at `left` is `leftMax - height[left]` regardless of what exactly `rightMax` is. You can commit to this value now without looking rightward.

### When to use?
- The problem asks for total trapped water in a 1D array of heights.
- There is a "bounded container" structure with a height array.

### When NOT to use?
- 2D / matrix trapping rain water (LeetCode 407) — completely different, requires BFS + min-heap.
- You want the maximum area between two bars (Container With Most Water) — that is a two-pointer problem but different formula.

### How to recognize in a new problem?
Ask: "Is water/liquid trapped between vertical walls in a 1D array?"
- Problem shows a histogram-like elevation map and asks for total water volume.
- The phrase "rain water," "trapped water," or "fill with liquid" appears.

### Simple Example
Input: `heights = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]`
Expected output: `6`

Trace (two-pointer):
```
left=0 right=11, leftMax=0 rightMax=0
Process left: height[0]=0 >= leftMax=0 → update leftMax=0, no water. left=1
Process left: height[1]=1 >= leftMax=0 → update leftMax=1. left=2
Process left: height[2]=0 < leftMax=1 → water += 1-0=1. left=3
... total accumulates to 6
```

### Code
```java
// Java
int trap(int[] height) {
    int left = 0, right = height.length - 1;
    int leftMax = 0, rightMax = 0;
    int total = 0;

    while (left <= right) {
        if (height[left] <= height[right]) {
            if (height[left] >= leftMax) {
                leftMax = height[left];
            } else {
                total += leftMax - height[left];
            }
            left++;
        } else {
            if (height[right] >= rightMax) {
                rightMax = height[right];
            } else {
                total += rightMax - height[right];
            }
            right--;
        }
    }
    return total;
}
```
```javascript
// JavaScript
function trap(height) {
    let left = 0, right = height.length - 1;
    let leftMax = 0, rightMax = 0;
    let total = 0;

    while (left <= right) {
        if (height[left] <= height[right]) {
            if (height[left] >= leftMax) {
                leftMax = height[left];
            } else {
                total += leftMax - height[left];
            }
            left++;
        } else {
            if (height[right] >= rightMax) {
                rightMax = height[right];
            } else {
                total += rightMax - height[right];
            }
            right--;
        }
    }
    return total;
}
```

### Dry Run
Input: `[3, 0, 2, 0, 4]`

| left | right | leftMax | rightMax | Action | total |
|------|-------|---------|----------|--------|-------|
| 0 | 4 | 0 | 0 | h[0]=3 > h[4]=4? No. h[0]=3 >= leftMax=0 → leftMax=3. left=1 | 0 |
| 1 | 4 | 3 | 0 | h[1]=0 <= h[4]=4. 0 < leftMax=3 → total += 3-0=3. left=2 | 3 |
| 2 | 4 | 3 | 0 | h[2]=2 <= h[4]=4. 2 < leftMax=3 → total += 3-2=1. left=3 | 4 |
| 3 | 4 | 3 | 0 | h[3]=0 <= h[4]=4. 0 < leftMax=3 → total += 3-0=3. left=4 | 7 |
| 4 | 4 | 3 | 0 | h[4]=4 > h[4]=4? No. h[4]=4 >= leftMax=3 → leftMax=4. left=5 | 7 |

Hmm, expected for `[3,0,2,0,4]` = 7. ✓

### Complexity
```
Time:  O(n) — single pass with two pointers
Space: O(1) — only four variables (two-pointer approach)
```

### Common Trap
- Using `height[left] < height[right]` (strict less) vs `<=` — either works but be consistent with which side you process on ties.
- Confusing with Largest Rectangle — water uses `min(leftMax, rightMax) - height`. Rectangle uses `height × width`.

### Experience Tip
**Experience Tip:** The two-pointer approach feels magical at first. The insight is: whichever side has the smaller maximum is the bottleneck — you know exactly how much water is there without caring about the other side. Process the bottleneck side and move inward.

### Do Not Confuse With
- **Largest Rectangle in Histogram:** That finds a rectangle of uniform height. This finds trapped water (min-wall-bounded puddle per position).
- **Container With Most Water (LeetCode 11):** You pick exactly two bars, no bars in between count. Two-pointer strategy is similar but formula is `min(h[left], h[right]) × (right - left)`.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 42 | Trapping Rain Water | Hard | Two-pointer: process the side with the smaller max | https://leetcode.com/problems/trapping-rain-water/ |
| 11 | Container With Most Water | Medium | Two-pointer but pick only two bars; move the shorter one | https://leetcode.com/problems/container-with-most-water/ |
| 84 | Largest Rectangle in Histogram | Hard | Related but rectangle not water — different formula | https://leetcode.com/problems/largest-rectangle-in-histogram/ |
| 85 | Maximal Rectangle | Hard | Builds on histogram approach row by row | https://leetcode.com/problems/maximal-rectangle/ |

### One-Minute Revision
```
ALGORITHM:        Trapping Rain Water (Two Pointers)
IN SIMPLE WORDS:  Water at any spot = min(tallest left wall, tallest right wall) - bar height
USE WHEN:         1D histogram, total trapped water volume
DON'T USE WHEN:   2D matrix version (use BFS+heap), max area between two bars (different formula)
CORE IDEA:        Process the side with the smaller max — it is the bottleneck, no need to check the other side
TRACK:            left, right pointers; leftMax, rightMax running maximums
TIME:             O(n)
SPACE:            O(1)
COMMON TRAP:      Don't confuse min-wall formula (water) with max-rectangle formula (histogram)
EXPERIENCE TIP:   The smaller max side is always the bottleneck — commit to that side's value immediately
```

---

## Min Stack

### What is it?
A **Min Stack** is a stack that supports push, pop, top, and `getMin` — all in O(1) time. The trick is to store the current minimum alongside each element at push time. When you pop, the previous element's stored minimum is automatically the new minimum — no scanning needed.

### Visual
```
Operations: push(5) → push(3) → push(7) → push(2) → pop → getMin

After push(5):  stack: [(5, min=5)]
After push(3):  stack: [(5, min=5), (3, min=3)]
After push(7):  stack: [(5, min=5), (3, min=3), (7, min=3)]
After push(2):  stack: [(5, min=5), (3, min=3), (7, min=3), (2, min=2)]
After pop:      stack: [(5, min=5), (3, min=3), (7, min=3)]
getMin():       return stack.top.min = 3  ← no scan needed
```

### How does it work?
1. Each stack entry stores two values: the element and the minimum at the time of push.
2. On `push(x)`: compute `newMin = (stack empty) ? x : min(x, stack.top.min)`. Push the pair `(x, newMin)`.
3. On `pop()`: pop the top pair normally.
4. On `top()`: return the value part of the top pair.
5. On `getMin()`: return the min part of the top pair — O(1), no scanning.

### Why does it work?
Each element "remembers" what the minimum was at the exact moment it was pushed. When elements above it are popped, the state reverts to that remembered minimum instantly.

### When to use?
- You need a stack with O(1) minimum retrieval.
- Stack contents change over time (pushes and pops) and you always need the current minimum.

### When NOT to use?
- You need the Kth smallest, not the global minimum.
- You need minimum in a sliding window (use monotonic deque instead).

### How to recognize in a new problem?
Ask: "Is there a stack where I need to query the minimum efficiently at any point?"
- Problem says "design a stack that also supports getMin."
- Problem requires you to track the minimum as elements are pushed/popped dynamically.

### Simple Example
```
push(3) → push(5) → push(2) → getMin → pop → getMin
                                  ↓               ↓
                                  2               3
```

### Code
```java
// Java
class MinStack {
    private Deque<int[]> stack = new ArrayDeque<>();  // each entry: [value, currentMin]

    public void push(int val) {
        int currentMin = stack.isEmpty() ? val : Math.min(val, stack.peek()[1]);
        stack.push(new int[]{val, currentMin});
    }

    public void pop() {
        stack.pop();
    }

    public int top() {
        return stack.peek()[0];
    }

    public int getMin() {
        return stack.peek()[1];
    }
}
```
```javascript
// JavaScript
class MinStack {
    constructor() {
        this.stack = [];  // each entry: { val, min }
    }

    push(val) {
        const currentMin = this.stack.length === 0
            ? val
            : Math.min(val, this.stack[this.stack.length - 1].min);
        this.stack.push({ val, min: currentMin });
    }

    pop() {
        this.stack.pop();
    }

    top() {
        return this.stack[this.stack.length - 1].val;
    }

    getMin() {
        return this.stack[this.stack.length - 1].min;
    }
}
```

### Dry Run
Operations: `push(-2)`, `push(0)`, `push(-3)`, `getMin()`, `pop()`, `top()`, `getMin()`

| Operation | Stack (value, min) | Returns |
|-----------|-------------------|---------|
| push(-2) | `[(-2, -2)]` | — |
| push(0) | `[(-2,-2), (0,-2)]` | — |
| push(-3) | `[(-2,-2), (0,-2), (-3,-3)]` | — |
| getMin() | top.min = -3 | `-3` |
| pop() | `[(-2,-2), (0,-2)]` | — |
| top() | top.val = 0 | `0` |
| getMin() | top.min = -2 | `-2` |

### Complexity
```
Time:  O(1) per operation — push, pop, top, getMin all constant time
Space: O(n) — each element stored with its min value (2× space of plain stack)
```

### Common Trap
- Only pushing to a secondary min-stack when the new value is strictly less than the current min — then when you pop a non-minimum value, the min-stack is out of sync. Store the min alongside every element, not just on new minimums.

### Experience Tip
**Experience Tip:** Some implementations use two separate stacks (a main stack and a min-stack). Both approaches work. The "pair per entry" approach is simpler to reason about — every entry is self-contained with its own history.

### Do Not Confuse With
- **Priority Queue / Heap:** A heap gives you O(log n) insert and O(1) or O(log n) min. Min Stack gives O(1) for everything but only works because it is a stack (LIFO) — you can't access arbitrary elements.
- **Monotonic Deque for Sliding Window Min:** That tracks the minimum within a moving window. Min Stack tracks the minimum of the entire stack at any moment.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 155 | Min Stack | Medium | Each entry = (value, min at push time) | https://leetcode.com/problems/min-stack/ |
| 716 | Max Stack | Hard | Pop-max requires a sorted structure + doubly linked list | https://leetcode.com/problems/max-stack/ |
| 239 | Sliding Window Maximum | Hard | Moving window max — use deque, not min-stack | https://leetcode.com/problems/sliding-window-maximum/ |
| 20 | Valid Parentheses | Easy | Stack fundamentals warm-up | https://leetcode.com/problems/valid-parentheses/ |

### One-Minute Revision
```
ALGORITHM:        Min Stack
IN SIMPLE WORDS:  Each entry stores (value, minimum-at-push-time); getMin = stack.top.min
USE WHEN:         Stack with O(1) current-minimum query
DON'T USE WHEN:   Kth smallest needed, or sliding window minimum (use deque)
CORE IDEA:        Minimum is a snapshot tied to each push; it reverts automatically on pop
TRACK:            (value, currentMin) pairs
TIME:             O(1) per operation
SPACE:            O(n)
COMMON TRAP:      Store min with EVERY push, not only new minimums — or pop gets out of sync
EXPERIENCE TIP:   Two-stack variant is equivalent — one for values, one for running mins
```

---

## Sliding Window Maximum — Monotonic Deque

### What is it?
A **deque** (double-ended queue) allows adding and removing from both front and back. A monotonic deque keeps elements in decreasing order (for window maximum). For each window of size k, the front of the deque is always the index of the maximum. When a new element arrives, remove from the back all smaller elements (they can never be the max for any future window). Remove from the front any index that has slid out of the window.

### Visual
```
nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3

Deque stores INDICES. Heights at those indices are in DECREASING order.

i=0 nums[0]=1   deque: [0]           window not full yet
i=1 nums[1]=3   3>1 → pop 0         deque: [1]           window not full yet
i=2 nums[2]=-1  -1<3 → keep         deque: [1,2]         window full → max = nums[1] = 3
i=3 nums[3]=-3  -3<-1 → keep        deque: [1,2,3]       max = nums[1] = 3
i=4 nums[4]=5   expire 1(1<4-3+1=2),5>-3 pop,5>-1 pop,5>3 pop  deque: [4]   max = nums[4] = 5
i=5 nums[5]=3   3<5 → keep          deque: [4,5]         max = nums[4] = 5
i=6 nums[6]=6   6>3 pop,6>5 pop     deque: [6]           max = nums[6] = 6
i=7 nums[7]=7   7>6 pop             deque: [7]           max = nums[7] = 7

Result: [3, 3, 5, 5, 6, 7]
```

### How does it work?
1. Create an empty deque (stores indices).
2. For each index `i` from 0 to n-1:
3. **Remove expired from front:** while the front index is less than `i - k + 1`, remove from front.
4. **Remove useless smaller from back:** while the back index has a value <= `nums[i]`, remove from back.
5. Add current index `i` to the back.
6. If `i >= k - 1` (window is full), the front of the deque is the index of the current window's maximum.

### Why does it work?
Any element smaller than a newer element that is also to its right can never be the window max for any future window (the newer larger element will still be in the window when the smaller one is still there, and the smaller one leaves first). Removing it early is safe and keeps the deque sorted.

### When to use?
- "Maximum (or minimum) in every sliding window of size k."
- DP optimization where the transition is `dp[i] = max(dp[j]) + cost` for `j` in a sliding range.

### When NOT to use?
- The window is not a fixed size and expands/contracts irregularly (use a heap).
- You need the 2nd maximum or Kth maximum in the window.

### How to recognize in a new problem?
Ask: "Do I need the max or min of a contiguous window of fixed size, efficiently?"
- Problem says "sliding window maximum/minimum," "every window of size k."
- DP recurrence has a `max over a range of previous states` where that range slides forward.

### Simple Example
Input: `nums = [1, 3, -1, -3, 5, 3, 6, 7]`, `k = 3`
Expected output: `[3, 3, 5, 5, 6, 7]`

### Code
```java
// Java
int[] maxSlidingWindow(int[] nums, int k) {
    int n = nums.length;
    int[] result = new int[n - k + 1];
    Deque<Integer> deque = new ArrayDeque<>();  // stores indices

    for (int i = 0; i < n; i++) {
        // Remove indices outside the window
        while (!deque.isEmpty() && deque.peekFirst() < i - k + 1) {
            deque.pollFirst();
        }
        // Remove smaller elements from the back (they're useless)
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
```javascript
// JavaScript
function maxSlidingWindow(nums, k) {
    const n = nums.length;
    const result = [];
    const deque = [];  // stores indices

    for (let i = 0; i < n; i++) {
        // Remove indices outside the window
        while (deque.length > 0 && deque[0] < i - k + 1) {
            deque.shift();
        }
        // Remove smaller elements from the back
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

### Dry Run
Input: `[1, 3, -1, -3, 5, 3, 6, 7]`, k=3

| i | nums[i] | Expire front | Remove back (smaller) | Deque | Window max |
|---|---------|-------------|----------------------|-------|------------|
| 0 | 1 | — | — | [0] | — |
| 1 | 3 | — | pop 0 (1≤3) | [1] | — |
| 2 | -1 | — | -1<3, keep | [1,2] | nums[1]=**3** |
| 3 | -3 | — | -3<-1, keep | [1,2,3] | nums[1]=**3** |
| 4 | 5 | pop 1 (1<2) | pop 3,2,1 (all ≤5) | [4] | nums[4]=**5** |
| 5 | 3 | — | 3<5, keep | [4,5] | nums[4]=**5** |
| 6 | 6 | — | pop 5,4 (both ≤6) | [6] | nums[6]=**6** |
| 7 | 7 | — | pop 6 (6≤7) | [7] | nums[7]=**7** |

Result: `[3, 3, 5, 5, 6, 7]` ✓

### Complexity
```
Time:  O(n) — each index added to deque once and removed at most once
Space: O(k) — deque holds at most k indices at any time
```

### Common Trap
- Storing values instead of indices — you cannot check expiration (`index < i - k + 1`) if you stored values.
- Using strict `<` when removing from the back — if `nums[back] == nums[i]`, keep the newer one (it expires later). Use `<=` when removing from the back.

### Experience Tip
**Experience Tip:** There are exactly four lines of logic: expire front, clean back, push current, record answer if window full. Write them in this order every time and you will not miss a step.

### Do Not Confuse With
- **Max Heap / Priority Queue:** A heap also gives you window max but in O(n log k). The deque is faster at O(n) when the window slides uniformly. Use the deque for fixed-size sliding windows; use a heap when the window is irregular or you need lazy deletion.
- **Min Stack:** That tracks the global min of the entire stack. Deque tracks the max within a moving window.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 239 | Sliding Window Maximum | Hard | Classic monotonic deque; store indices not values | https://leetcode.com/problems/sliding-window-maximum/ |
| 1696 | Jump Game VI | Medium | DP + deque: max of previous k dp values in O(1) per step | https://leetcode.com/problems/jump-game-vi/ |
| 862 | Shortest Subarray with Sum at Least K | Hard | Monotonic deque on prefix sums — deque finds the best j for each i | https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/ |
| 1438 | Longest Continuous Subarray With Absolute Diff ≤ Limit | Medium | Maintain both a max-deque and a min-deque simultaneously | https://leetcode.com/problems/longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit/ |

### One-Minute Revision
```
ALGORITHM:        Sliding Window Maximum — Monotonic Deque
IN SIMPLE WORDS:  Decreasing deque; front = window max; remove expired from front, smaller from back
USE WHEN:         Max or min of every fixed-size window; DP range max optimization
DON'T USE WHEN:   Window size is irregular (use heap); need Kth max (different structure)
CORE IDEA:        A smaller older element can never beat a larger newer element — discard it immediately
TRACK:            Indices (for expiration check)
TIME:             O(n)
SPACE:            O(k)
COMMON TRAP:      Store indices not values; use <= when removing from back (remove equals)
EXPERIENCE TIP:   Four steps every time: expire front → clean back → push i → record if i >= k-1
```

---

## Expression Evaluation — Basic Calculator

### What is it?
Expression evaluation uses a stack to handle operator precedence. The rule: `+` and `-` push their operand onto the stack; `*` and `/` pop the top operand and immediately compute (because they bind tighter). At the end, sum the stack. Parentheses are handled by pushing the current running total and sign when you see `(`, then popping and combining when you see `)`.

### Visual
```
Expression: "3 + 2 * 2"
             3  +  2  *  2

See 3, op=+: push +3        stack: [3]
See 2, op=*: pop 3... wait — op is * not +
Actually: process left to right, tracking the PREVIOUS operator

num=3, prevOp=+: push +3             stack: [3]
num=2, prevOp=+: push +2             stack: [3, 2]
num=2, prevOp=*: pop 2, push 2*2=4   stack: [3, 4]
Sum stack: 3 + 4 = 7 ✓

Expression: "2 * (3 + 4)"
See (: push currentSum=0 and sign=+1 onto context stack, reset
  Process 3+4 = 7 inside parens
See ): pop context: result = sign * innerSum + savedSum = 1 * 7 + 0 = 7
  Then multiply by 2 (prevOp was *): 2*7 = 14
```

### How does it work?
For Basic Calculator II (`+`, `-`, `*`, `/`, no parentheses):
1. Initialize `stack = []`, `currentNum = 0`, `prevOp = '+'`.
2. Scan left to right. Build multi-digit numbers with `currentNum = currentNum * 10 + digit`.
3. On an operator or end of string: apply `prevOp` to `currentNum`:
   - `+` → push `+currentNum`
   - `-` → push `-currentNum`
   - `*` → pop, push `pop * currentNum`
   - `/` → pop, push `int(pop / currentNum)` (truncate toward zero)
4. Update `prevOp = current operator`, reset `currentNum = 0`.
5. Return `sum(stack)`.

For parentheses: when `(` is seen, save `(runningSum, sign)` on a context stack and reset. When `)` is seen, compute the inner sum, then `result = savedSign * innerSum + savedRunningSum`.

### Why does it work?
`*` and `/` bind tighter than `+` and `-`. By immediately evaluating `*` and `/` (pop + apply + push) and deferring `+` and `-` (just push the signed operand), you naturally respect precedence without parsing a tree. The stack accumulates additive terms; multiplication collapses them eagerly.

### When to use?
- "Implement a calculator" with any combination of `+`, `-`, `*`, `/`, `(`, `)`.
- Evaluating an arithmetic expression string in O(n).
- Reverse Polish Notation (postfix) — even simpler, no precedence needed.

### When NOT to use?
- The expression has no operators or is already parsed into an AST.
- You only need to check validity, not evaluate (use parentheses matching).

### How to recognize in a new problem?
Ask: "Am I given an arithmetic expression as a string and need to evaluate it?"
- Problem says "implement calculator," "evaluate expression," "parse math string."
- Problem has postfix notation (Reverse Polish Notation) — use stack directly, no precedence handling.

### Simple Example
Input: `"3+2*2"`
Expected output: `7`

Trace:
```
prevOp=+, num=3 → push +3           stack: [3]
prevOp=+, num=2 → push +2           stack: [3, 2]
prevOp=*, num=2 → pop 2, push 2*2=4 stack: [3, 4]
sum(stack) = 7
```

### Code
```java
// Java — Basic Calculator II (no parentheses)
int calculate(String s) {
    Deque<Integer> stack = new ArrayDeque<>();
    int currentNum = 0;
    char prevOp = '+';

    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);

        if (Character.isDigit(c)) {
            currentNum = currentNum * 10 + (c - '0');
        }

        if ((!Character.isDigit(c) && c != ' ') || i == s.length() - 1) {
            if (prevOp == '+') stack.push(currentNum);
            else if (prevOp == '-') stack.push(-currentNum);
            else if (prevOp == '*') stack.push(stack.pop() * currentNum);
            else if (prevOp == '/') stack.push(stack.pop() / currentNum);

            prevOp = c;
            currentNum = 0;
        }
    }

    int result = 0;
    for (int val : stack) result += val;
    return result;
}
```
```javascript
// JavaScript — Basic Calculator II (no parentheses)
function calculate(s) {
    const stack = [];
    let currentNum = 0;
    let prevOp = '+';

    for (let i = 0; i < s.length; i++) {
        const c = s[i];

        if (c >= '0' && c <= '9') {
            currentNum = currentNum * 10 + parseInt(c);
        }

        if ((c !== ' ' && !(c >= '0' && c <= '9')) || i === s.length - 1) {
            if (prevOp === '+') stack.push(currentNum);
            else if (prevOp === '-') stack.push(-currentNum);
            else if (prevOp === '*') stack.push(stack.pop() * currentNum);
            else if (prevOp === '/') stack.push(Math.trunc(stack.pop() / currentNum));

            prevOp = c;
            currentNum = 0;
        }
    }

    return stack.reduce((a, b) => a + b, 0);
}
```

### Dry Run
Input: `"14-3*2"`

| i | char | currentNum | prevOp | Action | Stack |
|---|------|-----------|--------|--------|-------|
| 0 | `1` | 1 | `+` | digit, build | — |
| 1 | `4` | 14 | `+` | digit, build | — |
| 2 | `-` | 14 | `+` | op: push +14 | [14] |
| 3 | `3` | 3 | `-` | digit, build | [14] |
| 4 | `*` | 3 | `-` | op: push -3 | [14, -3] |
| 5 | `2` | 2 | `*` | digit, build | [14, -3] |
| end | — | 2 | `*` | last char: pop -3, push -3*2=-6 | [14, -6] |

Sum: 14 + (-6) = `8` ✓

### Complexity
```
Time:  O(n) — single pass through the string
Space: O(n) — stack holds at most n/2 operands
```

### Common Trap
- Forgetting to process the last number after the loop ends — the loop only applies `prevOp` when it sees an operator, so the last number is never processed unless you handle `i == s.length - 1` explicitly.
- Integer division truncation: in Java `int / int` truncates toward zero correctly. In JavaScript, use `Math.trunc()` not `Math.floor()` — `-7/2` should be `-3`, not `-4`.

### Experience Tip
**Experience Tip:** The variable `prevOp` is the key insight — you always apply the operator you just finished reading (not the one you are currently on). Initialize it to `'+'` so the first number is pushed with a positive sign by default.

### Do Not Confuse With
- **Reverse Polish Notation (LeetCode 150):** Already in postfix — no precedence logic needed. Just push numbers; on operator, pop two and push result. Much simpler.
- **Parentheses Matching (LeetCode 20):** Checks validity only, does not evaluate. No numbers involved.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 227 | Basic Calculator II | Medium | No parentheses; prevOp trick; handle last number after loop | https://leetcode.com/problems/basic-calculator-ii/ |
| 150 | Evaluate Reverse Polish Notation | Medium | Already postfix; push nums, on op pop two and push result | https://leetcode.com/problems/evaluate-reverse-polish-notation/ |
| 224 | Basic Calculator | Hard | Has parentheses; push (runningSum, sign) on `(`, pop and combine on `)` | https://leetcode.com/problems/basic-calculator/ |
| 394 | Decode String | Medium | Same parenthesis-context-push idea applied to string repetition | https://leetcode.com/problems/decode-string/ |

### One-Minute Revision
```
ALGORITHM:        Expression Evaluation — Basic Calculator
IN SIMPLE WORDS:  +/- push operand; */÷ pop-apply-push immediately; sum stack at the end
USE WHEN:         Evaluate arithmetic string with mixed precedence operators
DON'T USE WHEN:   Expression is already an AST or in postfix (RPN)
CORE IDEA:        Defer + and - (push); commit * and / (pop-compute-push) — precedence handled naturally
TRACK:            prevOp, currentNum, stack of partial results
TIME:             O(n)
SPACE:            O(n)
COMMON TRAP:      Handle last number after loop; use Math.trunc (not floor) for negative division in JS
EXPERIENCE TIP:   prevOp is initialized to + so the first number is pushed positively by default
```

---
