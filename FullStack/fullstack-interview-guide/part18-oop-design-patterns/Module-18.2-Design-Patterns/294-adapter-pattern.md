# Adapter Pattern
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Adapter pattern**: wraps an incompatible interface to make it look like the interface your system expects; like a power plug adapter — the appliance expects one shape, the wall socket provides another, the adapter converts between them
- **Two forms**: Class Adapter (extends the adaptee AND implements target interface — only in languages supporting multiple inheritance); Object Adapter (wraps the adaptee via composition — the Java/TypeScript way, preferred)
- **When to use**: integrating a third-party library whose API doesn't match your domain interface; wrapping a legacy service with a new interface; isolating your code from vendor-specific APIs so you can swap vendors
- **Real Spring examples**: `HandlerAdapter` in Spring MVC adapts different handler types (annotated controllers, `HttpRequestHandler`, `Servlet`) to a common `ModelAndView handle()` call; `MessageListenerAdapter` adapts plain POJOs to `MessageListener`; `JpaRepository` adapts JPA `EntityManager` to the Repository interface
- **Anti-corruption layer in DDD**: adapting a legacy external model to your domain model is a direct application of Adapter (the Adapter translates between the external model's structure and your domain model's structure)
- **Adapter vs Facade**: Adapter = makes TWO incompatible interfaces work together; Facade = simplifies a complex subsystem with a single simpler interface; they look similar in code but solve different problems

---

## 1. One-Line Definition
The Adapter pattern wraps an existing incompatible interface behind a target interface so that a client expecting the target interface can work with the wrapped class without modification.

---

## 2. The Problem It Solves

**Without Adapter:** your system calls `paymentGateway.charge(Order order)`, but the new Stripe SDK you must integrate uses `stripeClient.createPaymentIntent(Long amountCents, String currency, Map<String, String> metadata)`. You either:
1. Rewrite all callers to use the Stripe API directly — tight coupling to Stripe everywhere
2. Cannot switch payment providers without changing every callsite
3. Cannot test without a real Stripe connection

**With Adapter:** wrap `StripeClient` in a `StripePaymentAdapter implements PaymentGateway`. Your system calls `paymentGateway.charge(order)`. The adapter translates the call to the Stripe API. Swap provider = swap adapter. Test = inject mock `PaymentGateway`.

---

## 3. How It Works Internally

```
Your code  →  PaymentGateway.charge(Order)   ← Target interface (what your system expects)
                        ↓
               StripePaymentAdapter            ← Adapter (translates the call)
                 wraps StripeClient            ← Adaptee (incompatible interface)
                        ↓
               stripeClient.createPaymentIntent(amountCents, currency, metadata)
```

Adapter receives the call in the target's language, translates it to the adaptee's language, delegates to the adaptee, and translates the response back.

---

## 4. The Code

### Wrong Way — Callers Know About the Concrete Third-Party SDK

```java
// ❌ NO ADAPTER: every caller uses the Stripe SDK directly

@Service
public class CheckoutService {
    
    // ❌ Tight coupling to Stripe SDK
    private final StripeClient stripeClient;
    
    public CheckoutService() {
        // ❌ Direct construction with vendor credentials
        this.stripeClient = new StripeClient(System.getenv("STRIPE_API_KEY"));
    }
    
    public void completePurchase(Order order, PaymentMethod method) {
        // ❌ Caller knows Stripe's API shape: amounts in cents, PaymentIntentCreateParams
        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
            .setAmount(order.getTotalAmount().multiply(BigDecimal.valueOf(100)).longValue())  // convert to cents
            .setCurrency(order.getCurrency().toLowerCase())
            .setCustomer(method.getStripeCustomerId())
            .putMetadata("orderId", order.getId().toString())
            .build();
        
        try {
            stripeClient.paymentIntents().create(params);
        } catch (StripeException e) {
            // ❌ Stripe-specific exception leaks through all layers
            throw new RuntimeException("Stripe payment failed: " + e.getMessage(), e);
        }
    }
}

// Problems:
// - Switching to Razorpay: rewrite CheckoutService + any other service calling Stripe
// - Testing: mock StripeClient (SDK's own class) or start real Stripe test mode
// - Stripe SDK version upgrade may change API — open many files
// - Europe region needs Razorpay; India region needs Stripe — same service, different code
```

