# Ola — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2.5 weeks
- **Format:** Virtual

## Round 2: Technical — Dynamic Surge Pricing Engine

### Problem
Implement a surge pricing engine for a ride-hailing app:
- Track demand (ride requests) and supply (available drivers) per zone
- Calculate surge multiplier based on demand/supply ratio
- Smooth surge transitions (don't spike/drop instantly)
- Support different vehicle types with different base fares
- Cap surge at configurable maximum

### 💡 Interview-Ready Answer

```java
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;

public class SurgePricingEngine {

    record ZoneId(String value) {}

    enum VehicleType {
        AUTO(50, 12),    // baseFare, perKmRate
        MINI(80, 15),
        SEDAN(120, 18),
        SUV(200, 25);

        final double baseFare;
        final double perKmRate;

        VehicleType(double baseFare, double perKmRate) {
            this.baseFare = baseFare;
            this.perKmRate = perKmRate;
        }
    }

    static class ZoneMetrics {
        final ZoneId zoneId;
        int activeRequests = 0;
        int availableDrivers = 0;
        double currentMultiplier = 1.0;
        final Deque<Double> multiplierHistory = new ArrayDeque<>(); // For smoothing
        LocalDateTime lastUpdated = LocalDateTime.now();

        ZoneMetrics(ZoneId zoneId) {
            this.zoneId = zoneId;
        }
    }

    record FareEstimate(ZoneId zone, VehicleType vehicleType, double distanceKm,
                        double baseFare, double surgeMultiplier, double surgedFare,
                        double totalFare) {}

    // Configuration
    private double maxSurgeMultiplier = 3.0;
    private double minSurgeMultiplier = 0.8;   // Discount during oversupply
    private double smoothingFactor = 0.3;       // EMA alpha
    private int historyWindow = 5;              // Smoothing window size
    private double highDemandThreshold = 1.5;   // demand/supply ratio for surge start
    private double lowDemandThreshold = 0.5;    // ratio for discount

    private final ConcurrentHashMap<ZoneId, ZoneMetrics> zones = new ConcurrentHashMap<>();

    public void registerZone(ZoneId zoneId) {
        zones.putIfAbsent(zoneId, new ZoneMetrics(zoneId));
    }

    /**
     * Update demand/supply and recalculate surge for a zone.
     */
    public double updateZoneMetrics(ZoneId zoneId, int requests, int drivers) {
        ZoneMetrics metrics = zones.computeIfAbsent(zoneId, ZoneMetrics::new);
        metrics.activeRequests = requests;
        metrics.availableDrivers = drivers;

        double rawMultiplier = calculateRawMultiplier(requests, drivers);
        double smoothedMultiplier = applySmoothing(metrics, rawMultiplier);
        double clampedMultiplier = clamp(smoothedMultiplier, minSurgeMultiplier, maxSurgeMultiplier);

        metrics.currentMultiplier = clampedMultiplier;
        metrics.lastUpdated = LocalDateTime.now();

        return clampedMultiplier;
    }

    /**
     * Calculate raw surge multiplier from demand/supply ratio.
     * Uses a piecewise linear function:
     *   - ratio <= lowDemand: minSurge
     *   - lowDemand < ratio <= 1.0: linear interpolation to 1.0
     *   - 1.0 < ratio <= highDemand: stays at 1.0
     *   - ratio > highDemand: linear ramp up
     */
    private double calculateRawMultiplier(int requests, int drivers) {
        if (drivers == 0) return maxSurgeMultiplier; // No supply → max surge

        double ratio = (double) requests / drivers;

        if (ratio <= lowDemandThreshold) {
            return minSurgeMultiplier;
        } else if (ratio <= 1.0) {
            // Linearly interpolate from minSurge at lowThreshold to 1.0 at ratio=1.0
            double t = (ratio - lowDemandThreshold) / (1.0 - lowDemandThreshold);
            return minSurgeMultiplier + t * (1.0 - minSurgeMultiplier);
        } else if (ratio <= highDemandThreshold) {
            return 1.0; // Normal pricing zone
        } else {
            // Surge zone: linear ramp
            // At highDemand → 1.0x, at 2*highDemand → maxSurge
            double surgeRange = maxSurgeMultiplier - 1.0;
            double t = (ratio - highDemandThreshold) / highDemandThreshold;
            return 1.0 + Math.min(t * surgeRange, surgeRange);
        }
    }

    /**
     * Exponential Moving Average smoothing to prevent jarring price changes.
     */
    private double applySmoothing(ZoneMetrics metrics, double rawMultiplier) {
        metrics.multiplierHistory.addLast(rawMultiplier);
        if (metrics.multiplierHistory.size() > historyWindow) {
            metrics.multiplierHistory.pollFirst();
        }

        // EMA: new = alpha * raw + (1-alpha) * previous
        return smoothingFactor * rawMultiplier
            + (1 - smoothingFactor) * metrics.currentMultiplier;
    }

    /**
     * Estimate fare for a ride.
     */
    public FareEstimate estimateFare(ZoneId zoneId, VehicleType vehicleType, double distanceKm) {
        ZoneMetrics metrics = zones.get(zoneId);
        double multiplier = (metrics != null) ? metrics.currentMultiplier : 1.0;

        double baseFare = vehicleType.baseFare;
        double distanceFare = vehicleType.perKmRate * distanceKm;
        double subtotal = baseFare + distanceFare;
        double surgedFare = subtotal * multiplier;

        // Round to nearest rupee
        double totalFare = Math.round(surgedFare);

        return new FareEstimate(zoneId, vehicleType, distanceKm, subtotal,
            multiplier, surgedFare, totalFare);
    }

    /**
     * Get all zones with active surge.
     */
    public Map<ZoneId, Double> getActiveSurgeZones() {
        return zones.entrySet().stream()
            .filter(e -> e.getValue().currentMultiplier > 1.05) // 5% threshold
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                e -> Math.round(e.getValue().currentMultiplier * 100.0) / 100.0
            ));
    }

    /**
     * Dashboard view of all zones.
     */
    public void printDashboard() {
        System.out.println("╔══════════════╦══════════╦═════════╦════════════╗");
        System.out.println("║ Zone         ║ Requests ║ Drivers ║ Multiplier ║");
        System.out.println("╠══════════════╬══════════╬═════════╬════════════╣");
        for (ZoneMetrics m : zones.values()) {
            System.out.printf("║ %-12s ║ %8d ║ %7d ║ %9.2fx ║%n",
                m.zoneId.value(), m.activeRequests, m.availableDrivers, m.currentMultiplier);
        }
        System.out.println("╚══════════════╩══════════╩═════════╩════════════╝");
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    public static void main(String[] args) {
        SurgePricingEngine engine = new SurgePricingEngine();

        ZoneId koramangala = new ZoneId("Koramangala");
        ZoneId airport = new ZoneId("Airport");
        ZoneId whitefield = new ZoneId("Whitefield");

        engine.registerZone(koramangala);
        engine.registerZone(airport);
        engine.registerZone(whitefield);

        // Simulate different demand scenarios
        System.out.println("=== Initial State ===");
        engine.updateZoneMetrics(koramangala, 50, 30);   // Balanced
        engine.updateZoneMetrics(airport, 100, 20);       // High demand
        engine.updateZoneMetrics(whitefield, 10, 40);     // Oversupply
        engine.printDashboard();

        // Compute fare estimates
        System.out.println("\n=== Fare Estimates (10km ride) ===");
        for (VehicleType vt : VehicleType.values()) {
            FareEstimate est = engine.estimateFare(airport, vt, 10);
            System.out.printf("  %s: Base ₹%.0f × %.2f surge = ₹%.0f%n",
                vt, est.baseFare(), est.surgeMultiplier(), est.totalFare());
        }

        // Simulate surge building over time
        System.out.println("\n=== Surge Building (Airport) ===");
        for (int i = 1; i <= 5; i++) {
            double mult = engine.updateZoneMetrics(airport, 100 + i * 20, 20 - i);
            System.out.printf("  Tick %d: requests=%d, drivers=%d → %.2fx%n",
                i, 100 + i * 20, 20 - i, mult);
        }

        System.out.println("\n=== Active Surge Zones ===");
        engine.getActiveSurgeZones().forEach((zone, mult) ->
            System.out.printf("  %s: %.2fx%n", zone.value(), mult));
    }
}
```

## 🎯 Key Takeaways
- Ola asks **ride-hailing domain** problems — surge pricing, driver matching, ETA
- Piecewise linear function for surge multiplier is more realistic than simple ratio
- **EMA smoothing** prevents prices from jumping wildly between ticks
- Configure max surge cap (regulatory compliance), min surge (discount during oversupply)
- Zone-based isolation keeps metrics per-area — core to ride-hailing architecture
- Dashboard-style output shows production awareness

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA | Medium | Greedy, Sliding Window |
| Technical 2 | Medium-Hard | Domain Modeling, Numerical Methods |
| HM | Medium | Behavioral, Product Thinking |
