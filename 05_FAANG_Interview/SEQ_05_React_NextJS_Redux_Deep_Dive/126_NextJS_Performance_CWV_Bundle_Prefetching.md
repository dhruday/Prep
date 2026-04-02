# 126. Next.js Performance — Core Web Vitals, Bundle Analysis, Prefetching
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Next.js performance optimisation targets three Core Web Vitals: **LCP** (Largest Contentful Paint — how fast the main content appears), **CLS** (Cumulative Layout Shift — visual stability), and **INP** (Interaction to Next Paint — responsiveness). The levers Next.js provides are: `next/image` for LCP, `next/font` for CLS, `next/dynamic` for code splitting (lazy-load heavy client components), `<Link>` prefetching (hover = prefetch on desktop), bundle analysis via `@next/bundle-analyzer`, and the React profiler for render performance. On the server side, correctly choosing SSG vs ISR vs SSR directly determines TTFB (Time to First Byte), which drives LCP. A senior candidate connects each optimizsation technique to the specific metric it moves and quantifies the delta — not just "we added lazy loading".

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Core Web Vitals — What Next.js Affects

```
LCP (Largest Contentful Paint) — target: < 2.5s
Affected by:
  - TTFB: SSG/ISR (CDN) → < 100ms vs SSR (server) → 100-300ms
  - Image load: next/image + priority prop + proper sizes
  - Font load: next/font eliminates render-blocking external font requests
  - JS bundle: large JS blocks parsing → next/dynamic defers non-critical code

CLS (Cumulative Layout Shift) — target: < 0.1
Affected by:
  - Images without dimensions: next/image REQUIRES width/height or fill → CLS = 0
  - Font swap: next/font size-adjust → CLS = 0 on font load
  - Dynamic content insertion: loading states with Suspense skeletons preserve space
  - Ad networks: use fixed-height containers

INP (Interaction to Next Paint) — target: < 200ms (replaced FID in 2024)
Affected by:
  - Long tasks on main thread: code splitting, defer non-critical scripts
  - Hydration cost: split large Client Components, use Server Components where possible
  - Event handler work: yielding with requestIdleCallback, scheduler API
  - Third-party scripts: load with next/script strategy="lazyOnload"
```

### next/dynamic — Client Component Code Splitting

```typescript
// ====== Basic lazy loading ======
import dynamic from 'next/dynamic';

// The component JS is NOT included in the initial bundle
// Downloaded only when the component mounts
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,      // shown while JS loads
  ssr: false,                            // don't SSR — many heavy components use window/document
});

const RichTextEditor = dynamic(
  () => import('@/components/RichTextEditor').then(m => m.RichTextEditor),  // named export
  { ssr: false, loading: () => <div>Loading editor...</div> }
);

// ====== Route-level code splitting (automatic) ======
// Each page.tsx is already a separate chunk — Next.js handles this automatically
// next/dynamic is for WITHIN a page: split heavy components that aren't needed on initial load

// ====== Advanced: load only when needed ======
const ExportModal = dynamic(() => import('@/components/ExportModal'));

export function DataTable() {
  const [showExport, setShowExport] = useState(false);
  return (
    <div>
      <Table data={data} />
      <button onClick={() => setShowExport(true)}>Export</button>
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {/* ExportModal JS only loads when showExport becomes true */}
    </div>
  );
}

// ====== Third-party scripts ======
import Script from 'next/script';

// strategy options:
// 'beforeInteractive' — load before hydration (rare, for critical scripts)
// 'afterInteractive'  — load after hydration (default, analytics)
// 'lazyOnload'        — load during browser idle time (chat widgets, social buttons)
// 'worker'            — load in Web Worker via Partytown (advanced)

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Script
        src="https://analytics.example.com/script.js"
        strategy="lazyOnload"              // never blocks rendering
        onLoad={() => console.log('Analytics loaded')}
      />
      <Script
        src="https://example.com/widget.js"
        strategy="worker"                   // runs in Web Worker, off main thread
      />
    </>
  );
}
```

### Bundle Analysis

```bash
# Install the bundle analyzer
npm install -D @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer({
  // ... your config
});

# Run analysis
ANALYZE=true next build
# Opens two browser windows: client bundle + server bundle treemaps

# What to look for:
# 1. Giant squares → large dependency included when it shouldn't be
#    Common culprits: moment.js (500KB) → replace with date-fns or Day.js
#                     lodash (full) → use lodash-es with tree shaking
#                     heavy icon libraries → import individual icons
# 2. Duplicate dependencies → two versions of the same package
# 3. Large node_modules in client bundle → should it be server-only?
```

### Link Prefetching

