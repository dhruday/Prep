# Unit vs Integration vs E2E Testing — When to Use Which
> Part 15 — Testing Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Unit test**: tests one function or component in total isolation; all dependencies are mocked/stubbed; fast (milliseconds); no I/O; tells you "this code does what I expect it to do"
- **Integration test**: tests how two or more real pieces work together; some dependencies are real (real DB via TestContainers, real Spring context, real HTTP layer); slower (seconds); tells you "these parts connect correctly"
- **E2E test**: drives a real browser through a real running app; everything is real (frontend + backend + database); slowest (tens of seconds per test); tells you "the user can complete this task"
- **When to write which**: unit for pure logic (sorting, calculation, validation, mappers), integration for service-to-DB and controller-to-service wiring, E2E for the 5–8 critical user journeys (login, checkout, search, key CRUD flow)
- **The ratio**: 70% unit, 20% integration, 10% E2E — NOT because E2E is bad but because it's slowest to write, slowest to run, and most brittle (fails on DOM change, network flake, timing); invest most confidence at the unit level because fixes there are cheapest
- **What changes the ratio**: for a CRUD-heavy API service with minimal logic, the unit/integration split flips closer to 30/60 because there is no "logic" to unit-test independently — the interesting behaviour IS the integration
- ✅ **Hruday's anchor**: Oracle India — 85% test coverage; the Oracle team tracked this as a KPI; the suite had a large E2E ratio (~40%), which made the suite slow (12 minutes), brittle (failed on flaky third-party stubs), and expensive to maintain after each UI refactor; the lesson: coverage number alone is misleading without the right distribution of test types

---

## 1. One-Line Definition
Unit, integration, and E2E tests form a hierarchy where each level increases real-world confidence but also increases cost (write time, run time, maintenance, brittleness) — the skill is choosing the right level for each test based on what it's proving.

---

## 2. The Problem It Solves

Teams without a clear testing strategy end up in one of two failure modes.

**Too many E2E tests**: the CI suite takes 40 minutes, flakes 3 times a week on timing issues, and developers stop trusting it ("it fails sometimes, just re-run it"). When the suite is slow and unreliable, developers batch changes and run tests less often. Bugs slip through because the feedback loop is too long.

**Too many unit tests with no integration tests**: every function has a unit test, coverage is at 95%, but the system fails in production because the unit tests mock everything — the real database query returns a different result than the mock, a real API response shape differs from the mock response, or two perfectly-tested services are wired together wrong. High unit coverage gives false confidence without integration tests.

The testing pyramid (or trophy) gives a framework for consciously distributing tests across the three levels to maximize confidence at minimum cost.

---

## 3. How It Works Internally

### The Three Levels in Detail

```
E2E Tests (Playwright / Cypress)
  - Real browser, real app, real database
  - Simulate what a real user does
  - Proof: "User can complete checkout with a Visa card ending in 4242"
  - Cost: 30-120 seconds per test; brittle; complex setup; must be maintained
  - Right for: 5–10 critical user journeys per application

Integration Tests (Spring @SpringBootTest / @WebMvcTest / React Testing Library)
  - Real Spring context OR real HTTP layer OR real DB connection
  - NOT a full browser; NOT full stack in one test
  - Proof: "OrderController returns 201 with correct JSON when given a valid request"
  - Proof: "OrderService saves to DB and publishes Kafka event"
  - Cost: 1–10 seconds per test; mostly stable; moderate maintenance
  - Right for: every controller endpoint, every service-to-DB interaction

Unit Tests (JUnit / Jest / Vitest)
  - One class or function; all dependencies mocked
  - Pure logic: no database, no HTTP, no filesystem
  - Proof: "calculateDiscount(100, 20) returns 80"
  - Proof: "ProductCard renders the sale badge when salePrice < regularPrice"
  - Cost: < 100ms per test; very stable; easy to maintain
  - Right for: all business logic, pure functions, UI component rendering logic
```

### The Testing Trophy (Kent C. Dodds)

```
              /\
             /  \
            / E2E \    ← few: 5–10 critical paths
           /________\
          /          \
         / Integration \  ← many: every wired interaction
        /______________\
       /                \
      /   Unit Tests      \  ← most: all logic and components
     /____________________\
    
    (plus: static analysis — TypeScript, ESLint — below the pyramid:
     catches bugs before you even write tests)

The "Trophy" shape (vs classic "Pyramid"):
  Integration layer is the WIDEST — for modern full stack apps
  unit tests are narrowest at the top of the base
  because React components with Testing Library blur the unit/integration line
  (you test behaviour, not implementation — often spanning component + hooks + state)
```

