# 100. The `use()` Hook — Reading Promises and Context
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

`use()` is a React 19 API that reads resources inside components. It has two uses: reading a Promise (integrating with Suspense without a library wrapper) and reading Context (as an alternative to `useContext` that can be called conditionally). Unlike other hooks, `use()` can be called inside loops and conditionals — it is NOT subject to the rules-of-hooks ordering constraint. When called with a Promise, `use()` throws internally if the Promise is pending (triggering the nearest Suspense boundary), returns the resolved value when ready, and re-throws errors for the nearest ErrorBoundary. When called with a Context, it works identically to `useContext` but with the added flexibility of conditional invocation. It simplifies the Suspense data-fetching pattern significantly — you can pass a Promise as a prop to a client component and read it directly with `use()`.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### `use()` with Promises — The Suspense Integration

**Before `use()` (React 18):** needed a wrapper/cache (like React Query or a custom resource factory) to use Suspense with data fetching.

**With `use()` (React 19):** pass a Promise directly — `use()` handles the Suspense protocol internally.

```typescript
// React 19 pattern: pass Promise as prop, read with use()
import { use, Suspense } from 'react';

// Server Component — starts the fetch, passes Promise to client
async function ServerPage() {
  // Promise is created here (fetch starts immediately)
  const userPromise: Promise<User> = fetch('/api/user/123').then(r => r.json());

  return (
    <Suspense fallback={<UserSkeleton />}>
      <ClientUserCard userPromise={userPromise} />
    </Suspense>
  );
}

// Client Component — reads the Promise with use()
'use client';

interface Props { userPromise: Promise<User> }

function ClientUserCard({ userPromise }: Props) {
  const user = use(userPromise);
  // If promise is pending → throws → Suspense shows fallback
  // If promise resolved → returns the User value
  // If promise rejected → throws error → ErrorBoundary catches it

  // Guaranteed: if we reach here, user is always a User object — no undefined check needed
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

### `use()` with Context — Conditional Reading

Traditional `useContext` cannot be called conditionally due to rules-of-hooks. `use()` for Context lifts this restriction:

```typescript
import { use, createContext } from 'react';

const ThemeContext = createContext<'light' | 'dark'>('light');
const AdminContext = createContext<AdminConfig | null>(null);

// ✅ use() can be called inside conditions
function AdaptiveComponent({ isAdmin }: { isAdmin: boolean }) {
  const theme = use(ThemeContext);   // always read theme

  // ✅ Conditional context reading — NOT possible with useContext
  let adminConfig = null;
  if (isAdmin) {
    adminConfig = use(AdminContext);  // only read admin context if user is admin
  }

  // ✅ use() inside loops
  const contexts = [ThemeContext, AdminContext];
  // (contrived example — but structurally valid with use())

  return (
    <div className={`theme-${theme}`}>
      {adminConfig && <AdminPanel config={adminConfig} />}
    </div>
  );
}

// ✅ use() inside early returns (after use() itself)
function Feature({ user }: { user: User }) {
  const features = use(FeatureFlagsContext);

  if (!features.newDashboard) {
    return null;   // early return after use() — valid with use()
  }
  // Note: hooks must not be called AFTER an early return — use() is exempt
  return <NewDashboard user={user} />;
}
```

### The Critical Difference: Rules-of-Hooks Do Not Apply

```typescript
// ❌ useContext — cannot call conditionally
function BadComponent({ show }: { show: boolean }) {
  if (show) {
    const ctx = useContext(ThemeContext);  // ESLint ERROR: conditional hook call
  }
}

// ✅ use() — valid conditional call
function GoodComponent({ show }: { show: boolean }) {
  if (show) {
    const ctx = use(ThemeContext);        // valid — use() is exempt from rules-of-hooks
  }
}