```java
// ✅ ADAPTER: CheckoutService only knows PaymentGateway interface

// 1. Target interface — what your system expects
public interface PaymentGateway {
    PaymentResult charge(Order order, PaymentMethod method);
    RefundResult refund(String transactionId, BigDecimal amount);
}

// 2. Domain exception — not Stripe-specific
public class PaymentException extends RuntimeException {
    private final String errorCode;
    public PaymentException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
    public String getErrorCode() { return errorCode; }
}

// 3. Adapter for Stripe
@Component
@Profile("payment-stripe")
public class StripePaymentAdapter implements PaymentGateway {
    
    private final StripeClient stripeClient;   // ← wraps the adaptee
    
    public StripePaymentAdapter(@Value("${stripe.api.key}") String apiKey) {
        this.stripeClient = new StripeClient(apiKey);
    }
    
    @Override
    public PaymentResult charge(Order order, PaymentMethod method) {
        // ✅ Translation: domain Order → Stripe API structure
        try {
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(toCents(order.getTotalAmount()))            // ← convert domain amount to Stripe cents
                .setCurrency(order.getCurrency().toLowerCase())
                .setCustomer(method.getProviderId())                  // ← domain PaymentMethod abstraction
                .putMetadata("orderId", order.getId().toString())
                .build();
            
            PaymentIntent intent = stripeClient.paymentIntents().create(params);
            
            // ✅ Translation: Stripe response → domain PaymentResult
            return new PaymentResult(intent.getId(), "SUCCEEDED", order.getTotalAmount());
            
        } catch (StripeException e) {
            // ✅ Translate vendor exception to domain exception — doesn't leak Stripe into callers
            throw new PaymentException(e.getCode(), "Stripe charge failed", e);
        }
    }
    
    @Override
    public RefundResult refund(String transactionId, BigDecimal amount) {
        try {
            RefundCreateParams params = RefundCreateParams.builder()
                .setPaymentIntent(transactionId)
                .setAmount(toCents(amount))
                .build();
            Refund refund = stripeClient.refunds().create(params);
            return new RefundResult(refund.getId(), "SUCCEEDED");
        } catch (StripeException e) {
            throw new PaymentException(e.getCode(), "Stripe refund failed", e);
        }
    }
    
    private long toCents(BigDecimal amount) {
        return amount.multiply(BigDecimal.valueOf(100)).longValue();
    }
}

// 4. Adapter for Razorpay — same interface, different implementation
@Component
@Profile("payment-razorpay")
public class RazorpayPaymentAdapter implements PaymentGateway {
    
    private final RazorpayClient razorpayClient;  // ← different adaptee, same target interface
    
    public RazorpayPaymentAdapter(@Value("${razorpay.key.id}") String keyId,
                                  @Value("${razorpay.key.secret}") String keySecret) throws RazorpayException {
        this.razorpayClient = new RazorpayClient(keyId, keySecret);
    }
    
    @Override
    public PaymentResult charge(Order order, PaymentMethod method) {
        // ← completely different Razorpay API, same domain interface contract
        JSONObject orderReq = new JSONObject();
        orderReq.put("amount", order.getTotalAmount().multiply(BigDecimal.valueOf(100)).intValue());
        orderReq.put("currency", order.getCurrency().toUpperCase());
        orderReq.put("receipt", order.getId().toString());
        // ... Razorpay-specific flow
        return new PaymentResult(/* ... */);
    }
    
    @Override
    public RefundResult refund(String transactionId, BigDecimal amount) { /* Razorpay refund */ return null; }
}

// 5. CheckoutService — clean, knows nothing about Stripe or Razorpay
@Service
public class CheckoutService {
    private final PaymentGateway gateway;  // ← depends only on target interface
    
    public CheckoutService(PaymentGateway gateway) { this.gateway = gateway; }
    
    public void completePurchase(Order order, PaymentMethod method) {
        PaymentResult result = gateway.charge(order, method);  // ← no Stripe/Razorpay knowledge
        if (!"SUCCEEDED".equals(result.getStatus())) {
            throw new OrderException("Payment did not succeed: " + result.getStatus());
        }
        order.markPaid(result.getTransactionId());
    }
}
```

```java
// ✅ Adapter for legacy service — anti-corruption layer in DDD

// Legacy CRM uses its own inconsistent model
class LegacyCrmClient {
    public Map<String, Object> getClientData(String crmId) {
        // Returns: {"client_nm": "...", "addr_line1": "...", "addr_city": "...", "phn_no": "..."}
        // Inconsistent naming, mixed camelCase/snake_case, everything as raw Map
    }
}

// Your domain model
record CustomerSummary(String name, Address address, String phoneNumber) {}
record Address(String street, String city) {}

// Adapter translates legacy response to domain model
@Component
public class LegacyCrmAdapter {
    private final LegacyCrmClient crmClient;
    
    public LegacyCrmAdapter(LegacyCrmClient crmClient) { this.crmClient = crmClient; }
    
    public CustomerSummary getCustomer(String crmId) {             // ← speaks your domain's language
        Map<String, Object> raw = crmClient.getClientData(crmId);  // ← calls legacy API
        
        // Translate legacy → domain
        String name = (String) raw.get("client_nm");               // ← snake_case → domain name
        String street = (String) raw.get("addr_line1");
        String city = (String) raw.get("addr_city");
        String phone = (String) raw.get("phn_no");
        
        return new CustomerSummary(name, new Address(street, city), phone);
    }
}
```

