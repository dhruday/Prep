# Cred — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | CRED |
| **Role** | SDE-2 FullStack |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Rejection Reason** | Machine coding: code quality was good but didn't finish bonus features |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Design a Rule Engine** (CRED's actual question)
- Define rules with conditions (IF-THEN)
- Support AND/OR/NOT logical operators
- Evaluate rules against facts (user attributes)
- Priority-based rule execution (first match wins OR all matches)
- Rule CRUD + versioning
- Thread-safe evaluation

### 💡 Rule Engine

```java
// Rule DSL: JSON-based rule definition
// {
//   "name": "Gold Member Reward",
//   "priority": 1,
//   "condition": {
//     "and": [
//       { "field": "credit_score", "operator": ">=", "value": 750 },
//       { "field": "bill_amount", "operator": ">", "value": 10000 },
//       { "or": [
//         { "field": "payment_streak", "operator": ">=", "value": 3 },
//         { "field": "member_tier", "operator": "==", "value": "PLATINUM" }
//       ]}
//     ]
//   },
//   "action": { "type": "REWARD", "coins": 500, "message": "Gold reward!" }
// }

interface Condition {
    boolean evaluate(Map<String, Object> facts);
}

class SimpleCondition implements Condition {
    private final String field;
    private final String operator;
    private final Object value;
    
    boolean evaluate(Map<String, Object> facts) {
        Object factValue = facts.get(field);
        if (factValue == null) return false;
        
        return switch (operator) {
            case "==" -> factValue.equals(value);
            case "!=" -> !factValue.equals(value);
            case ">" -> compare(factValue, value) > 0;
            case ">=" -> compare(factValue, value) >= 0;
            case "<" -> compare(factValue, value) < 0;
            case "<=" -> compare(factValue, value) <= 0;
            case "contains" -> String.valueOf(factValue).contains(String.valueOf(value));
            case "in" -> ((List<?>) value).contains(factValue);
            default -> throw new IllegalArgumentException("Unknown operator: " + operator);
        };
    }
    
    @SuppressWarnings("unchecked")
    private int compare(Object a, Object b) {
        if (a instanceof Number && b instanceof Number) {
            return Double.compare(((Number) a).doubleValue(), ((Number) b).doubleValue());
        }
        if (a instanceof Comparable) {
            return ((Comparable<Object>) a).compareTo(b);
        }
        throw new IllegalArgumentException("Cannot compare: " + a.getClass());
    }
}

class AndCondition implements Condition {
    private final List<Condition> conditions;
    
    boolean evaluate(Map<String, Object> facts) {
        return conditions.stream().allMatch(c -> c.evaluate(facts));
    }
}

class OrCondition implements Condition {
    private final List<Condition> conditions;
    
    boolean evaluate(Map<String, Object> facts) {
        return conditions.stream().anyMatch(c -> c.evaluate(facts));
    }
}

class NotCondition implements Condition {
    private final Condition condition;
    
    boolean evaluate(Map<String, Object> facts) {
        return !condition.evaluate(facts);
    }
}

class Rule {
    private final String id;
    private final String name;
    private final int priority; // Lower = higher priority
    private final Condition condition;
    private final Action action;
    private final int version;
    private final boolean active;
}

class RuleEngine {
    private final ReadWriteLock lock = new ReentrantReadWriteLock();
    private final List<Rule> rules = new ArrayList<>(); // Sorted by priority
    
    // Add/update rule with versioning
    void addRule(Rule rule) {
        lock.writeLock().lock();
        try {
            // Remove old version if exists
            rules.removeIf(r -> r.getId().equals(rule.getId()));
            rules.add(rule);
            rules.sort(Comparator.comparingInt(Rule::getPriority));
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    void removeRule(String ruleId) {
        lock.writeLock().lock();
        try {
            rules.removeIf(r -> r.getId().equals(ruleId));
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    // Evaluate: first matching rule wins
    Optional<Action> evaluateFirstMatch(Map<String, Object> facts) {
        lock.readLock().lock();
        try {
            return rules.stream()
                .filter(Rule::isActive)
                .filter(rule -> rule.getCondition().evaluate(facts))
                .findFirst()
                .map(Rule::getAction);
        } finally {
            lock.readLock().unlock();
        }
    }
    
    // Evaluate: all matching rules
    List<Action> evaluateAllMatches(Map<String, Object> facts) {
        lock.readLock().lock();
        try {
            return rules.stream()
                .filter(Rule::isActive)
                .filter(rule -> rule.getCondition().evaluate(facts))
                .map(Rule::getAction)
                .toList();
        } finally {
            lock.readLock().unlock();
        }
    }
    
    // Parse rule from JSON
    static Condition parseCondition(Map<String, Object> json) {
        if (json.containsKey("and")) {
            List<Map<String, Object>> subs = (List<Map<String, Object>>) json.get("and");
            return new AndCondition(subs.stream().map(RuleEngine::parseCondition).toList());
        }
        if (json.containsKey("or")) {
            List<Map<String, Object>> subs = (List<Map<String, Object>>) json.get("or");
            return new OrCondition(subs.stream().map(RuleEngine::parseCondition).toList());
        }
        if (json.containsKey("not")) {
            return new NotCondition(parseCondition((Map<String, Object>) json.get("not")));
        }
        // Simple condition
        return new SimpleCondition(
            (String) json.get("field"),
            (String) json.get("operator"),
            json.get("value")
        );
    }
}

// Usage:
RuleEngine engine = new RuleEngine();
engine.addRule(goldMemberRule);
engine.addRule(newUserRule);

Map<String, Object> userFacts = Map.of(
    "credit_score", 780,
    "bill_amount", 15000,
    "payment_streak", 5,
    "member_tier", "GOLD"
);

Optional<Action> result = engine.evaluateFirstMatch(userFacts);
// → Gold Member Reward: 500 coins
```

---

## 🎯 Key Takeaways
- CRED = **Rule Engine + Composite Pattern + Thread-Safety + Credit Card Domain**
- **Composite Pattern**: `AndCondition`, `OrCondition`, `NotCondition` compose `SimpleCondition` into trees
- **Thread-safe**: `ReadWriteLock` — multiple readers concurrent, exclusive writer
- **Priority-based**: sorted by priority, `evaluateFirstMatch` for first-wins, `evaluateAllMatches` for accumulating
- **JSON rule DSL**: nested JSON parsed recursively into Condition tree — extensible without code changes
- **Versioning**: each rule has a version — updating replaces old version
- **Compare safety**: handle Number, Comparable, with proper type checking
- CRED interviews: **machine coding is heavily time-constrained** — finish core features fast, then add extras

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Rule Engine, Composite Pattern, Concurrency |
| System Design | Hard | Reward System, Event-Driven |
| HM | Medium | Culture, Design Thinking |
