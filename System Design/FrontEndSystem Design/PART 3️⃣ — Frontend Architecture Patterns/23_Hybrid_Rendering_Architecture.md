# 23. Hybrid Rendering Architecture

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Hybrid Rendering Architecture** is a modern frontend architecture pattern that **combines multiple rendering strategies** (SSR, CSR, SSG, ISR) within a single application to optimize for different requirements across different pages or routes.

### What It Is
- An architecture that uses **different rendering approaches for different parts** of an application
- Leverages the strengths of multiple rendering strategies simultaneously
- Allows per-page or per-route optimization based on specific needs

### Why It Exists
- **No single rendering strategy is optimal for all use cases**
- Marketing pages benefit from SSG (SEO, speed)
- Dashboards benefit from CSR (interactivity, personalization)
- Product pages may need SSR (SEO + dynamic data)
- Content pages may use ISR (fresh content without rebuilding)

### When and Where It's Used
- **E-commerce platforms**: Static landing pages, SSR product pages, CSR checkout flows
- **SaaS applications**: Static marketing site, SSR docs, CSR dashboard
- **Content platforms**: SSG blog posts, SSR dynamic pages, CSR interactive tools
- **Social media**: SSR feed pages, CSR real-time updates

### Role in Large-Scale Applications
- Enables **granular performance optimization** per route
- Reduces infrastructure costs by statically generating when possible
- Improves SEO where needed, performance where critical
- Supports gradual migration from one rendering strategy to another

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Architecture Components

#### 1. **Routing Layer with Strategy Detection**
```
Request → Router → Rendering Strategy Selector → Appropriate Renderer
```

- Router determines which rendering strategy to use based on:
  - Route configuration
  - User authentication state
  - A/B testing flags
  - Performance budget
  - SEO requirements

#### 2. **Mixed Rendering Pipeline**

**SSG Routes** (Build Time)
- Static pages generated during build
- Served from CDN edge locations
- No server computation on request
- Example: `/about`, `/blog/*`, `/pricing`

**SSR Routes** (Request Time)
- Server renders on each request
- Fresh data on every load
- Slower TTFB but better SEO
- Example: `/product/:id`, `/user/:username`

**CSR Routes** (Client Time)
- JavaScript-heavy pages
- Authenticated sections
- Real-time dashboards
- Example: `/dashboard/*`, `/admin/*`, `/chat`

**ISR Routes** (Hybrid - Build + Revalidation)
- Generated statically but revalidated periodically
- Best of SSG + freshness
- Example: `/news/:slug`, `/inventory/:id`

### Browser-Level Behavior

#### Initial Load
```
1. Request to /product/123
2. Server detects route → SSR strategy
3. Server fetches data, renders HTML
4. HTML + minimal JS sent to browser
5. Browser paints content (FCP fast)
6. Hydration happens (TTI)
```

#### Subsequent Navigation
```
1. Click link to /dashboard
2. Client-side router intercepts
3. Detects CSR route → fetches JSON data
4. React/framework renders on client
5. SPA-like experience
```

### Data Flow Architecture

**Unified Data Layer**
```typescript
// Adaptive data fetching based on rendering context
interface DataFetchStrategy {
  buildTime?: () => Promise<Data>;    // For SSG
  serverTime?: (req) => Promise<Data>; // For SSR
  clientTime?: () => Promise<Data>;    // For CSR
}
```

### State Management Complexity

**Hydration Boundary Issues**
- State initialized on server (SSR) must match client hydration
- Timestamp mismatches cause hydration errors
- Serialization challenges (Date, undefined, functions)

**Navigation State Transitions**
- SSR page → CSR page: Need to bootstrap client state
- CSR page → SSR page: May lose client-only state
- Solution: Persist critical state to localStorage/sessionStorage

### Performance Implications

#### Bundle Size
- **Challenge**: Different routes need different code
- **Solution**: Aggressive code-splitting per rendering strategy
- Static pages: Minimal JS (just hydration runtime)
- Dynamic pages: Full app bundle

#### Time to Interactive (TTI)
- **SSG pages**: Fastest TTI (pre-rendered, minimal hydration)
- **SSR pages**: Medium TTI (hydration required)
- **CSR pages**: Slowest initial TTI (full client render)

