# 72. Service Workers

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Service Workers** are programmable network proxies that run in the background, independent of web pages, enabling developers to intercept and control network requests, cache resources programmatically, and deliver offline-first experiences. They are the foundation of Progressive Web Apps (PWAs) and transform web applications into resilient, installable, native-like experiences.

### What it is:
A JavaScript file that:
- **Runs on a separate thread** (not blocking UI)
- **Acts as a network proxy** between app and server
- **Intercepts fetch requests** (can modify, cache, or block)
- **Manages Cache Storage API** (programmatic caching)
- **Persists across page loads** (background lifecycle)
- **Scope-based** (controls URLs within registration scope)
- **HTTPS-only** (security requirement, except localhost)

**Key characteristics:**
```javascript
// Service Worker registration
navigator.serviceWorker.register('/sw.js', {
  scope: '/' // Controls all URLs under this path
}).then(registration => {
  console.log('SW registered:', registration.scope);
});

// Service Worker lifecycle states:
// installing → installed → activating → activated → redundant
```

### Why it exists:
**Problems it solves:**
1. **Network dependency**: Traditional apps fail without network
2. **Slow connections**: Every request hits network (no offline cache control)
3. **HTTP caching limitations**: Browser cache is opaque (no programmatic access)
4. **Background sync**: No way to retry failed requests in background
5. **Push notifications**: Web couldn't receive push like native apps

**Solutions Service Workers enable:**
- **Offline-first**: Work without network (cache-first strategies)
- **Instant loading**: Serve from cache immediately (< 50ms)
- **Background sync**: Queue actions, retry when online
- **Push notifications**: Re-engage users like native apps
- **Performance**: Control caching with precision (faster than browser cache)

**Real-world impact:**
```
Twitter Lite (Service Worker implementation):
- First load: 600KB download, 5s load time
- Repeat visits: Offline-capable, 1s load time
- Data savings: 70% less data usage
- Engagement: 65% increase in pages per session
- Offline sessions: 30% of sessions start offline

Result: +75% tweets sent, +20% bounce rate reduction
```

### When and where it's used:
**Essential for:**
- **Progressive Web Apps (PWAs)**: Installable, offline-capable apps
- **E-commerce**: Offline browsing, background order sync
- **Content platforms**: Offline reading, background article prefetch
- **Social media**: Offline timeline, background post retry
- **SaaS dashboards**: Offline editing, background data sync
- **Mobile-first apps**: Data savings, resilient connections

**Not needed for:**
- Simple marketing sites (HTTP cache sufficient)
- Admin panels with always-online assumption
- Prototypes/MVPs (complexity overhead)

### Role in large-scale applications:
In production systems:
- **Versioned deployment**: Update SW atomically with app versions
- **Gradual rollout**: Feature flag SW features for controlled testing
- **Monitoring**: Track SW install rate, cache hit ratio, sync queue depth
- **Fallback strategy**: Graceful degradation if SW fails to install
- **Cost optimization**: Reduce CDN bandwidth (70%+ via SW cache)

**Architecture pattern:**
```
User Request Flow (with Service Worker):

┌─────────────┐
│   Browser   │
│   (User)    │
└──────┬──────┘
       │ fetch('/api/data')
       ▼
┌─────────────────────┐
│  Service Worker     │ ← Intercepts ALL requests
│  (Network Proxy)    │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │ Decision  │
    └───────────┘
    /     |     \
Cache   Network  Custom
 Hit     Fetch   Logic
   │       │       │
   ▼       ▼       ▼
Return  Return  Generate
cached  fresh   response
```

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Service Worker Lifecycle

**Complete lifecycle with state transitions:**

```javascript
// sw.js - Service Worker lifecycle events

// STATE 1: INSTALLING
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...', event);
  
  // Wait until cache is populated
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/',
        '/styles.css',
        '/script.js',
        '/offline.html'
      ]);
    })
  );
  
  // Skip waiting to activate immediately
  // (otherwise waits for all tabs to close)
  self.skipWaiting();
});

// STATE 2: INSTALLED (waiting)
// SW installed but not yet controlling pages
// Waits for old SW to stop controlling clients

// STATE 3: ACTIVATING
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...', event);
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== 'v1')
          .map(key => caches.delete(key))
      );
    })
  );
  
  // Take control of all clients immediately
  // (otherwise waits for page reload)
  return self.clients.claim();
});

// STATE 4: ACTIVATED (controlling)
// SW now controls pages and intercepts fetch

self.addEventListener('fetch', (event) => {
  console.log('[SW] Fetching:', event.request.url);
  // Handle requests
});

// STATE 5: REDUNDANT (replaced or failed)
// Old SW replaced by new version, or install failed
```

**Lifecycle state diagram:**
```
Registration
     │
     ▼
┌─────────────┐
│ INSTALLING  │ ← install event fired
└──────┬──────┘   - Download SW script
       │          - Execute install event
       │          - Cache critical assets
       ▼
   Success?
    /    \
  NO      YES
   │       │
   ▼       ▼
REDUNDANT  INSTALLED (waiting)
(failed)   └──────┬──────┘
                  │ Wait for old SW to release
                  │ OR skipWaiting() called
                  ▼
           ┌─────────────┐
           │ ACTIVATING  │ ← activate event fired
           └──────┬──────┘   - Clean old caches
                  │          - Take control of pages
                  ▼
           ┌─────────────┐
           │ ACTIVATED   │ ← fetch events now handled
           │(controlling)│
           └──────┬──────┘
                  │ New version registered
                  ▼
           REDUNDANT (replaced)
```

### Thread Model and Execution Context

**Service Worker runs on separate thread:**

```javascript
// Main thread (page context)
console.log('Main thread:', self); // Window object
console.log('DOM:', document); // Available
console.log('localStorage:', localStorage); // Available

// Service Worker thread (worker context)
console.log('SW thread:', self); // ServiceWorkerGlobalScope
console.log('DOM:', typeof document); // undefined
console.log('localStorage:', typeof localStorage); // undefined

// Service Worker constraints:
// - No DOM access
// - No localStorage/sessionStorage
// - No synchronous APIs (XHR, localStorage)
// - Must use async APIs (fetch, Cache API, IndexedDB)
// - Shared across all pages in scope
// - Terminated when idle (can't maintain state in memory)
```

**Communication between page and Service Worker:**

