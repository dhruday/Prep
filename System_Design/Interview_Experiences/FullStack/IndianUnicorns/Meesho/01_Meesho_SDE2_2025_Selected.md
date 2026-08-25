# Meesho — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 |
| **YOE** | 3 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/meesho-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + DSA + HLD)
- **Timeline:** 10 days
- **Format:** Virtual

---

## Round 1: Online Assessment
**Duration:** 75 minutes

### Questions Asked
1. **Spiral Matrix** (LeetCode 54)
2. **Maximum Sum Circular Subarray** (LeetCode 918)

### 💡 Interview-Ready Answer — Spiral Matrix

```java
public List<Integer> spiralOrder(int[][] matrix) {
    List<Integer> result = new ArrayList<>();
    if (matrix.length == 0) return result;
    
    int top = 0, bottom = matrix.length - 1;
    int left = 0, right = matrix[0].length - 1;
    
    while (top <= bottom && left <= right) {
        // Traverse right
        for (int j = left; j <= right; j++) result.add(matrix[top][j]);
        top++;
        
        // Traverse down
        for (int i = top; i <= bottom; i++) result.add(matrix[i][right]);
        right--;
        
        // Traverse left
        if (top <= bottom) {
            for (int j = right; j >= left; j--) result.add(matrix[bottom][j]);
            bottom--;
        }
        
        // Traverse up
        if (left <= right) {
            for (int i = bottom; i >= top; i--) result.add(matrix[i][left]);
            left++;
        }
    }
    return result;
}
```

### 💡 Interview-Ready Answer — Maximum Sum Circular Subarray

```java
public int maxSubarraySumCircular(int[] nums) {
    int totalSum = 0;
    int maxSum = Integer.MIN_VALUE, curMax = 0;
    int minSum = Integer.MAX_VALUE, curMin = 0;
    
    for (int num : nums) {
        totalSum += num;
        
        // Standard Kadane's for max subarray
        curMax = Math.max(curMax + num, num);
        maxSum = Math.max(maxSum, curMax);
        
        // Kadane's for min subarray
        curMin = Math.min(curMin + num, num);
        minSum = Math.min(minSum, curMin);
    }
    
    // If all elements are negative, maxSum is the answer (can't wrap)
    if (maxSum < 0) return maxSum;
    
    // Max circular = total - minSubarray (the "wrap-around" case)
    return Math.max(maxSum, totalSum - minSum);
}
```
**Key Insight:** Circular max subarray = total sum - minimum subarray (because removing min from total gives max circular).

---

## Round 2: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Design a Coupon System**
   - Create coupons (flat/percentage/BOGO), apply to cart, validate constraints (min order, max uses, expiry)

### 💡 Interview-Ready Answer

```java
enum CouponType { FLAT, PERCENTAGE, BOGO }
enum CouponStatus { ACTIVE, EXPIRED, EXHAUSTED }

class Coupon {
    String couponCode;
    CouponType type;
    double value;           // flat amount or percentage
    double minOrderValue;
    double maxDiscount;     // cap for percentage coupons
    int maxUsesTotal;       // total across all users
    int maxUsesPerUser;     // per user limit
    LocalDateTime validFrom;
    LocalDateTime validTo;
    Set<String> applicableCategories; // null = all categories
    int currentUses;
    
    CouponStatus getStatus() {
        if (LocalDateTime.now().isAfter(validTo)) return CouponStatus.EXPIRED;
        if (currentUses >= maxUsesTotal) return CouponStatus.EXHAUSTED;
        return CouponStatus.ACTIVE;
    }
}

class CouponService {
    Map<String, Coupon> coupons = new HashMap<>();
    Map<String, Map<String, Integer>> userCouponUsage = new HashMap<>(); // userId → {couponCode → count}
    
    // Validate coupon applicability
    ValidationResult validate(String couponCode, String userId, Cart cart) {
        Coupon coupon = coupons.get(couponCode);
        if (coupon == null) return ValidationResult.fail("Invalid coupon code");
        if (coupon.getStatus() != CouponStatus.ACTIVE) return ValidationResult.fail("Coupon " + coupon.getStatus());
        if (LocalDateTime.now().isBefore(coupon.validFrom)) return ValidationResult.fail("Coupon not yet active");
        if (cart.subtotal() < coupon.minOrderValue) 
            return ValidationResult.fail("Minimum order value: ₹" + coupon.minOrderValue);
        
        // Check per-user usage
        int userUses = userCouponUsage
            .getOrDefault(userId, Collections.emptyMap())
            .getOrDefault(couponCode, 0);
        if (userUses >= coupon.maxUsesPerUser) return ValidationResult.fail("Coupon already used");
        
        // Check category applicability
        if (coupon.applicableCategories != null) {
            boolean hasApplicableItem = cart.items.values().stream()
                .anyMatch(item -> coupon.applicableCategories.contains(item.category));
            if (!hasApplicableItem) return ValidationResult.fail("Coupon not applicable to cart items");
        }
        
        return ValidationResult.success(calculateDiscount(coupon, cart));
    }
    
    double calculateDiscount(Coupon coupon, Cart cart) {
        switch (coupon.type) {
            case FLAT:
                return Math.min(coupon.value, cart.subtotal());
            case PERCENTAGE:
                double discount = cart.subtotal() * coupon.value / 100;
                return Math.min(discount, coupon.maxDiscount);
            case BOGO:
                // Buy cheapest free
                return cart.items.values().stream()
                    .mapToDouble(i -> i.unitPrice)
                    .min().orElse(0);
            default:
                return 0;
        }
    }
    
    // Apply coupon (thread-safe)
    synchronized ApplyResult applyCoupon(String couponCode, String userId, Cart cart) {
        ValidationResult validation = validate(couponCode, userId, cart);
        if (!validation.isValid()) return ApplyResult.fail(validation.message);
        
        Coupon coupon = coupons.get(couponCode);
        coupon.currentUses++;
        userCouponUsage.computeIfAbsent(userId, k -> new HashMap<>())
            .merge(couponCode, 1, Integer::sum);
        
        return ApplyResult.success(validation.discount);
    }
}
```

