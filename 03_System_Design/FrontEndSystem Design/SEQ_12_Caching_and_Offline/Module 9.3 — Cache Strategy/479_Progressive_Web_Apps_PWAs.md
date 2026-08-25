# 479 — Progressive Web Apps (PWAs): Architecture, Manifest & Install

────────────────────────────────────────────────────────────────

## 1. High-Level Explanation

A **Progressive Web App (PWA)** is a web application that uses modern browser APIs and strategies to deliver a native-app-like experience on any device. Google defines three pillars that make a web app "progressive":

- **Reliable** — Loads instantly even on flaky networks (offline support via Service Workers)
- **Fast** — Responds quickly to user interactions with smooth animations and no janky scrolling
- **Engaging** — Feels like a natural app with immersive fullscreen experience, push notifications, and home-screen install

The **three technical requirements** for a PWA are:

1. **HTTPS** — Served over a secure origin (Service Workers require it)
2. **Service Worker** — A background script that intercepts network requests and manages caching
3. **Web App Manifest** — A JSON file that tells the browser how the app should behave when "installed"

When these three are present and the installability criteria are met, Chrome shows a "Add to Home Screen" prompt, and the app can run in a standalone window — indistinguishable from a native app.

────────────────────────────────────────────────────────────────

## 2. Deep-Dive Explanation (Senior/Staff Level)

### A. Web App Manifest Anatomy

The `manifest.json` (or `manifest.webmanifest`) is linked in your HTML `<head>`:

```html
<link rel="manifest" href="/manifest.json" />
```

**Complete manifest with all critical fields:**

```json
{
  "name": "Hruday Task Manager",
  "short_name": "TaskMgr",
  "description": "Enterprise task management with offline support",
  "start_url": "/app?source=pwa",
  "scope": "/app/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#1a73e8",
  "background_color": "#ffffff",
  "lang": "en-US",
  "dir": "ltr",
  "categories": ["productivity", "business"],
  "icons": [
    { "src": "/icons/icon-72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "/icons/icon-96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "/icons/icon-128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "shortcuts": [
    {
      "name": "New Task",
      "short_name": "New",
      "url": "/app/tasks/new",
      "icons": [{ "src": "/icons/new-task.png", "sizes": "96x96" }]
    },
    {
      "name": "Dashboard",
      "url": "/app/dashboard",
      "icons": [{ "src": "/icons/dashboard.png", "sizes": "96x96" }]
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop-home.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Home screen on desktop"
    },
    {
      "src": "/screenshots/mobile-tasks.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Task list on mobile"
    }
  ],
  "related_applications": [],
  "prefer_related_applications": false
}
```

**Display modes explained:**

| Mode          | URL Bar | System UI | Use Case                        |
|---------------|---------|-----------|----------------------------------|
| `fullscreen`  | Hidden  | Hidden    | Games, immersive media           |
| `standalone`  | Hidden  | Visible   | Most PWAs — looks like native    |
| `minimal-ui`  | Minimal | Visible   | Need back/reload but app-like    |
| `browser`     | Full    | Visible   | Standard browser tab (default)   |

You can use CSS `@media (display-mode: standalone)` to detect install state and adjust UI accordingly.

### B. Installability Criteria (Chrome)

For Chrome to trigger the `beforeinstallprompt` event:

1. The app is **not already installed**
2. Served over **HTTPS** (or localhost)
3. Has a **registered Service Worker** with a `fetch` event handler
4. Has a **Web App Manifest** with:
   - `name` or `short_name`
   - `icons` array with at least a 192×192 and a 512×512 icon
   - `start_url`
   - `display` set to `standalone`, `fullscreen`, or `minimal-ui`
5. Meets a **user engagement heuristic** (user has interacted with the domain)

**Capturing the install prompt programmatically:**

