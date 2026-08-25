# 45. Service Decomposition Strategies

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Service Decomposition** is the process of breaking down a monolithic application into smaller, independent microservices. The goal is to identify service boundaries that align with business capabilities, minimize coupling, and maximize cohesion.

**What it is:**
- Breaking monolith into microservices
- Identifying service boundaries (what belongs together)
- Strategies: by business capability, by subdomain (DDD), by team structure
- Incremental migration (not big-bang rewrite)

**Why it exists:**
- **Scalability**: Scale individual services independently (not entire monolith)
- **Team autonomy**: Teams own services end-to-end (no coordination bottleneck)
- **Technology flexibility**: Different services use different tech stacks
- **Deployment independence**: Deploy services separately (no coordinated releases)

**Decomposition strategies:**

```
1. By Business Capability:
   Monolith → User Service, Product Service, Order Service, Payment Service

2. By Subdomain (DDD):
   Monolith → Core Domain (Order Management)
            + Supporting Domain (Inventory)
            + Generic Domain (Notifications)

3. By Team (Conway's Law):
   Mobile Team → Mobile BFF
   Web Team → Web BFF
   Payments Team → Payment Service
```

💡 **Interview Opening:** "Service Decomposition breaks monoliths into microservices by identifying service boundaries. Three main strategies: **By Business Capability** (User Service handles authentication/profiles, Product Service handles catalog, Order Service handles checkout—each maps to business function), **By Subdomain using Domain-Driven Design** (identify bounded contexts: Order Management is core domain with complex logic, Notifications is generic domain with simple logic), and **By Team using Conway's Law** (mobile team owns Mobile BFF, payments team owns Payment Service). Key pattern: **Strangler Fig** (incrementally extract services without big-bang rewrite: route 10% traffic to new Order Service, monitor, increase to 100%, retire old code). Trade-off: microservices solve **people problems** (coordination bottleneck with 50+ developers) but add **technical complexity** (distributed transactions, network latency, service discovery). Migrate when team size > 20-50 developers, deployment frequency > 10x/day, or scaling needs differ per service. Real-world: Amazon (2001 mandate: all teams expose APIs, led to AWS), Airbnb (monolith to 1000+ services), Uber (2200+ services)."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Strategy 1: Decomposition by Business Capability**

**Principle: Align services with business functions**

**E-commerce example:**

```
Monolith modules:
- User Management (authentication, profiles)
- Product Catalog (search, browse, details)
- Shopping Cart (add/remove items)
- Order Management (checkout, order history)
- Payment Processing (charge credit cards)
- Inventory (stock levels, reservations)
- Notifications (email, SMS, push)

Decompose into services:

┌──────────────────┐
│  User Service    │  ← Authentication, user profiles
└──────────────────┘

┌──────────────────┐
│ Product Service  │  ← Product catalog, search
└──────────────────┘

┌──────────────────┐
│  Cart Service    │  ← Shopping cart management
└──────────────────┘

┌──────────────────┐
│  Order Service   │  ← Order placement, tracking
└──────────────────┘

┌──────────────────┐
│ Payment Service  │  ← Payment processing, refunds
└──────────────────┘

┌──────────────────┐
│Inventory Service │  ← Stock management
└──────────────────┘

┌──────────────────┐
│Notification Svc  │  ← Email, SMS, push notifications
└──────────────────┘
```

**Characteristics of good service boundaries:**

**1. High cohesion (related functionality together):**

```
✅ GOOD: Order Service
- createOrder()
- getOrderStatus()
- cancelOrder()
- getOrderHistory()

All order-related operations in one service

❌ BAD: Mixed responsibilities
Order Service:
- createOrder()
- sendEmailNotification()  ← Belongs in Notification Service
- chargePayment()          ← Belongs in Payment Service
```

**2. Low coupling (minimize dependencies between services):**

```
✅ GOOD: Product Service doesn't depend on Order Service

Product Service:
- GET /products/{id}
- POST /products
- PUT /products/{id}

Order Service calls Product Service (one-way dependency)

❌ BAD: Circular dependency
Order Service → calls Product Service
Product Service → calls Order Service (circular!)
```

**3. Data encapsulation (each service owns its database):**

```
✅ GOOD: Database per service

Order Service → orders DB (PostgreSQL)
Product Service → products DB (PostgreSQL)
User Service → users DB (PostgreSQL)

No shared tables!

❌ BAD: Shared database
Order Service ───┐
Product Service ─┼→ Shared DB
User Service ────┘

Problem: Can't change schema independently (coupled)
```

