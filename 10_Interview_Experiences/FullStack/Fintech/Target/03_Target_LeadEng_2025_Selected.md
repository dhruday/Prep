# Target — FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target Corporation |
| **Role** | Lead Engineer FullStack |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/target-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + System Design + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Product of Array Except Self** (LeetCode 238)
2. **Follow-up: Without using division, in O(1) extra space**

### 💡 Product of Array Except Self

```java
public int[] productExceptSelf(int[] nums) {
    int n = nums.length;
    int[] result = new int[n];
    
    // Left pass: result[i] = product of all elements to the left
    result[0] = 1;
    for (int i = 1; i < n; i++) {
        result[i] = result[i - 1] * nums[i - 1];
    }
    
    // Right pass: multiply by product of all elements to the right
    int rightProduct = 1;
    for (int i = n - 2; i >= 0; i--) {
        rightProduct *= nums[i + 1];
        result[i] *= rightProduct;
    }
    
    return result;
}
// Time: O(n), Space: O(1) extra (output array doesn't count)
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Target's Same-Day Delivery / Shipt Integration**
   - Customer orders online, selects same-day delivery window (2hr slots)
   - Shipt shopper assigned → shops in store → delivers to customer
   - Real-time substitution: item out of stock → suggest alternatives → customer approves/rejects
   - Delivery window management: capacity per window per store
   - Batching: multiple orders for same area assigned to one shopper

### 💡 Key Design

```
Architecture:
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Customer App │   │ Shopper App  │   │ Store Ops    │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                   │
       ▼                  ▼                   ▼
┌──────────────────────────────────────────────────────┐
│                  API Gateway                          │
└──────────┬──────────────────────────┬────────────────┘
           │                          │
  ┌────────▼─────────┐    ┌──────────▼──────────┐
  │ Order + Delivery  │    │ Shopper Assignment  │
  │ Service           │    │ Service             │
  │ - Window mgmt     │    │ - Proximity match   │
  │ - Capacity        │    │ - Load balancing    │
  │ - Substitution    │    │ - Batching          │
  └────────┬──────────┘    └──────────┬──────────┘
           │                          │
      ┌────▼─────┐              ┌────▼──────┐
      │PostgreSQL│              │Redis      │
      │(orders)  │              │(capacity + │
      │          │              │ shopper   │
      │          │              │ locations)│
      └──────────┘              └───────────┘

Delivery Window Management:
class DeliveryWindowService {
    List<DeliveryWindow> getAvailableWindows(int storeId, LocalDate date) {
        List<DeliveryWindow> windows = windowRepo.findByStoreAndDate(storeId, date);
        
        return windows.stream()
            .filter(w -> w.getRemainingCapacity() > 0)
            .filter(w -> w.getStartTime().isAfter(LocalDateTime.now().plusHours(2))) // 2hr lead time
            .map(w -> new DeliveryWindow(
                w.getId(), w.getStartTime(), w.getEndTime(),
                w.getRemainingCapacity(), calculateDeliveryFee(w)
            ))
            .toList();
    }
    
    boolean reserveWindow(String orderId, String windowId) {
        // Atomic capacity decrement
        String key = "window_capacity:" + windowId;
        Long remaining = redis.decr(key);
        
        if (remaining < 0) {
            redis.incr(key); // Rollback
            return false; // Window full
        }
        
        // Persist reservation
        windowReservationRepo.save(new WindowReservation(orderId, windowId));
        return true;
    }
    
    BigDecimal calculateDeliveryFee(DeliveryWindow window) {
        // Dynamic pricing based on demand
        double utilization = 1.0 - (window.getRemainingCapacity() / (double) window.getMaxCapacity());
        
        if (utilization > 0.9) return new BigDecimal("9.99"); // High demand
        if (utilization > 0.7) return new BigDecimal("5.99"); // Medium
        return new BigDecimal("3.99"); // Low demand — cheap to encourage
    }
}

