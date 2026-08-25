# Chaos Engineering Basics
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Chaos Engineering** is the practice of deliberately injecting failures into a system in a controlled way to find weaknesses before real failures find them in production. It's the answer to: "How do you KNOW your redundancy, circuit breakers, and DR runbooks actually work?"
- **Core principle (from Netflix)**: "The best time to discover that your system doesn't handle failure gracefully is during a scheduled experiment, not during a 2 AM production incident." Planned chaos is survivable. Unexpected chaos is catastrophic.
- **Chaos Monkey** (Netflix, 2011): randomly terminates EC2 instances in production during business hours. Forces engineers to ensure the system continues to function even when instances die unexpectedly. Netflix runs this in production because if it didn't, engineers would eventually write code that accidentally assumed all instances are always available.
- **What to inject**: pod/instance termination, network latency (add 500ms to DB calls), network partition (block traffic between services), CPU spike (starve a pod of CPU), memory pressure (fill RAM to 90%), disk full (fill disk), clock skew (drift system clocks), dependency timeout (make downstream APIs respond slowly).
- **The scientific method**: (1) define steady state (normal metric baselines — p99 latency, error rate); (2) form hypothesis ("if we kill one pod, the service will continue to respond with <5% error rate"); (3) inject the failure; (4) observe actual behaviour; (5) verify hypothesis or fix the discovered weakness. It's an experiment, not a random breakage exercise.
- **Game Day**: a scheduled event where a team deliberately triggers failure scenarios and observes how the system and team respond. Engineers are present, monitoring dashboards, ready to intervene if needed. More controlled than Chaos Monkey. Great for training new team members on failure response.
- **Blast radius control**: always limit the scope of chaos experiments. Start in non-production (staging). When confident, move to production but with limited scope (1 pod, not all pods; 1 AZ, not all AZs). Always have a kill switch — a way to immediately stop the experiment if something goes wrong.

---

## 1. One-Line Definition
Chaos Engineering is the discipline of running controlled experiments that inject real failures into a system to discover and fix weaknesses before uncontrolled production failures do — validating that all resilience mechanisms (circuit breakers, retries, auto-scaling, DR failover) actually work under real failure conditions.

---

## 2. The Problem It Solves

### The "Works in Theory" vs "Fails in Practice" Gap

```
SCENARIO: A team spends 3 months building HA infrastructure.
          They have:
          - 3-pod deployment with PodDisruptionBudget
          - Circuit breakers on all downstream calls
          - Redis Sentinel for cache HA
          - RDS Multi-AZ for database failover
          - Spring Retry for transient DB errors
          
          Does it ACTUALLY work?
          
WITHOUT CHAOS ENGINEERING:
  They only find out the first time a real failure happens.
  
  Real failure #1 — 11:30 AM, Salary Day:
  One RDS pod crashes → Multi-AZ failover triggers
  
  UNEXPECTED: HikariCP connection pool has 20 connections to old primary
               They timeout after 30 seconds each → 30-second flood of 500 errors
               Spring Retry should have handled this — but it wasn't configured
               with the right exception type (they used @Retryable on Exception
               instead of DataAccessException → retry doesn't trigger)
               
  UNEXPECTED: Circuit breaker on Payment Service opened during DB failover
               But it never closed! The 'halfOpenState' metric was 0
               The circuit breaker was misconfigured: halfOpenPermittedCalls=0
               (never tested half-open recovery)
               
  UNEXPECTED: After DB failover, some pods reconnected but two pods had
               cached the old primary IP in a local variable (not via DataSource pool)
               Those pods returned errors for 15 minutes until restarted
               
  These bugs existed for months. They were only discovered at the worst time:
  Salary Day peak traffic, with thousands of users trying to pay.
  
WITH CHAOS ENGINEERING:
  Week 5 of HA buildout: staging chaos experiment — DB failover simulation
  
  Discovered in staging:
  - Spring Retry misconfiguration (@Retryable not on DataAccessException) → FIXED
  - Circuit breaker half-open misconfigured → FIXED
  - Hard-coded IP in PaymentGatewayClient constructor → FIXED
  
  Week 8: production chaos experiment — kill one of 3 pods during low-traffic period
  
  Discovered in production:
  - HPA takes 2 minutes to replace killed pod (longer than expected)
  - During that 2 minutes: remaining 2 pods at 85% CPU (close to limit)
  - Close call — if another pod died during that 2 minutes: would have been saturated
  - Action: reduce HPA targetCPUUtilization to 50% to have more headroom
  
  None of these are discovered on Salary Day. ✅
```

