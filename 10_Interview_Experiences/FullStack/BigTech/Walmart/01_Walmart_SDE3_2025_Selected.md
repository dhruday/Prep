# Walmart — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart Global Tech |
| **Role** | Staff Software Engineer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/walmart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Director)
- **Timeline:** 2 weeks
- **Format:** Virtual
- **Note:** Walmart focuses on supply chain, inventory, and high-scale retail systems

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Word Search** (LeetCode 79)
2. **Best Time to Buy and Sell Stock III** (LeetCode 123) — at most 2 transactions
3. **SQL: Window functions, running totals**

### 💡 Interview-Ready Answer — Word Search

```java
public boolean exist(char[][] board, String word) {
    int m = board.length, n = board[0].length;
    
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (dfs(board, word, i, j, 0)) return true;
        }
    }
    return false;
}

private boolean dfs(char[][] board, String word, int i, int j, int k) {
    if (k == word.length()) return true;
    if (i < 0 || i >= board.length || j < 0 || j >= board[0].length) return false;
    if (board[i][j] != word.charAt(k)) return false;
    
    char temp = board[i][j];
    board[i][j] = '#'; // mark visited
    
    boolean found = dfs(board, word, i+1, j, k+1) || dfs(board, word, i-1, j, k+1)
                 || dfs(board, word, i, j+1, k+1) || dfs(board, word, i, j-1, k+1);
    
    board[i][j] = temp; // unmark
    return found;
}
```

### 💡 Interview-Ready Answer — Best Time to Buy/Sell Stock III

```java
public int maxProfit(int[] prices) {
    // State machine: 4 states
    int buy1 = Integer.MIN_VALUE;   // after 1st buy
    int sell1 = 0;                   // after 1st sell
    int buy2 = Integer.MIN_VALUE;   // after 2nd buy
    int sell2 = 0;                   // after 2nd sell
    
    for (int price : prices) {
        buy1 = Math.max(buy1, -price);           // buy 1st stock
        sell1 = Math.max(sell1, buy1 + price);    // sell 1st stock
        buy2 = Math.max(buy2, sell1 - price);     // buy 2nd stock (using profit from 1st)
        sell2 = Math.max(sell2, buy2 + price);    // sell 2nd stock
    }
    return sell2;
}
```
**Time:** O(n), **Space:** O(1)

---

## Round 2: Technical — DSA + LLD
**Duration:** 60 minutes | **Interviewer:** Principal Engineer

### Questions Asked
1. **Design a Shopping Cart with Discount Rules Engine**
2. **Implement a Thread-Safe Singleton (5 ways)**

### 💡 Interview-Ready Answer — Shopping Cart with Discount Engine

```java
interface DiscountRule {
    double apply(Cart cart);
    String description();
}

class PercentageDiscount implements DiscountRule {
    String code;
    double percentage;
    double minCartValue;
    
    PercentageDiscount(String code, double pct, double min) {
        this.code = code; this.percentage = pct; this.minCartValue = min;
    }
    
    @Override
    public double apply(Cart cart) {
        if (cart.subtotal() < minCartValue) return 0;
        return cart.subtotal() * percentage / 100;
    }
    
    @Override
    public String description() { return code + ": " + percentage + "% off"; }
}

class BuyXGetYFree implements DiscountRule {
    String productId;
    int buyQuantity;
    int freeQuantity;
    
    @Override
    public double apply(Cart cart) {
        CartItem item = cart.getItem(productId);
        if (item == null || item.quantity < buyQuantity) return 0;
        
        int eligibleFree = (item.quantity / buyQuantity) * freeQuantity;
        int actualFree = Math.min(eligibleFree, item.quantity - buyQuantity);
        return actualFree * item.unitPrice;
    }
    
    @Override
    public String description() { return "Buy " + buyQuantity + " Get " + freeQuantity + " Free"; }
}

class FlatDiscount implements DiscountRule {
    double amount;
    double minCartValue;
    
    @Override
    public double apply(Cart cart) {
        return cart.subtotal() >= minCartValue ? amount : 0;
    }
    
    @Override
    public String description() { return "$" + amount + " off"; }
}

class Cart {
    Map<String, CartItem> items = new LinkedHashMap<>();
    List<DiscountRule> appliedDiscounts = new ArrayList<>();
    
    void addItem(String productId, String name, double price, int qty) {
        items.merge(productId, new CartItem(productId, name, price, qty),
            (old, newItem) -> { old.quantity += newItem.quantity; return old; });
    }
    
    double subtotal() {
        return items.values().stream().mapToDouble(i -> i.unitPrice * i.quantity).sum();
    }
    
    void applyDiscount(DiscountRule discount) {
        appliedDiscounts.add(discount);
    }
    
    double totalDiscount() {
        // Apply discounts in order, but total discount cannot exceed subtotal
        double total = 0;
        for (DiscountRule rule : appliedDiscounts) {
            total += rule.apply(this);
        }
        return Math.min(total, subtotal()); // cap at subtotal
    }
    
    double grandTotal() {
        return subtotal() - totalDiscount();
    }
}
```

