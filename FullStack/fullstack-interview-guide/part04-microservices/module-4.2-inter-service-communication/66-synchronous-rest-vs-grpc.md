# Synchronous Communication — REST vs gRPC
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Synchronous communication = Service A calls Service B and WAITS for the response before continuing — REST over HTTP/1.1 and gRPC over HTTP/2 are the two main options in microservices
- **REST**: text-based (JSON), human-readable, browser-native, widely understood — perfect for external APIs, developer experience, and simple service-to-service calls
- **gRPC**: binary Protocol Buffers, strict schema contract via `.proto` files, supports streaming, 5-10x faster serialisation than JSON, bidirectional streaming — preferred for internal high-throughput service-to-service communication
- Key REST vs gRPC trade-off: REST is discoverable and debuggable with curl; gRPC is faster and safer-contract but requires tooling (gRPC client, protoc compiler, proto schema management)
- Synchronous calls create runtime coupling — if Service B is down, Service A's call fails — always add circuit breaker, retry, and timeout (Topics 71-74)
- Gap to bridge: at Oracle the service calls were all SOAP/REST; gRPC was not in use — understanding why Razorpay and Google prefer gRPC internally is a differentiated insight

---

## 1. One-Line Definition
Synchronous inter-service communication is when one microservice sends a request to another and blocks until it receives a response — with REST using JSON over HTTP/1.1 for broad compatibility, and gRPC using Protocol Buffers over HTTP/2 for high-performance, schema-safe internal communication.

---

## 2. The Problem It Solves

Microservices need to talk to each other. When OrderService places an order, it needs to verify inventory with InventoryService and charge the customer via PaymentService. These operations require a response — "is inventory available?" is either yes or no; the order cannot proceed until the answer is known. This is synchronous communication — you need the answer before you can continue.

The question is not WHETHER to use synchronous communication — it is WHICH protocol to use and how to make it resilient.

REST became the default for inter-service communication in the 2010s because it was already the standard for external APIs and developers knew it well. As microservices architectures scaled to tens of services making thousands of calls per second to each other, JSON parsing overhead, verbose HTTP headers, and lack of built-in streaming became bottlenecks. gRPC, introduced by Google in 2016, addresses these performance issues for internal communication while adding strict schema contracts that catch API breaking changes at compile time rather than at runtime.

The combination used in modern production systems: **REST for external APIs** (frontend-to-backend, partner integrations, webhooks) and **gRPC for internal service-to-service communication** (where performance and contract safety matter).

---

## 3. How It Works Internally

### REST — How It Works

REST (Representational State Transfer) is an architectural style using HTTP. Each resource has a URL, and the HTTP method (GET, POST, PUT, DELETE, PATCH) conveys the action. The payload is typically JSON.

```
HTTP Request:
POST /api/v1/orders HTTP/1.1
Host: order-service.internal
Content-Type: application/json
Authorization: Bearer eyJhbGc...
X-Correlation-ID: abc-123-def-456
Content-Length: 127

{"userId": 42, "items": [{"productId": "P001", "quantity": 2}], "addressId": 7}

HTTP Response:
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/v1/orders/ORDER-789

{"orderId": "ORDER-789", "status": "PLACED", "total": {"amount": 1998.00, "currency": "INR"}}
```

REST over HTTP/1.1 characteristics:
- One request per TCP connection (unless keep-alive — still inefficient for high throughput)
- Plain-text JSON — human readable, easy to debug with curl
- No built-in schema enforcement — the contract is a convention or an OpenAPI spec
- Headers are verbose — repeated on every request (Host, Accept, Authorization, etc.)
- No streaming — response is complete document, not a stream of messages

### gRPC — How It Works

gRPC (Google Remote Procedure Call) uses Protocol Buffers (protobuf) for serialisation and HTTP/2 as transport.

```protobuf
// order.proto — the contract definition
syntax = "proto3";
package com.example.orders;

option java_package = "com.example.orders.grpc";
option java_multiple_files = true;

service OrderService {
    rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
    rpc GetOrder(GetOrderRequest) returns (OrderDetails);
    rpc StreamOrderUpdates(GetOrderRequest) returns (stream OrderStatusUpdate);  // Server-side streaming
}

message CreateOrderRequest {
    int64 user_id = 1;
    repeated OrderItem items = 2;
    int64 address_id = 3;
}

message OrderItem {
    string product_id = 1;
    int32 quantity = 2;
}

message CreateOrderResponse {
    string order_id = 1;
    string status = 2;
    int64 created_at_epoch = 3;
}
```

