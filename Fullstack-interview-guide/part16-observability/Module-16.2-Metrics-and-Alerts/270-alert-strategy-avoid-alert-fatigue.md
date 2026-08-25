# Alert Strategy — Avoid Alert Fatigue
> Part 16 — Observability & Monitoring
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Alert fatigue** = team ignores alerts because so many fire constantly; the on-call engineer silences a noisy alert at 2 AM and never re-enables it — real outages then go undetected for hours because "we stopped trusting alerts"
- **The golden rule**: every alert that fires should be (1) actionable — someone must do something, (2) urgent — it cannot wait until morning, (3) accurate — rare false positives; if any of these three fails, the alert should be demoted or removed
- **Symptom-based alerting beats cause-based alerting**: alert on "users are experiencing errors" (high 5xx rate), NOT on "CPU is at 80%"; CPU at 80% may be fine; 5xx rate at 2% is always bad; symptom alerts are closer to user impact
- **Error budget burn rate**: don't alert on raw error rate — alert on how fast you are burning through your SLO error budget; a 5% error rate for 2 minutes (slow burn) and 5% for 20 minutes (fast burn) require very different urgency responses; 2-hour burn rate for paging, 6-hour for tickets
- **Severity routing**: CRITICAL (P1) → PagerDuty (wakes on-call, any time); WARNING (P2) → Slack channel (business hours); INFO (P3) → dashboard annotation or weekly report; mixing severity on one channel makes everything noise
- **Alert hygiene**: review every alert that fires each week; if it fired but nothing was done → either fix the system or delete the alert; dead alerts are actively harmful

---

## 1. One-Line Definition
Alert strategy is the practice of designing alerts so that every page or notification is trustworthy, actionable, and appropriately urgent — preventing the "cry wolf" effect where engineers stop responding to alerts because too many are false or meaningless.

---

## 2. The Problem It Solves

A team sets up monitoring and creates 40 Grafana/Prometheus alerts. In the first week, the on-call gets paged 60 times. Most pages are:
- "Disk at 70%" — not urgent, just a warning about a trend
- "CPU spike" — autoscaler handled it 30 seconds later
- "Payment gateway timeout" — happened once, retry succeeded
- "Memory at 85%" — normal during peak load on JVM services

After two weeks, the on-call engineer silences everything except the most critical alerts. A month later, a real database connection pool exhaustion goes unnoticed for 35 minutes because the alert that would have caught it was in the silenced queue.

Good alert strategy prevents both extremes: being paged constantly for non-issues AND being paged too late for real ones.

---

## 3. How It Works Internally

### The Alerting Decision Tree

```
Metric value crosses threshold
         │
         ▼
Is this user-impacting? ──── No ──→ Trending metric/dashboard only
         │
        Yes
         │
         ▼
Is it actionable right now? ── No ──→ Slack warning or weekly ticket
         │
        Yes
         │
         ▼
Is it urgent (cannot wait)? ── No ──→ Business hours only alert
         │
        Yes
         │
         ▼
CRITICAL → PagerDuty on-call page (any time, wakes someone up)
```

### Multi-Window Alerting (Error Budget Burn Rate)

```
SLO: 99.9% success rate over 30 days
Error budget: 0.1% of requests = 43 minutes of downtime per month

Short window (1h burn rate):
  If error rate = 14.4%, you consume the ENTIRE monthly budget in 1 hour
  → Burn rate = 14.4% / 0.1% = 144x  → CRITICAL PAGE NOW

Medium window (6h burn rate):
  If burn rate > 6x over 6 hours  → WARNING (Slack channel, business hours ok)

Long window (3d trailing):
  Tracks overall SLO health  → Dashboard metric, no alert
```

---

## 4. The Code

### Wrong Way — Too Many Alerts, Wrong Signals

