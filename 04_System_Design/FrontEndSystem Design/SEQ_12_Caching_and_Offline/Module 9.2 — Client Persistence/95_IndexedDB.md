# 73. IndexedDB

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**IndexedDB** is a low-level, transactional, NoSQL database built into browsers for storing large amounts of structured data client-side. Unlike localStorage (5-10MB, synchronous, key-value), IndexedDB provides asynchronous API, ~1GB+ storage quota, indexes, transactions, and complex queries—making it suitable for offline-first applications, caching large datasets, and building web apps that rival native functionality.

### What it is:
A client-side database with:
- **Object stores**: Like tables, store JavaScript objects
- **Indexes**: Fast lookups by any property (not just key)
- **Transactions**: ACID guarantees for data consistency
- **Versioning**: Schema migrations via version numbers
- **Asynchronous API**: Non-blocking, promise-based (or event-based legacy)
- **Large capacity**: ~50% of disk space or ~1GB minimum (varies by browser)
- **Structured data**: Objects, arrays, blobs, files

**Key characteristics:**
```javascript
// IndexedDB structure
Database: "myApp"
  └─ Object Store: "users"
      ├─ Key: 1 → Value: { id: 1, name: "Alice", email: "alice@example.com" }
      ├─ Key: 2 → Value: { id: 2, name: "Bob", email: "bob@example.com" }
      └─ Index: "email" → Fast lookup by email
  └─ Object Store: "posts"
      ├─ Key: "post-1" → Value: { ... }
      └─ Index: "timestamp" → Fast lookup by date
```

### Why it exists:
**Problems with alternatives:**
- **localStorage**: 
  - 5-10MB limit (too small for real apps)
  - Synchronous API (blocks UI thread)
  - String-only values (requires JSON serialization)
  - No queries/indexes (linear scans)
  
- **Cookies**: 
  - 4KB limit (tiny)
  - Sent with every request (overhead)
  - Not for client-side storage
  
- **In-memory state**:
  - Lost on reload
  - Limited by RAM
  - No persistence

**IndexedDB solves:**
- **Large data**: Store hundreds of MB (product catalogs, media metadata, cached API responses)
- **Fast queries**: Indexes for O(log n) lookups vs O(n) linear scans
- **Offline capability**: Full application data available offline
- **Transactions**: Consistent state even with concurrent operations
- **Async**: Non-blocking, doesn't freeze UI

**Real-world impact:**
```
E-commerce app without IndexedDB:
- 10,000 products × 2KB each = 20MB
- localStorage: Can't store (5MB limit)
- Network fetch: 20MB download on every visit
- Search: Network request for each query
- Offline: Complete failure

E-commerce app with IndexedDB:
- 10,000 products stored locally (20MB)
- First visit: 20MB download + IndexedDB store
- Subsequent visits: Instant load from IndexedDB
- Search: 5ms query vs 300ms network
- Offline: Full browse capability
- Result: 60x faster product browsing, offline works
```

### When and where it's used:
**Essential for:**
- **Offline-first apps**: PWAs with full offline functionality
- **Large datasets**: Product catalogs, media libraries, document storage
- **Background sync**: Queue operations for later execution
- **Cache management**: Store API responses with metadata (timestamp, version)
- **Draft storage**: Save user work locally (editors, forms)
- **Analytics buffering**: Queue events, batch send when online

**Not suitable for:**
- **Small data** (< 1MB): Use localStorage (simpler API)
- **Server state only**: Use in-memory cache (React Query, SWR)
- **Sensitive data**: Use encrypted storage or server-side only
- **Shared across devices**: Use server-side database

### Role in large-scale applications:
In production systems:
- **Service Worker integration**: Cache complex data structures offline
- **Sync queue**: Persist failed requests for background sync
- **Performance**: Eliminate network latency for cached data (5ms vs 300ms)
- **Quota management**: Monitor usage, implement LRU eviction
- **Data migration**: Version upgrades handle schema changes
- **Monitoring**: Track database size, query performance, error rates

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Database Architecture

**IndexedDB structure hierarchy:**

```
Browser Storage (per origin: https://example.com)
│
├─ IndexedDB (multiple databases)
│  │
│  ├─ Database: "myApp" (version: 3)
│  │  │
│  │  ├─ Object Store: "users"
│  │  │  ├─ keyPath: "id" (inline key)
│  │  │  ├─ autoIncrement: true
│  │  │  ├─ Indexes:
│  │  │  │  ├─ "email" (unique: true)
│  │  │  │  └─ "age" (unique: false)
│  │  │  └─ Records:
│  │  │     ├─ { id: 1, name: "Alice", email: "alice@...", age: 30 }
│  │  │     ├─ { id: 2, name: "Bob", email: "bob@...", age: 25 }
│  │  │     └─ { id: 3, name: "Carol", email: "carol@...", age: 35 }
│  │  │
│  │  ├─ Object Store: "posts"
│  │  │  ├─ keyPath: null (out-of-line key)
│  │  │  ├─ Records:
│  │  │  │  ├─ Key: "post-1" → { title: "...", content: "...", timestamp: ... }
│  │  │  │  └─ Key: "post-2" → { title: "...", content: "...", timestamp: ... }
│  │  │  └─ Index: "timestamp"
│  │  │
│  │  └─ Object Store: "cache"
│  │     └─ Records: API response cache
│  │
│  └─ Database: "analytics" (version: 1)
│     └─ Object Store: "events"
│
├─ localStorage (5-10MB)
├─ sessionStorage (5-10MB)
└─ Cache Storage (Service Worker, ~1GB)
```

### Storage Quota System

**Browser quota allocation:**

```javascript
// Check storage quota
const estimate = await navigator.storage.estimate();

console.log(`
  Total quota: ${(estimate.quota / 1024 / 1024 / 1024).toFixed(2)} GB
  Used: ${(estimate.usage / 1024 / 1024).toFixed(2)} MB
  Available: ${((estimate.quota - estimate.usage) / 1024 / 1024).toFixed(2)} MB
  Percentage: ${(estimate.usage / estimate.quota * 100).toFixed(2)}%
`);

// Typical quotas (varies by browser and available disk):
// Chrome: ~60% of available disk space (min 1GB)
// Firefox: ~50% of available disk space (min 1GB)
// Safari: ~1GB (stricter limits)

// Example on device with 100GB free:
// Chrome quota: ~60GB
// Firefox quota: ~50GB
// Safari quota: ~1GB
```

**Quota exceeded handling:**

```javascript
// Handling QuotaExceededError
async function storeDataWithQuotaHandling(db, storeName, data) {
  try {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.add(data);
    await tx.complete;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded');
      
      // Strategy 1: Delete oldest entries
      await cleanupOldEntries(db, storeName);
      
      // Strategy 2: Request persistent storage
      await requestPersistentStorage();
      
      // Retry
      await storeDataWithQuotaHandling(db, storeName, data);
    } else {
      throw error;
    }
  }
}

async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Persistent storage: ${isPersisted ? 'granted' : 'denied'}`);
    return isPersisted;
  }
  return false;
}
```

### Transaction Model

**ACID transactions in IndexedDB:**

```javascript
// Transaction types:
// - "readonly": Multiple concurrent reads allowed
// - "readwrite": Exclusive write lock
// - "versionchange": Only during database upgrade

// Transaction example
const tx = db.transaction(['users', 'posts'], 'readwrite');
const usersStore = tx.objectStore('users');
const postsStore = tx.objectStore('posts');

// All operations in same transaction
usersStore.add({ id: 1, name: "Alice" });
postsStore.add({ id: 1, userId: 1, title: "First post" });

// Commit is automatic when all requests complete
// Or explicit:
await tx.complete;

