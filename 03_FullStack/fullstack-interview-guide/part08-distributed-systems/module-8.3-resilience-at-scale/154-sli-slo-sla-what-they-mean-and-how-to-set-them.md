# SLI, SLO, SLA — What They Mean and How to Set Them 🔥
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **SLI (Service Level Indicator)**: a measured metric that quantifies some aspect of service quality. It is a NUMBER, measured from real production data. Examples: availability = (successful requests) / (total requests) × 100%; p99 latency = the request duration below which 99% of requests complete; error rate = (5xx responses) / (total responses) × 100%.
- **SLO (Service Level Objective)**: an internal target set for an SLI. "Availability SLO: 99.9%." "p99 latency SLO: <300ms." This is what your engineering and product team commit to achieving. It's not a customer contract — it's your internal engineering target that gives buffer before the customer-facing SLA.
- **SLA (Service Level Agreement)**: a formal agreement with customers about the minimum acceptable service level. Usually less strict than the SLO (the buffer is intentional — you want to consistently exceed the SLA to build trust). If the SLA is breached, there are consequences: credits, refunds, or contractual penalties.
- **Error budget = (1 - SLO) × time**. If SLO is 99.9% over 30 days: error budget = 0.1% × 30 days = 43.2 minutes. That's how much unavailability the SLO allows per month. If the error budget is consumed: stop new feature deploys and focus on reliability. If budget is ample: deploy more aggressively.
- **Why SLO < SLA**: the SLO is your internal alarm. If your SLO is 99.9% and SLA is 99.5%, when your availability drops to 99.7% — you're breaching SLO and the team should act. But you're not yet breaching the SLA, so customers aren't get credits. The gap (0.2%) is the buffer. This prevents SLA breaches before they happen.
- **The three questions for setting SLOs**: (1) What does "good" look like from the USER's perspective? (not from monitoring, from the user experience). (2) What can we actually achieve given our current architecture? (3) How does this SLO align with the customer-facing SLA commitment?
- **Real numbers from industry**: Google's SLO book recommends starting at 4 nines (99.99%) only for the most critical services. Most internal services: 99.9% (43 min/month downtime budget). APIs: 99.95%. Public consumer apps: 99.99% if safety-critical.

---

