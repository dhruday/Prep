# 43. API Gateway Pattern

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**API Gateway** is a single entry point for all client requests in a microservices architecture. It sits between clients (web, mobile, third-party) and backend services, routing requests, aggregating responses, and handling cross-cutting concerns (authentication, rate limiting, logging, caching).

**What it is:**
- Single endpoint for clients (clients don't know about individual microservices)
- Routes requests to appropriate backend service
- Aggregates responses from multiple services (reduce client roundtrips)
- Handles cross-cutting concerns (auth, rate limiting, SSL termination)

**Why it exists:**
- **Simplify clients**: One endpoint instead of tracking dozens of microservices
- **Reduce roundtrips**: Aggregate multiple service calls into one API call
- **Centralize security**: Authentication, authorization, SSL termination in one place
- **Versioning**: Support multiple API versions without changing services

**Basic flow:**

```
Mobile App ──────→ API Gateway ──────→ User Service
                        │             (GET /users/123)
                        │
                        ├──────────→ Order Service
                        │             (GET /orders?userId=123)
                        │
                        └──────────→ Product Service
                                      (GET /products/456)

API Gateway aggregates responses:
{
  user: { id: 123, name: "Alice" },
  orders: [{ id: 789, total: 59.99 }],
  product: { id: 456, name: "Laptop" }
}

Client makes 1 request instead of 3!
```

💡 **Interview Opening:** "API Gateway is a single entry point for all client requests in microservices. Instead of clients calling User Service, Order Service, Product Service separately (3 network calls, managing 3 endpoints), they call API Gateway once. Gateway routes to backend services, aggregates responses, and handles cross-cutting concerns like authentication (verify JWT before forwarding), rate limiting (prevent abuse), caching (reduce backend load), and logging (centralized monitoring). Benefits: simplified clients (one endpoint), reduced latency (aggregate multiple calls), centralized security (auth in one place), and versioning (support /v1/users and /v2/users). Trade-off: single point of failure (if gateway down, entire system unavailable) and added latency (extra hop: client → gateway → service = 10-20ms overhead). Real-world: Netflix Zuul (routes 50B+ requests/day), AWS API Gateway (serverless), Kong (open-source, used by NASA, Cisco)."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **API Gateway Responsibilities**

#### **1. Request Routing**

**Simple routing (path-based):**

```
Client request: GET /api/users/123

API Gateway routes to:
  → User Service: GET http://user-service:3000/users/123

Client request: GET /api/orders/456

API Gateway routes to:
  → Order Service: GET http://order-service:3001/orders/456
```

**Kong configuration (YAML):**

```yaml
# Define services
services:
  - name: user-service
    url: http://user-service:3000
    
  - name: order-service
    url: http://order-service:3001

# Define routes
routes:
  - name: user-route
    service: user-service
    paths:
      - /api/users
    strip_path: false
    
  - name: order-route
    service: order-service
    paths:
      - /api/orders
    strip_path: false
```

**Header-based routing (versioning):**

```
Client request: GET /api/users/123
  Header: Accept: application/vnd.myapi.v1+json

API Gateway routes to:
  → User Service V1: http://user-service-v1:3000/users/123

Client request: GET /api/users/123
  Header: Accept: application/vnd.myapi.v2+json

API Gateway routes to:
  → User Service V2: http://user-service-v2:3000/users/123
```

#### **2. Request Aggregation (Backend for Frontend - BFF Pattern)**

**Problem: Mobile app needs user + orders + recommendations (3 separate API calls)**

```
Without API Gateway (3 roundtrips):

Mobile App → User Service: GET /users/123 (200ms)
Mobile App → Order Service: GET /orders?userId=123 (150ms)
Mobile App → Recommendation Service: GET /recommendations/123 (300ms)

Total: 650ms (sequential) or 300ms (parallel, but complex client code)
```

**With API Gateway (1 roundtrip):**

```
Mobile App → API Gateway: GET /api/mobile/dashboard/123

API Gateway:
  1. Parallel requests to backend services:
     - User Service: GET /users/123
     - Order Service: GET /orders?userId=123
     - Recommendation Service: GET /recommendations/123
  
  2. Aggregate responses:
     {
       user: { id: 123, name: "Alice", email: "alice@example.com" },
       recentOrders: [
         { id: 789, total: 59.99, status: "DELIVERED" }
       ],
       recommendations: [
         { productId: 456, name: "Wireless Mouse" }
       ]
     }

Total: 310ms (max of parallel requests + 10ms gateway overhead)
```

**Node.js API Gateway (Express):**

```javascript
const express = require('express');
const axios = require('axios');

const app = express();

// Aggregation endpoint (mobile dashboard)
app.get('/api/mobile/dashboard/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Parallel requests to backend services
    const [userResponse, ordersResponse, recommendationsResponse] = await Promise.all([
      axios.get(`http://user-service:3000/users/${userId}`),
      axios.get(`http://order-service:3001/orders?userId=${userId}&limit=5`),
      axios.get(`http://recommendation-service:3002/recommendations/${userId}`)
    ]);
    
    // Aggregate responses
    const dashboard = {
      user: userResponse.data,
      recentOrders: ordersResponse.data.orders,
      recommendations: recommendationsResponse.data.recommendations
    };
    
    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(8080, () => console.log('API Gateway listening on port 8080'));
