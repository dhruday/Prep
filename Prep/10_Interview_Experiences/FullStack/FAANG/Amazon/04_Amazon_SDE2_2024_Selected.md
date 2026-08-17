# Amazon — SDE-2 Interview Experience (2024) — LP Heavy

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Software Development Engineer II |
| **Level** | L5 |
| **YOE** | 4 years |
| **Date** | December 2024 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/amazon-interview-experience-for-sde-2/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + Bar Raiser)
- **Timeline:** 3 weeks
- **Format:** Onsite at Amazon Bangalore

---

## Round 1: Online Assessment
**Duration:** 105 minutes

### Questions Asked
1. **K Closest Points to Origin** (LeetCode 973)
2. **Serialize and Deserialize Binary Tree** (LeetCode 297)

### 💡 Interview-Ready Answer — K Closest Points

**Approach 1: Quick Select (Optimal)**
```java
public int[][] kClosest(int[][] points, int k) {
    quickSelect(points, 0, points.length - 1, k);
    return Arrays.copyOf(points, k);
}

private void quickSelect(int[][] points, int lo, int hi, int k) {
    if (lo >= hi) return;
    
    int pivotIdx = partition(points, lo, hi);
    
    if (pivotIdx == k) return;
    else if (pivotIdx < k) quickSelect(points, pivotIdx + 1, hi, k);
    else quickSelect(points, lo, pivotIdx - 1, k);
}

private int partition(int[][] points, int lo, int hi) {
    int pivotDist = dist(points[hi]);
    int i = lo;
    
    for (int j = lo; j < hi; j++) {
        if (dist(points[j]) <= pivotDist) {
            swap(points, i, j);
            i++;
        }
    }
    swap(points, i, hi);
    return i;
}

private int dist(int[] point) {
    return point[0] * point[0] + point[1] * point[1]; // no sqrt needed
}
```
**Time:** O(n) average, O(n²) worst. **Space:** O(1)

**Approach 2: Max-Heap (when K is small)**
```java
public int[][] kClosest_heap(int[][] points, int k) {
    PriorityQueue<int[]> maxHeap = new PriorityQueue<>(
        (a, b) -> dist(b) - dist(a)
    );
    
    for (int[] point : points) {
        maxHeap.offer(point);
        if (maxHeap.size() > k) maxHeap.poll();
    }
    
    return maxHeap.toArray(new int[k][]);
}
```
**Time:** O(n log k), **Space:** O(k)

### 💡 Interview-Ready Answer — Serialize/Deserialize Binary Tree

```java
public class Codec {
    private static final String NULL = "#";
    private static final String SEP = ",";
    
    // Serialize: preorder traversal
    public String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        serializeHelper(root, sb);
        return sb.toString();
    }
    
    private void serializeHelper(TreeNode node, StringBuilder sb) {
        if (node == null) {
            sb.append(NULL).append(SEP);
            return;
        }
        sb.append(node.val).append(SEP);
        serializeHelper(node.left, sb);
        serializeHelper(node.right, sb);
    }
    
    // Deserialize: reconstruct from preorder
    public TreeNode deserialize(String data) {
        Queue<String> queue = new LinkedList<>(Arrays.asList(data.split(SEP)));
        return deserializeHelper(queue);
    }
    
    private TreeNode deserializeHelper(Queue<String> queue) {
        String val = queue.poll();
        if (val.equals(NULL)) return null;
        
        TreeNode node = new TreeNode(Integer.parseInt(val));
        node.left = deserializeHelper(queue);
        node.right = deserializeHelper(queue);
        return node;
    }
}
```

---

## Round 2: DSA + LP
**Duration:** 60 minutes

### Questions Asked
1. **Number of Islands** (LeetCode 200) + variants (count distinct shapes)
2. **LP: "Tell me about a time you dealt with ambiguity" (Bias for Action)**

### 💡 Interview-Ready Answer — Number of Islands