#### Network Waterfall
```
SSG: HTML → (minimal JS)
SSR: HTML + data → hydration JS → interactive
CSR: HTML shell → JS bundle → data fetch → render → interactive
```

### Scalability Considerations

#### CDN Distribution
- **SSG/ISR routes**: Fully cacheable at edge (Cloudflare, Fastly)
- **SSR routes**: Cache with short TTL or per-user cache key
- **CSR routes**: HTML shell cached, data APIs handled separately

#### Server Load Patterns
- Static routes: Zero server load (served from CDN)
- SSR routes: Server CPU per request (need horizontal scaling)
- CSR routes: Server load only for API calls

**Cost Optimization**
- 80% of pages SSG → 80% reduction in server costs
- 15% of pages ISR → Periodic rebuilds, edge cached
- 5% of pages SSR → Dynamic, but limited server load

### Trade-offs

| Aspect | Benefit | Cost |
|--------|---------|------|
| **Complexity** | Optimal performance per route | Higher cognitive load, more testing |
| **Infrastructure** | Reduced server costs | More complex build pipeline |
| **Developer Experience** | Flexibility | Need to understand multiple paradigms |
| **Debugging** | Granular control | Issues can be SSR-only or CSR-only |
| **Maintenance** | Optimize where needed | Context switching between strategies |

### Common Pitfalls

1. **Inconsistent Data Between Strategies**
   - SSG page shows old data
   - SSR page shows fresh data
   - User confused by inconsistency
   - **Solution**: ISR with reasonable revalidation, or consistent caching

2. **Hydration Mismatches**
   - Server HTML doesn't match client hydration
   - React/framework throws errors
   - **Solution**: Careful state serialization, avoid client-only code in SSR

3. **Over-Engineering**
   - Using hybrid architecture when simple CSR would suffice
   - Premature optimization
   - **Solution**: Start simple, measure, then optimize

4. **Build Time Explosion**
   - Generating 100,000 static pages takes hours
   - **Solution**: Defer to ISR or SSR for long-tail pages

5. **Navigation UX Inconsistencies**
   - SSR pages feel different from CSR pages
   - Loading states inconsistent
   - **Solution**: Unified loading UI, consistent transitions

### Real-World Failure Scenarios

**Case 1: E-commerce Flash Sale**
- Product pages were SSG (fast but stale)
- Flash sale prices not updated until rebuild
- Lost sales due to wrong pricing
- **Fix**: Moved to ISR with 1-minute revalidation

**Case 2: Social Media Feed**
- Feed was SSR for SEO
- Server couldn't handle traffic spike
- TTFB went from 200ms to 5s
- **Fix**: Hybrid: SSR for first page, CSR for scroll

**Case 3: Dashboard with SSR**
- Used SSR for "faster initial load"
- But dashboard had user-specific data
- Couldn't cache anything
- Slower than CSR
- **Fix**: Moved to CSR with skeleton loading

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: E-Commerce (Amazon/Shopify Pattern)

**Route Strategy Breakdown**

```
/                           → SSG   (Homepage, rarely changes)
/category/:id               → SSG   (Category pages, rebuild daily)
/product/:id                → ISR   (Product pages, revalidate every 60s)
/cart                       → CSR   (User-specific, no SEO needed)
/checkout                   → CSR   (Secure, user-specific)
/search?q=:query            → SSR   (SEO important, dynamic)
/account/*                  → CSR   (Authenticated, personalized)
```

**Scaling Journey**

**Phase 1: All CSR**
- Simple React SPA
- Good for initial launch
- SEO problems surface
- Google not indexing products

**Phase 2: Add SSR for Product Pages**
- Product pages now server-rendered
- SEO improves dramatically
- Server costs increase 10x
- TTFB suffers under load

**Phase 3: Hybrid Architecture**
- Static pages → SSG
- Product pages → ISR (60s revalidation)
- Cart/Checkout → CSR
- **Result**: 90% of traffic served from CDN, SEO excellent, costs down 80%

### Example 2: SaaS Platform (Notion/Vercel Pattern)

```
/                           → SSG   (Marketing homepage)
/pricing                    → SSG   (Pricing page)
/docs/*                     → SSG   (Documentation, rebuild on publish)
/blog/*                     → SSG   (Blog posts)
/templates/*                → ISR   (Community templates, fresh data)
/dashboard/*                → CSR   (User workspace, real-time)
/api-playground             → CSR   (Interactive tool)
```

