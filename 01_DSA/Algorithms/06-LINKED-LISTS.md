# Linked Lists — 1-Hour Learning Module

> "In arrays, positions are addresses. In linked lists, relationships are addresses. Master the pointer, and you master the list."

---

## Table of Contents

- [[0–10 min] Big Picture](#010-min-big-picture)
- [[10–20 min] Mental Model](#1020-min-mental-model)
- [[20–35 min] Core Patterns](#2035-min-core-patterns)
- [[35–45 min] Concrete Code + Dry Run](#3545-min-concrete-code--dry-run)
- [[45–55 min] Pattern Recognition](#4555-min-pattern-recognition)
- [[55–60 min] Final Mental Checklist](#5560-min-final-mental-checklist)
- [Active Recall](#active-recall)
- [Recommended Practice Direction](#recommended-practice-direction)
- [2-Minute Cheat Sheet](#2-minute-cheat-sheet)

---

## [0–10 min] Big Picture

### What is a Linked List?

An array stores elements in a contiguous block of memory. To find element 5, you jump to index 5 — instant. But inserting in the middle means shifting everything after it — expensive.

A linked list flips this trade-off. Elements live anywhere in memory. Each element (a "node") holds its value AND a pointer to where the next element lives. There's no shifting on insert — you just redirect a pointer. But there's no jumping to index 5 — you have to walk from the start.

**The core trade-off:**
- Array: O(1) random access, O(n) insertion/deletion in the middle
- Linked List: O(n) access, O(1) insertion/deletion when you already have the node

### Real-World Analogy

Think of a linked list as a **scavenger hunt**. The first clue tells you where to find the second clue. The second tells you where to find the third. There's no map with all locations — you follow the chain. If you lose a clue, you lose every clue after it.

This is exactly why pointer manipulation in linked lists is dangerous: lose a reference, and you've lost everything after it.

### One Tiny Example

```
Value:   1  →  2  →  3  →  null
         ^
        head
```

Each box is a node: it holds a value and an arrow (pointer) to the next node. The last node points to `null` — the end of the list. `head` is just a variable holding the address of the first node.

### Why Do Linked Lists Appear in Interviews?

Three reasons:
1. **Pointer manipulation** tests whether you can reason about references without visual help
2. **In-place operations** test whether you can transform structures without extra memory
3. **Combined patterns** (fast/slow pointer, reversal, merge) test algorithmic thinking

---

## [10–20 min] Mental Model

### What Is Actually Happening?

A node is a tiny object with two fields:

```
+-------+------+
| value | next |----> (next node)
+-------+------+
```

In Java: `class ListNode { int val; ListNode next; }`
In JavaScript: `{ val: 1, next: null }`

The entire list is just nodes chained together through their `next` pointers:

```
head
 |
 v
+---+----+    +---+----+    +---+------+
| 1 | *--+--->| 2 | *--+--->| 3 | null |
+---+----+    +---+----+    +---+------+
```

### Key Observation: Pointers Are Just Variables

When you write `curr = curr.next`, you're not moving a node. You're changing which node the variable `curr` points at. The nodes themselves never move.

When you write `curr.next = prev`, you're changing the arrow that comes out of that node. This is how reversal works — you redirect arrows.

### The Three Tricks You Need

**Trick 1: The Dummy Node**

Edge cases explode when the head itself might change (e.g., after reversal, or when inserting before the first node). The fix: create a fake "dummy" node before the real head.

```
dummy ---> [1] ---> [2] ---> [3] ---> null
  ^
  |
  You start here. dummy.next is always your real answer.
```

Why it works: now every node has a predecessor, so your code handles all nodes uniformly. You never need special cases for "is this the head?"

**Trick 2: Save Before You Redirect**

```
curr.next = prev   // You just lost access to everything after curr!
```

Always save `next_temp = curr.next` BEFORE redirecting `curr.next`. This is the #1 cause of bugs in linked list problems.

**Trick 3: The Fast/Slow Pointer**

Two pointers on the same list, moving at different speeds. Fast moves 2 steps, slow moves 1. This creates a relationship: when fast reaches the end, slow is at the middle. If there's a cycle, fast eventually laps slow and they meet.

```
Start:
slow          fast
 |             |
[1]-->[2]-->[3]-->[4]-->[5]-->null

After 2 steps:
          slow          fast
           |             |
[1]-->[2]-->[3]-->[4]-->[5]-->null
                   ^ slow is at middle (index 2 of 5)
```

### What Information Do We Maintain and Why?

In almost every linked list problem, you track:
- `curr` or `node`: your current position while walking
- `prev`: the node before current (needed for reversal, deletion)
- `next_temp`: saved reference to the next node before you redirect
- `dummy` (when head might change): a stable entry point

The reason: since nodes only point forward, if you lose a reference, it's gone. Every variable you maintain is a "rescue line" to some part of the list.

---

## [20–35 min] Core Patterns

### Pattern 1: Fast/Slow Pointer (Floyd's Tortoise and Hare)

**When to use:** Cycle detection, finding the middle, Kth from end, palindrome check.
**When NOT to use:** When you need random access or the structure isn't a singly linked list.

**How to recognize it:** The problem involves a position relationship within the list (middle, cycle, distance from end). You can't use indices.

#### Sub-pattern A: Cycle Detection

**Brute force:** Track every visited node in a HashSet. If you see it again, there's a cycle. O(n) time, O(n) space.

**Key observation:** If you're on a circular track and one runner is faster, the faster runner will eventually lap the slower one. They will meet — guaranteed.

**Optimization:** Two pointers, no extra space.

```
slow = head, fast = head
loop:
  slow = slow.next        (1 step)
  fast = fast.next.next   (2 steps)
  if slow == fast: cycle exists
  if fast or fast.next is null: no cycle
```

**Why it terminates:** In a cycle of length C, once both pointers enter the cycle, the gap between them decreases by 1 each step. After at most C steps, gap = 0 and they meet. Total steps: O(n).

#### Sub-pattern B: Finding the Cycle Start

After detection (slow == fast inside the cycle), do this:
1. Reset one pointer to `head`
2. Move both pointers at speed 1
3. Where they meet = cycle start

**Why this works (derive, don't memorize):**

Let:
- `a` = distance from head to cycle start
- `b` = distance from cycle start to meeting point
- `c` = distance from meeting point back to cycle start (remaining cycle length)

When they met: slow traveled `a + b`, fast traveled `a + b + c + b` = `a + 2b + c`.
Since fast is 2x speed: `2(a + b) = a + 2b + c`
Simplify: `a = c`

The distance from head to cycle start (`a`) equals the distance from the meeting point back to cycle start (`c`). So two pointers at speed 1 from head and meeting point respectively arrive at cycle start at the same time.

#### Sub-pattern C: Finding the Middle

```
slow = head, fast = head
while fast != null AND fast.next != null:
    slow = slow.next
    fast = fast.next.next
return slow  // slow is at the middle
```

For odd length (5 nodes): slow lands at index 2 (0-based) — exact middle.
For even length (4 nodes): slow lands at index 2 — the SECOND of the two middle nodes.

**Important:** If you want slow at the FIRST middle (e.g., for palindrome check where you want to split before the middle), change the condition to `fast.next != null AND fast.next.next != null`.

---

### Pattern 2: In-Place Reversal

**When to use:** "Reverse a linked list," "reverse nodes in K-group," "palindrome list."
**When NOT to use:** When you can use a stack (simpler but O(n) space), or traversal in reverse (use recursion/stack).

**How to recognize it:** The word "reverse" appears, or the output requires nodes in opposite order, or you need to compare two halves of a list.

**Brute force:** Copy all values to an array, reverse the array, rebuild the list. O(n) space.

**Key observation:** Reversing just means flipping all the arrows. You can do this in one pass if you carry one extra variable (`prev`).

**Iterative Reversal (derive it):**

Stand at node `curr`. You want `curr` to point backward. But to point backward, you need to know what's behind you (that's `prev`). And before you redirect, you need to save what's ahead (that's `next_temp`). That's it — three variables.

```
prev = null
curr = head

while curr != null:
    next_temp = curr.next    // save what's ahead
    curr.next = prev         // flip the arrow
    prev = curr              // prev advances
    curr = next_temp         // curr advances

return prev                  // prev is now the new head
```

**ASCII before/after:**

Before:
```
null <-- prev    curr --> [2] --> [3] --> null
          |
         [1]
```

After one step:
```
null <-- [1] <-- prev    curr --> [3] --> null
                           |
                          [2]
```

**Variant: Reverse Between Positions m and n**

1. Walk to node at position `m-1`. Save it as `connection` (the node just before the reversed segment).
2. The node at position `m` becomes the tail of the reversed segment. Save it as `tail`.
3. Reverse nodes m through n using the standard iterative reversal.
4. Reconnect: `connection.next = new_head_of_reversed`, `tail.next = node_after_n`.

**Variant: Reverse in K-Groups**

Reverse every K consecutive nodes. If fewer than K remain, leave them as-is.
1. Count K nodes. If fewer than K remain, return head unchanged.
2. Reverse K nodes using standard reversal. The original head of these K nodes becomes the tail.
3. Recursively process the rest: `original_head.next = reverseKGroup(node_after_K, k)`.

---

### Pattern 3: Merge Sorted Lists

**When to use:** "Merge two sorted lists," "merge K sorted lists," "sort a linked list."
**When NOT to use:** Lists are unsorted (sort first), or output doesn't need to be sorted.

**How to recognize it:** Multiple sorted sources, need one sorted output.

**Merge Two Sorted Lists:**

Brute force: collect all values, sort them, rebuild. O(n log n) time, O(n) space.

Key observation: both lists are already sorted. You only need to compare the two front nodes and take the smaller one. This is one linear pass.

```
Use a dummy node.
curr = dummy
while both lists have nodes:
    if list1.val <= list2.val:
        curr.next = list1
        list1 = list1.next
    else:
        curr.next = list2
        list2 = list2.next
    curr = curr.next
attach the non-empty remainder
return dummy.next
```

**Merge K Sorted Lists:**

Naive: merge list1 + list2 = result, result + list3 = new result, etc. Lists in the front get merged repeatedly. If K lists of length n/K each, total work is O(K × N) — bad.

Key observation: at any moment, you only need the smallest of the K current front nodes. A min-heap gives you that in O(log K).

**Approach 1 — Min-Heap:**
- Push all K list heads into a min-heap
- Pop the minimum, add to result, push that node's `next` into the heap
- Time: O(N log K), Space: O(K)

**Approach 2 — Divide and Conquer:**
- Pair up the K lists. Merge each pair. Repeat with half as many lists.
- log(K) rounds, each round processes all N nodes total.
- Time: O(N log K), Space: O(log K) for recursion

---

### Pattern 4: Two-Pointer for Intersection

**When to use:** "Find where two linked lists intersect (share a node)."
**When NOT to use:** You're looking for nodes with the same value (use a HashSet — that's a different problem).

**Key observation:** If two lists share a suffix, both lists viewed as "A path then shared path" have the same total length if you switch lists at the end. Pointer A travels list1 then list2; pointer B travels list2 then list1. They cover the same total distance and meet at the intersection.

```
A: [a1,a2,...,intersection,...,end] then [b1,b2,...,intersection]
B: [b1,b2,...,intersection,...,end] then [a1,a2,...,intersection]
```

Both arrive at `intersection` at the same step.

---

### Pattern 5: LRU Cache — Doubly Linked List + HashMap

**When to use:** "Design an LRU Cache."
**When NOT to use:** A different eviction policy is needed (LFU requires a more complex structure).

**The problem:** You need O(1) get and O(1) put with eviction of the least recently used item.

**Why a doubly linked list?**

You need to:
1. Move any arbitrary node to the front in O(1) — requires knowing the predecessor and successor
2. Remove the last node in O(1)

A singly linked list can't remove an arbitrary node in O(1) — you'd need to scan for the predecessor. A doubly linked list can: `node.prev.next = node.next`, `node.next.prev = node.prev`.

**Why a HashMap?**

O(1) lookup: given a key, instantly find the node in the list (without scanning).

**Data structure:**
```
HashMap: key --> node

Doubly Linked List:
[dummy_head] <--> [most_recent] <--> ... <--> [least_recent] <--> [dummy_tail]
```

Use two sentinel nodes (dummy head and dummy tail) so you never have to handle empty list edge cases.

**get(key):**
1. If key not in map: return -1
2. Move the node to the front (most recently used)
3. Return the value

**put(key, value):**
1. If key exists: update value, move to front
2. If key doesn't exist: create a new node, insert at front, add to map
3. If size exceeds capacity: remove the node just before dummy_tail, remove its key from the map

---

### Pattern 6: Reorder / Rearrange

**Reorder List** (L1 → Ln → L2 → Ln-1 → ...):
1. Find middle with fast/slow pointer
2. Cut the list: set middle.next = null
3. Reverse the second half
4. Interleave: take one node from each half alternately

**Odd-Even Linked List** (all odd-indexed nodes, then even-indexed):
1. Maintain two pointers: `odd` and `even`
2. `odd.next = even.next`, advance odd
3. `even.next = odd.next`, advance even
4. Connect: `odd.next = even_head`

**Partition List** (nodes < x before nodes >= x, preserving relative order):
1. Create two dummy-headed sublists: `less` and `greater_or_equal`
2. Walk through each node, attach to appropriate sublist
3. Connect: `less_tail.next = greater_head.next`, `greater_tail.next = null`

---

### Advanced Awareness (don't deep-dive now)

- **Copy List with Random Pointer:** Each node has a `next` and a `random` pointer. Deep copy using either a HashMap (original → copy) or the interleaving trick (insert copies between originals, set random pointers, separate the two lists). O(n) time; interleaving is O(1) extra space.
- **Clone Graph:** Same concept as copy with random pointer, generalized to any graph. BFS + HashMap.
- **LFU Cache:** Like LRU but evicts the least frequently used. Requires a HashMap from frequency to its own doubly linked list. Significantly more complex.
- **Find Duplicate Number (array [1..n]):** Treat array values as next-pointers. The implicit linked list has a cycle whose start is the duplicate. Apply Floyd's algorithm.
- **Happy Number:** The sequence of digit-square sums either reaches 1 or cycles. Apply fast/slow on the sequence.

---

## [35–45 min] Concrete Code + Dry Run

### Code 1: Cycle Detection + Cycle Start (Floyd's Algorithm)

**Problem:** Given a linked list, detect if it has a cycle. If yes, return the node where the cycle starts.

**Input:** 1 → 2 → 3 → 4 → 5 → (points back to node 3)
**Expected output:** Node with value 3

**Java:**
```java
public ListNode detectCycle(ListNode head) {
    ListNode slow = head;
    ListNode fast = head;

    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {
            ListNode finder = head;
            while (finder != slow) {
                finder = finder.next;
                slow = slow.next;
            }
            return finder;
        }
    }
    return null;
}
```

**JavaScript:**
```javascript
function detectCycle(head) {
    let slow = head;
    let fast = head;

    while (fast !== null && fast.next !== null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) {
            let finder = head;
            while (finder !== slow) {
                finder = finder.next;
                slow = slow.next;
            }
            return finder;
        }
    }
    return null;
}
```

**Dry Run:**

List: 1 → 2 → 3 → 4 → 5 → (back to 3)

| Step | slow | fast | slow==fast? |
|------|------|------|-------------|
| init | 1    | 1    | no          |
| 1    | 2    | 3    | no          |
| 2    | 3    | 5    | no          |
| 3    | 4    | 4    | YES — meet at node 4 |

Now reset finder=head (node 1), slow stays at node 4:

| Step | finder | slow |
|------|--------|------|
| init | 1      | 4    |
| 1    | 2      | 5    |
| 2    | 3      | 3    | ← MEET — cycle start is node 3 |

**Complexity:** O(n) time, O(1) space.

---

### Code 2: Iterative Linked List Reversal

**Problem:** Reverse a singly linked list.

**Input:** 1 → 2 → 3 → 4 → 5 → null
**Expected output:** 5 → 4 → 3 → 2 → 1 → null

**Java:**
```java
public ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;

    while (curr != null) {
        ListNode nextTemp = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextTemp;
    }
    return prev;
}
```

**JavaScript:**
```javascript
function reverseList(head) {
    let prev = null;
    let curr = head;

    while (curr !== null) {
        const nextTemp = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextTemp;
    }
    return prev;
}
```

**Dry Run:**

| Step | prev | curr | nextTemp | Action |
|------|------|------|----------|--------|
| init | null | 1    | —        | —      |
| 1    | null | 1    | 2        | 1.next = null |
|      | 1    | 2    | —        | advance |
| 2    | 1    | 2    | 3        | 2.next = 1 |
|      | 2    | 3    | —        | advance |
| 3    | 2    | 3    | 4        | 3.next = 2 |
|      | 3    | 4    | —        | advance |
| 4    | 3    | 4    | 5        | 4.next = 3 |
|      | 4    | 5    | —        | advance |
| 5    | 4    | 5    | null     | 5.next = 4 |
|      | 5    | null | —        | curr==null, stop |

Return `prev` = node 5. Result: 5 → 4 → 3 → 2 → 1 → null

**Complexity:** O(n) time, O(1) space.

---

### Code 3: Merge Two Sorted Lists

**Problem:** Merge two sorted linked lists into one sorted list.

**Input:** L1: 1 → 3 → 5, L2: 2 → 4 → 6
**Expected output:** 1 → 2 → 3 → 4 → 5 → 6

**Java:**
```java
public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
    ListNode dummy = new ListNode(0);
    ListNode curr = dummy;

    while (list1 != null && list2 != null) {
        if (list1.val <= list2.val) {
            curr.next = list1;
            list1 = list1.next;
        } else {
            curr.next = list2;
            list2 = list2.next;
        }
        curr = curr.next;
    }
    curr.next = (list1 != null) ? list1 : list2;
    return dummy.next;
}
```

**JavaScript:**
```javascript
function mergeTwoLists(list1, list2) {
    const dummy = { val: 0, next: null };
    let curr = dummy;

    while (list1 !== null && list2 !== null) {
        if (list1.val <= list2.val) {
            curr.next = list1;
            list1 = list1.next;
        } else {
            curr.next = list2;
            list2 = list2.next;
        }
        curr = curr.next;
    }
    curr.next = list1 !== null ? list1 : list2;
    return dummy.next;
}
```

**Dry Run:**

L1: 1 → 3 → 5 | L2: 2 → 4 → 6

| Step | L1 head | L2 head | Chosen | Result so far |
|------|---------|---------|--------|----------------|
| 1    | 1       | 2       | 1      | dummy → 1 |
| 2    | 3       | 2       | 2      | dummy → 1 → 2 |
| 3    | 3       | 4       | 3      | dummy → 1 → 2 → 3 |
| 4    | 5       | 4       | 4      | ... → 3 → 4 |
| 5    | 5       | 6       | 5      | ... → 4 → 5 |
| 6    | null    | 6       | attach L2 remainder | ... → 5 → 6 |

Return `dummy.next` = node 1. Result: 1 → 2 → 3 → 4 → 5 → 6

**Complexity:** O(n + m) time, O(1) space.

---

### Code 4: LRU Cache

**Problem:** Design a data structure with O(1) get and put, evicting the least recently used element when capacity is exceeded.

**Java:**
```java
class LRUCache {
    private final int capacity;
    private final Map<Integer, Node> map;
    private final Node head;
    private final Node tail;

    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        this.head = new Node(0, 0);
        this.tail = new Node(0, 0);
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        Node node = map.get(key);
        moveToFront(node);
        return node.val;
    }

    public void put(int key, int value) {
        if (map.containsKey(key)) {
            Node node = map.get(key);
            node.val = value;
            moveToFront(node);
        } else {
            Node node = new Node(key, value);
            map.put(key, node);
            insertAtFront(node);
            if (map.size() > capacity) {
                Node lru = tail.prev;
                remove(lru);
                map.remove(lru.key);
            }
        }
    }

    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void insertAtFront(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }

    private void moveToFront(Node node) {
        remove(node);
        insertAtFront(node);
    }

    class Node {
        int key, val;
        Node prev, next;
        Node(int key, int val) { this.key = key; this.val = val; }
    }
}
```

**JavaScript:**
```javascript
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.map = new Map();
        this.head = { key: 0, val: 0, prev: null, next: null };
        this.tail = { key: 0, val: 0, prev: null, next: null };
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    get(key) {
        if (!this.map.has(key)) return -1;
        const node = this.map.get(key);
        this.moveToFront(node);
        return node.val;
    }

    put(key, value) {
        if (this.map.has(key)) {
            const node = this.map.get(key);
            node.val = value;
            this.moveToFront(node);
        } else {
            const node = { key, val: value, prev: null, next: null };
            this.map.set(key, node);
            this.insertAtFront(node);
            if (this.map.size > this.capacity) {
                const lru = this.tail.prev;
                this.remove(lru);
                this.map.delete(lru.key);
            }
        }
    }

    remove(node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    insertAtFront(node) {
        node.next = this.head.next;
        node.prev = this.head;
        this.head.next.prev = node;
        this.head.next = node;
    }

    moveToFront(node) {
        this.remove(node);
        this.insertAtFront(node);
    }
}
```

**Complexity:** O(1) for get and put. O(capacity) space.

---

## [45–55 min] Pattern Recognition

### Structural Clues — What to Ask Yourself

When you see a linked list problem, run through this decision tree:

**1. Does the problem involve position relationships (middle, Kth from end, cycle)?**
- Yes → Fast/Slow Pointer

**2. Does the problem require nodes in reverse or backward comparisons?**
- Yes → In-Place Reversal (possibly combined with fast/slow to find middle)

**3. Are multiple sorted lists being combined?**
- 2 lists → Merge Two Sorted Lists (dummy node + pointer walk)
- K lists → Merge K Sorted Lists (min-heap or divide-and-conquer)

**4. Does the problem ask about where two lists "meet" or "share nodes"?**
- Yes → Intersection (two-pointer with list switching)
- Careful: "same value" is different from "same node"

**5. Does the problem involve O(1) access + ordering/eviction?**
- Yes → LRU Cache (doubly linked list + HashMap)

**6. Does the problem require rearranging nodes into a specific pattern?**
- Yes → Reorder pattern (find middle, reverse half, interleave)

### Distinguishing Similar Patterns

**Fast/Slow vs. Two Pointers on Arrays:**
- Fast/Slow is for linked lists because you can't do index arithmetic — you follow pointers
- Two pointers on arrays uses index arithmetic (i++, j--) — same concept, different mechanics

**Reversal vs. Stack:**
- Both achieve "backward traversal"
- Reversal: O(1) space, modifies the list in place
- Stack: O(n) space, doesn't modify the original list
- Use reversal when the problem says "in-place" or asks for O(1) space

**Reversal vs. Recursion:**
- Both can reverse a list
- Recursive reversal: elegant, O(n) stack space
- Iterative reversal: O(1) space, preferred in production
- In interviews, iterative demonstrates stronger pointer-manipulation skills

**LRU vs. LFU:**
- LRU evicts the element that was accessed least recently (time-based)
- LFU evicts the element accessed least frequently (count-based); ties broken by recency
- LFU is significantly more complex: needs a frequency map AND per-frequency doubly linked lists

**Cycle Start vs. Intersection:**
- Both use the math trick where two pointers travel equal total distances
- Cycle start: one pointer resets to head after meeting
- Intersection: pointers switch to the other list's head when they reach null
- The unifying idea: equalize total travel distance, then one convergence point

### Common Traps

1. **Modifying `curr.next` without saving `curr.next` first** — lose the rest of the list
2. **Off-by-one in fast/slow for "find middle"** — even-length lists: which of the two middle nodes do you want?
3. **Not cutting the list after finding the middle** — in Reorder List, you must set `mid.next = null` to separate the two halves
4. **Using singly linked list for LRU** — O(n) node removal; you need doubly linked
5. **Reconnecting the reversed segment incorrectly** — in "Reverse Between m and n," save BOTH `connection` (node before m) and `tail` (node at position m, which becomes the tail after reversal)
6. **Treating "same value" as "same node"** in intersection problems
7. **Naive sequential merge** of K lists — O(K × N), not O(N log K)

---

## [55–60 min] Final Mental Checklist

```
WHAT IS IT?
  A sequence of nodes where each node holds a value and a pointer to the next node.
  No contiguous memory, no random access.

WHEN DO I USE IT?
  - Cycle detection / finding cycle start → Fast/Slow Pointer
  - Finding middle, Kth from end → Fast/Slow Pointer
  - Reversing all or part of a list → In-Place Reversal
  - Merging sorted lists → Dummy node + pointer walk; or heap for K lists
  - Finding where two lists physically share a node → Two-pointer with list switching
  - O(1) cache with eviction → Doubly Linked List + HashMap (LRU Cache)
  - Rearranging into zigzag/partition patterns → Reorder pattern

WHEN DO I NOT USE IT?
  - When you need O(1) random access (use array)
  - When modifying structure is too risky and O(n) space is fine (use array copy)
  - When recursion depth might overflow (prefer iterative)

WHAT IS THE CORE IDEA?
  Everything is pointer redirection. You never move nodes — you change which node
  a pointer variable or a node's .next field points to.

WHAT DO I TRACK?
  curr (position), prev (node behind curr), nextTemp (saved .next before redirect),
  dummy (stable entry point when head may change), fast + slow (for two-speed traversal)

WHAT IS THE INVARIANT/STATE?
  - Reversal: prev always points to the already-reversed portion; curr always points to the
    not-yet-reversed portion
  - Fast/Slow: fast is always 2× ahead of slow; if cycle, they WILL meet
  - Merge: curr always points to the tail of the merged result; dummy.next is the head
  - LRU: head sentinel's neighbor is always the most recent; tail sentinel's neighbor is LRU

HOW DO I RECOGNIZE IT?
  - "Cycle" / "loop" → Fast/Slow
  - "Middle" / "Kth from end" → Fast/Slow
  - "Reverse" / "K-group" → In-Place Reversal
  - "Merge sorted" → Dummy node merge
  - "Intersection" / "merge point" → Two-pointer with list switching
  - "LRU" / "cache with eviction" → Doubly Linked List + HashMap

WHAT ARE THE COMMON TRAPS?
  1. Forgetting to save nextTemp before redirecting curr.next
  2. Off-by-one in fast/slow (which "middle" node do you want?)
  3. Not cutting the list in half after finding the middle (Reorder List)
  4. Using singly linked list for LRU Cache (need doubly for O(1) removal)
  5. Reconnecting the reversed segment incorrectly (save connection + tail)
  6. Confusing same-value intersection with same-node intersection
  7. Sequential K-list merge is O(K*N), not O(N log K)

WHAT PATTERNS CAN I CONFUSE IT WITH?
  - Fast/Slow ↔ Two Pointers (same idea, arrays use indices, lists use pointers)
  - Reversal ↔ Stack (stack is simpler but O(n) space)
  - Reversal ↔ Recursion (recursive is O(n) stack space — mention limitation)
  - LRU ↔ LFU (LFU is frequency-based, needs per-frequency lists)
  - Cycle Start ↔ Intersection (both equalize travel distance, different reset logic)

WHAT IS THE COMPLEXITY?
  - Fast/Slow: O(n) time, O(1) space
  - Reversal (iterative): O(n) time, O(1) space
  - Merge Two: O(n + m) time, O(1) space
  - Merge K (heap): O(N log K) time, O(K) space
  - Intersection: O(n + m) time, O(1) space
  - LRU Cache: O(1) time per operation, O(capacity) space
  - Copy with Random Pointer (interleaving): O(n) time, O(1) extra space
```

---

## Active Recall

Test yourself without looking above. Write out answers before checking.

1. In Floyd's cycle detection, why are you guaranteed that fast and slow will meet if there's a cycle? What's the intuition?

2. After detecting a cycle (slow == fast), what exact steps do you take to find the cycle START? Why does this work mathematically?

3. Walk through iterative reversal step-by-step on the list `1 → 2 → 3`. What are the values of `prev`, `curr`, and `nextTemp` at each step?

4. What is the dummy node trick and why does it simplify linked list code?

5. Why does sequential merge of K sorted lists (merge 1+2, then result+3, ...) have O(K × N) complexity instead of O(N log K)?

6. Two linked lists "intersect." A student says: "I found a node in both lists with value 5, so that's the intersection." What's wrong with this reasoning?

7. Why does LRU Cache require a DOUBLY linked list rather than a singly linked list?

8. In "Reorder List" (L1 → Ln → L2 → Ln-1 ...), what are the three sub-steps? What would break if you forgot to cut the list after finding the middle?

9. In "Reverse Between positions m and n," you need to save two nodes before you start reversing. Which two? What happens if you forget either?

10. For "find middle" with fast/slow pointers: you have a 4-node list. Where does slow land? Does it matter whether you want the first or second of the two middle nodes? When does it matter?

---

## Recommended Practice Direction

Work through problems in this order. Each tier builds on the previous.

**Tier 1 — Pointer Fundamentals (do these first)**
- Reverse Linked List (LeetCode 206) — pure reversal, no tricks
- Middle of the Linked List (LeetCode 876) — pure fast/slow
- Merge Two Sorted Lists (LeetCode 21) — dummy node pattern
- Remove Nth Node From End (LeetCode 19) — fast/slow with K-gap

**Tier 2 — Combined Patterns**
- Linked List Cycle (LeetCode 141) — cycle detection
- Linked List Cycle II (LeetCode 142) — cycle start (the math proof)
- Palindrome Linked List (LeetCode 234) — fast/slow + reversal combined
- Intersection of Two Linked Lists (LeetCode 160) — two-pointer switching

**Tier 3 — Complex Single Pattern**
- Reverse Linked List II (LeetCode 92) — reversal between m and n
- Odd Even Linked List (LeetCode 328) — partition-style reorder
- Partition List (LeetCode 86) — two-sublist technique
- Sort List (LeetCode 148) — merge sort on linked list

**Tier 4 — Hard (interview-level)**
- Merge K Sorted Lists (LeetCode 23) — heap or divide-and-conquer
- Reverse Nodes in K-Group (LeetCode 25) — K-group reversal
- Copy List with Random Pointer (LeetCode 138) — deep copy
- LRU Cache (LeetCode 146) — doubly linked list + HashMap
- Reorder List (LeetCode 143) — three-step combination

**For each problem:** Write the code, draw the pointer state after each step, then ask: "What would break if I removed the dummy node / forgot to save nextTemp / forgot to cut the list?"

---

## 2-Minute Cheat Sheet

```
STRUCTURE
  node = { val, next }          // singly linked
  node = { val, next, prev }    // doubly linked (LRU Cache)

KEY VARIABLES
  dummy = new Node(0)           // stable head; return dummy.next
  prev = null                   // behind current (reversal)
  curr = head                   // current position
  nextTemp = curr.next          // SAVE before redirecting curr.next
  slow = fast = head            // two-speed traversal

FAST/SLOW POINTER
  cycle detection:   slow 1-step, fast 2-step; meet = cycle
  cycle start:       reset one to head; move both 1-step; meet = start
  find middle:       when fast hits end, slow is at middle
  Kth from end:      advance fast K steps; then move both; slow is at Kth

IN-PLACE REVERSAL
  prev=null, curr=head
  loop: nextTemp=curr.next → curr.next=prev → prev=curr → curr=nextTemp
  return prev

MERGE TWO SORTED
  dummy → curr
  loop: compare heads, attach smaller, advance that list
  attach remainder
  return dummy.next

MERGE K SORTED
  heap (O(N log K)):  push all heads, pop min, push popped.next
  D&C (O(N log K)):   pair up lists, merge pairs, repeat

INTERSECTION
  A walks L1 then L2; B walks L2 then L1
  they meet at intersection (or both null = no intersection)

LRU CACHE
  HashMap(key → node) + Doubly Linked List (head=most recent, tail=LRU)
  get: move to front, return val
  put: insert at front; if over capacity, remove tail.prev + evict from map

COMPLEXITY SUMMARY
  Fast/Slow:        O(n) time,      O(1) space
  Reversal:         O(n) time,      O(1) space (iterative)
  Merge Two:        O(n+m) time,    O(1) space
  Merge K:          O(N log K),     O(K) heap / O(log K) D&C
  Intersection:     O(n+m) time,    O(1) space
  LRU Cache:        O(1) per op,    O(capacity) space

TOP 3 TRAPS
  1. Not saving nextTemp before curr.next = prev  → list is lost
  2. Using singly linked list for LRU             → O(n) removal
  3. Sequential K-list merge                      → O(K*N) not O(N log K)
```

---

*Next: [07-STACKS-AND-QUEUES.md](07-STACKS-AND-QUEUES.md) — Monotonic structures and the art of maintaining order.*
