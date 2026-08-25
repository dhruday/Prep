# Intuit — SDE-3 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | Staff Software Engineer |
| **Level** | Staff (SDE-3 equivalent) |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Mountain View, CA |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Intuit-Interview-Questions-E2293.htm) |
| **Author** | Anonymous |
| **Team** | QuickBooks Online |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Craft Demo + 2 Technical + System Design + HM)

---

## Round 1: Craft Demo (Intuit Signature Round)
**Duration:** 60 minutes

### Presentation Topic: "Building a Real-Time Financial Reconciliation System"

Key points the interviewer evaluated:
1. **Customer obsession**: How did you identify the customer pain point?
2. **Technical depth**: Architecture decisions and trade-offs
3. **Impact**: Measurable outcomes (time saved, error reduction)

### Interview-Ready Craft Demo Template:

```markdown
# Craft Demo: Real-Time Financial Reconciliation

## Customer Problem
- Small businesses spend 8+ hours/month manually reconciling bank transactions
- Error rate: 5% of manual reconciliation entries are incorrect
- Late reconciliation leads to cash flow visibility gaps

## Solution: Auto-Reconciliation Engine
- ML matching: 94% auto-match rate (bank txn → invoice/bill)
- Rules engine: configurable matching rules per business type
- Confidence scoring: high/medium/low → auto-match, suggest, manual

## Architecture
- Event-driven: bank feed webhook → Kafka → matching service
- Matching pipeline: exact match → fuzzy match → ML model → manual queue
- Audit trail: immutable log of every match decision

## Impact
- Reconciliation time: 8 hours → 20 minutes (95% reduction)
- Error rate: 5% → 0.3%
- Customer satisfaction: NPS +18 points
- Revenue impact: 15% increase in QuickBooks Advanced tier adoption
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Question 1: Implement an Expression Evaluator for Tax Formula Engine

```java
import java.util.*;

/**
 * Expression evaluator: parse and evaluate arithmetic expressions
 * with variables, functions, and operator precedence.
 * 
 * Supports: +, -, *, /, %, parentheses, variables, functions (MAX, MIN, IF, ROUND)
 * 
 * Example: "IF(income > 50000, income * 0.30, income * 0.20)"
 * 
 * Approach:
 * 1. Tokenize: string → tokens
 * 2. Parse: tokens → AST (Recursive Descent Parser)
 * 3. Evaluate: AST → value (with variable context)
 * 
 * Time: O(n) parse + O(n) evaluate
 */
public class ExpressionEvaluator {
    
    interface Expr {
        double eval(Map<String, Double> context);
    }
    
    static class NumberExpr implements Expr {
        double value;
        NumberExpr(double value) { this.value = value; }
        public double eval(Map<String, Double> ctx) { return value; }
    }
    
    static class VariableExpr implements Expr {
        String name;
        VariableExpr(String name) { this.name = name; }
        public double eval(Map<String, Double> ctx) {
            Double val = ctx.get(name);
            if (val == null) throw new RuntimeException("Undefined variable: " + name);
            return val;
        }
    }
    
    static class BinaryExpr implements Expr {
        char op;
        Expr left, right;
        BinaryExpr(char op, Expr left, Expr right) {
            this.op = op; this.left = left; this.right = right;
        }
        public double eval(Map<String, Double> ctx) {
            double l = left.eval(ctx), r = right.eval(ctx);
            switch (op) {
                case '+': return l + r;
                case '-': return l - r;
                case '*': return l * r;
                case '/': 
                    if (r == 0) throw new ArithmeticException("Division by zero");
                    return l / r;
                case '%': return l % r;
                case '>': return l > r ? 1 : 0;
                case '<': return l < r ? 1 : 0;
                default: throw new RuntimeException("Unknown op: " + op);
            }
        }
    }
    
    static class FuncExpr implements Expr {
        String name;
        List<Expr> args;
        FuncExpr(String name, List<Expr> args) { this.name = name; this.args = args; }
        
        public double eval(Map<String, Double> ctx) {
            switch (name.toUpperCase()) {
                case "MAX": return args.stream().mapToDouble(a -> a.eval(ctx)).max().orElse(0);
                case "MIN": return args.stream().mapToDouble(a -> a.eval(ctx)).min().orElse(0);
                case "ROUND": return Math.round(args.get(0).eval(ctx) * 100.0) / 100.0;
                case "ABS": return Math.abs(args.get(0).eval(ctx));
                case "IF": {
                    double cond = args.get(0).eval(ctx);
                    return cond != 0 ? args.get(1).eval(ctx) : args.get(2).eval(ctx);
                }
                default: throw new RuntimeException("Unknown function: " + name);
            }
        }
    }
    
    // Recursive Descent Parser
    private String expr;
    private int pos;
    
    public Expr parse(String expression) {
        this.expr = expression.replaceAll("\\s+", "");
        this.pos = 0;
        Expr result = parseExpression();
        if (pos != expr.length()) {
            throw new RuntimeException("Unexpected character at pos " + pos);
        }
        return result;
    }
    
