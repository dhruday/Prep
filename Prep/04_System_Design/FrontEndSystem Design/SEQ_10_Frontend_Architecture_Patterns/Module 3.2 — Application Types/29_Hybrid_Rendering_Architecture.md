# 29. Hybrid Rendering Architecture (SSR + SPA, SSG + Hydration)

## 1. High-Level Explanation (Frontend Interview Level)

**Hybrid Rendering** combines **server-side rendering (SSR)** for the **initial page load** with **client-side SPA behavior** for subsequent navigation—best of both worlds where first page is server-rendered (fast, SEO-friendly) then "hydrated" with JavaScript to become interactive SPA (instant navigation, rich UX).

**Core Patterns**:
- **SSR + SPA**: Server renders first page → Client hydrates → SPA navigation
- **SSG + Hydration**: Static pre-rendered pages → Client hydrates → Interactive
- **Islands Architecture**: Static HTML + interactive "islands" (selective hydration)
- **Progressive Hydration**: Hydrate components progressively (performance)

**Key Principle**: "First page server-rendered (fast, SEO), subsequent pages client-rendered (instant SPA navigation)—combines MPA benefits (SEO, fast load) with SPA benefits (rich UX, instant transitions)."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Core Concepts

#### 1. **SSR + SPA (Next.js, Nuxt.js, SvelteKit)**

**Flow**:
```
First Visit (https://example.com/products):

1. Server-Side Rendering (SSR):
   ├── User requests /products
   ├── Server fetches data (API/database)
   ├── Server renders React/Vue components to HTML
   ├── Server responds with complete HTML (~50KB)
   └── Browser displays HTML (fast, SEO-friendly)
   └── Time to First Contentful Paint (FCP): 200-500ms

2. Hydration:
   ├── Browser downloads app.js (~500KB-1MB, smaller than SPA)
   ├── JavaScript "hydrates" HTML (attach event listeners)
   ├── Page becomes interactive (click events, state)
   └── Time to Interactive (TTI): 1-2s (faster than pure SPA)

3. Subsequent Navigation (/products/123):
   ├── Client-side routing (React Router, no page reload)
   ├── Fetch data from API (JSON)
   ├── Update DOM (Virtual DOM)
   └── Total: 50-200ms (instant, like SPA)

Result: Fast first load + SEO + instant navigation (best of both worlds)
```

---

**vs Pure SPA**:
```
Pure SPA:
├── First load: app.bundle.js (2-5MB, 1-3s TTI, slow)
├── Navigation: Update DOM (50-200ms, instant)
└── SEO: Poor (no server HTML)

Hybrid SSR + SPA:
├── First load: Server HTML (50KB, 200-500ms FCP) + hydrate (1-2s TTI)
├── Navigation: Update DOM (50-200ms, instant)
└── SEO: Excellent (server HTML crawlable)

Hybrid = fast first load + SEO + instant navigation
```

---

**vs Pure MPA**:
```
Pure MPA:
├── First load: Server HTML (50KB, 200-500ms FCP)
├── Navigation: Full page reload (500-1000ms, white screen)
└── SEO: Excellent (server HTML)

Hybrid SSR + SPA:
├── First load: Server HTML (50KB, 200-500ms FCP)
├── Navigation: Update DOM (50-200ms, instant)
└── SEO: Excellent (server HTML)

Hybrid = MPA SEO + SPA navigation speed
```

---

#### 2. **SSG + Hydration (Gatsby, Next.js Static, Eleventy)**

**Static Site Generation (SSG)**:
```
Build Time (npm run build):
├── Fetch data from CMS/API (at build time)
├── Pre-render all pages to static HTML (products.html, about.html)
├── Generate static files (dist/ folder)
└── Deploy to CDN (Vercel, Netlify, CloudFlare)

Runtime (user visits):
├── User requests /products
├── CDN serves pre-rendered products.html (instant, cached)
├── Browser downloads JavaScript
├── Hydrate HTML (attach events)
└── Becomes interactive SPA

First load: 100-300ms (static HTML from CDN, extremely fast)
Navigation: 50-200ms (SPA-like)
```

**vs SSR**:
```
SSR (Next.js getServerSideProps):
├── Every request → server renders HTML (200-500ms)
├── Dynamic (always fresh data)
├── Server load (high CPU)

SSG (Next.js getStaticProps):
├── Build time → pre-render to HTML (once)
├── Static (data stale until rebuild)
├── Instant (served from CDN, no server rendering)

SSG = 2-5× faster than SSR (static files, but data can be stale)
```

---

#### 3. **Islands Architecture (Astro, Fresh, Eleventy)**

**Concept**: Most content is **static HTML** (no JavaScript), with **interactive "islands"** (React/Vue components) hydrated selectively.

