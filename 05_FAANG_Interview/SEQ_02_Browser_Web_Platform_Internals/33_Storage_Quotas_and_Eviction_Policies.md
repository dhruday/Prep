# 33. Storage Quotas & Eviction Policies
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"Browser storage quotas determine how much data an origin can store across IndexedDB, Cache API, and localStorage. Chromium uses a pooled-then-per-origin quota system: the global pool is typically 80% of disk space, and each origin gets up to 60% of the total pool or a dynamic fraction. When disk space is low, the browser evicts storage using an LRU (Least Recently Used) policy, removing data from origins that haven't been accessed recently. Persistent storage (via `navigator.storage.persist()`) grants an origin 'durable' status — meaning it won't be evicted automatically; eviction then requires user action. The Storage Manager API (`navigator.storage.estimate()`) lets you query your quota and current usage. For production PWAs, you should always check available quota before large writes, and request persistent storage for critical offline data. On iOS Safari, the storage limit is 50MB without persistense request and data is evicted after 7 days of no page visit."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Chromium Storage Quota Model

```
Storage pool (Chromium / Chrome):
  Available pool = 80% of total disk free space
  
  Each origin's quota:
    Dynamic: 60% of available pool (soft cap — may be lower in practice)
    Minimum guaranteed: ~6% of available pool
    
  Example: 500GB disk, 200GB free
    Pool = 160GB (80% of 200GB)
    Per-origin limit ≈ 96GB (60% of 160GB) — soft, unlikely to grant all
    
  In practice, most sites are limited by:
    Desktop Chrome: ~1-2GB per origin in normal browsing
    Mobile Chrome: ~200-500MB per origin
    
  What counts against quota:
    ✅ IndexedDB
    ✅ Cache API (Service Worker caches)
    ✅ localStorage (in newer Chrome versions)
    ✅ OPFS (Origin Private File System)
    ❌ Cookies (separate, 4KB/cookie, ~180 cookies/domain)
    ❌ JavaScript heap (not persistent storage)
    ❌ GPU VRAM (not persistent)

Firefox storage quota:
  2GB per origin or 10% of disk space, whichever is less
  
Safari (iOS and macOS):
  Default: 50MB per site
  With persistent storage request: up to 200MB — 1GB (user grants permission)
  7-day eviction: sites not visited in 7 days have their storage cleared
    This is the most aggressive eviction policy in major browsers
    PWAs added to home screen are exempt
```

### Eviction Policies

```
Default storage (Best Effort / "best-effort" persistence):
  Browser can evict your data at any time if:
    - Device disk space is low
    - Browser's internal quota is exceeded
    - User clears browser data
    - In Safari: origin not visited in 7 days
    
  Eviction order (Chromium LRU):
    1. Sort all origins by "last used" (most recent access to any of their storage)
    2. Evict least-recently-used origins first
    3. Evict entire origin's storage (not just part of it)
    
  "Last used" is updated by:
    - Page visit
    - Service Worker fetch
    - Background sync
    - Push notification handling

Persistent storage:
  navigator.storage.persist() → Promise<boolean>
  If granted: browser moves origin to "persistent" bucket
  It will NOT be evicted automatically
  Only clearing browsing data (user action / dev tools) removes it
  
  Who gets persistence?
    Chrome: automatic for installed PWAs (added to home screen)
             automatic for sites with "high engagement" (frequent visits)
             requires user permission prompt for explicit request
    Firefox: shows permission dialog to user
    Safari: no support (all storage is best-effort)
```

### Storage Manager API

