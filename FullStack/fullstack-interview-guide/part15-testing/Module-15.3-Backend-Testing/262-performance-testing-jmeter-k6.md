# Performance Testing — JMeter, k6, and Load Testing Strategy
> Part 15 — Testing Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Types of performance tests**: load test (expected peak load — does it work?), stress test (above peak — where does it break?), soak/endurance test (sustained load over hours — any memory leaks?), spike test (sudden 10x traffic surge — how does it recover?); each answers a different question
- **JMeter**: Java-based, GUI + headless CLI; plans (`.jmx` files) define thread groups (virtual users), samplers (HTTP requests), listeners (metrics collectors); mature, widely used in enterprise; XML-based `.jmx` files can be version-controlled and run in CI with `jmeter -n -t test.jmx`
- **k6**: modern alternative to JMeter; write test scripts in JavaScript; runs from CLI with `k6 run script.js`; cleaner output, native CI/CD integration, cloud execution via k6 Cloud; preferred for API-focused microservice load testing
- **Key metrics**: **throughput** (requests/second — how much load the system handles), **response time** (P50, P90, P95, P99 — percentiles are more meaningful than average), **error rate** (% of requests that failed), **concurrency** (number of parallel users)
- **P99 vs average**: an average response time of 200ms can hide a P99 of 5 seconds (1% of users wait 5s); always measure P95/P99 for SLA commitments; "average is a lie" is the performance testing mantra
- **Performance budget in CI**: run a short k6/JMeter smoke load test in CI (10 users, 1 minute) after every deployment to catch regressions before they reach production load

---

## 1. One-Line Definition
Performance testing measures how a system behaves under expected and peak load — finding response time degradation, throughput limits, memory leaks, and breaking points before real traffic exposes them in production.

---

## 2. The Problem It Solves

A feature that passes all unit, integration, and E2E tests can still silently break under load:
- A database query that's fast for 1 user becomes a table scan for 1,000 concurrent users
- A service that works fine in isolation exhausts its connection pool when 100 concurrent threads hit it
- A memory leak that's invisible in unit tests causes OutOfMemoryError after 4 hours of sustained load (soak test)
- An API that responds in 200ms for normal traffic takes 8 seconds for P99 users during flash sales

Performance tests catch these categories of failure before real users experience them.

---

## 3. How It Works Internally

### Load Test Architecture

```
Load Generator (JMeter / k6 machines)
  ↓ simulates N virtual users
  ↓ each virtual user executes a script: browse products → add to cart → checkout

System Under Test
  ↓ receives the load
  ↓ metrics collected from: Application (logs, APM), Database (slow query log), 
    Infrastructure (CPU, memory, network via Prometheus/Grafana)

Metrics collected:
  Throughput:   requests per second (RPS)
  Latency:      P50, P90, P95, P99 response times
  Error rate:   HTTP 4xx/5xx %
  Resource use: CPU %, heap memory, DB connection pool used/waiting
  
The test passes/fails based on:
  - P99 response time < 1000ms (SLA)
  - Error rate < 0.1%
  - Throughput ≥ 100 RPS (minimum capacity requirement)
```

### k6 Execution Model

```
k6 run --vus 50 --duration 5m script.js

  Spins up 50 virtual users (coroutines, not OS threads)
  Each VU runs the script loop continuously for 5 minutes
  
  script.js default function:
    → Makes HTTP requests (real HTTP, not mocked)
    → Checks assertions (k6 "thresholds")
    → Sleeps to simulate think time between actions
    → Repeats until duration ends
  
  Output:
    ✓ http_req_duration P(95) < 500ms (threshold)
    ✓ http_req_failed rate < 0.01 (threshold)
    http_reqs: 15,240 (50.8/s)  ← throughput
    http_req_duration avg=87ms min=23ms med=72ms max=2.1s p(90)=145ms p(95)=234ms p(99)=892ms
```

---

## 4. The Code

### Wrong Way — Performance Testing Anti-Patterns

```javascript
// ❌ WRONG 1: No think time between requests — doesn't simulate real users

export default function () {
    // ❌ VU fires requests as fast as possible — 0ms between requests
    // Real users take 1-10 seconds between page clicks
    // Without think time, this is a DoS simulation, not a load test
    http.get(`${BASE_URL}/api/products`);
    http.get(`${BASE_URL}/api/products/1`);
    http.post(`${BASE_URL}/api/cart/items`, JSON.stringify({ productId: 1, qty: 1 }));
}
```

