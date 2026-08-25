# Airbnb — Staff FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Staff FullStack Engineer |
| **Level** | L5 |
| **YOE** | 9 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote (US) |
| **Source** | [Blind](https://www.teamblind.com/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Technical + System Design + Cross-Functional)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 2: FullStack Coding — Booking Availability Engine

### Problem
Design and implement a booking availability engine:
1. Property owners define availability windows (date ranges)
2. Guests search for available properties in a date range
3. Book a property — marks dates as unavailable
4. Handle overlapping availability windows (merge)
5. Support minimum/maximum stay durations
6. Cancellation restores availability
7. Efficient range queries on large datasets

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

// ============================================================
// DOMAIN MODELS
// ============================================================

class Property {
    private final String id;
    private final String name;
    private final double pricePerNight;
    private final int minStay;
    private final int maxStay;

    Property(String id, String name, double pricePerNight, int minStay, int maxStay) {
        this.id = id;
        this.name = name;
        this.pricePerNight = pricePerNight;
        this.minStay = minStay;
        this.maxStay = maxStay;
    }

    String getId() { return id; }
    String getName() { return name; }
    double getPricePerNight() { return pricePerNight; }
    int getMinStay() { return minStay; }
    int getMaxStay() { return maxStay; }
}

class DateRange implements Comparable<DateRange> {
    final LocalDate start;
    final LocalDate end; // exclusive

    DateRange(LocalDate start, LocalDate end) {
        if (!end.isAfter(start)) throw new IllegalArgumentException("End must be after start");
        this.start = start;
        this.end = end;
    }

    boolean overlaps(DateRange other) {
        return start.isBefore(other.end) && other.start.isBefore(end);
    }

    boolean contains(DateRange other) {
        return !start.isAfter(other.start) && !end.isBefore(other.end);
    }

    long nights() { return ChronoUnit.DAYS.between(start, end); }

    @Override
    public int compareTo(DateRange o) {
        int cmp = start.compareTo(o.start);
        return cmp != 0 ? cmp : end.compareTo(o.end);
    }

    @Override
    public String toString() { return "[" + start + ", " + end + ")"; }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof DateRange)) return false;
        DateRange d = (DateRange) o;
        return start.equals(d.start) && end.equals(d.end);
    }

    @Override
    public int hashCode() { return Objects.hash(start, end); }
}

class Booking {
    private final String id;
    private final String propertyId;
    private final String guestId;
    private final DateRange dates;
    private final double totalPrice;
    private boolean cancelled;

    Booking(String id, String propertyId, String guestId, DateRange dates, double totalPrice) {
        this.id = id;
        this.propertyId = propertyId;
        this.guestId = guestId;
        this.dates = dates;
        this.totalPrice = totalPrice;
        this.cancelled = false;
    }

    String getId() { return id; }
    String getPropertyId() { return propertyId; }
    DateRange getDates() { return dates; }
    boolean isCancelled() { return cancelled; }
    void cancel() { this.cancelled = true; }

    @Override
    public String toString() {
        return String.format("Booking[%s] %s %s $%.2f %s", id, propertyId, dates, totalPrice,
            cancelled ? "(CANCELLED)" : "");
    }
}

// ============================================================
// AVAILABILITY ENGINE
// ============================================================

class AvailabilityEngine {
    // TreeSet of available date ranges per property — sorted, merged, no overlaps
    private final Map<String, TreeSet<DateRange>> availability = new HashMap<>();
    private final Map<String, Property> properties = new LinkedHashMap<>();
    private final Map<String, Booking> bookings = new LinkedHashMap<>();
    private int bookingCounter = 0;

    void addProperty(Property prop) {
        properties.put(prop.getId(), prop);
        availability.put(prop.getId(), new TreeSet<>());
    }

    // Add availability window — merge overlapping ranges
    void setAvailable(String propertyId, LocalDate start, LocalDate end) {
        TreeSet<DateRange> ranges = getAvailability(propertyId);
        DateRange newRange = new DateRange(start, end);

        // Find all overlapping or adjacent ranges and merge
        LocalDate mergedStart = start;
        LocalDate mergedEnd = end;
        List<DateRange> toRemove = new ArrayList<>();

        for (DateRange existing : ranges) {
            // Check overlap or adjacency
            if (existing.start.isAfter(mergedEnd) || existing.end.isBefore(mergedStart)) continue;
            // They overlap or are adjacent
            if (existing.start.isBefore(mergedStart)) mergedStart = existing.start;
            if (existing.end.isAfter(mergedEnd)) mergedEnd = existing.end;
            toRemove.add(existing);
        }

        ranges.removeAll(toRemove);
        ranges.add(new DateRange(mergedStart, mergedEnd));
    }

