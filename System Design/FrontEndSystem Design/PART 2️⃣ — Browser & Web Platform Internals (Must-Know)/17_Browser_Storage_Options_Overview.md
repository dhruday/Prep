# Browser Storage Options Overview

## 1. High-Level Explanation (Frontend Interview Level)

Browsers provide multiple **client-side storage mechanisms** for persisting data locally. Each has different capabilities, use cases, and limitations. Understanding when to use which storage option is critical for building performant, offline-capable web applications.

### The Big Picture

```
BROWSER STORAGE OPTIONS
──────────────────────────

1. COOKIES
   Size: ~4 KB per cookie
   Scope: Sent with every HTTP request
   Use: Authentication tokens, session management
   
2. LOCAL STORAGE
   Size: ~5-10 MB
   Scope: Same origin, persistent
   Use: User preferences, cached data
   
3. SESSION STORAGE
   Size: ~5-10 MB
   Scope: Same origin, tab-scoped, cleared on close
   Use: Temporary form data, tab-specific state
   
4. INDEXEDDB
   Size: ~50 MB - 1 GB+ (varies by browser)
   Scope: Same origin, transactional database
   Use: Large datasets, offline data, structured data
   
5. CACHE API
   Size: Varies (typically 50 MB+)
   Scope: Service Worker controlled
   Use: Offline assets, API response caching
   
6. WEB SQL (DEPRECATED)
   Status: Removed from modern browsers
   Use: None (migrate to IndexedDB)
```

### Quick Comparison Table

| Storage | Size | Persistence | API Type | Best For |
|---------|------|-------------|----------|----------|
| **Cookies** | ~4 KB | Until expiry | Synchronous | Auth tokens, tracking |
| **localStorage** | ~5-10 MB | Forever | Synchronous | Preferences, small data |
| **sessionStorage** | ~5-10 MB | Tab session | Synchronous | Temporary state |
| **IndexedDB** | ~50 MB - 1 GB+ | Forever | Asynchronous | Large datasets, offline |
| **Cache API** | ~50 MB+ | Forever | Asynchronous (Promise) | Offline assets, PWA |

---

### Why This Matters in Interviews

**Junior Engineer:**
```
"I use localStorage for storing data"
```
→ Too simplistic, missing nuances

**Senior/Staff Engineer:**
```
"Browser storage is a critical architectural decision with performance, 
security, and UX implications:

**Storage Options:**

1. **Cookies (4 KB)**
   - Sent with every HTTP request (performance cost)
   - Accessible from both client and server
   - Use for: Auth tokens, session IDs
   - Security: HttpOnly, Secure, SameSite flags

2. **localStorage (5-10 MB)**
   - Synchronous API (blocks main thread)
   - Persistent across sessions
   - Same-origin only
   - Use for: User preferences, cached API responses (small)
   - Pitfall: Can't use in Web Workers

3. **sessionStorage (5-10 MB)**
   - Same as localStorage but tab-scoped
   - Cleared when tab closes
   - Use for: Multi-step forms, temporary filters

4. **IndexedDB (50 MB - 1 GB+)**
   - Asynchronous, transactional NoSQL database
   - Indexes for fast queries
   - Use for: Large datasets, offline-first apps, complex queries
   - Best for: PWAs, email clients, productivity apps

5. **Cache API (50 MB+)**
   - Service Worker controlled
   - Stores Request/Response pairs
   - Use for: Offline assets, API caching, PWA shell

**Selection Criteria:**

```javascript
// Size-based decision
if (data < 4KB && needs server access) {
  // Cookies
} else if (data < 5MB && simple key-value) {
  // localStorage or sessionStorage
} else if (data > 5MB || complex queries needed) {
  // IndexedDB
} else if (caching HTTP responses for offline) {
  // Cache API
}
```

**Real Example:** At [Company], we built an offline-first email client:

**Architecture:**
- **IndexedDB**: Email messages, attachments (1 GB+)
- **Cache API**: App shell, static assets
- **localStorage**: User preferences (theme, layout)
- **Cookies**: Auth tokens (HttpOnly, Secure)

**Results:**
- 100% offline functionality ✅
- <50ms message load time (indexed queries) ✅
- No network requests after initial load ✅
- 95% user retention (vs 60% without offline) ✅

**Key Considerations:**
1. **Performance**: Synchronous APIs block main thread
2. **Security**: XSS can access localStorage (not HttpOnly cookies)
3. **Size limits**: Exceed quota → QuotaExceededError
4. **Privacy**: Cleared when user clears browsing data
5. **Cross-tab**: localStorage syncs, sessionStorage doesn't

This level of architectural decision-making is expected at 
Senior/Staff level."
```
→ Shows depth, practical experience, and architectural thinking

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### 1. Cookies

#### Overview

```
COOKIES
──────────────────────────────────────────
Storage: ~4 KB per cookie, ~50-180 cookies per domain
Lifespan: Until expiry (or session if no expiry set)
API: document.cookie (synchronous, string-based)
Scope: Sent with EVERY HTTP request to domain
Security: HttpOnly, Secure, SameSite flags
```

#### Setting Cookies

```javascript
// Basic cookie
document.cookie = "username=john";

// With expiry (7 days)
const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
document.cookie = `token=abc123; expires=${expires}`;

// With path and domain
document.cookie = "user_id=123; path=/; domain=.example.com";

// Secure cookie (HTTPS only)
document.cookie = "session=xyz; Secure; HttpOnly; SameSite=Strict";
```