```

#### **3. Authentication & Authorization**

**JWT validation at gateway (prevent unauthorized requests from reaching services):**

```javascript
const jwt = require('jsonwebtoken');

// Middleware: Verify JWT token
app.use('/api/*', (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request (for downstream services)
    req.headers['X-User-Id'] = decoded.userId;
    req.headers['X-User-Role'] = decoded.role;
    
    next();  // Proceed to routing
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Route: Only authenticated users reach this
app.get('/api/orders/:orderId', async (req, res) => {
  // Forward to Order Service (with user info in headers)
  const response = await axios.get(
    `http://order-service:3001/orders/${req.params.orderId}`,
    {
      headers: {
        'X-User-Id': req.headers['x-user-id'],
        'X-User-Role': req.headers['x-user-role']
      }
    }
  );
  
  res.json(response.data);
});
```

**Kong JWT plugin:**

```yaml
plugins:
  - name: jwt
    service: user-service
    config:
      secret_is_base64: false
      key_claim_name: iss
      claims_to_verify:
        - exp
```

**Authorization (role-based access control - RBAC):**

```javascript
// Middleware: Check user role
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}

// Route: Only admins can access
app.get('/api/admin/users', requireRole(['ADMIN']), async (req, res) => {
  const response = await axios.get('http://user-service:3000/users');
  res.json(response.data);
});

// Route: Users can access their own orders
app.get('/api/orders', async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  // Filter orders by user (authorization at gateway level)
  const response = await axios.get(`http://order-service:3001/orders?userId=${userId}`);
  res.json(response.data);
});
```

#### **4. Rate Limiting**

**Prevent abuse (limit requests per user):**

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient({
  host: 'redis',
  port: 6379
});

// Rate limiter: 100 requests per minute per user
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate_limit:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => {
    // Rate limit by user ID (from JWT)
    return req.headers['x-user-id'] || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: 60
    });
  }
});

// Apply rate limiter to all API routes
app.use('/api/*', apiLimiter);
```

**Kong rate limiting plugin:**

```yaml
plugins:
  - name: rate-limiting
    config:
      minute: 100
      policy: redis
      redis_host: redis
      redis_port: 6379
```

**Tiered rate limiting (different limits for different user types):**

```javascript
function getRateLimit(userRole) {
  const limits = {
    'FREE': 100,      // Free users: 100 req/min
    'PREMIUM': 1000,  // Premium users: 1000 req/min
    'ADMIN': 10000    // Admins: 10,000 req/min
  };
  
  return limits[userRole] || 100;  // Default: 100
}

app.use('/api/*', (req, res, next) => {
  const userRole = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];
  
  const key = `rate_limit:${userId}`;
  
  redisClient.get(key, (err, count) => {
    const limit = getRateLimit(userRole);
    const currentCount = parseInt(count || 0);
    
    if (currentCount >= limit) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    // Increment counter
    redisClient.incr(key);
    redisClient.expire(key, 60);  // Expire after 1 minute
    
    next();
  });
});
```

#### **5. Caching**

**Cache responses at gateway (reduce backend load):**

