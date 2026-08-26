# Heaps and Priority Queues — 1-Hour Learning Module

> *"A heap is not about sorting — it's about always knowing the extreme. The best, the worst, the Kth, the median. Whenever you need 'the top something,' think heap."*

**Estimated time:** 60 minutes
**Prerequisite:** Basic understanding of binary trees and arrays

---

## Table of Contents

1. [[0–10 min] Big Picture](#0-10-min-big-picture)
2. [[10–20 min] Mental Model](#10-20-min-mental-model)
3. [[20–35 min] Core Patterns](#20-35-min-core-patterns)
4. [[35–45 min] Concrete Code + Dry Run](#35-45-min-concrete-code--dry-run)
5. [[45–55 min] Pattern Recognition](#45-55-min-pattern-recognition)
6. [[55–60 min] Final Mental Checklist](#55-60-min-final-mental-checklist)
7. [Active Recall](#active-recall)
8. [2-Minute Cheat Sheet](#2-minute-cheat-sheet)
9. [Advanced Awareness](#advanced-awareness)

---

## [0–10 min] Big Picture

### What is a Heap?

A heap is a data structure that answers one question instantly: **"What is the current minimum (or maximum)?"**

It does not store data in fully sorted order — it only guarantees you can always see the extreme value in O(1), and that inserting or removing takes O(log n).

### The Problem It Solves

Imagine you work in a hospital emergency room. Patients arrive continuously. You never process them in arrival order — you always treat the most critical patient first. After treating that patient, you again need the most critical among those still waiting. This keeps changing as new patients arrive.

A sorted list would require re-sorting every time a new patient arrives: O(n log n) per update. A heap handles this in O(log n) per arrival and O(log n) per discharge. That difference is enormous at scale.

**Heap is the right tool when:**
- You repeatedly need the min or max from a set that is changing (elements arriving or departing)
- You do not need all elements sorted — just the current extreme

**Heap is the wrong tool when:**
- Your dataset is static — sort it once and use indexing
- You need arbitrary access to elements by value — use a hash map or BST instead

### Real-World Uses

- Operating system task schedulers (highest-priority task runs next)
- Dijkstra's shortest path (always expand the nearest unvisited node)
- Streaming data — finding the median or Kth largest as data flows in
- Merge K sorted sources into one output stream

---

## [10–20 min] Mental Model

### Heap as a Complete Binary Tree

A heap is stored as an **array** but visualized as a **complete binary tree** — a tree where every level is fully filled except possibly the last, which is filled left to right.

**The heap property:**
- **Min-heap:** Every parent is less than or equal to its children. The root is the smallest element.
- **Max-heap:** Every parent is greater than or equal to its children. The root is the largest element.

### ASCII Diagram: Min-Heap

```
Array: [1, 3, 5, 7, 9, 8, 6]
Index:  0  1  2  3  4  5  6

           1          ← index 0 (root, always the minimum)
         /   \
        3     5       ← index 1, 2
       / \   / \
      7   9 8   6     ← index 3, 4, 5, 6
```

**Array index relationships (0-based):**
- Parent of index i: `(i - 1) / 2`
- Left child of index i: `2*i + 1`
- Right child of index i: `2*i + 2`

This means the entire tree structure is encoded in the array — no pointers needed.

### Min-Heap vs Max-Heap

| Property | Min-Heap | Max-Heap |
|---|---|---|
| Root contains | Smallest element | Largest element |
| Use case | K largest, merge sorted, Dijkstra | K smallest, task scheduling |
| Java | `new PriorityQueue<>()` | `new PriorityQueue<>(Collections.reverseOrder())` |
| JavaScript | Must implement manually (no built-in) | Must implement manually |

### Time Complexities — and WHY

| Operation | Time | Reason |
|---|---|---|
| Peek (see min/max) | O(1) | Root is always the extreme; just read index 0 |
| Insert (push) | O(log n) | Add at end, bubble up. Tree height = log n, so at most log n swaps |
| Extract min/max (pop) | O(log n) | Remove root, move last element to root, bubble down. At most log n swaps |
| Build heap from array | O(n) | Heapify bottom-up is O(n), not O(n log n) |

**Why O(log n) for push/pop?** A complete binary tree with n nodes has height floor(log₂ n). Bubbling up or down traverses at most one root-to-leaf path, which has length equal to the height.

**Why O(1) for peek?** The min (or max) is always stored at the root, index 0. No traversal needed.

---

## [20–35 min] Core Patterns

### The Central Question

> **"Do I repeatedly need the smallest or largest item from a changing set?"**
> - YES → Use a heap
> - NO, data is static → Sort once, then index

---

### Pattern 1: Top-K (K Largest / K Smallest)

**Problem:** Given an array of n numbers, find the K largest elements.

**Naive approach:** Sort the array descending, take the first K. Time: O(n log n).

**Heap approach:** Maintain a **min-heap of size K**. When the heap exceeds K, pop the minimum. Whatever remains in the heap at the end is the K largest. Time: O(n log K).

**Why a min-heap for K largest?** The heap root is the "gatekeeper" — it holds the smallest of the K largest elements seen so far. Any new element larger than the gatekeeper deserves a spot; the gatekeeper gets evicted.

**Why this beats sorting for streaming data:** If n is 10 billion and K is 10, sorting is impossible (can't fit all data in memory). A heap of size K uses O(K) memory and processes each element once.

```
K = 3, array = [3, 1, 5, 12, 2, 11]

Step 1: heap = [3]
Step 2: heap = [1, 3]
Step 3: heap = [1, 3, 5]   ← size = K, full
Step 4: 12 > peek(1) → pop 1, push 12 → heap = [3, 5, 12]
Step 5: 2 < peek(3) → skip
Step 6: 11 > peek(3) → pop 3, push 11 → heap = [5, 11, 12]

Result: {5, 11, 12} — the 3 largest
```

**K Smallest → use Max-Heap of size K** (mirror logic: pop the largest of the small candidates when over capacity).

**Complexity:** Time O(n log K), Space O(K)

---

### Pattern 2: Kth Largest in a Stream

**Problem:** Elements arrive one at a time. After each arrival, report the Kth largest seen so far.

**Solution:** Maintain a min-heap of size K. After each insertion, if size > K, pop. The root is always the Kth largest.

This works because: the K largest elements live in the heap. The Kth largest is the smallest among them — the root of the min-heap.

**When to prefer this over Quick Select:** Quick Select is O(n) average but only works on a static array. Heap handles streaming and maintains state continuously.

---

### Pattern 3: Merge K Sorted Lists/Arrays

**Problem:** You have K sorted sequences. Produce one merged sorted sequence.

**Why not sort everything?** Sorting all N elements across K lists is O(N log N). Since the lists are already sorted, we can exploit that structure and do O(N log K) — sorting only among the K current "front" elements.

**Solution:**
1. Push the first element from each of the K lists into a min-heap. Each heap entry carries (value, list_index, position_in_list).
2. Extract the min (smallest among all K fronts) → add to result.
3. Advance that list's pointer and push its next element into the heap.
4. Repeat until the heap is empty.

**Why O(N log K)?** Each of the N total elements is pushed and popped from a heap of size K once. Each push/pop is O(log K).

---

### Pattern 4: Two-Heap Pattern (Median from Stream)

**Problem:** Numbers arrive one at a time. After each arrival, return the median.

**Insight:** The median is the "middle" value. Split all seen numbers into two halves:
- **Left half (smaller values):** stored in a max-heap. Root = largest of the small half.
- **Right half (larger values):** stored in a min-heap. Root = smallest of the large half.

The median sits at the boundary between these two halves — it is the root of one or both heaps.

```
After inserting: [1, 7, 3, 5, 2]

Max-heap (left): [3, 2, 1]   ← roots: 3
Min-heap (right): [5, 7]     ← roots: 5

Sizes: 3 and 2 → median = root of larger heap = 3
```

**Balance rule:** The two heaps can differ in size by at most 1. If they diverge, move the root of the larger heap to the smaller heap.

**Insert logic:**
1. If new element <= max-heap root → push to max-heap (left half)
2. Else → push to min-heap (right half)
3. Rebalance if sizes differ by more than 1

**Complexity:** addNum O(log n), findMedian O(1)

---

### Pattern 5: Sliding Window Maximum (Heap Variant)

**Problem:** Given a window of size K sliding across an array, return the maximum in each window position.

**Heap approach:** Use a max-heap storing (value, index). When computing the max for a window, pop elements whose index is outside the current window boundary (lazy deletion). The root after cleanup is the current window maximum.

**Note:** A monotonic deque solves this in O(n) and is often preferred. The heap approach is O(n log n) but is more intuitive and easier to remember under pressure.

---

### When NOT to Use a Heap

| Situation | Better Choice |
|---|---|
| Need all elements sorted | Sort (O(n log n), simpler) |
| Static dataset, find Kth once | Quick Select O(n) avg |
| K = 1 (just the max or min) | Single linear scan O(n) |
| K is nearly equal to N | Sort the whole array |
| Need arbitrary element by value | Hash map or BST |

---

## [35–45 min] Concrete Code + Dry Run

### Problem: Kth Largest Element in an Array

**Input:** `nums = [3, 2, 1, 5, 6, 4]`, `k = 2`
**Output:** `5`

#### Java Implementation

```java
import java.util.PriorityQueue;

public class KthLargest {
    public int findKthLargest(int[] nums, int k) {
        // Min-heap of size k
        PriorityQueue<Integer> minHeap = new PriorityQueue<>();

        for (int num : nums) {
            minHeap.offer(num);
            if (minHeap.size() > k) {
                minHeap.poll(); // remove the smallest, keep top k
            }
        }

        return minHeap.peek(); // root = kth largest
    }
}
```

#### JavaScript/TypeScript Implementation

JavaScript does not have a built-in heap. Here is a minimal MinHeap class followed by the solution:

```javascript
class MinHeap {
    constructor() { this.heap = []; }

    peek() { return this.heap[0]; }

    push(val) {
        this.heap.push(val);
        this._bubbleUp(this.heap.length - 1);
    }

    pop() {
        const min = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._sinkDown(0);
        }
        return min;
    }

    size() { return this.heap.length; }

    _bubbleUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[parent] <= this.heap[i]) break;
            [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
            i = parent;
        }
    }

    _sinkDown(i) {
        const n = this.heap.length;
        while (true) {
            let smallest = i;
            const l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && this.heap[l] < this.heap[smallest]) smallest = l;
            if (r < n && this.heap[r] < this.heap[smallest]) smallest = r;
            if (smallest === i) break;
            [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
            i = smallest;
        }
    }
}

function findKthLargest(nums, k) {
    const heap = new MinHeap();
    for (const num of nums) {
        heap.push(num);
        if (heap.size() > k) heap.pop();
    }
    return heap.peek();
}
```

#### Dry Run: `nums = [3, 2, 1, 5, 6, 4]`, `k = 2`

| Step | Element Processed | Action | Heap Contents (min at top) | Heap Size |
|---|---|---|---|---|
| 1 | 3 | push 3 | [3] | 1 |
| 2 | 2 | push 2 | [2, 3] | 2 |
| 3 | 1 | push 1, size > 2 → pop min(1) | [2, 3] | 2 |
| 4 | 5 | push 5, size > 2 → pop min(2) | [3, 5] | 2 |
| 5 | 6 | push 6, size > 2 → pop min(3) | [5, 6] | 2 |
| 6 | 4 | push 4, size > 2 → pop min(4) | [5, 6] | 2 |

**Answer:** `heap.peek() = 5` — the 2nd largest element.

---

### Problem: Find Median from Data Stream

**Java Implementation**

```java
import java.util.PriorityQueue;
import java.util.Collections;

class MedianFinder {
    // max-heap: stores the smaller half
    private PriorityQueue<Integer> left = new PriorityQueue<>(Collections.reverseOrder());
    // min-heap: stores the larger half
    private PriorityQueue<Integer> right = new PriorityQueue<>();

    public void addNum(int num) {
        // Route to correct half
        if (left.isEmpty() || num <= left.peek()) {
            left.offer(num);
        } else {
            right.offer(num);
        }
        // Rebalance: sizes should differ by at most 1
        if (left.size() > right.size() + 1) {
            right.offer(left.poll());
        } else if (right.size() > left.size()) {
            left.offer(right.poll());
        }
    }

    public double findMedian() {
        if (left.size() > right.size()) return left.peek();
        return (left.peek() + right.peek()) / 2.0;
    }
}
```

#### Dry Run: Insert [1, 7, 3]

| Step | Insert | left (max-heap) | right (min-heap) | Median |
|---|---|---|---|---|
| 1 | 1 | [1] | [] | 1.0 |
| 2 | 7 | [1] | [7] | (1+7)/2 = 4.0 |
| 3 | 3 | [1, 3] → rebalance → [3] | [1] → wait... | |

Let me trace carefully:
- Insert 3: 3 > left.peek(1), so goes to right: right = [3, 7]
- right.size(2) > left.size(1) → move right.peek(3) to left: left = [3, 1], right = [7]
- left.peek() = 3, median = 3.0

| Step | Insert | left (max-heap root) | right (min-heap root) | Median |
|---|---|---|---|---|
| 1 | 1 | max-heap: {1}, root=1 | min-heap: {}, root=- | 1.0 |
| 2 | 7 | max-heap: {1}, root=1 | min-heap: {7}, root=7 | 4.0 |
| 3 | 3 | max-heap: {3,1}, root=3 | min-heap: {7}, root=7 | 3.0 |

---

## [45–55 min] Pattern Recognition

### Decision Framework

```
New problem involving dynamic data:
  └── "Do I need the min or max repeatedly from a changing set?"
        ├── YES
        │     ├── "K largest/smallest?" → Min/Max Heap of size K
        │     ├── "Median from stream?" → Two Heaps (max + min)
        │     ├── "Merge K sorted sources?" → Min Heap of size K
        │     └── "Shortest path / min cost graph?" → Min Heap (Dijkstra)
        └── NO (static data)
              └── Sort once, then index or binary search
```

### Heap vs Sorting — What Clue Points to Each?

| Clue in Problem | Use |
|---|---|
| "K largest / K most frequent / K closest" | Heap: O(n log K) beats sort O(n log n) when K << n |
| "Sort all elements" or "rank all elements" | Sort |
| "Stream / online / elements arrive one by one" | Heap: handles dynamic insertions |
| "Only need the Kth once, no streaming" | Quick Select O(n) avg |
| "Median dynamically" | Two Heaps |
| "Merge K sorted" | Min Heap: O(N log K) |

### Heap vs Monotonic Stack/Deque

| | Heap | Monotonic Deque |
|---|---|---|
| Sliding window max/min | O(n log n) | O(n) — preferred |
| K largest globally | O(n log K) | Not applicable |
| "Next greater element" | Not the right tool | O(n) — preferred |
| Order preserved? | No | Yes |
| Supports arbitrary removal? | Not directly | Yes (from both ends) |

**Rule of thumb:** If "sliding window" + "max or min in window" → reach for monotonic deque first. If the problem is about global top K or streaming extremes → heap.

### Identifying the Right Heap Type

| Goal | Heap to Use | Why |
|---|---|---|
| Find K largest | Min-heap size K | Root is the gatekeeper (smallest of the K largest) |
| Find K smallest | Max-heap size K | Root is the gatekeeper (largest of the K smallest) |
| Median stream | Max-heap (left) + Min-heap (right) | Tops are the two middle values |
| Merge K sorted | Min-heap size K | Always extract the globally smallest front |
| Dijkstra | Min-heap | Always expand nearest node |

### Common Traps

1. **"K largest" uses a MIN-heap.** Counterintuitive — remember: the min-heap guards the bottom of the top K.
2. **Two-heap rebalancing order matters.** Always rebalance after insertion. Also ensure max-heap root <= min-heap root.
3. **Don't merge K sorted lists by dumping into one array and sorting** — that is O(N log N) and discards the sorted structure. Heap merge is O(N log K).
4. **Java's PriorityQueue is a min-heap by default.** For max-heap: `new PriorityQueue<>(Collections.reverseOrder())` or `new PriorityQueue<>((a, b) -> b - a)`.

---

## [55–60 min] Final Mental Checklist

When you see a new problem, run through this in 30 seconds:

```
[ ] Does the problem involve repeatedly finding the min or max?
[ ] Is the data dynamic (streaming, insertions, deletions)?
[ ] Is K much smaller than N? (signals heap over sort)
[ ] Do I need the median dynamically? → Two heaps
[ ] Am I merging K sorted sources? → Min-heap of size K
[ ] Is it a graph shortest path problem? → Min-heap (Dijkstra)

If none of above match:
[ ] Is data static and I need Kth once? → Quick Select O(n)
[ ] Do I need everything sorted? → Sort O(n log n)
[ ] Do I need sliding window max/min? → Monotonic deque O(n)
```

**Java heap quick reference:**
```java
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
// Custom comparator:
PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]); // sort by first element
```

---

## Active Recall

Test yourself without looking at the notes. Spend 1–2 minutes on each.

1. Why does finding the K largest elements use a MIN-heap instead of a max-heap?
2. What is the time complexity of inserting into a heap, and why — trace through the reason using tree height.
3. Why is peek O(1) but pop O(log n)?
4. In the two-heap (median stream) pattern, which half uses a max-heap and which uses a min-heap? What does the root of each represent?
5. You have K sorted arrays totaling N elements. What is the time complexity of merging them with a heap, and why is it faster than sorting everything?
6. A problem says "find the K most frequent elements." How do you convert this into a Top-K heap problem?
7. What is the difference between using a heap and using a monotonic deque for sliding window maximum?
8. When should you prefer Quick Select over a heap for finding the Kth element?
9. In Java, how do you create a max-heap? What is the default behavior of PriorityQueue?
10. A stream of numbers arrives. After every insertion, you must report the median. Describe the two-heap approach in 3 sentences.

---

## 2-Minute Cheat Sheet

```
HEAP CHEAT SHEET
─────────────────────────────────────────────────────
TYPE:       Min-heap (default) / Max-heap (reverse order)
PEEK:       O(1) — root is always the extreme
PUSH/POP:   O(log n) — tree height = log n, bubble up/down
BUILD:      O(n) — bottom-up heapify

TOP-K LARGEST:  min-heap size K — pop when size > K
TOP-K SMALLEST: max-heap size K — pop when size > K

KTH LARGEST:    min-heap size K → root = answer
KTH IN STREAM:  same, maintained dynamically

MERGE K SORTED: min-heap of (value, list, pos)
                → always extract global min, advance that list

MEDIAN STREAM:  left = max-heap, right = min-heap
                balance sizes (differ by ≤ 1)
                median = larger heap root or avg of roots

SLIDING WINDOW MAX: prefer monotonic deque O(n)
                    heap works but O(n log n)

DIJKSTRA:       min-heap on (distance, node)

JAVA:
  PriorityQueue<Integer> pq = new PriorityQueue<>();           // min
  PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder()); // max

COMPLEXITY COMPARISON:
  Sort all:       O(n log n)
  Top K heap:     O(n log K)       ← better when K << n
  Quick Select:   O(n) avg         ← static array, one-time only
─────────────────────────────────────────────────────
```

---

## Recommended Practice Direction

Work through these in order. Each builds on the previous.

**Foundations:**
- LeetCode 215 — Kth Largest Element in an Array
- LeetCode 703 — Kth Largest Element in a Stream

**Top-K Variants:**
- LeetCode 347 — Top K Frequent Elements
- LeetCode 973 — K Closest Points to Origin
- LeetCode 451 — Sort Characters by Frequency

**Merge K Sorted:**
- LeetCode 23 — Merge K Sorted Lists
- LeetCode 378 — Kth Smallest Element in a Sorted Matrix

**Two-Heap Pattern:**
- LeetCode 295 — Find Median from Data Stream
- LeetCode 480 — Sliding Window Median (hard)

**Scheduling (Heap + Greedy):**
- LeetCode 621 — Task Scheduler
- LeetCode 767 — Reorganize String
- LeetCode 358 — Rearrange String K Distance Apart (hard)

**Graph (Heap application):**
- LeetCode 743 — Network Delay Time (Dijkstra)
- LeetCode 1584 — Min Cost to Connect All Points (Prim's MST)

---

## Advanced Awareness

These topics exist and you may encounter them. You do not need to master them now, but knowing they exist helps you recognize when a problem is reaching beyond the standard patterns.

**Heap Sort:**
Build a max-heap from the array (O(n)), then repeatedly extract max to sort in place. Time O(n log n), Space O(1). Not commonly used in practice (quicksort is faster in cache terms) but demonstrates that heaps can sort.

**Indexed Priority Queue:**
A heap where you can efficiently update the priority of an existing element by index. Needed for optimal Dijkstra and Prim's when edge weights change. Combines a heap with a hash map for O(log n) decrease-key. Used in competitive programming; rarely required in interviews.

**Fibonacci Heap:**
Achieves O(1) amortized decrease-key (vs O(log n) for binary heap), giving Dijkstra O(E + V log V) instead of O(E log V). Theoretical importance only — extremely complex to implement and rarely appears in interviews.

**Lazy Deletion:**
Standard heaps do not support arbitrary element removal. Workaround: mark elements as deleted, skip them when they surface at the root. Used in sliding window median and problems where elements expire. The two-heap pattern for sliding window median relies on this technique.

---

*Next: [13-GREEDY-ALGORITHMS.md](13-GREEDY-ALGORITHMS.md) — When making the locally optimal choice leads to the globally optimal solution.*
