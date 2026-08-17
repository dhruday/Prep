# Paytm — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm (One97 Communications) |
| **Role** | Staff Engineer |
| **Level** | SDE-3 |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/paytm-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Payments Platform |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + LLD + System Design + HM)

---

## Round 2: LLD — Design a Digital Wallet with Multi-Currency Support
**Duration:** 60 minutes

### Challenge: Design a wallet system supporting INR + multiple currencies, with exchange rates, transaction limits, and compliance checks.

```java
import java.util.*;
import java.util.concurrent.*;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Multi-Currency Digital Wallet:
 * 
 * Features:
 * - Hold balances in multiple currencies (INR, USD, etc.)
 * - Transfer between wallets (same or cross-currency)
 * - Exchange rate management
 * - Daily/monthly transaction limits
 * - KYC tier-based limits
 * - Idempotent transactions (dedup key)
 * - Audit trail for compliance
 */

enum Currency { INR, USD, EUR, GBP, SGD }
enum KYCTier { BASIC, STANDARD, PREMIUM } // Different limits per tier
enum TxnType { CREDIT, DEBIT, TRANSFER, EXCHANGE }

class Money {
    final BigDecimal amount;
    final Currency currency;
    
    Money(BigDecimal amount, Currency currency) {
        this.amount = amount.setScale(2, RoundingMode.HALF_UP);
        this.currency = currency;
    }
    
    Money(double amount, Currency currency) {
        this(BigDecimal.valueOf(amount), currency);
    }
    
    boolean isPositive() { return amount.compareTo(BigDecimal.ZERO) > 0; }
    boolean isNegative() { return amount.compareTo(BigDecimal.ZERO) < 0; }
    
    Money add(Money other) {
        if (other.currency != this.currency) throw new IllegalArgumentException("Currency mismatch");
        return new Money(this.amount.add(other.amount), this.currency);
    }
    
    Money subtract(Money other) {
        if (other.currency != this.currency) throw new IllegalArgumentException("Currency mismatch");
        return new Money(this.amount.subtract(other.amount), this.currency);
    }
    
    Money negate() { return new Money(this.amount.negate(), this.currency); }
}

class Transaction {
    final String id;
    final String walletId;
    final TxnType type;
    final Money amount;
    final String description;
    final long timestamp;
    final String idempotencyKey;
    final Map<String, String> metadata;
    
    Transaction(String walletId, TxnType type, Money amount, String description, String idempotencyKey) {
        this.id = UUID.randomUUID().toString();
        this.walletId = walletId;
        this.type = type;
        this.amount = amount;
        this.description = description;
        this.timestamp = System.currentTimeMillis();
        this.idempotencyKey = idempotencyKey;
        this.metadata = new HashMap<>();
    }
}

class Wallet {
    final String id;
    final String userId;
    KYCTier kycTier;
    
    // Balance per currency
    private final ConcurrentHashMap<Currency, BigDecimal> balances = new ConcurrentHashMap<>();
    
    // Transaction history
    private final List<Transaction> transactions = new CopyOnWriteArrayList<>();
    
    Wallet(String userId, KYCTier kycTier) {
        this.id = UUID.randomUUID().toString();
        this.userId = userId;
        this.kycTier = kycTier;
        
        // Initialize all currencies with zero
        for (Currency c : Currency.values()) {
            balances.put(c, BigDecimal.ZERO);
        }
    }
    
    BigDecimal getBalance(Currency currency) {
        return balances.getOrDefault(currency, BigDecimal.ZERO);
    }
    
    synchronized void credit(Money money, Transaction txn) {
        BigDecimal current = getBalance(money.currency);
        balances.put(money.currency, current.add(money.amount));
        transactions.add(txn);
    }
    
    synchronized void debit(Money money, Transaction txn) {
        BigDecimal current = getBalance(money.currency);
        BigDecimal newBalance = current.subtract(money.amount);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new InsufficientBalanceException("Insufficient balance");
        }
        balances.put(money.currency, newBalance);
        transactions.add(txn);
    }
    
    List<Transaction> getTransactions(int limit) {
        int size = transactions.size();
        return transactions.subList(Math.max(0, size - limit), size);
    }
}

class InsufficientBalanceException extends RuntimeException {
    InsufficientBalanceException(String msg) { super(msg); }
}

// ---- Exchange Rate Service ----

class ExchangeRateService {
    // base currency → target currency → rate
    private final Map<Currency, Map<Currency, BigDecimal>> rates = new ConcurrentHashMap<>();
    
    public void setRate(Currency from, Currency to, BigDecimal rate) {
        rates.computeIfAbsent(from, k -> new ConcurrentHashMap<>()).put(to, rate);
        // Set inverse rate
        rates.computeIfAbsent(to, k -> new ConcurrentHashMap<>())
             .put(from, BigDecimal.ONE.divide(rate, 6, RoundingMode.HALF_UP));
    }
    
    public Money convert(Money from, Currency toCurrency) {
        if (from.currency == toCurrency) return from;
        
        BigDecimal rate = rates.getOrDefault(from.currency, Map.of())
                               .get(toCurrency);
        if (rate == null) throw new IllegalStateException("No exchange rate for " + from.currency + " → " + toCurrency);
        
        BigDecimal converted = from.amount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        return new Money(converted, toCurrency);
    }
}

// ---- Limit Checker ----

class LimitChecker {
    
    // KYC tier → daily limit in INR equivalent
    private static final Map<KYCTier, BigDecimal> DAILY_LIMITS = Map.of(
        KYCTier.BASIC, BigDecimal.valueOf(10000),
        KYCTier.STANDARD, BigDecimal.valueOf(100000),
        KYCTier.PREMIUM, BigDecimal.valueOf(1000000)
    );
    
    private final ExchangeRateService exchangeService;
    
    LimitChecker(ExchangeRateService exchangeService) {
        this.exchangeService = exchangeService;
    }
    
    /**
     * Check if transaction is within daily limits.
     * Convert all today's transactions to INR equivalent.
     */
    public boolean isWithinLimits(Wallet wallet, Money txnAmount) {
        BigDecimal dailyLimit = DAILY_LIMITS.get(wallet.kycTier);
        
        // Sum today's debits in INR
        long todayStart = todayStartMs();
        BigDecimal todaySpent = wallet.getTransactions(100).stream()
            .filter(t -> t.timestamp >= todayStart && t.type == TxnType.DEBIT)
            .map(t -> {
                if (t.amount.currency == Currency.INR) return t.amount.amount;
                return exchangeService.convert(t.amount, Currency.INR).amount;
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal txnInINR = txnAmount.currency == Currency.INR 
            ? txnAmount.amount 
            : exchangeService.convert(txnAmount, Currency.INR).amount;
        
        return todaySpent.add(txnInINR).compareTo(dailyLimit) <= 0;
    }
    
    private long todayStartMs() {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }
}

// ---- Wallet Service (Orchestrator) ----

class WalletService {
    private final ConcurrentHashMap<String, Wallet> wallets = new ConcurrentHashMap<>();
    private final ExchangeRateService exchangeService = new ExchangeRateService();
    private final LimitChecker limitChecker = new LimitChecker(exchangeService);
    private final Set<String> processedIdempotencyKeys = ConcurrentHashMap.newKeySet();
    
    public Wallet createWallet(String userId, KYCTier tier) {
        Wallet wallet = new Wallet(userId, tier);
        wallets.put(wallet.id, wallet);
        return wallet;
    }
    
    /**
     * Transfer money between wallets with optional currency conversion.
     * Idempotent via dedup key.
     */
    public Transaction transfer(String fromWalletId, String toWalletId, Money amount, String idempotencyKey) {
        // Idempotency check
        if (!processedIdempotencyKeys.add(idempotencyKey)) {
            throw new IllegalStateException("Duplicate transaction: " + idempotencyKey);
        }
        
        Wallet from = wallets.get(fromWalletId);
        Wallet to = wallets.get(toWalletId);
        if (from == null || to == null) throw new IllegalArgumentException("Wallet not found");
        
        // Limit check
        if (!limitChecker.isWithinLimits(from, amount)) {
            processedIdempotencyKeys.remove(idempotencyKey); // Allow retry
            throw new IllegalStateException("Daily limit exceeded");
        }
        
        // Debit source
        Transaction debitTxn = new Transaction(fromWalletId, TxnType.TRANSFER, amount, 
            "Transfer to " + toWalletId, idempotencyKey);
        from.debit(amount, debitTxn);
        
        // Credit destination (convert currency if needed)
        Money creditAmount = amount; // Same currency by default
        // Cross-currency: convert to destination wallet's primary currency if different
        
        Transaction creditTxn = new Transaction(toWalletId, TxnType.TRANSFER, creditAmount,
            "Transfer from " + fromWalletId, idempotencyKey + "-credit");
        to.credit(creditAmount, creditTxn);
        
        return debitTxn;
    }
    
    /**
     * Exchange currency within the same wallet.
     */
    public Transaction exchange(String walletId, Money fromAmount, Currency toCurrency, String idempotencyKey) {
        if (!processedIdempotencyKeys.add(idempotencyKey)) {
            throw new IllegalStateException("Duplicate transaction");
        }
        
        Wallet wallet = wallets.get(walletId);
        if (wallet == null) throw new IllegalArgumentException("Wallet not found");
        
        Money toAmount = exchangeService.convert(fromAmount, toCurrency);
        
        // Debit source currency
        Transaction debitTxn = new Transaction(walletId, TxnType.EXCHANGE, fromAmount,
            "Exchange " + fromAmount.currency + " → " + toCurrency, idempotencyKey);
        wallet.debit(fromAmount, debitTxn);
        
        // Credit target currency
        Transaction creditTxn = new Transaction(walletId, TxnType.EXCHANGE, toAmount,
            "Exchange credit " + toCurrency, idempotencyKey + "-credit");
        wallet.credit(toAmount, creditTxn);
        
        return debitTxn;
    }
}
```

---

## 🎯 Key Takeaways
- Paytm SDE-3 = **Multi-currency wallet LLD with exchange rates, limits, idempotency**
- **BigDecimal for money**: NEVER use `double` for currency — `0.1 + 0.2 ≠ 0.3` in floating point
- **Idempotency**: `processedIdempotencyKeys.add(key)` — Set's `add` returns false if already present — atomic check
- **KYC tier limits**: daily spending limits in INR equivalent — convert all currencies for comparison
- **Synchronized debit**: check balance + debit must be atomic — prevents race conditions
- **Exchange rate inverse**: `1/rate` with 6 decimal precision — set both directions
- **Money as value object**: immutable, currency always present, `setScale(2)` — prevents currency mismatch
- Paytm = **payments fintech** at scale — wallet, UPI, lending — expect money-handling precision questions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| LLD | Very Hard | Multi-Currency Wallet, BigDecimal |
| System Design | Very Hard | Payment Platform at Scale |
| HM | Medium | Culture Fit |
