# Method-Level Security — @PreAuthorize, @Secured
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Method-level security puts security checks directly on service/controller methods — a second defence layer beyond URL-level rules in the filter chain
- Requires `@EnableMethodSecurity` on your `@Configuration` class — without it, `@PreAuthorize` is silently ignored (no error!)
- `@PreAuthorize` → checks BEFORE the method runs using SpEL (Spring Expression Language); use for input-based access checks
- `@PostAuthorize` → checks AFTER the method returns; evaluate `returnObject` to check ownership of loaded data
- `@PostFilter` → filters a returned collection — removes elements the caller cannot access
- `@Secured` → older, simpler, no SpEL — just a list of allowed role strings; use only when no dynamic conditions needed

---

## 1. One-Line Definition
Method-level security adds authorization checks directly on Java methods via annotations — so access control is enforced at the service layer, independent of which URL or API triggered the code.

---

## 2. The Problem It Solves

URL-level security protects endpoints by path pattern. But what if the same service method is called from two different controllers, or from a scheduled job, or from another service? URL-level rules only guard the HTTP entry point — they do not protect the service layer itself.

Concrete failure: you protect `POST /api/admin/export-users` with `hasRole("ADMIN")` in the security config. A developer adds a scheduled task that calls `userService.exportAllUsers()` directly — bypassing the HTTP layer and all URL-level rules entirely. Admin-only data is now exported by a background job that runs without any authentication context.

Method-level security with `@PreAuthorize("hasRole('ADMIN')")` on `userService.exportAllUsers()` catches this. The annotation fires regardless of how the method was called — HTTP request, scheduled job, or internal service call. The security check is co-located with the code it protects.

The second benefit: fine-grained access inside a service. A single service might have methods at different security levels: `viewOrder()` for any authenticated user, `approveOrder()` for managers only, `deleteOrder()` for admins only. URL patterns alone cannot express this cleanly — method annotations can.

---

## 3. How It Works Internally

