# 30. REST vs RPC

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**REST (Representational State Transfer)** and **RPC (Remote Procedure Call)** are two fundamentally different approaches to designing APIs for distributed systems.

**What they are:**
- **REST**: Architectural style treating everything as resources (nouns) accessed via HTTP methods
- **RPC**: Remote procedure invocation style treating API calls as function calls (verbs)

**Why they exist:**
- **REST**: Standardize web APIs with resource-oriented design, stateless operations
- **RPC**: Enable calling remote functions as if they were local, hide network complexity

**Problem they solve:**
- **REST**: How to design scalable, cacheable, resource-oriented web APIs
- **RPC**: How to make distributed function calls feel like local function calls

**In large-scale distributed systems:**
- **REST** dominates public APIs (GitHub, Stripe, Twitter)
- **RPC** (especially gRPC) dominates internal microservices communication
- Trade-off: REST's flexibility vs RPC's performance and type safety
- Modern systems often use both: REST for external, gRPC for internal

💡 **Interview Opening:** "REST and RPC represent different API design philosophies. REST is resource-oriented, uses HTTP methods semantically, and is stateless and cacheable—ideal for public APIs. RPC is action-oriented, treats remote calls like function invocations, and prioritizes performance with binary protocols like gRPC—ideal for internal microservices. The choice depends on whether you need HTTP compatibility and caching (REST) or performance and strong typing (RPC)."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **REST Architecture Principles**

#### **Core REST Constraints**

**1. Client-Server Separation:**
- Clear boundary between UI and data storage
- Enables independent evolution

**2. Stateless:**
- Each request contains all information needed
- Server doesn't store client session
- Improves scalability (no session state to replicate)

**3. Cacheable:**
- Responses must define if they're cacheable
- Reduces server load, improves latency

**4. Uniform Interface:**
- Resources identified by URIs
- Standard HTTP methods (GET, POST, PUT, DELETE)
- Self-descriptive messages
- HATEOAS (Hypermedia As The Engine Of Application State)

**5. Layered System:**
- Client can't tell if connected to end server or intermediary
- Enables load balancers, caches, proxies

**6. Code on Demand (Optional):**
- Server can send executable code (JavaScript)

#### **REST API Design**

**Resource-Oriented URLs:**
```http
GET    /api/users           # List users
GET    /api/users/123       # Get specific user
POST   /api/users           # Create user
PUT    /api/users/123       # Replace user
PATCH  /api/users/123       # Update user
DELETE /api/users/123       # Delete user

# Nested resources
GET    /api/users/123/posts       # User's posts
POST   /api/users/123/posts       # Create post for user
GET    /api/users/123/posts/456   # Specific post
```

**HTTP Methods Semantics:**
```
GET    - Retrieve (safe, idempotent, cacheable)
POST   - Create (not idempotent)
PUT    - Replace (idempotent)
PATCH  - Partial update
DELETE - Remove (idempotent)
HEAD   - Get metadata only
OPTIONS - Describe available methods
```

**REST Response Structure:**
```json
GET /api/users/123
Response: 200 OK
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "_links": {
    "self": "/api/users/123",
    "posts": "/api/users/123/posts",
    "friends": "/api/users/123/friends"
  }
}
```

#### **REST Trade-offs**

**Advantages:**
- ✅ HTTP native (works with web infrastructure)
- ✅ Cacheable (CDN, browser, HTTP caches)
- ✅ Stateless (horizontal scalability)
- ✅ Simple tooling (curl, Postman)
- ✅ Human-readable (JSON over HTTP)
- ✅ Discoverable (HATEOAS)

**Disadvantages:**
- ❌ Verbose (JSON + HTTP overhead)
- ❌ Over-fetching/under-fetching (fixed endpoints)
- ❌ No strong typing (runtime errors)
- ❌ Multiple round-trips for related data
- ❌ No streaming (traditional REST)
- ❌ Ambiguity in design ("RESTful" means different things)

### **RPC Architecture Principles**

#### **Core RPC Concepts**

**Remote Procedure Call:**
```
Client calls function → Network request → Server executes → Returns result
```

**Goal:** Make remote calls look like local calls

**Example:**
```python
# Local function call
result = calculate_tax(amount=1000, country="US")

# RPC (looks identical)
result = rpc_client.calculate_tax(amount=1000, country="US")
```

#### **RPC Implementations**

**1. Traditional RPC:**
- XML-RPC (XML over HTTP)
- JSON-RPC (JSON over HTTP)
- SOAP (XML with strict standards)

**2. Modern RPC (gRPC):**
- Protocol Buffers (binary serialization)
- HTTP/2 (multiplexing, streaming)
- Strong typing (code generation)
- Bidirectional streaming

#### **gRPC Deep-Dive**

**Protocol Buffers (Protobuf):**
```protobuf
// user.proto
syntax = "proto3";

message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
  repeated string roles = 4;
}

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc CreateUser(CreateUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (stream User);
}

message GetUserRequest {
  int64 id = 1;
}
```

