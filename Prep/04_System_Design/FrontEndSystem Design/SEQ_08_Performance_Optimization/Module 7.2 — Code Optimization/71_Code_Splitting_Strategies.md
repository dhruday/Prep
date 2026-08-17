# 56. Code Splitting Strategies

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Code Splitting** is the practice of breaking your JavaScript bundle into smaller, more manageable chunks that can be loaded on-demand or in parallel, rather than forcing users to download one massive bundle upfront. It's one of the most impactful performance optimizations for modern web applications.

### What It Is:

Code splitting transforms this:
```
app.js (2.5MB) → User downloads everything before interaction
```

Into this:
```
main.js (200KB)     → Critical code, loaded immediately
home.js (150KB)     → Loaded when user visits home
checkout.js (180KB) → Loaded when user visits checkout
dashboard.js (300KB)→ Loaded when user visits dashboard
vendor.js (400KB)   → Third-party libraries, cached separately
```

### Why It Exists:

**The Problem**:
- Modern web apps bundle all code into one file
- Users download code for features they never use (admin panel, checkout flow when just browsing)
- Large bundles delay Time to Interactive (TTI)
- Poor experience on slow networks and low-end devices

**The Solution**:
- Ship only what's needed for initial render
- Load additional code on-demand (route changes, user interaction)
- Improve TTI, FCP, and overall user experience
- Better caching (unchanged chunks don't re-download)

### When and Where Used:

**Route-Based Splitting** (Most Common):
- Each page/route gets its own bundle
- Navigation triggers new chunk loading
- Perfect for SPAs (React Router, Vue Router, Next.js)

**Component-Based Splitting**:
- Heavy components loaded on-demand
- Modal dialogs, charts, rich text editors
- Loaded when user interaction requires them

**Vendor Splitting**:
- Separate third-party libraries from app code
- Libraries change less frequently → better caching
- Multiple pages share vendor bundles

**Feature-Based Splitting**:
- Complete features as separate chunks
- Admin features, premium features, A/B test variants
- Load based on user permissions or feature flags

### Role in Large-Scale Applications:

At FAANG scale, code splitting is:
- **Essential for performance**: Without it, bundles would be 10+ MB
- **Tied to deployment strategy**: Enables partial rollouts and rollbacks
- **Critical for mobile**: Reduces data usage and improves TTI on slow networks
- **Monitored continuously**: Track chunk sizes, loading patterns, failures
- **Optimized by route**: High-traffic pages get aggressive splitting
- **Regional considerations**: Emerging markets need smaller initial bundles

**Example**: Facebook's main bundle is ~500KB, but they code-split into 100+ chunks. You only load 10-15 chunks for typical usage.

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Core Code Splitting Strategies

#### 1. **Route-Based Code Splitting**

The most common and highest ROI splitting strategy. Each route loads only the code needed for that page.

**How It Works**:
```javascript
// Before: All routes in one bundle
import Home from './pages/Home';
import Products from './pages/Products';
import Checkout from './pages/Checkout';
import Dashboard from './pages/Dashboard';

// After: Each route is a separate chunk
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

**Bundle Impact**:
```
Before:
  app.js: 2.5MB (all routes)

After:
  main.js: 200KB (router, layout, critical code)
  home.chunk.js: 150KB
  products.chunk.js: 180KB
  checkout.chunk.js: 220KB
  dashboard.chunk.js: 300KB
```

**Performance Impact**:
- Initial bundle: 2.5MB → 200KB (92% reduction)
- TTI: 8.5s → 2.8s (67% improvement)
- FCP: 3.2s → 1.1s (66% improvement)

**Implementation Considerations**:

```javascript
// React Router v6 with code splitting
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load routes
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

**Trade-offs**:
- ✅ **Pros**: Massive initial bundle reduction, clear boundaries
- ❌ **Cons**: Navigation requires network request, can feel slow if not preloaded

---

#### 2. **Component-Based Code Splitting**

Split large, conditional, or below-the-fold components that aren't always needed.

**When to Use**:
- **Modal dialogs**: Only load when opened
- **Rich text editors**: Heavy libraries (Quill, TinyMCE)
- **Charts/visualizations**: Data viz libraries are large
- **Below-the-fold content**: Videos, comments, recommendations
- **Admin features**: Only for admin users

**Example Scenarios**:

```javascript
// Heavy modal - load on demand
const VideoModal = lazy(() => import('./VideoModal'));

function Product() {
  const [showVideo, setShowVideo] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowVideo(true)}>Watch Video</button>
      
      {showVideo && (
        <Suspense fallback={<ModalSkeleton />}>
          <VideoModal />
        </Suspense>
      )}
    </div>
  );
}
```

```javascript
// Chart library - heavy, load on demand
const Chart = lazy(() => import('./Chart')); // Includes Chart.js library

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<ChartSkeleton />}>
        <Chart data={analyticsData} />
      </Suspense>
    </div>
  );
}
```

**Trade-offs**:
- ✅ **Pros**: Reduces initial bundle, loads only what's used
- ❌ **Cons**: Delay when component first loads, complexity in managing loading states

---

#### 3. **Vendor/Library Splitting**

Separate third-party libraries from application code for better caching.

**Why It Matters**:
- Vendor code changes infrequently
- App code changes frequently (every deployment)
- Users can cache vendor bundle long-term

**Webpack Configuration**:

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        // Separate vendors
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        
        // Separate React ecosystem (changes together)
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react-vendor',
          chunks: 'all',
          priority: 20
        },
        
        // Common code shared across routes
        common: {
          minChunks: 2,
          name: 'common',
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

**Bundle Output**:
```
react-vendor.chunk.js: 150KB  (React, ReactDOM, Router)
vendors.chunk.js: 300KB       (Other libraries)
common.chunk.js: 80KB         (Shared app code)
home.chunk.js: 120KB          (Home page specific)
products.chunk.js: 140KB      (Products page specific)
```

**Caching Strategy**:
```
react-vendor.js?v=abc123   Cache: 1 year (rarely changes)
vendors.js?v=def456        Cache: 1 month (occasionally updates)
common.js?v=ghi789         Cache: 1 week (changes with deployments)
home.js?v=jkl012           Cache: 1 day (changes frequently)
```

**Trade-offs**:
- ✅ **Pros**: Excellent caching, reduces repeat visitor load times
- ❌ **Cons**: More HTTP requests (mitigated by HTTP/2), complexity in build config

---

#### 4. **Dynamic Imports with Conditions**

Load code based on runtime conditions (user role, feature flags, device type).

**User-Based Splitting**:
```javascript
// Admin panel - only load for admin users
function App({ user }) {
  const [AdminPanel, setAdminPanel] = useState(null);
  
  useEffect(() => {
    if (user.role === 'admin') {
      import('./AdminPanel').then(module => {
        setAdminPanel(() => module.default);
      });
    }
  }, [user.role]);
  
  return (
    <div>
      <MainApp />
      {AdminPanel && <AdminPanel />}
    </div>
  );
}
```

**Feature Flag Splitting**:
```javascript
// New feature behind feature flag
function ProductPage({ features }) {
  const [NewCheckout, setNewCheckout] = useState(null);
  
  useEffect(() => {
    if (features.newCheckout) {
      import('./NewCheckout').then(module => {
        setNewCheckout(() => module.default);
      });
    } else {
      import('./OldCheckout').then(module => {
        setNewCheckout(() => module.default);
      });
    }
  }, [features.newCheckout]);
  
  return <div>{NewCheckout && <NewCheckout />}</div>;
}
```

**Device-Based Splitting**:
```javascript
// Load different experiences for mobile vs desktop
function App() {
  const [Experience, setExperience] = useState(null);
  
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      import('./MobileExperience').then(module => {
        setExperience(() => module.default);
      });
    } else {
      import('./DesktopExperience').then(module => {
        setExperience(() => module.default);
      });
    }
  }, []);
  
  return Experience ? <Experience /> : <LoadingSkeleton />;
}
```

**Trade-offs**:
- ✅ **Pros**: Maximum bundle reduction, users only download what they use
- ❌ **Cons**: Complex logic, harder to test, potential for race conditions

---

#### 5. **Prefetching and Preloading**

Proactively load chunks users are likely to need next.

**Prefetch** (Low Priority, When Browser Idle):
```javascript
// Load next likely route when idle
<link rel="prefetch" href="/products.chunk.js">

// React Router prefetch on hover
function NavLink({ to, children }) {
  const handleMouseEnter = () => {
    // Prefetch route component when user hovers
    import(`./pages${to}`);
  };
  
  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}
```

**Preload** (High Priority, Load in Parallel):
```javascript
// Preload critical chunks immediately
<link rel="preload" href="/critical.chunk.js" as="script">

// Dynamic preload
function ProductPage() {
  useEffect(() => {
    // User is on product page, likely to checkout next
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = '/checkout.chunk.js';
    link.as = 'script';
    document.head.appendChild(link);
  }, []);
  
  return <Product />;
}
```

**Webpack Magic Comments**:
```javascript
// Prefetch: Load when idle
const Dashboard = lazy(() => 
  import(/* webpackPrefetch: true */ './Dashboard')
);

// Preload: Load in parallel with parent
const CriticalComponent = lazy(() => 
  import(/* webpackPreload: true */ './CriticalComponent')
);

// Custom chunk name
const AdminPanel = lazy(() => 
  import(/* webpackChunkName: "admin" */ './AdminPanel')
);
```

**Intelligent Prefetching Based on Analytics**:
```javascript
// Prefetch most likely next routes based on user behavior
function intelligentPrefetch() {
  const currentPath = window.location.pathname;
  
  // Data from analytics: Most common navigation paths
  const prefetchMap = {
    '/': ['/products', '/search'],           // 80% go here from home
    '/products': ['/product/:id', '/cart'],  // Common next steps
    '/cart': ['/checkout'],                  // Very likely next
  };
  
  const nextRoutes = prefetchMap[currentPath] || [];
  
  nextRoutes.forEach(route => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `${route}.chunk.js`;
    document.head.appendChild(link);
  });
}
```

**Trade-offs**:
- ✅ **Pros**: Reduces perceived loading time, feels instant
- ❌ **Cons**: Wastes bandwidth if user doesn't navigate there, more complex

---

#### 6. **Progressive Loading (Skeleton → Content → Enhancements)**

Load in layers: critical → secondary → nice-to-have.

```javascript
function ProductPage() {
  // Layer 1: Immediate (inline or small bundle)
  const ProductInfo = lazy(() => import('./ProductInfo'));
  
  // Layer 2: Important but can wait
  const Reviews = lazy(() => import('./Reviews'));
  
  // Layer 3: Nice-to-have, load when idle
  const Recommendations = lazy(() => import('./Recommendations'));
  
  useEffect(() => {
    // Load recommendations only when page is idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        import('./Recommendations');
      });
    }
  }, []);
  
  return (
    <div>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductInfo />
      </Suspense>
      
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews />
      </Suspense>
      
      <Suspense fallback={<div>Loading recommendations...</div>}>
        <Recommendations />
      </Suspense>
    </div>
  );
}
```

---

### Advanced Techniques

#### **Granular Chunking with Webpack**

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,        // Min chunk size (20KB)
      maxSize: 244000,       // Max chunk size (244KB)
      minChunks: 1,          // Min number of chunks sharing module
      maxAsyncRequests: 30,  // Max parallel requests
      maxInitialRequests: 30,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

#### **Module Federation (Micro-Frontends)**

Share code across separately deployed applications:

```javascript
// Host app - webpack.config.js
const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        checkout: 'checkout@http://checkout.example.com/remoteEntry.js',
        dashboard: 'dashboard@http://dashboard.example.com/remoteEntry.js'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
};

// Use remote module
const Checkout = lazy(() => import('checkout/CheckoutFlow'));
```

#### **Intersection Observer for Below-Fold Splitting**

```javascript
function LazySection({ importFunc, children }) {
  const [Component, setComponent] = useState(null);
  const ref = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        importFunc().then(module => {
          setComponent(() => module.default);
        });
        observer.disconnect();
      }
    }, {
      rootMargin: '200px' // Start loading 200px before visible
    });
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [importFunc]);
  
  return (
    <div ref={ref}>
      {Component ? <Component>{children}</Component> : <Skeleton />}
    </div>
  );
}

// Usage
<LazySection importFunc={() => import('./Comments')}>
  <Comments />
</LazySection>
```

---

### Common Pitfalls and Solutions

#### **1. Over-Splitting (Too Many Small Chunks)**

**Problem**:
```javascript
// Every component is a chunk (bad!)
const Button = lazy(() => import('./Button'));
const Input = lazy(() => import('./Input'));
const Card = lazy(() => import('./Card'));
// Result: 100+ tiny chunks, HTTP overhead > savings
```

**Solution**:
```javascript
// Group related components
const FormComponents = lazy(() => import('./FormComponents'));
// FormComponents exports { Button, Input, Select, Textarea }

// Use minSize in webpack config
splitChunks: {
  minSize: 20000, // Don't create chunks smaller than 20KB
}
```

#### **2. Duplicate Code Across Chunks**

**Problem**: Same utility functions bundled in multiple chunks.

**Solution**:
```javascript
// webpack.config.js
splitChunks: {
  cacheGroups: {
    common: {
      minChunks: 2,              // Shared by at least 2 chunks
      name: 'common',
      chunks: 'all',
      reuseExistingChunk: true   // Reuse existing chunk if possible
    }
  }
}
```

#### **3. Loading Waterfalls**

**Problem**:
```
main.js loads → imports route.js → imports component.js → imports utils.js
(Serial loading: 4 round trips)
```

**Solution**:
```javascript
// Preload dependencies in parallel
const Route = lazy(() => {
  // Trigger parallel downloads
  const componentPromise = import('./Component');
  const utilsPromise = import('./utils');
  
  return Promise.all([componentPromise, utilsPromise])
    .then(([component]) => component);
});
```

#### **4. Poor Loading UX**

**Problem**: Blank screens or spinners everywhere during loading.

**Solution**:
```javascript
// Skeleton screens that match content
function ProductSkeleton() {
  return (
    <div className="product-skeleton">
      <div className="skeleton-image" />
      <div className="skeleton-title" />
      <div className="skeleton-price" />
      <div className="skeleton-description" />
    </div>
  );
}

<Suspense fallback={<ProductSkeleton />}>
  <Product />
</Suspense>
```

#### **5. No Error Handling**

**Problem**: Chunk load failure crashes app.

**Solution**:
```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    // Check if it's a chunk load error
    if (error.name === 'ChunkLoadError') {
      return { hasError: true, isChunkError: true };
    }
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    if (this.state.isChunkError) {
      // Retry or reload
      console.log('Chunk failed to load, retrying...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// Wrap lazy components
<ErrorBoundary>
  <Suspense fallback={<Spinner />}>
    <LazyRoute />
  </Suspense>
</ErrorBoundary>
```

---

### Monitoring and Measurement

Track code splitting effectiveness:

```javascript
// Track chunk loading performance
const chunkLoadTimes = {};

const originalImport = window.__webpack_require__;
window.__webpack_require__ = function(chunkId) {
  const startTime = performance.now();
  
  return originalImport(chunkId).then(module => {
    const loadTime = performance.now() - startTime;
    chunkLoadTimes[chunkId] = loadTime;
    
    // Send to analytics if slow
    if (loadTime > 1000) {
      analytics.track('slow_chunk_load', {
        chunkId,
        loadTime,
        url: window.location.href
      });
    }
    
    return module;
  });
};
```

**Key Metrics**:
- Chunk size distribution
- Initial bundle size
- Chunk cache hit rate
- Chunk load failures
- Time to load chunks (P50, P95, P99)
- Number of chunks loaded per session

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: E-Commerce Application (Amazon-Scale)

**Before Code Splitting**:
```
app.js: 3.2MB
- Homepage components
- Product listing
- Product detail
- Shopping cart
- Checkout flow (multiple steps)
- User account pages
- Admin panel
- All third-party libraries

Result:
- TTI: 9.8s on 3G
- 73% bounce rate on mobile
```

**After Code Splitting Strategy**:

```javascript
// main.js (250KB) - Critical code
import { BrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Route-based splitting
const Home = lazy(() => import(/* webpackChunkName: "home" */ './pages/Home'));
const Products = lazy(() => import(/* webpackChunkName: "products" */ './pages/Products'));
const ProductDetail = lazy(() => import(/* webpackChunkName: "product" */ './pages/ProductDetail'));
const Cart = lazy(() => import(/* webpackChunkName: "cart" */ './pages/Cart'));
const Checkout = lazy(() => import(/* webpackChunkName: "checkout" */ './pages/Checkout'));
const Account = lazy(() => import(/* webpackChunkName: "account" */ './pages/Account'));

// Admin panel - conditional loading
const Admin = lazy(() => import(/* webpackChunkName: "admin", webpackPrefetch: true */ './pages/Admin'));

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout/*" element={<Checkout />} />
              <Route path="/account/*" element={<Account />} />
              {isAdmin && <Route path="/admin/*" element={<Admin />} />}
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </BrowserRouter>
  );
}
```

**Component-level splitting**:
```javascript
// ProductDetail.js
function ProductDetail() {
  const [showReviews, setShowReviews] = useState(false);
  
  // Heavy review component - load on demand
  const Reviews = lazy(() => import('./Reviews'));
  
  // 360 view - load on interaction
  const ProductViewer360 = lazy(() => import('./ProductViewer360'));
  
  // Recommendations - load when idle
  const Recommendations = lazy(() => import('./Recommendations'));
  
  useEffect(() => {
    // Prefetch likely next step
    import('./pages/Cart');
    
    // Load recommendations when idle
    requestIdleCallback(() => {
      import('./Recommendations');
    });
  }, []);
  
  return (
    <div>
      <ProductImages />
      <ProductInfo />
      
      <button onClick={() => setShowReviews(true)}>
        Read Reviews
      </button>
      
      {showReviews && (
        <Suspense fallback={<ReviewsSkeleton />}>
          <Reviews />
        </Suspense>
      )}
      
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations />
      </Suspense>
    </div>
  );
}
```

**Webpack configuration**:
```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // React vendor
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react-vendor',
          priority: 20
        },
        
        // Payment libraries (used only in checkout)
        payment: {
          test: /[\\/]node_modules[\\/](stripe|braintree)[\\/]/,
          name: 'payment-vendor',
          priority: 15
        },
        
        // Chart libraries (used in account/admin)
        charts: {
          test: /[\\/]node_modules[\\/](chart\.js|recharts)[\\/]/,
          name: 'charts-vendor',
          priority: 15
        },
        
        // Other vendors
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        
        // Common app code
        common: {
          minChunks: 2,
          name: 'common',
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

**Results**:
```
Bundle Breakdown:
- main.js: 250KB (critical, cached 7 days)
- react-vendor.js: 180KB (cached 1 year)
- vendors.js: 300KB (cached 30 days)
- common.js: 120KB (cached 7 days)
- home.chunk.js: 140KB
- products.chunk.js: 160KB
- product.chunk.js: 180KB
- cart.chunk.js: 90KB
- checkout.chunk.js: 250KB (includes payment-vendor)
- account.chunk.js: 200KB (includes charts-vendor)
- admin.chunk.js: 450KB (only for admins)

Performance Impact:
- Initial bundle: 3.2MB → 850KB (73% reduction)
- TTI: 9.8s → 2.9s (70% improvement)
- FCP: 4.1s → 1.2s (71% improvement)
- Bounce rate: 73% → 31% (58% reduction)
- Mobile conversion: +27%

Cache Hit Rate (Returning Users):
- react-vendor.js: 98% (almost never changes)
- vendors.js: 87% (occasionally updates)
- home.chunk.js: 45% (changes with deployments)

User with 5 page visits only downloads 1.2MB vs 16MB without code splitting
```

---

### Example 2: Dashboard Application (Analytics/Admin)

**Challenge**: Dashboard has many heavy visualizations, but users only view 2-3 charts per session.

```javascript
// Dashboard.js
function Dashboard() {
  const [activeWidgets, setActiveWidgets] = useState(['overview']);
  
  // Each chart is a separate chunk
  const OverviewChart = lazy(() => import('./charts/OverviewChart'));
  const RevenueChart = lazy(() => import('./charts/RevenueChart'));
  const UserGrowthChart = lazy(() => import('./charts/UserGrowthChart'));
  const GeographicMap = lazy(() => import('./charts/GeographicMap'));
  const FunnelAnalysis = lazy(() => import('./charts/FunnelAnalysis'));
  
  // Load chart only when user selects it
  const loadWidget = (widgetName) => {
    setActiveWidgets(prev => [...prev, widgetName]);
    
    // Prefetch related widgets
    if (widgetName === 'revenue') {
      import('./charts/RevenueBreakdown'); // User likely needs this next
    }
  };
  
  return (
    <div className="dashboard">
      <WidgetSelector onSelect={loadWidget} />
      
      <div className="widgets-grid">
        {activeWidgets.includes('overview') && (
          <Suspense fallback={<ChartSkeleton />}>
            <OverviewChart />
          </Suspense>
        )}
        
        {activeWidgets.includes('revenue') && (
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueChart />
          </Suspense>
        )}
        
        {activeWidgets.includes('users') && (
          <Suspense fallback={<ChartSkeleton />}>
            <UserGrowthChart />
          </Suspense>
        )}
        
        {activeWidgets.includes('geo') && (
          <Suspense fallback={<ChartSkeleton />}>
            <GeographicMap />
          </Suspense>
        )}
        
        {activeWidgets.includes('funnel') && (
          <Suspense fallback={<ChartSkeleton />}>
            <FunnelAnalysis />
          </Suspense>
        )}
      </div>
    </div>
  );
}
```

**Bundle Strategy**:
```
main.js: 200KB (dashboard shell, layout)
overview-chart.chunk.js: 180KB (Chart.js + component)
revenue-chart.chunk.js: 220KB (Chart.js + D3 + component)
user-growth-chart.chunk.js: 190KB
geographic-map.chunk.js: 450KB (Mapbox + component)
funnel-analysis.chunk.js: 210KB

Average user loads: main.js + 2-3 charts = 600-800KB
Without splitting: Would load all 1.45MB upfront
```

**Results**:
- 68% of users only view 1-2 charts per session
- Saved 800KB+ for typical user
- TTI improved from 7.2s to 2.1s

---

### Example 3: Social Media Feed (Twitter/Facebook Style)

**Challenge**: Feed has many optional features—some users never use them.

```javascript
// Feed.js
function Feed() {
  const posts = usePosts();
  
  // Core feed always loaded
  return (
    <div className="feed">
      {posts.map(post => (
        <Post key={post.id} data={post} />
      ))}
    </div>
  );
}

// Post.js - Progressive enhancement
function Post({ data }) {
  const [showComments, setShowComments] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Load comments only when user opens them
  const Comments = lazy(() => import('./Comments'));
  
  // Share menu with heavy social SDKs
  const ShareMenu = lazy(() => import('./ShareMenu'));
  
  // Rich media viewer (videos, galleries)
  const MediaViewer = lazy(() => import('./MediaViewer'));
  
  return (
    <article className="post">
      <PostHeader author={data.author} />
      <PostContent content={data.content} />
      
      {/* Media viewer loaded on demand */}
      {data.media && (
        <Suspense fallback={<MediaPlaceholder />}>
          <MediaViewer media={data.media} />
        </Suspense>
      )}
      
      <PostActions 
        onCommentClick={() => setShowComments(true)}
        onShareClick={() => setShowShareMenu(true)}
      />
      
      {/* Comments - 70% of users never open */}
      {showComments && (
        <Suspense fallback={<CommentsSkeleton />}>
          <Comments postId={data.id} />
        </Suspense>
      )}
      
      {/* Share menu - 15% of users use */}
      {showShareMenu && (
        <Suspense fallback={<ShareSkeleton />}>
          <ShareMenu post={data} />
        </Suspense>
      )}
    </article>
  );
}
```

**Intersection Observer for Below-Fold**:
```javascript
// Only load posts when they enter viewport
function VirtualizedFeed() {
  const posts = usePosts();
  const [visiblePosts, setVisiblePosts] = useState(new Set());
  
  const observerRef = useRef(
    new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisiblePosts(prev => new Set([...prev, entry.target.dataset.postId]));
        }
      });
    }, {
      rootMargin: '500px' // Load 500px before visible
    })
  );
  
  return (
    <div className="feed">
      {posts.map(post => (
        <div 
          key={post.id}
          data-post-id={post.id}
          ref={el => el && observerRef.current.observe(el)}
        >
          {visiblePosts.has(post.id) ? (
            <Post data={post} />
          ) : (
            <PostPlaceholder height={post.estimatedHeight} />
          )}
        </div>
      ))}
    </div>
  );
}
```

**Results**:
```
Savings per post:
- Comments component: 80KB (70% never load)
- Share menu + SDKs: 120KB (85% never load)
- Average savings per post: 150KB

