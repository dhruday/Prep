# 80. tRPC & Type-Safe APIs

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**tRPC** (TypeScript Remote Procedure Call) is a framework for building fully type-safe API layers without code generation, schema files, or a build step. When your frontend and backend are both TypeScript in the same monorepo, tRPC allows the client to call server functions with full type inference — argument types, return types, and error types are all inferred directly from the server function definition. Change a server function's return type and the TypeScript compiler immediately flags every frontend call that's broken. This eliminates an entire category of runtime type mismatch bugs that teams using REST or even GraphQL still encounter. It's the most compelling choice for full-stack TypeScript teams building Next.js applications or similar monorepo setups.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Architecture & Component Boundaries

```
Frontend (React/Next.js)
     ↓ (tRPC client — fully typed)
     │  trpc.products.getAll.useQuery({ category: 'electronics' })
     │  TypeScript knows: returns Promise<Product[]>
     │  TypeScript knows: requires { category: string }
     ↓
tRPC Router (server — type source of truth)
     ↓ (Zod validation, auth middleware)
Business Logic + Database
```

**The Key Insight — Types Flow Without Generation:**
```typescript
// server/routers/products.ts
export const productRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(async ({ input }) => {
      // TypeScript: input.category is string | undefined
      return db.products.findMany({ where: { category: input.category } });
      // Return type: Product[] — automatically inferred by TypeScript
    }),
});

// client — NO CODE GENERATION NEEDED
// TypeScript already knows:
//   - Input: { category?: string }
//   - Output: Awaited<ReturnType<typeof productRouter.getAll>>
const { data } = trpc.products.getAll.useQuery({ category: 'electronics' });
// data: Product[] | undefined — TypeScript knows this!
```

### Data Flow & State Flow

**tRPC with React Query Under the Hood:**
```typescript
// tRPC wraps React Query — all React Query patterns apply

// Query (GET data)
const { data, isLoading, error } = trpc.products.getAll.useQuery(
  { category: 'electronics' },
  {
    staleTime: 5 * 60 * 1000,    // All React Query options available
    enabled: !!category,
  }
);

// Mutation (POST/PUT/DELETE)
const createProduct = trpc.products.create.useMutation({
  onSuccess: () => {
    // Invalidate products list cache
    utils.products.getAll.invalidate();
  },
  onError: (err) => {
    // err is TRPCClientError with typed data
    toast.error(err.message);
  },
});

// Infinite Query (pagination)
const { data, fetchNextPage } = trpc.products.getInfinite.useInfiniteQuery(
  { limit: 20 },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }
);
```

### Type Safety Deep Dive

**Input Validation with Zod:**
```typescript
// Zod schema validates at runtime AND provides TypeScript types
const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'food']),
  tags: z.array(z.string()).optional(),
});

// TypeScript type is automatically derived from Zod schema:
type CreateProductInput = z.infer<typeof createProductSchema>;
// = { name: string, price: number, category: 'electronics' | 'clothing' | 'food', tags?: string[] }

const productRouter = createTRPCRouter({
  create: protectedProcedure    // Requires auth
    .input(createProductSchema)  // Runtime validation + TypeScript types
    .mutation(async ({ ctx, input }) => {
      // input is: CreateProductInput — fully typed
      // ctx.user is available because of protectedProcedure
      return ctx.db.products.create({
        data: { ...input, createdBy: ctx.user.id },
      });
    }),
});
```

**Nested Routers (Large App Organization):**
```typescript
// server/root.ts
export const appRouter = createTRPCRouter({
  products: productRouter,
  users: userRouter,
  orders: orderRouter,
  admin: adminRouter,  // Can have additional auth middleware
});

export type AppRouter = typeof appRouter; // THE KEY EXPORT

// client setup — types flow from server to client
const trpc = createTRPCReact<AppRouter>();
// Now all routers are fully typed on the client automatically
```

### Middleware & Authorization

```typescript
// Middleware runs before procedures — auth, logging, validation
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user, // TypeScript narrowing — user is now non-null
    },
  });
});

const protectedProcedure = t.procedure.use(isAuthenticated);

const isAdmin = isAuthenticated.unstable_pipe(({ ctx, next }) => {
  if (ctx.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

const adminProcedure = t.procedure.use(isAdmin);
```

### Performance Implications

