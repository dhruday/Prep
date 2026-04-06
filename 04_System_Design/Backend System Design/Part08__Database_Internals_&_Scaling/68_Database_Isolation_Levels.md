# 68. Database Isolation Levels

---

## 1. High-Level Explanation (Interview-Level Overview)

### What are Database Isolation Levels?

**Isolation levels** define how concurrent transactions interact with each other, controlling what data one transaction can see from other uncommitted or committed transactions.

**Why Isolation Matters**:
```python
# Two users booking the same hotel room simultaneously

# Transaction 1 (User A):
available = db.query("SELECT available FROM rooms WHERE room_id = 101")  # Returns: True
# ... User A confirms booking
db.execute("UPDATE rooms SET available = False WHERE room_id = 101")
db.commit()

# Transaction 2 (User B running concurrently):
available = db.query("SELECT available FROM rooms WHERE room_id = 101")  # Returns: True (saw old value!)
# ... User B also confirms booking
db.execute("UPDATE rooms SET available = False WHERE room_id = 101")
db.commit()

# PROBLEM: Double-booked! Both users saw available=True
# Solution: Higher isolation level to prevent concurrent reads of uncommitted data
```

### Four Isolation Levels (Weakest → Strongest)

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|-------|------------|---------------------|--------------|-------------|
| **Read Uncommitted** | ❌ Possible | ❌ Possible | ❌ Possible | ⚡ Fastest (no locks) |
| **Read Committed** | ✅ Prevented | ❌ Possible | ❌ Possible | ⚡ Fast (default) |
| **Repeatable Read** | ✅ Prevented | ✅ Prevented | ❌ Possible | 🔒 Slower (locks held) |
| **Serializable** | ✅ Prevented | ✅ Prevented | ✅ Prevented | 🔒🔒 Slowest (full isolation) |

**Anomalies Explained**:
- **Dirty Read**: Reading uncommitted changes (rolled back later)
- **Non-Repeatable Read**: Reading same row twice gets different values
- **Phantom Read**: Reading same range twice gets different row counts

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Read Uncommitted (Isolation Level 0)

**Definition**: Transaction can read uncommitted changes from other transactions.

**Example (Dirty Read)**:
```sql
-- Transaction 1 (withdraw $100)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
-- Balance: $1000 → $900 (not committed yet)

-- Transaction 2 (check balance)
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN;
SELECT balance FROM accounts WHERE account_id = 1;
-- Returns: $900 (reads uncommitted change)
COMMIT;

-- Transaction 1 (rollback)
ROLLBACK;  -- Undo withdrawal
-- Balance: Back to $1000

-- PROBLEM: Transaction 2 saw $900, but actual balance is $1000 (dirty read)
```

**When to Use**:
- Analytics/reporting queries where approximate data is acceptable
- No write operations (read-only)
- Performance critical (fastest isolation level)

**Never Use For**:
- Financial transactions
- Inventory management
- Any system requiring accurate data

---

### 2. Read Committed (Isolation Level 1) - DEFAULT

**Definition**: Transaction only reads committed data. Most databases default to this level.

**Prevents**: Dirty reads
**Allows**: Non-repeatable reads, phantom reads

**Example (Non-Repeatable Read)**:
```sql
-- Transaction 1 (read balance twice)
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;

SELECT balance FROM accounts WHERE account_id = 1;
-- Returns: $1000 (first read)

-- Transaction 2 (withdraw $100)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
COMMIT;  -- Committed

-- Transaction 1 (read balance again)
SELECT balance FROM accounts WHERE account_id = 1;
-- Returns: $900 (second read, DIFFERENT value!)

COMMIT;

-- PROBLEM: Same query returned different values ($1000 vs $900)
-- This is a "non-repeatable read"
```

**Why This Matters**:
```python
# Calculating total account balance
def calculate_total_balance(user_id):
    # Read all account balances
    checking = db.query("SELECT balance FROM checking WHERE user_id = %s", user_id)  # $1000
    savings = db.query("SELECT balance FROM savings WHERE user_id = %s", user_id)    # $2000
    
    # Another transaction transfers $100 from checking → savings (committed)
    
    # Read investment balance
    investment = db.query("SELECT balance FROM investment WHERE user_id = %s", user_id)  # $3000
    
    total = checking + savings + investment  # $1000 + $2000 + $3000 = $6000
    
    # PROBLEM: Actual total should be $6000, but we might see:
    # - checking: $900 (after transfer)
    # - savings: $2100 (after transfer)
    # - investment: $3000
    # Total: $6000 (correct by luck, but inconsistent snapshot)

# Solution: Higher isolation level (Repeatable Read or Serializable)
```

