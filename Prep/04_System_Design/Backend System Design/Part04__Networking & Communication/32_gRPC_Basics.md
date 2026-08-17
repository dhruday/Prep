# 32. gRPC Basics

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**gRPC (gRPC Remote Procedure Call)** is a high-performance, open-source RPC framework developed by Google that uses HTTP/2 for transport, Protocol Buffers (Protobuf) for serialization, and provides features like bidirectional streaming, flow control, and multiplexing.

**What it is:**
- Modern RPC framework for inter-service communication
- Uses Protocol Buffers for interface definition and serialization
- Built on HTTP/2 for performance and advanced features
- Supports multiple programming languages with code generation

**Why it exists:**
- Enable efficient, type-safe communication between microservices
- Reduce bandwidth and latency compared to JSON/REST
- Provide streaming capabilities for real-time data transfer
- Offer strong contracts through Protocol Buffers schemas

**Problem it solves:**
- Performance overhead of JSON serialization in REST APIs
- Lack of type safety and contract enforcement in HTTP APIs
- Need for bidirectional streaming in microservices
- Language-agnostic service definitions with code generation

**In large-scale distributed systems:**
- Standard for internal microservices communication (Google, Netflix, Uber)
- Replaces REST for performance-critical service-to-service calls
- Enables efficient real-time data streaming (analytics, monitoring)
- Reduces operational costs through bandwidth savings (70-90% reduction)

💡 **Interview Opening:** "gRPC is a high-performance RPC framework that uses HTTP/2 and Protocol Buffers to enable efficient microservices communication. Compared to REST with JSON, gRPC offers 3-10x better performance through binary serialization, multiplexed streams, and lower overhead. It's ideal for internal service-to-service communication where performance matters, providing strong typing, code generation, and native streaming support. Companies like Google, Netflix, and Uber use gRPC extensively for backend microservices while keeping REST for public APIs."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Core gRPC Components**

#### **1. Protocol Buffers (Protobuf)**

**Schema Definition:**
```protobuf
syntax = "proto3";

package user.v1;

// Service definition
service UserService {
  // Unary RPC (request-response)
  rpc GetUser(GetUserRequest) returns (User);
  
  // Server streaming (server sends multiple responses)
  rpc ListUsers(ListUsersRequest) returns (stream User);
  
  // Client streaming (client sends multiple requests)
  rpc CreateUsers(stream CreateUserRequest) returns (CreateUsersResponse);
  
  // Bidirectional streaming
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}

// Message definitions
message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
  repeated string roles = 4;
  google.protobuf.Timestamp created_at = 5;
}

message GetUserRequest {
  int64 id = 1;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
  UserFilter filter = 3;
}

message UserFilter {
  optional string name_prefix = 1;
  optional bool is_active = 2;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message CreateUsersResponse {
  int32 created_count = 1;
  repeated User users = 2;
}

message ChatMessage {
  string user_id = 1;
  string message = 2;
  google.protobuf.Timestamp timestamp = 3;
}
```

**Protobuf Benefits:**
- **Binary serialization**: 3-10x smaller than JSON
- **Schema evolution**: Add fields without breaking compatibility
- **Strong typing**: Compile-time type checking
- **Fast parsing**: 20-100x faster than JSON
- **Cross-language**: Same .proto generates code for Go, Java, Python, etc.

#### **2. Code Generation**

```bash
# Generate Go code
protoc --go_out=. --go-grpc_out=. user.proto

# Generate Java code
protoc --java_out=. --grpc-java_out=. user.proto

# Generate Python code
python -m grpc_tools.protoc --python_out=. --grpc_python_out=. user.proto
```

**Generated code includes:**
- Strongly-typed message structs
- Service client stubs
- Service server interfaces
- Serialization/deserialization logic

#### **3. HTTP/2 Features**

**Multiplexing:**
```
Single TCP connection:
Stream 1: RPC call 1 ─────►
Stream 2: RPC call 2 ─────►
Stream 3: RPC call 3 ─────►
Stream 4: RPC call 4 ─────►

All interleaved on same connection
No head-of-line blocking at HTTP layer
```

**Header Compression (HPACK):**
```
First request:
:method: POST
:path: /user.v1.UserService/GetUser
content-type: application/grpc
authorization: Bearer token123...

Subsequent requests:
:method: POST (index 2)
:path: /user.v1.UserService/ListUsers
content-type: (index 5)
authorization: (index 8)

Headers compressed using HPACK indexing
```

**Flow Control:**
- Per-stream flow control prevents fast sender from overwhelming slow receiver
- Window-based: Receiver advertises how much data it can accept

### **gRPC Communication Patterns**

#### **1. Unary RPC (Request-Response)**

```go
// Server implementation
func (s *userServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    user, err := s.db.FindUser(ctx, req.Id)
    if err != nil {
        return nil, status.Errorf(codes.NotFound, "user %d not found", req.Id)
    }
    
    return &pb.User{
        Id:    user.ID,
        Name:  user.Name,
        Email: user.Email,
    }, nil
}

// Client call
func main() {
    conn, _ := grpc.Dial("localhost:50051", grpc.WithInsecure())
    defer conn.Close()
    
    client := pb.NewUserServiceClient(conn)
    
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    user, err := client.GetUser(ctx, &pb.GetUserRequest{Id: 123})
    if err != nil {
        log.Fatalf("Error: %v", err)
    }
    
    fmt.Printf("User: %v\n", user)
}
```

#### **2. Server Streaming**

