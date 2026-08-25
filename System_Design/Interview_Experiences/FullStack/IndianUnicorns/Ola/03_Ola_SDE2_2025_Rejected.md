# Ola — SDE-2 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola (ANI Technologies) |
| **Role** | SDE-2 FullStack |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/ola-interview-experience/) |
| **Author** | Anonymous |
| **Rejection Reason** | LLD round — missed thread safety in concurrent ride assignment |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Coding + LLD + HLD)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Rotting Oranges** (LeetCode 994) — Multi-source BFS
2. **Follow-up: Find the farthest cell from any rotten orange**

### 💡 Rotting Oranges

```java
public int orangesRotting(int[][] grid) {
    int m = grid.length, n = grid[0].length;
    Queue<int[]> queue = new LinkedList<>();
    int freshCount = 0;
    
    // Find all initially rotten oranges + count fresh
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (grid[i][j] == 2) queue.offer(new int[]{i, j});
            else if (grid[i][j] == 1) freshCount++;
        }
    }
    
    if (freshCount == 0) return 0; // No fresh oranges
    
    int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}};
    int minutes = 0;
    
    while (!queue.isEmpty() && freshCount > 0) {
        minutes++;
        int size = queue.size();
        
        for (int k = 0; k < size; k++) {
            int[] cell = queue.poll();
            
            for (int[] d : dirs) {
                int ni = cell[0] + d[0], nj = cell[1] + d[1];
                
                if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] == 1) {
                    grid[ni][nj] = 2; // Mark rotten
                    freshCount--;
                    queue.offer(new int[]{ni, nj});
                }
            }
        }
    }
    
    return freshCount == 0 ? minutes : -1; // -1 if some fresh are unreachable
}
// Time: O(m*n), Space: O(m*n) for queue
```

---

## Round 2: LLD
**Duration:** 60 minutes

### Questions Asked
1. **Design a Ride Sharing System** (like Ola Share / UberPool)
   - Match riders going in similar direction
   - Max 3 riders per shared ride
   - Dynamic pickup/drop reordering
   - Fare splitting (proportional to distance)
   - Handle rider cancellation mid-ride

### 💡 Ride Sharing LLD

