# Razorpay — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/razorpay-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + 1 Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Payment Reconciliation System**
   - Given two streams of transactions (bank statements and internal ledger), find all discrepancies:
     - Present in ledger but missing from bank
     - Present in bank but missing from ledger
     - Amount mismatches for matching transaction IDs
   - Handle large datasets efficiently (100M+ records)

### 💡 Interview-Ready Answer

```java
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.*;

public class PaymentReconciliation {

    static class Transaction {
        String txnId;
        BigDecimal amount;
        String currency;
        long timestamp;
        String status;

        Transaction(String txnId, String amount, String currency, long timestamp, String status) {
            this.txnId = txnId;
            this.amount = new BigDecimal(amount);
            this.currency = currency;
            this.timestamp = timestamp;
            this.status = status;
        }
    }

    enum DiscrepancyType {
        MISSING_IN_BANK,      // In ledger, not in bank
        MISSING_IN_LEDGER,    // In bank, not in ledger
        AMOUNT_MISMATCH,      // Same txnId, different amounts
        STATUS_MISMATCH       // Same txnId, different statuses
    }

    static class Discrepancy {
        String txnId;
        DiscrepancyType type;
        String details;

        Discrepancy(String txnId, DiscrepancyType type, String details) {
            this.txnId = txnId;
            this.type = type;
            this.details = details;
        }

        @Override
        public String toString() {
            return String.format("[%s] %s: %s", type, txnId, details);
        }
    }

    /**
     * Reconcile two transaction streams.
     * 
     * Approach: Hash-based matching with single-pass for each stream.
     * Time: O(L + B) where L = ledger size, B = bank size
     * Space: O(L) — index the smaller stream (ledger)
     */
    public static List<Discrepancy> reconcile(
        List<Transaction> ledger,
        List<Transaction> bankStatements
    ) {
        List<Discrepancy> discrepancies = new ArrayList<>();

        // Index ledger by txnId
        Map<String, Transaction> ledgerMap = new HashMap<>();
        for (Transaction txn : ledger) {
            ledgerMap.put(txn.txnId, txn);
        }

        Set<String> matchedIds = new HashSet<>();

        // Pass 1: Iterate bank statements, find matches and mismatches
        for (Transaction bankTxn : bankStatements) {
            Transaction ledgerTxn = ledgerMap.get(bankTxn.txnId);

            if (ledgerTxn == null) {
                discrepancies.add(new Discrepancy(
                    bankTxn.txnId,
                    DiscrepancyType.MISSING_IN_LEDGER,
                    "Bank amount: " + bankTxn.amount + " " + bankTxn.currency
                ));
            } else {
                matchedIds.add(bankTxn.txnId);

                // Check amount
                if (ledgerTxn.amount.compareTo(bankTxn.amount) != 0) {
                    discrepancies.add(new Discrepancy(
                        bankTxn.txnId,
                        DiscrepancyType.AMOUNT_MISMATCH,
                        "Ledger: " + ledgerTxn.amount + ", Bank: " + bankTxn.amount
                    ));
                }

                // Check status
                if (!ledgerTxn.status.equals(bankTxn.status)) {
                    discrepancies.add(new Discrepancy(
                        bankTxn.txnId,
                        DiscrepancyType.STATUS_MISMATCH,
                        "Ledger: " + ledgerTxn.status + ", Bank: " + bankTxn.status
                    ));
                }
            }
        }

        // Pass 2: Find ledger entries missing from bank
        for (Transaction ledgerTxn : ledger) {
            if (!matchedIds.contains(ledgerTxn.txnId)) {
                discrepancies.add(new Discrepancy(
                    ledgerTxn.txnId,
                    DiscrepancyType.MISSING_IN_BANK,
                    "Ledger amount: " + ledgerTxn.amount + " " + ledgerTxn.currency
                ));
            }
        }

        return discrepancies;
    }

    /**
     * Follow-up: Chunked reconciliation for 100M+ records.
     * Process in sorted chunks to reduce memory usage.
     */
    public static class ChunkedReconciler {
        private final int chunkSize;

        public ChunkedReconciler(int chunkSize) {
            this.chunkSize = chunkSize;
        }

        /**
         * Sort-merge based reconciliation.
         * Both streams must be sorted by txnId.
         * Memory: O(chunkSize) instead of O(N).
         */
        public List<Discrepancy> reconcileSorted(
            Iterator<Transaction> ledgerIter,
            Iterator<Transaction> bankIter
        ) {
            List<Discrepancy> discrepancies = new ArrayList<>();

            Transaction ledgerTxn = ledgerIter.hasNext() ? ledgerIter.next() : null;
            Transaction bankTxn = bankIter.hasNext() ? bankIter.next() : null;

            while (ledgerTxn != null && bankTxn != null) {
                int cmp = ledgerTxn.txnId.compareTo(bankTxn.txnId);

                if (cmp == 0) {
                    // Match — check for mismatches
                    if (ledgerTxn.amount.compareTo(bankTxn.amount) != 0) {
                        discrepancies.add(new Discrepancy(
                            ledgerTxn.txnId, DiscrepancyType.AMOUNT_MISMATCH,
                            "Ledger: " + ledgerTxn.amount + ", Bank: " + bankTxn.amount
                        ));
                    }
                    ledgerTxn = ledgerIter.hasNext() ? ledgerIter.next() : null;
                    bankTxn = bankIter.hasNext() ? bankIter.next() : null;
                } else if (cmp < 0) {
                    // Ledger has extra entry
                    discrepancies.add(new Discrepancy(
                        ledgerTxn.txnId, DiscrepancyType.MISSING_IN_BANK,
                        "Amount: " + ledgerTxn.amount
                    ));
                    ledgerTxn = ledgerIter.hasNext() ? ledgerIter.next() : null;
                } else {
                    // Bank has extra entry
                    discrepancies.add(new Discrepancy(
                        bankTxn.txnId, DiscrepancyType.MISSING_IN_LEDGER,
                        "Amount: " + bankTxn.amount
                    ));
                    bankTxn = bankIter.hasNext() ? bankIter.next() : null;
                }
            }

            // Drain remaining
            while (ledgerTxn != null) {
                discrepancies.add(new Discrepancy(
                    ledgerTxn.txnId, DiscrepancyType.MISSING_IN_BANK,
                    "Amount: " + ledgerTxn.amount
                ));
                ledgerTxn = ledgerIter.hasNext() ? ledgerIter.next() : null;
            }
            while (bankTxn != null) {
                discrepancies.add(new Discrepancy(
                    bankTxn.txnId, DiscrepancyType.MISSING_IN_LEDGER,
                    "Amount: " + bankTxn.amount
                ));
                bankTxn = bankIter.hasNext() ? bankIter.next() : null;
            }

            return discrepancies;
        }
    }

    public static void main(String[] args) {
        List<Transaction> ledger = List.of(
            new Transaction("TXN001", "100.00", "INR", 1700000000, "SUCCESS"),
            new Transaction("TXN002", "250.50", "INR", 1700000100, "SUCCESS"),
            new Transaction("TXN003", "75.00", "INR", 1700000200, "PENDING"),
            new Transaction("TXN005", "500.00", "INR", 1700000400, "SUCCESS")
        );

        List<Transaction> bank = List.of(
            new Transaction("TXN001", "100.00", "INR", 1700000000, "SUCCESS"),
            new Transaction("TXN002", "260.50", "INR", 1700000100, "SUCCESS"), // amount mismatch
            new Transaction("TXN004", "300.00", "INR", 1700000300, "SUCCESS")  // missing in ledger
        );

        List<Discrepancy> discrepancies = reconcile(ledger, bank);
        System.out.println("=== Discrepancies Found: " + discrepancies.size() + " ===");
        discrepancies.forEach(System.out::println);
    }
}
```