**When to Use**:
- Most applications (good balance of consistency and performance)
- Web applications (default for PostgreSQL, MySQL)
- Non-critical reads

---

### 3. Repeatable Read (Isolation Level 2)

**Definition**: Transaction sees a consistent snapshot of data. Re-reading same row returns same value.

**Prevents**: Dirty reads, non-repeatable reads
**Allows**: Phantom reads

**Example (Consistent Reads)**:
```sql
-- Transaction 1 (read balance twice)
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;

SELECT balance FROM accounts WHERE account_id = 1;
-- Returns: $1000 (first read)

-- Transaction 2 (withdraw $100)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
COMMIT;  -- Committed

-- Transaction 1 (read balance again)
SELECT balance FROM accounts WHERE account_id = 1;
-- Returns: $1000 (same value! Consistent snapshot)

COMMIT;
```

**Phantom Read Example** (still possible):
```sql
-- Transaction 1 (count active users twice)
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;

SELECT COUNT(*) FROM users WHERE status = 'active';
-- Returns: 100 (first count)

-- Transaction 2 (insert new active user)
BEGIN;
INSERT INTO users (name, status) VALUES ('Alice', 'active');
COMMIT;

-- Transaction 1 (count again)
SELECT COUNT(*) FROM users WHERE status = 'active';
-- Returns: 101 (DIFFERENT count! Phantom row appeared)

COMMIT;

-- PROBLEM: New rows inserted by other transactions are visible (phantom reads)
```

**Implementation (MVCC - Multi-Version Concurrency Control)**:
```
PostgreSQL uses MVCC for Repeatable Read:

1. Each transaction gets a snapshot ID (start timestamp)
2. Rows have hidden columns: xmin (created by transaction), xmax (deleted by transaction)
3. Transaction only sees rows where:
   - xmin < snapshot_id (created before transaction started)
   - xmax > snapshot_id OR xmax = NULL (not deleted, or deleted after)

Example:
Row: id=1, balance=$1000, xmin=100, xmax=NULL

Transaction A (snapshot_id=105):
- Sees balance=$1000 (xmin=100 < 105, xmax=NULL)

Transaction B (snapshot_id=110, updates balance to $900):
- Creates new version: id=1, balance=$900, xmin=110, xmax=NULL
- Marks old version: id=1, balance=$1000, xmin=100, xmax=110

Transaction A reads again:
- Still sees balance=$1000 (xmax=110 > 105, so old version still visible)

Result: Consistent snapshot (repeatable read)
```

**When to Use**:
- Financial transactions (money transfers)
- Inventory management (prevent overselling)
- Report generation (consistent snapshot)

---

### 4. Serializable (Isolation Level 3) - STRONGEST

**Definition**: Transactions execute as if they ran serially (one after another), even if concurrent.

**Prevents**: Dirty reads, non-repeatable reads, phantom reads

**Example (Prevents Phantom Reads)**:
```sql
-- Transaction 1 (count active users)
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;

SELECT COUNT(*) FROM users WHERE status = 'active';
-- Returns: 100

-- Transaction 2 (insert new active user)
BEGIN;
INSERT INTO users (name, status) VALUES ('Alice', 'active');
-- BLOCKED (waits for Transaction 1 to commit)

-- Transaction 1 (count again)
SELECT COUNT(*) FROM users WHERE status = 'active';
-- Returns: 100 (same count, no phantom)

COMMIT;  -- Transaction 1 finishes

-- Transaction 2 (now proceeds)
COMMIT;  -- Insert succeeds

-- Result: Full isolation (no phantom reads)
```

**Serialization Anomaly** (prevented):
```sql
-- Two transactions updating based on reads (lost update problem)

-- Transaction 1: Transfer $100 from A to B
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
balance_A = SELECT balance FROM accounts WHERE account_id = 'A';  -- $1000
balance_B = SELECT balance FROM accounts WHERE account_id = 'B';  -- $2000

-- Transaction 2: Transfer $100 from B to A (concurrent)
BEGIN;
balance_B = SELECT balance FROM accounts WHERE account_id = 'B';  -- $2000
balance_A = SELECT balance FROM accounts WHERE account_id = 'A';  -- $1000

-- Transaction 1 (update)
UPDATE accounts SET balance = balance_A - 100 WHERE account_id = 'A';  -- $900
UPDATE accounts SET balance = balance_B + 100 WHERE account_id = 'B';  -- $2100
COMMIT;

-- Transaction 2 (update)
UPDATE accounts SET balance = balance_B - 100 WHERE account_id = 'B';  -- $2100 - 100 = $2000
UPDATE accounts SET balance = balance_A + 100 WHERE account_id = 'A';  -- $900 + 100 = $1000

-- At Repeatable Read: Both commit successfully
-- Result: A=$1000, B=$2000 (as if no transfers happened! Both $100 transfers lost)

-- At Serializable: Database detects conflict
ERROR: could not serialize access due to read/write dependencies
ROLLBACK;  -- Transaction 2 aborted

-- Result: Only Transaction 1 succeeds (A=$900, B=$2100), must retry Transaction 2
```

