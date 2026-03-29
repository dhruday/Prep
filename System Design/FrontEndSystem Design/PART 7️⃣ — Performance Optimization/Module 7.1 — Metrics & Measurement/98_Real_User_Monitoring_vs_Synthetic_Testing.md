# 98. Real User Monitoring (RUM) vs Synthetic Testing

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Real User Monitoring (RUM)** captures performance data from actual users loading your production site on real devices and real network conditions. **Synthetic Testing** runs scripted performance audits on a controlled machine under simulated conditions (like Lighthouse CI or WebPageTest). Both are essential — they answer different questions. RUM tells you *what your real users are experiencing right now*; synthetic tells you *whether a code change will make things worse before it ships*. In production at scale, you need both: synthetic as a regression gate in CI, RUM as the truth of what's happening in the field. Relying on only one creates dangerous blind spots — synthetic misses regional network issues, device fragmentation, and third-party failures; RUM misses regressions before they reach users.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Architecture Diagram

```
SYNTHETIC (Lab)                       RUM (Field)
─────────────────────────             ──────────────────────────────
CI Pipeline → Build → Serve          Real users load production site
     ↓                                     ↓
 Lighthouse / WebPageTest            web-vitals.js collects CWV
     ↓                                     ↓
Controlled hardware                  User's real device (iOS, Android,
Simulated throttling                 Windows, Mac — all hardware)
One URL at a time                    Real network (3G India, 5G NYC)
     ↓                                     ↓
Deterministic, reproducible          Probabilistic — p75, p95 percentiles
Detects regressions pre-ship         Detects real-world degradation post-ship
```

### RUM Implementation: web-vitals Library

```typescript
// src/monitoring/rum.ts
import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

interface RUMPayload {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: string;
  url: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
}

// Derive device type from screen width
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.screen.width;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Derive connection type from Network Information API
function getConnectionType(): string {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
  };
  return nav.connection?.effectiveType ?? 'unknown';
}

const SESSION_ID = crypto.randomUUID();

function sendToAnalytics(metric: Metric): void {
  const payload: RUMPayload = {
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    deviceType: getDeviceType(),
    connectionType: getConnectionType(),
    url: window.location.pathname,
    sessionId: SESSION_ID,
    timestamp: Date.now(),
  };

  // Use sendBeacon for off-main-thread, non-blocking delivery
  // Critical: sendBeacon works even when page is unloading
  const body = JSON.stringify(payload);
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/rum', body);
  } else {
    // Fallback for older browsers
    fetch('/api/rum', {
      method: 'POST',
      body,
      keepalive: true, // ensures request completes even if page unloads
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Register all Core Web Vitals
export function initRUM(): void {
  onCLS(sendToAnalytics);   // Cumulative Layout Shift
  onFCP(sendToAnalytics);   // First Contentful Paint
  onINP(sendToAnalytics);   // Interaction to Next Paint (replaced FID)
  onLCP(sendToAnalytics);   // Largest Contentful Paint
  onTTFB(sendToAnalytics);  // Time to First Byte
}
```

### What RUM Reveals That Synthetic Cannot

| Scenario | Synthetic | RUM |
|---|---|---|
| 3G users in India | Simulated throttle | Real 3G data |
| iOS Safari quirk | Run on Chrome/Linux | Caught from real Safari users |
| CDN edge failure in São Paulo | Tests from fixed location | Caught by São Paulo users' data |
| Third-party script timing out | Often excluded in CI | Full picture |
| Users with 50 tabs open | Clean machine | Memory-constrained real device |
| Cold start vs warm cache | Only cold start | Both, identifiable by navigationTime |

### RUM Data Analysis: The Percentile Trap

```typescript
// WRONG: Average hides the long tail
const avgLCP = sum(lcpValues) / lcpValues.length;
// A p95 of 8000ms with a p50 of 1500ms gives avg ~2000ms → looks fine → ISN'T fine

// RIGHT: Use percentiles
// p50 = median user experience
// p75 = what Google uses for CWV pass/fail (75th percentile must be good)
// p95 = the worst 5% — often enterprise users on VPNs, old devices
// p99 = worst 1% — identify outlier issues

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}
```

### Synthetic Tools Comparison

| Tool | Use Case | Cost | Free Tier |
|---|---|---|---|
| Lighthouse CI | Pre-merge gate | Free | Yes |
| WebPageTest | Deep waterfall analysis | Free | Yes |
| Calibre | Team-oriented monitoring | Paid | Trial |
| SpeedCurve | Executive dashboards | Paid | No |
| k6 / Playwright + CWV | Custom scripted flows | Free | Yes |

