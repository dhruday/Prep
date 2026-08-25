# 99. Handling Stale Data

## High-Level Overview

Handling stale data refers to the strategies and techniques used to manage cached or stored data that may be outdated, ensuring users see fresh content without unnecessary network requests. Stale data occurs when cached information differs from the source of truth (server), and handling it correctly balances performance (using cache) with accuracy (fresh data).

**Key Concept**: Stale data is cached information that may not reflect the current server state. The goal is to serve cached data quickly while intelligently refreshing it when necessary, providing instant UX with eventual consistency.

**Why It Matters:**
- **Performance vs Freshness**: Cache improves speed but may be outdated
- **User Experience**: Instant responses with stale data > slow responses with fresh data (in most cases)
- **Network Efficiency**: Reduce unnecessary requests while ensuring accuracy
- **Resource Optimization**: Balance server load with data freshness needs
- **Mobile Considerations**: Critical for users on slow/expensive connections

**Real-World Impact:**
- **Twitter/X**: Shows cached timeline immediately, updates in background
- **Facebook**: Stale-while-revalidate for feeds, instant load + background refresh
- **Netflix**: Cached thumbnails/metadata with periodic updates
- **Instagram**: Shows cached images immediately, updates likes/comments asynchronously
- **SPA Navigation**: Cached page data with background revalidation

**The Core Trade-off:**
```
Performance (Cache)  ⚖️  Freshness (Network)
        ↓                        ↓
   Instant UX              Accurate Data
   Less traffic            More traffic
   May be stale            Always fresh
```

---

## Deep Technical Dive

### 1. Types of Stale Data

#### Type 1: Time-Based Staleness

```javascript
// Data becomes stale after a time threshold
class TimeBasedCache {
  constructor(maxAge = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.maxAge = maxAge;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { value: null, isStale: false, isMiss: true };
    }
    
    const age = Date.now() - entry.timestamp;
    const isStale = age > this.maxAge;
    
    return {
      value: entry.value,
      isStale,
      age,
      isMiss: false
    };
  }
  
  isStale(key) {
    const result = this.get(key);
    return result.isStale || result.isMiss;
  }
  
  clear() {
    this.cache.clear();
  }
}

// Usage
const cache = new TimeBasedCache(5 * 60 * 1000); // 5 min TTL

cache.set('user:123', { name: 'Alice', score: 100 });

// After 3 minutes
const result1 = cache.get('user:123');
console.log(result1.isStale); // false (fresh)

// After 6 minutes
const result2 = cache.get('user:123');
console.log(result2.isStale); // true (stale)
```

#### Type 2: Version-Based Staleness

```javascript
// Data becomes stale when version changes
class VersionedCache {
  constructor() {
    this.cache = new Map();
    this.versions = new Map();
  }
  
  set(key, value, version) {
    this.cache.set(key, value);
    this.versions.set(key, version);
  }
  
  get(key, currentVersion) {
    if (!this.cache.has(key)) {
      return { value: null, isStale: false, isMiss: true };
    }
    
    const cachedVersion = this.versions.get(key);
    const isStale = cachedVersion !== currentVersion;
    
    return {
      value: this.cache.get(key),
      isStale,
      cachedVersion,
      currentVersion,
      isMiss: false
    };
  }
  
  invalidateVersion(key) {
    // Mark as stale by incrementing version
    const currentVersion = this.versions.get(key) || 0;
    this.versions.set(key, currentVersion + 1);
  }
}

// Usage
const cache = new VersionedCache();

cache.set('article:1', { title: 'Hello' }, 1);

const result1 = cache.get('article:1', 1);
console.log(result1.isStale); // false (versions match)

const result2 = cache.get('article:1', 2);
console.log(result2.isStale); // true (versions differ)
```

#### Type 3: Dependency-Based Staleness

```javascript
// Data becomes stale when dependencies change
class DependencyCache {
  constructor() {
    this.cache = new Map();
    this.dependencies = new Map();
    this.dependents = new Map();
  }
  
  set(key, value, deps = []) {
    this.cache.set(key, value);
    this.dependencies.set(key, deps);
    
    // Track reverse dependencies
    for (const dep of deps) {
      if (!this.dependents.has(dep)) {
        this.dependents.set(dep, new Set());
      }
      this.dependents.get(dep).add(key);
    }
  }
  
  get(key) {
    if (!this.cache.has(key)) {
      return { value: null, isStale: false, isMiss: true };
    }
    
    // Check if any dependency is stale
    const deps = this.dependencies.get(key) || [];
    const staleDeps = deps.filter(dep => !this.cache.has(dep));
    
    return {
      value: this.cache.get(key),
      isStale: staleDeps.length > 0,
      staleDependencies: staleDeps,
      isMiss: false
    };
  }
  
  invalidate(key) {
    // Remove from cache
    this.cache.delete(key);
    
    // Invalidate all dependents
    const dependents = this.dependents.get(key) || new Set();
    for (const dependent of dependents) {
      this.invalidate(dependent);
    }
  }
}

// Usage
const cache = new DependencyCache();

cache.set('user:123', { name: 'Alice' });
cache.set('posts:123', { posts: [] }, ['user:123']);
cache.set('dashboard', { data: {} }, ['user:123', 'posts:123']);

// Invalidate user
cache.invalidate('user:123');

const result = cache.get('dashboard');
console.log(result.isStale); // true (dependency invalidated)
```

### 2. Stale-While-Revalidate Pattern (SWR)

The most popular pattern for handling stale data, popularized by HTTP Cache-Control and libraries like SWR/React Query.

```javascript
// Core SWR implementation
class StaleWhileRevalidate {
  constructor(options = {}) {
    this.cache = new Map();
    this.inflight = new Map(); // Track in-progress requests
    this.maxAge = options.maxAge || 60 * 1000; // 1 minute
    this.staleWhileRevalidate = options.staleWhileRevalidate || 5 * 60 * 1000; // 5 minutes
  }
  
  async fetch(key, fetchFn) {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    // Step 1: Check cache
    if (cached) {
      const age = now - cached.timestamp;
      
      // Fresh: Return immediately
      if (age < this.maxAge) {
        return {
          data: cached.value,
          source: 'cache-fresh',
          age
        };
      }
      
      // Stale but acceptable: Return + revalidate in background
      if (age < this.maxAge + this.staleWhileRevalidate) {
        // Return stale data immediately
        const result = {
          data: cached.value,
          source: 'cache-stale',
          age
        };
        
        // Revalidate in background (don't await)
        this.revalidate(key, fetchFn);
        
        return result;
      }
      
      // Too stale: Must revalidate before returning
      return this.revalidate(key, fetchFn);
    }
    
    // Step 2: No cache - fetch fresh
    return this.revalidate(key, fetchFn);
  }
  
  async revalidate(key, fetchFn) {
    // Deduplicate: If already fetching, wait for that request
    if (this.inflight.has(key)) {
      return this.inflight.get(key);
    }
    
    // Create fetch promise
    const promise = (async () => {
      try {
        const data = await fetchFn();
        
        // Update cache
        this.cache.set(key, {
          value: data,
          timestamp: Date.now()
        });
        
        return {
          data,
          source: 'network',
          age: 0
        };
      } catch (error) {
        // On error, return stale data if available
        const cached = this.cache.get(key);
        if (cached) {
          return {
            data: cached.value,
            source: 'cache-error',
            age: Date.now() - cached.timestamp,
            error
          };
        }
        
        throw error;
      } finally {
        // Remove from inflight
        this.inflight.delete(key);
      }
    })();
    
    // Track inflight request
    this.inflight.set(key, promise);
    
    return promise;
  }
  
  invalidate(key) {
    this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
    this.inflight.clear();
  }
}

// Usage
const swr = new StaleWhileRevalidate({
  maxAge: 60 * 1000, // Fresh for 1 minute
  staleWhileRevalidate: 5 * 60 * 1000 // Acceptable for 5 more minutes
});

async function getUser(id) {
  return swr.fetch(`user:${id}`, async () => {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  });
}

// First call: Network fetch
const result1 = await getUser(123);
console.log(result1.source); // 'network'

// Second call (within 1 min): Cache hit
const result2 = await getUser(123);
console.log(result2.source); // 'cache-fresh'

// Third call (after 2 min): Stale cache + background revalidate
const result3 = await getUser(123);
console.log(result3.source); // 'cache-stale' (returns immediately)
// Background fetch happens asynchronously
```

