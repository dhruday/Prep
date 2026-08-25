# Amazon — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Software Development Engineer 2 |
| **Level** | L5 |
| **YOE** | 4 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical/LP + Bar Raiser)
- **Timeline:** 2.5 weeks from OA to offer
- **Format:** OA online, then onsite at Hyderabad office
- **Key:** Amazon heavily weights Leadership Principles (LP) — every round has LP questions

---

## Round 1: Online Assessment
**Duration:** 90 minutes | **Platform:** HackerRank

### Questions Asked
1. **Trapping Rain Water** (LeetCode 42)
2. **Rotting Oranges** (LeetCode 994)

### 💡 Interview-Ready Answer — Trapping Rain Water

**Approach: Two Pointer (Optimal)**
```java
public int trap(int[] height) {
    int left = 0, right = height.length - 1;
    int leftMax = 0, rightMax = 0;
    int water = 0;
    
    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) {
                leftMax = height[left];
            } else {
                water += leftMax - height[left];
            }
            left++;
        } else {
            if (height[right] >= rightMax) {
                rightMax = height[right];
            } else {
                water += rightMax - height[right];
            }
            right--;
        }
    }
    return water;
}
```
**Time:** O(n), **Space:** O(1)

### 💡 Interview-Ready Answer — Rotting Oranges

**Approach: Multi-source BFS**
```java
public int orangesRotting(int[][] grid) {
    int rows = grid.length, cols = grid[0].length;
    Queue<int[]> queue = new LinkedList<>();
    int fresh = 0;
    
    // Find all initially rotten oranges and count fresh
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            if (grid[i][j] == 2) queue.offer(new int[]{i, j});
            else if (grid[i][j] == 1) fresh++;
        }
    }
    
    if (fresh == 0) return 0;
    
    int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}};
    int minutes = 0;
    
    while (!queue.isEmpty() && fresh > 0) {
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            int[] cell = queue.poll();
            for (int[] dir : dirs) {
                int ni = cell[0] + dir[0], nj = cell[1] + dir[1];
                if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && grid[ni][nj] == 1) {
                    grid[ni][nj] = 2;
                    fresh--;
                    queue.offer(new int[]{ni, nj});
                }
            }
        }
        minutes++;
    }
    
    return fresh == 0 ? minutes : -1;
}
```
**Time:** O(m*n), **Space:** O(m*n)

---

## Round 2: DSA + Leadership Principles
**Duration:** 60 minutes | **Interviewer:** SDE-2

### Questions Asked
1. **Merge Intervals** (LeetCode 56)
2. **LP: "Tell me about a time you delivered results under pressure"** (Customer Obsession + Deliver Results)

### 💡 Interview-Ready Answer — Merge Intervals

```java
public int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
    List<int[]> merged = new ArrayList<>();
    
    for (int[] interval : intervals) {
        if (merged.isEmpty() || merged.get(merged.size() - 1)[1] < interval[0]) {
            merged.add(interval);
        } else {
            merged.get(merged.size() - 1)[1] = Math.max(
                merged.get(merged.size() - 1)[1], interval[1]);
        }
    }
    
    return merged.toArray(new int[0][]);
}
```
**Time:** O(n log n), **Space:** O(n)

### 💡 LP Answer — Deliver Results Under Pressure

**Situation:** During our B2C launch, we discovered a critical payment gateway bug 3 days before go-live. Our payment service was dropping 8% of checkout requests under load — the vendor's webhook was timing out after 5 seconds, and our retry logic was creating duplicate charges.

**Task:** Fix the payment reliability issue and hit the launch date. $2M in projected first-month revenue was at stake.

**Action:**
1. **Triaged immediately** — set up a war room with 3 engineers, mapped the failure modes in 2 hours
2. **Implemented idempotency keys** using a Redis-backed dedup layer — unique key per checkout, 24-hour TTL
3. **Added circuit breaker** (Resilience4j) with fallback to a secondary payment processor
4. **Extended webhook timeout to 15s** and made processing async — webhooks enqueue to SQS, processed asynchronously
5. **Load tested** at 3x expected traffic — zero duplicates, 99.97% success rate

