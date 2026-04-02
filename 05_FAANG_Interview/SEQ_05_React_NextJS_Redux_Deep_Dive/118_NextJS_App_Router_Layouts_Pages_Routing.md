# 118. Next.js App Router — Layouts, Pages, and Routing
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Next.js App Router (introduced in Next.js 13, stable in 14) uses file-system-based routing where the folder structure under `app/` defines the URL structure. Every folder can have special files: `page.tsx` renders the route's UI, `layout.tsx` wraps that segment and all children (persistent across navigation — no remount), `loading.tsx` wraps the page in Suspense (shows while the page loads), `error.tsx` is an error boundary for that segment, and `not-found.tsx` for 404s. The architectural shift: layouts are React Server Components by default and persist across navigations without re-mounting — a navigation from `/dashboard/settings` to `/dashboard/profile` keeps the `dashboard/layout.tsx` mounted (no re-render), only the page component replaces. This is fundamentally different from the Pages Router where every navigation could cause full page re-renders.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### File System Routing Structure

```
app/
├── layout.tsx           ← Root layout (wraps entire app) — required
├── page.tsx             ← Home route: /
├── loading.tsx          ← Root loading state
├── error.tsx            ← Root error boundary
├── globals.css
│
├── dashboard/
│   ├── layout.tsx       ← Dashboard layout (wraps all /dashboard/* routes)
│   ├── page.tsx         ← /dashboard
│   ├── loading.tsx      ← /dashboard loading state
│   │
│   ├── settings/
│   │   ├── page.tsx     ← /dashboard/settings
│   │   └── loading.tsx
│   │
│   └── profile/
│       └── page.tsx     ← /dashboard/profile
│
├── products/
│   ├── page.tsx         ← /products (product list)
│   └── [id]/
│       ├── page.tsx     ← /products/[id] (dynamic route)
│       └── not-found.tsx
│
└── api/
    └── products/
        └── route.ts     ← API Route: GET/POST /api/products
```

### Layout.tsx — Persistent Shell

```typescript
// app/layout.tsx — Root layout (all pages wrapped in this)
// Must have <html> and <body> tags at root level
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'MyApp', template: '%s | MyApp' },
  description: 'Product catalog and ordering',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GlobalNavBar />         {/* Server Component — persists across all navigations */}
        <main>{children}</main>
        <GlobalFooter />
      </body>
    </html>
  );
}

// app/dashboard/layout.tsx — Dashboard section layout
// This layout PERSISTS when navigating between any /dashboard/* routes
// No remount of Sidebar when navigating dashboard/settings → dashboard/profile
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // This is an RSC — fetch session data server-side
  const session = await getServerSession();
  if (!session) redirect('/login');  // auth guard in layout

  return (
    <div className="dashboard-container">
      <DashboardSidebar userId={session.userId} />  {/* Persists across /dashboard/* */}
      <div className="dashboard-content">{children}</div>
    </div>
  );
}
```

### Nested Layouts and Layout Nesting Rules

```typescript
// Layouts are NESTED:
// /dashboard/settings renders:
// <RootLayout>
//   <DashboardLayout>    ← mounted once, stays mounted
//     <SettingsPage />   ← only THIS changes on navigation
//   </DashboardLayout>
// </RootLayout>

// Navigation from /dashboard/settings → /dashboard/profile:
// ✅ RootLayout: stays mounted
// ✅ DashboardLayout: stays mounted (no refetch, no remount)
// 🔄 SettingsPage → ProfilePage: ONLY the page replaces

// This is the key App Router performance advantage:
// Headers/sidebars/navigation that are in layouts never re-render on navigation
// Pages Router: full leaf component + layout re-render on every navigation
```

### Dynamic Routes

```typescript
// app/products/[id]/page.tsx
// [id] = dynamic segment: /products/p1, /products/p2, etc.

interface ProductPageProps {
  params: { id: string };          // URL segment params
  searchParams: { [key: string]: string | string[] | undefined };  // query string
}

// Server Component by default
export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const product = await fetchProduct(params.id);  // direct DB call in RSC

  if (!product) {
    notFound();  // renders not-found.tsx for this segment
  }

  return <ProductDetail product={product} />;
}

// Static generation: generate pages at build time for known IDs
export async function generateStaticParams() {
  const products = await fetchAllProductIds();
  return products.map(({ id }) => ({ id }));
}
// Generates /products/p1, /products/p2, etc. at build time → static HTML

// app/products/[...slug]/page.tsx — catch-all route
// Matches /products/a/b/c → params.slug = ['a', 'b', 'c']

// app/products/[[...slug]]/page.tsx — optional catch-all
// Matches /products (no slug) AND /products/a/b/c
```

### Loading and Error Files

```typescript
// app/dashboard/loading.tsx
// Automatically wraps the page in Suspense
// Shows while server component data is being fetched
export default function DashboardLoading() {
  return (
    <div className="dashboard-skeleton">
      <div className="skeleton-sidebar" />
      <div className="skeleton-content" />
    </div>
  );
}
// Next.js creates: <Suspense fallback={<DashboardLoading />}><DashboardPage /></Suspense>

// app/dashboard/error.tsx
// Must be a Client Component (uses error boundary lifecycle)
'use client';
import { useEffect } from 'react';

interface ErrorProps { error: Error & { digest?: string }; reset: () => void }
export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
    reportToSentry(error);
  }, [error]);

  return (
    <div>
      <h2>Dashboard failed to load</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
// reset() re-renders the segment — attempts to recover without full page reload
```

