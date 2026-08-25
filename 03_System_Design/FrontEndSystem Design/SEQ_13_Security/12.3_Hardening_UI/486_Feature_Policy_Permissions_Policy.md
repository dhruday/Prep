# 486 — Feature Policy / Permissions Policy

────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

────────────────────────────────────────────────────────────────

Permissions-Policy is an HTTP response header that lets a site **control which browser
APIs and features** (camera, microphone, geolocation, payment, fullscreen, autoplay …)
can be used by the page itself and by any embedded content (iframes, third-party scripts).

It is the successor to the now-deprecated `Feature-Policy` header.

**Core idea:** Every browser feature has a default *allowlist*. The header lets you
**restrict** that list — you can never *grant* a capability the browser wouldn't
otherwise allow; you can only *remove* capabilities.

```
                  ┌─────────────────────────────────────────────┐
  HTTP Response   │  Permissions-Policy: camera=(),             │
                  │    microphone=(self),                       │
                  │    geolocation=(self "https://maps.ex.com") │
                  └──────────────────────┬──────────────────────┘
                                         │
                         ┌───────────────┼───────────────┐
                         ▼               ▼               ▼
                    Top-level       <iframe>        <iframe>
                    document       same-origin     third-party
                  ┌──────────┐   ┌──────────┐   ┌──────────┐
                  │ camera ✗  │   │ camera ✗  │   │ camera ✗  │
                  │ mic    ✓  │   │ mic    ✓  │   │ mic    ✗  │
                  │ geo    ✓  │   │ geo    ✓  │   │ geo    ✗  │
                  └──────────┘   └──────────┘   └──────────┘
```

Why it matters for interviews:

| Concern | How Permissions-Policy helps |
|---|---|
| Third-party ad/widget iframes accessing camera | Block `camera` for all except self |
| Rogue scripts triggering payment flows | Restrict `payment` to known origins |
| Micro-frontend isolation | Each MFE gets only needed features |
| Compliance (GDPR, HIPAA) | Provably limit data-collection surfaces |


────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior / Staff Level)

────────────────────────────────────────────────────────────────

### A. Header Syntax — Old vs New

The syntax changed significantly between the deprecated `Feature-Policy` and the
current `Permissions-Policy`.

```
# ─── DEPRECATED (Feature-Policy) ───
Feature-Policy: camera 'self'; microphone 'none'; geolocation 'self' https://maps.ex.com

# ─── CURRENT (Permissions-Policy) ───
Permissions-Policy: camera=(), microphone=(self), geolocation=(self "https://maps.ex.com")
```

| Aspect | Feature-Policy (deprecated) | Permissions-Policy (current) |
|---|---|---|
| Separator between directives | `;` (semicolon) | `,` (comma) |
| Self keyword | `'self'` (quoted) | `self` (unquoted, inside parens) |
| None / disabled | `'none'` | `()` (empty parens) |
| All origins | `*` | `*` |
| Specific origins | `https://a.com` (space-sep) | `"https://a.com"` (quoted, inside parens) |
| Multiple origins | `camera 'self' https://a.com` | `camera=(self "https://a.com")` |
| Browser support | Chrome < 88, older browsers | Chrome 88+, Edge 88+, Firefox 74+ |

**Key rule:** `Permissions-Policy` uses a *Structured Fields* syntax (RFC 8941).
Each directive is a **token = list-value** pair.

### B. Complete Directive Reference (25+ Directives)

