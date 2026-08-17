# 283 – SLO / SLA Awareness for Frontend Engineers

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

**SLA** (Service Level Agreement) is a **contract** with customers guaranteeing availability/performance. **SLO** (Service Level Objective) is an **internal target** that's stricter than the SLA to provide a safety margin. **SLI** (Service Level Indicator) is the **metric** that measures compliance. Frontend SLOs include: page load time (LCP < 2.5s), error rate (< 0.1%), availability (99.9%), and interaction responsiveness (INP < 200ms). Knowing these concepts shows you think about frontend as a business-critical system, not just UI code.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### SLI → SLO → SLA Relationship

```
SLI (what you measure):     LCP for the dashboard page
SLO (internal target):      LCP < 2.0s for 99% of page loads
SLA (customer contract):    LCP < 3.0s for 95% of page loads
Error Budget:               1% of requests can exceed SLO before action required
```

### Frontend SLOs

| SLI | SLO Target | How to Measure |
|-----|------------|----------------|
| LCP (Largest Contentful Paint) | < 2.5s at p75 | RUM (DataDog, web-vitals) |
| INP (Interaction to Next Paint) | < 200ms at p75 | RUM |
| CLS (Cumulative Layout Shift) | < 0.1 at p75 | RUM |
| JS Error Rate | < 0.1% of sessions | Sentry |
| API Success Rate | > 99.9% | Custom metrics |
| Availability | > 99.9% (8.7h downtime/year) | Synthetic monitoring |

### Error Budget Concept

```
SLO: 99.9% availability = 8.7 hours downtime allowed per year

If you've used 6 hours in Q1-Q3:
  Remaining budget: 2.7 hours for Q4
  Action: slow down risky deployments, increase testing

If you've used 1 hour in Q1-Q3:
  Remaining budget: 7.7 hours
  Action: safe to deploy more aggressively, take on riskier features
```

### Measuring Frontend SLOs in Practice

```typescript
// Report Core Web Vitals to your monitoring service
import { onLCP, onINP, onCLS } from 'web-vitals';

function reportMetric(metric: { name: string; value: number }) {
  // Send to DataDog / custom endpoint
  navigator.sendBeacon('/api/metrics', JSON.stringify({
    name: metric.name,
    value: metric.value,
    page: window.location.pathname,
    timestamp: Date.now(),
  }));
}

onLCP(reportMetric);
onINP(reportMetric);
onCLS(reportMetric);
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, our enterprise applications had SLAs with customers for uptime (99.9%) and performance. I tracked frontend SLOs using Lighthouse CI (performance score > 90) and custom RUM metrics. When our LCP exceeded the SLO threshold, I prioritized bundle optimization that brought it back within target.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I think of frontend in SLO terms: LCP < 2.5s at p75, INP < 200ms, error rate < 0.1%, availability 99.9%. I measure with RUM (web-vitals library) and track error budget — if we've consumed most of our error budget, I slow down risky deployments. At SAP, our enterprise SLAs required 99.9% uptime; I tracked frontend SLOs with Lighthouse CI and custom metrics."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// SLO dashboard component
interface SLOMetric {
  name: string;
  current: number;
  target: number;
  unit: string;
  status: 'green' | 'yellow' | 'red';
}

const frontendSLOs: SLOMetric[] = [
  { name: 'LCP (p75)', current: 1.8, target: 2.5, unit: 's', status: 'green' },
  { name: 'INP (p75)', current: 150, target: 200, unit: 'ms', status: 'green' },
  { name: 'CLS (p75)', current: 0.05, target: 0.1, unit: '', status: 'green' },
  { name: 'Error Rate', current: 0.08, target: 0.1, unit: '%', status: 'yellow' },
  { name: 'Availability', current: 99.95, target: 99.9, unit: '%', status: 'green' },
];

// Error budget calculation
const annualMinutes = 365 * 24 * 60; // 525,600
const sloTarget = 0.999; // 99.9%
const allowedDowntime = annualMinutes * (1 - sloTarget); // 525.6 minutes = 8.76 hours
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"SLI = what you measure, SLO = internal target, SLA = customer contract."** Frontend SLOs: LCP < 2.5s, INP < 200ms, CLS < 0.1, Error Rate < 0.1%, Availability 99.9%. Error budget = allowed downtime. Measure with web-vitals library + RUM.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** SLO awareness shows you treat frontend as a business-critical service, not just UI code. Staff-level production thinking.
**How:** Define SLIs (Core Web Vitals, error rate), set SLOs (stricter than SLA), track error budget, measure with RUM.
**Companies:** **Microsoft** (Azure SLAs culture), **Salesforce** (Trust.salesforce.com), **Cisco** (enterprise reliability), **Adobe** (creative tool uptime).
