# Swiggy — SDE-3 FullStack Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Machine Coding + 2 DSA + HLD + Bar Raiser)
- **Timeline:** 2 weeks
- **Format:** Virtual

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Food Delivery Order Tracking System** (state machine)
   - States: PLACED → CONFIRMED → PREPARING → PICKED_UP → DELIVERED
   - State transitions, ETA updates, cancellation logic

### 💡 Interview-Ready Answer

```java
public class OrderTracker {
    enum OrderState { 
        PLACED, CONFIRMED, PREPARING, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED 
    }
    
    // Valid state transitions
    private static final Map<OrderState, Set<OrderState>> TRANSITIONS = Map.of(
        OrderState.PLACED, Set.of(OrderState.CONFIRMED, OrderState.CANCELLED),
        OrderState.CONFIRMED, Set.of(OrderState.PREPARING, OrderState.CANCELLED),
        OrderState.PREPARING, Set.of(OrderState.PICKED_UP, OrderState.CANCELLED),
        OrderState.PICKED_UP, Set.of(OrderState.OUT_FOR_DELIVERY),
        OrderState.OUT_FOR_DELIVERY, Set.of(OrderState.DELIVERED),
        OrderState.DELIVERED, Set.of(),
        OrderState.CANCELLED, Set.of()
    );
    
    private final String orderId;
    private OrderState currentState;
    private final List<StateTransition> history;
    private final List<OrderEventListener> listeners;
    private Instant estimatedDeliveryTime;
    
    public OrderTracker(String orderId) {
        this.orderId = orderId;
        this.currentState = OrderState.PLACED;
        this.history = new ArrayList<>();
        this.listeners = new ArrayList<>();
        
        history.add(new StateTransition(null, OrderState.PLACED, Instant.now(), "Order placed"));
    }
    
    public synchronized void transition(OrderState newState, String reason) {
        if (!TRANSITIONS.getOrDefault(currentState, Set.of()).contains(newState)) {
            throw new IllegalStateTransitionException(
                String.format("Cannot transition from %s to %s", currentState, newState));
        }
        
        OrderState oldState = currentState;
        currentState = newState;
        
        StateTransition transition = new StateTransition(oldState, newState, Instant.now(), reason);
        history.add(transition);
        
        // Recalculate ETA based on new state
        recalculateETA(newState);
        
        // Notify listeners
        listeners.forEach(l -> l.onStateChange(orderId, transition));
    }
    
    public boolean canCancel() {
        return TRANSITIONS.getOrDefault(currentState, Set.of()).contains(OrderState.CANCELLED);
    }
    
    public void cancel(String reason) {
        if (!canCancel()) {
            throw new IllegalStateTransitionException(
                "Cannot cancel order in state: " + currentState);
        }
        transition(OrderState.CANCELLED, reason);
    }
    
    private void recalculateETA(OrderState state) {
        Instant now = Instant.now();
        estimatedDeliveryTime = switch (state) {
            case PLACED -> now.plusSeconds(45 * 60);         // 45 minutes
            case CONFIRMED -> now.plusSeconds(35 * 60);      // 35 minutes
            case PREPARING -> now.plusSeconds(25 * 60);      // 25 minutes
            case PICKED_UP -> now.plusSeconds(15 * 60);      // 15 minutes
            case OUT_FOR_DELIVERY -> now.plusSeconds(8 * 60); // 8 minutes
            case DELIVERED -> now;
            case CANCELLED -> null;
        };
    }
    
    public void addListener(OrderEventListener listener) {
        listeners.add(listener);
    }
    
    // Records
    record StateTransition(OrderState from, OrderState to, Instant timestamp, String reason) {}
    
    interface OrderEventListener {
        void onStateChange(String orderId, StateTransition transition);
    }
}
```

---

## Round 2: DSA 1
**Duration:** 45 minutes

### Questions Asked
1. **Shortest Path in Grid with Obstacle Elimination** (LeetCode 1293)
2. **Follow-up: What if obstacles have different removal costs?**

### 💡 Interview-Ready Answer

```java
public int shortestPath(int[][] grid, int k) {
    int m = grid.length, n = grid[0].length;
    
    // State: (row, col, obstacles_remaining)
    boolean[][][] visited = new boolean[m][n][k + 1];
    Queue<int[]> queue = new LinkedList<>();
    queue.offer(new int[]{0, 0, k}); // row, col, remaining eliminations
    visited[0][0][k] = true;
    
    int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}};
    int steps = 0;
    
    while (!queue.isEmpty()) {
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            int[] curr = queue.poll();
            int r = curr[0], c = curr[1], rem = curr[2];
            
            if (r == m - 1 && c == n - 1) return steps;
            
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
                
                int newRem = rem - grid[nr][nc]; // Use elimination if obstacle
                if (newRem < 0) continue;
                if (visited[nr][nc][newRem]) continue;
                
                visited[nr][nc][newRem] = true;
                queue.offer(new int[]{nr, nc, newRem});
            }
        }
        steps++;
    }
    
    return -1;
}
// Time: O(m * n * k), Space: O(m * n * k)

// Follow-up: Variable obstacle costs → change BFS to Dijkstra
// State: (row, col, remaining_budget)
// Edge weight: obstacle_cost[r][c] for obstacles, 1 for empty cells
// Use PriorityQueue instead of Queue
```

