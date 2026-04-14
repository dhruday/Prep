# GoldmanSachs — VP FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | Vice President (VP) |
| **Level** | Senior |
| **YOE** | 8 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (HackerRank + Technical 1 + Technical 2 + System Design + HM)
- **Rejection Reason:** Technical 2 — couldn't optimize time complexity enough
- **Timeline:** 3 weeks

---

## Round 1: HackerRank Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Maximum Profit in Job Scheduling** (LeetCode 1235)
2. **Complex SQL: Running Total with Gaps**

### 💡 Job Scheduling with DP + Binary Search

```java
public int jobScheduling(int[] startTime, int[] endTime, int[] profit) {
    int n = startTime.length;
    int[][] jobs = new int[n][3];
    for (int i = 0; i < n; i++) {
        jobs[i] = new int[]{startTime[i], endTime[i], profit[i]};
    }
    
    // Sort by end time
    Arrays.sort(jobs, (a, b) -> a[1] - b[1]);
    
    // dp[i] = max profit considering first i jobs
    int[] dp = new int[n + 1];
    
    for (int i = 1; i <= n; i++) {
        // Option 1: skip job i
        dp[i] = dp[i - 1];
        
        // Option 2: take job i
        // Find latest job that ends before job i starts
        int prevJob = binarySearch(jobs, i - 1, jobs[i-1][0]);
        dp[i] = Math.max(dp[i], dp[prevJob + 1] + jobs[i-1][2]);
    }
    
    return dp[n];
}

// Find latest job index whose end time <= target start time
private int binarySearch(int[][] jobs, int endIdx, int targetStart) {
    int lo = 0, hi = endIdx - 1;
    int result = -1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (jobs[mid][1] <= targetStart) {
            result = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return result; // -1 means no compatible job (dp[0] = 0)
}
// Time: O(n log n), Space: O(n)
```

### 💡 SQL: Running Total with Gaps

```sql
-- Given trades table: trade_id, trader_id, amount, trade_date
-- Find running profit/loss per trader, handling days with no trades

WITH date_range AS (
    SELECT DISTINCT trade_date FROM trades
),
trader_daily AS (
    SELECT 
        t.trader_id,
        d.trade_date,
        COALESCE(SUM(t2.amount), 0) as daily_pnl
    FROM (SELECT DISTINCT trader_id FROM trades) t
    CROSS JOIN date_range d
    LEFT JOIN trades t2 ON t.trader_id = t2.trader_id AND d.trade_date = t2.trade_date
    GROUP BY t.trader_id, d.trade_date
)
SELECT 
    trader_id,
    trade_date,
    daily_pnl,
    SUM(daily_pnl) OVER (PARTITION BY trader_id ORDER BY trade_date) as running_pnl
FROM trader_daily
ORDER BY trader_id, trade_date;
```

---

## Round 2: Technical 1
**Duration:** 60 minutes

### Questions Asked
1. **Design a Thread-Safe Object Pool**
2. **Implement Producer-Consumer with bounded buffer and priorities**

### 💡 Thread-Safe Object Pool

```java
class ObjectPool<T> {
    private final Queue<T> available;
    private final Set<T> inUse;
    private final int maxSize;
    private final Supplier<T> factory;
    private final Consumer<T> reset;
    private final Semaphore semaphore;
    
    ObjectPool(int maxSize, Supplier<T> factory, Consumer<T> reset) {
        this.maxSize = maxSize;
        this.factory = factory;
        this.reset = reset;
        this.available = new ConcurrentLinkedQueue<>();
        this.inUse = ConcurrentHashMap.newKeySet();
        this.semaphore = new Semaphore(maxSize);
        
        // Pre-populate pool
        for (int i = 0; i < maxSize; i++) {
            available.offer(factory.get());
        }
    }
    
    T acquire() throws InterruptedException {
        semaphore.acquire(); // Block if all objects in use
        T obj = available.poll();
        if (obj == null) obj = factory.get(); // Should not happen with semaphore
        inUse.add(obj);
        return obj;
    }
    
    T tryAcquire(long timeout, TimeUnit unit) throws InterruptedException {
        if (!semaphore.tryAcquire(timeout, unit)) return null;
        T obj = available.poll();
        if (obj == null) obj = factory.get();
        inUse.add(obj);
        return obj;
    }
    
    void release(T obj) {
        if (!inUse.remove(obj)) {
            throw new IllegalArgumentException("Object not from this pool");
        }
        reset.accept(obj); // Reset to clean state
        available.offer(obj);
        semaphore.release();
    }
    
    int available() { return available.size(); }
    int inUse() { return inUse.size(); }
}

// Usage: Database connection pool
ObjectPool<Connection> pool = new ObjectPool<>(
    20, 
    () -> DriverManager.getConnection("jdbc:..."),
    conn -> { /* reset connection state */ }
);

Connection conn = pool.acquire();
try {
    // Use connection
} finally {
    pool.release(conn); // Always release!
}
```

---

## Round 3: Technical 2
**Duration:** 60 minutes

