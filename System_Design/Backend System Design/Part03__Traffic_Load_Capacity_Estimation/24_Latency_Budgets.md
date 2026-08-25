# 24. Latency Budgets

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Latency Budgets** are the maximum time allowed for each component in your system to complete its work, ensuring the total response time meets user expectations.

### What It Is
A latency budget breaks down the total allowed response time into allocations for each step:
- **Network latency**: Time for data to travel over the network
- **Service processing**: Time for business logic execution
- **Database queries**: Time to read/write data
- **External API calls**: Time waiting for third-party services

### Why It Exists
Without latency budgets:
- **No accountability**: Teams don't know their performance targets
- **Cascading delays**: One slow service ruins the entire request
- **Poor user experience**: Unpredictable response times
- **Difficult debugging**: Can't identify which component is slow

### The Problem It Solves
Latency budgets help:
- **Set clear expectations** for each team/service
- **Identify bottlenecks** before they impact users
- **Make trade-off decisions** (more features vs. faster response)
- **Plan architecture** (sync vs. async, caching strategies)

### Where and When It's Used
- **System design**: Allocating time across components
- **SLO definition**: Setting service-level objectives
- **Performance testing**: Validating against budgets
- **Incident response**: Identifying slow components

### Its Role in Large-Scale Distributed Systems
At FAANG scale:
- **Google Search**: < 200ms total (across 1000s of servers)
- **Amazon**: Every 100ms latency costs 1% of sales
- **Discord**: < 100ms for message delivery
- **Gaming**: < 50ms for real-time interactions

Latency budgets ensure **predictable performance** across distributed systems.

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Anatomy of a Request

```
┌─────────────────────────────────────────────────────────────────────┐
│              END-TO-END LATENCY BREAKDOWN                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  USER REQUEST JOURNEY:                                               │
│  ─────────────────────                                              │
│                                                                      │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐       │
│  │  User   │────▶│   CDN   │────▶│   LB    │────▶│  API    │       │
│  │ Device  │     │  Edge   │     │         │     │ Gateway │       │
│  └─────────┘     └─────────┘     └─────────┘     └─────────┘       │
│      │              │                │                │             │
│   DNS: 50ms     TLS: 30ms       Route: 1ms      Auth: 10ms         │
│   TCP: 30ms     Cache check      Health         Parse: 2ms         │
│   TLS: 30ms                                     Validate: 5ms      │
│      │                                              │               │
│      │         Total so far: ~158ms                 │               │
│      │                                              ▼               │
│      │         ┌─────────┐     ┌─────────┐     ┌─────────┐        │
│      │         │ Service │────▶│  Cache  │────▶│Database │        │
│      │         │    A    │     │ (Redis) │     │(Primary)│        │
│      │         └─────────┘     └─────────┘     └─────────┘        │
│      │              │              │                │               │
│      │         Logic: 20ms    Hit: 1ms         Query: 10ms        │
│      │                        Miss: 5ms        Network: 2ms        │
│      │                                                             │
│      │         ┌─────────┐     ┌─────────┐                        │
│      │         │ Service │────▶│External │                        │
│      │         │    B    │     │  API    │                        │
│      │         └─────────┘     └─────────┘                        │
│      │              │              │                               │
│      │         Logic: 15ms    Call: 100ms                         │
│      │                                                             │
│      ◀────────────────────────────────────────────────────────────│
│                                                                      │
│  RESPONSE JOURNEY (similar path back)                               │
│                                                                      │
│  ════════════════════════════════════════════════════════════════  │
│  TOTAL LATENCY BREAKDOWN (Example):                                 │
│  ════════════════════════════════════════════════════════════════  │
│                                                                      │
│  │ Component              │ P50   │ P99   │ Budget │ Status       │
│  │────────────────────────│───────│───────│────────│──────────────│
│  │ DNS Resolution         │ 20ms  │ 50ms  │ 50ms   │ ✓ OK         │
│  │ TCP + TLS Handshake    │ 40ms  │ 100ms │ 100ms  │ ✓ OK         │
│  │ CDN/Edge Processing    │ 5ms   │ 30ms  │ 30ms   │ ✓ OK         │
│  │ Load Balancer          │ 1ms   │ 3ms   │ 5ms    │ ✓ OK         │
│  │ API Gateway            │ 15ms  │ 40ms  │ 50ms   │ ✓ OK         │
│  │ Auth Service           │ 10ms  │ 25ms  │ 30ms   │ ✓ OK         │
│  │ Business Logic         │ 20ms  │ 50ms  │ 50ms   │ ✓ OK         │
│  │ Cache Lookup           │ 1ms   │ 5ms   │ 10ms   │ ✓ OK         │
│  │ Database Query         │ 10ms  │ 30ms  │ 40ms   │ ✓ OK         │
│  │ External API (if any)  │ 50ms  │ 200ms │ 200ms  │ ⚠ At limit   │
│  │ Response Serialization │ 5ms   │ 15ms  │ 20ms   │ ✓ OK         │
│  │────────────────────────│───────│───────│────────│──────────────│
│  │ TOTAL                  │ 177ms │ 548ms │ 585ms  │ ✓ OK         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Latency Percentiles

```
┌─────────────────────────────────────────────────────────────────────┐
│              UNDERSTANDING PERCENTILES                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WHY PERCENTILES MATTER:                                             │
│  ───────────────────────                                            │
│  • Average hides outliers (1 slow request in 1000 = same avg)      │
│  • Users experience the WORST latency, not the average             │
│  • P99 affects 1% of requests = 10,000 users at 1M QPS!           │
│                                                                      │
│  PERCENTILE DEFINITIONS:                                             │
│  ───────────────────────                                            │
│                                                                      │
│  • P50 (median): 50% of requests faster than this                  │
│  • P90: 90% faster, 10% slower                                     │
│  • P95: 95% faster, 5% slower                                      │
│  • P99: 99% faster, 1% slower (industry standard)                  │
│  • P99.9: 99.9% faster (for critical paths)                        │
│                                                                      │
│  VISUAL REPRESENTATION:                                              │
│  ──────────────────────                                             │
│                                                                      │
│  Latency Distribution:                                              │
│                                                                      │
│  Requests                                                           │
│  ▲                                                                  │
│  │    ▓▓▓▓▓▓                                                        │
│  │   ▓▓▓▓▓▓▓▓▓                                                      │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓                                                    │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                                 │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░                                    │
│  └──────────────────────────────────────────────────────────▶ Time │
│     │      │         │            │                    │            │
│    P50    P90       P95          P99                  P99.9         │
│    20ms   50ms      80ms         150ms                500ms         │
│                                                                      │
│  THE LONG TAIL PROBLEM:                                              │
│  ──────────────────────                                             │
│                                                                      │
│  At 100,000 QPS:                                                    │
│  • P99 = 150ms affects 1,000 requests/second                       │
│  • P99.9 = 500ms affects 100 requests/second                       │
│  • These "rare" slow requests are constant at scale!               │
│                                                                      │
│  SLO EXAMPLE:                                                        │
│  ────────────                                                       │
│  "99% of requests complete in under 200ms"                         │
│  = P99 latency must be ≤ 200ms                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Latency Budget Allocation

