# 125. Next.js Authentication Patterns
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Next.js App Router authentication has three integration points: **Middleware** (edge-level redirect before the page renders), **Server Components** (server-side session reading in layouts/pages), and **Client Components** (session state for UI rendering). The de-facto library is **Auth.js (NextAuth v5)** — it provides OAuth providers (Google, GitHub, Microsoft), email/credentials login, JWT and database session strategies, and tight App Router integration with a `auth()` helper usable in any Server Component or Route Handler. The architecture separates concerns cleanly: Middleware handles the "can this user see this route?" check (fast, no DB), Server Components handle "what data does this user see?" (server context, DB access), and Client Components handle "what does the auth state look like in the UI?" (`useSession()` hook).

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Auth.js (NextAuth v5) Setup

```typescript
// auth.ts — central config, importable everywhere
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import { z } from 'zod';
import { verifyPassword } from '@/lib/password';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Persist sessions in DB (users, sessions, accounts tables)
  adapter: PrismaAdapter(db),

  // Hybrid: JWT for middleware (no DB) + DB session for server components
  session: { strategy: 'jwt' },

  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      async authorize(credentials) {
        // Validate credentials shape
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }).safeParse(credentials);

        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          select: { id: true, name: true, email: true, passwordHash: true, role: true },
        });

        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        // Return user without passwordHash — gets encoded into JWT
        const { passwordHash: _, ...safeUser } = user;
        return safeUser;
      },
    }),
  ],

  callbacks: {
    // Encode extra fields into JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? 'user';
      }
      return token;
    },

    // Expose JWT fields in session object (used by useSession + auth())
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  // Pages override — custom login UI
  pages: {
    signIn: '/login',
    error: '/login',
    signOut: '/logout',
  },
});

// Route Handler for Auth.js endpoints (/api/auth/callback/github, etc.)
// app/api/auth/[...nextauth]/route.ts
export { handlers as GET, handlers as POST } from '@/auth';
```

### TypeScript — Augmenting Session Types

```typescript
// types/next-auth.d.ts
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: 'user' | 'admin' | 'moderator';
    };
  }
  interface User {
    role?: 'user' | 'admin' | 'moderator';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}
```

### Middleware — Route Protection

```typescript
// middleware.ts — protect routes at the edge
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { auth: session, nextUrl } = req;

  // Not authenticated → redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  // Admin routes require admin role
  if (nextUrl.pathname.startsWith('/admin') && session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/403', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/settings/:path*'],
};
// NOTE: matcher excludes login/public pages — no redirect loop
```

### Server Components — Session Access

```typescript
// app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // auth() reads JWT cookie — no DB query (JWT strategy)
  const session = await auth();

  // Defense in depth: check in page even if middleware protects the route
  if (!session) redirect('/login');

  // session.user.id is available — typed, verified
  const userData = await db.user.findUnique({
    where: { id: session.user.id },
    include: { orders: { take: 10, orderBy: { createdAt: 'desc' } } },
  });

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      {session.user.role === 'admin' && <AdminPanel />}
      <RecentOrders orders={userData?.orders ?? []} />
    </div>
  );
}
```

### Client Components — useSession

```typescript
// app/components/UserMenu.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <UserMenuSkeleton />;
  if (status === 'unauthenticated') return <SignInButton />;

  return (
    <div>
      <img src={session.user.image ?? '/default-avatar.png'} alt={session.user.name ?? ''} />
      <span>{session.user.name}</span>
      <button onClick={() => signOut({ callbackUrl: '/' })}>
        Sign out
      </button>
    </div>
  );
}

// Wrap app in SessionProvider (App Router: in a Client Component wrapper)
// app/providers.tsx
'use client';
import { SessionProvider } from 'next-auth/react';
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// app/layout.tsx (Server Component)
import { Providers } from './providers';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### JWT Strategy vs Database Session Strategy

```
JWT Strategy:
  ✅ Fast: session = decode JWT (no DB query)
  ✅ Works in Edge Runtime (Middleware can verify)
  ❌ Cannot instantly revoke: token valid until expiry
  ❌ Data in token can be stale (role changed in DB, not in JWT until re-login)
  Best for: high-traffic read-heavy apps, CDN-cached pages, edge middleware

