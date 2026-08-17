# Zomato — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | SDE-2 |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Gurugram, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/zomato-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + DSA + System Design + HM)
- **Rejection Reason:** DSA round — partial solution for 2nd problem

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Restaurant Menu Ordering System** (in-memory)
   - Add restaurants, browse menus, add to cart, apply coupons, place order

### 💡 Interview-Ready Answer

```java
public class FoodOrderingSystem {
    private final Map<String, Restaurant> restaurants = new ConcurrentHashMap<>();
    private final Map<String, Order> orders = new ConcurrentHashMap<>();
    private final Map<String, Cart> carts = new ConcurrentHashMap<>(); // userId → Cart
    private final Map<String, Coupon> coupons = new ConcurrentHashMap<>();
    
    record Restaurant(String id, String name, String cuisine, List<MenuItem> menu, 
                      boolean isOpen, double rating) {}
    record MenuItem(String id, String name, String description, double price, 
                    String category, boolean isVeg, boolean available) {}
    record CartItem(MenuItem item, int quantity) {}
    record Coupon(String code, double discountPercent, double maxDiscount, 
                  double minOrderValue, Instant expiresAt) {}
    
    // Add to cart (validate same restaurant)
    void addToCart(String userId, String restaurantId, String itemId, int qty) {
        Cart cart = carts.computeIfAbsent(userId, k -> new Cart());
        
        Restaurant restaurant = restaurants.get(restaurantId);
        if (restaurant == null) throw new IllegalArgumentException("Restaurant not found");
        
        // Validate: can't mix restaurants in same cart
        if (cart.restaurantId != null && !cart.restaurantId.equals(restaurantId)) {
            throw new IllegalStateException(
                "Cart has items from " + cart.restaurantId + ". Clear cart first.");
        }
        
        MenuItem item = restaurant.menu.stream()
            .filter(m -> m.id.equals(itemId) && m.available)
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Item not available"));
        
        cart.restaurantId = restaurantId;
        cart.items.merge(itemId, new CartItem(item, qty), 
            (old, newItem) -> new CartItem(old.item, old.quantity + qty));
    }
    
    // Apply coupon
    double applyCoupon(String userId, String couponCode) {
        Cart cart = carts.get(userId);
        if (cart == null || cart.items.isEmpty()) throw new IllegalStateException("Cart empty");
        
        Coupon coupon = coupons.get(couponCode.toUpperCase());
        if (coupon == null) throw new IllegalArgumentException("Invalid coupon");
        if (Instant.now().isAfter(coupon.expiresAt)) throw new IllegalArgumentException("Coupon expired");
        
        double subtotal = cart.getSubtotal();
        if (subtotal < coupon.minOrderValue) {
            throw new IllegalStateException(
                String.format("Min order value ₹%.0f required. Current: ₹%.0f", 
                    coupon.minOrderValue, subtotal));
        }
        
        double discount = Math.min(subtotal * coupon.discountPercent / 100, coupon.maxDiscount);
        cart.appliedCoupon = coupon;
        cart.discount = discount;
        
        return subtotal - discount;
    }
    
    // Place order
    OrderConfirmation placeOrder(String userId, String address) {
        Cart cart = carts.get(userId);
        if (cart == null || cart.items.isEmpty()) throw new IllegalStateException("Cart empty");
        
        Restaurant restaurant = restaurants.get(cart.restaurantId);
        if (!restaurant.isOpen) throw new IllegalStateException("Restaurant is closed");
        
        double subtotal = cart.getSubtotal();
        double deliveryFee = calculateDeliveryFee(subtotal);
        double tax = subtotal * 0.05; // 5% GST
        double total = subtotal - cart.discount + deliveryFee + tax;
        
        Order order = new Order(
            "ORD-" + System.currentTimeMillis(),
            userId, cart.restaurantId,
            new ArrayList<>(cart.items.values()),
            subtotal, cart.discount, deliveryFee, tax, total,
            address, Order.Status.PLACED, Instant.now()
        );
        
        orders.put(order.id, order);
        carts.remove(userId); // Clear cart after order
        
        return new OrderConfirmation(order.id, total, 30); // 30 min ETA
    }
    
    // Search restaurants
    List<Restaurant> searchRestaurants(String query, String cuisine, Boolean vegOnly, double minRating) {
        return restaurants.values().stream()
            .filter(r -> r.isOpen)
            .filter(r -> query == null || r.name.toLowerCase().contains(query.toLowerCase())
                         || r.cuisine.toLowerCase().contains(query.toLowerCase()))
            .filter(r -> cuisine == null || r.cuisine.equalsIgnoreCase(cuisine))
            .filter(r -> !vegOnly || r.menu.stream().anyMatch(MenuItem::isVeg))
            .filter(r -> r.rating >= minRating)
            .sorted(Comparator.comparingDouble(Restaurant::rating).reversed())
            .collect(Collectors.toList());
    }
    
    private double calculateDeliveryFee(double subtotal) {
        if (subtotal >= 500) return 0; // Free delivery above ₹500
        if (subtotal >= 200) return 20;
        return 40;
    }
    
    static class Cart {
        String restaurantId;
        Map<String, CartItem> items = new LinkedHashMap<>();
        Coupon appliedCoupon;
        double discount;
        
        double getSubtotal() {
            return items.values().stream()
                .mapToDouble(ci -> ci.item.price * ci.quantity)
                .sum();
        }
    }
    
    record Order(String id, String userId, String restaurantId, List<CartItem> items,
                 double subtotal, double discount, double deliveryFee, double tax,
                 double total, String address, Status status, Instant createdAt) {
        enum Status { PLACED, CONFIRMED, PREPARING, PICKED_UP, DELIVERED, CANCELLED }
    }
    
    record OrderConfirmation(String orderId, double total, int etaMinutes) {}
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Minimum Cost to Make at Least One Valid Path in a Grid** (LeetCode 1368) — 0-1 BFS
2. **Follow-up: What if changing direction has variable cost?**

### 💡 0-1 BFS Approach

```java
public int minCost(int[][] grid) {
    int m = grid.length, n = grid[0].length;
    int[][] dist = new int[m][n];
    for (int[] row : dist) Arrays.fill(row, Integer.MAX_VALUE);
    
    // Directions: 1→right, 2→left, 3→down, 4→up
    int[][] dirs = {{0,1},{0,-1},{1,0},{-1,0}}; // 0-indexed (grid values are 1-indexed)
    
    // 0-1 BFS: use deque, add to front if cost=0, back if cost=1
    Deque<int[]> deque = new ArrayDeque<>();
    deque.offerFirst(new int[]{0, 0});
    dist[0][0] = 0;
    
    while (!deque.isEmpty()) {
        int[] curr = deque.pollFirst();
        int r = curr[0], c = curr[1];
        
        for (int d = 0; d < 4; d++) {
            int nr = r + dirs[d][0], nc = c + dirs[d][1];
            if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
            
            // Cost = 0 if grid[r][c] already points in this direction, else 1
            int cost = (grid[r][c] - 1 == d) ? 0 : 1;
            int newDist = dist[r][c] + cost;
            
            if (newDist < dist[nr][nc]) {
                dist[nr][nc] = newDist;
                if (cost == 0) deque.offerFirst(new int[]{nr, nc}); // Free move → front
                else deque.offerLast(new int[]{nr, nc});            // Paid move → back
            }
        }
    }
    
    return dist[m-1][n-1];
}
// Time: O(m*n), Space: O(m*n)
// Key insight: 0-1 BFS replaces Dijkstra when edge weights are 0 or 1
// Deque-based BFS: front for free edges, back for cost-1 edges