```
┌─────────────────────────────────────────────────────────────────────┐
│              BUDGET ALLOCATION STRATEGIES                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  METHOD 1: TOP-DOWN ALLOCATION                                      │
│  ─────────────────────────────                                      │
│                                                                      │
│  Total budget: 200ms (P99)                                          │
│                                                                      │
│  1. Start with total budget                                        │
│  2. Subtract fixed costs (network, DNS, TLS)                       │
│  3. Divide remaining among services                                │
│  4. Allocate based on criticality                                  │
│                                                                      │
│  Example:                                                           │
│  • Total: 200ms                                                     │
│  • Network (fixed): 50ms                                           │
│  • Remaining: 150ms                                                │
│  • API Gateway: 20ms (13%)                                         │
│  • Auth: 20ms (13%)                                                │
│  • Business Logic: 40ms (27%)                                      │
│  • Database: 30ms (20%)                                            │
│  • Cache: 10ms (7%)                                                │
│  • Serialization: 10ms (7%)                                        │
│  • Buffer: 20ms (13%) ← For unexpected delays                      │
│                                                                      │
│  METHOD 2: BOTTOM-UP MEASUREMENT                                    │
│  ─────────────────────────────                                      │
│                                                                      │
│  1. Measure actual P99 of each component                           │
│  2. Sum up to get total                                            │
│  3. Identify if over budget                                        │
│  4. Set targets based on what's achievable                         │
│                                                                      │
│  Example:                                                           │
│  • Measured: API Gateway 25ms + Auth 30ms + Logic 50ms             │
│             + DB 40ms + Cache 5ms = 150ms                          │
│  • Plus network: 150ms + 60ms = 210ms                              │
│  • Over 200ms budget! Need to optimize DB or Logic                 │
│                                                                      │
│  METHOD 3: PROPORTIONAL ALLOCATION                                  │
│  ──────────────────────────────────                                 │
│                                                                      │
│  Allocate based on typical latency distribution:                   │
│                                                                      │
│  │ Component          │ % of Total │ Budget (200ms) │              │
│  │────────────────────│────────────│────────────────│              │
│  │ Network/Transport  │ 25-35%     │ 50-70ms        │              │
│  │ API Gateway        │ 10-15%     │ 20-30ms        │              │
│  │ Authentication     │ 10-15%     │ 20-30ms        │              │
│  │ Business Logic     │ 20-30%     │ 40-60ms        │              │
│  │ Data Access        │ 15-25%     │ 30-50ms        │              │
│  │ Buffer/Headroom    │ 10-15%     │ 20-30ms        │              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 3️⃣ Common Latency Contributors
## ────────────────────────────────────

### Network Latency

```
┌─────────────────────────────────────────────────────────────────────┐
│              NETWORK LATENCY BREAKDOWN                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. DNS RESOLUTION                                                   │
│  ─────────────────                                                  │
│  Cold: 50-100ms (recursive lookup)                                 │
│  Cached: 0ms (OS/browser cache)                                    │
│  Mitigation: Long TTLs, DNS prefetching                           │
│                                                                      │
│  2. TCP HANDSHAKE                                                    │
│  ─────────────────                                                  │
│  1 RTT (Round Trip Time)                                           │
│  Same region: 1-5ms                                                │
│  Cross-region: 50-150ms                                            │
│  Cross-continent: 100-300ms                                        │
│                                                                      │
│  ┌─────────┐         ┌─────────┐                                   │
│  │ Client  │         │ Server  │                                   │
│  └────┬────┘         └────┬────┘                                   │
│       │    SYN ──────────▶│                                        │
│       │◀────────── SYN-ACK│        1 RTT                           │
│       │    ACK ──────────▶│                                        │
│       │                   │                                        │
│                                                                      │
│  3. TLS HANDSHAKE                                                    │
│  ─────────────────                                                  │
│  TLS 1.2: 2 RTTs (100-300ms cross-region)                         │
│  TLS 1.3: 1 RTT (50-150ms cross-region)                           │
│  Resumed: 0 RTT (session tickets)                                  │
│                                                                      │
│  TLS 1.3 (1-RTT):                                                  │
│  ┌─────────┐         ┌─────────┐                                   │
│  │ Client  │         │ Server  │                                   │
│  └────┬────┘         └────┬────┘                                   │
│       │ ClientHello ─────▶│                                        │
│       │◀───── ServerHello │        1 RTT                           │
│       │        + Cert     │                                        │
│       │        + Data     │                                        │
│       │ Finished ────────▶│                                        │
│       │ + App Data        │                                        │
│                                                                      │
│  4. DATA TRANSFER                                                    │
│  ─────────────────                                                  │
│  Speed of light: ~200,000 km/s in fiber                           │
│  • Same city: 1-5ms                                                │
│  • Same region: 5-20ms                                             │
│  • US East to West: 40-80ms                                        │
│  • US to Europe: 70-120ms                                          │
│  • US to Asia: 150-300ms                                           │
│                                                                      │
│  TYPICAL RTT BY DISTANCE:                                            │
│  ─────────────────────────                                          │
│  │ Distance       │ RTT        │ Example                │          │
│  │────────────────│────────────│───────────────────────│          │
│  │ Same rack      │ 0.1-0.5ms  │ Server to DB          │          │
│  │ Same DC        │ 0.5-2ms    │ Microservices         │          │
│  │ Same region    │ 2-10ms     │ us-east-1a to 1b      │          │
│  │ Cross-region   │ 20-60ms    │ us-east to us-west    │          │
│  │ Cross-continent│ 100-200ms  │ US to Europe          │          │
│  │ Global         │ 200-400ms  │ US to Australia       │          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Database Latency