```typescript
// Check quota and usage:
async function checkStorageQuota(): Promise<void> {
  if (!navigator.storage || !navigator.storage.estimate) {
    console.log('Storage Estimation API not supported');
    return;
  }

  const estimate = await navigator.storage.estimate();

  const quota = estimate.quota ?? 0;
  const usage = estimate.usage ?? 0;
  const usagePercent = quota > 0 ? ((usage / quota) * 100).toFixed(1) : 'N/A';

  console.log({
    quotaMB: (quota / 1024 / 1024).toFixed(0),
    usageMB: (usage / 1024 / 1024).toFixed(0),
    usagePercent: `${usagePercent}%`,
    usageDetails: estimate.usageDetails, // IndexedDB, caches, etc. breakdown
  });
  
  // UsageDetails example output:
  // { indexedDB: 52428800, caches: 31457280, serviceWorkerRegistrations: 204800 }
}

// Request persistent storage:
async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) return false;

  const isPersistent = await navigator.storage.persisted();
  if (isPersistent) return true; // Already persistent

  const granted = await navigator.storage.persist();
  console.log(granted ? '✅ Persistent storage granted' : '⚠️ Best-effort only');
  return granted;
}

// Best practice: check before large writes:
async function safeWriteToCache(key: string, data: ArrayBuffer): Promise<void> {
  const estimate = await navigator.storage.estimate();
  const available = (estimate.quota ?? 0) - (estimate.usage ?? 0);
  const needed = data.byteLength;

  if (needed > available * 0.9) { // Leave 10% buffer
    console.warn(`Insufficient storage: need ${needed}, available ${available}`);
    throw new DOMException('QuotaExceededError', 'QuotaExceededError');
  }

  // Safe to write:
  const cache = await caches.open('app-data');
  await cache.put(key, new Response(data));
}
```

### iOS Safari — 7-Day Eviction Reality

```
Safari's storage behavior is the most restrictive:

Default (non-installed PWA):
  Limit: 50MB per origin
  Evicted after: 7 days without a page visit
  
  This means: If a user installs your PWA (adds to home screen in iOS),
  storage is preserved indefinitely. If they just visit the website
  without installing, ALL storage (IndexedDB, Cache API, localStorage)
  is cleared after 7 days of no visits.
  
  Impact:
    - Offline-first apps break for Safari users who don't visit weekly
    - ServiceWorker caches are wiped → full network required on next visit
    - IDB data (drafts, cached docs) → GONE
    
Mitigation:
  1. Encourage "Add to Home Screen" on iOS (gets around eviction)
  2. Fall back gracefully (detect missing cache, reload from server)
  3. Show last-sync timestamp to users: "Data may be outdated"
  4. Design for best-effort storage: assume data can disappear
  
Private browsing (Safari + Chrome + Firefox):
  Storage is sandboxed per Private Browsing session
  localStorage writes may throw QuotaExceededError immediately
  IndexedDB returns empty, writes may silently fail or throw
  Always wrap storage in try/catch
```

### Quota Exceeded Error Handling

```typescript
// Robust storage write with fallback strategy:

async function resilientIDBWrite<T>(
  db: IDBDatabase,
  storeName: string,
  item: T
): Promise<'success' | 'quota-exceeded' | 'error'> {
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = (event) => reject((event.target as IDBRequest).error);
    });
    return 'success';
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'QuotaExceededError') {
        console.warn('IDB quota exceeded — attempting cleanup');
        await evictOldEntries(db, storeName);
        return 'quota-exceeded';
      }
    }
    return 'error';
  }
}

async function evictOldEntries(db: IDBDatabase, storeName: string): Promise<void> {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
  
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.openCursor();
    
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const entry = cursor.value as { updatedAt?: number };
        if (entry.updatedAt && entry.updatedAt < cutoff) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
```

### Offline-First Storage Strategy

```
Recommended storage architecture for PWAs:

  navigator.storage.persist() → request persistent bucket
  
  navigator.storage.estimate() → check before large writes
  
  Cache API (Service Worker) → app shell, static assets, fonts
    Naming: 'static-v2' (version bumped on deploy)
    Eviction: explicitly delete old cache versions in 'activate' event
    
  IndexedDB → API data, user documents, offline queue
    Max size: set application-level limit (e.g., 200 entries)
    Eviction: TTL-based (delete entries older than N days)
    
  localStorage → minimal settings (<5KB)
    Never store: binary data, large objects, auth tokens

Service Worker cache version management:
  On activation: delete all caches except current version
  
self.addEventListener('activate', (event: ExtendableEvent) => {
  const CURRENT_CACHE = 'app-v3';
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CURRENT_CACHE)
          .map(name => caches.delete(name))
      )
    )
  );
});
```

---

### ⚠️ Anti-Patterns & Pitfalls

- **Assuming storage is always available without checking quota:** Enterprise apps deployed in corporate environments sometimes have disk quotas that affect browser storage pools. Always wrap IDB writes in try/catch for QuotaExceededError and implement an eviction strategy.

