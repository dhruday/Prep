# Role-Based Access Control (RBAC) in Spring
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **RBAC** = Role-Based Access Control — users are assigned roles, roles control what each user can access; simpler and more maintainable than per-user permissions
- Spring Security expresses roles as `GrantedAuthority` objects — `ROLE_ADMIN`, `ROLE_USER` — stored in the `Authentication` object in `SecurityContextHolder`
- Two enforcement layers: **URL-level** (`authorizeHttpRequests` in the security config) and **method-level** (`@PreAuthorize`, `@Secured` on service methods)
- `hasRole("ADMIN")` is equivalent to `hasAuthority("ROLE_ADMIN")` — Spring auto-prepends `ROLE_` for `hasRole()`
- Common gap: confusing RBAC (roles → resources) with ABAC (attribute-based — roles + context, e.g. "user can only access their own orders")
- At SAP/Oracle: UI component visibility was already controlled by roles — backend RBAC mirrors the same role model at the API level

---

## 1. One-Line Definition
RBAC is a security model where permissions are attached to roles, and users are assigned roles — so access decisions are made by checking "what role does this user have?" rather than "what permissions does this specific user have?"

---

## 2. The Problem It Solves

Without RBAC, you end up with per-user permission tables. User A can do X, Y, Z. User B can do X only. When you have 10,000 users, managing individual permissions is impossible. When a new feature launches (new endpoint `/api/orders/export`), you must manually update every user record that should have access. One admin accidentally granted access to a regular user — the audit is painful.

RBAC solves this with roles as the middle layer. You define: `ADMIN` role can do everything. `MANAGER` role can view and approve. `USER` role can only view their own data. Assign roles to users — not permissions. When you add a new endpoint, configure it to require `MANAGER` role. All existing managers instantly get access. No DB migrations, no per-user updates.

Real failure this prevents: at Oracle, our team had a REST API where every protected endpoint manually called a `permissionService.hasPermission(userId, "feature-X")`. A new developer added an endpoint and forgot the permission check entirely — the endpoint was public. RBAC enforced via Spring Security's filter chain would have required authenticated access by default, catching this at framework level.

---

## 3. How It Works Internally

### The Mental Model
Think of RBAC like a building's door access system. Each employee has a badge (their role). The ADMIN badge opens every door. The MANAGER badge opens meeting rooms and offices. The EMPLOYEE badge opens only the main floor. When you set up a new room, you configure which badge types open it — not which specific people. The badge system (Spring Security) checks the badge at the door (endpoint) without you needing to list every individual.

### The Mechanism — Step by Step

