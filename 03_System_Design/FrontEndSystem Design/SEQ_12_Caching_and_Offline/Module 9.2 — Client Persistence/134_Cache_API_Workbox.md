# 134. Cache API & Workbox Library ★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

The **Cache API** is a browser-native storage mechanism designed to hold HTTP request/response pairs — giving Service Workers programmatic control over exactly what gets cached, for how long, and with what fallback strategy. Unlike HTTP cache (controlled by server headers) or browser cache (automatic), the Cache API is fully controllable from JavaScript, making it the foundation of offline-first Progressive Web Apps. **Workbox** is Google's production-quality library that wraps the Cache API with battle-tested caching strategies — **NetworkFirst**, **CacheFirst**, **StaleWhileRevalidate**, **NetworkOnly**, and **CacheOnly** — eliminating the need to write low-level Service Worker boilerplate. Rather than spending engineering effort on the nuances of cache versioning, cleanup, and background sync, Workbox provides a declarative API for route-based caching that reads like a routing table. For any application that needs offline support, fast repeat visits, or PWA capabilities, the Cache API + Workbox is the production architecture.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Cache API: Native Browser Interface

```typescript
// Cache API is available in Service Worker context AND in browser window context
// Must check for support:
const hasCache = 'caches' in window;

// Open a named cache (creates if doesn't exist)
const cache = await caches.open('my-app-v1');

// Store a response
const request = new Request('/api/products');
const response = await fetch(request);
await cache.put(request, response.clone());  // .clone() — response can only be consumed once!

// Retrieve from cache
const cachedResponse = await cache.match('/api/products');
if (cachedResponse) {
  const data = await cachedResponse.json();
}

// Delete a specific entry
await cache.delete('/api/products');

// Delete entire named cache
await caches.delete('my-app-v1');

// List all cache names (for cleanup during Service Worker update)
const cacheNames = await caches.keys();
// Returns: ['my-app-v1', 'my-app-images-v1', ...]
```

### Service Worker + Cache API: Manual Strategy

```typescript
// service-worker.ts — implementing StaleWhileRevalidate manually
// This is what Workbox abstracts away for you

const CACHE_NAME = 'sw-cache-v1';
const STATIC_ASSETS = ['/index.html', '/styles/main.css', '/js/app.js'];

// Install: pre-cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(STATIC_ASSETS)  // Batch pre-cache all critical assets
    )
  );
  (self as ServiceWorkerGlobalScope).skipWaiting();  // Activate immediately
});

// Activate: clean up old caches from previous SW versions
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)  // Remove all but current version
          .map(key => caches.delete(key))
      )
    )
  );
  (self as ServiceWorkerGlobalScope).clients.claim();  // Take control immediately
});

// Fetch: intercept requests
self.addEventListener('fetch', (event: FetchEvent) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(staleWhileRevalidate(event.request));
});

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  // Fetch in background (regardless of cache hit)
  const networkPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());  // Update cache
    }
    return response;
  });
  
  // Return cached immediately if available, or wait for network
  return cached ?? networkPromise;
}
```

### Workbox: Production-Grade Cache Strategies

```typescript
// service-worker.ts — using Workbox (Google's production library)
// Install: npm install workbox-precaching workbox-routing workbox-strategies workbox-expiration

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { 
  CacheFirst, 
  NetworkFirst, 
  StaleWhileRevalidate, 
  NetworkOnly 
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// 1. Precache static assets (build tool generates manifest)
// Workbox injects __WB_MANIFEST with hashed asset list
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();  // Remove previous versions' precaches

// 2. HTML pages: NetworkFirst (freshest possible, falls back to cache)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 3,  // After 3s, use cache — don't leave user waiting
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),  // 24h
    ],
  })
);

// 3. API responses: StaleWhileRevalidate (fast response, background refresh)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/products'),
  new StaleWhileRevalidate({
    cacheName: 'api-products',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60,  // 5 min max age
      }),
    ],
  })
);

// 4. Images: CacheFirst (images rarely change, expensive to refetch)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,  // 30 days
        purgeOnQuotaError: true,  // Automatically trim when storage quota hit
      }),
    ],
  })
);

// 5. Third-party fonts: CacheFirst (never changes for same URL)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// 6. POST requests: NetworkOnly + Background Sync (form submissions that can fail)
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/orders') && request.method === 'POST',
  new NetworkOnly({
    plugins: [
      new BackgroundSyncPlugin('order-queue', {
        maxRetentionTime: 24 * 60,  // Retry for up to 24 hours
      }),
    ],
  }),
  'POST'
);
```