**Architecture**:
```
Page Structure:
├── Header (static HTML, no JS)
├── Hero (static HTML, no JS)
├── Product List (static HTML, no JS)
├── Product Filter (interactive island, React component, hydrated)
├── Footer (static HTML, no JS)

Only ProductFilter hydrated (JavaScript loaded)
Rest is static HTML (zero JavaScript, fast)

Benefits:
├── Minimal JavaScript (only islands hydrated, 50-100KB vs 2-5MB)
├── Fast TTI (most page already static, interactive parts hydrate quickly)
└── Progressive enhancement (works without JavaScript, enhances with islands)
```

**Example** (Astro):
```astro
---
// Static content (no JavaScript)
const products = await fetchProducts();
---

<h1>Products</h1>

<!-- Static HTML (no JavaScript) -->
<ul>
  {products.map(p => (
    <li>{p.name}</li>
  ))}
</ul>

<!-- Interactive island (React component, hydrated) -->
<ProductFilter client:load />
<!-- Only this component gets JavaScript (selective hydration) -->
```

**Trade-off**: Static HTML (fast, SEO, zero JS) + selective interactivity (islands), but complex if entire page needs to be interactive (better for content-heavy sites with few interactive parts).

---

#### 4. **Progressive Hydration** (React 18, Qwik)

**Problem**: Traditional hydration loads all JavaScript upfront (slow TTI).

**Solution**: Hydrate components **progressively** (prioritize visible/interactive parts).

**Example** (React 18 Suspense):
```jsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <div>
      {/* Visible content (hydrate immediately) */}
      <Header />
      <Hero />
      
      {/* Below fold (defer hydration) */}
      <Suspense fallback={<Spinner />}>
        <HeavyComponent />
      </Suspense>
      
      {/* Footer (defer hydration) */}
      <Footer />
    </div>
  );
}

// Header, Hero hydrate immediately (visible)
// HeavyComponent hydrates when scrolled into view (progressive)
// Footer hydrates when idle (low priority)
```

**Benefits**: Faster TTI (prioritize visible content, defer below-fold), better perceived performance.

---

### SSR Implementation (Next.js)

**Example**: E-commerce product page (SSR for SEO, SPA navigation).

```jsx
// pages/products/[id].js (Next.js)

import { useRouter } from 'next/router';
import Link from 'next/link';

// Server-Side Rendering (runs on server)
export async function getServerSideProps(context) {
  const { id } = context.params;
  
  // Fetch data on server (database or API)
  const res = await fetch(`https://api.example.com/products/${id}`);
  const product = await res.json();
  
  // Return props (passed to component)
  return {
    props: { product }
  };
}

// Component (rendered on server, then hydrated on client)
export default function ProductPage({ product }) {
  const router = useRouter();
  
  // Add to cart (client-side interaction)
  const handleAddToCart = () => {
    // Client-side logic (after hydration)
    fetch('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId: product.id })
    });
  };
  
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>${product.price}</p>
      
      {/* Client-side interaction (after hydration) */}
      <button onClick={handleAddToCart}>Add to Cart</button>
      
      {/* Client-side navigation (SPA-like, no page reload) */}
      <Link href="/products/456">
        <a>Next Product</a>
      </Link>
    </div>
  );
}
```

**Flow**:
```
1. User visits /products/123:
   ├── Server runs getServerSideProps (fetch product data)
   ├── Server renders <ProductPage product={...} /> to HTML
   ├── Server responds with HTML:
       <div>
         <h1>Product A</h1>
         <p>Description...</p>
         <p>$99</p>
         <button>Add to Cart</button>
       </div>
   └── Browser displays HTML (fast, 200-500ms)

2. Browser downloads app.js:
   ├── JavaScript hydrates HTML (attach onClick to button)
   ├── Page becomes interactive
   └── TTI: 1-2s

3. User clicks "Next Product" link:
   ├── Client-side navigation (React Router, no page reload)
   ├── Fetch data from API (JSON)
   ├── Update DOM
   └── Total: 50-200ms (instant, SPA-like)
```

**Benefits**:
- **First load**: Fast (server HTML, 200-500ms FCP), SEO-friendly (crawlable)
- **Subsequent navigation**: Instant (SPA-like, 50-200ms)
- **Interactions**: Rich UX (click events, state management, optimistic updates)

---

### SSG Implementation (Next.js Static)

**Example**: Blog (static pages, updated on deploy).

```jsx
// pages/posts/[slug].js (Next.js)

// Static Site Generation (runs at build time)
export async function getStaticPaths() {
  // Fetch all post slugs (at build time)
  const posts = await fetchAllPosts();
  
  // Return paths to pre-render
  return {
    paths: posts.map(post => ({ params: { slug: post.slug } })),
    fallback: false // 404 if path not pre-rendered
  };
}

export async function getStaticProps(context) {
  const { slug } = context.params;
  
  // Fetch post data (at build time)
  const post = await fetchPost(slug);
  
  return {
    props: { post },
    revalidate: 3600 // Incremental Static Regeneration (ISR): rebuild every hour
  };
}

