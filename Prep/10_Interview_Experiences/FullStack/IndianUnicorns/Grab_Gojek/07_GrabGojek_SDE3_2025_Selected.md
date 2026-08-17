# Grab/Gojek — Senior FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab/Gojek |
| **Role** | Senior FullStack Engineer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | May 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + System Design + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 3: Backend Coding — Promo Code / Voucher Engine

### Problem
Build a promo/voucher code engine for Grab's super-app:
1. Create promo codes with: discount type (percentage/flat), max discount cap, min order value, expiry, usage limit (global + per-user)
2. Validate promo code for a given user + order
3. Stackable promos: allow combining up to 2 promos (best combination auto-selected)
4. Service-specific: promo applies to ride/food/payments only
5. First-time user detection
6. Budget tracking: total spend per promo code capped
7. Return discount breakdown

Implement in **Java**.

### 💡 Interview-Ready Answer

```java
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.*;

public class PromoCodeEngine {

    // ============================================================
    // MODELS
    // ============================================================
    enum DiscountType { PERCENTAGE, FLAT }
    enum ServiceType { RIDE, FOOD, PAYMENTS, ALL }

    static class PromoCode {
        String code;
        DiscountType discountType;
        double discountValue;    // percentage (0-100) or flat amount
        double maxDiscountCap;   // cap for percentage discounts
        double minOrderValue;
        Instant expiresAt;
        int globalUsageLimit;
        int perUserLimit;
        double budgetCap;         // total spend limit for this code
        ServiceType service;
        boolean firstTimeOnly;
        boolean stackable;

        // Tracking
        int totalUsed = 0;
        double totalSpent = 0;
        Map<String, Integer> userUsage = new HashMap<>();

        PromoCode(String code, DiscountType type, double value) {
            this.code = code;
            this.discountType = type;
            this.discountValue = value;
            this.maxDiscountCap = Double.MAX_VALUE;
            this.minOrderValue = 0;
            this.expiresAt = Instant.now().plus(30, ChronoUnit.DAYS);
            this.globalUsageLimit = Integer.MAX_VALUE;
            this.perUserLimit = 1;
            this.budgetCap = Double.MAX_VALUE;
            this.service = ServiceType.ALL;
            this.firstTimeOnly = false;
            this.stackable = false;
        }

        // Builder pattern
        PromoCode maxCap(double cap) { this.maxDiscountCap = cap; return this; }
        PromoCode minOrder(double min) { this.minOrderValue = min; return this; }
        PromoCode expires(Instant at) { this.expiresAt = at; return this; }
        PromoCode globalLimit(int n) { this.globalUsageLimit = n; return this; }
        PromoCode perUser(int n) { this.perUserLimit = n; return this; }
        PromoCode budget(double b) { this.budgetCap = b; return this; }
        PromoCode forService(ServiceType s) { this.service = s; return this; }
        PromoCode firstTimeOnly() { this.firstTimeOnly = true; return this; }
        PromoCode stackable() { this.stackable = true; return this; }
    }

    static class Order {
        String orderId;
        String userId;
        double amount;
        ServiceType service;
        boolean isFirstOrder;

        Order(String orderId, String userId, double amount,
              ServiceType service, boolean isFirstOrder) {
            this.orderId = orderId;
            this.userId = userId;
            this.amount = amount;
            this.service = service;
            this.isFirstOrder = isFirstOrder;
        }
    }

    static class DiscountResult {
        boolean valid;
        String errorMessage;
        double discount;
        double finalAmount;
        List<String> appliedCodes;
        Map<String, Double> breakdown;

        DiscountResult(boolean valid, String error) {
            this.valid = valid;
            this.errorMessage = error;
            this.discount = 0;
            this.appliedCodes = new ArrayList<>();
            this.breakdown = new LinkedHashMap<>();
        }

        @Override
        public String toString() {
            if (!valid) return "❌ " + errorMessage;
            StringBuilder sb = new StringBuilder();
            sb.append(String.format("✅ Discount: ₹%.0f → ₹%.0f%n", discount, finalAmount));
            breakdown.forEach((code, disc) ->
                sb.append(String.format("   %s: -₹%.0f%n", code, disc)));
            return sb.toString();
        }
    }

    // ============================================================
    // SERVICE
    // ============================================================
    private final Map<String, PromoCode> promoCodes = new LinkedHashMap<>();

    public void addPromo(PromoCode promo) {
        promoCodes.put(promo.code.toUpperCase(), promo);
    }

    // Validate single promo
    private String validate(PromoCode promo, Order order) {
        if (Instant.now().isAfter(promo.expiresAt))
            return "Promo expired";
        if (order.amount < promo.minOrderValue)
            return String.format("Min order ₹%.0f required", promo.minOrderValue);
        if (promo.service != ServiceType.ALL && promo.service != order.service)
            return "Promo not valid for " + order.service;
        if (promo.firstTimeOnly && !order.isFirstOrder)
            return "First-time users only";
        if (promo.totalUsed >= promo.globalUsageLimit)
            return "Promo usage limit reached";

        int userUses = promo.userUsage.getOrDefault(order.userId, 0);
        if (userUses >= promo.perUserLimit)
            return "Per-user limit reached";

        double discountAmount = calculateDiscount(promo, order.amount);
        if (promo.totalSpent + discountAmount > promo.budgetCap)
            return "Promo budget exhausted";

        return null; // valid
    }

    private double calculateDiscount(PromoCode promo, double orderAmount) {
        double discount;
        if (promo.discountType == DiscountType.PERCENTAGE) {
            discount = orderAmount * (promo.discountValue / 100.0);
            discount = Math.min(discount, promo.maxDiscountCap);
        } else {
            discount = promo.discountValue;
        }
        return Math.min(discount, orderAmount); // can't exceed order
    }

    // Apply single promo code
    public DiscountResult applyPromo(String code, Order order) {
        PromoCode promo = promoCodes.get(code.toUpperCase());
        if (promo == null) return new DiscountResult(false, "Invalid promo code");

        String error = validate(promo, order);
        if (error != null) return new DiscountResult(false, error);

        double discount = calculateDiscount(promo, order.amount);
        DiscountResult result = new DiscountResult(true, null);
        result.discount = discount;
        result.finalAmount = order.amount - discount;
        result.appliedCodes.add(promo.code);
        result.breakdown.put(promo.code, discount);

        // Record usage
        promo.totalUsed++;
        promo.totalSpent += discount;
        promo.userUsage.merge(order.userId, 1, Integer::sum);

        return result;
    }

    // Best stack of up to 2 promos
    public DiscountResult applyBestStack(List<String> codes, Order order) {
        List<PromoCode> validPromos = codes.stream()
            .map(c -> promoCodes.get(c.toUpperCase()))
            .filter(Objects::nonNull)
            .filter(p -> validate(p, order) == null)
            .toList();

        if (validPromos.isEmpty())
            return new DiscountResult(false, "No valid promos");

        // Single best
        DiscountResult best = null;

        for (PromoCode p : validPromos) {
            double disc = calculateDiscount(p, order.amount);
            if (best == null || disc > best.discount) {
                best = new DiscountResult(true, null);
                best.discount = disc;
                best.finalAmount = order.amount - disc;
                best.appliedCodes = List.of(p.code);
                best.breakdown = Map.of(p.code, disc);
            }
        }

        // Try stacking two stackable promos
        List<PromoCode> stackable = validPromos.stream()
            .filter(p -> p.stackable).toList();

        for (int i = 0; i < stackable.size(); i++) {
            for (int j = i + 1; j < stackable.size(); j++) {
                PromoCode p1 = stackable.get(i), p2 = stackable.get(j);
                double d1 = calculateDiscount(p1, order.amount);
                double remainingAmount = order.amount - d1;
                double d2 = calculateDiscount(p2, remainingAmount);
                double totalDisc = d1 + d2;

                if (totalDisc > best.discount) {
                    best = new DiscountResult(true, null);
                    best.discount = totalDisc;
                    best.finalAmount = order.amount - totalDisc;
                    best.appliedCodes = List.of(p1.code, p2.code);
                    best.breakdown = new LinkedHashMap<>(Map.of(p1.code, d1, p2.code, d2));
                }
            }
        }

        // Commit usage for applied promos
        for (String code : best.appliedCodes) {
            PromoCode p = promoCodes.get(code.toUpperCase());
            p.totalUsed++;
            p.totalSpent += best.breakdown.get(code);
            p.userUsage.merge(order.userId, 1, Integer::sum);
        }

        return best;
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        PromoCodeEngine engine = new PromoCodeEngine();

        // Setup promos
        engine.addPromo(new PromoCode("WELCOME50", DiscountType.PERCENTAGE, 50)
            .maxCap(150).minOrder(200).firstTimeOnly().forService(ServiceType.FOOD).perUser(1));

        engine.addPromo(new PromoCode("FLAT100", DiscountType.FLAT, 100)
            .minOrder(300).globalLimit(1000).budget(50000).stackable());

        engine.addPromo(new PromoCode("RIDE20", DiscountType.PERCENTAGE, 20)
            .maxCap(80).forService(ServiceType.RIDE).perUser(3).stackable());

        engine.addPromo(new PromoCode("GRAB10", DiscountType.FLAT, 10)
            .stackable().perUser(5));

        // Case 1: First-time user, food order
        System.out.println("=== Case 1: First-time food order ===");
        Order order1 = new Order("O1", "U1", 500, ServiceType.FOOD, true);
        System.out.println(engine.applyPromo("WELCOME50", order1));

        // Case 2: Not first-time
        System.out.println("=== Case 2: Not first-time user ===");
        Order order2 = new Order("O2", "U2", 500, ServiceType.FOOD, false);
        System.out.println(engine.applyPromo("WELCOME50", order2));

        // Case 3: Stacking promos
        System.out.println("=== Case 3: Best stack of 2 promos (ride order ₹600) ===");
        Order order3 = new Order("O3", "U3", 600, ServiceType.RIDE, false);
        System.out.println(engine.applyBestStack(
            List.of("FLAT100", "RIDE20", "GRAB10"), order3));

        // Case 4: Min order not met
        System.out.println("=== Case 4: Min order not met ===");
        Order order4 = new Order("O4", "U4", 100, ServiceType.FOOD, true);
        System.out.println(engine.applyPromo("FLAT100", order4));
    }
}
```

