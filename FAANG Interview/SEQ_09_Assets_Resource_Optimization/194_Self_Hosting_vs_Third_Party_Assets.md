# 194. Self-Hosting vs Third-Party Assets
**Phase:** Performance & Architecture | **Sequence:** SEQ 09 | **Company:** Adobe, Microsoft, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Self-hosting means serving assets (fonts, scripts, images) from your own origin or CDN rather than loading them from a public third-party CDN (Google Fonts, cdnjs, unpkg, jsDelivr). The framing used to favor third-party CDNs because browsers would cache popular libraries (jQuery, Bootstrap, Angular) from shared CDN URLs — meaning a user who visited any site using that CDN URL already had the asset cached. This **cross-site shared caching** benefit is now largely eliminated: Chrome 86+ (2020) and Safari/Firefox use partitioned caches — each origin gets its own cache partition, so google.com/fonts cached by site-A is not reused by site-B. Without that cache benefit, third-party CDN assets incur extra DNS lookup, TCP connection, and TLS handshake overhead (typically 100–300ms on first use) compared to assets served from your own already-connected origin. Combined with GDPR and privacy implications of third-party origins receiving user IPs and browsing data, **self-hosting is generally preferred for static assets** (fonts, shared JavaScript libraries). Third-party CDN remains valid for some use cases: assets you don't own or control (YouTube videos, Stripe embeds), or cases where the vendor-managed CDN provides geographic distribution you don't have on your own infrastructure.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The historical case for third-party CDN (pre-2020):**
The rationale was browser-level shared caching: if jQuery 3.6.0 was loaded from `cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js`, every website using that exact URL could share the same cache entry — meaning users who visited amazon.com (using that CDN jQuery) would already have it when they visited your site. This was a real performance win in the jQuery/Bootstrap era.

**Why that benefit is gone (Chrome 86, Safari ITP, Firefox):**
```
[Pre-2020 — shared cache (broken)]
Site-A loads: cdnjs.cloudflare.com/jquery.min.js → cached as "cdnjs.cloudflare.com/jquery.min.js"
Site-B loads: cdnjs.cloudflare.com/jquery.min.js → CACHE HIT ✅ (shared across origins)

[Post-2020 — partitioned cache (current reality)]
Site-A loads: cdnjs.cloudflare.com/jquery.min.js → cached as "(site-a.com, cdnjs.cloudflare.com)/jquery.min.js"
Site-B loads: cdnjs.cloudflare.com/jquery.min.js → CACHE MISS ❌ (different first-party origin = different cache partition)
```
With partitioned caching, every third-party CDN asset requires a new DNS lookup, TCP connection, and TLS negotiation on first load — the same cost as loading from any new origin.

### How It Works Internally

**Performance cost of third-party CDN request (first visit):**
```
1. DNS lookup for fonts.googleapis.com        → ~50ms (if not pre-connected)
2. TCP connection to fonts.googleapis.com     → ~50ms (1 RTT)
3. TLS handshake with fonts.googleapis.com   → ~50ms (1 TLS RTT)
4. HTTP request: GET /css?family=Inter:400,600 → ~20ms
5. Follow-up DNS + TCP + TLS for fonts.gstatic.com → ~150ms
   (Google Fonts CSS references a different domain fonts.gstatic.com for actual font files)
Total overhead: ~320ms before the first byte of font data

Self-hosted from same origin (already connected):
Same-origin font request after connection established → 0ms DNS + TCP + TLS
HTTP request: GET /fonts/inter-400.woff2 → ~15ms
Total overhead: ~15ms
```

**Google Fonts — the most common third-party font case:**
```html
<!-- ❌ Third-party Google Fonts (2 origins: googleapis.com + gstatic.com) -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" />

<!-- ✅ Self-hosted equivalent after downloading with fontsource -->
<link rel="preload" href="/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/inter-600.woff2" as="font" type="font/woff2" crossorigin />
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-400.woff2') format('woff2');
    font-weight: 400;
    font-display: optional;  /* or 'swap' — eliminates FOIT entirely */
    unicode-range: U+0000-00FF;  /* Latin subset only */
  }
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-600.woff2') format('woff2');
    font-weight: 600;
    font-display: optional;
  }
</style>
```

