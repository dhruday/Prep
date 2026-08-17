# Mockito Deep Dive — @Mock, @Spy, ArgumentCaptor, Verify
> Part 15 — Testing Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **@Mock vs @Spy**: `@Mock` creates a fully fake object — all methods return null/0/false by default; `@Spy` wraps a REAL object — all methods call through to the real implementation unless you stub them with `doReturn()`
- **@InjectMocks**: creates the class under test and injects all `@Mock` and `@Spy` fields into it via constructor, setter, or field injection; use `@ExtendWith(MockitoExtension.class)` to activate these annotations
- **verify() syntax**: `verify(mock, times(1)).method(arg)` — `times(1)` is actually the default; `verify(mock, never()).method(any())` — verifies method was never called; `verify(mock, atLeastOnce())`, `verify(mock, atLeast(2))`; `verifyNoInteractions(mock)` — no method of this mock was called at all
- **ArgumentCaptor**: captures the actual argument passed to a mock method for assertion; `ArgumentCaptor<OrderEvent> captor = ArgumentCaptor.forClass(OrderEvent.class); verify(kafka).send(any(), captor.capture()); assertThat(captor.getValue().getOrderId()).isEqualTo(1L)` — use when the argument is complex and you need to assert on its internals
- **doReturn vs when/thenReturn**: for mocks, both work — use `when(mock.method()).thenReturn(value)`; for spies, ALWAYS use `doReturn(value).when(spy).method()` — the `when()` pattern on a spy calls the real method during setup which can cause exceptions or side effects
- **MockitoSettings strict stubs**: `@ExtendWith(MockitoExtension.class)` enables strict stubbing by default — warns you about unused stubs and prevents the "wrong stub used in wrong test" footgun; don't disable this unless you have a very specific reason

---

## 1. One-Line Definition
Mockito is the standard Java mocking framework used with JUnit 5, providing annotation-based mock/spy creation, stubbing with `when().thenReturn()`, interaction verification with `verify()`, and argument capture for complex assertion scenarios.

---

## 2. The Problem It Solves

A service class typically depends on multiple collaborators: repositories, event publishers, external API clients, email services. Testing the service logic in isolation requires replacing these collaborators with controllable stand-ins. You need to:
- Make a repository return specific data for specific queries (stubbing)
- Verify that an event was published with the correct payload (verification)
- Verify that a notification was NOT sent when the condition wasn't met (negative verification)
- Capture the full object that was passed to a method to assert on its contents (argument capture)

Mockito provides all four capabilities through a clean, annotation-driven API that integrates with JUnit 5 via `MockitoExtension`.

---

## 3. How It Works Internally

### Mock Object Creation

```
@Mock ProductRepository productRepository
  ↓
  Mockito creates a subclass/proxy of ProductRepository at runtime
  All methods are overridden to:
    - Record the call (arguments, call count)
    - Return a default value (null for objects, 0 for primitives, empty Optional, etc.)
    - OR return the configured stubbed value if a matching when() stub exists
  
  The real ProductRepository code NEVER runs
  The proxy has NO actual database connection

@Spy ProductRepository productRepository = new ProductRepository()
  ↓
  Mockito wraps the REAL ProductRepository instance
  All methods call through to the REAL implementation UNLESS stubbed
  Calls are still recorded

@InjectMocks OrderService orderService
  ↓
  Mockito creates an OrderService instance
  Tries to inject mocks/spies via constructor first, then setters, then fields
  Injection order: constructor (preferred) → setters → field injection
```

### Stubbing Resolution

```
when(productRepository.findById(1L)).thenReturn(Optional.of(product))

Registers a stub:
  matcher: method = "findById", argument = equal(1L)
  return: Optional.of(product)

When the code under test calls productRepository.findById(1L):
  1. Mockito checks registered stubs in reverse registration order
  2. Finds matching stub: findById with argument 1L
  3. Returns Optional.of(product)

When called with an UNMATCHED argument (e.g., findById(99L)):
  → Returns the default: Optional.empty() for Optional return type
  → Returns null for object return types
  → Strict stubbing mode: warns "UnnecessaryStubbingException" if a stub is never called
```

---

## 4. The Code

### Wrong Way — Common Mockito Mistakes