```java
public int numIslands(char[][] grid) {
    if (grid == null || grid.length == 0) return 0;
    
    int count = 0;
    for (int i = 0; i < grid.length; i++) {
        for (int j = 0; j < grid[0].length; j++) {
            if (grid[i][j] == '1') {
                count++;
                dfs(grid, i, j);
            }
        }
    }
    return count;
}

private void dfs(char[][] grid, int i, int j) {
    if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length || grid[i][j] != '1') return;
    grid[i][j] = '0'; // mark visited
    dfs(grid, i + 1, j);
    dfs(grid, i - 1, j);
    dfs(grid, i, j + 1);
    dfs(grid, i, j - 1);
}
```

**Follow-up: Count Distinct Island Shapes**
```java
public int numDistinctIslands(int[][] grid) {
    Set<String> uniqueShapes = new HashSet<>();
    
    for (int i = 0; i < grid.length; i++) {
        for (int j = 0; j < grid[0].length; j++) {
            if (grid[i][j] == 1) {
                StringBuilder shape = new StringBuilder();
                dfsShape(grid, i, j, shape, "S"); // S = start
                uniqueShapes.add(shape.toString());
            }
        }
    }
    return uniqueShapes.size();
}

private void dfsShape(int[][] grid, int i, int j, StringBuilder shape, String dir) {
    if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length || grid[i][j] != 1) return;
    grid[i][j] = 0;
    shape.append(dir);
    dfsShape(grid, i + 1, j, shape, "D"); // down
    dfsShape(grid, i - 1, j, shape, "U"); // up
    dfsShape(grid, i, j + 1, shape, "R"); // right
    dfsShape(grid, i, j - 1, shape, "L"); // left
    shape.append("B"); // backtrack marker (critical for correctness)
}
```

### 💡 Interview-Ready Answer — LP: Bias for Action

**Situation:** Building a customer notification system. Requirements from 3 different product teams were contradictory — Team A wanted real-time push, Team B wanted batched daily emails, Team C wanted in-app only. No single PM owned the decision and a 2-week alignment meeting was proposed.

**Task:** Ship the notification system within the sprint (2 weeks) without waiting for perfect requirements.

**Action:**
1. Recognized that waiting 2 weeks for alignment meant we'd ship nothing
2. **Built a pluggable architecture** with NotificationStrategy interface — each team could plug in their preferred channel
3. Made the default behavior configurable per user segment (A/B test)
4. Sent a 1-page design doc to all 3 PMs: "Here's what I'm building. Unless someone objects by Friday, I'm going with this."
5. No one objected. Built and shipped in 10 days.

**Result:** All three teams used the system. The pluggable design actually became the standard architecture. PM told me later: "I'm glad you just built it instead of waiting for us to agree."

---

## Round 3: LLD + LP
**Duration:** 60 minutes

### Questions Asked
1. **Design an Elevator System** (classic LLD)
2. **LP: "Customer Obsession — tell me about a time you went above and beyond"**

### 💡 Interview-Ready Answer — Elevator System

