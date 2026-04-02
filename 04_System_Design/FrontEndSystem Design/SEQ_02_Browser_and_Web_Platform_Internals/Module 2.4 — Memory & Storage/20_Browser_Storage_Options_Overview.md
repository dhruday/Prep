# 20. Browser Storage Options Overview

---

## 1. High-Level Explanation (Frontend Interview Level)

Browsers provide multiple storage mechanisms, each designed for different use cases, performance profiles, and security constraints. Choosing the right storage option is a critical architectural decision that affects security, performance, capacity, and offline capability.

**The five major browser storage mechanisms:**

| Storage | Capacity | Sync/Async | Persists? | HTTP Sent? | JS Access |
|---------|----------|------------|-----------|-----------|-----------|
| **Cookies** | ~4KB | Sync | Yes (configurable) | **Yes** | Yes (unless HttpOnly) |
| **LocalStorage** | ~5-10MB | **Sync** | Yes | No | Yes |
| **SessionStorage** | ~5-10MB | **Sync** | Tab session only | No | Yes |
| **IndexedDB** | 50MB–quota | **Async** | Yes | No | Yes |
| **Cache API** | Quota-based | **Async** | Yes | No | Yes (via SW) |

**Plus newer additions:**
- **Origin Private File System (OPFS)** — High-performance file storage, async
- **Web Storage (localStorage/sessionStorage)** — Simple key-value

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Cookies

Cookies are the original browser storage — designed for server-state coordination, not client data storage.

**Key attributes:**
```http
Set-Cookie: session=abc123; 
  Path=/; 
  Domain=example.com;
  Expires=Sat, 01 Jan 2026 00:00:00 GMT;
  HttpOnly;      # Can't be accessed by JavaScript — prevents XSS token theft
  Secure;        # Only sent over HTTPS
  SameSite=Lax;  # Lax: sent on same-site + top-level navigation; Strict: same-site only; None: always (+ requires Secure)
```

**Why cookies exist for auth:**
- They are sent automatically with every HTTP request to the matching domain
- `HttpOnly` cookies cannot be stolen by XSS because JavaScript cannot read them
- The browser handles authentication — no JS code needed to add auth headers

**Cookie limitations:**
- 4KB limit per cookie (20 cookies per domain typical limit)
- Sent with every request — affects bandwidth for large cookies
- Third-party cookie deprecation (2024+) — Chrome is blocking third-party cookies
- Not suitable for large data storage

**SameSite impact on CSRF:**
```
SameSite=Lax  (default since Chrome 80): Cookie sent on top-level GET navigation, 
              NOT on cross-site POST → prevents most CSRF attacks
SameSite=Strict: Cookie never sent on cross-site request at all → safest
SameSite=None: Cross-site allowed, requires Secure attribute → for legitimate 
               cross-site use cases (third-party embeds)
```

### LocalStorage

A simple key-value store scoped to an origin (scheme + domain + port). Persists indefinitely across sessions.

**API:**
```javascript
// Synchronous — BLOCKS the main thread!
localStorage.setItem('key', JSON.stringify({ data: 'value' }));
const data = JSON.parse(localStorage.getItem('key') || '{}');
localStorage.removeItem('key');
localStorage.clear(); // Dangerous — clears ALL origin data!
```

**Critical limitation — synchronous:**
LocalStorage is **synchronous and blocks the main thread**. A read/write of a 5MB JSON blob will freeze UI. Large writes can cause significant jank.

**When to use:**
- Small, simple user preferences (theme, locale, last-selected tab)
- Non-sensitive configuration flags
- Data up to a few KB that's needed across sessions

**When NOT to use:**
- Auth tokens (XSS accessible — JS can read everything in localStorage)
- Large data (synchronous = blocking)
- Service Workers cannot access localStorage (synchronous API not available in worker context)

**Security consideration:** Any XSS vulnerability in your app can steal all localStorage data. This is why JWTs should NOT be stored in localStorage if you have any third-party scripts.

### SessionStorage

Identical API to localStorage, but:
- **Scoped to the browser tab** — new tab = new session storage
- **Cleared when tab closes** (not on page navigation within tab)
- Not shared between tabs, even for the same origin