**Code Generation:**
```bash
protoc --go_out=. --go-grpc_out=. user.proto
```

**Generated Code (Client):**
```go
// Strongly typed client
client := pb.NewUserServiceClient(conn)
user, err := client.GetUser(ctx, &pb.GetUserRequest{Id: 123})
```

**gRPC Features:**

**1. Streaming:**
```protobuf
service ChatService {
  // Unary (request-response)
  rpc SendMessage(Message) returns (MessageAck);
  
  // Server streaming (server sends multiple responses)
  rpc StreamMessages(Empty) returns (stream Message);
  
  // Client streaming (client sends multiple requests)
  rpc UploadFile(stream FileChunk) returns (UploadAck);
  
  // Bidirectional streaming
  rpc Chat(stream Message) returns (stream Message);
}
```

**2. HTTP/2 Benefits:**
- Multiplexing (multiple RPCs over single connection)
- Header compression
- Binary protocol (efficient)

**3. Deadlines/Timeouts:**
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
user, err := client.GetUser(ctx, request)
```

**4. Interceptors (Middleware):**
```go
// Logging interceptor
func loggingInterceptor(ctx context.Context, method string, req, reply interface{}, 
    cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
    start := time.Now()
    err := invoker(ctx, method, req, reply, cc, opts...)
    log.Printf("Method: %s, Duration: %v, Error: %v", method, time.Since(start), err)
    return err
}
```

#### **RPC Trade-offs**

**Advantages:**
- ✅ High performance (binary protocol)
- ✅ Strong typing (compile-time checks)
- ✅ Code generation (reduce boilerplate)
- ✅ Streaming support (bidirectional)
- ✅ Efficient (Protobuf < JSON)
- ✅ HTTP/2 multiplexing

**Disadvantages:**
- ❌ Not browser-friendly (needs gRPC-Web proxy)
- ❌ Binary format (harder to debug)
- ❌ Less cacheable (POST-based, not GET)
- ❌ Tight coupling (shared .proto files)
- ❌ Tooling complexity (protoc, code generation)
- ❌ Learning curve (Protobuf syntax)

### **REST vs RPC: Detailed Comparison**

#### **Design Philosophy**

**REST:**
```
Focus: Resources (nouns)
/api/users/123
/api/users/123/posts
/api/orders/456

Mental model: CRUD operations on resources
```

**RPC:**
```
Focus: Actions (verbs)
getUserById(123)
getPostsForUser(123)
placeOrder(orderData)

Mental model: Calling remote functions
```

#### **Performance Comparison**

**REST (JSON over HTTP/1.1):**
```
Request size: 
  HTTP headers: ~500 bytes
  JSON payload: {"id": 123} = 11 bytes
  Total: ~511 bytes

Response size:
  HTTP headers: ~300 bytes
  JSON payload: {"id": 123, "name": "John Doe", ...} = ~150 bytes
  Total: ~450 bytes

Round-trip: ~961 bytes
```

**gRPC (Protobuf over HTTP/2):**
```
Request size:
  HTTP/2 headers (compressed): ~50 bytes
  Protobuf payload: 5 bytes (binary)
  Total: ~55 bytes

Response size:
  HTTP/2 headers (compressed): ~30 bytes
  Protobuf payload: 30 bytes (binary)
  Total: ~60 bytes

Round-trip: ~115 bytes (88% smaller!)
```

**Latency Impact:**
```
REST:
  Parse JSON: 0.5-2ms
  HTTP/1.1 overhead: Higher

gRPC:
  Deserialize Protobuf: 0.1-0.5ms (5-10x faster)
  HTTP/2 multiplexing: Lower overhead
  
At 10,000 QPS:
REST: 5-20ms CPU for serialization
gRPC: 1-5ms CPU for serialization
```

#### **Caching**

**REST:**
```http
GET /api/users/123
Cache-Control: max-age=3600
ETag: "abc123"

# Subsequent request:
GET /api/users/123
If-None-Match: "abc123"
→ 304 Not Modified (cached)
```

**gRPC:**
- No built-in HTTP caching (uses POST)
- Application-layer caching required (Redis)
- Trade-off: Performance > caching convenience

#### **Error Handling**

**REST:**
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "USER_NOT_FOUND",
  "message": "User with ID 123 not found",
  "status": 404
}
```

**gRPC:**
```protobuf
Status codes:
- OK (0)
- CANCELLED (1)
- UNKNOWN (2)
- INVALID_ARGUMENT (3)
- DEADLINE_EXCEEDED (4)
- NOT_FOUND (5)
- ALREADY_EXISTS (6)
- PERMISSION_DENIED (7)
- RESOURCE_EXHAUSTED (8)
- FAILED_PRECONDITION (9)
- ABORTED (10)
- OUT_OF_RANGE (11)
- UNIMPLEMENTED (12)
- INTERNAL (13)
- UNAVAILABLE (14)
- DATA_LOSS (15)
- UNAUTHENTICATED (16)

# Rich error details
status.Errorf(codes.NotFound, "user %d not found", userID)
```

