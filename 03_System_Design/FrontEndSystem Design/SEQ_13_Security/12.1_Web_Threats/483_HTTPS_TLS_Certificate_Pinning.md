# 483 — HTTPS: TLS Handshake, Certificate Pinning & Mixed Content

────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

────────────────────────────────────────────────────────────────

HTTPS wraps HTTP inside a TLS (Transport Layer Security) tunnel so that every byte between browser and server is **encrypted**, **integrity-checked**, and **authenticated**. Three pillars protect the channel:

| Pillar | What It Prevents |
|---|---|
| **Confidentiality** | Eavesdropping on network traffic |
| **Integrity** | Tampering with data in transit |
| **Authentication** | Impersonation / MITM attacks |

For a frontend engineer this matters in three concrete ways:

1. **TLS Handshake** — the negotiation that creates the encrypted channel before any HTTP byte flows. It determines latency cost.
2. **Mixed Content** — a single `http://` image or script in an `https://` page can downgrade the entire security guarantee, and browsers block or warn about it.
3. **Certificate Pinning / HSTS** — mechanisms that harden the trust chain so attackers can't substitute a rogue certificate.

At SAP Labs, migrating internal micro-frontends to strict HTTPS with HSTS preload and CSP `upgrade-insecure-requests` was a key contributor to the **80 % security vulnerability reduction** across the platform.

────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior / Staff Level)

────────────────────────────────────────────────────────────────

### A. TLS 1.2 Handshake — Full Flow

```
 ┌─────────┐                                           ┌─────────┐
 │  Client  │                                           │  Server  │
 └────┬─────┘                                           └────┬─────┘
      │  ───── ClientHello ─────────────────────────────▶    │    RTT 1
      │  (TLS version, cipher suites, client random)         │
      │                                                      │
      │  ◀──── ServerHello ──────────────────────────────    │
      │  (chosen cipher, server random)                      │
      │  ◀──── Certificate ─────────────────────────────     │
      │  (server cert + intermediate chain)                  │
      │  ◀──── ServerKeyExchange (ECDHE params) ────────     │
      │  ◀──── ServerHelloDone ─────────────────────────     │
      │                                                      │
      │  ───── ClientKeyExchange ──────────────────────▶     │    RTT 2
      │  (pre-master secret encrypted w/ server pubkey)      │
      │  ───── ChangeCipherSpec ───────────────────────▶     │
      │  ───── Finished ───────────────────────────────▶     │
      │                                                      │
      │  ◀──── ChangeCipherSpec ─────────────────────────    │
      │  ◀──── Finished ────────────────────────────────     │
      │                                                      │
      │  ═══════ Encrypted HTTP traffic begins ═══════════   │
      ▼                                                      ▼
          Total: 2 RTTs before first HTTP byte
```

**Key points:**

- **Cipher negotiation** happens in ClientHello/ServerHello. Modern stacks prefer `TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256`.
- The **pre-master secret** is generated client-side, encrypted with the server's public key. Both sides derive the **master secret** independently.
- **Forward secrecy** comes from ECDHE (Ephemeral Diffie–Hellman): compromising the server's long-term private key does NOT decrypt past sessions because ephemeral keys are discarded.

### B. TLS 1.3 Handshake — 1-RTT & 0-RTT

TLS 1.3 (RFC 8446) collapses the handshake to **1 RTT**:

```
 ┌─────────┐                                           ┌─────────┐
 │  Client  │                                           │  Server  │
 └────┬─────┘                                           └────┬─────┘
      │  ───── ClientHello + KeyShare ──────────────▶   │    RTT 1
      │  (supported groups, key share, cipher suites)   │
      │                                                 │
      │  ◀──── ServerHello + KeyShare ───────────────   │
      │  ◀──── {EncryptedExtensions} ────────────────   │
      │  ◀──── {Certificate} ───────────────────────    │
      │  ◀──── {CertificateVerify} ─────────────────    │
      │  ◀──── {Finished} ──────────────────────────    │
      │                                                 │
      │  ───── {Finished} ─────────────────────────▶    │
      │                                                 │
      │  ═══════ Encrypted traffic ════════════════     │
      ▼                                                 ▼
          Total: 1 RTT  (0-RTT with PSK resumption)
```

