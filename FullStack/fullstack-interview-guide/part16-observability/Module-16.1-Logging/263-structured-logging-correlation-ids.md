# Structured Logging — JSON Logs and Correlation IDs
> Part 16 — Observability & Monitoring
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Structured logging** = logs as machine-parseable JSON, not free-text strings; `{"timestamp":"2024-01-15T10:23:45.123Z","level":"INFO","service":"order-service","traceId":"abc123","message":"Order created","orderId":99}` — every field is queryable; unstructured log `[INFO] Order created` requires regex parsing
- **Correlation ID / Trace ID**: a unique identifier generated at the request boundary (API Gateway or the first service) and propagated through ALL downstream calls via HTTP headers (`X-Correlation-ID`); every log line in every service for a single user request shares the same correlation ID — enables "show me everything that happened for request X"
- **Spring Boot structured logging**: add `logstash-logback-encoder` dependency; configure `logback-spring.xml` with `LogstashEncoder`; this outputs JSON with all MDC fields automatically included in every log line
- **MDC (Mapped Diagnostic Context)**: thread-local key-value store in SLF4J; `MDC.put("traceId", correlationId)` at request start; the encoder includes ALL MDC entries in every JSON log line automatically; `MDC.clear()` must be called at request end (filter or interceptor) to prevent thread pool MDC leakage
- **Security rule**: NEVER log sensitive data — no passwords, no credit card numbers, no CVVs, no SSNs, no auth tokens; even "partial" card numbers violate PCI-DSS if stored in logs; use field masking or exclusion in the log encoder
- **Log sampling**: at high throughput (10,000+ RPS), 100% DEBUG logging overwhelms log storage; use sampling: log 100% of ERROR/WARN, 10% of INFO, 1% of DEBUG for non-failing requests; keep 100% for slow requests (P99 candidates)

---

## 1. One-Line Definition
Structured logging emits log events as JSON with consistent, queryable fields rather than free-text lines, enabling automated search, filtering, and correlation across distributed services using a shared trace/correlation ID.

---

## 2. The Problem It Solves

In a microservices system, a checkout flow touches 5+ services. When a user reports "my order got stuck", the support team faces: thousands of log files across 5 services, free-text lines like `[INFO] Processing order for user abc123`, and no clear way to find which service failed or in what order.

With structured logging and correlation IDs:
- Every log line has `"traceId": "a7b4c1d2e3"` 
- Elasticsearch query: `traceId:a7b4c1d2e3 AND level:ERROR` returns all errors across all services for that one request
- Timeline shows the exact sequence: order-service → payment-service → notification-service, and exactly which step took 4 seconds longer than expected

---

## 3. How It Works Internally

### Propagation Chain

```
Browser / API Client
  ↓ HTTP Request (no X-Correlation-ID header)
  
API Gateway
  ↓ Checks for X-Correlation-ID header
  ↓ If missing: generates UUID → X-Correlation-ID: a7b4-c1d2-e3f4-...
  ↓ Adds to response headers and MDC
  ↓ Logs: { "traceId": "a7b4", "path": "/api/orders", "method": "POST" }

Order Service
  ↓ Receives request with X-Correlation-ID: a7b4
  ↓ CorrelationFilter: MDC.put("traceId", "a7b4")
  ↓ All subsequent logs in this thread automatically include "traceId": "a7b4"
  ↓ Calls Payment Service: passes X-Correlation-ID in outgoing request headers

Payment Service
  ↓ Receives request with X-Correlation-ID: a7b4
  ↓ MDC.put("traceId", "a7b4")
  ↓ Logs: { "traceId": "a7b4", "message": "Payment processed", "txnId": "TXN-001" }

Log Aggregator (ELK / Splunk)
  ↓ Collects from all services
  ↓ traceId:"a7b4" returns ALL events across ALL services for this one request
```

---

## 4. The Code

### Wrong Way — Unstructured, Unsafe Logging

```java
// ❌ WRONG 1: Free-text logging — hard to parse, no context, leaks sensitive data

@RestController
public class OrderController {
    
    private static final Logger log = LoggerFactory.getLogger(OrderController.class);
    
    @PostMapping("/api/orders")
    public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request) {
        
        // ❌ Free text: "user" and "items" are not queryable fields
        // To find this in ELK you need regex: log.message:"Creating order for"
        log.info("Creating order for user " + request.getUserId() + 
                  " items=" + request.getItems().size());
        
        // ❌ String concatenation in log — evaluates even when DEBUG is disabled
        // ← use log.debug("...", param) instead
        log.debug("Full request body: " + request.toString());
        
        // ❌ SECURITY VIOLATION: logging credit card data — PCI-DSS violation
        log.info("Payment card: " + request.getPayment().getCardNumber());
        //                                                 ^^^^^^^^^
        // Even partial card numbers in logs = PCI-DSS violation in most interpretations
        
        OrderResponse response = orderService.createOrder(request);
        return ResponseEntity.status(201).body(response);
    }
}
```