### Segmentation in RUM (Critical for actionability)

```typescript
// Always segment RUM data — global averages are useless
// Dashboard dimensions:
// - Device type (mobile vs desktop)
// - Connection type (4G vs WiFi vs 3G)  
// - Geography (US-East vs EU-West vs APAC)
// - Page type (landing vs SPA route transition)
// - User cohort (authenticated vs anonymous)
// - Build version (catch regressions by deploy)

// Tag all RUM events with build version for regression correlation
const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_ID ?? 'unknown';

function sendToAnalytics(metric: Metric): void {
  const payload = {
    ...buildBasePayload(metric),
    buildVersion: BUILD_VERSION,  // ← correlate spikes with deploys
  };
  navigator.sendBeacon('/api/rum', JSON.stringify(payload));
}
```

### Performance Anti-Patterns

- **Sending on every interaction**: Rate-limit RUM beacons — send all metrics once on `visibilitychange: hidden`
- **Not sampling at scale**: At 10M users, log 100% of RUM = 10M events/day. Sample 10% for cost control; 100% for p99 analysis
- **Trusting only synthetic scores**: A Lighthouse 95 in CI + p95 LCP of 6000ms in India is a real failure masking as success
- **No version tagging**: You can't correlate RUM spikes to specific deploys without build version in the payload
- **Measuring after hydration completes**: `DOMContentLoaded` is irrelevant for React SPAs — measure CWV which are paint/interaction based

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**SAP Fiori (Hruday's context):**
After the Lighthouse 60→95 improvement, synthetic said "done". But RUM would have revealed that users in India on 4G still saw p75 LCP of 4200ms — the CDN was not caching API responses for the Indian edge node. Synthetic, running from a local server, never caught it.

**Google:**
Chrome User Experience Report (CrUX) is Google's public RUM dataset — they collect CWV from Chrome users globally and this is what Google Search uses to determine CWV pass/fail for SEO. Synthetic Lighthouse doesn't determine your Google ranking — real user CrUX data does.

**Microsoft Teams:**
Teams uses RUM segmented by: device OS, Teams version, network type. A Teams desktop regression on Windows 11 + VPN was caught by p95 INP spike in RUM, invisible to synthetic because it was related to a Windows 11 screen reader API call only on authenticated enterprise users.

**Scaling:**
- 1K users → Lighthouse CI is sufficient; RUM is optional
- 100K users → RUM p75 by country becomes actionable
- 10M users → RUM by device × connection × region is the primary performance truth

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "I think of Synthetic and RUM as two phases of a performance feedback loop. Synthetic — specifically Lighthouse CI — is my **regression gate**: it prevents bad code from shipping by running controlled audits on every PR and failing the build if LCP exceeds 2500ms. But Lighthouse runs on a single simulated machine with throttled chrome, missing the fragmentation of real devices and real networks. RUM — via the `web-vitals` library with `navigator.sendBeacon` — is my **production truth**. At SAP, after we hit Lighthouse 95, I set up RUM to collect p75 LCP segmented by country and device type. That revealed our German users on mobile had p75 LCP of 3900ms despite clean CI scores, because the regional CDN wasn't caching our API responses correctly. Synthetic never would have found it — that insight came from real users. I always recommend both: synthetic as the pre-ship gate, RUM as the post-ship signal."

**Likely Follow-up Questions:**
1. *Which percentile does Google use for CWV pass/fail?* → p75 of real user field data from CrUX
2. *How do you avoid impacting performance by collecting RUM?* → `sendBeacon` is off-main-thread; collect once on `visibilitychange`, not per interaction
3. *How would you correlate a RUM spike to a specific deploy?* → Tag every beacon with `buildVersion` from env var; filter RUM data by deploy time
4. *What's the CrUX report and how does it differ from Lighthouse?* → CrUX is Google's 28-day rolling real user dataset from Chrome; Lighthouse is a lab simulation; CrUX is what Google Search uses for CWV ranking signal
5. *How do you sample RUM at scale?* → Send 10% of sessions for cost control; increase to 100% temporarily after major releases; always send 100% for p99 analysis window

**Comparison Table:**

| Dimension | Synthetic (Lighthouse) | RUM (web-vitals) |
|---|---|---|
| Data source | Scripted lab run | Real users in production |
| Timing | Pre-ship (CI) | Post-ship (production) |
| Consistency | Deterministic | Variable (real conditions) |
| Coverage | Pre-defined URLs | All pages, all users |
| Best for | Regression prevention | Real-world truth |
| Google ranking signal | No | Yes (CrUX) |
| Latency of insight | Immediate (per PR) | Requires traffic volume |

**How to Explain Trade-offs Verbally:**
> "Synthetic is fast feedback with low variance — it tells me a change regressed LCP before anyone sees it. RUM is slow feedback with high fidelity — it tells me what real users actually experience, including things synthetic can never simulate. The right answer is always both. If I had to pick one — in a team without CI discipline I'd prioritize RUM because real user data outranks controlled lab scores every time."

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (RUM with Sampling + Error Boundary)
────────────────────────────────────────────────────────────

```typescript
// src/monitoring/rum.ts — production-grade implementation

import { onCLS, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

const SAMPLE_RATE = 0.1; // 10% of users — adjust post-launch

function shouldSample(): boolean {
  return Math.random() < SAMPLE_RATE;
}

const isSampled = shouldSample();
const sessionId = crypto.randomUUID();
const buildVersion = (window as Window & { __BUILD_VERSION__?: string }).__BUILD_VERSION__ ?? 'unknown';

function sendMetric(metric: Metric): void {
  if (!isSampled) return;

  const payload = {
    name: metric.name,
    value: Math.round(metric.value),   // round ms to integer
    rating: metric.rating,
    url: location.pathname,
    referrer: document.referrer,
    sessionId,
    buildVersion,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    connection: (navigator as Navigator & { connection?: { effectiveType?: string } })
      .connection?.effectiveType,
    timestamp: Date.now(),
  };

  try {
    navigator.sendBeacon?.('/api/rum', JSON.stringify(payload));
  } catch {
    // Never crash the page for analytics failures
  }
}

export function initRUM(): void {
  // Only load on client — avoid SSR double-run
  if (typeof window === 'undefined') return;

  onCLS(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
  onTTFB(sendMetric);
}
```

```typescript
// Integration in React app root
// src/app/layout.tsx (Next.js 14 App Router)
'use client';
import { useEffect } from 'react';
import { initRUM } from '@/monitoring/rum';

export function RUMProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initRUM();
  }, []);
  return <>{children}</>;
}
```

**Why this structure:**
- `shouldSample()` is called once per session — consistency within a session
- `sendBeacon` is non-blocking and survives page unload (critical for LCP/CLS that fire late)
- `try/catch` ensures analytics never crash the page
- `buildVersion` enables deploy-correlated regression analysis

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"Synthetic = lab coat, RUM = stethoscope."**

- Synthetic: controlled, repeatable, pre-ship, catches regressions, but artificial
- RUM: real, messy, post-ship, catches real-world issues, is what Google actually measures

**Three things always say:**
1. **Synthetic is pre-ship CI gate** — metric budgets, not score thresholds
2. **RUM is production truth** — p75 by segment (device × region × version)  
3. **CrUX is what Google Search uses** — synthetic Lighthouse score has zero SEO impact

**If you go blank:** "Synthetic simulates one user on a controlled machine; RUM measures all real users. Both are required — synthetic before ship, RUM after ship."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **SEO**: Google CWV ranking uses real user CrUX data, not Lighthouse scores — RUM is your SEO signal
→ **User retention**: 1 second LCP improvement = 7% conversion increase (Google study)
→ **Engineering accountability**: Without RUM, performance is invisible post-ship

**How it works:**
→ RUM: `web-vitals` library hooks into PerformanceObserver API, captures CWV events, batches them, and sends via `navigator.sendBeacon` on page hide. Synthetic: runs Lighthouse in CI against a locally served build, compares against configured budgets, fails the pipeline if exceeded.

**Company relevance:**
→ **Microsoft**: Azure Monitor + Application Insights is their RUM stack; Hruday should understand how to instrument web-vitals into AppInsights
→ **Adobe**: Analytics Cloud team uses both — synthetic for Creative Cloud web app regressions, RUM for real user experience scores
→ **Salesforce**: Lightning Experience instruments RUM via UE (User Engagement) platform; p75 INP on CRM workflows is a key SLA metric
→ **Cisco**: WebEx web client uses RUM to monitor meeting join latency — a purely synthetic-tested metric would miss real network-path issues
