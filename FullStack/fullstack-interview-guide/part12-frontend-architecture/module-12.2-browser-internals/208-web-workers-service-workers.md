# Web Workers and Service Workers
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Web Worker**: runs JavaScript on a BACKGROUND THREAD, completely separate from the main thread; has its own event loop; NO access to the DOM; communicates with main thread via `postMessage` (structured clone); use for: CPU-intensive computation (CSV parsing, image processing, large data sort/filter) that would otherwise freeze the UI for hundreds of milliseconds; `Comlink` library wraps `postMessage` in a Promise-based proxy so workers feel like regular async functions
- **Service Worker**: a NETWORK PROXY that runs in a background thread; intercepts ALL fetch requests from the page; can serve responses from cache (offline), add custom request/response logic, handle push notifications, background sync; lifecycle: `install` → `activate` → `fetch intercept`; registered via `navigator.serviceWorker.register('./sw.js')`; the foundation of Progressive Web Apps (PWA)
- **Key difference**: Web Worker = compute offloading (moves CPU work off main thread); Service Worker = network layer (intercepts HTTP requests for offline/caching)
- **Shared Worker**: like a Web Worker but multiple tabs/windows of the same origin share one instance — useful for cross-tab state synchronisation without a server
- **Service Worker scope**: SW controls requests from pages within its registration path (`/` SW controls all pages; `/checkout/sw.js` only controls `/checkout/…`); cannot control pages from a different origin
- **SW update flow**: browser checks for SW update on each page load; new SW installs and waits until all tabs controlled by the old SW are closed; call `skipWaiting()` to force immediate activation; call `clients.claim()` to take control of open tabs without requiring a reload

---

## 1. One-Line Definition
Web Workers move heavy JavaScript computation off the main thread to a background thread for UI responsiveness; Service Workers act as a scriptable network proxy between the browser and the server for offline capability, caching, and push notifications — together they enable true application-level performance and reliability that was previously only achievable in native apps.

---

## 2. The Problem It Solves

### Web Worker Problem
A supply chain table has 50,000 rows. The user clicks "Filter by 10 criteria." The filter function runs for 800ms. During that 800ms, the browser's main thread is completely occupied. The scroll bar freezes. Click events aren't processed. Animations stop. The user thinks the app has crashed.

Web Workers solve this by moving the 800ms compute off the main thread entirely. The filter runs on a worker thread. The main thread stays responsive. When the filter completes, the result is sent back via `postMessage`, and React re-renders with the filtered data. The user experiences zero UI freeze — just a brief "Loading..." state while the worker processes.

### Service Worker Problem
A field engineer at a manufacturing plant uses a SAP Fiori app to record equipment inspections. The factory floor has intermittent WiFi. Without a service worker: offline = blank screen, lost form data, lost context. With a service worker: offline = the app works from cache, form submissions queue, data syncs when connectivity returns. The app behaves like a native app under any network condition.

---

## 3. How It Works Internally

### Web Worker Architecture

