# Connection Pooling — HikariCP Configuration
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- A database connection is expensive to create (TCP handshake + auth = ~50ms). A pool reuses connections
- HikariCP is the fastest Java connection pool — it is the Spring Boot default since 2.0
- Key settings: `maximum-pool-size` (max concurrent connections), `minimum-idle` (always-warm connections), `connection-timeout` (how long to wait for a connection from the pool), `idle-timeout` (close idle connections after this long)
- Pool size formula: `connections = (core_count * 2) + effective_spindle_count` — based on CPU concurrency theory, not request count
- **Connection leak** = a connection taken from the pool that is never returned — pool fills up, all threads wait, service hangs
- Gap to bridge: HikariCP exposes Micrometer metrics automatically — `hikaricp.connections.active`, `hikaricp.connections.pending` — monitor these to detect pool pressure early

---

## 1. One-Line Definition
A connection pool maintains a set of pre-opened database connections that your application reuses, eliminating the cost of creating and destroying a connection for every database call.

---

## 2. The Problem It Solves

Every database call without pooling follows this path:
1. Open a TCP socket to the database server (~5ms network + TCP handshake)
2. Authenticate (~5-10ms: send credentials, database validates, grant access)
3. Execute your query (~1ms for a simple SELECT)
4. Close the connection (another TCP teardown)

For a query that takes 1ms, you spend 10-20ms on setup and teardown. That is 90%+ overhead. At 100 requests per second, you are opening and closing 100 connections per second — each one requiring a TCP handshake and auth round-trip.

Worse: most databases have a hard limit on concurrent connections. PostgreSQL defaults to 100. MySQL to 151. If each request opens a new connection, and 200 requests are concurrent, you exceed the database connection limit and all subsequent connections are refused.

Connection pooling solves this by creating connections once at startup and reusing them. Your request borrows a connection from the pool, runs the query, and returns the connection. The next request gets the same connection — already authenticated, already open. Near-zero overhead for connection acquisition.

---

## 3. How It Works Internally

### The Mental Model
Think of a taxi company with 10 cars (connection pool with `maxPoolSize=10`). When a customer calls (request comes in), dispatch (pool manager) assigns a free car. If all 10 cars are busy, the customer waits up to 30 seconds (connection timeout). When the ride finishes (query completes), the car returns to the garage and is immediately available. New taxis are only purchased when the garage is empty and demand is high (pool growth). Cars that sit unused too long are retired (idle timeout). No car is used by two fares at once (one connection = one thread).

### The Mechanism — Step by Step

1. **Pool initialization** — At startup, HikariCP creates `minimumIdle` connections. Each connection: opens a TCP socket, authenticates, and waits in the pool ready-to-use.

2. **Connection request** — Your code calls `dataSource.getConnection()` (directly or via JPA/Hibernate). HikariCP checks its pool of available connections.

3. **Connection available** — Returns a `ProxyConnection` wrapping the real JDBC connection. The proxy tracks whether the connection is in use and intercepts `close()` to return it to the pool instead of actually closing it.

4. **Pool exhausted** — All connections are in use. HikariCP blocks the calling thread, waiting up to `connectionTimeout` (default 30 seconds). If no connection becomes available in time: throws `SQLTimeoutException: Unable to acquire JDBC Connection`.