```javascript
// ❌ WRONG 2: Using average response time as the success metric

// ❌ avg < 200ms looks good but hides P99 = 5s
export const options = {
    thresholds: {
        'http_req_duration': ['avg < 200'],  // WRONG metric
        // Average is misleading: 999 users at 50ms + 1 user at 149,051ms = avg 200ms
    }
};
```

```javascript
// ❌ WRONG 3: Testing against production database directly

// ❌ Load testing against production:
// - Real user data is modified
// - Payment flows may process real charges
// - Production database performance is affected
// - If the system falls over, REAL users are impacted
const BASE_URL = 'https://api.myapp.com';  // NEVER run load tests against production
```

### Right Way — k6 Script for API Load Testing

```javascript
// ✅ RIGHT — k6 script: realistic user journey with think time, thresholds, and lifecycle

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ✅ Custom metrics for business-level KPIs
const checkoutErrorRate = new Rate('checkout_errors');
const cartAddDuration = new Trend('cart_add_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// ✅ Test profile: ramp up, sustain, ramp down
// Simulates realistic traffic pattern instead of instant 100 users
export const options = {
    stages: [
        { duration: '1m', target: 10 },   // ramp up to 10 VUs over 1 minute
        { duration: '3m', target: 50 },   // ramp up to 50 VUs (normal peak)
        { duration: '5m', target: 50 },   // sustain 50 VUs for 5 minutes
        { duration: '2m', target: 100 },  // spike: double to 100 VUs
        { duration: '3m', target: 50 },   // return to normal
        { duration: '1m', target: 0 },    // ramp down
    ],
    
    // ✅ Thresholds: SLA-based pass/fail criteria
    thresholds: {
        // P95 of all requests must be under 500ms
        'http_req_duration': ['p(95) < 500', 'p(99) < 1000'],
        
        // Error rate must be below 0.1%
        'http_req_failed': ['rate < 0.001'],
        
        // Checkout specifically: P99 under 2s (stricter for payment flow)
        'http_req_duration{endpoint:checkout}': ['p(99) < 2000'],
        
        // Custom metric: checkout errors below 0.1%
        'checkout_errors': ['rate < 0.001'],
        
        // Cart add endpoint: P95 under 200ms
        'cart_add_duration': ['p(95) < 200'],
    },
};

// ✅ Shared setup: create test users and products once, shared across all VUs
export function setup() {
    // Create test data via API or directly in test DB before load test starts
    const response = http.post(`${BASE_URL}/api/test/seed`, JSON.stringify({
        users: 100,
        products: 50
    }), { headers: { 'Content-Type': 'application/json',
                     'X-Test-Key': __ENV.TEST_API_KEY } });
    
    check(response, { 'seed data created': (r) => r.status === 200 });
    
    return { users: response.json('users') };  // passed to default function
}

// ✅ Main user journey
export default function (data) {
    const userId = data.users[Math.floor(Math.random() * data.users.length)];
    
    // ── Step 1: Browse product catalog ─────────────────────────────
    const productsRes = http.get(
        `${BASE_URL}/api/products?category=electronics&page=1`,
        { tags: { endpoint: 'product_list' } }
    );
    
    check(productsRes, {
        'product list returns 200': (r) => r.status === 200,
        'products array not empty': (r) => r.json('products').length > 0,
    });
    
    sleep(1.5);  // ✅ Think time: user browses the list for ~1.5 seconds
    
    // ── Step 2: View product detail ─────────────────────────────────
    const products = productsRes.json('products');
    const product = products[Math.floor(Math.random() * products.length)];
    
    const detailRes = http.get(
        `${BASE_URL}/api/products/${product.id}`,
        { tags: { endpoint: 'product_detail' } }
    );
    
    check(detailRes, {
        'product detail returns 200': (r) => r.status === 200,
        'product has stockCount': (r) => r.json('stockCount') !== undefined,
    });
    
    sleep(2);  // ✅ User reads product details for ~2 seconds
    
    // ── Step 3: Add to cart ─────────────────────────────────────────
    const cartStart = new Date();
    
    const cartRes = http.post(
        `${BASE_URL}/api/cart/items`,
        JSON.stringify({ productId: product.id, quantity: 1, userId }),
        { headers: { 'Content-Type': 'application/json',
                     'Authorization': `Bearer ${userId.token}` },
          tags: { endpoint: 'cart_add' } }
    );
    
    // ✅ Record custom metric for cart add latency
    cartAddDuration.add(new Date() - cartStart);
    
    check(cartRes, {
        'cart add returns 200': (r) => r.status === 200 || r.status === 201,
    });
    
    sleep(1);
    
    // ── Step 4: Checkout (20% of users — simulates real conversion rate) ──
    if (Math.random() < 0.2) {
        const checkoutRes = http.post(
            `${BASE_URL}/api/orders`,
            JSON.stringify({
                userId,
                paymentMethod: 'TEST_CARD',
                shippingAddress: { street: '123 MG Road', city: 'Bangalore', pin: '560001' }
            }),
            { headers: { 'Content-Type': 'application/json',
                         'Authorization': `Bearer ${userId.token}` },
              tags: { endpoint: 'checkout' } }
        );
        
        const checkoutOk = check(checkoutRes, {
            'checkout returns 201': (r) => r.status === 201,
            'order confirmed': (r) => r.json('status') === 'CONFIRMED',
        });
        
        // ✅ Record checkout error rate
        checkoutErrorRate.add(!checkoutOk);
        
        sleep(3);  // User reviews confirmation
    }
}

// ✅ Teardown: clean up test data after load test
export function teardown(data) {
    http.del(`${BASE_URL}/api/test/seed`, null, {
        headers: { 'X-Test-Key': __ENV.TEST_API_KEY }
    });
}
```