```java
// ❌ WRONG 2: MDC not cleared — thread pool MDC leakage

@Component
public class CorrelationFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpReq = (HttpServletRequest) req;
        String correlationId = Optional.ofNullable(httpReq.getHeader("X-Correlation-ID"))
            .orElse(UUID.randomUUID().toString());
        
        MDC.put("traceId", correlationId);
        
        chain.doFilter(req, res);
        
        // ❌ No MDC.clear() — when this thread is returned to the pool and reused
        // for the NEXT request, the old traceId is still in MDC
        // Next request's logs will have the PREVIOUS request's traceId
    }
}
```

### Right Way — Structured Logging with JSON and MDC

```xml
<!-- pom.xml -->
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

```xml
<!-- src/main/resources/logback-spring.xml -->
<!-- ✅ JSON structured logging for production -->
<configuration>
    
    <springProfile name="production,staging">
        <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <!-- ✅ Include MDC fields (traceId, userId, etc.) automatically -->
                <includeMdcKeyName>traceId</includeMdcKeyName>
                <includeMdcKeyName>userId</includeMdcKeyName>
                <includeMdcKeyName>sessionId</includeMdcKeyName>
                
                <!-- ✅ Add service metadata to every log line -->
                <customFields>{"service":"order-service","env":"${SPRING_PROFILES_ACTIVE}"}</customFields>
                
                <!-- ✅ Use epoch millis for timestamp precision -->
                <timestampPattern>yyyy-MM-dd'T'HH:mm:ss.SSS'Z'</timestampPattern>
            </encoder>
        </appender>
    </springProfile>
    
    <!-- ✅ Human-readable format for local development -->
    <springProfile name="local,default">
        <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level [%X{traceId}] %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
    </springProfile>
    
    <root level="INFO">
        <appender-ref ref="STDOUT" />
    </root>
    
    <!-- ✅ Fine-grained level control per package -->
    <logger name="com.sap.shop.service" level="DEBUG" additivity="false">
        <appender-ref ref="STDOUT" />
    </logger>
    <logger name="org.springframework.web" level="WARN" />
    <logger name="org.hibernate.SQL" level="DEBUG" />  <!-- SQL in non-prod -->
</configuration>
```

```java
// ✅ RIGHT — CorrelationFilter with proper MDC management

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationFilter implements Filter {
    
    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    private static final String TRACE_ID_MDC_KEY = "traceId";
    
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpReq = (HttpServletRequest) req;
        HttpServletResponse httpRes = (HttpServletResponse) res;
        
        // ✅ Use existing correlation ID from upstream or generate one
        String traceId = Optional.ofNullable(httpReq.getHeader(CORRELATION_ID_HEADER))
            .filter(id -> !id.isBlank())
            .orElse(UUID.randomUUID().toString());
        
        // ✅ Set MDC — automatically included in every log line in this thread
        MDC.put(TRACE_ID_MDC_KEY, traceId);
        MDC.put("method", httpReq.getMethod());
        MDC.put("path", httpReq.getRequestURI());
        
        // ✅ Echo correlation ID back in response header (clients can track it)
        httpRes.setHeader(CORRELATION_ID_HEADER, traceId);
        
        try {
            chain.doFilter(req, res);
        } finally {
            // ✅ CRITICAL: always clear MDC, even on exception
            // Without this, thread pool threads carry stale MDC to the next request
            MDC.clear();
        }
    }
}
```

```java
// ✅ RIGHT — Service-level structured logging with context fields

@Service
@Slf4j   // Lombok-generated: private static final Logger log = LoggerFactory.getLogger(this.class)
public class OrderService {
    
