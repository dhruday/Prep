# TestContainers — Real Databases and Services in Tests
> Part 15 — Testing Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **What TestContainers does**: starts a real Docker container (Postgres, Redis, Kafka, MongoDB, etc.) for your test, gives you the JDBC URL / connection details, and stops/removes the container when the test is done — no manual `docker run`, no shared CI database, no cleanup scripts
- **JVM-scoped container** (singleton pattern): annotate your container with `static` and use `@Container` from `@Testcontainers`; the container starts ONCE for the entire JVM test run and is shared across all test classes that use it — much faster than starting a new container per test class
- **@DynamicPropertySource**: registers the container's dynamic properties (port, host, credentials) into the Spring ApplicationContext at test startup; `registry.add("spring.datasource.url", container::getJdbcUrl)` replaces the hardcoded test datasource URL with the actual container's URL
- **@AutoConfigureTestDatabase(replace = NONE)** — required when using TestContainers; without it, Spring's `@DataJpaTest` replaces your datasource with H2 automatically, ignoring your TestContainers Postgres datasource
- **Kafka with TestContainers**: `KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.0"))`; register `spring.kafka.bootstrap-servers` via `@DynamicPropertySource`; test the full message publishing + consuming round-trip
- **TestContainers Cloud**: when Docker in CI is slow or unavailable, Testcontainers Cloud delegates container management to a cloud service — faster startup, no Docker daemon needed in the CI runner

---

## 1. One-Line Definition
TestContainers is a Java library that programmatically starts real Docker containers for your dependencies (databases, message brokers, mail servers, etc.) as part of your test lifecycle, giving you production-equivalent infrastructure in a fully automated, isolated test environment.

---

## 2. The Problem It Solves

H2 in-memory database is the traditional `@DataJpaTest` default, but it has critical gaps:
- H2 doesn't support Postgres-specific features: `JSONB`, `ARRAY`, trigrams, `ON CONFLICT DO UPDATE`, lateral joins
- H2's SQL dialect is subtly different — queries that work on H2 fail on Postgres
- H2 doesn't enforce the same index behaviour, so performance test queries give false results

Options before TestContainers:
- Shared staging database: tests interfere with each other; cleanup is fragile; CI environments can't connect; the database isn't in a clean state
- Manual Docker setup in CI: brittle, environment-specific, hard to version

TestContainers solves all of this: the exact same database version you use in production, fresh per test or per test suite, portable to any machine with Docker, no shared state between test runs.

---

## 3. How It Works Internally

### Container Lifecycle

```
JVM-scoped singleton (reused across all test classes in a test run):

@Container
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
    .withDatabaseName("testdb")
    .withUsername("test")
    .withPassword("test");

@DynamicPropertySource
static void registerProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
}

Lifecycle:
  1. First test class that needs the container → container starts (5-15 seconds)
  2. Subsequent test classes sharing the same container → use existing (< 0ms)
  3. JVM shuts down → container shut down automatically via Ryuk (cleanup container)

Per-test lifecycle (slower, for full isolation):
  @Container (instance, not static) field → starts/stops with each test class
  Can be made per-method with @BeforeEach create / @AfterEach stop (slowest)
```

---

## 4. The Code

### Wrong Way — TestContainers Anti-Patterns

```java
// ❌ WRONG 1: Starting a new container per test class

@SpringBootTest
@Testcontainers
class OrderRepositoryTest {
    
    // ❌ Non-static @Container starts and stops a new Postgres container
    // for EVERY test class that uses this pattern
    // 5-15 second container start time × number of test classes = very slow CI
    @Container
    PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
    
    // ...
}

// ❌ WRONG 2: Not using @AutoConfigureTestDatabase(replace = NONE)

@DataJpaTest
@Testcontainers
class ProductRepositoryTest {
    
    // ❌ @DataJpaTest auto-replaces the datasource with H2
    // This @Container is never used — the DataJpaTest runs on H2 anyway
    // The Postgres-specific queries you're trying to test still run against H2
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
    
    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
    }
    // ← replace = AUTO_CLASS is the default; it overrides your datasource with H2
    // ← Need: @AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
}
```

