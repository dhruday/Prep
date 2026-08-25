# 462 – Static vs Dynamic Rendering

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Static Rendering** (default): HTML generated at build time, served from CDN. **Dynamic Rendering**: HTML generated at request time on the server. Next.js auto-detects: if you use cookies(), headers(), searchParams, or uncached fetch → dynamic. **Partial Prerendering** (PPR, experimental): static shell + dynamic holes streamed in.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── STATIC RENDERING (default) ────
// Built at build time, cached, served from CDN
// No dynamic functions → Next.js chooses static
async function AboutPage() {
  const content = await fetch('https://cms.example.com/about'); // cached
  return <div>{content}</div>;
}
// ✅ Fast TTFB from CDN edge
// ✅ No server needed at runtime
// ❌ Can't personalize per-request

// ──── DYNAMIC RENDERING ────
// Triggered by dynamic functions or uncached fetch
import { cookies, headers } from 'next/headers';

async function DashboardPage() {
  const cookieStore = cookies();        // ← triggers dynamic
  const headersList = headers();        // ← triggers dynamic
  const token = cookieStore.get('auth');
  
  const data = await fetch('https://api.example.com/dashboard', {
    cache: 'no-store',                  // ← triggers dynamic
    headers: { Authorization: `Bearer ${token?.value}` },
  });
  
  return <Dashboard data={data} />;
}

// searchParams also triggers dynamic
async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  // Using searchParams → dynamic rendering
  const results = await search(searchParams.q || '');
  return <SearchResults results={results} />;
}

// ──── FORCE STATIC / DYNAMIC ────
// Force entire route to be dynamic
export const dynamic = 'force-dynamic';

// Force entire route to be static
export const dynamic = 'force-static';

// Error if dynamic functions used in static route
export const dynamic = 'error'; // build fails if dynamic detected

// ──── DYNAMIC TRIGGERS ────
// 1. cookies()
// 2. headers()
// 3. searchParams prop
// 4. fetch with cache: 'no-store'
// 5. export const dynamic = 'force-dynamic'
// 6. Using after() or connection()

// ──── PARTIAL PRERENDERING (PPR) — experimental ────
// Static shell + dynamic parts streamed via Suspense
// next.config.js: experimental: { ppr: true }

async function ProductPage() {
  const product = await getProduct(); // static (cached)
  
  return (
    <div>
      {/* Static parts — served instantly from CDN */}
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <img src={product.image} />
      
      {/* Dynamic parts — streamed when ready */}
      <Suspense fallback={<PriceSkeleton />}>
        <DynamicPrice productId={product.id} />
      </Suspense>
      
      <Suspense fallback={<ReviewsSkeleton />}>
        <DynamicReviews productId={product.id} />
      </Suspense>
    </div>
  );
}

// Dynamic component inside PPR
async function DynamicPrice({ productId }: { productId: string }) {
  const price = await fetch(`/api/price/${productId}`, { cache: 'no-store' });
  return <span>${price}</span>; // streamed in after shell
}

// ──── RENDERING COMPARISON ────
// Build output shows rendering mode:
// ○ Static    — prerendered at build time
// λ Dynamic   — server-rendered at request time
// ◐ PPR       — static shell + dynamic streaming
```

### When to Use What
| Scenario | Rendering | Why |
|---|---|---|
| Marketing pages | Static | Content rarely changes |
| Blog posts | Static + ISR | Revalidate periodically |
| Dashboard | Dynamic | Needs auth/cookies |
| Search results | Dynamic | searchParams |
| E-commerce product | PPR | Static details + dynamic price |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Static: build-time, CDN-served, fastest. Dynamic: request-time, triggered by cookies/headers/searchParams/no-store. Next.js auto-detects — no manual config needed. PPR (experimental): static shell instantly + dynamic parts streamed via Suspense boundaries. Best of both worlds."*

## 4. 🧠 MEMORY AID
**"Static = default (CDN). Dynamic = cookies/headers/searchParams/no-store. PPR = static shell + dynamic Suspense holes streamed in."**