### **When to Use REST vs RPC**

#### **Use REST When:**

1. **Public API**: Third-party developers need access
2. **Caching critical**: CDN, browser caching needed
3. **HTTP tooling**: curl, Postman, browser compatibility
4. **Loose coupling**: Clients written in various languages
5. **Resource-oriented**: CRUD operations on entities

**Examples:**
- GitHub API
- Stripe API
- Twitter API
- Public-facing services

#### **Use RPC (gRPC) When:**

1. **Internal microservices**: Performance critical
2. **Polyglot services**: Code generation for multiple languages
3. **Streaming needed**: Real-time data, file uploads
4. **Strong contracts**: Type safety, versioning control
5. **Action-oriented**: Complex operations, not just CRUD

**Examples:**
- Microservices mesh
- Real-time analytics
- IoT device communication
- Internal data pipelines

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **Bandwidth Comparison**

**Scenario:** 1 million API calls/hour

**REST (JSON):**
```
Average request: 500 bytes (headers) + 100 bytes (JSON) = 600 bytes
Average response: 300 bytes (headers) + 500 bytes (JSON) = 800 bytes
Per-request total: 1,400 bytes

Hourly bandwidth:
1M requests × 1,400 bytes = 1.4 GB/hour
Daily: 33.6 GB
Monthly: 1,008 GB ≈ 1 TB

Cost (AWS $0.09/GB egress): $90/month
```

**gRPC (Protobuf):**
```
Average request: 50 bytes (compressed headers) + 20 bytes (Protobuf) = 70 bytes
Average response: 30 bytes (compressed headers) + 100 bytes (Protobuf) = 130 bytes
Per-request total: 200 bytes

Hourly bandwidth:
1M requests × 200 bytes = 200 MB/hour
Daily: 4.8 GB
Monthly: 144 GB

Cost: $13/month

Savings: $77/month (85% reduction)
```

**At FAANG scale (1 billion requests/day):**
```
REST: 1.4 PB/month → $126,000/month
gRPC: 200 TB/month → $18,000/month
Annual savings: $1.3 million
```

### **Latency Estimation**

**REST round-trip:**
```
DNS lookup:           1ms (cached)
TCP handshake:       30ms
TLS handshake:       40ms
HTTP request:        20ms
Server processing:   50ms
JSON serialization:   2ms
HTTP response:       20ms
JSON parsing:         2ms
──────────────────────────
Total:              165ms
```

**gRPC round-trip (persistent connection):**
```
Initial setup:       70ms (done once)
HTTP/2 request:      20ms
Server processing:   50ms
Protobuf serialize: 0.5ms
HTTP/2 response:     20ms
Protobuf parse:     0.5ms
──────────────────────────
Total:               91ms (45% faster)
```

### **Server Capacity**

**REST server (JSON parsing bottleneck):**
```
CPU per request: 2ms (JSON parse/serialize)
1 core = 500 requests/second
10 cores = 5,000 QPS

Memory: ~50MB per 1,000 connections (HTTP/1.1)
```

**gRPC server (efficient Protobuf):**
```
CPU per request: 0.5ms (Protobuf)
1 core = 2,000 requests/second
10 cores = 20,000 QPS (4x throughput)

Memory: ~30MB per 1,000 connections (HTTP/2 multiplexing)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **REST Resource Modeling**

**Example: E-commerce System**

```
Resources:
/api/v1/products           # Product catalog
/api/v1/products/{id}      # Specific product
/api/v1/products/{id}/reviews
/api/v1/users
/api/v1/users/{id}
/api/v1/users/{id}/orders
/api/v1/orders
/api/v1/orders/{id}
/api/v1/orders/{id}/items

Relationships via links:
{
  "order_id": 123,
  "user_id": 456,
  "_links": {
    "self": "/api/v1/orders/123",
    "user": "/api/v1/users/456",
    "items": "/api/v1/orders/123/items"
  }
}
```

**Challenges:**
- N+1 queries (need user → fetch orders → fetch items)
- Over-fetching (get full user object when only need name)
- Under-fetching (multiple requests for related data)

### **RPC Service Modeling**

**Example: Same E-commerce System**

```protobuf
service ProductService {
  rpc GetProduct(ProductRequest) returns (Product);
  rpc SearchProducts(SearchRequest) returns (ProductList);
  rpc GetProductWithReviews(ProductRequest) returns (ProductWithReviews);
}

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc GetOrderDetails(OrderRequest) returns (OrderDetails);  // Includes items
  rpc GetUserOrders(UserRequest) returns (stream Order);
}

message OrderDetails {
  Order order = 1;
  User user = 2;
  repeated OrderItem items = 3;
  // All data in one response
}
```

**Benefits:**
- One RPC returns complete data (no N+1)
- Strongly typed relationships
- Server decides what data to include

### **Versioning Strategies**

**REST:**
```http
# URL versioning
GET /api/v1/users/123
GET /api/v2/users/123