```
Without Web Worker (main thread only):
┌─────────────────────────────────────────────────────────────┐
│                      MAIN THREAD                             │
│                                                              │
│  User scrolls    → [SCROLL HANDLER]                         │
│  React renders   → [REACT RECONCILER]                       │
│  Filter runs     → [████████████████████ 800ms ██████████]  │
│                    ↑ EVERYTHING ELSE WAITS during this 800ms │
│  UI animations   → [FROZEN]                                  │
│  Click events    → [QUEUED, not processed]                   │
└─────────────────────────────────────────────────────────────┘

With Web Worker:
┌─────────────────────────────────────────────────────────────┐
│                      MAIN THREAD                             │
│                                                              │
│  User scrolls    → [SCROLL HANDLER]  ← responsive!          │
│  React renders   → [REACT RECONCILER] ← responsive!         │
│  Sends message   → postMessage({data, filters})             │
│  Receives result ← postMessage({filteredData})              │
│  React updates   → [small render with result]               │
└──────────────────────↑──────────────────────────────────────┘
                       │ postMessage channel (structured clone)
┌──────────────────────▼──────────────────────────────────────┐
│                      WEB WORKER THREAD                       │
│                                                              │
│  [████████████████████ 800ms filter computation ████████]   │
│  ← has its own event loop, call stack, and heap             │
│  ← NO window, NO document, NO DOM access                   │
│  ← can use: fetch, indexedDB, crypto, ArrayBuffer, etc.    │
└─────────────────────────────────────────────────────────────┘

Data transfer via structured clone:
  postMessage sends a DEEP COPY of the data to the worker
  ⚠️ Expensive for large data (100MB dataset → 100MB copy)
  ✅ Transferable objects: ArrayBuffer can be TRANSFERRED (zero-copy)
     postMessage(arrayBuffer, [arrayBuffer])
     → arrayBuffer is moved to worker, original is no longer accessible
     → O(1) transfer regardless of size — crucial for large binary data
```

### Service Worker Architecture

```
Normal page fetch (no SW):
  Browser → Network → Server → Response → Browser

With Service Worker:
  Browser → SW intercept → cache? → serve from cache (offline-capable)
                        → no cache → Network → Server → cache response → Return to browser

Service Worker Lifecycle:
  1. REGISTER:   navigator.serviceWorker.register('/sw.js')
                 Browser downloads sw.js, checks if it's different from current SW
                 
  2. INSTALL:    SW runs install event
                 Developer pre-caches critical assets here
                 (HTML shell, CSS, fonts, JS bundles — "app shell" pattern)
                 
  3. WAIT:       New SW waits until ALL open tabs using the OLD SW are closed
                 (or skipWaiting() is called to force immediate activation)
                 
  4. ACTIVATE:   SW is now in control of all pages it covers
                 Clean up old caches here (delete previous version's cache)
                 
  5. FETCH:      All fetch() calls from controlled pages pass through SW
                 SW decides: cache-first? network-first? stale-while-revalidate?

Communication:
  Page → SW:  postMessage, or just navigating (SW intercepts the fetch)
  SW → Page:  postMessage, or responding to fetch with synthetic Response

Storage available in SW:
  - Cache API (versioned, response caching)  ← main caching tool
  - IndexedDB (structured data)              ← for offline form data queue
  - NOT localStorage (sync, not available in workers)
```

### Caching Strategies

```
1. Cache First (offline-first):
   request → SW checks cache → HIT: return cache (even if stale)
                              → MISS: fetch network, cache response, return

   Best for: static assets (CSS, fonts, images) that change rarely
   Risk: stale content served indefinitely without version update

2. Network First (freshness-first):
   request → SW tries network → SUCCESS: cache response, return
                               → FAIL (offline): serve from cache

   Best for: HTML pages, API responses where freshness matters
   Risk: slow on poor networks (waits for network timeout before falling back)

3. Stale-While-Revalidate:
   request → SW returns cache immediately (fast) + fetches network in background
   next request → returns fresh cache (from background update)

   Best for: data that updates frequently but where slight staleness is acceptable
   Perfect for: news feeds, product data, dashboard metrics
   
4. Cache Only:        serve from cache, never go to network
   Network Only:      always fetch, SW is a passthrough (for tracking pixels, analytics)
```

---

## 4. The Code

### Wrong Way — Main Thread Blocking and No Offline Strategy

