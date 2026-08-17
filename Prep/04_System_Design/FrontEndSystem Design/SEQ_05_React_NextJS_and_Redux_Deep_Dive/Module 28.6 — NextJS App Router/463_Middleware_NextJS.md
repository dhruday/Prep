# 463 – Middleware in Next.js

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Next.js Middleware** runs **before** every request (at the Edge). Single `middleware.ts` at project root. Use for: authentication checks, redirects, rewrites, A/B testing, geolocation, rate limiting, header manipulation. Runs on the **Edge Runtime** (lightweight, no Node.js APIs).

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── middleware.ts (project root) ────
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. AUTH CHECK — redirect unauthenticated users
  const token = request.cookies.get('session')?.value;
  
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // 2. REDIRECT — legacy URLs
  if (pathname === '/old-blog') {
    return NextResponse.redirect(new URL('/blog', request.url), 301);
  }
  
  // 3. REWRITE — internal routing (URL stays the same)
  if (pathname.startsWith('/api/v1')) {
    return NextResponse.rewrite(new URL(pathname.replace('/v1', '/v2'), request.url));
  }
  
  // 4. HEADERS — add custom headers
  const response = NextResponse.next();
  response.headers.set('X-Custom-Header', 'value');
  response.headers.set('X-Request-Id', crypto.randomUUID());
  return response;
}

// ──── MATCHER — only run on specific paths ────
export const config = {
  matcher: [
    // Match all paths except static files and API
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
    
    // Or specific paths
    '/dashboard/:path*',
    '/admin/:path*',
  ],
};

// ──── A/B TESTING ────
export function middleware(request: NextRequest) {
  const bucket = request.cookies.get('ab-bucket')?.value;
  
  if (!bucket) {
    const newBucket = Math.random() > 0.5 ? 'a' : 'b';
    const response = NextResponse.next();
    response.cookies.set('ab-bucket', newBucket, { maxAge: 60 * 60 * 24 * 30 });
    
    if (newBucket === 'b') {
      return NextResponse.rewrite(new URL('/variant-b' + request.nextUrl.pathname, request.url));
    }
    return response;
  }
  
  if (bucket === 'b') {
    return NextResponse.rewrite(new URL('/variant-b' + request.nextUrl.pathname, request.url));
  }
  
  return NextResponse.next();
}

// ──── GEOLOCATION ────
export function middleware(request: NextRequest) {
  const country = request.geo?.country || 'US';
  const city = request.geo?.city || 'San Francisco';
  
  // Rewrite to country-specific page
  if (country === 'DE') {
    return NextResponse.rewrite(new URL('/de' + request.nextUrl.pathname, request.url));
  }
  
  const response = NextResponse.next();
  response.headers.set('X-User-Country', country);
  return response;
}

// ──── RATE LIMITING (basic) ────
const rateLimit = new Map<string, { count: number; timestamp: number }>();

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowMs = 60_000; // 1 minute
    const maxRequests = 100;
    
    const current = rateLimit.get(ip);
    if (current && now - current.timestamp < windowMs) {
      if (current.count >= maxRequests) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 },
        );
      }
      current.count++;
    } else {
      rateLimit.set(ip, { count: 1, timestamp: now });
    }
  }
  
  return NextResponse.next();
}
```

### Key Constraints
| Aspect | Detail |
|---|---|
| Runtime | Edge Runtime (not Node.js) |
| File | Single `middleware.ts` at root |
| No Node APIs | No `fs`, `path`, `child_process` |
| Max size | ~1MB (Edge function limit) |
| Runs before | Caching, routing, rendering |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Next.js middleware runs at the Edge before every matched request. Single middleware.ts at project root. Use matcher config to scope paths. Common uses: auth redirects, rewrites, A/B testing, geolocation, headers. Returns NextResponse.next() (continue), .redirect(), or .rewrite(). Edge Runtime — no Node.js APIs."*

## 4. 🧠 MEMORY AID
**"middleware.ts at root → runs before requests at Edge. NextResponse.next()/redirect()/rewrite(). matcher: ['/dashboard/:path*']. No Node APIs."**