Database Session Strategy:
  ✅ Instant revoke: delete session row → user logged out immediately
  ✅ Always fresh: session data read from DB on every request
  ❌ DB query per request: slower, more load
  ❌ Cannot verify in Edge Runtime: needs DB access
  Best for: high-security apps (banking, healthcare), immediate revocation needed

Hybrid (recommended):
  - JWT in cookie: middleware verifies without DB
  - BUT: on sensitive operations, verify session in the page/action with DB lookup
  - Short JWT expiry (15min) + refresh token rotation
```

### Security Critical Patterns

```typescript
// 1. CSRF: Auth.js handles this automatically for its endpoints
//    For custom mutations using cookies, verify Origin header:
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin !== process.env.NEXT_PUBLIC_BASE_URL) {
    return new Response('Forbidden', { status: 403 });
  }
  // ... mutation logic
}

// 2. Secure cookie settings:
// auth.ts
cookies: {
  sessionToken: {
    options: {
      httpOnly: true,    // JS cannot read
      secure: process.env.NODE_ENV === 'production',  // HTTPS only
      sameSite: 'lax',   // prevents most CSRF
      maxAge: 30 * 24 * 60 * 60,  // 30 days
    },
  },
},

// 3. Never expose session in dangerouslySetInnerHTML or client logs:
// ❌ console.log(session)  — exposes to browser dev tools
// ✅ console.log(session.user.id)  — only log non-sensitive fields

// 4. Rate limiting login endpoint:
// app/api/auth/[...nextauth]/route.ts → add rate limiting middleware
// Or: use Upstash Redis rate limiting in Middleware
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the application used SAP Identity Provider (SAML/OAuth). Integrating with Auth.js involved creating a custom OAuth provider config matching SAP IDP endpoints. The JWT callback extracted the user's business roles from the IDP token claims and stored them in the session — enabling the same `session.user.role` pattern used elsewhere. The Middleware auth guard reduced auth-related page load time from ~150ms (Pages Router `getServerSideProps` DB session check) to <5ms (JWT verification at the edge). Token refresh was handled by Auth.js's built-in refresh token rotation.

**At FAANG scale:**
- **Microsoft:** Azure AD SSO — Microsoft OAuth provider with custom `clientId`/`clientSecret` from App Registration; tenant restriction via `tenantId` in provider config; JWT claims include Azure group memberships for role mapping
- **Adobe:** Creative Cloud OAuth — custom provider matching Adobe's PKCE OAuth flow; session includes Adobe entitlements (which products the user has licensed) extracted from the access token
- **Salesforce:** Salesforce OAuth 2.0 — custom provider; session stores Salesforce `instanceUrl` and `accessToken` for per-user API calls to Salesforce data; token refresh handled server-side in `jwt` callback
- **Cisco:** Corporate SSO via OIDC — custom OIDC provider; hardware MFA enforced by IDP; Next.js trusts the IDP auth, extracts groups, maps to application roles

---

## 💬 4. Interview Execution

### Sample Answer

> "Auth in Next.js App Router has three layers: Middleware for fast edge redirects, Server Components for server-side session data, and Client Components for UI-level auth state.
>
> I use Auth.js for the implementation — it gives you the `auth()` function that works in Server Components, Middleware, and Route Handlers. The `handlers` export from Auth.js is wired to `/api/auth/[...nextauth]/route.ts` to handle all the OAuth callbacks and sign-in flows.
>
> I typically use JWT session strategy — it means Middleware can verify the user without a database query, which is important since Middleware runs in Edge Runtime and can't access Prisma. The trade-off is that JWT contents can be slightly stale; for anything security-sensitive like role-based access to admin features, I do a defense-in-depth check in the Server Component or Server Action as well.
>
> For credentials providers (username/password), the key security points are: validate with Zod, verify the password hash with argon2 or bcrypt (never plain comparison), and never return the passwordHash from the authorize callback — Auth.js encodes the return value into the JWT."

