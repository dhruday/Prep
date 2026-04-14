# Razorpay — SDE-2 Interview Experience (2024)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 |
| **YOE** | 3.5 years |
| **Date** | November 2024 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)
- **Timeline:** 10 days
- **Format:** Virtual
- **Note:** Razorpay is a payment company — expects strong understanding of transactions, consistency, and idempotency

---

## Round 1: Online Assessment
**Duration:** 75 minutes

### Questions Asked
1. **Longest Consecutive Sequence** (LeetCode 128)
2. **Maximum Profit from Stock Transactions with Cooldown** (LeetCode 309)

### 💡 Interview-Ready Answer — Longest Consecutive Sequence

```java
public int longestConsecutive(int[] nums) {
    Set<Integer> numSet = new HashSet<>();
    for (int num : nums) numSet.add(num);
    
    int maxLen = 0;
    
    for (int num : numSet) {
        // Only start counting from the beginning of a sequence
        if (!numSet.contains(num - 1)) {
            int current = num;
            int length = 1;
            
            while (numSet.contains(current + 1)) {
                current++;
                length++;
            }
            
            maxLen = Math.max(maxLen, length);
        }
    }
    return maxLen;
}
```
**Time:** O(n), **Space:** O(n)

**Key insight:** The `if (!numSet.contains(num - 1))` check ensures we only start from sequence beginnings. Without it, each element tries to build a full sequence → O(n²).

### 💡 Interview-Ready Answer — Stock with Cooldown

```java
public int maxProfit(int[] prices) {
    int n = prices.length;
    if (n <= 1) return 0;
    
    // States: hold, sold (today), rest (cooldown or idle)
    int hold = -prices[0];  // bought or holding
    int sold = 0;           // sold today
    int rest = 0;           // not holding, not in cooldown
    
    for (int i = 1; i < n; i++) {
        int prevHold = hold, prevSold = sold, prevRest = rest;
        
        hold = Math.max(prevHold, prevRest - prices[i]); // keep holding OR buy today (from rest)
        sold = prevHold + prices[i];                      // sell today
        rest = Math.max(prevRest, prevSold);              // do nothing OR finished cooldown
    }
    
    return Math.max(sold, rest);
}
```
**Time:** O(n), **Space:** O(1)

---

## Round 2: Machine Coding
**Duration:** 90 minutes + 30 minutes discussion | **Interviewer:** SDE-3

### Questions Asked
1. **Design a Payment Splitting System (like Splitwise)**
   - Add expenses (equal/exact/percentage split), show balances, simplify debts

### 💡 Interview-Ready Answer

