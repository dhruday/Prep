# 98. Offline-First Architecture

## High-Level Overview

Offline-First Architecture is a design philosophy where applications are built to work seamlessly without network connectivity, treating the offline state as the default rather than an edge case. Instead of assuming constant internet connection and handling offline as an exception, offline-first apps prioritize local data storage and synchronization, ensuring core functionality works regardless of network status.

**Key Concept**: Design your application to function fully offline by default, using local storage as the primary data source and treating the network as a progressive enhancement for synchronization. This flips the traditional online-first model, where connectivity is required and offline is an afterthought.

**Why It Matters:**
- **Reliability**: Apps work in poor/no connectivity (airplanes, subways, rural areas)
- **Performance**: Local data is instant; no network latency
- **User Experience**: No "No Internet" error screens, seamless transitions
- **Mobile-First**: Critical for mobile users with unstable connections
- **Resilience**: Server downtime doesn't block users

**Real-World Impact:**
- **Google Docs**: Seamless offline editing, auto-sync when online returns
- **Trello**: Full board management offline, sync on reconnect
- **WhatsApp**: Messages queue offline, send automatically when online
- **Spotify**: Downloaded content available offline, cached metadata
- **Progressive Web Apps**: 80% of top apps now support offline functionality

---

## Deep Technical Dive

### 1. Offline-First vs Traditional Architecture

#### Traditional (Online-First) Architecture

```
Traditional Flow:
───────────────────────────────────────────────────

User Action → Check Network → Request Server → Wait → Update UI
                    ↓
                  No Network?
                    ↓
              Show Error ❌
              User Blocked

Problems:
- Network required for every action
- Poor UX during connectivity issues
- Constant loading states
- Users can't work offline
```

#### Offline-First Architecture

```
Offline-First Flow:
───────────────────────────────────────────────────

User Action → Update Local Storage → Update UI Immediately ✅
                       ↓
              Background Sync Queue
                       ↓
              Network Available?
                  ↓         ↓
                Yes        No
                 ↓          ↓
            Sync Server   Queue for Later
                 ↓
          Resolve Conflicts
                 ↓
          Update Local Data

Benefits:
- Instant UI updates (local-first)
- Works fully offline
- Network is enhancement, not requirement
- Automatic sync when available
```

### 2. Core Architecture Components

#### Component 1: Service Worker (Network Interceptor)

```javascript
// service-worker.js
const CACHE_NAME = 'offline-app-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/offline.html',
  '/manifest.json'
];

// Install event: Cache critical assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event: Offline-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    // Try cache first (offline-first!)
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[ServiceWorker] Serving from cache:', request.url);
        
        // Return cached response immediately
        // Update cache in background (stale-while-revalidate)
        updateCacheInBackground(request);
        
        return cachedResponse;
      }
      
      // Not in cache, try network
      return fetch(request)
        .then((response) => {
          // Cache successful response
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          
          return response;
        })
        .catch((error) => {
          console.log('[ServiceWorker] Fetch failed:', error);
          
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          
          // Return cached offline image/asset if available
          return caches.match('/offline-asset.png');
        });
    })
  );
});

// Background cache update (stale-while-revalidate)
function updateCacheInBackground(request) {
  fetch(request)
    .then((response) => {
      if (response.status === 200) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, response);
        });
      }
    })
    .catch(() => {
      // Silently fail - user already got cached version
    });
}

// Background Sync: Retry failed requests
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  // Get pending operations from IndexedDB
  const db = await openDB();
  const pendingOps = await db.getAll('pending-operations');
  
  for (const op of pendingOps) {
    try {
      // Retry operation
      const response = await fetch(op.url, {
        method: op.method,
        body: op.body,
        headers: op.headers
      });
      
      if (response.ok) {
        // Success: Remove from queue
        await db.delete('pending-operations', op.id);
      }
    } catch (error) {
      console.log('[ServiceWorker] Sync failed, will retry:', error);
    }
  }
}
```

#### Component 2: Local Data Storage (IndexedDB)

```javascript
// db.js - IndexedDB wrapper for offline data
class OfflineDatabase {
  constructor(dbName = 'offline-app', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores for offline data
        
        // 1. Application data
        if (!db.objectStoreNames.contains('data')) {
          const dataStore = db.createObjectStore('data', { keyPath: 'id' });
          dataStore.createIndex('timestamp', 'timestamp', { unique: false });
          dataStore.createIndex('synced', 'synced', { unique: false });
        }
        
        // 2. Pending operations (for sync)
        if (!db.objectStoreNames.contains('pending-operations')) {
          const opsStore = db.createObjectStore('pending-operations', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          opsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // 3. Sync metadata
        if (!db.objectStoreNames.contains('sync-metadata')) {
          db.createObjectStore('sync-metadata', { keyPath: 'key' });
        }
        
        // 4. Conflict resolution
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          conflictsStore.createIndex('itemId', 'itemId', { unique: false });
        }
      };
    });
  }
  
  // CRUD operations
  async create(storeName, data) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const item = {
      ...data,
      id: data.id || this.generateId(),
      timestamp: Date.now(),
      synced: false
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }
  
  async read(storeName, id) {
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async readAll(storeName) {
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async update(storeName, data) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const item = {
      ...data,
      timestamp: Date.now(),
      synced: false
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }
  
  async delete(storeName, id) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  
  // Get unsynced items
  async getUnsyncedItems(storeName) {
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('synced');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  // Mark item as synced
  async markAsSynced(storeName, id) {
    const item = await this.read(storeName, id);
    if (item) {
      item.synced = true;
      await this.update(storeName, item);
    }
  }
  
  // Queue operation for background sync
  async queueOperation(operation) {
    const op = {
      ...operation,
      timestamp: Date.now(),
      retries: 0
    };
    
    return this.create('pending-operations', op);
  }
  
  // Helper: Generate unique ID
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Initialize database
const db = new OfflineDatabase();
await db.init();

export default db;
```

#### Component 3: Sync Manager

