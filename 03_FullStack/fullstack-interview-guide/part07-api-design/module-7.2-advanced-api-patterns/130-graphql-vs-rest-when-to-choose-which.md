# GraphQL vs REST — When to Choose Which
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **REST** is a resource-based API style: each URL is a resource (`/users/42`, `/orders/99`), and HTTP verbs define the operation. Flexible for most services. Cacheable at every layer. Simple to understand. Gets complex when clients need data from many resources in one screen.
- **GraphQL** is a query language for APIs: the client specifies EXACTLY what fields it needs in a single request. The server returns exactly that — no more, no less. One endpoint (`/graphql`), queries and mutations defined by the client, not the server.
- **Over-fetching** (REST problem): you ask for a user, you get 50 fields — but your mobile screen only shows 3. Wasted bandwidth.
- **Under-fetching** (REST problem): to show an order detail page you need order info + user profile + product details — three separate REST calls. Slow on mobile networks.
- **GraphQL solves both**: one query asks for exactly `{ order { id status user { name } products { name price } } }` — one round trip, no wasted fields.
- **GraphQL adds complexity**: N+1 query problem (must use DataLoader), no HTTP caching by default (everything is POST), introspection can expose your schema to attackers, schema design requires upfront discipline.
- **Choose REST when**: simple CRUD, public API for external developers, file upload/download, streaming, CDN caching is critical, small team without GraphQL expertise.
- **Choose GraphQL when**: multiple clients with different data needs (mobile vs web vs TV app), rapid UI iteration needing flexible data fetching, complex domain with many interconnected types, team already comfortable with it.

---

## 1. One-Line Definition
GraphQL is a query language where clients specify the exact shape of data they need in a single request, eliminating over-fetching and under-fetching that REST's fixed-endpoint-fixed-shape model produces — but at the cost of caching complexity, N+1 query risk, and a steeper learning curve.

---

## 2. The Problem It Solves

### REST's Over-Fetching and Under-Fetching Problem — Made Real

```
SCENARIO: Build the Swiggy order detail screen.
Screen needs: order ID, status, placed time, user's name, restaurant name,
              list of items (name + price), delivery agent's name, estimated arrival.

REST API calls needed:
  1. GET /orders/42
     Returns: { orderId, status, userId, restaurantId, agentId, createdAt,
                estimatedArrival, paymentId, couponCode, deliveryAddress,
                taxAmount, totalAmount, ... }
     ← over-fetching: 20+ fields returned, screen uses only 5

  2. GET /users/USER-88
     Returns full user profile: { name, email, phone, addresses[], loyaltyPoints,
                                  preferences, joinDate, ... }
     ← over-fetching: need only name, get entire profile

  3. GET /restaurants/REST-55
     Returns: { name, address, rating, menu[], openHours, ... }
     ← over-fetching: need only name

  4. GET /delivery/AGENT-12
     Returns: { name, phone, vehicleNo, rating, ... }
     ← over-fetching: need only name

Total: 4 round trips on a mobile network
  India average mobile latency: 80-120ms per request
  4 × 100ms = 400ms just in network time
  Plus processing + rendering: screen appears in 600-800ms

GRAPHQL ALTERNATIVE — same screen, one request:

POST /graphql
{
  order(id: "42") {
    orderId
    status
    createdAt
    estimatedArrival
    user { name }
    restaurant { name }
    deliveryAgent { name }
    items { name price }
  }
}

Response: exactly the 12 fields asked for. Nothing else.
One round trip. 100-150ms total.
Mobile experience: screen appears in half the time.
```

---

## 3. How It Works Internally

### GraphQL Core Concepts

```
1. SCHEMA — the server defines all types and their fields:

type Order {
  orderId: ID!
  status: OrderStatus!
  createdAt: DateTime!
  user: User!            ← Order refers to User type
  restaurant: Restaurant!
  deliveryAgent: DeliveryAgent
  items: [OrderItem!]!
}

type User {
  userId: ID!
  name: String!
  email: String!
  phone: String
}

type Query {
  order(id: ID!): Order      ← root query: fetch one order
  orders(userId: ID!): [Order] ← fetch all orders for a user
}

type Mutation {
  createOrder(input: CreateOrderInput!): Order
  cancelOrder(orderId: ID!): Order
}

2. CLIENT QUERY — client decides what to fetch:

query GetOrderDetail {
  order(id: "42") {
    orderId
    status
    restaurant {
      name          ← Only name, not full restaurant object
    }
    items {
      name
      price
    }
  }
}

3. RESOLVER — server resolves each field:

Server runs the query:
  order(id: "42")    → calls OrderResolver.order(id) → returns Order object
  order.restaurant   → calls RestaurantResolver.restaurant(order) → returns Restaurant
  order.items        → calls OrderItemResolver.items(order) → returns List<OrderItem>

4. RESPONSE — server sends exactly what was asked:

{
  "data": {
    "order": {
      "orderId": "42",
      "status": "DELIVERED",
      "restaurant": { "name": "Pizza Palace" },
      "items": [
        { "name": "Margherita", "price": 299.00 },
        { "name": "Garlic Bread", "price": 99.00 }
      ]
    }
  }
}
```

