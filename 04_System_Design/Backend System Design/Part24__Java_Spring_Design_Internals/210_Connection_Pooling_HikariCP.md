# 210. Connection Pooling (HikariCP)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Connection pooling** is a technique of maintaining a set of pre-established database connections that are reused by incoming requests, rather than creating and destroying a new TCP connection for every query.

**What it is:**
- A pool of idle database connections ready to be handed out to request threads
- Each connection is a persistent TCP + auth session to the database server
- HikariCP is the default, fastest, and most production-grade connection pool in Spring Boot since 2.0

**Why it exists:**
- Creating a new DB connection is expensive: TCP handshake + TLS negotiation + DB auth = 5–20ms
- At 1,000 QPS each requiring a connection, without pooling: 20ms × 1,000 = 20 seconds wasted just in connection setup
- With pooling: connections are reused, setup cost is paid once at startup

**Role in large-scale systems:**
- Connection pool size is the primary lever for database throughput
- Pool exhaustion → all threads blocked waiting for a connection → timeout → 503s
- HikariCP metrics (pool size, wait time, acquisition timeout) are critical for observability
- Pool sizing must match DB server limits and thread pool configuration

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### How HikariCP Works Internally

HikariCP uses a **lock-free concurrent bag** (`ConcurrentBag`) — its core data structure for storing connections.

```
Pool (ConcurrentBag of PoolEntry objects)
  ├── In-Use connections (borrowed by threads)
  ├── Idle connections (available for borrowing)
  └── Dead/evicted connections (being closed)

Borrowing a connection:
  1. Thread checks thread-local list first (fast path, no lock)
  2. If empty, checks shared idle list (CAS-based, no mutex)
  3. If empty and pool is not at max, create new connection (add to pool)
  4. If pool is at max → block up to connectionTimeout ms
  5. If timeout → throw SQLTimeoutException
```

Key why it's fast:
- Lock-free data structure (compare-and-swap)
- Connections are stored per-thread in borrower-local lists — common case (same thread reuses) has zero contention

---

### Essential HikariCP Configuration

```yaml
spring:
  datasource:
    url: jdbc:postgresql://db:5432/mydb
    username: app_user
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20      # Max total connections to DB
      minimum-idle: 5            # Min idle connections maintained
      connection-timeout: 30000  # ms to wait for connection (30s) → throws if exceeded
      idle-timeout: 600000       # ms idle connection kept before closing (10 min)
      max-lifetime: 1800000      # ms connection maximum lifetime (30 min) → recycle
      keepalive-time: 60000      # ms between keepalive pings (1 min) → prevents firewall drops
      pool-name: "order-service-pool"
      leak-detection-threshold: 5000  # Log warning if connection held > 5s (debug leaks)
```

---

### Pool Sizing Formula (The Most Important Topic)

**Pgbouncer & HikariCP recommendation by Hikari author (Brett Wooldridge):**

```
pool_size = (N_CPU × 2) + effective_spindle_count
```

For typical SSD-based systems: `effective_spindle_count ≈ 1`

**Example:** 8-core server with SSD → `pool_size = 8 × 2 + 1 = 17` (round to 20)

**Why surprisingly small?**
- More connections than the DB server can process in parallel cause context-switch overhead on the DB server
- A PostgreSQL server with 300 connections at once is SLOWER than with 20 connections, because PostgreSQL creates one OS process per connection and the OS spends all its time context-switching
- More connections means more connections competing for the same DB CPU cores

**Formula for distributed systems:**
```
pool_size_per_instance = max_db_connections / number_of_app_instances
Example: PostgreSQL max 200 connections, 10 app instances → 200 / 10 = 20 per instance
```

---

### Relationship Between Thread Pool and Connection Pool

```
Thread pool size = 50 (service handles 50 concurrent requests)
Connection pool = 20

What happens?
→ Up to 20 requests have DB connections immediately
→ 30 remaining threads wait in connection queue
→ connectionTimeout governs how long they wait
→ If average DB query is 10ms: 20 threads × 100 QPS = 2,000 queries/sec capacity

If connection pool is larger than DB can handle, increase → DB becomes bottleneck
If thread pool >> connection pool → threads spend time waiting for connections
```

**Rule:** Thread pool size should be ≥ connection pool size to avoid having idle connections (paid-for resource going unused), but not wildly larger (avoids excessive queue time).

---

### Connection Lifetime and Recycling

```
max-lifetime: 1800000 (30 min)
```

Why connections should be recycled:
- Network middleboxes (NAT gateways, firewalls, load balancers) silently drop TCP connections that are idle too long
- DB server may have per-connection memory and resource limits that accumulate over time
- HikariCP proactively closes connections after `max-lifetime` and creates fresh ones