```
┌─────────────────────────────────────────────────────────────────────┐
│              DATABASE LATENCY FACTORS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TYPICAL DATABASE LATENCIES:                                         │
│  ────────────────────────────                                       │
│                                                                      │
│  │ Operation              │ Local SSD │ Network │ Cross-AZ │       │
│  │────────────────────────│───────────│─────────│──────────│       │
│  │ Single row by PK       │ 0.5ms     │ 1-2ms   │ 3-5ms    │       │
│  │ Index scan (100 rows)  │ 1-2ms     │ 3-5ms   │ 5-10ms   │       │
│  │ Table scan (1K rows)   │ 5-10ms    │ 10-20ms │ 20-40ms  │       │
│  │ Complex join           │ 10-50ms   │ 20-100ms│ 50-200ms │       │
│  │ Write (with WAL)       │ 1-5ms     │ 5-10ms  │ 10-20ms  │       │
│  │ Transaction commit     │ 1-2ms     │ 2-5ms   │ 5-10ms   │       │
│                                                                      │
│  LATENCY BREAKDOWN FOR A QUERY:                                      │
│  ──────────────────────────────                                     │
│                                                                      │
│  Total query time: 15ms                                             │
│  ├── Connection overhead: 0.5ms (pooled) or 20ms (new)             │
│  ├── Query parsing: 0.1ms                                          │
│  ├── Query planning: 0.5ms                                          │
│  ├── Index lookup: 1ms                                             │
│  ├── Data fetch from disk: 5ms (or 0.1ms from buffer cache)       │
│  ├── Row processing: 2ms                                           │
│  ├── Result serialization: 1ms                                     │
│  ├── Network to app: 2ms                                           │
│  └── App deserialization: 0.5ms                                    │
│                                                                      │
│  OPTIMIZATION STRATEGIES:                                            │
│  ─────────────────────────                                          │
│                                                                      │
│  1. Connection pooling: Avoid 20ms connection overhead            │
│  2. Prepared statements: Avoid 0.5ms parse/plan per query         │
│  3. Proper indexes: Reduce data fetch from 5ms to 0.1ms           │
│  4. Read replicas: Reduce cross-AZ latency for reads              │
│  5. Caching: Bypass database entirely (0.5ms vs 15ms)             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### External API Latency

```
┌─────────────────────────────────────────────────────────────────────┐
│              EXTERNAL API LATENCY MANAGEMENT                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  THE CHALLENGE:                                                      │
│  ───────────────                                                    │
│  • External APIs are outside your control                          │
│  • Latency can vary wildly (50ms to 5000ms)                        │
│  • Can become your biggest bottleneck                              │
│                                                                      │
│  STRATEGIES:                                                         │
│  ───────────                                                        │
│                                                                      │
│  1. TIMEOUT AGGRESSIVELY                                            │
│  ────────────────────────                                           │
│  Set timeout = your budget, not their SLA                          │
│                                                                      │
│  // Bad: No timeout                                                 │
│  response = http.get("https://api.external.com/data")              │
│                                                                      │
│  // Good: Strict timeout                                            │
│  response = http.get("https://api.external.com/data",              │
│                       timeout=150)  // 150ms budget                │
│                                                                      │
│  2. PARALLEL REQUESTS                                                │
│  ─────────────────────                                              │
│  Don't wait for A before calling B                                 │
│                                                                      │
│  // Bad: Sequential (150ms + 150ms = 300ms)                        │
│  result_a = api_a.call()                                           │
│  result_b = api_b.call()                                           │
│                                                                      │
│  // Good: Parallel (max(150ms, 150ms) = 150ms)                     │
│  result_a, result_b = await Promise.all([                          │
│      api_a.call(),                                                  │
│      api_b.call()                                                   │
│  ])                                                                 │
│                                                                      │
│  3. CIRCUIT BREAKER                                                  │
│  ───────────────────                                                │
│  Stop calling failing APIs                                          │
│                                                                      │
│  if circuit.is_open():                                             │
│      return fallback_response()  // 1ms                            │
│  else:                                                              │
│      try:                                                           │
│          return external_api.call()  // 150ms                      │
│      except Timeout:                                                │
│          circuit.record_failure()                                  │
│          return fallback_response()                                │
│                                                                      │
│  4. CACHING                                                          │
│  ──────────                                                         │
│  Cache external API responses when possible                        │
│                                                                      │
│  cached = cache.get(cache_key)                                     │
│  if cached:                                                         │
│      return cached  // 1ms                                         │
│  else:                                                              │
│      result = external_api.call()  // 150ms                        │
│      cache.set(cache_key, result, ttl=300)                        │
│      return result                                                  │
│                                                                      │
│  5. ASYNC PROCESSING                                                 │
│  ────────────────────                                               │
│  Don't block user request on external calls                        │
│                                                                      │
│  // Return immediately, process later                              │
│  queue.enqueue({user_id, action: "sync_with_external"})            │
│  return {status: "processing"}  // 5ms                             │
│                                                                      │
│  // Background worker handles external call                        │
│  worker.process(job)  // 150ms, but not blocking user             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 4️⃣ Latency Budget Examples
## ────────────────────────────────────