**Comparison with REST/GraphQL:**
```
REST API with TypeScript:
  1. Backend team changes response shape
  2. Frontend TypeScript still compiles (types not linked)
  3. Runtime error at 2am in production
  4. Customer reports bug → fix → deploy → 2-hour cycle

tRPC:
  1. Backend dev changes response shape
  2. Frontend TypeScript immediately fails to compile
  3. Build pipeline catches it before merge
  4. Zero runtime surprises from API contract changes
```

**No Schema/Build Step Overhead:**
```
GraphQL workflow:
  1. Backend updates GraphQL schema
  2. Run: npx graphql-codegen  (15-30s CI step)
  3. Review generated types
  4. Commit type files

tRPC workflow:
  1. Backend updates procedure
  2. Client types update automatically via TypeScript inference
  3. Done — no generation step
```

**Serialization Performance:**
- tRPC uses `superjson` by default (handles Date, Map, Set, BigInt natively)
- REST requires manual date parsing; GraphQL uses custom scalars
- No serialization mismatches (Date sent from server → arrives as Date on client, not string)

### Scalability Considerations

**When tRPC Scales Well:**
- Full-stack TypeScript monorepo (Next.js App Router, T3 stack)
- Single team or small org owning both frontend and backend  
- Internal tools, dashboards, admin panels

**When tRPC Doesn't Scale:**
- Mobile apps consuming the same API (iOS/Android need REST/GraphQL)
- External API consumers (third parties need a stable REST/GraphQL contract)
- Microservices with different languages (tRPC is TypeScript-only)
- Large organizations where frontend and backend are separate teams/repos

**The Hybrid Pattern (Real Production Decision):**
```
Public API: REST or GraphQL (language-agnostic, contractual)
Internal dashboard: tRPC (developer velocity wins)
Mobile app: REST (consumed by iOS/Android teams)
```

### Anti-Patterns & Pitfalls

**1. Using tRPC for public APIs:**
```typescript
// ❌ External developers cannot use tRPC clients
// Their iOS app can't use your TypeScript-only client
// ✅ Use REST or GraphQL for external consumption
```

**2. Ignoring error codes:**
```typescript
// ❌ Generic error handling loses type information
trpc.products.create.useMutation({
  onError: (err) => toast.error('Something went wrong'),
});

// ✅ Use TRPCError codes for specific handling
trpc.products.create.useMutation({
  onError: (err) => {
    if (err.data?.code === 'CONFLICT') {
      toast.error('Product name already exists');
    } else if (err.data?.code === 'UNAUTHORIZED') {
      router.push('/login');
    } else {
      toast.error(err.message);
    }
  },
});
```

