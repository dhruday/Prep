# Builder Pattern — Common in Spring Configs
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Builder pattern**: separates the CONSTRUCTION of a complex object from its REPRESENTATION; instead of a constructor with 12 parameters (which ones are which?), you call `builder.withName("x").withTimeout(5000).withRetries(3).build()`
- **When to use**: object has many optional fields; different valid combinations of fields; complex validation that should run at `build()` time, not over multiple setters
- **Immutability bonus**: the object produced by `build()` can be immutable (all fields `final`) — impossible if you allow setters
- **Lombok `@Builder`**: generates the entire builder for you; use `@Builder.Default` for default field values in Lombok; `@Builder` on an existing class generates a static `builder()` method
- **Spring examples**: `WebClient.builder()`, `HttpSecurity.http()`, `MockMvcRequestBuilders.get()`, Spring Security `SecurityFilterChain` configuration — all are Builder pattern
- **Fluent API design**: each builder method returns `this` (the builder), enabling method chaining; `build()` is the terminal operation, returns the final immutable object
- **Director**: an optional part of the pattern — a Director class calls builder methods in a specific order to produce a preset configuration; rarely used in Java/Spring directly; Spring's `@Configuration` class IS a director
- **Key distinction from Factory**: Factory decides WHICH type to create; Builder decides HOW to assemble a specific complex object

---

## 1. One-Line Definition
Builder separates the step-by-step construction of a complex object from its final representation, allowing the same construction process to produce different configurations while keeping the target object immutable and validating completeness at build time.

---

## 2. The Problem It Solves

**Telescoping constructor anti-pattern:**

```java
// ❌ Which args are which? Is the 5th arg retries or timeout?
HttpClientConfig config = new HttpClientConfig(
    "https://api.sap.com", "api-key-xxx", 5000, 3, true, "gzip", 10, "/health"
);
// Without looking at the constructor signature, these 8 positional args are impossible to read
// Making maxConnections optional: need a new constructor overload
// 8-arg constructor → 7-arg → 6-arg... "telescoping constructors"
```

```java
// ✅ Builder — self-documenting, optional fields, validated at build()
HttpClientConfig config = HttpClientConfig.builder()
    .baseUrl("https://api.sap.com")
    .apiKey("api-key-xxx")
    .timeoutMs(5000)
    .maxRetries(3)
    .compressionEnabled(true)
    .build();
// Can't confuse positions; optional fields are simply omitted; validation in build()
```

---

## 3. How It Works Internally

```
Client calls builder method chain:
  builder.fieldA("x") → sets field in builder, returns this
  builder.fieldB(42)   → sets field in builder, returns this
  builder.build()      → validates, constructs target, returns immutable instance

Target object is:
  private final String fieldA;
  private final int fieldB;
  // No setters — immutable after build()

Builder has:
  private String fieldA;    // mutable during construction
  private int fieldB;
  + setter-style methods returning `this`
  + build() method that validates and creates target
```

---

## 4. The Code

### Wrong Way — Telescoping Constructor / Mutable Object

```java
// ❌ 9-param constructor — unreadable and brittle

public class EmailRequest {
    private String to;
    private String from;
    private String subject;
    private String body;
    private String cc;
    private String bcc;
    private boolean isHtml;
    private List<String> attachments;
    private int priority;
    
    // ❌ 9-arg constructor — caller must know exact order
    public EmailRequest(String to, String from, String subject, String body,
                       String cc, String bcc, boolean isHtml,
                       List<String> attachments, int priority) {
        this.to = to; this.from = from; /* etc */
    }
    
    // ❌ Or: JavaBeans style with setters — not immutable; incomplete object possible
    public EmailRequest() {}
    public void setTo(String to) { this.to = to; }
    public void setSubject(String subject) { this.subject = subject; }
    // ... 9 setters
    // Can create EmailRequest with no 'to' field and no NullPointerException until send()
}

// Caller code
EmailRequest req = new EmailRequest();
req.setTo("alice@sap.com");
req.setFrom("system@sap.com");
// Oops: forgot to set subject — valid object, will fail silently at send time
emailService.send(req);
```

