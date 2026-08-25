# SAP — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 / T2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Medium](https://medium.com/tag/interview-experience) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + 1 Managerial)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Implement a Rule Engine for Business Validations**
   - Parse and evaluate rules like: `IF age > 18 AND country = "IN" THEN approved = true`
   - Support AND, OR, NOT operators
   - Nested conditions with parentheses
   - Rule priority and short-circuit evaluation

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.function.*;

public class RuleEngine {

    // ============================================
    // AST Nodes for Rule Expressions
    // ============================================
    interface Expression {
        boolean evaluate(Map<String, Object> context);
    }

    static class ComparisonExpr implements Expression {
        String field;
        String operator;
        Object value;

        ComparisonExpr(String field, String operator, Object value) {
            this.field = field;
            this.operator = operator;
            this.value = value;
        }

        @Override
        public boolean evaluate(Map<String, Object> context) {
            Object fieldValue = context.get(field);
            if (fieldValue == null) return false;

            if (fieldValue instanceof Number && value instanceof Number) {
                double a = ((Number) fieldValue).doubleValue();
                double b = ((Number) value).doubleValue();
                return switch (operator) {
                    case ">" -> a > b;
                    case ">=" -> a >= b;
                    case "<" -> a < b;
                    case "<=" -> a <= b;
                    case "==" -> a == b;
                    case "!=" -> a != b;
                    default -> false;
                };
            }

            // String comparison
            String a = String.valueOf(fieldValue);
            String b = String.valueOf(value);
            return switch (operator) {
                case "==" -> a.equals(b);
                case "!=" -> !a.equals(b);
                case "contains" -> a.contains(b);
                case "startsWith" -> a.startsWith(b);
                default -> false;
            };
        }
    }

    static class AndExpr implements Expression {
        Expression left, right;
        AndExpr(Expression left, Expression right) {
            this.left = left;
            this.right = right;
        }

        @Override
        public boolean evaluate(Map<String, Object> context) {
            return left.evaluate(context) && right.evaluate(context); // short-circuit
        }
    }

    static class OrExpr implements Expression {
        Expression left, right;
        OrExpr(Expression left, Expression right) {
            this.left = left;
            this.right = right;
        }

        @Override
        public boolean evaluate(Map<String, Object> context) {
            return left.evaluate(context) || right.evaluate(context); // short-circuit
        }
    }

    static class NotExpr implements Expression {
        Expression inner;
        NotExpr(Expression inner) { this.inner = inner; }

        @Override
        public boolean evaluate(Map<String, Object> context) {
            return !inner.evaluate(context);
        }
    }

    // ============================================
    // Rule: Expression + Action + Priority
    // ============================================
    static class Rule implements Comparable<Rule> {
        String name;
        Expression condition;
        Consumer<Map<String, Object>> action;
        int priority; // higher = executed first

        Rule(String name, Expression condition, Consumer<Map<String, Object>> action, int priority) {
            this.name = name;
            this.condition = condition;
            this.action = action;
            this.priority = priority;
        }

        @Override
        public int compareTo(Rule other) {
            return Integer.compare(other.priority, this.priority); // descending
        }
    }

    // ============================================
    // Rule Engine
    // ============================================
    private final List<Rule> rules = new ArrayList<>();
    private boolean stopOnFirstMatch = false;

    public void addRule(Rule rule) {
        rules.add(rule);
        Collections.sort(rules); // maintain priority order
    }

    public void setStopOnFirstMatch(boolean stop) {
        this.stopOnFirstMatch = stop;
    }

    public List<String> execute(Map<String, Object> context) {
        List<String> firedRules = new ArrayList<>();

        for (Rule rule : rules) {
            if (rule.condition.evaluate(context)) {
                rule.action.accept(context);
                firedRules.add(rule.name);

                if (stopOnFirstMatch) break;
            }
        }

        return firedRules;
    }

    // ============================================
    // Fluent Builder for readability
    // ============================================
    static Expression field(String name) {
        return null; // marker for builder
    }

    static ComparisonExpr gt(String field, Number value) {
        return new ComparisonExpr(field, ">", value);
    }

    static ComparisonExpr eq(String field, Object value) {
        return new ComparisonExpr(field, "==", value);
    }

    static ComparisonExpr lt(String field, Number value) {
        return new ComparisonExpr(field, "<", value);
    }

    static AndExpr and(Expression left, Expression right) {
        return new AndExpr(left, right);
    }

    static OrExpr or(Expression left, Expression right) {
        return new OrExpr(left, right);
    }

    static NotExpr not(Expression inner) {
        return new NotExpr(inner);
    }

    // ============================================
    // Demo
    // ============================================
    public static void main(String[] args) {
        RuleEngine engine = new RuleEngine();

        // Rule 1: Age >= 18 AND country == "IN" → approve
        engine.addRule(new Rule(
            "Indian Adult Approval",
            and(
                gt("age", 17),
                eq("country", "IN")
            ),
            ctx -> ctx.put("approved", true),
            10 // high priority
        ));

        // Rule 2: Income > 50000 OR creditScore > 700 → premium
        engine.addRule(new Rule(
            "Premium Eligibility",
            or(
                gt("income", 50000),
                gt("creditScore", 700)
            ),
            ctx -> ctx.put("tier", "premium"),
            5
        ));

        // Rule 3: NOT (blacklisted == true) → allow
        engine.addRule(new Rule(
            "Blacklist Check",
            not(eq("blacklisted", true)),
            ctx -> ctx.put("allowed", true),
            20 // highest priority
        ));

        // Test
        Map<String, Object> user = new HashMap<>();
        user.put("age", 25);
        user.put("country", "IN");
        user.put("income", 60000);
        user.put("creditScore", 650);
        user.put("blacklisted", false);

        List<String> fired = engine.execute(user);
        System.out.println("Fired rules: " + fired);
        System.out.println("Context: " + user);
        // Fired: [Blacklist Check, Indian Adult Approval, Premium Eligibility]
        // Context: {age=25, country=IN, ..., approved=true, tier=premium, allowed=true}
    }
}
```

## Round 2: Technical — System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design an Enterprise Workflow Automation Engine**
   - Sequential, parallel, and conditional workflow steps
   - Timeout handling and retry logic per step
   - Audit trail for every step execution

## Round 3: Technical — DSA
**Duration:** 45 minutes

### Questions Asked
1. **Trie with Autocomplete and Fuzzy Matching** — prefix search + edit distance tolerance

## Round 4: Managerial
**Duration:** 45 minutes

## 🎯 Key Takeaways
- SAP values **enterprise pattern knowledge** — rule engines, workflow engines, audit trails
- Composite pattern (AST nodes) is the standard approach for rule evaluation
- Short-circuit evaluation shows understanding of performance optimization
- Priority-based rule execution is a key requirement in enterprise systems

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Medium-Hard | AST, Composite Pattern, Rule Engine |
| System Design | Hard | Workflow Engine, State Machine |
| DSA | Medium | Trie, Edit Distance |
| Managerial | Easy | Behavioral |
