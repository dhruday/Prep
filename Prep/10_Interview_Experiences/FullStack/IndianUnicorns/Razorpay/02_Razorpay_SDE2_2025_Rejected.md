# Razorpay — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Split-wise Expense Simplification**
   - Given N people and a list of expenses (who paid, who owes, how much), minimize the number of transactions to settle all debts.
   - Support equal splits, percentage splits, and exact amounts.

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class ExpenseSimplifier {

    static class Expense {
        String paidBy;
        double amount;
        Map<String, Double> splits; // person -> share amount

        Expense(String paidBy, double amount, Map<String, Double> splits) {
            this.paidBy = paidBy;
            this.amount = amount;
            this.splits = splits;
        }
    }

    /**
     * Step 1: Calculate net balance for each person.
     * Positive = owed money, Negative = owes money.
     */
    static Map<String, Double> calculateNetBalances(List<Expense> expenses) {
        Map<String, Double> balances = new HashMap<>();

        for (Expense exp : expenses) {
            // Payer gets credit
            balances.merge(exp.paidBy, exp.amount, Double::sum);

            // Each participant gets debited their share
            for (Map.Entry<String, Double> entry : exp.splits.entrySet()) {
                balances.merge(entry.getKey(), -entry.getValue(), Double::sum);
            }
        }

        // Remove zero balances (floating point tolerance)
        balances.entrySet().removeIf(e -> Math.abs(e.getValue()) < 0.01);
        return balances;
    }

    static class Transaction {
        String from;
        String to;
        double amount;

        Transaction(String from, String to, double amount) {
            this.from = from;
            this.to = to;
            this.amount = Math.round(amount * 100.0) / 100.0;
        }

        @Override
        public String toString() {
            return String.format("%s pays %s ₹%.2f", from, to, amount);
        }
    }

    /**
     * Step 2: Minimize transactions using greedy approach.
     *
     * Approach: Match the largest creditor with the largest debtor.
     * This is optimal for minimizing # of transactions in most cases.
     * NP-hard in general (subset sum variant), but greedy works well in practice.
     *
     * Time: O(N log N) for sorting
     * Space: O(N)
     */
    static List<Transaction> simplifyDebts(Map<String, Double> balances) {
        // Split into creditors (positive) and debtors (negative)
        PriorityQueue<double[]> creditors = new PriorityQueue<>((a, b) -> Double.compare(b[0], a[0]));
        PriorityQueue<double[]> debtors = new PriorityQueue<>((a, b) -> Double.compare(b[0], a[0]));

        Map<Integer, String> indexToName = new HashMap<>();
        int idx = 0;
        for (Map.Entry<String, Double> e : balances.entrySet()) {
            indexToName.put(idx, e.getKey());
            if (e.getValue() > 0) {
                creditors.offer(new double[]{e.getValue(), idx});
            } else if (e.getValue() < 0) {
                debtors.offer(new double[]{-e.getValue(), idx}); // store as positive
            }
            idx++;
        }

        List<Transaction> transactions = new ArrayList<>();

        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            double[] creditor = creditors.poll();
            double[] debtor = debtors.poll();

            double settleAmount = Math.min(creditor[0], debtor[0]);
            String from = indexToName.get((int) debtor[1]);
            String to = indexToName.get((int) creditor[1]);

            transactions.add(new Transaction(from, to, settleAmount));

            double creditorRemaining = creditor[0] - settleAmount;
            double debtorRemaining = debtor[0] - settleAmount;

            if (creditorRemaining > 0.01) {
                creditors.offer(new double[]{creditorRemaining, creditor[1]});
            }
            if (debtorRemaining > 0.01) {
                debtors.offer(new double[]{debtorRemaining, debtor[1]});
            }
        }

        return transactions;
    }

    /**
     * Follow-up: Exact minimum transactions using backtracking.
     * For small groups (N ≤ 10), this finds the true optimal.
     */
    static int minTransactionsBacktrack(double[] balances) {
        return solve(balances, 0);
    }

    private static int solve(double[] balances, int start) {
        while (start < balances.length && Math.abs(balances[start]) < 0.01) {
            start++;
        }
        if (start == balances.length) return 0;

        int result = Integer.MAX_VALUE;
        for (int i = start + 1; i < balances.length; i++) {
            // Try settling start with i if they have opposite signs
            if (balances[start] * balances[i] < 0) {
                balances[i] += balances[start];
                result = Math.min(result, 1 + solve(balances, start + 1));
                balances[i] -= balances[start];
            }
        }
        return result;
    }

    // ============================================
    // Convenience: Equal split helper
    // ============================================
    static Expense equalSplit(String paidBy, double amount, List<String> participants) {
        double share = amount / participants.size();
        Map<String, Double> splits = new HashMap<>();
        for (String p : participants) {
            splits.put(p, share);
        }
        return new Expense(paidBy, amount, splits);
    }

    public static void main(String[] args) {
        List<Expense> expenses = new ArrayList<>();

        // Alice paid 600 for dinner (split equally among Alice, Bob, Charlie)
        expenses.add(equalSplit("Alice", 600, List.of("Alice", "Bob", "Charlie")));

        // Bob paid 300 for cab (split between Bob and Charlie)
        expenses.add(equalSplit("Bob", 300, List.of("Bob", "Charlie")));

        // Charlie paid 150 for snacks (split equally among all 3)
        expenses.add(equalSplit("Charlie", 150, List.of("Alice", "Bob", "Charlie")));

        // Calculate balances
        Map<String, Double> balances = calculateNetBalances(expenses);
        System.out.println("Net balances:");
        balances.forEach((person, balance) ->
            System.out.printf("  %s: %s₹%.2f%n", person, balance > 0 ? "+" : "", balance));

        // Simplify
        List<Transaction> transactions = simplifyDebts(balances);
        System.out.println("\nSimplified transactions:");
        transactions.forEach(System.out::println);
    }
}
```

## Round 2: Technical — System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design a Payment Ledger System**
   - Double-entry bookkeeping (every debit has a credit)
   - Support multi-currency with exchange rate tracking
   - Audit trail and reconciliation

## Round 3: Technical — DSA
**Duration:** 60 minutes

### Questions Asked
1. **Find the Minimum Cost to Merge N Sorted Lists into One** (K-way merge with priority queue)

### Result
- Rejected after Round 3 — the DSA round went poorly on follow-up complexity analysis
- Feedback: Strong LLD and system design, needs to practice time complexity proofs

## 🎯 Key Takeaways
- Razorpay frequently asks **Splitwise-style debt simplification** — it's directly relevant to their payment splitting feature
- Greedy creditor-debtor matching is acceptable, but know the NP-hard backtracking version for follow-ups
- **Double-entry bookkeeping** is essential knowledge for fintech system design
- Always use `Math.round()` for currency to avoid floating point issues
- BigDecimal is preferred in production but interviewers accept double with rounding for time constraints

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Medium-Hard | Debt Simplification, Greedy, Backtracking |
| System Design | Hard | Ledger, Double-Entry, Multi-Currency |
| DSA | Hard | K-Way Merge, Priority Queue |
