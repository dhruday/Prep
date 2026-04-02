# 151. tRPC & Type-Safe APIs
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

tRPC (TypeScript Remote Procedure Call) is a framework that eliminates the API boundary between a TypeScript server and TypeScript client by sharing types directly — no code generation, no schema language, no manual type maintenance. The client autocompletes server procedure names and their input/output types in the IDE, and TypeScript errors immediately when you call a procedure with the wrong argument shape or access a nonexistent field on the response. The trade-off: tRPC only works in a full-stack TypeScript monorepo where both client and server share code. For inter-team or cross-language APIs, REST with OpenAPI or GraphQL is more appropriate. I'd reach for tRPC in a Next.js monorepo project where a small team owns both client and server.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### How tRPC Works — Zero Schemas

```typescript
// server/routers/products.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

export const productsRouter = router({
  // Query — GET equivalent
  list: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const { category, search, page, pageSize } = input;
      const products = await ctx.db.products.findMany({
        where: {
          ...(category && { categoryId: category }),
          ...(search && { name: { contains: search, mode: 'insensitive' } }),
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      const total = await ctx.db.products.count({ where: /* ... */ {} });
      return { items: products, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

  // Parameterized query
  getById: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input: id, ctx }) => {
      const product = await ctx.db.products.findUnique({ where: { id } });
      if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: `Product ${id} not found` });
      return product;
    }),

  // Mutation — POST/PATCH/DELETE equivalent
  create: protectedProcedure  // requires auth (checked in middleware)
    .input(z.object({
      name: z.string().min(1).max(200),
      price: z.number().positive(),
      categoryId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.products.create({ data: { ...input, createdBy: ctx.user.id } });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      changes: z.object({
        name: z.string().min(1).max(200).optional(),
        price: z.number().positive().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.products.update({
        where: { id: input.id },
        data: input.changes,
      });
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input: id, ctx }) => {
      await ctx.db.products.delete({ where: { id } });
    }),
});

// server/root.ts
export const appRouter = router({
  products: productsRouter,
  users: usersRouter,
  orders: ordersRouter,
});

// Export the type — this is the ONLY thing shared between server and client
export type AppRouter = typeof appRouter;
```

### Client — Complete Type Inference, Zero Schemas

```typescript
// utils/trpc.ts (Next.js)
import { createTRPCNext } from '@trpc/next';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/root';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          // Automatic request batching: multiple concurrent queries in the same
          // render cycle are batched into a single HTTP request
          headers: () => {
            const token = authStore.getState().token;
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    };
  },
});

// React component — fully typed, autocompletes from server AppRouter
function ProductList({ category }: { category: string }) {
  // TypeScript knows the exact input type expected and output type returned
  const { data, isLoading, error } = trpc.products.list.useQuery({
    category,       // ← TypeScript autocompletes and validates this
    page: 1,
    pageSize: 20,
  });

  // data is fully typed as { items: Product[], total: number, page: number, ... }
  // No manual typing, no codegen, no OpenAPI schemas

  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => trpc.useContext().products.list.invalidate(),
  });

  return (
    <div>
      {data?.items.map(product => (
        <ProductCard
          key={product.id}
          product={product}  // ← product has exact Prisma-inferred type
        />
      ))}
      <button onClick={() => createProduct.mutate({
        name: 'New Product',
        price: 29.99,
        categoryId: '...',
      })}>
        Add Product
      </button>
    </div>
  );
}
```

### tRPC Middleware — Context & Auth

```typescript
// server/trpc.ts
import { TRPCError, initTRPC } from '@trpc/server';
import type { Session } from 'next-auth';
import { getServerAuthSession } from './auth';

// Context: shared across all procedures — database, session, etc.
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getServerAuthSession();
  return {
    db: prisma,
    session,
    user: session?.user ?? null,
  };
};

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Zod validation errors — expose to client for form feedback
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure — rejects unauthenticated requests
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be logged in' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Rate-limited procedure
export const rateLimitedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const key = `rate_limit:${ctx.session?.user?.id ?? 'anonymous'}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  if (count > 60) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' });
  }
  return next({ ctx });
});
```

### Request Batching

```typescript
// httpBatchLink automatically batches concurrent queries:
// If 3 components mount simultaneously and each calls a tRPC query,
// instead of 3 HTTP requests, they're batched into 1:
// POST /api/trpc/products.list,users.me,orders.recent
// Server processes all 3 and returns merged response

