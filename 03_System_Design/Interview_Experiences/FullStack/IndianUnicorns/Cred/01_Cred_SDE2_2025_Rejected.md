# Cred — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | CRED |
| **Role** | Backend Engineer |
| **Level** | SDE-2 |
| **YOE** | 3.5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/cred-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual
- **Rejection Reason:** Weak in system design — couldn't handle follow-up on ledger consistency and double-entry bookkeeping

---

## Round 1: Machine Coding
**Duration:** 90 minutes + 30 min discussion

### Questions Asked
1. **Design a Credit Card Reward Points System**
   - Earn points on transactions, redeem for rewards, tier-based multipliers, expiry

### 💡 Interview-Ready Answer

```java
enum Tier { BASE, SILVER, GOLD, PLATINUM }
enum TransactionCategory { DINING, TRAVEL, SHOPPING, FUEL, GROCERY, OTHER }

class RewardRule {
    TransactionCategory category;
    Map<Tier, Double> multipliers; // tier → points per rupee
    
    RewardRule(TransactionCategory category, Map<Tier, Double> multipliers) {
        this.category = category;
        this.multipliers = multipliers;
    }
    
    int calculatePoints(double amount, Tier tier) {
        double multiplier = multipliers.getOrDefault(tier, 1.0);
        return (int) Math.floor(amount * multiplier);
    }
}

class PointsLedger {
    String ledgerId;
    String userId;
    int amount;          // points credited or debited
    String type;         // "EARN" or "REDEEM"
    String description;
    LocalDateTime expiresAt;
    LocalDateTime createdAt;
}

class RewardService {
    Map<TransactionCategory, RewardRule> rules = new EnumMap<>(TransactionCategory.class);
    Map<String, List<PointsLedger>> userLedger = new HashMap<>();
    Map<String, Tier> userTiers = new HashMap<>();
    
    // Earn points on transaction
    int earnPoints(String userId, double amount, TransactionCategory category) {
        Tier tier = userTiers.getOrDefault(userId, Tier.BASE);
        RewardRule rule = rules.getOrDefault(category, defaultRule());
        
        int points = rule.calculatePoints(amount, tier);
        
        PointsLedger entry = new PointsLedger();
        entry.userId = userId;
        entry.amount = points;
        entry.type = "EARN";
        entry.description = category + " transaction: ₹" + amount;
        entry.expiresAt = LocalDateTime.now().plusMonths(12); // 1 year expiry
        entry.createdAt = LocalDateTime.now();
        
        userLedger.computeIfAbsent(userId, k -> new ArrayList<>()).add(entry);
        
        // Check tier upgrade
        checkTierUpgrade(userId);
        
        return points;
    }
    
    // Get available balance (excluding expired points)
    int getBalance(String userId) {
        LocalDateTime now = LocalDateTime.now();
        return userLedger.getOrDefault(userId, Collections.emptyList()).stream()
            .filter(entry -> entry.expiresAt.isAfter(now))
            .mapToInt(entry -> entry.type.equals("EARN") ? entry.amount : -entry.amount)
            .sum();
    }
    
    // Redeem points (FIFO — oldest points first, respect expiry)
    boolean redeemPoints(String userId, int pointsToRedeem, String rewardDescription) {
        int balance = getBalance(userId);
        if (balance < pointsToRedeem) return false;
        
        PointsLedger debit = new PointsLedger();
        debit.userId = userId;
        debit.amount = pointsToRedeem;
        debit.type = "REDEEM";
        debit.description = "Redeemed for: " + rewardDescription;
        debit.expiresAt = LocalDateTime.MAX; // debits don't expire
        debit.createdAt = LocalDateTime.now();
        
        userLedger.get(userId).add(debit);
        return true;
    }
    
    // Tier calculation based on total spend in last 12 months
    void checkTierUpgrade(String userId) {
        int totalPointsEarned = userLedger.getOrDefault(userId, Collections.emptyList()).stream()
            .filter(e -> e.type.equals("EARN"))
            .filter(e -> e.createdAt.isAfter(LocalDateTime.now().minusMonths(12)))
            .mapToInt(e -> e.amount)
            .sum();
        
        Tier newTier;
        if (totalPointsEarned >= 50000) newTier = Tier.PLATINUM;
        else if (totalPointsEarned >= 25000) newTier = Tier.GOLD;
        else if (totalPointsEarned >= 10000) newTier = Tier.SILVER;
        else newTier = Tier.BASE;
        
        userTiers.put(userId, newTier);
    }
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Design a Stack that supports getMin() in O(1)** (LeetCode 155)
2. **Combination Sum** (LeetCode 39)
3. **Shortest Path in Binary Matrix** (LeetCode 1091)

### 💡 Interview-Ready Answer — Min Stack

```java
class MinStack {
    Deque<long> stack = new ArrayDeque<>();
    long min;
    
    // Trick: store encoded value = 2 * actual - min
    // When popping, if value < min, the real min was the previous one
    
    public void push(int val) {
        if (stack.isEmpty()) {
            stack.push(0L);
            min = val;
        } else {
            stack.push((long)val - min); // store diff
            if (val < min) min = val;
        }
    }
    
    public void pop() {
        long top = stack.pop();
        if (top < 0) {
            min = min - top; // restore previous min
        }
    }
    
    public int top() {
        long top = stack.peek();
        return top < 0 ? (int)min : (int)(top + min);
    }
    