---

## 3. How It Works Internally

### The Chaos Engineering Experiment Framework

```
CHAOS ENGINEERING SCIENTIFIC METHOD:

STEP 1: DEFINE STEADY STATE
  Choose metrics that represent system health under normal conditions.
  Measure them for 1-2 weeks to understand baseline variance.
  
  Example (Order Service):
  - p99 latency: 180ms (±20ms)
  - Error rate: 0.02% (±0.01%)
  - Order creation success rate: 99.98%
  - CPU utilisation: 45% average
  
STEP 2: FORM HYPOTHESIS
  "If we kill one of 3 Order Service pods, the remaining 2 pods
   will handle the load with p99 latency <300ms and error rate <0.1%
   within 60 seconds of pod termination."
   
  (The hypothesis is falsifiable — specific metrics, specific time window)

STEP 3: DESIGN THE EXPERIMENT
  Scope: 1 pod out of 3 (not all pods — controlled blast radius)
  Environment: staging first, then production low-traffic window (2-4 AM)
  Duration: 10 minutes (pod terminated for 10 min; Kubernetes replaces it; observe recovery)
  Kill switch: if error rate exceeds 1%, abort — manually restart the pod
  
  Injected failure: kubectl delete pod order-service-6d459b7c5-xkfl2
  (Kubernetes will replace it automatically via Deployment)
  
STEP 4: RUN THE EXPERIMENT AND OBSERVE
  T=0:00  Pod killed
  T=0:05  Kubernetes detects pod is gone (liveness probe timeout: 5s)
  T=0:05  Service endpoints updated: pod removed from rotation immediately
  T=0:05  Metric observation: p99 jumps from 180ms to 280ms (2 pods handle load)
  T=0:10  Error rate: 0.04% (small spike — retried requests that hit just as pod died)
  T=0:30  Kubernetes schedules replacement pod on another node
  T=1:00  New pod passes readiness probe: added to service endpoints
  T=1:00  p99 drops back to 190ms
  T=1:05  Error rate: 0.02% (back to baseline)
  
  Hypothesis: CONFIRMED ✅
  (p99 <300ms? YES — peaked at 280ms. Error rate <0.1%? YES — peaked at 0.04%)

STEP 5: DOCUMENT AND ITERATE
  Record: experiment type, hypothesis, result, metrics during experiment
  Action (from Salary Day real example above): reduce target CPU utilisation to 50%
           to give more headroom if two pods die simultaneously
  Schedule: repeat quarterly (verify nothing regressed from code or config changes)
```

### Failure Types to Inject and What They Validate

