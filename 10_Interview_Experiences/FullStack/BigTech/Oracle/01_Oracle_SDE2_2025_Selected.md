# Oracle — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | Applications Engineer (IC3) |
| **Level** | SDE-2 equivalent |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/oracle-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + Managerial)
- **Timeline:** 3 weeks
- **Format:** Virtual
- **Note:** Oracle has heavy emphasis on Java internals, SQL, and multithreading

---

## Round 1: Online Assessment
**Duration:** 90 minutes | **Platform:** HackerRank

### Questions Asked
1. **Longest Palindromic Subsequence** (LeetCode 516)
2. **Find K Pairs with Smallest Sums** (LeetCode 373)
3. **SQL: Self-join, HAVING, GROUP BY queries**

### 💡 Interview-Ready Answer — Longest Palindromic Subsequence

```java
public int longestPalindromeSubseq(String s) {
    int n = s.length();
    int[][] dp = new int[n][n];
    
    // Base case: single chars are palindrome of length 1
    for (int i = 0; i < n; i++) dp[i][i] = 1;
    
    // Fill diagonally (length 2 to n)
    for (int len = 2; len <= n; len++) {
        for (int i = 0; i <= n - len; i++) {
            int j = i + len - 1;
            if (s.charAt(i) == s.charAt(j)) {
                dp[i][j] = dp[i+1][j-1] + 2;
            } else {
                dp[i][j] = Math.max(dp[i+1][j], dp[i][j-1]);
            }
        }
    }
    return dp[0][n-1];
}
```
**Time:** O(n²), **Space:** O(n²) — can optimize to O(n) space

---

## Round 2: Core Java + DSA
**Duration:** 60 minutes | **Interviewer:** Tech Lead

### Questions Asked
1. **Java Memory Model:** JVM architecture, Heap vs Stack, GC algorithms
2. **Implement a Thread-Safe Producer-Consumer with BlockingQueue**
3. **LRU Cache** (LeetCode 146) — with full Java implementation

### 💡 Interview-Ready Answer — JVM Architecture

```
JVM Memory Layout:
┌──────────────────────────┐
│       Method Area         │  ← Class metadata, static vars, constant pool
│   (Metaspace since J8)   │    Shared across all threads
├──────────────────────────┤
│          Heap             │  ← Objects, instance variables
│  ┌──────────────────┐    │    Shared across all threads
│  │  Young Gen       │    │    GC: Minor GC (young), Major GC (old)
│  │  ┌────┐ ┌────┐  │    │
│  │  │Eden│ │S0│S1│  │    │    Object flow: Eden → S0/S1 → Old Gen
│  │  └────┘ └────┘  │    │
│  ├──────────────────┤    │
│  │  Old Gen         │    │    Long-lived objects. Full GC is expensive.
│  └──────────────────┘    │
├──────────────────────────┤
│    Stack (per thread)    │  ← Method frames, local vars, operand stack
├──────────────────────────┤
│    PC Register           │  ← Current instruction pointer (per thread)
├──────────────────────────┤
│    Native Method Stack   │  ← JNI native method calls
└──────────────────────────┘

GC Algorithms:
- Serial GC: Single-threaded, STW. For small heaps.
- Parallel GC: Multi-threaded young gen. Default in Java 8.
- G1 GC: Region-based, predictable pause times. Default since Java 9.
- ZGC: Sub-millisecond pauses, concurrent. Java 15+. For large heaps (TB).
```

### 💡 Interview-Ready Answer — Producer-Consumer

```java
class BoundedBuffer<T> {
    private final Queue<T> buffer;
    private final int capacity;
    private final Lock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();
    
    BoundedBuffer(int capacity) {
        this.capacity = capacity;
        this.buffer = new LinkedList<>();
    }
    
    void produce(T item) throws InterruptedException {
        lock.lock();
        try {
            while (buffer.size() == capacity) {
                notFull.await(); // wait until space available
            }
            buffer.add(item);
            notEmpty.signal(); // wake up consumer
        } finally {
            lock.unlock();
        }
    }
    
    T consume() throws InterruptedException {
        lock.lock();
        try {
            while (buffer.isEmpty()) {
                notEmpty.await(); // wait until item available
            }
            T item = buffer.poll();
            notFull.signal(); // wake up producer
            return item;
        } finally {
            lock.unlock();
        }
    }
}

// Usage
public class Main {
    public static void main(String[] args) {
        BoundedBuffer<Integer> buffer = new BoundedBuffer<>(10);
        
        // Producer
        new Thread(() -> {
            for (int i = 0; i < 100; i++) {
                try {
                    buffer.produce(i);
                    System.out.println("Produced: " + i);
                } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            }
        }).start();
        
        // Consumer
        new Thread(() -> {
            for (int i = 0; i < 100; i++) {
                try {
                    int val = buffer.consume();
                    System.out.println("Consumed: " + val);
                } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            }
        }).start();
    }
}
```