### 3. Advanced SWR with React Hook

```javascript
// React SWR Hook with automatic revalidation
import { useState, useEffect, useRef } from 'react';

function useSWR(key, fetcher, options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const cache = useRef(new Map());
  const inflight = useRef(new Map());
  
  const {
    refreshInterval = 0, // Auto-refresh interval (0 = disabled)
    revalidateOnFocus = true, // Revalidate when window gains focus
    revalidateOnReconnect = true, // Revalidate when network reconnects
    dedupingInterval = 2000, // Dedupe requests within this interval
    shouldRetryOnError = true,
    errorRetryCount = 3,
    errorRetryInterval = 5000
  } = options;
  
  const revalidate = async (force = false) => {
    if (!key || !fetcher) return;
    
    // Check deduplication
    if (!force && inflight.current.has(key)) {
      return inflight.current.get(key);
    }
    
    setIsValidating(true);
    
    const fetchPromise = (async () => {
      try {
        const newData = await fetcher(key);
        
        // Update cache
        cache.current.set(key, {
          data: newData,
          timestamp: Date.now(),
          error: null
        });
        
        setData(newData);
        setError(null);
        setIsLoading(false);
        
        return newData;
      } catch (err) {
        setError(err);
        setIsLoading(false);
        
        // Keep stale data on error
        const cached = cache.current.get(key);
        if (cached && cached.data) {
          setData(cached.data);
        }
        
        throw err;
      } finally {
        setIsValidating(false);
        inflight.current.delete(key);
      }
    })();
    
    inflight.current.set(key, fetchPromise);
    
    return fetchPromise;
  };
  
  const mutate = async (newData, shouldRevalidate = true) => {
    // Optimistic update
    if (newData !== undefined) {
      cache.current.set(key, {
        data: newData,
        timestamp: Date.now(),
        error: null
      });
      setData(newData);
    }
    
    // Revalidate after mutation
    if (shouldRevalidate) {
      await revalidate(true);
    }
  };
  
  useEffect(() => {
    if (!key) return;
    
    // Check cache first
    const cached = cache.current.get(key);
    if (cached) {
      setData(cached.data);
      setError(cached.error);
      setIsLoading(false);
      
      // Check if stale
      const age = Date.now() - cached.timestamp;
      if (age > dedupingInterval) {
        revalidate();
      }
    } else {
      // No cache - fetch
      revalidate();
    }
  }, [key]);
  
  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || !key) return;
    
    const timer = setInterval(() => {
      revalidate();
    }, refreshInterval);
    
    return () => clearInterval(timer);
  }, [key, refreshInterval]);
  
  // Revalidate on focus
  useEffect(() => {
    if (!revalidateOnFocus || !key) return;
    
    const handleFocus = () => {
      revalidate();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [key, revalidateOnFocus]);
  
  // Revalidate on reconnect
  useEffect(() => {
    if (!revalidateOnReconnect || !key) return;
    
    const handleOnline = () => {
      revalidate();
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [key, revalidateOnReconnect]);
  
  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    revalidate
  };
}

// Usage in React component
function UserProfile({ userId }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `user:${userId}`,
    async (key) => {
      const response = await fetch(`/api/users/${userId}`);
      return response.json();
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>{data.name}</h1>
      {isValidating && <span>Updating...</span>}
      
      <button onClick={() => mutate({ ...data, name: 'Updated' })}>
        Update (Optimistic)
      </button>
    </div>
  );
}
```

### 4. Cache-Control Headers Strategy

```javascript
// Parse and respect HTTP Cache-Control headers
class HTTPCacheStrategy {
  constructor() {
    this.cache = new Map();
  }
  
  async fetch(url, options = {}) {
    const cacheKey = this.getCacheKey(url, options);
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    
    // Check if we have cached response
    if (cached) {
      const age = (now - cached.timestamp) / 1000; // seconds
      
      // Check freshness based on Cache-Control
      const freshness = this.getFreshness(cached.headers, age);
      
      if (freshness.isFresh) {
        // Fresh: Return from cache
        return {
          ...cached.response,
          source: 'cache',
          age
        };
      }
      
      if (freshness.canServeStale) {
        // Stale but can serve: Return + revalidate
        this.revalidateInBackground(url, options, cacheKey);
        
        return {
          ...cached.response,
          source: 'cache-stale',
          age,
          warning: '110 Response is Stale'
        };
      }
      
      // Must revalidate
      return this.fetchAndCache(url, options, cacheKey, cached);
    }
    
    // No cache: Fetch fresh
    return this.fetchAndCache(url, options, cacheKey);
  }
  
  getFreshness(headers, age) {
    const cacheControl = this.parseCacheControl(headers['cache-control']);
    
    // Check max-age
    const maxAge = cacheControl['max-age'];
    if (maxAge !== undefined) {
      const isFresh = age < parseInt(maxAge);
      
      // Check stale-while-revalidate
      const swr = cacheControl['stale-while-revalidate'];
      const canServeStale = swr !== undefined && age < parseInt(maxAge) + parseInt(swr);
      
      return { isFresh, canServeStale };
    }
    
    // Check Expires header
    const expires = headers['expires'];
    if (expires) {
      const expiresTime = new Date(expires).getTime();
      const isFresh = Date.now() < expiresTime;
      return { isFresh, canServeStale: false };
    }
    
    // No caching directives - treat as stale
    return { isFresh: false, canServeStale: false };
  }
  
  parseCacheControl(header) {
    if (!header) return {};
    
    const directives = {};
    header.split(',').forEach(directive => {
      const [key, value] = directive.trim().split('=');
      directives[key] = value || true;
    });
    
    return directives;
  }
  
  async fetchAndCache(url, options, cacheKey, cached = null) {
    // Add conditional headers if we have cached response
    const requestOptions = { ...options };
    if (cached) {
      if (cached.headers.etag) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'If-None-Match': cached.headers.etag
        };
      }
      if (cached.headers['last-modified']) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'If-Modified-Since': cached.headers['last-modified']
        };
      }
    }
    
    const response = await fetch(url, requestOptions);
    
    // 304 Not Modified: Use cached response
    if (response.status === 304 && cached) {
      // Update timestamp but keep data
      cached.timestamp = Date.now();
      this.cache.set(cacheKey, cached);
      
      return {
        ...cached.response,
        source: 'cache-revalidated',
        age: 0
      };
    }
    
    // New response: Cache it
    const data = await response.json();
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    this.cache.set(cacheKey, {
      response: { data, status: response.status },
      headers,
      timestamp: Date.now()
    });
    
    return {
      data,
      status: response.status,
      source: 'network',
      age: 0
    };
  }
  
  async revalidateInBackground(url, options, cacheKey) {
    // Don't await - runs in background
    this.fetchAndCache(url, options, cacheKey).catch(err => {
      console.warn('Background revalidation failed:', err);
    });
  }
  
  getCacheKey(url, options) {
    // Create unique key based on URL and method
    const method = options.method || 'GET';
    return `${method}:${url}`;
  }
  
  invalidate(url) {
    // Remove all cache entries matching URL
    for (const [key] of this.cache) {
      if (key.includes(url)) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage
const httpCache = new HTTPCacheStrategy();

async function getUserData(id) {
  return httpCache.fetch(`/api/users/${id}`);
}

// First call: Network
const result1 = await getUserData(123);
console.log(result1.source); // 'network'

// Second call (within max-age): Cache
const result2 = await getUserData(123);
console.log(result2.source); // 'cache'

// Later call (within stale-while-revalidate): Stale cache + background refresh
const result3 = await getUserData(123);
console.log(result3.source); // 'cache-stale'
```

### 5. Optimistic Updates with Rollback

