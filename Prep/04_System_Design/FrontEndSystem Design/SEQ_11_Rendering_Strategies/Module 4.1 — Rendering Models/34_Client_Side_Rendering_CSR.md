# 28. Client-Side Rendering (CSR)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Client-Side Rendering (CSR)** is a rendering architecture where the browser downloads a minimal HTML shell and JavaScript bundles, then **JavaScript executes on the client** to construct the DOM, fetch data, and manage all UI interactions and navigation. The server's role is reduced to serving static assets (HTML shell, JS, CSS) and API endpoints—no HTML rendering happens on the server.

### What It Is

**CSR Flow**:
```
1. Browser requests /app
2. Server responds: minimal HTML + <script> tags
3. Browser downloads JS bundles (main.js, vendor.js, chunks)
4. JS executes → constructs virtual DOM → renders UI
5. JS fetches data from APIs → updates UI
6. Client-side router handles navigation (no page reload)
```

**Minimal HTML Shell** (typical CSR response):
```html
<!DOCTYPE html>
<html>
<head>
  <title>App</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <div id="root"></div>
  <script src="/vendor.js"></script>
  <script src="/main.js"></script>
</body>
</html>
```

**Key Characteristic**: Server sends **no pre-rendered content**—just an empty `<div id="root">` and scripts that will build the UI.

### Why It Exists

**1. Rich Interactivity**
- Desktop-class experiences (Figma, Notion, Google Docs)
- Real-time collaboration, drag-and-drop, complex state
- Instant feedback without server round-trips

**2. Decoupled Frontend/Backend**
- Backend exposes APIs (REST/GraphQL)
- Frontend teams iterate independently
- Same backend serves web, mobile, desktop apps

**3. Client-Side Routing**
- No full page reloads on navigation
- Smooth transitions, preserved scroll positions
- Instant route changes (feels like native app)

**4. Simplified Server Infrastructure**
- Server is just a static file CDN + API layer
- Scale horizontally with CDN (no server-side rendering overhead)
- Lower server costs (offload rendering to clients)

### When and Where It's Used

**Perfect For**:
- **Dashboards & Admin Panels**: Datadog, Grafana, internal tools
- **Productivity Apps**: Trello, Asana, Notion, Slack Web
- **Creative Tools**: Figma, Canva, Adobe Creative Cloud Web
- **Social Apps**: Twitter Web (hybrid), Discord
- **Internal Applications**: Where SEO is irrelevant

**Not Ideal For**:
- **Marketing/Landing Pages**: Need fast FCP and SEO
- **E-commerce Product Pages**: SEO-critical, need instant content
- **Content Sites**: Blogs, news, documentation (SEO first)
- **Mobile-First on Slow Networks**: Initial load time too high

### Role in Large-Scale Frontend Applications

At **FAANG scale**, CSR powers:

**Gmail** (CSR with aggressive caching):
- Initial load: ~200KB JS bundle
- Subsequent navigation: instant (all in-memory)
- Offline support via Service Workers

**Figma** (Pure CSR + WebAssembly):
- Complex canvas rendering
- 1M+ concurrent users
- CRDT-based real-time collaboration

**AWS Console** (CSR with micro-frontends):
- 100+ services, each a separate bundle
- Lazy-loaded modules per service
- Shared auth/shell layer

**Trade-offs at Scale**:
- ✅ **Pros**: Fast in-app navigation, rich UX, offline-first, independent deployments
- ❌ **Cons**: Slow initial load, poor SEO (unless mitigated), high client CPU/memory, JS dependency

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Browser Rendering Lifecycle in CSR

**Phase 1: Initial Load (Cold Start)**

```
1. DNS Lookup + TCP/TLS Handshake
   └─ ~100-300ms (network dependent)

2. HTML Download (minimal shell)
   └─ ~1-5KB (nearly empty)
   └─ TTFB: 50-200ms

3. HTML Parsing
   └─ Browser constructs DOM (minimal nodes)
   └─ Discovers <script> tags → blocks parsing

4. JavaScript Download
   └─ main.js (50-200KB gzipped)
   └─ vendor.js (100-300KB gzipped)
   └─ chunks.js (lazy loaded)

5. JavaScript Parse & Compile
   └─ Main thread blocked: 200-800ms
   └─ V8 parsing: bytecode generation
   └─ JIT compilation for hot code paths

6. JavaScript Execution (Framework Bootstrap)
   └─ React.render() / Vue.mount() / etc.
   └─ Component tree construction
   └─ Event listener attachment
   └─ Initial state setup

7. Data Fetching (useEffect / componentDidMount)
   └─ API calls to backend
   └─ Wait for responses (100-500ms)

8. Re-render with Data
   └─ Virtual DOM diff
   └─ Commit to real DOM
   └─ Layout, paint, composite

9. Time-to-Interactive (TTI)
   └─ Total: 2-5 seconds (3G network)
   └─ Total: 0.8-2 seconds (WiFi/4G)
```

**Phase 2: Client-Side Navigation (Hot Path)**

```
1. User clicks link → SPA router intercepts
2. history.pushState() updates URL
3. Route component lazy loads (if not cached)
   └─ import('./ProductPage.js') → 50-100ms
4. Component renders (already in memory)
5. Data fetch for new route
6. Update UI
Total: 100-300ms (feels instant)
```

### Critical Performance Bottlenecks

#### 1. JavaScript Parse Time (Main Thread Blocking)

**Problem**: Large JS bundles block the main thread during parse/compile.

**Real Example** (Netflix):
- Old bundle: 1.2MB (uncompressed), 350KB (gzipped)
- Parse time on mid-range Android: **3.5 seconds**
- Result: Blank screen for 3.5s on mobile

**Solution**:
```javascript
// Before: Single monolithic bundle
import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import Dashboard from './Dashboard'; // 500KB
import Analytics from './Analytics'; // 800KB
import Settings from './Settings';   // 300KB

// After: Code-split by route
const Dashboard = React.lazy(() => import('./Dashboard'));
const Analytics = React.lazy(() => import('./Analytics'));
const Settings = React.lazy(() => import('./Settings'));

// Result: Initial bundle 80KB → TTI improves from 3.5s to 1.2s
```

**Measurement**:
```javascript
// Long Task API (Chrome)
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn('Long task detected:', {
        duration: entry.duration,
        startTime: entry.startTime,
        attribution: entry.attribution
      });
    }
  }
});
observer.observe({ entryTypes: ['longtask'] });
```

#### 2. Waterfall Loading Pattern