### Example 1: E-commerce Product Page

```
┌─────────────────────────────────────────────────────────────────────┐
│              E-COMMERCE PRODUCT PAGE LATENCY BUDGET                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TARGET: Load product page in < 300ms (P99)                        │
│                                                                      │
│  REQUEST FLOW:                                                       │
│  ─────────────                                                      │
│                                                                      │
│  User ──▶ CDN ──▶ LB ──▶ API ──┬──▶ Product Service                │
│                                 ├──▶ Pricing Service               │
│                                 ├──▶ Inventory Service             │
│                                 ├──▶ Review Service                │
│                                 └──▶ Recommendation Service        │
│                                                                      │
│  LATENCY BUDGET ALLOCATION:                                          │
│  ──────────────────────────                                         │
│                                                                      │
│  │ Component               │ P99 Budget │ Strategy               │ │
│  │─────────────────────────│────────────│────────────────────────│ │
│  │ CDN/Edge                │ 20ms       │ Edge caching           │ │
│  │ Load Balancer           │ 5ms        │ Health checks          │ │
│  │ API Gateway             │ 15ms       │ Auth caching           │ │
│  │ Product Service         │ 30ms       │ DB read replica        │ │
│  │ Pricing Service         │ 20ms       │ Redis cache            │ │
│  │ Inventory Service       │ 20ms       │ Cache with 1min TTL    │ │
│  │ Review Service          │ 30ms       │ Async load, cache      │ │
│  │ Recommendation Service  │ 50ms       │ Pre-computed, cached   │ │
│  │ Response Assembly       │ 10ms       │ Parallel fetch         │ │
│  │ Network (user to CDN)   │ 80ms       │ Global CDN PoPs        │ │
│  │ Buffer                  │ 20ms       │ Headroom               │ │
│  │─────────────────────────│────────────│────────────────────────│ │
│  │ TOTAL                   │ 300ms      │                        │ │
│                                                                      │
│  KEY INSIGHT:                                                        │
│  ─────────────                                                      │
│  5 services @ 30ms each sequentially = 150ms                       │
│  5 services @ 30ms each in parallel = 30ms (+ overhead)            │
│                                                                      │
│  PARALLEL FETCH PATTERN:                                             │
│  ────────────────────────                                           │
│                                                                      │
│  async function getProductPage(productId) {                        │
│      const [product, price, inventory, reviews, recs] =            │
│          await Promise.all([                                        │
│              productService.get(productId),      // 30ms           │
│              pricingService.get(productId),      // 20ms           │
│              inventoryService.check(productId),  // 20ms           │
│              reviewService.getSummary(productId),// 30ms           │
│              recsService.get(productId)          // 50ms           │
│          ]);                                                        │
│      // Total: 50ms (slowest), not 150ms                           │
│  }                                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Example 2: Real-time Chat

```
┌─────────────────────────────────────────────────────────────────────┐
│              REAL-TIME CHAT LATENCY BUDGET                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TARGET: Message delivery in < 100ms (P99)                         │
│                                                                      │
│  MESSAGE FLOW:                                                       │
│  ─────────────                                                      │
│                                                                      │
│  Sender ──▶ WebSocket ──▶ Chat Server ──▶ Message Store            │
│                               │                                     │
│                               ▼                                     │
│  Recipient ◀── WebSocket ◀── Pub/Sub                               │
│                                                                      │
│  LATENCY BUDGET (Sender perspective):                               │
│  ────────────────────────────────────                               │
│                                                                      │
│  │ Component               │ P99 Budget │ Notes                  │ │
│  │─────────────────────────│────────────│────────────────────────│ │
│  │ Client to Server        │ 20ms       │ WebSocket (no TLS      │ │
│  │                         │            │ handshake after init)  │ │
│  │ Message Validation      │ 2ms        │ Simple checks          │ │
│  │ Store to DB             │ 10ms       │ Async write, ack early │ │
│  │ Publish to Pub/Sub      │ 5ms        │ In-memory (Redis)      │ │
│  │ Pub/Sub to Recipient    │ 5ms        │ Same region            │ │
│  │   Server                │            │                        │ │
│  │ Recipient Server to     │ 20ms       │ WebSocket push         │ │
│  │   Client                │            │                        │ │
│  │ Buffer                  │ 38ms       │ Headroom               │ │
│  │─────────────────────────│────────────│────────────────────────│ │
│  │ TOTAL                   │ 100ms      │ End-to-end             │ │
│                                                                      │
│  KEY OPTIMIZATIONS:                                                  │
│  ──────────────────                                                 │
│  1. Persistent WebSocket: No TCP/TLS handshake per message        │
│  2. Async DB write: Acknowledge before persistence                 │
│  3. In-memory pub/sub: Redis < 5ms for pub/sub                    │
│  4. Connection affinity: Recipient on same server cluster         │
│                                                                      │
│  TRADE-OFF:                                                          │
│  ──────────                                                         │
│  Speed vs. Durability: Ack before DB write risks message loss     │
│  Solution: Write-ahead log, retry on failure                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Example 3: Search Query

