# 32. Browser Storage Options Overview
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"Browsers offer five primary storage mechanisms, each with different scope, lifetime, size limits, and use cases. `localStorage` persists indefinitely, is synchronous, limited to ~5MB, and shared across tabs of the same origin. `sessionStorage` is tab-scoped and cleared on tab close. `Cookies` are sent with every HTTP request, have a 4KB limit, and are used for authentication tokens and server-session state. `IndexedDB` is an asynchronous, transactional object store supporting gigabytes of structured data — the right choice for offline apps, image/file caches, and large datasets. The Cache API (Service Worker cache) stores HTTP request-response pairs for offline-first PWA patterns. For new APIs, the Origin Private File System (OPFS) provides near-native file performance for Wasm/heavy workloads. The core selection rule: auth tokens belong in HttpOnly cookies (not localStorage, XSS-safe), UI state goes in localStorage (small, sync), large app data goes in IndexedDB, and service worker resources go in Cache API."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Storage Comparison Table

| Feature | localStorage | sessionStorage | Cookies | IndexedDB | Cache API | OPFS |
|---|---|---|---|---|---|---|
| **Persistence** | Until cleared | Tab close | Expiry date | Until cleared | Until cleared | Until cleared |
| **Size limit** | ~5MB | ~5MB | 4KB/cookie | Hundreds MB–GB | Hundreds MB | GB+ |
| **Scope** | Origin | Tab + Origin | Origin (configurable) | Origin | Origin | Origin |
| **Async** | ❌ Sync | ❌ Sync | ❌ Sync | ✅ Async | ✅ Async | ✅ Async |
| **Server access** | ❌ | ❌ | ✅ (auto-sent) | ❌ | ❌ | ❌ |
| **Web Workers** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **XSS risk** | High (JS readable) | High | Low (if HttpOnly) | High (JS readable) | Low | Low |
| **Primary use** | UI state, settings | Temp session | Auth, session | Large data, offline | SW cache | File/Wasm |

---

### localStorage and sessionStorage

```typescript
// localStorage: synchronous, simple, strings only
localStorage.setItem('theme', 'dark');
const theme = localStorage.getItem('theme') ?? 'light';
localStorage.removeItem('theme');
localStorage.clear();

// Always serialize objects:
const settings = { fontSize: 14, language: 'en' };
localStorage.setItem('settings', JSON.stringify(settings)); // ✅
const loaded = JSON.parse(localStorage.getItem('settings') ?? '{}');

// PITFALLS:
// 1. Synchronous — blocks Main Thread for large data
// 2. Strings only — no binary data natively
// 3. No transactions — concurrent writes can corrupt (multiple tabs)
// 4. 5MB limit — QuotaExceededError if exceeded

// sessionStorage: same API, tab-scoped
sessionStorage.setItem('draft', JSON.stringify(formData));

// Detecting storage quota:
function tryStore(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded');
      return false;
    }
    throw e;
  }
}
```

### Cookies: Security-First Design

```typescript
// Cookie attributes — critical for security:

// ❌ INSECURE: JS-readable, sent over HTTP, no domain restriction
document.cookie = 'token=abc123';

// ✅ SECURE auth cookie (set by server, NOT by JS):
// Set-Cookie: token=abc123; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
//
// HttpOnly: JS CANNOT read it (XSS protection — attacker JS cannot steal token)
// Secure: only sent over HTTPS (prevents sniffing)
// SameSite=Strict: not sent on cross-site requests (CSRF protection)
// Max-Age: explicit expiry (vs session cookie which expires on browser close)

// Reading cookies from JS (only non-HttpOnly cookies):
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(';').shift()!;
  return null;
}

// Cookie API (newer, async):
const cookieStore = window.cookieStore; // Chrome 87+
if (cookieStore) {
  const cookie = await cookieStore.get('preference');
  await cookieStore.set({ name: 'preference', value: 'dark', sameSite: 'strict' });
}
```

**Security rule:** Never store JWT tokens or session tokens in `localStorage` or `sessionStorage`. They are readable by any script on the page (XSS vulnerability). Store auth tokens **only** in `HttpOnly` cookies set by the server.

### IndexedDB: The Right Choice for Large/Structured Data