Real-Time Substitution:
class SubstitutionService {
    SubstitutionRequest createSubstitution(String orderId, OrderItem unavailableItem) {
        // 1. Find alternatives
        List<Product> alternatives = findAlternatives(unavailableItem);
        
        // 2. Create substitution request
        SubstitutionRequest request = SubstitutionRequest.builder()
            .orderId(orderId)
            .originalItem(unavailableItem)
            .suggestedAlternatives(alternatives)
            .status(SubStatus.PENDING)
            .expiresAt(Instant.now().plus(Duration.ofMinutes(5))) // 5 min to respond
            .build();
        
        substitutionRepo.save(request);
        
        // 3. Push notification to customer
        pushService.send(order.getCustomerId(),
            "Item unavailable: " + unavailableItem.getName(),
            "Choose a substitute or skip this item",
            Map.of("type", "substitution", "requestId", request.getId()));
        
        return request;
    }
    
    List<Product> findAlternatives(OrderItem item) {
        // Same category + similar price range + in stock at store
        return productSearch.search(
            SearchQuery.builder()
                .category(item.getCategoryId())
                .priceRange(item.getPrice().multiply(new BigDecimal("0.8")),
                           item.getPrice().multiply(new BigDecimal("1.2")))
                .storeId(item.getStoreId())
                .inStockOnly(true)
                .limit(5)
                .build()
        );
    }
    
    // Customer response
    void handleResponse(String requestId, SubstitutionResponse response) {
        SubstitutionRequest request = substitutionRepo.findById(requestId);
        
        if (response.isAccepted()) {
            // Replace item in order
            orderService.replaceItem(request.orderId, request.originalItem, response.getChosenAlternative());
            
            // Price difference handling
            BigDecimal diff = response.getChosenAlternative().getPrice()
                .subtract(request.originalItem.getPrice());
            if (diff.compareTo(BigDecimal.ZERO) > 0) {
                // More expensive: charge customer
                paymentService.chargeAdditional(request.orderId, diff);
            } else {
                // Cheaper: refund difference
                paymentService.partialRefund(request.orderId, diff.abs());
            }
        } else {
            // Remove item from order + refund
            orderService.removeItem(request.orderId, request.originalItem);
            paymentService.partialRefund(request.orderId, request.originalItem.getPrice());
        }
        
        // Notify shopper to continue
        pushService.sendToShopper(request.getShopperId(), "Customer responded. Continue shopping.");
    }
}

Order Batching:
class OrderBatchingService {
    // Batch orders going to nearby addresses
    List<OrderBatch> createBatches(List<Order> orders, int maxBatchSize) {
        // 1. Cluster delivery addresses (K-means with K = ceil(orders/maxBatchSize))
        int k = (int) Math.ceil(orders.size() / (double) maxBatchSize);
        List<Cluster> clusters = kMeansClustering(
            orders.stream().map(o -> o.getDeliveryAddress().getCoordinates()).toList(),
            k
        );
        
        // 2. Assign orders to clusters
        List<OrderBatch> batches = new ArrayList<>();
        for (Cluster cluster : clusters) {
            OrderBatch batch = new OrderBatch();
            batch.setOrders(cluster.getPoints().stream()
                .map(Order.class::cast)
                .sorted(Comparator.comparing(o -> 
                    haversineDistance(batch.getStoreLocation(), o.getDeliveryAddress())))
                .limit(maxBatchSize)
                .toList());
            
            // 3. Optimize delivery route within batch (nearest neighbor TSP)
            batch.setRoute(optimizeRoute(batch.getStoreLocation(), batch.getOrders()));
            batches.add(batch);
        }
        
        return batches;
    }
}

Scale:
- 1,900 stores, 300K same-day deliveries/day
- 50-100 delivery windows per store per day
- Avg capacity: 30-50 orders per window
- Substitution response SLA: < 5 min
- Shopper assignment: < 2 minutes from order confirmation
```

---

## 🎯 Key Takeaways
- Target = **omnichannel retail + same-day delivery + in-store fulfillment**
- **Product Except Self**: two-pass (left prefix → right suffix) without division
- **Delivery window capacity**: Redis atomic decrement + rollback on full
- **Dynamic delivery fee**: based on window utilization — high demand = higher fee
- **Real-time substitution**: push notification → 5-min timer → customer accepts/rejects
- **Price adjustment on substitution**: more expensive = charge, cheaper = refund difference
- **Order batching**: K-means clustering of delivery addresses → nearest-neighbor route within batch
- Target values: **guest-centric**, inclusive, ethical — prepare behavioral stories aligned

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array |
| Coding | Medium | Product Except Self |
| System Design | Hard | Same-Day Delivery, Substitution, Batching |
| HM | Medium | Target Values, Leadership |
