# Topic 26: Browser Storage Quotas & Eviction Policies

---

## 1. High-Level Explanation

Every browser imposes **storage quotas** on web origins — limits on how much data a site can store across localStorage, IndexedDB, Cache API (service workers), and other storage mechanisms. Understanding these quotas prevents production surprises where a user's cached data is silently deleted, breaking offline functionality or causing cache misses.

The **Storage API** (navigator.storage) allows querying usage and requesting **persistent storage** (which opts out of automatic eviction).

---

## 2. Deep-Dive

### Storage Quota Model

Browsers allocate storage per **origin** (scheme + host + port). The total budget is derived from available disk space:

| Browser | Quota Model | Max per Origin |
|---|---|---|
| Chrome / Edge | ~60% of free disk space (shared across all origins) | Up to ~60% of free disk |
| Firefox | Up to 50% of free disk | Up to 2GB per origin (temporary) |
| Safari | ~1GB per origin by default | Can grow with user interaction |

**Chrome's allocation example:**
- Device has 100GB disk, 20GB free
- Total quota pool: ~12GB (60% of 20GB)
- Per origin: gets a "fair share" of the pool, never exceeds pool total

### Storage Types and Their Eviction Behaviour

| Storage Type | Quota Scope | Eviction | Persistent Option |
|---|---|---|---|
| **localStorage** | ~5–10MB per origin | Manual (clear/errors) | N/A — always persistent |
| **sessionStorage** | ~5–10MB per origin | Tab close | N/A |
| **IndexedDB** | Part of storage quota | Under quota pressure | Via Storage API |
| **Cache API** | Part of storage quota | Under quota pressure | Via Storage API |
| **OPFS** (Origin Private FS) | Part of storage quota | Under quota pressure | Via Storage API |
| **Cookies** | ~4KB per cookie, ~50 per origin | TTL / manual | N/A |

### Temporary vs Persistent Storage

**Temporary storage** (default): Browser can evict it under storage pressure (low disk space). Data deleted silently — no notification to the user.

**Persistent storage**: Browser never evicts automatically. Must be explicitly requested:
```javascript
const isPersistent = await navigator.storage.persist();
// Returns true if granted — Safari requires user gesture, Chrome auto-grants for installed PWAs
```

### Checking Usage

```javascript
const { usage, quota } = await navigator.storage.estimate();
console.log(`Used: ${(usage / 1024 / 1024).toFixed(1)}MB`);
console.log(`Quota: ${(quota / 1024 / 1024).toFixed(1)}MB`);
console.log(`Used %: ${(usage / quota * 100).toFixed(1)}%`);
```

### Eviction Policy — LRU per Origin

When the browser needs space, it evicts **entire origins** based on LRU (Least Recently Used). The least recently visited origin loses **all its storage** — IndexedDB, Cache API, OPFS — simultaneously. This is why offline apps must request persistent storage.

Safari is more aggressive: it evicts storage for origins not visited in 7 days (ITP — Intelligent Tracking Prevention).

---

## 3. Real-World Examples

### Hruday's SAP Offline Dashboard

At SAP Labs, our analytics dashboard cached ~200MB of data for offline use. After a user left for a 2-week vacation, their cached data was evicted by Safari's ITP. We added:
1. `navigator.storage.persist()` during app install (PWA)
2. A storage usage indicator in the UI
3. Graceful fallback to fetch when cache miss occurs

### Monitoring Storage Health

```javascript
// Production storage health monitor
async function checkStorageHealth(): Promise<void> {
  const { usage, quota } = await navigator.storage.estimate();
  const percentUsed = (usage / quota) * 100;
  
  if (percentUsed > 80) {
    // Evict oldest cache entries proactively
    await pruneOldestCacheEntries();
    analytics.track('storage_pressure', { percentUsed });
  }
}
```

---

## 4. Interview-Oriented Answer

**Q: "If a user installs your PWA and uses it offline, what prevents their cached data from being deleted?"**

> By default, all browser storage is **temporary** — the browser can silently delete it under disk pressure. The browser targets the LRU origin in its quota pool.
>
> To opt out of eviction, call `navigator.storage.persist()`. This transitions the origin's storage to **persistent mode**. Chrome automatically grants this for installed PWAs; Safari requires a user gesture. Firefox shows a browser permission prompt.
>
> Additionally, I'd monitor storage usage with `navigator.storage.estimate()` and proactively evict old cache entries when above 80% to prevent being caught at the quota boundary.
>
> At SAP, our offline dashboard uses the Cache API with a service worker. We request persistent storage on install, monitor usage in production via analytics, and implement a "storage full" fallback that gracefully fetches from the network when the cache is evicted.

---

## 5. Code Example

```typescript
// Storage management service for a PWA
interface StorageStatus {
  usageMB: number;
  quotaMB: number;
  percentUsed: number;
  isPersistent: boolean;
}

async function getStorageStatus(): Promise<StorageStatus> {
  const [estimate, isPersistent] = await Promise.all([
    navigator.storage.estimate(),
    navigator.storage.persisted()
  ]);
  
  return {
    usageMB: (estimate.usage ?? 0) / 1024 / 1024,
    quotaMB: (estimate.quota ?? 0) / 1024 / 1024,
    percentUsed: ((estimate.usage ?? 0) / (estimate.quota ?? 1)) * 100,
    isPersistent
  };
}

async function requestPersistentStorage(): Promise<boolean> {
  if (await navigator.storage.persisted()) return true; // already persistent
  
  const granted = await navigator.storage.persist();
  if (!granted) {
    // Safari: requires recent user interaction + https
    // Chrome: auto-grants for installed PWAs
    console.warn('Persistent storage not granted — data may be evicted under disk pressure');
  }
  return granted;
}

// Proactive cache pruning — evict old entries before browser does it for us
async function pruneOldCaches(keepCacheName: string): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name !== keepCacheName)
      .map(name => {
        console.log(`Pruning stale cache: ${name}`);
        return caches.delete(name);
      })
  );
}

// Usage in service worker install event
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await caches.open('app-v2').then(cache =>
        cache.addAll(['/index.html', '/app.js', '/styles.css'])
      );
      await pruneOldCaches('app-v2');
    })()
  );
});
```

---

## 6. Memory Aid

**"TPEL" — Temporary, Persistent, Evict, LRU**

- **T**emporary = default, silently evicted under pressure
- **P**ersistent = request via `navigator.storage.persist()`, never auto-evicted
- **E**ntire origin evicted together (IndexedDB + Cache + OPFS go together)
- **L**RU eviction = least recently visited origin goes first

**Safari rule**: Any origin not visited in 7 days is at risk under ITP.

---

## 7. Why & How Summary

**Why storage quotas exist:** Prevent any single origin from monopolising device storage. Without limits, a malicious site could fill up a disk.

**How eviction works:**
1. Device runs low on disk space
2. Browser calculates each origin's "fair share" vs actual usage
3. LRU origins get evicted — all their storage deleted atomically
4. Persistent storage origins are skipped

**Production checklist for offline apps:**
- Request `navigator.storage.persist()` during PWA install
- Monitor storage with `navigator.storage.estimate()`
- Implement proactive cache pruning above 80% usage
- Graceful fallback when cache misses (network request)
- Test Safari's ITP: simulate a 7-day absence in DevTools
