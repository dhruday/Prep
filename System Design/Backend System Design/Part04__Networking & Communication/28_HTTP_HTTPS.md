# 28. HTTP / HTTPS

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**HTTP (HyperText Transfer Protocol)** is the foundation of data communication on the web. **HTTPS** is HTTP secured with TLS/SSL encryption.

**What it is:**
- Application-layer protocol for client-server communication
- Request-response model: Client sends request, server returns response
- Stateless protocol: Each request is independent
- HTTPS adds encryption, authentication, and integrity verification

**Why it exists:**
- Standardize how browsers and servers communicate
- Provide human-readable format for web communication
- Enable distributed, scalable web architecture
- HTTPS ensures secure communication over untrusted networks

**Problem it solves:**
- **HTTP**: How to structure web requests/responses in a universal format
- **HTTPS**: How to prevent eavesdropping, tampering, and impersonation

**In large-scale distributed systems:**
- De facto standard for service-to-service communication (REST APIs)
- HTTP/2 and HTTP/3 enable connection multiplexing and reduced latency
- HTTPS is mandatory for security compliance (PCI-DSS, HIPAA, GDPR)
- Load balancers and API gateways operate at HTTP layer for routing

💡 **Interview Opening:** "HTTP is the request-response protocol that powers the web and most microservices communication. Understanding HTTP methods, status codes, headers, and the evolution to HTTP/2 and HTTP/3 is crucial for designing APIs. HTTPS adds TLS encryption, which is non-negotiable in production systems for security and compliance."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **HTTP Protocol Fundamentals**

#### **Request Structure**
```
GET /api/users/123 HTTP/1.1
Host: api.example.com
User-Agent: Mozilla/5.0
Authorization: Bearer eyJhbGc...
Accept: application/json
Connection: keep-alive

[Optional Request Body]
```

**Components:**
1. **Request Line**: Method + URI + HTTP Version
2. **Headers**: Metadata (authentication, content type, caching)
3. **Body**: Payload data (for POST/PUT/PATCH)

