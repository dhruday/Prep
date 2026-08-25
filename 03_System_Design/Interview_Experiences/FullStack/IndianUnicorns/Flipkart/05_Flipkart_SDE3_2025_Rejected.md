# Flipkart — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-3 FullStack |
| **Level** | Lead |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience/) |
| **Author** | Anonymous |
| **Rejection Reason** | System design — missed CDC (Change Data Capture) for real-time inventory sync |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding + Machine Coding + System Design + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Minimum Window Substring** (LeetCode 76) — Classic sliding window
2. **Follow-up: Handle duplicate characters in target, return all minimum windows**

### 💡 Minimum Window Substring

```java
public String minWindow(String s, String t) {
    if (s.length() < t.length()) return "";
    
    // Count characters needed from t
    Map<Character, Integer> need = new HashMap<>();
    for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);
    
    int required = need.size(); // Number of unique chars to satisfy
    int formed = 0; // How many unique chars currently satisfied
    
    Map<Character, Integer> window = new HashMap<>();
    int left = 0;
    int minLen = Integer.MAX_VALUE;
    int minLeft = 0;
    
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        window.merge(c, 1, Integer::sum);
        
        // Check if current char's count satisfies need
        if (need.containsKey(c) && window.get(c).intValue() == need.get(c).intValue()) {
            formed++;
        }
        
        // Shrink window from left while valid
        while (formed == required) {
            // Update minimum
            if (right - left + 1 < minLen) {
                minLen = right - left + 1;
                minLeft = left;
            }
            
            // Remove leftmost character
            char leftChar = s.charAt(left);
            window.merge(leftChar, -1, Integer::sum);
            if (need.containsKey(leftChar) && window.get(leftChar) < need.get(leftChar)) {
                formed--;
            }
            left++;
        }
    }
    
    return minLen == Integer.MAX_VALUE ? "" : s.substring(minLeft, minLeft + minLen);
}
// Time: O(|S| + |T|), Space: O(|S| + |T|)
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Flipkart's Real-Time Inventory Management System**
   - Multi-warehouse inventory tracking
   - Real-time stock updates (purchase, return, restock)
   - Overselling prevention during flash sales
   - Inventory reservation with timeout (cart hold)
   - Cross-warehouse stock aggregation for search results

### 💡 Key Design

```
Architecture:
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
└───────┬────────────────┬──────────────────┬─────────────┘
        │                │                  │
   ┌────▼─────┐    ┌────▼──────┐     ┌────▼──────────┐
   │ Inventory │    │ Reservation│     │ Search/Catalog │
   │ Service   │    │ Service    │     │ Service        │
   │ - Stock   │    │ - Cart hold│     │ - Aggregated   │
   │ - Restock │    │ - Timeout  │     │   stock count  │
   │ - History │    │ - Release  │     │ - Filters      │
   └────┬──────┘    └────┬───────┘     └───────┬────────┘
        │                │                      │
   ┌────▼──────┐    ┌───▼────┐          ┌──────▼──────┐
   │PostgreSQL  │    │ Redis  │          │ElasticSearch│
   │(inventory) │    │(locks  │          │(product     │
   │            │    │+cache) │          │ catalog)    │
   └────┬───────┘    └────────┘          └─────────────┘
        │
   ┌────▼──────┐
   │ Kafka     │ → CDC events → ES reindex
   │(events)   │ → Analytics
   └───────────┘

Inventory Data Model:
CREATE TABLE warehouse_inventory (
    product_id BIGINT,
    warehouse_id INT,
    available_qty INT NOT NULL DEFAULT 0,
    reserved_qty INT NOT NULL DEFAULT 0,
    total_qty INT GENERATED ALWAYS AS (available_qty + reserved_qty) STORED,
    version INT NOT NULL DEFAULT 0, -- Optimistic locking
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (product_id, warehouse_id),
    CONSTRAINT qty_non_negative CHECK (available_qty >= 0 AND reserved_qty >= 0)
);

