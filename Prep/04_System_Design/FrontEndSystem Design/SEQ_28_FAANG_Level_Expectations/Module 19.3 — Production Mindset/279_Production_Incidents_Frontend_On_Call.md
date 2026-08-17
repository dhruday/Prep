# 279 – Production Incidents — Frontend On-Call

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Frontend on-call means being responsible for **detecting, triaging, and resolving production issues** affecting user experience. Key responsibilities: monitoring dashboards (error rates, Core Web Vitals), responding to alerts (Sentry, PagerDuty), debugging production with source maps and session replays, and coordinating hotfixes. In interviews, showing production incident experience demonstrates ownership and production maturity — signals that you've shipped and maintained real systems.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The Incident Response Flow

```
DETECT → TRIAGE → MITIGATE → FIX → POSTMORTEM

DETECT: Alert fires (Sentry error spike, Lighthouse CI failure, 
        DataDog RUM anomaly, user reports)

TRIAGE: Severity classification
├── P0: Complete feature broken for all users → immediate fix
├── P1: Major feature degraded for many users → fix within hours
├── P2: Minor issue affecting some users → fix within sprint
└── P3: Cosmetic/low-impact → backlog

MITIGATE: Stop the bleeding BEFORE root causing
├── Feature flag toggle (kill the broken feature)
├── Rollback to previous deployment
├── CDN cache purge (if serving stale/broken assets)
└── Client-side fallback (error boundary showing degraded UI)

FIX: Root cause analysis + permanent fix
├── Check Sentry for error stack traces
├── Replay user session (FullStory/LogRocket)
├── Check recent deployments (git blame the timeline)
└── Fix + test + deploy with feature flag for gradual rollout

POSTMORTEM: Learn and prevent
├── Timeline of events
├── Root cause analysis
├── What went well / what didn't
├── Action items (monitoring, tests, process changes)
```

### Frontend-Specific Incident Patterns

```
1. JS error spike after deployment → source maps + Sentry → rollback
2. Layout shift on mobile → CSS change + missing responsive breakpoint
3. API timeout causing blank screens → missing error boundary + no fallback
4. Third-party script failure → no async/defer + no error isolation
5. Memory leak over time → detached DOM nodes from SPA navigation
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I was part of the on-call rotation for our Fiori applications. I handled production incidents including: JavaScript errors from OData service changes, layout issues from responsive breakpoints on specific devices, and performance degradation from memory leaks in long-running dashboard sessions. Each incident followed our detect → triage → mitigate → fix → postmortem process.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I follow a structured incident response: Detect (Sentry alerts, RUM anomalies), Triage (P0-P3 severity), Mitigate immediately (feature flag toggle or rollback — don't root-cause while users are affected), then Fix permanently, and finally write a blameless Postmortem. At SAP, I resolved production incidents including OData-related JS errors and memory leaks in dashboard sessions."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Production-ready error boundary with reporting
class ProductionErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report to monitoring (Sentry)
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    // Log to internal dashboard
    analytics.track('frontend_error', { error: error.message, stack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Usage: isolate features so one failure doesn't break the page
<ProductionErrorBoundary fallback={<FallbackUI message="Dashboard unavailable" />}>
  <Dashboard />
</ProductionErrorBoundary>
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"DTMFP = Detect, Triage, Mitigate, Fix, Postmortem."** Mitigate first (feature flag/rollback), then root-cause. Error boundaries isolate failures. P0 = immediate, P1 = hours, P2 = sprint. Always write a blameless postmortem.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Production incident handling shows ownership and operational maturity — critical for senior roles.
**How:** DTMFP process. Error boundaries, feature flags for quick mitigation, source maps for debugging, blameless postmortems.
**Companies:** All four have on-call. Microsoft and Cisco especially value production reliability.