    private Expr parseExpression() {
        return parseComparison();
    }
    
    private Expr parseComparison() {
        Expr left = parseAddSub();
        while (pos < expr.length() && (expr.charAt(pos) == '>' || expr.charAt(pos) == '<')) {
            char op = expr.charAt(pos++);
            Expr right = parseAddSub();
            left = new BinaryExpr(op, left, right);
        }
        return left;
    }
    
    private Expr parseAddSub() {
        Expr left = parseMulDiv();
        while (pos < expr.length() && (expr.charAt(pos) == '+' || expr.charAt(pos) == '-')) {
            char op = expr.charAt(pos++);
            left = new BinaryExpr(op, left, parseMulDiv());
        }
        return left;
    }
    
    private Expr parseMulDiv() {
        Expr left = parseUnary();
        while (pos < expr.length() && "/*%".indexOf(expr.charAt(pos)) >= 0) {
            char op = expr.charAt(pos++);
            left = new BinaryExpr(op, left, parseUnary());
        }
        return left;
    }
    
    private Expr parseUnary() {
        if (pos < expr.length() && expr.charAt(pos) == '-') {
            pos++;
            Expr operand = parsePrimary();
            return new BinaryExpr('*', new NumberExpr(-1), operand);
        }
        return parsePrimary();
    }
    
    private Expr parsePrimary() {
        // Parenthesized expression
        if (pos < expr.length() && expr.charAt(pos) == '(') {
            pos++; // consume '('
            Expr result = parseExpression();
            if (pos < expr.length() && expr.charAt(pos) == ')') pos++;
            return result;
        }
        
        // Number
        if (pos < expr.length() && (Character.isDigit(expr.charAt(pos)) || expr.charAt(pos) == '.')) {
            int start = pos;
            while (pos < expr.length() && (Character.isDigit(expr.charAt(pos)) || expr.charAt(pos) == '.')) {
                pos++;
            }
            return new NumberExpr(Double.parseDouble(expr.substring(start, pos)));
        }
        
        // Identifier (variable or function)
        if (pos < expr.length() && (Character.isLetter(expr.charAt(pos)) || expr.charAt(pos) == '_')) {
            int start = pos;
            while (pos < expr.length() && (Character.isLetterOrDigit(expr.charAt(pos)) || expr.charAt(pos) == '_')) {
                pos++;
            }
            String name = expr.substring(start, pos);
            
            // Check if function call
            if (pos < expr.length() && expr.charAt(pos) == '(') {
                pos++; // consume '('
                List<Expr> args = new ArrayList<>();
                if (pos < expr.length() && expr.charAt(pos) != ')') {
                    args.add(parseExpression());
                    while (pos < expr.length() && expr.charAt(pos) == ',') {
                        pos++;
                        args.add(parseExpression());
                    }
                }
                if (pos < expr.length() && expr.charAt(pos) == ')') pos++;
                return new FuncExpr(name, args);
            }
            
            return new VariableExpr(name);
        }
        
        throw new RuntimeException("Unexpected character at " + pos + ": " + 
            (pos < expr.length() ? expr.charAt(pos) : "EOF"));
    }
    
    // Helper: evaluate formula with context
    public double evaluate(String formula, Map<String, Double> context) {
        Expr ast = parse(formula);
        return ast.eval(context);
    }
}

// Usage: Tax calculation
ExpressionEvaluator eval = new ExpressionEvaluator();
Map<String, Double> ctx = Map.of("income", 75000.0, "deductions", 12500.0);
double tax = eval.evaluate("IF(income - deductions > 50000, (income - deductions) * 0.30, (income - deductions) * 0.20)", ctx);
// Result: (75000 - 12500) * 0.30 = 18750.0
```

---

## 🎯 Key Takeaways
- Intuit Staff = **Craft Demo (unique) + expression evaluator + system design**
- **Craft Demo**: present a real project with customer impact — #1 evaluated criterion is "customer obsession"
- **Expression evaluator**: recursive descent parser — operator precedence via parse hierarchy (comparison > add/sub > mul/div)
- **AST pattern**: NumberExpr, VariableExpr, BinaryExpr, FuncExpr — each implements `eval(context)`
- **Tax formula functions**: IF, MAX, MIN, ROUND, ABS — domain-specific built-in functions
- **Variable context**: `Map<String, Double>` — formulas reference runtime values
- **Recursive descent**: each grammar rule = one method — clean, extensible, easy to debug
- Intuit = **customer obsession** — every answer should tie back to "how does this help the customer?"

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Craft Demo | Hard (unique) | Presentation, Impact, Customer Focus |
| DSA | Hard | Expression Parser, Recursive Descent |
| System Design | Very Hard | Financial Reconciliation |
| Technical 2 | Hard | Architecture Trade-offs |
| HM | Medium | Culture Fit |