### The N+1 Problem — GraphQL's Biggest Trap

```
N+1 occurs when loading a list + one nested field per item:

Query:
  { orders { orderId user { name } } }   ← 20 orders, each with user.name

Without DataLoader, the server resolves:
  1 query: SELECT * FROM orders LIMIT 20   ← 1 query for orders
  20 queries: SELECT * FROM users WHERE id = 1   (for order 1's user)
              SELECT * FROM users WHERE id = 2   (for order 2's user)
              ...
              SELECT * FROM users WHERE id = 20  (for order 20's user)
  Total: 21 queries for one GraphQL request.
  21 × 5ms = 105ms just in DB time.

With DataLoader (the standard solution):
  1 query: SELECT * FROM orders LIMIT 20
  1 query: SELECT * FROM users WHERE id IN (1,2,3,...,20)   ← batched
  Total: 2 queries.
  
DataLoader batches all resolver calls for the same type within one tick,
then issues one batch query. N calls → 2 queries regardless of N.
Every production GraphQL server MUST use DataLoader.
```

### GraphQL vs REST — Decision Matrix

```
                   REST         GraphQL
──────────────────────────────────────────────
HTTP Caching       ✅ Native    ❌ Complex
                   GET /x → CDN POST /graphql → no CDN

Multiple Clients   ❌ Custom    ✅ One schema,
with diff needs    endpoints   clients self-serve

Bandwidth          ❌ Over-    ✅ Exactly what
                   fetching    was asked for

N+1 Queries        Avoidable  ⚠️ Default risk,
                   by design  needs DataLoader

File Upload        ✅ Easy     ❌ Clunky
                   multipart   (separate REST endpoint needed)

Real-time          ❌ Separate  ✅ Subscriptions
                   websockets  built into spec

Introspection      N/A         ⚠️ Exposes schema
Security                       (disable in prod if sensitive)

Learning Curve     ✅ Low       ❌ Higher
                   everyone    new mental model,
                   knows HTTP  tooling required

External Public    ✅ Standard  ❌ Unusual for
API                (Stripe etc) third-party devs

Mobile App with    ❌ Pain      ✅ Perfect fit
many screens       BFF needed
```

---

## 4. The Code

### REST — The Over-Fetching Problem

```java
// ❌ REST: returns full Order object regardless of what client needs
@GetMapping("/orders/{orderId}")
public ResponseEntity<OrderDto> getOrder(@PathVariable String orderId) {
    Order order = orderService.findByIdWithAllDetails(orderId);
    // Returns ALL fields — mobile app only needs 5, gets 50
    return ResponseEntity.ok(OrderDto.fromAll(order));
}
```

---

### ✅ GraphQL with Spring Boot (Spring for GraphQL)

```java
// Schema: src/main/resources/graphql/schema.graphqls
// (Spring for GraphQL loads schemas from this location automatically)
```

```graphql
# schema.graphqls
type Order {
    orderId: ID!
    status: String!
    createdAt: String!
    amount: Float!
    user: User!
    restaurant: Restaurant!
    deliveryAgent: DeliveryAgent
    items: [OrderItem!]!
}

type User {
    userId: ID!
    name: String!
    email: String!
}

type Restaurant {
    restaurantId: ID!
    name: String!
    rating: Float!
}

type OrderItem {
    name: String!
    quantity: Int!
    price: Float!
}

type Query {
    order(id: ID!): Order
    ordersByUser(userId: ID!): [Order!]!
}

type Mutation {
    createOrder(userId: ID!, restaurantId: ID!, items: [OrderItemInput!]!): Order!
    cancelOrder(orderId: ID!): Order!
}
```

