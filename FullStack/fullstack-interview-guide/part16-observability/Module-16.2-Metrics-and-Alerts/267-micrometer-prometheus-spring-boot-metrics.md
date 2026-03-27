# Micrometer + Prometheus — Spring Boot Metrics
> Part 16 — Observability & Monitoring
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card

- **Micrometer** = metrics instrumentation facade for Java (same concept as SLF4J for logging); vendor-neutral; write `counter.increment()` once, export to Prometheus OR Datadog OR CloudWatch with a config change — no code change
- **Prometheus** = pull-based time-series metrics database; scrapes `/actuator/prometheus` endpoint every 15-30 seconds; stores as float64 `(labels, timestamp, value)` tuples; powerful query language: PromQL
- **Four Prometheus metric types**:
  - **Counter**: monotonically increasing count (requests served, orders placed, errors); never decreases; useful for rates: `rate(http_requests_total[5m])` = requests/second over 5 minutes
  - **Gauge**: instantaneous value that can go up and down (active threads, queue depth, memory used, current temperature)
  - **Histogram**: samples observations into configurable buckets + count + sum; `histogram_quantile(0.99, ...)` computes P99 latency from buckets; configuring correct buckets for your SLOs matters
  - **Summary**: similar to Histogram but quantiles computed on the client; NOT compatible with aggregation across instances — use Histogram instead in distributed systems
- **Spring Boot Actuator** auto-registers: JVM metrics (memory, GC pauses, thread counts), database connection pool (HikariCP), HTTP server metrics (request count, error rate, duration histogram), and Kafka consumer lag — all from the `micrometer-registry-prometheus` dependency alone
- **Custom metrics**: `MeterRegistry` bean; `Counter.builder("orders.created").tag("type", order.getType()).register(registry).increment()` for domain events; `Timer.builder("checkout.duration").register(registry).record(duration, MILLISECONDS)` for operation timing
- **Label (tag) cardinality**: NEVER use high-cardinality labels (userId, orderId, email as label values); each unique label combination creates a new time series; 1 million users × 5 metrics = 5 million time series → Prometheus OOM; use labels only for low-cardinality values (HTTP method, status code, endpoint path template NOT actual values, order type)

---

## 1. One-Line Definition
Micrometer provides vendor-neutral metrics instrumentation for Spring Boot, and Prometheus scrapes and stores those metrics as time-series data, enabling real-time and historical monitoring of application health, performance, and business KPIs.

---

## 2. The Problem It Solves

Logs tell you what happened to specific requests. Traces tell you the timing for specific requests. But to answer "Is the system healthy right now?" you need aggregates:
- What is the current request rate? Is it normal?
- What percentage of requests are errors right now?
- What is the P99 latency for the checkout API in the last 5 minutes?
- How many messages are queued in Kafka that haven't been processed yet?
- Is the HikariCP connection pool nearly exhausted (a leading indicator of request timeouts)?

These questions require metrics — numeric measurements over time. One log event per request doesn't help; you need "total request count in the last 5 minutes" as a time-series. Prometheus is built exactly for this.

---

## 3. How It Works Internally

### The Pull Model

```
Spring Boot Service
  │  micrometer builds & stores metrics in memory
  │  /actuator/prometheus endpoint formats metrics in Prometheus text format:
  │
  │  # HELP http_server_requests_seconds_count
  │  http_server_requests_seconds_count{method="POST",status="200",uri="/api/orders"} 12453
  │  http_server_requests_seconds_sum{method="POST",status="200",uri="/api/orders"} 2481.5
  │  ...
  ▼
Prometheus Server (every 15-30 seconds)
  │  scrapes /actuator/prometheus
  │  stores as time-series: (metric_name, labels, timestamp, value)
  │  TSDB retention: 15 days local (then remote write to Thanos/Cortex for long-term)
  ▼
Grafana (reads from Prometheus via PromQL)
  │  Dashboard: request rate, error rate, P99 latency, queue depth
  │  Alert: P99 > 500ms for 5 minutes → fire to PagerDuty
```

### Key PromQL Patterns

```promql
# Request rate (per second, last 5 minutes)
rate(http_server_requests_seconds_count{uri="/api/orders"}[5m])

# Error rate (%)
rate(http_server_requests_seconds_count{status=~"5.."}[5m])
/ 
rate(http_server_requests_seconds_count[5m])
* 100

# P99 latency from histogram (must use histogram, not summary, for this)
histogram_quantile(
  0.99,
  sum(rate(http_server_requests_seconds_bucket{uri="/api/checkout"}[5m])) by (le)
)

# HikariCP connection pool utilization
hikaricp_connections_active / hikaricp_connections_max

# Kafka consumer lag
kafka_consumer_lag_max{consumer_group="order-processor"}

# JVM heap usage
jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"}
```