#### Security Flags

```javascript
// ❌ VULNERABLE: Accessible via JavaScript (XSS attack)
document.cookie = "token=secret123";

// ✅ SECURE: Not accessible via JavaScript
// (Set by server with Set-Cookie header)
Set-Cookie: token=secret123; HttpOnly; Secure; SameSite=Strict

// HttpOnly: Prevents JavaScript access (XSS protection)
// Secure: Only sent over HTTPS
// SameSite: CSRF protection
//   - Strict: Never sent cross-site
//   - Lax: Sent on top-level navigation (default)
//   - None: Always sent (requires Secure)
```

#### Reading Cookies

```javascript
// Read all cookies (returns semicolon-separated string)
const cookies = document.cookie;
// "username=john; theme=dark; lang=en"

// Helper function to parse
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  return null;
}

const username = getCookie('username'); // "john"
```

#### When to Use Cookies

✅ **Good for:**
- Authentication tokens (with HttpOnly)
- Session IDs
- Tracking/analytics (with user consent)
- Server needs to read the value

❌ **Not good for:**
- Large data (only 4 KB)
- Data that doesn't need server access (bandwidth waste)
- Sensitive data without HttpOnly flag

---

### 2. localStorage

#### Overview

```
LOCAL STORAGE
──────────────────────────────────────────
Storage: ~5-10 MB (browser-dependent)
Lifespan: Forever (until explicitly cleared)
API: localStorage (synchronous)
Scope: Same origin, shared across tabs/windows
Limitations: Synchronous (blocks main thread)
             String-only (must serialize objects)
```

#### Basic API

```javascript
// Set item
localStorage.setItem('username', 'john');
localStorage.setItem('theme', 'dark');

// Get item
const username = localStorage.getItem('username'); // "john"
const theme = localStorage.getItem('theme'); // "dark"

// Remove item
localStorage.removeItem('theme');

// Clear all
localStorage.clear();

// Check if key exists
const hasUsername = localStorage.getItem('username') !== null;

// Get number of items
const count = localStorage.length;

// Get key by index
const firstKey = localStorage.key(0);

// Alternative syntax (not recommended)
localStorage.username = 'john'; // Can be deleted by accident
delete localStorage.username;
```

#### Storing Objects

```javascript
// ❌ WRONG: Stores "[object Object]"
localStorage.setItem('user', { name: 'John', age: 30 });

// ✅ CORRECT: Serialize to JSON
const user = { name: 'John', age: 30, preferences: { theme: 'dark' } };
localStorage.setItem('user', JSON.stringify(user));

// Read and parse
const storedUser = JSON.parse(localStorage.getItem('user'));
console.log(storedUser.name); // "John"

// Handle null (key doesn't exist)
const userData = localStorage.getItem('user');
const user = userData ? JSON.parse(userData) : null;
```

#### Storage Events (Cross-Tab Communication)

```javascript
// Listen for changes from other tabs
window.addEventListener('storage', (e) => {
  console.log('Storage changed!');
  console.log('Key:', e.key);          // Which key changed
  console.log('Old value:', e.oldValue); // Previous value
  console.log('New value:', e.newValue); // New value
  console.log('URL:', e.url);          // Page that made change
  console.log('Storage:', e.storageArea); // localStorage or sessionStorage
});

// Example: Sync theme across tabs
// Tab 1: User changes theme
localStorage.setItem('theme', 'dark');

// Tab 2: Automatically receives event
window.addEventListener('storage', (e) => {
  if (e.key === 'theme') {
    applyTheme(e.newValue); // Update UI
  }
});
```

#### When to Use localStorage

✅ **Good for:**
- User preferences (theme, language, layout)
- Cached API responses (small, non-sensitive)
- Feature flags
- Draft content (blog posts, comments)
- Shopping cart items

❌ **Not good for:**
- Sensitive data (accessible via XSS)
- Large datasets (5-10 MB limit, synchronous)
- Data that needs complex queries (use IndexedDB)
- Cross-domain data (same-origin only)

---

### 3. sessionStorage

#### Overview

```
SESSION STORAGE
──────────────────────────────────────────
Storage: ~5-10 MB (browser-dependent)
Lifespan: Until tab/window closes
API: sessionStorage (synchronous, same as localStorage)
Scope: Same origin, tab-specific (NOT shared)
```

#### API (Same as localStorage)

```javascript
// Set item
sessionStorage.setItem('formData', JSON.stringify({ email: 'test@example.com' }));

// Get item
const formData = JSON.parse(sessionStorage.getItem('formData'));

// Remove item
sessionStorage.removeItem('formData');

// Clear all
sessionStorage.clear();
```

#### Key Difference: Tab Isolation

```javascript
// Tab 1
sessionStorage.setItem('tabId', '1');
console.log(sessionStorage.getItem('tabId')); // "1"

// Tab 2 (same origin)
console.log(sessionStorage.getItem('tabId')); // null (different tab!)

// Contrast with localStorage (shared across tabs)
// Tab 1
localStorage.setItem('userId', '123');

// Tab 2
console.log(localStorage.getItem('userId')); // "123" ✅ (shared!)
```

#### When to Use sessionStorage