**Anti-Pattern**:
```javascript
// Component renders → discovers it needs data → fetches
function ProductPage() {
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    // Fetch AFTER component mounts (too late!)
    fetch('/api/product/123').then(setProduct);
  }, []);
  
  if (!product) return <Spinner />; // User sees spinner
  return <ProductDetail product={product} />;
}

// Timeline:
// 0ms: HTML downloaded
// 500ms: JS parsed
// 800ms: Component mounted
// 800ms: Fetch initiated ← LATE!
// 1200ms: Data arrived
// Total: 1200ms blank/spinner
```

**Better Pattern** (Prefetch):
```javascript
// Prefetch data in parallel with JS download
<link rel="prefetch" href="/api/product/123" as="fetch" crossorigin>

// Or use loader pattern (React Router, Remix-style)
export async function loader({ params }) {
  return fetch(`/api/product/${params.id}`);
}

// Result: Data and JS download in parallel → save 400ms
```

#### 3. Bundle Size vs Cache Granularity

**Trade-off**:
```
Small chunks (50KB each):
  ✅ Better caching (change one file → others cached)
  ❌ More HTTP requests (HTTP/1.1 bottleneck)
  ❌ Worse compression (less shared context)

Large chunks (500KB each):
  ✅ Fewer requests
  ✅ Better compression ratio
  ❌ Worse caching (change invalidates large chunk)
```

**Production Solution** (Netflix approach):
```javascript
// webpack.config.js
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // Vendor code (rarely changes)
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10,
        reuseExistingChunk: true,
      },
      // Common code (shared across routes)
      common: {
        minChunks: 2,
        priority: 5,
        reuseExistingChunk: true,
        minSize: 20000, // 20KB minimum
      },
    },
  },
  // Runtime chunk (webpack runtime, rarely changes)
  runtimeChunk: 'single',
}

// Result:
// runtime.js (5KB) ← changes on every build
// vendors.js (300KB) ← changes rarely (cache 1 year)
// common.js (80KB) ← changes occasionally
// route-home.js (50KB) ← changes frequently
```

### Data Fetching Patterns

#### Pattern 1: Fetch-on-Render (Basic, Slow)

```javascript
function UserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(setUser);
  }, []);
  
  return user ? <Profile data={user} /> : <Loading />;
}

// Problem: Waterfall (fetch AFTER mount)
```

#### Pattern 2: Fetch-Then-Render (Better)

```javascript
// Start fetch BEFORE rendering
const userPromise = fetch('/api/user').then(r => r.json());

function UserProfile() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    userPromise.then(setUser);
  }, []);
  
  return user ? <Profile data={user} /> : <Loading />;
}

// Better: Fetch starts immediately on script execution
```

#### Pattern 3: Render-as-You-Fetch (Concurrent React)

```javascript
// Suspense + concurrent features
const userResource = fetchUser(); // Returns suspense resource

function UserProfile() {
  const user = userResource.read(); // Suspends if not ready
  return <Profile data={user} />;
}

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <UserProfile />
    </Suspense>
  );
}

// Fetch starts immediately, component suspends until ready
```

#### Pattern 4: Cache-Based (Production Grade)

```javascript
// React Query / SWR pattern
import { useQuery } from '@tanstack/react-query';

function UserProfile() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user'],
    queryFn: () => fetch('/api/user').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 min
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 min
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  
  if (isLoading) return <Loading />;
  if (error) return <Error error={error} />;
  return <Profile data={data} />;
}

// Benefits:
// - Automatic caching (no duplicate requests)
// - Background refetch (stale-while-revalidate)
// - Request deduplication
// - Retry logic
// - Garbage collection of old cache entries
```

### Memory Management in Long-Lived SPAs

**Problem**: SPAs keep growing memory usage over time (memory leaks).

**Common Leak Sources**:

**1. Event Listeners Not Cleaned**
```javascript
// ❌ Memory leak
function Component() {
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    // Missing cleanup!
  }, []);
}

// ✅ Proper cleanup
function Component() {
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
}
```

**2. Timers/Intervals Not Cleared**
```javascript
// ❌ Memory leak
function Component() {
  useEffect(() => {
    const interval = setInterval(pollData, 5000);
    // Missing cleanup!
  }, []);
}

// ✅ Proper cleanup
function Component() {
  useEffect(() => {
    const interval = setInterval(pollData, 5000);
    return () => clearInterval(interval);
  }, []);
}
```

**3. Detached DOM Nodes**
```javascript
// Problem: Old components remain in memory
let cachedComponents = [];

function cacheComponent(component) {
  cachedComponents.push(component); // Leaks if never cleared!
}

// Solution: WeakMap (auto garbage-collected)
let cachedComponents = new WeakMap();
```

**4. Large Client-Side Caches**
```javascript
// ❌ Unbounded cache (memory grows forever)
const cache = {};
function fetchData(key) {
  if (cache[key]) return cache[key];
  cache[key] = fetch(`/api/${key}`);
  return cache[key];
}

// ✅ LRU cache with size limit
import LRU from 'lru-cache';
const cache = new LRU({
  max: 500, // Max 500 entries
  maxAge: 1000 * 60 * 30, // 30 min TTL
});
```

**Monitoring Memory**:
```javascript
// Chrome Performance API
if (performance.memory) {
  console.log({
    totalJSHeapSize: performance.memory.totalJSHeapSize / 1048576, // MB
    usedJSHeapSize: performance.memory.usedJSHeapSize / 1048576,
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / 1048576,
  });
}

// Alert if memory grows too much
setInterval(() => {
  const used = performance.memory?.usedJSHeapSize / 1048576;
  if (used > 500) { // 500MB threshold
    console.warn('High memory usage:', used, 'MB');
    // Send telemetry or prompt user to refresh
  }
}, 60000);
```

### Scaling CSR to Millions of Users

#### CDN Strategy

**Layer 1: Static Assets (HTML/JS/CSS)**
```
Request: https://app.example.com/
  └─ CloudFlare / Cloudfront CDN
     └─ Cache-Control: public, max-age=31536000, immutable
     └─ Versioned URLs: main.a3f8b2.js (cache forever)

HTML shell:
  └─ Cache-Control: public, max-age=3600, s-maxage=3600
  └─ Revalidate every hour (ensure latest app version)
```

**Layer 2: API Responses**
```
Request: https://api.example.com/users/123
  └─ Edge caching (Cloudflare Workers / Fastly)
     └─ Cache-Control: public, max-age=60, stale-while-revalidate=300
     └─ Serve stale while fetching fresh data in background
```