```go
// Server implementation
func (s *userServer) ListUsers(req *pb.ListUsersRequest, stream pb.UserService_ListUsersServer) error {
    users, err := s.db.FindUsers(stream.Context(), req.Filter)
    if err != nil {
        return status.Error(codes.Internal, err.Error())
    }
    
    for _, user := range users {
        if err := stream.Send(&pb.User{
            Id:    user.ID,
            Name:  user.Name,
            Email: user.Email,
        }); err != nil {
            return err
        }
    }
    
    return nil
}

// Client call
func main() {
    stream, err := client.ListUsers(ctx, &pb.ListUsersRequest{})
    if err != nil {
        log.Fatal(err)
    }
    
    for {
        user, err := stream.Recv()
        if err == io.EOF {
            break
        }
        if err != nil {
            log.Fatal(err)
        }
        fmt.Printf("Received user: %v\n", user)
    }
}
```

#### **3. Client Streaming**

```go
// Server implementation
func (s *userServer) CreateUsers(stream pb.UserService_CreateUsersServer) error {
    var users []*pb.User
    
    for {
        req, err := stream.Recv()
        if err == io.EOF {
            // Client finished sending
            return stream.SendAndClose(&pb.CreateUsersResponse{
                CreatedCount: int32(len(users)),
                Users:        users,
            })
        }
        if err != nil {
            return err
        }
        
        user := &pb.User{
            Id:    generateID(),
            Name:  req.Name,
            Email: req.Email,
        }
        users = append(users, user)
    }
}

// Client call
func main() {
    stream, err := client.CreateUsers(ctx)
    if err != nil {
        log.Fatal(err)
    }
    
    for i := 0; i < 100; i++ {
        if err := stream.Send(&pb.CreateUserRequest{
            Name:  fmt.Sprintf("User%d", i),
            Email: fmt.Sprintf("user%d@example.com", i),
        }); err != nil {
            log.Fatal(err)
        }
    }
    
    resp, err := stream.CloseAndRecv()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Created %d users\n", resp.CreatedCount)
}
```

#### **4. Bidirectional Streaming**

```go
// Server implementation
func (s *chatServer) Chat(stream pb.UserService_ChatServer) error {
    for {
        msg, err := stream.Recv()
        if err == io.EOF {
            return nil
        }
        if err != nil {
            return err
        }
        
        // Broadcast to other clients
        response := &pb.ChatMessage{
            UserId:    msg.UserId,
            Message:   msg.Message,
            Timestamp: timestamppb.Now(),
        }
        
        if err := stream.Send(response); err != nil {
            return err
        }
    }
}

// Client call
func main() {
    stream, err := client.Chat(ctx)
    if err != nil {
        log.Fatal(err)
    }
    
    // Goroutine to receive messages
    go func() {
        for {
            msg, err := stream.Recv()
            if err == io.EOF {
                return
            }
            if err != nil {
                log.Fatal(err)
            }
            fmt.Printf("Received: %s\n", msg.Message)
        }
    }()
    
    // Send messages
    for {
        text := readUserInput()
        if err := stream.Send(&pb.ChatMessage{
            UserId:  "user123",
            Message: text,
        }); err != nil {
            log.Fatal(err)
        }
    }
}
```

### **Metadata & Context**

**Sending metadata (headers):**
```go
// Client side
md := metadata.Pairs(
    "authorization", "Bearer token123",
    "request-id", uuid.New().String(),
)
ctx := metadata.NewOutgoingContext(context.Background(), md)

user, err := client.GetUser(ctx, &pb.GetUserRequest{Id: 123})
```

**Receiving metadata:**
```go
// Server side
func (s *userServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        return nil, status.Error(codes.InvalidArgument, "missing metadata")
    }
    
    token := md.Get("authorization")
    if len(token) == 0 {
        return nil, status.Error(codes.Unauthenticated, "missing auth token")
    }
    
    // Validate token...
}
```

### **Error Handling**

**gRPC Status Codes:**
```go
import "google.golang.org/grpc/codes"
import "google.golang.org/grpc/status"

// Return errors with status codes
if user == nil {
    return nil, status.Error(codes.NotFound, "user not found")
}

if !authorized {
    return nil, status.Error(codes.PermissionDenied, "insufficient permissions")
}

if req.Name == "" {
    return nil, status.Error(codes.InvalidArgument, "name is required")
}

// With details
st := status.New(codes.ResourceExhausted, "quota exceeded")
st, _ = st.WithDetails(&pb.QuotaInfo{
    Limit:     1000,
    Remaining: 0,
})
return nil, st.Err()
```

**Standard codes:**
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

### **Interceptors (Middleware)**

**Unary Interceptor:**
```go
func loggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, 
    handler grpc.UnaryHandler) (interface{}, error) {
    
    start := time.Now()
    
    // Pre-processing
    log.Printf("Starting RPC: %s", info.FullMethod)
    
    // Call handler
    resp, err := handler(ctx, req)
    
    // Post-processing
    duration := time.Since(start)
    log.Printf("Finished RPC: %s, duration: %v, error: %v", 
        info.FullMethod, duration, err)
    
    return resp, err
}

// Register interceptor
server := grpc.NewServer(
    grpc.UnaryInterceptor(loggingInterceptor),
)
```

**Chaining interceptors:**
```go
server := grpc.NewServer(
    grpc.ChainUnaryInterceptor(
        authInterceptor,
        loggingInterceptor,
        metricsInterceptor,
        tracingInterceptor,
    ),
)
```

### **Trade-offs at FAANG Scale**

**Performance Benefits:**
```
Payload size comparison (typical user object):

JSON (REST):
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "roles": ["user", "admin"]
}
Size: ~120 bytes

Protobuf (gRPC):
Binary encoding of same data
Size: ~30 bytes

Reduction: 75%
```