- **Not versioning Service Worker caches:** Without versioning (`'app-v1'`, `'app-v2'`), old caches accumulate with each deployment. After 10 deployments, the origin may have 10× the intended storage footprint, accelerating quota exhaustion.

- **Relying on IndexedDB for critical auth/session state:** IDB can be evicted (especially on iOS Safari). Auth state that's critical to app function (preventing blank white screen) should be readable from cookies (server-authoritative) rather than IDB.

- **Not detecting private browsing mode:** In private/incognito mode, localStorage may throw immediately, IndexedDB returns empty, and CacheAPI writes may not persist. Feature-detect storage availability at runtime and provide a fallback.

- **Storing the same data in both localStorage AND IndexedDB:** Duplication wastes quota. Choose one store per data type and use the other for different purposes.

---

## 🏭 3. Real-World Examples

**SAP Fiori — Storage quota check before large IDB writes:**

SAP Fiori's tile catalog cache was ~8MB. Before writing to IndexedDB at app startup, the code now calls `navigator.storage.estimate()` and only proceeds if available space is > 20MB (2.5× safety margin). If not, it skips the cache and loads fresh from the API on each navigation (degraded but functional mode). Additionally, tiles older than 24 hours are evicted from IDB during the next load — keeping storage footprint bounded.

**Google's Project Squoosh — Persistent storage for offline use:**

Squoosh (Google image compression tool) is a PWA. On install, it calls `navigator.storage.persist()` to ensure its WASM engine and UI assets aren't evicted. Without persistence, the 3MB WASM binary (stored in Cache API) could be evicted on a low-storage device — forcing a re-download on next use. With persistence, the PWA works offline indefinitely after initial install.

**iOS Safari 7-day eviction — Salesforce Field Service impact:**

Salesforce Field Service iOS users using Safari (not the native app) experienced data loss after extended weekends + holidays: if field engineers didn't open the PWA for 8+ days (holiday week), their offline customer records and job orders were evicted by Safari. Salesforce's fix: display a "Last synced: X days ago / Sync recommended weekly for offline access" banner, and add in-app prompting to add the PWA to home screen (which bypasses the 7-day eviction on iOS).

---

## 💬 4. Interview Execution

### Sample Answer (verbatim)

> "Browser storage quotas are different by browser. Chrome allows ~1-2GB per origin (80% of free disk, 60% per origin soft cap). Firefox: 2GB or 10% of disk. Safari is the most restrictive: 50MB default, and data is evicted after 7 days without a visit.

