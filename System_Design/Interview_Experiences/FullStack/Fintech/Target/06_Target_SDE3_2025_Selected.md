# Target — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target |
| **Role** | Senior Software Engineer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/target-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Supply Chain |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + System Design + HM)

---

## Round 2: Machine Coding — Build a Store-Level Demand Forecasting and Replenishment System
**Duration:** 90 minutes

### Challenge: Build a replenishment system that: forecasts demand per product per store, calculates reorder points, generates purchase orders, handles safety stock, and supports seasonal adjustments.

```java
import java.util.*;
import java.time.*;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Demand Forecasting & Replenishment System:
 * 
 * 1. Moving Average forecast (Simple + Exponential Smoothing)
 * 2. Reorder Point = (Average Daily Demand × Lead Time) + Safety Stock
 * 3. Safety Stock = Z × σ_demand × √(Lead Time)
 * 4. Economic Order Quantity (EOQ) = √(2 × D × S / H)
 * 5. Seasonal adjustment: multiply base forecast by seasonal index
 */

class Product {
    String sku;
    String name;
    String category;
    double unitCost;
    double holdingCostPerUnit; // Annual holding cost per unit
    double orderingCost;       // Cost per order placement
    int leadTimeDays;           // Supplier lead time
    double minOrderQuantity;
    
    Product(String sku, String name, double unitCost, int leadTimeDays) {
        this.sku = sku; this.name = name; this.unitCost = unitCost;
        this.leadTimeDays = leadTimeDays;
        this.holdingCostPerUnit = unitCost * 0.25; // 25% of unit cost annually
        this.orderingCost = 50; // Fixed $50 per order
        this.minOrderQuantity = 1;
    }
}

class DailySales {
    LocalDate date;
    double quantity;
    
    DailySales(LocalDate date, double quantity) {
        this.date = date; this.quantity = quantity;
    }
}

class ForecastResult {
    String sku;
    String storeId;
    double forecastedDailyDemand;
    double standardDeviation;
    double reorderPoint;
    double safetyStock;
    double economicOrderQuantity;
    double seasonalMultiplier;
    
    @Override
    public String toString() {
        return String.format("SKU=%s Store=%s Forecast=%.1f/day ROP=%.0f SS=%.0f EOQ=%.0f Season=%.2f",
            sku, storeId, forecastedDailyDemand, reorderPoint, safetyStock, 
            economicOrderQuantity, seasonalMultiplier);
    }
}

class PurchaseOrder {
    String poId;
    String sku;
    String storeId;
    int orderQuantity;
    LocalDate orderDate;
    LocalDate expectedDelivery;
    String reason; // "REORDER_POINT", "SAFETY_STOCK", "SEASONAL"
    
    PurchaseOrder(String poId, String sku, String storeId, int qty, int leadTimeDays, String reason) {
        this.poId = poId; this.sku = sku; this.storeId = storeId;
        this.orderQuantity = qty; this.orderDate = LocalDate.now();
        this.expectedDelivery = orderDate.plusDays(leadTimeDays);
        this.reason = reason;
    }
}

class ReplenishmentEngine {
    
    private final double serviceLevel = 0.95; // 95% service level → Z = 1.645
    private static final double Z_95 = 1.645;
    
    // Seasonal indices by month (1.0 = average, >1 = peak, <1 = slow)
    private final Map<String, double[]> seasonalProfiles = new HashMap<>();
    
    ReplenishmentEngine() {
        // Default seasonal profile for retail
        seasonalProfiles.put("DEFAULT", new double[]{
            0.85, 0.82, 0.90, 0.95, 1.00, 1.05, // Jan-Jun
            0.95, 1.00, 1.05, 1.10, 1.25, 1.50   // Jul-Dec (holiday peak)
        });
        
        // Electronics: Black Friday + Diwali peak
        seasonalProfiles.put("ELECTRONICS", new double[]{
            0.80, 0.75, 0.85, 0.90, 0.95, 1.00,
            0.90, 0.95, 1.00, 1.30, 1.45, 1.60
        });
    }
    
    // ---- Demand Forecasting ----
    
    /**
     * Exponential Smoothing forecast.
     * F(t+1) = α × Actual(t) + (1-α) × F(t)
     * 
     * α (smoothing factor): 0.1 = stable demand, 0.3 = moderate, 0.5 = volatile
     */
    double exponentialSmoothing(List<DailySales> history, double alpha) {
        if (history.isEmpty()) return 0;
        
        double forecast = history.get(0).quantity; // Initialize with first observation
        
        for (int i = 1; i < history.size(); i++) {
            forecast = alpha * history.get(i).quantity + (1 - alpha) * forecast;
        }
        
        return forecast;
    }
    
    /**
     * Simple Moving Average forecast.
     */
    double simpleMovingAverage(List<DailySales> history, int windowDays) {
        if (history.isEmpty()) return 0;
        
        int start = Math.max(0, history.size() - windowDays);
        double sum = 0;
        for (int i = start; i < history.size(); i++) {
            sum += history.get(i).quantity;
        }
        return sum / (history.size() - start);
    }
    
    /**
     * Standard deviation of daily demand.
     */
    double demandStdDev(List<DailySales> history, int windowDays) {
        int start = Math.max(0, history.size() - windowDays);
        double mean = simpleMovingAverage(history, windowDays);
        
        double sumSquaredDiff = 0;
        int count = 0;
        for (int i = start; i < history.size(); i++) {
            double diff = history.get(i).quantity - mean;
            sumSquaredDiff += diff * diff;
            count++;
        }
        
        return count > 1 ? Math.sqrt(sumSquaredDiff / (count - 1)) : 0;
    }
    
    // ---- Inventory Calculations ----
    
    /**
     * Generate full forecast and reorder parameters.
     */
    ForecastResult forecast(Product product, String storeId, List<DailySales> salesHistory) {
        ForecastResult result = new ForecastResult();
        result.sku = product.sku;
        result.storeId = storeId;
        
        // Base forecast (exponential smoothing)
        double baseForecast = exponentialSmoothing(salesHistory, 0.3);
        
        // Seasonal adjustment
        int currentMonth = LocalDate.now().getMonthValue(); // 1-12
        String category = product.category != null ? product.category : "DEFAULT";
        double[] seasonal = seasonalProfiles.getOrDefault(category, 
                           seasonalProfiles.get("DEFAULT"));
        double seasonalMultiplier = seasonal[currentMonth - 1];
        
        result.forecastedDailyDemand = baseForecast * seasonalMultiplier;
        result.seasonalMultiplier = seasonalMultiplier;
        
        // Standard deviation
        result.standardDeviation = demandStdDev(salesHistory, 30);
        
        // Safety Stock = Z × σ × √(LT)
        result.safetyStock = Z_95 * result.standardDeviation * Math.sqrt(product.leadTimeDays);
        
        // Reorder Point = (Avg Daily Demand × Lead Time) + Safety Stock
        result.reorderPoint = (result.forecastedDailyDemand * product.leadTimeDays) + result.safetyStock;
        
        // Economic Order Quantity = √(2 × D_annual × S / H)
        double annualDemand = result.forecastedDailyDemand * 365;
        result.economicOrderQuantity = Math.sqrt(
            (2 * annualDemand * product.orderingCost) / product.holdingCostPerUnit);
        
        return result;
    }
    
    /**
     * Check if a product at a store needs replenishment.
     * Generate purchase order if current stock <= reorder point.
     */
    PurchaseOrder checkReplenishment(Product product, String storeId, 
                                      double currentStock, List<DailySales> history) {
        ForecastResult fc = forecast(product, storeId, history);
        
        if (currentStock <= fc.reorderPoint) {
            int orderQty = (int) Math.ceil(Math.max(fc.economicOrderQuantity, product.minOrderQuantity));
            
            // If stock is critically low (below safety stock), order more
            String reason = "REORDER_POINT";
            if (currentStock <= fc.safetyStock) {
                orderQty = (int) Math.ceil(orderQty * 1.5); // 50% extra for critical
                reason = "SAFETY_STOCK";
            }
            
            // Seasonal boost check
            if (fc.seasonalMultiplier > 1.2) {
                orderQty = (int) Math.ceil(orderQty * fc.seasonalMultiplier);
                reason = "SEASONAL";
            }
            
            return new PurchaseOrder(
                "PO-" + System.currentTimeMillis(), product.sku, storeId,
                orderQty, product.leadTimeDays, reason);
        }
        
        return null; // No replenishment needed
    }
    
    /**
     * Batch replenishment check across all products/stores.
     */
    List<PurchaseOrder> batchReplenishmentCheck(
            Map<String, Product> products,
            Map<String, Map<String, Double>> stockLevels, // storeId → (sku → stock)
            Map<String, Map<String, List<DailySales>>> salesData // storeId → (sku → history)
    ) {
        List<PurchaseOrder> orders = new ArrayList<>();
        
        for (var storeEntry : stockLevels.entrySet()) {
            String storeId = storeEntry.getKey();
            
            for (var skuEntry : storeEntry.getValue().entrySet()) {
                String sku = skuEntry.getKey();
                double currentStock = skuEntry.getValue();
                Product product = products.get(sku);
                
                if (product == null) continue;
                
                List<DailySales> history = salesData
                    .getOrDefault(storeId, Collections.emptyMap())
                    .getOrDefault(sku, Collections.emptyList());
                
                PurchaseOrder po = checkReplenishment(product, storeId, currentStock, history);
                if (po != null) orders.add(po);
            }
        }
        
        // Sort by urgency (safety stock triggers first)
        orders.sort((a, b) -> {
            int priorityA = "SAFETY_STOCK".equals(a.reason) ? 0 : "SEASONAL".equals(a.reason) ? 1 : 2;
            int priorityB = "SAFETY_STOCK".equals(b.reason) ? 0 : "SEASONAL".equals(b.reason) ? 1 : 2;
            return Integer.compare(priorityA, priorityB);
        });
        
        return orders;
    }
}
```

---

## 🎯 Key Takeaways
- Target SDE-3 FS = **Demand forecasting + replenishment — exponential smoothing, safety stock, EOQ**
- **Exponential Smoothing**: `F(t+1) = α × Actual(t) + (1-α) × F(t)` — recent data weighted more (α=0.3)
- **Safety Stock**: `Z × σ × √(LeadTime)` — buffer for demand variability during lead time
- **Reorder Point**: `(AvgDemand × LeadTime) + SafetyStock` — trigger for replenishment
- **EOQ (Wilson formula)**: `√(2DS/H)` — minimizes total ordering + holding cost
- **Seasonal adjustment**: multiply base forecast by monthly seasonal index (1.0 = average)
- **Service level**: Z=1.645 for 95% — means 95% probability of not running out during lead time
- **Urgency sorting**: SAFETY_STOCK > SEASONAL > REORDER_POINT — critical shortages first
- Target = **retail supply chain** — this is exactly what Target's supply chain engineers build

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Very Hard | Supply Chain, Statistics, Forecasting |
| Technical 2 | Hard | API Design |
| System Design | Very Hard | Inventory Management at Scale |
| HM | Medium | Culture |
