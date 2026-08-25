# Amazon — SDE-3 FullStack Interview Experience (2025) — #10

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-3 |
| **Level** | L6 |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Seattle, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Rejection Reason** | Bar Raiser: LP "Dive Deep" not strong enough — answers stayed at surface level |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Coding + LLD + System Design + Bar Raiser)

---

## Round 1: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Minimum Cost to Connect All Points** (LeetCode 1584) — Minimum Spanning Tree
2. **Follow-up: Prim's vs Kruskal's — when to use each?**

### 💡 MST — Prim's Algorithm

```java
int minCostConnectPoints(int[][] points) {
    int n = points.length;
    boolean[] inMST = new boolean[n];
    int[] minDist = new int[n]; // Min distance from MST to each node
    Arrays.fill(minDist, Integer.MAX_VALUE);
    minDist[0] = 0;
    
    int totalCost = 0;
    
    // Prim's with PriorityQueue
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]); // [node, distance]
    pq.offer(new int[]{0, 0});
    
    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        int u = curr[0], dist = curr[1];
        
        if (inMST[u]) continue;
        inMST[u] = true;
        totalCost += dist;
        
        for (int v = 0; v < n; v++) {
            if (!inMST[v]) {
                int edgeCost = Math.abs(points[u][0] - points[v][0]) + 
                               Math.abs(points[u][1] - points[v][1]);
                if (edgeCost < minDist[v]) {
                    minDist[v] = edgeCost;
                    pq.offer(new int[]{v, edgeCost});
                }
            }
        }
    }
    
    return totalCost;
}
// Time: O(N² log N) with PQ — dense graph so Prim's is better than Kruskal's
// Kruskal's: O(E log E) — better for sparse graphs
// For complete graph: E = N*(N-1)/2, so Kruskal's is O(N² log N²) = same as Prim's
// But Prim's with adjacency matrix (no PQ) is O(N²) — optimal for complete graphs
```

---

## Round 2: LLD — Low Level Design
**Duration:** 60 minutes

### Challenge
**Design Amazon's Shopping Cart Service**
- Add/remove/update items 
- Price calculation with discounts, coupons
- Cart persistence (guest vs logged-in)
- Cart merging (guest → logged-in)
- Inventory reservation (soft lock items in cart)

### 💡 Shopping Cart LLD

