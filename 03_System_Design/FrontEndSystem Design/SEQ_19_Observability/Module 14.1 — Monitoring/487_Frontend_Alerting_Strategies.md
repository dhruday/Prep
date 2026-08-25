# 487 — Frontend Alerting Strategies
## Thresholds, PagerDuty, Slack Integration & Alert Fatigue Prevention

────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

Frontend alerting is the practice of automatically detecting anomalies in client-side behavior — error spikes, performance regressions, availability drops — and routing notifications to the right people at the right urgency level. Unlike backend alerting (where you monitor servers you control), frontend alerting deals with unpredictable environments: thousands of browser versions, flaky networks, and user devices you've never tested on.

The core pipeline is: **Collect metrics → Evaluate against thresholds → Classify severity → Route to channel → Trigger response**. Without this, your users discover your outages before your engineers do.

Most teams treat frontend as a "best-effort" surface — backend gets PagerDuty, frontend gets nothing. At scale (SAP, Microsoft, Adobe), this is a critical gap. A JavaScript crash loop on Chrome 120 can silently affect 40% of users while backend health checks stay green.

────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior/Staff Level)

### A. Why Frontend Needs Its Own Alerting (Not Just Backend)

Backend monitoring catches server failures. Frontend alerting catches **user-facing failures** that backend never sees:

| Failure Mode | Backend Sees It? | Frontend Alert Needed? |
|---|---|---|
| API returns 500 | ✅ Yes | ✅ Yes (user impact) |
| JS bundle fails to load (CDN issue) | ❌ No | ✅ Critical |
| Third-party script crashes page | ❌ No | ✅ Critical |
| LCP regresses from 1.2s → 3.8s | ❌ No | ✅ Yes |
| CLS spike after deploy | ❌ No | ✅ Yes |
| Rage clicks on broken checkout button | ❌ No | ✅ Yes |
| CSP violation blocking features | ❌ No | ✅ Yes |
| Memory leak causing tab crashes | ❌ No | ✅ Yes |

The gap is clear: backend health ≠ user experience health.

### B. Types of Frontend Alerts

**1. Error Rate Alerts**
- JavaScript unhandled exception rate exceeds threshold
- Specific error signature appears (e.g., `ChunkLoadError` after deploy)
- Error rate per route/page exceeds baseline

**2. Performance Degradation Alerts**
- LCP p75 exceeds budget (e.g., > 2.5s)
- CLS p75 exceeds threshold (e.g., > 0.1)
- INP p75 exceeds budget (e.g., > 200ms)
- TTFB regression (often signals backend/CDN issue)
- Long Task duration spikes

**3. API Failure Rate Alerts**
- Fetch/XHR error rate from client perspective
- API latency p95 from client (includes network)
- Specific endpoint failure rate (e.g., `/api/checkout` > 5% errors)

**4. User Behavior Anomaly Alerts**
- Rage click detection (3+ clicks on same element within 1s)
- Dead click detection (clicks producing no DOM change or navigation)
- Form abandonment rate spike
- Sudden drop in conversion funnel completion

**5. Availability/Synthetic Alerts**
- Synthetic monitor fails (Lighthouse CI, Checkly, Datadog Synthetic)
- Real User Monitoring (RUM) shows zero sessions (potential total outage)
- Session count drops below statistical baseline

### C. Alert Thresholds — Static vs Dynamic

**Static Thresholds:**
```
IF error_rate > 5% for 5 minutes → ALERT
IF LCP_p75 > 2500ms for 10 minutes → ALERT
IF JS_error_count > 100 in 5 minutes → ALERT
```
Simple, predictable, but brittle. A marketing campaign doubles traffic and static thresholds fire false positives.

**Dynamic/Anomaly Detection Thresholds:**
```
IF error_rate > 2 standard deviations above 7-day rolling average → ALERT
IF LCP_p75 deviates > 30% from same-hour-last-week baseline → ALERT
IF session_count drops > 50% compared to same-hour-yesterday → ALERT
```
Adapts to traffic patterns. More complex to implement but drastically reduces false positives.