---

## 4. The Code

### Wrong Way — High-Cardinality Labels and Missing SLO-Aligned Buckets

```java
// ❌ WRONG 1: High-cardinality label — destroys Prometheus

@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final MeterRegistry registry;
    
    public OrderResponse createOrder(OrderRequest request) {
        // ❌ userId as a label = one time series PER USER
        // With 1 million users, this creates 1 million separate time series
        // Prometheus stores all active time series in memory
        // Result: Prometheus OOM, cardinality explosion, unusable metrics
        Counter.builder("orders.created")
            .tag("userId", request.getUserId())  // ← HIGH CARDINALITY — NEVER DO THIS
            .tag("orderId", String.valueOf(orderId))  // ← ALSO HIGH CARDINALITY
            .register(registry)
            .increment();
        
        // ❌ Also wrong: status code as a free-form string, not an enum/constant
        // Different spellings = multiple label values for the same concept
        Counter.builder("orders.created")
            .tag("status", "success / SUCCESS / Success / ok")  // ← inconsistent
            .register(registry)
            .increment();
        
        return processOrder(request);
    }
}
```

```java
// ❌ WRONG 2: Timer without histogram (using Summary instead)
// Summaries cannot be aggregated across multiple instances
// If you have 3 pods, Prometheus can't compute the GLOBAL P99 from 3 per-pod Summaries

Timer orderDuration = Timer.builder("order.create.duration")
    // ❌ publishPercentiles computes quantiles ON THE CLIENT (Summary behavior)
    // Cannot aggregate across JVM instances
    .publishPercentiles(0.5, 0.95, 0.99)
    .register(registry);

// With 3 pods each reporting P99=200ms, 300ms, 250ms:
// The global P99 is NOT (200+300+250)/3 = 250ms
// You can't compute the real global P99 without all raw data
// Use publishPercentileHistogram() instead → sends buckets to Prometheus
//                                           → prometheus histogram_quantile() computes correctly
```

### Right Way — Production-Ready Metrics

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <!-- Micrometer Prometheus registry — all auto-configured metrics exposed at /actuator/prometheus -->
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

```yaml
# ✅ application.yml — Actuator and Prometheus configuration

management:
  endpoints:
    web:
      exposure:
        include: health, info, prometheus, metrics
        # ← expose /actuator/prometheus for Prometheus scraping
        # Do NOT expose shutdown, env, configprops in production
  endpoint:
    health:
      show-details: when-authorized   # ← don't expose DB/Redis status publicly
  metrics:
    tags:
      application: ${spring.application.name}  # ← add app name to every metric
      environment: ${SPRING_PROFILES_ACTIVE}    # ← add environment (prod/staging)
    distribution:
      percentiles-histogram:
        # ✅ Enable histogram for Prometheus histogram_quantile() to work correctly
        # These endpoints need SLO-aligned buckets for P95/P99 alerting
        "[http.server.requests]": true
        "[order.create.duration]": true
      # ✅ SLO-aligned buckets (must match your SLO: "P99 < 500ms")
      # Default Spring Boot buckets may not align with your SLOs
      slo:
        "[http.server.requests]": 50ms, 100ms, 200ms, 500ms, 1s, 2s, 5s
        "[order.create.duration]": 100ms, 250ms, 500ms, 1s, 2s

spring:
  application:
    name: order-service
```