// Rollback if any error:
tx.onerror = () => {
  console.error('Transaction failed, rolled back');
};
```

**Transaction performance characteristics:**

```
Single transaction (100 records):
├─ Start transaction: ~1ms
├─ 100× add operations: ~50ms (batched)
├─ Commit: ~20ms
└─ Total: ~71ms

100 separate transactions (1 record each):
├─ 100× start transaction: ~100ms
├─ 100× add operation: ~500ms
├─ 100× commit: ~2000ms
└─ Total: ~2600ms (36x slower!)

Key insight: Batch operations in single transaction
```

### Indexes and Query Performance

**Index types and performance:**

```javascript
// Creating indexes
const objectStore = db.createObjectStore('products', { keyPath: 'id' });

// 1. Unique index (enforces uniqueness)
objectStore.createIndex('sku', 'sku', { unique: true });

// 2. Non-unique index (multiple records can have same value)
objectStore.createIndex('category', 'category', { unique: false });

// 3. Multi-entry index (array values)
objectStore.createIndex('tags', 'tags', { multiEntry: true });
// Record: { id: 1, tags: ['electronics', 'sale'] }
// Creates index entries: 'electronics' → 1, 'sale' → 1

// 4. Compound index (multiple properties)
objectStore.createIndex('categoryPrice', ['category', 'price']);
```

**Query performance comparison:**

```javascript
// Scenario: 10,000 products, find by category

// ❌ BAD: No index (linear scan)
async function findByCategoryNoIndex(db, category) {
  const tx = db.transaction('products', 'readonly');
  const store = tx.objectStore('products');
  const results = [];
  
  // O(n) - scans every record
  let cursor = await store.openCursor();
  while (cursor) {
    if (cursor.value.category === category) {
      results.push(cursor.value);
    }
    cursor = await cursor.continue();
  }
  
  return results;
}
// Performance: ~200ms (scans 10,000 records)

// ✅ GOOD: With index (B-tree lookup)
async function findByCategoryWithIndex(db, category) {
  const tx = db.transaction('products', 'readonly');
  const store = tx.objectStore('products');
  const index = store.index('category');
  
  // O(log n) lookup + O(k) results (k = matching records)
  const results = await index.getAll(category);
  
  return results;
}
// Performance: ~5ms (index lookup)

