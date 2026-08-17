# PhonePe — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | SDE-2 |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/phonepe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + DSA + System Design + HM/Bar Raiser)
- **Timeline:** 2 weeks
- **Format:** On-site Bangalore

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a UPI Payment Router**
   - Given multiple banks, route payment to correct PSP, handle retries, circuit breaker

### 💡 Interview-Ready Answer

```java
public class UPIPaymentRouter {
    private final Map<String, BankConfig> bankConfigs;
    private final Map<String, CircuitBreaker> circuitBreakers;
    private final RetryPolicy retryPolicy;
    
    public UPIPaymentRouter() {
        this.bankConfigs = new ConcurrentHashMap<>();
        this.circuitBreakers = new ConcurrentHashMap<>();
        this.retryPolicy = new RetryPolicy(3, 1000, 2.0); // 3 attempts, 1s base, 2x backoff
        
        // Register banks
        registerBank(new BankConfig("ICICI", "https://api.icici.com/upi", 5000, 0.99));
        registerBank(new BankConfig("HDFC", "https://api.hdfc.com/upi", 3000, 0.98));
        registerBank(new BankConfig("SBI", "https://api.sbi.com/upi", 8000, 0.95));
    }
    
    void registerBank(BankConfig config) {
        bankConfigs.put(config.bankCode, config);
        circuitBreakers.put(config.bankCode, new CircuitBreaker(
            5,      // failure threshold
            30_000, // recovery timeout (30s)
            0.5     // half-open success threshold
        ));
    }
    
    PaymentResult routePayment(PaymentRequest request) {
        String payerBank = extractBankFromVPA(request.payerVPA); // user@okicici → ICICI
        String payeeBank = extractBankFromVPA(request.payeeVPA);
        
        // Check circuit breaker for payer's bank
        CircuitBreaker cb = circuitBreakers.get(payerBank);
        if (cb != null && cb.isOpen()) {
            return PaymentResult.failure("BANK_TEMPORARILY_UNAVAILABLE",
                "Payer bank is experiencing issues. Please try after sometime.");
        }
        
        // Route with retry
        return retryPolicy.execute(() -> {
            // Step 1: Debit from payer bank
            BankResponse debitResponse = callBankAPI(payerBank, "DEBIT", request);
            
            if (!debitResponse.isSuccess()) {
                cb.recordFailure();
                throw new PaymentException(debitResponse.errorCode);
            }
            
            // Step 2: Credit to payee bank
            try {
                BankResponse creditResponse = callBankAPI(payeeBank, "CREDIT", request);
                
                if (!creditResponse.isSuccess()) {
                    // CRITICAL: Reverse the debit!
                    callBankAPI(payerBank, "REVERSAL", request);
                    throw new PaymentException(creditResponse.errorCode);
                }
                
                cb.recordSuccess();
                return PaymentResult.success(debitResponse.bankRefId);
                
            } catch (Exception e) {
                // Credit failed → must reverse debit (compensating transaction)
                callBankAPI(payerBank, "REVERSAL", request);
                throw e;
            }
        });
    }
    
    String extractBankFromVPA(String vpa) {
        // user@okicici → ICICI, user@ybl → mapped from config
        String handle = vpa.substring(vpa.indexOf('@') + 1).toUpperCase();
        return switch (handle) {
            case "OKICICI", "ICICI" -> "ICICI";
            case "OKHDFCBANK", "HDFC" -> "HDFC";
            case "OKSBI", "SBI" -> "SBI";
            case "YBL" -> "SBI"; // PhonePe uses YES → SBI
            case "PAYTM" -> "PPBL"; // Paytm Payments Bank
            default -> throw new IllegalArgumentException("Unknown VPA handle: " + handle);
        };
    }
    
    record PaymentRequest(String payerVPA, String payeeVPA, long amountPaise, 
                          String note, String idempotencyKey) {}
    record PaymentResult(boolean success, String bankRefId, String errorCode, String message) {
        static PaymentResult success(String refId) { return new PaymentResult(true, refId, null, "Success"); }
        static PaymentResult failure(String code, String msg) { return new PaymentResult(false, null, code, msg); }
    }
}

class CircuitBreaker {
    enum State { CLOSED, OPEN, HALF_OPEN }
    
    private State state = State.CLOSED;
    private int failureCount = 0;
    private final int failureThreshold;
    private final long recoveryTimeout;
    private long lastFailureTime;
    private final double halfOpenSuccessThreshold;
    
    CircuitBreaker(int failureThreshold, long recoveryTimeout, double halfOpenSuccessThreshold) {
        this.failureThreshold = failureThreshold;
        this.recoveryTimeout = recoveryTimeout;
        this.halfOpenSuccessThreshold = halfOpenSuccessThreshold;
    }
    
    synchronized boolean isOpen() {
        if (state == State.OPEN) {
            if (System.currentTimeMillis() - lastFailureTime > recoveryTimeout) {
                state = State.HALF_OPEN;
                return false; // Allow one request through
            }
            return true;
        }
        return false;
    }
    
    synchronized void recordSuccess() {
        if (state == State.HALF_OPEN) {
            state = State.CLOSED;
        }
        failureCount = 0;
    }
    
    synchronized void recordFailure() {
        failureCount++;
        lastFailureTime = System.currentTimeMillis();
        if (failureCount >= failureThreshold) {
            state = State.OPEN;
        }
    }
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Accounts Merge** (LeetCode 721) — Union-Find
2. **Follow-up: What if accounts are streaming (new accounts keep coming)?**

### 💡 Interview-Ready Answer

```java
public List<List<String>> accountsMerge(List<List<String>> accounts) {
    Map<String, Integer> emailToId = new HashMap<>();
    Map<String, String> emailToName = new HashMap<>();
    int[] parent = new int[10001];
    for (int i = 0; i < parent.length; i++) parent[i] = i;
    
    int id = 0;
    for (List<String> account : accounts) {
        String name = account.get(0);
        for (int i = 1; i < account.size(); i++) {
            String email = account.get(i);
            emailToName.put(email, name);
            
            if (!emailToId.containsKey(email)) {
                emailToId.put(email, id++);
            }
            
            // Union first email with all other emails in this account
            union(parent, emailToId.get(account.get(1)), emailToId.get(email));
        }
    }
    
    // Group emails by root parent
    Map<Integer, TreeSet<String>> groups = new HashMap<>();
    for (String email : emailToId.keySet()) {
        int root = find(parent, emailToId.get(email));
        groups.computeIfAbsent(root, k -> new TreeSet<>()).add(email);
    }
    
    // Build result
    List<List<String>> result = new ArrayList<>();
    for (var entry : groups.entrySet()) {
        List<String> merged = new ArrayList<>();
        String firstEmail = entry.getValue().first();
        merged.add(emailToName.get(firstEmail)); // Name
        merged.addAll(entry.getValue()); // Sorted emails
        result.add(merged);
    }
    
    return result;
}

