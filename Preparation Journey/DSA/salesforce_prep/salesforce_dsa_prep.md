# Salesforce DSA Interview Preparation
### Research-Backed · Evidence-First · Maximum ROI in Minimum Time

---

## 1. Executive Summary

**What the research shows (2024–2025, multiple independent sources):**

- Salesforce OA is on **HackerRank**, 60–90 minutes, **2 medium-level problems**. Need 80%+ test cases to pass.
- Live DSA rounds: **2 medium problems per round**, interviewers probe time/space complexity after every solution.
- **Highest-frequency topics across all evidence: Arrays+Strings+Hashing → Sliding Window → Trees → Graph BFS/DFS → Intervals → DP.**
- Salesforce interviewers **explicitly score your thought-process explanation**, not just correctness. Say what you're doing before you code it.
- OA and live rounds share the same difficulty band: **LeetCode Easy–Medium**. Hard problems appear rarely, mainly at SMTS/LMTS level.
- For MTS/SMTS roles, expect a **LLD round** (LRU Cache / Parking Lot / Task Scheduler) after the DSA round.

**Assumptions (state your role if known):** This guide is calibrated for **MTS (2–5 YOE)** — the most commonly reported level. AMTS rounds are purer DSA; SMTS may see harder variants.

---

## 2. Tomorrow — Must-Do DSA Questions

Focus: 25 problems, maximum evidence, minimum time.

| # | Problem | LC # | Difficulty | Pattern | Salesforce Evidence | Priority |
|---|---------|------|------------|---------|---------------------|----------|
| 1 | Two Sum | 1 | Easy | HashMap | Reported as warm-up in multiple phone screens | 🔴 MUST |
| 2 | Longest Substring Without Repeating Characters | 3 | Medium | Sliding Window | Reported verbatim in SMTS Aug 2025 round | 🔴 MUST |
| 3 | Group Anagrams | 49 | Medium | HashMap+Sort | Repeated in phone screens; string pattern cluster | 🔴 MUST |
| 4 | Number of Islands | 200 | Medium | BFS/DFS Grid | Reported in Glassdoor SMTS; highest-freq graph problem | 🔴 MUST |
| 5 | Merge Intervals | 56 | Medium | Intervals+Sort | Reported in OA (interval overlap pattern); extremely common | 🔴 MUST |
| 6 | LRU Cache | 146 | Medium | Design+DLL+HashMap | Most commonly reported LLD question across all sources | 🔴 MUST |
| 7 | Product of Array Except Self | 238 | Medium | Prefix Product | Reported in onsite; tests no-division constraint | 🔴 MUST |
| 8 | Binary Tree Level Order Traversal | 102 | Medium | Tree BFS | Core BFS pattern; Vertical Order Traversal asked at SMTS | 🔴 MUST |
| 9 | Vertical Order Traversal of Binary Tree | 987 | Hard | Tree BFS+Sort | Reported verbatim in Salesforce SMTS Aug 2025 | 🔴 MUST |
| 10 | Lowest Common Ancestor of Binary Tree | 236 | Medium | Tree DFS | Reported in onsite rounds; tests tree recursion | 🔴 MUST |
| 11 | Course Schedule | 207 | Medium | Graph / Topo Sort | Reported pattern: "dependency / cycle detection" | 🔴 MUST |
| 12 | Find All Anagrams in a String | 438 | Medium | Sliding Window | String+sliding window cluster — very high frequency | 🔴 MUST |
| 13 | Remove All Adjacent Duplicates in String II | 1209 | Medium | Stack | Reported verbatim in MTS SDE2 onsite (LC post Jul 2025) | 🔴 MUST |
| 14 | First Missing Positive | 41 | Hard | Array Index Trick | Reported verbatim in MTS SDE2 onsite (LC post Jul 2025) | 🔴 MUST |
| 15 | Snakes and Ladders | 909 | Medium | BFS/Graph | Reported verbatim in MTS DSA round, July 2024 | 🔴 MUST |
| 16 | Top K Frequent Elements | 347 | Medium | Heap+HashMap | Reported pattern; Heap cluster — standard across levels | 🔴 MUST |
| 17 | Daily Temperatures | 739 | Medium | Monotonic Stack | Stack pattern cluster — very common | 🔴 MUST |
| 18 | Coin Change | 322 | Medium | DP | Reported pattern (OA DP); classic DP | 🔴 MUST |
| 19 | Maximum Product Subarray | 152 | Medium | DP/Array | Reported in Salesforce OA | 🔴 MUST |
| 20 | Word Search | 79 | Medium | Backtracking | Reported pattern — backtracking cluster | 🔴 MUST |
| 21 | Search in Rotated Sorted Array | 33 | Medium | Binary Search | Reported in SMTS; binary search variation pattern | 🟠 HIGH |
| 22 | Trapping Rain Water | 42 | Hard | Two Pointers | Reported in SMTS bad-experience post; tests depth | 🟠 HIGH |
| 23 | Accounts Merge | 721 | Medium | Union-Find/DFS | Salesforce-relevant; CRM data merging — thematically reported | 🟠 HIGH |
| 24 | Find Median from Data Stream | 295 | Hard | Two Heaps | Reported in MTS onsite (real-time analytics theme) | 🟠 HIGH |
| 25 | Minimum Window Substring | 76 | Hard | Sliding Window | Core sliding window hard — follow-up to #3/#12 | 🟠 HIGH |

**Also cover if time allows (🟡 IF TIME):**
- House Robber (198) · Climbing Stairs (70) · Binary Tree Right Side View (199) · Path Sum II (113) · Rotate Image (48) · 3Sum (15) · Min Stack (155) · Linked List Cycle (141)

---

## 3. Previously Reported Salesforce Questions

### A. EXACTLY REPORTED QUESTIONS (candidates said these words)

