# Distributed Tracing — Zipkin, Jaeger, and OpenTelemetry
> Part 16 — Observability & Monitoring
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card

- **Distributed tracing** = following a single request end-to-end across all services by connecting **spans** (individual operations) into a **trace** (the full call tree); unlike logs (text events), a trace shows exactly WHO called WHOM, WHEN, and HOW LONG each hop took
- **Trace = root span + child spans**: `GET /api/orders` = root span; inside it, `OrderService.createOrder` = child span; inside that, `SELECT * FROM orders WHERE id=?` = grandchild span; each span has start time, duration, service name, operation name, status, and tags
- **TraceId vs SpanId vs ParentSpanId**: `traceId` is the same for ALL spans in the entire request tree (used to find "all spans for this request"); `spanId` is unique per operation; `parentSpanId` links child to parent — the three together form the span tree
- **W3C Trace Context standard**: `traceparent: 00-traceId-spanId-01` HTTP header; the industry standard for header format; all major tracing libraries (OpenTelemetry, Spring Sleuth 3+) use this; `00` is version, final `01` is "sampled"
- **Sampling**: tracing 100% of requests at scale is expensive; **head-based sampling** decides at root span creation (simple, misses some errors); **tail-based sampling** buffers and decides AFTER seeing the full trace (captures all errors and slow traces); Jaeger and Otel Collector support both
- **OpenTelemetry (OTel)** = CNCF standard for instrumentation; vendor-neutral; one SDK instruments your code, output goes to OTel Collector, Collector exports to Jaeger OR Zipkin OR Datadog OR Tempo OR any backend; prevents lock-in; preferred choice for new services
- **Zipkin** = simpler, lightweight, battle-tested; good for getting started; Zipkin-compatible headers (`X-B3-TraceId`, `X-B3-SpanId`) still widely used
- **Jaeger** = CNCF project, Zipkin-compatible; supports adaptive sampling, better UI for complex microservice graphs; preferred for large-scale deployments

---

## 1. One-Line Definition
Distributed tracing captures the complete execution path of a request across all services as a connected tree of timed spans, answering "which service caused this latency?" and "what is the full dependency graph for this operation?"

---

## 2. The Problem It Solves

Order checkout P99 latency is 3.2 seconds. Monitoring shows order-service P99 is 3.2 seconds. But order-service calls payment-service, inventory-service, and notification-service. Which one is slow?

Without distributed tracing: you check each service's individual metrics, but they all show P50 under 100ms. The problem is inconsistent — only some requests hit the slow path. You can't correlate "this specific slow order-service call" with a specific call to payment-service. You're guessing.

With distributed tracing:
- Search Jaeger for traces with `service:order-service AND duration > 2000ms`
- Find the 3.2-second trace
- Expand it: order-service span (3200ms) → inventory-service span (3100ms) → `SELECT FROM products WHERE id IN (...)` span (3050ms), with a tag `db.rows_affected: 4200`
- Root cause: N+1 query inside inventory-service loading 4,200 products instead of a batch join
- Fix: one targeted SQL query change, P99 drops to 180ms

---

## 3. How It Works Internally

### Span and Trace Structure

```
Trace ID: abc123def456

GET /api/orders (root span)
├── OrderService.createOrder [order-service] 3200ms ← SLOW
│   ├── validateUser [order-service] 12ms
│   │   └── SELECT * FROM users WHERE id=? [postgres] 11ms
│   ├── InventoryService.checkStock [inventory-service] 3100ms ← ROOT CAUSE
│   │   └── SELECT * FROM products WHERE id IN (1,2,3) [postgres] 3050ms
│   │       └── rows_affected: 4200, rows_sent: 3 (N+1 symptom visible as tags)
│   └── PaymentGateway.charge [payment-service] 45ms
│       └── POST https://gateway.io/charge 43ms

Each span has:
  - traceId: abc123def456  ← same for all spans
  - spanId: unique per span (e.g., "7a9f...")
  - parentSpanId: links to parent (null for root span)
  - serviceName: "inventory-service"
  - operationName: "InventoryService.checkStock"
  - startTime: 2024-01-15T10:23:45.123Z
  - duration: 3100ms
  - status: OK / ERROR
  - tags: { "db.type": "postgresql", "db.rows_affected": 4200 }
  - logs: [ { "event": "db.query", "db.statement": "SELECT ..." } ]
```

---

## 4. The Code

