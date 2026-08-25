# Grab — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab |
| **Role** | Software Engineer |
| **Level** | L5 (Senior) |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Singapore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Technical — Implement a Coupon/Voucher Management System
**Duration:** 60 minutes

### Problem
Design a coupon system for a ride-hailing/food delivery app:
- Coupon types: percentage discount, flat discount, cashback
- Validity: date range, usage limits (global & per-user)
- Stacking rules (some coupons can stack, some can't)
- Best coupon auto-selection for a given order

### 💡 Interview-Ready Answer

```java
import java.math.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;

public class CouponSystem {

    enum DiscountType { PERCENTAGE, FLAT, CASHBACK }
    enum CouponCategory { RIDE, FOOD, GROCERY, ALL }

    static class Coupon {
        final String code;
        final DiscountType type;
        final BigDecimal value;         // Percentage (0-100) or flat amount
        final BigDecimal maxDiscount;   // Cap for percentage coupons
        final BigDecimal minOrderValue; // Minimum order to apply
        final CouponCategory category;
        final LocalDateTime validFrom;
        final LocalDateTime validUntil;
        final int globalUsageLimit;     // Total uses across all users
        final int perUserLimit;         // Max uses per user
        final boolean stackable;        // Can combine with other coupons

        int globalUsageCount = 0;

        Coupon(String code, DiscountType type, BigDecimal value,
               BigDecimal maxDiscount, BigDecimal minOrderValue,
               CouponCategory category, LocalDateTime validFrom,
               LocalDateTime validUntil, int globalLimit, int perUserLimit,
               boolean stackable) {
            this.code = code;
            this.type = type;
            this.value = value;
            this.maxDiscount = maxDiscount;
            this.minOrderValue = minOrderValue;
            this.category = category;
            this.validFrom = validFrom;
            this.validUntil = validUntil;
            this.globalUsageLimit = globalLimit;
            this.perUserLimit = perUserLimit;
            this.stackable = stackable;
        }
    }

    static class Order {
        String orderId;
        String userId;
        BigDecimal subtotal;
        CouponCategory category;

        Order(String orderId, String userId, BigDecimal subtotal, CouponCategory category) {
            this.orderId = orderId;
            this.userId = userId;
            this.subtotal = subtotal;
            this.category = category;
        }
    }

    static class DiscountResult {
        String couponCode;
        BigDecimal discount;
        BigDecimal finalAmount;
        String description;

        DiscountResult(String code, BigDecimal discount, BigDecimal finalAmount, String desc) {
            this.couponCode = code;
            this.discount = discount;
            this.finalAmount = finalAmount;
            this.description = desc;
        }
    }

    private final ConcurrentHashMap<String, Coupon> coupons = new ConcurrentHashMap<>();
    // userId:couponCode -> usage count
    private final ConcurrentHashMap<String, Integer> userUsage = new ConcurrentHashMap<>();

    public void addCoupon(Coupon coupon) {
        coupons.put(coupon.code.toUpperCase(), coupon);
    }

    /**
     * Apply a specific coupon to an order.
     */
    public DiscountResult applyCoupon(String couponCode, Order order) {
        Coupon coupon = coupons.get(couponCode.toUpperCase());
        if (coupon == null) {
            return new DiscountResult(couponCode, BigDecimal.ZERO, order.subtotal,
                "Invalid coupon code");
        }

        String validationError = validateCoupon(coupon, order);
        if (validationError != null) {
            return new DiscountResult(couponCode, BigDecimal.ZERO, order.subtotal,
                validationError);
        }

        BigDecimal discount = calculateDiscount(coupon, order.subtotal);
        BigDecimal finalAmount = order.subtotal.subtract(discount).max(BigDecimal.ZERO);

        // Record usage
        coupon.globalUsageCount++;
        String userKey = order.userId + ":" + coupon.code;
        userUsage.merge(userKey, 1, Integer::sum);

        return new DiscountResult(coupon.code, discount, finalAmount,
            formatDescription(coupon, discount));
    }

    /**
     * Auto-select the best coupon for an order.
     * Returns the coupon that gives maximum discount.
     */
    public DiscountResult findBestCoupon(Order order) {
        return coupons.values().stream()
            .filter(c -> validateCoupon(c, order) == null)
            .map(c -> {
                BigDecimal disc = calculateDiscount(c, order.subtotal);
                BigDecimal finalAmt = order.subtotal.subtract(disc).max(BigDecimal.ZERO);
                return new DiscountResult(c.code, disc, finalAmt,
                    formatDescription(c, disc));
            })
            .max(Comparator.comparing(r -> r.discount))
            .orElse(new DiscountResult("NONE", BigDecimal.ZERO, order.subtotal,
                "No applicable coupons"));
    }

    /**
     * Find all applicable stackable coupons and compute combined discount.
     */
    public DiscountResult findBestStackedDiscount(Order order) {
        List<Coupon> applicable = coupons.values().stream()
            .filter(c -> c.stackable && validateCoupon(c, order) == null)
            .sorted((a, b) -> calculateDiscount(b, order.subtotal)
                .compareTo(calculateDiscount(a, order.subtotal)))
            .collect(Collectors.toList());

        BigDecimal totalDiscount = BigDecimal.ZERO;
        BigDecimal remaining = order.subtotal;
        List<String> appliedCodes = new ArrayList<>();

        for (Coupon coupon : applicable) {
            BigDecimal disc = calculateDiscount(coupon, remaining);
            if (disc.compareTo(BigDecimal.ZERO) > 0) {
                totalDiscount = totalDiscount.add(disc);
                remaining = remaining.subtract(disc);
                appliedCodes.add(coupon.code);
            }
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
        }

        return new DiscountResult(
            String.join("+", appliedCodes),
            totalDiscount,
            remaining.max(BigDecimal.ZERO),
            "Stacked " + appliedCodes.size() + " coupons"
        );
    }

    private String validateCoupon(Coupon coupon, Order order) {
        LocalDateTime now = LocalDateTime.now();

        if (now.isBefore(coupon.validFrom)) return "Coupon not yet active";
        if (now.isAfter(coupon.validUntil)) return "Coupon expired";

        if (coupon.category != CouponCategory.ALL
            && coupon.category != order.category) {
            return "Coupon not valid for this order type";
        }

        if (order.subtotal.compareTo(coupon.minOrderValue) < 0) {
            return "Minimum order value: ₹" + coupon.minOrderValue;
        }

        if (coupon.globalUsageCount >= coupon.globalUsageLimit) {
            return "Coupon usage limit reached";
        }

        String userKey = order.userId + ":" + coupon.code;
        int userCount = userUsage.getOrDefault(userKey, 0);
        if (userCount >= coupon.perUserLimit) {
            return "You've already used this coupon " + userCount + " time(s)";
        }

        return null; // Valid
    }

    private BigDecimal calculateDiscount(Coupon coupon, BigDecimal orderAmount) {
        BigDecimal discount;

        switch (coupon.type) {
            case PERCENTAGE:
                discount = orderAmount.multiply(coupon.value)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                if (coupon.maxDiscount != null) {
                    discount = discount.min(coupon.maxDiscount);
                }
                break;
            case FLAT:
                discount = coupon.value.min(orderAmount);
                break;
            case CASHBACK:
                discount = coupon.value; // Cashback is credited, not subtracted
                break;
            default:
                discount = BigDecimal.ZERO;
        }

        return discount.setScale(2, RoundingMode.HALF_UP);
    }

    private String formatDescription(Coupon coupon, BigDecimal discount) {
        return switch (coupon.type) {
            case PERCENTAGE -> String.format("%s%% off (saved ₹%s)", coupon.value, discount);
            case FLAT -> String.format("₹%s off", discount);
            case CASHBACK -> String.format("₹%s cashback", discount);
        };
    }

    public static void main(String[] args) {
        CouponSystem system = new CouponSystem();
        LocalDateTime now = LocalDateTime.now();

        // Add coupons
        system.addCoupon(new Coupon("GRAB50", DiscountType.PERCENTAGE,
            BigDecimal.valueOf(50), BigDecimal.valueOf(150), BigDecimal.valueOf(200),
            CouponCategory.ALL, now.minusDays(1), now.plusDays(30), 1000, 3, false));

        system.addCoupon(new Coupon("FLAT100", DiscountType.FLAT,
            BigDecimal.valueOf(100), null, BigDecimal.valueOf(300),
            CouponCategory.FOOD, now.minusDays(1), now.plusDays(15), 500, 1, true));

        system.addCoupon(new Coupon("CASHBACK30", DiscountType.CASHBACK,
            BigDecimal.valueOf(30), null, BigDecimal.valueOf(100),
            CouponCategory.ALL, now.minusDays(1), now.plusDays(7), 2000, 5, true));

        Order order = new Order("ORD-001", "user_42", BigDecimal.valueOf(500), CouponCategory.FOOD);

        // Apply specific coupon
        System.out.println("=== Apply GRAB50 ===");
        DiscountResult r1 = system.applyCoupon("GRAB50", order);
        System.out.printf("Discount: ₹%s, Final: ₹%s (%s)%n",
            r1.discount, r1.finalAmount, r1.description);

        // Find best coupon (new order since GRAB50 used)
        Order order2 = new Order("ORD-002", "user_42", BigDecimal.valueOf(500), CouponCategory.FOOD);
        System.out.println("\n=== Best Coupon ===");
        DiscountResult best = system.findBestCoupon(order2);
        System.out.printf("Best: %s → ₹%s off (%s)%n",
            best.couponCode, best.discount, best.description);

        // Stacked discount
        System.out.println("\n=== Stacked Discount ===");
        DiscountResult stacked = system.findBestStackedDiscount(order2);
        System.out.printf("Stacked: %s → ₹%s off, Final: ₹%s%n",
            stacked.couponCode, stacked.discount, stacked.finalAmount);
    }
}
```

## 🎯 Key Takeaways
- Grab/Gojek asks **coupon/promo** system problems — core to ride-hailing & food delivery
- Three discount types: percentage (with cap), flat, cashback
- Multi-layer validation: validity period → category → min order → global limit → per-user limit
- **Best coupon auto-selection** via stream + max comparator
- Stackable coupons: apply greedily (largest discount first, reduce remaining)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Technical 1 | Medium-Hard | Domain Modeling, BigDecimal, Validation |
| Technical 2 | Hard | Graph Algorithms, DP |
| HM | Medium | Behavioral, Culture Fit |