```typescript
// install-prompt.ts
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e: Event) => {
  // Prevent Chrome's default mini-infobar
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  showCustomInstallButton();
});

async function handleInstallClick(): Promise<void> {
  if (!deferredPrompt) return;

  deferredPrompt.prompt(); // Show the native install dialog
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === 'accepted') {
    analytics.track('pwa_installed');
  }
  deferredPrompt = null;
  hideCustomInstallButton();
}

// Detect if already running as installed PWA
window.addEventListener('appinstalled', () => {
  analytics.track('pwa_install_complete');
  deferredPrompt = null;
});

// Type declaration for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
```

### C. Service Worker Lifecycle

The Service Worker (SW) operates through a precise lifecycle:

```
┌──────────┐     ┌─────────┐     ┌──────────┐     ┌───────┐
│ Register │────▶│ Install │────▶│ Waiting  │────▶│Active │
└──────────┘     └─────────┘     └──────────┘     └───────┘
                    │                                  │
                    │ (on fail)                         │ (fetch, push,
                    ▼                                  │  sync, message)
                 ┌──────┐                              ▼
                 │Error │                          ┌────────────┐
                 └──────┘                          │ Redundant  │
                                                   └────────────┘
```

**Phase-by-phase:**

1. **Register** — Main thread calls `navigator.serviceWorker.register('/sw.js')`. Browser downloads, parses, and begins install.
2. **Install** — Fires `install` event. This is where you **pre-cache** your app shell. Call `event.waitUntil()` to extend the install phase.
3. **Waiting** — New SW waits until all tabs controlled by the old SW are closed. Use `self.skipWaiting()` to bypass (with caution).
4. **Activate** — Fires `activate` event. This is where you **clean up old caches**. Call `clients.claim()` to take control of open pages immediately.
5. **Fetch** — SW intercepts every network request from controlled pages. This is where caching strategies live.
6. **Redundant** — SW is replaced by a newer version or failed to install.

**Complete Service Worker with lifecycle handling:**

```typescript
// sw.ts (compiled to sw.js)
const CACHE_NAME = 'app-shell-v3';
const RUNTIME_CACHE = 'runtime-v1';

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/offline.html',
  '/icons/icon-192.png',
];

// ─── INSTALL: Pre-cache app shell ───
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(APP_SHELL_ASSETS);
    })
  );
  // Force waiting SW to become active
  self.skipWaiting();
});

// ─── ACTIVATE: Clean up old caches ───
self.addEventListener('activate', (event: ExtendableEvent) => {
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];

  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !cacheWhitelist.includes(name))
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      )
    )
  );
  // Claim all open clients immediately
  self.clients.claim();
});

// ─── FETCH: Intercept requests ───
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // App shell → Cache First
  if (APP_SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API calls → Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets → Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});
```

### D. Five Caching Strategies — With Code

**1. Cache First (Cache Falling Back to Network)**

Best for: versioned static assets (CSS, JS, images with hashes)

```typescript
async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    return caches.match('/offline.html') as Promise<Response>;
  }
}
```

**2. Network First (Network Falling Back to Cache)**

Best for: API responses, frequently updated content

```typescript
async function networkFirst(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(
      JSON.stringify({ error: 'offline', cached: false }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**3. Stale-While-Revalidate**

Best for: resources where freshness matters but speed is critical (avatars, non-critical data)

```typescript
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  // Fire-and-forget: update cache in background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    })
    .catch(() => cached); // Silently fail if offline

  // Return cached immediately if available, else wait for network
  return cached || (await fetchPromise)!;
}
```

**4. Network Only**

Best for: non-GET requests, real-time data that must be fresh

```typescript
async function networkOnly(request: Request): Promise<Response> {
  return fetch(request);
}
```

**5. Cache Only**

Best for: pre-cached assets that never change in a given SW version

```typescript
async function cacheOnly(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  return cached || new Response('Not found in cache', { status: 404 });
}
```

### E. Workbox — Production-Grade Service Worker Toolkit

**Workbox** (by Google) abstracts away boilerplate and provides battle-tested caching strategies.

```typescript
// sw.ts using Workbox
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Clean up old precaches
cleanupOutdatedCaches();