**SLO-Based Alerting (Recommended at Scale):**
```
SLO: 99.5% of page loads complete without JS error
Error Budget: 0.5% over 30-day window
ALERT when: burn rate exceeds 10x (fast burn) or 2x (slow burn)
```
This is the gold standard. Instead of alerting on momentary spikes, you alert when you're consuming your error budget too fast.

**Burn Rate Calculation:**
```
burn_rate = (errors_in_window / total_in_window) / (1 - SLO_target)

// If SLO = 99.5%, error budget = 0.5%
// If current error rate = 2.5% over 1 hour
// burn_rate = 0.025 / 0.005 = 5x → alert if > 2x slow burn threshold
```

### D. Alert Routing — Severity Classification

```
┌─────────────────────────────────────────────────────┐
│                  ALERT GENERATED                     │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  CLASSIFY (P1-P4)│
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐──────────────┐
        ▼              ▼              ▼              ▼
   ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
   │   P1   │    │   P2   │    │   P3   │    │   P4   │
   │Critical│    │  High  │    │ Medium │    │  Low   │
   └───┬────┘    └───┬────┘    └───┬────┘    └───┬────┘
       │             │             │             │
       ▼             ▼             ▼             ▼
  PagerDuty/     Slack         Slack          Email/
  OpsGenie    #critical     #frontend-      Jira ticket
  (wake up)   channel        alerts         (async)
  + Slack     + @team       + dashboard
  + Phone     mention        link
```

**P1 — Critical (Immediate Response, < 15 min):**
- Total site down / blank page for > 1% of users
- Checkout/payment flow broken
- JS error rate > 25% sustained for 5+ minutes
- Zero RUM sessions detected (total outage signal)
- Authentication completely broken

**P2 — High (Respond within 1 hour):**
- Error rate 5-25% for a significant route
- Core Web Vitals severe regression (LCP > 4s, CLS > 0.25)
- Critical feature broken (search, navigation)
- API failure rate > 10% from client

**P3 — Medium (Respond within 4 hours / next business day):**
- Error rate 1-5% on non-critical pages
- Performance regression (LCP > 2.5s but < 4s)
- Rage clicks detected on non-critical flows
- Third-party script failures (analytics, chat widget)

**P4 — Low (Informational, sprint backlog):**
- Console warnings spike
- Minor CLS on non-conversion pages
- Deprecated API usage detected
- Browser compatibility warnings

### E. Sentry Alert Rules Configuration

Sentry provides native alert rule configuration:

**Issue Alerts** — Trigger on new/recurring errors:
- When: A new issue is created in project `frontend-app`
- Filter: Event occurs > 50 times in 10 minutes
- Filter: Error is NOT in ignored list (`ResizeObserver loop`, `Network Error`)
- Action: Send to Slack `#frontend-critical` + PagerDuty

**Metric Alerts** — Trigger on aggregated metrics:
- When: `p75(transaction.duration)` on transaction `page-load` > 3000ms
- For 10 minutes continuously
- Action: Send to Slack `#performance-alerts`

**Alert Rules Noise Reduction:**
- Use `issue.priority` to auto-classify
- Fingerprint similar errors (custom fingerprinting rules)
- Ignore known browser extension errors
- Filter by release to catch deploy regressions

### F. Datadog RUM Alerting

Datadog RUM provides metric-based alerting on real user data:

- **RUM Error Rate Monitor:** Alert when `rum.error_count / rum.session_count` exceeds threshold
- **Performance Monitor:** Alert on `rum.lcp.p75` exceeding Web Vitals budget
- **Custom Facet Monitors:** Alert on business-specific metrics (checkout completion rate)
- **Composite Monitors:** Combine multiple conditions (high error rate AND low session count = potential outage)

### G. Alert Fatigue Prevention

Alert fatigue is the #1 killer of alerting systems. Engineers start ignoring alerts, and real incidents get missed.

**Strategies:**

1. **Grouping:** Collapse 500 `ChunkLoadError` events into one alert with count
2. **Deduplication:** Same alert fingerprint within cooldown period → update existing, don't create new
3. **Cooldown Periods:** After alert fires, suppress re-fire for N minutes (e.g., 30 min for P2)
4. **SLO-Based Alerting:** Only alert when error budget is being consumed too fast
5. **Adaptive Thresholds:** Use anomaly detection instead of static numbers
6. **Actionability Rule:** Every alert must have a runbook. If there's no action to take, delete the alert
7. **Regular Alert Review:** Monthly review of alert-to-incident ratio. Target > 50% of alerts leading to real action
8. **Escalation Decay:** P3 that hasn't been acknowledged in 24h → auto-close, not escalate

