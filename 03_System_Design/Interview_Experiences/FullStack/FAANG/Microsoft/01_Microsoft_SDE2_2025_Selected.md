# Microsoft — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Software Engineer 2 |
| **Level** | L62 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/microsoft-interview-experience-for-sde-2/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (3 Technical + 1 "As-Appropriate" with Hiring Manager)
- **Timeline:** 2 weeks from phone screen to offer
- **Format:** Onsite at Microsoft Hyderabad campus, whiteboard coding

---

## Round 1: Coding
**Duration:** 60 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Connect Nodes at Same Level in Binary Tree** (Level Order with next pointers)

### 💡 Interview-Ready Answer

```java
// Given: Node { val, left, right, next }
// Connect each node's next pointer to its right neighbor at same level

// Approach 1: BFS with Queue (straightforward)
public Node connect(Node root) {
    if (root == null) return null;
    Queue<Node> queue = new LinkedList<>();
    queue.offer(root);
    
    while (!queue.isEmpty()) {
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            Node node = queue.poll();
            node.next = (i < size - 1) ? queue.peek() : null;
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
    }
    return root;
}

// Approach 2: O(1) Space using previously established next pointers
public Node connectOptimal(Node root) {
    Node levelStart = root;
    
    while (levelStart != null) {
        Node curr = levelStart;
        Node dummy = new Node(0); // dummy head for next level
        Node tail = dummy;
        
        while (curr != null) {
            if (curr.left != null) {
                tail.next = curr.left;
                tail = tail.next;
            }
            if (curr.right != null) {
                tail.next = curr.right;
                tail = tail.next;
            }
            curr = curr.next; // move to next node at current level
        }
        
        levelStart = dummy.next; // first node of next level
    }
    return root;
}
```
**Time:** O(n), **Space:** O(1) for optimal approach

---

## Round 2: Coding + LLD
**Duration:** 60 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Decode String** (LeetCode 394) — `3[a2[c]]` → `accaccacc`
2. **Find Possible Words from Phone Digits** (LeetCode 17)
3. **Merge K Sorted Linked Lists** (LeetCode 23)

### 💡 Interview-Ready Answer — Decode String

```java
public String decodeString(String s) {
    Stack<Integer> countStack = new Stack<>();
    Stack<StringBuilder> stringStack = new Stack<>();
    StringBuilder current = new StringBuilder();
    int k = 0;
    
    for (char c : s.toCharArray()) {
        if (Character.isDigit(c)) {
            k = k * 10 + (c - '0');
        } else if (c == '[') {
            countStack.push(k);
            stringStack.push(current);
            current = new StringBuilder();
            k = 0;
        } else if (c == ']') {
            int count = countStack.pop();
            StringBuilder prev = stringStack.pop();
            for (int i = 0; i < count; i++) {
                prev.append(current);
            }
            current = prev;
        } else {
            current.append(c);
        }
    }
    return current.toString();
}
```

### 💡 Interview-Ready Answer — Merge K Sorted Lists

```java
public ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> minHeap = new PriorityQueue<>(
        (a, b) -> a.val - b.val
    );
    
    // Add first node of each list
    for (ListNode head : lists) {
        if (head != null) minHeap.offer(head);
    }
    
    ListNode dummy = new ListNode(0);
    ListNode curr = dummy;
    
    while (!minHeap.isEmpty()) {
        ListNode smallest = minHeap.poll();
        curr.next = smallest;
        curr = curr.next;
        if (smallest.next != null) {
            minHeap.offer(smallest.next);
        }
    }
    
    return dummy.next;
}
```
**Time:** O(N log K) where N = total nodes, K = number of lists
**Space:** O(K) for the heap

**Alternative: Divide & Conquer**
```java
public ListNode mergeKLists(ListNode[] lists) {
    if (lists.length == 0) return null;
    return mergeRange(lists, 0, lists.length - 1);
}

private ListNode mergeRange(ListNode[] lists, int lo, int hi) {
    if (lo == hi) return lists[lo];
    int mid = (lo + hi) / 2;
    ListNode left = mergeRange(lists, lo, mid);
    ListNode right = mergeRange(lists, mid + 1, hi);
    return mergeTwoLists(left, right);
}

private ListNode mergeTwoLists(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode(0), curr = dummy;
    while (l1 != null && l2 != null) {
        if (l1.val <= l2.val) { curr.next = l1; l1 = l1.next; }
        else { curr.next = l2; l2 = l2.next; }
        curr = curr.next;
    }
    curr.next = (l1 != null) ? l1 : l2;
    return dummy.next;
}
```
Same O(N log K) time but avoids the heap overhead.

---

## Round 3: Coding + System Design
**Duration:** 60 minutes | **Interviewer:** Principal SDE

### Questions Asked
1. **Second Largest Element in BST**
2. **Egg Drop Problem** (LeetCode 887)
3. **"How would you display a 10MB image file on a small mobile screen?"** (Practical system design)

### 💡 Interview-Ready Answer — Second Largest in BST

