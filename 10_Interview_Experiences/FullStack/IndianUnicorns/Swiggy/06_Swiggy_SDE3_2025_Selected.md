# Swiggy — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | Senior Backend Engineer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Logistics |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + LLD + System Design + HM)

---

## Round 2: LLD — Design a Real-Time Delivery Assignment Engine
**Duration:** 60 minutes

### Challenge: Design the system that assigns delivery partners to orders in real-time, considering proximity, current load, delivery partner preferences, and restaurant preparation time.

```java
import java.util.*;
import java.util.concurrent.*;

/**
 * Real-Time Delivery Assignment Engine:
 * 
 * When a new order is confirmed:
 * 1. Wait for restaurant to start preparation (don't assign too early)
 * 2. Find available delivery partners within radius
 * 3. Score candidates based on multiple factors
 * 4. Broadcast to top candidates
 * 5. First to accept gets the assignment
 * 6. If no acceptance within timeout → expand radius and retry
 * 
 * Key design decisions:
 * - Score-based ranking (not pure proximity) for better utilization
 * - Broadcast to top N (not just top 1) to reduce assignment latency
 * - Re-queue mechanism for unassigned orders
 */

// ---- Enums and Value Objects ----

enum OrderStatus { CONFIRMED, PREPARING, AWAITING_PICKUP, OUT_FOR_DELIVERY, DELIVERED }
enum PartnerStatus { AVAILABLE, BUSY, OFFLINE }

class Location {
    final double lat, lng;
    Location(double lat, double lng) { this.lat = lat; this.lng = lng; }
    
    double distanceKm(Location other) {
        double R = 6371;
        double dLat = Math.toRadians(other.lat - this.lat);
        double dLng = Math.toRadians(other.lng - this.lng);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(Math.toRadians(this.lat)) * Math.cos(Math.toRadians(other.lat)) *
                   Math.sin(dLng/2) * Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
}

class DeliveryPartner {
    String id;
    String name;
    Location currentLocation;
    PartnerStatus status;
    int currentOrderCount; // For batching (max 2-3 simultaneous)
    double rating; // 1-5
    int totalDeliveries;
    Set<String> preferredZones; // Zone IDs partner prefers
    long lastOrderTimestamp; // For fair distribution
}

class Order {
    String id;
    OrderStatus status;
    Location restaurantLocation;
    Location customerLocation;
    String restaurantId;
    long prepTimeEstimateMs; // Estimated prep time from restaurant
    long createdAt;
    int assignmentAttempts;
    String assignedPartnerId;
}

// ---- Scoring Engine ----

class AssignmentScorer {
    
    /**
     * Score a delivery partner for a given order.
     * Higher score = better match.
     * 
     * Factors:
     * 1. Proximity (40%): distance from partner to restaurant
     * 2. Load balance (25%): prefer partners with fewer current orders
     * 3. Rating (15%): higher-rated partners prioritized for premium orders
     * 4. Fairness (10%): prefer partners who haven't had orders recently
     * 5. Zone preference (10%): bonus if partner prefers this zone
     */
    public double score(DeliveryPartner partner, Order order) {
        double proximityScore = proximityScore(partner, order);
        double loadScore = loadBalanceScore(partner);
        double ratingScore = partner.rating / 5.0;
        double fairnessScore = fairnessScore(partner);
        double zoneScore = zonePreferenceScore(partner, order);
        
        return 0.40 * proximityScore +
               0.25 * loadScore +
               0.15 * ratingScore +
               0.10 * fairnessScore +
               0.10 * zoneScore;
    }
    
    private double proximityScore(DeliveryPartner partner, Order order) {
        double distKm = partner.currentLocation.distanceKm(order.restaurantLocation);
        // Sigmoid-like: 1.0 at 0km, ~0.5 at 3km, ~0.1 at 8km
        return 1.0 / (1.0 + Math.exp((distKm - 3.0) / 1.5));
    }
    
    private double loadBalanceScore(DeliveryPartner partner) {
        // 0 orders = 1.0, 1 order = 0.5, 2+ orders = 0.1
        return switch (partner.currentOrderCount) {
            case 0 -> 1.0;
            case 1 -> 0.5;
            default -> 0.1;
        };
    }
    
    private double fairnessScore(DeliveryPartner partner) {
        // Longer since last order = higher priority
        long minutesSinceLastOrder = (System.currentTimeMillis() - partner.lastOrderTimestamp) / 60000;
        return Math.min(1.0, minutesSinceLastOrder / 30.0); // Max out at 30 min
    }
    
    private double zonePreferenceScore(DeliveryPartner partner, Order order) {
        // Would need zone lookup — simplified here
        return 0.5; // Default neutral score
    }
}

// ---- Assignment Engine ----

class DeliveryAssignmentEngine {
    
    private final ConcurrentHashMap<String, DeliveryPartner> partners = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Order> pendingOrders = new ConcurrentHashMap<>();
    private final AssignmentScorer scorer = new AssignmentScorer();
    
    // Configuration
    private static final double INITIAL_RADIUS_KM = 3.0;
    private static final double MAX_RADIUS_KM = 10.0;
    private static final int BROADCAST_TO_TOP_N = 3;
    private static final long ACCEPTANCE_TIMEOUT_MS = 30_000; // 30 seconds
    private static final int MAX_ASSIGNMENT_ATTEMPTS = 3;
    
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    
    /**
     * Main entry point: assign a delivery partner to an order.
     * Called when order status changes to PREPARING.
     */
    public void assignOrder(Order order) {
        double radius = INITIAL_RADIUS_KM;
        order.assignmentAttempts++;
        
        // Find available partners within radius
        List<DeliveryPartner> candidates = findCandidates(order, radius);
        
        if (candidates.isEmpty()) {
            // Expand radius and retry
            if (radius < MAX_RADIUS_KM) {
                radius = Math.min(radius * 1.5, MAX_RADIUS_KM);
                candidates = findCandidates(order, radius);
            }
            
            if (candidates.isEmpty()) {
                // Schedule retry after 60 seconds
                if (order.assignmentAttempts < MAX_ASSIGNMENT_ATTEMPTS) {
                    scheduler.schedule(() -> assignOrder(order), 60, TimeUnit.SECONDS);
                    pendingOrders.put(order.id, order);
                } else {
                    // Escalate to manual assignment
                    escalateToOps(order);
                }
                return;
            }
        }
        
        // Score and rank candidates
        candidates.sort((a, b) -> Double.compare(
            scorer.score(b, order), scorer.score(a, order)
        ));
        
        // Broadcast to top N
        List<DeliveryPartner> topCandidates = candidates.subList(
            0, Math.min(BROADCAST_TO_TOP_N, candidates.size())
        );
        
        broadcastAssignmentRequest(order, topCandidates);
    }
    
    private List<DeliveryPartner> findCandidates(Order order, double radiusKm) {
        return partners.values().stream()
            .filter(p -> p.status == PartnerStatus.AVAILABLE || 
                         (p.status == PartnerStatus.BUSY && p.currentOrderCount < 2))
            .filter(p -> p.currentLocation.distanceKm(order.restaurantLocation) <= radiusKm)
            .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * Send assignment request to top candidates.
     * First to accept wins.
     */
    private void broadcastAssignmentRequest(Order order, List<DeliveryPartner> candidates) {
        // In production: push notification via FCM/APNS
        // Here: simulate with CompletableFuture + timeout
        
        // Set acceptance timeout
        scheduler.schedule(() -> {
            if (order.assignedPartnerId == null) {
                // No one accepted — retry with expanded radius
                assignOrder(order);
            }
        }, ACCEPTANCE_TIMEOUT_MS, TimeUnit.MILLISECONDS);
    }
    
    /**
     * Called when a delivery partner accepts the order.
     * Must be atomic — only first acceptance wins.
     */
    public synchronized boolean acceptOrder(String orderId, String partnerId) {
        Order order = pendingOrders.get(orderId);
        if (order == null || order.assignedPartnerId != null) {
            return false; // Already assigned or doesn't exist
        }
        
        DeliveryPartner partner = partners.get(partnerId);
        if (partner == null || (partner.status == PartnerStatus.BUSY && partner.currentOrderCount >= 2)) {
            return false;
        }
        
        // Assign
        order.assignedPartnerId = partnerId;
        order.status = OrderStatus.AWAITING_PICKUP;
        partner.currentOrderCount++;
        partner.lastOrderTimestamp = System.currentTimeMillis();
        if (partner.currentOrderCount > 0) partner.status = PartnerStatus.BUSY;
        
        pendingOrders.remove(orderId);
        
        return true;
    }
    
    private void escalateToOps(Order order) {
        // Send alert to operations team for manual assignment
        System.out.println("ESCALATE: Order " + order.id + " needs manual assignment");
    }
}
```

---

## 🎯 Key Takeaways
- Swiggy SDE-3 = **Delivery assignment engine LLD with scoring, broadcast, retry**
- **Multi-factor scoring**: proximity(40%) + load(25%) + rating(15%) + fairness(10%) + zone(10%) — weighted composite
- **Proximity sigmoid**: `1/(1 + exp((dist-3)/1.5))` — smooth falloff centered at 3km
- **Broadcast top N**: send to top 3 candidates, first-accept-wins — reduces assignment latency vs sequential offers
- **Retry with radius expansion**: 3km → 4.5km → 6.75km → 10km max — geometric expansion
- **Atomic acceptance**: `synchronized acceptOrder()` — only one partner can win the race
- **Fairness**: partners idle longer get higher priority — prevents starvation
- **Batching**: partners can handle up to 2 simultaneous orders — load score penalizes busy partners
- Swiggy = **hyperlocal delivery logistics** — assignment, routing, ETA prediction, driver incentives

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| LLD | Very Hard | Assignment Engine, Scoring, Concurrency |
| System Design | Very Hard | Delivery Platform at Scale |
| HM | Medium | Culture Fit |