```
┌─────────────────────────────────────────────────────────────────────┐
│              SEARCH ENGINE LATENCY BUDGET                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TARGET: Search results in < 200ms (P99)                           │
│                                                                      │
│  SEARCH FLOW:                                                        │
│  ────────────                                                       │
│                                                                      │
│  User Query ──▶ API ──▶ Query Parser ──▶ Search Cluster            │
│                              │               (Scatter)             │
│                              │                  │                  │
│                              │          ┌───────┼───────┐          │
│                              │          ▼       ▼       ▼          │
│                              │       Shard1  Shard2  Shard3        │
│                              │          │       │       │          │
│                              │          └───────┼───────┘          │
│                              │                  │ (Gather)         │
│                              │                  ▼                  │
│  User ◀── Ranked Results ◀── Ranker ◀── Merged Results             │
│                                                                      │
│  LATENCY BUDGET:                                                     │
│  ───────────────                                                    │
│                                                                      │
│  │ Component               │ P99 Budget │ Strategy               │ │
│  │─────────────────────────│────────────│────────────────────────│ │
│  │ Network (user to edge)  │ 30ms       │ Global CDN             │ │
│  │ Query Parsing           │ 5ms        │ Simple tokenization    │ │
│  │ Query Understanding     │ 10ms       │ NLP, spell correct     │ │
│  │ Scatter to Shards       │ 5ms        │ Parallel fanout        │ │
│  │ Shard Search (parallel) │ 80ms       │ Index lookup           │ │
│  │ Gather Results          │ 10ms       │ Priority queue merge   │ │
│  │ Ranking/Scoring         │ 20ms       │ ML model inference     │ │
│  │ Result Enrichment       │ 15ms       │ Snippet generation     │ │
│  │ Response Serialization  │ 5ms        │ JSON encoding          │ │
│  │ Network (edge to user)  │ 20ms       │ Compressed response    │ │
│  │─────────────────────────│────────────│────────────────────────│ │
│  │ TOTAL                   │ 200ms      │                        │ │
│                                                                      │
│  SCATTER-GATHER PATTERN:                                             │
│  ────────────────────────                                           │
│                                                                      │
│  Total shards: 100                                                  │
│  Shard search time: 50-80ms each                                   │
│  If sequential: 100 × 50ms = 5000ms (too slow!)                   │
│  If parallel: max(50ms) = 50-80ms (acceptable)                     │
│                                                                      │
│  TAIL LATENCY PROBLEM:                                               │
│  ─────────────────────                                              │
│  With 100 shards in parallel, P99 of total = P99.99 of each shard │
│  (Need 99 of 100 to finish in time)                                │
│                                                                      │
│  Solution: Hedged requests                                         │
│  - Send to 2 replicas, take first response                        │
│  - Or: Timeout slow shards, return partial results                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 5️⃣ Latency Optimization Techniques
## ────────────────────────────────────

### Reducing Latency

```
┌─────────────────────────────────────────────────────────────────────┐
│              LATENCY REDUCTION STRATEGIES                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. CACHING (Biggest impact)                                        │
│  ────────────────────────────                                       │
│  • L1 Cache (in-process): 0.1ms                                    │
│  • L2 Cache (Redis/Memcached): 0.5-2ms                             │
│  • Database: 5-50ms                                                 │
│  • External API: 50-500ms                                          │
│                                                                      │
│  Impact: 10x - 100x latency reduction                              │
│                                                                      │
│  2. PARALLEL PROCESSING                                              │
│  ──────────────────────                                             │
│  Sequential: A + B + C = 30 + 30 + 30 = 90ms                       │
│  Parallel: max(A, B, C) = 30ms                                     │
│                                                                      │
│  Impact: N × reduction for N parallel calls                        │
│                                                                      │
│  3. ASYNC PROCESSING                                                 │
│  ────────────────────                                               │
│  Move non-critical work out of request path                        │
│  • Sync: 100ms (do everything)                                     │
│  • Async: 20ms (queue for later)                                   │
│                                                                      │
│  Impact: 2x - 10x for write-heavy paths                           │
│                                                                      │
│  4. CONNECTION POOLING                                               │
│  ──────────────────────                                             │
│  New connection: 20-50ms (TCP + TLS + auth)                        │
│  Pooled connection: 0.1ms                                          │
│                                                                      │
│  Impact: 20-50ms saved per request                                 │
│                                                                      │
│  5. EDGE COMPUTING                                                   │
│  ──────────────────                                                 │
│  Process at CDN edge, close to user                                │
│  • Origin: 100ms RTT                                               │
│  • Edge: 10ms RTT                                                  │
│                                                                      │
│  Impact: 10x for suitable workloads                                │
│                                                                      │
│  6. PROTOCOL OPTIMIZATION                                            │
│  ─────────────────────────                                          │
│  • HTTP/2: Multiplexing, header compression                        │
│  • HTTP/3 (QUIC): 0-RTT connection establishment                   │
│  • gRPC: Binary protocol, streaming                                │
│                                                                      │
│  Impact: 20-50% reduction in network latency                       │
│                                                                      │
│  7. DATA LOCALITY                                                    │
│  ─────────────────                                                  │
│  Keep data close to compute                                        │
│  • Cross-region query: 100ms                                       │
│  • Same-region query: 10ms                                         │
│  • Same-rack query: 1ms                                            │
│                                                                      │
│  Impact: 10x - 100x for data-heavy operations                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Hedged Requests

