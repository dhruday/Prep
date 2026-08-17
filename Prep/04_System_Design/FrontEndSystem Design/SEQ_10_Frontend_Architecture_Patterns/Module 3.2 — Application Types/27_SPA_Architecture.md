# 27. SPA Architecture (Single Page Application)

## 1. High-Level Explanation (Frontend Interview Level)

**SPA (Single Page Application)** loads a **single HTML page** and dynamically updates content via JavaScript without full page reloads—characteristic of modern web apps (Gmail, Twitter, Facebook) where routing, rendering, and state management happen client-side, providing desktop-like experience with instant navigation and rich interactivity.

**Core Characteristics**:
- **Single HTML page**: Initial load, then JavaScript updates DOM
- **Client-side routing**: URL changes without page reload (History API)
- **Dynamic content**: Fetch data via API, render with JavaScript
- **Rich UX**: Instant transitions, no page flicker

**Key Principle**: "Load once, update dynamically—all rendering happens in browser, backend serves only data (API), enables fast navigation and rich interactions at cost of initial bundle size and SEO complexity."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Architecture Overview

**Traditional MPA** (Multi-Page Application):
```
User clicks link:
├── Browser requests new HTML from server
├── Server renders full HTML page
├── Browser loads HTML, CSS, JS, images
├── Page flicker (white screen during load)
└── Slow (200-1000ms per navigation)

Each page = new HTTP request + full reload
```

**SPA** (Single Page Application):
```
Initial load:
├── Load index.html (minimal)
├── Load app.bundle.js (2-5MB, all features)
├── JavaScript boots React/Vue/Angular app
└── Render initial view

User clicks link:
├── JavaScript intercepts click (prevent default)
├── Update URL (History API, no page reload)
├── Fetch data from API (if needed)
├── Update DOM (Virtual DOM diff)
└── Instant transition (0-50ms)

Only API requests after initial load (no HTML reloads)
```

---

### Core Components

#### 1. **Single HTML Entry Point**

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>My SPA</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="root"></div>  <!-- App mounts here -->
  
  <script src="/app.bundle.js"></script>  <!-- SPA JavaScript (2-5MB) -->
</body>
</html>
```

**Key Points**:
- Minimal HTML (no content)
- Single `<div id="root">` (mount point)
- JavaScript renders everything

---

#### 2. **Client-Side Routing**

**Purpose**: Change URL without page reload (History API).

**React Router Example**:
```jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>  {/* Click updates URL, no reload */}
        <Link to="/products">Products</Link>
        <Link to="/about">About</Link>
      </nav>
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}

// Navigation flow:
// 1. User clicks <Link to="/products">
// 2. React Router intercepts (preventDefault)
// 3. Updates URL: history.pushState({}, '', '/products')
// 4. Re-renders with <Products /> component
// 5. No page reload (instant, 0-50ms)
```

**History API**:
```javascript
// Push new URL (without reload)
history.pushState({ page: 'products' }, 'Products', '/products');

// Listen for back/forward buttons
window.addEventListener('popstate', (event) => {
  // Re-render appropriate component
  console.log('Navigate to:', event.state);
});

// Update URL without adding to history
history.replaceState({ page: 'products' }, 'Products', '/products');
```

**Routing Modes**:

**1. Hash Mode** (`#`):
```
URL: https://example.com/#/products
    ↑ Hash (ignored by server, handled by JavaScript)

Pros: Works without server config (no 404s)
Cons: Ugly URLs (#), bad for SEO
```

**2. History Mode** (HTML5):
```
URL: https://example.com/products
    ↑ Clean URL (but needs server config)

Pros: Clean URLs, better SEO
Cons: Needs server fallback (redirect all routes to index.html)

Server config (Nginx):
location / {
  try_files $uri /index.html;  # Fallback to SPA
}
```

---

#### 3. **Data Fetching (API-Driven)**

