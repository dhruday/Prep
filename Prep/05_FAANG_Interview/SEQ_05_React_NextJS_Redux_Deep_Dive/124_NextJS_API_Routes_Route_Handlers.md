# 124. Next.js API Routes and Route Handlers
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Route Handlers are the App Router replacement for Pages Router API routes — defined as `route.ts` files inside the `app/` directory, they use the **Web Fetch API** (`Request`/`Response`) instead of Node.js's `req`/`res` — which means they're portable to Edge Runtime and closer to standard web standards. You export named functions matching HTTP verbs: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. Route Handlers are the right tool when you need an HTTP endpoint accessible to external clients (mobile apps, webhooks, other services), when you need full control over the response (streaming, custom headers, status codes), or when you need server-side logic that returns non-HTML (JSON, binary data, SSE). For form mutations from within your Next.js app, Server Actions are generally preferred; Route Handlers power the external-facing API surface.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### File-System Based API Routing

```
app/
  api/
    users/
      route.ts           → /api/users        (GET list, POST create)
      [id]/
        route.ts         → /api/users/123    (GET one, PUT update, DELETE)
        avatar/
          route.ts       → /api/users/123/avatar  (POST upload)
    products/
      route.ts           → /api/products
      search/
        route.ts         → /api/products/search
    webhooks/
      stripe/
        route.ts         → /api/webhooks/stripe  (POST only)
```

### Request and Response — Web Fetch API

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// ---- GET: list users ----
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;

  // ① Pagination params
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 100);  // cap at 100

  // ② Auth check
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, name: true, email: true, createdAt: true },
      // ③ Never return passwords, tokens, sensitive fields
    }),
    db.user.count(),
  ]);

  return NextResponse.json({
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// ---- POST: create user ----
const CreateUserSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
});

export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();  // may throw if body is not valid JSON
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { password, ...rest } = parsed.data;
  const hashed = await hashPassword(password);  // use argon2 or bcryptjs
  const user = await db.user.create({
    data: { ...rest, passwordHash: hashed },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(user, { status: 201 });
}

declare async function hashPassword(p: string): Promise<string>;
```

### Dynamic Route Params

```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ---- GET single user ----
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  // Validate UUID format to prevent injection
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(user);
}

// ---- PUT: replace user ----
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ④ IDOR check: user can only update themselves (or admin can update anyone)
  if (session.user.id !== params.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const updated = await db.user.update({ where: { id: params.id }, data: body });
  return NextResponse.json(updated);
}

// ---- DELETE ----
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await db.user.delete({ where: { id: params.id } });
  return new Response(null, { status: 204 });  // 204: No Content, no body
}
```

### Webhooks — Signature Verification

```typescript
// app/api/webhooks/stripe/route.ts
// Webhooks: verify signature — NEVER just trust the payload
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();  // raw body needed for signature verification
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  // Process event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
      break;
    default:
      // Acknowledge unhandled events (Stripe retries on non-2xx)
      break;
  }

  return new Response(null, { status: 200 });
}

// Disable Next.js body parsing — needed for Stripe signature verification
export const dynamic = 'force-dynamic';

async function handlePaymentSuccess(intent: Stripe.PaymentIntent) {
  await db.order.update({
    where: { stripeIntentId: intent.id },
    data: { status: 'PAID' },
  });
}