```javascript
// Handle stale data with optimistic updates and rollback on error
class OptimisticCache {
  constructor() {
    this.cache = new Map();
    this.pendingUpdates = new Map();
  }
  
  async mutate(key, updateFn, options = {}) {
    const {
      optimisticData,
      rollbackOnError = true,
      revalidate = true
    } = options;
    
    // Store current data for potential rollback
    const previousData = this.cache.get(key);
    
    // Step 1: Optimistic update (immediate UI feedback)
    if (optimisticData !== undefined) {
      this.cache.set(key, {
        data: optimisticData,
        timestamp: Date.now(),
        isOptimistic: true
      });
      
      // Notify subscribers
      this.notifySubscribers(key, optimisticData);
    }
    
    try {
      // Step 2: Perform actual update
      const newData = await updateFn();
      
      // Step 3: Update cache with real data
      this.cache.set(key, {
        data: newData,
        timestamp: Date.now(),
        isOptimistic: false
      });
      
      // Notify subscribers with real data
      this.notifySubscribers(key, newData);
      
      return newData;
    } catch (error) {
      // Step 4: Rollback on error
      if (rollbackOnError && previousData) {
        this.cache.set(key, previousData);
        this.notifySubscribers(key, previousData.data);
      }
      
      throw error;
    } finally {
      // Step 5: Revalidate if needed
      if (revalidate) {
        this.revalidate(key);
      }
    }
  }
  
  async revalidate(key) {
    // Fetch fresh data from server
    // This is a placeholder - implement based on your data fetching logic
  }
  
  subscribe(key, callback) {
    if (!this.subscribers) {
      this.subscribers = new Map();
    }
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(key).delete(callback);
    };
  }
  
  notifySubscribers(key, data) {
    if (!this.subscribers || !this.subscribers.has(key)) return;
    
    this.subscribers.get(key).forEach(callback => {
      callback(data);
    });
  }
}

// Usage with React
function useOptimisticUpdate(key, fetcher) {
  const cache = useRef(new OptimisticCache());
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Subscribe to cache updates
    const unsubscribe = cache.current.subscribe(key, setData);
    return unsubscribe;
  }, [key]);
  
  const mutate = async (optimisticData, updateFn) => {
    return cache.current.mutate(key, updateFn, {
      optimisticData,
      rollbackOnError: true
    });
  };
  
  return { data, mutate };
}

// Example: Like button
function LikeButton({ postId, initialLikes }) {
  const { data, mutate } = useOptimisticUpdate(
    `post:${postId}:likes`,
    async () => {
      const response = await fetch(`/api/posts/${postId}/likes`);
      return response.json();
    }
  );
  
  const likes = data?.count || initialLikes;
  
  const handleLike = async () => {
    // Optimistic update: Show liked immediately
    await mutate(
      { count: likes + 1, liked: true }, // Optimistic data
      async () => {
        // Actual API call
        const response = await fetch(`/api/posts/${postId}/like`, {
          method: 'POST'
        });
        return response.json();
      }
    );
  };
  
  return (
    <button onClick={handleLike}>
      ❤️ {likes}
    </button>
  );
}
```

### 6. Stale Data Detection Strategies

```javascript
// Comprehensive stale detection system
class StaleDetector {
  constructor() {
    this.strategies = new Map();
  }
  
  // Strategy 1: Time-based (TTL)
  addTimeBasedStrategy(key, ttl) {
    this.strategies.set(key, {
      type: 'time',
      ttl,
      timestamp: Date.now()
    });
  }
  
  // Strategy 2: Event-based (invalidate on events)
  addEventBasedStrategy(key, events) {
    this.strategies.set(key, {
      type: 'event',
      events,
      valid: true
    });
    
    // Listen for invalidation events
    events.forEach(event => {
      window.addEventListener(event, () => {
        this.invalidate(key);
      });
    });
  }
  
  // Strategy 3: Dependency-based
  addDependencyStrategy(key, dependencies) {
    this.strategies.set(key, {
      type: 'dependency',
      dependencies,
      valid: true
    });
  }
  
  // Strategy 4: ETag-based (server validation)
  addETagStrategy(key, etag) {
    this.strategies.set(key, {
      type: 'etag',
      etag,
      valid: true
    });
  }
  
  // Strategy 5: Polling-based (periodic checks)
  addPollingStrategy(key, interval, checkFn) {
    const strategy = {
      type: 'polling',
      interval,
      checkFn,
      valid: true,
      timer: null
    };
    
    strategy.timer = setInterval(async () => {
      const isStale = await checkFn();
      if (isStale) {
        this.invalidate(key);
      }
    }, interval);
    
    this.strategies.set(key, strategy);
  }
  
  isStale(key) {
    const strategy = this.strategies.get(key);
    if (!strategy) return true; // No strategy = treat as stale
    
    switch (strategy.type) {
      case 'time':
        const age = Date.now() - strategy.timestamp;
        return age > strategy.ttl;
      
      case 'event':
      case 'dependency':
      case 'etag':
      case 'polling':
        return !strategy.valid;
      
      default:
        return true;
    }
  }
  
  invalidate(key) {
    const strategy = this.strategies.get(key);
    if (strategy) {
      strategy.valid = false;
    }
  }
  
  refresh(key) {
    const strategy = this.strategies.get(key);
    if (strategy) {
      if (strategy.type === 'time') {
        strategy.timestamp = Date.now();
      } else {
        strategy.valid = true;
      }
    }
  }
  
  cleanup() {
    // Clean up polling timers
    this.strategies.forEach(strategy => {
      if (strategy.type === 'polling' && strategy.timer) {
        clearInterval(strategy.timer);
      }
    });
    this.strategies.clear();
  }
}

// Usage
const detector = new StaleDetector();

// Time-based: User profile valid for 5 minutes
detector.addTimeBasedStrategy('user:123', 5 * 60 * 1000);

// Event-based: Cart invalidates on checkout
detector.addEventBasedStrategy('cart', ['checkout-complete', 'cart-updated']);

// Dependency-based: Dashboard depends on user and settings
detector.addDependencyStrategy('dashboard', ['user:123', 'settings']);

// Polling: Check for new messages every 30 seconds
detector.addPollingStrategy('messages', 30000, async () => {
  const response = await fetch('/api/messages/check-new');
  const { hasNew } = await response.json();
  return hasNew;
});

// Check staleness
if (detector.isStale('user:123')) {
  console.log('User data is stale, refetch needed');
}
```

---

## Real-World Production Examples

### Example 1: Social Media Feed with Stale-While-Revalidate

**Problem**: Show users their feed instantly while ensuring they eventually see fresh content.

```javascript
// social-media-feed.js
class SocialFeed {
  constructor() {
    this.cache = new StaleWhileRevalidate({
      maxAge: 30 * 1000, // Fresh for 30 seconds
      staleWhileRevalidate: 5 * 60 * 1000 // Accept stale for 5 minutes
    });
    
    this.setupRealtimeUpdates();
  }
  
  async loadFeed(userId) {
    const result = await this.cache.fetch(
      `feed:${userId}`,
      async () => {
        console.log('[Feed] Fetching from network...');
        const response = await fetch(`/api/feed/${userId}`);
        return response.json();
      }
    );
    
    this.renderFeed(result.data, result.source);
    
    return result;
  }
  
  renderFeed(posts, source) {
    const container = document.getElementById('feed');
    
    // Show staleness indicator
    const indicator = document.getElementById('feed-status');
    if (source === 'cache-stale') {
      indicator.textContent = '🔄 Updating...';
      indicator.className = 'status updating';
    } else if (source === 'cache-fresh' || source === 'network') {
      indicator.textContent = '✅ Up to date';
      indicator.className = 'status fresh';
    }
    
    // Render posts
    container.innerHTML = posts.map(post => `
      <div class="post" data-id="${post.id}">
        <div class="post-header">
          <img src="${post.author.avatar}" alt="${post.author.name}">
          <span>${post.author.name}</span>
          <span class="timestamp">${this.formatTime(post.createdAt)}</span>
        </div>
        <div class="post-content">${post.content}</div>
        <div class="post-actions">
          <button onclick="feed.likePost('${post.id}')">${post.likes} Likes</button>
          <button>${post.comments} Comments</button>
        </div>
      </div>
    `).join('');
  }
  
  async likePost(postId) {
    // Optimistic update
    const postElement = document.querySelector(`[data-id="${postId}"]`);
    const likeButton = postElement.querySelector('button');
    const currentLikes = parseInt(likeButton.textContent);
    likeButton.textContent = `${currentLikes + 1} Likes`;
    
    try {
      // Send to server
      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      
      // Invalidate feed cache (will refetch on next load)
      this.cache.invalidate('feed:current-user');
    } catch (error) {
      // Rollback on error
      likeButton.textContent = `${currentLikes} Likes`;
      alert('Failed to like post');
    }
  }
  
  setupRealtimeUpdates() {
    // WebSocket for real-time updates
    const ws = new WebSocket('wss://api.social.com/feed-updates');
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      if (update.type === 'new-post') {
        // Invalidate cache - will refetch fresh data
        this.cache.invalidate(`feed:${update.userId}`);
        
        // Show notification
        this.showNewPostNotification();
      }
    };
  }
  
  showNewPostNotification() {
    const banner = document.createElement('div');
    banner.className = 'new-posts-banner';
    banner.textContent = 'New posts available';
    banner.onclick = () => {
      this.loadFeed('current-user');
      banner.remove();
    };
    
    document.body.prepend(banner);
  }
  
  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }
}

// Initialize
const feed = new SocialFeed();

// Load feed
feed.loadFeed('current-user');

// Pull-to-refresh
let startY = 0;
document.addEventListener('touchstart', (e) => {
  startY = e.touches[0].pageY;
});

document.addEventListener('touchmove', (e) => {
  const currentY = e.touches[0].pageY;
  const diff = currentY - startY;
  
  if (diff > 100 && window.scrollY === 0) {
    // Pull-to-refresh triggered
    feed.cache.invalidate('feed:current-user');
    feed.loadFeed('current-user');
  }
});
```

