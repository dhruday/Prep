# Google — SDE-2 Interview Experience (2025) — Coding + System Design

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer III |
| **Level** | L4 |
| **YOE** | 4 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)
- **Timeline:** 4 weeks
- **Result:** Rejected — strong coding but weak system design (insufficient at L4 bar)

---

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Design a Browser History class** (LeetCode 1472)

### 💡 Interview-Ready Answer

```java
class BrowserHistory {
    List<String> history;
    int current;
    
    public BrowserHistory(String homepage) {
        history = new ArrayList<>();
        history.add(homepage);
        current = 0;
    }
    
    public void visit(String url) {
        // Remove all forward history
        while (history.size() > current + 1) {
            history.remove(history.size() - 1);
        }
        history.add(url);
        current++;
    }
    
    public String back(int steps) {
        current = Math.max(0, current - steps);
        return history.get(current);
    }
    
    public String forward(int steps) {
        current = Math.min(history.size() - 1, current + steps);
        return history.get(current);
    }
}
```

**Follow-up: Use doubly-linked list for O(1) visit (no trimming needed)**
```java
class BrowserHistory_DLL {
    class Node {
        String url;
        Node prev, next;
        Node(String url) { this.url = url; }
    }
    
    Node current;
    
    public BrowserHistory_DLL(String homepage) {
        current = new Node(homepage);
    }
    
    public void visit(String url) {
        Node node = new Node(url);
        current.next = node; // discards forward history (GC handles old nodes)
        node.prev = current;
        current = node;
    }
    
    public String back(int steps) {
        while (steps > 0 && current.prev != null) {
            current = current.prev;
            steps--;
        }
        return current.url;
    }
    
    public String forward(int steps) {
        while (steps > 0 && current.next != null) {
            current = current.next;
            steps--;
        }
        return current.url;
    }
}
```

---

## Round 2: Onsite — Coding I
**Duration:** 45 minutes

### Questions Asked
1. **Minimum Cost to Connect All Points** (LeetCode 1584) — MST variant
2. **Follow-up: What if some edges are pre-connected?**

### 💡 Interview-Ready Answer — MST (Kruskal's with Union-Find)

```java
public int minCostConnectPoints(int[][] points) {
    int n = points.length;
    
    // Build all edges with Manhattan distance
    List<int[]> edges = new ArrayList<>(); // {cost, i, j}
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            int cost = Math.abs(points[i][0] - points[j][0]) + Math.abs(points[i][1] - points[j][1]);
            edges.add(new int[]{cost, i, j});
        }
    }
    
    // Sort by cost
    edges.sort((a, b) -> a[0] - b[0]);
    
    // Kruskal's: add cheapest edge that doesn't form cycle
    int[] parent = new int[n];
    int[] rank = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    
    int totalCost = 0, edgesUsed = 0;
    
    for (int[] edge : edges) {
        if (edgesUsed == n - 1) break;
        
        int cost = edge[0], u = edge[1], v = edge[2];
        int pu = find(parent, u), pv = find(parent, v);
        
        if (pu != pv) {
            union(parent, rank, pu, pv);
            totalCost += cost;
            edgesUsed++;
        }
    }
    
    return totalCost;
}

private int find(int[] parent, int x) {
    if (parent[x] != x) parent[x] = find(parent, parent[x]);
    return parent[x];
}

private void union(int[] parent, int[] rank, int x, int y) {
    if (rank[x] < rank[y]) { int t = x; x = y; y = t; }
    parent[y] = x;
    if (rank[x] == rank[y]) rank[x]++;
}
```

**Follow-up: Pre-connected edges**
```java
// Simply union the pre-connected edges first, THEN run Kruskal's
// The union-find will automatically skip edges between already-connected components
for (int[] preConnected : existingEdges) {
    union(parent, rank, find(parent, preConnected[0]), find(parent, preConnected[1]));
}
// Then continue with Kruskal's as above — it'll skip redundant edges
```

---

## Round 3: Onsite — Coding II
**Duration:** 45 minutes

### Questions Asked
1. **Implement a Thread-Safe Bounded Blocking Queue**

