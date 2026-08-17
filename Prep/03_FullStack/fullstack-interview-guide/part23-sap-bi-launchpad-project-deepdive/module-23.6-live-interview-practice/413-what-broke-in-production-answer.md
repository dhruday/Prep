# What Broke in Production — Answer
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.6: Live Interview Practice
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why this question gets asked**: interviewers want to see how you handle failure — do you own it, learn from it, prevent it, or do you deflect and blame others?
- **The ideal production incident story has five parts**: what broke, how it was detected, how you diagnosed and resolved it, what the business impact was (duration, users affected), and what process change prevents it from happening again
- **The incident to use**: the Report Export Service outage caused by a memory leak in the async PDF generation worker — under normal load it was fine; at peak business hours with 800 concurrent export requests, the JVM heap ran out; pods crashed; analysts couldn't generate reports for 47 minutes until autoscaling brought new pods up and the memory leak was patched
- **The key details to memorise**: 47 minutes outage · 800 concurrent export requests · JVM heap OOM → pod crash → no graceful degradation · fix was an `ExecutorService` shutdown on `@PreDestroy` · prevention was load testing + JVM heap monitoring alert
- **What shows ownership**: "I deployed the change that caused this" / "I missed the load test scenario" — taking responsibility without excessive self-flagellation, then pivoting exactly to what you built to prevent it
- **The circuit breaker angle**: the outage was contained to the Report Export Service because of Resilience4j — other modules and services continued working; this is a success story inside the failure story

---

## 1. One-Line Definition
The Report Export Service crashed under morning peak load because a thread pool wasn't being shut down between async PDF jobs, causing JVM heap exhaustion and pod crashes — 47 minutes of export unavailability, fully resolved, and followed immediately by load testing and heap monitoring.

---

## 2. The Full Incident Story

```
WHAT BROKE:
  The Report Export Service stopped responding to requests
  Kubernetes health checks failed → pods restarted → requests queued → timeout
  Analysts running PDF exports saw "Export failed. Please try again."
  Duration: 47 minutes from first alert to full service restoration

DETECTION:
  PagerDuty alert at 09:14 AM: Report Export Service health check failing
  Spring Boot Actuator /health endpoint returning 503
  Kubernetes event stream: OOMKilled — Out of Memory Kill
  The JVM heap had exceeded the pod's memory limit (512 MB)

TIMELINE:
  09:00 AM — Business hours start; analysts begin morning export batch
  09:08 AM — Export queue grows; 800 requests queued
  09:11 AM — JVM heap at 485 MB (allotted: 512 MB)
  09:14 AM — OOMKilled; first pod restarts
  09:14 AM — PagerDuty fires
  09:19 AM — I join the incident channel
  09:22 AM — Root cause identified (see below)
  09:31 AM — Fix deployed to staging, verified
  09:41 AM — Fix deployed to production; new pod starts clean
  10:01 AM — All export requests processed; full service restored

ROOT CAUSE:
  The PDF generation code used an ExecutorService to parallelize chart rendering
  within each export job.

  The bug: the ExecutorService was created per request but never shut down.
  @Service
  public class PdfGeneratorService {
    public byte[] generateReport(ReportData data) {
      ExecutorService pool = Executors.newFixedThreadPool(4);
      // ... submit chart rendering tasks ...
      pool.awaitTermination(30, TimeUnit.SECONDS);
      // BUG: pool.shutdown() was never called
      // The thread pool stays alive, holds references, prevents GC
    }
  }

  Under low load: the GC eventually collected idle threads → no visible issue
  Under 800 concurrent requests: 800 × 4 threads = 3,200 live threads
  Each thread holds a stack + references to chart rendering data
  JVM heap fills → OOMKilled

THE FIX:
  @Service
  public class PdfGeneratorService {
    public byte[] generateReport(ReportData data) {
      ExecutorService pool = Executors.newFixedThreadPool(4);
      try {
        // ... tasks ...
        pool.awaitTermination(30, TimeUnit.SECONDS);
        return result;
      } finally {
        pool.shutdown();     // guaranteed to run even on exception
        pool.awaitTermination(5, TimeUnit.SECONDS);
      }
    }
  }
  // Also: moved to a class-level Executors.newWorkStealingPool()
  // shared across requests + @PreDestroy shutdown

BUSINESS IMPACT:
  47 minutes where analysts couldn't generate PDF exports
  Estimated ~400 exports queued and retried automatically after service restored
  10-15 analysts who retried manually during the outage experienced repeated failure
  No data loss — export requests were idempotent and queue-backed
  Post-incident customer communication sent by SAP account team
```