```typescript
// ✅ TypeScript — Adapter for different storage backends

interface StorageService {
    save(key: string, value: string): Promise<void>;
    load(key: string): Promise<string | null>;
    delete(key: string): Promise<void>;
}

// LocalStorage adapter — synchronous API wrapped in async interface
class LocalStorageAdapter implements StorageService {
    async save(key: string, value: string): Promise<void> {
        localStorage.setItem(key, value);  // ← sync API, wrapped in async
    }
    async load(key: string): Promise<string | null> {
        return localStorage.getItem(key);
    }
    async delete(key: string): Promise<void> {
        localStorage.removeItem(key);
    }
}

// Redis adapter — real async
class RedisStorageAdapter implements StorageService {
    constructor(private redis: RedisClient) {}
    
    async save(key: string, value: string): Promise<void> {
        await this.redis.set(key, value);
    }
    async load(key: string): Promise<string | null> {
        return this.redis.get(key);
    }
    async delete(key: string): Promise<void> {
        await this.redis.del(key);
    }
}

// Component uses StorageService — localStorage in browser, Redis in server
function CartService(storage: StorageService) {
    return {
        saveCart: async (userId: string, cart: Cart) =>
            storage.save(`cart:${userId}`, JSON.stringify(cart)),
        loadCart: async (userId: string) =>
            storage.load(`cart:${userId}`).then(s => s ? JSON.parse(s) : null),
    };
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the Adapter pattern and when would you reach for it?"

**Hruday's answer:**
> Adapter wraps an existing class with an incompatible interface behind a new interface that your system expects. The classic example is integrating a third-party library: your system expects `PaymentGateway.charge(Order)`, but Stripe's SDK has `createPaymentIntent(amountCents, currency, metadata)`. The Adapter implements `PaymentGateway` and inside it translates to the Stripe SDK call.
>
> I reach for it in three situations:
> 1. Integrating a third-party or legacy API that doesn't match my domain interface — keeps the vendor's API shape contained in one class
> 2. Anti-corruption layer in DDD — legacy systems have inconsistent/messy models; the adapter translates their model to my domain model at the boundary
> 3. Enabling vendor swap — if two payment providers need to be swappable by profile/config, both have adapters implementing the same interface; the application code doesn't need to change when switching providers
>
> The test is: are you making an incompatible interface compatible? That's Adapter.

---

### Q2 — Deep Dive
**Interviewer asks:** "What's the difference between Adapter and Facade? They both wrap something."

**Hruday's answer:**
> The motivation is different.
>
> Adapter exists because two interfaces are incompatible — there's a mismatch between what the client expects and what the adaptee provides. The Adapter's job is to bridge that structural gap. Adapter doesn't simplify; it translates.
>
> Facade exists because a subsystem is complex — many classes, many steps — and you want to hide that complexity behind a simple unified interface. Facade typically makes many calls internally; the complexity is behind the facade.
>
> In code they can look similar — both wrap classes. But their intent differs:
> - If your `CheckoutService` wraps Stripe's complex 3-step payment API (createCustomer, createPaymentMethod, createPaymentIntent) into `gateway.charge(order)`, that's a Facade simplifying Stripe's complexity
> - If your `CheckoutService` wraps Stripe ONLY because it implements a `PaymentGateway` interface that Stripe doesn't implement natively, that's an Adapter bridging interface incompatibility
>
> Often a class is BOTH: an Adapter (implements your target interface) that also acts as a Facade (hides Stripe's multi-step process behind one method). That combination is common in real code — pure patterns are rare.

---

### Q3 — Application
**Interviewer asks:** "Name a Spring MVC class that uses the Adapter pattern."

**Hruday's answer:**
> Spring MVC's `HandlerAdapter` is a textbook Adapter pattern.
>
> Spring MVC's `DispatcherServlet` needs to call request handlers — but handlers can be many different types: `@Controller` classes with annotated methods, objects implementing `HttpRequestHandler`, old-style `Controller` interface implementations. Each has a completely different API.
>
> `DispatcherServlet` can't call all of them with the same code. So Spring defines the `HandlerAdapter` interface with `handle(HttpServletRequest, HttpServletResponse, Object handler) → ModelAndView`. There's one `HandlerAdapter` implementation per handler type: `RequestMappingHandlerAdapter` handles annotated controllers, `HttpRequestHandlerAdapter` handles `HttpRequestHandler` objects.
>
> `DispatcherServlet` calls `handlerAdapter.handle(...)` — the same target interface — for every type of handler. Each HandlerAdapter knows how to call its specific type of handler. This is exactly the Adapter pattern: multiple incompatible handler types, all adapted to one `HandlerAdapter.handle()` interface that `DispatcherServlet` uses.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Adapter just delegates | "Adapter is just a wrapper that calls the other class's methods" | Adapter often has non-trivial TRANSLATION logic: converting amount from `BigDecimal` (domain) to `long cents` (Stripe); mapping domain exceptions to/from vendor exceptions; reformatting dates; validating additional constraints the adaptee doesn't enforce; calling multiple adaptee methods to fulfil one target method; the translation is the work — wrapper is just the structure |
| Confusing with Proxy | "Adapter and Proxy both wrap a class, aren't they the same?" | Adapter and Proxy both wrap objects, but for different reasons: Proxy wraps an object implementing the SAME interface (to add behaviour — lazy loading, logging, access control); Adapter wraps an object implementing a DIFFERENT interface to make it compatible with the target interface; Proxy preserves the same interface; Adapter bridges two different interfaces |
| Over-adapting everything | "I'll write an adapter for every external call" | Adapter is most valuable when there are MULTIPLE implementations of the target interface (multiple payment providers) or when the external API is likely to change (legacy system migration); wrapping every single API call in adapters when there's only one provider and no planned replacement adds maintenance cost without proportional benefit; judge whether the isolation benefit justifies the extra layer |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we integrated with three external HR systems across global offices: SAP SuccessFactors in Europe, Workday in the US, and a legacy on-premise Oracle HCM system in Asia. Each had a completely different API — REST+JSON for SuccessFactors, SOAP for Workday, a JDBC direct connection for Oracle HCM.
>
> Without adapters, our leave management module would have had three sets of if/else branches for every HR operation: 'if SuccessFactors, else if Workday, else Oracle'. Any new HR operation = edit three branches in multiple files.
>
> We defined a `HrDataProvider` interface with six operations: `getEmployee`, `getOrgUnit`, `getLeaveBalance`, `submitLeaveRequest`, `getManagerChain`, `listDirectReports`. Three adapter classes wrapped each vendor. The leave management logic called only `HrDataProvider`.
>
> When SAP rolled out SuccessFactors to the Asia office, replacing Oracle HCM, the leave management code was not touched — only the Oracle adapter was decommissioned and the SuccessFactors adapter was configured for the Asia region. The migration PR for the leave service had zero changes to business logic — only the adapter wiring in the configuration class changed."

---

## 8. Scale Evolution

**1,000 users →** Adapter for single payment provider — isolates vendor SDK, enables mocking in tests. DDD anti-corruption layer for legacy service boundary.

**100,000 users →** Multi-provider adapters for failover: `@Primary` Razorpay adapter; `@Qualifier("backup")` Stripe adapter; when Razorpay is down, gateway chain (Resilience4j fallback) switches to Stripe adapter; zero changes to business logic.

**10 million users →** Event-driven anti-corruption: adapters translate incoming Kafka events from partner systems to domain events (vendor's `OrderShippedV2` event adapted to your `ShipmentConfirmedEvent` domain event); schema registry controls versioning; backward-compatible adapter allows gradual migration of vendor schema without changing downstream consumers.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Multi-PSP Adapter (Razorpay/Stripe/Juspay) for unified payment interface; adapter translates domain Payment to each PSP's API format | Multi-provider adapter design; PaymentGateway interface |
| Swiggy / Meesho | Adapter for delivery partner APIs (Dunzo/Porter/Scout24) — each has a different delivery status API; single `DeliveryProvider` interface with adapters | Delivery provider adapter; status mapping translation |
| Adobe / Microsoft | Adapter in legacy migration: adapting old SOAP services to REST; `HandlerAdapter` knowledge in Spring MVC; "implement a storage adapter" whiteboard question | Spring MVC internals; legacy SOAP→REST adapter |
| SAP Labs | 3-HR-system adapter story (SuccessFactors + Workday + Oracle HCM; migration PR with zero business logic changes; `HrDataProvider` interface) | Multi-vendor adapter design; zero-change migration story |

---

## 10. Related Topics — What to Study Next

- **Topic 297 — Facade Pattern** — Facade is frequently confused with Adapter; understanding both helps distinguish them: Adapter = bridge between two incompatible interfaces; Facade = simplify a complex subsystem; both wrap classes, but for fundamentally different reasons
- **Topic 296 — Proxy Pattern** — Proxy also wraps a class implementing the SAME interface; knowing Adapter (different interface bridge) vs Proxy (same interface, added behaviour) prevents confusing them in interview discussions
- **Topic 289 — Dependency Injection** — Adapter works best in combination with DI: the calling code depends on the target interface, Spring injects the concrete Adapter; switching between adapters is a matter of Spring configuration, not code change; the two patterns reinforce each other

---

*Part 18 · Adapter Pattern · Full Stack Interview Guide · Hruday D · 2026*