export default function PostPage({ post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

**Flow**:
```
Build Time (npm run build):
├── Next.js calls getStaticPaths → returns all post slugs
├── For each slug:
│   ├── Call getStaticProps (fetch post data)
│   ├── Render <PostPage post={...} /> to HTML
│   └── Save as static HTML (out/posts/post-1.html, out/posts/post-2.html)
└── Deploy static files to CDN

Runtime (user visits /posts/post-1):
├── CDN serves pre-rendered post-1.html (instant, 100-300ms)
├── Browser downloads JavaScript (optional, for interactivity)
├── Hydrate HTML (if interactive components)
└── Becomes interactive (SPA navigation for subsequent clicks)

ISR (Incremental Static Regeneration):
├── After 1 hour (revalidate: 3600)
├── Next request triggers rebuild (background)
├── Serve stale page while rebuilding
└── Serve fresh page to subsequent users
```

**Benefits**:
- **Instant load**: Static HTML from CDN (100-300ms, extremely fast)
- **SEO**: Excellent (pre-rendered HTML)
- **Low server load**: No server rendering (static files)
- **Scalability**: CDN handles millions of requests

**Trade-off**: Data can be stale (until rebuild), not suitable for real-time data (stock prices, live scores).

---

### Islands Architecture (Astro)

**Example**: Marketing page (mostly static, one interactive component).

```astro
---
// Astro component (static by default)
import ProductFilter from '../components/ProductFilter.jsx'; // React component
const products = await fetchProducts();
---

<html>
  <body>
    <!-- Static HTML (no JavaScript shipped) -->
    <header>
      <h1>Products</h1>
    </header>
    
    <!-- Static list (no JavaScript) -->
    <ul>
      {products.map(p => (
        <li>{p.name} - ${p.price}</li>
      ))}
    </ul>
    
    <!-- Interactive island (React component, hydrated) -->
    <ProductFilter 
      client:load 
      products={products} 
    />
    <!-- Only this component gets JavaScript (50KB vs 2MB full SPA) -->
    
    <!-- Static footer (no JavaScript) -->
    <footer>© 2026 Company</footer>
  </body>
</html>
```

**ProductFilter Component** (React):
```jsx
// components/ProductFilter.jsx (React island)
import { useState } from 'react';

export default function ProductFilter({ products }) {
  const [filter, setFilter] = useState('');
  
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase())
  );
  
  return (
    <div>
      <input 
        type="text"
        placeholder="Filter products..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      
      <ul>
        {filtered.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Astro Directives** (Control Hydration):
```astro
<!-- Don't hydrate (static HTML, no JS) -->
<Component />

<!-- Hydrate immediately (page load) -->
<Component client:load />

<!-- Hydrate when visible (IntersectionObserver) -->
<Component client:visible />

<!-- Hydrate when idle (requestIdleCallback) -->
<Component client:idle />

<!-- Hydrate on media query (mobile only) -->
<Component client:media="(max-width: 768px)" />
```

**Benefits**:
- **Minimal JavaScript**: Only interactive parts get JS (50KB vs 2MB)
- **Fast TTI**: Most page static (instant), islands hydrate quickly
- **SEO**: Excellent (static HTML)
- **Progressive enhancement**: Works without JavaScript

**Use case**: Content-heavy sites (blogs, marketing, docs) with few interactive parts.

---

### Progressive Hydration (React 18)

**Example**: E-commerce homepage (prioritize visible content).

```jsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components (defer hydration)
const ProductRecommendations = lazy(() => import('./ProductRecommendations'));
const Reviews = lazy(() => import('./Reviews'));
const Newsletter = lazy(() => import('./Newsletter'));

export default function Homepage() {
  return (
    <div>
      {/* Critical content (hydrate immediately) */}
      <Header />
      <Hero />
      <FeaturedProducts />
      
      {/* Below fold (defer hydration) */}
      <Suspense fallback={<Spinner />}>
        <ProductRecommendations />
      </Suspense>
      
      <Suspense fallback={<Spinner />}>
        <Reviews />
      </Suspense>
      
      {/* Footer (low priority, hydrate when idle) */}
      <Suspense fallback={<Spinner />}>
        <Newsletter />
      </Suspense>
    </div>
  );
}
```

**Flow**:
```
1. Server renders HTML (all components)
2. Client downloads JavaScript
3. Hydration:
   ├── Phase 1: Header, Hero, FeaturedProducts (visible, immediate)
   ├── Phase 2: ProductRecommendations (below fold, deferred)
   ├── Phase 3: Reviews (below fold, deferred)
   └── Phase 4: Newsletter (idle, lowest priority)

TTI: 500ms (critical content) vs 2s (full hydration)
```

**Benefits**: Faster perceived TTI (visible content interactive quickly), better UX (no blocking on heavy components).

---

## 3. Clear Real-World Examples

### Example 1: **Next.js (Vercel)** — SSR + SPA Hybrid

**Use Case**: E-commerce, SaaS, content sites (need SEO + rich UX).

**Architecture**: SSR for first page + SPA for subsequent navigation.

**Example**: Vercel Homepage
```
First Visit (/):
├── Server renders React components to HTML (SSR)
├── Responds with HTML (~50KB)
├── Browser displays HTML (fast, 200-500ms FCP)
├── Browser downloads app.js (~800KB)
├── Hydrate HTML (attach events)
└── TTI: 1-2s (faster than pure SPA 2-3s)

Click "Pricing" link:
├── Client-side navigation (React Router, no page reload)
├── Fetch /api/pricing (JSON)
├── Update DOM
└── 50-200ms (instant, SPA-like)

SEO: Excellent (server HTML crawlable)
UX: Rich (instant navigation, animations, optimistic updates)
```

**Patterns**:
- **SSR** (`getServerSideProps`): Dynamic pages (user profiles, dashboards)
- **SSG** (`getStaticProps`): Static pages (marketing, docs)
- **ISR** (`revalidate`): Rebuild static pages periodically (blog posts updated hourly)

**Result**: 40% better SEO (vs pure SPA), 50% faster first load (vs pure SPA), instant navigation (vs MPA).

---

### Example 2: **Gatsby** — SSG + Hydration

**Use Case**: Blogs, marketing sites, documentation (static content, updated infrequently).

**Architecture**: Static Site Generation (pre-render at build) + hydrate to SPA.

**Example**: Gatsby Blog
```
Build Time (npm run build):
├── Fetch posts from CMS (Contentful, WordPress)
├── Pre-render all pages to static HTML (index.html, posts/post-1.html, ...)
├── Generate dist/ folder (static files)
└── Deploy to CDN (Netlify, Vercel)

Runtime (user visits /posts/post-1):
├── CDN serves post-1.html (instant, 100-300ms)
├── Browser downloads JavaScript (~500KB)
├── Hydrate HTML (attach events, enable SPA navigation)
└── TTI: 800ms-1.5s (fast)

Click "Next Post":
├── Client-side navigation (Gatsby Link, no page reload)
├── Load next page data (already bundled or prefetched)
├── Update DOM
└── 50-200ms (instant)

SEO: Excellent (static HTML crawlable)
Performance: Extremely fast (static files from CDN)
```

**Trade-off**: Static (data stale until rebuild), must rebuild/deploy to update content.

**Use case**: Blogs, docs, marketing (content changes infrequently, updates on deploy acceptable).

---

### Example 3: **Astro** — Islands Architecture

**Use Case**: Content-heavy sites with minimal interactivity (blogs, marketing, docs).

**Architecture**: Static HTML + selective hydration (only interactive parts get JavaScript).

**Example**: Astro Documentation Site
```
Page Structure:
├── Header (static HTML, no JS)
├── Sidebar (static HTML, no JS)
├── Article Content (static HTML, no JS, Markdown rendered)
├── Search Box (interactive island, Preact component, hydrated)
├── Code Snippets (interactive island, Shiki highlighter, hydrated)
└── Footer (static HTML, no JS)

JavaScript: 50KB (only Search + Code Snippets)
vs Traditional SPA: 2MB (entire framework + app)

TTI: 300ms (most page already static, islands hydrate quickly)
vs SPA: 2-3s
```

**Benefits**:
- **Fast**: Minimal JavaScript (50KB vs 2MB)
- **SEO**: Excellent (static HTML)
- **Progressive**: Works without JavaScript (content readable), enhances with islands

**Use case**: Docs, blogs, marketing (content-heavy, few interactive parts).

---

### Example 4: **Twitter** — SSR + SPA Hybrid (Migration Success)

**Initial** (2014-2017): Pure SPA (React).

**Problems**:
- **Slow first load**: 3MB bundle, 3-5s TTI (high bounce rate)
- **Poor SEO**: No server HTML (tweets not indexed)

**Migration** (2017+): Hybrid SSR + SPA (Next.js-like).

**Architecture**:
```
First Visit (/user/username):
├── Server renders HTML with tweets (SSR)
├── Responds with HTML (~100KB)
├── Browser displays content (fast, 500ms FCP)
├── Browser downloads JavaScript (~1MB, smaller than before)
├── Hydrate HTML (attach events)
└── TTI: 1.5-2s (vs 3-5s before, 50% faster)

Click Tweet:
├── Client-side navigation (React Router, no page reload)
├── Fetch tweet data from API (JSON)
├── Update DOM
└── 50-200ms (instant, SPA-like)

SEO: Excellent (tweets indexed in Google)
Performance: 50% faster first load, 30% lower bounce rate
```

**Result**:
- **50% faster first load**: 3-5s → 1.5-2s TTI
- **30% lower bounce rate**: Users stay (fast perceived load)
- **SEO improved**: Tweets indexed in search (organic traffic ↑)

---

### Example 5: **Airbnb** — SSR + SPA Hybrid (Migration Story)

**Initial** (2014-2016): Pure SPA (React).

**Problems**:
- **Slow first load**: 3MB bundle, 5s TTI on mobile (40% bounce rate)
- **Poor SEO**: Property listings not indexed (lost organic traffic)

**Migration** (2017+): Hybrid SSR + SPA.

**Solution**:
```
First Visit (/rooms/123):
├── Server renders HTML with listing data (SSR)
├── Responds with HTML (~150KB)
├── Browser displays content (fast, 500-800ms FCP)
├── Browser downloads JavaScript (~1.5MB, code-split)
├── Hydrate HTML
└── TTI: 2-2.5s (vs 5s before, 50% faster)

Navigation (search, other listings):
├── Client-side routing (instant, no page reload)
├── Fetch data from API (JSON)
├── Update DOM
└── 100-300ms (SPA-like)

SEO: Property listings indexed (organic traffic ↑30%)
Performance: 50% faster first load, 20% higher bookings
```

**Result**:
- **50% faster first load**: 5s → 2.5s TTI
- **30% better SEO**: Property listings ranked
- **20% higher engagement**: More bookings (faster = better UX)

**Lesson**: Hybrid SSR+SPA best for public content (SEO) + rich interactions (SPA UX).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain hybrid rendering and when to use it."

**Answer**:

"**Hybrid Rendering** combines **server-side rendering (SSR)** for the **initial page load** with **client-side SPA behavior** for subsequent navigation—**best of both worlds** where first page is **server-rendered** (fast 200-500ms, SEO-friendly crawlable) then **hydrated** with JavaScript to become **interactive SPA** (instant navigation 50-200ms, rich UX).

---

### Core Patterns

**1. SSR + SPA** (Next.js, Nuxt.js, SvelteKit):
```
First visit:
1. Server renders HTML (fetch data, render components)
2. Browser displays HTML (fast, 200-500ms FCP, SEO-friendly)
3. Browser downloads JavaScript (~500KB-1MB)
4. Hydrate HTML (attach events)
5. TTI: 1-2s (faster than pure SPA 2-3s)

Subsequent navigation:
1. Client-side routing (React Router, no page reload)
2. Fetch data from API (JSON)
3. Update DOM
4. Total: 50-200ms (instant, SPA-like)

Benefits: Fast first load + SEO + instant navigation
```

**2. SSG + Hydration** (Gatsby, Next.js Static):
```
Build time:
1. Fetch data from CMS/API (once)
2. Pre-render all pages to static HTML
3. Deploy to CDN (Vercel, Netlify)

Runtime:
1. CDN serves pre-rendered HTML (instant, 100-300ms)
2. Hydrate with JavaScript
3. Becomes interactive SPA

Benefits: Extremely fast (static CDN), SEO, low server load
Trade-off: Data stale until rebuild (not suitable for real-time)
```

**3. Islands Architecture** (Astro, Fresh):
```
Structure:
├── Most content: Static HTML (no JavaScript)
├── Interactive parts: "Islands" (React components, hydrated)
└── Total JavaScript: 50KB (vs 2MB full SPA)

Benefits: Minimal JS (fast TTI), SEO (static HTML), progressive enhancement
Use case: Content-heavy sites (blogs, docs, marketing) with few interactive parts
```

**4. Progressive Hydration** (React 18):
```
Hydration strategy:
1. Critical content (visible): Hydrate immediately
2. Below fold: Defer hydration (lazy load)
3. Low priority: Hydrate when idle

Benefits: Faster perceived TTI (visible content interactive quickly)
```

---

### Comparison

**Pure SPA**:
- Initial load: Slow (2-5MB bundle, 1-3s TTI)
- Navigation: Instant (50-200ms)
- SEO: Poor (no server HTML)
- Use case: Dashboards, admin panels (behind login, no SEO needed)

**Pure MPA**:
- Initial load: Fast (50KB HTML, 200-500ms)
- Navigation: Slow (500-1000ms, full page reload, white screen)
- SEO: Excellent (server HTML)
- Use case: Simple sites (blogs, marketing, low interactivity)

**Hybrid SSR + SPA**:
- Initial load: Fast (50KB HTML, 200-500ms FCP, then hydrate 1-2s TTI)
- Navigation: Instant (50-200ms, SPA-like)
- SEO: Excellent (server HTML)
- Use case: E-commerce, SaaS, content sites (need SEO + rich UX)

**Hybrid SSG + Hydration**:
- Initial load: Extremely fast (100-300ms, static CDN)
- Navigation: Instant (50-200ms)
- SEO: Excellent (static HTML)
- Trade-off: Data stale until rebuild
- Use case: Blogs, docs, marketing (content changes infrequently)

---

### Real-World Examples

**Next.js (Vercel)**: SSR + SPA, e-commerce/SaaS (SEO + rich UX), 40% better SEO vs pure SPA, 50% faster first load, instant navigation.

**Gatsby**: SSG + hydration, blogs/docs (static content), extremely fast (100-300ms CDN), SEO excellent, trade-off data stale until rebuild.

**Astro**: Islands architecture, content-heavy sites (blogs, docs, marketing), minimal JS (50KB vs 2MB), fast TTI (300ms), progressive enhancement.

**Twitter**: Migrated pure SPA → SSR + SPA hybrid (2017), result 50% faster first load (3-5s → 1.5-2s), 30% lower bounce rate, SEO improved (tweets indexed).

**Airbnb**: Migrated pure SPA → SSR + SPA hybrid (2017), result 50% faster first load (5s → 2.5s), 30% better SEO (listings ranked), 20% higher bookings.

---

### When to Use

**SSR + SPA**:
- E-commerce, SaaS, social media (Twitter, Airbnb)
- Need SEO (public pages) + rich UX (interactions)
- Dynamic content (user profiles, product pages)

**SSG + Hydration**:
- Blogs, docs, marketing sites (Gatsby)
- Static content (changes infrequently)
- Extremely fast load critical (conversions)

**Islands Architecture**:
- Content-heavy sites (docs, blogs, marketing)
- Few interactive parts (search, filters)
- Minimal JavaScript important (performance)

**Progressive Hydration**:
- Large pages (lots of components)
- Prioritize visible content (above fold)
- Faster perceived TTI critical

---

### Implementation (Next.js SSR)

```jsx
// pages/products/[id].js

// Server-Side Rendering
export async function getServerSideProps(context) {
  const { id } = context.params;
  const res = await fetch(`https://api.example.com/products/${id}`);
  const product = await res.json();
  
  return { props: { product } };
}

export default function ProductPage({ product }) {
  const handleAddToCart = () => {
    // Client-side interaction (after hydration)
    fetch('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId: product.id })
    });
  };
  
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <button onClick={handleAddToCart}>Add to Cart</button>
      
      {/* Client-side navigation (SPA-like) */}
      <Link href="/products/456">Next Product</Link>
    </div>
  );
}
```

**Flow**:
1. Server fetches data, renders HTML, responds (200-500ms FCP)
2. Browser hydrates JavaScript (attach onClick)
3. Page interactive (TTI 1-2s)
4. Click "Next Product" → client-side routing (50-200ms)

---

### Trade-offs

| Aspect | Pure SPA | Pure MPA | Hybrid SSR+SPA | Hybrid SSG |
|--------|----------|----------|----------------|------------|
| **First Load** | Slow (1-3s) | Fast (200-500ms) | Fast (200-500ms FCP, 1-2s TTI) | Extremely fast (100-300ms) |
| **Navigation** | Instant (50-200ms) | Slow (500-1000ms) | Instant (50-200ms) | Instant (50-200ms) |
| **SEO** | Poor | Excellent | Excellent | Excellent |
| **UX** | Rich | Basic | Rich | Rich |
| **Server Load** | Low | High | Medium | Very low (CDN) |
| **Complexity** | Medium | Low | High | Medium |
| **Data Freshness** | Real-time | Real-time | Real-time | Stale (until rebuild) |

**Follow-up I Expect**:

Q: 'SSR vs SSG, which to choose?'
A: **SSR** (`getServerSideProps`): **Dynamic data** (user profiles, dashboards, real-time data, stock prices, live scores, changes frequently), server renders every request (200-500ms fresh data always up-to-date), higher server load (CPU rendering), **use when data must be real-time**. **SSG** (`getStaticProps`): **Static data** (blogs, docs, marketing, product catalogs, changes infrequently), pre-render at build time (100-300ms instant CDN), extremely fast low server load, data stale until rebuild (ISR `revalidate` rebuild periodically hourly), **use when instant load critical data can be stale**. **Hybrid approach**: SSG for public pages (homepage marketing docs, SEO-critical fast load), SSR for authenticated pages (dashboards profiles, dynamic personalized). **Example**: E-commerce product listings SSG (fast load SEO), checkout SSR (personalized real-time inventory).

Q: 'Islands architecture vs full SSR?'
A: **Islands** (Astro Fresh): **Content-heavy sites** (blogs docs marketing, mostly static text images few interactive parts search filters), most content static HTML (no JavaScript zero overhead fast TTI), interactive parts islands (React Vue components hydrated selectively 50KB total), **benefits minimal JS** (50KB vs 2MB 40× smaller fast), **progressive enhancement** (works without JS content readable), **use when content >> interactivity** (docs site: static articles + interactive search box). **Full SSR** (Next.js Nuxt): **App-like sites** (e-commerce SaaS social media, high interactivity entire page needs JavaScript), entire page hydrated (1-2MB JavaScript framework + app), **benefits rich UX** (complex state management routing animations), **use when interactivity >> content** (Twitter dashboard: interactive feed tweets real-time updates). **Trade-off**: Islands faster simpler less JS (but limited to simple interactions), Full SSR richer UX full framework power (but heavier 2MB vs 50KB)."

---

## 5. Code Examples

See Deep-Dive section for comprehensive examples covering:
- SSR implementation (Next.js `getServerSideProps`)
- SSG implementation (Next.js `getStaticProps`, ISR)
- Islands architecture (Astro selective hydration)
- Progressive hydration (React 18 Suspense, lazy loading)

---

## 6. Why & How Summary

### Why It Matters

**Best of Both Worlds**: Combines MPA benefits (fast first load 200-500ms SEO-friendly server-rendered HTML crawlable by Googlebot indexed in search results) with SPA benefits (instant navigation 50-200ms no page reloads rich UX smooth animations optimistic updates), critical for modern web apps (e-commerce SaaS content sites) that need both SEO (organic traffic conversions) and rich interactivity (desktop-like experience user engagement)  
**Performance**: Fast first load (server HTML 200-500ms FCP visible content immediately vs pure SPA 1-3s TTI large bundle parse compile execute slow), faster TTI (hydration 1-2s vs pure SPA 2-3s smaller bundle code-split), instant navigation (client-side routing 50-200ms vs MPA 500-1000ms full reload white screen flicker), improves conversions (Airbnb 50% faster first load 20% higher bookings, Twitter 30% lower bounce rate faster perceived load)  
**SEO Excellence**: Server-rendered HTML (Googlebot sees complete content immediately no JavaScript execution needed crawlable indexed), critical for public content (e-commerce product pages rank in Google search traffic, blogs news articles indexed, marketing sites organic search), real-world impact (Airbnb 30% better SEO property listings ranked organic traffic increased revenue, Twitter tweets indexed in Google search results visibility)  
**Flexibility**: Multiple patterns (SSR + SPA dynamic real-time data Next.js Nuxt.js, SSG + hydration static content blogs docs Gatsby extremely fast CDN, Islands architecture content-heavy minimal interactivity Astro 50KB vs 2MB, Progressive hydration prioritize visible content React 18 faster perceived TTI), choose based on needs (e-commerce SSR dynamic, blog SSG static fast, docs Islands minimal JS)

### How It Works

**SSR + SPA Pattern** (Next.js Nuxt.js SvelteKit): First visit (user requests /products, server fetches data API database, server renders React Vue components to HTML complete page, server responds with HTML ~50KB embedded data, browser displays HTML fast 200-500ms FCP content visible immediately SEO-friendly, browser downloads JavaScript app.js ~500KB-1MB smaller than pure SPA 2-5MB code-split, JavaScript hydrates HTML attaches event listeners onClick onChange activates React Vue components, page becomes interactive TTI 1-2s faster than pure SPA 2-3s), subsequent navigation (user clicks link /products/123, client-side routing React Router Vue Router intercepts preventDefault no page reload, fetch data from API JSON response 50-200ms lightweight, update DOM Virtual DOM diff efficient re-render, total 50-200ms instant smooth no white screen like SPA), benefits (fast first load server HTML 200-500ms vs pure SPA 1-3s, SEO excellent server HTML crawlable, instant navigation client-side routing 50-200ms vs MPA 500-1000ms reload, rich UX animations optimistic updates state management), frameworks (Next.js React SSR SSG ISR getServerSideProps getStaticProps, Nuxt.js Vue SSR SSG asyncData fetch, SvelteKit Svelte SSR SSG load functions, Remix React SSR loader actions)  
**SSG + Hydration Pattern** (Gatsby Next.js Static Eleventy): Build time (npm run build, fetch data from CMS API at build time once Contentful WordPress GraphQL, pre-render all pages to static HTML index.html posts/post-1.html products.html generate complete HTML files, save to dist folder static files ready to deploy, deploy to CDN Vercel Netlify CloudFlare edge locations worldwide), runtime user visits (user requests /posts/post-1, CDN serves pre-rendered post-1.html instant 100-300ms closest edge server no server rendering zero latency, browser downloads JavaScript app.js ~500KB optional for interactivity, JavaScript hydrates HTML attaches event listeners enables SPA navigation, page becomes interactive TTI 800ms-1.5s fast most content already rendered static, subsequent clicks client-side routing 50-200ms instant SPA-like), benefits (extremely fast first load 100-300ms static CDN vs SSR 200-500ms server rendering vs SPA 1-3s large bundle, SEO excellent static HTML pre-rendered crawlable, low server load zero server rendering static files CDN handles millions of requests scalable, high availability CDN distributed no single point of failure), ISR Incremental Static Regeneration (Next.js revalidate 3600 rebuild every hour, stale-while-revalidate serve old page while rebuilding background, fresh page to next users, balances static speed with data freshness), trade-off (data stale until rebuild not suitable real-time data stock prices live scores user profiles, must rebuild deploy to update content acceptable for blogs docs marketing content changes infrequently)  
**Islands Architecture** (Astro Fresh Eleventy Alpine): Concept (most content static HTML no JavaScript zero overhead, interactive parts islands React Vue Preact Svelte components hydrated selectively only where needed, total JavaScript 50KB vs 2MB full SPA 40× smaller), implementation (page structure: header static HTML no JS, hero static HTML no JS, article content static Markdown rendered HTML no JS, search box interactive island React component hydrated client:load JavaScript shipped, code snippets interactive island syntax highlighting hydrated, footer static HTML no JS, result JavaScript only for search + code snippets 50KB total), Astro directives (client:load hydrate immediately page load, client:visible hydrate when scrolled into view IntersectionObserver lazy, client:idle hydrate when browser idle requestIdleCallback low priority, client:media hydrate on media query mobile only, no directive static HTML no JavaScript shipped), benefits (minimal JavaScript 50KB vs 2MB faster TTI 300ms vs 2s 85% reduction, SEO excellent static HTML crawlable, progressive enhancement works without JavaScript content readable text images accessible enhances with islands interactivity, simple architecture static files no complex hydration strategy), trade-off (limited to simple interactions islands work independently no shared global state complex apps need full framework, best for content-heavy sites blogs docs marketing where content >> interactivity)  
**Progressive Hydration** (React 18 Suspense Qwik): Problem (traditional hydration loads all JavaScript upfront 2MB parse compile hydrate entire tree slow TTI 2-3s blocks user interaction), solution (hydrate components progressively prioritize critical visible content defer below-fold components lazy load low-priority parts when idle), React 18 implementation (lazy load heavy components React.lazy import HeavyComponent, Suspense boundaries wrap deferred components fallback Spinner, hydration phases: Phase 1 critical Header Hero FeaturedProducts visible above fold hydrate immediately, Phase 2 below fold ProductRecommendations Reviews defer hydration lazy load when scrolled, Phase 3 low priority Newsletter Footer hydrate when idle requestIdleCallback, result TTI 500ms critical content vs 2s full hydration 4× faster perceived performance), benefits (faster perceived TTI visible content interactive quickly users can interact sooner no waiting, better UX no blocking on heavy components page feels faster responsive, optimal resource usage prioritize critical defer non-critical efficient use CPU network), frameworks (React 18 Suspense Selective Hydration concurrent features, Qwik resumability serialize state on server resume on client zero hydration instant interactive, Marko async rendering progressive streaming)

**FAANG Expectation**: Define hybrid rendering (combines SSR first page fast SEO with SPA subsequent navigation instant rich UX best of both worlds), core patterns (SSR + SPA Next.js Nuxt.js server render first page hydrate SPA navigation dynamic data, SSG + hydration Gatsby static pre-render CDN extremely fast hydrate SPA data stale rebuild, Islands Astro static HTML + selective hydration minimal JS content-heavy, Progressive React 18 prioritize visible defer below-fold faster perceived TTI), architecture flow (SSR + SPA: first visit server render HTML 200-500ms FCP hydrate 1-2s TTI subsequent client-side routing 50-200ms instant, SSG: build time pre-render static HTML runtime CDN 100-300ms instant hydrate 800ms-1.5s subsequent SPA 50-200ms, Islands: static HTML no JS + islands hydrated 50KB total TTI 300ms fast), benefits (fast first load 200-500ms server HTML vs pure SPA 1-3s, SEO excellent server HTML crawlable vs pure SPA poor, instant navigation 50-200ms client-side vs MPA 500-1000ms reload, rich UX animations optimistic vs MPA basic), disadvantages (complexity higher than pure SPA or MPA server infrastructure Node.js hydration state management coordination, server load higher than SPA static but lower than MPA full rendering, hydration cost download JavaScript 500KB-1MB attach events 1-2s TTI vs static HTML no hydration), when to use (SSR + SPA: e-commerce SaaS social media need SEO + rich UX dynamic data real-time Twitter Airbnb Next.js, SSG + hydration: blogs docs marketing static content changes infrequently extremely fast load critical Gatsby, Islands: content-heavy sites blogs docs marketing mostly static few interactive parts minimal JS Astro, Progressive: large pages prioritize visible faster perceived TTI React 18), real-world examples (Next.js Vercel SSR + SPA 40% better SEO 50% faster first load, Gatsby SSG blogs docs extremely fast 100-300ms CDN, Astro Islands minimal JS 50KB vs 2MB fast TTI 300ms, Twitter migrated pure SPA → SSR + SPA 50% faster first load 30% lower bounce rate SEO improved tweets indexed, Airbnb migrated pure SPA → SSR + SPA 50% faster 5s → 2.5s 30% better SEO 20% higher bookings lesson hybrid best for public content SEO + rich interactions), trade-offs (SSR vs SSG: SSR dynamic real-time data fresh always higher server load use for dashboards profiles personalized, SSG static data stale until rebuild extremely fast CDN low server load use for blogs docs marketing ISR rebuild periodically balance, Islands vs Full SSR: Islands content-heavy minimal JS 50KB fast simple limited interactions docs blogs, Full SSR app-like high interactivity 2MB rich UX complex state e-commerce SaaS), implementation (Next.js getServerSideProps SSR fetch data server render props, getStaticProps SSG build time pre-render revalidate ISR, Astro client:load visible idle media directives control hydration, React 18 lazy Suspense progressive hydration defer below-fold)
