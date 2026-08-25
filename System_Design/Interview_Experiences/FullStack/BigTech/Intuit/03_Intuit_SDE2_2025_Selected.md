# Intuit — SDE-2 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | SDE-2 FullStack |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | TurboTax |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Craft Demo + Technical Pair + System Design + Behavioral + HM)

---

## Round 1: Craft Demo (Take-Home)
**Duration:** 1 week

### Challenge
Build an **Expense Tracker** with recurring expense detection

### 💡 Recurring Expense Detection Algorithm

```java
class RecurringExpenseDetector {
    // Detect recurring expenses (Netflix, Spotify, etc.)
    List<RecurringExpense> detect(List<Transaction> transactions) {
        // 1. Group by merchant + approximate amount (±10%)
        Map<String, List<Transaction>> groups = new HashMap<>();
        
        for (Transaction txn : transactions) {
            // Normalize merchant name (lowercase, strip suffixes)
            String key = normalizeMerchant(txn.merchant) + ":" + 
                         amountBucket(txn.amount); // Round to nearest $5
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(txn);
        }
        
        List<RecurringExpense> recurring = new ArrayList<>();
        
        for (var entry : groups.entrySet()) {
            List<Transaction> txns = entry.getValue();
            if (txns.size() < 3) continue; // Need at least 3 occurrences
            
            // Sort by date
            txns.sort(Comparator.comparing(Transaction::getDate));
            
            // 2. Calculate intervals between consecutive transactions
            List<Long> intervals = new ArrayList<>();
            for (int i = 1; i < txns.size(); i++) {
                long daysBetween = ChronoUnit.DAYS.between(txns.get(i-1).getDate(), txns.get(i).getDate());
                intervals.add(daysBetween);
            }
            
            // 3. Check if intervals are regular (within 20% tolerance)
            long medianInterval = getMedian(intervals);
            boolean isRegular = intervals.stream()
                .allMatch(interval -> Math.abs(interval - medianInterval) <= medianInterval * 0.2);
            
            if (isRegular && medianInterval >= 7) { // At least weekly
                RecurringFrequency freq = classifyFrequency(medianInterval);
                double avgAmount = txns.stream().mapToDouble(Transaction::getAmount).average().orElse(0);
                
                recurring.add(new RecurringExpense(
                    txns.get(0).getMerchant(),
                    avgAmount,
                    freq,
                    txns.get(txns.size() - 1).getDate(), // Last occurrence
                    predictNextDate(txns.get(txns.size() - 1).getDate(), medianInterval),
                    txns.size()
                ));
            }
        }
        
        return recurring;
    }
    
    RecurringFrequency classifyFrequency(long days) {
        if (days >= 5 && days <= 9) return RecurringFrequency.WEEKLY;
        if (days >= 12 && days <= 16) return RecurringFrequency.BIWEEKLY;
        if (days >= 26 && days <= 35) return RecurringFrequency.MONTHLY;
        if (days >= 85 && days <= 100) return RecurringFrequency.QUARTERLY;
        if (days >= 350 && days <= 380) return RecurringFrequency.YEARLY;
        return RecurringFrequency.CUSTOM;
    }
    
    String normalizeMerchant(String name) {
        return name.toLowerCase()
            .replaceAll("\\s*#\\d+$", "")        // Remove store numbers
            .replaceAll("\\s*-\\s*\\d+$", "")     // Remove location codes
            .replaceAll("\\s+", " ")              // Normalize whitespace
            .trim();
    }
    
    long amountBucket(double amount) {
        return Math.round(amount / 5.0) * 5; // Round to nearest $5
    }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design a Multi-Region Tax Filing System** (like TurboTax)
   - Users fill tax returns over multiple sessions (save & resume)
   - Calculation engine: real-time tax estimation as fields change
   - Filing deadline: millions of concurrent users at April deadline
   - Data security: PII + financial data, SOC 2 compliance
   - Multi-region: US (IRS), India (ITR), Canada (CRA)

### 💡 Key Design

```
Architecture:
┌──────────────────────────────────────────────────────┐
│                    CDN (CloudFront)                    │
│         Static assets + edge caching                  │
└──────────┬───────────────────────────────────────────┘
           │
  ┌────────▼──────────┐
  │  API Gateway      │ Regional deployment (us-east, ap-south, ca-central)
  │  Rate Limit + Auth│
  └────────┬──────────┘
           │
   ┌───────┼──────────────────┐
   │       │                  │
┌──▼────┐ ┌▼──────────┐ ┌───▼──────────┐
│Return │ │ Calc       │ │ Filing       │
│Service│ │ Engine     │ │ Service      │
│ CRUD  │ │ (tax math) │ │ (submit to   │
│ Save  │ │ Real-time  │ │  IRS/ITR)    │
│ Resume│ │ estimate   │ │              │
└──┬────┘ └──┬─────────┘ └──────────────┘
   │         │