For feed with 20 posts:
- Without splitting: 3MB+ (all features × 20 posts)
- With splitting: 800KB (core feed + 2-3 interactions)
- Bandwidth saved: 73%
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question**: "How do you approach code splitting in a large-scale React application?"

**Strong Answer**:

"I approach code splitting with a layered strategy that balances initial load performance with user experience during navigation.

**First, route-based splitting** is the foundation. Every major route gets its own chunk because users typically don't visit every page in a session. I use React's `lazy()` and `Suspense` with React Router. For example, in my last project, we split a 2.5MB bundle into a 200KB initial bundle plus 8-10 route chunks. This dropped our TTI from 8.5s to 2.8s on mobile.

**Second, vendor splitting** for better caching. I separate third-party libraries from application code because vendor code changes infrequently. We split React/ReactDOM separately from other vendors, and specialized libraries like Chart.js only load with routes that need them. This means returning users hit cache 85%+ of the time for vendor bundles.

**Third, component-based splitting** for heavy features. Modal dialogs, rich text editors, video players—anything large or conditionally rendered gets split. I use `lazy()` with conditions: only load when the user triggers the feature. We saved 400KB on our product pages by lazy-loading the reviews component, which 40% of users never opened.

**Fourth, intelligent prefetching** to eliminate perceived loading. When users hover over navigation links, I prefetch that route's chunk. We also prefetch likely next steps based on analytics—if a user is on a product page, we prefetch the cart and checkout chunks because 60% add to cart within 30 seconds.