### Example 2: E-commerce Product Catalog with Smart Caching

**Problem**: Show product catalog instantly, handle price/stock updates gracefully.

```javascript
// product-catalog.js
class ProductCatalog {
  constructor() {
    this.cache = new Map();
    this.revalidationQueue = new Set();
    
    // Different TTLs for different data types
    this.ttls = {
      'product-list': 5 * 60 * 1000, // 5 minutes
      'product-detail': 2 * 60 * 1000, // 2 minutes
      'price': 30 * 1000, // 30 seconds (prices change frequently)
      'stock': 15 * 1000, // 15 seconds (stock is critical)
      'reviews': 10 * 60 * 1000 // 10 minutes (reviews change slowly)
    };
  }
  
  async getProducts(category) {
    const cacheKey = `products:${category}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      const ttl = this.ttls['product-list'];
      
      if (age < ttl) {
        // Fresh cache
        return {
          products: cached.data,
          source: 'cache',
          age
        };
      } else {
        // Stale: Return + revalidate
        this.revalidateProducts(category);
        
        return {
          products: cached.data,
          source: 'cache-stale',
          age,
          revalidating: true
        };
      }
    }
    
    // No cache: Fetch fresh
    return this.fetchProducts(category);
  }
  
  async fetchProducts(category) {
    const response = await fetch(`/api/products?category=${category}`);
    const products = await response.json();
    
    // Cache with timestamp
    this.cache.set(`products:${category}`, {
      data: products,
      timestamp: Date.now()
    });
    
    return {
      products,
      source: 'network',
      age: 0
    };
  }
  
  async revalidateProducts(category) {
    // Prevent duplicate revalidations
    if (this.revalidationQueue.has(category)) {
      return;
    }
    
    this.revalidationQueue.add(category);
    
    try {
      const result = await this.fetchProducts(category);
      
      // Check if data changed
      const cached = this.cache.get(`products:${category}`);
      if (this.hasSignificantChanges(cached.data, result.products)) {
        // Notify UI of updates
        this.notifyProductUpdates(category, result.products);
      }
    } finally {
      this.revalidationQueue.delete(category);
    }
  }
  
  async getProductDetail(productId) {
    const cacheKey = `product:${productId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      
      // Check critical data freshness
      const needsPriceUpdate = age > this.ttls['price'];
      const needsStockUpdate = age > this.ttls['stock'];
      
      if (needsPriceUpdate || needsStockUpdate) {
        // Fetch only critical data
        this.updateCriticalData(productId, cached.data);
      }
      
      return {
        product: cached.data,
        source: age < this.ttls['product-detail'] ? 'cache' : 'cache-stale',
        age
      };
    }
    
    // Fetch full product
    return this.fetchProductDetail(productId);
  }
  
  async fetchProductDetail(productId) {
    const response = await fetch(`/api/products/${productId}`);
    const product = await response.json();
    
    this.cache.set(`product:${productId}`, {
      data: product,
      timestamp: Date.now()
    });
    
    return {
      product,
      source: 'network',
      age: 0
    };
  }
  
  async updateCriticalData(productId, cachedProduct) {
    // Fetch only price and stock (lightweight request)
    const response = await fetch(`/api/products/${productId}/critical`);
    const { price, stock } = await response.json();
    
    // Update cache with new critical data
    const updated = {
      ...cachedProduct,
      price,
      stock
    };
    
    this.cache.set(`product:${productId}`, {
      data: updated,
      timestamp: Date.now()
    });
    
    // Update UI if product is visible
    this.updateProductUI(productId, { price, stock });
  }
  
  hasSignificantChanges(oldData, newData) {
    // Check if changes warrant UI update
    if (oldData.length !== newData.length) return true;
    
    // Check for price/stock changes
    for (let i = 0; i < oldData.length; i++) {
      if (oldData[i].price !== newData[i].price) return true;
      if (oldData[i].stock !== newData[i].stock) return true;
    }
    
    return false;
  }
  
  notifyProductUpdates(category, products) {
    // Show subtle notification
    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.innerHTML = `
      <span>🔄 Prices updated</span>
      <button onclick="catalog.refreshCategory('${category}')">Refresh</button>
    `;
    
    document.querySelector('.catalog-header').appendChild(banner);
    
    setTimeout(() => banner.remove(), 5000);
  }
  
  updateProductUI(productId, updates) {
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (!productCard) return;
    
    // Update price
    if (updates.price) {
      const priceElement = productCard.querySelector('.price');
      const oldPrice = parseFloat(priceElement.textContent.replace('$', ''));
      priceElement.textContent = `$${updates.price}`;
      
      // Highlight if price changed
      if (oldPrice !== updates.price) {
        priceElement.classList.add('price-changed');
        setTimeout(() => priceElement.classList.remove('price-changed'), 2000);
      }
    }
    
    // Update stock
    if (updates.stock !== undefined) {
      const stockElement = productCard.querySelector('.stock');
      
      if (updates.stock === 0) {
        stockElement.textContent = 'Out of Stock';
        stockElement.className = 'stock out-of-stock';
      } else if (updates.stock < 5) {
        stockElement.textContent = `Only ${updates.stock} left`;
        stockElement.className = 'stock low-stock';
      } else {
        stockElement.textContent = 'In Stock';
        stockElement.className = 'stock in-stock';
      }
    }
  }
  
  async addToCart(productId, quantity) {
    // Verify stock before adding
    const { product } = await this.getProductDetail(productId);
    
    if (product.stock < quantity) {
      alert(`Only ${product.stock} items available`);
      return false;
    }
    
    // Optimistic update
    const response = await fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    });
    
    if (response.ok) {
      // Invalidate product cache (stock changed)
      this.cache.delete(`product:${productId}`);
      
      // Refetch to get updated stock
      this.getProductDetail(productId);
      
      return true;
    }
    
    return false;
  }
  
  refreshCategory(category) {
    // Force refresh
    this.cache.delete(`products:${category}`);
    this.getProducts(category).then(result => {
      // Re-render UI
      this.renderProducts(result.products);
    });
  }
  
  renderProducts(products) {
    const container = document.getElementById('products');
    container.innerHTML = products.map(product => `
      <div class="product-card" data-product-id="${product.id}">
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="price">$${product.price}</p>
        <p class="stock ${product.stock === 0 ? 'out-of-stock' : 'in-stock'}">
          ${product.stock === 0 ? 'Out of Stock' : 'In Stock'}
        </p>
        <button 
          onclick="catalog.addToCart('${product.id}', 1)"
          ${product.stock === 0 ? 'disabled' : ''}
        >
          Add to Cart
        </button>
      </div>
    `).join('');
  }
}

// Initialize
const catalog = new ProductCatalog();

// Load products
catalog.getProducts('electronics').then(result => {
  catalog.renderProducts(result.products);
  
  if (result.source === 'cache-stale') {
    console.log('Showing cached products, updating in background...');
  }
});

// Periodic stock checks for viewed products
setInterval(() => {
  const visibleProducts = document.querySelectorAll('.product-card');
  visibleProducts.forEach(card => {
    const productId = card.dataset.productId;
    catalog.getProductDetail(productId); // Will update if stale
  });
}, 30 * 1000); // Every 30 seconds
```

### Example 3: Collaborative Document Editor with Conflict Resolution

**Problem**: Multiple users editing same document, handle stale local versions.

```javascript
// collaborative-editor.js
class CollaborativeEditor {
  constructor(documentId) {
    this.documentId = documentId;
    this.localVersion = 0;
    this.serverVersion = 0;
    this.content = '';
    this.pendingChanges = [];
    this.ws = null;
    
    this.init();
  }
  
  async init() {
    // Load document
    await this.loadDocument();
    
    // Setup WebSocket for real-time sync
    this.setupWebSocket();
    
    // Setup editor
    this.setupEditor();
    
    // Periodic sync
    this.startPeriodicSync();
  }
  
  async loadDocument() {
    const response = await fetch(`/api/documents/${this.documentId}`);
    const doc = await response.json();
    
    this.content = doc.content;
    this.localVersion = doc.version;
    this.serverVersion = doc.version;
    
    this.renderContent(this.content);
  }
  
  setupWebSocket() {
    this.ws = new WebSocket(`wss://api.docs.com/document/${this.documentId}`);
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'document-update') {
        this.handleRemoteUpdate(message);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket closed, reconnecting...');
      setTimeout(() => this.setupWebSocket(), 1000);
    };
  }
  
  setupEditor() {
    const editor = document.getElementById('editor');
    
    editor.addEventListener('input', (e) => {
      this.handleLocalEdit(e.target.textContent);
    });
    
    // Show version info
    this.updateVersionDisplay();
  }
  
  handleLocalEdit(newContent) {
    // Calculate changes
    const changes = this.diffContent(this.content, newContent);
    
    // Update local content
    this.content = newContent;
    this.localVersion++;
    
    // Queue changes for sync
    this.pendingChanges.push({
      version: this.localVersion,
      baseVersion: this.serverVersion,
      changes
    });
    
    // Debounced sync
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncChanges();
    }, 1000);
    
    // Update UI
    this.updateVersionDisplay();
  }
  
  async handleRemoteUpdate(message) {
    const { version, changes, author } = message;
    
    // Check if our local version is stale
    if (version > this.serverVersion) {
      // Remote changes exist
      
      if (this.pendingChanges.length > 0) {
        // We have local changes - potential conflict!
        await this.resolveConflict(changes);
      } else {
        // No local changes - just apply remote changes
        this.applyChanges(changes);
        this.serverVersion = version;
        this.localVersion = version;
      }
      
      // Show notification
      this.showUpdateNotification(author);
    }
  }
  
  async resolveConflict(remoteChanges) {
    console.warn('Conflict detected - resolving...');
    
    // Get latest from server
    const response = await fetch(`/api/documents/${this.documentId}`);
    const serverDoc = await response.json();
    
    // Check staleness severity
    const versionGap = serverDoc.version - this.serverVersion;
    
    if (versionGap > 5) {
      // Severe staleness - show manual resolution UI
      this.showConflictResolution(serverDoc.content);
    } else {
      // Mild staleness - try automatic merge
      const merged = this.mergeChanges(
        this.content,
        serverDoc.content,
        this.pendingChanges,
        remoteChanges
      );
      
      this.content = merged;
      this.serverVersion = serverDoc.version;
      this.localVersion = serverDoc.version + 1;
      
      this.renderContent(merged);
      this.showNotification('Changes merged automatically', 'success');
    }
  }
  
  mergeChanges(localContent, serverContent, localChanges, remoteChanges) {
    // Simplified 3-way merge
    // In production, use operational transform or CRDTs
    
    // For simplicity, we'll use a line-by-line merge
    const localLines = localContent.split('\n');
    const serverLines = serverContent.split('\n');
    const merged = [];
    
    const maxLines = Math.max(localLines.length, serverLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const localLine = localLines[i] || '';
      const serverLine = serverLines[i] || '';
      
      if (localLine === serverLine) {
        merged.push(localLine);
      } else {
        // Conflict on this line - use newer timestamp
        // In real app, show conflict markers
        merged.push(localLine); // Prefer local
      }
    }
    
    return merged.join('\n');
  }
  
  showConflictResolution(serverContent) {
    const modal = document.createElement('div');
    modal.className = 'conflict-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>⚠️ Document Conflict</h2>
        <p>The document has been edited by someone else. Choose how to resolve:</p>
        
        <div class="versions">
          <div class="version local">
            <h3>Your Version</h3>
            <pre>${this.content}</pre>
            <button onclick="editor.resolveKeepLocal()">Keep Mine</button>
          </div>
          
          <div class="version server">
            <h3>Server Version</h3>
            <pre>${serverContent}</pre>
            <button onclick="editor.resolveKeepServer()">Keep Server</button>
          </div>
        </div>
        
        <button onclick="editor.resolveMerge()">Merge Manually</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.conflictModal = modal;
  }
  
  resolveKeepLocal() {
    // Force push local version
    this.syncChanges(true);
    this.conflictModal.remove();
  }
  
  resolveKeepServer() {
    // Discard local changes
    this.loadDocument();
    this.conflictModal.remove();
  }
  
  resolveMerge() {
    // Show side-by-side editor for manual merge
    // Implementation details omitted for brevity
    this.conflictModal.remove();
  }
  
  async syncChanges(force = false) {
    if (this.pendingChanges.length === 0) return;
    
    try {
      const response = await fetch(`/api/documents/${this.documentId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: this.localVersion,
          baseVersion: this.serverVersion,
          changes: this.pendingChanges,
          force
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        this.serverVersion = result.version;
        this.pendingChanges = [];
        
        this.showNotification('Changes saved', 'success');
      } else if (response.status === 409) {
        // Conflict - server has newer version
        const serverDoc = await response.json();
        await this.handleRemoteUpdate({
          version: serverDoc.version,
          changes: serverDoc.changes,
          author: 'another user'
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      this.showNotification('Sync failed - will retry', 'error');
      
      // Retry after delay
      setTimeout(() => this.syncChanges(), 5000);
    }
  }
  
  startPeriodicSync() {
    // Sync every 10 seconds
    setInterval(() => {
      if (this.pendingChanges.length > 0) {
        this.syncChanges();
      }
    }, 10 * 1000);
  }
  
  diffContent(oldContent, newContent) {
    // Simple character-level diff
    // In production, use proper diff algorithm
    return {
      old: oldContent,
      new: newContent,
      timestamp: Date.now()
    };
  }
  
  applyChanges(changes) {
    // Apply remote changes to local content
    this.content = changes.new;
    this.renderContent(this.content);
  }
  
  renderContent(content) {
    const editor = document.getElementById('editor');
    editor.textContent = content;
  }
  
  updateVersionDisplay() {
    const versionInfo = document.getElementById('version-info');
    const isSynced = this.localVersion === this.serverVersion;
    
    versionInfo.innerHTML = `
      <span>Local: v${this.localVersion}</span>
      <span>Server: v${this.serverVersion}</span>
      <span class="${isSynced ? 'synced' : 'unsynced'}">
        ${isSynced ? '✅ Synced' : '🔄 Syncing...'}
      </span>
    `;
  }
  
  showUpdateNotification(author) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = `${author} made changes`;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
  
  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
}

// Initialize
const editor = new CollaborativeEditor('doc-123');
```

---

## Interview-Oriented Deep Dive

### Common Interview Questions

#### Q1: "What is stale data and how do you decide when to serve it vs fetching fresh data?"

**Complete Answer:**
```
Stale data is cached information that may no longer match the source of truth
(server). The decision to serve stale vs fresh depends on several factors:

1. Data Characteristics:
   - Criticality: Financial data → always fresh, blog posts → stale OK
   - Update frequency: Prices change often, profile rarely
   - User expectations: Search results → fresh, images → stale OK

2. Technical Factors:
   - Network availability: Offline → must use stale
   - Latency requirements: Instant UX → serve stale while revalidating
   - Server load: High traffic → prefer stale with background refresh

3. Decision Framework:

   Critical Data (prices, stock, balances):
   └─ Always fetch fresh, fallback to stale on error

   Semi-Critical (user profiles, settings):
   └─ Stale-while-revalidate (instant + background refresh)

   Non-Critical (static content, images):
   └─ Cache-first (serve stale until expiry)

4. Implementation Strategy:

   const getStalenessStrategy = (dataType) => {
     switch (dataType) {
       case 'financial':
         return 'always-fresh'; // No staleness tolerance
       
       case 'user-generated':
         return 'stale-while-revalidate'; // Balance UX + freshness
       
       case 'static-content':
         return 'cache-first'; // Aggressive caching
       
       case 'realtime':
         return 'network-only'; // Always live data
     }
   };

5. Metrics to Consider:
   - TTL (Time To Live): How long data is considered fresh
   - SWR Window: How long stale data is acceptable while revalidating
   - Revalidation triggers: Time, events, user actions
```

**Code Example:**
```javascript
class AdaptiveCache {
  async fetch(key, fetcher, options) {
    const cached = this.cache.get(key);
    const age = cached ? Date.now() - cached.timestamp : Infinity;
    
    // Decision tree
    if (options.critical) {
      // Critical data: Always fetch fresh
      return this.fetchFresh(key, fetcher);
    }
    
    if (cached && age < options.maxAge) {
      // Fresh cache: Return immediately
      return { data: cached.data, source: 'cache-fresh' };
    }
    
    if (cached && age < options.maxAge + options.staleWhileRevalidate) {
      // Stale but acceptable: Return + revalidate
      this.revalidate(key, fetcher); // Background
      return { data: cached.data, source: 'cache-stale' };
    }
    
    // Too stale or no cache: Fetch fresh
    return this.fetchFresh(key, fetcher);
  }
}
```

#### Q2: "Explain the Stale-While-Revalidate pattern and when to use it."

**Complete Answer:**
```
Stale-While-Revalidate (SWR) is a caching strategy that serves cached data
immediately while fetching fresh data in the background, providing instant
UX with eventual consistency.

How It Works:

Step 1: Check Cache
├─ Cache miss → Fetch from network
└─ Cache hit → Check age
    ├─ Fresh (age < max-age) → Return cached data
    ├─ Stale (age < max-age + swr) → Return cached + revalidate in background
    └─ Too stale (age > max-age + swr) → Fetch fresh, then return

Phases:

1. max-age: Data is considered fresh
   - Serve from cache instantly
   - No revalidation needed

2. stale-while-revalidate window: Data is stale but acceptable
   - Serve from cache instantly (user sees content immediately)
   - Fetch fresh data in background (update for next request)

3. Beyond SWR window: Data is too stale
   - Must fetch fresh before returning
   - User waits for network

HTTP Header Example:
Cache-Control: max-age=60, stale-while-revalidate=300

Means:
- Fresh for 60 seconds
- Serve stale for 300 more seconds while revalidating
- Total: 360 seconds (6 minutes) of usability

When to Use SWR:

✅ Good for:
- User-generated content (posts, comments)
- Product catalogs
- News feeds
- Dashboard data
- Profile information

❌ Not good for:
- Financial transactions
- Authentication tokens
- Real-time data (stock prices)
- Shopping cart contents

Benefits:
1. Instant UX: Users see content immediately
2. Eventual consistency: Data updates in background
3. Reduced perceived latency: No loading states
4. Network efficiency: Fewer blocking requests

Drawbacks:
1. Users may see stale data briefly
2. More complex cache invalidation
3. Potential for showing outdated information
```

**Complete Implementation:**
```javascript
class SWRCache {
  constructor(maxAge = 60000, swrWindow = 300000) {
    this.cache = new Map();
    this.inflight = new Map();
    this.maxAge = maxAge;
    this.swrWindow = swrWindow;
  }
  
  async fetch(key, fetcher) {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached) {
      const age = now - cached.timestamp;
      
      // Phase 1: Fresh (0 to max-age)
      if (age < this.maxAge) {
        console.log(`[SWR] Cache fresh (age: ${age}ms)`);
        return {
          data: cached.data,
          source: 'cache-fresh',
          age
        };
      }
      
      // Phase 2: Stale but acceptable (max-age to max-age + swr)
      if (age < this.maxAge + this.swrWindow) {
        console.log(`[SWR] Cache stale, revalidating (age: ${age}ms)`);
        
        // Return stale immediately
        const result = {
          data: cached.data,
          source: 'cache-stale',
          age,
          revalidating: true
        };
        
        // Revalidate in background (don't await!)
        this.revalidate(key, fetcher).catch(err => {
          console.error('[SWR] Revalidation failed:', err);
        });
        
        return result;
      }
      
      // Phase 3: Too stale
      console.log(`[SWR] Cache too stale (age: ${age}ms), fetching fresh`);
    }
    
    // No cache or too stale: Fetch fresh
    return this.revalidate(key, fetcher);
  }
  
  async revalidate(key, fetcher) {
    // Deduplicate concurrent requests
    if (this.inflight.has(key)) {
      console.log('[SWR] Deduplicating request');
      return this.inflight.get(key);
    }
    
    const promise = fetcher()
      .then(data => {
        // Update cache
        this.cache.set(key, {
          data,
          timestamp: Date.now()
        });
        
        console.log('[SWR] Cache updated');
        
        return {
          data,
          source: 'network',
          age: 0
        };
      })
      .catch(error => {
        // On error, return stale if available
        const cached = this.cache.get(key);
        if (cached) {
          console.log('[SWR] Network failed, returning stale');
          return {
            data: cached.data,
            source: 'cache-error',
            age: Date.now() - cached.timestamp,
            error
          };
        }
        throw error;
      })
      .finally(() => {
        this.inflight.delete(key);
      });
    
    this.inflight.set(key, promise);
    return promise;
  }
}

// Usage
const cache = new SWRCache(
  60 * 1000,      // Fresh for 1 minute
  5 * 60 * 1000   // Stale-while-revalidate for 5 minutes
);

// First request (t=0s): Network fetch
await cache.fetch('user:123', () => fetchUser(123));
// → source: 'network'

// Second request (t=30s): Cache fresh
await cache.fetch('user:123', () => fetchUser(123));
// → source: 'cache-fresh'

// Third request (t=90s): Stale, revalidate in background
await cache.fetch('user:123', () => fetchUser(123));
// → source: 'cache-stale' (returns immediately)
// Background fetch happens

// Fourth request (t=400s): Too stale, must fetch
await cache.fetch('user:123', () => fetchUser(123));
// → source: 'network' (waits for fetch)
```

#### Q3: "How do you handle stale data in a collaborative application where multiple users can edit the same resource?"

**Complete Answer:**
```
Collaborative apps require sophisticated stale data handling because local
changes can conflict with remote changes. Key strategies:

1. Optimistic Updates with Rollback
   - Apply changes locally immediately (instant UX)
   - Send to server in background
   - Rollback if server rejects

2. Version Control
   - Track local and server versions
   - Detect conflicts when versions diverge
   - Resolve conflicts automatically or manually

3. Operational Transformation (OT)
   - Transform operations so they can be applied in any order
   - Used by Google Docs, Figma
   - Complex but powerful

4. CRDTs (Conflict-free Replicated Data Types)
   - Data structures that merge automatically without conflicts
   - Examples: G-Set, LWW-Element-Set
   - Simpler than OT but less flexible

5. Last-Write-Wins (LWW)
   - Simplest: Timestamp-based conflict resolution
   - Potential data loss
   - Good for non-critical data

Implementation Strategy:

Step 1: Detect Staleness
- Version numbers: local vs server version
- Timestamps: local modification time vs server time
- ETags: Hash-based change detection

Step 2: Classify Conflicts
- No conflict: Local and server versions match
- Resolvable: Changes to different fields
- Conflict: Changes to same field

Step 3: Resolve
- Automatic: Merge non-conflicting changes
- Manual: Show UI for user to choose
- Policy-based: Business rules determine winner
```

**Complete Implementation:**
```javascript
class CollaborativeCache {
  constructor() {
    this.cache = new Map();
    this.localVersions = new Map();
    this.serverVersions = new Map();
    this.pendingChanges = new Map();
  }
  
  async fetch(key) {
    const cached = this.cache.get(key);
    const localVersion = this.localVersions.get(key) || 0;
    const serverVersion = this.serverVersions.get(key) || 0;
    
    // Check if local is stale
    if (localVersion < serverVersion) {
      console.log('[Collab] Local version stale, fetching...');
      return this.fetchFromServer(key);
    }
    
    if (cached) {
      return {
        data: cached,
        localVersion,
        serverVersion,
        isStale: localVersion < serverVersion
      };
    }
    
    return this.fetchFromServer(key);
  }
  
  async update(key, updateFn, optimistic = true) {
    const current = this.cache.get(key);
    const localVersion = this.localVersions.get(key) || 0;
    const serverVersion = this.serverVersions.get(key) || 0;
    
    // Optimistic update
    if (optimistic) {
      const optimisticData = updateFn(current);
      this.cache.set(key, optimisticData);
      this.localVersions.set(key, localVersion + 1);
      
      // Queue for sync
      this.pendingChanges.set(key, {
        data: optimisticData,
        baseVersion: serverVersion,
        localVersion: localVersion + 1
      });
      
      // Render immediately
      this.notifyListeners(key, optimisticData);
    }
    
    try {
      // Send to server
      const response = await fetch(`/api/data/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: this.cache.get(key),
          baseVersion: serverVersion
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update versions
        this.serverVersions.set(key, result.version);
        this.localVersions.set(key, result.version);
        
        // Clear pending
        this.pendingChanges.delete(key);
        
        return result;
      } else if (response.status === 409) {
        // Conflict!
        const serverData = await response.json();
        return this.resolveConflict(key, serverData);
      }
    } catch (error) {
      // Rollback optimistic update
      if (optimistic && current) {
        this.cache.set(key, current);
        this.localVersions.set(key, localVersion);
        this.notifyListeners(key, current);
      }
      
      throw error;
    }
  }
  
  async resolveConflict(key, serverData) {
    const localData = this.cache.get(key);
    const pending = this.pendingChanges.get(key);
    
    console.warn('[Collab] Conflict detected!');
    
    // Try automatic merge
    const merged = this.autoMerge(localData, serverData);
    
    if (merged.success) {
      // Merge successful
      this.cache.set(key, merged.data);
      this.localVersions.set(key, serverData.version + 1);
      this.serverVersions.set(key, serverData.version);
      
      // Send merged version
      return this.update(key, () => merged.data, false);
    } else {
      // Manual resolution needed
      return this.manualResolve(key, localData, serverData);
    }
  }
  
  autoMerge(local, server) {
    // Field-level merge
    const merged = { ...server };
    let conflicts = 0;
    
    for (const [key, localValue] of Object.entries(local)) {
      const serverValue = server[key];
      
      if (localValue === serverValue) {
        // No conflict
        continue;
      }
      
      // Simple heuristic: prefer non-empty values
      if (!serverValue && localValue) {
        merged[key] = localValue;
      } else if (typeof localValue === 'string' && typeof serverValue === 'string') {
        // String conflict - can't auto-merge
        conflicts++;
      }
    }
    
    return {
      success: conflicts === 0,
      data: merged,
      conflicts
    };
  }
  
  async manualResolve(key, local, server) {
    // Show UI for user to resolve
    return new Promise((resolve) => {
      this.showConflictModal(key, local, server, (resolved) => {
        this.cache.set(key, resolved);
        resolve(this.update(key, () => resolved, false));
      });
    });
  }
  
  async fetchFromServer(key) {
    const response = await fetch(`/api/data/${key}`);
    const result = await response.json();
    
    this.cache.set(key, result.data);
    this.serverVersions.set(key, result.version);
    this.localVersions.set(key, result.version);
    
    return {
      data: result.data,
      localVersion: result.version,
      serverVersion: result.version,
      isStale: false
    };
  }
  
  notifyListeners(key, data) {
    // Emit event for UI updates
    window.dispatchEvent(new CustomEvent('data-updated', {
      detail: { key, data }
    }));
  }
  
  showConflictModal(key, local, server, onResolve) {
    // Implementation details...
  }
}
```

#### Q4: "What are the trade-offs between different cache invalidation strategies for handling stale data?"

**Complete Answer:**
```
Cache invalidation is notoriously hard. Different strategies have different
trade-offs:

1. Time-Based (TTL)
   ✅ Pros:
   - Simple to implement
   - Predictable behavior
   - No dependencies on external systems
   
   ❌ Cons:
   - May serve stale data even when fresh is available
   - May fetch unnecessarily when data hasn't changed
   - Arbitrary expiration times
   
   Best for: Static content, rarely changing data

2. Event-Based Invalidation
   ✅ Pros:
   - Invalidates exactly when data changes
   - No unnecessary fetches
   - Precise control
   
   ❌ Cons:
   - Requires event system (WebSocket, SSE, polling)
   - Complex infrastructure
   - Potential missed events
   
   Best for: Real-time apps, collaborative tools

3. Manual Invalidation
   ✅ Pros:
   - Full control over when to invalidate
   - Can invalidate related data together
   - Deterministic
   
   ❌ Cons:
   - Easy to forget to invalidate
   - Requires careful management
   - Error-prone
   
   Best for: Explicit user actions (save, delete)

4. Dependency-Based Invalidation
   ✅ Pros:
   - Cascading invalidation
   - Maintains consistency
   - Automatic propagation
   
   ❌ Cons:
   - Complex dependency tracking
   - Can over-invalidate
   - Performance overhead
   
   Best for: Complex data relationships

5. Stale-While-Revalidate (SWR)
   ✅ Pros:
   - Best UX (instant + fresh)
   - Balance between performance and freshness
   - Graceful degradation
   
   ❌ Cons:
   - Users may see brief stale data
   - More complex implementation
   - Extra network requests
   
   Best for: Most web applications