#### **Response Structure**
```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 348
Cache-Control: max-age=3600
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"

{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Components:**
1. **Status Line**: HTTP Version + Status Code + Reason Phrase
2. **Headers**: Response metadata
3. **Body**: Response payload

### **HTTP Methods (RESTful Semantics)**

| Method | Purpose | Idempotent | Safe | Use Case |
|--------|---------|------------|------|----------|
| **GET** | Retrieve resource | ✅ | ✅ | Fetch user profile |
| **POST** | Create resource | ❌ | ❌ | Create new user |
| **PUT** | Replace resource | ✅ | ❌ | Update full user object |
| **PATCH** | Partial update | ❌* | ❌ | Update user email only |
| **DELETE** | Remove resource | ✅ | ❌ | Delete user account |
| **HEAD** | Get headers only | ✅ | ✅ | Check if resource exists |
| **OPTIONS** | Describe methods | ✅ | ✅ | CORS preflight |

*PATCH can be idempotent with proper design

### **HTTP Status Codes (Critical for Interviews)**

**1xx Informational:**
- `100 Continue`: Client can continue sending body
- `101 Switching Protocols`: Upgrade to WebSocket

**2xx Success:**
- `200 OK`: Standard success
- `201 Created`: Resource created (return Location header)
- `202 Accepted`: Async processing started
- `204 No Content`: Success but no body (DELETE response)

**3xx Redirection:**
- `301 Moved Permanently`: SEO-friendly redirect
- `302 Found`: Temporary redirect
- `304 Not Modified`: Use cached version (ETag validation)
- `307 Temporary Redirect`: Like 302 but preserve method

**4xx Client Errors:**
- `400 Bad Request`: Malformed request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Authenticated but not authorized
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Resource state conflict (duplicate)
- `429 Too Many Requests`: Rate limit exceeded

**5xx Server Errors:**
- `500 Internal Server Error`: Generic server error
- `502 Bad Gateway`: Upstream server error
- `503 Service Unavailable`: Server overloaded/maintenance
- `504 Gateway Timeout`: Upstream timeout

### **HTTP Headers (Key for Interviews)**

**Request Headers:**
```
Authorization: Bearer <token>           # Authentication
Content-Type: application/json          # Body format
Accept: application/json                # Desired response format
Accept-Encoding: gzip, deflate          # Compression support
User-Agent: MyApp/1.0                   # Client identification
If-None-Match: "etag-value"             # Conditional GET
If-Modified-Since: Sat, 01 Jan 2024... # Conditional GET
X-Request-ID: uuid-1234                 # Distributed tracing
```

**Response Headers:**
```
Content-Type: application/json          # Body format
Content-Length: 1234                    # Body size in bytes
Cache-Control: max-age=3600, public     # Caching directives
ETag: "33a64df..."                      # Resource version
Location: /api/users/456                # Created resource URI
Set-Cookie: session=abc123; HttpOnly    # Session management
X-RateLimit-Remaining: 95               # Rate limit info
Access-Control-Allow-Origin: *          # CORS policy
```

### **HTTP/1.1 vs HTTP/2 vs HTTP/3**

#### **HTTP/1.1 (1997)**
- **One request per TCP connection** (or serial requests with keep-alive)
- **Head-of-line blocking**: Must wait for previous response
- **Text-based protocol**: Human-readable but inefficient
- **No header compression**: Redundant headers on every request

**Performance issues at scale:**
- Browser limit: 6 parallel connections per domain
- High latency for page with 100+ resources

#### **HTTP/2 (2015)**
- **Multiplexing**: Multiple requests over single TCP connection
- **Binary protocol**: Efficient parsing
- **Header compression (HPACK)**: Reduce overhead
- **Server push**: Proactively send resources
- **Stream prioritization**: Important resources first

**Performance gains:**
- 30-50% latency reduction in real-world tests
- Single TCP connection eliminates connection overhead

**Remaining issue:**
- TCP head-of-line blocking: One lost packet blocks all streams

#### **HTTP/3 (2022)**
- **QUIC transport layer** (UDP-based, not TCP)
- **Eliminates TCP head-of-line blocking**: Independent streams
- **Faster connection establishment**: 0-RTT for repeated connections
- **Better on lossy networks**: Packet loss only affects one stream
- **Native encryption**: TLS built into QUIC

**Trade-off:**
- More complex (UDP, QUIC implementation)
- Not all infrastructure supports HTTP/3 yet

### **HTTPS: TLS/SSL Handshake Deep-Dive**

#### **TLS 1.2 Handshake (2 RTT)**
```
Client → Server:  ClientHello (supported ciphers)
Server → Client:  ServerHello, Certificate, ServerHelloDone
Client → Server:  ClientKeyExchange, ChangeCipherSpec, Finished
Server → Client:  ChangeCipherSpec, Finished
[Encrypted application data]
```

**Cost:** 2 round-trips before data transfer = 20-200ms depending on distance

#### **TLS 1.3 Handshake (1 RTT)**
```
Client → Server:  ClientHello (+ key share, supported ciphers)
Server → Client:  ServerHello, Certificate, Finished, [Encrypted Data]
Client → Server:  Finished, [Encrypted Request]
```

**Improvement:** 1 round-trip = 50% faster

#### **TLS Session Resumption (0 RTT)**
- **Session IDs**: Resume previous session
- **Session Tickets**: Encrypted session state
- **0-RTT**: Send encrypted data in first packet (replay risk)

### **Trade-offs at FAANG Scale**

**HTTP/2 Adoption:**
- ✅ **Pros**: Lower latency, fewer connections, header compression
- ❌ **Cons**: Harder to debug (binary), TCP HOL blocking, middlebox issues

**TLS Termination Location:**
- **At Load Balancer**: Reduces backend complexity, enables inspection
- **At Application Server**: End-to-end encryption, more secure
- **Hybrid**: LB terminates external, re-encrypts internal (defense in depth)

**Connection Pooling:**
- **HTTP/1.1**: Need 10-100 connections per backend
- **HTTP/2**: 1-5 connections sufficient (multiplexing)

**Latency Budget:**
```
DNS lookup:        1ms (cached)
TCP handshake:    30ms
TLS handshake:    40ms (TLS 1.3)
Request/response: 20ms
────────────────────────
First-byte time:  91ms
```

**Cost optimization:**
- TLS is CPU-intensive (encryption/decryption)
- At scale: Dedicated TLS offload hardware or specialized instances

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **Connection Capacity**

**Scenario:** API server handling 10,000 QPS

**HTTP/1.1 (with keep-alive):**
```
Assume:
- Average request duration: 50ms
- Keep-alive timeout: 60 seconds
- Connection reuse: 20 requests per connection