┌──▼────┐ ┌──▼────────┐
│ DynamoDB│ │PostgreSQL │
│(session │ │(filed     │
│ draft)  │ │ returns)  │
└─────────┘ └───────────┘

Save & Resume (Multi-Session):
- DynamoDB: { user_id, return_id, section_id, data: JSON, last_saved_at }
- Auto-save: every 30 seconds (debounced) or on blur
- Manual save: explicit "Save" button
- Conflict resolution: last-write-wins with warning if multiple tabs detected
- Encryption at rest: AES-256, per-user encryption key in KMS

Real-Time Tax Calculation:
class TaxCalculationEngine {
    // Stateless: compute from entire return data each time
    TaxResult calculate(TaxReturn taxReturn, String jurisdiction) {
        TaxRules rules = rulesEngine.getRules(jurisdiction, taxReturn.getYear());
        
        // 1. Gross Income
        BigDecimal grossIncome = calculateGrossIncome(taxReturn.getIncomeSources());
        
        // 2. Adjustments (Above-the-line deductions)
        BigDecimal adjustments = calculateAdjustments(taxReturn, rules);
        BigDecimal agi = grossIncome.subtract(adjustments); // Adjusted Gross Income
        
        // 3. Deductions (Standard vs Itemized — pick better)
        BigDecimal standardDeduction = rules.getStandardDeduction(taxReturn.getFilingStatus());
        BigDecimal itemizedDeduction = calculateItemizedDeductions(taxReturn, rules);
        BigDecimal deduction = standardDeduction.max(itemizedDeduction);
        String deductionType = standardDeduction.compareTo(itemizedDeduction) >= 0 
            ? "standard" : "itemized";
        
        // 4. Taxable Income
        BigDecimal taxableIncome = agi.subtract(deduction).max(BigDecimal.ZERO);
        
        // 5. Apply tax brackets
        BigDecimal tax = applyBrackets(taxableIncome, rules.getBrackets(taxReturn.getFilingStatus()));
        
        // 6. Credits
        BigDecimal credits = calculateCredits(taxReturn, rules, agi);
        
        // 7. Final tax
        BigDecimal finalTax = tax.subtract(credits).max(BigDecimal.ZERO);
        BigDecimal withholdings = taxReturn.getTotalWithholdings();
        BigDecimal refundOrOwed = withholdings.subtract(finalTax);
        
        return TaxResult.builder()
            .grossIncome(grossIncome).agi(agi)
            .deduction(deduction).deductionType(deductionType)
            .taxableIncome(taxableIncome).tax(tax)
            .credits(credits).finalTax(finalTax)
            .withholdings(withholdings)
            .refund(refundOrOwed.compareTo(BigDecimal.ZERO) > 0 ? refundOrOwed : BigDecimal.ZERO)
            .amountOwed(refundOrOwed.compareTo(BigDecimal.ZERO) < 0 ? refundOrOwed.abs() : BigDecimal.ZERO)
            .build();
    }
}

April Deadline Scaling:
- Normal load: 10K concurrent users
- April 14-15: 5M concurrent users (500x spike)
- Strategy:
  1. DynamoDB auto-scaling: on-demand mode → handles any throughput
  2. Pre-warming: scale up ECS/Lambda 2 days before deadline
  3. Feature degradation: disable non-essential features (import from W-2 photo)
  4. Queue filing submissions: Kafka → process async → email confirmation
  5. CDN: all static assets + FAQ pages cached at edge
  6. Database read replicas: 10 replicas for read-heavy tax calculation

Security (SOC 2 + IRS Requirements):
- PII fields: SSN, DOB, bank account → encrypted separately (field-level encryption)
- Access logging: every read of PII fields is audited
- Data residency: US returns stay in US region, India in ap-south
- Session timeout: 15 minutes of inactivity
- MFA required for filing (OTP/Authenticator)
```

---

## 🎯 Key Takeaways
- Intuit = **tax domain + Craft Demo + calculation correctness + scale at deadline**
- **Recurring expense detection**: group by normalized merchant + amount bucket → check interval regularity
- **Tax calculation engine**: stateless pure function → recalculate on every change → always consistent
- **Standard vs Itemized**: automatically pick the better deduction → customer-friendly optimization
- **April deadline scaling**: 500x traffic spike → auto-scaling DB + pre-warm compute + queue submissions
- **Field-level encryption**: SSN/bank account encrypted separately from other return data
- **Multi-region tax rules**: rule engine with jurisdiction + year versioning
- Intuit Craft Demo evaluation: **code quality, UX, accessibility, testing, documentation**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Craft Demo | Hard | Expense Tracker, Recurring Detection |
| Technical Pair | Medium-Hard | React Patterns, Testing |
| System Design | Hard | Tax Filing, Multi-Region, Scale |
| Behavioral | Medium | Customer Obsession |
| HM | Medium | Growth, Innovation |
