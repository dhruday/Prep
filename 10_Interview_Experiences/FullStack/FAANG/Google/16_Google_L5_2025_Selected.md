# Google — L5 FullStack Interview Experience (2025) — #16

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 8 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Cloud Infrastructure |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite) + Team Match

---

## Round 2: Coding — Design Data Structure for Median Maintenance
**Duration:** 45 minutes

### Question: Given a stream of integers, implement a data structure that supports: (1) addNum — add integer from stream, (2) findMedian — return the median of all elements so far. Both operations should be O(log N).

**Follow-up:** Support removeNum(val) — remove a specific value.

```java
import java.util.*;

/**
 * Median Maintenance with Two Heaps + Lazy Deletion:
 * 
 * Approach: Use a max-heap (left half) and min-heap (right half).
 * - maxHeap stores the smaller half, top = largest of small half
 * - minHeap stores the larger half, top = smallest of large half
 * - Invariant: |maxHeap.size - minHeap.size| <= 1
 * - Median = maxHeap.peek() if odd count, else (maxHeap.peek() + minHeap.peek()) / 2
 * 
 * For removal: lazy deletion — mark as deleted, skip during peek/poll.
 * Track actual sizes separately from heap sizes.
 * 
 * Time: addNum O(log N), findMedian O(1), removeNum O(log N) amortized
 * Space: O(N)
 */
class MedianFinder {
    
    // Max-heap for the smaller half
    private PriorityQueue<Integer> maxHeap;
    // Min-heap for the larger half
    private PriorityQueue<Integer> minHeap;
    
    // For lazy deletion support
    private Map<Integer, Integer> deleted; // value → count of pending deletions
    private int maxHeapSize; // Actual size (excluding lazy-deleted)
    private int minHeapSize;
    
    public MedianFinder() {
        maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        minHeap = new PriorityQueue<>();
        deleted = new HashMap<>();
        maxHeapSize = 0;
        minHeapSize = 0;
    }
    
    /**
     * Add a number to the data structure.
     * 
     * Strategy:
     * 1. If num <= maxHeap.peek(), it belongs in the left half
     * 2. Otherwise, it belongs in the right half
     * 3. Rebalance so sizes differ by at most 1
     */
    public void addNum(int num) {
        // Add to appropriate heap
        if (maxHeapSize == 0 || num <= peekValid(maxHeap)) {
            maxHeap.offer(num);
            maxHeapSize++;
        } else {
            minHeap.offer(num);
            minHeapSize++;
        }
        
        rebalance();
    }
    
    /**
     * Remove a specific value (lazy deletion).
     * Mark it for deletion; it will be physically removed when it reaches the top.
     */
    public boolean removeNum(int num) {
        // Check which heap should contain this number
        if (maxHeapSize > 0 && num <= peekValid(maxHeap)) {
            deleted.merge(num, 1, Integer::sum);
            maxHeapSize--;
        } else if (minHeapSize > 0 && num >= peekValid(minHeap)) {
            deleted.merge(num, 1, Integer::sum);
            minHeapSize--;
        } else {
            return false; // Element not found
        }
        
        rebalance();
        
        // Prune tops of heaps to ensure peek() returns valid values
        prune(maxHeap);
        prune(minHeap);
        
        return true;
    }
    
    /**
     * Find the median.
     * O(1) since heaps are balanced and tops are pruned.
     */
    public double findMedian() {
        if (maxHeapSize == 0 && minHeapSize == 0) {
            throw new IllegalStateException("No elements");
        }
        
        if (maxHeapSize > minHeapSize) {
            return peekValid(maxHeap);
        } else if (minHeapSize > maxHeapSize) {
            return peekValid(minHeap);
        } else {
            return ((double) peekValid(maxHeap) + peekValid(minHeap)) / 2.0;
        }
    }
    
    /**
     * Rebalance: ensure |maxHeapSize - minHeapSize| <= 1.
     * Move elements between heaps if unbalanced.
     */
    private void rebalance() {
        while (maxHeapSize > minHeapSize + 1) {
            // Move top of maxHeap to minHeap
            int val = pollValid(maxHeap);
            minHeap.offer(val);
            maxHeapSize--;
            minHeapSize++;
        }
        
        while (minHeapSize > maxHeapSize + 1) {
            int val = pollValid(minHeap);
            maxHeap.offer(val);
            minHeapSize--;
            maxHeapSize++;
        }
    }
    
    /**
     * Peek at the top of the heap, skipping lazy-deleted elements.
     */
    private int peekValid(PriorityQueue<Integer> heap) {
        prune(heap);
        return heap.peek();
    }
    
    /**
     * Poll the top of the heap, skipping lazy-deleted elements.
     */
    private int pollValid(PriorityQueue<Integer> heap) {
        prune(heap);
        return heap.poll();
    }
    
    /**
     * Remove lazy-deleted elements from the top of the heap.
     */
    private void prune(PriorityQueue<Integer> heap) {
        while (!heap.isEmpty()) {
            int top = heap.peek();
            int delCount = deleted.getOrDefault(top, 0);
            if (delCount > 0) {
                heap.poll();
                if (delCount == 1) deleted.remove(top);
                else deleted.put(top, delCount - 1);
            } else {
                break;
            }
        }
    }
    
    public int size() {
        return maxHeapSize + minHeapSize;
    }
}
```

### Complexity Analysis:
| Operation | Time | Space |
|-----------|------|-------|
| addNum | O(log N) | O(N) |
| findMedian | O(1) amortized | — |
| removeNum | O(log N) amortized | — |
| prune | O(K) amortized per delete | — |

---

## 🎯 Key Takeaways
- Google L5 = **Two-heap median + lazy deletion for removeNum — classic but with advanced follow-up**
- **Two heaps**: max-heap (left/small half) + min-heap (right/large half) — balanced within ±1
- **Lazy deletion**: don't actually remove from heap — mark in `deleted` map, prune when element reaches top
- **Track actual sizes separately**: `maxHeapSize` / `minHeapSize` exclude lazy-deleted — distinct from `heap.size()`
- **Prune**: `while top is deleted → poll and decrement deleted count` — amortized O(1) per operation
- **Rebalance after both add and remove**: move elements between heaps to maintain ±1 invariant
- Google interviewers care about **clean code + handling edge cases + follow-up extensions**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | Coding |
| Coding (this) | Very Hard | Two Heaps, Lazy Deletion |
| System Design | Very Hard | Cloud Infrastructure |
| Behavioral | Medium | Googleyness |
| Coding 2 | Hard | Graphs |