### The Mental Model
Think of method-level security as a security guard standing at the door of a specific room (the method), not just the building entrance (the URL). Even if you somehow sneak past the building's front desk, the room has its own guard. The guard checks your badge (roles) and sometimes checks the room's guest list (the resource's owner) before letting you in.

The "guard" is Spring AOP (Aspect-Oriented Programming) — a proxy that wraps your service beans. Every `@PreAuthorize` call is an advice that runs before your method body executes.

### The Mechanism — Step by Step

1. **`@EnableMethodSecurity` activates the AOP proxy registration** — Spring registers a `MethodSecurityInterceptor` (AOP advice) that wraps every bean with security annotations
2. **Method call arrives** — e.g., `orderService.approveOrder(orderId)`
3. **AOP proxy intercepts the call** before the actual method runs
4. **`@PreAuthorize` evaluation**: the SpEL expression (e.g., `"hasRole('MANAGER')"`) is evaluated against the current `SecurityContextHolder.getAuthentication()` and the method arguments
5. **Access granted** → proxy calls the real method → method runs → returns result
6. **`@PostAuthorize` evaluation** (if present): SpEL evaluated against the return value (`returnObject`) and the authentication
7. **`@PostFilter` evaluation** (if present): each element in the returned collection is evaluated — elements that fail the expression are removed from the collection
8. **Access denied at any point** → `AccessDeniedException` thrown → propagates to `ExceptionTranslationFilter` → 403 Forbidden

### SpEL Context Variables Available in Annotations

| Variable | What it is |
|----------|-----------|
| `authentication` | The current `Authentication` object |
| `authentication.name` | The username of the logged-in user |
| `authentication.principal` | The full `UserDetails` object |
| `authentication.authorities` | The user's roles as a collection |
| `#paramName` | A method parameter by name |
| `returnObject` | The return value (only in `@PostAuthorize` / `@PostFilter`) |
| `@beanName` | Any Spring bean accessible from the context |

### Important: The Self-Invocation Trap

Method-level security uses AOP proxies — the proxy wraps the bean. When a method inside the SAME class calls another annotated method directly (self-invocation), it bypasses the proxy entirely. The annotation has no effect.

```java
// TRAP: self-invocation bypasses the proxy
@Service
public class OrderService {

    public void processOrder(Long orderId) {
        deleteOrder(orderId); // DANGER: calls internal method directly — proxy not involved
                              // @PreAuthorize on deleteOrder() does NOT fire
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void deleteOrder(Long orderId) { ... }
}

// FIX: inject self-reference (looks odd but works) OR move to a separate service
@Service
public class OrderService {
    @Autowired
    private OrderService self; // inject the proxy version, not 'this'

    public void processOrder(Long orderId) {
        self.deleteOrder(orderId); // goes through the proxy → @PreAuthorize fires
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void deleteOrder(Long orderId) { ... }
}
```

### ASCII Diagram

```
Client calls: orderService.approveOrder(42L)
       │
       ▼
Spring AOP Proxy (wraps OrderService)
   ┌─────────────────────────────────────────┐
   │ @PreAuthorize("hasRole('MANAGER')       │
   │   or hasRole('ADMIN')")                 │
   │                                         │
   │ Evaluates SpEL against SecurityContext: │
   │ authentication.getAuthorities()         │
   │ contains ROLE_MANAGER? YES ✅           │
   └──────────────┬──────────────────────────┘
                  │ Access granted
                  ▼
   Real OrderService.approveOrder() executes
                  │
                  ▼
   Returns: approvedOrder
   ┌─────────────────────────────────────────┐
   │ @PostAuthorize("returnObject.orgId ==   │
   │   #currentUser.orgId")  ← if present   │
   │ Validates return value ownership        │
   └──────────────┬──────────────────────────┘
                  │
                  ▼
   approvedOrder returned to caller

─────────────────────────────────────────────
If authentication has only ROLE_USER:
   @PreAuthorize check fails ❌
   AccessDeniedException thrown
   → 403 Forbidden to HTTP caller
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Security annotations without @EnableMethodSecurity — silently does nothing
@Configuration
@EnableWebSecurity
// MISSING: @EnableMethodSecurity ← without this, all method annotations are ignored
public class SecurityConfig {
    // ... security config
}

@Service
public class ReportService {
    @PreAuthorize("hasRole('ADMIN')") // ← ignored silently — no error, no 403, just open access
    public byte[] generateFullReport() {
        return reportGenerator.generateAll(); // anyone can call this
    }
}
```
> **Why this fails in production:** The annotation compiles fine. No warning is shown. The method runs without any security check. The entire method-level security layer is silently disabled. This is one of the most common Spring Security mistakes that leaks data in production.

### Right Way — Full @PreAuthorize / @PostAuthorize / @PostFilter Setup
```java
// Configuration — enable method-level security
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(
    prePostEnabled = true,  // enables @PreAuthorize and @PostAuthorize (default: true in Spring Security 6)
    securedEnabled = true,  // enables @Secured (default: false — opt in explicitly)
    jsr250Enabled = true    // enables @RolesAllowed from JSR-250 (default: false)
)
public class SecurityConfig {
    // ... rest of the filter chain config
}
```

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // ─── @PreAuthorize — single role ──────────────────────────────────────────
    @PreAuthorize("hasRole('ADMIN')")
    public List<Order> getAllOrdersForAllUsers() {
        return orderRepository.findAll();
    }

    // ─── @PreAuthorize — multiple roles with OR ───────────────────────────────
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public Order approveOrder(Long orderId) {
        Order order = findById(orderId);
        order.setStatus(OrderStatus.APPROVED);
        return orderRepository.save(order);
    }

    // ─── @PreAuthorize — ownership check (ABAC pattern) ──────────────────────
    // authentication.name = the username of the logged-in user
    // #username = the method parameter named 'username'
    @PreAuthorize("hasRole('ADMIN') or authentication.name == #username")
    public List<Order> getOrdersByUser(String username) {
        return orderRepository.findByUsername(username);
    }

    // ─── @PreAuthorize with a custom Spring bean call ────────────────────────
    // @orderSecurity refers to the 'orderSecurity' bean in the Spring context
    // Complex logic lives in the bean — keeps SpEL expressions readable
    @PreAuthorize("hasRole('ADMIN') or @orderSecurity.isOwner(#orderId, authentication.name)")
    public Order getOrder(Long orderId) {
        return findById(orderId);
    }

    // ─── @PostAuthorize — check ownership AFTER loading from DB ───────────────
    // Use when you need to load the resource to check who owns it
    // returnObject = what the method returned
    @PostAuthorize("returnObject.ownerUsername == authentication.name or hasRole('ADMIN')")
    public Order getOrderForEdit(Long orderId) {
        return findById(orderId); // loads first, then checks ownership of loaded object
    }

    // ─── @PostFilter — filter results based on caller's access ───────────────
    // filterObject = each element in the returned list
    // Removes elements the caller cannot access — rather than throwing an exception
    @PostFilter("filterObject.ownerUsername == authentication.name or hasRole('ADMIN')")
    public List<Order> getMyOrders() {
        return orderRepository.findAll(); // returns all, then Spring filters to caller's orders
        // NOTE: @PostFilter loads ALL rows from DB then filters in memory
        // Better for small datasets — for large datasets, filter in the query using SecurityContext
    }

    // ─── @Secured — older API, no SpEL, just role strings ────────────────────
    @Secured("ROLE_ADMIN") // Note: MUST include ROLE_ prefix — @Secured does NOT prepend it
    public void deleteOrder(Long orderId) {
        orderRepository.deleteById(orderId);
    }

    private Order findById(Long orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
    }
}
```

```java
// Custom security bean for complex authorization logic
@Component("orderSecurity")
public class OrderSecurityService {

