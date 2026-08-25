# Mocking vs Stubbing vs Faking — When to Use Which
> Part 15 — Testing Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Test Double**: the umbrella term for anything that replaces a real dependency in a test — mock, stub, fake, spy, and dummy are all test doubles (Gerard Meszaros coined this in "xUnit Test Patterns")
- **Stub**: pre-programmed to return specific values for specific calls; you DON'T verify it was called; `when(repo.findById(1L)).thenReturn(Optional.of(product))` is a stub — it just returns data; used when you need the dependency to provide data, not to assert behaviour
- **Mock**: pre-programmed AND you verify interactions afterward; `verify(kafkaTemplate, times(1)).send("orders.created", event)` is a mock assertion — you check it was called the right way; used when the CALL ITSELF is what you're testing (sending an event, logging, calling an external API)
- **Fake**: a real, working lightweight implementation that substitutes for the real thing; an in-memory repository (`Map<Long, Order>`) instead of a real JPA repository; an H2 in-memory database instead of Postgres; fakes are real code but simplified; used when you want real behaviour without real infrastructure cost
- **Spy**: wraps a REAL object, lets most calls through to the real implementation, but records interactions; `@Spy` in Mockito; useful when you want to test a partially real object with one method overridden
- **Dummy**: passed to satisfy a parameter but never used in the test; `null` or a no-op object; when a method requires a `Logger` parameter you don't care about testing

---

## 1. One-Line Definition
Mocks, stubs, and fakes are different kinds of test doubles that replace real dependencies in tests, each with a different purpose: stubs provide data, mocks verify calls, and fakes provide lightweight real implementations.

---

## 2. The Problem It Solves

Tests that interact with real databases, real message queues, and real external APIs are slow, flaky, and require complex setup. A test that sends a real email, charges a real credit card, or writes to a real S3 bucket would be catastrophic.

Test doubles replace these real dependencies with controlled alternatives. The choice of which type to use controls what the test actually proves and what it costs to write and maintain.

Using the wrong type leads to real problems:
- Too many mocks: tests become a record of "which methods were called" rather than "what the system does"; these tests break when implementation changes even when behaviour is unchanged ("testing the contract with yourself")
- No fakes: tests miss real integration behaviour that only a DB or real implementation would catch
- Stubs when mocks are needed: missing a `verify()` call means a critical side effect (sending an email, publishing a Kafka event) is never verified; it could stop working and no test would fail

---

## 3. How It Works Internally

### The Five Test Double Types

```
1. DUMMY
   ──────
   Definition: An object passed but never used
   When: A method parameter is required but irrelevant to the test
   
   void sendEmail(String to, String subject, Logger logger) { ... }
   
   // logger is required but we don't care about logging in this test
   sendEmail("user@example.com", "Welcome", null);
   // or: Logger dummyLogger = mock(Logger.class);  // never verify it
   
──────────────────────────────────────────────────────

2. STUB
   ──────
   Definition: Returns pre-set data; never verified
   When: The dependency provides INPUT to the unit under test
   
   when(productRepository.findById(1L))
       .thenReturn(Optional.of(new Product(1L, "Laptop", BigDecimal.valueOf(999))));
   
   // productRepository is a STUB — it feeds data into the method being tested
   // You don't care that findById() was called, you need it to return data
   // Never verify(productRepository) in a stub scenario
   
──────────────────────────────────────────────────────

3. MOCK
   ──────
   Definition: Records calls AND is verified at the end
   When: The call TO the dependency is the behaviour being tested
   
   kafkaTemplate.send("orders.created", event);
   // ...
   verify(kafkaTemplate, times(1)).send(eq("orders.created"), any(OrderEvent.class));
   
   // kafkaTemplate is a MOCK — publishing the event IS the behaviour
   // You need to verify it was called (and called correctly)
   // Stub without verify would let a missing publish go unnoticed
   
──────────────────────────────────────────────────────

4. FAKE
   ──────
   Definition: A real, working but simplified implementation
   When: You want real behaviour without real infrastructure
   
   // Instead of mocking ProductRepository, use an in-memory fake:
   class FakeProductRepository implements ProductRepository {
       private final Map<Long, Product> store = new HashMap<>();
       
       @Override
       public Product save(Product p) {
           store.put(p.getId(), p);
           return p;
       }
       @Override
       public Optional<Product> findById(Long id) {
           return Optional.ofNullable(store.get(id));
       }
   }
   
   // A fake is more durable than a mock: doesn't break on refactoring
   // Tests feel more like real behaviour because the logic actually executes
   // Common fakes: H2 in-memory DB, in-memory message queue, 
   //               WireMock (fake HTTP server), GreenMail (fake email server)
   
──────────────────────────────────────────────────────

5. SPY
   ──────
   Definition: Wraps a real object; calls pass through; interactions recorded
   When: You want mostly real behaviour with one or two methods overridden
   
   @Spy
   NotificationService notificationService = new NotificationService();
   doNothing().when(notificationService).sendExternalEmail(any());
   // Real NotificationService, but suppress the external email call
   // Other methods run for real; only the network-touching part is stubbed
```

