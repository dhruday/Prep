# 20. Browser Storage Options Overview

## 1. High-Level Explanation (Frontend Interview Level)

**Browser Storage Options** provide client-side data persistence with different capabilities—Cookies (HTTP headers, 4KB), LocalStorage (sync 5-10MB), SessionStorage (tab-scoped 5-10MB), IndexedDB (async large datasets), Cache API (Service Worker offline assets)—each optimized for specific use cases.

- **Cookies**: HTTP headers, 4KB, sent with every request, expire
- **LocalStorage**: Synchronous key-value, 5-10MB, persists across sessions
- **SessionStorage**: Like LocalStorage but tab-scoped (cleared on close)
- **IndexedDB**: Async NoSQL database, large storage (50MB-unlimited), transactions
- **Cache API**: Service Worker asset caching, offline-first PWAs

**Key Principle**: "Choose storage based on data size, persistence, and access patterns."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Storage Comparison Table

| Feature | Cookies | LocalStorage | SessionStorage | IndexedDB | Cache API |
|---------|---------|-------------|---------------|-----------|-----------|
| **Capacity** | 4KB | 5-10MB | 5-10MB | 50MB-unlimited | Unlimited (quota) |
| **Persistence** | Expires | Forever | Tab-close | Forever | Forever |
| **Scope** | Domain + path | Origin | Tab | Origin | Origin |
| **Accessibility** | Client + Server | Client only | Client only | Client only | Client only (SW) |
| **API** | `document.cookie` | Sync key-value | Sync key-value | Async DB | Async cache |
| **HTTP** | Sent with requests | No | No | No | No |
| **Use Case** | Auth tokens | Settings | Form data | Large datasets | Offline assets |

---

### 1. Cookies

**Purpose**: Small data sent with every HTTP request.

**API**:
```javascript
// Set cookie
document.cookie = "user=john; max-age=3600; path=/; secure; samesite=strict";

// Read cookies (all at once)
const cookies = document.cookie;
// "user=john; theme=dark; session=abc123"

// Parse cookies
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

const user = getCookie('user'); // "john"

// Delete cookie (set max-age=0)
document.cookie = "user=; max-age=0";
```

**Cookie Attributes**:
```javascript
document.cookie = "token=abc123;" +
  "max-age=3600;" +        // Expires in 1 hour (seconds)
  "expires=Wed, 21 Oct 2025 07:28:00 GMT;" + // Or absolute date
  "path=/;" +              // Available on all paths
  "domain=.example.com;" + // Available on subdomains
  "secure;" +              // HTTPS only
  "samesite=strict";       // CSRF protection

// SameSite values:
// - strict: No cross-site requests (most secure)
// - lax: GET requests only (default)
// - none: All cross-site (requires Secure)
```

**Limitations**:
- **Size**: 4KB per cookie, ~50 cookies per domain
- **Performance**: Sent with EVERY request (bloats headers)
- **Security**: Accessible by JavaScript (XSS risk unless `httponly`)

**Best Practices**:
```javascript
// ✅ GOOD: Secure auth token (httponly, secure, samesite)
// Set by server (httponly can't be read by JS):
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Strict; Max-Age=3600

// ❌ BAD: Large data in cookies (sent with every request)
document.cookie = "data=" + JSON.stringify(largeObject); // BAD

// ✅ GOOD: Use localStorage for large data
localStorage.setItem('data', JSON.stringify(largeObject));
```

---

### 2. LocalStorage

**Purpose**: Persistent key-value storage (survives browser close).

**API**:
```javascript
// Set item
localStorage.setItem('theme', 'dark');
localStorage.setItem('user', JSON.stringify({ name: 'John', age: 30 }));

// Get item
const theme = localStorage.getItem('theme'); // 'dark'
const user = JSON.parse(localStorage.getItem('user')); // { name: 'John', age: 30 }

// Remove item
localStorage.removeItem('theme');

// Clear all
localStorage.clear();

// Check existence
if (localStorage.getItem('theme')) {
  // Theme exists
}

// Iterate keys
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(key, value);
}
```

**Capacity**: 5-10MB (browser-dependent).

**Scope**: Origin (protocol + domain + port).
```
https://example.com:443     → Separate storage
https://sub.example.com:443 → Separate storage
http://example.com:80       → Separate storage
```

**Synchronous** (blocks Main Thread):
```javascript
// ❌ BAD: Large data (blocks UI)
const large = JSON.stringify(new Array(1000000).fill('data')); // ~8MB
localStorage.setItem('large', large); // Blocks Main Thread 50-200ms

// ✅ BETTER: Use IndexedDB (async) for large data
```

