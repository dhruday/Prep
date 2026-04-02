# tRPC — Type-Safe APIs (Awareness Level)
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **tRPC** stands for TypeScript Remote Procedure Call. It is not a new protocol — it runs over HTTP. The value proposition: end-to-end TypeScript type safety from the backend procedure definition all the way to the frontend call site, with no code generation step. You define a router on the server in TypeScript. The frontend imports the router's type (NOT runtime code — type only) and calls procedures as if they were local functions. If you change the server function's return type or parameter, the frontend shows a TypeScript error immediately.
- **How it works**: Server defines `appRouter` with `.query()` and `.mutation()` procedures. Client uses `createTRPCClient<typeof appRouter>` to get a fully typed client. TypeScript infers all parameter and return types across the client-server boundary. Zero schema files (no `.proto`, no `.graphql`), zero code generation command.
- **Zod for validation**: tRPC uses Zod schemas as the input validation and type source. `z.object({ userId: z.string() })` — Zod validates input at runtime AND TypeScript infers the type from the schema at compile time.
- **Next.js native**: tRPC was designed for Next.js. The `@trpc/next` integration connects naturally to Next.js API routes and the App Router. It is also usable with standalone Node.js servers.
- **When NOT to use tRPC**: public APIs consumed by any non-TypeScript client, cross-language microservices, mobile apps written in Swift/Kotlin, or any context where the consumer is not a TypeScript project you control. tRPC types only exist in TypeScript — they mean nothing to a Python client or a third-party consumer.
- **Awareness note**: this is a TypeScript-ecosystem tool. For Java/Spring Boot backends, it does not apply. The key interview signal is understanding its purpose and boundaries, not deep implementation.

---

## 1. One-Line Definition
tRPC enables end-to-end TypeScript type safety between a Node.js backend and a TypeScript frontend, eliminating schema duplication and code generation by sharing types directly from server to client.

---

## 2. The Problem It Solves

### The REST + TypeScript Type Drift Problem

```
THE PROBLEM: keeping frontend and backend types in sync is manual and error-prone

SCENARIO: A Next.js e-commerce app with a Node.js backend.
The backend changes a user endpoint:

BEFORE change (backend returns):
  {
    "userId": "u-123",
    "firstName": "Hruday",
    "lastName": "D",
    "email": "hruday@example.com"
  }

AFTER refactor — developer renames field:
  {
    "userId": "u-123",
    "fullName": "Hruday D",    ← renamed from firstName + lastName
    "email": "hruday@example.com"
  }

REST WORKFLOW — what goes wrong:
  1. Backend developer updates UserDto.java / user.types.ts
  2. Frontend TypeScript interface: NOT automatically updated — developer must:
     a. Know the change happened (requires communication)
     b. Find all TypeScript interfaces that reference this endpoint
     c. Update UserType, UserCardProps, ProfileHeaderProps, NavUserProps...
     d. Run TypeScript to see compilation errors
     e. Fix all usage sites
  
  What ACTUALLY happens:
     Frontend still references user.firstName → undefined at runtime
     TypeScript shows NO error because frontend type file is stale
     Bug surfaces only in manual testing or worse — in production
     "It was working on my machine" — backend and frontend were in sync only in dev

GRAPHQL WORKFLOW — eliminates drift but adds ceremony:
  1. Update GraphQL schema (.graphql file or SDL string)
  2. Run code-gen: npx graphql-codegen  ← manual step, often forgotten
  3. Generated types now match schema
  4. Frontend compilation catches stale usage
  Better than REST, but: schema file language, codegen step, resolver boilerplate

tRPC WORKFLOW — zero drift, zero ceremony:
  1. Backend developer changes procedure output type
  2. Frontend TypeScript compilation IMMEDIATELY fails at every callsite
     — because the frontend imports router TYPE (not runtime code)
  3. No codegen, no schema file, no communication required
  Refactoring is safe — TypeScript is the contract
```

---

## 3. How It Works Internally

### Architecture — Server to Client Type Flow