gRPC over HTTP/2 characteristics:
- **HTTP/2 multiplexing**: multiple requests over ONE TCP connection — eliminates connection overhead
- **Binary Protocol Buffers**: 3-10x smaller payload than JSON, 5-10x faster serialisation/deserialisation
- **Strict schema**: `.proto` file is the contract — changing a field type is a compile error in generated clients
- **Built-in streaming**: server-side streaming, client-side streaming, bidirectional streaming
- **Code generation**: `protoc` generates client and server stubs in Java, Go, Python, etc. — no need to write HTTP clients

### Comparison Table

```
Feature                 REST / JSON              gRPC / Protobuf
────────────────────────────────────────────────────────────────────────
Transport               HTTP/1.1 (HTTP/2 opt.)   HTTP/2 (required)
Payload format          JSON (text)              Protocol Buffers (binary)
Human-readable          ✅ Yes                   ❌ No (binary on wire)
Browser support         ✅ Native                ❌ Needs gRPC-Web proxy
Contract enforcement    ❌ OpenAPI (optional)     ✅ .proto file (required)
Streaming               ❌ Only SSE, WebSockets   ✅ Built-in (4 modes)
Code generation         ❌ Not built-in           ✅ protoc generates clients
Performance (latency)   Baseline                 3-5x faster typical
Payload size            Larger (JSON verbosity)  5-10x smaller (binary)
Connection overhead     High (per-request w/ 1.1) Low (multiplexed over 1 TCP)
Debugging (curl/Postman)✅ Easy                  ❌ Needs grpcurl or specific tooling
Learning curve          Low                      Medium (proto schema, tooling)
Error handling          HTTP status codes         gRPC status codes (similar)
Best for                External APIs, DX         Internal high-throughput comms
```

### When to Choose Which

```
Choose REST when:
  → API is consumed by browsers, mobile apps, or external clients
  → Developer Experience (DX) and discoverability matter
  → Third-party partners need to integrate
  → Team is not familiar with protobuf toolchain
  → Payload structure changes frequently (protobuf schema changes have more friction)
  → Request/response volumes are moderate (<1000 RPS per service pair)

Choose gRPC when:
  → Internal microservice-to-microservice communication
  → High throughput required (>1000 RPS, low latency needed)
  → Strong contract enforcement prevents accidental breaking changes
  → Streaming needed (real-time order status, live location feeds)
  → Multiple languages in the stack (Java backend + Go sidecar + Python ML service)
    — one .proto file generates clients for all
  → Google, Netflix, Razorpay internal services all use gRPC internally
```

---

## 4. The Code

### REST Client with Spring WebClient (Reactive, Non-Blocking)
```java
// Proper REST client: WebClient (Spring WebFlux) — non-blocking, reactive
// Do NOT use RestTemplate for new code — it is deprecated in Spring 5+

@Configuration
public class InventoryClientConfig {

    @Bean
    public WebClient inventoryWebClient(
            @Value("${services.inventory.base-url}") String baseUrl) {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .codecs(config -> config.defaultCodecs().maxInMemorySize(1 * 1024 * 1024))
                .build();
    }
}

@Service
public class InventoryServiceClient {

    private final WebClient inventoryWebClient;

    public Mono<StockVerificationResponse> checkStock(String productId, int quantity) {
        return inventoryWebClient
                .get()
                .uri("/api/v1/inventory/{productId}/availability?quantity={qty}",
                     productId, quantity)
                .retrieve()
                .onStatus(
                    HttpStatusCode::is4xxClientError,
                    response -> response.bodyToMono(String.class)
                                        .map(body -> new InventoryClientException("Stock check failed: " + body))
                )
                .onStatus(
                    HttpStatusCode::is5xxServerError,
                    response -> Mono.error(new InventoryServiceUnavailableException("InventoryService error"))
                )
                .bodyToMono(StockVerificationResponse.class)
                .timeout(Duration.ofMillis(2000))  // Always set a timeout on synchronous calls
                .retryWhen(Retry.backoff(3, Duration.ofMillis(200))  // Retry with backoff
                               .filter(ex -> ex instanceof InventoryServiceUnavailableException));
    }
}
```

