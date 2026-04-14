# Swiggy — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | SDE-3 |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 DS/Algo + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Machine Coding — Implement a Restaurant Search with Geofencing
**Duration:** 90 minutes

### Problem
Build a restaurant search system that:
- Finds restaurants within a radius of user's location
- Supports filters: cuisine, rating, delivery time
- Sorts by relevance (distance + rating + popularity)
- Efficient spatial queries using grid-based indexing

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.stream.*;

public class RestaurantSearch {

    static class Location {
        final double lat;
        final double lng;

        Location(double lat, double lng) {
            this.lat = lat;
            this.lng = lng;
        }
    }

    static class Restaurant {
        final String id;
        final String name;
        final Location location;
        final Set<String> cuisines;
        final double rating;
        final int avgDeliveryMinutes;
        final int orderCount; // Popularity metric
        final boolean isOpen;

        Restaurant(String id, String name, double lat, double lng,
                   Set<String> cuisines, double rating, int deliveryMin,
                   int orderCount, boolean isOpen) {
            this.id = id;
            this.name = name;
            this.location = new Location(lat, lng);
            this.cuisines = cuisines;
            this.rating = rating;
            this.avgDeliveryMinutes = deliveryMin;
            this.orderCount = orderCount;
            this.isOpen = isOpen;
        }
    }

    static class SearchFilters {
        Double maxDistanceKm;
        Set<String> cuisines;
        Double minRating;
        Integer maxDeliveryMinutes;
        boolean onlyOpen = true;
        String sortBy = "relevance"; // relevance, distance, rating, delivery_time

        SearchFilters maxDistance(double km) { this.maxDistanceKm = km; return this; }
        SearchFilters cuisine(String... c) { this.cuisines = Set.of(c); return this; }
        SearchFilters minRating(double r) { this.minRating = r; return this; }
        SearchFilters maxDelivery(int min) { this.maxDeliveryMinutes = min; return this; }
        SearchFilters sort(String s) { this.sortBy = s; return this; }
    }

    static class SearchResult {
        Restaurant restaurant;
        double distanceKm;
        double relevanceScore;

        SearchResult(Restaurant r, double dist, double score) {
            this.restaurant = r;
            this.distanceKm = dist;
            this.relevanceScore = score;
        }
    }

    // Grid-based spatial index
    // Key: "gridRow:gridCol" -> list of restaurants in that cell
    private final Map<String, List<Restaurant>> spatialGrid = new HashMap<>();
    private final List<Restaurant> allRestaurants = new ArrayList<>();
    private static final double GRID_SIZE_KM = 1.0; // 1km grid cells

    // Approximate conversion factors
    private static final double KM_PER_LAT_DEGREE = 111.0;
    private static final double KM_PER_LNG_DEGREE = 85.0; // At ~40°N approx

    public void addRestaurant(Restaurant restaurant) {
        allRestaurants.add(restaurant);

        String gridKey = getGridKey(restaurant.location);
        spatialGrid.computeIfAbsent(gridKey, k -> new ArrayList<>()).add(restaurant);
    }

    /**
     * Search for restaurants near a location with filters.
     */
    public List<SearchResult> search(Location userLoc, SearchFilters filters) {
        double maxDist = filters.maxDistanceKm != null ? filters.maxDistanceKm : 10.0;

        // Get candidate restaurants from nearby grid cells
        List<Restaurant> candidates = getCandidatesFromGrid(userLoc, maxDist);

        // Filter, compute distance, score, and sort
        return candidates.stream()
            // Distance filter
            .map(r -> {
                double dist = haversineDistance(userLoc, r.location);
                return new SearchResult(r, dist, 0);
            })
            .filter(sr -> sr.distanceKm <= maxDist)

            // Open filter
            .filter(sr -> !filters.onlyOpen || sr.restaurant.isOpen)

            // Cuisine filter
            .filter(sr -> filters.cuisines == null || filters.cuisines.isEmpty()
                || sr.restaurant.cuisines.stream().anyMatch(filters.cuisines::contains))

            // Rating filter
            .filter(sr -> filters.minRating == null
                || sr.restaurant.rating >= filters.minRating)

            // Delivery time filter
            .filter(sr -> filters.maxDeliveryMinutes == null
                || sr.restaurant.avgDeliveryMinutes <= filters.maxDeliveryMinutes)

            // Compute relevance score
            .peek(sr -> sr.relevanceScore = computeRelevance(sr, maxDist))

            // Sort
            .sorted((a, b) -> {
                return switch (filters.sortBy) {
                    case "distance" -> Double.compare(a.distanceKm, b.distanceKm);
                    case "rating" -> Double.compare(b.restaurant.rating, a.restaurant.rating);
                    case "delivery_time" -> Integer.compare(
                        a.restaurant.avgDeliveryMinutes, b.restaurant.avgDeliveryMinutes);
                    default -> Double.compare(b.relevanceScore, a.relevanceScore);
                };
            })
            .collect(Collectors.toList());
    }

    /**
     * Relevance score combines distance, rating, popularity, and delivery speed.
     * Weights tuned for food delivery context.
     */
    private double computeRelevance(SearchResult sr, double maxDist) {
        Restaurant r = sr.restaurant;

        // Normalized components (0-1 scale)
        double distScore = 1.0 - (sr.distanceKm / maxDist);
        double ratingScore = r.rating / 5.0;
        double popularityScore = Math.min(1.0, r.orderCount / 10000.0);
        double speedScore = 1.0 - Math.min(1.0, r.avgDeliveryMinutes / 60.0);

        // Weighted sum
        return distScore * 0.30
             + ratingScore * 0.30
             + popularityScore * 0.20
             + speedScore * 0.20;
    }