**The key trade-off** is splitting too aggressively. Early on, we split every component and ended up with 200+ tiny chunks. HTTP overhead killed performance. The sweet spot is chunks between 20-150KB, grouped by feature or route. We use Webpack's `splitChunks` with `minSize: 20000` to prevent over-splitting.

**For measurement**, we track chunk load times, cache hit rates, and chunk load failures in production. We also have bundle size budgets in CI/CD—if a PR adds more than 50KB to any chunk, it requires performance review.

**The result** was a 73% reduction in initial bundle size, 70% improvement in TTI, and 27% increase in mobile conversion rate. The key is being strategic—split where it matters, prefetch to hide latency, and measure continuously."

---

### Likely Follow-Up Questions

#### 1. **"How do you decide what to split and what to keep in the main bundle?"**

**Answer**:
"I use a decision matrix based on three factors:

**1. Usage frequency**—If a feature is used by <50% of users, it's a split candidate. For example, admin panels (5% of users) or advanced filters (20% of users) should definitely be split.

**2. Size threshold**—Anything over 30-50KB that's not immediately needed is worth splitting. A 15KB component isn't worth the HTTP overhead, but a 200KB chart library absolutely is.

**3. Critical path**—Is it needed for FCP or LCP? If yes, keep it in the main bundle. The hero section, navigation, and primary CTA should be inline. Everything else can be deferred.