### **Strategy 2: Decomposition by Subdomain (Domain-Driven Design)**

**Principle: Use DDD to identify bounded contexts**

#### **DDD Concepts**

**1. Bounded Context:**
- Explicit boundary within which domain model is valid
- Example: "Customer" means different things in different contexts

```
Sales Context:
- Customer: Person who buys products
- Attributes: name, email, shipping address, payment method

Support Context:
- Customer: Person who needs help
- Attributes: name, email, support tickets, satisfaction score

Different models, different services!
```

**2. Core Domain vs Supporting Domain vs Generic Domain:**

```
E-commerce domains:

Core Domain (competitive advantage, complex business logic):
- Order Management
  * Complex: Promotions, discounts, multi-currency, tax calculation
  * High value: Directly impacts revenue
  * Custom implementation (can't use off-the-shelf)

Supporting Domain (necessary but not differentiating):
- Inventory Management
  * Moderately complex: Stock levels, reservations, replenishment
  * Necessary but not unique
  * Could use existing solution

Generic Domain (commodity):
- Email Notifications
  * Simple: Template + send
  * No competitive advantage
  * Use third-party (SendGrid, Twilio)
```

**Investment strategy:**

```
Core Domain:
- Build in-house
- Best engineers
- Extensive testing
- Iterate frequently

Supporting Domain:
- Build or buy (evaluate)
- Good engineers
- Adequate testing
- Iterate occasionally

Generic Domain:
- Buy/use SaaS
- Don't build
- Minimal customization
```

#### **Example: E-commerce Bounded Contexts**

**Context Map:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Order Management Context                  │
│                         (Core Domain)                        │
│  Entities: Order, OrderItem, ShippingAddress                │
│  Services: OrderService, PricingService                      │
│  Complex logic: Tax, discounts, promotions, multi-currency  │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┼────────────┬──────────────┐
        │           │            │              │
        ▼           ▼            ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│   Product    │ │Inventory │ │ Payment  │ │ Notification │
