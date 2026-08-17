# 38. DNS Prefetch, Preconnect, Early Hints (103)
**Phase:** Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds. Crisp. Confident. Numbers included where relevant.

DNS prefetch, preconnect, and 103 Early Hints are three progressively more powerful tools for eliminating network latency before the browser actually needs a resource. DNS prefetch resolves a hostname in advance — saving 20–120ms on cold DNS lookups. Preconnect goes further: it resolves DNS, opens the TCP socket, and completes the TLS handshake so subsequent requests start from zero — saving 100–300ms total. 103 Early Hints is the most powerful: the server sends preload and preconnect hints to the browser while it's still generating the HTML response, meaning pre-warm happens in parallel with server processing time that would otherwise be wasted. At SAP, we got measurable LCP improvement from adding three `preconnect` hints for our critical API origins — the compound DNS+TLS savings on those first API calls trimmed ~180ms off our authenticated page load.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Resource hints are a family of `<link>` element types (and HTTP response headers) that allow developers to inform the browser about upcoming network activity before JavaScript or the HTML parser would normally discover it. They exploit the browser's parallel processing capability by letting background network work begin during the parsing phase.

**The four core resource hints:**
1. `dns-prefetch` — DNS resolution only
2. `preconnect` — DNS + TCP + TLS
3. `prefetch` — fetch a resource for use in a future navigation
4. `preload` — fetch a critical resource for use in the current page
5. **`103 Early Hints`** — HTTP status code that allows the server to send link headers before the final 200 response is ready

### How It Works Internally

#### dns-prefetch

```
Without dns-prefetch:
User navigates → HTML parsed → JS runs → fetch('https://analytics.sap.com/...')
    → DNS lookup starts → ~50-120ms cold → TCP → TLS → Request

With dns-prefetch (<link rel="dns-prefetch" href="https://analytics.sap.com">):
Browser loads <head> → dns-prefetch hint found → DNS lookup starts immediately
    → by the time JS calls fetch() → DNS already cached → 0ms DNS cost
```

**Internal mechanics:**
- Browser sends DNS query in background via its async DNS resolver
- Result cached in Chrome's DNS cache (`chrome://net-internals/#dns`)
- Cache entry expires after TTL (usually 60–300s) or the browser's 1-minute minimum
- **Cost:** DNS query only — no TCP socket, no TLS, no memory held
- **Risk:** If the resource is never actually used, you wasted one DNS lookup — minimal cost

#### preconnect

```
Without preconnect, timeline for https://api.sap-btp.com:
t=0ms:  fetch() called by JavaScript
t=50ms: DNS resolves
t=90ms: TCP handshake completes  
t=130ms: TLS 1.3 handshake completes
t=135ms: HTTP request sent
t=145ms: TTFB

With preconnect (<link rel="preconnect" href="https://api.sap-btp.com">):
t=0ms:  Browser parses <head>, sees preconnect hint
t=1ms:  DNS query + TCP SYN sent (background)
t=50ms: DNS resolves, TCP SYN/ACK received
t=90ms: TLS 1.3 ClientHello sent
t=130ms: TLS complete — connection ready, sitting idle in pool

... (user interaction / JS executes) ...

t=5000ms: fetch('https://api.sap-btp.com/...') called
t=5000ms: Connection found in pool → request sent IMMEDIATELY
t=5010ms: TTFB (only 10ms instead of 145ms)
```

**Internal mechanics:**
- Creates a real TCP socket and TLS session entry in the connection pool
- Holds it idle (with keepalive probes) until used or timed out (~10s idle timeout)
- Costs real OS resources: file descriptor, TLS session memory
- Each unused `preconnect` wastes ~TCP socket + ~8KB TLS session memory
- **Limit: 4–6 preconnects per page max** — beyond this, you're wasting bandwidth and competing with critical resources

#### preconnect + crossOrigin attribute

```html
<!-- For CORS assets (fonts, images from CDN with CORS headers) -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Without crossorigin: preconnect negotiates without CORS credentials context -->
<!-- With crossorigin: preconnect includes CORS mode setup -->
```

