# Swiggy — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | SDE-3 |
| **Level** | Lead |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Machine Coding + DSA + LLD + System Design + HM)
- **Rejection Reason:** System Design — underestimated kitchen capacity planning

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Restaurant Kitchen Order Management System (KOT)**

### 💡 Interview-Ready Answer

```java
class KitchenOrderTicket {
    private final Map<String, Order> activeOrders;
    private final PriorityQueue<Order> orderQueue; // Priority: prep time + order time
    private final Map<String, Station> stations; // GRILL, FRY, TANDOOR, SALAD, DESSERT
    private final List<OrderEventListener> listeners;
    
    enum OrderPriority { URGENT, HIGH, NORMAL }
    enum OrderStatus { RECEIVED, PREPARING, READY, PICKED_UP, DELAYED }
    
    record OrderItem(String name, String stationId, int prepTimeMinutes, Map<String, String> customizations) {}
    
    record Order(String orderId, List<OrderItem> items, Instant receivedAt,
                 OrderPriority priority, OrderStatus status, String notes,
                 int estimatedPrepMinutes) implements Comparable<Order> {
        
        public int compareTo(Order other) {
            // Higher priority first, then earlier orders
            int priComp = this.priority.ordinal() - other.priority.ordinal();
            if (priComp != 0) return priComp;
            return this.receivedAt.compareTo(other.receivedAt);
        }
    }
    
    record Station(String id, String name, int capacity, List<String> currentOrders) {
        boolean hasCapacity() { return currentOrders.size() < capacity; }
    }
    
    void receiveOrder(Order order) {
        activeOrders.put(order.orderId, order);
        
        // Group items by station
        Map<String, List<OrderItem>> itemsByStation = order.items.stream()
            .collect(Collectors.groupingBy(OrderItem::stationId));
        
        // Assign items to stations
        for (var entry : itemsByStation.entrySet()) {
            Station station = stations.get(entry.getKey());
            if (station.hasCapacity()) {
                station.currentOrders.add(order.orderId);
                updateStatus(order.orderId, OrderStatus.PREPARING);
            } else {
                orderQueue.offer(order);
            }
        }
        
        notifyListeners(new OrderEvent("ORDER_RECEIVED", order));
    }
    
    void markItemReady(String orderId, String itemName) {
        Order order = activeOrders.get(orderId);
        if (order == null) return;
        
        // Check if ALL items for this order are ready
        boolean allReady = order.items.stream()
            .allMatch(item -> isItemReady(orderId, item.name));
        
        if (allReady) {
            updateStatus(orderId, OrderStatus.READY);
            notifyListeners(new OrderEvent("ORDER_READY", order));
            
            // Free up station capacity → process next queued order
            processQueue();
        }
    }
    
    // Display board for kitchen
    KitchenDashboard getDashboard() {
        List<Order> preparing = activeOrders.values().stream()
            .filter(o -> o.status == OrderStatus.PREPARING)
            .sorted()
            .toList();
        
        List<Order> ready = activeOrders.values().stream()
            .filter(o -> o.status == OrderStatus.READY)
            .sorted(Comparator.comparing(Order::receivedAt))
            .toList();
        
        List<Order> delayed = activeOrders.values().stream()
            .filter(o -> {
                long elapsed = Duration.between(o.receivedAt, Instant.now()).toMinutes();
                return elapsed > o.estimatedPrepMinutes && o.status == OrderStatus.PREPARING;
            })
            .toList();
        
        return new KitchenDashboard(preparing, ready, delayed, orderQueue.size());
    }
    
    record KitchenDashboard(List<Order> preparing, List<Order> ready,
                             List<Order> delayed, int queued) {}
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Task Scheduler** (LeetCode 621)
2. **Follow-up: Return the actual schedule (not just idle time count)**

### 💡 Task Scheduler

```java
public int leastInterval(char[] tasks, int n) {
    int[] freq = new int[26];
    for (char task : tasks) freq[task - 'A']++;
    
    // Find max frequency and how many tasks have that frequency
    int maxFreq = 0;
    int maxCount = 0;
    for (int f : freq) {
        if (f > maxFreq) { maxFreq = f; maxCount = 1; }
        else if (f == maxFreq) maxCount++;
    }
    
    // Formula: (maxFreq - 1) chunks of size (n + 1) + maxCount tasks in last chunk
    int formulaResult = (maxFreq - 1) * (n + 1) + maxCount;
    
    // If many diverse tasks, no idle needed → total tasks is the answer
    return Math.max(formulaResult, tasks.length);
}
// Time: O(n), Space: O(1)

// Follow-up: Return actual schedule
public String[] getSchedule(char[] tasks, int n) {
    Map<Character, Integer> freq = new HashMap<>();
    for (char t : tasks) freq.merge(t, 1, Integer::sum);
    
    PriorityQueue<int[]> maxHeap = new PriorityQueue<>((a, b) -> b[1] - a[1]);
    for (var entry : freq.entrySet()) {
        maxHeap.offer(new int[]{entry.getKey(), entry.getValue()});
    }
    
    List<String> schedule = new ArrayList<>();
    
    while (!maxHeap.isEmpty()) {
        List<int[]> cooldown = new ArrayList<>();
        int slots = n + 1; // Fill n+1 slots per cycle
        
        while (slots > 0 && !maxHeap.isEmpty()) {
            int[] top = maxHeap.poll();
            schedule.add(String.valueOf((char) top[0]));
            top[1]--;
            if (top[1] > 0) cooldown.add(top);
            slots--;
        }
        
        // Fill remaining slots with idle
        if (!cooldown.isEmpty()) { // More tasks remaining
            while (slots > 0) {
                schedule.add("IDLE");
                slots--;
            }
        }
        
        maxHeap.addAll(cooldown);
    }
    
    return schedule.toArray(new String[0]);
}
```

---

## 🎯 Key Takeaways
- Swiggy SDE-3 = **food domain LLD + DSA + kitchen ops system design**
- **Kitchen Order Ticket** system: station assignment, priority queue, capacity management
- **Task Scheduler** formula: `max((maxFreq-1)*(n+1)+maxCount, totalTasks)` — O(n) solution
- **Delayed order detection** = compare elapsed time vs estimated prep time
- **Station capacity** is key — can't assign more orders than a station can handle simultaneously
- Swiggy rejected because I didn't model **kitchen capacity planning** in system design: predicting peak load per station, prepping popular items ahead, managing ingredient inventory
- Know Swiggy's **cloud kitchen (Swiggy Access)** model for system design

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Kitchen Management, Priority Queue, Events |
| DSA | Medium-Hard | Task Scheduler, Greedy, Max Heap |
| System Design | Very Hard | Kitchen Capacity, Cloud Kitchen, Peak Planning |
| HM | Medium | Behavioral, Leadership |
