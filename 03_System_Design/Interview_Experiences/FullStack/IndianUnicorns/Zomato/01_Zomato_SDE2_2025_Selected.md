# Zomato — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 |
| **YOE** | 3 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Gurugram, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/zomato-interview-experience-for-sde-2/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + DSA + HLD)
- **Timeline:** 2 weeks
- **Format:** Virtual
- **Note:** Very similar process to Swiggy — food-tech domain knowledge helps

---

## Round 1: Online Assessment
**Duration:** 90 minutes | **Platform:** HackerRank

### Questions Asked
1. **3Sum** (LeetCode 15)
2. **Minimum Number of Coins** (Coin Change — LeetCode 322)
3. **MCQ: OS, DBMS, Networking basics**

### 💡 Interview-Ready Answer — 3Sum

```java
public List<List<Integer>> threeSum(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    Arrays.sort(nums);
    
    for (int i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue; // skip duplicates
        if (nums[i] > 0) break; // optimization: smallest positive can't sum to 0
        
        int left = i + 1, right = nums.length - 1;
        
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            
            if (sum == 0) {
                result.add(Arrays.asList(nums[i], nums[left], nums[right]));
                while (left < right && nums[left] == nums[left + 1]) left++;
                while (left < right && nums[right] == nums[right - 1]) right--;
                left++;
                right--;
            } else if (sum < 0) {
                left++;
            } else {
                right--;
            }
        }
    }
    return result;
}
```
**Time:** O(n²), **Space:** O(1) (excluding output)

### 💡 Interview-Ready Answer — Coin Change

```java
public int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1); // use amount+1 as "infinity"
    dp[0] = 0;
    
    for (int i = 1; i <= amount; i++) {
        for (int coin : coins) {
            if (coin <= i) {
                dp[i] = Math.min(dp[i], dp[i - coin] + 1);
            }
        }
    }
    
    return dp[amount] > amount ? -1 : dp[amount];
}
```
**Time:** O(amount × coins), **Space:** O(amount)

---

## Round 2: Machine Coding
**Duration:** 90 minutes + 30 minutes discussion

### Questions Asked
1. **Design a Food Ordering System (like Zomato)**
   - Restaurants, menus, orders, payment, delivery tracking

### 💡 Interview-Ready Answer

