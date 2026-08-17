# Spring Boot Unit Testing — @WebMvcTest, @DataJpaTest, @SpringBootTest
> Part 15 — Testing Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Three test slices in Spring Boot**: `@WebMvcTest` (web layer only: controllers + filters + security), `@DataJpaTest` (persistence layer only: repositories + JPA), `@SpringBootTest` (full application context); each loads progressively more of the Spring context; use the narrowest slice that works
- **@WebMvcTest**: does NOT bootstrap services or repositories — you must `@MockBean` everything the controller depends on; uses `MockMvc` to fire HTTP requests without starting a real server; tests controller mapping, JSON serialization, request validation, security, exception handling
- **@DataJpaTest**: loads only JPA-related beans; replaces the real datasource with H2 in-memory by default; use `@AutoConfigureTestDatabase(replace = NONE)` + TestContainers for real Postgres behaviour; tests custom `@Query` methods and entity mapping
- **@SpringBootTest**: loads the full application context; can start a real server with `webEnvironment = RANDOM_PORT` or use `MockMvc` with `webEnvironment = MOCK`; use for integration tests that cross multiple layers; slowest test type — use sparingly
- **@MockBean vs @Autowired in tests**: `@MockBean` creates a Mockito mock AND registers it in the Spring context, replacing the real bean — use in `@WebMvcTest` to mock the service layer; `@SpyBean` wraps the real Spring bean with a Mockito spy
- **@Transactional on @DataJpaTest tests**: every test method is transactional and rolled back by default — the database is clean before each test without manual cleanup

---

## 1. One-Line Definition
Spring Boot's test slices (`@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest`) let you test individual application layers in isolation using a partial Spring context, making tests faster and more focused than starting the full application.

---

## 2. The Problem It Solves

Testing a Spring Boot controller by starting the full application means: loading all beans (JPA, security, Kafka, Redis, etc.), connecting to a real database, and waiting 10-30 seconds for context startup. For a test that only needs to verify JSON serialization and HTTP status codes, this is enormous overhead.

Spring Boot's test slice annotations solve this by activating only the relevant beans for the layer being tested. A `@WebMvcTest` for a controller test starts only the web layer beans in < 2 seconds. A `@DataJpaTest` for repository tests starts only the JPA layer. The full `@SpringBootTest` is reserved for genuine integration tests that need the whole application wired together.

---

## 3. How It Works Internally

### Test Slice Scope Comparison

```
@WebMvcTest(ProductController.class)
  ├── Loads: @Controller, @ControllerAdvice, @JsonComponent, Filters, WebMvcConfigurer
  ├── Does NOT load: @Service, @Repository, @Component, @Configuration (non-web)
  ├── Uses: MockMvc (fake HTTP layer — no real server port)
  └── You must @MockBean: every service that the controller uses

@DataJpaTest
  ├── Loads: @Repository interfaces, JPA entity scanning, EntityManager, DataSource
  ├── Does NOT load: @Service, @Controller, non-JPA @Component
  ├── Replaces: real DataSource → H2 in-memory (by default)
  └── Transactional: each test is rolled back automatically

@SpringBootTest(webEnvironment = MOCK)
  ├── Loads: ENTIRE application context (all beans)
  ├── Uses: MockMvc injected via @AutoConfigureMockMvc
  └── Scope: full integration test; no layer isolation

@SpringBootTest(webEnvironment = RANDOM_PORT)
  ├── Loads: ENTIRE application context
  ├── Starts: real embedded server on a random port
  ├── Uses: TestRestTemplate or WebTestClient for HTTP calls
  └── Scope: E2E-style integration test; real HTTP
```

---

## 4. The Code

### Wrong Way — Common Spring Boot Testing Anti-Patterns

```java
// ❌ WRONG 1: Using @SpringBootTest for a simple controller test

@SpringBootTest   // ← loads EVERYTHING — takes 15+ seconds to start
@AutoConfigureMockMvc
class ProductControllerTest {
    
    @Autowired MockMvc mockMvc;
    
    // ❌ Full context means real Kafka consumer starts, real Redis connection attempted,
    // real DB connection needed — test fails in isolation without infrastructure
    @Test
    void getProduct_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/products/1"))
               .andExpect(status().isOk());
    }
    // ← All this test actually does is check HTTP status + JSON; @WebMvcTest is correct
}
```