**Alert Health Metrics to Track:**
```
Signal-to-Noise Ratio = Real incidents / Total alerts fired
MTTA (Mean Time to Acknowledge) for each severity
MTTR (Mean Time to Resolve) for frontend incidents
Alert volume per week (trending up = fatigue risk)
Percentage of alerts auto-resolved (too high = noisy)
```

### H. Runbook Templates for Frontend Incidents

Every P1/P2 alert needs a linked runbook. Template:

```
## Runbook: [Alert Name]
### 1. What is this alert?
   - What metric triggered, what threshold was crossed
### 2. Immediate Triage (< 5 min)
   - Check: Was there a recent deploy? → Rollback candidate
   - Check: Is it affecting all users or specific segment?
   - Check: Is the backend healthy? (eliminate backend cause)
### 3. Diagnosis Steps
   - Open Sentry → filter by time range → identify error signature
   - Open RUM dashboard → check affected browsers/regions
   - Check CDN status page
   - Check third-party status pages
### 4. Resolution Actions
   - If deploy-related: Roll back via CI/CD
   - If CDN-related: Failover to backup origin
   - If third-party: Enable feature flag to disable integration
### 5. Communication
   - Update #incident Slack channel
   - If customer-facing: Notify support team
### 6. Post-Incident
   - Write incident report within 48 hours
   - Create follow-up tickets
```

### I. Custom Alerting with navigator.sendBeacon

For environments where third-party monitoring tools are restricted or you need custom alerting logic:

