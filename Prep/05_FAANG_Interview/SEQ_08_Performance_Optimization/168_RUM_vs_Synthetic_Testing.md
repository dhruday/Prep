# 168. Real User Monitoring (RUM) vs Synthetic Testing
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"I use both RUM and synthetic testing for opposite purposes: synthetic testing catches regressions before they ship, RUM tells you what real users actually experience. At SAP, our Lighthouse CI score was 95 in the lab but a production RUM sample revealed that 20% of users — those on Windows Chrome with 4G via corporate VPN — experienced LCP of 3.8s. The lab test runs in an Apple M2 CI runner with giga-LAN; it can't replicate a corporate proxy, a 4G connection, or an overloaded laptop CPU. We added field instrumentation using the `web-vitals` library, piped data to Datadog, and discovered the VPN users triggered a specific CDN bypass to an origin server 2,000km away. That's impossible to find in lab testing alone. The complete picture requires both: synthetic for deterministic regression gating, RUM for real-world truth about which users are actually experiencing slowness."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Definitions

**Synthetic Testing (Lab Testing):**
Automated, scripted measurement of a web page in a controlled environment. A headless browser (typically Chrome/Chromium) loads the page from a fixed network location with simulated throttling. Results are **reproducible** (same code = same score within variance bounds) and run on-demand or in CI.

**Real User Monitoring (RUM):**
Measurement of performance as experienced by actual users in production. A small JavaScript snippet runs in users' browsers, collects `PerformanceObserver` data, and sends it to an analytics backend. Results reflect **real-world conditions** — real devices, real networks, real geographic distribution, real browser versions, real plugin/extension interference.

### The Fundamental Difference

```
Synthetic Testing                    RUM
─────────────────                    ───
"Does it work in ideal conditions?"  "How does it work for real users?"
Controlled environment               Uncontrolled, real-world
Reproducible                         Statistical (variance from real conditions)
Pre-production (CI gate)             Production only (can't be in CI)
Single device / network              Thousands of device + network combos
Fast feedback (minutes)              Statistical significance takes days
No real users required               Requires production traffic
No privacy implications              Privacy-sensitive (user data)
```

### Synthetic Testing Tools

| Tool | Use Case | Key Feature |
|------|----------|-------------|
| **Lighthouse** | Local dev + LHCI | Free, Google official, detailed opportunities |
| **WebPageTest** | Deep waterfall analysis | Real device, multi-step scripting, filmstrip view |
| **Playwright** | Scripted interaction testing | Measure INP for scripted user interactions |
| **Calibre** | CI + performance tracking | Dashboard + trending + team alerts |
| **SpeedCurve** | Executive dashboards | Beautiful trend charts, competitive analysis |

### RUM Tools

| Tool | Use Case | Key Feature |
|------|----------|-------------|
| **web-vitals (Google)** | DIY RUM foundation | Exact CrUX methodology, open source |
| **Datadog RUM** | Enterprise monitoring | Full stack correlation, session replay |
| **Sentry Performance** | Error + perf correlation | Link slow transactions to errors |
| **SpeedCurve LUX** | Premium RUM | User-centric timing, segmentation |
| **Dynatrace** | Enterprise APM | Distributed tracing to frontend |
| **New Relic Browser** | Full-stack teams | APM + frontend unified |
| **Chrome CrUX** | Google's field data | Free, Google's source for ranking |

### The RUM Data Pipeline

