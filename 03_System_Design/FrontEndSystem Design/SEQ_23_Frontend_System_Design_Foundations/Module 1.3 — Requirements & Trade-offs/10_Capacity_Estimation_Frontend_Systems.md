# 10. Capacity Estimation for Frontend Systems ★

---

## 1. High-Level Explanation (Interview Opening Answer)

Capacity estimation in frontend engineering answers the question: *"Given N users, what infrastructure, data transfer, and rendering constraints do we need to design for?"* Unlike backend capacity planning (RPS, database throughput), frontend capacity estimation focuses on bandwidth, bundle size budgets, CDN edge node distribution, concurrent WebSocket connections, JavaScript parse/execution time on target devices, and browser memory constraints. It is a signal of senior-level thinking — it shows you design for edge cases and scale from the beginning rather than optimising reactively after launch.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### The Frontend Capacity Estimation Framework

Use this structured approach in any system design interview:

```
1. Define users and usage patterns
   - DAU / MAU split
   - Concurrent active users (typically 10-20% of DAU)
   - Peak multiplier (e.g., 3× during Black Friday, 5× during product launch)
   - Geographic distribution (single region vs global)
   - Device distribution (mobile/desktop split, low-end vs high-end devices)

2. Estimate bandwidth (data transfer)
   - Initial page load cost (HTML + CSS + JS bundles)
   - Per-interaction data cost (API payloads)
   - Real-time data rate (WebSocket messages/sec)
   - Media assets (images, video)

3. Estimate compute / rendering cost
   - JS parse + execution time on median device
   - Main thread blocking budget (50ms per Long Task threshold)
   - Memory footprint per session

4. Estimate infrastructure
   - CDN edge coverage needed
   - WebSocket server connection capacity
   - API request rate (frontend → backend)

5. Identify bottlenecks and design mitigations
```

---

### Concrete Estimation: Feed Application (LinkedIn-style, 10M DAU)

**Step 1: User patterns**
```
DAU: 10M
Concurrent users at peak (8-9am): 10M × 15% = 1.5M concurrent sessions
Peak multiplier: 3× for product launch → plan for 4.5M concurrent
Geographic distribution: Global (need CDN edge in NA, EU, APAC, LATAM)
Device split: 65% mobile, 35% desktop; 40% mid-range Android
```

**Step 2: Bandwidth estimation**
```
Initial load:
  HTML:              15 KB gzipped
  Critical CSS:      20 KB gzipped
  JS bundle (main):  120 KB gzipped (budget for: React + routing + minimal libs)
  JS bundle (feed):  60 KB gzipped (lazy-loaded on route)
  Fonts (subset):    25 KB
  Total initial:     ~240 KB
  
Per-session data:
  Feed API response: 50 posts × 2 KB average = 100 KB
  Each subsequent page: 100 KB
  Session duration: 25 min avg, 3 page loads = 300 KB feed data
  Images (lazy-loaded WebP): 30 images × 15 KB = 450 KB
  Total per session: ~1 MB

Daily total bandwidth:
  10M users × 1 MB = 10 TB/day
  Peak hour: 10 TB / 24 × 3 = 1.25 TB/hour = ~345 MB/sec
```

→ **Design implication:** CDN is non-optional at this scale. Without CDN, 345 MB/sec sustained from origin servers would require 350+ origin servers. With CDN (expected 95% cache hit rate), origin receives only 17 MB/sec.

**Step 3: JavaScript budget**

```
Target: LCP < 2.5s on median Android (Moto G4 equivalent)
Moto G4 raw JS execution: ~1 byte/μs (rough rule: 1KB JS ≈ 1ms parse+eval)

Budget breakdown:
  JS parse + compile: 240 KB ÷ 1KB/ms = 240ms budget
  Our bundle: 180 KB (main + immediate deps) = 180ms → within budget
  
Main thread budget per interaction (INP target < 200ms):
  User taps "Like" button:
    - Event handler: 5ms
    - Optimistic UI update: 2ms  
    - Re-render: 10ms
    - API call (async, non-blocking): offloaded
    Total: ~17ms → well within 200ms INP budget
  
  User scrolls feed (virtual list required when items > 50):
    Without virtualisation: 500 DOM nodes, style recalc = 80ms per scroll event → janky
    With virtualisation: 20 visible nodes, style recalc = 3ms → smooth
```

**Step 4: WebSocket capacity (real-time notifications)**
```
Notification connection per user (if real-time):
  1.5M concurrent users × 1 WebSocket connection = 1.5M connections
  Node.js WS server: ~60K concurrent connections per instance (RAM-limited)
  Required WS servers: 1.5M / 60K = 25 servers + 30% headroom = ~33 servers
  
  Alternative: Server-Sent Events (one-way, HTTP/2 multiplexed)
  → Reduces infrastructure complexity, same capacity, better for notifications-only
  
  Alternative: Long-polling fallback (HTTP, no persistent connection)
  → Higher per-request cost but lower infrastructure, acceptable for <1 msg/min
```