`navigator.sendBeacon` is ideal because:
- Guaranteed delivery even during page unload
- Non-blocking (doesn't delay page teardown)
- Survives tab close/navigation
- Uses POST with `keep-alive` semantics

This is the right transport for shipping custom alert data to your own endpoints.

────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

### Example 1: Deploy Regression Detection (SAP-scale)

At SAP, after deploying a micro-frontend update, Lighthouse scores dropped from 95 → 60. Without frontend alerting, this would have been caught by a user complaint days later.

**With alerting pipeline:**
```
T+0:00  Deploy goes live
T+0:02  Synthetic monitor (Lighthouse CI) runs → LCP 1.2s → 3.8s
T+0:03  Metric alert fires: "LCP p75 exceeded 2500ms budget"
T+0:03  Sentry captures new ChunkLoadError (dynamic import path changed)
T+0:04  PagerDuty pages on-call frontend engineer
T+0:06  Engineer opens runbook → sees recent deploy → initiates rollback
T+0:10  Rollback complete, LCP returns to 1.2s
T+0:12  Alert auto-resolves
```
Total user impact: ~10 minutes. Without alerting: potentially hours/days.

### Example 2: Third-Party Script Crash (Adobe/Salesforce Scale)

A chat widget vendor pushes a broken update. Their script throws an unhandled error that crashes the React error boundary, blanking the entire page for users where the script loads.

```
T+0:00  Vendor deploys broken script
T+0:05  JS error rate jumps from 0.3% → 8% (only users with chat widget)
T+0:06  Anomaly detection alert fires (> 2σ above baseline)
T+0:06  Sentry groups errors → fingerprint points to vendor domain
T+0:07  Alert classified P2 (not all users affected, workaround exists)
T+0:08  Slack #frontend-critical receives alert with Sentry link
T+0:15  Engineer toggles feature flag to disable chat widget
T+0:16  Error rate drops to 0.4%
T+0:17  Vendor notified, Jira ticket created for re-enablement
```

### Example 3: SLO Burn Rate Alert

SLO: 99.5% of sessions error-free over 30-day window.
Error budget: 0.5% × 30 days = 3.6 hours of total downtime equivalent.

```
Day 1-15:  Budget consumed: 0.8 hours (on track)
Day 16:    Bad deploy → error rate 3% for 2 hours
           Burn rate = 3% / 0.5% = 6x
           Fast-burn alert fires (threshold: > 5x over 1 hour)
           Budget consumed jumps to 2.8 hours (of 3.6 total)
Day 16:    Fix deployed within 30 minutes
Day 17-30: Remaining budget: 0.8 hours — team operates carefully
```

────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

> **"How would you design a frontend alerting strategy for a large-scale application?"**
>
> "At SAP, when we scaled our micro-frontend platform, I realized backend monitoring alone was blind to a huge class of failures — JavaScript crashes, performance regressions, CDN outages that only affected the client. So I built a multi-layered alerting strategy.
>
> First, I categorized what to alert on: error rate spikes, Core Web Vitals regressions (LCP, CLS, INP), API failures from the client perspective, and user behavior anomalies like rage clicks. Each metric category got its own thresholds.
>
> For thresholds, I moved from static values to anomaly detection — comparing current metrics against a rolling 7-day baseline. This eliminated a ton of false positives we had during traffic spikes. For mature services, I implemented SLO-based alerting with burn rate calculations. Instead of alerting on every momentary spike, we alerted when the error budget was being consumed too fast.
>
> Routing was severity-based: P1 critical alerts (site down, checkout broken) went to PagerDuty and paged the on-call engineer. P2 (significant degradation) went to a Slack critical channel. P3 (minor regressions) went to the team Slack channel. P4 created Jira tickets automatically.
>
> The biggest challenge was alert fatigue. We tackled it with grouping (collapsing duplicate errors), cooldown periods, fingerprinting in Sentry to merge similar issues, and the fundamental rule: every alert must have a runbook with concrete steps. If there's no action an engineer can take, we deleted the alert.
>
> The tooling was Sentry for error tracking with custom alert rules, Datadog RUM for performance monitoring, and custom `sendBeacon`-based collection for business-specific metrics. After implementing this, our mean time to detect frontend incidents dropped from hours to under 5 minutes, and we maintained a signal-to-noise ratio above 60%."

────────────────────────────────────────────────────────────────

## 5. Code Examples

### 5.1 — Sentry SDK Configuration with Performance Monitoring + Alert-Ready Setup

```typescript
// sentry.config.ts
import * as Sentry from "@sentry/react";

const IGNORED_ERRORS: Array<string | RegExp> = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  /Loading chunk \d+ failed/,        // Handled separately via ChunkLoadError alert
  "Network request failed",           // Transient, covered by API failure alerts
  /^Non-Error exception captured/,
  /extensions\//i,                     // Browser extension errors
];

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: `frontend@${process.env.VITE_APP_VERSION}`,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Session Replay for debugging alerts
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,  // Capture 100% of sessions with errors

  integrations: [
    Sentry.browserTracingIntegration({
      tracePropagationTargets: ["api.yourapp.com", /^\/api\//],
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Noise reduction
  ignoreErrors: IGNORED_ERRORS,
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    /hotjar\.com/,
    /googletagmanager\.com/,
  ],

  beforeSend(event, hint) {
    const error = hint.originalException;

    // Tag deploy-related errors for alert grouping
    if (error instanceof Error && error.message.includes("ChunkLoadError")) {
      event.tags = { ...event.tags, alert_category: "deploy_regression" };
      event.level = "fatal";
    }

    // Enrich with user context for alert triage
    event.tags = {
      ...event.tags,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      connection: (navigator as any).connection?.effectiveType ?? "unknown",
    };

    return event;
  },

  beforeSendTransaction(event) {
    // Only send slow transactions (reduces volume, keeps alertable data)
    const duration = event.timestamp! - event.start_timestamp!;
    if (duration < 0.5) return null; // Drop fast transactions
    return event;
  },
});
```

### 5.2 — Custom Error Boundary with Alert-Ready Reporting

```typescript
// AlertableErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  featureName: string;       // For alert routing
  severity: "p1" | "p2" | "p3";
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AlertableErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { featureName, severity } = this.props;

    // Report to Sentry with alert metadata
    Sentry.withScope((scope) => {
      scope.setTag("error_boundary", featureName);
      scope.setTag("alert_severity", severity);
      scope.setTag("component_stack_available", "true");
      scope.setLevel(severity === "p1" ? "fatal" : "error");
      scope.setContext("component_stack", {
        stack: errorInfo.componentStack,
      });
      scope.setFingerprint(["error-boundary", featureName, error.message]);
      Sentry.captureException(error);
    });

    // Send custom beacon for immediate alerting pipeline
    this.sendAlertBeacon(error, featureName, severity);
  }

  private sendAlertBeacon(
    error: Error,
    featureName: string,
    severity: string
  ): void {
    const payload = {
      type: "error_boundary_crash",
      feature: featureName,
      severity,
      error: error.message,
      stack: error.stack?.slice(0, 500),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      sessionId: Sentry.getCurrentScope().getSession()?.sid,
    };

    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    navigator.sendBeacon("/api/v1/frontend-alerts", blob);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default AlertableErrorBoundary;

// Usage:
// <AlertableErrorBoundary featureName="checkout" severity="p1" fallback={<CheckoutFallback />}>
//   <CheckoutFlow />
// </AlertableErrorBoundary>
//
// <AlertableErrorBoundary featureName="recommendations" severity="p3" fallback={<EmptyRecs />}>
//   <RecommendationWidget />
// </AlertableErrorBoundary>
```

### 5.3 — Slack Webhook Alert Sender (Backend Alert Router)

```typescript
// alert-router.ts — Runs on your alerting backend/serverless function
interface FrontendAlert {
  type: string;
  feature: string;
  severity: "p1" | "p2" | "p3" | "p4";
  error: string;
  url: string;
  timestamp: string;
  sessionId?: string;
  metric?: { name: string; value: number; threshold: number };
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: Array<{ type: string; text: string }>;
  fields?: Array<{ type: string; text: string }>;
}

const SLACK_WEBHOOKS: Record<string, string> = {
  p1: process.env.SLACK_WEBHOOK_CRITICAL!,
  p2: process.env.SLACK_WEBHOOK_CRITICAL!,
  p3: process.env.SLACK_WEBHOOK_FRONTEND!,
  p4: process.env.SLACK_WEBHOOK_FRONTEND!,
};

const PAGERDUTY_ROUTING_KEY = process.env.PAGERDUTY_ROUTING_KEY!;

// Deduplication store (use Redis in production)
const recentAlerts = new Map<string, { count: number; lastSeen: number }>();
const COOLDOWN_MS: Record<string, number> = {
  p1: 5 * 60_000,       // 5 min cooldown for P1
  p2: 30 * 60_000,      // 30 min cooldown for P2
  p3: 2 * 60 * 60_000,  // 2 hour cooldown for P3
  p4: 24 * 60 * 60_000, // 24 hour cooldown for P4
};

function getAlertFingerprint(alert: FrontendAlert): string {
  return `${alert.type}:${alert.feature}:${alert.error.slice(0, 100)}`;
}

function shouldSuppress(alert: FrontendAlert): boolean {
  const fingerprint = getAlertFingerprint(alert);
  const existing = recentAlerts.get(fingerprint);
  const now = Date.now();

  if (existing && now - existing.lastSeen < COOLDOWN_MS[alert.severity]) {
    existing.count++;
    existing.lastSeen = now;
    return true; // Suppress — within cooldown
  }

  recentAlerts.set(fingerprint, { count: 1, lastSeen: now });
  return false;
}

async function routeAlert(alert: FrontendAlert): Promise<void> {
  if (shouldSuppress(alert)) {
    console.log(`Alert suppressed (cooldown): ${getAlertFingerprint(alert)}`);
    return;
  }

  // P1: PagerDuty + Slack
  if (alert.severity === "p1") {
    await Promise.all([
      sendToPagerDuty(alert),
      sendToSlack(alert),
    ]);
    return;
  }

  // P2-P4: Slack only
  await sendToSlack(alert);

  // P4: Also create Jira ticket
  if (alert.severity === "p4") {
    await createJiraTicket(alert);
  }
}

async function sendToSlack(alert: FrontendAlert): Promise<void> {
  const severityEmoji: Record<string, string> = {
    p1: "🔴", p2: "🟠", p3: "🟡", p4: "⚪",
  };

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${severityEmoji[alert.severity]} Frontend Alert — ${alert.severity.toUpperCase()}`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Feature:*\n${alert.feature}` },
        { type: "mrkdwn", text: `*Type:*\n${alert.type}` },
        { type: "mrkdwn", text: `*URL:*\n${alert.url}` },
        { type: "mrkdwn", text: `*Time:*\n${alert.timestamp}` },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Error:*\n\`\`\`${alert.error.slice(0, 300)}\`\`\``,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<https://sentry.io/issues/?query=${encodeURIComponent(alert.error.slice(0, 80))}|View in Sentry> | <https://runbooks.internal/frontend/${alert.feature}|Runbook>`,
        },
      ],
    },
  ];

  const webhookUrl = SLACK_WEBHOOKS[alert.severity];
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
}