### Choosing the Right Level — Decision Tree

```
"What am I testing?"
        ↓
Is it pure logic? (calculation, transformation, validation, sorting)
  → UNIT TEST
  
Does it require multiple real pieces connected? 
  (service + repository, controller + service, component + store)
  → INTEGRATION TEST

Does it require a real browser and a running app?
  (user workflow, end-to-end purchase, OAuth login flow)
  → E2E TEST

"But should I mock the DB?"
  - Unit tests of a service: YES — mock the repository
  - Integration tests of a service: NO — use TestContainers with real DB
    (you're testing the INTEGRATION, mocking kills the point)
```

---

## 4. The Code

### Wrong Way — Too Many Mocks, False Coverage

```java
// ❌ WRONG — unit test that mocks everything, proves nothing useful

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    
    @Mock OrderRepository orderRepository;
    @Mock EmailService emailService;
    @Mock KafkaTemplate<String, Object> kafkaTemplate;
    @InjectMocks OrderService orderService;
    
    @Test
    void createOrder_shouldSaveAndPublishEvent() {
        // ❌ Mock setup that perfectly matches what the code does
        // This test will ALWAYS pass as long as the code calls the right mock methods
        // It does NOT prove the code works with a real DB or real Kafka
        Order expectedOrder = new Order(1L, "PENDING", BigDecimal.TEN);
        when(orderRepository.save(any())).thenReturn(expectedOrder);
        
        OrderResponse response = orderService.createOrder(new OrderRequest());
        
        // ❌ Verifying mock calls — this is testing the implementation, not behaviour
        verify(orderRepository, times(1)).save(any());
        verify(kafkaTemplate, times(1)).send(eq("orders.created"), any());
        // ← This test has 100% method coverage but zero real confidence
        // If your JPA @Query has a typo, or Kafka topic name is wrong: test still passes
    }
}
```

```typescript
// ❌ WRONG — E2E test for something a unit test should own

// Don't do this: an E2E test for pure formatting logic
test('price should display with 2 decimal places', async ({ page }) => {
    // ❌ Starting a browser to verify a number formatting function is absurd
    // Takes 30 seconds; fails if the server is down; fails on DOM changes
    await page.goto('/products/laptop-123');
    await expect(page.locator('[data-testid="price"]')).toHaveText('₹1,299.99');
    // This should be: formatPrice(1299.99) === '₹1,299.99' — unit test, 5ms
});
```

### Right Way — Test at the Right Level

```java
// ✅ UNIT TEST — pure business logic in isolation

class DiscountCalculatorTest {
    
    private final DiscountCalculator calculator = new DiscountCalculator();
    // ← No Spring context, no mocks, no dependencies — pure function test
    
    @Test
    void calculateDiscount_shouldApplyPercentageToBasePrice() {
        BigDecimal price = BigDecimal.valueOf(100.00);
        BigDecimal result = calculator.apply(price, DiscountType.PERCENTAGE, 20.0);
        assertThat(result).isEqualByComparingTo(BigDecimal.valueOf(80.00));
    }
    
    @Test
    void calculateDiscount_shouldNotGoBelowZero() {
        BigDecimal price = BigDecimal.valueOf(10.00);
        BigDecimal result = calculator.apply(price, DiscountType.PERCENTAGE, 150.0);
        assertThat(result).isEqualByComparingTo(BigDecimal.ZERO);
    }
    
    @Test
    void calculateDiscount_shouldHandleNullInput_gracefully() {
        assertThatThrownBy(() -> calculator.apply(null, DiscountType.FLAT, 10.0))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Price cannot be null");
    }
    // ← 3 tests, runs in 12ms total, proves the logic works regardless of infrastructure
}
```

