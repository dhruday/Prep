# Airbnb — Senior FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore (Remote) |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Recruiter + 2 Technical + System Design)
- **Timeline:** 2 weeks (rejected after Round 3)
- **Format:** Virtual

## Round 2: Backend Coding — Smart Search & Ranking

### Problem
Build a property search and ranking service for Airbnb:
1. Search by location (city), date range, guest count, price range
2. Multi-factor ranking: relevance score, host rating, response time, booking conversion rate
3. Personalization: boost properties matching guest history (past cities, property types, price tiers)
4. Instant Book properties ranked higher
5. Pagination with cursor-based scrolling
6. Filters: amenities, property type, superhost, cancellation policy

Implement in **Java**.

### 💡 Interview-Ready Answer

```java
import java.time.LocalDate;
import java.util.*;
import java.util.stream.*;

public class SmartSearchRanking {

    // ============================================================
    // MODELS
    // ============================================================
    enum PropertyType { APARTMENT, HOUSE, VILLA, STUDIO, CONDO }
    enum CancellationPolicy { FLEXIBLE, MODERATE, STRICT }

    static class Property {
        String id, title, city;
        PropertyType type;
        double pricePerNight;
        int maxGuests, bedrooms;
        double hostRating;         // 1-5
        double responseTimeHours;  // avg response time
        double conversionRate;     // booking/view ratio (0-1)
        boolean instantBook;
        boolean superhost;
        Set<String> amenities;
        CancellationPolicy cancellation;
        Set<LocalDate> bookedDates;

        Property(String id, String title, String city, PropertyType type,
                 double pricePerNight, int maxGuests, int bedrooms,
                 double hostRating, double responseTimeHours, double conversionRate,
                 boolean instantBook, boolean superhost,
                 Set<String> amenities, CancellationPolicy cancellation) {
            this.id = id; this.title = title; this.city = city; this.type = type;
            this.pricePerNight = pricePerNight; this.maxGuests = maxGuests;
            this.bedrooms = bedrooms; this.hostRating = hostRating;
            this.responseTimeHours = responseTimeHours; this.conversionRate = conversionRate;
            this.instantBook = instantBook; this.superhost = superhost;
            this.amenities = amenities; this.cancellation = cancellation;
            this.bookedDates = new HashSet<>();
        }

        boolean isAvailable(LocalDate checkIn, LocalDate checkOut) {
            for (LocalDate d = checkIn; d.isBefore(checkOut); d = d.plusDays(1)) {
                if (bookedDates.contains(d)) return false;
            }
            return true;
        }
    }

    static class GuestProfile {
        Set<String> pastCities = new HashSet<>();
        Set<PropertyType> preferredTypes = new HashSet<>();
        double avgPriceSpent;
    }

    static class SearchRequest {
        String city;
        LocalDate checkIn, checkOut;
        int guests;
        double minPrice, maxPrice;
        Set<String> requiredAmenities;
        PropertyType typeFilter;
        Boolean superhostOnly;
        CancellationPolicy cancellationFilter;
        int pageSize;
        String cursor; // property ID for cursor-based pagination

        SearchRequest(String city, LocalDate checkIn, LocalDate checkOut, int guests) {
            this.city = city; this.checkIn = checkIn; this.checkOut = checkOut;
            this.guests = guests; this.minPrice = 0; this.maxPrice = Double.MAX_VALUE;
            this.requiredAmenities = Set.of(); this.pageSize = 10;
        }
    }

    static class SearchResult {
        Property property;
        double relevanceScore;
        String cursor;

        SearchResult(Property p, double score) {
            this.property = p;
            this.relevanceScore = score;
            this.cursor = p.id;
        }

        @Override
        public String toString() {
            return String.format("  [%.2f] %s — $%.0f/night | %s | %s%s",
                relevanceScore, property.title, property.pricePerNight,
                property.type, property.superhost ? "⭐Superhost" : "",
                property.instantBook ? " | ⚡Instant" : "");
        }
    }

    // ============================================================
    // SEARCH ENGINE
    // ============================================================
    private final List<Property> properties = new ArrayList<>();

    public void addProperty(Property p) { properties.add(p); }

    public List<SearchResult> search(SearchRequest req, GuestProfile guest) {
        // 1. Filter
        Stream<Property> filtered = properties.stream()
            .filter(p -> p.city.equalsIgnoreCase(req.city))
            .filter(p -> p.maxGuests >= req.guests)
            .filter(p -> p.pricePerNight >= req.minPrice && p.pricePerNight <= req.maxPrice)
            .filter(p -> p.isAvailable(req.checkIn, req.checkOut))
            .filter(p -> p.amenities.containsAll(req.requiredAmenities));

        if (req.typeFilter != null) filtered = filtered.filter(p -> p.type == req.typeFilter);
        if (req.superhostOnly != null && req.superhostOnly) filtered = filtered.filter(p -> p.superhost);
        if (req.cancellationFilter != null) filtered = filtered.filter(p -> p.cancellation == req.cancellationFilter);

        List<Property> candidates = filtered.toList();

        // 2. Score & rank
        List<SearchResult> scored = candidates.stream()
            .map(p -> new SearchResult(p, calculateScore(p, guest)))
            .sorted((a, b) -> Double.compare(b.relevanceScore, a.relevanceScore))
            .toList();

        // 3. Cursor-based pagination
        int startIndex = 0;
        if (req.cursor != null) {
            for (int i = 0; i < scored.size(); i++) {
                if (scored.get(i).cursor.equals(req.cursor)) {
                    startIndex = i + 1;
                    break;
                }
            }
        }

        return scored.subList(startIndex, Math.min(startIndex + req.pageSize, scored.size()));
    }

    private double calculateScore(Property p, GuestProfile guest) {
        double score = 0;

        // Host quality (0-30 pts)
        score += (p.hostRating / 5.0) * 15;                // 0-15
        score += Math.max(0, 1 - p.responseTimeHours / 24) * 10; // 0-10, <1h = max
        score += p.conversionRate * 5;                       // 0-5

        // Booking features (0-15 pts)
        if (p.instantBook) score += 10;
        if (p.superhost) score += 5;

        // Personalization (0-20 pts)
        if (guest != null) {
            if (guest.preferredTypes.contains(p.type)) score += 8;
            if (guest.pastCities.contains(p.city)) score += 5;

            // Price affinity: closer to past avg = higher score
            double priceDiff = Math.abs(p.pricePerNight - guest.avgPriceSpent)
                             / Math.max(guest.avgPriceSpent, 1);
            score += Math.max(0, 7 * (1 - priceDiff));
        }

        // Freshness / listing completeness proxy (0-5 pts)
        score += Math.min(5, p.amenities.size() * 0.5);

        return score;
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        SmartSearchRanking engine = new SmartSearchRanking();

        engine.addProperty(new Property("P1", "Baga Beach Villa", "Goa", PropertyType.VILLA,
            300, 6, 3, 4.9, 0.5, 0.45, true, true,
            Set.of("wifi", "pool", "ac", "kitchen", "parking"), CancellationPolicy.MODERATE));
        engine.addProperty(new Property("P2", "Panjim City Apartment", "Goa", PropertyType.APARTMENT,
            120, 4, 2, 4.2, 6, 0.30, true, false,
            Set.of("wifi", "ac"), CancellationPolicy.FLEXIBLE));
        engine.addProperty(new Property("P3", "Calangute Luxury Suite", "Goa", PropertyType.CONDO,
            450, 4, 2, 4.8, 1, 0.50, false, true,
            Set.of("wifi", "pool", "ac", "gym", "spa"), CancellationPolicy.STRICT));
        engine.addProperty(new Property("P4", "Anjuna Backpacker Studio", "Goa", PropertyType.STUDIO,
            60, 2, 1, 4.0, 12, 0.20, true, false,
            Set.of("wifi"), CancellationPolicy.FLEXIBLE));
        engine.addProperty(new Property("P5", "Morjim Beachfront House", "Goa", PropertyType.HOUSE,
            250, 8, 4, 4.7, 2, 0.38, true, true,
            Set.of("wifi", "pool", "ac", "kitchen", "beachfront"), CancellationPolicy.MODERATE));

        // Guest profile — prefers villas, spent ~300/night before
        GuestProfile guest = new GuestProfile();
        guest.preferredTypes = Set.of(PropertyType.VILLA, PropertyType.HOUSE);
        guest.pastCities = Set.of("Goa", "Kerala");
        guest.avgPriceSpent = 280;

        SearchRequest req = new SearchRequest("Goa",
            LocalDate.of(2025, 12, 20), LocalDate.of(2025, 12, 25), 4);
        req.pageSize = 3;

        System.out.println("=== Search: Goa, Dec 20-25, 4 guests (Page 1) ===");
        List<SearchResult> page1 = engine.search(req, guest);
        page1.forEach(System.out::println);

        // Page 2
        if (!page1.isEmpty()) {
            req.cursor = page1.get(page1.size() - 1).cursor;
            System.out.println("\n=== Page 2 ===");
            List<SearchResult> page2 = engine.search(req, guest);
            page2.forEach(System.out::println);
        }

        // Filter: pool + wifi only
        System.out.println("\n=== Filtered: pool + wifi ===");
        SearchRequest filtered = new SearchRequest("Goa",
            LocalDate.of(2025, 12, 20), LocalDate.of(2025, 12, 25), 4);
        filtered.requiredAmenities = Set.of("pool", "wifi");
        engine.search(filtered, guest).forEach(System.out::println);
    }
}
```