**My framework**:
```
Critical (inline in main bundle):
- App shell, layout, navigation
- Above-the-fold content
- Critical styles and fonts
- Core routing logic

Eager split (load immediately but separate chunk):
- Initial route component
- Shared vendor libraries (React, etc.)

Lazy split (load on-demand):
- Other route components
- Modal dialogs, drawers
- Below-the-fold sections
- Admin/premium features

Prefetch (load when idle):
- Likely next routes
- Common user journeys
```

I also run Webpack Bundle Analyzer monthly to visualize our bundles. If I see common code duplicated across chunks, I extract it. If I see a chunk balloon to 500KB+, I investigate what to split out.

The key is data-driven decisions. We track which chunks are loaded in each session. If 90% of sessions only load 3 out of 15 chunks, we know our splitting strategy is working."

---

#### 2. **"What happens when a code-split chunk fails to load?"**

**Answer**:
"Chunk load failures are a real production issue, especially on flaky mobile networks. I handle them with multiple strategies:

**1. Error boundaries** to catch chunk load errors:
```javascript
class ChunkLoadErrorBoundary extends React.Component {
  state = { hasError: false, retryCount: 0 };
  
  static getDerivedStateFromError(error) {
    if (error.name === 'ChunkLoadError') {
      return { hasError: true };
    }
    return null;
  }
  
  retry = () => {
    this.setState({ 
      hasError: false, 
      retryCount: this.state.retryCount + 1 
    });
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <div>
          <p>Failed to load content. Check your connection.</p>
          <button onClick={this.retry}>Retry</button>
          {this.state.retryCount > 2 && (
            <button onClick={() => window.location.reload()}>
              Reload Page
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
```

