# Cred — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | CRED |
| **Role** | SDE-3 |
| **Level** | Lead |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/cred-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Machine Coding + DSA + LLD + System Design + Founder)
- **Timeline:** 2 weeks
- **Note:** CRED has a Founder round instead of typical HM

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Credit Card Statement Analyzer**
   - Parse a list of transactions
   - Categorize (food, travel, subscriptions, shopping, utilities)
   - Monthly spending summary with category breakdown
   - Detect recurring subscriptions (same merchant, similar amount, monthly)
   - Alert: unusual spending patterns

### 💡 Interview-Ready Answer

```java
class CreditCardAnalyzer {
    private final Map<String, Category> merchantCategoryMap; // Pre-loaded merchant → category
    
    enum Category { FOOD, TRAVEL, SHOPPING, SUBSCRIPTIONS, UTILITIES, HEALTH, ENTERTAINMENT, TRANSFER, UNCATEGORIZED }
    
    record Transaction(String id, String merchantName, BigDecimal amount, Instant date,
                        String mcc, // Merchant Category Code (Visa/Mastercard standard)
                        Category category) {}
    
    record MonthlySummary(YearMonth month, BigDecimal totalSpend, BigDecimal totalPayment,
                           Map<Category, BigDecimal> categoryBreakdown,
                           List<RecurringSubscription> subscriptions,
                           List<SpendingAlert> alerts) {}
    
    record RecurringSubscription(String merchantName, BigDecimal averageAmount,
                                   int dayOfMonth, int consecutiveMonths, Category category) {}
    
    record SpendingAlert(AlertType type, String description, BigDecimal amount) {}
    
    enum AlertType { UNUSUAL_LARGE_TXN, CATEGORY_SPIKE, NEW_SUBSCRIPTION, DUPLICATE_CHARGE }
    
    // Categorize transaction
    Category categorize(Transaction txn) {
        // 1. Try MCC (Merchant Category Code) - most accurate
        if (txn.mcc != null) {
            return mccToCategory(txn.mcc);
        }
        
        // 2. Try merchant name lookup
        String normalizedMerchant = txn.merchantName.toLowerCase().trim();
        Category cached = merchantCategoryMap.get(normalizedMerchant);
        if (cached != null) return cached;
        
        // 3. Keyword-based fallback
        if (normalizedMerchant.matches(".*(swiggy|zomato|uber eats|dominos).*")) return Category.FOOD;
        if (normalizedMerchant.matches(".*(uber|ola|irctc|makemytrip|goibibo).*")) return Category.TRAVEL;
        if (normalizedMerchant.matches(".*(netflix|spotify|hotstar|prime|youtube).*")) return Category.SUBSCRIPTIONS;
        if (normalizedMerchant.matches(".*(amazon|flipkart|myntra|ajio).*")) return Category.SHOPPING;
        if (normalizedMerchant.matches(".*(airtel|jio|bescom|bwssb).*")) return Category.UTILITIES;
        
        return Category.UNCATEGORIZED;
    }
    
    // Detect recurring subscriptions
    List<RecurringSubscription> detectSubscriptions(List<Transaction> transactions) {
        // Group by merchant → sort by date → check monthly pattern
        Map<String, List<Transaction>> byMerchant = transactions.stream()
            .collect(Collectors.groupingBy(t -> t.merchantName.toLowerCase()));
        
        List<RecurringSubscription> subs = new ArrayList<>();
        
        for (var entry : byMerchant.entrySet()) {
            List<Transaction> merchantTxns = entry.getValue().stream()
                .sorted(Comparator.comparing(Transaction::date))
                .toList();
            
            if (merchantTxns.size() < 3) continue; // Need at least 3 months
            
            // Check if transactions are roughly monthly and similar amounts
            boolean isRecurring = true;
            BigDecimal avgAmount = BigDecimal.ZERO;
            int consecutiveMonths = 0;
            
            for (int i = 1; i < merchantTxns.size(); i++) {
                long daysBetween = Duration.between(merchantTxns.get(i-1).date, merchantTxns.get(i).date).toDays();
                BigDecimal amountDiff = merchantTxns.get(i).amount.subtract(merchantTxns.get(i-1).amount).abs();
                BigDecimal percentDiff = amountDiff.divide(merchantTxns.get(i-1).amount, 2, RoundingMode.HALF_UP);
                
                // Monthly: 25-35 days apart, amount within 10% tolerance (for tax changes)
                if (daysBetween >= 25 && daysBetween <= 35 && percentDiff.compareTo(new BigDecimal("0.10")) <= 0) {
                    consecutiveMonths++;
                } else {
                    isRecurring = false;
                    break;
                }
            }
            
            if (isRecurring && consecutiveMonths >= 2) {
                avgAmount = merchantTxns.stream()
                    .map(Transaction::amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(merchantTxns.size()), 2, RoundingMode.HALF_UP);
                
                int avgDay = (int) merchantTxns.stream()
                    .mapToInt(t -> LocalDate.ofInstant(t.date, ZoneId.systemDefault()).getDayOfMonth())
                    .average()
                    .orElse(1);
                
                subs.add(new RecurringSubscription(entry.getKey(), avgAmount, avgDay, consecutiveMonths, categorize(merchantTxns.get(0))));
            }
        }
        
        return subs;
    }
    
    // Detect spending anomalies
    List<SpendingAlert> detectAlerts(List<Transaction> currentMonth, List<Transaction> history) {
        List<SpendingAlert> alerts = new ArrayList<>();
        
        // 1. Unusually large transaction (> 3x average)
        BigDecimal avgTxnAmount = history.stream()
            .map(Transaction::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .divide(BigDecimal.valueOf(Math.max(history.size(), 1)), 2, RoundingMode.HALF_UP);
        
        BigDecimal threshold = avgTxnAmount.multiply(BigDecimal.valueOf(3));
        
        for (Transaction txn : currentMonth) {
            if (txn.amount.compareTo(threshold) > 0) {
                alerts.add(new SpendingAlert(AlertType.UNUSUAL_LARGE_TXN,
                    txn.merchantName + ": ₹" + txn.amount + " (avg: ₹" + avgTxnAmount + ")",
                    txn.amount));
            }
        }
        
        // 2. Category spike (current month > 1.5x last 3 month average)
        Map<Category, BigDecimal> currentByCategory = currentMonth.stream()
            .collect(Collectors.groupingBy(this::categorize,
                Collectors.reducing(BigDecimal.ZERO, Transaction::amount, BigDecimal::add)));
        
        Map<Category, BigDecimal> avgByCategory = calculateCategoryAverages(history, 3);
        
        for (var entry : currentByCategory.entrySet()) {
            BigDecimal avg = avgByCategory.getOrDefault(entry.getKey(), BigDecimal.ONE);
            if (entry.getValue().compareTo(avg.multiply(BigDecimal.valueOf(1.5))) > 0) {
                alerts.add(new SpendingAlert(AlertType.CATEGORY_SPIKE,
                    entry.getKey() + " spending ₹" + entry.getValue() + " vs avg ₹" + avg,
                    entry.getValue()));
            }
        }
        
        // 3. Duplicate charges (same merchant, same amount, within 5 minutes)
        for (int i = 0; i < currentMonth.size(); i++) {
            for (int j = i + 1; j < currentMonth.size(); j++) {
                Transaction a = currentMonth.get(i), b = currentMonth.get(j);
                if (a.merchantName.equals(b.merchantName) && a.amount.equals(b.amount) &&
                    Duration.between(a.date, b.date).toMinutes() < 5) {
                    alerts.add(new SpendingAlert(AlertType.DUPLICATE_CHARGE,
                        "Possible duplicate: " + a.merchantName + " ₹" + a.amount, a.amount));
                }
            }
        }
        
        return alerts;
    }
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Merge K Sorted Lists** (LeetCode 23)
2. **Follow-up: What if lists are extremely long (100M+ elements each)?**

### 💡 Merge K Sorted Lists

```java
// Min Heap approach — O(n log k) where n = total elements, k = number of lists
public ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> minHeap = new PriorityQueue<>(
        Comparator.comparingInt(a -> a.val)
    );
    
    for (ListNode list : lists) {
        if (list != null) minHeap.offer(list);
    }
    
    ListNode dummy = new ListNode(0);
    ListNode curr = dummy;
    
    while (!minHeap.isEmpty()) {
        ListNode smallest = minHeap.poll();
        curr.next = smallest;
        curr = curr.next;
        
        if (smallest.next != null) {
            minHeap.offer(smallest.next);
        }
    }
    
    return dummy.next;
}
// Time: O(n log k), Space: O(k) for heap