```javascript
// sync-manager.js
class SyncManager {
  constructor(db, apiBaseUrl) {
    this.db = db;
    this.apiBaseUrl = apiBaseUrl;
    this.isSyncing = false;
    this.syncInterval = null;
    
    this.setupNetworkListener();
    this.setupPeriodicSync();
  }
  
  setupNetworkListener() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[Sync] Network online, starting sync');
      this.sync();
    });
    
    window.addEventListener('offline', () => {
      console.log('[Sync] Network offline');
    });
    
    // Sync immediately if online
    if (navigator.onLine) {
      this.sync();
    }
  }
  
  setupPeriodicSync() {
    // Register background sync if supported
    if ('serviceWorker' in navigator && 'sync' in self.registration) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.sync.register('sync-data');
      });
    }
    
    // Fallback: Periodic sync every 5 minutes
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.sync();
      }
    }, 5 * 60 * 1000);
  }
  
  async sync() {
    if (this.isSyncing || !navigator.onLine) {
      return;
    }
    
    this.isSyncing = true;
    console.log('[Sync] Starting synchronization');
    
    try {
      // 1. Push local changes to server
      await this.pushLocalChanges();
      
      // 2. Pull server changes
      await this.pullServerChanges();
      
      // 3. Process pending operations
      await this.processPendingOperations();
      
      // 4. Resolve conflicts
      await this.resolveConflicts();
      
      console.log('[Sync] Synchronization complete');
      
      // Emit sync complete event
      window.dispatchEvent(new CustomEvent('sync-complete'));
    } catch (error) {
      console.error('[Sync] Synchronization failed:', error);
      
      // Emit sync error event
      window.dispatchEvent(new CustomEvent('sync-error', { detail: error }));
    } finally {
      this.isSyncing = false;
    }
  }
  
  async pushLocalChanges() {
    // Get all unsynced items
    const unsyncedItems = await this.db.getUnsyncedItems('data');
    
    console.log(`[Sync] Pushing ${unsyncedItems.length} local changes`);
    
    for (const item of unsyncedItems) {
      try {
        // Determine operation type
        const isNew = !item.serverId;
        const endpoint = isNew 
          ? `${this.apiBaseUrl}/items`
          : `${this.apiBaseUrl}/items/${item.serverId}`;
        
        const method = isNew ? 'POST' : 'PUT';
        
        // Send to server
        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        
        if (response.ok) {
          const serverItem = await response.json();
          
          // Update local item with server ID
          item.serverId = serverItem.id;
          item.serverTimestamp = serverItem.timestamp;
          
          // Mark as synced
          await this.db.markAsSynced('data', item.id);
          
          console.log(`[Sync] Synced item ${item.id}`);
        } else {
          // Handle error (conflict, validation, etc.)
          if (response.status === 409) {
            // Conflict detected
            await this.handleConflict(item, await response.json());
          }
        }
      } catch (error) {
        console.error(`[Sync] Failed to sync item ${item.id}:`, error);
        // Continue with next item
      }
    }
  }
  
  async pullServerChanges() {
    // Get last sync timestamp
    const metadata = await this.db.read('sync-metadata', 'last-sync');
    const lastSync = metadata ? metadata.timestamp : 0;
    
    console.log('[Sync] Pulling server changes since', new Date(lastSync));
    
    try {
      // Fetch changes since last sync
      const response = await fetch(
        `${this.apiBaseUrl}/items/changes?since=${lastSync}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch server changes');
      }
      
      const { items, timestamp } = await response.json();
      
      console.log(`[Sync] Received ${items.length} server changes`);
      
      // Apply server changes to local database
      for (const serverItem of items) {
        const localItem = await this.findLocalItemByServerId(serverItem.id);
        
        if (localItem) {
          // Item exists locally - check for conflicts
          if (localItem.timestamp > serverItem.timestamp && !localItem.synced) {
            // Local change is newer - conflict!
            await this.handleConflict(localItem, serverItem);
          } else {
            // Server version is newer - update local
            await this.db.update('data', {
              ...serverItem,
              id: localItem.id,
              serverId: serverItem.id,
              serverTimestamp: serverItem.timestamp,
              synced: true
            });
          }
        } else {
          // New item from server - create locally
          await this.db.create('data', {
            ...serverItem,
            serverId: serverItem.id,
            serverTimestamp: serverItem.timestamp,
            synced: true
          });
        }
      }
      
      // Update last sync timestamp
      await this.db.update('sync-metadata', {
        key: 'last-sync',
        timestamp: timestamp
      });
    } catch (error) {
      console.error('[Sync] Failed to pull server changes:', error);
      throw error;
    }
  }
  
  async processPendingOperations() {
    const pendingOps = await this.db.readAll('pending-operations');
    
    console.log(`[Sync] Processing ${pendingOps.length} pending operations`);
    
    for (const op of pendingOps) {
      try {
        const response = await fetch(op.url, {
          method: op.method,
          headers: op.headers,
          body: op.body
        });
        
        if (response.ok) {
          // Success - remove from queue
          await this.db.delete('pending-operations', op.id);
          console.log(`[Sync] Processed operation ${op.id}`);
        } else {
          // Increment retry count
          op.retries = (op.retries || 0) + 1;
          
          if (op.retries > 3) {
            // Too many retries - move to failed operations
            console.error(`[Sync] Operation ${op.id} failed after ${op.retries} retries`);
            // Could move to a 'failed-operations' store
          } else {
            // Update retry count
            await this.db.update('pending-operations', op);
          }
        }
      } catch (error) {
        console.error(`[Sync] Failed to process operation ${op.id}:`, error);
      }
    }
  }
  
  async handleConflict(localItem, serverItem) {
    console.warn('[Sync] Conflict detected:', localItem.id);
    
    // Store conflict for user resolution
    await this.db.create('conflicts', {
      itemId: localItem.id,
      localVersion: localItem,
      serverVersion: serverItem,
      timestamp: Date.now()
    });
    
    // Emit conflict event for UI to handle
    window.dispatchEvent(new CustomEvent('sync-conflict', {
      detail: {
        itemId: localItem.id,
        local: localItem,
        server: serverItem
      }
    }));
  }
  
  async resolveConflicts() {
    const conflicts = await this.db.readAll('conflicts');
    
    if (conflicts.length === 0) return;
    
    console.log(`[Sync] ${conflicts.length} unresolved conflicts`);
    
    // Auto-resolve some conflicts (e.g., last-write-wins)
    // or leave for manual resolution
  }
  
  async findLocalItemByServerId(serverId) {
    const allItems = await this.db.readAll('data');
    return allItems.find(item => item.serverId === serverId);
  }
  
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export default SyncManager;
```

#### Component 4: Offline-First API Client

```javascript
// api-client.js
class OfflineFirstAPI {
  constructor(db, syncManager) {
    this.db = db;
    this.syncManager = syncManager;
  }
  
  // Create item (works offline)
  async create(data) {
    // 1. Save to local database immediately
    const localItem = await this.db.create('data', data);
    
    // 2. Update UI immediately (optimistic update)
    // UI gets instant feedback
    
    // 3. Queue for sync when online
    if (navigator.onLine) {
      // Try to sync immediately
      this.syncManager.sync();
    } else {
      // Will sync when online
      console.log('[API] Offline - queued for sync:', localItem.id);
    }
    
    return localItem;
  }
  
  // Read item (always from local database)
  async read(id) {
    return this.db.read('data', id);
  }
  
  // Read all items (always from local database)
  async readAll() {
    return this.db.readAll('data');
  }
  
  // Update item (works offline)
  async update(id, updates) {
    // 1. Update local database immediately
    const item = await this.db.read('data', id);
    const updatedItem = { ...item, ...updates };
    await this.db.update('data', updatedItem);
    
    // 2. UI updated immediately
    
    // 3. Queue for sync
    if (navigator.onLine) {
      this.syncManager.sync();
    } else {
      console.log('[API] Offline - queued for sync:', id);
    }
    
    return updatedItem;
  }
  
  // Delete item (works offline)
  async delete(id) {
    // 1. Mark as deleted locally (soft delete)
    const item = await this.db.read('data', id);
    
    if (item) {
      item.deleted = true;
      item.synced = false;
      await this.db.update('data', item);
      
      // 2. Queue for sync
      if (navigator.onLine) {
        this.syncManager.sync();
      } else {
        console.log('[API] Offline - queued for deletion:', id);
      }
    }
    
    return true;
  }
  
  // Search (local only)
  async search(query) {
    const allItems = await this.db.readAll('data');
    
    return allItems.filter(item => {
      if (item.deleted) return false;
      
      return Object.values(item).some(value => 
        String(value).toLowerCase().includes(query.toLowerCase())
      );
    });
  }
}