```
FAILURE INJECTION CATALOGUE:

1. POD/INSTANCE TERMINATION
   What: kill a pod abruptly (SIGKILL)
   Tool: kubectl delete pod / AWS FIS action: aws:ec2:terminate-instances
   Validates: live topology handling (pod removed from routing), HPA replacement speed,
              retry logic in callers, PDB enforcement
              
2. NETWORK LATENCY INJECTION
   What: add artificial 500ms-2s delay to network calls from/to a service
   Tool: tc (Linux traffic control) — tc qdisc add dev eth0 root netem delay 500ms
         AWS FIS: aws:ec2:send-spot-instance-interruptions  
         Toxiproxy: proxy that injects latency between services
   Validates: timeout configurations, fallback/cached responses, circuit breaker
              triggers correctly at configured latency threshold
              
3. NETWORK PARTITION
   What: block traffic between two specific services (imitate a network failure)
   Tool: iptables drop rules, Istio fault injection, Toxiproxy disconnect
   Validates: circuit breakers open, bulkhead isolation (blocked service doesn't
              cascade to other services), fallback responses
              
4. CPU SPIKE / CPU HOG
   What: run a CPU-intensive process inside a container to starve other processes
   Tool: stress --cpu 4 (use all 4 cores inside the container)
         AWS FIS: EKS CPU stress actions
   Validates: CPU throttling limits (cgroups), HPA scale-out triggers correctly,
              request queuing behaviour under CPU pressure
              
5. MEMORY PRESSURE / OOM
   What: fill container memory to near-limit to trigger GC pressure or OOM kill
   Tool: stress --vm 1 --vm-bytes 900M
   Validates: JVM GC behaviour under memory pressure (latency spikes), 
              OOM kill behaviour (Kubernetes restarts the pod), 
              whether OOM kills cascade to other services
              
6. DISK FULL
   What: fill the container's ephemeral storage to 100%
   Tool: dd if=/dev/zero of=/tmp/fill.dat bs=1M count=10000
   Validates: whether application log files fill disk and cause failures,
              whether app fails gracefully with disk full vs silently hangs
              
7. DOWNSTREAM DEPENDENCY TIMEOUT
   What: make a downstream service respond very slowly or not at all
   Tool: Toxiproxy timeout setting, WireMock for stub API delays
   Validates: timeout configurations (are they set?), circuit breaker threshold,
              fallback behaviour when external dependency is unavailable
              
8. DNS FAILURE
   What: make DNS lookups for a service name fail
   Validates: DNS caching in clients (do they handle temporary DNS failure gracefully?),
              service discovery resilience
```

### Blast Radius Control

```
CONTROLLING BLAST RADIUS (safety practices):

RULE 1: START IN LOW-TRAFFIC ENVIRONMENTS
  Week 1: staging environment only
  Week 4: production — but only 2-4 AM (lowest traffic)
  Week 8: production — business hours if confidence high + kill switch ready
  
RULE 2: LIMIT THE PERCENTAGE AFFECTED
  NEVER kill all pods simultaneously in an experiment
  Kill 1 of 3 pods (33% loss) — not all 3
  Inject latency on 10% of traffic (canary chaos) — not 100%
  Limit to 1 AZ out of 3 — not all AZs
  
RULE 3: ALWAYS HAVE A KILL SWITCH
  Every experiment must have an abort condition:
    - Error rate exceeds 1%: stop experiment immediately, restore normal state
    - p99 latency exceeds 2000ms for 60 seconds: stop
    - Any SLO breach: stop
    
  Kill switch implementation: the experiment controller watches metrics
  If abort condition triggers: reverse the failure injection
  (reboot killed pod, remove network latency rules, etc.)
  
RULE 4: DON'T RUN MULTIPLE EXPERIMENTS SIMULTANEOUSLY
  Can't diagnose results if two experiments are active
  Wait for one to complete and recover before starting the next
  
RULE 5: INFORM STAKEHOLDERS
  Schedule experiments with on-call SRE team aware
  During business-hours production experiments: support team aware
  "We're running a chaos experiment 2:00-2:30 PM today. If you see 
   brief latency increases, that's expected. Abort if sustained."
```

---

## 4. The Code

### ❌ Wrong Way — Untested Resilience Patterns

```java
// ❌ WRONG: Resilience4j circuit breaker and retry configured but never tested
// Misconfiguration goes undetected until a real production failure

@Service
public class OrderPaymentClient {
    
    // ❌ Circuit breaker configured but with wrong exception types
    //    When DataAccessException occurs (DB failover), it doesn't count toward failure threshold
    //    Because IgnoreExceptions is set to DataAccessException by mistake
    @CircuitBreaker(name = "paymentGateway", fallbackMethod = "fallback")
    @Retry(name = "paymentGateway")
    public PaymentResult processPayment(PaymentRequest request) {
        return paymentGatewayClient.process(request);
    }
    
    // ❌ Fallback: but it's never been tested — does it return a safe response?
    //    In fact, this fallback calls ANOTHER external service (logs to Splunk)
    //    If Splunk is also down: fallback throws exception
    //    Circuit breaker fallback that throws = worse than no fallback
    private PaymentResult fallback(PaymentRequest request, Exception e) {
        splunkLogger.logFailure(request, e);  // ❌ Another network call in fallback!
        throw new RuntimeException("Payment gateway unavailable", e);  // ❌ Rethrows
    }
}
// This code looks correct in code review.
// Without chaos engineering: nobody knows it's broken until production failure.
```