**Events** (cross-tab synchronization):
```javascript
// Tab 1: Set item
localStorage.setItem('theme', 'dark');

// Tab 2: Listen for changes
window.addEventListener('storage', (event) => {
  console.log('Key changed:', event.key);        // 'theme'
  console.log('Old value:', event.oldValue);     // 'light'
  console.log('New value:', event.newValue);     // 'dark'
  console.log('URL:', event.url);                // Tab 1 URL
  
  // Update UI
  applyTheme(event.newValue);
});

// Note: Event fires in OTHER tabs (not the tab that made the change)
```

**Use Cases**:
- User preferences (theme, language)
- Settings (collapsed sidebar, font size)
- Cached API responses (small datasets)
- Draft content (autosave)

**Limitations**:
- Synchronous (blocks Main Thread)
- 5-10MB limit (varies by browser)
- Only strings (must JSON.stringify/parse)
- No transactions (can corrupt data if write interrupted)

---

### 3. SessionStorage

**Purpose**: Like LocalStorage but tab-scoped (cleared on tab close).

**API** (same as LocalStorage):
```javascript
sessionStorage.setItem('formData', JSON.stringify(formValues));
const formData = JSON.parse(sessionStorage.getItem('formData'));
sessionStorage.removeItem('formData');
sessionStorage.clear();
```

**Scope**: Tab-specific (separate per tab, even same URL).
```
Tab 1: sessionStorage.setItem('count', '1');
Tab 2: sessionStorage.setItem('count', '2');

// Tab 1: getItem('count') → '1'
// Tab 2: getItem('count') → '2'
// Separate storage
```

**Lifecycle**:
```
Open tab          → sessionStorage created
Navigate pages    → sessionStorage persists (same tab)
Refresh page      → sessionStorage persists
Duplicate tab     → sessionStorage COPIED to new tab
Close tab         → sessionStorage CLEARED
```

**Use Cases**:
- Multi-step forms (wizard progress)
- Temporary filters (search state)
- Single-session data (shopping cart)
- Tab-specific state

**Example** (form wizard):
```javascript
// Step 1: Save data
function saveStep1(data) {
  const wizard = JSON.parse(sessionStorage.getItem('wizard') || '{}');
  wizard.step1 = data;
  sessionStorage.setItem('wizard', JSON.stringify(wizard));
}

// Step 2: Save data
function saveStep2(data) {
  const wizard = JSON.parse(sessionStorage.getItem('wizard') || '{}');
  wizard.step2 = data;
  sessionStorage.setItem('wizard', JSON.stringify(wizard));
}

// Step 3: Retrieve all data
function submitWizard() {
  const wizard = JSON.parse(sessionStorage.getItem('wizard') || '{}');
  // wizard = { step1: {...}, step2: {...} }
  
  submitForm(wizard);
  sessionStorage.removeItem('wizard');
}

// If page refreshed during wizard, data persists (same tab)
```

---

### 4. IndexedDB

**Purpose**: Async NoSQL database for large datasets.

**Characteristics**:
- **Capacity**: 50MB (Safari) to unlimited (Chrome, ask permission at ~1GB)
- **Async**: Doesn't block Main Thread
- **Transactions**: ACID guarantees (atomicity, consistency, isolation, durability)
- **Indexes**: Fast queries (like SQL indexes)
- **Types**: Stores any JS value (objects, Blob, File)

**API** (low-level, verbose):
```javascript
// Open database
const request = indexedDB.open('myDatabase', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  
  // Create object store (like table)
  const store = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
  
  // Create indexes (for queries)
  store.createIndex('email', 'email', { unique: true });
  store.createIndex('age', 'age', { unique: false });
};

request.onsuccess = (event) => {
  const db = event.target.result;
  
  // Write data (transaction)
  const transaction = db.transaction(['users'], 'readwrite');
  const store = transaction.objectStore('users');
  
  store.add({ name: 'John', email: 'john@example.com', age: 30 });
  store.add({ name: 'Jane', email: 'jane@example.com', age: 25 });
  
  transaction.oncomplete = () => {
    console.log('Transaction complete');
  };
};

// Read data
function getUser(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const user = await getUser(1); // { id: 1, name: 'John', ... }

// Query by index
function getUsersByAge(minAge) {
  return new Promise((resolve) => {
    const transaction = db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const index = store.index('age');
    
    const range = IDBKeyRange.lowerBound(minAge);
    const results = [];
    
    index.openCursor(range).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
}

const adults = await getUsersByAge(18); // All users age >= 18
```

