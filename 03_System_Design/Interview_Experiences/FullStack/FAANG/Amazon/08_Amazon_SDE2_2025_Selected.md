# Amazon — SDE-2 FullStack Interview Experience (2025) — #8

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-2 |
| **Level** | L5 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Amazon Pay |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + Bar Raiser)
- **Timeline:** 2 weeks

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Number of Provinces** (LeetCode 547) — Union-Find
2. **Design Hit Counter** with follow-up for distributed systems

### 💡 Number of Provinces (Connected Components)

```java
// Union-Find approach — O(n² α(n)) ≈ O(n²)
public int findCircleNum(int[][] isConnected) {
    int n = isConnected.length;
    int[] parent = new int[n];
    int[] rank = new int[n];
    int provinces = n;
    
    for (int i = 0; i < n; i++) parent[i] = i;
    
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (isConnected[i][j] == 1) {
                int pi = find(parent, i);
                int pj = find(parent, j);
                if (pi != pj) {
                    union(parent, rank, pi, pj);
                    provinces--;
                }
            }
        }
    }
    
    return provinces;
}

private int find(int[] parent, int x) {
    if (parent[x] != x) parent[x] = find(parent, parent[x]);
    return parent[x];
}

private void union(int[] parent, int[] rank, int x, int y) {
    if (rank[x] < rank[y]) parent[x] = y;
    else if (rank[x] > rank[y]) parent[y] = x;
    else { parent[y] = x; rank[x]++; }
}
```

---

## Round 2: LP + DSA
**Duration:** 60 minutes

### LP Questions
1. **"Tell me about a time you had to deliver results under tight deadlines"** (Deliver Results)
2. **"How did you handle a situation where you had to make a decision with incomplete info?"** (Bias for Action)

### DSA: Minimum Deletions to Make String Balanced (LeetCode 1653)

```java
// Given string of 'a' and 'b', find min deletions to make all 'a's before all 'b's
public int minimumDeletions(String s) {
    int n = s.length();
    int bCount = 0;
    int minDeletions = 0;
    
    // At each position, we choose: delete this 'a' OR delete all 'b's seen before
    for (int i = 0; i < n; i++) {
        if (s.charAt(i) == 'b') {
            bCount++;
        } else {
            // 'a' found: either delete this 'a' (+1) or delete all previous 'b's
            minDeletions = Math.min(minDeletions + 1, bCount);
        }
    }
    
    return minDeletions;
}
// Time: O(n), Space: O(1)

// Approach: DP with running count of b's
// At each 'a', the cost is min(delete_this_a, delete_all_prev_b's)
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Amazon Pay Wallet System**
   - Top-up, pay merchant, peer transfer, refund
   - Transaction history with settlement
   - Cashback/reward system

### 💡 Key Architecture Points

```
Amazon Pay Wallet System:
┌──────────────────────────────────────────────────────────────┐
│  Core: Double-entry bookkeeping (credit + debit for every txn)│
│                                                                │
│  Entities:                                                     │
│  - Wallet: { user_id, balance, currency, status, created_at } │
│  - Transaction: { txn_id, wallet_id, type, amount, balance_   │
│    after, reference_id, created_at, metadata }                │
│  - Ledger: { entry_id, debit_wallet, credit_wallet, amount,  │
│    description, txn_id }                                      │
│                                                                │
│  Key Operations:                                               │
│  1. Top-up (bank → wallet):                                   │
│     - Lock wallet row (SELECT FOR UPDATE)                    │
│     - Debit: Amazon holding account                          │
│     - Credit: User wallet                                     │
│     - Commit in single transaction                           │
│                                                                │
│  2. Pay Merchant:                                              │
│     - Check balance ≥ amount (with lock)                     │
│     - Debit: User wallet                                      │
│     - Credit: Merchant settlement account                    │
│     - Apply cashback rules asynchronously                    │
│                                                                │
│  3. Peer Transfer:                                             │
│     - Lock BOTH wallets (ordered by wallet_id to avoid deadlock)│
│     - Debit: Sender wallet                                    │
│     - Credit: Receiver wallet                                 │
│                                                                │
│  4. Refund:                                                    │
│     - Idempotent: check if refund already processed for txn  │
│     - Reverse the original ledger entries                     │
│     - Credit: User wallet (original debit)                    │
│     - Debit: Merchant/Amazon account (original credit)        │
│                                                                │
│  Concurrency Control:                                          │
│  - Pessimistic locking: SELECT FOR UPDATE on wallet           │
│  - Ordered locking: always lock wallets in ascending ID order │
│  - Optimistic alternative: version field + CAS                │
│                                                                │
│  Idempotency:                                                  │
│  - Every request has client-generated idempotency key         │
│  - Store in Redis: SET idem:{key} NX EX 86400                │
│  - If exists → return cached response                        │
│                                                                │
│  Scale:                                                        │
│  - Sharding by user_id (consistent hashing)                  │
│  - Read path: separate read replica for balance inquiries     │
│  - Transaction log: append-only (perfect for Kafka)           │
│  - Cashback: async via Kafka consumer                        │
│  - Settlement: batch job at T+1 (merchants get daily payout) │
│                                                                │
│  Monitoring:                                                   │
│  - Balance reconciliation: sum(credits) - sum(debits) = balance│
│  - Daily recon job: wallet balance vs ledger balance          │
│  - Alert on mismatch > threshold (potential fraud/bug)        │
│                                                                │
│  Cashback Engine:                                              │
│  - Rules: { min_txn_amount, cashback_percent, max_cashback,   │
│    valid_from, valid_to, merchant_category, max_uses }        │
│  - Evaluate rules after successful payment (Kafka)            │
│  - Credit cashback to wallet with delay (to prevent abuse)    │
│  - Anti-stacking: only best applicable offer wins             │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 4: Bar Raiser
**Duration:** 60 minutes

