# 200. Writing Testable Code

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Testable code** is code written with the explicit goal of being easily verified through automated tests. Testability is not just a testing concern — it is a **design quality signal**. Code that is hard to test is almost always poorly designed: tightly coupled, not cohesive, or hiding dependencies.

**What it is:**
- Code structured so individual units can be tested in isolation
- Design that makes dependencies explicit and injectable
- Code that avoids global state, hidden I/O, and non-determinism

**Why it exists:**
- Automated tests are the safety net for refactoring and new feature development
- Without tests, every change risks introducing regressions
- Testable code forces better design: loose coupling, single responsibility, clear interfaces

**The problem it solves:**
- Code that can only be tested by running the entire system
- Business logic buried inside HTTP handlers, DB repositories, or static utility classes
- Flaky tests caused by non-determinism (time, randomness, network calls)

**Role in large-scale distributed systems:**
- FAANG systems change constantly — without a test suite, fast releases are too risky
- Enables continuous delivery: 50+ deploys per day at Netflix, Meta, Google
- At scale, the cost of a missed regression far exceeds the cost of writing tests

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### The Test Pyramid

```
         /\
        /  \  E2E Tests (few, slow, expensive — test user journeys)
       /----\
      /      \ Integration Tests (moderate — test component interactions)
     /--------\
    /          \ Unit Tests (many, fast, cheap — test individual functions/classes)
   /____________\
```

- **Unit tests:** 70–80% of suite. One class/method in isolation, dependencies mocked.
- **Integration tests:** 15–20%. Real interactions between layers (service + DB, controller + service).
- **E2E tests:** 5–10%. Full user flows in a production-like environment.

Inverting the pyramid → Ice Cream Cone Anti-Pattern (mostly E2E) → slow, brittle, expensive suite.

---

### Principle 1: Dependency Injection

The most impactful practice for testability. If a class creates its own dependencies, they can't be replaced with test doubles.

```java
// ❌ Untestable — creates its own dependency
public class OrderService {
    private final EmailService emailService = new EmailService(); // hardcoded

    public void placeOrder(Order order) {
        emailService.sendConfirmation(order); // can't mock in unit test
    }
}

// ✅ Testable — dependency injected
public class OrderService {
    private final EmailService emailService;

    public OrderService(EmailService emailService) {
        this.emailService = emailService;
    }

    public void placeOrder(Order order) {
        emailService.sendConfirmation(order);
    }
}

// In test:
EmailService mockEmailService = mock(EmailService.class);
OrderService service = new OrderService(mockEmailService);
service.placeOrder(testOrder);
verify(mockEmailService).sendConfirmation(testOrder);
```

---

### Principle 2: Separate Business Logic from I/O

Push I/O (DB reads/writes, HTTP calls, file system) to the boundaries of the system. Business logic in the center is pure — deterministic functions with no side effects.

```
❌ Business logic mixed with I/O:
OrderService.placeOrder():
  → reads user from DB
  → reads inventory from DB
  → calculatePrice (business logic)     ← hard to test in isolation
  → writes order to DB
  → calls payment API

✅ Hexagonal Architecture (Ports & Adapters):
OrderService.placeOrder(user, inventory, orderRequest):
  → calculatePrice(user, inventory)     ← pure, testable in isolation
  → validates order                     ← pure, testable
  → returns OrderResult                 ← caller handles I/O

I/O handled in adapters (repositories, gateways) — tested with integration tests
```

---

### Principle 3: Avoid Static State and Singletons

Static state makes tests order-dependent and hard to isolate.

```java
// ❌ Static state — test pollution between test runs
public class ConfigManager {
    private static Map<String, String> config = new HashMap<>();
    public static void set(String key, String val) { config.put(key, val); }
}

// ✅ Instance managed by DI container — scoped and replaceable
@Component
public class ConfigManager {
    private final Map<String, String> config;
    public ConfigManager(Map<String, String> config) { this.config = config; }
}
```

---

### Principle 4: Control Time and Randomness

Non-deterministic inputs make tests flaky.

```java
// ❌ Hard to test — depends on real clock
public boolean isExpired(Token token) {
    return Instant.now().isAfter(token.getExpiresAt());
}

// ✅ Inject a Clock — control time in tests
public boolean isExpired(Token token, Clock clock) {
    return clock.instant().isAfter(token.getExpiresAt());
}

// In test:
Clock fixedClock = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);
assertTrue(tokenChecker.isExpired(expiredToken, fixedClock));
```

---

### Principle 5: Tell, Don't Ask

Methods that receive their data (rather than pulling it) are easy to test.

```java
// ❌ Hard to test — pulls from 4 different places
public double calculateOrderCost(Long userId, Long cartId) {
    User user = userRepository.findById(userId);
    Cart cart = cartRepository.findById(cartId);
    TaxRate tax = taxService.getRateForCountry(user.getCountry());
    return /* calculation */;
}

// ✅ Testable — all data passed in; only business logic here
public double calculateOrderCost(User user, Cart cart, TaxRate tax) {
    return /* pure calculation */;
}
```

---

### Test Double Types

| Type | Description | Use When |
|---|---|---|
| **Stub** | Returns predefined data | Need to control indirect input to the SUT |
| **Mock** | Verifies that specific calls were made | Need to verify interactions/side effects |
| **Fake** | Working but simplified implementation | Need real-enough impl without real infra (in-memory DB) |
| **Spy** | Wraps real object, observes calls | Test a method that calls another in the same class |
| **Dummy** | Placeholder, not actually used | Fill parameter list when value doesn't matter |

---

### Test Naming Conventions