```javascript
const redis = require('redis');
const redisClient = redis.createClient();

// Cache middleware
function cache(duration) {
  return async (req, res, next) => {
    const cacheKey = `cache:${req.method}:${req.originalUrl}`;
    
    // Check cache
    redisClient.get(cacheKey, (err, cached) => {
      if (cached) {
        console.log('Cache hit');
        return res.json(JSON.parse(cached));
      }
      
      // Cache miss: Intercept res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Store in cache
        redisClient.setex(cacheKey, duration, JSON.stringify(data));
        
        originalJson(data);
      };
      
      next();
    });
  };
}

// Cache product list for 5 minutes
app.get('/api/products', cache(300), async (req, res) => {
  // This will be cached
  const response = await axios.get('http://product-service:3002/products');
  res.json(response.data);
});

// Don't cache user-specific data
app.get('/api/orders', async (req, res) => {
  // Not cached (user-specific)
  const userId = req.headers['x-user-id'];
  const response = await axios.get(`http://order-service:3001/orders?userId=${userId}`);
  res.json(response.data);
});
```

**Kong proxy caching plugin:**

```yaml
plugins:
  - name: proxy-cache
    config:
      strategy: redis
      redis:
        host: redis
        port: 6379
      content_type:
        - application/json
      cache_ttl: 300  # 5 minutes
      cache_control: false
```

#### **6. Protocol Translation**

**REST to gRPC:**

```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load gRPC proto
const packageDefinition = protoLoader.loadSync('user.proto');
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// Create gRPC client
const userClient = new userProto.UserService(
  'user-service:50051',
  grpc.credentials.createInsecure()
);

// REST endpoint (client sees REST API)
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  
  // Translate to gRPC call
  userClient.GetUser({ userId }, (error, response) => {
    if (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    // Translate gRPC response to REST JSON
    res.json({
      id: response.id,
      name: response.name,
      email: response.email
    });
  });
});
```

**WebSocket to HTTP:**

```javascript
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');
  
  ws.on('message', async (message) => {
    const request = JSON.parse(message);
    
    // Translate WebSocket message to HTTP request
    const response = await axios.get(`http://user-service:3000/users/${request.userId}`);
    
    // Send response back via WebSocket
    ws.send(JSON.stringify(response.data));
  });
});
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **Latency Overhead**

```
Without API Gateway:
Client → Service: 50ms (network) + 20ms (service) = 70ms

With API Gateway:
Client → Gateway: 50ms (network)
Gateway → Service: 5ms (internal network, same data center)
Gateway processing: 5-10ms (routing, auth check)
Service processing: 20ms
Gateway → Client: 50ms (network)

Total: 130ms (60ms overhead = ~85% increase)

Optimization:
- Keep gateway in same region as services (reduce gateway→service latency)
- Gateway connection pooling (reuse TCP connections)
- Gateway caching (skip service call for cached responses)
```

### **Throughput**

```
Single API Gateway instance:

Technology:         Throughput (req/s):
- NGINX:            10,000-50,000 (lightweight, C)
- Kong (NGINX+Lua): 5,000-10,000 (with plugins)
- Node.js:          1,000-5,000 (JavaScript, single-threaded)
- Spring Cloud:     500-2,000 (Java, higher latency)

Scaling:
3 gateway instances × 5,000 req/s = 15,000 req/s

Load balancer distributes:
Client → Load Balancer → Gateway 1 (33% traffic)
                      → Gateway 2 (33% traffic)
                      → Gateway 3 (34% traffic)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Gateway State Storage**

**1. Rate limiting counters (Redis):**

```
Key: rate_limit:user:123
Value: 45 (number of requests in current window)
TTL: 60 seconds (expires after 1 minute)

Increment on each request:
INCR rate_limit:user:123
EXPIRE rate_limit:user:123 60

Check before processing:
GET rate_limit:user:123
If value >= limit → Return 429 Too Many Requests
```

**2. Cached responses (Redis):**

```
Key: cache:GET:/api/products
Value: JSON string (serialized response)
TTL: 300 seconds (5 minutes)

Store:
SETEX cache:GET:/api/products 300 '{"products":[...]}'

Retrieve:
GET cache:GET:/api/products
If exists → Return cached response
If not exists → Fetch from service, cache result
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **High Availability**

