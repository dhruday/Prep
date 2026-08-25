# Paytm — SDE-2 Interview Experience (2024)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm (One97 Communications) |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 |
| **YOE** | 3 years |
| **Date** | December 2024 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/paytm-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + Managerial)
- **Timeline:** 10 days
- **Format:** Virtual

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Design a Wallet/Payment System**
   - Add money, transfer between users, check balance, transaction history, concurrent transfers

### 💡 Interview-Ready Answer

```java
class Wallet {
    String userId;
    BigDecimal balance;
    List<Transaction> history;
    ReentrantLock lock = new ReentrantLock();
    
    Wallet(String userId) {
        this.userId = userId;
        this.balance = BigDecimal.ZERO;
        this.history = new ArrayList<>();
    }
}

enum TransactionType { CREDIT, DEBIT, TRANSFER_IN, TRANSFER_OUT }
enum TransactionStatus { SUCCESS, FAILED, PENDING }

class Transaction {
    String transactionId;
    String userId;
    TransactionType type;
    BigDecimal amount;
    TransactionStatus status;
    String counterpartyId; // for transfers
    LocalDateTime timestamp;
    String description;
}

class WalletService {
    Map<String, Wallet> wallets = new ConcurrentHashMap<>();
    
    Wallet createWallet(String userId) {
        Wallet wallet = new Wallet(userId);
        wallets.put(userId, wallet);
        return wallet;
    }
    
    Transaction addMoney(String userId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("Amount must be positive");
        
        Wallet wallet = getWallet(userId);
        wallet.lock.lock();
        try {
            wallet.balance = wallet.balance.add(amount);
            Transaction txn = new Transaction();
            txn.transactionId = UUID.randomUUID().toString();
            txn.userId = userId;
            txn.type = TransactionType.CREDIT;
            txn.amount = amount;
            txn.status = TransactionStatus.SUCCESS;
            txn.timestamp = LocalDateTime.now();
            txn.description = "Add money";
            wallet.history.add(txn);
            return txn;
        } finally {
            wallet.lock.unlock();
        }
    }
    
    // Transfer with deadlock prevention: always lock in userId order
    TransferResult transfer(String fromUserId, String toUserId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("Amount must be positive");
        if (fromUserId.equals(toUserId)) throw new IllegalArgumentException("Cannot transfer to self");
        
        Wallet from = getWallet(fromUserId);
        Wallet to = getWallet(toUserId);
        
        // Deadlock prevention: always lock lower userId first
        Wallet first = fromUserId.compareTo(toUserId) < 0 ? from : to;
        Wallet second = fromUserId.compareTo(toUserId) < 0 ? to : from;
        
        first.lock.lock();
        try {
            second.lock.lock();
            try {
                if (from.balance.compareTo(amount) < 0) {
                    return TransferResult.fail("Insufficient balance");
                }
                
                String txnId = UUID.randomUUID().toString();
                
                // Debit sender
                from.balance = from.balance.subtract(amount);
                Transaction debit = createTransaction(txnId, fromUserId, TransactionType.TRANSFER_OUT, 
                    amount, toUserId, "Transfer to " + toUserId);
                from.history.add(debit);
                
                // Credit receiver
                to.balance = to.balance.add(amount);
                Transaction credit = createTransaction(txnId, toUserId, TransactionType.TRANSFER_IN,
                    amount, fromUserId, "Transfer from " + fromUserId);
                to.history.add(credit);
                
                return TransferResult.success(txnId);
            } finally {
                second.lock.unlock();
            }
        } finally {
            first.lock.unlock();
        }
    }
    
    BigDecimal getBalance(String userId) {
        return getWallet(userId).balance;
    }
    
    List<Transaction> getHistory(String userId, int page, int size) {
        Wallet wallet = getWallet(userId);
        List<Transaction> all = wallet.history;
        int start = Math.min(page * size, all.size());
        int end = Math.min(start + size, all.size());
        return all.subList(start, end);
    }
    
    private Wallet getWallet(String userId) {
        Wallet wallet = wallets.get(userId);
        if (wallet == null) throw new IllegalArgumentException("Wallet not found: " + userId);
        return wallet;
    }
}
```

