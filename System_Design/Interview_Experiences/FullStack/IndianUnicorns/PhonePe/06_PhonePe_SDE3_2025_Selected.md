# PhonePe — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/phonepe-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Payments |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a UPI Payment Reconciliation Engine
**Duration:** 90 minutes

### Challenge: Build a reconciliation engine that matches PhonePe transaction records with bank settlement files, detects mismatches, and generates reconciliation reports.

```java
import java.util.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Duration;

/**
 * UPI Payment Reconciliation Engine:
 * 
 * Reconciliation = matching internal records (PhonePe) with external records (bank).
 * 
 * Match Types:
 * 1. MATCHED: both sides agree on amount + status
 * 2. AMOUNT_MISMATCH: exists on both sides but amount differs
 * 3. STATUS_MISMATCH: exists on both sides but status differs (e.g., we say success, bank says failed)
 * 4. MISSING_IN_BANK: PhonePe has it, bank doesn't (potential settlement delay)
 * 5. MISSING_IN_INTERNAL: Bank has it, PhonePe doesn't (potential data gap)
 * 6. DUPLICATE: same transaction appears multiple times
 */

enum TxnStatus { SUCCESS, FAILED, PENDING, REVERSED }
enum ReconStatus { MATCHED, AMOUNT_MISMATCH, STATUS_MISMATCH, MISSING_IN_BANK, MISSING_IN_INTERNAL, DUPLICATE }

class InternalRecord {
    String txnId;          // UPI Transaction Reference
    String upiId;          // VPA (user@phonepe)
    BigDecimal amount;
    TxnStatus status;
    LocalDateTime timestamp;
    String merchantId;
    
    InternalRecord(String txnId, String upiId, BigDecimal amount, TxnStatus status, LocalDateTime timestamp) {
        this.txnId = txnId; this.upiId = upiId; this.amount = amount;
        this.status = status; this.timestamp = timestamp;
    }
}

class BankRecord {
    String rrn;            // Retrieval Reference Number (bank's txn ID)
    String txnId;          // UPI Transaction Reference (maps to internal)
    BigDecimal amount;
    TxnStatus status;
    LocalDateTime settlementDate;
    String bankCode;
    
    BankRecord(String rrn, String txnId, BigDecimal amount, TxnStatus status, LocalDateTime settlementDate) {
        this.rrn = rrn; this.txnId = txnId; this.amount = amount;
        this.status = status; this.settlementDate = settlementDate;
    }
}

class ReconEntry {
    String txnId;
    ReconStatus status;
    InternalRecord internal;
    BankRecord bank;
    String description;
    BigDecimal discrepancy; // Amount difference (if any)
    
    ReconEntry(String txnId, ReconStatus status, InternalRecord internal, BankRecord bank, String description) {
        this.txnId = txnId; this.status = status;
        this.internal = internal; this.bank = bank;
        this.description = description;
        this.discrepancy = BigDecimal.ZERO;
    }
}

class ReconReport {
    LocalDateTime generatedAt;
    int totalInternal;
    int totalBank;
    int matched;
    int amountMismatch;
    int statusMismatch;
    int missingInBank;
    int missingInInternal;
    int duplicates;
    BigDecimal totalDiscrepancy;
    List<ReconEntry> entries;
    
    ReconReport() {
        this.generatedAt = LocalDateTime.now();
        this.entries = new ArrayList<>();
        this.totalDiscrepancy = BigDecimal.ZERO;
    }
}

class ReconciliationEngine {
    
    // Configurable tolerance for amount matching (handles rounding)
    private static final BigDecimal AMOUNT_TOLERANCE = new BigDecimal("0.01");
    
    // Max time window for matching (bank settlement may be delayed)
    private static final Duration SETTLEMENT_WINDOW = Duration.ofHours(48);
    
    /**
     * Run reconciliation between internal records and bank settlement file.
     * 
     * Algorithm:
     * 1. Index internal records by txnId → detect internal duplicates
     * 2. Index bank records by txnId → detect bank duplicates
     * 3. For each internal record, find matching bank record
     * 4. Compare amount and status
     * 5. Remaining unmatched bank records = missing in internal
     */
    public ReconReport reconcile(List<InternalRecord> internalRecords, List<BankRecord> bankRecords) {
        ReconReport report = new ReconReport();
        report.totalInternal = internalRecords.size();
        report.totalBank = bankRecords.size();
        
        // Step 1: Index internal records, detect duplicates
        Map<String, List<InternalRecord>> internalByTxnId = new HashMap<>();
        for (InternalRecord rec : internalRecords) {
            internalByTxnId.computeIfAbsent(rec.txnId, k -> new ArrayList<>()).add(rec);
        }
        
        // Check for internal duplicates
        for (var entry : internalByTxnId.entrySet()) {
            if (entry.getValue().size() > 1) {
                ReconEntry reconEntry = new ReconEntry(
                    entry.getKey(), ReconStatus.DUPLICATE,
                    entry.getValue().get(0), null,
                    "Duplicate internal record: " + entry.getValue().size() + " copies"
                );
                report.entries.add(reconEntry);
                report.duplicates++;
            }
        }
        
        // Step 2: Index bank records, detect duplicates
        Map<String, List<BankRecord>> bankByTxnId = new HashMap<>();
        for (BankRecord rec : bankRecords) {
            bankByTxnId.computeIfAbsent(rec.txnId, k -> new ArrayList<>()).add(rec);
        }
        
        for (var entry : bankByTxnId.entrySet()) {
            if (entry.getValue().size() > 1) {
                ReconEntry reconEntry = new ReconEntry(
                    entry.getKey(), ReconStatus.DUPLICATE,
                    null, entry.getValue().get(0),
                    "Duplicate bank record: " + entry.getValue().size() + " copies"
                );
                report.entries.add(reconEntry);
                report.duplicates++;
            }
        }
        
        // Step 3: Match internal → bank
        Set<String> matchedBankTxnIds = new HashSet<>();
        
        for (var entry : internalByTxnId.entrySet()) {
            String txnId = entry.getKey();
            InternalRecord internal = entry.getValue().get(0);
            
            List<BankRecord> bankMatches = bankByTxnId.get(txnId);
            
            if (bankMatches == null || bankMatches.isEmpty()) {
                // Missing in bank
                ReconEntry reconEntry = new ReconEntry(
                    txnId, ReconStatus.MISSING_IN_BANK,
                    internal, null,
                    "Transaction not found in bank settlement file"
                );
                report.entries.add(reconEntry);
                report.missingInBank++;
                continue;
            }
            
            BankRecord bank = bankMatches.get(0);
            matchedBankTxnIds.add(txnId);
            
            // Compare amount
            BigDecimal amountDiff = internal.amount.subtract(bank.amount).abs();
            if (amountDiff.compareTo(AMOUNT_TOLERANCE) > 0) {
                ReconEntry reconEntry = new ReconEntry(
                    txnId, ReconStatus.AMOUNT_MISMATCH,
                    internal, bank,
                    String.format("Amount mismatch: Internal=%.2f, Bank=%.2f, Diff=%.2f",
                        internal.amount, bank.amount, amountDiff)
                );
                reconEntry.discrepancy = amountDiff;
                report.entries.add(reconEntry);
                report.amountMismatch++;
                report.totalDiscrepancy = report.totalDiscrepancy.add(amountDiff);
                continue;
            }
            
            // Compare status
            if (internal.status != bank.status) {
                ReconEntry reconEntry = new ReconEntry(
                    txnId, ReconStatus.STATUS_MISMATCH,
                    internal, bank,
                    String.format("Status mismatch: Internal=%s, Bank=%s",
                        internal.status, bank.status)
                );
                report.entries.add(reconEntry);
                report.statusMismatch++;
                continue;
            }
            
            // Matched
            report.matched++;
        }
        
        // Step 4: Bank records not matched = missing in internal
        for (var entry : bankByTxnId.entrySet()) {
            if (!matchedBankTxnIds.contains(entry.getKey())) {
                BankRecord bank = entry.getValue().get(0);
                ReconEntry reconEntry = new ReconEntry(
                    entry.getKey(), ReconStatus.MISSING_IN_INTERNAL,
                    null, bank,
                    "Transaction found in bank but not in internal records"
                );
                report.entries.add(reconEntry);
                report.missingInInternal++;
            }
        }
        
        return report;
    }
    
    /**
     * Generate summary report.
     */
    public String generateSummary(ReconReport report) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== RECONCILIATION REPORT ===\n");
        sb.append("Generated: ").append(report.generatedAt).append("\n\n");
        
        sb.append("SUMMARY:\n");
        sb.append(String.format("  Internal Records: %d\n", report.totalInternal));
        sb.append(String.format("  Bank Records:     %d\n", report.totalBank));
        sb.append(String.format("  Matched:          %d (%.1f%%)\n", 
            report.matched, 100.0 * report.matched / Math.max(1, report.totalInternal)));
        sb.append(String.format("  Amount Mismatch:  %d\n", report.amountMismatch));
        sb.append(String.format("  Status Mismatch:  %d\n", report.statusMismatch));
        sb.append(String.format("  Missing in Bank:  %d\n", report.missingInBank));
        sb.append(String.format("  Missing Internal: %d\n", report.missingInInternal));
        sb.append(String.format("  Duplicates:       %d\n", report.duplicates));
        sb.append(String.format("  Total Discrepancy: ₹%.2f\n", report.totalDiscrepancy));
        
        // Discrepancy entries
        if (!report.entries.isEmpty()) {
            sb.append("\nDISCREPANCIES:\n");
            for (ReconEntry entry : report.entries) {
                sb.append(String.format("  [%s] %s — %s\n", entry.status, entry.txnId, entry.description));
            }
        }
        
        return sb.toString();
    }
}
```

---

## 🎯 Key Takeaways
- PhonePe SDE-3 = **UPI reconciliation engine — match internal vs bank records, detect mismatches**
- **Reconciliation = financial auditing**: ensures what PhonePe recorded matches what the bank settled
- **5 mismatch types**: MATCHED, AMOUNT_MISMATCH, STATUS_MISMATCH, MISSING_IN_BANK, MISSING_IN_INTERNAL, DUPLICATE
- **BigDecimal for money**: NEVER use `double` — precision matters in financial calculations
- **Amount tolerance**: ±₹0.01 — handles rounding differences between systems
- **Duplicate detection**: same txnId appearing multiple times in either source — index with `Map<txnId, List<Records>>`
- **Settlement delay**: bank records may arrive 24-48h later — MISSING_IN_BANK entries may auto-resolve next day
- **UPI RRN**: Retrieval Reference Number — bank's external reference, different from PhonePe's txnId
- PhonePe = **UPI payments, fintech** — reconciliation is critical: even ₹0.01 discrepancy must be investigated

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Very Hard | Reconciliation, Financial Logic |
| System Design | Very Hard | UPI Architecture |
| HM | Medium | Culture |