```
┌─────────────────────────────────────────────────────────────────────┐
│              HEDGED REQUESTS PATTERN                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PROBLEM:                                                            │
│  ────────                                                           │
│  Tail latency (P99) much higher than median                        │
│  • P50: 10ms                                                        │
│  • P99: 100ms                                                       │
│                                                                      │
│  SOLUTION: Send request to multiple replicas                       │
│  ───────────────────────────────────────────                        │
│                                                                      │
│  STRATEGY 1: Immediate parallel                                    │
│  ─────────────────────────────                                      │
│  Send to 2 replicas simultaneously, take first response            │
│                                                                      │
│  async function hedgedRequest(key) {                               │
│      return Promise.race([                                          │
│          replica1.get(key),                                         │
│          replica2.get(key)                                          │
│      ]);                                                            │
│  }                                                                   │
│                                                                      │
│  Result: P99 becomes ~P50 (but 2x load)                            │
│                                                                      │
│  STRATEGY 2: Delayed hedge                                          │
│  ─────────────────────────                                          │
│  Send second request only if first is slow                         │
│                                                                      │
│  async function delayedHedge(key) {                                │
│      const primary = replica1.get(key);                            │
│                                                                      │
│      // Wait for P50 time before hedging                           │
│      const hedge = new Promise(resolve => {                        │
│          setTimeout(() => {                                         │
│              resolve(replica2.get(key));                           │
│          }, 10);  // P50 = 10ms                                    │
│      });                                                            │
│                                                                      │
│      return Promise.race([primary, hedge]);                        │
│  }                                                                   │
│                                                                      │
│  Result: ~1.1x load increase, significant P99 improvement          │
│                                                                      │
│  WHEN TO USE:                                                        │
│  ────────────                                                       │
│  • Read-only requests (safe to duplicate)                          │
│  • High P99/P50 ratio (> 5x)                                       │
│  • Multiple replicas available                                     │
│  • Extra load is acceptable                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 6️⃣ Monitoring & Alerting
## ────────────────────────────────────

### Latency Monitoring

```
┌─────────────────────────────────────────────────────────────────────┐
│              LATENCY MONITORING SETUP                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  METRICS TO TRACK:                                                   │
│  ─────────────────                                                  │
│                                                                      │
│  1. End-to-end latency (user perspective)                          │
│     • Measured at client or edge                                   │
│     • Includes network, all services                               │
│                                                                      │
│  2. Service latency (each service)                                 │
│     • Time from request received to response sent                  │
│     • Breakdown by endpoint                                        │
│                                                                      │
│  3. Dependency latency (databases, caches, external APIs)          │
│     • Time waiting for each dependency                             │
│     • Timeout rates                                                │
│                                                                      │
│  4. Queue time (if applicable)                                     │
│     • Time request spent waiting before processing                 │
│                                                                      │
│  PERCENTILES TO MEASURE:                                             │
│  ───────────────────────                                            │
│  • P50: Median (typical experience)                                │
│  • P90: Most users                                                 │
│  • P95: Degraded experience threshold                              │
│  • P99: SLO threshold                                              │
│  • P99.9: Worst case (for debugging)                               │
│                                                                      │
│  ALERTING THRESHOLDS:                                                │
│  ─────────────────────                                              │
│                                                                      │
│  │ Level    │ Condition              │ Action              │       │
│  │──────────│────────────────────────│─────────────────────│       │
│  │ Warning  │ P99 > 80% of budget    │ Page on-call, log   │       │
│  │ Critical │ P99 > 100% of budget   │ Page on-call, alert │       │
│  │ Severe   │ P99 > 150% of budget   │ Incident, escalate  │       │
│  │ Outage   │ P50 > 100% of budget   │ Major incident      │       │
│                                                                      │
│  DASHBOARDS:                                                         │
│  ───────────                                                        │
│  • Real-time: P50, P99 for all services (last 5 min)              │
│  • Trends: P99 over time (detect gradual degradation)             │
│  • Breakdown: Latency by endpoint, by dependency                  │
│  • Budget tracker: Current vs. budget by component                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Distributed Tracing