// Speedup: 40x faster with index!
```

### Versioning and Schema Migration

**Database version upgrade pattern:**

```javascript
// Version 1: Initial schema
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('myApp', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store
      const store = db.createObjectStore('users', { keyPath: 'id' });
      store.createIndex('email', 'email', { unique: true });
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Version 2: Add new object store
function openDB_v2() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('myApp', 2); // Increment version
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      
      // Migrations based on old version
      if (oldVersion < 1) {
        // Create users store (new database)
        const store = db.createObjectStore('users', { keyPath: 'id' });
        store.createIndex('email', 'email', { unique: true });
      }
      
      if (oldVersion < 2) {
        // Add posts store (v1 → v2 migration)
        const postsStore = db.createObjectStore('posts', { 
          keyPath: 'id',
          autoIncrement: true 
        });
        postsStore.createIndex('userId', 'userId');
        postsStore.createIndex('timestamp', 'timestamp');
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Version 3: Modify existing store
function openDB_v3() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('myApp', 3);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      const tx = event.target.transaction;
      
      // ... previous migrations (v1, v2)
      
      if (oldVersion < 3) {
        // Add new index to existing store
        const usersStore = tx.objectStore('users');
        usersStore.createIndex('age', 'age', { unique: false });
        
        // Migrate existing data
        const cursor = await usersStore.openCursor();
        while (cursor) {
          const user = cursor.value;
          if (!user.age) {
            user.age = null; // Set default
            cursor.update(user);
          }
          cursor = await cursor.continue();
        }
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

### Cursor-Based Iteration

**Efficient large dataset traversal:**

```javascript
// Cursor iteration patterns

// 1. Forward cursor (all records)
async function getAllUsers(db) {
  const tx = db.transaction('users', 'readonly');
  const store = tx.objectStore('users');
  const users = [];
  
  let cursor = await store.openCursor();
  while (cursor) {
    users.push(cursor.value);
    cursor = await cursor.continue();
  }
  
  return users;
}

// 2. Reverse cursor (newest first)
async function getRecentPosts(db, limit = 10) {
  const tx = db.transaction('posts', 'readonly');
  const store = tx.objectStore('posts');
  const index = store.index('timestamp');
  const posts = [];
  
  // Open cursor in reverse direction
  let cursor = await index.openCursor(null, 'prev');
  let count = 0;
  
  while (cursor && count < limit) {
    posts.push(cursor.value);
    count++;
    cursor = await cursor.continue();
  }
  
  return posts;
}

// 3. Range query
async function getUsersByAgeRange(db, minAge, maxAge) {
  const tx = db.transaction('users', 'readonly');
  const store = tx.objectStore('users');
  const index = store.index('age');
  
  // Create key range
  const range = IDBKeyRange.bound(minAge, maxAge);
  
  const users = [];
  let cursor = await index.openCursor(range);
  
  while (cursor) {
    users.push(cursor.value);
    cursor = await cursor.continue();
  }
  
  return users;
}

// 4. Pagination with cursor
async function getUsersPaginated(db, pageSize, lastKey = null) {
  const tx = db.transaction('users', 'readonly');
  const store = tx.objectStore('users');
  const users = [];
  
  // Start from lastKey + 1 (for next page)
  const range = lastKey ? IDBKeyRange.lowerBound(lastKey, true) : null;
  
  let cursor = await store.openCursor(range);
  let count = 0;
  
  while (cursor && count < pageSize) {
    users.push(cursor.value);
    count++;
    cursor = await cursor.continue();
  }
  
  return {
    users,
    nextKey: users.length > 0 ? users[users.length - 1].id : null,
    hasMore: cursor !== null
  };
}
```

### Common Pitfalls and Solutions

**Pitfall 1: Blocking the UI thread**

```javascript
// ❌ BAD: Synchronous-looking code with await in loop
async function processAllUsers(db) {
  const tx = db.transaction('users', 'readonly');
  const store = tx.objectStore('users');
  
  let cursor = await store.openCursor();
  while (cursor) {
    // Each await blocks
    await processUser(cursor.value); // 50ms per user
    cursor = await cursor.continue();
  }
  
  // With 10,000 users: 500 seconds! UI frozen!
}

// ✅ GOOD: Batch processing with yielding
async function processAllUsersBatched(db, batchSize = 100) {
  const tx = db.transaction('users', 'readonly');
  const store = tx.objectStore('users');
  
  let cursor = await store.openCursor();
  let batch = [];
  
  while (cursor) {
    batch.push(cursor.value);
    
    if (batch.length >= batchSize) {
      // Process batch
      await processBatch(batch);
      batch = [];
      
      // Yield to UI thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    cursor = await cursor.continue();
  }
  
  // Process remaining
  if (batch.length > 0) {
    await processBatch(batch);
  }
}
```

**Pitfall 2: Transaction auto-commit**

```javascript
// ❌ BAD: Transaction commits before async work
async function addUserBad(db, user) {
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  
  // Await inside transaction
  const processed = await processUserData(user); // Async!
  
  // ERROR: Transaction already committed!
  store.add(processed); // TransactionInactiveError
}

// ✅ GOOD: Complete async work before transaction
async function addUserGood(db, user) {
  // Process data first
  const processed = await processUserData(user);
  
  // Then do transaction synchronously
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  store.add(processed);
  
  return tx.complete;
}
```

**Pitfall 3: Not handling version upgrades**

```javascript
// ❌ BAD: No migration path
const request = indexedDB.open('myApp', 2);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  
  // Creates store only on fresh install
  // Existing v1 users won't have it!
  db.createObjectStore('posts', { keyPath: 'id' });
};

// ✅ GOOD: Check old version
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const oldVersion = event.oldVersion;
  
  if (oldVersion < 1) {
    db.createObjectStore('users', { keyPath: 'id' });
  }
  
  if (oldVersion < 2) {
    // This runs for v1 users upgrading to v2
    db.createObjectStore('posts', { keyPath: 'id' });
  }
};
```

**Pitfall 4: Large objects causing memory issues**

```javascript
// ❌ BAD: Loading all data into memory
async function getAllProductsData(db) {
  const tx = db.transaction('products', 'readonly');
  const store = tx.objectStore('products');
  
  // Loads 50MB into memory!
  const allProducts = await store.getAll();
  
  return allProducts; // Out of memory on low-end devices
}

// ✅ GOOD: Cursor-based streaming
async function streamProducts(db, callback) {
  const tx = db.transaction('products', 'readonly');
  const store = tx.objectStore('products');
  
  let cursor = await store.openCursor();
  
  while (cursor) {
    // Process one at a time
    callback(cursor.value);
    cursor = await cursor.continue();
  }
}

// Usage:
let count = 0;
await streamProducts(db, (product) => {
  displayProduct(product); // Process immediately
  count++;
});
```

### Performance Optimization Techniques

**1. Batching writes in single transaction:**

```javascript
// ❌ Slow: 1000 separate transactions
for (let i = 0; i < 1000; i++) {
  const tx = db.transaction('data', 'readwrite');
  tx.objectStore('data').add({ id: i, value: Math.random() });
  await tx.complete;
}
// Time: ~5000ms

// ✅ Fast: Single transaction
const tx = db.transaction('data', 'readwrite');
const store = tx.objectStore('data');

for (let i = 0; i < 1000; i++) {
  store.add({ id: i, value: Math.random() });
}

await tx.complete;
// Time: ~150ms (33x faster!)
```

**2. Using indexes for common queries:**

```javascript
// Design indexes based on query patterns

// Common query: Get products by category
objectStore.createIndex('category', 'category');

// Common query: Get recent products
objectStore.createIndex('timestamp', 'timestamp');

// Common query: Get products by category AND price range
// Use compound index:
objectStore.createIndex('categoryPrice', ['category', 'price']);

// Query using compound index:
const range = IDBKeyRange.bound(
  ['electronics', 0],
  ['electronics', 1000]
);
const results = await index.getAll(range);
```

**3. Lazy loading related data:**

```javascript
// ❌ BAD: Eager loading (N+1 query problem)
async function getUsersWithPosts(db) {
  const users = await getAllUsers(db);
  
  for (const user of users) {
    // N queries!
    user.posts = await getPostsByUserId(db, user.id);
  }
  
  return users;
}

// ✅ GOOD: Load on-demand
async function getUsers(db) {
  return await getAllUsers(db);
}

async function loadUserPosts(db, userId) {
  return await getPostsByUserId(db, userId);
}

// Load posts only when needed (user clicks expand)
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: Production IndexedDB Wrapper (idb library)

```javascript
// Modern promise-based wrapper using idb library
import { openDB } from 'idb';

class DatabaseManager {
  constructor() {
    this.db = null;
    this.DB_NAME = 'myApp';
    this.VERSION = 3;
  }
  
  async init() {
    this.db = await openDB(this.DB_NAME, this.VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Version 1: Create users store
        if (oldVersion < 1) {
          const usersStore = db.createObjectStore('users', {
            keyPath: 'id',
            autoIncrement: true
          });
          usersStore.createIndex('email', 'email', { unique: true });
          usersStore.createIndex('name', 'name');
        }
        
        // Version 2: Create posts store
        if (oldVersion < 2) {
          const postsStore = db.createObjectStore('posts', {
            keyPath: 'id',
            autoIncrement: true
          });
          postsStore.createIndex('userId', 'userId');
          postsStore.createIndex('timestamp', 'timestamp');
          postsStore.createIndex('userTimestamp', ['userId', 'timestamp']);
        }
        
        // Version 3: Add cache store
        if (oldVersion < 3) {
          const cacheStore = db.createObjectStore('cache', {
            keyPath: 'url'
          });
          cacheStore.createIndex('timestamp', 'timestamp');
        }
      },
      
      blocked() {
        console.warn('Database upgrade blocked by another tab');
      },
      
      blocking() {
        console.warn('This tab is blocking database upgrade');
      }
    });
    
    console.log('Database initialized');
    return this.db;
  }
  
  // === USERS OPERATIONS ===
  
  async addUser(user) {
    return await this.db.add('users', user);
  }
  
  async getUser(id) {
    return await this.db.get('users', id);
  }
  
  async getUserByEmail(email) {
    return await this.db.getFromIndex('users', 'email', email);
  }
  
  async updateUser(id, updates) {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    Object.assign(user, updates);
    return await this.db.put('users', user);
  }
  
  async deleteUser(id) {
    return await this.db.delete('users', id);
  }
  
  async getAllUsers() {
    return await this.db.getAll('users');
  }
  
  async searchUsers(query) {
    const lowerQuery = query.toLowerCase();
    const tx = this.db.transaction('users', 'readonly');
    const index = tx.store.index('name');
    
    const results = [];
    for await (const cursor of index.iterate()) {
      if (cursor.value.name.toLowerCase().includes(lowerQuery)) {
        results.push(cursor.value);
      }
    }
    
    return results;
  }
  
  // === POSTS OPERATIONS ===
  
  async addPost(post) {
    post.timestamp = Date.now();
    return await this.db.add('posts', post);
  }
  
  async getPost(id) {
    return await this.db.get('posts', id);
  }
  
  async getPostsByUser(userId, limit = 10) {
    const tx = this.db.transaction('posts', 'readonly');
    const index = tx.store.index('userTimestamp');
    
    // Range: [userId, -Infinity] to [userId, +Infinity]
    const range = IDBKeyRange.bound(
      [userId, 0],
      [userId, Date.now()]
    );
    
    const posts = [];
    for await (const cursor of index.iterate(range, 'prev')) {
      posts.push(cursor.value);
      if (posts.length >= limit) break;
    }
    
    return posts;
  }
  
  async getRecentPosts(limit = 20) {
    const tx = this.db.transaction('posts', 'readonly');
    const index = tx.store.index('timestamp');
    
    const posts = [];
    for await (const cursor of index.iterate(null, 'prev')) {
      posts.push(cursor.value);
      if (posts.length >= limit) break;
    }
    
    return posts;
  }
  
  async deletePost(id) {
    return await this.db.delete('posts', id);
  }
  
  // === CACHE OPERATIONS ===
  
  async cacheResponse(url, data, ttl = 3600000) { // 1 hour default
    const cacheEntry = {
      url,
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    };
    
    return await this.db.put('cache', cacheEntry);
  }
  
  async getCachedResponse(url) {
    const entry = await this.db.get('cache', url);
    
    if (!entry) {
      return null;
    }
    
    // Check expiration
    if (Date.now() > entry.expires) {
      await this.db.delete('cache', url);
      return null;
    }
    
    return entry.data;
  }
  
  async clearExpiredCache() {
    const tx = this.db.transaction('cache', 'readwrite');
    const index = tx.store.index('timestamp');
    
    let deleted = 0;
    for await (const cursor of index.iterate()) {
      if (Date.now() > cursor.value.expires) {
        cursor.delete();
        deleted++;
      }
    }
    
    console.log(`Cleared ${deleted} expired cache entries`);
    return deleted;
  }
  
  async clearAllCache() {
    return await this.db.clear('cache');
  }
  
  // === UTILITY OPERATIONS ===
  
  async getStorageSize() {
    const stores = ['users', 'posts', 'cache'];
    let totalSize = 0;
    
    for (const storeName of stores) {
      const count = await this.db.count(storeName);
      const sample = await this.db.getAll(storeName, 1);
      
      if (sample.length > 0) {
        // Estimate size
        const sampleSize = JSON.stringify(sample[0]).length;
        totalSize += sampleSize * count;
      }
    }
    
    return totalSize;
  }
  
  async exportData() {
    const data = {};
    
    data.users = await this.db.getAll('users');
    data.posts = await this.db.getAll('posts');
    data.cache = await this.db.getAll('cache');
    
    return JSON.stringify(data);
  }
  
  async importData(jsonData) {
    const data = JSON.parse(jsonData);
    
    const tx = this.db.transaction(['users', 'posts', 'cache'], 'readwrite');
    
    for (const user of data.users) {
      await tx.objectStore('users').put(user);
    }
    
    for (const post of data.posts) {
      await tx.objectStore('posts').put(post);
    }
    
    for (const cacheEntry of data.cache) {
      await tx.objectStore('cache').put(cacheEntry);
    }
    
    await tx.done;
  }
  
  async deleteDatabase() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    await deleteDB(this.DB_NAME);
    console.log('Database deleted');
  }
}