> There are two storage types: 'best-effort' (can be evicted when disk is low, LRU policy) and 'persistent' (won't be auto-evicted, needs navigator.storage.persist() to grant). For production PWAs with offline-critical data, always call persist() at first run.

> The Storage Manager API — navigator.storage.estimate() — lets you check quota and current usage. Best practice: check before large writes (don't surprise the user with storage failures). Handle QuotaExceededError by evicting old data first.

> iOS Safari's 7-day eviction is the biggest gotcha for PWAs: any origin not visited in 7 days loses ALL storage. The fix is to prompt users to add to home screen (which bypasses eviction) and design for graceful fallback when cache is empty."

---

### Likely Follow-up Questions

1. **What is "persistent storage" and how do you request it?** → Persistent storage means the browser guarantees not to auto-evict your data (only explicit user clearing removes it). Request via `navigator.storage.persist()` which returns a Promise<boolean>. Chrome grants it silently for high-engagement sites and installed PWAs; Firefox prompts the user. Safari doesn't support it — all Safari storage is "best-effort."

2. **What does the Storage Manager API tell you?** → `navigator.storage.estimate()` returns `{ quota, usage, usageDetails }`. `quota` is your total allowed storage in bytes. `usage` is currently used bytes. `usageDetails` breaks it down by storage type (IndexedDB, caches, etc.). Use it to: check before large writes, display "storage x% used" indicators, and detect if you're approaching the limit.

3. **How should you handle QuotaExceededError?** → Catch it explicitly in all storage writes. Strategy: (1) try to evict YOUR own old/stale data first (time-based or LRU), (2) retry the write, (3) if still failing, fail gracefully (show error to user, don't crash). Never let QuotaExceededError become an unhandled promise rejection.

4. **How does iOS Safari's 7-day eviction affect PWA design?** → All storage (IDB, Cache API, localStorage) is cleared after 7 days without a page visit. This breaks offline-first assumptions for casual users. Design mitigations: "Add to Home Screen" prompt (exempts from eviction), graceful fallback when cache is cold (show "loading from server"), weekly re-sync prompts for offline-critical data.

---

## 💻 5. Code Example

```typescript
// DEMO 1: Storage Manager utility class

class StorageManager {
  /** Check quota and usage */
  static async getUsage(): Promise<{
    quotaMB: number;
    usedMB: number;
    availableMB: number;
    usagePercent: number;
    isPersistent: boolean;
    breakdown: Record<string, number>;
  }> {
    const [estimate, isPersistent] = await Promise.all([
      navigator.storage.estimate(),
      navigator.storage.persisted(),
    ]);

    const quota = estimate.quota ?? 0;
    const usage = estimate.usage ?? 0;

    return {
      quotaMB: +(quota / 1024 / 1024).toFixed(1),
      usedMB: +(usage / 1024 / 1024).toFixed(1),
      availableMB: +((quota - usage) / 1024 / 1024).toFixed(1),
      usagePercent: quota ? +((usage / quota) * 100).toFixed(1) : 0,
      isPersistent,
      breakdown: Object.fromEntries(
        Object.entries(estimate.usageDetails ?? {}).map(([k, v]) => [k, +(v / 1024 / 1024).toFixed(1)])
      ),
    };
  }

  /** Request persistent storage (PWA offline-critical) */
  static async requestPersistence(): Promise<boolean> {
    if (!(await navigator.storage.persisted())) {
      return navigator.storage.persist();
    }
    return true; // Already persistent
  }

  /** Check if we have enough space before a large write */
  static async canWrite(bytesNeeded: number, safetyFactor = 1.5): Promise<boolean> {
    const estimate = await navigator.storage.estimate();
    const available = (estimate.quota ?? 0) - (estimate.usage ?? 0);
    return available > bytesNeeded * safetyFactor;
  }
}

// Usage at PWA init:
async function initPWAStorage(): Promise<void> {
  const usage = await StorageManager.getUsage();
  console.log(`Storage: ${usage.usedMB}MB / ${usage.quotaMB}MB (${usage.usagePercent}%)`);

  if (!usage.isPersistent) {
    const granted = await StorageManager.requestPersistence();
    if (!granted) {
      console.warn('Persistent storage not granted — data may be evicted');
      // Show UI: "Enable offline access in browser settings" for iOS users
    }
  }
}

// DEMO 2: Service Worker cache versioning and cleanup
const CURRENT_VERSION = 'app-v3';
const PRECACHE_URLS = ['/', '/app.js', '/styles.css'];

// Install
// @ts-ignore (self is ServiceWorkerGlobalScope)
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CURRENT_VERSION).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// Activate: clean up old versions
// @ts-ignore
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CURRENT_VERSION)
          .map(name => {
            console.log(`Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      )
    )
  );
});

// DEMO 3: IDB storage with TTL-based eviction
interface CachedEntry<T> {
  key: string;
  value: T;
  expiresAt: number; // Unix timestamp ms
}

class TTLCache<T> {
  constructor(
    private db: IDBDatabase,
    private storeName: string,
    private ttlMs: number
  ) {}