**2. Automatic retry logic** with exponential backoff:
```javascript
function lazyWithRetry(importFunc, retries = 3) {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const attemptLoad = (attemptsLeft) => {
        importFunc()
          .then(resolve)
          .catch(error => {
            if (attemptsLeft <= 0) {
              reject(error);
            } else {
              setTimeout(() => {
                console.log(`Retrying chunk load, ${attemptsLeft} attempts left`);
                attemptLoad(attemptsLeft - 1);
              }, 1000 * (4 - attemptsLeft)); // Exponential backoff
            }
          });
      };
      
      attemptLoad(retries);
    });
  });
}

const Dashboard = lazyWithRetry(() => import('./Dashboard'));
```

**3. Monitoring and alerting**:
- Track chunk load failures in our observability platform
- Alert if failure rate exceeds 1%
- Segment by geography/network to identify regional CDN issues

**4. Fallback to CDN**:
If a chunk fails from our primary CDN, retry from a backup:
```javascript
const primaryCDN = 'https://cdn1.example.com';
const backupCDN = 'https://cdn2.example.com';

function loadChunkWithFallback(chunkPath) {
  return fetch(`${primaryCDN}${chunkPath}`)
    .catch(() => {
      console.log('Primary CDN failed, trying backup');
      return fetch(`${backupCDN}${chunkPath}`);
    });
}
```

**5. Service Worker caching**:
Cache critical chunks in service worker so they work offline:
```javascript
// service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/main.js',
        '/react-vendor.js',
        '/common.js'
        // Don't cache all chunks, just critical ones
      ]);
    })
  );
});
```

**In production at my last company**, we saw a 0.3% chunk load failure rate, mostly from mobile users on spotty networks. The retry logic resolved 80% of those failures, and error boundaries gave users a way to recover. We also set up alerts so if failures spiked above 1%, we'd investigate CDN issues immediately."

---

#### 3. **"How does code splitting affect caching strategy?"**

**Answer**:
"Code splitting dramatically improves caching efficiency when done right, but it requires careful cache header configuration.

**The key insight**: Different types of chunks change at different rates.

**My caching strategy**:

```
Vendor bundles (react-vendor.js, libraries.js):
  Cache-Control: public, max-age=31536000, immutable
  Reason: Third-party libraries rarely change
  Cache hit rate: 95%+

App code bundles (home.chunk.js, dashboard.chunk.js):
  Cache-Control: public, max-age=604800 (7 days)
  Reason: Changes with each deployment, but not hourly
  Cache hit rate: 60-70%

Main bundle (main.js):
  Cache-Control: public, max-age=86400 (1 day)
  Reason: Changes frequently, contains routing logic
  Cache hit rate: 40-50%

HTML entry point (index.html):
  Cache-Control: no-cache
  Reason: Always check server for latest version
```

**Content hashing** is critical:
```javascript
// webpack.config.js
output: {
  filename: '[name].[contenthash].js',
  chunkFilename: '[name].[contenthash].chunk.js'
}

// File changes → hash changes → new filename → cache busted automatically
home.abc123.chunk.js → home.def456.chunk.js
```

**Split bundles by change frequency**:
- React rarely updates → long cache
- App features change often → medium cache
- Utilities shared across features → long cache if stable

**The math**:
Without code splitting:
- User downloads 2.5MB on every deployment (daily)
- Weekly bandwidth: 2.5MB × 7 = 17.5MB per user

With code splitting and caching:
- First visit: 850KB (main + vendors + one route)
- Return visits: ~150KB (only changed chunks)
- Weekly bandwidth: 850KB + (150KB × 6) = 1.75MB
- **90% bandwidth reduction**

**Common mistake** I see: caching all chunks the same. If you cache vendor bundles for 7 days but they never change, you're missing optimization. Cache them for 1 year.

**Monitoring**:
- Track cache hit rates per chunk type
- Alert if vendor cache hits drop below 90% (indicates config issue)
- Measure bandwidth saved from caching

At my last company, proper code splitting + caching saved us $50K/month in CDN costs and improved repeat visitor TTI by 65%."

---

#### 4. **"How do you test code-split applications?"**

**Answer**:
"Testing code-split apps requires special attention because lazy-loaded code introduces async behavior and potential failure modes.

**1. Unit testing** with mocked imports:
```javascript
// Component.test.js
jest.mock('./HeavyComponent', () => {
  return {
    __esModule: true,
    default: () => <div>Mocked Heavy Component</div>
  };
});

test('lazy component renders', async () => {
  render(<App />);
  
  // Wait for lazy component to load
  await waitFor(() => {
    expect(screen.getByText('Mocked Heavy Component')).toBeInTheDocument();
  });
});
```

**2. Integration testing** with Suspense boundaries:
```javascript
test('shows loading state then content', async () => {
  render(<App />);
  
  // Verify loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  // Wait for lazy component
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
```

**3. Error scenario testing**:
```javascript
test('handles chunk load failure', async () => {
  // Mock import to fail
  jest.spyOn(console, 'error').mockImplementation(() => {});
  
  jest.mock('./Dashboard', () => {
    return Promise.reject(new Error('ChunkLoadError'));
  });
  
  render(
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <Dashboard />
      </Suspense>
    </ErrorBoundary>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Failed to load content')).toBeInTheDocument();
  });
});
```

**4. Bundle size testing** in CI:
```javascript
// bundle-size.test.js
const fs = require('fs');
const path = require('path');

test('main bundle is under budget', () => {
  const stats = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../dist/stats.json'))
  );
  
  const mainBundle = stats.assets.find(a => a.name.startsWith('main'));
  const maxSize = 250 * 1024; // 250KB
  
  expect(mainBundle.size).toBeLessThan(maxSize);
});

test('no chunk exceeds max size', () => {
  const stats = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../dist/stats.json'))
  );
  
  const maxChunkSize = 500 * 1024; // 500KB
  
  stats.assets.forEach(asset => {
    expect(asset.size).toBeLessThan(maxChunkSize);
  });
});
```