```java
// ✅ INTEGRATION TEST — controller layer with real Spring HTTP + mocked DB

@WebMvcTest(OrderController.class)  // loads ONLY the web layer (controller + validation)
class OrderControllerTest {
    
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    
    @MockBean OrderService orderService;  // mock the service in WebMvcTest context
    // ← @WebMvcTest is faster than @SpringBootTest (no DB, no Kafka, no full context)
    // It's still an integration test: tests HTTP parsing, validation, response formatting
    
    @Test
    void createOrder_shouldReturn201_withOrderId_whenRequestIsValid() throws Exception {
        // Given
        OrderRequest request = new OrderRequest(List.of(1L, 2L), "user-123");
        OrderResponse response = new OrderResponse(42L, "PROCESSING");
        when(orderService.createOrder(any(OrderRequest.class))).thenReturn(response);
        
        // When + Then: test HTTP layer behaviour
        mockMvc.perform(post("/api/v1/orders")
                   .contentType(MediaType.APPLICATION_JSON)
                   .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isAccepted())           // 202 Accepted
               .andExpect(jsonPath("$.orderId").value(42))
               .andExpect(jsonPath("$.status").value("PROCESSING"));
    }
    
    @Test
    void createOrder_shouldReturn400_whenItemIdsIsEmpty() throws Exception {
        // ← Tests @Valid annotation + constraint validation integration (Spring MVC + Jackson)
        OrderRequest invalidRequest = new OrderRequest(List.of(), "user-123");
        
        mockMvc.perform(post("/api/v1/orders")
                   .contentType(MediaType.APPLICATION_JSON)
                   .content(objectMapper.writeValueAsString(invalidRequest)))
               .andExpect(status().isBadRequest())
               .andExpect(jsonPath("$.errors[0].field").value("itemIds"));
    }
}
```

```typescript
// ✅ INTEGRATION TEST (frontend) — component + hooks + context together

// React Testing Library blurs unit/integration — tests BEHAVIOUR not implementation
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from './ProductCard';
import { CartProvider } from '../context/CartContext';

test('Add to Cart button shows confirmation when product is added', async () => {
    const user = userEvent.setup();
    const product = { id: 1, name: 'Laptop', price: 1299.99, inStock: true };
    
    render(
        <CartProvider>  {/* real context, not mocked */}
            <ProductCard product={product} />
        </CartProvider>
    );
    
    // User clicks the button
    await user.click(screen.getByRole('button', { name: /add to cart/i }));
    
    // Assert: UI state changes
    await waitFor(() => {
        expect(screen.getByText(/added to cart/i)).toBeInTheDocument();
    });
    // ← Tests: component renders + event handler + context state update + UI feedback
    // All real. Implementation detail (how Cart stores state) is NOT tested.
});
```

