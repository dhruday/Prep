# Grab — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab |
| **Role** | Senior Software Development Engineer |
| **Level** | SDE-3 / L5 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/grab-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + Bar Raiser)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Dynamic Pricing Engine — Implement Peak Hour Surge Algorithm**
   - Given historical ride demand data, compute surge multipliers per zone per time slot
   - Support real-time updates as new demand data arrives
   - Smoothing to avoid abrupt price jumps

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;

public class DynamicPricingEngine {

    static class ZoneTimeSlot {
        String zoneId;
        int hour; // 0-23

        ZoneTimeSlot(String zoneId, int hour) {
            this.zoneId = zoneId;
            this.hour = hour;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof ZoneTimeSlot other)) return false;
            return hour == other.hour && Objects.equals(zoneId, other.zoneId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(zoneId, hour);
        }
    }

    static class DemandStats {
        // Exponential moving average for smooth updates
        double ewmaDemand;
        double ewmaSupply;
        final double alpha; // smoothing factor (0 < alpha < 1)
        int sampleCount;

        DemandStats(double alpha) {
            this.alpha = alpha;
            this.ewmaDemand = 0;
            this.ewmaSupply = 0;
            this.sampleCount = 0;
        }

        void update(double demand, double supply) {
            if (sampleCount == 0) {
                ewmaDemand = demand;
                ewmaSupply = supply;
            } else {
                ewmaDemand = alpha * demand + (1 - alpha) * ewmaDemand;
                ewmaSupply = alpha * supply + (1 - alpha) * ewmaSupply;
            }
            sampleCount++;
        }

        double getDemandSupplyRatio() {
            if (ewmaSupply <= 0) return 5.0; // max surge if no supply
            return ewmaDemand / ewmaSupply;
        }
    }

    // Configuration
    private static final double MIN_SURGE = 1.0;
    private static final double MAX_SURGE = 3.0;
    private static final double SMOOTHING_ALPHA = 0.3;

    // Surge multiplier tiers with smooth interpolation
    private static final double[][] SURGE_TIERS = {
        // {demandSupplyRatio, surgeMultiplier}
        {0.0, 1.0},   // balanced → no surge
        {1.2, 1.2},   // slightly more demand
        {1.5, 1.5},
        {2.0, 2.0},
        {3.0, 2.5},
        {5.0, 3.0},   // extreme demand
    };

    private final ConcurrentHashMap<ZoneTimeSlot, DemandStats> statsMap = new ConcurrentHashMap<>();

    /**
     * Update demand/supply for a zone-time combination.
     * Uses EWMA for smoothing — prevents abrupt surge jumps.
     */
    public void updateDemandSupply(String zoneId, int hour, double demand, double supply) {
        ZoneTimeSlot key = new ZoneTimeSlot(zoneId, hour);
        DemandStats stats = statsMap.computeIfAbsent(key, k -> new DemandStats(SMOOTHING_ALPHA));
        stats.update(demand, supply);
    }

    /**
     * Compute surge multiplier with linear interpolation between tiers.
     */
    public double getSurgeMultiplier(String zoneId, int hour) {
        ZoneTimeSlot key = new ZoneTimeSlot(zoneId, hour);
        DemandStats stats = statsMap.get(key);

        if (stats == null || stats.sampleCount < 3) return 1.0; // not enough data

        double ratio = stats.getDemandSupplyRatio();
        return interpolateSurge(ratio);
    }

    private double interpolateSurge(double ratio) {
        if (ratio <= SURGE_TIERS[0][0]) return MIN_SURGE;
        if (ratio >= SURGE_TIERS[SURGE_TIERS.length - 1][0]) return MAX_SURGE;

        for (int i = 1; i < SURGE_TIERS.length; i++) {
            if (ratio <= SURGE_TIERS[i][0]) {
                double r0 = SURGE_TIERS[i - 1][0], s0 = SURGE_TIERS[i - 1][1];
                double r1 = SURGE_TIERS[i][0], s1 = SURGE_TIERS[i][1];
                // Linear interpolation
                double t = (ratio - r0) / (r1 - r0);
                return s0 + t * (s1 - s0);
            }
        }
        return MAX_SURGE;
    }

    /**
     * Get zone surge report for all time slots.
     */
    public Map<Integer, Double> getZoneSurgeReport(String zoneId) {
        Map<Integer, Double> report = new TreeMap<>();
        for (int h = 0; h < 24; h++) {
            report.put(h, getSurgeMultiplier(zoneId, h));
        }
        return report;
    }

    /**
     * Follow-up: Predictive surge based on historical patterns.
     * Weighted average of same weekday/hour from past N weeks.
     */
    static class PredictiveSurge {
        // dayOfWeek:hour -> list of historical demand ratios
        Map<String, LinkedList<Double>> history = new HashMap<>();
        int maxHistory = 4; // 4 weeks

        void recordHistorical(int dayOfWeek, int hour, double demandRatio) {
            String key = dayOfWeek + ":" + hour;
            history.computeIfAbsent(key, k -> new LinkedList<>()).addLast(demandRatio);
            if (history.get(key).size() > maxHistory) {
                history.get(key).removeFirst();
            }
        }

        double predictSurge(int dayOfWeek, int hour) {
            String key = dayOfWeek + ":" + hour;
            LinkedList<Double> ratios = history.get(key);
            if (ratios == null || ratios.isEmpty()) return 1.0;

            // Weighted average: more recent weeks get higher weight
            double weightedSum = 0, weightTotal = 0;
            int i = 0;
            for (double ratio : ratios) {
                double weight = i + 1; // 1, 2, 3, 4 (most recent = 4)
                weightedSum += ratio * weight;
                weightTotal += weight;
                i++;
            }

            return weightedSum / weightTotal;
        }
    }

    public static void main(String[] args) {
        DynamicPricingEngine engine = new DynamicPricingEngine();

        // Simulate rush hour data for zone "downtown"
        String zone = "downtown";
        // Morning: balanced
        engine.updateDemandSupply(zone, 8, 100, 80);
        engine.updateDemandSupply(zone, 8, 110, 75);
        engine.updateDemandSupply(zone, 8, 120, 70);

        // Evening peak: high demand
        engine.updateDemandSupply(zone, 18, 200, 60);
        engine.updateDemandSupply(zone, 18, 250, 55);
        engine.updateDemandSupply(zone, 18, 280, 50);

        // Night: balanced
        engine.updateDemandSupply(zone, 23, 30, 40);
        engine.updateDemandSupply(zone, 23, 25, 35);
        engine.updateDemandSupply(zone, 23, 20, 30);

        System.out.printf("8 AM surge: %.2fx%n", engine.getSurgeMultiplier(zone, 8));
        System.out.printf("6 PM surge: %.2fx%n", engine.getSurgeMultiplier(zone, 18));
        System.out.printf("11 PM surge: %.2fx%n", engine.getSurgeMultiplier(zone, 23));
    }
}
```

## Round 2: Technical — System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Grab's Real-Time Order Tracking System**
   - Track food/ride orders with live GPS updates
   - Push location updates to customers every 3 seconds
   - Handle driver going offline mid-trip

## Round 3: Technical — LLD
**Duration:** 60 minutes

### Questions Asked
1. **Design a Coupon/Promo Code System**
   - Support percentage, flat discount, first-ride-free
   - Usage limits per user, per coupon, per timeframe
   - Stackable vs non-stackable coupons

## Round 4: Bar Raiser
**Duration:** 45 minutes

### Result
- Rejected after bar raiser — felt system design lacked operational maturity discussion (monitoring, alerting, degraded modes)
- Feedback: Strong algorithmic thinking, needs more production systems experience

## 🎯 Key Takeaways
- Grab SDE-3 expects **production systems maturity** — monitoring, alerting, graceful degradation
- EWMA (Exponential Weighted Moving Average) is the standard for smooth real-time metrics
- Linear interpolation between surge tiers prevents price cliffs at boundaries
- System design at ride-hailing companies focuses on **real-time location streaming** and GPS data management
- Predictive surge using historical patterns shows ML-adjacent thinking

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Hard | EWMA, Pricing, Interpolation |
| System Design | Hard | GPS Tracking, WebSocket, Push |
| LLD | Medium | Coupon System, Strategy Pattern |
| Bar Raiser | Medium-Hard | Behavioral, Operational Maturity |