### Route Groups — Organize Without Affecting URL

```typescript
// Parentheses = Route Group — folder excluded from URL path
app/
├── (marketing)/         // ← Route Group — NOT in URL
│   ├── layout.tsx       // Marketing layout (hero, nav)
│   ├── page.tsx         // /  (home)
│   └── about/
│       └── page.tsx     // /about
│
├── (app)/               // ← Route Group — NOT in URL
│   ├── layout.tsx       // App layout (sidebar, auth guard)
│   ├── dashboard/
│   │   └── page.tsx     // /dashboard
│   └── settings/
│       └── page.tsx     // /settings
│
└── api/
    └── ...

// ✅ Marketing pages and App pages have different layouts
// ✅ URL stays clean: /dashboard, not /(app)/dashboard
```

### Parallel Routes and Intercepting Routes (Advanced)

```typescript
// @slot conventions: render multiple pages simultaneously in the same layout
// app/dashboard/
//   layout.tsx — accepts slots as props
//   @analytics/page.tsx  — /dashboard renders both main + analytics panel
//   page.tsx

// layout.tsx with parallel routes:
export default function DashboardLayout({
  children,
  analytics,      // @analytics slot
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <div>
      {children}          {/* Main dashboard content */}
      <aside>{analytics}</aside>  {/* Analytics panel alongside */}
    </div>
  );
}
// Both render simultaneously — independent loading + error states

// Intercepting routes: show modal overlay instead of navigating
// app/products/
//   (.)photo/[id]/page.tsx  — intercept /photo/[id] when navigating from products
//   photo/[id]/page.tsx     — full page on direct URL visit
// Use case: Instagram-style photo modal (click = modal, direct URL = full page)
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
SAP Fiori design system migration to Next.js App Router: the main navigation shell (global header + app switcher) is in the root layout as an RSC — it renders once at build and is never re-rendered on client navigations. Individual app sections (Purchase Orders, Supplier Portal, Finance) each have their own layout files with specific sidebar configurations. Before App Router, every navigation triggered full re-renders of the header+sidebar. After: navigating within the Purchase Orders module only re-renders the page content — measured 40% reduction in navigation time via Lighthouse.

**At FAANG scale:**
- **Microsoft:** Teams web client (rebuilt on Next.js) uses App Router layouts for the Teams sidebar, which persists across channel navigations — the sidebar never remounts, enabling instant channel switching
- **Adobe:** Creative Cloud web uses route groups to separate the marketing site from the app: `(marketing)` layout has no auth, `(app)` layout has auth guard in layout.tsx
- **Salesforce:** Trailhead uses `generateStaticParams` for popular module pages (millions of visits) — pre-rendered at build time, served from CDN, near-instant load
- **Cisco:** DevNet documentation uses App Router for each product's docs section — nested layouts for product + section navigation, `loading.tsx` for page transitions

---

## 💬 4. Interview Execution

### Sample Answer

> "The App Router uses file-system routing under the `app/` directory. The key files per route segment: `page.tsx` for the route content, `layout.tsx` for a persistent wrapper that doesn't remount on navigation, `loading.tsx` for Suspense fallback, and `error.tsx` for error boundary.
>
> The critical architectural difference from the Pages Router: layouts persist across navigations within their segment. Navigation from `/dashboard/settings` to `/dashboard/profile` keeps `dashboard/layout.tsx` mounted — the sidebar and any fetched data don't re-render. Only the page component swaps. This is a significant performance improvement over Pages Router where full re-renders happened on every navigation.
>
> All special files are Server Components by default — layouts, pages, loading, error (except error.tsx which must be `'use client'` because it uses an error boundary). This means you can fetch data directly in layouts and pages without `useEffect`.
>
> For dynamic routes: `[id]` in the folder name creates a dynamic segment; `generateStaticParams` pre-generates static HTML at build time for known IDs. Route Groups — folders in parentheses like `(marketing)` — organize your routes without affecting the URL, which is perfect for applying different layouts to different sections of the app.
>
> The advanced features I'd mention for differentiation: `@slot` parallel routes (render multiple pages simultaneously with independent loading states) and intercepting routes (modal-style navigation while keeping full-page access via direct URL)."

---

## 💻 5. Code Example

```typescript
// ========================
// E-commerce App: App Router structure demonstration
// ========================

// app/layout.tsx — Root RSC layout
import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'ShopApp', template: '%s | ShopApp' },
  description: 'Premium shopping experience',
  openGraph: { siteName: 'ShopApp' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopNavigation />      {/* RSC — persists across ALL navigations */}
        {children}
        <Footer />
      </body>
    </html>
  );
}

// ---