```yaml
# ❌ WRONG — alert on every possible metric at fixed thresholds
# This is the fastest way to create alert fatigue

groups:
  - name: wrong-alerts
    rules:
      # ❌ CPU alert fires constantly on JVM apps — JVM uses CPU for GC normally
      # 80% during peak load IS normal — this is not actionable
      - alert: CpuHigh
        expr: process_cpu_usage > 0.80
        for: 1m
        labels:
          severity: critical    # ❌ wrong severity — this is not critical
        annotations:
          summary: "CPU too high"

      # ❌ Memory alert fires every time JVM fills heap before GC
      # JVM is DESIGNED to fill heap then collect — this is normal operation
      - alert: MemoryHigh
        expr: jvm_memory_used_bytes / jvm_memory_max_bytes > 0.80
        for: 1m
        labels:
          severity: critical    # ❌ heap at 80% is normal — GC will clear it
        annotations:
          summary: "Memory too high"

      # ❌ Disk alert at 70% — this gives you months of warning, not an incident
      # You don't need to wake someone up at 3 AM for disk at 70%
      - alert: DiskHigh
        expr: disk_used_percent > 70
        for: 1m
        labels:
          severity: critical    # ❌ wrong — this is a ticket-level warning
        annotations:
          summary: "Disk full"

      # ❌ Single-window raw error rate alert (not burn-rate based)
      # A 2-second burst of errors (deploy startup) fires the alert
      # But a slow 0.5%/hour error rate that cumulatively burns the budget — doesn't fire
      - alert: ErrorRateHigh
        expr: rate(http_server_requests_seconds_count{status=~"5.."}[1m]) > 0.01
        # ❌ 1-minute window is too short — transient spikes fire this constantly
        for: 0m    # ❌ no wait — fires immediately on any spike
        labels:
          severity: critical
```

```yaml
# ❌ WRONG — All alerts route to the same Slack channel
# Engineers can't distinguish what needs action NOW from what is informational
# After a few weeks, everyone mutes the channel

# All rules have the same route — severity label is ignored:
# - CPU high → #alerts channel
# - Memory high → #alerts channel  
# - Disk warning → #alerts channel
# - P1 database down → #alerts channel  ← buried in noise
```

### Right Way — Symptom-Based, Burn-Rate Alerts with Severity Routing

```yaml
# ✅ RIGHT — Prometheus alert rules based on user-facing symptoms + burn rate

groups:
  - name: slo-burn-rate-alerts
    rules:
      
      # ✅ CRITICAL: fast burn rate — consuming monthly error budget in < 1 hour
      # 14.4x burn rate over 5m means the monthly SLO budget burns in ~1 hour
      # Wake the on-call engineer immediately
      - alert: CheckoutSLOFastBurn
        expr: |
          (
            rate(http_server_requests_seconds_count{
              application="order-service", uri="/api/checkout", status=~"5.."
            }[5m])
            /
            rate(http_server_requests_seconds_count{
              application="order-service", uri="/api/checkout"
            }[5m])
          ) > (14.4 * 0.001)
          # 0.001 = SLO error rate threshold (0.1% = 99.9% SLO)
          # 14.4 = factor meaning "budget fully burned in 1 hour"
        for: 2m     # ← must sustain for 2 minutes (filters 30-second deploy blips)
        labels:
          severity: critical
          service: order-service
          team: backend
        annotations:
          summary: "Checkout SLO: fast error budget burn"
          description: >
            Error rate {{ $value | humanizePercentage }} is burning the monthly
            error budget in under 1 hour.
          runbook_url: "https://wiki.example.com/runbooks/checkout-errors"
          dashboard_url: "https://grafana.example.com/d/order-service-prod"

      # ✅ WARNING: slow burn — budget will be fully spent in ~6 hours
      # Not an emergency, but needs attention during business hours
      - alert: CheckoutSLOSlowBurn
        expr: |
          (
            rate(http_server_requests_seconds_count{
              application="order-service", uri="/api/checkout", status=~"5.."
            }[30m])
            /
            rate(http_server_requests_seconds_count{
              application="order-service", uri="/api/checkout"
            }[30m])
          ) > (6 * 0.001)
        for: 15m    # ← 15m window filters transient issues
        labels:
          severity: warning    # ← routes to Slack, not PagerDuty
          service: order-service
        annotations:
          summary: "Checkout SLO: slow error budget burn"

      # ✅ CRITICAL: P99 latency SLO breach — sustained, not transient
      - alert: CheckoutLatencySLOBreach
        expr: |
          histogram_quantile(
            0.99,
            sum(rate(http_server_requests_seconds_bucket{
              application="order-service", uri="/api/checkout"
            }[5m])) by (le)
          ) > 0.5
        for: 5m     # ← must exceed 500ms for 5 consecutive minutes
        labels:
          severity: critical
        annotations:
          summary: "Checkout P99 latency > 500ms SLO (currently {{ $value | humanizeDuration }})"

  - name: infrastructure-symptomatic-alerts
    rules:

      # ✅ Database connection pool alert — cause close to user impact
      # Pool exhaustion DIRECTLY causes request failures — this IS urgent
      # Unlike CPU (which may be fine), pool pending > 0 for 2m means requests are failing
      - alert: DatabaseConnectionPoolExhausted
        expr: hikaricp_connections_pending{application="order-service"} > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "HikariCP pool exhausted — requests are queuing for DB connections"

      # ✅ Kafka consumer lag — leading indicator for order processing delays
      # NOT a symptom directly, but very close to one: lag > 10,000 = real business delay
      - alert: KafkaConsumerLagHigh
        expr: kafka_consumer_lag_max{consumer_group="order-processor"} > 10000
        for: 5m
        labels:
          severity: warning    # ← warning, not critical — lag can recover
        annotations:
          summary: "Kafka order-processor lag {{ $value }} messages behind"

      # ✅ Disk alert — ticket level, NOT critical (has weeks of runway)
      # Route this to a Jira ticket or Slack channel for ops review, not PagerDuty
      - alert: DiskSpaceRunningLow
        expr: disk_used_percent > 85
        for: 30m    # ← 30 minutes ensures it's not a transient write spike
        labels:
          severity: warning    # ← warning only — disk at 85% is NOT a 3AM wake-up
        annotations:
          summary: "Disk {{ $value }}% full on {{ $labels.instance }} — plan cleanup"
```

