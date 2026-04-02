# Timeout Strategies — Connection, Read, and Cascade Timeouts
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Timeout = a limit on how long you are willing to wait for a response before giving up; without timeouts, a slow or dead downstream service will block your threads forever, causing thread pool exhaustion and a full service outage
- Two types matter most: **connection timeout** (how long to wait to establish the TCP connection — should be short: 2-5 seconds) vs **read timeout** (how long to wait for data after the connection is made — depends on the operation: 3-30 seconds)
- Cascading timeout problem: if Service A calls B calls C with timeouts of 30s+30s+30s = 90 seconds total for the outer caller, but the outer caller's own timeout is 30s — the caller gives up after 30s while inner services are still doing work for 60 more seconds (wasted resources)
- Solution to cascade: use deadline propagation — pass the REMAINING time to each downstream service via a request header (`X-Request-Deadline` or gRPC deadline) so every service in the chain knows the total budget and gives up together
- Spring Boot: set timeouts on WebClient (`responseTimeout`, `connectTimeout`), on HikariCP (`connectionTimeout`, `idleTimeout`), and on Feign clients; they must ALL be configured or one unset timeout becomes the weak link
- Gap to bridge: most candidates say "just set a timeout" — but cannot answer WHAT value to set, WHY cascading is dangerous, or HOW to propagate deadlines through an async chain

---

## 1. One-Line Definition
Timeout strategies define how long each service will wait for a response from its dependencies — connections, databases, downstream services — and how those time limits are coordinated across service chains to prevent slow dependencies from freezing an entire request pipeline.

---

## 2. The Problem It Solves

### Thread Exhaustion Without Timeouts

```
WITHOUT timeouts:
  OrderService handles HTTP requests using a Tomcat thread pool (default: 200 threads)
  
  Each request calls InventoryService synchronously via WebClient (blocking)
  
  InventoryService's database starts running slow — queries taking 60+ seconds
  
  At 100 requests/second:
    t=0s:   Thread 1 arrives, calls InventoryService, waiting... 
    t=1s:   Thread 2 arrives, calls InventoryService, waiting...
    t=2s:   Thread 3 arrives, calls InventoryService, waiting...
    ...
    t=200s: Thread 200 arrives — ALL 200 THREADS ARE BLOCKED waiting for InventoryService
    
  New requests arrive but ALL threads are occupied waiting.
  → New requests queue until the queue fills
  → OrderService becomes completely UNRESPONSIVE
  → The SLOW INVENTORY DATABASE has taken down OrderService too
  → This is called cascading failure — one slow service brings down the entire chain
```

### The Cascading Timeout Problem

```
Common mistake: setting timeouts per-hop without thinking about the total budget

OrderService → InventoryService → SupplierService → External API

Each service has:
  OrderService:     read_timeout = 30s
  InventoryService: read_timeout = 30s (when calling SupplierService)
  SupplierService:  read_timeout = 30s (when calling external API)

A user makes a request. External API is slow.
  t=0s:   OrderService starts, calls InventoryService
  t=0s:   InventoryService starts, calls SupplierService
  t=0s:   SupplierService starts, calls External API
  t=30s:  SupplierService gives up on External API → returns error to InventoryService
  t=30s:  InventoryService processes error, returns error to OrderService
  t=30s:  OrderService finally returns an error to the user

But imagine a worse case — SupplierService takes 29.9 seconds before calling External API
  t=0s:   OrderService starts
  t=0s:   InventoryService starts
  t=0s:   SupplierService does internal processing... slowly (29.9s)
  t=29.9s: SupplierService calls External API (which itself might take 30s)
  t=29.9s: InventoryService's 30s timeout hasn't fired yet (only 29.9s have passed)
  t=30s:  OrderService's 30s timeout fires — user gets error
  t=30s:  BUT: InventoryService is STILL waiting (it has 0.1s left)
  t=59.9s: SupplierService's timeout fires
  t=59.9s: InventoryService receives error from SupplierService
  
Between t=30s and t=59.9s: 
  Threads in InventoryService and SupplierService are STILL occupied doing work
  that nobody cares about anymore — the outer request already failed at t=30s.
  WASTED RESOURCES for 30 extra seconds.
```

---

## 3. How It Works Internally

### The Three Timeout Layers Every Service Has