```java
// ❌ WRONG 3: Not cleaning up data between tests

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class OrderRepositoryTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
    
    @Autowired OrderRepository orderRepository;
    
    @Test
    void test1_shouldCountOrders() {
        orderRepository.save(new Order(...));
        assertThat(orderRepository.count()).isEqualTo(1);
    }
    
    @Test
    void test2_expectsEmptyRepository() {
        // ❌ With a shared container and no @Transactional rollback,
        // test1's order is still in the database
        assertThat(orderRepository.count()).isEqualTo(0);  // FAILS — count is 1
    }
    
    // ✅ Fix: add @Transactional to test class (auto-rollback after each test)
    // or call orderRepository.deleteAll() in @BeforeEach
}
```

### Right Way — TestContainers Production Patterns

```java
// ✅ RIGHT — Shared container infrastructure base class (singleton pattern)

// AbstractIntegrationTest.java — base class for all integration tests
@SpringBootTest
@Testcontainers
@Transactional  // ← auto-roll back each test
public abstract class AbstractIntegrationTest {
    
    // ✅ static + @Container = JVM-scoped, starts once for the entire test run
    @Container
    protected static final PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("shop_test")
            .withUsername("test")
            .withPassword("test_secret")
            .withInitScript("sql/init-schema.sql");  // optional: run DDL before tests
    
    @Container
    protected static final KafkaContainer kafka =
        new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.0"));
    
    @Container
    protected static final GenericContainer<?> redis =
        new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);
    
    // ✅ @DynamicPropertySource registers container URLs before Spring context starts
    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        // Database
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        
        // Kafka
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
        
        // Redis
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }
}
```

```java
// ✅ RIGHT — @DataJpaTest with TestContainers for real Postgres queries

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@Transactional  // auto-rollback after each test
class ProductRepositoryIntegrationTest {
    
    @Container
    static final PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("product_test")
            .withUsername("test")
            .withPassword("test");
    
    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    
    @Autowired ProductRepository productRepository;
    @Autowired TestEntityManager entityManager;
    
    @BeforeEach
    void setUp() {
        // ✅ Seed test data using TestEntityManager (bypasses repo under test)
        entityManager.persist(new Product(null, "Laptop Pro", BigDecimal.valueOf(999.99),
            "electronics", true, Map.of("cpu", "i9", "ram", "32GB")));  // JSONB metadata
        entityManager.persist(new Product(null, "Wireless Mouse", BigDecimal.valueOf(29.99),
            "electronics", true, Map.of("connectivity", "Bluetooth", "dpi", "1600")));
        entityManager.flush();
    }
    
    @Test
    @DisplayName("Postgres JSONB query — findByMetadataKey (fails on H2)")
    void findByMetadata_shouldQueryJsonbCorrectly() {
        // ✅ This JPQL query uses a Postgres JSONB function
        // @Query("SELECT p FROM Product p WHERE p.metadata ->> :key IS NOT NULL")
        // This query FAILS on H2 — the ->> operator doesn't exist in H2
        // TestContainers with real Postgres proves this works
        List<Product> laptops = productRepository.findByMetadataKey("cpu");
        
        assertThat(laptops).hasSize(1);
        assertThat(laptops.get(0).getName()).isEqualTo("Laptop Pro");
    }
    
    @Test
    @DisplayName("ON CONFLICT DO UPDATE — upsert works correctly")
    void upsertProduct_shouldUpdateExisting() {
        // ✅ Tests a native query using PostgreSQL UPSERT syntax
        // @Query(value = "INSERT INTO products (sku, name, price) 
        //                 VALUES (:sku, :name, :price) 
        //                 ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price", 
        //        nativeQuery = true)
        productRepository.upsert("LAPTOP-001", "Laptop Pro", BigDecimal.valueOf(1099.99));
        entityManager.flush(); entityManager.clear();
        
        Product updated = productRepository.findBySku("LAPTOP-001").orElseThrow();
        assertThat(updated.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(1099.99));
    }
}
```

