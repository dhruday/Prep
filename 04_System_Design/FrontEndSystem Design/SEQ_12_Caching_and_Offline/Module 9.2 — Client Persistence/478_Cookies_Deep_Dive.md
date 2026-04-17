# 478 — Cookies Deep Dive: SameSite, Secure, HttpOnly, Partitioned

────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

Cookies are small pieces of data (max ~4KB) that a server sends to a browser via the `Set-Cookie` HTTP header. The browser stores them and automatically attaches them to subsequent requests to the same origin. They are the oldest client-side persistence mechanism on the web and remain the **only** storage mechanism that participates in HTTP request/response cycles automatically.

Cookies serve three primary purposes:
- **Session management** — login tokens, shopping carts, server-side state identifiers
- **Personalization** — user preferences, themes, locale settings
- **Tracking** — recording and analyzing user behavior (first-party analytics, third-party ad tracking)

Modern cookie security revolves around four critical attributes: `HttpOnly` (blocks JavaScript access to prevent XSS exfiltration), `Secure` (restricts transmission to HTTPS), `SameSite` (controls cross-site sending to prevent CSRF), and the emerging `Partitioned` / CHIPS attribute (isolates third-party cookies per top-level site to preserve privacy without breaking embedded functionality).

────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior/Staff Level)

### A. Cookie Anatomy

A cookie is a key-value pair with metadata attributes. The full `Set-Cookie` header:

```
Set-Cookie: session_id=abc123;
  Domain=.example.com;
  Path=/app;
  Expires=Thu, 01 Jan 2028 00:00:00 GMT;
  Max-Age=63072000;
  HttpOnly;
  Secure;
  SameSite=Lax;
  Partitioned
```

| Component   | Description | Constraints |
|-------------|-------------|-------------|
| **Name**    | Case-sensitive identifier | No `=`, `;`, `,`, whitespace, or control chars |
| **Value**   | The payload string | URL-encoded if special chars present |
| **Domain**  | Which hosts receive the cookie | Must be current domain or parent; cannot be a different domain |
| **Path**    | URL path prefix scope | `/app` matches `/app/settings` but not `/api` |
| **Expires** | Absolute expiration (HTTP-date format) | Persistent cookie; survives browser close |
| **Max-Age** | Relative TTL in seconds | Takes precedence over `Expires` if both set |
| **Size**    | Name + Value combined | ~4,096 bytes per cookie; ~50 cookies per domain; ~180 total per browser |

**Session cookies** have no `Expires`/`Max-Age` — they are deleted when the browser session ends (though modern browsers with session restore may persist them).

**Persistent cookies** have an explicit expiration. `Max-Age=0` or `Expires` in the past deletes the cookie immediately.

### B. Security Attributes Deep Dive

#### B1. HttpOnly — XSS Defense Layer

```
Set-Cookie: token=eyJhbGc...; HttpOnly
```

- The cookie is **invisible to JavaScript** — `document.cookie` will not list it, the Cookie Store API cannot read it
- Prevents XSS attacks from exfiltrating session tokens even if an attacker achieves script injection
- The cookie is still sent automatically with HTTP requests — the server reads it normally
- **Not a complete XSS defense** — an attacker can still make authenticated requests from injected script (CSRF-style); HttpOnly prevents *stealing* the token, not *using* it in-context

**Critical insight:** HttpOnly cookies are the reason we store session identifiers and JWTs in cookies rather than localStorage. localStorage is always accessible to JavaScript, meaning any XSS vulnerability grants full access to every stored token.

#### B2. Secure — Transport Security

```
Set-Cookie: token=eyJhbGc...; Secure
```

- Cookie is only sent over HTTPS connections
- Prevents man-in-the-middle attacks on unencrypted HTTP where cookies could be intercepted
- On `localhost`, browsers allow `Secure` cookies over HTTP for development convenience
- **Always pair with HttpOnly** for authentication cookies

#### B3. SameSite — CSRF Prevention

This attribute controls whether the cookie is sent with cross-site requests:

| Value | Behavior | Use Case |
|-------|----------|----------|
| **Strict** | Cookie sent ONLY with same-site requests. Never sent on cross-site navigations, even top-level GET. | Banking, financial apps. User clicking a link from email to your site will NOT have the cookie — they must re-authenticate. |
| **Lax** | Cookie sent with same-site requests AND top-level navigations (GET only). Not sent with cross-site POST, iframe, AJAX, or image loads. | **Default in modern browsers.** Good balance — link from email works, but CSRF POST is blocked. |
| **None** | Cookie sent with all requests including cross-site. **Requires `Secure` attribute.** | Third-party cookies, embedded widgets, cross-origin API calls needing cookies. |

**The CSRF attack that SameSite prevents:**

```
<!-- Attacker's site: evil.com -->
<form action="https://bank.com/transfer" method="POST">
  <input name="to" value="attacker" />
  <input name="amount" value="10000" />
</form>
<script>document.forms[0].submit();</script>
```

Without `SameSite`, the browser attaches the user's `bank.com` session cookie to this cross-site POST. With `SameSite=Lax` (default), the cookie is NOT sent because this is a cross-site POST, and the attack fails.

**Chrome changed the default from `None` to `Lax` in 2020** — this was a massive web-compat event. Any cookie without an explicit `SameSite` attribute is now treated as `Lax`.

#### B4. Partitioned / CHIPS (Cookies Having Independent Partitioned State)

The newest attribute, addressing the third-party cookie problem without total deprecation:

```
Set-Cookie: __Host-widget=abc; Secure; Path=/; SameSite=None; Partitioned
```

**Problem:** Third-party cookie `tracker.com` set on `site-a.com` is the same cookie sent when visiting `site-b.com` — enabling cross-site tracking.

**Solution with Partitioned:** The cookie is keyed by the **top-level site** (partition key). `tracker.com`'s cookie set under `site-a.com` is completely separate from `tracker.com`'s cookie set under `site-b.com`. No cross-site tracking, but embedded functionality (payment widgets, chat embeds, federated login frames) still works.

```
Partition Key:  (https, site-a.com)  →  widget_session=xyz
Partition Key:  (https, site-b.com)  →  widget_session=abc  (different!)
```

**Requirements for Partitioned cookies:**
- Must include `Secure`
- Must include `SameSite=None` (it *is* a third-party cookie, just partitioned)
- Must include `Path=/`
- Should use `__Host-` prefix (recommended but not strictly required)

### C. First-Party vs Third-Party Cookies

| Dimension | First-Party | Third-Party |
|-----------|------------|-------------|
| **Set by** | Same domain as the page URL | Different domain (embedded iframe, script, image) |
| **Example** | `example.com` page sets `session=abc` | `analytics.com` script on `example.com` sets `_ga=xyz` |
| **Default SameSite** | Lax (attached to same-site requests) | Must explicitly set `SameSite=None; Secure` |
| **Future** | Unaffected | Being deprecated/partitioned in Chrome |
| **Use cases** | Auth, preferences, CSRF tokens | Analytics, ads, embedded widgets |

### D. Chrome's Third-Party Cookie Deprecation & Privacy Sandbox

Chrome's timeline has shifted multiple times, but the direction is clear:

1. **Phase 1 (2024):** 1% of Chrome users had third-party cookies disabled for testing
2. **Phase 2 (2025):** User choice mechanism — users can opt in/out of third-party cookies
3. **Privacy Sandbox alternatives:**
   - **Topics API** — browser categorizes user interests locally, shares broad topics (not browsing history) with advertisers
   - **Protected Audience API (FLEDGE)** — on-device ad auctions without server-side tracking
   - **Attribution Reporting API** — measures ad conversions without cross-site identifiers
   - **CHIPS (Partitioned cookies)** — the legitimate use-case escape hatch

**Impact on frontend engineers:**
- Embedded auth flows (OAuth popups/iframes) must migrate to `Partitioned` cookies, FedCM API, or redirect-based flows
- Analytics providers moving to first-party data collection (server-side proxying)
- Payment widgets and chat embeds need `Partitioned` cookie support
- Feature detection becomes critical: `cookieStore.get()` with partition key checks

### E. Cookie Lifecycle in the Browser