**Critical detail:** Resources loaded with CORS (`crossOrigin="anonymous"`) use anonymous credentials context. If your `preconnect` doesn't include `crossorigin` but the actual fetch does, the browser creates a SECOND connection specifically for the CORS-mode fetch — the preconnect connection is unused!

#### 103 Early Hints

```
Without 103 Early Hints:
Client → GET /page
          [server processing time: 200ms]
Server responds → 200 OK + HTML with <link rel="preload"> hints
          [browser starts preloading AFTER 200ms wait]

With 103 Early Hints:
Client → GET /page
Server → 103 Early Hints + Link headers (IMMEDIATELY, within 1ms)
  Link: </styles/main.css>; rel=preload; as=style
  Link: <https://api.example.com>; rel=preconnect
          [server processing continues: 200ms]
          [browser starts preloading DURING those 200ms]
Server → 200 OK + HTML
          [browser is already loading main.css — it's likely already complete!]
```

**103 Early Hints — HTTP/2 and HTTP/3 only:**
- The 103 status is an **informational response** (1xx series)
- Server sends `Link` headers in the 103 response immediately, while generating the real response
- Browser acts on these link headers as if they were `<link>` tags in `<head>`
- Particularly powerful with CDNs: CDN can cache the 103 response separately from the 200 response and deliver hints from edge before origin even responds

**103 Early Hints delivery flow:**
```
Browser   →   CDN Edge   →   Origin
  GET /         →              →
  ←   103 (cached at edge, <1ms)
  [starts preloading]
                →    GET /     →
                              [200ms processing]
                ←    200 + HTML
  ← 200 + HTML
  [critical resources already loaded!]
```

**Server-side implementation (Node/Express):**
```typescript
res.writeEarlyHints({
  'Link': [
    '</styles/main.css>; rel=preload; as=style',
    '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
    '<https://api.example.com>; rel=preconnect',
  ]
}, () => {
  // Callback: generate full response
  res.send(renderPage());
});
```

### Architecture & Component Boundaries

```
HTML Head (resource hints):
┌──────────────────────────────────────────────────────────────┐
│ <head>                                                        │
│   <!-- Level 1: DNS only (cheap, low certainty) -->          │
│   <link rel="dns-prefetch" href="//telemetry.sap.com">       │
│   <link rel="dns-prefetch" href="//auth.sap-id.com">         │
│                                                              │
│   <!-- Level 2: Full pre-warm (expensive, high certainty) -->│
│   <link rel="preconnect" href="https://api.sap-btp.com">     │
│   <link rel="preconnect" href="https://cdn.sap.com" crossorigin> │
│                                                              │
│   <!-- Level 3: Preload current-page critical resources -->  │
│   <link rel="preload" href="/fonts/SAPMono.woff2" as="font" crossorigin> │
│   <link rel="preload" href="/styles/critical.css" as="style">│
│ </head>                                                       │
└──────────────────────────────────────────────────────────────┘

HTTP Response header approach (103 Early Hints):
HTTP/2 103 Early Hints
Link: <https://api.sap-btp.com>; rel=preconnect
Link: </styles/main.css>; rel=preload; as=style
Link: </scripts/app.js>; rel=preload; as=script
```

### Data Flow & State Flow

```
Page load timeline with resource hints:

0ms:    Navigation starts
5ms:    Server sends 103 Early Hints → browser starts DNS/preconnect/preload
10ms:   Browser starts parsing HTML
25ms:   Browser finds <link rel="preconnect"> → deduplicates against 103 hints
        → no duplicate work needed
50ms:   DNS resolved for all preconnect origins
90ms:   TCP+TLS complete for all preconnect origins
200ms:  Server sends 200 OK response with HTML
205ms:  JS executes → fetch() calls → connections already warm → instant!
210ms:  First API responses arrive (from pre-warmed connections)
```

### Performance Implications

| Hint Type | Latency Saved | Resource Cost | Risk |
|---|---|---|---|
| dns-prefetch | 20–120ms | 1 DNS query | Very low — wasted query if unused |
| preconnect | 100–300ms | TCP socket + TLS session (~8KB) | Medium — unused connection wastes socket |
| preload (current page) | 100–500ms (critical path) | Full resource downloaded | High — wrong resource wastes bandwidth |
| 103 Early Hints | 50–400ms (server processing time recovered) | Same as inline hints | CDN support required |