// Precache app shell (injected at build time by workbox-webpack-plugin)
precacheAndRoute(self.__WB_MANIFEST);

// ─── Static assets: Cache First with expiration ───
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// ─── API calls: Network First with timeout ───
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// ─── Pages: Stale-While-Revalidate ───
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'pages',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ─── Fonts: Cache First, long TTL ───
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);
```

### F. Offline Fallback Page

```html
<!-- offline.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offline — Hruday Task Manager</title>
  <style>
    body {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f5; color: #333;
    }
    .container { text-align: center; padding: 2rem; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    button {
      margin-top: 1rem; padding: 0.75rem 1.5rem;
      background: #1a73e8; color: white; border: none;
      border-radius: 4px; cursor: pointer; font-size: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>Check your internet connection and try again.</p>
    <button onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>
```

**Routing navigation failures to the offline page:**

```typescript
import { setCatchHandler } from 'workbox-routing';

// Global catch handler — serves offline page for navigation failures
setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    return caches.match('/offline.html') as Promise<Response>;
  }
  return Response.error();
});
```

### G. Background Sync

Background Sync replays failed requests when connectivity is restored:

```typescript
// In sw.ts
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { NetworkOnly } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';

const bgSyncPlugin = new BackgroundSyncPlugin('taskQueue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 Hours (in minutes)
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log(`[BG Sync] Replayed: ${entry.request.url}`);
      } catch (error) {
        console.error(`[BG Sync] Failed: ${entry.request.url}`);
        await queue.unshiftRequest(entry);
        throw error; // Retry on next sync event
      }
    }
  },
});

// Any failed POST to /api/ gets queued
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'POST'
);
```

### H. Push Notifications

```typescript
// push-subscription.ts — Client side
async function subscribeToPush(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Send subscription to your backend
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  return subscription;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}
```

```typescript
// In sw.ts — Handle push event
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() ?? {};

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'New Update', {
      body: data.body ?? 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag ?? 'default',
      data: { url: data.url ?? '/' },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window or open new
      for (const client of clients) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(event.notification.data.url);
    })
  );
});
```

### I. App Shell Architecture

The **App Shell** pattern separates the minimal HTML/CSS/JS needed to render the UI "chrome" (header, nav, sidebar) from the dynamic content:

```
┌─────────────────────────────────────────┐
│           APP SHELL (cached)            │
│  ┌─────────────────────────────────┐    │
│  │         Header / Nav Bar        │    │
│  ├─────────────────────────────────┤    │
│  │                                 │    │
│  │    DYNAMIC CONTENT (network)    │    │
│  │    - API data                   │    │
│  │    - User-generated content     │    │
│  │                                 │    │
│  ├─────────────────────────────────┤    │
│  │         Footer / Tab Bar        │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Benefits:**
- Instant paint on repeat visits (shell from cache, content from network)
- Reliable offline experience (shell always loads)
- Clear separation of static structure vs dynamic data

### J. Next.js PWA Setup with `next-pwa`

```typescript
// next.config.ts
import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/api\.example\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-responses',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
  fallbacks: {
    document: '/offline',
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
```

```typescript
// app/layout.tsx — Metadata for PWA
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#1a73e8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Hruday Task Manager',
  description: 'Enterprise task management PWA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TaskMgr',
  },
  formatDetection: {
    telephone: false,
  },
};
```

### K. PWA vs Native App Comparison

| Aspect                 | PWA                                  | Native App                         |
|------------------------|--------------------------------------|------------------------------------|
| **Distribution**       | URL — no app store needed            | App Store / Play Store             |
| **Install Size**       | KBs to low MBs                       | Tens to hundreds of MBs            |
| **Update**             | Instant via SW update                | Store review + user update cycle   |
| **Discoverability**    | SEO-friendly, linkable               | Store search only                  |
| **Offline**            | Service Worker caching               | Full native storage                |
| **Device APIs**        | Growing (camera, geo, BT, NFC)       | Full access                        |
| **Push Notifications** | Yes (except iOS < 16.4)              | Yes — full support                 |
| **Performance**        | Near-native with proper optimization | Maximum performance                |
| **Development Cost**   | Single codebase for all platforms    | Separate iOS/Android codebases     |
| **App Store Revenue**  | No 30% commission                    | 15-30% commission                  |