```
1. Server sends:    Set-Cookie: id=abc; Max-Age=3600; HttpOnly; Secure; SameSite=Lax
2. Browser stores:  { name: "id", value: "abc", domain: "example.com", ... }
3. On next request to example.com:
   - Same-site?        → Yes → Attach cookie
   - Cross-site GET?   → SameSite=Lax → Attach (top-level navigation only)
   - Cross-site POST?  → SameSite=Lax → DO NOT attach
4. After 3600 seconds → Browser deletes the cookie
```

**Eviction policy:** When limits are hit (50 per domain, 180 total, 4KB per cookie), browsers use LRU (least recently used) eviction. Oldest accessed cookies are removed first.

### F. Storage Comparison Table (15+ Dimensions)

| Dimension | Cookies | localStorage | sessionStorage | IndexedDB |
|-----------|---------|-------------|---------------|-----------|
| **Capacity** | ~4KB per cookie, ~50 per domain | ~5-10MB | ~5-10MB | Hundreds of MB+ |
| **Lifetime** | Session or explicit expiry | Permanent until cleared | Tab/window session | Permanent until cleared |
| **Sent with HTTP requests** | Yes (automatic) | No | No | No |
| **Accessible from JS** | Yes (unless HttpOnly) | Yes | Yes | Yes |
| **Accessible from Web Workers** | No (document.cookie is main-thread only) | No | No | Yes |
| **Accessible from Service Workers** | Via Cookie Store API only | No | No | Yes |
| **API type** | Synchronous (document.cookie) / Async (Cookie Store API) | Synchronous | Synchronous | Asynchronous (IDB) |
| **Scope** | Domain + Path | Origin (scheme+host+port) | Origin + Tab | Origin |
| **Cross-tab sharing** | Yes | Yes | No (per-tab) | Yes |
| **Structured data** | No (string only) | No (string only) | No (string only) | Yes (objects, blobs, files) |
| **Indexing/querying** | No | No | No | Yes (indexes, cursors, ranges) |
| **Server-readable** | Yes (sent in Cookie header) | No (must explicitly send) | No (must explicitly send) | No (must explicitly send) |
| **XSS vulnerability** | Mitigated with HttpOnly | Fully exposed | Fully exposed | Fully exposed |
| **CSRF vulnerability** | Yes (auto-sent) | No (not auto-sent) | No (not auto-sent) | No (not auto-sent) |
| **Encryption** | In transit with Secure flag | None | None | None |
| **Storage events** | Cookie Store API `change` event | `storage` event (cross-tab) | `storage` event (cross-tab) | No built-in events |
| **Best for** | Auth tokens, CSRF tokens, server-side session IDs | User prefs, cached UI state | Temporary form data, wizard state | Offline data, large datasets, binary blobs |

### G. Set-Cookie Header Anatomy in Express

```
HTTP/1.1 200 OK
Set-Cookie: session=eyJ...; Domain=.example.com; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax
Set-Cookie: csrf_token=rand123; Path=/; Max-Age=86400; Secure; SameSite=Strict
Set-Cookie: prefs=dark; Path=/; Max-Age=31536000; SameSite=Lax
```

Key rules:
- Multiple `Set-Cookie` headers allowed (one per cookie — cannot combine into one header)
- The `Cookie` request header sends ALL matching cookies in one header: `Cookie: session=eyJ...; csrf_token=rand123; prefs=dark`
- `__Host-` prefix: requires `Secure`, `Path=/`, and no `Domain` attribute — strongest binding
- `__Secure-` prefix: requires `Secure` attribute

### H. Cookie Consent & GDPR Requirements

Under GDPR/ePrivacy and similar regulations (CCPA, LGPD):

1. **Strictly necessary cookies** (session auth, CSRF, load balancing) — no consent required
2. **Functional cookies** (language, preferences) — implied consent often acceptable
3. **Analytics cookies** — explicit opt-in required in EU
4. **Advertising/tracking cookies** — explicit opt-in required; must be blocked before consent