| Question | Topic | LC # | Difficulty | Source | Date | Freq | Confidence |
|----------|-------|------|------------|--------|------|------|------------|
| Longest Substring Without Repeating Characters | Sliding Window / Strings | 3 | Medium | LeetCode discuss (SMTS Aug 2025) | Aug 2025 | ×2+ | 🟢 HIGH |
| Vertical Order Traversal of a Binary Tree | Tree BFS | 987 | Hard | LeetCode discuss (SMTS Aug 2025) | Aug 2025 | ×1 | 🟡 MEDIUM |
| Remove All Adjacent Duplicates in String II | Stack | 1209 | Medium | LeetCode discuss (MTS SDE2) | 2025 | ×1 | 🟡 MEDIUM |
| First Missing Positive | Array | 41 | Hard | LeetCode discuss (MTS SDE2) | 2025 | ×1 | 🟡 MEDIUM |
| Snakes and Ladders (BFS minimum moves) | BFS/Graph | 909 | Medium | LeetCode discuss (MTS Jul 2024) | Jul 2024 | ×2+ | 🟢 HIGH |
| Valid Words from Character Array (dictionary+chars) | HashMap/String | ~383 | Medium | LeetCode discuss (MTS Jul 2024) | Jul 2024 | ×1 | 🟡 MEDIUM |
| Sum of Nodes with Even-Valued Grandparent | Tree DFS | 1315 | Medium | LeetCode discuss (MTS Jul 2024) | Jul 2024 | ×1 | 🟡 MEDIUM |
| Sliding Window (story-form, lengthy narrative) | Sliding Window | ~3/76 | Medium | LeetCode discuss (SMTS May 2024) | Apr 2024 | ×1 | 🟡 MEDIUM |
| Number of Islands | BFS/DFS Grid | 200 | Medium | Glassdoor (SMTS, Jan 2025) | Jan 2025 | ×2+ | 🟢 HIGH |
| Complementary Palindrome Pairs (string OA) | HashMap/Strings | ~266 | Medium | LeetCode discuss (SMTS) | 2025 | ×1 | 🟡 MEDIUM |
| Overlapping Intervals problem | Intervals | ~56/57 | Medium | LeetCode discuss (MTS, 3yr) | 2025 | ×2+ | 🟢 HIGH |
| Graph traversal (BFS/Dijkstra – approach only) | Graph | ~743 | Hard | LeetCode discuss (MTS, 3yr) | 2025 | ×1 | 🟡 MEDIUM |
| Minimum Transactions to Settle Debts | Graph/Greedy | 465 | Hard | LeetCode discuss (MTS, 3yr) | 2025 | ×1 | 🟡 MEDIUM |
| Binary Search + Prefix Sum (max products buyable) | Binary Search/Prefix | custom | Medium | LeetCode discuss (MTS SDE2) | 2025 | ×1 | 🟡 MEDIUM |
| Graph: max distance between nodes | Graph | custom | Med-Hard | LeetCode discuss (MTS SDE2 OA) | 2025 | ×1 | 🟡 MEDIUM |
| Recursion + Backtracking problem (Service Cloud) | Backtracking | Medium | Medium | LeetCode discuss (MTS Sep 2024) | Sep 2024 | ×1 | 🟡 MEDIUM |
| Trapping Rain Water | Two Pointers | 42 | Hard | LeetCode discuss (SMTS bad exp) | 2024 | ×1 | 🟡 MEDIUM |
| 2D DP / CPU task grouping | DP | custom | Hard | frontendinterviewhandbook.com | Oct 2024 | ×1 | 🟡 MEDIUM |
| Longest Common Subsequence variant | DP/Strings | 1143 | Medium | Medium (MTS HackerRank, Jun 2025) | Jun 2025 | ×1 | 🟡 MEDIUM |
| Maximum Even Sum (subset, negatives allowed) | DP/Greedy | custom | Medium | LeetCode discuss (MTS, 3yr OA) | 2025 | ×1 | 🟡 MEDIUM |
| Longest Streak of Consecutive All-Pass Days | Sliding Window | ~485 | Easy-Med | LeetCode discuss (MTS) | 2025 | ×1 | 🟡 MEDIUM |
| High Five Problem (top 5 scores per student) | Heap/Sorting | ~1086 | Easy | frontendinterviewhandbook.com | 2024–25 | ×2 | 🟢 HIGH |

### B. REPEATED PATTERNS (structural, even when exact question differs)

1. **Sliding Window (disguised as narrative)** — SMTS/MTS rounds routinely wrap sliding window in a story ("microservices", "CRM sync windows", "data streams"). Expect to identify the pattern yourself.
2. **BFS on Grid / Graph** — Number of Islands, Snakes and Ladders, Graph traversal appear across every level.
3. **String + HashMap** — Group anagrams, anagram search, character counting, palindrome checks show up in OA and phone screens.
4. **Intervals** — Merge, overlap, scheduling problems appear in both OA and onsite.
5. **Stack problems** — Adjacent duplicates removal, min stack, daily temperatures cluster tightly.
6. **Tree traversal (BFS+DFS)** — Level order, vertical order, right side view, LCA all reported.
7. **Binary Search variation** — Not textbook; applied to answer-range or prefix-sum context.
8. **DP (medium difficulty)** — Coin Change, House Robber, Decode Ways, Max Product Subarray.

### C. HIGH-PROBABILITY (strong inference, not directly reported)

| Problem | LC # | Why High Probability |
|---------|------|---------------------|
| Find All Anagrams in a String | 438 | String+sliding window cluster is the #1 pattern |
| Insert Interval | 57 | Natural follow-up to Merge Intervals (reported) |
| Word Break | 139 | DP+string — frequent at peer companies |
| Path Sum II | 113 | DFS+backtracking on trees; tree pattern cluster |
| Kth Largest Element | 215 | Heap pattern; reported in OA context |
| Clone Graph | 133 | Graph BFS; CRM-relevant (relationship graphs) |
| Longest Common Subsequence | 1143 | DP string; reported as direct HackerRank problem (Jun 2025) |
| Accounts Merge | 721 | Thematically perfect for Salesforce (CRM deduplication) |

---

## 4. Most Frequent DSA Patterns

Ranked by evidence frequency across sources (2023–2025):

### 1. Strings + HashMap / HashSet
**How to recognize:** "find valid words", "anagram", "character count", "palindrome", "complementary", "distinct characters"
**Typical Salesforce question:** Group Anagrams, Valid Words from Character Array, Complementary Palindrome Pairs
**LeetCode examples:** 49, 242, 383, 3, 438
**Common variation:** Replace sorting key with frequency-array key for O(1) keying
**Complexity:** O(n·k log k) with sort key, O(n·k) with count key
**Interviewer expects:** Frequency map, when to sort vs. count, edge case of empty strings

---

### 2. Sliding Window
**How to recognize:** "longest/shortest subarray/substring", "all characters present", "contiguous window", "no repeating"
**Typical Salesforce question:** Longest Substring Without Repeating Characters (verbatim), "longest streak all services passed"
**LeetCode examples:** 3, 76, 438, 567, 485
**Common variation:** Variable window (shrink left when constraint violated) vs. fixed window (size = len(pattern))
**Complexity:** O(n) time, O(charset) space
**Interviewer expects:** Two-pointer mechanics, why you don't re-scan (amortized O(n))

---

### 3. Graph BFS / DFS
**How to recognize:** "connected components", "minimum steps/moves", "grid with paths", "reachable", "shortest path"
**Typical Salesforce question:** Snakes and Ladders (BFS minimum dice throws), Number of Islands, graph traversal with Dijkstra
**LeetCode examples:** 200, 909, 207, 133, 721
**Common variation:** BFS for shortest path; DFS for connectivity/cycle detection
**Complexity:** O(V+E) or O(m·n) for grids
**Interviewer expects:** Queue/stack choice rationale, visited set, complexity analysis