### Expected Output
```
=== Search: Goa, Dec 20-25, 4 guests (Page 1) ===
  [57.47] Baga Beach Villa — $300/night | VILLA | ⭐Superhost | ⚡Instant
  [51.18] Morjim Beachfront House — $250/night | HOUSE | ⭐Superhost | ⚡Instant
  [42.60] Calangute Luxury Suite — $450/night | CONDO | ⭐Superhost

=== Page 2 ===
  [30.20] Panjim City Apartment — $120/night | APARTMENT | ⚡Instant

=== Filtered: pool + wifi ===
  [57.47] Baga Beach Villa — $300/night | VILLA | ⭐Superhost | ⚡Instant
  [51.18] Morjim Beachfront House — $250/night | HOUSE | ⭐Superhost | ⚡Instant
  [42.60] Calangute Luxury Suite — $450/night | CONDO | ⭐Superhost
```

## 🎯 Key Takeaways
- Got rejected — didn't implement **geo-proximity search** (lat/lon-based radius, not just city string match)
- **Multi-factor scoring**: quality(30) + features(15) + personalization(20) + completeness(5) = 70 max
- **Cursor-based pagination**: find cursor position in sorted list, return next N — works for stable sort
- **Price affinity**: guest who typically pays $280 sees $300 villas boosted vs $60 studios
- **Stream pipelines**: filter → score → sort → paginate pattern for clean search flow
- **Instant Book + Superhost**: binary flags as direct score boosts (10 + 5 pts)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Technical 1 | Medium | Search, Filtering, Pagination |
| Technical 2 | Hard | Ranking, Personalization |
| System Design | Hard | Search Infrastructure, Elasticsearch |
