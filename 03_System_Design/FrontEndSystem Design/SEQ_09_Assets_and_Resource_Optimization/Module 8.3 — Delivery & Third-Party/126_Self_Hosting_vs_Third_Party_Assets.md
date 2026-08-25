# 126. Self-Hosting vs Third-Party Assets

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Self-hosting** means serving fonts, scripts, and media from your own domain or CDN rather than relying on external third-party domains like Google Fonts, cdnjs, or jsDelivr. The traditional argument for third-party hosting was browser caching — if many sites share `googleapis.com`, users have the font cached from a previous site. This cache-sharing benefit was **eliminated by browsers in 2020** (Chrome 86, Firefox 85) via cache partitioning — each site's cache is now isolated by origin. With the cache benefit gone, self-hosting is almost always the correct choice: it eliminates DNS lookups for external domains, removes privacy concerns (GDPR), enables customization (subsetting), guarantees availability, and gives you full control over caching headers. The exception is when a third-party CDN has meaningfully better global infrastructure than yours, or when a service is specifically designed to be served from its own CDN (e.g., Stripe.js for security reasons).

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### The Network Cost of Third-Party Hosting

```
Loading Google Fonts from googleapis.com:
─────────────────────────────────────────────────────────────
1. Browser encounters @import url('https://fonts.googleapis.com/...')
2. DNS lookup for fonts.googleapis.com        → ~20-100ms
3. TCP connection                             → ~20-80ms RTT  
4. TLS handshake                              → ~40-160ms
5. HTTP request for CSS (font descriptor)     → ~20-80ms
6. Parse CSS, find font file URL (gstatic.com)
7. DNS lookup for fonts.gstatic.com           → ~20-100ms (DIFFERENT domain!)
8. TCP + TLS for gstatic.com                  → ~60-240ms
9. Download font file                         → variable
─────────────────────────────────────────────────────────────
Total connection overhead: ~180-760ms for TWO separate domain handshakes

Loading from self-hosted / your CDN (same origin or preconnected):
─────────────────────────────────────────────────────────────
1. Connection already established (same origin)
2. HTTP/2 multiplexed request for font        → ~10-30ms
─────────────────────────────────────────────────────────────
Total: ~10-30ms

Self-hosting is 10-25× faster for initial font load
```

### Self-Hosting Key Assets

#### Fonts

```html
<!-- ❌ Google Fonts (third-party, 2 DNS lookups, no cache benefit since 2020) -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">

<!-- ✅ Self-hosted (proper approach) -->
<!-- Step 1: Download font → fontsource.org or google-webfonts-helper.herokuapp.com -->
<!-- Step 2: Subset using pyftsubset or Glyphhanger -->
<!-- Step 3: Host on your CDN -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>

<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-var.woff2') format('woff2 supports variations');
    font-weight: 100 900;
    font-display: swap;
    /* Immutable cache: font content never changes for this hash-named file */
  }
</style>
```

```typescript
// Next.js: next/font/google self-hosts automatically
// No external request — Google Fonts are proxied through your server

import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  // next/font:
  // 1. Downloads font at build time from Google Fonts
  // 2. Serves from your Next.js server/CDN (no Google DNS request in production)
  // 3. Generates optimal @font-face with correct font-display
  // 4. Creates <link rel="preload"> automatically
});
```

#### JavaScript Libraries

```html
<!-- ❌ cdnjs / jsDelivr — third-party CDN, external DNS, no privacy control -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js" crossorigin="anonymous"></script>
<!-- Problems:
     1. DNS lookup for cdnjs.cloudflare.com
     2. No cache sharing (since Chrome 86 cache partitioning)
     3. SRI hash must be hardcoded — breaks if CDN updates the file
     4. Outage of cdnjs = your app breaks
-->

<!-- ✅ Bundle your deps (webpack/vite) — self-hosted in your own bundle -->
<!-- Libraries should be in package.json and bundled with your app -->
<!-- Serve the bundle from your CDN with immutable caching headers -->

<!-- Exception: Large shared runtime (React in Module Federation) -->
<!-- Only use external CDN when: 
     - You control the CDN domain (your own CDN, not a public service)
     - Library is sufficiently large to justify separate request with caching
     - You use Module Federation sharing across micro-frontends on same domain
-->
```

#### Analytics SDKs

```typescript
// ❌ Loading Segment via their CDN
// analytics.js from cdn.segment.com — external DNS + tracking privacy concern
window.analytics.load('YOUR_WRITE_KEY');

// ✅ Self-hosted analytics proxy
// Proxy Segment requests through your own domain:
// 1. User calls: POST /api/analytics (your domain — no third-party DNS)
// 2. Server forwards to Segment API
// 3. User's browser never touches segment.com DNS

// Segment self-hosting config:
const analytics = AnalyticsBrowser.load({
  writeKey: 'YOUR_KEY',
  cdnURL: 'https://cdn.yourdomain.com',  // Your CDN proxy for analytics.js
});
```

