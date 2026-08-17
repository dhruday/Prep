# Contract Testing with Pact — Consumer-Driven Contracts
> Part 15 — Testing Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Problem Pact solves**: when Service A mocks Service B's API in unit tests, if Service B changes its API, Service A's tests still pass (because they use the mock) while real integration fails — "tests pass but prod breaks"
- **Consumer-driven contracts**: the CONSUMER (Service A) writes a test describing the API it expects from the PROVIDER (Service B); this generates a pact file (JSON contract); the PROVIDER then runs this contract against its actual implementation to verify it can fulfill the consumer's expectations
- **Pact Broker**: a central server that stores pact files and reports which versions are compatible; `can-i-deploy` before any deployment checks whether the deployed versions are compatible — blocks deployment if the contract is broken
- **Consumer test (using Pact JVM)**: starts a local mock provider server with the expected request/response; your consumer code runs against this; if the code makes the exact expected request and handles the response, the test generates the pact file
- **Provider verification**: the provider loads the pact file from the Pact Broker and replays each consumer interaction against the REAL provider code; if the provider generates a different response, the verification fails
- **Pact vs integration testing**: integration tests need both services running simultaneously; Pact tests each service independently; the contract is the bridge between them — faster, more isolated, still catches API drift

---

## 1. One-Line Definition
Pact is a consumer-driven contract testing framework where the API consumer specifies what it needs from a provider, generating a contract file that the provider must verify against its real implementation — replacing brittle integration environments with fast, independent, per-service tests.

---

## 2. The Problem It Solves

In a microservices architecture, `OrderService` calls `ProductService` to check stock. In `OrderService`'s tests, `ProductService` is mocked: `when(productClient.getProduct(1L)).thenReturn(...)`. The tests pass.

Later, `ProductService` renames the `stockCount` field to `availableQuantity` in their API. `ProductService`'s own tests pass. `OrderService`'s tests pass. But in production, `OrderService` reads `null` from `stockCount` and treats every product as out of stock. Both services silently broke the integration.

Pact prevents this by making the consumer's expectations into a contract that the provider must continuously verify. The moment `ProductService` renames the field, the Pact verification fails, and `ProductService`'s CI blocks the deployment.

---

## 3. How It Works Internally

### Pact Flow

```
CONSUMER SIDE (OrderService):

  1. Write a Pact Consumer test:
     - Define expected request: GET /api/products/1 with Accept: application/json
     - Define expected response: 200 with body { "id": 1, "name": "...", "stockCount": 10 }
     - Pact starts a mock HTTP server with this response pre-configured
     - Run your real consumer code (ProductServiceClient) against the mock
     - If the code makes the right request and parses the response, test PASSES
     - Pact generates: orders-products.json (the pact file)

  2. Publish pact file to Pact Broker (CI step after consumer tests pass)

PROVIDER SIDE (ProductService):

  3. Provider verification test:
     - Pact downloads orders-products.json from the Pact Broker
     - For each interaction in the file, Pact sends the expected request to the REAL ProductService
     - The REAL ProductService must return a response matching the contract
     - If ProductService returns { "availableQuantity": 10 } instead of { "stockCount": 10 } → FAILS

DEPLOYMENT GATE:

  4. can-i-deploy check:
     - Before deploying OrderService v2.3.1 to staging:
       pact-broker can-i-deploy --pacticipant OrderService --version 2.3.1 --to staging
     - Broker checks: is the pact between OrderService v2.3.1 and the deployed ProductService verified?
     - If NO: deployment blocked
```

---

## 4. The Code

### Wrong Way — What Pact Replaces