Concurrent connections = (10,000 QPS × 0.05s) = 500 concurrent
Total connections needed = 500 / 20 = 25 persistent connections

But with timeout and churn: ~100-200 connections in practice
```

**HTTP/2:**
```
Single connection can handle 100+ concurrent streams
Connections needed = 10,000 QPS / 100 streams = ~100 connections
But typically: 1-5 connections per client suffice
```

**Why it matters:**
- Each connection uses ~100KB RAM (buffers, state)
- 1M connections = 100GB RAM just for connection state
- HTTP/2 dramatically reduces connection overhead

### **TLS CPU Cost**

**Estimate:**
- TLS handshake: ~1-5ms CPU time per handshake
- Symmetric encryption (ongoing): ~0.1-0.5ms per request
- 10,000 QPS = 1,000-5,000ms = 1-5 CPU cores for TLS

**Optimization:**
- TLS session resumption: Reduce handshakes by 90%
- Hardware acceleration: AES-NI, Intel QAT
- Modern CPUs: TLS overhead < 1% with optimizations

### **Bandwidth Estimation**

**Scenario:** Video streaming API

```
Assumptions:
- 1M users streaming
- Average bitrate: 5 Mbps
- HTTPS overhead: ~2% (TLS record overhead)

Total bandwidth:
= 1M × 5 Mbps × 1.02
= 5.1 Terabits per second

Monthly data transfer:
= 5.1 Tbps × 86400 seconds × 30 days / 8 bits per byte
= 165 Petabytes per month
```

**Cost (AWS pricing ~$0.09/GB egress):**
```
165 PB = 165,000 TB = 165,000,000 GB
Cost = 165M × $0.09 = $14.85 million per month
```

💡 **Why CDNs matter:** Reduce origin bandwidth by 90%+

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **HTTP Caching Strategies**

**Client-side caching (Browser):**
```http
Cache-Control: max-age=3600, public
```
- Browser caches for 1 hour
- No server request for cached content

**Conditional requests (Validation):**
```http
Request:
If-None-Match: "etag-123"
If-Modified-Since: Mon, 01 Jan 2024 00:00:00 GMT

Response (if unchanged):
HTTP/1.1 304 Not Modified
```
- Validates cache without transferring body
- Saves bandwidth, reduces latency

**CDN caching:**
```http
Cache-Control: max-age=86400, s-maxage=3600, public
Vary: Accept-Encoding
```
- `s-maxage`: CDN cache for 1 hour
- `max-age`: Browser cache for 24 hours
- `Vary`: Cache separate versions per header

### **Cookie Management**

**Cookie attributes:**
```http
Set-Cookie: session=abc123; 
            Domain=example.com; 
            Path=/api; 
            Expires=Wed, 09 Jun 2024 10:18:14 GMT;
            Secure; 
            HttpOnly; 
            SameSite=Strict
```

**Storage impact:**
- Each cookie sent on every request to domain
- 100 cookies × 4KB each = 400KB per request (!!!)
- **Best practice**: Use tokens in Authorization header, not cookies

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Connection Pooling**

**Why needed:**
```
Cost of new connection (HTTP/1.1 + TLS 1.3):
- TCP handshake: 1 RTT (30ms)
- TLS handshake: 1 RTT (40ms)
- Total: 70ms overhead per request