| Directive | Controls | Default Allowlist |
|---|---|---|
| `accelerometer` | Accelerometer sensor API | `self` |
| `ambient-light-sensor` | AmbientLightSensor API | `self` |
| `autoplay` | HTMLMediaElement autoplay | `self` |
| `camera` | getUserMedia() video | `self` |
| `display-capture` | getDisplayMedia() | `self` |
| `document-domain` | document.domain setter | `*` |
| `encrypted-media` | EME (requestMediaKeySystemAccess) | `self` |
| `fullscreen` | Element.requestFullscreen() | `self` |
| `gamepad` | Gamepad API | `self` |
| `geolocation` | Geolocation API | `self` |
| `gyroscope` | Gyroscope sensor API | `self` |
| `hid` | WebHID API | `self` |
| `identity-credentials-get` | FedCM get() | `self` |
| `idle-detection` | IdleDetector API | `self` |
| `local-fonts` | Local Font Access API | `self` |
| `magnetometer` | Magnetometer sensor API | `self` |
| `microphone` | getUserMedia() audio | `self` |
| `midi` | Web MIDI API | `self` |
| `payment` | Payment Request API | `self` |
| `picture-in-picture` | PiP API | `self` |
| `publickey-credentials-create` | WebAuthn create() | `self` |
| `publickey-credentials-get` | WebAuthn get() | `self` |
| `screen-wake-lock` | Screen Wake Lock API | `self` |
| `serial` | Web Serial API | `self` |
| `speaker-selection` | Audio output selection | `self` |
| `storage-access` | Storage Access API | `*` |
| `usb` | WebUSB API | `self` |
| `web-share` | Navigator.share() | `self` |
| `xr-spatial-tracking` | WebXR Device API | `self` |

### C. Iframe `allow` Attribute — The Delivery Mechanism for Embeds

The HTTP header restricts the **top-level page**. For individual iframes, use the
`allow` attribute, which acts as a **second gate**: both the header AND the attribute
must permit a feature for the iframe to use it.

```
Header sets ceiling ────►  Permissions-Policy: camera=(self "https://meet.ex.com")
                                                    │
                          ┌─────────────────────────┼────────────────────────┐
                          │                         │                        │
                    <iframe src="meet.ex.com"   <iframe src="ads.ex.com"   <iframe src="meet.ex.com"
                     allow="camera">             allow="camera">            (no allow attr)
                          │                         │                        │
                     camera ✓                  camera ✗                 camera ✗
                  (header ✓ + attr ✓)       (header ✗ for ads)      (attr missing)
```

```html
<!-- Correct: grant camera only to the video-call embed -->
<iframe
  src="https://meet.example.com/room/42"
  allow="camera; microphone"
  sandbox="allow-scripts allow-same-origin"
></iframe>

<!-- Defensive: analytics iframe gets nothing -->
<iframe
  src="https://analytics.vendor.com/pixel"
  sandbox=""
  allow=""
></iframe>
```

### D. Interaction with `sandbox` Attribute

```
┌──────────────────────────────────────────────────────────┐
│                  Security Layers for Iframes             │
├──────────┬───────────────────────────────────────────────┤
│ sandbox  │ Restricts JS execution, form submission,      │
│          │ navigation, popups, downloads, etc.            │
├──────────┼───────────────────────────────────────────────┤
│ allow    │ Restricts browser feature APIs                 │
│          │ (camera, mic, geo, payment, etc.)              │
├──────────┼───────────────────────────────────────────────┤
│ CSP      │ Restricts resource loading origins             │
│ (header) │ (scripts, styles, images, fonts, etc.)         │
├──────────┼───────────────────────────────────────────────┤
│ PP       │ Restricts which features the page + all its    │
│ (header) │ embeds can ever use                            │
└──────────┴───────────────────────────────────────────────┘
```

A truly hardened iframe combines all four:

```html
<iframe
  src="https://widget.vendor.com"
  sandbox="allow-scripts allow-same-origin"
  allow="fullscreen"
  referrerpolicy="no-referrer"
  loading="lazy"
  csp="script-src 'self'"
></iframe>
```

### E. JavaScript Audit APIs

Two runtime APIs let you **programmatically check** which features are allowed:

```typescript
// ─── document.featurePolicy (older, Chrome-only) ───
const fp = document.featurePolicy;

// List every feature the browser knows about
console.log(fp.features());
// → ["camera", "microphone", "geolocation", ...]

// Check if a feature is allowed for THIS document
console.log(fp.allowsFeature("camera"));          // true | false

// Check if a feature is allowed for a SPECIFIC origin
console.log(fp.allowsFeature("camera", "https://ads.net"));  // false

// Get the allowlist for a feature
console.log(fp.getAllowlistForFeature("camera"));
// → ["https://example.com"]


// ─── document.permissionsPolicy (newer, spec-aligned) ───
// Same shape, but under the updated name.
// As of 2025 still behind a flag in some browsers.
// Use feature detection:

function getPolicy(): FeaturePolicy | null {
  const doc = document as any;
  return doc.permissionsPolicy ?? doc.featurePolicy ?? null;
}

const policy = getPolicy();
if (policy) {
  const dangerous = ["camera", "microphone", "geolocation", "payment", "usb"];
  for (const feat of dangerous) {
    const allowed = policy.allowsFeature(feat);
    console.log(`${feat}: ${allowed ? "⚠️  ALLOWED" : "✅ BLOCKED"}`);
  }
}
```