**0-RTT Resumption:**

- On reconnection the client sends **early data** encrypted under a **Pre-Shared Key (PSK)** from a prior session.
- The server can process the request immediately — **zero additional round trip**.
- **Replay attack risk**: 0-RTT data is NOT replay-safe. Only idempotent requests (GET) should use it. Servers must implement anti-replay (single-use tickets, strike registers).

| Feature | TLS 1.2 | TLS 1.3 |
|---|---|---|
| Handshake RTTs | 2 (full) / 1 (resumed) | 1 (full) / 0 (PSK) |
| Forward Secrecy | Optional (need ECDHE) | **Mandatory** |
| Cipher Suites | ~37 common | **5 AEAD-only** |
| RSA key exchange | Allowed | **Removed** |
| 0-RTT | Not supported | Supported (with caveats) |
| Compression | Allowed (CRIME) | **Removed** |
| Renegotiation | Allowed | **Removed** |

### C. Certificate Chain Validation

```
 ┌─────────────────────────────┐
 │  Root CA (self-signed)       │  ← pre-installed in OS/browser trust store
 │  e.g. DigiCert Global Root  │
 └──────────┬──────────────────┘
            │ signs
 ┌──────────▼──────────────────┐
 │  Intermediate CA             │  ← bridges root to leaf
 │  e.g. DigiCert SHA2 Secure  │
 └──────────┬──────────────────┘
            │ signs
 ┌──────────▼──────────────────┐
 │  Leaf / End-Entity Cert      │  ← your domain's certificate
 │  CN=app.example.com          │
 └──────────────────────────────┘
```

**Browser validation steps:**

1. Check leaf cert `CN` or `SAN` matches the requested hostname.
2. Walk the chain upward: each cert's issuer must sign the cert below it.
3. The chain must terminate at a trusted root.
4. Check **expiry** (`notBefore` / `notAfter`) and **revocation** (OCSP / CRL).
5. Verify **key usage** extensions permit TLS server authentication.

**OCSP Stapling:** Instead of the browser querying the CA's OCSP responder (adding latency + privacy leak), the server fetches the OCSP response and "staples" it to the TLS handshake. Reduces latency and improves privacy.

### D. HSTS — HTTP Strict-Transport-Security

HSTS tells the browser: "**Never contact this domain over plain HTTP — always use HTTPS.**"

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

| Directive | Meaning |
|---|---|
| `max-age` | Duration (seconds) the browser remembers the policy. 2 years = 63072000. |
| `includeSubDomains` | Applies to all subdomains — prevents `api.example.com` from being HTTP. |
| `preload` | Signals intent to be added to the browser's **HSTS preload list** (hard-coded). |

**HSTS Preload List:**

- Maintained at `hstspreload.org`. Chromium, Firefox, Safari all ship it.
- Once preloaded, the first-ever visit is safe (no TOFU vulnerability).
- **Removal is slow** — takes months to propagate across browser releases.

**Without HSTS — the SSL-stripping attack:**

```
User types "example.com"
     │
     ▼ HTTP 301 → https://example.com
     │
 ┌───┴───────────────────────┐
 │  MITM intercepts 301      │  ← attacker downgrades to HTTP
 │  Serves HTTP version      │
 │  Proxies to real HTTPS    │
 └───────────────────────────┘
```

With HSTS the browser never sends the initial HTTP request — it internally rewrites to HTTPS.

### E. Mixed Content — Active vs. Passive

Mixed content occurs when an HTTPS page loads sub-resources over HTTP.

| Type | Resources | Risk | Browser Behavior |
|---|---|---|---|
| **Active (blockable)** | Scripts, stylesheets, iframes, `fetch()`, `XMLHttpRequest`, fonts, `<object>` | Code execution, full page takeover | **Blocked by default** |
| **Passive (optionally blockable)** | Images, audio, video | Visual spoofing, tracking | **Warning** (Chrome 80+ blocks images too) |

**Detection strategy:**

