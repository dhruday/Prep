# Health Checks and Readiness Probes — Spring Boot Actuator + Kubernetes
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Health check = an endpoint that a service exposes to indicate its current operational state; consuming systems (Kubernetes, load balancers, API gateways) poll this endpoint to decide whether to route traffic to the instance
- Kubernetes has THREE distinct probes: **Liveness** (is the container still alive? if not → restart it), **Readiness** (is the service ready to accept traffic? if not → remove from load balancer but don't restart), **Startup** (slow-starting apps — only run liveness/readiness checks AFTER startup succeeds)
- Critical distinction to memorise: Liveness failure triggers pod RESTART. Readiness failure causes pod to be temporarily REMOVED FROM SERVICE (endpoints removed from Kubernetes Service) but pod is NOT restarted. Using the wrong probe type causes catastrophic behaviour — a liveness probe on a dependency check causes your pod to restart whenever the database is slow, not just when your pod is broken.
- Spring Boot Actuator: `/actuator/health` splits into `/actuator/health/liveness` and `/actuator/health/readiness` automatically since Spring Boot 2.3+; configure each with different indicators — liveness checks only internal JVM state, readiness checks external dependencies (DB, Kafka, dependent services)
- Custom health indicators: implement `HealthIndicator` or `ReactiveHealthIndicator` to add business-relevant health checks — "are there at least 5% of products indexed in Elasticsearch?"
- Gap to bridge: the most common senior interview mistake is confusing liveness and readiness or saying "just use /actuator/health for both" — demonstrating the difference with concrete consequences is the differentiator

---

## 1. One-Line Definition
Health checks are endpoint-backed signals that expose a service's operational readiness to its infrastructure (Kubernetes, load balancers), enabling automated recovery (container restart for liveness failure) and traffic routing decisions (remove pod from load balancer for readiness failure) without manual intervention.

---

## 2. The Problem It Solves

### Without Health Checks — Silent Failure

```
WITHOUT probes:
  OrderService pod starts successfully (JVM starts, Spring context loads)
  BUT: the database connection pool is failing (DB migration running, 30-second delay)
  
  Kubernetes considers the pod READY (it started without error)
  → Kubernetes adds it to the Service endpoint list
  → Load balancer routes real user traffic to it
  → Every request to this pod fails with connection errors
  → Users see errors. Service is "running" but completely broken.

  OR:
  OrderService starts fine, runs for 3 hours
  Then: memory leak causes full GC pause (stop-the-world, 45 seconds)
  → Pod appears running from outside
  → All requests during GC pause timeout
  → GC completes but the JVM is now in a degraded state
  → Without liveness probe: continues to receive traffic in this degraded state
  → With liveness probe: Kubernetes detects unresponsiveness → restarts pod → clean state
```

### The Three Probe Types and Consequences of Misuse

```
STARTUP PROBE:
  Purpose: Give slow-starting application time to complete startup
  Check: "has the application finished initialising?"
  If FAILS: container does NOT start → K8s retries up to failureThreshold × (periodSeconds)
  If SUCCEEDS: startup probe is DISABLED; liveness + readiness probes begin running
  
  Use case: Java applications with slow Spring context startup (5-30 seconds)
  Without it: liveness probe starts too early → thinks app is dead → restarts it repeatedly
              before startup completes → CrashLoopBackOff

READINESS PROBE:
  Purpose: Indicate "I'm ready to accept traffic"
  Check: "are all my dependencies (DB, Kafka, external APIs) reachable? Is my queue drained? Am I warmed up?"
  If FAILS: pod is REMOVED from the Service endpoints list → no traffic routed to this pod
            Pod is NOT restarted. It stays running. Kubernetes tries again next period.
  If SUCCEEDS: pod is ADDED BACK to endpoints → traffic resumes
  
  Use case: 
  - At startup: don't route traffic until connections are established
  - At runtime: when a downstream dependency is temporarily unavailable, 
    let OTHER healthy pods handle traffic while this one waits for recovery
  - During maintenance: a pod can set its readiness to false to gracefully drain traffic 
    before shutdown (useful for rolling deployments)

LIVENESS PROBE:
  Purpose: Detect and recover from permanently broken state
  Check: "is the container still alive and capable of making progress?"
  If FAILS: Kubernetes RESTARTS the container (kills it, starts a new instance)
  If SUCCEEDS: container is considered alive, no action
  
  Use case: deadlock in the JVM (all threads blocked, nothing progresses), 
            OOM state where the JVM is partially functional but not making progress,
            corruption of internal state that won't self-heal

CRITICAL WARNING:
  NEVER put external dependency checks in the LIVENESS probe.
  If your liveness probe checks the database, and the database has a 30-second slow patch:
  → liveness fails → Kubernetes RESTARTS your pod
  → Restarted pod also checks DB in liveness → also fails → also restarts
  → All pods in a restart loop during a DB slowdown
  → CASCADE: your service is unavailable, amplifying the DB problem into a complete outage

  RULE: Liveness = internal JVM state only. 
        Readiness = external dependencies.
```

---

## 3. How It Works Internally

### Spring Boot Actuator Health Groups

```
Spring Boot 2.3+ exposes:
  /actuator/health          → overall health (aggregates all indicators)
  /actuator/health/liveness  → liveness state only (internal indicators)
  /actuator/health/readiness → readiness state only (all indicators – dependencies)

Default Spring Boot Actuator Health Indicators (auto-configured):
  db          → checks DataSource (SELECT 1 ping to database)
  redis       → checks Redis connection
  kafka       → checks Kafka broker connectivity
  diskSpace   → alerts if disk is above threshold
  ping        → always UP (the simplest "I'm alive" indicator)

Spring actuator groups separate these:

Liveness group (internal only — safe for liveness probe):
  - Only "ping" indicator — if Spring can respond, it's alive
  - Never DB, Redis, Kafka — these are EXTERNAL, not indicators of JVM liveness

Readiness group (external dependencies — use for readiness probe):
  - db: DataSource health
  - kafka: Kafka connectivity
  - redis: Redis if used
  - custom indicators you define
```

---

## 4. The Code

### Spring Boot Actuator Configuration
```yaml
# application.yml
management:
  endpoint:
    health:
      show-details: when-authorized  # Never show full health details publicly
      probes:
        enabled: true  # Enables /actuator/health/liveness and /actuator/health/readiness

  health:
    # Which indicators belong to the liveness group
    livenessstate:
      enabled: true
    # Which indicators belong to the readiness group  
    readinessstate:
      enabled: true
    
    # Readiness group: includes DB, Kafka, and our custom indicators
    group:
      readiness:
        include: "db,kafka,readinessState"
        show-details: always  # For internal readiness checks, show details
      liveness:
        include: "livenessState"  # ONLY internal JVM state — never external dependencies
  
  endpoints:
    web:
      exposure:
        include: "health,info,metrics,prometheus"  # Never expose shutdown in production
```

### Custom Health Indicator
```java
// Custom readiness check: is the ProductCatalog service accessible?
// Goes into readiness group (external dependency check)
@Component
public class ProductCatalogHealthIndicator extends AbstractReactiveHealthIndicator {

    private final WebClient productCatalogClient;

    public ProductCatalogHealthIndicator(WebClient.Builder builder,
                                          @Value("${services.product-catalog.url}") String baseUrl) {
        this.productCatalogClient = builder.baseUrl(baseUrl).build();
    }

    @Override
    protected Mono<Health> doHealthCheck(Health.Builder builder) {
        return productCatalogClient.get()
            .uri("/actuator/health/readiness")
            .retrieve()
            .bodyToMono(Map.class)
            .timeout(Duration.ofSeconds(2))  // Short timeout — health checks must be fast
            .map(response -> builder.up()
                .withDetail("status", response.get("status"))
                .build())
            .onErrorResume(e -> Mono.just(
                builder.down()
                    .withDetail("error", e.getMessage())
                    .build()
            ));
    }
}
```

```java
// Custom business-level health indicator: are database migrations up to date?
// Part of readiness group — service shouldn't serve traffic until migrations complete
@Component
@RequiredArgsConstructor
public class DatabaseMigrationHealthIndicator implements HealthIndicator {

    private final Flyway flyway;

    @Override
    public Health health() {
        try {
            MigrationInfoService info = flyway.info();
            MigrationInfo[] pending = info.pending();
            
            if (pending.length > 0) {
                return Health.down()
                    .withDetail("pendingMigrations", pending.length)
                    .withDetail("message", "Database migrations pending — service not ready")
                    .build();
            }
            
            return Health.up()
                .withDetail("appliedMigrations", info.applied().length)
                .build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```

### Kubernetes Probe Configuration
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ordersvc
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: ordersvc
          image: ordersvc:3.2.1
          ports:
            - containerPort: 8080

          # STARTUP PROBE: runs first, gives the app time to start
          # Checked: every 10s, up to 30 retries = 300 seconds max startup time
          # After first success: startup probe stops, liveness + readiness begin
          startupProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            failureThreshold: 30    # Max 30 × 10 = 300 seconds for startup
            periodSeconds: 10
            initialDelaySeconds: 5  # Wait 5s before first check

          # READINESS PROBE: runs after startup succeeds
          # If unhealthy: pod removed from Service endpoints (no traffic)
          # Checked every 10 seconds, must fail 3 consecutive times for removal
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 0   # Starts immediately after startup probe passes
            periodSeconds: 10
            failureThreshold: 3      # 3 consecutive failures = removed from endpoints
            successThreshold: 1      # 1 success = added back to endpoints
            timeoutSeconds: 5        # Each probe times out after 5 seconds

          # LIVENESS PROBE: runs after startup succeeds
          # If unhealthy: container RESTARTED
          # Only checks internal JVM state (/liveness group = just "ping")
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 30        # Check every 30s — less frequent than readiness
            failureThreshold: 3      # Must fail 3 × 30s = 90 seconds before restart
            timeoutSeconds: 5
          
          # Graceful shutdown: drain in-flight requests before termination
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 10"]  # Allow 10s for load balancer to stop routing
          
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
      
      # Graceful shutdown timeout
      terminationGracePeriodSeconds: 60
```

### Programmatic Readiness Management
```java
// Temporarily mark service as not-ready during business-level maintenance
// e.g., cache warming before accepting traffic
@Service
@RequiredArgsConstructor
@Slf4j
public class StartupWarmupService implements ApplicationListener<ApplicationReadyEvent> {

    private final ApplicationAvailability availability;
    private final AvailabilityChangeEvent<ReadinessState> readinessEvent;
    private final ProductCatalogCache productCatalogCache;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        // Spring has started. But we need to warm up cache before accepting traffic.
        // Mark as REFUSING_TRAFFIC to stay out of Service endpoints during warmup.
        AvailabilityChangeEvent.publish(
            eventPublisher, this, ReadinessState.REFUSING_TRAFFIC
        );
        log.info("Service marked NOT_READY: warming up product catalog cache");

        try {
            productCatalogCache.warmUp();  // Load critical data into cache
            log.info("Cache warmup complete. Marking service READY.");
            AvailabilityChangeEvent.publish(
                eventPublisher, this, ReadinessState.ACCEPTING_TRAFFIC
            );
        } catch (Exception e) {
            log.error("Cache warmup failed. Service will stay NOT_READY.", e);
            // Keep service in REFUSING_TRAFFIC — Kubernetes won't route traffic
            // Alert on-call: service stuck in not-ready state after startup
        }
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between a liveness probe and a readiness probe in Kubernetes?"

**Hruday's answer:**
> The difference is in what Kubernetes DOES when each probe fails.
>
> A liveness probe failure means "this container is broken and will never recover on its own." Kubernetes restarts the container to restore it to a clean state. The typical use case is detecting a deadlock, where all threads are blocked and the JVM will never make progress without a restart.
>
> A readiness probe failure means "this service is temporarily unable to handle traffic, but it might recover on its own." Kubernetes removes the pod from the Service's endpoint list — the load balancer stops routing traffic to it — but does NOT restart the pod. It keeps checking, and when the probe succeeds again, the pod is added back to the endpoint list. The typical use case is a downstream dependency being temporarily unavailable — the pod shouldn't receive traffic, but restarting it wouldn't help.
>
> The critical rule: never put external dependency checks (database ping, Kafka connectivity) in the liveness probe. If the database has a brief 30-second slowdown and your liveness probe checks the database, every pod will fail its liveness probe and restart. Restarted pods also check the database and restart again. You create a restart cascade that takes your entire service down during what should have been a minor DB hiccup. Liveness checks should only verify internal JVM state — a simple "can I respond to an HTTP request?" with Spring's `/actuator/health/liveness` which only checks the `livenessState` indicator (essentially a ping).

---

### Q2 — Graceful Shutdown
**Interviewer asks:** "How do you ensure in-flight requests complete before a pod shuts down?"

**Hruday's answer:**
> Kubernetes sends a SIGTERM signal to the container when it decides to terminate a pod (for rolling deployments, scale-down, or node rebalancing). The container has `terminationGracePeriodSeconds` — default 30 seconds — to finish before it receives SIGKILL.
>
> There are two problems with just receiving SIGTERM and immediately shutting down. First, the load balancer might still route new requests to this pod for a brief window after SIGTERM — there's a propagation delay between Kubernetes removing the pod from endpoints and all load balancer instances receiving this update. Second, in-flight requests that arrived before SIGTERM need to complete.
>
> The solution I configure: a `preStop` lifecycle hook that sleeps for 10 seconds before the application receives SIGTERM. This gives the Kubernetes control plane time to propagate the endpoint removal to all load balancers before the app starts shutting down. Then Spring Boot's graceful shutdown (`server.shutdown: graceful` + `spring.lifecycle.timeout-per-shutdown-phase: 30s`) holds the JVM alive until in-flight requests complete, up to the configured timeout.
>
> The `terminationGracePeriodSeconds` must be longer than `preStop sleep + graceful shutdown timeout`. I set it to 60 seconds: 10s preStop + 30s graceful shutdown + 20s buffer.

---

### Q3 — Probe Tuning
**Interviewer asks:** "How do you set the failure thresholds and periods for probes — what values would you choose?"

**Hruday's answer:**
> Probe timing is a balance between detecting problems quickly and avoiding false positives from transient network blips.
>
> For the startup probe: I set `periodSeconds=10` and `failureThreshold` based on the measured maximum startup time. If Spring Boot takes up to 45 seconds to start (loading Spring context, Flyway migrations), I'd set `failureThreshold=30` which gives 300 seconds. If the startup probe is too tight, the pod restarts before it finishes starting — you see the scary CrashLoopBackOff status. Better to be generous here.
>
> For readiness: `periodSeconds=10`, `failureThreshold=3`. This means a pod must fail three consecutive checks over 30 seconds before Kubernetes removes it from the load balancer. A single failed check (transient network issue hitting the DB check) won't remove the pod. Three consecutive failures (30 seconds of problems) is a genuine readiness issue.
>
> For liveness: `periodSeconds=30`, `failureThreshold=3`. I check less frequently because liveness failures are severe — a deadlock won't resolve itself, so I don't need to detect it faster than ~90 seconds. More importantly, liveness only checks `/liveness` (a ping), which almost never fails — so I don't need aggressive polling. A failure here means restart, which is disruptive (in-flight requests drop), so I set a high bar: 3 consecutive failures over 90 seconds before restarting.

---

### Q4 — Rolling Deployment Strategy
**Interviewer asks:** "How do readiness probes help with zero-downtime rolling deployments?"

**Hruday's answer:**
> Rolling deployment works by replacing old pods with new pods one at a time. Readiness probes are essential to making this zero-downtime.
>
> The rollout sequence: Kubernetes creates a new pod with the new version. The new pod starts, goes through its startup probe, then begins passing its readiness probe. Only AFTER the new pod is READY — all readiness checks passing — does Kubernetes terminate one of the old pods. So at every point in the rollout, the total number of READY pods never drops below the requested minimum.
>
> Without readiness probes: Kubernetes might start routing traffic to the new pod as soon as the container starts (process is running). But if the new pod's Spring context takes 15 seconds to warm up and establish database connections, those first 15 seconds of traffic to the new pod would all fail with connection errors — 500s during a normal deployment.
>
> The readiness probe eliminates this window: the new pod is only added to the load balancer endpoints AFTER it reports ACCEPTING_TRAFFIC. The `minReadySeconds: 10` setting in the Deployment spec adds an additional buffer — even after the first readiness success, Kubernetes waits 10 more seconds before considering the pod "ready" for rollout progression. This catches pods that flap (briefly healthy, then unhealthy) during warmup.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use the same probe for liveness and readiness" | "I point both probes at /actuator/health" | "This is the most dangerous configuration. If the database is temporarily unreachable, /actuator/health returns DOWN. Both liveness AND readiness fail. Readiness failure correctly removes pods from the load balancer. But liveness failure RESTARTS all pods — every pod restarts, tries to start up, checks /actuator/health which checks the database, still unreachable, restarts again. The entire service is in a restart crash loop for the duration of a DB outage. Use /actuator/health/liveness (ping only) for liveness and /actuator/health/readiness (external dependencies) for readiness." |
| "Longer grace period is always safer" | "Set terminationGracePeriodSeconds=300 to be safe" | "An overlong grace period means a draining pod stays in the 'Terminating' state for 5 minutes. During a large-scale incident (you need to roll back ALL pods), waiting 5 minutes per pod × 10 pods × 3 stages = 150 minutes of rollback. Grace period should be: preStop + realistic in-flight request timeout + buffer. For a service where 99% of requests complete in 5 seconds and the longest SLA is 30 seconds, 60-90 seconds is sufficient and safe." |
| "Spring Boot's /actuator/health is enough out of the box" | "Just use the default health actuator" | "By default, Spring Boot's health endpoint only splits into liveness/readiness if Kubernetes is detected OR if `management.health.probes.enabled=true` is explicitly set. Without the explicit configuration, both paths still point to the same aggregate health. Additionally, default health indicators don't include custom business-level checks that matter for YOUR service — you need to add: dependent service checks, migration status, initial data load completion. Default is a starting point, not a production configuration." |
| "Slow response from probe is fine" | "The probe just needs to return 200" | "Probes have timeouts (default 1 second). If your health endpoint takes >1 second to respond (because it's doing a DB round-trip that's slow), the probe times out and is counted as a failure. Health check implementations must be FAST — use cached health state refreshed in the background rather than live dependency checks in the probe path. Otherwise, a temporarily slow DB causes health check timeouts which cause readiness failures which cause unnecessary pod-removal from the load balancer." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, ERP's batch processing systems had a concept of 'Available for Processing' — before a module could receive work, it had to complete its initialization checks: verifying database grants were in place, ensuring interface tables were accessible, confirming that required configuration parameters were set. Only after all checks passed was the module marked available and work dispatched to it. This is exactly what Kubernetes readiness probes implement: a pod is not sent work (traffic) until it signals that all its dependencies and configurations are verified and ready. The enterprise concept directly translates to the cloud-native implementation. Understanding that this is a fundamental principle — not route traffic to something that isn't ready — made the liveness vs readiness distinction immediately clear."

---

## 8. Scale Evolution

**Single service, simple deployment:** `/actuator/health` returning 200/503 pointed at both probes. Acceptable for development and very early production with manual oversight.

**Production Kubernetes deployment:** Separate `/actuator/health/liveness` and `/actuator/health/readiness` endpoints. `startupProbe` for slow-starting apps. `terminationGracePeriodSeconds` and `preStop` hook for graceful shutdown. Custom health indicators for your service's specific dependencies.

**Platform maturity:** Health check data fed to Prometheus metrics (`management.endpoints.web.exposure.include=prometheus`). Alerting on readiness failure rate across the deployment. Automated rollback triggered when health check failure rate exceeds threshold after deployment. Health check latency monitored as its own metric.

**Advanced:** Implement "rolling readiness" — a pod sets itself to REFUSING_TRAFFIC when its Kafka consumer lag exceeds a threshold, giving load time to other pods with more capacity. Readiness probes become an active traffic management tool, not just a startup signal.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment service health checks must distinguish between "can we process payments" (DB and payment gateway reachable) and "is the service process alive" (JVM responding). A readiness failure during a gateway outage protects users from failed payment attempts. | "How would you implement health checks for a payment processing service?" |
| Swiggy / Meesho | Restaurant listing service warming restaurant cache on startup. Readiness probe programmatically set to REFUSING_TRAFFIC until cache is warm. Prevents users from seeing empty restaurant lists on pod restarts. | "How do you ensure users never see stale data after a rolling deployment?" |
| Adobe / Microsoft | Creative Cloud services with large in-memory state (rendered thumbnails, user preference caching). Startup probes allow full cache warm-up before traffic routing. Readiness monitoring across hundreds of pods is standard platform capability. | "How do you handle a rolling deployment of a service that takes 2 minutes to start?" |
| SAP Labs (current) | SAP BTP Kubernetes-based deployments use the same K8s probe pattern. Demonstrating precise knowledge of probe semantics and configuration shows readiness for infrastructure-aware senior development. | "Configure the probes for a Spring Boot service deployed on SAP BTP's Kubernetes runtime." |

---

## 10. Related Topics — What to Study Next

- **Topic 84 — Distributed Tracing** — health check endpoint response time is itself observable via distributed tracing; slow health checks indicate dependency degradation before it cascades to request failures
- **Topic 71 — Circuit Breaker (Resilience4j)** — integrating Resilience4j circuit breaker state into the readiness health indicator: if the circuit to a critical dependency is OPEN, the service is not ready to serve traffic; this integration gives Kubernetes-level awareness of application-level circuit state
- **Topic 68 — Service Discovery** — service discovery tracks which instances are healthy based on health endpoint responses; the readiness probe is the signal that determines whether an instance appears in the discoverable service registry for other services to call

---

*Part 4 · Health Checks and Readiness Probes — Spring Boot Actuator + Kubernetes · Full Stack Interview Guide · Hruday D · 2026*