### Wrong Way — Manual Trace Propagation

```java
// ❌ WRONG 1: Using deprecated Spring Cloud Sleuth (pre-Spring Boot 3.x)
// Sleuth is deprecated; Spring Boot 3.x uses Micrometer Tracing + OTel bridge

// pom.xml (OLD — don't use for Spring Boot 3.x):
// <dependency>
//     <groupId>org.springframework.cloud</groupId>
//     <artifactId>spring-cloud-starter-sleuth</artifactId>   ← DEPRECATED
// </dependency>
// Use Micrometer Tracing instead
```

```java
// ❌ WRONG 2: Manual span management — verbose, error-prone, leaks spans

@Service
public class OrderService {
    private final Tracer tracer;
    
    public OrderResponse createOrder(OrderRequest request) {
        // ❌ Manual span lifecycle management → easy to forget to close spans
        // If an exception is thrown between start and close, the span leaks
        Span span = tracer.nextSpan().name("createOrder");
        span.start();
        
        try {
            // business logic
            return processOrder(request);
        } catch (Exception e) {
            span.tag("error", "true");
            // ❌ Often forgotten: developers don't always add error tags
            throw e;
        } finally {
            span.end();  // ❌ Often forgotten in exception paths
        }
    }
}
```

### Right Way — OpenTelemetry with Spring Boot 3.x Auto-Instrumentation

```xml
<!-- pom.xml: Spring Boot 3.x = Micrometer Tracing + OpenTelemetry bridge -->
<dependencies>
    <!-- Spring Boot 3.x Micrometer Tracing (replaces Spring Cloud Sleuth) -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-tracing-bridge-otel</artifactId>
    </dependency>
    
    <!-- OpenTelemetry exporter to OTLP (sends to OTel Collector / Jaeger) -->
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-exporter-otlp</artifactId>
    </dependency>
    
    <!-- Spring Boot actuator — enables /actuator/traces endpoint -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
</dependencies>
```

```yaml
# ✅ application.yml — Spring Boot 3.x tracing configuration

management:
  tracing:
    sampling:
      probability: 1.0        # 100% in dev/staging; use 0.1 (10%) in production
  zipkin:
    tracing:
      endpoint: http://jaeger:9411/api/v2/spans   # Jaeger's Zipkin-compatible endpoint

spring:
  application:
    name: order-service       # ← becomes serviceName in all spans from this app

# OTel auto-instrumentation (via micrometer-tracing-bridge-otel):
# ✅ HTTP server spans: auto-created for every incoming REST call
# ✅ HTTP client spans: auto-created for WebClient calls
# ✅ Database spans: auto-created for JPA/JDBC queries (includes SQL statement)
# ✅ Kafka spans: auto-created for Kafka producer/consumer operations
# Zero code changes needed for basic tracing coverage
```

```java
// ✅ RIGHT — Service code with Micrometer Tracing for custom spans and tags

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {
    
    private final ObservationRegistry observationRegistry;  // Spring Boot 3.x tracing
    private final InventoryClient inventoryClient;
    private final OrderRepository orderRepository;
    
    public OrderResponse createOrder(OrderRequest request) {
        
        // ✅ Observation = a unit of work; creates a span automatically
        // The lambda executes inside the span context
        return Observation.createNotStarted("order.create", observationRegistry)
            .lowCardinalityKeyValue("orderType", request.getOrderType().name())
            // ↑ Tags with LOW cardinality ONLY (known enum values, not Ids)
            // High-cardinality keys (userId, orderId) → use span events/logs, not tags
            // High-cardinality tags cause Jaeger's tag index to explode in size
            .observe(() -> {
                
                // ✅ MDC is automatically populated with traceId, spanId by Micrometer Tracing
                // log.info here includes traceId automatically in structured log output
                log.info("Order creation started");
                
                // ✅ Child spans for sub-operations are auto-created by instrumentation:
                // - inventoryClient (WebClient) → auto HTTP span
                // - orderRepository.save (JPA) → auto DB span
                boolean stockAvailable = inventoryClient.checkStock(request.getItems());
                
                if (!stockAvailable) {
                    log.warn("Stock not available");
                    throw new InsufficientStockException();
                }
                
                Order order = orderRepository.save(new Order(request));  // auto DB span
                log.info("Order created successfully, orderId={}", order.getId());
                
                return OrderResponse.from(order);
            });
    }
}
```

