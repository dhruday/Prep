# PART 9️⃣ — Caching & Offline

## 📖 Overview

Caching is the **most effective performance optimization**. Proper caching can reduce server costs by 90%, improve load times by 10x, and enable offline experiences. This section covers HTTP caching, Service Workers, Cache API, and offline-first strategies.

## 🎯 Why This Matters

**Business Impact**:
- **Pinterest**: Service Workers improved performance by 40% on slow networks
- **Twitter**: Offline support increased engagement by 65%
- **Starbucks**: PWA with offline support doubled daily active users

**Interview Reality**:
- "Design a caching strategy for an e-commerce site."
- "How do you enable offline mode?"
- "Explain HTTP caching headers."
- "What's the difference between Cache API and localStorage?"

---

## 📚 Module Breakdown

### Module 9.1 — Caching Layers
**Focus**: HTTP caching, CDN caching, browser caching

**Topics Covered**:

#### **Caching Hierarchy**
```
┌─────────────────────────────────────────────────────────────┐
│                   CACHING LAYERS                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: BROWSER CACHE (Memory + Disk)                     │
│  ├─ Memory Cache (RAM, cleared on close)                    │
│  └─ Disk Cache (SSD, persists across sessions)              │
│                                                              │
│  Layer 2: SERVICE WORKER CACHE (Cache API)                  │
│  ├─ Programmable cache                                      │
│  └─ Works offline                                           │
│                                                              │
│  Layer 3: CDN CACHE (Edge servers)                          │
│  ├─ Geographically distributed                              │
│  └─ Reduces origin load                                     │
│                                                              │
│  Layer 4: SERVER CACHE (Redis, Memcached)                   │
│  ├─ Database query results                                  │
│  └─ Computed responses                                      │
│                                                              │
│  Request Flow:                                              │
│  Browser → Service Worker → CDN → Server → Database        │
│      ↓          ↓           ↓       ↓                       │
│   (Cache)   (Cache API) (Edge Cache) (Redis)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### **HTTP Caching Headers**
```http
┌─────────────────────────────────────────────────────────────┐
│                  CACHE-CONTROL HEADER                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DIRECTIVES:                                                │
│                                                              │
│  • max-age=<seconds>                                        │
│    How long resource is fresh                               │
│                                                              │
│  • public                                                   │
│    Can be cached by browser AND CDN                         │
│                                                              │
│  • private                                                  │
│    Only browser can cache (not CDN)                         │
│    Use for user-specific data                               │
│                                                              │
│  • no-cache                                                 │
│    Must revalidate with server before using                 │
│                                                              │
│  • no-store                                                 │
│    Don't cache at all (sensitive data)                      │
│                                                              │
│  • immutable                                                │
│    Never revalidate (file hash in name)                     │
│                                                              │
│  • stale-while-revalidate=<seconds>                         │
│    Serve stale, fetch fresh in background                   │
│                                                              │
│  • stale-if-error=<seconds>                                 │
│    Serve stale if origin is down                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Caching Strategies by Resource Type**
```http
<!-- Static Assets (CSS, JS, Images) with hash -->
Cache-Control: public, max-age=31536000, immutable

<!-- Static Assets (fonts, icons) -->
Cache-Control: public, max-age=31536000

<!-- HTML (frequently updated) -->
Cache-Control: public, max-age=0, must-revalidate

<!-- API Responses (short-lived) -->
Cache-Control: private, max-age=60, stale-while-revalidate=3600

<!-- User-specific data -->
Cache-Control: private, no-cache

<!-- Sensitive data -->
Cache-Control: private, no-store
```