```typescript
// 1. CSP report-only to discover mixed content without breaking the page
// Content-Security-Policy-Report-Only: default-src https:; report-uri /csp-reports

// 2. Programmatic audit in the browser
const mixedResources: string[] = [];
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const url = (entry as PerformanceResourceTiming).name;
    if (url.startsWith('http://') && location.protocol === 'https:') {
      mixedResources.push(url);
      console.warn(`Mixed content: ${url}`);
    }
  }
});
observer.observe({ entryTypes: ['resource'] });

// 3. Lighthouse audit — "Uses HTTPS" / "Avoid mixed content"
```

**Fix with CSP `upgrade-insecure-requests`:**

```
Content-Security-Policy: upgrade-insecure-requests
```

This silently rewrites all `http://` sub-resource URLs to `https://` before the browser fetches them. It does NOT affect navigation — only sub-resources.

### F. Certificate Pinning (HPKP & Its Demise)

**HTTP Public Key Pinning (HPKP)** let servers pin specific public keys:

```
Public-Key-Pins:
  pin-sha256="base64+primary==";
  pin-sha256="base64+backup==";
  max-age=5184000;
  includeSubDomains;
  report-uri="https://example.com/pkp-report"
```

**Why HPKP was deprecated (Chrome 72, 2018):**

| Problem | Impact |
|---|---|
| **Hostile pinning** | Attacker XSS → sets HPKP → locks out the real site owner |
| **Bricking risk** | Key rotation mistake → entire domain becomes unreachable for `max-age` |
| **Ops complexity** | Requires meticulous backup key management |
| **Limited coverage** | Only ~0.01 % of HTTPS sites ever adopted it |
| **CT provides overlap** | Certificate Transparency logs achieve similar MITM detection |

**Modern alternatives:**

| Mechanism | What It Does |
|---|---|
| **Certificate Transparency (CT)** | All CAs must log certs to public, append-only logs. Browsers reject certs without SCTs. |
| **CAA (DNS)** | `example.com. CAA 0 issue "letsencrypt.org"` — limits which CAs can issue for your domain. |
| **Expect-CT** | Header that enforces CT compliance (now default in Chrome). |
| **Native app pinning** | Mobile apps (OkHttp, NSURLSession) still pin certs because they control the trust store. |

### G. TLS Performance Considerations for Frontend

```
┌──────────────────────────────────────────────────────┐
│          Time to First Byte (TTFB) Breakdown         │
├──────────────────────────────────────────────────────┤
│  DNS Lookup         │  ~20-120 ms                    │
│  TCP Handshake      │  1 RTT (~30-80 ms)             │
│  TLS Handshake      │  1-2 RTTs (30-160 ms)          │  ← optimize here
│  HTTP Request/Resp  │  1 RTT + server time           │
└──────────────────────────────────────────────────────┘
```

**Optimization checklist:**

1. **TLS 1.3** — saves 1 RTT on every new connection.
2. **OCSP Stapling** — eliminates the OCSP lookup latency (~100 ms).
3. **Session tickets / PSK** — enables 0-RTT resumption.
4. **HTTP/2 multiplexing** — single TLS connection for all resources; amortizes handshake cost.
5. **`preconnect` / `dns-prefetch`** — start TLS handshake early:
   ```html
   <link rel="preconnect" href="https://cdn.example.com" crossorigin />
   <link rel="dns-prefetch" href="https://analytics.example.com" />
   ```
6. **CDN termination** — terminate TLS at edge PoPs close to the user.
7. **ECDSA certificates** — smaller than RSA (~3× smaller key, faster handshake).

### H. Anti-Patterns

```
┌─────────────────────────────────────────────────────────────┐
│  ❌  ANTI-PATTERN                  │  ✅  CORRECT APPROACH  │
├─────────────────────────────────────┼───────────────────────┤
│  No HSTS header                    │  HSTS + preload        │
│  max-age=300 (5 min HSTS)          │  max-age=63072000 (2y) │
│  Mixed content from CDN assets     │  CSP upgrade-insecure  │
│  Self-signed cert in production    │  Free CA (Let's Encrypt│
│  Disabling cert validation in code │  Fix the cert chain    │
│  HPKP with no backup pin           │  Use CT + CAA instead  │
│  RSA-2048 key exchange only        │  ECDHE + ECDSA         │
│  Ignoring 0-RTT replay risks       │  Restrict to GET only  │
│  TLS termination at origin only    │  CDN edge termination  │
│  Hardcoding http:// in assets      │  Use protocol-relative │
│                                    │  or always https://    │
└─────────────────────────────────────┴───────────────────────┘
```