**Technical implementation requirements:**
- Default: only essential cookies set before user consents
- Cookie consent state stored in a first-party cookie itself (ironic but practical)
- Third-party scripts (analytics, ads) must be conditionally loaded
- Must provide granular control (accept analytics but not ads)
- Must support consent withdrawal — delete all non-essential cookies on revocation
- Record of consent must be maintained (timestamp, version, choices)

────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

### Example 1: Secure Session Cookie Flow

```
User logs in → POST /login { email, password }
                  ↓
Server validates → creates session → stores in Redis
                  ↓
Response: Set-Cookie: sid=s%3AeyJpZCI6MTIzfQ.sig;
          HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/
                  ↓
Browser stores cookie → auto-attaches to all same-site requests
                  ↓
GET /dashboard  →  Cookie: sid=s%3AeyJpZCI6MTIzfQ.sig
                  ↓
Server reads sid → looks up session in Redis → returns user data
```

### Example 2: CSRF Prevention with Double Submit

```
1. Server sets CSRF token in cookie:
   Set-Cookie: csrf=abc123; Secure; SameSite=Strict; Path=/

2. Client reads token (NOT HttpOnly — intentional):
   const csrfToken = getCookie('csrf');

3. Client sends it in a custom header:
   fetch('/api/transfer', {
     method: 'POST',
     headers: { 'X-CSRF-Token': csrfToken },
     body: JSON.stringify({ amount: 100 })
   })

4. Server verifies: Cookie csrf === Header X-CSRF-Token
   → Attacker's cross-site request can't read the cookie to put in the header
   → Even if cookie is auto-attached, the header won't match
```

### Example 3: CHIPS for Embedded Payment Widget

```
Top-level: shop.example.com
Embedded:  <iframe src="https://pay.stripe.com/checkout">

Stripe sets:
Set-Cookie: __Host-pay_session=xyz;
  Secure; Path=/; SameSite=None; Partitioned

When user visits different-shop.com with same Stripe embed:
→ Stripe gets a DIFFERENT pay_session cookie (partitioned by top-level site)
→ Stripe cannot correlate users across shop.example.com and different-shop.com
→ Payment functionality still works perfectly within each site
```

### Example 4: SAP Enterprise Context — Micro-Frontend Cookie Isolation

At SAP, our micro-frontend architecture served multiple apps under subdomains:

```
analytics.sap-app.com  → MFE 1 (Angular)
dashboard.sap-app.com  → MFE 2 (React)
auth.sap-app.com       → Identity Provider

Session cookie: Domain=.sap-app.com → shared across all MFEs
CSRF token: Domain=(omitted, defaults to exact host) → per-MFE isolation
Feature flags: localStorage (not cookies — no need to send to server)
```

With strict CSP and HttpOnly session cookies, we achieved an **80% reduction in security vulnerability reports** — most XSS vectors lost their high-impact session-theft payloads.

────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

> **"Walk me through cookie security best practices for a production application."**
>
> "For production cookie security, I follow a layered approach. First, every authentication cookie gets `HttpOnly` — this is non-negotiable because it removes the entire class of XSS-based token theft. Even if an attacker injects a script, `document.cookie` won't expose the session token. Second, I always set `Secure` to ensure cookies only transmit over HTTPS — combined with HSTS, this eliminates man-in-the-middle interception.
>
> For CSRF protection, I set `SameSite=Lax` as the baseline — this is actually Chrome's default now, but I make it explicit for cross-browser consistency. Lax blocks cross-site POST attacks while still allowing normal link navigation. For highly sensitive operations like financial transfers, I pair this with a double-submit CSRF token pattern: a non-HttpOnly cookie plus a custom request header that the server validates match.
>
> On the newer side, I've been implementing `Partitioned` cookies for our embedded widget scenarios at SAP. We had micro-frontends served across subdomains, and as Chrome moves toward third-party cookie restrictions, `Partitioned` with the `__Host-` prefix gives us per-top-level-site isolation without breaking cross-origin embedded functionality.
>
> At a practical level: I use `Max-Age` over `Expires` for predictable TTLs, keep cookie payloads minimal (just a session ID referencing server-side state, not the JWT itself), and we implemented GDPR-compliant consent flows that default to only essential cookies and conditionally load analytics scripts after opt-in."