```java
// ✅ RIGHT — Full integration test with Kafka publish and consume round-trip

class OrderKafkaIntegrationTest extends AbstractIntegrationTest {
    
    @Autowired OrderService orderService;
    @Autowired KafkaConsumer<String, OrderCreatedEvent> testConsumer;
    
    @Test
    @DisplayName("createOrder — publishes OrderCreatedEvent to Kafka")
    void createOrder_shouldPublishEventToKafka() throws Exception {
        // ✅ Subscribe test consumer to the topic before trigger
        testConsumer.subscribe(List.of("orders.created"));
        
        // Trigger order creation
        OrderResponse response = orderService.createOrder(
            new OrderRequest("user-001", List.of(new OrderItemRequest(1L, 2)),
                new ShippingAddress("123 MG Road", "Bangalore", "560001"))
        );
        
        // ✅ Poll Kafka (real broker via TestContainers) for the event
        // Await library for async Kafka assertions
        await()
            .atMost(Duration.ofSeconds(10))
            .pollInterval(Duration.ofMillis(500))
            .untilAsserted(() -> {
                ConsumerRecords<String, OrderCreatedEvent> records =
                    testConsumer.poll(Duration.ofMillis(500));
                
                assertThat(records.count()).isGreaterThanOrEqualTo(1);
                
                OrderCreatedEvent event = records.iterator().next().value();
                assertThat(event.getOrderId()).isEqualTo(response.getOrderId());
                assertThat(event.getUserId()).isEqualTo("user-001");
            });
    }
    
    @Test
    @DisplayName("Order consumer — processes incoming event and updates inventory")
    void orderConsumer_shouldDecrementInventoryOnEvent() throws Exception {
        // ✅ Publish event directly to Kafka, verify the consumer handled it
        KafkaProducer<String, OrderCreatedEvent> producer = createTestProducer();
        
        OrderCreatedEvent event = OrderCreatedEvent.builder()
            .orderId(9999L)
            .userId("user-002")
            .items(List.of(new OrderLineItem(1L, 3)))
            .build();
        
        producer.send(new ProducerRecord<>("orders.created", "9999", event));
        producer.flush();
        
        // Wait for consumer to process it
        await()
            .atMost(Duration.ofSeconds(15))
            .until(() -> inventoryRepository.findByProductId(1L)
                .map(inv -> inv.getReservedQuantity() >= 3)
                .orElse(false));
        
        Inventory inventory = inventoryRepository.findByProductId(1L).orElseThrow();
        assertThat(inventory.getReservedQuantity()).isEqualTo(3);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why use TestContainers instead of a shared test database?"

**Hruday's answer:**
> Three problems with a shared test database.
>
> First, isolation. If test A creates an order and doesn't clean up, test B might see that order and fail. Parallel test runs make this worse — two CI pipelines simultaneously mutating the same database causes unpredictable failures. TestContainers gives each test run a fresh, isolated database instance.
>
> Second, environment portability. A shared test database is a specific machine or service that every developer and CI runner must connect to. Network access issues, VPN requirements, credentials management, and the database's own maintenance become problems. TestContainers runs inside the developer's or CI runner's local Docker daemon — no shared infrastructure needed.
>
> Third, reproducibility. The shared database accumulates schema migrations over time and may have a different state than what you expect. A TestContainers instance starts from a clean Docker image with a known schema, then applies your current migrations. The test always starts from a known state.
>
> The cost is Docker startup time (5-15 seconds for a Postgres container). The singleton pattern (static container reused across the entire test run) makes this a one-time cost, not a per-test cost.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you handle database migrations in TestContainers tests?"

**Hruday's answer:**
> Two options depending on tooling.
>
> If using Flyway or Liquibase (standard for Spring Boot): both frameworks auto-run migrations on application startup. When TestContainers provides a fresh Postgres container and Spring starts with `spring.flyway.enabled=true`, Flyway runs all your migration scripts against the container before any test runs. The test database schema always matches your current migration state. This is ideal — it also tests your migrations themselves (a broken migration script is caught in tests).
>
> For the `@DataJpaTest` slice specifically: Spring Boot's data slice doesn't start the full application, so auto-Flyway won't run by default. You can either use `@AutoConfigureTestDatabase(replace = NONE)` + `@FlywayTest` (Flyway test support), configure Flyway explicitly in test properties, or use the `withInitScript("sql/schema.sql")` on the container to run a DDL script directly.
>
> For faster tests that don't need the full migration history: use Hibernate's `spring.jpa.hibernate.ddl-auto=create-drop` in a `application-test.yml` to let Hibernate generate the schema from your JPA entity definitions. This is faster (no migration runs) but doesn't test your migration scripts.
>
> My recommendation: use Flyway auto-migration for integration tests (full confidence that both migrations and queries work). Use `create-drop` for fast slice tests focused on query correctness when migration testing is handled separately.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When is it NOT the right time to use TestContainers?"

**Hruday's answer:**
> TestContainers requires Docker. CI environments that run in containers themselves (Docker-in-Docker) can have permission issues. Some corporate CI environments don't allow Docker. TestContainers Cloud solves this but adds a dependency on an external service.
>
> More importantly, not every test NEEDS a real container. A service method that loads products, filters by category, calculates a total, and returns a DTO — that logic doesn't need a real database. A Mockito mock is the right tool: fast (milliseconds), no infrastructure, tests the business logic in isolation.
>
> I use TestContainers specifically when I need to verify: custom `@Query` methods and JPQL/SQL accuracy, Postgres-specific features (JSONB, arrays, full-text search), schema constraints and migration correctness, batch operations (that H2 might handle differently), or Kafka consumer/producer round-trips.
>
> For straightforward CRUD that uses only standard JPA methods (`save`, `findById`, `findAll`), H2 in `@DataJpaTest` is sufficient and faster. The decision is: does the test's value come from production-equivalent infrastructure, or from pure logic correctness? If infrastructure, TestContainers. If logic, mocks or H2.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the backend test infrastructure for a system that uses Postgres, Kafka, and Redis."

**Hruday's answer:**
> I'd use the abstract base class pattern with JVM-scoped TestContainers containers.
>
> `AbstractIntegrationTest` defines three static containers: `PostgreSQLContainer`, `KafkaContainer`, and `GenericContainer` for Redis. The `@DynamicPropertySource` static method registers all three's connection details into the Spring context. Every integration test class extends this base class and gets the infrastructure automatically.
>
> The container lifecycle: the JVM starts Postgres, Kafka, and Redis once at the beginning of the test run. All test classes share these containers. This makes the full infrastructure cost a one-time 15-20 second startup, not a per-class cost.
>
> For test isolation: I annotate all test methods with `@Transactional` (or annotate the test class) to roll back database state. For Kafka: I use random topic names or topic with a test run ID prefix to prevent message bleed across tests. For Redis: I run `redisTemplate.getConnectionFactory().getConnection().flushAll()` in `@BeforeEach` to start each test with an empty cache.
>
> For `@DataJpaTest` slice tests (faster, more focused): a separate container (Postgres only) with `@AutoConfigureTestDatabase(replace = NONE)`. These test repository queries in isolation.
>
> Test categories in CI: fast unit + slice tests (Mockito + H2) run on every PR under 2 minutes. Integration tests (AbstractIntegrationTest subclasses) run on merge to main under 8 minutes.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "TestContainers starts a new container per test" | "I use @Container on an instance field so each test has a fresh database" | Non-static @Container starts and stops a container for each test CLASS (not each test method); static @Container starts once per JVM; for per-method isolation, you'd need to create/destroy containers in @BeforeEach/@AfterEach — extremely slow; the correct isolation strategy is NOT to restart containers per test but to use @Transactional rollback or truncate table commands between tests; this gives strong isolation with a container that starts only once |
| "@DynamicPropertySource is not needed" | "I put the JDBC URL in application-test.yml" | TestContainers assigns a random available port to avoid conflicts with any running Postgres on the machine; you cannot know this port at test compile time; `application-test.yml` needs a fixed `spring.datasource.url=jdbc:postgresql://localhost:5432/test`; if Postgres is already running on port 5432, the test fails; `@DynamicPropertySource` reads the URL AFTER the container starts (when the actual port is known) and registers it before the Spring context is built; this is the only reliable way to connect Spring to a TestContainers container |
| "TestContainers only works with databases" | "I use TestContainers for Postgres and mock everything else" | TestContainers supports Kafka, Redis, MongoDB, Elasticsearch, RabbitMQ, MinIO, Keycloak, LocalStack (AWS), and literally any Docker image via GenericContainer; for Kafka specifically, the real broker is critical for testing consumer lag, partition assignment, offset commit behaviour, and consumer group behaviour — a Mockito-mocked KafkaTemplate cannot test any of this; teams that only use TestContainers for Postgres leave Kafka consumer logic untested except at the E2E level |

