# Intuit — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | SDE-2 |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/intuit-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Craft Demo + 2 DSA + System Design + HM)
- **Rejection Reason:** System Design — didn't handle multi-currency tax compliance

---

## Round 1: Craft Demo
**Duration:** 60 minutes — pre-recorded + live discussion

### Questions Asked
1. **Present a system you designed and built (pre-recorded 15 min)**
2. **40 minutes of deep-dive questions**
   - Why this architecture? What would you change? How would it scale 10x? What failed?

### 💡 What Makes a Good Craft Demo (Intuit-specific)
```
Craft Demo Best Practices:
- Pick a project with CLEAR customer impact (Intuit ❤️ customer obsession)
- Show architecture diagram FIRST (not code)
- Explain trade-offs you made and WHY
- Include metrics: before/after performance, customer satisfaction
- Show what you'd do differently (self-awareness)
- Be ready for: "What if this component fails?", "How would you scale 100x?"

DON'T:
- Show toy projects — Intuit wants production systems
- Focus only on code — they want architecture + decision-making
- Skip the customer context — always start with "The customer needed..."
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Calculator with Parentheses** (LeetCode 224/772 combined)
   - Support: +, -, *, /, (, ), spaces, negative numbers

### 💡 Full Calculator

```java
class Calculator {
    private int pos;
    private String expression;
    
    public double calculate(String s) {
        this.expression = s;
        this.pos = 0;
        return parseExpression();
    }
    
    // Expression: term (('+' | '-') term)*
    private double parseExpression() {
        double result = parseTerm();
        
        while (pos < expression.length()) {
            char op = expression.charAt(pos);
            if (op != '+' && op != '-') break;
            pos++; // consume operator
            double term = parseTerm();
            result = op == '+' ? result + term : result - term;
        }
        
        return result;
    }
    
    // Term: factor (('*' | '/') factor)*
    private double parseTerm() {
        double result = parseFactor();
        
        while (pos < expression.length()) {
            char op = expression.charAt(pos);
            if (op != '*' && op != '/') break;
            pos++; // consume operator
            double factor = parseFactor();
            if (op == '*') result *= factor;
            else {
                if (factor == 0) throw new ArithmeticException("Division by zero");
                result /= factor;
            }
        }
        
        return result;
    }
    
    // Factor: number | '(' expression ')' | unary '-' factor
    private double parseFactor() {
        skipSpaces();
        
        // Unary minus
        if (pos < expression.length() && expression.charAt(pos) == '-') {
            pos++;
            return -parseFactor();
        }
        
        // Parenthesized expression
        if (pos < expression.length() && expression.charAt(pos) == '(') {
            pos++; // consume '('
            double result = parseExpression();
            if (pos < expression.length() && expression.charAt(pos) == ')') {
                pos++; // consume ')'
            }
            skipSpaces();
            return result;
        }
        
        // Number
        return parseNumber();
    }
    
    private double parseNumber() {
        skipSpaces();
        int start = pos;
        
        while (pos < expression.length() && (Character.isDigit(expression.charAt(pos)) || expression.charAt(pos) == '.')) {
            pos++;
        }
        
        if (start == pos) throw new IllegalArgumentException("Expected number at position " + pos);
        
        skipSpaces();
        return Double.parseDouble(expression.substring(start, pos));
    }
    
    private void skipSpaces() {
        while (pos < expression.length() && expression.charAt(pos) == ' ') pos++;
    }
}

