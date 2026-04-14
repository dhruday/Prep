# Swiggy — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience-for-sde-2/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + DSA + HLD)
- **Timeline:** 2 weeks
- **Format:** Virtual rounds
- **Note:** Swiggy has a strong Machine Coding + LLD focus

---

## Round 1: Online Assessment
**Duration:** 90 minutes | **Platform:** HackerRank

### Questions Asked
1. **Array Merge — Minimize Final Sum**
   - Given array, repeatedly pick 2 nums, sum them, push back. Minimize final number.
2. **Longest Substring Without Repeating Characters** (LeetCode 3)

### 💡 Interview-Ready Answer — Minimize Final Sum

**Key Insight:** Always merge the two smallest numbers first → Min-Heap (Greedy, same as Huffman encoding idea)

```java
public int minimizeCost(int[] arr) {
    PriorityQueue<Integer> minHeap = new PriorityQueue<>();
    for (int num : arr) minHeap.offer(num);
    
    int totalCost = 0;
    while (minHeap.size() > 1) {
        int first = minHeap.poll();
        int second = minHeap.poll();
        int sum = first + second;
        totalCost += sum;
        minHeap.offer(sum);
    }
    return totalCost;
}
```
**Time:** O(n log n), **Space:** O(n)

### 💡 Interview-Ready Answer — Longest Substring Without Repeating

```java
public int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> lastSeen = new HashMap<>();
    int maxLen = 0, left = 0;
    
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        if (lastSeen.containsKey(c) && lastSeen.get(c) >= left) {
            left = lastSeen.get(c) + 1;
        }
        lastSeen.put(c, right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}
```
**Time:** O(n), **Space:** O(min(n, charset))

---

## Round 2: Machine Coding
**Duration:** 90 minutes + 30 min discussion | **Interviewer:** SDE-3

### Questions Asked
1. **Design a Hotel Room Booking System (like OYO)**
   - CRUD rooms, search by date/city/type, book rooms, handle conflicts

### 💡 Interview-Ready Answer

```java
enum RoomType { STANDARD, DELUXE, SUITE }
enum BookingStatus { CONFIRMED, CANCELLED, CHECKED_IN, CHECKED_OUT }

class Room {
    String roomId;
    String hotelId;
    RoomType type;
    double pricePerNight;
    int capacity;
    boolean isActive;
    
    Room(String hotelId, RoomType type, double price, int capacity) {
        this.roomId = UUID.randomUUID().toString().substring(0, 8);
        this.hotelId = hotelId;
        this.type = type;
        this.pricePerNight = price;
        this.capacity = capacity;
        this.isActive = true;
    }
}

class Booking {
    String bookingId;
    String roomId;
    String userId;
    LocalDate checkIn;
    LocalDate checkOut;
    BookingStatus status;
    double totalPrice;
    
    Booking(String roomId, String userId, LocalDate checkIn, LocalDate checkOut, double pricePerNight) {
        this.bookingId = "BK-" + UUID.randomUUID().toString().substring(0, 8);
        this.roomId = roomId;
        this.userId = userId;
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.status = BookingStatus.CONFIRMED;
        this.totalPrice = ChronoUnit.DAYS.between(checkIn, checkOut) * pricePerNight;
    }
}

class Hotel {
    String hotelId;
    String name;
    String city;
    List<Room> rooms;
    
    Hotel(String name, String city) {
        this.hotelId = UUID.randomUUID().toString().substring(0, 8);
        this.name = name;
        this.city = city;
        this.rooms = new ArrayList<>();
    }
    
    Room addRoom(RoomType type, double price, int capacity) {
        Room room = new Room(hotelId, type, price, capacity);
        rooms.add(room);
        return room;
    }
}

class BookingService {
    Map<String, Hotel> hotels = new HashMap<>();
    Map<String, Room> rooms = new HashMap<>();
    Map<String, Booking> bookings = new HashMap<>();
    // Index: roomId → sorted set of bookings (by check-in date)
    Map<String, TreeMap<LocalDate, Booking>> roomBookings = new HashMap<>();
    // Index: city → hotelIds
    Map<String, Set<String>> cityIndex = new HashMap<>();
    
    // Search available rooms
    List<Room> searchAvailableRooms(String city, LocalDate checkIn, LocalDate checkOut, 
                                     RoomType type, int guests) {
        Set<String> hotelIds = cityIndex.getOrDefault(city, Collections.emptySet());
        List<Room> available = new ArrayList<>();
        
        for (String hotelId : hotelIds) {
            Hotel hotel = hotels.get(hotelId);
            for (Room room : hotel.rooms) {
                if (room.type == type && room.capacity >= guests && room.isActive) {
                    if (isAvailable(room.roomId, checkIn, checkOut)) {
                        available.add(room);
                    }
                }
            }
        }
        
        // Sort by price ascending
        available.sort(Comparator.comparingDouble(r -> r.pricePerNight));
        return available;
    }
    
    // Check room availability (no overlapping bookings)
    boolean isAvailable(String roomId, LocalDate checkIn, LocalDate checkOut) {
        TreeMap<LocalDate, Booking> bookingMap = roomBookings.get(roomId);
        if (bookingMap == null || bookingMap.isEmpty()) return true;
        
        // Find bookings that might overlap
        // Overlap: existing.checkIn < checkOut AND existing.checkOut > checkIn
        Map.Entry<LocalDate, Booking> floor = bookingMap.floorEntry(checkOut.minusDays(1));
        
        // Check all bookings in the range
        NavigableMap<LocalDate, Booking> candidates = bookingMap.headMap(checkOut, false);
        for (Booking existing : candidates.values()) {
            if (existing.status != BookingStatus.CANCELLED 
                && existing.checkOut.isAfter(checkIn) 
                && existing.checkIn.isBefore(checkOut)) {
                return false; // overlap found
            }
        }
        return true;
    }
    
    // Book a room (synchronized to prevent double booking)
    synchronized Booking bookRoom(String roomId, String userId, LocalDate checkIn, LocalDate checkOut) {
        if (!isAvailable(roomId, checkIn, checkOut)) {
            throw new IllegalStateException("Room not available for selected dates");
        }
        
        Room room = rooms.get(roomId);
        Booking booking = new Booking(roomId, userId, checkIn, checkOut, room.pricePerNight);
        bookings.put(booking.bookingId, booking);
        roomBookings.computeIfAbsent(roomId, k -> new TreeMap<>()).put(checkIn, booking);
        return booking;
    }
    
    // Cancel booking
    void cancelBooking(String bookingId) {
        Booking booking = bookings.get(bookingId);
        if (booking == null) throw new IllegalArgumentException("Booking not found");
        booking.status = BookingStatus.CANCELLED;
        // Don't remove from index — isAvailable checks status
    }
}
```

