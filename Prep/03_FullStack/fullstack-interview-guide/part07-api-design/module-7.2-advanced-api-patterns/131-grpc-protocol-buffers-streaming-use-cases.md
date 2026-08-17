# gRPC — Protocol Buffers, Streaming, Use Cases
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **gRPC** is a high-performance Remote Procedure Call framework by Google. Instead of REST's text-based JSON over HTTP/1.1, gRPC uses binary-encoded Protocol Buffers (Protobuf) over HTTP/2. The result: smaller payloads, faster parsing, multiplexed connections, and built-in streaming.
- **Protocol Buffers (Protobuf)**: a binary serialization format. You define your message structure in a `.proto` file. A code generator creates type-safe client and server stubs in any supported language. A Protobuf message is 3-10× smaller than equivalent JSON, and binary parsing is 5-10× faster than JSON text parsing.
- **HTTP/2 multiplexing**: gRPC runs over HTTP/2. Multiple RPC calls share one TCP connection with no head-of-line blocking. HTTP/1.1 REST needs multiple connections or awkward pipelining.
- **Four communication modes**: (1) Unary (one request → one response, like REST); (2) Server streaming (one request → stream of responses, like a log tail); (3) Client streaming (stream of requests → one response, like file upload); (4) Bidirectional streaming (both sides stream simultaneously, like a chat).
- **Use gRPC for**: service-to-service communication in microservices (internal), high-throughput low-latency RPCs (10× faster than REST for the same payload size), real-time streaming APIs (telemetry, live data feeds), polyglot microservices where type safety across language boundaries matters.
- **Do NOT use gRPC for**: browser-facing public APIs (browser native HTTP/2 doesn't support gRPC protocol without grpc-web proxy), human-readable debugging (binary is opaque without tooling), simple CRUD APIs where REST tooling ecosystem is superior.
- **The ".proto file is a contract"**: changing proto files follows strict backward-compatibility rules — field numbers never change, never reuse deleted field numbers, new fields are always optional.

---

## 1. One-Line Definition
gRPC is a high-performance, binary-protocol RPC framework that uses Protocol Buffers over HTTP/2, offering 5-10× faster serialisation and smaller payloads than REST/JSON, plus built-in streaming support — making it the standard choice for internal service-to-service communication in microservices architectures.

---

## 2. The Problem It Solves

### Why REST is Inefficient for Service-to-Service Communication

```
SCENARIO: Payment service calls Inventory service 10,000 times per minute.

REST/JSON approach (what most teams start with):
  POST /api/v1/inventory/check
  Content-Type: application/json
  
  Request body (JSON text, 287 bytes):
  {
    "productId": "PROD-12345",
    "requestedQuantity": 5,
    "warehouseId": "WH-BANGALORE-1",
    "checkType": "STRICT",
    "correlationId": "corr-abc-def-ghi-jkl"
  }

  Response body (JSON text, 312 bytes):
  {
    "productId": "PROD-12345",
    "available": true,
    "availableQuantity": 142,
    "warehouseId": "WH-BANGALORE-1",
    "reservedQuantity": 8,
    "lastUpdated": "2025-06-10T14:30:00Z",
    "correlationId": "corr-abc-def-ghi-jkl"
  }

  Processing per request:
    Parse JSON string → allocate Java objects: ~0.5ms
    Serialize Java objects → JSON string: ~0.5ms
    HTTP/1.1 connection overhead: 1-2ms (new connection or pipelining limits)

  At 10,000 requests/minute:
    JSON parsing CPU: 10,000 × 0.5ms = 5,000ms CPU time per minute
    Bandwidth: 10,000 × (287 + 312 bytes) = ~6MB per minute
    
gRPC/Protobuf approach:
  Same data as Protobuf binary (approximately 60-70 bytes):
  [3 bytes field 1] [20 bytes productId] [3 bytes field 2] [5 bytes quantity] ...
  
  Processing per request:
    Parse Protobuf binary → Java objects: ~0.05ms (10× faster than JSON)
    Serialize Java objects → Protobuf: ~0.05ms
    HTTP/2 multiplexed: no per-request connection overhead (multiple streams on one TCP)
    
  At 10,000 requests/minute:
    Protobuf parsing CPU: 10,000 × 0.05ms = 500ms CPU time (10× less than REST)
    Bandwidth: 10,000 × 130 bytes = ~1.3MB per minute (5× less bandwidth)
    
For internal microservices making millions of RPCs per minute:
This difference translates to real CPU costs and latency reductions.
```

---

## 3. How It Works Internally

### Protocol Buffers — Binary Encoding

```
The .proto schema definition (language-agnostic contract):

syntax = "proto3";
package com.example.inventory;

message InventoryCheckRequest {
  string product_id    = 1;   // field number 1 — encoded as just "1" in binary
  int32 quantity       = 2;   // field number 2
  string warehouse_id  = 3;
  string correlation_id = 4;
}

message InventoryCheckResponse {
  bool available          = 1;
  int32 available_quantity = 2;
  string product_id        = 3;
}

service InventoryService {
  rpc CheckAvailability (InventoryCheckRequest) returns (InventoryCheckResponse);
  rpc StreamInventoryUpdates (InventoryFilter) returns (stream InventoryUpdate);
}

Binary encoding example — product_id = "PROD-123":
  JSON:    "product_id": "PROD-123"   — 24 bytes
  Protobuf: [field 1, type string, length 8][P][R][O][D][-][1][2][3] — 10 bytes

Why field NUMBERS and not names?
  Names are NOT in the binary — only the number.
  Number 1 for product_id: 1 byte in Protobuf vs 12 bytes for "product_id" string.
  Names are mapped in the .proto file on BOTH sides.
  THIS IS WHY: never reuse or change field numbers — they identify fields in binary.
  The binary is meaningless without the .proto schema.
```

### gRPC Communication Modes

```
1. UNARY (most common — same as REST):
   Client                       Server
     ──── request ────────────>
     <─── response ────────────

   Use case: fetch order details, check inventory, validate payment.
   Spring: @GrpcService method returns a single response object.

2. SERVER STREAMING:
   Client                       Server
     ──── request ────────────>
     <─── response 1 ──────────   ┐
     <─── response 2 ──────────   │ continuous stream
     <─── response 3 ──────────   │
     ...until server closes ───   ┘
   
   Use case: real-time order status updates, log streaming, progress reporting.
   Example: client calls "WatchOrderStatus(orderId)" and server streams
            updates whenever the order state changes — no polling needed.

3. CLIENT STREAMING:
   Client                       Server
     ──── chunk 1 ────────────>   ┐
     ──── chunk 2 ────────────>   │ continuous stream
     ──── chunk 3 ────────────>   ┘
     <─── response ────────────
   
   Use case: uploading a large file in chunks, bulk insert operations,
             sending a batch of sensor readings to an analytics service.

4. BIDIRECTIONAL STREAMING:
   Client                       Server
     ──── message 1 ──────────>
     <─── message A ───────────
     ──── message 2 ──────────>
     <─── message B ───────────
     ... simultaneous streams ...
   
   Use case: real-time collaborative editing, trading platform bid/ask streams,
             IoT device command/telemetry channel, multiplayer game events.
```

### gRPC vs REST vs GraphQL — At a Glance

```
Feature             REST (HTTP/1.1 + JSON)  GraphQL            gRPC (HTTP/2 + Protobuf)
─────────────────────────────────────────────────────────────────────────────────────
Protocol            HTTP/1.1                HTTP/1.1 or 2      HTTP/2
Payload format      Text (JSON)             Text (JSON)        Binary (Protobuf)
Payload size        Baseline                Similar to REST    3-10× smaller
Parse speed         Slow (string ops)       Slow               Fast (binary)
Streaming           ❌ No native            ✅ Subscriptions   ✅ 4 modes built-in
Browser support     ✅ Native               ✅ Native          ⚠️ Needs grpc-web proxy
Contract/schema     Optional (OpenAPI)      Mandatory (schema) Mandatory (.proto)
Type safety         Loose (JSON)            Schema types       Strict (generated code)
Bi-directional      ❌ No                   Limited (SSE)      ✅ Yes
Best use case       Public/browser APIs     Multi-client       Service-to-service
Human readable      ✅ Yes                  ✅ Yes             ❌ Binary (need tooling)
```

---

## 4. The Code

### ❌ Wrong Way — REST for High-Frequency Internal Service Calls

```java
// ❌ WRONG: REST with JSON for a high-frequency internal service call
@Service
public class PaymentService {

    private final WebClient webClient;

    public boolean checkInventory(String productId, int quantity) {
        // ❌ REST/JSON: text serialisation overhead, HTTP/1.1 connection management
        // ❌ At 100k calls/min: significant CPU for JSON parsing
        Map<String, Object> request = Map.of("productId", productId, "quantity", quantity);
        InventoryResponse response = webClient
            .post()
            .uri("http://inventory-service/api/v1/inventory/check")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(InventoryResponse.class)
            .block();  // ❌ Blocking
        return response.isAvailable();
    }
}
```

---

### ✅ Right Way — gRPC with Spring Boot (grpc-spring-boot-starter)

```protobuf
// src/main/proto/inventory.proto — shared contract
syntax = "proto3";
package com.example.inventory;
option java_package = "com.example.inventory.grpc";
option java_multiple_files = true;

message CheckAvailabilityRequest {
  string product_id    = 1;
  int32  quantity      = 2;
  string warehouse_id  = 3;
  string correlation_id = 4;
}

message CheckAvailabilityResponse {
  bool   available          = 1;
  int32  available_quantity = 2;
  string reservation_id     = 3;  // Optional: ID of soft reservation
}

message InventoryFilter {
  string warehouse_id = 1;
}

message InventoryUpdate {
  string product_id  = 1;
  int32  quantity    = 2;
  string event_type  = 3;  // RESTOCK, SOLD, RESERVED
  int64  timestamp   = 4;
}

service InventoryService {
  // Unary: check if product is available
  rpc CheckAvailability (CheckAvailabilityRequest) returns (CheckAvailabilityResponse);
  
  // Server streaming: watch for inventory updates in a warehouse
  rpc WatchInventory (InventoryFilter) returns (stream InventoryUpdate);
}
```

```java
// Server implementation — Inventory Service
@GrpcService  // nets.devh.boot.grpc annotation
@Slf4j
public class InventoryGrpcService extends InventoryServiceGrpc.InventoryServiceImplBase {

    private final InventoryRepository inventoryRepository;

    // ✅ Unary RPC — same as REST endpoint but binary, faster
    @Override
    public void checkAvailability(
            CheckAvailabilityRequest request,
            StreamObserver<CheckAvailabilityResponse> responseObserver) {

        log.info("gRPC checkAvailability: productId={} quantity={}",
            request.getProductId(), request.getQuantity());

        try {
            Inventory inventory = inventoryRepository
                .findByProductIdAndWarehouseId(request.getProductId(), request.getWarehouseId())
                .orElseThrow(() -> Status.NOT_FOUND
                    .withDescription("Product not found: " + request.getProductId())
                    .asRuntimeException());

            boolean available = inventory.getAvailableQuantity() >= request.getQuantity();

            CheckAvailabilityResponse response = CheckAvailabilityResponse.newBuilder()
                .setAvailable(available)
                .setAvailableQuantity(inventory.getAvailableQuantity())
                .build();

            responseObserver.onNext(response);      // Send the response
            responseObserver.onCompleted();          // Signal completion
        } catch (StatusRuntimeException e) {
            responseObserver.onError(e);             // ✅ Propagate gRPC status error
        }
    }

    // ✅ Server streaming RPC — server pushes updates to client
    @Override
    public void watchInventory(
            InventoryFilter request,
            StreamObserver<InventoryUpdate> responseObserver) {

        // Register a listener for inventory events in this warehouse
        inventoryEventBus.subscribe(request.getWarehouseId(), event -> {
            if (!responseObserver.isReady()) {
                log.warn("Client not ready for inventory stream — skipping event");
                return;
            }
            InventoryUpdate update = InventoryUpdate.newBuilder()
                .setProductId(event.getProductId())
                .setQuantity(event.getQuantity())
                .setEventType(event.getType().name())
                .setTimestamp(event.getOccurredAt().toEpochMilli())
                .build();
            responseObserver.onNext(update);  // Push update to client
        });
        // Stream stays open — server sends updates as they occur
        // Client calls responseObserver.cancel() or server closes when done
    }
}
```

```java
// Client implementation — Payment Service calling Inventory via gRPC
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryGrpcClient {

    @GrpcClient("inventory-service")  // Managed channel — connection reuse
    private InventoryServiceGrpc.InventoryServiceBlockingStub blockingStub;

    @GrpcClient("inventory-service")
    private InventoryServiceGrpc.InventoryServiceStub asyncStub;

    // ✅ Unary call — synchronous (for request-response flows)
    public boolean checkInventory(String productId, int quantity, String warehouseId) {
        try {
            CheckAvailabilityRequest request = CheckAvailabilityRequest.newBuilder()
                .setProductId(productId)
                .setQuantity(quantity)
                .setWarehouseId(warehouseId)
                .build();

            CheckAvailabilityResponse response = blockingStub
                .withDeadline(Deadline.after(500, TimeUnit.MILLISECONDS))  // ✅ Always set deadline
                .checkAvailability(request);

            return response.getAvailable();

        } catch (StatusRuntimeException e) {
            if (e.getStatus().getCode() == Status.Code.NOT_FOUND) {
                return false;  // Product doesn't exist
            }
            throw new InventoryServiceException("gRPC call failed: " + e.getStatus(), e);
        }
    }

    // ✅ Server streaming call — receive updates asynchronously
    public void watchInventoryUpdates(String warehouseId, Consumer<InventoryUpdate> handler) {
        InventoryFilter filter = InventoryFilter.newBuilder()
            .setWarehouseId(warehouseId)
            .build();

        asyncStub.watchInventory(filter, new StreamObserver<InventoryUpdate>() {
            @Override
            public void onNext(InventoryUpdate update) {
                handler.accept(update);  // Handle each incoming update
            }

            @Override
            public void onError(Throwable t) {
                log.error("Inventory watch stream error for warehouse={}: {}", warehouseId, t.getMessage());
                // Reconnect logic / fallback here
            }

            @Override
            public void onCompleted() {
                log.info("Inventory watch stream completed for warehouse={}", warehouseId);
            }
        });
    }
}
```

```yaml
# application.yml — gRPC client configuration
grpc:
  client:
    inventory-service:
      address: 'discovery:///inventory-service'  # Eureka service discovery
      negotiation-type: plaintext                 # TLS for production; plaintext for local
      keep-alive-time: 30s
      keep-alive-timeout: 5s
      deadline: 2000ms                           # Global deadline per call

  server:
    port: 9090    # gRPC port (separate from HTTP port: 8080)
```

---

## 5. Interview Questions & Model Answers

### Q1 — Why gRPC
**Interviewer asks:** "Why would you choose gRPC over REST for service-to-service communication in microservices?"

**Hruday's answer:**
> Three main reasons: performance, type safety, and streaming.
>
> Performance: gRPC uses Protocol Buffers, a binary serialisation format. A typical message that's 500 bytes in JSON compresses to 100-150 bytes in Protobuf — 3-5× smaller. Binary parsing is also 5-10× faster than JSON string parsing. For a service making 100,000 internal RPC calls per minute — say a payment service calling an inventory check service — this difference is significant CPU savings and better latency.
>
> Type safety: the `.proto` file is a strict contract. Code generation creates type-safe client and server stubs in every supported language. If the Inventory service changes a field, it shows as a compile error in the Payment service that calls it. With REST/JSON, schema mismatches are runtime errors discovered in production.
>
> Streaming: gRPC has built-in support for server streaming, client streaming, and bidirectional streaming over HTTP/2. If the Order service needs real-time inventory updates without polling, it opens a server-streaming RPC call and receives updates as they occur. Implementing the same with REST requires WebSockets or SSE as a separate mechanism.
>
> When I would NOT use gRPC: browser-facing APIs (browsers can't call gRPC directly without a grpc-web proxy), external public APIs (REST is the industry standard developers know), and debug-heavy APIs where JSON readability matters.

---

### Q2 — Protocol Buffers
**Interviewer asks:** "What is a Protocol Buffer and why are field numbers important?"

**Hruday's answer:**
> A Protocol Buffer is a binary serialisation format — essentially a more efficient way to encode structured data than JSON or XML.
>
> You define your data structure in a `.proto` file: field names, types, and a unique integer number for each field. The code generator creates Java, Go, Python, or any language's classes automatically from that file. When you serialise a message to Protobuf binary, the field names are NOT included — only the field numbers. For a field named `product_id` with number `1`, the binary just stores number 1 as one or two bytes, then the value. Compare to JSON: `"product_id": "PROD-123"` is 24 bytes; the Protobuf equivalent is about 10 bytes.
>
> Field numbers are critical precisely because names aren't in the binary. If you send a message with field number 1 = `productId`, the receiver's `.proto` must have field 1 mapped to `productId`. If you rename the field to `itemId` but keep field number 1, the two sides still communicate correctly — the number is the identifier, not the name.
>
> The golden rule: never reuse a deleted field number. If you had field 3 = `couponCode` and you remove it, don't add a new field 3 = `discountType`. Old serialised messages have field 3 with coupon data; the new code would interpret it as discount data — data corruption. Add new fields with new numbers only. Mark old numbers as `reserved`.

---

### Q3 — gRPC vs REST Decision
**Interviewer asks:** "When would you use REST and when gRPC for communication between microservices?"

**Hruday's answer:**
> Default choice for internal service-to-service communication: gRPC. The reasons are performance, type safety, and the HTTP/2 connection multiplexing.
>
> REST for internal services when: you need human-readable debugging without tooling (gRPC binary requires grpcurl or similar), the services are rarely called and the overhead doesn't matter, the team is unfamiliar with gRPC and the migration cost outweighs the benefit, or you're calling a third-party service that only exposes REST.
>
> gRPC for internal services when: high-frequency calls (10k+ per minute), latency is critical, you need streaming (telemetry, real-time event push), or you have polyglot services (Java backend + Go sidecar + Python ML service) and want type-safe generated clients in all languages.
>
> For external-facing APIs: REST always. Browsers can't call gRPC natively. External developers know REST. OpenAPI documentation is the industry standard. If you need binary efficiency for a browser-facing API, REST + binary format for specific endpoints (like protobuf content type) is a pragmatic middle ground.
>
> One practical deployment note: if you adopt gRPC for internal services, you still need an HTTP REST API at the edge for external consumers. The API Gateway translates REST → gRPC internally. This is the common pattern: REST at the boundary, gRPC in the interior.

---

### Q4 — Streaming Use Case
**Interviewer asks:** "Design a real-time order tracking system using gRPC streaming. What type of streaming would you use?"

**Hruday's answer:**
> Server streaming is the right choice here. From the client's (mobile app's) perspective: it sends one request with the orderId it wants to track, and the server keeps the connection open and pushes updates whenever the order state changes.
>
> The proto definition: `rpc TrackOrder (TrackOrderRequest) returns (stream OrderStatusUpdate)`. The client sends one `TrackOrderRequest` with `orderId`. The server resolves resolver for the order, subscribes to an internal event stream (Kafka topic or Redis pub/sub for order events), and for each state change event — `OrderPicked`, `OrderShipped`, `OutForDelivery`, `Delivered` — it pushes an `OrderStatusUpdate` message to the client. The stream closes when the order reaches terminal state (Delivered, Cancelled) or the client disconnects.
>
> HTTP/2 makes this efficient: the tracking stream for order ORD-42 and a simultaneous payment verification for order ORD-88 both run over the SAME TCP connection between the app and the gateway. HTTP/1.1 would need two connections.
>
> Mobile client handling: register a stream observer that updates the UI on each `onNext()` call. On `onError()`: reconnect with exponential backoff. On `onCompleted()`: stream is cleanly finished (order is terminal state), stop reconnecting.
>
> One design note: for browser apps, this would need a grpc-web proxy (like Envoy) in front of the gRPC service, since browsers can't speak gRPC protocol natively over HTTP/2. For native mobile (Android/iOS): gRPC works natively.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "gRPC is better than REST" | "I'd use gRPC everywhere — it's faster and more efficient" | "gRPC is better for service-to-service communication in specific contexts — high frequency, low latency, streaming needs, polyglot teams. For external APIs, browser clients, public developer APIs: REST is still the right choice. Browsers cannot call gRPC directly — you need a grpc-web proxy layer, adding infrastructure complexity. External developers know REST and Swagger/OpenAPI — they don't know how to use a .proto file or a generated stub. gRPC is a tool for internal communication, not a universal replacement for REST. The answer to 'gRPC or REST?' is always 'it depends on who the caller is.'" |
| "Backward compatibility in proto files is automatic" | "Proto files are backward compatible by default" | "Proto3 has backward-compatible serialisation by default — unknown fields are ignored on read, missing fields get zero values. But backward compatibility can still be broken at the APPLICATION level. If you remove a required field from a request and the server logic now fails without it, old message senders sending that field to a new server version may not trigger errors — but new message senders that don't send it may fail. The serialisation survives; the business logic may not. The strict rule: never change or reuse field numbers. Never reorder fields. Add new fields only with new numbers. Explicitly mark deleted field numbers as `reserved 5;` and deleted field names as `reserved "old_field";` to prevent accidental reuse in future." |
| "gRPC has no error handling" | "gRPC is just RPC — it doesn't have HTTP status codes or error handling" | "gRPC has a rich status code system — 16 codes covering most scenarios: OK (success), NOT_FOUND, ALREADY_EXISTS, PERMISSION_DENIED, UNAUTHENTICATED, INVALID_ARGUMENT, DEADLINE_EXCEEDED, UNAVAILABLE (service down, equivalent to 503), INTERNAL (unexpected server error), and others. These map reasonably to HTTP status codes. The error is returned as a `Status` object with code + descriptive message. You can attach structured error details using `google.rpc.ErrorInfo` or custom Protobuf error detail messages. gRPC error handling is actually MORE standardised than REST, where teams make different decisions about error body structure. The grpc status codes translate to HTTP status codes transparently when an HTTP/REST gateway sits in front." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, our microservices used REST internally — it worked but we saw JSON parsing overhead in our profiling data for high-frequency order processing service calls, plus occasional version mismatches between services that only surfaced at runtime. Reading about gRPC made me understand why Google and Netflix adopted it for internal service mesh communication: the strongly typed .proto contract makes cross-team API changes visible at compile time instead of at 3am in production. I've studied gRPC thoroughly in preparation for the Razorpay and PhonePe stack, where high-frequency internal calls between payment, inventory, and notification services make gRPC's binary efficiency a genuine operational advantage."

---

## 8. Scale Evolution

**1,000 users →** REST for internal services — overhead is negligible. If streaming is needed: REST + WebSocket (simpler operational complexity than gRPC). Proto files set up but services still use REST.

**100,000 users →** Migrate high-frequency internal service calls to gRPC (payment ↔ inventory ↔ notification). gRPC health checking for liveness probes. Deadlines (timeouts) set on all gRPC calls. Protobuf schema registry to track .proto versions. grpc-web proxy for any browser clients.

**10 million users →** Service mesh with Envoy sidecars handling gRPC load balancing, observability (gRPC metrics out of the box), TLS between all services. Bidirectional streaming for real-time telemetry (IoT devices, trading, logistics). Protobuf schema CI checks — build fails on incompatible proto changes. gRPC server reflection for internal debugging tooling. Separate gRPC ports from REST ports at load balancer level.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flow: payment service → fraud check service → bank gateway → settlement service. 10,000+ RPC calls per minute. gRPC's binary efficiency and type safety reduce latency and prevent schema mismatch bugs at each service boundary. | "Design the internal communication between payment processing, fraud detection, and settlement services at Razorpay scale. Would you use REST or gRPC?" |
| Swiggy / Meesho | Order processing chain: order service → inventory → logistics → notification. Real-time delivery tracking needs server streaming. High-frequency calls during lunch peak. | "A delivery partner's GPS sends location updates 5 times per minute per delivery. Design the communication between the GPS tracker client and the tracking backend." |
| Adobe / Microsoft | Creative Cloud: large asset processing pipelines, real-time collaborative document editing, multi-service rendering workflows. Microsoft uses gRPC extensively in Azure service mesh. | "How would you design the communication protocol for a document processing pipeline where the document goes through 6 processing stages, each a separate microservice, with interim progress reporting to the user?" |
| SAP Labs (current) | High-frequency ERP data synchronisation between microservices. SAP's internal S/4HANA cloud services use gRPC-style binary protocols for performance. | "SAP wants to replace its REST-based internal service calls between ERP modules with a more efficient protocol. How would you evaluate and propose gRPC adoption?" |

---

## 10. Related Topics — What to Study Next

- **Topic 130 — GraphQL vs REST** — the third paradigm in the REST/GraphQL/gRPC triangle; understanding all three gives the complete API design vocabulary, and interviewers often ask you to compare all three simultaneously
- **Topic 66 — Synchronous vs Asynchronous Communication** — gRPC provides synchronous (unary) and streaming (async) modes; choosing which to use maps directly to the synchronous vs asynchronous service communication trade-off in microservices
- **Topic 71 — Circuit Breaker** — gRPC clients need circuit breakers just like REST clients; `DEADLINE_EXCEEDED` and `UNAVAILABLE` gRPC status codes map to the same failure scenarios that circuit breakers protect against; Resilience4j supports gRPC
- **Topic 136 — API Gateway** — the gateway layer translates external REST requests to internal gRPC calls; the REST↔gRPC translation pattern (gRPC-gateway, Envoy grpc-json-transcoder) enables REST-facing public API while using gRPC for internal performance

---

*Part 7 · gRPC — Protocol Buffers, Streaming, Use Cases · Full Stack Interview Guide · Hruday D · 2026*