### LP Deep Dives
1. **"Tell me about the most impactful project you led"** (Ownership, Earn Trust)
2. **"Describe a time you simplified a complex system"** (Invent and Simplify)
3. **"How do you decide between two good solutions?"** (Have Backbone; Disagree and Commit)

### 💡 Strong LP Answer Template
```
STAR Format for Amazon:
S: Specific situation with context (1-2 sentences)
T: YOUR task (not the team's)
A: Specific actions YOU took (most detail here, 60% of answer)
   - "I" not "we" — bar raisers will push on individual contribution
   - Include data points: "I analyzed 6 months of logs"
   - Include decisions: "I chose X over Y because..."
R: Quantifiable results
   - Latency: "Reduced P99 from 2s to 200ms"
   - Scale: "Now handling 10x traffic"
   - Business: "Saved $500K/year in infrastructure"
   
Key: Prepare 6-8 stories that cover all 16 LPs.
Each story should map to 2-3 LPs for flexibility.
```

---

## 🎯 Key Takeaways
- Amazon SDE-2 = **LP mastery + DSA + system design** — all equally weighted
- **Wallet system**: double-entry bookkeeping is non-negotiable for financial systems
- **Deadlock prevention**: order locks by ascending wallet_id for peer transfers
- **Min Deletions for Balanced String**: elegant O(n) DP — at each 'a', min(delete_a, count_of_b_before)
- **Number of Provinces**: Union-Find with path compression and union by rank
- **Bar Raiser**: can veto any hire — LP stories must be bulletproof
- **Amazon LP tip**: use "I" not "we" (bar raisers catch this immediately)
- **Cashback anti-stacking**: only best applicable offer → prevents gaming

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Union-Find, Hit Counter |
| LP + DSA | Medium-Hard | Leadership Principles, DP |
| System Design | Hard | Wallet, Double-Entry, Settlement |
| Bar Raiser | Very Hard | LP Deep Dive, Cross-LP Consistency |
