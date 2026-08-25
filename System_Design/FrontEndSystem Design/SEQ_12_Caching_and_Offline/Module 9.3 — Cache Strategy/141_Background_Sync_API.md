# 141. Background Sync API ★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

The **Background Sync API** is a Service Worker API that defers network requests until the user has a reliable network connection, even if they have already closed the browser tab. The classic problem it solves: a user fills out a form while on an unreliable network (train, elevator, spotty conference WiFi), submits it, and the request fails silently or shows an error. With Background Sync, the failed request is queued in IndexedDB, and the Service Worker is woken up by the browser to retry the request when connectivity returns — even if the user is no longer on the page. For frontend engineers building offline-capable apps, field service tools, or forms on mobile, Background Sync is the mechanism that makes "offline-first" actually work for write operations. The Workbox `BackgroundSyncPlugin` is the production-ready implementation that handles all edge cases including retry limits, persistent storage, and queue cleanup.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### The Problem Background Sync Solves

```
WITHOUT Background Sync:
──────────────────────────────────────────────────────────
User fills form → submits → network drops → request fails
→ Browser shows error or silently fails
→ User loses their work / has to re-fill form
→ Data not synced to server
→ Poor UX, especially on mobile

WITH Background Sync:
──────────────────────────────────────────────────────────
User fills form → submits → SW intercepts
→ SW stores request in IndexedDB queue
→ Shows optimistic success UI to user
→ User closes tab ← doesn't matter!
→ Browser wakes SW when network returns
→ SW retries queued request
→ Server receives data
→ Data is consistent
```

### One-Time Sync (Basic Background Sync)

```typescript
// Registration in page context (not SW):
async function submitFormWithSync(formData: FormData): Promise<void> {
  // First: persist data locally (in case we need to retry)
  const submission = {
    id: crypto.randomUUID(),
    data: Object.fromEntries(formData),
    timestamp: Date.now(),
  };
  
  await saveToIndexedDB('pending-submissions', submission);
  
  // Show optimistic UI
  showSuccessMessage('Submission saved — will sync when online');
  
  // Register sync tag with Service Worker
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('form-submission');
    // SW will fire a 'sync' event with tag 'form-submission' when online
  } else {
    // Fallback: try immediately if Background Sync not supported
    await submitToAPI(submission);
  }
}
```

```typescript
// service-worker.ts — handling the sync event
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'form-submission') {
    event.waitUntil(processFormSubmissions());
  }
});

async function processFormSubmissions(): Promise<void> {
  const pendingItems = await getAllFromIndexedDB('pending-submissions');
  
  for (const item of pendingItems) {
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      
      if (response.ok) {
        await deleteFromIndexedDB('pending-submissions', item.id);
        
        // Notify open tabs (if any) of successful sync
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client =>
          client.postMessage({ type: 'SYNC_COMPLETE', id: item.id })
        );
      } else {
        // Non-2xx: don't retry — server explicitly rejected
        await deleteFromIndexedDB('pending-submissions', item.id);
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      // Throwing in sync handler causes browser to retry (with backoff)
      // Exception: intentionally throw to signal retry needed
      throw error;
    }
  }
}
```

### Workbox BackgroundSyncPlugin (Production Approach)

```typescript
// service-worker.ts — Workbox handles all edge cases
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Background sync for form submissions
const bgSyncPlugin = new BackgroundSyncPlugin('form-queue', {
  maxRetentionTime: 24 * 60,  // Retry for up to 24 hours (in minutes)
  
  // Callbacks for monitoring
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log(`Replayed request for: ${entry.request.url}`);
      } catch (error) {
        console.error('Replay failed, re-queuing');
        await queue.unshiftRequest(entry);  // Put back at front of queue
        throw error;  // Signal to browser to retry later
      }
    }
  },
});

// Register route: POST /api/orders → NetworkOnly + BackgroundSync
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/orders') && request.method === 'POST',
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'POST'
);

// Register for survey responses
registerRoute(
  ({ url }) => url.pathname === '/api/survey-response',
  new NetworkOnly({
    plugins: [
      new BackgroundSyncPlugin('survey-queue', {
        maxRetentionTime: 60 * 24 * 7,  // Keep for 1 week
      }),
    ],
  }),
  'POST'
);
```

### Periodic Background Sync (Advanced)