---

## 3. The Failure Containment Story

```
WHAT DIDN'T BREAK (circuit breaker in action):
  Report Service (report browsing) — unaffected
  Dashboard Data Service — unaffected
  Analysts could still view dashboards and browse report metadata
  Only the PDF export feature was unavailable

HOW:
  The Report Service calls Export Service with a Resilience4j circuit breaker:
  @CircuitBreaker(name = "exportService", fallbackMethod = "exportUnavailableFallback")
  public ExportTicket requestExport(String reportId) {
    return exportClient.post(reportId);
  }
  public ExportTicket exportUnavailableFallback(String reportId, Exception ex) {
    return ExportTicket.unavailable(
      "Export service is temporarily unavailable. We'll notify you when it's restored."
    );
  }

  When Export Service pods were crashing:
  - Circuit breaker detected failure rate > 50% (configurable threshold)
  - Circuit opened — no more requests forwarded to Export Service
  - Report Service returned the fallback message immediately
  - No cascading timeout to Report Service's connection pool

  RESULT: the outage was scoped to one feature (PDF export)
  not to the entire platform
  This is the correct failure mode for a microservice system
```

---

## 4. The Prevention — What Changed After

```
1. LOAD TESTING BEFORE PRODUCTION:
   Added k6 load test to the export service CI pipeline:
   - Simulates 800 concurrent export requests for 5 minutes
   - Test tracks JVM heap via Actuator /metrics endpoint
   - If heap > 80% of allocated → test fails → PR blocked

2. JVM HEAP MONITORING + ALERT:
   Prometheus scrapes /actuator/prometheus endpoint
   Alert rule: if jvm_memory_used_bytes/jvm_memory_max_bytes > 0.85 for 2 minutes → PagerDuty
   This fires BEFORE OOMKilled — gives time to scale or investigate

3. CODE REVIEW CHECKLIST ITEM:
   "If you create an ExecutorService, does it have a guaranteed shutdown?"
   Added to PR template for the backend services team

4. JVM TUNING:
   Increased pod memory limit from 512 MB to 1 GB for the Export Service
   Set JVM heap explicitly: -Xmx768m (leaving headroom for off-heap)
   Added -XX:+HeapDumpOnOutOfMemoryError to capture a heap dump if OOM still occurs

POST-INCIDENT RESULT:
   Zero OOM incidents in 14 months after the fix
   Load test catches any similar leak pattern before production
```

---

## 5. The Ownership Moment

```
"I deployed the code that introduced the ExecutorService leak.
It was a performance optimisation I added to parallelise chart rendering
within PDF generation. Under the load I tested with — 50 concurrent
exports in my staging run — the GC collected the thread pools fast enough
that I didn't notice the leak. The morning peak of 800 concurrent
requests was well above my test load.

The lesson I took from this: performance optimisations that introduce
concurrency (thread pools, async executors) require a proportionally
higher load in the test environment. I optimised for the average case;
I should have tested at peak minus margin.

I don't say this to perform self-awareness for the interview. I say it
because the process change — load test at 2× predicted peak before any
performance PR merges — came directly from thinking about what I'd missed.
That's why the check is in the CI pipeline now, not just in my notes."
```

---

## 6. Interview Questions & Model Answers

### Q1 — The Direct Story
**Interviewer asks:** "Tell me about a time something broke in production."

