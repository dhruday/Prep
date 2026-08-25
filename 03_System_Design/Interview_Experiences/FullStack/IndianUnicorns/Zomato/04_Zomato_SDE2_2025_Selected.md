# Zomato — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | SDE-2 FullStack |
| **Level** | Mid-Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Gurgaon, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/zomato-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Coding + System Design + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Cheapest Flights Within K Stops** (LeetCode 787) — Bellman-Ford variant
2. **Follow-up: BFS/DFS approach and when each is better**

### 💡 Cheapest Flights Within K Stops

```java
// Approach 1: Modified Bellman-Ford (K+1 relaxation rounds)
int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
    // dist[i] = cheapest cost to reach node i
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    
    // Relax edges at most K+1 times (K stops = K+1 edges)
    for (int i = 0; i <= k; i++) {
        int[] temp = dist.clone(); // Clone to prevent using current round's updates
        
        for (int[] flight : flights) {
            int from = flight[0], to = flight[1], price = flight[2];
            if (dist[from] != Integer.MAX_VALUE && dist[from] + price < temp[to]) {
                temp[to] = dist[from] + price;
            }
        }
        
        dist = temp;
    }
    
    return dist[dst] == Integer.MAX_VALUE ? -1 : dist[dst];
}
// Time: O(K * E) where E = flights.length
// Space: O(N)

// Approach 2: BFS with pruning (better when K is small)
int findCheapestPriceBFS(int n, int[][] flights, int src, int dst, int k) {
    // Build adjacency list
    Map<Integer, List<int[]>> graph = new HashMap<>();
    for (int[] f : flights) {
        graph.computeIfAbsent(f[0], x -> new ArrayList<>()).add(new int[]{f[1], f[2]});
    }
    
    // BFS level-by-level (level = number of stops used)
    int[] bestCost = new int[n];
    Arrays.fill(bestCost, Integer.MAX_VALUE);
    bestCost[src] = 0;
    
    Queue<int[]> queue = new LinkedList<>(); // [node, costSoFar]
    queue.offer(new int[]{src, 0});
    int stops = 0;
    
    while (!queue.isEmpty() && stops <= k) {
        int size = queue.size();
        
        for (int i = 0; i < size; i++) {
            int[] curr = queue.poll();
            int node = curr[0], cost = curr[1];
            
            for (int[] next : graph.getOrDefault(node, List.of())) {
                int nextNode = next[0], price = next[1];
                int newCost = cost + price;
                
                // Only explore if cheaper than best known
                if (newCost < bestCost[nextNode]) {
                    bestCost[nextNode] = newCost;
                    queue.offer(new int[]{nextNode, newCost});
                }
            }
        }
        stops++;
    }
    
    return bestCost[dst] == Integer.MAX_VALUE ? -1 : bestCost[dst];
}
// Time: O(N * K) worst case
// Bellman-Ford is better for dense graphs, BFS for sparse with small K
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Zomato's Real-Time Delivery Tracking System**
   - Live location of delivery partner on map
   - ETA calculation and updates
   - Order status transitions (placed → confirmed → preparing → picked → delivered)
   - Notifications: push + SMS at each status change
   - Handle delivery partner reassignment

### 💡 Key Design

```
Architecture:
┌───────────────┐        ┌──────────────────┐
│ Customer App  │◄──WSS──│  WebSocket       │
│ (map + status)│        │  Gateway         │
└───────────────┘        │  (per-order      │
                         │   subscription)  │
┌───────────────┐        └───────┬──────────┘
│ Delivery App  │                │
│ (GPS sender)  │        ┌──────▼──────────┐
│ every 3-5s    │───────▶│  Location        │
└───────────────┘  MQTT  │  Ingestion       │
                         │  Service         │
                         └───────┬──────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
             ┌──────▼────┐ ┌───▼──────┐ ┌──▼──────────┐
             │ Location  │ │ ETA      │ │ Order State │
             │ Store     │ │ Service  │ │ Machine     │
             │ (Redis    │ │ (OSRM + │ │ (Kafka +    │
             │  GeoHash) │ │  ML adj) │ │  DB)        │
             └───────────┘ └──────────┘ └─────────────┘

Location Ingestion:
class LocationIngestionService {
    // Delivery partner sends GPS every 3-5 seconds
    