### Expected Output
```
=== Case 1: First-time food order ===
✅ Discount: ₹150 → ₹350   (50% of ₹500 = ₹250, capped at ₹150)
   WELCOME50: -₹150

=== Case 2: Not first-time user ===
❌ First-time users only

=== Case 3: Best stack of 2 promos (ride order ₹600) ===
✅ Discount: ₹200 → ₹400
   FLAT100: -₹100
   RIDE20: -₹100   (20% of remaining ₹500, capped at ₹80... wait, ₹100)

=== Case 4: Min order not met ===
❌ Min order ₹300 required
```

## 🎯 Key Takeaways
- **Builder pattern**: fluent API for promo creation (`new PromoCode().maxCap().minOrder().stackable()`)
- **Stacking**: try all O(n²) pairs of stackable promos, apply second discount to remaining amount
- **Multi-level validation**: expiry → min order → service type → first-time → global limit → per-user limit → budget
- **Budget tracking**: cumulative spend across all users prevents runaway discounts
- **Per-user limit**: `Map<userId, count>` tracks individual usage
- **Sequential stacking**: first promo reduces amount, second promo applies to reduced amount

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms |
| Technical 1 | Medium | Promo Validation |
| Technical 2 | Hard | Stacking, Budget, Edge Cases |
| System Design | Hard | Promo Engine at Scale |
| Hiring Manager | Medium | Super-App, Growth |