```javascript
// Page → Service Worker
navigator.serviceWorker.controller.postMessage({
  type: 'CACHE_URLS',
  urls: ['/page1', '/page2', '/page3']
});

// Service Worker receives message
self.addEventListener('message', (event) => {
  console.log('[SW] Message:', event.data);
  
  if (event.data.type === 'CACHE_URLS') {
    caches.open('v1').then(cache => {
      return cache.addAll(event.data.urls);
    });
  }
  
  // Reply back
  event.source.postMessage({
    type: 'CACHE_COMPLETE',
    count: event.data.urls.length
  });
});

// Page receives reply
navigator.serviceWorker.addEventListener('message', (event) => {
  console.log('[Page] SW replied:', event.data);
});
```

### Cache Strategies (Deep Dive)

**Strategy 1: Cache First (Performance Priority)**

```javascript
// Best for: Static assets (JS, CSS, images)
// Trade-off: Fastest, but may serve stale content

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        console.log('[SW] Cache hit:', event.request.url);
        return cached;
      }
      
      console.log('[SW] Cache miss, fetching:', event.request.url);
      return fetch(event.request).then(response => {
        // Cache for next time
        if (response.ok) {
          const cloned = response.clone();
          caches.open('v1').then(cache => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      });
    })
  );
});

// Performance:
// - Cache hit: 10-30ms (CacheStorage read from disk)
// - Cache miss: 200-500ms (network + cache write)
// - Benefit: 10-50x faster for cached resources

// Problem: User may see stale content indefinitely
```

**Strategy 2: Network First (Freshness Priority)**

```javascript
// Best for: API calls, user data, frequently changing content
// Trade-off: Always fresh, but slower + requires network

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful response
        if (response.ok) {
          const cloned = response.clone();
          caches.open('v1').then(cache => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(error => {
        // Network failed, fallback to cache
        console.log('[SW] Network failed, trying cache');
        return caches.match(event.request).then(cached => {
          if (cached) {
            return cached;
          }
          // No cache, return offline page
          return caches.match('/offline.html');
        });
      })
  );
});

// Performance:
// - Network success: 200-500ms (normal fetch time)
// - Network fail: 10-30ms (cache fallback)
// - Benefit: Always fresh when online, resilient offline
```

**Strategy 3: Stale-While-Revalidate (Best of Both)**

```javascript
// Best for: Content that should be fast but eventually fresh
// Trade-off: Balanced - fast + fresh

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      // Start fetch immediately (don't await)
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open('v1').then(cache => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      });
      
      // Return cache immediately if available
      // Otherwise wait for network
      return cached || fetchPromise;
    })
  );
});

// Performance:
// - First load: 200-500ms (no cache, wait for network)
// - Cached load: 10-30ms (serve stale immediately)
// - Background update: 200-500ms (happens async)
// - Benefit: Fast + eventually fresh
// - Next page load sees updated content

// User experience:
// Visit 1: Sees fresh content (200ms load)
// Visit 2: Sees cached content (20ms load, stale but instant)
//          Background fetch updates cache
// Visit 3: Sees fresh content (20ms load, updated by visit 2)
```

**Strategy 4: Network Only (Bypass SW)**

```javascript
// Best for: Critical user actions that must succeed
// Example: Payment, logout, user data mutation

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Never cache these
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/payment') ||
    url.pathname.startsWith('/api/logout')
  ) {
    // Pass through to network directly
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Apply caching strategy for other requests
  // ...
});
```

**Strategy 5: Cache Only (Offline-First App)**

```javascript
// Best for: Fully offline apps, no network dependency
// Example: Offline-first note-taking app

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      
      // Not in cache, return offline page
      return caches.match('/offline.html');
    })
  );
});

// All content pre-cached during install
// App works 100% offline
```

### Cache Storage API (Programmatic Caching)

**CacheStorage vs Browser HTTP Cache:**

```javascript
// CacheStorage (Service Worker)
// - Programmatic control (you decide what to cache)
// - Persistent (not subject to browser eviction like HTTP cache)
// - Quota-based (~1GB typical, varies by browser)
// - Key-value store: Request → Response
// - Async API (Promises)

// Browser HTTP Cache
// - Automatic (browser decides based on headers)
// - Subject to eviction (LRU, memory pressure)
// - Opaque (no programmatic access)
// - 300MB-1GB typical

// CacheStorage operations:
// 1. Open/create cache
const cache = await caches.open('v1');

// 2. Add URLs to cache (makes request + caches response)
await cache.addAll([
  '/',
  '/styles.css',
  '/script.js'
]);

// 3. Put specific request/response
await cache.put(request, response);

// 4. Match request (returns Response or undefined)
const cached = await cache.match(request);

// 5. Delete from cache
await cache.delete(request);

// 6. List all entries
const requests = await cache.keys();

// 7. Delete entire cache
await caches.delete('v1');

// 8. List all caches
const names = await caches.keys();
```

**Advanced cache management:**

```javascript
// sw.js
class CacheManager {
  constructor(cacheName, maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    this.cacheName = cacheName;
    this.maxAge = maxAge;
  }
  
  async get(request) {
    const cache = await caches.open(this.cacheName);
    const cached = await cache.match(request);
    
    if (!cached) {
      return null;
    }
    
    // Check age
    const cachedTime = new Date(cached.headers.get('sw-cached-time'));
    const age = Date.now() - cachedTime.getTime();
    
    if (age > this.maxAge) {
      console.log('[CacheManager] Expired:', request.url);
      await cache.delete(request);
      return null;
    }
    
    return cached;
  }
  
  async put(request, response) {
    const cache = await caches.open(this.cacheName);
    
    // Clone and add timestamp header
    const cloned = response.clone();
    const headers = new Headers(cloned.headers);
    headers.append('sw-cached-time', new Date().toISOString());
    
    const modified = new Response(cloned.body, {
      status: cloned.status,
      statusText: cloned.statusText,
      headers: headers
    });
    
    await cache.put(request, modified);
  }
  
  async clean() {
    const cache = await caches.open(this.cacheName);
    const requests = await cache.keys();
    
    let cleaned = 0;
    for (const request of requests) {
      const cached = await cache.match(request);
      const cachedTime = new Date(cached.headers.get('sw-cached-time'));
      const age = Date.now() - cachedTime.getTime();
      
      if (age > this.maxAge) {
        await cache.delete(request);
        cleaned++;
      }
    }
    
    console.log(`[CacheManager] Cleaned ${cleaned} expired entries`);
    return cleaned;
  }
}

// Usage in Service Worker
const cacheManager = new CacheManager('v1');

self.addEventListener('fetch', (event) => {
  event.respondWith(
    cacheManager.get(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      
      return fetch(event.request).then(response => {
        if (response.ok) {
          cacheManager.put(event.request, response.clone());
        }
        return response;
      });
    })
  );
});

// Clean expired entries daily
self.addEventListener('activate', (event) => {
  event.waitUntil(cacheManager.clean());
});
```