```java
// ❌ WRONG — Mocking the provider in consumer tests (no contract generated)
// These tests give false confidence — they pass when the API changes

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    
    @Mock ProductServiceClient productClient;   // ← Mockito mock of the HTTP client
    @InjectMocks OrderService orderService;
    
    @Test
    void createOrder_shouldCheckStock() {
        // ❌ This mock is a pure fiction — ProductServiceClient's real behaviour is irrelevant
        // The assumed response shape { stockCount: 10 } is never validated against the real API
        when(productClient.getProduct(1L))
            .thenReturn(new ProductDto(1L, "Laptop", BigDecimal.valueOf(999), 10));
        
        OrderResponse result = orderService.createOrder(new OrderRequest("user-1", List.of(
            new OrderItemRequest(1L, 2)
        ), address));
        
        assertThat(result.getStatus()).isEqualTo("CONFIRMED");
        // ← Test passes even if real ProductService returns { "availableQty": 10 }
        //   (no stockCount field in real API)
    }
}
```

### Right Way — Consumer Contract Test

```java
// ✅ RIGHT — Pact Consumer test (OrderService tests the API contract it needs)

@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "ProductService", port = "8081")
class OrderServicePactConsumerTest {
    
    // ✅ Define the contract: what the consumer NEEDS from the provider
    @Pact(consumer = "OrderService")
    public RequestResponsePact getProductPact(PactDslWithProvider builder) {
        return builder
            .given("Product with ID 1 exists and is in stock")   // provider state
            .uponReceiving("GET request for product 1")          // interaction name
            .path("/api/products/1")
            .method("GET")
            .headers(Map.of("Accept", "application/json"))
            .willRespondWith()
            .status(200)
            .headers(Map.of("Content-Type", "application/json"))
            .body(new PactDslJsonBody()
                // ✅ Type-based matching: field must exist and be an integer
                // More flexible than exact value matching — exact values cause false negatives
                .integerType("id")
                .stringType("name")         // must be a string, any value
                .decimalType("price")       // must be a number
                // ✅ Key contract: stockCount must exist and be an integer ≥ 0
                // This is the field OrderService depends on for stock check
                .integerType("stockCount")
                .booleanType("active")
            )
            .toPact();
    }
    
    @Pact(consumer = "OrderService")
    public RequestResponsePact getProductNotFoundPact(PactDslWithProvider builder) {
        return builder
            .given("Product with ID 999 does not exist")
            .uponReceiving("GET request for non-existent product 999")
            .path("/api/products/999")
            .method("GET")
            .willRespondWith()
            .status(404)
            .body(new PactDslJsonBody()
                .stringType("message")
                .integerType("status")
            )
            .toPact();
    }
    
    // ✅ The REAL ProductServiceClient runs against Pact's mock server
    // If the client makes the right request and parses the response, test passes
    // AND a pact file is generated
    
    @Test
    @PactTestFor(pactMethod = "getProductPact")
    void getProduct_whenProductExists_shouldReturnProductDetails(MockServer mockServer) {
        // ✅ Real HTTP client configured to hit the Pact mock server
        ProductServiceClient client = new ProductServiceClient(
            WebClient.builder().baseUrl(mockServer.getUrl()).build()
        );
        
        ProductDto product = client.getProduct(1L);
        
        // ✅ Assert that the client correctly parsed the response
        assertThat(product.getId()).isNotNull();
        assertThat(product.getName()).isNotBlank();
        assertThat(product.getStockCount()).isGreaterThanOrEqualTo(0);
    }
    
    @Test
    @PactTestFor(pactMethod = "getProductNotFoundPact")
    void getProduct_whenProductNotFound_shouldThrowNotFoundException(MockServer mockServer) {
        ProductServiceClient client = new ProductServiceClient(
            WebClient.builder().baseUrl(mockServer.getUrl()).build()
        );
        
        assertThatThrownBy(() -> client.getProduct(999L))
            .isInstanceOf(ProductNotFoundException.class);
    }
}
```