**Result:** Launched on time. Zero duplicate charges in first month. Payment success rate improved from 92% to 99.8%. Saved an estimated $160K in potential chargebacks.

> **What interviewers look for:** Quantified impact, systematic debugging, not just heroic effort.

---

## Round 3: DSA + LP
**Duration:** 60 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Word Break II** (LeetCode 140) — Return all possible sentences
2. **LP: "Tell me about a time you dived deep into a technical decision"** (Dive Deep)

### 💡 Interview-Ready Answer — Word Break II

```java
public List<String> wordBreak(String s, List<String> wordDict) {
    Set<String> dict = new HashSet<>(wordDict);
    Map<Integer, List<String>> memo = new HashMap<>();
    return dfs(s, 0, dict, memo);
}

private List<String> dfs(String s, int start, Set<String> dict, Map<Integer, List<String>> memo) {
    if (memo.containsKey(start)) return memo.get(start);
    
    List<String> result = new ArrayList<>();
    
    if (start == s.length()) {
        result.add("");
        return result;
    }
    
    for (int end = start + 1; end <= s.length(); end++) {
        String word = s.substring(start, end);
        if (dict.contains(word)) {
            List<String> rest = dfs(s, end, dict, memo);
            for (String sub : rest) {
                result.add(word + (sub.isEmpty() ? "" : " " + sub));
            }
        }
    }
    
    memo.put(start, result);
    return result;
}
```
**Time:** O(n * 2^n) worst case (exponential sentences), **Space:** O(n * 2^n) for memoization

### 💡 LP Answer — Dive Deep

**Situation:** Our API response time suddenly spiked from 80ms P99 to 3 seconds, but only for 5% of users. Standard monitoring showed healthy CPU/memory. Infra team said "it's not us."

**Task:** Root cause the latency spike that was degrading experience for our premium (highest revenue) users.

**Action:**
1. **Correlated** the affected users — all were premium users with 10K+ items in their feed
2. **Profiled** with async-profiler — found that our ORM was generating N+1 queries for nested entities (feed items → comments → user profiles)
3. **Traced** the SQL — premium users hit a DB partition that was experiencing lock contention from a batch job running at the same time
4. **Root cause:** A cron job (user analytics aggregation) was locking rows in the `user_activity` table during its 20-min window, and premium users' queries joined against the same table
5. **Fix:** (a) Moved analytics job to a read replica, (b) Added `@BatchSize(50)` annotation to prevent N+1, (c) Added partition-level monitoring alerts

**Result:** P99 for premium users dropped from 3s to 65ms. Identified and documented 4 other potential N+1 patterns across the codebase. Led a "query hygiene" initiative across 3 teams.

---

## Round 4: System Design
**Duration:** 60 minutes | **Interviewer:** Principal SDE

### Questions Asked
1. **Design Amazon's Order Tracking System**
   - Real-time order status updates
   - Push notifications
   - 10M orders/day scale

### 💡 Interview-Ready Answer

#### Requirements
**Functional:**
- Track order status: Placed → Confirmed → Shipped → Out-for-Delivery → Delivered
- Real-time status updates (< 30s delay)
- Push/SMS/Email notifications at each status change
- Live map tracking for last-mile delivery
- Estimated delivery time (ETA) with updates

**Non-Functional:**
- 10M orders/day = ~115 orders/sec avg, 500/sec peak
- Each order has ~8-12 status updates = ~100M events/day
- Read:Write ratio = 50:1 (users check status frequently)
- 99.99% availability

