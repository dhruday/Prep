# 15. Web Workers, Service Workers, and Worklets

---

## 1. High-Level Explanation (Frontend Interview Level)

The browser provides three distinct "worker" types, each designed for a specific purpose. Despite the shared "worker" naming, they are fundamentally different in scope, lifetime, and capability:

| | **Web Worker** | **Service Worker** | **Worklet** |
|--|---|---|---|
| **Purpose** | Background CPU compute | Network proxy, offline, push | Rendering pipeline extension |
| **Lifetime** | Tab session | Event-driven, survives tab | Frame-bound |
| **DOM Access** | No | No | No |
| **Network Access** | Yes (fetch) | Yes (intercepts fetch) | No |
| **Instances** | Many | One per origin | Tied to rendering |

Understanding which worker to use when is a senior-level architectural decision.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

---

### Web Workers

**Dedicated Workers** are the simplest: one-to-one relationship with a page, spin up for compute, spin down when done.

**Use cases:**
- Parsing large JSON/CSV files
- Image/audio/video processing
- Cryptographic operations (hashing, encryption)
- Data compression/decompression
- Running WASM modules
- Physics simulations for games
- ML model inference (TensorFlow.js in worker)

**Lifecycle:**
```javascript
// Created when needed
const worker = new Worker('/heavy-task.worker.js', { type: 'module' });

// Communicates via message passing
worker.postMessage({ type: 'PROCESS', data: largeDataset });
worker.onmessage = (e) => console.log(e.data.result);

// Terminated when done (frees OS thread)
worker.terminate();
```

**Module Workers (2020+):**
```javascript
// type: 'module' enables ES module syntax in workers
const worker = new Worker('/worker.js', { type: 'module' });
// worker.js can now: import { util } from './utils.js';
```

**Shared Workers** serve multiple browsing contexts (tabs, iframes):
```javascript
// All tabs connecting to the same URL share one worker instance
const shared = new SharedWorker('/shared-state.worker.js');
shared.port.start();
shared.port.postMessage({ type: 'SUBSCRIBE' });
shared.port.onmessage = (e) => console.log(e.data);
```
Used for: shared WebSocket connections, cross-tab state synchronization, resource deduplication.

---

### Service Workers

Service Workers are the most powerful and architecturally significant of the three. They act as a **programmable network proxy** that sits between your page and the network.

**Key properties:**
- Lives at the origin level, not the page level
- Has its own lifecycle: install → activate → idle → fetch interception
- Survives the page closing (remains registered for the origin)
- Wakes up on events (fetch, push, sync, notificationclick)
- Cannot access the DOM
- Requires HTTPS (localhost exempt for development)

**Lifecycle:**

```
navigator.serviceWorker.register('/sw.js')
    ↓
[install] — Cache resources, set up caches
    ↓
[waiting] — New SW waits for old SW clients to close (unless skipWaiting())
    ↓
[activate] — Clean up old caches, claim clients
    ↓
[idle] — SW is parked (not using memory)
    ↓
[fetch/push/sync event] — SW wakes, handles event, goes idle again
```

**The fetch lifecycle is the architectural core:**
```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  event.respondWith(
    // Strategy: Cache First with Network Fallback
    caches.match(request).then(cached => {
      if (cached) return cached; // Return from cache immediately
      
      return fetch(request).then(response => {
        // Cache the fresh response for future requests
        const responseClone = response.clone();
        caches.open('v1').then(cache => cache.put(request, responseClone));
        return response;
      });
    })
  );
});
```

**Caching Strategies:**

| Strategy | Description | Best For |
|----------|-------------|----------|
| **Cache First** | Cache → Network fallback | Static assets (JS, CSS, fonts) |
| **Network First** | Network → Cache fallback | API responses, user data |
| **Stale-While-Revalidate** | Return cache, update in background | Non-critical content, news feeds |
| **Cache Only** | Cache always, no network | Fully offline content |
| **Network Only** | Network always, no cache | Real-time data, payments |

**Background Sync:**
```javascript
// Page: register a sync task (will execute even if page is closed)
await navigator.serviceWorker.ready;
await registration.sync.register('send-analytics');

// SW: handle when connectivity is available
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-analytics') {
    event.waitUntil(sendQueuedAnalytics());
  }
});
```

**Push Notifications:**
```javascript
// SW: receive push from server, show notification
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png',
      badge: '/badge.png',
    })
  );
});
```