---

### ✅ Right Way — Tested Resilience with Chaos-Validated Behaviour

```java
// ✅ CORRECT: Resilience4j with tested and validated configuration

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderPaymentClient {

    private final WebClient paymentGatewayWebClient;
    private final PaymentFallbackService fallbackService;

    // ✅ Circuit breaker targets the right exceptions
    // ✅ Fallback is simple and pure (no external calls)
    @CircuitBreaker(name = "paymentGateway", fallbackMethod = "paymentFallback")
    @Retry(name = "paymentGateway")
    @TimeLimiter(name = "paymentGateway")  // ✅ Timeout: fail fast if >5s no response
    public CompletableFuture<PaymentResult> processPayment(PaymentRequest request) {
        return paymentGatewayWebClient.post()
            .uri("/api/payments/process")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(PaymentResult.class)
            .toFuture();
    }

    // ✅ Fallback: NO external calls. Log locally. Return safe degraded response.
    private CompletableFuture<PaymentResult> paymentFallback(
            PaymentRequest request, Throwable t) {
        // ✅ Log to local MDC/Logback only (no network call)
        log.warn("Payment gateway unavailable. Queuing for async retry. " +
                 "orderId={}, reason={}", request.getOrderId(), t.getClass().getSimpleName());

        // ✅ Queue for async retry via Kafka (persisted message = no data loss)
        // The payment will be retried when gateway recovers
        // This is a TESTED code path — chaos test simulated gateway being down
        fallbackService.queueForRetry(request);

        // ✅ Return an informative pending response (not an error, not a false success)
        return CompletableFuture.completedFuture(
            PaymentResult.pending(request.getOrderId(),
                "Payment queued. You'll receive confirmation within 5 minutes.")
        );
    }
}
```