// Why? useContext relies on hook call ORDER to associate state with component instances.
// use() reads a fixed context object reference — ordering doesn't matter because
// the context object itself identifies what to read, not the call position.
```

### Combining `use()` with Server Components (React 19 RSC Pattern)

```typescript
// app/product/[id]/page.tsx — Server Component
// Passes Promises to client; client reads them with use() + Suspense
export default function ProductPage({ params }: { params: { id: string } }) {
  // Start BOTH fetches in parallel — "render-as-you-fetch"
  const productPromise: Promise<Product> = fetchProduct(params.id);
  const reviewsPromise: Promise<Review[]> = fetchReviews(params.id);

  return (
    <div>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetail productPromise={productPromise} />
      </Suspense>
      <Suspense fallback={<ReviewsSkeleton />}>
        <ReviewsList reviewsPromise={reviewsPromise} />
      </Suspense>
    </div>
  );
  // Both fetches run in parallel
  // Each section renders independently as its Promise resolves
}

// app/product/[id]/ProductDetail.tsx — Client Component
'use client';
import { use } from 'react';

function ProductDetail({ productPromise }: { productPromise: Promise<Product> }) {
  const product = use(productPromise);   // Suspense-integrated read
  return <div>{product.title} — ${product.price}</div>;
}

function ReviewsList({ reviewsPromise }: { reviewsPromise: Promise<Review[]> }) {
  const reviews = use(reviewsPromise);   // Suspense-integrated read
  return <ul>{reviews.map(r => <li key={r.id}>{r.content}</li>)}</ul>;
}
```

### Caching Behavior with `use()` — Important Nuance

```typescript
// Each render of the component that passes the Promise creates a NEW Promise if not memoized
// This causes re-suspension (goes back to loading state) on every re-render

// ❌ Anti-pattern: creating new Promise on each render
function ParentComponent({ userId }: { userId: string }) {
  // New Promise created every render → use() re-suspends every render!
  const promise = fetch(`/api/user/${userId}`).then(r => r.json());

  return <UserCard userPromise={promise} />;
}

// ✅ In Server Components: created once per request — no re-render issue
// ✅ In Client Components: use a stable source (React cache, React Query, or useMemo)
function ParentComponent({ userId }: { userId: string }) {
  // Memoize the Promise so it's only created once per userId
  const promise = useMemo(
    () => fetch(`/api/user/${userId}`).then(r => r.json()),
    [userId]
  );
  return (
    <Suspense fallback={<UserSkeleton />}>
      <UserCard userPromise={promise} />
    </Suspense>
  );
}
```

### `React.cache` — Deduplication for Server Components

```typescript
// react.cache wraps functions so identical calls share the same Promise
import { cache } from 'react';

const getUser = cache(async (userId: string): Promise<User> => {
  return db.user.findUniqueOrThrow({ where: { id: userId } });
});

// Multiple server components fetching the same user get the SAME Promise
// (deduplication within a single request/render)
async function Header() {
  const user = await getUser('123');    // DB query
  return <UserAvatar user={user} />;
}

async function Sidebar() {
  const user = await getUser('123');    // Same DB query → cache hit → same Promise
  return <UserName user={user} />;
}
// Without react.cache: two DB round-trips. With cache: one DB round-trip.
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, upgrading to React 19 would allow removing custom Suspense resource wrappers. The `createSuspenseResource` utility (hand-rolled cache pattern) gets replaced entirely by `use()` — pass the fetch Promise directly to components. Additionally, `use()` with Context enables conditional feature checks: `if (isAdmin) { const config = use(AdminContext); }` — previously required hoisting the `useContext` call outside the condition.

**At FAANG scale:**
- **Microsoft:** Internal tool framework upgraded to React 19; `use()` with Promises enables clean isomorphic data loading — server fetches start server-side, client components read with `use()` without extra library wiring
- **Adobe:** Firefly client components read generation Promises with `use()` — the AI generation is started early (in an action or server component), and the display component reads the result reactively without polling
- **Salesforce:** CRM record pages pass pre-fetched record Promises from server to client; `use()` reads them without needing React Query wrappers for simple cases
- **Cisco:** Configuration forms conditionally read context with `use(AdminContext)` based on user role — cleaner than the previous pattern of reading context then conditionally using the value

---

## 💬 4. Interview Execution

### Sample Answer