```java
enum OrderStatus { 
    PLACED, CONFIRMED, PREPARING, READY, PICKED_UP, 
    OUT_FOR_DELIVERY, DELIVERED, CANCELLED 
}

class MenuItem {
    String itemId;
    String name;
    double price;
    String category; // starters, mains, drinks, desserts
    boolean isVeg;
    boolean isAvailable;
    
    MenuItem(String name, double price, String category, boolean isVeg) {
        this.itemId = UUID.randomUUID().toString().substring(0, 8);
        this.name = name;
        this.price = price;
        this.category = category;
        this.isVeg = isVeg;
        this.isAvailable = true;
    }
}

class Restaurant {
    String restaurantId;
    String name;
    String cuisine;
    double rating;
    double latitude, longitude;
    boolean isOpen;
    Map<String, MenuItem> menu = new LinkedHashMap<>(); // itemId → item
    
    Restaurant(String name, String cuisine, double lat, double lng) {
        this.restaurantId = UUID.randomUUID().toString().substring(0, 8);
        this.name = name;
        this.cuisine = cuisine;
        this.latitude = lat;
        this.longitude = lng;
        this.isOpen = true;
    }
    
    void addMenuItem(MenuItem item) { menu.put(item.itemId, item); }
    void removeMenuItem(String itemId) { menu.remove(itemId); }
    void toggleItemAvailability(String itemId) {
        MenuItem item = menu.get(itemId);
        if (item != null) item.isAvailable = !item.isAvailable;
    }
}

class CartItem {
    MenuItem item;
    int quantity;
    
    CartItem(MenuItem item, int quantity) {
        this.item = item;
        this.quantity = quantity;
    }
    
    double total() { return item.price * quantity; }
}

class Cart {
    String userId;
    String restaurantId;
    Map<String, CartItem> items = new LinkedHashMap<>(); // itemId → CartItem
    
    void addItem(MenuItem item, int quantity) {
        if (items.containsKey(item.itemId)) {
            items.get(item.itemId).quantity += quantity;
        } else {
            items.put(item.itemId, new CartItem(item, quantity));
        }
    }
    
    void removeItem(String itemId) { items.remove(itemId); }
    
    void updateQuantity(String itemId, int quantity) {
        if (quantity <= 0) removeItem(itemId);
        else items.get(itemId).quantity = quantity;
    }
    
    double getTotal() {
        return items.values().stream().mapToDouble(CartItem::total).sum();
    }
    
    boolean isEmpty() { return items.isEmpty(); }
    void clear() { items.clear(); }
}

class Order {
    String orderId;
    String userId;
    String restaurantId;
    List<CartItem> items;
    double totalAmount;
    double deliveryFee;
    OrderStatus status;
    String deliveryPartnerId;
    LocalDateTime placedAt;
    LocalDateTime deliveredAt;
    
    Order(String userId, Cart cart) {
        this.orderId = "ORD-" + UUID.randomUUID().toString().substring(0, 8);
        this.userId = userId;
        this.restaurantId = cart.restaurantId;
        this.items = new ArrayList<>(cart.items.values());
        this.totalAmount = cart.getTotal();
        this.deliveryFee = 30.0; // base fee
        this.status = OrderStatus.PLACED;
        this.placedAt = LocalDateTime.now();
    }
    
    double grandTotal() { return totalAmount + deliveryFee; }
}

class FoodOrderingService {
    Map<String, Restaurant> restaurants = new HashMap<>();
    Map<String, Cart> userCarts = new HashMap<>(); // userId → cart
    Map<String, Order> orders = new HashMap<>();
    
    // Search restaurants
    List<Restaurant> searchRestaurants(String query, double userLat, double userLng, 
                                         double radiusKm, String cuisine, boolean vegOnly) {
        return restaurants.values().stream()
            .filter(r -> r.isOpen)
            .filter(r -> distance(userLat, userLng, r.latitude, r.longitude) <= radiusKm)
            .filter(r -> cuisine == null || r.cuisine.equalsIgnoreCase(cuisine))
            .filter(r -> !vegOnly || r.menu.values().stream().anyMatch(m -> m.isVeg))
            .filter(r -> query == null || r.name.toLowerCase().contains(query.toLowerCase()))
            .sorted(Comparator.comparingDouble(r -> -r.rating)) // highest rated first
            .collect(Collectors.toList());
    }
    
    // Place order
    Order placeOrder(String userId) {
        Cart cart = userCarts.get(userId);
        if (cart == null || cart.isEmpty()) throw new IllegalStateException("Cart is empty");
        
        // Validate all items still available
        Restaurant restaurant = restaurants.get(cart.restaurantId);
        for (CartItem cartItem : cart.items.values()) {
            MenuItem menuItem = restaurant.menu.get(cartItem.item.itemId);
            if (menuItem == null || !menuItem.isAvailable) {
                throw new IllegalStateException("Item no longer available: " + cartItem.item.name);
            }
        }
        
        Order order = new Order(userId, cart);
        orders.put(order.orderId, order);
        cart.clear(); // empty cart after placing order
        return order;
    }
    
    // Update order status
    void updateOrderStatus(String orderId, OrderStatus newStatus) {
        Order order = orders.get(orderId);
        if (order == null) throw new IllegalArgumentException("Order not found");
        
        // Validate state transition
        if (!isValidTransition(order.status, newStatus)) {
            throw new IllegalStateException("Invalid transition: " + order.status + " → " + newStatus);
        }
        
        order.status = newStatus;
        if (newStatus == OrderStatus.DELIVERED) {
            order.deliveredAt = LocalDateTime.now();
        }
    }
    
    private boolean isValidTransition(OrderStatus from, OrderStatus to) {
        Map<OrderStatus, Set<OrderStatus>> validTransitions = Map.of(
            OrderStatus.PLACED, Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED, Set.of(OrderStatus.PREPARING, OrderStatus.CANCELLED),
            OrderStatus.PREPARING, Set.of(OrderStatus.READY),
            OrderStatus.READY, Set.of(OrderStatus.PICKED_UP),
            OrderStatus.PICKED_UP, Set.of(OrderStatus.OUT_FOR_DELIVERY),
            OrderStatus.OUT_FOR_DELIVERY, Set.of(OrderStatus.DELIVERED)
        );
        return validTransitions.getOrDefault(from, Collections.emptySet()).contains(to);
    }
    
    private double distance(double lat1, double lng1, double lat2, double lng2) {
        // Haversine formula (simplified)
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * 
                   Math.sin(dLng/2) * Math.sin(dLng/2);
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // km
    }
}
```

---

## Round 3: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Top K Frequent Elements** (LeetCode 347)
2. **Minimum Window Substring** (LeetCode 76)
3. **Binary Tree Zigzag Level Order** (LeetCode 103)

### 💡 Interview-Ready Answer — Minimum Window Substring