```java
// ✅ RIGHT — WebClient auto-propagates W3C traceparent header to downstream services

@Component
public class InventoryClient {
    
    private final WebClient webClient;
    
    public InventoryClient(WebClient.Builder builder,
                            @Value("${services.inventory.url}") String inventoryUrl) {
        this.webClient = builder
            .baseUrl(inventoryUrl)
            // ✅ Spring Boot 3.x + Micrometer Tracing automatically adds:
            // traceparent: 00-{traceId}-{spanId}-01
            // to ALL outgoing WebClient requests
            // No manual header management needed
            .build();
    }
    
    public boolean checkStock(List<OrderItem> items) {
        return Boolean.TRUE.equals(
            webClient.post()
                .uri("/api/stock/check")
                .bodyValue(items)
                .retrieve()
                .bodyToMono(Boolean.class)
                .block()
        );
    }
}
```

```yaml
# ✅ RIGHT — OpenTelemetry Collector configuration
# Acts as a central hub: receives from all services, exports to multiple backends

# otel-collector-config.yaml:
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317    # receives from services
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s                  # batch spans for efficiency
    send_batch_size: 1024
  
  # ✅ Tail sampling: buffer spans, then decide based on full trace
  tail_sampling:
    decision_wait: 10s           # wait 10s to see the full trace
    policies:
      - name: errors-policy
        type: status_code
        status_code: {status_codes: [ERROR]}   # ← always sample ERRORs (100%)
      - name: slow-policy
        type: latency
        latency: {threshold_ms: 1000}          # ← always sample traces > 1s
      - name: probabilistic-policy
        type: probabilistic
        probabilistic: {sampling_percentage: 5}  # ← 5% of healthy/fast traces

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  
  # ✅ Can export to multiple backends simultaneously
  otlp/datadog:
    endpoint: https://trace.agent.datadoghq.com

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, tail_sampling]
      exporters: [jaeger]
```