```java
// ❌ WRONG 1: Using when().thenReturn() on a spy — calls real method during setup

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    
    @Spy
    EmailClient emailClient = new EmailClient("smtp.test.com");
    
    @InjectMocks NotificationService notificationService;
    
    @Test
    void shouldNotSendEmailForInactiveUser() {
        // ❌ This calls emailClient.sendEmail() for real during setup!
        // The when() pattern evaluates the method call before stubbing.
        // For a spy, this means the REAL method runs.
        // If sendEmail() throws or has side effects, your test setup fails.
        when(emailClient.sendEmail(any())).thenReturn(EmailResult.delivered());
        
        // ✅ Use doReturn for spies:
        // doReturn(EmailResult.delivered()).when(emailClient).sendEmail(any());
    }
}
```

```java
// ❌ WRONG 2: Verifying too much — testing implementation instead of behaviour

@Test
void createOrder_shouldCompleteSuccessfully() {
    OrderRequest request = new OrderRequest("user-1", List.of(new OrderItem(1L, 2)));
    
    when(productRepository.findById(1L)).thenReturn(Optional.of(mockProduct));
    when(orderRepository.save(any())).thenReturn(savedOrder);
    
    orderService.createOrder(request);
    
    // ❌ Over-verification — testing every internal call
    verify(productRepository, times(1)).findById(1L);    // irrelevant implementation detail
    verify(productRepository, never()).findAll();          // obvious — never called
    verify(orderRepository, times(1)).save(any());        // maybe relevant
    verify(kafkaTemplate, times(1)).send(any(), any());   // relevant — event was published
    
    // This test breaks on any internal refactoring even if behaviour is unchanged
    // Example: if you cache product lookups, findById might not be called at all
}
```

```java
// ❌ WRONG 3: Argument mismatch — stub doesn't match actual call

@Test
void getOrderHistory_shouldReturnOrders() {
    String userId = "user-123";
    
    // ❌ Stub is set up with "user-123" (String literal)
    when(orderRepository.findByUserId("user-123")).thenReturn(List.of(order1, order2));
    
    // But the actual method under test might pass something different
    // (e.g., after a userId sanitization step that trims and lowercases)
    List<Order> result = orderService.getOrderHistory("USER-123");
    
    // The stub didn't match ("USER-123" ≠ "user-123") — returns empty list
    assertThat(result).hasSize(2);  // FAILS — returns empty
    
    // ✅ Use anyString() if you don't care about the exact value, 
    //    or match what the code actually passes after transformation
}
```

### Right Way — Mockito Best Practices