**SPA flow**:
```jsx
function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch data from API (not server-rendered)
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <Spinner />;
  
  return (
    <div>
      {products.map(product => <ProductCard key={product.id} {...product} />)}
    </div>
  );
}

// API returns JSON (not HTML):
// GET /api/products → [{ id: 1, name: "Product A" }, ...]
```

**Backend Role**:
- Serve static files (index.html, app.bundle.js)
- Expose REST/GraphQL APIs (JSON responses)
- No HTML rendering (SPA handles)

---

#### 4. **State Management**

**Problem**: SPA has complex client-side state (auth, cart, filters, etc.).

**Solution**: Centralized state (Redux, Zustand, Context).

**Example** (Redux):
```jsx
// Store (global state)
const store = createStore({
  auth: { user: null, token: null },
  cart: { items: [], total: 0 },
  products: { list: [], filters: {} }
});

// Component A: Add to cart
function ProductCard({ product }) {
  const dispatch = useDispatch();
  
  const handleAddToCart = () => {
    dispatch(addToCart(product));  // Update global state
  };
  
  return <button onClick={handleAddToCart}>Add to Cart</button>;
}

// Component B: Show cart count (unrelated to Component A)
function CartBadge() {
  const cartCount = useSelector(state => state.cart.items.length);
  return <span>{cartCount}</span>;  // Auto-updates when cart changes
}

// State persists across navigation (no page reloads)
```

---

### SPA Lifecycle

**1. Initial Load**:
```
User visits https://example.com:
├── Browser requests index.html (~1KB)
├── Server responds with HTML (minimal)
├── Browser parses HTML, finds <script src="/app.bundle.js">
├── Browser downloads app.bundle.js (2-5MB)
│   ├── React library (~100KB)
│   ├── App code (~500KB)
│   ├── Dependencies (~1-4MB)
│   └── Total: 2-5MB
├── JavaScript boots app (parse + compile + execute)
│   ├── Parse: 500-1000ms (large bundle)
│   ├── Compile: 200-500ms (V8 JIT)
│   └── Execute: 100-300ms (render initial view)
├── Initial render: <App /> → <Home />
└── Time to Interactive (TTI): 1-3s (slow)

Problem: Large initial bundle (slow first load)
```

**2. Navigation**:
```
User clicks link (/products):
├── React Router intercepts click (preventDefault)
├── Updates URL: history.pushState({}, '', '/products')
├── Unmount <Home />, mount <Products />
├── <Products /> fetches data: fetch('/api/products')
│   ├── API request: 50-200ms
│   ├── Parse JSON: 10-50ms
│   └── Re-render: 10-50ms
└── Total: 70-300ms (fast, no page reload)

Benefit: Instant navigation (no white screen)
```

**3. Deep Link** (Direct URL):
```
User visits https://example.com/products (directly):
├── Browser requests /products
├── Server responds with index.html (fallback)
├── Browser loads app.bundle.js (2-5MB)
├── JavaScript boots app
├── Router matches /products → <Products />
├── Fetch data: fetch('/api/products')
└── Render

Problem: Same slow initial load (even for deep link)
```

---

### Advantages

#### 1. **Fast Navigation** (No Page Reloads)

```
Traditional MPA:
User clicks link → Request HTML (200ms) → Load CSS/JS (500ms) → Render (100ms) = 800ms

SPA:
User clicks link → Update DOM (50ms) → Fetch API (100ms) → Render (50ms) = 200ms

4× faster navigation (no white screen)
```

**Example**: Gmail inbox → email (instant transition, no reload).

---

#### 2. **Rich UX** (Desktop-Like)

**Smooth Transitions**:
```jsx
function PageTransition({ children }) {
  return (
    <CSSTransition in={true} timeout={300} classNames="fade">
      {children}  {/* Fade in/out effect */}
    </CSSTransition>
  );
}

// MPA: Can't do this (page reloads)
// SPA: Smooth animations between views
```

