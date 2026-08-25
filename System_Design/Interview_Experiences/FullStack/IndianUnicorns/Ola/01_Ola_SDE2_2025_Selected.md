# Ola — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola Cabs |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 |
| **YOE** | 3 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/ola-cabs-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + DSA + System Design + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Design a Ride Sharing/Cab Booking System (Console-based)**
   - Book ride, match driver, calculate fare, track ride status

### 💡 Interview-Ready Answer

```java
enum RideStatus { REQUESTED, MATCHED, IN_PROGRESS, COMPLETED, CANCELLED }

class Location {
    double latitude;
    double longitude;
    
    double distanceTo(Location other) {
        // Haversine formula for GPS distance
        double R = 6371; // Earth radius in km
        double dLat = Math.toRadians(other.latitude - latitude);
        double dLon = Math.toRadians(other.longitude - longitude);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(Math.toRadians(latitude)) * Math.cos(Math.toRadians(other.latitude)) *
                   Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}

class Driver {
    String driverId;
    String name;
    Location currentLocation;
    boolean isAvailable;
    double rating;
    String vehicleType; // MINI, SEDAN, SUV
}

class Ride {
    String rideId;
    String riderId;
    String driverId;
    Location pickup;
    Location dropoff;
    RideStatus status;
    double fare;
    LocalDateTime requestedAt;
    LocalDateTime completedAt;
}

interface FareStrategy {
    double calculate(double distanceKm, String vehicleType, LocalDateTime time);
}

class StandardFare implements FareStrategy {
    private static final Map<String, Double> BASE_FARE = Map.of("MINI", 30.0, "SEDAN", 50.0, "SUV", 80.0);
    private static final Map<String, Double> PER_KM = Map.of("MINI", 8.0, "SEDAN", 12.0, "SUV", 16.0);
    
    @Override
    public double calculate(double distanceKm, String vehicleType, LocalDateTime time) {
        double base = BASE_FARE.getOrDefault(vehicleType, 30.0);
        double perKm = PER_KM.getOrDefault(vehicleType, 8.0);
        double fare = base + (distanceKm * perKm);
        
        // Surge pricing: peak hours (8-10 AM, 5-8 PM)
        int hour = time.getHour();
        if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) {
            fare *= 1.5; // 1.5x surge
        }
        
        return Math.round(fare * 100.0) / 100.0;
    }
}

class RideService {
    Map<String, Driver> drivers = new ConcurrentHashMap<>();
    Map<String, Ride> rides = new ConcurrentHashMap<>();
    FareStrategy fareStrategy = new StandardFare();
    
    Ride requestRide(String riderId, Location pickup, Location dropoff, String vehicleType) {
        // Find nearest available driver of matching vehicle type
        Driver matched = findNearestDriver(pickup, vehicleType);
        if (matched == null) throw new RuntimeException("No drivers available");
        
        Ride ride = new Ride();
        ride.rideId = UUID.randomUUID().toString();
        ride.riderId = riderId;
        ride.driverId = matched.driverId;
        ride.pickup = pickup;
        ride.dropoff = dropoff;
        ride.status = RideStatus.MATCHED;
        ride.requestedAt = LocalDateTime.now();
        ride.fare = fareStrategy.calculate(pickup.distanceTo(dropoff), vehicleType, LocalDateTime.now());
        
        matched.isAvailable = false;
        rides.put(ride.rideId, ride);
        
        return ride;
    }
    
    Driver findNearestDriver(Location pickup, String vehicleType) {
        return drivers.values().stream()
            .filter(d -> d.isAvailable)
            .filter(d -> d.vehicleType.equals(vehicleType))
            .filter(d -> d.currentLocation.distanceTo(pickup) <= 5.0) // within 5km
            .min(Comparator.comparingDouble(d -> d.currentLocation.distanceTo(pickup)))
            .orElse(null);
    }
    
    void completeRide(String rideId) {
        Ride ride = rides.get(rideId);
        ride.status = RideStatus.COMPLETED;
        ride.completedAt = LocalDateTime.now();
        
        Driver driver = drivers.get(ride.driverId);
        driver.isAvailable = true;
    }
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Dijkstra's Shortest Path** (with adjacency list)
2. **Kth Smallest Element in BST** (LeetCode 230)
3. **Trapping Rain Water** (LeetCode 42)

### 💡 Interview-Ready Answer — Dijkstra's

```java
public int[] dijkstra(int n, List<int[]>[] adj, int src) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    
    // Min-heap: {distance, node}
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    pq.offer(new int[]{0, src});
    
    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        int d = curr[0], u = curr[1];
        
        if (d > dist[u]) continue; // stale entry
        
        for (int[] edge : adj[u]) {
            int v = edge[0], w = edge[1];
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.offer(new int[]{dist[v], v});
            }
        }
    }
    return dist;
}
```
**Time:** O((V + E) log V), **Space:** O(V)

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design a Ride-Matching System at Scale**
   - Geospatial matching, driver allocation, ETA calculation, surge pricing

### 💡 Interview-Ready Answer

```
┌──────────────────────────────────────────────────────────────┐
│  Architecture: Ride Matching at Scale                         │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Location Service (Driver GPS updates)                │    │
│  │  - Drivers send GPS every 4 seconds                   │    │
│  │  - Store in Redis GEO: GEOADD drivers lat lon drvId  │    │
│  │  - GEORADIUS to find nearby drivers                   │    │
│  │  - TTL 30s: if no update, driver considered offline   │    │
│  └──────────────────────────────┬───────────────────────┘    │
│                                  │                             │
│  ┌──────────────────────────────▼───────────────────────┐    │
│  │  Matching Service                                      │    │
│  │  Input: rider's pickup location + vehicle preference  │    │
│  │                                                        │    │
│  │  Step 1: GEORADIUS 3km → get candidate drivers        │    │
│  │  Step 2: Filter: available, correct vehicle type       │    │
│  │  Step 3: Score each driver:                            │    │
│  │    score = w1 * (1/distance) + w2 * rating            │    │
│  │          + w3 * acceptance_rate + w4 * (1/ETA)        │    │
│  │  Step 4: Send request to top driver                   │    │
│  │  Step 5: If no accept in 15s → next driver            │    │
│  │  Step 6: If no drivers in 3km → expand to 5km → 8km  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ETA Service                                           │    │
│  │  - Pre-computed travel times between city zones       │    │
│  │  - Real-time adjustment: traffic factor from GPS data │    │
│  │  - Dijkstra on road graph with live edge weights      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Surge Pricing Service                                 │    │
│  │  - Per-zone supply/demand ratio                       │    │
│  │  - demand[zone] = ride requests in last 5 min         │    │
│  │  - supply[zone] = available drivers in zone           │    │
│  │  - surge = max(1.0, demand / (supply * threshold))    │    │
│  │  - Cap: 3.0x max surge                                │    │
│  │  - Recalculate every 2 minutes                        │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