**CDN library hosting — third-party risk:**
```html
<!-- ❌ Third-party CDN script — new origin overhead + zero control over content -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.7/axios.min.js"></script>

<!-- If cdnjs is compromised, or if the specific version is later found to have a vulnerability,
     your users are affected immediately — you have no control -->

<!-- ✅ Self-hosted (via npm + bundler) -->
<!-- Bundled into your app during build — you control versions, patches, and delivery -->
import axios from 'axios';  // bundled, tree-shaken, compressed, versioned by you

<!-- OR: Explicit SRI if you must use third-party CDN: -->
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.7/axios.min.js"
  integrity="sha512-..."
  crossorigin="anonymous"
></script>
```

**GDPR / Privacy implications of third-party assets:**
```
Loading Google Fonts from fonts.googleapis.com → browser sends:
  - User's IP address to Google's servers
  - User agent (browser + OS)
  - Referer header (your page URL that loaded the font)
  - Timestamp

Google's fonts.googleapis.com privacy policy: data used for internal analytics
German DPA (Datenschutzbehörde) 2022 ruling: loading Google Fonts from Google CDN
  without explicit user consent is a GDPR violation (transfer of IP to Google = personal data)
  → Multiple €5,000-€100,000 fines issued to German websites

Self-hosting: all font requests go to your own server → no third-party data transfer
```

### Architecture & Component Boundaries

```
[Self-hosted asset delivery architecture]

Build pipeline:
  npm install @fontsource/inter (pre-subsettted WOFF2 files, maintained by community)
  Bundle fonts into /public/fonts/ with content-hash filenames
  
Static serving:
  /fonts/inter-400.abc123.woff2 → Cache-Control: public, max-age=31536000, immutable
  /fonts/inter-600.def456.woff2 → Cache-Control: public, max-age=31536000, immutable
  → Served from same CDN as all other assets (Cloudflare, CloudFront)
  → No new DNS lookup/TCP/TLS required → loaded from existing connection

[When third-party assets remain justified]
  1. Stripe.js: payment processing script — must load from stripe.com origin for PCI compliance
     (Stripe requires the script to run from their origin for fraud detection)
  2. Google Maps JS API: complex mapping SDK — third-party maintained, version-managed
  3. YouTube/Vimeo embeds: video content you don't own
  4. `<link rel="dns-prefetch">` + `<link rel="preconnect">` mitigate connection overhead for these
```

### Data Flow & State Flow

**`preconnect` and `dns-prefetch` — mitigating third-party origin overhead:**
```html
<!-- Establish connection to critical third-party origins early -->
<!-- preconnect: DNS + TCP + TLS → full connection ready before script loads -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- dns-prefetch: DNS only → lower cost, lower benefit -->
<link rel="dns-prefetch" href="https://www.googletagmanager.com" />
<link rel="dns-prefetch" href="https://cdn.intercom.io" />

<!-- ⚠️ Don't preconnect to too many origins (each preconnect holds a TCP slot) -->
<!-- Limit to origins that are definitely needed and definitely not already connected -->
<!-- Preconnect to more than 6-8 origins can be counterproductive -->
```

### Performance Implications

| Scenario | Connection Cost | Privacy | Control |
|---|---|---|---|
| Third-party CDN (no preconnect) | 150–320ms extra per origin | IP + user data sent to 3P | None |
| Third-party CDN (with preconnect) | ~50ms extra (TLS already done) | IP + user data sent to 3P | None |
| Self-hosted on same CDN | 0ms (existing connection) | No 3P data transfer | Full |
| Self-hosted Google Fonts (fontsource) | 0ms (existing connection) | GDPR-compliant | Full version control |

### Scalability Considerations