**Wrapper Libraries** (easier API):

**Dexie.js**:
```javascript
import Dexie from 'dexie';

const db = new Dexie('myDatabase');

// Define schema
db.version(1).stores({
  users: '++id, name, email, age' // ++id = autoIncrement
});

// Add data
await db.users.add({ name: 'John', email: 'john@example.com', age: 30 });

// Get data
const user = await db.users.get(1);

// Query
const adults = await db.users.where('age').aboveOrEqual(18).toArray();

// Update
await db.users.update(1, { age: 31 });

// Delete
await db.users.delete(1);
```

**Use Cases**:
- Offline-first apps (sync data when online)
- Large datasets (product catalog, email archive)
- Media files (images, videos)
- Complex queries (filtering, sorting)
- Progressive Web Apps (PWA)

---

### 5. Cache API

**Purpose**: Service Worker asset caching for offline-first PWAs.

**API**:
```javascript
// Service Worker (sw.js)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/styles/main.css',
        '/scripts/app.js',
        '/images/logo.png'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response or fetch from network
      return response || fetch(event.request);
    })
  );
});
```

**Main Thread API**:
```javascript
// Store response
const response = await fetch('/api/data');
const cache = await caches.open('api-cache');
await cache.put('/api/data', response.clone());

// Retrieve cached response
const cachedResponse = await caches.match('/api/data');
if (cachedResponse) {
  const data = await cachedResponse.json();
}

// Delete cache
await caches.delete('api-cache');

// List all caches
const cacheNames = await caches.keys();
```

**Use Cases**:
- Offline web apps (PWA)
- Static asset caching (CSS, JS, images)
- API response caching (stale-while-revalidate)
- Background sync (queue failed requests)

**Cache Strategies**:

**1. Cache-First**:
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
```

**2. Network-First**:
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache for next time
        caches.open('dynamic').then((cache) => {
          cache.put(event.request, response.clone());
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

**3. Stale-While-Revalidate**:
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        caches.open('dynamic').then((cache) => {
          cache.put(event.request, response.clone());
        });
        return response;
      });
      
      return cached || fetchPromise;
    })
  );
});
```

---

### Storage Quotas

**Quota Limits**:
```
Safari:
├── LocalStorage: 5MB
├── IndexedDB: 50MB
└── Cache API: 50MB

Chrome:
├── LocalStorage: 10MB
├── IndexedDB: 60% of available disk space
└── Cache API: 60% of available disk space

Firefox:
├── LocalStorage: 10MB
├── IndexedDB: 50% of available disk space
└── Cache API: 50% of available disk space
```

**Check Quota**:
```javascript
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  console.log('Used:', estimate.usage, 'bytes');
  console.log('Quota:', estimate.quota, 'bytes');
  console.log('Percentage:', (estimate.usage / estimate.quota * 100).toFixed(2) + '%');
}

// Example output:
// Used: 157,286,400 bytes (150MB)
// Quota: 10,737,418,240 bytes (10GB)
// Percentage: 1.46%
```

**Request Persistent Storage** (prevent eviction):
```javascript
if (navigator.storage && navigator.storage.persist) {
  const isPersisted = await navigator.storage.persist();
  console.log('Persistent:', isPersisted); // true = won't be evicted
}
```

---

## 3. Clear Real-World Examples

### Example 1: Gmail – IndexedDB for Email Archive

**Challenge**: Store 10,000 emails offline (50MB+).

**Solution**: IndexedDB with indexes:
```javascript
const db = new Dexie('GmailCache');

db.version(1).stores({
  emails: '++id, from, subject, *labels, date'
  // *labels = multi-entry index (array)
});

// Store emails
await db.emails.bulkAdd(emails);

// Query by label
const inbox = await db.emails.where('labels').equals('inbox').toArray();

// Full-text search (subject)
const results = await db.emails.where('subject').startsWithIgnoreCase('meeting').toArray();
```

**Result**: Instant offline access to emails (no network).

---

### Example 2: Twitter – Cache API for Offline PWA

**Challenge**: Show tweets offline.

**Solution**: Service Worker caching:
```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/tweets')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          caches.open('tweets').then((cache) => {
            cache.put(event.request, response.clone());
          });
          return response;
        });
        
        return cached || fetchPromise; // Show cached immediately
      })
    );
  }
});
```

