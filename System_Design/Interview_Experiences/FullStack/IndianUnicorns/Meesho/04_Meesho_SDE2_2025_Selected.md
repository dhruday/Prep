# Meesho — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | SDE-2 FullStack |
| **Level** | Mid-Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/meesho-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Coding + System Design + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Group Anagrams** (LeetCode 49) — Hash map with sorted key
2. **Follow-up: Can you avoid sorting? Use character frequency as key**

### 💡 Group Anagrams

```java
// Approach 1: Sorted key O(n × k log k)
List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    
    for (String s : strs) {
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        String key = new String(chars);
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    
    return new ArrayList<>(groups.values());
}

// Approach 2: Character count key O(n × k) — avoids sorting
List<List<String>> groupAnagramsOptimal(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    
    for (String s : strs) {
        int[] count = new int[26];
        for (char c : s.toCharArray()) count[c - 'a']++;
        
        // Build key from frequency array: "1#0#0#...#0#" for "a"
        StringBuilder keyBuilder = new StringBuilder();
        for (int i = 0; i < 26; i++) {
            keyBuilder.append(count[i]).append('#');
        }
        String key = keyBuilder.toString();
        
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    
    return new ArrayList<>(groups.values());
}
// Why '#' separator? "1|11" vs "11|1" would collide with just concatenation
// With '#': "1#11#" vs "11#1#" → distinct keys
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Meesho's Social Commerce Platform**
   - Resellers browse product catalog → share to WhatsApp/Facebook → earn commission
   - Product listing from suppliers with pricing tiers
   - Commission calculation with reseller pricing markup
   - Order flow: Customer → Reseller's link → Meesho → Supplier
   - Catalog sharing: generate shareable images with reseller's markup price
   - Analytics: reseller dashboard with earnings, orders, top products

### 💡 Key Design

```
Architecture:
┌──────────────┐  WhatsApp/FB share  ┌──────────────┐
│  Reseller    │────────────────────▶│  Customer    │
│  (Meesho App)│                     │  (buys via    │
│              │◀────── commission ───│   shared link)│
└──────┬───────┘                     └──────┬───────┘
       │                                     │  Order
  ┌────▼──────────────────────────────────────▼────────┐
  │                     Meesho Platform                 │
  │  ┌───────────┐  ┌──────────────┐  ┌─────────────┐ │
  │  │ Catalog   │  │ Order        │  │ Commission  │ │
  │  │ Service   │  │ Service      │  │ Engine      │ │
  │  └───────────┘  └──────────────┘  └─────────────┘ │
  │  ┌───────────┐  ┌──────────────┐  ┌─────────────┐ │
  │  │ Share     │  │ Supplier     │  │ Analytics   │ │
  │  │ Service   │  │ Service      │  │ Service     │ │
  │  └───────────┘  └──────────────┘  └─────────────┘ │
  └────────────────────────────────────────────────────┘
         │                                │
    ┌────▼────────┐                  ┌────▼────────┐
    │ Supplier     │                  │ Logistics   │
    │ (fulfills)   │                  │ (delivery)  │
    └──────────────┘                  └─────────────┘

Commission and Pricing:
class CommissionEngine {
    // Reseller sets their own price (markup over Meesho's base price)
    // Commission = Customer Price - Meesho Price - Platform Fee
    
    CommissionResult calculateCommission(String resellerId, String productId, BigDecimal sellingPrice) {
        Product product = productService.getProduct(productId);
        Reseller reseller = resellerService.get(resellerId);
        
        BigDecimal basePrice = product.getMeeshoPrice(); // Meesho's listed price
        BigDecimal minResalePrice = basePrice; // Can't sell below Meesho price
        
        if (sellingPrice.compareTo(minResalePrice) < 0) {
            throw new InvalidPriceException("Cannot set price below ₹" + minResalePrice);
        }
        
        // Calculate commission components
        BigDecimal grossMargin = sellingPrice.subtract(basePrice);
        BigDecimal platformFee = sellingPrice.multiply(new BigDecimal("0.05")); // 5% platform fee
        BigDecimal gst = platformFee.multiply(new BigDecimal("0.18")); // 18% GST on platform fee
        BigDecimal shippingCost = calculateShipping(product.getWeight(), product.getCategory());
        
        BigDecimal netCommission = grossMargin.subtract(platformFee).subtract(gst);
        
        // Bonus commission for high-volume resellers
        if (reseller.getTier() == ResellerTier.GOLD) {
            netCommission = netCommission.add(basePrice.multiply(new BigDecimal("0.02"))); // +2%
        }
        
        return CommissionResult.builder()
            .resellerId(resellerId)
            .productId(productId)
            .sellingPrice(sellingPrice)
            .meeshoPrice(basePrice)
            .grossMargin(grossMargin)
            .platformFee(platformFee)
            .gst(gst)
            .netCommission(netCommission.max(BigDecimal.ZERO))
            .build();
    }
}