### Workbox Strategy Decision Matrix

```
Strategy          When to Use                           Example
──────────────────────────────────────────────────────────────────────
NetworkFirst      • HTML pages                          GET /about
                  • API data needing freshness          GET /api/user
                  • Content that changes frequently

CacheFirst        • Static assets (fonts, images)       /fonts/inter.woff2
                  • CDN-hosted versioned resources      /images/hero-v3.jpg
                  • Rarely or never-changing content

StaleWhileRevalidate • Product listings                 GET /api/products
                     • News/blog content                GET /api/posts  
                     • "Fast with background refresh"

NetworkOnly       • Analytics beacons                  POST /api/events
                  • Real-time data (prices, inventory)  GET /api/stock
                  • POST/PUT/DELETE requests

CacheOnly         • Pre-cached offline app shell        /offline.html
                  • After explicit offline mode toggle
```

### Vite + Workbox (vite-plugin-pwa)

```typescript
// vite.config.ts — automated Workbox SW generation
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',   // Auto-update SW when new version detected
      
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],  // Precache these
        
        runtimeCaching: [
          // API caching via runtime strategy
          {
            urlPattern: /^https:\/\/api\.example\.com\/products/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-products-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
            },
          },
          // Images
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      
      // Web app manifest for PWA installability
      manifest: {
        name: 'My App',
        short_name: 'App',
        theme_color: '#ffffff',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```

### Next.js + Service Worker (next-pwa)

```typescript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/api\/products/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'product-api',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 },
      },
    },
  ],
});

module.exports = withPWA({});
```

### Cache Quota Management

```typescript
// Browsers limit storage — check and manage proactively
async function checkStorageQuota(): Promise<void> {
  if (!navigator.storage?.estimate) return;
  
  const { usage, quota } = await navigator.storage.estimate();
  const usagePercent = ((usage ?? 0) / (quota ?? 1)) * 100;
  
  console.log(`Storage: ${(usage! / 1024 / 1024).toFixed(1)}MB / ${(quota! / 1024 / 1024).toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);
  
  // Typical quotas: 
  // Chrome: ~60% of remaining disk (often GBs)
  // Safari: up to 1GB per origin
  // Firefox: 10% of available disk
  
  if (usagePercent > 80) {
    // Evict oldest/largest caches
    const cacheNames = await caches.keys();
    await caches.delete(cacheNames[0]);  // Evict oldest (by convention)
  }
}
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Twitter Lite (PWA):**
One of the earliest high-profile PWA deployments. Uses Workbox with `StaleWhileRevalidate` for timeline (fast response + background refresh) and `CacheFirst` for images. First load: 3G, 2.5 seconds. Repeat visit: 0.4 seconds (served from Cache API). 70% reduction in data consumption vs mobile native Twitter.

**Google Search PWA:**
Precaches critical JS/CSS during SW install. Runtime caches search results for recent queries (CacheFirst, 5 min TTL). User can type a recent search and see results instantly before network responds.

**SAP Fiori PWA:**
Some SAP Fiori apps are deployed as PWAs on mobile. The shell (routing, navigation, core UI components) is precached. OData API calls use `NetworkFirst` with `networkTimeoutSeconds: 3` — if the enterprise network is slow, the cached version serves while the fresh data loads.

**Scaling:**
- Simple site: HTTP cache + no SW needed
- PWA/mobile web: Service Worker + Workbox mandatory for offline + install
- Field service apps: Full offline mode — `CacheOnly` fallback + Background Sync for data submission when network returns

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "The Cache API gives Service Workers programmatic control over a response cache — you write the JavaScript that decides: intercept this request, return the cached response, fetch in background, update the cache. Workbox is Google's production library that builds this into named strategies — CacheFirst, NetworkFirst, StaleWhileRevalidate — so I don't rewrite cache versioning and cleanup logic. My decision tree for caching strategy is straightforward: static assets (JS/CSS with hash, fonts, images) get CacheFirst with long TTL — they're immutable by design. HTML pages get NetworkFirst with a 3-second timeout — try fresh, fall back to cache if network stalls. Product listings and non-personalized API responses get StaleWhileRevalidate — serve cache immediately, refresh in background. User-specific API data and write operations get NetworkOnly. The key integration is using vite-plugin-pwa or next-pwa to auto-generate the precache manifest — the build tool hashes all static assets and injects them into the SW manifest, ensuring the SW always caches the exact current build outputs."