```
Load Balancer (AWS ALB)
         │
    ┌────┴────┬─────────┐
    │         │         │
    ▼         ▼         ▼
Gateway 1  Gateway 2  Gateway 3
    │         │         │
    └─────────┴────┬────┘
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
    User Svc  Order Svc  Product Svc

Health checks:
- Load balancer pings: GET /health (every 10 seconds)
- If gateway down → Route to healthy gateways
- If gateway recovers → Add back to pool

Gateway /health endpoint:

app.get('/health', (req, res) => {
  // Check dependencies (Redis, backend services)
  const redisHealthy = redisClient.connected;
  const servicesHealthy = true;  // Ping backend services
  
  if (redisHealthy && servicesHealthy) {
    res.status(200).json({ status: 'healthy' });
  } else {
    res.status(503).json({ status: 'unhealthy' });
  }
});
```

### **Circuit Breaker**

```javascript
const CircuitBreaker = require('opossum');

// Circuit breaker for User Service
const userServiceBreaker = new CircuitBreaker(async (userId) => {
  return await axios.get(`http://user-service:3000/users/${userId}`);
}, {
  timeout: 3000,        // Request timeout: 3 seconds
  errorThresholdPercentage: 50,  // Open circuit if 50% requests fail
  resetTimeout: 30000   // Try again after 30 seconds
});

// Fallback: Return cached data if service down
userServiceBreaker.fallback((userId) => {
  console.log('Circuit open, returning cached data');
  return redisClient.get(`cache:user:${userId}`);
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userServiceBreaker.fire(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(503).json({ error: 'Service temporarily unavailable' });
  }
});
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **SSL Termination**

```
Client (HTTPS) → API Gateway (SSL termination) → Backend (HTTP)

Benefits:
✅ Single SSL certificate (gateway only, not every service)
✅ Reduced CPU (backend services don't decrypt HTTPS)
✅ Simplified certificate management

NGINX configuration:

server {
  listen 443 ssl;
  server_name api.example.com;
  
  ssl_certificate /etc/ssl/certs/api.example.com.crt;
  ssl_certificate_key /etc/ssl/private/api.example.com.key;
  
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  
  location /api/users {
    proxy_pass http://user-service:3000;  # Backend HTTP
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Netflix Zuul**

**Scale:**
- 50+ billion requests/day
- Routes to 1000+ backend services
- Deployed across multiple AWS regions

**Responsibilities:**
- **Dynamic routing**: Route based on request headers, A/B testing
- **Stress testing**: Route small % of traffic to canary deployments
- **Authentication**: Validate device tokens before routing
- **Insights**: Centralized logging, tracing (correlation IDs)

**Technology:**
- Built on Netflix Hystrix (circuit breaker)
- JVM-based (Java)

### **Example 2: AWS API Gateway**

**Use case:**
- Serverless applications (Lambda functions)
- Managed service (no infrastructure)

**Features:**
- **Request throttling**: Protect backend from traffic spikes
- **API keys**: Distribute keys to third-party developers
- **Request/response transformation**: Modify before/after backend
- **Mock responses**: Return static responses (no backend call)

**Pricing:**
- $3.50 per million requests
- Free tier: 1 million requests/month

### **Example 3: Kong (Open-Source)**

**Users:**
- NASA (space data APIs)
- Cisco (network management)
- Zynga (mobile games)

**Plugins (1800+ community plugins):**
- **Authentication**: JWT, OAuth 2.0, LDAP, Basic Auth
- **Rate limiting**: Per-consumer, per-route
- **Caching**: Proxy cache, Redis cache
- **Monitoring**: Prometheus, Datadog, New Relic
- **Transformation**: Request/response modification

**Deployment:**
- Kubernetes-native (Ingress controller)
- Docker support
- Horizontal scaling (add Kong nodes)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: Explain API Gateway and when to use it.**

**Answer:**
"API Gateway is a single entry point for all client requests in microservices architecture. It sits between clients and backend services, providing routing, aggregation, authentication, rate limiting, and caching.

**Core responsibilities:**

**1. Request routing:**
```
Client: GET /api/users/123 → Gateway routes to User Service
Client: GET /api/orders/456 → Gateway routes to Order Service
```

**2. Request aggregation (BFF pattern):**
```
Without gateway (3 roundtrips):
Mobile App → User Service (200ms)
Mobile App → Order Service (150ms)
Mobile App → Recommendation Service (300ms)
Total: 650ms sequential, 300ms parallel

With gateway (1 roundtrip):
Mobile App → API Gateway
Gateway → User Service (parallel)
        → Order Service (parallel)
        → Recommendation Service (parallel)