**When to Use**:
- Critical financial operations (banking, payments)
- Strong consistency required
- Risk of write conflicts is low (few concurrent updates)

**Trade-offs**:
- Slower (locks held longer)
- More transaction failures (serialization errors, must retry)
- Lower throughput (fewer concurrent transactions)

---

## 3. Capacity Planning & Estimation (When Applicable)

### Isolation Level Impact on Performance

**Throughput Comparison** (1000 transactions/sec):

```
Read Uncommitted:  1000 TPS (baseline, no locks)
Read Committed:     900 TPS (10% overhead, default)
Repeatable Read:    600 TPS (40% overhead, snapshot locks)
Serializable:       300 TPS (70% overhead, full locks)

Note: Actual overhead depends on workload (read-heavy vs write-heavy)
```

**Contention Example**:
```
Scenario: 100 concurrent transactions updating same row

Read Committed:
- Each transaction locks row briefly during UPDATE
- Lock duration: 1ms per transaction
- Total time: 1ms × 100 = 100ms (sequential execution)
- Throughput: 1000 TPS

Serializable:
- Each transaction holds locks from first SELECT to final COMMIT
- Lock duration: 50ms per transaction (includes business logic)
- Total time: 50ms × 100 = 5000ms (5 seconds, sequential execution)
- Throughput: 200 TPS

Result: Serializable is 5x slower for high-contention workloads
```

**Deadlock Probability**:
```
Read Committed: 1-2% of transactions (low, short lock duration)
Serializable: 5-10% of transactions (high, long lock duration)

Must implement retry logic:
MAX_RETRIES = 3
for attempt in range(MAX_RETRIES):
    try:
        execute_transaction()
        break
    except SerializationError:
        if attempt == MAX_RETRIES - 1:
            raise
        time.sleep(random.uniform(0.1, 0.5))  # Exponential backoff
```

---

## 4. Data & Storage Design

### Choosing Isolation Level per Use Case

**Read Uncommitted**:
```sql
-- Analytics dashboard (approximate counts acceptable)
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT COUNT(*) FROM orders WHERE status = 'completed';
-- Fast, approximate (may include uncommitted orders)
```

**Read Committed** (default):
```sql
-- Web application (most queries)
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT * FROM products WHERE category = 'electronics';
-- Sees only committed products (no dirty reads)
```

**Repeatable Read**:
```sql
-- Money transfer (consistent snapshot)
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
balance_A = SELECT balance FROM accounts WHERE account_id = 'A';
balance_B = SELECT balance FROM accounts WHERE account_id = 'B';
UPDATE accounts SET balance = balance_A - 100 WHERE account_id = 'A';
UPDATE accounts SET balance = balance_B + 100 WHERE account_id = 'B';
COMMIT;
-- Ensures balances don't change between reads and updates
```

**Serializable**:
```sql
-- Payment processing (no lost updates)
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
inventory = SELECT stock FROM products WHERE product_id = 123;
IF inventory > 0:
    INSERT INTO orders (product_id, quantity) VALUES (123, 1);
    UPDATE products SET stock = stock - 1 WHERE product_id = 123;
COMMIT;
-- Prevents overselling (two orders for last item)
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Handling Serialization Errors (Retry Logic)

**PostgreSQL Serialization Error**:
```python
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_SERIALIZABLE

def transfer_money(from_account, to_account, amount, max_retries=3):
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(...)
            conn.set_isolation_level(ISOLATION_LEVEL_SERIALIZABLE)
            cursor = conn.cursor()
            
            # Check balance
            cursor.execute("SELECT balance FROM accounts WHERE account_id = %s", (from_account,))
            balance = cursor.fetchone()[0]
            
            if balance < amount:
                raise InsufficientFunds("Not enough money")
            
            # Transfer
            cursor.execute("UPDATE accounts SET balance = balance - %s WHERE account_id = %s", (amount, from_account))
            cursor.execute("UPDATE accounts SET balance = balance + %s WHERE account_id = %s", (amount, to_account))
            
            conn.commit()
            return True  # Success
            
        except psycopg2.extensions.TransactionRollbackError:
            # Serialization failure, retry
            conn.rollback()
            if attempt == max_retries - 1:
                raise  # Max retries exceeded
            time.sleep(random.uniform(0.1, 0.5) * (2 ** attempt))  # Exponential backoff
            
        finally:
            conn.close()
    
    return False