```typescript
// 1. Browser collects metrics via web-vitals
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

// 2. Enrich with context (page, user segment, device class)
interface RUMPayload {
  vitals: Array<{
    name: string;
    value: number;
    rating: string;
    id: string;
  }>;
  context: {
    url: string;
    connection?: string;   // navigator.connection.effectiveType
    deviceMemory?: number; // navigator.deviceMemory (GB)
    hardwareConcurrency: number;
    viewport: { width: number; height: number };
    userAgent: string;
  };
  sessionId: string;
  timestamp: number;
}

function buildContext(): RUMPayload['context'] {
  const conn = (navigator as any).connection;
  return {
    url: location.href,
    connection: conn?.effectiveType,          // '4g', '3g', '2g', 'slow-2g'
    deviceMemory: (navigator as any).deviceMemory, // devices with < 1GB = low-end
    hardwareConcurrency: navigator.hardwareConcurrency,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    userAgent: navigator.userAgent,
  };
}

// 3. Batch and send
const vitalsBuffer: RUMPayload['vitals'] = [];

function collectVital(metric: any): void {
  vitalsBuffer.push({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
  });
}

onLCP(collectVital);
onINP(collectVital);
onCLS(collectVital);
onFCP(collectVital);
onTTFB(collectVital);

// Send on page hide (most reliable flush point)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && vitalsBuffer.length > 0) {
    const payload: RUMPayload = {
      vitals: vitalsBuffer,
      context: buildContext(),
      sessionId: getSessionId(),    // from sessionStorage or cookie
      timestamp: Date.now(),
    };
    navigator.sendBeacon('/api/rum', JSON.stringify(payload));
  }
});
```

### RUM Aggregation — The 75th Percentile

Raw RUM data is noisy. Standards for aggregation:
- **Google CrUX** uses **P75** for Core Web Vitals ranking signal
- **Your dashboards** should show P50, P75, P95 (median, CWV-relevant, worst-tail)
- **Never average** performance metrics — averages are destroyed by outliers (one 20s load drags the mean up without appearing in P75)

```
P50 (median): 50% of users see better than this
P75:          75% of users see better than this — Google's CWV threshold
P95:          95% of users see better — shows worst-case tail
P99:          99% of users see better — often noise / bot traffic

Example: LCP distribution
  P50: 1.8s  (good — median user has great experience)
  P75: 2.4s  (good — CWV passes Google threshold)
  P95: 4.8s  (poor — 5% of users have terrible experience)
  P99: 8.2s  (poor — often bots, crawlers, or offline users)
```

### Segmentation — The Real Power of RUM

RUM's value over synthetic testing is segmentation: breaking down metrics by real conditions:

| Dimension | What You Learn |
|-----------|----------------|
| **Device class** | Low-end Android (2GB RAM, 4-core) vs desktop — often 3-5× LCP difference |
| **Network type** | 4G vs 3G vs wifi — reveals CDN inadequacy in mobile-heavy regions |
| **Geography** | APAC users on EU origin server — reveals missing edge CDN nodes |
| **Browser version** | Old Chrome on Android — reveals unpolyfilled features or CSS bugs |
| **Page URL** | Which routes are slowest — prioritize optimization |
| **User segment** | Enterprise SSO users have corporate proxy (slower TTFB) |
| **First vs return visit** | Cache effectiveness — if P75 LCP the same for both, caching isn't working |
| **Time of day** | Peak traffic periods may coincide with slow server response |

### The Lab-Field Gap — Why They Diverge

```
Scenario: Lighthouse score 95 (lab) but CrUX LCP 4.2s (field P75)

Root Cause Analysis:
1. Lighthouse runs on giga-ethernet; users are on 4G with 100ms+ RTT
2. Lighthouse uses simulated CPU throttling; user devices have 8-year-old CPUs
3. Lighthouse runs a clean Chrome; user Chrome has 15 extensions including ad blockers
   that delay script execution
4. Lighthouse measures a single cold load; real users have warm DNS but cold CDN
5. Lighthouse doesn't simulate corporate VPN adding 60ms to every request
6. LCP element is different in production: A/B test shows some users get a 500KB
   hero image instead of the 80KB version Lighthouse loads
```

The gap between lab and field is normal (20–40% is common). The answer is to run BOTH:
- Lab → regression gating in CI (reproducible, blocks bad PRs)
- Field → truth about which users to prioritize optimizing for

### RUM Sampling Strategy

Full RUM collection from all users is expensive (network cost + storage). Sampling strategies:

```typescript
// Stratified sampling: capture all users but send data from X% of sessions
function shouldSampleSession(sampleRate: number): boolean {
  // Use consistent session-based hash so same session always samples or not
  // Prevents incomplete metric sets (e.g., collecting LCP but not INP)
  const sessionId = getSessionId();
  const hash = simpleHash(sessionId);
  return (hash % 100) < (sampleRate * 100);
}

// Tiered sampling: higher rate for VIP users or critical pages
function getSampleRate(): number {
  if (location.pathname.includes('/checkout')) return 1.0;  // 100% on checkout
  if (isEnterpriseUser()) return 0.5;                        // 50% for enterprise
  return 0.1;                                               // 10% general
}
```

### Synthetic vs RUM — When Each Catches Problems

| Problem Type | Caught by Synthetic? | Caught by RUM? |
|---|---|---|
| New JS bundle causes TBT regression | ✅ Yes (before ship) | ✅ Yes (after ship) |
| CDN misconfiguration in specific region | ❌ No (single origin) | ✅ Yes (geographic segment) |
| Slow server for enterprise proxy users | ❌ No | ✅ Yes (network segment) |
| A/B test variant has different LCP image | ❌ No (single variant) | ✅ Yes (segment by variant) |
| Low-end Android has 3× LCP of desktop | ❌ No (simulated throttle isn't always accurate) | ✅ Yes (device segment) |
| Unused CSS and JS (opportunities) | ✅ Yes (Lighthouse shows it) | ❌ No |
| Missing alt text on images | ✅ Yes (accessibility audit) | ❌ No |
| Third-party script loading late | ✅ Yes (if consistent) | ✅ Yes (waterfall aggregation) |
| Cache hit rate in production | ❌ No | ✅ Yes (first vs return visitor) |

---

## 🌍 3. Real-World Examples

### SAP Labs — VPN Users Reveal Geographic CDN Gap
Synthetic Lighthouse score was 95 — all green. After adding RUM, segment breakdown revealed: Windows + Chrome + corporate network users had P75 LCP of 3.8s. Investigation: enterprise VPN tunneled traffic through a network appliance that bypassed Akamai CDN (which requires host header matching). All CDN-bypassed requests went to an EU-region origin server. For users in India and Southeast Asia, this added 180ms TTFB. Fix: configure CDN to match VPN-forwarded host headers. After fix, enterprise segment LCP dropped from 3.8s to 2.2s. Lighthouse CI would never have caught this.

### Microsoft — CrUX Data Drives Roadmap
Microsoft Teams uses Google's CrUX data as a quarterly planning signal. If CrUX shows P75 INP rising for a specific browser version, that becomes a performance sprint topic. They triangulate: CrUX confirms the condition is widespread, internal RUM from Datadog identifies which page component causes it, and LoAF attribution pinpoints the exact script. The CrUX → internal RUM → LoAF chain turns a vague user complaint ("Teams feels slow") into a specific JS function to optimize.

### Adobe — Device Memory Segmentation
Adobe Photoshop web has radically different experiences on low-memory devices. RUM segmented by `navigator.deviceMemory` showed: 4GB+ users had P75 LCP 1.9s; devices with 2GB had P75 LCP 4.2s; 1GB devices (Android Go) had P75 LCP 7.1s. This justified a "lite mode" initiative: auto-detect `deviceMemory < 2` and serve a simplified canvas rendering without WebAssembly heavy modules. The lite mode reduced low-end P75 LCP from 7.1s to 3.1s, unlocking a market segment previously getting unusable performance.

### Salesforce — RUM-Driven SLO
Salesforce maintains a P75 LCP SLO of 3.5s for all Lightning Experience pages. If 3 consecutive days of RUM data show P75 LCP above 3.5s for any major page (by page view volume), an automatic severity-2 incident is created. This SLO is contractual for enterprise Hyperforce customers — measured against RUM data, not synthetic. This is why RUM precision matters: incorrect RUM sampling or aggregation directly affects SLA compliance.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "Synthetic testing and RUM serve opposite jobs. Synthetic — Lighthouse, WebPageTest — runs in a controlled environment: same machine, same network, deterministic. It's perfect for CI regression gates because the same code gives the same result. RUM runs in production users' actual browsers, on their real devices and networks, and tells you what really happens. At SAP, our Lighthouse score was 95 in CI but RUM showed 20% of users — enterprise VPN users — had LCP of 3.8s. The VPN bypassed our CDN, hitting an origin server 2,000km away. That's invisible to Lighthouse. I instrument with the `web-vitals` library in production, send to Datadog, segment by connection type and geography, and aggregate at P75 — the same percentile Google uses for CWV ranking. The decision rule is: synthetic catches regressions before they ship; RUM tells you which real users to prioritize after ship. Both are required; neither replaces the other."

### Follow-Up Q&A

**Q: What is Chrome User Experience Report (CrUX) and how does it relate to RUM?**
A: CrUX is Google's public dataset of real-user Core Web Vitals collected from opted-in Chrome users. It's updated monthly and powers PageSpeed Insights and the Google Search Console CWV report. CrUX is effectively free RUM — but with significant limitations: 28-day rolling window only (you can't see today's data), minimum traffic threshold (low-traffic pages have no CrUX data), no segmentation by device/geography/user segment beyond "mobile" vs "desktop", and no custom metrics. Internal RUM supplements CrUX with real-time data, custom metrics, and free segmentation.

**Q: How do you ensure RUM data is statistically significant before acting on it?**
A: Three checks: (1) **Sample size** — don't act on segments with < 100 data points; P75 from 20 samples is unreliable. (2) **Duration** — collect at least 7 days to smooth day-of-week patterns (weekday enterprise traffic vs weekend consumer traffic behaves very differently). (3) **Segment stability** — if a geographic segment's P75 changes 200% overnight, it's more likely a data collection issue than a real regression. I set minimum sample thresholds in Datadog monitors: P75 LCP alerts only fire if > 500 data points in the window.

**Q: What's the difference between session sampling and transaction sampling in RUM?**
A: Session sampling collects all metrics for X% of sessions consistently — the same user always either contributes or doesn't within a session, ensuring you get complete metric sets (LCP + INP + CLS together), not random individual metrics. Transaction sampling collects X% of individual metric events — cheaper but gives fragmented data. For Core Web Vitals, session sampling is preferred because CWV metrics are per-session (INP is the 98th percentile across the full session, not a single event).

### Comparison Table

| Dimension | Synthetic Testing | RUM |
|-----------|-----------------|-----|
| When | Pre-production (CI) | Post-production (live) |
| Environment | Controlled, simulated | Real users, real devices |
| Reproducibility | High (same code = same score) | Low (varies with real conditions) |
| Coverage | Single configuration | All real-world device/network combos |
| Privacy | None (no real users) | Privacy-sensitive (user data) |
| Latency | Immediate (runs in CI) | Hours to days for statistical significance |
| Cost | Free (LHCI) | Low–medium (data volume) |
| Best for | Regression prevention | Identifying real-user pain points |

---

## 💻 5. Code Example (TypeScript)

```typescript
// Production RUM module with segmentation and sampling
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

// Device capability detection for segmentation
type DeviceClass = 'high-end' | 'mid-range' | 'low-end';
type NetworkClass = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

function getDeviceClass(): DeviceClass {
  const memory = (navigator as any).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (memory >= 4 && cores >= 8) return 'high-end';
  if (memory >= 2 && cores >= 4) return 'mid-range';
  return 'low-end';
}

function getNetworkClass(): NetworkClass {
  const conn = (navigator as any).connection;
  return (conn?.effectiveType as NetworkClass) ?? 'unknown';
}

// Session-based consistent sampling
function isInSample(rate: number): boolean {
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  
  const key = 'rum_sample';
  let decision = sessionStorage.getItem(key);
  if (!decision) {
    decision = Math.random() < rate ? 'yes' : 'no';
    sessionStorage.setItem(key, decision);
  }
  return decision === 'yes';
}

// Adaptive sample rate based on route criticality
function getSampleRate(): number {
  const path = location.pathname;
  if (path.includes('/checkout') || path.includes('/payment')) return 1.0;
  if (path === '/' || path === '/home') return 0.5;
  return 0.1;
}

interface EnrichedMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
  deviceClass: DeviceClass;
  networkClass: NetworkClass;
  url: string;
  path: string;
  viewport: string;
  timestamp: number;
}

const metricsQueue: EnrichedMetric[] = [];

function enrich(metric: any): EnrichedMetric {
  return {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    deviceClass: getDeviceClass(),
    networkClass: getNetworkClass(),
    url: location.href,
    path: location.pathname,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: Date.now(),
  };
}

function initRUM(): void {
  if (!isInSample(getSampleRate())) return; // session-level decision

  onLCP((m) => metricsQueue.push(enrich(m)));
  onINP((m) => metricsQueue.push(enrich(m)));
  onCLS((m) => metricsQueue.push(enrich(m)));
  onFCP((m) => metricsQueue.push(enrich(m)));
  onTTFB((m) => metricsQueue.push(enrich(m)));

  // Guaranteed delivery on page exit
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && metricsQueue.length > 0) {
      // sendBeacon is async, fire-and-forget, works during page unload
      navigator.sendBeacon(
        '/api/rum',
        new Blob([JSON.stringify(metricsQueue)], { type: 'application/json' })
      );
    }
  });
}

// Initialize in app entry point
initRUM();
```

```typescript
// Server-side RUM aggregation (Node.js / Edge Function)
// POST /api/rum handler — stores metrics in time-series DB

interface AggregationKey {
  metricName: string;
  deviceClass: string;
  networkClass: string;
  path: string;
  date: string;  // YYYY-MM-DD
}

async function handleRUMIngestion(
  metrics: EnrichedMetric[],
  db: TimeSeriesDB
): Promise<void> {
  for (const metric of metrics) {
    // Store individual data points for percentile computation
    await db.insert('rum_raw', {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      device_class: metric.deviceClass,
      network_class: metric.networkClass,
      path: metric.path,
      ts: metric.timestamp,
    });
  }
}

// Query: P75 LCP by device class for last 7 days (Datadog/ClickHouse SQL)
const query = `
  SELECT
    device_class,
    quantile(0.75)(value)  AS p75_lcp,
    quantile(0.50)(value)  AS p50_lcp,
    quantile(0.95)(value)  AS p95_lcp,
    count(*)               AS sample_count
  FROM rum_raw
  WHERE
    metric = 'LCP'
    AND path = '/'
    AND ts >= now() - INTERVAL 7 DAY
  GROUP BY device_class
  HAVING sample_count >= 100    -- only report statistically significant segments
  ORDER BY p75_lcp DESC
`;
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"SCRAP"**
- **S** — Synthetic: controlled, reproducible, pre-production CI gate
- **C** — CrUX: free RUM from Google (28-day avg, Chrome-only, limited segmentation)
- **R** — RUM: real users, real devices, real truth — post-production only
- **A** — Aggregate at P75 (never mean; P75 = Google CWV anchor)
- **P** — Percentiles per Segment (device / network / geography / page)

### Analogy
Synthetic testing is the **crash test in a controlled lab** — same dummy, same car, same wall, every time. Reproducible. Catches structural regressions. But it can't tell you that 20% of your customers drive on unpaved mountain roads with a trailer attached. RUM is the **fleet telematics data** — real drivers, real roads, real conditions. You need the crash test to catch defects before release; you need telematics to understand real-world performance after release.

---

## ✅ 7. Why & How Summary

- **Why it matters:** Lab metrics (Lighthouse 95) and field metrics (CrUX P75 LCP 3.8s) can diverge dramatically because lab tests run in ideal conditions; only RUM reveals which real users — by device class, network type, geography, or user segment — are experiencing performance problems
- **How it works:** `web-vitals` library collects `PerformanceObserver` events in users' browsers, enriches with device/network context, samples at a configured rate (session-consistent), and delivers via `navigator.sendBeacon` on page hide — aggregated at P75 per segment in the analytics backend
- **How Hruday uses it:** Instrumented at SAP to discover enterprise VPN users had LCP 3.8s despite Lighthouse score of 95; device-class segmentation at Adobe shows 3.7× LCP difference between high-end and low-end devices; both findings are invisible to synthetic testing alone

---

✅ Topic 168/486 complete → Continuing to Topic 169: Code Splitting Strategies