### Decision Tree — Which Type to Use

```
"What is this dependency's role in the test?"
            ↓
Is it just satisfying a parameter? (not used in assertions or verification)
  → DUMMY

Does it provide INPUT data the unit under test needs?
  → STUB (when().thenReturn())
  
Is the CALL to this dependency the behaviour being tested?
  → MOCK (+ verify())
  
Do you need REAL logic from the dependency, but lighter than production?
  → FAKE (in-memory implementation or TestContainers)
  
Do you need the REAL object but want to override ONE method?
  → SPY (@Spy + doReturn())
```

---

## 4. The Code

### Wrong Way — Mocking When a Fake Would Be Better

```java
// ❌ WRONG — over-mocking a repository when a fake gives better coverage

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    
    @Mock OrderRepository orderRepository;
    @InjectMocks OrderService orderService;
    
    @Test
    void createOrder_shouldReturnOrderWithCorrectStatus() {
        OrderRequest request = new OrderRequest(List.of(1L, 2L), "user-123");
        
        // ❌ Mock just records calls and returns what we tell it
        // This doesn't test that your JPA entity mapping is correct
        // It doesn't test that your @PrePersist sets the correct default status
        // It doesn't test that your @NotNull constraint works
        when(orderRepository.save(any(Order.class)))
            .thenReturn(new Order(99L, "PENDING", Instant.now()));
        
        OrderResponse result = orderService.createOrder(request);
        
        assertThat(result.getStatus()).isEqualTo("PENDING");
        // ← This test passes even if your actual DB would save "pending" (lowercase) 
        //   or NULL due to a wrong @Column default
        // The mock bypasses every real persistence behaviour
    }
}
```

```java
// ❌ WRONG — using a stub where a mock is needed (missing the verify)

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    
    @Mock EmailClient emailClient;
    @InjectMocks OrderConfirmationService orderConfirmationService;
    
    @Test
    void processOrder_shouldSendConfirmationEmail() {
        Order confirmedOrder = new Order(1L, "CONFIRMED", "user@example.com");
        
        // ❌ Setting up the stub is fine, but there's no verify
        when(emailClient.send(any())).thenReturn(true);
        
        orderConfirmationService.processOrder(confirmedOrder);
        
        assertThat(confirmedOrder.getStatus()).isEqualTo("CONFIRMED");
        
        // ❌ The test passes even if emailClient.send() is NEVER called
        // Email sending stopped working? Test still green. Silent bug.
        // When the call ITSELF is the behaviour, you MUST verify it
    }
}
```

### Right Way — Each Double Used Correctly

```java
// ✅ RIGHT — stub for data, mock for side effects, verify for critical calls

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    
    @Mock OrderRepository orderRepository;       // stub for data retrieval
    @Mock KafkaTemplate<String, Object> kafka;   // mock — call will be verified
    @Mock InventoryService inventoryService;     // stub — just provides stock data
    @InjectMocks OrderService orderService;
    
    @Test
    void createOrder_shouldPersistOrderAndPublishEvent() {
        // Given
        OrderRequest request = new OrderRequest(List.of(1L, 2L), "user-123");
        
        // ✅ STUB: repository provides data; we don't care it was called, only what it returned
        when(inventoryService.isInStock(1L)).thenReturn(true);
        when(inventoryService.isInStock(2L)).thenReturn(true);
        
        Order savedOrder = new Order(99L, "PENDING", "user-123");
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);
        
        // When
        OrderResponse result = orderService.createOrder(request);
        
        // Then: assert the output
        assertThat(result.getOrderId()).isEqualTo(99L);
        assertThat(result.getStatus()).isEqualTo("PROCESSING");
        
        // ✅ MOCK: verify Kafka was called — the event publish IS the behaviour
        // If this verify is removed, a missing event publish would not be caught
        verify(kafka, times(1)).send(
            eq("orders.created"),
            argThat(event -> ((OrderCreatedEvent) event).getOrderId().equals(99L))
        );
        
        // ✅ MOCK: verify save was called with the right entity state
        verify(orderRepository, times(1)).save(
            argThat(order -> order.getUserId().equals("user-123"))
        );
        
        // ✅ NOTE: inventoryService.isInStock() is a stub — no verify needed
        // We don't care THAT it was called; we care WHAT it returned (true)
        // Verifying stubs adds noise and breaks on implementation changes
    }
    
    @Test
    void createOrder_shouldThrow_whenItemIsOutOfStock() {
        // ✅ STUB for the failure path
        when(inventoryService.isInStock(1L)).thenReturn(false);
        
        // Assert the exception
        assertThatThrownBy(() ->
            orderService.createOrder(new OrderRequest(List.of(1L), "user-123")))
            .isInstanceOf(ItemOutOfStockException.class)
            .hasMessageContaining("Item 1 is not available");
        
        // ✅ Verify that save and kafka.send were NEVER called when out of stock
        verifyNoInteractions(orderRepository, kafka);
    }
}
```

