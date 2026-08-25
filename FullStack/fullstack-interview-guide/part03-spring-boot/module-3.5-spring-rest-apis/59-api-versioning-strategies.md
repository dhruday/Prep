# API Versioning Strategies
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- API versioning = making breaking changes without breaking existing clients — version 1 clients keep working while version 2 clients get the new behaviour
- Four strategies: **URL path** (`/v1/orders`), **query parameter** (`?version=1`), **custom header** (`X-API-Version: 1`), **Accept header** (`application/vnd.api.v1+json`)
- URL path versioning is the industry default — it is visible in logs, easy to route, and requires zero client configuration beyond the URL
- A "breaking change" is any change that causes existing clients to fail: renaming/removing fields, changing field types, changing HTTP method, changing required params
- Non-breaking changes are safe to add without a new version: adding new optional fields, adding new endpoints, adding new query params with defaults
- Start with `/v1/` from day one — retroactively adding versioning to a live API is painful and requires migrating all existing clients

---

## 1. One-Line Definition
API versioning is the practice of maintaining multiple stable versions of an API simultaneously so existing clients continue to work unchanged while new clients adopt updated behaviour.

---

## 2. The Problem It Solves

You built a mobile banking app. The API has `GET /api/orders` which returns `{"orderId": 42, "amount": 1000}`. Six months later, you realise the field should be `id` not `orderId`, and `amount` should be a string with currency symbol. You make the change. Every mobile app currently installed on users' phones crashes — the frontend code parses `order.orderId` which is now `undefined`. Users cannot use the app until they update. App store reviews fill with 1-star ratings.

This is the breaking change problem. Without versioning, you have one choice: never change how a published API works. With versioning, you publish `/api/v2/orders` with the new format. Existing mobile apps continue to call `/api/v1/orders` — unchanged. New app installs get the v2 format. You run both versions in parallel, monitor traffic to v1, announce deprecation, and sunset v1 after 6+ months when traffic drops to near zero.

At Oracle, our Angular frontend consumed APIs that were shared with enterprise partners. When we needed to restructure the response format for a reporting endpoint, we could not change the endpoint in-place — partners had built integrations against it. We versioned the new endpoint at `/v2/reports/` and gradually migrated clients over 3 months. Zero partner impact during the transition.

---

## 3. How It Works Internally

### The Mental Model
API versioning is like a train station with multiple platforms. Platform 1 runs the old trains (v1 clients), Platform 2 runs the new trains. New passengers buy tickets for Platform 2. Old ticket holders keep using Platform 1. Eventually, when everyone has migrated, Platform 1 is closed — but nobody's journey is disrupted mid-trip.

The "station master" (your API gateway or controller routing) decides which platform each request goes to based on the version indicator the client provides. Both platforms can run simultaneously from the same codebase.

### The Four Versioning Strategies

**Strategy 1 — URL Path Versioning** (most common, recommended)
```
/api/v1/orders
/api/v2/orders
```
- Visible in URLs, logs, browser address bar
- Simple to configure and route (both at gateway and controller level)
- Easy to test with any HTTP client — no special headers
- Used by: Stripe, Razorpay, GitHub, Google, Twitter

**Strategy 2 — Query Parameter Versioning**
```
/api/orders?version=1
/api/orders?version=2
```
- URLs look clean without version in the path
- One URL for the "canonical" resource
- Harder to cache (query params affect CDN cache keys)
- Rarely used in practice — version can be accidentally omitted

**Strategy 3 — Custom Header Versioning**
```
GET /api/orders
X-API-Version: 2
```
- Clean URLs
- Requires explicit header on every request — easy to forget
- Not visible in logs without custom log config
- Cross-origin (CORS) needs the custom header in `Access-Control-Allow-Headers`
- Used by: Microsoft Azure APIs, some enterprise APIs

