# 315 – Recursion Mental Model

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Recursion breaks a problem into smaller self-similar subproblems. Three parts: **base case** (stop condition), **recursive case** (reduce toward base), **combine** (merge subresults). Think of the call stack as a stack of frames. Common pitfalls: missing base case → stack overflow, redundant calls → exponential time.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── MENTAL MODEL ────
// 1. What is the smallest version of this problem? (base case)
// 2. If I had the answer for n-1, how do I get answer for n? (recursive step)
// 3. Am I making the problem smaller each call? (progress guarantee)

// Factorial: base=1, step=n*f(n-1)
function factorial(n: number): number {
  if (n <= 1) return 1;         // base case
  return n * factorial(n - 1);   // recursive step
}

// Fibonacci (naive → exponential, shows need for memoization)
function fib(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2); // O(2^n) — terrible!
}

// Fibonacci with memoization → O(n)
function fibMemo(n: number, memo = new Map<number, number>()): number {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n)!;
  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}

// ──── RECURSION PATTERNS ────

// Pattern 1: Divide and Conquer (merge sort)
function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}
function merge(a: number[], b: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) result.push(a[i] < b[j] ? a[i++] : b[j++]);
  return [...result, ...a.slice(i), ...b.slice(j)];
}

// Pattern 2: Backtracking (generate permutations)
function permutations(nums: number[]): number[][] {
  const result: number[][] = [];
  function backtrack(path: number[], remaining: number[]) {
    if (remaining.length === 0) { result.push([...path]); return; }
    for (let i = 0; i < remaining.length; i++) {
      backtrack([...path, remaining[i]], [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
    }
  }
  backtrack([], nums);
  return result;
}

// Pattern 3: Tree recursion
interface TreeNode { val: number; left: TreeNode | null; right: TreeNode | null; }
function maxDepth(root: TreeNode | null): number {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I approach recursion with three questions: what's my base case, how do I reduce the problem, and am I making progress? If I see overlapping subproblems, I add memoization. Backtracking is recursion with 'choose → explore → unchoose'."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Deep flatten nested menu structure
interface MenuItem { label: string; children?: MenuItem[]; }
function flattenMenu(items: MenuItem[], depth = 0): { label: string; depth: number }[] {
  const result: { label: string; depth: number }[] = [];
  for (const item of items) {
    result.push({ label: item.label, depth });
    if (item.children) result.push(...flattenMenu(item.children, depth + 1));
  }
  return result;
}
```

## 5. 🧠 MEMORY AID
**"Recursion = base case + smaller subproblem + combine. Overlapping subproblems → memoize. Backtracking → choose/explore/unchoose."**

## 6. 🎯 COMPLEXITY
Depends on problem. Key: memoization turns exponential into polynomial.