```java
// ✅ RIGHT — Fake for testing logic that NEEDS real repository behaviour

// FakeOrderRepository: a real, working in-memory implementation
class FakeOrderRepository implements OrderRepository {
    
    private final Map<Long, Order> store = new ConcurrentHashMap<>();
    private final AtomicLong idSequence = new AtomicLong(1);
    
    @Override
    public Order save(Order order) {
        if (order.getId() == null) {
            order = order.toBuilder().id(idSequence.getAndIncrement()).build();
        }
        store.put(order.getId(), order);
        return order;
    }
    
    @Override
    public Optional<Order> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }
    
    @Override
    public List<Order> findByUserId(String userId) {
        return store.values().stream()
            .filter(o -> userId.equals(o.getUserId()))
            .toList();
    }
    
    public void clear() { store.clear(); }  // test utility method
}

// Test using the fake:
class OrderQueryServiceTest {
    
    // ✅ Fake: real behaviour, no DB
    private final FakeOrderRepository repo = new FakeOrderRepository();
    private final OrderQueryService queryService = new OrderQueryService(repo);
    
    @BeforeEach
    void setup() {
        repo.clear();
        // Seed test data directly into the fake — fast, deterministic
        repo.save(new Order(null, "CONFIRMED", "user-A"));
        repo.save(new Order(null, "PROCESSING", "user-A"));
        repo.save(new Order(null, "CONFIRMED", "user-B"));
    }
    
    @Test
    void getUserOrders_shouldReturnOnlyRequestingUserOrders() {
        List<OrderSummary> result = queryService.getOrdersForUser("user-A");
        
        assertThat(result).hasSize(2);
        assertThat(result).extracting(OrderSummary::getUserId)
            .containsOnly("user-A");
        // ← Tests REAL findByUserId filtering — not a mock that returns a hardcoded list
    }
}
```