#### Architecture
```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  Seller/     │     │  Delivery    │     │  Warehouse           │
│  Warehouse   │     │  Partner     │     │  Management          │
│  System      │     │  App (GPS)   │     │  System              │
└──────┬───────┘     └──────┬───────┘     └──────────┬───────────┘
       │                    │                         │
       ▼                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Event Ingestion (Kafka)                       │
│  Topic: order-status-updates                                    │
│  Partitioned by: order_id (ordering guaranteed per order)       │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │  Status      │ │ Notification │ │ Analytics    │
     │  Processor   │ │ Service      │ │ Pipeline     │
     │  (Update DB) │ │ (Push/SMS/   │ │ (Flink)      │
     │              │ │  Email)      │ │              │
     └──────┬───────┘ └──────────────┘ └──────────────┘
            │
            ▼
     ┌──────────────┐     ┌──────────────┐
     │  DynamoDB    │────▶│  Redis Cache  │
     │  (Orders +   │     │  (Hot orders  │
     │   Status     │     │   last 24h)   │
     │   History)   │     └──────────────┘
     └──────────────┘            │
                                  ▼
                         ┌──────────────┐     ┌──────────┐
                         │  Order API   │◀────│  Customer │
                         │  (GraphQL)   │     │  App      │
                         └──────────────┘     └──────────┘
```

#### Database Design (DynamoDB)
```
Table: Orders
  PK: order_id
  Attributes: user_id, status, created_at, updated_at, delivery_partner_id, 
              estimated_delivery, items[], shipping_address

Table: OrderStatusHistory  
  PK: order_id
  SK: timestamp#event_type
  Attributes: status, location, notes, actor

GSI: UserOrders
  PK: user_id  SK: created_at

Table: LiveTracking
  PK: order_id
  Attributes: lat, lng, speed, heading, last_updated (TTL: 24h)
```

#### Real-Time Tracking (Last Mile)
- Delivery partner app sends GPS coordinates every 10 seconds
- Stored in Redis (key: `tracking:{order_id}`, value: `{lat, lng, ts}`, TTL: 24h)
- Client polls every 15s OR uses WebSocket for live updates
- ETA calculated using: distance remaining / average speed, adjusted for traffic (Google Maps API)

#### Scale Considerations
- **DynamoDB:** Auto-scales, pay-per-request. 10M orders/day easily handled.
- **Kafka:** 3 brokers, 12 partitions for order-status topic. ~1200 msg/sec at peak.
- **Redis:** 10M active orders * 200 bytes = ~2GB. Single Redis instance sufficient.
- **Notifications:** SQS → Lambda for email/SMS. SNS for push. Batch processing for non-urgent (email summaries).

---

## Round 5: Bar Raiser
**Duration:** 60 minutes | **Interviewer:** Principal SDE (different team)

### Questions Asked
1. **LP: "Tell me about a time you earned trust"** (Earn Trust)
2. **LP: "Describe a time you disagreed and committed"** (Have Backbone; Disagree and Commit)
3. **LLD: Design a Parking Lot System**

### 💡 LP Answer — Earn Trust

**Situation:** Joined a new team where the existing codebase had zero test coverage. The team (5 senior engineers) considered tests "wasteful overhead" and was resistant to change.

**Task:** Introduce testing culture without alienating the team or becoming "that person."

**Action:**
1. **Started with myself** — wrote tests for my own PRs, no lectures
2. **Caught a production bug** via a new unit test within first 2 weeks — shared the save in standup casually
3. **Created a test-writing guide** specific to our codebase — made it easy, not theoretical
4. **Offered to pair-program** on tests with willing teammates — 2 of 5 volunteered
5. **Set up CI pipeline** with coverage reporting — visibility without enforcement

**Result:** Test coverage went from 0% to 45% in 3 months. Team adopted testing voluntarily. Production incidents dropped 60% (from 5/month to 2/month). I was given the team's internal "Impact Award."

### 💡 LLD — Parking Lot System