6. Conditional Requests (ETag/Last-Modified)
   ✅ Pros:
   - Server tells us if data changed
   - Efficient (304 Not Modified)
   - Standard HTTP mechanism
   
   ❌ Cons:
   - Still requires network request
   - Server must support ETags
   - Not truly instant
   
   Best for: API responses, CDN content

Comparison Table:

| Strategy      | Freshness | Performance | Complexity | Use Case           |
|---------------|-----------|-------------|------------|--------------------|
| TTL           | Low       | High        | Low        | Static content     |
| Event-based   | High      | High        | High       | Real-time apps     |
| Manual        | High      | Medium      | Medium     | User actions       |
| Dependency    | Medium    | Medium      | High       | Related data       |
| SWR           | Medium    | High        | Medium     | General purpose    |
| Conditional   | High      | Medium      | Low        | API responses      |

Choosing a Strategy:

Decision Tree:
├─ Need instant UX?
│  ├─ Yes → SWR or TTL
│  └─ No → Conditional requests
│
├─ Real-time requirements?
│  ├─ Yes → Event-based invalidation
│  └─ No → TTL or SWR
│
├─ Complex data relationships?
│  ├─ Yes → Dependency-based
│  └─ No → TTL or manual
│
└─ Critical freshness?
   ├─ Yes → Event-based or conditional
   └─ No → SWR or TTL
