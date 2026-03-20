# 41. Service Workers — Lifecycle, Fetch Interception, Push
**Phase:** Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds. Crisp. Confident. Numbers included where relevant.

Service Workers are a browser-managed proxy layer that sits between your web application and the network. They run in a background thread, independently of any page, and can intercept every HTTP fetch the page makes — returning responses from cache, the network, or a combination of both. This is the foundation of Progressive Web Apps: offline support, background sync, and web push notifications. A Service Worker persists beyond page close — the browser can wake it for push notifications or background sync even when no tab is open. At SAP, a Service Worker for the Fiori Launchpad would be architecturally impactful: caching OData metadata and frequently-accessed tile configurations offline, pre-fetching the next page's data on interaction, and serving an app shell instantly — all without touching the network on repeat visits. This is the difference between a 400ms second visit and a 50ms second visit.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

A Service Worker is a type of Web Worker that the browser manages with a specific event-driven lifecycle, scoped to an origin and path. Unlike regular Web Workers (controlled by a page), Service Workers outlive pages and are managed by the browser across sessions.

**Key capabilities:**
1. **Fetch interception** — intercept any `fetch()` or `<img>` or `<link>` request from pages in scope
2. **Cache API access** — store and retrieve request/response pairs in the Cache API
3. **Background Sync** — defer failed requests until connectivity is restored
4. **Push notifications** — receive server push messages and display OS-level notifications
5. **Periodic Background Sync** — refresh data on a schedule even with no open tab

**Scope:**
- A Service Worker at `/sw.js` controls pages under `/` (entire origin)
- A Service Worker at `/app/sw.js` controls pages under `/app/` only
- Scope is determined by the SW file's URL, not `navigator.serviceWorker.register()` scope option (though scope option can restrict it)

### How It Works Internally

#### Service Worker Lifecycle

```
Phase 1: Registration
─────────────────────
Page calls: navigator.serviceWorker.register('/sw.js', { scope: '/' })
Browser:    Downloads /sw.js
            Parses and executes /sw.js in a Worker thread
            Fires: install event

Phase 2: Install
────────────────
SW handles 'install' event:
  - Typically opens Cache API and pre-caches critical resources
  - If event.waitUntil(promise) → browser waits for promise before proceeding
  - If promise rejects → install fails, SW is discarded
  - If succeeds → SW moves to "installed/waiting" state

Phase 3: Activate
─────────────────
If no previous SW is controlling pages:
  → SW activates immediately after install

If a previous SW is controlling open pages:
  → NEW SW waits ("waiting to activate") until ALL pages using old SW close
  OR: new SW calls self.skipWaiting() → force-activates immediately
     (risks serving new SW code to pages that loaded with old app shell)

SW handles 'activate' event:
  - Typically cleans up old caches
  - Calls clients.claim() to immediately control open pages (optional)
  - If event.waitUntil(promise) → browser waits before service worker is "active"

Phase 4: Active
───────────────
SW intercepts fetch events for pages within scope
SW is idle between events (browser terminates idle SWs to save resources)
SW wakes up on: fetch, push, sync, message events

Phase 5: Update
───────────────
Browser re-fetches sw.js on every navigation (bypassing HTTP cache)
If byte-different from current SW → starts install of new SW
New SW sits in "waiting" state until old SW's tabs close (or skipWaiting)

Phase 6: Redundant
──────────────────
If install fails, SW is discarded
If superseded by a newer SW, old SW becomes redundant
```

**Lifecycle diagram:**
```
[Registering] → [Installing] → [Installed/Waiting] → [Activating] → [Active]
                     ↓ (error)                                           ↓
                [Redundant]                          ←── [Update cycle] ─┘
```

#### Fetch Interception Strategies

**Cache-First (offline-first, static assets):**
```typescript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ?? fetch(event.request)
    )
  );
});
// Best for: versioned assets (CSS, JS) that change only with deploys
```

**Network-First (fresh data, fallback to cache):**
```typescript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update cache with fresh response
        const clone = response.clone();
        caches.open('api-cache').then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request)!) // fallback on network failure
  );
});
// Best for: API responses where freshness matters but offline is acceptable
```