```java
// Strategy pattern for discount calculation
interface DiscountStrategy {
    DiscountResult apply(Cart cart, String code);
}

class PercentageDiscount implements DiscountStrategy {
    private final double percent;
    private final BigDecimal maxDiscount;
    private final Predicate<CartItem> eligibility;
    
    DiscountResult apply(Cart cart, String code) {
        BigDecimal eligibleTotal = cart.getItems().stream()
            .filter(eligibility)
            .map(CartItem::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal discount = eligibleTotal.multiply(BigDecimal.valueOf(percent / 100.0));
        if (maxDiscount != null) discount = discount.min(maxDiscount);
        
        return new DiscountResult(code, discount, "Percentage discount: " + percent + "%");
    }
}

class BuyXGetYDiscount implements DiscountStrategy {
    private final String productId;
    private final int buyQty;
    private final int freeQty;
    
    DiscountResult apply(Cart cart, String code) {
        CartItem item = cart.findItem(productId);
        if (item == null || item.getQuantity() < buyQty) {
            return DiscountResult.notApplicable();
        }
        
        int sets = item.getQuantity() / (buyQty + freeQty);
        int freeItems = sets * freeQty;
        BigDecimal discount = item.getUnitPrice().multiply(BigDecimal.valueOf(freeItems));
        
        return new DiscountResult(code, discount, "Buy " + buyQty + " Get " + freeQty + " Free");
    }
}

class CartService {
    private final CartRepository cartRepo;
    private final InventoryService inventoryService;
    private final Map<String, DiscountStrategy> discountStrategies;
    
    // Add item with inventory reservation
    CartOperationResult addItem(String cartId, String productId, int quantity) {
        Cart cart = cartRepo.findById(cartId);
        
        // 1. Check inventory availability
        InventoryCheckResult invResult = inventoryService.checkAvailability(productId, quantity);
        if (!invResult.isAvailable()) {
            return CartOperationResult.outOfStock(invResult.getAvailableQty());
        }
        
        // 2. Soft-reserve inventory (TTL = 15 minutes)
        String reservationId = inventoryService.softReserve(productId, quantity, Duration.ofMinutes(15));
        
        // 3. Add/update cart item
        CartItem existing = cart.findItem(productId);
        if (existing != null) {
            // Release old reservation, create new one for total quantity
            inventoryService.releaseReservation(existing.getReservationId());
            existing.setQuantity(existing.getQuantity() + quantity);
            existing.setReservationId(
                inventoryService.softReserve(productId, existing.getQuantity(), Duration.ofMinutes(15))
            );
        } else {
            cart.addItem(new CartItem(productId, quantity, 
                productService.getPrice(productId), reservationId));
        }
        
        // 4. Recalculate totals
        recalculate(cart);
        cartRepo.save(cart);
        
        return CartOperationResult.success(cart);
    }
    
    // Apply coupon code
    CartOperationResult applyCoupon(String cartId, String couponCode) {
        Cart cart = cartRepo.findById(cartId);
        
        // Validate coupon
        Coupon coupon = couponService.validate(couponCode);
        if (coupon == null) return CartOperationResult.invalidCoupon();
        if (coupon.isExpired()) return CartOperationResult.expiredCoupon();
        if (coupon.getMinCartValue() != null && 
            cart.getSubtotal().compareTo(coupon.getMinCartValue()) < 0) {
            return CartOperationResult.minimumNotMet(coupon.getMinCartValue());
        }
        
        DiscountStrategy strategy = discountStrategies.get(coupon.getType());
        DiscountResult result = strategy.apply(cart, couponCode);
        
        cart.setAppliedCoupon(couponCode);
        cart.setDiscount(result.getAmount());
        recalculate(cart);
        cartRepo.save(cart);
        
        return CartOperationResult.success(cart);
    }
    
    // Merge guest cart into logged-in user's cart
    Cart mergeCarts(String guestCartId, String userCartId) {
        Cart guestCart = cartRepo.findById(guestCartId);
        Cart userCart = cartRepo.findById(userCartId);
        
        for (CartItem guestItem : guestCart.getItems()) {
            CartItem userItem = userCart.findItem(guestItem.getProductId());
            
            if (userItem != null) {
                // Item exists in both: keep higher quantity (user-friendly)
                userItem.setQuantity(Math.max(userItem.getQuantity(), guestItem.getQuantity()));
            } else {
                // Item only in guest: copy to user cart
                userCart.addItem(guestItem.copy());
            }
        }
        
        recalculate(userCart);
        cartRepo.save(userCart);
        cartRepo.delete(guestCartId); // Remove guest cart
        
        return userCart;
    }
    
    private void recalculate(Cart cart) {
        BigDecimal subtotal = cart.getItems().stream()
            .map(CartItem::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        cart.setSubtotal(subtotal);
        cart.setShipping(calculateShipping(cart));
        cart.setTax(subtotal.multiply(cart.getTaxRate()));
        cart.setTotal(subtotal.subtract(cart.getDiscount()).add(cart.getShipping()).add(cart.getTax()));
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Amazon's Order Processing Pipeline** (from checkout to delivery)

### 💡 Key System Design Points
- **Saga pattern**: Order → Payment → Inventory → Shipping — compensating transactions on failure
- **Outbox pattern**: DB write + event in same transaction → CDC publishes to Kafka
- **Idempotency**: order_id as idempotency key → prevent double charge
- **Status tracking**: Kafka-sourced state machine → DynamoDB for order state
- **SLA**: order placed → warehouse notified within 30 seconds

---

## 🎯 Key Takeaways
- Amazon L6 = **LP depth + MST/graph algorithms + LLD rigor + Saga patterns**
- **Prim's vs Kruskal's**: Prim's with adjacency matrix O(N²) for dense; Kruskal's O(E log E) for sparse
- **Cart inventory reservation**: soft-lock with 15-min TTL → prevents overselling without hard locks
- **Cart merge**: guest→user merge keeping max quantity per item — user-friendly decision
- **Discount Strategy pattern**: easily extensible for new discount types (percentage, BOGO, tiered)
- **Bar Raiser LP "Dive Deep"**: they want you to go 3 levels deep — ask "why" about your own decisions
- Amazon rejects at L6 if LP stories aren't at VP-level depth with metrics and organizational impact

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array + DP |
| Coding | Medium-Hard | MST (Prim's), Graph |
| LLD | Hard | Shopping Cart, Strategy Pattern |
| System Design | Hard | Order Pipeline, Saga |
| Bar Raiser | Hard | Leadership Principles |