**Optimistic Updates**:
```jsx
function LikeButton({ postId }) {
  const [liked, setLiked] = useState(false);
  
  const handleLike = () => {
    setLiked(true);  // Update UI immediately (optimistic)
    
    api.likePost(postId).catch(() => {
      setLiked(false);  // Revert on error
    });
  };
  
  return <button onClick={handleLike}>{liked ? '❤️' : '🤍'}</button>;
}

// MPA: Must wait for server response (slow, 200ms)
// SPA: Instant feedback (0ms), API call in background
```

---

#### 3. **Reduced Server Load**

```
MPA:
├── Every navigation = full HTML render (server-side)
├── 1000 users × 10 pages = 10,000 server renders
└── High CPU usage (templates, database queries)

SPA:
├── Initial load = serve index.html (static, cached)
├── Navigation = serve JSON (lightweight)
├── 1000 users × 10 pages = 10,000 JSON responses
└── Low CPU usage (no HTML rendering)

Result: SPA = 10× less server load (serve static files + JSON)
```

---

#### 4. **Code Reuse** (Single Codebase)

```
SPA (React):
├── Components work on web + mobile (React Native)
├── Business logic reusable (services, utils)
└── Example: Airbnb shares 90% code between web + mobile

MPA (Rails/Django):
├── Server renders HTML (backend templates)
├── Mobile app needs separate codebase (iOS/Android)
└── No code sharing (2× development cost)
```

---

### Disadvantages

#### 1. **Slow Initial Load** (Large Bundle)

```
First visit:
├── Download app.bundle.js: 2-5MB (2G network = 10-30s)
├── Parse + compile: 500-1500ms (mobile = slow)
├── Execute + render: 100-300ms
└── TTI: 2-5s (bad UX on slow networks)

MPA:
├── Download HTML: 10KB (fast)
├── Server-rendered (no JavaScript needed)
└── TTI: 200-500ms (5-10× faster)
```

**Solutions**:
- **Code splitting**: Load only needed code (lazy loading)
- **Tree shaking**: Remove unused code (reduce bundle)
- **Compression**: Gzip/Brotli (70-90% smaller)

**Example** (Code Splitting):
```jsx
// ❌ Load all routes upfront (5MB bundle)
import Home from './Home';
import Products from './Products';
import About from './About';

// ✅ Lazy load routes (500KB initial, load others on demand)
const Home = lazy(() => import('./Home'));
const Products = lazy(() => import('./Products'));
const About = lazy(() => import('./About'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<Home />} />  {/* Loads on access */}
        <Route path="/products" element={<Products />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Suspense>
  );
}

Result: Initial bundle 5MB → 500KB (10× smaller)
```

---

#### 2. **SEO Challenges** (No Server-Rendered HTML)

```
SPA:
├── Googlebot visits https://example.com/products
├── Server responds with index.html (<div id="root"></div>)
├── No content (JavaScript renders it)
├── Googlebot may not execute JavaScript (or delays)
└── Bad SEO (content not indexed)

MPA:
├── Googlebot visits https://example.com/products
├── Server responds with full HTML (<h1>Products</h1> ...)
├── Content visible immediately (no JavaScript needed)
└── Good SEO (content indexed)
```

**Solutions**:
- **Prerendering**: Generate static HTML for crawlers (Prerender.io)
- **SSR (Server-Side Rendering)**: Next.js (React), Nuxt.js (Vue)
- **Hydration**: Server renders HTML, client hydrates with JavaScript

**Example** (Prerendering):
```
User/Googlebot visits /products:
├── Check if bot (User-Agent: Googlebot)
├── If bot → serve prerendered HTML (static)
├── If user → serve SPA (index.html)
└── Result: SEO works, SPA UX for users
```

---

#### 3. **Memory Leaks** (Long-Lived App)

```
SPA:
├── App runs for hours (no page reloads)
├── Memory accumulates (event listeners, timers, data)
├── Example: 100MB → 500MB → 1GB (crash)
└── Need explicit cleanup

MPA:
├── Page reload clears memory (fresh start)
├── No memory leaks (browser resets)
└── Simpler (no cleanup needed)
```