────────────────────────────────────────────────────────────────

## 5. Code Examples

### 5.1 Express Session Cookie Setup with All Attributes

```typescript
import express from 'express';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const app = express();
const redisClient = createClient({ url: process.env.REDIS_URL });

await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  name: '__Host-sid',              // __Host- prefix for maximum binding
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                // JS cannot access — XSS defense
    secure: true,                  // HTTPS only
    sameSite: 'lax',               // CSRF protection, allows top-level GET nav
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours in ms
    path: '/',                     // Entire domain
    // domain is omitted with __Host- prefix (locked to exact origin)
  },
}));

// Login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await authenticateUser(email, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Session data stored server-side in Redis, only session ID in cookie
  req.session.userId = user.id;
  req.session.role = user.role;

  res.json({ user: { id: user.id, name: user.name } });
});

// Logout — destroy session and clear cookie
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('__Host-sid', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    res.status(200).json({ message: 'Logged out' });
  });
});
```

### 5.2 CSRF Token: Cookie + Header Pattern

```typescript
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Middleware: set CSRF cookie on every response
function setCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies['csrf-token']) {
    const token = crypto.randomBytes(32).toString('hex');

    res.cookie('csrf-token', token, {
      httpOnly: false,        // Client JS MUST read this — intentional
      secure: true,
      sameSite: 'strict',     // Never sent cross-site
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
  next();
}

// Middleware: validate CSRF on state-changing requests
function validateCsrf(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies['csrf-token'];
  const headerToken = req.headers['x-csrf-token'] as string;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  next();
}

app.use(setCsrfCookie);
app.use(validateCsrf);
```

**Client-side CSRF header attachment:**

```typescript
// utils/api.ts
function getCookie(name: string): string | undefined {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const csrfToken = getCookie('csrf-token');

  return fetch(url, {
    ...options,
    credentials: 'same-origin',  // Include cookies
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
}

// Usage
await secureFetch('/api/transfer', {
  method: 'POST',
  body: JSON.stringify({ to: 'account123', amount: 500 }),
});
```

### 5.3 Cookie Consent Banner Logic

```typescript
// cookie-consent.ts

interface ConsentPreferences {
  essential: true;       // Always true, cannot be toggled
  functional: boolean;
  analytics: boolean;
  advertising: boolean;
  timestamp: number;
  version: string;
}

const CONSENT_COOKIE = 'cookie_consent';
const CONSENT_VERSION = '2.1';

function getConsent(): ConsentPreferences | null {
  const raw = getCookie(CONSENT_COOKIE);
  if (!raw) return null;

  try {
    const consent: ConsentPreferences = JSON.parse(decodeURIComponent(raw));
    // Re-prompt if consent version is outdated
    if (consent.version !== CONSENT_VERSION) return null;
    return consent;
  } catch {
    return null;
  }
}

function setConsent(prefs: Omit<ConsentPreferences, 'essential' | 'timestamp' | 'version'>): void {
  const consent: ConsentPreferences = {
    essential: true,
    ...prefs,
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  };

  // Consent cookie itself is "strictly necessary" — no consent needed for it
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; ` +
    `path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax; Secure`;

  applyConsent(consent);
}

function applyConsent(consent: ConsentPreferences): void {
  if (consent.analytics) {
    loadScript('https://www.googletagmanager.com/gtag/js?id=GA_ID');
  } else {
    // Revoke: delete analytics cookies
    deleteCookie('_ga');
    deleteCookie('_gid');
    deleteCookie('_gat');
  }

  if (consent.advertising) {
    loadScript('https://ads.provider.com/tag.js');
  }
}

