# Connection Pooling at Scale — HikariCP
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Database connection = a TCP socket + authentication session between the app server and the DB server. Opening a new connection on every query costs ~50-150ms + significant CPU on the DB server. Connection pooling maintains already-open connections, reusing them across queries.
- HikariCP = the default and fastest connection pool in Spring Boot 3.x. Connections are pre-opened, managed, and returned to the pool after each transaction — zero overhead compared to raw JDBC connections.
- Key settings: `maximum-pool-size` (max connections the pool will open), `minimum-idle` (minimum connections held open when idle), `connection-timeout` (how long the app waits for a connection from the pool before throwing an exception), `idle-timeout` (how long an idle connection is kept before being closed), `max-lifetime` (maximum age of a connection — must be less than DB server's connection timeout setting).
- Pool sizing formula: `pool_size = (core_count × 2) + effective_spindle_count` (PostgreSQL team's recommendation). For application-side: thread_pool_size / avg_concurrent_DB_time_fraction. Too small → connection timeout under load. Too large → DB server overwhelmed.
- Pool exhaustion = all connections in the pool are in use; new requests wait up to `connection-timeout` (default 30s) then fail with `SQLTimeoutException`. Signal: pool wait time metric spikes. Fix: increase pool size OR investigate what's holding connections too long.
- PgBouncer = a lightweight proxy in front of Postgres that multiplexes many app connections onto a small number of actual Postgres backend connections. Essential when you have many app server instances each with a pool — prevents Postgres from being overwhelmed by too many server connections.
- Gap to bridge: candidates know "use HikariCP" but cannot explain the max_connections problem at scale, why PgBouncer is needed with many app replicas, or what happens when pool size is too large vs too small

---

## 1. One-Line Definition
Connection pooling maintains a set of pre-opened database connections that are reused across requests, eliminating the high cost of opening a new connection for every database query and enabling controlled, observable management of database connection resources.

---

## 2. The Problem It Solves

```
WITHOUT connection pooling:

  Request arrives at API server.
  App code: Connection conn = DriverManager.getConnection(url, user, password);
            // ↑ Opens TCP connection to DB: ~3ms
            // ↑ TLS handshake: ~5ms
            // ↑ Auth (username/password/pg_hba): ~10ms
            // ↑ PostgreSQL spawns a new backend process: ~20ms on fork()
            // Total: ~40ms BEFORE any SQL executes.
  
  App runs query: 2ms.
  App closes connection: another few ms.
  
  Total time: 44ms, of which 42ms was connection overhead.
  At 1,000 requests/second: 42,000ms of wasted overhead per second.
  
  Also: constantly spawning new DB backend processes (Postgres' threading model) is
  CPU-intensive on the DB server. 1,000 req/sec = 1,000 new processes/sec → catastrophic.

WITH HikariCP connection pool:

  Application starts: HikariCP opens `minimum-idle` connections immediately.
  These connections stay open, idle, ready.
  
  Request arrives.
  App code: Connection conn = hikariPool.getConnection();
            // ↑ Gets a pre-opened connection from the pool: ~0.1ms
  
  App runs query: 2ms.
  App "closes" connection: actually returns it to pool: ~0.1ms.
  
  Total time: 2.2ms. Query time is the dominant cost, as intended.
  
  DB server: maintains the same N persistent connections regardless of request rate.
  No process spawning per request. Stable DB server load.
```

---

## 3. How It Works Internally

### HikariCP Connection Lifecycle

```
Pool state diagram:
  
  [IDLE connections pool]  ←───────────── connection returned ─────────────────┐
          │                                                                     │
  getConnection() called                                              connection.close()
          │                                                           (returns to pool)
          ▼                                                                     │
  [Check connection health: isValid()?]                                        │
          │                                                                     │
  [ACTIVE connection] ─────────────────── given to caller ────────────────────→[caller]
  
  Health check:
    Hikari tests connections with a "keep-alive" query every `keepaliveTime` ms (default: off)
    Or with `connectionTestQuery` (SELECT 1 for most databases)
    A connection that fails the test is discarded and replaced with a new one.
    
  max-lifetime:
    Connections are closed and replaced after `max-lifetime` milliseconds (default: 30 min)
    WHY: DB servers often have their own connection idle timeout
    (Postgres: tcp_keepalives_idle, or server-side idle_in_transaction_session_timeout)
    If a Hikari connection is older than the DB's timeout, the DB closes it server-side.
    The app then gets a "broken pipe" error on the next query.
    Setting max-lifetime slightly below the DB's timeout prevents this.
    Rule: max-lifetime should be several minutes less than the DB's connection timeout.

Pool exhaustion scenario:
  Pool size = 10 connections.
  10 requests arrive simultaneously, each taking a 500ms transaction.
  During those 500ms, 11th request arrives.
  11th request: hikariPool.getConnection() → waits...
               waits `connection-timeout` ms (default: 30,000ms = 30 seconds)
               If no connection becomes available in 30s → throws SQLTimeoutException
               
  This is pool exhaustion. The 30s default is a long hang for a user.
  Real fix: increase pool size OR find and fix long-running transactions.
  Temporary masking fix: reduce connection-timeout so failures are fast instead of long hangs.
```

### The Too-Large Pool Problem

```
WRONG assumption: "Bigger pool = more capacity"

Each Postgres connection is a separate OS process (Postgres uses process-per-connection).
Default max_connections in postgres.conf: 100

With 5 application server instances, each with pool size 50:
  5 × 50 = 250 connections requested
  Postgres only allows 100 → first 100 connections accepted, next 150 rejected
  → Half your app pool can't connect → intermittent failures

Even if DB max_connections is set high (e.g., 1,000):
  1,000 Postgres processes running simultaneously
  Each process uses ~5-10MB memory (Postgres shared buffer + process overhead)
  1,000 processes × 5MB = 5GB RAM just for connection overhead
  Plus context switching between 1,000 processes → CPU overhead
  
  With 1,000 connections, Postgres often performs WORSE than with 100 connections
  because the OS spends more time scheduling processes than actually executing queries.

PostgreSQL team's formula:
  optimal_pool_size = (core_count × 2) + effective_spindle_count
  
  For a DB server with 8 CPU cores, 2 SSDs (spindle count = 2):
  optimal_pool_size = (8 × 2) + 2 = 18 connections
  
  With 5 app server instances: 5 × 18 = 90 connections from the app side
  This is the ideal total number of backend connections DB should handle.
  
SOLUTION: PgBouncer as a connection multiplexer
  Each app server keeps a large pool toward PgBouncer (e.g., 50 connections per server).
  PgBouncer keeps a small pool toward Postgres (e.g., 20 actual Postgres connections).
  
  5 app servers × 50 = 250 "connections" to PgBouncer (lightweight, just TCP proxying)
  PgBouncer → 20 actual Postgres connections
  
  In transaction pooling mode: PgBouncer assigns a real Postgres connection for the duration
  of a transaction, then returns it. A real connection serves 50+ concurrent app-side threads.
```

---

## 4. The Code

### Wrong Way — Default (Unconfigured) Pool Size
```yaml
# WRONG: Using default HikariCP settings in production
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/appdb
    username: appuser
    password: secretpassword
    # No hikari config → defaults used:
    # maximum-pool-size: 10  (too small for any real load)
    # connection-timeout: 30000ms  (30 second hang before fail)
    # max-lifetime: 1800000ms (30 min — may exceed DB server's idle timeout)
    # No keepaliveTime → stale connections not detected until query fails
```
> **Why this fails:** With a default pool size of 10, a service under moderate load starts queueing connection requests and throwing `SQLTimeoutException` after 30 seconds of wait — a confusing error that looks like a query timeout but is actually connection starvation.

### Right Way — Tuned HikariCP Configuration
```yaml
# application.yml — properly tuned HikariCP for production
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:5432/${DB_NAME}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
    hikari:
      pool-name: primary-pool
      
      # Core sizing: based on expected concurrent DB operations
      # Formula: count threads that could be waiting for DB at once
      # For 200 concurrent HTTP threads with 10% hitting DB simultaneously: 20 connections
      maximum-pool-size: 25
      minimum-idle: 5
      
      # How long to wait for a connection from the pool (fail fast: 3s not 30s)
      connection-timeout: 3000
      
      # How long an idle connection stays in the pool before being closed
      # Default is 600000 (10 min) — keep it for warm pool, but don't hold forever
      idle-timeout: 600000
      
      # Maximum age of a connection — MUST be less than DB server's connection timeout
      # Postgres default idle connection timeout: often 10-60 min depending on config
      # Set max-lifetime to 28 minutes (slightly less than typical 30 min Postgres timeout)
      max-lifetime: 1680000
      
      # Heartbeat: send a keepalive query to prevent idle connections being closed by DB
      # or by network firewalls that close idle TCP connections
      keepalive-time: 60000  # send keepalive every 1 minute
      
      # Query to test a connection is alive before giving it to the app
      # PostgreSQL driver supports JDBC4 isValid() check — don't need a custom query
      # connection-test-query: SELECT 1  ← only needed for old JDBC3 drivers
      
      # Diagnostic: these appear in logs and monitoring
      connection-init-sql: "SET TIME ZONE 'UTC'"  # optional: set DB session defaults

# Separate read-replica pool: read-heavy, can have a larger pool
app:
  datasource:
    replica:
      hikari:
        pool-name: replica-pool
        maximum-pool-size: 40
        minimum-idle: 10
        connection-timeout: 3000
        max-lifetime: 1680000
        keepalive-time: 60000
```

```java
// Pool monitoring: expose HikariCP metrics to Micrometer (Actuator + Prometheus)
// dependency: spring-boot-starter-actuator + micrometer-registry-prometheus
// HikariCP automatically registers metrics when Micrometer is on the classpath:

// Key metrics that appear in Prometheus/Grafana:
//   hikaricp_connections_active          ← how many in use right now
//   hikaricp_connections_idle            ← how many waiting in pool
//   hikaricp_connections_pending         ← threads waiting for a connection
//   hikaricp_connections_timeout_total   ← connection acquisitions that timed out
//   hikaricp_connections_acquire_seconds ← distribution of wait times

// Alert thresholds to set in your dashboards:
//   hikaricp_connections_pending > 0 for more than 10 seconds → investigate pool size
//   hikaricp_connections_timeout_total rate > 0 → pool exhaustion happening now
//   hikaricp_connections_acquire_seconds p99 > 500ms → connection wait is visible to users

// Programmatic pool inspection (useful for debugging):
@Component
@RequiredArgsConstructor
@Slf4j
public class PoolInspector {

    private final DataSource dataSource;  // The HikariDataSource (or lazy proxy wrapping it)

    public void logPoolStatus() {
        // Unwrap through lazy proxy to get to HikariPoolMXBean
        if (dataSource instanceof HikariDataSource hikari) {
            HikariPoolMXBean pool = hikari.getHikariPoolMXBean();
            log.info("Pool status — active: {}, idle: {}, waiting: {}, total: {}",
                pool.getActiveConnections(),
                pool.getIdleConnections(),
                pool.getThreadsAwaitingConnection(),
                pool.getTotalConnections()
            );
        }
    }
}
```

### PgBouncer Configuration (Operations — for context)
```ini
; pgbouncer.ini
[databases]
; App connects to PgBouncer on port 6432; PgBouncer connects to Postgres on 5432
appdb = host=postgres.internal port=5432 dbname=appdb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Transaction pooling: a real Postgres connection is used for one transaction,
; then returned to the pool. Best for apps using short transactions (typical web apps).
pool_mode = transaction

; How many real Postgres connections PgBouncer maintains per database
; This is what Postgres sees. Should match the optimal_pool_size formula.
default_pool_size = 20
max_db_connections = 25  ; hard limit: Postgres max_connections safety valve

; How many clients (app connections) can connect to PgBouncer per pool
max_client_conn = 500  ; PgBouncer handles 500 "connections" → Postgres sees 20

; Config for Spring Boot: connect to PgBouncer, not directly to Postgres
; app.datasource.primary.jdbc-url = jdbc:postgresql://pgbouncer.internal:6432/appdb
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is connection pooling and why is it important?"

**Hruday's answer:**
> Opening a database connection involves establishing a TCP socket to the database server, a TLS handshake if encrypted, and authenticating — then the database server allocates memory for the session. For Postgres this means spawning a new OS process. All of that takes 50-150 milliseconds. If you open a new connection for every query in a service handling 1,000 requests/second, you spend 50 to 150 seconds just on connection overhead every second — clearly impossible.
>
> Connection pooling solves this by keeping a set of pre-opened connections ready. When a query needs to run, a connection is borrowed from the pool (microseconds), used, and returned. The application sees consistent sub-millisecond connection acquisition instead of 100ms-per-query connection overhead.
>
> The secondary benefit: it controls the number of simultaneous database connections. Without pooling, 1,000 concurrent API requests might all try to open a connection simultaneously, overwhelming the DB server's process limit. With a pool of size 20, the DB server always sees at most 20 connections — regardless of how many concurrent requests the app is handling.

---

### Q2 — Pool Sizing
**Interviewer asks:** "How do you decide the right pool size for a production application?"

**Hruday's answer:**
> The PostgreSQL team published a formula: `pool_size = (CPU_cores × 2) + effective_spindle_count`. For a database server with 8 cores and 2 SSDs, that's 18 optimal connections total. The reasoning: a CPU can handle roughly 2 database operations at once per core before context-switching overhead hurts performance.
>
> For application-side sizing, I look at it from the other direction: how many threads in the application could be waiting for a database operation simultaneously? If the API service has 200 concurrent HTTP threads and 15% of requests touch the database simultaneously, that's 30 simultaneous DB operations. Pool size 35 provides some headroom.
>
> The real danger is setting it too high, not too low. Every Postgres connection is a process. At 500 connections, Postgres is spending significant CPU scheduling processes. Production often performs better with 20 well-managed connections than 500 poorly-managed ones. When you have multiple app server instances, multiply: 5 instances × 20 per instance = 100 connections to DB. Use PgBouncer to multiplex if that exceeds the DB's comfortable capacity.

---

### Q3 — Pool Exhaustion Debugging
**Interviewer asks:** "You see `SQLTimeoutException: Unable to acquire JDBC Connection` in production. What do you do?"

**Hruday's answer:**
> This is connection pool exhaustion — all connections in the pool are in use, and new requests have waited past connection-timeout for one to become available.
>
> First, I check the HikariCP metrics immediately: `hikaricp_connections_pending` and `hikaricp_connections_active`. If active equals maximum-pool-size and pending is non-zero, confirmed exhaustion.
>
> Then I find WHY connections are held for so long. The most common causes: a slow query holding a transaction open too long; a code path that opens a transaction but never commits (forgetting to call commit, or a try-catch that swallows exceptions before commit); or a long-running @Transactional method that does non-database work (HTTP calls, file reads) inside the transaction, holding the connection while waiting.
>
> I check the slow query log for queries running more than 5 seconds. I check for open transactions: `SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC`. Transactions open for more than 10 seconds are usually the culprit.
>
> Short-term relief: reduce connection-timeout from 30 seconds to 3 seconds — requests fail fast instead of queuing, which reduces cascades. Medium-term fix: increase pool size if the load genuinely increased. Long-term fix: find and fix the transactions that run too long.

---

### Q4 — PgBouncer Necessity
**Interviewer asks:** "You have 10 application server instances, each with a HikariCP pool of size 50. What problem arise and how do you fix it?"

**Hruday's answer:**
> 10 instances × 50 connections each = 500 simultaneous connections to Postgres. Most Postgres deployments are configured with `max_connections = 100` or `200`. 500 exceeds this — connections from your 9th and 10th app servers will be rejected. You'd see `FATAL: sorry, too many clients already` in your logs.
>
> Even if you set max_connections to 500 in Postgres, the performance degrades. Each Postgres connection is a process. 500 processes competing for CPU time on the same server means significant context-switch overhead. Most of those connections will be idle most of the time — holding resources unnecessarily.
>
> The fix: PgBouncer. Place it between the application servers and Postgres. Each app server's HikariCP pool connects to PgBouncer on port 6432, not directly to Postgres. PgBouncer maintains a small real pool to Postgres — say 25 Postgres connections. It multiplexes 500 application-level connections onto 25 actual Postgres connections using transaction-mode pooling. After each transaction completes, the connection is returned to PgBouncer's real pool. The next transaction gets a fresh one from the 25 available.
>
> The result: Postgres always sees at most 25 connections. All 10 app servers can use the full 500 PgBouncer connections. Performance is better, and the Postgres max_connections limit is no longer a constraint.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Bigger pool = more performance" | "Set maximum-pool-size to 200 for high traffic" | "Bigger pool can actually hurt performance and cause failures. DB servers have a max_connections limit. Too many connections = too many OS processes on the Postgres server = context-switch overhead + memory bloat. The right pool size is the minimum needed to handle peak concurrent DB operations. Start with the PostgreSQL formula: (cores × 2) + spindles. Increase based on actual wait-time metrics — not preemptively." |
| "connection-timeout is the query timeout" | "If I set connection-timeout to 5s, queries will fail after 5s" | "connection-timeout is how long the app WAITS for a connection FROM THE POOL — it is not the query execution timeout. If the pool is exhausted, requests wait up to connection-timeout before throwing SQLTimeoutException. Query execution timeout is a separate setting: `spring.jpa.properties.hibernate.query.timeout` or `@QueryHints(@QueryHint(name='javax.persistence.query.timeout', value='5000'))` — set these separately and explicitly." |
| "HikariCP detects broken connections automatically" | "HikariCP handles dead connections — nothing else needed" | "HikariCP validates connections on borrow by default (via JDBC4 isValid()) — this catches some broken connections. But network firewalls and cloud load balancers often silently close idle TCP connections after minutes of inactivity, without sending a TCP FIN. The HikariCP pool doesn't know the connection is dead until it tries to use it — first query fails with a socket error, and Hikari retries with a new connection. To prevent this: set `keepalive-time` to a value less than your firewall's idle timeout (commonly 5 minutes). Hikari sends a lightweight keepalive query to hold the connection alive." |
| "Pools work the same in Kubernetes" | "Connection pool behavior is the same in Kubernetes as on-prem" | "In Kubernetes, pods are ephemeral and scale dynamically. When a new pod starts, its HikariCP pool opens minimum-idle connections. If 10 new pods start simultaneously during a scale-up event (e.g., a traffic spike), all 10 open connections simultaneously — potentially exhausting DB max_connections. Set minimum-idle to 1-2 in Kubernetes, not 10-20, and let the pool grow lazily as actual requests arrive. Also: when a pod is terminated, HikariCP should close its connections gracefully — ensures proper K8s preStop hook or Spring's DataSource.close() is called." |

---

## 7. Hruday's Real Experience Hook

> "At Capgemini, our Node.js service used a pg library with default pool configuration (10 connections, 30-second timeout). During a flash sale event, API response times spiked to 25 seconds and some requests timed out. The root cause: pool exhaustion. 500 concurrent users × 10% hitting the database = 50 simultaneous DB operations, but only 10 connections available. 40 threads were waiting up to 30 seconds. We increased the pool size to 30 and reduced connection-timeout to 3 seconds — requests that couldn't get a connection now failed fast with a clear error instead of hanging 30 seconds and cascading into a timeout storm. The right pool size and failing fast was the immediate fix; we added read replicas for the longer-term scaling solution."

---

## 8. Scale Evolution

**Single service:** HikariCP with carefully chosen pool size. Monitor `hikaricp_connections_pending` and alert at > 0 for sustained periods. Fail-fast connection timeout (3 seconds).

**Multiple instances:** Total connections = instances × pool_size. Plan to stay within DB max_connections. If approaching the limit: reduce pool size per instance, or add PgBouncer.

**Scale:** PgBouncer mandatory. Multiple app server instances each talk to PgBouncer. PgBouncer manages a small real pool to Postgres. Enable transaction-mode pooling. Monitor PgBouncer statistics via `SHOW POOLS` on its admin interface.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | High-throughput payment services require pool exhaustion monitoring and fast-fail connection timeouts. PgBouncer standard in fintech production setups. | "Your payment service has 20 Kubernetes pods. How do you prevent them from exhausting Postgres max_connections?" |
| Swiggy / Meesho | Order service scales to 50 pods during peak hours. Each pod has a HikariCP pool. Need to plan for dynamic scaling without DB connection explosion. | "Design the connection tier for an order service that scales from 5 to 50 pods during peak traffic." |
| Adobe / Microsoft | Enterprise SaaS with dozens of microservices each connecting to shared or per-service databases. Connection budget planning is a production operations skill. | "How do you manage total database connections across 30 microservices without overwhelming the DB?" |
| SAP Labs (current) | Oracle connection pooling (JDBC and UCP — Universal Connection Pool) is used in SAP Java applications. The concepts (pool size, idle timeout, connection testing) are directly applicable. | "What UCP settings would you tune to prevent stale connections in an Oracle-backed Spring Boot application?" |

---

## 10. Related Topics — What to Study Next

- **Topic 93 — Read Replicas** — each datasource (primary + replicas) needs its own separately configured HikariCP pool; Topics 93 and 94 are a practical pair
- **Topic 91 — Replication** — understanding replication lag and failover completes the picture: what happens to pooled connections when a primary fails and a replica is promoted
- **Topic 95 — Isolation Levels** — long-running transactions that hold pool connections are often caused by incorrect isolation level settings; understanding isolation helps diagnose pool exhaustion

---

*Part 5 · Connection Pooling at Scale — HikariCP · Full Stack Interview Guide · Hruday D · 2026*