---

## 7. Hruday's Real Experience Hook
> "At Oracle (the e-commerce export service), the product import service used a PostgreSQL `ON CONFLICT DO UPDATE` upsert query to handle duplicate SKUs in CSV files. The `@DataJpaTest` tests used H2, which doesn't support `ON CONFLICT DO UPDATE` — so the native query tests were excluded with `@Disabled` and the feature was 'tested manually'.
>
> After switching to TestContainers for the repository tests, the first run immediately revealed a syntax error in the native query that had existed for 3 months — the column reference was wrong. The error only surfaced against real Postgres.
>
> Beyond that specific bug, we discovered that the upsert had an edge case with NULL categories — Postgres's `ON CONFLICT` clause and H2's behaviour differ on NULL uniqueness, which had caused 3 previous production incidents we'd attributed to 'data issues'. TestContainers traced them all to the same NULL handling bug.
>
> The container restart overhead was 12 seconds per JVM run, shared across all tests — completely acceptable for the confidence gain."

---

## 8. Scale Evolution

**1,000 users →** `@DataJpaTest` with H2 for simple queries; TestContainers Postgres for Postgres-specific tests; JVM-scoped singleton; test run under 3 minutes.

**100,000 users →** TestContainers for Postgres + Kafka; abstract base class shared across service's 15+ test classes; LocalStack (AWS) for S3 integration tests; parallel test modules with independent containers.