export default OfflineFirstAPI;
```

### 3. Caching Strategies

```javascript
// cache-strategies.js

// Strategy 1: Cache First (Offline-First)
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    // Could return offline page/asset here
    throw error;
  }
}

// Strategy 2: Network First (Online-First with offline fallback)
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

// Strategy 3: Stale While Revalidate (Best of both worlds)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Return cached immediately
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  return cached || fetchPromise;
}

// Strategy 4: Cache Only (Full offline)
async function cacheOnly(request, cacheName) {
  const cache = await caches.open(cacheName);
  return cache.match(request);
}

// Strategy 5: Network Only (No cache)
async function networkOnly(request) {
  return fetch(request);
}
```

### 4. Conflict Resolution Strategies

```javascript
// conflict-resolution.js

class ConflictResolver {
  // Strategy 1: Last Write Wins
  lastWriteWins(local, server) {
    return local.timestamp > server.timestamp ? local : server;
  }
  
  // Strategy 2: Server Wins
  serverWins(local, server) {
    return server;
  }
  
  // Strategy 3: Client Wins
  clientWins(local, server) {
    return local;
  }
  
  // Strategy 4: Manual Resolution (user chooses)
  async manualResolution(local, server) {
    return new Promise((resolve) => {
      // Show UI for user to choose
      const modal = this.showConflictModal(local, server);
      
      modal.onResolve = (chosen) => {
        resolve(chosen);
      };
    });
  }
  
  // Strategy 5: Field-Level Merge
  fieldLevelMerge(local, server, strategy = 'lastWriteWins') {
    const merged = {};
    
    const allKeys = new Set([
      ...Object.keys(local),
      ...Object.keys(server)
    ]);
    
    for (const key of allKeys) {
      if (key === 'id' || key === 'timestamp') {
        merged[key] = local[key];
        continue;
      }
      
      const localValue = local[key];
      const serverValue = server[key];
      
      if (localValue === serverValue) {
        merged[key] = localValue;
      } else {
        // Different values - apply strategy per field
        if (strategy === 'lastWriteWins') {
          // Check which field was modified more recently
          merged[key] = local.timestamp > server.timestamp 
            ? localValue 
            : serverValue;
        } else {
          merged[key] = localValue; // Default to local
        }
      }
    }
    
    return merged;
  }
  
  // Strategy 6: Operational Transform (for text editing)
  operationalTransform(localOps, serverOps) {
    // Transform operations to apply both changes
    // Used in collaborative editing (Google Docs style)
    // This is complex - simplified version:
    
    const transformed = [];
    
    for (const localOp of localOps) {
      let transformedOp = localOp;
      
      for (const serverOp of serverOps) {
        transformedOp = this.transformOperation(transformedOp, serverOp);
      }
      
      transformed.push(transformedOp);
    }
    
    return transformed;
  }
  
  transformOperation(op1, op2) {
    // Simplified operational transform
    // Real implementation would handle inserts, deletes, etc.
    return op1;
  }
  