```typescript
// ✅ TypeScript: jest.fn() as stub vs jest.fn() + expect(fn).toHaveBeenCalledWith()

// ✅ STUB — just provides return value, no verification
const mockApiClient = {
    getProducts: jest.fn().mockResolvedValue([
        { id: 1, name: 'Laptop', price: 999 }
    ])
};

// ✅ MOCK — return value + verified call
const mockAnalytics = {
    track: jest.fn()  // no preset return needed — void function
};

// In test:
await productService.loadAndTrackProducts('laptops');

// ✅ Verify the mock was called correctly (analytics IS the behaviour to verify)
expect(mockAnalytics.track).toHaveBeenCalledWith('products_loaded', {
    category: 'laptops',
    count: 1
});

// apiClient.getProducts is a stub — no .toHaveBeenCalled() needed
// We care what it returned, not that it was called
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between a mock and a stub?"

**Hruday's answer:**
> The core difference is verification.
>
> A stub is a pre-programmed replacement that returns data when called. In Mockito: `when(repository.findById(1L)).thenReturn(Optional.of(product))`. I'm setting up the repository to return a product when asked. I don't verify that `findById` was actually called — I just need the dependency to provide data so my unit under test can proceed. If the test never calls the repository, that's fine — the stub just sits there unused.
>
> A mock is a pre-programmed replacement where I also verify how it was called at the end of the test. In Mockito: `verify(kafkaTemplate, times(1)).send("orders.created", event)`. I'm asserting that the code called `kafkaTemplate.send()` exactly once with the right arguments. The call itself IS the behaviour being tested. If the code never calls `send()` — meaning the event was never published — the verification fails and the test correctly catches the bug.
>
> The practical rule: use stubs when the dependency provides INPUT to the code. Use mocks when the CALL to the dependency is the important output or side effect. In an order creation flow, the product repository is a stub (it provides product data), while the Kafka template is a mock (publishing the event is what we're proving works).

---

### Q2 — Deep Dive
**Interviewer asks:** "When would you use a Fake instead of a Mock? What's the advantage?"

**Hruday's answer:**
> I use a fake when I need real execution behaviour rather than just a recorded call.
>
> The classic case is a repository. Mocking a repository means pre-programming exact return values: `when(repo.findByStatus("PENDING")).thenReturn(mockList)`. This test passes as long as your code calls the right method. But it won't catch: a wrong SQL query in your `@Query` annotation, an incorrect JPA mapping, a missing `@Transactional` on a state transition, or a constraint violation in your schema. A mock bypasses all of that.
>
> A fake repository — an in-memory HashMap implementation of the same interface — runs real logic. When you call `repo.save(order)`, it actually stores the order. When you call `repo.findByStatus("PENDING")`, it actually filters the stored orders. If your `findByUserId` logic is wrong, the fake catches it. Same interface, real behaviour, no database.
>
> The tradeoff: fakes require upfront effort to write (a full interface implementation), and they might drift from the real repository's behaviour as the real one evolves. You have to maintain the fake. For simple repositories, the maintenance cost is low. For complex repositories with 20 methods, a fake becomes burdensome — TestContainers with a real database is often a better choice for integration tests.
>
> I reach for fakes most often for domain services (pure business logic, no infrastructure) and small repository interfaces with < 8 methods. For the full persistence layer, TestContainers gives the same confidence without the maintenance.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Is it wrong to over-mock? What are the consequences?"

**Hruday's answer:**
> Yes, over-mocking is a real problem with two significant consequences.
>
> First, tests become documentation of the implementation, not the behaviour. A test that verifies `verify(repository, times(1)).save(any())` is saying "the code calls save once". This test breaks any time you change HOW the code saves (maybe you batch saves now, or use `saveAll()`), even when the functional behaviour is unchanged. The test is coupled to the implementation rather than the output. These tests are expensive to maintain and give false signals — they fail on good refactors.
>
> Second, mocks create a false sense of confidence. When you mock the database and the email service and the Kafka template, your test is running in an entirely fake world. The real Postgres schema might reject a field length. The real Kafka serializer might fail on a field type mismatch. The real email regex might reject an edge case format. All of these would be caught by integration tests or fakes that run with more real components — mocks hide them.
>
> The balance I try to maintain: mock (and verify) side effects and critical call-based behaviour (event publishing, external API calls, audit logging). Stub data sources. Use fakes or TestContainers for persistence and integration scenarios. The test should feel like it's testing the system's behaviour from the outside, not supervising its internal method calls.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Testing an email notification service that sends emails when orders ship. How do you test it without sending real emails?"

**Hruday's answer:**
> Three approaches depending on what I'm testing.
>
> For unit tests of the notification assembly logic (building the right email subject, recipient, template variables), I stub the email client and assert the assembled `EmailMessage` object. I don't need to "send" anything — I verify that `emailClient.send(emailMessage)` would be called with the right `EmailMessage` content. This is a mock pattern: `verify(emailClient).send(argThat(msg -> msg.getSubject().contains("Your order has shipped")))`.
>
> For integration tests of the notification service wired to the email adapter, I use GreenMail — a fake SMTP server that runs in-memory during tests. The notification service sends to `smtp://localhost:3025` (GreenMail), and the test retrieves the email from GreenMail's inbox and asserts the content. This is a fake: real email-sending code path, no real SMTP server.
>
> For E2E flow tests (order confirmed → notification service picks up Kafka event → email sent), GreenMail is again the right choice for the email side. The test publishes a `OrderShippedEvent`, waits for the consumer to process it, then queries GreenMail to verify an email arrived with the right recipient and subject.
>
> What I never do: connect to a real SMTP server in tests (calls real mail service, creates real test email noise, fails without network), or mock the email sending at the HTTP level in an E2E test (too much mock for a flow that should be real-ish).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Mockito mocks = integration tests" | "I mock the database in my service test — that's an integration test" | Mocking the database creates a pure unit test in a fake world; the word "integration" means using real components connected together; a `@DataJpaTest` with H2 is an integration test; a Mockito-mocked `Repository` is a unit test regardless of how many layers it covers; calling a Mockito test an integration test leads to false confidence — the real integration (SQL queries, entity mapping, constraint behaviour) is never tested |
| "Always verify every mock interaction" | "I always add verify() after every when() to be thorough" | Verifying stubs adds noise and creates false negatives; if you set up `when(userRepo.findByEmail(email)).thenReturn(user)` and then `verify(userRepo).findByEmail(email)` at the end, your test will fail if the implementation changes to call `findById(userId)` instead — even if the test's actual assertions still pass; only verify mocks where the CALL is the behaviour; don't verify stubs where the return value is the behaviour; verifying both doubles the breakage surface of every test |
| "Mocks are faster than fakes" | "I use mocks everywhere because they're faster" | Mockito mock creation is fast, but fakes are often faster to USE in the long run because they require no `when().thenReturn()` setup; a fake `InMemoryRepository` that just stores in a Map requires zero `when()` calls for any test using it; the setup is done once in the fake implementation and reused across every test; for tests with many `when().thenReturn()` chains, a fake eliminates dozens of lines of setup boilerplate and makes the test more readable |