    void processLocationUpdate(LocationUpdate update) {
        String deliveryPartnerId = update.getPartnerId();
        double lat = update.getLatitude();
        double lng = update.getLongitude();
        
        // 1. Validate location (anti-spoofing)
        LocationUpdate previous = redis.get("loc:" + deliveryPartnerId);
        if (previous != null) {
            double distanceKm = haversine(previous.getLat(), previous.getLng(), lat, lng);
            double timeDiffHours = (update.getTimestamp() - previous.getTimestamp()) / 3600000.0;
            double speedKmh = distanceKm / timeDiffHours;
            
            if (speedKmh > 120) { // Impossible speed → GPS spoof or error
                metrics.increment("location.spoofing.detected");
                return; // Drop this update
            }
        }
        
        // 2. Store current location in Redis (with GeoHash for nearby queries)
        redis.geoadd("delivery_partners", lng, lat, deliveryPartnerId);
        redis.set("loc:" + deliveryPartnerId, serialize(update), Duration.ofMinutes(2));
        
        // 3. Find active orders for this delivery partner
        List<String> activeOrderIds = orderService.getActiveOrders(deliveryPartnerId);
        
        for (String orderId : activeOrderIds) {
            // 4. Recalculate ETA
            Order order = orderService.getOrder(orderId);
            ETAResult eta = etaService.calculate(lat, lng, 
                order.getDropoffLat(), order.getDropoffLng());
            
            // 5. Publish location + ETA to customer via WebSocket
            wsGateway.publish("order:" + orderId, new LocationEvent(
                lat, lng, eta.getMinutes(), eta.getDistanceKm()
            ));
        }
    }
}

ETA Calculation:
class ETAService {
    // Base ETA from OSRM (road distance + traffic)
    // ML adjustment based on historical patterns
    
    ETAResult calculate(double fromLat, double fromLng, double toLat, double toLng) {
        // 1. Get route from OSRM (Open Source Routing Machine)
        OSRMRoute route = osrmClient.getRoute(fromLat, fromLng, toLat, toLng);
        double baseEtaMinutes = route.getDurationSeconds() / 60.0;
        double distanceKm = route.getDistanceMeters() / 1000.0;
        
        // 2. ML adjustment factors
        double timeOfDayFactor = getTimeOfDayFactor(); // 1.3x during peak hours
        double weatherFactor = getWeatherFactor();     // 1.2x during rain
        double areaFactor = getAreaFactor(toLat, toLng); // 1.5x for congested areas
        
        double adjustedEta = baseEtaMinutes * timeOfDayFactor * weatherFactor * areaFactor;
        
        // 3. Buffer: +2 minutes for parking/stairs/handoff
        adjustedEta += 2.0;
        
        return new ETAResult(Math.round(adjustedEta), distanceKm);
    }
}

Order State Machine:
PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → PICKED_UP → NEAR_DESTINATION → DELIVERED
  │          │           │              │                 │              │
  └─CANCELLED──CANCELLED───CANCELLED─────┘                │              │
                                        (refund full)     └──CANCELLED───┘
                                                           (partial refund)

Delivery Partner Reassignment:
- If partner doesn't pick up in 5 min → auto-reassign
- Find nearest available partner (Redis GEORADIUS)
- Transfer order: update partner_id in DB, notify new partner
- Notify customer: "Your delivery partner has changed"
- Metrics: track reassignment rate per area, per time slot

Push Notification Strategy:
1. PLACED → Customer: "Order placed! Restaurant will confirm shortly."
2. CONFIRMED → Customer: "Restaurant confirmed! Preparing your food."
3. PICKED_UP → Customer: "Your order is on the way! ETA: 15 min."
4. NEAR_DESTINATION → Customer: "Almost there! Your delivery partner is nearby."
5. DELIVERED → Customer: "Delivered! Rate your experience."
   Each via FCM (Android) / APNS (iOS) + SMS fallback for critical states
```

---

## 🎯 Key Takeaways
- Zomato = **delivery tracking + ETA + order state machine + real-time**
- **Cheapest Flights K Stops**: Bellman-Ford with `clone()` per round to prevent premature relaxation
- **BFS approach**: better for sparse graphs with small K, prune by `bestCost[node]`
- **Location anti-spoofing**: validate speed between consecutive updates (>120 km/h = suspicious)
- **ETA = OSRM base × ML factors** (time of day × weather × area congestion) + 2 min buffer
- **GeoHash in Redis**: `GEOADD`/`GEORADIUS` for finding nearest delivery partners
- **WebSocket per order**: customer subscribes to `order:{id}`, gets location + ETA every 3-5s
- Zomato interviews: strong focus on **real-time systems and delivery domain knowledge**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA + SQL |
| Coding | Medium-Hard | Cheapest Flights, Graph Algorithms |
| System Design | Hard | Delivery Tracking, ETA, WebSocket |
| HM | Medium | Growth, Ownership |