```typescript
// Periodic Background Sync: browser wakes SW at intervals to refresh content
// Use case: news app, weather, sports scores — fresh content ready when user opens app

// Registration (requires permission prompt)
async function registerPeriodicSync(): Promise<void> {
  if (!('periodicSync' in (await navigator.serviceWorker.ready))) {
    console.log('Periodic Background Sync not supported');
    return;
  }
  
  const registration = await navigator.serviceWorker.ready;
  
  // Request permission (Chrome requires site is installed as PWA)
  const status = await navigator.permissions.query({
    name: 'periodic-background-sync' as PermissionName,
  });
  
  if (status.state === 'granted') {
    await (registration as ServiceWorkerRegistration & {
      periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> }
    }).periodicSync.register('content-refresh', {
      minInterval: 24 * 60 * 60 * 1000,  // At most once per day
    });
  }
}

// Service Worker: handle periodic sync event
self.addEventListener('periodicsync', (event: PeriodicSyncEvent) => {
  if (event.tag === 'content-refresh') {
    event.waitUntil(refreshCachedContent());
  }
});

async function refreshCachedContent(): Promise<void> {
  // Pre-fetch and cache content while user isn't looking
  const cache = await caches.open('content-v1');
  const criticalPaths = ['/', '/news', '/dashboard'];
  
  await Promise.all(
    criticalPaths.map(async path => {
      try {
        const response = await fetch(path);
        if (response.ok) {
          await cache.put(path, response);
        }
      } catch {
        // Network unavailable — will retry at next periodicsync
      }
    })
  );
}
```

### Communication Back to the Page

```typescript
// When SW completes a background sync, notify the user
// SW → Client (open tab) communication via postMessage

// In service worker:
async function notifyClientsOfSync(itemId: string): Promise<void> {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  
  clients.forEach(client =>
    client.postMessage({
      type: 'BACKGROUND_SYNC_COMPLETE',
      payload: { itemId, timestamp: Date.now() },
    })
  );
}

// In React app — listening to SW messages:
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'BACKGROUND_SYNC_COMPLETE') {
      const { itemId } = event.data.payload;
      // Update pending → success state
      setPendingSubmissions(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, status: 'synced' } : item
        )
      );
      
      // Show success notification
      showToast(`Your submission has been synced successfully`);
    }
  };
  
  navigator.serviceWorker?.addEventListener('message', handleMessage);
  return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
}, []);
```

### IndexedDB Store for Queue Persistence

```typescript
// Background Sync needs persistent storage — IndexedDB (not localStorage!)
// localStorage is synchronous and not available in SW context

// db.ts — minimal IndexedDB wrapper for sync queue
class SyncQueue {
  private db: IDBDatabase | null = null;
  
  async init(): Promise<void> {
    this.db = await openDB('sync-queue-db', 1, {
      upgrade(db) {
        db.createObjectStore('queue', { keyPath: 'id' });
      },
    });
  }
  
  async enqueue(item: { id: string; request: object; timestamp: number }): Promise<void> {
    const tx = this.db!.transaction('queue', 'readwrite');
    await tx.objectStore('queue').add(item);
  }
  
  async dequeueAll(): Promise<Array<{ id: string; request: object }>> {
    const tx = this.db!.transaction('queue', 'readonly');
    return tx.objectStore('queue').getAll();
  }
  
  async remove(id: string): Promise<void> {
    const tx = this.db!.transaction('queue', 'readwrite');
    await tx.objectStore('queue').delete(id);
  }
}
```

### Browser Support and Fallback

```typescript
// Background Sync browser support (2026):
// Chrome: ✅ Stable (since Chrome 49)
// Edge:   ✅ Stable
// Firefox: ❌ Not supported (has no plans as of 2026)
// Safari:  ❌ Not supported

// Periodic Background Sync:
// Chrome 80+: ✅ (requires PWA install + permission)
// Others: ❌

function supportsBackgroundSync(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

// Graceful fallback pattern:
async function submitWithSyncFallback(data: unknown): Promise<void> {
  if (supportsBackgroundSync() && !navigator.onLine) {
    // Queue for background sync
    await queueForSync(data);
    showMessage('Saved offline — will submit when connected');
  } else {
    // Try immediately (may fail if offline on Firefox/Safari)
    try {
      await fetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showMessage('Submitted successfully');
    } catch {
      // Manual retry prompt for unsupported browsers
      showMessage('Submission failed. Please check your connection and try again.');
    }
  }
}
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Google Maps (Offline Directions):**
Maps uses Background Sync to sync user-saved places and offline map tiles. When a user saves a location offline, the SW queues the synchronization. When connectivity returns, changes are synced to Google's servers — even if Maps wasn't open.

**Forbes PWA:**
Uses Background Sync to queue article save-for-later requests made while offline. The user taps "Save article" on the train, gets an optimistic "Saved!" response. When online, SW syncs the saved article ID to the user's account without requiring user action.

**Bosch Field Service (relevant to Hruday):**
Field service technicians use Bosch's PWA on tablets on industrial sites with intermittent connectivity. Work order completions are queued via Background Sync. When signal returns (even hours later), all submissions are sent automatically. This is the exact use case where Angular PWA + Workbox BackgroundSync was critical.

**Scaling:**
- Consumer app: Background Sync nice-to-have for form resilience
- Mobile-first / PWA: Background Sync is essential — mobile networks are unreliable
- Field service / industrial: Background Sync is non-negotiable — users work offline for hours

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Background Sync solves the problem that write operations (form submissions, API calls) fail when the network drops — and the user has no reliable way to retry because they may close the tab before connectivity returns. The pattern is: intercept the POST request in the Service Worker, persist the payload in IndexedDB, register a sync tag with `registration.sync.register()`, and return an optimistic success response to the UI. When the browser detects connectivity, it wakes the Service Worker and fires a `sync` event — your SW handler reads the queue from IndexedDB and retries. Critically, this works even if the tab was closed. In production I use Workbox's `BackgroundSyncPlugin` rather than raw SW code — it handles queue management, retry backoff, and the 24-hour max retention TTL that prevents infinitely retrying stale requests. The browser support caveat is important: Firefox and Safari don't support Background Sync. For those, I fall back to a manual retry prompt or use an optimistic UI that shows a 'pending sync' state with a manual retry button."

**Likely Follow-up Questions:**
1. *How does the browser know when to fire the sync event?* → Browser monitors connectivity via the Network Information API; fires 'sync' event when it believes a reliable connection is available
2. *Can you cancel a queued Background Sync?* → Not directly via API; you delete the persisted data from IndexedDB so when the SW fires, there's nothing to process
3. *What's the difference between Background Sync and Periodic Background Sync?* → Basic sync: triggered once when online after being offline; Periodic sync: fires on a schedule (e.g., daily) to refresh content
4. *What storage mechanism backs the Background Sync queue?* → IndexedDB — localStorage isn't available in SW context and has synchronous API
5. *How do you handle a sync that fails even when online?* → Workbox re-queues the request and throws — browser retries with exponential backoff; after `maxRetentionTime`, request is discarded to prevent stale data issues

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (Angular PWA + Background Sync)
────────────────────────────────────────────────────────────

```typescript
// Angular service integrating Background Sync
// relevant for Hruday's Bosch WebSocket/Angular background

