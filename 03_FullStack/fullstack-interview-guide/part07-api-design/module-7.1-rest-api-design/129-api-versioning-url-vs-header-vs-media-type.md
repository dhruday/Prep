# API Versioning — URL vs Header vs Media Type
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why versioning**: you will change your API — fields get added, renamed, removed; response structure changes; business logic updates. Existing clients must keep working while new clients get the improved API. Without versioning, any breaking change breaks all clients simultaneously.
- **URL versioning**: `/api/v1/orders`, `/api/v2/orders` — version in the path. The most common approach. Highly visible, easy to test in a browser, easy to route at the gateway level. Purists argue it "violates REST" (a URI should identify a resource, not a version), but it's overwhelmingly the industry standard. Used by: Stripe, PayPal, Razorpay, Twitter.
- **Header versioning**: `Accept-Version: 2` or custom header `X-API-Version: 2`. Keeps URI clean. Versions not visible in URL. Harder to test in browser (need curl/Postman). Response must include `Vary: Accept-Version` for correct caching. Used by: GitHub API.
- **Media type versioning (content negotiation)**: `Accept: application/vnd.myapi.v2+json`. The "most RESTful" approach. Uses the standard HTTP Accept header for negotiation. Very flexible. Very unintuitive. Rarely used in practice.
- **Sunset strategy**: when removing an old version, add `Sunset: Sat, 01 Jan 2026 00:00:00 GMT` and `Deprecation: true` headers to responses from the old version. Give 6-12 months minimum notice. Monitor old version traffic — never kill a version while traffic remains. Send deprecation emails to API key holders who still use the old version.
- **Key decision**: URL versioning is the right choice for almost every team. Pick it, be consistent, document the versioning policy clearly.

---

## 1. One-Line Definition
API versioning is the strategy for evolving a public or partner-facing API — adding, changing, or removing features — without breaking existing clients, and the three main strategies (URL path, request header, media type) trade off discoverability, REST purity, and operational simplicity.

---

## 2. The Problem It Solves

### What Happens Without Versioning

```
You launch an API:
  GET /api/orders/42
  Response: { "orderId": "42", "customer_name": "Hruday", "amount": 499.99 }

100 merchants integrate this API into their systems.
Their code: const name = response.customer_name;  ← directly references this field

3 months later: you normalise your data model.
New team decision: rename customer_name → customerName (camelCase standard).
You update the API:
  Response: { "orderId": "42", "customerName": "Hruday", "amount": 499.99 }

Result: 100 merchant integrations break IMMEDIATELY.
  response.customer_name → undefined → null pointer errors in billing software
  Some merchants: financial transaction failures
  Some merchants: silent null name on invoices → incorrect documents
  
  All of them: angry. Some: contractual SLA violations. Some: legal.

Without versioning, you cannot change the API. Ever.
Your API is now frozen by whatever you shipped first.
This is the most common legacy API trap in enterprise software.

WITH versioning:
  GET /api/v1/orders/42 → { "customer_name": "Hruday" }  ← old clients, unchanged forever
  GET /api/v2/orders/42 → { "customerName": "Hruday" }   ← new clients, new standard
  
  Old clients continue to work. New clients get the improved API.
  You control the sunset timeline: deprecate v1 in 12 months, monitor traffic, remove when clear.
```

---

## 3. How It Works Internally

### Three Versioning Strategies Compared

