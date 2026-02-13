# 24. Micro-Frontend Architecture

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Micro-Frontend Architecture** is an architectural pattern that **decomposes a monolithic frontend application into smaller, independently deployable frontend applications** (micro-frontends) that work together to form a cohesive user experience. It applies the principles of microservices to the frontend layer.

### What It Is
- An architectural style where a **frontend application is divided into semi-independent "micro-apps"**
- Each micro-frontend is:
  - **Owned by a single team** (end-to-end ownership: design → frontend → backend)
  - **Independently deployable** (no coordination needed)
  - **Technology agnostic** (can use different frameworks/versions)
  - **Loosely coupled** (minimal dependencies on other micro-frontends)
- Integrated at runtime through various composition techniques (iframes, Web Components, Module Federation, etc.)

### Why It Exists
- **Organizational scaling**: Large companies (100+ frontend developers) hit coordination bottlenecks with monoliths
- **Team autonomy**: Product teams want full control over their domain without blocking others
- **Independent deployments**: Deploy checkout flow without risking the entire e-commerce site
- **Technology flexibility**: Gradually migrate from Angular to React without rewriting everything
- **Parallel development**: 10 teams work on different features simultaneously without merge conflicts
- **Bounded context**: Each micro-frontend owns a clear business domain (catalog, checkout, profile)

### When and Where It's Used
- **Large enterprise applications**: IKEA, Spotify, Zalando, SAP, Dazn
- **E-commerce platforms**: Multiple teams owning catalog, cart, checkout, profile
- **SaaS products**: Dashboard, settings, billing as separate micro-frontends
- **Banking/Finance**: Different teams owning accounts, transfers, investments, loans
- **Content platforms**: CMS editors, preview, publishing as separate applications