**Service Worker Update Flow:**

A new service worker file → browser installs it → waits for all tabs using old SW to close → activates new SW. `skipWaiting()` + `clients.claim()` forces immediate activation (risky for in-flight requests).

```javascript
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Immediately take over, don't wait
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Claim all open clients immediately
});
```

---

### Worklets

Worklets are the smallest worker type — lightweight, purpose-built for specific points in the browser's rendering pipeline. They have a restricted API surface.

**Types:**

**1. Paint Worklet (CSS Houdini — Painting API)**
Lets you define custom CSS paint functions that run during the paint phase:

```javascript
// main.js
CSS.paintWorklet.addModule('/checker-painter.js');

// checker-painter.js (worklet context)
registerPaint('checker', class {
  static get inputProperties() { return ['--tile-size']; }
  
  paint(ctx, geometry, properties) {
    const size = parseInt(properties.get('--tile-size')) || 20;
    for (let y = 0; y < geometry.height; y += size) {
      for (let x = 0; x < geometry.width; x += size) {
        ctx.fillStyle = (x / size + y / size) % 2 === 0 ? '#eee' : '#fff';
        ctx.fillRect(x, y, size, size);
      }
    }
  }
});
```

```css
.element {
  --tile-size: 30;
  background: paint(checker); /* Calls the worklet */
}
```

**2. Animation Worklet (Web Animations Level 2)**
Runs animations off the main thread, synchronized with the compositor:

```javascript
await CSS.animationWorklet.addModule('/sticky-animation.js');

// Register a stateful animator
registerAnimator('sticky', class {
  animate(currentTime, effect) {
    // Map scroll position to animation progress
    effect.localTime = clamp(currentTime, 0, 1000);
  }
});
```

Used for scroll-linked animations that need to run on the compositor thread.

**3. Audio Worklet**
Replaces the deprecated ScriptProcessor API for real-time audio processing:

```javascript
await audioContext.audioWorklet.addModule('/audio-processor.js');

// audio-processor.js
registerProcessor('gain-processor', class extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    for (let channel = 0; channel < input.length; channel++) {
      for (let i = 0; i < input[channel].length; i++) {
        output[channel][i] = input[channel][i] * 0.5; // Apply gain
      }
    }
    return true; // Keep processor alive
  }
});
```

**Layout Worklet** (CSS Layout API) — Still experimental; lets you define custom CSS layout algorithms.

---

## 3. Real-World Examples

### Twitter/X — Service Worker for Offline PWA
Twitter Lite (PWA) uses a Service Worker with stale-while-revalidate strategy for the feed. When you open Twitter on a slow connection, you see the cached previous feed instantly, while the SW fetches fresh tweets in the background and updates the UI. Push notifications for mentions use SW's push event handler.

### Figma — OffscreenCanvas in Web Worker
Figma renders its canvas using WebGL in a Dedicated Worker via OffscreenCanvas transfer. The Paint Worklet is used for rendering design system patterns and grid backgrounds without blocking the main thread.

### Google Stadia (RIP) / YouTube — Audio Worklet
YouTube's audio processing (normalization, spatial audio, subtitles sync) runs via Audio Worklets to avoid introducing latency from main thread audio processing.

### Shopify — Service Worker Caching Strategy
Shopify storefronts use Service Workers to cache static assets (CSS, JS bundles, product images) with Cache First strategy. Product pages load from cache immediately — users on spotty mobile connections still get fast page loads. The SW updates the cache in the background on each visit.

