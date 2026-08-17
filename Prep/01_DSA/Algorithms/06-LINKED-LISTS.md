# Linked Lists — Complete Pattern Guide

> *"In arrays, positions are addresses. In linked lists, relationships are addresses. Master the pointer, and you master the list."*

---

## Table of Contents

1. [Fast/Slow Pointer (Floyd's Tortoise and Hare)](#fastslow-pointer-floyds-tortoise-and-hare)
2. [Linked List Reversal](#linked-list-reversal)
3. [Merge Two / K Sorted Lists](#merge-two--k-sorted-lists)
4. [Intersection & Union of Lists](#intersection--union-of-lists)
5. [Copy List with Random Pointer](#copy-list-with-random-pointer)
6. [LRU Cache](#lru-cache)
7. [Reorder / Rearrange Patterns](#reorder--rearrange-patterns)
8. [Linked List as Recursive Structure](#linked-list-as-recursive-structure)

---

## Fast/Slow Pointer (Floyd's Tortoise and Hare)

### What is this approach?

**Intuition:** Two runners on a circular track. One runs at 2× speed. If the track has a loop, they WILL meet eventually (the fast runner laps the slow runner). If there's no loop, the fast runner hits the end.

**Formal:** Two pointers traverse the list at different speeds: slow moves one step at a time, fast moves two steps. If there's a cycle, they meet inside the cycle. If there's no cycle, fast reaches null.

### When should I use this?

- **Cycle detection** in a linked list
- **Finding the start of a cycle**
- **Finding the middle** of a linked list (fast reaches end when slow is at middle)
- **Finding the Kth node from the end** (two-pointer gap technique)
- **Checking if a linked list is a palindrome**
- Keywords: "cycle," "middle," "palindrome linked list," "Kth from end," "loop"

### When should I NOT use this?

- The structure is not a linked list (e.g., array — use index-based approaches)
- You need random access — linked lists don't support it
- You can modify the list and use marking instead (though Floyd's is cleaner)

### Core Idea

**Cycle Detection:**
1. slow = head, fast = head
2. Move slow by 1, fast by 2
3. If fast reaches null → no cycle
4. If slow == fast → cycle exists

**Find Cycle Start:**
1. After detection (slow == fast), reset one pointer to head
2. Move both at speed 1
3. They meet at the cycle start

**Why cycle start works:** Let the distance from head to cycle start be `a`, cycle start to meeting point be `b`, and meeting point back to cycle start be `c`. When they meet: slow traveled `a + b`, fast traveled `a + b + c + b` = `a + 2b + c`. Since fast is 2× speed: `2(a + b) = a + 2b + c`, so `a = c`. Moving from head and meeting point at equal speed: they converge at the cycle start.

**Find Middle:**
1. slow = head, fast = head
2. Move slow by 1, fast by 2
3. When fast reaches end, slow is at middle
4. For even-length lists: slow is at the first of the two middle nodes (or second, depending on the fast's stop condition)

### Complexity

- **Time:** O(n) — both pointers traverse at most O(n) steps
- **Space:** O(1) — only two pointers

### Variants

- **Detect Cycle (yes/no):** Fast/slow, check if they meet
- **Find Cycle Start:** Detect, then reset and advance at equal speed
- **Find Cycle Length:** After detection, keep one pointer fixed, count steps until they meet again
- **Find Middle Node:** Fast/slow from head
- **Kth Node from End:** Advance fast K steps first, then move both until fast reaches end. Slow is at Kth from end.
- **Palindrome Check:** Find middle (fast/slow), reverse second half, compare with first half, optionally restore
- **Find Duplicate Number (in array [1,n] with one duplicate):** Treat values as "next pointers." Index 0 → arr[0] → arr[arr[0]] → ... Forms a linked list with a cycle. Cycle start = the duplicate. Floyd's algorithm applies.
- **Happy Number:** Sum of squares of digits forms a sequence. Either reaches 1 or cycles. Use fast/slow on the sequence.

### Related Patterns

- [Two Pointers — Same Direction](02-ARRAYS-AND-STRINGS.md#two-pointers--same-direction) (same idea on arrays)
- [Cycle Detection on Array](04-SORTING-AND-ORDER.md#cyclic-sort) (treating array as implicit linked list)

### Interview Insights

- **Trap:** The "find duplicate number" problem. Most candidates think array, not linked list. The insight: arr[i] = next pointer from node i. This transforms the array into an implicit linked list with a cycle.
- **Trap:** Off-by-one for "find middle." Depending on the fast pointer's stop condition (fast.next vs fast.next.next check), slow ends at different positions for even-length lists.
- **Twist:** "Find cycle start" is a common follow-up to "detect cycle." The mathematical proof (a = c) is what interviewers test.
- **Follow-up:** "Can you find the cycle length?" — After meeting, fix one pointer, count until they meet again.

---

## Linked List Reversal

### What is this approach?

**Intuition:** Like reversing a line of people — each person turns around and faces the opposite direction. You go through the line one person at a time, redirecting each person's arm to point at the person behind them instead of ahead.

**Formal:** Reverse the direction of all `next` pointers in a linked list. Requires careful pointer manipulation to avoid losing access to the remaining list.

### When should I use this?

- "Reverse a linked list" (fully or partially)
- "Reverse nodes in K-group"
- "Palindrome linked list" (reverse second half to compare)
- "Add two numbers represented as linked lists (most significant digit first)"
- Keywords: "reverse," "k-group," "palindrome list"

### When should I NOT use this?

- You can use an array/stack instead (simpler for small lists, but uses O(n) space)
- The problem doesn't actually require reversal (e.g., traverse in reverse = use recursion/stack)

### Core Idea

**Iterative Reversal:**
1. prev = null, current = head
2. While current is not null:
   - next_temp = current.next (save the next node)
   - current.next = prev (reverse the pointer)
   - prev = current (advance prev)
   - current = next_temp (advance current)
3. Return prev (new head)

**Recursive Reversal:**
1. Base case: if head is null or head.next is null, return head
2. new_head = reverse(head.next) — recursively reverse the rest
3. head.next.next = head — make the next node point back to current
4. head.next = null — detach the current node's forward pointer
5. Return new_head

**Mental model (iterative):** Three people in a line: prev, current, next. Current turns around (points to prev). Then everyone shuffles forward one position. Repeat until the end.

### Complexity

- **Time:** O(n) — visit each node once
- **Space:** O(1) iterative, O(n) recursive (call stack)

### Variants

- **Full Reversal:** Reverse entire list
- **Reverse Between Positions m and n:** Traverse to position m-1, reverse the [m, n] segment, reconnect. Track the node before the reversed section and the first node of the reversed section.
- **Reverse in K-Groups:** Reverse every K consecutive nodes. If remaining nodes < K, leave as-is (or reverse, depending on variant). Requires counting K nodes, reversing them, then connecting to the result of the recursive call on the remainder.
- **Reverse Alternating K-Groups:** Reverse K, skip K, reverse K, skip K...
- **Palindrome Check:** Find middle, reverse second half, compare node by node, optionally reverse back.

### Related Patterns

- [Stack](07-STACKS-AND-QUEUES.md) (stack can simulate reversal, but uses O(n) space)
- [Recursion](08-RECURSION-AND-BACKTRACKING.md) (recursive reversal is a recursion exercise)

### Interview Insights

- **Trap:** Losing the reference to the rest of the list. ALWAYS save `current.next` before modifying `current.next`.
- **Trap:** In "Reverse Between m and n," reconnecting the reversed segment to the rest of the list. You need to save the node before position m (the "connection point") and the node at position m (which becomes the tail of the reversed segment).
- **Twist:** "Reverse in K-groups" is a hard problem that combines reversal with counting and recursion/iteration. Practice it until it's automatic.
- **Follow-up:** "Add two numbers (most significant digit first)" — Reverse both lists, add, reverse the result. Or use stacks.

---

## Merge Two / K Sorted Lists

### What is this approach?

**Intuition:** You have two sorted playlists, and you want to combine them into one sorted playlist. Compare the top song of each list, take the smaller one, and advance that list. Repeat. For K playlists, use a priority queue to always know which playlist's top song is smallest.

**Formal:** Merge sorted linked lists into a single sorted list by repeatedly selecting the smallest available head node.

### When should I use this?

- "Merge two sorted lists" or "Merge K sorted lists"
- Building merged results from sorted sources
- Keywords: "merge sorted," "combine sorted"

### When should I NOT use this?

- Lists are unsorted — sort first, or not a merge problem
- The output doesn't need to be sorted — just concatenate

### Core Idea

**Merge Two:**
1. Use a dummy head node to simplify edge cases
2. Compare heads of both lists, attach the smaller to the result
3. Advance the chosen list's pointer
4. When one list is exhausted, attach the remainder of the other

**Merge K:**
- **Approach 1 — Min-Heap:** Put the head of each list into a min-heap. Pop the smallest, add its next node to the heap. Repeat until heap is empty.
- **Approach 2 — Divide and Conquer:** Pair the K lists. Merge each pair. Repeat until one list remains. log(K) rounds, each round processes all n elements.

### Complexity

**Merge Two:**
- **Time:** O(n + m) where n, m are list lengths
- **Space:** O(1) (just pointer manipulation)

**Merge K (Heap):**
- **Time:** O(N log K) where N = total elements, K = number of lists
- **Space:** O(K) for the heap

**Merge K (Divide and Conquer):**
- **Time:** O(N log K)
- **Space:** O(log K) recursion stack / O(1) iterative

### Variants

- **Merge Two Sorted Lists:** The fundamental building block
- **Merge K Sorted Lists:** Heap or divide-and-conquer
- **Merge K Sorted Arrays:** Same approaches (heap or divide-and-conquer)
- **Sort a Linked List:** Split into halves (fast/slow), merge sort each half, merge. O(n log n) time, O(1) extra space for list merge.

### Related Patterns

- [Heaps](12-HEAPS-AND-PRIORITY-QUEUES.md) (min-heap for K-way merge)
- [Merge Sort](04-SORTING-AND-ORDER.md#merge-sort--divide-and-conquer-patterns) (same merge operation)
- [Divide and Conquer](08-RECURSION-AND-BACKTRACKING.md) (pairwise merge)

### Interview Insights

- **Trap:** Not using a dummy head node. Without it, you need special handling for the first node.
- **Twist:** "What's the time complexity of merging K lists by merging pairs sequentially (list1+list2, result+list3, ...)?" — O(K × N) because early lists get merged repeatedly. Divide-and-conquer avoids this.
- **Follow-up:** "Sort a linked list" — Merge sort is natural. Split with fast/slow pointer, recursively merge sort each half.

---

## Intersection & Union of Lists

### What is this approach?

**Intuition:** Two roads that might merge at some point. You want to find the junction. The trick: measure the lengths of both roads, then give the longer road a "head start" so both walkers arrive at the junction simultaneously.

**Formal:** Find the node where two singly linked lists converge (share the same tail).

### When should I use this?

- "Find intersection point of two linked lists"
- Detecting shared structure between lists
- Keywords: "intersection," "common node," "merge point"

### When should I NOT use this?

- Lists don't share physical nodes (just same values) — that's a different problem (value intersection → use HashSet)

### Core Idea

**Approach 1 — Length Difference:**
1. Find lengths of both lists (L1, L2)
2. Advance the longer list by |L1 - L2| steps
3. Walk both lists together; the first common node is the intersection

**Approach 2 — Two Pointers (elegant):**
1. Pointer A starts at head of list 1, pointer B at head of list 2
2. When A reaches the end, redirect to head of list 2. When B reaches the end, redirect to head of list 1.
3. They will meet at the intersection (or both reach null if no intersection)
4. Why: A travels L1 + (L2 - shared), B travels L2 + (L1 - shared). Equal distances.

### Complexity

- **Time:** O(n + m)
- **Space:** O(1)

### Variants

- **Find intersection node:** As described
- **Check if intersection exists:** Use above, check if result is null

### Related Patterns

- [Fast/Slow Pointer](#fastslow-pointer-floyds-tortoise-and-hare) (different pointer technique on lists)

### Interview Insights

- **Trap:** Confusing "same value" with "same node." Intersection means physically the same node, not just equal values.
- **Twist:** "What if you can modify the lists?" — Mark visited nodes (but this destroys the list) or reverse one list and detect cycle.

---

## Copy List with Random Pointer

### What is this approach?

**Intuition:** Cloning a city map where each house points to its neighbor (next) AND one random other house. You need to create an exact copy — every house replicated, every pointer replicated, but pointing to the NEW copies, not the originals.

**Formal:** Deep copy a linked list where each node has a `next` pointer and a `random` pointer to any node in the list.

### When should I use this?

- "Clone a linked list with random pointers"
- "Deep copy a graph structure"
- Keywords: "deep copy," "clone," "random pointer"

### When should I NOT use this?

- The list has only `next` pointers — standard iteration suffices
- You need a shallow copy — no replication needed

### Core Idea

**Approach 1 — HashMap:**
1. Pass 1: Create a copy of each node, store mapping: original → copy in HashMap
2. Pass 2: For each original node, set copy.next = map[original.next], copy.random = map[original.random]

**Approach 2 — Interleaving (O(1) space):**
1. Pass 1: Insert copied nodes between originals: A → A' → B → B' → C → C'
2. Pass 2: Set random pointers: A'.random = A.random.next (because the copy follows the original)
3. Pass 3: Separate the two interleaved lists

### Complexity

- **HashMap:** O(n) time, O(n) space
- **Interleaving:** O(n) time, O(1) space (excluding output)

### Variants

- **Clone Graph:** Same concept, generalized to any graph. Use HashMap: original_node → cloned_node. BFS or DFS to traverse.

### Related Patterns

- [Graph Traversal](11-GRAPHS.md) (clone graph uses same map technique with BFS/DFS)
- [Hashing](05-HASHING-AND-SETS.md) (original→copy mapping)

### Interview Insights

- **Trap:** Accidentally linking copies to originals instead of other copies.
- **Twist:** The interleaving approach is O(1) space, which impresses interviewers. But it's tricky — practice the separation step.
- **Follow-up:** "Clone a graph" — BFS + HashMap is the standard approach.

---

## LRU Cache

### What is this approach?

**Intuition:** A shelf that holds your most recently used books. It has limited space. When you pick up a book (access it), it moves to the front. When the shelf is full and you add a new book, the book you haven't touched in the longest time (the one at the back) gets removed.

**Formal:** Implement a cache with O(1) `get` and O(1) `put` operations, where the least recently used item is evicted when capacity is exceeded. Requires a combination of a doubly linked list (for ordering) and a HashMap (for O(1) lookup).

### When should I use this?

- "Design an LRU Cache"
- Problems involving eviction policies
- Keywords: "LRU," "cache," "most recent," "eviction"

### When should I NOT use this?

- A different eviction policy is needed (LFU → freq-based)
- You don't need O(1) operations (a simpler structure suffices)

### Core Idea

**Data Structure:** Doubly Linked List + HashMap

1. **Doubly Linked List:** Maintains elements in order of recency. Most recent at head, least recent at tail.
   - Adding a node: O(1) — insert at head
   - Removing a node: O(1) — unlink predecessor and successor
   - Moving to front: Remove from current position, insert at head

2. **HashMap:** Maps key → node in the doubly linked list. Provides O(1) access to any node.

**Operations:**
- **get(key):** Look up in HashMap. If found, move node to head (most recent). Return value.
- **put(key, value):** If key exists, update value and move to head. If not, create new node at head and add to map. If capacity exceeded, remove the tail node and delete from map.

### Complexity

- **Time:** O(1) for both get and put
- **Space:** O(capacity)

### Variants

- **LRU Cache (standard):** As described
- **LFU Cache (Least Frequently Used):** More complex. Three data structures: HashMap for key→node, HashMap for freq→doubly linked list, frequency tracking. Evict least frequent; break ties with LRU.
- **TTL Cache:** Add expiration time to each entry. Requires periodic cleanup or lazy expiration on access.

### Related Patterns

- [Hashing](05-HASHING-AND-SETS.md) (the lookup component)
- [Design Patterns](19-DESIGN-PATTERNS-AND-META.md) (system design context)

### Interview Insights

- **Trap:** Forgetting to use a DOUBLY linked list. Singly linked lists don't support O(1) removal of a node (you need the predecessor).
- **Trap:** Not maintaining head/tail sentinel nodes. Sentinels simplify edge cases (empty list, single element).
- **Twist:** "Design LFU Cache" — Much harder. Requires tracking frequency AND recency.
- **Follow-up:** "Make it thread-safe" — Discuss locks, concurrent data structures, or lock-free approaches.
- **Key insight:** This is the #1 linked list interview question at FAANG companies. Practice it until you can implement it with zero hesitation.

---

## Reorder / Rearrange Patterns

### What is this approach?

**Intuition:** Shuffling a linked list into a specific pattern. Often involves finding the middle, reversing a part, and interleaving.

**Formal:** Rearranging nodes in a linked list to satisfy a specific ordering constraint, typically using a combination of other linked list operations.

### When should I use this?

- "Reorder list" (L₁→L_n→L₂→L_{n-1}→...)
- "Odd-even linked list" (all odd-positioned, then even-positioned)
- "Partition list" (all nodes < x before all nodes ≥ x)

### When should I NOT use this?

- An array would be simpler (convert list to array, rearrange, convert back — valid if O(n) space is acceptable)

### Core Idea

**Reorder List (zigzag):**
1. Find middle (fast/slow pointer)
2. Reverse second half
3. Merge alternately: take one from first half, one from reversed second half

**Odd-Even Linked List:**
1. Maintain two sublists: odd-indexed and even-indexed nodes
2. Walk through, linking odd→odd and even→even
3. Attach even list to the end of odd list

**Partition List:**
1. Maintain two sublists: "less than x" and "greater or equal to x"
2. Walk through each node, attach to appropriate sublist
3. Connect the two sublists

### Complexity

- **Time:** O(n) for all variants
- **Space:** O(1) — in-place pointer manipulation

### Interview Insights

- **Trap:** In "Reorder List," forgetting to cut the first half from the second half after finding the middle. You need to set the middle node's .next to null.
- **Twist:** "Partition List" must maintain relative order — don't just swap.

---

## Linked List as Recursive Structure

### What is this approach?

**Intuition:** A linked list IS a recursive structure: it's either empty, or a node followed by a linked list. Many linked list operations have elegant recursive solutions.

**Formal:** Treat head → rest_of_list, where rest_of_list is a smaller linked list. Apply recursive problem decomposition.

### When should I use this?

- Reversal (recursive), merge (recursive), palindrome check (recursive with twin pointer)
- When the iterative solution is complex and recursion is cleaner

### When should I NOT use this?

- The list is very long (recursion depth → stack overflow)
- You need O(1) space — recursion uses O(n) stack space
- The iterative solution is simpler

### Core Idea

**Pattern:** Solve for the rest of the list first, then handle the current node.

- **Recursive Reverse:** Trust that `reverse(head.next)` reverses the tail. Then make head.next's next point back to head. Set head.next = null.
- **Recursive Merge:** Compare heads. Smaller one's .next = merge(smaller.next, other). Return smaller.

### Complexity

- **Time:** O(n)
- **Space:** O(n) — recursion stack

### Interview Insights

- **Trap:** Stack overflow on very long lists. Always mention this limitation.
- **Note:** Iterative solutions are generally preferred in production and interviews for linked lists (due to O(1) space), but recursive solutions demonstrate understanding.

---

*Next: [07-STACKS-AND-QUEUES.md](07-STACKS-AND-QUEUES.md) — Monotonic structures and the art of maintaining order.*
