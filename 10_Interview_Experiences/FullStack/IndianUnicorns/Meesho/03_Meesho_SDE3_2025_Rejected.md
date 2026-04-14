# Meesho — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | SDE-3 |
| **Level** | Lead |
| **YOE** | 6.5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/meesho-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Machine Coding + DSA + LLD + System Design + HM)
- **Rejection Reason:** System Design — COD order fraud detection approach was naive

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build an Order Tracking System (like Meesho's order page)**
   - States: Placed → Confirmed → Shipped → Out for Delivery → Delivered
   - Support for multiple items in one order (each can be at different states)
   - Return/refund flow as separate state machine

### 💡 Interview-Ready Answer

```java
class OrderTrackingSystem {
    enum OrderItemStatus {
        PLACED, CONFIRMED, PACKED, SHIPPED, IN_TRANSIT,
        OUT_FOR_DELIVERY, DELIVERED, CANCELLED,
        RETURN_REQUESTED, RETURN_APPROVED, RETURN_PICKED_UP,
        RETURN_RECEIVED, REFUND_INITIATED, REFUNDED
    }
    
    record OrderItem(String itemId, String productId, String productName,
                      int quantity, BigDecimal price, OrderItemStatus status,
                      List<StatusUpdate> statusHistory, String trackingId,
                      String courierPartner) {}
    
    record StatusUpdate(OrderItemStatus status, Instant timestamp, String description,
                        String location) {}
    
    record Order(String orderId, String userId, List<OrderItem> items,
                  BigDecimal totalAmount, String paymentMode, Instant createdAt) {
        
        // Overall order status = min status of all items
        OrderItemStatus getOverallStatus() {
            return items.stream()
                .map(OrderItem::status)
                .min(Comparator.comparingInt(OrderItemStatus::ordinal))
                .orElse(OrderItemStatus.PLACED);
        }
    }
    
    // Valid transitions
    private static final Map<OrderItemStatus, Set<OrderItemStatus>> FORWARD_TRANSITIONS = Map.ofEntries(
        Map.entry(OrderItemStatus.PLACED, Set.of(OrderItemStatus.CONFIRMED, OrderItemStatus.CANCELLED)),
        Map.entry(OrderItemStatus.CONFIRMED, Set.of(OrderItemStatus.PACKED, OrderItemStatus.CANCELLED)),
        Map.entry(OrderItemStatus.PACKED, Set.of(OrderItemStatus.SHIPPED, OrderItemStatus.CANCELLED)),
        Map.entry(OrderItemStatus.SHIPPED, Set.of(OrderItemStatus.IN_TRANSIT)),
        Map.entry(OrderItemStatus.IN_TRANSIT, Set.of(OrderItemStatus.OUT_FOR_DELIVERY)),
        Map.entry(OrderItemStatus.OUT_FOR_DELIVERY, Set.of(OrderItemStatus.DELIVERED)),
        Map.entry(OrderItemStatus.DELIVERED, Set.of(OrderItemStatus.RETURN_REQUESTED)),
        Map.entry(OrderItemStatus.RETURN_REQUESTED, Set.of(OrderItemStatus.RETURN_APPROVED, OrderItemStatus.CANCELLED)),
        Map.entry(OrderItemStatus.RETURN_APPROVED, Set.of(OrderItemStatus.RETURN_PICKED_UP)),
        Map.entry(OrderItemStatus.RETURN_PICKED_UP, Set.of(OrderItemStatus.RETURN_RECEIVED)),
        Map.entry(OrderItemStatus.RETURN_RECEIVED, Set.of(OrderItemStatus.REFUND_INITIATED)),
        Map.entry(OrderItemStatus.REFUND_INITIATED, Set.of(OrderItemStatus.REFUNDED))
    );
    
    void updateItemStatus(String orderId, String itemId, OrderItemStatus newStatus,
                          String description, String location) {
        Order order = orders.get(orderId);
        if (order == null) throw new IllegalArgumentException("Order not found");
        
        OrderItem item = order.items.stream()
            .filter(i -> i.itemId.equals(itemId))
            .findFirst()
            .orElseThrow();
        
        Set<OrderItemStatus> allowed = FORWARD_TRANSITIONS.getOrDefault(item.status, Set.of());
        if (!allowed.contains(newStatus)) {
            throw new IllegalStateException(
                "Cannot transition " + item.status + " → " + newStatus
            );
        }
        
        // Update status
        item.statusHistory.add(new StatusUpdate(newStatus, Instant.now(), description, location));
        // item.status = newStatus (assume mutable or reconstruct)
        
        // Trigger notifications
        notifyUser(order.userId, item, newStatus, description);
        
        // Meesho-specific: COD order auto-confirm after 24 hours
        if (newStatus == OrderItemStatus.PLACED && order.paymentMode.equals("COD")) {
            scheduleAutoConfirm(orderId, itemId, Duration.ofHours(24));
        }
        
        // Auto-refund for prepaid cancelled orders
        if (newStatus == OrderItemStatus.CANCELLED && !order.paymentMode.equals("COD")) {
            initiateAutoRefund(orderId, itemId, item.price);
        }
    }
    
    // Track an item's journey with timeline
    List<TimelineEvent> getItemTimeline(String orderId, String itemId) {
        OrderItem item = findItem(orderId, itemId);
        
        return item.statusHistory.stream()
            .map(su -> new TimelineEvent(
                su.status.name(),
                su.timestamp,
                su.description,
                su.location,
                getStatusIcon(su.status),
                su.status == item.status // isActive
            ))
            .toList();
    }
    
    // Estimated delivery date based on courier + distance
    Instant getEstimatedDelivery(String orderId, String itemId) {
        OrderItem item = findItem(orderId, itemId);
        
        return switch (item.status) {
            case PLACED, CONFIRMED -> item.statusHistory.get(0).timestamp.plus(Duration.ofDays(7));
            case PACKED -> item.statusHistory.getLast().timestamp.plus(Duration.ofDays(5));
            case SHIPPED, IN_TRANSIT -> item.statusHistory.getLast().timestamp.plus(Duration.ofDays(3));
            case OUT_FOR_DELIVERY -> Instant.now().plus(Duration.ofHours(4));
            case DELIVERED -> item.statusHistory.getLast().timestamp;
            default -> null;
        };
    }
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Top K Frequent Elements** (LeetCode 347) — solve in O(n)
2. **Follow-up: Streaming version — elements arriving one at a time, return top K at any point**

### 💡 Top K Frequent — Bucket Sort O(n)

```java
// Approach: Bucket Sort — O(n) time, O(n) space
public int[] topKFrequent(int[] nums, int k) {
    // Count frequencies
    Map<Integer, Integer> freq = new HashMap<>();
    for (int num : nums) freq.merge(num, 1, Integer::sum);
    
    // Bucket sort: index = frequency, value = list of numbers with that frequency
    List<Integer>[] buckets = new List[nums.length + 1];
    for (int i = 0; i <= nums.length; i++) buckets[i] = new ArrayList<>();
    
    for (var entry : freq.entrySet()) {
        buckets[entry.getValue()].add(entry.getKey());
    }
    
    // Collect top K from highest frequency bucket
    int[] result = new int[k];
    int idx = 0;
    
    for (int i = buckets.length - 1; i >= 0 && idx < k; i--) {
        for (int num : buckets[i]) {
            result[idx++] = num;
            if (idx == k) break;
        }
    }
    
    return result;
}
// Time: O(n), Space: O(n)

// Follow-up: Streaming version with Space-Saving algorithm
class TopKStream {
    private final int k;
    private final Map<Integer, Integer> counts;
    private final TreeMap<Integer, Set<Integer>> freqToNums; // For quick min extraction
    
    TopKStream(int k) {
        this.k = k;
        this.counts = new HashMap<>();
        this.freqToNums = new TreeMap<>();
    }
    
    void add(int num) {
        if (counts.containsKey(num)) {
            int oldFreq = counts.get(num);
            removeFromFreqMap(oldFreq, num);
            counts.put(num, oldFreq + 1);
            addToFreqMap(oldFreq + 1, num);
        } else if (counts.size() < k) {
            counts.put(num, 1);
            addToFreqMap(1, num);
        } else {
            // Replace minimum frequency element
            int minFreq = freqToNums.firstKey();
            Set<Integer> minSet = freqToNums.get(minFreq);
            int evicted = minSet.iterator().next();
            removeFromFreqMap(minFreq, evicted);
            counts.remove(evicted);
            
            // Insert new element with frequency = minFreq + 1
            counts.put(num, minFreq + 1);
            addToFreqMap(minFreq + 1, num);
        }
    }
    
    List<Integer> getTopK() {
        return new ArrayList<>(counts.keySet());
    }
    
    private void addToFreqMap(int freq, int num) {
        freqToNums.computeIfAbsent(freq, f -> new LinkedHashSet<>()).add(num);
    }
    
    private void removeFromFreqMap(int freq, int num) {
        Set<Integer> set = freqToNums.get(freq);
        set.remove(num);
        if (set.isEmpty()) freqToNums.remove(freq);
    }
}
```

---

## 🎯 Key Takeaways
- Meesho SDE-3 = **e-commerce order lifecycle** + COD-heavy (80%+ orders are COD)
- **Order tracking**: per-item status (not per-order) since items ship separately
- **State machine with return flow**: separate forward + return transitions
- **COD specifics**: auto-confirm after 24h, can't auto-refund (need bank details)
- **Top K Frequent — Bucket Sort**: O(n) using frequency as array index — clever trick
- **Streaming Top K**: Space-Saving algorithm — replace min-frequency element when full
- Meesho rejected because **COD fraud detection** was naive — should have discussed:
  - Address quality scoring (pin code validation, suspicious patterns)
  - Repeat offender detection (same phone, address clustering)
  - Order velocity limits per user/address
  - ML model: features = {address quality, order history, payment history, device fingerprint}

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Order Tracking, State Machine, COD |
| DSA | Medium | Bucket Sort, Streaming Top K |
| LLD | Hard | E-commerce Order System |
| System Design | Very Hard | COD Fraud Detection, Address Scoring |
| HM | Medium | Behavioral, Leadership |