**Connection efficiency:**
```
REST (HTTP/1.1):
- Need 6-10 connections per client
- Each request: TCP + TLS + HTTP overhead
- No multiplexing

gRPC (HTTP/2):
- Single connection per client
- Multiplexed streams
- Header compression
- Connection reuse

Result: 50-70% reduction in connection overhead
```

**Latency comparison:**
```
REST API call (cold):
TCP handshake:    30ms
TLS handshake:    40ms
HTTP request:     20ms
JSON parse:        2ms
Total:            92ms

gRPC call (warm connection):
HTTP/2 stream:    20ms
Protobuf parse:  0.5ms
Total:          20.5ms

Improvement: 78% faster
```

**CPU utilization:**
```
JSON serialization:   2-5ms per request
Protobuf:            0.2-0.5ms per request

At 10,000 QPS:
REST:  20-50ms CPU per second per core
gRPC:   2-5ms CPU per second per core

CPU savings: 80-90%
```

### **Limitations**

1. **Browser support**: Needs gRPC-Web proxy (not native)
2. **Binary protocol**: Harder to debug (use grpcurl, not curl)
3. **Learning curve**: Protobuf syntax, code generation
4. **HTTP caching**: Doesn't work (POST-based)
5. **Tight coupling**: Shared .proto files between services

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **Bandwidth Savings**

**Scenario:** Payment processing service, 1 million transactions/day

**REST/JSON approach:**
```
Average request size: 800 bytes (JSON + HTTP headers)
Average response size: 600 bytes
Per-transaction: 1,400 bytes

Daily: 1M × 1,400 bytes = 1.4 GB
Monthly: 42 GB
Annual: 504 GB

Cost (AWS $0.09/GB egress): $45/year
```

**gRPC/Protobuf approach:**
```
Average request size: 150 bytes (Protobuf + compressed HTTP/2 headers)
Average response size: 100 bytes
Per-transaction: 250 bytes

Daily: 1M × 250 bytes = 250 MB
Monthly: 7.5 GB
Annual: 90 GB

Cost: $8/year

Savings: $37/year (82% reduction)
```

**At scale (1 billion transactions/day):**
```
REST: 504 TB/year → $45,360/year
gRPC: 90 TB/year → $8,100/year
Annual savings: $37,260
```

### **Connection Capacity**

**REST service:**
```
HTTP/1.1: 6 connections per client
1,000 concurrent clients = 6,000 connections
Memory per connection: 100 KB
Total memory: 600 MB just for connections
```

**gRPC service:**
```
HTTP/2: 1 connection per client
1,000 concurrent clients = 1,000 connections
Memory per connection: 150 KB (includes stream state)
Total memory: 150 MB

Memory savings: 75%
```

### **Latency Budget**

**Microservices chain:**
```
Service A → Service B → Service C → Service D

REST (each call):
Network RTT: 5ms
JSON parse:  2ms
Total:       7ms per hop
Chain:       21ms

gRPC (each call):
Network RTT:    5ms
Protobuf parse: 0.5ms
Total:          5.5ms per hop
Chain:          16.5ms

Latency reduction: 22%
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Schema Evolution**

**Backward compatible changes:**
```protobuf
// Version 1
message User {
  int64 id = 1;
  string name = 2;
}

// Version 2 (backward compatible)
message User {
  int64 id = 1;
  string name = 2;
  string email = 3;      // New field (old clients ignore)
  repeated string roles = 4;  // New field (old clients ignore)
}

// Old client reading V2 data: Ignores unknown fields
// New client reading V1 data: email and roles are empty
```

**Breaking changes to avoid:**
```protobuf
// DON'T: Change field type
message User {
  int64 id = 1;
  int32 name = 2;  // ❌ Was string, now int32
}

// DON'T: Reuse field numbers
message User {
  int64 id = 1;
  // Field 2 was "name", deleted
  string email = 2;  // ❌ Reusing field number 2
}

// DON'T: Change repeated to singular
message User {
  int64 id = 1;
  string role = 2;  // ❌ Was "repeated string roles"
}
```

**Best practices:**
```protobuf
message User {
  int64 id = 1;
  string name = 2;
  
  // Deprecated field (don't remove yet)
  string old_field = 3 [deprecated = true];
  
  // Reserve deleted field numbers
  reserved 4, 5, 6;
  reserved "deleted_field_name";
  
  // New fields start at 7
  string new_field = 7;
}
```

### **Service Versioning**

**Option 1: Separate services**
```protobuf
package user.v1;
service UserServiceV1 {
  rpc GetUser(GetUserRequest) returns (User);
}

package user.v2;
service UserServiceV2 {
  rpc GetUser(GetUserRequest) returns (User);
}

// Run both simultaneously, migrate gradually
```

**Option 2: Package versioning**
```protobuf
package user.v1;
service UserService { ... }

package user.v2;
service UserService { ... }

// Client imports specific version
import "user/v2/user.proto"
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Load Balancing**

**Client-side load balancing:**
```go
import "google.golang.org/grpc/balancer/roundrobin"

conn, err := grpc.Dial(
    "dns:///service.example.com:50051",
    grpc.WithDefaultServiceConfig(`{
        "loadBalancingPolicy": "round_robin"
    }`),
)

// Client resolves DNS, gets list of IPs
// [10.0.1.1:50051, 10.0.1.2:50051, 10.0.1.3:50051]
// Client distributes requests using round-robin
```