**5. E2E testing** with network throttling:
```javascript
// cypress/e2e/code-splitting.cy.js
describe('Code splitting', () => {
  it('loads route chunks on navigation', () => {
    cy.intercept('/dashboard.chunk.js').as('dashboardChunk');
    
    cy.visit('/');
    cy.contains('Dashboard').click();
    
    // Verify chunk was loaded
    cy.wait('@dashboardChunk');
    cy.contains('Dashboard Content').should('be.visible');
  });
  
  it('handles slow network', () => {
    // Throttle network
    cy.intercept('/dashboard.chunk.js', (req) => {
      req.reply({ delay: 3000, fixture: 'dashboard.chunk.js' });
    });
    
    cy.visit('/');
    cy.contains('Dashboard').click();
    
    // Verify loading state appears
    cy.contains('Loading...').should('be.visible');
    
    // Eventually content loads
    cy.contains('Dashboard Content', { timeout: 5000 }).should('be.visible');
  });
  
  it('retries failed chunk loads', () => {
    let attempts = 0;
    
    cy.intercept('/dashboard.chunk.js', (req) => {
      attempts++;
      if (attempts < 3) {
        req.reply({ statusCode: 500 });
      } else {
        req.reply({ fixture: 'dashboard.chunk.js' });
      }
    });
    
    cy.visit('/');
    cy.contains('Dashboard').click();
    
    // Should eventually succeed after retries
    cy.contains('Dashboard Content', { timeout: 10000 }).should('be.visible');
  });
});
```

**6. Performance testing**:
```javascript
// lighthouse-ci.js
test('code splitting improves lighthouse score', async () => {
  const results = await lighthouse('http://localhost:3000');
  
  // Verify bundle metrics
  expect(results.audits['total-byte-weight'].score).toBeGreaterThan(0.9);
  expect(results.audits['bootup-time'].score).toBeGreaterThan(0.9);
  
  // Verify specific chunks loaded
  const networkRecords = results.audits['network-requests'].details.items;
  const chunks = networkRecords.filter(r => r.url.includes('.chunk.js'));
  
  // Should only load 2-3 chunks on homepage
  expect(chunks.length).toBeLessThan(4);
});
```

**Key principle**: Test both happy path (chunks load successfully) and failure modes (network errors, timeouts). In production, users have flaky connections, so your tests should cover that."

---

#### 5. **"What are the trade-offs between route-based and component-based splitting?"**

**Answer**:
"Both strategies have distinct use cases, and in production, I use them together strategically.

**Route-Based Splitting**:

✅ **Pros**:
- Clear boundaries—each page is a chunk
- Matches user navigation patterns
- Easy to reason about and implement
- Great cache hit rates (users revisit pages)
- Biggest bang for buck (high ROI)

❌ **Cons**:
- Navigation feels slower (network request per route)
- All features on a page bundled together (even unused ones)
- Can create large chunks if routes are feature-heavy

**Best for**: SPAs with distinct pages, applications where routes are independent

**Component-Based Splitting**:

✅ **Pros**:
- Finer granularity—split exactly what's unused
- Great for modal dialogs, tooltips, heavy widgets
- Users never download code for features they don't interact with
- Can split within a page (above vs below fold)

❌ **Cons**:
- More complex to manage (many small chunks)
- Risk of over-splitting (HTTP overhead)
- Harder to predict what will load when
- More potential for loading states throughout UI

**Best for**: Feature-rich pages, dashboards with many widgets, heavy components

**My strategy in practice**:

```javascript
// Level 1: Route-based (foundation)
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Level 2: Component-based within routes (refinement)
function Dashboard() {
  // Heavy chart library
  const AdvancedChart = lazy(() => import('./AdvancedChart'));
  
  // Admin-only panel
  const AdminPanel = isAdmin 
    ? lazy(() => import('./AdminPanel'))
    : null;
  
  return (
    <div>
      <DashboardHeader /> {/* Always loaded */}
      <Suspense fallback={<ChartSkeleton />}>
        <AdvancedChart /> {/* Split component */}
      </Suspense>
      {AdminPanel && (
        <Suspense fallback={<Skeleton />}>
          <AdminPanel /> {/* Conditional split */}
        </Suspense>
      )}
    </div>
  );
}
```

**Decision framework**:

| Scenario | Strategy | Reason |
|----------|----------|--------|
| Different pages/views | Route-based | Clear boundaries, matches navigation |
| Heavy component used on one page | Component-based | Keep route chunk small |
| Component used across multiple pages | Shared chunk | Avoid duplication |
| Modal/dialog (conditional render) | Component-based | Often never opened |
| Admin/premium features | Component-based + condition | Most users don't have access |
| Above vs below fold | Component-based | Prioritize visible content |

**Anti-pattern I avoid**: Component-splitting small, frequently-used components like buttons or cards. The overhead of loading isn't worth it for 5KB components used everywhere.

**The result**: Start with route-based splitting (80% of the benefit), then add component-based splitting for the heaviest components (extra 15-20% benefit). The last 5% isn't worth the complexity."

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Production-Ready Code Splitting Implementation

```javascript
// utils/lazyWithRetry.js
/**
 * Enhanced lazy loading with automatic retry and error handling
 */
import { lazy } from 'react';

export function lazyWithRetry(importFunc, retries = 3, delay = 1000) {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const attemptLoad = (attemptsLeft) => {
        importFunc()
          .then(resolve)
          .catch((error) => {
            if (attemptsLeft <= 0) {
              // Log failure to analytics
              if (window.analytics) {
                window.analytics.track('chunk_load_failure', {
                  error: error.message,
                  component: importFunc.toString()
                });
              }
              reject(error);
            } else {
              const retryDelay = delay * (retries - attemptsLeft + 1);
              console.warn(
                `Chunk load failed, retrying in ${retryDelay}ms. ` +
                `${attemptsLeft} attempts remaining.`
              );
              
              setTimeout(() => {
                attemptLoad(attemptsLeft - 1);
              }, retryDelay);
            }
          });
      };
      
      attemptLoad(retries);
    });
  });
}

// Usage
const Dashboard = lazyWithRetry(
  () => import(/* webpackChunkName: "dashboard" */ './pages/Dashboard')
);
```

---

### Error Boundary for Chunk Load Errors

```javascript
// components/ChunkLoadErrorBoundary.jsx
import React from 'react';

class ChunkLoadErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }
  
  static getDerivedStateFromError(error) {
    // Check if it's a chunk load error
    const isChunkLoadError = 
      error.name === 'ChunkLoadError' ||
      /Loading chunk [\d]+ failed/.test(error.message);
    
    return {
      hasError: true,
      isChunkLoadError
    };
  }
  
  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log to error tracking service
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        },
        tags: {
          type: 'chunk-load-error'
        }
      });
    }
    
    // Auto-reload for chunk errors (once)
    if (this.state.isChunkLoadError && this.state.retryCount === 0) {
      console.log('Chunk load error detected, reloading page...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }
  
  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };
  
  handleReload = () => {
    window.location.reload();
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <h2>Something went wrong</h2>
            
            {this.state.isChunkLoadError ? (
              <>
                <p>
                  We're having trouble loading this content. 
                  This might be due to a network issue.
                </p>
                <div className="error-boundary__actions">
                  <button onClick={this.handleRetry}>
                    Try Again
                  </button>
                  <button onClick={this.handleReload}>
                    Reload Page
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>An unexpected error occurred.</p>
                <button onClick={this.handleReload}>
                  Reload Page
                </button>
              </>
            )}
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre>{this.state.error?.toString()}</pre>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ChunkLoadErrorBoundary;
```

