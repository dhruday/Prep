# Spring Boot Actuator — Health, Metrics, Endpoints
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Spring Boot Actuator exposes over 20 built-in HTTP endpoints to monitor, inspect, and manage a running Spring Boot application
- `/actuator/health` — reports if the app is alive; Kubernetes uses this for readiness/liveness probes
- `/actuator/metrics` — JVM memory, HTTP request counts, GC pauses, custom metrics via Micrometer
- `/actuator/env` — shows all configuration properties (sensitive! secure this endpoint)
- By default, only `/health` and `/info` are exposed over HTTP — you explicitly expose others
- Gap to bridge: Actuator integrates with **Micrometer**, which is a metrics facade that exports to Prometheus, Datadog, CloudWatch — knowing this is the production monitoring stack

---

## 1. One-Line Definition
Spring Boot Actuator adds production-ready monitoring endpoints to your application — health checks, metrics, environment inspection, and more — without you writing any monitoring code yourself.

---

## 2. The Problem It Solves

You deploy a Spring Boot service to a Kubernetes cluster. Kubernetes needs to know: is this instance healthy? Is it ready to receive traffic? Has it been running long enough to start up? Without health endpoints, Kubernetes cannot make these decisions.

Your operations team needs to know: is the database connection pool saturated? Is the JVM running out of heap space? Are there slow HTTP endpoints? Without metrics endpoints, they fly blind until the app crashes.

Your oncall engineer at 2am needs to know: what is the current configuration of the running instance? Is it using the prod database URL or the staging one? Without an environment endpoint, they must SSH into the container and inspect environment variables — slow and error-prone.

Spring Boot Actuator solves all of this. One dependency gives you health checks (for Kubernetes), metrics (for Prometheus/Grafana), environment inspection (for debugging), thread dumps (for deadlock diagnosis), and more — immediately usable with zero custom code.

---

## 3. How It Works Internally

### The Mental Model
Think of Actuator as a built-in command centre for your running app. From the outside (HTTP), you can ask questions: "Are you healthy?" "How many requests have you processed?" "What JVM flags are you using?" The app answers in real time. This is the same data you would normally get from a JMX client or SSH + shell commands, but now it is available as REST API — queryable by Kubernetes, Prometheus, or your monitoring tool.

### The Mechanism — Step by Step

1. **Dependency adds autoconfiguration** — Adding `spring-boot-starter-actuator` to your `pom.xml` puts `ActuatorAutoConfiguration` on the classpath. This registers `Endpoint` beans for health, metrics, info, env, beans, heapdump, etc.

2. **Endpoints are separate from your app's mappings** — Actuator endpoints are registered under `/actuator` by default (configurable). They use a separate `ActuatorWebMvcEndpointHandlerMapping` — not your app's `RequestMappingHandlerMapping`. This separation lets you put Actuator endpoints on a different port (`management.server.port`).

3. **Health endpoint aggregates health indicators** — `HealthEndpoint` queries all registered `HealthIndicator` beans: `DataSourceHealthIndicator` (is the DB reachable?), `DiskSpaceHealthIndicator` (is disk space OK?), `KafkaHealthIndicator` (if Kafka is on classpath). Custom indicators are possible. It aggregates to `UP`, `DOWN`, `OUT_OF_SERVICE`, or `UNKNOWN`.

4. **Metrics use Micrometer** — `MetricsEndpoint` is backed by Micrometer's `MeterRegistry`. Micrometer is a metrics facade — it collects metrics (counters, timers, gauges) and exports them to any backend: Prometheus, Datadog, InfluxDB, AWS CloudWatch. Your app records metrics via `MeterRegistry.timer()`, etc. Spring Boot auto-records HTTP request metrics, JVM metrics, and HikariCP pool metrics.

5. **Exposure is controlled separately from enablement** — An endpoint can be enabled (exists and works) but not exposed over HTTP. By default, all endpoints are enabled but ONLY `health` and `info` are exposed over HTTP. You must explicitly expose others in `application.yml`.

### Health Endpoint Detail

