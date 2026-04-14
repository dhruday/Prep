# Intuit — Staff FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | Staff Software Engineer |
| **Level** | SDE-3 |
| **YOE** | 9 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Mountain View, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | TurboTax |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Craft Demo + 2 Coding + System Design + HM)

---

## Round 2: Coding — Implement a Tax Bracket Calculator with Deductions and Credits
**Duration:** 45 minutes

### Question: Build a progressive tax calculator supporting: brackets, standard/itemized deductions, tax credits (refundable + non-refundable), and filing status (single, married).

```java
import java.util.*;

/**
 * US Tax Bracket Calculator (2024 inspired):
 * 
 * Progressive taxation: each bracket taxes only the income WITHIN that bracket.
 * 
 * Flow:
 * 1. Gross Income
 * 2. - Above-the-line deductions (401k, HSA, student loan interest)
 * 3. = AGI (Adjusted Gross Income)
 * 4. - Standard or Itemized deduction (whichever is higher)
 * 5. = Taxable Income
 * 6. × Progressive tax brackets → Tax Liability
 * 7. - Tax Credits → Final Tax
 * 
 * Credits:
 * - Non-refundable: can only reduce tax to $0 (e.g., Child Tax Credit up to $2000)
 * - Refundable: can cause a refund (e.g., Earned Income Tax Credit, ACTC)
 */

enum FilingStatus {
    SINGLE, MARRIED_JOINTLY, MARRIED_SEPARATELY, HEAD_OF_HOUSEHOLD
}

class TaxBracket {
    double lowerBound;
    double upperBound; // Double.MAX_VALUE for last bracket
    double rate;       // 0.10 = 10%
    
    TaxBracket(double lower, double upper, double rate) {
        this.lowerBound = lower; this.upperBound = upper; this.rate = rate;
    }
}

class TaxResult {
    double grossIncome;
    double agi;
    double deductionUsed;
    String deductionType; // "standard" or "itemized"
    double taxableIncome;
    double taxBeforeCredits;
    double nonRefundableCreditsApplied;
    double refundableCreditsApplied;
    double finalTax;
    double effectiveRate;
    double marginalRate;
    List<String> bracketBreakdown;
    
    TaxResult() { bracketBreakdown = new ArrayList<>(); }
}

class TaxCalculator {
    
    // 2024 brackets (simplified)
    private static final Map<FilingStatus, List<TaxBracket>> BRACKETS = new HashMap<>();
    private static final Map<FilingStatus, Double> STANDARD_DEDUCTIONS = new HashMap<>();
    
    static {
        BRACKETS.put(FilingStatus.SINGLE, List.of(
            new TaxBracket(0, 11600, 0.10),
            new TaxBracket(11600, 47150, 0.12),
            new TaxBracket(47150, 100525, 0.22),
            new TaxBracket(100525, 191950, 0.24),
            new TaxBracket(191950, 243725, 0.32),
            new TaxBracket(243725, 609350, 0.35),
            new TaxBracket(609350, Double.MAX_VALUE, 0.37)
        ));
        
        BRACKETS.put(FilingStatus.MARRIED_JOINTLY, List.of(
            new TaxBracket(0, 23200, 0.10),
            new TaxBracket(23200, 94300, 0.12),
            new TaxBracket(94300, 201050, 0.22),
            new TaxBracket(201050, 383900, 0.24),
            new TaxBracket(383900, 487450, 0.32),
            new TaxBracket(487450, 731200, 0.35),
            new TaxBracket(731200, Double.MAX_VALUE, 0.37)
        ));
        
        STANDARD_DEDUCTIONS.put(FilingStatus.SINGLE, 14600.0);
        STANDARD_DEDUCTIONS.put(FilingStatus.MARRIED_JOINTLY, 29200.0);
        STANDARD_DEDUCTIONS.put(FilingStatus.MARRIED_SEPARATELY, 14600.0);
        STANDARD_DEDUCTIONS.put(FilingStatus.HEAD_OF_HOUSEHOLD, 21900.0);
    }
    
    /**
     * Calculate tax with full breakdown.
     * 
     * @param grossIncome Total income
     * @param filingStatus Filing status
     * @param aboveLineDeductions 401k + HSA + student loan interest
     * @param itemizedDeductions Mortgage interest + SALT + charity
     * @param nonRefundableCredits Child tax credit, education credits
     * @param refundableCredits EITC, ACTC, premium tax credit
     */
    public TaxResult calculate(double grossIncome, FilingStatus filingStatus,
                                double aboveLineDeductions, double itemizedDeductions,
                                double nonRefundableCredits, double refundableCredits) {
        
        TaxResult result = new TaxResult();
        result.grossIncome = grossIncome;
        
        // 1. Compute AGI
        result.agi = Math.max(0, grossIncome - aboveLineDeductions);
        
        // 2. Choose standard vs itemized deduction (whichever is higher)
        double standardDeduction = STANDARD_DEDUCTIONS.getOrDefault(filingStatus, 14600.0);
        
        if (itemizedDeductions > standardDeduction) {
            result.deductionUsed = itemizedDeductions;
            result.deductionType = "itemized";
        } else {
            result.deductionUsed = standardDeduction;
            result.deductionType = "standard";
        }
        
        // 3. Taxable income
        result.taxableIncome = Math.max(0, result.agi - result.deductionUsed);
        
        // 4. Apply progressive brackets
        List<TaxBracket> brackets = BRACKETS.getOrDefault(filingStatus, BRACKETS.get(FilingStatus.SINGLE));
        double tax = 0;
        double remainingIncome = result.taxableIncome;
        
        for (TaxBracket bracket : brackets) {
            if (remainingIncome <= 0) break;
            
            double taxableInBracket = Math.min(remainingIncome, bracket.upperBound - bracket.lowerBound);
            double taxInBracket = taxableInBracket * bracket.rate;
            tax += taxInBracket;
            
            result.bracketBreakdown.add(String.format(
                "  $%.0f - $%.0f @ %.0f%% = $%.2f",
                bracket.lowerBound, 
                Math.min(bracket.lowerBound + taxableInBracket, bracket.upperBound),
                bracket.rate * 100, taxInBracket));
            
            remainingIncome -= taxableInBracket;
            result.marginalRate = bracket.rate;
        }
        
        result.taxBeforeCredits = tax;
        
        // 5. Apply non-refundable credits (can only reduce tax to $0)
        result.nonRefundableCreditsApplied = Math.min(nonRefundableCredits, tax);
        tax -= result.nonRefundableCreditsApplied;
        
        // 6. Apply refundable credits (can make tax negative = refund)
        result.refundableCreditsApplied = refundableCredits;
        tax -= refundableCredits;
        
        result.finalTax = tax; // Negative = refund
        result.effectiveRate = grossIncome > 0 ? result.finalTax / grossIncome : 0;
        
        return result;
    }
    
    /**
     * Calculate marginal tax on next dollar of income.
     */
    public double marginalRate(double taxableIncome, FilingStatus status) {
        List<TaxBracket> brackets = BRACKETS.getOrDefault(status, BRACKETS.get(FilingStatus.SINGLE));
        
        for (TaxBracket bracket : brackets) {
            if (taxableIncome >= bracket.lowerBound && taxableIncome < bracket.upperBound) {
                return bracket.rate;
            }
        }
        
        return brackets.get(brackets.size() - 1).rate;
    }
    
    /**
     * Compare two filing statuses and recommend.
     */
    public String recommend(double grossIncome, double aboveLineDeductions, 
                             double itemizedDeductions, double credits) {
        double taxSingle = calculate(grossIncome, FilingStatus.SINGLE, 
            aboveLineDeductions, itemizedDeductions, credits, 0).finalTax;
        double taxHoH = calculate(grossIncome, FilingStatus.HEAD_OF_HOUSEHOLD,
            aboveLineDeductions, itemizedDeductions, credits, 0).finalTax;
        
        if (taxHoH < taxSingle) {
            return String.format("Head of Household saves $%.2f vs Single", taxSingle - taxHoH);
        }
        return "Single filing is optimal or equivalent";
    }
}
```

---

## 🎯 Key Takeaways
- Intuit Staff = **Progressive tax bracket calculator — domain-heavy, precision matters**
- **Progressive taxation**: each bracket taxes only income WITHIN that range — NOT the entire income at the highest rate
- **AGI → Taxable Income pipeline**: gross → above-line deductions → AGI → standard/itemized deduction → taxable income
- **Standard vs Itemized**: take whichever is higher — `Math.max(standard, itemized)`
- **Non-refundable credits**: `min(credits, tax)` — can only reduce tax to $0
- **Refundable credits**: can make tax negative — results in a refund
- **Effective vs Marginal rate**: effective = totalTax/grossIncome, marginal = bracket rate of last dollar
- **Rejection reason**: system design round on TurboTax rendering engine — candidate proposed monolithic approach, didn't discuss micro-frontends for form sections
- Intuit = **TurboTax, QuickBooks, Mint** — financial domain, precision, regulatory compliance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Craft Demo | Hard | Live Coding |
| Coding 1 (this) | Hard | Domain Modeling, Tax Logic |
| Coding 2 | Hard | String/DP |
| System Design | Very Hard | TurboTax Architecture |
| HM | Medium | Culture |