```java
// Core Models
enum RideType { SOLO, SHARE }
enum RideStatus { REQUESTED, MATCHING, CONFIRMED, EN_ROUTE_PICKUP, 
                  IN_RIDE, EN_ROUTE_DROP, COMPLETED, CANCELLED }

class SharedRide {
    final String rideId;
    Driver driver;
    List<RiderLeg> legs; // Max 3
    RideStatus status;
    List<Waypoint> optimizedRoute;
    
    static final int MAX_RIDERS = 3;
    static final double MAX_DETOUR_RATIO = 1.4; // Max 40% detour allowed
    
    synchronized boolean canAddRider(RiderLeg newLeg) {
        if (legs.size() >= MAX_RIDERS) return false;
        
        // Check if adding this rider causes too much detour for existing riders
        List<Waypoint> newRoute = routeOptimizer.optimize(
            getAllWaypoints(legs, newLeg), driver.getCurrentLocation()
        );
        
        for (RiderLeg existing : legs) {
            double directDistance = distance(existing.pickup, existing.dropoff);
            double actualDistance = routeDistance(newRoute, existing.pickup, existing.dropoff);
            
            if (actualDistance / directDistance > MAX_DETOUR_RATIO) {
                return false; // Too much detour for existing rider
            }
        }
        
        return true;
    }
    
    synchronized void addRider(RiderLeg leg) {
        if (!canAddRider(leg)) throw new IllegalStateException("Cannot add rider");
        
        legs.add(leg);
        optimizedRoute = routeOptimizer.optimize(
            getAllWaypoints(legs, null), driver.getCurrentLocation()
        );
        
        // Notify driver of updated route
        notificationService.notifyRouteUpdate(driver, optimizedRoute);
        
        // Notify existing riders of slight detour
        for (RiderLeg existing : legs) {
            Duration newEta = calculateETA(optimizedRoute, existing.dropoff);
            notificationService.notifyETAUpdate(existing.rider, newEta);
        }
    }
    
    synchronized void handleCancellation(String riderId) {
        RiderLeg cancelled = legs.stream()
            .filter(l -> l.rider.getId().equals(riderId))
            .findFirst().orElseThrow();
        
        if (cancelled.status == LegStatus.PICKED_UP) {
            // Rider is in car — drop them at nearest safe point
            Location safeDropPoint = findNearestSafePoint(driver.getCurrentLocation());
            cancelled.dropoff = safeDropPoint;
            cancelled.status = LegStatus.EARLY_DROP;
        } else {
            // Rider not yet picked up — just remove
            legs.remove(cancelled);
        }
        
        // Recalculate route for remaining riders
        optimizedRoute = routeOptimizer.optimize(
            getAllWaypoints(legs, null), driver.getCurrentLocation()
        );
        
        // Refund calculations
        fareService.calculateCancellationRefund(cancelled);
    }
}

// Fare Splitting
class FareService {
    Map<String, BigDecimal> calculateSharedFare(SharedRide ride) {
        Map<String, BigDecimal> fares = new HashMap<>();
        BigDecimal totalRideDistance = ride.getTotalDistance();
        
        for (RiderLeg leg : ride.getLegs()) {
            // Proportional to rider's direct distance
            BigDecimal directDistance = BigDecimal.valueOf(
                distance(leg.pickup, leg.dropoff)
            );
            
            // Base fare = solo fare * discount factor * (rider's distance / total distance)
            BigDecimal soloFare = calculateSoloFare(directDistance);
            BigDecimal sharedDiscount = BigDecimal.valueOf(0.65); // 35% cheaper than solo
            
            BigDecimal fare = soloFare.multiply(sharedDiscount)
                .setScale(2, RoundingMode.HALF_UP);
            
            // Minimum fare guarantee
            fare = fare.max(MINIMUM_FARE);
            
            fares.put(leg.rider.getId(), fare);
        }
        
        return fares;
    }
}

// Route Optimizer (TSP-like with constraints)
class RouteOptimizer {
    List<Waypoint> optimize(List<Waypoint> waypoints, Location currentLocation) {
        // Constraint: pickup must come before dropoff for each rider
        // Use: greedy nearest-neighbor with constraint checking
        
        List<Waypoint> route = new ArrayList<>();
        Set<String> pickedUp = new HashSet<>();
        List<Waypoint> remaining = new ArrayList<>(waypoints);
        Location current = currentLocation;
        
        while (!remaining.isEmpty()) {
            Waypoint nearest = null;
            double minDist = Double.MAX_VALUE;
            
            for (Waypoint wp : remaining) {
                // Skip dropoff if pickup not done yet
                if (wp.type == WaypointType.DROPOFF && !pickedUp.contains(wp.riderId)) {
                    continue;
                }
                
                double dist = distance(current, wp.location);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = wp;
                }
            }
            
            route.add(nearest);
            remaining.remove(nearest);
            current = nearest.location;
            
            if (nearest.type == WaypointType.PICKUP) {
                pickedUp.add(nearest.riderId);
            }
        }
        
        return route;
    }
}

// Matching Service — find compatible riders
class RideMatchingService {
    Optional<SharedRide> findMatchingRide(RideRequest request) {
        // 1. Find active shared rides within radius of pickup
        List<SharedRide> nearby = activeRideIndex.findWithinRadius(
            request.getPickup(), 2.0 // 2km radius
        );
        
        // 2. Filter: same general direction (cosine similarity of vectors)
        List<SharedRide> compatible = nearby.stream()
            .filter(ride -> {
                double similarity = cosineSimilarity(
                    vectorFromTo(request.getPickup(), request.getDropoff()),
                    ride.getGeneralDirection()
                );
                return similarity > 0.7; // At least 70% similar direction
            })
            .filter(ride -> ride.canAddRider(new RiderLeg(request)))
            .sorted(Comparator.comparingDouble(ride -> 
                distance(ride.getDriver().getCurrentLocation(), request.getPickup())
            ))
            .toList();
        
        return compatible.stream().findFirst();
    }
}
```

---

## 🎯 Key Takeaways
- Ola/Ride-sharing = **matching + routing + fare splitting + real-time updates**
- **Rotting Oranges**: multi-source BFS (all rotten oranges in initial queue) — classic level-by-level
- **Ride sharing matching**: direction similarity (cosine) + proximity + detour ratio < 1.4
- **Route optimization**: greedy nearest-neighbor with pickup-before-dropoff constraint
- **Thread safety**: `synchronized` on addRider/cancelRider — concurrent access to same ride
- **Fare splitting**: proportional to direct distance × shared discount (65% of solo fare)
- **Mid-ride cancellation**: dropped rider → nearest safe point, recalculate route for remaining
- Ola interviews: **practical ride-hailing problems + geospatial algorithms + concurrency**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array, BFS, Graph |
| Coding | Medium | Multi-Source BFS, Grid Traversal |
| LLD | Hard | Ride Sharing, Route Optimization, Thread Safety |
| HLD | Hard | Ride Matching at Scale, Geospatial |