    public OrderResponse createOrder(OrderRequest request) {
        // ✅ Add domain-specific context to MDC for this operation
        MDC.put("userId", request.getUserId());
        MDC.put("itemCount", String.valueOf(request.getItems().size()));
        
        try {
            log.info("Order creation started");
            // ← JSON output: { "traceId":"a7b4", "userId":"usr-001", "itemCount":"2",
            //                   "message":"Order creation started", "level":"INFO",
            //                   "service":"order-service", ... }
            
            // ✅ Log parameters with SLF4J placeholders — NOT string concatenation
            // Placeholder syntax: evaluated lazily (no String creation if log level disabled)
            log.debug("Processing {} items for user {}", request.getItems().size(), request.getUserId());
            
            // Validate stock
            validateStock(request);
            
            // Create the order
            Order order = orderRepository.save(new Order(request));
            MDC.put("orderId", String.valueOf(order.getId()));
            
            // ✅ Structured parameters added inline via structured argument (logstash extension)
            log.info("Order created successfully");
            // ← Output includes traceId, userId, itemCount, orderId — all from MDC
            
            // Publish event
            publishOrderEvent(order);
            
            return OrderResponse.from(order);
            
        } catch (InsufficientStockException e) {
            // ✅ WARN for business errors (expected path — user attempted to buy out-of-stock)
            log.warn("Order creation failed — insufficient stock for product {}", e.getProductId());
            throw e;
            
        } catch (Exception e) {
            // ✅ ERROR for unexpected errors — include exception stack trace
            log.error("Order creation failed — unexpected error", e);
            throw new OrderCreationException("Failed to create order", e);
            
        } finally {
            // ✅ Clean up domain-level MDC (not the request-level traceId — that's cleared by filter)
            MDC.remove("userId");
            MDC.remove("itemCount");
            MDC.remove("orderId");
        }
    }
}
```

```java
// ✅ RIGHT — Propagating correlation ID in outgoing WebClient calls

@Component
public class PaymentServiceClient {
    
    private final WebClient webClient;
    
    public PaymentServiceClient(WebClient.Builder builder,
                                  @Value("${services.payment.url}") String paymentUrl) {
        this.webClient = builder.baseUrl(paymentUrl)
            // ✅ Filter: add correlation ID to every outgoing request
            .filter((request, next) -> {
                String traceId = MDC.get("traceId");  // get current request's trace ID
                return next.exchange(
                    ClientRequest.from(request)
                        .header("X-Correlation-ID", traceId != null ? traceId : "unknown")
                        .build()
                );
            })
            .build();
    }
    
    public PaymentResult charge(PaymentRequest request) {
        return webClient.post()
            .uri("/api/payments/charge")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(PaymentResult.class)
            .block();
    }
}
```

```java
// ✅ RIGHT — Frontend structured error logging

// errorLogger.ts
import type { ErrorInfo } from 'react';

interface StructuredLogEntry {
    timestamp: string;
    level: 'ERROR' | 'WARN' | 'INFO';
    service: string;
    sessionId: string;
    correlationId?: string;
    message: string;
    errorCode?: string;
    stack?: string;
    userId?: string;
}

const sessionId = crypto.randomUUID();

export function logError(message: string, error?: Error, context?: Partial<StructuredLogEntry>): void {
    const entry: StructuredLogEntry = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        service: 'shop-frontend',
        sessionId,
        message,
        stack: error?.stack,
        ...context,
    };
    
    // ✅ Send to backend logging endpoint (which forwards to ELK)
    // Use sendBeacon for better reliability on page unload
    navigator.sendBeacon('/api/logs/client', JSON.stringify(entry));
    
    // ✅ Also send to Sentry (Topic 269)
    // Sentry.captureException(error, { extra: context });
}

