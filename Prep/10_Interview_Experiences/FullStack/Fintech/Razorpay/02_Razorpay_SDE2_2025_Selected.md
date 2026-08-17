# Razorpay — SDE-2 FullStack Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | SDE-2 |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + DSA + System Design + HM)
- **Timeline:** 10 days
- **Format:** On-site

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Splitwise-like Expense Sharing System**
   - Add expense, split equally/unequally/by percentage, calculate balances, simplify debts

### 💡 Interview-Ready Answer

```java
public class ExpenseSplitter {
    private final Map<String, Map<String, BigDecimal>> balances; // creditor → {debtor → amount}
    
    public ExpenseSplitter() {
        this.balances = new HashMap<>();
    }
    
    // Add an expense
    void addExpense(String paidBy, BigDecimal amount, List<Split> splits) {
        BigDecimal totalSplit = splits.stream()
            .map(s -> s.amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        if (totalSplit.compareTo(amount) != 0) {
            throw new IllegalArgumentException("Split amounts don't match total");
        }
        
        for (Split split : splits) {
            if (split.user.equals(paidBy)) continue;
            
            // split.user owes paidBy
            addBalance(paidBy, split.user, split.amount);
        }
    }
    
    void addExpenseEqual(String paidBy, BigDecimal amount, List<String> participants) {
        BigDecimal perPerson = amount.divide(
            BigDecimal.valueOf(participants.size()), 2, RoundingMode.HALF_UP);
        
        // Handle rounding: last person gets remainder
        BigDecimal remainder = amount.subtract(perPerson.multiply(BigDecimal.valueOf(participants.size())));
        
        List<Split> splits = new ArrayList<>();
        for (int i = 0; i < participants.size(); i++) {
            BigDecimal share = (i == participants.size() - 1) ? perPerson.add(remainder) : perPerson;
            splits.add(new Split(participants.get(i), share));
        }
        
        addExpense(paidBy, amount, splits);
    }
    
    private void addBalance(String creditor, String debtor, BigDecimal amount) {
        // Check if there's a reverse balance (debtor already owed to creditor)
        BigDecimal reverseOwed = getBalance(debtor, creditor);
        
        if (reverseOwed.compareTo(BigDecimal.ZERO) > 0) {
            if (reverseOwed.compareTo(amount) >= 0) {
                // Reverse balance covers this
                setBalance(debtor, creditor, reverseOwed.subtract(amount));
                return;
            } else {
                // Partially covers — remove reverse, add net forward
                setBalance(debtor, creditor, BigDecimal.ZERO);
                amount = amount.subtract(reverseOwed);
            }
        }
        
        BigDecimal current = getBalance(creditor, debtor);
        setBalance(creditor, debtor, current.add(amount));
    }
    
    private BigDecimal getBalance(String creditor, String debtor) {
        return balances.getOrDefault(creditor, Map.of())
            .getOrDefault(debtor, BigDecimal.ZERO);
    }
    
    private void setBalance(String creditor, String debtor, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            balances.getOrDefault(creditor, new HashMap<>()).remove(debtor);
            return;
        }
        balances.computeIfAbsent(creditor, k -> new HashMap<>()).put(debtor, amount);
    }
    
    // Simplify debts — minimize number of transactions
    // Greedy: settle max creditor with max debtor first
    List<Transaction> simplifyDebts() {
        // Calculate net balance per person
        Map<String, BigDecimal> netBalance = new HashMap<>();
        
        for (var credEntry : balances.entrySet()) {
            String creditor = credEntry.getKey();
            for (var debtEntry : credEntry.getValue().entrySet()) {
                String debtor = debtEntry.getKey();
                BigDecimal amount = debtEntry.getValue();
                
                netBalance.merge(creditor, amount, BigDecimal::add);
                netBalance.merge(debtor, amount.negate(), BigDecimal::add);
            }
        }
        
        // Separate into creditors and debtors
        PriorityQueue<Map.Entry<String, BigDecimal>> creditors = new PriorityQueue<>(
            (a, b) -> b.getValue().compareTo(a.getValue())); // Max heap
        PriorityQueue<Map.Entry<String, BigDecimal>> debtors = new PriorityQueue<>(
            (a, b) -> a.getValue().compareTo(b.getValue())); // Min heap (most negative first)
        
        for (var entry : netBalance.entrySet()) {
            int cmp = entry.getValue().compareTo(BigDecimal.ZERO);
            if (cmp > 0) creditors.offer(entry);
            else if (cmp < 0) debtors.offer(entry);
        }
        
        List<Transaction> transactions = new ArrayList<>();
        
        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            var creditor = creditors.poll();
            var debtor = debtors.poll();
            
            BigDecimal amount = creditor.getValue().min(debtor.getValue().abs());
            transactions.add(new Transaction(debtor.getKey(), creditor.getKey(), amount));
            
            BigDecimal credRem = creditor.getValue().subtract(amount);
            BigDecimal debtRem = debtor.getValue().add(amount);
            
            if (credRem.compareTo(BigDecimal.ZERO) > 0) {
                creditors.offer(Map.entry(creditor.getKey(), credRem));
            }
            if (debtRem.compareTo(BigDecimal.ZERO) < 0) {
                debtors.offer(Map.entry(debtor.getKey(), debtRem));
            }
        }
        
        return transactions;
    }
    
    record Split(String user, BigDecimal amount) {}
    record Transaction(String from, String to, BigDecimal amount) {}
}
```