**Discussion Points (30 min):**
- **Concurrency:** `synchronized` on bookRoom prevents double booking. In production, use DB-level locks or optimistic concurrency (version column).
- **Scalability:** TreeMap per room → O(log n) availability check. For cityIndex, could use geohashing for proximity search.
- **Extensibility:** Add pricing strategies (weekday/weekend, seasonal), room amenities filter, guest ratings.

---

## Round 3: DSA
**Duration:** 60 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Minimum Platforms Required** (Train arrival/departure)
2. **Kth Smallest Element in BST** (LeetCode 230)
3. **Jump Game II** (LeetCode 45)

### 💡 Interview-Ready Answer — Minimum Platforms

```java
public int minPlatforms(int[] arrivals, int[] departures) {
    Arrays.sort(arrivals);
    Arrays.sort(departures);
    
    int platforms = 0, maxPlatforms = 0;
    int i = 0, j = 0;
    
    while (i < arrivals.length) {
        if (arrivals[i] <= departures[j]) {
            platforms++;
            maxPlatforms = Math.max(maxPlatforms, platforms);
            i++;
        } else {
            platforms--;
            j++;
        }
    }
    return maxPlatforms;
}
```
**Time:** O(n log n), **Space:** O(1)

### 💡 Interview-Ready Answer — Jump Game II

```java
public int jump(int[] nums) {
    int jumps = 0, currentEnd = 0, farthest = 0;
    
    for (int i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        
        if (i == currentEnd) {
            jumps++;
            currentEnd = farthest;
            if (currentEnd >= nums.length - 1) break;
        }
    }
    return jumps;
}
```
**Time:** O(n), **Space:** O(1)

---

## Round 4: System Design — HLD
**Duration:** 60 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **Design Swiggy's Food Delivery System**
   - Order placement, restaurant matching, delivery assignment, real-time tracking

### 💡 Interview-Ready Answer