**Use cases:**
- Multi-step form data that shouldn't persist beyond the session
- Tab-specific UI state (which accordion is open)
- Shopping cart for a single checkout flow

### IndexedDB

A fully-featured, **async, transactional, object-oriented database** built into the browser. It's the right tool for large-scale client-side storage needs.

**Capabilities:**
- Stores any structured-cloneable data (objects, arrays, Blobs, ArrayBuffers)
- Indexed queries (not just key lookups)
- Cursor-based traversal
- Transactions with rollback
- Works in Service Workers
- Capacity: typically 50% of free disk space (browsers vary; Chrome: up to ~2GB per origin)
- Async by design — no main thread blocking

**Raw API is verbose — use a library:**
```javascript
// Raw IndexedDB API (verbose but important to know)
const request = indexedDB.open('MyDatabase', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const store = db.createObjectStore('users', { keyPath: 'id' });
  store.createIndex('email', 'email', { unique: true });
};

request.onsuccess = (event) => {
  const db = event.target.result;
  const tx = db.transaction('users', 'readwrite');
  tx.objectStore('users').add({ id: 1, name: 'Alice', email: 'alice@example.com' });
};

// Modern: Use libraries like idb (Jake Archibald's wrapper)
import { openDB } from 'idb';

const db = await openDB('MyDatabase', 1, {
  upgrade(db) {
    db.createObjectStore('users', { keyPath: 'id' });
  },
});

await db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com' });
const user = await db.get('users', 1);
const allUsers = await db.getAll('users');
```

**Production use cases:**
- Offline-first apps (store full dataset for offline use)
- Client-side draft saving (document editors)
- Large configuration data
- Local search indexes
- Image/file caching when Cache API isn't suitable
- Workbox uses IndexedDB internally for cache metadata

### Cache API

The **Cache API** stores Request/Response pairs — it's designed for HTTP response caching, not arbitrary data. Used exclusively by Service Workers (and sometimes directly by pages).

```javascript
// Open or create a named cache
const cache = await caches.open('my-cache-v1');

// Cache a response
await cache.put('/api/products', new Response(JSON.stringify(products)));

// Or use add() to fetch + cache in one step
await cache.add('/images/hero.webp');
await cache.addAll(['/app.js', '/styles.css', '/offline.html']);

// Read from cache
const response = await cache.match('/api/products');
const data = response ? await response.json() : null;

// Delete stale caches
const cacheNames = await caches.keys();
await Promise.all(
  cacheNames
    .filter(name => name !== 'my-cache-v1') // Delete all other versions
    .map(name => caches.delete(name))
);
```

**Key difference from IndexedDB:**
- Cache API stores HTTP responses — proper HTTP semantics (status codes, headers, body)
- Ideal for: JS bundles, CSS, images, HTML pages (PWA shell and content)
- Not ideal for: structured app data or anything needing queries

### Origin Private File System (OPFS)

The newest storage mechanism, designed for high-performance binary file access:

```javascript
const root = await navigator.storage.getDirectory();
const fileHandle = await root.getFileHandle('data.bin', { create: true });

// Synchronous access (only in Web Workers!) — very fast
const accessHandle = await fileHandle.createSyncAccessHandle();
const buffer = new Uint8Array(1024);
accessHandle.write(buffer);  // Synchronous I/O in worker thread
accessHandle.close();
```

OPFS is used by SQLite-over-WASM (wa-sqlite), Fluent Bit, and other tools that need high-throughput file I/O in the browser.

### Storage Quota and Eviction

The `navigator.storage` API provides quota management:

```javascript
// Check available quota
const estimate = await navigator.storage.estimate();
console.log({
  quota: (estimate.quota / 1024 / 1024).toFixed(0) + 'MB',
  usage: (estimate.usage / 1024 / 1024).toFixed(0) + 'MB',
  available: ((estimate.quota - estimate.usage) / 1024 / 1024).toFixed(0) + 'MB',
});

// Request persistent storage (prevents eviction under storage pressure)
// Shows permission prompt to user in some browsers
const isPersisted = await navigator.storage.persist();
console.log('Storage persisted:', isPersisted);
```