// Follow-up: 100M+ elements per list
// Can't fit all in memory → external merge sort approach:
// 1. Read chunks from each list (e.g., 1000 elements at a time)
// 2. Maintain one chunk buffer per list
// 3. Merge using min-heap on the head of each buffer
// 4. When a buffer is exhausted, load next chunk from that list
// 5. Write merged output to disk in chunks
// This is exactly how database external sort works (Sort-Merge Join)
```

---

## 🎯 Key Takeaways
- CRED SDE-3 = **fintech domain** + credit card + statement analysis
- **Transaction categorization**: MCC code → merchant lookup → keyword fallback (3-tier)
- **Recurring subscription detection**: monthly cadence (25-35 days) + amount within 10% tolerance
- **Spending anomaly detection**: 3x avg for single txn, 1.5x category spike, duplicate charges
- **Merge K Sorted Lists**: min-heap O(n log k) is the canonical approach
- **External merge for large data**: chunk-based buffering + min-heap — like DB sort-merge join
- CRED **Founder round** is unique: Kunal Shah asks about product thinking, user behavior, economics
- Know **credit score factors**: payment history (35%), utilization (30%), credit age (15%), mix (10%), inquiries (10%)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Statement Analysis, Subscription Detection |
| DSA | Medium-Hard | Merge K Lists, External Sort |
| LLD | Hard | Credit Card System, Rewards Engine |
| System Design | Very Hard | Real-Time Credit Score Monitoring |
| Founder | Hard | Product Thinking, Economics |