```

**MySQL (InnoDB)**:
```python
import mysql.connector

def book_room(room_id, user_id, max_retries=3):
    for attempt in range(max_retries):
        try:
            conn = mysql.connector.connect(...)
            cursor = conn.cursor()
            
            # Set isolation level
            cursor.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
            cursor.execute("START TRANSACTION")
            
            # Check availability
            cursor.execute("SELECT available FROM rooms WHERE room_id = %s FOR UPDATE", (room_id,))
            available = cursor.fetchone()[0]
            
            if not available:
                conn.rollback()
                raise RoomNotAvailable("Room already booked")
            
            # Book room
            cursor.execute("UPDATE rooms SET available = 0 WHERE room_id = %s", (room_id,))
            cursor.execute("INSERT INTO bookings (room_id, user_id) VALUES (%s, %s)", (room_id, user_id))
            
            conn.commit()
            return True
            
        except mysql.connector.errors.OperationalError as e:
            # Deadlock or lock timeout
            conn.rollback()
            if attempt == max_retries - 1:
                raise
            time.sleep(random.uniform(0.1, 0.5))
            
        finally:
            conn.close()
    
    return False
```

---

## 6. Security, APIs & Governance

### Preventing Lost Updates with SELECT FOR UPDATE

**Problem: Lost Update**:
```sql
-- Transaction 1: Increment counter
BEGIN;
counter = SELECT count FROM stats WHERE stat_id = 1;  -- Returns: 100
-- counter = 100 + 1 = 101
UPDATE stats SET count = 101 WHERE stat_id = 1;
COMMIT;

-- Transaction 2: Increment counter (concurrent)
BEGIN;
counter = SELECT count FROM stats WHERE stat_id = 1;  -- Returns: 100 (before Transaction 1 commits)
-- counter = 100 + 1 = 101
UPDATE stats SET count = 101 WHERE stat_id = 1;
COMMIT;

-- PROBLEM: Both transactions read 100, both write 101
-- Expected: 102 (two increments)
-- Actual: 101 (one increment lost!)
```

**Solution: SELECT FOR UPDATE** (pessimistic locking):
```sql
-- Transaction 1: Increment counter (with lock)
BEGIN;
counter = SELECT count FROM stats WHERE stat_id = 1 FOR UPDATE;  -- Returns: 100, LOCKS row
-- counter = 100 + 1 = 101
UPDATE stats SET count = 101 WHERE stat_id = 1;
COMMIT;  -- Releases lock

-- Transaction 2: Increment counter (blocked until Transaction 1 commits)
BEGIN;
counter = SELECT count FROM stats WHERE stat_id = 1 FOR UPDATE;  -- WAITS for lock
-- After Transaction 1 commits, reads: 101
-- counter = 101 + 1 = 102
UPDATE stats SET count = 102 WHERE stat_id = 1;
COMMIT;

-- Result: 102 (both increments applied correctly)
```

**Alternative: Optimistic Locking** (version column):
```sql
-- Table with version column
CREATE TABLE stats (
    stat_id INT PRIMARY KEY,
    count INT,
    version INT DEFAULT 0
);

-- Transaction 1: Increment with version check
BEGIN;
row = SELECT count, version FROM stats WHERE stat_id = 1;  -- count=100, version=5
new_count = row.count + 1  -- 101
UPDATE stats SET count = 101, version = 6 WHERE stat_id = 1 AND version = 5;
-- Returns: 1 row updated (success)
COMMIT;

-- Transaction 2: Increment (concurrent)
BEGIN;
row = SELECT count, version FROM stats WHERE stat_id = 1;  -- count=100, version=5
new_count = row.count + 1  -- 101
UPDATE stats SET count = 101, version = 6 WHERE stat_id = 1 AND version = 5;
-- Returns: 0 rows updated (version changed to 6, conflict detected!)
ROLLBACK;
-- Retry transaction

-- Result: Transaction 2 detects conflict and retries (no lost update)
```

---

## 7. Real-World Examples & Case Studies

### Stripe: Serializable for Payment Processing

**Problem**: Prevent duplicate charges from retry requests.

**Solution**: Use idempotency keys with Serializable isolation.

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;

-- Check if charge already processed
SELECT charge_id FROM charges WHERE idempotency_key = 'req_abc123';

IF found:
    RETURN existing_charge_id;  -- Idempotent (return same result)

-- Process new charge
INSERT INTO charges (customer_id, amount, idempotency_key, status)
VALUES (123, 1000, 'req_abc123', 'pending');

-- Call payment gateway API
charge_id = payment_gateway.charge(customer_id, amount);

-- Update charge status
UPDATE charges SET status = 'succeeded', external_charge_id = charge_id
WHERE idempotency_key = 'req_abc123';

COMMIT;
```