```java
// ✅ Manual Builder — clean, immutable, validated

public final class EmailRequest {
    // Final fields — immutable after construction
    private final String to;
    private final String from;
    private final String subject;
    private final String body;
    private final String cc;           // optional
    private final String bcc;          // optional
    private final boolean isHtml;      // default false
    private final List<String> attachments; // optional
    private final int priority;        // default 3 (normal)
    
    private EmailRequest(Builder builder) {
        this.to          = builder.to;
        this.from        = builder.from;
        this.subject     = builder.subject;
        this.body        = builder.body;
        this.cc          = builder.cc;
        this.bcc         = builder.bcc;
        this.isHtml      = builder.isHtml;
        this.attachments = List.copyOf(builder.attachments != null ? builder.attachments : List.of());
        this.priority    = builder.priority;
    }
    
    // ✅ Getters only — no setters
    public String getTo()      { return to; }
    public String getSubject() { return subject; }
    
    public static Builder builder() { return new Builder(); }
    
    public static final class Builder {
        private String to;
        private String from;
        private String subject;
        private String body;
        private String cc;
        private String bcc;
        private boolean isHtml = false;    // ✅ default values
        private List<String> attachments;
        private int priority = 3;          // ✅ default priority = normal
        
        public Builder to(String to)         { this.to = to; return this; }
        public Builder from(String from)     { this.from = from; return this; }
        public Builder subject(String s)     { this.subject = s; return this; }
        public Builder body(String body)     { this.body = body; return this; }
        public Builder cc(String cc)         { this.cc = cc; return this; }
        public Builder bcc(String bcc)       { this.bcc = bcc; return this; }
        public Builder html(boolean isHtml)  { this.isHtml = isHtml; return this; }
        public Builder attachments(List<String> a) { this.attachments = a; return this; }
        public Builder priority(int p)       { this.priority = p; return this; }
        
        public EmailRequest build() {
            // ✅ All validation in one place at build time
            if (to == null || to.isBlank())      throw new IllegalStateException("'to' is required");
            if (from == null || from.isBlank())  throw new IllegalStateException("'from' is required");
            if (subject == null || subject.isBlank()) throw new IllegalStateException("'subject' is required");
            if (body == null)                    throw new IllegalStateException("'body' is required");
            if (priority < 1 || priority > 5)   throw new IllegalStateException("priority must be 1-5");
            return new EmailRequest(this);
        }
    }
}

// Clean usage
EmailRequest request = EmailRequest.builder()
    .to("alice@sap.com")
    .from("noreply@sap.com")
    .subject("Order Confirmed")
    .body("<h1>Your order is ready</h1>")
    .html(true)
    .priority(2)
    .build();
// Forgot .to()? build() throws immediately with a clear message — not a NullPointerException at send time
```

```java
// ✅ Lombok @Builder — most common production approach

@Builder
@Value  // @Value = all-final, all-args constructor, getters, equals/hashCode (Lombok)
public class EmailRequest {
    @NonNull String to;
    @NonNull String from;
    @NonNull String subject;
    @NonNull String body;
    String cc;                          // optional
    String bcc;                         // optional
    @Builder.Default boolean isHtml = false;    // ✅ default value with Lombok
    @Builder.Default int priority = 3;          // ✅ default value with Lombok
    List<String> attachments;
}

// Usage identical:
EmailRequest req = EmailRequest.builder()
    .to("alice@sap.com")
    .from("noreply@sap.com")
    .subject("Order Confirmed")
    .body("Hello Alice")
    .isHtml(true)
    .build();
```

```java
// ✅ Spring ConfigBuilder pattern (WebClient — same concept)

WebClient client = WebClient.builder()
    .baseUrl("https://api.sap.com")
    .defaultHeader("Authorization", "Bearer " + token)
    .defaultHeader("Accept", "application/json")
    .codecs(c -> c.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
    .filter(ExchangeFilterFunctions.basicAuthentication("user", "pass"))
    .build();
// build() creates an immutable WebClient — same pattern; Spring team used Builder here

// Spring Security configuration — Builder/Fluent API (IoC + Builder combined)
@Bean
SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/public/**").permitAll()
            .anyRequest().authenticated())
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .build();  // ← terminal build()
}
```