#### Geospatial: S2 Cells / Geohash
```
Driver Location Storage Options:

1. Redis GEORADIUS (simplest, works for single city):
   GEOADD drivers:bangalore 77.5946 12.9716 "driver-001"
   GEORADIUSBYMEMBER drivers:bangalore "rider-pickup" 3 km ASC COUNT 10

2. S2 Cells (Google's approach — works globally):
   - Divide Earth into hierarchical cells
   - Level 14 cells ≈ 0.32 km² — good for city blocks
   - Each cell has a unique 64-bit ID
   - To find nearby: get cell for pickup → get neighbors → query drivers in those cells
   - Fast: integer range scan on cell ID index

3. Geohash (Uber's approach):
   - Divide Earth into grid, encode as string
   - "tdr1wy" → specific 150m × 150m cell
   - Prefix match: "tdr1" → all cells starting with "tdr1" (coarser area)
   - For nearby: get geohash + 8 neighbor hashes → query all
```

---

## 🎯 Key Takeaways
- Ola interviews are **ride-hailing focused** — know geospatial, matching, ETA, surge
- **Cab Booking machine coding** is the #1 question — focus on OOP + Strategy pattern for fares
- **Haversine formula** for GPS distance — must know for any location-based company
- **Dijkstra's** is expected for ETA calculation on road networks
- **Redis GEORADIUS** for driver location storage and nearby queries — simple and fast
- **Surge pricing** = supply/demand ratio per zone — update every few minutes
- **S2 Cells vs Geohash** — know both approaches and trade-offs

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | OOP, Geospatial, Strategy Pattern |
| DSA | Medium-Hard | Dijkstra, BST, Two Pointer |
| System Design | Hard | Geospatial Matching, ETA, Surge |
| HM | Medium | Behavioral |