**Strategy 4 — Accept Header / Content Negotiation (Media Type)**
```
GET /api/orders
Accept: application/vnd.myapi.v2+json
```
- Most "RESTfully pure" — uses HTTP content negotiation
- Very hard to test (cannot just open in browser), complex to document
- Almost never used for public/partner APIs
- Complex Spring MVC configuration required
- Used by: GitHub API (as an option alongside URL versioning)

### What Counts as a Breaking Change?

```
BREAKING (requires new version):
  - Removing a field from the response
  - Renaming a field ("orderId" → "id")
  - Changing a field's type ("amount": 1000 → "amount": "₹1,000")
  - Removing an endpoint
  - Changing an HTTP method (POST → PUT)
  - Making an optional parameter required
  - Changing authentication requirements

NON-BREAKING (safe without a new version):
  - Adding a new optional field to the response
  - Adding a new endpoint
  - Adding a new optional query parameter with a default value
  - Adding new allowed values to an existing enum (where clients ignore unknown values)
  - Reducing minimum/maximum constraints on existing fields
```

### ASCII Diagram

```
Request routing in a versioned Spring Boot API:

  /api/v1/orders  ──────────► OrderControllerV1.listOrders()
                               returns: [{orderId, amount, date}]

  /api/v2/orders  ──────────► OrderControllerV2.listOrders()
                               returns: [{id, total: {amount, currency}, createdAt}]

OR with a single controller using RequestMapping paths:

  /api/v1/orders  ──────── @GetMapping("/v1/orders")
  /api/v2/orders  ──────── @GetMapping("/v2/orders")

OR routed at the API Gateway level:
  /api/v1/**       ──────── Route to service v1 (older deployment)
  /api/v2/**       ──────── Route to service v2 (current deployment)
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// No versioning — changing the response breaks existing clients
@RestController
@RequestMapping("/api/orders")  // No version in the path
public class OrderController {

    @GetMapping
    public List<Order> getOrders() {
        // Returns raw entity with {orderId, amount, date} format
        return orderRepository.findAll();
    }
}

// Three months later, someone "cleans up" the field names:
// {orderId: 42} → {id: 42}
// {amount: 1000} → {total: 1000, currency: "INR"}
// RESULT: Every mobile app using orderId is now broken.
// RESULT: Every partner integration breaks overnight.
```
> **Why this fails in production:** Once a client is built against a specific response shape, any field rename or removal is a breaking change. Without versioning, you must Either never change the API, or coordinate simultaneous deployments of every single client — mobile apps, partner integrations, browser caches — all at once. This is operationally impossible at scale.

### Right Way — URL Path Versioning (Spring Boot 3)
```java
// Option A: Separate controller classes per version
// Clean separation — v1 and v2 logic are completely independent

@RestController
@RequestMapping("/api/v1/orders")
public class OrderControllerV1 {

    private final OrderService orderService;

    public OrderControllerV1(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<Page<OrderDtoV1>> listOrders(Pageable pageable) {
        return ResponseEntity.ok(orderService.findAllV1(pageable));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderDtoV1> getOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.findByIdV1(orderId));
    }
}

@RestController
@RequestMapping("/api/v2/orders")
public class OrderControllerV2 {

    private final OrderService orderService;

    public OrderControllerV2(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<Page<OrderDtoV2>> listOrders(Pageable pageable) {
        return ResponseEntity.ok(orderService.findAllV2(pageable));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderDtoV2> getOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.findByIdV2(orderId));
    }
}
```

```java
// Version-specific DTOs — each version has its own response shape
// V1: legacy field names (maintain backward compatibility)
public record OrderDtoV1(
    Long orderId,       // "orderId" — the original field name v1 clients depend on
    BigDecimal amount,
    String date
) {}

// V2: improved naming and structure
public record OrderDtoV2(
    Long id,            // renamed from "orderId"
    MoneyDto total,     // changed from a primitive to a nested object
    Instant createdAt   // changed from String to ISO 8601 Instant
) {}

public record MoneyDto(BigDecimal amount, String currency) {}
```