────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

────────────────────────────────────────────────────────────────

### Example 1 — SAP Labs Micro-Frontend HTTPS Migration

**Problem:** Internal micro-frontends served behind a reverse proxy that stripped HTTPS internally. Third-party analytics scripts loaded over `http://`, triggering mixed-content warnings in Chrome and breaking Content-Security-Policy enforcement.

**Solution:**

1. Configured HSTS with `includeSubDomains` at the gateway level.
2. Added `Content-Security-Policy: upgrade-insecure-requests` as a transition step.
3. Audited all CDN references — enforced `https://` in the asset pipeline.
4. Submitted domain to HSTS preload list after 2 weeks of monitoring.

**Result:** Mixed-content violations dropped to zero. Combined with other CSP hardening, this contributed to the **80 % security vulnerability reduction**.

### Example 2 — E-Commerce Checkout TLS Optimization

**Problem:** Checkout page TTFB was 1.2 s on mobile (3G). TLS accounted for ~300 ms.

**Solution:**

1. Upgraded server to TLS 1.3 (nginx `ssl_protocols TLSv1.3`).
2. Enabled OCSP stapling (`ssl_stapling on; ssl_stapling_verify on;`).
3. Switched from RSA-2048 to ECDSA P-256 certificate.
4. Added `<link rel="preconnect">` for the payment gateway domain.

**Result:** TLS handshake dropped from ~300 ms to ~80 ms (1 RTT on TLS 1.3 + smaller cert). TTFB improved to 0.9 s.

### Example 3 — Lighthouse Score Improvement (60 → 95)

At SAP Labs, part of the Lighthouse performance jump from **60 → 95** came from:

- Eliminating mixed content (Lighthouse flags it under "Best Practices").
- Enabling HTTP/2 (requires HTTPS) which allowed multiplexed asset loading.
- Adding `preconnect` hints for critical third-party origins.
- Reducing render-blocking by loading fonts over multiplexed HTTPS/2 instead of separate HTTP/1.1 connections.

────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

────────────────────────────────────────────────────────────────

> **"Can you explain how TLS works and why it matters for frontend?"**
>
> "HTTPS wraps HTTP inside a TLS tunnel that provides encryption, integrity, and authentication. In TLS 1.3, which is what modern browsers negotiate, the handshake completes in a single round trip — the client sends its key share in the very first message, so the server can derive the shared secret and start sending encrypted data immediately. This is a big improvement over TLS 1.2's two-round-trip handshake.
>
> On the frontend side, the practical concerns are around mixed content and HSTS. Mixed content is when an HTTPS page loads a sub-resource over plain HTTP — browsers block active mixed content like scripts and stylesheets outright, and increasingly block passive content like images too. At SAP Labs, when we migrated our micro-frontend platform to strict HTTPS, we tackled this by adding the `upgrade-insecure-requests` CSP directive as a transition step, then systematically fixing all asset URLs. We also deployed HSTS with `includeSubDomains` and eventually submitted to the preload list so that even first-time visitors never touch plain HTTP.
>
> For certificate trust, the browser validates the server's certificate chain — walking from the leaf cert up through intermediates to a trusted root. Modern defenses like Certificate Transparency and CAA DNS records have replaced the old HPKP approach, which was deprecated because a single misconfiguration could brick an entire domain.
>
> Performance-wise, TLS 1.3's 0-RTT resumption is powerful but carries replay risk, so we restrict it to idempotent GET requests. Combined with OCSP stapling, ECDSA certs, and `preconnect` hints, we reduced our TLS overhead significantly — that was part of pushing our Lighthouse score from 60 to 95."

────────────────────────────────────────────────────────────────

## 5. Code Examples

────────────────────────────────────────────────────────────────

### 5A — Express.js Security Headers with Helmet