    /**
     * Get grid cells within radius and return all restaurants in those cells.
     * This avoids scanning ALL restaurants — only checks nearby cells.
     */
    private List<Restaurant> getCandidatesFromGrid(Location center, double radiusKm) {
        List<Restaurant> candidates = new ArrayList<>();

        int gridRadius = (int) Math.ceil(radiusKm / GRID_SIZE_KM) + 1;
        int centerRow = (int) (center.lat * KM_PER_LAT_DEGREE / GRID_SIZE_KM);
        int centerCol = (int) (center.lng * KM_PER_LNG_DEGREE / GRID_SIZE_KM);

        for (int dr = -gridRadius; dr <= gridRadius; dr++) {
            for (int dc = -gridRadius; dc <= gridRadius; dc++) {
                String key = (centerRow + dr) + ":" + (centerCol + dc);
                List<Restaurant> cell = spatialGrid.get(key);
                if (cell != null) {
                    candidates.addAll(cell);
                }
            }
        }

        return candidates;
    }

    private String getGridKey(Location loc) {
        int row = (int) (loc.lat * KM_PER_LAT_DEGREE / GRID_SIZE_KM);
        int col = (int) (loc.lng * KM_PER_LNG_DEGREE / GRID_SIZE_KM);
        return row + ":" + col;
    }

    /**
     * Haversine formula for distance between two lat/lng points.
     */
    private double haversineDistance(Location a, Location b) {
        double R = 6371; // Earth radius in km
        double dLat = Math.toRadians(b.lat - a.lat);
        double dLng = Math.toRadians(b.lng - a.lng);

        double sinDLat = Math.sin(dLat / 2);
        double sinDLng = Math.sin(dLng / 2);

        double x = sinDLat * sinDLat
                 + Math.cos(Math.toRadians(a.lat)) * Math.cos(Math.toRadians(b.lat))
                 * sinDLng * sinDLng;

        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }

    public static void main(String[] args) {
        RestaurantSearch engine = new RestaurantSearch();

        // Add restaurants around Bangalore (12.97°N, 77.59°E)
        engine.addRestaurant(new Restaurant("r1", "Tandoori Nights",
            12.971, 77.594, Set.of("Indian", "North Indian"), 4.5, 25, 8000, true));
        engine.addRestaurant(new Restaurant("r2", "Wok Express",
            12.975, 77.590, Set.of("Chinese", "Asian"), 4.2, 30, 5000, true));
        engine.addRestaurant(new Restaurant("r3", "Pizza Hub",
            12.968, 77.600, Set.of("Italian", "Pizza"), 4.0, 35, 12000, true));
        engine.addRestaurant(new Restaurant("r4", "Biryani Palace",
            12.980, 77.585, Set.of("Indian", "Biryani"), 4.7, 20, 15000, true));
        engine.addRestaurant(new Restaurant("r5", "Green Bowl",
            12.965, 77.610, Set.of("Salad", "Healthy"), 3.8, 40, 2000, false));
        engine.addRestaurant(new Restaurant("r6", "Dosa Factory",
            12.972, 77.595, Set.of("Indian", "South Indian"), 4.3, 15, 9000, true));

        Location userLoc = new Location(12.970, 77.595);

        // Search: all restaurants within 5km
        System.out.println("=== All within 5km (by relevance) ===");
        List<SearchResult> results = engine.search(userLoc,
            new SearchFilters().maxDistance(5));
        results.forEach(sr -> System.out.printf("  %.1fkm | %.1f★ | %dmin | %.2f score | %s%n",
            sr.distanceKm, sr.restaurant.rating, sr.restaurant.avgDeliveryMinutes,
            sr.relevanceScore, sr.restaurant.name));

        // Search: Indian cuisine, min 4.0 rating
        System.out.println("\n=== Indian, 4.0+ rating ===");
        results = engine.search(userLoc,
            new SearchFilters().maxDistance(5).cuisine("Indian").minRating(4.0));
        results.forEach(sr -> System.out.printf("  %s (%.1f★, %s)%n",
            sr.restaurant.name, sr.restaurant.rating, sr.restaurant.cuisines));

        // Search: fastest delivery
        System.out.println("\n=== Sorted by delivery time ===");
        results = engine.search(userLoc,
            new SearchFilters().maxDistance(5).maxDelivery(30).sort("delivery_time"));
        results.forEach(sr -> System.out.printf("  %dmin | %s%n",
            sr.restaurant.avgDeliveryMinutes, sr.restaurant.name));
    }
}
```

## 🎯 Key Takeaways
- Swiggy interviews focus on **food-tech domain** — restaurant search is their core product
- Grid-based spatial index gives O(n) within a radius instead of scanning all restaurants
- Haversine formula for accurate distance calculation on Earth's surface
- **Relevance scoring** combines distance (30%), rating (30%), popularity (20%), speed (20%)
- Stream API chaining for clean filter + sort pipeline
- Consider closed restaurants in filters (default: only open)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Spatial Index, Haversine, Ranking |
| DS/Algo 1 | Hard | Graph BFS, Shortest Path |
| DS/Algo 2 | Medium | Binary Search, Sorting |
| HM | Medium | Behavioral |