```java
// Option B: Single controller with version as part of URL templates
// Useful when v1 and v2 logic is nearly identical with minor differences

@RestController
public class OrderController {

    // V1 endpoint — old format
    @GetMapping("/api/v1/orders/{orderId}")
    public ResponseEntity<OrderDtoV1> getOrderV1(@PathVariable Long orderId) {
        Order order = orderService.findById(orderId);
        // Map domain object to v1 DTO format
        return ResponseEntity.ok(new OrderDtoV1(order.getId(), order.getTotal(), order.getCreatedAt().toString()));
    }

    // V2 endpoint — new format
    @GetMapping("/api/v2/orders/{orderId}")
    public ResponseEntity<OrderDtoV2> getOrderV2(@PathVariable Long orderId) {
        Order order = orderService.findById(orderId);
        // Map domain object to v2 DTO format with improved structure
        return ResponseEntity.ok(new OrderDtoV2(order.getId(),
            new MoneyDto(order.getTotal(), "INR"), order.getCreatedAt()));
    }
}
```

### Header-Based Versioning (Alternative Setup)
```java
// For teams that prefer header versioning over URL versioning
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @GetMapping(headers = "X-API-Version=1")
    public ResponseEntity<OrderDtoV1> getOrdersV1() {
        // Only matches when header X-API-Version: 1 is present
        return ResponseEntity.ok(orderService.findAllV1());
    }

    @GetMapping(headers = "X-API-Version=2")
    public ResponseEntity<OrderDtoV2> getOrdersV2() {
        return ResponseEntity.ok(orderService.findAllV2());
    }

    // Default — no version header → serve v1 (for backward compatibility)
    @GetMapping
    public ResponseEntity<OrderDtoV1> getOrdersDefault() {
        return ResponseEntity.ok(orderService.findAllV1());
    }
}
```

