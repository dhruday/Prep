# Razorpay — SDE-2 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Backend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 1: DSA
**Duration:** 60 minutes

### Question 1: Design a Transaction Ledger with Double-Entry Bookkeeping Validation

```java
import java.util.*;
import java.math.BigDecimal;

/**
 * Double-Entry Bookkeeping Ledger:
 * Every transaction has debit(s) and credit(s) that MUST balance.
 * Account types: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
 * 
 * Invariant: sum(debits) == sum(credits) for every transaction
 * 
 * Features:
 * - Add transaction with multiple legs (journal entries)
 * - Get account balance at any point in time
 * - Trial balance verification (all debits == all credits)
 * - Idempotent: reject duplicate transaction IDs
 */
public class TransactionLedger {
    
    enum AccountType { ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE }
    
    static class Account {
        String id;
        String name;
        AccountType type;
        
        Account(String id, String name, AccountType type) {
            this.id = id;
            this.name = name;
            this.type = type;
        }
        
        // Normal balance: ASSET/EXPENSE = DEBIT, LIABILITY/EQUITY/REVENUE = CREDIT
        boolean isDebitNormal() {
            return type == AccountType.ASSET || type == AccountType.EXPENSE;
        }
    }
    
    static class JournalEntry {
        String accountId;
        BigDecimal debit;    // positive if debit
        BigDecimal credit;   // positive if credit
        
        JournalEntry(String accountId, BigDecimal debit, BigDecimal credit) {
            this.accountId = accountId;
            this.debit = debit;
            this.credit = credit;
        }
    }
    
    static class Transaction {
        String id;
        long timestamp;
        String description;
        List<JournalEntry> entries;
        
        Transaction(String id, long timestamp, String description, List<JournalEntry> entries) {
            this.id = id;
            this.timestamp = timestamp;
            this.description = description;
            this.entries = entries;
        }
    }
    
    private final Map<String, Account> accounts = new HashMap<>();
    private final List<Transaction> transactions = new ArrayList<>();
    private final Set<String> processedTxnIds = new HashSet<>(); // Idempotency
    private final Map<String, List<JournalEntry>> accountEntries = new HashMap<>();
    
    public void createAccount(String id, String name, AccountType type) {
        if (accounts.containsKey(id)) throw new IllegalArgumentException("Account exists: " + id);
        accounts.put(id, new Account(id, name, type));
        accountEntries.put(id, new ArrayList<>());
    }
    
    public boolean addTransaction(String txnId, String description, List<JournalEntry> entries) {
        // Idempotency check
        if (processedTxnIds.contains(txnId)) return false;
        
        // Validate: all accounts exist
        for (JournalEntry entry : entries) {
            if (!accounts.containsKey(entry.accountId)) {
                throw new IllegalArgumentException("Unknown account: " + entry.accountId);
            }
        }
        
        // Validate: debits == credits
        BigDecimal totalDebits = entries.stream()
            .map(e -> e.debit)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalCredits = entries.stream()
            .map(e -> e.credit)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        if (totalDebits.compareTo(totalCredits) != 0) {
            throw new IllegalArgumentException(
                "Transaction unbalanced: debits=" + totalDebits + " credits=" + totalCredits);
        }
        
        // Validate: at least one debit and one credit
        boolean hasDebit = entries.stream().anyMatch(e -> e.debit.compareTo(BigDecimal.ZERO) > 0);
        boolean hasCredit = entries.stream().anyMatch(e -> e.credit.compareTo(BigDecimal.ZERO) > 0);
        
        if (!hasDebit || !hasCredit) {
            throw new IllegalArgumentException("Transaction must have at least one debit and one credit");
        }
        
        // Record
        Transaction txn = new Transaction(txnId, System.currentTimeMillis(), description, entries);
        transactions.add(txn);
        processedTxnIds.add(txnId);
        
        for (JournalEntry entry : entries) {
            accountEntries.get(entry.accountId).add(entry);
        }
        
        return true;
    }
    
    /**
     * Get account balance.
     * For ASSET/EXPENSE (debit-normal): balance = sum(debits) - sum(credits)
     * For LIABILITY/EQUITY/REVENUE (credit-normal): balance = sum(credits) - sum(debits)
     */
    public BigDecimal getBalance(String accountId) {
        Account account = accounts.get(accountId);
        if (account == null) throw new IllegalArgumentException("Unknown account: " + accountId);
        
        List<JournalEntry> entries = accountEntries.get(accountId);
        
        BigDecimal debits = entries.stream()
            .map(e -> e.debit)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal credits = entries.stream()
            .map(e -> e.credit)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        return account.isDebitNormal() 
            ? debits.subtract(credits) 
            : credits.subtract(debits);
    }
    
    /**
     * Trial Balance: verify all debit balances == all credit balances
     * Returns true if books balance.
     */
    public boolean verifyTrialBalance() {
        BigDecimal totalDebitBalances = BigDecimal.ZERO;
        BigDecimal totalCreditBalances = BigDecimal.ZERO;
        
        for (Account account : accounts.values()) {
            BigDecimal balance = getBalance(account.id);
            
            if (balance.compareTo(BigDecimal.ZERO) > 0) {
                if (account.isDebitNormal()) {
                    totalDebitBalances = totalDebitBalances.add(balance);
                } else {
                    totalCreditBalances = totalCreditBalances.add(balance);
                }
            } else if (balance.compareTo(BigDecimal.ZERO) < 0) {
                // Contra balance
                if (account.isDebitNormal()) {
                    totalCreditBalances = totalCreditBalances.add(balance.negate());
                } else {
                    totalDebitBalances = totalDebitBalances.add(balance.negate());
                }
            }
        }
        
        return totalDebitBalances.compareTo(totalCreditBalances) == 0;
    }
}

// Usage: Payment flow
// Merchant receives payment:
// Debit: "merchant_settlement" (ASSET) ₹100
// Credit: "payment_gateway_revenue" (REVENUE) ₹2.36 (2.36% MDR)
// Credit: "merchant_payable" (LIABILITY) ₹97.64
```