```java
// ❌ WRONG 2: Not rolling back in @DataJpaTest — tests pollute each other

@DataJpaTest
class ProductRepositoryTest {
    
    @Autowired ProductRepository productRepository;
    
    @Test
    void test1_saveProduct_shouldPersist() {
        productRepository.save(new Product(null, "Laptop", BigDecimal.valueOf(999)));
        assertThat(productRepository.count()).isEqualTo(1);
    }
    
    @Test
    void test2_emptyRepository() {
        // ❌ test1's data is still there if @Transactional is not active
        // Product count is 1, not 0 — unpredictable test ordering causes failures
        assertThat(productRepository.count()).isEqualTo(0);  // FAILS
    }
}
// ✅ @DataJpaTest is @Transactional by default — each test IS rolled back
// If you annotate a test with @Commit, that test's data WILL persist to other tests
// Never use @Commit in test methods unless explicitly testing commit behaviour
```

```java
// ❌ WRONG 3: No MockBean for service dependencies in @WebMvcTest

@WebMvcTest(ProductController.class)
class ProductControllerTest {
    
    @Autowired MockMvc mockMvc;
    
    // ❌ No @MockBean for ProductService
    // ProductController has: @Autowired ProductService productService
    // Spring can't create ProductController without all its dependencies
    // Test fails with: No qualifying bean of type 'ProductService' found
    
    @Test
    void getProduct_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/products/1"))
               .andExpect(status().isOk());
    }
}
```

### Right Way — Each Test Slice Used Correctly

```java
// ✅ RIGHT — @WebMvcTest for controller layer tests

@WebMvcTest(ProductController.class)
class ProductControllerTest {
    
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    
    // ✅ @MockBean creates a Mockito mock AND registers it in the Spring context
    // ProductController's @Autowired ProductService field gets this mock
    @MockBean ProductService productService;
    @MockBean CartService cartService;   // mock all dependencies the controller needs
    
    @Test
    @DisplayName("GET /api/products/{id} → 200 with product body")
    void getProduct_whenProductExists_shouldReturn200WithBody() throws Exception {
        // Given
        ProductDto productDto = new ProductDto(1L, "Laptop Pro", BigDecimal.valueOf(999.99), "ACTIVE");
        when(productService.getProduct(1L)).thenReturn(productDto);
        
        // When / Then
        mockMvc.perform(get("/api/products/1")
                .header("Authorization", "Bearer valid-token")
                .accept(MediaType.APPLICATION_JSON))
               .andExpect(status().isOk())                              // HTTP 200
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.id").value(1))
               .andExpect(jsonPath("$.name").value("Laptop Pro"))
               .andExpect(jsonPath("$.price").value(999.99))
               .andExpect(jsonPath("$.status").value("ACTIVE"));
        
        // ✅ Verify the service was called with the correct parameter
        verify(productService).getProduct(1L);
    }
    
    @Test
    @DisplayName("GET /api/products/{id} → 404 when not found")
    void getProduct_whenNotFound_shouldReturn404() throws Exception {
        when(productService.getProduct(99L))
            .thenThrow(new ProductNotFoundException("Product 99 not found"));
        
        mockMvc.perform(get("/api/products/99")
                .accept(MediaType.APPLICATION_JSON))
               .andExpect(status().isNotFound())
               .andExpect(jsonPath("$.message").value("Product 99 not found"))
               .andExpect(jsonPath("$.status").value(404));
    }
    
    @Test
    @DisplayName("POST /api/products → 400 when request body is invalid")
    void createProduct_whenInvalidBody_shouldReturn400() throws Exception {
        // Missing required fields — should trigger @Valid validation
        CreateProductRequest invalidRequest = new CreateProductRequest(
            null,    // name is @NotBlank
            null,    // price is @NotNull
            ""       // category is @NotBlank
        );
        
        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
               .andExpect(status().isBadRequest())
               .andExpect(jsonPath("$.errors").isArray())
               .andExpect(jsonPath("$.errors[*].field").value(
                   hasItems("name", "price", "category")));
        
        // ✅ Service should NOT be called when validation fails
        verifyNoInteractions(productService);
    }
    
    @Test
    @DisplayName("POST /api/products → 201 with valid body")
    void createProduct_whenValidBody_shouldReturn201() throws Exception {
        CreateProductRequest request = new CreateProductRequest(
            "Laptop Pro", BigDecimal.valueOf(999.99), "electronics"
        );
        ProductDto created = new ProductDto(10L, "Laptop Pro", BigDecimal.valueOf(999.99), "ACTIVE");
        when(productService.createProduct(any(CreateProductRequest.class))).thenReturn(created);
        
        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
               .andExpect(status().isCreated())
               .andExpect(header().string("Location", containsString("/api/products/10")))
               .andExpect(jsonPath("$.id").value(10));
    }
}
```

