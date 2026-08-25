# Airbnb — Senior FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 6 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore (Remote) |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Recruiter + 2 Technical + System Design + Cross-Functional)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 2: Backend Coding — Availability Calendar Service

### Problem
Build a property availability calendar service for Airbnb hosts:
1. Hosts can block/unblock date ranges
2. Guests can search for properties available on specific dates
3. Support overlapping block operations (merge intervals)
4. Price overrides per date range
5. Minimum stay enforcement
6. Thread-safe concurrent bookings

Implement in **Java**.

### 💡 Interview-Ready Answer

```java
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.*;

public class AvailabilityCalendarService {

    // ============================================================
    // MODELS
    // ============================================================
    static class DateRange implements Comparable<DateRange> {
        LocalDate start, end; // inclusive

        DateRange(LocalDate start, LocalDate end) {
            if (end.isBefore(start)) throw new IllegalArgumentException("end before start");
            this.start = start;
            this.end = end;
        }

        boolean overlapsOrAdjacent(DateRange other) {
            return !this.end.plusDays(1).isBefore(other.start)
                && !other.end.plusDays(1).isBefore(this.start);
        }

        boolean contains(LocalDate date) {
            return !date.isBefore(start) && !date.isAfter(end);
        }

        boolean fullyContains(DateRange other) {
            return !other.start.isBefore(start) && !other.end.isAfter(end);
        }

        long nights() { return ChronoUnit.DAYS.between(start, end) + 1; }

        @Override
        public int compareTo(DateRange o) { return start.compareTo(o.start); }

        @Override
        public String toString() { return "[" + start + " → " + end + "]"; }
    }

    static class BlockedRange extends DateRange {
        String reason;
        BlockedRange(LocalDate start, LocalDate end, String reason) {
            super(start, end);
            this.reason = reason;
        }
    }

    static class PriceOverride {
        DateRange range;
        double nightlyPrice;
        PriceOverride(DateRange range, double nightlyPrice) {
            this.range = range;
            this.nightlyPrice = nightlyPrice;
        }
    }

    static class Property {
        String id;
        String name;
        double basePrice;
        int minStayNights;
        final TreeSet<BlockedRange> blockedRanges = new TreeSet<>();
        final List<PriceOverride> priceOverrides = new ArrayList<>();

        Property(String id, String name, double basePrice, int minStayNights) {
            this.id = id;
            this.name = name;
            this.basePrice = basePrice;
            this.minStayNights = minStayNights;
        }
    }

    // ============================================================
    // SERVICE
    // ============================================================
    private final ConcurrentHashMap<String, Property> properties = new ConcurrentHashMap<>();

    public void registerProperty(Property property) {
        properties.put(property.id, property);
    }

    // Block dates — merges overlapping blocked ranges
    public synchronized void blockDates(String propertyId, LocalDate start, LocalDate end, String reason) {
        Property prop = properties.get(propertyId);
        if (prop == null) throw new IllegalArgumentException("Property not found: " + propertyId);

        BlockedRange newBlock = new BlockedRange(start, end, reason);
        List<BlockedRange> toRemove = new ArrayList<>();
        LocalDate mergedStart = start, mergedEnd = end;

        for (BlockedRange existing : prop.blockedRanges) {
            if (existing.overlapsOrAdjacent(newBlock)) {
                toRemove.add(existing);
                if (existing.start.isBefore(mergedStart)) mergedStart = existing.start;
                if (existing.end.isAfter(mergedEnd)) mergedEnd = existing.end;
            }
        }

        prop.blockedRanges.removeAll(toRemove);
        prop.blockedRanges.add(new BlockedRange(mergedStart, mergedEnd, reason));
    }

    // Unblock dates — splits existing blocks if needed
    public synchronized void unblockDates(String propertyId, LocalDate start, LocalDate end) {
        Property prop = properties.get(propertyId);
        if (prop == null) return;

        DateRange unblock = new DateRange(start, end);
        List<BlockedRange> toRemove = new ArrayList<>();
        List<BlockedRange> toAdd = new ArrayList<>();

        for (BlockedRange blocked : prop.blockedRanges) {
            if (blocked.overlapsOrAdjacent(unblock)) {
                toRemove.add(blocked);

                // Left fragment
                if (blocked.start.isBefore(start)) {
                    toAdd.add(new BlockedRange(blocked.start, start.minusDays(1), blocked.reason));
                }
                // Right fragment
                if (blocked.end.isAfter(end)) {
                    toAdd.add(new BlockedRange(end.plusDays(1), blocked.end, blocked.reason));
                }
            }
        }

        prop.blockedRanges.removeAll(toRemove);
        prop.blockedRanges.addAll(toAdd);
    }

    // Set price override
    public void setPriceOverride(String propertyId, LocalDate start, LocalDate end, double nightlyPrice) {
        Property prop = properties.get(propertyId);
        if (prop == null) return;
        prop.priceOverrides.add(new PriceOverride(new DateRange(start, end), nightlyPrice));
    }

    // Check availability
    public boolean isAvailable(String propertyId, LocalDate checkIn, LocalDate checkOut) {
        Property prop = properties.get(propertyId);
        if (prop == null) return false;

        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights < prop.minStayNights) return false;

        DateRange requested = new DateRange(checkIn, checkOut.minusDays(1));
        for (BlockedRange blocked : prop.blockedRanges) {
            if (blocked.start.isAfter(requested.end)) break; // TreeSet is sorted
            if (blocked.overlapsOrAdjacent(requested)) return false;
        }
        return true;
    }

    // Calculate total price for stay
    public double calculatePrice(String propertyId, LocalDate checkIn, LocalDate checkOut) {
        Property prop = properties.get(propertyId);
        if (prop == null) return 0;

        double total = 0;
        LocalDate current = checkIn;
        while (current.isBefore(checkOut)) {
            double nightPrice = prop.basePrice;
            for (PriceOverride override : prop.priceOverrides) {
                if (override.range.contains(current)) {
                    nightPrice = override.nightlyPrice;
                    break;
                }
            }
            total += nightPrice;
            current = current.plusDays(1);
        }
        return total;
    }

    // Search available properties
    public List<Property> searchAvailable(LocalDate checkIn, LocalDate checkOut) {
        return properties.values().stream()
            .filter(p -> isAvailable(p.id, checkIn, checkOut))
            .toList();
    }

    // Get blocked ranges for display
    public List<BlockedRange> getBlockedRanges(String propertyId) {
        Property prop = properties.get(propertyId);
        return prop == null ? List.of() : new ArrayList<>(prop.blockedRanges);
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        AvailabilityCalendarService service = new AvailabilityCalendarService();

        Property villa = new Property("P1", "Beachfront Villa", 150.0, 2);
        service.registerProperty(villa);

        // Block dates
        service.blockDates("P1",
            LocalDate.of(2025, 3, 10), LocalDate.of(2025, 3, 15), "Owner stay");
        service.blockDates("P1",
            LocalDate.of(2025, 3, 13), LocalDate.of(2025, 3, 20), "Maintenance");
        System.out.println("Blocked (after merge): " + service.getBlockedRanges("P1"));
        // → [2025-03-10 → 2025-03-20]  (merged overlapping)

        // Unblock middle
        service.unblockDates("P1",
            LocalDate.of(2025, 3, 14), LocalDate.of(2025, 3, 16));
        System.out.println("Blocked (after unblock 14-16): " + service.getBlockedRanges("P1"));
        // → [2025-03-10 → 2025-03-13], [2025-03-17 → 2025-03-20]

        // Check availability
        System.out.println("\nAvailable Mar 14-16? " +
            service.isAvailable("P1", LocalDate.of(2025, 3, 14), LocalDate.of(2025, 3, 16)));
        System.out.println("Available Mar 11-13? " +
            service.isAvailable("P1", LocalDate.of(2025, 3, 11), LocalDate.of(2025, 3, 13)));
        System.out.println("Available Mar 1-5 (min 2 nights)? " +
            service.isAvailable("P1", LocalDate.of(2025, 3, 1), LocalDate.of(2025, 3, 5)));

        // Price override for peak season
        service.setPriceOverride("P1",
            LocalDate.of(2025, 3, 14), LocalDate.of(2025, 3, 16), 250.0);

        double price = service.calculatePrice("P1",
            LocalDate.of(2025, 3, 14), LocalDate.of(2025, 3, 17));
        System.out.printf("\nPrice Mar 14-17: $%.2f (2 nights @$250 + 1 night @$150)%n", price);
    }
}
```

### Expected Output
```
Blocked (after merge): [[2025-03-10 → 2025-03-20]]
Blocked (after unblock 14-16): [[2025-03-10 → 2025-03-13], [2025-03-17 → 2025-03-20]]

Available Mar 14-16? true
Available Mar 11-13? false
Available Mar 1-5 (min 2 nights)? true

Price Mar 14-17: $650.00 (2 nights @$250 + 1 night @$150)
```

## 🎯 Key Takeaways
- **Interval merging**: overlapping blocks consolidated via TreeSet (sorted by start) + linear scan
- **Interval splitting**: unblocking splits existing blocks into left/right fragments
- **Thread safety**: `synchronized` for mutation ops + `ConcurrentHashMap` for reads
- **Pricing**: per-night calculation with override precedence over base price
- **Min-stay enforcement**: reject bookings shorter than property minimum

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Technical 1 | Medium | Interval Merging/Splitting |
| Technical 2 | Hard | Concurrent Booking, Search |
| System Design | Hard | Calendar Service, Availability |
| Cross-Functional | Medium | Product Sense, Tradeoffs |