```typescript
// next/link prefetching behavior:
// - Production: links visible in viewport → prefetched automatically
// - Development: no prefetching (to avoid spam)
// - Hover in production: prefetch starts on hover (desktop)

import Link from 'next/link';

// Default: prefetch={true} in production — viewport intersection observer
<Link href="/products">Products</Link>

// Disable prefetch for links to heavy pages you're confident user won't navigate to
<Link href="/admin/analytics" prefetch={false}>Analytics</Link>

// Programmatic prefetch — start early
import { useRouter } from 'next/navigation';
const router = useRouter();

// On button hover: prefetch the likely next page
function QuickActions() {
  const router = useRouter();
  return (
    <button
      onPointerEnter={() => router.prefetch('/checkout')}
      onClick={() => router.push('/checkout')}
    >
      Checkout
    </button>
  );
}
```

### Measuring and Monitoring Core Web Vitals

```typescript
// app/components/WebVitals.tsx — report to analytics
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to your analytics endpoint
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,    // 'good' | 'needs-improvement' | 'poor'
      id: metric.id,
      navigationType: metric.navigationType,
    });

    // Use sendBeacon for non-blocking reporting
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/vitals', body);
    } else {
      fetch('/api/vitals', { body, method: 'POST', keepalive: true });
    }
  });

  return null;
}
// Metrics reported: CLS, FCP, FID, INP, LCP, TTFB

// app/layout.tsx
import { WebVitals } from '@/components/WebVitals';
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <WebVitals />
      </body>
    </html>
  );
}
```

### React Server Components — Performance Impact

```typescript
// Server Components → zero JS bundle cost (code stays on server)
// Client Components → full component code in bundle

// ✅ Good: data fetching + static rendering stays server-side
// app/products/page.tsx (Server Component — default)
export default async function ProductsPage() {
  const products = await db.product.findMany({ /* ... */ });
  return (
    <div>
      {/* ProductList is a Server Component — no bundle cost */}
      <ProductList products={products} />
      {/* Only the interactive parts are Client Components */}
      <ProductFilters />   {/* Client Component — needs useState */}
    </div>
  );
}

// ✅ Good: push client boundary as deep as possible
// ProductList.tsx — Server Component (no 'use client')
function ProductList({ products }: { products: Product[] }) {
  return (
    <ul>
      {products.map(p => (
        <li key={p.id}>
          {p.name}
          <AddToCartButton productId={p.id} />  {/* Only button is client */}
        </li>
      ))}
    </ul>
  );
}

// AddToCartButton.tsx — Client Component (needs onClick)
'use client';
function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  return (
    <button onClick={() => { addToCart(productId); setAdded(true); }}>
      {added ? 'Added!' : 'Add to Cart'}
    </button>
  );
}
```

### Performance Checklist

```
LCP Optimization:
☐ Priority prop on above-fold images (disables lazy load + preload link)
☐ sizes attribute on all Images (correct srcset source selection)
☐ Use SSG/ISR for content pages (CDN TTFB < 100ms vs SSR 100-300ms)
☐ Avoid render-blocking resources

CLS Optimization:
☐ All images have explicit width/height or use fill
☐ Use next/font (size-adjust removes font swap CLS)
☐ Suspense skeletons match content dimensions (no size change on load)
☐ Reserve height for dynamic content (ads, banners)

INP Optimization:
☐ Third-party scripts use strategy="lazyOnload" or strategy="worker"
☐ Heavy Client Components use next/dynamic
☐ Expensive computations use useMemo/useCallback
☐ Server Components used for static/data content (zero hydration cost)

Bundle Size:
☐ Run ANALYZE=true next build and check treemap
☐ Replace moment.js → date-fns, lodash → lodash-es
☐ Import individual icons (not entire icon libraries)
☐ Confirm heavy libs (Prisma, auth) are server-only
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the Lighthouse performance score on the product listing page was 60. Identified issues via bundle analyzer: `moment.js` (517KB) included for date formatting (replaced with `date-fns` — 30KB, tree-shaken), and a full Lodash import (71KB) replaced with individual function imports (8KB). `next/dynamic` deferred the analytics chart component (loaded with `ssr: false` since it used Highcharts, which accesses `window`). Moving the page to ISR from SSR reduced TTFB from ~200ms to ~30ms. Combined: Lighthouse 60 → 95, LCP 4.2s → 1.8s.

**At FAANG scale:**
- **Microsoft:** Azure Portal — aggressive code splitting with `next/dynamic` per feature; bundle analyzer run in CI (fail build if main chunk exceeds 200KB limit); prefetch on route groups
- **Adobe:** Creative Cloud web — `strategy="worker"` for non-essential analytics scripts (Partytown moves them off main thread), measurable INP improvement from 400ms → 90ms
- **Salesforce:** Trailhead — `useReportWebVitals` feeding into Splunk for real-time CWV monitoring per page; P75 LCP alerting triggers automatic ISR revalidation review
- **Cisco:** DevNet documentation — Server Components for all documentation pages (zero client JS for content rendering), `next/dynamic` only for interactive API explorer widget

---

## 💬 4. Interview Execution

### Sample Answer

> "Next.js performance optimization maps directly to the three Core Web Vitals. For LCP — how fast the main content appears — the two biggest levers are TTFB and image load time. TTFB I control by choosing SSG or ISR over SSR where possible (CDN TTFB vs Lambda TTFB is a 5-10x difference). Image load I control via `next/image` with the `priority` prop on the LCP image and proper `sizes` attribute for responsive srcset.
>
> For CLS — layout stability — it's almost always `next/image` enforcing explicit dimensions, plus `next/font` eliminating font-swap shifts via `size-adjust`. 
>
> For INP — interaction responsiveness — the main lever is keeping the main thread clear: third-party scripts with `strategy='lazyOnload'`, heavy Client Components deferred with `next/dynamic`, and maximizing Server Components since they contribute zero hydration cost.
>
> For bundle size I run `ANALYZE=true next build` — the bundle treemap makes it immediately obvious if something like `moment.js` is accidentally included client-side. At SAP, that single change (moment → date-fns) saved 487KB from the initial bundle."

---

## 💻 5. Code Example

```typescript
// Performance-optimized page implementing all techniques

// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer({
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com', pathname: '/**' }],
  },
});

// app/products/page.tsx — optimized Server Component page
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Defer heavy interactive component — not needed for initial paint
const ProductFilters = dynamic(() => import('@/components/ProductFilters'), {
  loading: () => <FiltersSkeleton />,
  ssr: false,
});

const AnalyticsChart = dynamic(() => import('@/components/AnalyticsChart'), {
  ssr: false,
  loading: () => <div style={{ height: 300 }}>Loading chart...</div>,
});

export default async function ProductsPage() {
  const products = await fetchProducts();  // Server Component: zero client JS

  return (
    <>
      {/* Hero Image: priority for LCP */}
      <Image
        src={products[0].heroImage}
        alt={products[0].name}
        width={1200}
        height={600}
        priority                         // LCP image: preload
        sizes="100vw"
        style={{ objectFit: 'cover' }}
      />

      {/* Filters: lazy-loaded, below-fold on mobile */}
      <ProductFilters />

      {/* Product grid: Server Component → zero client bundle */}
      <ul>
        {products.map(product => (
          <li key={product.id}>
            <Image
              src={product.thumbnail}
              alt={product.name}
              width={400}
              height={300}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL={product.blurData}
            />
            <h2>{product.name}</h2>
            <p>${product.price}</p>
          </li>
        ))}
      </ul>

      {/* Chart: only loads when component is visible (Suspense + dynamic) */}
      <Suspense fallback={<div style={{ height: 300 }}>Loading analytics...</div>}>
        <AnalyticsChart />
      </Suspense>
    </>
  );
}

// Type stubs
declare function fetchProducts(): Promise<any[]>;
declare function FiltersSkeleton(): JSX.Element;
```

---

## 🧠 6. Memory Aid

**LCI — the three vitals and their levers:**
- **L**CP: low TTFB (SSG/ISR), `priority` image, `sizes`, `next/font`
- **C**LS: `width`/`height` on images, `next/font` size-adjust, skeleton dimensions
- **I**NP: `next/dynamic`, `lazyOnload` scripts, Server Components (zero hydration)

**Bundle analysis:**
- `ANALYZE=true next build` → treemap
- Hunt for: moment.js, full lodash, entire icon libraries, server-only libs in client

**Prefetching:**
- `<Link>` = automatic viewport prefetch in production
- `router.prefetch('/path')` = programmatic prefetch on hover
- `prefetch={false}` = disable for heavy/admin pages

**Mnemonic:** **LCI** — LCP needs Speed, CLS needs Stability, INP needs Interactivity. Three metrics, three toolkits.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Google uses Core Web Vitals in search ranking (Core Web Vitals report in Search Console) — a 10% improvement in LCP can meaningfully improve organic search traffic; demonstrating you connect rendering mode choice to TTFB to LCP shows you understand performance as a business metric, not just a technical checkbox
→ Bundle analyzer + "moment.js" story is a credible, specific performance example — naming the actual KB savings (517KB → 30KB) and connecting it to a Lighthouse score improvement (60 → 95) is the kind of concrete story interviewers at Microsoft/Adobe remember
→ INP replaced FID in 2024 as the official responsiveness metric — knowing this shows you follow web standards evolution, not just read 2-year-old blog posts

**How it works (2 sentences):**
`next/dynamic` wraps `React.lazy()` with SSR support — at build time, the dynamically imported component is split into a separate chunk file (e.g., `chunks/components-HeavyChart.js`), and at runtime the component renders a loading fallback until the chunk downloads and executes, with `ssr: false` instructing Next.js to skip server-rendering the component entirely (useful when the component accesses browser-only APIs like `window` or `document`).
Bundle splitting in Next.js uses webpack's (or Turbopack's) `SplitChunksPlugin` heuristics: shared modules used by multiple pages are extracted into a `commons` chunk (loaded once, cached across navigation), each page's unique code is its own chunk (only loaded for that page), and `next/dynamic` creates an async import boundary that webpack turns into an on-demand chunk loaded via a `<script>` tag injected when the component first needs to render.

---
✅ Topic 126/486 complete → Continuing to Topic 127: Next.js Deployment — Vercel, Self-Hosting, Docker