### Role in Large-Scale Frontend Applications
- **Primary scaling mechanism** for organizations with 50+ frontend developers
- Enables **horizontal team scaling** (add teams without slowing down existing teams)
- Supports **incremental modernization** (replace parts of legacy system gradually)
- Provides **deployment isolation** (bugs in one micro-frontend don't affect others)
- Facilitates **A/B testing** at the micro-frontend level (test entire new checkout flow)

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Core Architecture Patterns

#### 1. **Build-Time Integration** (Simplest, Least Flexible)

```
Build Phase:
  Micro-Frontend A (npm package @company/mfe-catalog)
  Micro-Frontend B (npm package @company/mfe-checkout)
  Micro-Frontend C (npm package @company/mfe-profile)
          ↓
  Imported by Shell Application
          ↓
  Single bundle deployed
```

**How It Works**:
```javascript
// Shell app
import CatalogApp from '@company/mfe-catalog';
import CheckoutApp from '@company/mfe-checkout';

function Shell() {
  return (
    <Router>
      <Route path="/catalog" component={CatalogApp} />
      <Route path="/checkout" component={CheckoutApp} />
    </Router>
  );
}
```

**Pros**:
- Simple to implement
- Type-safe (TypeScript across boundaries)
- No runtime overhead

**Cons**:
- Not truly independent (all deployed together)
- Requires coordinated releases
- Defeats most benefits of micro-frontends

**When to Use**: Small teams transitioning from monolith, want modularity without runtime complexity

#### 2. **Server-Side Integration** (Edge-Side Includes / SSI)

```
User Request → Edge Server (Nginx/CDN)
                    ↓
      ┌─────────────┴─────────────┐
      ↓                            ↓
  Catalog Service           Checkout Service
  (Returns HTML)            (Returns HTML)
      ↓                            ↓
      └─────────────┬─────────────┘
                    ↓
          Composed HTML to Browser
```

**How It Works**:
```html
<!-- Nginx config -->
<html>
  <body>
    <!--# include virtual="/catalog-service/header" -->
    <!--# include virtual="/catalog-service/products" -->
    <!--# include virtual="/checkout-service/cart-summary" -->
  </body>
</html>
```

**Pros**:
- Fast initial load (server-composed HTML)
- SEO-friendly (complete HTML)
- Simple client-side (just HTML)

**Cons**:
- Limited interactivity (hard to share state)
- Edge server becomes complex
- Caching challenges

**When to Use**: Content-heavy sites, SEO critical, limited interactivity

#### 3. **Client-Side Integration via iframes** (High Isolation)

```html
<!-- Shell app -->
<div class="layout">
  <header>Shell Navigation</header>
  <main>
    <iframe src="https://catalog.example.com" id="catalog-mfe"></iframe>
    <iframe src="https://checkout.example.com" id="checkout-mfe"></iframe>
  </main>
</div>
```

**Pros**:
- **Complete isolation**: Styles, JS, DOM don't conflict
- **Security**: Strong sandbox boundary
- **Technology agnostic**: Each iframe can use any framework
- **Independent deployments**: Update iframe source URL

**Cons**:
- **Poor performance**: Each iframe = full browser context (memory, CPU)
- **UX challenges**: Routing, history management broken
- **Slow rendering**: Browser treats each iframe as separate page load
- **State sharing**: Complex via postMessage
- **Accessibility**: Screen readers struggle with iframes
- **Styling**: Can't share global styles, inconsistent look

**Browser Impact**:
- Each iframe = separate document context (memory overhead ~5-10MB)
- Separate JavaScript heap per iframe
- Separate CSS parser and layout engine
- **Example**: 5 iframes = 5× memory, 5× style calculation

**When to Use**: Strong isolation needed (security, third-party content), can sacrifice UX

#### 4. **Client-Side Integration via JavaScript** (Most Common)

**Sub-Pattern A: Single-SPA Framework**
```javascript
// Shell uses single-spa to orchestrate micro-frontends
import { registerApplication, start } from 'single-spa';

registerApplication({
  name: '@company/catalog',
  app: () => System.import('@company/catalog'),
  activeWhen: ['/catalog'],
});

registerApplication({
  name: '@company/checkout',
  app: () => System.import('@company/checkout'),
  activeWhen: ['/checkout'],
});

start();
```

**Sub-Pattern B: Module Federation (Webpack 5+)**
```javascript
// Shell webpack.config.js
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        catalog: 'catalog@https://catalog.example.com/remoteEntry.js',
        checkout: 'checkout@https://checkout.example.com/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
};

// Shell app
const CatalogApp = lazy(() => import('catalog/App'));
```

**Sub-Pattern C: Web Components**
```html
<!-- Each micro-frontend exposes Web Components -->
<catalog-app></catalog-app>
<checkout-app></checkout-app>

<script src="https://catalog.example.com/bundle.js"></script>
<script src="https://checkout.example.com/bundle.js"></script>
```

**Pros**:
- True runtime independence
- Flexible integration
- Good performance (shared dependencies)

**Cons**:
- Complex error handling
- Challenging state management
- Version conflicts possible

#### 5. **Hybrid Approach** (Production Reality)

Most large-scale implementations use a **combination**:
```
┌─────────────────────────────────────────────────┐
│            Shell (Host Application)             │
│  • Global navigation                            │
│  • Authentication                               │
│  • Routing                                      │
└─────────────────────────────────────────────────┘
           ↓                    ↓
  ┌────────────────┐    ┌──────────────────┐
  │ Catalog MFE    │    │ Checkout MFE     │
  │ (Module Fed)   │    │ (Module Fed)     │
  └────────────────┘    └──────────────────┘
           ↓
  ┌────────────────┐
  │ Analytics      │
  │ (Iframe)       │  ← Isolated for security
  └────────────────┘
```

### Browser-Level Architecture

#### Page Load Sequence

```
1. User navigates to example.com
   ↓
2. Shell HTML + JS loads (200KB)
   TTFB: 100ms, FCP: 500ms
   ↓
3. Shell initializes, determines route (/checkout)
   ↓
4. Fetches checkout MFE remoteEntry.js (10KB)
   +200ms
   ↓
5. Fetches checkout MFE chunks (150KB)
   +300ms
   ↓
6. Shared dependencies negotiated (React)
   +50ms
   ↓
7. Checkout MFE mounts and renders
   TTI: 1.2s total
```

**Performance Comparison**:
```
Monolith SPA:
  Initial bundle: 2MB
  TTI: 4-6s

Micro-Frontends (Optimized):
  Shell: 200KB
  First MFE: 150KB
  TTI: 1-2s (for first route)
  
Micro-Frontends (Naive):
  Shell: 200KB
  5 MFEs loaded eagerly: 5×150KB = 750KB
  TTI: 2-3s (worse than optimized)
```

#### Memory Management

**Challenge**: Multiple React instances
```
Shell: React 18.2.0 (loaded)
Catalog MFE: React 18.2.0 (shared singleton ✓)
Checkout MFE: React 18.1.0 (compatible, uses shell's ✓)
Admin MFE: React 17.0.0 (incompatible, loads own ✗)

Result: 2 React instances in memory (40KB + 40KB)
```

**Solution**: Strict version ranges in shared dependencies
```javascript
shared: {
  react: {
    singleton: true,
    requiredVersion: '^18.0.0',
    strictVersion: true, // Fail if incompatible
  },
}
```

### State Management Across Micro-Frontends

**Challenge**: How do micro-frontends communicate?

#### Option 1: Shared State via Shell (Tight Coupling)
```javascript
// Shell exposes global store
window.__GLOBAL_STATE__ = createStore();

// Micro-frontends import
const store = window.__GLOBAL_STATE__;
```

**Pros**: Simple, type-safe
**Cons**: Tight coupling, defeats micro-frontend benefits

#### Option 2: Event Bus (Loose Coupling)
```javascript
// Shell provides event bus
class EventBus {
  private listeners = new Map();
  
  publish(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
  
  subscribe(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
}

window.__EVENT_BUS__ = new EventBus();

// Catalog MFE publishes
window.__EVENT_BUS__.publish('ITEM_ADDED_TO_CART', { itemId: '123' });

// Checkout MFE subscribes
window.__EVENT_BUS__.subscribe('ITEM_ADDED_TO_CART', (data) => {
  updateCartCount(data.itemId);
});
```

**Pros**: Loose coupling, flexible
**Cons**: Harder to debug, potential memory leaks, no type safety

#### Option 3: Browser Storage (Async Communication)
```javascript
// Catalog MFE writes
localStorage.setItem('cart', JSON.stringify({ items: [...] }));
window.dispatchEvent(new CustomEvent('cart-updated'));

// Checkout MFE listens
window.addEventListener('storage', (e) => {
  if (e.key === 'cart') {
    const cart = JSON.parse(e.newValue);
    updateUI(cart);
  }
});
```

**Pros**: Persistent, survives navigation
**Cons**: Storage limits, synchronization issues, no type safety

#### Option 4: Custom Events (Web Standard)
```javascript
// Catalog MFE dispatches
window.dispatchEvent(new CustomEvent('mfe:cart:add', {
  detail: { itemId: '123', quantity: 1 }
}));

// Checkout MFE listens
window.addEventListener('mfe:cart:add', (event) => {
  const { itemId, quantity } = event.detail;
  addToCart(itemId, quantity);
});
```

**Pros**: Browser-native, framework-agnostic
**Cons**: No type safety, debugging harder

#### Option 5: Shared API Client (Recommended for Most)
```javascript
// Shell exposes API client
window.__API_CLIENT__ = {
  cart: {
    add: (itemId) => fetch('/api/cart/add', { ... }),
    get: () => fetch('/api/cart', { ... }),
  },
  user: {
    get: () => fetch('/api/user', { ... }),
  },
};

// Both MFEs use same API client
// Server is source of truth
// MFEs fetch latest state when mounted
```

**Pros**: Server is source of truth, consistent state
**Cons**: More network requests, latency

### Scalability Considerations

#### Team Structure

**Conway's Law**: System design mirrors org structure

```
Traditional Monolith:
  Frontend Team (20 devs) ← Bottleneck
  Backend Team (30 devs)
  
Micro-Frontends:
  Catalog Team (5 FE + 5 BE)  ← Autonomous
  Checkout Team (5 FE + 5 BE)
  Profile Team (5 FE + 5 BE)
  Admin Team (5 FE + 5 BE)
```

**Impact**:
- **Before**: 1 deployment per week (coordination overhead)
- **After**: 50+ deployments per week (team autonomy)

#### Deployment Strategy

**Blue-Green Deployment per Micro-Frontend**
```
Catalog MFE:
  v1.2.3 (live at https://catalog.example.com/v1.2.3/)
  v1.2.4 (staging at https://catalog.example.com/v1.2.4/)
  
Shell config:
  catalog: 'catalog@https://catalog.example.com/v1.2.3/remoteEntry.js'
  
Rollout:
  1. Deploy v1.2.4 to staging URL
  2. Test with feature flag (10% users)
  3. Monitor metrics for 1 hour
  4. If success, update shell config to v1.2.4
  5. If failure, instant rollback (just change config)
```

#### CDN Strategy

```
CloudFlare/Fastly Edge
  ↓
Shell: https://cdn.example.com/shell/v2.1.0/
  ├─ index.html (cache: 5min)
  └─ main.js (cache: immutable, versioned URL)

Catalog MFE: https://cdn.example.com/catalog/v1.5.0/
  ├─ remoteEntry.js (cache: 5min)
  └─ chunks (cache: immutable)

Checkout MFE: https://cdn.example.com/checkout/v3.2.1/
  ├─ remoteEntry.js (cache: 5min)
  └─ chunks (cache: immutable)
```

**Cache Strategy**:
- **remoteEntry.js**: Short cache (5min) to enable updates
- **Chunks**: Long cache (1 year) with versioned URLs
- **Shell HTML**: Short cache (5min) for routing updates

### Trade-offs & Decision Framework

| Aspect | Monolith | Micro-Frontends |
|--------|----------|-----------------|
| **Team Autonomy** | Low (shared codebase) | High (separate repos) |
| **Deployment** | Coordinated | Independent |
| **Initial Complexity** | Low | High |
| **Runtime Complexity** | Low | Medium-High |
| **Performance** | Better (single bundle) | Worse (multiple requests) |
| **Consistency** | Easy (shared styles) | Hard (governance needed) |
| **Technology Flexibility** | None (one framework) | High (mix frameworks) |
| **State Management** | Easy (global store) | Hard (cross-MFE comms) |
| **Testing** | Easier (e2e in one app) | Harder (cross-MFE flows) |
| **Bundle Size** | Larger (duplication) | Smaller (code splitting) |

### Common Pitfalls & Anti-Patterns

#### 1. **Too Many Micro-Frontends (Over-Segmentation)**

**Anti-Pattern**:
```
Button MFE
Input MFE
Modal MFE
Header MFE
Footer MFE
→ 50+ micro-frontends for 1 app
```

**Problem**: Coordination overhead > benefits
**Solution**: Micro-frontends should represent **business domains**, not UI components

**Right Granularity**:
```
Catalog MFE (products, search, filters)
Checkout MFE (cart, payment, confirmation)
Profile MFE (settings, orders, addresses)
→ 3-5 micro-frontends for medium app
```

#### 2. **Shared Dependencies Version Hell**

**Problem**:
```
Shell: React 18.2.0, Lodash 4.17.0
Catalog: React 18.1.0, Lodash 4.17.0 (compatible)
Checkout: React 17.0.0, Lodash 3.10.0 (incompatible!)

Result:
- 2 React instances loaded (80KB wasted)
- 2 Lodash versions loaded (50KB wasted)
- Potential runtime bugs (different Lodash APIs)
```

**Solution**:
- Strict semantic versioning
- Automated compatibility checks in CI
- Centralized dependency management team

#### 3. **Inconsistent UX Across Micro-Frontends**

**Problem**:
- Catalog team uses blue buttons
- Checkout team uses green buttons
- Profile team uses different fonts
- **Result**: Looks like 3 different websites

**Solution**: Shared design system (enforced)
```javascript
// All MFEs must use shared design system
shared: {
  '@company/design-system': {
    singleton: true,
    eager: true,
  },
}
```

#### 4. **Performance Degradation from Eager Loading**

**Anti-Pattern**:
```javascript
// Load all micro-frontends on page load
import('catalog/App');
import('checkout/App');
import('profile/App');
import('admin/App');
// 600KB loaded, user only needs catalog (150KB)
```

**Solution**: Lazy load per route
```javascript
const CatalogApp = lazy(() => import('catalog/App'));
// Only loads when user navigates to /catalog
```

#### 5. **Tight Coupling Through Shared State**

**Anti-Pattern**:
```javascript
// Checkout MFE directly accesses Catalog MFE internals
import { catalogStore } from 'catalog/store';
catalogStore.getState().products; // Tight coupling!
```

**Solution**: Communication via contracts (events/APIs)
```javascript
// Checkout MFE listens to public events
eventBus.subscribe('catalog:product-selected', (product) => {
  addToCart(product);
});
```

### Real-World Failure Scenarios

**Case 1: Spotify Desktop App**
- **Architecture**: Micro-frontends via iframes
- **Problem**: 15 iframes on single page, 500MB memory usage
- **Impact**: App sluggish on low-end devices, frequent crashes
- **Fix**: Migrated to Module Federation, reduced to 150MB

**Case 2: IKEA E-commerce**
- **Architecture**: 8 micro-frontends, shared dependencies
- **Problem**: One team updated React 16→17, broke 3 other MFEs
- **Impact**: Production outage, 2 hours downtime
- **Fix**: Implemented strict shared dependency policy, CI checks

**Case 3: Zalando Fashion Store**
- **Architecture**: Micro-frontends per product category
- **Problem**: Each MFE loaded own analytics library (50KB × 8 = 400KB)
- **Impact**: 2s TTI regression
- **Fix**: Shell loads analytics once, MFEs use shared instance

**Case 4: SAP Business Suite**
- **Architecture**: 20+ micro-frontends, event bus communication
- **Problem**: Memory leaks from unsubscribed event listeners
- **Impact**: Browser tab crashes after 30min
- **Fix**: Automatic cleanup on MFE unmount

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: E-Commerce Platform (Amazon-Scale)

**Business Requirement**: 500+ developers, 20 product teams, need independent deployments

**Micro-Frontend Boundaries** (Business Domains):
```
┌──────────────────────────────────────────────────┐
│         Shell / Container (Shell Team)           │
│  • Global navigation, auth, routing              │
│  • https://amazon.com                            │
└──────────────────────────────────────────────────┘
              ↓          ↓          ↓
    ┌─────────────┬──────────────┬──────────────┐
    │   Catalog   │   Checkout   │   Account    │
    │  (Team A)   │   (Team B)   │   (Team C)   │
    │             │              │              │
    │ Products    │ Cart         │ Orders       │
    │ Search      │ Payment      │ Settings     │
    │ Filters     │ Shipping     │ Addresses    │
    │             │              │              │
    │ /products   │ /checkout    │ /account     │
    └─────────────┴──────────────┴──────────────┘
```

**Technical Implementation**:

```javascript
// Shell routing configuration
const routes = [
  {
    path: '/',
    component: lazy(() => import('catalog/HomePage')),
  },
  {
    path: '/product/:id',
    component: lazy(() => import('catalog/ProductPage')),
  },
  {
    path: '/checkout',
    component: lazy(() => import('checkout/CheckoutFlow')),
    preload: true, // Preload on hover
  },
  {
    path: '/account/*',
    component: lazy(() => import('account/AccountApp')),
  },
];
```

**Communication Pattern**:
```javascript
// User adds product to cart in Catalog MFE
function ProductPage() {
  const handleAddToCart = () => {
    // 1. Call backend API
    await api.cart.add(productId);
    
    // 2. Publish event for other MFEs
    eventBus.publish('cart:updated', { count: newCount });
    
    // 3. Show local feedback
    showToast('Added to cart');
  };
}

// Cart icon in Shell listens
function CartIcon() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    eventBus.subscribe('cart:updated', ({ count }) => {
      setCount(count);
    });
  }, []);
  
  return <Badge count={count}>🛒</Badge>;
}
```

**Scaling Journey**:

**Year 1: Monolith** (50 developers)
- Single React app, 2MB bundle
- Deploy once per week
- 1 frontend team, coordination easy

**Year 2: Modular Monolith** (150 developers)
- Codebase split into modules
- Still single deployment
- Merge conflicts frequent
- Deploy time: 30min

**Year 3: Micro-Frontends** (500 developers)
- 8 micro-frontends, 20 product teams
- Independent deployments (50+ per day)
- Deploy time: 5min per MFE
- Coordination reduced 90%

**Performance Evolution**:
```
Monolith (Year 1):
  Bundle: 2MB
  TTI: 6s
  LCP: 3.5s

Micro-Frontends (Year 3):
  Shell: 200KB
  First MFE: 300KB
  TTI: 1.8s (67% improvement)
  LCP: 1.2s (66% improvement)
```

### Example 2: SaaS Dashboard (Salesforce-Style)

**Architecture**: Feature-based micro-frontends

```
Main App Shell
├── Dashboard MFE (/dashboard)
├── Reports MFE (/reports)
├── Settings MFE (/settings)
├── Admin MFE (/admin) ← Only for admin users
└── Integrations MFE (/integrations)
```

**Conditional Loading Based on User Role**:
```javascript
// Shell dynamically loads MFEs based on permissions
function App() {
  const { user } = useAuth();
  
  const routes = useMemo(() => {
    const baseRoutes = [
      { path: '/dashboard', mfe: 'dashboard' },
      { path: '/reports', mfe: 'reports' },
      { path: '/settings', mfe: 'settings' },
    ];
    
    if (user.role === 'admin') {
      baseRoutes.push({
        path: '/admin',
        mfe: 'admin', // Only loaded for admins
      });
    }
    
    return baseRoutes;
  }, [user]);
  
  return (
    <Router>
      {routes.map(route => (
        <Route
          key={route.path}
          path={route.path}
          component={lazy(() => import(`${route.mfe}/App`))}
        />
      ))}
    </Router>
  );
}
```

**Benefits**:
- Regular users don't download admin code (security + performance)
- Admin MFE can use different tech stack (e.g., React Admin library)
- Admin team deploys independently

### Example 3: Banking Application (Multi-Brand)

**Scenario**: White-label banking platform, 5 different banks, shared core functionality

```
Core Platform (Shell)
  ├─ Shared components (login, navigation)
  └─ Business logic MFEs:
      ├─ Accounts MFE (view balances)
      ├─ Transfers MFE (send money)
      ├─ Loans MFE (apply for loans)
      └─ Investments MFE (manage portfolio)

Brand-Specific:
  ├─ Bank A Theme MFE
  ├─ Bank B Theme MFE
  └─ Bank C Theme MFE
```

**Theme Loading**:
```javascript
// Determine bank from subdomain
const bank = window.location.hostname.split('.')[0]; // bank-a.platform.com

// Load bank-specific theme MFE
const ThemeProvider = lazy(() =>
  import(`theme-${bank}/ThemeProvider`)
);

function App() {
  return (
    <ThemeProvider>
      <AccountsMFE />
      <TransfersMFE />
    </ThemeProvider>
  );
}
```

**Benefits**:
- Core banking logic shared (accounts, transfers)
- Each bank customizes look & feel
- Add new bank = just deploy new theme MFE
- Core updates don't require bank-specific changes

### Example 4: Content Management System

**Architecture**: Editor-focused micro-frontends

```
CMS Shell
├── Content Editor MFE (WYSIWYG editor)
├── Media Library MFE (images, videos)
├── SEO Tools MFE (meta tags, sitemap)
├── Analytics MFE (page views, traffic)
└── Preview MFE (live preview - iframe for security)
```

**Special Case: Preview MFE**
```html
<!-- Preview must be isolated (user content could have malicious scripts) -->
<iframe
  sandbox="allow-scripts allow-same-origin"
  src="/preview"
  style="width: 100%; height: 600px;"
></iframe>
```

**Why iframe here?**
- User-generated content could contain `<script>` tags
- Strong isolation prevents XSS attacks
- Preview doesn't need to communicate much with main app

### Example 5: Video Streaming Platform (Netflix-Style)

**Architecture**: Content-type based micro-frontends

```
Streaming Platform Shell
├── Browse MFE (homepage, search)
├── Player MFE (video player - heavy, 500KB)
├── Profile MFE (user settings)
└── Kids MFE (separate UI for children)
```

**Performance Optimization**:
```javascript
// Don't load player until user clicks video
function VideoCard({ video }) {
  const [showPlayer, setShowPlayer] = useState(false);
  
  if (showPlayer) {
    const Player = lazy(() => import('player/VideoPlayer'));
    return (
      <Suspense fallback={<PlayerSkeleton />}>
        <Player videoId={video.id} />
      </Suspense>
    );
  }
  
  return (
    <div onClick={() => setShowPlayer(true)}>
      <img src={video.thumbnail} />
    </div>
  );
}
```

**Result**:
- Browse page: 300KB (fast)
- Player loads only when needed: +500KB
- 90% of users browse without playing → Save bandwidth

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

> "Micro-frontend architecture is a pattern that **decomposes a monolithic frontend into smaller, independently deployable applications** that are composed at runtime to form a cohesive user experience.
>
> At [Company], we had 200+ frontend engineers working on an e-commerce platform. Our monolithic React app became unmaintainable—merge conflicts, slow builds (20min), and coordinated deploys blocked teams.
>
> We split the application into **5 micro-frontends based on business domains**:
> - Catalog (product listing, search)
> - Checkout (cart, payment)
> - Account (profile, orders)
> - CMS (content management)
> - Admin (internal tools)
>
> **Technical Implementation:**
> - Used **Webpack Module Federation** for runtime integration
> - Shell application handles routing and auth
> - Each micro-frontend is:
>   - Owned by a dedicated team (5-7 engineers)
>   - Deployed independently to CDN
>   - Versioned separately
>   - Can use different React versions (within compatible range)
>
> **Communication:** Event-bus pattern for loose coupling
> ```javascript
> // Catalog publishes when item added to cart
> eventBus.publish('cart:updated', { itemId, count });
> 
> // Checkout subscribes to update cart icon
> eventBus.subscribe('cart:updated', updateCartBadge);
> ```
>
> **Key Trade-offs:**
>
> **Pros:**
> - **Team velocity**: 50+ deploys/day (vs 1/week before)
> - **Isolation**: Catalog bug doesn't break checkout
> - **Performance**: Smaller initial bundles (300KB vs 2MB)
> - **Autonomy**: Teams iterate faster without coordination
>
> **Cons:**
> - **Complexity**: More infra (Module Federation, event bus)
> - **Consistency**: Need design system enforcement
> - **Testing**: E2E tests across micro-frontends harder
> - **Overhead**: Network requests for each MFE
>
> **Impact:**
> - Build time: 20min → 5min (75% reduction)
> - Deploy frequency: 1/week → 50/day (50× increase)
> - TTI: 5s → 2s (60% improvement)
> - Team satisfaction: Huge improvement (no more blocked deploys)"

### Likely Follow-Up Questions

#### Q1: How do you handle shared state between micro-frontends?

> "There are four main approaches, each with trade-offs:
>
> **1. Server as Source of Truth** (My preferred approach)
> - Each micro-frontend fetches its own data from backend
> - When state changes, MFE updates backend
> - Other MFEs refetch when they mount or receive event
>
> Example:
> ```javascript
> // Catalog adds to cart
> await api.cart.add(itemId);
> eventBus.publish('cart:updated');
> 
> // Checkout listens and refetches
> useEffect(() => {
>   const handler = () => refetchCart();
>   eventBus.subscribe('cart:updated', handler);
>   return () => eventBus.unsubscribe('cart:updated', handler);
> }, []);
> ```
>
> **Pros**: Consistent state, no sync issues
> **Cons**: More network requests
>
> **2. Event Bus** (For non-critical updates)
> - Publish events when state changes
> - Other MFEs listen and update their local state
>
> **Pros**: Real-time updates, loose coupling
> **Cons**: Potential inconsistencies, harder debugging
>
> **3. LocalStorage + Events**
> - Write to localStorage, dispatch custom event
> - Persistent across reloads
>
> **Cons**: 5MB limit, sync across tabs tricky
>
> **4. Shared State Module** (Avoid if possible)
> - Shell exposes global store (Redux/Zustand)
> - All MFEs import and use
>
> **Cons**: Tight coupling, defeats micro-frontend benefits
>
> **My Recommendation**: Use #1 (Server as source of truth) for critical state (cart, user), #2 (Event bus) for UI updates (notifications, toast messages)"

#### Q2: How do you ensure consistent UX across micro-frontends owned by different teams?

> "Consistency is the biggest challenge. We used a **multi-layered approach**:
>
> **1. Shared Design System (Enforced)**
> ```javascript
> // All MFEs must use shared design system
> shared: {
>   '@company/design-system': {
>     singleton: true,
>     eager: true,
>     requiredVersion: '^2.0.0',
>   },
> }
> ```
> - Button, Input, Modal components standardized
> - CI fails if MFE doesn't use design system
> - Design team maintains, product teams consume
>
> **2. Shared Navigation**
> - Shell owns global navigation
> - MFEs can't modify (consistency guaranteed)
>
> **3. Design Review Process**
> - New features require design approval
> - Design system team reviews quarterly
> - Automated visual regression tests (Chromatic)
>
> **4. Shared Theme Tokens**
> ```javascript
> // All MFEs use CSS variables
> --color-primary: #0066FF;
> --spacing-base: 8px;
> ```
> - Theme changes apply to all MFEs instantly
>
> **5. Cross-Team Guild**
> - Frontend guild meets bi-weekly
> - Share patterns, discuss inconsistencies
> - Propose design system additions
>
> **Enforcement**:
> - ESLint rules: Must import from design system
> - CI visual regression: Catches UI drift
> - Design QA: Random spot checks
>
> **Real Impact**:
> - Design consistency: 98% (measured via automated audits)
> - Design QA time: 60% reduction (fewer inconsistencies)
> - New feature time: 40% faster (pre-built components)"

#### Q3: What are the performance implications compared to a monolithic SPA?

> "Performance is nuanced—micro-frontends can be faster or slower depending on implementation:
>
> **Potential Improvements:**
>
> **1. Smaller Initial Bundle**
> ```
> Monolith: 2MB upfront
> Micro-Frontend: 300KB shell + 200KB first MFE = 500KB
> → 75% reduction in initial load
> ```
>
> **2. Better Code Splitting**
> - Load only what user needs
> - Catalog user doesn't download checkout code
>
> **3. Independent Caching**
> - Catalog update doesn't invalidate checkout cache
> - Better cache hit ratio
>
> **4. Parallel Loading**
> - Multiple MFEs load in parallel (HTTP/2)
>
> **Potential Regressions:**
>
> **1. Duplicate Dependencies**
> ```
> Bad: Each MFE bundles own React
> Shell: React (40KB)
> Catalog: React (40KB)
> Checkout: React (40KB)
> → 120KB total (3× overhead)
> 
> Good: Shared React via Module Federation
> Shell: React (40KB)
> Catalog: uses shell's React
> Checkout: uses shell's React
> → 40KB total ✓
> ```
>
> **2. Extra Network Requests**
> ```
> Monolith: 1 request (main.js)
> Micro-Frontend: 5 requests (shell + 4 remoteEntry.js)
> → Mitigated by HTTP/2 multiplexing and preloading
> ```
>
> **3. Runtime Integration Overhead**
> - Module resolution: ~50ms per MFE
> - Dependency negotiation: ~20ms
> - Total overhead: ~200ms (acceptable)
>
> **Optimization Strategies:**
>
> ```javascript
> // 1. Preload critical MFEs
> <link rel="modulepreload" href="catalog/remoteEntry.js">
> 
> // 2. Prefetch on hover
> <Link
>   to="/checkout"
>   onMouseEnter={() => import('checkout/App')}
> >
>   Checkout
> </Link>
> 
> // 3. Lazy load non-critical MFEs
> const AdminMFE = lazy(() => import('admin/App'));
> 
> // 4. Shared dependencies (singleton)
> shared: ['react', 'react-dom', 'lodash']
> ```
>
> **Real Metrics** (Our Production):
> - **LCP**: 2.5s → 1.2s (52% improvement)
> - **TTI**: 5s → 2s (60% improvement)
> - **FCP**: 2s → 0.8s (60% improvement)
> - **Bundle size**: 2MB → 500KB first load (75% reduction)
>
> **Key Takeaway**: Micro-frontends can be more performant IF:
> - Shared dependencies configured correctly
> - Lazy loading implemented properly
> - CDN caching optimized"

#### Q4: How do you handle versioning and deployment?

> "Versioning is critical for independent deployments. We use a **multi-tier strategy**:
>
> **1. Semantic Versioning for Each MFE**
> ```
> catalog@2.5.3
> checkout@1.9.0
> account@3.1.2
> ```
>
> **2. Immutable Deployments**
> ```
> https://cdn.example.com/catalog/v2.5.3/remoteEntry.js
> https://cdn.example.com/checkout/v1.9.0/remoteEntry.js
> ```
> - Each version gets unique URL
> - Old versions remain accessible (instant rollback)
> - Cache-Control: immutable, max-age=31536000
>
> **3. Shell Configuration**
> ```javascript
> // config.json (served with short cache)
> {
>   \"remotes\": {
>     \"catalog\": \"catalog@https://cdn.example.com/catalog/v2.5.3/remoteEntry.js\",
>     \"checkout\": \"checkout@https://cdn.example.com/checkout/v1.9.0/remoteEntry.js\"
>   }
> }
> ```
>
> **4. Deployment Flow**
> ```
> 1. Catalog team merges PR
> 2. CI builds catalog v2.5.4
> 3. Deploy to CDN: /catalog/v2.5.4/
> 4. Run smoke tests
> 5. Update config.json:
>    \"catalog\": \"...v2.5.4/remoteEntry.js\"
> 6. Shell refetches config (5min cache)
> 7. New users get v2.5.4
> 8. Existing users get v2.5.4 on next navigation
> ```
>
> **5. Gradual Rollout**
> ```javascript
> // Feature flag service
> const catalogVersion = featureFlags.get('catalog.version', {
>   userId: user.id,
>   default: 'v2.5.3',
>   rollout: {
>     'v2.5.4': 0.10, // 10% of users
>   },
> });
> ```
>
> **6. Rollback Strategy**
> ```
> Problem detected in catalog v2.5.4
> → Update config.json to v2.5.3 (instant)
> → All users back on stable version in <5min
> ```
>
> **7. Breaking Changes**
> - Deprecation policy: Warn in v2.x, remove in v3.0
> - Maintain backward compatibility for 6 months
> - Shell supports multiple MFE versions during transition
>
> **8. Shared Dependency Versioning**
> ```javascript
> // All MFEs must be compatible
> shared: {
>   react: { requiredVersion: '^18.0.0' },
> }
> 
> // CI fails if incompatible version detected
> ```
>
> **Real Impact**:
> - Deploy time: 30min → 5min (per MFE)
> - Rollback time: 2 hours → 2 minutes
> - Zero-downtime deployments: 100% (was 60%)
> - Deploy confidence: High (easy rollback)"

#### Q5: When should you NOT use micro-frontends?

> "Micro-frontends are not a silver bullet. Avoid them when:
>
> **1. Small Team (<20 developers)**
> - Overhead > benefits
> - Coordination is still manageable
> - Single deployment is fine
> - **Use instead**: Well-structured monolith with modules
>
> **2. Low Deployment Frequency (<1 per week)**
> - No pressure for independent deployments
> - Not worth the complexity
> - **Use instead**: Monolith with good CI/CD
>
> **3. Tight Coupling Required**
> - Features heavily interdependent
> - Constant communication between "micro-frontends"
> - Shared state everywhere
> - **Sign**: If you need lots of cross-MFE communication, wrong boundaries
>
> **4. Simple Application**
> - 5-10 pages, straightforward UX
> - No clear domain boundaries
> - **Use instead**: Standard SPA
>
> **5. Early Stage Startup**
> - Product still finding market fit
> - Requirements change rapidly
> - Need to move fast
> - **Use instead**: Monolith until >50 developers
>
> **6. Performance is Critical (Low-end Devices)**
> - Network overhead unacceptable
> - Every KB matters
> - **Trade-off**: Monolith might perform better
>
> **7. No Clear Domain Boundaries**
> - Can't identify independent business domains
> - Everything touches everything
> - **Fix**: Refactor to establish boundaries first
>
> **Decision Framework:**
>
> **Use Micro-Frontends IF:**
> - ✅ Team > 50 developers
> - ✅ Need independent deployments (multiple per day)
> - ✅ Clear domain boundaries (catalog, checkout, admin)
> - ✅ Different teams own different domains
> - ✅ Regulatory/organizational independence needed
>
> **Stick with Monolith IF:**
> - ❌ Team < 20 developers
> - ❌ Deploy < 1 per week
> - ❌ Simple application
> - ❌ Tight coupling everywhere
> - ❌ Early stage, rapid iteration
>
> **Red Flags** (Don't Use Micro-Frontends):
> - \"We want to try micro-frontends because it's cool\"
> - \"Maybe it will help us scale someday\"
> - \"Other companies use it, so should we\"
>
> **Green Lights** (Good Reasons):
> - \"We have 100 developers, deploys take 1 hour\"
> - \"Teams block each other, need independence\"
> - \"Different teams own catalog, checkout, admin\"
> - \"Want to migrate from Angular to React incrementally\"
>
> In my experience, micro-frontends solve **organizational problems**, not technical ones. If you don't have org scaling issues, don't add the complexity."

### Comparison with Alternative Approaches

| Approach | Team Size | Deployment | Complexity | When to Use |
|----------|-----------|------------|------------|-------------|
| **Monolith** | 1-20 | Weekly | Low | Small teams, simple apps |
| **Modular Monolith** | 20-50 | Weekly | Medium | Medium teams, want modularity |
| **Micro-Frontends** | 50+ | Daily/Hourly | High | Large teams, need autonomy |
| **Monorepo** | 20-100 | Daily | Medium | Shared codebase, coordinated releases |

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Module Federation Configuration

**Shell Application (Host)**

```javascript
// webpack.config.js (Shell)
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const path = require('path');

module.exports = {
  entry: './src/index',
  mode: 'production',
  output: {
    publicPath: 'https://shell.example.com/',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      filename: 'remoteEntry.js',
      remotes: {
        catalog: 'catalog@https://catalog.example.com/remoteEntry.js',
        checkout: 'checkout@https://checkout.example.com/remoteEntry.js',
        account: 'account@https://account.example.com/remoteEntry.js',
      },
      exposes: {
        // Shell can also expose modules
        './EventBus': './src/shared/EventBus',
        './AuthContext': './src/shared/AuthContext',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.2.0',
          eager: false, // Load when needed
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.0.0',
        },
        '@company/design-system': {
          singleton: true,
          requiredVersion: '^2.0.0',
          eager: true, // Load immediately
        },
      },
    }),
  ],
};
```

```typescript
// src/App.tsx (Shell)
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './shared/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingFallback } from './components/LoadingFallback';

// Lazy load micro-frontends
const CatalogApp = lazy(() => import('catalog/App'));
const CheckoutApp = lazy(() => import('checkout/App'));
const AccountApp = lazy(() => import('account/App'));

function Shell() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="shell-layout">
          {/* Global navigation */}
          <header>
            <nav>
              <Link to="/">Catalog</Link>
              <Link to="/checkout">Checkout</Link>
              <Link to="/account">Account</Link>
            </nav>
          </header>

          {/* Micro-frontend rendering area */}
          <main>
            <ErrorBoundary fallback={<ErrorFallback />}>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/*" element={<CatalogApp />} />
                  <Route path="/checkout/*" element={<CheckoutApp />} />
                  <Route path="/account/*" element={<AccountApp />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default Shell;
```

**Catalog Micro-Frontend (Remote)**

```javascript
// webpack.config.js (Catalog MFE)
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  entry: './src/index',
  mode: 'production',
  output: {
    publicPath: 'https://catalog.example.com/',
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'catalog',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App',
        './ProductPage': './src/pages/ProductPage',
      },
      remotes: {
        // Catalog can also consume from shell
        shell: 'shell@https://shell.example.com/remoteEntry.js',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'react-router-dom': { singleton: true },
        '@company/design-system': { singleton: true, eager: true },
      },
    }),
  ],
};
```

```typescript
// src/App.tsx (Catalog MFE)
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { EventBus } from 'shell/EventBus'; // Import from shell
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';

function CatalogApp() {
  return (
    <div className="catalog-app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/product/:id" element={<ProductPage />} />
      </Routes>
    </div>
  );
}

export default CatalogApp;
```

**Why This Structure?**
- **Shell handles routing**: Consistency across MFEs
- **Lazy loading**: Each MFE loads only when route accessed
- **Error boundaries**: One MFE crash doesn't break others
- **Shared dependencies**: Single React instance, 40KB saved per MFE
- **Production benefit**: Deploy catalog without touching shell or checkout

### Example 2: Event Bus for Cross-MFE Communication

```typescript
// shared/EventBus.ts (Exposed by Shell)
type EventCallback = (data: any) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const callbacks = this.events.get(event)!;
    callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Publish an event
   */
  publish(event: string, data?: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get all active event names (for debugging)
   */
  getActiveEvents(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Clear all subscriptions (for cleanup/testing)
   */
  clear(): void {
    this.events.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
```

**Usage in Catalog MFE**:
```typescript
// pages/ProductPage.tsx
import { eventBus } from 'shell/EventBus';
import { Button } from '@company/design-system';

function ProductPage({ productId }) {
  const handleAddToCart = async () => {
    try {
      // 1. Update backend
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      const cart = await response.json();

      // 2. Publish event for other MFEs
      eventBus.publish('cart:item-added', {
        productId,
        quantity: 1,
        totalItems: cart.totalItems,
      });

      // 3. Show local feedback
      showToast('Added to cart!');
    } catch (error) {
      showToast('Failed to add to cart', { type: 'error' });
    }
  };

  return (
    <div>
      <h1>{product.name}</h1>
      <Button onClick={handleAddToCart}>Add to Cart</Button>
    </div>
  );
}
```

**Usage in Checkout MFE (Listening)**:
```typescript
// components/CartBadge.tsx
import { eventBus } from 'shell/EventBus';

function CartBadge() {
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    // Subscribe to cart updates
    const unsubscribe = eventBus.subscribe('cart:item-added', (data) => {
      setItemCount(data.totalItems);
      
      // Optionally show animation
      triggerBadgeAnimation();
    });

    // Initial fetch
    fetchCartCount().then(setItemCount);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="cart-badge">
      🛒 {itemCount}
    </div>
  );
}
```

**Why This Pattern?**
- **Loose coupling**: Catalog doesn't know about Checkout
- **Type-safe**: Can add TypeScript event definitions
- **Memory safe**: Automatic cleanup with unsubscribe
- **Error isolation**: One handler error doesn't break others
- **Debuggable**: Can log all events in dev mode

### Example 3: Dynamic Remote Loading

```typescript
// utils/dynamicRemoteLoader.ts
interface RemoteConfig {
  url: string;
  scope: string;
  module: string;
}

/**
 * Dynamically load a remote micro-frontend at runtime
 */
export async function loadRemoteModule(config: RemoteConfig) {
  const { url, scope, module } = config;

  // 1. Load the remote container script
  await loadScript(url);

  // 2. Initialize the container
  await initContainer(scope);

  // 3. Get the module factory
  const factory = await window[scope].get(module);

  // 4. Execute the factory
  const Module = factory();

  return Module;
}

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.type = 'text/javascript';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

async function initContainer(scope: string): Promise<void> {
  // @ts-ignore
  if (!window[scope]) {
    throw new Error(`Container ${scope} not found`);
  }

  // @ts-ignore
  await window[scope].init(__webpack_share_scopes__.default);
}
```

**Usage with Feature Flags**:
```typescript
// App.tsx
function App() {
  const { user } = useAuth();
  const featureFlags = useFeatureFlags();

  // Dynamically determine which checkout MFE to load
  const checkoutVersion = featureFlags.get('checkout.version', {
    userId: user.id,
    default: 'v2.1.0',
    variants: {
      'v2.2.0': 0.10, // 10% of users get new version
    },
  });

  const CheckoutApp = lazy(() =>
    loadRemoteModule({
      url: `https://cdn.example.com/checkout/${checkoutVersion}/remoteEntry.js`,
      scope: 'checkout',
      module: './App',
    })
  );

  return (
    <Routes>
      <Route path="/checkout" element={<CheckoutApp />} />
    </Routes>
  );
}
```

**Why This Approach?**
- **A/B testing**: Load different versions per user
- **Gradual rollout**: Canary deployments at runtime
- **Instant rollback**: Change version in config
- **No build needed**: Pure runtime configuration

### Example 4: Resilient Error Handling

```typescript
// components/MicroFrontendContainer.tsx
import React, { Component, ReactNode, Suspense } from 'react';