```typescript
// IndexedDB: async, transactional, object store (NoSQL)

// Opening a database:
function openDB(name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Create object stores (schema migrations here):
      if (!db.objectStoreNames.contains('tiles')) {
        const store = db.createObjectStore('tiles', { keyPath: 'id' });
        store.createIndex('by-category', 'category', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Type-safe IDB wrapper:
interface TileRecord {
  id: string;
  category: string;
  data: ArrayBuffer;
  updatedAt: number;
}

class TileStorage {
  constructor(private db: IDBDatabase) {}

  put(tile: TileRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tiles', 'readwrite');
      const req = tx.objectStore('tiles').put(tile);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  get(id: string): Promise<TileRecord | undefined> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tiles', 'readonly');
      const req = tx.objectStore('tiles').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  getByCategory(category: string): Promise<TileRecord[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tiles', 'readonly');
      const index = tx.objectStore('tiles').index('by-category');
      const req = index.getAll(category);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

// Best practice: use idb library (Google/Jake Archibald) for Promise-based API:
// import { openDB } from 'idb';
// const db = await openDB('myapp', 1, { upgrade(db) { db.createObjectStore('tiles', { keyPath: 'id' }) }});
// await db.put('tiles', tileRecord);
// const tile = await db.get('tiles', id);
```

### Cache API: Service Worker HTTP Caching

```typescript
// Cache API stores Request → Response pairs
// Used by Service Workers for offline-first PWAs

// In service worker:
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open('static-v1').then(cache =>
      cache.addAll([
        '/',
        '/app.js',
        '/styles.css',
        '/manifest.json',
      ])
    )
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached; // Cache hit: serve offline

      return fetch(event.request).then(response => {
        // Cache new responses for future offline use:
        if (response.status === 200) {
          const cloned = response.clone();
          caches.open('dynamic-v1').then(cache => cache.put(event.request, cloned));
        }
        return response;
      });
    })
  );
});

// Accessible from main thread too:
const cache = await caches.open('static-v1');
const cachedResponse = await cache.match('/api/tiles');
```

---

### Storage Selection Decision Tree

```
What are you storing?

Auth token / session credential?
  → HttpOnly Secure SameSite=Strict cookie (server-set)
  ↳ NEVER localStorage (XSS vulnerable)

Small UI state (theme, preferences, <5KB)?
  → localStorage (synchronous simplicity)
  ↳ With key namespacing: 'myapp:theme'

Tab-specific state (current wizard step, temp form data)?
  → sessionStorage

Large/structured data (documents, images, offline data)?
  → IndexedDB
  ↳ idb library for ergonomic API

HTTP response caching (offline-first, PWA shell)?
  → Cache API (in Service Worker)

Binary file / high-performance file I/O?
  → OPFS (Origin Private File System)

Temporary in-memory data (per session, never needs to survive)?
  → JavaScript variables (fastest, GC-managed, no storage overhead)
```

---

### ⚠️ Anti-Patterns & Pitfalls

- **Storing JWT tokens in localStorage:** This is an OWASP Top 10 vulnerability (XSS). Any script (yours or injected) can read `localStorage.getItem('token')`. Use HttpOnly cookies for auth tokens — the browser sends them automatically and JS cannot read them.

- **Using localStorage for large data:** Browsers typically limit localStorage to 5MB per origin. Attempting to store more: `QuotaExceededError`. More importantly, localStorage is synchronous — reading/writing large data blocks the main thread. For > 100KB data, use IndexedDB.

- **Not handling QuotaExceededError:** Applications that write to localStorage/IndexedDB without a try/catch will throw unhandled exceptions in private browsing mode (iOS Safari private mode disables localStorage entirely, writing throws immediately even for small data).

- **IDB without versioned schema migrations:** When updating IndexedDB schema (adding a new object store or index), the `onupgradeneeded` function must be versioned properly. Forgetting to increment the version number means the migration never runs for existing users with cached databases.

- **Caching authentication-sensitive API responses in Cache API:** The Cache API stores entire HTTP responses. Never cache responses containing bearer tokens, PII, or session-specific data in the Cache API — cached responses persist after logout and can be served to the next user on a shared machine.

---

## 🏭 3. Real-World Examples

**SAP Fiori — IndexedDB for tile data cache:**

SAP Fiori's tile catalog contained 600+ application tiles with metadata (titles, icons, descriptions). Loading all from server on every navigation took 800ms. Solution: IndexedDB cache with a `version` key. On first load → fetch all tiles from API → store in IDB. Subsequent navigations: load from IDB (< 20ms). Invalidate when server returns a new version header. Cache size: ~8MB (well within IndexedDB limits). Result: launchpad perceived as "instant" after first load.

**Salesforce — HttpOnly cookies for session tokens:**

Salesforce's authentication is a prime example of correct cookie security: session tokens are stored in server-set HttpOnly cookies with `Secure` and `SameSite=None; Secure` (SameSite=None required for cross-domain iframe embedding in Experience Cloud). JavaScript cannot read the session token — which protects it from the XSS vulnerabilities that would otherwise plague any page where user-generated content is rendered.

**Bosch Industrial — sessionStorage for wizard state:**

Bosch's device registration wizard (5 steps) needed to preserve progress if the user accidentally navigated away within the same tab. Solution: `sessionStorage` serialized wizard state on each step transition. `beforeunload` warned the user. On returning (browser back + same tab session), `sessionStorage` restored state. Tab close = state cleared (correct behavior — incomplete device registrations shouldn't persist).