- **Small product:** Self-host fonts via @fontsource; bundle all JavaScript dependencies; use preconnect for unavoidable third-party origins (Google Maps, Stripe)
- **Mid-size product:** Audit all third-party origins; justify each with explicit performance + privacy trade-off analysis; add CSP `connect-src` and `font-src` to allowlist only necessary origins
- **Enterprise product:** Complete third-party asset inventory in CI; privacy officer sign-off on any new third-party origin; GDPR notices for third-party data transfers; SRI for any unavoidable CDN scripts

### Trade-offs

| Self-hosted | Third-party CDN |
|---|---|
| Full performance control | No origin overhead if cached (pre-2020 case is mostly gone) |
| GDPR compliant — no 3P data transfer | Vendor maintains CDN, SSL certs, availability |
| SRI not needed (you serve the file) | SRI required for security |
| You manage version updates | Auto-updates on CDN (risk: breaking changes) |
| CDN required if global performance needed | Already on a global CDN (limited benefit) |

### ⚠️ Anti-Patterns & Pitfalls

- **Loading Google Fonts without considering GDPR:** In the EU/UK, loading Google Fonts from Google's CDN transfers personal data (IP address) to Google without a legal basis unless the user has explicitly consented — multiple regulatory fines have been issued; self-host or obtain explicit consent
- **Assuming cross-site CDN cache sharing still works:** Code review comments like "use the Bootstrap CDN so users who've visited other sites have it cached" reflect a pre-2020 assumption; cache partitioning makes this benefit nonexistent in modern browsers
- **Not pinning third-party CDN versions:** `<script src="cdn.example.com/library/latest/lib.js">` loads the latest version on every page load — breaking changes or security vulnerabilities are automatically pushed to your users. Always pin to an explicit version.
- **Preconnecting to too many origins:** Each `<link rel="preconnect">` reserves a TCP/TLS connection slot. Preconnecting to 20 origins consumes browser connection resources without proportional benefit. Limit to 3–5 critical unavoidable origins.
- **Using unpkg.com or jsDelivr in production:** These are prototype/development CDNs — their reliability SLA is not suitable for production traffic; they also have known GDPR issues. Use self-hosted or vendor-maintained CDNs for production assets.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
The SAP Customer Portal loaded Inter font from Google Fonts (`fonts.googleapis.com` → `fonts.gstatic.com`). Lighthouse showed a third-party connection cost of 310ms attributed to the Google Fonts origin chain. After migrating to self-hosted fonts using `@fontsource/inter` (pre-subsetted WOFF2 files, served from the same CDN as other SAP assets), the font connection overhead dropped to zero — fonts loaded via the existing CDN connection. Additionally, the SAP legal team had raised concerns about GDPR compliance regarding Google Fonts — the self-hosting migration simultaneously resolved the performance and legal concerns. Font payload was also reduced by 60% by subsetting to Latin + Latin-Extended code points.