### L. Lighthouse PWA Audit Criteria

Lighthouse audits these specific items:

| Audit                                         | Requirement                                        |
|-----------------------------------------------|----------------------------------------------------|
| Registers a Service Worker                    | SW controls the page                               |
| Responds with 200 when offline                | Offline fallback page loads                        |
| Has a `<meta name="viewport">` tag            | Responsive viewport configured                     |
| Redirects HTTP to HTTPS                       | All traffic over TLS                               |
| Configured for a custom splash screen          | manifest `name`, `background_color`, `icons`       |
| Sets theme color for address bar               | `theme_color` in manifest + `<meta>` tag           |
| Content is sized correctly for viewport        | No horizontal scroll at default viewport           |
| Has a valid `manifest.json`                    | Parseable with required fields                     |
| Uses HTTPS                                     | Secure origin                                      |
| Provides installable experience                | Meets installability criteria                      |
| Each page has a URL                            | SPA pages are individually addressable             |

────────────────────────────────────────────────────────────────

## 3. Clear Real-World Examples

### Twitter Lite PWA

- **65% increase** in pages per session
- **75% increase** in tweets sent
- **20% decrease** in bounce rate
- App loads in **under 5 seconds** on 3G
- Total size: **~600KB** (vs 23.5MB native app)
- Strategy: App shell cached with SW, timeline data via Network First

### Starbucks

- PWA is **99.84% smaller** than their iOS app
- Works offline so users can browse the menu and customize orders
- Strategy: Pre-cache all menu items + images, queue orders for background sync

### Pinterest

- **60% increase** in engagement after switching from mobile site to PWA
- **44% increase** in ad revenue
- **40% reduction** in load times
- Leveraged aggressive image caching (CacheFirst for pins)

### Hruday @ SAP Labs — Enterprise Dashboard

When we rebuilt our internal dashboard as a PWA (as part of the Lighthouse 60→95 initiative), we:
- Pre-cached the app shell (header, sidebar, base styles): **~120KB**
- Used Network First for live metrics APIs with a 3-second timeout fallback to cache
- Implemented Background Sync for report exports — users could trigger exports offline and they'd complete once back online
- Added shortcuts in manifest for "New Report" and "Dashboard" — boosted mobile engagement by ~30%

────────────────────────────────────────────────────────────────

## 4. Interview-Oriented Explanation

> "Progressive Web Apps combine three capabilities to deliver native-like experiences: HTTPS for security, a Service Worker for offline caching and background processing, and a Web App Manifest for installability and branding.
>
> At SAP Labs, when we took our enterprise dashboard from a Lighthouse score of 60 to 95, PWA principles were central to the effort. We implemented an app shell architecture — pre-caching the navigation chrome, header, and critical CSS in the install event so the UI painted instantly on repeat visits. For live metrics, we used a Network First strategy with a 3-second timeout — if the API didn't respond in time, we served the last cached response, which was perfectly acceptable for trend charts that update every 15 minutes.
>
> What made the biggest impact was Background Sync for report exports. Our users are often on spotty corporate Wi-Fi in manufacturing sites. Before, a network drop mid-export meant starting over. With Background Sync through Workbox, we queue the export request in IndexedDB and replay it when connectivity returns. The user sees a 'will complete when online' toast and moves on. This alone reduced support tickets for failed exports by 60%.
>
> For installability, we carefully crafted the manifest with proper icons including maskable variants, app shortcuts for common actions, and screenshots for the richer install dialog Chrome now supports. We gate the install prompt behind a 'significant engagement' check — if the user has visited 3+ times and spent over 2 minutes, we show a contextual banner. This gave us a 25% install acceptance rate versus the abysmal ~3% of the default Chrome prompt.
>
> The anti-patterns I watch for: caching everything indiscriminately which bloats storage, not versioning your cache names which leads to stale content forever, and the big one — no update strategy. We use Workbox's `skipWaiting` plus a UI banner that says 'New version available — click to refresh' so users always get the latest code without a hard reload."