# Header versioning
GET /api/users/123
Accept: application/vnd.myapi.v2+json

# Query parameter
GET /api/users/123?version=2
```

**gRPC:**
```protobuf
// Backward-compatible field additions
message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
  string phone = 4;  // Added later, field number never reused
}

// Versioned services
service UserServiceV1 { ... }
service UserServiceV2 { ... }
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **REST Scalability**

**Stateless design:**
```
Load Balancer
    ↓
[Server1] [Server2] [Server3]
    ↓         ↓         ↓
  Database

Any server can handle any request (no session affinity)
```

**Caching layers:**
```
Client → CDN → Reverse Proxy Cache → Load Balancer → Server
         ↑           ↑
      Edge cache  Application cache
```

**Horizontal scaling:**
- Add more servers behind load balancer
- No shared state (stateless)
- Database becomes bottleneck (address separately)

### **gRPC Scalability**

**Connection pooling:**
```go
// Client maintains pool of connections
pool := grpc.Dial(
    "service.example.com:443",
    grpc.WithDefaultServiceConfig(`{
        "loadBalancingPolicy": "round_robin"
    }`),
)
```

**Load balancing strategies:**

**1. Client-side (Lookaside LB):**
```
Client queries resolver for backend IPs
Client load balances across backends directly
```

**2. Proxy-based:**
```
Client → Envoy Proxy → Backend servers
         (L7 load balancing)
```

**3. Service mesh:**
```
Client → Sidecar → Backend sidecar → Backend
         (Intelligent routing, retries, circuit breaking)
```

### **Retry Strategies**

**REST:**
```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(requests.exceptions.RequestException)
)
def call_api(url):
    response = requests.get(url, timeout=5)
    response.raise_for_status()
    return response.json()
```

**gRPC:**
```json
// Service config
{
  "methodConfig": [{
    "name": [{"service": "UserService"}],
    "retryPolicy": {
      "maxAttempts": 3,
      "initialBackoff": "0.1s",
      "maxBackoff": "10s",
      "backoffMultiplier": 2,
      "retryableStatusCodes": ["UNAVAILABLE", "DEADLINE_EXCEEDED"]
    }
  }]
}
```

### **Circuit Breaker**

**REST:**
```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=60)
def call_payment_service():
    return requests.post("https://payment.example.com/charge", ...)
```

**gRPC:**
```go
// Using go-grpc-middleware
breaker := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "payment-service",
    MaxRequests: 3,
    Timeout:     60 * time.Second,
})

client.ChargePayment(ctx, request)  // Wrapped with breaker
```

### **Timeout Handling**

**REST:**
```http
Client timeout: 30 seconds (total request timeout)
Connection timeout: 5 seconds (TCP handshake)
Read timeout: 25 seconds (waiting for response)
```

**gRPC:**
```go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

response, err := client.GetUser(ctx, request)
// Server sees deadline and can cancel long-running operations
```

**Deadline propagation:**
```
Client (10s deadline) → Service A (8s left) → Service B (6s left) → Database
                        ↓
            Automatic deadline propagation
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **REST Security**

**Authentication:**
```http
# API Key
GET /api/users HTTP/1.1
X-API-Key: sk_live_1234567890

# OAuth 2.0 Bearer Token
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Basic Auth (rare in production)
Authorization: Basic dXNlcjpwYXNz
```

**Rate Limiting:**
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1609459200

# When exceeded:
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
```

**CORS:**
```http
OPTIONS /api/users HTTP/1.1
Origin: https://app.example.com

Response:
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

### **gRPC Security**

**TLS/mTLS:**
```go
// Server
creds, _ := credentials.NewServerTLSFromFile("server.crt", "server.key")
server := grpc.NewServer(grpc.Creds(creds))

// Client
creds, _ := credentials.NewClientTLSFromFile("ca.crt", "")
conn, _ := grpc.Dial("service:443", grpc.WithTransportCredentials(creds))
```

**Authentication (Interceptor):**
```go
func authInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, 
    handler grpc.UnaryHandler) (interface{}, error) {
    
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        return nil, status.Error(codes.Unauthenticated, "missing metadata")
    }
    
    token := md["authorization"]
    if !validateToken(token) {
        return nil, status.Error(codes.Unauthenticated, "invalid token")
    }
    
    return handler(ctx, req)
}