**Key Design Decisions:**
1. **BigDecimal** for money (never double/float)
2. **Deadlock prevention** via consistent lock ordering
3. **Idempotency** via transactionId
4. **Immutable transactions** (audit trail)

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Detect Cycle in Directed Graph** (Kahn's / DFS coloring)
2. **Minimum Coins** (LeetCode 322)
3. **Next Permutation** (LeetCode 31)

### 💡 Interview-Ready Answer — Next Permutation

```java
public void nextPermutation(int[] nums) {
    int n = nums.length;
    
    // Step 1: Find rightmost element smaller than its right neighbor
    int i = n - 2;
    while (i >= 0 && nums[i] >= nums[i + 1]) i--;
    
    if (i >= 0) {
        // Step 2: Find rightmost element larger than nums[i]
        int j = n - 1;
        while (nums[j] <= nums[i]) j--;
        
        // Step 3: Swap
        swap(nums, i, j);
    }
    
    // Step 4: Reverse from i+1 to end
    reverse(nums, i + 1, n - 1);
}

private void swap(int[] nums, int i, int j) {
    int temp = nums[i]; nums[i] = nums[j]; nums[j] = temp;
}

private void reverse(int[] nums, int l, int r) {
    while (l < r) { swap(nums, l++, r--); }
}
```
**Time:** O(n), **Space:** O(1)

### 💡 Interview-Ready Answer — Cycle Detection (DFS 3-Color)

```java
enum Color { WHITE, GRAY, BLACK }

public boolean hasCycle(int n, List<List<Integer>> adj) {
    Color[] color = new Color[n];
    Arrays.fill(color, Color.WHITE);
    
    for (int i = 0; i < n; i++) {
        if (color[i] == Color.WHITE && dfs(i, adj, color)) return true;
    }
    return false;
}

private boolean dfs(int u, List<List<Integer>> adj, Color[] color) {
    color[u] = Color.GRAY; // being processed
    
    for (int v : adj.get(u)) {
        if (color[v] == Color.GRAY) return true; // back edge → cycle!
        if (color[v] == Color.WHITE && dfs(v, adj, color)) return true;
    }
    
    color[u] = Color.BLACK; // fully processed
    return false;
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design UPI Payment System**
   - Request/collect, VPA (Virtual Payment Address), settlement, merchant payments

### 💡 Interview-Ready Answer

```
UPI Architecture:
┌──────────────────────────────────────────────────────────────┐
│  User's App (PSP — Payment Service Provider)                 │
│  Paytm / Google Pay / PhonePe                                │
│                                                                │
│  User: alice@paytm sends ₹500 to bob@okicici                │
└────────────────────────┬─────────────────────────────────────┘
                         │ Encrypted request
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  NPCI (National Payments Corp of India)                       │
│  Central Switch for UPI                                       │
│                                                                │
│  1. Resolve VPA → Bank account                                │
│     alice@paytm → Paytm Payments Bank A/C 1234              │
│     bob@okicici → ICICI Bank A/C 5678                        │
│                                                                │
│  2. Route debit request to Remitting Bank (Paytm PB)         │
│  3. Route credit request to Beneficiary Bank (ICICI)         │
│  4. Wait for both banks to ACK                                │
│  5. Return success/failure to PSP                             │
└──────────────────────────────────────────────────────────────┘

Transaction Flow (2-leg):
┌─────────┐      ┌──────┐      ┌──────────┐      ┌─────────┐
│ Sender's│      │ NPCI │      │ NPCI     │      │ Receiver│
│ Bank    │◀─────│ Debit│─────▶│ Credit   │─────▶│ Bank    │
│ (Paytm) │ACK   │ Leg  │      │ Leg      │ ACK  │ (ICICI) │
└─────────┘      └──────┘      └──────────┘      └─────────┘

Key Design Points:
1. VPA Resolution: DNS-like system. @paytm → Paytm's bank.
   Each PSP maintains VPA → account mapping.

2. Transaction States:
   INITIATED → DEBIT_PENDING → DEBIT_SUCCESS → CREDIT_PENDING → 
   CREDIT_SUCCESS → COMPLETED
   Any failure → ROLLBACK (refund debit)

3. Idempotency: Each UPI transaction has unique txn_id.
   Retry with same txn_id → returns existing result.

4. Settlement: Not real-time (despite appearing instant).
   Banks settle net positions at end of day via NPCI clearing.
   Instant = account balance updated, actual money moves later.

5. Collect Request: Bob sends COLLECT request to Alice.
   Alice approves → same flow as above but initiated by receiver.
```

#### Transaction State Machine
```java
enum UpiTxnState {
    INITIATED, DEBIT_PENDING, DEBIT_SUCCESS, DEBIT_FAILED,
    CREDIT_PENDING, CREDIT_SUCCESS, CREDIT_FAILED,
    COMPLETED, FAILED, REVERSED
}

class UpiTransaction {
    String transactionId;
    String payerVpa;       // alice@paytm
    String payeeVpa;       // bob@okicici
    BigDecimal amount;
    UpiTxnState state;
    String payerBankRef;
    String payeeBankRef;
    LocalDateTime createdAt;
    LocalDateTime completedAt;
    
    void processDebitResponse(boolean success, String bankRef) {
        if (state != UpiTxnState.DEBIT_PENDING) 
            throw new IllegalStateException("Invalid state: " + state);
        
        if (success) {
            this.payerBankRef = bankRef;
            this.state = UpiTxnState.DEBIT_SUCCESS;
            // Next: send credit request to payee bank
        } else {
            this.state = UpiTxnState.DEBIT_FAILED;
            this.state = UpiTxnState.FAILED;
        }
    }
    
    void processCreditResponse(boolean success, String bankRef) {
        if (state != UpiTxnState.CREDIT_PENDING)
            throw new IllegalStateException("Invalid state: " + state);
        
        if (success) {
            this.payeeBankRef = bankRef;
            this.state = UpiTxnState.CREDIT_SUCCESS;
            this.state = UpiTxnState.COMPLETED;
            this.completedAt = LocalDateTime.now();
        } else {
            this.state = UpiTxnState.CREDIT_FAILED;
            // CRITICAL: Must reverse debit!
            initiateReversal();
        }
    }
    
    void initiateReversal() {
        // Credit failed after debit success → refund payer
        // Send reversal request to payer's bank
        this.state = UpiTxnState.REVERSED;
    }
}
```

---

## Round 4: Managerial
**Duration:** 30 minutes

---

## 🎯 Key Takeaways
- Paytm interviews focus on **payments and wallet systems** — know UPI flow
- **Wallet Machine Coding** with deadlock prevention is the #1 question
- **BigDecimal** for money — interviewers explicitly check for this
- **Lock ordering** for deadlock prevention — sort by userId
- **Next Permutation** algorithm — 4-step process, must be memorized
- **DFS 3-color** for cycle detection is cleaner than the visited+recStack approach
- **UPI 2-leg transaction** with reversal is critical for Paytm interviews
- **Settlement vs instant credit** — understand the difference

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Wallet, Concurrency, BigDecimal |
| Round 2 | Medium | Graph, DP, Array |
| Round 3 | Hard | UPI Architecture, State Machine, Settlement |
| Round 4 | Easy | Behavioral |