---

## Round 2: System Design — Razorpay Settlement Engine

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│              Razorpay Settlement Engine                         │
│                                                                 │
│  Payment Captured                                               │
│  ┌──────────┐                                                   │
│  │ Payment  │──Kafka──→ Settlement Processor                    │
│  │ Service  │                                                   │
│  └──────────┘                                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Settlement Processor                    │        │
│  │                                                     │        │
│  │  1. AGGREGATE: Batch payments by merchant + date    │        │
│  │     └─ T+2 settlement window (configurable)         │        │
│  │     └─ Min settlement threshold: ₹100               │        │
│  │                                                     │        │
│  │  2. CALCULATE: For each settlement batch:           │        │
│  │     ├─ Gross amount: sum(captured payments)         │        │
│  │     ├─ Deductions: MDR fees (% per payment method)  │        │
│  │     ├─ GST on MDR: 18%                              │        │
│  │     ├─ Refunds: subtract pending refunds            │        │
│  │     ├─ Chargebacks: subtract open disputes          │        │
│  │     └─ Net amount: gross - deductions - refunds     │        │
│  │                                                     │        │
│  │  3. RECONCILE: Double-entry journal entries         │        │
│  │     └─ Every rupee accounted for                    │        │
│  │     └─ Trial balance verification                   │        │
│  │                                                     │        │
│  │  4. DISBURSE: Initiate bank transfer               │        │
│  │     ├─ NEFT (T+2 batch) → ₹0 fee                   │        │
│  │     ├─ IMPS (instant) → ₹5 fee per txn             │        │
│  │     └─ UPI (instant) → ₹0 for < ₹1L                │        │
│  │                                                     │        │
│  │  5. CONFIRM: Bank webhook → mark settled            │        │
│  │     └─ Retry with exponential backoff on failure    │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Ledger Store │  │ Scheduler    │  │ Notification     │      │
│  │ PostgreSQL   │  │ Temporal.io  │  │ Service          │      │
│  │ + Audit log  │  │ Cron: T+2   │  │ Email/Webhook    │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
│                                                                 │
│  Scale:                                                         │
│  - 5M payments/day → ~1M settlements/day                       │
│  - Settlement accuracy: 100% (zero tolerance, double-entry)    │
│  - Reconciliation runs: hourly automated + daily manual audit  │
│  - Amount precision: BigDecimal (never floating point)         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions:
- **BigDecimal always**: never use `double`/`float` for money — rounding errors accumulate
- **Double-entry bookkeeping**: every transaction creates balanced journal entries — enables automated reconciliation
- **Idempotency**: transaction IDs prevent duplicate settlements on retry
- **T+2 settlement**: configurable per merchant — allows time for chargebacks/refunds before settlement
- **Temporal.io for scheduling**: durable execution — settlement workflow survives server restarts
- **Audit log**: immutable append-only — every state transition recorded for compliance

---

## 🎯 Key Takeaways
- Razorpay SDE-2 = **Double-entry bookkeeping + settlement engine design**
- **BigDecimal**: never `double` for money — `compareTo` instead of `==` for equality
- **Double-entry invariant**: `sum(debits) == sum(credits)` for every transaction — reject if unbalanced
- **Normal balance**: ASSET/EXPENSE = debit-normal, LIABILITY/EQUITY/REVENUE = credit-normal
- **Trial balance**: all debit balances must equal all credit balances — automated verification
- **Idempotency set**: `processedTxnIds` prevents duplicate processing — critical for payment systems
- **Settlement cycle**: aggregate → calculate → reconcile → disburse → confirm — each step auditable
- Razorpay = **fintech domain expertise** — understanding MDR, chargebacks, refunds, T+2 settlement

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA | Hard | Double-Entry Bookkeeping, BigDecimal |
| System Design | Very Hard | Settlement Engine, Reconciliation |
| Technical 2 | Medium-Hard | Java, Concurrency, APIs |
| HM | Medium | Culture Fit |