  showConflictModal(local, server) {
    // Create modal UI for manual resolution
    const modal = document.createElement('div');
    modal.className = 'conflict-modal';
    modal.innerHTML = `
      <div class="conflict-content">
        <h2>Sync Conflict Detected</h2>
        <p>The same item was modified offline and online. Choose which version to keep:</p>
        
        <div class="versions">
          <div class="version local">
            <h3>Your Changes (Local)</h3>
            <pre>${JSON.stringify(local, null, 2)}</pre>
            <button class="choose-local">Keep Mine</button>
          </div>
          
          <div class="version server">
            <h3>Server Version</h3>
            <pre>${JSON.stringify(server, null, 2)}</pre>
            <button class="choose-server">Keep Server</button>
          </div>
        </div>
        
        <button class="merge">Merge Both</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    return {
      element: modal,
      onResolve: null,
      
      destroy() {
        modal.remove();
      }
    };
  }
}

export default ConflictResolver;
```

---

## Real-World Production Examples

### Example 1: Todo App with Offline Support

**Problem**: Users need to manage tasks on the go, even without internet.

```javascript
// todo-app.js
class OfflineTodoApp {
  constructor() {
    this.db = null;
    this.syncManager = null;
    this.api = null;
    
    this.init();
  }
  
  async init() {
    // Initialize database
    this.db = new OfflineDatabase('todo-app');
    await this.db.init();
    
    // Initialize sync manager
    this.syncManager = new SyncManager(this.db, 'https://api.todo.com');
    
    // Initialize API client
    this.api = new OfflineFirstAPI(this.db, this.syncManager);
    
    // Setup UI
    this.setupUI();
    this.loadTodos();
    
    // Listen for sync events
    this.setupSyncListeners();
    
    // Register service worker
    this.registerServiceWorker();
  }
  
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[App] Service Worker registered:', registration);
      } catch (error) {
        console.error('[App] Service Worker registration failed:', error);
      }
    }
  }
  
  setupUI() {
    // Add todo form
    const form = document.getElementById('add-todo-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.addTodo();
    });
    
    // Network status indicator
    this.updateNetworkStatus();
    window.addEventListener('online', () => this.updateNetworkStatus());
    window.addEventListener('offline', () => this.updateNetworkStatus());
  }
  
  setupSyncListeners() {
    window.addEventListener('sync-complete', () => {
      this.showNotification('✅ Synced successfully', 'success');
      this.loadTodos(); // Refresh UI
    });
    
    window.addEventListener('sync-error', (event) => {
      this.showNotification('❌ Sync failed: ' + event.detail, 'error');
    });
    
    window.addEventListener('sync-conflict', (event) => {
      this.handleConflict(event.detail);
    });
  }
  
  async loadTodos() {
    const todos = await this.api.readAll();
    const activeTodos = todos.filter(t => !t.deleted);
    
    this.renderTodos(activeTodos);
    this.updateSyncStatus(todos);
  }
  
  renderTodos(todos) {
    const container = document.getElementById('todos-container');
    
    container.innerHTML = todos.map(todo => `
      <div class="todo-item ${todo.synced ? '' : 'unsynced'}" data-id="${todo.id}">
        <input 
          type="checkbox" 
          ${todo.completed ? 'checked' : ''}
          onchange="app.toggleTodo('${todo.id}')"
        >
        <span class="${todo.completed ? 'completed' : ''}">${todo.text}</span>
        ${!todo.synced ? '<span class="sync-badge">●</span>' : ''}
        <button onclick="app.deleteTodo('${todo.id}')">Delete</button>
      </div>
    `).join('');
  }
  
  async addTodo() {
    const input = document.getElementById('new-todo-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Create todo - works offline!
    const todo = await this.api.create({
      text,
      completed: false,
      createdAt: Date.now()
    });
    
    console.log('[App] Todo created:', todo.id);
    
    // Clear input
    input.value = '';
    
    // Refresh UI
    await this.loadTodos();
    
    // Show feedback
    if (!navigator.onLine) {
      this.showNotification('📝 Todo saved offline. Will sync when online.', 'info');
    }
  }
  
  async toggleTodo(id) {
    const todo = await this.api.read(id);
    
    await this.api.update(id, {
      completed: !todo.completed
    });
    
    await this.loadTodos();
  }
  
  async deleteTodo(id) {
    await this.api.delete(id);
    await this.loadTodos();
    
    if (!navigator.onLine) {
      this.showNotification('🗑️ Todo deleted offline. Will sync when online.', 'info');
    }
  }
  
  updateNetworkStatus() {
    const indicator = document.getElementById('network-status');
    
    if (navigator.onLine) {
      indicator.textContent = '🟢 Online';
      indicator.className = 'status online';
    } else {
      indicator.textContent = '🔴 Offline';
      indicator.className = 'status offline';
    }
  }
  
  updateSyncStatus(todos) {
    const unsyncedCount = todos.filter(t => !t.synced).length;
    const syncStatus = document.getElementById('sync-status');
    
    if (unsyncedCount > 0) {
      syncStatus.textContent = `${unsyncedCount} unsynced changes`;
      syncStatus.className = 'sync-status pending';
    } else {
      syncStatus.textContent = 'All changes synced';
      syncStatus.className = 'sync-status synced';
    }
  }
  
  async handleConflict({ itemId, local, server }) {
    const resolver = new ConflictResolver();
    
    // Show conflict UI
    const resolved = await resolver.manualResolution(local, server);
    
    // Apply resolution
    await this.api.update(itemId, resolved);
    await this.loadTodos();
  }
  
  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }
}

// Initialize app
const app = new OfflineTodoApp();
```

### Example 2: Note-Taking App with Rich Text

**Problem**: Users need to edit documents offline with rich text formatting.

```javascript
// notes-app.js
class OfflineNotesApp {
  constructor() {
    this.db = null;
    this.syncManager = null;
    this.currentNote = null;
    this.editor = null;
    this.autoSaveTimer = null;
    
    this.init();
  }
  
  async init() {
    // Initialize offline infrastructure
    this.db = new OfflineDatabase('notes-app');
    await this.db.init();
    
    this.syncManager = new SyncManager(this.db, 'https://api.notes.com');
    this.api = new OfflineFirstAPI(this.db, this.syncManager);
    
    // Initialize rich text editor
    this.initEditor();
    
    // Load notes list
    await this.loadNotesList();
    
    // Setup auto-save
    this.setupAutoSave();
    
    // Register service worker
    await this.registerServiceWorker();
  }
  
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js');
    }
  }
  
  initEditor() {
    this.editor = document.getElementById('editor');
    
    // Listen for changes
    this.editor.addEventListener('input', () => {
      this.onEditorChange();
    });
    
    // Handle formatting commands
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const command = btn.dataset.command;
        document.execCommand(command, false, null);
      });
    });
  }
  
  setupAutoSave() {
    // Auto-save every 2 seconds of inactivity
    this.editor.addEventListener('input', () => {
      clearTimeout(this.autoSaveTimer);
      
      this.autoSaveTimer = setTimeout(() => {
        this.saveCurrentNote();
      }, 2000);
    });
    
    // Also save before unload
    window.addEventListener('beforeunload', () => {
      this.saveCurrentNote();
    });
  }
  
  async loadNotesList() {
    const notes = await this.api.readAll();
    const activeNotes = notes.filter(n => !n.deleted);
    
    this.renderNotesList(activeNotes);
  }
  
  renderNotesList(notes) {
    const container = document.getElementById('notes-list');
    
    container.innerHTML = notes
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(note => {
        const preview = this.getTextPreview(note.content);
        const syncIndicator = note.synced ? '' : '🔄';
        
        return `
          <div 
            class="note-item ${note.id === this.currentNote?.id ? 'active' : ''}" 
            onclick="app.openNote('${note.id}')"
          >
            <div class="note-title">${note.title || 'Untitled'} ${syncIndicator}</div>
            <div class="note-preview">${preview}</div>
            <div class="note-date">${this.formatDate(note.updatedAt)}</div>
          </div>
        `;
      })
      .join('');
  }
  
  async createNewNote() {
    const note = await this.api.create({
      title: 'Untitled',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    this.currentNote = note;
    this.editor.innerHTML = '';
    this.editor.focus();
    
    await this.loadNotesList();
    
    if (!navigator.onLine) {
      this.showStatus('Note created offline');
    }
  }
  
  async openNote(id) {
    // Save current note first
    if (this.currentNote) {
      await this.saveCurrentNote();
    }
    
    // Load new note
    this.currentNote = await this.api.read(id);
    this.editor.innerHTML = this.currentNote.content;
    
    await this.loadNotesList();
  }
  
  async saveCurrentNote() {
    if (!this.currentNote) return;
    
    const content = this.editor.innerHTML;
    const title = this.extractTitle(content);
    
    await this.api.update(this.currentNote.id, {
      title,
      content,
      updatedAt: Date.now()
    });
    
    await this.loadNotesList();
    
    if (!navigator.onLine) {
      this.showStatus('Saved offline');
    } else {
      this.showStatus('Saved');
    }
  }
  
  async deleteNote(id) {
    if (confirm('Delete this note?')) {
      await this.api.delete(id);
      
      if (this.currentNote?.id === id) {
        this.currentNote = null;
        this.editor.innerHTML = '';
      }
      
      await this.loadNotesList();
    }
  }
  
  onEditorChange() {
    // Mark note as modified
    if (this.currentNote) {
      const statusBar = document.getElementById('status-bar');
      statusBar.textContent = 'Unsaved changes...';
    }
  }
  
  extractTitle(html) {
    const text = html.replace(/<[^>]*>/g, '').trim();
    return text.split('\n')[0].substring(0, 50) || 'Untitled';
  }
  
  getTextPreview(html) {
    const text = html.replace(/<[^>]*>/g, '').trim();
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  }
  
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Format as date
    return date.toLocaleDateString();
  }
  
  showStatus(message) {
    const statusBar = document.getElementById('status-bar');
    statusBar.textContent = message;
    
    setTimeout(() => {
      statusBar.textContent = '';
    }, 2000);
  }
}

// Initialize app
const app = new OfflineNotesApp();
```

### Example 3: E-commerce Cart with Offline Persistence

**Problem**: Users browse products and add to cart in areas with poor connectivity.

```javascript
// ecommerce-cart.js
class OfflineShoppingCart {
  constructor() {
    this.db = null;
    this.syncManager = null;
    this.cart = [];
    
    this.init();
  }
  
  async init() {
    // Initialize offline infrastructure
    this.db = new OfflineDatabase('ecommerce-app');
    await this.db.init();
    
    this.syncManager = new SyncManager(this.db, 'https://api.shop.com');
    this.api = new OfflineFirstAPI(this.db, this.syncManager);
    
    // Load cart from local storage
    await this.loadCart();
    
    // Cache product catalog for offline browsing
    await this.cacheProductCatalog();
    
    // Register service worker
    await this.registerServiceWorker();
    
    // Setup UI
    this.setupUI();
  }
  
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Cart] Service Worker registered');
    }
  }
  
  async cacheProductCatalog() {
    try {
      // Try to fetch latest catalog
      if (navigator.onLine) {
        const response = await fetch('https://api.shop.com/products');
        const products = await response.json();
        
        // Store in IndexedDB
        for (const product of products) {
          await this.db.create('products', product);
        }
        
        console.log('[Cart] Product catalog cached');
      }
    } catch (error) {
      console.log('[Cart] Using cached catalog');
    }
  }
  
  async loadCart() {
    // Load cart items from local database
    const cartItems = await this.db.readAll('cart');
    this.cart = cartItems.filter(item => !item.deleted);
    
    this.updateCartUI();
  }
  
  async addToCart(productId, quantity = 1) {
    // Get product details
    const product = await this.db.read('products', productId);
    
    if (!product) {
      this.showNotification('Product not found', 'error');
      return;
    }
    
    // Check if item already in cart
    const existingItem = this.cart.find(item => item.productId === productId);
    
    if (existingItem) {
      // Update quantity
      await this.updateCartItem(existingItem.id, {
        quantity: existingItem.quantity + quantity
      });
    } else {
      // Add new item
      const cartItem = await this.api.create({
        productId,
        product,
        quantity,
        price: product.price,
        addedAt: Date.now()
      });
      
      this.cart.push(cartItem);
    }
    
    this.updateCartUI();
    
    if (!navigator.onLine) {
      this.showNotification('Added to cart (offline)', 'info');
    } else {
      this.showNotification('Added to cart', 'success');
    }
  }
  
  async updateCartItem(itemId, updates) {
    const item = await this.api.read(itemId);
    await this.api.update(itemId, { ...item, ...updates });
    
    await this.loadCart();
  }
  
  async removeFromCart(itemId) {
    await this.api.delete(itemId);
    await this.loadCart();
    
    if (!navigator.onLine) {
      this.showNotification('Removed from cart (offline)', 'info');
    }
  }
  
  async checkout() {
    if (this.cart.length === 0) {
      this.showNotification('Cart is empty', 'error');
      return;
    }
    
    if (!navigator.onLine) {
      this.showNotification(
        'Cannot checkout offline. Your cart is saved and will be ready when you\'re online.',
        'info'
      );
      return;
    }
    
    try {
      // Process checkout
      const response = await fetch('https://api.shop.com/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: this.cart,
          total: this.getCartTotal()
        })
      });
      
      if (response.ok) {
        const order = await response.json();
        
        // Clear cart
        for (const item of this.cart) {
          await this.api.delete(item.id);
        }
        
        this.cart = [];
        this.updateCartUI();
        
        this.showNotification('Order placed successfully!', 'success');
        
        // Redirect to order confirmation
        window.location.href = `/orders/${order.id}`;
      } else {
        throw new Error('Checkout failed');
      }
    } catch (error) {
      this.showNotification('Checkout failed: ' + error.message, 'error');
    }
  }
  
  getCartTotal() {
    return this.cart.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }
  
  updateCartUI() {
    const cartContainer = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    
    // Update count badge
    cartCount.textContent = this.cart.length;
    
    // Update items list
    if (this.cart.length === 0) {
      cartContainer.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
    } else {
      cartContainer.innerHTML = this.cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.product.image}" alt="${item.product.name}">
          <div class="item-details">
            <h4>${item.product.name}</h4>
            <p class="price">$${item.price.toFixed(2)}</p>
            <div class="quantity-controls">
              <button onclick="cart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
              <span>${item.quantity}</span>
              <button onclick="cart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
            </div>
          </div>
          <button onclick="cart.removeFromCart('${item.id}')" class="remove-btn">Remove</button>
          ${!item.synced ? '<span class="sync-indicator">🔄</span>' : ''}
        </div>
      `).join('');
    }
    
    // Update total
    cartTotal.textContent = `$${this.getCartTotal().toFixed(2)}`;
  }
  
  async updateQuantity(itemId, newQuantity) {
    if (newQuantity < 1) {
      await this.removeFromCart(itemId);
    } else {
      await this.updateCartItem(itemId, { quantity: newQuantity });
    }
  }
  
  setupUI() {
    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    checkoutBtn.addEventListener('click', () => this.checkout());
    
    // Network status
    this.updateNetworkStatus();
    window.addEventListener('online', () => this.updateNetworkStatus());
    window.addEventListener('offline', () => this.updateNetworkStatus());
  }
  
  updateNetworkStatus() {
    const indicator = document.getElementById('network-status');
    
    if (navigator.onLine) {
      indicator.textContent = 'Online';
      indicator.className = 'status online';
    } else {
      indicator.textContent = 'Offline - Cart saved locally';
      indicator.className = 'status offline';
    }
  }
  
  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }
}