// This is the killer feature vs REST (which has no native batching)

// Disable batching for specific queries:
trpc.products.getById.useQuery(id, {
  trpc: { abortOnUnmount: true, ssr: false },
});
```

### Subscriptions with WebSocket

```typescript
// server/routers/live-prices.ts
export const livePricesRouter = router({
  onPriceChange: publicProcedure
    .input(z.string().uuid())  // product ID
    .subscription(async function*({ input: productId, ctx }) {
      let prev = await ctx.db.products.findUnique({ where: { id: productId } });

      // Async generator pattern — emit values over time
      const eventEmitter = priceUpdateEmitter;
      for await (const event of on(eventEmitter, `price:${productId}`)) {
        const price = event[0] as number;
        if (price !== prev?.price) {
          prev = { ...prev!, price };
          yield { productId, price, timestamp: Date.now() };
        }
      }
    }),
});

// Client
function LivePriceDisplay({ productId }: { productId: string }) {
  const { data } = trpc.livePrices.onPriceChange.useSubscription({ productId }, {
    onData(data) { console.log('Price updated:', data.price); },
    onError(err) { console.error('Subscription error:', err); },
  });

  return <span>${data?.price ?? '...'}</span>;
}
```

### Error Handling

```typescript
// TRPCError codes map to HTTP status:
// NOT_FOUND        → 404
// UNAUTHORIZED     → 401
// FORBIDDEN        → 403
// BAD_REQUEST      → 400
// INTERNAL_SERVER_ERROR → 500
// TOO_MANY_REQUESTS → 429

// Client-side — typed error handling
const { error } = trpc.products.getById.useQuery(id);