### Caching Strategy for Self-Hosted Assets

```typescript
// Self-hosting via your CDN gives FULL control over cache headers
// This is the key advantage over third-party hosting

// Immutable assets (content-hashed): max-age 1 year
// example: /fonts/inter-var.abc123def.woff2
// Response headers:
const fontHeaders = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  // immutable: browser NEVER re-validates this — 0 conditional requests
  // Correct because hash in filename changes if file content changes
};

// JavaScript chunks with content hashing:
// main.7a8b9c.js → 1 year cache
// vendor.3f4e5d.js → 1 year cache
const assetHeaders = {
  'Cache-Control': 'public, max-age=31536000, immutable',
};

// Vary header for format negotiation (AVIF/WebP):
const imageHeaders = {
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
  'Vary': 'Accept',  // Cache separate versions per Accept header value
};
```

### Self-Hosting Trade-off Analysis

| Asset Type | Self-Host? | Reason |
|---|---|---|
| Fonts (Google Fonts) | ✅ Yes | Cache partitioning eliminated shared cache; GDPR | 
| Small NPM libraries | ✅ Yes (bundle) | No benefit to external CDN |
| Large shared libs (React via MFE) | ⚠️ Conditionally | Module Federation sharing — but use YOUR CDN |
| Stripe.js | ❌ No | Stripe mandates their CDN for security/PCI reasons |
| reCAPTCHA | ❌ No | Must load from Google for verification to work |
| Payment tokenizers | ❌ No | Security requirement — vendor's domain for PCI compliance |
| CloudFlare Turnstile | ❌ No | Must load from Cloudflare |

### GDPR Implications of Third-Party Hosting

```typescript
// When a user loads your page and the browser requests:
//   fonts.googleapis.com — Google records: IP address, timestamp,
//                          User-Agent, Referer (your site)
// This is a data transfer to Google (a third-party) under GDPR.
// EU courts (notably German courts) have found this to be a GDPR violation
// without explicit user consent BEFORE the asset loads.

// Self-hosting eliminates this entirely:
// No external DNS request = no data transfer to third parties = no GDPR issue

// Implementation in privacy-conscious apps:
// - Self-host ALL fonts (no Google Fonts DNS even with consent banner)
// - Use server-side analytics (no client-side Segment/GA DNS from browser)
// - Proxy any remaining third-party calls through your domain
```

### Practical Self-Hosting Setup

```bash
# Step 1: Download Google Fonts for self-hosting
npx google-webfonts-helper
# Or use: https://google-webfonts-helper.herokuapp.com/fonts/inter?subsets=latin

# Step 2: Subset for your scripts
pip install fonttools brotli
pyftsubset Inter[wght].woff2 \
  --output-file=Inter-latin-var.woff2 \
  --flavor=woff2 \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"

# Step 3: Copy to public/fonts/
cp Inter-latin-var.woff2 public/fonts/

# Step 4: Add to CDN with immutable headers
# CDN config: serve /fonts/* with Cache-Control: public, max-age=31536000, immutable
```

```nginx
# nginx: Self-hosted fonts with immutable cache
location /fonts/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "*";  # Allow font use cross-origin
    gzip_static on;   # Serve pre-gzipped if available
}
```

### When Third-Party CDN IS Justified