#### Progressive Enhancement Strategy

```javascript
// 1. Detect client capabilities
const supportsModernJS = 'noModule' in HTMLScriptElement.prototype;
const supportsWebP = document.createElement('canvas')
  .toDataURL('image/webp').indexOf('data:image/webp') === 0;

// 2. Differential serving
if (supportsModernJS) {
  // Load ES2020 bundle (50% smaller, no polyfills)
  import('./app.modern.js');
} else {
  // Load ES5 bundle (larger, with polyfills)
  import('./app.legacy.js');
}

// 3. Adaptive loading based on network
if (navigator.connection?.effectiveType === '4g') {
  // Prefetch next routes
  prefetchRoutes(['/products', '/checkout']);
} else {
  // On slow connection, load only on-demand
}
```

#### Feature Flagging for Gradual Rollouts

```javascript
// Launch Darkly / Split.io pattern
const featureFlags = await fetchFeatureFlags(userId);

if (featureFlags.newCheckoutFlow) {
  return <NewCheckoutFlow />;
} else {
  return <OldCheckoutFlow />;
}

// Rollout strategy:
// Day 1: 1% of users
// Day 3: 5% of users (monitor errors)
// Day 7: 25% of users
// Day 14: 100% of users (if metrics good)
```

### SEO Challenges and Solutions

**Problem**: Search crawlers don't execute JavaScript (or execute poorly).

**Solution 1: Dynamic Rendering**
```javascript
// Server detects crawler (via User-Agent)
const isCrawler = /bot|googlebot|bingbot|facebookexternalhit/i.test(
  req.headers['user-agent']
);

if (isCrawler) {
  // Serve pre-rendered HTML (via Puppeteer/Rendertron)
  const html = await prerenderService.render(req.url);
  res.send(html);
} else {
  // Serve CSR app shell
  res.send(appShell);
}
```

**Solution 2: Prerendering at Build Time**
```javascript
// Generate static HTML for public pages at build time
// (react-snap, prerender-spa-plugin)

// build script
const routes = ['/about', '/pricing', '/features'];
routes.forEach(route => {
  const html = renderToString(<App route={route} />);
  fs.writeFileSync(`dist${route}/index.html`, html);
});

// Result: CSR for app, static HTML for marketing pages
```

**Solution 3: Server-Side Rendering for Critical Pages**
```javascript
// Hybrid: SSR for landing pages, CSR for app
if (req.url === '/' || req.url.startsWith('/product/')) {
  // SSR these routes
  const html = ReactDOMServer.renderToString(<App />);
  res.send(html);
} else {
  // CSR for authenticated app routes
  res.sendFile('app.html');
}
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: Gmail (Extreme CSR Optimization)

**Architecture**:
```
Initial Load:
1. HTML shell (2KB)
2. Critical CSS inline (<style>...</style>)
3. main.js (200KB gzipped) ← All Gmail code
4. Aggressive caching (Service Worker)

Navigation:
- All client-side (instant)
- API calls for email content
- Optimistic UI updates
```

**Key Optimizations**:

**1. Code splitting by feature**
```javascript
// Core: Always loaded (compose, inbox list)
import('./core.js');

// Lazy: Load on demand
import(/* webpackChunkName: "calendar" */ './calendar.js');
import(/* webpackChunkName: "meet" */ './meet.js');
```

**2. Virtual scrolling (millions of emails)**
```javascript
// Only render visible emails (50 DOM nodes for 10,000 emails)
function InboxList({ emails }) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleStart = Math.floor(scrollTop / ROW_HEIGHT);
  const visibleEnd = visibleStart + VISIBLE_COUNT;
  const visibleEmails = emails.slice(visibleStart, visibleEnd);
  
  return (
    <div style={{ height: emails.length * ROW_HEIGHT }}>
      <div style={{ transform: `translateY(${visibleStart * ROW_HEIGHT}px)` }}>
        {visibleEmails.map(email => <EmailRow key={email.id} {...email} />)}
      </div>
    </div>
  );
}
```

**3. Optimistic UI**
```javascript
function sendEmail(email) {
  // 1. Immediately update UI (don't wait for server)
  dispatch({ type: 'EMAIL_SENT', payload: email });
  
  // 2. Send to server in background
  api.sendEmail(email)
    .catch(error => {
      // 3. Rollback if fails
      dispatch({ type: 'EMAIL_SEND_FAILED', payload: email });
      showNotification('Failed to send email');
    });
}

// Result: Instant feedback, feels native
```

**Performance Metrics** (Gmail 2024):
- Initial load: 1.2s (4G)
- Time to first email visible: 1.8s
- Compose → send feedback: <50ms
- Navigation between labels: <100ms

### Example 2: Figma (Pure CSR + WebAssembly)

**Why Pure CSR**:
- Needs immediate access to WebGL/Canvas
- Real-time collaboration (WebSockets)
- Complex client-side state (canvas objects, layers)
- No SEO requirements (B2B tool)

**Architecture**:
```
1. App Shell (10KB HTML)
2. WASM Module (5MB) ← Canvas rendering engine
3. JavaScript (2MB) ← UI framework, state management
4. WebSocket connection for collaboration
5. IndexedDB for offline storage
```

**Key Challenges & Solutions**:

**Challenge 1: Large WASM Bundle**
```javascript
// Problem: 5MB WASM blocks initial render

// Solution: Streaming compilation
WebAssembly.compileStreaming(fetch('figma-renderer.wasm'))
  .then(module => {
    // Start rendering UI while WASM loads
    const instance = new WebAssembly.Instance(module);
    initializeRenderer(instance);
  });

// Show skeleton UI immediately while WASM compiles
```

**Challenge 2: Memory Management**
```javascript
// Problem: Complex documents use 500MB+ RAM

// Solution 1: Virtualize canvas (only render visible viewport)
function renderViewport(canvas, viewport) {
  const visibleObjects = quadtree.query(viewport);
  visibleObjects.forEach(obj => canvas.draw(obj));
}

// Solution 2: Offload to Worker
const renderWorker = new Worker('render-worker.js');
renderWorker.postMessage({ type: 'RENDER', objects, viewport });
```

**Challenge 3: Real-Time Collaboration**
```javascript
// CRDT (Conflict-Free Replicated Data Type) for state sync
class FigmaDocument {
  apply(operation) {
    // Operation: { userId, timestamp, type, data }
    this.operations.push(operation);
    this.operations.sort((a, b) => a.timestamp - b.timestamp);
    this.recompute();
  }
  