**Result**: Tweets load instantly (cached), update in background.

---

### Example 3: Figma – SessionStorage for Undo/Redo

**Challenge**: Preserve undo history during page refresh.

**Solution**: SessionStorage (tab-scoped):
```javascript
// Save history on change
function saveHistory() {
  sessionStorage.setItem('history', JSON.stringify(undoStack));
}

// Restore on page load
function restoreHistory() {
  const history = sessionStorage.getItem('history');
  if (history) {
    undoStack = JSON.parse(history);
  }
}

// Persists during refresh (same tab), cleared on tab close
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Compare browser storage options."

**Answer**:

"Browser offers **5 storage mechanisms** with different trade-offs:

---

### Comparison

| Storage | Capacity | Persist | Scope | API | HTTP | Use Case |
|---------|----------|---------|-------|-----|------|----------|
| **Cookies** | 4KB | Expires | Domain | Sync | ✅ Sent | Auth tokens |
| **LocalStorage** | 5-10MB | Forever | Origin | Sync | ❌ | Settings |
| **SessionStorage** | 5-10MB | Tab-close | Tab | Sync | ❌ | Form data |
| **IndexedDB** | 50MB+ | Forever | Origin | Async | ❌ | Large data |
| **Cache API** | Unlimited | Forever | Origin | Async | ❌ | Offline assets |

---

### 1. Cookies

**Purpose**: Small data sent with HTTP requests.

**API**:
```javascript
document.cookie = "token=abc; max-age=3600; secure; samesite=strict";
const user = getCookie('user');
```

**Attributes**:
- `max-age`: Expiry (seconds)
- `secure`: HTTPS only
- `samesite`: CSRF protection (strict/lax/none)
- `httponly`: Server-only (no JS access, prevents XSS)

**Limitations**:
- 4KB per cookie
- Sent with EVERY request (bloats headers)
- Performance cost (unnecessary data transfer)

**Use**: Auth tokens (session, JWT).

---

### 2. LocalStorage

**Purpose**: Persistent key-value storage.

**API**:
```javascript
localStorage.setItem('theme', 'dark');
const theme = localStorage.getItem('theme');
localStorage.removeItem('theme');
```

**Capacity**: 5-10MB (browser-dependent).

**Scope**: Origin (protocol + domain + port).

**Synchronous**: Blocks Main Thread (avoid large data).

**Events**: Cross-tab sync:
```javascript
window.addEventListener('storage', (event) => {
  console.log('Changed:', event.key, event.newValue);
});
```

**Use**: User preferences, settings, cached responses (small).

---

### 3. SessionStorage

**Purpose**: Like LocalStorage but tab-scoped (cleared on close).

**API** (same as LocalStorage):
```javascript
sessionStorage.setItem('formData', JSON.stringify(data));
```

**Lifecycle**:
- Open tab: Created
- Navigate: Persists
- Refresh: Persists
- Close tab: **Cleared**
- Duplicate tab: **Copied**

**Use**: Multi-step forms, temporary filters, tab-specific state.

---

### 4. IndexedDB

**Purpose**: Async NoSQL database (large datasets).

**Characteristics**:
- **Capacity**: 50MB (Safari) to unlimited (Chrome, ask at ~1GB)
- **Async**: Doesn't block Main Thread
- **Transactions**: ACID (atomicity, consistency, isolation, durability)
- **Indexes**: Fast queries
- **Types**: Any JS value (objects, Blob, File)

**API** (with Dexie.js):
```javascript
const db = new Dexie('myDB');
db.version(1).stores({ users: '++id, name, email, age' });