**Why This Works**
- Marketing pages are static, load instantly, perfect SEO
- Docs are versioned, static generation makes sense
- Dashboard is SPA, no SEO needed, highly interactive
- Templates use ISR to balance freshness and performance

### Example 3: News Platform (NYTimes/Medium Pattern)

```
/                           → ISR   (Homepage, revalidate every 5 min)
/article/:slug              → ISR   (Articles, revalidate every 30 min)
/breaking-news              → SSR   (Real-time, can't be stale)
/author/:id                 → SSR   (Dynamic, personalized)
/comments/:articleId        → CSR   (Real-time, interactive)
/trending                   → SSR   (Fresh data critical)
```

**Trade-off**: Homepage uses ISR (5min revalidation)
- Most users see cached version (fast)
- Breaking news might be delayed 5 minutes
- Acceptable trade-off for 10x better performance

### Example 4: Social Media (Twitter/LinkedIn Pattern)

```
/login                      → SSG   (Static login page)
/:username                  → SSR   (Public profiles, SEO)
/feed                       → SSR   (First load for SEO)
/feed (scroll)              → CSR   (Infinite scroll, real-time)
/notifications              → CSR   (Real-time, user-specific)
/messages                   → CSR   (Real-time, WebSocket)
/explore                    → SSR   (Discovery, SEO)
```

**Hybrid Feed Strategy**
- **First load**: SSR for initial 10 posts (SEO, fast FCP)
- **Scroll**: Client-side fetching (real-time, infinite)
- **New posts**: Client polling/WebSocket (real-time updates)
- **Result**: Best of both worlds

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

> "Hybrid rendering architecture is about **combining multiple rendering strategies within a single application** to optimize each route based on its specific requirements.
>
> For example, in an e-commerce platform, I'd use **SSG for the homepage and category pages** since they rarely change and SEO is critical. For **product pages, I'd use ISR** with a 60-second revalidation window to balance freshness with performance. The **cart and checkout would be CSR** since they're user-specific and don't need SEO.
>
> The key is **making per-route decisions** based on:
> - SEO requirements
> - Data freshness needs
> - Personalization level
> - Performance targets
> - Server cost constraints
>
> In my previous role, we migrated from pure SSR to hybrid architecture and **reduced server costs by 80%** while **improving Core Web Vitals by 40%**. The trade-off was increased complexity in our build pipeline and the need for better monitoring across different rendering strategies."

### Likely Follow-Up Questions

**Q1: How do you handle navigation between different rendering strategies?**

> "I use a **client-side router that's aware of rendering strategies**. When navigating from an SSR page to a CSR page, the router does a soft navigation using the History API and fetches just the data needed for the CSR page.
>
> For state consistency, I serialize critical state (user session, preferences) to sessionStorage during SSR, then rehydrate on CSR pages. For transitions, I show a unified loading UI regardless of the underlying strategy.
>
> The key is making it feel like a single SPA even though different pages use different rendering methods."

**Q2: How do you decide which rendering strategy to use for a specific page?**

> "I use a decision matrix based on four key factors:
>
> **1. SEO Requirements**
>    - High → SSG, ISR, or SSR
>    - Low/None → CSR
>
> **2. Data Freshness**
>    - Static → SSG
>    - Minutes → ISR
>    - Seconds → SSR
>    - Real-time → CSR
>
> **3. Personalization**
>    - None → SSG/ISR
>    - User-specific → CSR or SSR (with no cache)
>
> **4. Traffic Volume**
>    - High → SSG/ISR (CDN offload)
>    - Low → SSR acceptable
>
> For example, a product page with high traffic, good SEO needs, and price updates every few minutes is perfect for ISR."

**Q3: What are the performance implications of hybrid architecture?**

> "Performance varies by strategy:
>
> **SSG pages**:
> - TTFB: <50ms (CDN)
> - FCP: Very fast
> - TTI: Fast (minimal hydration)
>
> **SSR pages**:
> - TTFB: 200-500ms (server render)
> - FCP: Fast (HTML ready)
> - TTI: Medium (hydration)
>
> **CSR pages**:
> - TTFB: <50ms (HTML shell)
> - FCP: Slow (wait for JS)
> - TTI: Slow (render + interactive)
>
> The **key optimization is aggressive code splitting**. SSG pages should ship <50KB JS, while CSR dashboard pages can ship more since they're behind auth.
>
> I also use **resource hints** (prefetch, preload) to optimize transitions between strategies."