```java
// GraphQL Controller — resolvers via @QueryMapping and @MutationMapping
@Controller
@RequiredArgsConstructor
public class OrderGraphQLController {

    private final OrderService orderService;
    private final UserDataLoader userDataLoader;  // ✅ DataLoader for N+1 prevention

    @QueryMapping
    public Order order(@Argument String id) {
        return orderService.findById(id)
            .orElseThrow(() -> new GraphQLException("Order not found: " + id));
    }

    @QueryMapping
    public List<Order> ordersByUser(@Argument String userId) {
        return orderService.findByUserId(userId);
    }

    @MutationMapping
    public Order cancelOrder(@Argument String orderId,
                             @AuthenticationPrincipal JwtUserDetails user) {
        return orderService.cancel(orderId, user.getUserId());
    }

    // ✅ SchemaMapping: resolve User field on Order using DataLoader (prevents N+1)
    @SchemaMapping(typeName = "Order", field = "user")
    public CompletableFuture<User> user(Order order, DataLoader<String, User> userLoader) {
        // DataLoader batches all user lookups into one query per request batch
        return userLoader.load(order.getUserId());
    }
}
```

```java
// DataLoader configuration — batches user lookups to prevent N+1
@Configuration
public class DataLoaderConfig {

    @Bean
    public BatchLoaderRegistry batchLoaderRegistry(UserService userService) {
        return registrar -> registrar
            .forTypePair(String.class, User.class).withName("userDataLoader")
            .registerBatchLoader((userIds, env) -> {
                // ✅ All user IDs for the current request batch collected, one DB query
                log.info("Loading {} users in batch", userIds.size());
                List<User> users = userService.findAllByIds(userIds);
                // Return in the same order as input IDs
                Map<String, User> userMap = users.stream()
                    .collect(Collectors.toMap(User::getUserId, u -> u));
                return Mono.just(userIds.stream()
                    .map(id -> userMap.getOrDefault(id, null))
                    .toList());
            });
    }
}
```

### TypeScript React — Apollo Client Query

```typescript
// React component: queries EXACT fields needed — no over-fetching
import { gql, useQuery } from '@apollo/client';

const ORDER_DETAIL_QUERY = gql`
  query GetOrderDetail($orderId: ID!) {
    order(id: $orderId) {
      orderId
      status
      createdAt
      user {
        name        # ← only name, not entire user object
      }
      restaurant {
        name        # ← only name
      }
      items {
        name
        price
      }
    }
  }
`;

const OrderDetailPage: React.FC<{ orderId: string }> = ({ orderId }) => {
  const { data, loading, error } = useQuery(ORDER_DETAIL_QUERY, {
    variables: { orderId }
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  const { order } = data;
  // ✅ Exact fields returned — no wasted bandwidth
  return (
    <div>
      <h2>Order {order.orderId} — {order.status}</h2>
      <p>Customer: {order.user.name}</p>
      <p>Restaurant: {order.restaurant.name}</p>
      {order.items.map(item => (
        <div key={item.name}>{item.name}: ₹{item.price}</div>
      ))}
    </div>
  );
};
```

---

## 5. Interview Questions & Model Answers

### Q1 — Comparison
**Interviewer asks:** "What is the main difference between GraphQL and REST, and when would you choose one over the other?"

**Hruday's answer:**
> The core difference is in who controls the shape of the response. In REST, the server defines what each endpoint returns — GET `/orders/42` always returns the full order object with whatever fields the server decided to include. In GraphQL, the client specifies exactly what fields it needs, and the server returns exactly that.
>
> This difference matters most when you have multiple clients with different needs. A mobile app showing an order summary screen needs 5 fields. A desktop admin dashboard might need 30 fields from the same order plus related user and payment data. In REST, you either create separate endpoints for each client (the Backend for Frontend pattern), or you always return all fields and let clients ignore what they don't need. Both solutions have costs.
>
> With GraphQL, one endpoint serves all clients — each sends the query that matches their needs.
>
> I'd choose REST for: public APIs consumed by external developers who don't know GraphQL, services where HTTP caching is critical (CDN at the edge), file upload or binary data, simple CRUD with well-defined response shapes, and teams without existing GraphQL experience.
>
> I'd choose GraphQL for: multiple internal clients with very different data needs (mobile, web, TV app), fast-moving UI iteration where the data requirements change frequently, and complex domains where many resources are interconnected and clients regularly need data from several types in one request.

---

### Q2 — N+1 Problem
**Interviewer asks:** "What is the N+1 problem in GraphQL, and how do you solve it?"