```
keepalive-time: 60000
```
Why: Prevents idle connections from being silently killed by firewalls during quiet periods.

---

### Connection Validation

HikariCP validates connections before handing them to threads. Two methods:

```yaml
# Method 1: connectionTestQuery (older, less efficient)
connection-test-query: SELECT 1

# Method 2: JDBC4 isValid() method (default, preferred)
# No config needed — HikariCP uses it automatically for JDBC4 drivers
```

A stale connection (TCP broken, DB server restarted) is detected by: acquiring the connection → attempting `isValid()` → if fails → evict connection, create replacement.

---

### Pool Exhaustion: Causes, Diagnosis, and Fixes

**Symptoms:**
```
HikariPool-1 - Connection is not available, request timed out after 30000ms
```

**Common causes:**
| Cause | Fix |
|---|---|
| `maximumPoolSize` too small | Increase pool size (test DB server limits first) |
| Long-running transactions hold connection | Shorten transaction scope; no I/O inside transactions |
| Connection leak (borrow but never return) | Set `leak-detection-threshold`; use `try-with-resources` |
| DB server at max connections | Increase DB `max_connections`; use PgBouncer for pooling at DB side |
| Burst traffic | Increase pool size temporarily; or use queuing at service level |

**Diagnosis with Micrometer + Prometheus:**
```java
// HikariCP exposes metrics automatically when Micrometer is on classpath
// metrics:
// hikaricp_connections_active     — in-use connections
// hikaricp_connections_idle       — available connections
// hikaricp_connections_pending    — threads waiting for a connection
// hikaricp_connections_timeout    — connection acquisition timeout count (alert on this!)
// hikaricp_connections_acquire    — time to acquire a connection (p99 should be < 10ms)
```

---

### PgBouncer vs HikariCP

For large-scale deployments (hundreds of app instances), even per-instance pools of 20 connections can exceed PostgreSQL's max connection limit:

```
100 app instances × 20 connections = 2,000 connections to PostgreSQL
PostgreSQL default max_connections = 100 — would need to raise to 2,000+
```

**Solution: PgBouncer (Server-side connection pooler)**
```
App instances → PgBouncer → PostgreSQL
100 instances × 20 = 2,000 frontend connections
PgBouncer: 20 backend connections to PostgreSQL
PgBouncer multiplexes 2,000 → 20

Benefits: PostgreSQL sees a small, manageable connection count
Trade-off: Slightly more complex infrastructure, transaction-mode pooling loses session state
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

**Service capacity model:**
```
Database throughput: 10,000 queries/sec
Average query time: 5ms
Connections needed: 10,000 × 0.005s = 50 connections (at full load)
Add 20% buffer: 60 connections

With 5 app instances: 60 / 5 = 12 connections per instance
Configure: maximum-pool-size: 15 (with buffer)
```

**Limit check:**
```
PostgreSQL max_connections: 200
5 instances × 15 = 75 connections < 200 ✅
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

- Each connection is a stateful session to one specific database
- Multi-datasource apps (primary DB + read replica) need two separate HikariCP pools
- Spring `@Transactional(readOnly = true)` can route to read replica using `AbstractRoutingDataSource`