Full audit script that produces a report:

```typescript
// audit-permissions.ts — run in browser console or inject via test harness

interface PermissionAuditEntry {
  feature: string;
  allowedForSelf: boolean;
  allowedOrigins: string[];
  risk: "high" | "medium" | "low";
}

const HIGH_RISK = new Set([
  "camera", "microphone", "geolocation", "payment",
  "display-capture", "usb", "serial", "hid", "midi",
]);

const MEDIUM_RISK = new Set([
  "autoplay", "fullscreen", "idle-detection",
  "screen-wake-lock", "web-share",
]);

function auditPermissions(): PermissionAuditEntry[] {
  const policy = (document as any).featurePolicy
                ?? (document as any).permissionsPolicy;
  if (!policy) {
    console.warn("Permissions Policy API not available in this browser");
    return [];
  }

  const features: string[] = policy.features();
  return features.map((feat: string) => ({
    feature: feat,
    allowedForSelf: policy.allowsFeature(feat),
    allowedOrigins: policy.getAllowlistForFeature?.(feat) ?? [],
    risk: HIGH_RISK.has(feat)
      ? "high"
      : MEDIUM_RISK.has(feat)
        ? "medium"
        : "low",
  }));
}

const report = auditPermissions();
const highRiskAllowed = report.filter(e => e.risk === "high" && e.allowedForSelf);
if (highRiskAllowed.length > 0) {
  console.error("🚨 High-risk features still allowed:", highRiskAllowed.map(e => e.feature));
}
```

### F. Express + Helmet.js Configuration

```typescript
// server.ts — Express with helmet
import express from "express";
import helmet from "helmet";

const app = express();

// Helmet v7+ uses permittedPolicies under helmet.permittedCrossDomainPolicies
// For Permissions-Policy, use the dedicated middleware:
app.use(
  helmet({
    // helmet does NOT set Permissions-Policy by default as of v7.
    // Use helmet.permissionsPolicy() — available via @nicedoc/helmet or custom:
  })
);

// Manual Permissions-Policy middleware (recommended for full control)
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    [
      "camera=()",                                     // blocked everywhere
      "microphone=()",                                 // blocked everywhere
      "geolocation=(self)",                            // only this origin
      "payment=(self)",                                // only this origin
      "fullscreen=(self)",                             // only this origin
      "autoplay=(self)",                               // only this origin
      "display-capture=()",                            // blocked everywhere
      "usb=()",                                        // blocked everywhere
      "serial=()",                                     // blocked everywhere
      "hid=()",                                        // blocked everywhere
      "midi=()",                                       // blocked everywhere
      'idle-detection=(self "https://trusted.app")',   // self + specific origin
      "screen-wake-lock=(self)",                       // only this origin
      "picture-in-picture=(self)",                     // only this origin
      "web-share=(self)",                              // only this origin
      "xr-spatial-tracking=()",                        // blocked everywhere
    ].join(", ")
  );
  next();
});

// Per-route override: video conferencing route needs camera + mic
app.use("/meeting/*", (_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    [
      'camera=(self "https://meet.provider.com")',
      'microphone=(self "https://meet.provider.com")',
      "geolocation=()",
      "payment=()",
    ].join(", ")
  );
  next();
});

app.listen(3000);
```

### G. Next.js Configuration