```java
// ✅ RIGHT — @DataJpaTest for repository layer tests

@DataJpaTest
// ✅ Use @AutoConfigureTestDatabase(replace = NONE) + TestContainers for real Postgres
// @AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
// @Testcontainers — see Topic 260 for full TestContainers setup
class ProductRepositoryTest {
    
    @Autowired ProductRepository productRepository;
    @Autowired TestEntityManager entityManager;  // convenience wrapper around EntityManager
    
    @BeforeEach
    void setUp() {
        // ✅ Use TestEntityManager to seed data — bypasses the repo under test
        entityManager.persist(new Product(null, "Laptop Pro", BigDecimal.valueOf(999.99), "electronics", true));
        entityManager.persist(new Product(null, "Wireless Mouse", BigDecimal.valueOf(29.99), "electronics", true));
        entityManager.persist(new Product(null, "Standing Desk", BigDecimal.valueOf(499.99), "furniture", true));
        entityManager.persist(new Product(null, "Old Printer", BigDecimal.valueOf(199.99), "electronics", false));
        entityManager.flush();  // flush to DB (within this transaction)
    }
    
    @Test
    @DisplayName("findByCategory() returns only products in that category")
    void findByCategory_shouldReturnMatchingProducts() {
        List<Product> products = productRepository.findByCategory("electronics");
        
        assertThat(products).hasSize(3);  // Laptop, Mouse, Old Printer
        assertThat(products).extracting(Product::getCategory)
            .containsOnly("electronics");
    }
    
    @Test
    @DisplayName("findActiveByCategoryOrderByPriceAsc() returns in-stock sorted by price")
    void findActiveByCategoryOrderByPriceAsc_shouldReturnSortedActiveOnly() {
        List<Product> products = productRepository
            .findActiveByCategoryOrderByPriceAsc("electronics");
        
        // Old Printer is inactive — should be excluded
        assertThat(products).hasSize(2);
        
        // Should be sorted ascending: Mouse (₹29.99) then Laptop (₹999.99)
        assertThat(products).extracting(Product::getName)
            .containsExactly("Wireless Mouse", "Laptop Pro");
    }
    
    @Test
    @DisplayName("Custom @Query — countByCategory works")
    void countByCategory_shouldCountCorrectly() {
        long count = productRepository.countByCategory("electronics");
        assertThat(count).isEqualTo(3);
    }
    
    @Test
    @DisplayName("save() with @PrePersist sets createdAt automatically")
    void save_shouldSetCreatedAtViaPrePersist() {
        Product newProduct = new Product(null, "Keyboard", BigDecimal.valueOf(79.99), "electronics", true);
        
        Product saved = productRepository.save(newProduct);
        entityManager.flush();
        entityManager.clear();   // ← clears 1L-cache; forces re-read from DB
        
        Product reloaded = productRepository.findById(saved.getId()).orElseThrow();
        
        // ✅ Tests that @PrePersist lifecycle hook set the timestamp — can't do this with mocks
        assertThat(reloaded.getCreatedAt()).isNotNull();
        assertThat(reloaded.getCreatedAt()).isBefore(Instant.now().plusSeconds(5));
    }
}
```