### Background Sync

**Queue failed requests for retry when online:**

```javascript
// sw.js - Register background sync
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        // Network failed, queue for background sync
        const data = await event.request.clone().text();
        
        // Store in IndexedDB
        const db = await openDB();
        await db.add('sync-queue', {
          url: event.request.url,
          method: event.request.method,
          headers: [...event.request.headers],
          body: data,
          timestamp: Date.now()
        });
        
        // Register sync
        await self.registration.sync.register('sync-posts');
        
        // Return optimistic response
        return new Response(JSON.stringify({ 
          status: 'queued',
          message: 'Request queued for sync'
        }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

async function syncPosts() {
  const db = await openDB();
  const queue = await db.getAll('sync-queue');
  
  console.log(`[SW] Syncing ${queue.length} queued requests`);
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });
      
      if (response.ok) {
        // Success, remove from queue
        await db.delete('sync-queue', item.id);
        console.log('[SW] Synced:', item.url);
        
        // Notify page of success
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            url: item.url
          });
        });
      }
    } catch (error) {
      console.error('[SW] Sync failed:', item.url, error);
      // Keep in queue for next sync attempt
    }
  }
}
```

### Push Notifications

**Receive and display push notifications:**

```javascript
// sw.js - Handle push events
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/badge.png',
    data: {
      url: data.url,
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open') {
    const url = event.notification.data.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // If already open, focus that tab
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});
```

### Common Pitfalls and Solutions

**Pitfall 1: SW caching old version forever**

```javascript
// Problem: SW caches itself, never updates
// Solution: Version your SW and force update check

// sw.js
const VERSION = 'v2'; // Increment on changes
const CACHE_NAME = `app-${VERSION}`;

self.addEventListener('install', (event) => {
  // Force activation of new SW
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([/* ... */]);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Delete old caches
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  
  // Take control immediately
  return self.clients.claim();
});

// Page: Check for updates periodically
setInterval(() => {
  navigator.serviceWorker.getRegistration().then(reg => {
    reg.update(); // Check for new SW version
  });
}, 60 * 60 * 1000); // Every hour
```

**Pitfall 2: Caching opaque responses (CORS)**

```javascript
// Problem: CORS responses cached with opaque type (type: 'opaque')
// Can't read status, size ~7MB even for small responses

// Bad:
fetch('https://other-origin.com/api', { mode: 'no-cors' })
  // Returns opaque response, wastes cache space

// Good: Enable CORS on server
fetch('https://other-origin.com/api', { mode: 'cors' })
  // Returns transparent response if CORS headers present

// Or: Don't cache opaque responses
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.type === 'opaque') {
        console.log('[SW] Skipping opaque response cache');
        return response;
      }
      
      // Cache only transparent responses
      const cloned = response.clone();
      caches.open('v1').then(cache => {
        cache.put(event.request, cloned);
      });
      
      return response;
    })
  );
});
```

**Pitfall 3: Race conditions during SW updates**

```javascript
// Problem: User loads page with old SW, new SW activates mid-session
// Solution: Notify user and prompt reload

// sw.js
self.addEventListener('controllerchange', () => {
  // New SW took over
  console.log('[SW] New service worker activated');
  
  // Notify all clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_UPDATED' });
    });
  });
});

// Page
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'SW_UPDATED') {
    // Show notification
    if (confirm('New version available! Reload to update?')) {
      window.location.reload();
    }
  }
});

// Alternative: Auto-reload when idle
let idleTime = 0;
document.addEventListener('mousemove', () => { idleTime = 0; });
setInterval(() => {
  idleTime++;
  if (idleTime > 60) { // 60 seconds idle
    window.location.reload();
  }
}, 1000);
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: Production-Ready PWA Service Worker

```javascript
// sw.js - Full-featured production Service Worker

const VERSION = 'v1.0.5';
const CACHE_NAME = `pwa-${VERSION}`;

// Define cache strategies per resource type
const CACHE_STRATEGIES = {
  // Static assets: Cache first (immutable)
  cacheFirst: [
    /\.(js|css|woff2|woff|ttf)$/,
    /\/static\//,
  ],
  
  // API calls: Network first (fresh data)
  networkFirst: [
    /\/api\//,
  ],
  
  // Images: Stale while revalidate (fast + eventual fresh)
  staleWhileRevalidate: [
    /\.(jpg|jpeg|png|gif|svg|webp)$/,
  ],
  
  // Never cache
  networkOnly: [
    /\/api\/auth/,
    /\/api\/payment/,
  ],
};

// Critical assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/static/main.css',
  '/static/main.js',
  '/static/vendor.js',
  '/icon-192.png',
  '/icon-512.png',
];