✅ **Good for:**
- Multi-step form data (wizard)
- Temporary filters/search state
- Tab-specific user state
- One-time security tokens
- Temporary shopping cart (single session)

❌ **Not good for:**
- Data that needs to persist across sessions
- Data that needs to be shared across tabs
- Large datasets (5-10 MB limit)

---

### 4. IndexedDB

#### Overview

```
INDEXEDDB
──────────────────────────────────────────
Storage: ~50 MB - 1 GB+ (browser-dependent, quota API)
Lifespan: Forever (until explicitly cleared)
API: Asynchronous (Promise-based with wrappers)
Type: NoSQL, transactional, object store
Features: Indexes, cursors, version management
Scope: Same origin
```

#### Basic Structure

```
DATABASE
├── Object Store 1 (like a table)
│   ├── Index 1 (fast lookup by field)
│   ├── Index 2
│   └── Records (JavaScript objects)
│
├── Object Store 2
│   ├── Index 1
│   └── Records
```

#### Opening Database

```javascript
// Open database (creates if doesn't exist)
const request = indexedDB.open('MyDatabase', 1); // name, version

// Success
request.onsuccess = (event) => {
  const db = event.target.result;
  console.log('Database opened:', db);
};

// Error
request.onerror = (event) => {
  console.error('Database error:', event.target.error);
};

// Upgrade needed (version change or first open)
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  
  // Create object store (like a table)
  const objectStore = db.createObjectStore('users', { 
    keyPath: 'id',      // Primary key
    autoIncrement: true // Auto-generate IDs
  });
  
  // Create indexes (for fast queries)
  objectStore.createIndex('email', 'email', { unique: true });
  objectStore.createIndex('age', 'age', { unique: false });
  objectStore.createIndex('name', 'name', { unique: false });
};
```

#### CRUD Operations

```javascript
// Helper: Open database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MyDatabase', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// CREATE (Add record)
async function addUser(user) {
  const db = await openDB();
  const transaction = db.transaction(['users'], 'readwrite');
  const store = transaction.objectStore('users');
  
  return new Promise((resolve, reject) => {
    const request = store.add(user);
    request.onsuccess = () => resolve(request.result); // Returns generated ID
    request.onerror = () => reject(request.error);
  });
}

// Usage
await addUser({ name: 'John', email: 'john@example.com', age: 30 });


// READ (Get by primary key)
async function getUserById(id) {
  const db = await openDB();
  const transaction = db.transaction(['users'], 'readonly');
  const store = transaction.objectStore('users');
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Usage
const user = await getUserById(1);
console.log(user); // { id: 1, name: 'John', email: 'john@example.com', age: 30 }


// READ (Get by index)
async function getUserByEmail(email) {
  const db = await openDB();
  const transaction = db.transaction(['users'], 'readonly');
  const store = transaction.objectStore('users');
  const index = store.index('email');
  
  return new Promise((resolve, reject) => {
    const request = index.get(email);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Usage
const user = await getUserByEmail('john@example.com');


// UPDATE
async function updateUser(id, updates) {
  const db = await openDB();
  const transaction = db.transaction(['users'], 'readwrite');
  const store = transaction.objectStore('users');
  
  // Get existing record
  const getRequest = store.get(id);
  
  return new Promise((resolve, reject) => {
    getRequest.onsuccess = () => {
      const user = getRequest.result;
      
      if (!user) {
        reject(new Error('User not found'));
        return;
      }
      
      // Merge updates
      const updatedUser = { ...user, ...updates };
      
      // Save
      const putRequest = store.put(updatedUser);
      putRequest.onsuccess = () => resolve(updatedUser);
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Usage
await updateUser(1, { age: 31, city: 'New York' });


// DELETE
async function deleteUser(id) {
  const db = await openDB();
  const transaction = db.transaction(['users'], 'readwrite');
  const store = transaction.objectStore('users');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Usage
await deleteUser(1);


// QUERY (Get all)
async function getAllUsers() {
  const db = await openDB();
  const transaction = db.transaction(['users'], 'readonly');
  const store = transaction.objectStore('users');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Usage
const allUsers = await getAllUsers();


// QUERY (Filter by index)
async function getUsersByAge(age) {
  const db = await openDB();
  const transaction = db.transaction(['users'], 'readonly');
  const store = transaction.objectStore('users');
  const index = store.index('age');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(age);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Usage
const thirtyYearOlds = await getUsersByAge(30);
```

#### When to Use IndexedDB

✅ **Good for:**
- Large datasets (emails, messages, files)
- Offline-first applications (PWAs)
- Complex queries (indexes for fast lookups)
- Structured data with relationships
- Data that needs transactions

❌ **Not good for:**
- Simple key-value data (use localStorage)
- Data < 5 MB (overhead not worth it)
- Server-synced data only (just use API)

---

### 5. Cache API

#### Overview

```
CACHE API
──────────────────────────────────────────
Storage: ~50 MB+ (varies by browser, quota API)
Lifespan: Forever (until explicitly cleared)
API: Asynchronous (Promise-based)
Type: Stores Request/Response pairs
Scope: Service Worker controlled
Primary Use: Offline support, PWAs
```

#### Opening a Cache

```javascript
// Open cache (creates if doesn't exist)
const cache = await caches.open('my-cache-v1');
```

#### Storing Responses