Gateway aggregates responses
Total: 310ms (max parallel time + 10ms gateway overhead)
```

**3. Authentication:**
```javascript
// Gateway verifies JWT before routing
app.use('/api/*', (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, SECRET);
  req.headers['X-User-Id'] = decoded.userId;
  next();
});
```

**4. Rate limiting:**
```javascript
// 100 requests per minute per user
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.headers['x-user-id']
});
```

**5. Caching:**
```javascript
// Cache product list for 5 minutes
app.get('/api/products', cache(300), async (req, res) => {
  const response = await axios.get('http://product-service:3002/products');
  res.json(response.data);
});
```

**Benefits:**

✅ **Simplified clients**: One endpoint (https://api.example.com) instead of tracking dozens of microservices  
✅ **Reduced latency**: Aggregate multiple calls (1 roundtrip vs 3)  
✅ **Centralized security**: Authentication/authorization in one place  
✅ **Versioning**: Support /v1/users and /v2/users without changing services  
✅ **Rate limiting**: Protect backend from abuse  
✅ **SSL termination**: Single certificate, backend uses HTTP  

**Trade-offs:**

❌ **Single point of failure**: If gateway down, entire system unavailable (mitigate with multiple gateway instances + load balancer)  
❌ **Latency overhead**: Extra hop (client → gateway → service = 10-20ms added)  
❌ **Complexity**: Another component to deploy, monitor, scale  

**Real-world:**

- **Netflix Zuul**: 50B+ requests/day, routes to 1000+ services
- **AWS API Gateway**: Serverless, $3.50 per million requests
- **Kong**: Open-source, used by NASA, Cisco, Zynga, 1800+ plugins

**When to use:**

✅ Microservices architecture (multiple backend services)  
✅ Multiple client types (web, mobile, third-party)  
✅ Need request aggregation (mobile dashboard)  
✅ Centralized auth/rate limiting required  

**When NOT to use:**

❌ Monolithic backend (single service, no routing needed)  
❌ Internal services only (no external clients)  
❌ Ultra-low latency required (gateway adds 10-20ms)  

**Key patterns:**

**Backend for Frontend (BFF):**
```
Mobile App → Mobile Gateway (aggregates, returns minimal data)
Web App → Web Gateway (aggregates, returns full data)
```

**Circuit breaker:**
```javascript
// If service down, return cached data
userServiceBreaker.fallback((userId) => {
  return redisClient.get(`cache:user:${userId}`);
});
```

**Production wisdom:**
- Deploy multiple gateway instances (high availability)
- Use Redis for rate limiting, caching (shared state)
- Health checks for automatic failover
- Circuit breakers to prevent cascading failures
- Monitoring: Centralized logging (correlation IDs), metrics (latency, error rate)"

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **API Gateway Flow**

```
Client Request: GET /api/mobile/dashboard/123
         │
         ▼
┌─────────────────────────────────────┐
│        API Gateway                  │
│  1. Authenticate (JWT validation)   │
│  2. Rate limiting (check Redis)     │
│  3. Caching (check Redis cache)     │
│  4. Routing (parallel requests):    │
│     - User Service                  │
│     - Order Service                 │
│     - Recommendation Service        │
│  5. Aggregate responses             │
│  6. Return to client                │
└──────────┬──────────────────────────┘
           │
      ┌────┴───┬────────┬──────────┐
      ▼        ▼        ▼          ▼
  User Svc Order Svc Rec. Svc   Redis
  (200ms)  (150ms)  (300ms)    (cache)
      │        │        │
      └────────┴────┬───┘
                   │
             Aggregate (310ms max)
                   │
                   ▼
            Client receives:
            {
              user: {...},
              orders: [...],
              recommendations: [...]
            }
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why API Gateway Matters**