```java
// Key insight: The second largest is either:
// 1. Parent of the rightmost node (if rightmost has no left subtree)
// 2. Largest element in the left subtree of the rightmost node

public int secondLargest(TreeNode root) {
    TreeNode parent = null;
    TreeNode curr = root;
    
    // Find rightmost (largest) node
    while (curr.right != null) {
        parent = curr;
        curr = curr.right;
    }
    
    // Case 1: Rightmost has a left subtree → find max in left subtree
    if (curr.left != null) {
        curr = curr.left;
        while (curr.right != null) curr = curr.right;
        return curr.val;
    }
    
    // Case 2: No left subtree → parent is second largest
    return parent.val;
}
```
**Time:** O(h), **Space:** O(1)

### 💡 Interview-Ready Answer — 10MB Image on Mobile

**This is a system design / practical architecture question:**

```
Strategy: Progressive loading with multiple resolutions

1. Server-side Processing Pipeline:
   ┌──────────┐    ┌──────────────┐    ┌─────────────┐
   │ Upload   │───▶│ Image        │───▶│ CDN Storage  │
   │ 10MB     │    │ Processing   │    │ (S3 + CF)    │
   │ Original │    │ Service      │    │              │
   └──────────┘    └──────────────┘    └─────────────┘
   
   Generate variants:
   - Thumbnail: 100x100, ~5KB (LQIP - Low Quality Image Placeholder)
   - Small: 320px wide, ~50KB (mobile)
   - Medium: 768px wide, ~200KB (tablet)
   - Large: 1920px wide, ~800KB (desktop)
   - Original: full 10MB (download only)
   
   Format: WebP (30% smaller than JPEG) with JPEG fallback

2. Client-side Progressive Loading:
   Step 1: Load blurred LQIP (5KB) → instant display
   Step 2: Load appropriate resolution based on:
           - Device screen width (viewport)
           - Network speed (navigator.connection.effectiveType)
           - Pixel density (window.devicePixelRatio)
   Step 3: Fade transition from blur to sharp

3. Implementation:
   <img srcset="small.webp 320w, medium.webp 768w, large.webp 1920w"
        sizes="(max-width: 320px) 320px, (max-width: 768px) 768px, 1920px"
        src="small.webp"
        loading="lazy"
        style="background: url(lqip-base64) center/cover" />

4. Additional optimizations:
   - HTTP/2 server push for critical images
   - Service Worker cache for offline access
   - Intersection Observer for lazy loading
   - Content-aware cropping (focus on faces/objects)
```

---

## Round 4: As-Appropriate (Hiring Manager)
**Duration:** 45 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **Optimal Game Strategy (DP)** — Given coins in a row, two players pick from either end, find max value first player can get
2. **Current project deep dive**
3. **Strengths and weaknesses**

### 💡 Interview-Ready Answer — Optimal Game Strategy

```java
// dp[i][j] = max value current player can get from coins[i..j]
public int optimalStrategy(int[] coins) {
    int n = coins.length;
    int[][] dp = new int[n][n];
    
    // Base case: single coin
    for (int i = 0; i < n; i++) dp[i][i] = coins[i];
    
    // Base case: two coins
    for (int i = 0; i < n - 1; i++) dp[i][i+1] = Math.max(coins[i], coins[i+1]);
    
    // Fill for lengths 3 to n
    for (int len = 3; len <= n; len++) {
        for (int i = 0; i <= n - len; i++) {
            int j = i + len - 1;
            // Pick left: get coins[i], opponent plays optimally on [i+1..j]
            // After picking coins[i], opponent picks optimally, we get min of remaining
            int pickLeft = coins[i] + Math.min(
                dp[i + 2][j],     // opponent picks i+1
                dp[i + 1][j - 1]  // opponent picks j
            );
            // Pick right: get coins[j], opponent plays optimally on [i..j-1]
            int pickRight = coins[j] + Math.min(
                dp[i + 1][j - 1],  // opponent picks i
                dp[i][j - 2]       // opponent picks j-1
            );
            dp[i][j] = Math.max(pickLeft, pickRight);
        }
    }
    return dp[0][n - 1];
}
```
**Time:** O(n²), **Space:** O(n²)

**Intuition:** If I pick a coin, my opponent will play optimally to minimize MY remaining value. So I take the min of what's left after opponent's optimal move.

---

## 🎯 Key Takeaways
- Microsoft interviews are **more collaborative** than Google/Amazon — they give hints freely
- **Whiteboard coding** is still used at Hyderabad campus — practice writing clean code by hand
- **Practical system design** questions (like the 10MB image) test real-world engineering thinking
- They ask **3 coding questions in one round** — need to be fast and accurate
- Decode String + Merge K Lists combo is a Microsoft classic — stack + heap practice
- **"As Appropriate" round** is the final hire/no-hire — it's with the hiring manager

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 | Medium | BFS, Tree Traversal, Linked List |
| Round 2 | Medium-Hard | Stack, Recursion, Heap, D&C |
| Round 3 | Hard | BST, DP, Progressive Image Loading |
| Round 4 | Medium-Hard | Game Theory DP, Behavioral |