```java
// ✅ RIGHT — @SpringBootTest for true integration test (cross-layer)

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
// ✅ Use @ActiveProfiles("test") if you have a separate application-test.yml
@ActiveProfiles("test")
class OrderIntegrationTest {
    
    @Autowired WebTestClient webTestClient;
    
    // ✅ @MockBean replaces Kafka (don't need a real broker in integration tests)
    @MockBean KafkaTemplate<String, Object> kafkaTemplate;
    
    // ✅ @MockBean replaces external payment service call
    @MockBean PaymentGatewayClient paymentGatewayClient;
    
    @BeforeEach
    void setUp() {
        when(paymentGatewayClient.charge(any()))
            .thenReturn(new PaymentResult("TXN-12345", "SUCCESS"));
    }
    
    @Test
    @DisplayName("Full order flow: POST /api/orders → 201, product stock decremented")
    void createOrder_fullFlow_shouldDecrementStock() {
        CreateOrderRequest request = new CreateOrderRequest(
            "user-001",
            List.of(new OrderItemRequest(1L, 2)),  // order 2 of product 1
            new ShippingAddress("123 MG Road", "Bangalore", "560001")
        );
        
        // ✅ WebTestClient for reactive/non-blocking HTTP calls in tests
        webTestClient.post()
            .uri("/api/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .exchange()
            .expectStatus().isCreated()
            .expectBody()
            .jsonPath("$.orderId").isNotEmpty()
            .jsonPath("$.status").isEqualTo("CONFIRMED")
            .jsonPath("$.paymentTransactionId").isEqualTo("TXN-12345");
        
        // ✅ Verify Kafka event was published — the cross-layer side effect
        verify(kafkaTemplate, times(1))
            .send(eq("orders.created"), argThat(event ->
                ((OrderCreatedEvent) event).getUserId().equals("user-001")));
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you choose @WebMvcTest over @SpringBootTest?"

**Hruday's answer:**
> `@WebMvcTest` is the right choice whenever I'm testing controller-specific concerns: HTTP status codes, URL mapping, JSON serialization/deserialization, request validation with `@Valid`, security configuration (authenticated vs unauthenticated access), and exception handler responses from `@ControllerAdvice`.
>
> These concerns live purely in the web layer. I mock the service layer with `@MockBean` because the controller test doesn't need real service logic — it just needs the service to return predefined responses so it can test how the controller handles them.
>
> `@WebMvcTest` starts the Spring context in < 2 seconds because it skips JPA, Kafka, Redis, and all non-web beans. A `@SpringBootTest` for the same controller test would take 15-30 seconds and require a database connection.
>
> I reach for `@SpringBootTest` only when I need to test behaviour that spans multiple layers: for example, verifying that a controller call correctly persists data to the database AND publishes a Kafka event. That cross-layer verification can't be done with just the web slice — I need the real service and repository wired together.

---

### Q2 — Deep Dive
**Interviewer asks:** "What does @DataJpaTest actually test? Why can't I just use @MockBean for the repository?"

**Hruday's answer:**
> `@DataJpaTest` tests things that Mockito mocks fundamentally cannot test: the correctness of JPQL/SQL queries, entity lifecycle hooks, JPA mapping, constraint enforcement, and cascade behaviour.
>
> The most important case: custom `@Query` annotations. If I write `@Query("SELECT p FROM Product p WHERE p.category = :cat AND p.active = true ORDER BY p.price ASC")`, a Mockito mock won't execute this query. If my JPQL has a typo, uses a wrong field name, or has an incorrect JOIN, the mock happily returns whatever I configured and the test passes. Only when `@DataJpaTest` actually runs this query against H2 (or ideally Postgres via TestContainers) do I discover the SQL error.
>
> The second case: `@PrePersist`, `@PreUpdate`, and `@PostLoad` entity lifecycle hooks. If your entity sets `createdAt` in `@PrePersist`, a Mockito mock bypasses this entirely. `@DataJpaTest` persists the entity through the full JPA stack, fires the lifecycle hooks, and you can assert that `createdAt` was populated correctly.
>
> The third case: `@Column(nullable = false)` and other schema constraints. A mock returns any value regardless of constraints. `@DataJpaTest` validates against the schema.
>
> So: use `@MockBean` for the repository when testing a SERVICE (you want to isolate the service from the database). Use `@DataJpaTest` when testing the REPOSITORY ITSELF.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What's the downside of @DataJpaTest using H2 in-memory by default?"

**Hruday's answer:**
> H2 supports most features of standard SQL but has gaps compared to Postgres, MySQL, or Oracle in production.
>
> The specific gaps that matter:
>
> Postgres-specific features: `JSONB` column type, `array_agg()`, `DISTINCT ON ()`, `trigram operators`, window functions (H2 has partial support), `ON CONFLICT DO UPDATE` (UPSERT). If your application uses these in native queries, the H2 test passes but the Postgres query fails in production.
>
> Schema dialect differences: Postgres treats `VARCHAR` and `TEXT` differently in some edge cases. H2's case sensitivity behaviour differs from Postgres. Auto-increment sequences work differently.
>
> The fix is `@AutoConfigureTestDatabase(replace = NONE)` combined with TestContainers providing a real Postgres instance. The test takes longer (container startup) but tests against the exact same database engine as production. For performance, the TestContainers Postgres instance can be scoped to the JVM (shared across all test classes in a test run) rather than restarted per test.
>
> My practice: use H2 for fast unit-level repository tests (basic CRUD, simple queries), use TestContainers for tests covering Postgres-specific features, native queries, and performance-sensitive queries like index verification.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design a test strategy for a Spring Boot microservice with a REST API, JPA persistence, and Kafka publishing."

**Hruday's answer:**
> I layer the tests in three levels matching the Spring Boot test slice capabilities.
>
> First layer — unit tests (Mockito, no Spring context): service classes tested in isolation with mocked repositories and mocked Kafka templates. These cover business logic branching, error handling, domain rules. Fast (< 1 second per test), no infrastructure needed.
>
> Second layer — slice tests (partial Spring context): `@WebMvcTest` tests cover each controller endpoint for HTTP status codes, request validation, JSON field names, security access control. `@DataJpaTest` with H2 covers standard JPQL queries, entity mapping, and lifecycle hooks. For Postgres-specific queries, `@DataJpaTest` + TestContainers Postgres. These test the infrastructure integration (HTTP, SQL) without running the full application.
>
> Third layer — integration tests (`@SpringBootTest` + TestContainers): one or two tests per major use case that wire the full stack together. A POST to `/api/orders` that: creates an order in the real Postgres DB (TestContainers), publishes a Kafka event (Kafka TestContainers or `@MockBean` KafkaTemplate), and returns 201. This layer verifies cross-layer wiring and is kept small because it's slowest.
>
> CI pipeline: Unit + slice tests run on every PR (< 2 minutes). Integration tests run on merge to main (5-10 minutes). This balance gives fast PR feedback and thorough integration verification before deployment.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "@MockBean can be used in any test type" | "I use @MockBean everywhere to replace services" | @MockBean creates a mock AND resets the Spring context — if different test classes use different @MockBean configurations, Spring starts a new context for each combination; with many @MockBean variations, you can end up with 5+ context restarts in a single test run, each taking 10-30 seconds; to avoid this, keep @MockBean usage consistent within a test class and group tests that share the same context configuration together; avoid @MockBean in @DataJpaTest unless you have a genuine dependency that can't be excluded from the JPA slice |
| "webEnvironment = RANDOM_PORT is always best" | "I always use RANDOM_PORT to test with a real server" | RANDOM_PORT starts a real embedded Tomcat — slower than MOCK mode and requires using TestRestTemplate or WebTestClient for HTTP calls; MOCK mode uses MockMvc which is faster (no real TCP) and gives MockMvc's powerful matchers for assertions; unless you're testing something that genuinely requires real HTTP (HTTPS, websockets, HTTP/2 specific behaviour, server-side events), use MOCK mode with @AutoConfigureMockMvc; in 7 years, actual HTTP server behaviour differences vs MockMvc only mattered for websocket tests |
| "@DataJpaTest has automatic transaction rollback" | "I call repository.deleteAll() in @AfterEach to clean up" | @DataJpaTest adds @Transactional at the class level — every test runs in a transaction that is automatically rolled back at the end, returning the database to the state it was before the test; you do NOT need cleanup in @AfterEach; calling deleteAll() is redundant AND actually wrong — you're making an additional SQL call inside a transaction that will be rolled back anyway; the ONLY time you need manual cleanup in @DataJpaTest is if a test is annotated with @Commit, which is rare and explicit |

---

## 7. Hruday's Real Experience Hook
> "At Oracle, we had a product import service that processed bulk CSV files and inserted records into Postgres. The original tests used `@SpringBootTest` for everything — 30 tests took 8 minutes because each test restarted the full context with different `@MockBean` configurations.
>
> We refactored to slices: controller tests → `@WebMvcTest` (file upload endpoint, validation), CSV parsing → pure JUnit unit tests (no Spring), bulk insert → `@DataJpaTest` with TestContainers Postgres (real Postgres schema for `ON CONFLICT DO UPDATE` upsert queries), full flow → one `@SpringBootTest` integration test.
>
> The 30 tests went from 8 minutes to 90 seconds. The TestContainers Postgres instance was scoped to the JVM (reused across all `@DataJpaTest` classes), so the container started once and all repository tests ran inside it. The most valuable outcome: the TestContainers tests caught two `ON CONFLICT DO UPDATE` syntax issues that H2 had masked, preventing a production incident on the upsert path."

---

## 8. Scale Evolution

**1,000 users →** Unit tests (Mockito) for services, `@WebMvcTest` for controllers, `@DataJpaTest` with H2 for repositories, one `@SpringBootTest` per major feature; test run under 3 minutes.

**100,000 users →** TestContainers Postgres (JVM-scoped) replacing H2; Spring MockMvc request builder utilities shared via test utility class; `@TestConfiguration` beans for common test infrastructure; test containers sharing across the team via Testcontainers Cloud.

**10 million users →** Separate smoke test suite running against staging via REST calls (no Spring context at all); Pact contract tests (Topic 261) replacing some `@SpringBootTest` integration tests for cross-service contracts; parallel test execution with JUnit 5 parallel configuration.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment controller tests — security (authentication, authorization), idempotency key validation, status code correctness for different payment states; `@WebMvcTest` for each endpoint | @WebMvcTest with Spring Security; idempotency testing; @Valid for payment request validation |
| Swiggy / Meesho | Product catalog repo tests with complex filter queries; `@DataJpaTest` + TestContainers for `findByCategory` performance and correctness; `@SpringBootTest` for full order creation flow | @DataJpaTest + TestContainers for catalog queries; @SpringBootTest minimal use |
| Adobe / Microsoft | Document API controllers; multi-tenant isolation testing in repository slice; `@ActiveProfiles` for different database configurations | Multi-profile test setup; @DataJpaTest with schema validation; enterprise testing standards |
| SAP Labs | Oracle story: 8-min suite → 90 seconds via slice refactoring; TestContainers caught ON CONFLICT upsert syntax that H2 hid; direct measurable impact on CI cost and developer productivity | Specific before/after numbers; @DataJpaTest + TestContainers for Postgres-specific features; context restart cost of @MockBean |

---

## 10. Related Topics — What to Study Next

- **Topic 259 — Mockito Deep Dive** — the foundation of unit testing in Java; every `@MockBean` in a Spring test uses Mockito under the hood; understanding `@Mock`, `@InjectMocks`, `verify()`, `ArgumentCaptor`, and `doReturn()` is required to write effective `@WebMvcTest` tests where services are mocked
- **Topic 260 — TestContainers** — the production-quality replacement for H2 in `@DataJpaTest`; runs a real Docker container of Postgres, MySQL, or any other database so your tests use the exact same engine as production; eliminates the H2 vs Postgres dialect gap
- **Topic 261 — Contract Testing with Pact** — for microservices that use REST APIs provided by other teams; instead of mocking the downstream service in `@SpringBootTest`, Pact generates a contract from the consumer test that the provider must also verify; eliminates the "tests pass in isolation but fail in integration" problem
- **Topic 252 — Mocking vs Stubbing vs Faking** — the conceptual framework for deciding when to use `@MockBean` (mock + verify for side effects), when to use a fake service bean via `@TestConfiguration`, and when full `@DataJpaTest` or `@SpringBootTest` is the right choice

---

*Part 15 · Spring Boot Unit Testing · Full Stack Interview Guide · Hruday D · 2026*