```typescript
// server.ts
import express from 'express';
import helmet from 'helmet';

const app = express();

// Helmet sets multiple security headers in one call
app.use(
  helmet({
    // HSTS: 2 years, include subdomains, signal preload intent
    hsts: {
      maxAge: 63072000, // 2 years in seconds
      includeSubDomains: true,
      preload: true,
    },
    // CSP: upgrade HTTP sub-resources, restrict sources
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.example.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'", 'https://api.example.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        upgradeInsecureRequests: [], // ← empty array = enabled
      },
    },
  })
);

// Redirect HTTP → HTTPS (for servers not behind a TLS-terminating LB)
app.use((req, res, next) => {
  // Trust X-Forwarded-Proto when behind a proxy
  if (req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

app.get('/', (_req, res) => {
  res.send('Secure!');
});

app.listen(3000, () => console.log('Listening on :3000'));
```

**Response headers produced:**

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com; ...
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 0
```

### 5B — Next.js Security Headers Config

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js needs these for dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https: data: blob:",
      'upgrade-insecure-requests',
    ].join('; '),
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',          // Apply to all routes
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

### 5C — Mixed Content Audit Script

```typescript
// mixed-content-audit.ts
// Run in DevTools console or as a Puppeteer script

interface MixedContentReport {
  url: string;
  type: string;
  element: string;
  severity: 'active' | 'passive';
}