```xml
<!-- ✅ JMeter test plan snippet (.jmx) — enterprise integration -->
<!-- Thread Group: 50 concurrent users, 5 minute ramp-up, 10 minute run -->
<ThreadGroup>
  <stringProp name="ThreadGroup.num_threads">50</stringProp>
  <stringProp name="ThreadGroup.ramp_time">300</stringProp>
  <stringProp name="ThreadGroup.duration">600</stringProp>
  <boolProp name="ThreadGroup.same_user_on_next_iteration">false</boolProp>
  
  <!-- HTTP Request: Get Products -->
  <HTTPSamplerProxy>
    <stringProp name="HTTPSampler.domain">${__P(host,localhost)}</stringProp>
    <stringProp name="HTTPSampler.port">${__P(port,8080)}</stringProp>
    <stringProp name="HTTPSampler.path">/api/products</stringProp>
    <stringProp name="HTTPSampler.method">GET</stringProp>
  </HTTPSamplerProxy>
  
  <!-- Response Assertion: check 200 status -->
  <ResponseAssertion>
    <stringProp name="Assertion.response_field">ResponseCode</stringProp>
    <stringProp name="Assertion.test_field">200</stringProp>
  </ResponseAssertion>
  
  <!-- Think time -->
  <UniformRandomTimer>
    <stringProp name="ConstantTimer.delay">1000</stringProp>
    <stringProp name="RandomTimer.range">2000</stringProp>
  </UniformRandomTimer>
</ThreadGroup>
```

