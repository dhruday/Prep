# Cred — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | CRED |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/cred-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Payments |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Credit Card Statement Analyzer
**Duration:** 90 minutes

### Challenge: Build a statement analyzer that: parses transactions, categorizes expenses, detects recurring payments, identifies potential fraud, and generates spending insights.

```java
import java.util.*;
import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.stream.Collectors;

/**
 * Credit Card Statement Analyzer:
 * 
 * Features:
 * 1. Transaction categorization (merchant name → category)
 * 2. Recurring payment detection (same merchant, similar amount, regular interval)
 * 3. Fraud detection (unusual amount, frequency, location patterns)
 * 4. Spending insights (top categories, month-over-month, daily average)
 */

class Transaction {
    String id;
    String merchantName;
    BigDecimal amount;
    LocalDate date;
    String category; // Assigned by analyzer
    String city;
    boolean isInternational;
    
    Transaction(String id, String merchantName, BigDecimal amount, LocalDate date, String city) {
        this.id = id; this.merchantName = merchantName; this.amount = amount;
        this.date = date; this.city = city; this.isInternational = false;
    }
}

class RecurringPayment {
    String merchantName;
    BigDecimal amount;
    int intervalDays; // Approximate interval between payments
    LocalDate nextExpected;
    int occurrences;
    
    RecurringPayment(String merchant, BigDecimal amount, int interval, int occurrences) {
        this.merchantName = merchant; this.amount = amount;
        this.intervalDays = interval; this.occurrences = occurrences;
    }
}

class FraudAlert {
    String transactionId;
    String reason;
    String severity; // LOW, MEDIUM, HIGH
    
    FraudAlert(String txnId, String reason, String severity) {
        this.transactionId = txnId; this.reason = reason; this.severity = severity;
    }
}

class SpendingInsights {
    Map<String, BigDecimal> categoryTotals;
    BigDecimal totalSpend;
    BigDecimal dailyAverage;
    String topCategory;
    BigDecimal topCategoryAmount;
    List<RecurringPayment> recurringPayments;
    List<FraudAlert> fraudAlerts;
    Map<YearMonth, BigDecimal> monthlyTrend;
    
    SpendingInsights() {
        categoryTotals = new TreeMap<>();
        recurringPayments = new ArrayList<>();
        fraudAlerts = new ArrayList<>();
        monthlyTrend = new TreeMap<>();
    }
}

class StatementAnalyzer {
    
    // Merchant → Category mapping (keyword-based)
    private static final Map<String, String> CATEGORY_RULES = new LinkedHashMap<>();
    
    static {
        CATEGORY_RULES.put("swiggy|zomato|uber eats|dominos|pizza|mcdonalds|starbucks|cafe", "Food & Dining");
        CATEGORY_RULES.put("uber|ola|rapido|metro|irctc|makemytrip|goibibo", "Travel & Transport");
        CATEGORY_RULES.put("netflix|hotstar|prime video|spotify|youtube|apple music", "Entertainment");
        CATEGORY_RULES.put("amazon|flipkart|myntra|ajio|meesho|nykaa", "Shopping");
        CATEGORY_RULES.put("airtel|jio|vi|broadband|wifi|internet", "Utilities & Telecom");
        CATEGORY_RULES.put("gym|cult|pharma|apollo|medplus|1mg|practo", "Health & Fitness");
        CATEGORY_RULES.put("rent|society|maintenance|electricity|water|gas|piped", "Housing");
        CATEGORY_RULES.put("icici|hdfc|sbi|emi|loan|insurance|lic|mutual fund", "Financial Services");
        CATEGORY_RULES.put("school|course|udemy|coursera|books", "Education");
    }
    
    /**
     * Analyze a list of transactions and generate insights.
     */
    public SpendingInsights analyze(List<Transaction> transactions) {
        SpendingInsights insights = new SpendingInsights();
        
        if (transactions.isEmpty()) return insights;
        
        // Step 1: Categorize all transactions
        for (Transaction txn : transactions) {
            txn.category = categorize(txn.merchantName);
        }
        
        // Step 2: Category totals
        for (Transaction txn : transactions) {
            insights.categoryTotals.merge(txn.category, txn.amount, BigDecimal::add);
        }
        
        // Step 3: Total spend and daily average
        insights.totalSpend = transactions.stream()
            .map(t -> t.amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        LocalDate earliest = transactions.stream().map(t -> t.date).min(Comparator.naturalOrder()).orElse(LocalDate.now());
        LocalDate latest = transactions.stream().map(t -> t.date).max(Comparator.naturalOrder()).orElse(LocalDate.now());
        long days = Math.max(1, ChronoUnit.DAYS.between(earliest, latest) + 1);
        insights.dailyAverage = insights.totalSpend.divide(BigDecimal.valueOf(days), 2, BigDecimal.ROUND_HALF_UP);
        
        // Step 4: Top category
        insights.categoryTotals.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .ifPresent(e -> {
                insights.topCategory = e.getKey();
                insights.topCategoryAmount = e.getValue();
            });
        
        // Step 5: Monthly trend
        for (Transaction txn : transactions) {
            YearMonth ym = YearMonth.from(txn.date);
            insights.monthlyTrend.merge(ym, txn.amount, BigDecimal::add);
        }
        
        // Step 6: Detect recurring payments
        insights.recurringPayments = detectRecurring(transactions);
        
        // Step 7: Detect potential fraud
        insights.fraudAlerts = detectFraud(transactions, insights);
        
        return insights;
    }
    
    /**
     * Categorize merchant name using keyword rules.
     */
    String categorize(String merchantName) {
        String lower = merchantName.toLowerCase();
        
        for (var entry : CATEGORY_RULES.entrySet()) {
            String[] keywords = entry.getKey().split("\\|");
            for (String keyword : keywords) {
                if (lower.contains(keyword.trim())) {
                    return entry.getValue();
                }
            }
        }
        
        return "Other";
    }
    
    /**
     * Detect recurring payments:
     * Group by merchant → check if payments are roughly evenly spaced
     * and amounts are similar (within ±10%).
     */
    List<RecurringPayment> detectRecurring(List<Transaction> transactions) {
        // Group by normalized merchant name
        Map<String, List<Transaction>> byMerchant = transactions.stream()
            .collect(Collectors.groupingBy(t -> t.merchantName.toLowerCase().trim()));
        
        List<RecurringPayment> recurring = new ArrayList<>();
        
        for (var entry : byMerchant.entrySet()) {
            List<Transaction> txns = entry.getValue();
            if (txns.size() < 3) continue; // Need at least 3 occurrences
            
            // Sort by date
            txns.sort(Comparator.comparing(t -> t.date));
            
            // Check amount similarity (within ±10% of median)
            List<BigDecimal> amounts = txns.stream().map(t -> t.amount).sorted().collect(Collectors.toList());
            BigDecimal median = amounts.get(amounts.size() / 2);
            
            boolean amountsSimilar = amounts.stream().allMatch(a -> {
                BigDecimal diff = a.subtract(median).abs();
                return diff.doubleValue() / Math.max(1, median.doubleValue()) <= 0.10;
            });
            
            if (!amountsSimilar) continue;
            
            // Check interval regularity
            List<Long> intervals = new ArrayList<>();
            for (int i = 1; i < txns.size(); i++) {
                intervals.add(ChronoUnit.DAYS.between(txns.get(i - 1).date, txns.get(i).date));
            }
            
            long avgInterval = Math.round(intervals.stream().mapToLong(Long::longValue).average().orElse(0));
            
            // Check if intervals are regular (within ±5 days of average)
            boolean intervalsRegular = intervals.stream()
                .allMatch(i -> Math.abs(i - avgInterval) <= 5);
            
            if (intervalsRegular && avgInterval >= 7) { // At least weekly
                RecurringPayment rp = new RecurringPayment(
                    entry.getKey(), median, (int) avgInterval, txns.size());
                rp.nextExpected = txns.get(txns.size() - 1).date.plusDays(avgInterval);
                recurring.add(rp);
            }
        }
        
        return recurring;
    }
    
    /**
     * Simple fraud detection heuristics:
     * 1. Amount > 3× user's average transaction
     * 2. Multiple transactions at same merchant within 1 minute (card-not-present fraud)
     * 3. Transaction in unusual city (not in user's top 3 cities)
     */
    List<FraudAlert> detectFraud(List<Transaction> transactions, SpendingInsights insights) {
        List<FraudAlert> alerts = new ArrayList<>();
        
        double avgAmount = insights.totalSpend.doubleValue() / Math.max(1, transactions.size());
        
        // Top cities
        Map<String, Long> cityCounts = transactions.stream()
            .filter(t -> t.city != null)
            .collect(Collectors.groupingBy(t -> t.city, Collectors.counting()));
        
        Set<String> topCities = cityCounts.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(3)
            .map(Map.Entry::getKey)
            .collect(Collectors.toSet());
        
        for (Transaction txn : transactions) {
            // High amount
            if (txn.amount.doubleValue() > avgAmount * 3) {
                alerts.add(new FraudAlert(txn.id,
                    String.format("Unusually high amount: ₹%.2f (avg: ₹%.2f)", txn.amount, avgAmount),
                    txn.amount.doubleValue() > avgAmount * 5 ? "HIGH" : "MEDIUM"));
            }
            
            // Unusual city
            if (txn.city != null && !topCities.isEmpty() && !topCities.contains(txn.city)) {
                alerts.add(new FraudAlert(txn.id,
                    "Transaction in unusual location: " + txn.city,
                    txn.isInternational ? "HIGH" : "LOW"));
            }
        }
        
        // Rapid-fire transactions (same merchant, same day, multiple times)
        Map<String, List<Transaction>> sameDayMerchant = transactions.stream()
            .collect(Collectors.groupingBy(t -> t.merchantName + "|" + t.date));
        
        for (var entry : sameDayMerchant.entrySet()) {
            if (entry.getValue().size() >= 3) {
                for (Transaction txn : entry.getValue()) {
                    alerts.add(new FraudAlert(txn.id,
                        "Multiple transactions at " + txn.merchantName + " on " + txn.date,
                        "MEDIUM"));
                }
            }
        }
        
        return alerts;
    }
}
```

---

## 🎯 Key Takeaways
- CRED SDE-3 = **Credit card statement analyzer — categorization, recurring detection, fraud alerts**
- **Keyword-based categorization**: regex-like `|`-separated keywords → category — simple but effective at scale
- **Recurring detection**: ≥3 occurrences + amounts within ±10% of median + intervals within ±5 days of average
- **Fraud heuristics**: amount > 3× average, unusual city (not in top 3), rapid-fire same-day same-merchant
- **BigDecimal for money**: always use BigDecimal for financial amounts — never double
- **Median for amount similarity**: robust to outliers — better than mean for detecting "similar" amounts
- **Next expected date**: `lastDate + avgInterval` — enables "upcoming bill" notifications
- CRED = **credit card payments, rewards** — statement analysis, spending insights, fraud detection are core

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Hard | Data Analysis, Pattern Detection |
| System Design | Very Hard | Credit Score Platform |
| HM | Medium | Culture |