**Q4: How do you handle build times with many static pages?**

> "Build time is a critical concern. For applications with thousands of pages, I use **progressive generation**:
>
> **1. Popular Pages at Build Time**
>    - Generate top 1000 pages during build
>    - Ensures fast initial deployment
>
> **2. Long-tail Pages On-Demand**
>    - Use ISR with `fallback: 'blocking'` (Next.js)
>    - First request generates page, subsequent requests served from cache
>
> **3. Parallel Builds**
>    - Split builds across multiple workers
>    - Use incremental builds (only rebuild changed pages)
>
> **4. Smart Revalidation**
>    - Don't revalidate all pages on every deploy
>    - Use webhook-based revalidation for content changes
>
> This approach reduced our build time from 4 hours to 15 minutes."

**Q5: How do you debug issues that only happen in one rendering strategy?**

> "I use **rendering-aware observability**:
>
> **1. Logging Tags**
>    - Tag all logs with rendering strategy (SSR/CSR/SSG)
>    - Helps filter issues quickly
>
> **2. Environment Detection**
>    ```javascript
>    const isServer = typeof window === 'undefined';
>    const isSSR = isServer;
>    const isCSR = !isServer;
>    ```
>
> **3. Conditional Error Tracking**
>    - Send rendering context with error reports
>    - Sentry/Datadog tags: `rendering_strategy: 'SSR'`
>
> **4. Testing Strategy**
>    - Unit tests for logic
>    - Integration tests per rendering strategy
>    - E2E tests for cross-strategy navigation
>
> **Common SSR-only bugs**: Date serialization, window references, third-party scripts
>
> **Common CSR-only bugs**: Missing SEO meta tags, slow initial load
>
> **Common hydration bugs**: State mismatches between server and client"

### Comparison with Alternative Approaches

| Approach | When to Use | Trade-offs |
|----------|-------------|------------|
| **Pure CSR** | Simple apps, dashboards, no SEO needed | Worst SEO, slow FCP, simple architecture |
| **Pure SSR** | SEO critical everywhere, dynamic data | High server costs, TTFB slow under load |
| **Pure SSG** | Fully static sites, blogs | Can't handle dynamic data, build time issues |
| **Hybrid** | Most production apps | Best performance/cost, complex architecture |

**When NOT to use Hybrid**:
- Small projects (premature optimization)
- Fully static sites (SSG sufficient)
- Fully dynamic dashboards (CSR sufficient)
- When team lacks experience with multiple strategies

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Next.js Hybrid Configuration

```typescript
// pages/index.tsx - SSG
export async function getStaticProps() {
  return {
    props: {
      content: 'Static homepage content',
    },
    revalidate: false, // Never revalidate
  };
}

// pages/product/[id].tsx - ISR
export async function getStaticProps({ params }) {
  const product = await fetchProduct(params.id);
  
  return {
    props: { product },
    revalidate: 60, // Revalidate every 60 seconds
  };
}

export async function getStaticPaths() {
  return {
    paths: [
      { params: { id: 'popular-product-1' } },
      { params: { id: 'popular-product-2' } },
    ],
    fallback: 'blocking', // Generate other pages on-demand
  };
}

// pages/search.tsx - SSR
export async function getServerSideProps({ query }) {
  const results = await searchProducts(query.q);
  
  return {
    props: { results },
    // No revalidate - renders on every request
  };
}

// pages/dashboard/index.tsx - CSR
export default function Dashboard() {
  const { data, loading } = useQuery(GET_USER_DATA);
  
  if (loading) return <DashboardSkeleton />;
  
  return <DashboardContent data={data} />;
}
```

**Why This Structure?**
- Homepage doesn't change → SSG for maximum performance
- Product pages need freshness → ISR balances speed and freshness
- Search needs real-time results → SSR ensures latest data
- Dashboard is user-specific → CSR avoids server load

### Example 2: Custom Routing Layer