---

## Round 3: SQL Deep Dive + System Design
**Duration:** 60 minutes | **Interviewer:** Senior Manager

### Questions Asked
1. **Complex SQL Problems** (Oracle-specific)
2. **Design a Database Replication System** (Oracle Data Guard-like)

### 💡 Interview-Ready Answer — SQL Problems

```sql
-- Q1: Find employees who earn more than their manager
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary;

-- Q2: Running total of sales by date (Window function)
SELECT 
    sale_date,
    amount,
    SUM(amount) OVER (ORDER BY sale_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM sales;

-- Q3: Find top 3 salaries per department (without LIMIT per group)
SELECT department_id, name, salary
FROM (
    SELECT department_id, name, salary,
           DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk
    FROM employees
) ranked
WHERE rnk <= 3;

-- Q4: Find gaps in sequential IDs
SELECT prev_id + 1 AS gap_start, id - 1 AS gap_end
FROM (
    SELECT id, LAG(id) OVER (ORDER BY id) AS prev_id
    FROM transactions
) t
WHERE id - prev_id > 1;

-- Q5: Pivot table — monthly sales per product
SELECT product_id,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 1 THEN amount ELSE 0 END) AS jan,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 2 THEN amount ELSE 0 END) AS feb,
    SUM(CASE WHEN EXTRACT(MONTH FROM sale_date) = 3 THEN amount ELSE 0 END) AS mar
FROM sales
WHERE EXTRACT(YEAR FROM sale_date) = 2025
GROUP BY product_id;
```

### 💡 Interview-Ready Answer — Database Replication

```
Oracle Data Guard Concepts:
┌──────────────────────────────────────────────────────────────┐
│  Primary DB                     Standby DB(s)                │
│  (Read/Write)                   (Read-only)                  │
│  ┌──────────┐                   ┌──────────┐                │
│  │ Oracle   │  ──Redo Logs──▶   │ Oracle   │                │
│  │ Instance │     (LGWR)        │ Instance │                │
│  └──────────┘                   └──────────┘                │
│                                                               │
│  Sync Modes:                                                  │
│  1. Maximum Protection: Synchronous redo shipping             │
│     Primary waits for standby ACK before commit              │
│     Zero data loss, but impacts latency                      │
│     If standby unavailable → primary stops accepting writes  │
│                                                               │
│  2. Maximum Availability: Synchronous with fallback          │
│     If standby unavailable → falls back to async             │
│     Zero data loss when both nodes healthy                   │
│                                                               │
│  3. Maximum Performance: Asynchronous (default)              │
│     Primary doesn't wait for standby                         │
│     Minimal impact on primary, slight data loss risk         │
└──────────────────────────────────────────────────────────────┘

Replication Log Application:
┌──────────────────────────────────────────┐
│  Write-Ahead Log (WAL) / Redo Log       │
│                                          │
│  LSN 1001: UPDATE accounts SET          │
│            balance=5000 WHERE id=42     │
│  LSN 1002: INSERT INTO audit_log ...    │
│  LSN 1003: DELETE FROM temp_data ...    │
│                                          │
│  Standby applies logs in LSN order:     │
│  Last applied LSN: 1001                 │
│  -> Apply 1002 -> Apply 1003           │
│                                          │
│  If gap detected (1001 → 1005):         │
│  -> Request missing logs from primary   │
│  -> Archive log backfill                │
└──────────────────────────────────────────┘
```

---

## Round 4: Managerial
**Duration:** 45 minutes

---

## 🎯 Key Takeaways
- Oracle interviews are **Java + SQL heavy** — know JVM internals, GC, and advanced SQL
- **Producer-Consumer with ReentrantLock** (not just BlockingQueue) is expected
- **Window functions** (DENSE_RANK, LAG, SUM OVER) are must-know for Oracle
- **Database replication** (WAL, sync modes, failover) is Oracle's domain
- Know **3 sync modes**: Maximum Protection / Availability / Performance
- **Palindromic Subsequence DP** and **LRU Cache** are Oracle favorites
- Oracle values **correctness and completeness** — partial solutions are rejected

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium-Hard | DP, Heap, SQL |
| Round 2 | Hard | JVM, Multithreading, LRU |
| Round 3 | Hard | Advanced SQL, DB Replication |
| Round 4 | Medium | Behavioral |