// Initialize cart
const cart = new OfflineShoppingCart();
```

---

## Interview-Oriented Deep Dive

### Common Interview Questions

#### Q1: "What is offline-first architecture and how does it differ from traditional online-first apps?"

**Complete Answer:**
```
Offline-First Architecture is a design approach where applications are built
to work primarily from local storage, with network as an enhancement rather
than a requirement.

Key Differences:

1. Data Source:
   Traditional: Server is primary data source
   Offline-First: Local storage (IndexedDB) is primary data source

2. Network Handling:
   Traditional: Network failure = app failure
   Offline-First: Network failure = continue working normally

3. User Experience:
   Traditional: Loading states, errors when offline
   Offline-First: Instant updates, seamless offline/online transitions

4. Architecture Flow:
   Traditional: UI → Network → Server → Network → UI
   Offline-First: UI → Local Storage → UI (immediate)
                   Background: Sync Queue → Network → Server

5. Sync Strategy:
   Traditional: Synchronous (wait for server)
   Offline-First: Asynchronous (sync in background)

Implementation Components:

1. Service Worker
   - Intercepts network requests
   - Serves cached resources
   - Implements caching strategies

2. IndexedDB
   - Stores application data locally
   - Supports complex queries
   - Large storage capacity

3. Sync Manager
   - Queues operations when offline
   - Syncs when network available
   - Handles conflicts

4. Conflict Resolution
   - Last-write-wins
   - Manual resolution
   - Operational transforms

Benefits:
- Works in poor/no connectivity
- Instant UI updates (no network latency)
- Better performance (local-first)
- More resilient (server downtime doesn't block users)

Challenges:
- More complex architecture
- Conflict resolution required
- Storage management
- Sync complexity

Example: Google Docs
- Edit documents fully offline
- All changes saved locally immediately
- Background sync when online
- Collaborative editing with conflict resolution
```

**Code Example:**
```javascript
// Traditional (Online-First)
async function saveTraditional(data) {
  try {
    // Must wait for network
    const response = await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error('Save failed');
    }
  } catch (error) {
    // No network = user blocked ❌
    alert('Cannot save: No internet connection');
    throw error;
  }
}

// Offline-First
async function saveOfflineFirst(data) {
  // 1. Save locally immediately ✅
  const localItem = await db.create('data', data);
  
  // 2. UI updates immediately (no waiting!)
  updateUI(localItem);
  
  // 3. Queue for background sync
  if (navigator.onLine) {
    syncManager.sync(); // Try sync now
  } else {
    // Will sync automatically when online
    showStatus('Saved offline');
  }
  
  return localItem;
}
```

#### Q2: "How do you implement background synchronization in offline-first apps?"

**Complete Answer:**
```
Background synchronization ensures offline changes are synced to the server
when connectivity returns, even if the user closes the app.

Implementation Strategy:

1. Background Sync API (Chrome, Edge)
   - Registers sync events with service worker
   - Browser triggers sync when online
   - Retries automatically if sync fails

