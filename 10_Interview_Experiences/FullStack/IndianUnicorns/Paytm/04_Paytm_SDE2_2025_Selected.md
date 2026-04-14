# Paytm — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm |
| **Role** | Software Engineer SDE-2 |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/paytm-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 1: DSA
**Duration:** 60 minutes

### Question 1: Implement an In-Memory Time Series Database

```java
import java.util.*;

/**
 * Time Series DB: store metrics over time, query by time range.
 * 
 * Operations:
 * - insert(metricName, timestamp, value): O(log n) via TreeMap
 * - query(metricName, startTime, endTime): O(log n + k) where k = results
 * - aggregate(metricName, startTime, endTime, fn): O(log n + k) — avg/sum/min/max/count
 * - downsample(metricName, startTime, endTime, bucketMs): O(log n + k) — group into buckets
 * 
 * Uses TreeMap<Long, Double> per metric for ordered time-based range queries.
 */
public class TimeSeriesDB {
    
    // metricName → TreeMap<timestamp, value>
    private final Map<String, TreeMap<Long, List<Double>>> metrics = new HashMap<>();
    
    public void insert(String metricName, long timestamp, double value) {
        metrics.computeIfAbsent(metricName, k -> new TreeMap<>())
               .computeIfAbsent(timestamp, k -> new ArrayList<>())
               .add(value);
    }
    
    /**
     * Query all data points in [startTime, endTime].
     */
    public List<double[]> query(String metricName, long startTime, long endTime) {
        TreeMap<Long, List<Double>> series = metrics.get(metricName);
        if (series == null) return Collections.emptyList();
        
        List<double[]> result = new ArrayList<>();
        NavigableMap<Long, List<Double>> range = series.subMap(startTime, true, endTime, true);
        
        for (Map.Entry<Long, List<Double>> entry : range.entrySet()) {
            for (double val : entry.getValue()) {
                result.add(new double[]{ entry.getKey(), val });
            }
        }
        
        return result;
    }
    
    /**
     * Aggregate over time range.
     */
    public double aggregate(String metricName, long startTime, long endTime, AggType aggType) {
        List<double[]> data = query(metricName, startTime, endTime);
        if (data.isEmpty()) return 0;
        
        switch (aggType) {
            case SUM:
                return data.stream().mapToDouble(d -> d[1]).sum();
            case AVG:
                return data.stream().mapToDouble(d -> d[1]).average().orElse(0);
            case MIN:
                return data.stream().mapToDouble(d -> d[1]).min().orElse(0);
            case MAX:
                return data.stream().mapToDouble(d -> d[1]).max().orElse(0);
            case COUNT:
                return data.size();
            default:
                throw new IllegalArgumentException("Unknown aggregation: " + aggType);
        }
    }
    
    /**
     * Downsample: group data into time buckets and aggregate.
     * E.g., 1-minute buckets: bucketMs = 60000
     */
    public List<double[]> downsample(String metricName, long startTime, long endTime,
                                      long bucketMs, AggType aggType) {
        List<double[]> data = query(metricName, startTime, endTime);
        
        // Group by bucket
        TreeMap<Long, List<Double>> buckets = new TreeMap<>();
        
        for (double[] point : data) {
            long timestamp = (long) point[0];
            long bucketStart = (timestamp / bucketMs) * bucketMs; // Floor to bucket
            buckets.computeIfAbsent(bucketStart, k -> new ArrayList<>()).add(point[1]);
        }
        
        // Aggregate each bucket
        List<double[]> result = new ArrayList<>();
        
        for (Map.Entry<Long, List<Double>> bucket : buckets.entrySet()) {
            double aggValue = aggregateList(bucket.getValue(), aggType);
            result.add(new double[]{ bucket.getKey(), aggValue });
        }
        
        return result;
    }
    
    private double aggregateList(List<Double> values, AggType aggType) {
        switch (aggType) {
            case SUM: return values.stream().mapToDouble(Double::doubleValue).sum();
            case AVG: return values.stream().mapToDouble(Double::doubleValue).average().orElse(0);
            case MIN: return values.stream().mapToDouble(Double::doubleValue).min().orElse(0);
            case MAX: return values.stream().mapToDouble(Double::doubleValue).max().orElse(0);
            case COUNT: return values.size();
            default: return 0;
        }
    }
    
    enum AggType { SUM, AVG, MIN, MAX, COUNT }
}
```

