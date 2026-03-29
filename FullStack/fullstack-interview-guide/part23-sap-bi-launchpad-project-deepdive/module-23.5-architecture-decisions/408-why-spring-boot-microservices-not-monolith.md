# Why Spring Boot Microservices, Not a Monolith
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.5: The Architecture Decisions
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The same Conway's Law argument applies to the backend**: 4 frontend teams, each consuming different backend capabilities; the report export service, the dashboard data service, and the user permissions service have completely different load patterns, scaling needs, and deployment cadences; one monolith couples all of these
- **The specific services and why they're separate**: Report Export (CPU-heavy, runs asynchronously, spikes during business hours) · Dashboard Data (high read throughput, needs aggressive caching, query optimisation) · User Permissions (low traffic, high correctness requirement, changes rarely) · Analytics Engine (computationally expensive aggregations, scales independently) — each has a different operational profile
- **The load pattern argument**: at 9 AM, 1,000 analysts log in and run reports simultaneously; Report Export service scales to 20 instances; User Permissions service stays at 2 instances; in a monolith, you scale everything together — you'd need 20 instances of the permissions code that barely uses any CPU
- **Spring Boot 3.x + Java 17 specifics**: virtual threads (Project Loom, Java 21 backport as preview in 17), WebClient (non-blocking HTTP), Resilience4j (circuit breaker — NOT Hystrix), Spring Security 6 with JWTs, Spring Boot Actuator for health/metrics
- **When microservices are NOT the right choice**: a startup with one team, one product, one database — a monolith is faster to build, easier to debug, and simpler to operate; microservices without organisational independence are distributed monolith — all the complexity, none of the benefit
- **The honest cost**: distributed tracing, network latency between services, distributed transactions, increased operational complexity (8 services = 8 dockerfiles, 8 CI pipelines, 8 sets of metrics) — all of these are real costs that only pay back when services truly need independent scaling and deployment

---

## 1. One-Line Definition
8 Spring Boot microservices were used because each service has a different load profile, different scaling requirement, and different deployment cadence — coupling them into a monolith would mean scaling everything to match the most resource-intensive service, and a deployment for any feature blocks all others.

---

## 2. The 8 Services and Their Profiles

```
SERVICE                         LOAD PROFILE                    SCALING PATTERN
─────────────────────────────────────────────────────────────────────────────────
1. API Gateway                  Every request → high throughput  Scale horizontally
   (Spring Cloud Gateway)       Thin layer: auth, routing, rate  2-4 instances always
                                limiting; no business logic

2. Auth Service                 Low: login/logout/token refresh  1-2 instances
   (Spring Security, JWT)       Stateless JWT — no session store Scales rarely

3. User Permissions Service     Low: permission checks cached    1-2 instances
   (RBAC)                       Redis TTL 5min; most calls hit   Scale on cache miss storm
                                cache

4. Report Service               Medium: read-heavy               2-4 instances baseline
   (Report metadata, search)    Search index queries, not heavy  Scale on search traffic

5. Report Export Service        CPU-heavy, bursty               2-20 instances
   (PDF/Excel generation)       9 AM business hours spike       Autoscale aggressively
                                Async: takes 2-30 seconds       Queue-based workers

6. Dashboard Data Service       Very high read throughput        4-8 instances
   (Query engine)               Aggregation queries over large   Scale on query volume
                                datasets; cache-heavy            Redis + DB read replicas

7. Analytics Engine             Compute-heavy, async             1-8 instances
   (KPI aggregation)            Pre-computation jobs run nightly Scale during batch jobs
                                On-demand runs on user trigger

8. Notification Service         Low, async                       1 instance (mostly)
   (Email, in-app alerts)       Fire-and-forget; no user waits   Scale on notification burst
```

---

## 3. Why the Scaling Argument Is Decisive