```
                    ┌─────────────────────────────────┐
 Server (Node.js)   │  appRouter = router({           │
                    │    getUser: publicProcedure      │
                    │      .input(z.object({           │
                    │        userId: z.string()        │
                    │      }))                        │
                    │      .query(({ input }) => {    │
                    │        return db.users.findById(│
                    │          input.userId            │
                    │        )                        │
                    │      })                         │
                    │  })                             │
                    │                                 │
                    │  export type AppRouter =        │
                    │    typeof appRouter             │
                    └────────────┬────────────────────┘
                                 │
                      TYPE ONLY — not runtime code
                      (TypeScript import type)
                                 │
                    ┌────────────▼────────────────────┐
 Client (Browser)   │  import type { AppRouter }      │
                    │    from '../../server/router'   │
                    │                                 │
                    │  const trpc = createTRPCClient   │
                    │    <AppRouter>(...)             │
                    │                                 │
                    │  // TypeScript KNOWS the return │
                    │  // type of getUser at compile  │
                    │  const user = await             │
                    │    trpc.getUser.query({         │
                    │      userId: 'u-123'            │
                    │    })                           │
                    │  // user.fullName — TypeScript  │
                    │  // autocomplete ✅             │
                    │  // user.firstName — TS error ✅│
                    └─────────────────────────────────┘

Wire protocol: HTTP POST under the hood
  Request: POST /api/trpc/getUser
  Body: { "json": { "userId": "u-123" } }
  Response: { "result": { "data": { "json": { ... } } } }
  
  This is an implementation detail — the developer never writes this.
  The tRPC client and server handle the HTTP layer transparently.
```

### Key Concepts

```
CONCEPT           DESCRIPTION
────────────────────────────────────────────────────────────────────
Router            Top-level container. Composed of procedures.
                  appRouter = router({ getUser: ..., createOrder: ...})

Procedure         A single callable function. Two types:
                  .query()   — read operation (GET semantics)
                  .mutation() — write operation (POST/PUT/DELETE semantics)

Input validation  Zod schema. Validates at runtime AND types at compile time.
                  .input(z.object({ page: z.number().min(1) }))

Context           Shared state per request — database connection, auth user, etc.
                  createContext({ req }) → { user: JWT } → available in procedures

Middleware        Applied before procedure. Check auth, log, rate limit.
                  const protectedProcedure = publicProcedure
                    .use(({ ctx, next }) => {
                      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
                      return next({ ctx: { ...ctx, user: ctx.user } })
                    })

Subscription      Real-time updates via SSE or WebSocket.
                  .subscription() — returns an observable of events
```

---

## 4. The Code

### ❌ Wrong Way — Manual REST with Stale Types

```typescript
// ❌ WRONG PATTERN: REST endpoint with manually maintained types
// This is NOT wrong in general — REST is perfectly valid. 
// Wrong here = the specific problem tRPC solves: type drift

// Backend (Node.js/Express or Next.js API route):
export default function handler(req, res) {
  // Returns: { userId, fullName, email } — dev renamed the field today
  const user = await getUserFromDb(req.query.userId);
  res.json(user);
}

// Frontend TypeScript interface — still has old field names:
interface User {
  userId: string;
  firstName: string;  // ← STALE — backend now returns fullName
  lastName: string;   // ← STALE
  email: string;
}

// Frontend fetch:
const response = await fetch(`/api/users/${userId}`);
const user: User = await response.json();

// ❌ user.firstName is undefined at runtime
// ❌ TypeScript shows NO error — the type file is stale
// ❌ Bug only found in manual testing or production
console.log(user.firstName);  // undefined — silent bug
```

---

### ✅ Right Way — tRPC: Type Drift Is Impossible

```typescript
// Server — Next.js App Router file: app/api/trpc/[trpc]/route.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.context<Context>().create();
const router = t.router;
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(authMiddleware);

export const appRouter = router({
  // ✅ Query procedure: fetching data
  getUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))  // Zod validates + types input
    .query(async ({ input, ctx }) => {
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: input.userId }
      });
      return {
        userId: user.id,
        fullName: `${user.firstName} ${user.lastName}`,  // Renamed field
        email: user.email
      };
    }),

  // ✅ Mutation procedure: writing data
  updateProfile: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      bio: z.string().max(500).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const updated = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { email: input.email, bio: input.bio }
      });
      return { success: true, userId: updated.id };
    }),
});

export type AppRouter = typeof appRouter;  // ← Only this type is exported to client
```