---

### 4. Tree Traversal (BFS + DFS)
**How to recognize:** "level order", "vertical", "right side", "ancestor", "path sum"
**Typical Salesforce question:** Level Order Traversal, Vertical Order Traversal (verbatim SMTS), LCA
**LeetCode examples:** 102, 987, 199, 236, 1315
**Common variation:** BFS with level tracking (queue + size snapshot) vs. DFS with depth tracking
**Complexity:** O(n) time, O(n) space for BFS; O(h) stack for DFS
**Interviewer expects:** Iterative BFS (while queue not empty, snapshot level size)

---

### 5. Intervals
**How to recognize:** "overlapping", "merge windows", "schedule", "meeting rooms", "sync windows"
**Typical Salesforce question:** Merge Intervals, Overlapping Interval problem (reported directly)
**LeetCode examples:** 56, 57, 435, 452
**Common variation:** Sort by start vs. sort by end depending on whether merging or counting
**Complexity:** O(n log n) sorting + O(n) sweep
**Interviewer expects:** Sort first, then single-pass merge with max-end tracking

---

### 6. Stack (Monotonic / Design)
**How to recognize:** "next greater", "adjacent duplicates", "O(1) min/max", "matching brackets"
**Typical Salesforce question:** Remove All Adjacent Duplicates II (verbatim MTS onsite), Daily Temperatures, Min Stack
**LeetCode examples:** 1209, 739, 155, 84
**Common variation:** Monotonic decreasing for "next greater"; design stack with O(1) min
**Complexity:** O(n) amortized (each element pushed/popped once)
**Interviewer expects:** Why stack is the right structure; amortized complexity argument

---

### 7. Binary Search (Applied)
**How to recognize:** "sorted array", "find kth", "minimize the maximum", "search in rotated"
**Typical Salesforce question:** Binary Search + Prefix Sum (max items purchasable with budget), Search in Rotated Sorted Array
**LeetCode examples:** 33, 215, 2779, 875
**Common variation:** Binary search on the answer space (not the index)
**Complexity:** O(log n) or O(n log n) with binary search + O(n) helper
**Interviewer expects:** Invariant statement ("left half is always sorted"), off-by-one care

---

### 8. DP (1D)
**How to recognize:** "ways to reach", "minimum cost", "maximum sum", "decode", "climb"
**Typical Salesforce question:** Coin Change, House Robber, Maximum Product Subarray, Decode Ways, LCS (OA)
**LeetCode examples:** 322, 198, 152, 91, 1143
**Common variation:** Bottom-up with rolling variables (O(1) space) vs. top-down with memo
**Complexity:** O(n) time, O(1)–O(n) space
**Interviewer expects:** State definition first, recurrence second, base cases third

---

### 9. Heap / Priority Queue
**How to recognize:** "top K", "kth largest", "median", "most frequent", "data stream"
**Typical Salesforce question:** Top K Frequent Elements, Kth Largest, Find Median from Data Stream, High Five (top 5 per student)
**LeetCode examples:** 347, 215, 295, 1086
**Common variation:** Min-heap of size k vs. two-heap split for median
**Complexity:** O(n log k) for top-k; O(log n) per insert for median
**Interviewer expects:** Why min-heap of size k works for "top k largest"; two-heap balancing logic

---

### 10. Backtracking
**How to recognize:** "all combinations", "all permutations", "word search on grid", "generate all", "valid paths"
**Typical Salesforce question:** Word Search, Recursion + Backtracking (Service Cloud round), Backtracking problem (Sep 2024)
**LeetCode examples:** 79, 39, 46, 131
**Common variation:** Choose/explore/unchoose pattern; mark visited in-place then unmark
**Complexity:** O(n! or 4^L) worst case
**Interviewer expects:** Pruning explanation, why brute force explodes, how backtracking prunes

---

## 5. LeetCode Pattern + Situation Guide

### MUST-DO Problem Deep Dives

---

#### Problem 1: Two Sum (LC #1)

**Interview situation:** "We have a list of transaction amounts. A client reports an overpayment and tells us the total is X. Find which two transactions sum to that total."

**Pattern:** HashMap lookup

**Recognition signal:**
> "Find a pair summing to target" → **HashMap** (or Two Pointers if sorted)

**Hint 1:** What if you stored what you've already seen?

**Hint 2:** For each number, the complement you need is `target - current`. Check if that complement is already in a map.

**Optimal approach:** Single pass. HashMap maps value → index. For each element, check if `(target - element)` is in the map. If yes, return `[map[complement], i]`. Otherwise, store `element → i`.

**Algorithm:**
1. Initialize `seen = {}`
2. For each `(i, num)` in `nums`:
   - `complement = target - num`
   - If `complement in seen`: return `[seen[complement], i]`
   - Else: `seen[num] = i`

**Time:** O(n) | **Space:** O(n)

**Edge cases:** Duplicate elements, negative numbers, target = 0, single element array (impossible).

**Common mistakes:** Returning values instead of indices; using the same element twice.

**30–60s interview explanation:**
> "I'll use a hash map to store each value and its index as I iterate. For every number, I compute the complement I need. If it's already in the map, I've found my pair. This gives O(n) time with O(n) space, one pass."

**Follow-ups:** What if the array is sorted? → Two pointers, O(1) space. What if you need all pairs? → Collect all, don't return early.

---

#### Problem 2: Longest Substring Without Repeating Characters (LC #3)

**Interview situation:** "Given a log of keystrokes in a session, find the longest contiguous sequence where no key is repeated." *(Reported verbatim at Salesforce SMTS Aug 2025.)*

**Pattern:** Sliding Window (variable)

**Recognition signal:**
> "Longest contiguous substring without X" → **Sliding Window + HashMap**

**Hint 1:** Can you maintain a window that never contains a repeat?

**Hint 2:** Keep a `left` pointer. When you see a repeat, advance `left` past the last occurrence of that character.

**Optimal approach:** Two pointers + last-seen index map.

**Algorithm:**
1. `left = 0`, `maxLen = 0`, `seen = {}`
2. For each `right` from 0 to n-1:
   - If `s[right] in seen` and `seen[s[right]] >= left`: `left = seen[s[right]] + 1`
   - `seen[s[right]] = right`
   - `maxLen = max(maxLen, right - left + 1)`
3. Return `maxLen`

**Time:** O(n) | **Space:** O(min(n, charset)) — at most 128 for ASCII → O(1)

**Edge cases:** Empty string → 0; all same characters → 1; all unique → n.

**Common mistakes:** Forgetting `>= left` check (stale index from before the window).