```

**Hybrid Implementation:**
```javascript
class HybridCacheInvalidation {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
    this.dependencies = new Map();
    this.ws = null;
    
    this.setupEventBasedInvalidation();
  }
  
  // Strategy 1: TTL
  setWithTTL(key, value, ttl) {
    this.cache.set(key, value);
    this.ttls.set(key, {
      expiry: Date.now() + ttl,
      ttl
    });
  }
  
  // Strategy 2: Event-based
  setupEventBasedInvalidation() {
    this.ws = new WebSocket('wss://api.app.com/invalidation');
    
    this.ws.onmessage = (event) => {
      const { type, keys } = JSON.parse(event.data);
      
      if (type === 'invalidate') {
        keys.forEach(key => this.invalidate(key));
      }
    };
  }
  
  // Strategy 3: Manual
  invalidate(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
    
    // Cascade to dependents
    this.invalidateDependents(key);
  }
  
  // Strategy 4: Dependency-based
  setWithDependencies(key, value, deps) {
    this.cache.set(key, value);
    this.dependencies.set(key, deps);
  }
  
  invalidateDependents(key) {
    this.dependencies.forEach((deps, depKey) => {
      if (deps.includes(key)) {
        this.invalidate(depKey);
      }
    });
  }
  
  // Strategy 5: SWR
  async fetchWithSWR(key, fetcher, maxAge, swrWindow) {
    const cached = this.cache.get(key);
    const ttl = this.ttls.get(key);
    
    if (cached && ttl) {
      const age = Date.now() - (ttl.expiry - ttl.ttl);
      
      if (age < maxAge) {
        return { data: cached, source: 'cache-fresh' };
      }
      
      if (age < maxAge + swrWindow) {
        this.revalidate(key, fetcher, ttl.ttl);
        return { data: cached, source: 'cache-stale' };
      }
    }
    
    return this.revalidate(key, fetcher, maxAge);
  }
  
  async revalidate(key, fetcher, ttl) {
    const data = await fetcher();
    this.setWithTTL(key, data, ttl);
    return { data, source: 'network' };
  }
  
  // Strategy 6: Conditional requests
  async fetchWithETag(key, url) {
    const cached = this.cache.get(key);
    const headers = {};
    
    if (cached && cached.etag) {
      headers['If-None-Match'] = cached.etag;
    }
    
    const response = await fetch(url, { headers });
    
    if (response.status === 304) {
      // Not modified - use cache
      return { data: cached.data, source: 'cache-revalidated' };
    }
    
    const data = await response.json();
    const etag = response.headers.get('etag');
    
    this.cache.set(key, { data, etag });
    return { data, source: 'network' };
  }
}
```

---

## Why This Matters & How to Apply

### Core Principles

1. **Instant UX > Perfect Data** - Show stale data immediately, update later
2. **Progressive Enhancement** - Serve cache, improve with fresh data
3. **Smart Invalidation** - Invalidate when necessary, not arbitrarily
4. **Graceful Degradation** - Fallback to stale on network errors
5. **User Awareness** - Show indicators when data is stale/updating

### Mental Model

```
Stale Data = Old Milk in Your Fridge
────────────────────────────────────────────