async function sendToPagerDuty(alert: FrontendAlert): Promise<void> {
  await fetch("https://events.pagerduty.com/v2/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      routing_key: PAGERDUTY_ROUTING_KEY,
      event_action: "trigger",
      dedup_key: getAlertFingerprint(alert),
      payload: {
        summary: `[Frontend ${alert.severity.toUpperCase()}] ${alert.feature}: ${alert.error.slice(0, 120)}`,
        severity: alert.severity === "p1" ? "critical" : "error",
        source: "frontend-alerting",
        component: alert.feature,
        custom_details: {
          url: alert.url,
          error: alert.error,
          timestamp: alert.timestamp,
        },
      },
    }),
  });
}

async function createJiraTicket(_alert: FrontendAlert): Promise<void> {
  // Implementation depends on Jira API setup
}

export { routeAlert, FrontendAlert };
```

### 5.4 — Datadog RUM Custom Metrics for Alerting

```typescript
// datadog-rum-setup.ts
import { datadogRum } from "@datadog/browser-rum";

datadogRum.init({
  applicationId: process.env.VITE_DD_APP_ID!,
  clientToken: process.env.VITE_DD_CLIENT_TOKEN!,
  site: "datadoghq.com",
  service: "frontend-app",
  env: process.env.NODE_ENV,
  version: process.env.VITE_APP_VERSION,
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: "mask-user-input",
});