  // Merge remote changes without conflicts
  merge(remoteOperations) {
    remoteOperations.forEach(op => this.apply(op));
  }
}

// WebSocket sync
ws.on('operation', (op) => {
  document.apply(op);
  renderCanvas();
});
```

**Performance Metrics**:
- Load time: 3-5s (large WASM)
- Responsiveness: 60 FPS canvas rendering
- Collaboration latency: <100ms
- Memory: 200-800MB (document dependent)

### Example 3: AWS Console (Micro-Frontends + CSR)

**Architecture**:
```
Shell App (50KB):
  ├─ Navigation
  ├─ Authentication
  └─ Module Loader

Service Modules (lazy loaded):
  ├─ EC2 Module (200KB)
  ├─ S3 Module (180KB)
  ├─ Lambda Module (150KB)
  ├─ ... (100+ modules)
  └─ Each team owns their module
```

**Module Federation Pattern**:
```javascript
// webpack.config.js (Shell App)
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    ec2: 'ec2@https://d1a2b3c4.cloudfront.net/ec2/remoteEntry.js',
    s3: 's3@https://d1a2b3c4.cloudfront.net/s3/remoteEntry.js',
    lambda: 'lambda@https://d1a2b3c4.cloudfront.net/lambda/remoteEntry.js',
  },
  shared: ['react', 'react-dom', '@aws-ui/components'],
});

// Lazy load on route
const EC2Dashboard = lazy(() => import('ec2/Dashboard'));

// Result: Shell (50KB) + only loaded service modules
```

**Benefits**:
- 100+ teams deploy independently
- Users only download what they use
- Shared components cached across services
- Incremental upgrades (one service at a time)

**Challenges**:
```javascript
// Challenge: Version conflicts
// Shell uses React 18.2
// EC2 module uses React 18.0
// S3 module uses React 17.0

// Solution: Singleton shared dependencies
shared: {
  react: { singleton: true, requiredVersion: '^18.0.0' },
  'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
}

// Enforces single React version at runtime
```

### Example 4: Trello (Progressive Web App + CSR)

**Architecture**:
```
CSR App + Service Worker = Offline-First PWA

1. Initial Load:
   - HTML shell + JS (300KB)
   - Fetch boards from API
   
2. Service Worker:
   - Caches API responses
   - Enables offline mode
   - Background sync when online
   
3. IndexedDB:
   - Stores board state locally
   - Syncs with server when online
```

**Offline Pattern**:
```javascript
// Service Worker
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/api/boards')) {
    event.respondWith(
      // Network-first (prefer fresh data)
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          caches.open('api-v1').then(cache => 
            cache.put(event.request, response.clone())
          );
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
  }
});

// Client-side
function moveCard(cardId, listId) {
  // Optimistic update
  dispatch({ type: 'MOVE_CARD', cardId, listId });
  
  // Sync with server
  api.moveCard(cardId, listId)
    .catch(error => {
      if (navigator.onLine === false) {
        // Queue for background sync
        queueOperation({ type: 'MOVE_CARD', cardId, listId });
      } else {
        // Rollback on error
        dispatch({ type: 'MOVE_CARD_FAILED', cardId });
      }
    });
}

// Background sync when online
navigator.serviceWorker.ready.then(registration => {
  registration.sync.register('sync-operations');
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-operations') {
    event.waitUntil(syncQueuedOperations());
  }
});
```

**Result**:
- Works fully offline
- Optimistic UI (instant feedback)
- Auto-sync when connection restored
- No data loss

### Example 5: Slack Web (Hybrid CSR Approach)

**Architecture**:
```
Marketing Pages: SSR (Next.js)
  └─ Landing, pricing, docs → SEO critical

App Experience: CSR
  └─ Channels, DMs, files → authenticated, interactive

Combined:
  └─ Same domain, different rendering strategies
```

**Routing**:
```javascript
// Next.js hybrid routing
// pages/index.tsx → SSR
export async function getServerSideProps() {
  return { props: { marketing: true } };
}

// app/* → CSR (client-side authenticated app)
if (route.startsWith('/app/')) {
  // Client-side router takes over
  return <SlackApp />;
}
```

**State Management**:
```javascript
// Redux for global app state
const store = {
  workspaces: [...],
  channels: [...],
  messages: { 'channel-1': [...], 'channel-2': [...] },
  users: {...},
  presence: {...},
};

// Normalized state for performance
messages: {
  byId: {
    'msg-1': { id: 'msg-1', text: 'Hello', userId: 'user-1', channelId: 'ch-1' },
    'msg-2': { id: 'msg-2', text: 'Hi', userId: 'user-2', channelId: 'ch-1' },
  },
  byChannel: {
    'ch-1': ['msg-1', 'msg-2'],
  },
}

// Efficient selectors (memoized)
const selectChannelMessages = createSelector(
  [state => state.messages.byId, (_, channelId) => channelId],
  (messagesById, channelId) => {
    const messageIds = state.messages.byChannel[channelId] || [];
    return messageIds.map(id => messagesById[id]);
  }
);
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (Senior/Staff Level)

> **"Client-side rendering is where the browser downloads a minimal HTML shell and JavaScript builds the UI. At [Previous Company], I led our migration from a monolithic CSR app to a micro-frontend architecture serving 5M+ users.**
>
> **The CSR approach gave us:**
> - Instant navigation between routes (100ms vs 2s with page reloads)
> - Rich interactivity (drag-and-drop, real-time updates)
> - Simplified infrastructure (CDN + API servers, no render servers)
> - Independent frontend deployments (10-20 per day)
>
> **The key challenges were:**
> 
> **1. Time-to-Interactive**
> - Initial bundle was 2MB uncompressed, 600KB gzipped
> - Mobile users waited 4-5s before interaction
> - Solution: Route-level code splitting reduced initial bundle to 150KB
> - Lazy-loaded features on-demand, prefetched on hover/idle
> - Result: TTI improved from 4.5s to 1.8s (60% improvement)
>
> **2. SEO Blindness**
> - Product pages weren't indexed (no server-rendered HTML)
> - Social shares showed no preview images
> - Solution: Hybrid approach—SSR for public pages, CSR for authenticated app
> - Dynamic rendering for crawlers (Puppeteer-based prerendering)
>
> **3. Memory Leaks**
> - Long-lived SPA sessions grew to 800MB+ RAM
> - Solution: Implemented LRU caching, fixed listener cleanup, added memory monitoring
> - Result: Steady state 150-200MB memory usage
>
> **When to choose CSR:**
> - Highly interactive apps (dashboards, editors, collaboration tools)
> - Authenticated experiences where SEO doesn't matter
> - When you need offline-first capabilities (with Service Workers)
> - When frontend/backend teams need independence
>
> **When NOT to choose CSR:**
> - Public-facing content sites (blogs, marketing, e-commerce product pages)
> - Mobile-first audiences on slow networks (high TTI)
> - When initial load performance is critical (First Contentful Paint)
>
> **Production checklist:**
> - Bundle size budgets in CI (<200KB gzipped initial)
> - Route-level code splitting
> - Service Worker caching for repeat visits
> - RUM monitoring (TTFB, FCP, LCP, TTI)
> - Prefetch/preload critical chunks
> - Differential serving (modern vs legacy JS)
> - Error boundaries and fallback UI
> - Memory leak monitoring"