**Solution**: Clean up in `useEffect`:
```jsx
function Component() {
  useEffect(() => {
    const interval = setInterval(() => console.log('Tick'), 1000);
    
    // Cleanup (when component unmounts)
    return () => clearInterval(interval);
  }, []);
}
```

---

#### 4. **JavaScript Dependency** (No Fallback)

```
SPA:
├── JavaScript disabled → blank page (no content)
├── JavaScript error → app crashes (no fallback)
└── Example: <div id="root"></div> stays empty

MPA:
├── JavaScript disabled → still works (server-rendered HTML)
├── JavaScript enhances (not required)
└── Progressive enhancement
```

**Solution**: Show fallback in HTML:
```html
<div id="root">
  <noscript>
    <h1>JavaScript Required</h1>
    <p>Please enable JavaScript to use this app.</p>
  </noscript>
</div>
```

---

#### 5. **Browser History Issues**

```
SPA:
├── User navigates: Home → Products → About
├── Each navigation: history.pushState()
├── User clicks back button → browser pops state
├── SPA must handle popstate event (re-render correct component)
└── Complex (easy to break back/forward)

MPA:
├── Browser handles history (native)
├── Back button = request previous page (automatic)
└── Simple (works out of box)
```

---

### Performance Optimization

#### 1. **Code Splitting** (Lazy Loading)

```jsx
// Route-based splitting
const Dashboard = lazy(() => import('./Dashboard'));
const Analytics = lazy(() => import('./Analytics'));

// Component-based splitting (load heavy component on demand)
const HeavyChart = lazy(() => import('./HeavyChart'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyChart />  {/* Loads only when rendered */}
    </Suspense>
  );
}
```

---

#### 2. **Prefetching** (Load Before Needed)

```jsx
// Prefetch next route (on hover)
<Link to="/products" onMouseEnter={() => {
  import('./Products');  // Preload in background
}}>
  Products
</Link>

// Prefetch on idle
requestIdleCallback(() => {
  import('./Dashboard');  // Load when browser idle
});
```

---

#### 3. **Service Workers** (Offline Cache)

```javascript
// Cache app shell (index.html, app.bundle.js)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/index.html',
        '/app.bundle.js',
        '/styles.css'
      ]);
    })
  );
});

// Serve from cache (offline support)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);  // Cache first, then network
    })
  );
});

Result: SPA works offline (PWA)
```

---

## 3. Clear Real-World Examples

### Example 1: **Gmail** (Classic SPA)

**Architecture**: SPA (initially GWT, now Angular/Closure).

**Characteristics**:
- **No page reloads**: Inbox → email (instant transition)
- **Rich UX**: Drag-and-drop, keyboard shortcuts, undo
- **Offline**: Service Workers (read emails offline)
- **Fast navigation**: Client-side routing (0-50ms)

**Trade-offs**:
- **Slow initial load**: ~2MB bundle, 2-3s TTI
- **SEO**: Not needed (email client, requires login)

---

### Example 2: **Twitter** (SPA with SSR)

**Architecture**: SPA (React) + Server-Side Rendering (SSR).

**Flow**:
```
First visit:
├── Server renders HTML with tweets (SSR, SEO-friendly)
├── Client hydrates (React attaches event listeners)
├── Subsequent navigation = SPA (no page reloads)
└── Result: Fast first load + SEO + SPA UX

Later navigation:
├── Client-side routing (instant transitions)
├── API requests for new data (JSON)
└── No page reloads
```

**Benefits**:
- **SEO**: Server-rendered HTML (crawlable)
- **Fast first load**: HTML ready, no JavaScript parse delay
- **SPA UX**: Instant navigation after hydration

---

### Example 3: **Airbnb** (Migrated SPA → Hybrid)

**Initial** (2014-2016): Pure SPA (React).

**Problems**:
- **Slow initial load**: 3MB bundle, 5s TTI (mobile)
- **Poor SEO**: Search listings not indexed
- **High bounce rate**: Users leave before app loads

**Migration** (2017+): Hybrid (SSR + SPA).

