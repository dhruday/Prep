# Paytm — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (DSA + Machine Coding + System Design + HM)
- **Timeline:** 2 weeks
- **Format:** On-site

## Round 2: Machine Coding — Digital Wallet with Transaction Ledger

### Problem
Build a digital wallet system:
- User wallets with add money, debit, transfers between users
- Transaction ledger (immutable log of all operations)
- Balance inquiries with real-time consistency
- Reversal/refund support
- Statement generation with date range filtering

### 💡 Interview-Ready Answer

```java
import java.math.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.locks.*;
import java.util.stream.*;

public class DigitalWallet {

    enum TxnType { CREDIT, DEBIT, TRANSFER, REFUND }
    enum TxnStatus { SUCCESS, FAILED, REVERSED }

    static class Transaction {
        final String txnId;
        final String walletId;
        final TxnType type;
        final BigDecimal amount;
        final BigDecimal balanceAfter;
        final String counterparty; // For transfers
        final String description;
        final LocalDateTime timestamp;
        final String refTxnId;     // For refunds — references original
        TxnStatus status;

        Transaction(String txnId, String walletId, TxnType type, BigDecimal amount,
                    BigDecimal balanceAfter, String counterparty, String description,
                    String refTxnId) {
            this.txnId = txnId;
            this.walletId = walletId;
            this.type = type;
            this.amount = amount;
            this.balanceAfter = balanceAfter;
            this.counterparty = counterparty;
            this.description = description;
            this.refTxnId = refTxnId;
            this.timestamp = LocalDateTime.now();
            this.status = TxnStatus.SUCCESS;
        }
    }

    static class Wallet {
        final String id;
        final String userId;
        BigDecimal balance;
        final ReentrantLock lock = new ReentrantLock();
        final List<Transaction> ledger = new CopyOnWriteArrayList<>();

        Wallet(String id, String userId) {
            this.id = id;
            this.userId = userId;
            this.balance = BigDecimal.ZERO;
        }
    }

    record Statement(String walletId, LocalDateTime from, LocalDateTime to,
                     BigDecimal openingBalance, BigDecimal closingBalance,
                     BigDecimal totalCredits, BigDecimal totalDebits,
                     List<Transaction> transactions) {}

    private final ConcurrentHashMap<String, Wallet> wallets = new ConcurrentHashMap<>();
    private int txnCounter = 0;

    private synchronized String nextTxnId() {
        return "TXN-" + String.format("%06d", ++txnCounter);
    }

    public Wallet createWallet(String userId) {
        String walletId = "W-" + userId;
        Wallet wallet = new Wallet(walletId, userId);
        wallets.put(walletId, wallet);
        return wallet;
    }

    /**
     * Add money to wallet.
     */
    public Transaction addMoney(String walletId, BigDecimal amount, String source) {
        validateAmount(amount);
        Wallet wallet = getWallet(walletId);

        wallet.lock.lock();
        try {
            wallet.balance = wallet.balance.add(amount);
            Transaction txn = new Transaction(nextTxnId(), walletId, TxnType.CREDIT,
                amount, wallet.balance, source, "Add money from " + source, null);
            wallet.ledger.add(txn);
            return txn;
        } finally {
            wallet.lock.unlock();
        }
    }

    /**
     * Debit money from wallet (e.g., payment).
     */
    public Transaction debit(String walletId, BigDecimal amount, String merchant) {
        validateAmount(amount);
        Wallet wallet = getWallet(walletId);

        wallet.lock.lock();
        try {
            if (wallet.balance.compareTo(amount) < 0) {
                Transaction failed = new Transaction(nextTxnId(), walletId, TxnType.DEBIT,
                    amount, wallet.balance, merchant, "Insufficient balance", null);
                failed.status = TxnStatus.FAILED;
                wallet.ledger.add(failed);
                throw new IllegalStateException("Insufficient balance: " + wallet.balance);
            }

            wallet.balance = wallet.balance.subtract(amount);
            Transaction txn = new Transaction(nextTxnId(), walletId, TxnType.DEBIT,
                amount, wallet.balance, merchant, "Payment to " + merchant, null);
            wallet.ledger.add(txn);
            return txn;
        } finally {
            wallet.lock.unlock();
        }
    }

    /**
     * Transfer money between wallets. Acquires locks in consistent order to prevent deadlock.
     */
    public Transaction[] transfer(String fromWalletId, String toWalletId, BigDecimal amount) {
        validateAmount(amount);
        Wallet from = getWallet(fromWalletId);
        Wallet to = getWallet(toWalletId);

        // Lock ordering: by wallet ID to prevent deadlock
        Wallet first = fromWalletId.compareTo(toWalletId) < 0 ? from : to;
        Wallet second = first == from ? to : from;

        first.lock.lock();
        try {
            second.lock.lock();
            try {
                if (from.balance.compareTo(amount) < 0) {
                    throw new IllegalStateException("Insufficient balance for transfer");
                }

                from.balance = from.balance.subtract(amount);
                to.balance = to.balance.add(amount);

                String txnId = nextTxnId();
                Transaction debitTxn = new Transaction(txnId + "-D", fromWalletId,
                    TxnType.TRANSFER, amount, from.balance, toWalletId,
                    "Transfer to " + to.userId, null);
                Transaction creditTxn = new Transaction(txnId + "-C", toWalletId,
                    TxnType.TRANSFER, amount, to.balance, fromWalletId,
                    "Transfer from " + from.userId, null);

                from.ledger.add(debitTxn);
                to.ledger.add(creditTxn);

                return new Transaction[]{debitTxn, creditTxn};
            } finally {
                second.lock.unlock();
            }
        } finally {
            first.lock.unlock();
        }
    }

    /**
     * Refund a previous debit transaction.
     */
    public Transaction refund(String walletId, String originalTxnId) {
        Wallet wallet = getWallet(walletId);

        wallet.lock.lock();
        try {
            Transaction original = wallet.ledger.stream()
                .filter(t -> t.txnId.equals(originalTxnId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

            if (original.type != TxnType.DEBIT || original.status == TxnStatus.REVERSED) {
                throw new IllegalStateException("Cannot refund: invalid transaction state");
            }

            original.status = TxnStatus.REVERSED;
            wallet.balance = wallet.balance.add(original.amount);

            Transaction refund = new Transaction(nextTxnId(), walletId, TxnType.REFUND,
                original.amount, wallet.balance, original.counterparty,
                "Refund: " + original.description, originalTxnId);
            wallet.ledger.add(refund);
            return refund;
        } finally {
            wallet.lock.unlock();
        }
    }

    /**
     * Generate statement for a date range.
     */
    public Statement getStatement(String walletId, LocalDateTime from, LocalDateTime to) {
        Wallet wallet = getWallet(walletId);

        List<Transaction> filtered = wallet.ledger.stream()
            .filter(t -> !t.timestamp.isBefore(from) && !t.timestamp.isAfter(to))
            .filter(t -> t.status == TxnStatus.SUCCESS || t.status == TxnStatus.REVERSED)
            .collect(Collectors.toList());

        BigDecimal totalCredits = filtered.stream()
            .filter(t -> t.type == TxnType.CREDIT || t.type == TxnType.REFUND
                || (t.type == TxnType.TRANSFER && t.walletId.equals(walletId)
                    && t.description.contains("from")))
            .map(t -> t.amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDebits = filtered.stream()
            .filter(t -> t.type == TxnType.DEBIT
                || (t.type == TxnType.TRANSFER && t.description.contains("to")))
            .map(t -> t.amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Opening balance = first txn's balanceAfter - first txn's net effect
        BigDecimal openingBalance = filtered.isEmpty() ? wallet.balance
            : filtered.get(0).balanceAfter.subtract(
                filtered.get(0).type == TxnType.DEBIT
                    ? filtered.get(0).amount.negate()
                    : filtered.get(0).amount);

        return new Statement(walletId, from, to, openingBalance, wallet.balance,
            totalCredits, totalDebits, filtered);
    }

    public BigDecimal getBalance(String walletId) {
        return getWallet(walletId).balance;
    }

    private Wallet getWallet(String walletId) {
        Wallet wallet = wallets.get(walletId);
        if (wallet == null) throw new IllegalArgumentException("Wallet not found: " + walletId);
        return wallet;
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
    }

    public static void main(String[] args) {
        DigitalWallet system = new DigitalWallet();

        Wallet alice = system.createWallet("Alice");
        Wallet bob = system.createWallet("Bob");

        System.out.println("=== Add Money ===");
        system.addMoney(alice.id, new BigDecimal("5000"), "Bank-HDFC");
        system.addMoney(bob.id, new BigDecimal("3000"), "UPI");
        System.out.printf("Alice: ₹%s, Bob: ₹%s%n",
            system.getBalance(alice.id), system.getBalance(bob.id));

        System.out.println("\n=== Debit (Payment) ===");
        Transaction debitTxn = system.debit(alice.id, new BigDecimal("1500"), "Swiggy");
        System.out.printf("Alice paid ₹1500 to Swiggy → Balance: ₹%s%n",
            system.getBalance(alice.id));

        System.out.println("\n=== Transfer ===");
        system.transfer(alice.id, bob.id, new BigDecimal("1000"));
        System.out.printf("Alice→Bob ₹1000 → Alice: ₹%s, Bob: ₹%s%n",
            system.getBalance(alice.id), system.getBalance(bob.id));

        System.out.println("\n=== Refund ===");
        system.refund(alice.id, debitTxn.txnId);
        System.out.printf("Refund ₹1500 → Alice: ₹%s%n", system.getBalance(alice.id));

        System.out.println("\n=== Statement ===");
        Statement stmt = system.getStatement(alice.id,
            LocalDateTime.now().minusHours(1), LocalDateTime.now().plusHours(1));
        System.out.printf("Transactions: %d, Credits: ₹%s, Debits: ₹%s%n",
            stmt.transactions().size(), stmt.totalCredits(), stmt.totalDebits());
        for (Transaction t : stmt.transactions()) {
            String sign = (t.type == TxnType.CREDIT || t.type == TxnType.REFUND) ? "+" : "-";
            System.out.printf("  %s [%s] %s₹%s → ₹%s (%s)%n",
                t.txnId, t.type, sign, t.amount, t.balanceAfter, t.description);
        }
    }
}
```

## 🎯 Key Takeaways
- Paytm/fintech companies frequently ask **wallet/ledger** problems
- **Deadlock prevention**: acquire locks in consistent order (by wallet ID) during transfers
- Immutable ledger — transactions are append-only, refunds create new entries
- ReentrantLock per wallet provides fine-grained concurrency
- Statement generation with date filtering and credit/debit aggregation
- Failed transactions still recorded in ledger for audit trail

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA | Medium | Trees, DP |
| Machine Coding | Medium-Hard | Concurrency, Ledger Pattern, Domain Modeling |
| System Design | Hard | Payment Architecture, Consistency |
| HM | Medium | Behavioral, Scaling Experience |