```typescript
// ❌ WRONG — Hundreds of milliseconds of main thread work
// React component triggered by button click
function ProductCatalogFilter() {
  const [filtered, setFiltered] = useState(allProducts);

  const handleFilterChange = (criteria: FilterCriteria) => {
    // ❌ 50,000 products filtered synchronously on the main thread
    // This block ties up the browser for 600-1200ms depending on device
    const result = allProducts.filter(p => {
      return p.price >= criteria.minPrice &&
             p.price <= criteria.maxPrice &&
             criteria.categories.includes(p.category) &&
             p.rating >= criteria.minRating;
      // ... 10 more filter conditions
    });
    
    // By the time this setFiltered runs, the UI has been frozen for 1 second
    // The user's typed filter character wasn't rendered until after the freeze
    setFiltered(result);
  };
  
  return <DataGrid data={filtered} onFilterChange={handleFilterChange} />;
}

// ❌ WRONG — No service worker, no offline capability
// React app entry point
ReactDOM.render(<App />, document.getElementById('root'));
// If network is lost: blank screen on reload, all context lost
// If CDN is slow: spinner indefinitely
// Progressive Web App: NOT achievable
```

> **Why this fails:** the synchronous filter on the main thread blocks all rendering and interaction for the full duration of the computation. On a low-end Android device (8x slower than a MacBook), 600ms becomes 4,800ms — the "frozen" experience is catastrophic.

### Right Way — Web Worker for Compute, Service Worker for Network