With keep-alive pool:
- Connection reused: 0ms overhead
- Amortize handshake over 100s of requests
```

**Implementation pattern:**
```java
// HikariCP-style connection pool
HttpConnectionPool pool = HttpConnectionPool.builder()
    .maxConnections(100)
    .minIdleConnections(10)
    .connectionTimeout(5000)
    .idleTimeout(60000)
    .keepAliveEnabled(true)
    .build();

HttpResponse response = pool.execute(request);
```

### **Retry Strategies**

**Idempotent methods (safe to retry):**
- GET, PUT, DELETE, HEAD, OPTIONS

**Non-idempotent methods (danger zone):**
- POST: May create duplicate resources
- **Solution**: Use idempotency keys

**Example:**
```http
POST /api/payments HTTP/1.1
Idempotency-Key: uuid-1234-5678
Content-Type: application/json

{
  "amount": 100.00,
  "currency": "USD"
}
```

Server stores key:
- First request: Process payment, store result with key
- Retry: Return cached result without re-processing

### **Timeout Configuration**

**Layered timeouts:**
```
Connection timeout:  2 seconds   (TCP handshake)
TLS timeout:         3 seconds   (TLS handshake)
Read timeout:       10 seconds   (server response)
Request timeout:    30 seconds   (end-to-end)
```

**Why multiple timeouts:**
- Fail fast at each stage
- Avoid resource exhaustion from hung connections

### **Circuit Breaker for HTTP Clients**

```java
CircuitBreaker breaker = CircuitBreaker.builder()
    .failureThreshold(50)        // % of failures
    .slowCallThreshold(5000)     // > 5s = slow
    .waitDurationInOpenState(60) // 60s before retry
    .build();

HttpResponse response = breaker.executeSupplier(() -> 
    httpClient.get("https://api.example.com/users")
);
```

**States:**
- **CLOSED**: Normal operation
- **OPEN**: Failures exceed threshold, fail fast
- **HALF_OPEN**: Test if service recovered

### **Load Balancing at HTTP Layer (Layer 7)**

**Advantages:**
- Route based on URL path (`/api/v1` vs `/api/v2`)
- Route based on headers (A/B testing)
- Sticky sessions based on cookies
- Rate limiting per user/API key

**Disadvantages:**
- Higher latency (parse HTTP)
- More CPU intensive than Layer 4

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **HTTPS Security Features**

**1. Encryption (Confidentiality):**
- Symmetric encryption (AES-256-GCM) for data
- Prevents eavesdropping

**2. Authentication:**
- Server certificate verified by CA
- Client knows server is legitimate

**3. Integrity:**
- Message authentication code (MAC)
- Detects tampering

**4. Forward Secrecy:**
- Ephemeral keys (DHE, ECDHE)
- Past sessions can't be decrypted even if private key compromised

### **Common Security Headers**

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

**Purpose:**
- **HSTS**: Force HTTPS, prevent downgrade attacks
- **CSP**: Prevent XSS attacks
- **X-Frame-Options**: Prevent clickjacking

### **API Authentication Patterns**

**1. API Keys (in header):**
```http
GET /api/users HTTP/1.1
X-API-Key: sk_live_1234567890
```
- Simple but no expiration/rotation

**2. Bearer Tokens (OAuth 2.0):**
```http
GET /api/users HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- JWT (JSON Web Token) with expiration
- Stateless authentication

**3. Mutual TLS (mTLS):**
- Client also presents certificate
- Strong authentication for service-to-service

### **Rate Limiting Headers**

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
Retry-After: 3600
```

**When rate limited:**
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

### **CORS (Cross-Origin Resource Sharing)**

**Preflight request (for PUT/DELETE or custom headers):**
```http
OPTIONS /api/users HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: DELETE
Access-Control-Request-Headers: Authorization