### Question 2: Find All Good Nodes in a Binary Tree

```java
/**
 * Good Nodes (LeetCode 1448): A node is "good" if in the path from root to it,
 * there is no node with a value greater than it.
 * 
 * Approach: DFS with maxSoFar parameter.
 * Time: O(n), Space: O(h) where h = height
 */
public int goodNodes(TreeNode root) {
    return dfs(root, Integer.MIN_VALUE);
}

private int dfs(TreeNode node, int maxSoFar) {
    if (node == null) return 0;
    
    int count = 0;
    if (node.val >= maxSoFar) {
        count = 1;
    }
    
    int newMax = Math.max(maxSoFar, node.val);
    count += dfs(node.left, newMax);
    count += dfs(node.right, newMax);
    
    return count;
}
```

---

## Round 2: System Design — Paytm Wallet + Cashback System

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│              Paytm Wallet + Cashback System                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Wallet Service                                    │           │
│  │                                                   │           │
│  │ Operations: load_money, pay, transfer, withdraw   │           │
│  │                                                   │           │
│  │ Balance Model (per user):                         │           │
│  │ ┌────────────────────────────────────────┐        │           │
│  │ │ Main Balance: ₹5,000                    │        │           │
│  │ │ Cashback Balance: ₹200 (restricted use) │        │           │
│  │ │ Promotional: ₹50 (expires 2025-04-30)   │        │           │
│  │ │ Total: ₹5,250                           │        │           │
│  │ └────────────────────────────────────────┘        │           │
│  │                                                   │           │
│  │ Payment priority: Promotional → Cashback → Main   │           │
│  │ (Use expiring balance first)                      │           │
│  │                                                   │           │
│  │ Transaction isolation: SERIALIZABLE for balance   │           │
│  │ Double-entry: every op creates balanced entries   │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Cashback Engine                                   │           │
│  │                                                   │           │
│  │ Rules: (evaluated post-payment)                   │           │
│  │ 1. Category rules: Recharge → 5% cashback         │           │
│  │ 2. Amount rules: > ₹500 → flat ₹25 cashback      │           │
│  │ 3. Frequency rules: 5th transaction → bonus ₹50   │           │
│  │ 4. Campaign rules: Festival sale → 10% up to ₹200 │           │
│  │                                                   │           │
│  │ Anti-abuse:                                       │           │
│  │ - Max cashback per user per day: ₹500             │           │
│  │ - Cooldown: same merchant, same amount → 24h gap  │           │
│  │ - Device fingerprint: block multi-account abuse   │           │
│  │ - Velocity check: > 20 txns/day → manual review   │           │
│  │                                                   │           │
│  │ Budget management:                                │           │
│  │ - Campaign has total budget (₹1Cr) + daily cap    │           │
│  │ - Redis counter: INCR with TTL for daily tracking │           │
│  │ - Atomic check: WATCH-MULTI-EXEC for budget deduct│           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  Data Model:                                                    │
│  wallets: { user_id, main_balance, cashback_balance }          │
│  wallet_txns: { id, wallet_id, type, amount, balance_type,    │
│                 reference, created_at }                         │
│  cashback_rules: { id, type, condition, reward, campaign_id }  │
│  cashback_ledger: { id, user_id, txn_id, amount, expires_at } │
│                                                                 │
│  Scale: 300M+ wallets, 50M daily transactions,                 │
│         ₹50Cr+ daily cashback disbursement                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Paytm SDE-2 = **Time series DB + cashback/wallet system design**
- **Time series DB**: TreeMap per metric — `subMap()` for O(log n + k) range queries
- **Downsampling**: floor timestamp to bucket boundary — `(ts / bucketMs) * bucketMs`
- **Wallet balance types**: main + cashback + promotional — use expiring balance first (FIFO by expiry)
- **Double-entry for wallet**: every load/pay/transfer creates balanced journal entries
- **Cashback anti-abuse**: daily caps, cooldowns, device fingerprinting, velocity checks
- **Budget atomicity**: Redis WATCH-MULTI-EXEC for campaign budget deduction — prevents over-disbursement
- Paytm = **wallet + cashback domain** — understand balance types, anti-abuse, regulatory compliance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| DSA | Hard | Time Series DB, TreeMap |
| System Design | Hard | Wallet, Cashback Engine |
| HM | Medium | Culture Fit |
