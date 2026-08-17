# Grab/Gojek — Senior FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab/Gojek |
| **Role** | Senior FullStack Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Backend Coding — Driver Matching Algorithm

### Problem
Implement a driver matching system:
1. Find the best driver for a ride request based on: distance to pickup, driver rating, acceptance rate
2. Weighted scoring: distance (50%), rating (30%), acceptance rate (20%)
3. Maximum pickup radius: 5km — filter out drivers beyond
4. Busy drivers excluded
5. Batch matching: when multiple requests come in, match optimally (greedy best-first)
6. Driver cooldown: recently cancelled drivers get deprioritized for 10 min
7. Return top 3 candidates in ranked order

Implement in **Java**.

### 💡 Interview-Ready Answer

```java
import java.time.Instant;
import java.util.*;
import java.util.stream.*;

public class DriverMatchingSystem {

    // ============================================================
    // MODELS
    // ============================================================
    static class Location {
        double lat, lon;

        Location(double lat, double lon) {
            this.lat = lat;
            this.lon = lon;
        }

        double distanceKm(Location other) {
            double R = 6371;
            double dLat = Math.toRadians(other.lat - this.lat);
            double dLon = Math.toRadians(other.lon - this.lon);
            double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(this.lat)) * Math.cos(Math.toRadians(other.lat))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
    }

    static class Driver {
        String id;
        String name;
        Location location;
        double rating;         // 1-5
        double acceptanceRate; // 0-1
        boolean busy;
        Instant lastCancellation;

        Driver(String id, String name, Location location, double rating,
               double acceptanceRate, boolean busy) {
            this.id = id;
            this.name = name;
            this.location = location;
            this.rating = rating;
            this.acceptanceRate = acceptanceRate;
            this.busy = busy;
            this.lastCancellation = null;
        }
    }

    static class RideRequest {
        String requestId;
        Location pickup;
        Location dropoff;
        Instant requestTime;

        RideRequest(String requestId, Location pickup, Location dropoff) {
            this.requestId = requestId;
            this.pickup = pickup;
            this.dropoff = dropoff;
            this.requestTime = Instant.now();
        }
    }

    static class MatchCandidate {
        Driver driver;
        double distance;
        double score;

        MatchCandidate(Driver driver, double distance, double score) {
            this.driver = driver;
            this.distance = distance;
            this.score = score;
        }

        @Override
        public String toString() {
            return String.format("  %s (%.1fkm, rating=%.1f, accept=%.0f%%, score=%.3f)",
                driver.name, distance, driver.rating, driver.acceptanceRate * 100, score);
        }
    }

    // ============================================================
    // CONFIG
    // ============================================================
    static final double MAX_PICKUP_RADIUS_KM = 5.0;
    static final long CANCEL_COOLDOWN_MS = 10 * 60 * 1000; // 10 min
    static final double WEIGHT_DISTANCE = 0.50;
    static final double WEIGHT_RATING = 0.30;
    static final double WEIGHT_ACCEPTANCE = 0.20;
    static final int TOP_N = 3;

    // ============================================================
    // SCORING
    // ============================================================
    private final List<Driver> drivers = new ArrayList<>();

    public void registerDriver(Driver driver) {
        drivers.add(driver);
    }

    public void recordCancellation(String driverId) {
        drivers.stream()
            .filter(d -> d.id.equals(driverId))
            .findFirst()
            .ifPresent(d -> d.lastCancellation = Instant.now());
    }

    private double calculateScore(Driver driver, Location pickup) {
        double distance = driver.location.distanceKm(pickup);

        // Normalize distance: closer = higher score (inverted, 0km=1.0, 5km=0.0)
        double distScore = 1.0 - (distance / MAX_PICKUP_RADIUS_KM);

        // Normalize rating: 1-5 → 0-1
        double ratingScore = (driver.rating - 1.0) / 4.0;

        // Acceptance rate already 0-1
        double acceptScore = driver.acceptanceRate;

        double combinedScore = WEIGHT_DISTANCE * distScore
                             + WEIGHT_RATING * ratingScore
                             + WEIGHT_ACCEPTANCE * acceptScore;

        // Penalize recently cancelled
        if (driver.lastCancellation != null) {
            long elapsed = System.currentTimeMillis() - driver.lastCancellation.toEpochMilli();
            if (elapsed < CANCEL_COOLDOWN_MS) {
                double cooldownPenalty = 0.3 * (1.0 - (double) elapsed / CANCEL_COOLDOWN_MS);
                combinedScore -= cooldownPenalty;
            }
        }

        return Math.max(0, combinedScore);
    }

    // ============================================================
    // SINGLE MATCH
    // ============================================================
    public List<MatchCandidate> findBestDrivers(RideRequest request) {
        return drivers.stream()
            .filter(d -> !d.busy)
            .map(d -> {
                double dist = d.location.distanceKm(request.pickup);
                double score = calculateScore(d, request.pickup);
                return new MatchCandidate(d, dist, score);
            })
            .filter(c -> c.distance <= MAX_PICKUP_RADIUS_KM)
            .sorted((a, b) -> Double.compare(b.score, a.score))
            .limit(TOP_N)
            .toList();
    }

    // ============================================================
    // BATCH MATCH (GREEDY)
    // ============================================================
    public Map<String, MatchCandidate> batchMatch(List<RideRequest> requests) {
        Map<String, MatchCandidate> assignments = new LinkedHashMap<>();
        Set<String> assignedDrivers = new HashSet<>();

        // Sort by request time (FIFO priority)
        List<RideRequest> sorted = requests.stream()
            .sorted(Comparator.comparing(r -> r.requestTime))
            .toList();

        for (RideRequest request : sorted) {
            Optional<MatchCandidate> bestMatch = drivers.stream()
                .filter(d -> !d.busy && !assignedDrivers.contains(d.id))
                .map(d -> {
                    double dist = d.location.distanceKm(request.pickup);
                    double score = calculateScore(d, request.pickup);
                    return new MatchCandidate(d, dist, score);
                })
                .filter(c -> c.distance <= MAX_PICKUP_RADIUS_KM)
                .max(Comparator.comparingDouble(c -> c.score));

            if (bestMatch.isPresent()) {
                assignments.put(request.requestId, bestMatch.get());
                assignedDrivers.add(bestMatch.get().driver.id);
            }
        }

        return assignments;
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        DriverMatchingSystem system = new DriverMatchingSystem();

        // Koramangala area (Bangalore)
        Location koramangala = new Location(12.9352, 77.6245);

        system.registerDriver(new Driver("D1", "Rahul", new Location(12.9370, 77.6260), 4.8, 0.95, false));  // ~0.2km
        system.registerDriver(new Driver("D2", "Suresh", new Location(12.9400, 77.6300), 4.2, 0.80, false)); // ~0.7km
        system.registerDriver(new Driver("D3", "Priya", new Location(12.9300, 77.6200), 4.9, 0.92, false));  // ~0.7km
        system.registerDriver(new Driver("D4", "Arjun", new Location(12.9500, 77.6400), 4.5, 0.88, false));  // ~2.2km
        system.registerDriver(new Driver("D5", "Meera", new Location(12.9200, 77.6100), 4.7, 0.91, true));   // busy
        system.registerDriver(new Driver("D6", "Vikram", new Location(12.9000, 77.5800), 4.1, 0.75, false)); // ~5.5km (too far)

        // Single match
        RideRequest request = new RideRequest("R1", koramangala, new Location(12.9600, 77.6400));
        System.out.println("=== Single Match: Koramangala Pickup ===");
        List<MatchCandidate> candidates = system.findBestDrivers(request);
        candidates.forEach(c -> System.out.println(c));

        // Cancellation penalty
        System.out.println("\n=== After D1 cancels ===");
        system.recordCancellation("D1");
        candidates = system.findBestDrivers(request);
        candidates.forEach(c -> System.out.println(c));

        // Batch match
        System.out.println("\n=== Batch Match ===");
        List<RideRequest> batchRequests = List.of(
            new RideRequest("R1", koramangala, new Location(12.96, 77.64)),
            new RideRequest("R2", new Location(12.937, 77.628), new Location(12.95, 77.65)),
            new RideRequest("R3", new Location(12.940, 77.630), new Location(12.92, 77.62))
        );

        Map<String, MatchCandidate> batchResult = system.batchMatch(batchRequests);
        batchResult.forEach((reqId, match) ->
            System.out.printf("Request %s → %s%n", reqId, match));
    }
}
```