    private final OrderRepository orderRepository;

    public OrderSecurityService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public boolean isOwner(Long orderId, String username) {
        return orderRepository.existsByIdAndOwnerUsername(orderId, username);
        // Uses a single EXISTS query — more efficient than loading the whole entity
    }

    // Can combine multiple conditions
    public boolean canModify(Long orderId, String username, Collection<? extends GrantedAuthority> authorities) {
        boolean isAdmin = authorities.stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isAdmin) return true;

        return orderRepository.existsByIdAndOwnerUsernameAndStatus(
            orderId, username, OrderStatus.PENDING);
        // Only the owner can modify their own PENDING orders
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between @PreAuthorize and @Secured?"

**Hruday's answer:**
> Both restrict who can call a method, but they differ in power and flexibility.
>
> `@Secured` is the older, simpler annotation. It accepts a list of role strings: `@Secured("ROLE_ADMIN")`. No dynamic conditions, no SpEL, no method argument access. If you just need a static role check, it works fine. But you must include the full `ROLE_` prefix yourself — unlike `hasRole()`, `@Secured` does not prepend it.
>
> `@PreAuthorize` is the modern replacement. It uses SpEL (Spring Expression Language), which lets you write any expression: `"hasRole('ADMIN') or #userId == authentication.name"`. You can reference method arguments with `#paramName`, access the current user via `authentication.name`, call custom Spring beans via `@beanName`, and combine conditions with `and`, `or`, `not`.
>
> The practical rule: use `@PreAuthorize` for everything new. Use `@Secured` only in legacy code that's not worth migrating. The extra power of SpEL rarely adds complexity in simple cases — `@PreAuthorize("hasRole('ADMIN')")` is just as readable as `@Secured("ROLE_ADMIN")` — but it opens the door to dynamic conditions without switching annotations.
>
> Critical: both need `@EnableMethodSecurity` to work. Without it, they are silently ignored.

---

### Q2 — Deep Dive
**Interviewer asks:** "When would you use @PostAuthorize instead of @PreAuthorize?"

**Hruday's answer:**
> `@PostAuthorize` is for situations where you cannot make the access decision until after you have loaded the resource.
>
> Classic example: `getOrderById(Long orderId)`. You want only the order's owner (or an admin) to see it. But you do not know who owns the order until you load it from the database. With `@PreAuthorize`, you only have the orderId — not the owner. You would need an extra DB query inside the SpEL expression to check ownership before the main query runs.
>
> `@PostAuthorize` loads the order first, returns it as `returnObject`, and THEN evaluates: `"returnObject.ownerUsername == authentication.name or hasRole('ADMIN')"`. If the check fails, it throws `AccessDeniedException` even though the method already ran.
>
> The trade-off: the method executed, the DB was queried. The resource was loaded. The user just cannot see it. This is slightly less efficient than blocking before the query — but it is the only way to check resource ownership without a pre-query.
>
> For very large or expensive operations, I prefer the custom bean approach in `@PreAuthorize`: call a lightweight `orderRepository.existsByIdAndOwner()` query that returns a boolean — one fast EXISTS query vs loading the full entity. This gives you pre-execution checking with ownership awareness.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Should you put security annotations on controllers or on services?"

**Hruday's answer:**
> Services — strongly prefer services over controllers.
>
> Security on controllers only protects the HTTP entry point. If the same logic is called from a scheduled job, a message queue listener, a Kafka consumer, or another service method — the controller annotation never fires. The service method runs without any security check.
>
> Services are the heart of your business logic. Protecting them directly means the security check applies regardless of how the method is invoked. It is defence-in-depth — security at the place that matters most.
>
> There is one exception: controller-level annotations work well for endpoint-specific authorization that truly only makes sense in the HTTP context — like rate limiting by role or checking the HTTP method alongside the role. But even then, the primary security rule belongs on the service.
>
> A practical pattern I use: URL-level rules in `SecurityFilterChain` for broad access control (public vs authenticated paths). `@PreAuthorize` on service methods for fine-grained logic (ownership, specific role requirements). This gives two independent layers — if one has a bug, the other catches it.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "A senior manager can approve orders up to ₹1 lakh. A director can approve unlimited. How would you implement this with Spring Security?"

**Hruday's answer:**
> This is an approval limit policy — not expressible with simple role checks alone. It requires combining the user's role with a runtime value (the order amount).
>
> The `@PreAuthorize` SpEL with a custom security bean handles this cleanly:
>
> ```java
> @PreAuthorize("@approvalPolicy.canApprove(#orderId, authentication.name)")
> public Order approveOrder(Long orderId) { ... }
> ```
>
> The `approvalPolicy` bean loads the order's amount, loads the user's approval limit from their profile, and returns true or false:
>
> ```java
> @Component("approvalPolicy")
> public class ApprovalPolicyService {
>     public boolean canApprove(Long orderId, String username) {
>         BigDecimal orderAmount = orderRepository.getAmountById(orderId);
>         BigDecimal userLimit = userRepository.getApprovalLimitByUsername(username);
>         return orderAmount.compareTo(userLimit) <= 0;
>     }
> }
> ```
>
> This is the right pattern because the logic lives in a regular Spring bean — fully testable with unit tests, no SpEL parsing complexity. The annotation stays readable: `@approvalPolicy.canApprove(#orderId, authentication.name)`.
>
> I would also add a database-level check: the `Order` status is only set to APPROVED in a single method that runs this check — no way for another code path to approve an order bypassing the limit. Defence in depth.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "`@PreAuthorize` on a private method" | "Add the annotation to the private helper method" | "AOP proxies only intercept PUBLIC method calls from OUTSIDE the bean. Annotations on private or package-private methods are silently ignored. Put `@PreAuthorize` only on public methods called from outside the class. For private logic that needs security, extract it to a separate public method on a different Spring bean." |
| "Self-invocation security bypass" | "Doesn't matter — it's the same class" | "If `methodA()` calls `this.methodB()` directly, it bypasses the proxy entirely. `@PreAuthorize` on `methodB()` will NOT fire. This is the most common security bypass in Spring AOP-based security. Solution: inject the bean's proxy reference (`@Autowired private MyService self;`) and call `self.methodB()`, or extract methodB to a different bean." |
| "@PostFilter is always safe" | "Filter the list after loading — correct approach" | "`@PostFilter` loads ALL records from the database, THEN removes the ones the user cannot see. For a table with 1 million rows, this loads 1 million rows into memory and filters in Java — performance disaster. For large datasets, filter in the query using `SecurityContextHolder.getContext().getAuthentication().getName()` directly in the repository method or with Spring Data's `@Query`." |
| "No need for method security if URL is protected" | "URL rules in the filter chain are enough" | "URL patterns protect HTTP entry points. Internal calls (scheduled tasks, Kafka listeners, inter-service calls via Spring context) bypass the filter chain completely. Method-level security is the only protection for service logic regardless of invocation source." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we had Java service classes shared between an HTTP REST API and a batch processing job. The REST API had URL-level security. But the batch job called the same service methods directly — completely bypassing the filter chain. When we added `@PreAuthorize` on the service methods, the batch job started failing with AccessDeniedException because it ran without any authentication context. The fix was to use `@PreAuthorize` only on the external-facing service interface and run the batch with a programmatic authentication context. That experience taught me exactly where method-level security applies and where it does not — and how to design around its constraints."

---

## 8. Scale Evolution

**1,000 users →** Method-level security via AOP adds sub-millisecond overhead per call. Simple SpEL expressions (role checks) are compiled and cached after the first evaluation. No performance concern.

**100,000 users →** Complex SpEL expressions with DB calls (`@customBean.check()…`) add DB round-trips per request. Cache the user's permissions in Redis with a TTL equal to the access token lifetime — load once on login, check from cache on every method call. ProfileSpEL expressions that span multiple annotations — consider consolidating to fewer, simpler rules.

**10 million users →** At this scale, SpEL and AOP overhead can accumulate. Profile with a security-heavy load test. Consider externalising complex authorization policies to a dedicated service (OPA — Open Policy Agent) that evaluates policies as data, not code. This separates the policy lifecycle from the application lifecycle — policy changes without redeployment.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment approval workflows with amount limits, authoriser tiers, maker-checker patterns — exactly the scenario where `@PreAuthorize` with custom beans shines. | "How do you implement a maker-checker approval flow where different roles approve different amounts?" |
| Swiggy / Meesho | Restaurant owners can only edit their own menus. Delivery partners can only update their own status. Method-level ABAC enforcement for per-resource ownership. | "Ensure a restaurant owner cannot modify another restaurant's menu items even if they know the item ID." |
| Adobe / Microsoft | Document sharing with editor/viewer/owner roles. `@PostAuthorize` pattern for returning document metadata — checking ownership after loading. | "Walk through how @PostAuthorize works for a document get endpoint." |
| Remote / Global roles | Method-level security is a common senior Spring Security interview topic. The AOP proxy self-invocation trap is a well-known gotcha that interviewers specifically ask about. | "What is the self-invocation problem in Spring AOP? How does it affect @PreAuthorize?" |

---

## 10. Related Topics — What to Study Next

- **Topic 54 — RBAC in Spring** — method-level security is the second defense layer on top of URL-level RBAC — these two topics together form a complete access control system
- **Topic 40 — Spring AOP** — `@PreAuthorize` is implemented via Spring AOP proxies — understanding AOP concepts (proxy, self-invocation, advice, pointcut) explains why method-level security works the way it does
- **Topic 51 — Spring Security Filter Chain** — the filter chain is the first layer; method security is the second — together they give two independent checkpoints for every API call
- **Topic 44 — @Transactional Internals** — `@Transactional` has the exact same AOP proxy mechanics as `@PreAuthorize` — the self-invocation trap, proxy wrapping, and `@EnableTransactionManagement` requirement all mirror `@EnableMethodSecurity`
- **Topic 56 — REST API Design Principles** — well-designed APIs make security rules easier to express — predictable URL patterns and resource ownership conventions simplify both URL-level and method-level security configuration

---

*Part 3 · Method-Level Security (@PreAuthorize, @Secured) · Full Stack Interview Guide · Hruday D · 2026*