```
LAYER 1 — Network / Connection Timeouts:
  Connection Timeout: time to establish the TCP connection to a server
    - If the server is unreachable (wrong host, firewall blocking), connection times out
    - Should be SHORT: 2-5 seconds max
    - A connection taking longer means "the server is probably dead or unreachable"
  
  Read Timeout: time to receive data AFTER the connection is established
    - Connection was made, but the server is thinking/processing before sending a response
    - Duration depends on operation: 5s for simple lookups, 30s for reports, 120s for exports
    - This is the timeout most people mean when they say "timeout"

LAYER 2 — Application-Level Timeouts:
  Feign / WebClient call timeout: configured on the HTTP client
  gRPC deadline: total request budget passed in the RPC call header
  Kafka poll timeout: how long consumer.poll() waits for messages
  Kafka producer timeout: how long to wait for broker acknowledgement
  
LAYER 3 — Resource Timeouts:
  HikariCP connectionTimeout: how long to wait for a connection FROM the pool
    (pool is full — waiting for a free connection, not a network timeout)
  HikariCP idleTimeout: how long an idle connection stays in the pool before being closed
  Statement timeout / query timeout: Postgres/MySQL kills queries running longer than N seconds

ALL THREE LAYERS must be configured or one becomes the weak link.
```

### Deadline Propagation — The Right Pattern

```
Instead of independent timeouts per hop, propagate a DEADLINE through the call chain:
"The total budget for this entire request chain is 10 seconds from now"

How it works:
  1. API Gateway or the entry service records the start time = t0
  2. Calculates the deadline = t0 + 10,000ms
  3. Passes the deadline in a header: X-Request-Deadline: 1711353645231 (unix ms)
  
  Every downstream service:
  4. Reads X-Request-Deadline from the incoming request
  5. Calculates remaining_time = deadline - System.currentTimeMillis()
  6. If remaining_time <= 0: immediately return error ("request expired before we started")
  7. Sets its OWN outgoing timeout to min(remaining_time, configured_service_timeout)
  8. Passes X-Request-Deadline unchanged to the next service
  
  Result:
    t=0ms:    OrderService: deadline=10000ms, remaining=10000ms, uses 10s timeout
    t=100ms:  InventoryService: deadline=10000ms, remaining=9900ms, uses 9.9s timeout
    t=250ms:  SupplierService: deadline=10000ms, remaining=9750ms, uses 9.75s timeout
    
    External API takes forever:
    t=9750ms: SupplierService timeout fires (remaining was 9.75s when it started)
    t=9850ms: InventoryService timeout fires (it had 9.9s)
    t=10000ms: OrderService timeout fires
    
    All services give up AT APPROXIMATELY THE SAME TIME.
    No wasted work after the outer deadline passes.

gRPC does this natively — the deadline is built into the RPC protocol itself.
For REST, you implement it manually via request headers.
```

### The Timeout Value Problem — What Number to Use?

```
How to choose a timeout value:
  1. Measure the p99 latency of the dependency under normal load
     (99th percentile — the slowest 1% of normal requests)
  
  2. Set timeout = p99 × 1.5 to 2.0 as a starting point
     Example: InventoryService p99 = 150ms → initial timeout = 250-300ms
  
  3. Monitor and adjust:
     If timeouts fire frequently with healthy services → timeout is too tight, loosen it
     If slow services block for too long → timeout is too loose, tighten it

  NEVER use infinite timeout (missing config = infinite in most HTTP clients).
  NEVER set all timeouts to the same value "for simplicity" — each operation has its own SLA.
  
  Recommended defaults:
  - Simple read/lookup:     2-5 seconds
  - Write operations:       5-15 seconds
  - Report/aggregation:     15-30 seconds
  - Data export/migration:  1-5 minutes (with async processing preferred)
```

---

## 4. The Code

### Wrong Way — No Timeout or Single Misconfigured Timeout
```java
// WRONG — no timeout configured (defaults to infinite in most implementations)
@Configuration
public class BadWebClientConfig {

    @Bean
    public WebClient webClient() {
        return WebClient.builder()
            .baseUrl("http://inventory-service")
            .build();
        // No timeout: a slow InventoryService will block this thread indefinitely
    }
}
```
> **Why this fails in production:** A slow or hung downstream service will hold all Tomcat/Reactor threads. Once all threads are blocked, new requests cannot be processed and the service appears completely dead — a downstream problem becomes your problem.