**At FAANG scale:**
Meta self-hosts all fonts and stylesheets — no third-party origins for static assets. Stripe.js is a well-known exception to the self-hosting rule: Stripe requires their payment widget to be loaded from stripe.com for PCI DSS compliance (the script runs in Stripe's origin context, keeping card data off your server). Google itself self-hosts everything internal. The 2022 German court ruling (LG München) that loading Google Fonts without consent is a GDPR violation was applied to hundreds of German websites, creating a wave of Google Fonts self-hosting migrations across European businesses.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "The old argument for third-party CDNs was cross-site cache sharing — if jQuery was loaded from the same CDN URL on 1000 websites, users would have it cached. That's no longer true: Chrome 86, Safari ITP, and Firefox all implement cache partitioning, so a third-party CDN URL cached on site-A is never reused on site-B. Without that benefit, third-party CDN assets only add overhead: a new DNS lookup, TCP connection, and TLS handshake for each new origin — typically 150–300ms on first use. Self-hosting is now clearly preferred for static assets: fonts, shared JavaScript libraries, icon sets. Bundle dependencies with npm and a bundler — you control versions, you control the CDN delivery, and you control the origin. The remaining cases where third-party loading is justified are: vendor-required origins (Stripe.js must run from stripe.com for PCI compliance; Google Maps must come from Google); and video/social embeds you don't own. For those, `preconnect` can reduce the connection overhead from 300ms to ~50ms. And there's a GDPR dimension: loading Google Fonts from Google's CDN sends user IPs to Google — multiple EU regulatory fines have been issued for this; self-hosting eliminates that risk entirely."

### Likely Follow-up Questions
1. What is cache partitioning? → Modern browsers (Chrome 86+, Safari, Firefox) key the HTTP cache on both the requested resource URL AND the top-level site — preventing one site's third-party resource cache from being shared with another site; eliminates cross-site cache sharing
2. What is `<link rel="preconnect">`? → Tells the browser to initiate DNS, TCP, and TLS handshake for a third-party origin early in the page load, so when the actual resource request fires, the connection is already established (reduces first-request latency by ~150ms)
3. How do you self-host Google Fonts? → Download WOFF2 files directly from Google Fonts (or use `@fontsource/[font-name]` npm package); serve from your own domain with proper `@font-face` declarations; add `font-display: optional` or `swap`
4. When is third-party CDN acceptable? → When the vendor's origin context is required (Stripe, Google Maps); for embeds you don't own (YouTube); for prototype/POC work. Always add SRI hashes.

### How to Signal Senior Thinking
> "The principle I'd apply is: every external origin your page connects to is both a performance cost (DNS + TCP + TLS) and a security/privacy surface. Each third-party origin must be justified: what's the functional requirement, what's the performance cost with preconnect, what data is transferred, and is there a regulatory concern? I'd capture this as a third-party origin inventory in the project documentation — each entry with justification, owner, and performance characterization. This makes third-party origin creep visible and governable, rather than discovering 20 external connections in a WebPageTest waterfall two years after they were added."

---

## 💻 5. Code Example

```typescript
// next.config.ts — self-hosted fonts with Next.js next/font (recommended approach)
// next/font handles: WOFF2 download, subset, self-hosting at build time, size-adjust for CLS
import type { NextConfig } from 'next';

// In layout.tsx:
import { Inter, JetBrains_Mono } from 'next/font/google';
// next/font downloads fonts at BUILD TIME, serves from your origin — not google.com
// No third-party request at all — fonts are bundled into your deployment

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'optional',  // no FOIT; if font not ready, uses fallback (no CLS)
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

// Result: fonts served from /_next/static/media/*.woff2 on YOUR domain
// → No DNS lookup to fonts.googleapis.com
// → No IP transfer to Google → GDPR compliant
// → Preloaded via <link rel="preload"> in <head> automatically by Next.js
```

```typescript
// Manual self-hosting for non-Next.js projects using @fontsource
// npm install @fontsource/inter

// In global CSS:
import '@fontsource/inter/400.css';  // imports only 400 weight WOFF2
import '@fontsource/inter/600.css';  // imports only 600 weight WOFF2
// → Bundled into your app CSS → served from your origin → zero 3P request

// For third-party origins that MUST remain (e.g., Stripe, Google Maps):
// Add preconnect in HTML <head> to minimize connection cost:
```

```html
<!-- public/index.html — preconnect for unavoidable third-party origins -->
<head>
  <!-- Stripe: PCI compliance requires loading from stripe.com origin -->
  <link rel="preconnect" href="https://js.stripe.com" />

  <!-- Google Maps: complex SDK; self-hosting not feasible -->
  <link rel="preconnect" href="https://maps.googleapis.com" />
  <link rel="preconnect" href="https://maps.gstatic.com" crossorigin />

  <!-- Limit preconnects: more than 6-8 wastes connection resources -->
  <!-- Only preconnect to origins DEFINITELY used in critical path -->
</head>
```

**Third-party origin audit query (Node.js):**
```typescript
// Audit all external origins in codebase — run in CI to detect new third-party origins
import { execSync } from 'child_process';

const externalOriginPatterns = [
  /https:\/\/(?!your-app\.com)[a-z0-9.-]+\.(com|net|io|cdn)[^\s"')]+/gi,
];

function auditThirdPartyOrigins(dir: string): string[] {
  const output = execSync(
    `grep -r "https://" ${dir}/src --include="*.ts" --include="*.tsx" --include="*.html" -h`,
    { encoding: 'utf8' }
  );
  
  const origins = new Set<string>();
  for (const pattern of externalOriginPatterns) {
    const matches = output.matchAll(pattern);
    for (const match of matches) {
      try {
        origins.add(new URL(match[0]).origin);
      } catch {}
    }
  }
  return [...origins];
}
```

**Interview vs Production difference:**
In an interview, explain cross-site cache partitioning (the death of shared CDN caching), the DNS+TCP+TLS overhead of new third-party origins, and the GDPR angle for EU deployments. In production, add: automated third-party origin inventory in CI, `@fontsource` for font self-hosting, `next/font` for Next.js projects, SRI for all unavoidable CDN scripts, and legal review for any unvetted third-party origins.

---

## 🧠 6. Memory Aid

**Mental Model:** Loading an asset from a third-party CDN is like stopping at a toll booth for every new highway you turn onto — DNS, TCP, TLS are the toll, paid on first connection to each new origin. Self-hosting is using a highway you already paid toll for. Cache partitioning (post-2020) means you can't skip the toll just because someone else already paid it on a different road.

**If you go blank:** "Cross-site cache partitioning killed shared CDN caching. Third-party assets cost a new DNS+TCP+TLS connection (~150-300ms). Self-host: fonts (fontsource/next/font), JS libraries (bundle with npm). Third-party stays justified only for: vendor-required origins (Stripe, Maps), embeds you don't own. preconnect for unavoidable 3P origins. GDPR: self-hosting fonts avoids IP transfer to Google."

**Mnemonic:** **P-S-G** — **P**artitioned cache (no more shared CDN benefit), **S**elf-host (fonts, libraries), **G**DPR (IP transfer risk from third-party origins).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Performance: Cross-site cache partitioning eliminated the main advantage of shared CDNs; third-party origins now always incur 150–300ms of connection overhead on first use
→ Privacy/Legal: Loading assets from third-party origins (especially Google Fonts) constitutes a personal data transfer (IP address) that may require explicit GDPR consent — multiple EU regulatory fines have been issued
→ Security: Third-party CDN assets without SRI can be replaced by compromised content; self-hosting eliminates that attack surface entirely

**How it works (3 sentences):**
Cross-site cache partitioning (implemented in Chrome 86, Safari, Firefox) keys each cached resource on both the resource URL and the top-level site, making it impossible for a cached third-party CDN asset on site-A to be served as a cache hit on site-B — eliminating the shared-cache performance benefit that motivated third-party CDN usage for common libraries. Every distinct third-party origin a page connects to requires a new DNS lookup (~50ms), TCP handshake (~50ms), and TLS negotiation (~50ms), adding ~150–300ms overhead before the first byte of the resource; preconnecting to known third-party origins in `<head>` pre-establishes the connection during HTML parsing, reducing this overhead to near-zero for the actual resource requests. Self-hosting static assets (fonts via @fontsource or next/font; JavaScript libraries via npm bundling) serves them from your already-connected origin, eliminates third-party data transfer (GDPR compliance), enables immutable caching with content-hash filenames, and gives full control over versioning and security patch timing.

**Company relevance:**
- Microsoft: Microsoft CDN (ajax.aspnetcdn.com) is a common Azure dependency but self-hosting is recommended for production performance; understanding cache partitioning is relevant for Microsoft web platform teams advising customers
- Adobe: Adobe Typekit (fonts.adobe.com) is a third-party font CDN — Adobe engineers must understand the self-hosting vs Adobe Fonts trade-off for customers; Adobe's own products should self-host wherever possible
- Salesforce: Salesforce CDN serves Lightning design system assets; understanding when to self-host vs depend on Salesforce CDN is relevant for both Salesforce platform engineers and AppExchange developers
- Cisco: Cisco WebEx and Meraki use external CDN dependencies; internal engineers managing these products need to understand the privacy and performance implications of each third-party origin

---
**✅ Topic 194/486 complete.**
**→ Continuing to Topic 195: Resource Hints — Priority Hints API**