```typescript
// ✅ TypeScript — Builder in frontend config objects

class QueryBuilder {
    private params: URLSearchParams = new URLSearchParams();
    private path: string = '';
    private headers: Record<string, string> = {};
    
    url(path: string): this { this.path = path; return this; }
    param(key: string, value: string): this { this.params.set(key, value); return this; }
    header(key: string, value: string): this { this.headers[key] = value; return this; }
    auth(token: string): this { return this.header('Authorization', `Bearer ${token}`); }
    
    build(): Request {
        if (!this.path) throw new Error('URL path is required');
        const url = `${this.path}?${this.params.toString()}`;
        return new Request(url, { headers: this.headers });
    }
}

const request = new QueryBuilder()
    .url('/api/products')
    .param('category', 'electronics')
    .param('sort', 'price')
    .auth(accessToken)
    .build();

fetch(request).then(res => res.json());
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why use Builder instead of just setters on a JavaBean?"

**Hruday's answer:**
> Three main reasons.
>
> First, immutability: Builder allows the produced object to have `final` fields with no setters. Once `build()` returns, the object can never be changed — it's safe to share across threads without synchronisation. JavaBean setters make every field mutable indefinitely.
>
> Second, completion guarantee: with setters, I can call `emailService.send(request)` with a partially-configured object — missing `to` field — and the error surfaces only at runtime, deep in the call stack. Builder's `build()` is the single validation point — all required fields are checked before the object is constructed. The caller gets an `IllegalStateException` immediately at the call site.
>
> Third, optional fields with defaults: Builder pattern naturally supports defaults (set `priority = 3` in the Builder's field initialisation). Constructors need overloads for every optional field combination — the "telescoping constructor" problem. Setters don't support defaults at all.
>
> The tradeoff: Builder is more code. For very simple objects (2-3 fields, no validation), a constructor is fine. Builder is worth it at 4+ fields with some optional.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain how Spring's WebClient.builder() uses the Builder pattern and why Spring chose Builder over constructors."

**Hruday's answer:**
> `WebClient` has 15+ configuration options: base URL, timeouts, codecs, filters, headers, error handlers, connection pool settings, SSL configuration. A constructor with all of these would be impossible to read and use.
>
> `WebClient.builder()` returns a `WebClient.Builder` with fluent methods for each option. You call only the methods for the options you need; everything else uses sensible defaults. `build()` validates the configuration and creates an immutable `WebClient` instance.
>
> Spring chose Builder because:
> - Most of the configuration options are optional; typical clients need 3-4 settings from the 15+ available
> - WebClient is designed to be reused as a singleton — immutability makes it thread-safe without any complexity
> - The production WebClient, test WebClient, and mock WebClient are different configurations of the same type — Builder expresses each configuration clearly without separate constructors or subclasses
>
> The pattern repeats across Spring: `RestClient.builder()`, `HttpSecurity.http()`, `MockMvcRequestBuilders.get("/endpoint").param("x","y").contentType(JSON).accept(JSON)` — all Builder. The team consistently uses Builder for any infrastructure object with optional configuration.

---

### Q3 — Application
**Interviewer asks:** "What validation should go in the Builder vs in the built object?"

**Hruday's answer:**
> The Builder's `build()` method is the right place for completeness and consistency validation — "are all required fields present?", "are the field values within range?", "do these two fields make sense together?". This is the single gate before the object is created — fail fast, clear error message at the call site.
>
> The built object itself can hold validation in a few cases: invariant assertions in `@PostConstruct` or defensive getters (`if (this.items == null) throw new IllegalStateException()` in a getter — same as null-defensive code). But if the object is immutable and `build()` did full validation, the object shouldn't need defensive checks internally.
>
> Complex domain rules that require external context (checking if a product ID exists in the database) belong neither in the Builder nor in the object — they belong in a domain service or validator that runs separately. Builder validates structural completeness; domain services validate business rules.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Builder = Lombok boilerplate | "I always use @Builder and don't think about it" | Lombok `@Builder` has an important gotcha with `@Builder.Default`: if you write `private int priority = 3;` in the class without `@Builder.Default`, Lombok ignores the initialiser and the builder sets it to 0; you MUST write `@Builder.Default int priority = 3;` for defaults to work; forgetting this produces a subtle bug where optional fields have wrong zero-value defaults when the builder caller omits them |
| Build always succeeds | "The build() method just calls the constructor" | `build()` is the validation gate; incomplete builders should throw with a clear message before the object is created; this is the key advantage over setters — you can't get an invalid object out of a Builder if `build()` validates correctly; not validating in `build()` surrenders the main safety benefit of the pattern |
| Builder vs Builder in GOF | "Builder creates different types based on configuration" | GOF Builder separates algorithm (Director) from representation (Builder/ConcreteBuilder); the "director" calls builder methods in a sequence; in practice in Java/Spring, no one uses Director — just fluent builders without a separate Director class; what we call Builder in Java practice is the fluent builder pattern; the GOF's structural intent (separate construction from representation) is the same, the Director is just not used in most Java implementations |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, the report generation service had a `GenerateReportRequest` object with 11 parameters passed to it as a constructor: export format, date range start, date range end, locale, currency, fiscal year, fiscal period, cost center filter, profit center filter, segment filter, and whether to include draft items.
>
> The constructor had 11 args. In code review, a junior developer swapped `fiscalYear` and `fiscalPeriod` (both integers, same position in the constructor). The compiler accepted it. Tests didn't catch it because the test used the same wrong order. The bug reached production — reports showed fiscal period 2024 as fiscal year 2024, generating wrong comparative analytics.
>
> We moved to a Builder with named methods. The same mistake now reads `.fiscalYear(2024).fiscalPeriod(3)` — immediately readable and the swap is obvious. We added type-safety further: `FiscalYear` and `FiscalPeriod` as value objects (not raw ints), so `.fiscalYear(new FiscalYear(2024))` can't be passed to `.fiscalPeriod()`.
>
> After migration, two similar bugs were caught in code review in the following quarter — reviewers could SEE the names. None reached production."

---

## 8. Scale Evolution

**1,000 users →** Builder for domain objects — `EmailRequest`, `OrderRequest`, `ReportConfig`. Immutability makes them safe to log, cache, reuse. Lombok `@Builder` reduces boilerplate.

**100,000 users →** Builders for Spring infrastructure: `WebClient.builder()` with connection pool size, timeout, and retry filter configured for the target service's SLA; `KafkaProducerFactory.builder()` with serialiser and linger configuration; immutable infrastructure clients eliminate race conditions in shared client configuration.

**10 million users →** Builder for query objects in CQRS read models: `ProductSearchQuery.builder().category(cat).priceRange(lo,hi).sortBy(PRICE).page(2).pageSize(20).build()` — immutable query objects are cache-key-hashable (cached with the full query as the key), thread-safe, and can be serialised to a queue for async processing.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Builder for payment request objects (amount, currency, description, customer, metadata, callbacks) — immutability prevents mutation during multi-step payment flow; `WebClient.builder()` for payment gateway HTTP clients | Immutable payment request via Builder; infrastructure config builder |
| Swiggy / Meesho | Builder for order construction: `OrderBuilder.withCart(cart).withDeliveryAddress(addr).withPromo(code).build()` — validates stock, address, and promo at build time before any database write | Domain validation at build() time |
| Adobe / Microsoft | "Implement a QueryBuilder" or "implement an HTTP request builder" is a classic implementation whiteboard question; fluent API design interview discussion | Implementation of fluent Builder on whiteboard |
| SAP Labs | 11-arg constructor → Builder story (fiscal year/period swap bug in production; named methods caught same class of bug in review; no production bugs after migration) | Type-safety via named builder methods vs positional constructor args |

---

## 10. Related Topics — What to Study Next

- **Topic 292 — Factory and Abstract Factory** — Factory decides WHICH type to create; Builder decides HOW to configure that type; many frameworks use both: a Factory creates the right Builder for the context, and the Builder assembles the specific configuration; knowing these as complementary patterns is a senior-level signal
- **Topic 295 — Decorator Pattern** — Decorator and Builder are both used in Spring Security's fluent configuration; in `HttpSecurity`, `.addFilterBefore(filter, ...)` is a Decorator adding behaviour; the overall fluent chain is Builder; seeing both patterns in the same Spring DSL is a nuanced observation
- **Topic 007 — Value Objects** — the combination of Builder + Value Objects (immutable domain types like `FiscalYear`, `Money`, `EmailAddress`) is the production-grade pattern for preventing primitive obsession (swapping `int fiscalYear` and `int fiscalPeriod` is impossible if they're different types); Builder constructs; Value Objects enforce semantic type safety

---

*Part 18 · Builder Pattern — Common in Spring Configs · Full Stack Interview Guide · Hruday D · 2026*