**Examples**
```javascript
// Express.js server
app.use('/static', express.static('public', {
  maxAge: '1y', // 1 year
  immutable: true
}));

app.get('/api/products', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.json(products);
});

// Next.js
export async function getStaticProps() {
  return {
    props: { data },
    revalidate: 60 // ISR: regenerate every 60 seconds
  };
}

// Nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

#### **ETag & Conditional Requests**
```http
┌─────────────────────────────────────────────────────────────┐
│                  ETAG (Entity Tag)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Server Response:                                           │
│    ETag: "abc123"                                           │
│    Cache-Control: max-age=0, must-revalidate               │
│                                                              │
│  Browser Request (after cache expires):                     │
│    If-None-Match: "abc123"                                  │
│                                                              │
│  Server Response:                                           │
│    304 Not Modified (if ETag matches)                       │
│    OR                                                       │
│    200 OK + new data (if ETag changed)                      │
│                                                              │
│  Benefits:                                                  │
│    • Bandwidth savings (no body on 304)                     │
│    • Freshness guarantee                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```javascript
// Generate ETag
const etag = require('etag');
const hash = etag(JSON.stringify(data));

res.set('ETag', hash);
res.set('Cache-Control', 'max-age=0, must-revalidate');

// Check If-None-Match
if (req.headers['if-none-match'] === hash) {
  res.status(304).end(); // Not Modified
} else {
  res.json(data);
}
```

**Interview Questions**:
- "Explain Cache-Control directives."
- "What's the difference between no-cache and no-store?"
- "How does stale-while-revalidate work?"
- "Design caching strategy for a news website."

**Interview Relevance**: 🔥🔥🔥🔥🔥
HTTP caching is fundamental for all web applications.

---

### Module 9.2 — Client Persistence
**Focus**: localStorage, IndexedDB, Cache API

**Topics Covered**:

#### **Storage Comparison**
```
┌──────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│              │ Cookies     │ localStorage│ SessionStor │ IndexedDB   │
├──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Capacity     │ 4 KB        │ 5-10 MB     │ 5-10 MB     │ 50+ MB      │
│ Lifetime     │ Expires     │ Forever     │ Tab close   │ Forever     │
│ Scope        │ Domain      │ Domain      │ Tab         │ Domain      │
│ Sent to srv  │ Yes (auto)  │ No          │ No          │ No          │
│ API          │ Sync        │ Sync        │ Sync        │ Async       │
│ Data types   │ String      │ String      │ String      │ Any         │
│ Indexing     │ No          │ No          │ No          │ Yes         │
│ Transactions │ No          │ No          │ No          │ Yes         │
└──────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

When to Use:
• Cookies:       Auth tokens, tracking (sent to server)
• localStorage:  User preferences, theme, settings
• sessionStorage: Form data, wizard state (per tab)
• IndexedDB:     Large datasets, offline apps, PWAs
```

#### **localStorage**
```javascript
// Basic usage
localStorage.setItem('theme', 'dark');
const theme = localStorage.getItem('theme');
localStorage.removeItem('theme');
localStorage.clear();

// Store objects (must stringify)
const user = { name: 'Alice', age: 30 };
localStorage.setItem('user', JSON.stringify(user));
const storedUser = JSON.parse(localStorage.getItem('user'));

// React hook
import { useState, useEffect } from 'react';

function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue];
}

// Usage
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

#### **IndexedDB**
```javascript
// Open database
const request = indexedDB.open('MyDB', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  
  // Create object store
  const store = db.createObjectStore('products', { keyPath: 'id' });
  
  // Create index
  store.createIndex('category', 'category', { unique: false });
};

request.onsuccess = (event) => {
  const db = event.target.result;
  
  // Add data
  const transaction = db.transaction(['products'], 'readwrite');
  const store = transaction.objectStore('products');
  store.add({ id: 1, name: 'Product 1', category: 'electronics' });
  
  // Get data
  const getRequest = store.get(1);
  getRequest.onsuccess = () => {
    console.log(getRequest.result);
  };
  
  // Query by index
  const index = store.index('category');
  const query = index.getAll('electronics');
  query.onsuccess = () => {
    console.log(query.result);
  };
};

// Using idb library (promises instead of callbacks)
import { openDB } from 'idb';

const db = await openDB('MyDB', 1, {
  upgrade(db) {
    db.createObjectStore('products', { keyPath: 'id' });
  },
});

// Add
await db.add('products', { id: 1, name: 'Product 1' });

// Get
const product = await db.get('products', 1);

// Get all
const allProducts = await db.getAll('products');

// Delete
await db.delete('products', 1);
```

#### **Cache API (Service Worker)**
```javascript
// Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/styles.css',
        '/script.js',
        '/logo.png'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// From main thread
