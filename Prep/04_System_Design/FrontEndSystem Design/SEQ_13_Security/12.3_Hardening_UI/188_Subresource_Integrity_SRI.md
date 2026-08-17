# 188. Subresource Integrity (SRI)

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Subresource Integrity (SRI)** is a browser security mechanism that allows you to specify a cryptographic hash in your `<script>` and `<link>` tags so the browser can verify that the resource loaded from a CDN or third-party origin has not been tampered with. If the file's content doesn't match the expected hash, the browser refuses to execute it — silently blocking any injected malicious code. It exists because CDNs are shared infrastructure: a compromised CDN, a BGP hijack, or a domain acquisition can silently swap legitimate scripts with malicious payloads — as happened with the Polyfill.io incident in 2024 where 100,000+ sites were affected overnight. SRI is your last line of defence when you cannot self-host a resource, giving you cryptographic assurance that what you ship is what users receive.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### How the Browser Verifies SRI

```
HTML Parser encounters:
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-abc123…"
        crossorigin="anonymous">

        ┌─────────────────────────────────────────┐
        │  1. Browser fetches lib.js via network  │
        │  2. Computes SHA-384 hash of response   │
        │  3. Compares with integrity attribute   │
        │                                         │
        │  Match → execute script ✓               │
        │  Mismatch → block + console error ✗     │
        └─────────────────────────────────────────┘
```

The hash is base64-encoded: `sha384-<base64(sha384(file_bytes))>`

You can specify multiple hashes (comma-separated) for rollout safety — any one match allows loading. You can also support multiple algorithms: `sha256-abc sha384-def` simultaneously.

### The `crossorigin` Requirement

SRI requires CORS. The `crossorigin="anonymous"` attribute signals the browser to make a CORS request (no credentials). Without it, the browser uses "no-cors" mode which opaquely serves the response — the browser can't inspect the bytes for hashing. The CDN **must** respond with `Access-Control-Allow-Origin: *` or the request fails.

```html
<!-- ❌ No crossorigin → SRI cannot verify → browser may ignore integrity -->
<script src="https://cdn.example.com/lib.js" integrity="sha384-…">

<!-- ✅ With crossorigin → CORS response → browser can hash and verify -->
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-…"
        crossorigin="anonymous">
```

### Hash Algorithms

| Algorithm | Security | Output Size | Recommendation |
|---|---|---|---|
| sha256 | Good (2^128 collision resistance) | 32 bytes / 44 base64 | Minimum acceptable |
| sha384 | Better | 48 bytes / 64 base64 | **Recommended** |
| sha512 | Best | 64 bytes / 88 base64 | Use for critical libraries |

### SRI Scope: What It Covers

| Resource Type | Supported | Notes |
|---|---|---|
| `<script>` | ✅ Yes | Most critical — JS execution |
| `<link rel="stylesheet">` | ✅ Yes | CSS injection attacks |
| `<link rel="preload">` | ✅ Yes | Verify before execution |
| `<img>` | ❌ No | Too many variants/srcsets |
| `fetch()` requests | ❌ No | Not yet supported |
| WebWorker `importScripts` | ❌ No | Use Service Worker CSP instead |

### SRI Failure Handling

```html
<!-- onerror fires if SRI mismatch occurs — use for graceful degradation -->
<script
  src="https://cdn.example.com/react.js"
  integrity="sha384-…"
  crossorigin="anonymous"
  onerror="loadFallback()">
</script>
<script>
  function loadFallback() {
    // Load self-hosted backup
    const s = document.createElement('script');
    s.src = '/vendor/react.js';
    document.head.appendChild(s);
  }
</script>
```

### SRI in the Build Pipeline

```bash
# Generate hash from a file (Linux/Mac)
openssl dgst -sha384 -binary react.min.js | openssl base64 -A
# → hash string to paste into integrity attribute

# Or use sri-hash CLI
npx sri-hash https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js
# → sha384-Zug+QiDoJOrZ5t4lssLdxGhVrurbmBWoR1Km2zxZAim7zcEtdJYCiBQ4iE8wv/J
```

### CDN vs Self-Hosted Trade-off

| Approach | Pros | Cons | When to Use |
|---|---|---|---|
| CDN + SRI | Cache hit across sites, edge proximity | Must regenerate hash on CDN update | Open-source libraries (React, jQuery, fonts) |
| Self-hosted | Full control, no third-party risk, no hash maintenance | No cross-site cache sharing, more bandwidth | Internal libraries, anything you modify |
| CDN + SRI + Fallback | Best security posture | More complex HTML | Tier-1 external dependencies in production |

### Anti-Patterns