**Stale-While-Revalidate (fast + eventually fresh):**
```typescript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open('dynamic-cache').then(async (cache) => {
      const cached = await cache.match(event.request);

      const networkFetch = fetch(event.request).then((fresh) => {
        cache.put(event.request, fresh.clone());
        return fresh;
      });

      return cached ?? await networkFetch; // Serve cache immediately, update in background
    })
  );
});
// Best for: pages/resources where slightly stale is OK but loading fast matters
```

**App Shell + Cache-First for Shell, Network for Content:**
```typescript
const APP_SHELL = ['/index.html', '/app.js', '/styles.css', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('shell-v2').then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('fetch', (event) => {
  const isShell = APP_SHELL.some(path => event.request.url.endsWith(path));
  
  if (isShell) {
    // App shell: always from cache
    event.respondWith(caches.match(event.request).then(r => r ?? fetch(event.request)));
  } else if (event.request.url.includes('/api/')) {
    // API: network-first
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)!)
    );
  }
});
```

#### Push Notifications

```typescript
// Service Worker: receive push, show notification
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'New Message', body: '' };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/notification.png',
      badge: '/icons/badge.png',
      tag: data.tag ?? 'default', // replaces existing notification with same tag
      data: { url: data.url },    // passed to notificationclick
      requireInteraction: false,
    })
  );
});

// Service Worker: handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const existing = windowClients.find(c => c.url === event.notification.data.url);
      if (existing) return existing.focus();
      return clients.openWindow(event.notification.data.url);
    })
  );
});
```

#### Background Sync

```typescript
// Page: queue a sync when offline
async function sendWithRetry(data: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/save', { method: 'POST', body: JSON.stringify(data) });
  } catch {
    // Store in IndexedDB for later
    await storeForSync(data);
    await navigator.serviceWorker.ready;
    await (navigator.serviceWorker.ready as any).sync.register('retry-save');
    // Browser will fire 'sync' event when online, even after page close
  }
}

// Service Worker: handle sync event
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'retry-save') {
    event.waitUntil(
      getStoredData().then(items =>
        Promise.all(items.map(item => fetch('/api/save', {
          method: 'POST',
          body: JSON.stringify(item),
        })))
      )
    );
  }
});
```

### Architecture & Component Boundaries

```
Browser Tabs (Renderer Processes)
  Tab 1: app.sap.com/launchpad      ─┐
  Tab 2: app.sap.com/fiori-app      ─┤── all controlled by SW at app.sap.com/sw.js
  Tab 3: app.sap.com/analytics      ─┘

Service Worker Thread (always one active per scope):
  ├── Fetch event handler (intercepts all requests from controlled tabs)
  ├── Cache API (disk-backed, named buckets)
  ├── Push event handler (receives server pushes via W3C Push API)
  ├── Sync event handler (Background Sync API)
  └── Message event handler (communication with pages)

Network  ← SW decides: cache hit → return cached, miss → fetch → optionally cache
```

### Data Flow & State Flow

**Fetch interception flow:**
```
Page fetch() → [SW fetch event] → [cache check] → [cache hit → return response]
                                               └── [cache miss → network fetch] 
                                                         → [optionally cache] 
                                                         → return response to page
```

**SW update cycle:**
```
Navigation → SW file re-fetched → byte diff? 
  No  → existing SW continues controlling
  Yes → new SW installs → waits for old SW's tabs to close
                        OR skipWaiting() force-activates
```

### Performance Implications

| Scenario | Without SW | With SW (Cache-First) |
|---|---|---|
| Second visit (shell) | Full network load ~400ms | Cache hit ~20ms |
| API call (stale-while-revalidate) | Network ~200ms | Cache ~10ms (update in bg) |
| Offline | Error page | Cached content served |
| LCP (repeat visit) | Network bound | Near-instant from cache |

### Scalability Considerations