caches.open('my-cache').then((cache) => {
  // Add to cache
  cache.add('/api/products');
  
  // Add multiple
  cache.addAll(['/page1', '/page2']);
  
  // Put custom response
  cache.put('/api/user', new Response(JSON.stringify(user)));
  
  // Get from cache
  cache.match('/api/products').then((response) => {
    if (response) {
      return response.json();
    }
  });
  
  // Delete from cache
  cache.delete('/api/products');
});

// Delete old caches
caches.keys().then((names) => {
  names.forEach((name) => {
    if (name !== 'v1') {
      caches.delete(name);
    }
  });
});
```

**Interview Questions**:
- "Compare localStorage vs IndexedDB."
- "When would you use each storage API?"
- "How do you store large datasets client-side?"

**Interview Relevance**: 🔥🔥🔥🔥
Essential for offline-first applications.

---

### Module 9.3 — Cache Strategy
**Focus**: Service Worker strategies, offline patterns

**Topics Covered**:

#### **Service Worker Caching Strategies**
```
┌─────────────────────────────────────────────────────────────┐
│              SERVICE WORKER STRATEGIES                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CACHE FIRST (Cache Falling Back to Network)            │
│     Cache → (if miss) → Network                             │
│     Use: Static assets (CSS, JS, images)                    │
│                                                              │
│  2. NETWORK FIRST (Network Falling Back to Cache)           │
│     Network → (if fail) → Cache                             │
│     Use: API responses (fresh data preferred)               │
│                                                              │
│  3. CACHE ONLY                                              │
│     Cache (never network)                                   │
│     Use: Pre-cached assets (guaranteed availability)        │
│                                                              │
│  4. NETWORK ONLY                                            │
│     Network (never cache)                                   │
│     Use: Real-time data, analytics                          │
│                                                              │
│  5. STALE-WHILE-REVALIDATE                                  │
│     Return cache → Update cache in background               │
│     Use: Frequently updated but not critical (news feed)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**1. Cache First**
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        return caches.open('v1').then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
```

**2. Network First**
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return caches.open('v1').then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
```

**3. Stale-While-Revalidate**
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open('v1').then((cache) => {
      return cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
        
        return cached || fetchPromise; // Return cache immediately, update in background
      });
    })
  );
});
```

**Using Workbox (Simplifies Service Workers)**
```javascript
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// Cache First for images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Network First for API
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Stale-While-Revalidate for static assets
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);
```

#### **Offline Fallback**
```javascript
// service-worker.js
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('offline').then((cache) => cache.add(OFFLINE_PAGE))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_PAGE);
      })
    );
  }
});
```

#### **Background Sync**
```javascript
// Register sync
if ('serviceWorker' in navigator && 'SyncManager' in window) {
  navigator.serviceWorker.ready.then((registration) => {
    return registration.sync.register('send-messages');
  });
}

// Service Worker: Handle sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-messages') {
    event.waitUntil(
      // Send queued messages
      sendQueuedMessages()
    );
  }
});

function sendQueuedMessages() {
  return getQueuedMessages().then((messages) => {
    return Promise.all(
      messages.map((msg) => 
        fetch('/api/messages', {
          method: 'POST',
          body: JSON.stringify(msg)
        }).then(() => deleteMessage(msg.id))
      )
    );
  });
}
```

#### **Periodic Background Sync**
```javascript
// Request permission
const status = await navigator.permissions.query({
  name: 'periodic-background-sync',
});

if (status.state === 'granted') {
  await registration.periodicSync.register('update-news', {
    minInterval: 24 * 60 * 60 * 1000, // 1 day
  });
}

// Service Worker
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-news') {
    event.waitUntil(updateNews());
  }
});