```typescript
// Client — React component
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server/router';  // ← TYPE IMPORT ONLY — no runtime coupling

const trpc = createTRPCReact<AppRouter>();

const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  // ✅ Type inferred: { userId: string; fullName: string; email: string }
  const { data: user, isLoading } = trpc.getUser.useQuery({ userId });

  if (isLoading) return <Spinner />;

  return (
    <div>
      {/* ✅ user.fullName — TypeScript autocomplete works, type is correct */}
      <h1>{user?.fullName}</h1>
      {/*
        If server changes fullName to displayName:
        ❌ TypeScript ERROR here immediately — user.fullName does not exist
        Caught at COMPILE TIME, not at runtime, not in production
      */}
      <p>{user?.email}</p>
    </div>
  );
};
```

---

## 5. Interview Questions & Model Answers

### Q1 — Key Benefit
**Interviewer asks:** "What problem does tRPC solve and what is its main limitation?"

**Hruday's answer:**
> The problem it solves is type drift between backend and frontend in TypeScript full-stack applications. With REST, you manually maintain TypeScript interfaces on the frontend that mirror your backend response shapes. When the backend changes, the frontend types go stale silently — TypeScript doesn't catch it because it can't see through the HTTP boundary. With GraphQL you use codegen to bridge the gap, but that requires maintaining a schema language and running a codegen step.
>
> tRPC eliminates the gap entirely by importing the server router's **type** (not runtime code) into the client. TypeScript resolves the types across the boundary at compile time. If the server changes a return type, the frontend TypeScript compilation fails immediately — the mismatch is caught before the build, not in production.
>
> The main limitation: it only works when both client and server are TypeScript. The moment you have a consumer that is not TypeScript — a mobile app, a Python service, a third-party developer, a public API — tRPC types mean nothing to them. There's no language-agnostic schema (no OpenAPI spec, no `.proto` file). For any API that needs to be consumed outside the TypeScript monorepo, REST with OpenAPI or gRPC with Protobuf is the correct choice. tRPC is purpose-built for TypeScript-only monorepos.

---

### Q2 — When to Use
**Interviewer asks:** "Would you use tRPC for a public payment API like Razorpay's?"

**Hruday's answer:**
> No. tRPC is fundamentally not suited for public APIs. Razorpay's API is consumed by developers across every language and framework — Java merchants, Python backends, PHP e-commerce, Ruby on Rails stores. The tRPC type system is TypeScript-only. A Java service calling a tRPC endpoint would get no typing benefits, no generated SDK, no documentation schema.
>
> For a public payment API: REST with OpenAPI spec is the correct choice. The OpenAPI spec is language-neutral — you can generate SDKs for Python, Java, Go, Ruby from it. Razorpay, Stripe, and PhonePe all use REST with thorough OpenAPI documentation because that serves the broadest set of consumers.
>
> tRPC's ideal case: a Next.js full-stack application where the frontend and backend are both TypeScript in the same monorepo, the API is internal (not public), and the team wants maximum type safety with minimum ceremony. Next.js + Prisma + tRPC is a common stack for internal tools, SaaS dashboards, and admin panels built in TypeScript.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "tRPC is a different protocol" | "tRPC uses its own protocol — it's not REST" | "tRPC is HTTP under the hood. `.query()` procedures use HTTP GET. `.mutation()` procedures use HTTP POST. tRPC is a TypeScript-level abstraction over HTTP, not a new transport protocol. You can inspect tRPC traffic in DevTools and see ordinary HTTP requests. The trpc-openapi package can even generate OpenAPI documentation from a tRPC router. The 'RP' in tRPC stands for Remote Procedure Call — the abstraction style, not the protocol." |
| "tRPC replaces REST in microservices" | "I'd use tRPC for microservice communication" | "tRPC is not suitable for polyglot microservices. Microservice architectures typically have services in different languages — Java, Go, Python, Node.js. tRPC requires both sides to be TypeScript. For service-to-service communication in a polyglot architecture: gRPC with Protobuf is the right choice — language-neutral interface definition, code generation for every language, HTTP/2 performance. tRPC is a tool for TypeScript monorepos, not cross-language infrastructure." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, our primary stack is Java on the backend and React/TypeScript on the frontend — tRPC doesn't apply there since tRPC requires a TypeScript backend. However, I've explored it for internal tooling with Next.js full-stack projects. The key insight: tRPC's value is proportional to how much type drift pain you've experienced. After maintaining REST API type interfaces manually across frontend (TypeScript) and backend (Node.js TypeScript) and having the stale-interface bug hit production twice, the appeal of tRPC is very clear. It's a tool I'd choose immediately for any greenfield Next.js full-stack project where the API is not public."