```
GET /actuator/health

{
  "status": "UP",
  "components": {
    "db": { "status": "UP", "details": { "database": "PostgreSQL", "validationQuery": "isValid()" } },
    "diskSpace": { "status": "UP", "details": { "total": 499963174912, "free": 289183322112 } },
    "kafka": { "status": "UP" }
  }
}
```

Kubernetes liveness probe uses `/actuator/health/liveness` and readiness probe uses `/actuator/health/readiness` — Spring Boot 2.3+ splits health into these two groups.

### ASCII Diagram

```
Spring Boot Actuator Architecture
────────────────────────────────────────────────────────────────────────
  External Callers
    │
    ├── [Kubernetes] → /actuator/health/liveness, /health/readiness
    ├── [Prometheus]  → /actuator/prometheus    (scrapes every 15s)
    └── [Ops/Debug]   → /actuator/env, /beans, /threaddump, /heapdump

  Actuator Management Port (default: same as app, or separate port 8081)
    │
    ├── /actuator/health    → HealthEndpoint
    │     └── aggregates: DataSourceHealthIndicator
    │                       DiskSpaceHealthIndicator
    │                       KafkaHealthIndicator
    │                       custom HealthIndicators
    │
    ├── /actuator/metrics   → MetricsEndpoint
    │     └── reads from: MeterRegistry (Micrometer)
    │           ├── JVM metrics (heap, GC, threads)
    │           ├── HTTP request metrics (count, p95, p99)
    │           ├── HikariCP metrics (pool size, wait time)
    │           └── custom business metrics
    │
    ├── /actuator/prometheus → PrometheusScrapeEndpoint
    │     └── transforms MeterRegistry → Prometheus text format
    │
    ├── /actuator/env       → EnvironmentEndpoint — ALL config properties
    ├── /actuator/beans     → BeansEndpoint — all Spring beans in context
    ├── /actuator/loggers   → LoggersEndpoint — change log level at runtime
    └── /actuator/threaddump → ThreadDumpEndpoint — JVM thread dump

────────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```yaml
# application.yml — exposing ALL actuator endpoints to the public internet
management:
  endpoints:
    web:
      exposure:
        include: "*"  # DANGEROUS: exposes /env, /beans, /heapdump, /shutdown to the world
                      # /env shows all environment variables including DB passwords
                      # /heapdump allows heap dump download — may contain sensitive data in memory
                      # /shutdown can SHUT DOWN your production service via HTTP POST
```
> **Why this fails in production:** Exposing all actuator endpoints without access control is an OWASP Top 10 violation (Broken Access Control + Security Misconfiguration). `/actuator/env` leaks configuration including credentials. `/actuator/shutdown` can take down your service with a single HTTP call from anyone who knows the URL. Production exposure must be carefully controlled.

### Right Way — Production Quality
```yaml
# application.yml — secure, production-ready actuator configuration

management:
  # Run actuator on a separate port — not accessible from the public load balancer
  # The main app runs on 8080, actuator on 8081
  # Configure load balancer/ingress to NOT route to 8081 publicly
  server:
    port: 8081

  endpoints:
    web:
      base-path: /actuator
      exposure:
        # Only expose what is needed by your tooling
        # health: Kubernetes probes
        # info: deployment metadata
        # prometheus: Prometheus scraping (on private port 8081 — safe)
        # loggers: allow runtime log level changes without restart
        # metrics: for debugging — on private port, acceptable
        include: "health,info,prometheus,loggers,metrics"
        # NEVER expose on public port: env, beans, heapdump, shutdown, threaddump

  endpoint:
    health:
      # show-details: when-authorized — show full health details only to authenticated users
      # Options: always (show to everyone), when-authorized, never (just UP/DOWN)
      show-details: when-authorized
      # Separate liveness and readiness probes for Kubernetes
      probes:
        enabled: true  # enables /actuator/health/liveness and /actuator/health/readiness

  # Liveness: is the app alive? (restart if not)
  # Readiness: is the app ready for traffic? (remove from LB rotation if not)
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
```

```java
// Custom HealthIndicator — check if an external dependency is reachable
@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {

    private final PaymentGatewayClient client;

    public PaymentGatewayHealthIndicator(PaymentGatewayClient client) {
        this.client = client;
    }

    @Override
    public Health health() {
        try {
            // Ping the payment gateway — add a short timeout so health checks are fast
            boolean reachable = client.ping(Duration.ofSeconds(2));
            if (reachable) {
                return Health.up()
                    .withDetail("gateway", "Razorpay")
                    .withDetail("responseTime", "<2s")
                    .build();
            } else {
                return Health.down()
                    .withDetail("gateway", "Razorpay")
                    .withDetail("reason", "ping timeout")
                    .build();
            }
        } catch (Exception ex) {
            return Health.down()
                .withDetail("gateway", "Razorpay")
                .withDetail("error", ex.getMessage())
                .build();
        }
    }
}
```

```java
// Custom Micrometer metrics — business-level counters and timers
@Service
public class OrderService {

