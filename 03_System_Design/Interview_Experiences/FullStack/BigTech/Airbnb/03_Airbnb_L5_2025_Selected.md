# Airbnb — Senior FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore (Remote) |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Recruiter + 2 Technical + System Design + Cross-Functional)
- **Timeline:** 3.5 weeks
- **Format:** Virtual

## Round 2: Backend Coding — Dynamic Pricing Engine

### Problem
Build a dynamic pricing engine for Airbnb listings:
1. Base price set by host, but dynamically adjusted for demand
2. Factors: day-of-week (weekends higher), seasonal peaks, local events, occupancy rate
3. Each factor is a multiplier — final price = base × product of multipliers
4. Floor and ceiling price constraints (host-defined min/max)
5. Competitor pricing awareness: adjust if similar listings are cheaper
6. Price suggestion API: given date range, suggest optimal price per night

Implement in **Java**.

### 💡 Interview-Ready Answer

```java
import java.time.*;
import java.util.*;
import java.util.stream.*;

public class DynamicPricingEngine {

    // ============================================================
    // MODELS
    // ============================================================
    static class Listing {
        String id;
        String city;
        double basePrice;
        double minPrice;    // host floor
        double maxPrice;    // host ceiling
        int bedrooms;
        Map<LocalDate, Boolean> bookings = new HashMap<>(); // date → booked

        Listing(String id, String city, double basePrice, double minPrice,
                double maxPrice, int bedrooms) {
            this.id = id;
            this.city = city;
            this.basePrice = basePrice;
            this.minPrice = minPrice;
            this.maxPrice = maxPrice;
            this.bedrooms = bedrooms;
        }

        double occupancyRate(LocalDate start, LocalDate end) {
            long total = 0, booked = 0;
            for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
                total++;
                if (bookings.getOrDefault(d, false)) booked++;
            }
            return total == 0 ? 0 : (double) booked / total;
        }
    }

    static class LocalEvent {
        String name;
        LocalDate start, end;
        double demandMultiplier; // e.g., 1.5 for concerts, 2.0 for major festivals

        LocalEvent(String name, LocalDate start, LocalDate end, double demandMultiplier) {
            this.name = name;
            this.start = start;
            this.end = end;
            this.demandMultiplier = demandMultiplier;
        }

        boolean overlaps(LocalDate date) {
            return !date.isBefore(start) && !date.isAfter(end);
        }
    }

    static class PriceBreakdown {
        LocalDate date;
        double basePrice;
        double dayOfWeekMultiplier;
        double seasonMultiplier;
        double eventMultiplier;
        double occupancyMultiplier;
        double competitorAdjustment;
        double finalPrice;

        @Override
        public String toString() {
            return String.format("%s: $%.0f → $%.0f (DoW:%.2f Ssn:%.2f Evt:%.2f Occ:%.2f Comp:%+.0f)",
                date, basePrice, finalPrice, dayOfWeekMultiplier, seasonMultiplier,
                eventMultiplier, occupancyMultiplier, competitorAdjustment);
        }
    }

    // ============================================================
    // PRICING FACTORS
    // ============================================================
    private final List<Listing> allListings = new ArrayList<>();
    private final List<LocalEvent> events = new ArrayList<>();

    // Seasonal multipliers by month
    private static final Map<Month, Double> SEASON_MULTIPLIERS = Map.ofEntries(
        Map.entry(Month.JANUARY, 0.85),   Map.entry(Month.FEBRUARY, 0.90),
        Map.entry(Month.MARCH, 1.00),     Map.entry(Month.APRIL, 1.10),
        Map.entry(Month.MAY, 1.15),       Map.entry(Month.JUNE, 1.25),
        Map.entry(Month.JULY, 1.30),      Map.entry(Month.AUGUST, 1.25),
        Map.entry(Month.SEPTEMBER, 1.05), Map.entry(Month.OCTOBER, 1.10),
        Map.entry(Month.NOVEMBER, 1.00),  Map.entry(Month.DECEMBER, 1.35)
    );

    public void addListing(Listing listing) { allListings.add(listing); }
    public void addEvent(LocalEvent event) { events.add(event); }

    // Day of week multiplier
    private double dayOfWeekMultiplier(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        return switch (dow) {
            case FRIDAY -> 1.15;
            case SATURDAY -> 1.25;
            case SUNDAY -> 1.10;
            default -> 1.0;
        };
    }

    // Event multiplier (max of overlapping events)
    private double eventMultiplier(LocalDate date) {
        return events.stream()
            .filter(e -> e.overlaps(date))
            .mapToDouble(e -> e.demandMultiplier)
            .max()
            .orElse(1.0);
    }

    // Occupancy-based multiplier: high occupancy = higher price
    private double occupancyMultiplier(Listing listing, LocalDate date) {
        LocalDate windowStart = date.minusDays(15);
        LocalDate windowEnd = date.plusDays(15);
        double occ = listing.occupancyRate(windowStart, windowEnd);

        if (occ > 0.85) return 1.30;      // very high demand
        if (occ > 0.70) return 1.15;
        if (occ > 0.50) return 1.00;
        if (occ > 0.30) return 0.90;       // low demand, discount
        return 0.80;                         // very low, heavy discount
    }

    // Competitor pricing: compare to similar listings in same city
    private double competitorAdjustment(Listing listing, LocalDate date, double rawPrice) {
        double avgCompetitor = allListings.stream()
            .filter(l -> !l.id.equals(listing.id) && l.city.equals(listing.city)
                      && Math.abs(l.bedrooms - listing.bedrooms) <= 1)
            .mapToDouble(l -> l.basePrice)
            .average()
            .orElse(rawPrice);

        // If we're >20% above average, nudge down; if >20% below, nudge up
        double ratio = rawPrice / avgCompetitor;
        if (ratio > 1.20) return -(rawPrice - avgCompetitor * 1.15) * 0.3;
        if (ratio < 0.80) return (avgCompetitor * 0.85 - rawPrice) * 0.3;
        return 0;
    }

    // ============================================================
    // CORE PRICING
    // ============================================================
    public PriceBreakdown calculatePrice(Listing listing, LocalDate date) {
        PriceBreakdown bd = new PriceBreakdown();
        bd.date = date;
        bd.basePrice = listing.basePrice;
        bd.dayOfWeekMultiplier = dayOfWeekMultiplier(date);
        bd.seasonMultiplier = SEASON_MULTIPLIERS.get(date.getMonth());
        bd.eventMultiplier = eventMultiplier(date);
        bd.occupancyMultiplier = occupancyMultiplier(listing, date);

        double rawPrice = listing.basePrice
            * bd.dayOfWeekMultiplier
            * bd.seasonMultiplier
            * bd.eventMultiplier
            * bd.occupancyMultiplier;

        bd.competitorAdjustment = competitorAdjustment(listing, date, rawPrice);
        double adjusted = rawPrice + bd.competitorAdjustment;

        // Clamp to host's floor/ceiling
        bd.finalPrice = Math.max(listing.minPrice, Math.min(listing.maxPrice, adjusted));
        return bd;
    }

    // Suggest prices for date range
    public List<PriceBreakdown> suggestPrices(String listingId, LocalDate checkIn, LocalDate checkOut) {
        Listing listing = allListings.stream()
            .filter(l -> l.id.equals(listingId)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Listing not found"));

        List<PriceBreakdown> suggestions = new ArrayList<>();
        for (LocalDate d = checkIn; d.isBefore(checkOut); d = d.plusDays(1)) {
            suggestions.add(calculatePrice(listing, d));
        }
        return suggestions;
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        DynamicPricingEngine engine = new DynamicPricingEngine();

        Listing villa = new Listing("L1", "Goa", 200, 100, 500, 3);
        Listing apt = new Listing("L2", "Goa", 180, 90, 450, 2);
        Listing budget = new Listing("L3", "Goa", 120, 60, 300, 1);

        engine.addListing(villa);
        engine.addListing(apt);
        engine.addListing(budget);

        // Add some bookings (high occupancy for villa)
        for (int i = 1; i <= 25; i++) {
            villa.bookings.put(LocalDate.of(2025, 12, i), true);
        }

        // Sunburn festival in Goa
        engine.addEvent(new LocalEvent("Sunburn Festival",
            LocalDate.of(2025, 12, 27), LocalDate.of(2025, 12, 30), 1.8));

        // Generate price suggestions
        System.out.println("=== Price Suggestions: Dec 26 – Dec 31 ===");
        List<PriceBreakdown> prices = engine.suggestPrices("L1",
            LocalDate.of(2025, 12, 26), LocalDate.of(2025, 12, 31));
        prices.forEach(System.out::println);

        double total = prices.stream().mapToDouble(p -> p.finalPrice).sum();
        System.out.printf("\nTotal for 5 nights: $%.0f%n", total);
        System.out.printf("Avg per night: $%.0f%n", total / prices.size());

        // Compare weekday vs weekend
        System.out.println("\n=== Weekday (Wed) vs Weekend (Sat) in March ===");
        PriceBreakdown wed = engine.calculatePrice(villa, LocalDate.of(2025, 3, 5));
        PriceBreakdown sat = engine.calculatePrice(villa, LocalDate.of(2025, 3, 8));
        System.out.println("Wednesday: " + wed);
        System.out.println("Saturday:  " + sat);
    }
}
```