// Recursive descent parser handles operator precedence naturally:
// Expression (lowest priority: +, -)
//   → Term (higher priority: *, /)
//     → Factor (highest: numbers, parens, unary minus)
// "3 + 4 * 2 / (1 - 5)" → 3 + ((4 * 2) / (1 - 5)) = 3 + (-2) = 1
```

---

## Round 3: System Design (Where I Failed)
**Duration:** 60 minutes

### Questions Asked
1. **Design a Multi-Currency Tax Compliance Engine**
   - Like TurboTax but for businesses with international operations

### 💡 What I Should Have Covered

```
Tax Compliance Engine:
┌──────────────────────────────────────────────────────────────┐
│  Multi-Currency Handling:                                     │
│  - Functional currency: company's primary reporting currency │
│  - Transaction currency: currency of the actual transaction  │
│  - Convert at: transaction date rate (for P&L)               │
│    OR closing rate (for balance sheet items)                  │
│  - Exchange rate source: ECB, OANDA (daily + intraday)       │
│  - Rounding: follow currency's minor units                   │
│    (JPY = 0 decimals, USD = 2, BHD = 3)                    │
│                                                                │
│  Tax Rule Engine:                                             │
│  - Rules vary by: country × state × category × amount       │
│  - US: Federal + State + Local (e.g., NYC has extra tax)     │
│  - India: GST (CGST + SGST for intra-state, IGST for inter) │
│  - EU: VAT with reverse charge for B2B cross-border         │
│  - Nexus: in US, you only collect tax in states where you    │
│    have economic nexus (threshold: $100K sales or 200 txns)  │
│                                                                │
│  Architecture:                                                │
│  ┌──────────────────────────────────────────────┐            │
│  │ Rule Engine (Drools / custom):                 │            │
│  │ - Tax rules as versioned, auditable data       │            │
│  │   (NOT hardcoded in code)                      │            │
│  │ - Effective date ranges for rule changes        │            │
│  │ - Priority: specific rule > general rule        │            │
│  │ - Example rule:                                 │            │
│  │   IF country=US AND state=CA AND category=SaaS  │            │
│  │   AND effective_date >= 2024-01-01              │            │
│  │   THEN tax_rate = 7.25%                        │            │
│  └──────────────┬──────────────────────────────┘            │
│                  │                                            │
│  ┌──────────────▼──────────────────────────────┐            │
│  │ Calculation Engine:                           │            │
│  │ - Line-item level tax calculation              │            │
│  │ - Tax on tax (Canadian PST on GST)            │            │
│  │ - Tax-inclusive vs tax-exclusive pricing       │            │
│  │ - Threshold-based brackets (progressive tax)  │            │
│  │ - Use BigDecimal ONLY (never double for money)│            │
│  └──────────────┬──────────────────────────────┘            │
│                  │                                            │
│  ┌──────────────▼──────────────────────────────┐            │
│  │ Filing & Reporting:                           │            │
│  │ - Generate forms: W-2, 1099, GST returns      │            │
│  │ - E-filing API integration per jurisdiction   │            │
│  │ - Audit trail: every calculation logged        │            │
│  │ - Version: calculation reproducible at any    │            │
│  │   historical point (immutable tax rules)      │            │
│  └──────────────────────────────────────────────┘            │
│                                                                │
│  Key: Rules as DATA not CODE — auditors need to verify rules │
│  Key: BigDecimal everywhere — $0.01 rounding error × 1M txns │
│      = $10K discrepancy → audit red flag                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Intuit = **tax domain knowledge + Craft Demo + customer obsession**
- **Craft Demo** is unique to Intuit — prepare a real project presentation
- **Full Calculator** with recursive descent parser — handles precedence elegantly
- **Tax engine**: rules as data (not code), BigDecimal only, effective date ranges
- **Multi-currency**: functional vs transaction currency, closing vs transaction date rates
- **Currency rounding**: JPY (0 decimal), USD (2), BHD (3) — know this
- **Nexus rules** (US): must know economic nexus thresholds ($100K or 200 transactions)
- I failed because I proposed a simple if-else tax calculator instead of a **rule engine**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Craft Demo | Hard | Architecture Presentation, Deep Dive |
| DSA | Hard | Recursive Descent Parser, Calculator |
| System Design | Very Hard | Tax Engine, Multi-Currency, Rules Engine |
| HM | Medium | Behavioral, Customer Focus |