```typescript
// =====================================================
// WEB WORKER — moves CPU work to a background thread
// =====================================================

// filter.worker.ts (compiled to filter.worker.js by bundler)
// @ts-ignore (worker global scope)
self.onmessage = (event: MessageEvent) => {
  const { products, criteria } = event.data;
  
  // Heavy computation runs here — main thread is COMPLETELY FREE
  const filtered = products.filter((p: Product) => {
    return p.price >= criteria.minPrice &&
           p.price <= criteria.maxPrice &&
           criteria.categories.includes(p.category) &&
           p.rating >= criteria.minRating;
  });
  
  // Send result back to main thread
  // structured clone deep-copies the filtered array
  self.postMessage({ filtered });
};

// filterWorker.ts — main thread interface to the worker
// Using Comlink for ergonomic Promise-based API (wraps postMessage)
import * as Comlink from 'comlink';

// TypeScript type for what the worker exports
type FilterWorker = {
  filterProducts: (products: Product[], criteria: FilterCriteria) => Promise<Product[]>;
};

// Create worker instance (one per page — workers are expensive to create)
let workerInstance: Comlink.Remote<FilterWorker> | null = null;

function getFilterWorker(): Comlink.Remote<FilterWorker> {
  if (!workerInstance) {
    // Vite/webpack: ?worker suffix creates a Worker automatically
    const worker = new Worker(new URL('./filter.worker.ts', import.meta.url), {
      type: 'module',  // ES module worker
    });
    workerInstance = Comlink.wrap<FilterWorker>(worker);
  }
  return workerInstance;
}

// ✅ RIGHT — React component using Web Worker for filtering
function ProductCatalogFilter() {
  const [filtered, setFiltered] = useState(allProducts);
  const [isFiltering, setIsFiltering] = useState(false);

  const handleFilterChange = useCallback(async (criteria: FilterCriteria) => {
    setIsFiltering(true);
    
    // Main thread stays responsive during this await
    // The actual filter runs in the worker thread
    const worker = getFilterWorker();
    const result = await worker.filterProducts(allProducts, criteria);
    
    setFiltered(result);
    setIsFiltering(false);
  }, [allProducts]);
  
  return (
    <>
      {isFiltering && <LoadingOverlay message="Filtering 50,000+ products..." />}
      <DataGrid data={filtered} onFilterChange={handleFilterChange} />
    </>
  );
}

// =====================================================
// SERVICE WORKER — offline-first for SAP Fiori PWA
// =====================================================

// sw.ts — Service Worker implementation
// Workbox (Google's SW library) is the standard; shown without for clarity

const CACHE_VERSION = 'v3'; // Increment on each deploy
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const DATA_CACHE = `api-data-${CACHE_VERSION}`;

// ✅ INSTALL: cache the app shell (HTML, CSS, JS, fonts)
// These are the minimum files needed to render the app offline
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then(cache => 
      cache.addAll([
        '/',                           // HTML shell
        '/static/css/main.css',
        '/static/js/app.js',
        '/fonts/inter.woff2',
        '/icons/manifest-192.png',
        '/offline.html',               // Fallback page when network unavailable
        // ⚠️ Only cache what you KNOW you need — every byte counts on mobile
      ])
    )
  );
  // Skip waiting: new SW takes control immediately without waiting for old tabs to close
  // ⚠️ Only safe if old-SW pages are backwards-compatible with new SW cache
  (self as any).skipWaiting();
});

// ✅ ACTIVATE: clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== APP_SHELL_CACHE && name !== DATA_CACHE)
          .map(name => caches.delete(name)) // delete previous version caches
      )
    ).then(() => 
      (self as any).clients.claim() // Take control of all open tabs immediately
    )
  );
});

// ✅ FETCH: network proxy — intercept all requests
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  
  // Strategy 1: API calls — network-first with cache fallback
  // Fresh data when online; last known data when offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful API responses for offline fallback
          const responseClone = response.clone();
          caches.open(DATA_CACHE).then(cache => 
            cache.put(event.request, responseClone)
          );
          return response;
        })
        .catch(() => 
          caches.match(event.request) // Offline: serve last cached API response
            .then(cached => cached || new Response('{"error":"offline"}', {
              headers: { 'Content-Type': 'application/json' }
            }))
        )
    );
    return;
  }
  
  // Strategy 2: App shell assets — cache-first
  // Static JS/CSS/fonts: serve from cache, no network request
  if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/fonts/')) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          const responseClone = response.clone();
          caches.open(APP_SHELL_CACHE).then(cache =>
            cache.put(event.request, responseClone)
          );
          return response;
        })
      )
    );
    return;
  }
  
  // Strategy 3: HTML pages — network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/') // Return cached HTML shell
          .then(cached => cached || caches.match('/offline.html'))
      )
    );
    return;
  }
});

// ✅ BACKGROUND SYNC — queue form submissions when offline, replay when online
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'offline-inspection-sync') {
    event.waitUntil(syncOfflineInspections());
  }
});

// Replay queued form submissions from IndexedDB
async function syncOfflineInspections() {
  const db = await openIndexedDB();
  const pendingInspections = await db.getAll('pending-inspections');
  
  await Promise.all(
    pendingInspections.map(async (inspection) => {
      try {
        await fetch('/api/inspections', {
          method: 'POST',
          body: JSON.stringify(inspection),
          headers: { 'Content-Type': 'application/json' }
        });
        await db.delete('pending-inspections', inspection.id);
      } catch {
        // Leave in queue — sync will retry next time
      }
    })
  );
}

// sw-registration.ts — register the service worker from the app
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return; // Safari < 11.1, older browsers
  
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/',  // Controls all pages under '/'
    }).then(registration => {
      console.log('SW registered. Scope:', registration.scope);
      
      // Check for updates every hour (SW auto-checks on page load anyway)
      setInterval(() => registration.update(), 60 * 60 * 1000);
    }).catch(error => {
      console.error('SW registration failed:', error);
      // App still works without SW — degrade gracefully
    });
  });
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between a Web Worker and a Service Worker? When would you use each?"

**Hruday's answer:**
> They solve completely different problems, despite both being "background workers."
>
> A **Web Worker** is for CPU-intensive computation. It runs on a background thread and has NO access to the DOM. You communicate with it via `postMessage`. Use it when something would freeze the UI: parsing a 10MB CSV file, sorting/filtering 50,000 rows, running image processing algorithms, doing cryptographic operations. The key mental model: Web Worker = "move heavy work off the main thread so the UI stays responsive."
>
> A **Service Worker** is a network proxy. It intercepts fetch requests and can serve them from cache, modify them, queue them for later, or forward them to the network. It enables offline capability — the service worker serves the app shell from cache when the network is unavailable. It also handles push notifications (wakes up even when the page is closed) and background sync (queues mutations offline, replays when online). Key mental model: Service Worker = "sit between the browser and the network, intercept everything."
>
> Real example: at SAP, we used a Service Worker for the SAP Fiori PWA to enable offline inspection forms for factory workers. We considered Web Workers for the large product catalog filtering (50K+ items), though ultimately we solved it with virtual scrolling first.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why can't a Service Worker access the DOM, and why does the Service Worker need to wait for all tabs to close before activating a new version?"

**Hruday's answer:**
> Service Workers (and Web Workers) can't access the DOM because DOM access is inherently single-threaded — the DOM is not thread-safe. If a SW could manipulate the DOM directly, you'd need complex locking mechanisms across threads. Instead, the browser enforces isolation: workers communicate with the page via `postMessage`, and the page handles DOM mutations. This is actually beneficial — it forces a clean separation between network/compute logic (in the worker) and presentation (on the main thread).
>
> On the activation pattern: a Service Worker controls the network layer for EVERY page it manages. If a new SW activates while pages are still using the old SW, you have a split scenario: some pages use old SW caching logic, some use new SW caching logic. The "cached app shell" might be version 2 from the new SW, but the page was loaded expecting version 1's asset paths. This can cause assets to 404 or serve incompatible versions — breaking the app.
>
> The wait-for-tabs-close guarantee means all pages on the same SW version at any given time. The page loads fresh, gets the new SW's cache, and everything is consistent.
>
> `skipWaiting()` overrides this safety for cases where you're confident a version boundary is safe — like a pure content update with no breaking cache changes. But it's a deliberate escape hatch, not the default.

---

### Q3 — Scenario
**Interviewer asks:** "You need to implement offline capability for a form that submits inspection data. Walk me through the architecture."

**Hruday's answer:**
> Three components work together: the Service Worker, Background Sync API, and IndexedDB.
>
> Step 1 — Intercept the form submission. In the Service Worker's `fetch` handler, catch POST requests to `/api/inspections`. If the user is online, pass through to the network normally. If the user is offline (fetch throws), save the form data to **IndexedDB** under a `pending-inspections` store, then register a **Background Sync** event with `registration.sync.register('offline-inspection-sync')`.
>
> Step 2 — Serve cached UI assets. The app shell (HTML, CSS, JS) is pre-cached during the SW's `install` event. When the user navigates to the inspection form offline, the SW serves the app from cache. The form renders and works normally — the user fills it in, submits it, and gets a confirmation message saying "Saved offline — will sync when connected."
>
> Step 3 — Background Sync triggers. When the browser detects connectivity (or the user's device reconnects), the browser fires the `sync` event on the Service Worker. The SW reads pending inspections from IndexedDB, retries the POST requests, and deletes successfully synced records. This happens even if the user has closed the tab — the SW is woken up by the browser to handle the sync.
>
> Step 4 — Notify the user. After a successful sync, the SW sends a `postMessage` to any open page tabs, or fires a Push Notification if the tab is closed, saying "3 offline inspections synced."
>
> This is the architecture we referenced at SAP for the field service PWA pattern — Service Workers make the app genuinely offline-capable, not just "shows a cached version."

---

### Q4 — Advanced
**Interviewer asks:** "Explain the performance implications of `postMessage` for large data transfers to a Web Worker."

**Hruday's answer:**
> `postMessage` uses the **structured clone algorithm** by default — it creates a deep copy of the data and transfers it to the worker's memory space. For large data, this copy is expensive in both time and memory. Copying a 50MB dataset to a worker means 50MB more memory used, and the copy itself takes tens to hundreds of milliseconds — defeating the purpose if the copy cost approaches the computation cost.
>
> The solution is **transferable objects**, specifically `ArrayBuffer`. Instead of copying, you TRANSFER ownership of the buffer to the worker. The original reference becomes detached (unusable). Transfer is O(1) — regardless of buffer size, it's a pointer hand-off, not a copy. Typical pattern:
>
> ```javascript
> // Encode your data as an ArrayBuffer (e.g., via JSON + TextEncoder)
> const encoder = new TextEncoder();
> const buffer = encoder.encode(JSON.stringify(largeDataset)).buffer;
> 
> // Transfer the buffer — zero-copy
> worker.postMessage({ buffer }, [buffer]);
> // buffer is now detached in main thread; worker has sole ownership
> ```
>
> `SharedArrayBuffer` goes further — both main thread and worker READ from the same memory without copying. Requires COOP/COEP security headers (Cross-Origin Opener Policy and embedder policy), so not always practical without server configuration. It also requires `Atomics` for safety if both sides write.
>
> Rule of thumb: for data under ~1MB, structured clone is fine. For larger datasets or real-time image processing (where you're sending 4MB frame buffers 30 times per second), use transfers for ArrayBuffers or SharedArrayBuffer for sustained sharing.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Service Workers work over HTTP" | "I'll add a service worker to the development server" | Service Workers require HTTPS (to prevent man-in-the-middle injection of malicious SW code); the ONLY exception is `localhost` (HTTP OK for development); if your staging environment is HTTP without a valid cert, SW registration will silently fail; in production, HTTPS is required — if you're getting 'registration failed' in staging, check for HTTPS |
| "Web Workers can access localStorage" | "The worker reads the auth token from localStorage" | `localStorage` is synchronous and DOM-bound — NOT available in workers; alternatives in workers: `IndexedDB` (async, available in workers), `Cache API`, or pass the value via `postMessage` from the main thread when creating/initialising the worker; `sessionStorage` also unavailable; `cookies` are also not accessible in workers |
| "Service Worker is the same as a traditional cache" | "We use HTTP cache headers, same thing as a service worker" | HTTP cache headers (Cache-Control, ETag) are managed by the browser and server passively; a Service Worker gives you programmatic, explicit control — you write the logic of WHAT to cache, WHEN to cache it, and HOW to respond to requests; you can implement custom strategies (stale-while-revalidate, cache-and-network race) that HTTP headers can't express; also, SW caches are versioned by you, not by the server |
| "skipWaiting() is always safe to use" | "I always call skipWaiting() so the new SW activates immediately" | `skipWaiting()` can cause version mismatches: a page loaded with the OLD SW's cached HTML might encounter new SW's cached JS/CSS versions that are incompatible; a page expecting API v1 might be fetched by a SW with API v2 interceptors; only safe if: assets use content hashing (unique file names per build), the new version is backward compatible, or you also call `clients.claim()` AND force a page reload on activation |

---

## 7. Hruday's Real Experience Hook
> "The SAP Fiori platform context was central to my understanding of Service Workers. SAP Fiori is architected as a Progressive Web App — offline capability is a core requirement for field service workers who may be in locations with no internet access.
>
> The architecture insight that stuck with me: Service Workers aren't just about offline — they're about making the network layer EXPLICIT. In a normal web app, the browser silently decides what to cache, what to revalidate, what to discard. A Service Worker exposes that decision logic to your code. You write the business rule: 'For equipment inspection data, prefer fresh network data, but serve cached data instantly if the network is slow or unavailable, and sync when connectivity returns.'
>
> On the Web Worker side: at Capgemini, one of our React client's data-intensive tables was filtering 30,000 rows on keystroke. The Interaction to Next Paint (INP) was 1,800ms — genuinely terrible. The filter logic was correct but blocking the main thread. We created a Web Worker with Comlink, moved the entire filter function to the worker, and showed a debounced spinner while the worker processed. INP dropped to 50ms (the time for the worker to receive the postMessage and start processing). The actual filter time was the same 180ms — but on a different thread, so INP was the communication overhead, not the computation."

---

## 8. Scale Evolution

**Small project →** Service Worker via Workbox library (simplifies caching strategies to one-line configs), Web Worker for one-off heavy operations. Don't hand-code SW cache strategies — Workbox handles the install/activate/version management boilerplate correctly.

**Mid-size app, product team →** Vite Worker plugin for Web Workers (automatically handles bundling, TypeScript, tree-shaking for worker files); Workbox Webpack/Vite plugin for SW Generation; explicit Web Vitals monitoring for INP (catches main thread blocking); Lighthouse PWA audit in CI to catch SW regressions.

**Consumer-scale / enterprise PWA →** Multiple specialized workers (filter worker, sort worker, image processing worker) with pooling (don't create a new worker per operation — workers are expensive to instantiate, ~50ms startup); `SharedArrayBuffer` for high-frequency data sharing (streaming video frame processing, WebGL data updates); sophisticated SW cache strategies per route (HTML: stale-while-revalidate, assets: cache-only with hashed filenames, API: network-first with fallback + background refresh); push notification campaigns via SW; background analytics gathering in SW.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment checkout PWA requires offline detection (prevent checkout attempt when offline, avoid lost payment state); fraud detection logic running in the browser (IP analysis, device fingerprinting) could benefit from Web Workers to avoid blocking the payment UI; SW for checkout page pre-caching (fastest possible load on mobile) | SW for payment confirmation page offline detection; Web Worker for client-side validation of large transaction datasets |
| Swiggy / Meesho | PWA is a core deployment target (lower APK install friction for smaller cities); restaurant menu must work on slow or intermittent 2G connections (SW cache-first for menu data); product catalog filtering (50K+ items) in the browser (Web Worker); offline cart persistence (SW + IndexedDB) | SW cache strategies for food/product catalog; Web Worker for search/filter on large datasets; background sync for cart updates |
| Adobe / Microsoft | Heavy client-side processing: PDF rendering (Web Worker for entire render pipeline), image editing (Web Worker for filter/transform operations, SharedArrayBuffer for pixel data); Microsoft Office Web — SW for offline document access; sophisticated multi-worker architecture with message-passing protocols | SharedArrayBuffer and zero-copy transfers; SW versioning and cache invalidation strategies; multi-worker coordination |
| SAP Labs | SAP Fiori PWA = SW is a core platform feature; offline inspection forms for manufacturing = background sync pattern; field service workers needing offline territory data; SAP Analytics Cloud runs heavy data computation in Web Workers | Real SAP Fiori PWA architecture knowledge; offline-first design patterns; background sync implementation; SW lifecycle management |

---

## 10. Related Topics — What to Study Next

- **Topic 206 — Event Loop: Microtasks vs Macrotasks** — Web Workers have their own event loop, entirely independent of the main thread's event loop; `postMessage` creates a macrotask on the receiving end (both directions: main → worker and worker → main arrive as message events in the event queue); understanding both topics clarifies exactly when worker results are processed after `postMessage`
- **Topic 234 — Core Web Vitals (LCP, CLS, INP)** — Web Workers directly improve INP (Interaction to Next Paint) by removing long tasks from the main thread; Service Workers can improve LCP by serving cached resources before a network response arrives (stale-while-revalidate = instant resource from cache); both workers are performance tools through the lens of Core Web Vitals measurement
- **Topic 235 — Code Splitting and Lazy Loading** — Service Workers and code splitting are complementary: SW pre-caches hot code-split chunks during install so dynamic `import()` calls resolve from cache (0ms network latency), not from the CDN; understanding both topics enables a full asset caching and delivery strategy
- **Topic 241 — PWA and Offline Architecture** — Service Workers are the technical foundation of PWA, but PWA design includes the full stack: Web App Manifest (installability), background sync strategy, push notification UX, offline fallback design; this topic covers the high-level PWA design that the SW implementation (Topic 208) powers

---

*Part 12 · Web Workers and Service Workers · Full Stack Interview Guide · Hruday D · 2026*