Response:
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Shopify HTTP/2 Migration**

**Problem:** Slow page loads with 100+ resources per page

**Before (HTTP/1.1):**
- 6 parallel connections × 20 serial requests each
- Total time: 10 seconds for all resources

**After (HTTP/2):**
- Single connection with multiplexing
- All 100+ requests in parallel
- Total time: 3 seconds (70% improvement)

**Challenges:**
- Old proxies/CDNs broke HTTP/2
- Solution: Gradual rollout with fallback

### **Example 2: Cloudflare TLS 1.3 Performance**

**Metrics:**
- TLS 1.2 handshake: 2 RTT
- TLS 1.3 handshake: 1 RTT
- 0-RTT resumption: Instant

**Impact:**
- **23% reduction** in connection time globally
- Biggest gains in high-latency regions (Asia-Pacific)

**Security trade-off:**
- 0-RTT has replay attack risk
- Disabled for state-changing requests (POST/PUT/DELETE)

### **Example 3: Netflix Connection Pooling**

**Architecture:**
- Edge servers maintain connection pools to backend APIs
- HTTP/2 connections to reduce overhead

**Configuration:**
- Max 10,000 concurrent connections per edge server
- Pool size: 100 connections per backend
- Keep-alive: 300 seconds

**Result:**
- 90% connection reuse rate
- Eliminated connection storm during traffic spikes

### **Example 4: Stripe Idempotency Keys**

**Problem:** Duplicate charges during retries

**Solution:**
```http
POST /v1/charges HTTP/1.1
Idempotency-Key: uuid-1234-5678-90ab-cdef
Authorization: Bearer sk_live_...

{
  "amount": 2000,
  "currency": "usd",
  "source": "tok_visa"
}
```

**Implementation:**
- Store idempotency key + result in cache (Redis)
- TTL: 24 hours
- On retry: Return cached result, skip processing

**Impact:**
- Zero duplicate charges from network retries
- Customer confidence in API reliability

### **Example 5: Google Search HTTP/3 Rollout**

**Metrics (2021-2023):**
- **Latency improvement**: 5-7% average, 15% in poor networks
- **Connection success rate**: 2% higher (UDP bypasses some middleboxes)

**Challenges:**
- Corporate firewalls blocking UDP port 443
- Solution: Fallback to HTTP/2

**Key learning:**
- Multi-protocol strategy: HTTP/3 → HTTP/2 → HTTP/1.1

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: Explain HTTP/HTTPS and how it impacts system design.**

**Answer:**
"HTTP is a stateless, request-response protocol that forms the foundation of web communication. A client sends a request with a method (GET, POST, etc.), headers for metadata, and an optional body. The server responds with a status code, headers, and a body.

For distributed systems, HTTP is the de facto standard for REST APIs and microservices communication. Key design considerations include:

**1. Protocol version:** HTTP/1.1 has head-of-line blocking and requires multiple connections. HTTP/2 enables multiplexing over a single connection, reducing latency by 30-50%. HTTP/3 uses QUIC over UDP, eliminating TCP-level head-of-line blocking.

**2. HTTPS security:** TLS encryption is mandatory for production. TLS 1.3 reduces handshake to 1 RTT, with 0-RTT resumption for repeated connections. We terminate TLS at the load balancer to reduce backend complexity and enable connection pooling.

**3. Idempotency:** GET, PUT, DELETE are idempotent and safe to retry. POST is not, so we use idempotency keys (like Stripe) to prevent duplicate actions during retries.

**4. Caching:** We use `Cache-Control` headers for CDN and browser caching, and `ETag`/`If-None-Match` for conditional requests to save bandwidth.

**5. Timeouts and retries:** We set layered timeouts (connection, TLS, read) and use exponential backoff with circuit breakers to handle failures gracefully.

The choice between HTTP/1.1, HTTP/2, and HTTP/3 depends on latency requirements, infrastructure support, and client capabilities."

### **Common Follow-Up Questions**