// Usage
const dbManager = new DatabaseManager();
await dbManager.init();

// Add user
const userId = await dbManager.addUser({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30
});

// Get user
const user = await dbManager.getUser(userId);

// Add post
await dbManager.addPost({
  userId,
  title: 'My first post',
  content: 'Hello world!'
});

// Get user's posts
const posts = await dbManager.getPostsByUser(userId);

// Cache API response
await dbManager.cacheResponse('/api/products', productsData, 3600000);

// Get cached data
const cachedProducts = await dbManager.getCachedResponse('/api/products');
```

### Example 2: Offline-First Data Sync Queue

```javascript
// syncQueue.js - Background sync with IndexedDB

class SyncQueue {
  constructor(dbManager) {
    this.db = dbManager;
    this.syncInProgress = false;
  }
  
  async init() {
    // Ensure sync store exists
    await this.db.db.createObjectStore('syncQueue', {
      keyPath: 'id',
      autoIncrement: true
    });
  }
  
  async enqueue(operation) {
    const entry = {
      operation: operation.type, // 'CREATE', 'UPDATE', 'DELETE'
      resource: operation.resource, // 'users', 'posts', etc.
      data: operation.data,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
      maxRetries: 5
    };
    
    const id = await this.db.db.add('syncQueue', entry);
    console.log(`Enqueued operation ${id}:`, entry);
    
    // Trigger sync if online
    if (navigator.onLine) {
      this.sync();
    }
    
    return id;
  }
  
  async sync() {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }
    
    if (!navigator.onLine) {
      console.log('Offline, skipping sync');
      return;
    }
    
    this.syncInProgress = true;
    console.log('Starting sync...');
    