```java
// ✅ RIGHT — Complete service test with @Mock, @InjectMocks, verify, ArgumentCaptor

@ExtendWith(MockitoExtension.class)   // ✅ Activates @Mock, @Spy, @InjectMocks annotations
class OrderServiceTest {
    
    @Mock OrderRepository orderRepository;
    @Mock ProductRepository productRepository;
    @Mock KafkaTemplate<String, Object> kafkaTemplate;
    @Mock NotificationService notificationService;
    
    @InjectMocks OrderService orderService;  // creates OrderService with all @Mock fields injected
    
    private Product mockProduct;
    private Order savedOrder;
    
    @BeforeEach
    void setUp() {
        mockProduct = new Product(1L, "Laptop Pro", BigDecimal.valueOf(999.99), true);
        savedOrder = new Order(99L, "user-001", "CONFIRMED", List.of(
            new OrderItem(1L, 2, BigDecimal.valueOf(999.99))
        ), Instant.now());
    }
    
    @Test
    @DisplayName("createOrder — happy path persists order and publishes event")
    void createOrder_whenProductInStock_shouldSaveAndPublishEvent() {
        // Given
        OrderRequest request = new OrderRequest(
            "user-001",
            List.of(new OrderItemRequest(1L, 2)),
            new ShippingAddress("123 MG Road", "Bangalore", "560001")
        );
        
        // ✅ STUB: configure dependencies to provide data
        when(productRepository.findById(1L)).thenReturn(Optional.of(mockProduct));
        when(orderRepository.save(any(Order.class))).thenReturn(savedOrder);
        
        // When
        OrderResponse response = orderService.createOrder(request);
        
        // Then: assert the result
        assertThat(response.getOrderId()).isEqualTo(99L);
        assertThat(response.getStatus()).isEqualTo("CONFIRMED");
        
        // ✅ MOCK: verify the Kafka event was published — this is the critical side effect
        verify(kafkaTemplate, times(1)).send(eq("orders.created"), any(OrderCreatedEvent.class));
        
        // ✅ MOCK: verify order was saved
        verify(orderRepository).save(argThat(order ->
            order.getUserId().equals("user-001") &&
            order.getItems().size() == 1
        ));
    }
    
    @Test
    @DisplayName("createOrder — out of stock throws and skips persistence")
    void createOrder_whenProductOutOfStock_shouldThrowAndNotPersist() {
        Product outOfStockProduct = new Product(1L, "Laptop Pro", BigDecimal.valueOf(999.99), false);
        
        when(productRepository.findById(1L)).thenReturn(Optional.of(outOfStockProduct));
        
        assertThatThrownBy(() ->
            orderService.createOrder(new OrderRequest("user-001",
                List.of(new OrderItemRequest(1L, 2)),
                new ShippingAddress("123 MG Road", "Bangalore", "560001")))
        )
        .isInstanceOf(ProductOutOfStockException.class)
        .hasMessageContaining("Laptop Pro");
        
        // ✅ MOCK: verify NOTHING was persisted or published on the error path
        verifyNoInteractions(orderRepository);
        verifyNoInteractions(kafkaTemplate);
    }
    
    @Test
    @DisplayName("createOrder — ArgumentCaptor captures the published event")
    void createOrder_shouldPublishEventWithCorrectPayload() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(mockProduct));
        when(orderRepository.save(any())).thenReturn(savedOrder);
        
        orderService.createOrder(new OrderRequest(
            "user-001",
            List.of(new OrderItemRequest(1L, 2)),
            new ShippingAddress("123 MG Road", "Bangalore", "560001")
        ));
        
        // ✅ ArgumentCaptor: capture the actual object passed to kafkaTemplate.send()
        // Use when: the method is called with a complex object and you need to assert
        // on its internals (not just "any OrderCreatedEvent was passed")
        ArgumentCaptor<OrderCreatedEvent> eventCaptor =
            ArgumentCaptor.forClass(OrderCreatedEvent.class);
        
        verify(kafkaTemplate).send(eq("orders.created"), eventCaptor.capture());
        
        OrderCreatedEvent capturedEvent = eventCaptor.getValue();
        assertThat(capturedEvent.getOrderId()).isEqualTo(99L);
        assertThat(capturedEvent.getUserId()).isEqualTo("user-001");
        assertThat(capturedEvent.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(1999.98));
        assertThat(capturedEvent.getTimestamp()).isNotNull();
    }
    
    @Test
    @DisplayName("cancelOrder — notification sent and event published, idempotent on already cancelled")
    void cancelOrder_whenNotYetCancelled_shouldNotifyAndPublish() {
        Order activeOrder = new Order(99L, "user-001", "CONFIRMED", List.of(), Instant.now());
        when(orderRepository.findById(99L)).thenReturn(Optional.of(activeOrder));
        when(orderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        // ← .thenAnswer(invocation -> invocation.getArgument(0)) returns the ARGUMENT passed to save
        //   used when you want the saved entity returned (with status update) without a real DB
        
        orderService.cancelOrder(99L, "user-001", "Customer request");
        
        // ✅ Verify notification was sent
        verify(notificationService).sendCancellationNotification(eq("user-001"), eq(99L));
        
        // ✅ Verify Kafka cancellation event was published
        ArgumentCaptor<OrderCancelledEvent> captor = ArgumentCaptor.forClass(OrderCancelledEvent.class);
        verify(kafkaTemplate).send(eq("orders.cancelled"), captor.capture());
        assertThat(captor.getValue().getReason()).isEqualTo("Customer request");
    }
}
```

```java
// ✅ RIGHT — @Spy with doReturn for partial mocking

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {
    
    // ✅ @Spy wraps the REAL implementation
    // All methods call through by default — only override what you need
    @Spy
    DateTimeProvider dateTimeProvider = new DateTimeProvider();
    
    @Mock ReportRepository reportRepository;
    
    @InjectMocks ReportService reportService;
    
    @Test
    @DisplayName("daily report — uses current date from provider")
    void generateDailyReport_shouldUseCurrentDate() {
        LocalDate fixedDate = LocalDate.of(2024, 1, 15);
        
        // ✅ doReturn for spy — does NOT call the real method during setup
        doReturn(fixedDate).when(dateTimeProvider).today();
        
        when(reportRepository.findOrdersByDate(fixedDate))
            .thenReturn(List.of(order1, order2, order3));
        
        DailyReport report = reportService.generateDailyReport();
        
        assertThat(report.getDate()).isEqualTo(fixedDate);
        assertThat(report.getOrderCount()).isEqualTo(3);
        
        // ✅ Real DateTimeProvider methods that aren't stubbed still run normally
        // e.g., dateTimeProvider.formatDate() calls the REAL implementation
    }
}
```