**Result**: If client retries request (network timeout), second transaction sees existing charge and returns same result. No duplicate charges.

---

### Amazon: Read Committed for Product Catalog

**Use Case**: Product listings don't require strong consistency.

**Implementation**:
```sql
-- Default isolation level (Read Committed)
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Query product catalog
SELECT product_id, name, price, stock
FROM products
WHERE category = 'electronics'
  AND stock > 0
ORDER BY popularity DESC
LIMIT 20;

-- If stock changes during query, no problem:
-- - User sees latest committed stock
-- - Non-repeatable read acceptable (refresh page to see updates)
```

**Why Not Serializable**:
- Product catalog: High read volume (1M QPS)
- Weak consistency acceptable (stale stock for 1-2 seconds OK)
- Serializable would reduce throughput by 70% (300K QPS)
- Cost: $10K/month extra servers vs $0 (Read Committed sufficient)

---

### Uber: Repeatable Read for Trip Fare Calculation

**Problem**: Calculate fare based on distance, time, surge pricing. Ensure consistent snapshot.

**Implementation**:
```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;

-- Read trip details
trip = SELECT * FROM trips WHERE trip_id = 12345;
-- distance=10 km, duration=20 min

-- Read pricing rules (consistent snapshot)
base_fare = SELECT amount FROM pricing WHERE type = 'base';  -- $5
per_km = SELECT amount FROM pricing WHERE type = 'per_km';  -- $2/km
per_min = SELECT amount FROM pricing WHERE type = 'per_min';  -- $0.5/min
surge = SELECT multiplier FROM surge_pricing WHERE zone = trip.start_zone;  -- 1.5x

-- Calculate fare
fare = (base_fare + per_km * distance + per_min * duration) * surge
     = ($5 + $2*10 + $0.5*20) * 1.5
     = $52.50

-- Store fare
UPDATE trips SET fare = 52.50 WHERE trip_id = 12345;

COMMIT;
```

**Why Repeatable Read**:
- Consistent snapshot: Pricing rules don't change mid-calculation
- If another transaction updates surge pricing during calculation, we still use old value (consistent)
- Prevents: Calculating with base_fare=old, surge=new (mixed snapshot)

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Explain database isolation levels and when to use each."

**Structured Answer**:

**"Isolation levels control how concurrent transactions interact. There are four levels: Read Uncommitted (weakest), Read Committed (default), Repeatable Read, and Serializable (strongest)."**

**Four Levels**:

**1. Read Uncommitted** (dirty reads allowed):
- Transaction reads uncommitted changes from other transactions
- Problem: If other transaction rolls back, you saw data that never existed
- Use case: Analytics where approximate data is acceptable
- Never use for: Financial transactions, inventory

**2. Read Committed** (default, most databases):
- Transaction only reads committed data
- Problem: Reading same row twice can return different values (non-repeatable read)
- Use case: Most web applications, product catalogs
- Trade-off: Good balance of consistency and performance

**3. Repeatable Read** (consistent snapshot):
- Transaction sees consistent snapshot from start time
- Re-reading same row returns same value
- Problem: New rows inserted by other transactions visible (phantom reads)
- Use case: Money transfers, inventory updates, reports
- Trade-off: Slower than Read Committed, prevents lost updates

**4. Serializable** (full isolation):
- Transactions execute as if serial (one after another)
- Prevents all anomalies (dirty reads, non-repeatable reads, phantoms)
- Use case: Critical financial operations, payment processing
- Trade-off: Slowest (70% overhead), most transaction failures (must retry)

**Real-world example: At Stripe, we use Serializable isolation for payment processing with idempotency keys to prevent duplicate charges. Ensures exactly-once semantics even with client retries."**

---

### Follow-Up 1: "What's the difference between pessimistic and optimistic locking?"

**Answer**:

**"Pessimistic locking assumes conflicts will happen, so it locks rows upfront. Optimistic locking assumes conflicts are rare, so it checks for conflicts at commit time."**

**Pessimistic Locking** (SELECT FOR UPDATE):
```sql
BEGIN;
-- Lock row immediately (blocks other transactions)
SELECT balance FROM accounts WHERE account_id = 1 FOR UPDATE;
-- Other transactions wait here until we commit
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
COMMIT;  -- Release lock

-- Pros: Guaranteed no conflicts (other transactions blocked)
-- Cons: Reduces concurrency (other transactions wait), can cause deadlocks
```