```java
enum Direction { UP, DOWN, IDLE }
enum DoorState { OPEN, CLOSED }

class Request {
    int floor;
    Direction direction; // null for internal requests (inside elevator)
    long timestamp;
    
    Request(int floor, Direction direction) {
        this.floor = floor;
        this.direction = direction;
        this.timestamp = System.currentTimeMillis();
    }
}

class Elevator {
    int id;
    int currentFloor;
    Direction direction;
    DoorState doorState;
    int capacity;
    int currentLoad;
    TreeSet<Integer> upStops;    // floors to visit going up
    TreeSet<Integer> downStops;  // floors to visit going down
    
    Elevator(int id, int capacity) {
        this.id = id;
        this.capacity = capacity;
        this.currentFloor = 1;
        this.direction = Direction.IDLE;
        this.doorState = DoorState.CLOSED;
        this.upStops = new TreeSet<>();
        this.downStops = new TreeSet<>(Collections.reverseOrder());
    }
    
    void addStop(int floor) {
        if (floor > currentFloor) upStops.add(floor);
        else if (floor < currentFloor) downStops.add(floor);
        else return; // already at this floor
        
        if (direction == Direction.IDLE) {
            direction = floor > currentFloor ? Direction.UP : Direction.DOWN;
        }
    }
    
    int getNextFloor() {
        if (direction == Direction.UP && !upStops.isEmpty()) {
            return upStops.first(); // nearest floor above
        }
        if (direction == Direction.DOWN && !downStops.isEmpty()) {
            return downStops.first(); // nearest floor below (reversed order)
        }
        // Switch direction
        if (!downStops.isEmpty()) { direction = Direction.DOWN; return downStops.first(); }
        if (!upStops.isEmpty()) { direction = Direction.UP; return upStops.first(); }
        direction = Direction.IDLE;
        return currentFloor;
    }
    
    void moveToFloor(int floor) {
        currentFloor = floor;
        upStops.remove(floor);
        downStops.remove(floor);
        openDoor();
        // passengers enter/exit
        closeDoor();
    }
    
    void openDoor() { doorState = DoorState.OPEN; }
    void closeDoor() { doorState = DoorState.CLOSED; }
}

// SCAN algorithm (elevator algorithm)
class ElevatorController {
    List<Elevator> elevators;
    
    ElevatorController(int numElevators, int capacity) {
        elevators = new ArrayList<>();
        for (int i = 0; i < numElevators; i++) {
            elevators.add(new Elevator(i, capacity));
        }
    }
    
    // Assign elevator using Nearest-First strategy
    Elevator assignElevator(Request request) {
        Elevator best = null;
        int minCost = Integer.MAX_VALUE;
        
        for (Elevator elevator : elevators) {
            int cost = calculateCost(elevator, request);
            if (cost < minCost) {
                minCost = cost;
                best = elevator;
            }
        }
        
        best.addStop(request.floor);
        return best;
    }
    
    int calculateCost(Elevator elevator, Request request) {
        int distance = Math.abs(elevator.currentFloor - request.floor);
        
        // Prefer elevators already going in the right direction
        if (elevator.direction == Direction.IDLE) {
            return distance; // direct
        }
        
        if (elevator.direction == Direction.UP && request.floor >= elevator.currentFloor 
            && request.direction == Direction.UP) {
            return distance; // on the way
        }
        
        if (elevator.direction == Direction.DOWN && request.floor <= elevator.currentFloor 
            && request.direction == Direction.DOWN) {
            return distance; // on the way
        }
        
        // Wrong direction — has to finish current direction first
        return distance + 20; // penalty for opposite direction
    }
}
```

**Design Patterns Used:**
- **Strategy:** Different scheduling algorithms (SCAN, LOOK, shortest-seek-first)
- **Observer:** Notify displays on each floor when elevator arrives
- **State:** Elevator states (MOVING_UP, MOVING_DOWN, IDLE, DOOR_OPEN)

---

## Round 4: System Design + LP
**Duration:** 60 minutes

### Questions Asked
1. **Design Amazon's Order Management System**
2. **LP: "Disagree and Commit"**

### 💡 Interview-Ready Answer — Order Management System

```
Order Lifecycle:
CART → CHECKOUT → PAYMENT_PENDING → PAYMENT_CONFIRMED 
    → WAREHOUSE_ASSIGNED → PICKING → PACKED → SHIPPED 
    → OUT_FOR_DELIVERY → DELIVERED

Each state transition emits a Kafka event → downstream services react:
- PAYMENT_CONFIRMED → Inventory service reserves stock
- WAREHOUSE_ASSIGNED → Warehouse management system creates pick list
- SHIPPED → Tracking service starts tracking
- DELIVERED → Invoice service generates invoice, loyalty service adds points
```

