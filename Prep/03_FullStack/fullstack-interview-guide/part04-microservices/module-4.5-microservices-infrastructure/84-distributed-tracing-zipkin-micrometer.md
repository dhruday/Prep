# Distributed Tracing — Correlation IDs, Zipkin, Micrometer Tracing
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Distributed tracing = a method of tracking a single user request as it flows through multiple microservices, by propagating a unique trace ID and span IDs through all network calls, then collecting all spans in a centralised system (Zipkin, Jaeger) where you can visualise the complete execution path as a timeline
- Trace = represents ONE request's full journey through the system (one trace ID)
- Span = represents ONE service's unit of work within that trace (each service creates one or more spans; spans have parent-span relationships forming a tree)
- Why needed: in a monolith, a single stack trace shows the entire call path. In microservices, a 500ms order placement might involve 5 services — without tracing, you have 5 separate log files with no way to correlate which log lines belong to "THIS user's request"
- Spring Boot 3.x + Micrometer Tracing: replaces old Spring Cloud Sleuth; add micrometer-tracing-bridge-otel + opentelemetry-exporter-zipkin dependencies → trace IDs are automatically added to logs and propagated through WebClient, Kafka messages, and RestTemplate calls
- Correlation ID pattern: the simpler first step before full tracing — just propagating a UUID in an HTTP header X-Correlation-ID through all service calls, so logs across services can be filtered by the same ID; every production system should at minimum have this
- Gap to bridge: most candidates can say "use Zipkin" but can't explain how span context propagates through Kafka messages (manual header injection), how to structure business-meaningful spans (adding custom attributes), or how to correlate traces with logs via MDC

---

## 1. One-Line Definition
Distributed tracing tracks the end-to-end journey of a single request across all microservices by propagating a trace context (trace ID + span ID) through every network call, asynchronous message, and service boundary — collecting all spans in a centralised system to provide a unified timeline view of cross-service request execution.

---

## 2. The Problem It Solves

### Debugging Without Distributed Tracing

```
Scenario: User "Hruday" places an order at 10:03:45.231. Order ID = ord-789.
The request returns 504 (timeout) after 8 seconds. User complains.

Without distributed tracing:
  Engineer checks OrderService logs at 10:03:45:
    "Received place order request for userId=usr-42"
    "Calling InventoryService..."
    ...4 seconds pass...
    "InventoryService call completed"
    "Calling PaymentService..."
    ...4 more seconds pass...
    "PaymentService timed out" ← found it? Maybe.
    
  But which InventoryService instance handled it?
  There are 3 InventoryService pods. The call might have gone to any of them.
  "Check InventoryService logs" → 3 pods × hundreds of other users' requests
  → NO WAY to find which log lines correspond to THIS specific request
  → 4 seconds in InventoryService — was it a DB call? External API? Cold start?
  → Unknown without digging through all 3 pods' logs with no correlation

With distributed tracing (traceId = abc-1234-xyz):
  OrderService span: [10:03:45.231 - 10:03:53.231] 8000ms TOTAL
    └─ InventoryService span: [10:03:45.250 - 10:03:49.251] 4001ms
         └─ DB query span: [10:03:49.000 - 10:03:49.250] 250ms
         └─ External supplier API span: [10:03:45.260 - 10:03:49.240] 3980ms ← PROBLEM HERE
    └─ PaymentService span: [10:03:49.260 - 10:03:53.220] 3960ms TIMEOUT

  Immediately visible: External Supplier API in InventoryService took 3.98 seconds.
  Root cause found in < 1 minute. All correlated by traceId=abc-1234-xyz.
```

---

## 3. How It Works Internally

### The W3C TraceContext Standard — Trace ID and Span IDs