**Hruday's answer:**
> N+1 is a performance problem caused by the naive way GraphQL resolves nested fields. Imagine a query that fetches 20 orders, each with a related user. The resolver first fetches the 20 orders — 1 query. Then for each order, it resolves the user field by fetching that user — 20 separate queries. Total: 21 queries for what should logically be 2 queries.
>
> At scale this is devastating. 100 orders in a list = 101 queries. If each query is 5ms, that's 505ms just in DB time for what should be a 10ms operation.
>
> DataLoader is the standard solution. Instead of executing a user lookup immediately when the user field is resolved, DataLoader batches all the user lookups that accumulate during one tick of the event loop. Then it fires ONE batched query: `SELECT * FROM users WHERE id IN (1, 2, 3, ..., 20)`. All 20 users retrieved in ONE query.
>
> In Spring for GraphQL, I register a `BatchLoaderRegistry` bean that handles the batch loading logic. The resolver method gets a `DataLoader<String, User>` injected and calls `dataLoader.load(userId)` — returning a `CompletableFuture`. DataLoader handles the batching transparently.
>
> Rule: every GraphQL resolver that loads a related object by ID MUST use DataLoader. Non-negotiable in production.

---

### Q3 — Trade-Offs
**Interviewer asks:** "What are the main drawbacks of GraphQL that might make you reject it?"

**Hruday's answer:**
> Three main ones that come up in production.
>
> First: HTTP caching is broken by design. REST's GET requests are cacheable at CDN level — `GET /products/42` can be served from CloudFront for 3600 seconds. GraphQL uses POST for queries by default — intermediary caches don't cache POST responses. You must implement a query-level caching layer yourself (Apollo Cache, persisted queries), and it won't integrate with CDN edge caching as cleanly.
>
> Second: the N+1 problem. Every team building GraphQL with a relational backend MUST implement DataLoader or equivalent batching. Without it, production performance degrades catastrophically with complex queries. It's a constant source of performance bugs for teams new to GraphQL.
>
> Third: schema introspection exposes your data model. Running a query like `{ __schema { types { name fields { name } } } }` returns your complete schema — every type, every field, every relationship. For an internal API: informative. For a public API accessed by potential attackers: a roadmap. Best practice: disable introspection in production, or restrict it to authenticated requests.
>
> Fourth (bonus): for external public APIs, REST is the expected standard. If I'm building a Razorpay-style API consumed by thousands of third-party developers, they know REST and HTTP. Requiring them to learn GraphQL is a barrier to adoption. For external APIs: REST + OpenAPI documentation is the right choice.

---

### Q4 — Design Scenario
**Interviewer asks:** "Meesho needs a single API serving their Android app, iOS app, and web admin dashboard — all showing different sets of product and order data. Would you use GraphQL or REST?"

**Hruday's answer:**
> GraphQL is a strong fit here. Three clients with significantly different data requirements — this is exactly the use case GraphQL was designed for.
>
> The Android app product card needs: `{ name, image, price, rating, inStock }` — 5 fields.
> The iOS app detail page needs: `{ name, images[], price, rating, description, categories, seller { name rating }, reviews(first: 5) { stars comment } }`.
> The admin dashboard needs the full product + inventory data + seller details + order history.
>
> In REST, I'd either: (a) add three separate endpoints per resource (`/products/42/card`, `/products/42/detail`, `/products/42/admin`) — duplication nightmare as queries grow; or (b) use one endpoint that returns everything and let clients ignore what they don't need — massive bandwidth waste on mobile where data bills matter.
>
> With GraphQL: one schema, one endpoint. Each client writes the query that exactly matches its screen. The server resolves exactly what was asked, nothing more. Mobile apps save bandwidth, admin app gets rich data, and the backend serves all three without separate API surfaces.
>
> The critical implementation rules: DataLoader for all nested resolvers to prevent N+1, persisted queries for production security (clients submit a hash of their query, server looks up the full query — prevents introspection and query injection), and disable schema introspection in the public-facing layer. For the admin dashboard which runs complex expensive queries: rate limit by query complexity score, not just by request count.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "GraphQL replaces REST entirely" | "GraphQL is better than REST, I'd always use it" | "GraphQL solves specific problems. For file uploads, binary streaming, CDN-cached public resources, simple CRUD services, and external public APIs — REST is still the better choice. GraphQL shines for flexible queries from multiple different clients. A payment initiation API (Razorpay) should be REST: clear semantics, HTTP caching on GET endpoints, standard HTTP status codes for error handling, and external developers who know REST. A product catalog API serving mobile + web + admin different views? GraphQL. The answer is always 'it depends on the specific problem' — but you need to know the specific conditions for each choice." |
| "GraphQL has no N+1 problem" | "GraphQL automatically optimises queries" | "GraphQL does NOT automatically optimise queries. The execution model fires one resolver per field per object. Without explicit batching via DataLoader, fetching 20 orders with users executes 21 queries. This is WORSE than the equivalent REST endpoint which would use a JOIN. GraphQL's flexibility comes with an opt-in performance discipline: every resolver that loads related objects by ID needs a DataLoader. Teams that skip DataLoader implementation create ticking time bombs — the service works fine in development with 10 objects, then hits OOM or timeout errors in production with 1000 objects per list." |
| "Use POST for GraphQL queries, that's how it works" | "All GraphQL operations use POST — that's the spec" | "Using POST for queries (read operations that don't change state) breaks HTTP caching. GET requests can be cached by CDN and browser. POST requests cannot. For GraphQL, you CAN use GET for query operations by encoding the query as a URL parameter: `GET /graphql?query={orders{orderId status}}`. This enables CDN caching for read queries. Alternatively: persisted queries — the client sends a hash ID of the pre-registered query, server looks up the full query. This also enables GET requests and is more secure. Production GraphQL at Facebook/Meta uses persisted queries for both caching and security. Pure POST-only GraphQL misses these optimisations." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, our React frontend consumed a complex Oracle ERP backend. Different screens needed very different combinations of data: the order list needed summary fields, the order detail page needed full nested data including document hierarchy, and the audit screen needed historical states. We solved this with the Backend-for-Frontend (BFF) pattern at the time — separate API endpoints tailored to each screen. In hindsight, this is exactly the scenario GraphQL is designed for: multiple screens with different data needs, all talking to the same rich domain model. Understanding GraphQL made me realise the BFF pattern was a manual workaround for what GraphQL solves architecturally."

