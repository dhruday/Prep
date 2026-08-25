# 307 – Monotonic Stack Problems

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
A monotonic stack maintains elements in sorted order (increasing or decreasing). Used for **next greater/smaller element**, **daily temperatures**, **stock span**, and **largest rectangle in histogram**. Pattern: iterate array, pop stack while current element breaks monotonic property.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// Next Greater Element — decreasing monotonic stack
function nextGreaterElement(nums: number[]): number[] {
  const result = new Array(nums.length).fill(-1);
  const stack: number[] = []; // stores indices
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[i] > nums[stack[stack.length - 1]]) {
      const idx = stack.pop()!;
      result[idx] = nums[i];
    }
    stack.push(i);
  }
  return result;
}

// Daily Temperatures — days until warmer day
function dailyTemperatures(temps: number[]): number[] {
  const result = new Array(temps.length).fill(0);
  const stack: number[] = [];
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {
      const idx = stack.pop()!;
      result[idx] = i - idx;
    }
    stack.push(i);
  }
  return result;
}

// Largest Rectangle in Histogram
function largestRectangleArea(heights: number[]): number {
  const stack: number[] = [-1];
  let maxArea = 0;
  for (let i = 0; i < heights.length; i++) {
    while (stack[stack.length - 1] !== -1 && heights[i] <= heights[stack[stack.length - 1]]) {
      const h = heights[stack.pop()!];
      const w = i - stack[stack.length - 1] - 1;
      maxArea = Math.max(maxArea, h * w);
    }
    stack.push(i);
  }
  while (stack[stack.length - 1] !== -1) {
    const h = heights[stack.pop()!];
    const w = heights.length - stack[stack.length - 1] - 1;
    maxArea = Math.max(maxArea, h * w);
  }
  return maxArea;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Monotonic stack solves 'next greater/smaller' problems in O(n). Decreasing stack for next greater, increasing for next smaller. Each element pushed and popped at most once → O(n)."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Find next higher z-index layer for tooltip positioning
function nextHigherZIndex(layers: number[]): number[] {
  return nextGreaterElement(layers);
}
```

## 5. 🧠 MEMORY AID
**"Monotonic stack: pop when current breaks order. Each element visits stack once → O(n). Decreasing stack → next greater. Increasing stack → next smaller."**

## 6. 🎯 COMPLEXITY
Time: O(n) | Space: O(n)
