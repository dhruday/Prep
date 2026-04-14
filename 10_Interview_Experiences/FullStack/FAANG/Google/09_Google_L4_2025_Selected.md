# Google — SDE-2 Interview Experience (2025) — #9

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer III |
| **Level** | L4 |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Behavioral)
- **Timeline:** 3 weeks
- **Team Matching:** Post-approval, matched with Google Pay team

---

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Course Schedule II** (LeetCode 210) — Topological Sort with BFS
2. **Follow-up: Detect which courses form the cycle if schedule is impossible**

### 💡 Interview-Ready Answer

```java
public int[] findOrder(int numCourses, int[][] prerequisites) {
    // Build graph + in-degree
    List<List<Integer>> graph = new ArrayList<>();
    int[] inDegree = new int[numCourses];
    
    for (int i = 0; i < numCourses; i++) graph.add(new ArrayList<>());
    
    for (int[] pre : prerequisites) {
        graph.get(pre[1]).add(pre[0]); // pre[1] → pre[0]
        inDegree[pre[0]]++;
    }
    
    // BFS: start with all nodes that have inDegree = 0
    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numCourses; i++) {
        if (inDegree[i] == 0) queue.offer(i);
    }
    
    int[] result = new int[numCourses];
    int idx = 0;
    
    while (!queue.isEmpty()) {
        int course = queue.poll();
        result[idx++] = course;
        
        for (int next : graph.get(course)) {
            if (--inDegree[next] == 0) {
                queue.offer(next);
            }
        }
    }
    
    return idx == numCourses ? result : new int[0]; // Empty if cycle exists
}

// Follow-up: Find courses in the cycle
public List<Integer> findCycleCourses(int numCourses, int[][] prerequisites) {
    // After Kahn's BFS: courses with inDegree > 0 are in/connected to cycles
    // ... (run topological sort first, then)
    List<Integer> cycleNodes = new ArrayList<>();
    for (int i = 0; i < numCourses; i++) {
        if (inDegree[i] > 0) cycleNodes.add(i);
    }
    return cycleNodes;
}
```

---

## Round 2: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Swim in Rising Water** (LeetCode 778) — Binary Search + BFS / Dijkstra

### 💡 Interview-Ready Answer

```java
// Approach 1: Binary Search on answer + BFS verification
public int swimInWater(int[][] grid) {
    int n = grid.length;
    int lo = grid[0][0], hi = n * n - 1;
    
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (canReach(grid, n, mid)) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    return lo;
}

private boolean canReach(int[][] grid, int n, int t) {
    if (grid[0][0] > t) return false;
    
    boolean[][] visited = new boolean[n][n];
    Queue<int[]> queue = new LinkedList<>();
    queue.offer(new int[]{0, 0});
    visited[0][0] = true;
    
    int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}};
    while (!queue.isEmpty()) {
        int[] curr = queue.poll();
        if (curr[0] == n - 1 && curr[1] == n - 1) return true;
        
        for (int[] d : dirs) {
            int nr = curr[0] + d[0], nc = curr[1] + d[1];
            if (nr >= 0 && nr < n && nc >= 0 && nc < n && !visited[nr][nc] && grid[nr][nc] <= t) {
                visited[nr][nc] = true;
                queue.offer(new int[]{nr, nc});
            }
        }
    }
    return false;
}

// Approach 2: Dijkstra (optimal) — find min bottleneck path
public int swimInWaterDijkstra(int[][] grid) {
    int n = grid.length;
    int[][] minTime = new int[n][n];
    for (int[] row : minTime) Arrays.fill(row, Integer.MAX_VALUE);
    
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[2] - b[2]);
    pq.offer(new int[]{0, 0, grid[0][0]});
    minTime[0][0] = grid[0][0];
    
    int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}};
    
    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        int r = curr[0], c = curr[1], t = curr[2];
        
        if (r == n - 1 && c == n - 1) return t;
        if (t > minTime[r][c]) continue;
        
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                int newTime = Math.max(t, grid[nr][nc]); // Bottleneck = max along path
                if (newTime < minTime[nr][nc]) {
                    minTime[nr][nc] = newTime;
                    pq.offer(new int[]{nr, nc, newTime});
                }
            }
        }
    }
    return -1;
}
```

---

## Round 3: Coding 2
**Duration:** 45 minutes

### Questions Asked
1. **Number of Islands II** (LeetCode 305) — Union-Find with dynamic grid

### 💡 Interview-Ready Answer