**Solution**:
- **Server-Side Rendering**: First page HTML rendered on server (SEO, fast)
- **Hydration**: Client hydrates for interactivity
- **SPA navigation**: Subsequent navigation client-side (instant)

**Result**: 50% faster first load, 30% better SEO, 20% higher engagement.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain SPA architecture and trade-offs."

**Answer**:

"**SPA (Single Page Application)** loads a **single HTML page** and **dynamically updates content** via JavaScript without full page reloads—all rendering happens client-side, backend serves only data (APIs), provides desktop-like experience with instant navigation.

---

### Architecture

**Initial Load**:
```
1. Browser requests index.html (minimal HTML, ~1KB)
2. Load app.bundle.js (React/Vue/Angular + app code, 2-5MB)
3. JavaScript boots app (parse + compile + execute, 1-3s)
4. Render initial view (<App />)
```

**Navigation**:
```
User clicks link (/products):
1. JavaScript intercepts (preventDefault)
2. Update URL (History API, no page reload)
3. Fetch data (API request, JSON)
4. Update DOM (Virtual DOM, re-render)
5. Total: 50-200ms (instant, no white screen)
```

**vs MPA** (Multi-Page Application):
```
MPA:
├── Every navigation = full HTML request (200-1000ms)
├── Page reload (white screen flicker)
└── Server renders HTML

SPA:
├── Navigation = API request (50-200ms)
├── No page reload (instant transition)
└── Client renders HTML
```

---

### Core Components

**1. Client-Side Routing** (React Router):
```jsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/products" element={<Products />} />
  </Routes>
</BrowserRouter>

// Clicks update URL without reload (History API)
history.pushState({}, '', '/products');
```

**2. API-Driven** (Backend serves JSON):
```jsx
useEffect(() => {
  fetch('/api/products').then(res => res.json()).then(setProducts);
}, []);

// Backend: REST/GraphQL APIs (no HTML rendering)
```

**3. State Management** (Redux/Zustand):
```jsx
// Global state persists across navigation (no page reloads)
const cart = useSelector(state => state.cart);
```

---

### Advantages

**1. Fast Navigation** (No Page Reloads):
- Click link → Update DOM (50ms) vs MPA (800ms)
- No white screen flicker (smooth transitions)
- Example: Gmail inbox → email (instant)

**2. Rich UX** (Desktop-Like):
- Smooth animations (page transitions)
- Optimistic updates (instant feedback, API in background)
- Offline support (Service Workers, PWA)

**3. Reduced Server Load**:
- Serve static files (index.html, app.bundle.js cached)
- APIs return JSON (lightweight vs full HTML)
- 10× less server load vs MPA (no HTML rendering)

**4. Code Reuse**:
- Same codebase for web + mobile (React Native)
- Example: Airbnb shares 90% code

---

### Disadvantages

**1. Slow Initial Load** (Large Bundle):
- Download 2-5MB bundle (2G network = 10-30s)
- Parse + compile (500-1500ms on mobile)
- TTI: 2-5s vs MPA (200-500ms)
- **Solution**: Code splitting (lazy load routes, 5MB → 500KB initial), tree shaking (remove unused code), compression (Gzip/Brotli 70-90% smaller)

**2. SEO Challenges** (No Server-Rendered HTML):
- Googlebot sees `<div id="root"></div>` (empty, no content)
- Googlebot may not execute JavaScript (or delays)
- **Solution**: Prerendering (static HTML for bots), SSR (Next.js, Nuxt.js server-render first page), hydration (server HTML + client JavaScript)

**3. Memory Leaks** (Long-Lived App):
- SPA runs for hours (no page reloads)
- Memory accumulates (event listeners, timers, data)
- Example: 100MB → 1GB (crash)
- **Solution**: Cleanup in useEffect (return cleanup function, clear intervals/listeners)

**4. JavaScript Dependency** (No Fallback):
- JavaScript disabled → blank page (no content)
- JavaScript error → app crashes (no fallback)
- **Solution**: Progressive enhancement (fallback HTML), error boundaries (catch errors)