---

## 💻 5. Code Example

```typescript
// Minimal but complete Next.js Auth setup
// auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role ?? 'user';
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as string;
      return session;
    },
  },
  pages: { signIn: '/login' },
});

// app/api/auth/[...nextauth]/route.ts
export { handlers as GET, handlers as POST } from '@/auth';

// middleware.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }
  return NextResponse.next();
});
export const config = { matcher: ['/dashboard/:path*'] };

// app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
export default async function Dashboard() {
  const session = await auth();
  if (!session) redirect('/login');
  return <h1>Hello {session.user.name}</h1>;
}

// app/components/LoginButton.tsx
'use client';
import { signIn, signOut, useSession } from 'next-auth/react';
export function AuthButton() {
  const { data: session } = useSession();
  if (session) {
    return <button onClick={() => signOut()}>Sign out</button>;
  }
  return <button onClick={() => signIn('google')}>Sign in with Google</button>;
}

// app/providers.tsx
'use client';
import { SessionProvider } from 'next-auth/react';
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

---

## 🧠 6. Memory Aid

**MSCP — Auth.js integration points:**
- **M**iddleware: edge-level route guard, JWT verify, fast redirect
- **S**erver Components: `auth()` function, session in layouts/pages
- **C**lient Components: `useSession()` hook, `signIn()`, `signOut()`
- **P**roviders: OAuth (Google, GitHub), Credentials, OIDC

**JWT vs DB sessions:**
- JWT: fast, edge-compatible, slight staleness risk, can't instantly revoke
- DB: always fresh, instant revoke, slower (DB query per request)
- Hybrid: JWT for middleware + DB check for sensitive operations

**Security must-haves:**
1. httpOnly cookie
2. secure (HTTPS-only in prod)
3. sameSite: 'lax'
4. Never expose passwordHash
5. Verify ownership on every mutation

**Mnemonic:** **MSCP** — Middleware guards the door, Server gives data, Client shows UI, Providers feed identity.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Auth is the highest-stakes component in any web app — a misconfigured session, exposed token, or missing IDOR check creates security vulnerabilities that can end a company; demonstrating layered auth (Middleware edge redirect + Server Component session check + IDOR ownership verification) shows production-grade security architecture, not just "it works"
→ JWT vs database session trade-off is a real architectural decision in enterprise apps: JWT = scalable but can't instantly revoke compromised tokens; database = slower but correct revocation — articulating this trade-off shows you've thought about incident response, not just happy path
→ `role` in JWT callback pattern is the enabling piece for RBAC (Role-Based Access Control) — showing you know where to inject custom claims (jwt callback) vs where to read them (session callback) is a concrete demonstration of Auth.js internals understanding

**How it works (2 sentences):**
Auth.js generates a signed JWT containing the user's session data (encoded via the `jwt` callback), stores it in an `httpOnly` cookie — so the client never directly accesses the token — and when `auth()` is called in a Server Component or Route Handler, it reads the cookie from the incoming request, verifies the JWT signature using `AUTH_SECRET`, and returns the decoded session object without any database query (JWT strategy), making it fast enough to use in Middleware on the Edge.
When using OAuth providers, Auth.js acts as an OAuth client: it redirects the user to the provider's authorization endpoint, receives an authorization code at the `/api/auth/callback/[provider]` Route Handler, exchanges it for an access token + ID token via the provider's token endpoint, extracts the user profile, runs the `signIn` and `jwt` callbacks, and sets the session cookie — all within a single redirect round-trip that the user experiences as "clicked Google → arrived back on Dashboard."

---
✅ Topic 125/486 complete → Continuing to Topic 126: Next.js Performance — Core Web Vitals, Bundle Analysis, Prefetching