- **< 10K users:** Workbox in GenerateSW mode — auto-generates cache strategies for build output. Low maintenance.
- **100K users:** Workbox in InjectManifest mode — custom SW with precache manifest injected. Full control over caching strategies per route. version stamping for cache busting.
- **10M+ users:** SW update performance is critical — cache warming strategies must not create 200MB caches. Granular versioning: shell-v2, api-v1 (prevents full cache eviction on minor deploys). background sync for analytics, not just offline data.

### Trade-offs

| Strategy | Fresh data | Offline support | Speed |
|---|---|---|---|
| Cache-First | ❌ Stale | ✅ Always works | ✅ Fastest |
| Network-First | ✅ Always fresh | ✅ Fallback | ❌ Network dependent |
| Stale-While-Revalidate | ✅ Eventually fresh | ✅ Stale content | ✅ Fast |
| Network-Only | ✅ Always fresh | ❌ No offline | ❌ Network dependent |

### ⚠️ Anti-Patterns & Pitfalls

- **Caching POST responses** — Cache API caches GET requests by URL. POST requests are not matched by URL since the body differs. Incorrectly caching a POST response can serve stale data leading to data corruption. Use Background Sync for offline POST operations instead.
- **Not versioning caches** — if you open `cache.open('my-cache')` without versioning, old stale responses from previous deploys persist. Always use version-stamped cache names: `'shell-v3'`, and delete old versions in the `activate` event.
- **Using `skipWaiting()` naively** — `skipWaiting()` forces the new SW to take control of pages that loaded with the old SW. If the old SW served a v1 app shell and the new SW starts serving v2 API responses, you have a version mismatch. Use `skipWaiting()` only if your app can handle the mixed state.
- **Blocking fetch events unnecessarily** — all `fetch` events fire through the SW including analytics, fonts, images. If your SW does expensive work on every fetch, it introduces latency. Keep fetch handlers fast — synchronous cache lookups first, async network second.
- **Not calling `event.waitUntil()` properly** — if you don't wrap async work in `event.waitUntil()`, the browser can terminate the SW mid-operation. Any async operation in `install`, `activate`, `push`, or `sync` handlers must be wrapped.
- **Push subscription without user consent** — push notification permission must be explicitly granted. Never auto-request push permission on page load. Request after a meaningful interaction (user clicks a "Subscribe" button). Browsers penalise sites that abuse push permissions.
- **Forgetting Secure Context requirement** — Service Workers ONLY work on HTTPS (or localhost). Attempting to register a SW on HTTP silently fails. On SAP internal apps behind HTTP proxies, this is a common gotcha.

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
SAP Fiori Launchpad is the shell that hosts multiple apps. A Service Worker caching the Launchpad shell (`/index.html`, core UI5 framework bundles, theme assets) means that on the second visit the shell renders in ~30ms instead of ~500ms — the LCP improvement is immediate and permanent for returning users. OData metadata (`$metadata` endpoints) can be cached with stale-while-revalidate — these rarely change and are critical for app startup. Background Sync covers offline-editing scenarios in field service apps where engineers submit maintenance records in poor connectivity areas.

**At FAANG scale:**
- **Microsoft Teams Web:** Service Worker pre-caches the Teams app shell and conversation history. Notification clicks arrive even when no browser tab is open. Background sync ensures messages sent offline are delivered when connectivity restores.
- **Adobe Express:** Service Worker caches the WebAssembly design engine and icon library. Second-visit load time is ~1.2s vs ~4.5s cold load. Stale-while-revalidate for template assets ensures freshness without blocking load.
- **Twitter (now X):** Their PWA Service Worker pre-caches timeline data for offline reading, serves notifications via push, and uses background sync for retrying failed tweets. Twitter's move to a PWA with SW caching reduced load times by 65% on 3G networks.