**Adobe Photoshop Web — OPFS for document storage:**

Adobe's Photoshop web saves PSD documents to the Origin Private File System for near-native file performance. OPFS allows synchronous file I/O from Web Workers (via the synchronous access handle), enabling the WebAssembly Photoshop engine (which expects synchronous filesystem APIs from C++ stdio) to read/write PSD files without async overhead. This is the primary reason for OPFS adoption in production — it bridges the gap between native app file I/O and browser sandboxing.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim)

> "Browsers have five main storage options. localStorage: synchronous, ~5MB, persistent, origin-scoped — for small UI state like user preferences. sessionStorage: same API, clears on tab close — for wizard steps, temp form state. Cookies: sent with every request, 4KB limit — authentication tokens should ONLY be in HttpOnly Secure SameSite=Strict cookies set by the server, never localStorage. IndexedDB: async, transactional, GB-range — the right choice for large structured data, offline apps, binary assets. Cache API: stores HTTP responses for Service Worker offline-first patterns.

> The most common interview mistake is saying 'store JWT in localStorage' — this is an XSS vulnerability since any script can read localStorage. HttpOnly cookies prevent JS access entirely.

> At SAP, I built an IndexedDB tile cache: 600 tile records stored on first load, served from IDB in subsequent navigations — cutting 800ms API load to 20ms cache read."

---

### Likely Follow-up Questions

1. **Why is localStorage a security risk for auth tokens?** → localStorage is accessible by any JavaScript code running on the page. In an XSS attack, injected malicious script can run `localStorage.getItem('token')` and exfiltrate the token. HttpOnly cookies cannot be read by JavaScript at all (browser enforces this at the HTTP layer), making XSS token theft impossible.

2. **When would you choose IndexedDB over localStorage?** → When: data is > 100KB (quota and sync-blocking concerns), data is structured (objects with multiple fields, needs querying/indexing), data is binary (ArrayBuffer, Blob), or data changes frequently (transactions prevent corruption). localStorage is only appropriate for small, string-based config/preferences.

3. **What is the difference between Cache API and IndexedDB?** → Cache API stores HTTP request-response pairs (keyed by Request URL), designed for Service Worker offline caching of network resources. IndexedDB stores arbitrary JavaScript objects/binary data keyed by developer-defined keys. They're complementary: Cache API caches HTML/CSS/JS/images for offline shell; IndexedDB caches API data and app state.

4. **How does sessionStorage differ from localStorage?** → sessionStorage is scoped to the tab AND page session. It's created fresh when a tab opens and destroyed when the tab closes. It's also not shared between tabs (even of the same origin) — each tab has its own sessionStorage. localStorage is shared across all tabs of the same origin.

---

## 💻 5. Code Example

```typescript
// DEMO 1: Type-safe localStorage wrapper
class LocalStore<T> {
  constructor(
    private key: string,
    private defaultValue: T
  ) {}

  get(): T {
    try {
      const raw = localStorage.getItem(this.key);
      return raw !== null ? (JSON.parse(raw) as T) : this.defaultValue;
    } catch {
      return this.defaultValue;
    }
  }

  set(value: T): boolean {
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        return false;
      }
      throw e;
    }
  }

  remove(): void {
    localStorage.removeItem(this.key);
  }
}

interface ThemeSettings { mode: 'light' | 'dark'; fontSize: number; }
const themeStore = new LocalStore<ThemeSettings>('app:theme', { mode: 'light', fontSize: 14 });

const theme = themeStore.get();
themeStore.set({ mode: 'dark', fontSize: 16 });

// DEMO 2: IndexedDB with idb-style Promise wrapper (simplified)
class AppDatabase {
  private db: IDBDatabase | null = null;

  async open(): Promise<void> {
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('sap-fiori-cache', 2);

      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        if (oldVersion < 1) {
          db.createObjectStore('tiles', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          // Version 2 migration: add index
          const tx = (event.target as IDBOpenDBRequest).transaction!;
          tx.objectStore('tiles').createIndex('by-app-id', 'appId');
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async put<T>(storeName: string, item: T): Promise<void> {
    if (!this.db) throw new Error('DB not opened');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    if (!this.db) throw new Error('DB not opened');
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}

// DEMO 3: Storage selection factory (decision tree implemented)
type StorageType = 'cookie' | 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory';

function recommendStorage(
  sensitiveAuth: boolean,
  sizeBytesEstimate: number,
  needsPersistence: boolean
): StorageType {
  if (sensitiveAuth) return 'cookie'; // HttpOnly cookie (server-side)
  if (sizeBytesEstimate > 100_000) return 'indexedDB'; // Large data
  if (!needsPersistence) return 'memory'; // In-memory / sessionStorage
  if (sizeBytesEstimate < 5_000) return 'localStorage'; // Small persistent
  return 'indexedDB'; // Default for medium structured data
}

console.log(recommendStorage(true, 100, true));        // cookie
console.log(recommendStorage(false, 500_000, true));   // indexedDB  
console.log(recommendStorage(false, 1_000, false));    // memory
console.log(recommendStorage(false, 2_000, true));     // localStorage
```