if (error) {
  if (error.data?.code === 'NOT_FOUND') return <EmptyState />;
  if (error.data?.code === 'UNAUTHORIZED') return <Navigate to="/login" />;
  // Zod validation errors from server:
  if (error.data?.zodError) {
    return <ValidationErrors errors={error.data.zodError.fieldErrors} />;
  }
}
```

### tRPC vs REST vs GraphQL

| Dimension | tRPC | REST | GraphQL |
|---|---|---|---|
| Type safety | Perfect (shared TS types) | Good (OpenAPI + codegen) | Good (schema + codegen) |
| Over-fetching | No (procedures return what they return) | Yes (unless custom projections) | Never |
| Cross-team/language | No (TypeScript only) | Yes | Yes |
| HTTP caching | Limited (mostly POST) | Native GET caching | No (all POST) |
| Learning curve | Low (TypeScript devs) | Low | Medium |
| Schema definition | None (Zod is the schema) | OpenAPI YAML | GraphQL SDL |
| Batching | Automatic | Manual | Manual |

### ⚠️ Anti-Patterns & Pitfalls

- **Using tRPC across team/language boundaries** — tRPC only works when client and server share TypeScript; if the backend is Go or Java, or a different team with a different release cadence, REST or GraphQL is required

- **Not using Zod for all inputs** — without Zod validation, any input reaches the resolver unchecked; Zod is both the validator AND the TypeScript input type source; never skip it

- **Putting all procedures in one router file** — a 500-procedure monolithic router becomes unnavigable; always use the `router()` composition pattern with one file per domain (`products`, `users`, `orders`)

- **Forgetting `invalidate` after mutations** — tRPC uses TanStack Query internally; after a mutation, invalidate the affected query key via `utils.products.list.invalidate()`; forgetting this leaves stale data on screen

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, inter-team APIs use OData (ABAP backend) and REST — tRPC wouldn't apply because the backend team uses ABAP and Java, not TypeScript. However, for a Next.js internal tooling dashboard built by a 3-person frontend team with a Prisma/Node.js backend, tRPC would eliminate the entire OpenAPI spec maintenance burden — exactly the scenario where tRPC provides maximum value with minimum cost.

**At FAANG scale:**
- **Microsoft:** Internal tooling teams (like VS Code web extensions backend) use TypeScript monorepos; tRPC applies there; for public APIs (Graph API, Azure API), REST with OpenAPI is required — different teams, different languages, external consumers
- **Adobe:** Firefly's backend and frontend are in a TypeScript monorepo; tRPC-style full-stack type sharing is feasible; their internal tooling uses this pattern; the public CC API is REST
- **Salesforce:** Trailhead (learning platform) and the developer experience tooling use Node.js backends with TypeScript frontends — internal projects appropriate for tRPC; external Salesforce API stays REST/GraphQL
- **Cisco:** Internal dashboard tooling (network analytics, observability) built on Express + Next.js — team-internal tRPC use; external DevNet APIs are REST

**How it evolves with scale:**
- Small teams (1–5): tRPC is ideal — no overhead, full type safety, rapid iteration
- Medium teams (5–20): still viable if monorepo; use router composition aggressively
- Large organizations: REST or GraphQL — heterogeneous teams, varied languages, external consumers, contract stability requirements

---

## 💬 4. Interview Execution

### Sample Answer

> "tRPC is the best developer experience I've used for full-stack TypeScript — you define a procedure on the server with Zod for input validation, and the client automatically has the exact input and output types with IDE autocompletion. No OpenAPI spec to maintain, no codegen pipeline to configure, no type drift between client and server.
>
> The HTTP layer underneath is regular requests — tRPC maps queries to GET (with input as URL parameters) and mutations to POST; `httpBatchLink` automatically batches concurrent calls in the same render cycle into a single HTTP request, which is a killer feature for dashboards with many data dependencies.
>
> The critical constraint is TypeScript on both sides in a shared monorepo. For public APIs, multi-team boundaries, or non-TypeScript backends, REST or GraphQL is the right choice — tRPC's value proposition disappears completely without shared TypeScript.
>
> I'd choose tRPC for an internal Next.js + Prisma project where a small team owns both client and server. I'd choose GraphQL when the data model is deeply relational and multiple clients consume it. I'd choose REST for public APIs with external consumers or cross-language teams."

### Likely Follow-up Questions
1. "How does tRPC handle authentication?" → Context-based: `createTRPCContext` fetches the session, attaches it to `ctx`; `protectedProcedure` middleware throws `UNAUTHORIZED` if `ctx.user` is null; every procedure accesses auth via `ctx`
2. "How does tRPC compare to React Server Actions?" → Both eliminate API route boilerplate; Server Actions are React's built-in server-mutation mechanism (great for form mutations in RSC apps); tRPC adds query caching, subscriptions, and full procedure typing; use Server Actions for simple mutations in pure RSC apps, tRPC for complex data requirements
3. "Can you use tRPC with React Native?" → Yes — `@trpc/client` is framework-agnostic; use with TanStack Query and the `httpBatchLink`; works on any TypeScript client
4. "What's the bundle size cost?" → The tRPC client (`@trpc/client` + `@trpc/react-query`) adds ~12KB gzipped; TanStack Query (peer dependency) is another ~13KB; total overhead is ~25KB — comparable to Axios alone; acceptable for most apps
5. "How do you handle file uploads?" → tRPC doesn't natively support multipart; use a separate REST endpoint for uploads, receive back the file URL, then use it as input to a tRPC mutation

---

## 💻 5. Code Example (TypeScript)

```typescript
// Complete tRPC setup: Next.js App Router + Prisma + Zod

// server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import { getServerAuthSession } from './auth';
import { prisma } from './db';

export const createTRPCContext = async () => {
  const session = await getServerAuthSession();
  return { db: prisma, session };
};

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const { router, procedure: publicProcedure } = t;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});