function revokeConsent(): void {
  // Delete all non-essential cookies
  const allCookies = document.cookie.split(';');
  const essentialNames = new Set([CONSENT_COOKIE, '__Host-sid', 'csrf-token']);

  for (const cookie of allCookies) {
    const name = cookie.split('=')[0].trim();
    if (!essentialNames.has(name)) {
      deleteCookie(name);
    }
  }

  // Reset consent to essential-only
  setConsent({ functional: false, analytics: false, advertising: false });
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; Secure`;
  document.cookie = `${name}=; path=/; max-age=0; domain=.${location.hostname}; Secure`;
}

function loadScript(src: string): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

// On page load
const consent = getConsent();
if (!consent) {
  showConsentBanner();   // UI component — show modal/banner
} else {
  applyConsent(consent);
}
```

### 5.4 document.cookie API vs js-cookie vs Cookie Store API

```typescript
// ─── Raw document.cookie (synchronous, clunky) ───
// Read — returns ALL cookies as one semicolon-delimited string
const all: string = document.cookie;  // "name1=val1; name2=val2"

// Write — sets ONE cookie (does not overwrite others)
document.cookie = 'theme=dark; path=/; max-age=31536000; SameSite=Lax; Secure';

// Delete — set max-age=0
document.cookie = 'theme=; path=/; max-age=0';

// Parse helper (what everyone ends up writing)
function parseCookies(): Record<string, string> {
  return document.cookie.split('; ').reduce((acc, pair) => {
    const [key, ...rest] = pair.split('=');
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {} as Record<string, string>);
}


// ─── js-cookie library (thin wrapper, widely used) ───
// import Cookies from 'js-cookie';

// Cookies.set('theme', 'dark', {
//   expires: 365,           // days (not seconds)
//   path: '/',
//   secure: true,
//   sameSite: 'Lax',
// });

// const theme = Cookies.get('theme');   // 'dark'
// Cookies.remove('theme', { path: '/' });


// ─── Cookie Store API (async, modern, limited browser support) ───
// Available in secure contexts (HTTPS). Supported in Chrome/Edge, not Firefox/Safari yet.

async function cookieStoreExample(): Promise<void> {
  // Set
  await cookieStore.set({
    name: 'theme',
    value: 'dark',
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    path: '/',
    sameSite: 'lax',
  });

  // Get single
  const cookie = await cookieStore.get('theme');
  console.log(cookie?.value);  // 'dark'

  // Get all
  const allCookies = await cookieStore.getAll();
  console.log(allCookies);  // [{ name, value, domain, path, expires, ... }]

  // Delete
  await cookieStore.delete('theme');

  // Watch for changes (works in Service Workers too!)
  cookieStore.addEventListener('change', (event) => {
    for (const cookie of event.changed) {
      console.log(`Cookie changed: ${cookie.name} = ${cookie.value}`);
    }
    for (const cookie of event.deleted) {
      console.log(`Cookie deleted: ${cookie.name}`);
    }
  });
}

// Service Worker: subscribe to cookie changes
// self.addEventListener('activate', () => {
//   self.registration.cookies.subscribe([
//     { name: 'session', matchType: 'equals' }
//   ]);
// });
//
// self.addEventListener('cookiechange', (event) => {
//   // React to session cookie changes — e.g., logout user
// });
```

### 5.5 Express Cookie Middleware Comparison

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();

// cookie-parser: parses Cookie header into req.cookies
app.use(cookieParser(process.env.COOKIE_SECRET)); // secret enables signed cookies

app.get('/api/prefs', (req, res) => {
  // Unsigned cookies
  const theme = req.cookies.theme;           // 'dark'

  // Signed cookies (tamper-detection via HMAC)
  const userId = req.signedCookies.userId;   // '123' or false if tampered

  res.json({ theme, userId });
});

app.post('/api/prefs', (req, res) => {
  // Set unsigned cookie
  res.cookie('theme', req.body.theme, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: false,     // Client JS needs to read this for theming
    secure: true,
    sameSite: 'lax',
    path: '/',
  });

  // Set signed cookie (value is appended with HMAC signature)
  res.cookie('userId', req.body.userId, {
    signed: true,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });

  res.json({ success: true });
});
```

────────────────────────────────────────────────────────────────

## 6. Anti-Patterns & Common Mistakes

### Anti-Pattern 1: Storing JWT in Regular (non-HttpOnly) Cookies or localStorage

```typescript
// ❌ WRONG — JWT accessible to any injected script
document.cookie = `jwt=${token}; path=/`;
// or
localStorage.setItem('jwt', token);