// Custom metrics that feed into Datadog Monitors (alerts)

export function trackApiCallFromClient(
  endpoint: string,
  durationMs: number,
  statusCode: number,
  success: boolean
): void {
  datadogRum.addAction("api_call", {
    endpoint,
    duration_ms: durationMs,
    status_code: statusCode,
    success,
  });

  // This custom metric can be alerted on:
  // Monitor: avg(api_call.duration_ms) by endpoint > 3000ms for 5 min
  if (!success) {
    datadogRum.addError(new Error(`API failure: ${endpoint} → ${statusCode}`), {
      endpoint,
      status_code: statusCode,
    });
  }
}

export function trackCoreWebVital(
  metric: "LCP" | "CLS" | "INP" | "FCP" | "TTFB",
  value: number,
  rating: "good" | "needs-improvement" | "poor"
): void {
  datadogRum.addAction("web_vital", {
    metric,
    value,
    rating,
    route: window.location.pathname,
  });

  // Alert-worthy: poor rating on critical pages
  if (rating === "poor") {
    datadogRum.addAction("web_vital_poor", {
      metric,
      value,
      route: window.location.pathname,
    });
  }
}

export function trackRageClick(
  element: string,
  clickCount: number,
  selector: string
): void {
  datadogRum.addAction("rage_click", {
    element,
    click_count: clickCount,
    selector,
    url: window.location.href,
  });
}
```

### 5.5 — Alert Threshold Calculator

```typescript
// threshold-calculator.ts

interface MetricSample {
  timestamp: number;
  value: number;
}

interface ThresholdResult {
  staticThreshold: number;
  dynamicThreshold: number;
  currentValue: number;
  isAnomalous: boolean;
  zScore: number;
  burnRate: number | null;
}