// server/routers/products.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

const ProductInput = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  categoryId: z.string().cuid(),
});

export const productsRouter = router({
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      categoryId: z.string().optional(),
      page: z.number().default(1),
    }))
    .query(async ({ input, ctx }) => {
      const take = 20;
      const [items, total] = await Promise.all([
        ctx.db.product.findMany({
          where: {
            ...(input.search && { name: { contains: input.search, mode: 'insensitive' } }),
            ...(input.categoryId && { categoryId: input.categoryId }),
          },
          skip: (input.page - 1) * take,
          take,
          include: { category: true },
        }),
        ctx.db.product.count(),
      ]);
      return { items, total, page: input.page, totalPages: Math.ceil(total / take) };
    }),

  create: protectedProcedure
    .input(ProductInput)
    .mutation(({ input, ctx }) =>
      ctx.db.product.create({ data: { ...input, createdById: ctx.user.id } })
    ),
});

// app/api/trpc/[trpc]/route.ts (Next.js App Router)
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../../../server/root';
import { createTRPCContext } from '../../../../server/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };

// utils/trpc.ts (client)
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server/root';
export const trpc = createTRPCReact<AppRouter>();

// Component
function ProductsPage() {
  const { data, isLoading } = trpc.products.list.useQuery({ page: 1 });
  const utils = trpc.useUtils();
  const create = trpc.products.create.useMutation({
    onSuccess: () => utils.products.list.invalidate(),
  });

  return (
    <div>
      {data?.items.map(p => <div key={p.id}>{p.name} — ${p.price}</div>)}
      <button onClick={() => create.mutate({ name: 'Test', price: 9.99, categoryId: 'clxxx' })}>
        Add
      </button>
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

**tRPC value = zero schema drift:**
- Server writes Zod schema → TypeScript infers input/output types
- Client imports the type only (`AppRouter`) → TypeScript propagates types across network boundary
- No OpenAPI, no `.graphql` files, no codegen pipeline — just `export type AppRouter = typeof appRouter`

**When to use — TAMS:**
- **T**eam is full TypeScript
- **A**rchitecture is monorepo
- **M**edium or smaller team (< 20 devs)
- **S**erver is owned by the same team

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ tRPC demonstrates you understand the full-stack type safety problem space — most teams either have no types at the API boundary (raw fetch), or maintain a separate schema language (OpenAPI/GraphQL SDL) that drifts from the actual server behavior; tRPC eliminates the drift completely by using the server's TypeScript implementation as the source of truth; this is a sophisticated architectural awareness point
→ The automatic batching behavior via `httpBatchLink` is the performance insight — tRPC's default client deduplicates and batches all concurrent queries in the same render cycle into a single HTTP request; a dashboard with 8 data cards mounting simultaneously sends 1 request instead of 8
→ Knowing when NOT to use tRPC is as important as knowing when to use it — for teams that span multiple languages, external API consumers, or multi-team boundaries, tRPC breaks down; demonstrating this boundary awareness separates senior from mid-level candidates

**How it works (2 sentences):**
tRPC works by exporting only the type of the server router (`export type AppRouter = typeof appRouter`) from the server to the client — no runtime code crosses the boundary, just TypeScript types; the client uses this type to provide autocomplete and type checking for procedure names and input shapes, then at runtime serializes the call to either a GET request (queries) or POST request (mutations) directed at `/api/trpc/[procedureName]`, where the server deserializes the input, validates it against the Zod schema, executes the resolver, and serializes the output back.
`httpBatchLink` intercepts all tRPC calls made within the same JavaScript microtask tick — it accumulates them into a single batch, sends one HTTP request with all procedure names and inputs as a JSON array, and the server processes them all in parallel before returning an array of results; from the component's perspective each `useQuery` hook receives its own independent result, but the network profiler shows only one request, which is the same efficiency as GraphQL's batched resolver execution.

---
✅ Topic 151/486 complete → Continuing to Topic 152: Pagination Strategies