---

## 8. Scale Evolution

**1,000 users →** GraphQL with Spring for GraphQL. Basic DataLoader for N+1 prevention. Single endpoint. Apollo Client on frontend with in-memory cache.

**100,000 users →** Persisted queries (whitelist of allowed queries — prevents ad-hoc expensive queries). Query depth and complexity limits (max depth 10, max complexity score 100). Query result caching by query hash + variables in Redis (60s TTL for non-user-specific queries). Subscription support via WebSocket for real-time order status.

**10 million users →** Query cost analysis at the API gateway — expensive queries rate-limited separately from cheap queries. Per-field resolver tracing (Apollo Studio or similar) to identify slow resolvers. Read replicas for GraphQL resolvers (writes still go to primary). Schema stitching or federation for separating Order graph, Product graph, User graph across microservices — Apollo Federation or native GraphQL federation. Introspection disabled in public layer, available only to authenticated internal developers.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Public payment APIs for merchants — REST is correct (external developers, clear semantics). Internal dashboards and reporting APIs where multiple screens need different data cuts — GraphQL candidate. | "Would you use GraphQL for Razorpay's public merchant API? Why or why not?" |
| Swiggy / Meesho | Mobile app + web app + partner API + admin dashboard all on same product domain. Multiple clients with different data needs = GraphQL's ideal use case. Millions of product catalog requests need CDN caching — requires persisted queries. | "Design the data fetching layer for Meesho's product catalog serving Android app, iOS app, and web with different screen layouts." |
| Adobe / Microsoft | Creative Cloud API: desktop app, browser extension, mobile app, and third-party partners all querying document and asset data differently. GraphQL adoption at Microsoft (GitHub uses GraphQL v4) familiar context. | "GitHub moved their API from REST v3 to GraphQL v4. What drove that decision and what are the trade-offs they accepted?" |
| SAP Labs (current) | SAP Fiori Elements uses OData (similar to REST with typed query capabilities). SAP UI5 applications often need flexible data fetching similar to what GraphQL enables. Internal SAP tools where multiple UI surfaces consume the same back-end entities. | "How would you modernise an SAP Fiori OData API to better serve multiple UI surfaces with different data requirements?" |

---

## 10. Related Topics — What to Study Next

- **Topic 125 — REST Principles** — the foundational comparison point for GraphQL; understanding where REST's constraints create the over-fetching and under-fetching problems clarifies exactly what problem GraphQL addresses
- **Topic 131 — gRPC** — the third major API paradigm alongside REST and GraphQL; gRPC uses Protocol Buffers for binary serialisation and is designed for high-performance service-to-service communication, not browser-facing APIs
- **Topic 70 — Backend for Frontend (BFF)** — the alternative REST-based solution to the multiple-clients-different-needs problem; BFF creates a thin aggregation layer per client, which GraphQL replaces with a more flexible mechanism
- **Topic 103 — Redis Pub/Sub** — GraphQL subscriptions (real-time push) are often implemented using Redis pub/sub as the broadcast mechanism behind the WebSocket connection layer

---

*Part 7 · GraphQL vs REST — When to Choose Which · Full Stack Interview Guide · Hruday D · 2026*