```typescript
// ✅ E2E TEST — only for critical user journey (Playwright)

// tests/e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('User can complete checkout with a valid card', async ({ page }) => {
    // ← Full browser, real app, real API, real DB (test environment)
    
    await page.goto('/');
    await page.getByRole('link', { name: /laptops/i }).click();
    await page.getByText('MacBook Air M3').first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    await page.getByRole('link', { name: /checkout/i }).click();
    
    await page.getByLabel(/card number/i).fill('4242424242424242');
    await page.getByLabel(/expiry/i).fill('12/26');
    await page.getByLabel(/cvv/i).fill('123');
    await page.getByRole('button', { name: /place order/i }).click();
    
    await expect(page.getByText(/order confirmed/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/order #/i)).toBeVisible();
    // ← Proves the entire stack works end-to-end for the most critical business flow
    // Worth the 30-second run time; NOT appropriate for 200 tests
});
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the testing pyramid and why does the shape matter?"

**Hruday's answer:**
> The testing pyramid is a way to think about how many tests you should have at each level: many unit tests at the base, fewer integration tests in the middle, and very few end-to-end tests at the top.
>
> The shape matters because each level has a different cost profile. Unit tests run in milliseconds, are easy to write, and are very stable — they rarely break unless the logic changes. End-to-end tests take 30 seconds or more each, require a running app and database, and are fragile — a DOM restructure, a timing issue, or a flaky network call can fail the test for reasons unrelated to a regression. Integration tests sit in between.
>
> If you invert the pyramid — mostly E2E tests, few unit tests — you end up with a slow CI suite that takes 40 minutes, flakes on timing issues, and erodes developer trust. When the build is always red and everyone says "just re-run it", the tests stop being a safety net. The pyramid shape prevents this by ensuring most confidence comes from the cheapest tests.
>
> At Oracle India, our suite had an inverted ratio — about 40% E2E — which took 12 minutes to run and failed 2-3 times a week on flaky third-party service stubs. Refactoring toward fewer but more focused E2E tests and more integration tests reduced the suite to 4 minutes and near-zero flakes.

---

### Q2 — Deep Dive
**Interviewer asks:** "When would you choose NOT to write a unit test for a Spring Boot service method?"

**Hruday's answer:**
> When the method has no meaningful independent logic to verify — when the interesting behaviour IS the integration.
>
> A service method that calls `orderRepository.save(order)` and publishes a Kafka event has no logic to unit-test in isolation. When you mock the repository and Kafka template and verify that `save()` was called once, you're just testing that Java method dispatch works. The test will pass even if your JPA `@Query` has a SQL syntax error, even if the Kafka topic name is misspelled, even if the entity mappings are wrong.
>
> For methods like this, an integration test with TestContainers (real Postgres instance in Docker) or `@DataJpaTest` (embedded H2) is far more valuable than a unit test with mocks. You want the actual SQL to execute, the actual column mappings to be verified, and the actual constraint violations to surface.
>
> The rule I follow: write unit tests for logic (calculations, transformations, validation rules, decision trees). Write integration tests for wiring (repository calls, HTTP responses, event publishing, cross-service communication). Don't unit-test the wiring — test it at the level where it's real.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "You have a small team and limited time. You can write unit tests OR E2E tests but not both. Which do you choose?"

**Hruday's answer:**
> Integration tests — and I know that's not one of the two options, but it's the honest answer for a small team with limited time.
>
> If forced to choose strictly between unit and E2E: unit tests for a backend service, E2E for a frontend-heavy app. Here's why.
>
> For a backend service with significant business logic (discount rules, pricing, workflow transitions), unit tests give the fastest feedback loop on the core logic. The logic is the value. Get it right at the unit level.
>
> For a frontend-heavy app where the critical behaviours ARE user interactions (add to cart, checkout, login, form submission), a handful of well-written E2E tests covering the 5 most critical journeys gives confidence that users can do what matters most. Three good E2E tests on checkout, login, and product search are more valuable than 200 unit tests on utility functions.
>
> In practice, I'd never accept the either/or constraint. A small team can still write React Testing Library tests (which blur unit/integration and cover a lot at low cost) plus 3-5 Playwright E2E tests on the critical paths. That's maybe 2 days of setup and then incremental coverage per feature. The return on those first days of investment is very high.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "How would you structure the test suite for a payment checkout flow in an e-commerce app?"

**Hruday's answer:**
> Four layers, each with a clear purpose.
>
> Static analysis first: TypeScript strict mode for all payment-related components and services eliminates an entire class of bugs (wrong type passed to the payment function, missing null checks) before any test runs.
>
> Unit tests for the pure logic: price calculation, tax computation, card number validation (Luhn check), formatting functions. These run in 50ms total, never flake, and verify the core arithmetic. If there's a discount calculation bug, a unit test finds it in the developer's IDE before CI.
>
> Integration tests for the wired pieces: `@WebMvcTest` for the payment controller (does it accept the right request shape, return 202, validate all required fields?). `@DataJpaTest` with TestContainers for the order repository (does a payment-confirmed event correctly update the order status in Postgres?). `@SpringBootTest` for the full payment processing service slice.
>
> E2E for the 3 critical journeys: successful checkout with Visa, failed checkout with declined card (verify error message displays and retry is possible), checkout session timeout (verify cart is preserved and user can resume). These 3 tests run in 90 seconds total and prove the entire stack works. They don't test every edge case — edge cases belong at the unit and integration levels.
>
> What I do NOT write: an E2E test for "card number must be 16 digits" — that's a unit test. A unit test for "clicking Place Order calls the API" — that's an integration test.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Aim for 100% test coverage" | "I always aim for 100% code coverage — it ensures quality" | Coverage measures lines executed, not behaviour verified; 100% coverage is achievable with tests that call every line but assert nothing useful (or assert the wrong thing); coverage below 100% in a dependency injection setup file or a main method is completely fine; more important than the number is the DISTRIBUTION — does the coverage come from meaningful assertions about business behaviour, or from trivial passing tests that call every mock? At Oracle, 85% coverage included many tests that just verified `verify(mock, times(1)).save(any())` — meaningful lines executed but zero behaviour confirmed |
| "Unit tests with mocks = integration tests" | "I mock the database in my service tests — that's an integration test" | A test that mocks all dependencies is a UNIT test by definition; the word "integration" means testing REAL integration between components; mocking the database replaces the real integration with a fake one; if you want to test how your JPA repository actually behaves (query correctness, constraint violation handling, transaction rollback), you need a real database — use `@DataJpaTest` with H2 in-memory or TestContainers with actual Postgres; mock-based "integration tests" are actually unit tests with extra overhead |
| "E2E tests are the most valuable" | "E2E tests give the highest confidence so I prefer writing those" | E2E tests give the BROADEST confidence (if this passes, the whole stack works), but not the HIGHEST — the highest-value test for a specific bug is the test that's closest to the bug; a unit test of `calculateDiscount()` will catch a discount calculation bug in 12ms; an E2E test might also catch it, 45 seconds later, after a browser boots and navigates through 6 pages; use E2E for proof of life, unit tests for precision; E2E tests are also the hardest to maintain — every UI refactor can break them |

---

## 7. Hruday's Real Experience Hook
> "At Oracle India, our team tracked test coverage as a key metric — 85% was the target and we hit it. But the suite took 12 minutes to run and failed 2-3 times a week on unrelated flakes. The high coverage number masked a test suite that was expensive and unreliable.
>
> The root cause: too much testing at the wrong level. We had detailed E2E tests for things that should have been unit tests (form validation, price formatting), and not enough integration tests for things that actually broke (JPA query edge cases, API response schema changes).
>
> After that experience, I now always ask two questions before writing a test: what level is this, and is it the right level? If the answer is 'I'm writing an E2E test to verify a computation', that's a signal to push it down to a unit test."

---

## 8. Scale Evolution

**1,000 users →** simple test suite is fine; all three levels present; CI runs in < 5 minutes; the goal is catching regressions before deploy; test quality matters more than quantity.

**100,000 users →** CI speed matters; slow suite = batched commits = longer feedback loops = more bugs per deploy; test suite should split into fast (unit + integration) and slow (E2E) jobs; parallelise E2E tests across multiple browsers; test data management becomes important (seed data, teardown between tests).

**10 million users →** full test infrastructure: test data factories, contract tests between services (Pact), performance tests as part of CI (Lighthouse CI, k6 load tests on critical APIs), canary deploys with automated smoke tests, chaos testing to verify resilience; the 70/20/10 ratio still holds but now there are also load tests, chaos tests, and contract tests as additional categories beyond the classic three.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flows require bulletproof testing; integration tests for payment service + DB interactions; E2E for complete payment journey; safety-critical code needs test distribution thinking | Testing strategy for financial accuracy; contract tests between payment services; test data with realistic edge cases |
| Swiggy / Meesho | Rapid feature deployment cycle demands fast, reliable CI; poorly distributed test suites (too much E2E) slow deployment velocity; testing strategy directly impacts how fast the team can ship | CI speed optimization through test level distribution; component testing for React UI; @WebMvcTest for fast API tests |
| Adobe / Microsoft | Document processing, enterprise auth, large test suites; quality engineering culture with defined test standards; TypeScript static analysis as the first line of defence; contract testing between microservices | Test strategy articulation; balance of automation levels; TypeScript strict mode as static testing |
| SAP Labs | Direct: Oracle team 85% coverage, 12-min suite, 40% E2E ratio → too slow/brittle; understanding of test distribution; current SAP work applies React Testing Library for component-level integration tests + Jest for unit | Specific Oracle ratio/time numbers; types of tests written at each company; concrete fixes for slow test suites |

---

## 10. Related Topics — What to Study Next

- **Topic 250 — Testing Pyramid vs Trophy** — this topic introduces the three levels conceptually; the next topic digs into the SHAPES of the pyramid and trophy — why Kent C. Dodds argues the trophy better fits modern frontend development with React Testing Library
- **Topic 251 — Test Coverage** — coverage metrics support or undermine the testing strategy; knowing what number actually matters prevents chasing 100% at the expense of meaningful tests
- **Topic 259 — Mocking with Mockito** — the most important backend testing skill for writing correct unit and integration tests; understanding when Mockito mocks are appropriate vs when TestContainers is right
- **Topic 254 — React Testing Library** — the practical "right level" tool for frontend; RTL pushes developers to test behaviour at the integration level (component + hooks + state together) which gives better confidence than unit-testing implementation details

---

*Part 15 · Unit vs Integration vs E2E Testing · Full Stack Interview Guide · Hruday D · 2026*