#### Architecture
```
┌──────────┐          ┌──────────────┐          ┌──────────────┐
│  Customer │          │  Restaurant  │          │  Delivery    │
│  App      │          │  App         │          │  Partner App │
└─────┬────┘          └──────┬───────┘          └──────┬───────┘
      │                      │                         │
      ▼                      ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (Kong/Envoy)                      │
│    Auth · Rate Limiting · Request Routing · Circuit Breaking     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Order       │     │  Restaurant  │     │  Delivery    │
│  Service     │     │  Service     │     │  Service     │
│              │     │              │     │              │
│ - Create     │     │ - Menu mgmt  │     │ - Assignment │
│ - Track      │     │ - Accept/    │     │ - Routing    │
│ - Cancel     │     │   Reject     │     │ - Tracking   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│                     Event Bus (Kafka)                          │
│  Topics: order-events, restaurant-events, delivery-events,    │
│          location-updates, notification-events                 │
└──────────────────────────────────────────────────────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────┐  ┌──────────────┐     ┌──────────────┐
│  PostgreSQL  │  │  Redis       │     │  MongoDB     │
│  (Orders,    │  │  (Sessions,  │     │  (Menus,     │
│   Users)     │  │   Locations, │     │   Restaurants │
│              │  │   Caching)   │     │   Catalog)   │
└──────────────┘  └──────────────┘     └──────────────┘
```

#### Order Flow State Machine
```
PLACED → CONFIRMED (restaurant accepts)
       → REJECTED (restaurant rejects → refund)
       
CONFIRMED → PREPARING (restaurant starts cooking)
          → CANCELLED (customer cancels → partial/full refund)
          
PREPARING → READY_FOR_PICKUP (food is ready → assign delivery partner)

READY_FOR_PICKUP → PICKED_UP (partner picks up → start delivery tracking)

PICKED_UP → OUT_FOR_DELIVERY (partner on the way)

OUT_FOR_DELIVERY → DELIVERED (partner confirms drop-off)
                 → DELIVERY_FAILED (customer not available → return flow)
```

#### Delivery Partner Assignment
```java
// Find nearest available partner when order is READY_FOR_PICKUP
class DeliveryAssignment {
    public DeliveryPartner assignPartner(Order order) {
        Restaurant restaurant = restaurantService.get(order.restaurantId);
        
        // 1. Find nearby available partners (Redis GEO)
        List<DeliveryPartner> candidates = geoService.findNearby(
            restaurant.lat, restaurant.lng, radiusKm: 5, limit: 10
        );
        
        // 2. Filter and score
        return candidates.stream()
            .filter(p -> p.isAvailable && p.currentOrders < 2) // max 2 concurrent
            .max(Comparator.comparingDouble(p -> scorePartner(p, order, restaurant)))
            .orElseThrow(() -> new NoPartnerAvailableException());
    }
    
    double scorePartner(DeliveryPartner p, Order order, Restaurant restaurant) {
        double distToRestaurant = geoService.distance(p.location, restaurant.location);
        double distToCustomer = geoService.distance(restaurant.location, order.deliveryLocation);
        return 1.0 / (distToRestaurant + 1) * 0.6   // proximity: 60%
             + p.rating / 5.0 * 0.3                   // rating: 30%
             + p.acceptanceRate * 0.1;                 // reliability: 10%
    }
}
```

#### ETA Calculation
```
ETA = restaurant_prep_time + pickup_time + delivery_time + buffer

- restaurant_prep_time: ML model based on order items, restaurant load, time of day
- pickup_time: distance(partner, restaurant) / average_speed + parking/pickup delay (5 min)
- delivery_time: Google Maps API for driving distance/time
- buffer: 5-10 min (traffic, weather, delays)

Update every 30 seconds based on partner's real-time location
```

---

## 🎯 Key Takeaways
- Swiggy's **Machine Coding** round is make-or-break — practice building complete systems in 90 min
- **Hotel booking system** tests OOP + concurrency handling — know TreeMap for date-range queries
- Food delivery system design is a **top interview question** at Swiggy, Zomato, DoorDash, Uber Eats
- **Delivery assignment** = geospatial matching problem — same pattern as Uber ride matching
- Minimum Platforms and Jump Game are **Swiggy favorites** — practice greedy algorithms
- Always discuss **state machines** for order lifecycle in food delivery designs

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Greedy (Min-Heap), Sliding Window |
| Round 2 | Medium-Hard | OOP, Machine Coding, Concurrency |
| Round 3 | Medium | Sweep Line, BST, Greedy |
| Round 4 | Hard | Event-Driven, Geospatial, State Machines |