```
┌─────────────────────────────────────────────────────────────────────┐
│              DISTRIBUTED TRACING FOR LATENCY ANALYSIS                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TRACE STRUCTURE:                                                    │
│  ────────────────                                                   │
│                                                                      │
│  Trace ID: abc123                                                   │
│  │                                                                  │
│  ├── Span: API Gateway (0ms - 200ms)                               │
│  │   ├── Span: Auth Service (5ms - 25ms)                          │
│  │   │   └── Span: Cache lookup (7ms - 8ms)                       │
│  │   │                                                              │
│  │   ├── Span: Product Service (30ms - 100ms)                     │
│  │   │   ├── Span: DB query (35ms - 60ms)  ← SLOW!                │
│  │   │   └── Span: Cache set (65ms - 67ms)                        │
│  │   │                                                              │
│  │   └── Span: Response serialization (180ms - 195ms)             │
│  │                                                                  │
│  Total: 200ms (Budget: 300ms ✓)                                    │
│  Slowest: DB query (25ms, 12.5% of total)                          │
│                                                                      │
│  VISUALIZATION:                                                      │
│  ──────────────                                                     │
│                                                                      │
│  0ms        50ms       100ms      150ms      200ms                 │
│  │          │          │          │          │                     │
│  ├──────────────────────────────────────────────┤ API Gateway     │
│  │ ├────┤                                        Auth (20ms)      │
│  │    ├──────────────────────────┤               Product (70ms)   │
│  │       ├─────────────┤                         DB Query (25ms)  │
│  │                               ├────┤          Serialize (15ms) │
│                                                                      │
│  FINDING BOTTLENECKS:                                                │
│  ─────────────────────                                              │
│  1. Sort spans by duration                                         │
│  2. Identify spans over budget                                     │
│  3. Check if parallelization possible                              │
│  4. Look for repeated calls (N+1 problem)                         │
│                                                                      │
│  TOOLS:                                                              │
│  ──────                                                             │
│  • Jaeger                                                           │
│  • Zipkin                                                           │
│  • AWS X-Ray                                                        │
│  • Datadog APM                                                      │
│  • Honeycomb                                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 7️⃣ Interview Answer Framework
## ────────────────────────────────────

### Sample Interview Answer

**Q: "How would you design latency budgets for a payment processing system?"**

> "Payment systems have strict latency requirements due to user expectations and timeout constraints from card networks.
>
> **Target SLO:** Complete payment in < 3 seconds (P99), with < 1 second ideal
>
> **Budget Allocation:**
> 
> | Component | P99 Budget | Notes |
> |-----------|------------|-------|
> | Client to API | 100ms | Mobile networks vary |
> | Authentication | 50ms | Token validation, cached |
> | Fraud Check | 200ms | ML model inference, critical |
> | Payment Gateway (external) | 500ms | Card network round-trip |
> | Database (write transaction) | 100ms | Strong consistency required |
> | Notification (async) | 0ms | Don't block on email/SMS |
> | Response to client | 50ms | Serialization + network |
> | **Total** | **1000ms** | Plus buffer |
>
> **Key Design Decisions:**
> 
> 1. **External payment gateway is the bottleneck** (500ms). Can't optimize, so:
>    - Set aggressive timeout (800ms)
>    - Have fallback gateway
>    - Circuit breaker for failing gateways
>
> 2. **Fraud check in parallel with gateway pre-auth** when possible
>
> 3. **Async notifications**: Email/SMS confirmations don't block the response
>
> 4. **Strong consistency for money**: Can't use eventual consistency for balance updates
>
> 5. **Monitoring**: Alert if fraud check P99 > 150ms (leaving buffer for gateway variance)
>
> **Trade-offs:**
> - Could make fraud check async, but increases fraud risk
> - Could cache gateway responses, but stale data = declined payments"

---

## ────────────────────────────────────
## 8️⃣ Quick Reference Tables
## ────────────────────────────────────

### Latency by Operation

| Operation | Typical Latency | Notes |
|-----------|-----------------|-------|
| L1 cache reference | 0.5 ns | CPU cache |
| L2 cache reference | 7 ns | CPU cache |
| RAM access | 100 ns | Main memory |
| SSD read | 150 μs | NVMe |
| HDD seek | 10 ms | Spinning disk |
| Same datacenter RTT | 0.5 ms | Network |
| Same region RTT | 5-10 ms | Availability zones |
| Cross-region RTT | 50-100 ms | Geographic |
| Cross-continent RTT | 150-300 ms | International |

### Service Latency Targets

| Service Type | P50 Target | P99 Target |
|--------------|------------|------------|
| Cache (Redis) | 0.5 ms | 2 ms |
| Database (indexed) | 2 ms | 10 ms |
| Search engine | 20 ms | 100 ms |
| ML inference | 20 ms | 100 ms |
| External API | 50 ms | 500 ms |
| Video transcoding | 10 s | 60 s |

---

## ────────────────────────────────────
## 9️⃣ Pseudocode: Latency Budget Tracker
## ────────────────────────────────────

```python
from dataclasses import dataclass
from typing import Dict, List, Optional
import time