### 💡 Interview-Ready Answer

```java
class BoundedBlockingQueue<T> {
    private final T[] buffer;
    private int head, tail, count;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();
    
    @SuppressWarnings("unchecked")
    public BoundedBlockingQueue(int capacity) {
        buffer = (T[]) new Object[capacity];
        head = tail = count = 0;
    }
    
    public void enqueue(T item) throws InterruptedException {
        lock.lock();
        try {
            while (count == buffer.length) {
                notFull.await(); // wait until space available
            }
            buffer[tail] = item;
            tail = (tail + 1) % buffer.length;
            count++;
            notEmpty.signal(); // wake up a consumer
        } finally {
            lock.unlock();
        }
    }
    
    public T dequeue() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) {
                notEmpty.await(); // wait until item available
            }
            T item = buffer[head];
            buffer[head] = null; // help GC
            head = (head + 1) % buffer.length;
            count--;
            notFull.signal(); // wake up a producer
            return item;
        } finally {
            lock.unlock();
        }
    }
    
    public int size() {
        lock.lock();
        try {
            return count;
        } finally {
            lock.unlock();
        }
    }
}
```

**Why `while` instead of `if` for condition check?**
- **Spurious wakeups:** Thread can wake up without being signaled (JVM optimization)
- **Multiple consumers:** Consumer A and B both waiting. Producer signals. A wakes, consumes. B wakes but queue is empty again → `while` re-checks.

**Alternative: Lock-free implementation (CAS)**
```java
// For ultra-high throughput, use Disruptor pattern or CAS-based ring buffer
// Java's ConcurrentLinkedQueue uses CAS internally
// But bounded blocking queue fundamentally needs blocking → locks are appropriate
```

---

## Round 4: Onsite — System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design Google Maps — Shortest Route Finder**

### 💡 Interview-Ready Answer

#### Architecture
```
┌──────────────┐          ┌──────────────────────────────────────┐
│  Mobile App  │          │  Google Maps Backend                  │
│  / Browser   │          │                                       │
│              │          │  ┌────────────────────────────────┐  │
│  ┌────────┐  │          │  │  API Gateway                    │  │
│  │ Enter   │──┼────────▶│  │  /directions?origin=A&dest=B   │  │
│  │ A → B   │  │          │  └─────────────┬──────────────────┘  │
│  └────────┘  │          │                │                      │
│              │          │  ┌─────────────▼──────────────────┐  │
│              │          │  │  Routing Service                │  │
│              │          │  │                                  │  │
│              │          │  │  1. Geocode A, B → lat/lng      │  │
│              │          │  │  2. Identify road graph region   │  │
│              │          │  │  3. Run modified Dijkstra/A*    │  │
│              │          │  │  4. Apply real-time traffic      │  │
│              │          │  │  5. Return polyline + ETA        │  │
│              │          │  └─────────────────────────────────┘  │
│              │          │                                       │
│              │          │  ┌─────────────────────────────────┐  │
│              │          │  │  Road Graph Store                │  │
│              │          │  │  - Pre-processed from OSM data   │  │
│              │          │  │  - Hierarchical (local/highway)  │  │
│              │          │  │  - Edge weights = travel time    │  │
│              │          │  └─────────────────────────────────┘  │
│              │          │                                       │
│              │          │  ┌─────────────────────────────────┐  │
│              │          │  │  Live Traffic Service             │  │
│              │          │  │  - Aggregated from user GPS data │  │
│              │          │  │  - Updates edge weights in real-  │  │
│              │          │  │    time                           │  │
│              │          │  └─────────────────────────────────┘  │
└──────────────┘          └──────────────────────────────────────┘
```

#### Key Algorithm: Contraction Hierarchies (CH)

Why not plain Dijkstra?
- Road graph has billions of nodes → Dijkstra too slow (even O((V+E)logV) is too much)
- **Contraction Hierarchies** pre-processes the graph:

```
Preprocessing (offline, takes hours):
1. Assign importance to each node (highways > residential)
2. "Contract" least important nodes — add shortcut edges
3. Result: hierarchical graph where routing only explores upward in hierarchy

Query (online, milliseconds):
1. Bidirectional search: forward from source, backward from target
2. Both searches go UP the hierarchy only
3. Meet in the middle at highway-level nodes
4. Unpack shortcut edges to get actual path

Result: 
- Preprocessing: hours
- Query: 1-10ms (vs minutes for plain Dijkstra on same graph)
```

```java
// Simplified A* with heuristic (for interview)
class AStarRouter {
    double[] distTo;
    int[] edgeTo;
    PriorityQueue<int[]> pq; // {nodeId, estimatedTotalCost}
    
    List<Integer> findRoute(Graph graph, int source, int target) {
        int V = graph.nodeCount();
        distTo = new double[V];
        edgeTo = new int[V];
        Arrays.fill(distTo, Double.MAX_VALUE);
        distTo[source] = 0;
        
        pq = new PriorityQueue<>((a, b) -> Double.compare(
            distTo[a[0]] + heuristic(a[0], target),
            distTo[b[0]] + heuristic(b[0], target)
        ));
        pq.offer(new int[]{source});
        
        while (!pq.isEmpty()) {
            int u = pq.poll()[0];
            if (u == target) break;
            
            for (Edge edge : graph.neighbors(u)) {
                int v = edge.to;
                double newDist = distTo[u] + edge.weight; // weight = travel time
                
                if (newDist < distTo[v]) {
                    distTo[v] = newDist;
                    edgeTo[v] = u;
                    pq.offer(new int[]{v});
                }
            }
        }
        
        return reconstructPath(source, target);
    }
    
    // Heuristic: straight-line distance / max_speed → underestimates real travel time
    double heuristic(int node, int target) {
        double straightLine = haversineDistance(graph.lat(node), graph.lng(node),
                                                graph.lat(target), graph.lng(target));
        return straightLine / MAX_SPEED_KMH;
    }
}
```

#### Real-Time Traffic Integration
```
1. Every Android phone with Google Maps reports:
   - GPS position + speed every 5 seconds (anonymized)
   
2. Aggregation pipeline (Kafka + Flink):
   - Map GPS points to road segments
   - Calculate average speed per segment
   - Compare to historical speed → traffic factor
   
3. Update edge weights:
   edge.weight = edge.distance / current_average_speed
   
4. If traffic changes significantly (>20% deviation):
   - Re-route active navigations
   - Push notification: "Faster route available, saves 5 min"
```

---

## Round 5: Onsite — Behavioral
**Duration:** 45 minutes

### Questions Asked
1. **"Tell me about working with a difficult teammate"**
2. **"How do you trade off between code quality and speed?"**

### 💡 Rejection Analysis

> I was rejected after the HC (Hiring Committee) review. Feedback was:
> - **Coding: Strong** — solved all problems cleanly with optimal solutions
> - **System Design: Not at L4 bar** — my Google Maps design was too shallow. I didn't discuss Contraction Hierarchies, pre-processing, or map tile rendering. The interviewer expected deeper understanding of graph partitioning and real-time traffic integration.
> - **Recommendation:** Try again in 6 months after stronger system design preparation.

**Lesson:** Google's L4 system design bar is very high — they expect you to discuss the actual algorithms and techniques used in production, not just high-level boxes and arrows.

---

## 🎯 Key Takeaways
- Google L4 system design requires **production-level depth** — boxes-and-arrows won't cut it
- **Contraction Hierarchies** is the real algorithm Google Maps uses — know it for routing interviews
- **Blocking Queue** is a classic concurrency question — know ReentrantLock + Condition
- **MST (Kruskal's)** with Union-Find is essential — handle pre-connected edges as follow-up
- **Browser History** = stack/DLL problem — simple but easy to mess up edge cases
- If rejected, focus on the **specific feedback** — Google gives actionable rejection reasons

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Easy-Medium | Stack/List |
| Round 2 | Medium-Hard | MST, Union-Find |
| Round 3 | Hard | Concurrency, Blocking Queue |
| Round 4 | Very Hard | Graph Algorithms, Routing, Live Data |
| Round 5 | Medium | Behavioral |
