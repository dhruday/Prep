# Chain of Responsibility
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Chain of Responsibility (CoR)**: a request is passed through a chain of handlers; each handler decides to either HANDLE the request and stop, PASS it to the next handler, or both handle + pass; the sender doesn't know which handler will process it
- **vs Observer**: Observer = ALL observers notified; CoR = handlers can STOP the chain; one handler can claim the request and prevent it reaching the others
- **Classic Java examples**: servlet `Filter` chain (each filter can short-circuit); Spring Security filter chain (authentication filter can block the request before controllers run); exception handler chain (`@ExceptionHandler` hierarchy in Spring MVC); logging levels (log statement checked against each appender's level threshold)
- **Spring MVC dispatching**: `HandlerInterceptor.preHandle()` returns `boolean` — `false` stops the chain; request processing stops before the controller
- **Express.js / Angular guards**: Express middleware `next()` is "pass to next handler"; not calling `next()` stops the chain; Angular `CanActivate` guards — return `false` blocks navigation
- **Building a CoR**: each handler stores a reference to the NEXT handler; `handle()` either processes or calls `next.handle()`; the chain is assembled at application startup
- **Key interview point**: CoR makes sense when: the required handler can't be determined at compile time; the chain may need to change at runtime; multiple handlers may need to process the same request (pass-through variant)

---

## 1. One-Line Definition
Chain of Responsibility passes a request through an ordered sequence of handlers, where each handler decides independently whether to process, forward, or both — without the sender knowing which handler will ultimately respond.

---

## 2. The Problem It Solves

**Without CoR:**
```java
public void processRequest(Request req) {
    if (!authenticated(req)) { reject(req); return; }
    if (rateLimited(req)) { limit(req); return; }
    if (!authorized(req)) { forbid(req); return; }
    if (!validPayload(req)) { badRequest(req); return; }
    if (duplicateRequest(req)) { idempotencyReturn(req); return; }
    handleBusiness(req);
}
// Adding a new check: edit this method.
// Reordering checks: edit this method.
// Different API endpoints need different subsets of checks: more if-else.
```

**With CoR:** each check is a handler in the chain. Reorder by rewiring the chain. Add a check by adding a handler. Each endpoint has its own chain composed from handlers.

---

## 3. How It Works Internally

```
Client → Request
         ↓
    AuthenticationFilter
      - checks JWT
      - invalid? → reject (chain stops here)
      - valid? → next.handle(request)
         ↓
    RateLimitFilter
      - checks rate limit
      - exceeded? → 429 Too Many Requests (chain stops)
      - within limit? → next.handle(request)
         ↓
    ValidationFilter
      - validates request body
      - invalid? → 400 Bad Request (chain stops)
      - valid? → next.handle(request)
         ↓
    BusinessHandler
      - executes business logic
      - returns response
```

---

## 4. The Code

### Wrong Way — Monolithic Request Processing

```java
// ❌ NO CoR: All concerns tangled in one method / one place

@RestController
class PaymentController {
    
    @PostMapping("/payments")
    public ResponseEntity<PaymentResponse> processPayment(
            @RequestBody PaymentRequest req,
            HttpServletRequest httpReq) {
        
        // ❌ All concerns mixed: authentication, rate limit, validation, idempotency, business
        String token = httpReq.getHeader("Authorization");
        if (token == null || !jwtService.isValid(token)) {
            return ResponseEntity.status(401).build();
        }
        
        User user = jwtService.extractUser(token);
        if (rateLimiter.isExceeded(user.getId())) {
            return ResponseEntity.status(429).build();
        }
        
        if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Invalid amount"));
        }
        if (req.getCurrency() == null || req.getCurrency().length() != 3) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Invalid currency"));
        }
        
        String idempotencyKey = httpReq.getHeader("Idempotency-Key");
        if (idempotencyKey != null && idempotencyStore.exists(idempotencyKey)) {
            return ResponseEntity.ok(idempotencyStore.get(idempotencyKey));
        }
        
        // Finally: actual business logic (buried under 30 lines of cross-cutting concerns)
        PaymentResponse result = paymentService.processPayment(req, user);
        
        if (idempotencyKey != null) idempotencyStore.store(idempotencyKey, result);
        return ResponseEntity.ok(result);
    }
    // Every endpoint repeats authentication + rate limiting boilerplate
}
```

```java
// ✅ CHAIN OF RESPONSIBILITY — each concern is an isolated handler

// 1. Handler interface
public interface RequestHandler {
    void setNext(RequestHandler next);
    ResponseEntity<?> handle(RequestContext ctx);
}

// 2. Abstract base — stores next, delegates if not handled
public abstract class AbstractRequestHandler implements RequestHandler {
    private RequestHandler next;
    
    @Override
    public void setNext(RequestHandler next) { this.next = next; }
    
    protected ResponseEntity<?> passToNext(RequestContext ctx) {
        return next != null ? next.handle(ctx) : ResponseEntity.ok().build();
    }
}

// 3. Concrete handlers — each responsible for one concern

public class AuthenticationHandler extends AbstractRequestHandler {
    private final JwtService jwt;
    
    public AuthenticationHandler(JwtService jwt) { this.jwt = jwt; }
    
    @Override
    public ResponseEntity<?> handle(RequestContext ctx) {
        String token = ctx.getHeader("Authorization");
        if (token == null || !jwt.isValid(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                 .body(new ErrorResponse("Invalid or missing token"));
            // ← Chain stops here; next handler never called
        }
        ctx.setUser(jwt.extractUser(token));
        return passToNext(ctx);  // ← Valid: pass to next handler
    }
}

public class RateLimitHandler extends AbstractRequestHandler {
    private final RateLimiter rateLimiter;
    
    public RateLimitHandler(RateLimiter rateLimiter) { this.rateLimiter = rateLimiter; }
    
    @Override
    public ResponseEntity<?> handle(RequestContext ctx) {
        if (rateLimiter.isExceeded(ctx.getUser().getId())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                                 .header("Retry-After", "60")
                                 .body(new ErrorResponse("Rate limit exceeded"));
            // ← Chain stops
        }
        return passToNext(ctx);  // ← Within limit: pass to next
    }
}

public class PaymentValidationHandler extends AbstractRequestHandler {
    @Override
    public ResponseEntity<?> handle(RequestContext ctx) {
        PaymentRequest req = (PaymentRequest) ctx.getBody();
        List<String> errors = new ArrayList<>();
        
        if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) <= 0)
            errors.add("amount must be > 0");
        if (req.getCurrency() == null || !req.getCurrency().matches("[A-Z]{3}"))
            errors.add("currency must be 3-letter ISO code");
        
        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(new ValidationErrorResponse(errors));
            // ← Chain stops on validation failure
        }
        return passToNext(ctx);  // ← Valid: pass to next
    }
}

public class IdempotencyHandler extends AbstractRequestHandler {
    private final IdempotencyStore store;
    
    public IdempotencyHandler(IdempotencyStore store) { this.store = store; }
    
    @Override
    public ResponseEntity<?> handle(RequestContext ctx) {
        String key = ctx.getHeader("Idempotency-Key");
        if (key != null && store.exists(key)) {
            return ResponseEntity.ok(store.get(key));  // ← Duplicate: return cached, stop chain
        }
        ResponseEntity<?> result = passToNext(ctx);    // ← Pass to business handler
        if (key != null) store.store(key, result.getBody());
        return result;
    }
}

// 4. Business handler — pure business logic, no cross-cutting concerns
public class PaymentBusinessHandler extends AbstractRequestHandler {
    private final PaymentService paymentService;
    
    public PaymentBusinessHandler(PaymentService paymentService) {
        this.paymentService = paymentService;
    }
    
    @Override
    public ResponseEntity<?> handle(RequestContext ctx) {
        PaymentResponse result = paymentService.processPayment(
            (PaymentRequest) ctx.getBody(), ctx.getUser());
        return ResponseEntity.ok(result);
    }
}

// 5. Chain assembly in Spring configuration
@Configuration
public class PaymentChainConfig {
    
    @Bean
    public RequestHandler paymentRequestChain(
            JwtService jwt, RateLimiter rateLimiter,
            IdempotencyStore store, PaymentService paymentService) {
        
        RequestHandler auth       = new AuthenticationHandler(jwt);
        RequestHandler rateLimit  = new RateLimitHandler(rateLimiter);
        RequestHandler validation = new PaymentValidationHandler();
        RequestHandler idempotency = new IdempotencyHandler(store);
        RequestHandler business   = new PaymentBusinessHandler(paymentService);
        
        // ✅ Wiring: auth → rateLimit → validation → idempotency → business
        auth.setNext(rateLimit);
        rateLimit.setNext(validation);
        validation.setNext(idempotency);
        idempotency.setNext(business);
        
        return auth;  // ← client calls the head of the chain
    }
}

// 6. Controller — clean; delegates to chain
@RestController
class PaymentController {
    private final RequestHandler paymentChain;
    
    public PaymentController(@Qualifier("paymentRequestChain") RequestHandler chain) {
        this.paymentChain = chain;
    }
    
    @PostMapping("/payments")
    public ResponseEntity<?> processPayment(@RequestBody PaymentRequest req,
                                            HttpServletRequest httpReq) {
        RequestContext ctx = buildContext(req, httpReq);
        return paymentChain.handle(ctx);  // ← one call; chain does the rest
    }
}
```

```java
// ✅ Spring Security filter chain — CoR built into the framework

// Spring Security's SecurityFilterChain IS the Chain of Responsibility pattern
// Each filter handles or passes: UsernamePasswordAuthenticationFilter,
// BearerTokenAuthenticationFilter, ExceptionTranslationFilter, etc.

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain chain(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
        return http
            // CoR - each "step" is a handler that can stop or pass
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()          // ← short-circuit: allow
                .requestMatchers("/admin/**").hasRole("ADMIN")      // ← auth check
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            // ↑ jwtFilter is a CoR handler added to the chain
            .build();
    }
}

// Each filter in the chain:
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        String token = req.getHeader("Authorization");
        
        if (token != null && token.startsWith("Bearer ")) {
            // validate and set SecurityContext
            Authentication auth = jwtService.validate(token.substring(7));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        
        chain.doFilter(req, res);  // ← CoR: pass to next filter regardless (JwtAuthFilter is pass-through)
        // If we didn't call chain.doFilter(), the request would stop here
    }
}
```

```typescript
// ✅ TypeScript — Express middleware as Chain of Responsibility

import express, { Request, Response, NextFunction } from 'express';

const app = express();

// Each middleware = a handler in the chain
// next() = passToNext(); not calling next() = stop the chain

function authenticate(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || !isValidToken(token)) {
        return res.status(401).json({ error: 'Unauthorized' });  // stops chain
    }
    req.user = decodeToken(token);
    next();  // passes to next handler
}

function rateLimit(req: Request, res: Response, next: NextFunction) {
    if (rateLimiter.isExceeded(req.user.id)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });  // stops chain
    }
    next();
}

function validatePayment(req: Request, res: Response, next: NextFunction) {
    const { amount, currency } = req.body;
    if (!amount || amount <= 0 || !currency?.match(/^[A-Z]{3}$/)) {
        return res.status(400).json({ error: 'Invalid payment data' });  // stops chain
    }
    next();
}

// Business handler — only reached if all preceding handlers passed
async function processPayment(req: Request, res: Response) {
    const result = await paymentService.charge(req.body, req.user);
    res.json(result);
}

// Chain assembly — order of app.use / app.post arguments
app.post('/payments',
    authenticate,       // 1st
    rateLimit,          // 2nd
    validatePayment,    // 3rd
    processPayment      // 4th — business, reached only if 1-3 pass
);
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Chain of Responsibility and how is it different from Observer?"

**Hruday's answer:**
> Chain of Responsibility passes a request through an ordered sequence of handlers. Each handler can process the request and stop the chain, pass it to the next handler, or both.
>
> Observer notifies ALL registered observers when an event occurs. Every observer receives the notification.
>
> The key distinction: CoR = one handler can STOP the chain; only one (or few) handlers typically process the request. Observer = ALL observers are notified; none can stop others from being notified.
>
> The practical consequence: CoR is right when you need gating — a security filter that stops unauthorized requests from reaching the controller. Observer is right when all handlers should react — multiple services that all need to react to an order placed event.
>
> Spring Security's filter chain is CoR: an authentication filter that returns 401 prevents every subsequent filter and the controller from running. Spring `@EventListener` is Observer: all listeners receive the `OrderPlacedEvent` regardless of what any other listener does.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does Spring Security use the Chain of Responsibility pattern?"

**Hruday's answer:**
> Spring Security's `SecurityFilterChain` is a chain of `Filter` implementations, each handling one security concern.
>
> The chain is ordered: `ChannelProcessingFilter` (force HTTPS) → `SecurityContextPersistenceFilter` (load security context) → `UsernamePasswordAuthenticationFilter` or JWT filter (authenticate) → `ExceptionTranslationFilter` (translate access exceptions to HTTP responses) → `FilterSecurityInterceptor` (authorization check).
>
> Each filter either: processes the request and calls `chain.doFilter()` to pass to the next (the request continues); or writes a response and returns WITHOUT calling `chain.doFilter()` — the chain stops, the controller never runs.
>
> The authentication filter is a gate: if authentication fails, it writes 401 and returns. The controller is unreachable without passing this gate.
>
> This design means: adding new security behaviour = new filter added to the chain; no need to modify existing filters; the order in the chain determines precedence; each filter is independently testable.
>
> `OncePerRequestFilter` ensures each filter runs exactly once per request even when request forwarding happens internally — guards against double-processing in CoR.

---

### Q3 — Application
**Interviewer asks:** "When would you build a custom CoR vs using Spring's built-in mechanisms?"

**Hruday's answer:**
> I'd use Spring's built-in mechanisms first:
> - Request-level concerns (auth, rate limiting, CORS): `OncePerRequestFilter` or `HandlerInterceptor` — these are Spring's CoR infrastructure
> - Business method guards: `@PreAuthorize` (Spring Security AOP) or manual validation chains in `@Service` methods
>
> Custom CoR is justified when:
> 1. The chain is domain-specific and varies per business case — e.g., different validation chains for "instant purchase" vs "EMI purchase" vs "wallet payment" where each path has a unique sequence of handlers
> 2. The chain needs to be assembled at runtime from configuration (e.g., a dynamic rule engine where handlers are loaded from a database)
> 3. The chain processes non-HTTP events — an order processing pipeline where each handler enriches the order object before the next step
>
> The key: don't reinvent Spring's filter chain for HTTP requests. Use it. Build custom CoR when the chain is part of the domain model, not part of the HTTP infrastructure.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| CoR always stops at one handler | "In Chain of Responsibility, exactly one handler processes the request" | This is the classic GoF version, but the pass-through variant (where handlers MAY process AND pass on) is equally valid and common; Spring Security filters mostly pass through (they set context and call `chain.doFilter()`), only stopping on failure; logging middleware always processes (logs) AND passes on; the handler contract in many frameworks is "process per your concern, then pass on" — GoF's "one or the other" is too restrictive for most real systems |
| Adding handler = modifying chain | "To add a new step, I need to edit the chain assembly" | If each handler stores the next via `setNext()` and the chain is wired in a `@Configuration` class, adding a new handler means adding it to the configuration class — which is a configuration change, not a business logic change; in Spring Security you add a `.addFilterBefore()` or `.addFilterAfter()` call; in Express you add a `app.use()` call; the existing handler classes are not modified; this is OCP applied to the chain |
| CoR vs Decorator | "Chain of Responsibility looks the same as Decorator to me" | Structurally similar but intent differs: each Decorator ALWAYS adds its behaviour and delegates (no short-circuiting); CoR handlers CAN short-circuit (stop the chain); in Decorator, removing one layer changes the behaviour but the object is still valid; in CoR, stopping the chain is the CORRECT handling for certain inputs (an invalid JWT should stop the chain — that's the intended outcome, not an error in the chain); Decorator enriches; CoR gates or routes |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, the document processing pipeline — which handled customer-uploaded financial reports — had all its validation, parsing, and enrichment logic in one 400-line `DocumentProcessor` service. Format validation, size check, virus scan, customer permission check, content extraction, metadata enrichment, and database write were all in one method.
>
> When compliance required adding a new 'data classification' step between content extraction and database write, the team spent a day understanding the 400-line method before confidently inserting the step. Integration tests caught a regression in the virus scan step — unrelated to the change — because someone mis-merged a variable scope.
>
> We refactored to a CoR: 7 handler classes, each ~40-60 lines. The chain was wired in a Configuration class.
>
> When a new 'watermark injection' step was required 2 months later, the developer wrote a 45-line handler and added one line to the Configuration class. PR review: 15 minutes. Zero regressions — each handler's unit tests were independent.
>
> The pipeline became composable: the public document portal used the FULL chain; the internal batch processing portal used a shorter chain (skipped virus scan — internal documents only); the test environment used a mock chain. All from wiring different handler combinations in Configuration."

---

## 8. Scale Evolution

**1,000 users →** CoR for request pipeline: authentication → rate limiting → validation → business. Each handler independently testable. Chain rewired for different API endpoints without code changes.

**100,000 users →** Performance-aware chain ordering: put cheap-to-evaluate, high-rejection handlers FIRST (rate limit check = Redis lookup ~1ms; authentication = JWT validation ~5ms; content validation = regex ~0.5ms; DB-backed permission check = 20ms); order by cost × rejection rate; requests stopped early by cheap handlers never reach expensive later handlers.

**10 million users →** Chain at the infrastructure layer: API Gateway handles the first few CoR steps (rate limiting, authentication, TLS termination) BEFORE requests reach application servers; reduces load on application tier; service mesh adds health check, retry, and circuit breaker as CoR steps in the network plane; application CoR handles only domain-level concerns.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment API gateway: auth → device fingerprint → fraud risk → payment routing → idempotency; each step in the CoR stops or passes; different chains for different payment methods | Chain ordering by cost; different chains per endpoint |
| Swiggy / Meesho | Order placement pipeline: stock check → address validation → promo validation → price locking → payment initiation; CoR allows different chains for "express now" vs "schedule for later" | Domain-level pipeline as CoR; composable chains |
| Adobe / Microsoft | Middleware pipeline design (Express, ASP.NET, Spring MVC interceptors); Spring Security filter chain internals; "design a request processing pipeline" system design question | Spring Security CoR internals; pipeline design |
| SAP Labs | Document processing 400-line method → 7-handler CoR story (step insertion from 1 day to 2hrs; zero regressions; shorter chain for batch processing; test mock chain) | Concrete refactor improvement; composable chain variants |

---

## 10. Related Topics — What to Study Next

- **Topic 295 — Decorator Pattern** — Decorator and CoR are structurally similar but differ in short-circuit intent; understanding both and being able to explain the difference in one clear sentence is the pattern literacy signal; Decorator always enriches; CoR can gate; together they cover the two main ways to compose behaviour in a linear pipeline
- **Topic 299 — Observer Pattern** — Observer and CoR are the two patterns for "event or request with multiple handlers"; the selection rule is: should all handlers run (Observer) or should any handler be able to stop the others (CoR)? Any pipeline with gating logic is CoR; any event fanout with independent reactions is Observer
- **Topic 296 — Proxy Pattern — Spring AOP Uses This** — Spring Security's CoR filter chain and Spring AOP's proxy chain are both "pipeline" patterns; understanding how they are similar (each layer processes before/after the core logic) and different (filter chain = CoR with short-circuit; AOP proxy = Decorator around one method; different granularity) shows deep Spring architecture knowledge

---

*Part 18 · Chain of Responsibility · Full Stack Interview Guide · Hruday D · 2026*
