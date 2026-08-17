# Heaps and Priority Queues — Complete Pattern Guide

> *"A heap is not about sorting — it's about always knowing the extreme. The best, the worst, the Kth, the median. Whenever you need 'the top something,' think heap."*

---

## Table of Contents

1. [Heap Fundamentals](#heap-fundamentals)
2. [Top-K Pattern](#top-k-pattern)
3. [Kth Largest / Kth Smallest](#kth-largest--kth-smallest)
4. [Merge K Sorted Lists/Arrays](#merge-k-sorted-listsarrays)
5. [Two-Heap Pattern (Median from Stream)](#two-heap-pattern-median-from-stream)
6. [Sliding Window Median](#sliding-window-median)
7. [Task Scheduler](#task-scheduler)
8. [Reorganize String](#reorganize-string)
9. [Heap in Graph Algorithms](#heap-in-graph-algorithms)

---

## Heap Fundamentals

### What is this approach?

**Intuition:** A heap is a complete binary tree stored as an array where every parent is ≤ (min-heap) or ≥ (max-heap) its children. It answers one question instantly: "What's the minimum (or maximum)?"

### Core Properties

- **Insert:** Add at end, bubble up. O(log n)
- **Extract min/max:** Remove root, move last element to root, bubble down. O(log n)
- **Peek:** O(1) — just look at root
- **Build heap from array:** O(n) — NOT O(n log n). Heapify bottom-up.

### When to use a Heap vs Sorting

| Need | Use |
|---|---|
| ALL elements sorted | Sort: O(n log n) |
| Only top K elements | Heap: O(n log K) |
| Streaming data (elements arrive over time) | Heap: dynamic insertions |
| Repeated extract-min/max | Heap: O(log n) per operation |

---

## Top-K Pattern

### What is this approach?

**Intuition:** To find the K largest elements, maintain a MIN-heap of size K. Every new element: if it's larger than the heap's minimum, replace the minimum. At the end, the heap contains the K largest.

### When should I use this?

- "K most frequent elements"
- "K closest points to origin"
- "Top K frequent words"
- "K largest elements in array"
- Keywords: "top K," "K most," "K largest," "K closest"

### When should I NOT use this?

- K is close to N → just sort
- You need exact ordering of all elements → sort
- K = 1 → single pass for max/min is O(n), no heap needed

### Core Idea

**K Largest → use Min-Heap of size K:**
1. Add first K elements to min-heap
2. For each remaining element: if element > heap.peek(), replace top
3. Heap now contains K largest elements

**K Smallest → use Max-Heap of size K:**
- Mirror logic. Replace top if element < heap.peek()

**Why opposite heap?** The heap's root is the "gatekeeper." For K largest, the gatekeeper is the smallest of the K largest — anything bigger replaces it.

### Complexity

- **Time:** O(n log K)
- **Space:** O(K)

### Variants

- **K Most Frequent Elements:** Count frequencies first (HashMap), then Top-K on frequencies
- **K Closest Points:** Distance as key, Top-K on distances
- **Sort Characters by Frequency:** Frequency count + max-heap. Extract all in order.

### Interview Insights

- **Trap:** "K largest" uses MIN-heap. This is counterintuitive. Remember: the gatekeeper guards the bottom of the top K.
- **Alternative:** Quick Select gives O(n) average for Kth element, but heap is more versatile (streaming, partial results).

---

## Kth Largest / Kth Smallest

### What is this approach?

**Intuition:** "What's the Kth biggest thing?" Maintain a min-heap of size K. After processing all elements, the root is the Kth largest.

### Core Idea

**Static (array given):**
- Option 1: Min-heap of size K → O(n log K)
- Option 2: Quick Select → O(n) average, O(n²) worst
- Option 3: Sort → O(n log n)

**Streaming (Kth Largest Element in a Stream):**
- Maintain a min-heap of size K
- For each new element: add to heap. If size > K, extract min.
- Root is always the Kth largest seen so far

### Interview Insights

- **Trade-off:** Heap is O(n log K) but handles streaming. Quick Select is O(n) average but only for static arrays and doesn't maintain state.
- **Twist:** "Kth Smallest in a Sorted Matrix" — Use a min-heap initialized with first element of each row. Extract K times.

---

## Merge K Sorted Lists/Arrays

### What is this approach?

**Intuition:** You have K sorted sequences. To merge them, always pick the smallest element among all K current fronts. A min-heap of size K tracks these K fronts efficiently.

### When should I use this?

- "Merge K sorted lists"
- "Smallest range covering elements from K lists"
- "Kth smallest in sorted matrix"
- Keywords: "merge," "K sorted"

### Core Idea

1. Push the first element of each of the K lists into a min-heap (with list index and position)
2. Extract min → add to result → push the next element from that same list
3. Repeat until heap is empty

### Complexity

- **Time:** O(N log K) where N = total elements across all K lists
- **Space:** O(K) for the heap

### Variants

- **Merge K Sorted Lists (Linked Lists):** Heap entries are list node references. Extract min, advance that list's pointer.
- **Kth Smallest in Sorted Matrix:** Treat each row as a sorted list. Merge K lists, stop at Kth extraction.
- **Smallest Range Covering Elements from K Lists:** Merge K lists, track window [current_min, current_max]. Advance the min pointer (extract from heap). Track smallest range.

### Interview Insights

- **Alternative for Merge K:** Divide and Conquer — merge lists in pairs, like merge sort. O(N log K) time, O(1) extra space (in-place for linked lists). Both approaches are valid.
- **Trap:** Don't merge all into one array and sort — that's O(N log N), worse than O(N log K) when K << N.

---

## Two-Heap Pattern (Median from Stream)

### What is this approach?

**Intuition:** Split the data into two halves: a max-heap for the smaller half and a min-heap for the larger half. The median is always at the tops of these heaps. Like a seesaw — keep both halves balanced.

### When should I use this?

- "Find Median from Data Stream"
- "Sliding Window Median"
- Any problem needing the middle value dynamically

### Core Idea

1. **Max-heap (left half):** stores the smaller half. Root = largest of the small half.
2. **Min-heap (right half):** stores the larger half. Root = smallest of the large half.
3. **Balance rule:** sizes differ by at most 1. If max-heap has one more element, median = max-heap root. If equal sizes, median = average of both roots.
4. **Insert:** Add to appropriate heap, then rebalance (move root of larger heap to smaller heap if sizes differ by > 1).

### Complexity

- **addNum:** O(log n)
- **findMedian:** O(1)
- **Space:** O(n)

### Interview Insights

- **Trap:** Rebalancing logic. After every insertion, check sizes AND ensure max-heap root ≤ min-heap root. If violated, swap roots.
- **Twist:** "What if we need Kth percentile instead of median?" → Keep left heap at size K, right heap at size N-K.

---

## Sliding Window Median

### What is this approach?

**Intuition:** Two-heap pattern + sliding window. Add new element, remove outgoing element, rebalance, report median.

### Core Idea

1. Use two heaps (same as median stream)
2. On window slide: add incoming element, mark outgoing element for lazy deletion
3. Rebalance heaps by counting effective sizes (excluding lazily deleted elements)
4. When a heap root is a deleted element, remove it (lazy cleanup)

### Complexity

- **Time:** O(n log n) — each element inserted/deleted from heap once
- **Space:** O(n)

### Interview Insights

- **Difficulty:** This is a hard problem. The key challenge is lazy deletion from heaps (standard heaps don't support arbitrary removal).
- **Alternative:** Use a sorted structure supporting O(log n) insertion, deletion, and median lookup (e.g., balanced BST, or two sorted arrays with binary search).

---

## Task Scheduler

### What is this approach?

**Intuition:** CPU must wait n intervals between same tasks. To minimize total time, schedule the most frequent tasks first and fill gaps with other tasks.

### Core Idea

**Greedy + Max-Heap:**
1. Count frequencies. Build max-heap by frequency.
2. In each round of (n+1) slots: extract up to n+1 tasks from heap (most frequent first). Decrement their counts. Re-insert if count > 0.
3. Total time = sum of all round lengths (last round may be shorter).

**Formula approach:**
- max_freq = highest frequency
- count_max = how many tasks share max_freq
- result = max(total_tasks, (max_freq - 1) × (n + 1) + count_max)

### Complexity

- **Time:** O(N log 26) = O(N) since at most 26 task types
- **Space:** O(1) — at most 26 entries

### Interview Insights

- **Pattern:** "Most frequent first" is a greedy scheduling principle.
- **Formula:** Much simpler than simulation. Understand WHY it works: (max_freq - 1) full rounds of (n+1) slots, plus a partial last round.

---

## Reorganize String

### What is this approach?

**Intuition:** Place the most frequent character first, then the next most frequent, etc. Like seating people — put the largest group first, fill gaps with others.

### Core Idea

1. Count frequencies. If any frequency > (n+1)/2, impossible.
2. Max-heap by frequency. Extract top two characters, place them adjacently. Decrement and re-insert.
3. OR: Fill even indices first with most frequent, then odd indices.

### Complexity

- **Time:** O(n log 26) = O(n)
- **Space:** O(1)

### Interview Insights

- **Connection:** Same pattern as Task Scheduler but with cooldown = 1 (no two adjacent same characters).
- **Generalization:** "Rearrange String K Distance Apart" — cooldown = K. Use same heap approach with a waiting queue.

---

## Heap in Graph Algorithms

### What is this approach?

Heaps are the backbone of:

| Algorithm | Heap Use |
|---|---|
| **Dijkstra** | Min-heap to always expand nearest node |
| **Prim's MST** | Min-heap to always add cheapest edge |
| **A*** | Min-heap on f(n) = g(n) + h(n) |
| **Merge K Sorted** | Min-heap of size K for K-way merge |

### Interview Insights

- **Pattern recognition:** If a graph problem says "minimum cost" with non-negative weights → Dijkstra → needs a heap.
- **Custom comparator:** Heap entries in graph algorithms are often (distance, node) or (weight, node). The first element is the comparison key.

---

*Next: [13-GREEDY-ALGORITHMS.md](13-GREEDY-ALGORITHMS.md) — When making the locally optimal choice leads to the globally optimal solution.*