### Scalability Considerations

- **< 10K users:** Add `preconnect` for 2–3 critical origins, `dns-prefetch` for 3–5 uncertain origins. Measure with WebPageTest and Lighthouse.
- **100K users:** Add 103 Early Hints at CDN/edge layer — serve cached hints for all cached routes without touching origin. Monitor abandoned connection rate (preconnects never used = waste).
- **10M+ users:** 103 Early Hints with connection-level caching at edge (Cloudflare, Fastly native support). Priority Hints API (`fetchpriority="high"`) on critical preloads. Measure hint utilisation rate in RUM (how often a preconnected origin is actually used within 5s).

### Trade-offs

| dns-prefetch | preconnect | When to choose |
|---|---|---|
| DNS resolution only | DNS + TCP + TLS | dns-prefetch for maybe-needed origins; preconnect for definitely-needed |
| Very cheap (~1ms CPU) | Holds OS socket | preconnect for max 4–6 origins |
| No expiry concern | Times out if unused | preconnect for origins used in first 5s |
| Cannot preempt CORS | Must match crossOrigin attribute | preconnect + crossorigin for CORS CDNs |

### ⚠️ Anti-Patterns & Pitfalls

- **Preconnecting to every origin on the page** — each preconnect opens a real TCP connection on the client. If you have 20 origins and preconnect all of them, you're burning 20 TCP sockets, contending with actual critical resource fetches. Limit to the 3–6 most performance-critical origins.
- **Missing `crossorigin` attribute on preconnect for CORS resources** — this causes the browser to establish two connections: one without CORS (from the preconnect) and one with CORS (from the actual fetch). The preconnect connection is wasted.
- **Adding `preload` for non-critical resources** — `preload` tells the browser this resource is needed NOW for the current page. Preloading a third-party analytics script with `preload` just-in-time can evict a critical CSS from the preload cache. Use sparingly.
- **No `as` attribute on preload** — the browser uses `as` to set the correct fetch mode, CORS mode, and cache key. Omitting it causes the resource to download twice: once on preload, once on use.
- **103 Early Hints on HTTP/1.1** — 103 informational responses are not supported on HTTP/1.1. Ensure your CDN and server are on HTTP/2 or HTTP/3 before implementing.
- **Preloading fonts without `crossorigin`** — fonts always require CORS anonymous mode. `<link rel="preload" href="font.woff2" as="font">` without `crossorigin` will double-download the font.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
For SAP Analytics Cloud, the authentication flow requires connections to: the BTP API gateway, the SAP identity provider, and the CDN serving UI components. Adding three `preconnect` hints in the initial `index.html` and corresponding `dns-prefetch` hints as fallbacks for uncertain secondary origins cut the first authenticated API response from ~340ms to ~160ms. The gains were entirely from eliminating DNS and TLS roundtrips that previously serialised behind page scripting. This was a direct contributor to the LCP improvement metric.

**At FAANG scale:**
- **Microsoft:** Bing uses 103 Early Hints to deliver font and API preconnect hints before the server assembles the search results page — recovering ~150ms of server processing time on every search query, at billions of queries per day
- **Adobe:** Creative Cloud web app sends `preconnect` hints for the asset CDN and auth server in the root HTML. When Photoshop Web initialises, WASM download and authentication happen over pre-warmed connections, cutting first load from ~4s to ~2.8s
- **Cloudflare Pages:** Automatically inspects HTML and generates 103 Early Hints for all `<link rel="preload">` and `<link rel="preconnect">` found in the HTML — delivered from edge cache before origin responds