```java
// ✅ RIGHT — Provider verification test (ProductService verifies it can fulfill contracts)

@Provider("ProductService")     // ← must match the providerName in consumer test exactly
@PactBroker(
    url = "${PACT_BROKER_URL}",
    authentication = @PactBrokerAuth(token = "${PACT_BROKER_TOKEN}")
)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProductServicePactProviderVerificationTest {
    
    @LocalServerPort
    int port;
    
    @MockBean
    ExternalTaxService taxService;   // mock only outside-system dependencies
    
    @BeforeEach
    void setUp(PactVerificationContext context) {
        // ✅ Point Pact at our real running Spring Boot application
        context.setTarget(new HttpTestTarget("localhost", port));
    }
    
    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        // ✅ Pact replays each consumer interaction and verifies the response
        context.verifyInteraction();
    }
    
    // ✅ Provider state setup — when the consumer says "given Product with ID 1 exists and is in stock"
    // the provider must set up its test data to match that state
    @State("Product with ID 1 exists and is in stock")
    void productWithId1InStock() {
        // Seed the database (real DB via TestContainers, or application state)
        productRepository.save(new Product(1L, "Laptop Pro", BigDecimal.valueOf(999.99),
            "electronics", true, 15));  // stockCount = 15 (≥ 1, matches consumer's integerType check)
    }
    
    @State("Product with ID 999 does not exist")
    void productWith999DoesNotExist() {
        productRepository.deleteById(999L);  // ensure it doesn't exist
        // If using TestContainers with @Transactional rollback, nothing needed —
        // product 999 won't exist in a clean test DB
    }
}
```

