# Stacks and Queues — Monotonic Stack and BFS
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Stack = LIFO** (Last In First Out): push to top, pop from top; use for: matching brackets/parentheses, "next greater element", undo/redo, function call stack simulation, DFS
- **Queue = FIFO** (First In First Out): enqueue at back, dequeue from front; use for: BFS (level-order traversal), task scheduling, rate limiting, sliding window with Deque
- **Monotonic stack**: a stack that is always sorted (increasing or decreasing); when you push a new element, pop everything that violates the monotonic order first; gives the "next greater element" or "previous smaller element" for every position in O(n) total
- **BFS uses a Queue**: start node → enqueue → while queue not empty: dequeue, process, enqueue unvisited neighbours; guarantees shortest path in an unweighted graph; level-order tree traversal is BFS
- **Deque (double-ended queue)**: can push/pop from both ends in O(1); used in: sliding window maximum (monotonic deque), implementing both stack and queue with one structure; `ArrayDeque` in Java is the preferred stack/queue implementation (faster than `Stack` class and `LinkedList`)
- **Never use `java.util.Stack`** in production — it's legacy and synchronized; use `ArrayDeque` or `Deque<T>` interface instead

---

## 1. One-Line Definition
Stacks (LIFO ordering) and queues (FIFO ordering) are the foundation for tree/graph traversal and sequence-matching problems; the monotonic stack is a specialized variant that finds "next greater/smaller" relationships across an array in a single O(n) pass.

---

## 2. The Problem It Solves

A frontend engineer needs to validate that every opening HTML tag has a matching closing tag in the right order — `<div><span></span></div>` is valid; `<div><span></div></span>` is not. The stack gives an intuitive solution: push opening tags, pop when you see a closing tag and check they match.

A backend engineer needs to find, for every product in a sorted price list, the next product that is more expensive (for a "compare with" feature). Naive: for each product, scan right until you find a higher price — O(n²). Monotonic stack does it in one pass: O(n).

BFS is the foundation of every "shortest path" algorithm — used in routing, recommendation graph traversal, and social network feature queries ("find all users within 2 hops of this user").

---

## 3. How It Works Internally

### Monotonic Decreasing Stack — Next Greater Element

```
nums = [73, 74, 75, 71, 69, 72, 76, 73]
stack = [] (stores indices, not values — we want the answer array)
answer[i] = "what is the next day warmer than day i?"

i=0: push 0 (stack=[0])
i=1: nums[1]=74 > nums[0]=73 → pop 0, answer[0]=1-0=1; push 1 (stack=[1])
i=2: nums[2]=75 > nums[1]=74 → pop 1, answer[1]=2-1=1; push 2 (stack=[2])
i=3: nums[3]=71 < nums[2]=75 → push 3 (stack=[2,3])
i=4: nums[4]=69 < nums[3]=71 → push 4 (stack=[2,3,4])
i=5: nums[5]=72 > nums[4]=69 → pop 4, answer[4]=5-4=1
               72 > nums[3]=71 → pop 3, answer[3]=5-3=2
               72 < nums[2]=75 → push 5 (stack=[2,5])
i=6: nums[6]=76 > nums[5]=72 → pop 5, answer[5]=6-5=1
               76 > nums[2]=75 → pop 2, answer[2]=6-2=4
               → push 6 (stack=[6])
i=7: push 7 (stack=[6,7])
End: remaining in stack → answer = -1 (no warmer day found)

Result: [1, 1, 4, 2, 1, 1, 0, 0]
```

### BFS Level Order

```
    1
   / \
  2   3
 / \   \
4   5   6

Queue: [1]
Level 0: dequeue 1, enqueue children 2,3 → output [1]; queue=[2,3]
Level 1: dequeue 2, enqueue 4,5; dequeue 3, enqueue 6 → output [2,3]; queue=[4,5,6]
Level 2: dequeue 4 (no children); 5 (no children); 6 (no children) → output [4,5,6]

Result: [[1],[2,3],[4,5,6]]
```

---

## 4. The Code

### Wrong Way — Legacy Stack, Wrong Data Structure

```java
// ❌ WRONG 1: Using java.util.Stack — synchronized, legacy, avoid

import java.util.Stack;   // ← do not use

Stack<Integer> stack = new Stack<>();  // ❌ synchronized — unnecessary overhead
stack.push(1);
stack.pop();
// Use ArrayDeque instead — same API, much faster
```

