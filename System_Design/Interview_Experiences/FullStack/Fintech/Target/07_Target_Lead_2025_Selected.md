# Target — Senior Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target |
| **Role** | Senior Software Engineer |
| **Level** | Lead |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 3 weeks
- **Format:** On-site

## Round 2: Technical — Inventory Allocation Engine with Demand Forecasting

### Problem
Build an inventory allocation system for a retail chain:
- Multiple warehouses with stock levels per SKU
- Allocate inventory to orders using nearest-warehouse-first strategy
- Track allocation, reservation, and fulfillment states
- Support backorder queuing when stock is insufficient
- Basic demand forecasting (moving average) to trigger replenishment alerts

### 💡 Interview-Ready Answer

```java
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;

public class InventoryAllocationEngine {

    record Warehouse(String id, String location, double lat, double lng,
                     Map<String, Integer> stock) {}

    enum AllocationStatus { ALLOCATED, PARTIAL, BACKORDERED, FULFILLED, CANCELLED }

    static class AllocationResult {
        String orderId;
        String sku;
        int requestedQty;
        AllocationStatus status;
        List<WarehouseAllocation> allocations = new ArrayList<>();
        int backorderQty;

        AllocationResult(String orderId, String sku, int qty) {
            this.orderId = orderId;
            this.sku = sku;
            this.requestedQty = qty;
        }
    }

    record WarehouseAllocation(String warehouseId, int quantity, double distance) {}

    record DemandEntry(String sku, int quantity, LocalDate date) {}

    record ReplenishmentAlert(String sku, String warehouseId, int currentStock,
                              double avgDailyDemand, int daysUntilStockout,
                              int suggestedReorderQty) {}

    private final Map<String, Warehouse> warehouses = new ConcurrentHashMap<>();
    private final Queue<AllocationResult> backorderQueue = new ConcurrentLinkedQueue<>();
    private final List<DemandEntry> demandHistory = new CopyOnWriteArrayList<>();

    // Coordination lock per SKU
    private final ConcurrentHashMap<String, Object> skuLocks = new ConcurrentHashMap<>();

    public void addWarehouse(Warehouse warehouse) {
        warehouses.put(warehouse.id(), warehouse);
    }

    /**
     * Allocate inventory for an order using nearest-warehouse-first strategy.
     */
    public AllocationResult allocate(String orderId, String sku, int qty,
                                     double customerLat, double customerLng) {
        AllocationResult result = new AllocationResult(orderId, sku, qty);
        Object lock = skuLocks.computeIfAbsent(sku, k -> new Object());

        synchronized (lock) {
            // Sort warehouses by distance to customer
            List<Warehouse> sorted = warehouses.values().stream()
                .filter(w -> w.stock().getOrDefault(sku, 0) > 0)
                .sorted(Comparator.comparingDouble(w ->
                    haversine(customerLat, customerLng, w.lat(), w.lng())))
                .collect(Collectors.toList());

            int remaining = qty;

            for (Warehouse wh : sorted) {
                if (remaining <= 0) break;

                int available = wh.stock().getOrDefault(sku, 0);
                int toAllocate = Math.min(remaining, available);

                if (toAllocate > 0) {
                    // Deduct stock
                    wh.stock().put(sku, available - toAllocate);
                    double dist = haversine(customerLat, customerLng, wh.lat(), wh.lng());
                    result.allocations.add(new WarehouseAllocation(wh.id(), toAllocate, dist));
                    remaining -= toAllocate;
                }
            }

            if (remaining == 0) {
                result.status = AllocationStatus.ALLOCATED;
            } else if (remaining < qty) {
                result.status = AllocationStatus.PARTIAL;
                result.backorderQty = remaining;
                backorderQueue.add(result);
            } else {
                result.status = AllocationStatus.BACKORDERED;
                result.backorderQty = remaining;
                backorderQueue.add(result);
            }

            // Record demand
            demandHistory.add(new DemandEntry(sku, qty, LocalDate.now()));
        }

        return result;
    }

    /**
     * Process backorder queue when stock is replenished.
     */
    public List<AllocationResult> processBackorders(String sku) {
        List<AllocationResult> fulfilled = new ArrayList<>();

        Iterator<AllocationResult> iter = backorderQueue.iterator();
        while (iter.hasNext()) {
            AllocationResult bo = iter.next();
            if (!bo.sku.equals(sku)) continue;

            int totalAvailable = warehouses.values().stream()
                .mapToInt(w -> w.stock().getOrDefault(sku, 0))
                .sum();

            if (totalAvailable >= bo.backorderQty) {
                // Fulfill backorder (simplified: take from any warehouse)
                int remaining = bo.backorderQty;
                for (Warehouse wh : warehouses.values()) {
                    if (remaining <= 0) break;
                    int avail = wh.stock().getOrDefault(sku, 0);
                    int take = Math.min(remaining, avail);
                    if (take > 0) {
                        wh.stock().put(sku, avail - take);
                        bo.allocations.add(new WarehouseAllocation(wh.id(), take, 0));
                        remaining -= take;
                    }
                }
                bo.backorderQty = 0;
                bo.status = AllocationStatus.FULFILLED;
                iter.remove();
                fulfilled.add(bo);
            }
        }

        return fulfilled;
    }

    /**
     * Demand forecasting using Simple Moving Average (SMA).
     * Returns average daily demand for the last N days.
     */
    public double forecastDailyDemand(String sku, int windowDays) {
        LocalDate cutoff = LocalDate.now().minusDays(windowDays);

        int totalDemand = demandHistory.stream()
            .filter(d -> d.sku().equals(sku) && d.date().isAfter(cutoff))
            .mapToInt(DemandEntry::quantity)
            .sum();

        return (double) totalDemand / windowDays;
    }

    /**
     * Generate replenishment alerts for items running low.
     */
    public List<ReplenishmentAlert> checkReplenishment(int safetyStockDays, int forecastWindowDays) {
        List<ReplenishmentAlert> alerts = new ArrayList<>();

        // Get all unique SKUs
        Set<String> allSkus = warehouses.values().stream()
            .flatMap(w -> w.stock().keySet().stream())
            .collect(Collectors.toSet());

        for (String sku : allSkus) {
            double avgDemand = forecastDailyDemand(sku, forecastWindowDays);
            if (avgDemand <= 0) continue;

            for (Warehouse wh : warehouses.values()) {
                int stock = wh.stock().getOrDefault(sku, 0);
                int daysToStockout = (int) (stock / avgDemand);

                if (daysToStockout <= safetyStockDays) {
                    int reorderQty = (int) Math.ceil(avgDemand * safetyStockDays * 2) - stock;
                    alerts.add(new ReplenishmentAlert(
                        sku, wh.id(), stock, avgDemand, daysToStockout,
                        Math.max(0, reorderQty)
                    ));
                }
            }
        }

        return alerts.stream()
            .sorted(Comparator.comparingInt(ReplenishmentAlert::daysUntilStockout))
            .collect(Collectors.toList());
    }

    /**
     * Get inventory snapshot across all warehouses.
     */
    public Map<String, Map<String, Integer>> getInventorySnapshot() {
        Map<String, Map<String, Integer>> snapshot = new LinkedHashMap<>();
        for (Warehouse wh : warehouses.values()) {
            snapshot.put(wh.id(), new LinkedHashMap<>(wh.stock()));
        }
        return snapshot;
    }

    private double haversine(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public static void main(String[] args) {
        InventoryAllocationEngine engine = new InventoryAllocationEngine();

        // Set up warehouses
        engine.addWarehouse(new Warehouse("WH-BLR", "Bangalore", 12.97, 77.59,
            new ConcurrentHashMap<>(Map.of("SKU-001", 50, "SKU-002", 20))));
        engine.addWarehouse(new Warehouse("WH-MUM", "Mumbai", 19.07, 72.87,
            new ConcurrentHashMap<>(Map.of("SKU-001", 30, "SKU-002", 100))));
        engine.addWarehouse(new Warehouse("WH-DEL", "Delhi", 28.61, 77.20,
            new ConcurrentHashMap<>(Map.of("SKU-001", 80, "SKU-002", 40))));

        // Customer in Bangalore orders 60 units
        System.out.println("=== Allocation ===");
        AllocationResult r1 = engine.allocate("ORD-001", "SKU-001", 60, 12.93, 77.62);
        System.out.printf("Order %s: %s%n", r1.orderId, r1.status);
        r1.allocations.forEach(a ->
            System.out.printf("  %s → %d units (%.0f km)%n", a.warehouseId(), a.quantity(), a.distance()));

        // Large order that triggers partial allocation
        System.out.println("\n=== Partial + Backorder ===");
        AllocationResult r2 = engine.allocate("ORD-002", "SKU-001", 200, 28.50, 77.15);
        System.out.printf("Order %s: %s (backordered: %d)%n", r2.orderId, r2.status, r2.backorderQty);

        // Replenishment alerts
        System.out.println("\n=== Replenishment Alerts ===");
        engine.checkReplenishment(7, 30).forEach(a ->
            System.out.printf("  [%s] %s: %d stock, %.1f/day demand, %d days left → reorder %d%n",
                a.warehouseId(), a.sku(), a.currentStock(), a.avgDailyDemand(),
                a.daysUntilStockout(), a.suggestedReorderQty()));
    }
}
```

## 🎯 Key Takeaways
- Target asks **retail/supply-chain** problems — inventory management, allocation, fulfillment
- Nearest-warehouse-first: haversine distance → greedy allocation from closest
- Per-SKU locking prevents overselling in concurrent allocation scenarios
- Backorder queue with automatic fulfillment when stock is replenished
- Simple Moving Average (SMA) for demand forecasting — practical and explainable
- Safety stock days parameter drives replenishment alerts

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Graphs |
| Technical 1 | Medium-Hard | Domain Modeling, Geospatial, Concurrency |
| Technical 2 | Hard | System Design Discussion |
| HM | Medium | Behavioral, Retail Domain |