**Proxy-based (Envoy):**
```yaml
# envoy.yaml
static_resources:
  listeners:
  - address:
      socket_address:
        address: 0.0.0.0
        port_value: 50051
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          http2_protocol_options: {}
          route_config:
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match: { prefix: "/" }
                route:
                  cluster: user_service
  clusters:
  - name: user_service
    connect_timeout: 0.25s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    http2_protocol_options: {}
    load_assignment:
      cluster_name: user_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: service-1
                port_value: 50051
        - endpoint:
            address:
              socket_address:
                address: service-2
                port_value: 50051
```

### **Retry Configuration**

```go
// Service config with retries
const serviceConfig = `{
  "methodConfig": [{
    "name": [{"service": "user.v1.UserService"}],
    "retryPolicy": {
      "maxAttempts": 3,
      "initialBackoff": "0.1s",
      "maxBackoff": "10s",
      "backoffMultiplier": 2,
      "retryableStatusCodes": ["UNAVAILABLE", "DEADLINE_EXCEEDED"]
    }
  }]
}`

conn, _ := grpc.Dial(
    "service.example.com:50051",
    grpc.WithDefaultServiceConfig(serviceConfig),
)
```

### **Deadlines/Timeouts**

```go
// Client sets deadline
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

user, err := client.GetUser(ctx, &pb.GetUserRequest{Id: 123})
if err != nil {
    if status.Code(err) == codes.DeadlineExceeded {
        log.Println("Request timed out")
    }
}

// Server checks deadline
func (s *userServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    // Check if deadline already exceeded
    if ctx.Err() == context.DeadlineExceeded {
        return nil, status.Error(codes.DeadlineExceeded, "deadline exceeded")
    }
    
    // Long operation with deadline checking
    result := make(chan *pb.User)
    go func() {
        user := s.db.FindUser(req.Id)
        result <- user
    }()
    
    select {
    case user := <-result:
        return user, nil
    case <-ctx.Done():
        return nil, status.Error(codes.DeadlineExceeded, "deadline exceeded")
    }
}
```

### **Circuit Breaker**

```go
import "github.com/sony/gobreaker"

var cb *gobreaker.CircuitBreaker

func init() {
    cb = gobreaker.NewCircuitBreaker(gobreaker.Settings{
        Name:        "user-service",
        MaxRequests: 3,
        Interval:    10 * time.Second,
        Timeout:     60 * time.Second,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests >= 3 && failureRatio >= 0.6
        },
    })
}

func callUserService(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    result, err := cb.Execute(func() (interface{}, error) {
        return client.GetUser(ctx, req)
    })
    
    if err != nil {
        return nil, err
    }
    
    return result.(*pb.User), nil
}
```

### **Health Checking**

```protobuf
// health.proto (standard gRPC health check)
service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}

message HealthCheckRequest {
  string service = 1;
}

message HealthCheckResponse {
  enum ServingStatus {
    UNKNOWN = 0;
    SERVING = 1;
    NOT_SERVING = 2;
  }
  ServingStatus status = 1;
}
```

**Implementation:**
```go
import "google.golang.org/grpc/health"
import healthpb "google.golang.org/grpc/health/grpc_health_v1"

func main() {
    server := grpc.NewServer()
    
    // Register health service
    healthServer := health.NewServer()
    healthpb.RegisterHealthServer(server, healthServer)
    
    // Set service status
    healthServer.SetServingStatus("user.v1.UserService", healthpb.HealthCheckResponse_SERVING)
    
    // ... start server
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **TLS/mTLS**

**Server TLS:**
```go
// Server
creds, err := credentials.NewServerTLSFromFile("server.crt", "server.key")
if err != nil {
    log.Fatal(err)
}

server := grpc.NewServer(grpc.Creds(creds))

// Client
creds, err := credentials.NewClientTLSFromFile("ca.crt", "")
if err != nil {
    log.Fatal(err)
}

conn, err := grpc.Dial("service.example.com:50051", grpc.WithTransportCredentials(creds))
```

**Mutual TLS (mTLS):**
```go
// Server requires client certificates
cert, _ := tls.LoadX509KeyPair("server.crt", "server.key")
certPool := x509.NewCertPool()
ca, _ := ioutil.ReadFile("ca.crt")
certPool.AppendCertsFromPEM(ca)

creds := credentials.NewTLS(&tls.Config{
    Certificates: []tls.Certificate{cert},
    ClientAuth:   tls.RequireAndVerifyClientCert,
    ClientCAs:    certPool,
})

server := grpc.NewServer(grpc.Creds(creds))

// Client provides certificate
cert, _ := tls.LoadX509KeyPair("client.crt", "client.key")
creds := credentials.NewTLS(&tls.Config{
    Certificates: []tls.Certificate{cert},
})

conn, _ := grpc.Dial("service:50051", grpc.WithTransportCredentials(creds))
```

### **Authentication Interceptor**

```go
func authInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, 
    handler grpc.UnaryHandler) (interface{}, error) {
    
    // Extract metadata
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        return nil, status.Error(codes.Unauthenticated, "missing metadata")
    }
    
    // Get authorization token
    tokens := md.Get("authorization")
    if len(tokens) == 0 {
        return nil, status.Error(codes.Unauthenticated, "missing auth token")
    }
    
    token := strings.TrimPrefix(tokens[0], "Bearer ")
    
    // Validate token
    user, err := validateJWT(token)
    if err != nil {
        return nil, status.Error(codes.Unauthenticated, "invalid token")
    }
    
    // Add user to context
    ctx = context.WithValue(ctx, "user", user)
    
    // Call handler
    return handler(ctx, req)
}