// Reservation table (for cart hold with TTL)
CREATE TABLE inventory_reservations (
    reservation_id UUID PRIMARY KEY,
    product_id BIGINT,
    warehouse_id INT,
    quantity INT,
    user_id BIGINT,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, CONFIRMED, EXPIRED, RELEASED
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_reservation_expiry ON inventory_reservations(expires_at) WHERE status = 'ACTIVE';

Overselling Prevention (Optimistic Locking + Redis):
class InventoryService {
    // Reserve stock (called when adding to cart)
    ReservationResult reserve(long productId, int warehouseId, int qty, long userId) {
        // 1. Redis distributed lock (per product-warehouse)
        String lockKey = "inv_lock:" + productId + ":" + warehouseId;
        
        try (var lock = redisLock.acquire(lockKey, Duration.ofSeconds(5))) {
            // 2. Check available quantity
            var inventory = inventoryRepo.findByProductAndWarehouse(productId, warehouseId);
            
            if (inventory.getAvailableQty() < qty) {
                return ReservationResult.outOfStock(inventory.getAvailableQty());
            }
            
            // 3. Atomically decrement available, increment reserved
            int updated = inventoryRepo.reserveStock(productId, warehouseId, qty, inventory.getVersion());
            // UPDATE warehouse_inventory 
            //   SET available_qty = available_qty - :qty, 
            //       reserved_qty = reserved_qty + :qty,
            //       version = version + 1
            //   WHERE product_id = :pid AND warehouse_id = :wid AND version = :ver
            //   AND available_qty >= :qty
            
            if (updated == 0) {
                throw new OptimisticLockException("Concurrent modification");
            }
            
            // 4. Create reservation with TTL (10 minutes)
            var reservation = new Reservation(productId, warehouseId, qty, userId,
                                              Instant.now().plus(Duration.ofMinutes(10)));
            reservationRepo.save(reservation);
            
            // 5. Schedule expiry check
            kafka.send("reservation.created", reservation);
            
            return ReservationResult.success(reservation.getId());
        }
    }
    
    // Confirm reservation (called at checkout/payment)
    void confirm(UUID reservationId) {
        var reservation = reservationRepo.findById(reservationId);
        if (reservation.getStatus() != Status.ACTIVE) {
            throw new IllegalStateException("Reservation not active");
        }
        
        // Decrement reserved_qty (stock already removed from available)
        inventoryRepo.confirmReservation(
            reservation.getProductId(), 
            reservation.getWarehouseId(), 
            reservation.getQuantity()
        );
        // UPDATE warehouse_inventory 
        //   SET reserved_qty = reserved_qty - :qty WHERE ...
        
        reservation.setStatus(Status.CONFIRMED);
        reservationRepo.save(reservation);
    }
    
    // Release expired reservations (cron every 1 minute)
    @Scheduled(fixedRate = 60000)
    void releaseExpiredReservations() {
        var expired = reservationRepo.findExpired(Instant.now());
        for (var reservation : expired) {
            // Return stock: available_qty += qty, reserved_qty -= qty
            inventoryRepo.releaseStock(
                reservation.getProductId(),
                reservation.getWarehouseId(),
                reservation.getQuantity()
            );
            reservation.setStatus(Status.EXPIRED);
            reservationRepo.save(reservation);
        }
    }
}

Flash Sale Protection:
1. Pre-warm Redis cache: SET "flash:product123:stock" 1000
2. Atomic decrement: DECRBY "flash:product123:stock" 1
   - If result < 0 → INCRBY 1 (rollback) + return "sold out"
   - If result >= 0 → proceed to DB reservation
3. Rate limit: max 5 requests per user per second per product
4. Queue overflow: Kafka → process in order → prevent thundering herd

CDC for Real-Time Search Sync:
- Debezium CDC on PostgreSQL WAL → Kafka → ES Consumer
- On inventory change: update ES document's stock field
- Search results show: "In Stock" / "Only 3 left" / "Out of Stock"
- Near real-time: < 5s delay from DB write to search update

Scale:
- 200M products, 50 warehouses
- Flash sale peak: 100K requests/second per product
- Database: partitioned by product_id range
- Redis: 99.99% availability with Sentinel
```

---

## 🎯 Key Takeaways
- Flipkart = **e-commerce inventory + flash sales + consistency > availability**
- **Minimum Window Substring**: two-pointer sliding window with `formed` counter for unique chars
- **Overselling prevention**: Redis distributed lock + optimistic locking (version field) + DB constraint
- **Cart reservation with TTL**: decrement `available_qty`, increment `reserved_qty`, scheduled release
- **Flash sale**: Redis atomic DECRBY as gatekeeper before hitting DB — handle 100K rps
- **CDC (Debezium)**: capture DB changes from WAL → Kafka → update search index in near real-time
- **Two-phase stock**: available_qty (can be sold) vs reserved_qty (held in carts) = clear separation
- Flipkart interviews value: **practical e-commerce problems**, scale at India-level traffic

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Sliding Window, Minimum Window |
| Machine Coding | Medium-Hard | E-Commerce Feature |
| System Design | Hard | Inventory, Reservations, Flash Sale |
| HM | Medium | Leadership, Ownership |