### Right Way — All Timeout Layers Configured
```java
// CORRECT — configure connection AND read timeouts at the TCP level,
// plus a response timeout at the WebClient level

@Configuration
public class WebClientConfig {

    @Value("${http.client.connect-timeout-ms:3000}")
    private int connectTimeoutMs;

    @Value("${http.client.read-timeout-ms:10000}")
    private int readTimeoutMs;

    @Bean
    public WebClient inventoryServiceClient() {
        // Netty HTTP connector with TCP-level timeouts
        HttpClient httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
            .responseTimeout(Duration.ofMillis(readTimeoutMs))
            .doOnConnected(conn ->
                conn.addHandlerLast(new ReadTimeoutHandler(readTimeoutMs, TimeUnit.MILLISECONDS))
                   .addHandlerLast(new WriteTimeoutHandler(5000, TimeUnit.MILLISECONDS))
            );

        return WebClient.builder()
            .baseUrl("http://inventory-service")
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();
    }
}
```

### Deadline Propagation via Request Header
```java
// Filter that reads or generates a request deadline and passes it downstream
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class DeadlineFilter extends OncePerRequestFilter {

    private static final String DEADLINE_HEADER = "X-Request-Deadline";
    private static final long DEFAULT_BUDGET_MS = 10_000; // 10-second default total budget

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain chain) throws ServletException, IOException {
        String existingDeadline = request.getHeader(DEADLINE_HEADER);
        long deadline;

        if (existingDeadline != null) {
            deadline = Long.parseLong(existingDeadline);
            long remaining = deadline - System.currentTimeMillis();
            if (remaining <= 0) {
                // Request has already expired before we even started processing it
                log.warn("Request deadline expired before processing. Returning 408.");
                response.setStatus(HttpStatus.REQUEST_TIMEOUT.value());
                return;
            }
        } else {
            // First service in the chain — set the deadline
            deadline = System.currentTimeMillis() + DEFAULT_BUDGET_MS;
        }

        // Store deadline in request attribute so WebClient filter can read it
        request.setAttribute(DEADLINE_HEADER, deadline);
        response.setHeader(DEADLINE_HEADER, String.valueOf(deadline));

        chain.doFilter(request, response);
    }
}

// WebClient ExchangeFilterFunction — propagates deadline in outgoing calls
@Component
public class DeadlinePropagationFilter implements ExchangeFilterFunction {

    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        return Mono.deferContextual(ctx -> {
            Long deadline = ctx.getOrDefault("X-Request-Deadline", null);
            if (deadline != null) {
                long remaining = deadline - System.currentTimeMillis();
                if (remaining <= 0) {
                    return Mono.error(new RequestDeadlineExpiredException("Request deadline exceeded"));
                }

                // Pass deadline header AND set per-call timeout to the remaining budget
                ClientRequest mutated = ClientRequest.from(request)
                    .header("X-Request-Deadline", String.valueOf(deadline))
                    .build();

                return next.exchange(mutated)
                    .timeout(Duration.ofMillis(remaining));  // Dynamic timeout based on remaining budget
            }
            return next.exchange(request);
        });
    }
}
```