server := grpc.NewServer(
    grpc.UnaryInterceptor(authInterceptor),
)
```

### **Authorization**

```go
func (s *userServer) DeleteUser(ctx context.Context, req *pb.DeleteUserRequest) (*pb.Empty, error) {
    // Get user from context (set by auth interceptor)
    user, ok := ctx.Value("user").(*User)
    if !ok {
        return nil, status.Error(codes.Unauthenticated, "not authenticated")
    }
    
    // Check permissions
    if !user.HasRole("admin") && user.ID != req.Id {
        return nil, status.Error(codes.PermissionDenied, "insufficient permissions")
    }
    
    // Proceed with deletion
    if err := s.db.DeleteUser(ctx, req.Id); err != nil {
        return nil, status.Error(codes.Internal, "failed to delete user")
    }
    
    return &pb.Empty{}, nil
}
```

### **Rate Limiting**

```go
import "golang.org/x/time/rate"

type rateLimitInterceptor struct {
    limiters map[string]*rate.Limiter
    mu       sync.RWMutex
}

func (r *rateLimitInterceptor) Unary() grpc.UnaryServerInterceptor {
    return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, 
        handler grpc.UnaryHandler) (interface{}, error) {
        
        // Extract user ID from context
        user := ctx.Value("user").(*User)
        
        // Get or create limiter for user
        limiter := r.getLimiter(user.ID)
        
        // Check rate limit
        if !limiter.Allow() {
            return nil, status.Error(codes.ResourceExhausted, "rate limit exceeded")
        }
        
        return handler(ctx, req)
    }
}