function calculateMean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStdDev(values: number[], mean: number): number {
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

export function calculateAlertThreshold(
  historicalData: MetricSample[],
  currentValue: number,
  options: {
    staticThreshold: number;          // Hard limit (e.g., 5% error rate)
    anomalyStdDevMultiplier?: number; // Default 2.0 (2 standard deviations)
    sloTarget?: number;               // e.g., 0.995 for 99.5%
    windowSizeMs?: number;            // Lookback window for burn rate
  }
): ThresholdResult {
  const { staticThreshold, anomalyStdDevMultiplier = 2.0, sloTarget } = options;

  const values = historicalData.map((s) => s.value);
  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);

  const dynamicThreshold = mean + anomalyStdDevMultiplier * stdDev;
  const zScore = stdDev > 0 ? (currentValue - mean) / stdDev : 0;
  const isAnomalous =
    currentValue > staticThreshold || currentValue > dynamicThreshold;

  let burnRate: number | null = null;
  if (sloTarget !== undefined) {
    const errorBudget = 1 - sloTarget;
    const currentErrorRate = currentValue / 100; // Assuming value is percentage
    burnRate = errorBudget > 0 ? currentErrorRate / errorBudget : 0;
  }

  return {
    staticThreshold,
    dynamicThreshold: Math.round(dynamicThreshold * 100) / 100,
    currentValue,
    isAnomalous,
    zScore: Math.round(zScore * 100) / 100,
    burnRate: burnRate !== null ? Math.round(burnRate * 100) / 100 : null,
  };
}

// Usage example:
// const last7Days: MetricSample[] = await fetchHistoricalErrorRate("7d");
// const current = getCurrentErrorRate();
// const result = calculateAlertThreshold(last7Days, current, {
//   staticThreshold: 5,          // 5% hard limit
//   anomalyStdDevMultiplier: 2,  // 2σ above mean
//   sloTarget: 0.995,            // 99.5% SLO
// });
//
// if (result.isAnomalous) triggerAlert("p2", result);
// if (result.burnRate && result.burnRate > 5) triggerAlert("p1", result);
```

────────────────────────────────────────────────────────────────

## 6. Why & How Summary

### Why Frontend Alerting Matters

| Without Frontend Alerting | With Frontend Alerting |
|---|---|
| Users report bugs via support tickets | Engineers detect issues before users notice |
| Hours/days to detect JS crash loops | < 5 minutes to detect and respond |
| No visibility into CWV regressions | Automated regression detection per deploy |
| Backend green ≠ users happy | True user experience health monitoring |
| No on-call for frontend | Frontend on-call with clear escalation paths |

### How to Implement (Priority Order)

1. **Week 1:** Set up Sentry with noise-filtered error tracking. Add error boundaries with severity tags.
2. **Week 2:** Configure Sentry alert rules — P1 errors → PagerDuty, P2 → Slack. Write runbooks for top 5 known failure modes.
3. **Week 3:** Add Datadog RUM or web-vitals library. Set up CWV monitoring with anomaly-based thresholds.
4. **Week 4:** Implement alert deduplication and cooldown. Build Slack webhook integration for custom alerts.
5. **Month 2:** Move to SLO-based alerting with burn rate. Establish monthly alert review process. Track signal-to-noise ratio.

### Anti-Patterns to Avoid

| Anti-Pattern | Why It's Harmful | Correct Approach |
|---|---|---|
| Alert on every single error | Alert fatigue → engineers ignore all alerts | Group, deduplicate, use rate-based thresholds |
| No P1/P2/P3 classification | Everything feels urgent → nothing is | Strict severity matrix with clear criteria |
| Missing runbooks | Engineer gets paged, has no idea what to do | Every alert links to a runbook |
| Static thresholds only | False positives during traffic spikes | Anomaly detection + SLO-based burn rate |
| No frontend on-call rotation | "That's a backend problem" response | Dedicated frontend on-call with escalation |
| Alerting on vanity metrics | High volume, low signal | Only alert on user-impacting metrics |
| No cooldown periods | Same alert fires every 30 seconds | Cooldown: P1=5min, P2=30min, P3=2hr |
| Third-party errors mixed in | Overwhelms real error signal | Filter by domain, separate third-party alerts |

────────────────────────────────────────────────────────────────

*Prepared by Hruday — SAP Labs · Lighthouse 60→95 · Micro-frontend architecture at scale*
*Target: Senior/Staff Frontend roles at Microsoft, Adobe, Salesforce, Cisco*