**How it evolves with scale:**
- Small scale (< 10K users): Workbox GenerateSW mode — zero-config, sensible defaults. Handles asset versioning automatically.
- Medium scale (100K users): InjectManifest mode for custom caching strategies. Route-level cache strategies. Periodic cache cleanup for storage quota management.
- Large scale (10M+ users): SW update deployment strategy is a DevOps concern — rolling out a broken SW can break offline experiences for millions of users simultaneously. Canary SW deployments, version-gated activation, and error telemetry from SW scope are production-critical.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Service Workers are a browser-managed proxy thread that intercepts every network request from pages within their scope. The lifecycle is: register → install (where you pre-cache the app shell) → wait for old SW tabs to close or call skipWaiting → activate (where you clean up old caches) → active (intercepting fetches). The three main caching strategies are: cache-first for static versioned assets — fastest, serves from cache with network fallback; network-first for API responses where freshness matters but offline is acceptable; and stale-while-revalidate for content where slightly stale is fine but you always want to respond instantly. Beyond caching, Service Workers power web push notifications and background sync. Push messages arrive even when no tab is open — the browser wakes the SW to show an OS notification. Background sync lets you queue failed network requests and retry when connectivity restores. At SAP, the obvious application is caching the Fiori Launchpad shell and OData metadata — the difference between a 500ms and 30ms repeat visit. Two things I always emphasise: SW only works on HTTPS, and not wrapping async work in event.waitUntil() causes the SW to be terminated mid-operation."

### Likely Follow-up Questions
1. **What happens if the Service Worker install fails?** → The SW is discarded completely — the previous SW (if any) continues controlling the page; the failed SW moves to `redundant` state
2. **How do you force update a Service Worker immediately?** → `self.skipWaiting()` in the SW + `clients.claim()` in the activate event; but warn about version mismatch risk
3. **How does Background Sync differ from a setInterval retry?** → Background Sync fires even when the page is closed or the browser is in background; setInterval requires the page to be open and in the foreground
4. **What is the difference between Cache API and HTTP cache?** → HTTP cache is managed by the browser based on Cache-Control headers; Cache API is programmatically controlled by your SW code — you decide what goes in and when it's invalidated
5. **How do you debug a Service Worker?** → Chrome DevTools → Application → Service Workers; `chrome://inspect/#service-workers`; DevTools Network tab shows service worker origin; use `console.log` in SW (visible in DevTools SW panel)

### vs Alternatives
| Service Worker caching | HTTP cache | CDN caching |
|---|---|---|
| Programmatic, arbitrary logic | Header-driven, automatic | Edge-distributed, server-config |
| Offline support | No offline | No offline |
| Requires HTTPS + SW | Any HTTP | Any HTTP |
| Client-side only | Client + intermediaries | Shared across all users |

### How to Signal Senior Thinking
> "The nuance interviewers miss is that Service Worker caching and HTTP caching are complementary, not competing. The HTTP cache handles intermediary caching between browser and server. The Cache API in a Service Worker handles client-side offline-first caching under programmatic control. In a production architecture, you want both: aggressive HTTP caching via CDN for shared static assets, SW caching for personalised app shell and offline-critical content. The versioning strategy is what separates production-grade SWs from hobby projects — cache names must be versioned, old caches cleaned in activate, and the deploy pipeline must account for SW update latency (existing users' SWs update only on navigation)."

---

## 💻 5. Code Example
> Production-grade Service Worker with versioned caches, app shell, and stale-while-revalidate API

```typescript
// sw.ts — Production Service Worker
// Demonstrates: versioned caches, multiple caching strategies, push, background sync
// What an interviewer looks for: lifecycle handling, cache versioning, waitUntil usage

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v3'; // Bump on each deploy
const STATIC_CACHE = `shell-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const STATIC_OFFLINE = '/offline.html';

const APP_SHELL = [
  '/',
  '/app.js',
  '/styles/main.css',
  '/fonts/SAPFont.woff2',
  STATIC_OFFLINE,
];

// ── INSTALL: pre-cache the app shell ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()) // activate new SW immediately
  );
});

// ── ACTIVATE: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key)) // delete stale versioned caches
        )
      )
      .then(() => self.clients.claim()) // take control of uncontrolled clients immediately
  );
});

// ── FETCH: routing strategies ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-same-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // App shell: cache-first
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API routes: stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // Everything else: network-first with offline fallback
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  return cached ?? fetch(request);
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) ?? (await caches.match(STATIC_OFFLINE))!;
  }
}