```
STRATEGY 1 — URL PATH VERSIONING:
  GET /api/v1/orders/42
  GET /api/v2/orders/42
  POST /api/v1/payments
  
  How routing works:
    API Gateway or load balancer routes by path prefix:
    /api/v1/** → v1 service controllers
    /api/v2/** → v2 service controllers
    Or: single service, version in controller annotation
  
  Pros:
  ✅ Immediately obvious — visible in every URL
  ✅ Easy to test in browser or curl without headers
  ✅ Simple to route at gateway level (path prefix match)
  ✅ Independent URLs mean v1 and v2 can be cached separately
  ✅ No client header configuration required
  ✅ Server logs clearly show version in URL — easy debugging
  
  Cons:
  ❌ "REST purist" argument: URI should identify a resource, not a version
     /orders/42 and /v2/orders/42 identify the same order — two URIs for one resource
  ❌ Clients must change their base URL when upgrading versions
  ❌ Version proliferation risk: v1, v2, v3... can become messy
  
  Industry reality: Stripe, PayPal, Razorpay, Twilio, Twitter all use URL versioning.
  The REST purity argument is overridden by practical discoverability and simplicity.
  Use URL versioning unless you have a strong reason not to.

STRATEGY 2 — REQUEST HEADER VERSIONING:
  GET /api/orders/42
  Accept-Version: 2
  
  Or using a custom header:
  GET /api/orders/42
  X-API-Version: 2
  
  Or using the standard API-Version header (GitHub's approach):
  GET /api/orders/42
  X-GitHub-Api-Version: 2022-11-28  ← GitHub uses date-based versions
  
  How routing works:
    API Gateway reads header value and routes to appropriate handler.
    Or: single controller reads header and calls appropriate service version.
    Must add: Vary: Accept-Version to response headers so caches don't serve
    v1 response to a v2 request that happened to hit the same URL.
  
  Pros:
  ✅ URI remains clean — same resource, same URI
  ✅ "Correct" by REST semantics — URI identifies resource regardless of representation version
  ✅ Easy to add version to ALL requests via SDK / HTTP client interceptor
  
  Cons:
  ❌ Not visible without inspecting headers — hard to debug in browser address bar
  ❌ Must configure header in every HTTP client (Postman, curl, SDK)
  ❌ Caching complexity — must include Vary: Accept-Version on every response
     Without it: CDN might serve v1 cached response to v2 request
  ❌ Often overlooked by new team members who forget to set the header

STRATEGY 3 — MEDIA TYPE VERSIONING (Content Negotiation):
  GET /api/orders/42
  Accept: application/vnd.mycompany.v2+json
  
  Response header:
  Content-Type: application/vnd.mycompany.v2+json
  
  Pros:
  ✅ Most standards-compliant REST approach
  ✅ Leverages HTTP's built-in content negotiation mechanism
  ✅ Clean URIs (same resource, different representations)
  
  Cons:
  ❌ Very unintuitive for API consumers — non-standard media type is confusing
  ❌ Almost impossible to test in browser URL bar
  ❌ SDK/client setup is complex — must configure Accept header correctly
  ❌ Routing logic is complex — dispatcher must parse media type
  ❌ Very few teams actually use this outside academic discussions
  
  Reality: this is the "textbook correct" answer in interviews.
  Say you know it, explain the trade-offs, then say URL versioning is the practical choice.
```

### Versioning Granularity — API-Level vs Date-Based vs Feature-Level

```
APPROACH 1 — Whole API version (most common):
  /v1, /v2, /v3
  Bump when: any breaking change to ANY endpoint
  Risk: v2 is released, client must upgrade everything to get one new feature
  
APPROACH 2 — Date-based (GitHub's approach):
  X-GitHub-Api-Version: 2022-11-28
  Version = the date features were stabilised
  
  Benefit: granular — "features available as of this date"
  Risk: many versions to maintain, rollback logic complex
  
APPROACH 3 — Endpoint-level (rare, pragmatic for large APIs):
  /api/v1/orders  (not yet changed)
  /api/v2/products  (changed product schema)
  /api/v1/users  (not yet changed)
  
  Only bump version on endpoints that actually changed.
  Practical for very large APIs where changing the whole API major version is disruptive.
  Inconsistent — clients are confused by mixed v1/v2 across endpoints.
```

---

## 4. The Code

### ❌ Wrong Way — No Versioning, Forced Breaking Changes