---

### Smart Route-Based Splitting with Prefetching

```javascript
// App.jsx
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { lazyWithRetry } from './utils/lazyWithRetry';
import ChunkLoadErrorBoundary from './components/ChunkLoadErrorBoundary';
import PageSkeleton from './components/PageSkeleton';

// Lazy load routes with retry logic
const Home = lazyWithRetry(() => 
  import(/* webpackChunkName: "home" */ './pages/Home')
);

const Products = lazyWithRetry(() => 
  import(/* webpackChunkName: "products" */ './pages/Products')
);

const ProductDetail = lazyWithRetry(() => 
  import(/* webpackChunkName: "product-detail" */ './pages/ProductDetail')
);

const Cart = lazyWithRetry(() => 
  import(/* webpackChunkName: "cart" */ './pages/Cart')
);

const Checkout = lazyWithRetry(() => 
  import(/* webpackChunkName: "checkout" */ './pages/Checkout')
);

const Account = lazyWithRetry(() => 
  import(/* webpackChunkName: "account" */ './pages/Account')
);

const Admin = lazyWithRetry(() => 
  import(/* webpackChunkName: "admin", webpackPrefetch: true */ './pages/Admin')
);

// Prefetch map: What to prefetch based on current route
const PREFETCH_MAP = {
  '/': ['/products', '/search'],
  '/products': ['/product/:id', '/cart'],
  '/product/:id': ['/cart', '/checkout'],
  '/cart': ['/checkout'],
};

function PrefetchManager() {
  const location = useLocation();
  
  useEffect(() => {
    // Get routes to prefetch based on current location
    const routesToPrefetch = PREFETCH_MAP[location.pathname] || [];
    
    // Prefetch chunks when idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        routesToPrefetch.forEach(route => {
          prefetchRoute(route);
        });
      });
    }
  }, [location.pathname]);
  
  return null;
}

function prefetchRoute(route) {
  const routeChunkMap = {
    '/products': () => import('./pages/Products'),
    '/product/:id': () => import('./pages/ProductDetail'),
    '/cart': () => import('./pages/Cart'),
    '/checkout': () => import('./pages/Checkout'),
    '/search': () => import('./pages/Search'),
  };
  
  const importFunc = routeChunkMap[route];
  if (importFunc) {
    importFunc().catch(err => {
      console.warn('Prefetch failed for', route, err);
    });
  }
}

// Smart link with hover prefetch
function SmartLink({ to, children, ...props }) {
  const handleMouseEnter = () => {
    // Prefetch on hover (desktop pattern)
    prefetchRoute(to);
  };
  
  const handleTouchStart = () => {
    // Prefetch on touch start (mobile pattern)
    prefetchRoute(to);
  };
  
  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      {...props}
    >
      {children}
    </Link>
  );
}

function App({ user }) {
  const isAdmin = user?.role === 'admin';
  
  return (
    <BrowserRouter>
      <div className="app">
        <header>
          <nav>
            <SmartLink to="/">Home</SmartLink>
            <SmartLink to="/products">Products</SmartLink>
            <SmartLink to="/cart">Cart</SmartLink>
            {isAdmin && <SmartLink to="/admin">Admin</SmartLink>}
          </nav>
        </header>
        
        <main>
          <ChunkLoadErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <PrefetchManager />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout/*" element={<Checkout />} />
                <Route path="/account/*" element={<Account />} />
                {isAdmin && <Route path="/admin/*" element={<Admin />} />}
              </Routes>
            </Suspense>
          </ChunkLoadErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

---

### Component-Based Splitting with Intersection Observer

```javascript
// components/LazyOnVisible.jsx
/**
 * Lazy load components when they enter viewport
 * Useful for below-the-fold content
 */
import { useEffect, useRef, useState } from 'react';

function LazyOnVisible({ 
  importFunc, 
  fallback = null,
  rootMargin = '200px',
  threshold = 0.1,
  children 
}) {
  const [Component, setComponent] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          
          // Load component
          importFunc()
            .then(module => {
              setComponent(() => module.default);
            })
            .catch(err => {
              console.error('Failed to load lazy component:', err);
            });
          
          // Stop observing
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold
      }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [importFunc, rootMargin, threshold]);
  
  return (
    <div ref={ref} style={{ minHeight: isVisible ? 'auto' : '300px' }}>
      {Component ? <Component>{children}</Component> : fallback}
    </div>
  );
}

// Usage Example
function ProductPage() {
  return (
    <div>
      <ProductHeader />
      <ProductImages />
      <ProductDescription />
      
      {/* Reviews loaded when scrolled into view */}
      <LazyOnVisible
        importFunc={() => import('./Reviews')}
        fallback={<ReviewsSkeleton />}
        rootMargin="500px"
      >
        <Reviews />
      </LazyOnVisible>
      
      {/* Recommendations loaded when scrolled into view */}
      <LazyOnVisible
        importFunc={() => import('./Recommendations')}
        fallback={<RecommendationsSkeleton />}
      >
        <Recommendations />
      </LazyOnVisible>
      
      {/* Q&A section */}
      <LazyOnVisible
        importFunc={() => import('./QA')}
        fallback={<QASkeleton />}
      >
        <QA />
      </LazyOnVisible>
    </div>
  );
}
```

---

### Advanced Webpack Configuration

```javascript
// webpack.config.js
const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    publicPath: '/static/',
    clean: true
  },
  
  optimization: {
    moduleIds: 'deterministic', // Stable chunk IDs
    runtimeChunk: 'single',     // Separate runtime chunk
    
    splitChunks: {
      chunks: 'all',
      minSize: 20000,      // Don't create chunks smaller than 20KB
      maxSize: 244000,     // Try to keep chunks under 244KB
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      
      cacheGroups: {
        // React and React DOM (changes together)
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react-vendor',
          chunks: 'all',
          priority: 30,
          enforce: true
        },
        
        // React Router
        router: {
          test: /[\\/]node_modules[\\/](react-router|react-router-dom|history)[\\/]/,
          name: 'router-vendor',
          chunks: 'all',
          priority: 25,
          enforce: true
        },
        
        // UI library (Material-UI, Ant Design, etc.)
        ui: {
          test: /[\\/]node_modules[\\/](@mui|antd)[\\/]/,
          name: 'ui-vendor',
          chunks: 'all',
          priority: 20,
          enforce: true
        },
        
        // Chart libraries
        charts: {
          test: /[\\/]node_modules[\\/](chart\.js|recharts|d3|plotly\.js)[\\/]/,
          name: 'charts-vendor',
          chunks: 'async', // Only in async chunks (not initial bundle)
          priority: 18,
          enforce: true
        },
        
        // Date/time libraries
        datetime: {
          test: /[\\/]node_modules[\\/](moment|date-fns|dayjs)[\\/]/,
          name: 'datetime-vendor',
          chunks: 'all',
          priority: 15,
          enforce: true
        },
        
        // Other vendors
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true
        },
        
        // Common code shared across multiple chunks
        common: {
          minChunks: 2,
          name: 'common',
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true,
          enforce: true
        }
      }
    },
    
    // Minimize
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.logs in production
          },
        },
      }),
    ],
  },
  
  plugins: [
    // Analyze bundle sizes
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE ? 'server' : 'disabled',
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json'
    }),
    
    // Gzip compression
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240, // Only compress files > 10KB
      minRatio: 0.8
    }),
    
    // Brotli compression
    new CompressionPlugin({
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
      filename: '[path][base].br'
    })
  ],
  
  // Performance hints
  performance: {
    maxEntrypointSize: 250000,   // 250KB max for entry point
    maxAssetSize: 500000,         // 500KB max for any asset
    hints: 'warning',
    assetFilter: (assetFilename) => {
      // Only warn about JS files
      return assetFilename.endsWith('.js');
    }
  }
};
```

---

### Monitoring Chunk Loading Performance

```javascript
// utils/chunkMonitoring.js
/**
 * Monitor chunk loading performance and failures
 */