**Storage eviction policy (without persistence):**
Browser can evict non-persistent storage under disk pressure, following LRU (least recently used) per origin. Persistent storage (`storage.persist()`) is protected from eviction.

### Security Summary

| Storage | XSS Risk | CSRF Risk | Notes |
|---------|----------|-----------|-------|
| Cookies (HttpOnly) | **None** (JS can't read) | Medium (mitigated by SameSite) | Best for auth tokens |
| Cookies (without HttpOnly) | **High** | Medium | Avoid for auth |
| LocalStorage | **High** (XSS readable) | None (not sent with requests) | Do NOT store auth tokens |
| SessionStorage | **High** | None | Same as localStorage |
| IndexedDB | **High** | None | Readable by XSS |
| Cache API | **Medium** | None | SW-gated, harder to exfiltrate |

---

## 3. Real-World Examples

### Auth Token Storage — The Right Pattern

*Controversial but important:*
- **HttpOnly Cookie** — Best security. Auth token invisible to JS, automatic CSRF protection with SameSite=Strict.
- **Memory (JS variable / state)** — Token gone on page refresh, but safe from XSS persistence. Used by financial apps.
- **LocalStorage** — Convenient but XSS-stealable. NOT recommended for sensitive tokens if you have third-party scripts.

### Figma — IndexedDB for File Caching
Figma caches design file data in IndexedDB, enabling instant reopen of recently used files. The IDB store holds compressed binary blobs of design state, with cache invalidation based on server-side version checking.

### Notion — LocalStorage for Editor Preferences + IndexedDB for Drafts
Notion stores user UI preferences (sidebar collapsed, panel sizes) in LocalStorage. Unsaved page edits are stored in IndexedDB, enabling crash recovery — "we found unsaved changes" on next load.

### Twitter Lite (PWA) — Cache API via Service Worker
Twitter Lite caches the app shell (HTML, JS, CSS, icons) in the Cache API via Service Worker, enabling instant load and offline support. API response caching uses a mix of Cache API (network first) and IndexedDB (structured query support).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"Browser storage comes in five main forms, each with a specific role. Cookies are session/auth coordination state — the only storage that's included in HTTP requests, making HttpOnly + SameSite cookies the right choice for auth tokens (they're invisible to JS, preventing XSS theft).*

*LocalStorage and SessionStorage are simple synchronous key-value stores. They're useful for small user preferences but immediately disqualify themselves for any large data (synchronous = main thread blocking) or sensitive data (fully XSS-accessible).*

*IndexedDB is the enterprise-grade client storage — async, transactional, queryable, large capacity, Service Worker compatible. For offline-first apps, draft auto-saving, or any structured client data, IndexedDB is the right answer. I'd use the `idb` wrapper library to avoid the low-level callback API.*

*The Cache API is designed for HTTP response caching — store Request/Response pairs. It's the Service Worker's native storage layer, ideal for app shell caching, API response caching, and any PWA offline strategy.*

*For auth token security: HttpOnly cookie for the actual token, with SameSite=Lax/Strict. Never localStorage for tokens when you're hosting any third-party scripts."*

### Likely Follow-up Questions

1. **"Why shouldn't you store JWTs in localStorage?"**
   → Any XSS vulnerability (including in a third-party script you loaded) can read all localStorage data. `document.cookie` doesn't expose HttpOnly cookies — localStorage has no such protection.

2. **"What's the difference between the Cache API and IndexedDB for offline apps?"**
   → Cache API is for storing HTTP responses (JS files, CSS, images, API JSON), optimized for network-layer caching. IndexedDB is for structured application data (user profile, feed items, drafts) needing queries and transactions. A full offline app uses both: Cache API for assets, IndexedDB for data.

3. **"What happens to localStorage if the user clears browser data?"**
   → It's cleared. That's a key difference from cookies with explicit expiry. For durable storage, use `navigator.storage.persist()` to request persistent storage (prompts user permission).

4. **"How large can IndexedDB get?"**
   → Browser-dependent. Chrome: up to 60% of free disk or 2GB minimum. Firefox: similar. In practice, you should monitor usage via `navigator.storage.estimate()` and handle `QuotaExceededError` gracefully.

---

## 5. Code Examples

### Storage Decision Matrix — Helper

```javascript
// Architectural decision helper
function chooseStorage(requirements) {
  const {
    needsHttpRequest,  // Must be sent with requests (auth)
    sensitiveData,     // Security-sensitive
    size,              // Approximate data size
    needsQuery,        // Need to index/query the data
    needsWorkerAccess, // Must work in Service Worker
    sessionOnly,       // Should clear on tab close
  } = requirements;
  
  if (needsHttpRequest) return 'Cookie (HttpOnly + SameSite)';
  if (sessionOnly && size < '1MB') return 'SessionStorage';
  if (!sensitiveData && size < '10KB' && !needsWorkerAccess) return 'LocalStorage';
  if (needsQuery || needsWorkerAccess || size > '100KB') return 'IndexedDB';
  if (needsHttpResponse) return 'Cache API'; // Storing network responses
  return 'IndexedDB'; // Default for complex cases
}
```

### Complete IndexedDB Wrapper with Error Handling

```javascript
import { openDB } from 'idb';

// Singleton database instance
let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB('AppDB', 2, {
    upgrade(db, oldVersion, newVersion) {
      // Version 1: basic stores
      if (oldVersion < 1) {
        db.createObjectStore('drafts', { keyPath: 'id', autoIncrement: true });
        db.createObjectStore('preferences', { keyPath: 'key' });
      }
      
      // Version 2: add index to drafts
      if (oldVersion < 2) {
        const tx = db.transaction('drafts', 'readwrite');
        tx.store.createIndex('updatedAt', 'updatedAt');
      }
    },
    blocked() {
      // Another tab has the old version open — prompt user to close other tabs
      console.warn('Database upgrade blocked. Please close other tabs.');
    },
    blocking() {
      // This tab is blocking an upgrade in another tab
      dbInstance.close();
      window.location.reload();
    },
  });
  
  return dbInstance;
}

// Type-safe API
export const storage = {
  async saveDraft(content) {
    const db = await getDB();
    return db.put('drafts', { content, updatedAt: Date.now() });
  },
  
  async getRecentDrafts(limit = 10) {
    const db = await getDB();
    const index = db.transaction('drafts').store.index('updatedAt');
    return index.getAll(IDBKeyRange.lowerBound(0), limit);
  },
  
  async setPreference(key, value) {
    const db = await getDB();
    return db.put('preferences', { key, value });
  },
  
  async getPreference(key, defaultValue = null) {
    const db = await getDB();
    const result = await db.get('preferences', key);
    return result?.value ?? defaultValue;
  },
};
```

---

## 6. Why & How Summary

**Why it matters:**
Storage choices directly affect security (auth token theft, XSS attack surface), performance (synchronous LocalStorage blocking vs async IndexedDB), and user experience (offline capability, draft auto-save, fast data re-access). Incorrect storage choices are a major source of security vulnerabilities in production applications (stored XSS via localStorage token theft) and performance regressions (multi-MB synchronous localStorage reads on every navigation). Storage architecture is a core design decision in any production frontend system.

**How it works:**
Each storage mechanism is implemented differently at the browser level: Cookies are HTTP protocol constructs managed by the browser's network stack and included in requests. LocalStorage and SessionStorage are synchronous JavaScript APIs backed by in-process databases (LevelDB in Chrome) accessed on the main thread. IndexedDB is an async API backed by a persistent database engine (also LevelDB in Chrome), with operations routed through IPC to a separate database process. The Cache API is managed by the Service Worker's context and stores serialized HTTP responses. All storage (except HttpOnly cookies) is accessible to JavaScript at the origin level, making XSS vulnerabilities able to read all stored non-cookie data. Storage quota management ensures origins can't exhaust device disk space, with the browser enforcing limits and evicting best-effort (non-persisted) storage under disk pressure.