---

## 🧠 6. Memory Aid

**Mental Model:**
Think of browser storage as a building with different rooms:
- **Cookie jar** (locked drawer): automatic, sent with every request to the server, can be made JS-proof (HttpOnly). 4KB limit.
- **Whiteboard** (localStorage): shared by all tabs, always visible, easy to read/write, but if something important is written there and a hacker gets in, they can read it.
- **Sticky note** (sessionStorage): on your personal desk, torn up when you leave (tab closes).
- **Filing cabinet** (IndexedDB): for large organized documents, needs a key to open each drawer, async, can hold gigabytes.
- **Shelf for downloaded pages** (Cache API): for service workers to put web page copies — offline reading.

**Use case → Storage:**
```
Auth token → Cookie (HttpOnly)
Settings (<5KB) → localStorage
Wizard step → sessionStorage  
Offline data/files → IndexedDB
SW resource cache → Cache API
```

**Mnemonic: CLocks SIC** — **C**ookie (auth), **L**ocalStorage (small settings), **S**essionStorage (tab-temp), **I**ndexedDB (large structured), **C**ache API (SW offline).

**If you go blank:** *"5 options: cookie (auth, server-set, HttpOnly), localStorage (small sync persistent), sessionStorage (tab-scoped), IndexedDB (large async structured), Cache API (SW offline). NEVER put auth tokens in localStorage — XSS risk. IndexedDB for anything > 100KB."*

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **Security:** The most critical storage decision is auth token placement. Storing JWT in localStorage (common pattern seen online) is an OWASP Top 10 vulnerability — XSS can steal it. HttpOnly cookies prevent this at the browser level. This distinction alone is a senior/staff-level signal in interviews.
→ **Performance:** Wrong storage choice causes measurable UX issues. Synchronous localStorage blocks the main thread for large data reads (> 100KB → 10-50ms pause). IndexedDB's async non-blocking reads avoid this. For SAP's 600-tile cache: localStorage is impractical (5MB limit, sync blocking), IndexedDB is the right tool.
→ **Business:** Offline-first capability (particularly relevant for Progressive Web Apps and field apps like Salesforce mobile) requires IndexedDB + Cache API working together. IndexedDB stores API responses for offline display; Cache API stores the app shell for offline navigation. This matters for Salesforce Field Service agents working in areas with intermittent connectivity.

**How it works (3 sentences):**
Browser storage is a five-tier system: cookies (4KB, server-accessible, security-critical via HttpOnly + SameSite flags), localStorage and sessionStorage (synchronous string stores with ~5MB limit, differing only in lifetime), IndexedDB (asynchronous transactional object-store database supporting GB-scale structured data, accessible from Workers), and the Cache API (asynchronous HTTP request-response store used by Service Workers for offline-first caching). The security boundary is most critical for authentication: `HttpOnly` cookies set by the server are invisible to JavaScript (preventing XSS token theft), making them the only secure storage for session tokens, while `localStorage` credentials are trivially stealable by injected scripts. The correctness boundary matters at scale: `localStorage` is synchronous, blocks the Main Thread, and has a hard 5MB limit — making `IndexedDB` mandatory for any application storing > 100KB of data, structured records, binary assets, or offline sync data.

**Company relevance:**
- **Microsoft:** Azure Portal stores user preferences and UI state in localStorage, auth session in HttpOnly cookies managed by MSAL (Microsoft Authentication Library). Azure AD authentication flow explicitly avoids localStorage for token storage, using in-memory + refresh token in HttpOnly cookies.
- **Adobe:** Photoshop Web uses OPFS (Origins Private File System) for PSD document storage — the newest storage primitive, enabling synchronous Wasm file I/O. Adobe is a primary use-case driver for OPFS specification development.
- **Salesforce:** Salesforce1 mobile app uses IndexedDB extensively for offline record sync. Service Cloud agents work offline and all CRM data changes sync when connectivity is restored. The Chrome team worked with Salesforce engineering on IndexedDB quota handling for their large dataset use case.
- **Cisco:** WebEx stores meeting history, chat transcripts, and contact lists in IndexedDB for offline viewing. Meeting recordings are too large for IndexedDB (100MB+) and are instead served from the CDN with Service Worker Cache API caching for recently viewed recordings.

---
✅ **Topic 32/486 complete.**
→ **Continuing to Topic 33: Storage Quotas & Eviction Policies**