---

## Round 3: DSA 2
**Duration:** 45 minutes

### Questions Asked
1. **Design a Food Delivery Assignment System** (Bipartite Matching variant)
2. **Given N orders and M drivers with locations, find optimal assignment minimizing total distance**

### 💡 Hungarian Algorithm (Simplified for Interview)

```java
// Greedy approach: assign closest available driver to each order (sorted by distance)
// Not optimal but good enough for interview + explain Hungarian for optimality

class DeliveryAssignment {
    record Assignment(String orderId, String driverId, double distance) {}
    
    List<Assignment> assignOrders(List<Order> orders, List<Driver> drivers) {
        // Build all possible assignments with distances
        PriorityQueue<Assignment> pq = new PriorityQueue<>(
            Comparator.comparingDouble(a -> a.distance));
        
        for (Order order : orders) {
            for (Driver driver : drivers) {
                double dist = haversine(
                    order.restaurantLat, order.restaurantLng,
                    driver.lat, driver.lng
                );
                pq.offer(new Assignment(order.id, driver.id, dist));
            }
        }
        
        // Greedy: pick shortest distance, mark both as assigned
        Set<String> assignedOrders = new HashSet<>();
        Set<String> assignedDrivers = new HashSet<>();
        List<Assignment> result = new ArrayList<>();
        
        while (!pq.isEmpty() && assignedOrders.size() < orders.size()) {
            Assignment a = pq.poll();
            if (assignedOrders.contains(a.orderId) || assignedDrivers.contains(a.driverId)) continue;
            
            assignedOrders.add(a.orderId);
            assignedDrivers.add(a.driverId);
            result.add(a);
        }
        
        return result;
    }
    
    // Haversine formula for distance between two GPS coordinates
    double haversine(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
```

---

## Round 4: System Design (HLD)
**Duration:** 60 minutes

### Questions Asked
1. **Design Swiggy's Real-Time Delivery Tracking System**
   - Driver location updates, ETA calculation, live map tracking

### 💡 Interview-Ready Answer

```
Live Delivery Tracking:
┌──────────────────────────────────────────────────────────────┐
│  Driver Location Updates:                                     │
│  - Driver app sends GPS every 4 seconds (configurable)       │
│  - Protocol: MQTT (lightweight, battery-efficient)            │
│    Topic: driver/{driverId}/location                         │
│    Payload: { lat, lng, heading, speed, timestamp, accuracy } │
│  - MQTT → Gateway → Kafka topic: "driver_locations"          │
│                                                                │
│  Location Processing Pipeline:                                │
│  ┌────────────┐  ┌──────────┐  ┌──────────────┐             │
│  │ MQTT Gateway│─▶│ Kafka    │─▶│ Location     │             │
│  │             │  │          │  │ Processor    │             │
│  └────────────┘  └──────────┘  └──────┬───────┘             │
│                                       │                      │
│  Location Processor:                  │                      │
│  1. Map-match GPS to road segment    │                      │
│  2. Filter noise (Kalman filter)      │                      │
│  3. Update Redis: driver:{id}:loc     ▼                      │
│  4. Publish to "order_tracking" topic                        │
│  5. Recalculate ETA                                          │
│                                                                │
│  ETA Calculation:                                             │
│  - current_location → restaurant → customer (if picking up)  │
│  - current_location → customer (if picked up)                │
│  - Use road network graph + real-time traffic                │
│  - ML model correction: historical data for this route/time  │
│  - Update ETA only if change > 1 minute (reduce noise)       │
│                                                                │
│  Customer App (Live Map):                                     │
│  - WebSocket connection to tracking service                  │
│  - Receive: { lat, lng, eta_minutes, state }                 │
│  - Interpolate between GPS updates (smooth animation):       │
│    requestAnimationFrame → lerp between last two points      │
│  - Show route polyline (fetched once, not updated live)      │
│  - ETA countdown timer (client-side between server updates)  │
│                                                                │
│  Scale:                                                       │
│  - 500K concurrent active deliveries at peak                 │
│  - 500K * 0.25 (4s interval) = 125K location updates/second │
│  - Redis: in-memory, sharded by driver_id                    │
│  - WebSocket: 1M concurrent connections (customer + driver)  │
│  - Use connection pooling + load balancing via consistent hash│
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Swiggy SDE-3 = **DSA + machine coding + delivery-specific system design**
- **Order state machine** with valid transitions is Swiggy's classic machine coding question
- **BFS with state = (row, col, k)** for obstacle elimination — 3D visited array
- **Haversine formula** for GPS distance — know it by heart for geo-spatial questions
- **MQTT** (not WebSocket) for driver location — battery efficient, persistent connection
- **Kalman filter** for GPS noise — mention it as a signal of depth
- **Interpolation** between GPS updates for smooth map animation (requestAnimationFrame)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | State Machine, Order Lifecycle |
| DSA 1 | Hard | BFS, 3D State, Obstacle Elimination |
| DSA 2 | Hard | Bipartite Matching, Haversine |
| System Design | Very Hard | Live Tracking, MQTT, ETA |
| Bar Raiser | Hard | LP + Quick Problem |