### Likely Follow-Up Questions

#### Q1: "How do you optimize Time-to-Interactive in CSR?"

> **"TTI in CSR is dominated by JavaScript parse/execute time and data fetching. Here's my approach:**
>
> **1. Reduce Initial JavaScript**
> ```javascript
> // Before: 600KB bundle
> // After: Split into:
> // - Shell: 80KB (navigation, auth, routing)
> // - Home route: 50KB (lazy loaded)
> // - Dashboard route: 120KB (lazy loaded)
> // - Vendor: 150KB (cached long-term)
> ```
>
> **2. Parallel Data Fetching**
> ```javascript
> // Anti-pattern: Serial fetching
> const user = await fetch('/api/user');
> const prefs = await fetch(`/api/prefs?userId=${user.id}`);
> // Total: 400ms + 300ms = 700ms
>
> // Better: Parallel
> const [user, prefs] = await Promise.all([
>   fetch('/api/user'),
>   fetch('/api/prefs')
> ]);
> // Total: max(400ms, 300ms) = 400ms
> ```
>
> **3. Prefetch Critical Data**
> ```html
> <!-- In HTML shell, start fetch before JS executes -->
> <link rel="prefetch" href="/api/user" as="fetch" crossorigin>
> ```
>
> **4. Move Heavy Work Off Main Thread**
> ```javascript
> // Offload to Web Worker
> const worker = new Worker('heavy-computation.js');
> worker.postMessage(largeDataset);
> // Main thread stays responsive
> ```
>
> **5. Streaming Architecture**
> ```javascript
> // Don't wait for all data, render incrementally
> for await (const chunk of streamResponse('/api/feed')) {
>   appendToFeed(chunk);
> }
> ```
>
> **Measured Impact:**
> - TTI: 4.5s → 1.8s (60% improvement)
> - Long tasks: Reduced from 15 to 3 per page load
> - User engagement: +25% (users waited less)"

#### Q2: "How do you handle SEO with CSR?"

> **"Three main strategies, depending on requirements:**
>
> **Strategy 1: Dynamic Rendering (Low Effort)**
> ```javascript
> // Detect crawler, serve pre-rendered HTML
> const isCrawler = /bot|googlebot|crawler/i.test(userAgent);
> if (isCrawler) {
>   return await puppeteer.render(url); // Pre-render on-demand
> }
> return appShell; // Regular CSR for users
> ```
> **Pros**: Quick fix, works for most crawlers
> **Cons**: Cloaking risk, additional infrastructure
>
> **Strategy 2: Prerendering at Build Time**
> ```bash
> # Generate static HTML for public routes
> npm run build
> → /about/index.html (static)
> → /pricing/index.html (static)
> → /blog/*/index.html (static)
> 
> # App routes still CSR
> ```
> **Pros**: No runtime overhead, perfect SEO
> **Cons**: Build time increases, doesn't scale to millions of pages
>
> **Strategy 3: Hybrid SSR + CSR (Best)**
> ```javascript
> // Public routes: SSR (Next.js, Remix)
> if (isPublicRoute(url)) {
>   return serverRender(url);
> }
> // App routes: CSR
> return appShell;
> ```
> **Pros**: SEO for public pages, CSR for app experience
> **Cons**: More complex infrastructure
>
> **At [Company], we used Strategy 3:**
> - Marketing pages: SSR (Next.js)
> - Product pages: SSR with client-side hydration
> - Dashboard: Pure CSR (SEO irrelevant)
> - Result: 300% increase in organic traffic"

#### Q3: "CSR vs SSR vs SSG—when to use each?"

> **"I think of it in three dimensions: SEO, interactivity, and data freshness.**
>
> | Rendering | SEO | Interactivity | Data Freshness | Use Case |
> |-----------|-----|---------------|----------------|----------|
> | **CSR** | ❌ Poor | ✅ Excellent | ✅ Real-time | Dashboards, admin panels, collaboration tools |
> | **SSR** | ✅ Excellent | ✅ Good (after hydration) | ✅ Per-request | E-commerce, news, user profiles |
> | **SSG** | ✅ Excellent | ⚠️ Good (after hydration) | ❌ Build-time only | Docs, marketing, blogs |
> | **ISR** | ✅ Excellent | ✅ Good | ⚠️ Periodic | Product catalogs, content sites |
>
> **Decision Tree:**
> ```
> Is SEO critical?
>   ├─ No → CSR
>   └─ Yes → Does content change frequently?
>       ├─ No (static) → SSG
>       └─ Yes → Is real-time required?
>           ├─ Yes → SSR
>           └─ No → ISR (hybrid)
> ```
>
> **Real Example:**
> At Netflix:
> - Landing page: SSR (SEO critical, personalized)
> - Browse catalog: SSR (SEO for shows)
> - Video player: CSR (rich interactivity, no SEO needed)
> - Help center: SSG (static docs)
>
> **Hybrid is the answer for most large apps.**"

#### Q4: "How do you measure and monitor CSR performance in production?"