```java
enum SplitType { EQUAL, EXACT, PERCENTAGE }

class User {
    String userId;
    String name;
    
    User(String name) {
        this.userId = UUID.randomUUID().toString().substring(0, 8);
        this.name = name;
    }
}

class Expense {
    String expenseId;
    String description;
    double amount;
    String paidBy;     // userId who paid
    SplitType splitType;
    Map<String, Double> splits; // userId → share amount
    LocalDateTime createdAt;
    
    Expense(String description, double amount, String paidBy, SplitType type, Map<String, Double> splits) {
        this.expenseId = "EXP-" + UUID.randomUUID().toString().substring(0, 8);
        this.description = description;
        this.amount = amount;
        this.paidBy = paidBy;
        this.splitType = type;
        this.splits = splits;
        this.createdAt = LocalDateTime.now();
    }
}

class SplitCalculator {
    // Calculate splits based on type
    static Map<String, Double> calculateSplits(SplitType type, double amount, 
                                                  List<String> participants, 
                                                  Map<String, Double> rawSplits) {
        Map<String, Double> result = new HashMap<>();
        
        switch (type) {
            case EQUAL:
                double share = Math.round(amount / participants.size() * 100.0) / 100.0;
                double remainder = amount - share * participants.size();
                for (int i = 0; i < participants.size(); i++) {
                    double s = share;
                    if (i == 0) s += Math.round(remainder * 100.0) / 100.0; // first person absorbs rounding
                    result.put(participants.get(i), s);
                }
                break;
                
            case EXACT:
                double totalExact = rawSplits.values().stream().mapToDouble(Double::doubleValue).sum();
                if (Math.abs(totalExact - amount) > 0.01) {
                    throw new IllegalArgumentException("Exact splits must sum to total amount");
                }
                result.putAll(rawSplits);
                break;
                
            case PERCENTAGE:
                double totalPct = rawSplits.values().stream().mapToDouble(Double::doubleValue).sum();
                if (Math.abs(totalPct - 100.0) > 0.01) {
                    throw new IllegalArgumentException("Percentages must sum to 100");
                }
                for (Map.Entry<String, Double> entry : rawSplits.entrySet()) {
                    result.put(entry.getKey(), Math.round(amount * entry.getValue() / 100 * 100.0) / 100.0);
                }
                break;
        }
        return result;
    }
}

class SplitwiseService {
    Map<String, User> users = new HashMap<>();
    List<Expense> expenses = new ArrayList<>();
    // Balance graph: balances[A][B] > 0 means A owes B
    Map<String, Map<String, Double>> balances = new HashMap<>();
    
    void addExpense(String description, double amount, String paidBy, 
                    SplitType type, List<String> participants, Map<String, Double> rawSplits) {
        Map<String, Double> splits = SplitCalculator.calculateSplits(type, amount, participants, rawSplits);
        
        Expense expense = new Expense(description, amount, paidBy, type, splits);
        expenses.add(expense);
        
        // Update balances
        for (Map.Entry<String, Double> entry : splits.entrySet()) {
            String participant = entry.getKey();
            double share = entry.getValue();
            
            if (!participant.equals(paidBy)) {
                // participant owes paidBy
                updateBalance(participant, paidBy, share);
            }
        }
    }
    
    private void updateBalance(String from, String to, double amount) {
        balances.computeIfAbsent(from, k -> new HashMap<>());
        balances.computeIfAbsent(to, k -> new HashMap<>());
        
        // Check if reverse debt exists
        double reverseDebt = balances.get(to).getOrDefault(from, 0.0);
        
        if (reverseDebt > 0) {
            if (amount >= reverseDebt) {
                balances.get(to).remove(from);
                if (amount > reverseDebt) {
                    balances.get(from).put(to, amount - reverseDebt);
                }
            } else {
                balances.get(to).put(from, reverseDebt - amount);
            }
        } else {
            double currentDebt = balances.get(from).getOrDefault(to, 0.0);
            balances.get(from).put(to, currentDebt + amount);
        }
    }
    
    // Show user's balance summary
    void showBalances(String userId) {
        String name = users.get(userId).name;
        
        // What this user owes
        Map<String, Double> owes = balances.getOrDefault(userId, Collections.emptyMap());
        for (Map.Entry<String, Double> entry : owes.entrySet()) {
            if (entry.getValue() > 0.01) {
                System.out.printf("%s owes %s: $%.2f%n", name, users.get(entry.getKey()).name, entry.getValue());
            }
        }
        
        // What others owe this user
        for (Map.Entry<String, Map<String, Double>> entry : balances.entrySet()) {
            double owed = entry.getValue().getOrDefault(userId, 0.0);
            if (owed > 0.01) {
                System.out.printf("%s owes %s: $%.2f%n", users.get(entry.getKey()).name, name, owed);
            }
        }
    }
    
    // Simplify debts — minimize number of transactions
    List<String> simplifyDebts() {
        // Calculate net balance per user
        Map<String, Double> netBalance = new HashMap<>();
        for (Map.Entry<String, Map<String, Double>> outer : balances.entrySet()) {
            for (Map.Entry<String, Double> inner : outer.getValue().entrySet()) {
                double amount = inner.getValue();
                netBalance.merge(outer.getKey(), -amount, Double::sum); // owes → negative
                netBalance.merge(inner.getKey(), amount, Double::sum);  // is owed → positive
            }
        }
        
        // Greedy: match largest creditor with largest debtor
        PriorityQueue<double[]> creditors = new PriorityQueue<>((a, b) -> Double.compare(b[1], a[1])); // max-heap
        PriorityQueue<double[]> debtors = new PriorityQueue<>((a, b) -> Double.compare(b[1], a[1]));   // max-heap (by abs)
        
        // ... populate and match
        // This is a known NP-hard problem for optimal solution
        // Greedy gives reasonable results in practice
        
        List<String> transactions = new ArrayList<>();
        // ... generate simplified transactions
        return transactions;
    }
}
```

**Discussion Points:**
- **Rounding issues:** Use BigDecimal for financial calculations. Here using double for brevity.
- **Concurrency:** Use optimistic concurrency control for expense updates.
- **Scalability:** This is in-memory. For production: store in PostgreSQL with proper indexing on (user_id, group_id).

---

## Round 3: Technical — System Design
**Duration:** 60 minutes | **Interviewer:** Principal Engineer

### Questions Asked
1. **Design Razorpay's Payment Gateway**
   - Payment processing, idempotency, reconciliation, PCI compliance, failure handling

### 💡 Interview-Ready Answer

#### Architecture
```
┌──────────────┐     ┌───────────────────────────────────────────┐
│  Merchant    │     │  Razorpay Payment Gateway                 │
│  Website     │     │                                            │
│              │     │  ┌─────────────┐    ┌──────────────────┐  │
│  ┌────────┐  │     │  │ API Gateway │    │ Checkout Service  │  │
│  │Checkout│──┼────▶│  │ (Auth,      │───▶│ (renders payment  │  │
│  │Page    │  │     │  │  Rate Limit)│    │  page, collects   │  │
│  └────────┘  │     │  └─────────────┘    │  card/UPI info)   │  │
│              │     │                      └────────┬─────────┘  │
└──────────────┘     │                               │             │
                     │                    ┌──────────▼──────────┐ │
                     │                    │  Payment Orchestrator│ │
                     │                    │  (routes to right    │ │
                     │                    │   payment method)    │ │
                     │                    └──────────┬──────────┘ │
                     │            ┌──────────────────┼──────────┐ │
                     │            ▼                  ▼          ▼ │
                     │     ┌───────────┐   ┌──────────┐  ┌─────┐ │
                     │     │Card       │   │UPI       │  │Net  │ │
                     │     │Processor  │   │Processor │  │Bank │ │
                     │     │(Visa/MC)  │   │(NPCI)    │  │     │ │
                     │     └───────────┘   └──────────┘  └─────┘ │
                     │                                            │
                     │  ┌──────────────────────────────────────┐ │
                     │  │  Reconciliation Engine (daily batch)  │ │
                     │  │  - Match transactions vs bank records │ │
                     │  │  - Flag mismatches for investigation  │ │
                     │  └──────────────────────────────────────┘ │
                     └───────────────────────────────────────────┘
```