────────────────────────────────────────────────────────────────

## 5. Code Examples

See Section 2 for complete code covering:

- **Section A**: Full `manifest.json` with icons, shortcuts, screenshots
- **Section B**: `beforeinstallprompt` handling with TypeScript types
- **Section C**: Complete Service Worker with lifecycle events
- **Section D**: All 5 caching strategies with TypeScript implementations
- **Section E**: Workbox configuration with multiple route strategies
- **Section F**: Offline fallback page + Workbox catch handler
- **Section G**: Background Sync with Workbox plugin
- **Section H**: Push notification subscription + SW handlers
- **Section J**: Next.js PWA setup with `next-pwa`

**Service Worker registration (main thread):**

```typescript
// register-sw.ts
async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New SW installed while old one still active → show update banner
          showUpdateBanner(() => {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          });
        }
      });
    });

    // Reload when new SW takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    console.log('SW registered with scope:', registration.scope);
  } catch (error) {
    console.error('SW registration failed:', error);
  }
}

// In sw.js — respond to SKIP_WAITING message
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

────────────────────────────────────────────────────────────────

## 6. Why & How Summary

### Why PWAs Matter for Senior Engineers

1. **Cost efficiency** — Single codebase serves web + mobile install with no app store gatekeeping or 30% commission
2. **Performance** — App shell + caching strategies deliver sub-second repeat loads; critical for markets with poor connectivity
3. **Resilience** — Offline support + background sync means users never lose work; enterprise apps on flaky corporate networks benefit massively
4. **SEO + Reach** — Unlike native apps, PWAs are indexable and shareable via URL; no install friction
5. **Update control** — Deploy once, all users get updates immediately; no waiting for app store review or user update cycles

### How to Implement (Decision Framework)

```
Is it served over HTTPS?
  └─ No → Fix this first. No PWA without TLS.
  └─ Yes
      │
      ├─ Add manifest.json with name, icons (192+512), start_url, display: standalone
      ├─ Register a Service Worker
      │     │
      │     ├─ Static assets (CSS/JS/images with hashes) → Cache First
      │     ├─ API responses that change often → Network First
      │     ├─ Semi-dynamic resources (avatars, feeds) → Stale-While-Revalidate
      │     ├─ Always-fresh data (auth, payments) → Network Only
      │     └─ Versioned precached assets → Cache Only
      │
      ├─ Implement offline fallback page
      ├─ Add update notification flow (updatefound → banner → skipWaiting → reload)
      └─ Use Workbox in production (don't hand-roll SW caching)
```

### Anti-Patterns to Avoid

| Anti-Pattern                     | Why It's Harmful                                     | Fix                                                  |
|----------------------------------|------------------------------------------------------|------------------------------------------------------|
| Caching everything               | Fills user storage, stale data persists              | Cache selectively with expiration policies           |
| No offline fallback              | Blank page when offline = broken experience          | Always precache an offline.html                      |
| Huge SW bundle                   | SW download blocks install event                     | Keep SW lean; use Workbox's tree-shaking             |
| No update strategy               | Users stuck on old code forever                      | `updatefound` listener + UI banner + `skipWaiting`   |
| `skipWaiting()` without UX       | Page may be in inconsistent state mid-session        | Use postMessage + controllerchange + reload          |
| Not versioning cache names       | Old caches never get cleaned up                      | Append version hash; clean in `activate` event       |
| Ignoring iOS Safari limitations  | No background sync, limited cache size               | Test on real iOS devices; provide graceful fallbacks  |
| Precaching too much at install   | Slow initial SW install, wasted bandwidth            | Precache only the critical app shell; lazy-cache rest |

────────────────────────────────────────────────────────────────