**Q1: What's the difference between 401 and 403?**
```
Answer:
- 401 Unauthorized: You didn't provide credentials (authentication failed)
  → Response includes WWW-Authenticate header
  → Client should retry with credentials

- 403 Forbidden: You're authenticated, but don't have permission (authorization failed)
  → No point in retrying with same credentials
  → Resource exists but access is denied

Example:
- 401: Accessing /api/users without Authorization header
- 403: Regular user trying to access /api/admin/users
```

**Q2: How does HTTP/2 multiplexing work?**
```
Answer:
HTTP/2 introduces concept of streams over a single TCP connection:

1. Binary framing: Split messages into frames
2. Stream ID: Each request/response pair gets unique ID
3. Interleaving: Frames from different streams mixed on same connection
4. Reassembly: Receiver sorts by stream ID

Benefits:
- No head-of-line blocking at HTTP layer
- Single connection (no connection limit)
- Header compression (HPACK)
- Server push capability

Remaining issue:
- TCP head-of-line blocking: One lost packet blocks ALL streams
- HTTP/3 (QUIC) solves this by using UDP with stream-level recovery
```

**Q3: Explain TLS handshake and its performance impact.**
```
Answer:
TLS 1.3 handshake (1-RTT):

Client → Server: 
  - ClientHello (supported ciphers, key share)

Server → Client:
  - ServerHello (chosen cipher, key share)
  - Certificate (server's public key cert)
  - Encrypted handshake finish

[Encrypted application data can start]

Performance impact:
- 1 RTT = 10-100ms depending on distance
- CPU cost: 1-5ms for cryptographic operations

Optimizations:
1. Session resumption (0-RTT): Skip handshake for repeat visitors
2. TLS offload: Hardware acceleration or specialized instances
3. Connection pooling: Amortize handshake cost over many requests
4. OCSP stapling: Avoid extra RTT for certificate validation
```

**Q4: How would you design an API with rate limiting?**
```
Answer:
Implementation layers:

1. Algorithm choice:
   - Token bucket: Allow bursts, refill at fixed rate
   - Leaky bucket: Smooth output, no bursts
   - Fixed window: Simple but boundary issues
   - Sliding window log: Accurate but memory-intensive

2. Storage:
   - Redis: Fast, distributed, atomic operations
   - Schema: Key = user_id:endpoint, Value = token count + timestamp

3. Headers:
   Request:
   GET /api/users HTTP/1.1
   Authorization: Bearer <token>

   Response:
   HTTP/1.1 200 OK
   X-RateLimit-Limit: 1000
   X-RateLimit-Remaining: 950
   X-RateLimit-Reset: 1609459200

   Rate limited:
   HTTP/1.1 429 Too Many Requests
   Retry-After: 60

4. Placement:
   - API Gateway: Before hitting backend services
   - Advantage: Protect all services, centralized policy

5. Granularity:
   - Per user: Prevent abuse
   - Per API key: Different tiers (free vs paid)
   - Per endpoint: Different limits for expensive operations

Trade-offs:
- Strict enforcement → Better protection, worse UX
- Lenient (allow small bursts) → Better UX, abuse risk
```

**Q5: POST vs PUT vs PATCH - when to use each?**
```
Answer:

POST - Create new resource:
- POST /api/users
- Server generates ID
- Returns 201 Created + Location header
- NOT idempotent (multiple POSTs = multiple resources)

PUT - Replace entire resource:
- PUT /api/users/123
- Client provides full object
- Idempotent (same PUT repeated = same result)
- Returns 200 OK or 204 No Content

PATCH - Partial update:
- PATCH /api/users/123
- Client provides only changed fields
- Can be idempotent if designed correctly
- Returns 200 OK or 204 No Content

Example:

POST /api/users
{
  "name": "John Doe",
  "email": "john@example.com"
}
→ 201 Created, Location: /api/users/123

PUT /api/users/123
{
  "name": "John Smith",
  "email": "john@example.com",
  "age": 30
}
→ 200 OK (must provide all fields)

PATCH /api/users/123
{
  "email": "newemail@example.com"
}
→ 200 OK (only update email, keep rest)
```