**Optimistic Locking** (version column):
```sql
-- Read without locking
SELECT balance, version FROM accounts WHERE account_id = 1;
-- balance=1000, version=5

-- Update with version check
UPDATE accounts SET balance = 900, version = 6
WHERE account_id = 1 AND version = 5;

-- If another transaction updated first (version changed to 6):
-- Returns: 0 rows updated (conflict detected)
-- Action: Retry transaction

-- Pros: Higher concurrency (no locks held), better for read-heavy workloads
-- Cons: Must handle retries, wasted work if conflict occurs
```

**When to Use**:
```
Pessimistic: High contention (many concurrent updates to same row)
- Example: Booking last hotel room, decrementing limited inventory

Optimistic: Low contention (few concurrent updates)
- Example: Updating user profile, editing blog posts

Rule: If conflict rate > 10%, use pessimistic. If < 10%, use optimistic.
```

**Real-world: At Airbnb, booking last available room uses pessimistic locking (SELECT FOR UPDATE) to prevent double-booking. Updating user preferences uses optimistic locking (version column) for higher concurrency."**

---

### Follow-Up 2: "How do you handle deadlocks?"

**Answer**:

**"Deadlocks occur when two transactions wait for each other's locks. Databases detect and abort one transaction. Application must retry."**

**Deadlock Example**:
```sql
-- Transaction 1:
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE account_id = 'A';  -- Locks A
-- ... processing ...
UPDATE accounts SET balance = balance + 100 WHERE account_id = 'B';  -- Waits for B

-- Transaction 2 (concurrent):
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE account_id = 'B';   -- Locks B
-- ... processing ...
UPDATE accounts SET balance = balance + 50 WHERE account_id = 'A';   -- Waits for A

-- DEADLOCK:
-- Transaction 1 holds A, waits for B
-- Transaction 2 holds B, waits for A
-- Neither can proceed

-- Database detects cycle, aborts Transaction 2:
ERROR: deadlock detected
DETAIL: Process 1234 waits for ShareLock on transaction 5678
ROLLBACK;
```

**Prevention Strategies**:

**1. Consistent Lock Order** (acquire locks in same order):
```sql
-- Bad: Inconsistent order (causes deadlock)
-- Transaction 1: Lock A → Lock B
-- Transaction 2: Lock B → Lock A

-- Good: Consistent order (prevents deadlock)
-- Both transactions: Lock A → Lock B (alphabetical order by account ID)

def transfer(from_account, to_account, amount):
    # Always lock accounts in sorted order
    accounts = sorted([from_account, to_account])
    
    BEGIN;
    UPDATE accounts SET balance = balance - amount WHERE account_id = accounts[0] FOR UPDATE;
    UPDATE accounts SET balance = balance + amount WHERE account_id = accounts[1] FOR UPDATE;
    COMMIT;
```

**2. Timeout and Retry**:
```python
MAX_RETRIES = 3
for attempt in range(MAX_RETRIES):
    try:
        execute_transaction()
        break  # Success
    except DeadlockError:
        if attempt == MAX_RETRIES - 1:
            raise  # Max retries exceeded
        time.sleep(random.uniform(0.1, 0.5) * (2 ** attempt))  # Exponential backoff
```

**3. Reduce Lock Hold Time**:
```sql
-- Bad: Hold locks during slow external API call
BEGIN;
UPDATE inventory SET stock = stock - 1 WHERE product_id = 123 FOR UPDATE;
charge_payment(customer_id, amount);  -- 500ms external API call (holding locks)
COMMIT;

-- Good: Release locks before external call
BEGIN;
-- Check inventory
available = SELECT stock FROM inventory WHERE product_id = 123 FOR UPDATE;
IF available > 0:
    UPDATE inventory SET stock = stock - 1 WHERE product_id = 123;
    reservation_id = INSERT INTO reservations (...);
COMMIT;  -- Release locks

-- Call external API (no locks held)
charge_payment(customer_id, amount);

-- Mark reservation as paid
UPDATE reservations SET status = 'paid' WHERE reservation_id = reservation_id;
```

**Real-world: At Uber, we reduced deadlock rate from 5% to 0.1% by enforcing consistent lock order (always lock driver → rider, sorted by ID). Saves 500K retries per day."**

---

### Follow-Up 3: "What's MVCC and how does it improve concurrency?"

**Answer**:

**"MVCC (Multi-Version Concurrency Control) allows readers and writers to not block each other by maintaining multiple versions of each row. Readers see old versions, writers create new versions."**

