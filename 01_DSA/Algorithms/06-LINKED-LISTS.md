# Linked Lists — Google Interview Patterns

> **10 algorithms covered:** Fast/Slow Pointers (Cycle Detection) · Fast/Slow Pointers (Find Cycle Start) · Fast/Slow Pointers (Find Middle) · Remove Nth Node From End · In-Place Reversal (Full) · In-Place Reversal (Partial) · Dummy Node Trick · Merge Two Sorted Lists · LRU Cache · Deep Clone / Copy List with Random Pointer

> Read fast. Understand deeply. Go practice on LeetCode immediately.

---

## Table of Contents
1. [Fast/Slow Pointers — Cycle Detection](#fastslow-pointers--cycle-detection)
2. [Fast/Slow Pointers — Find Cycle Start](#fastslow-pointers--find-cycle-start)
3. [Fast/Slow Pointers — Find Middle of List](#fastslow-pointers--find-middle-of-list)
4. [Fast/Slow Pointers — Remove Nth Node From End](#fastslow-pointers--remove-nth-node-from-end)
5. [In-Place Reversal — Full List](#in-place-reversal--full-list)
6. [In-Place Reversal — Partial (Between Positions m and n)](#in-place-reversal--partial-between-positions-m-and-n)
7. [Dummy Node Trick](#dummy-node-trick)
8. [Merge Two Sorted Lists](#merge-two-sorted-lists)
9. [LRU Cache — Doubly Linked List + HashMap](#lru-cache--doubly-linked-list--hashmap)
10. [Deep Clone / Copy List with Random Pointer](#deep-clone--copy-list-with-random-pointer)

---

## Fast/Slow Pointers — Cycle Detection

### What is it?
Two pointers start at the head of the list. The **slow** pointer moves one node at a time; the **fast** pointer moves two nodes at a time. If the list contains a cycle (a loop where some node's `next` points back to an earlier node), fast will eventually lap slow and they will land on the same node. A **node** is a box holding a value and a `next` pointer to the following node.

### Visual
```
No cycle — fast hits null:
[1|→] → [2|→] → [3|→] → [4|→] → null
 slow
 fast
After 2 steps: fast = null → no cycle

Cycle — fast laps slow:
[1|→] → [2|→] → [3|→] → [4|→]
                  ↑               |
                  └───────────────┘
slow/fast start at 1
Step 1: slow=2, fast=3
Step 2: slow=3, fast=3   ← MEET — cycle detected
```

### How does it work?
1. Start both `slow` and `fast` at `head`.
2. Enter a loop. Before each step, check: if `fast == null` OR `fast.next == null`, there is no cycle — return false.
3. Move `slow` one step: `slow = slow.next`.
4. Move `fast` two steps: `fast = fast.next.next`.
5. Check if `slow == fast` (same node object, not same value). If yes, cycle found — return true.
6. Repeat until false is returned or cycle is confirmed.

### Why does it work?
If a cycle exists, think of two runners on a circular track — the faster one always catches up. Each step, fast gains one position on slow inside the cycle. The gap between them shrinks by 1 every step until it reaches zero and they occupy the same node.

### When to use?
- Problem says "detect a cycle" or "does the list loop?"
- A node's `next` might point backward somewhere.
- Problem asks for a boolean: does a cycle exist?
- Input could be infinite if you just follow `next` naively.

### When NOT to use?
- O(n) space is acceptable and you prefer simpler code (use a HashSet of visited nodes).
- The list is guaranteed cycle-free.

### How to recognize in a new problem?
Ask: "could traversal get stuck in an infinite loop?" Signals: "linked list with a cycle," "return true if cycle," "does the list loop back on itself?"

### Simple Example
Input: `1 → 2 → 3 → 4` with node 4's `next` pointing back to node 2
Expected output: `true`

Trace: slow=1, fast=1. Step 1: slow=2, fast=3. Step 2: slow=3, fast=3. They meet — return true.

### Code
```java
// Java
public boolean hasCycle(ListNode head) {
    ListNode slow = head;
    ListNode fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}
```
```javascript
// JavaScript
function hasCycle(head) {
    let slow = head;
    let fast = head;
    while (fast !== null && fast.next !== null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) return true;
    }
    return false;
}
```

### Dry Run
List: `1 → 2 → 3 → 4`, node 4's next = node 2
```
Start:  slow=1, fast=1
Step 1: slow=2, fast=3   (slow==fast? No)
Step 2: slow=3, fast=3   (slow==fast? YES → return true)
```

### Complexity
```
Time: O(n) — in the worst case, fast travels at most 2 full cycles before meeting slow
Space: O(1) — only two pointer variables, no extra storage
```

### Common Trap
- Check `fast != null` BEFORE `fast.next != null` — if you flip the order, you call `.next` on null and get a NullPointerException.
- `slow == fast` checks if they point to the SAME NODE object, not whether their values are equal. Two different nodes can share the same value.

### Experience Tip
**Experience Tip:** Write the while condition as `fast != null && fast.next != null` — never reverse the order. Muscle-memory this condition; it prevents the most common NullPointerException in cycle problems.

### Do Not Confuse With
**Find Cycle Start (pattern 2):** This pattern only detects whether a cycle exists. Finding WHERE the cycle starts requires a separate second phase after detection.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 141 | Linked List Cycle | Easy | Simplest form — commit this to muscle memory | https://leetcode.com/problems/linked-list-cycle/ |
| 876 | Middle of the Linked List | Easy | Also uses fast/slow — good warm-up | https://leetcode.com/problems/middle-of-the-linked-list/ |
| 234 | Palindrome Linked List | Medium | Fast/slow to find middle, then reversal | https://leetcode.com/problems/palindrome-linked-list/ |
| 143 | Reorder List | Medium | Step 1 is finding the middle with fast/slow | https://leetcode.com/problems/reorder-list/ |
| 287 | Find the Duplicate Number | Medium | Treat array indices as next-pointers — same cycle logic | https://leetcode.com/problems/find-the-duplicate-number/ |

### One-Minute Revision
```
ALGORITHM: Fast/Slow Pointers — Cycle Detection
IN SIMPLE WORDS: Slow moves 1 step, fast moves 2. If they ever meet, there's a cycle.
USE WHEN: "detect cycle", "is there a loop", list might loop back on itself
DON'T USE WHEN: guaranteed no cycle, or O(n) space HashSet is acceptable
CORE IDEA: In a cycle, fast laps slow — they must collide
TRACK: slow pointer (1 step), fast pointer (2 steps)
TIME: O(n)
SPACE: O(1)
COMMON TRAP: fast != null && fast.next != null — never reverse order; == is reference equality not value equality
EXPERIENCE TIP: Always write the null checks in the exact order above
```

---

## Fast/Slow Pointers — Find Cycle Start

### What is it?
After detecting that a cycle exists (slow == fast inside the cycle), this pattern finds the exact node where the cycle begins. Reset one pointer to `head` and walk both pointers at speed 1 until they meet — that meeting point is the cycle start. This uses a mathematical property: the distance from head to cycle start equals the distance from the detection meeting point back to cycle start.

### Visual
```
List: 1 → 2 → 3 → 4 → 5, node 5's next = node 3 (cycle)

Phase 1 (detect): slow and fast meet at node X inside the cycle.
Phase 2 (locate):
  finder starts at head (node 1)
  slow stays at meeting point X
  Both move 1 step/round → they meet at node 3 (cycle start)

[1] → [2] → [3] → [4] → [5]
                ↑              |
                └──────────────┘
finder→1            slow→X
After 2 steps: finder=3, slow=3   ← cycle start = node 3
```

### How does it work?
1. Run phase 1 (cycle detection). When `slow == fast`, you are inside the cycle.
2. Create a new pointer `finder` at `head`. Keep `slow` where it is (do NOT reset slow).
3. Move both `finder` and `slow` one step at a time.
4. The first node where `finder == slow` is the cycle start.
5. Return that node.

### Why does it work?
Let `a` = distance from head to cycle start. Let `b` = distance from cycle start to the detection meeting point. The remaining cycle length back to cycle start is `c`. When they met in phase 1: slow traveled `a + b`, fast traveled `a + 2b + c`. Since fast = 2× slow: `2(a+b) = a + 2b + c`, which simplifies to `a = c`. The distance from head to cycle start equals the distance from the meeting point back to cycle start — so two pointers moving at speed 1 from those two positions arrive at the cycle start simultaneously.

### When to use?
- Problem says "find the node where the cycle begins."
- Problem says "return the start of the loop."
- You've already confirmed a cycle exists.
- "Find the duplicate number" (287) — treat array as an implicit linked list with a cycle.

### When NOT to use?
- You only need to detect whether a cycle exists (use simpler pattern 1).
- The list has no cycle.

### How to recognize in a new problem?
If the problem asks "return the node" not just "true/false," you need this two-phase approach. Signal: "where does the cycle begin?" or "return the node where the loop starts."

### Simple Example
Input: `1 → 2 → 3 → 4 → 5` with node 5's `next` = node 3
Expected output: node with value 3

Phase 1: slow and fast meet inside the cycle.
Phase 2: finder moves from 1, slow moves from meeting point — both arrive at node 3 together.

### Code
```java
// Java
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
            return finder; // cycle start
        }
    }
    return null; // no cycle
}
```
```javascript
// JavaScript
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
            return finder; // cycle start
        }
    }
    return null; // no cycle
}
```

### Dry Run
List: `1 → 2 → 3 → 4 → 5`, node 5's next = node 3
```
Phase 1:
Start:  slow=1, fast=1
Step 1: slow=2, fast=3
Step 2: slow=3, fast=5
Step 3: slow=4, fast=4   ← slow==fast, meeting point = node 4

Phase 2:
finder=1, slow=4
Step 1: finder=2, slow=5
Step 2: finder=3, slow=3   ← finder==slow, cycle start = node 3 ✓
```

### Complexity
```
Time: O(n) — detection O(n) + find-start O(n) = O(n) total
Space: O(1) — three pointer variables only
```

### Common Trap
- Do NOT reset `slow` to head in phase 2 — keep it at the meeting point. Only `finder` gets reset to head.
- The meeting point from phase 1 is NOT the cycle start. You cannot return it directly.

### Experience Tip
**Experience Tip:** The math proof is the hardest part to derive under pressure. Memorize the action: "keep slow at meeting point, send finder from head, move both at speed 1, return where they meet." Derive `a = c` on the whiteboard only if asked.

### Do Not Confuse With
**Cycle Detection (pattern 1):** Detection only tells you a cycle exists. This pattern finds where it starts — always requires both phases.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 142 | Linked List Cycle II | Medium | The classic two-phase implementation | https://leetcode.com/problems/linked-list-cycle-ii/ |
| 287 | Find the Duplicate Number | Medium | Index i points to nums[i] — same cycle-start math | https://leetcode.com/problems/find-the-duplicate-number/ |
| 141 | Linked List Cycle | Easy | Phase 1 only — warm up before attempting 142 | https://leetcode.com/problems/linked-list-cycle/ |

### One-Minute Revision
```
ALGORITHM: Fast/Slow Pointers — Find Cycle Start
IN SIMPLE WORDS: After slow==fast inside cycle, send finder from head, keep slow where it is. Move both at speed 1. Where they meet = cycle start.
USE WHEN: "where does the cycle begin", "return cycle start node"
DON'T USE WHEN: only need true/false detection
CORE IDEA: a = c (head-to-start distance equals meetingPoint-to-start distance)
TRACK: slow (stays at meeting point), finder (resets to head)
TIME: O(n)
SPACE: O(1)
COMMON TRAP: Do NOT reset slow to head — only finder resets. Meeting point != cycle start.
EXPERIENCE TIP: Memorize the action; derive the math only if asked
```

---

## Fast/Slow Pointers — Find Middle of List

### What is it?
Move slow one step and fast two steps. Because fast moves twice as fast, when fast reaches the end of the list, slow has only traveled half the distance — landing exactly at the middle. No need to count the length first.

### Visual
```
Odd length (5 nodes):
[1|→] → [2|→] → [3|→] → [4|→] → [5|→] → null
 slow/fast start at 1

Step 1: slow=2, fast=3
Step 2: slow=3, fast=5   (fast.next=null → stop)
         ↑ slow = middle = node 3

Even length (4 nodes):
[1|→] → [2|→] → [3|→] → [4|→] → null
 slow/fast start at 1

Step 1: slow=2, fast=3
Step 2: slow=3, fast=null  (fast=3.next.next=4.next=null → stop)
         ↑ slow = second middle = node 3
```

### How does it work?
1. Start both `slow` and `fast` at `head`.
2. While `fast != null` AND `fast.next != null`: move slow one step, move fast two steps.
3. When the loop ends, `slow` is the middle node.
4. Return `slow`.

### Why does it work?
Fast travels exactly 2× the distance of slow in the same number of steps. When fast has covered the full list length n, slow has covered n/2 — the midpoint. The loop condition stops fast precisely when it would fall off the end.

### When to use?
- "Find the middle node."
- Splitting a list in half (palindrome check, reorder list, merge sort on a list).
- First step of any algorithm that processes two halves separately.

### When NOT to use?
- Empty list or single node — handle as an edge case before calling this.
- You need the FIRST middle node in an even-length list — change the stopping condition (see Common Trap).

### How to recognize in a new problem?
Any problem involving "compare first half with second half," "palindrome," "reorder," or "merge sort on linked list" uses this as a sub-step.

### Simple Example
Input: `1 → 2 → 3 → 4 → 5`
Expected output: node with value 3

fast: 1→3→5 (stops, fast.next=null). slow: 1→2→3. Return slow = node 3.

### Code
```java
// Java
public ListNode findMiddle(ListNode head) {
    ListNode slow = head;
    ListNode fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow; // middle node
}
```
```javascript
// JavaScript
function findMiddle(head) {
    let slow = head;
    let fast = head;
    while (fast !== null && fast.next !== null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow; // middle node
}
```

### Dry Run
```
List: 1 → 2 → 3 → 4 → 5
Start:  slow=1, fast=1
Check:  fast(1)!=null, fast.next(2)!=null → enter
Step 1: slow=2, fast=3
Check:  fast(3)!=null, fast.next(4)!=null → continue
Step 2: slow=3, fast=5
Check:  fast(5)!=null, fast.next=null → STOP
Return: slow = node 3 ✓

List: 1 → 2 → 3 → 4
Start:  slow=1, fast=1
Step 1: slow=2, fast=3
Check:  fast(3)!=null, fast.next(4)!=null → continue
Step 2: slow=3, fast=null  [fast=3.next.next=4.next=null]
Check:  fast==null → STOP
Return: slow = node 3  (second of two middle nodes) ✓
```

### Complexity
```
Time: O(n) — single pass through the list
Space: O(1) — two pointer variables only
```

### Common Trap
- Default condition (`fast != null && fast.next != null`) returns the SECOND middle node on even-length lists. If you need the FIRST middle (e.g., for palindrome where you split before the midpoint), use `while (fast.next != null && fast.next.next != null)` instead.
- Never check `fast.next != null` before `fast != null` — fast could be null, making `fast.next` throw a NullPointerException.

### Experience Tip
**Experience Tip:** Test your stopping condition mentally on a 4-node list before writing code — takes 10 seconds. Palindrome and reorder problems need the FIRST middle; bare middle-finding uses the default condition. Knowing which you need prevents a wrong answer.

### Do Not Confuse With
**Nth From End (pattern 4):** Middle uses 2× speed difference. Nth-from-end uses a fixed N-step head start, not a speed difference. Both are "gap-based" pointer tricks but mechanically different.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 876 | Middle of the Linked List | Easy | Pure middle-finding — simplest form of this pattern | https://leetcode.com/problems/middle-of-the-linked-list/ |
| 234 | Palindrome Linked List | Medium | Find FIRST middle, reverse second half, compare | https://leetcode.com/problems/palindrome-linked-list/ |
| 143 | Reorder List | Medium | Find middle, split, reverse second half, interleave | https://leetcode.com/problems/reorder-list/ |
| 148 | Sort List | Medium | Merge sort splits list at middle repeatedly | https://leetcode.com/problems/sort-list/ |

### One-Minute Revision
```
ALGORITHM: Fast/Slow Pointers — Find Middle
IN SIMPLE WORDS: Slow moves 1, fast moves 2. When fast hits the end, slow is at the middle.
USE WHEN: find middle, split list in half, palindrome, reorder, merge sort on linked list
DON'T USE WHEN: empty or single-node list (handle separately)
CORE IDEA: Fast travels 2x distance → when fast=end, slow=middle
TRACK: slow (1 step/round), fast (2 steps/round)
TIME: O(n)
SPACE: O(1)
COMMON TRAP: Default condition gives SECOND middle on even-length lists. For FIRST middle: while(fast.next!=null && fast.next.next!=null)
EXPERIENCE TIP: Test your stopping condition on a 4-node list mentally before writing code
```

---

## Fast/Slow Pointers — Remove Nth Node From End

### What is it?
Give fast a head start of exactly N steps, then move both slow and fast together one step at a time. When fast reaches the end, slow is exactly N positions behind — pointing at the node just BEFORE the one to remove. A dummy node makes this work even when removing the head.

### Visual
```
List: 1 → 2 → 3 → 4 → 5,  N=2 (remove 2nd from end = node 4)

Setup: dummy → 1 → 2 → 3 → 4 → 5 → null
       slow=dummy, fast=head(1)

Advance fast N=2 steps: fast: 1 → 2 → 3
       slow=dummy, fast=3

Move both until fast==null:
  Step 1: slow=1, fast=4
  Step 2: slow=2, fast=5
  Step 3: slow=3, fast=null  ← STOP

slow=node3, slow.next=node4 (the target)
slow.next = slow.next.next  →  3.next = 5
Result: dummy → 1 → 2 → 3 → 5 → null
```

### How does it work?
1. Create a `dummy` node, set `dummy.next = head`. Set `slow = dummy`, `fast = head`.
2. Advance `fast` exactly N steps forward.
3. Move both `slow` and `fast` one step at a time until `fast == null`.
4. `slow.next` is now the node to remove.
5. Set `slow.next = slow.next.next` to skip over it.
6. Return `dummy.next`.

### Why does it work?
After giving fast an N-step head start, there is a fixed gap of N nodes between fast and slow. When fast falls off the end (fast == null), slow is N steps behind the end — positioned just before the Nth-from-end node. The dummy node ensures slow has a valid predecessor even if the target is the head node itself.

### When to use?
- "Remove the Nth node from the end."
- "Find the Kth node from the end."
- Any problem requiring a specific position counted from the tail of a singly linked list.

### When NOT to use?
- You know the list length — then just remove node at index `(length - N)` by counting from the front (simpler).

### How to recognize in a new problem?
"From the end" or "last K nodes" is the key signal. On a singly linked list you can't look backward, so you need either a two-pass approach or this gap trick.

### Simple Example
Input: `1 → 2 → 3 → 4 → 5`, N = 2
Expected output: `1 → 2 → 3 → 5` (node 4 removed — it's the 2nd from the end)

### Code
```java
// Java
public ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode slow = dummy;
    ListNode fast = head;

    // give fast a head start of n steps
    for (int i = 0; i < n; i++) {
        fast = fast.next;
    }

    // move both until fast falls off the end
    while (fast != null) {
        slow = slow.next;
        fast = fast.next;
    }

    // slow.next is the node to remove
    slow.next = slow.next.next;
    return dummy.next;
}
```
```javascript
// JavaScript
function removeNthFromEnd(head, n) {
    const dummy = { val: 0, next: head };
    let slow = dummy;
    let fast = head;

    // give fast a head start of n steps
    for (let i = 0; i < n; i++) {
        fast = fast.next;
    }

    // move both until fast falls off the end
    while (fast !== null) {
        slow = slow.next;
        fast = fast.next;
    }

    // slow.next is the node to remove
    slow.next = slow.next.next;
    return dummy.next;
}
```

### Dry Run
List: `1 → 2 → 3 → 4 → 5`, N = 2
```
Setup: dummy → 1 → 2 → 3 → 4 → 5 → null
       slow=dummy, fast=1

Advance fast 2 steps: fast: 1 → 2 → 3
       slow=dummy, fast=3

Move both until fast==null:
  Step 1: slow=1,     fast=4
  Step 2: slow=2,     fast=5
  Step 3: slow=3,     fast=null ← STOP

slow = node 3. slow.next = node 4 (target).
slow.next = slow.next.next = node 5.

Result: dummy → 1 → 2 → 3 → 5 → null
Return dummy.next = node 1 ✓
```

### Complexity
```
Time: O(n) — fast gets n extra steps, but total traversal is still one pass
Space: O(1) — only pointer variables, plus one dummy node
```

### Common Trap
- Without a dummy node: if N equals the list length (removing the head), `slow` would be null and `slow.next` throws a NullPointerException. The dummy node eliminates this edge case.
- Use `while (fast != null)` — not `while (fast.next != null)` — when fast starts at `head` (not dummy). Verify on a single-node list.

### Experience Tip
**Experience Tip:** Whenever removing a node, `slow` must stop at the node BEFORE the target (not at the target itself) — because singly linked lists can only skip forward. The dummy node guarantees slow always has one node to land on, even when removing the head.

### Do Not Confuse With
**Find Middle (pattern 3):** Middle uses 2× speed. Nth-from-end uses a fixed N-step head start. Different mechanism, similar two-pointer flavor.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 19 | Remove Nth Node From End of List | Medium | Classic — dummy handles head removal cleanly | https://leetcode.com/problems/remove-nth-node-from-end-of-list/ |
| 876 | Middle of the Linked List | Easy | Simpler fast/slow — good warm-up | https://leetcode.com/problems/middle-of-the-linked-list/ |
| 234 | Palindrome Linked List | Medium | Uses find-middle as a sub-step | https://leetcode.com/problems/palindrome-linked-list/ |

### One-Minute Revision
```
ALGORITHM: Fast/Slow Pointers — Remove Nth From End
IN SIMPLE WORDS: Give fast an N-step head start, then move both together. When fast hits null, slow is just before the target.
USE WHEN: remove Kth from end, find Kth from end
DON'T USE WHEN: list length is known — count from front instead
CORE IDEA: Fixed N-node gap between fast and slow
TRACK: dummy node, slow (starts at dummy), fast (starts at head, gets N-step head start)
TIME: O(n)
SPACE: O(1)
COMMON TRAP: Without dummy, removing the head node requires a special case — always use dummy
EXPERIENCE TIP: slow must stop at the node BEFORE the target, not at the target itself
```

---

## In-Place Reversal — Full List

### What is it?
Walk through the list once, redirecting each node's `next` pointer to point backward instead of forward. No extra array is needed — just three variables. **In-place** means you reuse existing nodes by changing their arrows, not by creating new ones.

### Visual
```
Before reversal:
null ← prev    curr=[1] → [2] → [3] → null

After Step 1 (flip node 1):
null ← [1] ← prev    curr=[2] → [3] → null

After Step 2 (flip node 2):
null ← [1] ← [2] ← prev    curr=[3] → null

After Step 3 (flip node 3):
null ← [1] ← [2] ← [3] ← prev    curr=null ← DONE

Return prev = node 3 (new head)
Final: [3|→] → [2|→] → [1|→] → null
```

### How does it work?
1. Start with `prev = null` and `curr = head`.
2. Save the next node FIRST: `nextTemp = curr.next`.
3. Flip the arrow: `curr.next = prev`.
4. Advance prev: `prev = curr`.
5. Advance curr: `curr = nextTemp`.
6. Repeat steps 2-5 until `curr == null`.
7. Return `prev` — it is now the new head.

### Why does it work?
Each iteration flips exactly one arrow backward. After flipping, that node permanently points the right way. `prev` marks the boundary of the already-reversed portion; it advances one step forward per iteration. When `curr` falls off the end, every arrow is flipped and `prev` is at what was the last node — which is now the new head.

### When to use?
- "Reverse a linked list" (obviously).
- Palindrome check — reverse the second half, compare with first half.
- Reorder list — needs the second half reversed.
- Any problem requiring backward traversal on a singly linked list.

### When NOT to use?
- The list is doubly linked (prev pointers already exist).
- You cannot modify the original list — use a stack to read in reverse (O(n) space).

### How to recognize in a new problem?
"Reverse" is the obvious signal. Less obvious: "compare with reversed half," "zigzag order," or "merge alternating from front and back" — all need reversal internally.

### Simple Example
Input: `1 → 2 → 3 → 4 → 5 → null`
Expected output: `5 → 4 → 3 → 2 → 1 → null`

### Code
```java
// Java
public ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;

    while (curr != null) {
        ListNode nextTemp = curr.next;  // SAVE first — critical
        curr.next = prev;               // flip arrow backward
        prev = curr;                    // advance prev
        curr = nextTemp;                // advance curr
    }
    return prev; // new head
}
```
```javascript
// JavaScript
function reverseList(head) {
    let prev = null;
    let curr = head;

    while (curr !== null) {
        const nextTemp = curr.next;  // SAVE first — critical
        curr.next = prev;            // flip arrow backward
        prev = curr;                 // advance prev
        curr = nextTemp;             // advance curr
    }
    return prev; // new head
}
```

### Dry Run
List: `1 → 2 → 3 → null`
```
Start:  prev=null, curr=1

Step 1: nextTemp=2
        1.next = null      State: null ← [1]   [2] → [3] → null
        prev=1, curr=2

Step 2: nextTemp=3
        2.next = 1         State: null ← [1] ← [2]   [3] → null
        prev=2, curr=3

Step 3: nextTemp=null
        3.next = 2         State: null ← [1] ← [2] ← [3]
        prev=3, curr=null

curr==null → exit. Return prev = node 3.
Result: 3 → 2 → 1 → null ✓
```

### Complexity
```
Time: O(n) — every node visited exactly once
Space: O(1) — three variables (prev, curr, nextTemp), no extra data structures
```

### Common Trap
- The #1 linked list mistake: writing `curr.next = prev` BEFORE `nextTemp = curr.next`. Once you do `curr.next = prev`, the original `curr.next` (the rest of the list) is gone forever — NullPointerException or infinite loop on the next step.
- Always write `nextTemp = curr.next` as the very FIRST line inside the loop body.

### Experience Tip
**Experience Tip:** Memorize the four-line loop body as a mantra: **save, flip, step-prev, step-curr**. Write them in this exact order every single time. If you do, you will never lose the rest of the list.

### Do Not Confuse With
**Partial Reversal (pattern 6):** Full reversal flips the entire list. Partial reversal only flips nodes between positions m and n, leaving both ends connected. The core four-line loop is identical — the difference is in what you reconnect afterward.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 206 | Reverse Linked List | Easy | Pure reversal — commit to muscle memory | https://leetcode.com/problems/reverse-linked-list/ |
| 234 | Palindrome Linked List | Medium | Reverse second half, compare with first half | https://leetcode.com/problems/palindrome-linked-list/ |
| 143 | Reorder List | Medium | Reverse second half, then interleave with first half | https://leetcode.com/problems/reorder-list/ |
| 92 | Reverse Linked List II | Medium | Partial reversal — directly extends this pattern | https://leetcode.com/problems/reverse-linked-list-ii/ |
| 25 | Reverse Nodes in K-Group | Hard | Reverse every K nodes — repeat this loop in chunks | https://leetcode.com/problems/reverse-nodes-in-k-group/ |

### One-Minute Revision
```
ALGORITHM: In-Place Reversal — Full List
IN SIMPLE WORDS: Walk once, flip each arrow to point backward. Three variables: prev, curr, nextTemp.
USE WHEN: reverse list, palindrome check, reorder list, compare halves
DON'T USE WHEN: cannot modify list, or list is doubly linked
CORE IDEA: Flip one arrow per step. prev tracks the already-reversed portion.
TRACK: prev (starts null, becomes new head), curr (walks forward), nextTemp (saves curr.next before flip)
TIME: O(n)
SPACE: O(1)
COMMON TRAP: ALWAYS save nextTemp = curr.next BEFORE curr.next = prev — order is critical
EXPERIENCE TIP: "save, flip, step-prev, step-curr" — write in this order every time
```

---

## In-Place Reversal — Partial (Between Positions m and n)

### What is it?
Reverse only the nodes between positions m and n (1-indexed), leaving the rest of the list untouched and reconnected. You isolate the sublist, reverse it using the same four-line loop, then stitch the reversed segment back to the unchanged ends using two anchor nodes you saved beforehand.

### Visual
```
Input: 1 → 2 → 3 → 4 → 5,  m=2, n=4

Identify anchor nodes BEFORE reversing:
  connection = node just before position m = node 1
  tail       = node at position m = node 2  (becomes tail after reversal)

[1] → [2] → [3] → [4] → [5] → null
 ↑connection  ↑tail         ↑curr after reversal

Reverse nodes 2,3,4 (n-m+1 = 3 nodes):
  Result: prev=4, reversed segment: 4→3→2→null, curr=5

Reconnect:
  connection.next = prev → 1.next = node 4
  tail.next       = curr → 2.next = node 5

Final: [1] → [4] → [3] → [2] → [5] → null ✓
```

### How does it work?
1. Create a `dummy` node before head. Walk `connection` to position `m-1`.
2. Save `tail = connection.next` (the node at position m — it becomes the tail after reversal).
3. Run the standard reversal loop for exactly `n - m + 1` iterations starting at `tail`.
4. After the loop: `prev` = new head of reversed segment, `curr` = node just after position n.
5. Reconnect: `connection.next = prev` and `tail.next = curr`.
6. Return `dummy.next`.

### Why does it work?
The reversal logic is identical to full reversal — limited to exactly `n - m + 1` steps. The node at position m was the "first" in the original segment, so after reversal it is the "last" (the tail). Saving it as `tail` before the loop lets you reconnect it to whatever comes after position n.

### When to use?
- "Reverse a linked list from position m to n."
- "Reverse a sublist."
- K-group reversal uses this as its core sub-step.

### When NOT to use?
- m == 1 and n == list length (use full reversal — simpler).
- Non-contiguous nodes need to be reversed.

### How to recognize in a new problem?
"Reverse between," "reverse a sublist," or "reverse from index X to Y" are the explicit signals. K-group problems apply this in repeated chunks.

### Simple Example
Input: `1 → 2 → 3 → 4 → 5`, m = 2, n = 4
Expected output: `1 → 4 → 3 → 2 → 5`

### Code
```java
// Java
public ListNode reverseBetween(ListNode head, int m, int n) {
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode connection = dummy;

    // walk to node just before position m
    for (int i = 1; i < m; i++) {
        connection = connection.next;
    }

    ListNode tail = connection.next; // node at position m — future tail
    ListNode prev = null;
    ListNode curr = tail;

    // reverse exactly n-m+1 nodes
    for (int i = 0; i <= n - m; i++) {
        ListNode nextTemp = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextTemp;
    }

    // reconnect the reversed segment
    connection.next = prev; // prev = new head of reversed segment
    tail.next = curr;       // curr = node just after position n
    return dummy.next;
}
```
```javascript
// JavaScript
function reverseBetween(head, m, n) {
    const dummy = { val: 0, next: head };
    let connection = dummy;

    // walk to node just before position m
    for (let i = 1; i < m; i++) {
        connection = connection.next;
    }

    const tail = connection.next; // node at position m — future tail
    let prev = null;
    let curr = tail;

    // reverse exactly n-m+1 nodes
    for (let i = 0; i <= n - m; i++) {
        const nextTemp = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextTemp;
    }

    // reconnect the reversed segment
    connection.next = prev; // prev = new head of reversed segment
    tail.next = curr;       // curr = node just after position n
    return dummy.next;
}
```

### Dry Run
List: `1 → 2 → 3 → 4 → 5`, m=2, n=4
```
dummy → 1 → 2 → 3 → 4 → 5 → null

Walk to m-1=1: connection = node 1
tail = connection.next = node 2
prev = null, curr = node 2

Reverse 3 nodes (n-m+1=3):
  Iter 1: nextTemp=3, 2.next=null,  prev=2, curr=3
  Iter 2: nextTemp=4, 3.next=2,     prev=3, curr=4
  Iter 3: nextTemp=5, 4.next=3,     prev=4, curr=5

After loop: prev=4, curr=5, tail still = node 2

Reconnect:
  connection.next = prev → 1.next = node 4
  tail.next = curr       → 2.next = node 5

Result: dummy → 1 → 4 → 3 → 2 → 5 → null
Return dummy.next = node 1 ✓
```

### Complexity
```
Time: O(n) — walk to position m, then reverse n-m+1 nodes
Space: O(1) — only pointer variables
```

### Common Trap
- Forgetting to save `tail` (the node at position m) BEFORE reversing. After reversal, it's buried in the middle of the reversed segment — you can't find it to set `tail.next = curr`.
- Not using a dummy node: when m=1, `connection` would need to be null, and `connection.next = prev` would throw a NullPointerException.

### Experience Tip
**Experience Tip:** Before writing a single line of code, draw the list and draw circles around the `connection` node and the `tail` node. If you can't point to both on paper, your code will be wrong. These two are the "glue" that hold the reconnected list together.

### Do Not Confuse With
**Full Reversal (pattern 5):** Identical inner loop. The only difference is that full reversal doesn't need connection/tail tracking because the entire list is reversed. If m=1 and n=length, they are the same problem.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 92 | Reverse Linked List II | Medium | The classic partial reversal problem | https://leetcode.com/problems/reverse-linked-list-ii/ |
| 25 | Reverse Nodes in K-Group | Hard | Repeat partial reversal every K nodes | https://leetcode.com/problems/reverse-nodes-in-k-group/ |
| 206 | Reverse Linked List | Easy | Master full reversal first, then extend to partial | https://leetcode.com/problems/reverse-linked-list/ |

### One-Minute Revision
```
ALGORITHM: In-Place Reversal — Partial (m to n)
IN SIMPLE WORDS: Walk to m-1, save connection and tail, reverse n-m+1 nodes, reconnect.
USE WHEN: "reverse between", "reverse sublist", K-group reversal
DON'T USE WHEN: m=1 and n=length (use full reversal), non-contiguous nodes
CORE IDEA: Same reversal loop, reconnect via connection (node before m) and tail (node at m)
TRACK: dummy, connection (node before m), tail (node at m = future tail), prev, curr, nextTemp
TIME: O(n)
SPACE: O(1)
COMMON TRAP: Save tail BEFORE reversing. Without dummy, m=1 breaks. Draw connection and tail first.
EXPERIENCE TIP: Circle connection and tail on your diagram before writing any code
```

---

## Dummy Node Trick

### What is it?
A dummy node is a fake, valueless node you prepend before the real `head`. Its only job: give every real node a **predecessor** (the node whose `next` points to it). The head node normally has no predecessor, which forces special-case code. The dummy node eliminates that special case — your loop handles every real node uniformly.

### Visual
```
Without dummy — head removal is a special case:
head → [2] → [3] → null
To delete node 2 (head): head = head.next  ← needs an if-check for "is this the head?"

With dummy — head removal is just another case:
dummy → [2] → [3] → null
  ↑ stable, never removed
To delete node 2: dummy.next = dummy.next.next  ← same code as any other deletion

Always return dummy.next, not head.
```

### How does it work?
1. Create: `dummy = new ListNode(0)` and set `dummy.next = head`.
2. Start your traversal pointer `curr` at `dummy` (not at `head`).
3. Work through `curr.next` — this keeps `curr` always one step BEFORE the node you're operating on.
4. At the end, return `dummy.next` as the true new head.

### Why does it work?
Every linked list operation that removes or inserts a node needs access to that node's predecessor. The head's predecessor doesn't exist naturally. The dummy node IS that predecessor — a permanent, never-removed anchor point that makes the head behave exactly like any other node.

### When to use?
- The head node might be removed (e.g., remove Nth from end when N = list length).
- Building a new list by appending nodes (merge, partition, reorder).
- Any time your code would need `if (prev == null)` as a special case.

### When NOT to use?
- The head is guaranteed never to change and you're not building a new list.

### How to recognize in a new problem?
Ask: "could the head be removed or could I be inserting before the head?" If yes, add a dummy. Almost every problem that builds or modifies a linked list benefits from it.

### Simple Example
Problem: Delete all nodes equal to a given value.
Input: `1 → 2 → 3 → 2 → 1`, delete val = 1
Expected output: `2 → 3 → 2`

Without dummy: need a special check when value == head's value.
With dummy: `dummy → 1 → 2 → 3 → 2 → 1`. Walk with `curr = dummy`. When `curr.next.val == 1`, set `curr.next = curr.next.next`. Works uniformly for all nodes including the original head.

### Code
```java
// Java — Remove All Occurrences of val
public ListNode removeElements(ListNode head, int val) {
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode curr = dummy;

    while (curr.next != null) {
        if (curr.next.val == val) {
            curr.next = curr.next.next; // skip the matching node
        } else {
            curr = curr.next; // advance only if no removal
        }
    }
    return dummy.next;
}
```
```javascript
// JavaScript — Remove All Occurrences of val
function removeElements(head, val) {
    const dummy = { val: 0, next: head };
    let curr = dummy;

    while (curr.next !== null) {
        if (curr.next.val === val) {
            curr.next = curr.next.next; // skip the matching node
        } else {
            curr = curr.next; // advance only if no removal
        }
    }
    return dummy.next;
}
```

### Dry Run
List: `1 → 2 → 3 → 2 → 1`, val = 1
```
Setup: dummy → 1 → 2 → 3 → 2 → 1 → null, curr=dummy

Step 1: curr.next=node1 (val=1, match) → dummy.next = node2. curr stays.
        State: dummy → 2 → 3 → 2 → 1 → null

Step 2: curr.next=node2 (val=2, no match) → curr = node2.
Step 3: curr.next=node3 (val=3, no match) → curr = node3.
Step 4: curr.next=node2 (val=2, no match) → curr = node2.
Step 5: curr.next=node1 (val=1, match) → node2.next = null. curr stays.
        State: dummy → 2 → 3 → 2 → null

curr.next=null → stop.
Return dummy.next = node 2 ✓
```

### Complexity
```
Time: O(n) — visit every node exactly once
Space: O(1) — one extra dummy node (constant)
```

### Common Trap
- Returning `head` instead of `dummy.next`. If the original head was removed, `head` points to a deleted node — `dummy.next` is the actual new head.
- Advancing `curr` even after a deletion. After `curr.next = curr.next.next`, the new `curr.next` is a different node — you must recheck it in the next iteration without advancing `curr` first.

### Experience Tip
**Experience Tip:** Make it a reflex: as soon as a linked list problem could delete or prepend at the head, write `dummy = new ListNode(0); dummy.next = head;` as your first two lines, and `return dummy.next;` as your last line. This eliminates 90% of head-related edge case bugs.

### Do Not Confuse With
**LRU Cache sentinels (pattern 9):** LRU uses TWO sentinel nodes (headDummy and tailDummy) to manage both ends of a doubly linked list. The dummy node trick here is a single sentinel for the front of a singly linked list.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 21 | Merge Two Sorted Lists | Easy | Dummy builds the result list without a head-special-case | https://leetcode.com/problems/merge-two-sorted-lists/ |
| 19 | Remove Nth Node From End of List | Medium | Dummy handles the case where the head itself is removed | https://leetcode.com/problems/remove-nth-node-from-end-of-list/ |
| 83 | Remove Duplicates from Sorted List | Easy | Simple deletion — good first dummy node practice | https://leetcode.com/problems/remove-duplicates-from-sorted-list/ |
| 92 | Reverse Linked List II | Medium | Dummy handles reversals starting at position 1 | https://leetcode.com/problems/reverse-linked-list-ii/ |

### One-Minute Revision
```
ALGORITHM: Dummy Node Trick
IN SIMPLE WORDS: Insert a fake node before head. Every real node now has a predecessor. Return dummy.next at the end.
USE WHEN: head might be deleted, building a new list, any "if prev==null" special case
DON'T USE WHEN: head never changes and you're not building a new list
CORE IDEA: Give the head a stable predecessor so all nodes are handled uniformly
TRACK: dummy (anchor before head), curr starts at dummy
TIME: O(n) — same as without dummy
SPACE: O(1) — one extra constant node
COMMON TRAP: Return dummy.next not head. Do not advance curr after a deletion.
EXPERIENCE TIP: Two reflexive lines at top, one at bottom — eliminate head edge cases permanently
```

---

## Merge Two Sorted Lists

### What is it?
Given two already-sorted linked lists, produce one sorted linked list by comparing the front nodes of each list and picking the smaller one, one at a time. No sorting is needed — both inputs are sorted, so the smallest remaining element is always at one of the two fronts.

### Visual
```
L1: [1|→] → [3|→] → [5|→] → null
L2: [2|→] → [4|→] → [6|→] → null

dummy → [result builds here, curr advances]

Compare heads:  1 vs 2 → take 1   curr→1,  L1 advances to 3
Compare heads:  3 vs 2 → take 2   curr→2,  L2 advances to 4
Compare heads:  3 vs 4 → take 3   curr→3,  L1 advances to 5
Compare heads:  5 vs 4 → take 4   curr→4,  L2 advances to 6
Compare heads:  5 vs 6 → take 5   curr→5,  L1 advances to null
L1 exhausted → attach L2 remainder (6→null)

dummy → 1 → 2 → 3 → 4 → 5 → 6 → null
```

### How does it work?
1. Create a `dummy` node. Set `curr = dummy`.
2. While both lists have nodes: compare `list1.val` and `list2.val`. Attach the node with the smaller value to `curr.next`. Advance that list's pointer. Advance `curr`.
3. When one list runs out: set `curr.next` to whichever list still has nodes remaining.
4. Return `dummy.next`.

### Why does it work?
Both lists are sorted, so at every comparison step the globally smallest remaining element is always at the front of one of the two lists. By greedily picking the smaller front node each step, we produce a sorted result in a single O(n+m) pass with no backtracking.

### When to use?
- "Merge two sorted linked lists."
- As a sub-step in merge sort on a linked list.
- Anytime two sorted sources need to be combined into one.

### When NOT to use?
- Input lists are NOT sorted — sort them first or use a different approach.
- More than 2 lists — use a min-heap for O(N log K) instead of naive sequential merging.

### How to recognize in a new problem?
"Two sorted lists → one sorted list" is the direct signal. Also appears as a sub-problem: "Sort List" (148) uses merge sort, which calls merge-two repeatedly.

### Simple Example
Input: L1 = `1 → 3 → 5`, L2 = `2 → 4 → 6`
Expected output: `1 → 2 → 3 → 4 → 5 → 6`

### Code
```java
// Java
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
    // attach the non-empty remainder
    curr.next = (list1 != null) ? list1 : list2;
    return dummy.next;
}
```
```javascript
// JavaScript
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
    // attach the non-empty remainder
    curr.next = list1 !== null ? list1 : list2;
    return dummy.next;
}
```

### Dry Run
L1: `1 → 3 → 5`, L2: `2 → 4 → 6`
```
Start: curr=dummy, L1=1, L2=2

Step 1: 1 ≤ 2 → attach L1(1). L1=3. curr=1.   dummy→1
Step 2: 3 > 2  → attach L2(2). L2=4. curr=2.   dummy→1→2
Step 3: 3 ≤ 4 → attach L1(3). L1=5. curr=3.   dummy→1→2→3
Step 4: 5 > 4  → attach L2(4). L2=6. curr=4.   dummy→1→2→3→4
Step 5: 5 ≤ 6 → attach L1(5). L1=null. curr=5. dummy→1→2→3→4→5

L1 exhausted. curr.next = L2 remainder (6→null).
Final: dummy → 1 → 2 → 3 → 4 → 5 → 6 → null
Return dummy.next = node 1 ✓
```

### Complexity
```
Time: O(n + m) — each node is visited exactly once
Space: O(1) — no new nodes created; existing nodes are relinked
```

### Common Trap
- Forgetting `curr.next = (list1 != null) ? list1 : list2`. Without this, the longer list's remaining nodes are never connected — you silently lose them with no error.
- Returning `dummy` or `head` instead of `dummy.next`.

### Experience Tip
**Experience Tip:** The remainder attachment at the end is always safe to write as a single ternary — both lists cannot be non-null simultaneously at that point (the while loop just exited because one became null). Don't over-think it with if/else.

### Do Not Confuse With
**Merge K Sorted Lists:** For K=2, this pattern is O(n+m) — optimal. For K lists, naive chaining of this function is O(K×N). Use a min-heap for O(N log K). Merge-two is the fundamental building block that merge-K extends.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 21 | Merge Two Sorted Lists | Easy | The exact pattern — implement it from scratch | https://leetcode.com/problems/merge-two-sorted-lists/ |
| 23 | Merge K Sorted Lists | Hard | Extends merge-two with a min-heap across K lists | https://leetcode.com/problems/merge-k-sorted-lists/ |
| 148 | Sort List | Medium | Merge sort on a linked list calls merge-two repeatedly | https://leetcode.com/problems/sort-list/ |
| 88 | Merge Sorted Array | Easy | Same merge logic but on arrays — different mechanics | https://leetcode.com/problems/merge-sorted-array/ |

### One-Minute Revision
```
ALGORITHM: Merge Two Sorted Lists
IN SIMPLE WORDS: Compare fronts, take the smaller, advance that list. Attach the remainder when one list runs out.
USE WHEN: two sorted lists → one sorted list, sub-step of merge sort
DON'T USE WHEN: lists are unsorted, or K > 2 (use min-heap)
CORE IDEA: Both lists sorted → smallest remaining is always at one of the two fronts
TRACK: dummy, curr (tail of result), list1 and list2 (advancing heads)
TIME: O(n + m)
SPACE: O(1)
COMMON TRAP: MUST attach remainder after the while loop. Return dummy.next not dummy.
EXPERIENCE TIP: The remainder ternary at the end is always safe — both can't be non-null when the loop exits
```

---

## LRU Cache — Doubly Linked List + HashMap

### What is it?
An LRU (Least Recently Used) Cache stores up to `capacity` key-value pairs. When full, it evicts the item that was accessed (get or put) least recently. Both `get` and `put` must run in O(1). This requires: a **doubly linked list** (each node has `next` AND `prev` pointers) to maintain usage order with O(1) insertion/removal anywhere, plus a **HashMap** for O(1) key-to-node lookup.

**Why doubly linked?** Singly linked lists can't remove an arbitrary node in O(1) — you'd need to scan for the predecessor. With a `prev` pointer, removal is two assignments: `node.prev.next = node.next` and `node.next.prev = node.prev`.

### Visual
```
Capacity = 3. After put(1), put(2), put(3):
Most-recent end                Least-recent end
[headDummy] ↔ [3] ↔ [2] ↔ [1] ↔ [tailDummy]

After get(2): move node2 to front
[headDummy] ↔ [2] ↔ [3] ↔ [1] ↔ [tailDummy]

After put(4): insert 4 at front, evict tailDummy.prev (node1)
[headDummy] ↔ [4] ↔ [2] ↔ [3] ↔ [tailDummy]
HashMap now has keys {4, 2, 3}. Key 1 is gone.
```

### How does it work?
1. Create two sentinel nodes: `headDummy` (most-recent end) and `tailDummy` (least-recent end). Connect them: `headDummy.next = tailDummy`, `tailDummy.prev = headDummy`.
2. Maintain a `HashMap<key, node>`.
3. **get(key):** If key not in map, return -1. Otherwise call `moveToFront(node)`, return `node.val`.
4. **put(key, value):** If key exists, update value and `moveToFront`. If new, create node, insert at front, add to map. If `map.size() > capacity`, remove `tailDummy.prev` from the list AND from the map.
5. **remove(node):** `node.prev.next = node.next; node.next.prev = node.prev`.
6. **insertAtFront(node):** Wire node between `headDummy` and `headDummy.next` — 4 pointer assignments.
7. **moveToFront(node):** `remove(node)` then `insertAtFront(node)`.

### Why does it work?
The doubly linked list is ordered by recency — the node right after `headDummy` is always the most recently used, and the node right before `tailDummy` is always the least recently used. The HashMap gives O(1) access to any node by key without scanning. Together: O(1) promote-to-front (moveToFront) and O(1) evict-last (remove tailDummy.prev).

### When to use?
- Problem says "design an LRU cache."
- Requires O(1) get + O(1) put + eviction of the least recently used item.
- Any bounded cache where recency determines what to evict.

### When NOT to use?
- LFU (Least Frequently Used) policy — different and much harder.
- In Java, `LinkedHashMap(capacity, 0.75f, true)` with `removeEldestEntry` is a legal shortcut — ask the interviewer.

### How to recognize in a new problem?
"O(1) get and put," "evict least recently used," "fixed capacity" — any two of these three signals means LRU.

### Simple Example
```
LRUCache(2)
put(1, 1)  → {1=1}
put(2, 2)  → {1=1, 2=2}
get(1)     → 1. Order: 1 most recent, 2 least recent.
put(3, 3)  → evict 2 (LRU). Cache: {1=1, 3=3}
get(2)     → -1 (evicted)
get(3)     → 3
```

### Code
```java
// Java — Full DLL + HashMap
class LRUCache {
    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node headDummy = new Node(0, 0);
    private final Node tailDummy = new Node(0, 0);

    public LRUCache(int capacity) {
        this.capacity = capacity;
        headDummy.next = tailDummy;
        tailDummy.prev = headDummy;
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
                Node lru = tailDummy.prev;
                remove(lru);
                map.remove(lru.key); // need key stored in node!
            }
        }
    }

    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void insertAtFront(Node node) {
        node.next = headDummy.next;
        node.prev = headDummy;
        headDummy.next.prev = node;
        headDummy.next = node;
    }

    private void moveToFront(Node node) {
        remove(node);
        insertAtFront(node);
    }

    class Node {
        int key, val; // store key too — needed for eviction from map
        Node prev, next;
        Node(int key, int val) { this.key = key; this.val = val; }
    }
}

// Java — LinkedHashMap shortcut (ask interviewer if allowed)
class LRUCacheShort extends LinkedHashMap<Integer, Integer> {
    private final int capacity;
    public LRUCacheShort(int capacity) {
        super(capacity, 0.75f, true); // accessOrder=true maintains LRU order
        this.capacity = capacity;
    }
    public int get(int key) { return super.getOrDefault(key, -1); }
    public void put(int key, int value) { super.put(key, value); }
    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
        return size() > capacity;
    }
}
```
```javascript
// JavaScript — JS Map maintains insertion order; delete+re-insert = move to end (MRU)
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.map = new Map(); // keys ordered by insertion; end = most recent
    }

    get(key) {
        if (!this.map.has(key)) return -1;
        const val = this.map.get(key);
        this.map.delete(key);   // remove from current position
        this.map.set(key, val); // re-insert at end (most recent)
        return val;
    }

    put(key, value) {
        if (this.map.has(key)) {
            this.map.delete(key); // remove old position
        }
        this.map.set(key, value); // insert at end (most recent)
        if (this.map.size > this.capacity) {
            // map.keys().next().value = first key = least recently used
            this.map.delete(this.map.keys().next().value);
        }
    }
}
```

### Dry Run
`LRUCache(2)`: put(1,1), put(2,2), get(1), put(3,3), get(2)
```
put(1,1): list: H ↔ [1] ↔ T.         map={1:node1}
put(2,2): list: H ↔ [2] ↔ [1] ↔ T.   map={1,2}
get(1):   moveToFront(node1).
          list: H ↔ [1] ↔ [2] ↔ T.   return 1.
put(3,3): insertAtFront(node3). size=3 > capacity=2.
          lru = tailDummy.prev = node2. remove(node2). map.remove(2).
          list: H ↔ [3] ↔ [1] ↔ T.   map={1,3}
get(2):   2 not in map → return -1 ✓
```

### Complexity
```
Time: O(1) for both get and put — all operations are constant-time pointer changes and HashMap ops
Space: O(capacity) — at most capacity nodes in the list and map, plus 2 sentinels
```

### Common Trap
- Storing only `val` in the node but not `key`: when evicting `tailDummy.prev`, you need its key to delete it from the HashMap. Always store BOTH `key` and `val` in each node.
- Using a singly linked list — O(n) removal because you must scan for the predecessor. LRU requires doubly linked.
- In `insertAtFront`, the four pointer assignments must happen in the right order. Set `node.next` and `node.prev` BEFORE modifying `headDummy.next` — otherwise you lose the reference to the old first real node.

### Experience Tip
**Experience Tip:** Write `remove()` and `insertAtFront()` as isolated private helpers and mentally test each with a 3-node list before touching `get` and `put`. If `insertAtFront` is wrong, every operation is wrong. Four pointer assignments, specific order — draw it out once.

### Do Not Confuse With
**LFU Cache:** LFU evicts the least *frequently* accessed item (tie-broken by recency). Requires a frequency map and per-frequency doubly linked lists. Significantly more complex — LRU is the standard Google interview target.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 146 | LRU Cache | Medium | The classic — implement the full DLL + HashMap | https://leetcode.com/problems/lru-cache/ |
| 460 | LFU Cache | Hard | Extends LRU concept with frequency tracking — do LRU first | https://leetcode.com/problems/lfu-cache/ |
| 432 | All O'one Data Structure | Hard | Similar DLL + HashMap design discipline | https://leetcode.com/problems/all-oone-data-structure/ |

### One-Minute Revision
```
ALGORITHM: LRU Cache — Doubly Linked List + HashMap
IN SIMPLE WORDS: DLL keeps usage order (headDummy=MRU, tailDummy=LRU). HashMap gives O(1) key→node lookup.
USE WHEN: "design LRU cache", O(1) get+put with recency-based eviction
DON'T USE WHEN: LFU policy needed, or interviewer allows LinkedHashMap shortcut
CORE IDEA: DLL for O(1) ordered insert/remove anywhere. HashMap for O(1) lookup.
TRACK: headDummy, tailDummy, HashMap<key,node>; each node stores BOTH key AND val
TIME: O(1) get and put
SPACE: O(capacity)
COMMON TRAP: Store key in node (needed for map.remove on eviction). Use doubly not singly linked. insertAtFront: set node.next/prev BEFORE touching headDummy.next.
EXPERIENCE TIP: Write and test remove() and insertAtFront() in isolation first — they're the foundation of everything
```

---

## Deep Clone / Copy List with Random Pointer

### What is it?
Each node in this special linked list has two pointers: a `next` pointer (to the next node in sequence) and a `random` pointer (which can point to ANY node in the list, or null). Your task is to create a completely new, independent list — every node must be a brand-new object with the same value, the same `next` structure, and the same `random` structure.

The challenge: when you create a copy of node A and try to set `copyA.random`, the node that `random` points to might not have been copied yet. You cannot wire `random` in a single pass.

Real-world analogy: Copying a company org chart where each person has a "direct manager" field that can point to anyone in the company, not just their immediate supervisor. You must create all employee records first, then fill in the "direct manager" references — because the manager's record might not exist yet when you reach the employee.

### Visual

```
Original list:
  [A:1] → [B:2] → [C:3] → null
   |               ↑
   random──────────┘         (A.random = C)
         [B].random = [A]    (B.random = A)
         [C].random = null

WHY you cannot copy in one pass:
  When creating copyA, you want to set copyA.random = copyC.
  But copyC does not exist yet! You haven't reached C in the list.

TWO-PASS HASHMAP APPROACH:
  Pass 1: Create all copies, build a map.
    map = { A→A'(1), B→B'(2), C→C'(3) }

  Pass 2: Wire next and random using the map.
    A'.next   = map[A.next]   = B'
    A'.random = map[A.random] = C'   ← now C' exists in the map
    B'.next   = map[B.next]   = C'
    B'.random = map[B.random] = A'
    C'.next   = map[null]     = null
    C'.random = map[null]     = null

  Result: A'→B'→C', with correct random pointers.

THREE-PASS INTERLEAVE APPROACH (O(1) extra space):
  Pass 1: Insert each copy immediately after its original.
    [A] → [A'] → [B] → [B'] → [C] → [C'] → null

  Pass 2: Wire random for each copy.
    A'.random = A.random.next    (A.random=C, C.next=C' → A'.random=C' ✓)
    B'.random = B.random.next    (B.random=A, A.next=A' → B'.random=A' ✓)
    C'.random = null             (C.random=null → skip)

  Pass 3: Separate the two lists.
    Original: [A] → [B] → [C] → null
    Copies:   [A'] → [B'] → [C'] → null
```

### How does it work?

**HashMap approach (2 passes, O(n) space):**
1. Pass 1: Walk the original list. For each node, create a copy and store `map[original] = copy`.
2. Pass 2: Walk again. For each original node:
   - `copy.next   = map[original.next]`   (null-safe: map.get(null) returns null)
   - `copy.random = map[original.random]`
3. Return `map[head]`.

**Interleave approach (3 passes, O(1) extra space):**
1. Pass 1: For every node, insert its copy immediately after: `[A] → [A'] → [B] → [B'] → ...`
2. Pass 2: Wire random pointers: `original.next.random = original.random.next` (the copy of original.random is always original.random.next — they are interleaved).
3. Pass 3: Separate: restore `original.next` and build the copy chain properly.

### Why does it work?
**HashMap:** Every copy is created in pass 1. In pass 2, `map[anything]` is guaranteed to exist (or return null for null keys), so no "copy not yet created" problem arises.

**Interleave:** By placing each copy immediately after its original, `original.random.next` always equals the copy of `original.random`. This gives O(1) space by exploiting positional proximity instead of a HashMap.

### When to use?
- Linked list with a `random` (arbitrary) pointer that must be deep-copied.
- Deep copy of any data structure where nodes reference each other non-linearly.

### When NOT to use?
- Simple linked list copy with only a `next` pointer — just iterate and copy, no special technique needed.

### How to recognize in a new problem?
"Clone" or "deep copy" a linked list + "random pointer" / "arbitrary pointer." Also appears as graph cloning (same concept, more connections per node).

### Simple Example

Original: A(1, random→C) → B(2, random→A) → C(3, random→null)

After cloning:
A'(1, random→C') → B'(2, random→A') → C'(3, random→null)

A' and A are completely separate objects. Modifying A' does not affect A.

### Code

```java
// Java — HashMap approach (cleaner, recommended for interviews)
public Node copyRandomList(Node head) {
    if (head == null) return null;
    Map<Node, Node> map = new HashMap<>();

    // Pass 1: create all copies
    Node curr = head;
    while (curr != null) {
        map.put(curr, new Node(curr.val));
        curr = curr.next;
    }

    // Pass 2: wire next and random
    curr = head;
    while (curr != null) {
        map.get(curr).next   = map.get(curr.next);    // null-safe
        map.get(curr).random = map.get(curr.random);  // null-safe
        curr = curr.next;
    }

    return map.get(head);
}
```

```java
// Java — Interleave approach (O(1) extra space)
public Node copyRandomListO1(Node head) {
    if (head == null) return null;

    // Pass 1: insert copy after each original
    Node curr = head;
    while (curr != null) {
        Node copy = new Node(curr.val);
        copy.next = curr.next;
        curr.next = copy;
        curr = copy.next;
    }

    // Pass 2: wire random pointers for copies
    curr = head;
    while (curr != null) {
        if (curr.random != null) {
            curr.next.random = curr.random.next;  // copy of curr.random is curr.random.next
        }
        curr = curr.next.next;
    }

    // Pass 3: separate the two lists
    Node dummy = new Node(0);
    Node copyTail = dummy;
    curr = head;
    while (curr != null) {
        Node copy  = curr.next;
        curr.next  = copy.next;          // restore original
        copyTail.next = copy;
        copyTail   = copy;
        curr       = curr.next;
    }
    return dummy.next;
}
```

```javascript
// JavaScript — HashMap approach
function copyRandomList(head) {
    if (head === null) return null;
    const map = new Map();

    // Pass 1: create all copies
    let curr = head;
    while (curr !== null) {
        map.set(curr, { val: curr.val, next: null, random: null });
        curr = curr.next;
    }

    // Pass 2: wire next and random
    curr = head;
    while (curr !== null) {
        map.get(curr).next   = map.get(curr.next)   ?? null;
        map.get(curr).random = map.get(curr.random) ?? null;
        curr = curr.next;
    }

    return map.get(head);
}
```

### Dry Run

Original: A(1,→C) → B(2,→A) → C(3,→null), HashMap approach.

```
Pass 1 (create copies):
  map = { A → A'(1), B → B'(2), C → C'(3) }

Pass 2 (wire pointers):
  curr=A: A'.next = map[B] = B'.   A'.random = map[C] = C'.
  curr=B: B'.next = map[C] = C'.   B'.random = map[A] = A'.
  curr=C: C'.next = map[null] = null. C'.random = map[null] = null.

Return map[A] = A'.
Result: A'(1,→C') → B'(2,→A') → C'(3,→null)  ✓
```

### Complexity

```
HashMap approach:
  Time:  O(n) — two passes, each O(n)
  Space: O(n) — one HashMap entry per node

Interleave approach:
  Time:  O(n) — three passes, each O(n)
  Space: O(1) — no extra data structures; threads reuse the list itself
```

### Common Trap

The #1 beginner mistake: trying to copy `next` and `random` in a single pass. When setting `copy.random = copy of original.random`, the copy of `original.random` may not exist yet (it hasn't been created). Always create ALL copies first, THEN wire the pointers.

### Experience Tip

In an interview, present the HashMap approach first — it is clean, correct, and easy to explain. Then say: "If you need O(1) space, I can use the interleave trick: insert each copy right after its original, wire randoms using positional proximity, then separate the two lists." This shows depth without over-complicating your primary answer.

### Do Not Confuse With

| | Simple List Copy | Deep Clone with Random Pointer |
|---|---|---|
| Extra pointers | None — only `next` | `random` pointer to any node |
| Single-pass possible? | Yes | No — random target may not be copied yet |
| Space | O(1) | O(n) HashMap OR O(1) interleave trick |
| Difficulty | Trivial | Medium |
| Key trick | Just iterate | Create all copies first; wire in a second pass |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal | Link |
|---|---------|------------|----------------|------|
| 138 | Copy List with Random Pointer | Medium | Classic — implement both HashMap and interleave; explain trade-offs | https://leetcode.com/problems/copy-list-with-random-pointer/ |
| 133 | Clone Graph | Medium | Same concept on a graph — HashMap maps old→new nodes | https://leetcode.com/problems/clone-graph/ |
| 1485 | Clone Binary Tree with Random Pointer | Medium | Same two-pass idea applied to a tree structure | https://leetcode.com/problems/clone-binary-tree-with-random-pointer/ |
| 1490 | Clone N-ary Tree | Medium | Deep copy without random pointer — simpler; good warm-up | https://leetcode.com/problems/clone-n-ary-tree/ |

### One-Minute Revision

```
ALGORITHM: Deep Clone / Copy List with Random Pointer
IN SIMPLE WORDS: Can't copy random in one pass — target copy may not exist yet.
                 HashMap: create all copies first, then wire next+random.
                 Interleave: insert copies after originals; random = original.random.next.
USE WHEN: Linked list with random/arbitrary pointer; deep copy with cross-references
DON'T USE WHEN: Simple list copy (next only) — just iterate and copy next
CORE IDEA: Two-step always: (1) create all copies, (2) wire all pointers
TRACK: HashMap<original, copy> OR interleaved positions
TIME: O(n)
SPACE: O(n) HashMap OR O(1) interleave
COMMON TRAP: Wiring random in a single pass — copy of target not yet created
EXPERIENCE TIP: Present HashMap first; offer interleave as the space-optimization follow-up
```

---

*Next: [07-STACKS-AND-QUEUES.md](07-STACKS-AND-QUEUES.md)*