```java
// ❌ WRONG 2: O(n²) next greater element with nested loops

public int[] nextGreaterElement(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {   // ← O(n) inner loop
            if (nums[j] > nums[i]) {
                result[i] = nums[j];
                break;
            }
        }
    }
    return result;
}
// O(n²) — works for 1000 elements, TLEs on 100,000
```

```java
// ❌ WRONG 3: BFS with visited check done wrong (same node processed twice)

public int shortestPath(int[][] grid, int[] start, int[] end) {
    Queue<int[]> queue = new LinkedList<>();
    queue.offer(start);
    int steps = 0;
    
    while (!queue.isEmpty()) {
        int[] curr = queue.poll();
        
        if (curr[0] == end[0] && curr[1] == end[1]) return steps;
        steps++;
        
        // ❌ visited check AFTER dequeue, not BEFORE enqueue
        // The same cell can be enqueued multiple times before it's processed
        // → loops + incorrect step count
        for (int[] neighbor : getNeighbors(curr, grid)) {
            queue.offer(neighbor);  // ← might offer the same cell multiple times
        }
    }
    return -1;
}
```

### Right Way — Correct Stack/Queue Usage

```java
// ✅ VALID PARENTHESES — Stack for bracket matching

public boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();   // ✅ ArrayDeque, not Stack class
    
    Map<Character, Character> pairs = Map.of(
        ')', '(',
        ']', '[',
        '}', '{'
    );
    
    for (char c : s.toCharArray()) {
        if (!pairs.containsKey(c)) {
            // ✅ Opening bracket — push onto stack
            stack.push(c);
        } else {
            // ✅ Closing bracket — must match the top of stack
            if (stack.isEmpty() || stack.peek() != pairs.get(c)) {
                return false;   // mismatch or unmatched closing bracket
            }
            stack.pop();
        }
    }
    
    // ✅ Stack must be empty — all opening brackets were matched
    return stack.isEmpty();
}
// Time: O(n), Space: O(n)
```

```java
// ✅ NEXT GREATER ELEMENT — Monotonic decreasing stack

public int[] nextGreaterElement(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);   // default: -1 if no greater element exists
    
    Deque<Integer> stack = new ArrayDeque<>();  // stores INDICES, not values
    // ← store indices so we can fill the result array at the right position
    
    for (int i = 0; i < n; i++) {
        // ✅ While stack is non-empty AND current element is greater than stack top:
        //    the current element is the "next greater" for the element at stack top
        while (!stack.isEmpty() && nums[i] > nums[stack.peek()]) {
            int idx = stack.pop();
            result[idx] = nums[i];  // ← nums[i] is the next greater for nums[idx]
        }
        stack.push(i);
    }
    
    // Remaining indices in stack have no greater element → result stays -1
    return result;
}
// Time: O(n) — each element pushed and popped at most once
// Space: O(n) for the stack
```

```java
// ✅ BFS — Level-order tree traversal (or shortest path in unweighted graph)

public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    
    Queue<TreeNode> queue = new ArrayDeque<>();  // ✅ ArrayDeque as queue
    queue.offer(root);
    
    while (!queue.isEmpty()) {
        int levelSize = queue.size();   // ✅ snapshot level size BEFORE processing
        List<Integer> level = new ArrayList<>();
        
        // ✅ Process exactly one level per outer loop iteration
        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            
            if (node.left != null) queue.offer(node.left);   // ← enqueue children
            if (node.right != null) queue.offer(node.right); // ← not yet processed level
        }
        
        result.add(level);
    }
    return result;
}
// Time: O(n), Space: O(w) where w = max tree width
```

```java
// ✅ BFS — Shortest path in 2D grid (correct visited check BEFORE enqueue)

public int shortestPath(int[][] grid, int[] start, int[] end) {
    int rows = grid.length, cols = grid[0].length;
    boolean[][] visited = new boolean[rows][cols];
    
    int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}};  // right, left, down, up
    
    Queue<int[]> queue = new ArrayDeque<>();
    queue.offer(start);
    visited[start[0]][start[1]] = true;  // ✅ Mark visited AT ENQUEUE TIME, not dequeue
    
    int steps = 0;
    
    while (!queue.isEmpty()) {
        int size = queue.size();
        
        for (int i = 0; i < size; i++) {
            int[] curr = queue.poll();
            
            if (curr[0] == end[0] && curr[1] == end[1]) {
                return steps;
            }
            
            for (int[] dir : dirs) {
                int nr = curr[0] + dir[0];
                int nc = curr[1] + dir[1];
                
                // ✅ Check bounds, walls, and visited BEFORE enqueuing
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr][nc] == 0      // 0 = open cell
                        && !visited[nr][nc]) {
                    visited[nr][nc] = true;     // ✅ Mark visited immediately
                    queue.offer(new int[]{nr, nc});
                }
            }
        }
        steps++;
    }
    return -1;  // no path found
}
// Time: O(rows × cols), Space: O(rows × cols)
```

