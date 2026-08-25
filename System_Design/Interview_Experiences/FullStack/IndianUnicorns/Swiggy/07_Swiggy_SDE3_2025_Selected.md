# Swiggy — SDE-3 FullStack Interview Experience (2025) — #7

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
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Instamart |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Warehouse Slot Management System
**Duration:** 90 minutes

### Challenge: Build a warehouse inventory system for Swiggy Instamart: manage storage slots, handle product expiry (FIFO + First-Expire-First-Out), real-time availability, and batched picking for orders.

```java
import java.util.*;
import java.time.*;
import java.util.concurrent.*;
import java.math.BigDecimal;

/**
 * Warehouse Slot Management System:
 * 
 * Features:
 * 1. Slot management: each slot has a location (aisle-shelf-position), capacity, temperature zone
 * 2. FEFO (First Expire First Out): pick items expiring soonest first
 * 3. Batch picking: given an order, generate optimal pick list (minimize walking distance)
 * 4. Expiry alerts: flag items expiring within N days
 * 5. Inventory levels: real-time stock per product
 */

class StorageSlot {
    String slotId;      // "A-03-05" (Aisle-Shelf-Position)
    String zone;        // AMBIENT, CHILLED, FROZEN
    int capacity;       // Maximum units
    int occupied;       // Current units
    
    StorageSlot(String slotId, String zone, int capacity) {
        this.slotId = slotId; this.zone = zone;
        this.capacity = capacity; this.occupied = 0;
    }
    
    int available() { return capacity - occupied; }
    
    // Parse aisle number for distance calculation
    int aisleNumber() {
        return Integer.parseInt(slotId.split("-")[0].replace("A", ""));
    }
    
    int shelfNumber() {
        return Integer.parseInt(slotId.split("-")[1]);
    }
}

class InventoryItem {
    String productId;
    String productName;
    String slotId;
    int quantity;
    LocalDate expiryDate;
    LocalDate receivedDate;
    String batchId;
    BigDecimal costPrice;
    
    InventoryItem(String productId, String productName, String slotId, 
                   int quantity, LocalDate expiryDate, String batchId) {
        this.productId = productId; this.productName = productName;
        this.slotId = slotId; this.quantity = quantity;
        this.expiryDate = expiryDate; this.batchId = batchId;
        this.receivedDate = LocalDate.now();
    }
    
    boolean isExpired() { return expiryDate.isBefore(LocalDate.now()); }
    boolean isExpiringSoon(int days) { return expiryDate.isBefore(LocalDate.now().plusDays(days)); }
}

class PickItem {
    String productId;
    String productName;
    String slotId;
    String batchId;
    int quantity;
    LocalDate expiryDate;
    
    PickItem(InventoryItem item, int qty) {
        this.productId = item.productId; this.productName = item.productName;
        this.slotId = item.slotId; this.batchId = item.batchId;
        this.quantity = qty; this.expiryDate = item.expiryDate;
    }
}

class OrderLine {
    String productId;
    int quantity;
    
    OrderLine(String productId, int quantity) {
        this.productId = productId; this.quantity = quantity;
    }
}

class PickList {
    String orderId;
    List<PickItem> items;
    int estimatedWalkingDistance; // Aisle-units
    boolean complete; // All items fully picked
    List<String> shortages; // Products with insufficient stock
    
    PickList(String orderId) {
        this.orderId = orderId; this.items = new ArrayList<>();
        this.shortages = new ArrayList<>(); this.complete = true;
    }
}

class WarehouseManager {
    
    private final Map<String, StorageSlot> slots = new ConcurrentHashMap<>();
    
    // Product → list of inventory items (sorted by expiry for FEFO)
    private final Map<String, TreeMap<LocalDate, List<InventoryItem>>> inventory = new ConcurrentHashMap<>();
    
    // Product → total stock count (cached for O(1) lookup)
    private final Map<String, Integer> stockLevels = new ConcurrentHashMap<>();
    
    // ---- Slot Management ----
    
    void addSlot(StorageSlot slot) {
        slots.put(slot.slotId, slot);
    }
    
    // ---- Inbound: Receive Stock ----
    
    /**
     * Receive inventory into the warehouse.
     * Auto-assign to best available slot (same zone, most available space).
     */
    String receiveStock(String productId, String productName, int quantity, 
                         LocalDate expiryDate, String zone) {
        // Find best slot: same zone, most available space
        StorageSlot bestSlot = null;
        int bestAvailable = 0;
        
        for (StorageSlot slot : slots.values()) {
            if (!slot.zone.equals(zone)) continue;
            if (slot.available() > bestAvailable) {
                bestAvailable = slot.available();
                bestSlot = slot;
            }
        }
        
        if (bestSlot == null || bestAvailable < quantity) {
            return null; // No space
        }
        
        String batchId = "B" + System.currentTimeMillis();
        InventoryItem item = new InventoryItem(productId, productName, 
                                                bestSlot.slotId, quantity, expiryDate, batchId);
        
        // Add to inventory (FEFO: sorted by expiry date)
        inventory.computeIfAbsent(productId, k -> new TreeMap<>())
                 .computeIfAbsent(expiryDate, k -> new ArrayList<>())
                 .add(item);
        
        bestSlot.occupied += quantity;
        stockLevels.merge(productId, quantity, Integer::sum);
        
        return bestSlot.slotId;
    }
    
    // ---- Outbound: Pick for Order (FEFO) ----
    
    /**
     * Generate a pick list for an order.
     * Uses FEFO: pick items expiring soonest first.
     * Optimizes walking: sort pick items by aisle → shelf order.
     */
    PickList generatePickList(String orderId, List<OrderLine> orderLines) {
        PickList pickList = new PickList(orderId);
        
        for (OrderLine line : orderLines) {
            int remaining = line.quantity;
            TreeMap<LocalDate, List<InventoryItem>> productInventory = 
                inventory.get(line.productId);
            
            if (productInventory == null || productInventory.isEmpty()) {
                pickList.shortages.add(line.productId + " (0 available)");
                pickList.complete = false;
                continue;
            }
            
            // FEFO: iterate from earliest expiry
            Iterator<Map.Entry<LocalDate, List<InventoryItem>>> it = 
                productInventory.entrySet().iterator();
            
            while (it.hasNext() && remaining > 0) {
                Map.Entry<LocalDate, List<InventoryItem>> entry = it.next();
                
                // Skip expired items
                if (entry.getKey().isBefore(LocalDate.now())) {
                    continue;
                }
                
                List<InventoryItem> items = entry.getValue();
                Iterator<InventoryItem> itemIt = items.iterator();
                
                while (itemIt.hasNext() && remaining > 0) {
                    InventoryItem item = itemIt.next();
                    int pickQty = Math.min(remaining, item.quantity);
                    
                    pickList.items.add(new PickItem(item, pickQty));
                    
                    item.quantity -= pickQty;
                    remaining -= pickQty;
                    
                    // Update slot occupancy
                    StorageSlot slot = slots.get(item.slotId);
                    if (slot != null) slot.occupied -= pickQty;
                    stockLevels.merge(item.productId, -pickQty, Integer::sum);
                    
                    if (item.quantity == 0) {
                        itemIt.remove();
                    }
                }
                
                if (items.isEmpty()) it.remove();
            }
            
            if (remaining > 0) {
                pickList.shortages.add(line.productId + " (short " + remaining + ")");
                pickList.complete = false;
            }
        }
        
        // Optimize walking distance: sort by aisle → shelf
        pickList.items.sort((a, b) -> {
            StorageSlot sa = slots.get(a.slotId), sb = slots.get(b.slotId);
            if (sa == null || sb == null) return 0;
            int aisleCompare = Integer.compare(sa.aisleNumber(), sb.aisleNumber());
            if (aisleCompare != 0) return aisleCompare;
            return Integer.compare(sa.shelfNumber(), sb.shelfNumber());
        });
        
        // Estimate walking distance (simplified: sum of aisle transitions)
        int walkDist = 0;
        for (int i = 1; i < pickList.items.size(); i++) {
            StorageSlot prev = slots.get(pickList.items.get(i - 1).slotId);
            StorageSlot curr = slots.get(pickList.items.get(i).slotId);
            if (prev != null && curr != null) {
                walkDist += Math.abs(curr.aisleNumber() - prev.aisleNumber()) * 10 +
                            Math.abs(curr.shelfNumber() - prev.shelfNumber());
            }
        }
        pickList.estimatedWalkingDistance = walkDist;
        
        return pickList;
    }
    
    // ---- Expiry Alerts ----
    
    List<InventoryItem> getExpiringSoonItems(int daysThreshold) {
        List<InventoryItem> expiring = new ArrayList<>();
        
        for (TreeMap<LocalDate, List<InventoryItem>> productInv : inventory.values()) {
            // Only check dates <= today + threshold
            LocalDate cutoff = LocalDate.now().plusDays(daysThreshold);
            
            for (var entry : productInv.headMap(cutoff, true).entrySet()) {
                for (InventoryItem item : entry.getValue()) {
                    if (item.quantity > 0) expiring.add(item);
                }
            }
        }
        
        expiring.sort(Comparator.comparing(i -> i.expiryDate));
        return expiring;
    }
    
    // ---- Stock Levels ----
    
    int getStockLevel(String productId) {
        return stockLevels.getOrDefault(productId, 0);
    }
    
    Map<String, Integer> getAllStockLevels() {
        return Collections.unmodifiableMap(stockLevels);
    }
}
```

---

## 🎯 Key Takeaways
- Swiggy SDE-3 FS = **Warehouse management — FEFO picking, slot assignment, expiry tracking, batch picking**
- **FEFO (First Expire First Out)**: `TreeMap<LocalDate, List<InventoryItem>>` — iterate from earliest expiry date
- **Slot auto-assignment**: find slot in correct zone with most available space — greedy
- **Walk optimization**: sort pick items by aisle → shelf → position — snaking pattern minimizes travel
- **Walking distance**: sum of `|aisleΔ × 10 + shelfΔ|` — weighted model (aisle change costs more)
- **Expiry alerts**: `TreeMap.headMap(cutoff, true)` — O(log N + K) to find all items expiring before cutoff
- **Stock cache**: `ConcurrentHashMap<productId, count>` — O(1) stock level lookup
- **TreeMap for FEFO**: natural ordering by date — earliest expiry first, efficient range queries

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Very Hard | Inventory Management, FEFO, Optimization |
| System Design | Very Hard | Quick Commerce Architecture |
| HM | Medium | Culture |