    // Search for available properties in a date range
    List<SearchResult> search(LocalDate checkIn, LocalDate checkOut) {
        DateRange query = new DateRange(checkIn, checkOut);
        long nights = query.nights();
        List<SearchResult> results = new ArrayList<>();

        for (Map.Entry<String, Property> entry : properties.entrySet()) {
            Property prop = entry.getValue();

            // Check stay duration constraints
            if (nights < prop.getMinStay() || nights > prop.getMaxStay()) continue;

            // Check if any availability range fully contains the query
            TreeSet<DateRange> ranges = availability.get(prop.getId());
            boolean available = ranges.stream().anyMatch(r -> r.contains(query));

            if (available) {
                double total = nights * prop.getPricePerNight();
                results.add(new SearchResult(prop, total, nights));
            }
        }

        results.sort(Comparator.comparingDouble(r -> r.totalPrice));
        return results;
    }

    // Book a property
    Booking book(String propertyId, String guestId, LocalDate checkIn, LocalDate checkOut) {
        Property prop = properties.get(propertyId);
        if (prop == null) throw new IllegalArgumentException("Property not found");

        DateRange bookingRange = new DateRange(checkIn, checkOut);
        long nights = bookingRange.nights();

        if (nights < prop.getMinStay())
            throw new IllegalArgumentException("Minimum stay is " + prop.getMinStay() + " nights");
        if (nights > prop.getMaxStay())
            throw new IllegalArgumentException("Maximum stay is " + prop.getMaxStay() + " nights");

        TreeSet<DateRange> ranges = getAvailability(propertyId);

        // Find the containing range
        DateRange container = ranges.stream()
            .filter(r -> r.contains(bookingRange))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Dates not available"));

        // Remove containing range, add back the before/after fragments
        ranges.remove(container);

        if (container.start.isBefore(checkIn)) {
            ranges.add(new DateRange(container.start, checkIn));
        }
        if (checkOut.isBefore(container.end)) {
            ranges.add(new DateRange(checkOut, container.end));
        }

        String bookingId = "BK-" + (++bookingCounter);
        double total = nights * prop.getPricePerNight();
        Booking booking = new Booking(bookingId, propertyId, guestId, bookingRange, total);
        bookings.put(bookingId, booking);
        return booking;
    }

    // Cancel booking — restore availability
    void cancel(String bookingId) {
        Booking booking = bookings.get(bookingId);
        if (booking == null) throw new IllegalArgumentException("Booking not found");
        if (booking.isCancelled()) throw new IllegalStateException("Already cancelled");

        booking.cancel();

        // Restore availability
        DateRange dates = booking.getDates();
        setAvailable(booking.getPropertyId(), dates.start, dates.end);
    }

    // View availability for a property
    List<DateRange> getAvailableRanges(String propertyId) {
        return new ArrayList<>(getAvailability(propertyId));
    }

    private TreeSet<DateRange> getAvailability(String propertyId) {
        TreeSet<DateRange> ranges = availability.get(propertyId);
        if (ranges == null) throw new IllegalArgumentException("Property not found: " + propertyId);
        return ranges;
    }
}

class SearchResult {
    final Property property;
    final double totalPrice;
    final long nights;

    SearchResult(Property property, double totalPrice, long nights) {
        this.property = property;
        this.totalPrice = totalPrice;
        this.nights = nights;
    }

    @Override
    public String toString() {
        return String.format("  %s — %s | %d nights | $%.2f total ($%.2f/night)",
            property.getId(), property.getName(), nights, totalPrice, property.getPricePerNight());
    }
}

// ============================================================
// DEMO
// ============================================================