```typescript
// next.config.ts
import type { NextConfig } from "next";

const permissionsPolicy = [
  "camera=()",
  "microphone=()",
  "geolocation=(self)",
  "payment=(self)",
  "fullscreen=(self)",
  "autoplay=(self)",
  "display-capture=()",
  "usb=()",
  "serial=()",
  "hid=()",
  "midi=()",
  "idle-detection=(self)",
  "screen-wake-lock=(self)",
].join(", ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Permissions-Policy", value: permissionsPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Route-specific: video page needs camera
        source: "/video-call/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: 'camera=(self "https://meet.provider.com"), microphone=(self "https://meet.provider.com"), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### H. Micro-Frontend Security with Permissions-Policy

In a micro-frontend architecture (Module Federation, single-spa, iframes), each MFE
is loaded from a different origin or bundle. Permissions-Policy becomes the **feature
firewall** between MFEs.

```
┌─ Shell App (portal.company.com) ───────────────────────────────────┐
│  Permissions-Policy: camera=(self "https://video.mfe.com"),        │
│    microphone=(self "https://video.mfe.com"),                      │
│    geolocation=(self "https://maps.mfe.com"),                      │
│    payment=(self "https://checkout.mfe.com")                       │
│                                                                     │
│  ┌─ MFE: Dashboard ──────┐  ┌─ MFE: Video ─────────────────────┐  │
│  │ <iframe                │  │ <iframe                           │  │
│  │   src="dash.mfe.com"  │  │   src="video.mfe.com"             │  │
│  │   allow="">            │  │   allow="camera; microphone">     │  │
│  │                        │  │                                   │  │
│  │ camera  ✗              │  │ camera  ✓                         │  │
│  │ mic     ✗              │  │ mic     ✓                         │  │
│  │ geo     ✗              │  │ geo     ✗                         │  │
│  │ payment ✗              │  │ payment ✗                         │  │
│  └────────────────────────┘  └───────────────────────────────────┘  │
│                                                                     │
│  ┌─ MFE: Maps ───────────┐  ┌─ MFE: Checkout ──────────────────┐  │
│  │ <iframe                │  │ <iframe                           │  │
│  │   src="maps.mfe.com"  │  │   src="checkout.mfe.com"          │  │
│  │   allow="geolocation"> │  │   allow="payment">               │  │
│  │                        │  │                                   │  │
│  │ camera  ✗              │  │ camera  ✗                         │  │
│  │ geo     ✓              │  │ payment ✓                         │  │
│  └────────────────────────┘  └───────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Principle of Least Privilege:** each MFE receives exactly the features it needs,
nothing more. Even if the MFE's code is compromised (supply-chain attack), the
damage is bounded — an attacker inside the dashboard MFE cannot access the camera.

### I. Anti-Patterns

```
┌──────────────────────────────────────────────────────────────────────┐
│  ❌ ANTI-PATTERN #1: No Permissions-Policy header at all            │
│                                                                      │
│  Result: Every feature defaults to 'self'. Third-party iframes      │
│  can still use features if the iframe's allow attribute is present   │
│  and they use delegation. Camera, mic, payment all available.        │
│                                                                      │
│  Fix: Always set an explicit Permissions-Policy header.              │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  ❌ ANTI-PATTERN #2: Wildcard everything                            │
│                                                                      │
│  Permissions-Policy: camera=*, microphone=*, geolocation=*           │
│                                                                      │
│  Result: ANY origin (any iframe from any domain) can request         │
│  camera access. Ads, analytics widgets, any injected frame.          │
│                                                                      │
│  Fix: camera=(self "https://trusted-only.com")                       │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  ❌ ANTI-PATTERN #3: Setting allow="*" on iframes                   │
│                                                                      │
│  <iframe src="https://ads.net" allow="camera *; microphone *">      │
│                                                                      │
│  Result: Delegates camera + mic to the ad network. They can          │
│  prompt the user for permission on YOUR page's behalf.               │
│                                                                      │
│  Fix: Omit allow or set to empty for untrusted iframes.             │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  ❌ ANTI-PATTERN #4: Using deprecated Feature-Policy                │
│                                                                      │
│  Feature-Policy: camera 'self'; microphone 'none'                    │
│                                                                      │
│  Result: Ignored by Chrome 88+. No protection in modern browsers.    │
│                                                                      │
│  Fix: Use Permissions-Policy. Optionally send BOTH headers           │
│  during a migration period for older browser coverage.               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  ❌ ANTI-PATTERN #5: Forgetting iframe allow in micro-frontends     │
│                                                                      │
│  Header says: camera=(self "https://video.mfe.com")                  │
│  But iframe has no `allow` attribute.                                │
│                                                                      │
│  Result: camera is BLOCKED in the iframe. Header alone is not        │
│  sufficient — the allow attribute must also grant it.                │
│                                                                      │
│  Fix: Always pair header allowlist with iframe allow attribute.       │
└──────────────────────────────────────────────────────────────────────┘
```


