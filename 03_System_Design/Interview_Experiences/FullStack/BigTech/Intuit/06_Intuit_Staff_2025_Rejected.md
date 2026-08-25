# Intuit — Staff SWE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | Staff Software Engineer |
| **Level** | Staff |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Craft Demo + 2 Technical + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Technical — Implement a Tax Calculation Engine
**Duration:** 60 minutes

### Problem
Build a flexible tax calculation engine supporting:
- Multiple tax brackets (progressive taxation)
- Different tax types (income, capital gains, sales tax)
- Deductions and exemptions
- Multi-state/country rules

### 💡 Interview-Ready Answer

```java
import java.math.*;
import java.util.*;

public class TaxCalculationEngine {

    static class TaxBracket {
        final BigDecimal lowerBound;
        final BigDecimal upperBound; // null for last bracket
        final BigDecimal rate;       // 0.10 = 10%

        TaxBracket(double lower, Double upper, double rate) {
            this.lowerBound = BigDecimal.valueOf(lower);
            this.upperBound = upper != null ? BigDecimal.valueOf(upper) : null;
            this.rate = BigDecimal.valueOf(rate);
        }
    }

    static class TaxRuleSet {
        final String jurisdiction;    // e.g., "US-CA", "IN"
        final String taxType;         // INCOME, CAPITAL_GAINS, SALES
        final List<TaxBracket> brackets;
        final Map<String, BigDecimal> standardDeductions;

        TaxRuleSet(String jurisdiction, String taxType) {
            this.jurisdiction = jurisdiction;
            this.taxType = taxType;
            this.brackets = new ArrayList<>();
            this.standardDeductions = new LinkedHashMap<>();
        }

        TaxRuleSet addBracket(double lower, Double upper, double rate) {
            brackets.add(new TaxBracket(lower, upper, rate));
            return this;
        }

        TaxRuleSet addDeduction(String name, double amount) {
            standardDeductions.put(name, BigDecimal.valueOf(amount));
            return this;
        }
    }

    static class TaxResult {
        BigDecimal grossIncome;
        BigDecimal totalDeductions;
        BigDecimal taxableIncome;
        BigDecimal totalTax;
        BigDecimal effectiveRate;
        List<String> breakdownLines = new ArrayList<>();

        @Override
        public String toString() {
            StringBuilder sb = new StringBuilder();
            sb.append(String.format("Gross Income:     ₹%,.2f%n", grossIncome));
            sb.append(String.format("Deductions:       ₹%,.2f%n", totalDeductions));
            sb.append(String.format("Taxable Income:   ₹%,.2f%n", taxableIncome));
            sb.append("--- Bracket Breakdown ---\n");
            breakdownLines.forEach(line -> sb.append("  ").append(line).append("\n"));
            sb.append(String.format("Total Tax:        ₹%,.2f%n", totalTax));
            sb.append(String.format("Effective Rate:   %.2f%%%n",
                effectiveRate.multiply(BigDecimal.valueOf(100))));
            return sb.toString();
        }
    }

    private final Map<String, TaxRuleSet> ruleSets = new HashMap<>();

    public void registerRuleSet(TaxRuleSet ruleSet) {
        String key = ruleSet.jurisdiction + ":" + ruleSet.taxType;
        ruleSets.put(key, ruleSet);
    }

    /**
     * Calculate progressive tax using brackets.
     * Each bracket's rate only applies to income within that bracket's range.
     */
    public TaxResult calculateTax(String jurisdiction, String taxType,
                                   BigDecimal grossIncome,
                                   Map<String, BigDecimal> additionalDeductions) {
        String key = jurisdiction + ":" + taxType;
        TaxRuleSet rules = ruleSets.get(key);
        if (rules == null) {
            throw new IllegalArgumentException("No rules for: " + key);
        }

        TaxResult result = new TaxResult();
        result.grossIncome = grossIncome;

        // Calculate deductions
        BigDecimal totalDeductions = BigDecimal.ZERO;
        for (BigDecimal d : rules.standardDeductions.values()) {
            totalDeductions = totalDeductions.add(d);
        }
        if (additionalDeductions != null) {
            for (BigDecimal d : additionalDeductions.values()) {
                totalDeductions = totalDeductions.add(d);
            }
        }
        result.totalDeductions = totalDeductions;

        // Taxable income = gross - deductions (min 0)
        result.taxableIncome = grossIncome.subtract(totalDeductions)
            .max(BigDecimal.ZERO);

        // Apply progressive brackets
        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal remaining = result.taxableIncome;

        for (TaxBracket bracket : rules.brackets) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal bracketWidth;
            if (bracket.upperBound != null) {
                bracketWidth = bracket.upperBound.subtract(bracket.lowerBound);
            } else {
                bracketWidth = remaining; // Last bracket — no upper bound
            }

            BigDecimal taxableInBracket = remaining.min(bracketWidth);
            BigDecimal bracketTax = taxableInBracket.multiply(bracket.rate)
                .setScale(2, RoundingMode.HALF_UP);

            totalTax = totalTax.add(bracketTax);
            remaining = remaining.subtract(taxableInBracket);

            result.breakdownLines.add(String.format(
                "₹%,.0f – ₹%s @ %.0f%% = ₹%,.2f",
                bracket.lowerBound,
                bracket.upperBound != null ?
                    String.format("%,.0f", bracket.upperBound) : "∞",
                bracket.rate.multiply(BigDecimal.valueOf(100)),
                bracketTax));
        }

        result.totalTax = totalTax;
        result.effectiveRate = grossIncome.compareTo(BigDecimal.ZERO) > 0
            ? totalTax.divide(grossIncome, 6, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        return result;
    }

    /**
     * Calculate tax for multiple income sources.
     */
    public TaxResult calculateCombined(String jurisdiction,
                                        Map<String, BigDecimal> incomeSources,
                                        Map<String, BigDecimal> deductions) {
        BigDecimal totalIncome = incomeSources.values().stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return calculateTax(jurisdiction, "INCOME", totalIncome, deductions);
    }

    public static void main(String[] args) {
        TaxCalculationEngine engine = new TaxCalculationEngine();

        // Indian Income Tax 2025 (New Regime)
        TaxRuleSet indiaTax = new TaxRuleSet("IN", "INCOME")
            .addBracket(0, 300000.0, 0.00)      // 0-3L: Nil
            .addBracket(300000, 700000.0, 0.05)  // 3L-7L: 5%
            .addBracket(700000, 1000000.0, 0.10) // 7L-10L: 10%
            .addBracket(1000000, 1200000.0, 0.15) // 10L-12L: 15%
            .addBracket(1200000, 1500000.0, 0.20) // 12L-15L: 20%
            .addBracket(1500000, null, 0.30)       // 15L+: 30%
            .addDeduction("Standard Deduction", 75000);

        engine.registerRuleSet(indiaTax);

        // US Federal Income Tax 2025 (Single Filer - simplified)
        TaxRuleSet usTax = new TaxRuleSet("US", "INCOME")
            .addBracket(0, 11600.0, 0.10)
            .addBracket(11600, 47150.0, 0.12)
            .addBracket(47150, 100525.0, 0.22)
            .addBracket(100525, 191950.0, 0.24)
            .addBracket(191950, 243725.0, 0.32)
            .addBracket(243725, 609350.0, 0.35)
            .addBracket(609350, null, 0.37)
            .addDeduction("Standard Deduction", 14600);

        engine.registerRuleSet(usTax);

        // Calculate Indian tax for ₹20 LPA
        System.out.println("=== India Tax (₹20 LPA) ===");
        TaxResult india = engine.calculateTax("IN", "INCOME",
            BigDecimal.valueOf(2000000), null);
        System.out.println(india);

        // Calculate US tax for $120K
        System.out.println("=== US Tax ($120K) ===");
        TaxResult us = engine.calculateTax("US", "INCOME",
            BigDecimal.valueOf(120000),
            Map.of("401k", BigDecimal.valueOf(22500)));
        System.out.println(us);
    }
}
```

## 🎯 Key Takeaways
- Intuit (TurboTax, QuickBooks) interview problems are **finance/tax domain** specific
- Progressive taxation: each bracket's rate only applies to income within that bracket's range
- Always use `BigDecimal` with proper rounding mode for financial calculations
- Effective tax rate = totalTax / grossIncome is a key metric
- Rule sets should be data-driven and extensible for multi-jurisdiction support
- Deductions reduce taxable income, not tax directly

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Craft Demo | Medium | Past Project Deep Dive |
| Technical 1 | Medium-Hard | Domain Modeling, BigDecimal, Tax Rules |
| Technical 2 | Hard | System Design |
| HM | Medium | Behavioral, Customer Obsession |