@dataclass
class LatencyBudget:
    component: str
    budget_ms: float
    p99_target_ms: float

@dataclass
class LatencyMeasurement:
    component: str
    duration_ms: float
    timestamp: float

class LatencyBudgetTracker:
    def __init__(self, total_budget_ms: float):
        self.total_budget_ms = total_budget_ms
        self.budgets: Dict[str, LatencyBudget] = {}
        self.measurements: Dict[str, List[float]] = {}
    
    def set_budget(self, component: str, budget_ms: float, p99_target_ms: float):
        """Set latency budget for a component."""
        self.budgets[component] = LatencyBudget(component, budget_ms, p99_target_ms)
        self.measurements[component] = []
    
    def record(self, component: str, duration_ms: float):
        """Record a latency measurement."""
        if component not in self.measurements:
            self.measurements[component] = []
        self.measurements[component].append(duration_ms)
        
        # Keep only last 1000 measurements
        if len(self.measurements[component]) > 1000:
            self.measurements[component] = self.measurements[component][-1000:]
    
    def get_percentile(self, component: str, percentile: float) -> Optional[float]:
        """Get latency percentile for a component."""
        if component not in self.measurements or not self.measurements[component]:
            return None
        
        sorted_values = sorted(self.measurements[component])
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]
    
    def check_budget(self, component: str) -> dict:
        """Check if component is within budget."""
        if component not in self.budgets:
            return {"status": "unknown", "message": "No budget set"}
        
        budget = self.budgets[component]
        p99 = self.get_percentile(component, 99)
        
        if p99 is None:
            return {"status": "no_data", "message": "No measurements"}
        
        if p99 <= budget.p99_target_ms * 0.8:
            status = "good"
        elif p99 <= budget.p99_target_ms:
            status = "warning"
        else:
            status = "exceeded"
        
        return {
            "status": status,
            "component": component,
            "p99_ms": p99,
            "target_ms": budget.p99_target_ms,
            "budget_ms": budget.budget_ms,
            "utilization": p99 / budget.p99_target_ms * 100
        }
    
    def get_summary(self) -> dict:
        """Get summary of all budgets."""
        summary = {
            "total_budget_ms": self.total_budget_ms,
            "components": [],
            "remaining_budget_ms": self.total_budget_ms
        }
        
        for component in self.budgets:
            check = self.check_budget(component)
            summary["components"].append(check)
            if check.get("p99_ms"):
                summary["remaining_budget_ms"] -= check["p99_ms"]
        
        return summary


class LatencyContext:
    """Context manager for tracking latency of a code block."""
    
    def __init__(self, tracker: LatencyBudgetTracker, component: str):
        self.tracker = tracker
        self.component = component
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.perf_counter()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.perf_counter() - self.start_time) * 1000
        self.tracker.record(self.component, duration_ms)
        return False


# Example usage
tracker = LatencyBudgetTracker(total_budget_ms=300)

# Set budgets for each component
tracker.set_budget("api_gateway", budget_ms=50, p99_target_ms=40)
tracker.set_budget("auth", budget_ms=30, p99_target_ms=25)
tracker.set_budget("database", budget_ms=50, p99_target_ms=40)
tracker.set_budget("cache", budget_ms=10, p99_target_ms=5)
tracker.set_budget("business_logic", budget_ms=80, p99_target_ms=60)
tracker.set_budget("external_api", budget_ms=80, p99_target_ms=100)

# Simulate measurements
import random

for _ in range(100):
    tracker.record("api_gateway", random.gauss(15, 5))
    tracker.record("auth", random.gauss(10, 3))
    tracker.record("database", random.gauss(20, 8))
    tracker.record("cache", random.gauss(1, 0.5))
    tracker.record("business_logic", random.gauss(30, 10))
    tracker.record("external_api", random.gauss(60, 30))

# Check budgets
print("=== LATENCY BUDGET REPORT ===\n")

summary = tracker.get_summary()
print(f"Total Budget: {summary['total_budget_ms']}ms")
print(f"Remaining Budget: {summary['remaining_budget_ms']:.1f}ms\n")

for component in summary["components"]:
    if component.get("p99_ms"):
        status_emoji = {
            "good": "✓",
            "warning": "⚠",
            "exceeded": "✗"
        }.get(component["status"], "?")
        
        print(f"{status_emoji} {component['component']}:")
        print(f"   P99: {component['p99_ms']:.1f}ms / {component['target_ms']}ms "
              f"({component['utilization']:.0f}% utilized)")
```

---

**Next**: `25_Cost_Awareness_Optimization.md` - Designing cost-efficient systems
