# PhonePe — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 DSA + Machine Coding + HM)
- **Timeline:** 3 weeks
- **Format:** On-site

## Round 3: Machine Coding — Split-Wise Expense Sharing System

### Problem
Implement an expense sharing system (like Splitwise):
- Users can add expenses with different split strategies: EQUAL, EXACT, PERCENTAGE
- Track balances between all user pairs
- Simplify debts (minimize transactions)
- Show balance sheet per user

### 💡 Interview-Ready Answer

```java
import java.math.*;
import java.util.*;
import java.util.stream.*;

public class ExpenseSharingSystem {

    enum SplitType { EQUAL, EXACT, PERCENTAGE }

    static class User {
        final String id;
        final String name;
        final String email;

        User(String id, String name, String email) {
            this.id = id;
            this.name = name;
            this.email = email;
        }
    }

    static class Split {
        String userId;
        BigDecimal amount; // Exact amount or percentage depending on type

        Split(String userId, BigDecimal amount) {
            this.userId = userId;
            this.amount = amount;
        }
    }

    static class Expense {
        final String id;
        final String paidBy;
        final BigDecimal totalAmount;
        final SplitType splitType;
        final List<Split> splits;
        final String description;

        Expense(String id, String paidBy, BigDecimal totalAmount,
                SplitType splitType, List<Split> splits, String description) {
            this.id = id;
            this.paidBy = paidBy;
            this.totalAmount = totalAmount;
            this.splitType = splitType;
            this.splits = splits;
            this.description = description;
        }
    }

    static class Transaction {
        String from;
        String to;
        BigDecimal amount;

        Transaction(String from, String to, BigDecimal amount) {
            this.from = from;
            this.to = to;
            this.amount = amount;
        }

        @Override
        public String toString() {
            return String.format("%s owes %s: ₹%s", from, to, amount);
        }
    }

    private final Map<String, User> users = new LinkedHashMap<>();
    // balances[A][B] > 0 means B owes A
    private final Map<String, Map<String, BigDecimal>> balances = new HashMap<>();
    private final List<Expense> expenses = new ArrayList<>();
    private int expenseCounter = 0;

    public void addUser(User user) {
        users.put(user.id, user);
        balances.put(user.id, new HashMap<>());
    }

    public Expense addExpense(String paidBy, BigDecimal total, SplitType type,
                              List<Split> splits, String description) {
        List<Split> resolvedSplits = resolveSplits(total, type, splits);
        validateSplits(total, resolvedSplits);

        String id = "EXP-" + (++expenseCounter);
        Expense expense = new Expense(id, paidBy, total, type, resolvedSplits, description);
        expenses.add(expense);

        // Update balances
        for (Split split : resolvedSplits) {
            if (!split.userId.equals(paidBy)) {
                updateBalance(paidBy, split.userId, split.amount);
            }
        }

        return expense;
    }

    private List<Split> resolveSplits(BigDecimal total, SplitType type, List<Split> splits) {
        switch (type) {
            case EQUAL: {
                int n = splits.size();
                BigDecimal share = total.divide(BigDecimal.valueOf(n), 2, RoundingMode.FLOOR);
                BigDecimal remainder = total.subtract(share.multiply(BigDecimal.valueOf(n)));

                List<Split> resolved = new ArrayList<>();
                for (int i = 0; i < splits.size(); i++) {
                    BigDecimal amt = (i == 0) ? share.add(remainder) : share;
                    resolved.add(new Split(splits.get(i).userId, amt));
                }
                return resolved;
            }
            case PERCENTAGE: {
                List<Split> resolved = new ArrayList<>();
                BigDecimal totalAssigned = BigDecimal.ZERO;

                for (int i = 0; i < splits.size(); i++) {
                    BigDecimal amt = total.multiply(splits.get(i).amount)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    if (i == splits.size() - 1) {
                        // Last person absorbs rounding
                        amt = total.subtract(totalAssigned);
                    }
                    resolved.add(new Split(splits.get(i).userId, amt));
                    totalAssigned = totalAssigned.add(amt);
                }
                return resolved;
            }
            case EXACT:
                return splits; // Already resolved
            default:
                throw new IllegalArgumentException("Unknown split type: " + type);
        }
    }

    private void validateSplits(BigDecimal total, List<Split> splits) {
        BigDecimal sum = splits.stream()
            .map(s -> s.amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (sum.compareTo(total) != 0) {
            throw new IllegalArgumentException(
                "Split amounts (" + sum + ") don't add up to total (" + total + ")");
        }
    }

    private void updateBalance(String creditor, String debtor, BigDecimal amount) {
        // creditor is owed `amount` by debtor
        balances.computeIfAbsent(creditor, k -> new HashMap<>())
            .merge(debtor, amount, BigDecimal::add);
        balances.computeIfAbsent(debtor, k -> new HashMap<>())
            .merge(creditor, amount.negate(), BigDecimal::add);
    }

    /**
     * Get net balance for a user.
     * Positive = others owe them. Negative = they owe others.
     */
    public Map<String, BigDecimal> getBalance(String userId) {
        Map<String, BigDecimal> userBalance = balances.getOrDefault(userId, Map.of());
        return userBalance.entrySet().stream()
            .filter(e -> e.getValue().compareTo(BigDecimal.ZERO) != 0)
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    /**
     * Simplify debts — minimize total number of transactions.
     * Uses a greedy algorithm: pair max creditor with max debtor.
     */
    public List<Transaction> simplifyDebts() {
        // Compute net balance per user
        Map<String, BigDecimal> netBalance = new HashMap<>();
        for (String userId : users.keySet()) {
            BigDecimal net = balances.getOrDefault(userId, Map.of())
                .values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (net.compareTo(BigDecimal.ZERO) != 0) {
                netBalance.put(userId, net);
            }
        }

        // Separate into creditors (positive) and debtors (negative)
        PriorityQueue<Map.Entry<String, BigDecimal>> creditors =
            new PriorityQueue<>((a, b) -> b.getValue().compareTo(a.getValue()));
        PriorityQueue<Map.Entry<String, BigDecimal>> debtors =
            new PriorityQueue<>(Comparator.comparing(Map.Entry::getValue));

        for (Map.Entry<String, BigDecimal> entry : netBalance.entrySet()) {
            if (entry.getValue().compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(entry);
            } else {
                debtors.add(entry);
            }
        }

        List<Transaction> transactions = new ArrayList<>();

        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            Map.Entry<String, BigDecimal> creditor = creditors.poll();
            Map.Entry<String, BigDecimal> debtor = debtors.poll();

            BigDecimal creditAmt = creditor.getValue();
            BigDecimal debtAmt = debtor.getValue().abs();
            BigDecimal settleAmt = creditAmt.min(debtAmt);

            transactions.add(new Transaction(debtor.getKey(), creditor.getKey(), settleAmt));

            BigDecimal remainingCredit = creditAmt.subtract(settleAmt);
            BigDecimal remainingDebt = debtAmt.subtract(settleAmt);

            if (remainingCredit.compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(Map.entry(creditor.getKey(), remainingCredit));
            }
            if (remainingDebt.compareTo(BigDecimal.ZERO) > 0) {
                debtors.add(Map.entry(debtor.getKey(), remainingDebt.negate()));
            }
        }

        return transactions;
    }

    /**
     * Print full balance sheet.
     */
    public void printBalanceSheet() {
        System.out.println("=== Balance Sheet ===");
        for (String userId : users.keySet()) {
            Map<String, BigDecimal> bal = getBalance(userId);
            if (bal.isEmpty()) {
                System.out.printf("%s: all settled up%n", users.get(userId).name);
            } else {
                System.out.printf("%s:%n", users.get(userId).name);
                bal.forEach((otherId, amount) -> {
                    String otherName = users.get(otherId).name;
                    if (amount.compareTo(BigDecimal.ZERO) > 0) {
                        System.out.printf("  %s owes you ₹%s%n", otherName, amount);
                    } else {
                        System.out.printf("  You owe %s ₹%s%n", otherName, amount.abs());
                    }
                });
            }
        }
    }

    public static void main(String[] args) {
        ExpenseSharingSystem system = new ExpenseSharingSystem();

        system.addUser(new User("u1", "Alice", "alice@mail.com"));
        system.addUser(new User("u2", "Bob", "bob@mail.com"));
        system.addUser(new User("u3", "Charlie", "charlie@mail.com"));
        system.addUser(new User("u4", "Diana", "diana@mail.com"));

        // EQUAL split: Alice pays 1000 dinner for all 4
        System.out.println("--- Expense 1: Dinner (Equal) ---");
        system.addExpense("u1", new BigDecimal("1000"), SplitType.EQUAL,
            List.of(new Split("u1", null), new Split("u2", null),
                    new Split("u3", null), new Split("u4", null)),
            "Team dinner");

        // EXACT split: Bob pays 1500 for groceries
        System.out.println("--- Expense 2: Groceries (Exact) ---");
        system.addExpense("u2", new BigDecimal("1500"), SplitType.EXACT,
            List.of(new Split("u1", new BigDecimal("400")),
                    new Split("u2", new BigDecimal("500")),
                    new Split("u3", new BigDecimal("300")),
                    new Split("u4", new BigDecimal("300"))),
            "Groceries");

        // PERCENTAGE split: Charlie pays 2000 rent
        System.out.println("--- Expense 3: Rent (Percentage) ---");
        system.addExpense("u3", new BigDecimal("2000"), SplitType.PERCENTAGE,
            List.of(new Split("u1", new BigDecimal("40")),
                    new Split("u2", new BigDecimal("30")),
                    new Split("u3", new BigDecimal("20")),
                    new Split("u4", new BigDecimal("10"))),
            "Rent share");

        // Print balance sheet
        System.out.println();
        system.printBalanceSheet();

        // Simplify debts
        System.out.println("\n=== Simplified Transactions ===");
        system.simplifyDebts().forEach(System.out::println);
    }
}
```

## 🎯 Key Takeaways
- **Splitwise clone** is one of the most popular machine coding questions in Indian unicorns
- Three split strategies with proper BigDecimal rounding — EQUAL gives remainder to first person
- Debt simplification uses greedy pairing of max creditor/debtor via two priority queues
- Balance tracking: `balances[A][B] = X` means B owes A ₹X (and `balances[B][A] = -X`)
- Validate that splits always sum to total — important edge case

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA 1 | Medium | Trees, DFS |
| DSA 2 | Hard | Graph, Shortest Path |
| Machine Coding | Medium-Hard | Domain Modeling, BigDecimal, Greedy |
| HM | Medium | Behavioral, System Thinking |