    private final MeterRegistry meterRegistry;
    private final Counter orderCreatedCounter;
    private final Counter orderFailedCounter;
    private final Timer orderProcessingTimer;

    public OrderService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        // Register counters at construction — creates them in Prometheus immediately
        // with 0 value, so Prometheus knows about them before any order is created
        this.orderCreatedCounter = Counter.builder("orders.created")
            .description("Number of orders successfully created")
            .tag("service", "order-service")
            .register(meterRegistry);

        this.orderFailedCounter = Counter.builder("orders.failed")
            .description("Number of order creation failures")
            .register(meterRegistry);

        this.orderProcessingTimer = Timer.builder("orders.processing.time")
            .description("Time taken to process an order")
            .register(meterRegistry);
    }

    @Transactional
    public Order createOrder(OrderRequest request) {
        return orderProcessingTimer.record(() -> {
            try {
                Order order = processInternal(request);
                orderCreatedCounter.increment();        // increment success counter
                return order;
            } catch (Exception ex) {
                orderFailedCounter.increment();         // increment failure counter
                throw ex;
            }
        });
    }
}
```

### Configuration — Info Endpoint (deployment metadata)
```yaml
# application.yml — add deployment metadata to /actuator/info
# Devs and ops use this to confirm which version is running in production
info:
  app:
    name: order-service
    version: @project.version@     # replaced by Maven at build time
    environment: ${APP_ENV:local}   # from environment variable
    gitCommit: ${GIT_COMMIT:unknown} # set by CI pipeline as env var
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Spring Boot Actuator and which endpoints do you use in production?"

**Hruday's answer:**
> Spring Boot Actuator adds operational HTTP endpoints to your application for monitoring and management — no custom code needed. You add one dependency and get health checks, metrics, environment inspection, and more immediately.
>
> In production, the endpoints I expose depend on the context. On the service's private management port (separate from the public API port), I expose: `/health` for Kubernetes liveness and readiness probes, `/prometheus` for Prometheus metrics scraping, `/info` for deployment metadata (version, git commit, environment), `/loggers` to change log levels at runtime without restart.
>
> I never expose `/env`, `/heapdump`, `/shutdown`, or `/beans` on a publicly accessible port — these contain sensitive data and dangerous operations. They MIGHT be accessible from inside the cluster on the management port, but only to operations tooling, not the public internet.
>
> Actuator's health endpoint powers Kubernetes' decision to route traffic to a pod. If `/health/readiness` returns `DOWN`, Kubernetes removes the pod from load balancer rotation. If `/health/liveness` returns `DOWN`, Kubernetes restarts the pod. This is zero-downtime deployment — pods report not-ready during startup and during graceful shutdown.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does Spring Boot Actuator integrate with Prometheus? Walk me through the metrics flow."