1. **User logs in** — `UserDetailsService.loadUserByUsername()` returns a `UserDetails` object containing a list of `GrantedAuthority` (the user's roles)
2. **Authentication object created** — contains the `UserDetails` and its authorities
3. **SecurityContextHolder stores it** — available for the entire request lifecycle via `SecurityContextHolder.getContext().getAuthentication()`
4. **Request hits a protected URL** — `AuthorizationFilter` (in the filter chain) reads the authentication's authorities
5. **URL-level check** — if your config says `.requestMatchers("/api/admin/**").hasRole("ADMIN")`, Spring checks `authentication.getAuthorities()` for `ROLE_ADMIN`
6. **Method-level check** — if the service method has `@PreAuthorize("hasRole('ADMIN')")`, Spring AOP intercepts the method call and evaluates the SpEL expression against the current `Authentication`
7. **Access denied** — if the check fails, `AccessDeniedException` is thrown → `ExceptionTranslationFilter` converts it to 403 Forbidden

### Spring Security Authority Model

```
UserDetails
  └── getAuthorities() → Collection<GrantedAuthority>
        ├── "ROLE_ADMIN"       ← hasRole("ADMIN")    or hasAuthority("ROLE_ADMIN")
        ├── "ROLE_USER"        ← hasRole("USER")     or hasAuthority("ROLE_USER")
        └── "SCOPE_read:data"  ← hasAuthority("SCOPE_read:data")  [OAuth2 scopes use hasAuthority, not hasRole]
```

**`hasRole()` vs `hasAuthority()`:**
- `hasRole("ADMIN")` checks for authority `"ROLE_ADMIN"` — Spring prepends `"ROLE_"` automatically
- `hasAuthority("ROLE_ADMIN")` checks for the exact string — no prefix added
- For OAuth2 scopes, always use `hasAuthority("SCOPE_read:data")` — scopes do not use the `ROLE_` prefix

### Authority Storage Options

**Option 1 — Hardcoded roles in DB:**
```sql
CREATE TABLE user_roles (user_id BIGINT, role VARCHAR(50));
INSERT INTO user_roles VALUES (1, 'ROLE_ADMIN'), (1, 'ROLE_USER'), (2, 'ROLE_USER');
```

**Option 2 — Roles in JWT claims (stateless):**
```json
{
  "sub": "user123",
  "roles": ["ROLE_ADMIN", "ROLE_USER"],
  "exp": 1700003600
}
```

**Option 3 — Roles from external IdP (Keycloak/Okta):**
```json
{
  "realm_access": {
    "roles": ["admin", "offline_access"]
  }
}
```
Requires a custom `JwtAuthenticationConverter` (as shown in Topic 53).

### ASCII Diagram

```
HTTP Request: GET /api/admin/users
       │
       ▼
JwtAuthenticationFilter
  Reads token → extracts claims:
  {"sub": "hruday", "roles": ["ROLE_ADMIN"]}
  Sets SecurityContext.Authentication
       │
       ▼
AuthorizationFilter
  Checks: requestMatchers("/api/admin/**").hasRole("ADMIN")
  Checks authentication.getAuthorities() for "ROLE_ADMIN"
  Found ✅ → continue
       │
       ▼
AdminController.getAllUsers()
  @PreAuthorize("hasRole('ADMIN')") ← second check (method level)
  AOP interceptor evaluates SpEL → ROLE_ADMIN found ✅
       │
       ▼
  Service logic executes
  Returns 200 with user list

─────────────────────────────────────────────
HTTP Request: GET /api/admin/users
  Authentication roles: ["ROLE_USER"]
       │
       ▼
AuthorizationFilter
  Checks for "ROLE_ADMIN" — not found ❌
  Throws AccessDeniedException
       │
       ▼
ExceptionTranslationFilter
  Returns 403 Forbidden
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Manual role checks inside every controller method
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @GetMapping("/users")
    public List<User> getAllUsers(Authentication authentication) {
        // DANGER 1: Manual role check inside controller — easy to forget on new endpoints
        // DANGER 2: Duplicated logic — every admin endpoint repeats this check
        // DANGER 3: If this controller has 10 endpoints, all 10 need this check individually
        boolean isAdmin = authentication.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        
        return userService.getAllUsers(); // actual work — buried after security boilerplate
    }
}
```
> **Why this fails in production:** Manual checks are forgotten on some endpoints. New developers do not know to add the check. The `ROLE_` prefix check is often written incorrectly. There is no single place to change the role requirement if the business rule changes — you update 10 places instead of one.

### Right Way — URL-Level RBAC in Security Config
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // ← enables @PreAuthorize, @PostAuthorize, @Secured on methods
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth

                // ─── Public endpoints — no authentication needed ───────────────
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()

                // ─── User endpoints — any authenticated user ──────────────────
                .requestMatchers("/api/users/me/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/orders/**").hasAnyRole("USER", "MANAGER", "ADMIN")

                // ─── Manager endpoints ─────────────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/orders/*/approve").hasRole("MANAGER")

                // ─── Admin-only endpoints ──────────────────────────────────────
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // ─── Default: everything else requires authentication ──────────
                .anyRequest().authenticated()

                // NOTE: Order matters! More specific matchers go first.
                // Spring evaluates top-to-bottom and stops at the first match.
            );

        return http.build();
    }
}
```

### Right Way — Method-Level RBAC with @PreAuthorize
```java
@Service
public class OrderService {