    try {
      const pending = await this.getPendingOperations();
      console.log(`Found ${pending.length} pending operations`);
      
      for (const entry of pending) {
        try {
          await this.executeOperation(entry);
          await this.markAsCompleted(entry.id);
          console.log(`Synced operation ${entry.id}`);
        } catch (error) {
          console.error(`Failed to sync operation ${entry.id}:`, error);
          await this.incrementRetry(entry.id);
          
          // Give up after max retries
          if (entry.retries >= entry.maxRetries) {
            await this.markAsFailed(entry.id, error.message);
          }
        }
      }
      
      console.log('Sync completed');
    } finally {
      this.syncInProgress = false;
    }
  }
  
  async getPendingOperations() {
    const tx = this.db.db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    
    const operations = [];
    for await (const cursor of store.iterate()) {
      if (cursor.value.status === 'pending') {
        operations.push(cursor.value);
      }
    }
    
    return operations;
  }
  
  async executeOperation(entry) {
    const { operation, resource, data } = entry;
    
    let response;
    switch (operation) {
      case 'CREATE':
        response = await fetch(`/api/${resource}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;
      
      case 'UPDATE':
        response = await fetch(`/api/${resource}/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;
      
      case 'DELETE':
        response = await fetch(`/api/${resource}/${data.id}`, {
          method: 'DELETE'
        });
        break;
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async markAsCompleted(id) {
    await this.db.db.delete('syncQueue', id);
  }
  
  async incrementRetry(id) {
    const entry = await this.db.db.get('syncQueue', id);
    entry.retries++;
    entry.lastAttempt = Date.now();
    await this.db.db.put('syncQueue', entry);
  }
  
  async markAsFailed(id, error) {
    const entry = await this.db.db.get('syncQueue', id);
    entry.status = 'failed';
    entry.error = error;
    await this.db.db.put('syncQueue', entry);
  }
  
  async getQueueStatus() {
    const all = await this.db.db.getAll('syncQueue');
    
    return {
      total: all.length,
      pending: all.filter(e => e.status === 'pending').length,
      failed: all.filter(e => e.status === 'failed').length,
      oldestPending: all
        .filter(e => e.status === 'pending')
        .sort((a, b) => a.timestamp - b.timestamp)[0]
    };
  }
  
  async clearCompleted() {
    const tx = this.db.db.transaction('syncQueue', 'readwrite');
    for await (const cursor of tx.store.iterate()) {
      if (cursor.value.status === 'completed') {
        cursor.delete();
      }
    }
  }
}

// Usage in application
const dbManager = new DatabaseManager();
await dbManager.init();

const syncQueue = new SyncQueue(dbManager);

// Enqueue offline operations
await syncQueue.enqueue({
  type: 'CREATE',
  resource: 'posts',
  data: {
    title: 'Offline post',
    content: 'Created while offline'
  }
});

// Listen for online event
window.addEventListener('online', () => {
  console.log('Back online, syncing...');
  syncQueue.sync();
});

// Periodic sync
setInterval(() => {
  if (navigator.onLine) {
    syncQueue.sync();
  }
}, 60000); // Every minute
```

### Example 3: Product Catalog with Search

```javascript
// productCatalog.js - E-commerce product database

class ProductCatalog {
  constructor(dbManager) {
    this.db = dbManager;
  }
  
  async init() {
    // Create products store with indexes
    const db = this.db.db;
    
    if (!db.objectStoreNames.contains('products')) {
      const productsStore = db.createObjectStore('products', {
        keyPath: 'id'
      });
      
      productsStore.createIndex('name', 'name');
      productsStore.createIndex('category', 'category');
      productsStore.createIndex('price', 'price');
      productsStore.createIndex('categoryPrice', ['category', 'price']);
      productsStore.createIndex('tags', 'tags', { multiEntry: true });
    }
  }
  
  async addProduct(product) {
    return await this.db.db.add('products', product);
  }
  
  async bulkAddProducts(products) {
    const tx = this.db.db.transaction('products', 'readwrite');
    
    for (const product of products) {
      tx.store.add(product);
    }
    
    await tx.done;
    console.log(`Added ${products.length} products`);
  }
  
  async getProduct(id) {
    return await this.db.db.get('products', id);
  }
  
  async getProductsByCategory(category) {
    return await this.db.db.getAllFromIndex('products', 'category', category);
  }
  
  async getProductsByCategoryAndPriceRange(category, minPrice, maxPrice) {
    const tx = this.db.db.transaction('products', 'readonly');
    const index = tx.store.index('categoryPrice');
    
    const range = IDBKeyRange.bound(
      [category, minPrice],
      [category, maxPrice]
    );
    
    return await index.getAll(range);
  }
  
  async getProductsByTag(tag) {
    return await this.db.db.getAllFromIndex('products', 'tags', tag);
  }
  
  async searchProducts(query) {
    const lowerQuery = query.toLowerCase();
    const tx = this.db.db.transaction('products', 'readonly');
    
    const results = [];
    for await (const cursor of tx.store.iterate()) {
      const product = cursor.value;
      
      // Search in name, description, tags
      if (
        product.name.toLowerCase().includes(lowerQuery) ||
        product.description?.toLowerCase().includes(lowerQuery) ||
        product.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      ) {
        results.push(product);
      }
    }
    
    return results;
  }
  
  async getProductsPaginated(page = 1, pageSize = 20) {
    const tx = this.db.db.transaction('products', 'readonly');
    const store = tx.store;
    
    const offset = (page - 1) * pageSize;
    const products = [];
    
    let cursor = await store.openCursor();
    let skipped = 0;
    let loaded = 0;
    
    while (cursor) {
      if (skipped < offset) {
        // Skip to offset
        cursor = await cursor.continue();
        skipped++;
      } else if (loaded < pageSize) {
        // Load page
        products.push(cursor.value);
        loaded++;
        cursor = await cursor.continue();
      } else {
        // Done
        break;
      }
    }
    
    const total = await store.count();
    
    return {
      products,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page < Math.ceil(total / pageSize)
    };
  }
  
  async updateStock(productId, quantity) {
    const product = await this.getProduct(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    product.stock = quantity;
    product.lastUpdated = Date.now();
    
    return await this.db.db.put('products', product);
  }
  
  async deleteProduct(productId) {
    return await this.db.db.delete('products', productId);
  }
  
  async clearAllProducts() {
    return await this.db.db.clear('products');
  }
  
  async getStats() {
    const tx = this.db.db.transaction('products', 'readonly');
    const store = tx.store;
    
    let total = 0;
    let totalValue = 0;
    const categories = {};
    
    for await (const cursor of store.iterate()) {
      const product = cursor.value;
      total++;
      totalValue += product.price * product.stock;
      
      categories[product.category] = (categories[product.category] || 0) + 1;
    }
    
    return {
      totalProducts: total,
      totalInventoryValue: totalValue,
      categories
    };
  }
}

// Usage
const dbManager = new DatabaseManager();
await dbManager.init();

const catalog = new ProductCatalog(dbManager);

// Add products
await catalog.bulkAddProducts([
  {
    id: 'prod-1',
    name: 'Laptop',
    description: 'High-performance laptop',
    category: 'electronics',
    price: 1200,
    stock: 50,
    tags: ['computers', 'portable', 'productivity']
  },
  {
    id: 'prod-2',
    name: 'Mouse',
    description: 'Wireless mouse',
    category: 'electronics',
    price: 25,
    stock: 200,
    tags: ['computers', 'accessories']
  }
]);

// Search
const results = await catalog.searchProducts('laptop');

// Filter by category and price
const affordableElectronics = await catalog.getProductsByCategoryAndPriceRange(
  'electronics',
  0,
  100
);

// Paginate
const page1 = await catalog.getProductsPaginated(1, 20);
const page2 = await catalog.getProductsPaginated(2, 20);

// Stats
const stats = await catalog.getStats();
console.log('Catalog stats:', stats);
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question: "Explain IndexedDB and when you'd use it over other storage options like localStorage."**

**Strong Answer:**

"IndexedDB is a low-level, transactional, NoSQL database built into browsers for storing large amounts of structured data client-side. It's fundamentally different from localStorage and essential for building serious offline-first applications.

**The core differentiator is scale and capability**. localStorage is limited to 5-10MB and uses a synchronous API that blocks the UI thread—completely unsuitable for production applications with real data needs. IndexedDB provides ~1GB+ storage (50% of available disk in Chrome), an asynchronous API, ACID transactions, indexes for fast queries, and can store complex JavaScript objects, not just strings.

**The architecture** is object-store based, similar to document databases like MongoDB. You create object stores (analogous to tables), define a keyPath or out-of-line keys, and create indexes on properties you'll query frequently. Critically, IndexedDB supports compound indexes—if I'm frequently querying products by category AND price range, I create a compound index on `['category', 'price']` which enables O(log n) lookups instead of O(n) scans. On a catalog of 10,000 products, that's the difference between 5ms and 200ms.

**At my last company**, we built an e-commerce PWA where users could browse 15,000 products offline. Initial sync downloaded the catalog (30MB) and stored it in IndexedDB with indexes on category, price, tags, and a compound index for category-price queries. Search queries hit the index and returned results in under 10ms—indistinguishable from server-side search. Users could browse, add to cart, and checkout offline, with orders queued in IndexedDB for background sync when connectivity returned. This drove a 34% increase in mobile conversion because flaky connections no longer caused lost sessions.

**Transaction model** is crucial for consistency. All IndexedDB operations happen within transactions, which are automatically committed when all operations complete or rolled back on error. When implementing our sync queue, we used transactions to ensure atomic updates—if syncing a cart required updating both the cart object store and inventory object store, either both succeed or neither does. This prevented inconsistent states that could corrupt user data.

**Version management** handles schema evolution. Each database has a version number, and upgrades trigger an `onupgradeneeded` event where you perform migrations. We incremented from v1 to v2 to add a 'favorites' object store, and v2 to v3 to add an age index to the users store for demographic filtering. The migration system checks `oldVersion` and applies only necessary changes—users on v1 get both migrations, users on v2 get only the v3 migration. This is production-critical because users don't all upgrade simultaneously.

**Performance optimization** requires understanding transaction boundaries. A common mistake is creating a new transaction for each write—with 1000 products, that's 1000 transaction commits taking ~5 seconds total. Batching all writes in a single transaction reduces it to ~150ms—a 33x speedup. Similarly, for large datasets, cursor-based iteration is memory-efficient. Using `getAll()` on 50MB of data loads it all into memory, causing crashes on low-end devices. Cursors iterate one record at a time, processing with constant memory.

**One challenge** we faced was quota management. IndexedDB quota is generous but not unlimited. We implemented an LRU eviction policy—when approaching 80% quota, we'd delete the oldest cached API responses first, then least-recently-accessed product images. We also exposed a 'Clear Cache' button in settings, which users appreciated for reclaiming storage. Monitoring showed median usage around 45MB, but 99th percentile users hit 600MB, so quota management was essential.

**Versus alternatives**: localStorage is for trivial data only—user preferences, feature flags, maybe auth tokens. SessionStorage for per-tab temporary state. Service Worker CacheStorage for HTTP responses (HTML, JS, images). IndexedDB for structured application data that needs querying, large volume, and offline access. In practice, a mature PWA uses all four—each has its niche, and IndexedDB is the workhorse for real application state."

### Likely Follow-Up Questions

1. **"How do you handle IndexedDB quota limits?"**
   
   **Answer:**
   - **Monitor usage**: `navigator.storage.estimate()` to track usage/quota ratio
   - **LRU eviction**: Delete oldest/least-accessed data when approaching 80% quota
   - **Prioritize critical data**: Core app data over cache
   - **Request persistent storage**: `navigator.storage.persist()` prevents eviction
   - **User control**: Expose "Clear Cache" in settings
   - **Graceful degradation**: App still works with fresh network fetches if quota exceeded

2. **"What's the performance difference between indexed and non-indexed queries?"**
   
   **Answer:**
   - **No index**: O(n) linear scan through all records
     - 10,000 products: ~200ms (scans every record)
   - **With index**: O(log n) B-tree lookup
     - 10,000 products: ~5ms (index-based lookup)
   - **Speedup**: 40x faster with proper indexes
   - **Index cost**: Slower writes (must update index), more storage
   - **Strategy**: Index frequently-queried fields, skip rarely-used fields

3. **"How do you handle schema migrations in IndexedDB?"**
   
   **Answer:**
   ```javascript
   request.onupgradeneeded = (event) => {
     const db = event.target.result;
     const oldVersion = event.oldVersion;
     
     if (oldVersion < 1) {
       // Fresh install
       db.createObjectStore('users', { keyPath: 'id' });
     }
     
     if (oldVersion < 2) {
       // v1 → v2: Add posts store
       db.createObjectStore('posts', { keyPath: 'id' });
     }
     
     if (oldVersion < 3) {
       // v2 → v3: Add index to users
       const usersStore = transaction.objectStore('users');
       usersStore.createIndex('age', 'age');
     }
   };
   ```
   - Check `oldVersion`, apply only needed migrations
   - Incremental migrations for smooth upgrades
   - Test all migration paths (v1→v3, v2→v3, fresh install)

4. **"Why not just use localStorage for everything?"**
   
   **Answer:**
   - **Size**: 5-10MB vs 1GB+ (200x difference)
   - **Performance**: Synchronous (blocks UI) vs async (non-blocking)
   - **Data types**: Strings only vs objects, arrays, blobs
   - **Queries**: Linear scan only vs indexed lookups (40x faster)
   - **Transactions**: None vs ACID transactions
   - **Use case**: localStorage for KB of config, IndexedDB for MB of data

5. **"How do you debug IndexedDB issues?"**
   
   **Answer:**
   - **Chrome DevTools**: Application → Storage → IndexedDB (view stores, data, delete)
   - **Log transactions**: Log all reads/writes for debugging
   - **Error handling**: Catch and log all transaction errors
   - **Version conflicts**: Log oldVersion in onupgradeneeded
   - **Quota monitoring**: Log `navigator.storage.estimate()` periodically
   - **Testing**: Automated tests with fake-indexeddb library

6. **"What happens when IndexedDB quota is exceeded?"**
   
   **Answer:**
   - **Error**: `QuotaExceededError` thrown on write attempt
   - **Handling**: Catch error, implement eviction strategy
   - **Prevention**: Monitor usage proactively, evict before hitting limit
   - **Persistent storage**: Request `navigator.storage.persist()` (prevents eviction in Chrome)
   - **User prompt**: Show warning when approaching limit, offer to clear cache
   - **Graceful degradation**: Fall back to network-only mode if storage full

### Comparison with Alternatives

| Storage | Size | API | Use Case | Performance |
|---------|------|-----|----------|-------------|
| **IndexedDB** | ~1GB+ | Async | Large structured data, offline apps | 5-20ms reads |
| **localStorage** | 5-10MB | Sync | Small config, preferences | < 1ms but blocks UI |
| **SessionStorage** | 5-10MB | Sync | Per-tab temporary state | < 1ms but blocks UI |
| **CacheStorage** | ~1GB+ | Async | HTTP responses (SW) | 10-30ms reads |
| **Memory** | RAM-limited | Sync | Hot state (Redux) | < 1ms |

### Trade-Off Explanations

**Trade-off 1: IndexedDB vs In-Memory State**

"For our dashboard application, we initially kept all user data in Redux (in-memory). Fast—sub-millisecond access—but lost on page reload. Users complained about losing work when accidentally closing tabs. We moved to IndexedDB for persistence, which added 5-10ms latency per read. However, we implemented optimistic updates—UI updates immediately with in-memory state, IndexedDB write happens async in background. Users got instant feedback plus persistence. The 5-10ms write latency was invisible because it didn't block the UI. The trade-off was complexity—managing memory and IndexedDB sync—but user satisfaction increased 40% due to zero data loss."

**Trade-off 2: Indexed vs Non-Indexed Queries**

"We indexed our products store on category, price, and tags. Indexes doubled our storage usage (30MB → 60MB) and slowed writes by 20% (must update indexes). But queries improved 40x—200ms → 5ms for category searches. The trade-off was worth it because reads vastly outnumber writes in our app—users search 100x more than we update inventory. For rarely-queried fields like `manufacturer`, we skipped indexing to save space. The key was measuring query frequency and indexing hot paths only."

**Trade-off 3: Single Large Transaction vs Multiple Small Transactions**

"We batch-imported 10,000 products on initial sync. Initially used 10,000 separate transactions: ~5 seconds, UI frozen during writes. Switched to single transaction: ~150ms, 33x faster. Trade-off is all-or-nothing—if any product fails validation, the entire batch rolls back. We handle this by pre-validating the batch client-side before writing. The performance gain is massive, and pre-validation ensures the entire batch is valid, so rollback is rare. On the rare failure, we log the error and retry individual records."

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Complete IndexedDB Helper Class (Production-Ready)

```javascript
// indexedDBHelper.js - Robust IndexedDB wrapper

class IndexedDBHelper {
  constructor(dbName, version, schema) {
    this.dbName = dbName;
    this.version = version;
    this.schema = schema; // { storeName: { keyPath, indexes } }
    this.db = null;
  }
  
  /**
   * Open database with version migrations
   */
  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('Failed to open database:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log(`Database "${this.dbName}" v${this.version} opened`);
        
        // Handle version change (another tab upgraded)
        this.db.onversionchange = () => {
          console.warn('Database version changed, closing connection');
          this.db.close();
          alert('Database upgraded in another tab. Please reload.');
        };
        
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        const transaction = event.target.transaction;
        
        console.log(`Upgrading database from v${oldVersion} to v${this.version}`);
        
        // Apply schema
        for (const [storeName, config] of Object.entries(this.schema)) {
          let store;
          
          if (!db.objectStoreNames.contains(storeName)) {
            // Create new store
            store = db.createObjectStore(storeName, {
              keyPath: config.keyPath,
              autoIncrement: config.autoIncrement || false
            });
            console.log(`Created object store: ${storeName}`);
          } else {
            // Get existing store
            store = transaction.objectStore(storeName);
          }
          
          // Create indexes
          if (config.indexes) {
            for (const [indexName, indexConfig] of Object.entries(config.indexes)) {
              if (!store.indexNames.contains(indexName)) {
                store.createIndex(indexName, indexConfig.keyPath, {
                  unique: indexConfig.unique || false,
                  multiEntry: indexConfig.multiEntry || false
                });
                console.log(`Created index: ${storeName}.${indexName}`);
              }
            }
          }
        }
      };
      
      request.onblocked = () => {
        console.warn('Database upgrade blocked. Please close other tabs.');
      };
    });
  }
  
  /**
   * Add record to store
   */
  async add(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Bulk add (fast)
   */
  async addMany(storeName, dataArray) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    const promises = dataArray.map(data => {
      return new Promise((resolve, reject) => {
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    
    return Promise.all(promises);
  }
  
  /**
   * Get record by key
   */
  async get(storeName, key) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Get all records
   */
  async getAll(storeName, query = null, count = undefined) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll(query, count);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Query by index
   */
  async getByIndex(storeName, indexName, value) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    
    return new Promise((resolve, reject) => {
      const request = index.get(value);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Get all by index
   */
  async getAllByIndex(storeName, indexName, value) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Range query
   */
  async getRange(storeName, indexName, lowerBound, upperBound, lowerOpen = false, upperOpen = false) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = indexName ? store.index(indexName) : store;
    
    const range = IDBKeyRange.bound(lowerBound, upperBound, lowerOpen, upperOpen);
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(range);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Update record
   */
  async put(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Delete record
   */
  async delete(storeName, key) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Clear store
   */
  async clear(storeName) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Count records
   */
  async count(storeName, query = null) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.count(query);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Cursor iteration
   */
  async iterate(storeName, callback, direction = 'next') {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.openCursor(null, direction);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor) {
          const shouldContinue = callback(cursor.value, cursor.key);
          
          if (shouldContinue !== false) {
            cursor.continue();
          } else {
            resolve();
          }
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Close database
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database closed');
    }
  }
  
  /**
   * Delete database
   */
  static async deleteDatabase(dbName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      
      request.onsuccess = () => {
        console.log(`Database "${dbName}" deleted`);
        resolve();
      };
      
      request.onerror = () => reject(request.error);
      
      request.onblocked = () => {
        console.warn('Delete blocked. Close all tabs using this database.');
      };
    });
  }
}

// Usage example
const schema = {
  users: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: {
      email: { keyPath: 'email', unique: true },
      name: { keyPath: 'name', unique: false },
      age: { keyPath: 'age', unique: false }
    }
  },
  posts: {
    keyPath: 'id',
    autoIncrement: true,
    indexes: {
      userId: { keyPath: 'userId', unique: false },
      timestamp: { keyPath: 'timestamp', unique: false },
      userTimestamp: { keyPath: ['userId', 'timestamp'], unique: false }
    }
  }
};

const db = new IndexedDBHelper('myApp', 1, schema);
await db.open();

// Add user
const userId = await db.add('users', {
  name: 'Alice',
  email: 'alice@example.com',
  age: 30
});

// Get user
const user = await db.get('users', userId);

// Query by index
const alice = await db.getByIndex('users', 'email', 'alice@example.com');

// Range query
const adults = await db.getRange('users', 'age', 18, 65);

// Iterate
await db.iterate('users', (user) => {
  console.log(user.name);
});
```

### Example 2: Quota Management System

```javascript
// quotaManager.js - Monitor and manage storage quota

class QuotaManager {
  constructor(db) {
    this.db = db;
    this.warningThreshold = 0.8; // 80%
    this.criticalThreshold = 0.95; // 95%
  }
  
  async getQuotaInfo() {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return null;
    }
    
    const estimate = await navigator.storage.estimate();
    
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      usagePercentage: (estimate.usage / estimate.quota * 100).toFixed(2),
      usageMB: (estimate.usage / 1024 / 1024).toFixed(2),
      quotaMB: (estimate.quota / 1024 / 1024).toFixed(2),
      availableMB: ((estimate.quota - estimate.usage) / 1024 / 1024).toFixed(2)
    };
  }
  
  async checkQuota() {
    const info = await this.getQuotaInfo();
    
    if (!info) {
      console.warn('Storage API not supported');
      return { status: 'unknown' };
    }
    
    const percentage = info.usagePercentage / 100;
    
    if (percentage >= this.criticalThreshold) {
      return { status: 'critical', info };
    } else if (percentage >= this.warningThreshold) {
      return { status: 'warning', info };
    } else {
      return { status: 'ok', info };
    }
  }
  
  async requestPersistentStorage() {
    if (!('storage' in navigator && 'persist' in navigator.storage)) {
      console.warn('Persistent storage not supported');
      return false;
    }
    
    // Check current status
    const isPersisted = await navigator.storage.persisted();
    
    if (isPersisted) {
      console.log('Storage is already persistent');
      return true;
    }
    
    // Request persistent storage
    const granted = await navigator.storage.persist();
    
    if (granted) {
      console.log('Persistent storage granted');
    } else {
      console.log('Persistent storage denied');
    }
    
    return granted;
  }
  
  async evictOldestEntries(storeName, count = 10) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const index = store.index('timestamp');
    
    let deleted = 0;
    const request = index.openCursor();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && deleted < count) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          console.log(`Evicted ${deleted} oldest entries from ${storeName}`);
          resolve(deleted);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async evictLRU(storeName, count = 10) {
    // Assumes lastAccessed timestamp field
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const index = store.index('lastAccessed');
    
    let deleted = 0;
    const request = index.openCursor();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && deleted < count) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          console.log(`Evicted ${deleted} LRU entries from ${storeName}`);
          resolve(deleted);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async cleanupExpiredCache(cacheStoreName = 'cache') {
    const tx = this.db.transaction(cacheStoreName, 'readwrite');
    const store = tx.objectStore(cacheStoreName);
    
    let deleted = 0;
    const request = store.openCursor();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor) {
          const entry = cursor.value;
          
          if (entry.expires && Date.now() > entry.expires) {
            cursor.delete();
            deleted++;
          }
          
          cursor.continue();
        } else {
          console.log(`Cleaned up ${deleted} expired cache entries`);
          resolve(deleted);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async handleQuotaExceeded() {
    console.warn('Quota exceeded, attempting cleanup...');
    
    // 1. Clean expired cache
    await this.cleanupExpiredCache();
    
    // 2. Evict oldest entries
    await this.evictOldestEntries('cache', 50);
    
    // 3. Check if resolved
    const status = await this.checkQuota();
    
    if (status.status === 'critical') {
      console.error('Still critical after cleanup');
      
      // 4. Request persistent storage
      await this.requestPersistentStorage();
      
      // 5. Ask user to clear manually
      this.notifyUser('Storage full. Please clear some data.');
    }
  }
  
  notifyUser(message) {
    // Show notification to user
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Storage Warning', {
        body: message,
        icon: '/icon.png'
      });
    } else {
      alert(message);
    }
  }
  
  startMonitoring(intervalMs = 60000) { // Check every minute
    setInterval(async () => {
      const status = await this.checkQuota();
      
      if (status.status === 'critical') {
        console.error('Storage critical:', status.info);
        await this.handleQuotaExceeded();
      } else if (status.status === 'warning') {
        console.warn('Storage warning:', status.info);
        this.notifyUser(`Storage ${status.info.usagePercentage}% full`);
      }
    }, intervalMs);
  }
}

// Usage
const quotaManager = new QuotaManager(db);

// Check quota
const status = await quotaManager.checkQuota();
console.log('Quota status:', status);

// Request persistent storage
await quotaManager.requestPersistentStorage();

// Start monitoring
quotaManager.startMonitoring();

// Handle quota exceeded error
try {
  await db.add('cache', largeData);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    await quotaManager.handleQuotaExceeded();
    // Retry
    await db.add('cache', largeData);
  }
}
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience:**
- **Offline functionality**: Full app capability without network (zero downtime)
- **Instant queries**: 5ms indexed lookups vs 300ms network requests (60x faster)
- **Large data storage**: 1GB+ vs 5MB localStorage (200x more capacity)
- **Zero data loss**: Persist user work locally, sync when online
- **Faster loading**: Cached data available instantly on return visits

**Business Impact:**
```
Real case study: News Reading App (3M monthly users)

Without IndexedDB:
- Articles: Network fetch every time (300ms avg)
- Offline: Complete failure (42% mobile sessions start offline)
- Search: Server-side only (320ms latency)
- Reading list: Lost on page reload
- Retention: 18% monthly active users

With IndexedDB (Offline-first):
- Articles: Cached locally (5ms load time, 60x faster)
- Offline: 500 most recent articles available
- Search: Local IndexedDB query (5ms, 64x faster)
- Reading list: Persisted locally
- Retention: 31% monthly active users (72% improvement)

Metrics:
- Load time: 300ms → 5ms (98% improvement)
- Offline capability: 42% of sessions can now access content
- Search speed: 320ms → 5ms (64x improvement)
- Data loss: 100% → 0% (perfect persistence)

Business results:
- Session duration: +85% (4.2min → 7.8min)
- Articles per session: +120% (2.1 → 4.6)
- Ad revenue: +$180K/month (more engagement)
- Infrastructure cost: -$42K/month (70% fewer API calls)

ROI: $222K/month benefit, 6-week implementation
```

**Technical Benefits:**
- **Scalability**: Offload 70-90% reads from server
- **Resilience**: Work during network outages
- **Performance**: Sub-10ms queries with proper indexes
- **Flexibility**: Complex queries, transactions, schemas
- **Cost efficiency**: Massive API call reduction

### How It Works

**Technical Summary:**

**1. Database Structure:**

```
Browser Storage (https://example.com)
│
└─ IndexedDB
   │
   └─ Database: "myApp" (version: 2)
      │
      ├─ Object Store: "users" (keyPath: "id")
      │  ├─ Records (objects):
      │  │  ├─ { id: 1, name: "Alice", email: "alice@...", age: 30 }
      │  │  ├─ { id: 2, name: "Bob", email: "bob@...", age: 25 }
      │  │  └─ { id: 3, name: "Carol", email: "carol@...", age: 35 }
      │  │
      │  └─ Indexes (B-trees):
      │     ├─ "email" → { "alice@...": 1, "bob@...": 2, "carol@...": 3 }
      │     └─ "age" → { 25: [2], 30: [1], 35: [3] }
      │
      └─ Object Store: "posts" (keyPath: "id", autoIncrement: true)
         ├─ Records:
         │  ├─ { id: 1, userId: 1, title: "...", timestamp: 1640000000 }
         │  └─ { id: 2, userId: 1, title: "...", timestamp: 1640001000 }
         │
         └─ Indexes:
            ├─ "userId" → { 1: [1, 2] }
            └─ "timestamp" → { 1640000000: [1], 1640001000: [2] }
```

**2. Transaction Lifecycle:**

```javascript
// Start transaction
const tx = db.transaction(['users'], 'readwrite');
//                         ^^^^^^^^   ^^^^^^^^^^^
//                         stores     mode (readonly/readwrite)

const store = tx.objectStore('users');

// Queue operations (non-blocking)
store.add({ id: 1, name: "Alice" });
store.add({ id: 2, name: "Bob" });
store.add({ id: 3, name: "Carol" });

// Transaction auto-commits when:
// 1. All operations complete successfully
// 2. No more operations queued
// 3. No errors occurred

// Transaction auto-aborts (rollback) if:
// 1. Any operation errors
// 2. tx.abort() called
// 3. Uncaught exception

// Wait for completion
await tx.complete;

// Result: All 3 users added atomically (or none if error)
```

**3. Index Performance:**

```
Query: Find users with age = 30

Without index (linear scan):
┌─────────────────────────────────┐
│ Scan all records: O(n)          │
│ ├─ Read record 1: age = 25 ✗   │
│ ├─ Read record 2: age = 30 ✓   │ ← Found after 2 reads
│ ├─ Read record 3: age = 35 ✗   │
│ ├─ Read record 4: age = 28 ✗   │
│ └─ ... scan all 10,000 records │
│ Time: ~200ms                    │
└─────────────────────────────────┘

With index (B-tree lookup):
┌─────────────────────────────────┐
│ Index lookup: O(log n)          │
│ ├─ Look up "age" index          │
│ ├─ Find entries for 30          │
│ ├─ Retrieve record IDs: [2, 15, 47, ...]
│ └─ Return matching records      │
│ Time: ~5ms (40x faster!)        │
└─────────────────────────────────┘

Index structure (B-tree):
           [30]
          /    \
      [25]      [35]
     /   \      /   \
  [20] [28] [32] [40]
   │    │    │    │
  IDs  IDs  IDs  IDs

Lookup: O(log n) = log₂(10,000) ≈ 13 comparisons
```

**4. Quota System:**

```javascript
// Browser allocates quota dynamically

const estimate = await navigator.storage.estimate();

// Chrome/Edge:
// quota = min(
//   60% of available disk space,
//   max(1GB, 10% of total disk space)
// )

// Example: 100GB free disk
// quota = min(60GB, max(1GB, 10GB)) = 10GB

// Firefox:
// quota = min(50% of available disk, 10GB)

// Safari:
// quota = ~1GB (stricter)

// Usage calculation:
{
  usage: 45,000,000,        // 45 MB used
  quota: 10,000,000,000,    // 10 GB available
  percentage: 0.45%         // Well below limit
}

// Quota exceeded handling:
try {
  await db.add('store', data);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // 1. Delete old entries
    await evictLRU(100);
    
    // 2. Request persistent storage
    await navigator.storage.persist();
    
    // 3. Retry
    await db.add('store', data);
  }
}
```

**5. Version Migration:**

```
User upgrades app from v1 to v3:

Database version: v1
User opens app (v3 code)
  │
  ▼
indexedDB.open('myApp', 3)
  │
  ▼
Browser detects version mismatch (current: 1, requested: 3)
  │
  ▼
onupgradeneeded event fires
  │
  ├─ oldVersion = 1
  ├─ newVersion = 3
  │
  ├─ if (oldVersion < 2) { /* v1 → v2 migration */ }
  │  └─ Create "posts" object store
  │
  └─ if (oldVersion < 3) { /* v2 → v3 migration */ }
     └─ Add "age" index to "users"
  │
  ▼
Database now at version 3
  │
  ▼
onsuccess event fires
  │
  ▼
Application continues with upgraded database

Key insight: Migrations are cumulative
- Fresh install: Runs all migrations (< 1, < 2, < 3)
- v1 → v3 upgrade: Runs v2 and v3 migrations
- v2 → v3 upgrade: Runs only v3 migration
```

**6. Cursor Iteration (Memory-Efficient):**

```javascript
// Problem: Large dataset (50MB, 10,000 records)

// ❌ BAD: Load all into memory
const allRecords = await store.getAll();
// RAM spike: 50MB loaded immediately
// Low-memory devices: Crash!

// ✅ GOOD: Cursor iteration (constant memory)
let cursor = await store.openCursor();

while (cursor) {
  const record = cursor.value; // Only current record in memory
  
  // Process record
  processRecord(record);
  
  // Move to next
  cursor = await cursor.continue();
}

// RAM usage: ~5KB (single record)
// Memory-efficient for any dataset size

// Flow:
// 1. openCursor() → Returns first record cursor
// 2. cursor.value → Current record data
// 3. cursor.continue() → Advances to next record
// 4. Repeat until cursor = null (end of data)

// Performance:
// - Per-record: ~0.5ms
// - 10,000 records: ~5 seconds
// - Memory: Constant (~5KB)
```

**7. Compound Index Queries:**

```javascript
// Compound index: ['category', 'price']

objectStore.createIndex('categoryPrice', ['category', 'price']);

// Index structure:
{
  ['electronics', 25]: [1, 5, 12],    // Product IDs
  ['electronics', 50]: [2, 8],
  ['electronics', 100]: [3, 9, 15],
  ['books', 10]: [4, 7],
  ['books', 20]: [6, 11],
  // ...
}

// Query: Electronics priced $50-$100
const range = IDBKeyRange.bound(
  ['electronics', 50],   // Lower bound
  ['electronics', 100]   // Upper bound
);

const results = await index.getAll(range);
// Returns: Products [2, 8, 3, 9, 15] (IDs with prices 50-100)

// Performance: O(log n) lookup + O(k) results
// vs O(n) full scan without compound index

// Use case: "Show me electronics under $100"
// Single index query vs two separate filters
```

**Mental Model:**

Think of IndexedDB like **a personal library with a catalog system**:
- **Database** = Your entire library
- **Object Store** = Bookshelf (users shelf, posts shelf)
- **Records** = Individual books on shelf
- **Key** = Book ID (unique identifier)
- **Index** = Card catalog (find by author, title, genre)
- **Transaction** = Librarian helping you (ensures consistency, one at a time)
- **Cursor** = Walking along shelf (read one book at a time)

When you search:
- **No index**: Walk entire shelf, check each book (slow)
- **With index**: Look up card catalog, go directly to book (fast)

---

**Key Takeaway for Interviews:**

IndexedDB is a low-level, transactional, NoSQL database providing ~1GB+ storage (vs 5MB localStorage), asynchronous API (non-blocking), ACID transactions, and B-tree indexes for O(log n) queries (vs O(n) scans). Structure: databases contain object stores (like tables) with keyPath (inline/out-of-line keys) and indexes on queryable fields. Transactions auto-commit on success, rollback on error—batch operations in single transaction (33x faster). Version migrations via `onupgradeneeded` (check `oldVersion`, apply incremental changes). Quota: ~60% available disk (Chrome), handle `QuotaExceededError` with LRU eviction. Cursor iteration for memory efficiency (constant RAM vs `getAll()` loading entire dataset). Real impact: 5ms queries vs 300ms network (60x faster), 98% load time improvement, offline capability, zero data loss. Essential for offline-first PWAs with large datasets.

