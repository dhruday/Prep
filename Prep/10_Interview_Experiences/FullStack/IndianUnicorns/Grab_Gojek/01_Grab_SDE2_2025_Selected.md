# Grab — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 / L4 |
| **YOE** | 4 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India (Remote) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + 1 Behavioral)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Real-Time Driver Matching — Closest K Drivers to a Rider**
   - Given a stream of driver locations (latitude, longitude) and a rider location, find the K closest available drivers.
   - Drivers can go online/offline. Handle dynamic updates.

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class DriverMatchingSystem {

    static class Location {
        double lat, lng;
        Location(double lat, double lng) {
            this.lat = lat;
            this.lng = lng;
        }
    }

    static class Driver {
        String id;
        Location location;
        boolean available;
        double rating;

        Driver(String id, double lat, double lng, double rating) {
            this.id = id;
            this.location = new Location(lat, lng);
            this.available = true;
            this.rating = rating;
        }
    }

    /**
     * Haversine distance formula — distance between two lat/lng points in km
     */
    static double haversineDistance(Location a, Location b) {
        double R = 6371.0; // Earth radius in km
        double dLat = Math.toRadians(b.lat - a.lat);
        double dLng = Math.toRadians(b.lng - a.lng);
        double x = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(a.lat)) * Math.cos(Math.toRadians(b.lat))
            * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
        return R * c;
    }

    // Grid-based spatial index for efficient proximity search
    static class SpatialGrid {
        private final double cellSizeKm;
        private final Map<String, Set<String>> grid; // "gridX:gridY" -> driverIds
        private final Map<String, Driver> drivers;
        private final Map<String, String> driverCells; // driverId -> cellKey

        // Approximate: 1 degree latitude ≈ 111 km
        private static final double KM_PER_DEGREE = 111.0;

        SpatialGrid(double cellSizeKm) {
            this.cellSizeKm = cellSizeKm;
            this.grid = new HashMap<>();
            this.drivers = new HashMap<>();
            this.driverCells = new HashMap<>();
        }

        private String getCellKey(double lat, double lng) {
            int gridX = (int) Math.floor(lat * KM_PER_DEGREE / cellSizeKm);
            int gridY = (int) Math.floor(lng * KM_PER_DEGREE / cellSizeKm);
            return gridX + ":" + gridY;
        }

        void addOrUpdateDriver(Driver driver) {
            // Remove from old cell
            String oldCell = driverCells.get(driver.id);
            if (oldCell != null) {
                Set<String> set = grid.get(oldCell);
                if (set != null) {
                    set.remove(driver.id);
                    if (set.isEmpty()) grid.remove(oldCell);
                }
            }

            drivers.put(driver.id, driver);
            String cell = getCellKey(driver.location.lat, driver.location.lng);
            driverCells.put(driver.id, cell);
            grid.computeIfAbsent(cell, k -> new HashSet<>()).add(driver.id);
        }

        void removeDriver(String driverId) {
            String cell = driverCells.remove(driverId);
            if (cell != null) {
                Set<String> set = grid.get(cell);
                if (set != null) {
                    set.remove(driverId);
                    if (set.isEmpty()) grid.remove(cell);
                }
            }
            drivers.remove(driverId);
        }

        /**
         * Find K closest available drivers to the rider location.
         * Expands search radius in rings until K drivers found.
         */
        List<Driver> findClosestK(Location rider, int k, double maxRadiusKm) {
            String centerCell = getCellKey(rider.lat, rider.lng);
            String[] parts = centerCell.split(":");
            int cx = Integer.parseInt(parts[0]);
            int cy = Integer.parseInt(parts[1]);

            // Max rings to check
            int maxRings = (int) Math.ceil(maxRadiusKm / cellSizeKm);

            // Max-heap: keep K closest (evict farthest)
            PriorityQueue<double[]> maxHeap = new PriorityQueue<>(
                (a, b) -> Double.compare(b[0], a[0])
            );
            List<Driver> candidates = new ArrayList<>();

            for (int ring = 0; ring <= maxRings; ring++) {
                // Search all cells in current ring
                for (int dx = -ring; dx <= ring; dx++) {
                    for (int dy = -ring; dy <= ring; dy++) {
                        if (Math.abs(dx) != ring && Math.abs(dy) != ring) continue; // only border cells

                        String cellKey = (cx + dx) + ":" + (cy + dy);
                        Set<String> driverIds = grid.get(cellKey);
                        if (driverIds == null) continue;

                        for (String dId : driverIds) {
                            Driver d = drivers.get(dId);
                            if (d == null || !d.available) continue;

                            double dist = haversineDistance(rider, d.location);
                            if (dist > maxRadiusKm) continue;

                            if (maxHeap.size() < k) {
                                maxHeap.offer(new double[]{dist, candidates.size()});
                                candidates.add(d);
                            } else if (dist < maxHeap.peek()[0]) {
                                maxHeap.poll();
                                maxHeap.offer(new double[]{dist, candidates.size()});
                                candidates.add(d);
                            }
                        }
                    }
                }

                // Early termination: if we have K drivers and the next ring is farther
                // than the farthest in our heap, no need to continue
                if (maxHeap.size() >= k) {
                    double farthest = maxHeap.peek()[0];
                    double nextRingMinDist = ring * cellSizeKm;
                    if (nextRingMinDist > farthest) break;
                }
            }

            // Extract results sorted by distance
            List<double[]> result = new ArrayList<>(maxHeap);
            result.sort((a, b) -> Double.compare(a[0], b[0]));

            List<Driver> closest = new ArrayList<>();
            for (double[] entry : result) {
                closest.add(candidates.get((int) entry[1]));
            }
            return closest;
        }
    }

    public static void main(String[] args) {
        SpatialGrid grid = new SpatialGrid(1.0); // 1km cells

        // Add drivers in Bangalore area
        grid.addOrUpdateDriver(new Driver("D1", 12.9716, 77.5946, 4.8));
        grid.addOrUpdateDriver(new Driver("D2", 12.9750, 77.5900, 4.5));
        grid.addOrUpdateDriver(new Driver("D3", 12.9800, 77.6000, 4.9));
        grid.addOrUpdateDriver(new Driver("D4", 12.9600, 77.5800, 4.2));
        grid.addOrUpdateDriver(new Driver("D5", 12.9900, 77.6100, 4.7));

        // Rider at MG Road, Bangalore
        Location rider = new Location(12.9750, 77.5950);
        List<Driver> closest = grid.findClosestK(rider, 3, 5.0);

        System.out.println("Closest 3 drivers:");
        for (Driver d : closest) {
            double dist = haversineDistance(rider, d.location);
            System.out.printf("  %s: %.2f km (rating: %.1f)%n", d.id, dist, d.rating);
        }
    }
}
```

**Complexity:**
- **Grid-based search:** O(K × ring_area) per query — much faster than O(N) brute force
- **Update:** O(1) per driver location update
- **Space:** O(N) for N drivers

## Round 2: Technical Interview — Backend
**Duration:** 60 minutes | **Interviewer:** Senior Engineer

### Questions Asked
1. **Design a Ride Fare Estimator with Surge Pricing**
   - Base fare + per-km + per-minute + surge multiplier
   - Surge based on supply/demand ratio in a zone
   - Support different vehicle types with different rates

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;

public class FareEstimator {

    enum VehicleType {
        ECONOMY(1.0, 8.0, 1.5),   // baseFare, perKm, perMinute
        PREMIUM(2.0, 14.0, 2.5),
        LUXURY(5.0, 22.0, 4.0);

        final double baseFare;
        final double perKm;
        final double perMinute;

        VehicleType(double baseFare, double perKm, double perMinute) {
            this.baseFare = baseFare;
            this.perKm = perKm;
            this.perMinute = perMinute;
        }
    }

    static class FareBreakdown {
        double baseFare;
        double distanceFare;
        double timeFare;
        double surgeMultiplier;
        double totalFare;
        VehicleType vehicleType;

        @Override
        public String toString() {
            return String.format(
                "%s — Base: $%.2f, Distance: $%.2f, Time: $%.2f, Surge: %.1fx, Total: $%.2f",
                vehicleType, baseFare, distanceFare, timeFare, surgeMultiplier, totalFare
            );
        }
    }

    // Zone-level demand/supply tracking
    static class SurgeCalculator {
        private final ConcurrentHashMap<String, int[]> zoneDemandSupply = new ConcurrentHashMap<>();
        // value: [demand, supply]

        void recordDemand(String zoneId) {
            zoneDemandSupply.computeIfAbsent(zoneId, k -> new int[]{0, 0})[0]++;
        }

        void recordSupply(String zoneId, int availableDrivers) {
            zoneDemandSupply.computeIfAbsent(zoneId, k -> new int[]{0, 0})[1] = availableDrivers;
        }

        double getSurgeMultiplier(String zoneId) {
            int[] ds = zoneDemandSupply.get(zoneId);
            if (ds == null || ds[1] == 0) return 1.0;

            double ratio = (double) ds[0] / ds[1];

            // Surge tiers
            if (ratio > 3.0) return 2.5;
            if (ratio > 2.0) return 2.0;
            if (ratio > 1.5) return 1.5;
            if (ratio > 1.0) return 1.2;
            return 1.0;
        }

        void resetZone(String zoneId) {
            zoneDemandSupply.remove(zoneId);
        }
    }

    private final SurgeCalculator surgeCalculator = new SurgeCalculator();

    public FareBreakdown estimateFare(
        double distanceKm, double durationMinutes,
        VehicleType vehicleType, String pickupZoneId
    ) {
        FareBreakdown breakdown = new FareBreakdown();
        breakdown.vehicleType = vehicleType;
        breakdown.baseFare = vehicleType.baseFare;
        breakdown.distanceFare = distanceKm * vehicleType.perKm;
        breakdown.timeFare = durationMinutes * vehicleType.perMinute;
        breakdown.surgeMultiplier = surgeCalculator.getSurgeMultiplier(pickupZoneId);

        double subtotal = breakdown.baseFare + breakdown.distanceFare + breakdown.timeFare;
        breakdown.totalFare = Math.round(subtotal * breakdown.surgeMultiplier * 100.0) / 100.0;

        return breakdown;
    }

    public static void main(String[] args) {
        FareEstimator estimator = new FareEstimator();

        // Simulate surge in zone "koramangala"
        for (int i = 0; i < 10; i++) estimator.surgeCalculator.recordDemand("koramangala");
        estimator.surgeCalculator.recordSupply("koramangala", 3);

        // Estimate fare: 8km, 20 minutes
        for (VehicleType type : VehicleType.values()) {
            FareBreakdown fare = estimator.estimateFare(8.0, 20.0, type, "koramangala");
            System.out.println(fare);
        }
    }
}
```

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Grab's Real-Time ETA Prediction Service**
   - Predict ETA for ride requests considering traffic, weather, time of day
   - Serve millions of requests per second across Southeast Asia
   - Update predictions in real-time as conditions change

## Round 4: Behavioral
**Duration:** 45 minutes

### Topics Discussed
- Handling ambiguous requirements in a cross-functional team
- Experience with on-call incidents and follow-up actions
- Growth mindset and feedback culture

## 🎯 Key Takeaways
- Grab interviews are heavily **geo-spatial** — expect questions about location indexing, proximity search, mapping
- Surge pricing is a classic Grab/Uber question — know the tier-based and continuous models
- Spatial indexing (grid, geohash, R-tree) is essential for ride-hailing companies
- System design focused on **real-time ML inference at scale**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Hard | Spatial Indexing, K-Nearest, Haversine |
| Technical (Backend) | Medium | Pricing, Surge, ConcurrentHashMap |
| System Design | Hard | ML, Real-time ETA, Geo-distributed |
| Behavioral | Easy | Leadership, Ownership |