// Follow-up: Variable costs → Use Dijkstra with PriorityQueue
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Zomato's Restaurant Discovery & Recommendation**
   - Search, filters, personalized recommendations, popular restaurants

### 💡 Interview-Ready Answer

```
Restaurant Discovery Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Search + Discovery:                                          │
│  User opens app → show personalized feed:                    │
│  1. Nearby restaurants (geo query)                           │
│  2. Trending now (past 1 hour orders in area)                │
│  3. Based on your orders (collaborative filtering)           │
│  4. Cuisine recommendations (content-based)                  │
│  5. New in your area (freshness signal)                      │
│                                                                │
│  Architecture:                                                │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ App/Web   │─▶│ Discovery API │─▶│ Elasticsearch    │       │
│  │           │  │              │  │ (restaurants)    │       │
│  │ lat, lng  │  │ Personalize  │  │ + geo_point      │       │
│  │ filters   │  │ + rank       │  │ + ratings         │       │
│  └──────────┘  └──────────────┘  └──────────────────┘       │
│                       │                                      │
│               ┌───────▼────────┐                             │
│               │ Redis (cache)   │                             │
│               │ - trending      │                             │
│               │ - user prefs    │                             │
│               └────────────────┘                              │
│                                                                │
│  Elasticsearch Query:                                         │
│  {                                                            │
│    "bool": {                                                  │
│      "must": [                                               │
│        { "geo_distance": { "distance": "5km",               │
│          "location": { "lat": 28.6, "lon": 77.2 } } },     │
│        { "term": { "is_open": true } },                     │
│        { "range": { "rating": { "gte": 3.5 } } }           │
│      ],                                                      │
│      "should": [                                             │
│        { "match": { "cuisine": "North Indian" } },          │
│        { "match": { "tags": "biryani" } }                   │
│      ]                                                       │
│    },                                                        │
│    "sort": [                                                 │
│      { "_score": "desc" },                                   │
│      { "rating": "desc" },                                   │
│      { "delivery_time": "asc" }                              │
│    ]                                                         │
│  }                                                            │
│                                                                │
│  Ranking Score = w1*relevance + w2*rating + w3*proximity +   │
│    w4*popularity + w5*delivery_time + w6*personalization     │
│  Where personalization = user's history similarity score      │
│                                                                │
│  Trending Algorithm:                                          │
│  - Redis Sorted Set: ZINCRBY trending:{city} 1 {restaurant} │
│  - TTL: entries decay every hour                             │
│  - Score = orders_last_hour * rating_weight                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Zomato = **food tech domain + geo-spatial + machine coding**
- **Food ordering system** machine coding is Zomato's #1 question — handle coupon edge cases
- **0-1 BFS** with Deque is cleaner than Dijkstra for binary-weight graphs
- I **got rejected** because I couldn't solve 0-1 BFS — only coded Dijkstra (works but slower)
- **Restaurant discovery** = Elasticsearch + geo_distance + personalized ranking
- **Trending** = Redis Sorted Set with time decay — simple and effective
- Zomato values **food domain knowledge** — mention delivery fees, GST, veg/non-veg filters

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Food Ordering, Coupons, Validation |
| DSA | Hard | 0-1 BFS, Graph, Deque |
| System Design | Hard | Discovery, Elasticsearch, Geo, Ranking |
| HM | Medium | Behavioral |