- **Never use SRI without `crossorigin`** — the browser silently skips integrity checks in no-cors mode
- **Never set SRI on self-hosted resources** — pointless; you already control the origin
- **Never copy SRI hashes manually from CDN providers without verifying** — compute your own hash from the actual file
- **Forgetting to update hashes on library version bump** — causes silent load failures; automate hash regeneration in your dependency update workflow
- **Not handling onerror** — if CDN is compromised AND SRI fires, users get a JS-less page with no fallback

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Polyfill.io Incident (2024 — Hruday's exact relevance):**
A Chinese firm acquired the polyfill.io domain. The previously-trusted `cdn.polyfill.io/v3/polyfill.min.js` started serving malicious redirects to adult sites and phishing pages. Sites using SRI would have blocked the compromised script immediately — the SHA-384 would not match. Sites without SRI silently served the malware to every mobile user.

**SAP Fiori Context:**
Fiori applications often load SAPUI5 from SAP CDN (`https://ui5.sap.com`). In enterprise deployments where change management forbids self-hosting, SRI on the SAPUI5 bootstrap script provides assurance that the version tested in QA is the version in production.

**Adobe Creative Cloud Web:**
Adobe loads several third-party fonts (Adobe Fonts), analytics, and Typekit from CDNs. All external `<link>` stylesheets and `<script>` tags for Adobe products use SRI — a font stylesheet swap could inject CSS keyloggers or CSS-based data exfiltration. This is standard practice in their security review checklist.

**Microsoft:**
Microsoft Fluent CDN resources served to external apps (Azure portal, Outlook web) use SRI on all static assets. Their security SDL (Security Development Lifecycle) mandates SRI checks as a required item in the pre-release security review.

**Scaling perspective:**
- 1K users → SRI is a 5-minute static HTML change; free security
- 100K users → Automate hash generation in webpack plugin / build script
- 10M users → SRI combined with CSP `require-sri-for script style` directive enforces SRI at policy level — any script without a valid hash is blocked even if a developer forgot to add one

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Subresource Integrity is a browser mechanism where you embed a cryptographic hash — typically SHA-384 — directly in your `<script>` or `<link>` tag. When the browser fetches that resource from a CDN, it computes the SHA-384 of the received bytes and compares it against your hash. If there's any mismatch — even one byte — the browser blocks execution entirely. This prevents CDN-level supply chain attacks: if a CDN is compromised or a domain is hijacked, as happened with Polyfill.io in 2024, the injected malicious JavaScript simply can't run on your page because its hash won't match. I generate hashes at build time via an `openssl dgst -sha384` command piped into a webpack manifest plugin, and I always pair SRI with an `onerror` fallback to self-hosted copies so a blocked CDN doesn't break the entire page. The critical pairing that most engineers miss is that SRI requires `crossorigin="anonymous"` — without it, the browser uses no-cors mode and can't inspect the response bytes to hash them."

**Likely Follow-up Questions:**
1. *Why doesn't SRI work on fetch() requests?* → The Fetch API doesn't support the `integrity` attribute yet at the network layer — use CSP `script-src 'sha384-...'` for inline scripts instead
2. *How do you handle SRI when a CDN updates a library?* → Automate: your dependency update PR also regenerates hashes via a build script; Dependabot PRs should include hash updates
3. *Can SRI protect against a compromised npm registry build?* → No — SRI only validates the file served over the wire; a build-time compromise (supply chain attack in the build pipeline) produces a malicious hash that you'd then embed as "correct"
4. *What's `crossorigin="use-credentials"` vs `crossorigin="anonymous"`?* → `anonymous` sends no cookies — correct for public CDN. `use-credentials` sends cookies but then CDN must reply with `Access-Control-Allow-Credentials: true`, creating complexity; only needed for authenticated CDN resources
5. *How does CSP complement SRI?* → `Content-Security-Policy: require-sri-for script style` makes SRI mandatory for all external scripts/styles — prevents developers from accidentally omitting `integrity` in future tags
6. *What happens if the CDN is down and SRI blocks it — does onerror fire?* → Yes — both network failure and SRI mismatch trigger onerror; your fallback handler fires either way

**Comparison With Alternatives:**

| Approach | Protection Level | Maintenance | Coverage |
|---|---|---|---|
| SRI | High — byte-perfect verification | Medium — update hash on upgrade | CDN scripts & styles |
| Self-hosting | Highest — full control | High — bandwidth, CDN setup | Everything |
| CSP script-src allowlist | Medium — domain-level only | Low | Any whitelisted domain |
| CSP nonce-based | High — per-request nonce | Medium — server-render required | Inline + external |
| SRI + CSP require-sri-for | Highest for CDN resources | Medium | CDN scripts enforced at policy level |

**How to Explain Trade-offs Verbally:**
> "SRI is a surgical tool for external dependencies — it gives you cryptographic certainty about what you don't control. But it has zero value for resources you host yourself, and it requires process discipline to keep hashes current when dependencies update. My preference is to self-host first, use CDN + SRI only when self-hosting is genuinely not feasible, and automate hash generation as part of the CI pipeline so it's never a manual step. I also strongly recommend pairing it with `Content-Security-Policy: require-sri-for script style` so the policy enforces SRI across the team — it can't be forgotten."

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (Production-Grade SRI Integration)
────────────────────────────────────────────────────────────

```html
<!-- index.html — with SRI, crossorigin, and fallback -->
<!DOCTYPE html>
<html>
<head>
  <!-- Stylesheet with SRI -->
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.css"
    integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM"
    crossorigin="anonymous"
    onerror="this.href='/vendor/normalize.css';this.onerror=null"
  />

  <!-- External script with SRI + fallback -->
  <script
    src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"
    integrity="sha384-Zug+QiDoJOrZ5t4lssLdxGhVrurbmBWoR1Km2zxZAim7zcEtdJYCiBQ4iE8wv/J"
    crossorigin="anonymous"
    onerror="loadFallback('react')"
  ></script>
</head>
```

```typescript
// scripts/generate-sri.ts — automate hash generation in build pipeline
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import https from 'https';

interface SRIResult {
  url: string;
  integrity: string;
}

export async function generateSRI(url: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'): Promise<SRIResult> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const content = Buffer.concat(chunks);
        const hash = createHash(algorithm).update(content).digest('base64');
        resolve({ url, integrity: `${algorithm}-${hash}` });
      });
      res.on('error', reject);
    });
  });
}

// Usage in build script
const deps = [
  'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js',
];

const hashes = await Promise.all(deps.map(url => generateSRI(url)));
// Write hashes to sri-manifest.json → inject into HTML via webpack plugin
```

```typescript
// webpack.config.ts — webpack plugin pattern for automatic SRI injection
// Using webpack-subresource-integrity plugin
import SubresourceIntegrityPlugin from 'webpack-subresource-integrity';

const webpackConfig = {
  output: {
    crossOriginLoading: 'anonymous',  // required for SRI on chunk scripts
  },
  plugins: [
    new SubresourceIntegrityPlugin({
      hashFuncNames: ['sha384'],
      enabled: process.env.NODE_ENV === 'production',
    }),
  ],
};

// This automatically adds integrity + crossorigin to all <script> chunks
// in the generated HTML — even code-split async chunks
```

**Why this structure:**
- Hash generated at build time from actual file bytes — no manual copy-paste errors
- `onerror` on the tag enables fallback to self-hosted copy — CDN compromise or SRI mismatch doesn't break the page
- `webpack-subresource-integrity` handles dynamic chunk hashing automatically — otherwise code-split chunks won't have SRI
- `crossOriginLoading: 'anonymous'` is required in webpack output config when using SRI on chunks

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"SRI = padlock on the delivery truck."**

Your CDN is the truck — you don't own it. SRI puts a padlock on the cargo. If the cargo has been swapped, the padlock won't open and the browser refuses delivery. Three things to always say: **(1) compute your own SHA-384 hash**, **(2) always add `crossorigin="anonymous"`** (without it the hash check is skipped), **(3) add `onerror` fallback** so a blocked CDN doesn't break the page.

**If you go blank:** "SRI puts a sha384 hash in the `integrity` attribute of `<script>`/`<link>` tags. If the CDN serves different bytes than expected, the browser blocks execution. It's defence against CDN compromise — like Polyfill.io 2024."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Security**: Makes supply chain attacks via CDN technically impossible — even a fully compromised CDN can't execute code on your site if hashes don't match
→ **Compliance**: OWASP A08:2021 (Software & Data Integrity Failures) explicitly covers SRI as a required control
→ **Zero performance cost**: SRI verification happens during fetch processing — no additional network round-trip, no main thread cost

**How it works:**
→ You embed a base64-encoded SHA-384 hash in the `integrity` attribute of `<script>` or `<link>`. When the browser fetches the resource, it hashes the received bytes and compares. A mismatch blocks resource loading, triggers `onerror`, and logs to console. Requires `crossorigin="anonymous"` for CORS-mode fetching so the browser can inspect response bytes.

**Company relevance:**
→ **Microsoft**: Security SDL mandates SRI in pre-release checklist; Azure static web apps documentation recommends SRI for all CDN-hosted dependencies
→ **Adobe**: Analytics Cloud and creative apps must pass AppSec review which includes SRI compliance for all external script/style tags
→ **Salesforce**: Salesforce 3rd-party JavaScript security requirements state that any external scripts in Lightning components must use SRI
→ **Cisco**: WebEx and Cisco DevNet portals load third-party Monaco editor, highlight.js via CDN — SRI is part of their web security hardening baseline