**How it evolves with scale:**
- Small scale (< 10K users): Static `<link>` hints in HTML. Test impact with Lighthouse and WebPageTest.
- Medium scale (100K users): Dynamically generate hints based on user route (authenticated users hint towards API; unauthenticated hint towards auth server).
- Large scale (10M+ users): 103 Early Hints cached at CDN edge per route pattern. A/B test hint effectiveness using RUM. Automate hint generation from bundle analysis output.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "There are three levels of getting ahead of network latency. DNS prefetch resolves the hostname early — it's cheap, just one DNS query, saves 20–120ms on cold lookups. Preconnect goes further: it resolves DNS, opens the TCP connection, and completes the TLS handshake — saving the full 100–300ms connection overhead before any request is made. The key rule for preconnect is to use it only for origins you're certain will be needed within the next 5 seconds — and always include the crossorigin attribute if the resource uses CORS, otherwise the browser opens a second connection for the actual fetch. 103 Early Hints is the most powerful: the server sends these hints as an informational response before the 200 is ready, meaning the browser starts preloading critical resources during server processing time that would otherwise be idle. At SAP, I added preconnect hints for our BTP API and identity provider in the root index.html — it trimmed ~180ms off our authenticated page load because those connections were warm before any JavaScript executed. The practical rule I follow: preconnect for top 3–6 definite origins, dns-prefetch for uncertain ones, and 103 Early Hints for the main HTML delivery at CDN edge."

### Likely Follow-up Questions
1. **What's the difference between preload and prefetch?** → `preload` = current page, high priority (needed now); `prefetch` = future navigation, low priority (idle download)
2. **Why does `preconnect` need `crossorigin` for fonts?** → Fonts are always fetched with CORS anonymous mode; missing `crossorigin` means preconnect establishes non-CORS connection, font fetch creates a new CORS connection — two connections for one resource
3. **How does 103 Early Hints differ from HTTP/2 Server Push?** → Push sends the full resource uninvited (cache invalidation problem); 103 sends hints — browser decides whether to fetch based on its cache state
4. **How many preconnects should you have on a page?** → Max 4–6; each holds a real OS socket and TLS session; beyond this, resource contention outweighs the savings
5. **What is the Priority Hints API?** → `fetchpriority="high|low|auto"` on `<link>`, `<img>`, `<script>` — lets you override browser's default priority for resource loading; useful for LCP image vs non-critical preloads competing

### vs Alternatives
| dns-prefetch | preconnect | 103 Early Hints |
|---|---|---|
| DNS only | DNS + TCP + TLS | Same as inline hints but earlier |
| Virtually free | Costs OS socket | Costs same as hints |
| Use for uncertain origins | Use for certain origins | Use for all critical routes at CDN |
| Client-side only | Client-side only | Server/CDN configured |

### How to Signal Senior Thinking
> "The mental model I use is a 'racing' model: every millisecond the browser is parsing HTML or executing JavaScript before it discovers it needs a resource is latency you can recover with hints. dns-prefetch recovers DNS time. preconnect recovers DNS + TCP + TLS time. 103 Early Hints recovers server processing time on top of both those. In a well-optimised SAP Analytics page, you can stack all three — and the best pages I've shipped have essentially zero cold-start network overhead on critical first requests because every phase was pre-warming in parallel."

---

## 💻 5. Code Example
> Complete resource hints setup with 103 Early Hints in Express/Node

```typescript
// server.ts — Express with 103 Early Hints
// Demonstrates: 103 Early Hints, HTML hint generation, correct crossorigin usage
// What an interviewer looks for: knowing the server-side + client-side combination

import express, { Request, Response } from 'express';

const app = express();

// Critical origins for SAP-style analytics app
const CRITICAL_ORIGINS = {
  apiGateway: 'https://api.sap-btp.com',
  assetCdn: 'https://cdn.sap-ui5.com',
  authServer: 'https://accounts.sap.com',
} as const;

// Uncertain origins — dns-prefetch only (analytics, error tracking)
const SECONDARY_ORIGINS = [
  'https://telemetry.sap.com',
  'https://sentry.io',
];

app.get('/', async (req: Request, res: Response) => {
  // Step 1: Send 103 Early Hints immediately — before processing the page
  // Browser starts pre-warming in parallel with server processing time
  res.writeEarlyHints({
    'Link': [
      // Preconnect for definite critical origins
      `<${CRITICAL_ORIGINS.apiGateway}>; rel=preconnect`,
      `<${CRITICAL_ORIGINS.assetCdn}>; rel=preconnect; crossorigin`,  // CDN uses CORS
      // Preload critical CSS during server processing
      `</styles/critical.css>; rel=preload; as=style`,
      `</scripts/app.js>; rel=modulepreload`,
    ]
  });

  // Step 2: Server does its processing (auth check, data fetch, etc.) — ~200ms
  const pageData = await generatePageData(req);

  // Step 3: Send 200 with HTML (browser has been pre-warming during this time)
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <!-- Reinforce the preconnects (deduped by browser — no extra work) -->
      <link rel="preconnect" href="${CRITICAL_ORIGINS.apiGateway}">
      <link rel="preconnect" href="${CRITICAL_ORIGINS.assetCdn}" crossorigin>
      
      <!-- Auth server: only used if user is unauthenticated — dns-prefetch safer -->
      <link rel="dns-prefetch" href="${CRITICAL_ORIGINS.authServer}">
      
      <!-- Uncertain secondary origins — dns-prefetch only -->
      ${SECONDARY_ORIGINS.map(origin => 
        `<link rel="dns-prefetch" href="${origin}">`
      ).join('\n')}
      
      <!-- Font preload — MUST include crossorigin for fonts -->
      <link rel="preload" href="/fonts/SAPFont.woff2" as="font" type="font/woff2" crossorigin>
      
      <!-- Critical CSS preload (as=style, not as=font!) -->
      <link rel="preload" href="/styles/critical.css" as="style">
      
      <!-- LCP image — priority hint for the most important image -->
      <link rel="preload" href="/images/hero.avif" as="image" fetchpriority="high">
      
      <link rel="stylesheet" href="/styles/critical.css">
    </head>
    <body>${pageData.html}</body>
    </html>
  `);
});