> **"I use a layered monitoring approach:**
>
> **Layer 1: Synthetic Monitoring (Lighthouse CI)**
> ```yaml
> # .github/workflows/lighthouse.yml
> - name: Lighthouse CI
>   run: |
>     lhci autorun --collect.url=https://staging.example.com
>     # Fail if TTI > 3.5s or bundle > 250KB
> ```
>
> **Layer 2: Real User Monitoring (RUM)**
> ```javascript
> // Capture Core Web Vitals
> import { onLCP, onFID, onCLS, onTTFB } from 'web-vitals';
>
> onLCP(metric => sendToAnalytics('LCP', metric.value));
> onFID(metric => sendToAnalytics('FID', metric.value));
> onCLS(metric => sendToAnalytics('CLS', metric.value));
> onTTFB(metric => sendToAnalytics('TTFB', metric.value));
>
> // Custom metrics
> const navStart = performance.timing.navigationStart;
> const ttI = performance.timing.loadEventEnd - navStart;
> sendToAnalytics('TTI', ttI);
> ```
>
> **Layer 3: Bundle Size Monitoring**
> ```javascript
> // webpack-bundle-analyzer in CI
> if (bundleSize > BUDGET) {
>   throw new Error(`Bundle size ${bundleSize} exceeds ${BUDGET}`);
> }
>
> // Track over time (send to Datadog)
> const sizes = {
>   main: 150000,
>   vendor: 280000,
>   total: 430000,
> };
> datadog.gauge('bundle.size', sizes.total, { env: 'production' });
> ```
>
> **Layer 4: Long Task Monitoring**
> ```javascript
> const observer = new PerformanceObserver(list => {
>   for (const entry of list.getEntries()) {
>     if (entry.duration > 50) {
>       sendToSentry('LongTask', {
>         duration: entry.duration,
>         name: entry.name,
>       });
>     }
>   }
> });
> observer.observe({ entryTypes: ['longtask'] });
> ```
>
> **Layer 5: Error Rate Monitoring**
> ```javascript
> // Sentry for crash reporting
> Sentry.init({
>   dsn: '...',
>   beforeSend(event, hint) {
>     // Tag CSR-specific errors
>     if (hint.originalException?.message.includes('chunk')) {
>       event.tags = { ...event.tags, type: 'chunk-load-failure' };
>     }
>     return event;
>   },
> });
> ```
>
> **Dashboards I Monitor:**
> - P50/P95 TTI by device type (mobile/desktop)
> - Bundle size trends (alert if >10% increase)
> - Error rate (alert if >0.5%)
> - Chunk load failures (CDN issues)
> - Memory usage over time (detect leaks)
>
> **Alerts:**
> - TTI P95 > 5s for 3 consecutive minutes
> - Error rate > 1% for 5 minutes
> - Chunk load failure > 5% for 10 minutes"

#### Q5: "How do you handle code splitting and lazy loading in CSR?"

> **"Code splitting is critical for CSR performance. Here's my strategy:**
>
> **Level 1: Route-Based Splitting**
> ```javascript
> // React Router lazy loading
> const Home = lazy(() => import('./routes/Home'));
> const Dashboard = lazy(() => import('./routes/Dashboard'));
> const Settings = lazy(() => import('./routes/Settings'));
>
> function App() {
>   return (
>     <Suspense fallback={<Loading />}>
>       <Routes>
>         <Route path="/" element={<Home />} />
>         <Route path="/dashboard" element={<Dashboard />} />
>         <Route path="/settings" element={<Settings />} />
>       </Routes>
>     </Suspense>
>   );
> }
>
> // Result: Only load current route's code
> ```
>
> **Level 2: Component-Based Splitting**
> ```javascript
> // Heavy modal loaded on-demand
> const HeavyChart = lazy(() => import('./HeavyChart'));
>
> function Dashboard() {
>   const [showChart, setShowChart] = useState(false);
>   
>   return (
>     <div>
>       <button onClick={() => setShowChart(true)}>Show Chart</button>
>       {showChart && (
>         <Suspense fallback={<Spinner />}>
>           <HeavyChart />
>         </Suspense>
>       )}
>     </div>
>   );
> }
> ```
>
> **Level 3: Vendor Splitting**
> ```javascript
> // webpack.config.js
> optimization: {
>   splitChunks: {
>     cacheGroups: {
>       vendor: {
>         test: /[\\/]node_modules[\\/]/,
>         name: 'vendors',
>         chunks: 'all',
>       },
>       // Separate heavy libs
>       charts: {
>         test: /[\\/]node_modules[\\/](recharts|chart\.js)/,
>         name: 'charts',
>         chunks: 'async',
>       },
>     },
>   },
> }
> ```
>
> **Level 4: Prefetching Strategy**
> ```javascript
> // Prefetch on hover (user intent)
> function NavLink({ to, children }) {
>   const prefetch = () => {
>     // Webpack magic comment
>     import(/* webpackPrefetch: true */ `./routes${to}`);
>   };
>   
>   return (
>     <Link to={to} onMouseEnter={prefetch}>
>       {children}
>     </Link>
>   );
> }
>
> // Or prefetch on idle
> requestIdleCallback(() => {
>   import('./routes/Settings');
> });
> ```
>
> **Level 5: Dynamic Imports Based on Conditions**
> ```javascript
> // Only load admin module for admins
> if (user.role === 'admin') {
>   const AdminPanel = await import('./AdminPanel');
>   return <AdminPanel />;
> }
>
> // Load different chart library based on data size
> const ChartLib = data.length > 10000
>   ? await import('./HeavyChart') // Better for large datasets
>   : await import('./LightChart'); // Faster for small datasets
> ```
>
> **Monitoring Split Effectiveness:**
> ```javascript
> // Track chunk load times
> performance.getEntriesByType('resource')
>   .filter(r => r.name.includes('.chunk.js'))
>   .forEach(chunk => {
>     console.log(chunk.name, chunk.duration);
>     sendToAnalytics('chunk.load', chunk.duration, {
>       chunk: chunk.name,
>     });
>   });
> ```
>
> **Production Results:**
> - Initial bundle: 600KB → 120KB (80% reduction)
> - Time to Interactive: 4.2s → 1.7s
> - Route navigation: <200ms (chunks cached after first visit)
> - Cache hit rate: 95% on repeat visits"

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Production-Grade CSR App Setup

**Project Structure**:
```
src/
├── index.html          # App shell
├── index.tsx           # Entry point
├── App.tsx             # Root component
├── routes/             # Lazy-loaded routes
│   ├── Home.tsx
│   ├── Dashboard.tsx
│   └── Settings.tsx
├── shared/             # Shared components
│   ├── Navbar.tsx
│   └── Loading.tsx
├── lib/                # Utilities
│   ├── api.ts
│   └── analytics.ts
└── workers/            # Web Workers
    └── heavy-compute.ts
```

**index.html** (Optimized App Shell):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>App</title>
  
  <!-- Preconnect to API domain -->
  <link rel="preconnect" href="https://api.example.com" crossorigin>
  
  <!-- Prefetch critical API calls -->
  <link rel="prefetch" href="https://api.example.com/user" as="fetch" crossorigin>
  
  <!-- Critical CSS inline (reduces render-blocking) -->
  <style>
    body { margin: 0; font-family: system-ui; }
    #root { min-height: 100vh; }
    .loading { display: flex; justify-content: center; align-items: center; height: 100vh; }
  </style>
  
  <!-- Preload critical JS chunks -->
  <link rel="preload" href="/static/js/runtime.js" as="script">
  <link rel="preload" href="/static/js/vendors.js" as="script">