func (r *rateLimitInterceptor) getLimiter(userID string) *rate.Limiter {
    r.mu.RLock()
    limiter, exists := r.limiters[userID]
    r.mu.RUnlock()
    
    if exists {
        return limiter
    }
    
    r.mu.Lock()
    defer r.mu.Unlock()
    
    // Create limiter: 100 requests per second with burst of 200
    limiter = rate.NewLimiter(100, 200)
    r.limiters[userID] = limiter
    return limiter
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Netflix Internal Microservices**

**Before (REST/JSON):**
- 500+ microservices communicating via REST
- High latency (100-200ms per hop)
- JSON parsing CPU overhead
- Bandwidth costs

**After (gRPC migration):**
- 30-40% latency reduction
- 60% bandwidth savings
- Better developer experience with code generation
- Type safety prevented integration bugs

**Architecture:**
```
API Gateway (REST for clients)
        ↓
   gRPC translation
        ↓
Internal services (gRPC)
```

### **Example 2: Uber Microservices**

**Use case:** Real-time dispatch system

**gRPC benefits:**
- Bidirectional streaming for driver location updates
- Low latency (<50ms) for real-time matching
- Efficient binary protocol for mobile networks
- Type safety across 2,000+ microservices

**Streaming pattern:**
```protobuf
service DispatchService {
  // Driver continuously streams location
  rpc StreamLocation(stream LocationUpdate) returns (Empty);
  
  // Rider receives real-time driver location
  rpc TrackDriver(TrackRequest) returns (stream DriverLocation);
}
```

### **Example 3: Google Internal (Stubby → gRPC)**

**History:**
- Google used internal "Stubby" RPC for 15+ years
- Open-sourced as gRPC in 2015
- Powers all Google internal services

**Scale:**
```
10+ billion RPC calls per second
Across millions of servers
99.9999% success rate
Average latency: <1ms within datacenter
```

**Key features that enabled scale:**
- HTTP/2 multiplexing (single connection per client)
- Protobuf efficiency (10x smaller than JSON)
- Streaming for long-lived connections
- Strong typing prevents runtime errors

### **Example 4: Etsy - gRPC for Service Mesh**

**Challenge:** Polyglot microservices (PHP, Python, Go, Java)

**Solution:**
- gRPC with Envoy service mesh
- Consistent communication protocol
- mTLS for all service-to-service communication
- Centralized observability (metrics, tracing)

**Results:**
- 50% reduction in cross-service latency
- Zero-trust security model
- Language-agnostic error handling

### **Example 5: Slack - Hybrid Approach**

**External APIs:** REST/JSON
- Simple for third-party developers
- HTTP caching works
- Browser compatibility

**Internal services:** gRPC
- Real-time messaging backend
- Presence updates (streaming)
- File upload (client streaming)
- Efficient resource usage

**Lesson:** Use the right tool for each use case

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: Explain gRPC and when you'd use it over REST.**

**Answer:**
"gRPC is a high-performance RPC framework developed by Google that uses HTTP/2 for transport and Protocol Buffers for serialization. It offers significant performance advantages over REST/JSON—typically 3-10x better throughput and 30-50% lower latency.

**Key advantages:**

**1. Performance:** Protobuf binary serialization is 75-90% smaller than JSON and 20-100x faster to parse. At 10,000 QPS, this translates to significant CPU and bandwidth savings.

**2. HTTP/2 benefits:** Single multiplexed connection instead of multiple HTTP/1.1 connections. Header compression with HPACK reduces overhead. No head-of-line blocking at HTTP layer.

**3. Streaming:** Native support for server streaming (real-time updates), client streaming (batch uploads), and bidirectional streaming (chat, collaboration). REST requires WebSocket for this.

**4. Strong typing:** Protocol Buffers provide compile-time type checking and code generation in multiple languages. This prevents integration bugs that JSON APIs suffer from.

**5. Code generation:** Single .proto file generates consistent client and server code for Go, Java, Python, etc. Reduces boilerplate and ensures compatibility.

**I'd use gRPC for:**
- Internal microservices communication (performance matters)
- Real-time features requiring streaming
- Polyglot services needing strong contracts
- High-throughput scenarios (analytics, data pipelines)

**I'd use REST for:**
- Public APIs (broader ecosystem, tooling)
- Browser-first applications (native support)
- Simple CRUD where caching matters
- Third-party integrations (lower barrier to entry)

**Real-world pattern:** Companies like Netflix, Uber, and Google use gRPC internally for performance but expose REST APIs publicly for simplicity. This hybrid approach maximizes both efficiency and developer experience."

### **Common Follow-Up Questions**

**Q1: How does gRPC handle backward compatibility?**
```
Answer:

Protocol Buffers provide backward/forward compatibility through:

**1. Field numbers are immutable:**
message User {
  int64 id = 1;      // Never change this number
  string name = 2;   // Never reuse field numbers
}

**2. Unknown fields are ignored:**
- Old client reading new data: Ignores new fields
- New client reading old data: New fields have default values

**3. Safe changes:**
✅ Add new optional fields
✅ Make required → optional (proto3 has no required)
✅ Add new enum values
✅ Add new RPC methods

**4. Breaking changes:**
❌ Change field type (int32 → string)
❌ Reuse field numbers
❌ Change repeated ↔ singular
❌ Change field name (number is what matters)

**Best practices:**
- Reserve deleted field numbers
- Use deprecation before removal
- Version services if breaking changes needed

Example:
message User {
  int64 id = 1;
  string name = 2;
  string email = 3 [deprecated = true];  // Mark deprecated
  reserved 4, 5;  // Reserve deleted numbers
  string new_email = 6;  // New field
}

This allows gradual migration without breaking existing clients.
```

**Q2: How do you debug gRPC calls since they're binary?**
```
Answer:

gRPC debugging tools:

**1. grpcurl (like curl for gRPC):**
# List services (requires reflection enabled)
grpcurl -plaintext localhost:50051 list

# Describe service
grpcurl -plaintext localhost:50051 describe user.v1.UserService

# Make request
grpcurl -plaintext \
  -d '{"id": 123}' \
  localhost:50051 \
  user.v1.UserService/GetUser

**2. Enable gRPC reflection (development):**
import "google.golang.org/grpc/reflection"

server := grpc.NewServer()
reflection.Register(server)  // Allows runtime introspection

**3. Interceptor logging:**
func loggingInterceptor(ctx, req, info, handler) (interface{}, error) {
    log.Printf("Request: %+v", req)
    resp, err := handler(ctx, req)
    log.Printf("Response: %+v, Error: %v", resp, err)
    return resp, err
}

**4. Wireshark with HTTP/2 dissector:**
- Can decode HTTP/2 frames
- Shows stream multiplexing
- Requires TLS keys for decryption

**5. Distributed tracing:**
- OpenTelemetry/Jaeger
- Trace across microservices
- Visualize latency breakdown

**6. gRPC UI tools:**
- BloomRPC (GUI client)
- Postman (now supports gRPC)
- Evans (interactive CLI)

**Production best practices:**
- Disable reflection (security)
- Use structured logging with request IDs
- Implement distributed tracing
- Export metrics (success rate, latency, errors)
```

**Q3: How do you handle load balancing with gRPC?**
```
Answer:

gRPC load balancing is more complex than HTTP/1.1 due to persistent connections.

**Problem:**
- gRPC uses long-lived HTTP/2 connections
- Traditional L4 load balancers see one connection per client
- All RPCs from a client go to same backend server
- Uneven load distribution

**Solutions:**

**1. Client-side load balancing (preferred):**
conn, _ := grpc.Dial(
    "dns:///service.example.com:50051",
    grpc.WithDefaultServiceConfig(`{
        "loadBalancingPolicy": "round_robin"
    }`),
)

Flow:
- Client resolves DNS → gets list of server IPs
- Client maintains connection pool
- Client distributes RPCs across servers

Pros: No extra hop, efficient
Cons: DNS caching, complex client logic

**2. Lookaside load balancing:**
- Dedicated load balancer service (e.g., ZooKeeper, Consul)
- Client queries LB for server list
- Client connects directly to servers

**3. Proxy load balancing (L7):**
- Use Envoy, NGINX, or Linkerd
- Proxy terminates client connections
- Proxies multiple backend connections
- Distributes RPCs across backends

Example with Envoy:
clients → Envoy (L7 proxy) → Backend servers
           ↓
  Round-robin at RPC level

Pros: Works with any client, centralized policy
Cons: Extra hop, proxy becomes bottleneck

**4. Service mesh (Istio/Linkerd):**
- Sidecar proxy per service
- Intelligent routing (weighted, canary)
- mTLS, retries, circuit breaking
- Observability

**Best practice for FAANG scale:**
- Client-side LB for internal services (lowest latency)
- L7 proxy (Envoy) for edge/external traffic
- Service mesh for complex routing needs
```

**Q4: What are the main challenges of using gRPC?**
```
Answer:

**1. Browser compatibility:**
- Browsers don't support HTTP/2 POST with trailers
- Need gRPC-Web proxy (Envoy)
- Adds complexity and latency

Solution:
Web clients → gRPC-Web proxy → gRPC backends

**2. Debugging complexity:**
- Binary protocol (not human-readable)
- Requires special tools (grpcurl, Wireshark)
- Can't just `curl` an endpoint

Mitigation:
- Enable reflection in development
- Use grpcurl, BloomRPC
- Implement comprehensive logging

**3. HTTP caching doesn't work:**
- gRPC uses POST method (not cacheable)
- Can't leverage CDN, browser cache
- Application-layer caching needed

Solution:
- Implement Redis caching
- Use REST for cacheable content
- Persist query optimization

**4. Learning curve:**
- Protocol Buffers syntax
- Code generation workflow
- HTTP/2 concepts
- gRPC-specific patterns

Mitigation:
- Good documentation
- Shared .proto repository
- Code generation automation
- Training for team

**5. Tight coupling:**
- Shared .proto files between services
- Schema changes require coordination
- Version management complexity

Solution:
- Buf.build for schema management
- Backward compatibility rules
- Feature flags for gradual rollout

**6. Operational complexity:**
- Load balancing is harder (persistent connections)
- Monitoring needs gRPC-specific metrics
- Debugging production issues is harder

Solution:
- Use service mesh (Istio/Linkerd)
- OpenTelemetry for observability
- gRPC health checking

**When NOT to use gRPC:**
- Public-facing APIs (REST is simpler)
- Browser-first applications (unless using gRPC-Web)
- Simple CRUD services (REST overhead is acceptable)
- Teams unfamiliar with Protocol Buffers
```

**Q5: How do you implement retries and circuit breakers in gRPC?**
```
Answer:

**Retries (built-in via service config):**

const serviceConfig = `{
  "methodConfig": [{
    "name": [{"service": "user.v1.UserService"}],
    "retryPolicy": {
      "maxAttempts": 3,
      "initialBackoff": "0.1s",
      "maxBackoff": "10s",
      "backoffMultiplier": 2,
      "retryableStatusCodes": ["UNAVAILABLE", "DEADLINE_EXCEEDED"]
    }
  }]
}`

conn, _ := grpc.Dial("service:50051", 
    grpc.WithDefaultServiceConfig(serviceConfig))

**Retry behavior:**
- Attempt 1: Call fails with UNAVAILABLE
- Wait 100ms (initialBackoff)
- Attempt 2: Call fails again
- Wait 200ms (100ms × backoffMultiplier)
- Attempt 3: Call succeeds or gives up

**Important:** Only retry on safe status codes
- UNAVAILABLE: Service temporarily down
- DEADLINE_EXCEEDED: Timeout (might be safe to retry)
- NOT retryable: INVALID_ARGUMENT, ALREADY_EXISTS

**Circuit Breaker (using go-circuit-breaker):**

import "github.com/sony/gobreaker"

cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "user-service",
    MaxRequests: 3,
    Interval:    10 * time.Second,
    Timeout:     60 * time.Second,
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
        return counts.Requests >= 3 && failureRatio >= 0.6
    },
})

func callService(ctx context.Context, req *pb.Request) (*pb.Response, error) {
    result, err := cb.Execute(func() (interface{}, error) {
        return client.Call(ctx, req)
    })
    
    if err != nil {
        if err == gobreaker.ErrOpenState {
            return nil, status.Error(codes.Unavailable, "circuit breaker open")
        }
        return nil, err
    }
    
    return result.(*pb.Response), nil
}

**Circuit breaker states:**

1. CLOSED (normal):
   - Requests pass through
   - Failures counted

2. OPEN (failing):
   - Requests fail immediately (fail fast)
   - No calls to backend
   - Wait timeout period

3. HALF_OPEN (testing):
   - Allow limited requests
   - If succeed → CLOSED
   - If fail → OPEN

**Combined strategy:**

1. Client retries (3 attempts with backoff)
2. If still failing → Circuit breaker opens
3. Circuit breaker prevents cascading failures
4. After timeout → Circuit breaker tests recovery

**Production considerations:**
- Set conservative retry limits (avoid amplification)
- Monitor retry rates (alert on high values)
- Use hedging for latency-sensitive calls
- Implement bulkheads (isolate failures)
```

### **Key Talking Points**

1. **"gRPC is 3-10x faster than REST"**: Binary serialization, HTTP/2
2. **"HTTP/2 eliminates head-of-line blocking"**: Multiplexed streams
3. **"Streaming is native"**: Server, client, bidirectional
4. **"Strong typing prevents bugs"**: Protobuf compile-time checks
5. **"Hybrid approach is common"**: gRPC internal, REST external

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **gRPC Request Flow**

```
┌────────┐                                      ┌────────┐
│ Client │                                      │ Server │
└───┬────┘                                      └───┬────┘
    │                                               │
    │ 1. Dial (establish HTTP/2 connection)         │
    ├──────────────────────────────────────────────►│
    │◄──────────────────────────────────────────────┤
    │           Connection established               │
    │                                               │
    │ 2. RPC call                                   │
    │    Method: /user.v1.UserService/GetUser       │
    │    Protobuf payload (binary)                  │
    ├──────────────────────────────────────────────►│
    │                                               │
    │                              3. Process request│
    │                                 Query database│
    │                             Serialize response│
    │                                               │
    │ 4. Response                                   │
    │    Protobuf payload (binary)                  │
    │◄──────────────────────────────────────────────┤
    │                                               │
    │ 5. Subsequent RPCs reuse connection           │
    │ ──────────────────────────────────────────────►
    │◄──────────────────────────────────────────────│
    │                                               │
```

### **REST vs gRPC Comparison**

```
REST (HTTP/1.1):
Client establishes 6 connections
Conn1: GET /users/1 ──► Response
Conn2: GET /users/2 ──► Response
Conn3: GET /users/3 ──► Response
...

Each request: TCP + TLS + HTTP overhead

gRPC (HTTP/2):
Client establishes 1 connection
Stream 1: GetUser(1) ──►
Stream 2: GetUser(2) ──►
Stream 3: GetUser(3) ──►
Stream 4: GetUser(4) ──►
(All multiplexed on single connection)

Responses return on same streams
```

### **Complete gRPC Example**

```protobuf
// user.proto
syntax = "proto3";
package user.v1;

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (stream User);
}

message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
}

message GetUserRequest {
  int64 id = 1;
}

message ListUsersRequest {
  int32 page_size = 1;
}
```

```go
// Server implementation
type userServer struct {
    pb.UnimplementedUserServiceServer
    db *Database
}

func (s *userServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    user, err := s.db.FindUser(ctx, req.Id)
    if err != nil {
        return nil, status.Errorf(codes.NotFound, "user %d not found", req.Id)
    }
    
    return &pb.User{
        Id:    user.ID,
        Name:  user.Name,
        Email: user.Email,
    }, nil
}

func (s *userServer) ListUsers(req *pb.ListUsersRequest, stream pb.UserService_ListUsersServer) error {
    users, err := s.db.FindUsers(stream.Context())
    if err != nil {
        return status.Error(codes.Internal, err.Error())
    }
    
    for _, user := range users {
        if err := stream.Send(&pb.User{
            Id:    user.ID,
            Name:  user.Name,
            Email: user.Email,
        }); err != nil {
            return err
        }
    }
    
    return nil
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    server := grpc.NewServer()
    
    pb.RegisterUserServiceServer(server, &userServer{db: db})
    
    server.Serve(lis)
}
```

```go
// Client
func main() {
    conn, _ := grpc.Dial("localhost:50051", grpc.WithInsecure())
    defer conn.Close()
    
    client := pb.NewUserServiceClient(conn)
    
    // Unary call
    ctx := context.Background()
    user, err := client.GetUser(ctx, &pb.GetUserRequest{Id: 123})
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("User: %v\n", user)
    
    // Streaming call
    stream, err := client.ListUsers(ctx, &pb.ListUsersRequest{PageSize: 10})
    if err != nil {
        log.Fatal(err)
    }
    
    for {
        user, err := stream.Recv()
        if err == io.EOF {
            break
        }
        if err != nil {
            log.Fatal(err)
        }
        fmt.Printf("User: %v\n", user)
    }
}
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why gRPC Matters**

**Business Impact:**
- **Cost reduction**: 70-90% bandwidth savings at scale ($millions/year for large services)
- **Performance**: 30-50% latency reduction improves user experience
- **Developer productivity**: Code generation reduces boilerplate, strong typing prevents bugs
- **Operational efficiency**: Single framework for polyglot microservices

**Technical Impact:**
- **Performance**: 3-10x faster than REST/JSON (binary serialization, HTTP/2)
- **Efficiency**: Single multiplexed connection vs multiple HTTP/1.1 connections
- **Features**: Native streaming for real-time use cases
- **Type safety**: Compile-time checks prevent runtime integration errors

### **How It Works (Simple Summary)**

1. **Define service** in Protocol Buffers (.proto file)
2. **Generate code** for client and server (protoc compiler)
3. **Implement server** using generated interfaces
4. **Client calls methods** using generated stubs (looks like local function call)
5. **gRPC runtime** handles serialization, HTTP/2 transport, errors
6. **HTTP/2 connection** multiplexes multiple RPCs on single connection
7. **Protobuf** serializes data to compact binary format
8. **Server deserializes**, processes, serializes response
9. **Client receives** strongly-typed response

### **Key Trade-offs**

| Aspect | gRPC | REST |
|--------|------|------|
| **Performance** | Very fast (binary) | Slower (JSON) |
| **Payload size** | Small (Protobuf) | Large (JSON) |
| **Browser support** | Needs proxy | Native |
| **Caching** | Application-layer | HTTP caching |
| **Debugging** | Binary (harder) | Text (easier) |
| **Streaming** | Native support | Requires WebSocket |
| **Type safety** | Strong (Protobuf) | Weak (JSON) |
| **Learning curve** | Steeper | Gentle |
| **Tooling** | Growing | Mature |

### **Remember These Numbers**

```
Protobuf vs JSON size:     75-90% smaller
Protobuf vs JSON speed:    20-100x faster parsing
gRPC vs REST latency:      30-50% reduction
gRPC vs REST bandwidth:    70-90% savings
HTTP/2 connections:        1 vs 6-10 (HTTP/1.1)
Connection overhead:       50-70% reduction
CPU utilization:           80-90% less for serialization
```

### **Production Wisdom**

✅ **Use gRPC for internal microservices** (performance, type safety)  
✅ **Use REST for public APIs** (simplicity, compatibility)  
✅ **Enable TLS in production** (security, encryption)  
✅ **Implement health checks** (standard gRPC health protocol)  
✅ **Use client-side load balancing** (lowest latency)  
✅ **Set timeouts/deadlines** (prevent resource exhaustion)  
✅ **Add interceptors** (auth, logging, metrics, tracing)  
✅ **Version with backward compatibility** (Protobuf field numbers)  
✅ **Monitor gRPC-specific metrics** (success rate, latency, stream duration)  

❌ **Don't use gRPC for browser-first apps** (needs proxy, complexity)  
❌ **Don't skip TLS** (security risk, performance overhead acceptable)  
❌ **Don't reuse Protobuf field numbers** (breaks compatibility)  
❌ **Don't ignore load balancing** (persistent connections need special handling)  
❌ **Don't use gRPC without observability** (binary protocol harder to debug)  
❌ **Don't make breaking schema changes** (follow Protobuf evolution rules)  

---

**Final thought for interviews:**

> "gRPC represents the evolution of RPC for cloud-native microservices. By combining HTTP/2's multiplexing with Protobuf's efficiency and strong typing, it delivers 3-10x performance improvements over REST while enabling features like streaming that REST can't provide. The trade-off is complexity—debugging binary protocols and managing Protobuf schemas requires tooling and discipline. The winning pattern is hybrid: gRPC for internal services where performance matters, REST for external APIs where simplicity and compatibility matter. Companies like Google, Netflix, and Uber prove this approach scales to billions of requests per day."