**Likely Follow-up Questions:**
1. *What's the difference between Cache API and HTTP cache?* → HTTP cache is controlled by server headers, managed by the browser automatically; Cache API is programmatic, controlled by your SW JavaScript, stored separately
2. *What is the SW lifecycle (install/activate/fetch)?* → Install: pre-cache assets; Activate: clean old caches, claim clients; Fetch: intercept requests, apply caching strategy
3. *How do you handle SW updates when users have old version cached?* → `skipWaiting()` forces new SW to activate; `clients.claim()` takes control immediately; or prompt user to refresh
4. *What is Background Sync in Workbox?* → Queues failed POST requests (offline form submissions) in IndexedDB, retries when connectivity returns — used for offline form submissions
5. *How does Workbox handle cache versioning?* → Precache uses content hashes; each build generates a new manifest; SW activation deletes old `workbox-precache-*` entries automatically

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (Offline Fallback Page)
────────────────────────────────────────────────────────────

```typescript
// service-worker.ts — offline fallback page pattern
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST);

// Navigation requests: NetworkFirst
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages' })
);

// ✅ Catch-all fallback: if network AND cache fail, show offline page
setCatchHandler(async ({ event }) => {
  if ((event as FetchEvent).request.destination === 'document') {
    // /offline.html was precached in __WB_MANIFEST
    return caches.match('/offline.html') ?? Response.error();
  }
  return Response.error();
});
```

```html
<!-- public/offline.html — pre-cached offline indicator -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline — MyApp</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
  </style>
</head>
<body>
  <h1>You're offline</h1>
  <p>Connect to the internet and refresh to continue.</p>
  <button onclick="window.location.reload()">Try again</button>
</body>
</html>
```

**Why this pattern matters in interviews:**
- Shows understanding of SW lifecycle (precache during install)
- `setCatchHandler` is the correct Workbox API for offline fallback
- `offline.html` must be in the precache manifest — not just served as a normal route

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Workbox strategy selection in one decision tree:**
```
Is it a static asset (JS/CSS/font/image)?  → CacheFirst
Is it an HTML page navigation?              → NetworkFirst (timeout: 3s)
Is it a public, cacheable API?              → StaleWhileRevalidate
Is it user-specific or a write?             → NetworkOnly
Is it an offline form submission?          → NetworkOnly + BackgroundSync
```

**Cache API rule:** Every response can only be `consumed()` once — always `.clone()` before storing.

**If you go blank:** "The Cache API lets Service Workers store and retrieve responses programmatically. Workbox provides named strategies (CacheFirst, NetworkFirst, SWR) so you don't write cache logic from scratch."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Repeat visit performance**: Static assets from Cache API = 0ms network, 0ms DNS — repeat visits are instant
→ **Offline support**: Without SW + Cache API, any network interruption = broken app; with it, core functionality works offline
→ **PWA installability**: Cache API is the foundation of installable PWAs — mandatory for `beforeinstallprompt`

**How it works:**
→ The Cache API stores `Request → Response` pairs in a persistent key-value store in the browser (partitioned by origin). Service Workers intercept all `fetch()` events; based on the registered route strategies, they either return the cached response, fetch fresh, or both. Workbox generates cache versioning logic: each new SW build creates a new precache name and activates cleanup of old ones.

**Company relevance:**
→ **Microsoft**: Teams PWA for education (Teams Lite) uses SW + Cache API for offline message composition in low-connectivity regions
→ **Adobe**: Lightroom web PWA uses CacheFirst for assets, StaleWhileRevalidate for library metadata — enabling speed and partial offline access
→ **Salesforce**: Salesforce Mobile offline mode uses Service Worker + Cache API via the Offline Mobile SDK for field sales
→ **Cisco**: WebEx Slido (live polling tool) uses SW caching for conference presentation mode — works even when venue WiFi drops