**Hruday's answer:**
> "The Report Export Service went down for 47 minutes during morning peak. Here's what happened: I had added a performance optimisation to parallelise chart rendering in PDF generation — used an ExecutorService per request. Under normal load, GC cleaned up the idle thread pools. At 9 AM with 800 concurrent export requests, 3,200 threads were live simultaneously — the JVM heap ran out, pods crashed. PagerDuty fired. I joined the incident channel at 09:19, identified the root cause by 09:22 — a missing pool.shutdown() in the finally block — deployed the fix at 09:41, full restoration by 10:01. The circuit breaker in Resilience4j contained the failure to the export feature; report browsing and dashboards were unaffected. After the incident, I added a k6 load test to the CI pipeline that simulates 800 concurrent exports and fails the build if JVM heap crosses 85%. That test would have caught the leak before it shipped. Zero OOM incidents in the 14 months since."

---

### Q2 — Follow-Up
**Interviewer asks:** "How did you feel when the incident alert fired and you joined the channel?"

**Hruday's answer:**
> "The first five minutes in the channel are always tunnel vision — I was reading the pod event log, looking for the OOMKilled message, checking the memory metrics graph. I wasn't feeling anything in particular because I was focused. The feeling comes later. Once we confirmed the root cause and the fix was being verified in staging — around 09:35 — I had about 20 minutes waiting for the deployment. That's when it was clear that I had introduced the bug. The optimisation was mine. The test scenario I missed was mine to have caught. I've learned that the right response to that feeling is to be specific about what I missed and specific about what process change closes the gap. Being specific makes the post-incident retrospective useful. 'I should have tested more' is not useful. 'Load test runs at 800 concurrent now, not 50, because 9 AM peak is 800' is useful."

---

## 7. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Externalising blame | "Team D changed something that caused..." | "I deployed the code that introduced the leak" — own the specific contribution |
| Vague impact | "It was down for a bit" | "47 minutes, ~400 exports affected, no data loss" |
| No prevention | "We fixed the bug" | "k6 load test in CI at 800 concurrent; JVM heap alert before OOMKilled; checklist item for ExecutorService shutdown" |
| No circuit breaker mention | Platform-wide outage | "The outage was scoped to PDF export because Resilience4j circuit breaker prevented the Export Service failure from cascading to Report browsing and dashboards" |

---

## 8. Hruday's Real Experience Hook

> "The most useful part of this incident was the heap dump. When I added -XX:+HeapDumpOnOutOfMemoryError to the JVM args after the incident, I was thinking ahead to next time. Six months later, a different service had a slow memory leak — not a crash, just slow growth. The heap dump (triggered manually via jmap on the running pod) showed the leak origin immediately. That tool had paid for itself. Infrastructure investment for debugging — heap dumps, thread dumps, distributed traces — is worth doing before the incident, not after."

---

## 9. Scale Evolution

**8 services, current →** Resilience4j circuit breakers contain failures. k6 load testing in CI. JVM heap monitoring + PagerDuty alert. Heap dump on OOM.

**20 services →** Chaos engineering: periodic scheduled chaos tests (kill a pod, see if the system degrades gracefully). Automated gameday scenarios (scheduled, not surprise). Incident severity classification SLO.

**Enterprise SaaS →** Site Reliability Engineering (SRE) team owns incident response. Error budget and SLO tracking. Automated rollback on health check failure. Synthetic monitoring for user-critical flows.

---

## 10. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment system incidents have direct revenue and regulatory impact; SRE discipline, incident ownership | Incident ownership with numbers; circuit breaker containment; post-incident process change |
| Swiggy / Meesho | Consumer platform: incidents at peak (lunch, dinner) have visible business impact | Peak load testing; graceful degradation; circuit breaker for isolated feature failure |
| Adobe / Microsoft | Enterprise: SLO and SLI tracking; published uptime commitments to customers | Load testing in CI; JVM monitoring; heap dump analysis; structured post-incident review |
| SAP Labs | You caused it, diagnosed it, fixed it, prevented it — owned the full lifecycle | The candidate who doesn't deflect; who can explain the ExecutorService lifecycle; who built the k6 test |

---

*Part 23 · What Broke in Production — Answer · Full Stack Interview Guide · Hruday D · 2026*