### 💡 Thread-Safe Singleton (5 Ways)

```java
// 1. Eager initialization
class Singleton1 {
    private static final Singleton1 INSTANCE = new Singleton1();
    private Singleton1() {}
    public static Singleton1 getInstance() { return INSTANCE; }
}

// 2. Lazy with synchronized (simple but slow)
class Singleton2 {
    private static Singleton2 instance;
    private Singleton2() {}
    public static synchronized Singleton2 getInstance() {
        if (instance == null) instance = new Singleton2();
        return instance;
    }
}

// 3. Double-checked locking (most commonly asked)
class Singleton3 {
    private static volatile Singleton3 instance; // volatile is CRITICAL
    private Singleton3() {}
    public static Singleton3 getInstance() {
        if (instance == null) {                   // 1st check (no lock)
            synchronized (Singleton3.class) {
                if (instance == null) {             // 2nd check (with lock)
                    instance = new Singleton3();
                }
            }
        }
        return instance;
    }
}

// 4. Bill Pugh — Inner static class (recommended)
class Singleton4 {
    private Singleton4() {}
    private static class Holder {
        private static final Singleton4 INSTANCE = new Singleton4();
    }
    public static Singleton4 getInstance() { return Holder.INSTANCE; }
    // Holder class loaded only when getInstance() called → lazy + thread-safe
}

// 5. Enum (best — prevents reflection + serialization attacks)
enum Singleton5 {
    INSTANCE;
    public void doSomething() { /* ... */ }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes | **Interviewer:** Director of Engineering

### Questions Asked
1. **Design Walmart's Supply Chain / Warehouse Management System**
   - Inventory across 4,700 stores + 30 DCs, inbound/outbound, picking, packing, shipping

### 💡 Interview-Ready Answer

```
┌──────────────────────────────────────────────────────────────┐
│                   Inbound (Vendor → DC)                       │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │ Purchase  │──▶│ ASN (Advance │──▶│ Receiving &      │    │
│  │ Order     │   │  Shipping    │   │ Put-Away         │    │
│  │ System    │   │  Notice)     │   │ (Scan → Slot)    │    │
│  └──────────┘   └──────────────┘   └──────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   Inventory Management                        │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Real-Time Inventory (per SKU, per location)          │    │
│  │                                                        │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐      │    │
│  │  │ On-Hand    │  │ Reserved   │  │ In-Transit │      │    │
│  │  │ (physical) │  │ (allocated │  │ (between   │      │    │
│  │  │            │  │  to orders)│  │  locations) │      │    │
│  │  └────────────┘  └────────────┘  └────────────┘      │    │
│  │                                                        │    │
│  │  ATP = On-Hand - Reserved - Safety Stock + In-Transit  │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   Outbound (DC → Store / Customer)            │
│                                                                │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │ Order         │──▶│ Wave         │──▶│ Pick         │     │
│  │ Allocation    │   │ Planning     │   │ (Worker gets │     │
│  │ (which DC?)   │   │ (batch       │   │  pick list)  │     │
│  └──────────────┘   │  orders into │   └──────┬───────┘     │
│                      │  waves)      │          │              │
│                      └──────────────┘          ▼              │
│                                        ┌──────────────┐      │
│                                        │ Pack & Ship  │      │
│                                        │ (box, label, │      │
│                                        │  carrier)    │      │
│                                        └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