```yaml
# ✅ CI integration: k6 smoke test on every deployment
# .github/workflows/performance-smoke.yml

name: Performance Smoke Test
on:
  workflow_run:
    workflows: ["Deploy to Staging"]
    types: [completed]

jobs:
  k6-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run k6 smoke test (10 users, 2 minutes)
        uses: grafana/k6-action@v0.3.0
        with:
          filename: performance/smoke.js
          flags: --vus 10 --duration 2m
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          TEST_API_KEY: ${{ secrets.TEST_API_KEY }}
      - name: Upload k6 results
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: k6-results.json
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between load testing, stress testing, and soak testing?"

**Hruday's answer:**
> They test different assumptions about your system's behaviour.
>
> Load testing answers: "does the system meet SLA targets at expected peak load?" You know from business requirements that the peak is 500 concurrent users at Black Friday. You simulate exactly 500 users and verify that P95 response time is under 500ms and error rate is below 0.1%. This is the baseline performance test that runs on every major release.
>
> Stress testing answers: "where does the system break, and how does it break?" You start at 100 users and keep adding until the system degrades — response times spike, error rates climb, services start crashing. You're looking for the breaking point and what fails first: is it the connection pool? The database? The message queue? Knowing the breaking point helps capacity planning and tells you which component to scale first.
>
> Soak testing (endurance testing) answers: "are there memory leaks or resource degradation over time?" You run at normal load for 8-24 hours. Memory leaks show up as gradually increasing heap usage. Database connection pool exhaustion shows up after thousands of transactions. File descriptor leaks show up when the OS limit is hit. These are impossible to catch with short-duration tests.
>
> Spike testing is a fourth type: suddenly double or triple the load and verify the system can absorb the spike and recover gracefully after the spike subsides.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why do you report P95/P99 instead of average response time?"

**Hruday's answer:**
> Average response time is mathematically valid but misleading for user experience.
>
> Scenario: 1,000 users make a request. 990 complete in 50ms. 10 users wait 25 seconds (maybe they hit a slow database shard). The AVERAGE is (990 × 50ms + 10 × 25,000ms) / 1,000 = 299ms. That looks like a 300ms average response time — acceptable. But 1% of your users are waiting 25 seconds. For a checkout flow at a payment company, those 10 users are the ones whose transactions timed out.
>
> P99 (the 99th percentile) for this scenario is 25,000ms — that single number tells you that 1% of users experience terrible performance. You'd immediately investigate why 1% have 500x worse performance than the median.
>
> For SLA commitments: "P95 < 500ms" means "at least 95% of users get a response in under 500ms". This is what Razorpay, Google, and AWS define in their SLAs. "Average < 200ms" is nearly meaningless — you can satisfy this SLA while having 5% of your traffic timing out.
>
> The practical rule: P50 (median) for typical experience, P90/P95 for "most users", P99 for "worst 1% — do we have a tail latency problem?" At SAP, we set SLAs as P95 < 500ms for product APIs and P99 < 2000ms for checkout. Average was tracked but never used for pass/fail.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "JMeter vs k6 — how do you choose?"

**Hruday's answer:**
> Both are capable tools, but they suit different contexts.
>
> JMeter is Java-based with a GUI test plan builder. Its strengths: excellent enterprise support, plugins for every protocol and metric type, familiar to QA teams who use GUI tools. The weaknesses: XML-based `.jmx` files are hard to version-control and code-review, the GUI is heavyweight, memory consumption is high (each virtual user is a Java thread, so 500 VUs uses significant RAM), and integrating into CI requires headless mode with extra scripting.
>
> k6 is script-based (JavaScript). Its strengths: clean Git-friendly `.js` scripts, native CLI designed for CI integration, much lower resource overhead (VUs are coroutines, not threads — 1,000 VUs use modest RAM), built-in metrics output in JSON for CI reporting, and the API is clean and modern. The weaknesses: newer ecosystem with fewer plugins, slightly less enterprise adoption.
>
> My choice: k6 for new projects, API microservice load testing, and CI-integrated performance gates. JMeter when inheriting an existing test suite, when complex GUI-driven test recording is needed, or when the QA team is already invested in JMeter tooling.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Your checkout API has good P50 and P95 latencies but P99 spikes to 8 seconds under load. How do you investigate?"

**Hruday's answer:**
> P99 spikes that are much worse than P95 indicate tail latency — a small percentage of requests hit a pathological condition that normal requests avoid.
>
> First investigation step: correlate the P99 requests in APM (Datadog, Prometheus, or application-level tracing). Filter requests to those in the 99th percentile and look at the trace. Is the spike in the database call? The external payment service call? The serialization layer?
>
> Common causes for checkout P99 spikes: database lock contention (during high concurrency, some threads wait for locks on inventory rows — row-level locking or optimistic locking with retry is the fix), connection pool exhaustion (all `HikariCP` connections are in use; new requests queue, adding 500ms-2s of pool wait time — visible in `hikaricp_pending_threads` metric), slow Kafka produce (when Kafka is under load, the `linger.ms` and producer queue fill up, adding latency — visible in `kafka_producer_record_send_rate`), or GC pauses (full GC stops the JVM — visible in JVM GC metrics as stop-the-world events coinciding with P99 spikes).
>
> For the Razorpay interview context specifically: checkout P99 often spikes from database lock contention on the payment ledger table or connection pool limits. The fix sequence: enable slow query log filtered to > 2s, look at lock wait graphs in Postgres/MySQL, identify the locking query, restructure as select-for-update with a timeout instead of unbounded wait, or switch to optimistic locking for the inventory update.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "I ran a JMeter test with 1000 threads" | "We tested with 1000 concurrent users" | 1000 threads in JMeter is not the same as 1000 concurrent users; each thread fires requests back-to-back without think time; real users take 1-5 seconds between page actions; without think time (sleep between requests), 1000 threads generates 10-50x more load than 1000 real users would; a test with 100 VUs and 2-second think time may be a more realistic simulation of 500 concurrent real users than 1000 threadless threads; always include `sleep()` to simulate user behaviour, and define "concurrent users" by the think time model |
| "Average response time improved after tuning" | "We reduced average latency from 300ms to 150ms" | Average improvements can hide tail latency regressions; it's possible to cut average from 300ms to 150ms by optimizing the common path while a database lock issue (causing P99 spikes) gets worse due to the increased traffic the common path now handles; always report P50, P90, P95, AND P99 before and after performance tuning; at Oracle, we had a "performance improvement" that reduced P50 from 80ms to 40ms while P99 increased from 800ms to 3000ms — the change was net negative for user experience because 1% of orders now timed out |
| "Load testing is only needed before product launches" | "We do a big performance test before Black Friday each year" | Performance testing as a one-time event misses the many small regressions that accumulate over a year; a single poorly-indexed query merged in sprint 5 of 24 might add 20ms to the P99 — unnoticeable alone, but after 10 such regressions the system is 200ms slower at P99; CI-integrated smoke load tests (10 VUs, 2 minutes, run on every deployment) catch regressions at the PR level, when the author is still in context; the annual big test should be complemented by small automated performance gates on every deployment |

---

## 7. Hruday's Real Experience Hook
> "At Oracle, the product export API averaged 120ms response time across all tests. We called it 'fast' and moved on. When we ran our first k6 load test with proper percentile reporting, P99 was 4.2 seconds — 35x the average. Under normal load, 1% of export jobs were timing out at the client's 4-second timeout.
>
> The investigation: the P99 requests were hitting a Postgres sequence lock. The `export_jobs` table used a database sequence for primary keys. Under concurrent load, multiple threads competed for the same sequence page lock. The fix was switching to UUID-based IDs (no sequence lock contention). P99 dropped from 4.2 seconds to 180ms immediately.
>
> The lesson: the problem had existed for 6 months. Without percentile reporting, it was invisible. After this incident, we added a CI performance gate: `p(99) < 500ms` as a pipeline check on every PR that touched the export API."

---

## 8. Scale Evolution

**1,000 users →** k6 smoke test (10 VUs, 2 minutes) on every staging deployment; load test (50 VUs, 10 minutes) before major releases; P95 and P99 tracked manually; no automated CI gates yet.

**100,000 users →** k6 integrated into CI pipeline with automated pass/fail thresholds; Grafana dashboard showing P50/P95/P99 trends over time; separate soak test (100 VUs, 8 hours) run weekly; performance budget alerts in Datadog.

**10 million users →** Continuous load testing in a dedicated performance environment mirroring production; chaos engineering (Chaos Monkey) combined with load tests to test resilience under failure; synthetic production monitoring with k6 Cloud; performance testing for every new feature in the development sprint (shift-left performance testing).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment checkout flow P99 directly impacts UGP (user give up percentage); spike tests for IPL ticket sales / salary day payment surges; every ms of checkout latency translates to conversion impact | P99 SLA for checkout; spike test scenarios; connection pool tuning under load |
| Swiggy / Meesho | Flash sales (Meesho's live events, Swiggy's restaurant peak hours) require spike test confidence; real-time order tracking API under heavy concurrent polling | Spike test with 10x traffic; stress testing to find breaking point; P99 for order status polling |
| Adobe / Microsoft | Document render/export APIs have high variability — large documents are slow; load testing with realistic document size distribution; long-running operations | Soak testing for memory leaks in document processor; percentile-based SLAs for various document sizes |
| SAP Labs | Oracle story: P99 = 4.2s hidden by 120ms average; sequence lock contention; UUID fix brought P99 to 180ms; CI gate added after discovery | Specific before/after numbers; average vs P99 real difference; sequence lock as the root cause |

---

## 10. Related Topics — What to Study Next

- **Topic 263 — Structured Logging with ELK** — performance test results are most valuable when correlated with application logs and traces; slow P99 requests show up as long-duration log entries; structured logging enables filtering by response time to find the slow request context
- **Topic 267 — Prometheus and Grafana** — the primary metrics pipeline for performance monitoring in production; P50/P95/P99 histograms in Prometheus, visualized in Grafana, are the same metrics your k6 tests validate; understanding both enables correlating load test results with production metric trends
- **Topic 245 — Connection Pooling and HikariCP** — the most common source of P99 latency spikes under load is connection pool exhaustion; the Oracle story's root cause was database contention; Topic 245 goes deep on pool sizing, connection timeout configuration, and `pending_threads` monitoring
- **Topic 246 — Caching Strategies** — caching directly reduces database load and improves P99 under high concurrency; performance tests reveal which APIs need caching; understanding the cache miss storm (all VUs simultaneously miss cache after expiration) is critical for avoiding the thundering herd problem

---

*Part 15 · Performance Testing with JMeter and k6 · Full Stack Interview Guide · Hruday D · 2026*