> "`use()` is React 19's unified read primitive. For Promises: it integrates directly with Suspense — calling `use(promise)` throws if the Promise is pending (triggering the fallback) and returns the resolved value when ready. This replaces the hand-rolled resource wrapper pattern for Suspense.
>
> For Context: `use(context)` works like `useContext` but can be called inside conditionals and loops — it's explicitly exempt from the rules-of-hooks ordering constraint, because the context object reference itself identifies what to read, rather than the call position.
>
> The most important nuance for `use()` with Promises: the Promise must be stable. Passing a newly created `fetch()` call as a prop on every render re-suspends the component on every render. In Server Components this isn't a problem (one render per request). In Client Components, you need to memoize the Promise with `useMemo` or use a caching layer like `react/cache` or React Query.
>
> This simplifies the render-as-you-fetch pattern significantly: the server component starts both fetches, passes the Promises as props, and each client component reads its Promise independently via `use()`, with each having its own Suspense boundary."

### Likely Follow-ups

1. **What's the difference between `use()` and `await` in a Server Component?** → In a Server Component, `await` pauses the entire server component's rendering until the Promise resolves — sequential. `use()` is for client components — it integrates with Suspense to enable concurrent, independent data loading. Server components use `await` directly (they're async); client components use `use()`.
2. **Can `use()` replace `useContext` entirely?** → Functionally yes for context reads. The difference is that `useContext` is subject to rules-of-hooks (cannot be conditional), while `use(Context)` can be conditional. In practice, both React team and the community expect `use()` to eventually replace `useContext` for most use cases. TypeScript type signatures differ slightly — `useContext` infers context type directly, `use()` might need an explicit type annotation in some cases.
3. **What happens if a Promise passed to `use()` never resolves?** → The component permanently shows the Suspense fallback. This reinforces the importance of always setting timeouts or cancellation mechanisms on Promises used with `use()`. A Promise with a timeout is critical: `Promise.race([fetchData(), timeout(5000).then(() => { throw new Error('timeout') })])`.
4. **Is `use()` available in React 18?** → No — `use()` is React 19. React 18 had `use()` available as an experimental "canary" feature in some Next.js versions, but it's officially stable in React 19. The underlying Suspense protocol (throw a Promise) has been in React since React 16.6 — `use()` simply provides a built-in API for it rather than requiring library authors to implement the protocol themselves.

---

## 💻 5. Code Example

```typescript
import { use, createContext, Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// ========================
// use() with Context — conditional reading
// ========================
interface UserPreferences {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
}

interface AdminConfig {
  showDevTools: boolean;
  debugMode: boolean;
}

const PreferencesContext = createContext<UserPreferences>({
  theme: 'light',
  notificationsEnabled: true,
});
const AdminContext = createContext<AdminConfig | null>(null);

function UserPanel({ role }: { role: 'user' | 'admin' }) {
  // Always read preferences
  const prefs = use(PreferencesContext);

  // Conditionally read admin config — valid with use()
  let adminConfig: AdminConfig | null = null;
  if (role === 'admin') {
    adminConfig = use(AdminContext);
  }

  return (
    <div className={`panel theme-${prefs.theme}`}>
      {prefs.notificationsEnabled && <NotificationBell />}
      {adminConfig?.showDevTools && <DevTools debug={adminConfig.debugMode} />}
    </div>
  );
}

// ========================
// use() with Promise — parallel data loading
// ========================
interface Product { id: string; title: string; price: number; }
interface Review { id: string; rating: number; content: string; }

// Simulated fetchers
const fetchProduct = (id: string): Promise<Product> =>
  fetch(`/api/products/${id}`).then(r => r.json());

const fetchReviews = (id: string): Promise<Review[]> =>
  fetch(`/api/products/${id}/reviews`).then(r => r.json());

// Client components that read Promises with use()
'use client';

function ProductDetail({ productPromise }: { productPromise: Promise<Product> }) {
  const product = use(productPromise);   // Suspense-integrated — no isLoading needed
  return (
    <section>
      <h1>{product.title}</h1>
      <strong>${product.price}</strong>
    </section>
  );
}

function ReviewsList({ reviewsPromise }: { reviewsPromise: Promise<Review[]> }) {
  const reviews = use(reviewsPromise);   // separate Suspense boundary — loads independently
  return (
    <section>
      <h2>Reviews ({reviews.length})</h2>
      {reviews.map(r => (
        <div key={r.id}>
          {'⭐'.repeat(r.rating)} {r.content}
        </div>
      ))}
    </section>
  );
}

// Parent: starts fetches early (render-as-you-fetch), passes to children
function ProductPageClient({ productId }: { productId: string }) {
  // Stable Promises — memoized by productId
  const productPromise = useMemo(() => fetchProduct(productId), [productId]);
  const reviewsPromise = useMemo(() => fetchReviews(productId), [productId]);
  // Both fetches start when this component mounts — in parallel

  return (
    <ErrorBoundary fallback={<div>Failed to load product</div>}>
      <Suspense fallback={<div>Loading product...</div>}>
        <ProductDetail productPromise={productPromise} />
      </Suspense>

      <Suspense fallback={<div>Loading reviews...</div>}>
        <ReviewsList reviewsPromise={reviewsPromise} />
      </Suspense>
    </ErrorBoundary>
  );
  // Product and Reviews sections load independently
  // Reviews don't wait for Product and vice versa
}

// ========================
// react/cache — deduplication (React 19 + Server Components)
// ========================
import { cache } from 'react';

// ✅ Multiple components requesting the same data in one render = one request
const getCachedProduct = cache(async (id: string): Promise<Product> => {
  return fetch(`/api/products/${id}`).then(r => r.json());
});

// Two server components — one request total for id='123'
async function ProductBreadcrumb({ id }: { id: string }) {
  const product = await getCachedProduct(id);      // fetch
  return <nav>Catalog → {product.title}</nav>;
}

async function ProductMeta({ id }: { id: string }) {
  const product = await getCachedProduct(id);      // cache hit — no second fetch
  return <title>{product.title}</title>;
}

// Type helpers
declare function NotificationBell(): JSX.Element;
declare function DevTools({ debug }: { debug: boolean }): JSX.Element;
```

---

## 🧠 6. Memory Aid

**`use()` in one diagram:**
```
use(promise)  → pending  → throws  → Suspense catches → shows fallback
              → resolved → returns value
              → rejected → throws error → ErrorBoundary catches

use(context)  → same as useContext BUT can be conditional/looped
```

**Key fact to remember:** `use()` is NOT subject to rules of hooks — it can be called inside if/else and for loops. This is what makes it fundamentally different from `useContext`.

**Mnemonic:** **CPRS** — **C**onditional reading allowed, **P**romise → Suspense protocol built-in, **R**ules of hooks don't apply, **S**table Promise is required (memoize in Client Components).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Simplification: `use()` removes the need for library-provided Suspense wrappers for common data-fetching patterns — pass a Promise, read it, done
→ Context evolution: `use(context)` with conditional support addresses the most common workaround for `useContext` (hoisting context reads above conditions) — code is clearer
→ React 19 readiness: `use()` is central to React 19's data-fetching story; engineers who understand it are prepared for the current direction of the React ecosystem

**How it works (2 sentences):**
`use(promise)` hooks into React's Suspense mechanism by internally throwing the Promise if it's in a pending state — exactly what library authors implemented manually in React 18 with resource wrappers — abstracting the "throw if pending" protocol into a built-in API.
`use(context)` bypasses the rules-of-hooks call-order tracking because Context is looked up by the identity of the Context object itself (passed as the argument), not by implicit call position — so React can read any Context at any call site without the constraint that prevents `useContext` from being called conditionally.

**Company relevance:**
- Microsoft: React 19 upgrade path for internal tools — `use()` simplifies server-to-client data handoff in App Router
- Adobe: `use()` with Promises in Firefly client components for AI-generated content ready-state consumption
- Salesforce: Cleaner Context conditional reads in large component matrices with role-based UI
- Cisco: `use()` replaces custom Suspense resource factories in network telemetry components

---
✅ Topic 100/486 complete → Continuing to Topic 101: Server Actions — Forms, Mutations, Progressive Enhancement