// === INSTALL EVENT ===
self.addEventListener('install', (event) => {
  console.log(`[SW ${VERSION}] Installing...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(error => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// === ACTIVATE EVENT ===
self.addEventListener('activate', (event) => {
  console.log(`[SW ${VERSION}] Activating...`);
  
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then(keys => {
        return Promise.all(
          keys
            .filter(key => key.startsWith('pwa-') && key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        );
      }),
      
      // Take control immediately
      self.clients.claim()
    ])
    .then(() => {
      console.log('[SW] Activated');
      
      // Notify all clients of update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: VERSION
          });
        });
      });
    })
  );
});

// === FETCH EVENT ===
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Determine strategy
  const strategy = determineStrategy(url.pathname);
  
  // Apply strategy
  switch (strategy) {
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    
    case 'networkFirst':
      event.respondWith(networkFirst(request));
      break;
    
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    
    case 'networkOnly':
      event.respondWith(fetch(request));
      break;
    
    default:
      event.respondWith(networkFirst(request));
  }
});

// === STRATEGY FUNCTIONS ===

function determineStrategy(pathname) {
  for (const [strategy, patterns] of Object.entries(CACHE_STRATEGIES)) {
    if (patterns.some(pattern => pattern.test(pathname))) {
      return strategy;
    }
  }
  return 'networkFirst'; // Default
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }
  
  console.log('[SW] Cache miss, fetching:', request.url);
  try {
    const response = await fetch(request);
    
    if (response.ok && response.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', request.url, error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok && response.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page for navigation
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  // Fetch in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok && response.type !== 'opaque') {
      const cache = caches.open(CACHE_NAME);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => cached);
  
  // Return cached immediately, or wait for network
  return cached || fetchPromise;
}

// === MESSAGE HANDLING ===
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLAIM_CLIENTS') {
    self.clients.claim();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    caches.open(CACHE_NAME).then(cache => {
      cache.addAll(event.data.urls);
    });
  }
});
```

### Example 2: Service Worker Registration and Updates

```javascript
// serviceWorkerManager.js - Client-side SW registration

class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
  }
  
  async register() {
    if (!('serviceWorker' in navigator)) {
      console.log('[SW Manager] Service Workers not supported');
      return null;
    }
    
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });
      
      console.log('[SW Manager] Registered:', this.registration.scope);
      
      // Set up update detection
      this.setupUpdateDetection();
      
      // Check for updates every hour
      setInterval(() => {
        this.checkForUpdates();
      }, 60 * 60 * 1000);
      
      return this.registration;
    } catch (error) {
      console.error('[SW Manager] Registration failed:', error);
      return null;
    }
  }
  
  setupUpdateDetection() {
    // Detect when new SW is waiting
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW installed and waiting
          console.log('[SW Manager] Update available');
          this.updateAvailable = true;
          this.notifyUpdateAvailable();
        }
      });
    });
    
    // Detect controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Manager] New SW activated');
      this.handleControllerChange();
    });
    
    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });
  }
  
  async checkForUpdates() {
    if (!this.registration) return;
    
    console.log('[SW Manager] Checking for updates...');
    await this.registration.update();
  }
  
  notifyUpdateAvailable() {
    // Show update notification
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <p>A new version is available!</p>
        <button id="update-btn">Update Now</button>
        <button id="dismiss-btn">Later</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Handle update click
    document.getElementById('update-btn').addEventListener('click', () => {
      this.applyUpdate();
    });
    
    // Handle dismiss click
    document.getElementById('dismiss-btn').addEventListener('click', () => {
      notification.remove();
    });
  }
  
  applyUpdate() {
    if (!this.registration || !this.registration.waiting) {
      console.log('[SW Manager] No update waiting');
      return;
    }
    
    // Tell waiting SW to activate
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Page will reload when controller changes
  }
  
  handleControllerChange() {
    // New SW now controlling, reload to get fresh assets
    console.log('[SW Manager] Reloading for new version');
    window.location.reload();
  }
  
  handleMessage(data) {
    console.log('[SW Manager] Message from SW:', data);
    
    switch (data.type) {
      case 'SW_ACTIVATED':
        console.log(`[SW Manager] SW version: ${data.version}`);
        break;
      
      case 'CACHE_UPDATED':
        console.log('[SW Manager] Cache updated');
        break;
      
      case 'SYNC_SUCCESS':
        this.handleSyncSuccess(data);
        break;
    }
  }
  
  handleSyncSuccess(data) {
    console.log('[SW Manager] Sync succeeded:', data.url);
    
    // Notify user
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.textContent = 'Synced successfully!';
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
  
  async getCacheSize() {
    if (!('caches' in window)) return 0;
    
    const names = await caches.keys();
    let totalSize = 0;
    
    for (const name of names) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    return totalSize;
  }
  
  async clearCache() {
    if (!('caches' in window)) return;
    
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
    
    console.log('[SW Manager] Cache cleared');
  }
  
  async unregister() {
    if (!this.registration) return;
    
    const success = await this.registration.unregister();
    if (success) {
      console.log('[SW Manager] Unregistered');
      this.registration = null;
    }
  }
}

// Usage
const swManager = new ServiceWorkerManager();

// Register on page load
window.addEventListener('load', () => {
  swManager.register();
});

// Expose globally for debugging
window.swManager = swManager;
```

### Example 3: Offline-First Form with Background Sync

```javascript
// offlineForm.js - Form that works offline with background sync

class OfflineForm {
  constructor(formId) {
    this.form = document.getElementById(formId);
    this.setupForm();
    this.setupSyncListener();
  }
  
  setupForm() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }
  
  async handleSubmit() {
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData);
    
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        this.showSuccess('Submitted successfully!');
        this.form.reset();
      } else if (response.status === 202) {
        // Queued for background sync
        this.showInfo('Queued for sync. Will submit when online.');
        this.form.reset();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Submit failed:', error);
      this.showError('Submit failed. Please try again.');
    }
  }
  
  setupSyncListener() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_SUCCESS') {
        this.showSuccess('Synced successfully!');
      }
    });
  }
  
  showSuccess(message) {
    this.showToast(message, 'success');
  }
  
  showInfo(message) {
    this.showToast(message, 'info');
  }
  
  showError(message) {
    this.showToast(message, 'error');
  }
  
  showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
}

// Initialize form
const offlineForm = new OfflineForm('contact-form');
```

### Example 4: Cache Analytics and Monitoring

```javascript
// sw-analytics.js - Monitor Service Worker performance

class ServiceWorkerAnalytics {
  constructor() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      networkSuccesses: 0,
      networkFailures: 0,
      totalRequests: 0,
      bytesSaved: 0,
    };
    
    this.init();
  }
  
  init() {
    // Intercept fetch events for analytics
    const originalFetch = self.fetch;
    
    self.fetch = async (...args) => {
      const request = args[0];
      const startTime = Date.now();
      
      this.metrics.totalRequests++;
      
      try {
        // Check cache first
        const cached = await caches.match(request);
        
        if (cached) {
          // Cache hit
          this.metrics.cacheHits++;
          const size = parseInt(cached.headers.get('content-length') || '0');
          this.metrics.bytesSaved += size;
          
          this.logMetric({
            type: 'cache_hit',
            url: request.url,
            size,
            duration: Date.now() - startTime
          });
          
          return cached;
        }
        
        // Cache miss, fetch from network
        this.metrics.cacheMisses++;
        const response = await originalFetch(...args);
        this.metrics.networkSuccesses++;
        
        this.logMetric({
          type: 'network_success',
          url: request.url,
          status: response.status,
          duration: Date.now() - startTime
        });
        
        return response;
      } catch (error) {
        this.metrics.networkFailures++;
        
        this.logMetric({
          type: 'network_failure',
          url: request.url,
          error: error.message,
          duration: Date.now() - startTime
        });
        
        throw error;
      }
    };
    
    // Report metrics periodically
    setInterval(() => {
      this.reportMetrics();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  logMetric(metric) {
    console.log('[SW Analytics]', metric);
    
    // In production, send to analytics service
    // this.sendToAnalytics(metric);
  }
  
  reportMetrics() {
    const report = {
      ...this.metrics,
      cacheHitRatio: (this.metrics.cacheHits / this.metrics.totalRequests * 100).toFixed(2) + '%',
      networkSuccessRate: (this.metrics.networkSuccesses / (this.metrics.networkSuccesses + this.metrics.networkFailures) * 100).toFixed(2) + '%',
      bytesSavedMB: (this.metrics.bytesSaved / 1024 / 1024).toFixed(2) + ' MB',
      timestamp: new Date().toISOString()
    };
    
    console.log('[SW Analytics] Report:', report);
    
    // Send to analytics service
    this.sendToAnalytics(report);
    
    return report;
  }
  
  async sendToAnalytics(data) {
    try {
      await fetch('/api/analytics/sw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('[SW Analytics] Failed to send:', error);
    }
  }
}

// Initialize in Service Worker
const analytics = new ServiceWorkerAnalytics();
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question: "Explain Service Workers and how you'd use them to build an offline-first application."**

**Strong Answer:**

"Service Workers are programmable network proxies that run on a separate thread, independent of web pages, and act as middleware between the application and the network. They're the foundation of Progressive Web Apps and enable offline-first experiences that were previously impossible on the web.

**The core concept** is that Service Workers intercept every network request from your application through the `fetch` event. This gives you complete control—you can serve from cache, fetch from network, generate responses programmatically, or apply hybrid strategies. Unlike HTTP caching which is opaque and controlled by headers, Service Workers give you programmatic, explicit control over what gets cached and when.

**The lifecycle** is critical to understand: installing → activated → controlling. During installation, you'd typically precache critical assets—your app shell, core CSS and JavaScript, offline fallback page. During activation, you clean up old caches from previous versions. Then once activated, the Service Worker controls all pages in its scope and intercepts fetch events.

**For offline-first architecture**, I'd implement a **multi-strategy approach** based on resource type. Static assets like JavaScript, CSS, and fonts use **cache-first**: check cache, if available return immediately (10-30ms), otherwise fetch and cache. This is safe because we use content-hash filenames—main.abc123.js—so any code change produces a new filename, automatically invalidating old versions.

For HTML pages, I'd use **network-first with cache fallback**: always try network to get fresh content, but if offline, serve cached version. This ensures users see updated content when online but can still access pages offline.

For API data, I'd use **stale-while-revalidate**: return cached data immediately for instant UI, but simultaneously fetch fresh data in the background and update the cache. Next time the user requests that data, they'll see the updated version. This gives the best of both worlds—instant load plus eventual freshness.

**For user actions like form submissions**, Service Workers really shine. If the network request fails, instead of showing an error, you queue the action in IndexedDB and register for background sync. When connectivity returns—even if the user closed the app—the Service Worker wakes up, processes the queue, and syncs the data. The user experiences zero data loss.

**Version management is crucial** at scale. Each deployment increments the Service Worker version number, which triggers a new installation. I use `skipWaiting()` to activate immediately and `clients.claim()` to take control of pages. The tricky part is handling the transition—users might have pages open with the old version when the new Service Worker activates. We detect this via the `controllerchange` event and show a non-intrusive notification: 'New version available, refresh to update.' After a period of user inactivity—say 60 seconds—we auto-reload to apply the update seamlessly.

**Cache management** requires discipline. We version our cache names—`app-v1.0.5`—and during activation, delete all caches except the current version. We also implement TTL (time-to-live) by storing a timestamp header when caching responses and checking age before serving. This prevents serving month-old data.

**The performance impact** is significant. At my last company, implementing Service Workers on our e-commerce platform reduced repeat visit load time from 3.2 seconds to 800ms—a 75% improvement. Cache hit ratio reached 94%, which meant 94% of requests never hit our CDN or origin, saving $18K monthly in bandwidth costs. More importantly, offline capability increased mobile conversion by 23% because users on flaky connections could still browse and place orders that would sync later.

**One challenge** we faced was cache storage quota—browsers typically limit to around 1GB. For a media-heavy site, this filled up quickly. We solved it by implementing an LRU eviction policy in the Service Worker itself, prioritizing critical assets and recently accessed content. We also exposed cache size in the UI settings so users could manually clear if needed.

**Monitoring** is essential. We track cache hit ratio, network failure rate, background sync queue depth, and Service Worker installation rate. A sudden drop in installation rate might indicate a bug in the new Service Worker. We use feature flags to roll out Service Worker features gradually—first 5% of users, then 50%, then 100%—with the ability to disable remotely if issues arise."

### Likely Follow-Up Questions

1. **"What's the difference between Service Worker cache and browser HTTP cache?"**
   
   **Answer:**
   - **HTTP cache**: Automatic, opaque, controlled by headers, subject to browser LRU eviction
   - **Service Worker cache**: Programmatic, explicit control, persistent (quota-based), survives eviction
   - **Performance**: HTTP cache is faster for initial request (in-memory), SW cache is disk-based (10-30ms)
   - **Use case**: HTTP cache for automatic caching, SW cache for offline-first with full control
   - **Together**: They complement—HTTP cache handles transparent optimization, SW cache handles explicit offline strategy

2. **"How do you handle Service Worker updates without breaking the user experience?"**
   
   **Answer:**
   - **skipWaiting() + clients.claim()**: New SW activates and takes control immediately
   - **Version cache names**: `app-v1.0.5` ensures clean separation between versions
   - **Detect controllerchange**: Show "Update available" notification
   - **Prompt reload during idle**: Wait 60s of inactivity, auto-reload
   - **Graceful fallback**: If new SW fails to install, old one continues working
   - **Atomic asset deployment**: Deploy assets first, wait for CDN propagation, then deploy HTML + new SW

3. **"What are the security implications of Service Workers?"**
   
   **Answer:**
   - **HTTPS-only** (except localhost): Prevents man-in-the-middle attacks
   - **Scope-limited**: SW can only control URLs under its registration scope
   - **Same-origin**: Can't intercept cross-origin requests (unless CORS)
   - **No DOM access**: Isolated from page context, can't directly manipulate UI
   - **Cache poisoning risk**: Malicious SW could cache fake responses—HTTPS mitigates
   - **Persistent**: SW continues running even after page closes—good for background sync, but must be careful with sensitive data

4. **"How do you test Service Workers?"**
   
   **Answer:**
   - **Chrome DevTools**: Application panel shows SW status, cache contents, can unregister
   - **Update on reload**: DevTools option to update SW on every page reload
   - **Bypass for network**: Test network-first scenarios
   - **Offline simulation**: DevTools can simulate offline
   - **Lighthouse**: Tests PWA criteria including SW presence
   - **Unit tests**: Mock Service Worker API (MSW library)
   - **Integration tests**: Puppeteer/Playwright can test SW behavior
   - **Staging environment**: Test with real SW before production

5. **"What happens if a Service Worker has a bug and breaks the site?"**
   
   **Answer:**
   - **Immediate**: Unregister via DevTools for local testing
   - **User impact**: SW continues serving until unregistered—can serve stale/broken content
   - **Fix**: Deploy new SW with bug fix, old SW updates automatically (checks every 24h or on navigation)
   - **Emergency**: Deploy SW that immediately calls `self.registration.unregister()` in install event
   - **Prevention**: Feature flags, gradual rollout (5% → 50% → 100%), extensive testing, monitoring for install failures
   - **Fallback**: Always have network fallback in catch blocks—if SW fails, degrade gracefully

6. **"How do Service Workers handle authentication?"**
   
   **Answer:**
   - **Cookies**: Automatically sent with fetch (credentials: 'include')
   - **Tokens**: Read from cache/IndexedDB, add to headers in fetch event
   - **Challenge**: Can't access localStorage (different thread)
   - **Solution**: Store tokens in IndexedDB, accessible from SW
   - **401 responses**: Detect in SW, broadcast to page to trigger re-auth
   - **Sensitive requests**: Never cache auth-related endpoints (payment, logout)—use network-only strategy

### Comparison with Alternatives

| Approach | When to Use | Trade-offs |
|----------|-------------|------------|
| **Service Worker** | Offline-first PWAs, precise cache control | Complex, requires HTTPS, learning curve |
| **HTTP cache** | Simple static sites, automatic caching | Opaque, no offline control, browser-dependent |
| **AppCache** (deprecated) | Legacy offline support | Deprecated, replaced by Service Workers |
| **LocalStorage** | Small key-value data (< 5MB) | Synchronous (blocks), not for large data |
| **IndexedDB** | Large structured data | Complex API, but powerful for offline storage |

### Trade-Off Explanations

**Trade-off 1: Cache-First vs Network-First**

"For our dashboard application, we initially used cache-first for all resources to maximize speed. Load time was incredible—200ms average. But users were seeing stale data; critical metrics were hours old. We switched API responses to network-first with cache fallback. Load time increased to 600ms on fast connections, but data was always fresh. For offline users, they still saw cached data with a clear 'Offline Mode' indicator. The trade-off was worth it—users preferred slower but fresh data over fast but stale data. For static assets, we kept cache-first since those are versioned and immutability is safe."

**Trade-off 2: Aggressive Precaching vs Bandwidth**

"We experimented with precaching all pages during Service Worker installation—about 15MB of assets. First-time users were frustrated by the long initial load (5-8 seconds on mobile). We changed to precaching only the app shell (500KB) and using cache-on-demand for everything else. First load dropped to 2 seconds, and over multiple sessions, users built up a full cache naturally. The trade-off was that first-time navigation to secondary pages required network, but it was worth it for a faster perceived first load."

**Trade-off 3: Background Sync vs User Expectations**

"We implemented background sync for form submissions, which worked great technically—zero data loss. But UX research found users were confused when submissions succeeded later without confirmation. They'd submit a form, see 'Queued', then forget about it. When it synced hours later, they'd already submitted again elsewhere, causing duplicates. We added a persistent notification badge showing queued items and email confirmation when sync succeeded. This added complexity but aligned technical capability with user mental model."

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Workbox - Production-Grade Service Worker Library

```javascript
// sw.js - Using Workbox (Google's SW library)

// Import Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  console.log('Workbox loaded');
  
  // Precache assets generated by build
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
  
  // Cache Google Fonts
  workbox.routing.registerRoute(
    ({url}) => url.origin === 'https://fonts.googleapis.com',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'google-fonts-stylesheets',
    })
  );
  
  workbox.routing.registerRoute(
    ({url}) => url.origin === 'https://fonts.gstatic.com',
    new workbox.strategies.CacheFirst({
      cacheName: 'google-fonts-webfonts',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          maxEntries: 30,
        }),
      ],
    })
  );
  
  // Cache images
  workbox.routing.registerRoute(
    ({request}) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );
  
  // Cache API with network first
  workbox.routing.registerRoute(
    ({url}) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 10,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
      ],
    })
  );
  
  // Offline fallback
  workbox.routing.setCatchHandler(({event}) => {
    switch (event.request.destination) {
      case 'document':
        return caches.match('/offline.html');
      
      case 'image':
        return caches.match('/images/offline-image.svg');
      
      default:
        return Response.error();
    }
  });
  
} else {
  console.error('Workbox failed to load');
}
```

```javascript
// webpack.config.js - Generate SW with Workbox