```yaml
# ✅ RIGHT — Alertmanager routing: severity-based routing to correct channel

global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'service']
  group_wait: 30s          # wait 30s before sending first notification (allow grouping)
  group_interval: 5m       # minimum time between grouped notifications
  repeat_interval: 4h      # re-notify if still firing after 4h
  receiver: 'slack-warnings'    # default receiver

  routes:
    # ✅ CRITICAL → PagerDuty (wakes on-call, any time of day or night)
    - match:
        severity: critical
      receiver: pagerduty-oncall
      continue: true    # ← also send to Slack for team visibility

    # ✅ WARNING → Slack only (no page)
    - match:
        severity: warning
      receiver: slack-warnings

receivers:
  - name: pagerduty-oncall
    pagerduty_configs:
      - routing_key: '${PAGERDUTY_INTEGRATION_KEY}'
        description: '{{ .CommonAnnotations.summary }}'
        details:
          runbook: '{{ .CommonAnnotations.runbook_url }}'
          dashboard: '{{ .CommonAnnotations.dashboard_url }}'

  - name: slack-warnings
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-warnings'
        title: '{{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'
        send_resolved: true    # ← send when alert clears — important for incident tracking

inhibit_rules:
  # ✅ Suppress downstream alerts when the root cause is already paging
  # If "DatabaseConnectionPoolExhausted" is firing, suppress "CheckoutSLOFastBurn"
  # — the checkout SLO alert is a symptom of the DB issue; no need to page twice
  - source_match:
      alertname: DatabaseConnectionPoolExhausted
    target_match_re:
      alertname: 'CheckoutSLO.*'
    equal: ['service']
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is alert fatigue and how do you prevent it?"

**Hruday's answer:**
> Alert fatigue is when engineers stop trusting and responding to alerts because too many of them fire, most of them are false positives, and very few of them require actual action. It typically starts within weeks of setting up monitoring — the team builds out dashboards, adds an alert for every metric, and then gets paged constantly. After a few days the on-call silences everything except the most critical alerts. The problem: the silenced alerts include some that matter.
>
> Prevention has three parts. First, set the right signal: alert on symptoms (user-facing errors, latency SLO breach) rather than causes (CPU usage, memory percentage). Symptoms are directly tied to user impact. Causes may be completely normal.
>
> Second, calibrate thresholds using burn rate against your SLO, not fixed percentages. An error rate of 2% for 1 minute during a deploy is irrelevant. An error rate of 2% for 30 minutes is burning your monthly budget. The `for` clause in Prometheus alert rules filters transient spikes.
>
> Third, review alert history every week. Any alert that fired but needed no action is a candidate for removal or demotion. Dead alerts are actively harmful — they are the ones that get silenced, taking real alerts with them.

---

### Q2 — Design
**Interviewer asks:** "What is error budget burn rate alerting, and why is it better than raw error rate alerting?"

**Hruday's answer:**
> SLO-based error budget burn rate alerting is built on an SLO — say 99.9% success rate over 30 days. Your error budget is 0.1% of requests, which is about 43 minutes of total-outage-equivalent per month.
>
> With raw error rate alerting, I set a threshold like "alert if error rate exceeds 1%". This fires during every deploy blip, every retry storm, every transient upstream issue. I get dozens of pages per week for events that self-resolved.
>
> Burn rate alerting instead asks: "how fast are we consuming that 43-minute monthly budget?" If we're burning through it at 14.4x the normal rate, we'll exhaust the entire month's budget in one hour. That's an emergency — page now. If we're burning at 6x, we'll exhaust it in 6 hours — that's serious but not a 3 AM wake-up call. If we're burning at 1x, we're on track — no alert.
>
> The burn rate normalizes for traffic volume, filters transient spikes, and ties directly to real user impact. It gives two windows: short (1-hour) for critical pages, medium (6-hour) for warnings. The result: fewer false positives, better signal quality, and the on-call team actually trusts the alerts that do fire.

---

### Q3 — Trade-Off
**Interviewer asks:** "When is it acceptable to alert on a cause metric rather than a symptom metric?"

**Hruday's answer:**
> Cause metrics are appropriate when they are both (a) very close to user impact and (b) not already covered by a symptom alert, AND when the lead time matters — meaning the cause metric gives enough warning to act before users are impacted.
>
> The best example is database connection pool exhaustion. HikariCP pending connections greater than zero for two minutes means requests are already waiting for a DB connection — user requests are lining up. This cause metric is essentially indistinguishable from a symptom at that point, and it fires before the SLO error alert would (which needs errors to actually happen first).
>
> Kafka consumer lag is another good cause alert: lag building up means the orderprocessing pipeline is falling behind. Users aren't seeing errors yet, but order notifications will be delayed. The lead time here is genuinely useful.
>
> In contrast: CPU at 80% is a genuinely bad cause alert because (a) JVM apps regularly hit 80% during GC cycles without impact, (b) autoscalers typically handle it before users notice, and (c) there's no actionable response other than "wait and watch". It fires constantly, and the action taken is usually "check dashboard, no user impact, ignore".
>
> Rule of thumb: if the response to a cause alert is ever "check the dashboard and do nothing if it resolves itself", demote it to a dashboard panel only.

---

### Q4 — Scenario
**Interviewer asks:** "Walk me through designing the alert strategy for a payment processing API with a 99.95% SLO."

**Hruday's answer:**
> 99.95% SLO over 30 days means 13 minutes of error budget per month. That's tight, so the burn rate thresholds should be aggressive.
>
> Two primary alerts: Fast burn at 14.4x over 5 minutes (budget gone in 1 hour) → CRITICAL, PagerDuty immediately. Slow burn at 6x over 30 minutes (budget gone in 5 hours) → WARNING, Slack during business hours, PagerDuty after hours.
>
> I'd also add one symptom alert and two cause alerts. Symptom: P99 latency above 300ms for 3 minutes (payments must be fast — 500ms feels broken to users making a payment). Cause 1: HikariCP pending connections above zero for 2 minutes (payment DB saturation is critical). Cause 2: payment gateway retry rate above 5% for 5 minutes (indicates upstream degradation before errors accumulate).
>
> Routing: all CRITICAL alerts go to a dedicated PagerDuty payment service. WARNING alerts go to #payments-alerts Slack channel with resolved notifications enabled. An inhibit rule suppresses SLO alerts when the DB pool exhaustion alert is already firing — one root cause, one page.
>
> I'd review the alert history after the first month's production traffic to calibrate the burn rate multipliers. A payment SLO at 99.95% is tight enough that you want the fast-burn alert to be sensitive, but not so sensitive it pages during every deploy rollout.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "More alerts = better coverage" | "We add an alert for every metric to make sure we catch everything" | More alerts directly causes alert fatigue; every new alert that isn't urgent and actionable increases the noise-to-signal ratio; the team begins to ignore the alert channel, and real emergencies get buried; the correct direction after setting up monitoring is to reduce alert count over time — remove any alert that fires without requiring action, and demote warnings to dashboard-only panels; the goal is that every page wakes someone up for a good reason, not that every metric has an alert |
| "Alert on absolute values" | "We alert if CPU is over 80% or memory is over 75%" | Fixed absolute thresholds fire constantly in systems with variable load; JVM heap naturally fills to 80-90% before GC; CPU spikes during batch jobs, GC cycles, and traffic peaks without user impact; the correct approach is (a) symptom-based alerts for user-facing metrics (error rate, latency SLO) and (b) burn rate for SLO budget; if a cause metric like CPU must be monitored, use a sustained-duration threshold (alert if CPU > 90% for 15 minutes, not 1 minute) and route it to a warning ticket, not a page |
| "One severity level for all alerts" | "We route all alerts to the same Slack channel so nothing is missed" | A single alert channel with mixed severities trains engineers to ignore it within weeks; disk usage at 72% alongside database connection pool exhaustion alongside P1 latency SLO breach — all in the same channel, all looking the same — means the P1 gets the same attention as the disk warning; severity routing is mandatory: CRITICAL → PagerDuty wakes on-call any time; WARNING → Slack during business hours; INFO → dashboard or weekly report; the boundary between CRITICAL and WARNING should be "would waking the on-call engineer at 3 AM about this be justified?" |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, after we set up Grafana and Prometheus, the first month had 200+ Slack notifications per week. The team muted the channel within 3 weeks. Then a real payment processing degradation — a slow DB connection pool exhaustion building over 40 minutes — went undetected until a user filed a support ticket.
>
> We ran an alert audit: 60% of all alerts that had fired in the last month required no action at all. They were all CPU, memory, and disk percentage alerts at fixed thresholds. We removed those and replaced them with three symptom-based SLO burn rate alerts and two HikariCP cause alerts.
>
> The following month: 12 alert notifications total, 11 required action, 1 was a false positive. The on-call team went from muting the channel to actually trusting it. Mean time to acknowledge a real incident dropped from 25 minutes to under 5."

---

## 8. Scale Evolution

**1,000 users →** Basic Grafana alerting: error rate alert and P99 latency alert. Route to a team Slack channel. Two to three alerts total. Review weekly to remove noise. No need for burn rate complexity at this scale.

**100,000 users →** SLO error budget defined formally. Burn rate alerting with two-window model (1h critical, 6h warning). Severity routing: PagerDuty for critical, Slack for warning. Alertmanager inhibit rules prevent duplicate pages for same root cause. Sprint-level alert review to cull stale alerts.

**10 million users →** Multi-service SLOs. Burn rate alerting per service and per critical endpoint. Auto-silencing rules for planned maintenance windows. Alertmanager grouping to reduce notification volume during cascading failures. PagerDuty escalation policies: 10 minutes no ack → escalate to manager. Post-incident alert review as mandatory incident follow-up step (did our alerts tell us about this fast enough? did the right person get paged?).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment SLO at 99.95% means 13 minutes budget per month; every false-positive page is a wasted response for a tiny error budget; burn rate alerting is non-optional; alert fatigue in a payment system directly translates to undetected fraud or outages | SLO-based alert design; burn rate math; severity routing for financial systems |
| Swiggy / Meesho | Delivery SLOs (order-to-notification latency); Flash Sale alert calibration (alert thresholds valid at 10x load must be re-validated); Kafka consumer lag as business-impact leading indicator; on-call burnout prevention during high-traffic periods | Flash Sale alert strategy; lag-based leading indicators; on-call operational discipline |
| Adobe / Microsoft | Document processing SLOs across multiple job types; per-team alert ownership (document team, export team, collaboration team); enterprise PagerDuty / OpsGenie routing policies; compliance requirement for 24h response to certain alert categories | Enterprise alert routing; multi-team ownership; compliance-driven alert retention policies |
| SAP Labs | Direct story: 200 Slack alerts/week → team muted channel → 40-minute undetected DB degradation → alert audit → 12 meaningful alerts/month; on-call trust restoration; MTTR improvement from alert quality improvements | Before/after alert audit story; quantified improvement; direct link to incident detection |

---

## 10. Related Topics — What to Study Next

- **Topic 267 — Micrometer + Prometheus** — alerts are defined over Prometheus metrics; the quality of alert design depends directly on the quality of the underlying metrics; histogram-based P99 metrics with correct SLO-aligned bucket sizes are the prerequisite for accurate burn rate alerting
- **Topic 268 — Grafana Dashboards** — alert conditions are visualized on Grafana dashboards; the "for" clause in Prometheus rules (5 minutes sustained) makes more sense when you can see the time series; during incident response, the Grafana dashboard is the primary tool for understanding alert context before acting
- **Topic 271 — Incident Management and Postmortems** — when an alert fires and an incident occurs, what happens next is incident management; the post-incident review always asks "did our alerts tell us about this in time?" and "did we page the right person?"; good alert strategy is validated and improved through postmortems
- **Topic 269 — Frontend Monitoring** — frontend monitoring (Sentry error rate, Core Web Vitals regression) also generates alerts; the same principles apply — symptom-based, actionable, severity-routed; a Sentry alert for "new JavaScript error affecting checkout" is high-urgency; a Sentry alert for "1 new occurrence of ResizeObserver loop" is not

---

*Part 16 · Alert Strategy — Avoid Alert Fatigue · Full Stack Interview Guide · Hruday D · 2026*