```javascript
// Store a single response
const cache = await caches.open('my-cache-v1');

// Method 1: Fetch and cache
await cache.add('/api/data');

// Method 2: Fetch multiple and cache
await cache.addAll([
  '/',
  '/styles.css',
  '/script.js',
  '/api/data',
]);

// Method 3: Manual cache (custom response)
const response = await fetch('/api/data');
await cache.put('/api/data', response);

// Method 4: Cache custom response
const customResponse = new Response(JSON.stringify({ cached: true }), {
  headers: { 'Content-Type': 'application/json' },
});
await cache.put('/custom', customResponse);
```

#### Retrieving from Cache

```javascript
const cache = await caches.open('my-cache-v1');

// Get specific response
const response = await cache.match('/api/data');

if (response) {
  const data = await response.json();
  console.log('From cache:', data);
} else {
  console.log('Not in cache');
}

// Get all cached requests
const requests = await cache.keys();
console.log('Cached URLs:', requests.map(r => r.url));
```

#### Deleting from Cache

```javascript
const cache = await caches.open('my-cache-v1');

// Delete specific entry
await cache.delete('/api/data');

// Delete entire cache
await caches.delete('my-cache-v1');
```

#### Service Worker Integration

```javascript
// service-worker.js

const CACHE_NAME = 'my-app-v1';
const urlsToCache = [
  '/',
  '/styles.css',
  '/script.js',
  '/offline.html',
];

// Install: Cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch: Cache-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Cache miss - fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Clone response (can only use once)
            const responseToCache = response.clone();
            
            // Cache for next time
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
      .catch(() => {
        // Network failed, return offline page
        return caches.match('/offline.html');
      })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

#### When to Use Cache API

✅ **Good for:**
- PWA offline support
- Caching static assets (JS, CSS, images)
- Caching API responses
- Network-first, cache-fallback strategies
- Performance optimization (serve from cache)

❌ **Not good for:**
- Simple data storage (use localStorage/IndexedDB)
- Without Service Worker (limited functionality)
- Cross-origin requests (CORS restrictions)

---

### Storage Quota Management

#### Checking Available Space

```javascript
// Check quota (Chrome, Edge)
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const estimate = await navigator.storage.estimate();
  
  console.log('Quota:', estimate.quota); // Total available (bytes)
  console.log('Usage:', estimate.usage); // Currently used (bytes)
  console.log('Available:', estimate.quota - estimate.usage);
  
  const percentUsed = (estimate.usage / estimate.quota * 100).toFixed(2);
  console.log(`${percentUsed}% used`);
}

// Example output:
// Quota: 299977904742 (279.3 GB)
// Usage: 152387584 (145.3 MB)
// Available: 299825517158
// 0.05% used
```

#### Request Persistent Storage

```javascript
// Request persistent storage (won't be cleared under storage pressure)
if ('storage' in navigator && 'persist' in navigator.storage) {
  const isPersisted = await navigator.storage.persist();
  
  if (isPersisted) {
    console.log('Storage will persist even under pressure');
  } else {
    console.log('Storage may be cleared under pressure');
  }
}

// Check if already persistent
const persisted = await navigator.storage.persisted();
console.log('Is persisted:', persisted);
```

#### Handling QuotaExceededError

```javascript
// Try to store data, handle quota exceeded
try {
  localStorage.setItem('large-data', veryLargeString);
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    console.error('Storage quota exceeded');
    
    // Strategy 1: Clear old data
    clearOldData();
    
    // Strategy 2: Use IndexedDB instead (larger quota)
    await storeInIndexedDB(veryLargeString);
    
    // Strategy 3: Compress data
    const compressed = compressData(veryLargeString);
    localStorage.setItem('large-data', compressed);
  }
}
```

---

## 3. Clear Real-World Examples

### Example 1: Multi-Tab State Sync (localStorage + storage event)

**Problem:** User changes theme in one tab, other tabs don't update

```javascript
// ❌ BAD: No cross-tab sync
// Tab 1
function setTheme(theme) {
  localStorage.setItem('theme', theme);
  applyTheme(theme); // Only updates this tab
}

// Tab 2: Still has old theme ❌
```

**Fixed version:**

```javascript
// ✅ GOOD: Cross-tab sync with storage event
// Both tabs have this code:

// Listen for storage changes from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'theme' && e.newValue !== e.oldValue) {
    applyTheme(e.newValue);
    console.log(`Theme synced from another tab: ${e.newValue}`);
  }
});

// Set theme (triggers storage event in OTHER tabs)
function setTheme(theme) {
  localStorage.setItem('theme', theme);
  applyTheme(theme); // Update current tab
  // Other tabs will receive storage event and update
}

// Apply theme to DOM
function applyTheme(theme) {
  document.body.className = theme;
  document.getElementById('theme-toggle').textContent = 
    theme === 'dark' ? '☀️' : '🌙';
}

// Initialize on load
const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);
```

**Result:** All tabs stay in sync automatically! ✅

---

### Example 2: Offline-First Email Client (IndexedDB)

**Problem:** Email client needs to work offline with thousands of messages

```typescript
// Email database structure
interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
  labels: string[];
}

class EmailStore {
  private dbName = 'EmailClient';
  private version = 1;
  
  async init() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create emails object store
        const emailStore = db.createObjectStore('emails', { keyPath: 'id' });
        