---

## 8. Scale Evolution

**Monorepo small team →** tRPC + Next.js API routes. All procedures in one `appRouter`. Zod for all inputs. React Query integration for caching and loading states. Ideal: internal tools, admin dashboards, SaaS startup.

**Growing team →** Modular routers (split by domain: `userRouter`, `orderRouter`, `productRouter`). Merged with `mergeRouters`. Context carries database client + auth user. Middleware shared across protected procedures.

**Limitation hit →** When a mobile app team (React Native with separate API client, or iOS Swift/Android Kotlin) needs to consume the same backend: add a REST or GraphQL layer. tRPC types don't cross language boundaries. The typical evolution: tRPC internally + auto-generated OpenAPI spec via trpc-openapi for external/mobile consumers.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Public payment APIs cannot use tRPC — REST with OpenAPI is the answer. But internal developer tools (merchant dashboard BFF) could leverage tRPC. The question tests knowing where tRPC applies and where it doesn't. | "Would you build Razorpay's public payment API with tRPC?" — expected answer: No. |
| Swiggy / Meesho | Internal operational dashboards (restaurant partner panel, delivery management) are potential tRPC use cases — TypeScript full-stack with Next.js. Not for consumer-facing APIs consumed by native mobile apps. | "Where would you use tRPC in Swiggy's architecture vs where would you not?" |
| Adobe / Microsoft | Developer tools and internal admin tooling at these companies often follows Next.js/TypeScript patterns where tRPC is a good fit. Customer-facing APIs: REST or gRPC. | "How do you ensure type safety across your full-stack TypeScript application?" |
| SAP Labs (current) | Java + Spring Boot backend — tRPC does not apply to the main stack. However, Next.js-based internal tooling or standalone TypeScript services are valid use cases. Awareness of the tool is expected at senior level. | "What is tRPC and how does it differ from GraphQL for type-safe APIs?" |

---

## 10. Related Topics — What to Study Next

- **Topic 130 — GraphQL vs REST** — the architectural alternatives that tRPC competes with for type-safe API patterns; understanding when to choose REST, GraphQL, or tRPC requires comparing all three; GraphQL has broader language coverage than tRPC but adds schema management overhead
- **Topic 131 — gRPC — Protocol Buffers, Streaming** — the polyglot type-safe API solution; when tRPC cannot be used (cross-language services, mobile apps), gRPC fills the same role with Protobuf schemas that compile to strongly-typed code in any language
- **Topic 125 — REST Principles** — the underlying HTTP semantics that tRPC builds on; tRPC `.query()` is GET semantics, `.mutation()` is POST/PUT/DELETE semantics; REST knowledge underpins understanding how tRPC behaves at the wire level
- **Topic 202 — SPA vs SSR** — tRPC's native environment is Next.js; understanding Next.js App Router and Server Components clarifies how tRPC procedures integrate: server components can call tRPC procedures directly without an HTTP round trip, while client components use React Query hooks

---

*Part 7 · tRPC — Type-Safe APIs (Awareness Level) · Full Stack Interview Guide · Hruday D · 2026*