```typescript
// lib/renderingStrategy.ts
type RenderingStrategy = 'SSG' | 'ISR' | 'SSR' | 'CSR';

interface RouteConfig {
  pattern: RegExp;
  strategy: RenderingStrategy;
  revalidate?: number;
}

const routeConfigs: RouteConfig[] = [
  { pattern: /^\/$/, strategy: 'SSG' },
  { pattern: /^\/about/, strategy: 'SSG' },
  { pattern: /^\/product\/[^/]+$/, strategy: 'ISR', revalidate: 60 },
  { pattern: /^\/search/, strategy: 'SSR' },
  { pattern: /^\/dashboard/, strategy: 'CSR' },
  { pattern: /^\/cart/, strategy: 'CSR' },
];

export function getStrategyForRoute(pathname: string): RouteConfig {
  return routeConfigs.find(config => config.pattern.test(pathname)) 
    || { pattern: /.*/, strategy: 'CSR' }; // Default to CSR
}

// Middleware to handle strategy routing
export function renderingMiddleware(req, res, next) {
  const strategy = getStrategyForRoute(req.path);
  
  // Attach strategy to request for logging/monitoring
  req.renderingStrategy = strategy.strategy;
  
  // Set cache headers based on strategy
  if (strategy.strategy === 'SSG') {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (strategy.strategy === 'ISR') {
    res.setHeader('Cache-Control', `public, s-maxage=${strategy.revalidate}, stale-while-revalidate`);
  } else if (strategy.strategy === 'SSR') {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  }
  
  next();
}
```

**Why This Code?**
- **Centralized strategy configuration** makes it easy to change routing
- **Automatic cache header management** ensures correct CDN behavior
- **Monitoring-friendly** with strategy attached to request
- **Performance impact**: Cache headers ensure CDN serves static content efficiently

### Example 3: Unified Data Fetching Layer

```typescript
// lib/dataFetcher.ts
interface DataFetchConfig<T> {
  buildTime?: () => Promise<T>;      // For SSG
  serverTime?: (req: Request) => Promise<T>; // For SSR
  clientTime?: () => Promise<T>;     // For CSR
}

class UnifiedDataFetcher {
  async fetch<T>(
    config: DataFetchConfig<T>,
    context: 'build' | 'server' | 'client',
    req?: Request
  ): Promise<T> {
    switch (context) {
      case 'build':
        if (!config.buildTime) throw new Error('No build-time fetcher');
        return config.buildTime();
      
      case 'server':
        if (!config.serverTime) throw new Error('No server-time fetcher');
        return config.serverTime(req!);
      
      case 'client':
        if (!config.clientTime) throw new Error('No client-time fetcher');
        return config.clientTime();
    }
  }
}

// Usage example
const productFetcher: DataFetchConfig<Product> = {
  // For SSG/ISR - fetch from API at build time
  buildTime: async () => {
    const response = await fetch('https://api.example.com/products/popular');
    return response.json();
  },
  
  // For SSR - fetch with user context
  serverTime: async (req) => {
    const response = await fetch(`https://api.example.com/products`, {
      headers: {
        'Cookie': req.headers.cookie,
        'User-Agent': req.headers['user-agent'],
      },
    });
    return response.json();
  },
  
  // For CSR - fetch with auth token
  clientTime: async () => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('https://api.example.com/products', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },
};
```

**Why This Abstraction?**
- **Same data source, different contexts** handled elegantly
- **Type-safe** with TypeScript generics
- **Easy to test** each fetching strategy independently
- **Production benefit**: Single source of truth for data fetching logic

### Example 4: State Persistence Across Strategies

```typescript
// lib/stateSync.ts
interface SerializableState {
  user: UserData | null;
  cart: CartItem[];
  preferences: UserPreferences;
}

// Server-side: Serialize state for client hydration
export function serializeState(state: SerializableState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64');
}

// Client-side: Deserialize state from server
export function deserializeState(encoded: string): SerializableState {
  return JSON.parse(Buffer.from(encoded, 'base64').toString());
}

// React hook for state persistence
export function useHybridState<T>(
  key: string,
  initialState: T
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    // Try to restore from sessionStorage (CSR navigation)
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse stored state', e);
        }
      }
    }
    return initialState;
  });
  
  const setAndPersist = useCallback((value: T) => {
    setState(value);
    // Persist to sessionStorage for CSR navigation
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  }, [key]);
  
  return [state, setAndPersist];
}