```
TERMINOLOGY:
────────────
Trace      = the entire operation (one user request end-to-end)
             Identified by one traceId (128-bit, globally unique UUID)
             
Span       = a single unit of work within the trace
             Identified by spanId (64-bit)
             Has: parentSpanId (the span that called this one)
             Has: timestamps (start, end → duration)
             Has: attributes (key-value metadata, e.g., http.status_code=200, db.statement="SELECT...")
             Has: events (instantaneous points, e.g., "cache miss at t=123ms")

PROPAGATION via HTTP headers (W3C format):
  traceparent: 00-{traceId}-{parentSpanId}-01
  e.g.: traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01

  When OrderService calls InventoryService via WebClient:
  1. OrderService's current span has traceId=abc123, spanId=span001
  2. OrderService creates a new CHILD span for the outgoing call: spanId=span002, parentSpanId=span001
  3. Injects into HTTP header: traceparent: 00-abc123-span001-01
  4. InventoryService receives the HTTP call
  5. Extracts traceparent header → continues with traceId=abc123, parentSpanId=span001
  6. Creates its own span: traceId=abc123, spanId=span003, parentSpanId=span001
  7. InventoryService's spans are part of the SAME trace as OrderService's spans

All spans from all services with the same traceId are collected by Zipkin/Jaeger
→ Zipkin reconstructs the tree: span001 (root) → span002 → span003 → span004...
→ Renders as a Gantt chart showing time spent in each service

PROPAGATION via Kafka messages:
  Unlike HTTP (where Micrometer injects headers automatically), Kafka requires manual header injection:
  producer.headers.add("traceparent", traceContext.traceId() + "-" + traceContext.spanId());
  consumer reads the header and continues the trace
  → Micrometer Tracing's Spring Kafka integration handles this automatically when configured
```

### Micrometer Tracing + OpenTelemetry (Spring Boot 3.x Stack)

```
Spring Boot 3.x dependency stack:
  micrometer-tracing-bridge-otel    → bridges Micrometer Observation API to OpenTelemetry
  opentelemetry-exporter-zipkin     → exports spans to Zipkin (or use otlp exporter for Jaeger)
  spring-boot-starter-actuator      → exposes /actuator/traces (local trace viewing)

What Spring auto-configures:
  - Tracer bean backed by OpenTelemetry SDK
  - Auto-instrumentation of:
    - WebClient (outgoing HTTP) → injects traceparent header automatically
    - Spring MVC (incoming HTTP) → extracts traceparent, creates server span
    - Spring Kafka (producers and consumers) → propagates trace headers
    - Spring Data (repository calls) → creates DB spans (optional, configurable)
    - @Scheduled methods → creates root spans for background jobs

  - MDC (Mapped Diagnostic Context) integration:
    - traceId and spanId are automatically added to MDC
    - Log pattern: [%X{traceId}] [%X{spanId}] → every log line has the trace context
    - Logs from all services with the same traceId can be aggregated in Kibana/Loki
```

---

## 4. The Code

### Spring Boot 3.x Distributed Tracing Setup
```xml
<!-- pom.xml dependencies -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-zipkin</artifactId>
</dependency>
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

```yaml
# application.yml
management:
  tracing:
    sampling:
      probability: 1.0  # Trace 100% of requests (use 0.1 for production = 10% sampling)
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans

logging:
  pattern:
    level: "%5p [${spring.application.name},%X{traceId},%X{spanId}]"
  # This pattern adds [ordersvc,abc1234,def5678] to every log line
  # When you grep logs in Kibana for traceId=abc1234, you get ALL services' logs for that request
```

### Adding Custom Spans and Attributes
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final Tracer tracer;  // Micrometer Tracer — auto-injected

    public Order placeOrder(CreateOrderRequest request) {
        // Create a custom span for a business operation that's worth tracking separately
        Span span = tracer.nextSpan()
            .name("order.validate-items")
            .start();
        
        try (Tracer.SpanInScope ws = tracer.withSpan(span)) {
            // Add business attributes to the span — visible in Zipkin/Jaeger trace detail
            span.tag("order.item_count", String.valueOf(request.getItems().size()));
            span.tag("order.total_value", request.getTotal().toString());
            span.tag("user.id", request.getUserId());
            
            // If an important business event happens, record it as a span event
            if (request.hasCoupon()) {
                span.event("coupon.applied");
                span.tag("coupon.code", request.getCouponCode());
            }
            
            validateItems(request.getItems());
            // span duration = time spent in validation
            
        } catch (Exception ex) {
            span.error(ex);  // Mark span as errored — visible as red in Zipkin UI
            throw ex;
        } finally {
            span.end();  // ALWAYS end the span (try-finally or try-with-resources)
        }
        
        // Remaining order processing — in different spans (auto-created by WebClient, DB calls, etc.)
    }
}
```