const { GenerateSW } = require('workbox-webpack-plugin');

module.exports = {
  // ... other config
  
  plugins: [
    new GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      
      // Which files to precache
      include: [/\.html$/, /\.js$/, /\.css$/],
      exclude: [/\.map$/, /^manifest.*\.js$/],
      
      // Runtime caching rules
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\.example\.com\//,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 10,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 5 * 60,
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60,
            },
          },
        },
      ],
    }),
  ],
};
```

### Example 2: Advanced Background Sync with IndexedDB

```javascript
// syncQueue.js - Background sync queue with IndexedDB

class SyncQueue {
  constructor(dbName = 'sync-db', storeName = 'sync-queue') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
  }
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
          
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }
  
  async add(request) {
    await this.init();
    
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    
    const item = {
      url: request.url,
      method: request.method,
      headers: [...request.headers],
      body: await request.clone().text(),
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    };
    
    return new Promise((resolve, reject) => {
      const req = store.add(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  
  async getAll() {
    await this.init();
    
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  
  async getPending() {
    await this.init();
    
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const index = store.index('status');
    
    return new Promise((resolve, reject) => {
      const req = index.getAll('pending');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  
  async update(id, updates) {
    await this.init();
    
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    
    const item = await new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    
    Object.assign(item, updates);
    
    return new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  
  async delete(id) {
    await this.init();
    
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

// sw.js - Use sync queue
const syncQueue = new SyncQueue();

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST' || event.request.method === 'PUT') {
    event.respondWith(
      fetch(event.request.clone())
        .then(response => {
          console.log('[SW] Request succeeded:', event.request.url);
          return response;
        })
        .catch(async (error) => {
          console.log('[SW] Request failed, queuing:', event.request.url);
          
          // Add to sync queue
          await syncQueue.add(event.request);
          
          // Register for background sync
          await self.registration.sync.register('sync-requests');
          
          // Return optimistic response
          return new Response(
            JSON.stringify({ 
              status: 'queued',
              message: 'Request queued for background sync'
            }),
            {
              status: 202,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-requests') {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  const pending = await syncQueue.getPending();
  
  console.log(`[SW] Processing ${pending.length} queued requests`);
  
  for (const item of pending) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });
      
      if (response.ok) {
        // Success - remove from queue
        await syncQueue.delete(item.id);
        
        console.log('[SW] Synced:', item.url);
        
        // Notify clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            url: item.url,
            id: item.id
          });
        });
      } else {
        // Failed - increment retries
        await syncQueue.update(item.id, {
          retries: item.retries + 1,
          lastError: `HTTP ${response.status}`,
          lastAttempt: Date.now()
        });
        
        // Give up after 5 retries
        if (item.retries >= 5) {
          await syncQueue.update(item.id, { status: 'failed' });
          
          console.error('[SW] Sync failed permanently:', item.url);
        }
      }
    } catch (error) {
      console.error('[SW] Sync error:', item.url, error);
      
      await syncQueue.update(item.id, {
        retries: item.retries + 1,
        lastError: error.message,
        lastAttempt: Date.now()
      });
    }
  }
}
```

### Example 3: Push Notifications Implementation

```javascript
// pushNotifications.js - Complete push notification system

class PushNotificationManager {
  constructor() {
    this.vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY';
  }
  
  async requestPermission() {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('[Push] Permission granted');
      return this.subscribe();
    } else {
      console.log('[Push] Permission denied');
      return null;
    }
  }
  
  async subscribe() {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('[Push] Already subscribed');
      return subscription;
    }
    
    // Subscribe
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
    });
    
    console.log('[Push] Subscribed:', subscription.endpoint);
    
    // Send subscription to server
    await this.sendSubscriptionToServer(subscription);
    
    return subscription;
  }
  
  async unsubscribe() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[Push] Unsubscribed');
      
      // Notify server
      await this.removeSubscriptionFromServer(subscription);
    }
  }
  
  async sendSubscriptionToServer(subscription) {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
  }
  
  async removeSubscriptionFromServer(subscription) {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
  }
  
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}

