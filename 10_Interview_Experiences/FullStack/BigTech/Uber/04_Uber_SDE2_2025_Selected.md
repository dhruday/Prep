# Uber — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | SDE-2 FullStack |
| **Level** | 5b |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Uber Eats |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + DSA + LLD + HLD + Behavioral)

---

## Round 1: DSA
**Duration:** 45 minutes

### Questions Asked
1. **Design Add and Search Words Data Structure** (LeetCode 211)
   - `addWord(word)` — adds word to structure
   - `search(word)` — returns true if match, `.` matches any single character

### 💡 Trie with Wildcard Search

```java
class WordDictionary {
    private final TrieNode root = new TrieNode();
    
    static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean isEnd;
    }
    
    void addWord(String word) {
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            int idx = c - 'a';
            if (node.children[idx] == null) {
                node.children[idx] = new TrieNode();
            }
            node = node.children[idx];
        }
        node.isEnd = true;
    }
    
    boolean search(String word) {
        return dfs(word, 0, root);
    }
    
    private boolean dfs(String word, int pos, TrieNode node) {
        if (node == null) return false;
        if (pos == word.length()) return node.isEnd;
        
        char c = word.charAt(pos);
        
        if (c == '.') {
            // Try all 26 children
            for (TrieNode child : node.children) {
                if (dfs(word, pos + 1, child)) return true;
            }
            return false;
        } else {
            return dfs(word, pos + 1, node.children[c - 'a']);
        }
    }
}
// Time: addWord O(L), search O(26^L) worst case with all dots, O(L) typical
// Space: O(N*L) where N = number of words
```

---

## Round 2: System Design (HLD)
**Duration:** 60 minutes

### Questions Asked
1. **Design Uber Eats Order & Delivery System**
   - Restaurant receives order → prepares → ready for pickup
   - Match delivery partner → assign → pick up → deliver
   - Real-time tracking for customer
   - ETA prediction (prep time + travel time)
   - Handle failures: restaurant cancel, driver cancel, no driver available

### 💡 Key Design

```
Architecture:
┌────────┐  ┌────────────┐  ┌──────────────┐  ┌────────────┐
│Customer │  │ Restaurant │  │ Delivery     │  │   Admin    │
│  App    │  │  Partner   │  │ Partner App  │  │  Dashboard │
└───┬─────┘  └──────┬─────┘  └──────┬───────┘  └──────┬─────┘
    │               │               │                  │
    ▼               ▼               ▼                  ▼
┌──────────────────────────────────────────────────────────┐
│                    API Gateway (Kong)                     │
│         Auth + Rate Limit + Request Routing               │
└──────┬────────────┬────────────────┬─────────────────────┘
       │            │                │
  ┌────▼────┐  ┌────▼──────┐   ┌────▼──────────┐
  │ Order   │  │Restaurant │   │  Delivery     │
  │ Service │  │ Service   │   │  Matching     │
  │         │  │           │   │  Service      │
  │ CRUD,   │  │ Menu,     │   │  - Proximity  │
  │ State   │  │ Accept/   │   │  - Batching   │
  │ Machine │  │ Prep Time │   │  - Assignment │
  └────┬────┘  └─────┬─────┘   └──────┬────────┘
       │             │                │
       ▼             ▼                ▼
  ┌─────────┐   ┌─────────┐    ┌───────────┐
  │PostgreSQL│   │PostgreSQL│    │Redis GeoDB│
  │(orders)  │   │(menus)  │    │(driver    │
  │          │   │         │    │ locations) │
  └──────────┘   └─────────┘    └───────────┘

Order State Machine:
PLACED → CONFIRMED(by restaurant) → PREPARING → READY_FOR_PICKUP
    ↓                                                ↓
  CANCELLED                           DRIVER_ASSIGNED → PICKED_UP → DELIVERED
                                           ↓
                                     DRIVER_REASSIGNED (if driver cancels)

Each state transition:
1. Persist to DB (event sourcing: order_events table)
2. Publish to Kafka topic (order.state_change)
3. Notify relevant parties (customer, restaurant, driver via push/WebSocket)

Delivery Matching Algorithm:
class DeliveryMatcher {
    Driver findBestDriver(Order order, Location restaurantLoc) {
        // 1. Find available drivers within 5km radius
        List<Driver> nearby = redis.geoRadius("drivers:available",
            restaurantLoc.lng, restaurantLoc.lat, 5, "km", 20);
        
        if (nearby.isEmpty()) {
            // Expand radius to 10km, then 15km
            nearby = redis.geoRadius("drivers:available",
                restaurantLoc.lng, restaurantLoc.lat, 10, "km", 30);
        }
        
        // 2. Score each driver
        return nearby.stream()
            .map(driver -> {
                double distScore = 1.0 / (1 + haversineDistance(driver.location, restaurantLoc));
                double ratingScore = driver.rating / 5.0;
                double acceptScore = driver.acceptanceRate;
                double batchScore = canBatch(driver, order) ? 0.2 : 0;
                
                double score = distScore * 0.4 
                             + ratingScore * 0.2 
                             + acceptScore * 0.2 
                             + batchScore * 0.2;
                
                return new ScoredDriver(driver, score);
            })
            .max(Comparator.comparingDouble(ScoredDriver::score))
            .map(ScoredDriver::driver)
            .orElse(null);
    }
    
    // Batch: driver already picking up from same restaurant
    boolean canBatch(Driver driver, Order order) {
        return driver.activeOrders.stream()
            .anyMatch(o -> o.restaurantId.equals(order.restaurantId)
                        && o.status == OrderStatus.READY_FOR_PICKUP);
    }
}

ETA Prediction:
- prep_time: ML model trained on restaurant historical data
  Features: order_items, restaurant_load, time_of_day, day_of_week
  
- travel_time: Google Maps Distance Matrix API / internal routing
  Adjust for: traffic conditions, weather, construction
  
- total_eta = prep_time + driver_to_restaurant_time + restaurant_to_customer_time
  Update every 30s as driver moves

Failure Handling:
| Failure | Action |
|---------|--------|
| Restaurant cancels | Full refund + promo code, suggest alternatives |
| Driver cancels | Reassign (pool of backup drivers), extend ETA |
| No driver for 5min | Auto-cancel option, offer higher payout to drivers |
| Food quality issue | Photo evidence → partial/full refund |
| Driver no-show at restaurant | 5-min timer → reassign + penalty |

Scale:
- 10M orders/day, 500K concurrent orders
- Driver location updates: 500K WebSocket connections
- Event sourcing: 100M events/day → Kafka → analytics
- Redis GEO: sub-millisecond proximity queries
```

---

## 🎯 Key Takeaways
- Uber Eats = **order lifecycle + matching + real-time tracking + failure handling**
- **Trie with wildcard**: DFS branching on `.` wildcard — 26 children tried
- **Order state machine**: explicit states with event sourcing for audit + analytics
- **Driver matching**: multi-factor scoring (distance 40% + rating 20% + acceptance 20% + batch bonus 20%)
- **Batching**: assign driver already heading to same restaurant — increases efficiency by 30%
- **ETA = prep_time(ML) + travel_time(routing)**: update every 30s
- **Redis GEORADIUS**: find nearby drivers in < 1ms — critical for matching latency
- Uber values: **reliability**, build for failure, customer obsession

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA | Medium | Trie, Wildcard Search |
| LLD | Medium-Hard | Order State Machine, Event Sourcing |
| HLD | Hard | Delivery Matching, ETA, Real-Time |
| Behavioral | Medium | Uber Values, Conflict Resolution |
