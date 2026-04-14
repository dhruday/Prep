# PhonePe — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | Senior Software Engineer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/phonepe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Machine Coding + 2 Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Design a Rule Engine for UPI Transaction Validation

```java
import java.util.*;
import java.util.function.Predicate;

/**
 * Rule Engine for UPI Transaction Validation.
 * 
 * Each rule: condition (Predicate<Transaction>) + action (allow/block/flag)
 * Rules are prioritized and evaluated in order.
 * First matching rule's action is taken (short-circuit evaluation).
 * 
 * Supports: AND/OR/NOT composite conditions, parameterized rules.
 */
public class RuleEngine {
    
    enum Action { ALLOW, BLOCK, FLAG_FOR_REVIEW, REQUIRE_OTP }
    
    static class Transaction {
        String id;
        String senderId;
        String receiverId;
        double amount;
        String senderDeviceId;
        String receiverVpa;
        long timestamp;
        String senderLocation; // city
        int senderDailyTxnCount;
        double senderDailyVolume;
        boolean isNewBeneficiary;
        
        // Getters omitted for brevity
    }
    
    static class Rule {
        String name;
        int priority; // Lower = higher priority
        Predicate<Transaction> condition;
        Action action;
        String reason;
        
        Rule(String name, int priority, Predicate<Transaction> condition, Action action, String reason) {
            this.name = name;
            this.priority = priority;
            this.condition = condition;
            this.action = action;
            this.reason = reason;
        }
    }
    
    static class RuleResult {
        String ruleName;
        Action action;
        String reason;
        
        RuleResult(String ruleName, Action action, String reason) {
            this.ruleName = ruleName;
            this.action = action;
            this.reason = reason;
        }
    }
    
    private final List<Rule> rules = new ArrayList<>();
    
    public RuleEngine addRule(Rule rule) {
        rules.add(rule);
        rules.sort(Comparator.comparingInt(r -> r.priority));
        return this;
    }
    
    public RuleResult evaluate(Transaction txn) {
        for (Rule rule : rules) {
            if (rule.condition.test(txn)) {
                return new RuleResult(rule.name, rule.action, rule.reason);
            }
        }
        // Default: allow
        return new RuleResult("default", Action.ALLOW, "No rule matched");
    }
    
    // Composite condition builders
    @SafeVarargs
    static Predicate<Transaction> and(Predicate<Transaction>... predicates) {
        return txn -> Arrays.stream(predicates).allMatch(p -> p.test(txn));
    }
    
    @SafeVarargs
    static Predicate<Transaction> or(Predicate<Transaction>... predicates) {
        return txn -> Arrays.stream(predicates).anyMatch(p -> p.test(txn));
    }
    
    static Predicate<Transaction> not(Predicate<Transaction> predicate) {
        return predicate.negate();
    }
    
    // Pre-built condition factories
    static Predicate<Transaction> amountGreaterThan(double threshold) {
        return txn -> txn.amount > threshold;
    }
    
    static Predicate<Transaction> dailyLimitExceeded(double limit) {
        return txn -> txn.senderDailyVolume + txn.amount > limit;
    }
    
    static Predicate<Transaction> txnCountExceeded(int limit) {
        return txn -> txn.senderDailyTxnCount >= limit;
    }
    
    static Predicate<Transaction> isNewBeneficiary() {
        return txn -> txn.isNewBeneficiary;
    }
    
    static Predicate<Transaction> amountBetween(double min, double max) {
        return txn -> txn.amount >= min && txn.amount <= max;
    }
    
    // Usage: Configure PhonePe UPI rules
    public static RuleEngine createPhonePeEngine() {
        RuleEngine engine = new RuleEngine();
        
        // P1: Block if daily limit exceeded (RBI mandate: ₹1L for UPI)
        engine.addRule(new Rule(
            "DAILY_LIMIT_EXCEEDED", 1,
            dailyLimitExceeded(100000),
            Action.BLOCK,
            "Daily UPI transaction limit of ₹1,00,000 exceeded"
        ));
        
        // P2: Block if single txn > ₹1L
        engine.addRule(new Rule(
            "SINGLE_TXN_LIMIT", 2,
            amountGreaterThan(100000),
            Action.BLOCK,
            "Single transaction limit of ₹1,00,000 exceeded"
        ));
        
        // P3: OTP required for new beneficiary + large amount
        engine.addRule(new Rule(
            "NEW_BENEFICIARY_LARGE", 3,
            and(isNewBeneficiary(), amountGreaterThan(10000)),
            Action.REQUIRE_OTP,
            "OTP required for large transfer to new beneficiary"
        ));
        
        // P4: Flag if > 10 transactions in a day
        engine.addRule(new Rule(
            "HIGH_FREQUENCY", 4,
            txnCountExceeded(10),
            Action.FLAG_FOR_REVIEW,
            "High transaction frequency detected"
        ));
        
        // P5: Flag if new beneficiary + medium amount
        engine.addRule(new Rule(
            "NEW_BENEFICIARY_MEDIUM", 5,
            and(isNewBeneficiary(), amountBetween(2000, 10000)),
            Action.FLAG_FOR_REVIEW,
            "Medium transfer to new beneficiary"
        ));
        
        return engine;
    }
}
```