### Deprecation Headers
```java
// Signal deprecated versions to clients via response headers
// Clients that check headers can detect and plan migration
@GetMapping("/api/v1/orders")
public ResponseEntity<List<OrderDtoV1>> getOrdersV1Deprecated() {
    return ResponseEntity.ok()
        .header("Deprecation", "true")
        .header("Sunset", "Sat, 31 Dec 2026 00:00:00 GMT")  // RFC 7231 date
        .header("Link", "</api/v2/orders>; rel=\"successor-version\"")
        .body(orderService.findAllV1());
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are the different API versioning strategies? Which one do you prefer and why?"

**Hruday's answer:**
> There are four main strategies: URL path, query parameter, custom header, and content negotiation via the Accept header.
>
> URL path versioning puts the version number directly in the URL: `/api/v1/orders`. Query parameter puts it in the query string: `/api/orders?version=1`. Custom header uses a header like `X-API-Version: 2`. Content negotiation uses the Accept header with a custom media type like `application/vnd.api.v2+json`.
>
> I prefer URL path versioning for most production cases. It is immediately visible in logs — without any custom log configuration, you can see which version each request used. It is easy to route differently in an API gateway — just match the `/v1/` prefix. It requires no special client configuration beyond the URL. It is easy to document and test in any HTTP client, browser, or Postman.
>
> Header-based approaches are cleaner for the URL but require discipline: every client must send the header on every request, CORS configuration must explicitly allow the custom header, and it doesn't show up in logs without extra setup.
>
> I used URL versioning at Oracle for our enterprise reporting APIs — it was the key reason we could deploy v2 while giving partners 3 months to migrate their v1 integrations.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is a breaking change in an API? Give concrete examples."

**Hruday's answer:**
> A breaking change forces existing clients to update their code — or they break. Non-breaking changes can be absorbed by existing clients without any code changes.
>
> Breaking changes: removing a field (`orderId` disappears from the response), renaming a field (`orderId` → `id`), changing a field's type (`amount: 1000` → `amount: "₹1,000"` — string instead of number breaks numeric parsing), changing a required parameter from optional to required, changing an HTTP method on an existing endpoint, removing an endpoint entirely.
>
> Non-breaking changes: adding a new OPTIONAL field to a response (well-behaved clients ignore unknown fields), adding a new endpoint, adding a new optional query parameter with a default value, deprecating (but not removing) functionality.
>
> The tricky ones: adding a new required field to a REQUEST body is breaking. Adding a new value to a response enum is semi-breaking — clients that switch exhaustively on enum values will fail; clients that handle unknown values gracefully will be fine. This is why well-designed SDK/client code always has a default case for enum switches.
>
> The practical rule: if an existing client would fail or behave incorrectly after your change — it's breaking. When in doubt, version it.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "How long should you maintain an old API version before shutting it down?"

**Hruday's answer:**
> The answer depends on your client types and your leverage over them — there's no universal rule.
>
> For internal APIs (your own frontend, your own microservices): shorter cycle is fine — 4 to 8 weeks with internal coordination. You control all clients; a migration sprint is viable.
>
> For public APIs (external partners, third-party integrations, public SDK): 6 to 12 months minimum. Partners have their own development schedules, their own approval processes, and large clients may have contracts that specify which version of your API they integrated against. Stripe maintained v1 of their API for over 5 years and still maintains multiple live versions.
>
> For mobile apps: the longest timeline. Users don't update their apps immediately. App stores show 6-month adoption lag on average. If your API is embedded in an app (not a web browser that always gets the latest JS), running v1 alongside v2 for 12-18 months is not unusual.
>
> Signals that it's safe to sunset: traffic metrics show near-zero requests to the old version. All clients have confirmed migration. Deprecation headers have been in place for months. You send email/webhook notifications to registered clients. The `Sunset` response header gives a machine-readable retirement date that advanced clients can monitor automatically.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "You need to change a widely-used payment API response field from `amount` (numeric) to a nested `total` object: `{amount, currency}`. How do you do this without breaking existing clients?"

**Hruday's answer:**
> This is a structural change — the API response shape changes. I would version it.
>
> Step 1: Add a new `/v2/payments` endpoint that returns the new structure with the nested `total` object. Keep `/v1/payments` returning the old flat `amount` field — unchanged.
>
> Step 2: Add deprecation headers to all v1 endpoints immediately. `Deprecation: true`, `Sunset: [date 6 months from now]`, `Link: </v2/payments>; rel="successor-version"`. Clients who monitor response headers get immediate notice.
>
> Step 3: Notify all registered API clients via email and in developer dashboard: "v1 will be retired on [date]. Migration guide: [link]."
>
> Step 4: Provide a migration guide. The change is: `response.amount` → `response.total.amount` and `response.total.currency` now tells them the currency explicitly instead of assuming INR.
>
> Step 5: Run traffic monitoring. Dashboard: what % of payment requests are still going to v1? As that number drops, extend or hold the sunset date. When v1 traffic drops below 1%, send final notifications to any remaining v1 callers (identifiable via API keys in headers).
>
> Step 6: Sunset v1. Return 410 Gone from the old endpoint. Clients still on v1 get an explicit error — not a silent failure.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "No versioning needed for internal APIs" | "It's just our own frontend — we control both sides" | "Internal APIs still need versioning if the frontend and backend deploy independently. If backend v2 deploys before frontend v2 is tested — the live frontend breaks. You need v1 to keep running until frontend v2 is verified and deployed. Versioning decouples deployment timelines." |
| "Just add a version header after launch" | "We can add versioning later when we need it" | "Adding versioning after launch requires migrating all existing clients from unversioned URLs to versioned ones simultaneously. Many clients don't update. Breaking them is not acceptable. Version from day 1 — `/v1/` in the base path costs nothing upfront and saves enormous pain later." |
| "URI versioning is not 'true REST'" | "The URI should identify the resource, not the version" | "This is a theoretical argument. Every major REST API in production — Stripe, GitHub, Twitter, Google, Razorpay — uses URL versioning. The REST specification does not prohibit it. In practice, URI versioning's operational advantages (visibility, routing, logging, testability) outweigh the philosophical argument. Choose pragmatism." |
| "Increment version for every small change" | "Any change → new version" | "Only breaking changes need a new version. Adding optional response fields, adding new endpoints, adding optional query parameters — all non-breaking. Unnecessary version increments fragment your API surface, increase maintenance overhead, and confuse clients. Save version bumps for genuine breaking changes." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, I worked on an API that enterprise partners had built reporting integrations against. When we needed to restructure the invoice response to support multi-currency (the original `amount` field assumed INR — ₹ hardcoded in the service), we introduced `/v2/invoices` with the `{amount, currency}` nested structure. We left `/v1/invoices` running untouched. Partners migrated over a 3-month window at their own pace. No partner integration broke. This experience made URL path versioning my default starting point — the operational simplicity when something needs to change is worth the slightly longer URL."

---

## 8. Scale Evolution

**1,000 users →** URL versioning with separate controller classes. Straightforward. No operational complexity. Both versions live in the same codebase, tested together.

**100,000 users →** Multiple versions in one service adds code maintenance overhead. Extract version routing to an API Gateway. The gateway handles version → service instance routing. This allows running v1 on older service instances and v2 on current ones — independent deployments. Blue/green versioning: v1 traffic → stable cluster. v2 traffic → new cluster under load testing.

**10 million users →** Global API with multiple regions. Version sunset requires region-by-region migration monitoring. API versioning registers in developer portals (Developer Hub) with per-version documentation, SDKs, and change logs. Sunset automation: when v1 traffic drops below threshold, trigger automated deprecation warnings in partner dashboards. Maintain compatibility matrices — which SDK version supports which API version — so support teams know exactly what any given client is running.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Their entire product is an API used by 10,000+ merchants. Version management allows Razorpay to add UPI 2.0 features in v2 while existing cashless integrations on v1 keep working without modification. | "A merchant integration depends on the exact format of your payment API response. How do you change the response format without breaking them?" |
| Swiggy / Meesho | Mobile apps (iOS/Android) lag in update adoption. API must support both old and new app versions simultaneously. URL versioning with traffic monitoring decides when it is safe to sunset. | "Your Android app has 30% users on a 2-year-old version. How do you deploy a breaking API change?" |
| Adobe / Microsoft | Adobe Document API, Microsoft Graph — both maintain multiple live API versions with long deprecation windows (often 2+ years). Enterprise customers cannot upgrade faster than their procurement cycle allows. | "What is your strategy for maintaining backward compatibility in a developer-facing API?" |
| Remote / Global roles | API versioning is a system design interview staple. Every senior API designer is expected to have a clear opinion on strategy, breaking vs non-breaking changes, and deprecation lifecycle. | "How do you version a REST API? What are the trade-offs between URL vs header versioning?" |

---

## 10. Related Topics — What to Study Next

- **Topic 56 — REST API Design Principles** — versioning is one of the core REST design principles; the resource-centric URL design from Topic 56 makes versioned URLs cleaner and more predictable
- **Topic 69 — API Gateway** — at scale, API gateways handle version routing centrally, abstracting the versioning mechanism from individual services — understanding the gateway's role makes version strategy choices clearer
- **Topic 60 — Request Validation (@Valid)** — when a new version changes request structure, validation rules change too — new version = new request DTO with its own validation constraints
- **Topic 58 — Exception Handling** — delivering version-specific error responses (v1 errors in the old format, v2 errors in the new format) requires version-aware exception handling or consistent error formats across versions
- **Topic 83 — Centralized Configuration Management** — version-specific feature flags and API behaviour switches can be managed centrally via Spring Cloud Config — turn off v1 gradually across deployments

---

*Part 3 · API Versioning Strategies · Full Stack Interview Guide · Hruday D · 2026*