async function generatePageData(req: Request): Promise<{ html: string }> {
  // Simulates server processing time
  await new Promise(resolve => setTimeout(resolve, 200));
  return { html: '<main>Page Content</main>' };
}
```

**Interview vs Production difference:**
In an interview, write the resource hints in HTML `<head>` and explain the cost/benefit of each type. In production, add: dynamic hint lists per route (authenticated vs public routes need different origins preconnected), RUM tracking of hint utilisation (how often pre-warmed connections are actually used), and 103 Early Hints at the CDN/reverse proxy layer for maximum benefit. Also add Subresource Integrity hashes on preloaded scripts.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** DNS prefetch is making a reservation. Preconnect is driving to the restaurant. 103 Early Hints is starting to cook your food before you even arrive.

**If you go blank:** "dns-prefetch resolves just the hostname in advance. preconnect does DNS + TCP + TLS — full connection pre-warm. 103 Early Hints lets the server send these hints before it's done generating the page, recovering server processing time."

**Mnemonic:** **D-P-E = Deeper Prep Earlier** — dns-prefetch → preconnect → Early Hints — each one prepares deeper and earlier in the request lifecycle

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Resource hints are the fastest wins on LCP with zero JavaScript bundle changes — pure connection pre-warming
→ Performance: Preconnect to 3 critical origins ≈ 150–300ms LCP improvement; 103 Early Hints recovers server processing time on top
→ Business: Zero-code-change performance wins — adds/removes a few `<link>` tags or HTTP headers, measurable immediately in RUM

**How it works (3 sentences):**
`dns-prefetch` instructs the browser to resolve a hostname's DNS entry in the background before a request is made, eliminating 20–120ms lookup latency. `preconnect` goes further by completing the full TCP+TLS handshake, putting a warm connection in the pool that subsequent requests can use immediately. `103 Early Hints` is a server-sent informational HTTP status that delivers these hints before the server has finished generating the 200 response, recovering server processing time that would otherwise be dead latency.

**Company relevance:**
- **Microsoft:** Bing uses 103 Early Hints at Akamai CDN edge — every billion daily queries where 103 saves 100ms is significant compute; interviewers expect you to know the CDN edge caching aspect
- **Adobe:** Creative Cloud preconnects to asset CDN and auth server; font preload with correct `crossorigin` is specifically something Adobe's web platform team tests candidates on
- **Salesforce:** Lightning platform loads 40+ components on enterprise pages — resource hints for the Salesforce Experience Cloud CDN and API domains are coded into Lightning App Builder's output
- **Cisco:** Dashboard apps connecting to many backend metric APIs benefit from preconnect hints for API gateway origins; monitoring of hint utilisation is a concrete RUM improvement story

---
**✅ Topic 38/486 complete.**
**→ Continuing to Topic 39: QUIC Protocol Basics**