2. Fallback: Periodic Sync
   - Check connectivity periodically
   - Sync when online detected
   - Also sync on app focus/resume

3. Sync Queue Pattern
   - Queue operations while offline
   - Process queue when online
   - Handle failures gracefully

Complete Implementation:
```

```javascript
// 1. Service Worker: Register background sync
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Open IndexedDB
  const db = await openDB('offline-app');
  
  // Get pending operations
  const tx = db.transaction('pending-operations', 'readonly');
  const store = tx.objectStore('pending-operations');
  const operations = await store.getAll();
  
  // Process each operation
  for (const op of operations) {
    try {
      const response = await fetch(op.url, {
        method: op.method,
        headers: op.headers,
        body: op.body
      });
      
      if (response.ok) {
        // Success - remove from queue
        const deleteTx = db.transaction('pending-operations', 'readwrite');
        await deleteTx.objectStore('pending-operations').delete(op.id);
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        await db.transaction('pending-operations', 'readwrite')
          .objectStore('pending-operations')
          .delete(op.id);
      }
      // Server error - keep in queue for retry
    } catch (error) {
      // Network error - keep in queue
      console.log('[SW] Sync failed, will retry:', error);
    }
  }
  
  // Notify clients that sync completed
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}

// 2. App: Queue operations and request sync
class SyncQueue {
  constructor(db) {
    this.db = db;
  }
  
  async queueOperation(operation) {
    // Add to IndexedDB queue
    await this.db.create('pending-operations', {
      ...operation,
      timestamp: Date.now(),
      retries: 0
    });
    
    // Request background sync
    this.requestBackgroundSync();
  }
  
  async requestBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in self.registration) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-data');
        console.log('[App] Background sync registered');
      } catch (error) {
        console.log('[App] Background sync registration failed:', error);
        // Fallback to periodic sync
        this.fallbackSync();
      }
    } else {
      // Browser doesn't support Background Sync
      this.fallbackSync();
    }
  }
  
  fallbackSync() {
    // Periodic check every 5 minutes
    setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, 5 * 60 * 1000);
    
    // Also sync when online
    window.addEventListener('online', () => {
      this.sync();
    });
    
    // Sync when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        this.sync();
      }
    });
  }
  
  async sync() {
    const operations = await this.db.readAll('pending-operations');
    
    for (const op of operations) {
      try {
        const response = await fetch(op.url, {
          method: op.method,
          headers: op.headers,
          body: op.body
        });
        
        if (response.ok) {
          await this.db.delete('pending-operations', op.id);
        }
      } catch (error) {
        console.log('[App] Sync failed:', error);
      }
    }
  }
}

// 3. Usage
const queue = new SyncQueue(db);