```
MORNING PEAK SCENARIO (9:00 AM, business day):
  1,000 analysts log in simultaneously
  800 trigger report exports (PDF of their weekly reports)
  Report Export Service: CPU at 90%+ → autoscale triggers → 20 instances up

  WHAT HAPPENS IN A MONOLITH:
    The whole application scales to 20 instances
    20 instances of User Permissions code that handles 50 requests/min
    20 instances of Notification code that handles 10 requests/hour
    20 instances of Auth code that had 1,000 logins in a 5-minute window (done by 9:05)
    → You're paying for 20 instances of code that needs 1-2 instances

  WHAT HAPPENS IN MICROSERVICES:
    Report Export Service: 20 instances (scaling is the right call)
    Dashboard Data Service: 8 instances (query volume also up)
    User Permissions: 2 instances (cache hits; barely touched)
    Notification Service: 1 instance (normal)
    Auth Service: 2 instances (login spike at 9 AM subsides by 9:05)
    → Each service scales to what it actually needs

COST IMPACT:
  Kubernetes HPA (Horizontal Pod Autoscaler) config:
  Each micro-service has its own HPA targeting 70% CPU utilisation
  Report Export: min 2, max 20 replicas
  User Permissions: min 1, max 3 replicas
  This is operationally fine — each Deployment has its own HPA spec
  In a monolith, one HPA governs the whole app — it scales all-or-nothing
```

---

## 4. Spring Boot 3.x + Java 17 Technology Choices

```java
// 1. WEBCLIENT — non-blocking HTTP between services
//    NOT RestTemplate (sync, blocking, being deprecated)
@Service
public class DashboardService {
    private final WebClient dashboardDataClient;

    public DashboardService(WebClient.Builder builder) {
        this.dashboardDataClient = builder
            .baseUrl("http://dashboard-data-service")
            .build();
    }

    public Mono<DashboardData> getDashboardData(String dashboardId) {
        return dashboardDataClient
            .get()
            .uri("/dashboards/{id}", dashboardId)
            .retrieve()
            .bodyToMono(DashboardData.class)
            .timeout(Duration.ofSeconds(3));
    }
}

// ─────────────────────────────────────────────────────────────────────────
// 2. RESILIENCE4J — circuit breaker + retry
//    NOT Hystrix (end-of-life; Spring Cloud already removed it)
@Service
public class ReportExportService {

    @CircuitBreaker(name = "analyticsEngine", fallbackMethod = "cachedAnalytics")
    @Retry(name = "analyticsEngine")
    public AnalyticsResult fetchAnalytics(String reportId) {
        return analyticsClient.get(reportId);
    }

    public AnalyticsResult cachedAnalytics(String reportId, Exception ex) {
        log.warn("Analytics engine down; using cached result for {}", reportId);
        return metadataCache.getLastKnownResult(reportId);
    }
}

// ─────────────────────────────────────────────────────────────────────────
// 3. SPRING SECURITY 6 — JWT validation at API Gateway
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter()))
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .csrf(csrf -> csrf.disable())   // JWT auth — no CSRF needed
            .build();
    }
}

// ─────────────────────────────────────────────────────────────────────────
// 4. DISTRIBUTED TRACING — Micrometer Tracing + Zipkin
//    Trace ID injected by gateway; propagated in headers between services
//    All logs include trace ID → can filter all service logs for one request
@Slf4j
@Service
public class ReportService {
    public Report getReport(String reportId) {
        log.info("Fetching report {}", reportId);
        // Micrometer automatically includes traceId in log context
        // Log line: 2024-01-15 09:23:15 [traceId=3f2a1b4c] INFO Fetching report r-1234
    }
}
```

---

## 5. The Monolith Would Have Been Fine If...

```
MICROSERVICES DECISION RULE (be honest about this):

  Microservices are right when:
    ✅ Services have different load profiles and scaling requirements
    ✅ Teams are independent and own their service end-to-end
    ✅ One service failing should not cascade to all others
    ✅ Services need different tech choices (e.g., Python for ML, Java for API)
    ✅ Independent deployment cadence is required

  A monolith is right when:
    ✅ One team owns everything
    ✅ < 10k DAU — single instance handles the load fine
    ✅ Business logic is deeply intertwined (splitting it creates distributed transactions)
    ✅ Engineering team doesn't have Kubernetes/distributed systems operational maturity

  THE ANTI-PATTERN: Distributed Monolith
    8 services but they all deploy together
    8 services but they all share a database
    8 services but a change in Service A requires changes in B, C, D simultaneously
    → All the complexity of microservices; none of the independence benefit
    → This happens when teams are split but business logic is not

  FOR SAP BI LAUNCHPAD:
    The Report Export Service genuinely needs independent scaling (CPU)
    The Analytics Engine genuinely runs on a different schedule (async batch)
    Teams are genuinely independent (backend service per team)
    Kubernetes is operational reality (SAP runs on Kubernetes)
    → Microservices the right call here
```