**5. Browser History Issues**:
- Must manually handle back/forward (popstate event)
- Easy to break (complex state management)
- MPA: Browser handles natively (automatic)

---

### Performance Optimization

**1. Code Splitting** (Lazy Loading):
```jsx
const Dashboard = lazy(() => import('./Dashboard'));
// Load only when route accessed (5MB → 500KB initial)
```

**2. Prefetching** (Load Before Needed):
```jsx
<Link onMouseEnter={() => import('./Products')}>Products</Link>
// Preload in background (hover)
```

**3. Service Workers** (Offline Cache):
```javascript
caches.open('v1').then(cache => cache.addAll(['/index.html', '/app.bundle.js']));
// Cache app shell, works offline (PWA)
```

---

### Real-World

**Gmail**: Classic SPA (no page reloads, rich UX drag-and-drop keyboard shortcuts, offline Service Workers), trade-off: slow initial load 2-3s TTI but SEO not needed email client.

**Twitter**: SPA + SSR (first visit server-rendered HTML SEO-friendly fast load, subsequent navigation SPA instant transitions), result: best of both worlds.

**Airbnb**: Migrated pure SPA → hybrid SSR+SPA (2017), problems: slow initial load 5s TTI poor SEO high bounce rate, solution: SSR first page fast SEO + SPA navigation instant, result: 50% faster first load 30% better SEO 20% higher engagement.

---

### Trade-offs

**SPA vs MPA**:

| Aspect | SPA | MPA |
|--------|-----|-----|
| **Initial Load** | Slow (2-5s, large bundle) | Fast (200-500ms, HTML) |
| **Navigation** | Fast (50-200ms, no reload) | Slow (800ms, page reload) |
| **SEO** | Challenging (no HTML) | Good (server-rendered) |
| **UX** | Rich (animations, optimistic) | Basic (page flicker) |
| **Server Load** | Low (static + JSON) | High (HTML rendering) |
| **Complexity** | High (state, routing, memory) | Low (browser handles) |

**When to Use**:

**SPA**:
- **Web apps** (dashboards, admin panels, Gmail-like)
- **Rich interactivity** (drag-and-drop, real-time)
- **Authenticated** (SEO not critical, requires login)
- **Mobile-like UX** (instant transitions, offline)

**MPA** (or Hybrid SSR+SPA):
- **Content sites** (blogs, e-commerce, news)
- **SEO-critical** (search listings, public content)
- **Fast first load** (low-end devices, slow networks)

**Follow-up I Expect**:

Q: 'How to solve SPA slow initial load?'
A: **Code splitting**: Lazy load routes (`lazy(() => import('./Dashboard'))`), only load needed code (5MB → 500KB initial). **Tree shaking**: Remove unused code (Webpack/Rollup eliminate dead code). **Compression**: Gzip/Brotli (70-90% smaller bundle). **CDN**: Serve from edge (fast download). **HTTP/2**: Parallel downloads (multiplexing). **Result**: 5MB bundle → 500KB initial (10× smaller), TTI 5s → 1s.

Q: 'How to solve SPA SEO issues?'
A: **Prerendering**: Generate static HTML for crawlers (Prerender.io detects bot User-Agent serves cached HTML). **SSR (Server-Side Rendering)**: Next.js (React) Nuxt.js (Vue) render first page on server (HTML ready crawlable fast), hydrate client-side (attach event listeners), subsequent navigation SPA (instant). **Hydration**: Server HTML + client JavaScript (best of both worlds). **Trade-off**: SSR adds complexity (server infrastructure Node.js runtime caching)."

---

## 5. Code Examples

See Deep-Dive section for comprehensive code examples covering:
- Client-side routing (React Router, History API)
- Data fetching (API-driven, useEffect)
- State management (Redux, centralized state)
- Code splitting (lazy loading, route-based)
- Service Workers (offline cache, PWA)

---

## 6. Why & How Summary

### Why It Matters