### **Key Talking Points**

1. **"HTTP is stateless by design"**: Scalability benefit (no server-side session state)
2. **"Connection pooling is critical"**: Avoid TCP/TLS handshake overhead
3. **"Idempotency matters for retries"**: Use idempotency keys for POST
4. **"Cache aggressively"**: CDN + browser caching reduces load by 80%+
5. **"HTTPS is mandatory"**: Security, compliance, SEO, trust

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **HTTP Request Flow**

```
┌─────────┐
│ Browser │
└────┬────┘
     │ 1. DNS: api.example.com → 203.0.113.1
     ▼
┌──────────┐
│   DNS    │
└────┬─────┘
     │ 2. TCP handshake (SYN, SYN-ACK, ACK)
     ▼
┌──────────┐
│  Server  │
└────┬─────┘
     │ 3. TLS handshake (1-RTT)
     ▼
┌──────────┐
│  Server  │
└────┬─────┘
     │ 4. HTTP request
     │    GET /api/users/123 HTTP/1.1
     │    Authorization: Bearer <token>
     ▼
┌──────────┐
│  Server  │
│ Process  │
└────┬─────┘
     │ 5. HTTP response
     │    HTTP/1.1 200 OK
     │    Content-Type: application/json
     │    {"id": 123, "name": "John"}
     ▼
┌─────────┐
│ Browser │
└─────────┘
```

### **HTTP/1.1 vs HTTP/2 Comparison**

```
HTTP/1.1 (6 parallel connections):
Conn1: [Req1───Resp1][Req7───Resp7]
Conn2: [Req2───Resp2][Req8───Resp8]
Conn3: [Req3───Resp3][Req9───Resp9]
Conn4: [Req4───Resp4][Req10──Resp10]
Conn5: [Req5───Resp5][Req11──Resp11]
Conn6: [Req6───Resp6][Req12──Resp12]

HTTP/2 (1 multiplexed connection):
Conn1: [R1,R2,R3,R4,R5,R6,R7,R8,R9,R10,R11,R12]
       [Resp1,Resp2,Resp3,Resp4,Resp5,Resp6...]
       (All requests/responses interleaved)
```

### **Connection Pooling Pattern**

```python
class HTTPConnectionPool:
    def __init__(self, max_connections=100):
        self.pool = Queue(max_connections)
        self.active_connections = 0
        self.max_connections = max_connections
    
    def get_connection(self, host, port):
        try:
            # Try to reuse existing connection
            conn = self.pool.get(block=False)
            if conn.is_alive():
                return conn
        except Empty:
            pass
        
        # Create new connection if under limit
        if self.active_connections < self.max_connections:
            conn = HTTPConnection(host, port)
            conn.connect()
            self.active_connections += 1
            return conn
        
        # Wait for available connection
        return self.pool.get(block=True, timeout=5)
    
    def return_connection(self, conn):
        if conn.is_alive():
            self.pool.put(conn)  # Reuse
        else:
            self.active_connections -= 1  # Dead connection

# Usage
pool = HTTPConnectionPool(max_connections=50)

def make_request(url):
    conn = pool.get_connection(host, port)
    try:
        conn.request("GET", path, headers=headers)
        response = conn.getresponse()
        return response.read()
    finally:
        pool.return_connection(conn)
```

### **Idempotency Key Implementation**

