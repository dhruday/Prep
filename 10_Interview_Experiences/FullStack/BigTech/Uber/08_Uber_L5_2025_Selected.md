# Uber — L5 (Senior SWE) Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | Senior Software Engineer |
| **Level** | L5a |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 2 Coding + System Design + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual Onsite

## Round 1: Coding — Design a Ride Fare Calculator with Surge Pricing
**Duration:** 45 minutes

### 💡 Interview-Ready Answer

```java
import java.math.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;

public class RideFareCalculator {

    enum RideType {
        POOL(1.0, 0.80),
        UBERX(1.5, 1.20),
        COMFORT(2.0, 1.60),
        PREMIUM(3.0, 2.50);

        final double baseRate;
        final double perKmRate;

        RideType(double baseRate, double perKmRate) {
            this.baseRate = baseRate;
            this.perKmRate = perKmRate;
        }
    }

    static class FareBreakdown {
        BigDecimal baseFare;
        BigDecimal distanceFare;
        BigDecimal timeFare;
        BigDecimal surgeFare;
        BigDecimal tolls;
        BigDecimal discount;
        BigDecimal totalFare;
        double surgeMultiplier;

        @Override
        public String toString() {
            return String.format(
                "Base=%.2f, Distance=%.2f, Time=%.2f, Surge=%.2f (x%.1f), Tolls=%.2f, Discount=%.2f, TOTAL=%.2f",
                baseFare, distanceFare, timeFare, surgeFare, surgeMultiplier, tolls, discount, totalFare
            );
        }
    }

    // Surge pricing zones: zoneId -> current multiplier
    private final ConcurrentHashMap<String, Double> surgeMultipliers = new ConcurrentHashMap<>();
    private static final double PER_MINUTE_RATE = 0.20; // INR per minute per type multiplier
    private static final BigDecimal MIN_FARE = new BigDecimal("50.00");

    /**
     * Update surge multiplier for a zone based on supply/demand.
     * In production, this is computed from real-time driver availability.
     */
    public void updateSurge(String zoneId, double multiplier) {
        surgeMultipliers.put(zoneId, Math.max(1.0, Math.min(5.0, multiplier)));
    }

    /**
     * Calculate fare for a ride.
     *
     * @param rideType     Type of ride (Pool, UberX, etc.)
     * @param distanceKm   Total distance in km
     * @param durationMins Estimated duration in minutes
     * @param pickupZone   Pickup zone ID for surge pricing
     * @param promoCode    Optional promo code
     * @param tolls        Toll charges (passthrough)
     */
    public FareBreakdown calculateFare(RideType rideType, double distanceKm,
                                        double durationMins, String pickupZone,
                                        String promoCode, double tolls) {
        FareBreakdown breakdown = new FareBreakdown();

        // 1. Base fare
        breakdown.baseFare = BigDecimal.valueOf(rideType.baseRate)
            .multiply(BigDecimal.valueOf(100)); // base in smallest unit

        // 2. Distance fare
        breakdown.distanceFare = BigDecimal.valueOf(distanceKm)
            .multiply(BigDecimal.valueOf(rideType.perKmRate))
            .multiply(BigDecimal.valueOf(100)); // convert to paise then back

        // 3. Time fare
        breakdown.timeFare = BigDecimal.valueOf(durationMins)
            .multiply(BigDecimal.valueOf(PER_MINUTE_RATE))
            .multiply(BigDecimal.valueOf(rideType.baseRate));

        // 4. Surge pricing
        breakdown.surgeMultiplier = surgeMultipliers.getOrDefault(pickupZone, 1.0);
        BigDecimal subTotal = breakdown.baseFare
            .add(breakdown.distanceFare)
            .add(breakdown.timeFare);

        if (breakdown.surgeMultiplier > 1.0) {
            BigDecimal surged = subTotal.multiply(
                BigDecimal.valueOf(breakdown.surgeMultiplier));
            breakdown.surgeFare = surged.subtract(subTotal);
            subTotal = surged;
        } else {
            breakdown.surgeFare = BigDecimal.ZERO;
        }

        // 5. Tolls
        breakdown.tolls = BigDecimal.valueOf(tolls);
        subTotal = subTotal.add(breakdown.tolls);

        // 6. Promo/discount
        breakdown.discount = calculateDiscount(promoCode, subTotal);
        subTotal = subTotal.subtract(breakdown.discount);

        // 7. Minimum fare
        breakdown.totalFare = subTotal.max(MIN_FARE)
            .setScale(2, RoundingMode.HALF_UP);

        return breakdown;
    }

    /**
     * Fare estimation — returns a range [low, high] for the trip.
     * The range accounts for traffic variability.
     */
    public BigDecimal[] estimateFareRange(RideType rideType, double distanceKm,
                                           double estMinutes, String pickupZone) {
        // Low estimate: no surge, fast route
        FareBreakdown low = calculateFare(rideType,
            distanceKm * 0.9, estMinutes * 0.8, pickupZone, null, 0);

        // High estimate: with surge, slow route
        FareBreakdown high = calculateFare(rideType,
            distanceKm * 1.15, estMinutes * 1.3, pickupZone, null, 0);

        return new BigDecimal[]{ low.totalFare, high.totalFare };
    }

    private BigDecimal calculateDiscount(String promoCode, BigDecimal subtotal) {
        if (promoCode == null || promoCode.isEmpty()) return BigDecimal.ZERO;

        // Simple promo engine
        return switch (promoCode.toUpperCase()) {
            case "FIRST50" -> subtotal.multiply(BigDecimal.valueOf(0.50))
                .min(BigDecimal.valueOf(200));  // 50% off, max 200
            case "FLAT100" -> BigDecimal.valueOf(100).min(subtotal);
            case "RIDE20" -> subtotal.multiply(BigDecimal.valueOf(0.20))
                .min(BigDecimal.valueOf(150));
            default -> BigDecimal.ZERO;
        };
    }

    public static void main(String[] args) {
        RideFareCalculator calculator = new RideFareCalculator();

        // Set surge for downtown zone
        calculator.updateSurge("zone_downtown", 1.8);
        calculator.updateSurge("zone_airport", 2.0);

        // Normal ride — no surge
        FareBreakdown fare1 = calculator.calculateFare(
            RideType.UBERX, 12.5, 25, "zone_suburban", null, 0);
        System.out.println("Normal UberX: " + fare1);

        // Surge ride
        FareBreakdown fare2 = calculator.calculateFare(
            RideType.UBERX, 8.0, 20, "zone_downtown", null, 0);
        System.out.println("Surge UberX:  " + fare2);

        // With promo
        FareBreakdown fare3 = calculator.calculateFare(
            RideType.COMFORT, 15.0, 30, "zone_airport", "FIRST50", 40);
        System.out.println("Promo+Surge:  " + fare3);

        // Fare range estimate
        BigDecimal[] range = calculator.estimateFareRange(
            RideType.UBERX, 10.0, 20, "zone_downtown");
        System.out.printf("Estimate: ₹%.2f – ₹%.2f%n", range[0], range[1]);
    }
}
```

## 🎯 Key Takeaways
- Uber asks **domain-specific** coding: fare calculation, surge pricing, driver matching
- Always use `BigDecimal` for monetary calculations — floating point errors are unacceptable
- Surge pricing is zone-based with capped multiplier (1.0-5.0)
- Fare range estimation is a common follow-up — accounts for traffic variability
- Promo code engine should be extensible (strategy pattern in production)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium | BigDecimal, Strategy Pattern, Domain Modeling |
| Coding 2 | Hard | Graph Algorithms, Shortest Path |
| System Design | Hard | Ride Matching System |
| HM | Medium | Behavioral |