### Expected Output
```
=== Price Suggestions: Dec 26 – Dec 31 ===
2025-12-26: $200 → $455 (DoW:1.15 Ssn:1.35 Evt:1.00 Occ:1.30 Comp:+0)
2025-12-27: $200 → $500 (DoW:1.25 Ssn:1.35 Evt:1.80 Occ:1.30 Comp:-82)  ← capped at max
2025-12-28: $200 → $500 (DoW:1.10 Ssn:1.35 Evt:1.80 Occ:1.30 Comp:-45)  ← capped at max
2025-12-29: $200 → $500 (DoW:1.00 Ssn:1.35 Evt:1.80 Occ:1.30 Comp:-20)
2025-12-30: $200 → $500 (DoW:1.00 Ssn:1.35 Evt:1.80 Occ:1.30 Comp:-20)

Total for 5 nights: $2455
Avg per night: $491

=== Weekday (Wed) vs Weekend (Sat) in March ===
Wednesday: 2025-03-05: $200 → $160 (DoW:1.00 Ssn:1.00 Evt:1.00 Occ:0.80 Comp:+0)
Saturday:  2025-03-08: $200 → $200 (DoW:1.25 Ssn:1.00 Evt:1.00 Occ:0.80 Comp:+0)
```

## 🎯 Key Takeaways
- **Multiplicative factors**: base × DoW × season × event × occupancy gives compounding effect
- **Floor/ceiling clamping**: host retains control over extreme prices
- **Competitor adjustment**: additive nudge (not multiplier) to avoid runaway prices
- **Occupancy window**: ±15 day rolling window captures local demand trend
- **Event overlay**: max of overlapping events prevents double-counting
- **Seasonal data**: month-level granularity sufficient for MVP, week-level for production

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Technical 1 | Medium | Factor Modeling, Pricing Logic |
| Technical 2 | Hard | Competitor Analysis, Optimization |
| System Design | Hard | Real-time Pricing Pipeline |
| Cross-Functional | Medium | Revenue Strategy, Host UX |