```java
// ✅ RIGHT — Custom business metrics with correct label cardinality

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {
    
    private final MeterRegistry registry;
    private final Counter ordersCreatedCounter;      // pre-built for performance
    private final Counter ordersFailedCounter;
    private final Timer orderCreateTimer;
    
    @PostConstruct
    public void initMetrics() {
        // ✅ Pre-register counters (thread-safe, lookup once at startup)
        // Repeated Counter.builder().register() lookups are slow if done per-request
        this.ordersCreatedCounter = Counter.builder("orders.created.total")
            // ✅ Only LOW-CARDINALITY labels:
            // orderType has ~5 possible values: STANDARD, EXPRESS, SAME_DAY, SCHEDULED, GIFT
            .description("Total orders successfully created")
            .tag("orderType", "UNKNOWN")  // ← will be replaced per call with withTags()
            .register(registry);
        
        this.ordersFailedCounter = Counter.builder("orders.failed.total")
            .description("Total failed order creation attempts")
            .tag("reason", "UNKNOWN")     // ← STOCK_UNAVAILABLE, PAYMENT_FAILED, VALIDATION_ERROR
            .register(registry);
        
        // ✅ Timer with histogram for accurate P99 across multiple instances
        this.orderCreateTimer = Timer.builder("order.create.duration")
            .description("Time taken to create an order")
            .publishPercentileHistogram()  // ← send histogram buckets to Prometheus
            .register(registry);
    }
    
    public OrderResponse createOrder(OrderRequest request) {
        return orderCreateTimer.recordCallable(() -> {
            // ✅ Timer.recordCallable() measures the whole block automatically
            log.info("Order creation started");
            
            try {
                boolean stockAvailable = inventoryClient.checkStock(request.getItems());
                if (!stockAvailable) {
                    // ✅ Low-cardinality reason tag (STOCK_UNAVAILABLE, PAYMENT_FAILED, etc.)
                    registry.counter("orders.failed.total", 
                        "reason", "STOCK_UNAVAILABLE").increment();
                    throw new InsufficientStockException();
                }
                
                Order order = orderRepository.save(new Order(request));
                
                // ✅ LOW CARDINALITY: orderType is an enum (5 known values)
                registry.counter("orders.created.total",
                    "orderType", order.getType().name()).increment();
                
                log.info("Order created");
                return OrderResponse.from(order);
                
            } catch (InsufficientStockException e) {
                throw e;  // already counted above
            } catch (Exception e) {
                registry.counter("orders.failed.total",
                    "reason", "UNEXPECTED_ERROR").increment();
                log.error("Order creation failed", e);
                throw new OrderCreationException("Failed to create order", e);
            }
        });
    }
}
```

```java
// ✅ RIGHT — Gauge for queue depth and connection pool monitoring

@Component
@RequiredArgsConstructor
public class BusinessMetrics {
    
    private final MeterRegistry registry;
    private final OrderRepository orderRepository;
    
    @PostConstruct
    public void registerGauges() {
        // ✅ Gauge for pending orders queue depth
        // Gauge directly reads a supplier on each Prometheus scrape
        // Useful as a leading indicator: if pending orders spike, something is wrong
        Gauge.builder("orders.pending.count", orderRepository, repo -> 
                repo.countByStatus(OrderStatus.PENDING))
            .description("Number of orders in PENDING state")
            .register(registry);
        
        // ✅ Active Kafka consumer lag via Micrometer KafkaMetrics auto-config
        // Spring Kafka auto-registers kafka_consumer_lag_sum and kafka_consumer_lag_max
        // when micrometer-core is on the classpath — no code needed
    }
}
```