```java
// ✅ SLIDING WINDOW MAXIMUM — Monotonic deque (decreasing, stores indices)
// Find the max in every window of size k

public int[] maxSlidingWindow(int[] nums, int k) {
    int n = nums.length;
    int[] result = new int[n - k + 1];
    Deque<Integer> deque = new ArrayDeque<>();  // stores indices; front = current max
    
    for (int i = 0; i < n; i++) {
        // ✅ Remove indices that are out of the current window
        while (!deque.isEmpty() && deque.peekFirst() < i - k + 1) {
            deque.pollFirst();
        }
        
        // ✅ Remove indices from the back whose values are ≤ current
        // They can never be the maximum while nums[i] is in the window
        while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) {
            deque.pollLast();
        }
        
        deque.offerLast(i);
        
        // ✅ Window is fully formed after processing index k-1
        if (i >= k - 1) {
            result[i - k + 1] = nums[deque.peekFirst()]; // ← front is always the max
        }
    }
    return result;
}
// Time: O(n) — each element added/removed from deque at most once
// Space: O(k) for the deque
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you choose a stack over a queue, and vice versa?"

**Hruday's answer:**
> Stack (LIFO — last in, first out) when the most recently added item is the most relevant one. Classic examples: checking if parentheses are balanced (the most recent opening bracket must match the current closing bracket), implementing undo/redo (most recent action is undone first), and DFS traversal (explore as deep as possible before backtracking, which is LIFO behavior).
>
> Queue (FIFO — first in, first out) when processing order must be preserved — the oldest unprocessed item is the most urgent. Classic examples: BFS traversal (process level by level, which is FIFO across levels), task schedulers (first submitted task is run first), and notification systems (send notifications in the order they were generated).
>
> The easy way to decide in an interview: if the problem says "in order", "level by level", or "first come first served" — queue. If the problem says "most recent", "undo", or "explore depth-first" — stack.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain how a monotonic stack works and give a real-world use case."

**Hruday's answer:**
> A monotonic stack stays in sorted order — either all values ascending from bottom to top, or all descending. When you push a new element, you pop everything that violates the sort order first.
>
> The key insight: every element you pop found its "answer" — for a decreasing monotonic stack, the element you're pushing is the "next greater element" for every element you popped.
>
> Real-world use case: I had to build a feature at SAP where each product showed "there are N products cheaper than this one that you already viewed". That's the "number of previous smaller elements" pattern — a classic monotonic stack problem. Instead of comparing each product to all previous ones (O(n²)), the stack gives O(n) total.
>
> Another real use case: the sliding window maximum for a real-time dashboard 60-second rolling maximum metric. A monotonic deque maintains the current maximum in O(1) per update instead of O(k) per update.

---

### Q3 — BFS
**Interviewer asks:** "Explain BFS vs DFS and when you'd use each."

**Hruday's answer:**
> BFS (breadth-first search) uses a queue and explores level by level — all nodes at distance 1 first, then distance 2, etc. DFS (depth-first search) uses a stack (or recursion, which is the implicit call stack) and goes as deep as possible before backtracking.
>
> BFS guarantees the shortest path in an unweighted graph — the first time you reach a node, you've found the shortest path to it. Use BFS for: shortest path problems, level-order traversal, "find all nodes within k hops", social network "degrees of separation" features.
>
> DFS is better for: connected component detection, cycle detection, topological sorting, exhaustive search (generate all permutations), and tree problems where you process a node's subtree before its siblings.
>
> Memory trade-off: BFS needs to hold an entire level in the queue — for a tree with width 1,000 at the deepest level, that's 1,000 nodes. DFS only holds the current path — depth nodes. For very wide but shallow graphs, DFS uses less memory. For very deep graphs (like a linked list tree), BFS uses less memory.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Marking visited at dequeue, not enqueue | "I mark the node visited when I process it (dequeue)" | Marking visited at dequeue allows the same node to be enqueued multiple times before being processed; with expensive enqueue operations or large graphs, this causes O(n²) behavior and infinite loops in cyclic graphs; the correct approach: mark visited BEFORE or AT ENQUEUE time; as soon as you decide to add a neighbor to the queue, mark it visited; this ensures each node is enqueued at most once, giving O(V + E) BFS time |
| Storing values (not indices) in monotonic stack | "I push the array values into the stack" | Most monotonic stack problems require you to store indices, not values; the index lets you: (1) compute distances (next minus current index = days until warmer weather), (2) fill in the answer array at the correct position, and (3) check if an index is still within the current window for sliding window problems; storing values loses the positional information; always push indices, access values via `nums[stack.peek()]` when you need the comparison |
| Using Stack class instead of ArrayDeque | "I'll use Java's Stack class for this" | `java.util.Stack` extends `Vector` and is fully synchronized; every push/pop acquires and releases a mutex lock even in single-threaded code; it's 3-5x slower than `ArrayDeque` for single-threaded interview problems; `ArrayDeque` also offers `push()`, `pop()`, `peek()` for stack behavior and `offer()`, `poll()`, `peek()` for queue behavior; always use `Deque<T> stack = new ArrayDeque<>()` — the interviewer will notice if you use the legacy Stack class |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I was working on a dashboard feature that highlighted which product categories had consistently growing engagement over time — specifically, where each day's engagement was higher than the previous local maximum. The natural solution was a monotonic stack: scan through 30 days of engagement data, maintain a decreasing stack, and when engagement for day i exceeds the value at the stack top, that's a 'breakout' event.
>
> The BFS pattern came up in a graph feature: 'show users who are within 2 approval levels of the current user in the org chart'. I used BFS with a depth counter — enqueue all direct reports, then their direct reports at depth 2. A straightforward BFS with a level counter, exactly the level-order pattern I'd practiced."

---

## 8. Scale Evolution

**1,000 users →** Pure in-memory stack/queue operations. `ArrayDeque` for all use cases. No distributed concerns at this scale.

**100,000 users →** BFS on user graphs may require pagination — load neighbours lazily from the database instead of fully in memory. Monotonic stack patterns still in-memory; applied to time-series data in analytics queries.

**10 million users →** Distributed BFS for social graph queries uses Apache Spark's GraphX or Neo4j's built-in BFS; the conceptual model is the same but the state is distributed across partitions; each "level" of BFS crosses partition boundaries via network calls; BFS algorithm knowledge translates to understanding distributed graph traversal frameworks.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction chain validation (parentheses-style structural validation); BFS through payment processing step graph to find the shortest recovery path; monotonic stack for anomaly detection ("first transaction more expensive than all previous today") | Stack for validation; BFS for process graphs; monotonic patterns for anomaly detection |
| Swiggy / Meesho | BFS for "find all restaurants within N hops in the recommendation graph"; delivery route queue management (FIFO processing for fair scheduling); sliding window max for "busiest window in delivery history" | BFS on recommendation graphs; queue-based scheduling; sliding window deque |
| Adobe / Microsoft | Graph algorithms are standard in Azure/Microsoft senior interviews; BFS for directory/document structure traversal; stack for expression parsing (document formula evaluation); companies at this level ask medium-hard LeetCode | Graph BFS proficiency; expression parsing with stacks; clean O(n) monotonic stack solutions |
| SAP Labs | Monotonic stack for engagement trend detection; BFS for org-chart feature; direct production experience to reference in interviews | Real application of both patterns in production; specific stories ready for behavioral component of technical answers |

---

## 10. Related Topics — What to Study Next

- **Topic 277 — Binary Tree Traversals** — DFS traversals (inorder, preorder, postorder) are stack-based recursion; BFS gives level-order traversal; understanding stack vs queue is the prerequisite for understanding why recursive DFS and iterative BFS have different traversal orders; the iterative DFS implementation uses an explicit `ArrayDeque` as a stack
- **Topic 278 — BFS and DFS Templates** — topic 278 gives the reusable BFS/DFS templates for graphs (not just trees); once you know the queue-based BFS and stack-based DFS patterns here, topic 278 extends them to graphs with cycles (where the visited array is essential)
- **Topic 281 — Implement LRU Cache** — LRU cache uses a `LinkedHashMap` internally, which is built on HashMap + doubly linked list (a list of nodes with head and tail pointers); understanding deque push/pop from both ends is the foundation for implementing the doubly linked list in LRU

---

*Part 17 · Stacks and Queues — Monotonic Stack and BFS · Full Stack Interview Guide · Hruday D · 2026*