class ChunkMonitor {
  constructor() {
    this.loadTimes = new Map();
    this.failures = [];
    this.init();
  }
  
  init() {
    // Monitor all resource loading
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('.chunk.js')) {
          this.trackChunkLoad(entry);
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
    
    // Report on page unload
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.report();
      }
    });
  }
  
  trackChunkLoad(entry) {
    const chunkName = this.extractChunkName(entry.name);
    const loadTime = entry.duration;
    
    this.loadTimes.set(chunkName, {
      name: chunkName,
      duration: loadTime,
      size: entry.transferSize,
      cached: entry.transferSize === 0,
      timestamp: Date.now()
    });
    
    // Alert on slow chunks
    if (loadTime > 3000) {
      console.warn(`Slow chunk load: ${chunkName} took ${loadTime}ms`);
      
      this.failures.push({
        chunkName,
        type: 'slow',
        duration: loadTime,
        timestamp: Date.now()
      });
    }
  }
  
  trackChunkFailure(chunkName, error) {
    console.error(`Chunk load failure: ${chunkName}`, error);
    
    this.failures.push({
      chunkName,
      type: 'error',
      error: error.message,
      timestamp: Date.now()
    });
  }
  
  extractChunkName(url) {
    const match = url.match(/\/([^/]+)\.chunk\.js/);
    return match ? match[1] : 'unknown';
  }
  
  report() {
    const metrics = {
      loadedChunks: Array.from(this.loadTimes.values()),
      failures: this.failures,
      summary: {
        totalChunks: this.loadTimes.size,
        cachedChunks: Array.from(this.loadTimes.values()).filter(c => c.cached).length,
        failedChunks: this.failures.length,
        avgLoadTime: this.calculateAverage(),
        p95LoadTime: this.calculatePercentile(95)
      }
    };
    
    // Send to analytics
    if (navigator.sendBeacon && window.ANALYTICS_ENDPOINT) {
      const blob = new Blob([JSON.stringify(metrics)], { 
        type: 'application/json' 
      });
      navigator.sendBeacon(window.ANALYTICS_ENDPOINT + '/chunks', blob);
    }
    
    return metrics;
  }
  
  calculateAverage() {
    const times = Array.from(this.loadTimes.values())
      .filter(c => !c.cached)
      .map(c => c.duration);
    
    if (times.length === 0) return 0;
    return times.reduce((sum, t) => sum + t, 0) / times.length;
  }
  
  calculatePercentile(percentile) {
    const times = Array.from(this.loadTimes.values())
      .filter(c => !c.cached)
      .map(c => c.duration)
      .sort((a, b) => a - b);
    
    if (times.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * times.length) - 1;
    return times[index];
  }
  
  getMetrics() {
    return {
      loadTimes: Array.from(this.loadTimes.values()),
      failures: this.failures,
      summary: {
        totalChunks: this.loadTimes.size,
        avgLoadTime: this.calculateAverage(),
        p95LoadTime: this.calculatePercentile(95)
      }
    };
  }
}

// Initialize monitor
const chunkMonitor = new ChunkMonitor();

// Expose globally for debugging
if (process.env.NODE_ENV === 'development') {
  window.__chunkMonitor = chunkMonitor;
}

export default chunkMonitor;
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience**:
- **Faster initial load**: 73% reduction in bundle size → 70% improvement in TTI
- **Better mobile experience**: Critical for slow networks and low-end devices
- **Reduced bounce rates**: Users stay when pages load fast
- **Improved perceived performance**: Progressive loading feels responsive

**Business Impact**:
- **Higher conversion rates**: 100ms faster → 1% higher conversions (Amazon study)
- **Better retention**: Users return to fast applications
- **Lower infrastructure costs**: Reduced bandwidth usage (50K+/month savings)
- **Competitive advantage**: Performance is a differentiator

**Developer Productivity**:
- **Faster development builds**: Smaller chunks rebuild faster
- **Better caching**: Unchanged code doesn't re-download
- **Easier debugging**: Smaller chunks easier to analyze
- **Clear boundaries**: Forces better architecture

**Technical Benefits**:
- **Parallel downloads**: HTTP/2 allows simultaneous chunk loading
- **Better caching strategy**: Different chunks, different cache lifetimes
- **Reduced memory footprint**: Only load what's needed
- **Graceful degradation**: Core features load even if secondary chunks fail

### How It Works

**Technical Flow**:
```
1. Build time (Webpack/Vite):
   - Analyze import statements
   - Create dependency graph
   - Split into chunks based on strategy
   - Generate manifest mapping chunks to routes/components

2. Runtime (Browser):
   - Load initial bundle (main.js + critical vendors)
   - Parse and execute core app logic
   - User navigates or triggers feature
   - Dynamic import() triggers chunk fetch
   - Browser downloads chunk from CDN
   - Chunk executes and component renders

3. Caching layer:
   - Check browser cache (Service Worker)
   - Check CDN edge cache
   - Fetch from origin if needed
   - Cache for future requests
```

**Implementation Strategy**:
1. **Start with route-based splitting** (80% of benefit, 20% of effort)
2. **Add vendor splitting** (improve caching for returning users)
3. **Identify heavy components** (charts, editors, modals)
4. **Split conditionally-rendered features** (admin, premium, below-fold)
5. **Add prefetching** for likely next steps (hide latency)
6. **Monitor and iterate** based on real user data

**Key Principle**: 
> "Split strategically—not everything. Load critical code immediately, defer secondary code, prefetch likely code. Measure impact continuously."

────────────────────────────────────

**In a senior/staff interview, demonstrate**:
- Strategic thinking (route-based foundation, component-based refinement)
- Production experience (monitoring, error handling, caching strategy)
- Performance impact (specific metrics, before/after comparisons)
- Trade-off awareness (over-splitting, HTTP overhead, complexity)
- Testing strategy (unit tests, bundle size tests, E2E with network conditions)
- Business acumen (conversion impact, infrastructure costs, mobile-first markets)
- Real war stories (debugging chunk failures, optimizing cache hit rates)