```java
// ✅ RIGHT — Prometheus scrape endpoint security
// /actuator/prometheus must be secured — don't expose to the public internet

@Configuration
public class ActuatorSecurityConfig {
    
    @Bean
    @Order(1)
    public SecurityFilterChain actuatorSecurity(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/actuator/**")
            .authorizeHttpRequests(auth -> auth
                // ✅ Health endpoint: accessible without auth (K8s liveness/readiness probes need this)
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                // ✅ Prometheus metrics: require an internal network IP or basic auth
                // In K8s, network policy restricts /actuator/prometheus to Prometheus pod only
                .requestMatchers("/actuator/prometheus").hasRole("ACTUATOR")
                // ✅ All other actuator endpoints: restrict to admin
                .anyRequest().hasRole("ADMIN")
            )
            .httpBasic(Customizer.withDefaults());
        return http.build();
    }
}
// ✅ In Kubernetes: NetworkPolicy restricts /actuator/prometheus access to Prometheus pod
// so you don't need to expose it to the internet at all
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Micrometer and why is it used instead of the Prometheus Java client directly?"

**Hruday's answer:**
> Micrometer is a metrics instrumentation facade — the same idea as SLF4J for logging. You write your instrumentation code once using Micrometer's API (`Counter`, `Timer`, `Gauge`), and then you configure which metrics backend (or "registry") to export to. That could be Prometheus, Datadog, AWS CloudWatch, Azure Monitor, or any other supported system, purely through configuration.
>
> If you use the Prometheus Java client directly, your code is coupled to Prometheus. If your company later adopts Datadog or your service gets moved to a different cloud with a different metrics stack, you have to rewrite your instrumentation code.
>
> Spring Boot auto-configures Micrometer. Adding `micrometer-registry-prometheus` to dependencies makes Spring Boot automatically export JVM metrics, HTTP request metrics, database connection pool metrics, and Kafka consumer lag metrics to `/actuator/prometheus` without any code changes. Adding `micrometer-registry-datadog` instead (or in addition) sends those same metrics to Datadog. The application code never changes.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why should you never use a userId or orderId as a Prometheus label?"

**Hruday's answer:**
> Prometheus stores every unique combination of metric name + label values as a separate time series in memory. This is called cardinality.
>
> For a label like `status_code`, there are 5-10 possible values (200, 201, 400, 401, 403, 404, 500, 502, 503). So one metric with this label creates 5-10 time series. That's fine.
>
> For a label like `userId`, there are as many values as users — potentially millions. `orders.created.total{userId="usr-001"}`, `orders.created.total{userId="usr-002"}`, etc. — each is a separate time series. With 1 million users, one counter metric creates 1 million time series. Prometheus stores all active time series in memory; at some point you hit out-of-memory and Prometheus crashes. I've seen this happen.
>
> The principle: labels should only hold values with known, bounded low cardinality — typically categorical values with fewer than 1,000 distinct values. Order type (5-10 values), response status code (< 20 values), payment method (CARD, UPI, NETBANKING — 3-5 values) are good labels. For high-cardinality data like user IDs or order IDs, use structured logging or distributed tracing — those systems are designed for it.

---

### Q3 — System Design
**Interviewer asks:** "How would you define and monitor an SLO for the checkout API?"

**Hruday's answer:**
> An SLO for checkout might be: "99.9% of checkout requests complete successfully in under 500ms over any 28-day window."
>
> This is two constraints: error rate and latency.
>
> For error rate: Prometheus counter `http_server_requests_seconds_count` with labels `uri="/api/checkout"` and `status=~"5.."` for errors. Error rate SLO = `rate(errors[28d]) / rate(total[28d]) < 0.001` (0.1%). The Grafana alert fires when error rate exceeds 0.1%.
>
> For latency: I need a histogram with SLO-aligned buckets. In `application.yml`, I configure `slo: "[http.server.requests]": 50ms, 100ms, 200ms, 500ms, 1s`. The 500ms bucket is the key one. The SLO is `histogram_quantile(0.99, ...) < 0.5` (under 500ms). If P99 exceeds 500ms for more than 5 consecutive minutes, an alert fires.
>
> The 28-day window is computed using Prometheus recording rules that maintain a rolling window for the rate. For multi-window alerting (fast burn rate = high urgency, slow burn rate = low urgency), the Google SRE error budget model uses 1-hour and 6-hour windows to detect both sudden spikes and slow degradation.
>
> At SAP Labs, we defined SLOs for checkout (P99 < 500ms, error rate < 0.1%) and displayed the error budget burn rate on a Grafana dashboard. When the burn rate exceeded 2x in any 1-hour window, the on-call was paged directly.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We use REST endpoints to push metrics to Prometheus" | "We send metrics to Prometheus by posting to its API" | Prometheus is a PULL-based system; it scrapes your endpoint — you don't push to it; the push model is for short-lived jobs where Prometheus may not be able to scrape in time (use Prometheus Pushgateway for these), but for long-running services, Prometheus scrapes `/actuator/prometheus` every 15-30 seconds; the pull model is architecturally significant: if your service is down, Prometheus can detect it via scrape failures; if you were pushing, a dead service simply stops sending data and the absence is harder to detect reliably |
| "Summary and Histogram are interchangeable" | "I use publishPercentiles for histogram metrics" | `publishPercentiles(0.99)` configures a Summary — quantiles computed in the JVM; these CANNOT be aggregated across service instances in Prometheus; with 3 pods, their three P99 values cannot be mathematically combined to give the global P99 without the raw distribution data; `publishPercentileHistogram()` configures a Histogram — bucket counts exported to Prometheus; `histogram_quantile(0.99, sum(rate(buckets[5m])) by (le))` correctly aggregates buckets from all instances to give the true global P99; for any microservice with more than one instance, always use `publishPercentileHistogram()` |
| Micrometer is only for HTTP metrics | "Spring Boot auto-instruments HTTP endpoints, but custom metrics need manual setup" | Micrometer auto-instruments far beyond HTTP: HikariCP connection pool (active connections, pending threads, pool utilization), JVM memory (heap used/max, non-heap), JVM GC (pause time, count per GC type — G1 Young, G1 Old, ZGC cycles), thread counts (daemon/non-daemon/peak), Spring Kafka consumer lag, Spring Batch job execution timing, Spring Scheduler execution timing, and Spring Web client (WebClient/RestTemplate outbound calls); the JVM memory and GC metrics are often the first indicators of memory leaks and GC pressure before they cause latency spikes |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we started getting user reports of the dashboard loading slowly, but there were no ERROR logs, and our P50 latency was normal. The problem was invisible until I added `publishPercentileHistogram()` to the dashboard API timer and built a Grafana panel with `histogram_quantile(0.99, ...)`.
>
> The P99 was 3.2 seconds — visible only in the 99th percentile. Users hitting the slow path were those with large product catalogues. Looking at the HikariCP gauge (`hikaricp_connections_pending`), I could see the connection pool had 0 pending during the slow periods, so it wasn't a connection pool issue.
>
> Then I added a custom Gauge: `Gauge.builder('catalog.size', catalogRepository, r -> r.countByAccountId(accountId))`. On the Grafana dashboard, the correlation was immediate: large catalogue size → high P99 latency. The root cause: the dashboard query was loading the full catalogue in memory to paginate it, instead of using `LIMIT/OFFSET` in the SQL query.
>
> Without the histogram-based P99 panel, we were looking at averages and seeing nothing. The Gauge on catalogue size provided the correlation. Structured observations + the right metric type made the diagnosis possible."

---

## 8. Scale Evolution

**1,000 users →** `micrometer-registry-prometheus` added. Prometheus scrapes `/actuator/prometheus` every 15 seconds. Auto-instrumented JVM + HTTP metrics visible in Grafana. Sufficient for a production team to answer "is the system healthy?" in real time.

**100,000 users →** Custom business metrics (orders.created.total, payments.processed.total, checkout.duration histogram). Recording rules in Prometheus for 5-min rate aggregates. Alert rules for error rate > 1% or P99 > 500ms. Grafana dashboards per service.

**10 million users →** Prometheus federation or Thanos for long-term metric storage (beyond Prometheus's 15-day default). Recording rules for 28-day SLO window. Alert routing by service and severity to PagerDuty vs Slack. Prometheus Pushgateway for batch job metrics. Per-service cardinality monitoring dashboard to catch label explosion early.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | SLO for payment processing API (P99 < 500ms, error < 0.01%); HikariCP gauge as leading indicator before timeout storms; Kafka consumer lag gauge for real-time payment processing pipeline health | SLO-aligned metric design; HikariCP monitoring; Kafka lag as business health indicator |
| Swiggy / Meesho | Order rate as a business metric (orders/minute is a real-time business KPI); checkout P99 for Flash Sale preparation; notification service Kafka consumer lag for real-time order status | Business KPIs as Prometheus metrics; Flash Sale pre-validation with metrics |
| Adobe / Microsoft | Document processing throughput (documents/minute); processor queue depth gauge; error rate by document type (PDF vs DOCX vs images) — all low-cardinality labels; Azure Monitor as alternative backend | Batch job metrics; Azure Monitor vs Prometheus; document processing SLOs |
| SAP Labs | Dashboard P99 visible only via histogram; HikariCP correlation with query behavior; direct story of metric type selection (Summary → Histogram) enabling a diagnosis that averages missed | P99 vs average distinction with real impact; histogram vs summary decision; Gauge-to-SQL correlation |

---

## 10. Related Topics — What to Study Next

- **Topic 268 — Grafana Dashboards** — Prometheus stores metrics data; Grafana is where you visualize it; a Prometheus PromQL query become a Grafana panel; the SLO-based alert rules (P99 > 500ms for 5 minutes) are defined in Grafana Alerting or Prometheus rules and delivered via PagerDuty; Topic 268 covers the practical dashboard design
- **Topic 266 — Distributed Tracing** — Metrics tell you your P99 is 3.2 seconds; distributed tracing tells you WHICH span caused the 3.2 seconds; both are required for a complete observability story; the typical debugging flow: see the P99 spike in Grafana (metrics), then dive into Jaeger to find the specific slow trace (tracing), then check logs for the root cause detail (logging) — this is the "three pillars of observability" in action
- **Topic 270 — Alert Strategy** — metrics drive alerts; the Prometheus `alert.rules` file or Grafana alert conditions use PromQL expressions to define when to page; topic 270 covers SLO error budget burn rate alerting, severity routing, and avoiding alert fatigue from poorly designed alert thresholds

---

*Part 16 · Micrometer + Prometheus — Spring Boot Metrics · Full Stack Interview Guide · Hruday D · 2026*