### gRPC — Spring Boot Server Implementation
```java
// pom.xml additions:
// grpc-spring-boot-starter, protobuf-java, grpc-protobuf, grpc-stub

// Generated from order.proto by protoc:
// OrderServiceGrpc.OrderServiceImplBase  ← extend this

@GrpcService  // Spring Boot gRPC annotation — registers as gRPC service
public class OrderGrpcService extends OrderServiceGrpc.OrderServiceImplBase {

    private final CreateOrderApplicationService createOrderService;
    private final OrderRepository orderRepository;

    @Override
    public void createOrder(CreateOrderRequest request,
                            StreamObserver<CreateOrderResponse> responseObserver) {
        try {
            // Map protobuf request to domain command
            CreateOrderCommand command = CreateOrderCommand.builder()
                    .userId(request.getUserId())
                    .addressId(request.getAddressId())
                    .items(request.getItemsList().stream()
                                  .map(item -> new OrderItemCommand(item.getProductId(), item.getQuantity()))
                                  .collect(Collectors.toList()))
                    .build();

            OrderId orderId = createOrderService.placeOrder(command);

            // Build protobuf response and send
            CreateOrderResponse response = CreateOrderResponse.newBuilder()
                    .setOrderId(orderId.toString())
                    .setStatus("PLACED")
                    .setCreatedAtEpoch(Instant.now().getEpochSecond())
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (InsufficientStockException e) {
            responseObserver.onError(
                Status.FAILED_PRECONDITION
                      .withDescription("Insufficient stock: " + e.getMessage())
                      .asRuntimeException()
            );
        } catch (Exception e) {
            responseObserver.onError(
                Status.INTERNAL
                      .withDescription("Order creation failed")
                      .asRuntimeException()
            );
        }
    }

    // Server-side streaming — push real-time order status updates to client
    @Override
    public void streamOrderUpdates(GetOrderRequest request,
                                   StreamObserver<OrderStatusUpdate> responseObserver) {
        // Subscribe to order status changes and stream them to the gRPC client
        Flux<OrderStatusUpdate> statusStream = orderStatusEventStream
                .subscribe(request.getOrderId())
                .map(event -> OrderStatusUpdate.newBuilder()
                                               .setStatus(event.getNewStatus())
                                               .setTimestamp(event.getTimestamp())
                                               .build());

        statusStream.subscribe(
            update -> responseObserver.onNext(update),
            error -> responseObserver.onError(Status.INTERNAL.asRuntimeException()),
            () -> responseObserver.onCompleted()
        );
    }
}
```

