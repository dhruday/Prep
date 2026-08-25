# API Testing — RestAssured, MockMvc
> Part 15 — Testing Strategy (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **MockMvc** tests Spring MVC controllers **without starting a real server** — it uses a `TestDispatcherServlet` internally, which is Spring's internal HTTP handling engine; fast, lightweight, ideal for unit-testing your REST layer in isolation
- **`@WebMvcTest(MyController.class)`** loads only the web layer (controllers, filters, `@ControllerAdvice`, security config) and nothing else — repositories and services are NOT loaded; you mock them with `@MockBean`; this makes tests 5–10x faster than `@SpringBootTest`
- **RestAssured** is a fluent Java DSL for testing HTTP endpoints — `given().header("Authorization", token).when().get("/api/reports").then().statusCode(200).body("data.size()", equalTo(5))` — it tests a running server (real or embedded Spring Boot)
- **`io.rest-assured:spring-mock-mvc`** gives you the RestAssured fluent syntax on top of MockMvc — no server needed, fast tests, readable assertions; best of both worlds
- **`@SpringBootTest` vs `@WebMvcTest`**: SpringBootTest loads the full application context (all beans, real DB connection if not mocked) — use it for integration tests; WebMvcTest loads only MVC layer — use it for controller unit tests; SpringBootTest is ~5x slower
- **The interview trap**: confusing "unit testing a controller" (`@WebMvcTest`) with "integration testing the full stack" (`@SpringBootTest + TestContainers`) — they're different layers with different scope, speed, and cost

---

## 1. One-Line Definition
MockMvc and RestAssured are the two primary tools for testing Spring Boot REST APIs — MockMvc tests the controller layer without a server (fast, isolated), while RestAssured provides a fluent HTTP DSL for testing against a running (or embedded) server (realistic, end-to-end at the service level).

---

## 2. The Problem It Solves

A team builds a REST API for a report management service. It has a `GET /api/reports/{id}` endpoint. The logic inside: validate the user has access, fetch the report from the database, map it to a DTO, return it.

Without API tests, the only way to verify this works is to manually call the endpoint via Postman. That's not repeatable. It doesn't run in CI. If a developer breaks the JSON structure — renames `reportId` to `id` in the response — no test catches it. The frontend team finds out when requests start returning 404 or a missing field.

With `@WebMvcTest` and MockMvc, a test verifies:
- The endpoint returns 200 with the correct JSON shape
- The endpoint returns 404 when the report doesn't exist
- The endpoint returns 403 when the user doesn't have access

Each test runs in under 200ms because there's no server, no real database. The whole controller test suite — 20 tests — completes in under 3 seconds.

With RestAssured on top of `@SpringBootTest`, a separate integration test suite verifies the full stack (controller + service + real database via TestContainers) — this is slower (seconds per test) but tests the complete request path.

---

## 3. How It Works Internally

### The Mental Model

**MockMvc** is like testing a restaurant's kitchen by plugging directly into the order management system — you send in an order (HTTP request), it goes through the full dispatch process (DispatcherServlet, interceptors, controller), and you get back a tray (HTTP response) — but no actual customers entered the restaurant, no tables were set, no front door was opened. The server isn't running. You're testing the kitchen in isolation.

**RestAssured** is like being a real customer sitting at the table — you send an HTTP request over a real network to a real running server. The request travels through the entire stack.

### The Mechanism — What MockMvc Does Internally

```
MOCKMVC INTERNAL FLOW
──────────────────────────────────────────────────────────────
  mockMvc.perform(get("/api/reports/42"))
        ↓
  MockHttpServletRequest is created (no actual network call)
        ↓
  TestDispatcherServlet processes it:
    ┌──────────────────────────────────────────────────────┐
    │  Filter chain (security filters, CORS filters etc.)  │
    │         ↓                                            │
    │  Handler mapping (finds ReportController.getById)    │
    │         ↓                                            │
    │  Controller method is called                         │
    │  (calls @MockBean ReportService — returns mock data) │
    │         ↓                                            │
    │  Return value → Jackson serializes to JSON           │
    │         ↓                                            │
    │  MockHttpServletResponse                             │
    └──────────────────────────────────────────────────────┘
        ↓
  ResultActions: .andExpect(status().isOk())
                 .andExpect(jsonPath("$.reportId").value(42))
                 .andExpect(content().contentType("application/json"))
```

### `@WebMvcTest` vs `@SpringBootTest` — What Gets Loaded

```
@WebMvcTest(ReportController.class)              @SpringBootTest
────────────────────────────────────             ────────────────────────────
✅ ReportController                              ✅ All @Component beans
✅ @ControllerAdvice (ExceptionHandler)          ✅ ReportController
✅ Security configuration                        ✅ ReportService
✅ Jackson MessageConverters                     ✅ ReportRepository
✅ WebMvcConfigurer beans                        ✅ Database connection (real)
                                                 ✅ All autoconfiguration
❌ ReportService (NOT loaded — mock it)
❌ ReportRepository (NOT loaded — mock it)       Slow. Full context.
❌ Database                                      Use for integration tests.
❌ Kafka listeners
❌ Scheduled tasks                               
Fast. Use for controller unit tests.
```

---

## 4. The Code

### Wrong Way — Integration Tests for Everything
```java
// ❌ WRONG: Using @SpringBootTest for every controller test
// This starts the full application context every time
// Including database connections, Kafka, scheduled tasks, everything

@SpringBootTest               // ← loads ALL beans
@AutoConfigureMockMvc         // ← adds MockMvc to the full context
class ReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    // ❌ This works, but it's slow because the full context starts up
    // Every test class that does this adds 5–15 seconds of startup time
    // In a project with 30 controller test classes, that's minutes of wasted CI time
    // Also: it requires a database to be available (or an in-memory one)
    // That makes the test environment-dependent

    @Test
    void getReport_returnsReport() throws Exception {
        mockMvc.perform(get("/api/reports/42"))
               .andExpect(status().isOk());
    }
}
```
> **Why this fails in production:** `@SpringBootTest` loads the full context — all beans, database, messaging. A controller unit test doesn't need any of that. In a large project with 50+ controller test classes, each using `@SpringBootTest`, CI test startup time alone can add 10+ minutes. The intent is to isolate the controller layer, not test everything at once.

### Right Way — MockMvc with `@WebMvcTest`
```java
// ✅ RIGHT: @WebMvcTest loads only the web layer

@WebMvcTest(ReportController.class)      // only loads this controller + web config
@Import(SecurityTestConfig.class)        // import a test security config (bypasses auth)
class ReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;   // Jackson mapper for serialising request bodies

    // @MockBean creates a Mockito mock AND registers it in the Spring context
    // Controllers can @Autowire ReportService — this mock satisfies that dependency
    @MockBean
    private ReportService reportService;

    @Test
    void getReport_whenExists_returns200WithBody() throws Exception {
        // Arrange — define what the mock service returns
        ReportDto reportDto = new ReportDto(42L, "Q3 Revenue", "PUBLISHED", 1200000L);
        given(reportService.findById(42L)).willReturn(Optional.of(reportDto));

        // Act + Assert — perform the request and check response
        mockMvc.perform(get("/api/reports/42")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-User-Id", "user-101"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.reportId").value(42))
               .andExpect(jsonPath("$.title").value("Q3 Revenue"))
               .andExpect(jsonPath("$.status").value("PUBLISHED"))
               .andExpect(jsonPath("$.revenue").value(1200000));
    }

    @Test
    void getReport_whenNotFound_returns404() throws Exception {
        given(reportService.findById(999L)).willReturn(Optional.empty());

        mockMvc.perform(get("/api/reports/999"))
               .andExpect(status().isNotFound())
               .andExpect(jsonPath("$.message").value("Report not found"));
    }

    @Test
    void createReport_withValidBody_returns201() throws Exception {
        CreateReportRequest request = new CreateReportRequest("Q4 Revenue", "DRAFT");
        ReportDto created = new ReportDto(43L, "Q4 Revenue", "DRAFT", 0L);

        given(reportService.create(any(CreateReportRequest.class))).willReturn(created);

        mockMvc.perform(post("/api/reports")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))  // serialise the request body
               .andExpect(status().isCreated())
               .andExpect(jsonPath("$.reportId").value(43))
               .andExpect(header().string("Location", "/api/reports/43")); // REST convention
    }

    @Test
    void createReport_withMissingTitle_returns400() throws Exception {
        // Validate that @Valid on the request body triggers a 400 for blank title
        CreateReportRequest invalidRequest = new CreateReportRequest("", "DRAFT");

        mockMvc.perform(post("/api/reports")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(invalidRequest)))
               .andExpect(status().isBadRequest())
               .andExpect(jsonPath("$.errors[0].field").value("title"));
    }
}
```

### Right Way — RestAssured for Integration Tests
```java
// ✅ RIGHT: RestAssured against a full SpringBootTest
// Use this for integration tests that need a real database (TestContainers)

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
// RANDOM_PORT starts a real embedded Tomcat on a random port — avoids port conflicts in CI
class ReportIntegrationTest {

    @LocalServerPort
    private int port;    // Spring injects the actual random port here

    @Autowired
    private ReportRepository reportRepository;  // real repo — real DB via TestContainers

    @BeforeEach
    void setUp() {
        // RestAssured needs to know the base URL for every request
        RestAssured.baseURI = "http://localhost";
        RestAssured.port = port;

        // Clean up test data before each test — important for test isolation
        reportRepository.deleteAll();
    }

    @Test
    void getReport_returnsCorrectJson() {
        // Insert test data directly via repository — faster than API calls for setup
        Report saved = reportRepository.save(new Report("Q3 Revenue", "PUBLISHED", 1200000L));

        // RestAssured: given → when → then
        given()
            .contentType(ContentType.JSON)
            .header("Authorization", "Bearer " + getTestToken())
        .when()
            .get("/api/reports/{id}", saved.getId())
        .then()
            .statusCode(200)
            .body("reportId", equalTo(saved.getId().intValue()))
            .body("title", equalTo("Q3 Revenue"))
            .body("status", equalTo("PUBLISHED"));
    }

    @Test
    void createReport_thenGetIt_endToEnd() {
        String requestBody = """
            {
                "title": "Q4 Revenue",
                "status": "DRAFT"
            }
            """;

        // Step 1: create the report
        int createdId =
            given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + getTestToken())
                .body(requestBody)
            .when()
                .post("/api/reports")
            .then()
                .statusCode(201)
                .extract().path("reportId");  // extract the created ID from response

        // Step 2: verify we can retrieve it
        given()
            .header("Authorization", "Bearer " + getTestToken())
        .when()
            .get("/api/reports/{id}", createdId)
        .then()
            .statusCode(200)
            .body("title", equalTo("Q4 Revenue"));
    }

    private String getTestToken() {
        // In a real test: call the login endpoint with a test user
        // Or inject a pre-signed test JWT for integration tests
        return "test-jwt-token-for-ci";
    }
}
```

### Right Way — RestAssured + MockMvc (best of both worlds)
```java
// ✅ RestAssured with MockMvc integration
// io.rest-assured:spring-mock-mvc dependency
// Fluent RestAssured syntax + no server + fast @WebMvcTest speed

@WebMvcTest(ReportController.class)
class ReportControllerRestAssuredTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReportService reportService;

    @BeforeEach
    void setUp() {
        // Wire RestAssured to use MockMvc instead of a real HTTP server
        RestAssuredMockMvc.mockMvc(mockMvc);
    }

    @Test
    void getReports_returnsList() {
        given(reportService.findAll()).willReturn(List.of(
            new ReportDto(1L, "Q1", "PUBLISHED", 900000L),
            new ReportDto(2L, "Q2", "PUBLISHED", 1100000L)
        ));

        // RestAssured fluent DSL — reads like plain English
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/reports")
        .then()
            .statusCode(200)
            .body("size()", equalTo(2))           // list has 2 items
            .body("[0].title", equalTo("Q1"))
            .body("[1].title", equalTo("Q2"));
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between `@WebMvcTest` and `@SpringBootTest` for testing Spring Boot APIs?"

**Hruday's answer:**
> "`@WebMvcTest` loads only the web layer — controllers, filters, advice, and the security config. It does not load services, repositories, or any infrastructure beans. This makes it very fast — the Spring context starts in under a second. I use it for testing one controller at a time. Services and repositories are mocked with `@MockBean`.
>
> `@SpringBootTest` loads the full application context — every bean, every auto-configuration, database connections, messaging, everything. It's much slower but gives you the full real application. I use it for integration tests where I need the entire spring stack running, typically combined with TestContainers for a real database.
>
> The discipline is: use `@WebMvcTest` for controller unit tests — verifying HTTP status codes, response JSON shapes, request validation, and exception handling. Use `@SpringBootTest` for integration tests that test database writes, transaction behavior, or the full request-to-database path. In practice, 80% of my API tests are `@WebMvcTest` and maybe 20% are `@SpringBootTest` for integration scenarios. At Oracle, following this split was how we maintained 85% test coverage without CI taking more than 5 minutes to run."

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you test a controller method that checks user authorization — for example, a user can only fetch their own reports?"

**Hruday's answer:**
> "There are two layers to this. First I test the controller logic: I mock the ReportService and write a test for the case where the service throws `AccessDeniedException`. I mock `reportService.findById(42L)` to throw `new AccessDeniedException("not your report")`, call `GET /api/reports/42`, and assert that the `@ControllerAdvice` handles it with a 403 status and the right error body. This is a `@WebMvcTest` test — it verifies the error handling wiring.
>
> Second, if authorization is in a Spring Security filter or a `@PreAuthorize` annotation, I set up a specific security test configuration. `@WithMockUser(roles = 'USER')` from Spring Security Test lets me run a test as a specific user. I test both the happy path — user calling their own report returns 200 — and the forbidden path — user calling someone else's report returns 403.
>
> The key is: test the security boundary at the controller level in `@WebMvcTest`, because filters and security config ARE loaded in this slice. You don't need `@SpringBootTest` for security testing. I always write at least three security cases: unauthenticated (401), authenticated but wrong role or ownership (403), authenticated and authorised (200). That gives real confidence in the access control without any production database."

---

### Q3 — Trade-Off Question
**Interviewer asks:** "RestAssured vs MockMvc plain — when would you use one over the other?"

**Hruday's answer:**
> "MockMvc plain is what I use for controller unit tests. `mockMvc.perform(get(...)).andExpect(...)` is concise and readable for simple cases. The `jsonPath()` assertions work well for checking individual fields. It's built into Spring's test framework — zero extra dependencies.
>
> RestAssured is more powerful for complex response assertions. When you have deeply nested JSON — `body("data.reports[0].metrics.ctr", equalTo(0.45))` — RestAssured's Hamcrest-based syntax is more readable than chained `jsonPath()` calls. RestAssured also handles arrays, nested objects, and XML naturally. It's worth adding when your API responses are complex.
>
> The `spring-mock-mvc` module gives you RestAssured syntax with MockMvc speed — that's the sweet spot for complex controller tests. I use plain MockMvc for simple CRUD endpoint tests and RestAssured+MockMvc for tests on endpoints with complex response structures or when I'm writing integration-style tests against a running `@SpringBootTest` server.
>
> At Oracle, we standardised on plain MockMvc for unit tests and RestAssured for our integration smoke test suite that ran against the TestContainers-backed full stack. Kept both layers clean and fast."

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "How would you structure the test suite for a REST API that has 15 controllers and needs both controller-level tests and full-stack integration tests?"

**Hruday's answer:**
> "Two-tier structure. Tier one: per-controller `@WebMvcTest` test classes. Every controller gets its own test class. These classes are small — each covers all the HTTP scenarios of that controller: 200, 201, 400, 404, 403, 500 responses. Services and repos are mocked via `@MockBean`. These run fast — 15 controller test classes across 150 tests might complete in under 30 seconds total. They run on every push.
>
> Tier two: a set of integration test classes using `@SpringBootTest + RANDOM_PORT + TestContainers`. I'd write one integration test class per major business flow: report creation flow, report publishing flow, user access control end-to-end. These use RestAssured to call the real endpoints and assert against a real PostgreSQL database. Maybe 20–30 tests total. They run on main branch merges or nightly, not on every push — they're slower.
>
> The build system runs `@WebMvcTest` tests as part of the standard `mvn test` cycle. Integration tests run in a separate Maven profile (`-P integration-tests`) so developers can skip them locally. In CI, both tiers run on a pull request merge to main. This gives full coverage without slowing down per-commit feedback."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "`@SpringBootTest` for all controller tests" | "I use `@SpringBootTest` because it's more realistic" | `@SpringBootTest` for every controller test is 5–10x slower; use `@WebMvcTest` for the controller unit tests; save `@SpringBootTest` for integration tests that genuinely need the full context (real database, real service interactions) |
| "MockMvc doesn't test security" | "Security needs a real server to test" | `@WebMvcTest` loads Spring Security filters — you CAN test authentication (401) and authorization (403) in MockMvc using `@WithMockUser` from `spring-security-test`; this is the right layer for testing security wiring |
| "Just use Postman for API testing" | "Postman collection covers our API tests" | Postman collections are not CI-automatable without extra setup, are not version-controlled as first-class code, and have no parameterisation or dependency injection for mocks; MockMvc and RestAssured run in CI as JUnit tests with the rest of the build |
| "RestAssured requires a running server" | "RestAssured is for integration tests only" | `io.rest-assured:spring-mock-mvc` lets you use RestAssured's fluent syntax on top of MockMvc — no server, no port, same fast `@WebMvcTest` setup; you get RestAssured's readable assertions without the overhead of starting a real HTTP listener |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, our reporting service had 12 REST controllers and a target of 85% test coverage. The challenge was keeping the test suite fast — if it ran for 20 minutes in CI, no one would maintain it. We used `@WebMvcTest` for all controller tests — one test class per controller. Services were mocked with `@MockBean`. The full controller test suite ran in under 40 seconds across 180 tests.
>
> For integration tests, we used RestAssured against a `@SpringBootTest` server backed by an H2 in-memory database (later migrated to TestContainers + PostgreSQL). These 25 integration tests covered the critical write paths — report creation, status transitions, permission checks. They were in a separate Maven profile and ran on every merge to main.
>
> This two-tier setup is what gave us 85% coverage without a slow CI. Every team member ran the unit test tier locally in under a minute. The integration tier was CI-only. The first time we tried using only `@SpringBootTest` for everything — before I joined — the test cycle was 18 minutes. After moving to `@WebMvcTest` for controller tests, it dropped to under 4 minutes."

---

## 8. Scale Evolution

**Small service, 3–5 controllers →** `@WebMvcTest` for each controller, plain MockMvc assertions, `@SpringBootTest` + H2 for integration tests. ~50 tests total. CI runs in under 1 minute.

**Medium service, 15 controllers, REST + event-driven →** Controller unit tests (`@WebMvcTest`) + integration tests (`@SpringBootTest + TestContainers PostgreSQL`) in separate Maven profile. RestAssured for integration test assertions on complex JSON. ~200 tests total. CI splits into unit (fast, on every commit) and integration (slower, on PR merge).

**Large service, 50+ controllers, microservices mesh →** Contract tests (Pact) between services supplement the RestAssured integration tests. Consumer-driven contracts define the JSON shapes; RestAssured tests verify the provider side. Integration tests run against a TestContainers environment mirroring production topology (Postgres, Redis, Kafka). Test parallelism with Maven Surefire plugin to run class groups in parallel — 500+ tests under 5 minutes.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment APIs have strict contracts — wrong status code or missing field in the JSON response is a production incident; `@WebMvcTest` ensures every HTTP scenario is covered before deploy | Show you test error paths (400, 402, 500) not just the happy path; mention testing payment decline handling |
| Swiggy / Meesho | High-traffic REST APIs — high coverage needed to maintain velocity; controller test suites running in under a minute in CI keeps teams moving | `@WebMvcTest` for speed; two-tier testing strategy for CI/CD at scale |
| Adobe / Microsoft | Enterprise APIs with complex authorization rules (roles, ownership, team access); `@WithMockUser` and security testing in `@WebMvcTest` is critical | Testing multiple authorization scenarios: unauthenticated, wrong role, correct role; testing `@PreAuthorize` method-level security |
| Remote / Global roles | Spring Boot is ubiquitous in Java backend roles worldwide; `@WebMvcTest`, MockMvc, RestAssured are standard across the ecosystem | Being able to name the difference between `@WebMvcTest` and `@SpringBootTest` precisely shows deep Spring knowledge, not surface-level |

---

## 10. Related Topics — What to Study Next

- **Topic 259 — Mockito Deep Dive** — `@WebMvcTest` tests rely on Mockito for `@MockBean`; understanding `given().willReturn()`, `verify()`, `ArgumentCaptor`, and `@InjectMocks` is essential to writing good controller unit tests; Mockito is the foundation
- **Topic 260 — TestContainers** — the integration test tier (RestAssured + `@SpringBootTest`) needs a real database; TestContainers spins up a real PostgreSQL container for tests; combining RestAssured + `@SpringBootTest` + TestContainers is the production-grade integration testing setup
- **Topic 261 — Contract Testing (Pact)** — the next layer above integration tests in microservices; Pact defines the JSON contract between consumer and provider; RestAssured tests verify the provider side matches the Pact contract
- **Topic 258 — Spring Boot Unit Testing (@SpringBootTest, @WebMvcTest, @DataJpaTest)** — the full picture of Spring test slices; `@DataJpaTest` for repository layer, `@WebMvcTest` for controller layer, `@SpringBootTest` for full stack — together they give you complete coverage with the right isolation at each layer
- **Topic 57 — @RestController, @RequestMapping, @PathVariable, @RequestBody** — you test what you build; understanding the annotations and their defaults (response status, content negotiation, validation triggers) is what lets you write meaningful MockMvc assertions

---

*Part 15 · API Testing — RestAssured, MockMvc · Full Stack Interview Guide · Hruday D · 2026*