```yaml
# application-test.yml
# ✅ Pact Broker configuration for CI
pact:
  broker:
    url: ${PACT_BROKER_URL:http://pactbroker.internal:9292}
    authentication:
      token: ${PACT_BROKER_TOKEN}

# can-i-deploy check in CI (shell / Makefile / GitHub Actions step):
# pact-broker can-i-deploy \
#   --pacticipant OrderService \
#   --version ${GIT_COMMIT_SHA} \
#   --to-environment staging \
#   --broker-base-url ${PACT_BROKER_URL}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is consumer-driven contract testing and why is it better than integration testing?"

**Hruday's answer:**
> Consumer-driven contract testing flips the traditional model. Instead of running both services simultaneously in an integration test (slow, infrastructure-heavy, difficult to own), the consumer defines what it needs and turns that into a contract. The provider verifies the contract independently.
>
> The consumer — say, OrderService which calls ProductService — writes a Pact test describing: "I will call GET /api/products/1, and I need a response with an integer `id`, a string `name`, and an integer `stockCount`." Pact generates a JSON contract file from this test.
>
> ProductService then takes this contract and runs a verification test against its real code: does GET /api/products/1 actually return those fields? If ProductService renames `stockCount` to `availableQuantity`, the verification fails and ProductService's CI alerts the team.
>
> The advantages over integration testing: each test runs independently (no both-services-up requirement), tests are faster (no real network, just contract verification), the consumer owns the contract (it expresses exactly what it needs, not what the provider incidentally provides), and `can-i-deploy` gives teams a deployment gate that automatically blocks incompatible versions from reaching the same environment.

---

### Q2 — Deep Dive
**Interviewer asks:** "What are provider states in Pact and why are they important?"

**Hruday's answer:**
> Provider states bridge the gap between a consumer's test assumption and the provider's test data.
>
> When the consumer writes "given Product with ID 1 exists and is in stock", they're saying "set up your test environment so that product 1 exists before you run this contract". The consumer doesn't control the provider's database — only the provider knows how to set up product 1. Provider states let the consumer declare the precondition, and the provider implements how to fulfill it.
>
> In the provider verification test, a `@State("Product with ID 1 exists and is in stock")` annotated method runs before that specific interaction is replayed. The method seeds the database, configures a mock, or calls a test fixture to create product 1.
>
> Without provider states, the verification assumes a static database state — the test will flicker depending on whether another test happened to create or delete products. Provider states make contract verification deterministic.
>
> The key design decision: keep states broad and semantic ("product in stock", "user authenticated", "cart is empty") rather than specific ("product 1 has name Laptop Pro and SKU LP-001"). Broad states survive data changes; specific states break on any data refactor.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Pact vs end-to-end integration tests — when would you choose each?"

**Hruday's answer:**
> Pact and E2E integration tests serve different purposes.
>
> Pact verifies the CONTRACT between two services: does OrderService's assumption about ProductService's API shape hold? It's fast (runs without real infrastructure), owned by individual service teams, and blocks deployment on API drift. It does NOT test: business logic across services, real data flow, performance, or cascading failures.
>
> E2E integration tests (with real deployed services in a staging environment) verify that the system works as a whole: a customer places an order, payment is processed, notification is sent, inventory is decremented. This catches: wrong event sequencing, timeout and retry interactions, database consistency across services, configuration mismatches in deployed environments.
>
> The right combination: Pact for every API integration (covers 80% of integration failures from API drift), and a lean set of key-journey E2E tests in staging (covers the other 20% that require real deployment context). Trying to replace Pact with more E2E tests is expensive and slow. Trying to replace E2E tests with only Pact misses system-level behaviour.
>
> My production rule: if a service calls another service via HTTP, there should be a Pact contract for it. The E2E tests in staging are reserved for the 5-10 most critical user journeys, not for API shape verification.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "How do you integrate Pact into a CI/CD pipeline for 8 microservices that all call each other?"

**Hruday's answer:**
> The central piece is a Pact Broker. Every service in the system publishes its consumer pacts to the broker after consumer tests pass. Every service runs provider verification against all pacts from services that consume it. The broker tracks: which version of Service A is compatible with which version of Service B.
>
> The `can-i-deploy` check runs before every deployment stage. Before OrderService v2.3 can deploy to staging, the CI pipeline runs: `pact-broker can-i-deploy --pacticipant OrderService --version 2.3 --to-environment staging`. The broker checks: has every pact that OrderService v2.3 depends on been verified by the corresponding provider's deployed version in staging? If yes, deploy. If no, block.
>
> For 8 services with many cross-calls, the broker's compatibility matrix shows which version combinations are safe. Teams can deploy independently. The web of Mockito mocks that used to couple services' test suites is replaced by verified contracts in the broker.
>
> The tooling decision: self-hosted Pact Broker (open source, needs maintenance) vs PactFlow (SaaS Pact Broker with additional features like bi-directional contracts and API spec uploading). For large teams, PactFlow's `can-i-deploy` visibility across all services is worth the cost.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Pact replaces integration tests" | "With Pact, we don't need a staging integration environment" | Pact verifies API contracts — that the request/response shape is agreed upon; it does NOT verify that the business logic across services produces the correct end-to-end outcome; a Pact test for the order flow would tell you "OrderService correctly calls ProductService's GET /api/products/{id}"; it would NOT tell you whether the full order creation → inventory decrement → Kafka publish → notification chain works correctly in a real deployed environment; keep a staging environment with real integration tests for critical user journeys; use Pact to eliminate the API drift category of failures |
| "Use exact value matchers in Pact contracts" | "My Pact contract checks that id=1 and name='Laptop Pro'" | Exact value matching causes constant false negatives — if the provider test seeds a product with name 'Laptop Pro V2' (slightly different), the contract verification fails even though the field shape is correct; use type matchers: `integerType("id")`, `stringType("name")`, `decimalType("price")`; exact value matchers should only be used for values that are TRULY invariant and semantically important — like an enum value or a specific status string; the purpose of the contract is to verify SHAPE and required fields, not to assert specific data values |
| "The consumer can break the provider's build" | "Consumers add new required fields to the contract whenever they want" | The consumer unilaterally breaking the provider's CI is a social/process problem, not a Pact technical issue; the solution is a "pending pacts" feature — new contracts start in a pending state and don't break the provider's CI until the provider explicitly acknowledges them; this allows consumer-driven development (consumer writes what they need, provider plans implementation) without blocking the provider's deployments; PactFlow handles this with pending and WIP pacts; teams must agree on the process: consumers communicate new requirements before committing to contracts, providers have a service level for responding |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had an Inventory Service that was consumed by 3 services: OrderService, WishlistService, and ReportingService. The team maintaining Inventory Service made a 'backward compatible' change — they added a wrapper object: instead of `{ "stockCount": 10 }`, the response became `{ "data": { "stockCount": 10 }, "meta": { ... } }`.
>
> All three consumer services had Mockito mocks returning the old flat structure. All three consumer service test suites passed. Inventory Service's own tests passed. The change went to staging and all three consumers immediately threw NullPointerException from trying to read `stockCount` at the root level.
>
> After rolling back, we introduced Pact. OrderService's consumer test defined `body.data.integerType("stockCount")` (nested under `data`). The Inventory Service could not have made this change without the provider verification test catching it. The `can-i-deploy` check would have blocked the staging deployment with a clear error: "OrderService v2.1 pact is not verified by InventoryService v1.9" — preventing the rollback entirely."

---

## 8. Scale Evolution

**1,000 users →** Pact for 2-3 critical service integrations; self-hosted Pact Broker; consumer tests in each service's test suite; provider verification in CI; `can-i-deploy` before staging deployment.

**100,000 users →** PactFlow (hosted Pact Broker); contracts for every HTTP/REST integration across 8+ services; pending pacts for new consumer requirements; Pact webhooks triggering provider verification when new pacts are published.

**10 million users →** Bi-directional contract testing (PactFlow uploads OpenAPI spec for provider side, Pact tests for consumer side — both verified against the spec); event-driven contract testing for Kafka schemas (Confluent Schema Registry + Pact); automated contract version selection in PR preview environments.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment service has multiple consumers (checkout service, refund service, reconciliation service); API changes break all consumers; Pact prevents silent API drift in payment flows | Specific contract for payment status field shapes; provider states for payment pending/confirmed/failed; can-i-deploy blocking |
| Swiggy / Meesho | ProductService, CartService, OrderService, DeliveryService all call each other; rapid deployment cadence means API drift is frequent risk; Pact provides deployment confidence | Multiple consumer pacts for a single provider; PactFlow for visibility; bilateral deployment safety |
| Adobe / Microsoft | Document API consumed by many internal clients; strict API versioning requirements; Pact complements OpenAPI specs | Bi-directional contracts with OpenAPI upload; v2 API migration with parallel pact verification |
| SAP Labs | Inventory Service wrapper change story — all 3 consumers broke simultaneously; Mockito mocks hid the issue; Pact implemented after rollback incident; direct measurable impact | Specific 3-service incident story; flat vs nested JSON body change; Pact consumer test preventing the breaking change |

---

## 10. Related Topics — What to Study Next

- **Topic 258 — Spring Boot Unit Testing** — the `@MockBean` pattern in Spring tests replaces external service clients; understanding when Mockito `@MockBean` is sufficient vs when Pact contracts are needed is the core decision: `@MockBean` for persistence layer dependencies, Pact for cross-service API contracts
- **Topic 260 — TestContainers** — Pact provider verification tests often need a real database to set up provider states correctly; TestContainers provides the Postgres/Kafka containers that provider state `@State` methods use to seed test data
- **Topic 259 — Mockito Deep Dive** — Pact does NOT replace Mockito; the two work at different layers: Mockito replaces collaborators within a single service's boundary; Pact bridges the contract between two separate services; both are part of a complete testing strategy
- **Topic 303 — API Versioning Strategies** — contract testing and API versioning are deeply related; understanding backward compatibility, versioning strategies (URL versioning, header versioning), and deprecation policies helps you design pacts that survive API evolution

---

*Part 15 · Contract Testing with Pact · Full Stack Interview Guide · Hruday D · 2026*