```java
// ❌ No versioning — changing this response breaks ALL clients
@GetMapping("/api/orders/{orderId}")  // No /v1/ in path
public OrderResponse getOrder(@PathVariable String orderId) {
    Order order = orderService.findById(orderId);
    return new OrderResponse(
        order.getId(),
        order.getCustomer().getName(),  // customer_name in JSON
        order.getAmount()
    );
    // ❌ Any structural change to OrderResponse breaks all existing integrations.
    // After first external client integrates: this API is frozen.
}
```

---

### ✅ Right Way — URL Path Versioning in Spring Boot

```java
// ✅ CORRECT: Separate controllers (or mappings) per version
// V1 Controller — old clients continue to use this
@RestController
@RequestMapping("/api/v1/orders")
public class OrderControllerV1 {

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponseV1> getOrder(@PathVariable String orderId) {
        Order order = orderService.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        // V1 response shape — never changes after release
        return ResponseEntity.ok(OrderResponseV1.builder()
            .order_id(order.getId())
            .customer_name(order.getCustomer().getName())  // snake_case from old contract
            .amount(order.getAmount())
            .build());
    }
}

// V2 Controller — new clients, improved schema
@RestController
@RequestMapping("/api/v2/orders")
public class OrderControllerV2 {

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponseV2> getOrder(@PathVariable String orderId) {
        Order order = orderService.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        // V2 response: camelCase, new fields, deprecated fields removed or renamed
        return ResponseEntity.ok(OrderResponseV2.builder()
            .orderId(order.getId())
            .customerName(order.getCustomer().getName())   // camelCase in V2
            .amount(order.getAmount())
            .currency(order.getCurrency())                 // New field in V2
            .createdAt(order.getCreatedAt())               // New field in V2
            .build());
    }
}
```

### ✅ Header Versioning in Spring Boot

```java
// ✅ CORRECT: Header-based versioning using @RequestMapping headers condition
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    // Handles requests with Accept-Version: 1 (or no header — default to v1)
    @GetMapping(value = "/{orderId}", headers = "!Accept-Version")  // no header → v1
    @GetMapping(value = "/{orderId}", headers = "Accept-Version=1")
    public ResponseEntity<OrderResponseV1> getOrderV1(
            @PathVariable String orderId) {
        Order order = orderService.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        return ResponseEntity.ok()
            .header("Vary", "Accept-Version")      // ✅ Critical for correct caching
            .header("API-Version", "1")
            .body(OrderResponseV1.from(order));
    }

    // Handles requests with Accept-Version: 2
    @GetMapping(value = "/{orderId}", headers = "Accept-Version=2")
    public ResponseEntity<OrderResponseV2> getOrderV2(
            @PathVariable String orderId) {
        Order order = orderService.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        return ResponseEntity.ok()
            .header("Vary", "Accept-Version")      // ✅ Vary tells caches this response varies by header
            .header("API-Version", "2")
            .body(OrderResponseV2.from(order));
    }
}
```

### ✅ Deprecation and Sunset Headers

```java
// ✅ Add deprecation warnings to V1 responses to encourage migration
@RestController
@RequestMapping("/api/v1")
public class OrderControllerV1 {

    private static final String SUNSET_DATE = "Sat, 01 Jan 2026 00:00:00 GMT";
    private static final String SUNSET_LINK = "https://docs.myapi.com/migration/v1-to-v2";

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderResponseV1> getOrder(@PathVariable String orderId) {
        Order order = orderService.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        return ResponseEntity.ok()
            .header("Deprecation", "true")          // ✅ RFC 8594: signals this API is deprecated
            .header("Sunset", SUNSET_DATE)          // ✅ When this version will stop working
            .header("Link", "<" + SUNSET_LINK + ">; rel=\"deprecation\"")  // ✅ Migration docs link
            .body(OrderResponseV1.from(order));
    }
}
```

### Spring Cloud Gateway — Route by API Version Prefix