```sql
CREATE TABLE orders (
    order_id        VARCHAR(36) PRIMARY KEY,
    customer_id     VARCHAR(36) NOT NULL,
    status          VARCHAR(30) NOT NULL,
    total_amount    DECIMAL(12,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'INR',
    shipping_address JSONB NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    INDEX idx_customer_status (customer_id, status),
    INDEX idx_status_created (status, created_at)
);

CREATE TABLE order_items (
    order_item_id   VARCHAR(36) PRIMARY KEY,
    order_id        VARCHAR(36) REFERENCES orders(order_id),
    product_id      VARCHAR(36) NOT NULL,
    quantity        INT NOT NULL CHECK (quantity > 0),
    unit_price      DECIMAL(12,2) NOT NULL,
    INDEX idx_order (order_id)
);

CREATE TABLE order_events (
    event_id        BIGSERIAL PRIMARY KEY,
    order_id        VARCHAR(36) NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    event_data      JSONB,
    created_at      TIMESTAMP DEFAULT NOW(),
    INDEX idx_order_time (order_id, created_at)
);
```

---

## Round 5: Bar Raiser
**Duration:** 60 minutes

### Questions Asked
1. **LP Deep Dive: 3 stories back to back**
   - "Earn Trust" — working with a skeptical stakeholder
   - "Have Backbone; Disagree and Commit" — pushing back on management
   - "Deliver Results" — shipping under tight deadlines
2. **Coding: Remove all adjacent duplicates in string (LeetCode 1047)**

### 💡 Interview-Ready Answer — Remove Adjacent Duplicates

```java
public String removeDuplicates(String s) {
    StringBuilder stack = new StringBuilder();
    
    for (char c : s.toCharArray()) {
        if (stack.length() > 0 && stack.charAt(stack.length() - 1) == c) {
            stack.deleteCharAt(stack.length() - 1);
        } else {
            stack.append(c);
        }
    }
    
    return stack.toString();
}
// "abbaca" → "aaca" → "ca"
```

### 💡 Interview-Ready Answer — LP: Earn Trust

**Situation:** Migrating a legacy monolith to microservices. The DBA (most tenured person on team, 15 YOE) was openly skeptical: "This will cause data inconsistencies. I've seen this fail before."

**Task:** Get the DBA's buy-in without dismissing his concerns.

**Action:**
1. **Listened first:** Scheduled 1:1. Asked: "What specific failure modes worry you?" He gave 5 concrete scenarios.
2. **Built a proof:** Addressed each scenario in a design doc with mitigation strategies. For data inconsistency, demonstrated Saga pattern with compensating transactions.
3. **Invited him to own the data layer:** "You're the expert here. Can you design the data migration strategy?"
4. **Transparency:** Shared all metrics (latency, error rates) daily during migration.
5. **Gave credit publicly:** In team standup: "The zero-downtime migration worked because [DBA]'s rollback strategy caught 3 edge cases we missed."

**Result:** DBA became the biggest advocate. He presented our migration at company tech talks. Said: "I was wrong to resist — but I'm glad [I] took time to address my concerns instead of bulldozing past them."

---

## 🎯 Key Takeaways
- Amazon's **Bar Raiser** round is LP-heavy — prepare 3+ strong STAR stories per LP
- **K Closest Points** → Quick Select is the optimal solution Amazon expects
- **Number of Islands** is Amazon's #1 most-asked DSA question — know all variants
- **Elevator System** LLD is a classic — use SCAN algorithm, TreeSet for stops
- **Order Management** = event-driven state machine. Know the exact states for e-commerce.
- **"Earn Trust"** is Amazon's most important LP — show you listen and build credibility

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium-Hard | Quick Select, Tree Serialization |
| Round 2 | Medium | DFS/BFS, LP |
| Round 3 | Medium-Hard | OOP, Elevator LLD, SCAN Algorithm |
| Round 4 | Hard | Event-Driven, Order State Machine |
| Bar Raiser | Hard | LP Stories, Stack |