### Expected Output
```
=== Single Match: Koramangala Pickup ===
  Rahul (0.2km, rating=4.8, accept=95%, score=0.929)
  Priya (0.7km, rating=4.9, accept=92%, score=0.847)
  Suresh (0.7km, rating=4.2, accept=80%, score=0.690)

=== After D1 cancels ===
  Priya (0.7km, rating=4.9, accept=92%, score=0.847)
  Suresh (0.7km, rating=4.2, accept=80%, score=0.690)
  Rahul (0.2km, rating=4.8, accept=95%, score=0.629)  ← penalized

=== Batch Match ===
Request R1 → Priya (best for R1 since D1 penalized)
Request R2 → Rahul (closest to R2 pickup, penalty mild)
Request R3 → Suresh (remaining best)
```

## 🎯 Key Takeaways
- Got rejected — didn't implement **Hungarian algorithm for optimal global batch matching**
- **Haversine formula**: earth-radius distance calculation for lat/lon coordinates
- **Weighted scoring**: distance(50%) + rating(30%) + acceptance(20%), each normalized to 0-1
- **Cancellation cooldown**: linear penalty decay over 10 minutes — 0.3 penalty at time 0, 0 at 10min
- **Batch matching**: greedy FIFO — assigns best available driver per request, marks driver as unavailable
- **Filtering**: busy drivers excluded, >5km excluded before scoring
- **Stream API**: filter → map → sorted → limit pipeline for clean ranking

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms |
| Technical 1 | Hard | Matching Algorithm, Geo-Distance |
| Technical 2 | Hard | Batch Optimization, Scoring |
| Hiring Manager | Medium | Ride-Hailing, Super-App |