```python
# Server-side
def create_payment(request):
    idempotency_key = request.headers.get('Idempotency-Key')
    
    if idempotency_key:
        # Check if we've seen this key before
        cached_result = redis.get(f"idempotency:{idempotency_key}")
        if cached_result:
            # Return cached result, don't reprocess
            return json.loads(cached_result)
    
    # Process payment (expensive, non-idempotent operation)
    payment = charge_credit_card(request.data)
    
    if idempotency_key:
        # Cache result for 24 hours
        redis.setex(
            f"idempotency:{idempotency_key}",
            86400,  # TTL: 24 hours
            json.dumps(payment)
        )
    
    return payment

# Client-side
import uuid
import requests

def create_payment_with_retry(amount):
    idempotency_key = str(uuid.uuid4())
    
    for attempt in range(3):
        try:
            response = requests.post(
                'https://api.example.com/payments',
                headers={
                    'Idempotency-Key': idempotency_key,
                    'Authorization': f'Bearer {token}'
                },
                json={'amount': amount},
                timeout=10
            )
            return response.json()
        except requests.exceptions.RequestException:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why HTTP/HTTPS Matter**

**Business Impact:**
- **Security**: HTTPS prevents data breaches, builds customer trust
- **Performance**: HTTP/2 reduces page load time → higher conversion rates
- **Compliance**: HTTPS required for PCI-DSS, HIPAA, GDPR
- **SEO**: Google ranks HTTPS sites higher

**Technical Impact:**
- **Foundation of REST APIs**: Standard for microservices communication
- **Protocol choice affects latency**: HTTP/3 can reduce latency by 15%+
- **TLS overhead**: 1-2% CPU, 40ms initial handshake
- **Connection management**: Pooling reduces latency by 50ms per request

### **How It Works (Simple Summary)**

**HTTP:**
1. Client opens TCP connection to server
2. Client sends HTTP request (method, URL, headers, body)
3. Server processes request
4. Server sends HTTP response (status code, headers, body)
5. Connection closed or kept alive for reuse

**HTTPS:**
- Same as HTTP, but wrapped in TLS encryption
- TLS handshake establishes encryption keys before HTTP data
- All HTTP data encrypted with symmetric cipher (AES-256)

**Evolution:**
- **HTTP/1.1**: One request per connection (or serial with keep-alive)
- **HTTP/2**: Multiplexed streams over single connection
- **HTTP/3**: QUIC (UDP-based), eliminates TCP head-of-line blocking

### **Key Trade-offs**

| Trade-off | Option A | Option B |
|-----------|----------|----------|
| **Protocol** | HTTP/1.1 (simple) | HTTP/2 (efficient) |
| **Security** | HTTP (fast) | HTTPS (secure) |
| **TLS version** | TLS 1.2 (compatible) | TLS 1.3 (faster) |
| **Connection strategy** | Per-request (simple) | Pooled (efficient) |
| **Retry strategy** | Aggressive (available) | Conservative (safe) |

### **Remember These Numbers**

```
TCP handshake:         30 ms
TLS 1.3 handshake:     40 ms
HTTP/2 multiplexing:   30-50% latency reduction
TLS CPU overhead:      1-2% with hardware acceleration
Connection pool size:  10-100 per backend
Keep-alive timeout:    60-300 seconds
```

### **Production Wisdom**

✅ **Always use HTTPS in production** (security, compliance, trust)  
✅ **Implement connection pooling** (avoid handshake overhead)  
✅ **Use idempotency keys for POST** (safe retries)  
✅ **Set appropriate timeouts** (connection, read, request)  
✅ **Cache aggressively** (CDN + browser caching)  
✅ **Return proper status codes** (don't always return 200)  
✅ **Use HTTP/2 or HTTP/3** (significant performance gains)  

❌ **Don't use HTTP for sensitive data** (passwords, payment info)  
❌ **Don't retry POST without idempotency keys** (duplicates)  
❌ **Don't send large payloads without compression** (gzip)  
❌ **Don't ignore TLS certificate validation** (MITM risk)  
❌ **Don't use blocking I/O with many connections** (use async or threads)  

---

**Final thought for interviews:**

> "HTTP is more than just a protocol—it's the contract between services in distributed systems. Understanding HTTP/2 multiplexing, TLS performance, idempotency, and caching strategies is essential for building fast, reliable, and secure APIs at scale. Every millisecond of latency and every byte of bandwidth matters when you're serving millions of requests per second."