```java
// ❌ Vague names
@Test void test1() { ... }
@Test void shouldWork() { ... }

// ✅ Given / When / Then
@Test
void givenPremiumUser_whenPlacingLargeOrder_thenApplies15PercentDiscount() { ... }

// Or: method_state_expectedBehavior
@Test
void calculateDiscount_premiumUserWithOrderOver1000_returns15Percent() { ... }
```

---

### FIRST Principles for Tests

| Letter | Principle | Meaning |
|---|---|---|
| **F** | Fast | Unit tests in milliseconds; suite in seconds |
| **I** | Independent | Tests don't share state; order doesn't matter |
| **R** | Repeatable | Same result every run, any environment |
| **S** | Self-validating | Pass or fail — no manual inspection needed |
| **T** | Timely | Written just before or alongside production code |

---

### Spring Boot Test Layers

```java
@SpringBootTest     // loads full application context — integration test
@WebMvcTest         // loads only web layer — fast controller test
@DataJpaTest        // loads only JPA layer — fast repository test
@MockBean           // replaces a Spring bean with a Mockito mock
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

- **Fast unit tests:** 1,000 unit tests should run in < 10 seconds
- **Slow test suites** reduce CI/CD throughput: a 45-minute PR validation → deployment frequency drops
- **Flaky tests** cost ~10–30 minutes of engineer investigation per failure — eliminate systematically

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

**Testable data access layers:**
```java
// ✅ Repository abstraction — unit-testable with fakes
public interface UserRepository {
    Optional<User> findById(long id);
    User save(User user);
}

// Production:   JpaUserRepository implements UserRepository
// Unit test:    FakeUserRepository implements UserRepository (in-memory HashMap)
// Integration:  Testcontainers (real Postgres in a Docker container)
```

**Testcontainers** for integration tests: containerized Postgres/MySQL instance that is isolated and discarded after the test.

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- A fast, comprehensive test suite is the primary enabler of continuous delivery at scale
- Test coverage on failure paths (retry, timeout, circuit breaker) validates resilience behavior
- **Contract testing (Pact):** Consumer-driven contracts verify that API contracts between microservices aren't broken — without requiring a full integration environment
- Chaos annotations (Resilience4j) verify degradation behavior automatically

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- Security logic (auth, authorization, encryption) must have the highest test coverage
- Test both positive paths (authorized user can access) AND negative paths (unauthorized user is rejected)
- Fuzz testing for API inputs: validate how the system handles malformed, extreme, or hostile input
- OWASP ZAP and DAST tools integrated into CI/CD pipelines as automated security tests

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Google's Testing Policy
- Google formally classifies: small (unit), medium (integration), large (E2E)
- Small tests must NOT access the network, disk, or sleep — enforced by policy
- This classification ensures the test pyramid is maintained by organizational standards

### Netflix's Contract Tests
- Netflix uses Pact (consumer-driven contract tests) to decouple microservice integration testing
- Tests run in under 5 minutes rather than a full 30-minute integration suite
- Combined with Chaos Monkey, entire failure modes are exercised automatically

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "Testable code and good design are the same thing. I push I/O to the system boundary so business logic is pure and testable without infrastructure. Constructor injection everywhere — if a class creates its own dependencies, you can't replace them in tests. Inject `Clock` for time, inject interfaces for all external dependencies. In Spring: `@WebMvcTest` for controller tests, `@DataJpaTest` for repository tests, mock everything else at the unit level. The test pyramid: lots of fast unit tests for business logic, integration tests for infrastructure, minimal E2E tests."

### Common Follow-Up Questions

1. **"What's the difference between a mock and a stub?"** → A stub returns predefined data (controls input). A mock verifies behavior (asserts interactions). Both are test doubles.
2. **"How do you test private methods?"** → You generally don't. If a private method needs its own test, it should be extracted into a collaborating class.
3. **"What do you do when legacy code has no tests?"** → Write characterization tests first: capture current behavior without changing it. Then add tests for the specific change. Then refactor.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Hexagonal Architecture for Testability

```
                  ┌─────────────────────┐
HTTP Request ────►│ Controller (Adapter)│
                  └────────┬────────────┘
                           │
                  ┌────────▼────────────┐
                  │ Application         │◄── Unit tests: pure logic, no I/O
                  │ (Domain Logic)      │
                  └────────┬────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
  ┌───────▼──────┐ ┌───────▼──────┐ ┌──────▼───────┐
  │ DB Repo      │ │ Email Sender │ │ Payment API  │
  │ (Adapter)    │ │ (Adapter)    │ │ (Adapter)    │
  └──────────────┘ └──────────────┘ └──────────────┘
       ▲                   ▲                ▲
       └─── mocked in unit tests ──────────┘
     real adapters used in integration tests
```

### Test Execution Time Targets
```
Unit tests:        1,000 tests → < 10 seconds
Integration tests: 200 tests  → < 2 minutes
E2E tests:         20 tests   → < 10 minutes
Total CI (with parallelism):  < 15 minutes
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

**Why testable code matters:**
- Automated tests are the only scalable way to verify correct behavior across 50+ deploys per day
- Testability is a design quality indicator — hard-to-test code signals tight coupling and mixed concerns
- A good test suite turns refactoring from high-risk to routine

**How it works:**
- Inject dependencies — never hard-wire I/O
- Keep business logic pure — no I/O in domain models
- Control non-determinism — inject Clock, randomness source
- Follow the test pyramid — many unit tests, few E2E tests

**Key trade-offs:**
- 100% coverage vs. pragmatism — 80% coverage in critical paths is minimum; 100% is gold-plating
- Unit tests vs. integration tests — unit tests are fast but can miss real wiring; integration tests catch real contracts
- TDD vs. test-after — TDD produces cleaner designs; test-after is acceptable with discipline