// app/(shop)/layout.tsx — Shop section layout (route group)
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  // RSC: fetch categories server-side, no useEffect
  const categories = await getProductCategories();
  return (
    <div className="shop-layout">
      <CategorySidebar categories={categories} />  {/* Data fetched in layout */}
      <main>{children}</main>
    </div>
  );
}

// ---

// app/(shop)/products/[id]/page.tsx — Dynamic product page
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props { params: { id: string } }

// Dynamic SEO metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.id);
  if (!product) return { title: 'Product Not Found' };
  return {
    title: product.name,
    description: product.description.slice(0, 155),
    openGraph: { images: [{ url: product.imageUrl }] },
  };
}

// Static generation for known product IDs
export async function generateStaticParams() {
  const ids = await getAllProductIds();
  return ids.map(id => ({ id }));
}

export default async function ProductPage({ params }: Props) {
  const [product, relatedProducts] = await Promise.all([
    getProduct(params.id),
    getRelatedProducts(params.id),
  ]);

  if (!product) notFound();  // → renders not-found.tsx

  return (
    <div>
      <Suspense fallback={<ReviewsSkeleton />}>
        {/* Nested Suspense: reviews load independently from main product */}
        <ProductReviews productId={params.id} />  {/* async RSC */}
      </Suspense>
      <RelatedProducts products={relatedProducts} />
    </div>
  );
}

// ---

// app/(shop)/products/[id]/loading.tsx — Segment loading state
export default function ProductLoading() {
  return (
    <div className="product-skeleton">
      <div className="skeleton-image" aria-hidden="true" />
      <div className="skeleton-title" aria-hidden="true" />
      <div className="skeleton-price" aria-hidden="true" />
    </div>
  );
}
// Automatically wrapped by Next.js: <Suspense fallback={<ProductLoading />}>

// ---

// app/(shop)/products/[id]/error.tsx — Segment error boundary
'use client';
export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert">
      <h2>Failed to load product</h2>
      <p>Error ID: {error.digest}</p>  {/* digest: server-side error ID for logs */}
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// ---

// app/(shop)/products/[id]/not-found.tsx — 404 for specific product
import Link from 'next/link';
export default function ProductNotFound() {
  return (
    <div>
      <h2>Product not found</h2>
      <p>This product may have been discontinued.</p>
      <Link href="/products">Browse all products</Link>
    </div>
  );
}

// Type stubs
declare function getProductCategories(): Promise<any[]>;
declare function getProduct(id: string): Promise<any>;
declare function getAllProductIds(): Promise<string[]>;
declare function getRelatedProducts(id: string): Promise<any[]>;
declare function TopNavigation(): JSX.Element;
declare function Footer(): JSX.Element;
declare function CategorySidebar(props: any): JSX.Element;
declare function ProductReviews(props: any): Promise<JSX.Element>;
declare function RelatedProducts(props: any): JSX.Element;
declare function ReviewsSkeleton(): JSX.Element;
```

---

## 🧠 6. Memory Aid

**App Router = folders are routes, special files are roles.**

**Special file cheat sheet:**
| File | Role | Default |
|------|------|---------|
| `page.tsx` | Route content (publicly accessible) | RSC |
| `layout.tsx` | Persistent shell (wraps children) | RSC |
| `loading.tsx` | Suspense fallback | RSC |
| `error.tsx` | Error boundary | CSC (must be client) |
| `not-found.tsx` | 404 handler | RSC |
| `route.ts` | API endpoint (no UI) | — |

**Route syntax:**
- `[id]` = dynamic segment
- `[...slug]` = catch-all
- `[[...slug]]` = optional catch-all
- `(folder)` = route group (excluded from URL)
- `@slot` = parallel route slot

**Mnemonic:** **PLLNE** — **P**age renders content, **L**ayout persists, **L**oading wraps in Suspense, **N**ot-found for 404, **E**rror boundary.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ App Router is the future of Next.js: Pages Router is in maintenance mode — all new Next.js projects use App Router, and all migrations target it. Fluency in App Router routing conventions is now table stakes for Next.js positions
→ Layout persistence is the key new concept: interviews specifically test whether candidates understand that `layout.tsx` persists across navigations (vs Pages Router's equivalent which doesn't) — this has direct UX implications (no sidebar flash, no lost scroll position)
→ RSC default: all App Router files are RSCs unless marked `'use client'` — understanding which special files must be client components (`error.tsx`) and which can be RSC (all others) is a common interview question

**How it works (2 sentences):**
App Router implements the routing by traversing the `app/` directory from root to the matched segment and wrapping matched files in a specific React component hierarchy at build time: for a request to `/dashboard/settings`, Next.js renders `RootLayout` → `DashboardLayout` → `SettingsPage`, with each level's `Suspense` (from `loading.tsx`) and `ErrorBoundary` (from `error.tsx`) wrapping the level below it in the component tree.
Layout persistence works because Next.js uses React's partial rendering — during client-side navigation, only the deepest changed segment re-renders; layouts stay mounted as React tree nodes because their identity (component function reference) doesn't change between navigations within their segment, and React's reconciliation preserves mounted components when their identity is stable.

---
✅ Topic 118/486 complete → Continuing to Topic 119: Next.js Data Fetching — Server Components, fetch(), caching