Share Service (Generate Shareable Product Image):
class ShareService {
    // Generate image with reseller's custom price overlaid
    ShareResult generateShareableContent(String resellerId, String productId, BigDecimal customPrice) {
        Product product = productService.getProduct(productId);
        
        // 1. Generate tracking link (unique to reseller)
        String trackingLink = generateTrackingLink(resellerId, productId);
        // e.g., https://meesho.com/p/12345?ref=RESELLER_ABC
        
        // 2. Generate product image with price overlay
        // (uses image processing service — overlays custom price on product image)
        byte[] shareImage = imageService.generateProductCard(
            product.getImageUrl(),
            product.getName(),
            customPrice,
            product.getOriginalMRP(), // Strikethrough MRP
            calculateDiscount(customPrice, product.getOriginalMRP())
        );
        
        // 3. Store share event for analytics
        analyticsService.recordShare(resellerId, productId, SharePlatform.WHATSAPP);
        
        return ShareResult.builder()
            .imageBytes(shareImage)
            .trackingLink(trackingLink)
            .caption(String.format("🔥 %s at just ₹%s! (MRP ₹%s) — %d%% off!\n%s",
                product.getName(), customPrice, product.getOriginalMRP(),
                calculateDiscount(customPrice, product.getOriginalMRP()),
                trackingLink))
            .build();
    }
    
    // Attribution: when customer clicks tracking link
    void attributeOrder(String orderId, String trackingLink) {
        TrackingInfo info = decodeTrackingLink(trackingLink);
        
        orderService.setReseller(orderId, info.getResellerId());
        commissionService.createPendingCommission(orderId, info.getResellerId());
    }
}

Order Flow with Commission Lifecycle:
1. Customer clicks reseller's link → order placed with reseller attribution
2. Order confirmed → Commission status: PENDING
3. Supplier ships → Commission status: PROCESSING
4. Customer receives & return window passes (7 days) → Commission status: APPROVED
5. Weekly payout cycle → Commission status: PAID (bank transfer)
6. If customer returns → Commission status: REVERSED

Reseller Analytics Dashboard:
- Total earnings (today / this week / this month)
- Orders count + conversion rate (clicks → orders)
- Top performing products (by commission earned)
- Commission breakdown per order
- Payout history + upcoming payout estimate
- Performance tier: Bronze → Silver → Gold → Platinum (based on monthly sales)
```

---

## 🎯 Key Takeaways
- Meesho = **social commerce domain + commission calculation + attribution + share mechanics**
- **Group Anagrams**: frequency array key avoids O(k log k) sorting → O(k) per string
- **Key separator**: use `#` between counts to avoid collisions (e.g., "1|11" vs "11|1")
- **Commission model**: sellingPrice - meeshoPrice - platformFee(5%) - GST(18% on fee) = net commission
- **Attribution via tracking links**: reseller ID embedded in shared URL → order attributed on purchase
- **Commission lifecycle**: PENDING → PROCESSING → APPROVED (after return window) → PAID
- **Reseller tiers**: volume-based tiers (Bronze → Platinum) with escalating commission bonuses
- Meesho interviews: know the social commerce model — resellers, suppliers, attribution, sharing

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA + SQL |
| Coding | Medium | Group Anagrams, HashMap |
| System Design | Hard | Social Commerce, Commission, Attribution |
| HM | Medium | Ownership, Growth |
