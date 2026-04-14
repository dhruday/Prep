# Ola — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | SDE-2 |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/ola-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + DSA + System Design + HM)
- **Rejection Reason:** Machine Coding — code wasn't production-ready (no error handling, no edge cases)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Ride Fare Estimator with Surge Pricing**
   - Distance calculation, time estimation, surge multiplier, promo codes, fare breakdown

### 💡 Interview-Ready Answer

```java
class RideFareEstimator {
    private final Map<RideType, FareConfig> fareConfigs;
    private final SurgeService surgeService;
    private final PromoCodeService promoService;
    
    enum RideType { MINI, SEDAN, SUV, AUTO, BIKE }
    
    record FareConfig(double baseFare, double perKmRate, double perMinRate,
                      double minimumFare, double bookingFee, double platformFee) {}
    
    record FareEstimate(RideType type, double baseFare, double distanceFare,
                        double timeFare, double surgeFare, double discount,
                        double bookingFee, double gst, double totalFare,
                        double surgeMultiplier, String promoApplied) {}
    
    record Location(double lat, double lng) {}
    
    FareEstimate estimate(Location pickup, Location drop, RideType type, String promoCode) {
        FareConfig config = fareConfigs.get(type);
        if (config == null) throw new IllegalArgumentException("Invalid ride type: " + type);
        
        // 1. Calculate distance (Haversine formula)
        double distanceKm = haversineDistance(pickup, drop);
        
        // Routing factor: road distance ≈ 1.3 × straight-line distance
        double roadDistance = distanceKm * 1.3;
        
        // 2. Estimate time (based on average speed by ride type + time of day)
        double avgSpeedKmH = getAverageSpeed(type, LocalTime.now());
        double estimatedMinutes = (roadDistance / avgSpeedKmH) * 60;
        
        // 3. Calculate fare components
        double distanceFare = roadDistance * config.perKmRate;
        double timeFare = estimatedMinutes * config.perMinRate;
        double baseFare = config.baseFare;
        
        // 4. Get surge multiplier for pickup area
        double surgeMultiplier = surgeService.getSurge(pickup);
        double subtotal = baseFare + distanceFare + timeFare;
        double surgeFare = subtotal * (surgeMultiplier - 1); // Extra cost due to surge
        
        double fareAfterSurge = subtotal + surgeFare;
        
        // 5. Apply minimum fare
        fareAfterSurge = Math.max(fareAfterSurge, config.minimumFare);
        
        // 6. Apply promo code
        double discount = 0;
        String appliedPromo = null;
        if (promoCode != null) {
            PromoResult promo = promoService.validate(promoCode, fareAfterSurge, type);
            if (promo.valid()) {
                discount = promo.discount();
                appliedPromo = promoCode;
            }
        }
        
        double fareAfterDiscount = fareAfterSurge - discount;
        
        // 7. Add fees and taxes
        double totalBeforeTax = fareAfterDiscount + config.bookingFee + config.platformFee;
        double gst = totalBeforeTax * 0.05; // 5% GST on ride-hailing in India
        double totalFare = totalBeforeTax + gst;
        
        // Round to nearest rupee
        totalFare = Math.ceil(totalFare);
        
        return new FareEstimate(type, baseFare, distanceFare, timeFare, surgeFare,
            discount, config.bookingFee, gst, totalFare, surgeMultiplier, appliedPromo);
    }
    
    // Haversine formula: distance between two lat/lng points
    static double haversineDistance(Location a, Location b) {
        double R = 6371; // Earth's radius in km
        double dLat = Math.toRadians(b.lat - a.lat);
        double dLng = Math.toRadians(b.lng - a.lng);
        
        double aVal = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(a.lat)) * Math.cos(Math.toRadians(b.lat))
            * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
        
        return R * c;
    }
    
    private double getAverageSpeed(RideType type, LocalTime time) {
        // Peak hours: 8-10 AM, 5-8 PM → slower speeds
        boolean isPeak = (time.getHour() >= 8 && time.getHour() <= 10) ||
                         (time.getHour() >= 17 && time.getHour() <= 20);
        
        return switch (type) {
            case AUTO, BIKE -> isPeak ? 15 : 25;
            case MINI, SEDAN -> isPeak ? 18 : 30;
            case SUV -> isPeak ? 15 : 28;
        };
    }
    
    // Promo code validation
    record PromoResult(boolean valid, double discount, String message) {}
    
    interface PromoCodeService {
        PromoResult validate(String code, double fare, RideType type);
    }
    
    interface SurgeService {
        double getSurge(Location location); // returns multiplier (1.0 = no surge)
    }
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Cheapest Flights Within K Stops** (LeetCode 787)
2. **Follow-up: Return the actual path**

### 💡 Cheapest Flights (Bellman-Ford variant)

```java
public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
    // Bellman-Ford with at most k+1 edges (k stops = k+1 flights)
    int[] prices = new int[n];
    Arrays.fill(prices, Integer.MAX_VALUE);
    prices[src] = 0;
    
    for (int i = 0; i <= k; i++) { // k+1 relaxation rounds
        int[] temp = Arrays.copyOf(prices, n); // Copy to prevent using current round's results
        
        for (int[] flight : flights) {
            int from = flight[0], to = flight[1], cost = flight[2];
            
            if (prices[from] != Integer.MAX_VALUE && prices[from] + cost < temp[to]) {
                temp[to] = prices[from] + cost;
            }
        }
        
        prices = temp;
    }
    
    return prices[dst] == Integer.MAX_VALUE ? -1 : prices[dst];
}
// Time: O(K × E), Space: O(V)

// Follow-up: Return path — track parent array
public List<Integer> findCheapestPath(int n, int[][] flights, int src, int dst, int k) {
    int[] prices = new int[n];
    int[] parent = new int[n];
    Arrays.fill(prices, Integer.MAX_VALUE);
    Arrays.fill(parent, -1);
    prices[src] = 0;
    
    for (int i = 0; i <= k; i++) {
        int[] temp = Arrays.copyOf(prices, n);
        int[] tempParent = Arrays.copyOf(parent, n);
        
        for (int[] flight : flights) {
            int from = flight[0], to = flight[1], cost = flight[2];
            if (prices[from] != Integer.MAX_VALUE && prices[from] + cost < temp[to]) {
                temp[to] = prices[from] + cost;
                tempParent[to] = from;
            }
        }
        
        prices = temp;
        parent = tempParent;
    }
    
    if (prices[dst] == Integer.MAX_VALUE) return List.of();
    
    // Reconstruct path
    List<Integer> path = new ArrayList<>();
    int curr = dst;
    while (curr != -1) {
        path.add(0, curr);
        curr = parent[curr];
    }
    return path;
}
```

---

## 🎯 Key Takeaways
- Ola SDE-2 = **ride-hailing domain** (fare calculation, surge, Haversine)
- **Fare estimation** = distance fare + time fare + surge + promo − discount + GST
- **Haversine formula** = great-circle distance between lat/lng points — MUST memorize
- **Road distance ≈ 1.3 × straight-line distance** — common routing heuristic
- **GST on ride-hailing in India** = 5% — know domain-specific taxes
- **Cheapest Flights K Stops** = Bellman-Ford variant (not Dijkstra because of K constraint)
- Copy array in each Bellman-Ford round to prevent using current round's updates
- Ola values **production-ready code** — error handling, edge cases, input validation

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Fare Estimation, Haversine, Promo Codes |
| DSA | Medium-Hard | Bellman-Ford, Graph, Path Reconstruction |
| System Design | Hard | Cab Matching, Surge Pricing |
| HM | Medium | Behavioral |