  async set(key: string, value: T): Promise<void> {
    const entry: CachedEntry<T> = {
      key,
      value,
      expiresAt: Date.now() + this.ttlMs,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async get(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const req = tx.objectStore(this.storeName).get(key);
      req.onsuccess = () => {
        const entry = req.result as CachedEntry<T> | undefined;
        if (!entry || entry.expiresAt < Date.now()) {
          resolve(null); // Expired or missing
        } else {
          resolve(entry.value);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  /** Purge expired entries (run periodically) */
  async purgeExpired(): Promise<number> {
    const now = Date.now();
    let deleted = 0;
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const req = tx.objectStore(this.storeName).openCursor();
      
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null;
        if (cursor) {
          const entry = cursor.value as CachedEntry<T>;
          if (entry.expiresAt < now) {
            cursor.delete();
            deleted++;
          }
          cursor.continue();
        }
      };
      
      tx.oncomplete = () => resolve(deleted);
      tx.onerror = () => reject(tx.error);
    });
  }
}
```

---

## 🧠 6. Memory Aid

**Mental Model:**
Browser storage quota is your office cubicle space. The building (browser) has a pool of space. Your cubicle (origin) gets a share of it. If the building runs low on space, they remove items from desks that haven't been used in a while (LRU eviction). If you mark your desk as "permanent" (persistent storage), they won't touch it without your permission. iOS Safari is the strictest landlord: empty desk for 7 days = items removed automatically.

**Quota quick facts:**
```
Chrome:   ~1-2GB, 80/60% model, LRU eviction
Firefox:  2GB or 10% disk, LRU eviction  
Safari:   50MB default, 7-day eviction (most aggressive)
Persistent: navigator.storage.persist() → no auto-eviction
```

**APIs:**
```
navigator.storage.estimate()  → check quota/usage
navigator.storage.persist()   → request eviction protection
navigator.storage.persisted() → check if already persistent
```

**Mnemonic: PE-7** — **P**ersist (call persist() for PWAs), **E**stimate (check before writing), **7** days (Safari eviction window to know).

**If you go blank:** *"Chrome: ~1-2GB, LRU eviction. Firefox: 2GB. Safari: 50MB, 7-day eviction. navigator.storage.estimate() for quota check. navigator.storage.persist() for permanent storage. Handle QuotaExceededError with eviction + retry. iOS PWA: add to home screen to bypass 7-day eviction."*

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Storage quota failures cause invisible app breakage: cached data silently disappears, offline mode stops working, user data is lost. For enterprise apps (SAP, Salesforce) where users expect their data to "just work," storage eviction is a critical reliability concern.
→ **Performance:** Managing storage proactively (TTL-based eviction, bounded caches, versioned Service Worker caches) keeps the storage footprint small, preventing quota exhaustion that forces the browser to evict WITHOUT regard for business priority. An app managing its own quotas controls which data is retained.
→ **Business:** Safari's 7-day eviction policy is a significant PWA adoption obstacle for iOS users. Salesforce, Adobe, and Microsoft all have explicit "Add to Home Screen" prompting in their iOS web products specifically to bypass this eviction. Understanding this limitation at architecture level enables proactive design (persistent storage request, graceful fallback, re-sync detection).

**How it works (3 sentences):**
Browser storage quotas are calculated dynamically: Chrome allocates 80% of free disk as a global pool and gives each origin up to 60% of that pool (typically 1-2GB); Firefox caps at 2GB or 10% of disk; Safari is most restrictive with a 50MB default and an aggressive 7-day no-visit eviction policy that removes ALL storage for an origin not accessed in 7 days. When space is low, browsers use LRU eviction (removing least recently accessed origins first, evicting all of that origin's storage at once), unless the origin has been granted "persistent" status via `navigator.storage.persist()` — which prevents automatic eviction and is automatically granted to installed PWAs in Chrome. Best practices require using `navigator.storage.estimate()` before large writes (to avoid unexpected `QuotaExceededError`), implementing application-level TTL-based eviction (to proactively manage footprint), versioning Service Worker caches (to prevent cache accumulation across deployments), and calling `navigator.storage.persist()` at PWA initialization for offline-critical applications.

**Company relevance:**
- **Microsoft:** Progressive Web App Teams clients (desktop web view, Teams Lite) use persistent storage grants for meeting chat history and contact IDB caches. Microsoft's PWA toolkit explicitly handles the iOS Safari 7-day case with a "Sync offline data" prompt every 6 days.
- **Adobe:** Creative Cloud web apps (Photoshop Web, XD, Fresco) use `navigator.storage.persist()` on activation to prevent eviction of the large WASM engine and project file IDB entries. Adobe tests storage assumptions in automated Playwright tests.
- **Salesforce:** Field Service mobile PWA for iOS includes a "Last synced" indicator and re-syncs customer records if the IDB cache is more than 5 days old (safety margin before Safari's 7-day eviction). The sync prompt is proactive — shown before data loss occurs.
- **Cisco:** WebEx web client caches the meeting participant directory in IndexedDB for fast friend-of-a-friend lookup. Cisco implements their own LRU eviction for this cache (max 5,000 contacts, evicting oldest-accessed entries) before the browser quota system ever needs to intervene.

---
✅ **Topic 33/486 complete.**
→ **Continuing to Topic 34: Origin Private File System (OPFS)**