5. **Connection returned** — When your code calls `connection.close()` (or JPA's transaction commits), HikariCP's proxy intercepts the close, validates the connection is still alive (ping check if `keepaliveTime` is set), and puts it back in the available pool.

6. **Idle connection retirement** — If a connection sits idle longer than `idleTimeout` and there are more than `minimumIdle` connections in the pool, HikariCP closes the excess idle connections.

7. **Connection leak detection** — If `leakDetectionThreshold` is set (e.g., 30000ms), HikariCP logs a warning if a connection is held for more than 30 seconds without being returned — a sign of a connection leak.

### Pool Sizing Formula (from HikariCP documentation)
```
pool_size = (core_count * 2) + effective_spindle_count

For a 4-core machine with SSDs (spindle count = 0 for SSDs, 1 for HDDs):
  pool_size = (4 * 2) + 1 = 9 → round to 10

For a 4-core machine with HDDs:
  pool_size = (4 * 2) + 4 = 12

Reasoning: a CPU core can handle 2 threads (hyperthreading). Each thread can be
waiting on I/O. With 2 threads per core and one extra for spill, you get threads
that stay busy without excessive context switching.

Important: DO NOT size the pool by "one connection per concurrent user".
At 10,000 concurrent users with a 10-connection pool — the pool handles them fine
because each query takes <10ms. Users queue for connections, connections execute
queries fast, return immediately. 10,000 users × 5ms query = 50s of total query work
/ 10 connections = 5 seconds per connection. Perfectly manageable.
```

### ASCII Diagram

```
HikariCP Connection Pool Lifecycle
────────────────────────────────────────────────────────────────────────

Startup: minimumIdle=5, maximumPoolSize=20
  ┌──────────────────────────────────────────────┐
  │  POOL (idle connections):                    │
  │  [conn1] [conn2] [conn3] [conn4] [conn5]    │ ← 5 warm connections ready
  └──────────────────────────────────────────────┘

Request arrives → needs connection:
  ┌──────────────────────────────────────────────┐
  │  POOL:                                       │
  │  [     ] [conn2] [conn3] [conn4] [conn5]    │ ← conn1 taken
  └──────────────────────────────────────────────┘
  conn1 → Thread A → execute query → conn1.close() → [return to pool]

Under high load (18 active, 2 idle):
  ┌──────────────────────────────────────────────────────────────────┐
  │  POOL:                                                           │
  │  ACTIVE: [c1][c2][c3][c4][c5][c6][c7][c8][c9][c10]            │
  │          [c11][c12][c13][c14][c15][c16][c17][c18]              │
  │  IDLE:   [c19][c20]                                             │
  └──────────────────────────────────────────────────────────────────┘

Pool exhausted (20/20 active):
  → New request: WAIT up to connectionTimeout (30s)
  → If no connection available in 30s → SQLTimeoutException

Connection leak (connection held > leakDetectionThreshold):
  → HikariCP logs: "Connection leak detection triggered for ..."
  → Stack trace of the code that acquired the connection

────────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```yaml
# application.yml — leaving pool settings at defaults without understanding them
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/orderdb
    username: appuser
    password: ${DB_PASSWORD}
    # No HikariCP configuration at all
    # Default maximum-pool-size is 10
    # If your service handles 100 concurrent DB operations, 90 will wait
    # Default connection-timeout is 30000ms (30 seconds)
    # 30 seconds is too long — a misbehaving connection blocks a thread for 30s
```
> **Why this fails in production:** The default `maximumPoolSize=10` is for demos, not production. Under moderate load (50+ concurrent requests each making a DB call), threads queue for connections. Each queued thread holds a Tomcat thread, consuming memory. With 200 Tomcat threads and 10 DB connections, you hit a traffic jam under normal load.

### Right Way — Production Quality
```yaml
# application.yml — explicit, documented HikariCP configuration

spring:
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/orderdb}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver

    hikari:
      # Maximum number of connections in the pool
      # Formula: (core_count * 2) + 1 for SSD, or your profiled throughput value
      # Start with 10 for a 4-core machine — measure and tune with Micrometer metrics
      maximum-pool-size: 20

      # Minimum connections to keep alive ("warm") even when idle
      # These are always ready — no creation latency for sudden traffic spikes
      # Set to half of maximum-pool-size for most services
      minimum-idle: 5

      # How long to wait for a connection before throwing SQLTimeoutException
      # 30000ms (30s) default is too long — threads stack up
      # 5000ms (5s) is more reasonable for a responsive service
      connection-timeout: 5000

      # Close a connection that has been idle for this long (when pool has more than minIdle)
      # 10 minutes — avoids holding connections open through database idle timeouts
      idle-timeout: 600000  # 10 minutes

      # Maximum lifetime of a connection — force recycle to prevent stale connections
      # Set to less than db's wait_timeout to avoid expired connections in the pool
      # For PostgreSQL default timeout of 1 hour: use 1800000ms (30 minutes)
      max-lifetime: 1800000  # 30 minutes

      # Used to validate connections before handing them out
      # isValid() is faster than a dummy SQL query
      connection-test-query: SELECT 1  # for MySQL/PostgreSQL; isValid() is preferred

      # Pool name — appears in logs and Micrometer metrics
      # Use a meaningful name if you have multiple pools (e.g., read replica)
      pool-name: OrderServicePool

      # Detect connection leaks — log if a connection is held longer than this
      # For development: set to 2000ms to catch leaks immediately
      # For production: comment out or set to 30000ms (30s) — prevents false positives
      leak-detection-threshold: 30000