### Correlation ID Pattern (simpler alternative before full tracing)
```java
// Correlation ID Filter — adds X-Correlation-ID to all incoming requests
// If upstream already sent one, use theirs; otherwise generate fresh
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    public static final String CORRELATION_ID_MDC_KEY = "correlationId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String correlationId = request.getHeader(CORRELATION_ID_HEADER);
            if (!StringUtils.hasText(correlationId)) {
                correlationId = UUID.randomUUID().toString();
            }

            // Put in MDC so all log statements in this thread include it
            MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
            // Include in response headers so clients can correlate errors
            response.setHeader(CORRELATION_ID_HEADER, correlationId);

            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(CORRELATION_ID_MDC_KEY);  // MUST clear to prevent leak in thread pools
        }
    }
}

// Propagate correlation ID through WebClient calls
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder()
            .filter((request, next) -> {
                String correlationId = MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
                if (correlationId != null) {
                    return next.exchange(ClientRequest.from(request)
                        .header(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId)
                        .build());
                }
                return next.exchange(request);
            });
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does distributed tracing work?"

**Hruday's answer:**
> Distributed tracing works by assigning every incoming request a globally unique trace ID and propagating it through all downstream service calls. Each service that handles the request creates a span — a record of its own processing segment, with start time, end time, any errors, and metadata. Each span records the trace ID and its parent span's ID, creating a tree of nested spans representing the call hierarchy.
>
> These spans are sent asynchronously to a central collection system — Zipkin or Jaeger — which reconstructs the tree from all the spans with the same trace ID. In the Zipkin UI, you see a Gantt chart: a horizontal bar for each service, sized by how long that service took, indented to show which service called which. You immediately see the call tree, the durations at each level, where time was spent, and where errors occurred.
>
> In Spring Boot 3.x with Micrometer Tracing, this is automatic for HTTP calls via WebClient and Spring MVC — the `traceparent` header is injected and extracted following the W3C standard. The trace ID is also injected into the logging MDC, so every log line includes the trace ID. This means you can search Kibana for a specific trace ID and get all log lines from all services that were involved in that specific request.

---

### Q2 — Sampling and Performance
**Interviewer asks:** "If you trace 100% of requests, doesn't that add significant overhead?"

**Hruday's answer:**
> Yes — tracing 100% of requests has measurable overhead. Span creation, attribute addition, and the async export to Zipkin add CPU and memory overhead per request. For a service handling 10,000 requests per second, tracing every single one generates 10,000 span objects per second plus network I/O for exporting to Zipkin.
>
> The standard production approach is sampling — only trace a fraction of requests. With Micrometer Tracing, `management.tracing.sampling.probability=0.1` means 10% of requests are traced. The sampling decision is made at the first service in the call chain (head-based sampling), and the decision propagates in the trace headers — if a request is sampled, all downstream services trace it; if not sampled, no service creates spans for that request. This ensures complete traces for sampled requests.
>
> However, 10% sampling means slow requests or errors might fall in the unsampled 90%. For production debugging, tail-based sampling is more useful: only sample requests that exceed a latency threshold (e.g., trace everything above 500ms) or that result in errors. OpenTelemetry Collector supports tail-based sampling — it buffers spans and decides sampling AFTER seeing the full trace outcome. This gives you traces for the important requests (slow or broken) at a fraction of the cost of 100% sampling.

---

### Q3 — Kafka and Async Tracing
**Interviewer asks:** "How do you trace a request that flows through Kafka — where there's no synchronous HTTP call to propagate headers?"

**Hruday's answer:**
> Kafka messages support headers, and trace context can be propagated through message headers just like HTTP headers. The OpenTelemetry spec defines standard header names for Kafka: `traceparent` in the Kafka record headers.
>
> Spring Kafka with Micrometer Tracing + OpenTelemetry auto-instrumentation handles this transparently. The producer side injects the current span's trace context into the Kafka record headers when sending a message. The consumer side extracts the trace context from headers when receiving a message and creates a child span linked to the original trace.
>
> The resulting trace in Zipkin has a special kind of link between the producer span and consumer span called a "follows-from" relationship — it's not a strict parent-child because there's no direct synchronous call. Instead, the consumer span shows "this span was caused by span XYZ from the producer" with a reference. You can follow the chain: REST request → OrderService span → Kafka publish span → [message in transit] → InventoryService Kafka consumer span → DB update span. The full cross-service, cross-protocol trace is visible in one waterfall diagram.

---

### Q4 — Logs, Traces, and Metrics Correlation
**Interviewer asks:** "How do you connect distributed traces with log lines and metrics?"

**Hruday's answer:**
> The three telemetry pillars — logs, traces, and metrics — become most powerful when correlated. The connection is the trace ID.
>
> For logs: Micrometer Tracing automatically injects the current trace ID and span ID into the logging MDC (Mapped Diagnostic Context). The log configuration pattern includes `%X{traceId}` which adds the trace ID to every log line while a trace is active. When you have a Zipkin trace for a slow or errored request and you want to see the application logs, you search Kibana/Loki by traceId to get all log lines from all services for that specific request.
>
> For metrics: Micrometer metrics can be tagged with the service name and deployment version. When a Prometheus alert fires (error rate spike), you go to Grafana, find the time window, look at the error rate metric. Then go to Zipkin and query for traces in that time window with error status — the traces show you which requests triggered the errors. The time correlation connects the metric anomaly to specific traces.
>
> OpenTelemetry Collector can receive all three signals — logs, traces, metrics — from services using OTLP format, correlate them, and send to different backends. The modern "observe everything with one SDK" approach uses the OTLP exporter from Spring Boot services to the Collector, which fans out to Jaeger (traces), Prometheus (metrics), and Loki (logs). Grafana Tempo can link directly from log lines to traces and from traces to metrics charts.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Just add Zipkin and tracing works" | "Add the Zipkin dependency and everything is automatically traced" | "Auto-instrumentation covers HTTP (WebClient, MVC) and Spring Data calls. But important spans must be explicitly created for: business-significant operations (how long did coupon validation take?), external API calls not proxied through WebClient (raw HttpURLConnection, Apache HttpClient), and background jobs (@Scheduled, @Async methods). A trace that only shows 'OrderService HTTP span' with no internal detail isn't useful for 'which step was slow.'" |
| "Trace IDs in logs are enough" | "We just add traceId to logs and search by it — we don't need Zipkin" | "Logs with trace IDs tell you WHAT happened and in what order. Zipkin/Jaeger shows you HOW LONG each step took as a visual timeline. When debugging 'Why is this endpoint slow?', a log-only approach means reading hundreds of timestamps and mentally calculating durations. A flame chart in Zipkin shows the bottleneck in 5 seconds. Both are needed — logs for detailed application events, traces for performance timeline visualisation." |
| "Sampling means some requests aren't traced, problem" | "With sampling enabled, I might miss the slow request I'm debugging" | "This is why tail-based sampling exists: configure the OpenTelemetry Collector to sample ALL requests above a latency threshold (e.g., > 200ms = always trace) and sample only 5% of fast requests. You never miss a slow request. For production debugging, this is far more useful than 10% uniform sampling that might miss the one slow request you're investigating. Alternatively, enable full tracing temporarily during an active incident via dynamic sampling rate configuration." |
| "MDC auto-propagates across threads" | "traceId is in MDC, so all threads automatically have it" | "MDC is ThreadLocal — it's isolated to the thread that set it. In reactive (WebFlux) code, Spring WebFlux + Micrometer Tracing uses reactor-context instead of ThreadLocal and must be explicitly propagated using `Hooks.enableAutomaticContextPropagation()`. In traditional @Async / ExecutorService scenarios, you must copy the MDC map to the new thread manually, or use Micrometer's ContextSnapshot for OpenTelemetry context propagation. Missing this causes trace ID to be null in async log lines." |

---

## 7. Hruday's Real Experience Hook

> "Oracle ERP's workflow engine had audit trails that showed every step of a multi-module process: the timestamp, user, and system that processed each step of an approval workflow. It was a temporal log of what happened to a business object across systems. When I started studying distributed tracing, I recognised this as the same concept but for technical system calls rather than business workflow steps. The difference is granularity: Oracle's audit was at business-step level (minutes between steps); distributed tracing captures millisecond-level service calls. Both solve the same fundamental problem: 'this request touched 5 systems — which one caused the delay?'"

---

## 8. Scale Evolution

**No tracing (monolith):** Single log file, stack traces are complete. MDC with user/request IDs is sufficient.

**First distributed steps:** Add correlation ID header propagation. Every log line in every service has the `X-Correlation-ID`. Grep Kibana by ID to see logs across services. Zero tracing infra overhead — just a UUID in a header.

**Dedicated tracing infra:** Add Micrometer Tracing + Zipkin. 10-20% head-based sampling. Visualise call trees. Identify bottlenecks in slow requests. Add custom spans for business-significant operations.

**Platform maturity:** OpenTelemetry Collector as a centralised telemetry gateway. Tail-based sampling (always trace slow + error requests). Logs + Traces + Metrics correlated via traceId. Grafana as unified observability UI (Loki + Tempo + Prometheus in one view).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment processing: "User reports payment stuck for 10 minutes." Tracing enables instant identification of whether it's stuck in Payment Gateway, Risk Assessment, or Settlement. In fintech, the ability to quickly trace and resolve issues directly impacts trust. | "How would you debug a payment that's timing out in production?" |
| Swiggy / Meesho | Order delivery ETA: "User says their ETA jumped from 30 to 60 min after placing order." Tracing the order event flow from placement through inventory, routing, driver assignment shows exactly where the delay was introduced. | "How do you find which microservice caused an unexpected latency spike during peak hours?" |
| Adobe / Microsoft | Creative Cloud file processing: "Upload seems stuck." Tracing through upload service, virus scan, format conversion, CDN upload shows the exact step that's lagging. At Adobe scale, observability tooling is a core engineering discipline. | "How do you ensure SLA compliance for Creative Cloud file operations?" |
| SAP Labs (current) | SAP's own observability stack uses Application Logging Service and SAP Cloud ALM for distributed request tracking in BTP applications. Micrometer/OTel integration with SAP's observability is directly applicable to senior engineer responsibilities. | "How would you instrument a Spring Boot microservice deployed on SAP BTP for observability?" |

---

## 10. Related Topics — What to Study Next

- **Topic 82 — Service Mesh (Istio)** — Envoy sidecar proxies in Istio automatically propagate trace headers for HTTP calls; Istio can be configured to export spans to the same Jaeger/Zipkin instance, giving platform-level tracing without any per-service instrumentation
- **Topic 85 — Health Checks and Readiness Probes** — health endpoints are themselves observable; including health check latency in trace data shows whether dependent services' health impacts application performance; monitoring health check call chains is a real debugging use case
- **Topic 79 — Outbox Pattern** — tracing across asynchronous Kafka events requires trace context propagation in Kafka headers; understanding the Outbox pattern and its Kafka delivery mechanism explains why trace context propagation matters for async flows

---

*Part 4 · Distributed Tracing — Correlation IDs, Zipkin, Micrometer Tracing · Full Stack Interview Guide · Hruday D · 2026*