async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Revalidate in background regardless of whether we have a cached version
  const networkUpdate = fetch(request).then((fresh) => {
    cache.put(request, fresh.clone());
    return fresh;
  });

  return cached ?? await networkUpdate;
}

// ── PUSH: web push notifications ──────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() as {
    title: string;
    body: string;
    url: string;
    tag?: string;
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/app-icon.png',
      badge: '/icons/badge.png',
      tag: data.tag, // collapses duplicate notifications
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url === event.notification.data.url);
        return existing ? existing.focus() : self.clients.openWindow(event.notification.data.url);
      })
  );
});

// ── BACKGROUND SYNC ─────────────────────────────────────────────────────────
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-offline-submissions') {
    event.waitUntil(flushOfflineQueue());
  }
});

async function flushOfflineQueue(): Promise<void> {
  const db = await openOfflineDB();
  const pendingItems = await db.getAll('offline-queue');

  await Promise.all(
    pendingItems.map(async (item) => {
      const response = await fetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify(item),
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) await db.delete('offline-queue', item.id);
    })
  );
}

// Simplified IDB helper for demo
async function openOfflineDB(): Promise<{
  getAll(store: string): Promise<Array<{ id: string }>>;
  delete(store: string, id: string): Promise<void>;
}> {
  // In production: use idb library or full IndexedDB API
  throw new Error('Implement with idb library in production');
}
```

**Interview vs Production difference:**
In an interview, focus on the lifecycle (install/activate/fetch), `event.waitUntil()`, and the three caching strategies — those are the signal. In production: use Workbox InjectManifest for precache manifest injection (Workbox handles file versioning automatically), add SW health monitoring (track SW errors via Sentry's ServiceWorker integration), implement update notification UI to prompt users to reload when a new SW is waiting, and test all offline scenarios with Chrome DevTools offline mode.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** A Service Worker is a programmable caching proxy that lives in the browser — like nginx in user space, but for a single origin.

**If you go blank:** "Service Workers intercept all fetches from pages in their scope. They have a lifecycle: install (pre-cache) → activate (clean old caches) → active (intercept fetches). The three caching strategies are: cache-first (fastest), network-first (freshest), and stale-while-revalidate (balance)."

**Mnemonic:** **IAN = Install (cache shell), Activate (clean old), Network (intercept fetches)** — three phases, three key operations

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Service Workers enable repeat visits to load in ~30ms (from cache) vs 400ms (network) — the most impactful LCP improvement for returning users
→ Performance: Offline-first removes the "no connection" failure mode entirely — enterprise apps in field/mobile contexts **must** handle offline
→ Business: PWA with Service Worker = installation via "Add to Home Screen", push notifications, offline use — bridging native app capabilities without an app store

**How it works (3 sentences):**
A Service Worker registers as a browser-managed background thread scoped to an origin, with a lifecycle of install → waiting/activate → active, where each phase is controlled via `event.waitUntil()` to prevent premature browser termination. In the active state, it intercepts all fetch events from pages in its scope and can return responses from the Cache API, network, or a combination using strategies like cache-first, network-first, or stale-while-revalidate. Beyond fetch interception, Service Workers handle push notification delivery and background sync — capabilities that work even when all browser tabs for the origin are closed.

**Company relevance:**
- **Microsoft:** Teams Web, Outlook Web, and Bing are all PWAs using Service Workers — expect questions about update strategy (skipWaiting vs user-prompted reload), push notification implementation, and cache versioning
- **Adobe:** Express and Creative Cloud web apps use SW for offline thumbnail and template access — cache eviction policies and storage quota management are relevant
- **Salesforce:** Mobile CRM use case requires offline forms and Background Sync — Salesforce Field Service mobile web component offline capability is directly SW-powered
- **Cisco:** Network management consoles need to handle connectivity loss gracefully — SW offline support for dashboards serving device status data from cached telemetry

---
**✅ Topic 41/486 complete.**
**→ Continuing to Topic 42: Worklets — Audio, Paint, Layout Worklets**
