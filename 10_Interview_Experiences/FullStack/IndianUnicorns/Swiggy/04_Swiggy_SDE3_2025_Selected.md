# Swiggy — SDE-3 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Swiggy Instamart |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Machine Coding + 2 Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Design a Warehouse Inventory Management System** (Swiggy Instamart context)
- Multiple warehouses (dark stores) with inventory
- Product catalog with categories
- Stock level tracking with low-stock alerts
- Stock transfer between warehouses
- Demand-based auto-replenishment suggestions

### 💡 Warehouse Inventory System

```java
class WarehouseInventorySystem {
    private final Map<String, Warehouse> warehouses = new ConcurrentHashMap<>();
    private final Map<String, Product> productCatalog = new ConcurrentHashMap<>();
    private final List<InventoryObserver> observers = new CopyOnWriteArrayList<>();
    
    // Observer pattern for alerts
    interface InventoryObserver {
        void onLowStock(String warehouseId, String productId, int currentQty, int threshold);
        void onOutOfStock(String warehouseId, String productId);
        void onReplenishmentSuggestion(String warehouseId, String productId, int suggestedQty);
    }
    
    // Add stock to warehouse
    void addStock(String warehouseId, String productId, int quantity) {
        Warehouse warehouse = warehouses.get(warehouseId);
        if (warehouse == null) throw new IllegalArgumentException("Unknown warehouse: " + warehouseId);
        
        warehouse.getLock().lock();
        try {
            StockEntry entry = warehouse.getStock().computeIfAbsent(productId,
                k -> new StockEntry(productId, 0, getDefaultThreshold(productId)));
            entry.setQuantity(entry.getQuantity() + quantity);
            entry.setLastUpdated(Instant.now());
        } finally {
            warehouse.getLock().unlock();
        }
    }
    
    // Deduct stock (for order fulfillment)
    boolean deductStock(String warehouseId, String productId, int quantity) {
        Warehouse warehouse = warehouses.get(warehouseId);
        
        warehouse.getLock().lock();
        try {
            StockEntry entry = warehouse.getStock().get(productId);
            if (entry == null || entry.getQuantity() < quantity) return false;
            
            entry.setQuantity(entry.getQuantity() - quantity);
            entry.setLastUpdated(Instant.now());
            
            // Check alerts
            if (entry.getQuantity() == 0) {
                notifyObservers(o -> o.onOutOfStock(warehouseId, productId));
            } else if (entry.getQuantity() <= entry.getLowStockThreshold()) {
                notifyObservers(o -> o.onLowStock(warehouseId, productId, 
                    entry.getQuantity(), entry.getLowStockThreshold()));
            }
            
            return true;
        } finally {
            warehouse.getLock().unlock();
        }
    }
    
    // Transfer stock between warehouses
    TransferResult transferStock(String fromWarehouse, String toWarehouse, 
                                 String productId, int quantity) {
        // Always lock in consistent order to prevent deadlock
        String first = fromWarehouse.compareTo(toWarehouse) < 0 ? fromWarehouse : toWarehouse;
        String second = first.equals(fromWarehouse) ? toWarehouse : fromWarehouse;
        
        Warehouse w1 = warehouses.get(first);
        Warehouse w2 = warehouses.get(second);
        
        w1.getLock().lock();
        try {
            w2.getLock().lock();
            try {
                Warehouse from = warehouses.get(fromWarehouse);
                Warehouse to = warehouses.get(toWarehouse);
                
                StockEntry fromEntry = from.getStock().get(productId);
                if (fromEntry == null || fromEntry.getQuantity() < quantity) {
                    return TransferResult.insufficientStock();
                }
                
                fromEntry.setQuantity(fromEntry.getQuantity() - quantity);
                
                StockEntry toEntry = to.getStock().computeIfAbsent(productId,
                    k -> new StockEntry(productId, 0, getDefaultThreshold(productId)));
                toEntry.setQuantity(toEntry.getQuantity() + quantity);
                
                return TransferResult.success(fromWarehouse, toWarehouse, productId, quantity);
            } finally {
                w2.getLock().unlock();
            }
        } finally {
            w1.getLock().unlock();
        }
    }
    
    // Auto-replenishment suggestion based on demand
    List<ReplenishmentSuggestion> getReplenishmentSuggestions(String warehouseId) {
        Warehouse warehouse = warehouses.get(warehouseId);
        List<ReplenishmentSuggestion> suggestions = new ArrayList<>();
        
        for (var entry : warehouse.getStock().entrySet()) {
            String productId = entry.getKey();
            StockEntry stock = entry.getValue();
            
            // Calculate average daily demand (last 7 days)
            double avgDailyDemand = salesHistory.getAvgDailySales(warehouseId, productId, 7);
            
            // Days of stock remaining
            double daysRemaining = avgDailyDemand > 0 
                ? stock.getQuantity() / avgDailyDemand : Double.MAX_VALUE;
            
            // Lead time: average time to receive from supplier (in days)
            double leadTimeDays = supplierService.getAvgLeadTime(productId);
            
            // Reorder point = (avg demand × lead time) + safety stock
            double safetyStock = avgDailyDemand * 1.5; // 1.5 days safety buffer
            double reorderPoint = (avgDailyDemand * leadTimeDays) + safetyStock;
            
            if (stock.getQuantity() <= reorderPoint) {
                // Order quantity: enough for 7 days + safety stock
                int orderQty = (int) Math.ceil(avgDailyDemand * 7 + safetyStock - stock.getQuantity());
                
                suggestions.add(new ReplenishmentSuggestion(
                    warehouseId, productId, orderQty,
                    daysRemaining, ReplenishmentPriority.fromDays(daysRemaining)
                ));
            }
        }
        
        // Sort by priority (most urgent first)
        suggestions.sort(Comparator.comparing(ReplenishmentSuggestion::getPriority));
        return suggestions;
    }
    
    private void notifyObservers(Consumer<InventoryObserver> action) {
        for (InventoryObserver observer : observers) {
            try { action.accept(observer); } catch (Exception ignored) {}
        }
    }
}
```

---

## 🎯 Key Takeaways
- Swiggy = **inventory management + demand forecasting + real-time stock tracking**
- **Cheapest Flights**: Bellman-Ford K+1 rounds — also applicable to delivery route optimization
- **Deadlock prevention**: always acquire locks in consistent order (alphabetical warehouse ID)
- **Observer pattern**: decouple alert logic from stock operations — extensible for new alert types
- **Reorder point formula**: (avg_demand × lead_time) + safety_stock → trigger replenishment before stockout
- **Stock transfer**: atomic two-warehouse lock → deduct from source → add to destination
- **Demand-based replenishment**: 7-day rolling average × lead time + 1.5-day safety buffer
- Swiggy Instamart: **dark store operations** are key domain knowledge (10-minute delivery context)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Inventory Management, Concurrency |
| Technical | Medium-Hard | Java Internals, System Design |
| System Design | Hard | Dark Stores, Demand Forecasting |
| HM | Medium | Leadership, Ownership |