</head>
<body>
  <div id="root">
    <!-- Inline loading spinner (visible immediately) -->
    <div class="loading">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="none" stroke="#3b82f6" 
                stroke-width="4" stroke-dasharray="90 150" 
                stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate"
                            from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite"/>
        </circle>
      </svg>
    </div>
  </div>
  
  <!-- Scripts load with defer (non-blocking) -->
  <script src="/static/js/runtime.js" defer></script>
  <script src="/static/js/vendors.js" defer></script>
  <script src="/static/js/main.js" defer></script>
</body>
</html>
```

**index.tsx** (Entry Point with Performance Monitoring):
```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initPerformanceMonitoring } from './lib/performance';
import { initErrorTracking } from './lib/error-tracking';

// Initialize monitoring before app renders
initPerformanceMonitoring();
initErrorTracking();

// Register Service Worker for offline support
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      registration => console.log('SW registered:', registration.scope),
      error => console.error('SW registration failed:', error)
    );
  });
}

// Render app
const root = createRoot(document.getElementById('root')!);
root.render(<App />);

// Report performance metrics when app is ready
window.addEventListener('load', () => {
  // Wait for all resources to load
  setTimeout(() => {
    const perfData = performance.timing;
    const tti = perfData.loadEventEnd - perfData.navigationStart;
    
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: 'TTI',
        value: tti,
        event_category: 'Performance',
      });
    }
  }, 0);
});
```

**App.tsx** (Route-Based Code Splitting):
```typescript
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ErrorBoundary } from './shared/ErrorBoundary';
import { Loading } from './shared/Loading';

// Lazy load route components
const Home = lazy(() => import(/* webpackChunkName: "home" */ './routes/Home'));
const Dashboard = lazy(() => import(/* webpackChunkName: "dashboard" */ './routes/Dashboard'));
const Settings = lazy(() => import(/* webpackChunkName: "settings" */ './routes/Settings'));

// Prefetch chunks on hover (user intent)
function PrefetchLink({ to, children }: { to: string; children: React.ReactNode }) {
  const prefetch = () => {
    // Trigger prefetch of route chunk
    if (to === '/dashboard') {
      import('./routes/Dashboard');
    } else if (to === '/settings') {
      import('./routes/Settings');
    }
  };
  
  return (
    <Link to={to} onMouseEnter={prefetch} onTouchStart={prefetch}>
      {children}
    </Link>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <nav>
          <PrefetchLink to="/">Home</PrefetchLink>
          <PrefetchLink to="/dashboard">Dashboard</PrefetchLink>
          <PrefetchLink to="/settings">Settings</PrefetchLink>
        </nav>
        
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
```

### Example 2: API Client with Caching & Retry Logic

```typescript
// lib/api.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class APIClient {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private baseURL = 'https://api.example.com';
  
  async get<T>(
    endpoint: string,
    options: {
      cacheTime?: number; // ms to cache response
      retries?: number;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { cacheTime = 5 * 60 * 1000, retries = 3, timeout = 10000 } = options;
    const cacheKey = `GET:${endpoint}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`[API] Cache hit: ${endpoint}`);
      return cached.data;
    }
    
    // Deduplicate concurrent requests
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`[API] Deduplicating: ${endpoint}`);
      return this.pendingRequests.get(cacheKey)!;
    }
    
    // Make request with retry logic
    const requestPromise = this.fetchWithRetry<T>(endpoint, retries, timeout);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const data = await requestPromise;
      
      // Cache successful response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + cacheTime,
      });
      
      return data;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  private async fetchWithRetry<T>(
    endpoint: string,
    retries: number,
    timeout: number
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            // Add auth token if present
            ...(this.getAuthToken() && {
              'Authorization': `Bearer ${this.getAuthToken()}`,
            }),
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[API] Attempt ${i + 1} failed:`, endpoint, error);
        
        // Exponential backoff
        if (i < retries) {
          const delay = Math.min(1000 * 2 ** i, 10000);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError || new Error('Request failed');
  }
  
  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }
  
  // Clear cache (e.g., on logout)
  clearCache() {
    this.cache.clear();
  }
}

export const api = new APIClient();
```

### Example 3: Performance Monitoring Utility

```typescript
// lib/performance.ts
import { onLCP, onFID, onCLS, onTTFB, Metric } from 'web-vitals';

interface PerformanceMetrics {
  ttfb: number;
  fcp: number;
  lcp: number;
  fid: number;
  cls: number;
  tti: number;
}

export function initPerformanceMonitoring() {
  // Track Core Web Vitals
  onLCP(sendMetric);
  onFID(sendMetric);
  onCLS(sendMetric);
  onTTFB(sendMetric);
  
  // Track custom metrics
  trackTTI();
  trackLongTasks();
  trackResourceTiming();
}

function sendMetric(metric: Metric) {
  console.log(`[Perf] ${metric.name}:`, metric.value);
  
  // Send to analytics
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
  
  // Send to custom backend
  sendToAnalytics({
    metric: metric.name,
    value: metric.value,
    id: metric.id,
    timestamp: Date.now(),
  });
}

function trackTTI() {
  window.addEventListener('load', () => {
    const perfData = performance.timing;
    const tti = perfData.loadEventEnd - perfData.navigationStart;
    
    sendToAnalytics({
      metric: 'TTI',
      value: tti,
      timestamp: Date.now(),
    });
  });
}

function trackLongTasks() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        // Report tasks longer than 50ms (blocking)
        if (entry.duration > 50) {
          sendToAnalytics({
            metric: 'LongTask',
            value: entry.duration,
            name: entry.name,
            timestamp: entry.startTime,
          });
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // longtask not supported
    }
  }
}

function trackResourceTiming() {
  window.addEventListener('load', () => {
    const resources = performance.getEntriesByType('resource');
    
    // Track JS bundle sizes
    const jsResources = resources.filter(r => 
      r.name.endsWith('.js') && r.name.includes('/static/')
    );
    
    jsResources.forEach(resource => {
      sendToAnalytics({
        metric: 'ResourceLoad',
        name: resource.name.split('/').pop(),
        duration: resource.duration,
        size: resource.transferSize,
        timestamp: Date.now(),
      });
    });
  });
}