────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

────────────────────────────────────────────────────────────────

### Example 1 — E-Commerce Platform

An e-commerce site embeds a third-party payment widget and a product video player.

```
Permissions-Policy:
  camera=(),
  microphone=(),
  geolocation=(self),
  payment=(self "https://pay.stripe.com"),
  fullscreen=(self "https://player.vimeo.com"),
  autoplay=(self "https://player.vimeo.com")
```

```html
<!-- Payment iframe: only payment allowed -->
<iframe src="https://pay.stripe.com/checkout/sess_abc"
        allow="payment"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
</iframe>

<!-- Video player: fullscreen + autoplay allowed -->
<iframe src="https://player.vimeo.com/video/123456"
        allow="fullscreen; autoplay"
        sandbox="allow-scripts allow-same-origin">
</iframe>

<!-- Analytics iframe: nothing allowed -->
<iframe src="https://analytics.vendor.com/track"
        sandbox=""
        allow="">
</iframe>
```

### Example 2 — Internal Enterprise Dashboard (SAP-style)

At SAP Labs, where micro-frontend architecture serves multiple teams, the shell
sets strict policies:

```typescript
// shell-app security middleware
const MFE_PERMISSIONS: Record<string, string[]> = {
  "https://analytics.internal.sap":   [],                        // no features
  "https://video-collab.internal.sap": ["camera", "microphone"], // collab tool
  "https://maps.internal.sap":         ["geolocation"],          // office finder
  "https://expense.internal.sap":      ["camera"],               // receipt scan
};

function buildPermissionsPolicy(mfeMap: Record<string, string[]>): string {
  const featureOrigins = new Map<string, Set<string>>();

  for (const [origin, features] of Object.entries(mfeMap)) {
    for (const feat of features) {
      if (!featureOrigins.has(feat)) featureOrigins.set(feat, new Set(["self"]));
      featureOrigins.get(feat)!.add(`"${origin}"`);
    }
  }

  const allFeatures = [
    "camera", "microphone", "geolocation", "payment",
    "display-capture", "usb", "serial", "hid",
  ];

  return allFeatures.map(feat => {
    const origins = featureOrigins.get(feat);
    if (!origins) return `${feat}=()`;
    return `${feat}=(${[...origins].join(" ")})`;
  }).join(", ");
}

// Output:
// camera=(self "https://video-collab.internal.sap" "https://expense.internal.sap"),
// microphone=(self "https://video-collab.internal.sap"),
// geolocation=(self "https://maps.internal.sap"),
// payment=(), display-capture=(), usb=(), serial=(), hid=()
```

### Example 3 — CI Security Header Validation

```typescript
// e2e/security-headers.spec.ts — Playwright test
import { test, expect } from "@playwright/test";

test("Permissions-Policy header is present and restrictive", async ({ page }) => {
  const response = await page.goto("https://app.example.com");
  const pp = response?.headers()["permissions-policy"];

  expect(pp).toBeDefined();
  expect(pp).toContain("camera=()");
  expect(pp).toContain("microphone=()");
  expect(pp).toContain("usb=()");
  expect(pp).not.toContain("camera=*");
  expect(pp).not.toContain("microphone=*");
});

test("Third-party iframe cannot access camera", async ({ page }) => {
  await page.goto("https://app.example.com/embed-test");

  const allowed = await page.evaluate(() => {
    const policy = (document as any).featurePolicy
                ?? (document as any).permissionsPolicy;
    return policy?.allowsFeature("camera", "https://untrusted-widget.com") ?? null;
  });

  expect(allowed).toBe(false);
});
```


────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

────────────────────────────────────────────────────────────────