```java
public class RoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
            ? "READ_REPLICA"
            : "PRIMARY";
    }
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- **Pool exhaustion is a hard failure:** Threads that timeout waiting for a connection throw exceptions — these appear as 500/503 errors to clients
- **Circuit breaker + connection pool:** If DB is down, pool will quickly drain as all connections fail. Circuit breaker should detect DB unavailability and fail fast before pool is exhausted.
- **Graceful degradation:** On pool exhaustion, consider serving cached/stale data as fallback rather than returning errors for all requests
- **Connection leak detection:** `leak-detection-threshold: 5000` — HikariCP logs a warning when a connection is held > 5s, indicating a code path that borrows but doesn't return (e.g., exception path missing `finally` or `try-with-resources`)

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- Never log or expose DB connection strings, pool credentials, or connection internals in API responses
- Use environment variables or Vault for `spring.datasource.password` — never in `application.properties` committed to source control
- Minimum-privilege DB user: connection pool user should have only the permissions the application needs (SELECT, INSERT, UPDATE — NOT DROP, CREATE, ALTER)
- `max-lifetime` should be less than any credential rotation interval to ensure recycled connections use fresh credentials

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Discourse (Stack Overflow Tech)
- Originally configured PostgreSQL `max_connections = 500` to handle high traffic
- With many app instances, all connections saturated the DB server
- Migrated to PgBouncer with transaction-mode pooling: reduced PostgreSQL connections from 500 to 25
- Result: DB CPU dropped significantly; query throughput increased due to reduced context switching

### HikariCP Default in Spring Boot
- Spring Boot 2.0 switched default from Tomcat JDBC Pool to HikariCP in 2018
- HikariCP benchmarks show 2–10x faster connection acquisition than competitors (Tomcat pool, C3P0, DBCP2)
- Pool "warmup" on startup (`minimum-idle`) prevents cold-start latency spike on first requests

### Connection Leak in Payment Service
- A bug: exception was thrown between `connection.borrow()` and the finally block in legacy JDBC code
- Result: connections were borrowed but never returned → pool drained over time → service degraded ~30 minutes after deployment
- Detection: `leak-detection-threshold` logged warnings; pool metrics showed active = max, pending > 0
- Fix: migrate to `try-with-resources` (Spring Data + HikariCP manage this automatically)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "HikariCP is a lock-free JDBC connection pool — default in Spring Boot. The key insight for pool sizing is counter-intuitive: more connections beyond a certain point makes the DB slower, not faster, because the DB server itself becomes overwhelmed with context switching. The formula is `2 × CPU_cores + effective_spindle_count`. For a distributed system with many app instances, the per-instance pool size is `max_db_connections / num_instances`. The critical failure mode is pool exhaustion: all connections borrowed, threads queue up waiting, `connectionTimeout` expires, threads throw exceptions, and you get cascading 503s. Diagnosis uses HikariCP's `connections_pending` and `connections_timeout` Micrometer metrics. The fix is shorter transactions, detecting connection leaks via `leak-detection-threshold`, and/or adding a server-side pooler like PgBouncer."

### Follow-Up Questions

1. **"What is the difference between `minimum-idle` and `maximum-pool-size`?"** → `minimum-idle` is the minimum connections maintained proactively (prevents cold-start). `maximum-pool-size` is the hard upper limit on total connections ever open simultaneously.
2. **"Why is `max-lifetime` important?"** → Prevents connections from being silently killed by network infrastructure (NAT gateways, firewalls) or accumulating db-side resource leaks. HikariCP proactively retires and replaces connections before they hit infrastructure timeouts.
3. **"How do you handle read replicas with HikariCP?"** → Create two separate `DataSource` beans (primary + replica), register them with `AbstractRoutingDataSource`, and route based on `TransactionSynchronizationManager.isCurrentTransactionReadOnly()`.
4. **"What is PgBouncer and when do you need it?"** → A server-side connection pooler between your app and PostgreSQL. Needed when the number of app instances × per-instance pool size exceeds PostgreSQL's `max_connections`. PgBouncer multiplexes many application connections to few DB connections.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### HikariCP Borrow Path

```
Thread requests connection
         │
         ▼
Check thread-local list (ConcurrentBag fast path)
  Found idle? → return immediately (zero contention)
         │NO
         ▼
Check shared idle list (CAS-based)
  Found idle? → return
         │NO
         ▼
pool.size < maximum? → CREATE new connection → return
         │NO
         ▼
Block thread (FIFO queue, not mutex)
  Wait up to connectionTimeout milliseconds
         │
  Connection returned by another thread? → return
         │
  Timeout? → throw SQLTimeoutException
```

### Pool Sizing Visualisation

```
PostgreSQL max_connections = 100
5 app instances, each with pool of 20
Total: 5 × 20 = 100 (at capacity)

Timeline at 1,000 QPS per instance, 5ms avg query:
  Thread pool: 50 threads
  Pool: 20 connections
  50 threads, 20 connections → 30 always waiting

  Wait time per thread = connection_hold_time × (waiters / workers)
                       = 5ms × (30/20) = 7.5ms average wait
  P99 wait: ~20-30ms → acceptable

  If query slows to 50ms:
  Wait = 50ms × (30/20) = 75ms → unacceptable → investigate query
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

**Why HikariCP and connection pooling are critical:**
- DB connection setup is expensive: 5–20ms per connection
- At scale, creating a connection per request is infeasible
- Too many connections to a DB server degrades DB performance (more context switching than query processing)

**How it works:**
- Pre-create `minimum-idle` connections at startup
- Lend connections to requesting threads from a lock-free concurrent bag
- Recycle connections after `max-lifetime`; validate after idle via JDBC4 `isValid()`
- On exhaustion: queue threads for up to `connection-timeout` before throwing

**Key rules for production:**
- Size pool = `(2 × CPU cores) + spindles` per app instance, capped by `max_db_connections / num_instances`
- Set `max-lifetime < credential rotation interval` and `<` any firewall idle timeout
- Set `leak-detection-threshold` = 5–10 seconds for connection leak alerting
- Monitor `connections_pending` and `connections_timeout` metrics — alert on non-zero timeout count