**Step 5: Memory budget**
```
Target: Tab should not exceed 150 MB after 30 min of use

Memory breakdown:
  Framework + app JS (V8 heap):  40 MB
  Feed virtual DOM + state:       20 MB (virtualised list keeps at max 20 nodes)
  Images (decoded, in memory):    50 MB (IntersectionObserver unloads off-screen)
  Caches (API responses):         15 MB (LRU cache, max 50 entries)
  Total:                         ~125 MB → within 150 MB budget

Without virtualisation:
  5000 feed items × 10 KB DOM per item = 50 MB DOM alone + 8 MB per image visible
  → 500+ MB after 30 min of scrolling → tab crash on mobile
```

---

### Device-Aware Capacity Thinking

Senior engineers design for the **P50 device, not the P99 desktop:**

```
P50 global device (2024): mid-range Android (2-4 GB RAM, 4-core CPU @ 1.8GHz)
P10 device (low-end, largest growing segment): 1GB RAM, 1.2GHz CPU

Key constraints per device tier:
  - Low-end:   JS budget 150ms parse, heap limit 150MB, 2G/3G connection
  - Mid-range: JS budget 350ms parse, heap limit 512MB, 4G connection
  - High-end:  JS budget 1000ms parse, heap limit 2GB, WiFi/5G
```

**Design implications:**
- Lazy load non-critical code chunks (saves 100-300ms on low-end)
- Use `content-visibility: auto` for off-screen content (saves 60% style recalc)
- Serve smaller images via `srcset` / `<picture>` (saves 60-80% bandwidth on mobile)
- Avoid synchronous heavy computation on main thread (Web Workers for >50ms tasks)

---

### Estimation for Real-Time Systems (Cisco-style Dashboard)

```
Network monitoring dashboard:
  Active engineers viewing dashboard: 5,000 concurrent
  Updates per device per second: 0.5 (every 2 seconds)
  Topology nodes monitored: 10,000 devices
  
WebSocket message rate:
  5,000 clients × 0.5 msg/sec = 2,500 inbound messages/sec per WS server
  Each message: 200 bytes avg
  Inbound bandwidth: 2,500 × 200B = 500 KB/sec per server
  
Rendering budget:
  React renders triggered by state updates: need debounce/throttle
  Without throttle: 2,500 renders/sec → main thread completely blocked
  With throttle (16ms batching): 60 render batches/sec → 16ms/batch → smooth
  
  → Design: 200ms debounce on topology updates, batch render with useTransition
```

---

## 3. Real-World Examples

**Amazon Product Pages:**
Amazon famously estimates that 100ms of additional load time = 1% reduction in revenue. At $500B annual revenue, that's $5B per 1 second of slowdown. This directly drives their capacity planning: every page must load in <1s on a 3G connection, requiring capacity estimation before any feature is approved.

**Netflix Adaptive Bitrate:**
Netflix estimates bandwidth per user segment. P10 users (5-7 Mbps) get 720p. P50 (15 Mbps) get 1080p. P90 (50+ Mbps) get 4K. The capacity algorithm runs client-side — measuring available throughput, estimating buffer fill time, and switching quality in real-time. This is frontend capacity estimation built into the product.

**SAP Fiori Launchpad (your experience):**
At SAP, the Fiori Launchpad serves 100,000+ enterprise SAP users. Capacity estimation drove the decision to lazy-load tiles (each tile is a micro-app, ~50KB gzipped), cap the initial bootstrap bundle to <80KB, and pre-fetch only the 3 most likely next tiles. Without this, initial load for large customers (200+ tiles) would take 20+ seconds.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"I approach frontend capacity estimation from five angles: users, bandwidth, JavaScript budget, infrastructure, and memory. For a feed application targeting 10M DAU, I'd estimate roughly 1.5M concurrent users at peak, each downloading about 240KB on first load — with 95% served from CDN, that's about 17 MB/sec at origin. The JavaScript budget is dictated by the median device: a Moto G4-class phone parses about 1KB of JS per millisecond, so a 180KB main bundle costs 180ms — tight but within the 200ms INP budget if I keep the critical path lean.*

*For real-time features, I'd estimate WebSocket connections: 1.5M concurrent users need ~25 Node.js WS servers at 60K connections each. The decision between WebSocket, SSE, and polling is driven by this capacity math — SSE on HTTP/2 multiplexes over fewer connections and is more CDN-friendly. For memory, I'd target 150MB per tab, which means virtualising any list over 50 items and using IntersectionObserver to unload off-screen images. These aren't arbitrary targets — they're computed from actual device constraints and usage patterns."*

### Likely Follow-up Questions