**Hruday's answer:**
> The integration has three layers: collection, storage, and scraping.
>
> Collection: Micrometer is the metrics library, embedded in Spring Boot Actuator. Your code (or Spring Boot's auto-instrumentation) creates meters — `Counter`, `Timer`, `Gauge` — and records observations to them. Micrometer uses a `MeterRegistry` — a central registry of all meters. Spring Boot auto-creates meters for JVM heap, GC pauses, thread counts, HTTP request counts, HTTP response times, and HikariCP pool stats.
>
> Storage: by default, meters are stored in memory. When you add `micrometer-registry-prometheus` as a dependency, a `PrometheusMeterRegistry` is created by autoconfiguration. This registry formats metrics in Prometheus's exposition format — a text file with one metric per line.
>
> Scraping: Prometheus is a pull-based system. It scrapes `/actuator/prometheus` on a schedule (typically every 15 seconds). The endpoint returns the formatted text that the `PrometheusMeterRegistry` generated. Prometheus stores the time series data. Grafana connects to Prometheus and renders dashboards.
>
> The practical result: add `micrometer-registry-prometheus` to `pom.xml`, expose `/actuator/prometheus` in your config, and configure Prometheus to scrape your service. No other code changes — your HTTP request metrics, JVM metrics, and HikariCP metrics are automatically in Grafana dashboards.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the risks of Spring Boot Actuator in production? How do you mitigate them?"

**Hruday's answer:**
> Three real risks.
>
> First: data exposure. `/actuator/env` shows ALL environment variables and configuration properties, including database passwords, API keys, and secret tokens (though Spring masks values containing words like "password" and "secret"). If this endpoint is on a public port without auth, it is a credential leak waiting to happen.
>
> Second: `/actuator/shutdown`. It literally shuts down your application on a POST request. If exposed publicly, one HTTP call from anyone takes down your service. This endpoint is disabled by default. Always double-check it stays disabled.
>
> Third: performance overhead. Health check endpoints query the database, the message broker, and disk on every call. Kubernetes probes hit `/health` every 10 seconds per pod. If you have 20 pods and your database is on shared infrastructure, that is 20 * 6 = 120 health-check DB queries per minute. Keep indicators lightweight — use connection pool validation queries, not real queries.
>
> Mitigations: run Actuator on a separate port (8081) that your load balancer does not route to publicly. Require Spring Security authentication on non-health endpoints. Use `show-details: when-authorized` so health details require auth. Never expose `shutdown`. Add a timeout to every custom `HealthIndicator` — a slow health check blocks the health endpoint.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "You need a Kubernetes deployment where your app takes 30 seconds to start up (loading a large reference dataset), and should not receive traffic until it is ready. How do you configure this with Actuator?"

**Hruday's answer:**
> This is exactly what readiness probes solve, and Spring Boot Actuator has first-class support.
>
> First, enable the probes in `application.yml`: `management.endpoint.health.probes.enabled=true`. This creates two sub-health endpoints: `/actuator/health/liveness` (is the JVM running?) and `/actuator/health/readiness` (is the app ready for traffic?).
>
> During startup, the `ApplicationContext` is being created. Until `ContextRefreshedEvent` fires, Spring Boot sets readiness state to `REFUSING_TRAFFIC`. `/actuator/health/readiness` returns `DOWN`. Kubernetes sees DOWN and does not route any traffic to this pod.
>
> For the 30-second dataset load in `@PostConstruct`, if it takes 30 seconds, the context refresh is still in progress. Readiness stays DOWN during that entire time.
>
> After the context fully starts — all `@PostConstruct` methods complete, `ContextRefreshedEvent` fires — Spring Boot automatically sets readiness to `ACCEPTING_TRAFFIC`. `/actuator/health/readiness` returns `UP`. Kubernetes starts routing traffic.
>
> In `kubernetes.yaml`: set `readinessProbe.httpGet.path=/actuator/health/readiness`, `initialDelaySeconds=10` (give the JVM time to start), `periodSeconds=5`, `failureThreshold=10` (wait up to 50 seconds). Set `livenessProbe.httpGet.path=/actuator/health/liveness` with a longer `initialDelaySeconds=60` — a slow startup should not trigger a liveness failure and restart.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "All endpoints are exposed by default" | "Yes, Actuator exposes everything" | "No. Only /health and /info are exposed over HTTP by default. All others are enabled internally but NOT exposed. You must configure management.endpoints.web.exposure.include explicitly. Always be explicit and minimal in production." |
| "Health check queries the DB" | "Yes, that proves the DB is connected" | "Health indicators CAN query the DB, but in production they should use connection pool validation queries (isValid()) not business queries. A heavy health-check query under a Kubernetes probe hitting 20 pods every 10 seconds adds 120+ unnecessary DB calls per minute." |
| "Micrometer replaces Actuator" | "They're the same thing" | "Different roles. Actuator exposes the /actuator HTTP endpoints. Micrometer is the metrics collection library that /actuator/metrics and /actuator/prometheus use. Micrometer works independently of Actuator — you can use Micrometer in a non-web batch job to export metrics to Datadog without using any Actuator endpoints." |
| "Change log level requires restart" | "Yes, you redeploy with updated config" | "No. /actuator/loggers lets you change log level at runtime — no restart. POST to /actuator/loggers/com.myapp.service with level=DEBUG to enable debug logging for that package on a running instance. Critical for diagnosing prod issues without downtime." |

---

## 7. Hruday's Real Experience Hook

> "At SAP, we deployed a Spring Boot microservice to Kubernetes and saw pods restart randomly under traffic spikes. The root cause: our `@PostConstruct` loaded 3MB of reference data from the database — taking 8-10 seconds. The Kubernetes liveness probe was configured with `initialDelaySeconds=5`, so it started probing before startup completed. The probe returned DOWN (Spring not yet ready), Kubernetes killed and restarted the pod — which started the 8-second load again. An infinite restart loop. We fixed it by raising `initialDelaySeconds=30` for liveness and configuring Actuator's readiness probe correctly to signal NOT READY during startup. Zero restarts after that."

---

## 8. Scale Evolution

**1,000 users →** Default Actuator setup works perfectly. `/health` for Kubernetes, `/prometheus` for monitoring. Custom business metrics on critical flows.

**100,000 users →** Health check overhead becomes measurable. Move Actuator to a separate management port (8081). Tune health check intervals in Kubernetes: `periodSeconds=10` instead of default 5 — halves the probe query volume. Cache health indicator results for 5-10 seconds to avoid repeated DB pings from multiple Kubernetes nodes probing simultaneously.

**10 million users →** At this scale, per-instance metrics are aggregated by Prometheus. Grafana shows fleet-wide views: total requests per second, p95/p99 latency across all instances, error rate by endpoint. Actuator's `/prometheus` endpoint becomes a core part of the SRE (site reliability engineering) platform. Alert rules in Prometheus fire to PagerDuty when p99 latency exceeds thresholds or when `orders.failed` counter spikes. The business metrics you added to Micrometer in `OrderService` are now the primary signal for on-call engineers.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Kubernetes deployments require correct readiness/liveness probes. A misconfigured probe is a production outage. Financial services also need rich metrics for SLA monitoring. | "How do you configure Kubernetes readiness probes with Spring Boot Actuator for zero-downtime deployment?" |
| Swiggy / Meesho | Large microservices fleet with Prometheus+Grafana monitoring. Every service publishes custom business metrics via Micrometer. | "Walk me through how you would add a metric to track order creation success rate and surface it in Grafana." |
| Adobe / Microsoft | Enterprise platform teams care about actuator security — preventing credential leaks via exposed endpoints. Building shared monitoring libraries using Micrometer. | "Your security audit found that /actuator/env is publicly accessible. What's your remediation plan?" |
| Remote / Global roles | Actuator + Micrometer + Prometheus is the standard Spring Boot observability stack globally. Expected knowledge for any senior Spring Boot role. | "How does the metrics data flow from your Spring Boot app to a Grafana dashboard?" |

---

## 10. Related Topics — What to Study Next

- **Topics 84/263-266 — Distributed Tracing and Logging** — Actuator provides the health/metrics layer; distributed tracing (Zipkin, Jaeger) and structured logging complete the observability picture
- **Topic 85 — Health Checks and Readiness Probes** — deep dive into Kubernetes probe configuration with Spring Boot Actuator
- **Topic 41 — Spring Boot Autoconfiguration** — Actuator is configured entirely via autoconfiguration — understanding this explains why adding the starter is all you need
- **Topic 42 — Spring Boot Request Lifecycle** — HTTP request metrics that Actuator/Micrometer auto-instruments come from the DispatcherServlet layer
- **Topic 48 — HikariCP Connection Pooling** — HikariCP auto-registers metrics with Micrometer when Actuator is on the classpath — pool size, wait time, and timeout rate appear in Prometheus automatically

---

*Part 3 · Spring Boot Actuator · Full Stack Interview Guide · Hruday D · 2026*