```

```java
// Monitoring HikariCP via Micrometer (automatic when Actuator is on classpath)
// HikariCP auto-registers these metrics with MeterRegistry:
//   hikaricp.connections          → total connection count
//   hikaricp.connections.active   → currently in use
//   hikaricp.connections.idle     → currently available
//   hikaricp.connections.pending  → threads waiting for a connection
//   hikaricp.connections.acquire  → time to acquire a connection (histogram)

// Alert rule in Prometheus:
//   ALERT: HikariPoolExhaustion
//   WHEN: hikaricp_connections_pending_total{pool="OrderServicePool"} > 5
//   FOR: 1m
//   DESCRIPTION: Threads are waiting for DB connections for 1+ minutes

// This tells you: either maximumPoolSize is too small, or queries are running too long
```

```java
// Multi-DataSource setup (primary + read replica)
@Configuration
public class DataSourceConfig {

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource.primary.hikari")
    public HikariDataSource primaryDataSource(
            @ConfigurationProperties("spring.datasource.primary") DataSourceProperties props) {
        return props.initializeDataSourceBuilder()
            .type(HikariDataSource.class)
            .build();
    }

    @Bean
    @ConfigurationProperties("spring.datasource.replica.hikari")
    public HikariDataSource replicaDataSource(
            @ConfigurationProperties("spring.datasource.replica") DataSourceProperties props) {
        return props.initializeDataSourceBuilder()
            .type(HikariDataSource.class)
            .build();
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a connection pool and why is HikariCP the Spring Boot default?"

**Hruday's answer:**
> A connection pool is a cache of pre-opened database connections. Instead of opening a new connection for every database request (expensive — TCP handshake + auth can take 50ms+), the pool keeps connections alive and reusable. Your code borrows a connection, runs the query, and returns it.
>
> HikariCP is the Spring Boot default since version 2.0 because it is consistently the fastest Java connection pool in benchmarks. It uses fixed-size concurrent data structures (no locks on connection acquisition in the common case), avoids reflection in the hot path, and has minimal object allocation. It also has a clean, simple configuration API and excellent observability — it auto-registers with Micrometer for detailed pool metrics.
>
> Before HikariCP, the common pools were c3p0, DBCP2, and Tomcat JDBC Pool. All still work, but HikariCP outperforms them on throughput per thread and per CPU cycle.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you size a HikariCP connection pool? Why is 'one connection per concurrent user' wrong?"

**Hruday's answer:**
> The HikariCP author Bret Wooldridge has a well-known recommendation: `pool_size = (core_count * 2) + effective_spindle_count`. For a 4-core machine with SSDs, that is 9 — round to 10.
>
> The reasoning is about CPU utilisation. A database thread on your application server is mostly waiting — waiting for the DB query response, waiting for network I/O. During that wait, the CPU is free. So each core can handle 2 threads waiting on I/O simultaneously without context switching overhead. Adding 1 for spindle count is for disk-bound operations.
>
> "One connection per concurrent user" is wrong because database queries are fast — typically 1-10ms. If your service handles 1000 concurrent users, each doing a 5ms query, you need: 1000 × 0.005s = 5 seconds of total query work per second. With 10 connections, each running continuously: 10 connections × (1000ms / 5ms per query) = 2000 queries per second. Easily handles 1000 users. The connections just queue briefly.
>
> With 1000 connections from 1000 users, the database server itself hits a wall — maintaining 1000 open connections consumes memory on the DB side. PgBouncer (a connection pooler that sits between your app and PostgreSQL) is specifically designed to solve this when you have many application instances connecting.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "You see that hikaricp.connections.pending is consistently > 0 in your production metrics. What could cause this and how do you fix it?"

**Hruday's answer:**
> `connections.pending > 0` means threads are waiting for a connection from the pool — the pool is exhausted. There are four possible causes.
>
> First: maximum-pool-size is too small. Your load has outgrown the pool. Fix: increase `maximumPoolSize` (within your DB server's connection limit) and verify the improvement.
>
> Second: long-running queries. If each query takes 2 seconds instead of 5ms, connections are held 400x longer. 10 connections × 2s average query = 20 seconds of holding time per batch. Fix: identify the slow queries via Micrometer's `http.server.requests` histogram or Hibernate statistics, then optimize with indexes or JOIN FETCH.
>
> Third: connection leak. A code path acquires a connection but never returns it — forgot to close it, or an exception is thrown before `connection.close()`. The pool slowly drains. Fix: enable `leakDetectionThreshold=30000` to log the stack trace of leaking code. Always use try-with-resources or let Spring/JPA manage connections — never manually acquire without guaranteed close.
>
> Fourth: N+1 problem. 1000 DB queries for 1 request multiplied by 10 concurrent requests = 10,000 DB calls per second. Fix the N+1 first, then re-evaluate pool size.
>
> The diagnostic flow: pending > 0 → check active count → if always at max, check query duration → if long queries, check slow query log → if connection leak, check leak detection log.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the database connection setup for a Spring Boot microservice that handles 500 requests per second, uses PostgreSQL, and has both read-heavy and write-heavy operations."

**Hruday's answer:**
> For a 500 RPS service, I would design a two-pool setup.
>
> The primary pool connects to the write master. It handles INSERTs, UPDATEs, transactions. Pool size: 10-20 connections (based on server CPU count). `connectionTimeout=5s`, `idleTimeout=10min`, `maxLifetime=30min`.
>
> The read replica pool connects to a PostgreSQL read replica. Read-heavy operations (order history, product search, reports) route here. This offloads the primary and gives us horizontal read scaling. Pool size: can be larger (20-40) because reads can scale horizontally and don't require locking. Route with `@Transactional(readOnly=true)` and a custom `RoutingDataSource` that directs based on the transaction's read-only flag.
>
> For observability, both HikariCP pools register with Micrometer using distinct pool names (`pool-name: primary-pool` and `pool-name: replica-pool`). I set Prometheus alerts for `connections.pending > 5 for 2min` on either pool.
>
> For the database side: PostgreSQL's `max_connections=200`. With 5 app instances × 20 connections each = 100 connections to primary. Leaves headroom. If instances scale to 10, add PgBouncer as a connection pooler between app instances and PostgreSQL.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Set pool size to match concurrent users" | "500 concurrent users → 500 pool size" | "Wrong. 500 connections to PostgreSQL is excessive and hits DB memory limits. Pool size should be based on CPU cores, not user count. With fast queries (5ms), 10 connections serve 2000 QPS. Users queue briefly — that's fine." |
| "Connection leak cause" | "Memory leak or GC issue" | "Connection leak: a connection is acquired from the pool and never returned. Common causes: exception before connection.close(), forgetting close(), or using connection outside try-with-resources. Enable leak-detection-threshold to get stack traces. Always use JPA/Spring transactions instead of raw connection management." |
| "connection-timeout is query timeout" | "It controls how long queries can run" | "No. connection-timeout is how long to wait to GET a connection FROM THE POOL. Query/statement timeout is separate — configured with spring.jdbc.timeout or via @QueryHint on individual JPA queries. Confusing these leads to either threads waiting too long (timeout too high) or false timeout failures (too low)." |
| "HikariCP is only for relational DBs" | "Yes, just for SQL" | "HikariCP is specifically a JDBC connection pool — for relational databases. NoSQL databases (MongoDB, Redis) have their own client connection pooling — Lettuce for Redis, MongoDB Java driver pool. Spring Boot configures those separately. Don't conflate JDBC pooling with general connection pooling." |

---

## 7. Hruday's Real Experience Hook

> "At SAP, we had a microservice that handled document management. During peak office hours it would occasionally hang — all requests timing out for 30 seconds, then recovering. The Actuator metrics showed `hikaricp.connections.pending` spiking to 80 during hangs. The pool was 10. Root cause: one API endpoint triggered a complex report query that took 15+ seconds to complete. During those 15 seconds, it held a connection. Under load, 10 users hitting that endpoint simultaneously = 10 connections held for 15 seconds each = pool exhausted for everyone. Fix: we added `@Transactional(timeout=5)` to that report method (fails fast), moved the heavy query to an async job with its own connection pool, and increased the main pool to 20. The hangs stopped."

---

## 8. Scale Evolution

**1,000 users →** Default HikariCP pool of 10 works fine. Queries are fast. Steady state: 2-3 connections active, 7-8 idle. No issues.

**100,000 users →** Under traffic spikes, pool exhaustion appears. Tune `maximumPoolSize` to 20-30. Add Micrometer alerts for pending connections. Consider read replicas for read-heavy traffic. Use `@Transactional(readOnly=true)` on all read methods — it allows HikariCP to route to a read replica pool.

**10 million users →** Horizontal scaling: 20 app instances × 20 connections = 400 connections to one PostgreSQL server. PostgreSQL `max_connections=400` is the ceiling. At 20 instances, you are at the limit. Solution: deploy PgBouncer in front of PostgreSQL. PgBouncer maintains a small pool to PostgreSQL (50 connections) and accepts unlimited connections from app instances. It queues and multiplexes. Your app thinks it has 400 connections; PostgreSQL sees 50. This is essential at this scale.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment services do high-frequency DB writes. Connection pool exhaustion during a payment surge = direct revenue loss. Pool sizing and leak detection are production-critical. | "A payment service is returning timeouts under traffic spike. How do you diagnose whether it's a connection pool issue?" |
| Swiggy / Meesho | High-volume order processing. Peak dinner hours drive 10x normal traffic. Pool must be sized for peak, not average. | "How do you size a connection pool for a service with 10x traffic spikes during peak hours?" |
| Adobe / Microsoft | Multi-tenant SaaS platforms. Often use separate DataSources per tenant or per data centre with different pool configurations. | "Design a multi-datasource setup where read queries go to a replica and writes go to primary." |
| Remote / Global roles | HikariCP configuration is a proxy question for "do you understand production database behaviour?" Expected knowledge for senior Spring Boot engineers. | "What configuration would you change in HikariCP to prevent a slow query from exhausting the pool?" |

---

## 10. Related Topics — What to Study Next

- **Topic 45 — Spring Boot Actuator** — HikariCP auto-registers metrics with Micrometer via Actuator — `hikaricp.connections.active` and `connections.pending` are your primary pool health signals
- **Topic 47 — ORM Pitfalls (N+1 Problem)** — N+1 creates many extra SQL queries, each consuming a connection — solving N+1 reduces pool pressure significantly
- **Topic 91 — Database Replication** — read replica pools require a two-DataSource configuration — HikariCP handles each pool independently
- **Topic 44 — @Transactional Internals** — transactions hold connections from the pool for their entire duration — long transactions cause pool exhaustion
- **Topic 94 — Connection Pooling at Scale** — when your app instances exceed DB connection limits, PgBouncer and ProxySQL are the next step

---

*Part 3 · Connection Pooling — HikariCP · Full Stack Interview Guide · Hruday D · 2026*
