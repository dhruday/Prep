# Walmart — SDE-2 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart Global Tech |
| **Role** | SDE-2 FullStack |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/walmart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Merge Intervals** (LeetCode 56)
2. **Follow-up: Insert Interval** (LeetCode 57) — Insert new interval and merge overlapping

### 💡 Merge + Insert Intervals

```java
// Merge Intervals
public int[][] merge(int[][] intervals) {
    if (intervals.length <= 1) return intervals;
    
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
    
    List<int[]> merged = new ArrayList<>();
    int[] current = intervals[0];
    
    for (int i = 1; i < intervals.length; i++) {
        if (intervals[i][0] <= current[1]) {
            // Overlap: extend current
            current[1] = Math.max(current[1], intervals[i][1]);
        } else {
            // No overlap: finalize current, start new
            merged.add(current);
            current = intervals[i];
        }
    }
    merged.add(current);
    
    return merged.toArray(new int[0][]);
}
// Time: O(n log n), Space: O(n)

// Insert Interval (O(n), no sorting needed since input is sorted)
public int[][] insert(int[][] intervals, int[] newInterval) {
    List<int[]> result = new ArrayList<>();
    int i = 0, n = intervals.length;
    
    // 1. Add all intervals ending before newInterval starts
    while (i < n && intervals[i][1] < newInterval[0]) {
        result.add(intervals[i++]);
    }
    
    // 2. Merge overlapping intervals
    while (i < n && intervals[i][0] <= newInterval[1]) {
        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
        i++;
    }
    result.add(newInterval);
    
    // 3. Add remaining intervals
    while (i < n) {
        result.add(intervals[i++]);
    }
    
    return result.toArray(new int[0][]);
}
// Time: O(n), Space: O(n)
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Walmart's Store Fulfillment System (BOPIS — Buy Online, Pick Up In Store)**
   - Customer places order online, selects pickup store
   - Real-time store inventory check
   - Associate receives pick task → picks items → stages for customer
   - Customer checks in (geofence) → associate brings order to car
   - Handle partial fulfillment (some items out of stock)

### 💡 Key Design

```
Architecture:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Customer App │  │ Associate App│  │ Store Manager │
│ (Web/Mobile) │  │ (Handheld)   │  │ Dashboard     │
└──────┬───────┘  └──────┬───────┘  └──────┬────────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────┐
│                 API Gateway                           │
└───────┬─────────────┬──────────────┬─────────────────┘
        │             │              │
  ┌─────▼──────┐ ┌───▼──────┐  ┌───▼──────────┐
  │  Order     │ │ Inventory │  │ Fulfillment  │
  │  Service   │ │ Service   │  │ Service      │
  │  CRUD +    │ │ Real-time │  │ Pick tasks + │
  │  State     │ │ store-level│  │ Staging      │
  └─────┬──────┘ └───┬──────┘  └───┬──────────┘
        │             │              │
   ┌────▼───┐   ┌───▼────┐    ┌───▼──────┐
   │Postgres│   │ Redis  │    │ Postgres │
   │(orders)│   │(stock  │    │(tasks)   │
   │        │   │ cache) │    │          │
   └────────┘   └────────┘    └──────────┘

Order State Machine:
PLACED → INVENTORY_CHECK → {
  ALL_AVAILABLE → CONFIRMED → PICK_ASSIGNED → PICKING → STAGED → 
    CUSTOMER_ARRIVED → DISPENSING → COMPLETED
  PARTIAL_AVAILABLE → CUSTOMER_NOTIFIED → {
    CUSTOMER_ACCEPTS → CONFIRMED (reduced qty)
    CUSTOMER_CANCELS → CANCELLED → REFUNDED
  }
  NONE_AVAILABLE → CANCELLED → REFUNDED
}

Inventory Check (Real-Time Store Level):
class StoreInventoryService {
    AvailabilityResult checkAvailability(List<OrderItem> items, int storeId) {
        List<ItemAvailability> results = new ArrayList<>();
        
        for (OrderItem item : items) {
            // 1. Check Redis cache first (updated by POS system)
            int cachedQty = redis.get("store:" + storeId + ":sku:" + item.sku);
            
            if (cachedQty < 0) {
                // Cache miss: query store inventory DB
                cachedQty = inventoryDB.getQuantity(storeId, item.sku);
                redis.setex("store:" + storeId + ":sku:" + item.sku, 300, cachedQty); // 5min TTL
            }
            
            // 2. Subtract already reserved quantities
            int reserved = redis.get("reserved:" + storeId + ":" + item.sku);
            int available = cachedQty - reserved;
            
            results.add(new ItemAvailability(
                item.sku,
                item.quantity,
                Math.max(0, available),
                available >= item.quantity
            ));
        }
        
        boolean allAvailable = results.stream().allMatch(ItemAvailability::isAvailable);
        boolean noneAvailable = results.stream().noneMatch(ItemAvailability::isAvailable);
        
        return new AvailabilityResult(
            allAvailable ? Status.ALL : noneAvailable ? Status.NONE : Status.PARTIAL,
            results
        );
    }
}

Pick Task Assignment:
class FulfillmentService {
    void assignPickTask(Order order) {
        // 1. Optimize pick path (shortest path through store aisles)
        List<PickItem> pickList = order.getItems().stream()
            .map(item -> new PickItem(item.sku, item.quantity, getAisleLocation(item.sku)))
            .sorted(Comparator.comparing(PickItem::aisle).thenComparing(PickItem::shelf))
            .collect(Collectors.toList());
        
        // 2. Find available associate (least busy)
        Associate assignee = associateService.findAvailable(order.getStoreId());
        
        // 3. Create pick task
        PickTask task = PickTask.builder()
            .orderId(order.getId())
            .assigneeId(assignee.getId())
            .items(pickList)
            .status(PickStatus.ASSIGNED)
            .targetCompletionTime(Instant.now().plus(Duration.ofMinutes(30)))
            .build();
        
        taskRepo.save(task);
        
        // 4. Push notification to associate's handheld
        pushService.notify(assignee.getDeviceId(), "New pick task: Order #" + order.getId());
    }
}

Customer Geofence Check-In:
- Customer app sends GPS coordinates every 30s when near store
- Geofence: 200m radius around store
- When inside geofence for 60s → auto check-in notification
- Associate gets "Customer is here" → stage order for dispensing

Scale (Walmart):
- 4,700 stores in US
- 1M BOPIS orders/day across all stores
- Average 200 orders/day per store
- Pick task SLA: 30 minutes from order to staged
- Check-in to dispense: < 5 minutes
- Inventory sync: POS events → Kafka → Redis (< 30s delay)
```

---

## 🎯 Key Takeaways
- Walmart = **omnichannel retail + store operations + inventory management**
- **Merge Intervals**: sort by start → extend current or finalize — classic pattern
- **Insert Interval**: no sort needed (input already sorted) → 3-phase add-merge-add
- **BOPIS flow**: online order → store inventory check → pick → stage → geofence check-in → dispense
- **Partial fulfillment**: notify customer, let them accept reduced order or cancel — important edge case
- **Store-level inventory cache**: Redis with POS event updates via Kafka — 5-30s freshness
- **Pick path optimization**: sort by aisle+shelf for shortest walking path
- **Geofence auto check-in**: GPS proximity detection → reduces wait time for curbside pickup
- Walmart values: **customer service**, save people money, everyday low cost

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array, String |
| Coding | Medium | Merge Intervals, Insert Interval |
| System Design | Hard | BOPIS, Inventory, Fulfillment |
| HM | Medium | Walmart Values, Leadership |