---

## Round 2: System Design — PhonePe UPI Architecture

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│                    PhonePe UPI Architecture                     │
│                                                                 │
│  User App (Sender)                                              │
│  ┌──────────────────┐                                           │
│  │ 1. Enter VPA     │                                           │
│  │ 2. Enter Amount  │                                           │
│  │ 3. Enter UPI PIN │──→ Encrypted PIN (Device binding)         │
│  └────────┬─────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │              PhonePe Backend                      │           │
│  │                                                   │           │
│  │  ┌─────────────┐  ┌──────────────┐               │           │
│  │  │ API Gateway  │──│ Rule Engine  │               │           │
│  │  │ + Auth       │  │ (Fraud/Limit)│               │           │
│  │  └──────┬──────┘  └──────────────┘               │           │
│  │         │                                         │           │
│  │  ┌──────▼──────┐                                  │           │
│  │  │ Transaction │                                  │           │
│  │  │ Orchestrator│                                  │           │
│  │  │ (Saga)      │                                  │           │
│  │  └──────┬──────┘                                  │           │
│  │         │                                         │           │
│  │  State Machine:                                   │           │
│  │  INITIATED → VALIDATED → PSP_FORWARDED →          │           │
│  │  NPCI_PROCESSING → DEBIT_CONFIRMED →              │           │
│  │  CREDIT_INITIATED → CREDIT_CONFIRMED →            │           │
│  │  SUCCESS / FAILED / EXPIRED                       │           │
│  └──────────────────────┬───────────────────────────┘           │
│                         │                                       │
│                         ▼ (UPI protocol via NPCI)               │
│  ┌──────────────────────────────────────────────────┐           │
│  │                    NPCI (Switch)                   │           │
│  │  - Routes to sender's bank (debit)                │           │
│  │  - Routes to receiver's bank (credit)             │           │
│  │  - Timeout: 30 seconds                            │           │
│  │  - Idempotency: UPI ref ID                        │           │
│  └──────────────────────────────────────────────────┘           │
│           │                         │                           │
│  ┌────────▼────────┐    ┌──────────▼──────────┐                │
│  │ Sender Bank     │    │ Receiver Bank       │                 │
│  │ (Debit account) │    │ (Credit account)    │                 │
│  └─────────────────┘    └─────────────────────┘                │
│                                                                 │
│  Failure Handling:                                              │
│  - Debit success + credit fail → auto-reversal within 30s      │
│  - Timeout → marked PENDING → resolution via NPCI callback     │
│  - Network error → idempotent retry with same UPI ref ID       │
│  - Duplicate detection: sender+receiver+amount+timestamp hash  │
│                                                                 │
│  Scale:                                                         │
│  - 500M+ UPI transactions/month via PhonePe                   │
│  - Peak: 10K TPS during festivals                              │
│  - 99.95% success rate mandate from NPCI                       │
│  - Median latency: < 3 seconds end-to-end                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- PhonePe SDE-3 = **Rule engine + UPI architecture + transaction state machine**
- **Rule engine**: priority-ordered predicates with composite AND/OR/NOT — short-circuit on first match
- **Predicate composition**: Java `Predicate<T>` with factory methods — clean, extensible
- **UPI flow**: App → PhonePe → NPCI → Sender Bank (debit) → NPCI → Receiver Bank (credit) → callback
- **Transaction state machine**: 8+ states — each transition is idempotent and audited
- **Auto-reversal**: debit success + credit fail → compensating transaction within 30s (NPCI mandate)
- **Device binding**: UPI PIN encrypted with device-specific key — cannot be used from another device
- PhonePe = **UPI domain knowledge is essential** — understand NPCI, PSPs, banks, VPAs, settlement

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Rule Engine, Composite Pattern |
| System Design | Very Hard | UPI Architecture, Payment State Machine |
| Technical 2 | Hard | Java, Concurrency, Distributed Systems |
| HM | Medium | Culture Fit |