### VS Code (Web) — Service Worker for Virtual FS
VS Code in the browser uses a Service Worker to intercept fetch requests for extension files and serve them from an in-memory virtual filesystem (since extensions can't use the real filesystem in a browser context).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"There are three worker types with distinct architectural roles. Dedicated Web Workers are for CPU-heavy background computation — image processing, data parsing, WASM execution. They coordinate with the main thread via message passing and Transferable Objects for zero-copy data transfer.*

*Service Workers are the architectural backbone of Progressive Web Apps. They're network proxies that intercept all fetch requests from your origin, enabling caching strategies (cache-first, stale-while-revalidate), offline support, background sync, and push notifications. They live at the origin level, survive page closes, and are woken by browser events. Their update lifecycle is subtle — new SW versions wait for all current pages to close before activating, which matters for deployment strategies.*

*Worklets are specialized pipeline extensions — Paint Worklets for custom CSS backgrounds, Animation Worklets for compositor-thread scroll animations, and Audio Worklets for real-time audio DSP. They have very restricted APIs compared to workers but run at specific points in the browser's rendering pipeline.*

*In a production PWA, I'd use a Service Worker with Workbox for cache management, Web Workers for data processing tasks like parsing large API responses, and Audio Worklets if there's audio recording/playback involved.*"

### Likely Follow-up Questions

1. **"When would you use stale-while-revalidate vs cache-first?"**
   → `stale-while-revalidate` when content is frequently updated but slight staleness is okay (news feeds, non-critical content). `cache-first` for content that doesn't change often (versioned JS bundles, fonts, static images).

2. **"How do you handle Service Worker updates in production?"**
   → Version your caches, clean up old caches in `activate`. Use `skipWaiting()` only for safe updates (not mid-flight state). Show an "Update available — refresh to update" UI banner using the `waiting` state. Use Workbox's `registerRoute` and `precacheAndRoute` for automated management.

3. **"What is background sync and when is it useful?"**
   → Background Sync allows a Service Worker to defer an action (like sending a form) until the device has stable connectivity. Useful for offline-first forms — user submits, page closes, SW sends when back online. Perfect for analytics, offline form submissions, queued chat messages.

4. **"Can Service Workers access localStorage?"**
   → No. localStorage is synchronous and main-thread only. SWs use IndexedDB (async) for persistent storage, and the Cache API for request/response storage.

---

## 5. Code Examples

### Complete Service Worker with Workbox (Production Pattern)

```javascript
// sw.js — Using Workbox for clean strategy management
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache build artifacts (injected by Workbox CLI/webpack plugin)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Static assets: Cache First (versioned files never change)
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-assets-v1',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// API calls: Network First with cache fallback
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache-v1',
    networkTimeoutSeconds: 3, // Fall to cache after 3s timeout
    plugins: [new ExpirationPlugin({ maxEntries: 50 })],
  })
);

// Images: Stale While Revalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 100 })],
  })
);
```

### Web Worker with Comlink (Type-Safe RPC)

```javascript
// Heavy computation service (using Comlink for RPC-style worker API)
// worker.js
import * as Comlink from 'comlink';

const api = {
  async processCSV(csvText) {
    // Parse CSV off main thread
    const rows = csvText.split('\n').map(row => row.split(','));
    return { rowCount: rows.length, data: rows };
  },
  
  async compressData(data) {
    // Run compression algorithm
    const stream = new CompressionStream('gzip');
    // ... implementation
    return compressedBuffer;
  }
};

Comlink.expose(api);

// main.js
import * as Comlink from 'comlink';
const worker = new Worker(new URL('./worker.js', import.meta.url));
const api = Comlink.wrap(worker);

// Use like a regular async function — no manual postMessage!
const result = await api.processCSV(largeCsvContent);
console.log(result.rowCount);
```

### PWA Update Strategy

```javascript
// main.js — Handle SW updates gracefully
if ('serviceWorker' in navigator) {
  const registration = await navigator.serviceWorker.register('/sw.js');
  
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New SW is installed but waiting — show update UI
        showUpdateBanner({
          message: 'New version available!',
          onRefresh: () => {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        });
      }
    });
  });
  
  // Reload when new SW takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
```

---

## 6. Why & How Summary

**Why it matters:**
These three worker types are the toolkit for building professional-grade frontend systems. Web Workers keep the main thread responsive under CPU load. Service Workers are the technical foundation of PWAs — enabling offline capability, instant loads from cache, push notifications, and background sync. Combined, they allow frontend applications to approach native app-quality user experiences. At FAANG scale, Service Workers also serve as client-side A/B test infrastructure, analytics collection systems, and security enforcement layers.

**How it works:**
**Web Workers** are OS threads with their own V8 instance, communicating via structured-clone message passing or Transferable Object transfer. **Service Workers** are event-driven network proxies registered at the origin scope, intercepting all fetch requests via `fetch` event handlers and implementing caching strategies (Cache First, Network First, SWR) against the Cache API. They are installed/activated on a lifecycle tied to SW file changes and remain dormant (not consuming memory) until an event wakes them. **Worklets** are lightweight, purpose-restricted execution contexts that run at specific points in the browser's rendering pipeline (paint, animate, audio) — they extend the browser's built-in pipeline rather than running arbitrary JS.