    // ─── Simple role check ────────────────────────────────────────────────────
    @PreAuthorize("hasRole('ADMIN')")
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    // ─── Multiple roles allowed ───────────────────────────────────────────────
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public Order approveOrder(Long orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        order.setStatus(OrderStatus.APPROVED);
        return orderRepository.save(order);
    }

    // ─── SpEL with authentication object — ABAC-style ownership check ─────────
    // #orderId is a method parameter; authentication.name is the logged-in username
    @PreAuthorize("hasRole('ADMIN') or @orderSecurityService.isOwner(#orderId, authentication.name)")
    public Order getOrder(Long orderId) {
        return orderRepository.findById(orderId).orElseThrow();
    }

    // ─── @PostAuthorize — check AFTER method executes (inspect return value) ──
    // Useful when you need to load the resource to check ownership
    @PostAuthorize("returnObject.username == authentication.name or hasRole('ADMIN')")
    public UserProfile getUserProfile(Long userId) {
        return userRepository.findById(userId).orElseThrow();
    }
}
```

```java
// Custom security service for complex authorization logic
// Keeps SpEL expressions short; puts business logic in a Spring bean
@Service("orderSecurityService")
public class OrderSecurityService {

    private final OrderRepository orderRepository;

    public OrderSecurityService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // Called from @PreAuthorize SpEL: @orderSecurityService.isOwner(#orderId, authentication.name)
    public boolean isOwner(Long orderId, String username) {
        return orderRepository.findById(orderId)
            .map(order -> order.getOwnerUsername().equals(username))
            .orElse(false);
    }
}
```

```java
// Entity — storing roles efficiently
@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;
    private String password;

    // Store roles as an enum set — cleaner than a join table for small role counts
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    private Set<Role> roles = new HashSet<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Convert Role enum to GrantedAuthority strings
        return roles.stream()
            .map(role -> new SimpleGrantedAuthority(role.name())) // e.g., "ROLE_ADMIN"
            .toList();
    }

    // ... other UserDetails methods (getPassword, getUsername, isEnabled etc.)
}

