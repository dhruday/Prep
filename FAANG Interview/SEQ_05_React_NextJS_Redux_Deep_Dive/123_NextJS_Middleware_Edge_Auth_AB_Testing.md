# 123. Next.js Middleware — Edge Runtime, Auth Guards, A/B Testing
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Next.js Middleware is a `middleware.ts` file at the project root that runs on the **Edge Runtime** before every matched request — before the page renders, before Server Actions execute, before API routes respond. Because it runs on the edge network (not a Node.js Lambda), it adds near-zero latency globally. Its primary use cases are: **auth guards** (redirect unauthenticated users before any page code runs), **geolocation-based routing** (serve regional content), **A/B testing** (split users into variants without page flicker), and **request/response header injection**. Middleware uses the `NextResponse` API (`redirect`, `rewrite`, `next()`) and receives a `NextRequest` with enhanced APIs like `cookies()` and `geo`. The `matcher` config limits which paths trigger it — critical for performance since you don't want it running on every `/_next/static/` asset request.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Middleware Execution Model

```
Browser request → Edge Network (Vercel Edge / Cloudflare Workers runtime)
  → middleware.ts runs (near-zero latency, global PoP)
  → NextResponse.redirect()  → 307 response to client
  → NextResponse.rewrite()   → forward to different page (URL stays same in browser)
  → NextResponse.next()      → continue to Next.js rendering pipeline
  → Headers injected         → available in Server Components via headers()
```

### Basic Middleware Structure

```typescript
// middleware.ts — at project root (next to app/, not inside it)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest): NextResponse | Response {
  // Access request info
  const { pathname, searchParams } = request.nextUrl;
  const country = request.geo?.country;
  const city = request.geo?.city;
  const ip = request.ip;               // requester IP
  const locale = request.nextUrl.locale;

  // Read cookies
  const sessionCookie = request.cookies.get('session')?.value;
  const abVariant = request.cookies.get('ab-variant')?.value;

  // ... decision logic ...

  // Option 1: Continue to page (pass through)
  return NextResponse.next();

  // Option 2: Redirect (browser URL changes)
  // return NextResponse.redirect(new URL('/login', request.url));

  // Option 3: Rewrite (proxy to different page, URL unchanged)
  // return NextResponse.rewrite(new URL('/en-us/home', request.url));
}

// Matcher: CRITICAL — limits which paths run middleware
export const config = {
  matcher: [
    // Match these path patterns:
    '/dashboard/:path*',   // dashboard and all sub-paths
    '/api/:path*',         // all API routes
    '/admin/:path*',

    // Exclude static files and Next.js internals (performance):
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Pattern 1: Auth Guard

```typescript
// middleware.ts — JWT-based auth guard
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';   // jose: Edge-compatible JWT library (no Node.js crypto)

const PUBLIC_PATHS = ['/', '/login', '/register', '/api/auth'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through without auth check
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  // ① No token → redirect to login, preserve original URL for post-login redirect
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ② Verify token — jose works in Edge Runtime (Node.js crypto does NOT)
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    // ③ Role-based access control
    if (pathname.startsWith('/admin') && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/403', request.url));
    }

    // ④ Forward user info to downstream components via request header
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub as string);
    requestHeaders.set('x-user-role', payload.role as string);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    // Invalid or expired token → clear cookie + redirect
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|login|register).*)'],
};

// ---- Reading injected headers in Server Components ----
// app/dashboard/layout.tsx
import { headers } from 'next/headers';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = headers().get('x-user-id');
  const role = headers().get('x-user-role');
  // Use userId/role without re-verifying JWT — middleware already verified it
  return <div>{children}</div>;
}
```

### Pattern 2: A/B Testing with Cookies

```typescript
// middleware.ts — A/B testing (no page flicker, no JS required)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AB_VARIANTS = ['control', 'variant-a', 'variant-b'] as const;
type ABVariant = (typeof AB_VARIANTS)[number];