#### Idempotent Payment Processing
```java
class PaymentService {
    // CRITICAL: Every payment request must have an idempotency key
    // If same key is sent twice, return the same response (no double charge)
    
    public PaymentResponse processPayment(PaymentRequest request) {
        String idempotencyKey = request.getIdempotencyKey();
        
        // 1. Check if we already processed this request
        PaymentResponse existing = idempotencyStore.get(idempotencyKey);
        if (existing != null) {
            return existing; // return cached response
        }
        
        // 2. Acquire lock on idempotency key (prevent concurrent duplicates)
        if (!lockService.tryLock(idempotencyKey, Duration.ofSeconds(30))) {
            throw new ConflictException("Payment in progress for this key");
        }
        
        try {
            // 3. Create payment record with PENDING status
            Payment payment = new Payment(
                generatePaymentId(),
                request.getAmount(),
                request.getCurrency(),
                PaymentStatus.PENDING,
                idempotencyKey
            );
            paymentRepository.save(payment);
            
            // 4. Route to appropriate payment processor
            PaymentGatewayResponse gatewayResponse = route(payment, request);
            
            // 5. Update payment status
            payment.setStatus(gatewayResponse.isSuccess() ? PaymentStatus.CAPTURED : PaymentStatus.FAILED);
            payment.setGatewayReference(gatewayResponse.getReferenceId());
            paymentRepository.save(payment);
            
            // 6. Cache response for idempotency
            PaymentResponse response = new PaymentResponse(payment);
            idempotencyStore.put(idempotencyKey, response, Duration.ofHours(24));
            
            // 7. Emit event
            eventBus.publish(new PaymentEvent(payment));
            
            return response;
        } finally {
            lockService.unlock(idempotencyKey);
        }
    }
}
```

#### Payment State Machine
```
CREATED → AUTHORIZED → CAPTURED → SETTLED
                    ↘              ↗
                     REFUNDED
                     
CREATED → AUTHORIZED → VOIDED  (cancel before capture)
CREATED → FAILED               (card declined / error)

Two-phase flow:
1. Authorize: Bank holds the amount (money not yet moved)
2. Capture: Actually charge the card (money moves to merchant)

Why two phases?
- E-commerce: authorize at order time, capture at shipping time
- If order is cancelled before shipping, void the authorization (no charge)
```

---

## Round 4: Hiring Manager
**Duration:** 30 minutes | **Interviewer:** VP Engineering

### Questions Asked
1. **"Why Razorpay?"**
2. **"How do you handle high-pressure production incidents?"**

### 💡 Interview-Ready Answer — Production Incidents

**Framework: ICE (Identify, Contain, Eradicate)**

1. **Identify (0-5 min):** Check monitoring dashboards (latency, error rates, traffic). Read alerts. Determine blast radius — is it affecting all users or a subset?

2. **Contain (5-15 min):** Stop the bleeding.
   - If bad deployment → rollback immediately
   - If external dependency → enable circuit breaker, serve cached/degraded responses
   - If data corruption → stop writes to affected tables
   - Communicate: page on-call, update status page, notify stakeholders

3. **Eradicate (15 min - hours):** 
   - Root cause analysis with logs, traces, metrics
   - Fix the root cause (not just symptoms)
   - Deploy fix with additional monitoring
   - Write post-mortem within 48 hours

> "At my previous company, we had a payment service outage affecting 15% of transactions. I identified the issue within 3 minutes (connection pool exhaustion due to slow query), contained it by increasing pool size temporarily (5 minutes), then fixed the root cause (missing database index) within the hour. Total downtime: 8 minutes. Post-mortem led to automated connection pool monitoring and query performance alerts."

---

## 🎯 Key Takeaways
- **Razorpay tests fintech domain knowledge** — idempotency, payment state machines, PCI compliance
- **Machine Coding** is Splitwise-like — practice expense splitting with different split types
- **Idempotency** is THE most important concept in payment systems — use it in every design
- **Two-phase payment** (authorize → capture) is essential knowledge for fintech interviews
- Stock with Cooldown = **state machine DP** — a common fintech-company DSA question
- **Financial calculations:** Always discuss BigDecimal vs double for money handling
- **Reconciliation** is a unique fintech concept — daily matching of internal records vs bank statements

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium-Hard | Hash Set (O(n)), State Machine DP |
| Machine Coding | Hard | OOP, Rounding, Debt Simplification |
| System Design | Very Hard | Payment Gateway, Idempotency, PCI |
| HM | Medium | Incident Response, Motivation |