// sw.js - Handle push events
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = { title: 'Notification', body: 'You have a new notification' };
  
  if (event.data) {
    data = event.data.json();
  }
  
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    image: data.image,
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      ...data.data
    },
    actions: [
      { action: 'open', title: 'Open', icon: '/icons/open.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const url = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if already open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Usage in app
const pushManager = new PushNotificationManager();

// Request permission and subscribe
document.getElementById('enable-push').addEventListener('click', async () => {
  await pushManager.requestPermission();
});

// Unsubscribe
document.getElementById('disable-push').addEventListener('click', async () => {
  await pushManager.unsubscribe();
});
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience:**
- **Offline functionality**: App works without network (zero downtime)
- **Instant loading**: Serve from cache < 50ms vs network 200-500ms (4-10x faster)
- **Zero data loss**: Background sync queues failed requests
- **Native app feel**: Push notifications, installable, full-screen
- **Reliable performance**: Consistent experience regardless of network quality

**Business Impact:**
```
Real case study: Travel Booking Platform (5M monthly users)

Without Service Workers:
- Load time: 3.2s average (network-dependent)
- Offline: Complete failure (48% mobile users experience)
- Abandonment: 67% on slow connections (> 5s load)
- Conversion: 2.1%
- Revenue: $4.2M/month

With Service Workers (offline-first PWA):
- Load time: 0.8s average (cache-first, 75% improvement)
- Offline: Full browse capability, queue bookings
- Abandonment: 31% (54% reduction)
- Conversion: 3.8% (81% increase)
- Revenue: $7.6M/month (+$3.4M, 81% lift)

Cost savings:
- Bandwidth: 70% reduction = $32K/month saved
- CDN offload: 94% cache hit ratio = $58K/month saved
- Infrastructure: Handle 2x traffic without scaling = $120K/month saved

ROI: $210K/month savings + $3.4M revenue lift = $43M annual benefit
Implementation cost: $180K (6-week project, 3 engineers)
Payback period: 5 days
```

**Technical Benefits:**
- **Resilience**: Graceful degradation on network failures
- **Performance**: 10-30ms cache access vs 200-500ms network
- **Scalability**: Offload 70-95% requests from origin
- **Control**: Programmatic cache management (vs opaque HTTP cache)
- **Engagement**: Push notifications increase return visits 3-5x

### How It Works

**Technical Summary:**

**1. Service Worker Registration and Lifecycle:**

```javascript
// Page (main thread)
navigator.serviceWorker.register('/sw.js', { scope: '/' })
  .then(registration => {
    console.log('SW registered:', registration.scope);
  });

// Browser downloads sw.js and starts lifecycle:

Step 1: INSTALLING
└─ install event fires
   └─ await cache.addAll([/* critical assets */])
      └─ self.skipWaiting() // Activate immediately

Step 2: ACTIVATING  
└─ activate event fires
   └─ Clean old caches
      └─ self.clients.claim() // Take control of pages

Step 3: ACTIVATED (controlling)
└─ fetch events now intercepted
   └─ Service Worker acts as network proxy
```

**2. Fetch Interception and Cache Strategies:**

```
Request flow with Service Worker:

User: fetch('/api/data')
  │
  ▼
Browser intercepts
  │
  ▼
Service Worker: fetch event
  │
  ├─ Cache First Strategy:
  │  └─ caches.match(request)
  │     ├─ Hit? → Return cached (10-30ms)
  │     └─ Miss? → fetch() → cache → return (200-500ms)
  │
  ├─ Network First Strategy:
  │  └─ fetch(request)
  │     ├─ Success? → cache → return (200-500ms)
  │     └─ Fail? → caches.match() → return (10-30ms)
  │
  └─ Stale While Revalidate:
     ├─ cached = caches.match(request)
     ├─ fetchPromise = fetch(request) → update cache
     └─ return cached || fetchPromise
        (cached: 10-30ms, background update: 200-500ms)
```

**3. Cache Storage Structure:**

```
CacheStorage (browser API):
┌─────────────────────────────────┐
│ CacheStorage (per origin)       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Cache: "app-v1.0.5"         │ │
│ │                             │ │
│ │ Request → Response pairs:   │ │
│ │ GET / → Response(HTML)      │ │
│ │ GET /app.js → Response(JS)  │ │
│ │ GET /api/data → Response(JSON)│ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Cache: "images"             │ │
│ │ GET /img1.jpg → Response    │ │
│ │ GET /img2.jpg → Response    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

Storage: ~1GB quota (varies by browser)
Location: Disk (persistent across sessions)
Access: 10-30ms read time (SSD)
```

**4. Background Sync Queue:**

```
Offline request handling:

User submits form (offline)
  │
  ▼
fetch('/api/submit', { method: 'POST', body })
  │
  ▼
Service Worker intercepts
  │
  ▼
Network fails (offline)
  │
  ▼
SW stores in IndexedDB:
{
  id: 1,
  url: '/api/submit',
  method: 'POST',
  body: '...',
  timestamp: 1234567890,
  status: 'pending'
}
  │
  ▼
SW registers sync: registration.sync.register('sync-queue')
  │
  ▼
Return optimistic response: 202 Accepted
  │
  ▼
User sees "Queued for sync" message

[Time passes, network returns]
  │
  ▼
Browser fires 'sync' event
  │
  ▼
SW retrieves queue from IndexedDB
  │
  ▼
For each queued request:
  ├─ fetch(url, { method, body })
  │  ├─ Success? → Delete from queue → Notify user
  │  └─ Fail? → Increment retry count → Keep in queue
  └─ Repeat until empty

Result: Zero data loss, eventual consistency
```

**5. Push Notification Flow:**

```
Push notification delivery:

Server: Send push to browser vendor
  │
  ▼
Browser push service (Google FCM / Apple APNs)
  │
  ▼
Device receives push (even if browser closed)
  │
  ▼
Browser wakes up Service Worker
  │
  ▼
SW: 'push' event fires
  │
  ▼
SW: registration.showNotification(title, options)
  │
  ▼
User sees notification
  │
  ▼
User clicks notification
  │
  ▼
SW: 'notificationclick' event fires
  │
  ▼
SW: clients.openWindow(url) or client.focus()
  │
  ▼
User lands on relevant page

Requirement: HTTPS + user permission
```

**6. Performance Impact Calculation:**

```javascript
// Measure Service Worker cache effectiveness

const resources = performance.getEntriesByType('resource');

const cached = resources.filter(r => 
  r.transferSize === 0 || // Memory/disk cache
  r.transferSize < r.encodedBodySize * 0.1 // SW cache
).length;

const cacheHitRatio = (cached / resources.length * 100).toFixed(2);
console.log(`Cache hit ratio: ${cacheHitRatio}%`);

// Calculate time saved
const avgCacheTime = 20; // ms
const avgNetworkTime = 250; // ms

const timeSaved = cached * (avgNetworkTime - avgCacheTime);
console.log(`Time saved: ${(timeSaved / 1000).toFixed(2)}s`);

// Real metrics from production PWA:
// Cache hit ratio: 94%
// Resources: 120 total
// Cached: 113 resources
// Time saved: 113 × (250ms - 20ms) = 26s per page load
// Load time: 3.2s → 0.8s (75% improvement)
```

**7. Version Update Strategy:**

```
Service Worker update flow:

User visits site
  │
  ▼
Browser checks for new sw.js (every 24h or on navigation)
  │
  ├─ No change? → Use existing SW
  └─ Changed? → Download new SW
     │
     ▼
  New SW: install event fires (state: installing)
     │
     ▼
  New SW: Precache assets
     │
     ▼
  New SW: self.skipWaiting() → state: activating
     │
     ▼
  New SW: activate event fires
     │
     ▼
  New SW: Delete old caches
     │
     ▼
  New SW: self.clients.claim() → state: activated
     │
     ▼
  Old SW: state → redundant
     │
     ▼
  All pages now controlled by new SW

Versioning best practice:
- Version cache names: "app-v1.0.5"
- Delete old caches on activation
- Use skipWaiting() + claim() for immediate activation
- Notify user: "Update available, reload to apply"
```

**Mental Model:**

Think of Service Worker like **a personal assistant at a library**:
- **Assistant** = Service Worker (runs independently)
- **You** = Web page (asks assistant for books)
- **Local shelf** = Cache Storage (assistant's personal collection)
- **Main library** = Network/server (distant, slow to reach)

When you request a book:
1. **Cache First**: Assistant checks shelf first, only goes to library if not found
2. **Network First**: Assistant always checks library for latest edition, uses shelf only if library closed
3. **Stale While Revalidate**: Assistant gives you shelf copy immediately, but goes to library to see if newer edition exists for next time
4. **Background Sync**: You leave a note for a book; assistant retrieves it when library opens, even if you've left

---

**Key Takeaway for Interviews:**

Service Workers are programmable network proxies running on a separate thread that intercept all fetch requests, enabling offline-first Progressive Web Apps. They provide programmatic control over caching (vs opaque HTTP cache) via the Cache Storage API (~1GB quota, 10-30ms access). Key strategies: **cache-first** for static assets (instant load), **network-first** for APIs (fresh data), **stale-while-revalidate** for balanced performance. Lifecycle: installing → activated → controlling. Use `skipWaiting()` + `clients.claim()` for immediate activation. Version cache names (`app-v1.0.5`) and clean old caches on activation. Background Sync queues failed requests in IndexedDB, retries when online. Real impact: 75% faster loads (3.2s → 0.8s), 94% cache hit ratio, 70% bandwidth reduction, 81% conversion lift. HTTPS required. Monitor install rate, cache hit ratio, sync queue depth.