1. **"How would you calculate CDN cache coverage requirements?"**
   → (Cache hit rate × total requests) = CDN cost. At 95% hit rate and 10M sessions/day, only 500K requests reach origin. Size origin to handle 500K × average request size + peak multiplier.

2. **"What's your JavaScript size budget for a mobile first-load?"**
   → 150-200KB gzipped for the initial JS bundle. Above that, parse + execution time exceeds 200ms on mid-range devices, impacting LCP and INP. Lazy-load everything below the fold.

3. **"How do you account for slow networks?"**
   → P10 network speed globally is ~1.5 Mbps (2G/3G). A 240KB page takes 1.3 seconds to download. Add DNS lookup (100ms) + TLS (100ms) + server response = ~1.8s just for transfer. Design for <3s LCP on a 3G connection.

4. **"At what point do you need to virtualise a list?"**
   → Rule of thumb: 50+ items in a scrollable container. Each React DOM node costs ~1-2KB of memory and adds style recalculation time. A 5,000-item list without virtualisation creates 50-100MB of DOM overhead and 80ms+ scroll handlers.

### Estimation Quick Reference

| Metric | Rule of Thumb | Source |
|--------|--------------|--------|
| CDN hit rate | 90-98% for static assets | Industry average |
| JS parse speed | ~1 KB/ms on P50 mobile | Chrome DevTools |
| WebSocket capacity | ~60K connections/Node.js instance | Node.js benchmark |
| Memory per DOM node | ~0.5-2 KB | Chrome heap profiler |
| Bundle budget (initial) | ≤150 KB gzipped JS | Web Almanac 2024 |
| Image count before lazy-loading | >3 below fold | LCP impact |
| List virtualisation threshold | >50 items | FPS impact |
| Long Task threshold | >50ms | INP spec |

---

## 5. Code Example: Budget Enforcement in CI

```typescript
// Webpack bundle size budget — enforced in CI (fails build if exceeded)
// webpack.config.ts
export const performanceConfig = {
  hints: 'error',                         // Fail build, not just warn
  maxAssetSize: 250_000,                  // 250 KB per individual asset
  maxEntrypointSize: 200_000,             // 200 KB for main entry chunk
};

// Lighthouse CI budget — assessed per route in GitHub Actions
// lighthouserc.js
module.exports = {
  assert: {
    assertions: {
      'first-contentful-paint':     ['error', { maxNumericValue: 2000 }],
      'largest-contentful-paint':   ['error', { maxNumericValue: 2500 }],
      'total-blocking-time':        ['error', { maxNumericValue: 300 }],
      'cumulative-layout-shift':    ['error', { maxNumericValue: 0.1 }],
      'interactive':                ['error', { maxNumericValue: 3500 }],
      'resource-summary[script].size': ['error', { maxNumericValue: 175_000 }],
    }
  }
};

// Runtime memory monitoring (production alerting)
function monitorMemoryBudget(limitMB = 150) {
  if (!('memory' in performance)) return;
  
  setInterval(() => {
    const usedMB = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    if (usedMB > limitMB * 0.8) {
      // Alert at 80% of budget — gives time to investigate before crash
      analytics.track('memory_budget_warning', {
        usedMB: usedMB.toFixed(1),
        limitMB,
        route: window.location.pathname,
      });
    }
  }, 60_000); // Check every minute
}
```

---

## 6. Memory Aid (Quick Recall for Interview)

**BUMIM Framework for Frontend Capacity:**
- **B**andwidth — How much data per user per session? × DAU = daily TB
- **U**sers — Concurrent = 10-15% of DAU. Peak = 3× concurrent.
- **M**emory — 150MB budget. Virtualise at 50+ items. Unload off-screen images.
- **I**nfrastructure — CDN for static. WS servers = concurrent / 60K.
- **M**achines (JS budget) — ~1 KB/ms on P50 mobile. Target <150KB initial.

**If you go blank:** *"I estimate bandwidth, JS budget, and memory budget first — those three constrain all other design decisions. Then I work out CDN and server capacity from those numbers."*

---

## 7. Why & How Summary

**Why it matters:**
→ Capacity estimation demonstrates that you think about scale before writing code. It catches architectural mistakes early (e.g., a real-time feature that requires 500 servers instead of 5). It maps directly to business cost: over-provisioning wastes money, under-provisioning causes outages.

**How it works:**
→ Estimate users → compute bandwidth (bundle size × sessions) → compute JS budget (KB ÷ parse speed × device tier) → compute infrastructure needs (WS connections, CDN hit rate, origin capacity) → compute memory budget (DOM nodes, images, caches, heap).

**Company relevance:**
→ **Microsoft** asks capacity questions for Teams (280M DAU). **Adobe** for Creative Cloud (concurrent canvas sessions). **Salesforce** for Lightning Experience (150K orgs). **Cisco** for Webex (real-time connections). All four expect senior engineers to estimation-first design.