    public int getMin() {
        return (int)min;
    }
}
// O(1) time for all operations, O(1) extra space (no auxiliary stack)
```

### 💡 Interview-Ready Answer — Shortest Path in Binary Matrix

```java
public int shortestPathBinaryMatrix(int[][] grid) {
    int n = grid.length;
    if (grid[0][0] == 1 || grid[n-1][n-1] == 1) return -1;
    
    int[][] dirs = {{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}};
    Queue<int[]> queue = new LinkedList<>();
    queue.offer(new int[]{0, 0});
    grid[0][0] = 1; // mark visited
    int steps = 1;
    
    while (!queue.isEmpty()) {
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            int[] cell = queue.poll();
            if (cell[0] == n-1 && cell[1] == n-1) return steps;
            
            for (int[] d : dirs) {
                int nr = cell[0] + d[0], nc = cell[1] + d[1];
                if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] == 0) {
                    grid[nr][nc] = 1;
                    queue.offer(new int[]{nr, nc});
                }
            }
        }
        steps++;
    }
    return -1;
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design CRED's Credit Card Bill Payment System**
   - Payment processing, bill fetch from banks, scheduled payments, cashback rewards

### 💡 Interview-Ready Answer

```
┌──────────────────────────────────────────────────────────────┐
│                   CRED Bill Payment Flow                      │
│                                                                │
│  1. User links credit card                                    │
│  2. CRED fetches bill from bank (screen scraping/API)        │
│  3. User initiates payment → UPI/NetBanking/CRED Pay        │
│  4. Payment gateway processes                                 │
│  5. CRED earns CRED coins → user gets cashback               │
│  6. Transaction logged in double-entry ledger                 │
└──────────────────────────────────────────────────────────────┘

Double-Entry Ledger (The part I got wrong):
┌──────────────────────────────────────────────────────┐
│  Every transaction has TWO entries:                    │
│  DEBIT (source loses money) + CREDIT (dest gains)    │
│                                                        │
│  Bill Payment: ₹5000                                  │
│  Entry 1: DEBIT  User's bank account      -₹5000    │
│  Entry 2: CREDIT Credit card issuer        +₹5000    │
│                                                        │
│  Cashback: 50 CRED coins                              │
│  Entry 1: DEBIT  CRED rewards pool        -50 coins  │
│  Entry 2: CREDIT User's CRED wallet       +50 coins  │
│                                                        │
│  INVARIANT: Sum of all debits = Sum of all credits    │
│  If they don't match → data integrity violation!      │
└──────────────────────────────────────────────────────┘
```

```sql
-- Ledger table (immutable — append-only)
CREATE TABLE ledger_entries (
    entry_id        BIGSERIAL PRIMARY KEY,
    transaction_id  VARCHAR(36) NOT NULL,
    account_id      VARCHAR(36) NOT NULL,
    entry_type      VARCHAR(6) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount          DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
    description     TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_transaction (transaction_id),
    INDEX idx_account (account_id, created_at)
);

-- Account balances (materialized from ledger)
CREATE TABLE account_balances (
    account_id      VARCHAR(36) PRIMARY KEY,
    balance         DECIMAL(15,2) NOT NULL DEFAULT 0,
    last_entry_id   BIGINT REFERENCES ledger_entries(entry_id),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Double-entry insert (MUST be atomic)
-- Both entries in same transaction; DB enforces debit = credit
BEGIN;
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, description)
VALUES ('txn-001', 'user-bank-acc', 'DEBIT', 5000, 'Bill payment');

INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, description)
VALUES ('txn-001', 'cc-issuer-acc', 'CREDIT', 5000, 'Bill payment received');

-- Verify balance: skip for payments, enforce for internal transfers
UPDATE account_balances SET balance = balance - 5000 WHERE account_id = 'user-bank-acc';
UPDATE account_balances SET balance = balance + 5000 WHERE account_id = 'cc-issuer-acc';
COMMIT;
```

---

## Round 4: Hiring Manager
**Duration:** 30 minutes

### Questions Asked
1. **"Why CRED?"**
2. **"How do you handle production incidents?"**

> **Why I was rejected:** My system design was fine at the high level, but the interviewer asked deep follow-ups on **double-entry bookkeeping** — specifically: "What happens if one leg of the double entry fails? How do you ensure the ledger is always balanced? How do you handle reconciliation with external banks?" I couldn't articulate the atomicity guarantees well enough. The interviewer also asked about **idempotent payment processing** with network retries, and I gave a generic answer instead of showing the specific pattern (idempotency key → check before processing → atomic insert-or-return).

---

## 🎯 Key Takeaways
- CRED interviews are **fintech-deep** — know double-entry bookkeeping, ledgers, reconciliation
- **Reward Points System** is CRED's signature machine coding question — handle tiers, expiry, FIFO redemption
- **Min Stack** with O(1) space (no auxiliary stack) is elegant — store diffs instead of values
- **BFS on grid** (8-directional) is a standard Indian company question
- **Double-entry ledger** must be atomic — both legs in one DB transaction, immutable entries
- **Payment idempotency** is critical at CRED — every payment retry must produce the same result
- Know the **reconciliation** problem: matching CRED's ledger with bank statements

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | OOP, Tier System, Points Expiry |
| Round 2 | Medium-Hard | Stack, Backtracking, BFS |
| Round 3 | Very Hard | Double-Entry Ledger, Payment Processing |
| HM | Medium | Behavioral |