### HikariCP + Database Timeouts
```yaml
# application.yml — ALL resource pool timeouts configured
spring:
  datasource:
    hikari:
      # How long to wait for a connection from the pool (when pool is exhausted)
      connection-timeout: 5000        # 5 seconds — fail fast rather than queue up
      # How long an idle connection stays in pool before being dropped
      idle-timeout: 600000            # 10 minutes
      # Max lifetime of any connection (prevents stale connections)
      max-lifetime: 1800000           # 30 minutes
      # How long to wait for the pool to initialise on startup
      initialization-fail-timeout: 10000
      # Number of connections — tune based on DB capacity, not arbitrary
      maximum-pool-size: 20
      minimum-idle: 5

  # JPA query timeout — Postgres/MySQL kills queries running longer than this
  jpa:
    properties:
      jakarta:
        persistence:
          query:
            timeout: 30000  # 30 seconds — prevents runaway queries from holding DB threads
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why do you need timeouts in microservices?"

**Hruday's answer:**
> Without timeouts, a slow or unresponsive downstream service can freeze your entire service. Here's why: every incoming HTTP request to your service runs on a thread. That thread calls the downstream service and waits. If the downstream never responds, the thread blocks forever. Since thread pools are finite — typically 200 threads by default in Spring Boot — after 200 simultaneous slow requests, your entire thread pool is full. No new requests can be handled. Your service appears completely dead to callers, even though YOUR code is perfectly fine — the problem is entirely with the downstream service.
>
> Timeouts prevent this by setting a maximum wait time. After that limit, the thread gives up, returns an error, and becomes available for the next request. Combined with a fallback — serve cached data, return a partial response, or return a clear error — timeouts give your service resilience against slow dependencies. They don't fix the downstream service, but they prevent that one slow dependency from taking the entire system down.

---

### Q2 — Cascading Timeouts
**Interviewer asks:** "What is the cascading timeout problem and how do you solve it?"

**Hruday's answer:**
> The cascading timeout problem happens when you set independent timeouts on each hop in a multi-service call chain. Say OrderService calls InventoryService calls SupplierService, each with a 30-second timeout. The total time the end user might wait is up to 90 seconds — three independent 30-second timeouts in series. But the outer caller might time out at 30 seconds and tell the user "request failed," while InventoryService and SupplierService are STILL doing work for another 60 seconds. Doing work for a request that was already abandoned — wasted threads, DB connections, CPU.
>
> The solution is deadline propagation. The first service in the chain calculates an absolute deadline — current time plus total budget (say 10 seconds). It passes this deadline as a request header: X-Request-Deadline. Every downstream service reads this header, calculates how much time is left, and sets its OWN dynamic timeout to that remaining time. When the budget is exhausted, every service in the chain times out at approximately the same moment and stops work together.
>
> gRPC does this natively — deadlines are a first-class concept. For HTTP/REST, you implement it manually with a request header and a WebClient filter that dynamically sets the timeout per outgoing call based on the remaining budget.

---

### Q3 — Timeout Values
**Interviewer asks:** "How do you decide what value to set for a timeout?"

**Hruday's answer:**
> The starting point is measurement, not guessing. I look at the p99 latency of the dependency under normal production load — the 99th percentile of response times when the service is healthy. Setting the timeout at p99 × 1.5 to 2.0 means normal requests succeed, and only genuinely slow outliers get cut off.
>
> For example: if InventoryService responds in < 100ms for 99% of requests, I'd set a 150-200ms timeout. If it occasionally does larger batch lookups that take up to 2 seconds, I'd set 3 seconds for those specific endpoints.
>
> The key is: different operations need different timeouts. A simple GET lookup should time out in 2-5 seconds. A write operation with database involvement: 5-15 seconds. A report that aggregates large datasets: 30 seconds, but better handled async with a polling pattern anyway.
>
> I also set differently per environment: local development can have longer timeouts (things run slower on a laptop), but production should be tight based on measured SLAs. I wire timeout values to configuration (not hardcoded), so I can tune without redeployment.

---

### Q4 — System Design: Timeout in a Payment Service
**Interviewer asks:** "In a payment service, how would you handle timeouts to external payment gateways like Stripe or Razorpay?"

**Hruday's answer:**
> Payment gateway calls are especially tricky because timeouts here have financial implications — a timeout doesn't tell you whether the charge succeeded or failed on the gateway side. If you time out after 30 seconds but the gateway actually processed the charge, and you retry, you might double-charge the user.
>
> My approach: first, set a tight connection timeout (3s — if we can't connect, something is wrong with the gateway) and a more generous read timeout (15-30s — gateway processing can legitimately take time). If the read timeout fires, I do NOT immediately retry. I enter an "unknown outcome" flow.
>
> Every payment request is assigned a unique idempotency key before calling the gateway. If the call times out, I store the payment as "PENDING_VERIFICATION" and start an async polling job that calls the gateway's status endpoint using the same idempotency key. Once I confirm whether it charged or not (typically within a minute), I update the payment status and notify the user.
>
> If the gateway is fully unreachable, the circuit breaker (paired with Resilience4j) opens after several consecutive failures and I stop sending requests — serving a clear "gateway unavailable" error immediately instead of making users wait 15 seconds each time. These two patterns together — idempotent retry with status polling + circuit breaker — handle payment gateway timeouts safely at production scale.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Set a long timeout to be safe" | "I'll use 60 seconds so requests have plenty of time" | "A 60-second timeout means each thread can be held for 60 seconds on a slow downstream. At 10 requests/second, your 200-thread pool exhausts in 20 seconds. A 5-second timeout gives the same 200 threads 40x more headroom — 200 threads × 5 seconds = 1000 concurrent request slots vs 200 × 60 = the same threads but blocked 12x longer. Tight timeouts with good fallbacks are more available than generous timeouts with no fallback." |
| "One timeout setting is enough" | "Just configure the WebClient timeout and you're done" | "There are at least four independent layers: TCP connection timeout, HTTP read timeout, HikariCP connection pool timeout, and database statement timeout. If you only set the WebClient level, requests can still be blocked at the database query level (a slow JPA query) or at the pool level (all 20 DB connections in use). Each layer must be configured independently — an unset timeout is infinite by default in most frameworks." |
| "Retry after a timeout" | "If it times out, just retry 3 times" | "Retrying blindly after a timeout is dangerous for non-idempotent operations. A POST to create a payment, a PUT to update stock — these might have partially succeeded on the server. Retrying creates duplicates. Always check: is this operation idempotent? If not, use an idempotency key and verify-before-retry pattern. For GET requests and read operations, retry with exponential backoff is safe. For writes, require idempotency first." |
| "Timeout = circuit breaker" | "Timeout and circuit breaker are the same thing" | "They're different and complementary. Timeout says: 'I'll wait at most X seconds for this one call.' Circuit breaker says: 'After several calls in a row have timed out or failed, I'll stop calling entirely for a period.' Timeout prevents individual thread blocking. Circuit breaker prevents the system from hitting a known-broken dependency repeatedly. You need both — timeout catches slow calls, circuit breaker prevents you from wasting time attempting calls to a service you already know is down." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, the Spring Boot REST APIs I worked on called several internal Oracle services — master data lookups, currency conversion, and status checks. I've seen what happens when one of those internal services gets slow during peak load: the calling service's thread pool fills up, response times on unrelated endpoints shoot up, and the service starts returning 503s for everything. The fix was not code — it was adding proper connection and read timeouts with fallback responses. After applying 5-second timeouts with cached fallbacks, the service stayed responsive even when the dependency was down. I'm now applying deadline propagation patterns for the multi-hop chains in microservices architecture to ensure the entire chain respects a bounded time budget."

---

## 8. Scale Evolution

**Low volume (< 1,000 req/s):** Set per-service timeouts on WebClient and HikariCP. A simple fixed timeout is enough. Fallback can be a logged error + retry.

**Medium volume (1,000-10,000 req/s):** Add deadline propagation — pass remaining budget through the call chain. Thread pool exhaustion becomes a real risk, so timeouts must be tight. Add Resilience4j `@TimeLimiter` as a safety net alongside WebClient timeouts.

**High volume (> 10,000 req/s):** Move to reactive (WebFlux) to avoid thread-per-request model entirely — reactive non-blocking code does not exhaust a fixed thread pool the same way. Timeouts in WebFlux are `.timeout(Duration.of...)` on the Mono/Flux. Deadline propagation is critical at this scale — wasted work after budget expiry costs real money.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment gateway calls to external providers (Visa, Mastercard, bank APIs) must have tight timeouts with idempotency — a timed-out payment must be verified, not blindly retried. | "How do you handle a timeout on a payment gateway call?" |
| Swiggy / Meesho | Restaurant availability and menu checks during order placement must respond fast. If a restaurant's backend is slow, the timeout prevents one restaurant's latency from degrading all order placements. | "A restaurant's API is responding in 15 seconds. How does that affect other orders?" |
| Adobe / Microsoft | Document processing pipelines (PDF generation, image transcoding) are long-running. Synchronous timeouts must transition to async with polling — directly tests timeout design thinking. | "How would you handle a file conversion that might take 2 minutes?" |
| SAP Labs (current) | SAP BTP microservices call SAP backend systems (S/4HANA APIs) that can be slow under load. Timeout configuration is a real production concern in the SAP integration context. | "How do you handle slow S/4HANA API calls without blocking your BTP microservice?" |

---

## 10. Related Topics — What to Study Next

- **Topic 71 — Circuit Breaker (Resilience4j)** — timeouts detect that a call is slow; circuit breakers detect that calls are CONSISTENTLY failing and stop calling the broken dependency entirely; they work together as a resilience pair
- **Topic 72 — Retry with Exponential Backoff** — after a timeout, you might want to retry; understanding when retrying is safe (idempotent reads) vs dangerous (non-idempotent writes) prevents double-charge bugs
- **Topic 73 — Bulkhead Pattern** — bulkheads limit the number of concurrent calls to a dependency; combined with tight timeouts, they prevent any one slow dependency from consuming all available threads
- **Topic 85 — Health Checks and Readiness Probes** — when timeout rates for a critical dependency rise above a threshold, the service should mark itself not-ready; integrating circuit breaker state with readiness probes makes K8s aware of application-level health

---

*Part 4 · Timeout Strategies · Full Stack Interview Guide · Hruday D · 2026*