**Business Impact:**
- **Faster development**: Clients use single endpoint (don't track microservices changes)
- **Better UX**: Reduced latency (aggregate multiple calls into one)
- **Cost savings**: Rate limiting prevents abuse (lower infrastructure costs)
- **Security**: Centralized authentication/authorization (easier to audit)

**Technical Impact:**
- **Simplified clients**: One endpoint instead of dozens
- **Reduced network calls**: Aggregate multiple services (1 roundtrip vs 3-5)
- **Centralized cross-cutting concerns**: Auth, rate limiting, logging, caching
- **Protocol translation**: REST to gRPC, WebSocket to HTTP

### **How It Works (Simple Summary)**

1. **Client** sends request to API Gateway (single endpoint)
2. **Gateway authenticates** (JWT validation, reject if invalid)
3. **Gateway rate limits** (check Redis, reject if exceeded)
4. **Gateway caches** (check Redis, return if cached)
5. **Gateway routes** to backend service (or aggregates from multiple services)
6. **Backend service** processes request, returns response
7. **Gateway** returns response to client (caches if appropriate)

**For production systems:**
- Deploy **multiple gateway instances** (high availability, load balanced)
- Use **Redis** for rate limiting counters, caching (shared state)
- Implement **circuit breakers** (prevent cascading failures)
- **Health checks** for automatic failover
- **Monitoring**: Centralized logging (correlation IDs), metrics (Prometheus)
- **SSL termination** at gateway (single certificate, backend HTTP)

### **Key Trade-offs**

| Aspect | With API Gateway | Without API Gateway |
|--------|------------------|---------------------|
| **Latency** | +10-20ms (extra hop) ❌ | Direct (no overhead) ✅ |
| **Client complexity** | Simple (1 endpoint) ✅ | Complex (N endpoints) ❌ |
| **Security** | Centralized (easy to audit) ✅ | Distributed (hard to enforce) ❌ |
| **Single point of failure** | Yes (mitigate with HA) ❌ | No ✅ |
| **Scalability** | Easy (horizontal) ✅ | Each client handles it ❌ |

### **Remember These Numbers**

```
Latency overhead:
- Gateway routing: 5-10ms
- Authentication check: 1-5ms (JWT verify)
- Rate limit check: 1-2ms (Redis GET)
- Cache check: 1-2ms (Redis GET)
Total: 10-20ms added per request

Throughput (single instance):
- NGINX: 10K-50K req/s
- Kong: 5K-10K req/s
- Node.js: 1K-5K req/s
- Spring Cloud: 500-2K req/s

Request aggregation benefit:
- Without gateway: 3 requests × 200ms = 600ms
- With gateway: 1 request + max(200ms) + 10ms = 210ms
Savings: 390ms (65% faster)

Real-world scale:
- Netflix Zuul: 50B+ requests/day
- AWS API Gateway: Millions of customers
- Kong: NASA, Cisco, Zynga
```

### **Production Wisdom**

✅ **Multiple gateway instances** (HA, load balanced)  
✅ **Redis for shared state** (rate limits, cache)  
✅ **Circuit breakers** (prevent cascading failures)  
✅ **Health checks** (automatic failover)  
✅ **SSL termination** at gateway (single cert)  
✅ **Request aggregation** for mobile (BFF pattern)  
✅ **Correlation IDs** (trace requests across services)  
✅ **Monitoring** (centralized logging, metrics)  
✅ **Tiered rate limiting** (different limits per user type)  
✅ **Caching** (static data, 5-15 minutes TTL)  

❌ **Don't use for monoliths** (no routing needed)  
❌ **Don't put business logic** in gateway (keep thin)  
❌ **Don't skip health checks** (single point of failure)  
❌ **Don't cache user-specific data** (privacy risk)  
❌ **Don't use for ultra-low latency** (adds 10-20ms)  

---

**Final thought for interviews:**

> "API Gateway is essential for microservices: it's the single entry point that simplifies clients (one endpoint vs dozens), reduces latency (aggregate multiple service calls into one), and centralizes cross-cutting concerns (authentication, rate limiting, caching, logging). Real-world: Netflix Zuul routes 50B+ requests/day to 1000+ services, AWS API Gateway powers millions of serverless applications, Kong used by NASA/Cisco. Key responsibilities: request routing (path/header-based), request aggregation (BFF pattern: mobile dashboard fetches user + orders + recommendations in one call instead of three), authentication (JWT validation before routing), rate limiting (100 req/min per user, Redis counters), and caching (static data, 5-15 min TTL). Trade-off: adds 10-20ms latency (extra hop) and is a single point of failure (mitigate with multiple instances + load balancer). In production: multiple gateway instances for HA, Redis for shared state, circuit breakers to prevent cascading failures, health checks for automatic failover, SSL termination at gateway (single certificate, backend HTTP), and correlation IDs for distributed tracing. Use for microservices with multiple client types (web, mobile, third-party); skip for monoliths or internal-only services."