```yaml
# application.yml — Spring Cloud Gateway routing by version prefix
spring:
  cloud:
    gateway:
      routes:
        # ✅ V1 routes to the v1 service (or to the same service with different path rewrite)
        - id: orders-v1
          uri: lb://order-service
          predicates:
            - Path=/api/v1/orders/**
          filters:
            - RewritePath=/api/v1/orders/(?<segment>.*), /internal/orders/${segment}
            - AddRequestHeader=X-API-Version, 1

        # ✅ V2 routes to the same or different service
        - id: orders-v2
          uri: lb://order-service
          predicates:
            - Path=/api/v2/orders/**
          filters:
            - RewritePath=/api/v2/orders/(?<segment>.*), /internal/orders/${segment}
            - AddRequestHeader=X-API-Version, 2
```

---

## 5. Interview Questions & Model Answers

### Q1 — Strategy Comparison
**Interviewer asks:** "What are the three main API versioning strategies, and which would you choose for a public API?"

**Hruday's answer:**
> Three main approaches: URL path versioning, request header versioning, and media type versioning.
>
> URL versioning puts the version in the path: `/api/v1/orders`, `/api/v2/orders`. Immediately visible in every log entry and curl command. Easy to route at the gateway. Clients update their base URL when migrating. This is what Stripe, PayPal, and Razorpay use.
>
> Header versioning uses a custom header like `Accept-Version: 2`. Keeps the URI clean — same resource, same URI. Requires `Vary: Accept-Version` on every response for correct cache behaviour. Less discoverable — you can't test it by just typing a URL.
>
> Media type versioning uses the Accept header: `Accept: application/vnd.myapi.v2+json`. The most standards-compliant approach. In practice, it's too unintuitive for most API consumers and very few teams actually use it.
>
> For a public API, I'd choose URL versioning. Discoverability and debuggability win. When something breaks in production at 3am, I want the version immediately visible in logs and URLs — not hidden in a request header I have to remember to include. URL versioning is the industry convention for public APIs, and there's real value in aligning with what developers already know. The REST purity argument is less important than developer experience for a public-facing API.

---

### Q2 — Breaking vs Non-Breaking Changes
**Interviewer asks:** "What changes to an API require a new version, and what changes can be made without breaking clients?"

**Hruday's answer:**
> Non-breaking (additive) changes: safe to do on existing version:
> - Adding a new optional field to a response object: clients that don't know about it just ignore it.
> - Adding a new optional query parameter.
> - Adding a new endpoint (`POST /api/v1/orders/{id}/refunds`).
> - Changing the documentation or adding more descriptive error messages.
> - Relaxing validation rules (accepting more inputs).
>
> Breaking changes: require a new version:
> - Removing or renaming a field in a response or request.
> - Changing a field's type (string → number, or flattening a nested object).
> - Making a previously optional field required.
> - Changing HTTP method semantics (changing POST to PUT on an endpoint).
> - Changing status code meanings (previously 200, now 201).
> - Changing pagination format (offset to cursor).
> - Adding stricter validation rules (now rejecting inputs that previously worked).
>
> Grey area: changing a field's values (adding new enum values). Clients that switch on enum values and use a default/else case: fine. Clients that check for exhaustive values and reject unknowns: breaking. The safe practice: document that clients MUST handle unknown enum values gracefully. Stripe uses this approach for status fields.

---

### Q3 — Sunset Strategy
**Interviewer asks:** "You need to retire API v1. What's your process?"

**Hruday's answer:**
> Step one: measure first. How many active API key holders are still using v1? Build a dashboard showing v1 vs v2 traffic over time, broken down by API key. Never announce a sunset without knowing your current exposure.
>
> Step two: announce with adequate notice. 6 months minimum for external developers, 12 months for enterprise clients with procurement cycles. Send deprecation emails to every API key holder still calling v1, with a direct link to the migration guide. Add `Deprecation: true` and `Sunset: [date]` headers to all v1 responses immediately — developer tools can detect these automatically.
>
> Step three: provide a migration guide. Publish a clear diff: every changed field, every new field, every removed field. Offer a migration endpoint that accepts v1 request format and returns v2 response format as a transitional step.
>
> Step four: monitor traffic weekly. Plot v1 traffic as a percentage of total. When it's below 0.1% and the remaining traffic is internal test tools: reach out personally to the remaining active API keys.
>
> Step five: sunset in stages. First return 503 with a grace message for a few days — clients fail gracefully and owners investigate. Then fully remove. Keep the `/v1` path routing to a help page for 3 more months: don't return a cold TCP reset — return something informative.
>
> The worst failure mode: sunsetting a version while production traffic still exists from a client who missed all the communications. The `Sunset` header in responses creates a programmatic signal developers can monitor automatically.