│   Context    │ │ Context  │ │ Context  │ │   Context    │
│ (Supporting) │ │(Support) │ │ (Core)   │ │  (Generic)   │
└──────────────┘ └──────────┘ └──────────┘ └──────────────┘
```

**Anti-Corruption Layer (ACL):**

```
Problem: Order Context depends on Product Context
         Product model changes (add field "manufacturer")
         Order Context breaks (doesn't expect new field)

Solution: Anti-Corruption Layer (translate between contexts)

Order Service:
  │
  ▼ Calls Product Service through ACL
┌─────────────────────────────────┐
│ Anti-Corruption Layer (Adapter) │
│ - Fetch product from Product Svc│
│ - Translate to Order Context:   │
│   ProductDTO (Order's view)     │
│   { id, name, price }           │
│   (ignores "manufacturer")      │
└─────────────────────────────────┘
  │
  ▼
Product Service:
  Returns: { id, name, price, manufacturer }

Order Context never sees "manufacturer" (protected from changes)
```

**Implementation:**

```java
// Order Service (Order Context)

@Service
public class OrderService {
  
  @Autowired
  private ProductServiceAdapter productAdapter;  // ACL
  
  public Order createOrder(List<OrderItemRequest> items) {
    Order order = new Order();
    
    for (OrderItemRequest item : items) {
      // Fetch product through ACL (not directly from Product Service)
      ProductDTO product = productAdapter.getProduct(item.getProductId());
      
      // Use Order Context's view of Product (not Product Service's model)
      OrderItem orderItem = new OrderItem();
      orderItem.setProductId(product.getId());
      orderItem.setProductName(product.getName());
      orderItem.setPrice(product.getPrice());
      orderItem.setQuantity(item.getQuantity());
      
      order.addItem(orderItem);
    }
    
    return orderRepository.save(order);
  }
}

// Anti-Corruption Layer (Adapter)

@Component
public class ProductServiceAdapter {
  
  @Autowired
  private RestTemplate restTemplate;
  
  public ProductDTO getProduct(Long productId) {
    // Call Product Service
    ProductServiceResponse response = restTemplate.getForObject(
      "http://product-service/products/" + productId,
      ProductServiceResponse.class
    );
    
    // Translate to Order Context's model (ACL translation)
    ProductDTO dto = new ProductDTO();
    dto.setId(response.getId());
    dto.setName(response.getName());
    dto.setPrice(response.getPrice());
    // Ignore "manufacturer" field (not part of Order Context)
    
    return dto;
  }
}

// Order Context's view of Product (simplified DTO)

public class ProductDTO {
  private Long id;
  private String name;
  private BigDecimal price;
  // No "manufacturer" field (Order Context doesn't care)
}

// Product Service's full model (Product Context)

public class Product {
  private Long id;
  private String name;
  private BigDecimal price;
  private String manufacturer;  // Extra field
  private String category;
  private List<String> imageUrls;
  // ... more fields
}
```

### **Strategy 3: Decomposition by Team (Conway's Law)**

**Conway's Law:** "Organizations design systems that mirror their communication structures"

**Example:**

```
Company with 4 teams:

Team 1: Mobile developers
Team 2: Web developers
Team 3: Backend engineers
Team 4: Data scientists

Architecture:

┌──────────────┐     ┌──────────────┐
│  Mobile App  │────→│  Mobile BFF  │ ← Team 1 owns
└──────────────┘     └──────┬───────┘
                            │
┌──────────────┐     ┌──────┴───────┐
│   Web App    │────→│   Web BFF    │ ← Team 2 owns
└──────────────┘     └──────┬───────┘
                            │
                      ┌─────┴──────┬──────────────┬────────────────┐
                      ▼            ▼              ▼                ▼
               ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
               │User Service│ │Order Svc │ │Product  │ │Recommendation Svc│
               └────────────┘ └──────────┘ │  Service │ └──────────────────┘
                    ▲              ▲        └──────────┘         ▲
                    │              │              ▲              │
                    └──────────────┴──────────────┘──────────────┘
                                   │
                              Team 3 owns      Team 4 owns
                         (Backend engineers)  (Data scientists)

Team boundaries = Service boundaries

Benefits:
✅ Teams independent (no coordination bottleneck)
✅ Clear ownership (Team 3 owns Order Service)
✅ Faster deployment (Team 1 deploys Mobile BFF without affecting Team 2)
```

### **Strangler Fig Pattern (Incremental Migration)**

**Problem: Big-bang rewrite is risky**

```
❌ BAD: Stop everything, rewrite monolith, flip switch

Monolith (serves 100% traffic)
    │
    │ 6 months later...
    │
New Microservices (untested, risky)

Problems:
- No revenue for 6 months (no new features)
- Untested at scale (might fail when released)
- High risk (all eggs in one basket)
```

**Solution: Strangler Fig Pattern (incremental migration)**

```
Named after Strangler Fig tree (grows around host tree, eventually replaces it)

Phase 1: Route 10% traffic to new Order Service

Load Balancer
    │
    ├─→ 90% → Monolith (Order module)
    └─→ 10% → Order Service (new microservice)

Monitor: Errors, latency, success rate

Phase 2: Increase to 50% (if Phase 1 successful)

Load Balancer
    │
    ├─→ 50% → Monolith
    └─→ 50% → Order Service

Phase 3: Route 100% to Order Service

Load Balancer
    │
    └─→ 100% → Order Service

Phase 4: Retire monolith's Order module

Monolith (Order code deleted)
Order Service (100% traffic, proven at scale)

Benefits:
✅ Low risk (rollback easily if issues)
✅ Continuous revenue (keep shipping features)
✅ Proven at scale (gradual traffic increase)
✅ Team confidence (see it working in production)
```

**Implementation (Proxy/Router):**

```javascript
// API Gateway routing logic (Strangler Fig)

const express = require('express');
const axios = require('axios');

const app = express();

// Order endpoint with gradual migration
app.post('/api/orders', async (req, res) => {
  // Determine routing (10% to new service, 90% to monolith)
  const routeToNewService = Math.random() < 0.10;  // 10% traffic
  
  if (routeToNewService) {
    // Route to new Order Service
    console.log('Routing to Order Service (new)');
    
    try {
      const response = await axios.post(
        'http://order-service:3001/orders',
        req.body
      );
      res.json(response.data);
    } catch (error) {
      // Fallback to monolith if new service fails
      console.error('Order Service failed, falling back to monolith');
      const response = await axios.post(
        'http://monolith:8080/api/orders',
        req.body
      );
      res.json(response.data);
    }
  } else {
    // Route to monolith (90% traffic)
    console.log('Routing to monolith');
    const response = await axios.post(
      'http://monolith:8080/api/orders',
      req.body
    );
    res.json(response.data);
  }
});

// Gradually increase percentage:
// Week 1: 10%
// Week 2: 25% (if no errors)
// Week 3: 50%
// Week 4: 100%
// Week 5: Retire monolith code
```

### **Database Decomposition**

**Problem: Monolith uses single database with foreign keys**

```
Monolith Database:

users table:
  id | name | email

products table:
  id | name | price

orders table:
  id | user_id (FK → users.id) | total

order_items table:
  id | order_id (FK → orders.id) | product_id (FK → products.id) | quantity

Foreign keys enforce referential integrity (can't delete user with orders)
```

**Goal: Each service owns its database (no foreign keys across services)**

```
After decomposition:

User Service → users DB:
  users table: id, name, email

Product Service → products DB:
  products table: id, name, price

Order Service → orders DB:
  orders table: id, user_id (no FK!), total
  order_items table: id, order_id, product_id (no FK!), quantity

No foreign keys across services!
```

**Challenge: Referential integrity**

```
Problem: What if order references non-existent user?

Order: { userId: 999 }
User 999 doesn't exist in User Service

Solution 1: Eventual consistency (accept it)
- Order Service doesn't validate user exists
- If user deleted, order still exists (orphaned)
- Acceptable for most cases

Solution 2: Validate before creating order
- Order Service calls User Service: GET /users/999
- If user exists → Create order
- If user doesn't exist → Reject order

order_service.py:

@app.route('/orders', methods=['POST'])
def create_order():
    data = request.json
    user_id = data['userId']
    
    # Validate user exists (call User Service)
    response = requests.get(f'http://user-service/users/{user_id}')
    
    if response.status_code == 404:
        return jsonify({'error': 'User not found'}), 400
    
    # User exists, create order
    order = Order(user_id=user_id, total=data['total'])
    db.session.add(order)
    db.session.commit()
    
    return jsonify({'orderId': order.id}), 201

Trade-off:
✅ Referential integrity (no orphaned orders)
❌ Network call (latency + failure risk)
❌ Coupling (Order Service depends on User Service availability)

Solution 3: Cache user existence (reduce network calls)
- Order Service caches: user_exists(123) = True (5 minutes TTL)
- Check cache before calling User Service
- Stale cache acceptable (user unlikely deleted in 5 minutes)
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **Service Sizing**

```
E-commerce (100K daily active users)

User Service:
- Read-heavy (profile views, authentication checks)
- 200K requests/day → 2.3 req/s avg, 12 req/s peak
- 2 instances (stateless, easily scaled)

Product Service:
- Read-heavy (browsing, search)
- 2M requests/day → 23 req/s avg, 115 req/s peak
- 5 instances (high traffic, cache heavily)

Order Service:
- Write-heavy (order creation, updates)
- 10K orders/day → 0.12 req/s avg, 0.6 req/s peak
- 2 instances (low traffic but critical)

Payment Service:
- Mission-critical (money involved)
- 10K payments/day → 0.12 req/s avg
- 3 instances (high availability, not for traffic but redundancy)

Notification Service:
- Asynchronous (queue-based, not user-facing)
- 50K notifications/day
- 2 instances (process queue in background)

Total instances: 14 (vs monolith 3-5 instances)
Cost increase: 3-4x (but better scaling, fault isolation)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Data Consistency Patterns**

**1. Saga Pattern (distributed transactions):**

```
Problem: Create order requires:
1. Deduct inventory (Inventory Service)
2. Charge payment (Payment Service)
3. Create order (Order Service)

If payment fails, must rollback inventory deduction

Saga solution (orchestration):

Order Service (Saga Orchestrator):
  1. Reserve inventory: POST /inventory/reserve { productId: 123, quantity: 2 }
     → Inventory Service: Stock -= 2, create reservation
  
  2. Charge payment: POST /payments { amount: 59.99 }
     → Payment Service: Charge credit card
  
  3. If payment succeeds:
     → Confirm inventory: POST /inventory/confirm { reservationId: 456 }
     → Create order: INSERT INTO orders...
  
  4. If payment fails:
     → Rollback inventory: POST /inventory/rollback { reservationId: 456 }
     → Return error to user

Compensation logic (manual rollback, not ACID)
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Fault Isolation**

```
Monolith:
  Payment module crashes → Entire monolith down → Users can't browse products

Microservices:
  Payment Service crashes → Only payments affected → Users can still browse products

┌──────────────────────────────────────────┐
│          Monolith                        │
│  ┌────────┐ ┌────────┐ ┌─────────┐     │
│  │ User   │ │Product │ │ Payment │     │
│  │ Module │ │ Module │ │ Module  │← Crash
│  └────────┘ └────────┘ └─────────┘     │
│                                          │
│  All modules down!                      │
└──────────────────────────────────────────┘

vs

Microservices:
┌───────────┐ ┌────────────┐ ┌──────────────┐
│User Service│ │Product Svc │ │Payment Svc   │
│  (UP ✅)   │ │  (UP ✅)   │ │ (DOWN ❌)    │
└───────────┘ └────────────┘ └──────────────┘

Users can still browse, just can't checkout
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **API Contracts (Prevent Breaking Changes)**

```
Problem: Product Service changes API, Order Service breaks

Product Service (v1):
GET /products/{id}
Response: { id, name, price }

Order Service depends on this

Product Service (v2):
GET /products/{id}
Response: { id, title, price }  ← "name" renamed to "title"

Order Service breaks (expects "name" field)

Solution 1: Versioning (support both v1 and v2)

GET /v1/products/{id} → { id, name, price }
GET /v2/products/{id} → { id, title, price }

Order Service uses /v1 (not affected by v2 changes)

Solution 2: API contract testing (catch breaking changes before deployment)

Pact (contract testing):

// Order Service defines contract (what it expects)
const pact = {
  request: {
    method: 'GET',
    path: '/products/123'
  },
  response: {
    status: 200,
    body: {
      id: 123,
      name: 'Laptop',
      price: 999.99
    }
  }
};

// Product Service tests against contract
// If Product Service removes "name" field → Test fails → Can't deploy

Benefits:
✅ Catch breaking changes early (before production)
✅ Consumer-driven (Order Service defines what it needs)
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Amazon (2001 Mandate)**

**Before (2001):**
```
Monolithic e-commerce platform
- All teams shared codebase
- Coordinated deployments (quarterly releases)
- Tight coupling (change one feature, test everything)
```

**Jeff Bezos Mandate (2002):**
```
All teams must expose functionality via service interfaces:
1. All teams expose APIs
2. Teams communicate only through APIs (no direct DB access)
3. APIs must be externalized (could be exposed to public)
4. Anyone who doesn't do this will be fired

Result:
- 10,000+ services (estimated)
- Service-Oriented Architecture (SOA)
- Eventually led to AWS (internal services became products)
```

**Benefits:**
- **Team autonomy**: Teams deploy independently
- **Scalability**: Scale services individually
- **Innovation**: AWS born from internal services (EC2, S3, DynamoDB)

### **Example 2: Uber (Monolith to 2200+ Services)**

**2012 (Monolith):**
```
Single Python/Node.js monolith
- All functionality in one codebase
- 10 engineers

Problems by 2014:
- 100+ engineers
- Deployment bottleneck (one team blocks others)
- Can't scale ride matching independently from payments
```

**Migration Strategy:**
```
2014-2016: Strangler Fig Pattern
- Extract critical services first: Dispatch, Payments, Driver Matching
- Route traffic gradually (10% → 50% → 100%)
- Keep monolith running (fallback)

2018: 2200+ microservices
- Each team owns 5-10 services
- Deploy 1000+ times/day
- Different tech stacks (Go, Java, Node.js, Python)
```

**Results:**
- 28+ million trips/day
- 5 million drivers
- 150+ million users

### **Example 3: Airbnb (Monolith to 1000+ Services)**

**2014 (Monolith - "Monorail"):**
```
Ruby on Rails monolith
- All features in one app
- 500+ engineers

Problems:
- Slow tests (30+ minutes to run full suite)
- Deployment fear (one bug breaks everything)
- Can't scale search independently from bookings
```

**Migration (2016-present):**
```
Strategy: By Business Capability
- Search Service (Elasticsearch-based)
- Booking Service (Java)
- Payment Service (Go)
- Messaging Service (Node.js)

Strangler Fig:
- Route traffic gradually
- Keep "Monorail" for 50% of features (not fully decomposed)
```

**Results:**
- 1000+ services
- Deploy 500+ times/day
- Faster innovation (teams independent)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: How do you decompose a monolith into microservices? What strategies would you use?**

**Answer:**
"Service decomposition breaks a monolith into microservices by identifying service boundaries. Three main strategies:

**1. By Business Capability:**

Map services to business functions:

```
E-commerce example:
- User Service: Authentication, profiles (business capability: user management)
- Product Service: Catalog, search (business capability: product management)
- Order Service: Checkout, order tracking (business capability: order fulfillment)
- Payment Service: Charge cards, refunds (business capability: payment processing)
```

**Characteristics:**
- High cohesion (related functionality together)
- Low coupling (minimize dependencies)
- Data encapsulation (each service owns database)

**2. By Subdomain (Domain-Driven Design):**

Identify bounded contexts (explicit boundaries where domain model is valid):

```
Core Domain (competitive advantage, complex logic):
- Order Management: Promotions, discounts, tax calculation
- Investment: Best engineers, iterate frequently

Supporting Domain (necessary but not differentiating):
- Inventory Management: Stock levels, reservations
- Investment: Good engineers, adequate testing

Generic Domain (commodity):
- Email Notifications: Simple send
- Investment: Use third-party (SendGrid, Twilio)
```

**Anti-Corruption Layer (ACL):**

Protect your service from upstream changes:

```java
// Order Service (Order Context)
@Service
public class OrderService {
  @Autowired
  private ProductServiceAdapter productAdapter;  // ACL
  
  public Order createOrder(List<OrderItemRequest> items) {
    for (OrderItemRequest item : items) {
      // Fetch through ACL (not directly from Product Service)
      ProductDTO product = productAdapter.getProduct(item.getProductId());
      // Use Order Context's view (simplified DTO)
    }
  }
}

// ACL translates Product Service response to Order Context's model
@Component
public class ProductServiceAdapter {
  public ProductDTO getProduct(Long productId) {
    ProductServiceResponse response = restTemplate.getForObject(...);
    
    // Translate (Order Context only needs id, name, price)
    ProductDTO dto = new ProductDTO();
    dto.setId(response.getId());
    dto.setName(response.getName());
    dto.setPrice(response.getPrice());
    // Ignore "manufacturer" field (Order Context doesn't need it)
    
    return dto;
  }
}
```

**3. By Team (Conway's Law):**

"Organizations design systems that mirror their communication structures"

```
Company structure:
- Mobile Team → Mobile BFF (owned by mobile team)
- Web Team → Web BFF (owned by web team)
- Backend Team → User Service, Order Service, Product Service
- Payments Team → Payment Service (owned by payments specialists)

Team boundaries = Service boundaries

Benefits:
✅ Clear ownership (Payments Team owns Payment Service end-to-end)
✅ Team autonomy (Mobile Team deploys without coordinating with Web Team)
```

**Migration Pattern: Strangler Fig (Incremental, Not Big-Bang)**

```
Problem: Big-bang rewrite is risky (6 months no revenue, untested at scale)

Solution: Strangler Fig Pattern (gradual migration)

Phase 1: Route 10% traffic to new Order Service
  Load Balancer:
    ├─→ 90% → Monolith
    └─→ 10% → Order Service (new)
  
  Monitor: Errors, latency
  Rollback if issues

Phase 2: Increase to 50% (if Phase 1 successful)

Phase 3: Route 100% to Order Service

Phase 4: Retire monolith's Order code

Benefits:
✅ Low risk (rollback easily)
✅ Continuous revenue (keep shipping features)
✅ Proven at scale (gradual traffic increase)
```

**Implementation:**

```javascript
// API Gateway routing (Strangler Fig)
app.post('/api/orders', async (req, res) => {
  const routeToNewService = Math.random() < 0.10;  // 10% traffic
  
  if (routeToNewService) {
    try {
      const response = await axios.post('http://order-service:3001/orders', req.body);
      res.json(response.data);
    } catch (error) {
      // Fallback to monolith if new service fails
      const response = await axios.post('http://monolith:8080/api/orders', req.body);
      res.json(response.data);
    }
  } else {
    const response = await axios.post('http://monolith:8080/api/orders', req.body);
    res.json(response.data);
  }
});

// Gradually increase: 10% → 25% → 50% → 100% → Retire monolith
```

**Database Decomposition:**

```
Problem: Monolith uses single database with foreign keys

Monolith DB:
  orders table: user_id (FK → users.id), product_id (FK → products.id)

Goal: Database per service (no foreign keys across services)

Order Service DB:
  orders table: user_id (no FK!), product_id (no FK!)

Challenge: Referential integrity (what if order references non-existent user?)

Solution 1: Eventual consistency (accept orphaned data)
Solution 2: Validate before creating order (call User Service: GET /users/999)
Solution 3: Cache user existence (reduce network calls, 5 min TTL)

Trade-off:
✅ Service independence (change User Service DB without affecting Order Service)
❌ No database-level referential integrity (must validate in application code)
```

**When to decompose:**

✅ **Team size > 20-50 developers** (coordination bottleneck)  
✅ **Deployment frequency > 10x/day** (monolith deployment too slow)  
✅ **Different scaling needs** (search service needs 10x instances of payment service)  
✅ **Technology diversity** (ML team wants Python, backend team wants Java)  

❌ **Don't decompose if:**
- Team < 10 developers (overhead not justified)
- Simple CRUD application (monolith sufficient)
- Unclear domain boundaries (premature decomposition)

**Real-world:**

- **Amazon (2001)**: Bezos mandate → 10K+ services → Led to AWS
- **Uber**: Monolith (2012, 10 engineers) → 2200+ services (2018, 5000+ engineers)
- **Airbnb**: "Monorail" (2014, 500 engineers) → 1000+ services (deploy 500x/day)

**Key principles:**

1. **High cohesion, low coupling**: Related functionality together, minimal dependencies
2. **Database per service**: No shared tables, each service owns its data
3. **Strangler Fig Pattern**: Incremental migration (10% → 100%), not big-bang
4. **API contracts**: Prevent breaking changes (versioning, contract testing)
5. **Fault isolation**: Payment Service down doesn't affect product browsing
6. **Team autonomy**: Teams deploy independently (no coordination)

**Production wisdom:**
- Start with monolith (premature decomposition is costly)
- Decompose when pain justifies complexity (team > 20-50 devs)
- Use Strangler Fig Pattern (gradual migration, proven at scale)
- Database per service (no foreign keys across services)
- Anti-Corruption Layer (protect from upstream changes)
- Monitor everything (distributed tracing, centralized logging)"

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **Decomposition Flow**

```
┌─────────────────────────────────────────────────────────┐
│                    Monolith                              │
│  ┌────────┐ ┌─────────┐ ┌────────┐ ┌──────────────┐   │
│  │  User  │ │ Product │ │ Order  │ │   Payment    │   │
│  │ Module │ │  Module │ │ Module │ │    Module    │   │
│  └────────┘ └─────────┘ └────────┘ └──────────────┘   │
│                                                          │
│  Shared Database (foreign keys, transactions)           │
└─────────────────────────────────────────────────────────┘

                      Decompose ↓

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ User Service │     │Product Service│     │Order Service │
│              │     │              │     │              │
│ users DB     │     │ products DB  │     │  orders DB   │
└──────────────┘     └──────────────┘     └──────────────┘

                ┌──────────────────┐
                │ Payment Service  │
                │                  │
                │  payments DB     │
                └──────────────────┘

Database per service (no foreign keys across services)
API calls for cross-service communication
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why Service Decomposition Matters**

**Business Impact:**
- **Faster time to market**: Teams deploy independently (no coordination bottleneck)
- **Scalability**: Scale services independently (search needs 10x instances of payments)
- **Innovation**: Teams choose best tech stack (ML team uses Python, backend uses Java)
- **Fault isolation**: Payment Service down doesn't affect product browsing (partial availability)

**Technical Impact:**
- **Team autonomy**: Teams own services end-to-end (no cross-team dependencies)
- **Independent deployment**: Deploy Order Service without deploying Product Service
- **Technology flexibility**: Different services use different databases, frameworks
- **Scalability**: Scale based on service needs (not entire monolith)

### **How It Works (Simple Summary)**

1. **Identify service boundaries** (by business capability, subdomain, or team)
2. **Extract service incrementally** (Strangler Fig: route 10% traffic → 100% → retire monolith code)
3. **Separate databases** (each service owns database, no foreign keys across services)
4. **API communication** (services call each other via REST, gRPC, or events)
5. **Validate referential integrity** in application code (no database-level foreign keys)

**For production systems:**
- **Start with monolith** (premature decomposition costly)
- **Decompose when pain justifies complexity** (team > 20-50 devs, deploy > 10x/day)
- **Strangler Fig Pattern** (gradual migration, proven at scale)
- **Database per service** (no shared tables)
- **Anti-Corruption Layer** (protect from upstream changes)
- **API contracts** (versioning, contract testing to prevent breaking changes)
- **Distributed tracing** (track requests across services)

### **Key Trade-offs**

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| **Deployment** | Single deployment (simple) ✅ | Multiple deployments (complex) ❌ |
| **Team autonomy** | Low (coordinated releases) ❌ | High (independent teams) ✅ |
| **Scalability** | Scale entire app (wasteful) ❌ | Scale per service (efficient) ✅ |
| **Complexity** | Low (single codebase) ✅ | High (distributed system) ❌ |
| **Fault isolation** | None (one bug crashes all) ❌ | High (isolated failures) ✅ |
| **Data consistency** | ACID transactions ✅ | Eventual consistency (Saga) ❌ |

### **Remember These Numbers**

```
Team size thresholds:
- < 10 developers: Monolith sufficient
- 10-20 developers: Consider modular monolith
- 20-50 developers: Start decomposing
- > 50 developers: Microservices strongly recommended

Service sizing (100K DAU e-commerce):
- User Service: 2 instances (low traffic)
- Product Service: 5 instances (high traffic, browsing)
- Order Service: 2 instances (low traffic, critical)
- Payment Service: 3 instances (redundancy, not traffic)
Total: 14 instances (vs monolith 3-5)

Strangler Fig phases:
- Week 1: 10% traffic to new service
- Week 2: 25% (if no errors)
- Week 3: 50%
- Week 4: 100%
- Week 5: Retire monolith code

Real-world:
- Amazon: 10,000+ services (2001 mandate led to AWS)
- Uber: 2200+ services (28M trips/day, 5M drivers)
- Airbnb: 1000+ services (deploy 500x/day)
```

### **Production Wisdom**

✅ **Start with monolith** (decompose when pain justifies complexity)  
✅ **Decompose by business capability** (map services to business functions)  
✅ **Use DDD for complex domains** (identify bounded contexts, core vs supporting domains)  
✅ **Strangler Fig Pattern** (gradual migration: 10% → 100%, not big-bang)  
✅ **Database per service** (no foreign keys across services)  
✅ **Anti-Corruption Layer** (protect from upstream changes)  
✅ **API contracts** (versioning /v1/products and /v2/products, contract testing)  
✅ **Validate referentially** in code (call User Service to check user exists)  
✅ **Distributed tracing** (Jaeger, Zipkin for request tracking)  
✅ **Centralized logging** (ELK stack for debugging across services)  

❌ **Don't decompose prematurely** (team < 10, simple CRUD)  
❌ **Don't big-bang rewrite** (use Strangler Fig, incremental migration)  
❌ **Don't share databases** (defeats purpose of service independence)  
❌ **Don't skip monitoring** (distributed systems hard to debug without tracing)  
❌ **Don't ignore team structure** (Conway's Law: system mirrors org structure)  
❌ **Don't decompose without clear boundaries** (unclear domains lead to chaos)  

---

**Final thought for interviews:**

> "Service Decomposition breaks monoliths into microservices using three strategies: **By Business Capability** (User Service, Product Service, Order Service—each maps to business function), **By Subdomain using DDD** (identify bounded contexts: Order Management is core domain with complex logic, Notifications is generic domain using third-party), and **By Team using Conway's Law** (mobile team owns Mobile BFF, payments team owns Payment Service). Key pattern: **Strangler Fig** (incremental migration: route 10% traffic to new Order Service → monitor → increase to 100% → retire monolith code, not big-bang rewrite). Decompose when team > 20-50 developers (coordination bottleneck), deploy > 10x/day (monolith deployment too slow), or different scaling needs (search needs 10x instances of payments). Database per service (no foreign keys across services), validate referential integrity in code (call User Service to check user exists), API contracts (versioning, contract testing), Anti-Corruption Layer (protect from upstream changes). Real-world: Amazon (2001 Bezos mandate → 10K+ services → led to AWS), Uber (monolith 2012 → 2200+ services 2018), Airbnb (Monorail 2014 → 1000+ services, deploy 500x/day). In production: start with monolith, decompose when pain justifies complexity, Strangler Fig Pattern (gradual), database per service, distributed tracing (Jaeger), centralized logging (ELK), API versioning, team autonomy (teams own services end-to-end)."