```java
// ✅ Chaos test using Spring Boot Test + Toxiproxy
// This is an integration test that validates the circuit breaker actually works

@SpringBootTest
@Testcontainers
@Slf4j
class PaymentClientChaosTest {

    // ✅ Toxiproxy: a programmable network proxy for injecting network failures
    static ToxiproxyContainer toxiproxy = new ToxiproxyContainer("ghcr.io/shopify/toxiproxy:2.5")
        .withNetwork(Network.SHARED);

    @BeforeAll
    static void setupProxy() {
        toxiproxy.start();
    }

    @Test
    @DisplayName("Circuit breaker opens after 5 consecutive gateway timeouts")
    void circuitBreakerOpensOnGatewayTimeout() throws Exception {
        // Arrange: route payment client through Toxiproxy
        ToxiproxyClient toxiClient = new ToxiproxyClient(toxiproxy.getHost(), toxiproxy.getControlPort());
        Proxy proxy = toxiClient.createProxy("payment-gateway",
            "0.0.0.0:8666",
            "payment-gateway-real:8080");

        // ✅ Inject latency: simulate gateway taking 6 seconds (>TimeLimiter timeout of 5s)
        proxy.toxics().latency("latency", ToxicDirection.DOWNSTREAM, 6_000);

        // Act: send 10 requests — first 5 should trigger TimeoutException → circuit opens
        List<PaymentResult> results = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            results.add(orderPaymentClient.processPayment(
                new PaymentRequest("order-" + i, 100.0)
            ).get(10, TimeUnit.SECONDS));
        }

        // Assert: last 5 requests went to fallback (circuit open = no gateway call)
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("paymentGateway");
        assertThat(cb.getState()).isEqualTo(CircuitBreaker.State.OPEN);
        // All 10 returned PaymentResult.pending (fallback response)
        assertThat(results).allMatch(r -> r.getStatus() == PaymentStatus.PENDING);
        // Metric: buffer calls prevented = 5 (circuit blocked 5 calls from reaching gateway)
        assertThat(cb.getMetrics().getNumberOfCallsNotPermitted()).isGreaterThanOrEqualTo(5);

        // ✅ Remove latency toxic — gateway recovers
        proxy.toxics().get("latency").remove();
        Thread.sleep(10_000);  // Wait for circuit breaker half-open window

        // Assert: circuit half-opens → test call succeeds → circuit closes
        orderPaymentClient.processPayment(new PaymentRequest("order-recovery", 100.0)).get();
        assertThat(cb.getState()).isEqualTo(CircuitBreaker.State.CLOSED);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — What Is Chaos Engineering
**Interviewer asks:** "What is chaos engineering and why would you do it in production rather than just staging?"

**Hruday's answer:**
> Chaos engineering is running controlled experiments to inject failures — pod kills, network latency, dependency timeouts — into a system to discover bugs and weaknesses in resilience mechanisms before real failures expose them at the worst time.
>
> The reason production chaos engineering matters, even though it sounds scary, is that staging environments don't accurately reproduce production conditions. Production has real traffic patterns (bursty, uneven), real data volumes, real downstream dependencies, real operator configurations, real monitoring and alerting, and real load. A circuit breaker that is correctly configured in staging may behave differently in production because production has 10x the throughput, different JVM GC pressure, different connection pool sizes, or different downstream service latency profiles.
>
> Netflix ran Chaos Monkey in production specifically because their engineers discovered that tests in staging gave a false sense of confidence. Every time they moved chaos to production, they found new failure modes that staging didn't reveal.
>
> The safety mechanism that makes production chaos acceptable: blast radius control. You never kill all pods — you kill 1 of 10. You inject 500ms latency on 5% of traffic, not 100%. You run it during low-traffic hours initially. You have a kill switch that automatically aborts if error rate crosses 0.5%. You announce the experiment to the SRE team so they're watching dashboards. The goal is: learn from a controlled, bounded failure rather than a surprise, unbounded one.

---

### Q2 — Practical Design
**Interviewer asks:** "How would you set up a chaos experiment for a Kubernetes-deployed Spring Boot microservice?"

**Hruday's answer:**
> I'd follow the five-step chaos experiment process. First, define steady state: set up Prometheus metrics dashboards for the target service. Baseline for one week: p99 latency, error rate, pod count, CPU utilisation. Write down the numbers — p99=180ms, error rate=0.02%.
>
> Second, form a specific hypothesis: "If one of three pods is killed, within 60 seconds, p99 latency will stay below 300ms and error rate will stay below 0.1%."
>
> Third, design the experiment: start in staging, validate the hypothesis there. Then move to production at 2 AM (lowest traffic), kill exactly one pod, observe for 10 minutes. Have a kill switch: if error rate crosses 0.5%, immediately trigger kubectl rollout restart to replace the dead pod.
>
> Fourth, execute: `kubectl delete pod <pod-name>`. Watch the Kubernetes control plane replace it. Watch the load balancer route traffic. Observe all the metrics in real-time on your Grafana dashboard.
>
> Fifth, analyse: did the hypothesis hold? If yes, document it. If no: what happened? Maybe retry wasn't configured — add Spring Retry. Maybe readiness probe is too slow — tune it. Maybe HPA needed to scale up but was too slow — adjust stabilisation window. Then fix the issue and repeat the experiment.
>
> For automating this over time, I'd use AWS Fault Injection Simulator or Chaos Toolkit — these run experiments on a schedule, automatically checking the abort conditions, and report results into the team's incident review system. Quarterly automated chaos experiments catch regressions when new code changes break resilience patterns that were previously working.

---

### Q3 — Advanced Principle
**Interviewer asks:** "What is a GameDay and how is it different from running Chaos Monkey?"

**Hruday's answer:**
> Chaos Monkey is automated chaos: a tool randomly terminates instances continuously (typically during business hours), with no human watching any individual event. It's background noise — your system is expected to handle it silently. The goal is to normalise failure handling so engineers write resilient code as a habit.
>
> A GameDay is a structured event: a specific time is set aside (typically 2-4 hours), engineers from multiple teams gather in front of dashboards (physically or virtually), and a pre-planned set of failure scenarios are executed one by one while everyone observes and discusses the system's behaviour. It's a team exercise as much as a technical one.
>
> The key differences: Chaos Monkey requires no human attention (it's continuous, automated). A GameDay requires dedicated time and is a learning exercise for the humans, not just the system. Chaos Monkey finds random weaknesses. A GameDay tests specific, pre-defined failure scenarios that are relevant to what the team wants to validate (e.g., "what happens during a database failover during peak traffic" — a planned experiment, not random).
>
> When I'd use each: Chaos Monkey (or any automated chaos) is appropriate after a team has built baseline resilience and wants to continuously validate it. GameDay is appropriate when: introducing new team members to incident response, testing a newly built HA feature for the first time, validating a new DR runbook end-to-end with the humans who would execute it in a real disaster, or annual assurance that critical failure modes are still well-handled. GameDay is more theatre — deliberate, educational, collaborative. Chaos Monkey is more discipline — continuous, quiet, relentless.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Chaos engineering means breaking things randomly" | "Chaos Monkey randomly kills services to test resilience" | "Chaos Monkey (and chaos engineering generally) is a scientific process, not random destruction. You define steady state, form a falsifiable hypothesis, design a controlled experiment with limited blast radius, run it, observe the results, and either confirm the hypothesis or identify the gap to fix. 'Random breaking' without the scientific method is just causing outages and hoping to learn something. The Netflix Chaos Monkey has very specific targets, specific times (business hours — because if your system can't handle failures at 2 PM when you're watching, you need to know NOW), and specific abort conditions. The 'randomness' is in WHICH instance is killed, not in whether the system has resilience mechanisms." |
| "Once you set up circuit breakers, you don't need chaos engineering" | "Circuit breakers protect us — we're resilient" | "Circuit breakers are code. Code has bugs. Circuit breaker configuration has bugs. The wrong exception type, wrong threshold count, misconfigured half-open state, incorrect timeout — these bugs are common and subtle. Without chaos engineering, you find them when a real production failure triggers the circuit breaker for the first time. With chaos engineering, you find them in week 3 of development, during a planned experiment, with the responsible engineer at their desk. 'We have circuit breakers' and 'our circuit breakers work correctly' are two different claims. Only tested circuit breakers are reliable circuit breakers." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we ran our first formal chaos experiment ahead of the SAP CFIN year-end close (the most critical business period — 48 hours where all 500 finance users simultaneously generate reports and post journal entries).
>
> We killed one of three CFIN processing service pods during a Saturday afternoon low-traffic window. Expected: the remaining two pods absorb the load, HPA eventually scales back to three. Actual: the remaining two pods both hit circuit-breaker closed state toward the downstream SAP HANA database because the reconnection retry after load redistribution caused a brief spike of simultaneous DB connections. The connection pool had `maxPoolSize=10` per pod — with two pods receiving the traffic that three pods normally handled, each pod tried to open more connections than the pool allowed. We saw 15 seconds of `ConnectionPoolTimeoutException` before the pools stabilised.
>
> Discovery during chaos experiment: the connection pool size was too small. We increased `maxPoolSize` from 10 to 15, added `connectionTimeout: 3000ms` (instead of the default 30 seconds), and re-ran the experiment. Second run: clean. Zero errors during pod kill and recovery.
>
> Without this experiment: we would have discovered the connection pool issue at 9 AM on January 1st when all finance teams started their year-end close simultaneously. Instead, we found it on a low-traffic Saturday."

---

## 8. Scale Evolution

**1,000 users →** Chaos testing in staging only. Pod kill experiments before each major release. Toxiproxy for dependency timeout tests in integration tests. No need for automated production chaos at this scale.

**100,000 users →** Monthly GameDay with the SRE team. AWS Fault Injection Simulator for scheduled production experiments (low-traffic windows). Experiments: pod kill, Redis Sentinel failover, DB failover. Abort conditions automated (CloudWatch alarm → stop experiment). Results documented in incident review.

**10 million users →** Continuous automated chaos (Gremlin or internal tooling): daily pod kills in production test fleet, weekly network latency injections. Chaos Testing as a mandatory gate in CI/CD pipeline (unit-level chaos tests with Resilience4j). Annual full DR drill (simulate region failure). Chaos Catalog: documented library of all previously-run experiments, expected outcomes, and action items completed. SLO dashboard linked to chaos experiment history (demonstrate improvement over time).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment infrastructure: chaos experiments are a regulatory best practice. Fail-mode testing for each circuit breaker in the payment flow. Simulation of bank API slowness (common — PSBs have variable latency). Monthly GameDay covering payment outage scenarios. | "Razorpay's payment gateway starts returning 5s latency for 10% of requests. How do you validate that your circuit breaker configuration correctly handles this before it happens in production?" |
| Swiggy / Meesho | Restaurant availability check failure simulation (what happens if the restaurant API is down during order creation?). Order service pod kill during lunch rush simulation. Delivery partner assignment service failure. Redis cache eviction simulation (what if all cache entries expire simultaneously?). | "Swiggy wants to run a chaos experiment during lunch rush to validate pod resilience. What safety conditions must be in place, and what would you measure?" |
| Adobe / Microsoft | Storage service failure simulation (what happens to an in-progress creative cloud upload?). CDN origin unavailability (what if the origin for all static assets times out?). Microsoft Azure FIS (Fault Injection Simulator) for AKS and VMs. | "Adobe's file storage service goes down mid-upload for a user's Photoshop file. What should happen? How do you chaos-test this scenario?" |
| SAP Labs (current) | Pre-year-end-close chaos test (yearly): CFIN processing pod kill, DB failover during active processing, Redis cache failure. Toxiproxy for SAP HANA latency injection tests. PagerDuty integration for chaos experiment aborts. SAP BTP Kyma supports Litmus Chaos for ChaosExperiment CRDs. | "SAP CFIN year-end close starts in 2 weeks. How would you design a chaos experiment to validate the system's resilience before the most critical business period of the year?" |

---

## 10. Related Topics — What to Study Next

- **Topic 150 — Single Point of Failure** — every chaos experiment should target identified SPOFs; the chaos experiment proves that the SPOF has been correctly eliminated (kill the formerly-SPOF component and verify the system continues operating); SPOF analysis generates the experiment list, chaos engineering validates the mitigations
- **Topic 152 — Disaster Recovery RPO vs RTO** — chaos experiments are the validation mechanism for DR runbooks; a quarterly DR drill is a chaos experiment at the regional scale: "kill the entire primary region and measure how long actual recovery takes, verify it's within the stated RTO, and verify no data was lost (RPO=0)"; without the chaos test, the RPO/RTO targets are aspirational not proven
- **Topic 138 — Circuit Breaker at API Level** — circuit breakers are the most common chaos engineering target; the chaos experiment that validates a circuit breaker involves: injecting failure into the downstream service → verifying the circuit opens → removing the failure → verifying the circuit half-opens → sending passing requests → verifying the circuit closes; Toxiproxy + JUnit integration tests enable this as an automated CI test
- **Topic 154 — SLI, SLO, SLA** — chaos engineering experiments define what "steady state" means (that's the SLI definition) and validate that resilience mechanisms keep the system within SLO bounds during failure; the SLO says "error rate < 0.1%"; the chaos experiment verifies "when one pod dies, does error rate stay below 0.1%?"; SLOs without chaos validation are claims; SLOs with chaos validation are guarantees

---

*Part 8 · Chaos Engineering Basics · Full Stack Interview Guide · Hruday D · 2026*