```typescript
// ✅ RIGHT — Frontend tracing with OpenTelemetry JS

// Install: npm install @opentelemetry/sdk-web @opentelemetry/auto-instrumentations-web

// src/telemetry/tracing.ts
import { WebTracerProvider } from '@opentelemetry/sdk-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';

const provider = new WebTracerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'shop-frontend',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: import.meta.env.VITE_ENV,
    }),
});

provider.addSpanProcessor(
    new BatchSpanProcessor(
        new OTLPTraceExporter({
            url: '/api/otel-proxy/v1/traces',  // ✅ proxy through backend (avoid CORS + hide endpoint)
        })
    )
);

// ✅ Auto-instrument fetch, XMLHttpRequest, and document load
provider.register({
    propagator: new W3CTraceContextPropagator(),  // ← injects traceparent into all fetch calls
});

getWebAutoInstrumentations({
    '@opentelemetry/instrumentation-fetch': {
        propagateTraceHeaderCorsUrls: [/https:\/\/api\.shop\.com\/.*/],
        //                                         ↑ only inject trace headers for our API
        //                                          Don't inject into 3rd party (CDN, analytics)
    },
    '@opentelemetry/instrumentation-document-load': {},
    '@opentelemetry/instrumentation-user-interaction': {
        eventNames: ['click', 'submit'],           // ← trace user clicks and form submits
    },
}).forEach(i => provider.register({ plugins: [i] }));
// ✅ With this, every fetch to our API includes traceparent header
// Backend spans become children of the frontend span → full E2E trace
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between distributed tracing and logging?"

**Hruday's answer:**
> Logs and distributed traces are complementary — they answer different questions.
>
> Logs answer "what happened": a timestamped sequence of events, each describing a state change or an action. You read logs to understand the detailed story of what your code did — what queries ran, what values were returned, what exceptions were thrown.
>
> Distributed traces answer "where did the time go and who called whom": the causal chain of a request, represented as a tree of spans. A trace shows you that `GET /api/orders` took 3.2 seconds, that it called `InventoryService.checkStock` which took 3.1 seconds, which ran a database query that took 3.05 seconds and returned 4,200 rows. This causal, timing-based visualization is impossible to reconstruct from logs alone — you'd need to manually correlate timestamps and application logs across services.
>
> In practice, you use both: the trace gives you the span tree and timing to find WHICH service and WHICH operation caused the problem; the logs (linked by traceId) give you the detailed data to understand WHY that operation was slow and what values were involved.

---

### Q2 — Architecture
**Interviewer asks:** "What is head-based vs tail-based sampling?"

**Hruday's answer:**
> Sampling is how you handle the fact that tracing 100% of requests at scale is too expensive — both in storage and in the overhead of span export.
>
> Head-based sampling makes the keep/drop decision at the START of the request, before any work is done. The first service decides "I will trace this request at 10% probability" and sets the sampled bit in the traceparent header. All downstream services see the same bit and either all sample or all skip. Simple, low overhead. The problem: you throw away the 90% you don't sample before seeing if the request was interesting. A slow or failed request in the dropped 90% is invisible.
>
> Tail-based sampling makes the keep/drop decision AFTER the entire trace is complete. The OTel Collector buffers all spans for a trace window (say 10 seconds), and when the trace is assembled, it applies policies: "keep all traces with any ERROR span", "keep all traces with duration > 1 second", "probabilistically keep 5% of healthy traces". This means: 100% of ERROR traces are always sampled, 100% of slow traces are always sampled, healthy fast traces are downsampled to 5%.
>
> The trade-off: tail-based sampling is more complex (requires the Collector to buffer spans), uses more memory, and slightly increases export latency. But it ensures you never miss a failure, which is the primary use case for tracing. For new projects, I recommend starting with head-based sampling at 20-50% and graduating to tail-based when scale demands it.

---

### Q3 — Comparison
**Interviewer asks:** "Should I use Jaeger or Zipkin? And how does OpenTelemetry fit?"

**Hruday's answer:**
> Zipkin is older and simpler. It uses B3 propagation headers (`X-B3-TraceId`, `X-B3-SpanId`), has a clean UI for small microservice setups, and the server is a single JAR. For teams getting started with distributed tracing, Zipkin is a lower operational overhead choice.
>
> Jaeger is more feature-rich: it supports adaptive sampling (adjusts sampling rate based on service traffic), has a more powerful UI for visualizing complex call graphs, and scales better for large deployments (Kafka ingestion, Cassandra storage). Jaeger is a CNCF project with strong community backing. I'd choose Jaeger for any non-trivial production deployment.
>
> OpenTelemetry is where the real strategic choice lies. OTel is the instrumentation standard — the SDK that instruments your application code. It's completely vendor-neutral: you configure your app with OTel once, and the OTel Collector can export spans to Jaeger, Zipkin, Datadog, Honeycomb, GrafanaTempo, or any backend. This prevents vendor lock-in.
>
> My recommendation: instrument everything with OpenTelemetry SDK; use the OTel Collector as the pipeline; export to Jaeger for trace visualization. If you later decide to switch to Datadog or Honeycomb, you change the Collector exporter config — zero application code changes.
>
> Spring Boot 3.x has first-class OTel support through Micrometer Tracing. There's no reason to use Zipkin's library or Jaeger's library directly anymore.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We add traceId to logs ourselves" | "I manually set X-B3-TraceId as a header and put it in MDC" | Manual trace propagation is fragile and doesn't give you spans; a span has a start time, end time, parent relationship, custom tags, and events — a log with a traceId is just a log with an ID; the real value of distributed tracing is the visual span tree in Jaeger/Zipkin that shows the entire call graph for a single request; Spring Boot 3.x with Micrometer Tracing auto-creates spans for HTTP, JDBC, WebClient, and Kafka without any code changes; manual traceId management gives you 5% of the value for 100% of the effort |
| "We sample 100% of traces in production" | "We trace every request to make sure nothing is missed" | At 1,000 RPS, 100% sampling generates 1,000 traces/second × average 10 spans/trace = 10,000 spans/second; at 10KB per span in Jaeger storage, that's 100MB/sec = 8TB/day of trace data; the cost and performance impact of 100% sampling is prohibitive at any meaningful scale; tail-based sampling at 5% for healthy traces while keeping 100% for errors and slow requests (duration > 1 second) retains all the debugging value at 5-10% of the storage cost; the key insight: you don't need to keep all traces — you only need to keep the INTERESTING ones (failures, slow requests), and tail-based sampling is designed exactly for this |
| "Distributed tracing replaces logging" | "With tracing, you have all the context you need" | Spans and logs are complementary, not substitutes; a span tells you what service ran an operation and how long it took; it does NOT contain the actual DEBUG-level data (SQL parameters, intermediate values, request bodies) — those are in logs; the production workflow: trace in Jaeger to find WHICH service and WHICH span caused a problem (timing-based), then use the traceId in Kibana/ELK to query the detailed logs for that exact trace (content-based); without logs, you know THAT the inventory query took 3 seconds; with logs, you know THAT the inventory query returned 4,200 rows when it should have returned 3; you need both |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a product page that was intermittently slow — P99 of 4 seconds, P50 of 80ms. With only per-service metrics, we couldn't reproduce it and couldn't identify which service was responsible, since all individual services looked fine in steady state.
>
> After enabling Micrometer Tracing with the OTel bridge pointing to Jaeger, we searched for traces of `GET /api/product/:id` with duration > 2000ms. Found them. The trace showed: product-service (root, 3800ms) → recommendations-service (3750ms) → GET /api/user-history (3700ms) → Redis (2ms) + PostgreSQL (3650ms).
>
> The recommendations service was querying user purchase history, which for some users with a long purchase history was reading 15,000 rows from PostgreSQL. No index on `user_id + created_at` on that table. Added the composite index. P99 dropped from 4 seconds to 120ms in 10 minutes of query time.
>
> Without distributed tracing, we had been trying to optimize the product-service (the visible slow point) for two weeks. The actual problem was three services deep. The span tree made it visible in 15 minutes."

---

## 8. Scale Evolution

**1,000 users →** Spring Boot 3.x Micrometer Tracing, 100% sampling, Jaeger all-in-one Docker container. Traces exported via OTLP to Jaeger. Enough for a dev team to see call graphs and debug latency.

**100,000 users →** OTel Collector as pipeline hub. Tail-based sampling (100% errors, 100% > 500ms, 20% healthy). Jaeger with Elasticsearch storage backend (instead of default in-memory). MDC integration so Kibana logs link to Jaeger traces via traceId.

**10 million users →** OTel Collector horizontally scaled. Kafka between Collector and Jaeger for ingestion buffering. Adaptive sampling per service (high-traffic services sampled at 1%, low-traffic at 25%). Trace retention: 7 days full traces, 30 days error-only. Integration with Grafana Tempo for long-term storage at lower cost than Jaeger + Elasticsearch.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flow spans 8+ services (auth, user, payment, gateway, ledger, notification, fraud, audit); tracing is the only practical way to debug a failed transaction across all of them in real time; regulatory requirement to show full execution path for disputed transactions | Multi-service trace design for fintech; tail sampling for 100% error capture; compliance trace retention |
| Swiggy / Meesho | Order-to-delivery spans product, cart, order, payment, inventory, logistics, rider-assignment; tracing shows which step caused delivery delay; P99 latency SLA enforcement requires latency-based tail sampling | Complex trace topology; latency SLA enforcement; cross-vertical span attribution |
| Adobe / Microsoft | Document processing pipeline (OCR, AI extract, render, export) as a trace; Azure Monitor Application Insights (Microsoft's tracing platform) is the likely backend; identification of which processing stage is slow for specific document types | Azure Application Insights vs OTel; pipeline stage tracing; batch job tracing patterns |
| SAP Labs | Product page slowness traced to recommendations 3 levels deep; 2-week investigation solved in 15 minutes with span tree; composite index fix from trace evidence; direct before/after debugging productivity story | Specific trace-to-fix story; deep call chain diagnosis; cross-team knowledge sharing through Jaeger UI |

---

## 10. Related Topics — What to Study Next

- **Topic 263 — Structured Logging** — the integration point: Micrometer Tracing automatically sets `traceId` and `spanId` in MDC, so every `log.info()` call in a traced request includes the trace and span IDs in the JSON output; this links logs to traces — click a traceId in Kibana, open in Jaeger, and vice versa
- **Topic 267 — Micrometer and Prometheus** — tracing covers per-request debugging; Prometheus metrics cover aggregate health; together they cover the "RED" observability method: Rate (requests/sec from Prometheus), Errors (% from Prometheus), Duration (histogram from Prometheus + trace deep-dive from Jaeger)
- **Topic 265 — Centralized Logging with ELK** — traces provide the call graph; ELK provides the log content; the traceId in every log line is the link between them; Kibana + Jaeger as a combined debugging workflow is standard for teams with both systems

---

*Part 16 · Distributed Tracing — Zipkin, Jaeger, and OpenTelemetry · Full Stack Interview Guide · Hruday D · 2026*