interface Props {
  name: string;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

class MicroFrontendContainer extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`MFE ${this.props.name} failed:`, error, errorInfo);

    // Send to error tracking
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          microFrontend: this.props.name,
        },
        extra: errorInfo,
      });
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        retryCount: this.state.retryCount + 1,
      });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.errorFallback) {
        return this.props.errorFallback;
      }

      return (
        <div className="mfe-error-container">
          <h2>Something went wrong loading {this.props.name}</h2>
          <p>{this.state.error?.message}</p>
          {this.state.retryCount < this.maxRetries && (
            <button onClick={this.handleRetry}>
              Retry ({this.state.retryCount}/{this.maxRetries})
            </button>
          )}
          {this.state.retryCount >= this.maxRetries && (
            <p>
              Please refresh the page or <a href="/support">contact support</a>
            </p>
          )}
        </div>
      );
    }

    return (
      <Suspense fallback={this.props.fallback || <LoadingSpinner />}>
        {this.children}
      </Suspense>
    );
  }
}

export default MicroFrontendContainer;
```

**Usage**:
```typescript
// App.tsx
const CheckoutApp = lazy(() => import('checkout/App'));

function App() {
  return (
    <MicroFrontendContainer
      name="Checkout"
      fallback={<CheckoutSkeleton />}
      errorFallback={<CheckoutOffline />}
      onError={(error) => {
        // Track MFE failures
        analytics.track('mfe_load_error', {
          mfe: 'checkout',
          error: error.message,
        });
      }}
    >
      <CheckoutApp />
    </MicroFrontendContainer>
  );
}
```

**Why This Matters?**
- **Graceful degradation**: App doesn't crash if MFE fails
- **Retry logic**: Handles transient network issues
- **Error tracking**: Monitors MFE reliability
- **Production benefit**: Reduced support tickets, better UX

### Example 5: Performance Monitoring

```typescript
// utils/mfePerformanceMonitor.ts
interface MFEMetrics {
  name: string;
  loadStart: number;
  loadEnd: number;
  loadTime: number;
  size: number;
}