import { Injectable } from '@angular/core';
import { SwPush, SwUpdate } from '@angular/service-worker';
import { from, Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  constructor(private swUpdate: SwUpdate) {}
  
  submitWorkOrder(workOrder: WorkOrder): Observable<{ queued: boolean }> {
    if (!navigator.onLine) {
      return from(this.queueForSync(workOrder)).pipe(
        switchMap(() => of({ queued: true }))
      );
    }
    
    return from(
      fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workOrder),
      })
    ).pipe(
      switchMap(response => {
        if (!response.ok) throw new Error('Server error');
        return of({ queued: false });
      }),
      catchError(() =>
        from(this.queueForSync(workOrder)).pipe(
          switchMap(() => of({ queued: true }))
        )
      )
    );
  }
  
  private async queueForSync(workOrder: WorkOrder): Promise<void> {
    // Store in IndexedDB
    await this.saveToIDB('work-order-queue', workOrder);
    
    // Register Background Sync
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
        .sync.register('work-order-sync');
    }
  }
  
  private async saveToIDB(storeName: string, data: unknown): Promise<void> {
    // Simplified — in production use idb library
    const db = await this.openDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).add({ ...data as object, id: crypto.randomUUID(), timestamp: Date.now() });
  }
  
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('sync-db', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('work-order-queue', { keyPath: 'id' });
      };
    });
  }
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"Background Sync = POST request that survives browser close."**

Three-step pattern:
1. **Queue**: Store request payload in IndexedDB
2. **Register**: `registration.sync.register('my-tag')`
3. **Handle**: SW `sync` event → read queue → retry → delete on success

**Support caveat:** Chrome + Edge only (2026). Firefox/Safari need fallback.

**If you go blank:** "Background Sync defers POST requests until connectivity returns, surviving tab close. The SW is woken by the browser when online to process the queue. Workbox BackgroundSyncPlugin handles all the implementation details."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Mobile reliability**: Mobile networks drop constantly — Background Sync is what separates delightful mobile UX from frustrating retry loops
→ **Data integrity**: Prevents data loss when users submit forms on intermittent connections
→ **Offline-first architecture**: Enables true "offline-first" write operations, not just offline-readable content

**How it works:**
→ When `registration.sync.register('tag')` is called, the browser persists the sync registration. When the browser determines a stable network connection is available (even after tab close), it wakes the Service Worker by firing a `sync` event with the registered tag. The SW processes the event (typically: read queue from IndexedDB, retry requests, clean up on success). If the handler throws, the browser schedules a retry with backoff. After `maxRetentionTime`, failed syncs are discarded.

**Company relevance:**
→ **Microsoft**: Microsoft 365 mobile apps use background sync for offline document edits — this is a key offline architecture in Teams for Education
→ **Adobe**: Adobe Express (mobile) uses background sync for design auto-save when offline
→ **Salesforce**: Field Service Lightning mobile app uses background sync to queue work order updates from offline field technicians
→ **Cisco**: Cisco Meraki dashboard PWA uses background sync for configuration changes made offline in poorly connected server rooms