function sendToAnalytics(data: Record<string, any>) {
  // Batch and send to backend
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', JSON.stringify(data));
  } else {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {
      // Fail silently
    });
  }
}

// Export metrics for debugging
export function getPerformanceMetrics(): PerformanceMetrics | null {
  if (!performance.timing) return null;
  
  const timing = performance.timing;
  const navStart = timing.navigationStart;
  
  return {
    ttfb: timing.responseStart - navStart,
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
    lcp: 0, // Populated by onLCP
    fid: 0, // Populated by onFID
    cls: 0, // Populated by onCLS
    tti: timing.loadEventEnd - navStart,
  };
}
```

### Example 4: Service Worker for Offline Support

```javascript
// public/sw.js
const CACHE_NAME = 'app-v1';
const STATIC_CACHE = 'static-v1';
const API_CACHE = 'api-v1';

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/runtime.js',
  '/static/js/vendors.js',
  '/static/js/main.js',
  '/static/css/main.css',
  '/offline.html', // Fallback page
];

// Install: Cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== STATIC_CACHE && name !== API_CACHE)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Different strategies for different resources
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Strategy 1: Cache-first for static assets
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) return response;
          
          return fetch(event.request).then(response => {
            // Cache fetched static assets
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then(cache => {
                cache.put(event.request, clone);
              });
            }
            return response;
          });
        })
    );
    return;
  }
  
  // Strategy 2: Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful API responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Strategy 3: Network-first for HTML (always fresh)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Show offline page if network fails
          return caches.match('/offline.html');
        })
    );
    return;
  }
  
  // Default: Network-first
  event.respondWith(fetch(event.request));
});
```

### Example 5: Memory-Efficient Virtual List

```typescript
// shared/VirtualList.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number; // Number of items to render outside viewport
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate visible range
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  // Add overscan
  const renderStart = Math.max(0, visibleStart - overscan);
  const renderEnd = Math.min(items.length, visibleEnd + overscan);
  
  // Only render visible items
  const visibleItems = items.slice(renderStart, renderEnd);
  
  // Handle scroll (throttled)
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
  
  return (
    <div
      ref={containerRef}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {/* Spacer for total height */}
      <div style={{ height: items.length * itemHeight }}>
        {/* Visible items */}
        <div
          style={{
            transform: `translateY(${renderStart * itemHeight}px)`,
            willChange: 'transform',
          }}
        >
          {visibleItems.map((item, index) => (
            <div key={renderStart + index} style={{ height: itemHeight }}>
              {renderItem(item, renderStart + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Usage
function LargeList() {
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    title: `Item ${i}`,
  }));
  
  return (
    <VirtualList
      items={items}
      itemHeight={50}
      containerHeight={600}
      renderItem={(item) => (
        <div style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
          {item.title}
        </div>
      )}
    />
  );
}

// Result: Renders only ~20 DOM nodes for 10,000 items
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience**:
- **Rich Interactivity**: Enables desktop-class experiences (drag-and-drop, real-time collaboration)
- **Fast Navigation**: Instant route changes without page reloads (100ms vs 2s)
- **Offline Support**: Works without internet (Service Workers + cache)
- **Smooth Transitions**: Animations and state preservation between views

**Performance** (When Optimized):
- **Cached Assets**: Repeat visits load instantly (from cache)
- **Efficient Updates**: Only re-render changed components
- **Reduced Server Load**: No server-side rendering overhead
- **CDN Delivery**: Static assets served from edge locations

**Business Impact**:
- **Development Velocity**: Frontend teams deploy independently (10-20× per day)
- **Lower Infrastructure Costs**: Simple CDN + API servers (no render fleet)
- **Scalability**: Horizontally scale with CDN (handle millions of users)
- **Team Autonomy**: Clear separation between frontend/backend

**Developer Experience**:
- **Modern Tooling**: Hot Module Replacement, React DevTools, time-travel debugging
- **Component Reusability**: Share components across web, mobile, desktop
- **Predictable State**: Client-side state management (Redux, Zustand)

### How It Works (Technical Summary)

**Boot Sequence**:
```
1. Browser requests URL
   └─ Server returns minimal HTML shell + <script> tags

2. Browser downloads JavaScript bundles
   └─ main.js (app code) + vendor.js (libraries) + chunks (lazy loaded)

3. JavaScript executes on client
   └─ Framework bootstraps (React.render, Vue.mount)
   └─ Constructs virtual DOM
   └─ Renders to real DOM

4. Data fetching
   └─ API calls to backend
   └─ Updates UI with data

5. Client-side router
   └─ Intercepts navigation (history.pushState)
   └─ Renders new route without page reload
```

**Key Characteristics**:
- **Thin Server**: Only serves static files and APIs
- **Fat Client**: All rendering logic runs in browser
- **SPA Pattern**: Single HTML page, dynamic content swapping
- **API-Driven**: Backend exposes REST/GraphQL endpoints

**Performance Optimization Pillars**:

**1. Bundle Optimization**
- Code splitting (route/component level)
- Tree shaking (remove unused code)
- Compression (Gzip/Brotli)
- Differential serving (modern vs legacy JS)

**2. Caching Strategy**
- Long-term caching for immutable assets
- Service Worker for offline support
- HTTP caching headers
- Client-side data caching (React Query)

**3. Loading Optimization**
- Prefetch/preload critical chunks
- Lazy load non-critical code
- Parallel data fetching
- Progressive rendering

**4. Runtime Optimization**
- Virtual scrolling for large lists
- Memoization (useMemo, React.memo)
- Web Workers for heavy computation
- RequestIdleCallback for non-urgent work

**When to Choose CSR**:
- ✅ Interactive dashboards, admin panels, tools
- ✅ Authenticated apps where SEO doesn't matter
- ✅ Real-time collaboration apps
- ✅ When you need offline-first capabilities
- ✅ When frontend/backend teams need independence

**When NOT to Choose CSR**:
- ❌ Public-facing content sites (blogs, news, marketing)
- ❌ E-commerce product pages (SEO critical)
- ❌ Mobile-first on slow networks
- ❌ When initial load performance is critical
- ❌ When JavaScript is disabled/blocked

**The Bottom Line**:
CSR is **perfect for interactive web applications** where user engagement and rich UX are priorities. It requires careful optimization (code splitting, caching, monitoring) to achieve good performance, but when done right, it scales to millions of users while delivering native-like experiences. For public-facing, SEO-critical content, **hybrid approaches (SSR for public pages + CSR for app) are ideal**.

────────────────────────────────────
**End of Document**
────────────────────────────────────