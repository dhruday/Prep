# Flipkart — SDE-3 FullStack Interview Experience (2025) — #8

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Supply Chain |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Rule Engine for Dynamic Pricing
**Duration:** 90 minutes

### Challenge: Build a rule engine that evaluates pricing rules dynamically. Each rule has conditions (category, brand, seller rating, stock level) and actions (discount %, max cap, min price).

```java
import java.util.*;
import java.util.function.Predicate;

/**
 * Rule Engine for Dynamic Pricing:
 * 
 * A rule consists of:
 *   - Conditions: predicates that check product attributes
 *   - Priority: higher priority rules evaluated first
 *   - Action: discount calculation (percentage, flat, max cap, min price)
 *   - Combinability: whether it stacks with other rules
 * 
 * Evaluation: 
 *   1. Filter rules whose conditions match the product
 *   2. Sort by priority (highest first)
 *   3. Apply: if combinable, stack discounts; if not, take best
 *   4. Never go below min price or above max discount
 */

class Product {
    String id;
    String name;
    String category;
    String brand;
    double basePrice;
    double sellerRating; // 1-5
    int stockLevel;
    String sellerId;
    Map<String, Object> attributes; // Extra attributes for flexible rules
    
    Product(String id, String name, String category, String brand, 
            double basePrice, double sellerRating, int stockLevel) {
        this.id = id; this.name = name; this.category = category;
        this.brand = brand; this.basePrice = basePrice;
        this.sellerRating = sellerRating; this.stockLevel = stockLevel;
        this.attributes = new HashMap<>();
    }
}

enum ConditionOperator { EQ, NEQ, GT, GTE, LT, LTE, IN, CONTAINS }
enum DiscountType { PERCENTAGE, FLAT }

class Condition {
    String field;          // "category", "brand", "sellerRating", "stockLevel", etc.
    ConditionOperator operator;
    Object value;          // Single value or List for IN operator
    
    Condition(String field, ConditionOperator op, Object value) {
        this.field = field; this.operator = op; this.value = value;
    }
    
    /**
     * Evaluate condition against a product.
     */
    boolean evaluate(Product product) {
        Object fieldValue = getFieldValue(product, this.field);
        if (fieldValue == null) return false;
        
        switch (operator) {
            case EQ:  return fieldValue.equals(value);
            case NEQ: return !fieldValue.equals(value);
            case GT:  return toDouble(fieldValue) > toDouble(value);
            case GTE: return toDouble(fieldValue) >= toDouble(value);
            case LT:  return toDouble(fieldValue) < toDouble(value);
            case LTE: return toDouble(fieldValue) <= toDouble(value);
            case IN:  return value instanceof List && ((List<?>) value).contains(fieldValue);
            case CONTAINS: return String.valueOf(fieldValue).contains(String.valueOf(value));
            default: return false;
        }
    }
    
    private Object getFieldValue(Product product, String field) {
        switch (field) {
            case "category": return product.category;
            case "brand": return product.brand;
            case "basePrice": return product.basePrice;
            case "sellerRating": return product.sellerRating;
            case "stockLevel": return product.stockLevel;
            case "sellerId": return product.sellerId;
            default: return product.attributes.get(field);
        }
    }
    
    private double toDouble(Object obj) {
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        return Double.parseDouble(String.valueOf(obj));
    }
}

class PricingRule {
    String id;
    String name;
    List<Condition> conditions;  // ALL conditions must be true (AND logic)
    DiscountType discountType;
    double discountValue;        // Percentage (0-100) or flat amount
    double maxDiscountCap;       // Maximum discount in absolute terms
    double minSellingPrice;      // Never go below this price
    int priority;                // Higher = evaluated first
    boolean combinable;          // Can stack with other rules
    boolean active;
    long validFrom;
    long validTo;
    
    PricingRule(String id, String name, int priority) {
        this.id = id; this.name = name; this.priority = priority;
        this.conditions = new ArrayList<>();
        this.combinable = false;
        this.active = true;
        this.maxDiscountCap = Double.MAX_VALUE;
        this.minSellingPrice = 0;
        this.validFrom = 0;
        this.validTo = Long.MAX_VALUE;
    }
    
    boolean matches(Product product) {
        if (!active) return false;
        long now = System.currentTimeMillis();
        if (now < validFrom || now > validTo) return false;
        
        // ALL conditions must match (AND logic)
        return conditions.stream().allMatch(c -> c.evaluate(product));
    }
    
    double calculateDiscount(double basePrice) {
        double discount;
        if (discountType == DiscountType.PERCENTAGE) {
            discount = basePrice * discountValue / 100.0;
        } else {
            discount = discountValue;
        }
        
        // Apply cap
        discount = Math.min(discount, maxDiscountCap);
        
        // Never go below min selling price
        double maxAllowedDiscount = basePrice - minSellingPrice;
        discount = Math.min(discount, Math.max(0, maxAllowedDiscount));
        
        return discount;
    }
}

class PricingResult {
    double originalPrice;
    double finalPrice;
    double totalDiscount;
    List<String> appliedRules;
    
    PricingResult(double original) {
        this.originalPrice = original;
        this.finalPrice = original;
        this.totalDiscount = 0;
        this.appliedRules = new ArrayList<>();
    }
}

class PricingEngine {
    private final List<PricingRule> rules = new ArrayList<>();
    
    public void addRule(PricingRule rule) {
        rules.add(rule);
        // Keep sorted by priority (descending)
        rules.sort((a, b) -> Integer.compare(b.priority, a.priority));
    }
    
    public void removeRule(String ruleId) {
        rules.removeIf(r -> r.id.equals(ruleId));
    }
    
    /**
     * Evaluate all rules for a product and compute final price.
     * 
     * Strategy:
     * 1. Find all matching rules
     * 2. Sort by priority (already sorted)
     * 3. Apply highest-priority non-combinable rule OR stack combinable rules
     */
    public PricingResult evaluate(Product product) {
        PricingResult result = new PricingResult(product.basePrice);
        
        List<PricingRule> matchingRules = new ArrayList<>();
        for (PricingRule rule : rules) {
            if (rule.matches(product)) {
                matchingRules.add(rule);
            }
        }
        
        if (matchingRules.isEmpty()) return result;
        
        // Separate combinable and non-combinable rules
        PricingRule bestNonCombinable = null;
        double bestNonCombinableDiscount = 0;
        
        List<PricingRule> combinableRules = new ArrayList<>();
        
        for (PricingRule rule : matchingRules) {
            if (rule.combinable) {
                combinableRules.add(rule);
            } else {
                double discount = rule.calculateDiscount(product.basePrice);
                if (discount > bestNonCombinableDiscount) {
                    bestNonCombinable = rule;
                    bestNonCombinableDiscount = discount;
                }
            }
        }
        
        // Compute stacked combinable discount
        double combinedDiscount = 0;
        List<String> combinedRuleNames = new ArrayList<>();
        for (PricingRule rule : combinableRules) {
            double discount = rule.calculateDiscount(product.basePrice - combinedDiscount);
            combinedDiscount += discount;
            combinedRuleNames.add(rule.name);
        }
        
        // Choose better: best non-combinable OR stacked combinable
        if (bestNonCombinableDiscount >= combinedDiscount && bestNonCombinable != null) {
            result.totalDiscount = bestNonCombinableDiscount;
            result.appliedRules.add(bestNonCombinable.name);
        } else {
            result.totalDiscount = combinedDiscount;
            result.appliedRules.addAll(combinedRuleNames);
        }
        
        result.finalPrice = Math.max(0, product.basePrice - result.totalDiscount);
        
        // Global minimum price check
        double globalMin = matchingRules.stream()
            .mapToDouble(r -> r.minSellingPrice)
            .max().orElse(0);
        
        if (result.finalPrice < globalMin) {
            result.finalPrice = globalMin;
            result.totalDiscount = product.basePrice - globalMin;
        }
        
        return result;
    }
}
```

---

## 🎯 Key Takeaways
- Flipkart SDE-3 = **Dynamic pricing rule engine — condition evaluation, priority, combinability**
- **Condition evaluation**: field + operator + value — generic, works for any product attribute
- **AND logic for conditions**: ALL must match within a rule — OR logic via separate rules
- **Priority resolution**: highest priority non-combinable wins, unless stacked combinable is better
- **Max discount cap**: `min(calculatedDiscount, maxDiscountCap)` — prevents extreme discounts
- **Min selling price**: `max(discountedPrice, minSellingPrice)` — protects margin
- **Combinable stacking**: apply discounts sequentially on reduced price — not all on base price
- Flipkart = **e-commerce** — pricing, search ranking, inventory, supply chain — expect rule engines

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Very Hard | Rule Engine, Dynamic Pricing |
| System Design | Very Hard | E-commerce at Scale |
| HM | Medium | Culture Fit |
