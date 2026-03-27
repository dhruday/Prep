# Grafana Dashboards
> Part 16 — Observability & Monitoring
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card

- **Grafana** = open-source visualization and alerting platform; connects to data sources (Prometheus, Elasticsearch, Loki, CloudWatch, PostgreSQL, etc.) and renders dashboards from queries to each
- **Dashboard = panels + time range + variables**: a panel is one chart/stat/table; time range applies to all panels; template variables (like `$service`, `$environment`) make one dashboard work for all services without duplication
- **RED Method for every service dashboard**: Rate (requests per second), Errors (error rate %), Duration (P50/P95/P99 latency histogram) — three panels minimum for every HTTP/API service
- **USE Method for every infrastructure dashboard**: Utilization (% busy), Saturation (queue depth, waiting requests), Errors (hardware/system errors) — JVM: heap utilization, GC pause time (saturation indicator), OOM errors
- **Stat panel** = single number with color threshold; `dashboard.errors.current > 5/min → RED`; good for "is this service healthy right now?" at a glance
- **Time series panel** = line/area chart over time; best for latency trends, request rate trends, showing correlation between two metrics
- **Grafana Alerting**: define alert conditions in PromQL; route via Contact Points (Slack, PagerDuty, email); group alerts with labels; silence noisy alerts during maintenance; Grafana alerts vs Prometheus `alert.rules` — both work, Grafana is more visual, Prometheus rules are more code-reviewable and GitOps-friendly
- **Dashboard as code**: export as JSON; store in Git; deploy via Grafana API or `grafana-operator` in Kubernetes; prevents "snowflake dashboards" that only one person knows how to fix
- **Loki + Grafana**: Grafana can query Loki (log aggregation, like ELK but simpler) through the same interface as Prometheus; trace, metric, and log correlation in one Grafana UI tab-switching without switching tools

---

## 1. One-Line Definition
Grafana is the visualization layer for metrics (Prometheus), logs (Loki/Elasticsearch), and traces (Jaeger/Tempo), providing dashboards and alerting that turn raw observability data into actionable operational intelligence.

---

## 2. The Problem It Solves

With Prometheus running and scraping metrics, the data exists — but PromQL queries are not user-friendly for non-engineers, and there's no central view of system health. During an incident:
- Is the problem one service or multiple services at once?
- Is the error rate going up or stable?
- Did latency spike before or after the deployment 15 minutes ago?
- Is this correlated with a Kafka consumer lag spike?

Without dashboards, you answer each question with a separate PromQL query, in separate browser tabs, with manually aligned time ranges. Grafana provides:
- All panels with synchronized time ranges — click "last 30 minutes" and every panel updates
- Template variables: `$service=order-service` applies to all panels — change the dropdown to see payment-service instead
- Annotations: a "deployment" annotation appears as a vertical yellow line on all time-series panels — correlating metric spikes with deployments is visual and immediate

---

## 3. How It Works Internally

### Dashboard Composition

```
Grafana Dashboard: "Order Service — Production"
├── Row: RED Method
│   ├── [Stat Panel] Current Request Rate: 1,247 req/s
│   ├── [Stat Panel] Error Rate: 0.02% (GREEN threshold < 1%)
│   └── [Time Series] P50/P95/P99 Latency (last 1h)
│
├── Row: JVM Health
│   ├── [Gauge] Heap Utilization: 68% (YELLOW threshold: 80%)
│   ├── [Time Series] GC Pause Time (last 1h)  
│   └── [Stat Panel] Active Threads: 42
│
├── Row: Database
│   ├── [Gauge] HikariCP Pool Utilization: 45%
│   ├── [Stat Panel] Pending Connections: 0 (RED if > 0 for > 30s)
│   └── [Time Series] Slow Query Rate (>500ms)
│
├── Row: Kafka
│   ├── [Time Series] Consumer Lag (order-processor group)
│   └── [Stat Panel] Messages Behind: 0 (RED if > 1000 for > 60s)
│
└── Row: Business KPIs (driven by custom Micrometer metrics)
    ├── [Stat Panel] Orders/min (last 5 min)
    ├── [Stat Panel] Revenue/min (last 5 min)  
    └── [Time Series] Order Create Duration P99 (SLO line at 500ms)
```