**Complexity:**
- **Hash-based:** O(L + B) time, O(L) space
- **Sort-merge (chunked):** O(L log L + B log B) time, O(chunk) space — better for 100M+ records

## Round 2: Technical — LLD
**Duration:** 60 minutes | **Interviewer:** Senior Engineer

### Questions Asked
1. **Design a Payment Retry Engine**
   - Retry failed payments with exponential backoff
   - Configurable retry policies per payment method
   - Dead letter queue for permanently failed payments

## Round 3: Technical — System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Razorpay's Payment Gateway**
   - Handle 10K+ TPS
   - Multiple payment method integrations (UPI, cards, netbanking)
   - Idempotent payment processing

## Round 4: Hiring Manager
**Duration:** 30 minutes

## 🎯 Key Takeaways
- Razorpay interviews are **heavily fintech-focused** — reconciliation, ledgers, BigDecimal for money
- Sort-merge approach is preferred for large-scale reconciliation (disk-friendly)
- **Always use BigDecimal** for financial computations — never double/float
- Payment gateway design is a core question — know idempotency keys, 2-phase payment flows

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Medium-Hard | HashMap, Reconciliation, BigDecimal |
| LLD | Medium | Retry, Backoff, Dead Letter Queue |
| System Design | Hard | Payment Gateway, Idempotency |
| Hiring Manager | Easy | Behavioral |