public class Main {
    public static void main(String[] args) {
        AvailabilityEngine engine = new AvailabilityEngine();

        System.out.println("=== Airbnb Availability Engine ===\n");

        // Register properties
        engine.addProperty(new Property("P1", "Beachfront Villa", 250.0, 2, 14));
        engine.addProperty(new Property("P2", "City Apartment", 120.0, 1, 30));
        engine.addProperty(new Property("P3", "Mountain Cabin", 180.0, 3, 7));

        // Set availability
        engine.setAvailable("P1", LocalDate.of(2025, 6, 1), LocalDate.of(2025, 6, 30));
        engine.setAvailable("P1", LocalDate.of(2025, 6, 25), LocalDate.of(2025, 7, 15)); // overlaps, should merge
        engine.setAvailable("P2", LocalDate.of(2025, 6, 1), LocalDate.of(2025, 8, 31));
        engine.setAvailable("P3", LocalDate.of(2025, 6, 15), LocalDate.of(2025, 7, 10));

        System.out.println("P1 availability (after merge): " + engine.getAvailableRanges("P1"));
        System.out.println("P2 availability: " + engine.getAvailableRanges("P2"));
        System.out.println("P3 availability: " + engine.getAvailableRanges("P3"));

        // Search
        System.out.println("\n--- Search: Jun 10-15 (5 nights) ---");
        List<SearchResult> results = engine.search(LocalDate.of(2025, 6, 10), LocalDate.of(2025, 6, 15));
        results.forEach(System.out::println);

        // Book
        System.out.println("\n--- Booking P1 Jun 10-15 ---");
        Booking b1 = engine.book("P1", "guest_001", LocalDate.of(2025, 6, 10), LocalDate.of(2025, 6, 15));
        System.out.println(b1);
        System.out.println("P1 availability after booking: " + engine.getAvailableRanges("P1"));

        // Search again — P1 should not appear for same dates
        System.out.println("\n--- Search again: Jun 10-15 ---");
        results = engine.search(LocalDate.of(2025, 6, 10), LocalDate.of(2025, 6, 15));
        results.forEach(System.out::println);

        // Cancel and verify restored
        System.out.println("\n--- Cancel booking ---");
        engine.cancel(b1.getId());
        System.out.println("P1 availability after cancel: " + engine.getAvailableRanges("P1"));

        // Min stay violation
        System.out.println("\n--- Min stay violation (P3 min=3, try 2 nights) ---");
        try {
            engine.book("P3", "guest_002", LocalDate.of(2025, 6, 20), LocalDate.of(2025, 6, 22));
        } catch (IllegalArgumentException e) {
            System.out.println("Error: " + e.getMessage());
        }

        // Double booking prevention
        System.out.println("\n--- Double booking prevention ---");
        Booking b2 = engine.book("P2", "guest_003", LocalDate.of(2025, 6, 10), LocalDate.of(2025, 6, 15));
        System.out.println("Booked: " + b2);
        try {
            engine.book("P2", "guest_004", LocalDate.of(2025, 6, 12), LocalDate.of(2025, 6, 17));
        } catch (IllegalStateException e) {
            System.out.println("Error: " + e.getMessage());
        }
    }
}
```

**Expected Output:**
```
=== Airbnb Availability Engine ===

P1 availability (after merge): [[2025-06-01, 2025-07-15)]
P2 availability: [[2025-06-01, 2025-08-31)]
P3 availability: [[2025-06-15, 2025-07-10)]

--- Search: Jun 10-15 (5 nights) ---
  P2 — City Apartment | 5 nights | $600.00 total ($120.00/night)
  P1 — Beachfront Villa | 5 nights | $1250.00 total ($250.00/night)

--- Booking P1 Jun 10-15 ---
Booking[BK-1] P1 [2025-06-10, 2025-06-15) $1250.00
P1 availability after booking: [[2025-06-01, 2025-06-10), [2025-06-15, 2025-07-15)]

--- Search again: Jun 10-15 ---
  P2 — City Apartment | 5 nights | $600.00 total ($120.00/night)

--- Cancel booking ---
P1 availability after cancel: [[2025-06-01, 2025-07-15)]

--- Min stay violation (P3 min=3, try 2 nights) ---
Error: Minimum stay is 3 nights

--- Double booking prevention ---
Booked: Booking[BK-2] P2 [2025-06-10, 2025-06-15) $600.00
Error: Dates not available
```

## 🎯 Key Takeaways
- Airbnb's core domain: **availability intervals + booking = interval splitting**
- Availability stored as TreeSet<DateRange> — sorted, merged, no overlaps
- **Booking = carve out range**: remove containing interval, insert up-to-2 fragments (before + after)
- **Cancellation = merge back**: setAvailable re-merges restored range with adjacents
- Overlap merge: iterate all ranges, track mergedStart/mergedEnd, remove old, insert merged
- Min/max stay enforced at both search and book time — defense in depth
- Search is O(P × R) where P=properties, R=avg ranges per property — fine for in-memory
- Real Airbnb: bitmap per property (365 bits/year) + Redis for hot dates + B-tree index for range queries

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Arrays, Design Patterns |
| Technical 1 | Hard | Interval Merging, Range Queries |
| Technical 2 | Hard | Booking State Machine, Edge Cases |
| System Design | Hard | Distributed Availability, Consistency |
| Cross-Functional | Medium | Product Thinking, Collaboration |