#### Wave Planning Algorithm
```java
class WavePlanner {
    // Group orders into waves for efficient picking
    // Goal: minimize picker travel distance within warehouse
    
    List<Wave> planWaves(List<Order> pendingOrders, Warehouse warehouse) {
        // 1. Group by zone (orders needing items from same zone go together)
        Map<String, List<Order>> byZone = pendingOrders.stream()
            .collect(Collectors.groupingBy(o -> determineZone(o, warehouse)));
        
        // 2. Batch into waves of max 50 orders each
        List<Wave> waves = new ArrayList<>();
        for (var entry : byZone.entrySet()) {
            List<Order> zoneOrders = entry.getValue();
            for (int i = 0; i < zoneOrders.size(); i += 50) {
                int end = Math.min(i + 50, zoneOrders.size());
                Wave wave = new Wave(zoneOrders.subList(i, end));
                
                // 3. Generate pick list: optimize travel path (TSP-like)
                wave.pickList = generateOptimizedPickList(wave, warehouse);
                waves.add(wave);
            }
        }
        
        // 4. Priority: expedited orders first, then by wave size (larger = more efficient)
        waves.sort(Comparator.comparing(Wave::hasExpedited).reversed()
            .thenComparing(w -> -w.orders.size()));
        
        return waves;
    }
    
    PickList generateOptimizedPickList(Wave wave, Warehouse warehouse) {
        // Aggregate all items needed across all orders in wave
        Map<String, Integer> itemQuantities = new HashMap<>();
        for (Order order : wave.orders) {
            for (OrderItem item : order.items) {
                itemQuantities.merge(item.sku, item.quantity, Integer::sum);
            }
        }
        
        // Sort by aisle → shelf → level (S-shape traversal)
        List<PickItem> picks = itemQuantities.entrySet().stream()
            .map(e -> new PickItem(e.getKey(), e.getValue(), warehouse.getLocation(e.getKey())))
            .sorted(Comparator.comparing(p -> p.location.aisle)
                .thenComparing(p -> p.location.shelf)
                .thenComparing(p -> p.location.level))
            .collect(Collectors.toList());
        
        return new PickList(picks);
    }
}
```

#### Scale Numbers
```
- 4,700 US stores + 31 distribution centers
- 150K unique SKUs per DC, 120K per supercenter
- 2.4M items picked per day across all DCs
- Inventory updates: 10M/day (POS, receipts, adjustments, transfers)
- Peak: Black Friday = 5x normal volume → auto-scaling required
```

---

## Round 4: Director Interview
**Duration:** 45 minutes

### Questions Asked
1. **"How do you design systems for Black Friday scale?"**
2. **"Tell me about a time you led a cross-team initiative"**

---

## 🎯 Key Takeaways
- Walmart tests **retail/supply chain domain** — know inventory management, ATP, wave planning
- **Word Search** (backtracking) and **Stock Buy/Sell** (DP with states) are Walmart favorites
- **Shopping Cart + Discount Engine** is the practical LLD question — know Strategy pattern
- **Thread-safe Singleton** — know all 5 ways, especially why `volatile` is needed in DCL
- **Warehouse Management** = unique system design. Know: receiving → put-away → pick → pack → ship
- **Wave planning** with zone-based picking is core warehouse optimization
- Walmart values scale: design for 4,700 stores, 10M daily inventory events, 5x Black Friday surge

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium-Hard | Backtracking, DP, SQL |
| Round 2 | Medium-Hard | OOP, Strategy Pattern, Concurrency |
| Round 3 | Very Hard | Supply Chain, Warehouse Mgmt, Scale |
| Round 4 | Medium | Leadership, Scale, Behavioral |