**30–60s explanation:**
> "Sliding window with two pointers. I extend the right pointer and track the last index of each character. When the character at right already exists inside the current window, I jump left past that character's last position. Space is effectively O(1) because the charset is bounded."

**Follow-ups:** What's the space complexity really? O(1) — bounded by ASCII (26 or 128 chars). → Interviewer specifically asked this at SMTS; correct answer is O(1).

---

#### Problem 3: Number of Islands (LC #200)

**Interview situation:** "We have a map of CRM data regions. Connected active zones form 'territories'. How many distinct territories exist?"

**Pattern:** BFS or DFS on a grid

**Recognition signal:**
> "Count connected groups in a grid" → **BFS/DFS, mark visited**

**Hint 1:** Each unvisited '1' is the start of a new island.

**Hint 2:** From each '1', flood-fill all connected '1's using BFS/DFS and mark them visited.

**Algorithm (DFS):**
1. For each cell `(i,j)`:
   - If `grid[i][j] == '1'`: increment count, DFS from `(i,j)`
2. DFS: mark current cell '0' (visited), recurse on 4 neighbors if in-bounds and '1'
3. Return count

**Time:** O(m·n) | **Space:** O(m·n) recursion stack (or O(min(m,n)) BFS queue)

**Edge cases:** Empty grid, all water, single cell.

**Common mistakes:** Not checking bounds before recursing; modifying input when not allowed (use a `visited` set instead).

**30–60s explanation:**
> "DFS/BFS grid traversal. For every unvisited land cell, I start a new DFS that marks all connected land as visited. The number of times I start a new DFS equals the number of islands. Time is O(m·n) — every cell is visited at most once."

**Follow-ups:** Use Union-Find instead. → Same O(m·n·α(n)) time. What if you can't modify the input? → Use a boolean `visited` matrix.

---

#### Problem 4: Merge Intervals (LC #56)

**Interview situation:** "We have data sync windows for CRM accounts. Two windows that overlap should be merged into one combined window. Return the minimal set of windows."

**Pattern:** Sort + Greedy sweep on Intervals

**Recognition signal:**
> "Overlapping ranges, merge, schedule" → **Sort by start, single-pass greedy**

**Hint 1:** What if you sorted by start time first?

**Hint 2:** After sorting, if the next interval starts before the current one ends, extend the end. Otherwise, it's a new interval.

**Algorithm:**
1. Sort `intervals` by `start`
2. Push first interval into `result`
3. For each interval `[s, e]`:
   - If `s <= result.last.end`: `result.last.end = max(result.last.end, e)` (extend)
   - Else: push `[s, e]` as new interval
4. Return `result`

**Time:** O(n log n) | **Space:** O(n)

**Edge cases:** Single interval; all overlapping → one interval; no overlaps → same as input.

**Common mistakes:** Forgetting `max(...)` when extending — a contained interval doesn't extend the end.

**30–60s explanation:**
> "Sort by start time, then single pass. I maintain the last merged interval. If the next interval's start is within the last interval's end, I extend the end. Otherwise I push a new interval. Sorting is the dominant cost: O(n log n)."