**Traditional Locking** (readers block writers):
```sql
-- Transaction 1 (read)
BEGIN;
SELECT balance FROM accounts WHERE account_id = 1;  -- Acquires shared lock
-- ... processing 5 seconds ...
COMMIT;  -- Releases lock

-- Transaction 2 (write, waits for Transaction 1)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;  -- Blocked (waiting for shared lock release)
COMMIT;

-- Result: Write waits 5 seconds for read to complete
```

**MVCC** (readers don't block writers):
```sql
-- Transaction 1 (read)
BEGIN;  -- snapshot_id = 100
SELECT balance FROM accounts WHERE account_id = 1;  -- Reads version with xmin < 100
-- ... processing 5 seconds ...
COMMIT;

-- Transaction 2 (write, concurrent, doesn't wait)
BEGIN;  -- snapshot_id = 105
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
-- Creates new version: balance=$900, xmin=105
-- Old version: balance=$1000, xmin=90, xmax=105 (marked as deleted at 105)
COMMIT;

-- Transaction 1 (continues reading old version)
SELECT balance FROM accounts WHERE account_id = 1;  -- Still reads $1000 (xmax=105 > 100, so old version visible)

-- Result: No blocking, both transactions proceed concurrently
```

**How MVCC Works** (PostgreSQL):
```
Each row has hidden columns:
- xmin: Transaction ID that created this row version
- xmax: Transaction ID that deleted this row version (NULL if current)

Transaction visibility rules:
1. xmin must be committed and < snapshot_id (row created before transaction started)
2. xmax must be NULL or uncommitted or > snapshot_id (row not deleted yet)

Example:
Initial: id=1, balance=$1000, xmin=90, xmax=NULL

Transaction A (snapshot_id=100, read):
- Sees balance=$1000 (xmin=90 < 100, xmax=NULL)

Transaction B (snapshot_id=105, update to $900):
- Creates new version: id=1, balance=$900, xmin=105, xmax=NULL
- Updates old version: id=1, balance=$1000, xmin=90, xmax=105

Transaction A (reads again):
- Still sees balance=$1000 (xmax=105 > 100, so old version still valid for this snapshot)

Transaction C (snapshot_id=110, new read):
- Sees balance=$900 (xmin=105 < 110, xmax=NULL)

Vacuum: Periodically removes old versions no longer visible to any transaction
```

**Benefits**:
- **No read-write blocking**: Readers see old versions, writers create new versions
- **Consistent snapshots**: Repeatable Read guaranteed without locking
- **High concurrency**: 10x more throughput than lock-based systems

**Drawbacks**:
- **Storage overhead**: Multiple versions consume disk space (mitigated by VACUUM)
- **Write amplification**: Updates create new row versions (not in-place)

**Real-world: PostgreSQL uses MVCC for all isolation levels. At scale (1M QPS), MVCC enables 10x more concurrent reads than lock-based databases. Enables Repeatable Read by default without sacrificing performance."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Isolation Level Decision Tree

```
┌────────────────────────────────────────────────────────────┐
│         ISOLATION LEVEL SELECTION FLOWCHART                │
└────────────────────────────────────────────────────────────┘

              Choose Isolation Level
                       │
          ┌────────────┴────────────┐
          │                         │
    Read-only query?           Write operation?
          │                         │
          Yes                       ↓
          │                   Financial transaction?
          ↓                    (payment, transfer)
   Approximate data OK?               │
   ┌──────┴──────┐             ┌─────┴─────┐
  Yes           No             Yes         No
   │             │              │           │
   ↓             ↓              ↓           ↓
Read         Read          Serializable  Repeatable
Uncommitted  Committed        (retry      Read
(analytics)  (default)      logic req)  (inventory)


ANOMALIES PREVENTION MATRIX:
═══════════════════════════════════════════════════════════

                        Dirty   Non-Repeat  Phantom
                        Read      Read       Read
─────────────────────────────────────────────────────────
Read Uncommitted        ❌        ❌         ❌
Read Committed          ✅        ❌         ❌
Repeatable Read         ✅        ✅         ❌
Serializable            ✅        ✅         ✅

Performance (relative throughput):
Read Uncommitted:  1000 TPS  ⚡⚡⚡⚡⚡ Fastest
Read Committed:     900 TPS  ⚡⚡⚡⚡  Fast (default)
Repeatable Read:    600 TPS  ⚡⚡⚡   Slower
Serializable:       300 TPS  ⚡⚡    Slowest


COMMON ANOMALIES:
═══════════════════════════════════════════════════════════

1. DIRTY READ (uncommitted data):
   T1: UPDATE balance = 900 (uncommitted)
   T2: SELECT balance → 900
   T1: ROLLBACK (balance back to 1000)
   Problem: T2 saw data that never existed

2. NON-REPEATABLE READ (value changed):
   T1: SELECT balance → 1000
   T2: UPDATE balance = 900, COMMIT
   T1: SELECT balance → 900 (different!)
   Problem: Same query, different result

3. PHANTOM READ (row count changed):
   T1: SELECT COUNT(*) → 100
   T2: INSERT new row, COMMIT
   T1: SELECT COUNT(*) → 101 (phantom row appeared)
   Problem: Range query returns different row counts

4. LOST UPDATE (concurrent writes):
   T1: SELECT counter = 100
   T2: SELECT counter = 100
   T1: UPDATE counter = 101, COMMIT
   T2: UPDATE counter = 101, COMMIT (overwrites T1's update)
   Problem: Counter should be 102, but is 101


MVCC (Multi-Version Concurrency Control):
═══════════════════════════════════════════════════════════

Timeline:
─────────────────────────────────────────────────────────→
t=100           t=105               t=110

Transaction A   Transaction B       Transaction C
(snapshot=100)  (snapshot=105)      (snapshot=110)
    │               │                   │
    │ SELECT        │ UPDATE            │ SELECT
    │ balance       │ balance           │ balance
    │ → $1000       │ = $900            │ → $900
    │               │ (creates          │ (sees new
    │               │  new version)     │  version)
    │               │                   │
    │ SELECT        │ COMMIT            │
    │ balance       │                   │
    │ → $1000       │                   │
    │ (still sees   │                   │
    │  old version) │                   │
    └───────────────┴───────────────────┘

Row versions in storage:
Version 1: balance=$1000, xmin=90, xmax=105
Version 2: balance=$900, xmin=105, xmax=NULL

Visibility:
- Transaction A (snapshot=100): Sees Version 1 (xmin=90<100, xmax=105>100)
- Transaction B (snapshot=105): Sees Version 2 (xmin=105<=105, xmax=NULL)
- Transaction C (snapshot=110): Sees Version 2 (xmin=105<110, xmax=NULL)
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Isolation Levels Matter

**Wrong Isolation Level Consequences**:
- Too weak (Read Uncommitted): Dirty reads, incorrect calculations, data integrity issues
- Too strong (Serializable): Slow performance, high deadlock rate, poor scalability
- Just right (Read Committed/Repeatable Read): Balance consistency and performance

**Real-World Impact**:
- **Stripe**: Serializable isolation prevents duplicate charges ($1B+ payments/year)
- **Uber**: Repeatable Read for fare calculation (consistent snapshot)
- **Amazon**: Read Committed for product catalog (high throughput, eventual consistency OK)

### Key Principles

**1. Start with Read Committed** (default for most databases):
- Good balance of consistency and performance
- Prevents dirty reads
- Sufficient for 90% of applications

**2. Use Repeatable Read for**:
- Financial transactions (money transfers, payments)
- Inventory management (prevent overselling)
- Reports (consistent snapshot)

**3. Use Serializable for**:
- Critical operations (no tolerance for anomalies)
- Complex invariants (multiple table updates)
- Low write volume (< 100 TPS)

**4. Always Implement Retry Logic**:
- Deadlocks happen (1-10% of transactions at Serializable)
- Exponential backoff (0.1s, 0.2s, 0.4s delays)
- Max retries (3-5 attempts)

### Production Checklist

- [ ] **Choose isolation level per use case**: Read Committed default, Repeatable Read for money, Serializable for critical ops
- [ ] **Implement retry logic**: Handle deadlocks and serialization errors
- [ ] **Use SELECT FOR UPDATE**: Prevent lost updates (pessimistic locking)
- [ ] **Enforce consistent lock order**: Reduce deadlocks (sort by ID)
- [ ] **Monitor deadlock rate**: Alert if > 5%, optimize lock order
- [ ] **Reduce lock hold time**: Don't hold locks during external API calls
- [ ] **Use optimistic locking for low contention**: Version column, check at commit
- [ ] **Test concurrent scenarios**: Simulate race conditions in staging
- [ ] **Understand MVCC**: Leverage non-blocking reads (PostgreSQL, MySQL InnoDB)
- [ ] **Set timeouts**: `lock_timeout`, `statement_timeout` to prevent indefinite waits

### Bottom Line

**Isolation levels are critical for data consistency. Default (Read Committed) sufficient for most apps, but financial transactions need Repeatable Read or Serializable. Trade-off: Stronger isolation = slower performance + more deadlocks. For FAANG interviews: Explain four levels, anomalies prevented, when to use each, and always mention retry logic for Serializable. Real-world example from Stripe: Serializable isolation with idempotency keys prevents duplicate charges even with client retries. Rule: Choose weakest isolation level that maintains correctness (don't over-isolate).**