**10 million users →** Testcontainers Cloud (remote container management for CI without Docker daemon); reusable containers (`TESTCONTAINERS_REUSE_ENABLE=true`) preserving containers between local test runs for sub-second startup after the first run; dedicated TestContainers integration test stage in CI pipeline separate from unit test stage.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment ledger queries — Postgres-specific window functions for running balances, `JSONB` for payment metadata; TestContainers prevents H2 from silently masking window function incompatibilities | Postgres JSONB + window functions requiring TestContainers; upsert/idempotency native queries |
| Swiggy / Meesho | Product catalog with full-text search (`pg_trgm`, `to_tsvector`); Kafka consumer integration (order processing pipeline); Redis cache warming tests | TestContainers for full-text search tests; Kafka container for consumer round-trip; Redis container for cache logic |
| Adobe / Microsoft | Document storage queries (complex metadata queries); Azure Service Bus testing via GenericContainer with Azurite emulator; multi-tenant test isolation | GenericContainer for Azure emulators; tenant isolation testing; migration testing with Flyway |
| SAP Labs | Oracle story: ON CONFLICT upsert bug found only after TestContainers; H2 masked the issue for 3 months causing repeated production incidents; direct before/after measurable | Specific ON CONFLICT bug story; before (H2 masked it) vs after (TestContainers caught it); quantified impact |

---

## 10. Related Topics — What to Study Next

- **Topic 258 — Spring Boot Unit Testing** — `@DataJpaTest` with H2 is the starting point for repository tests; this topic covers when to upgrade from H2 to TestContainers and how to configure `@AutoConfigureTestDatabase(replace = NONE)` correctly
- **Topic 261 — Contract Testing with Pact** — TestContainers handles real infrastructure (databases, Kafka); Pact handles real API contracts between services; the two work at different levels of the integration test stack and complement each other
- **Topic 259 — Mockito Deep Dive** — Mockito mocks replace the database and Kafka for service-layer unit tests; TestContainers provides the real infrastructure for repository and integration tests; understanding when each is appropriate is the core of a mature testing strategy
- **Topic 244 — N+1 Query Problem** — database integration tests with TestContainers are the correct environment to detect and verify N+1 query fixes; running the same code against H2 might not trigger the same query execution plan, but real Postgres via TestContainers shows the actual query count through JPA query logging

---

*Part 15 · TestContainers · Full Stack Interview Guide · Hruday D · 2026*