> **"Can you explain Permissions-Policy and how you've used it?"**
>
> "Permissions-Policy is an HTTP response header that controls which browser features —
> camera, microphone, geolocation, payment APIs, and so on — are available to the page
> and to any embedded iframes. It replaced the older Feature-Policy header, with a
> different structured-header syntax.
>
> At SAP Labs, we had a micro-frontend shell serving 12+ MFE teams. Before we
> introduced Permissions-Policy, any of those MFEs could theoretically prompt for
> camera or microphone access, which was a compliance risk. I implemented a
> centralized security middleware in the shell's Express server that built the
> Permissions-Policy header dynamically based on a registry of which MFEs were allowed
> which features. For example, only the video-collaboration MFE was whitelisted for
> camera and microphone; the analytics MFE got nothing.
>
> The important nuance is that the header sets the ceiling, but for cross-origin
> iframes you also need the `allow` attribute on the iframe element — both gates must
> be open. We paired this with sandbox attributes and CSP frame-src to create
> defense-in-depth. We also added Playwright tests in CI that fetch the response
> headers and assert specific policies are present and restrictive.
>
> One anti-pattern I've seen is teams setting `camera=*` or not setting the header at
> all, which means any embedded third-party can request camera access on behalf of
> your domain. That's a real risk in advertising-heavy pages. Our approach reduced
> security findings related to unauthorized feature access by roughly 80% in the
> first audit cycle."


────────────────────────────────────────────────────────────────

## 5. Code Examples

────────────────────────────────────────────────────────────────

See Section 2 (subsections E, F, G, H) for:

- **E** → JavaScript audit API usage + full audit script
- **F** → Express + Helmet middleware with per-route overrides
- **G** → Next.js `next.config.ts` with route-specific headers
- **H** → Micro-frontend shell builder function

Additional — **React hook for runtime permission checks:**

```typescript
// usePermissionCheck.ts
import { useEffect, useState } from "react";

interface PermissionStatus {
  feature: string;
  allowed: boolean | null; // null = API unavailable
}

export function usePermissionCheck(features: string[]): PermissionStatus[] {
  const [statuses, setStatuses] = useState<PermissionStatus[]>(
    features.map(f => ({ feature: f, allowed: null }))
  );

  useEffect(() => {
    const policy = (document as any).featurePolicy
                ?? (document as any).permissionsPolicy;
    if (!policy) return;

    setStatuses(
      features.map(f => ({
        feature: f,
        allowed: policy.allowsFeature(f),
      }))
    );
  }, [features]);

  return statuses;
}

// Usage in a component
function VideoCallButton() {
  const [camera, mic] = usePermissionCheck(["camera", "microphone"]);

  if (camera.allowed === false || mic.allowed === false) {
    return (
      <div className="alert">
        Video calls are disabled by your organization's security policy.
        {!camera.allowed && <span>Camera blocked.</span>}
        {!mic.allowed && <span>Microphone blocked.</span>}
      </div>
    );
  }

  return <button onClick={startCall}>Start Video Call</button>;
}
```


────────────────────────────────────────────────────────────────

## 6. Why & How Summary

────────────────────────────────────────────────────────────────

| Question | Answer |
|---|---|
| **Why does it exist?** | To enforce the principle of least privilege for browser feature access, especially for embedded third-party content |
| **Why not just CSP?** | CSP controls *resource loading* (scripts, styles, images). Permissions-Policy controls *runtime API access* (camera, mic, geo). They are complementary layers. |
| **How does it propagate?** | Top-level header sets the ceiling. Each iframe must also opt-in via `allow` attribute. Child frames can only restrict further, never widen. |
| **How to audit?** | `document.featurePolicy.features()` / `allowsFeature()` in browser; Playwright header assertions in CI; security scanner tools (Mozilla Observatory, securityheaders.com) |
| **How to deploy incrementally?** | Start with `Permissions-Policy: camera=(), microphone=()` (block the most dangerous). Add more directives over time. Use report-only mode where available. |
| **What if I break existing features?** | Use the JS audit API to detect which features your page actually uses before restricting. Roll out per-route with Next.js headers config to limit blast radius. |
| **MFE impact?** | Critical — without it, a compromised MFE can access camera/mic/payment on behalf of the entire shell origin. With it, each MFE is sandboxed to its declared features. |

**Defense-in-Depth Stack — where Permissions-Policy fits:**

```
Layer 1:  HTTPS + HSTS                    → Transport security
Layer 2:  CSP                             → Resource loading control
Layer 3:  Permissions-Policy              → Feature API access control  ← THIS FILE
Layer 4:  iframe sandbox + allow          → Per-embed restrictions
Layer 5:  CORS / CORP / COEP / COOP       → Cross-origin isolation
Layer 6:  SRI + Subresource loading       → Integrity verification
```

────────────────────────────────────────────────────────────────