async function handleSubscriptionCanceled(sub: Stripe.Subscription) {
  await db.subscription.update({
    where: { stripeSubId: sub.id },
    data: { status: 'CANCELED' },
  });
}
```

### Streaming Response / Server-Sent Events

```typescript
// app/api/ai-stream/route.ts — streaming LLM response
export async function POST(request: Request) {
  const { prompt } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // SSE format: "data: ...\n\n"
      const sendChunk = (content: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
      };

      try {
        for await (const chunk of streamFromLLM(prompt)) {
          sendChunk(chunk);
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

declare function streamFromLLM(prompt: string): AsyncIterable<string>;
```

### CORS Configuration

```typescript
// app/api/public/route.ts — public API with CORS
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight requests
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const data = await getPublicData();
  return NextResponse.json(data, { headers: CORS_HEADERS });
}
```

### Route Handlers vs Server Actions — Decision Matrix

```
Use Route Handlers when:                     | Use Server Actions when:
---------------------------------------------|-----------------------------------
External client (mobile, third-party API)    | Form submissions from Next.js UI
Webhook receivers (Stripe, GitHub, etc.)     | Database mutations from components
SSE / streaming responses                    | Simple mutations + cache invalidation
CORS required for cross-origin requests      | Progressive enhancement needed
Custom HTTP status codes + headers           | Co-location with UI component desired
File download responses                      | useActionState/useFormStatus needed
Rate limiting at API level                   |
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the legacy BFF (Backend for Frontend) was a separate Express service — migrating to Next.js Route Handlers consolidated the API layer, eliminating a deployment unit. One non-trivial pattern: Stripe webhook verification required reading the raw body (not parsed JSON) — in Pages Router this needed `export const config = { api: { bodyParser: false } }`, but in App Router Route Handlers use `request.text()` directly (Web Fetch API has no default body parsing), which is actually simpler. REST endpoint latency improved because Route Handlers run in the same Next.js process, removing the network hop to the separate Express service.

**At FAANG scale:**
- **Microsoft:** GitHub Actions webhook receiver — POST to `/api/webhooks/github` with HMAC-SHA256 signature verification (using `crypto.subtle` in Edge Runtime); triggers ISR revalidation for documentation pages when repo content changes
- **Adobe:** Public Rest API for Creative SDK — Route Handlers with CORS for cross-origin requests, rate limiting via `x-ratelimit-*` response headers, streaming binary responses for font file downloads
- **Salesforce:** Activity feed SSE — Route Handler returning `text/event-stream`, keeping connection alive for real-time CRM activity updates without WebSocket infrastructure
- **Cisco:** Device telemetry ingestion endpoint — Route Handler accepting gzip-compressed JSON payloads, decompressed server-side, batched into Kafka; horizontal scaling handled by Vercel's serverless function auto-scaling

---

## 💬 4. Interview Execution

### Sample Answer

> "Route Handlers in the App Router use the Web Fetch API instead of Node.js req/res — you export named functions like `GET`, `POST`, `DELETE` from a `route.ts` file, and they receive a Web `Request` and return a Web `Response`. This is important because it means they run in Edge Runtime without modification if needed.
>
> I use Route Handlers for anything that needs to be callable from outside the Next.js app — mobile clients, third-party webhooks, public APIs. For Stripe webhooks the key is reading `request.text()` for the raw body before signature verification — if you let it parse to JSON first, the signature check fails. For mutations that only happen within my Next.js app, I use Server Actions instead — less boilerplate, automatic cache revalidation.
>
> Security-wise, Route Handlers are real HTTP endpoints with no CSRF protection built in (unlike Server Actions) — so I always add auth checks and Zod validation. For webhooks I always verify the provider's HMAC signature before processing the payload — never trust the body without signature verification."

---

## 💻 5. Code Example

```typescript
// Complete Route Handler with auth, validation, error handling
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidateTag } from 'next/cache';

const UpdatePostSchema = z.object({
  title: z.string().min(3).max(120).trim().optional(),
  body: z.string().min(10).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

// GET /api/posts/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const post = await db.post.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, body: true, status: true, author: { select: { name: true } } },
  });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (post.status === 'DRAFT') {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(post);
}

// PATCH /api/posts/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const post = await db.post.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // IDOR check: only author or admin
  if (post.authorId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = UpdatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
  }

  const updated = await db.post.update({
    where: { id: params.id },
    data: parsed.data,
  });

  // Invalidate cache for this post and post list
  revalidateTag(`post-${params.id}`);
  revalidateTag('posts');

  return NextResponse.json(updated);
}

// DELETE /api/posts/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const post = await db.post.findUnique({ where: { id: params.id } });
  if (!post) return new Response(null, { status: 404 });
  if (post.authorId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.post.delete({ where: { id: params.id } });
  revalidateTag('posts');
  return new Response(null, { status: 204 });
}

declare const db: any;
declare function auth(): Promise<{ user: { id: string; role: string } } | null>;
```

---

## 🧠 6. Memory Aid

**WEED — Route Handler core facts:**
- **W**eb Fetch API: `Request`/`Response` (not Node.js req/res)
- **E**xports per verb: `export async function GET`, `POST`, `DELETE` etc.
- **E**xternal-facing: use for webhooks, mobile API, cross-origin endpoints
- **D**ynamic params: second argument `{ params: { id } }` for `[id]` routes

**Security checklist for every Route Handler:**
1. Auth check (`await auth()`)
2. IDOR check (ownership verification)
3. Input validation (Zod)
4. Webhook signature verification (HMAC)
5. Never return sensitive fields (passwords, tokens)

**Mnemonic:** **WEED + 5-point security checklist** — route handlers are weedy by design (minimal, composable) but need security manually applied.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The "Server Actions vs Route Handlers — when to use which?" question is a common senior-level Next.js interview question; the clear answer (external clients/webhooks/streaming → Route Handlers; internal UI mutations → Server Actions) demonstrates architectural thinking rather than just knowing API syntax
→ Webhook signature verification is a non-negotiable security pattern that trips up many developers — Stripe, GitHub, and all major webhook providers HMAC-sign their payloads, and processing unsigned payloads allows attackers to inject arbitrary events (fake payments, fake auth events); demonstrating awareness of `request.text()` raw body requirement for signature verification is a senior security signal
→ IDOR (Insecure Direct Object Reference) in Route Handlers is a real OWASP Top 10 vulnerability — always verify ownership, not just authentication; showing `post.authorId !== session.user.id` ownership check pattern demonstrates security-first API design

**How it works (2 sentences):**
Route Handlers are compiled by Next.js into serverless functions (or Edge functions if `export const runtime = 'edge'`) with file-system based routing — the `app/api/posts/[id]/route.ts` file becomes a function that receives the Web Fetch API `Request` object with dynamic params extracted into the second argument, and whatever `Response` you return is sent directly to the client with no additional wrapping, meaning you have full control over status codes, headers, body format, and streaming.
Because Route Handlers use the Web Fetch API rather than Node.js HTTP, the same handler code can run in Node.js (serverless function) or V8 isolate (Edge Runtime) without modification — Next.js handles the translation layer, and the only constraint is that Edge Runtime handlers cannot use Node.js-only modules like `fs`, `path`, or database clients that depend on Node.js networking (Prisma runs on Node.js; Neon's HTTP driver runs on Edge).

---
✅ Topic 124/486 complete → Continuing to Topic 125: Next.js Authentication Patterns