async function updateNews() {
  const response = await fetch('/api/news');
  const news = await response.json();
  
  const cache = await caches.open('news');
  await cache.put('/api/news', new Response(JSON.stringify(news)));
}
```

**Interview Questions**:
- "Explain Service Worker caching strategies."
- "When would you use Cache First vs Network First?"
- "How do you implement offline mode?"
- "What is background sync?"

**Interview Relevance**: 🔥🔥🔥🔥🔥
Critical for PWA and offline-first apps.

---

## 🎓 Study Plan

### Week 1: Caching Layers
- **Day 1-2**: HTTP caching headers (Cache-Control, ETag)
- **Day 3-4**: Browser caching mechanisms
- **Day 5-6**: CDN caching strategies
- **Day 7**: Implement caching for sample app

### Week 2: Client Persistence
- **Day 1-2**: localStorage, sessionStorage
- **Day 3-4**: IndexedDB (idb library)
- **Day 5-6**: Cache API
- **Day 7**: Build offline-capable feature

### Week 3: Cache Strategy
- **Day 1-2**: Service Worker basics
- **Day 3-4**: Caching strategies (Cache First, Network First, SWR)
- **Day 5-6**: Workbox library
- **Day 7**: Build full PWA with offline support

---

## 📊 Assessment Checklist

### Module 9.1: Caching Layers
- [ ] Can explain Cache-Control directives
- [ ] Can design caching strategy per resource type
- [ ] Can implement ETag-based validation
- [ ] Can configure CDN caching

### Module 9.2: Client Persistence
- [ ] Can choose appropriate storage API
- [ ] Can use localStorage for simple data
- [ ] Can use IndexedDB for complex data
- [ ] Can use Cache API for network responses

### Module 9.3: Cache Strategy
- [ ] Can implement Service Worker
- [ ] Can choose appropriate caching strategy
- [ ] Can implement offline fallback
- [ ] Can use Workbox library

---

## 🎯 Common Interview Questions (Part 9)

### HTTP Caching
1. "Explain Cache-Control: max-age, no-cache, no-store."
2. "What's the difference between ETag and Last-Modified?"
3. "How does stale-while-revalidate work?"

### Client Storage
1. "Compare localStorage, sessionStorage, IndexedDB."
2. "When would you use IndexedDB over localStorage?"
3. "How much data can you store client-side?"

### Service Workers
1. "What is a Service Worker?"
2. "Explain Cache First vs Network First."
3. "How do you implement offline mode?"
4. "What is background sync?"

### Real-World Scenarios
1. "Design caching strategy for an e-commerce site."
2. "Design offline-first news app."
3. "Design real-time chat with offline support."
4. "How would you cache API responses?"

---

## 💡 Key Takeaways

### Caching Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│              CACHING STRATEGY SELECTOR                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  STATIC ASSETS (CSS, JS, images with hash):                 │
│    → Cache First + immutable                                │
│    → Cache-Control: public, max-age=31536000, immutable     │
│                                                              │
│  HTML PAGES:                                                │
│    → Network First + offline fallback                       │
│    → Cache-Control: no-cache                                │
│                                                              │
│  API RESPONSES (frequently updated):                        │
│    → Stale-While-Revalidate                                 │
│    → Cache-Control: max-age=60, stale-while-revalidate=3600│
│                                                              │
│  API RESPONSES (rarely updated):                            │
│    → Cache First                                            │
│    → Cache-Control: max-age=3600                            │
│                                                              │
│  REAL-TIME DATA:                                            │
│    → Network Only                                           │
│    → Cache-Control: no-store                                │
│                                                              │
│  USER-SPECIFIC DATA:                                        │
│    → Network First + private cache                          │
│    → Cache-Control: private, max-age=300                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Recommended Resources

### Documentation
- [MDN - HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Workbox](https://developers.google.com/web/tools/workbox)

### Tools
- **Workbox**: Service Worker library
- **idb**: Promise-based IndexedDB wrapper
- **Chrome DevTools**: Application > Cache Storage

### Articles
- [Service Worker Lifecycle](https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle)
- [Offline Cookbook](https://web.dev/offline-cookbook/)

### Real-World Examples
- **Twitter**: Offline timeline caching
- **Pinterest**: Service Worker for fast repeat visits
- **Starbucks**: PWA with full offline support

---

## 🎬 Next Steps

After completing Part 9, you should:

1. ✅ Understand all caching layers
2. ✅ Can implement HTTP caching correctly
3. ✅ Can build offline-first apps with Service Workers
4. ✅ Can choose optimal caching strategy per use case

**You've completed the Frontend System Design curriculum!** 🎉

---

**Part 9 Status**: Caching & Offline Mastery ✅
**Estimated Study Time**: 3 weeks

## 🏆 Congratulations!

You now have comprehensive knowledge of frontend system design:
- ✅ Fundamentals & Architecture
- ✅ Browser Internals & Rendering
- ✅ State Management
- ✅ Performance Optimization
- ✅ Asset Optimization
- ✅ Caching & Offline

**You're ready for senior+ frontend interviews!** 🚀