```java
public String minWindow(String s, String t) {
    if (s.length() < t.length()) return "";
    
    Map<Character, Integer> need = new HashMap<>();
    for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);
    
    int required = need.size(); // distinct chars needed
    int formed = 0;              // distinct chars satisfied
    Map<Character, Integer> windowCounts = new HashMap<>();
    
    int left = 0;
    int minLen = Integer.MAX_VALUE;
    int minLeft = 0;
    
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        windowCounts.merge(c, 1, Integer::sum);
        
        if (need.containsKey(c) && windowCounts.get(c).intValue() == need.get(c).intValue()) {
            formed++;
        }
        
        // Contract window from left
        while (formed == required) {
            if (right - left + 1 < minLen) {
                minLen = right - left + 1;
                minLeft = left;
            }
            
            char leftChar = s.charAt(left);
            windowCounts.merge(leftChar, -1, Integer::sum);
            
            if (need.containsKey(leftChar) && windowCounts.get(leftChar) < need.get(leftChar)) {
                formed--;
            }
            left++;
        }
    }
    
    return minLen == Integer.MAX_VALUE ? "" : s.substring(minLeft, minLeft + minLen);
}
```
**Time:** O(|S| + |T|), **Space:** O(|S| + |T|)

### 💡 Interview-Ready Answer — Top K Frequent Elements

**Approach: Bucket Sort (O(n))**
```java
public int[] topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int num : nums) freq.merge(num, 1, Integer::sum);
    
    // Bucket sort: index = frequency, value = list of elements with that frequency
    List<Integer>[] buckets = new List[nums.length + 1];
    for (int i = 0; i < buckets.length; i++) buckets[i] = new ArrayList<>();
    
    for (Map.Entry<Integer, Integer> entry : freq.entrySet()) {
        buckets[entry.getValue()].add(entry.getKey());
    }
    
    int[] result = new int[k];
    int idx = 0;
    for (int i = buckets.length - 1; i >= 0 && idx < k; i--) {
        for (int num : buckets[i]) {
            if (idx >= k) break;
            result[idx++] = num;
        }
    }
    return result;
}
```
**Time:** O(n), **Space:** O(n) — better than heap's O(n log k)

---

## Round 4: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Zomato's Restaurant Search and Discovery**
   - Location-based search, filters, ratings, personalized recommendations

### 💡 Interview-Ready Answer

```
┌──────────────┐
│  Mobile App  │
│  User enters │         ┌───────────────────────────┐
│  "Pizza near │────────▶│  API Gateway               │
│   me"        │         │  - Auth, Rate limit         │
└──────────────┘         │  - Request routing          │
                          └──────────┬────────────────┘
                                     │
                          ┌──────────▼────────────────┐
                          │  Search Service             │
                          │                             │
                          │  1. Parse query ("pizza")   │
                          │  2. Geo filter (lat/lng, r) │
                          │  3. Apply filters (veg,     │
                          │     price, rating, cuisine)  │
                          │  4. Rank results             │
                          │  5. Personalize              │
                          └──────────┬────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │ Elasticsearch │  │ Redis        │  │ PostgreSQL   │
          │ (Full-text   │  │ (Geospatial  │  │ (Restaurant  │
          │  search +    │  │  index,      │  │  details,    │
          │  geo filter) │  │  caching)    │  │  reviews)    │
          └──────────────┘  └──────────────┘  └──────────────┘
```

#### Elasticsearch Index Schema
```json
{
    "restaurant": {
        "properties": {
            "name": { "type": "text", "analyzer": "autocomplete" },
            "cuisine": { "type": "keyword" },
            "location": { "type": "geo_point" },
            "rating": { "type": "float" },
            "price_range": { "type": "integer" },
            "is_veg": { "type": "boolean" },
            "delivery_time_mins": { "type": "integer" },
            "menu_items": {
                "type": "nested",
                "properties": {
                    "name": { "type": "text" },
                    "price": { "type": "float" }
                }
            }
        }
    }
}
```

#### Ranking Algorithm
```
Score = w1 * relevance_score      // Elasticsearch text match score
      + w2 * rating_score         // normalized 0-1
      + w3 * proximity_score      // closer = higher
      + w4 * delivery_time_score  // faster = higher
      + w5 * personalization_score // based on user's order history
      + w6 * promotion_boost      // sponsored restaurants

Where:
  proximity_score = 1 / (1 + distance_km)
  delivery_time_score = 1 - (delivery_time / 60)  // normalize to 0-1
  personalization_score = cosine_similarity(user_cuisine_vector, restaurant_cuisine_vector)
```

---

## 🎯 Key Takeaways
- Zomato = Swiggy-like process but with more emphasis on **search/discovery**
- **3Sum and Coin Change** are OA staples at Indian unicorns
- **Minimum Window Substring** is a must-know sliding window problem
- **Elasticsearch** for restaurant search — know geo_point queries and custom ranking
- **Machine Coding** for food delivery is very common — practice order state machines
- **Bucket Sort** for Top K Frequent is O(n) — beats heap approach for interviews

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Two Pointer, DP |
| Machine Coding | Medium-Hard | OOP, State Machine, Geospatial |
| DSA | Hard | Sliding Window, Bucket Sort, BFS |
| System Design | Hard | Elasticsearch, Ranking, Personalization |