// Usage in a hybrid app
function UserProfile() {
  const [user, setUser] = useHybridState('user', null);
  
  // This works whether page is SSR, CSR, or navigated from either
  return <div>{user?.name}</div>;
}
```

**Why This Works?**
- **Consistent state** across SSR → CSR navigation
- **sessionStorage** survives page refreshes but not new tabs (correct for session data)
- **Safe hydration** with proper typeof checks
- **Performance**: Avoids state loss during strategy transitions

### Example 5: Progressive Enhancement Pattern

```typescript
// components/ProductCard.tsx
interface ProductCardProps {
  product: Product;
  renderingStrategy: 'SSR' | 'CSR';
}

export function ProductCard({ product, renderingStrategy }: ProductCardProps) {
  const [isInteractive, setIsInteractive] = useState(false);
  
  useEffect(() => {
    // Mark as interactive once hydrated (SSR) or rendered (CSR)
    setIsInteractive(true);
  }, []);
  
  const handleAddToCart = async () => {
    if (!isInteractive) return; // Prevent clicks during hydration
    
    // CSR: Optimistic update
    if (renderingStrategy === 'CSR') {
      optimisticallyAddToCart(product);
    }
    
    await addToCart(product.id);
  };
  
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} loading="lazy" />
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      
      {/* Button is rendered but disabled until interactive */}
      <button
        onClick={handleAddToCart}
        disabled={!isInteractive}
        className={isInteractive ? 'interactive' : 'loading'}
      >
        Add to Cart
      </button>
    </div>
  );
}
```

**Why This Pattern?**
- **Progressive enhancement**: Works even before JS loads
- **Prevents hydration click bugs**: Button disabled until hydrated
- **Different optimizations per strategy**: CSR can use optimistic updates
- **Production benefit**: Better UX during hydration, prevents race conditions

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why Hybrid Rendering Matters

**User Experience Impact**
- **Faster perceived performance**: Right strategy for right content
- **Better SEO**: Search engines index server-rendered content
- **Improved interactivity**: CSR for dynamic sections
- **Offline capability**: SSG/ISR work with service workers

**Business Impact**
- **80% reduction in server costs** (move to CDN)
- **40% improvement in Core Web Vitals** (faster LCP, CLS)
- **Higher conversion rates** (faster pages = more sales)
- **Better SEO rankings** (Google favors fast, well-indexed sites)

**Technical Impact**
- **Scalability**: SSG/ISR offload to CDN
- **Flexibility**: Can evolve per-route without full rewrite
- **Resilience**: CDN-served content survives server outages
- **Developer productivity**: Use best tool for each job

### How Hybrid Rendering Works

**Technical Summary**

1. **Build Phase**
   - Framework identifies SSG routes
   - Generates static HTML for each route
   - Outputs to CDN-ready directory

2. **Request Phase (SSR/ISR)**
   - Router determines rendering strategy
   - SSR: Server renders on every request
   - ISR: Serves cached version, revalidates in background

3. **Client Phase (CSR)**
   - Minimal HTML shell served
   - JavaScript bundle loads
   - Client fetches data and renders

4. **Navigation Phase**
   - Client-side router intercepts
   - Fetches data based on target route strategy
   - Smooth SPA-like transitions

**Key Technologies**
- **Next.js**: Built-in hybrid support (getStaticProps, getServerSideProps)
- **Remix**: Nested routing with different strategies
- **Astro**: Island architecture with partial hydration
- **SvelteKit**: Adapters for different platforms
- **Custom**: Express/Fastify with strategic rendering middleware

**Implementation Checklist**
- ✅ Route-level strategy configuration
- ✅ Unified data fetching layer
- ✅ State persistence across strategies
- ✅ Cache header management
- ✅ Code splitting per strategy
- ✅ Monitoring/observability per strategy
- ✅ Testing across all strategies

### Final Thought for Interviews

> "Hybrid rendering is not about using every technique everywhere—it's about **strategic optimization** based on data-driven decisions. Measure your pages, understand your constraints, then apply the right strategy to each route. The best architecture is the one that **balances performance, cost, and complexity** for your specific use case."