---

### Q4 — Scenario
**Interviewer asks:** "You're designing Razorpay's payment API that will be used by thousands of merchants. What versioning strategy do you choose, and how do you handle a required breaking change to the payment initiation request schema?"

**Hruday's answer:**
> URL versioning, aligned with Stripe's model which Razorpay and many fintech APIs follow. Merchants already know the URL versioning pattern. Support tooling, Postman collections, and example code all work with URL versioning naturally.
>
> For the breaking change — say we need to rename `customer_id` to `customerId` and add a required `currency` field to the payment initiation request:
>
> First: release v2 endpoint with the new schema. Document the changes clearly. Email all active API key holders. The migration guide shows exactly what changed with before/after examples.
>
> Second: run v1 and v2 in parallel. The v1 endpoint keeps working exactly as before. v2 has the improved schema. New merchant integrations use v2. Existing merchants migrate on their own timeline.
>
> Third: make v1 backward-compatible internally. Under the hood, v1 controller maps `customer_id` → `customerId` before passing to the service layer. Only one service implementation — the controllers just transform between API versions and the internal model. This keeps the business logic DRY.
>
> Fourth: 12 months after v2 launch, begin the sunset process. Monitor traffic, communicate, add headers.
>
> One thing I'd add for a payment API specifically: the idempotency key scheme should be versioned-independent. A merchant using an idempotency key in v1 and then retrying via v2 must not create a duplicate payment. The idempotency store is version-agnostic — it's keyed on the merchant-provided key, not on which API version was used.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Just use v1 forever and add backwards-compatible changes" | "I'll avoid breaking changes so I never need a new version" | "Every API that lives long enough eventually needs a breaking change. Data models evolve, business logic changes, security requirements emerge that require request structure changes. Saying 'I'll never add a new version' commits you to a frozen API that can't evolve. The better policy: embrace versioning from day one. Start at v1. Design a clear policy for what constitutes a breaking change (rename, remove, type change). When a breaking change is necessary — and it will be — you have a well-understood mechanism to handle it. The cost of versioning from the start is tiny. The cost of retrofitting versioning onto an unversioned API with active clients is enormous." |
| "Header versioning is better because URLs should be stable" | "URL versioning is bad REST — the URL should identify the resource, not the version" | "The REST purity argument has merit in theory, but in practice it's outweighed by discoverability and operational simplicity. When a v1 request fails at 3am, URL versioning means the version is in every log line, every error message, every curl command I run to reproduce. With header versioning, I have to remember to add `Accept-Version: 1` to every curl command. I can't test v2 by just typing a URL in a browser. The entire industry — Stripe, PayPal, Razorpay, Twitter, GitHub (secondary) — chose URL versioning or date-based header versioning. For an internal service where all clients are controlled: header versioning is fine. For a public API consumed by developers outside your organization: URL versioning wins on developer experience." |
| "Never deprecate — just keep all versions running forever" | "I'll keep v1 and v2 running to avoid breaking anyone" | "Keeping old versions running forever has real costs. Every regression test suite must test all active versions. Security patches must be applied to all active versions. Code changes that touch shared service layers must be verified against all versions. Infrastructure runs N times the complexity. Old versions are technical debt that lives forever if you don't sunset them. The correct approach: clear sunset policy, communicated upfront, enforced. If your API agreement says 'versions are supported for 24 months from release,' you have a contract both you and your clients can plan around. Sunset headers in responses create a programmatic signal. Running a version for 2 years then sunset is sustainable. Running them forever is not." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, the Oracle ERP REST APIs I worked on were versioned — `/v1`, `/v2` — because they were consumed by third-party Oracle partner integrations that couldn't all update at once. I saw firsthand the discipline required: when we added new endpoints for a form redesign, we added them to v2 and left v1 untouched. Two customers on long-term contracts couldn't update their integrations quickly, so v1 had to keep working for 18 months. At SAP Labs, the same versioning discipline applied to the SAP Fiori API layer — support for multiple document versions across different customer ERP deployments. Versioning isn't a nice theoretical concern — it's the mechanism that lets you say 'yes' to evolving a live product without betraying existing customers."