```java
// ✅ RIGHT — Consecutive return values, exceptions, and answer callbacks

@Test
@DisplayName("retry logic — fails twice then succeeds")
void callExternalApi_withRetry_shouldSucceedOnThirdAttempt() {
    // ✅ mockReturnValueOnce equivalent in Mockito: chain thenReturn/thenThrow
    when(externalApiClient.fetchData("products"))
        .thenThrow(new ServiceUnavailableException("Attempt 1"))  // first call
        .thenThrow(new ServiceUnavailableException("Attempt 2"))  // second call
        .thenReturn(new ApiResponse(200, productsList));           // third call
    
    // Service has retry-3 logic
    List<Product> result = productSyncService.syncWithRetry("products");
    
    assertThat(result).hasSize(productsList.size());
    
    // ✅ Verify it was called exactly 3 times (2 failures + 1 success)
    verify(externalApiClient, times(3)).fetchData("products");
}

@Test
@DisplayName("thenAnswer — dynamic response based on argument")
void calculateDiscount_shouldReturnDifferentDiscountsPerTier() {
    // ✅ thenAnswer: compute the return value dynamically from the argument
    when(discountService.getDiscount(any(Order.class)))
        .thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            BigDecimal total = order.getTotal();
            
            if (total.compareTo(BigDecimal.valueOf(1000)) >= 0) {
                return new Discount(0.15, "PREMIUM_TIER");
            } else if (total.compareTo(BigDecimal.valueOf(500)) >= 0) {
                return new Discount(0.10, "STANDARD_TIER");
            }
            return new Discount(0.00, "NO_DISCOUNT");
        });
    
    Order smallOrder = new Order(BigDecimal.valueOf(200));
    Order mediumOrder = new Order(BigDecimal.valueOf(600));
    Order largeOrder = new Order(BigDecimal.valueOf(1500));
    
    assertThat(orderService.applyDiscount(smallOrder).getDiscountPercentage()).isEqualTo(0.00);
    assertThat(orderService.applyDiscount(mediumOrder).getDiscountPercentage()).isEqualTo(0.10);
    assertThat(orderService.applyDiscount(largeOrder).getDiscountPercentage()).isEqualTo(0.15);
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When do you use @Spy vs @Mock?"

**Hruday's answer:**
> `@Mock` is the default choice: a completely fake object where all methods are overridden to return null or zero. I use it for any external dependency — repositories, Kafka templates, HTTP clients, notification services. I don't need any of their real logic; I just need to control what they return and verify how they were called.
>
> `@Spy` is for when I need the REAL implementation of an object but want to monitor or override specific methods. The classic use cases:
>
> First, a utility class where most methods should run for real but one method touches the outside world (like `DateTimeProvider.today()` which calls `LocalDate.now()`). I spy on the utility, let all methods run real, and use `doReturn(fixedDate).when(spy).today()` to control only the time-dependent method.
>
> Second, testing a method that calls other methods on the SAME object (self-delegation). Mockito can't easily spy on the object under test, but if you have a service that delegates to a helper method `calculateTax()` within the same class, you can spy on it to stub `calculateTax()` while letting the top-level method run for real.
>
> The critical rule: always use `doReturn().when()` for spies, never `when().thenReturn()`. The `when()` pattern evaluates the method call during setup, which causes the real spy method to run — potentially triggering exceptions, database calls, or side effects before the stub is even registered.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain ArgumentCaptor and when you'd use it over argThat()."

**Hruday's answer:**
> Both capture or match the argument passed to a mock, but with different purposes.
>
> `argThat(predicate)` is an inline matcher: `verify(kafka).send(eq("orders.created"), argThat(event -> event.getOrderId() == 99L))`. It's clean for simple one-condition assertions on the argument. If the assertion fails, the error message is "argument matching failed" — not very descriptive.
>
> `ArgumentCaptor` captures the actual argument and lets you assert on it after verification: `verify(kafka).send(eq("topic"), captor.capture()); assertThat(captor.getValue().getOrderId()).isEqualTo(99L)`. The advantage: I can make multiple assertions on the captured object with individual assertions, each with its own failure message. If `getOrderId()` fails, I see exactly which field was wrong. If `getUserId()` fails on the next assertion, I see that separately.
>
> The second advantage: the captured value can be used in subsequent test logic. For example, capturing a created `Order` to verify its generated ID is not null, then using that ID to verify a subsequent repository lookup.
>
> My rule: use `argThat()` for a single condition check. Use `ArgumentCaptor` when you need to assert on three or more fields of the argument, or when you need the captured value for further test operations.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the risks of @InjectMocks vs using constructor injection manually?"

**Hruday's answer:**
> `@InjectMocks` is convenient but has a specific failure mode: if Mockito can't inject via constructor (because no constructor matches the exact set of mocks), it falls back to field injection. This means if you add a new dependency to the class and forget to add a corresponding `@Mock` in the test, `@InjectMocks` silently injects `null` for that field. The test might pass if the code path doesn't touch the null field, and you'll only discover the missing mock when the code path changes.
>
> Manual construction avoids this: `service = new OrderService(orderRepository, kafkaTemplate, notificationService)`. If you add a fourth constructor parameter and don't update the test, it fails to compile immediately — the compiler catches the mismatch.
>
> My practice: I use `@InjectMocks` for convenience in most tests because the compile-time constructor pattern only helps when you use constructor injection (which you should). If the class uses `@Autowired` field injection (an anti-pattern in Spring Boot production code — prefer constructor injection), `@InjectMocks` field injection is silent about missing mocks. Another reason to enforce constructor injection in production code: it makes tests more defensive.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Test an order cancellation service that: (1) loads the order, (2) validates the user can cancel, (3) updates status, (4) sends an email, (5) publishes a Kafka event. What do you mock and what do you verify?"

**Hruday's answer:**
> The dependencies:
>
> `OrderRepository` — mock it. Stub `findById(orderId)` to return a test order. Verify `save()` was called with an order in CANCELLED status.
>
> `UserAuthorizationService` — mock it. Stub `canUserCancelOrder(userId, orderId)` to return `true` for the happy path and `false` for the "user not authorized" test case.
>
> `EmailService` — mock it. This is a side effect — verify `sendCancellationEmail(userId, order)` was called exactly once. Also write a test verifying it's NOT called when authorization fails.
>
> `KafkaTemplate` — mock it. This is a side effect — verify `send("orders.cancelled", event)` was called. Use `ArgumentCaptor<OrderCancelledEvent>` to capture the event and assert it contains the right `orderId`, `userId`, `cancellationReason`, and `timestamp`.
>
> What I don't mock: the `Order` entity itself — I use a real `Order` instance pre-populated with test data. The entity's business logic (status transitions, validation rules) should run for real. If `Order.cancel()` contains the business rule about what statuses can transition to CANCELLED, mocking the Order would bypass that rule.
>
> The tests I write: happy path (everything works), user not authorized (no save, no email, no Kafka), order not found (throws OrderNotFoundException), order already cancelled (idempotent behaviour or throws). Each test verifies the exact side effects that should or should NOT have happened.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Strict stubbing is annoying, I disable it" | "I use @MockitoSettings(strictness = LENIENT) to suppress unused stub warnings" | Strict stubbing warnings are valuable signal: an unused stub means either (1) the code path doesn't call that dependency (the test is testing behaviour that doesn't exist), or (2) the stub is set up in a shared beforeEach but only needed by some tests (move it into the specific tests that need it); suppressing the warning hides both problems; the most dangerous case: a stub set up in test A is accidentally used in test B (test B gets the stub's return value instead of the default, passing for the wrong reason); strict stubbing prevents this cross-contamination |
| "verify() checks if the method was called" | "I use verify() on all my mocked dependencies to be thorough" | verify() on a stub (a mock you used only for return values) is noise and creates brittleness — if `productRepository.findById(id)` is refactored to `productRepository.findBySku(sku)`, verification of `findById` breaks even though the behaviour (loading the product) is unchanged; only verify interactions where the CALL is the behaviour being tested: Kafka publishes, email sends, audit log writes, external API invocations; the rule: verify producers and side effects, don't verify data providers and stubs |
| "thenReturn and doReturn are interchangeable" | "I use when().thenReturn() for both mocks and spies" | For a mock (not a spy), `when(mock.method()).thenReturn(x)` and `doReturn(x).when(mock).method()` produce the same result; for a SPY, `when(spy.method()).thenReturn(x)` calls the REAL method during the when() evaluation — before the stub is registered; if the real method throws or has side effects, your test setup fails or has unintended effects; for spies, ALWAYS use `doReturn(x).when(spy).method()` which registers the stub WITHOUT calling the real method; this is the single most common spy-related bug in Mockito code |

---

## 7. Hruday's Real Experience Hook
> "At Oracle, the order export service had a complex event payload — an `ExportCompletedEvent` with 12 fields including timestamps, record counts, error summaries, and destination paths. The original test used `argThat(event -> event.getRecordCount() == 500)` — a single-field check.
>
> When a bug was introduced where `event.getTotalErrors()` was always 0 (the error counter wasn't being aggregated correctly), the test still passed — it only checked `recordCount`. The bug made it to production and caused downstream services to not retry on partial failures.
>
> After that, I converted the test to use `ArgumentCaptor<ExportCompletedEvent>` and added assertions on all 6 required fields: `recordCount`, `totalErrors`, `successCount`, `startTimestamp`, `endTimestamp`, `destinationPath`. The next time someone introduced a bug in the event assembly, the test caught it in the `totalErrors` field assertion with a clear failure message showing expected vs actual values.
>
> The lesson: ArgumentCaptor for complex event/DTO assertions is worth the extra three lines — it makes failures immediately readable and catches a wider class of bugs."

---

## 8. Scale Evolution

**1,000 users →** Mockito for all service unit tests; `@ExtendWith(MockitoExtension.class)` on all test classes; ArgumentCaptor for Kafka events; strict stubbing enabled; clean suite.

**100,000 users →** Shared test utility builders for common entities (`OrderTestBuilder.defaultOrder()`, `ProductTestBuilder.inStock()`); custom Mockito matchers in a shared test library; 500+ unit tests under 30 seconds via JUnit 5 parallelism.

**10 million users →** Mockito unit tests remain fast and unchanged; contract tests (Pact, Topic 261) handle the cross-service integration layer, replacing some Mockito stubs on external service clients; Mockito is still the workhorse for service-layer isolation.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment service unit tests — verify payment event published with correct amount and currency; ArgumentCaptor for audit log events; verifyNoInteractions for rollback path | ArgumentCaptor for financial event payload; strict event payload validation; negative verification on cancelled flows |
| Swiggy / Meesho | OrderService with multiple side effects (notification, Kafka, inventory update); testing retry logic with chained thenThrow().thenReturn(); verifyNoInteractions on delivery partner notification for cancelled orders | Chained stubbing for retry; verifyNoInteractions for negative paths; ArgumentCaptor for delivery event |
| Adobe / Microsoft | Document service — verify correct bucket/path passed to S3 client; ArgumentCaptor for storage events; partial mocking of document processor via @Spy | @Spy for partial mocking; ArgumentCaptor for S3 key validation; strict stubbing discipline |
| SAP Labs | Oracle story: ArgumentCaptor caught ExportCompletedEvent.totalErrors bug; added 6-field assertion vs single-field argThat; production bug that passed single-field check caught by ArgumentCaptor | Specific story; ArgumentCaptor vs argThat decision; widening assertion coverage after a production incident |

---

## 10. Related Topics — What to Study Next

- **Topic 258 — Spring Boot Unit Testing** — this topic covers the Mockito API (`@Mock`, `@Spy`, `ArgumentCaptor`, `verify()`); Topic 258 shows how these integrate with Spring's `@MockBean`, `@SpyBean`, and Spring test slices; the two topics work together as the complete Spring unit testing picture
- **Topic 252 — Mocking vs Stubbing vs Faking** — the conceptual framework that explains WHY Mockito has both stubs (when/thenReturn) and mocks (verify); understanding the distinction makes this API feel designed rather than arbitrary
- **Topic 260 — TestContainers** — Mockito mocks replace databases with controlled return values; TestContainers replaces databases with real Docker containers; knowing when to use each (mock = service-layer isolation, real container = repository integration) is essential for designing a complete test strategy
- **Topic 261 — Contract Testing with Pact** — in microservice architectures, Mockito mocks the downstream service's client; this works until the downstream service changes its API; Pact contracts replace the Mockito stub for external services with a contract that the provider must verify, catching API drift before it causes production failures

---

*Part 15 · Mockito Deep Dive · Full Stack Interview Guide · Hruday D · 2026*
