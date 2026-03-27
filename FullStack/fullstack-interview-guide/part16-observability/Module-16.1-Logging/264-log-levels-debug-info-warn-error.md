# Log Levels — When to Use DEBUG, INFO, WARN, ERROR
> Part 16 — Observability & Monitoring
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card

- **TRACE**: finest grain — entering/exiting method-level detail; almost never enabled in production; use only during active local debugging of complex algorithms
- **DEBUG**: variable values, query parameters, intermediate results during computation; disabled in production except during active incidents with short timeboxes; lazy evaluation matters: `log.debug("Expensive computation: {}", () -> computeExpensive())` avoids cost when DEBUG disabled
- **INFO**: meaningful business state transitions — user logged in, order created, payment processed, batch job started/completed; should read like a business audit log; steady INFO rate in production is normal
- **WARN**: something unexpected happened that the system recovered from, but should be investigated; examples: retry succeeded after first attempt (a retry is a signal of instability), cache miss for data that should be cached, degraded mode activated, external API returned a 4xx that was unexpected but handled
- **ERROR**: a request or operation FAILED and human investigation is required; should trigger an alert; at steady state, ERROR rate should be near-zero for a healthy system; if ERROR logs are constant and ignored, they are noise — same as no logging
- **FATAL**: not used in most Spring Boot apps (it's a Logback concept; most usage is ERROR); means the application cannot continue; process will exit; use sparingly, mainly for startup failure on required dependencies
- **Golden rule**: if you would NOT act on seeing it in a log file during a normal working day, it should not be ERROR; if you would ALWAYS act on it, it should be ERROR or an alert

---

## 1. One-Line Definition
Log levels are a severity hierarchy that lets teams filter, alert, and prioritize log events; choosing the right level for each event ensures that ERROR means "investigate now" and that steady-state logs contain only meaningful information.

---

## 2. The Problem It Solves

When every event is logged at `INFO` (or worse, `ERROR`), the signal-to-noise ratio collapses:
- An ERROR alert page goes to the on-call engineer at 2 AM for a `NullPointerException` that happens because a user sent a malformed request — handled, no impact, entirely expected
- Kibana's `level:ERROR` query returns 50,000 lines/day, mixed between "user not found" (handled, user just mistyped their email) and "database connection pool exhausted" (critical, service is degrading)
- The team removes the alert because it fires constantly; the next real critical error goes undetected for 40 minutes

Correct level discipline means:
- ERROR fires an alert → engineer looks → it's always actionable → alert trust maintained
- INFO is the business event stream → product team can read it as an audit log
- DEBUG and TRACE never appear in production except when deliberately enabled for a specific investigation

---

## 3. How It Works Internally

### Severity Hierarchy

```
TRACE (5) < DEBUG (4) < INFO (3) < WARN (2) < ERROR (1) < OFF (0)
```

The root logger level is a threshold: setting level INFO means INFO, WARN, and ERROR events pass through; DEBUG and TRACE are filtered out. Per-package overrides allow: `org.hibernate.SQL=DEBUG` (SQL logging) while `root=INFO`.

### Lazy Evaluation Pattern

SLF4J parameterized logging (`log.debug("val {}", x)`) avoids `String.valueOf(x)` when DEBUG is disabled — the string is never constructed. For truly expensive calculations, use the Supplier form: `log.debug("{}",() -> expensiveComputation())`.

---

## 4. The Code

### Wrong Way — Level Abuse

```java
// ❌ WRONG 1: Logging everything at ERROR — destroys alert trust

@Service
@Slf4j
public class ProductService {
    
    public Optional<Product> findProduct(Long productId) {
        Optional<Product> product = productRepository.findById(productId);
        
        if (product.isEmpty()) {
            // ❌ This is NOT an error — user looked up a product that doesn't exist
            // This is an expected business condition at INFO or DEBUG
            // If this fires 1000 times/hour, ERROR alerts become useless
            log.error("Product not found: {}", productId);
        }
        
        return product;
    }
    
    public void processOrder(Order order) {
        try {
            // business logic
        } catch (ValidationException e) {
            // ❌ Validation error is user-facing, expected, handled — WARN at most
            // Validation exceptions are business logic, not system failures
            log.error("Validation failed", e);
        } catch (DatabaseException e) {
            // ❌ ← This IS an error, but lumping it with validation errors
            // makes it impossible to filter for real system failures
            log.error("Database error", e);
        }
    }
}
```

```java
// ❌ WRONG 2: Too much DEBUG in tight loops — performance problem

@Repository
@Slf4j
public class ProductRepository {
    
    public List<Product> findByCategoryAndPriceRange(String category, double min, double max) {
        // ❌ If this method is called 10,000 times/second at peak,
        // this log line runs 10,000 times/second even if DEBUG is off
        // SLF4J parameterized form still has overhead: building the LoggingEvent object
        // For very hot paths, use isDebugEnabled() guard or don't log in loops
        log.debug("Searching products — category: {}, minPrice: {}, maxPrice: {}", category, min, max);
        
        // The result loop is even worse:
        List<Product> results = jdbcTemplate.query(SQL, params);
        for (Product p : results) {
            // ❌ Logging inside a loop on hot path — O(n) log calls per query
            log.debug("Found product: {}", p);
        }
        return results;
    }
}
```

```java
// ❌ WRONG 3: Logging AND re-throwing — duplicate stack traces

@Service
@Slf4j
public class PaymentService {
    
    public void processPayment(PaymentRequest request) {
        try {
            externalGateway.charge(request);
        } catch (GatewayException e) {
            // ❌ Anti-pattern: log-and-rethrow
            // This logs the stack trace HERE
            // Then the caller also catches and logs the same exception
            // Result: same stack trace appears 3-4 times in logs, confusing triage
            log.error("Gateway charge failed", e);
            throw new PaymentFailedException("Payment failed", e);
        }
    }
}
```

### Right Way — Level Discipline

```java
// ✅ RIGHT — Correct level for each event type

@Service
@Slf4j
public class OrderService {
    
    public OrderResponse createOrder(OrderRequest request) {
        
        // ✅ DEBUG: input parameters — useful during debugging, silent in production
        log.debug("createOrder called with userId={}, items={}", 
                   request.getUserId(), request.getItems().size());
        
        // ✅ INFO: business event start — meaningful state transition
        // In production, INFO logs should read like a business event log
        log.info("Order creation started");   // MDC has traceId, userId automatically
        
        // Validate
        validator.validate(request);          // throws ValidationException if invalid
        
        // Reserve stock
        boolean stockReserved = inventoryClient.reserve(request.getItems());
        if (!stockReserved) {
            // ✅ WARN: business condition, system handled it, but worth monitoring
            // If this WARN rate spikes, it signals inventory shortage — a business alert
            // NOT an ERROR — the system responded correctly (rejected the order)
            log.warn("Stock reservation failed — insufficient inventory for {} items", 
                      request.getItems().size());
            throw new InsufficientStockException();
        }
        
        Order order = orderRepository.save(new Order(request));
        
        // ✅ INFO: major business milestone achieved
        log.info("Order created — orderId={}", order.getId());
        
        return OrderResponse.from(order);
    }
    
    public void retryFailedOrders() {
        List<Order> failedOrders = orderRepository.findByStatus(FAILED);
        
        for (Order order : failedOrders) {
            try {
                reprocessOrder(order);
                // ✅ INFO: each successful retry is a business success event
                log.info("Order retry succeeded — orderId={}", order.getId());
                
            } catch (Exception e) {
                // ✅ ERROR for actual failures that need attention
                // Failed retry means the order is stuck — this needs investigation
                // The exception is passed as the SECOND argument — this prints the stack trace
                log.error("Order retry failed — orderId={}, will try again next cycle", 
                           order.getId(), e);
                // Do NOT re-throw here; we're processing a batch — one failure shouldn't stop others
            }
        }
    }
}
```

```java
// ✅ RIGHT — Layer-based level strategy

@Component
@Slf4j
public class ExternalPaymentGateway {
    
    public PaymentResult charge(PaymentRequest request) {
        
        // ✅ DEBUG for HTTP-level details (URL, HTTP method, response code)
        // Only needed during debugging; silent in production
        log.debug("Charging via gateway — endpoint: {}, amount: {}", 
                   endpointUrl, request.getAmount());
        
        try {
            HttpResponse response = httpClient.post(endpointUrl, request);
            
            if (response.statusCode() == 200) {
                // ✅ INFO: payment captured — key business event
                log.info("Payment captured — txnId={}, amount={}", 
                          response.body().transactionId(), request.getAmount());
                return PaymentResult.success(response.body());
                
            } else if (response.statusCode() == 402) {
                // ✅ WARN: card declined — expected, handled, user-facing, not system failure
                log.warn("Payment declined — reason={}", response.body().declineReason());
                return PaymentResult.declined(response.body().declineReason());
                
            } else {
                // ✅ ERROR: unexpected response code — system failure, needs investigation
                log.error("Payment gateway returned unexpected status={}", response.statusCode());
                throw new GatewayException("Unexpected status: " + response.statusCode());
            }
            
        } catch (IOException e) {
            // ✅ ERROR: network failure — infrastructure issue that needs ops attention
            // Passing the exception AFTER the message string logs the full stack trace
            log.error("Payment gateway network error", e);
            throw new GatewayException("Network failure", e);
        }
        // ✅ NO log-and-rethrow anti-pattern here
        // The caller (OrderService) handles the exception without additional logging
        // Stack trace appears exactly ONCE in the logs
    }
}
```

```java
// ✅ RIGHT — Log level configuration in logback-spring.xml
// Different levels per package and per environment

// In logback-spring.xml (production):
// <root level="INFO" />                              ← baseline: INFO for everything
// <logger name="com.sap.shop.gateway" level="WARN"/> ← suppress INFO from chatty HTTP client
// <logger name="org.hibernate.SQL" level="WARN" />   ← suppress SQL in production
// <logger name="org.springframework.web" level="WARN"/>
// <logger name="com.sap.shop.service" level="INFO" />← our code at INFO

// In application.yml (can override declarative config at startup):
// logging:
//   level:
//     root: INFO
//     com.sap.shop: INFO
//     org.springframework.web.servlet.DispatcherServlet: WARN
//     org.hibernate.SQL: WARN
//   # ↑ This keeps production logs clean

// ✅ Actuator endpoint enables temporary DEBUG for a running service:
// POST /actuator/loggers/com.sap.shop.service { "configuredLevel": "DEBUG" }
// Re-enable after investigation:
// POST /actuator/loggers/com.sap.shop.service { "configuredLevel": "INFO" }
// This changes level at runtime without a restart — safe for production investigation
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What log level would you use for a 'user not found' scenario?"

**Hruday's answer:**
> It depends on the context. If the application is looking up a user by ID from a stored record and the user should always exist — for example, looking up the owner of an order — then failing to find them is unexpected and WARN is appropriate.
>
> If the user is looking themselves up during login and "user not found" means they typed their email wrong (a completely normal user action), then I would use DEBUG — it's not even worth INFO because it's expected noise from user input errors. I do NOT want my Kibana alerts flooded with "user not found" events every time someone mistyped an email on the login page.
>
> The test: "Would I act on seeing this in the logs?" User not found during login — I would not act; it's expected. User not found when referencing an order — I would investigate; something is inconsistent. That distinction drives the level choice.

---

### Q2 — Scenario
**Interviewer asks:** "Your on-call team is getting paged for ERROR alerts but stops responding because there are too many false positives. What do you do?"

**Hruday's answer:**
> This is the classic "alert fatigue" problem, and the root cause is usually that ERROR is used for everything instead of for actionable failures.
>
> My approach: First, audit the top 10 most frequent ERROR log patterns over the last 7 days. In my experience, 80% of ERROR volume falls into 2-3 patterns that are either (a) user input errors that the system handled correctly, (b) expected business conditions like "not found" or "rate limited", or (c) third-party API errors that are retried and succeed.
>
> Reclassify: (a) should be INFO or DEBUG, (b) should be WARN, (c) depends on recovery — if retry succeeded, WARN; if retry exhausted and request failed, ERROR.
>
> Then set an SLO for ERROR rate: "In steady state, ERROR rate should be less than 0.1% of all log volume", for example. Track it as a metric. When the reclassification is done, ERROR rate should drop to near zero in steady state. The alert threshold can now be meaningful: "ERROR rate > 5/minute" fires an incident.
>
> At SAP, we ran this audit and found that 70% of our ERROR events were `EntityNotFoundException` from users navigating to deleted products — a handled 404 response, not a system failure. Moving those to INFO dropped ERROR volume by 70% within one sprint. Alert trust was restored within a week.

---

### Q3 — Trade-Off
**Interviewer asks:** "Should you log exceptions at WARN or ERROR? Does it matter?"

**Hruday's answer:**
> The level should match the OUTCOME, not the fact that an exception occurred. Exceptions are a Java mechanism — they can represent both expected and unexpected conditions.
>
> `ValidationException` thrown because a user submitted an invalid form: INFO or WARN, because this is expected and handled. The system behaved correctly.
>
> `DatabaseException` thrown because the connection pool is exhausted: ERROR, because the system cannot serve requests and this needs immediate investigation.
>
> `IOException` from a payment gateway that was retried and succeeded: WARN, with a note that the retry succeeded. The eventual outcome was success, but the instability should be monitored.
>
> `IOException` from a payment gateway after all retries exhausted, request failed: ERROR, because the user's payment didn't go through and the system was unable to recover.
>
> The practical test I apply: if this log line fires the on-call alert at 3 AM, would the engineer be justified in escalating? WARNING level should never fire an alert. ERROR should always justify waking someone up. If either of those is wrong, the level is wrong.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We set everything to DEBUG in production so we don't miss information" | "DEBUG gives us more visibility" | Enabling DEBUG in production at any scale beyond a few hundred RPS has real costs: 10-50x log volume, additional I/O, log storage costs, and Logback's DEBUG logging is not free even with async appenders; more importantly, DEBUG in production log streams drowns out the signal from INFO and ERROR events — the opposite of increased visibility; the correct approach: INFO in production, with an actuator endpoint to flip a specific package to DEBUG for a targeted investigation window, then flip back |
| "We log every exception at ERROR level" | "Exceptions should be ERRORs always" | The Java exception mechanism is used for many conditions that are not errors: `EntityNotFoundException` (user navigated to a deleted resource), `ValidationException` (user submitted bad input), `AccessDeniedException` (user tried to access something they can't — enforce 403, don't error); logging these as ERROR creates permanent noise that trains the team to ignore ERROR logs; an ERROR log should mean "a system failure occurred that requires human investigation" — if the system handled it gracefully and the user got a sensible response, it's not an ERROR |
| "Log levels are just for developers" | "We use log levels internally for debugging our services" | Log levels are a critical operational contract with the SRE/ops team; the WARN and ERROR streams are the primary input to alerting systems; the INFO stream is often used for audit logs and compliance; if the development team doesn't treat level selection as a cross-functional concern, the ops team will either turn off alerting (because alerts are noise) or manually suppress all log-based alerts; level selection discipline should be a code review checklist item, same as SQL query performance or security review |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, during a Post-Launch review for a major product feature, the SRE team showed a graph: our service had been emitting 40,000 ERROR log lines per day since the launch, and zero alerts had been fired in response. Reason: the alert threshold was set to 'ERROR > 500/minute' — which was hit constantly in the first week and the team had silenced the alert to avoid being paged. The alert was never re-enabled.
>
> We found that 90% of those 40,000 daily ERRORs were `NotFoundException` from a cache invalidation edge case — the system returned a graceful 404 to the user, but the code logged it as ERROR. The remaining 10% were real errors — database timeouts — that had been completely invisible for weeks.
>
> The fix: reclassify `NotFoundException` in that cache path to WARN, code review checklist for log level selection, and re-enable the alert with the correct threshold. Within 3 days, the ERROR rate dropped to near-zero in steady state, the alert was re-enabled, and two real database issues were caught and fixed before they impacted users."

---

## 8. Scale Evolution

**1,000 users →** All levels active in development. Production: INFO at root, WARN for verbose Spring framework packages. Error volume manageable with simple console + file logging, no sampling needed.

**100,000 users →** ERROR rate monitoring via Prometheus log-based metrics (micrometer log counter). Alert on `ERROR count > 20/min`. WARN rate as a secondary indicator. Log level per-package tuning to suppress framework noise. Async log appender to avoid blocking request threads on disk I/O.

**10 million users →** Tail-based sampling; log 100% of ERROR, 10% of WARN, 1% of INFO for healthy requests (but 100% for slow/failed requests). Dynamic log level adjustment via Spring Boot Actuator without restart. Cost-based log tiering: ERROR and WARN in hot storage (Elasticsearch), INFO after 7 days moved to cold storage (S3 + Athena), DEBUG never persisted.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment events must be logged at INFO for audit; gateway errors at ERROR trigger ops alerts; `PaymentDeclined` (user-side) at WARN so it's visible but not alerting; PCI audit requires every transaction to be in the INFO log | Level strategy for fintech; audit log design; alert discipline |
| Swiggy / Meesho | "Delivery partner not found" is WARN, not ERROR — expected condition; "Order database write failed" is ERROR; high request volume means level discipline directly impacts log storage costs | Level discipline at scale; cost management; operations reliability |
| Adobe / Microsoft | Document processing status events at INFO; quota exceeded (expected, user manages it) at WARN; processing engine crash at ERROR with full stack trace; compliance needs INFO stream as audit log | Log as audit trail; multi-tier level usage; enterprise compliance |
| SAP Labs | 40,000 ERROR/day → real errors invisible for weeks; audit retrofit to reclassify NotFoundException; alert restored with meaningful threshold; directly linked to missed database timeout bugs | Specific story of level discipline failure and recovery; audit methodology; cross-team impact |

---

## 10. Related Topics — What to Study Next

- **Topic 263 — Structured Logging** — log levels only deliver value if logs are structured; DEBUG logs with JSON fields (containing request ID, user ID, etc.) enable pinpoint filtering in Kibana when you need them; plain text DEBUG dumps mixed into the log stream are hard to search
- **Topic 265 — Centralized Logging with ELK** — the practical application of level discipline; in Kibana, a `level:ERROR` filter on a well-disciplined service returns only actionable events; on a service that logs everything at ERROR, that filter is useless
- **Topic 270 — Alert Strategy** — alert strategy is the consumer of log level discipline; WARN-based alerts for trend detection, ERROR-based alerts for immediate response; topic 270 covers how to configure alerts that don't cause fatigue
- **Topic 271 — Incident Management and Postmortems** — in a postmortem, the first question is often "what did the logs show?"; log level discipline (ERRORs are real errors) determines whether the postmortem can reconstruct the incident timeline accurately

---

*Part 16 · Log Levels — When to Use DEBUG, INFO, WARN, ERROR · Full Stack Interview Guide · Hruday D · 2026*