---

## 8. Scale Evolution

**1,000 users (internal or small partner base) →** URL versioning at the controller level. One version active (`v1`). Document the versioning policy even before you need v2 — the policy matters before the need arises.

**100,000 users (public API with partner integrations) →** v1 and v2 active. API Gateway routes by path prefix. `Deprecation` + `Sunset` headers on v1. Traffic monitoring per version per API key. Migration guide published. Monthly email to v1-still-active API key holders.

**10 million users (large public API platform) →** API versioning managed as a product. Version lifecycle tracked in a registry: release date, deprecation date, sunset date. SDK auto-version-detection: SDKs check `API-Version` response header and log a warning if the version is deprecated. Internal analytics dashboard: v1 traffic % over time per merchant tier. Dedicated migration support for enterprise clients on old versions. Zero-downtime version sunset: v1 returns `Sunset` headers for 30 days, then 503 for 14 days, then removed.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Public payment APIs consumed by thousands of merchants — any breaking change without versioning would disrupt live payment flows. API versioning is a core trust mechanism with merchant partners. | "A merchant has integrated your payment API and you need to add a required currency field to the payment request. How do you handle this without breaking their integration?" |
| Swiggy / Meesho | Mobile apps can't be force-updated — old app versions still call old API versions. Multiple app versions in the wild simultaneously require at least 2 API versions active at all times. | "Your Swiggy app has 10M active users across 5 app versions. You're changing the order creation API response schema. Describe your versioning strategy." |
| Adobe / Microsoft | Enterprise SDKs distributed to thousands of enterprise clients. SDK versions outlive API versions by years — versioning strategy must support 5-year-old SDK versions for enterprise compliance. | "Adobe Creative SDK version 3.0 from 2020 calls your APIs. You need to make breaking changes to support a new creative format. How do you version without breaking SDK 3.0 users?" |
| SAP Labs (current) | ERP system integrations at enterprise customers often run unchanged for years. SAP APIs must support multiple ERP release versions simultaneously. Versioning is part of the customer SLA. | "An enterprise SAP customer signed a 5-year contract on your ERP integration API v1. How do you evolve the API without violating their SLA?" |

---

## 10. Related Topics — What to Study Next

- **Topic 125 — REST Principles** — the Uniform Interface constraint and how versioning trades off against it; URL versioning technically introduces multiple URIs for the same resource, which is the formal argument against it — understanding the constraint clarifies the trade-off
- **Topic 127 — HTTP Status Codes** — versioned APIs benefit from `410 Gone` when a version is fully removed (better than 404), and `503 Service Unavailable` during the transitional sunset period when the version is being removed
- **Topic 136 — API Gateway** — gateway-level routing by path prefix is the production mechanism for URL versioning; understanding how API gateways route `/v1/**` to one backend and `/v2/**` to another (or to version-aware handlers) is essential for deploying versioned APIs
- **Topic 81 — Spring Cloud Gateway** — the Spring Cloud Gateway configuration for version-based routing, including path rewriting (stripping `/v1/` prefix before forwarding to the internal service), which is a common production pattern

---

*Part 7 · API Versioning — URL vs Header vs Media Type · Full Stack Interview Guide · Hruday D · 2026*
