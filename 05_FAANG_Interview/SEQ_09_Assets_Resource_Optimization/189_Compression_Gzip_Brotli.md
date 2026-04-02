# 189. Compression (Gzip, Brotli)
**Phase:** Performance & Architecture | **Sequence:** SEQ 09 | **Company:** Adobe, Microsoft, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

HTTP compression reduces the size of text-based assets (HTML, CSS, JavaScript, JSON, SVG, fonts) during transfer by encoding repeated byte sequences. Two algorithms dominate: **Gzip** (DEFLATE algorithm, universally supported, fast compression/decompression) and **Brotli** (Google's algorithm, 15–26% better compression than Gzip on typical web assets, 95%+ browser support). Both operate transparently via HTTP `Content-Encoding` negotiation — the browser sends `Accept-Encoding: br, gzip` in the request; the server responds with `Content-Encoding: br` or `Content-Encoding: gzip` and the compressed body. Critically, compression operates on top of minification — minify first, then compress — because whitespace elimination from minification compounds further with Brotli's dictionary-based compression. At SAP, enabling Brotli compression for our JS and CSS on the CDN reduced transfer sizes by an additional 18% on top of our already-minified bundles, translating directly to reduced LCP improvement on slow connections.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Compression is a server/CDN-level optimization that reduces the bytes transferred over the network for text assets. It doesn't change the file on disk — the server compresses on-the-fly or serves a pre-compressed file, the browser decompresses in memory, and the asset executes identically. Given that network bandwidth and latency are often the primary bottleneck for first-visit performance (especially on mobile), compression is one of the highest ROI optimizations available: it requires no application code changes, and Brotli level 6 typically yields 60–80% size reduction on minified JavaScript and CSS.

### How It Works Internally

**HTTP content negotiation:**
```
→ Browser request header:
   GET /app.js HTTP/2
   Accept-Encoding: br, gzip, deflate

← Server response:
   HTTP/2 200
   Content-Encoding: br
   Content-Type: application/javascript
   Cache-Control: public, max-age=31536000, immutable
   Vary: Accept-Encoding    ← CRITICAL: CDN must cache separate versions per encoding
   
   [Brotli-compressed body]
```
The browser decompresses the body before handing it to the JS parser. From the application's perspective, the asset is identical — compression is entirely transparent.

**Gzip vs Brotli internals:**
- **Gzip:** Uses DEFLATE (LZ77 + Huffman coding). Compresses by finding repeated byte sequences within a sliding window (32KB). Compression levels 1–9; level 6 is the standard balance of speed and ratio.
- **Brotli:** Dictionary + LZ77 + Huffman + context modeling. Ships with a 120KB built-in dictionary of common HTML/CSS/JS strings (`function`, `return`, `const`, `width:`, `display:`, etc.) — common web vocabulary matches the pre-built dictionary without needing to appear in the file itself, enabling better ratios on typical web content, especially at higher levels.

**Brotli compression levels:**
| Level | Speed | Ratio | Use Case |
|---|---|---|---|
| 1–3 | Very fast | Moderate | Dynamic content, on-the-fly compression (APIs, HTML responses) |
| 4–6 | Fast | Good | Standard on-the-fly for text responses |
| 7–9 | Slow | Better | Pre-compressed static assets as part of build pipeline |
| 10–11 | Very slow (seconds per file) | Best | Pre-compressed static JS/CSS/fonts in build pipeline — not for on-the-fly |

**Static pre-compression (best practice for deployed assets):**
```javascript
// Build pipeline: generate .br and .gz files alongside originals
// vite.config.ts
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      compressionOptions: { level: 11 },  // max compression — done at build time, not per-request
      threshold: 1024,  // only compress files > 1KB
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      compressionOptions: { level: 9 },
    }),
  ],
});
// Output:
//   app.abc123.js        (uncompressed original)
//   app.abc123.js.br     (Brotli level 11 pre-compressed)
//   app.abc123.js.gz     (Gzip level 9 pre-compressed)
```

**Nginx serving pre-compressed files:**
```nginx
# nginx.conf
server {
  gzip_static on;    # serve .gz file if it exists and client supports gzip
  brotli_static on;  # serve .br file if it exists and client supports brotli (ngx_brotli module)
  
  location ~* \.(js|css|html|json|svg|woff2)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Vary "Accept-Encoding";  # critical for CDN caching
  }
}
# nginx serves app.abc123.js.br to Brotli-capable browsers — zero CPU cost, pre-compressed
```

**`Vary: Accept-Encoding` — the critical CDN header:**
Without `Vary: Accept-Encoding`, a CDN may cache the Brotli-compressed response and serve it to a browser that only sent `Accept-Encoding: gzip` — browser receives Brotli data, doesn't know how to decompress it, fails. The `Vary` header instructs the CDN to maintain separate cache entries per accepted encoding.

### Architecture & Component Boundaries

```
[Build pipeline]
  minify (Terser/cssnano) → pre-compress (Brotli-11, Gzip-9) → deploy to CDN

[CDN/Origin server]
  Receives request with Accept-Encoding header
  Checks for pre-compressed .br or .gz file
  Serves pre-compressed variant with Content-Encoding header
  CDN caches per encoding via Vary: Accept-Encoding

[Browser]
  Receives compressed response
  Decompresses on main thread (Gzip) or uses streaming decompressor (Brotli)
  Hands decompressed bytes to appropriate parser (JS engine, CSS parser)
```

### Data Flow & State Flow

**Typical compression ratios on web assets (minified → compressed):**

| Asset (minified) | Gzip ratio | Brotli ratio | Brotli vs Gzip savings |
|---|---|---|---|
| React (18.2) | 42KB (gzip) | 38KB (brotli) | -10% |
| Tailwind CSS 3 (purged) | 8KB (gzip) | 6.5KB (brotli) | -18% |
| Application JS (100KB min) | 35KB (gzip) | 28KB (brotli) | -20% |
| JSON API response | 40% of raw | ~56% of raw | -20% vs gzip |
| HTML (typical page) | 25% of raw | 22% of raw | -12% |

**Real numbers from SAP:**
- Before: 2.1MB minified → 680KB gzip → transfer
- After enabling Brotli-11 (static pre-compress): 680KB → 558KB brotli → **18% additional reduction**
- On 3G connection (estimated): 558KB vs 680KB = ~1 second additional transfer time saved

### Performance Implications

| Setup | Impact |
|---|---|
| No compression | Baseline — serving raw minified assets |
| Gzip on-the-fly | 60–75% size reduction; slight server CPU cost per request |
| Gzip static (pre-compressed) | Same ratio, zero server CPU cost on request |
| Brotli on-the-fly (level 4–6) | 70–80% size reduction; similar CPU cost to Gzip-6 |
| Brotli static (pre-compressed at level 11) | 75–85% size reduction; zero server CPU cost |
| No `Vary: Accept-Encoding` | CDN corruption; wrong encoding served to wrong browser |

### Scalability Considerations

- **< 10K users:** Nginx/Node with gzip middleware; `compression` npm package for Express; `gzip: true` in Vite config. Move to Brotli when CDN supports it.
- **100K users:** Static pre-compression in CI build; CDN edge serving pre-compressed assets; confirm CDN's `Vary: Accept-Encoding` handling
- **10M+ users:** All assets pre-compressed at build time with Brotli-11; CDN edge serves assets from 200+ PoPs globally; Brotli for API responses at gateway level (level 4–6 for on-the-fly); consider Zstandard (zstd) for internal service-to-service calls (better speed/ratio for dynamic payloads)

### Trade-offs

| Brotli static (pre-compressed) | Gzip static | Brotli on-the-fly |
|---|---|---|
| Best compression ratio | Good ratio, universal support | Good ratio, no build step |
| No server CPU on request | No server CPU on request | CPU cost per unique response |
| Build pipeline complexity | Simpler setup | Simplest to deploy |
| Must regenerate on every deploy | Must regenerate on deploy | No pre-generation needed |
| Not suitable for dynamic content | Not suitable for dynamic content | Works for dynamic API responses |

### ⚠️ Anti-Patterns & Pitfalls

- **Compressing already-compressed assets:** Brotli/Gzip on JPEG, PNG, WebP, WOFF2 is wasteful — these formats are already compressed (WOFF2 uses brotli internally); attempting to re-compress adds overhead with near-zero size reduction. Configure exclusions for binary asset types.
- **Missing `Vary: Accept-Encoding` header:** CDN may return the wrong encoding to the browser — hard-to-debug issue that manifests as garbled asset errors in DevTools. Always set `Vary: Accept-Encoding` on any compressed response.
- **On-the-fly Brotli at level 11 for dynamic content:** Level 11 compression is extremely slow (~seconds per file); on-the-fly compression for dynamic API responses should use level 4–6 maximum. Level 11 is only viable for pre-compressed static files in the build pipeline.
- **Compressing small files (< 1KB):** Compression headers + handshake overhead can exceed size savings for very small files (< 1KB); configure a minimum threshold (1024 bytes) below which compression is skipped.
- **Not verifying compression is actually active:** Browser DevTools → Network tab → response headers `Content-Encoding: br` confirms active compression; Size column shows "X.Xkb transferred / X.Xkb resource" — transferred < resource confirms compression. Common mistake: developer configures compression but CDN strips the header or bypasses it.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
After SAP's new CDN deployment, Brotli compression was available but the original Nginx configuration was only configured for Gzip. After updating the CDN response header configuration and adding Brotli pre-compression to the Webpack build pipeline (output `.br` files at level 11), the JS bundle transfer size dropped from 680KB gzip to 558KB brotli — an 18% further reduction. More significantly, a check of DevTools revealed that several JSON API responses from the BI metadata service were not compressed at all (missing `Content-Encoding` header) — adding gzip to the Node.js Express layer for those responses reduced their transfer from ~280KB to ~65KB per dashboard load.

**At FAANG scale:**
Google has contributed Brotli to IETF standardization (RFC 7932) and uses it ubiquitously across all Google web properties. Cloudflare applies Brotli compression at edge nodes globally, converting Gzip-configured origins to Brotli delivery automatically. Fastly CDN pre-compresses assets at edge ingestion, storing both encoded variants per content-hash filename so that subsequent requests to any PoP are served from cache.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Compression reduces text asset transfer size via HTTP `Content-Encoding` negotiation. The browser sends `Accept-Encoding: br, gzip`, and the server responds with the best supported encoding. Brotli is 15–26% better than Gzip for typical web assets because it includes a built-in dictionary of common HTML, CSS, and JavaScript vocabulary. The key decision is static pre-compression versus on-the-fly: for static JS and CSS with content-hash filenames, I pre-compress during the build pipeline at Brotli level 11 and Gzip level 9 — because these files are never regenerated between deploys, the CPU-intensive compression happens once at build time, not on every request. At SAP, adding Brotli pre-compression to our CDN assets saved an additional 18% on top of already-minified bundles — and separately, we found our JSON metadata API responses were uncompressed — adding gzip to those responses reduced a 280KB payload to 65KB. Two critical details I always check: `Vary: Accept-Encoding` must be set on all compressed responses or CDN may serve the wrong encoding, and never compress already-compressed formats like JPEG, WebP, or WOFF2."

### Likely Follow-up Questions
1. Why is Brotli better than Gzip? → Built-in dictionary of common web vocabulary; better context modeling; ratio advantage is 15–25% on typical minified web assets
2. What is `Vary: Accept-Encoding`? → Tells CDN/proxies to cache separate versions for different Accept-Encoding values — without it, CDN may serve Brotli to a Gzip-only browser
3. Should you compress images with Gzip? → No — JPEG, PNG, WebP, AVIF, WOFF2 are already compressed; re-compressing them adds overhead with negligible or negative size benefit
4. What's the best way to verify compression is working? → DevTools Network tab → select the asset → Headers tab → check `Content-Encoding: br` or `gzip`; also check that "transferred" size < "resource" size in Size column

### How to Signal Senior Thinking
> "Beyond static assets, I'd look at compression for API response payloads — JSON responses are highly compressible and often neglected. A 280KB metadata JSON response compresses to ~65KB with gzip.  And for very high-traffic APIs, I'd consider Zstandard (zstd) for internal service-to-service communication — it's faster to decompress than Brotli with similar ratios, which matters when a gateway is decompressing hundreds of responses per second to process them before re-serving to clients."

---

## 💻 5. Code Example

```typescript
// Express.js — enable gzip/brotli compression for API responses and SSR HTML
import express from 'express';
import compression from 'compression';
import { createBrotliCompress, createGzip, constants as zlibConstants } from 'zlib';
import { pipeline } from 'stream';
import { promisify } from 'util';

const app = express();

// Standard gzip for dynamic responses (API JSON, SSR HTML)
app.use(
  compression({
    level: 6,          // balance between speed and ratio for on-the-fly
    threshold: 1024,   // don't compress responses < 1KB
    filter: (req, res) => {
      const contentType = res.getHeader('Content-Type') as string ?? '';
      // Never compress already-compressed formats
      if (/image|audio|video|font\/woff2/.test(contentType)) return false;
      return compression.filter(req, res);
    },
  })
);

// Build validation: check that pre-compressed assets exist
import { existsSync } from 'fs';
import { join } from 'path';

function validatePrecompressedAssets(distDir: string): void {
  const requiredVariants = ['.br', '.gz'];
  const staticFiles = ['app.js', 'vendor.js', 'main.css'];
  
  for (const file of staticFiles) {
    for (const ext of requiredVariants) {
      const path = join(distDir, `${file}${ext}`);
      if (!existsSync(path)) {
        throw new Error(`❌ Missing pre-compressed asset: ${path} — run build pipeline first`);
      }
    }
  }
  console.log('✅ All pre-compressed assets verified');
}
```

```nginx
# nginx.conf — serve pre-compressed static files with correct Vary header
http {
  include       mime.types;
  
  server {
    # Serve Brotli pre-compressed files (requires ngx_brotli module)
    brotli_static on;
    gzip_static   on;    # fallback to .gz if .br not served
    
    location /static/ {
      root /var/www/dist;
      
      # Content-hash filenames → immutable caching
      add_header  Cache-Control  "public, max-age=31536000, immutable";
      add_header  Vary          "Accept-Encoding";   # CDN must cache per encoding
      
      # Disable compression for already-compressed formats
      location ~* \.(jpg|jpeg|png|webp|avif|gif|ico|woff2)$ {
        gzip_static  off;
        brotli_static off;
      }
    }
    
    # API responses — on-the-fly gzip (level 6, not Brotli for dynamic content)
    location /api/ {
      gzip            on;
      gzip_comp_level 6;
      gzip_min_length 1024;
      gzip_types      application/json text/plain;
      add_header      Vary "Accept-Encoding";
      proxy_pass      http://api_upstream;
    }
  }
}
```

**Interview vs Production difference:**
In an interview, explain the Accept-Encoding negotiation, Brotli's dictionary advantage, and the static pre-compression pattern. In production, add: build pipeline integration, the `Vary: Accept-Encoding` enforcement, compression verification in CI (check that `.br`/`.gz` files exist), and API response compression monitoring.

---

## 🧠 6. Memory Aid

**Mental Model:** Compression is like vacuum-packing clothes for travel. Brotli has a smarter vacuum machine because it knows the shape of common garments (web vocabulary dictionary) — it compresses better. The bag is still the same clothes — the browser unpacks it back to identical content.

**If you go blank:** "HTTP compression via Content-Encoding negotiation. Brotli 15–25% better than Gzip on text assets thanks to built-in web vocabulary dictionary. Pre-compress at build time for best ratio with zero server CPU cost. Never compress already-compressed formats. Always set Vary: Accept-Encoding for CDN."

**Mnemonic:** **B-V-P** — **B**rotli beats gzip, **V**ary: Accept-Encoding required, **P**re-compress at build time.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: 60–85% reduction in text asset transfer sizes; directly reduces LCP and TTI, especially on slow mobile connections
→ Performance: Brotli 15–26% smaller than Gzip at equivalent decompression speed; decompression is cheap and streaming, adding negligible latency
→ Business: Free performance improvement with zero application code changes — highest ROI optimization available at infrastructure level

**How it works (3 sentences):**
HTTP compression uses `Accept-Encoding` / `Content-Encoding` header negotiation — the browser advertises supported algorithms, the server replies with the best available encoding and the compressed body, and the browser decompresses transparently before handing the asset to the parser. Brotli outperforms Gzip by 15–26% on web text assets because it uses a built-in 120KB dictionary of common HTML, CSS, and JavaScript tokens — allowing frequent web vocabulary to match pre-known dictionary entries rather than needing to be encoded from scratch within the file. Static assets like JS and CSS bundles should be pre-compressed at build time (Brotli level 11, Gzip level 9) and served directly by the CDN or Nginx without per-request CPU cost, while dynamic content (API JSON, SSR HTML) uses on-the-fly compression at level 4–6.

**Company relevance:**
- Microsoft: Azure CDN and Azure Front Door support Brotli — enabling Brotli pre-compression on deploys is standard optimization for Microsoft web teams
- Adobe: adobe.com static assets are served via Fastly which auto-enables Brotli; understanding how to pre-compress in the build pipeline is relevant for self-hosted or custom CDN setups
- Salesforce: Salesforce's Lightning Platform serves JavaScript bundles for each org configuration — Brotli compression of those bundles reduces first-visit load times globally
- Cisco: Internal dashboards with large JavaScript payloads benefit significantly from Brotli — particularly relevant for global deployments where inter-regional network latency adds to transfer time

---
**✅ Topic 189/486 complete.**
**→ Continuing to Topic 190: CSS-in-JS Performance Trade-offs**