Fresh (just bought):
└─ Use immediately, tastes best

Approaching expiration (near date):
└─ Still usable, maybe check for fresher

Expired but smell OK:
└─ Use cautiously (stale-while-revalidate)
└─ Buy fresh for next time

Clearly spoiled:
└─ Must replace before using
```

### Decision Framework

**When to serve stale data?**
```
Is data critical? (financial, auth, real-time)
├─ Yes → Always fetch fresh ✅
│
└─ No → Is user on slow/offline connection?
    ├─ Yes → Serve stale, revalidate later ✅
    │
    └─ No → How old is cache?
        ├─ < max-age → Serve from cache ✅
        ├─ < max-age + SWR → Serve stale + revalidate ✅
        └─ > SWR window → Fetch fresh ✅
```

### Production Checklist

**Before Launch:**
- [ ] Define TTLs for each data type
- [ ] Implement SWR for non-critical data
- [ ] Add staleness indicators in UI
- [ ] Handle offline gracefully
- [ ] Implement optimistic updates for writes
- [ ] Add conflict resolution for collaborative features
- [ ] Set up event-based invalidation for real-time data
- [ ] Test with slow connections (throttling)
- [ ] Monitor cache hit rates
- [ ] Plan cache warming strategy

**Monitoring:**
```javascript
// Track cache performance
const cacheMetrics = {
  hits: 0,
  misses: 0,
  staleServed: 0,
  revalidations: 0
};

// Log metrics
analytics.track('cache-performance', {
  hitRate: cacheMetrics.hits / (cacheMetrics.hits + cacheMetrics.misses),
  staleRate: cacheMetrics.staleServed / cacheMetrics.hits,
  avgAge: averageCacheAge
});
```

### Common Mistakes

❌ **Mistake 1: Same TTL for all data**
```javascript
// Wrong: Everything expires at same time
cache.set('user', data, 300000);
cache.set('price', data, 300000);
cache.set('image', data, 300000);
```

✅ **Fix: Different TTLs based on data characteristics**
```javascript
// Right: TTL based on update frequency
cache.set('user', data, 5 * 60 * 1000);     // 5 min (changes rarely)
cache.set('price', data, 30 * 1000);        // 30 sec (changes often)
cache.set('image', data, 24 * 60 * 60 * 1000); // 24 hours (static)
```

❌ **Mistake 2: No staleness indicators**
```javascript
// Wrong: User doesn't know data is stale
return cached.data;
```

✅ **Fix: Show update status**
```javascript
// Right: Inform user
return {
  data: cached.data,
  isStale: true,
  updatedAt: cached.timestamp
};

// In UI:
{isStale && <span>🔄 Updating...</span>}
```

❌ **Mistake 3: No error fallback**
```javascript
// Wrong: Fail completely on network error
try {
  return await fetch(url);
} catch {
  throw error; // User sees error screen
}
```

✅ **Fix: Fallback to stale data**
```javascript
// Right: Serve stale on error
try {
  return await fetch(url);
} catch (error) {
  const cached = cache.get(key);
  if (cached) {
    return {
      data: cached.data,
      source: 'cache-error',
      warning: 'Using cached data, update failed'
    };
  }
  throw error;
}
```

### Performance Impact

**Metrics:**
- **Perceived Load Time**: 70-90% faster with stale-while-revalidate
- **Cache Hit Rate**: 60-80% typical for well-tuned caches
- **Network Requests**: 40-60% reduction with proper caching
- **User Satisfaction**: 25-40% improvement with instant UX

**Business Impact:**
- Instant loading: +50% engagement
- Offline support: +30% user retention
- Reduced server load: -40% infrastructure cost
- Better mobile experience: +35% mobile conversions

---

## Summary & Key Takeaways

### Critical Concepts

1. **Stale Data** = Cached data that may not match server
2. **Stale-While-Revalidate** = Serve stale + refresh in background
3. **TTL** = Time-based expiration for cache freshness
4. **Cache Invalidation** = Strategy to remove/update stale data
5. **Optimistic Updates** = Show changes immediately, sync later
6. **Conflict Resolution** = Handle concurrent edits in collaborative apps
7. **Progressive Enhancement** = Use cache as baseline, improve with fresh data

### Quick Reference

| Pattern | When to Use | Trade-off |
|---------|-------------|-----------|
| TTL | Static content | Simple but arbitrary expiry |
| SWR | Most web apps | Instant UX, may show stale briefly |
| Event-based | Real-time apps | Precise but complex infrastructure |
| Conditional | API responses | Standard but not instant |
| Optimistic | User actions | Great UX but needs rollback |

### Interview Success Formula

1. **Define stale data** - Cached data that doesn't match server
2. **Explain SWR pattern** - Serve cached + revalidate in background
3. **Show implementation** - Cache with TTL + background refresh
4. **Discuss trade-offs** - Performance vs freshness
5. **Handle conflicts** - Version control, merge strategies
6. **Invalidation strategies** - TTL, event-based, manual, dependency
7. **Real examples** - Social feed, e-commerce, collaborative editor

### One-Sentence Summary

> Handling stale data means balancing instant user experience with data freshness by serving cached content immediately while intelligently revalidating in the background using strategies like stale-while-revalidate, optimistic updates, and smart cache invalidation.

---

**Related Topics:**
- [92. HTTP Caching](../Module%209.1%20—%20Caching%20Layers/92_HTTP_Caching.md)
- [97. Cache Invalidation](./97_Cache_Invalidation.md)
- [98. Offline-First Architecture](./98_Offline_First_Architecture.md)
- [95. IndexedDB](../Module%209.2%20—%20Client%20Persistence/95_IndexedDB.md)