```java
// Enums
enum VehicleType { MOTORCYCLE, CAR, TRUCK }
enum SpotSize { SMALL, MEDIUM, LARGE }
enum SpotStatus { AVAILABLE, OCCUPIED, RESERVED }

// Core Entities
class Vehicle {
    String licensePlate;
    VehicleType type;
    LocalDateTime entryTime;
}

class ParkingSpot {
    String spotId;
    SpotSize size;
    SpotStatus status;
    int floor;
    Vehicle currentVehicle;
    
    boolean canFit(Vehicle vehicle) {
        return switch (vehicle.type) {
            case MOTORCYCLE -> true;  // fits any spot
            case CAR -> size != SpotSize.SMALL;
            case TRUCK -> size == SpotSize.LARGE;
        };
    }
    
    void park(Vehicle vehicle) {
        if (!canFit(vehicle)) throw new IllegalArgumentException("Vehicle doesn't fit");
        this.currentVehicle = vehicle;
        this.status = SpotStatus.OCCUPIED;
    }
    
    void release() {
        this.currentVehicle = null;
        this.status = SpotStatus.AVAILABLE;
    }
}

class ParkingFloor {
    int floorNumber;
    List<ParkingSpot> spots;
    
    ParkingSpot findAvailableSpot(VehicleType type) {
        return spots.stream()
            .filter(s -> s.status == SpotStatus.AVAILABLE)
            .filter(s -> s.canFit(new Vehicle() {{ this.type = type; }}))
            .findFirst()
            .orElse(null);
    }
}

class ParkingLot {
    String name;
    List<ParkingFloor> floors;
    Map<String, ParkingTicket> activeTickets; // licensePlate → ticket
    PricingStrategy pricingStrategy;
    
    synchronized ParkingTicket parkVehicle(Vehicle vehicle) {
        for (ParkingFloor floor : floors) {
            ParkingSpot spot = floor.findAvailableSpot(vehicle.type);
            if (spot != null) {
                spot.park(vehicle);
                ParkingTicket ticket = new ParkingTicket(vehicle, spot);
                activeTickets.put(vehicle.licensePlate, ticket);
                return ticket;
            }
        }
        throw new ParkingFullException("No spots available");
    }
    
    Payment unparkVehicle(String licensePlate) {
        ParkingTicket ticket = activeTickets.remove(licensePlate);
        if (ticket == null) throw new IllegalArgumentException("Vehicle not found");
        ticket.spot.release();
        Duration duration = Duration.between(ticket.entryTime, LocalDateTime.now());
        double amount = pricingStrategy.calculate(ticket.vehicle.type, duration);
        return new Payment(amount, ticket);
    }
}

class ParkingTicket {
    String ticketId;
    Vehicle vehicle;
    ParkingSpot spot;
    LocalDateTime entryTime;
    
    ParkingTicket(Vehicle vehicle, ParkingSpot spot) {
        this.ticketId = UUID.randomUUID().toString();
        this.vehicle = vehicle;
        this.spot = spot;
        this.entryTime = LocalDateTime.now();
    }
}

// Strategy Pattern for pricing
interface PricingStrategy {
    double calculate(VehicleType type, Duration duration);
}

class HourlyPricing implements PricingStrategy {
    Map<VehicleType, Double> rates = Map.of(
        VehicleType.MOTORCYCLE, 10.0,
        VehicleType.CAR, 20.0,
        VehicleType.TRUCK, 40.0
    );
    
    public double calculate(VehicleType type, Duration duration) {
        long hours = Math.max(1, (long) Math.ceil(duration.toMinutes() / 60.0));
        return hours * rates.get(type);
    }
}
```

**Design Patterns Used:**
- **Strategy Pattern** — Pricing (hourly, flat-rate, dynamic)
- **Observer Pattern** — Notify display boards when spot status changes
- **Singleton** — ParkingLot instance (if single lot)

---

## 🎯 Key Takeaways
- Amazon LP stories are **mandatory** — prepare 10-12 stories mapped to all 16 LPs
- **Bar Raiser** assesses culture fit across all LPs — they can veto a hire
- System design at Amazon expects **AWS services** — use DynamoDB, SQS, SNS, Lambda, Kafka (MSK)
- LLD problems need **runnable code** with proper OOP — not just class diagrams
- Every answer should end with **measurable results** — Amazon is metrics-obsessed

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium-Hard | Two Pointers, BFS |
| Round 2 | Medium | Sorting, Intervals, LP |
| Round 3 | Hard | DFS + Memoization, LP |
| Round 4 | Hard | Event-Driven Architecture, DynamoDB, Kafka |
| Round 5 | Medium | OOP, Design Patterns, LP |