---

## Round 2: DSA
**Duration:** 45 minutes

### Questions Asked
1. **Minimum Cost to Connect All Points** (LeetCode 1584) — MST
2. **Follow-up: What if some points are already connected?**

### 💡 Prim's MST

```java
public int minCostConnectPoints(int[][] points) {
    int n = points.length;
    boolean[] visited = new boolean[n];
    // Min-heap: [cost, pointIndex]
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    pq.offer(new int[]{0, 0}); // Start from point 0
    
    int totalCost = 0;
    int edges = 0;
    
    while (edges < n && !pq.isEmpty()) {
        int[] curr = pq.poll();
        int cost = curr[0], u = curr[1];
        
        if (visited[u]) continue;
        visited[u] = true;
        totalCost += cost;
        edges++;
        
        // Add edges to all unvisited points
        for (int v = 0; v < n; v++) {
            if (!visited[v]) {
                int dist = Math.abs(points[u][0] - points[v][0]) + 
                           Math.abs(points[u][1] - points[v][1]);
                pq.offer(new int[]{dist, v});
            }
        }
    }
    
    return totalCost;
}
// Time: O(n² log n), Space: O(n²)

// Follow-up: Some points already connected → Union-Find
// Pre-union the connected points, then add remaining edges via Kruskal's
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design a Payment Reconciliation System**
   - Match bank statements with internal transaction records, detect discrepancies

### 💡 Interview-Ready Answer

```
Payment Reconciliation Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Problem:                                                     │
│  - Razorpay processes millions of transactions/day            │
│  - Each transaction: internal record + bank settlement record │
│  - Must match: verify every rupee in = every rupee out        │
│  - Detect: missing, duplicate, amount mismatch               │
│                                                                │
│  Data Sources:                                                │
│  1. Internal ledger (own database): txn_id, amount, status   │
│  2. Bank settlement files (CSV/SFTP daily):                  │
│     bank_ref, amount, date, status                           │
│  3. Payment gateway responses (real-time)                    │
│                                                                │
│  Matching Algorithm:                                          │
│  1. Parse bank file → normalize (trim, lowercase, parse dates)│
│  2. For each bank record:                                    │
│     a. Lookup by bank_ref in internal records                │
│     b. If found: compare amount, date, status                │
│     c. Match types:                                          │
│        ✅ MATCHED: all fields match                           │
│        ⚠️ PARTIAL: bank_ref matches but amount differs       │
│        ❌ UNMATCHED_BANK: in bank but not in our records      │
│        ❌ UNMATCHED_INTERNAL: in our records but not in bank  │
│  3. For remaining internal records not matched:               │
│     Mark as UNMATCHED_INTERNAL                               │
│                                                                │
│  Architecture:                                                │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────┐     │
│  │ Bank SFTP │──▶│ File Ingester│──▶│ Matching Engine  │     │
│  │ (daily)   │   │ (parse CSV)  │   │ (batch job)      │     │
│  └──────────┘   └──────────────┘   └────────┬─────────┘     │
│                                              │               │
│  ┌──────────┐                     ┌──────────▼─────────┐     │
│  │ Internal  │────────────────────│ Reconciliation DB   │     │
│  │ Ledger    │                    │ (match results)     │     │
│  └──────────┘                     └────────┬───────────┘     │
│                                            │                 │
│                                   ┌────────▼───────────┐     │
│                                   │ Alert Service      │     │
│                                   │ (discrepancy > ₹1) │     │
│                                   └────────────────────┘     │
│                                                                │
│  Scale:                                                       │
│  - 10M transactions/day                                      │
│  - Reconciliation run: 30 minutes (batch)                    │
│  - Real-time reconciliation: for high-value (> ₹1L)         │
│  - SLA: all discrepancies flagged within 4 hours             │
│                                                                │
│  Handling Edge Cases:                                         │
│  - Timing difference: bank settles next day (T+1)           │
│    → window: match with 3-day lookback                       │
│  - Duplicate bank entries: dedup by bank_ref + date          │
│  - Partial settlements: one internal txn → multiple bank     │
│  - Refunds: negative entries in bank file                    │
│  - FX: amount differs due to exchange rate → tolerance band  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Razorpay machine coding = **financial accuracy** — use BigDecimal, never float
- **Splitwise debt simplification** = calculate net balances + greedy matching
- **MST (Prim's/Kruskal's)** is commonly asked — know both approaches
- **Payment Reconciliation** is Razorpay's unique system design question
- **Matching algorithm** = bank_ref lookup + amount comparison + timing window
- Handle **edge cases**: T+1 settlement, FX tolerance, partial settlements
- Fintech interviews emphasize **correctness and auditability** over speed

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Expense Splitting, BigDecimal, Debt Simplification |
| DSA | Medium-Hard | MST, Prim's, Union-Find |
| System Design | Hard | Reconciliation, Matching, Fintech |
| HM | Medium | Behavioral |