// React Error Boundary:
export function onErrorBoundaryError(error: Error, errorInfo: ErrorInfo): void {
    logError('React render error', error, {
        errorCode: 'REACT_RENDER_ERROR',
        // ✅ Include component stack for debugging
        stack: errorInfo.componentStack ?? error.stack,
    });
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is structured logging and why is it better than plain text logs?"

**Hruday's answer:**
> Structured logging emits logs as JSON objects with consistent, named fields, rather than printed sentences. A structured log line looks like: `{"timestamp":"2024-01-15T10:23:45Z","level":"INFO","service":"order-service","traceId":"a7b4","userId":"usr-001","orderId":99,"message":"Order created"}`.
>
> The advantages over plain text like `[INFO] Order created for user usr-001 order 99`:
>
> First, queryability. In Elasticsearch, I can query `userId:usr-001 AND level:ERROR` to find all errors for a specific user. With plain text, this requires a regex that may not work on all log formats and is far slower.
>
> Second, correlation. Every log line has a `traceId` field. To debug a checkout failure, I query `traceId:a7b4` and get every log line from every service — order, payment, notification — for that single request, in chronological order. Without this, finding the failure in thousands of log files is hours of work.
>
> Third, metrics extraction. Log aggregation tools (ELK, Datadog) can extract a field like `responseTimeMs` from every log line into a time-series metric. Plain text requires custom parsers that break on any log format change.
>
> Fourth, alerting. I can alert on `level:ERROR AND service:payment-service AND count > 10 in 1 minute` because the fields are consistent. Plain text alerts require careful regex that becomes brittle as log format evolves.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does MDC work and why must it be cleared?"

**Hruday's answer:**
> MDC — Mapped Diagnostic Context — is a thread-local key-value map that SLF4J provides. Anything you `put` into it is automatically included in every log line written by that thread, without you explicitly passing it to every `log.info()` call.
>
> The typical pattern: at request start (in a Servlet filter or Spring interceptor), you put `traceId`, `userId`, and `path` into MDC. Your service, repository, and utility classes all call `log.info(...)` without knowing about these fields. The JSON encoder reads the MDC and includes all keys in every emitted JSON object. Request ends — MDC cleared.
>
> Why clearing is critical: Spring Boot (and any Java web server) uses a thread pool. A thread that handles request A is returned to the pool and assigned to request B. If you didn't `MDC.clear()` at the end of request A, request B's logs will include request A's `traceId`, `userId`, etc. This causes log correlation to fail silently: you'll find "ghost" log lines appearing under the wrong trace ID.
>
> The safe pattern: wrap `chain.doFilter()` in a try-finally, with `MDC.clear()` in the finally block. No matter how the request ends (success, exception, timeout), MDC is guaranteed to be cleared and the thread returned clean to the pool.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "At what point does logging become harmful?"

**Hruday's answer:**
> Three ways logging becomes harmful.
>
> First, security: logging sensitive data. Passwords, card numbers, auth tokens, and PII in logs means any log access — developers, log platform vendors, auditors — can see that data. PCI-DSS and GDPR have specific requirements. A log that contains full card numbers is a data breach waiting to happen. The rule: never log anything that would be a problem if the log was leaked.
>
> Second, performance: excessive high-volume logging. At 10,000 RPS with DEBUG logging on every method, logging becomes a significant portion of CPU time and I/O. Log writes can become a bottleneck. Log aggregation pipeline costs scale linearly with volume. Async log appenders (Logback's `AsyncAppender`) help, but the real fix is appropriate log level discipline: DEBUG disabled in production, TRACE never enabled in production.
>
> Third, noise: logging too much creates alert fatigue. A team that sees 500 WARNING log lines per minute in steady state starts ignoring warnings — including the real ones. The rule: INFO for meaningful business events (order created, payment processed, user logged in), WARN for expected but concerning anomalies, ERROR for failures that require investigation. If your ERROR rate in steady state is non-zero, either your error handling is wrong or the events are not actually errors.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "A user says 'my order from 2 hours ago is missing from my account'. How do you use structured logs to debug this?"

**Hruday's answer:**
> First step: get the correlation ID. If the user has the order confirmation page's network tab or a confirmation email with an order reference number, I can use that. Alternatively, I'll query the logs by `userId` and time range: `userId:usr-001 AND timestamp:[2hours ago TO now]` in Elasticsearch. The relevant records should appear.
>
> If I find the log records: I take the `traceId` from any of them and query `traceId:X`. This gives me the complete timeline of every service that touched that request. I'm looking for: did order-service log "Order created"? Did payment-service log "Payment processed"? Did the inventory service log "Stock decremented"? The first missing log tells me where the flow broke.
>
> If I find no log records at all: the request either never reached the backend (client-side failure), was rejected at the API Gateway before logging started (rate limiting, authentication failure), or the logs were lost (log pipeline issue). I'd check the API Gateway access logs (separate from application logs) which log every request before routing.
>
> If I find ERROR logs: the `stack` field gives the full Java stack trace. Combined with `orderId` in MDC, I can find the exact exception and line number.
>
> At SAP, this workflow — correlation ID to trace-based log query — reduced average P1 incident resolution time from 45 minutes (grep through multiple server log files) to under 10 minutes (Kibana query for trace ID).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We log everything at DEBUG for completeness" | "We log every method entry and exit at DEBUG level" | Logging every method call at DEBUG generates 10-100x the logs of business-event logging; in production at scale, if DEBUG is accidentally enabled, this can overwhelm your log pipeline, fill disk, and impact application performance (I/O saturation); DEBUG should be reserved for values that are genuinely useful during active debugging — not every function entry; a better pattern: log at INFO for meaningful state transitions (order created, payment processed), log at DEBUG for data that helps diagnose WHY something failed (query parameters, intermediate values); never enable DEBUG permanently in production |
| "We add the userId to every log.info() call" | "I pass userId as a parameter to all my log calls" | Passing context manually through every call is error-prone (what if someone forgets?) and clutters method signatures; MDC is the correct solution — put userId in MDC ONCE at request entry, and it automatically appears in EVERY log line for the duration of the request; the LogstashEncoder reads MDC and includes it in the JSON output without any explicit action from service methods; the filter approach: `MDC.put("userId", userId)` in your CorrelationFilter, then zero code changes needed in 50+ service methods |
| "Correlation IDs are only for microservices" | "We started using correlation IDs when we split into microservices" | Frontend applications also benefit from correlation IDs; a `sessionId` set in localStorage and sent as a header with every API call lets you correlate ALL requests from a single user session — not just within one request; when a user flows through multiple pages (product browse → cart → checkout), all those API calls share the sessionId; in ELK you can see the full session journey; this is standard RUM (Real User Monitoring) practice and essential for product analytics as well as debugging |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a recurring P1: orders occasionally disappearing after checkout — the user would see 'Order Confirmed' but the order didn't appear in their account. Investigation took 2-3 hours each time because we had to grep through 5 different service log files on 3 servers.
>
> After implementing structured logging with correlation IDs, the first recurrence was resolved in 8 minutes. I searched Kibana for the user's recent ERROR-level events, found a NullPointerException in the notification service, got the traceId, and searched for it. The full timeline showed: order-service logged 'Order created', payment-service logged 'Payment processed', notification-service threw a NPE and triggered a database rollback — and the entire transaction was rolled back because notification and order were in the same distributed transaction (an architectural bug, not a logging bug).
>
> The structured logging didn't just speed up debugging — it revealed an architectural flaw that had been invisible for months. The distributed transaction design was fixed the same sprint."

---

## 8. Scale Evolution

**1,000 users →** LogstashEncoder to console; Filebeat shipping to Elasticsearch; Kibana search by traceId; MDC with correlationId across all services; < 1GB logs/day.

**100,000 users →** Async log appenders (Logback `AsyncAppender`) to avoid blocking write on peak load; log sampling for INFO (log 50% of requests, 100% of errors and slow requests > P95); Log retention policy (7 days full logs, 90 days aggregated metrics).

**10 million users →** Distributed log pipeline (Kafka between Filebeat and Logstash); log-based alerting via Elasticsearch Watcher or Datadog; cost management via log sampling at 10% for healthy request paths; tail-sampling for traces (100% ERROR, 1% INFO); OpenTelemetry as the instrumentation standard (Topic 266).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment audit trail requires every log line to have `transactionId`, `userId`, `amount`, `currency` — structured logging ensures these are always present; PCI-DSS compliance requires that card data never appears in logs | MDC for financial context; field-level log masking; JSON log compliance for audit |
| Swiggy / Meesho | Order missing bugs (like the SAP story); Kibana dashboards for operations team; real-time error rate monitoring via log-based metrics | traceId for order lifecycle; log-based SLO monitoring; real-time error alerts |
| Adobe / Microsoft | Document processing pipeline with 10+ stages; structured logs track file processing status at each stage; Azure Monitor integration | Multi-stage processing traceId; Azure Log Analytics; compliance logging for document operations |
| SAP Labs | Order disappearing bug resolved in 8 min vs 2-3 hours; distributed transaction architectural bug exposed by trace; direct before/after productivity story | Specific time improvement story; structural bug revealed by log analysis; P1 resolution methodology |

---

## 10. Related Topics — What to Study Next

- **Topic 264 — Log Levels** — the value of structured logging depends on using the right level for each event; INFO for business events, WARN for anomalies, ERROR for failures; wrong level usage (ERROR for everything) creates alert fatigue that defeats the value of structured logging
- **Topic 265 — Centralized Logging with ELK Stack** — structured logs are the input; ELK (Elasticsearch, Logstash, Kibana) is the storage, processing, and visualization layer that makes structured logs actionable; without ELK, JSON logs sitting in files are only marginally better than text logs
- **Topic 266 — Distributed Tracing with OpenTelemetry** — correlation IDs in logs are a gateway to full distributed tracing; OpenTelemetry extends the correlation ID concept with span trees (child → parent relationships), timing data, and baggage propagation — giving a complete picture of each request across every service
- **Topic 267 — Micrometer and Prometheus** — logs tell you WHAT happened; metrics tell you HOW OFTEN and HOW FAST; combining structured logs (for debugging specific events) with Prometheus metrics (for overall system health trends) is the foundation of a complete observability strategy

---

*Part 16 · Structured Logging — JSON Logs and Correlation IDs · Full Stack Interview Guide · Hruday D · 2026*
