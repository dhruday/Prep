# 10 — DSA, Machine Coding, Behavioral & Revision

> **Scope:** DSA for Frontend, Machine Coding, System Design Problems, Interview Strategy, FAANG Expectations, Behavioral, Engineering Wisdom, Cheat Sheets  
> **Topics:** FE 393–474 + BE 146–160 (~97 topics)  
> **Format:** Q&A with follow-ups, trade-offs, code examples

---

## Table of Contents

### Frontend — DSA for Frontend Engineers
- [Part A — Arrays & Strings (393–396)](#part-a--arrays--strings-topics-393396)
- [Part B — Hashmaps, Stacks, Queues (397–402)](#part-b--hashmaps-stacks-queues-topics-397402)
- [Part C — Trees, Graphs, Recursion, DP (403–410)](#part-c--trees-graphs-recursion-dp-topics-403410)

### Frontend — Machine Coding & System Design Problems
- [Part D — UI Components Machine Coding (411–419)](#part-d--ui-components-machine-coding-topics-411419)
- [Part E — Large System Designs (420–431)](#part-e--large-system-designs-topics-420431)
- [Part F — Design Bridge & Code Quality (432–443)](#part-f--design-bridge--code-quality-topics-432443)

### Frontend — Interview Strategy & FAANG Expectations
- [Part G — Interview Flow & Communication (444–454)](#part-g--interview-flow--communication-topics-444454)
- [Part H — Senior/Staff Expectations (455–466)](#part-h--seniorstaff-expectations-topics-455466)
- [Part I — Behavioral & Leadership (467–474)](#part-i--behavioral--leadership-topics-467474)

### Backend — Engineering Wisdom & Revision
- [Part J — Engineering Wisdom (146–149)](#part-j--engineering-wisdom-topics-146149)
- [Part K — Ultimate Cheat Sheets (150–155)](#part-k--ultimate-cheat-sheets-topics-150155)
- [Part L — Interview Q&A (156–160)](#part-l--interview-qa-topics-156160)

---

# Part A — Arrays & Strings (Topics 393–396)

---

## 393. Two Pointers Pattern

### Q: Explain the Two Pointers technique and when to use it.

**Answer (Interview-Ready):**

**Two pointers = use two index variables to traverse data structure, reducing O(n²) to O(n).**

```js
// Example: Two Sum (sorted array)
function twoSum(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    const sum = arr[left] + arr[right];
    if (sum === target) return [left, right];
    if (sum < target) left++;
    else right--;
  }
  return [-1, -1];
}

// Example: Remove Duplicates (in-place)
function removeDuplicates(arr) {
  let write = 1;
  for (let read = 1; read < arr.length; read++) {
    if (arr[read] !== arr[read - 1]) {
      arr[write++] = arr[read];
    }
  }
  return write;
}
```

**When to use:**
- Sorted array → converging pointers (left/right)
- Linked list → slow/fast (cycle detection)
- In-place array modification → read/write pointers

🔥 **Most Asked**: Sorted two-sum, container with most water, palindrome check
🧠 **Strategy**: "Sorted? Converge from both ends. In-place modify? Read/write pointers. Cycle? Slow/fast"

---

## 394. Sliding Window Pattern

### Q: How does the Sliding Window pattern work?

**Answer (Interview-Ready):**

```js
// Fixed-size window: max sum of k consecutive elements
function maxSumSubarray(arr, k) {
  let windowSum = arr.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum = windowSum;
  for (let i = k; i < arr.length; i++) {
    windowSum += arr[i] - arr[i - k];  // Slide: add right, remove left
    maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
}

// Variable-size window: smallest subarray with sum ≥ target
function minSubArrayLen(target, arr) {
  let left = 0, sum = 0, minLen = Infinity;
  for (let right = 0; right < arr.length; right++) {
    sum += arr[right];
    while (sum >= target) {
      minLen = Math.min(minLen, right - left + 1);
      sum -= arr[left++];   // Shrink window
    }
  }
  return minLen === Infinity ? 0 : minLen;
}
```

| Type | Window Size | Example |
|------|------------|---------|
| Fixed | `k` elements | Max sum of k consecutive |
| Variable | Expand right, shrink left | Longest substring without repeats |

🔥 **Most Asked**: Longest substring without repeating chars, minimum window substring
🧠 **Strategy**: "Fixed: slide by adding right, removing left. Variable: expand right until valid, shrink left to optimize"

---

## 395. Prefix Sums

### Q: How do prefix sums help with range queries?

**Answer (Interview-Ready):**

```js
// Build prefix sum array
function buildPrefix(arr) {
  const prefix = [0];
  for (let i = 0; i < arr.length; i++) {
    prefix.push(prefix[i] + arr[i]);
  }
  return prefix;
}

// Range sum query in O(1)
function rangeSum(prefix, left, right) {
  return prefix[right + 1] - prefix[left];
}

// Example: Subarray Sum Equals K (using hashmap + prefix sum)
function subarraySum(arr, k) {
  const prefixCount = new Map([[0, 1]]);
  let sum = 0, count = 0;
  for (const num of arr) {
    sum += num;
    count += prefixCount.get(sum - k) || 0;
    prefixCount.set(sum, (prefixCount.get(sum) || 0) + 1);
  }
  return count;
}
```

🔥 **Most Asked**: Subarray sum equals K, range sum queries, product of array except self

---

## 396. Anagram / Palindrome Problems

### Q: How do you efficiently solve anagram and palindrome problems?

**Answer (Interview-Ready):**

```js
// Anagram check: O(n) with frequency map
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const freq = new Map();
  for (const c of s) freq.set(c, (freq.get(c) || 0) + 1);
  for (const c of t) {
    const count = freq.get(c);
    if (!count) return false;
    freq.set(c, count - 1);
  }
  return true;
}

// Group Anagrams: sort as key
function groupAnagrams(strs) {
  const map = new Map();
  for (const s of strs) {
    const key = [...s].sort().join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.values()];
}

// Palindrome check: two pointers
function isPalindrome(s) {
  let l = 0, r = s.length - 1;
  while (l < r) {
    if (s[l++] !== s[r--]) return false;
  }
  return true;
}
```

🔥 **Most Asked**: Group anagrams, valid palindrome (with cleanup), longest palindromic substring

---

# Part B — Hashmaps, Stacks, Queues (Topics 397–402)

---

## 397. Frequency Maps Pattern

### Q: How do you use frequency maps to solve problems?

**Answer (Interview-Ready):**

```js
// Top K Frequent Elements
function topKFrequent(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);
  
  // Bucket sort by frequency
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [num, count] of freq) buckets[count].push(num);
  
  const result = [];
  for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
    result.push(...buckets[i]);
  }
  return result.slice(0, k);
}

// First Unique Character
function firstUniqChar(s) {
  const freq = new Map();
  for (const c of s) freq.set(c, (freq.get(c) || 0) + 1);
  for (let i = 0; i < s.length; i++) {
    if (freq.get(s[i]) === 1) return i;
  }
  return -1;
}
```

🔥 **Most Asked**: Top K frequent, first unique, majority element

---

## 398. Two-Sum Variants

### Q: What are the key Two-Sum variations?

**Answer (Interview-Ready):**

```js
// Classic Two Sum: O(n) with hashmap
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}

// Three Sum: sort + two pointers → O(n²)
function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue; // Skip duplicates
    let left = i + 1, right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]]);
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        left++; right--;
      } else if (sum < 0) left++;
      else right--;
    }
  }
  return result;
}
```

🔥 **Most Asked**: Classic two-sum, three-sum, two-sum with sorted array (two pointers)

---

## 399. Grouping & Bucketing

### Q: How do you use grouping and bucketing to optimize solutions?

**Answer (Interview-Ready):**

```js
// Bucket Sort for Maximum Gap (O(n))
function maximumGap(nums) {
  if (nums.length < 2) return 0;
  const min = Math.min(...nums), max = Math.max(...nums);
  const bucketSize = Math.max(1, Math.floor((max - min) / (nums.length - 1)));
  const bucketCount = Math.floor((max - min) / bucketSize) + 1;
  
  const buckets = Array.from({ length: bucketCount }, () => 
    ({ min: Infinity, max: -Infinity, used: false })
  );
  
  for (const n of nums) {
    const idx = Math.floor((n - min) / bucketSize);
    buckets[idx].used = true;
    buckets[idx].min = Math.min(buckets[idx].min, n);
    buckets[idx].max = Math.max(buckets[idx].max, n);
  }
  
  let maxGap = 0, prevMax = min;
  for (const b of buckets) {
    if (!b.used) continue;
    maxGap = Math.max(maxGap, b.min - prevMax);
    prevMax = b.max;
  }
  return maxGap;
}
```

**Pattern:** When sorting is needed but you want O(n), consider bucket sort. Group elements into fixed-size ranges.

🔥 **Most Asked**: Maximum gap, sort colors (Dutch flag), bucket-based frequency problems

---

## 400. Monotonic Stack Problems

### Q: What is a monotonic stack and when do you use it?

**Answer (Interview-Ready):**

```js
// Next Greater Element: O(n) with decreasing stack
function nextGreaterElement(nums) {
  const result = new Array(nums.length).fill(-1);
  const stack = [];  // Stores indices, values are decreasing
  
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
      result[stack.pop()] = nums[i];
    }
    stack.push(i);
  }
  return result;
}

// Daily Temperatures: days until warmer temperature
function dailyTemperatures(temps) {
  const result = new Array(temps.length).fill(0);
  const stack = [];
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[stack[stack.length - 1]] < temps[i]) {
      const prev = stack.pop();
      result[prev] = i - prev;
    }
    stack.push(i);
  }
  return result;
}
```

**Pattern:** "Find the next greater/smaller element" → monotonic stack. O(n) because each element pushed and popped at most once.

🔥 **Most Asked**: Daily temperatures, next greater element, trapping rain water, largest rectangle in histogram

---

## 401. Browser History / Undo-Redo Simulation

### Q: How would you implement browser history or undo/redo with stacks?

**Answer (Interview-Ready):**

```js
class BrowserHistory {
  constructor(homepage) {
    this.backStack = [homepage];
    this.forwardStack = [];
  }
  
  visit(url) {
    this.backStack.push(url);
    this.forwardStack = [];  // Clear forward history
  }
  
  back(steps) {
    while (steps-- > 0 && this.backStack.length > 1) {
      this.forwardStack.push(this.backStack.pop());
    }
    return this.backStack[this.backStack.length - 1];
  }
  
  forward(steps) {
    while (steps-- > 0 && this.forwardStack.length > 0) {
      this.backStack.push(this.forwardStack.pop());
    }
    return this.backStack[this.backStack.length - 1];
  }
}
```

**Undo/Redo:** Two stacks — undo stack (executed commands), redo stack (undone commands). Undo pops from undo → pushes to redo. New command clears redo.

🔥 **Most Asked**: Browser history, undo/redo, implementing back/forward navigation

---

## 402. Queue-Based BFS

### Q: How do you implement BFS using a queue?

**Answer (Interview-Ready):**

```js
// BFS template
function bfs(graph, start) {
  const visited = new Set([start]);
  const queue = [start];
  
  while (queue.length) {
    const node = queue.shift();  // Dequeue
    
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);    // Enqueue
      }
    }
  }
}

// Level-order traversal (tree)
function levelOrder(root) {
  if (!root) return [];
  const result = [], queue = [root];
  
  while (queue.length) {
    const level = [];
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}
```

**Key:** BFS = queue (FIFO). DFS = stack (LIFO) or recursion. BFS finds shortest path in unweighted graphs.

🔥 **Most Asked**: Level-order traversal, shortest path in grid, rotting oranges

---

# Part C — Trees, Graphs, Recursion, DP (Topics 403–410)

---

## 403–405. BFS/DFS Templates, Traversals, Level Order

### Q: Provide templates for tree traversals and graph search.

**Answer (Interview-Ready):**

```js
// 403 — DFS Template (recursive)
function dfs(node, visited = new Set()) {
  if (!node || visited.has(node)) return;
  visited.add(node);
  // Process node
  for (const neighbor of node.neighbors) dfs(neighbor, visited);
}

// 404 — Binary Tree Traversals
function inorder(node) {     // Left → Root → Right (sorted for BST)
  if (!node) return [];
  return [...inorder(node.left), node.val, ...inorder(node.right)];
}
function preorder(node) {    // Root → Left → Right (serialize/copy)
  if (!node) return [];
  return [node.val, ...preorder(node.left), ...preorder(node.right)];
}
function postorder(node) {   // Left → Right → Root (delete/cleanup)
  if (!node) return [];
  return [...postorder(node.left), ...postorder(node.right), node.val];
}

// 405 — Level Order (BFS) — see Topic 402
// Also: Zigzag level order
function zigzagLevel(root) {
  const result = [], queue = [root];
  let leftToRight = true;
  while (queue.length) {
    const level = [];
    for (let i = queue.length; i > 0; i--) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(leftToRight ? level : level.reverse());
    leftToRight = !leftToRight;
  }
  return result;
}
```

🔥 **Most Asked**: Inorder for BST validation, preorder for serialization, level order for printing

---

## 406–407. Graph Components & DOM Traversal

### Q: Find connected components and how does DOM traversal relate?

**Answer (Interview-Ready):**

```js
// 406 — Connected Components (undirected graph)
function countComponents(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }
  
  const visited = new Set();
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      dfs(i, adj, visited);
      count++;
    }
  }
  return count;
}

// 407 — DOM Tree as Graph
function traverseDOM(root) {
  // BFS: level-by-level (breadth)
  const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    console.log(node.tagName);
    queue.push(...node.children);  // children = child nodes
  }
}

// Find element by class (DFS)
function findByClass(root, className) {
  if (root.classList?.contains(className)) return root;
  for (const child of root.children) {
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}
```

🔥 **Most Asked**: DOM as tree structure, implementing querySelector, flood fill

---

## 408–410. Recursion, Memoization, Classic DP

### Q: Explain recursion mental model and key DP patterns.

**Answer (Interview-Ready):**

**408 — Recursion Mental Model:**
1. **Base case** — when to stop
2. **Recursive case** — break problem into smaller subproblems
3. **Trust the recursion** — assume recursive call works correctly

```js
// Template
function solve(input) {
  if (isBaseCase(input)) return baseResult;
  return combine(solve(smallerInput1), solve(smallerInput2));
}
```

**409 — Memoization vs Tabulation:**
```js
// Memoization (Top-Down): recursive + cache
function fib(n, memo = {}) {
  if (n <= 1) return n;
  if (memo[n]) return memo[n];
  return memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
}

// Tabulation (Bottom-Up): iterative + table
function fib(n) {
  const dp = [0, 1];
  for (let i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
  return dp[n];
}
```

| | Memoization | Tabulation |
|-|------------|-----------|
| Direction | Top-down | Bottom-up |
| Implementation | Recursive + cache | Iterative + array |
| Space | Only computed states | All states |
| Stack overflow risk | Yes (deep recursion) | No |

**410 — Classic DP Problems:**
```js
// Climbing Stairs: dp[i] = dp[i-1] + dp[i-2]
// Coin Change: dp[amount] = min(dp[amount], dp[amount - coin] + 1)

function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i) dp[i] = Math.min(dp[i], dp[i - coin] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}

// LCS: Longest Common Subsequence
function lcs(s1, s2) {
  const dp = Array.from({ length: s1.length + 1 }, () => 
    new Array(s2.length + 1).fill(0)
  );
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      dp[i][j] = s1[i-1] === s2[j-1]
        ? dp[i-1][j-1] + 1
        : Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[s1.length][s2.length];
}
```

🔥 **Most Asked**: Climbing stairs, coin change, longest common subsequence, 0/1 knapsack
🧠 **Strategy**: "Identify overlapping subproblems + optimal substructure. Start with brute force → add memoization → convert to tabulation if needed"

---

# Part D — UI Components Machine Coding (Topics 411–419)

---

## 411. Autocomplete Search

### Q: Design and implement an autocomplete search component.

**Answer (Interview-Ready):**

```tsx
function Autocomplete({ fetchSuggestions }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortRef = useRef(null);

  const debouncedSearch = useMemo(() =>
    debounce(async (q) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const data = await fetchSuggestions(q, { signal: abortRef.current.signal });
        setResults(data);
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      }
    }, 300), [fetchSuggestions]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') setActiveIndex(i => Math.min(i + 1, results.length - 1));
    if (e.key === 'ArrowUp') setActiveIndex(i => Math.max(i - 1, 0));
    if (e.key === 'Enter' && activeIndex >= 0) selectItem(results[activeIndex]);
    if (e.key === 'Escape') setResults([]);
  };

  return (
    <div role="combobox" aria-expanded={results.length > 0} aria-haspopup="listbox">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); debouncedSearch(e.target.value); }}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-controls="suggestions"
      />
      <ul id="suggestions" role="listbox">
        {results.map((item, i) => (
          <li key={item.id} role="option" aria-selected={i === activeIndex}
              onClick={() => selectItem(item)}>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Key patterns:** Debounce (300ms), AbortController (cancel stale requests), keyboard nav, ARIA combobox.

🔥 **Most Asked**: Debounce, race conditions, ARIA, keyboard navigation
🧠 **Strategy**: "Debounce input. AbortController for race conditions. ARIA combobox for accessibility. Keyboard: arrows + enter + escape"

---

## 412. Infinite Scroll

### Q: Implement infinite scroll with IntersectionObserver.

**Answer (Interview-Ready):**

```tsx
function InfiniteList({ fetchPage }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore) {
        loadMore();
      }
    }, { rootMargin: '200px' });  // Prefetch 200px before visible

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, hasMore]);

  async function loadMore() {
    const newItems = await fetchPage(page);
    if (newItems.length === 0) { setHasMore(false); return; }
    setItems(prev => [...prev, ...newItems]);
    setPage(prev => prev + 1);
  }

  return (
    <div>
      {items.map(item => <ItemCard key={item.id} data={item} />)}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" />}
    </div>
  );
}
```

**For large lists:** Combine with **virtualization** (only render visible items) using `react-window` or `@tanstack/virtual`.

🔥 **Most Asked**: IntersectionObserver vs scroll events, virtualization, loading states

---

## 413. Notification System

### Q: Design a frontend notification/toast system.

**Answer (Interview-Ready):**

```tsx
// State: queue of notifications
const NotificationContext = createContext();

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const add = useCallback((notification) => {
    const id = crypto.randomUUID();
    setNotifications(prev => [...prev, { id, ...notification }]);
    if (notification.autoDismiss !== false) {
      setTimeout(() => remove(id), notification.duration || 5000);
    }
  }, []);

  const remove = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ add, remove }}>
      {children}
      <div role="status" aria-live="polite" className="toast-container">
        {notifications.map(n => (
          <Toast key={n.id} {...n} onClose={() => remove(n.id)} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
```

**Key:** `aria-live="polite"` for screen reader announcements, queue management, auto-dismiss with manual close option.

🔥 **Most Asked**: Queue management, auto-dismiss, ARIA live regions, animation

---

## 414. Drag-and-Drop List

### Q: Implement a reorderable drag-and-drop list.

**Answer (Interview-Ready):**

```tsx
function DragList({ items, onReorder }) {
  const [dragIndex, setDragIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === index) return;
    const newItems = [...items];
    const [dragged] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, dragged);
    onReorder(newItems);
    setDragIndex(index);
  };

  return (
    <ul role="listbox" aria-label="Reorderable list">
      {items.map((item, i) => (
        <li key={item.id}
            draggable
            onDragStart={e => handleDragStart(e, i)}
            onDragOver={e => handleDragOver(e, i)}
            onDragEnd={() => setDragIndex(null)}
            aria-grabbed={dragIndex === i}>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
```

**Keyboard alternative:** Arrow keys to move focus, Space/Enter to pick up, Arrow keys to reposition, Space/Enter to drop.

🔥 **Most Asked**: HTML5 drag API, keyboard alternative, aria-grabbed, performance with large lists

---

## 415–416. Poll Widget & Image Carousel

### Q: How do you build a poll widget and an accessible carousel?

**Answer (Interview-Ready):**

**415 — Poll Widget:**
```tsx
function Poll({ question, options, onVote }) {
  const [voted, setVoted] = useState(null);
  const [results, setResults] = useState(null);

  async function handleVote(optionId) {
    setVoted(optionId);
    const res = await onVote(optionId);  // Optimistic or confirmed
    setResults(res);
  }

  return (
    <fieldset>
      <legend>{question}</legend>
      {options.map(opt => (
        <label key={opt.id}>
          <input type="radio" name="poll" value={opt.id}
                 disabled={voted !== null}
                 onChange={() => handleVote(opt.id)} />
          {opt.text}
          {results && <progress value={results[opt.id]} max={results.total} />}
        </label>
      ))}
    </fieldset>
  );
}
```

**416 — Accessible Carousel:**
- ARIA: `role="group"`, `aria-roledescription="carousel"`, `aria-label="Slide X of Y"`
- Keyboard: Left/Right arrows, focus management on slide change
- Touch: swipe gestures with `touchstart`/`touchmove`/`touchend`
- Pause auto-play on hover/focus, respect `prefers-reduced-motion`

🔥 **Most Asked**: Optimistic updates (poll), ARIA for carousel, auto-play pause

---

## 417–419. Date Picker, Rich Text Editor, Virtual Scrolling

### Q: Discuss implementation approaches for these complex components.

**Answer (Interview-Ready):**

**417 — Date Picker:**
- Calendar grid: `role="grid"`, cells as `role="gridcell"`
- Keyboard: Arrow keys navigate days, Page Up/Down for months, Home/End for first/last of month
- Localization: `Intl.DateTimeFormat` for locale-aware month/day names
- Range selection: track start/end dates, highlight range on hover

**418 — Rich Text Editor:**
```js
// contenteditable approach
<div contentEditable="true"
     onInput={e => onChange(e.currentTarget.innerHTML)}
     dangerouslySetInnerHTML={{ __html: value }} />

// Better: use document.execCommand (deprecated) or
// Input events with beforeinput for fine control
// Production: use Slate.js, TipTap, or ProseMirror
```

**Key challenges:** Cursor position preservation, paste sanitization (XSS!), undo/redo, list/table support.

**419 — Virtual Scrolling from Scratch:**
```tsx
function VirtualList({ items, itemHeight, containerHeight }) {
  const [scrollTop, setScrollTop] = useState(0);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
  
  return (
    <div style={{ height: containerHeight, overflow: 'auto' }}
         onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {items.slice(startIndex, endIndex).map((item, i) => (
          <div key={item.id} style={{
            position: 'absolute',
            top: (startIndex + i) * itemHeight,
            height: itemHeight,
          }}>
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
}
```

🔥 **Most Asked**: Virtual scroll math, Rich text XSS, Date picker keyboard nav

---

# Part E — Large System Designs (Topics 420–431)

---

## 420. Design Flipkart/Amazon Cart System

### Q: Design a frontend cart system for an e-commerce platform.

**Answer (Interview-Ready):**

**Requirements:** Add/remove items, quantity update, price calculation, persist across sessions, sync with backend.

**Architecture:**
```
┌──────────────────────────────────────────────┐
│  Cart Store (Zustand / Redux)                │
│  { items[], totals, loading, syncing }       │
├──────────────────────────────────────────────┤
│  CartService                                  │
│  - addItem() → optimistic UI + API call      │
│  - removeItem() → optimistic + rollback      │
│  - sync() → reconcile local ↔ server         │
├──────────────────────────────────────────────┤
│  Persistence: localStorage (guest)           │
│                API (logged in)               │
│  Conflict: server wins, notify user          │
└──────────────────────────────────────────────┘
```

**Key decisions:**
- Optimistic updates (instant UI, rollback on failure)
- Debounce quantity changes (avoid rapid API calls)
- Guest → login merge: union carts, server-side deduplication
- Price recalculation: server-authoritative (never trust client prices)

🔥 **Most Asked**: Optimistic updates, guest-to-auth merge, price trust boundary

---

## 421. Design LinkedIn-Style Feed

### Q: Design a social media feed with infinite scroll and real-time updates.

**Answer (Interview-Ready):**

```
┌─────────────────────────────────┐
│  Feed Component                  │
│  ┌───────────────────────────┐  │
│  │ New posts banner (click)  │  │  ← WebSocket: new post notification
│  ├───────────────────────────┤  │
│  │ Post (impression tracked) │  │
│  │ Post                      │  │  ← Virtualized list (react-window)
│  │ Post                      │  │
│  │ ...                       │  │
│  │ [Loading sentinel]         │  │  ← IntersectionObserver → fetch next page
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Key decisions:**
- Cursor-based pagination (not offset — handles new posts)
- "New posts available" banner (don't auto-insert — jarring scroll)
- Impression tracking (IntersectionObserver, 50% visible for 1s)
- Stale-while-revalidate caching

🔥 **Most Asked**: Pagination strategy, real-time without disrupting scroll, impression tracking

---

## 422–423. Chat UI & Slack-Like Interface

### Q: Design a real-time chat system frontend.

**Answer (Interview-Ready):**

**Core architecture:**
```
WebSocket Connection
  ↕
Message Store (per channel)
  ↕
Chat Components
├── Channel List (sidebar)
├── Message List (virtualized, reverse scroll)
├── Composer (input + attachments)
└── Presence Indicator (online/offline)
```

**Key patterns:**
- **WebSocket** with reconnection + exponential backoff
- **Optimistic messages:** Show immediately with "sending…" state
- **Message ordering:** Server timestamp as source of truth
- **Reverse infinite scroll:** Load older messages when scrolling up
- **Typing indicators:** Debounced WebSocket events
- **Offline queue:** Store unsent messages in IndexedDB

**Slack-specific (423):** Channels, threads (nested message view), reactions, presence, notification badges, search.

🔥 **Most Asked**: WebSocket reconnection, optimistic messages, reverse scroll, offline queue

---

## 424–425. Collaborative Editor & File Upload

### Q: Design a Google Docs-style collaborative editor and a file upload system.

**Answer (Interview-Ready):**

**424 — Collaborative Editor:**
- **CRDT or OT (Operational Transform)** for conflict resolution
- Real-time: WebSocket sends operations (insert "a" at position 5)
- Cursor presence: each user's cursor position shown in real-time
- Libraries: Yjs (CRDT), ShareDB (OT)
- Trade-off: CRDT = simpler merge, more memory. OT = less memory, complex server.

**425 — File Upload with Progress & Resume:**
```tsx
async function uploadFile(file) {
  const chunkSize = 5 * 1024 * 1024;  // 5MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  // Get upload session (resume point)
  const { uploadId, completedChunks } = await initUpload(file.name, totalChunks);
  
  for (let i = 0; i < totalChunks; i++) {
    if (completedChunks.includes(i)) continue;  // Skip already uploaded
    const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
    await uploadChunk(uploadId, i, chunk, (progress) => {
      updateProgress(i, totalChunks, progress);
    });
  }
  await completeUpload(uploadId);
}
```

Key: Chunked upload, resumable (server tracks chunks), progress per chunk, retry failed chunks.

🔥 **Most Asked**: CRDT vs OT, resumable uploads, progress tracking

---

## 426–431. Company-Specific Designs & Common Systems

### Q: Design company-specific and common frontend systems.

**Answer (Interview-Ready):**

**426 — Cisco Network Monitoring Dashboard:**
- Real-time WebSocket for device status updates
- SVG/Canvas for network topology visualization
- Threshold-based alerting (device down → red, high latency → yellow)
- Table virtualization for 10K+ devices
- Trade-off: Canvas (fast rendering) vs SVG (interactive, accessible)

**427 — Salesforce CRM Record View:**
- Object Page pattern (header + anchored sections)
- Lazy-loaded related lists (contacts, opportunities)
- Inline editing with optimistic updates
- Multi-record comparison view

**428 — Adobe Asset Manager:**
- Grid/list view toggle for digital assets
- Thumbnail generation (server-side, progressive loading)
- Drag-and-drop upload with preview
- Metadata panel (EXIF, keywords, usage rights)
- Canvas-based image preview with zoom/pan

**429 — E-Commerce Frontend:**
- Product listing (filters, sort, pagination)
- PDP (product detail page) with image gallery
- Cart + checkout flow (multi-step form, validation)

**430 — Live Dashboard:**
- WebSocket for real-time metric updates
- Chart library (D3, Chart.js, Recharts) with streaming data
- Configurable widgets (user can add/remove/rearrange)
- Auto-refresh with pause on user interaction

**431 — Comment System:**
- Threaded comments (recursive tree rendering)
- Infinite scroll for top-level, "Show replies" for nested
- Optimistic add/edit/delete
- Rich text (basic markdown), @mentions
- Moderation: report, hide, admin tools

🔥 **Most Asked**: Dashboard real-time patterns, e-commerce checkout flow, comment threading

---

# Part F — Design Bridge & Code Quality (Topics 432–443)

---

## 432–434. Component Decomposition, State vs Props, Edge Cases

### Q: How do you decompose a UI into components and handle edge cases?

**Answer (Interview-Ready):**

**432 — Component Decomposition:**
1. **Identify visual blocks** — header, sidebar, content, footer
2. **Single responsibility** — each component does one thing
3. **Data flow determines hierarchy** — parent owns shared state
4. **Reusability boundary** — extract when used 2+ times

```
ProductPage
├── ProductHeader (title, price, rating)
├── ImageGallery (images[], selectedIndex)
├── ProductDetails (description, specs)
├── ReviewSection
│   ├── ReviewSummary (avgRating, distribution)
│   └── ReviewList (reviews[], pagination)
└── AddToCart (product, onAdd)
```

**433 — State vs Props:**
| State | Props |
|-------|-------|
| Owned by the component | Passed from parent |
| Mutable (via setter) | Read-only |
| Triggers re-render on change | Triggers re-render when parent updates |
| Use for: user input, UI state | Use for: display data, callbacks |

**Rule:** Lift state to the lowest common ancestor of components that need it.

**434 — Edge Case Handling:**
- Empty states (no data, empty search results)
- Loading states (skeleton, spinner)
- Error states (retry button, fallback UI)
- Long text (truncation, tooltip, overflow)
- Rapid interactions (debounce, throttle, disable button after click)
- Network failures (offline indicator, retry, cached data)

🔥 **Most Asked**: State lifting, component boundaries, edge case checklist

---

## 435. Accessibility-First Component Design

### Q: How do you design components with accessibility as a first-class concern?

**Answer (Interview-Ready):**

**Process:**
1. Choose correct semantic HTML (`<button>`, `<nav>`, `<dialog>`)
2. Add ARIA only when HTML semantics aren't enough
3. Ensure keyboard operability (Tab, Enter, Escape, Arrow keys)
4. Manage focus (trap in modals, restore on close)
5. Test with screen reader (VoiceOver, NVDA)

```tsx
// Accessible Modal
function Modal({ isOpen, onClose, title, children }) {
  const closeRef = useRef();
  
  useEffect(() => {
    if (isOpen) closeRef.current?.focus();  // Focus management
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
         onKeyDown={e => e.key === 'Escape' && onClose()}>
      <h2 id="modal-title">{title}</h2>
      {children}
      <button ref={closeRef} onClick={onClose}>Close</button>
    </div>
  );
}
```

🔥 **Most Asked**: Focus trapping, ARIA roles, semantic HTML over ARIA

---

## 436–439. Performance, Reusability, Interview Style, TypeScript

### Q: How do you write performant, reusable, interview-ready code?

**Answer (Interview-Ready):**

**436 — Performance-Aware Components:**
- `React.memo()` for expensive renders
- `useMemo` / `useCallback` for referential stability
- Virtualize long lists
- Lazy load below-the-fold content
- Avoid inline objects/arrays in JSX (new reference every render)

**437 — Reusability & Extensibility:**
- Compound components: `<Select><Option /><Option /></Select>`
- Render props / children as function for flexible rendering
- headless components (logic-only hooks like `useCombobox`)
- Prop-based variants over separate components

**438 — Interview-Friendly Code Style:**
- Start with types/interfaces
- Name functions descriptively
- Keep functions short (< 15 lines)
- Comment non-obvious decisions, not obvious code
- Handle happy path first, then errors

**439 — TypeScript in Machine Coding:**
```ts
// Define types upfront
interface Todo { id: string; text: string; completed: boolean; }
type FilterType = 'all' | 'active' | 'completed';

// Generic reusable hook
function useLocalStorage<T>(key: string, initial: T): [T, (val: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initial;
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue];
}
```

🔥 **Most Asked**: React.memo usage, TypeScript generics, interview code organization

---

## 440–443. Whiteboard to Code, Refactoring, Unknown Requirements, Trade-offs

### Q: How do you evolve from whiteboard design to production code in interviews?

**Answer (Interview-Ready):**

**440 — Whiteboard → Code:**
1. Draw component tree (boxes + arrows for data flow)
2. Define types/interfaces
3. Implement skeleton (structure without logic)
4. Add core logic (state, event handlers)
5. Handle edge cases
6. Polish (loading, error, empty states)

**441 — Incremental Refactoring:**
- Start with working code, then refactor
- Extract repeated logic into custom hooks
- Extract UI patterns into shared components
- Don't refactor during implementation — finish first

**442 — Handling Unknown Requirements:**
- "I'll start with assumption X. If requirements change, here's how I'd adapt..."
- Build for the known, design for the unknown (interfaces, not implementations)
- Ask clarifying questions: "Should this support offline?" "Real-time or polling?"

**443 — Talking Through Trade-offs:**
```
"I chose Redux over Context because:
 - We have frequent updates (Context would re-render too broadly)
 - DevTools for debugging complex state
 - Middleware for async flows
 Trade-off: more boilerplate, but better for our scale"
```

**Template:** "I chose X over Y because [reason]. The trade-off is [downside], which I'd mitigate by [approach]."

🔥 **Most Asked**: How to verbalize trade-offs, refactoring during interviews, handling ambiguity
🧠 **Strategy**: "Think out loud. State assumptions. Compare 2 options with trade-offs. Don't gold-plate during coding"

---

# Part G — Interview Flow & Communication (Topics 444–454)

---

## 444–447. Interview Flow — Start, Requirements, Architecture, Time Boxing

### Q: How do you structure a system design interview?

**Answer (Interview-Ready):**

**444 — How to Start:**
"Let me make sure I understand the problem. We're designing [system]. Let me clarify requirements before diving into architecture."

**445 — Requirement Clarification Framework:**
| Category | Example Questions |
|----------|------------------|
| **Functional** | "What are the core user flows?" |
| **Non-functional** | "What's the expected user base? Latency requirements?" |
| **Scope** | "Should I focus on the full system or just [specific part]?" |
| **Constraints** | "Any technology constraints? Existing systems to integrate?" |

**446 — Architecture Drawing:**
- Use boxes for components, arrows for data flow
- Label arrows with data format (REST, WebSocket, events)
- Color-code: blue = frontend, green = backend, yellow = external
- Tools: draw.io, Excalidraw (for live interviews)

**447 — Time Boxing (45 min):**
| Phase | Time | Activity |
|-------|------|----------|
| Requirements | 5 min | Clarify, scope, prioritize |
| High-Level Design | 10 min | Component architecture, data flow |
| Deep Dive | 20 min | State management, APIs, key components |
| Trade-offs & Extensions | 5 min | Scaling, edge cases, alternatives |
| Questions | 5 min | Ask interviewer questions |

🔥 **Most Asked**: How to structure 45 minutes, requirement questions, architecture notation

---

## 448–451. Communication — Trade-offs, Performance, Scale, Recovery

### Q: How do you communicate effectively during interviews?

**Answer (Interview-Ready):**

**448 — Explaining Trade-offs Clearly:**
```
"Option A: SSR with Next.js
 + Better SEO and initial load
 - Server cost, deployment complexity

 Option B: CSR with React SPA
 + Simpler deployment (static CDN)
 - Poor SEO, slower initial load

 I'd choose A for this use case because SEO is critical for an e-commerce product page."
```

**449 — Handling Performance Questions:**
- "Can you tell me the specific metric you're asking about?" (LCP, INP, bundle size)
- Measure → Identify bottleneck → Propose solution → Quantify impact
- Never optimize without measuring first

**450 — Scale & Edge Cases:**
- "At 10x users, I'd add CDN caching and code splitting"
- "At 100x, I'd add regional servers and aggressive caching"
- Edge cases: slow network, concurrent edits, browser back button, bookmark deep links

**451 — When You Don't Know:**
```
"I haven't worked with [specific thing], but here's how I'd approach it:
 Based on my experience with [similar thing], I'd expect it to work by [reasoning].
 I'd validate by [how to verify]."
```
Never fake knowledge. Showing reasoning process > memorized answers.

🔥 **Most Asked**: Trade-off communication template, handling unknown questions
🧠 **Strategy**: "Options first, trade-offs second, recommendation third. If stuck, reason from first principles"

---

## 452–454. Closing — Mistakes, Strong Finish, Questions to Ask

### Q: How do you close a system design interview strongly?

**Answer (Interview-Ready):**

**452 — Common Mistakes:**
| Mistake | Fix |
|---------|-----|
| Jumping into code immediately | Start with requirements |
| Not scoping | "This is huge. Let me focus on [core]" |
| Over-engineering | KISS — simple solutions that scale |
| Monologue | Check in: "Should I go deeper here?" |
| Ignoring NFRs | Always cover: performance, a11y, error handling |

**453 — Closing Strong:**
"To summarize: I designed [system] with [key architecture choices]. The main trade-offs are [X vs Y]. If I had more time, I'd address [extension 1, extension 2]. The monitoring strategy would include [key metrics]."

**454 — Questions to Ask:**
- "What does the frontend architecture look like on your team?"
- "How do you handle design system governance?"
- "What's the biggest technical challenge the team faces?"
- "How are architectural decisions made? RFC process?"
- "What does the on-call rotation look like for frontend?"

🔥 **Most Asked**: Summarization technique, what questions impress interviewers
🧠 **Strategy**: "Summarize in 2-3 sentences. Mention extensions you'd add. Ask questions that show senior-level thinking"

---

# Part H — Senior/Staff Expectations (Topics 455–466)

---

## 455–457. Senior vs Staff, Architecture Ownership, Technical Vision

### Q: What differentiates senior from staff expectations?

**Answer (Interview-Ready):**

**455 — Senior vs Staff:**
| Dimension | Senior | Staff |
|-----------|--------|-------|
| Scope | One team | Cross-team / org-wide |
| Code | Writes production code | Sets patterns, writes foundational code |
| Design | Designs features | Designs systems and platforms |
| Influence | Team decisions | Org-wide technical direction |
| Mentoring | 1-2 engineers | Team leads, IC growth paths |

**456 — Architecture Ownership:**
- Own the frontend architecture RFC process
- Define technology stack decisions (framework, state, testing)
- Create Architecture Decision Records (ADRs)
- Review cross-team integration designs
- Define performance budgets and enforce them

**457 — Technical Vision & Roadmap:**
```
Vision Example:
"In 6 months, our frontend platform will:
 1. Support 3 product teams with shared component library (50% reuse target)
 2. Achieve P75 LCP < 2s across all products
 3. Automated a11y testing in CI with zero critical violations
 
Roadmap:
 Q1: Design system v2 + Storybook → adoption by 2 teams
 Q2: Performance monitoring + budgets → measure baselines
 Q3: Micro-frontend migration → independent deployments"
```

🔥 **Most Asked**: Scope difference, ADRs, technical vision examples

---

## 458–461. Leadership — Cross-Team, Cost, Mentoring, Influence

### Q: How do you demonstrate leadership in a technical role?

**Answer (Interview-Ready):**

**458 — Cross-Team Collaboration:**
- Shared component library governance (RFC for breaking changes)
- API contract agreements with backend teams
- Design system working groups
- Regular sync meetings with clear agendas and action items

**459 — Cost vs Performance Trade-offs:**
| Decision | Cost | Performance | Recommendation |
|----------|------|-------------|----------------|
| CDN distribution | ~$500/mo | -40% latency | ✅ Always |
| Image optimization service | ~$200/mo | -30% bandwidth | ✅ High-traffic sites |
| Additional SSR servers | ~$2000/mo | -50% TTFB | ⚠️ Only for SEO-critical |

**460 — Mentoring:**
- Pair programming sessions (don't dictate, guide)
- Code review as teaching tool (explain "why", not just "change this")
- Growth plans: identify gaps → assign stretch projects → review monthly
- "Multiplier effect" — a senior who grows 4 juniors has 5x impact

**461 — Influencing Without Authority:**
- Write RFCs proposing changes (data-driven)
- Build proof-of-concepts (show, don't tell)
- Find allies in other teams
- Present at team/org-wide engineering talks

🔥 **Most Asked**: Mentoring stories, RFC process, influencing example
🧠 **Strategy**: "Leadership = multiplying impact through others. Influence through RFCs and prototypes, not mandates"

---

## 462–466. Production Mindset — Incidents, Cost, GDPR, Postmortems, SLOs

### Q: How do you demonstrate production mindset?

**Answer (Interview-Ready):**

**462 — Frontend On-Call:**
- Monitor: Core Web Vitals, JS error rate, API health
- Runbooks: step-by-step for common incidents
- Escalation path: frontend → backend → infra → management

**463 — Frontend Cost Awareness:**
- CDN bandwidth costs scale with traffic
- Third-party scripts impact performance (each adds latency + cost)
- Bundle size = data transfer cost × millions of users

**464 — Privacy & GDPR:**
- Cookie consent before any tracking
- Data minimization (collect only what's needed)
- User data deletion (right to be forgotten)
- No PII in logs, analytics, error tracking

**465 — Incident Postmortems:**
```
## Postmortem: Checkout Button Unresponsive (2024-01-15)

**Impact:** 15% of users couldn't complete checkout for 45 minutes. Est. revenue loss: $12K
**Root Cause:** Third-party A/B testing script blocked main thread for 3s+
**Detection:** Error rate alert fired (Sentry). Confirmed via session replay (LogRocket)
**Resolution:** Disabled A/B test flag (5 min). Moved script to Web Worker (permanent fix)
**Action Items:**
 - [ ] Add main thread budget alert (INP > 500ms)
 - [ ] Audit all third-party scripts for performance impact
 - [ ] Add synthetic monitoring for checkout flow
```

**466 — SLO/SLA:**
- **SLI** (Service Level Indicator): P75 LCP, JS error rate
- **SLO** (Service Level Objective): LCP P75 < 2.5s, error rate < 0.5%
- **SLA** (Service Level Agreement): external commitment with penalties
- **Error budget:** 0.5% error rate SLO → (100% - 99.5%) × 30 days = 3.6 hours of downtime/month

🔥 **Most Asked**: Postmortem format, SLO definition, GDPR implications for frontend
🧠 **Strategy**: "Blameless postmortem: what happened, why, how to prevent. SLO = internal target. SLA = external contract"

---

# Part I — Behavioral & Leadership (Topics 467–474)

---

## 467–470. STAR Method, Growth Mindset, Time Control, Impact Quantification

### Q: How do you structure behavioral answers?

**Answer (Interview-Ready):**

**467 — STAR Method:**
| Letter | What | Time |
|--------|------|------|
| **S** — Situation | Context, challenge | 15 sec |
| **T** — Task | Your specific responsibility | 10 sec |
| **A** — Action | What YOU did (be specific) | 60 sec |
| **R** — Result | Quantified outcome | 20 sec |

```
S: "Our e-commerce site had a Lighthouse score of 60, causing poor SEO rankings"
T: "As the senior frontend engineer, I was tasked with improving performance"
A: "I implemented code splitting, optimized images with AVIF, added CDN caching,
    and set up Lighthouse CI in our pipeline to prevent regressions"
R: "Score improved from 60 to 95. Organic traffic increased 40% in 3 months.
    The Lighthouse CI gate caught 12 regressions in the first month alone"
```

**468 — Growth Mindset:**
Always end stories with: "If I did it again, I'd [improvement]" or "What I learned was [insight]."

**469 — Time Control:**
- Keep stories under 2.5 minutes
- Practice with a timer
- If going long, summarize: "In short, [result]"
- Read the interviewer — if they're nodding, continue. If checking time, wrap up.

**470 — Quantifying Impact:**
| Vague | Quantified |
|-------|-----------|
| "Improved performance" | "Reduced LCP from 4.2s to 1.8s (57%)" |
| "Helped the team" | "Mentored 4 engineers, 2 promoted within 6 months" |
| "Fixed bugs" | "Reduced bug escape rate by 60% with automated E2E tests" |
| "Worked on CI/CD" | "Reduced deployment time from 45min to 8min" |

🔥 **Most Asked**: STAR structure, quantification, growth mindset signal
🧠 **Strategy**: "Every behavioral answer: STAR + quantified result + what you'd do differently. Keep under 2.5 minutes"

---

## 471. Story 1 — Lighthouse 60 → 95 (Technical Depth)

### Q: Tell me about a time you significantly improved a system's performance.

**Answer (Interview-Ready / Hruday's Story):**

```
S: "SAP BI Launchpad had a Lighthouse score of 60. Pages took 5+ seconds to load.
    Users were complaining, and it was affecting our NPS score."

T: "As the senior frontend engineer, I owned the performance improvement initiative
    end-to-end."

A: "I conducted a comprehensive audit:
    1. Identified 3 render-blocking CSS files → inlined critical CSS, async-loaded rest
    2. Images: migrated to WebP/AVIF with responsive srcset → 60% smaller payloads
    3. Code splitting: route-based lazy loading → initial bundle from 2.1MB to 380KB
    4. Added CDN caching with immutable headers for static assets
    5. Set up Lighthouse CI in pipeline with performance budget gates
    6. Created a performance dashboard with RUM data for ongoing monitoring"

R: "Lighthouse: 60 → 95. LCP: 5.2s → 1.4s. Bundle size: 2.1MB → 380KB.
    User satisfaction improved measurably. The Lighthouse CI gate caught 12.
    regressions in the first month."

Growth: "If I did it again, I'd establish the performance budget FIRST before
 optimization, and track business metrics (conversion rate) alongside technical ones."
```

---

## 472. Story 2 — WCAG AA Certification (Quality, Customer Obsession)

### Q: Tell me about a time you drove quality improvements.

**Answer (Interview-Ready / Hruday's Story):**

```
S: "Our enterprise app needed WCAG 2.1 AA certification for a major government
    contract. An audit revealed 200+ accessibility violations."

T: "I led the accessibility remediation effort across 3 development teams."

A: "1. Prioritized violations by WCAG level (A first, then AA)
    2. Created an a11y component library with pre-built accessible patterns
    3. Added axe-core to CI — blocked PRs with new a11y violations
    4. Conducted weekly sessions educating developers on common issues
    5. Set up screen reader testing as part of QA process
    6. Worked with design team to fix contrast ratios and focus indicators"

R: "Achieved WCAG 2.1 AA certification. Zero critical violations in subsequent
    audits. Won the government contract ($2M ARR). Reduced a11y bugs by 80%
    Quarter-over-quarter."

Growth: "I'd involve designers earlier — many violations were design decisions
 that required code workarounds."
```

---

## 473. Story 3 — 80% Security Vulnerability Reduction (Ownership)

### Q: Tell me about a time you took ownership of a problem nobody asked you to solve.

**Answer (Interview-Ready / Hruday's Story):**

```
S: "A routine security scan revealed 45 vulnerabilities in our frontend
    dependencies. No one owned frontend security — it was falling through cracks."

T: "I volunteered to own frontend security and proposed a systematic approach."

A: "1. Triaged all 45 vulnerabilities by CVSS score (critical/high/medium/low)
    2. Updated 12 direct dependencies, patched 8 transitive vulnerabilities
    3. Added npm audit to CI pipeline — blocked builds with high/critical issues
    4. Set up Dependabot for automated dep updates with auto-merge for patches
    5. Created a security checklist for code reviews (XSS, CSRF, CSP)
    6. Implemented CSP headers and SRI for all third-party scripts"

R: "Reduced vulnerabilities from 45 to 9 (80% reduction) in 3 weeks.
    Zero high/critical vulnerabilities. Automated dependency updates caught
    15 new issues in the next quarter before they reached production."

Growth: "I'd establish a regular security review cadence rather than waiting
 for scan results."
```

---

## 474. Story 4 — Mentoring 4 Engineers (Leadership, Scaling Yourself)

### Q: Tell me about a time you mentored others and scaled your impact.

**Answer (Interview-Ready / Hruday's Story):**

```
S: "Our team grew from 3 to 8 engineers. The 4 new engineers were mid-level
    and needed guidance on enterprise frontend patterns, testing, and code quality."

T: "As the senior engineer, I was responsible for ramping up the team quickly
    without becoming a bottleneck."

A: "1. Created onboarding documentation: architecture guide, coding standards,
       common patterns
    2. Pair programming sessions: 2 hours/week per mentee on real tickets
    3. Progressive challenge: started with bug fixes → features → architecture
    4. Code review as teaching: explained 'why' behind feedback, not just 'what'
    5. Eventually delegated code reviews to mentees (they reviewed each other)
    6. Monthly 1:1s with growth goals and feedback"

R: "All 4 engineers ramped up within 2 months. 2 were promoted to senior within
    6 months. Team velocity increased 3x. I went from reviewing all PRs to
    reviewing only architectural PRs."

Growth: "I'd create a formal mentorship framework so this process scales
 when I'm not there."
```

🔥 **Most Asked**: All 4 stories cover key FAANG behavioral dimensions
🧠 **Strategy**: "Prepare 4-6 stories that cover: technical depth, quality, ownership, leadership. Adapt the same story for different questions"

---

# Part J — Engineering Wisdom (Topics 146–149)

---

## 146–149. Real-World Architectures, Engineering Blogs, Trade-offs, Cost Decisions

### Q: What should engineers know about real-world engineering wisdom?

**Answer (Interview-Ready):**

**146 — Real-World Architectures to Study:**
| Company | Architecture Insight |
|---------|---------------------|
| Netflix | Microservices, chaos engineering, edge caching |
| Uber | Event-driven, geo-sharding, real-time dispatch |
| Airbnb | Service-oriented migration, design system (DLS) |
| Slack | PHP monolith → services, Websocket at scale |
| Shopify | Ruby on Rails at scale, edge computing, Hydrogen |

**147 — Engineering Blogs Worth Reading:**
- Netflix Tech Blog (distributed systems, resilience)
- Uber Engineering (real-time, geo-distributed)
- Meta Engineering (React, GraphQL, Scale)
- Vercel Blog (frontend infrastructure, Edge)
- web.dev (Google's frontend best practices)

**148 — Design Trade-offs in Production:**
| Trade-off | Choice A | Choice B |
|-----------|----------|----------|
| Latency vs Consistency | Eventual consistency + cache | Strong consistency + DB read |
| Cost vs Availability | Single region | Multi-region |
| Simplicity vs Flexibility | Monolith | Microservices |
| Speed vs Safety | Ship fast (feature flags) | Ship slow (full testing) |

**149 — Cost vs Performance Decisions:**
- "Is the 50ms latency improvement worth $5K/month in infra?"
- Use P95/P99 metrics to justify investment
- 80/20 rule: first optimization is cheap and impactful; diminishing returns after

🔥 **Most Asked**: Real-world examples to reference, how to think about trade-offs
🧠 **Strategy**: "Reference real companies: 'Netflix uses chaos engineering because...' Trade-offs: name both sides, recommend with reason"

---

# Part K — Ultimate Cheat Sheets (Topics 150–155)

---

## 150–155. Scalability, DB Selection, Caching, CAP, Messaging, Revision

### Q: Provide quick-reference cheat sheets for system design.

**Answer (Interview-Ready):**

**150 — Scalability Cheats:**
```
Vertical Scaling: bigger machine (easy, limited)
Horizontal Scaling: more machines (complex, unlimited)
Stateless services → easy to scale horizontally
Database: read replicas, sharding, partitioning
Caching: CDN → application cache → DB cache
Async: message queues for non-blocking operations
```

**151 — Database Selection Cheats:**
| Need | Choose | Example |
|------|--------|---------|
| ACID transactions | PostgreSQL, MySQL | Banking, orders |
| Flexible schema | MongoDB | Content, catalogs |
| High-speed cache | Redis | Sessions, leaderboards |
| Time-series data | InfluxDB, TimescaleDB | Metrics, IoT |
| Graph relationships | Neo4j | Social networks |
| Full-text search | Elasticsearch | Product search |
| Wide column / massive scale | Cassandra, DynamoDB | IoT, logs |

**152 — Caching Cheats:**
```
Browser Cache → CDN → Load Balancer → App Cache (Redis) → DB Cache → DB
Cache-aside: app manages cache (read: cache miss → DB → write cache)
Write-through: write to cache + DB simultaneously
Write-behind: write to cache, async write to DB
TTL: set expiration to prevent stale data
Invalidation: hardest problem in CS!
```

**153 — CAP / PACELC Cheats:**
```
CAP: In network Partition, choose Availability or Consistency
 CP: MongoDB, HBase (consistent but may be unavailable)
 AP: Cassandra, DynamoDB (available but eventually consistent)

PACELC: If Partition → A or C. Else → Latency or Consistency
 PA/EL: Cassandra (available + low latency)
 PC/EC: HBase (consistent always)
 PA/EC: MongoDB default (available in partition, consistent otherwise)
```

**154 — Messaging Guarantees Cheats:**
```
At-most-once:  Fire and forget. May lose messages. Fast.
At-least-once: Retry until ack. May duplicate. Common default (Kafka).
Exactly-once:  Hardest. Requires idempotency or transactions.

Kafka: ordered within partition, at-least-once default
RabbitMQ: per-message ack, routing flexibility
SQS: managed, at-least-once, FIFO mode available
```

**155 — Last-Minute Revision Tips:**
```
1. Know 3-4 system designs cold (URL shortener, chat, feed, e-commerce)
2. Framework: Requirements → HLD → Deep Dive → Trade-offs → Extensions
3. Always discuss: scaling, caching, monitoring, failure handling
4. Numbers to know:
   - 1 day = 86,400 seconds ≈ 100K seconds
   - 1 million requests/day ≈ 12 req/sec
   - 1 billion requests/day ≈ 12K req/sec
   - SSD read: ~100μs | Network round trip: ~1ms | DB query: ~1-10ms
```

🔥 **Most Asked**: DB selection, CAP theorem, caching strategies, back-of-envelope calculations
🧠 **Strategy**: "Memorize these cheat sheets. Reference them naturally: 'For this use case, I'd choose Cassandra because AP system with tunable consistency'"

---

# Part L — Interview Q&A (Topics 156–160)

---

## 156–160. LLD Questions, HLD Questions, Diagrams, Examples, Traps

### Q: What are the most common system design interview questions and traps?

**Answer (Interview-Ready):**

**156 — Top LLD (Low-Level Design) Questions:**
1. Design a parking lot system
2. Design an elevator system
3. Design a chess game
4. Design a file system
5. Design a hotel booking system
6. Design a vending machine
7. Design an ATM system

**LLD approach:** Classes → Relationships → APIs → State machines → Design patterns.

**157 — Top HLD (High-Level Design) Questions:**
1. Design YouTube/Netflix (video streaming)
2. Design WhatsApp/Slack (messaging)
3. Design Twitter/Instagram (social feed)
4. Design Uber/Lyft (ride matching)
5. Design Google Drive/Dropbox (file storage)
6. Design Amazon/Flipkart (e-commerce)
7. Design Google Search (search engine)

**HLD approach:** Requirements → Architecture → Data model → APIs → Scaling → Trade-offs.

**158 — Diagram-Driven Explanations:**
- Always draw diagrams (even in phone screens — describe verbally)
- Client → Load Balancer → API Gateway → Services → DB
- Sequence diagrams for complex flows (user registration, payment)

**159 — Real-World Examples Per Question:**
| Question | Reference |
|----------|-----------|
| URL Shortener | bit.ly (301 redirect, base62 encoding) |
| Rate Limiter | Cloudflare, API Gateway |
| Chat System | WhatsApp (E2E encryption, delivery receipts) |
| Feed System | Facebook News Feed (ranking, real-time fan-out) |

**160 — Common Interview Traps:**
| Trap | Why It's Wrong | Better Approach |
|------|---------------|-----------------|
| "Use microservices" for everything | Over-engineering small systems | Start monolith, extract when needed |
| Single region design | No availability discussion | Mention multi-region, discuss trade-offs |
| No caching | Every system benefits from caching | Discuss cache invalidation strategy |
| Perfect design | No trade-offs discussed | "I chose X over Y because..." |
| Ignoring monitoring | System can't operate without observability | Always mention logs, metrics, alerts |
| Premature optimization | Designing for 1B users day 1 | Start simple, discuss how to scale |

🔥 **Most Asked**: HLD question list, common traps, architecture diagram pattern
🧠 **Strategy**: "Know 5 HLD and 5 LLD cold. Reference real companies. Avoid the 6 traps above. Always discuss trade-offs"

---

## ✅ File 10 Coverage Summary

| Part | Topics | Count |
|------|--------|-------|
| A — Arrays & Strings | 393–396 | 4 |
| B — Hashmaps, Stacks, Queues | 397–402 | 6 |
| C — Trees, Graphs, Recursion, DP | 403–410 | 8 |
| D — UI Components Machine Coding | 411–419 | 9 |
| E — Large System Designs | 420–431 | 12 |
| F — Design Bridge & Code Quality | 432–443 | 12 |
| G — Interview Flow & Communication | 444–454 | 11 |
| H — Senior/Staff Expectations | 455–466 | 12 |
| I — Behavioral & Leadership | 467–474 | 8 |
| J — Engineering Wisdom | 146–149 | 4 |
| K — Ultimate Cheat Sheets | 150–155 | 6 |
| L — Interview Q&A | 156–160 | 5 |
| **Total** | | **97** |

---

[⬅ Back to Master Index](00_MASTER_INDEX.md) | [⬆ Previous: 09_Company_Specific_Java.md](09_Company_Specific_Java.md)