---

## Round 3: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Kth Largest Element in Array** (LeetCode 215) — Quick Select
2. **Longest Increasing Subsequence** (LeetCode 300) — O(n log n) solution

### 💡 Interview-Ready Answer — LIS in O(n log n)

```java
public int lengthOfLIS(int[] nums) {
    // tails[i] = smallest tail element for IS of length i+1
    List<Integer> tails = new ArrayList<>();
    
    for (int num : nums) {
        int pos = Collections.binarySearch(tails, num);
        if (pos < 0) pos = -(pos + 1); // insertion point
        
        if (pos == tails.size()) {
            tails.add(num); // extend longest IS
        } else {
            tails.set(pos, num); // replace with smaller tail
        }
    }
    return tails.size();
}
```
**Time:** O(n log n), **Space:** O(n)

**Why this works:** `tails` maintains the smallest possible ending element for each LIS length. Binary search finds where to place each element. The length of `tails` is the LIS length.

---

## Round 4: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Meesho's Product Catalog and Search**
   - Social commerce, resellers, multi-lingual, personalization, low-bandwidth users

### 💡 Interview-Ready Answer

```
Unique Meesho Challenges:
1. Tier-2/3 city users → low bandwidth, low-end devices
2. Resellers share products via WhatsApp → need shareable product cards
3. Multi-lingual (Hindi, Tamil, Telugu, Bengali, Kannada)
4. Social discovery > search (users browse, don't search)

Architecture:
┌──────────────────────────────────────────────────────────┐
│  Mobile App (React Native — lite version for low-end)    │
│  - Image lazy loading, WebP, progressive JPEG             │
│  - Offline catalog caching (SQLite)                       │
│  - Share product as image card (for WhatsApp sharing)     │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  Catalog Service                                          │
│  - Product CRUD                                           │
│  - Multi-lingual support (i18n)                          │
│  - Image processing pipeline (resize, compress, WebP)    │
│  - SEO-friendly URLs                                     │
│                                                           │
│  Search Service (Elasticsearch)                           │
│  - Multi-lingual analyzer (Hindi, Tamil, etc.)           │
│  - Fuzzy search + spell check                            │
│  - Category-based browsing (more important than search)  │
│                                                           │
│  Recommendation Service                                   │
│  - "Trending in your city" (Tier 2/3 specific)           │
│  - "Similar products at lower price"                     │
│  - "What resellers in your network are selling"          │
└──────────────────────────────────────────────────────────┘
```

#### Low-Bandwidth Optimization
```
1. Image optimization:
   - Generate 3 sizes: thumbnail (100px), medium (300px), full (800px)
   - WebP format (30% smaller than JPEG)
   - Progressive JPEG (appears immediately, sharpens over time)
   - CDN with edge caching (PoP in Tier-2 cities)

2. API optimization:
   - GraphQL for precise data fetching (no over-fetching)
   - Compressed responses (Brotli)
   - Incremental sync: only send changes since last fetch
   - Pagination: 20 items per page (not infinite scroll — saves data)

3. Offline mode:
   - Cache last browsed 100 products in SQLite
   - Queue actions (add to cart, wishlist) → sync when online
   - Show cached products with "prices may have changed" notice
```

---

## 🎯 Key Takeaways
- Meesho interviews focus on **social commerce + Tier-2/3 optimization**
- **Coupon System** is the most common Meesho machine coding question
- **Circular Subarray** = Kadane's + inverse trick — elegant and frequently asked
- **LIS in O(n log n)** with patience sorting / binary search — must-know for SDE-2
- **Low-bandwidth optimization** differentiates Meesho from other e-commerce companies
- **Multi-lingual search** with Elasticsearch analyzers is a unique requirement

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium-Hard | Matrix, Kadane's variant |
| Machine Coding | Medium-Hard | OOP, Business Rules, Thread Safety |
| DSA | Medium-Hard | Quick Select, Binary Search (LIS) |
| System Design | Hard | Social Commerce, i18n, Low-Bandwidth |