await db.users.add({ name: 'John', age: 30 });
const adults = await db.users.where('age').aboveOrEqual(18).toArray();
```

**Use**: Offline apps, large datasets, media files, complex queries.

---

### 5. Cache API

**Purpose**: Service Worker asset caching (offline PWAs).

**API**:
```javascript
// Service Worker
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
```

**Strategies**:
- **Cache-First**: Fast, offline-first (static assets)
- **Network-First**: Fresh data, fallback to cache (API)
- **Stale-While-Revalidate**: Instant + background update

**Use**: Offline web apps, static assets, API caching.

---

### Storage Quotas

**Check quota**:
```javascript
const { usage, quota } = await navigator.storage.estimate();
console.log('Used:', usage / 1024 / 1024, 'MB');
console.log('Quota:', quota / 1024 / 1024, 'MB');
```

**Request persistent** (prevent eviction):
```javascript
const persisted = await navigator.storage.persist();
```

---

### Decision Tree

**Authentication**: Cookies (sent with requests, httponly).

**User preferences**: LocalStorage (persists, small data).

**Multi-step form**: SessionStorage (tab-scoped, cleared on close).

**Large datasets**: IndexedDB (async, unlimited, queries).

**Offline assets**: Cache API (Service Worker, PWA).

---

### Real-World

**Gmail**: IndexedDB for 10,000 emails (50MB+), instant offline access.

**Twitter**: Cache API (tweets cached, stale-while-revalidate).

**Figma**: SessionStorage (undo history persists during refresh).

---

### Trade-offs

**Cookies**:
- ✅ Sent with requests (auth)
- ❌ 4KB limit, performance cost (bloats headers)

**LocalStorage**:
- ✅ Simple, persistent
- ❌ Synchronous (blocks), 5-10MB limit, only strings

**SessionStorage**:
- ✅ Tab-scoped (isolated)
- ❌ Cleared on tab close, 5-10MB limit

**IndexedDB**:
- ✅ Async, unlimited, transactions
- ❌ Complex API (use Dexie), overkill for small data

**Cache API**:
- ✅ Offline-first, unlimited
- ❌ Service Worker required, complex

**Follow-up I Expect**:

Q: 'When to use LocalStorage vs IndexedDB?'
A: **LocalStorage** for small data (<5MB), simple key-value (settings, theme). **Synchronous** (blocks Main Thread). **IndexedDB** for large data (>5MB), complex queries, offline apps. **Async** (doesn't block). Example: Settings → LocalStorage, Email archive → IndexedDB.

Q: 'Security concerns with LocalStorage?'
A: **XSS vulnerability**: If attacker injects script, can read all LocalStorage. **Don't store sensitive data** (auth tokens, passwords). Use **httponly cookies** for auth (JS can't access). LocalStorage OK for non-sensitive (theme, preferences).

Q: 'How does storage event work?'
A: Fires in **other tabs** (not the tab that changed). Cross-tab synchronization. Example: Tab 1 changes theme → Tab 2 receives storage event → Tab 2 updates UI. Use for real-time sync across tabs."

---

## 6. Why & How Summary

### Why It Matters

**Data Persistence**: Store user data client-side (offline access, reduced server load, faster UX)  
**Offline-First**: Cache assets + data enables PWAs working without network  
**Performance**: Cached data instant load (no network latency), reduced server requests  
**User Experience**: Settings persist across sessions, forms preserve on refresh, smooth offline experience

### How It Works

**Cookies**: 4KB HTTP headers sent with every request, expire, attributes (max-age/secure/samesite/httponly), use for auth tokens  
**LocalStorage**: 5-10MB sync key-value origin-scoped persists forever, storage event cross-tab sync, use for settings/preferences  
**SessionStorage**: Like LocalStorage but tab-scoped cleared on tab close, persists during refresh/navigate, copied on duplicate tab, use for multi-step forms  
**IndexedDB**: 50MB-unlimited async NoSQL database, transactions (ACID), indexes (fast queries), stores any type (objects/Blob/File), Dexie wrapper simplifies API, use for offline apps/large datasets  
**Cache API**: Service Worker asset caching, strategies (cache-first offline-first, network-first fresh data, stale-while-revalidate instant+background), use for PWA offline assets  
**Quotas**: Safari 50MB, Chrome/Firefox 60% disk space, check with navigator.storage.estimate(), request persistent with persist() prevents eviction

**FAANG Expectation**: Compare five storage options with capacity/persistence/scope/API/use cases, Cookies (4KB sent with requests httponly secure samesite for auth), LocalStorage (5-10MB sync persistent origin-scoped for settings), SessionStorage (tab-scoped cleared on close for forms), IndexedDB (50MB+ async transactions indexes for large data), Cache API (Service Worker offline assets PWA), storage events cross-tab sync, quotas (check estimate request persist), security (XSS risk LocalStorage don't store sensitive use httponly cookies), decision tree (auth→Cookies, preferences→LocalStorage, forms→SessionStorage, large data→IndexedDB, offline→Cache API), real-world examples (Gmail IndexedDB 10K emails, Twitter Cache API stale-while-revalidate, Figma SessionStorage undo history), trade-offs (Cookies 4KB limit bloats headers, LocalStorage sync blocks, IndexedDB complex API overkill small data, Cache API Service Worker required)