---

## 6. Interview Questions & Model Answers

### Q1
**Interviewer asks:** "Why did you build 8 microservices? What problem does that solve?"

**Hruday's answer:**
> "The primary driver was the scaling story. Two services have dramatically different load profiles: Report Export is CPU-heavy and spikes at business hours when analysts batch-run their weekly reports — we see 1,000 simultaneous export requests at 9 AM. The Dashboard Data service is query-heavy throughout the day. In a monolith, to scale the Report Export logic you'd scale the entire application — including the User Permissions service that barely uses CPU and handles maybe 50 requests per minute. With separate services, autoscaling is precise: Report Export scales to 20 instances during the morning peak; User Permissions sits at 1-2 instances. The second driver was deployment independence: Report Export had a new PDF generation algorithm — that service could deploy independently without a full application release. The third was failure isolation: when the Analytics Engine was slow due to a complex aggregation, the circuit breaker in Resilience4j prevented that slowness from propagating to the Report Service. In a monolith, the analytics latency would have affected all features. These three — scaling precision, deployment independence, failure isolation — are what made microservices worth the operational cost."

---

## 7. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We chose microservices for scalability" | Vague; every answer says this | Name the specific service (Report Export), specific load (1,000 exports at 9 AM), specific instance count (2 → 20 with HPA) |
| "RestTemplate for HTTP calls" | Old answer; Spring 5+ | "WebClient — non-blocking; RestTemplate is legacy and heading for deprecation; we use WebClient with timeout config" |
| "Hystrix for circuit breaking" | Very old answer; EOL | "Resilience4j — Hystrix went EOL with Spring Cloud Hoxton; Resilience4j is the current Spring Cloud standard" |
| Monolith = bad | Absolutism | "A monolith is the right default for a startup or small team; microservices pay back only when services have genuinely different operational profiles and teams are genuinely independent" |

---

## 8. Hruday's Real Experience Hook

> "The Resilience4j circuit breaker decision saved us in a real incident. The Analytics Engine had a performance regression in a batch query — it was responding in 8-12 seconds instead of sub-second. Without the circuit breaker, every Report Service request that called the Analytics Engine would have waited 10+ seconds, chained timeouts would have queued up, and the Report Service would have run out of connection pool threads. With the circuit breaker open, the fallback returned cached analytics immediately, and the Report Service continued functioning normally. The Analytics team fixed and deployed their service without any Report Service degradation visible to users. That's exactly what circuit breakers are for — and that incident was the one I use when an interviewer asks why we used microservices."

---

## 9. Scale Evolution

**8 services, current →** Kubernetes HPA per service. Resilience4j circuit breakers. Micrometer tracing to Zipkin. Spring Boot Actuator health endpoints. WebClient with timeouts.

**Regional failover →** Multi-region Kubernetes clusters. Service mesh (Istio) for automatic mTLS between services. Active-active deployment for critical services.

**10M users →** Event-driven architecture for async operations (Kafka for export jobs, analytics batch). CQRS for Dashboard Data: separate read replicas with eventual consistency. Read path cached aggressively in Redis.

---

## 10. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment processing has dramatically different load profiles across services (payment API vs ledger vs notification vs KYC) | Scaling argument per service; Resilience4j for payment retry logic |
| Swiggy / Meesho | Order, restaurant, user, delivery, search — all different scaling profiles; order service scales at meal times | HPA per service; independent deployment for each domain |
| Adobe / Microsoft | Platform services at scale; service mesh and distributed tracing are standard | Distributed tracing with trace IDs in every log; circuit breaker pattern |
| SAP Labs | You built 8 services; you know the scaling numbers, the Resilience4j config, the WebClient pattern | The candidate with a circuit breaker success story — not just theory |

---

*Part 23 · Why Spring Boot Microservices, Not a Monolith · Full Stack Interview Guide · Hruday D · 2026*