### gRPC — Spring Boot Client
```java
// Calling a gRPC service from another microservice

@Configuration
public class GrpcClientConfig {

    @Bean
    public ManagedChannel inventoryChannel(
            @Value("${services.inventory.grpc.host}") String host,
            @Value("${services.inventory.grpc.port}") int port) {
        return ManagedChannelBuilder.forAddress(host, port)
                .usePlaintext()  // Use TLS in production: .useTransportSecurity()
                .keepAliveTime(60, TimeUnit.SECONDS)
                .build();
    }

    @Bean
    public InventoryServiceGrpc.InventoryServiceBlockingStub inventoryGrpcClient(
            ManagedChannel inventoryChannel) {
        return InventoryServiceGrpc.newBlockingStub(inventoryChannel)
               .withDeadlineAfter(2, TimeUnit.SECONDS);  // Timeout on every call
    }
}

@Service
public class InventoryGrpcClient {

    private final InventoryServiceGrpc.InventoryServiceBlockingStub inventoryStub;

    public boolean isStockAvailable(String productId, int requestedQty) {
        try {
            StockCheckRequest request = StockCheckRequest.newBuilder()
                    .setProductId(productId)
                    .setRequestedQuantity(requestedQty)
                    .build();

            StockCheckResponse response = inventoryStub.checkStock(request);
            return response.getIsAvailable();

        } catch (StatusRuntimeException e) {
            if (e.getStatus().getCode() == Status.Code.UNAVAILABLE) {
                log.warn("InventoryService unavailable for productId={}", productId);
                throw new InventoryServiceUnavailableException(productId);
            }
            throw e;
        }
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why would you choose gRPC over REST for internal microservice communication?"

**Hruday's answer:**
> For internal service-to-service communication at high volume, gRPC offers three concrete advantages: performance, contract safety, and built-in streaming.
>
> Performance: gRPC uses Protocol Buffers — a binary format that is 5-10x smaller than equivalent JSON and serialises/deserialises faster. Combined with HTTP/2 multiplexing (multiple requests over one TCP connection), the per-request overhead is significantly lower than REST over HTTP/1.1. At Razorpay scale, where PaymentService might make thousands of calls per second to FraudDetectionService, that difference is measurable in p99 latency.
>
> Contract safety: the .proto file defines the API contract in a way that is enforced at compile time. If I rename a field or change a type, the protoc-generated client code no longer compiles. With REST and JSON, a renamed field is a silent runtime failure — the client sends the old field name, the server ignores it and returns a 200 with null data, and the bug surfaces hours later in logs. gRPC catches this immediately.
>
> Streaming: gRPC has built-in support for server-side, client-side, and bidirectional streaming. Pushing real-time order status updates, live location feeds, or streaming large datasets between services is elegant in gRPC; in REST it requires SSE or WebSockets which are separate protocols to learn and maintain.
>
> I would keep REST for external APIs — browser clients, mobile apps, partner integrations — because it is universally understood and easy to debug. But for the internal communication happening thousands of times per second between services, I would choose gRPC.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you handle versioning in gRPC APIs?"

**Hruday's answer:**
> gRPC / Protocol Buffers have specific versioning rules that make backward and forward compatibility manageable if followed correctly.
>
> The core rule: never change the numeric field tags in a .proto file. Each field in a protobuf message has a tag number: `string product_id = 1`. The number 1 is what gets serialised on the wire — not the field name. As long as the tag number stays the same, you can rename the field in the .proto file without breaking existing clients. Old clients sending field 1 still work; new clients sending field 1 still work.
>
> To add a new field — add it with a new tag number. Old clients that don't send field 4 will see the field as empty (default value) on the server. This is backward compatible.
>
> To remove a field — mark it as `reserved` so no one accidentally reuses that tag number. `reserved 3; reserved "old_field_name";`
>
> For larger breaking changes — a new major version of the service — I create a new package name in proto: `package com.example.orders.v2;` and a new gRPC service name. Old clients keep using the v1 service; new clients use v2. The server runs both service implementations concurrently until all clients have migrated. This is the same strategy as REST API versioning with `/v1/orders` vs `/v2/orders`.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the downsides of synchronous inter-service communication?"

**Hruday's answer:**
> Two main categories: runtime coupling and latency accumulation.
>
> Runtime coupling: Service A calling Service B means Service A's availability depends on Service B's availability. If Service B is down, Service A's request fails — even if Service A is otherwise perfectly healthy. In a system with 10 services where each service calls 3 others, the combined availability is the product of individual availabilities. If each service has 99.9% uptime, a chain of 5 calls has only ~99.5% effective availability. Circuit breakers and fallbacks (Topic 71) mitigate this, but the fundamental coupling is there.
>
> Latency accumulation: in a synchronous call chain, the total latency is the SUM of all service latencies. User request → API Gateway (5ms) → OrderService (10ms) → InventoryService (15ms) → PaymentService (20ms) = 50ms minimum before the user gets a response, ignoring network overhead. If any service in the chain is slow, every upstream service and the user waits. With 5 sequential services, one service's slowness (even a GC pause) is felt by the user.
>
> The mitigation strategies: always set timeouts (never block indefinitely), add circuit breakers to fail fast (never cascade the wait), use async where the response is not needed immediately (fire-and-forget via Kafka for notifications), and parallelise independent calls (call InventoryService and PaymentService in parallel rather than sequentially if business logic allows).

---

### Q4 — System Design Angle
**Interviewer asks:** "Design the communication layer for a payment processing system at Razorpay scale."

**Hruday's answer:**
> The communication design follows a clear pattern: REST for external facing, gRPC for internal communication, Kafka for event-driven asynchronous flows.
>
> **External layer (merchant-facing API)**: REST over HTTPS. Merchants integrate with Razorpay via REST because it is universally understood, testable with curl and Postman, and documented via OpenAPI. REST versioning (/v1/, /v2/) gives backward compatibility.
>
> **Internal service mesh (critical payment path)**: gRPC. When the API Gateway receives a payment request, it calls PaymentOrchestrationService via gRPC. PaymentOrchestrationService calls FraudDetectionService via gRPC (needs synchronous response before proceeding — fraud score must be checked before charging), then calls the BankRoutingService via gRPC (decides which payment rail — UPI, card, netbanking). These are all synchronous because each step's result determines the next step.
>
> **Async flows**: Kafka. After payment is completed, an event is published to Kafka. NotificationService consumes it and sends the payment confirmation SMS. LedgerService consumes it and records the financial entry. AnalyticsService consumes it and updates real-time dashboards. None of these need a response — they are fire-and-forget from PaymentService's perspective.
>
> **Resilience on all synchronous calls**: circuit breaker (Resilience4j), timeout (2 seconds max per gRPC call), retry with exponential backoff (3 attempts). No call in the critical path has an unbounded timeout. FraudDetection returning a circuit-open → treat as "low-risk" by policy and proceed (graceful degradation), not as a complete failure.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use REST for everything" | "REST is simpler, just use REST everywhere" | "REST is excellent for external-facing APIs. For internal high-frequency service calls (>500 RPS), gRPC's performance benefits, built-in streaming, and contract safety justify the tooling overhead. Google, Netflix, and Razorpay use gRPC for internal communication for measurable reasons." |
| "gRPC is better, always use it" | "gRPC is the future, migrate everything to gRPC" | "gRPC has no browser-native client — you need a gRPC-Web proxy to use it from browsers. External APIs that third parties integrate with should remain REST because it is universally toolable (curl, Postman, any HTTP client). Forcing gRPC on external API consumers is a developer experience failure." |
| "No timeout on synchronous calls" | "The library handles timeouts automatically" | "Nothing handles timeouts automatically unless you configure them explicitly. A blocking gRPC or WebClient call with no timeout will hang indefinitely if the called service has a bug that never responds. In production, one hung service call per pod × 200 concurrent requests = connection pool exhausted = cascading failure. Always configure a timeout on every synchronous call." |
| "Synchronous for all cross-service calls" | "We should always get a synchronous response to confirm the action" | "Many operations do not need a synchronous response. Sending an email after order placement does not need to block the order placement API response. Logging an audit event does not need a synchronous ack. Updating analytics does not need a response at all. Overusing synchronous calls creates unnecessary latency and coupling. The question to ask: does the caller's decision tree depend on this response? If no, make it async." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, all inter-service communication was SOAP or REST — gRPC was not in the stack. Moving to Spring WebFlux and WebClient for our newer services at Oracle was the first step toward reactive, non-blocking HTTP communication. When I encountered gRPC in open-source projects and in my personal study of how Razorpay and Google architect their internal communication layers, the performance case became obvious: the Oracle procurement module calling the invoice module hundreds of times per minute for batch processing was doing it over verbose SOAP XML. Switching that communication to gRPC with binary protobuf would have been a 10x payload reduction. That concrete comparison — SOAP vs gRPC payload size on a batch workflow I knew well — made the case for gRPC real to me, not just theoretical."

---

## 8. Scale Evolution

**1,000 RPS →** REST is perfectly adequate. JSON serialisation overhead is negligible. Focus on HTTP/2 enabled (Spring Boot supports HTTP/2 natively with TLS), connection keep-alive, and proper timeouts. gRPC is not worth the tooling overhead at this scale.

**10,000 RPS →** REST JSON serialisation starts to contribute to CPU usage. Profiling will show `JsonParser` and `ObjectMapper` taking 5-10% of CPU in hot paths. Consider gRPC for the highest-frequency internal call pairs first.

**100,000 RPS →** gRPC for all internal communication. JSON deserialization and HTTP/1.1 connection overhead are real bottlenecks at this scale. Service mesh (Istio) handles mTLS, load balancing, and observability — gRPC fits naturally. External API remains REST.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment critical path latency directly impacts conversion rates. gRPC for fraud detection, bank routing, and settlement service calls reduces p99 latency measurably. | "Our payment callback latency is at 150ms p99. How would you reduce it to 50ms?" |
| Swiggy / Meesho | Matching engine and delivery tracking need real-time updates — gRPC server-side streaming replaces polling. Internal high-throughput calls (inventory check during flash sale) benefit from gRPC's binary efficiency. | "We're seeing high CPU on our order service during peak. The profiler shows 30% in JSON parsing. What would you do?" |
| Google / Microsoft | gRPC was created at Google; Kubernetes API server is gRPC. Understanding gRPC is a signal that you understand how Google-scale internal infrastructure works. | "Describe how you'd implement streaming order status updates in a microservices context." |
| SAP Labs (current) | SAP's OData/REST-heavy ecosystem is evolving toward gRPC for internal platform services. Knowing when to use which protocol is relevant for SAP BTP architecture conversations. | Architecture discussions on modernising SAP's internal service integration layer. |

---

## 10. Related Topics — What to Study Next

- **Topic 67 — Asynchronous Communication via Kafka/RabbitMQ** — the complement to synchronous REST/gRPC: when you DON'T need a response and can use event-driven communication, removing runtime coupling entirely
- **Topic 71 — Circuit Breaker Pattern** — every synchronous call needs a circuit breaker; this is how you prevent cascading failures when the called service is slow or down
- **Topic 72 — Retry with Exponential Backoff** — the practical resilience pattern that works with circuit breakers to handle transient failures in synchronous calls
- **Topic 74 — Timeout Strategies** — configuring correct timeouts for different types of synchronous calls is essential; this topic covers how to set, propagate, and react to timeouts across service chains
- **Topic 69 — API Gateway** — the service that receives all external REST calls, routes them to internal services (potentially over gRPC), handles auth, rate limiting, and API versioning

---

*Part 4 · REST vs gRPC · Full Stack Interview Guide · Hruday D · 2026*