function getOrAssignVariant(request: NextRequest): { variant: ABVariant; isNew: boolean } {
  const existing = request.cookies.get('ab-pricing')?.value as ABVariant | undefined;
  if (existing && AB_VARIANTS.includes(existing)) {
    return { variant: existing, isNew: false };
  }
  // Assign new user to a variant (weighted: 50% control, 25% each variant)
  const rand = Math.random();
  const variant: ABVariant = rand < 0.5 ? 'control' : rand < 0.75 ? 'variant-a' : 'variant-b';
  return { variant, isNew: true };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/pricing') {
    const { variant, isNew } = getOrAssignVariant(request);

    // Rewrite to variant page — URL stays /pricing in browser
    const url = request.nextUrl.clone();
    url.pathname = `/pricing/${variant}`;
    const response = NextResponse.rewrite(url);

    // Persist variant assignment in cookie
    if (isNew) {
      response.cookies.set('ab-pricing', variant, {
        maxAge: 60 * 60 * 24 * 30,  // 30 days
        httpOnly: false,             // accessible to analytics JS
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return response;
  }

  return NextResponse.next();
}

// Result: /pricing → rewrites to /app/pricing/control/page.tsx
//                                  /app/pricing/variant-a/page.tsx
//                                  /app/pricing/variant-b/page.tsx
// User sees /pricing URL throughout, variant served via rewrite
```

### Pattern 3: Geolocation Routing

```typescript
// Serve region-specific content based on Vercel geo data
export function middleware(request: NextRequest) {
  const country = request.geo?.country ?? 'US';
  const { pathname } = request.nextUrl;

  // Redirect EU users to GDPR-compliant version
  const EU_COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'BE', 'SE', 'AT'];
  if (EU_COUNTRIES.includes(country) && !pathname.startsWith('/eu')) {
    const url = request.nextUrl.clone();
    url.pathname = `/eu${pathname}`;
    return NextResponse.redirect(url);
  }

  // Block access from specific countries (legal/compliance)
  const BLOCKED_COUNTRIES = ['RU', 'BY'];
  if (BLOCKED_COUNTRIES.includes(country)) {
    return new NextResponse(
      JSON.stringify({ error: 'Service not available in your region.' }),
      { status: 451, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return NextResponse.next();
}
```

### Edge Runtime Constraints

```typescript
// ✅ Available in Edge Runtime:
// - Web Fetch API, URL, URLSearchParams
// - Cookies via NextRequest/NextResponse
// - Headers API
// - TextEncoder/TextDecoder
// - crypto.subtle (Web Crypto API)
// - jose (JWT library, uses Web Crypto)

// ❌ NOT available in Edge Runtime (use Node.js runtime route handlers instead):
// - Node.js 'fs', 'path', 'crypto' modules
// - Prisma / TypeORM (require Node.js runtime)
// - bcrypt (use argon2 in WASM or Web Crypto)
// - Most npm packages that use Node.js built-ins

// For heavy auth logic (Prisma session check), two approaches:
// Option A: JWT in cookie — verify in middleware with jose (fast, stateless)
// Option B: Middleware calls a Node.js API route to verify session (adds latency)
// → Prefer JWT for middleware; reserve DB session checks for the page itself
```

### Header Injection for Server Components

```typescript
// Common pattern: inject computed data from middleware into Server Components
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Tag requests with request ID for distributed tracing
  const requestId = crypto.randomUUID();
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-forwarded-for', request.ip ?? '');

  // For logging/monitoring in Server Components:
  const modifiedRequest = new Headers(request.headers);
  modifiedRequest.set('x-request-id', requestId);
  return NextResponse.next({ request: { headers: modifiedRequest } });
}

// app/layout.tsx
import { headers } from 'next/headers';

export default function Layout({ children }: { children: React.ReactNode }) {
  const requestId = headers().get('x-request-id');  // from middleware
  // Log requestId for tracing across components
  return children;
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the application had auth checks duplicated across every page's `getServerSideProps` (Pages Router) — migrating to a single Middleware auth guard (~60 lines) replaced ~15 files of repeated auth logic. The key challenge was switching from `bcrypt`-based session verification to JWT-based (using `jose`) since bcrypt requires Node.js crypto unavailable in Edge Runtime. Result: auth redirects happened at the edge (< 5ms) instead of at the Lambda (50-100ms). A/B testing for the new pricing page was added to the same middleware — a persistent cookie ensured users stayed in their variant across sessions without any client-side flicker.

**At FAANG scale:**
- **Microsoft:** Feature flag routing via middleware rewrite — `ms.com/feature` rewrites to `/v2/feature` for opted-in tenants (stored in JWT claim), `/v1/feature` for others; no client-side JS required, zero flash
- **Adobe:** Locale detection + redirect — middleware checks `Accept-Language` header and geo, redirects to `adobe.com/fr`, `adobe.com/de` etc before page renders; localized URL cookie persists choice
- **Salesforce:** Tenant isolation in multi-tenant SaaS — middleware reads tenant ID from subdomain (`tenantA.salesforce.com`) and injects `x-tenant-id` header; every Server Component and API route receives it
- **Cisco:** Compliance-based content blocking — specific documentation only accessible from corporate IP ranges; middleware compares IP against CIDR ranges, returns 403 for outside access

---

## 💬 4. Interview Execution

### Sample Answer

> "Middleware in Next.js is a single `middleware.ts` file at the project root that runs on the Edge Runtime — globally distributed, near-zero latency — before every matched request. The three things I use it for most are auth guards, A/B routing, and header injection.
>
> For auth guards: the middleware reads a JWT from cookies, verifies it with `jose` (the Edge-compatible JWT library, since Node.js `crypto` isn't available in the Edge Runtime), and redirects unauthenticated users to login before the page even starts rendering. I inject the verified user ID into the request headers so Server Components downstream can read it via `headers()` without re-verifying.
>
> For A/B testing: I use rewrites. The user navigates to `/pricing`, middleware assigns them to a variant, sets a cookie so they're sticky, and rewrites the request to `/pricing/variant-a` internally. The browser URL stays `/pricing` — no page flash, no client-side split logic.
>
> The critical matcher config tells Next.js which paths to run middleware on. Without exclusions for `/_next/static` and image paths, you'd run the middleware on every static asset — massive performance hit. I always exclude those explicitly."

---

## 💻 5. Code Example

```typescript
// middleware.ts — production-ready auth + A/B + header injection
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const PUBLIC = ['/login', '/register', '/api/auth', '/_next', '/favicon.ico'];

function isPublic(pathname: string) {
  return PUBLIC.some(p => pathname.startsWith(p));
}

type ABVariant = 'control' | 'beta';

function resolveAB(request: NextRequest): ABVariant {
  const existing = request.cookies.get('ab-dashboard')?.value;
  if (existing === 'control' || existing === 'beta') return existing;
  return Math.random() < 0.5 ? 'control' : 'beta';
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Pass public routes through immediately
  if (isPublic(pathname)) return NextResponse.next();

  // ── Auth guard ─────────────────────────────────────
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  let userId: string;
  let role: string;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    userId = payload.sub as string;
    role = (payload.role as string) ?? 'user';
  } catch {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('auth-token');
    return res;
  }

  // Role guard for /admin
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/403', request.url));
  }

  // ── A/B testing for dashboard ──────────────────────
  let response: NextResponse;
  if (pathname === '/dashboard') {
    const variant = resolveAB(request);
    const url = request.nextUrl.clone();
    url.pathname = variant === 'beta' ? '/dashboard-beta' : '/dashboard';
    response = NextResponse.rewrite(url);
    response.cookies.set('ab-dashboard', variant, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: 'strict' as const,
      secure: process.env.NODE_ENV === 'production',
    });
  } else {
    response = NextResponse.next();
  }

  // ── Inject verified user into headers ─────────────
  const req = new Headers(request.headers);
  req.set('x-user-id', userId);
  req.set('x-user-role', role);

  return NextResponse.next({
    request: { headers: req },
    headers: response.headers, // preserve any Set-Cookie headers
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## 🧠 6. Memory Aid

**ARGE — what Middleware gives you:**
- **A**uth guard: verify JWT at the edge, redirect before page code runs
- **R**ewrite: serve different page for A/B or locale, URL unchanged
- **G**eo/headers: inject computed values (userId, country, requestId) into headers
- **E**dge: globally distributed, ~0ms overhead per request (no cold start like Lambda)

**Edge Runtime rules:**
- ✅ `jose` for JWT (Web Crypto API)
- ❌ `bcrypt`, Prisma, `fs`, Node.js crypto
- → For Node.js dependencies: use Route Handlers (Node runtime), not middleware

**Mnemonic:** **ARGE** — Auth, Rewrite, Geo/headers, Edge runtime.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Auth guards in middleware vs. in every layout are a DX and security story: centralized guard means a new route can't accidentally skip auth, and edge execution means the redirect happens globally within milliseconds instead of after a full Lambda cold start + page render — demonstrating this shows you think about system reliability and defense-in-depth, not just feature delivery
→ The Edge Runtime constraint (no Node.js modules) is a common gotcha that trips up senior developers — knowing that `jose` replaces `jsonwebtoken`, `argon2-browser` replaces `bcrypt`, and that stateless JWT is preferable to database session lookup in middleware, shows practical Edge Runtime experience
→ Header injection to pass verified data downstream is an important pattern: if Server Components re-query the database for the same user check, it's wasted compute; passing the already-verified JWT claims as request headers is O(0) cost data sharing between middleware and RSCs

**How it works (2 sentences):**
Next.js middleware executes in a V8 isolate (same runtime as Cloudflare Workers) at Vercel's edge PoPs, meaning it runs within milliseconds of the user globally rather than routing to a central Lambda — it intercepts the request before it reaches the Next.js rendering pipeline, and the `request.nextUrl` object is mutable, so calling `.rewrite()` or `.redirect()` returns a new `NextResponse` that either forwards the request to a different origin URL (while keeping the browser URL unchanged) or returns an HTTP redirect to the client.
The `matcher` config uses a path-matching DSL compiled to a regex at build time, and Next.js evaluates it against every incoming request path before even loading the middleware module — if the path doesn't match, the entire V8 isolate execution is skipped, which is why excluding `/_next/static/*` and image paths is essential for performance (static asset requests are the most frequent in a Next.js app).

---
✅ Topic 123/486 complete → Continuing to Topic 124: Next.js API Routes and Route Handlers