---

## 4. The Code

### Wrong Way — One-Off Manual Dashboards Without Standards

```json
// ❌ WRONG 1: Dashboard configured by click-only, never saved to code
// The only copy lives in the Grafana DB
// When the Grafana instance is rebuilt or migrated, the dashboard is gone
// When someone accidentally deletes a panel, it's not recoverable
// New services don't have dashboards because "only DevOps knows how to build them"
// Solution: export dashboard JSON → commit to Git → deploy via API / GitOps

// ❌ WRONG 2: Hardcoded service name in every PromQL query
// "sum(rate(http_server_requests_seconds_count{application='order-service'}[5m]))"
// Must duplicate the entire dashboard for each of 15 services
// When you update one panel, you must update it 15 times

// Dashboard with template variable (RIGHT approach) instead uses $service:
// "sum(rate(http_server_requests_seconds_count{application='$service'}[5m]))"
// One dashboard serves all 15 services via a dropdown
```

```json
// ❌ WRONG 3: Wrong visualization type for the data
// Using a "Time series" panel to show current value ("Is this service up right now?")
// ← Time series needs time context; for current state, use Stat panel

// Using a "Stat" panel to show trend over time
// ← Single number can't show trends; for trends, use Time series

// Using average latency instead of histogram P99
// ← average hides outliers; 1% of users may have 5x worse experience
// while average looks fine because 99% have fast responses
```

### Right Way — Production-Grade Grafana Dashboard as Code

```json
// ✅ RIGHT — Full RED Method dashboard panel in Grafana JSON model

{
  "title": "Order Service — Production",
  "uid": "order-service-prod",
  "tags": ["order-service", "production"],
  
  "templating": {
    "list": [
      {
        "name": "service",
        "type": "query",
        "datasource": "Prometheus",
        "query": "label_values(http_server_requests_seconds_count, application)",
        "label": "Service",
        "multi": false
      },
      {
        "name": "environment", 
        "type": "custom",
        "options": ["production", "staging"],
        "current": { "value": "production" }
      }
    ]
  },
  
  "panels": [
    {
      "title": "Request Rate (req/s)",
      "type": "stat",
      "gridPos": { "w": 8, "h": 4 },
      "targets": [
        {
          "expr": "sum(rate(http_server_requests_seconds_count{application='$service', environment='$environment'}[5m]))",
          "legendFormat": "req/s"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "reqps",
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "color": "green", "value": null },
              { "color": "yellow", "value": 800 },
              { "color": "red", "value": 1500 }
            ]
          }
        }
      }
    },
    
    {
      "title": "Error Rate (%)",
      "type": "stat",
      "gridPos": { "w": 8, "h": 4 },
      "targets": [
        {
          "expr": "100 * sum(rate(http_server_requests_seconds_count{application='$service', environment='$environment', status=~'5..'}[5m])) / sum(rate(http_server_requests_seconds_count{application='$service', environment='$environment'}[5m]))",
          "legendFormat": "Error %"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "percent",
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "color": "green", "value": null },
              { "color": "yellow", "value": 0.5 },
              { "color": "red", "value": 1.0 }
            ]
          }
        }
      }
    },
    
    {
      "title": "P50 / P95 / P99 Latency",
      "type": "timeseries",
      "gridPos": { "w": 24, "h": 8 },
      "targets": [
        {
          "expr": "histogram_quantile(0.50, sum(rate(http_server_requests_seconds_bucket{application='$service', environment='$environment', uri='/api/orders'}[5m])) by (le))",
          "legendFormat": "P50"
        },
        {
          "expr": "histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{application='$service', environment='$environment', uri='/api/orders'}[5m])) by (le))",
          "legendFormat": "P95"
        },
        {
          "expr": "histogram_quantile(0.99, sum(rate(http_server_requests_seconds_bucket{application='$service', environment='$environment', uri='/api/orders'}[5m])) by (le))",
          "legendFormat": "P99"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "s",
          "custom": {
            "lineWidth": 2,
            "fillOpacity": 10
          }
        },
        "overrides": [
          { "matcher": { "id": "byName", "options": "P99" },
            "properties": [{ "id": "color", "value": { "fixedColor": "red" } }] }
        ]
      },
      "options": {
        "legend": { "displayMode": "list" },
        "tooltip": { "mode": "multi" }
      },
      "thresholds": {
        "steps": [{ "color": "red", "value": 0.5 }]   // ← SLO line at 500ms
      }
    },
    
    {
      "title": "HikariCP Pool Utilization",
      "type": "gauge",
      "gridPos": { "w": 8, "h": 4 },
      "targets": [
        {
          "expr": "hikaricp_connections_active{application='$service'} / hikaricp_connections_max{application='$service'} * 100",
          "legendFormat": "Pool %"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "percent",
          "min": 0, "max": 100,
          "thresholds": {
            "steps": [
              { "color": "green", "value": null },
              { "color": "yellow", "value": 70 },
              { "color": "red", "value": 90 }
            ]
          }
        }
      }
    }
  ],
  
  "annotations": {
    "list": [
      {
        "name": "Deployments",
        "datasource": "-- Grafana --",  
        "hide": false,
        "type": "dashboard",
        "iconColor": "rgba(255, 96, 96, 1)"
        // ← vertical lines on all time series panels when a deployment happened
        // Added via: Grafana API POST /api/annotations with deployment timestamp
        // From CI/CD pipeline: curl -X POST grafana/api/annotations -d '{"text":"Deploy v1.2.3",...}'
      }
    ]
  }
}
```