**User Experience**: Fast navigation (instant transitions 50-200ms vs MPA 800ms no page reload no white screen flicker), rich interactivity (desktop-like smooth animations optimistic updates instant feedback), offline support (Service Workers PWA cache app shell works without network)  
**Developer Experience**: Single codebase (code reuse web + mobile React Native Airbnb shares 90%), component-based (React Vue Angular modular testable), modern tooling (Webpack Babel hot reload fast iteration)  
**Business Impact**: Reduced server load (serve static files + JSON 10× less CPU vs MPA HTML rendering every request), higher engagement (instant navigation rich UX 20% higher engagement Airbnb), code efficiency (share logic across platforms single team)

### How It Works

**Architecture**: Single HTML page (index.html minimal ~1KB with `<div id="root"></div>` mount point), load JavaScript bundle (app.bundle.js 2-5MB React/Vue/Angular + app code), JavaScript boots app (parse 500-1000ms compile 200-500ms execute 100-300ms render initial view), TTI 1-3s slow initial load  
**Navigation**: Client-side routing (React Router intercepts clicks preventDefault, History API `history.pushState()` update URL without reload, unmount old component mount new component, fetch data from API if needed JSON response, update DOM Virtual DOM diff re-render, total 50-200ms instant no white screen)  
**Data Flow**: API-driven (backend serves JSON not HTML, REST or GraphQL endpoints, SPA fetches data useEffect fetch('/api/products'), render components with data), state management (Redux Zustand global state persists across navigation no page reloads, Component A dispatches action Component B subscribes to state auto-updates)  
**Advantages**: Fast navigation (no page reloads instant transitions), rich UX (animations optimistic updates offline), reduced server load (static files cached + lightweight JSON vs full HTML rendering), code reuse (web + mobile single codebase)  
**Disadvantages**: Slow initial load (large bundle 2-5MB parse compile 1-3s TTI solution: code splitting lazy load routes 5MB → 500KB tree shaking compression Gzip/Brotli 70-90% smaller), SEO challenges (no server-rendered HTML Googlebot sees empty `<div>` solution: prerendering static HTML for bots or SSR Next.js Nuxt.js server-render first page hydrate client), memory leaks (long-lived app no page reloads memory accumulates solution: cleanup useEffect return clear intervals listeners), JavaScript dependency (disabled or error blank page solution: noscript fallback error boundaries), browser history (manual handle popstate back/forward complex vs MPA automatic)  
**Optimization**: Code splitting (lazy load `React.lazy()` route-based component-based load on demand), prefetching (preload next route on hover requestIdleCallback when browser idle), Service Workers (cache app shell index.html app.bundle.js offline support PWA)

**FAANG Expectation**: Define SPA (single HTML page dynamic updates JavaScript no page reloads client-side routing rendering state management), architecture (initial load index.html + app.bundle.js 2-5MB parse compile execute TTI 1-3s, navigation JavaScript intercepts History API update URL fetch API update DOM 50-200ms instant), core components (client-side routing React Router History API, API-driven backend JSON not HTML, state management Redux Zustand global state persists), advantages (fast navigation instant no reload, rich UX animations optimistic offline, reduced server load static + JSON vs HTML rendering, code reuse web + mobile), disadvantages (slow initial load 2-5MB bundle TTI 1-3s solution code splitting tree shaking compression, SEO challenges no HTML solution prerendering or SSR Next.js Nuxt.js, memory leaks long-lived app solution cleanup useEffect, JavaScript dependency no fallback solution noscript error boundaries, browser history manual handle complex), performance optimization (code splitting lazy load routes 5MB → 500KB, prefetching preload on hover idle, Service Workers cache offline PWA), real-world examples (Gmail classic SPA no reloads rich UX offline trade-off slow initial load, Twitter SPA + SSR first visit server-rendered SEO fast subsequent SPA instant, Airbnb migrated pure SPA → hybrid SSR+SPA 50% faster first load 30% better SEO), when to use (web apps dashboards admin panels authenticated rich interactivity mobile-like UX vs MPA or hybrid SSR+SPA for content sites e-commerce SEO-critical fast first load)