server := grpc.NewServer(grpc.UnaryInterceptor(authInterceptor))
```

**Authorization:**
```go
func checkPermission(ctx context.Context, resource string, action string) error {
    user := getUserFromContext(ctx)
    if !user.HasPermission(resource, action) {
        return status.Error(codes.PermissionDenied, "access denied")
    }
    return nil
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Netflix (REST to gRPC Migration)**

**Before: REST JSON APIs**
- 50,000+ microservices
- JSON serialization bottleneck
- High latency at scale

**After: gRPC**
- 30% latency reduction
- 60% bandwidth reduction
- Improved developer experience (type safety)

**Hybrid approach:**
```
External (clients) → REST API Gateway
                          ↓
Internal (microservices) → gRPC
```

### **Example 2: Uber (gRPC for Microservices)**

**Use case:** Dispatch system

```protobuf
service DispatchService {
  // Find nearby drivers
  rpc FindDrivers(Location) returns (stream Driver);
  
  // Send ride request to driver
  rpc RequestRide(RideRequest) returns (RideResponse);
  
  // Real-time location updates
  rpc StreamLocation(stream Location) returns (Empty);
}
```

**Benefits:**
- Bidirectional streaming for real-time updates
- Strong typing prevented runtime errors
- 10x throughput improvement over REST

### **Example 3: Stripe (REST API Excellence)**

**Public API design:**
```http
POST https://api.stripe.com/v1/charges
Authorization: Bearer sk_test_...
Content-Type: application/x-www-form-urlencoded

amount=2000&currency=usd&source=tok_visa

Response:
{
  "id": "ch_1234",
  "object": "charge",
  "amount": 2000,
  "currency": "usd",
  "status": "succeeded",
  ...
}
```

**Why REST:**
- Developer-friendly (curl, Postman)
- Language-agnostic clients
- Extensive documentation
- Idempotency keys for reliability

**Internal:** Uses gRPC between services

### **Example 4: Google (gRPC Creators)**

**gRPC use cases:**
- **Google Cloud APIs**: Internal gRPC, exposed via REST proxy
- **YouTube**: gRPC for backend microservices
- **Google Ads**: 1 million+ QPS between services

**Architecture:**
```
Mobile/Web → REST/JSON → API Gateway → gRPC Proxy
                                            ↓
                                     gRPC Services
                                            ↓
                                        Databases
```

### **Example 5: Twilio (REST API for Simplicity)**

**Why REST:**
```http
POST /2010-04-01/Accounts/{AccountSid}/Messages.json
Authorization: Basic ...

Body: "Hello, World!"
To: "+15551234567"
From: "+15559876543"
```

**Reasons:**
- Simple use case (send message)
- Broad client support
- Webhooks for callbacks (HTTP POST)
- Developer onboarding (curl examples)

**Lesson:** Use REST for simple, developer-facing APIs

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: When would you choose REST over RPC (gRPC), and vice versa?**

**Answer:**
"The choice between REST and RPC depends on several factors:

**I'd choose REST when:**

1. **Public API for third-party developers**: REST is universal, works with any HTTP client, and has excellent tooling (Postman, curl, browser). Examples: Stripe, GitHub, Twitter APIs.

2. **Caching is critical**: REST leverages HTTP caching (CDN, browser, reverse proxies). GET requests are cacheable by default, reducing server load by 70-90% for read-heavy workloads.

3. **Resource-oriented domain**: If the domain naturally maps to CRUD operations on resources (users, products, orders), REST's resource-centric design is intuitive.

4. **Loose coupling needed**: REST's text-based JSON format doesn't require shared code or tooling, making it easier for diverse clients.

**I'd choose gRPC when:**

1. **Internal microservices**: Performance matters. gRPC with Protobuf is 3-10x faster than REST with JSON due to binary serialization and HTTP/2 multiplexing. At scale, this translates to significant cost savings—I estimated 85% bandwidth reduction for a high-throughput service.

2. **Strong typing required**: Protocol Buffers enforce contracts at compile-time, preventing runtime errors. Code generation in multiple languages ensures consistency.

3. **Streaming needed**: gRPC natively supports server streaming (real-time updates), client streaming (file uploads), and bidirectional streaming (chat, live collaboration).

4. **Polyglot microservices**: Code generation from .proto files creates consistent clients in Go, Java, Python, etc., reducing integration errors.

**Real-world pattern I'd recommend:**
- **External-facing**: REST API with OpenAPI docs
- **API Gateway**: Translates REST to gRPC
- **Internal services**: gRPC for performance and type safety
- **Example**: Netflix, Uber, Google all use this hybrid approach."

### **Common Follow-Up Questions**

**Q1: What are the main performance differences between REST and gRPC?**
```
Answer:
Three key performance dimensions:

1. **Serialization speed:**
   - JSON (REST): Text-based, human-readable, slower parsing
   - Protobuf (gRPC): Binary, optimized, 5-10x faster
   - At 10,000 QPS: REST uses 10-20ms CPU vs gRPC's 2-4ms

2. **Payload size:**
   - REST: JSON + HTTP headers = ~1KB for simple request
   - gRPC: Protobuf + HTTP/2 compressed headers = ~100 bytes
   - 90% size reduction → bandwidth cost savings

3. **Connection overhead:**
   - REST (HTTP/1.1): Multiple TCP connections or head-of-line blocking
   - gRPC (HTTP/2): Single multiplexed connection
   - Eliminates handshake overhead, reduces latency by 20-40%

Benchmark example:
- REST: 165ms first request (TCP + TLS + HTTP)
- gRPC: 70ms first request, then 91ms per request (reused connection)
- gRPC 45% faster in typical scenarios

Trade-off: gRPC's performance comes at cost of complexity and tooling requirements.
```

**Q2: How do you handle versioning in REST vs gRPC?**
```
Answer:

**REST versioning strategies:**

1. **URL versioning (most common):**
   - /api/v1/users
   - /api/v2/users
   - Pros: Clear, explicit, cacheable per version
   - Cons: Version proliferation

2. **Header versioning:**
   - Accept: application/vnd.myapi.v2+json
   - Pros: Same URL, content negotiation
   - Cons: Less visible, harder to cache

3. **Query parameter:**
   - /api/users?version=2
   - Pros: Simple
   - Cons: Messy URLs, cache issues

**gRPC versioning strategies:**

1. **Protocol Buffers backward compatibility:**
   - Add fields with new numbers (never reuse)
   - Optional fields by default
   - Old clients ignore new fields
   - New clients handle missing old fields

   Example:
   message User {
     int64 id = 1;
     string name = 2;
     string email = 3;
     string phone = 4;  // Added later, old clients ignore
   }

2. **Separate service versions:**
   service UserServiceV1 { ... }
   service UserServiceV2 { ... }
   - Run both simultaneously, deprecate V1 gradually

3. **Feature flags:**
   - Single service, conditional logic based on client version

**Best practice:**
- REST: URL versioning for breaking changes
- gRPC: Backward-compatible field additions, separate services only when necessary
```

**Q3: Explain the N+1 query problem in REST and how GraphQL/gRPC solve it.**
```
Answer:

**The N+1 problem in REST:**

Scenario: Display user with their 10 recent posts

REST approach:
1. GET /api/users/123        # 1 query
2. GET /api/posts?user_id=123 # 1 query for all posts

OR if posts embedded:
1. GET /api/users/123        # 1 query
2. For each post, GET /api/posts/{id}/comments  # N queries

Total: 1 + N queries (N+1 problem)

**How GraphQL solves it:**
query {
  user(id: 123) {
    name
    posts(limit: 10) {
      title
      comments {
        text
      }
    }
  }
}

Single request, server batches database queries efficiently.

**How gRPC solves it:**
message GetUserWithPostsRequest {
  int64 user_id = 1;
  int32 posts_limit = 2;
  bool include_comments = 3;
}

rpc GetUserWithPosts(GetUserWithPostsRequest) returns (UserWithPosts);

Server returns complete data in one RPC:
- User info
- Posts (up to limit)
- Comments (if requested)

**Trade-offs:**
- REST: Simple but multiple round-trips
- GraphQL: Flexible but complex queries can be expensive
- gRPC: Efficient but need to define specific methods (less flexible)

**Best practice:** 
- For public APIs: Offer both list endpoints and detail endpoints
- For internal: gRPC with purpose-built methods
```

**Q4: How do you implement authentication in REST vs gRPC?**
```
Answer:

**REST authentication:**

1. **API Keys:**
   GET /api/users
   X-API-Key: sk_live_1234567890
   
   - Simple, good for server-to-server
   - No expiration unless manually revoked

2. **OAuth 2.0 / JWT:**
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   - Stateless, includes claims (user ID, roles)
   - Expiration built-in (exp claim)
   - Can refresh with refresh token

3. **Session cookies:**
   Cookie: session=abc123; HttpOnly; Secure
   
   - Server stores session state
   - Good for browser-based apps

**gRPC authentication:**

1. **TLS certificates (mTLS):**
   creds := credentials.NewTLS(&tls.Config{
       ClientAuth: tls.RequireAndVerifyClientCert,
   })
   
   - Strong mutual authentication
   - Common for service-to-service

2. **Token-based (metadata):**
   md := metadata.Pairs("authorization", "Bearer "+token)
   ctx := metadata.NewOutgoingContext(context.Background(), md)
   client.GetUser(ctx, request)
   
   - Similar to REST Bearer tokens
   - Validated in server interceptor

3. **Interceptor pattern:**
   func authInterceptor(ctx, req, info, handler) {
       token := extractToken(ctx)
       if !validate(token) {
           return status.Error(codes.Unauthenticated, "invalid")
       }
       ctx = setUserContext(ctx, user)
       return handler(ctx, req)
   }

**Best practice:**
- REST public API: OAuth 2.0 / JWT
- gRPC internal: mTLS + token in metadata
- Both: Implement rate limiting per user/API key
```

**Q5: What are the challenges of debugging gRPC compared to REST?**
```
Answer:

**REST is easier to debug because:**

1. **Human-readable:**
   curl -X GET https://api.example.com/users/123
   {
     "id": 123,
     "name": "John Doe"
   }
   
   - Plain text JSON
   - Visible in browser DevTools
   - Easy to inspect

2. **Standard tooling:**
   - curl, Postman, HTTPie
   - Browser (for GET requests)
   - Wireshark shows readable HTTP

**gRPC is harder because:**

1. **Binary protocol:**
   - Can't just curl
   - Wireshark shows binary data
   - Need .proto files to decode

2. **Tooling required:**
   - grpcurl (like curl for gRPC)
   - Bloomrpc (GUI client)
   - Evans (interactive gRPC client)

**Solutions for gRPC debugging:**

1. **grpcurl:**
   grpcurl -d '{"id": 123}' \
     -H "authorization: Bearer token" \
     api.example.com:443 \
     UserService/GetUser

2. **gRPC reflection:**
   - Enable reflection API
   - Clients can discover available methods
   - grpcurl list api.example.com:443

3. **Logging interceptors:**
   func loggingInterceptor(ctx, method, req, reply, cc, invoker) {
       log.Printf("Request: %+v", req)
       err := invoker(ctx, method, req, reply, cc)
       log.Printf("Response: %+v, Error: %v", reply, err)
       return err
   }

4. **Distributed tracing:**
   - OpenTelemetry/Jaeger
   - Trace requests across gRPC services
   - Visualize call graph

**Best practice:**
- Development: Enable verbose logging
- Staging: gRPC reflection enabled
- Production: Distributed tracing, disable reflection (security)
```

### **Key Talking Points**

1. **"REST for external, gRPC for internal"**: Common pattern at scale
2. **"Performance vs simplicity trade-off"**: gRPC is faster but more complex
3. **"HTTP caching is REST's killer feature"**: Can't replicate in gRPC
4. **"Strong typing prevents bugs"**: gRPC's compile-time checks
5. **"Streaming is where gRPC shines"**: Bidirectional real-time communication

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **REST API Flow**

```
┌────────┐                             ┌────────┐
│ Client │                             │ Server │
└───┬────┘                             └───┬────┘
    │                                      │
    │ GET /api/users/123                   │
    │ Authorization: Bearer <token>        │
    ├─────────────────────────────────────►│
    │                                      │
    │                          Parse JSON, │
    │                         Query DB, etc│
    │                                      │
    │ HTTP/1.1 200 OK                      │
    │ Content-Type: application/json       │
    │ Cache-Control: max-age=3600          │
    │ {                                    │
    │   "id": 123,                         │
    │   "name": "John Doe",                │
    │   "email": "john@example.com"        │
    │ }                                    │
    │◄─────────────────────────────────────┤
    │                                      │
```

### **gRPC Flow**

```
┌────────┐                             ┌────────┐
│ Client │                             │ Server │
└───┬────┘                             └───┬────┘
    │                                      │
    │ GetUser RPC                          │
    │ HTTP/2 POST (binary Protobuf)        │
    │ Metadata: authorization=Bearer       │
    ├─────────────────────────────────────►│
    │                                      │
    │                    Deserialize Proto,│
    │                        Query DB, etc │
    │                                      │
    │ HTTP/2 Response (binary Protobuf)    │
    │ User{id=123, name="John Doe", ...}   │
    │◄─────────────────────────────────────┤
    │                                      │
```

### **REST Client Implementation**

```python
import requests
from typing import Dict, Any

class UserAPIClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })
    
    def get_user(self, user_id: int) -> Dict[str, Any]:
        """Get user by ID"""
        response = self.session.get(
            f'{self.base_url}/users/{user_id}',
            timeout=5
        )
        response.raise_for_status()
        return response.json()
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new user"""
        response = self.session.post(
            f'{self.base_url}/users',
            json=user_data,
            timeout=5
        )
        response.raise_for_status()
        return response.json()
    
    def update_user(self, user_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Partial update user"""
        response = self.session.patch(
            f'{self.base_url}/users/{user_id}',
            json=updates,
            timeout=5
        )
        response.raise_for_status()
        return response.json()

# Usage
client = UserAPIClient('https://api.example.com', 'sk_live_123')
user = client.get_user(123)
print(f"User: {user['name']}")
```

### **gRPC Client Implementation**

```python
# user.proto
syntax = "proto3";

message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
}

message GetUserRequest {
  int64 id = 1;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc CreateUser(CreateUserRequest) returns (User);
}

# Python client (after code generation)
import grpc
import user_pb2
import user_pb2_grpc

class UserGRPCClient:
    def __init__(self, host: str, port: int, token: str):
        self.channel = grpc.secure_channel(
            f'{host}:{port}',
            grpc.ssl_channel_credentials()
        )
        self.stub = user_pb2_grpc.UserServiceStub(self.channel)
        self.token = token
    
    def get_user(self, user_id: int):
        """Get user by ID"""
        metadata = [('authorization', f'Bearer {self.token}')]
        request = user_pb2.GetUserRequest(id=user_id)
        
        try:
            response = self.stub.GetUser(
                request,
                metadata=metadata,
                timeout=5
            )
            return response
        except grpc.RpcError as e:
            print(f"Error: {e.code()}, {e.details()}")
            raise
    
    def create_user(self, name: str, email: str):
        """Create new user"""
        metadata = [('authorization', f'Bearer {self.token}')]
        request = user_pb2.CreateUserRequest(name=name, email=email)
        
        response = self.stub.CreateUser(
            request,
            metadata=metadata,
            timeout=5
        )
        return response

# Usage
client = UserGRPCClient('api.example.com', 443, 'token_123')
user = client.get_user(123)
print(f"User: {user.name}")
```

### **Hybrid Architecture (Common Pattern)**

```
                          Internet
                             │
                             ▼
                    ┌────────────────┐
                    │  API Gateway   │
                    │   (REST API)   │
                    └────────┬───────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐  ┌──────────┐
        │  Auth    │   │  User    │  │  Order   │
        │ Service  │   │ Service  │  │ Service  │
        │  (gRPC)  │   │  (gRPC)  │  │  (gRPC)  │
        └──────────┘   └──────────┘  └──────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                      ┌────────────┐
                      │  Database  │
                      └────────────┘

External: REST (developer-friendly)
Internal: gRPC (performance)
API Gateway: Translates REST ↔ gRPC
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why REST vs RPC Matters**

**Business Impact:**
- **Developer experience**: REST's simplicity speeds up integration
- **Cost**: gRPC can reduce bandwidth costs by 85% at scale
- **Time to market**: REST's tooling enables faster prototyping
- **Performance**: gRPC's efficiency supports 3-10x higher throughput

**Technical Impact:**
- **Latency**: gRPC 30-50% faster for microservices
- **Type safety**: gRPC prevents integration bugs
- **Caching**: REST leverages HTTP caching infrastructure
- **Flexibility**: REST's loose coupling vs gRPC's tight contracts

### **How They Work (Simple Summary)**

**REST:**
1. Client sends HTTP request (GET, POST, etc.) to resource URL
2. Server processes, returns HTTP response with JSON
3. Leverages HTTP features (caching, status codes, headers)
4. Stateless (no client session on server)

**RPC (gRPC):**
1. Client calls method on stub (generated code)
2. Request serialized to Protobuf binary
3. Sent over HTTP/2 (multiplexed, compressed)
4. Server deserializes, executes method, returns result
5. Connection reused for subsequent calls

### **Key Trade-offs**

| Aspect | REST | gRPC |
|--------|------|------|
| **Protocol** | HTTP/1.1 or HTTP/2 | HTTP/2 only |
| **Format** | JSON (text) | Protobuf (binary) |
| **Performance** | Slower (JSON parsing) | Faster (binary) |
| **Browser support** | Native | Needs gRPC-Web proxy |
| **Caching** | HTTP caching works | Application-layer only |
| **Streaming** | Not standard | Native support |
| **Tooling** | curl, Postman, browser | grpcurl, Bloomrpc |
| **Learning curve** | Low | Medium-high |
| **Flexibility** | High (loose coupling) | Lower (tight contracts) |

### **Remember These Numbers**

```
REST payload:       ~1KB (JSON + headers)
gRPC payload:       ~100 bytes (Protobuf + compressed headers)
Size reduction:     90%

REST latency:       165ms (first request with TLS)
gRPC latency:       91ms (with connection reuse)
Latency reduction:  45%

REST throughput:    5,000 QPS per core (JSON bottleneck)
gRPC throughput:    20,000 QPS per core (efficient Protobuf)
Throughput gain:    4x
```

### **Production Wisdom**

✅ **Use REST for public APIs** (developer experience, tooling, HTTP compatibility)  
✅ **Use gRPC for internal microservices** (performance, type safety, streaming)  
✅ **Implement API gateway** (translate REST to gRPC for hybrid approach)  
✅ **Leverage HTTP caching for REST** (CDN, browser, reverse proxies)  
✅ **Use connection pooling for gRPC** (amortize HTTP/2 handshake)  
✅ **Version APIs carefully** (URL versioning for REST, backward-compatible fields for gRPC)  
✅ **Add interceptors/middleware** (auth, logging, metrics for both)  

❌ **Don't use gRPC for browser-first apps** (REST is simpler)  
❌ **Don't ignore caching in REST** (leverage HTTP layer)  
❌ **Don't couple services tightly with gRPC** (versioning becomes hard)  
❌ **Don't assume REST is slow** (HTTP/2 + caching can be very fast)  
❌ **Don't use gRPC without proper tooling** (grpcurl, reflection, monitoring)  

---

**Final thought for interviews:**

> "REST and RPC are complementary, not competing. REST's resource-oriented design and HTTP compatibility make it ideal for public APIs where developer experience matters. gRPC's performance and type safety make it perfect for internal microservices where throughput and reliability are critical. The best architectures use both: REST externally for accessibility, gRPC internally for efficiency. Companies like Netflix, Uber, and Google exemplify this hybrid approach, proving that choosing the right tool for each use case beats dogmatically sticking to one paradigm."