```yaml
# ✅ Grafana Alerting rule (Grafana 9+ unified alerting)

# Alert on P99 checkout latency exceeding SLO (500ms) for 5 minutes
- name: CheckoutLatencyHigh
  rules:
    - alert: CheckoutP99LatencyHigh
      expr: >
        histogram_quantile(
          0.99,
          sum(rate(http_server_requests_seconds_bucket{
            application="order-service",
            environment="production",
            uri="/api/checkout"
          }[5m])) by (le)
        ) > 0.5
      for: 5m                # ← must be > 500ms for 5 CONSECUTIVE minutes to alert
                             # prevents alerts on brief transient spikes
      labels:
        severity: warning
        service: order-service
        team: backend
      annotations:
        summary: "Checkout P99 latency exceeds 500ms SLO"
        description: >
          Checkout P99 latency is {{ $value | humanizeDuration }}.
          SLO is 500ms.
          Dashboard: https://grafana.sap.com/d/order-service-prod

    - alert: CheckoutErrorRateHigh
      expr: >
        100 * sum(rate(http_server_requests_seconds_count{
          application="order-service",
          environment="production",
          status=~"5.."
        }[5m]))
        /
        sum(rate(http_server_requests_seconds_count{
          application="order-service",
          environment="production"
        }[5m]))
        > 1.0
      for: 2m               # ← error alerts fire faster than latency alerts (2 vs 5 min)
      labels:
        severity: critical    # ← critical routes to PagerDuty (wakes on-call)
        service: order-service
      annotations:
        summary: "Checkout error rate > 1%"
        description: "Current error rate: {{ $value }}%. Immediate investigation required."
        runbook_url: "https://wiki.sap.com/runbooks/order-service-errors"
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What panels would you include in a service dashboard?"

**Hruday's answer:**
> I follow the RED Method as the mandatory first row: Request Rate (total requests per second, to show traffic volume), Error Rate (percentage of 5xx responses, which drives alerting), and Latency distribution (P50/P95/P99 as a time-series — not just average, because average hides tail latency).
>
> Second row: resource health for JVM services — heap utilization as a gauge (with red threshold at 80%), GC pause time as a time-series (sudden increase in GC pauses is an early signal of memory pressure), and HikariCP connection pool utilization (another leading indicator — if the pool is at 90%, some requests will start waiting for connections shortly).
>
> Third row: dependencies — Kafka consumer lag time-series (if the service consumes from Kafka), outbound HTTP call success rate and latency to downstream services.
>
> Fourth row: business metrics — custom Micrometer counters I've registered (orders created per minute, payments processed). These correlate operational metrics with business impact: "at 10:23, both P99 latency AND orders per minute dropped from 50 to 5" tells a clearer story than latency alone.
>
> One principle: every dashboard should show deployment annotations. A vertical line at "Deploy v2.3.1 at 10:20" makes it immediately obvious if a metric change correlates with a deployment.

---

### Q2 — Design
**Interviewer asks:** "How do you handle 20 microservices in Grafana without creating 20 identical dashboards?"

**Hruday's answer:**
> Template variables. In Grafana dashboards, you define a variable that's populated from a Prometheus label: `label_values(http_server_requests_seconds_count, application)` returns all distinct `application` label values — which is all your service names. You place a dropdown at the top of the dashboard with this variable, named `$service`.
>
> Then every PromQL query in every panel references `$service`: `rate(http_server_requests_seconds_count{application='$service'}[5m])`. Change the dropdown from "order-service" to "payment-service" and every panel instantly shows payment-service data.
>
> One dashboard serves all 20 services. When you add a new panel or fix a PromQL expression, the fix applies to all services automatically. Store the dashboard JSON in Git, and deploy it via the Grafana API as part of your CI/CD pipeline. This is "dashboard as code" — the same principle as infrastructure as code.
>
> A secondary benefit: new services get monitoring automatically. The moment service with `application="new-cart-service"` starts exporting metrics to Prometheus, it appears in the dashboard dropdown. No manual dashboard creation needed.

---

### Q3 — Incident Scenario
**Interviewer asks:** "Walk me through how you'd use Grafana during a P1 incident."

**Hruday's answer:**
> First 2 minutes: open the "Service Overview" dashboard with all services visible. I'm looking for RED — which services have elevated error rates? The Stat panels with red thresholds make this immediately visible. If only one service is red, it's likely that service's problem. If multiple services are red simultaneously, it's likely a shared dependency (database, Kafka, a common downstream service).
>
> Minutes 2-5: click the affected service in the dropdown. Change time range to "Last 30 minutes". Look for the deployment annotation: did this start with or after a deployment? Check the correlation between the error rate and latency spikes — do they happen at the same time, or is latency up but errors normal (a slowdown, not a crash)?
>
> Minutes 5-10: zoom into the specific panel that's anomalous. If P99 is high, check HikariCP pool utilization and Kafka consumer lag. If one is also high, there's resource contention. If they're fine, it's likely application code — jump to Kibana and query for ERROR logs at the time of the latency spike.
>
> Minutes 10-15: verify the root cause. If I found a database pool saturation spike, I look at the slow query rate panel. If HikariCP was saturated, it's likely a slow query holding connections. From Jaeger, I find the span for the slow DB query. From Kibana logs, I find the query text.
>
> This flow — Grafana for system health → Kibana for log detail → Jaeger for request timeline — is the three-pillars-of-observability workflow in practice. Grafana is the entry point every time.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We monitor with average latency" | "Our average API response time is 120ms" | Average latency is actively misleading; if 99 users get 50ms and 1 user gets 5,000ms, the average is ~99ms — perfectly normal looking; that 1 user is having a terrible experience, and if it's consistently the same 1% (users with certain devices, large accounts, certain routes), it's a systematic bug hidden by the average; always measure P95 and P99 and build SLOs around them; a P99 > 3x P50 is a signal that some code path has extreme variability of behavior; histogram panels in Grafana showing P50/P95/P99 simultaneously reveal this immediately |
| "We create a separate Grafana dashboard for each service" | "Each service has its own dashboard that the service team manages" | This creates N dashboards with identical structure but different hardcoded service names; when you improve the dashboard design (add a new panel, fix a threshold), you must update N dashboards; team knowledge is siloed (payment team knows payment dashboard, order team knows order dashboard — no one has a global view); the correct approach is a template variable `$service` in one canonical dashboard; the operations team gets a global overview by opening the dashboard and seeing all services; the service team selects their service from the dropdown; changes propagate to all services automatically |
| "Grafana alerting is separate from Prometheus alerting" | "We sometimes define alerts in Grafana, sometimes in Prometheus" | Maintaining alerts in two places creates confusion about which is the source of truth; both Grafana Unified Alerting and Prometheus `alert.rules` can work, but mixing them means some alerts are in Git (Prometheus rules files) and others are in Grafana's database (not in Git) — a recipe for configuration drift; choose one system and use it consistently; for GitOps teams: Prometheus rules files committed to Git, deployed via Helm/ArgoCD, is the more auditable approach; for smaller teams who prefer a visual UI: Grafana Unified Alerting with dashboards-as-code backup is acceptable |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had 12 microservices with no shared dashboard — each service team had built their own (or hadn't built one at all). During a P1, the on-call engineer needed to identify whether the problem was isolated to the checkout service or multiple services. There was no way to see multiple services at once without opening 6 browser tabs with different dashboards, different time ranges, and different panel layouts.
>
> I built a 'Service Health Grid' dashboard: 12 Stat panels, one per service, each showing error rate with red/green color based on a threshold. Template variables for environment (production/staging). One view showing all services simultaneously.
>
> The next P1 was 3 weeks later. The on-call engineer opened the grid, saw that payment-service and notification-service were both red (order-service and others were green), and correctly identified a shared dependency (the user profile service) as the likely root cause — in under 2 minutes. Previous average time to identify blast radius: 15-20 minutes.
>
> The grid dashboard became the company's standard incident war room view, deployed via Grafana API as JSON from Git."

---

## 8. Scale Evolution

**1,000 users →** Grafana OSS single instance, Prometheus as the only datasource, 1-2 dashboards (all services, JVM health). Grafana runs on the same server as Prometheus. Dashboard JSON exported and committed to Git.

**100,000 users →** Multiple dashboards by concern (Service overview, Infrastructure, Business KPIs, SLO dashboards). Template variables for service and environment. Grafana Alerting to Slack for WARN, PagerDuty for CRITICAL. Annotation API called from CI/CD pipeline on every deploy. Dashboard-as-code deployed via Grafana provisioning from ConfigMaps in Kubernetes.

**10 million users →** Grafana HA cluster (multiple instances, shared database for dashboards). Prometheus federation or Thanos as long-term metric storage (Grafana reads from Thanos for 90-day views). Dedicated per-team Grafana folders (orders, payments, infrastructure). SLO dashboards with error budget burn rate. Grafana OnCall for intelligent alert routing with escalation policies.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Real-time transaction error rate on Grafana Stat panels; payment P99 SLO dashboard with error budget burn rate; HikariCP saturation as priority alert (DB connection issues = payment failures) | SLO dashboard design; financial SLO thresholds; payment pipeline monitoring |
| Swiggy / Meesho | Flash Sale: order rate and P99 on one dashboard; Grafana annotation on sale start time; Kafka consumer lag for real-time inventory sync; alert on order volume drop (business metric) | Flash Sale operations; business KPI panels; combined tech + business signals |
| Adobe / Microsoft | Grafana on Azure Monitor datasource (not Prometheus); document processing pipeline stage panels; per-document-type latency breakdown; global vs regional view using template variable | Azure Monitor integration; pipeline monitoring; multi-region dashboards |
| SAP Labs | 12-service health grid reducing P1 blast radius identification from 15 min to 2 min; template variables; dashboard as code via Grafana API; direct MTTR improvement story | Multi-service overview design; dashboard as code; MTTR impact |

---

## 10. Related Topics — What to Study Next

- **Topic 267 — Micrometer + Prometheus** — Grafana is the visualization layer; Prometheus with Micrometer instrumentation is the data source; topic 267 covers how to produce the metrics that Grafana panels visualize, including the correct histogram configuration needed for P99 panels to work accurately
- **Topic 269 — Frontend Monitoring with Sentry and Datadog RUM** — Grafana dashboards cover backend and infrastructure; frontend monitoring (JavaScript errors, Core Web Vitals, user session timing) requires different tools; topic 269 covers Sentry for error tracking and Datadog RUM for frontend performance monitoring, with integration points back to the same Grafana environment
- **Topic 270 — Alert Strategy** — Grafana provides the alerting mechanism; topic 270 covers WHAT to alert on, alert severity routing (warning to Slack vs critical to PagerDuty), SLO error budget burn rate alerting, and how to avoid alert fatigue from over-alerting — the strategic layer that determines whether Grafana alerts are actionable or noisy

---

*Part 16 · Grafana Dashboards · Full Stack Interview Guide · Hruday D · 2026*