---

## 7. Hruday's Real Experience Hook
> "The Oracle codebase I worked on had a strict 85% coverage requirement. Most tests used Mockito everywhere — repositories, services, email clients. The coverage was there, but twice we had production incidents where: (1) an email stopped being sent (the mock always returned 'true' regardless), and (2) a JPA query returned wrong results (the mock bypassed the actual SQL entirely).
>
> After the second incident, we added a rule: for any side effect that must happen (event publishing, email sending, audit logging) — always use a mock with `verify()`. For persistence, use `@DataJpaTest` with H2 for real SQL execution. Mocks are for external API calls and side effects; fakes/real DBs are for data access.
>
> The immediate result: two pre-existing bugs were caught in the first week of adding `verify()` calls to the notification tests — events that should have been published were silently skipped because the stub had hardcoded `thenReturn(true)` which masked the actual call path."

---

## 8. Scale Evolution

**1,000 users →** Mockito stubs and mocks for service tests; H2 `@DataJpaTest` for repository tests; manual fake implementations for complex domain behaviour; GreenMail for email tests; simple and clear.

**100,000 users →** shared fake implementations in a `test-utils` module used across services; WireMock for external API fakes (payment gateway, shipping provider); contract tests replacing some mocks between microservices (Pact).

**10 million users →** TestContainers replacing H2 for true database compatibility testing (Postgres-specific features: JSONB, trigrams, lateral joins); Toxiproxy (fake slow/unreliable network) for testing resilience; API sandbox accounts from payment providers (Stripe test mode, Razorpay sandbox) replacing WireMock for the most critical external interactions.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment side effects that MUST happen (webhook fires, ledger entries, settlement events) — mocks with verify() for every critical publish; real persistence layers tested with TestContainers | Using verify() for financial side effects; fake vs mock choice for payment operations |
| Swiggy / Meesho | Third-party integrations (SMS gateway, push notification service, delivery partner API) — WireMock or fake implementations so tests don't depend on external service availability | WireMock for HTTP fakes; verify() for critical external calls; fake repositories for domain tests |
| Adobe / Microsoft | Document processing APIs, Azure Service Bus integration — fake message queues in tests; WireMock for cloud service calls; contract testing between internal services | Test double sophistication; contract tests between service boundaries |
| SAP Labs | Oracle story: mock bypass caused missed emails and wrong queries; added verify() and @DataJpaTest; direct experience with real consequences of over-mocking | Specific incident stories; distinction between stub (data) and mock (side effect); practical rules for each |

---

## 10. Related Topics — What to Study Next

- **Topic 259 — Mocking with Mockito** — the practical Java implementation of everything in this topic; `@Mock`, `@Spy`, `@InjectMocks`, `verify()`, `ArgumentCaptor`, `doReturn()` — all of the specific Mockito APIs that apply each type correctly
- **Topic 258 — Spring Boot Unit Testing** — `@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest` decompose the Spring context and each implies a different mix of test doubles; understanding which test type uses fakes vs real components is essential
- **Topic 260 — TestContainers** — the production-quality answer to "use a real database in tests"; TestContainers replaces H2 fakes with actual Postgres, Redis, or Kafka Docker containers; removes the gap between test environment and production environment
- **Topic 249 — Unit vs Integration vs E2E** — each test level uses test doubles differently; unit tests use mostly stubs and mocks; integration tests should use fewer mocks and more fakes or real components; E2E tests use no doubles for the application layer (they test the whole real system)

---

*Part 15 · Mocking vs Stubbing vs Faking — When to Use Which · Full Stack Interview Guide · Hruday D · 2026*