**Follow-ups:** Insert Interval (LC #57) — insert a new interval and re-merge in O(n) since already sorted.

---

#### Problem 5: LRU Cache (LC #146)

**Interview situation:** "Design a caching layer for Salesforce CRM that evicts the least recently used entry when at capacity." *(Highest-frequency LLD question in Salesforce.)*

**Pattern:** Doubly Linked List + HashMap

**Recognition signal:**
> "O(1) get and put, evict LRU" → **HashMap + Doubly Linked List**

**Hint 1:** HashMap gives O(1) lookup. But how do you know which is LRU?

**Hint 2:** A doubly linked list maintains order. Moving a node to the front is O(1) if you have a direct pointer to it.

**Algorithm:**
1. HashMap: `key → Node`; Doubly Linked List: head (most recent) → ... → tail (least recent)
2. Add sentinel `head` and `tail` nodes to avoid null checks
3. `get(key)`: If in map, move node to front, return value. Else return -1.
4. `put(key, val)`: If key exists, update value, move to front. Else create node, insert at front, add to map. If over capacity, remove tail node and delete its key from map.

**Time:** O(1) per operation | **Space:** O(capacity)

**30–60s explanation:**
> "HashMap for O(1) lookup and a doubly linked list for O(1) reordering. Most-recently-used is the head; LRU is the tail. On every get or put, I move the accessed node to the head. On capacity overflow, I remove the tail node. Sentinel head and tail simplify boundary logic."

**Follow-ups:** LFU Cache (LC #460) — track access frequency, not recency.

---

#### Problem 6: Remove All Adjacent Duplicates in String II (LC #1209)

**Interview situation:** "A log compression algorithm removes k consecutive identical characters repeatedly until no more k-consecutive runs exist."

**Pattern:** Stack

**Recognition signal:**
> "Remove k consecutive duplicates repeatedly" → **Stack of (char, count) pairs**

**Hint 1:** Can you track the current run length as you scan?

**Hint 2:** Use a stack of `(character, count)` pairs. When count hits k, pop.

**Algorithm:**
1. `stack = []` of `(char, count)`
2. For each `char` in string:
   - If `stack` not empty and `stack.top.char == char`: increment `stack.top.count`
   - Else: push `(char, 1)`
   - If `stack.top.count == k`: pop
3. Reconstruct string from stack

**Time:** O(n) | **Space:** O(n)

**Edge cases:** k=1 → all chars removed; no repeats → string unchanged.

---

#### Problem 7: First Missing Positive (LC #41)

**Interview situation:** "Given a list of user IDs that have been allocated, find the smallest positive ID not yet in use."

**Pattern:** Array as Index (cyclic sort / in-place hashing)

**Recognition signal:**
> "Smallest missing positive, O(1) space, O(n) time" → **Use array indices as a hash table**

**Hint 1:** The answer must be in range [1, n+1]. So you only care about values 1 to n.

**Hint 2:** For every valid value v (1 ≤ v ≤ n), place it at index v-1 (cyclic sort). Then find the first index where `nums[i] != i+1`.

**Algorithm:**
1. Cyclic sort: while `nums[i] >= 1 and nums[i] <= n and nums[nums[i]-1] != nums[i]`: swap `nums[i]` and `nums[nums[i]-1]`
2. Scan: first index where `nums[i] != i+1` → return `i+1`
3. If all correct → return `n+1`

**Time:** O(n) | **Space:** O(1)

**Edge cases:** Array with all negatives → 1; array = [1,2,3,...,n] → n+1.

---

#### Problem 8: Snakes and Ladders (LC #909)

**Interview situation:** "In a board game with shortcuts and penalties, find the minimum dice throws to reach the end."

**Pattern:** BFS (shortest path, unweighted graph)

**Recognition signal:**
> "Minimum moves on a board with teleports" → **BFS from source to destination**

**Hint 1:** Each cell is a node; each dice roll is an edge.

**Hint 2:** BFS guarantees minimum steps. Handle Boustrophedon cell numbering carefully (rows alternate left-right direction).

**Algorithm:**
1. Flatten board: `cell_number → board_value` using Boustrophedon traversal
2. BFS from cell 1, level = dice throws
3. For each cell, try moves 1–6. If destination has snake/ladder, jump to its target.
4. If cell == n*n, return level

**Time:** O(n²) | **Space:** O(n²)

**Edge cases:** Cell 1 itself has a snake/ladder; n=2 minimal board.

---

#### Problem 9: Course Schedule (LC #207)

**Interview situation:** "Given prerequisites between features, determine whether all features can be shipped without circular dependencies."

**Pattern:** Cycle detection in directed graph (DFS 3-color or Kahn's BFS)

**Recognition signal:**
> "Dependencies, can you complete all, prerequisite" → **Topological sort / Cycle detection**

**Hint 1:** Model courses as nodes, prerequisites as directed edges. A cycle = impossible.

**Hint 2:** DFS with 3 states: 0=unvisited, 1=in-progress, 2=done. If you reach a node in state 1, there's a cycle.

**Algorithm (Kahn's BFS):**
1. Build adjacency list + in-degree array
2. Queue all nodes with in-degree 0
3. While queue not empty: dequeue node, decrement neighbors' in-degrees, enqueue any that reach 0
4. If total processed == numCourses → no cycle → return true

**Time:** O(V+E) | **Space:** O(V+E)

---

#### Problem 10: Top K Frequent Elements (LC #347)

**Interview situation:** "From CRM usage telemetry, return the K most frequently used features."

**Pattern:** HashMap + Min-Heap of size k

**Recognition signal:**
> "Top K most frequent / largest" → **Min-heap of size k**

**Hint 1:** Count frequencies with a HashMap.

**Hint 2:** Maintain a min-heap of size k. If heap exceeds k, pop the minimum. The heap holds the top k.

**Algorithm:**
1. Build `freq` map: `element → count`
2. Min-heap of size k on `(count, element)`
3. For each entry: push to heap; if `heap.size > k`: pop min
4. Return heap elements

**Time:** O(n log k) | **Space:** O(n)

**Alternative:** Bucket sort — frequency buckets 1..n, collect from highest bucket down → O(n)

---

## 6. Brute Force → Optimal Thinking

### Example: Longest Substring Without Repeating Characters

**1. Brute Force:**
Try every pair (i, j). Check if substring s[i..j] has all unique chars. Track max length. O(n³) time.

**2. Why it's inefficient:**
Re-checking character uniqueness from scratch for every window. Doesn't reuse work done for the previous window.

**3. How to see the pattern:**
"If s[i..j] is valid but s[i..j+1] is not, I don't need to restart from i+1 — I just need to advance i past the duplicate."

**4. Optimal:** Sliding window with last-seen index map. O(n).

**5. Why it works:**
The map tells us exactly where the duplicate was last seen. We jump `left` past it, never re-scanning.

**6. Complexity improvement:** O(n³) → O(n). From cubic to linear.

---

### Example: Two Sum

**1. Brute Force:** Try all pairs. O(n²).

**2. Why inefficient:** Re-scans previously seen elements.

**3. Pattern recognition:** "For each element, I need to know if its complement exists among elements seen so far." → HashMap.

**4. Optimal:** Single pass, HashMap. O(n).

**5. Why it works:** HashMap makes "does complement exist?" O(1).

**6. Improvement:** O(n²) → O(n).

---

### Example: Merge Intervals

**1. Brute Force:** For every pair of intervals, check overlap, merge. Repeat until stable. O(n² · iterations).

**2. Why inefficient:** Rescans all pairs; doesn't exploit structure.

**3. Pattern recognition:** "If I sort by start, I only need to compare with the last merged interval." → Single pass after sort.

**4. Optimal:** Sort + O(n) sweep. O(n log n).

**5. Why it works:** Sorting ensures that if two intervals overlap, they will be adjacent in the sorted order.

**6. Improvement:** O(n²) → O(n log n).

---

## 7. Salesforce Interview Context

### By Level

| Level | OA Difficulty | DSA Rounds | LLD | HLD | Typical LC Level |
|-------|--------------|------------|-----|-----|-----------------|
| AMTS (New Grad) | Medium | 1–2 pure DSA | Sometimes | No | Easy–Medium |
| MTS (SDE2, 2–5yr) | Medium | 1–2 DSA + 1 DSA+LLD | Yes (LRU Cache/Parking Lot) | Sometimes | Medium |
| SMTS (Senior, 5+ yr) | Medium-Hard | 1–2 DSA + LLD + HLD | Yes | Yes (Google Docs, Notification System) | Medium–Hard |
| LMTS+ | Hard | Varies | Yes | Yes (system-scale) | Hard |

### OA vs. Live Coding

- **OA (HackerRank):** 60–90 minutes, 2 problems, 80%+ test cases required. Automated. All test cases matter — include edge cases.
- **Live coding (CoderPad/HackerRank):** Interviewer watches. Explain approach first, code second. They probe complexity, ask follow-ups, give hints if stuck.

### India vs. US

- India (Hyderabad/Bangalore): **DSA-heavy**, hiring drives common, same-day multi-round format. MTS adds LLD.
- US (San Francisco): More varied — can include front-end (JS), system design at SWE-level. Confirm with recruiter whether you'll face front-end questions.

### Key Salesforce-Specific Context

- Questions are sometimes **wrapped in CRM scenarios** ("sync windows" = intervals; "CRM contact deduplication" = graph/union-find; "usage analytics" = top-k heap).
- **Interviewers score structured communication** as a first-class signal — not just code correctness.
- LLD favorites: **LRU Cache** (most reported), **Parking Lot**, **Tic-Tac-Toe**, **Task Scheduler**.

---

## 8. Two-Day Preparation Plan

### DAY 1 — Foundations

#### 08:00–09:00 | Arrays + Prefix
- **Solve:** Product of Array Except Self (238), Maximum Product Subarray (152)
- **Pattern:** Prefix/suffix product, DP on arrays
- **Understand:** Why division is not used; how left-pass + right-pass combine
- **Memorize:** The two-pass prefix pattern
- **Solve without hints:** Rotate Array (189)

#### 09:00–10:30 | Strings + HashMap
- **Solve:** Group Anagrams (49), Find All Anagrams in a String (438), Valid Anagram (242)
- **Pattern:** Frequency map as key; sliding window with character counts
- **Understand:** Sorted-string key vs. frequency-array key tradeoff
- **Memorize:** The `matches` counter trick for fixed sliding window
- **Solve without hints:** Minimum Window Substring (76)

#### 10:30–11:30 | Two Pointers + Sliding Window
- **Solve:** Longest Substring Without Repeating Characters (3), 3Sum (15), Trapping Rain Water (42)
- **Pattern:** Variable window; sorted two-pointer; two-side inward pointers
- **Understand:** When to use sliding window vs. two pointers
- **Memorize:** The `left = max(left, lastSeen[c]+1)` stale-index fix

#### 11:30–12:30 | Stack + Queue
- **Solve:** Daily Temperatures (739), Min Stack (155), Remove All Adjacent Duplicates II (1209)
- **Pattern:** Monotonic stack; design stack; (char, count) stack
- **Understand:** Why monotonic stack is O(n) amortized
- **Solve without hints:** Valid Parentheses (20)

#### 13:30–14:30 | Binary Search
- **Solve:** Search in Rotated Sorted Array (33), Find First and Last Position (34), Kth Largest Element (215)
- **Pattern:** Modified binary search; binary search on answer space
- **Understand:** The invariant ("which half is always sorted"); off-by-one care
- **Memorize:** Template: `while l <= r: mid = (l+r)//2`

#### 14:30–16:00 | Linked List
- **Solve:** Linked List Cycle (141), Remove Nth Node from End (19), Reorder List (143)
- **Pattern:** Fast/slow pointers; dummy head; in-place reversal
- **Understand:** Why dummy head simplifies deletion at head
- **Solve without hints:** Middle of Linked List (876)

#### 16:00–18:00 | Trees (DFS + BFS)
- **Solve:** Binary Tree Level Order Traversal (102), Vertical Order Traversal (987), LCA of Binary Tree (236), Binary Tree Right Side View (199), Path Sum II (113)
- **Pattern:** BFS with level snapshot; DFS post-order for LCA; DFS backtracking for paths
- **Understand:** BFS level-order template (snapshot queue size at start of each level)
- **Memorize:** DFS 3-return-cases: null/p/q found / both non-null = LCA / propagate non-null
- **Solve without hints:** Maximum Depth of Binary Tree (104)

#### 18:00–19:00 | Review Day 1
- Re-check complexities for all problems solved
- Note patterns on your cheat sheet
- Flag any problem you couldn't solve → mark for Day 2 review

---

### DAY 2 — Advanced + Mock

#### 08:00–09:30 | Graphs
- **Solve:** Number of Islands (200), Course Schedule (207), Accounts Merge (721), Snakes and Ladders (909)
- **Pattern:** BFS for shortest path; DFS 3-color cycle detection; Union-Find; BFS on game board
- **Understand:** When to use BFS vs DFS; Union-Find path compression
- **Memorize:** Kahn's BFS topo sort: in-degree array + queue

#### 09:30–10:30 | Heap
- **Solve:** Top K Frequent Elements (347), Find Median from Data Stream (295), Kth Largest in Stream
- **Pattern:** Min-heap of size k; two-heap split for median
- **Understand:** Why min-heap of size k gives top-k largest
- **Memorize:** Two-heap invariant: size difference ≤ 1; max-heap is left (lower half)

#### 10:30–11:30 | Intervals
- **Solve:** Merge Intervals (56), Insert Interval (57), Non-Overlapping Intervals (435), Meeting Rooms II (253)
- **Pattern:** Sort by start; single-pass greedy; min-heap end tracking
- **Understand:** Sort by start for merging; sort by end for counting (minimum arrows)

#### 11:30–13:00 | Backtracking
- **Solve:** Word Search (79), Combination Sum (39), Letter Combinations of Phone Number (17)
- **Pattern:** Choose → Explore → Un-choose
- **Understand:** Why backtracking is exponential; how pruning reduces practical complexity
- **Solve without hints:** Subsets (78)

#### 14:00–16:00 | Dynamic Programming
- **Solve:** Coin Change (322), House Robber (198), Decode Ways (91), Unique Paths (62), Climbing Stairs (70), LCS (1143)
- **Pattern:** 1D DP with rolling vars; 2D grid DP; string DP
- **Understand:** State definition → recurrence → base cases → space optimization
- **Memorize:** Coin Change: `dp[i] = min(dp[i], dp[i-coin]+1)` for each coin

#### 16:00–17:00 | Mixed Problems (simulate real pressure)
- Solve 2 random problems from your MUST list under timed conditions (30 min each)
- Do not look at hints

#### 17:00–19:00 | SALESFORCE-STYLE MOCK INTERVIEW (see Section 12)
- Pick 2 problems from the FINAL 20
- Ask yourself the interview questions, code on paper or in editor without autocomplete
- Time yourself: 20–25 minutes per problem
- Evaluate your own solution: complexity, edge cases, follow-up

---

## 9. Three-Hour Final Revision

### 0–30 min | Pattern Flash Review
Read your cheat sheet (Section 10). For each pattern, say the recognition signal aloud. No coding.

### 30–60 min | Top 5 Problems Speed Review
Re-read your own solutions to: Two Sum, LSWR, Number of Islands, Merge Intervals, LRU Cache.
Don't re-code. Read the algorithm steps and verify complexity.

### 60–90 min | Complexity Drill
Go through every MUST-DO problem. Say aloud: "Time is O(?), Space is O(?), because..."
If you hesitate on any, re-read that problem's section.

### 90–120 min | Edge Cases Drill
For each MUST-DO problem, list:
- Empty / null input
- Single element
- All same elements
- Negative numbers (where applicable)
- Size 0 vs size 1 vs size 2

### 120–150 min | Communication Practice
Pick 3 problems. Practice saying the 30–60s explanation from memory (see Section 5).
Simulate the interviewer asking: "What's the time complexity? Can you do better? What if the input was sorted?"

### 150–180 min | Rest + Mental Prep
Close the laptop. Do not cram new problems. Review the cheat sheet one more time (5 min). Sleep/rest.

---

## 10. One-Page DSA Cheat Sheet

| If interviewer says... | Think... | Pattern | Approach |
|------------------------|----------|---------|----------|
| "Find a pair/two numbers summing to X" | HashMap complement | **HashMap** | `seen[complement]` check; one pass |
| "Find a triplet/three numbers summing to X" | Sort + Two Pointers | **Two Pointers** | Fix one, two-pointer the rest |
| "Longest/shortest contiguous subarray/substring" | Grow right, shrink left | **Sliding Window** | Two pointers + map/count |
| "All characters present, minimum window" | Fixed or variable window | **Sliding Window** | `need` counter + `have` counter |
| "No repeating / all unique" | Sliding window + last-seen | **Sliding Window** | `left = max(left, lastSeen[c]+1)` |
| "Sorted array, find target" | Binary search invariant | **Binary Search** | Which half is sorted? Check target in sorted half |
| "Rotated sorted array" | Modified binary search | **Binary Search** | Determine sorted half first |
| "Minimize maximum / maximum minimum" | Binary search on answer | **Binary Search on Range** | `feasible(mid)` function |
| "Top K largest/frequent" | Min-heap of size k | **Heap** | Push all, pop when size > k |
| "Median of stream / sliding median" | Two heaps | **Heap** | Max-heap (lower) + min-heap (upper) |
| "Next greater element" | Monotonic stack | **Stack** | Decrease stack; pop when greater found |
| "Adjacent duplicates / balanced parentheses" | Stack | **Stack** | Push/pop char or count |
| "O(1) min/max with push/pop" | Two stacks | **Stack** | Auxiliary min/max stack |
| "Linked list cycle / meeting point" | Fast/slow pointers | **Linked List** | Floyd's detection |
| "kth from end of list" | Two pointers offset k | **Linked List** | Advance fast by k, then both |
| "Level order / BFS traversal" | Queue + level size | **Tree BFS** | Snapshot queue.size at level start |
| "Path sum / root-to-leaf" | DFS recursion | **Tree DFS** | Subtract target; check leaf |
| "Ancestor / LCA" | Post-order DFS | **Tree DFS** | Return node when found; both = LCA |
| "Connected components / islands" | DFS/BFS flood fill | **Graph DFS/BFS** | Mark visited; count starts |
| "Shortest path / minimum moves/steps" | BFS layer by layer | **Graph BFS** | Queue + distance array |
| "Dependencies / cycle / can complete all" | Topological sort | **Graph Topo** | In-degree + Kahn's BFS or DFS 3-color |
| "Overlapping intervals / merge / schedule" | Sort by start, sweep | **Intervals** | Extend end if overlap; else new interval |
| "Minimum arrows/rooms / non-overlapping" | Sort by end, greedy | **Intervals** | Count overlaps at peak |
| "All subsets / permutations / combinations" | Recurse + undo | **Backtracking** | Choose → explore → unchoose |
| "Word search on grid" | DFS + in-place mark | **Backtracking** | Mark '#', recurse, unmark |
| "Ways to reach / minimum cost / max sum" | DP state + recurrence | **Dynamic Programming** | Define state → recurrence → base |
| "Subarray product / sum" | Prefix product/sum | **Prefix** | `prefix[i] = prefix[i-1] * nums[i]` |
| "Minimum coins / fewest steps" | BFS or DP | **DP / BFS** | BFS = unweighted; DP = subproblem |
| "Greedy choice / always take the local best" | Sort + greedy | **Greedy** | Prove exchange argument |
| "Find duplicate / missing in [1..n]" | Index-as-hash or XOR | **Array** | Cyclic sort or Floyd's cycle |
| "Median, kth element, percentile" | Quickselect or Heap | **Heap/Quickselect** | Heap O(n log k); Quickselect O(n) avg |

---

## 11. Coding Interview Communication

### Reusable Structure

**1. Clarify the problem (30–60 seconds)**
> "Let me make sure I understand. We're given [X] and need to return [Y]. A few quick questions: Can the input be empty? Can values be negative? Do we care about duplicates? Should I return indices or values?"

**2. State assumptions**
> "I'll assume the input is non-empty, values can be any integer, and we can use extra space. Let me know if any of those change."

**3. Explain brute force first**
> "The naive approach would be [describe O(n²) or exponential]. This works but is too slow because [reason]. Let me think about how to optimize."

**4. Identify the pattern**
> "The key insight is [pattern]. I can use a [data structure/algorithm] to [what it gives you]."

**5. Explain optimal approach**
> "My plan: [2–3 sentences describing algorithm]. This gives O([time]) time and O([space]) space."

**6. Walk through an example**
> "Let me trace through [small example]. Starting with [initial state]... after step 1 we have [state]... final answer is [X]. That matches."

**7. Code**
> "I'll start coding now." ← Say this before you start. Don't code silently.

**8. Test edge cases while coding (or after)**
> "I want to check: what if the input is empty? [trace]. What if all elements are the same? [trace]."

**9. State complexity**
> "Time complexity is O([T]) because [reason]. Space is O([S]) because [reason]."

**10. Discuss improvements / follow-ups**
> "If the array were sorted, we could use two pointers to reduce space to O(1). If we needed to handle [X], we could extend this by [Y]."

### Example Sentences for Each Step

- *Clarifying:* "Can the same element appear twice in the output?" / "Is the array guaranteed to be sorted?" / "What should I return if there's no valid answer?"
- *Brute force:* "The obvious O(n²) approach would be..." / "A naive solution would try every pair..."
- *Pattern ID:* "This looks like a sliding window problem because we want a contiguous window satisfying a constraint." / "The subproblems overlap, which points to DP."
- *Before coding:* "Let me lay out the algorithm in steps before I write code." / "I'll code the main logic first and handle edge cases after."
- *Complexity:* "Each element is pushed and popped at most once, so the amortized cost is O(n) total, not O(n) per element."
- *Follow-up:* "If the interviewer wanted me to also return the actual elements, I would..."

---

## 12. Salesforce-Style Mock Interview

**Rules:** Look only at the question, topic, and pattern. Don't read solutions yet.

| # | Question | Difficulty | Topic | Pattern |
|---|----------|------------|-------|---------|
| 1 | A service reports health status each day as Y/N for M microservices. Find the longest streak of consecutive days where all M passed. | Easy-Med | Strings/Arrays | Sliding Window |
| 2 | Given a HackerRank OA: find the minimum number of moves to make two arrays identical where a move = increment or decrement one digit of one element. | Medium | Arrays | Simulation/Greedy |
| 3 | Count all valid words from a dictionary that can be formed using only characters from a given character array (each char can only be used as many times as it appears). | Medium | HashMap/Strings | Frequency Map |
| 4 | Design an LRU Cache with capacity N. Implement get() and put() in O(1). | Medium | Design | DLL + HashMap |
| 5 | Given a board of transactions A → B: amount, find the minimum number of transactions to settle all debts. | Hard | Graph/Backtracking | Backtracking/Greedy |
| 6 | Given an array of integers and a window size k, return the maximum for each window of size k. | Medium | Queue | Monotonic Deque |
| 7 | Given N courses and a prerequisite list, return a valid course ordering or [] if impossible. | Medium | Graph | Topological Sort |
| 8 | Find all starting indices of anagram of P in S. | Medium | Strings | Sliding Window |
| 9 | Implement a thread-safe task scheduler that runs tasks with dependencies in valid order. (LLD) | Hard | Design/Concurrency | Topo Sort + Lock |
| 10 | Given multiple accounts [name, email, email,...], merge accounts sharing any email. Return sorted. | Medium | Graph/Union-Find | Union-Find |

**How to use these:** Attempt each problem in 20–25 minutes. After, evaluate:
- Did you identify the pattern within 3 minutes?
- Did you explain the approach before coding?
- Did you state the correct time and space complexity?
- Did you handle edge cases (empty input, duplicates, negatives)?
- Can you answer: "What if we had to handle 10x the data?"

---

## 13. THE FINAL 20

These 20 problems, ranked by evidence + pattern frequency + Salesforce specificity.

| # | Problem | LC # | Pattern | Difficulty | Why Important | Confidence |
|---|---------|------|---------|------------|---------------|------------|
| 1 | Longest Substring Without Repeating Characters | 3 | Sliding Window | Medium | **Reported verbatim at SMTS Aug 2025**; highest-freq pattern | 🟢 HIGH |
| 2 | Number of Islands | 200 | BFS/DFS Grid | Medium | **Reported in Glassdoor SMTS**; core graph problem | 🟢 HIGH |
| 3 | LRU Cache | 146 | Design+DLL | Medium | **Most reported LLD question**; in virtually every MTS/SMTS loop | 🟢 HIGH |
| 4 | Snakes and Ladders | 909 | BFS | Medium | **Reported verbatim MTS Jul 2024** | 🟢 HIGH |
| 5 | Merge Intervals | 56 | Intervals+Sort | Medium | **Reported in OA and onsite** across multiple sources | 🟢 HIGH |
| 6 | Group Anagrams | 49 | HashMap | Medium | String+hash cluster; highly repeated in phone screens | 🟢 HIGH |
| 7 | Two Sum | 1 | HashMap | Easy | Universal warm-up; always a follow-up risk if you miss it | 🟢 HIGH |
| 8 | Find All Anagrams in a String | 438 | Sliding Window | Medium | String+sliding window cluster; second-highest pattern | 🟢 HIGH |
| 9 | Remove All Adjacent Duplicates II | 1209 | Stack | Medium | **Reported verbatim MTS SDE2 onsite 2025** | 🟢 HIGH |
| 10 | First Missing Positive | 41 | Array | Hard | **Reported verbatim MTS SDE2 onsite 2025** | 🟢 HIGH |
| 11 | Vertical Order Traversal of Binary Tree | 987 | Tree BFS | Hard | **Reported verbatim SMTS Aug 2025** | 🟢 HIGH |
| 12 | Binary Tree Level Order Traversal | 102 | Tree BFS | Medium | Core tree pattern; prerequisite to Q11; universally reported | 🟢 HIGH |
| 13 | Course Schedule | 207 | Graph/Topo | Medium | Dependency/cycle pattern; heavily reported across companies | 🟡 MEDIUM |
| 14 | Top K Frequent Elements | 347 | Heap | Medium | Heap cluster; reported in CRM analytics framing | 🟡 MEDIUM |
| 15 | Coin Change | 322 | DP | Medium | Canonical DP; reported in OA and onsite DP rounds | 🟡 MEDIUM |
| 16 | Product of Array Except Self | 238 | Prefix Product | Medium | Tricky constraint (no division); tests depth of understanding | 🟡 MEDIUM |
| 17 | Word Search | 79 | Backtracking | Medium | Backtracking cluster; reported in Service Cloud round | 🟡 MEDIUM |
| 18 | Search in Rotated Sorted Array | 33 | Binary Search | Medium | Binary search variation; reported in SMTS DSA round | 🟡 MEDIUM |
| 19 | Maximum Product Subarray | 152 | DP/Array | Medium | **Reported in Salesforce OA directly** | 🟡 MEDIUM |
| 20 | Accounts Merge | 721 | Union-Find | Medium | Thematically Salesforce-native (CRM dedup); tests graph depth | 🟡 MEDIUM |

### If you have only 3 hours → Solve these 5:
**#1, #2, #3, #5, #6** — Sliding Window + Graph BFS + Design + Intervals + String HashMap

### If you have only 6 hours → Solve these 10:
**#1, #2, #3, #4, #5, #6, #7, #8, #9, #12** — Add: Snakes+Ladders, Two Sum, Anagram Find, Adjacent Duplicates, BFS Tree

### If you have one full day → Solve all 20.

---

## 14. Sources and Evidence

| Source | Type | Reliability |
|--------|------|-------------|
| LeetCode Discuss — MTS Jul 2024 (leetcode.com/discuss/post/5526715) | Candidate interview report | High — detailed, specific problem links |
| LeetCode Discuss — MTS SDE2 2025 (leetcode.com/discuss/post/7596924) | Candidate interview report | High — verbatim problem links |
| LeetCode Discuss — SMTS Aug 2025 (leetcode.com/discuss/interview-experience/7049872) | Candidate interview report | High — verbatim LeetCode problem names |
| LeetCode Discuss — MTS 3yr (leetcode.com/discuss/post/7350401) | Candidate interview report | High — multi-round detail |
| LeetCode Discuss — SMTS May 2024 (leetcode.com/discuss/5285649) | Candidate interview report | High — sliding window verbatim |
| LeetCode Discuss — Bad SMTS experience (LC 6022738) | Candidate report | Medium — negative experience, hard problems |
| LeetCode Discuss — SMTS Interview (LC 7619394) | Candidate report | Medium — palindrome pair OA, LLD |
| Medium — Salesforce MTS Jun 2025 by Imran Wahid | Candidate blog | High — HackerRank link details |
| Let's Code — Salesforce PYQ (lets-code.co.in) | Aggregator + interview synthesis | Medium — aggregated but well-sourced |
| Glassdoor — SMTS Software Engineer (glassdoor.co.in) | Candidate reviews | Medium — verified employer reviews |
| Frontend Interview Handbook — Salesforce (frontendinterviewhandbook.com) | Research compilation | Medium — multi-candidate synthesis |
| GeeksforGeeks — Salesforce SDE Intern 2024 | Candidate blog | Medium — campus/intern specific |
| Medium/Codess.Cafe — SDE Intern (2023) | Candidate blog | Medium — older but patterns consistent |
| CodeJeet — Salesforce LeetCode tags | Tag aggregation | Low-Medium — algorithmic, not reported |
| interviewing.io — Salesforce guide | Practitioner research | Medium — cross-candidate data |

**Important disclaimers:**
- No question is guaranteed to appear. Interview content varies by team, interviewer, and date.
- Confidence ratings reflect how often and how specifically a problem or pattern was mentioned across independent sources.
- Older reports (2023) are included only where the pattern is strongly corroborated by more recent evidence.
- LeetCode discuss posts are from anonymous candidates; reports cannot be independently verified.

---

*Last updated from web research: August 2026. Good luck — you've got this.*