class MFEPerformanceMonitor {
  private metrics: Map<string, MFEMetrics> = new Map();

  /**
   * Start tracking MFE load
   */
  startLoad(name: string): void {
    this.metrics.set(name, {
      name,
      loadStart: performance.now(),
      loadEnd: 0,
      loadTime: 0,
      size: 0,
    });
  }

  /**
   * End tracking MFE load
   */
  endLoad(name: string, size?: number): void {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.loadEnd = performance.now();
      metric.loadTime = metric.loadEnd - metric.loadStart;
      if (size) metric.size = size;

      // Send to analytics
      this.reportMetric(metric);
    }
  }

  /**
   * Report metric to analytics service
   */
  private reportMetric(metric: MFEMetrics): void {
    // Send to DataDog, New Relic, etc.
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('mfe_loaded', {
        name: metric.name,
        loadTime: Math.round(metric.loadTime),
        size: metric.size,
        timestamp: Date.now(),
      });
    }

    // Log performance warning if slow
    if (metric.loadTime > 2000) {
      console.warn(`Slow MFE load: ${metric.name} took ${metric.loadTime}ms`);
    }
  }

  /**
   * Get all metrics (for debugging)
   */
  getMetrics(): MFEMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get average load time across all MFEs
   */
  getAverageLoadTime(): number {
    const metrics = this.getMetrics();
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.loadTime, 0);
    return total / metrics.length;
  }
}