## 1. One-Line Definition
SLI measures actual service quality (a Prometheus metric); SLO is the internal target for that SLI (the team's engineering commitment); SLA is the contractual guarantee to customers (consequences if breached); the error budget is the gap between perfection and the SLO — it explicitly quantifies how much unreliability is acceptable.

---

## 2. The Problem It Solves

### Why "100% Uptime" Goals Are Counter-Productive

```
SCENARIO: Two teams — Team A (no SLO framework) and Team B (SLO framework)
          Both maintain a payment API.

TEAM A (no SLO framework):
  Stated goal: "maximum uptime, minimum errors"
  
  Reality A1: every deployment is a battle
    Engineering wants fast deployment cycles
    Operations blocks every change ("what if it breaks uptime?")
    New features stall for 3 weeks in review
    Business misses competitive features
    
  Reality A2: no way to compare "how good is good enough"
    2 minutes of downtime last Tuesday — is that bad? 
    Nobody knows. No baseline. No budget.
    
  Reality A3: when is the system "reliable enough" to deploy?
    There's no answer. So operations says "never" (risk-averse).
    Engineering says "always" (feature-driven).
    Conflict is unresolvable.

TEAM B (SLO framework):
  Stated goal: "99.9% availability (SLO), 99.5% SLA commitment"
  Error budget: 43.2 minutes per 30-day window
  
  Month 1 deployment: 3 deployments, 12 minutes total downtime
    Used 12 minutes of 43.2 minutes error budget
    Budget remaining: 31.2 minutes
    Status: SAFE — deploy more features this month
    
  Month 2 deployment: 5 deployments, 38 minutes downtime
    Used 38 of 43.2 minutes
    Budget remaining: 5.2 minutes
    Status: CAUTION — only deploy low-risk changes
    
  Month 3: an infrastructure issue on Day 5 consumed 40 minutes of downtime
    Budget remaining: 3.2 minutes for rest of the month
    POLICY: no non-critical deployments until next month's budget resets
    Focus: root cause analysis, reliability improvements
    
  Month 4: new feature + reliability fixes deployed
    Budget healthy again
    
  RESULT:
  Engineering gets fast deployment cycles (clear signal of when it's safe)
  Operations has objective basis for blocking/approving deployments
  Business gets competitive features when reliability is good
  Reliability gets visibility as a first-class metric alongside feature delivery
  
  NOBODY FIGHTS ABOUT "is this uptime acceptable?" anymore.
  The number answers it objectively.
```

---

## 3. How It Works Internally

### Defining Good SLIs

```
SLI DESIGN PRINCIPLES:

1. MEASURE FROM THE USER'S PERSPECTIVE (not the server's)
   
   BAD SLI: "HTTP server is running" (server says it's UP but returns 500s)
             "CPU utilisation < 80%" (high CPU may not mean slow responses)
   
   GOOD SLI: "Proportion of HTTP requests completing with 2xx or 4xx (not 5xx)"
             This is what users care about: did the API respond correctly?
             5xx = server error = the service failed the user
             4xx = user error = the service IS working (responding with error info)
             
   GOOD SLI: "Proportion of requests completing in < 300ms"
             Users feel "instant" at <100ms, "acceptable" at <300ms, "slow" at 1s

2. AVAILABILITY SLI — most common:
   availability = good_requests / total_requests × 100%
   
   Definition of "good request": completed with 2xx or 4xx response code
   (A 404 is a good request — the service correctly told the user the resource doesn't exist)
   Definition of "bad request": 5xx (server error), timeout, network error
   
   Implementation (Prometheus PromQL):
   
   sum(rate(http_requests_total{status!~"5.*"}[5m]))
   / sum(rate(http_requests_total[5m]))
   × 100

3. LATENCY SLI — second most common:
   "What fraction of requests complete within the latency threshold?"
   
   latency_sli = requests_completing_under_300ms / total_requests × 100%
   
   Prometheus PromQL:
   histogram_quantile(0.99, 
     sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
   
   This gives p99 latency — the 99th percentile

4. WHAT NOT TO USE AS SLIs:
   ❌ "Server CPU < 80%" — CPU is an implementation detail, not user experience
   ❌ "Pod restart count = 0" — pods can restart without users ever noticing
   ❌ "Network packet loss < 0.1%" — too low-level; users don't see individual packets
   ❌ "Deployments per day" — a throughput metric, not a quality metric
   
   Always ask: "Does the user directly feel this metric?"
```

### Setting SLOs — The Error Budget Calculation

```
ERROR BUDGET CALCULATION:

SLO = 99.9% availability over 30 days

Error budget = (1 - SLO%) × time period
             = (1 - 0.999) × 30 × 24 × 60 minutes
             = 0.001 × 43,200 minutes
             = 43.2 minutes

Interpretation:
  In any rolling 30-day window, the payment API can be unavailable
  for at most 43.2 minutes without breaching the SLO.
  
  This 43.2 minutes covers:
  - Planned deployments (rolling updates with brief connection resets)
  - Unexpected incidents (database failover, pod crashes)
  - Infrastructure maintenance (Kubernetes node pools upgrades)
  
COMMON SLO TIERS AND THEIR ERROR BUDGETS:

Tier | SLO     | Downtime/month | Downtime/day
-----|---------|----------------|----------------
Four 9s | 99.99% | 4.32 minutes  | 8.6 seconds
Three 9s | 99.9% | 43.2 minutes  | 1.4 minutes  ← Most services
Two 9s | 99%    | 7.2 hours      | 14.4 minutes
One 9  | 90%    | 3 days         | 2.4 hours

SLO SHOULD BE SLIGHTLY TIGHTER THAN SLA:
  If SLA = 99.5% (customer contract), you're paying credits if below
  SLO = 99.9% (internal target — gives 0.4% buffer)
  
  When SLI drops to 99.7%: SLO BREACHED → engineers alerted, error budget depleted
  When SLI drops to 99.4%: SLA BREACHED → customer credits issued, contract at risk
  
  The SLO breach warns you early — before the SLA breach happens.
  Buffer = 0.4% = 2.88 hours/month of additional tolerance before customer impact.
```

### Error Budget Policy — What to Do When Budget Is Low

```
ERROR BUDGET POLICY (codified team agreement):

Budget remaining % | Engineering action
--------------------|-------------------
> 50% remaining     | ✅ Normal deployment velocity. Deploy features freely.
25-50% remaining    | ⚡ Moderate caution. Prefer low-risk deploys.
                    |   Prioritise reliability improvements in current sprint.
10-25% remaining    | ⚠️  High caution. Only critical bug fixes deployed.
                    |   At least 1 engineer dedicated to reliability work.
< 10% remaining     | ❌ Feature freeze. All engineering resources on reliability.
                    |   No feature deployments until budget refreshes.
                    |   Root cause analysis for incidents mandatory.
Budget exhausted    | 🔴 SLO breached. Incident review. Executive escalation.
                    |   Deploy only emergency rollbacks.
                    |   Investigate root cause within 24 hours.
                    
MONTHLY RESET:
  Error budget resets every 30 days (rolling window or calendar month — choose one)
  Teams start fresh each month — no carrying over deficits (avoiding perpetual freeze)
  Historical burn rate tracked to trend reliability improvement over months

TOIL BUDGET:
  Complementary to error budget: "toil" = repetitive manual operational work
  Teams should spend < 50% of time on toil (on-call response, manual processes)
  If toil > 50%: something is wrong — automate or fix the reliability issue
  Toil measurement is a leading indicator of future SLO breaches
```

---

## 4. The Code

### ❌ Wrong Way — Monitoring Infrastructure, Not User Experience

```python
# ❌ WRONG: Alert on infrastructure metrics — doesn't reflect user experience

# alerts/wrong-slo.yml (Prometheus AlertManager rules)
groups:
  - name: wrong-monitoring
    rules:
      - alert: HighCPU
        # ❌ CPU >80% — doesn't mean users are experiencing problems
        # A highly optimised compute job can use 100% CPU while serving users perfectly
        expr: avg(container_cpu_usage_seconds_total) > 0.8
        for: 5m
        labels:
          severity: critical
          
      - alert: PodRestart
        # ❌ Pod restarts ≠ user impact if readiness probe prevents routing during restart
        # Alerting on pod restarts causes alert fatigue without actionable signal
        expr: increase(kube_pod_container_status_restarts_total[1h]) > 0
        
      - alert: DiskUsage
        # ❌ Disk at 70% — not user-impacting, just maintenance signal
        # This should be a WARNING, not an alert that pages someone at 3 AM
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.3
        for: 5m
        labels:
          severity: critical   # ❌ Critical for a maintenance task
          
# These rules cause alert fatigue — 10 alerts at 3 AM, 8 of which are irrelevant
# On-call engineer becomes desensitised. Real alerts get ignored.
```

---

### ✅ Right Way — SLO-Based Monitoring and Alerting

```java
// ✅ Spring Boot: register SLI metrics for Prometheus scraping

@RestControllerAdvice
@RequiredArgsConstructor
public class SloMetricsAdvice {

    private final MeterRegistry meterRegistry;

    // ✅ SLI 1: Availability — count good vs total requests
    @Around("execution(* com.sap.cfin.api.*.*(..)) && @annotation(org.springframework.web.bind.annotation.RequestMapping)")
    public Object trackRequestSuccess(ProceedingJoinPoint pjp) throws Throwable {
        // This is done better via Spring Boot Actuator + Micrometer automatically
        // Just ensure the right tags are present
        return pjp.proceed();
    }
}
```

```yaml
# ✅ CORRECT: Prometheus AlertManager rules based on SLOs, not infrastructure

# SLO: Availability > 99.9% (error budget = 43.2 min/month)
# SLO: p99 latency < 300ms

groups:
  - name: slo-alerts
    rules:
    
      # ✅ AVAILABILITY SLI: percentage of non-5xx responses
      # Alert when error rate makes us consume error budget too fast
      
      # Alert 1: Fast burn rate (page immediately — budget depleted in <2 hours)
      # If error rate is so high that budget exhausted in 1 hour: PAGE NOW
      - alert: HighErrorRateCritical
        # burn rate = (actual error rate) / (1 - SLO target)
        # 14.4x burn rate = consuming 1 hour of budget in 5 minutes → alert
        expr: |
          (
            sum(rate(http_requests_total{job="order-service", status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total{job="order-service"}[5m]))
          ) > 0.0144  # 1.44% error rate = 14.4x burn rate (vs 0.1% SLO budget rate)
        for: 2m
        labels:
          severity: critical
          service: order-service
        annotations:
          summary: "CRITICAL: {{ $labels.service }} burning error budget at 14x rate"
          description: "Error rate {{ $value | humanizePercentage }}. At this rate, monthly budget exhausted in 1 hour."

      # Alert 2: Slow burn rate (warn — consuming budget faster than comfortable)
      - alert: HighErrorRateWarning
        expr: |
          (
            sum(rate(http_requests_total{job="order-service", status=~"5.."}[30m]))
            /
            sum(rate(http_requests_total{job="order-service"}[30m]))
          ) > 0.001  # 0.1% error rate = consuming at exactly the budget rate
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "WARNING: {{ $labels.service }} at SLO budget rate"
          
      # ✅ LATENCY SLI: p99 < 300ms
      - alert: HighP99Latency
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket{
              job="order-service"
            }[5m])) by (le)) > 0.3    # 300ms threshold
        for: 5m
        labels:
          severity: warning
          service: order-service
```

```java
// ✅ Grafana SLO dashboard query (PromQL) — for Hruday's team to review daily

# SLO compliance over the last 30 days:
# "Are we within our error budget this month?"

# Error budget remaining (minutes):
(
  1 -
  (
    sum(rate(http_requests_total{status=~"5.."}[30d]))
    /
    sum(rate(http_requests_total[30d]))
  )
) / (1 - 0.999)   # 0.999 = SLO target (99.9%)
* 43.2             # Total budget in minutes

# If this shows: 35.7 → budget remaining is 35.7 minutes
# Team is safe to continue deploying
# If shows: 4.1 → only 4.1 minutes of budget left → feature freeze
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Definitions
**Interviewer asks:** "Explain SLI, SLO, and SLA with an example from a payment system."

**Hruday's answer:**
> Using Razorpay's payment API as the example.
>
> SLI is what we actually measure. For a payment API, I'd define two SLIs: availability (what percentage of payment requests complete successfully — meaning the API returned a 2xx or 4xx response, not a 5xx or timeout), and latency SLI (what percentage of payment requests complete within 2 seconds). These are Prometheus metrics in real-time.
>
> SLO is the target for each SLI. Razorpay's internal target might be: availability SLO = 99.99% (meaning at most 4.3 minutes of unavailability per month — for a payment system, even 43 minutes is too much). Latency SLO = 95% of requests under 2 seconds. These are commitments the engineering and SRE team make to each other and to the product team. If we're hitting these targets, we have budget to deploy features. If we're not, we freeze feature work and focus on reliability.
>
> SLA is what Razorpay commits to their merchant customers in contracts. The SLA might be: 99.9% availability (weaker than the SLO), measured monthly, credits of 25% of monthly fees if breached. The SLO (99.99%) is tighter than the SLA (99.9%) — this ~0.09% buffer (about 40 minutes per month) means Razorpay can absorb some incidents and still honour the customer contract. If the SLO is breached (99.97%), Razorpay's team knows they're trending toward an SLA breach and takes action before customers are actually impacted.

---

### Q2 — Error Budget Application
**Interviewer asks:** "What is an error budget and how does it change how engineering teams make deployment decisions?"

**Hruday's answer:**
> The error budget is the complement of the SLO — it's the amount of unreliability you've explicitly allowed. If the SLO is 99.9% availability over 30 days: the error budget is 0.1% of 30 days = 43.2 minutes. That's the budget of "being down" that the engineering team and business have decided is acceptable this month.
>
> The error budget changes deployment decisions in a powerful way by creating a shared currency between engineering (who want to ship fast) and operations (who want stability). Instead of a subjective disagreement "this deploy is risky," the conversation becomes objective: "we've consumed 30 of our 43.2 minutes of budget this month. We have 13 minutes left. This deploy has a 10% estimated downtime risk of ~2 minutes based on similar past deploys. That's within budget — proceed."
>
> When the budget is ample: engineering can deploy aggressively, run experiments, take risks. The budget is there to absorb the occasional incident. When the budget is nearly exhausted: both engineering AND operations agree that new deploys should be paused. No negotiation. The number makes the decision. This removes the adversarial relationship between "move fast" and "stay stable" — they're now the same objective, numerically bounded.
>
> The key insight from Google's SRE book: if you're nowhere near exhausting your error budget month after month, your SLO is too conservative (you have excess reliability that nobody asked for and that's slowing down feature development). If you're constantly exhausting it: your reliability investment is insufficient. The error budget is the thermostat that keeps the velocity-reliability balance correct.

---

### Q3 — Setting SLOs
**Interviewer asks:** "How would you determine the right SLO for a new API service?"

**Hruday's answer:**
> Setting an SLO involves answering three questions, in order. First: what does the user experience when the service is good vs degraded? For a search API: users notice results taking >500ms, they see "service unavailable" errors for 5xx. So the SLI candidates are: availability (% non-5xx) and latency (% requests under 500ms). The user experience sets the metric.
>
> Second: what can we actually achieve with our current architecture? SLOs should be achievable targets, not aspirational ones that can never be hit. If your historical 30-day availability is 99.85%, setting the SLO at 99.99% creates permanent red alerts and alert fatigue. Instead, set SLO at 99.9% (slightly better than historical to push for improvement), measure it, invest in the reliability work needed to consistently hit it, and then raise the target. Start from data, not ambition.
>
> Third: what does the customer-facing SLA require, and how much buffer do you need? If the SLA contract says 99.5%: your SLO should be 99.9% to give 0.4% buffer. The buffer should be realistic — if your worst incident ever consumed 1 hour of downtime in a month (0.14%), and SLA is 99.5%, SLO of 99.9% gives adequate buffer for that single bad month.
>
> Practical starting point for a new service: 99.9% availability SLO if it's a customer-facing API that directly impacts revenue. 99.5% if it's internal. Adjust after measuring 3 months of actual performance. Add specific latency SLOs only after you've established the availability SLO and are consistently meeting it — latency SLOs are harder to set correctly without data.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Higher SLO is always better" | "I'd set our SLO at 99.999% — five nines" | "Five nines allows only 26 seconds of downtime per month. Achieving this requires: zero-downtime deployments (zero, not near-zero), active-active multi-region infrastructure, synchronous replication, and significant engineering investment. For most services, five nines is over-engineering. The cost to go from 99.9% to 99.99% is 10x more engineering effort. The cost from 99.99% to 99.999% is 10x more again. Most consumer applications don't require five nines — even Netflix targets 99.99%. Start with 99.9% for most services, 99.99% for payment and auth. Spend the engineering time you save on features that create value rather than reliability margins nobody asked for." |
| "SLA = SLO" | "The SLA is our target" | "SLA and SLO must be different by design. The SLA is the floor — breaching it has contractual consequences (credits, penalties). The SLO is higher — it's the internal target that gives you warning before the SLA breach. If SLO = SLA: the first time you breach your internal target, you've also breached the customer contract simultaneously with no buffer. The gap between SLO and SLA is the 'wobble room' — the engineering margin that lets you handle one bad incident without immediately triggering customer credits. For a payment company, the SLA might be 99.5%; the SLO should be 99.9% to give 0.4% buffer (two hours/month of additional tolerance)." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we introduced SLO tracking for the SAP CFIN report generation service after a period of recurring complaints from finance managers — 'sometimes reports take forever, sometimes they're instant.' We had no metrics to evaluate whether this was an occasional problem or a systematic one.
>
> We defined two SLIs: availability (% of report generation requests completing with 200 OK) and latency (% of report requests completing within 10 seconds — 10 seconds because finance managers were willing to wait up to 10s for a complex P&L drill-down report). We set SLOs: 99.9% availability, 95% of requests under 10 seconds. We connected these to Grafana dashboards visible to the product owner.
>
> Month 1 results: availability 99.93% (within SLO). Latency: 87% under 10 seconds (below the 95% SLO). We had the data: latency was the problem, not availability. Directed investigation: identified that 13% of slow reports were hitting database joins without indexes (month-end drill-down reports joining 5 large tables). Added covering indexes. Month 2: latency hit 97.2% under 10 seconds — SLO met. Finance managers stopped complaining. The SLI/SLO framework turned a vague complaint into a measurable, solvable engineering problem."

---

## 8. Scale Evolution

**1,000 users →** Informal SLOs. Track p99 latency and error rate in a Grafana dashboard. PagerDuty alert if 5xx rate > 1% for 5 minutes. No formal error budget process yet.

**100,000 users →** Formal SLOs for each customer-facing service: availability 99.9%, p99 latency <300ms. Error budget tracking in monthly engineering review. Alert on burn rate (exhaustion in <1 hour = page immediately; exhaustion in <24 hours = warn). Deploy with confidence when budget is healthy.

**10 million users →** SLO dashboards per service visible to all stakeholders (engineering, product, business). Automated error budget gates in CI/CD pipeline: deploy blocked if remaining budget <10%. Quarterly SLO review: adjust targets up if consistently exceeding (SLO too conservative) or down if consistently failing and fixing (SLO too ambitious). Separate SLIs for each user segment (mobile app vs API partners may have different latency expectations). SLA commitments with enterprise customers tied to these SLOs with contractual credits.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment availability SLO: 99.99% (4.3 min/month). Latency SLO: 99% requests under 1 second (UPI must be fast). Error budget drives deployment calendar: high-risk releases avoided on salary day, Diwali. SLA to merchants: 99.9% with credits. | "Razorpay's payment API SLI shows 0.5% error rate at 11 AM on salary day. What does this mean for the error budget, and what should the team do immediately?" |
| Swiggy / Meesho | Order API SLO: 99.95%, p99 <500ms. Restaurant menu SLO: 99.9% (lower stakes than orders). Search SLO: 99.9%, p95 <200ms (search feels slow at >200ms). SLO burn rate alerts feed into incident runbooks. | "Swiggy's order service has a 99.95% SLO. During a 2-hour incident, availability dropped to 98%. Calculate the error budget impact and explain the team's response." |
| Adobe / Microsoft | Creative Cloud SLO: 99.99% for file save (user work is irreplaceable). Search SLO: 99.9%. AI generation SLO: 99% with latency SLO of p50 <8 seconds (AI takes longer—acceptable). Microsoft Azure SLA: contractual with financial penalties, published publicly. | "Adobe Creative Cloud's SLA promises 99.9% uptime. If Adobe sets their internal SLO at 99.95%, how much error budget buffer does that provide, and why is that buffer important?" |
| SAP Labs (current) | SAP BTP services: SLO per service type (CFIN: 99.9%, reporting: 99.5%). SAP HANA SLO: 99.99% for in-memory financial data access. Error budget reported in monthly engineering review with the product owner. SLA communicated to SAP customers in cloud service agreements. | "The SAP CFIN report generation service has a 99.9% availability SLO. In February (28 days), 35 minutes of downtime occurred due to a DB failover. How much error budget was consumed, and what is the remaining budget for the rest of the month?" |

---

## 10. Related Topics — What to Study Next

- **Topic 152 — Disaster Recovery RPO vs RTO** — RPO and RTO are specific SLOs for the disaster recovery scenario; RPO is an SLO for data loss ("SLO: no more than X minutes of data lost in any recovery event"); RTO is an SLO for recovery time ("SLO: 99% of recovery events complete within Y minutes"); framing DR requirements as SLOs makes them measurable and actionable rather than qualitative aspirations
- **Topic 153 — Chaos Engineering** — SLOs define steady state for chaos experiments; the experiment's hypothesis is stated as "the system will maintain its SLO during this failure scenario"; after the experiment, you compare the observed SLI metrics to the SLO threshold — if exceeded, the SLO is not achievable under that failure mode and the resilience mechanism must be improved
- **Topic 84 — Distributed Tracing** — SLIs that involve p99 latency require understanding WHERE latency is coming from; distributed tracing (Zipkin, Jaeger, OpenTelemetry) shows the full request path, each service's contribution to total latency, and identifies which service is degrading when the latency SLI starts trending toward SLO breach
- **Topic 149 — Auto-Scaling Strategies** — auto-scaling targets are derived from latency SLOs; the HPA target CPU percentage is calibrated so that at the maximum CPU threshold, the service's p99 latency still stays below the SLO threshold; if HPA is configured incorrectly (CPU target too high before scaling), latency SLO will be breached at peak traffic — the SLO drives the auto-scaling tuning

---

*Part 8 · SLI, SLO, SLA — What They Mean and How to Set Them · Full Stack Interview Guide · Hruday D · 2026*