```java
public List<Integer> numIslands2(int m, int n, int[][] positions) {
    int[] parent = new int[m * n];
    int[] rank = new int[m * n];
    Arrays.fill(parent, -1); // -1 = water
    
    List<Integer> result = new ArrayList<>();
    int count = 0;
    int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}};
    
    for (int[] pos : positions) {
        int r = pos[0], c = pos[1];
        int id = r * n + c;
        
        if (parent[id] != -1) {
            result.add(count); // Duplicate position
            continue;
        }
        
        parent[id] = id; // Mark as land
        rank[id] = 0;
        count++;
        
        // Try to union with 4 neighbors
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            int nid = nr * n + nc;
            
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && parent[nid] != -1) {
                if (union(parent, rank, id, nid)) {
                    count--; // Merged two islands
                }
            }
        }
        
        result.add(count);
    }
    
    return result;
}

private int find(int[] parent, int x) {
    if (parent[x] != x) parent[x] = find(parent, parent[x]); // Path compression
    return parent[x];
}

private boolean union(int[] parent, int[] rank, int a, int b) {
    int ra = find(parent, a), rb = find(parent, b);
    if (ra == rb) return false; // Already same set
    
    // Union by rank
    if (rank[ra] < rank[rb]) { int tmp = ra; ra = rb; rb = tmp; }
    parent[rb] = ra;
    if (rank[ra] == rank[rb]) rank[ra]++;
    return true;
}
// Time: O(k * α(m*n)) ≈ O(k) where k = number of positions
```

---

## Round 4: System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design Google Pay's Payment System**
   - UPI payment flow, QR code payments, transaction history, fraud detection

### 💡 Interview-Ready Answer

```
Google Pay Architecture:
┌──────────────────────────────────────────────────────────────┐
│  UPI Payment Flow (P2P):                                      │
│  1. Payer opens app → enters amount → selects contact/UPI ID │
│  2. Client sends: POST /api/pay                              │
│     { payerVPA: "user@okicici", payeeVPA: "friend@ybl",     │
│       amount: 500, txnNote: "dinner", deviceToken: "..." }   │
│  3. GPay Backend → UPI Switch (NPCI) → Payer's PSP Bank     │
│  4. PSP Bank sends push notification to payer app            │
│  5. Payer enters UPI PIN in secure SDK (not GPay's UI!)      │
│  6. PIN verified by bank → debit payer → credit payee        │
│  7. NPCI sends response → GPay backend → update status       │
│  8. Both parties get notification: success/failure            │
│                                                                │
│  QR Code Payment:                                             │
│  - Static QR: upi://pay?pa=merchant@bank&pn=ShopName        │
│  - Dynamic QR: includes amount + transaction reference       │
│  - Flow: scan → parse URI → pre-fill payment form → confirm  │
│  - Intent-based: deep link to installed UPI app              │
│                                                                │
│  Architecture:                                                │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐        │
│  │ GPay App  │─▶│ GPay Backend │─▶│ NPCI UPI Switch │        │
│  │           │  │              │  │                 │        │
│  │ PIN SDK   │  │ Txn Service  │  │ Routes to banks │        │
│  │ (bank lib)│  │ Fraud Engine │  │                 │        │
│  └──────────┘  └──────────────┘  └─────────────────┘        │
│                       │                                      │
│               ┌───────▼────────┐                             │
│               │ Event Store     │                             │
│               │ (Kafka + Spanner)│                            │
│               └────────────────┘                              │
│                                                                │
│  Fraud Detection:                                             │
│  - Rules engine: velocity checks (> 5 txn/min → flag)       │
│  - ML model: anomaly detection (unusual amount, new payee,   │
│    different device, unusual time, rapid fire)               │
│  - Device fingerprinting: hardware ID + behavior biometrics  │
│  - Risk score: low → auto-approve, medium → 2FA,            │
│    high → block + human review                               │
│                                                                │
│  Idempotency:                                                 │
│  - Every payment request has unique idempotency_key          │
│  - If duplicate request (retry due to timeout):              │
│    check idempotency store → return existing result          │
│  - Prevents double-charge (critical for payments!)           │
│                                                                │
│  Transaction History:                                         │
│  - Stored in Spanner (strong consistency for financial data) │
│  - Partitioned by user_id (range sharding)                   │
│  - Index: (user_id, timestamp DESC) for fast retrieval       │
│  - Cursor-based pagination (not offset — offset skips rows)  │
│  - Statement generation: async batch job → store in GCS      │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Google L4 = **solid coding + reasonable system design** — less depth than L5
- **Course Schedule II** (Topological Sort) + detecting cycle nodes = Google classic
- **Swim in Rising Water** — binary search + BFS or Dijkstra bottleneck approach
- **Number of Islands II** (dynamic Union-Find) = great for testing DSU mastery
- **Google Pay / UPI design** = relevant for Google Bangalore (GPay is Bangalore-based)
- **Idempotency** is the #1 concept in payment system design — prevents double-charge
- **UPI PIN** is handled by bank's SDK, NOT by GPay — important architectural detail

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Topological Sort, BFS |
| Coding 1 | Hard | Binary Search + BFS, Dijkstra |
| Coding 2 | Medium-Hard | Union-Find, Dynamic Grid |
| System Design | Hard | UPI Payments, Fraud Detection |
| Behavioral | Medium | Googleyness |
