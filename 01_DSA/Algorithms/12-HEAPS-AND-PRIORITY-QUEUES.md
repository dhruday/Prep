# Heaps and Priority Queues

> **5 algorithms covered:** Top-K Elements · Kth Largest / Kth Smallest · Merge K Sorted Lists · Two-Heap for Median · Sliding Window Maximum

> "Whenever you need the top something from a changing set — think heap."

---

## Table of Contents

1. [Top-K Elements](#top-k-elements)
2. [Kth Largest / Kth Smallest](#kth-largest--kth-smallest)
3. [Merge K Sorted Lists](#merge-k-sorted-lists)
4. [Two-Heap for Median](#two-heap-for-median)
5. [Sliding Window Maximum](#sliding-window-maximum)

---

## Top-K Elements

### What is it?
You have n numbers and want the K largest (or smallest). A heap — a data structure that always gives you the smallest (or largest) element instantly — lets you scan all n numbers while keeping only K in memory at once. Result: faster than sorting when K is much smaller than n.

### Visual
Min-heap of size K=3 tracking the 3 largest seen so far. Root is the "weakest link" among the top-K candidates.

```
      3         ← root = smallest of top-3 (the gatekeeper)
     / \
    5   11
```
Any new number > 3 evicts the root and takes its place.

### How does it work?
1. Create an empty min-heap.
2. For each number in the array, push it onto the heap.
3. If heap size exceeds K, pop (remove the current minimum).
4. After processing all numbers, the heap holds exactly the K largest elements.
5. The root (heap minimum) is the Kth largest.

### Why does it work?
The root of a min-heap is always the smallest element in the heap. By keeping heap size at K and evicting the smallest whenever a larger element arrives, you guarantee only the K largest survive. The root is the "weakest" of those survivors — the Kth largest.

### When to use?
- Problem says "find the K largest / K smallest / K most frequent / K closest."
- n is large but K is small — heap saves memory and beats sort.
- Data arrives as a stream (can't hold it all in memory).
- Need result without fully sorting the array.

### When NOT to use?
- K equals n — just sort the whole array, it's simpler.
- Data is static and you only need Kth once — use QuickSelect O(n) average instead.

### How to recognize in a new problem?
Look for the word "top K", "K largest", "K most frequent", "K closest". If the problem asks for a subset of size K from a larger collection and order within that K doesn't matter, this pattern fits. Signal: n >> K and you want to avoid O(n log n) sort.

### Simple Example
Input: `nums = [3, 1, 5, 12, 2, 11]`, K = 3
Expected output: the 3 largest = {5, 11, 12}

Heap trace:
```
Push 3  → heap: [3]
Push 1  → heap: [1, 3]
Push 5  → heap: [1, 3, 5]       size = K, full
Push 12 → heap: [1, 3, 5, 12]   size > K → pop min(1) → [3, 5, 12]
Push 2  → 2 < root(3), skip adding or push+pop: heap stays [3, 5, 12]
Push 11 → heap: [3, 5, 12, 11]  size > K → pop min(3) → [5, 11, 12]
Result: {5, 11, 12}
```

### Code
```java
// Java — using PriorityQueue (min-heap by default)
import java.util.PriorityQueue;

public class TopKLargest {
    public int[] topKLargest(int[] nums, int k) {
        // Min-heap: root is always the smallest of the top-k
        PriorityQueue<Integer> minHeap = new PriorityQueue<>();

        for (int num : nums) {
            minHeap.offer(num);
            if (minHeap.size() > k) {
                minHeap.poll(); // evict the weakest candidate
            }
        }

        // Drain heap into result array
        int[] result = new int[k];
        for (int i = k - 1; i >= 0; i--) {
            result[i] = minHeap.poll();
        }
        return result;
    }
}
```

```javascript
// JavaScript — note: no built-in heap, implement MinHeap manually
class MinHeap {
    constructor() { this.heap = []; }
    size() { return this.heap.length; }
    peek() { return this.heap[0]; }

    push(val) {
        this.heap.push(val);
        this._bubbleUp(this.heap.length - 1);
    }

    pop() {
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._sinkDown(0);
        }
        return top;
    }

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
            const left = 2 * i + 1, right = 2 * i + 2;
            if (left < n && this.heap[left] < this.heap[smallest]) smallest = left;
            if (right < n && this.heap[right] < this.heap[smallest]) smallest = right;
            if (smallest === i) break;
            [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
            i = smallest;
        }
    }
}

function topKLargest(nums, k) {
    const heap = new MinHeap();
    for (const num of nums) {
        heap.push(num);
        if (heap.size() > k) heap.pop();
    }
    const result = [];
    while (heap.size() > 0) result.push(heap.pop());
    return result; // sorted ascending; last k elements are top-k
}
```

### Dry Run
Input: `[3, 1, 5, 12, 2, 11]`, K = 3

| Step | Number | Action             | Heap Contents (min at top) | Size |
|------|--------|--------------------|----------------------------|------|
| 1    | 3      | push               | [3]                        | 1    |
| 2    | 1      | push               | [1, 3]                     | 2    |
| 3    | 5      | push               | [1, 3, 5]                  | 3    |
| 4    | 12     | push, size>K→pop 1 | [3, 5, 12]                 | 3    |
| 5    | 2      | push, size>K→pop 2 | [3, 5, 12]                 | 3    |
| 6    | 11     | push, size>K→pop 3 | [5, 11, 12]                | 3    |

Final heap: {5, 11, 12} — the 3 largest.

### Complexity
```
Time:  O(n log K)
       — n elements processed, each push/pop is O(log K) because heap size stays at K
       — Better than O(n log n) sort when K << n

Space: O(K)
       — heap never grows beyond K elements
```

### Common Trap
- Using a **max-heap** for "K largest" — that's backwards. Use a **min-heap** so the root guards the weakest candidate.
- Forgetting to pop when size exceeds K (not just equals K). Pop when `size > k`, not `size >= k`.

### Experience Tip
**Experience Tip:** The counterintuitive part is that K largest uses a min-heap. Memorize it this way: "to keep the biggest K, evict the smallest — so put the smallest at the root where it's easy to evict." Once you internalize this, Top-K problems become mechanical.

### Do Not Confuse With
- **Heap vs Sorting:** Sort when you need all elements ordered or K is close to n. Use heap when K << n and you want O(n log K).
- **Heap vs Monotonic Stack:** Monotonic stack/deque is for sliding window or "next greater element." Heap is for globally tracking top-K from the whole array or a stream.

### LeetCode Practice
| #   | Problem                          | Difficulty | What to Notice                                         | Link |
|-----|----------------------------------|------------|--------------------------------------------------------|------|
| 347 | Top K Frequent Elements          | Medium     | Frequency map first, then min-heap on frequency        | https://leetcode.com/problems/top-k-frequent-elements/ |
| 973 | K Closest Points to Origin       | Medium     | Distance as heap key; min-heap of size K on distance   | https://leetcode.com/problems/k-closest-points-to-origin/ |
| 215 | Kth Largest Element in an Array  | Medium     | Min-heap size K; root is the answer                    | https://leetcode.com/problems/kth-largest-element-in-an-array/ |
| 692 | Top K Frequent Words             | Medium     | Heap on (frequency, word); handle tie-breaking by word | https://leetcode.com/problems/top-k-frequent-words/ |
| 264 | Ugly Number II                   | Medium     | Min-heap to always get next smallest ugly number       | https://leetcode.com/problems/ugly-number-ii/ |

### One-Minute Revision
```
PATTERN:       Top-K Elements
IN SIMPLE WORDS: Keep a min-heap of size K; evict smallest when overfull
USE WHEN:      "K largest / K most frequent / K closest" and K << n
DON'T USE WHEN: K ≈ n (just sort); static array one-time (QuickSelect)
CORE IDEA:     Min-heap root = weakest survivor = Kth largest
TRACK:         Min-heap of size K
TIME:          O(n log K)
SPACE:         O(K)
COMMON TRAP:   Using max-heap instead of min-heap for "K largest"
EXPERIENCE TIP: "Keep biggest K → evict the smallest → min-heap"
```

---

## Kth Largest / Kth Smallest

### What is it?
Find the single Kth largest (or Kth smallest) element in an array or stream. A heap — a data structure that always gives you the smallest (or largest) element instantly — maintains the answer after every insertion without re-sorting.

### Visual
Min-heap of size K=3 for finding 3rd largest in [6, 5, 4, 3, 2, 1]:

```
      4         ← root = 3rd largest (Kth largest = min of top-K)
     / \
    6   5
```

### How does it work?
1. Create a min-heap of size K.
2. For each element, push it onto the heap.
3. If heap size exceeds K, pop the minimum.
4. After all elements, the root of the heap is the Kth largest.
5. For Kth smallest: use a max-heap of size K instead; root = Kth smallest.

### Why does it work?
After processing all elements, the heap contains exactly the K largest elements. The smallest of those K elements (the root of the min-heap) is by definition the Kth largest overall.

### When to use?
- "Find the Kth largest/smallest element."
- Elements arrive as a stream — need the answer after every new element.
- K is fixed and you want O(n log K) instead of O(n log n) sort.
- LeetCode problem class 703 (Kth Largest Element in a Stream).

### When NOT to use?
- Static array, one-time query — QuickSelect runs O(n) average, better than O(n log K).
- K = 1 — a single linear scan finds min or max in O(n).

### How to recognize in a new problem?
"Return the Kth largest" or "return the Kth smallest" is the direct signal. If the problem wraps it in a class with `add(val)` and `findKth()`, it's the streaming variant — definitely heap.

### Simple Example
Input: `nums = [3, 2, 1, 5, 6, 4]`, K = 2
Expected output: 5 (the 2nd largest)

```
After processing all: heap = [5, 6]  (top-2 largest)
Root = 5 = 2nd largest
```

### Code
```java
// Java — using PriorityQueue
import java.util.PriorityQueue;

public class KthLargest {
    public int findKthLargest(int[] nums, int k) {
        PriorityQueue<Integer> minHeap = new PriorityQueue<>(); // min-heap

        for (int num : nums) {
            minHeap.offer(num);
            if (minHeap.size() > k) {
                minHeap.poll(); // remove smallest, keep only top k
            }
        }

        return minHeap.peek(); // root = kth largest
    }
}

// Streaming version (LeetCode 703)
class KthLargestStream {
    private PriorityQueue<Integer> minHeap;
    private int k;

    public KthLargestStream(int k, int[] nums) {
        this.k = k;
        this.minHeap = new PriorityQueue<>();
        for (int num : nums) add(num);
    }

    public int add(int val) {
        minHeap.offer(val);
        if (minHeap.size() > k) minHeap.poll();
        return minHeap.peek(); // always the kth largest
    }
}
```

```javascript
// JavaScript — note: no built-in heap, use MinHeap class from Top-K section above

function findKthLargest(nums, k) {
    const heap = new MinHeap(); // reuse MinHeap class from Top-K section
    for (const num of nums) {
        heap.push(num);
        if (heap.size() > k) heap.pop();
    }
    return heap.peek(); // root = kth largest
}
```

### Dry Run
Input: `nums = [3, 2, 1, 5, 6, 4]`, K = 2

| Step | Num | Action              | Heap (min at top) | Size |
|------|-----|---------------------|-------------------|------|
| 1    | 3   | push                | [3]               | 1    |
| 2    | 2   | push                | [2, 3]            | 2    |
| 3    | 1   | push, size>2→pop 1  | [2, 3]            | 2    |
| 4    | 5   | push, size>2→pop 2  | [3, 5]            | 2    |
| 5    | 6   | push, size>2→pop 3  | [5, 6]            | 2    |
| 6    | 4   | push, size>2→pop 4  | [5, 6]            | 2    |

`heap.peek() = 5` — the 2nd largest.

### Complexity
```
Time:  O(n log K)
       — each of n elements does one push + possibly one pop, both O(log K)

Space: O(K)
       — heap holds at most K elements at any time
```

### Common Trap
- Confusing Kth largest with Kth smallest. Kth largest → min-heap size K. Kth smallest → max-heap size K.
- For the streaming problem, calling `poll()` when size equals K (not when it exceeds K) — you'd lose an element prematurely.

### Experience Tip
**Experience Tip:** In interviews, "Kth largest in a stream" (LeetCode 703) is often asked as a design problem. Implement it as a class with a min-heap field. Once you've written the streaming version, the static array version is just calling `add()` in a loop — saves you from writing two different solutions.

### Do Not Confuse With
- **Heap vs QuickSelect:** QuickSelect is O(n) average but cannot handle streaming. If the array is static and you only need the answer once, QuickSelect wins. If elements keep arriving, heap wins.
- **Heap vs Sorting:** Sort gives you every rank in O(n log n). If you only need rank K, heap is O(n log K) — faster when K is small.

### LeetCode Practice
| #   | Problem                             | Difficulty | What to Notice                                         | Link |
|-----|-------------------------------------|------------|--------------------------------------------------------|------|
| 215 | Kth Largest Element in an Array     | Medium     | Classic min-heap size K; root = answer                 | https://leetcode.com/problems/kth-largest-element-in-an-array/ |
| 703 | Kth Largest Element in a Stream     | Easy       | Maintain heap across multiple `add()` calls            | https://leetcode.com/problems/kth-largest-element-in-a-stream/ |
| 378 | Kth Smallest Element in a Sorted Matrix | Medium | Max-heap size K; or binary search approach             | https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/ |
| 786 | K-th Smallest Prime Fraction        | Medium     | Min-heap on fraction value; store (value, i, j)        | https://leetcode.com/problems/k-th-smallest-prime-fraction/ |
| 668 | Kth Smallest Number in Multiplication Table | Hard | Binary search or min-heap; count elements <= mid   | https://leetcode.com/problems/kth-smallest-number-in-multiplication-table/ |

### One-Minute Revision
```
PATTERN:       Kth Largest / Kth Smallest
IN SIMPLE WORDS: Min-heap of size K → root is the Kth largest
USE WHEN:      Single Kth query, static or streaming
DON'T USE WHEN: K=1 (linear scan); static one-time (QuickSelect O(n))
CORE IDEA:     Top-K in heap → smallest of those K = Kth largest
TRACK:         Min-heap of size K (or max-heap for Kth smallest)
TIME:          O(n log K)
SPACE:         O(K)
COMMON TRAP:   Kth largest needs min-heap, not max-heap
EXPERIENCE TIP: Streaming version = class with heap field; static = loop over add()
```

---

## Merge K Sorted Lists

### What is it?
You have K sorted linked lists (or arrays). You want one merged sorted output. A heap — a data structure that always gives you the smallest (or largest) element instantly — picks the globally smallest front element across all K lists in O(log K), giving O(N log K) total instead of O(N log N) re-sort.

### Visual
3 sorted lists, their front elements in a min-heap:

```
Lists:
  L1: 1 → 4 → 7
  L2: 2 → 5 → 8
  L3: 3 → 6 → 9

Min-heap of front elements:
       1 (from L1)
      / \
     2   3
  (L2) (L3)

Extract 1 → push next from L1 (which is 4):
       2 (from L2)
      / \
     4   3
  (L1) (L3)
```

### How does it work?
1. Push the first element of each list into a min-heap. Each heap entry stores `(value, listIndex, positionInList)`.
2. Extract the minimum from the heap — this is the next element in the merged output.
3. Advance the pointer in that element's source list.
4. If that list has a next element, push it onto the heap.
5. Repeat steps 2-4 until the heap is empty.
6. The output is the complete merged sorted sequence.

### Why does it work?
At every step the heap holds exactly one candidate from each non-exhausted list — the current front element. The smallest of those candidates must be the next globally smallest element overall (because all lists are already sorted). Heap gives you that minimum in O(log K).

### When to use?
- Merging K sorted linked lists or arrays.
- K sorted files / data streams must be combined.
- Problem says "merge" + "sorted" + more than 2 sources.
- Building a sorted output from K priority queues.

### When NOT to use?
- K = 2 — use the simple two-pointer merge (O(N), no heap needed).
- Lists are not sorted — sort each list first, but then ask if a different approach is better.

### How to recognize in a new problem?
Explicit signal: "merge K sorted lists/arrays." Also watch for: "you have K sorted sequences, produce one sorted output." If the problem gives you K sources and each source is individually sorted, this pattern applies.

### Simple Example
Input: `[[1,4,7], [2,5,8], [3,6,9]]`
Expected output: `[1, 2, 3, 4, 5, 6, 7, 8, 9]`

```
heap starts: {(1,L1), (2,L2), (3,L3)}
Extract 1 → output [1], push 4 from L1 → heap: {(2,L2),(3,L3),(4,L1)}
Extract 2 → output [1,2], push 5 from L2 → heap: {(3,L3),(4,L1),(5,L2)}
Extract 3 → output [1,2,3], push 6 from L3 → heap: {(4,L1),(5,L2),(6,L3)}
... continues until heap empty
```

### Code
```java
// Java — using PriorityQueue with ListNode
import java.util.PriorityQueue;

class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}

public class MergeKSortedLists {
    public ListNode mergeKLists(ListNode[] lists) {
        // Min-heap: compare nodes by value
        PriorityQueue<ListNode> minHeap =
            new PriorityQueue<>((a, b) -> a.val - b.val);

        // Push the head of each non-empty list
        for (ListNode head : lists) {
            if (head != null) minHeap.offer(head);
        }

        ListNode dummy = new ListNode(0);
        ListNode current = dummy;

        while (!minHeap.isEmpty()) {
            ListNode smallest = minHeap.poll();    // extract global min
            current.next = smallest;
            current = current.next;

            if (smallest.next != null) {
                minHeap.offer(smallest.next);      // push next from same list
            }
        }

        return dummy.next;
    }
}
```

```javascript
// JavaScript — note: no built-in heap, use MinHeap adapted to compare by val

class MinHeapNodes {
    constructor() { this.heap = []; }
    size() { return this.heap.length; }
    peek() { return this.heap[0]; }

    push(node) {
        this.heap.push(node);
        this._bubbleUp(this.heap.length - 1);
    }

    pop() {
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._sinkDown(0);
        }
        return top;
    }

    _bubbleUp(i) {
        while (i > 0) {
            const p = Math.floor((i - 1) / 2);
            if (this.heap[p].val <= this.heap[i].val) break;
            [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
            i = p;
        }
    }

    _sinkDown(i) {
        const n = this.heap.length;
        while (true) {
            let smallest = i;
            const l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && this.heap[l].val < this.heap[smallest].val) smallest = l;
            if (r < n && this.heap[r].val < this.heap[smallest].val) smallest = r;
            if (smallest === i) break;
            [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
            i = smallest;
        }
    }
}

function mergeKLists(lists) {
    const heap = new MinHeapNodes();
    for (const head of lists) {
        if (head) heap.push(head);
    }

    const dummy = { val: 0, next: null };
    let current = dummy;

    while (heap.size() > 0) {
        const node = heap.pop();
        current.next = node;
        current = current.next;
        if (node.next) heap.push(node.next);
    }

    return dummy.next;
}
```

### Dry Run
Lists: `[1→4→7]`, `[2→5]`, `[3→6]`

| Step | Heap State (values)  | Extracted | Output So Far |
|------|----------------------|-----------|---------------|
| Init | {1, 2, 3}            | —         | []            |
| 1    | {2, 3, 4}            | 1         | [1]           |
| 2    | {3, 4, 5}            | 2         | [1, 2]        |
| 3    | {4, 5, 6}            | 3         | [1, 2, 3]     |
| 4    | {5, 6, 7}            | 4         | [1, 2, 3, 4]  |
| 5    | {6, 7}               | 5         | [1, 2, 3, 4, 5] |
| 6    | {7}                  | 6         | [1..6]        |
| 7    | {}                   | 7         | [1..7]        |

### Complexity
```
Time:  O(N log K)
       — N = total nodes across all lists
       — each node does one push + one pop, each O(log K) since heap size ≤ K

Space: O(K)
       — heap holds at most one node per list at any time
       — output list is O(N) but that's the required output space
```

### Common Trap
- Forgetting to store the list index or node pointer in the heap — if you only store the value you can't advance the correct list.
- Pushing null nodes onto the heap — always check `if (node.next != null)` before pushing.

### Experience Tip
**Experience Tip:** In Java, the comparator `(a, b) -> a.val - b.val` works for small integers but can overflow for large values. Use `Integer.compare(a.val, b.val)` to be safe. This is a quick way to impress interviewers who test edge cases.

### Do Not Confuse With
- **Heap vs Sorting all elements:** Dumping all N nodes into an array and sorting is O(N log N). Heap merge is O(N log K) — always at least as good, strictly better when K << N.
- **Heap vs Monotonic Stack:** Monotonic stack is for "next greater element" style problems. Merge K sorted lists has nothing to do with monotonic structures.

### LeetCode Practice
| #   | Problem                              | Difficulty | What to Notice                                          | Link |
|-----|--------------------------------------|------------|---------------------------------------------------------|------|
| 23  | Merge K Sorted Lists                 | Hard       | Classic; push heads, extract min, push next             | https://leetcode.com/problems/merge-k-sorted-lists/ |
| 378 | Kth Smallest Element in a Sorted Matrix | Medium  | Treat each row as a sorted list, merge K rows           | https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/ |
| 373 | Find K Pairs with Smallest Sums      | Medium     | Min-heap on pair sums; push neighbors lazily            | https://leetcode.com/problems/find-k-pairs-with-smallest-sums/ |
| 632 | Smallest Range Covering Elements from K Lists | Hard | Min-heap + track max; sliding the range window    | https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/ |
| 786 | K-th Smallest Prime Fraction         | Medium     | Min-heap on fraction value; push next fraction per row  | https://leetcode.com/problems/k-th-smallest-prime-fraction/ |

### One-Minute Revision
```
PATTERN:       Merge K Sorted Lists
IN SIMPLE WORDS: Put one front element per list in min-heap; always extract global min
USE WHEN:      K sorted sequences → one sorted output
DON'T USE WHEN: K=2 (two-pointer is simpler); unsorted input
CORE IDEA:     Heap holds K "current front" candidates; pick the smallest
TRACK:         Min-heap of size ≤ K, each entry = (value, list, position)
TIME:          O(N log K)
SPACE:         O(K)
COMMON TRAP:   Forgetting to push the next element from the extracted node's list
EXPERIENCE TIP: Use Integer.compare() not subtraction to avoid overflow in comparator
```

---

## Two-Heap for Median

### What is it?
Numbers arrive one at a time and you must return the median after each insertion. A heap — a data structure that always gives you the smallest (or largest) element instantly — lets you maintain two halves of the data so the median is always at one of the two heap roots.

### Visual
After inserting [1, 7, 3, 5, 2]:

```
Left half (smaller numbers)    Right half (larger numbers)
   Max-heap                        Min-heap

       3                               5
      / \                              \
     2   1                              7

root = 3 (largest of small half)    root = 5 (smallest of large half)
left.size=3 > right.size=2  →  median = left.peek() = 3
```

### How does it work?
1. Maintain two heaps: `left` (max-heap, stores smaller half) and `right` (min-heap, stores larger half).
2. To insert a number: if it is <= left.peek(), push to left; else push to right.
3. Rebalance: left and right sizes must differ by at most 1. If they diverge, move the root of the larger heap to the smaller heap.
4. To find median: if sizes are equal, return `(left.peek() + right.peek()) / 2.0`. If one is larger, return its root.

### Why does it work?
The median is the middle value of sorted data. If you split all seen numbers into a smaller half and a larger half, the median is at the boundary — the top of one or both halves. Max-heap gives you the top of the smaller half in O(1). Min-heap gives you the top of the larger half in O(1).

### When to use?
- "Find the median dynamically" / "median from a stream."
- After each insertion, the median is needed.
- Problem class: design a data structure with `addNum()` and `findMedian()`.
- Any problem needing the 50th percentile of a growing dataset.

### When NOT to use?
- Static array — sort once and index to middle.
- You only need the median once at the end — sort is simpler.

### How to recognize in a new problem?
Direct signal: "median from data stream." Softer signal: "continuously find the middle value" or "maintain a running median." If the problem asks you to design a class with add and query operations around the middle value, it is this pattern.

### Simple Example
Insert sequence: [1, 7, 3]

```
Insert 1: left=[1], right=[]         → median = 1.0
Insert 7: 7 > left.peek(1) → right=[7]; sizes: left=1, right=1 → median = (1+7)/2 = 4.0
Insert 3: 3 > left.peek(1) → right=[3,7]; right.size(2) > left.size(1) → rebalance: move 3 to left
          left=[3,1], right=[7] → median = left.peek() = 3.0
```

### Code
```java
// Java — using PriorityQueue
import java.util.PriorityQueue;
import java.util.Collections;

class MedianFinder {
    // max-heap: holds the smaller half; root = largest of small half
    private PriorityQueue<Integer> left = new PriorityQueue<>(Collections.reverseOrder());
    // min-heap: holds the larger half; root = smallest of large half
    private PriorityQueue<Integer> right = new PriorityQueue<>();

    public void addNum(int num) {
        // Step 1: route to correct half
        if (left.isEmpty() || num <= left.peek()) {
            left.offer(num);
        } else {
            right.offer(num);
        }

        // Step 2: rebalance so sizes differ by at most 1
        if (left.size() > right.size() + 1) {
            right.offer(left.poll());
        } else if (right.size() > left.size()) {
            left.offer(right.poll());
        }
    }

    public double findMedian() {
        if (left.size() > right.size()) {
            return left.peek();
        }
        return (left.peek() + right.peek()) / 2.0;
    }
}
```

```javascript
// JavaScript — note: no built-in heap; need both MinHeap and MaxHeap
// MaxHeap: invert values — push -val into a MinHeap

class MinHeap {
    constructor() { this.heap = []; }
    size() { return this.heap.length; }
    peek() { return this.heap[0]; }
    push(val) {
        this.heap.push(val);
        let i = this.heap.length - 1;
        while (i > 0) {
            const p = Math.floor((i - 1) / 2);
            if (this.heap[p] <= this.heap[i]) break;
            [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
            i = p;
        }
    }
    pop() {
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            let i = 0;
            while (true) {
                let s = i, l = 2*i+1, r = 2*i+2;
                if (l < this.heap.length && this.heap[l] < this.heap[s]) s = l;
                if (r < this.heap.length && this.heap[r] < this.heap[s]) s = r;
                if (s === i) break;
                [this.heap[s], this.heap[i]] = [this.heap[i], this.heap[s]];
                i = s;
            }
        }
        return top;
    }
}

class MedianFinder {
    constructor() {
        this.leftMin = new MinHeap(); // store negatives → simulates max-heap
        this.right = new MinHeap();  // actual min-heap
    }

    addNum(num) {
        // Push to left (max-heap via negation)
        this.leftMin.push(-num);
        // Balance: ensure left root <= right root
        this.right.push(-this.leftMin.pop());
        // Keep left size >= right size
        if (this.right.size() > this.leftMin.size()) {
            this.leftMin.push(-this.right.pop());
        }
    }

    findMedian() {
        if (this.leftMin.size() > this.right.size()) {
            return -this.leftMin.peek();
        }
        return (-this.leftMin.peek() + this.right.peek()) / 2.0;
    }
}
```

### Dry Run
Insert sequence: [1, 7, 3, 5, 2]

| Step | Insert | left (max-heap, values) | right (min-heap, values) | Median |
|------|--------|-------------------------|--------------------------|--------|
| 1    | 1      | {1}                     | {}                       | 1.0    |
| 2    | 7      | {1}                     | {7}                      | 4.0    |
| 3    | 3      | {3, 1} (rebalanced)     | {7}                      | 3.0    |
| 4    | 5      | {3, 1}                  | {5, 7}                   | 4.0    |
| 5    | 2      | {3, 2, 1} (rebalanced)  | {5, 7}                   | 3.0    |

### Complexity
```
Time:  addNum O(log n) — push/pop on heaps of size ~n/2
       findMedian O(1) — just peek at roots

Space: O(n)
       — all n inserted numbers live in one of the two heaps
```

### Common Trap
- Rebalancing in the wrong order: always route the number first, then rebalance. Rebalancing before routing produces wrong results.
- Not maintaining the invariant that every element in left <= every element in right. After rebalancing, do a cross-check: if left.peek() > right.peek(), rotate.

### Experience Tip
**Experience Tip:** This pattern appears verbatim as LeetCode 295. If you learn it once with clean code, you can write it in under 5 minutes in an interview. The Java version is under 20 lines. Memorize the two-step insert: (1) route, (2) rebalance.

### Do Not Confuse With
- **Two-Heap vs Sorting:** Sorting the whole array each time is O(n log n) per insertion. Two-heap is O(log n) per insertion — far better for streams.
- **Two-Heap vs Monotonic Stack:** Monotonic structures track relative order within a window. Two-heap tracks the absolute median of all seen data — completely different goals.

### LeetCode Practice
| #   | Problem                          | Difficulty | What to Notice                                           | Link |
|-----|----------------------------------|------------|----------------------------------------------------------|------|
| 295 | Find Median from Data Stream     | Hard       | The canonical two-heap problem; memorize this solution   | https://leetcode.com/problems/find-median-from-data-stream/ |
| 480 | Sliding Window Median            | Hard       | Two heaps + lazy deletion when elements leave the window | https://leetcode.com/problems/sliding-window-median/ |
| 436 | Find Right Interval              | Medium     | Not two-heap but uses sorted structures; good contrast   | https://leetcode.com/problems/find-right-interval/ |
| 502 | IPO                              | Medium     | Two heaps: one for available projects, one for profit    | https://leetcode.com/problems/ipo/ |
| 1438 | Longest Continuous Subarray with Abs Diff <= Limit | Medium | Max and min deques; similar two-structure idea  | https://leetcode.com/problems/longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit/ |

### One-Minute Revision
```
PATTERN:       Two-Heap for Median
IN SIMPLE WORDS: Split data into smaller half (max-heap) and larger half (min-heap); median is at the tops
USE WHEN:      "Median from stream" / dynamic median after each insert
DON'T USE WHEN: Static array (just sort); one-time median query
CORE IDEA:     left.peek() and right.peek() are the two middle values
TRACK:         left = max-heap (smaller half), right = min-heap (larger half)
TIME:          addNum O(log n), findMedian O(1)
SPACE:         O(n)
COMMON TRAP:   Rebalancing before routing instead of after
EXPERIENCE TIP: Learn LeetCode 295 solution cold — it appears verbatim in interviews
```

---

## Sliding Window Maximum

### What is it?
Given an array and a window of size K sliding from left to right, return the maximum value in each window position. A deque (double-ended queue) — which maintains a decreasing order of candidates — solves this in O(n). A heap also works but is slower. Both are covered here.

### Visual
Array: `[1, 3, -1, -3, 5, 3, 6, 7]`, K = 3

```
Window [1, 3,-1]: max = 3
Window [3,-1,-3]: max = 3
Window [-1,-3, 5]: max = 5
Window [-3, 5, 3]: max = 5
Window [5, 3, 6]: max = 6
Window [3, 6, 7]: max = 7
```

Deque approach — stores indices in decreasing value order:
```
Process index 0 (val=1):  deque=[0]
Process index 1 (val=3):  3>1, pop 0 → deque=[1]
Process index 2 (val=-1): deque=[1,2]     window full → max=nums[1]=3
Process index 3 (val=-3): deque=[1,2,3]   → pop front if out of window; max=nums[1]=3
```

### How does it work? (Deque approach — preferred)
1. Use a deque (deck) that stores array **indices** in decreasing order of their values.
2. For each new element at index i:
   a. Remove indices from the **back** of the deque if their values are <= current value (they can never be a future maximum).
   b. Remove indices from the **front** if they are outside the window (index < i - K + 1).
3. Push current index i to the back of the deque.
4. Once the first window is complete (i >= K - 1), the front of the deque is the index of the maximum.

### How does it work? (Heap approach — easier to remember)
1. Use a max-heap storing `(value, index)` pairs.
2. Push each element with its index.
3. Before reading the max for the current window, pop the heap's root if its index is outside the window.
4. The heap root after cleanup is the window maximum.

### Why does it work?
Deque: elements are kept in decreasing order. Any element smaller than the current one can never be a future window maximum (the current element is newer and larger — it dominates). So the deque only keeps "useful" candidates. The front is always the current window max.

Heap: the max is always at the root. Stale elements (outside window) are lazily removed when they surface. This is "lazy deletion."

### When to use?
- "Maximum (or minimum) in each sliding window of size K."
- K is fixed, window slides one step at a time.
- Need all window maximums, not just one.

### When NOT to use?
- K = 1 — every element is its own max, just return the array.
- Need the sum, average, or median of the window — different structures apply.
- Window size is variable — sliding window technique still applies but complexity analysis differs.

### How to recognize in a new problem?
Explicit: "sliding window maximum/minimum." Also: "for each subarray of length K, find the max." If the window moves and you need an extreme value at each position, this is the pattern.

### Simple Example
Input: `nums = [1, 3, -1, -3, 5, 3, 6, 7]`, K = 3
Expected output: `[3, 3, 5, 5, 6, 7]`

### Code
```java
// Java — Deque approach O(n)  [PREFERRED]
import java.util.ArrayDeque;
import java.util.Deque;

public class SlidingWindowMax {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] result = new int[n - k + 1];
        Deque<Integer> deque = new ArrayDeque<>(); // stores indices

        for (int i = 0; i < n; i++) {
            // Remove indices outside the window from front
            while (!deque.isEmpty() && deque.peekFirst() < i - k + 1) {
                deque.pollFirst();
            }
            // Remove smaller elements from back (they can never be max)
            while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) {
                deque.pollLast();
            }
            deque.offerLast(i);

            // Record result once first window is complete
            if (i >= k - 1) {
                result[i - k + 1] = nums[deque.peekFirst()];
            }
        }
        return result;
    }
}

// Java — Heap approach O(n log n)  [easier to recall under pressure]
import java.util.PriorityQueue;
import java.util.Collections;

public class SlidingWindowMaxHeap {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] result = new int[n - k + 1];
        // Max-heap: store [value, index], sort by value descending
        PriorityQueue<int[]> maxHeap =
            new PriorityQueue<>((a, b) -> b[0] - a[0]);

        for (int i = 0; i < n; i++) {
            maxHeap.offer(new int[]{nums[i], i});

            // Lazy deletion: skip stale elements outside window
            while (maxHeap.peek()[1] < i - k + 1) {
                maxHeap.poll();
            }

            if (i >= k - 1) {
                result[i - k + 1] = maxHeap.peek()[0];
            }
        }
        return result;
    }
}
```

```javascript
// JavaScript — Deque approach O(n)
// note: no built-in deque; use array with push/pop/shift/unshift (or a linked list for true O(1))

function maxSlidingWindow(nums, k) {
    const result = [];
    const deque = []; // stores indices; front = index of max

    for (let i = 0; i < nums.length; i++) {
        // Remove out-of-window index from front
        if (deque.length > 0 && deque[0] < i - k + 1) {
            deque.shift();
        }
        // Remove smaller elements from back
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
`nums = [1, 3, -1, -3, 5, 3, 6, 7]`, K = 3

| i | nums[i] | Deque (indices) | Deque (values) | Window Full? | Max |
|---|---------|-----------------|----------------|--------------|-----|
| 0 | 1       | [0]             | [1]            | No           | —   |
| 1 | 3       | [1]             | [3]            | No           | —   |
| 2 | -1      | [1, 2]          | [3, -1]        | Yes          | 3   |
| 3 | -3      | [1, 2, 3]       | [3, -1, -3]    | Yes          | 3   |
| 4 | 5       | [4]             | [5]            | Yes          | 5   |
| 5 | 3       | [4, 5]          | [5, 3]         | Yes          | 5   |
| 6 | 6       | [6]             | [6]            | Yes          | 6   |
| 7 | 7       | [7]             | [7]            | Yes          | 7   |

Output: `[3, 3, 5, 5, 6, 7]`

### Complexity
```
Deque approach:
  Time:  O(n) — each index is pushed and popped at most once
  Space: O(K) — deque holds at most K indices

Heap approach:
  Time:  O(n log n) — each element pushed once; lazy deletions cost log n each
  Space: O(n) — heap can accumulate stale elements
```

### Common Trap
- Using `<` instead of `<=` when removing from deque back — keeping equal elements prevents correct eviction and can give wrong results.
- In the heap approach, forgetting lazy deletion: if you read the root without checking if its index is still in the window, you get a stale maximum.

### Experience Tip
**Experience Tip:** In interviews, the deque solution is optimal but easy to fumble when nervous. If you blank on the deque, the heap approach (O(n log n)) is a valid fallback that still passes most LeetCode time limits. State both options and their complexities — that already demonstrates depth.

### Do Not Confuse With
- **Sliding Window Maximum vs Top-K:** Top-K is about the K best elements globally. Sliding window max is about the single best element within a moving fixed-size window.
- **Deque vs Heap for this problem:** Deque is O(n) and preferred. Heap is O(n log n) and is a fallback. The deque here is "monotonic" — it maintains a specific order property, unlike a general-purpose deque.

### LeetCode Practice
| #   | Problem                              | Difficulty | What to Notice                                               | Link |
|-----|--------------------------------------|------------|--------------------------------------------------------------|------|
| 239 | Sliding Window Maximum               | Hard       | The canonical problem; deque is optimal, heap is fallback    | https://leetcode.com/problems/sliding-window-maximum/ |
| 480 | Sliding Window Median                | Hard       | Two heaps + lazy deletion; harder variant of this pattern    | https://leetcode.com/problems/sliding-window-median/ |
| 1438 | Longest Continuous Subarray Abs Diff <= Limit | Medium | Two deques (max + min) to bound the range           | https://leetcode.com/problems/longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit/ |
| 862 | Shortest Subarray with Sum at Least K | Hard      | Monotonic deque on prefix sums                               | https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/ |
| 1499 | Max Value of Equation                | Hard       | Sliding window + deque on transformed values                 | https://leetcode.com/problems/max-value-of-equation/ |

### One-Minute Revision
```
PATTERN:       Sliding Window Maximum
IN SIMPLE WORDS: Deque stores indices in decreasing value order; front = window max
USE WHEN:      Fixed window sliding across array; need max (or min) at each position
DON'T USE WHEN: K=1 (trivial); sum/average window (different structure)
CORE IDEA:     Smaller elements behind a larger one can never be max → evict them
TRACK:         Deque of indices (decreasing values); OR max-heap with lazy deletion
TIME:          O(n) deque / O(n log n) heap
SPACE:         O(K) deque / O(n) heap
COMMON TRAP:   Using < instead of <= when removing from deque back
EXPERIENCE TIP: Know both deque (optimal) and heap (fallback); state both in interview
```

---

## Quick Reference — All Patterns

```
HEAP CHEAT SHEET
──────────────────────────────────────────────────────────────
HEAP BASICS
  Min-heap root:  smallest element  → O(1) peek
  Max-heap root:  largest element   → O(1) peek
  Push / Pop:     O(log n)           — tree height = log n
  Build from arr: O(n)               — bottom-up heapify

  Java min-heap:  new PriorityQueue<>()
  Java max-heap:  new PriorityQueue<>(Collections.reverseOrder())
  Java custom:    new PriorityQueue<>((a,b) -> Integer.compare(a[0], b[0]))

──────────────────────────────────────────────────────────────
PATTERNS AT A GLANCE

  Top-K Largest      → min-heap size K; root = Kth largest
  Top-K Smallest     → max-heap size K; root = Kth smallest
  Kth Largest        → min-heap size K; root = answer after all inserts
  Merge K Sorted     → min-heap of (val, listIdx); always extract global min
  Median Stream      → left=max-heap, right=min-heap; balance sizes ≤1 apart
  Sliding Window Max → monotonic deque O(n); heap O(n log n) as fallback

──────────────────────────────────────────────────────────────
HEAP vs ALTERNATIVES

  Sort all:        O(n log n) — use when K≈n or need fully sorted
  Top-K heap:      O(n log K) — use when K << n
  QuickSelect:     O(n) avg   — static array, one-time Kth query
  Monotonic deque: O(n)       — sliding window max/min
  Two pointers:    O(n)       — merge 2 sorted lists (K=2)

──────────────────────────────────────────────────────────────
WHICH HEAP FOR WHICH GOAL?

  K largest  → MIN-heap of size K  (evict weakest = min)
  K smallest → MAX-heap of size K  (evict strongest = max)
  Median     → max-heap (left) + min-heap (right)
  Merge K    → min-heap of size K  (always take global min front)
──────────────────────────────────────────────────────────────
```

---

*Next: [13-GREEDY-ALGORITHMS.md](13-GREEDY-ALGORITHMS.md)*