function auditMixedContent(): MixedContentReport[] {
  const report: MixedContentReport[] = [];

  if (location.protocol !== 'https:') {
    console.warn('Page is not served over HTTPS — audit not applicable.');
    return report;
  }

  // Check all resource-loading elements
  const selectors: Record<string, string[]> = {
    script: ['src'],
    link: ['href'],
    img: ['src', 'srcset'],
    video: ['src', 'poster'],
    audio: ['src'],
    source: ['src', 'srcset'],
    iframe: ['src'],
    object: ['data'],
    form: ['action'],
  };

  const activeTypes = new Set(['script', 'link', 'iframe', 'object', 'form']);

  for (const [tag, attrs] of Object.entries(selectors)) {
    const elements = document.querySelectorAll(tag);
    for (const el of elements) {
      for (const attr of attrs) {
        const value = el.getAttribute(attr);
        if (value && value.startsWith('http://')) {
          report.push({
            url: value,
            type: attr,
            element: el.outerHTML.slice(0, 120),
            severity: activeTypes.has(tag) ? 'active' : 'passive',
          });
        }
      }
    }
  }

  // Check inline styles for url(http://...)
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    const style = el.getAttribute('style') || '';
    const httpMatch = style.match(/url\(['"]?(http:\/\/[^'")\s]+)/g);
    if (httpMatch) {
      for (const match of httpMatch) {
        report.push({
          url: match.replace(/url\(['"]?/, ''),
          type: 'inline-style',
          element: el.outerHTML.slice(0, 120),
          severity: 'passive',
        });
      }
    }
  }

  // Summary
  const active = report.filter((r) => r.severity === 'active');
  const passive = report.filter((r) => r.severity === 'passive');
  console.table(report);
  console.log(`Active (blocked): ${active.length}, Passive (warned): ${passive.length}`);

  return report;
}

auditMixedContent();
```

### 5D — Nginx TLS 1.3 + HSTS Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # TLS 1.3 only (drop 1.2 when client support allows)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;         # TLS 1.3 ignores this

    # ECDSA certificate (smaller, faster)
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;
    resolver 1.1.1.1 8.8.8.8 valid=300s;

    # Session tickets for 0-RTT resumption
    ssl_session_timeout 1d;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_tickets on;

    # 0-RTT (use with caution — replay risk)
    ssl_early_data on;
    proxy_set_header Early-Data $ssl_early_data;   # let app know

    # HSTS
    add_header Strict-Transport-Security
               "max-age=63072000; includeSubDomains; preload" always;

    # CSP upgrade
    add_header Content-Security-Policy "upgrade-insecure-requests" always;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

### 5E — Verifying TLS Configuration Programmatically

```typescript
// tls-check.ts — Node.js script to inspect a server's TLS config
import * as tls from 'tls';
import * as https from 'https';

function checkTLS(hostname: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname,
      port: 443,
      method: 'HEAD',
      path: '/',
    };

    const req = https.request(options, (res) => {
      const socket = res.socket as tls.TLSSocket;
      const cert = socket.getPeerCertificate();
      const protocol = socket.getProtocol();
      const cipher = socket.getCipher();

      console.log('=== TLS Report ===');
      console.log(`Host:        ${hostname}`);
      console.log(`Protocol:    ${protocol}`);
      console.log(`Cipher:      ${cipher.name} (${cipher.version})`);
      console.log(`Subject:     ${cert.subject.CN}`);
      console.log(`Issuer:      ${cert.issuer.O}`);
      console.log(`Valid From:  ${cert.valid_from}`);
      console.log(`Valid To:    ${cert.valid_to}`);
      console.log(`Fingerprint: ${cert.fingerprint256}`);
      console.log(`ALPN:        ${socket.alpnProtocol}`);

      // Check HSTS header
      const hsts = res.headers['strict-transport-security'];
      console.log(`HSTS:        ${hsts || '⚠ NOT SET'}`);

      if (!hsts) {
        console.warn('⚠  Missing HSTS header — vulnerable to SSL stripping');
      }

      resolve();
    });

    req.on('error', reject);
    req.end();
  });
}

// Usage: npx ts-node tls-check.ts
checkTLS('example.com').catch(console.error);
```

────────────────────────────────────────────────────────────────

## 6. Why & How Summary

────────────────────────────────────────────────────────────────

```
┌───────────────────────────────────────────────────────────────────┐
│                      WHY — The Threat Model                       │
├───────────────────────────────────────────────────────────────────┤
│  Without TLS:                                                     │
│    • Anyone on the network path can READ all traffic              │
│    • Attackers can MODIFY responses (inject ads, scripts, etc.)   │
│    • No proof the server is who it claims to be                   │
│                                                                   │
│  Without HSTS:                                                    │
│    • First visit vulnerable to SSL-stripping MITM                 │
│    • Users typing "example.com" hit HTTP first                    │
│                                                                   │
│  With mixed content:                                              │
│    • One HTTP script = entire page compromised                    │
│    • Browser trust indicators (padlock) break                     │
│    • CSP enforcement weakened                                     │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                     HOW — The Defence Stack                       │
├───────────────────────────────────────────────────────────────────┤
│  Layer 1: TLS 1.3                                                 │
│    → Encrypted channel with forward secrecy, 1-RTT handshake     │
│                                                                   │
│  Layer 2: Certificate Chain + CT + CAA                            │
│    → Only authorized CAs can issue, all certs publicly logged    │
│                                                                   │
│  Layer 3: HSTS + Preload                                          │
│    → Eliminate HTTP entirely, even on first visit                 │
│                                                                   │
│  Layer 4: CSP upgrade-insecure-requests                           │
│    → Automatic HTTP→HTTPS rewrite for sub-resources              │
│                                                                   │
│  Layer 5: Mixed content audit & monitoring                        │
│    → CSP report-uri / report-to for ongoing detection            │
│                                                                   │
│  Layer 6: Performance tuning                                      │
│    → OCSP stapling, ECDSA certs, preconnect, CDN edge TLS       │
└───────────────────────────────────────────────────────────────────┘
```

**Quick recall for interviews:**

| Question | Key Points |
|---|---|
| TLS 1.2 vs 1.3? | 1.3 = 1 RTT, mandatory forward secrecy, 5 AEAD ciphers, no RSA key exchange |
| What is 0-RTT? | PSK resumption, zero latency, but replay-vulnerable — restrict to GET |
| Why not HPKP? | Bricking risk, hostile pinning, replaced by CT + CAA |
| Mixed content fix? | `upgrade-insecure-requests` CSP + fix asset URLs + audit with report-uri |
| HSTS preload? | Hard-coded in browser — no TOFU vulnerability, but slow to remove |
| Forward secrecy? | ECDHE ephemeral keys — compromised long-term key can't decrypt past traffic |
| Frontend perf impact? | `preconnect`, HTTP/2 (needs HTTPS), ECDSA certs, CDN edge termination |

────────────────────────────────────────────────────────────────