// When user performs action offline
async function saveItemOffline(item) {
  // Save locally
  await db.create('items', item);
  
  // Queue for sync
  await queue.queueOperation({
    url: '/api/items',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  
  // UI updated immediately!
}
```

**Sync Strategies:**

```javascript
// Strategy 1: Optimistic Sync (try immediately)
async function optimisticSync(item) {
  // Save locally first
  const localItem = await db.create('items', item);
  
  // Try sync immediately if online
  if (navigator.onLine) {
    try {
      await fetch('/api/items', {
        method: 'POST',
        body: JSON.stringify(localItem)
      });
      
      // Mark as synced
      localItem.synced = true;
      await db.update('items', localItem);
    } catch (error) {
      // Queue for later
      await queue.queueOperation({...});
    }
  } else {
    // Queue for when online
    await queue.queueOperation({...});
  }
  
  return localItem;
}

// Strategy 2: Batched Sync (sync multiple at once)
async function batchSync() {
  const unsynced = await db.getUnsyncedItems('items');
  
  if (unsynced.length === 0) return;
  
  // Send all in one request
  try {
    const response = await fetch('/api/items/batch', {
      method: 'POST',
      body: JSON.stringify({ items: unsynced })
    });
    
    if (response.ok) {
      // Mark all as synced
      for (const item of unsynced) {
        await db.markAsSynced('items', item.id);
      }
    }
  } catch (error) {
    // Will retry later
  }
}

// Strategy 3: Delta Sync (only send changes)
async function deltaSync() {
  const lastSyncTime = await db.getLastSyncTime();
  const changedSince = await db.getChangedSince('items', lastSyncTime);
  
  if (changedSince.length === 0) return;
  
  try {
    const response = await fetch('/api/items/delta', {
      method: 'POST',
      body: JSON.stringify({
        since: lastSyncTime,
        changes: changedSince
      })
    });
    
    if (response.ok) {
      const { timestamp } = await response.json();
      await db.setLastSyncTime(timestamp);
    }
  } catch (error) {
    // Will retry
  }
}
```

#### Q3: "How do you handle conflicts in offline-first applications?"

**Complete Answer:**
```
Conflicts occur when the same data is modified both offline (locally) and 
online (on server) before synchronization. Multiple resolution strategies 
exist depending on use case.

Conflict Detection:
1. Timestamp comparison
2. Version numbers
3. Edit vectors (for collaborative editing)

Resolution Strategies:

1. Last Write Wins (LWW)
   - Simplest approach
   - Compare timestamps
   - Newer version wins
   - Data loss possible

2. Server Wins
   - Server version always takes precedence
   - Safe for read-heavy apps
   - Discards local changes

3. Client Wins
   - Local version takes precedence
   - Good for user-centric apps
   - May overwrite server changes

4. Manual Resolution
   - Present both versions to user
   - User chooses which to keep
   - Best UX but requires user interaction

5. Merge Strategies
   - Field-level merge
   - Operational transform (for text)
   - CRDTs (Conflict-free Replicated Data Types)

Implementation:
```

```javascript
class ConflictResolver {
  // Strategy 1: Last Write Wins
  lastWriteWins(local, server) {
    console.log('Resolving conflict: Last Write Wins');
    
    if (local.timestamp > server.timestamp) {
      console.log('Local version is newer');
      return {
        resolved: local,
        action: 'keep-local'
      };
    } else {
      console.log('Server version is newer');
      return {
        resolved: server,
        action: 'keep-server'
      };
    }
  }
  
  // Strategy 2: Field-Level Merge
  fieldLevelMerge(local, server) {
    console.log('Resolving conflict: Field-Level Merge');
    
    const merged = { ...local };
    
    for (const [key, serverValue] of Object.entries(server)) {
      const localValue = local[key];
      
      if (localValue === serverValue) {
        // No conflict for this field
        continue;
      }
      
      // Field has conflict
      if (key === 'id' || key === 'createdAt') {
        // Keep original
        merged[key] = local[key];
      } else {
        // Use newer timestamp for this field
        const localFieldTime = local[`${key}_timestamp`];
        const serverFieldTime = server[`${key}_timestamp`];
        
        if (localFieldTime > serverFieldTime) {
          merged[key] = localValue;
        } else {
          merged[key] = serverValue;
        }
      }
    }
    
    return {
      resolved: merged,
      action: 'merged'
    };
  }
  
  // Strategy 3: Manual Resolution (user chooses)
  async manualResolution(local, server) {
    return new Promise((resolve) => {
      // Show UI modal
      const modal = this.createConflictModal(local, server);
      document.body.appendChild(modal);
      
      // User chooses local
      modal.querySelector('.choose-local').addEventListener('click', () => {
        modal.remove();
        resolve({
          resolved: local,
          action: 'user-chose-local'
        });
      });
      
      // User chooses server
      modal.querySelector('.choose-server').addEventListener('click', () => {
        modal.remove();
        resolve({
          resolved: server,
          action: 'user-chose-server'
        });
      });
      
      // User merges manually
      modal.querySelector('.merge-manually').addEventListener('click', () => {
        const merged = this.getUserMergedVersion(modal, local, server);
        modal.remove();
        resolve({
          resolved: merged,
          action: 'user-merged'
        });
      });
    });
  }
  
  createConflictModal(local, server) {
    const modal = document.createElement('div');
    modal.className = 'conflict-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>🔄 Sync Conflict</h2>
        <p>This item was modified both offline and online. Please resolve:</p>
        
        <div class="versions">
          <div class="version local">
            <h3>Your Version (Offline)</h3>
            <pre>${JSON.stringify(local, null, 2)}</pre>
            <button class="choose-local">Use Mine</button>
          </div>
          
          <div class="version server">
            <h3>Server Version</h3>
            <pre>${JSON.stringify(server, null, 2)}</pre>
            <button class="choose-server">Use Server</button>
          </div>
        </div>
        
        <button class="merge-manually">Merge Manually</button>
      </div>
    `;
    
    return modal;
  }
  
  // Strategy 4: Operational Transform (for text editing)
  operationalTransform(localOps, serverOps) {
    // Used for collaborative text editing
    // Transforms operations so both can be applied
    
    const transformed = [];
    
    for (const localOp of localOps) {
      let op = localOp;
      
      // Transform against all server operations
      for (const serverOp of serverOps) {
        op = this.transform(op, serverOp);
      }
      
      transformed.push(op);
    }
    
    return transformed;
  }
  
  transform(op1, op2) {
    // Simplified operational transform
    // Real implementation handles inserts, deletes, formatting, etc.
    
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position < op2.position) {
        return op1; // No change needed
      } else {
        // Adjust position
        return {
          ...op1,
          position: op1.position + op2.length
        };
      }
    }
    
    // Other cases...
    return op1;
  }
  
  // Strategy 5: CRDT (Conflict-free Replicated Data Type)
  crdtMerge(local, server) {
    // CRDTs are data structures that can be merged without conflicts
    // Examples: G-Set (grow-only set), LWW-Element-Set, etc.
    
    // Example: Merge two sets (union)
    const localSet = new Set(local.items || []);
    const serverSet = new Set(server.items || []);
    
    const merged = new Set([...localSet, ...serverSet]);
    
    return {
      resolved: {
        ...local,
        items: Array.from(merged)
      },
      action: 'crdt-merged'
    };
  }
}

// Usage in sync process
async function syncWithConflictResolution() {
  const unsynced = await db.getUnsyncedItems('data');
  const resolver = new ConflictResolver();
  
  for (const localItem of unsynced) {
    try {
      // Try to push to server
      const response = await fetch(`/api/items/${localItem.serverId}`, {
        method: 'PUT',
        body: JSON.stringify(localItem)
      });
      
      if (response.status === 409) {
        // Conflict detected!
        const serverItem = await response.json();
        
        // Resolve conflict
        const { resolved, action } = await resolver.lastWriteWins(
          localItem,
          serverItem
        );
        
        // Apply resolution
        if (action === 'keep-local') {
          // Force update server
          await fetch(`/api/items/${localItem.serverId}/force`, {
            method: 'PUT',
            body: JSON.stringify(resolved)
          });
        } else {
          // Update local with server version
          await db.update('data', resolved);
        }
        
        // Mark as synced
        await db.markAsSynced('data', localItem.id);
      } else if (response.ok) {
        // No conflict
        await db.markAsSynced('data', localItem.id);
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  }
}
```

**Choosing a Strategy:**

```javascript
function chooseConflictStrategy(dataType, context) {
  // Simple data (settings, preferences)
  if (dataType === 'settings') {
    return 'last-write-wins';
  }
  
  // User-generated content (notes, documents)
  if (dataType === 'document') {
    return 'manual-resolution'; // Let user decide
  }
  
  // Collaborative editing (Google Docs style)
  if (dataType === 'collaborative-doc') {
    return 'operational-transform';
  }
  
  // Lists, sets (shopping cart, favorites)
  if (dataType === 'list') {
    return 'crdt-merge'; // Union of items
  }
  
  // Critical data (financial, medical)
  if (context.critical) {
    return 'manual-resolution'; // Always ask user
  }
  
  // Default
  return 'last-write-wins';
}
```

#### Q4: "What are the storage limitations and how do you manage them in offline-first apps?"

**Complete Answer:**
```
Storage Quotas by Type:

1. IndexedDB
   - Chrome: ~60% of disk space (up to several GB)
   - Firefox: ~50% of disk space
   - Safari: ~1GB, may prompt user
   - Can request persistent storage

2. Cache API
   - Chrome: ~6% of disk space per origin
   - Shared quota with IndexedDB
   - Usually hundreds of MB

3. LocalStorage
   - 5-10MB limit
   - Synchronous API (blocks main thread)
   - Not recommended for large data

Storage Management Strategies:
```

```javascript
class StorageManager {
  async checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      
      const usage = estimate.usage; // Bytes used
      const quota = estimate.quota; // Total bytes available
      const percentUsed = (usage / quota * 100).toFixed(2);
      
      console.log('Storage Usage:', {
        used: this.formatBytes(usage),
        total: this.formatBytes(quota),
        percent: percentUsed + '%',
        available: this.formatBytes(quota - usage)
      });
      
      return { usage, quota, percentUsed: parseFloat(percentUsed) };
    }
    
    return null;
  }
  
  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persisted();
      
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        
        if (granted) {
          console.log('✅ Persistent storage granted');
        } else {
          console.log('❌ Persistent storage denied');
        }
        
        return granted;
      }
      
      return true;
    }
    
    return false;
  }
  
  async cleanupOldData(db, daysToKeep = 30) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    // Clean up synced items older than cutoff
    const allItems = await db.readAll('data');
    
    for (const item of allItems) {
      if (item.synced && item.timestamp < cutoffTime) {
        await db.delete('data', item.id);
        console.log('Cleaned up old item:', item.id);
      }
    }
  }
  
  async cleanupCache(maxAgeMs = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        const cacheDate = new Date(response.headers.get('date'));
        const age = Date.now() - cacheDate.getTime();
        
        if (age > maxAgeMs) {
          await cache.delete(request);
          console.log('Cleaned up old cache:', request.url);
        }
      }
    }
  }
  
  async prioritizeContent(db) {
    const { percentUsed } = await this.checkStorageQuota();
    
    if (percentUsed > 80) {
      console.warn('Storage usage high, prioritizing content...');
      
      // 1. Delete draft items
      await this.deleteDrafts(db);
      
      // 2. Delete cached media
      await this.deleteCachedMedia();
      
      // 3. Keep only recent items
      await this.cleanupOldData(db, 7); // Keep only 7 days
    }
  }
  
  async deleteDrafts(db) {
    const allItems = await db.readAll('data');
    
    for (const item of allItems) {
      if (item.isDraft && item.timestamp < Date.now() - 24 * 60 * 60 * 1000) {
        await db.delete('data', item.id);
      }
    }
  }
  
  async deleteCachedMedia() {
    const cache = await caches.open('media-cache');
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.url.match(/\.(jpg|png|mp4|mp3)$/)) {
        await cache.delete(request);
      }
    }
  }
  
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
  
  // Monitor storage and alert user
  async monitorStorage(db) {
    setInterval(async () => {
      const { percentUsed } = await this.checkStorageQuota();
      
      if (percentUsed > 90) {
        this.showStorageWarning('critical');
        await this.prioritizeContent(db);
      } else if (percentUsed > 75) {
        this.showStorageWarning('warning');
      }
    }, 60 * 1000); // Check every minute
  }
  
  showStorageWarning(level) {
    const messages = {
      warning: 'Storage is running low. Some old content may be deleted.',
      critical: 'Storage is almost full. Cleaning up old content...'
    };
    
    // Show user notification
    console.warn(messages[level]);
    
    // Could show UI notification
    if (Notification.permission === 'granted') {
      new Notification('Storage Warning', {
        body: messages[level]
      });
    }
  }
}

// Usage
const storageManager = new StorageManager();

// Check storage on app start
await storageManager.checkStorageQuota();

// Request persistent storage
await storageManager.requestPersistentStorage();

// Setup monitoring
storageManager.monitorStorage(db);

// Periodic cleanup
setInterval(() => {
  storageManager.cleanupOldData(db);
  storageManager.cleanupCache();
}, 24 * 60 * 60 * 1000); // Daily
```

---

## Why This Matters & How to Apply

### Core Principles

1. **Local-first, sync later** - Save locally immediately, sync in background
2. **Progressive enhancement** - Network is enhancement, not requirement
3. **Optimistic UI** - Show changes immediately, resolve conflicts later
4. **Smart caching** - Cache strategically based on content type
5. **Background sync** - Sync automatically when online returns

### Mental Model

```
Offline-First = Having a Local Copy of Everything
──────────────────────────────────────────────────────

Traditional App = Restaurant with takeout only
- Must call to order (network required)
- Wait for delivery (latency)
- If phone down, can't order (failure)

Offline-First = Restaurant with fully stocked home kitchen
- Cook immediately (local data)
- Get groceries later when convenient (sync)
- Kitchen always works (offline capable)
```

### Decision Framework

**Should I build offline-first?**
```
Is my app used in areas with poor connectivity?
├─ Yes → Build offline-first ✅
│   Examples: Mobile apps, field work, travel apps
│
└─ No → Is instant UX important?
    ├─ Yes → Build offline-first ✅
    │   Examples: Note-taking, productivity, games
    │
    └─ No → Is reliability critical?
        ├─ Yes → Build offline-first ✅
        │   Examples: Healthcare, finance, education
        │
        └─ No → Traditional online-first may be OK
            Consider offline for performance benefits anyway
```

### Production Checklist

**Before Launch:**
- [ ] Service Worker registered and tested
- [ ] IndexedDB schema designed and versioned
- [ ] Sync queue implemented with retry logic
- [ ] Conflict resolution strategy chosen
- [ ] Storage quota management in place
- [ ] Offline UI states designed
- [ ] Background sync tested (with/without API support)
- [ ] Network status indicators implemented
- [ ] User informed about offline capabilities
- [ ] Tested on slow/intermittent connections

**Monitoring:**
```javascript
// Track offline usage
if (!navigator.onLine) {
  analytics.track('app-used-offline', {
    feature: 'todo-creation',
    timestamp: Date.now()
  });
}

// Track sync success/failure
window.addEventListener('sync-complete', () => {
  analytics.track('sync-success', {
    itemssynced: queueLength
  });
});

// Track conflicts
window.addEventListener('sync-conflict', () => {
  analytics.track('sync-conflict', {
    conflictType: 'last-write-wins'
  });
});
```

### Common Mistakes

❌ **Mistake 1: Not handling storage limits**
```javascript
// Will eventually run out of space
await db.create('items', largeItem);
```

✅ **Fix: Monitor and cleanup**
```javascript
const { percentUsed } = await storageManager.checkQuota();
if (percentUsed > 80) {
  await storageManager.cleanup();
}
await db.create('items', largeItem);
```

❌ **Mistake 2: No conflict resolution**
```javascript
// Just overwrites server data
await fetch('/api/item', { method: 'PUT', body: localItem });
```

✅ **Fix: Detect and resolve conflicts**
```javascript
const response = await fetch('/api/item', {
  method: 'PUT',
  body: JSON.stringify(localItem)
});

if (response.status === 409) {
  const serverItem = await response.json();
  const resolved = await resolver.resolve(localItem, serverItem);
  // Apply resolution
}
```

❌ **Mistake 3: Blocking UI during sync**
```javascript
// Blocks UI while syncing
await syncAllData();
showSuccess();
```

✅ **Fix: Background sync**
```javascript
// Sync in background
syncAllData(); // No await
showSuccess(); // UI immediate
```

### Performance Impact

**Metrics:**
- **Perceived Performance**: 100% improvement (instant vs network latency)
- **Offline Usage**: 20-40% of users work offline at some point
- **User Satisfaction**: 30-50% increase with offline support
- **Session Length**: 25% longer with offline capability

**Business Impact:**
- Works in 0 connectivity: +100% availability
- Instant updates: +50% perceived speed
- Reliable everywhere: +40% user retention
- Mobile-optimized: +30% mobile engagement

---

## Summary & Key Takeaways

### Critical Concepts

1. **Offline-First = Local storage primary, network secondary**
2. **Service Worker** intercepts requests, implements caching
3. **IndexedDB** stores application data locally
4. **Sync Manager** queues operations, syncs when online
5. **Conflict Resolution** required for concurrent edits
6. **Background Sync API** for reliable synchronization
7. **Storage Management** prevents quota exhaustion

### Quick Reference

| Component | Purpose | Technology |
|-----------|---------|------------|
| Network Interceptor | Cache responses | Service Worker |
| Local Database | Store app data | IndexedDB |
| Sync Queue | Queue offline operations | IndexedDB + Background Sync |
| Conflict Resolution | Handle concurrent edits | Custom logic |
| Storage Management | Prevent quota issues | Storage API |

### Interview Success Formula

1. **Define offline-first** - Local-first with background sync
2. **Explain components** - Service Worker, IndexedDB, Sync Manager
3. **Show caching strategies** - Cache-first, network-first, stale-while-revalidate
4. **Discuss conflicts** - Detection methods, resolution strategies
5. **Demonstrate sync** - Background Sync API, fallback approaches
6. **Handle storage** - Quota management, cleanup strategies
7. **Real examples** - Todo app, notes, e-commerce cart

### One-Sentence Summary

> Offline-first architecture prioritizes local storage as the primary data source with background synchronization to servers, enabling apps to function fully without network connectivity while automatically syncing changes when connectivity returns.

---

**Related Topics:**
- [94. Service Workers](../Module%209.2%20—%20Client%20Persistence/94_Service_Workers.md)
- [95. IndexedDB](../Module%209.2%20—%20Client%20Persistence/95_IndexedDB.md)
- [97. Cache Invalidation](./97_Cache_Invalidation.md)
- [92. HTTP Caching](../Module%209.1%20—%20Caching%20Layers/92_HTTP_Caching.md)