```typescript
// 1. Public CDN for content that MUST come from a specific origin
//    Stripe.js: Stripe verifies it's loaded from their domain
//    reCAPTCHA v3: Google validates it comes from their servers

// 2. Module Federation across your own CDN (not public CDN)
//    React shared across your micro-frontends via YOUR CDN domain
//    Not: open CDN like unpkg

// 3. Embedded widgets that require their origin for functionality
//    Disqus, Typeform, Calendly — must load from vendor domain
//    For these: use Facade pattern + lazy load

// 4. Media content delivery (video streaming)
//    AWS CloudFront, Cloudflare Stream — their CDN has better perf than yours
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**German Courts (GDPR Ruling):**
In 2022, a German court ruled that loading Google Fonts from Google's servers violated GDPR because the user's IP was transferred to Google without explicit consent. Many German enterprises self-host all fonts as a result.

**Vercel (Next.js team):**
The `next/font` package automatically self-hosts Google Fonts at build time — the font is downloaded from Google's servers during build and served from your deployment. Users never make a DNS request to `fonts.googleapis.com`. This is the recommended approach for all Next.js apps.

**Booking.com:**
Migrated all third-party CDN resources to self-hosted. Removed external DNS lookups for 12 third-party CDN domains. Total connection time savings: ~400ms on 3G, ~80ms on 4G.

**SAP (enterprise):**
SAP Fiori applications are self-contained deployments. All fonts, icons (SAP UI5 icon fonts), and JavaScript libraries are bundled with the application. No external CDN references — required for deployment in air-gapped enterprise environments.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "The cache-sharing argument for third-party CDNs died in 2020 when Chrome and Firefox implemented cache partitioning — different sites no longer share cache entries. With that gone, self-hosting wins on every other dimension: no third-party DNS lookup (saves 100-400ms on first load), GDPR compliance by default, full control over caching headers (I can set 1-year immutable caching on content-hashed files), and no single-point-of-failure dependency on an external service. For fonts, I use `next/font/google` in Next.js which self-hosts automatically, or download and subset with pyftsubset for non-Next.js projects. The one exception is security-sensitive vendor scripts — Stripe.js must load from Stripe's domain for PCI compliance, and reCAPTCHA must load from Google. For everything else, self-host on your CDN, set `Cache-Control: public, max-age=31536000, immutable` on content-hashed assets, and eliminate the performance and privacy cost of external DNS lookups."

**Likely Follow-up Questions:**
1. *What happened to the browser cache sharing argument?* → Cache partitioning (Chrome 86, Firefox 85) means each site's cache is isolated — users don't benefit from other sites loading the same CDN file
2. *How do you handle self-hosting Google Fonts technically?* → Download WOFF2 files; subset with pyftsubset; serve from your CDN with `Cache-Control: immutable`; OR use `next/font/google`
3. *What are the GDPR implications?* → Loading from Google/third-party CDN sends user IP and request metadata to that third party without explicit consent — potential GDPR violation in EU
4. *When would you recommend keeping a third-party CDN?* → Stripe/payment tokenization (security mandate), reCAPTCHA, and media streaming services with better global reach
5. *How do you set up immutable caching for self-hosted assets?* → Content-hash the filename (webpack/vite does this automatically); set `Cache-Control: public, max-age=31536000, immutable` — browser caches for 1 year, re-fetches only if URL changes

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (Self-Hosting Setup Script)
────────────────────────────────────────────────────────────

```typescript
// scripts/self-host-fonts.ts
// Run once: downloads and subsets fonts for self-hosting

import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';

const FONTS_DIR = 'public/fonts';
if (!existsSync(FONTS_DIR)) mkdirSync(FONTS_DIR, { recursive: true });

// Download Inter Variable from Google (build-time HTTP request, not runtime)
const fonts = [
  {
    name: 'Inter',
    url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
    outputFile: 'inter-var-latin.woff2',
  },
];

fonts.forEach(({ url, outputFile }) => {
  console.log(`Downloading ${outputFile}...`);
  execSync(`curl -L "${url}" -o "${FONTS_DIR}/${outputFile}"`);
  console.log(`✓ Saved to ${FONTS_DIR}/${outputFile}`);
});

console.log('\nFont self-hosting complete!');
console.log('Add to your @font-face CSS and preload <link>');
```

```css
/* public/styles/fonts.css — final self-hosted declaration */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/inter-var-latin.woff2') format('woff2 supports variations'),
       url('/fonts/inter-var-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
                 U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193,
                 U+2212, U+2215, U+FEFF, U+FFFD;
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"Cache sharing is dead — self-host everything you can control."**

Cache partitioning year: **2020** (Chrome 86, Firefox 85)

Self-host:
- ✅ Fonts → `next/font` or manual download + pyftsubset
- ✅ NPM libraries → bundle them (webpack/vite)
- ✅ Analytics scripts → proxy through your domain

Don't self-host:
- ❌ Stripe.js / payment tokenizers (PCI security requirement)
- ❌ reCAPTCHA (verification requires Google origin)

**If you go blank:** "Cache sharing between sites died in 2020. Self-hosting fonts and scripts eliminates 2-3 DNS lookups per page load (100-400ms) and resolves GDPR concerns."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Performance**: Each third-party DNS lookup = 20-100ms; 3 third-party domains = 60-300ms overhead on cold start
→ **GDPR/Privacy**: External CDN requests send user IP to third-party servers without explicit consent
→ **Availability**: `fonts.googleapis.com` outage (has happened) = your fonts break; self-hosted = you control the uptime

**How it works:**
→ When a browser requests `fonts.googleapis.com`, it performs: DNS lookup → TCP connect → TLS handshake → HTTP request — all before the font starts downloading. Self-hosting eliminates all of this by serving from an already-connected origin (your CDN) using HTTP/2 multiplexing over an existing connection.

**Company relevance:**
→ **Microsoft**: All Microsoft web properties self-host Segoe UI font files — no external DNS requests for fonts on microsoft.com
→ **Adobe**: Adobe Fonts (Typekit) serves fonts from self-controlled CDN (`use.typekit.net`) — not public Google CDN — and supports self-hosting for enterprise customers
→ **Salesforce**: Lightning Design System fonts (Salesforce Sans) are entirely self-hosted within Salesforce infrastructure — no third-party DNS
→ **Cisco**: DevNet and WebEx marketing sites self-host all fonts and analytics assets post-2021 replatforming