**3. Forgetting to protect mutations:**
```typescript
// ❌ Public procedure for state-changing operations
create: publicProcedure.mutation(...)  // Anyone can call this!

// ✅ Always protect mutations
create: protectedProcedure.mutation(...) // Auth required
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**T3 Stack (Most Popular Next.js Starter):**  
`create-t3-app` bundles Next.js + tRPC + Prisma + NextAuth + TailwindCSS  
Used by thousands of production applications for internal tools and SaaS products

**Vercel Internal Tools:**  
Vercel uses tRPC patterns internally for their dashboard backend connections  
End-to-end type safety critical when shipping features fast at a platform company

**Your Context (Angular/SAP to tRPC):**
- Angular HttpClient with typed interfaces is the closest parallel: you manually maintain types
- tRPC eliminates the maintenance — types inferred directly from server
- If you joined a Next.js team at Microsoft using T3 stack, tRPC would be the data layer

**Growth Path (1K → 10M users):**
- **1K**: tRPC perfect — single team, fast iteration
- **100K**: Still tRPC, add caching layers (Redis), rate limiting in middleware
- **10M**: Introduce BFF (Backend for Frontend) pattern; tRPC routes to cached service layer; consider GraphQL for mobile clients

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "tRPC is a type-safe RPC framework for TypeScript full-stack applications that eliminates the need for code generation or schema files. The key insight is: when your frontend and backend share TypeScript types in a monorepo, you don't need a separate schema — TypeScript inference is the schema. Change a server function's return type and TypeScript flags every broken client call at compile time, before deployment.
>
> It's built on top of React Query, so all the caching, deduplication, and background refetch patterns I'd use with regular React Query apply. The procedural abstraction means I write server logic as functions rather than HTTP endpoints, and the client calls them as if they're local async functions.
>
> I'd choose tRPC for internal dashboards, admin tools, or full-stack Next.js apps where one team controls frontend and backend. I'd choose REST or GraphQL when external consumers exist, when multiple client platforms need the same API, or when teams are organizationally separated. The wrong choice is using tRPC for a public API that iOS apps need to consume — they can't use TypeScript inference."

**Likely Follow-up Questions:**
- "How does tRPC compare to GraphQL?" → No code generation, simpler setup, TypeScript-only vs language-agnostic; GraphQL wins for external APIs and multiple consumers
- "How do you handle file uploads with tRPC?" → tRPC doesn't handle multipart — use a separate REST endpoint or presigned S3 URLs alongside tRPC
- "How does tRPC handle subscriptions?" → WebSocket transport with `observable` return type; same pattern as GraphQL subscriptions but fully typed
- "What's the overhead of Zod validation on every request?" → Negligible (~1ms for simple schemas); the runtime safety is worth it

**Comparison With Alternatives:**

| | tRPC | REST + OpenAPI | GraphQL |
|---|---|---|---|
| Type safety | Automatic (TS inference) | Code generation | Code generation |
| Language support | TypeScript only | Any | Any |
| External API | ❌ Hard | ✅ Standard | ✅ Standard |
| Setup complexity | Low | High | High |
| Bundle size | Small | Minimal | Large (Apollo) |
| Learning curve | Low | Low | High |

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

**Full tRPC Setup (Next.js App Router):**

```typescript
// server/trpc.ts — Core setup
import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { getServerAuthSession } from './auth';
import superjson from 'superjson';
import { ZodError } from 'zod';

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const session = await getServerAuthSession({ req: opts.req, res: opts.res });
  return { session, db: prisma };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,  // Handles Date, Map, Set natively
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

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});

export const protectedProcedure = t.procedure.use(enforceAuthenticated);

// server/routers/products.ts
const createProductInput = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  categoryId: z.string().cuid(),
});

export const productRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.product.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: input.category ? { categoryId: input.category } : undefined,
        orderBy: { createdAt: 'desc' },
      });
      
      const nextCursor = items.length > input.limit
        ? items.pop()!.id
        : undefined;
      
      return { items, nextCursor };
    }),
  
  create: protectedProcedure
    .input(createProductInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.product.create({
        data: { ...input, createdById: ctx.user.id },
      });
    }),
});

// app/products/page.tsx (Next.js App Router)
'use client';

export function ProductList() {
  const { data, fetchNextPage, hasNextPage } = 
    trpc.products.getAll.useInfiniteQuery(
      { limit: 20 },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );
  
  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => utils.products.getAll.invalidate(),
  });
  
  // TypeScript knows data.pages[0].items[0] is Product
  return (
    <>
      {data?.pages.flatMap(p => p.items).map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>Load More</button>
      )}
    </>
  );
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**tRPC = TypeScript as the Schema**  
- No generation, no schema files — TypeScript IS the contract  
- Built on React Query — all caching/mutation patterns apply  
- Zod = runtime validation + TypeScript types from one definition  
- Use when: monorepo, same team, TypeScript everywhere  
- Don't use when: external consumers, mobile clients, multi-language

If you blank: *"tRPC gives end-to-end type safety without code generation — the server function's TypeScript types are automatically available on the client."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **DX**: Eliminates runtime type mismatches — change propagates immediately at compile time  
→ **Performance**: No build step overhead; React Query caching included; superjson handles native types  
→ **Business**: Faster feature shipping when frontend and backend developers are the same people or same team

**How it works:**
→ Server functions are defined as tRPC procedures with Zod input validation. TypeScript infers return types. The `AppRouter` type is exported and imported by the client, which wraps React Query with fully-typed versions of each procedure. No runtime schema parsing — type information only exists at compile time.

**Company relevance:**
→ **Microsoft**: T3 stack is extremely popular in the Microsoft web ecosystem; Azure Web Apps teams use it  
→ **Adobe**: Spectrum design system internal tools use full-stack TypeScript patterns  
→ **Salesforce**: Primarily REST/API-first; tRPC less relevant but the type-safety philosophy applies  
→ **Cisco**: Developer tooling teams would recognize the value for internal dashboards