### Questions Asked
1. **Optimal Strategy for Stock Trading with Transaction Fees** (variant of LC 714)
2. **Follow-up: Maximum k=3 transactions with cooldown AND fees**
3. **Optimize to O(1) space** (This is where I failed)

### 💡 Stock Trading — k Transactions + Cooldown + Fee

```java
// Standard DP: O(n * k) time, O(n * k) space
public int maxProfit(int[] prices, int k, int cooldown, int fee) {
    int n = prices.length;
    if (n <= 1) return 0;
    
    // dp[i][j][0] = max profit on day i with j transactions, not holding
    // dp[i][j][1] = max profit on day i with j transactions, holding
    int[][][] dp = new int[n][k + 1][2];
    
    // Initialize
    for (int j = 0; j <= k; j++) {
        dp[0][j][0] = 0;
        dp[0][j][1] = -prices[0];
    }
    
    for (int i = 1; i < n; i++) {
        for (int j = 1; j <= k; j++) {
            // Not holding: either rest, or sell today (with fee + cooldown)
            dp[i][j][0] = Math.max(
                dp[i-1][j][0], // Rest
                dp[i-1][j][1] + prices[i] - fee // Sell
            );
            
            // Holding: either rest, or buy today (from cooldown days ago)
            int prevIdx = Math.max(0, i - 1 - cooldown);
            dp[i][j][1] = Math.max(
                dp[i-1][j][1], // Rest
                dp[prevIdx][j-1][0] - prices[i] // Buy (new transaction)
            );
        }
    }
    
    return dp[n-1][k][0];
}
// Time: O(n*k), Space: O(n*k)

// Space-optimized to O(k) — what I couldn't do in the interview:
// For cooldown=0, can use rolling array. But with cooldown > 0,
// need to keep track of cooldown days back → can use circular buffer of size (cooldown+2)
```

---

## Round 4: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design a Real-Time Risk Management System for Trading**

### 💡 Interview-Ready Answer

```
Real-Time Risk Management:
┌──────────────────────────────────────────────────────────────┐
│  Requirements:                                                │
│  - Pre-trade risk checks (< 5ms latency)                    │
│  - Position limits, net exposure, concentration risk         │
│  - Market risk (VaR), credit risk, operational risk          │
│  - Real-time P&L calculation                                 │
│                                                                │
│  Architecture:                                                │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ Trading   │─▶│ Risk Gateway │─▶│ Risk Engine      │       │
│  │ Engine    │  │ (pre-trade)  │  │ (in-memory calc) │       │
│  │           │  │              │  │                  │       │
│  │ Order     │  │ <5ms SLA     │  │  Position DB     │       │
│  │ Entry     │  │              │  │  (Redis cluster) │       │
│  └──────────┘  └──────────────┘  └──────────────────┘       │
│                                                                │
│  Pre-Trade Checks (synchronous, <5ms):                        │
│  1. Position limits: trader's net position < max limit       │
│  2. Order size: single order < max order size                │
│  3. Fat finger: price within 5% of market price             │
│  4. Credit check: counterparty has sufficient credit         │
│  5. Concentration: single-name exposure < X% of portfolio    │
│                                                                │
│  Implementation — In-Memory Risk:                             │
│  - All positions held in Redis cluster (sharded by trader)   │
│  - Lua script for atomic check-and-update:                   │
│    Check position + limit → if OK, update position → return  │
│  - Why not DB? Too slow for 5ms SLA                          │
│  - Async persistence: Kafka → PostgreSQL (audit trail)       │
│                                                                │
│  Market Risk (VaR — Value at Risk):                           │
│  - Batch calculation: Monte Carlo simulation (10K scenarios) │
│  - Recalculated every 15 minutes during market hours         │
│  - Pre-computed Greeks (delta, gamma, vega) for quick updates│
│  - If VaR exceeds limit → alert risk desk → block new trades │
│                                                                │
│  Real-Time P&L:                                               │
│  P&L = Σ (current_price - avg_cost) × quantity for all pos  │
│  - Market data feed → position × price calculation engine    │
│  - Updated every tick (market data change)                   │
│  - Dashboard: WebSocket → trader's workstation               │
│  - Aggregation: by trader, desk, division, firm              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Goldman Sachs VP = **heavy on concurrency + financial domain + optimization**
- **Job Scheduling** (DP + Binary Search) is GS's classic DSA question
- **Object Pool** with Semaphore — clean pattern for connection pooling
- **Stock trading DP with k transactions + cooldown + fee** is extremely hard to space-optimize
- I **got rejected** because I couldn't reduce O(n*k) space to O(k) — for VP level, they expect mastery
- **Pre-trade risk < 5ms** → in-memory computation (Redis) + Lua for atomicity
- **VaR, Greeks, P&L** — know these financial terms for GS system design
- Goldman values **optimization** more than other companies — always aim for optimal

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| HackerRank | Hard | Job Scheduling DP, Complex SQL |
| Technical 1 | Medium-Hard | Object Pool, Thread Safety |
| Technical 2 | Very Hard | Stock Trading, Multi-Constraint DP |
| System Design | Hard | Real-Time Risk, VaR, P&L |
| HM | Medium | Behavioral |