// ✅ CORRECT — Server sets HttpOnly cookie, JS never sees the token
// Set-Cookie: jwt=eyJ...; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/
```

**Why:** A single XSS vulnerability in any dependency (and your node_modules has thousands) exposes every token in localStorage or non-HttpOnly cookies.

### Anti-Pattern 2: Not Setting SameSite Explicitly

```typescript
// ❌ Relying on browser defaults (inconsistent across browsers/versions)
res.cookie('session', token, { httpOnly: true, secure: true });

// ✅ Explicit SameSite for predictable cross-browser behavior
res.cookie('session', token, { httpOnly: true, secure: true, sameSite: 'lax' });
```

### Anti-Pattern 3: Using Cookies for Large Data

```typescript
// ❌ Stuffing JSON into a cookie — hits 4KB limit, sent on EVERY request
res.cookie('cart', JSON.stringify(cartWith50Items), { ... });

// ✅ Store only an ID; keep data server-side or in IndexedDB
res.cookie('cart_id', cartId, { httpOnly: true, secure: true, sameSite: 'lax' });
// Cart data in Redis (server) or IndexedDB (client for offline)
```

**Why:** Every cookie byte is sent with every HTTP request to the matching domain. A 4KB cookie on a domain serving 50 static assets = 200KB of unnecessary overhead per page load.

### Anti-Pattern 4: No GDPR Consent Implementation

```typescript
// ❌ Loading analytics immediately
<script src="https://analytics.com/track.js"></script>

// ✅ Conditional loading after consent
if (getConsent()?.analytics) {
  loadScript('https://analytics.com/track.js');
}
```

### Anti-Pattern 5: Cookie Without Path Causes Scope Confusion

```typescript
// ❌ No path — defaults to current request path, creating duplicates
res.cookie('theme', 'dark');
// Request to /app → cookie scoped to /app
// Request to /api → different cookie scoped to /api
// Now you have TWO 'theme' cookies with different paths

// ✅ Always set path explicitly
res.cookie('theme', 'dark', { path: '/' });
```

────────────────────────────────────────────────────────────────

## 7. Why & How Summary

| Question | Answer |
|----------|--------|
| **Why HttpOnly?** | Removes XSS token exfiltration entirely. Attacker can inject scripts but cannot steal the session cookie. |
| **Why Secure?** | Prevents cookie interception on unencrypted HTTP connections. Combined with HSTS, ensures transport-layer security. |
| **Why SameSite=Lax?** | Blocks cross-site POST/iframe/AJAX cookie attachment (CSRF defense) while allowing top-level link navigation to work. Best default. |
| **Why Partitioned?** | Enables third-party embedded functionality (payments, widgets) while preventing cross-site user tracking. The future of third-party cookies. |
| **Why not localStorage for tokens?** | localStorage has no equivalent of HttpOnly. Any XSS = full token access. Cookies with HttpOnly keep tokens invisible to JavaScript. |
| **Why Max-Age over Expires?** | Relative TTL (seconds from now) is immune to server-client clock skew. `Expires` uses absolute dates that can fail with incorrect clocks. |
| **Why __Host- prefix?** | Enforces `Secure`, `Path=/`, and no `Domain` — locks the cookie to the exact origin. Prevents subdomain attacks and domain-scoping mistakes. |
| **How to handle third-party cookie deprecation?** | Migrate to `Partitioned` cookies for embedded use cases, FedCM for federated auth, server-side proxying for analytics, and Privacy Sandbox APIs for ads. |
| **How to implement GDPR?** | Default to essential cookies only. Show consent banner. Conditionally load scripts. Store consent in a first-party cookie. Support revocation with full non-essential cookie deletion. |
| **How does cookie size impact performance?** | Every byte in cookies is sent with every matching request. At scale with CDN/static assets on the same domain, use a cookie-free domain for assets or keep cookies minimal (<1KB total). |

────────────────────────────────────────────────────────────────

*Prep reference: Hruday @ SAP Labs — 80% security vulnerability reduction through HttpOnly session cookies, CSP enforcement, and cookie isolation in micro-frontend architecture.*