private int find(int[] parent, int x) {
    if (parent[x] != x) parent[x] = find(parent, parent[x]);
    return parent[x];
}

private void union(int[] parent, int a, int b) {
    parent[find(parent, a)] = find(parent, b);
}
// Time: O(n * α(n) * log(n)) — α(n) for Union-Find, log(n) for TreeSet
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design UPI Autopay (Recurring Payments) System**

### 💡 Interview-Ready Answer

```
UPI Autopay Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Mandate Flow:                                                │
│  1. Merchant creates mandate: POST /api/mandates             │
│     { payerVPA, maxAmount, frequency: "MONTHLY",             │
│       startDate, endDate, purpose: "Netflix Subscription" }  │
│  2. PhonePe sends mandate request to payer's bank via NPCI   │
│  3. Payer approves mandate (UPI PIN required — one-time)     │
│  4. Mandate stored: ACTIVE status                            │
│                                                                │
│  Recurring Execution:                                         │
│  ┌───────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Scheduler      │───▶│ Execution     │───▶│ NPCI/Bank    │  │
│  │ (cron)         │    │ Engine        │    │ API          │  │
│  │ Daily 6 AM     │    │               │    │              │  │
│  └───────────────┘    └──────────────┘    └──────────────┘  │
│                                                                │
│  Scheduler picks mandates where:                              │
│  - status = ACTIVE                                           │
│  - next_execution_date = today                               │
│  - amount ≤ max_amount                                       │
│                                                                │
│  Execution Engine:                                            │
│  1. Pre-notification: Send 24hr notification to payer        │
│     "₹649 will be debited tomorrow for Netflix"              │
│  2. On execution day: initiate payment (no PIN required!)    │
│  3. If success: update last_execution, compute next_date     │
│  4. If failure:                                              │
│     a. Insufficient balance: retry next day (max 3 retries) │
│     b. Bank down: retry in 4 hours                          │
│     c. Mandate revoked: mark INACTIVE, notify merchant      │
│                                                                │
│  DB Schema:                                                   │
│  mandates:                                                    │
│    mandate_id UUID PK                                        │
│    payer_vpa VARCHAR                                         │
│    merchant_id UUID FK                                       │
│    max_amount DECIMAL(12,2)                                  │
│    frequency ENUM('DAILY','WEEKLY','MONTHLY','YEARLY')       │
│    execution_rule VARCHAR -- "15th of month" / "every Monday"│
│    start_date DATE                                           │
│    end_date DATE                                             │
│    status ENUM('PENDING','ACTIVE','PAUSED','REVOKED','EXPIRED')
│    next_execution_date DATE                                  │
│    created_at TIMESTAMP                                      │
│                                                                │
│  mandate_executions:                                          │
│    execution_id UUID PK                                      │
│    mandate_id UUID FK                                        │
│    amount DECIMAL(12,2)                                      │
│    status ENUM('INITIATED','SUCCESS','FAILED','RETRYING')    │
│    bank_ref_id VARCHAR                                       │
│    retry_count INT                                           │
│    executed_at TIMESTAMP                                     │
│    failure_reason VARCHAR                                     │
│                                                                │
│  Scale:                                                       │
│  - 50M active mandates                                       │
│  - ~5M executions / day (concentrated in morning window)     │
│  - Partition mandate_executions by (mandate_id, executed_at) │
│  - Index: (status, next_execution_date) for scheduler query  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- PhonePe = **UPI domain knowledge is critical** — know the architecture
- **Circuit Breaker** pattern: CLOSED → OPEN (after N failures) → HALF_OPEN → CLOSED
- **Compensating transaction**: if credit fails, MUST reverse debit (payment atomicity)
- **Accounts Merge** = Union-Find with email→ID mapping — PhonePe's favorite DSA question
- **UPI Autopay** = mandate + scheduled execution + retry logic + pre-notification
- **Idempotency key** for every payment request — prevent double-charge
- PhonePe values **fintech reliability** — every answer should mention failure handling

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Payment Router, Circuit Breaker, UPI |
| DSA | Medium-Hard | Union-Find, Streaming Extension |
| System Design | Hard | UPI Autopay, Mandates, Retry |
| Bar Raiser | Hard | LP + Technical Deep Dive |