export const performanceMonitor = new MFEPerformanceMonitor();
```

**Integration with Lazy Loading**:
```typescript
// App.tsx
const loadMFE = (name: string, importFn: () => Promise<any>) => {
  performanceMonitor.startLoad(name);

  return importFn()
    .then(module => {
      performanceMonitor.endLoad(name);
      return module;
    })
    .catch(error => {
      performanceMonitor.endLoad(name);
      throw error;
    });
};

// Wrap lazy loads
const CatalogApp = lazy(() => loadMFE('catalog', () => import('catalog/App')));
const CheckoutApp = lazy(() => loadMFE('checkout', () => import('checkout/App')));
```

**Real-Time Dashboard**:
```typescript
// components/PerformanceDashboard.tsx (Dev mode only)
function PerformanceDashboard() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const avgLoadTime = performanceMonitor.getAverageLoadTime();

  return (
    <div className="perf-dashboard">
      <h3>MFE Performance</h3>
      <p>Average Load Time: {Math.round(avgLoadTime)}ms</p>
      <table>
        <thead>
          <tr>
            <th>MFE</th>
            <th>Load Time</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => (
            <tr key={metric.name}>
              <td>{metric.name}</td>
              <td>{Math.round(metric.loadTime)}ms</td>
              <td>{(metric.size / 1024).toFixed(2)}KB</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Why This Monitoring?**
- **Visibility**: Know which MFEs are slow
- **Alerting**: Automatic alerts if load time > 2s
- **Optimization**: Data-driven performance improvements
- **Production benefit**: Catch performance regressions early

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why Micro-Frontend Architecture Matters

**User Experience Impact**
- **Faster initial load**: Smaller bundles (500KB vs 2MB monolith)
- **Progressive enhancement**: Load features as needed
- **Isolation**: One MFE bug doesn't break entire app
- **Better performance**: Optimized per domain (SSR catalog, CSR admin)

**Business Impact**
- **Team velocity**: 10× more deployments (50/day vs 1/week)
- **Time to market**: Features ship independently without coordination
- **Risk reduction**: Isolated deployments, easy rollback
- **Innovation**: Teams experiment without blocking others
- **Cost efficiency**: Smaller infrastructure per MFE vs monolith

**Developer Impact**
- **Team autonomy**: Full ownership from frontend to backend
- **Technology freedom**: Use best tool for the job
- **Faster iteration**: No coordination overhead
- **Clear boundaries**: Well-defined responsibilities
- **Career growth**: End-to-end ownership

**Organizational Impact**
- **Horizontal scaling**: Add teams without slowing existing teams
- **Parallel development**: 10 teams work simultaneously
- **Reduced conflicts**: Separate repos, no merge conflicts
- **Flexible staffing**: Teams sized per domain complexity

### How Micro-Frontend Architecture Works

**Technical Flow**

1. **Build Phase**
   ```
   Each MFE Team:
     Develops in separate repo
     ↓
     Builds with Webpack + Module Federation
     ↓
     Generates remoteEntry.js + chunks
     ↓
     Deploys to CDN with version in URL
   ```

2. **Runtime Integration**
   ```
   User visits example.com
     ↓
   Shell HTML + JS loads (200KB)
     ↓
   Shell determines route (/checkout)
     ↓
   Fetches checkout remoteEntry.js
     ↓
   Negotiates shared dependencies (React)
     ↓
   Loads checkout chunks
     ↓
   Mounts checkout MFE in DOM
   ```

3. **Communication Flow**
   ```
   User action in Catalog MFE
     ↓
   Update backend API
     ↓
   Publish event via Event Bus
     ↓
   Checkout MFE receives event
     ↓
   Updates local state/UI
   ```

4. **Deployment Flow**
   ```
   Developer merges PR
     ↓
   CI builds new version
     ↓
   Deploy to CDN (immutable URL)
     ↓
   Run smoke tests
     ↓
   Update shell config (gradual rollout)
     ↓
   Users get new version on next nav
   ```

**Key Components**

1. **Shell Application**: Routing, auth, global state, navigation
2. **Micro-Frontends**: Independent business domain apps
3. **Integration Layer**: Module Federation, Web Components, or iframes
4. **Communication**: Event bus, shared API client, custom events
5. **Shared Libraries**: Design system, utilities, auth SDK

**Performance Characteristics**

| Metric | Monolith | Micro-Frontends |
|--------|----------|-----------------|
| Initial Bundle | 2MB | 300-500KB |
| TTI | 4-6s | 1-2s |
| First Route | Instant | +200-500ms |
| Subsequent Routes | Instant | +200ms (lazy load) |
| Cache Hit Ratio | Low (full bundle) | High (granular) |

**Integration Patterns**

```
Build-Time:     Simple, but defeats benefits
Server-Side:    Good for SEO, limited interactivity
iframe:         Strong isolation, poor UX
JavaScript:     Best balance (Module Federation)
Web Components: Framework-agnostic, emerging
```

### Final Thought for Interviews

> "Micro-frontend architecture is not about technology—it's about **organizational scaling**. It solves the problem of coordinating 100+ frontend developers across multiple teams.
>
> The key is **thoughtful domain boundaries**. Don't create micro-frontends for every component—create them around **business domains** (catalog, checkout, account) with clear ownership.
>
> **When it works well**: Large orgs, clear domains, frequent deployments, autonomous teams
>
> **When it's overkill**: Small teams, simple apps, low deployment frequency, tight coupling
>
> The best micro-frontend architectures **balance autonomy with consistency**. Teams deploy independently but use shared design systems. They communicate loosely but maintain cohesive UX.
>
> Remember: **Start with a well-structured monolith. Migrate to micro-frontends when organizational pain exceeds architectural complexity.**"

### Decision Framework

**Evaluate These Factors:**

1. **Team Size**: >50 developers? → Consider micro-frontends
2. **Deployment Frequency**: >5/week? → Consider micro-frontends
3. **Domain Boundaries**: Clear and stable? → Consider micro-frontends
4. **Coordination Pain**: Frequent blocks? → Consider micro-frontends
5. **Performance Requirements**: Every KB matters? → Might avoid
6. **Organizational Maturity**: Strong DevOps? → Can handle complexity

**Red Flags** (Don't Use Micro-Frontends):
- ❌ "Want to try because it's trendy"
- ❌ Small team (<20 developers)
- ❌ No clear domain boundaries
- ❌ Low deployment frequency
- ❌ Tight coupling everywhere

**Green Lights** (Good Candidates):
- ✅ Large team (>50 developers)
- ✅ Deploy daily/hourly
- ✅ Clear business domains
- ✅ Need team autonomy
- ✅ Incremental migration needed

### Evolution Path

**Stage 1: Monolith** (0-50 devs)
- Single codebase
- Simple deployment
- Good developer experience

**Stage 2: Modular Monolith** (50-100 devs)
- Split into packages
- Shared repository
- Start hitting limits

**Stage 3: Micro-Frontends** (100+ devs)
- Independent applications
- Separate deployments
- Organizational scaling

**You're Here**: Choose based on your actual constraints, not industry hype.