        // Create indexes for fast queries
        emailStore.createIndex('from', 'from', { unique: false });
        emailStore.createIndex('timestamp', 'timestamp', { unique: false });
        emailStore.createIndex('read', 'read', { unique: false });
        emailStore.createIndex('labels', 'labels', { unique: false, multiEntry: true });
      };
    });
  }
  
  async addEmail(email: Email) {
    const db = await this.init();
    const transaction = db.transaction(['emails'], 'readwrite');
    const store = transaction.objectStore('emails');
    
    return new Promise<void>((resolve, reject) => {
      const request = store.add(email);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async getRecentEmails(limit: number = 50) {
    const db = await this.init();
    const transaction = db.transaction(['emails'], 'readonly');
    const store = transaction.objectStore('emails');
    const index = store.index('timestamp');
    
    return new Promise<Email[]>((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // Descending order
      const emails: Email[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && emails.length < limit) {
          emails.push(cursor.value);
          cursor.continue();
        } else {
          resolve(emails);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async getUnreadCount() {
    const db = await this.init();
    const transaction = db.transaction(['emails'], 'readonly');
    const store = transaction.objectStore('emails');
    const index = store.index('read');
    
    return new Promise<number>((resolve, reject) => {
      const request = index.count(false); // Count where read = false
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async markAsRead(emailId: string) {
    const db = await this.init();
    const transaction = db.transaction(['emails'], 'readwrite');
    const store = transaction.objectStore('emails');
    
    return new Promise<void>((resolve, reject) => {
      const getRequest = store.get(emailId);
      
      getRequest.onsuccess = () => {
        const email = getRequest.result;
        if (email) {
          email.read = true;
          const putRequest = store.put(email);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Email not found'));
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
  
  async searchByLabel(label: string) {
    const db = await this.init();
    const transaction = db.transaction(['emails'], 'readonly');
    const store = transaction.objectStore('emails');
    const index = store.index('labels');
    
    return new Promise<Email[]>((resolve, reject) => {
      const request = index.getAll(label);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Usage
const emailStore = new EmailStore();

// Add email when received
await emailStore.addEmail({
  id: '123',
  from: 'alice@example.com',
  to: 'bob@example.com',
  subject: 'Meeting tomorrow',
  body: 'Let\'s meet at 10 AM',
  timestamp: Date.now(),
  read: false,
  labels: ['work', 'important'],
});

// Get recent emails (fast with timestamp index)
const recentEmails = await emailStore.getRecentEmails(50);

// Get unread count (fast with read index)
const unreadCount = await emailStore.getUnreadCount();

// Mark as read
await emailStore.markAsRead('123');

// Search by label (fast with labels index)
const workEmails = await emailStore.searchByLabel('work');
```

**Performance:**
- 10,000 emails stored: ~50 MB
- Query by index: <10ms ✅
- Fully offline: No network needed ✅
- Transactions: Data integrity guaranteed ✅

---

### Example 3: PWA with Cache API (Offline Assets)

**Problem:** App needs to work offline with all assets cached

```javascript
// service-worker.js

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `my-pwa-${CACHE_VERSION}`;

// Assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/offline.html',
  '/images/logo.png',
];

// Install: Precache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('my-pwa-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch: Cache-first for assets, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // API requests: Network-first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful response
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request)
            .then((cached) => {
              if (cached) {
                return cached;
              }
              // No cache either, return error response
              return new Response(JSON.stringify({ error: 'Offline' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              });
            });
        })
    );
    return;
  }
  
  // Static assets: Cache-first, network fallback
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          console.log('[SW] Serving from cache:', request.url);
          return cached;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            // Cache for next time
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
            
            return response;
          })
          .catch(() => {
            // Network failed, return offline page
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});
```

**main.js (Register service worker)**

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', registration);
      
      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}
```

**Result:**
- App works completely offline ✅
- Instant load from cache (<100ms) ✅
- API responses cached (stale-while-revalidate) ✅
- Automatic cache updates on new version ✅

---

### Example 4: Form Data Persistence (sessionStorage)

**Problem:** User fills form, accidentally refreshes, loses data

```javascript
// ✅ GOOD: Auto-save form data to sessionStorage

class FormPersistence {
  constructor(formId) {
    this.form = document.getElementById(formId);
    this.storageKey = `form-data-${formId}`;
    
    this.init();
  }
  
  init() {
    // Restore data on load
    this.restoreFormData();
    
    // Save on input change
    this.form.addEventListener('input', () => {
      this.saveFormData();
    });
    
    // Clear on submit
    this.form.addEventListener('submit', () => {
      this.clearFormData();
    });
  }
  
  saveFormData() {
    const formData = new FormData(this.form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    sessionStorage.setItem(this.storageKey, JSON.stringify(data));
    console.log('Form data saved to sessionStorage');
  }
  
  restoreFormData() {
    const savedData = sessionStorage.getItem(this.storageKey);
    
    if (!savedData) {
      console.log('No saved form data');
      return;
    }
    
    const data = JSON.parse(savedData);
    
    for (const [key, value] of Object.entries(data)) {
      const input = this.form.elements[key];
      if (input) {
        input.value = value;
      }
    }
    
    console.log('Form data restored from sessionStorage');
  }
  
  clearFormData() {
    sessionStorage.removeItem(this.storageKey);
    console.log('Form data cleared from sessionStorage');
  }
}

// Usage
const checkoutForm = new FormPersistence('checkout-form');

// User fills form:
// Name: "John Doe"
// Email: "john@example.com"
// Address: "123 Main St"

// → Automatically saved to sessionStorage

// User accidentally refreshes page
// → Form data automatically restored! ✅

// User submits form
// → sessionStorage cleared ✅
```

**Result:**
- No data loss on refresh ✅
- Tab-specific (won't interfere with other tabs) ✅
- Cleared on submit or tab close ✅
- Zero configuration needed ✅

---

## 4. Interview-Oriented Explanation

### Sample Interview Answer (7+ Years Experience)

**Question:** "Compare browser storage options. How do you decide which to use?"

**Your Answer:**

> "Browser storage selection depends on data size, persistence requirements, and access patterns. Here's my framework:
>
> **1. Storage Options Overview**
>
> | Option | Size | Persistence | API | Best For |
> |--------|------|-------------|-----|----------|
> | Cookies | ~4 KB | Configurable | Sync | Auth, server needs |
> | localStorage | ~5-10 MB | Forever | Sync | Preferences, small data |
> | sessionStorage | ~5-10 MB | Tab session | Sync | Temporary state |
> | IndexedDB | ~50 MB - 1 GB+ | Forever | Async | Large datasets, offline |
> | Cache API | ~50 MB+ | Forever | Async | Offline assets, PWA |
>
> **2. Decision Framework**
>
> **A. Size-based:**
> ```
> < 4 KB + server access needed → Cookies
> < 5 MB + simple key-value → localStorage/sessionStorage
> > 5 MB + complex queries → IndexedDB
> Caching HTTP responses → Cache API
> ```
>
> **B. Persistence-based:**
> ```
> Forever + cross-tab → localStorage
> Tab session only → sessionStorage
> Forever + large data → IndexedDB
> Offline support → Cache API + IndexedDB
> ```
>
> **C. Performance-based:**
> ```
> Synchronous OK → localStorage (blocks main thread)
> Must be async → IndexedDB, Cache API
> Needs indexes → IndexedDB
> Network caching → Cache API
> ```
>
> **3. Real-World Architecture Example**
>
> **Scenario:** Offline-first productivity app (like Google Docs)
>
> **Storage Strategy:**
> ```javascript
> // Cookies (4 KB) - Auth only
> document.cookie = "auth_token=...; HttpOnly; Secure; SameSite=Strict";
>
> // localStorage (5 MB) - User preferences
> localStorage.setItem('theme', 'dark');
> localStorage.setItem('language', 'en');
> localStorage.setItem('editor-config', JSON.stringify({...}));
>
> // sessionStorage (5 MB) - Temporary UI state
> sessionStorage.setItem('current-tab', 'editor');
> sessionStorage.setItem('scroll-position', '1234');
>
> // IndexedDB (500 MB) - Documents, revisions
> await documentsDB.addDocument({
>   id: '123',
>   title: 'My Document',
>   content: '...' // Large content
>   revisions: [...] // History
> });
>
> // Cache API (100 MB) - App shell, assets
> await cache.addAll([
>   '/',
>   '/app.js',
>   '/styles.css',
>   '/fonts/...',
> ]);
> ```
>
> **4. Common Pitfalls**
>
> **A. Using localStorage for large data:**
> ```javascript
> // ❌ BAD: Blocks main thread for 500ms
> localStorage.setItem('data', JSON.stringify(largeArray)); // 5 MB
>
> // ✅ GOOD: Async, non-blocking
> await indexedDB.put('data', largeArray); // <10ms
> ```
>
> **B. Not handling quota exceeded:**
> ```javascript
> try {
>   localStorage.setItem('key', value);
> } catch (e) {
>   if (e.name === 'QuotaExceededError') {
>     // Clear old data or use IndexedDB
>     handleQuotaExceeded();
>   }
> }
> ```
>
> **C. Storing sensitive data insecurely:**
> ```javascript
> // ❌ BAD: Accessible via XSS
> localStorage.setItem('credit-card', '1234-5678-9012-3456');
>
> // ✅ GOOD: HttpOnly cookie (set by server)
> Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict
> ```
>
> **5. Performance Comparison**
>
> **Test:** Store and retrieve 1000 items
>
> ```
> localStorage (sync):
> - Write: 250ms (blocks main thread) ❌
> - Read: 150ms (blocks main thread) ❌
>
> IndexedDB (async):
> - Write: 50ms (non-blocking) ✅
> - Read: 10ms (with index) ✅
>
> Improvement: 5-15× faster!
> ```
>
> **6. Real-World Impact**
>
> At [Company], we migrated from localStorage to IndexedDB for our analytics dashboard:
>
> **Before (localStorage):**
> - Storing 10,000 data points: 500ms freeze ❌
> - Querying data: 300ms (linear scan) ❌
> - QuotaExceededError after 5 MB ❌
>
> **After (IndexedDB):**
> - Storing 10,000 data points: 50ms (non-blocking) ✅
> - Querying data: 5ms (indexed) ✅
> - Can store 500 MB+ ✅
>
> **Results:**
> - 10× performance improvement ✅
> - No main thread blocking ✅
> - No quota errors ✅
> - User satisfaction: +45% ✅
>
> **Key Takeaway:**
> Storage choice is an architectural decision with significant performance and UX implications. Always consider:
> - Data size (quota limits)
> - Performance (sync vs async)
> - Security (XSS, sensitive data)
> - Persistence (tab vs forever)
> - Access patterns (simple vs complex queries)
>
> At Senior/Staff level, these decisions affect product scalability and user experience at scale."

---

## 5. Code Examples

### Complete Storage Manager

```typescript
/**
 * Unified storage manager with automatic fallbacks
 */

type StorageType = 'cookie' | 'localStorage' | 'sessionStorage' | 'indexedDB' | 'cache';

interface StorageOptions {
  type: StorageType;
  expires?: number; // milliseconds
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

class UnifiedStorageManager {
  // Check storage availability
  static isAvailable(type: StorageType): boolean {
    try {
      switch (type) {
        case 'localStorage':
          const test = '__storage_test__';
          localStorage.setItem(test, test);
          localStorage.removeItem(test);
          return true;
          
        case 'sessionStorage':
          sessionStorage.setItem('__test__', '__test__');
          sessionStorage.removeItem('__test__');
          return true;
          
        case 'indexedDB':
          return 'indexedDB' in window;
          
        case 'cache':
          return 'caches' in window;
          
        case 'cookie':
          return navigator.cookieEnabled;
          
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
  
  // Get recommended storage for data size
  static recommendStorage(dataSize: number): StorageType {
    if (dataSize < 4 * 1024) {
      return 'cookie'; // < 4 KB
    } else if (dataSize < 5 * 1024 * 1024) {
      return 'localStorage'; // < 5 MB
    } else {
      return 'indexedDB'; // > 5 MB
    }
  }
  
  // Set item with automatic storage selection
  static async set(key: string, value: any, options?: Partial<StorageOptions>): Promise<void> {
    const serialized = JSON.stringify(value);
    const dataSize = new Blob([serialized]).size;
    
    const storageType = options?.type || this.recommendStorage(dataSize);
    
    console.log(`Storing ${key} (${dataSize} bytes) in ${storageType}`);
    
    switch (storageType) {
      case 'cookie':
        this.setCookie(key, serialized, options);
        break;
        
      case 'localStorage':
        if (!this.isAvailable('localStorage')) {
          throw new Error('localStorage not available');
        }
        try {
          localStorage.setItem(key, serialized);
        } catch (e) {
          if (e.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded, falling back to IndexedDB');
            await this.setIndexedDB(key, value);
          } else {
            throw e;
          }
        }
        break;
        
      case 'sessionStorage':
        if (!this.isAvailable('sessionStorage')) {
          throw new Error('sessionStorage not available');
        }
        sessionStorage.setItem(key, serialized);
        break;
        
      case 'indexedDB':
        await this.setIndexedDB(key, value);
        break;
        
      case 'cache':
        await this.setCache(key, serialized);
        break;
    }
  }
  
  // Get item with automatic storage detection
  static async get(key: string, options?: Partial<StorageOptions>): Promise<any> {
    const storageType = options?.type;
    
    // Try specified storage first
    if (storageType) {
      const value = await this.getFromStorage(key, storageType);
      if (value !== null) return value;
    }
    
    // Try all storages in priority order
    const storageOrder: StorageType[] = ['localStorage', 'sessionStorage', 'indexedDB', 'cookie', 'cache'];
    
    for (const type of storageOrder) {
      if (this.isAvailable(type)) {
        const value = await this.getFromStorage(key, type);
        if (value !== null) {
          console.log(`Found ${key} in ${type}`);
          return value;
        }
      }
    }
    
    return null;
  }
  
  // Remove item from all storages
  static async remove(key: string): Promise<void> {
    // Remove from all possible storages
    if (this.isAvailable('localStorage')) {
      localStorage.removeItem(key);
    }
    if (this.isAvailable('sessionStorage')) {
      sessionStorage.removeItem(key);
    }
    if (this.isAvailable('indexedDB')) {
      await this.removeFromIndexedDB(key);
    }
    if (this.isAvailable('cache')) {
      await this.removeFromCache(key);
    }
    this.removeCookie(key);
  }
  
  // Private helpers
  private static getFromStorage(key: string, type: StorageType): Promise<any> {
    switch (type) {
      case 'localStorage':
        const localValue = localStorage.getItem(key);
        return Promise.resolve(localValue ? JSON.parse(localValue) : null);
        
      case 'sessionStorage':
        const sessionValue = sessionStorage.getItem(key);
        return Promise.resolve(sessionValue ? JSON.parse(sessionValue) : null);
        
      case 'indexedDB':
        return this.getFromIndexedDB(key);
        
      case 'cookie':
        const cookieValue = this.getCookie(key);
        return Promise.resolve(cookieValue ? JSON.parse(cookieValue) : null);
        
      case 'cache':
        return this.getFromCache(key);
        
      default:
        return Promise.resolve(null);
    }
  }
  
  // Cookie helpers
  private static setCookie(key: string, value: string, options?: Partial<StorageOptions>): void {
    let cookie = `${key}=${value}`;
    
    if (options?.expires) {
      const date = new Date(Date.now() + options.expires);
      cookie += `; expires=${date.toUTCString()}`;
    }
    
    if (options?.secure) {
      cookie += '; Secure';
    }
    
    if (options?.sameSite) {
      cookie += `; SameSite=${options.sameSite}`;
    }
    
    cookie += '; path=/';
    
    document.cookie = cookie;
  }
  
  private static getCookie(key: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${key}=`);
    if (parts.length === 2) {
      return parts.pop()!.split(';').shift() || null;
    }
    return null;
  }
  
  private static removeCookie(key: string): void {
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
  
  // IndexedDB helpers
  private static async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('UnifiedStorage', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }
      };
    });
  }
  
  private static async setIndexedDB(key: string, value: any): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction(['storage'], 'readwrite');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  private static async getFromIndexedDB(key: string): Promise<any> {
    const db = await this.openDB();
    const transaction = db.transaction(['storage'], 'readonly');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }
  
  private static async removeFromIndexedDB(key: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction(['storage'], 'readwrite');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  // Cache API helpers
  private static async setCache(key: string, value: string): Promise<void> {
    const cache = await caches.open('unified-storage-v1');
    const response = new Response(value, {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(`/storage/${key}`, response);
  }
  
  private static async getFromCache(key: string): Promise<any> {
    const cache = await caches.open('unified-storage-v1');
    const response = await cache.match(`/storage/${key}`);
    
    if (response) {
      const text = await response.text();
      return JSON.parse(text);
    }
    
    return null;
  }
  
  private static async removeFromCache(key: string): Promise<void> {
    const cache = await caches.open('unified-storage-v1');
    await cache.delete(`/storage/${key}`);
  }
  
  // Get storage info
  static async getStorageInfo(): Promise<any> {
    const info: any = {
      available: {},
      usage: {},
    };
    
    // Check availability
    info.available.localStorage = this.isAvailable('localStorage');
    info.available.sessionStorage = this.isAvailable('sessionStorage');
    info.available.indexedDB = this.isAvailable('indexedDB');
    info.available.cache = this.isAvailable('cache');
    info.available.cookie = this.isAvailable('cookie');
    
    // Get quota info (if supported)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      info.quota = estimate.quota;
      info.usage = estimate.usage;
      info.available_space = estimate.quota - estimate.usage;
      info.percent_used = ((estimate.usage / estimate.quota) * 100).toFixed(2) + '%';
    }
    
    return info;
  }
}

// Usage Examples

// Set item (automatic storage selection based on size)
await UnifiedStorageManager.set('user-preferences', {
  theme: 'dark',
  language: 'en',
  notifications: true,
});

// Set large item (automatically uses IndexedDB)
await UnifiedStorageManager.set('large-dataset', largeArray);

// Get item (searches all storages)
const preferences = await UnifiedStorageManager.get('user-preferences');

// Remove item (from all storages)
await UnifiedStorageManager.remove('user-preferences');

// Get storage info
const info = await UnifiedStorageManager.getStorageInfo();
console.log('Storage Info:', info);

/* Output:
Storage Info: {
  available: {
    localStorage: true,
    sessionStorage: true,
    indexedDB: true,
    cache: true,
    cookie: true
  },
  quota: 299977904742,
  usage: 152387584,
  available_space: 299825517158,
  percent_used: '0.05%'
}
*/
```

---

## 6. Why & How Summary

### Why Storage Matters

**User Experience:**
- Offline support (IndexedDB + Cache API)
- Fast loading (cached data)
- Personalization (preferences in localStorage)
- State persistence (sessionStorage for forms)

**Performance:**
- Reduce API calls (cached responses)
- Instant page loads (Cache API)
- Non-blocking operations (IndexedDB async)

**Business Impact:**
- Offline capability → 35% higher retention
- Fast loads → 20% better conversion
- Personalization → 15% more engagement

---

### How to Choose Storage

**Decision Tree:**
```
1. Size?
   < 4 KB → Cookies (if server needs it)
   < 5 MB → localStorage/sessionStorage
   > 5 MB → IndexedDB

2. Persistence?
   Forever + cross-tab → localStorage
   Tab session → sessionStorage
   Forever + large → IndexedDB
   
3. Performance?
   Sync OK → localStorage
   Must be async → IndexedDB
   
4. Use case?
   Auth → Cookies (HttpOnly)
   Preferences → localStorage
   Temp state → sessionStorage
   Large data → IndexedDB
   Offline assets → Cache API
```

---

### Quick Reference

| Need | Solution | Size | Persistence |
|------|----------|------|-------------|
| Auth tokens | Cookies (HttpOnly) | 4 KB | Configurable |
| User preferences | localStorage | 5 MB | Forever |
| Form data (temp) | sessionStorage | 5 MB | Tab session |
| Offline emails | IndexedDB | 1 GB+ | Forever |
| Offline assets | Cache API | 50 MB+ | Forever |
| Complex queries | IndexedDB | 1 GB+ | Forever |

---

**🎉 PART 2 COMPLETE! 🎉**

All 9 topics of "Browser & Web Platform Internals" are now finished:
- ✅ Topic 9: How the Browser Works
- ✅ Topic 10: Critical Rendering Path
- ✅ Topic 11: HTML Parsing, CSSOM, Render Tree
- ✅ Topic 12: JavaScript Execution Model
- ✅ Topic 13: Event Loop
- ✅ Topic 14: Reflows vs Repaints
- ✅ Topic 15: GPU vs CPU Rendering
- ✅ Topic 16: Memory Management
- ✅ Topic 17: Browser Storage Options (just completed!)

**Next:** Part 3 — Frontend Architecture Patterns (Topics 18-27)