public enum Role {
    ROLE_USER, ROLE_MANAGER, ROLE_ADMIN
    // Convention: prefix with ROLE_ so hasRole() works correctly
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How do you implement role-based access control in Spring Boot?"

**Hruday's answer:**
> I implement RBAC in Spring Security at two layers — URL level and method level.
>
> At the URL level, in the `SecurityFilterChain` bean, I use `authorizeHttpRequests()` to define which roles can access which path patterns. For example: `.requestMatchers("/api/admin/**").hasRole("ADMIN")`. Spring's `AuthorizationFilter` enforces this before the request reaches any controller.
>
> At the method level, I enable `@EnableMethodSecurity` on the configuration class and use `@PreAuthorize` on service methods. This gives me precision — I can require `ROLE_MANAGER` for just the approve-order method, not for the entire order service.
>
> Roles come from the `UserDetails.getAuthorities()` method — loaded from the database when the user logs in, or extracted from JWT claims for stateless APIs. Spring stores them in `SecurityContextHolder` for the duration of the request.
>
> The key rule: URL-level rules protect endpoints broadly. Method-level rules handle fine-grained decisions — like "admin can access all orders, but a regular user can only access their own orders." I use both together, not one or the other.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the difference between `hasRole()` and `hasAuthority()` in Spring Security?"

**Hruday's answer:**
> The difference is the `ROLE_` prefix.
>
> `hasRole("ADMIN")` checks for the authority string `"ROLE_ADMIN"`. Spring Security automatically prepends `"ROLE_"` when you use `hasRole()`. So `hasRole("ADMIN")` and `hasAuthority("ROLE_ADMIN")` are equivalent — they check for the exact same string.
>
> `hasAuthority("ROLE_ADMIN")` checks the exact string you provide, no prefix added.
>
> Why does this matter? When you load user roles from the database and store them as `ROLE_ADMIN` (the convention — prefix included), use `hasRole("ADMIN")` in your security config. If you accidentally use `hasAuthority("ADMIN")` instead, it looks for `"ADMIN"` — without the prefix — and the check fails for every user even if they have `ROLE_ADMIN`. This causes a silent 403 bug that's confusing to debug.
>
> For OAuth2 scopes, use `hasAuthority("SCOPE_read:data")` — scopes don't follow the `ROLE_` convention. Spring's resource server stores them with the `SCOPE_` prefix.
>
> The safest practice: use `hasRole()` for roles (stored as `ROLE_X`), use `hasAuthority()` for permissions and scopes (stored verbatim). Keep the naming consistent in your DB and you will never confuse them.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When is RBAC not enough and you need ABAC? Give a concrete example."

**Hruday's answer:**
> RBAC is not enough when access depends on a relationship between the user and the specific resource, not just the user's role.
>
> Concrete example: An order management system. `ROLE_USER` can view orders. Fine — URL-level `hasRole("USER")` on `GET /api/orders/{id}` works. But the real rule is: users can only view their OWN orders, not other users' orders. A `ROLE_USER` user should NOT be able to call `GET /api/orders/999` if that order belongs to someone else.
>
> RBAC alone cannot express "user can access resources they own" — that is not a role property, it is a relationship between the user and the data. This is ABAC — Attribute-Based Access Control. The decision considers: the user's role (ROLE_USER), the resource attribute (order.ownerId), and the request context (is authentication.userId == order.ownerId?).
>
> In Spring Security, I use `@PreAuthorize` with SpEL and a custom security service: `@PreAuthorize("hasRole('ADMIN') or @orderSecurity.isOwner(#orderId, authentication.name)")`. The admin bypasses the ownership check; the regular user must own the resource.
>
> For very complex ABAC policies, a dedicated policy engine (OPA — Open Policy Agent) is a better fit than inline SpEL expressions.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the access control model for a multi-tenant SaaS platform where users belong to organisations, and admins of one organisation must not see data from another organisation."

**Hruday's answer:**
> This is a classic multi-tenant RBAC + data isolation problem.
>
> First, the role model. Roles exist within the context of an organisation: `ORG_ADMIN`, `ORG_MEMBER`, `PLATFORM_ADMIN` (your own staff). A user can be an admin in Org A and a member in Org B — a many-to-many relationship between users, organisations, and roles.
>
> Schema: `user_org_roles (user_id, org_id, role)`. When loading `UserDetails`, load the user's roles for the specific tenant context of the current request.
>
> The tenant isolation layer: every API request includes a tenant identifier — either in the JWT claims (`"orgId": "org-123"`) or a subdomain (`org123.myapp.com`). A filter extracts the `orgId` and stores it in `ThreadLocal` (a TenantContext). Every repository query automatically applies `WHERE org_id = :currentTenantId` via a Hibernate filter or query interceptor.
>
> The `@PreAuthorize` on the service checks both role and tenant: `@PreAuthorize("hasAuthority('ORG_ADMIN') and @tenantSecurity.belongsToCurrentTenant(#orgId)")`.
>
> The hardest part is ensuring the data layer NEVER leaks cross-tenant data. I enforce this with a Hibernate `@Filter` that adds `org_id = ?` to all queries — not optional, not per-service. It fires at the ORM level. Even if a developer writes a query wrong, the filter ensures they only see their tenant's data.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use `@Secured` for everything" | "`@Secured` is fine — simple and built-in" | "`@Secured` only accepts role names as strings — no SpEL, no dynamic conditions. `@PreAuthorize` uses SpEL so you can write `hasRole('ADMIN') or #userId == authentication.name`. Use `@PreAuthorize` unless you specifically need the simplest possible static role check and want no SpEL dependency." |
| "URL-level security is enough" | "Just configure the filter chain — no need for method-level" | "URL patterns can be bypassed by slight URL variations (trailing slashes, URL encoding). Method-level security is defence-in-depth — it runs INSIDE the application, not at the URL routing layer. Critical business operations (payment approval, user deletion) should have method-level security as a second layer. If the URL matcher has a bug, the method annotation still protects the code." |
| "`@EnableMethodSecurity` is automatic" | "Just add `@PreAuthorize` and it works" | "`@PreAuthorize` only works if `@EnableMethodSecurity` is on a `@Configuration` class. Without it, the annotation is silently ignored — no error, just no security check. This is a silent failure — tests pass, endpoints appear protected, but `@PreAuthorize` does nothing." |
| "Store roles as booleans in the user table" | "`is_admin = true` column is simpler" | "Boolean columns are a trap. When you need a 3rd role (MANAGER), you add another boolean column. Then a 4th. Then business logic requires combining roles. A proper `user_roles` table or `Set<Role>` on the entity scales to any number of roles with no schema changes." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, our Angular component library showed or hid UI elements based on the user's role — admin panel, approval buttons, report exports. The role information came from the backend API's JWT claims. When I transitioned to building the backend at Oracle, I recognised the same role model I had worked with on the frontend — `ROLE_ADMIN`, `ROLE_USER` — and wired it directly into Spring Security's `authorizeHttpRequests`. The symmetry between frontend role-based UI rendering and backend role-based API access is something I now design explicitly: one source of truth for roles, consistent enforcement at every layer."

---

## 8. Scale Evolution

**1,000 users →** Roles loaded from the DB on login, stored in the JWT. `AuthorizationFilter` checks roles per request with no DB round-trip. Fully stateless and fast.

**100,000 users →** Role assignments change (user promoted to manager). If roles are baked into long-lived JWTs, the user doesn't see the new role until their token expires. Solution: short access token TTL (15 min) or a role-change event that triggers re-login. For very dynamic roles, use token introspection or add a roles-version claim to the JWT and invalidate on change.

**10 million users →** RBAC at this scale often requires hierarchical roles (ADMIN inherits all MANAGER permissions, MANAGER inherits all USER permissions) to keep config manageable. Spring Security supports role hierarchies via `RoleHierarchy` bean. Multi-tenant SaaS at this scale requires row-level security at the database level (PostgreSQL RLS) in addition to application-level RBAC — the DB enforces isolation even if the application has a bug.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Multi-tier user roles: merchant, finance team, support agent. Strict permission boundaries between roles — a support agent cannot initiate refunds, only view transactions. | "How do you prevent a support agent role from calling the refund API without a supervisor's approval?" |
| Swiggy / Meesho | Customer, delivery partner, restaurant manager, platform admin all use the same backend. Different roles, different scopes of access. | "A delivery partner should only update their OWN delivery status. How do you enforce this?" |
| Adobe / Microsoft | Enterprise software requires granular RBAC — document owner, editor, viewer, admin. Group-based roles synced from Active Directory. | "How do you implement document-level permissions in a collaborative editing platform?" |
| Remote / Global roles | RBAC is a standard interview topic for any backend role. Interviewers expect fluency with both URL-level and method-level Spring Security configuration. | "Implement role-based access in a Spring Boot REST API." |

---

## 10. Related Topics — What to Study Next

- **Topic 55 — Method-Level Security (@PreAuthorize, @Secured)** — the `@PreAuthorize` usage shown here is covered in much more depth in Topic 55 — SpEL expressions, `@PostAuthorize`, and `@PostFilter`
- **Topic 51 — Spring Security Filter Chain** — URL-level RBAC (`authorizeHttpRequests`) is configured as part of the filter chain — understanding the chain explains why the order of `requestMatchers` rules matters
- **Topic 52 — JWT Authentication End-to-End** — roles must be included as claims in the JWT to be available for RBAC in stateless APIs — the JWT generation must include the `roles` claim
- **Topic 53 — OAuth 2.0 + OIDC** — external identity providers (Keycloak, Okta) map their roles to Spring Security authorities via a custom `JwtAuthenticationConverter` — RBAC and OAuth2 integrate here
- **Topic 10 — Security: Broken Access Control (OWASP #1)** — OWASP ranks broken access control as the #1 web security risk — missing `@PreAuthorize`, wrong URL patterns, and IDOR (insecure direct object reference) are all broken access control — RBAC is the primary defence

---

*Part 3 · Role-Based Access Control (RBAC) · Full Stack Interview Guide · Hruday D · 2026*
