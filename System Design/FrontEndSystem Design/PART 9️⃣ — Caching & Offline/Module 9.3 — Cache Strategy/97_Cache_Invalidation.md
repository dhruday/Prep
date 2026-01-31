# 75. Cache Invalidation Strategies

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Cache invalidation** is the process of removing or updating cached data when it becomes stale, outdated, or incorrect. As the famous saying goes: *"There are only two hard things in Computer Science: cache invalidation and naming things"* (Phil Karlton). Cache invalidation is notoriously difficult because you must balance **performance** (caching everything aggressively) with **correctness** (showing users fresh data).

### What it is:

Cache invalidation is a set of strategies and mechanisms for ensuring cached data stays synchronized with the source of truth. When underlying data changes, caches must be updated or cleared to prevent users from seeing stale information.

**The fundamental problem:**
```javascript
// User A sees cached data
const product = cache.get('product-123'); // { price: $99 }

// Meanwhile, product price changes in database
database.update('product-123', { price: $79 }); // NOW $79

// User B sees cached data
const product = cache.get('product-123'); // Still { price: $99 } ❌ STALE!

// Problem: Users see outdated prices until cache expires
// Solution: Invalidate cache when price changes
```

### Why it exists:

**Problems it solves:**
1. **Stale data**: Users see outdated information (wrong prices, deleted items)
2. **Cache coherence**: Multiple caches (browser, CDN, server) get out of sync
3. **Resource waste**: Storing data that's no longer valid
4. **User confusion**: Different users see different versions of the same data
5. **Business risk**: Showing incorrect prices, inventory, or critical information

**Without cache invalidation:**
```
E-commerce scenario:

09:00 AM - Product cached at $99
10:00 AM - Price updated to $79 in database
10:01 AM - User sees cached price $99, adds to cart
10:02 AM - Checkout shows $79 (from database)
10:03 AM - User confused: "Why did price change?"

Result: Cart abandonment, support tickets, lost trust
```

**With cache invalidation:**
```
E-commerce scenario:

09:00 AM - Product cached at $99
10:00 AM - Price updated to $79 in database
10:00 AM - Cache invalidated immediately
10:01 AM - User requests product
10:02 AM - Cache miss, fetches $79 from database
10:03 AM - User sees correct price $79 ✓

Result: Consistent experience, no confusion
```

### Core Strategies:

**1. Time-Based Expiration (TTL)**
```javascript
// Simplest: Set expiration time
cache.set('user', userData, { ttl: 3600 }); // 1 hour
// After 1 hour, cache automatically invalidates
// Pros: Simple, predictable
// Cons: May serve stale data until expiration
```

**2. Event-Based Invalidation**
```javascript
// Invalidate when data changes
database.on('product.updated', (productId) => {
  cache.delete(`product-${productId}`);
});
// Pros: Immediate consistency
// Cons: Requires event system, complex coordination
```

**3. Version-Based Invalidation**
```javascript
// Use version numbers in cache keys
const cacheKey = `product-123-v${version}`;
// When data changes, increment version
// Old cache entries become unreachable
// Pros: No explicit deletion needed
// Cons: Accumulated garbage
```

**4. Manual Invalidation**
```javascript
// Explicit admin action
admin.clearCache('products'); // Clear entire category
// Pros: Full control, useful for emergency fixes
// Cons: Requires manual intervention
```

### When and where it's used:

**Frontend caching layers requiring invalidation:**
- **Browser cache**: HTTP headers (Cache-Control, ETag)
- **Service Worker cache**: Programmatic control via CacheStorage API
- **LocalStorage/SessionStorage**: Manual invalidation or TTL patterns
- **IndexedDB**: Version-based or explicit deletion
- **In-memory cache**: React Query, SWR (automatic revalidation)
- **CDN cache**: Purge APIs, cache tags

**Scenarios requiring invalidation:**
- **Data updates**: User edits profile → invalidate user cache
- **Deletions**: Product removed → invalidate product cache
- **Permissions changes**: User role updated → invalidate auth cache
- **Content publishing**: New article → invalidate article list cache
- **Configuration changes**: Feature flag toggled → invalidate config cache
- **Urgent fixes**: Bug in cached response → emergency purge

### Role in large-scale applications:

In production systems, cache invalidation is multi-layered:

```
┌─────────────────────────────────────────────────────────┐
│ User Browser                                            │
│  ├─ Browser Cache (Cache-Control: max-age)             │
│  ├─ Service Worker (manual invalidation)               │
│  └─ React Query (staleTime, refetchOnWindowFocus)      │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │ Invalidation signals
                        ▼
┌─────────────────────────────────────────────────────────┐
│ CDN Layer (Cloudflare, Fastly)                         │
│  ├─ Edge cache (s-maxage, cache tags)                  │
│  ├─ Purge API (invalidate by URL, tag, or wildcard)    │
│  └─ Stale-while-revalidate (serve stale + background)  │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │ Invalidation triggers
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Application Server                                      │
│  ├─ Redis cache (DELETE key on update)                 │
│  ├─ Event bus (publish cache.invalidate events)        │
│  └─ Database triggers (ON UPDATE → invalidate)         │
└─────────────────────────────────────────────────────────┘
```

**Real-world impact:**
```
Without proper invalidation (time-based only):

Problem: Product price updated, but cache has 1-hour TTL
- 60 minutes of users seeing wrong price
- Average 1,200 users/hour affected
- 15% add wrong-priced item to cart
- Support tickets: 180/hour
- Lost revenue: Price increase not reflected
- Customer complaints: "Bait and switch!"

With event-based invalidation:

Solution: Price update triggers immediate cache purge
- 0 seconds of stale data (instant invalidation)
- 0 users see wrong price
- 0 support tickets related to pricing
- Revenue: Correct prices immediately reflected
- Customer trust: Consistent experience

Business impact:
- Support ticket reduction: 180 tickets/hour → 0
- Customer satisfaction: +40% (no price confusion)
- Revenue accuracy: 100% (no missed price changes)
- Cache hit ratio: Maintained at 95% (only invalidate changed items)
```

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### The Cache Invalidation Problem Space

**Phil Karlton's famous quote exists for a reason:**

Cache invalidation is hard because:
1. **Distributed state**: Multiple caches across browsers, CDNs, servers
2. **Timing uncertainty**: Network delays, clock skew, race conditions
3. **Granularity trade-offs**: Invalidate too much (performance loss) or too little (stale data)
4. **Dependency chains**: Invalidating A may require invalidating B, C, D...
5. **Consistency models**: Strong vs eventual consistency trade-offs

### Core Invalidation Strategies (Deep Analysis)

#### 1. Time-Based Expiration (TTL)

**How it works:**
```javascript
// Set expiration timestamp
const item = {
  value: data,
  expiresAt: Date.now() + 3600000 // 1 hour from now
};

cache.set('key', item);

// On retrieval, check expiration
const cached = cache.get('key');
if (cached && cached.expiresAt > Date.now()) {
  return cached.value; // Still valid
} else {
  cache.delete('key'); // Expired, remove
  return null;
}
```

**Advantages:**
- **Simple**: No coordination needed, works offline
- **Predictable**: Known maximum staleness (TTL duration)
- **Self-cleaning**: Expired entries automatically invalid
- **Works everywhere**: Supported by all cache layers

**Disadvantages:**
- **Always stale**: Data may be outdated entire TTL period
- **Over-fetching**: Must refetch even if unchanged
- **Thundering herd**: Many clients refetch simultaneously when TTL expires

**TTL selection guidance:**
```javascript
// Different data types need different TTLs

// Static assets (versioned URLs): Long TTL
cache.set('app.v123.js', code, { ttl: 31536000 }); // 1 year
// Reason: Version in URL, never changes

// User profile: Medium TTL
cache.set('user-123', profile, { ttl: 300 }); // 5 minutes
// Reason: Changes occasionally, 5-min staleness acceptable

// Product inventory: Short TTL
cache.set('inventory-456', count, { ttl: 10 }); // 10 seconds
// Reason: Changes frequently, must be fresh

// Stock prices: Very short TTL
cache.set('stock-AAPL', price, { ttl: 1 }); // 1 second
// Reason: Real-time data, stale = useless

// User session: No TTL (manual invalidation)
cache.set('session-abc', session); // No expiration
// Reason: Explicitly logout to invalidate
```

**Adaptive TTL pattern:**
```javascript
class AdaptiveTTLCache {
  constructor() {
    this.cache = new Map();
    this.updateFrequency = new Map(); // Track update rates
  }
  
  set(key, value) {
    // Track update timestamp
    const now = Date.now();
    const lastUpdate = this.updateFrequency.get(key)?.lastUpdate || 0;
    const timeSinceUpdate = now - lastUpdate;
    
    // Calculate average update interval
    const history = this.updateFrequency.get(key) || { updates: [], lastUpdate: 0 };
    history.updates.push(timeSinceUpdate);
    if (history.updates.length > 10) history.updates.shift(); // Keep last 10
    history.lastUpdate = now;
    this.updateFrequency.set(key, history);
    
    // Calculate adaptive TTL
    const avgInterval = history.updates.reduce((a, b) => a + b, 0) / history.updates.length;
    const ttl = Math.max(10, avgInterval * 0.5); // 50% of avg update interval, min 10s
    
    this.cache.set(key, {
      value,
      expiresAt: now + ttl
    });
    
    console.log(`Set ${key} with adaptive TTL: ${(ttl / 1000).toFixed(1)}s`);
  }
  
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
}

// Usage: Frequently updated keys get shorter TTLs automatically
const cache = new AdaptiveTTLCache();

// Key updated every 5 minutes → TTL becomes ~2.5 minutes
// Key updated every 1 hour → TTL becomes ~30 minutes
```

#### 2. Event-Based Invalidation

**How it works:**
```javascript
// Server publishes events when data changes
eventBus.publish('product.updated', { productId: 123 });

// Cache subscribers react
eventBus.subscribe('product.updated', (event) => {
  cache.delete(`product-${event.productId}`);
  
  // Also invalidate dependent caches
  cache.delete('product-list'); // Product appears in list
  cache.delete(`category-${event.categoryId}`); // Category cache
});
```

**Advantages:**
- **Immediate consistency**: Cache invalidated instantly when data changes
- **Precise**: Only affected items invalidated
- **Event-driven**: Decouples invalidation from application logic

**Disadvantages:**
- **Complex**: Requires event infrastructure (Redis Pub/Sub, Kafka, etc.)
- **Distributed coordination**: Events must reach all cache instances
- **Event ordering**: Out-of-order events cause inconsistencies
- **Network partitions**: Missed events = stale cache

**Real-world event-based system:**
```javascript
// server/cacheInvalidator.js

class CacheInvalidationService {
  constructor(eventBus, cacheClients) {
    this.eventBus = eventBus;
    this.cacheClients = cacheClients; // Array of cache instances (Redis, CDN, etc.)
    
    this.setupListeners();
  }
  
  setupListeners() {
    // Product events
    this.eventBus.on('product.created', (product) => {
      this.invalidatePatterns([
        'product-list*',
        `category-${product.categoryId}*`,
        'home-featured*'
      ]);
    });
    
    this.eventBus.on('product.updated', (product) => {
      this.invalidatePatterns([
        `product-${product.id}`,
        `product-${product.id}*`, // Any variant
        'product-list*',
        `category-${product.categoryId}*`
      ]);
    });
    
    this.eventBus.on('product.deleted', (product) => {
      this.invalidatePatterns([
        `product-${product.id}*`,
        'product-list*',
        `category-${product.categoryId}*`
      ]);
    });
    
    // User events
    this.eventBus.on('user.updated', (user) => {
      this.invalidatePatterns([
        `user-${user.id}`,
        `user-${user.id}-profile`,
        `user-${user.id}-orders`
      ]);
    });
    
    // Order events
    this.eventBus.on('order.placed', (order) => {
      this.invalidatePatterns([
        `user-${order.userId}-orders`,
        `product-${order.productId}-inventory`
      ]);
    });
  }
  
  async invalidatePatterns(patterns) {
    const invalidationPromises = [];
    
    for (const client of this.cacheClients) {
      for (const pattern of patterns) {
        invalidationPromises.push(
          client.delete(pattern).catch(err => {
            console.error(`Failed to invalidate ${pattern}:`, err);
          })
        );
      }
    }
    
    await Promise.allSettled(invalidationPromises);
    console.log(`Invalidated patterns: ${patterns.join(', ')}`);
  }
  
  async purgeAll() {
    // Emergency: Clear all caches
    console.warn('PURGING ALL CACHES');
    
    for (const client of this.cacheClients) {
      await client.flush();
    }
  }
}

// Usage
const invalidator = new CacheInvalidationService(eventBus, [
  redisCache,
  cdnCache,
  localCache
]);

// When data changes, emit event
database.updateProduct(123, { price: 79 });
eventBus.emit('product.updated', { id: 123, categoryId: 5 });
// Cache automatically invalidated across all layers
```

#### 3. Version-Based Invalidation

**How it works:**
```javascript
// Include version in cache key
let version = 1;

cache.set(`product-123-v${version}`, data);

// When data changes, increment version
version = 2;
cache.set(`product-123-v${version}`, newData);

// Old key (`product-123-v1`) still exists but unreachable
// Eventually evicted by LRU/TTL
```

**Advantages:**
- **No explicit deletion**: Just stop using old keys
- **Safe**: Can't accidentally delete wrong version
- **Rollback friendly**: Keep old versions temporarily
- **Concurrent writes**: Different versions don't conflict

**Disadvantages:**
- **Storage waste**: Old versions accumulate
- **Requires cleanup**: Need separate garbage collection
- **Version management**: Must track current version
- **Key namespace pollution**: Many unused keys

**Content-addressable caching (hash-based versioning):**
```javascript
// Use content hash as version
const crypto = require('crypto');

function generateCacheKey(type, id, data) {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 8);
  
  return `${type}-${id}-${hash}`;
}

// Usage
const product = { id: 123, name: 'Widget', price: 99 };
const cacheKey = generateCacheKey('product', 123, product);
// 'product-123-a3f2b4e1'

cache.set(cacheKey, product);

// When product changes, hash changes automatically
const updatedProduct = { id: 123, name: 'Widget', price: 79 };
const newCacheKey = generateCacheKey('product', 123, updatedProduct);
// 'product-123-7c9d8e2f' (different hash!)

cache.set(newCacheKey, updatedProduct);

// Application requests with latest data hash
// Old cached versions become unreachable
```

**Git-style versioning for configuration:**
```javascript
// Config versioning system
class VersionedConfigCache {
  constructor() {
    this.cache = new Map();
    this.versions = new Map(); // Track version history
    this.currentVersion = new Map(); // Current version per key
  }
  
  set(key, value) {
    const previousVersion = this.currentVersion.get(key) || 0;
    const newVersion = previousVersion + 1;
    
    const versionedKey = `${key}@v${newVersion}`;
    
    this.cache.set(versionedKey, {
      value,
      version: newVersion,
      timestamp: Date.now(),
      previousVersion
    });
    
    this.currentVersion.set(key, newVersion);
    
    // Track version history
    const history = this.versions.get(key) || [];
    history.push(newVersion);
    this.versions.set(key, history);
    
    console.log(`Set ${key} version ${newVersion}`);
  }
  
  get(key, version = null) {
    // Get specific version or current
    const targetVersion = version || this.currentVersion.get(key);
    
    if (!targetVersion) return null;
    
    const versionedKey = `${key}@v${targetVersion}`;
    const item = this.cache.get(versionedKey);
    
    return item ? item.value : null;
  }
  
  getHistory(key) {
    const versions = this.versions.get(key) || [];
    
    return versions.map(v => ({
      version: v,
      value: this.get(key, v),
      metadata: this.cache.get(`${key}@v${v}`)
    }));
  }
  
  rollback(key) {
    const currentVersion = this.currentVersion.get(key);
    
    if (!currentVersion || currentVersion <= 1) {
      console.error('Cannot rollback: no previous version');
      return false;
    }
    
    const previousVersion = currentVersion - 1;
    this.currentVersion.set(key, previousVersion);
    
    console.log(`Rolled back ${key} from v${currentVersion} to v${previousVersion}`);
    return true;
  }
  
  cleanup(key, keepLast = 3) {
    // Remove old versions, keeping last N
    const versions = this.versions.get(key) || [];
    
    if (versions.length <= keepLast) return;
    
    const toRemove = versions.slice(0, -keepLast);
    
    for (const v of toRemove) {
      this.cache.delete(`${key}@v${v}`);
    }
    
    this.versions.set(key, versions.slice(-keepLast));
    
    console.log(`Cleaned up ${toRemove.length} old versions of ${key}`);
  }
}

// Usage
const config = new VersionedConfigCache();

config.set('apiEndpoint', 'https://api.v1.example.com');
config.set('apiEndpoint', 'https://api.v2.example.com'); // v2
config.set('apiEndpoint', 'https://api.v3.example.com'); // v3

console.log(config.get('apiEndpoint')); // v3
console.log(config.get('apiEndpoint', 1)); // v1 (specific version)

config.rollback('apiEndpoint'); // Back to v2
console.log(config.get('apiEndpoint')); // v2

config.cleanup('apiEndpoint', 2); // Keep only last 2 versions
```

#### 4. Dependency Tracking and Cascade Invalidation

**The problem:**
```javascript
// These caches have dependencies:
cache.set('product-123', productData);           // Base
cache.set('product-list', [product123, ...]);    // Depends on product-123
cache.set('category-5', { products: [...] });    // Depends on product-123
cache.set('home-featured', [...]);               // Depends on product-123

// When product-123 changes, must invalidate ALL dependents
// Miss one = stale data shown to users
```

**Solution: Dependency graph:**
```javascript
class DependencyTrackingCache {
  constructor() {
    this.cache = new Map();
    this.dependencies = new Map(); // key → Set of dependent keys
    this.dependents = new Map();   // key → Set of keys it depends on
  }
  
  set(key, value, dependencies = []) {
    this.cache.set(key, value);
    
    // Track dependencies
    this.dependents.set(key, new Set(dependencies));
    
    // Build reverse index
    for (const dep of dependencies) {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep).add(key);
    }
    
    console.log(`Cached ${key} with dependencies: [${dependencies.join(', ')}]`);
  }
  
  get(key) {
    return this.cache.get(key);
  }
  
  invalidate(key) {
    console.log(`Invalidating ${key}`);
    
    // Delete the key
    this.cache.delete(key);
    
    // Find and invalidate all dependents (cascade)
    const dependents = this.dependencies.get(key);
    
    if (dependents) {
      for (const dependent of dependents) {
        if (this.cache.has(dependent)) {
          console.log(`  → Cascade invalidating dependent: ${dependent}`);
          this.invalidate(dependent); // Recursive
        }
      }
    }
    
    // Clean up dependency tracking
    this.dependencies.delete(key);
    this.dependents.delete(key);
  }
  
  visualizeDependencies(key) {
    const deps = this.dependents.get(key);
    const dependents = this.dependencies.get(key);
    
    console.log(`\nDependency graph for: ${key}`);
    console.log('Depends on:', deps ? Array.from(deps) : 'none');
    console.log('Depended by:', dependents ? Array.from(dependents) : 'none');
  }
}

// Usage
const cache = new DependencyTrackingCache();

// Build dependency graph
cache.set('product-123', productData);
cache.set('product-list', productList, ['product-123', 'product-456']);
cache.set('category-5', categoryData, ['product-123', 'product-456']);
cache.set('home-featured', featuredData, ['product-list', 'category-5']);

cache.visualizeDependencies('product-123');
// Depends on: none
// Depended by: ['product-list', 'category-5']

// Invalidate product → cascades to all dependents
cache.invalidate('product-123');
// Invalidating product-123
//   → Cascade invalidating dependent: product-list
//     → Cascade invalidating dependent: home-featured
//   → Cascade invalidating dependent: category-5
```

#### 5. Tag-Based Invalidation (CDN Pattern)

**How it works:**
```javascript
// Tag responses with logical groups
app.get('/api/products/:id', (req, res) => {
  const product = getProduct(req.params.id);
  
  res.set('Cache-Tag', `product-${product.id},category-${product.categoryId},products`);
  res.json(product);
});

// Invalidate by tag (purges all responses with that tag)
cdn.purge({ tags: ['category-5'] });
// Purges all products in category 5
```

**Advantages:**
- **Flexible grouping**: One response can have multiple tags
- **Bulk invalidation**: Purge entire categories at once
- **Logical organization**: Tags represent business concepts, not URLs
- **Efficient**: Single purge request for many URLs

**CDN-agnostic tag implementation:**
```javascript
// client/taggedCache.js

class TaggedCache {
  constructor() {
    this.cache = new Map();          // key → value
    this.tags = new Map();           // tag → Set of keys
    this.keyTags = new Map();        // key → Set of tags
  }
  
  set(key, value, tags = []) {
    this.cache.set(key, value);
    
    // Track tags for this key
    this.keyTags.set(key, new Set(tags));
    
    // Build tag index
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag).add(key);
    }
    
    console.log(`Cached ${key} with tags: [${tags.join(', ')}]`);
  }
  
  get(key) {
    return this.cache.get(key);
  }
  
  invalidateByTag(...tags) {
    console.log(`Invalidating by tags: [${tags.join(', ')}]`);
    
    const keysToInvalidate = new Set();
    
    // Collect all keys with these tags
    for (const tag of tags) {
      const taggedKeys = this.tags.get(tag);
      
      if (taggedKeys) {
        for (const key of taggedKeys) {
          keysToInvalidate.add(key);
        }
      }
    }
    
    // Invalidate collected keys
    for (const key of keysToInvalidate) {
      console.log(`  → Invalidating: ${key}`);
      this.cache.delete(key);
      
      // Clean up tag tracking
      const keyTags = this.keyTags.get(key);
      if (keyTags) {
        for (const tag of keyTags) {
          this.tags.get(tag)?.delete(key);
        }
        this.keyTags.delete(key);
      }
    }
    
    console.log(`Invalidated ${keysToInvalidate.size} cache entries`);
    return keysToInvalidate.size;
  }
  
  getTagStats() {
    const stats = [];
    
    for (const [tag, keys] of this.tags.entries()) {
      stats.push({
        tag,
        entries: keys.size,
        keys: Array.from(keys)
      });
    }
    
    return stats.sort((a, b) => b.entries - a.entries);
  }
}

// Usage
const cache = new TaggedCache();

// Cache with multiple tags
cache.set('product-123', productData, ['product', 'category-5', 'featured']);
cache.set('product-456', productData, ['product', 'category-5']);
cache.set('product-789', productData, ['product', 'category-8', 'on-sale']);

// Invalidate all products in category-5
cache.invalidateByTag('category-5');
// Invalidates: product-123, product-456

// Invalidate all featured products
cache.invalidateByTag('featured');
// Invalidates: product-123 (only)

// Invalidate multiple tags at once
cache.invalidateByTag('on-sale', 'featured');
// Invalidates: product-789, product-123

console.table(cache.getTagStats());
```

### Stale-While-Revalidate Pattern

**Concept:** Serve stale content immediately while fetching fresh content in background.

```javascript
// HTTP header approach
Cache-Control: max-age=60, stale-while-revalidate=300

// 0-60s: Fresh (serve from cache)
// 60-360s: Stale (serve from cache + background refresh)
// >360s: Expired (fetch fresh, user waits)
```

**Implementation:**
```javascript
class StaleWhileRevalidateCache {
  constructor(fetchFn) {
    this.cache = new Map();
    this.fetchFn = fetchFn;
    this.revalidating = new Set(); // Prevent duplicate revalidations
  }
  
  async get(key, options = {}) {
    const {
      maxAge = 60000,           // 60s fresh
      staleWhileRevalidate = 300000, // 5min stale-while-revalidate
    } = options;
    
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (!cached) {
      // Cache miss: Fetch fresh
      console.log(`[${key}] Cache miss, fetching...`);
      return await this.fetchAndCache(key);
    }
    
    const age = now - cached.timestamp;
    
    if (age < maxAge) {
      // Fresh: Return immediately
      console.log(`[${key}] Fresh (age: ${(age / 1000).toFixed(1)}s)`);
      return cached.value;
    }
    
    if (age < maxAge + staleWhileRevalidate) {
      // Stale but acceptable: Return stale + revalidate in background
      console.log(`[${key}] Stale (age: ${(age / 1000).toFixed(1)}s), serving + revalidating`);
      
      // Return stale data immediately
      const staleValue = cached.value;
      
      // Revalidate in background (don't await)
      if (!this.revalidating.has(key)) {
        this.revalidating.add(key);
        
        this.fetchAndCache(key)
          .then(() => {
            console.log(`[${key}] Background revalidation complete`);
          })
          .catch(err => {
            console.error(`[${key}] Background revalidation failed:`, err);
          })
          .finally(() => {
            this.revalidating.delete(key);
          });
      }
      
      return staleValue;
    }
    
    // Too stale: Must fetch fresh (user waits)
    console.log(`[${key}] Too stale (age: ${(age / 1000).toFixed(1)}s), fetching fresh`);
    return await this.fetchAndCache(key);
  }
  
  async fetchAndCache(key) {
    try {
      const value = await this.fetchFn(key);
      
      this.cache.set(key, {
        value,
        timestamp: Date.now()
      });
      
      return value;
    } catch (error) {
      console.error(`[${key}] Fetch failed:`, error);
      
      // Fallback to stale cache if available (better than nothing)
      const cached = this.cache.get(key);
      if (cached) {
        console.warn(`[${key}] Returning stale data due to fetch error`);
        return cached.value;
      }
      
      throw error;
    }
  }
  
  invalidate(key) {
    console.log(`[${key}] Invalidated`);
    this.cache.delete(key);
  }
}

// Usage
const productCache = new StaleWhileRevalidateCache(async (productId) => {
  const response = await fetch(`/api/products/${productId}`);
  return response.json();
});

// First request: Cache miss, fetches
const product1 = await productCache.get('123');

// Within 60s: Returns cached (fresh)
const product2 = await productCache.get('123'); // Instant

// After 60s-360s: Returns stale + revalidates background
const product3 = await productCache.get('123'); // Instant (stale)
// Background: Fetches fresh data for next request

// After 360s: Must fetch (too stale)
const product4 = await productCache.get('123'); // Waits for fetch
```

### HTTP Cache Invalidation Mechanisms

**1. Cache-Control directives:**
```javascript
// Never cache (always revalidate)
Cache-Control: no-cache, must-revalidate

// Cache but validate (ETag check)
Cache-Control: max-age=0, must-revalidate

// Short-lived cache
Cache-Control: max-age=60

// Immutable (never check, never invalidate)
Cache-Control: max-age=31536000, immutable
```

**2. ETag validation (conditional requests):**
```javascript
// Server sends ETag
HTTP/1.1 200 OK
ETag: "abc123"
Cache-Control: max-age=60

// Client caches with ETag

// After expiration, client sends If-None-Match
GET /api/product/123
If-None-Match: "abc123"

// Server responds:
// If unchanged: 304 Not Modified (no body, reuse cached)
// If changed: 200 OK + new ETag + new data
```

**Implementation:**
```javascript
// server.js - ETag-based invalidation

const crypto = require('crypto');

function generateETag(data) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
}

app.get('/api/products/:id', async (req, res) => {
  const product = await db.getProduct(req.params.id);
  
  if (!product) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const etag = generateETag(product);
  
  // Check If-None-Match header
  const clientETag = req.headers['if-none-match'];
  
  if (clientETag === etag) {
    // Data unchanged, return 304
    console.log('ETag match, returning 304');
    return res.status(304).end();
  }
  
  // Data changed or no ETag, return fresh data
  res.set('ETag', etag);
  res.set('Cache-Control', 'max-age=60');
  res.json(product);
});
```

**3. CDN purge APIs:**
```javascript
// Cloudflare purge
async function purgeCDN(urls) {
  await fetch('https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache', {
    method: 'POST',
    headers: {
      'X-Auth-Email': 'user@example.com',
      'X-Auth-Key': 'api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files: urls })
  });
}

// Purge specific URLs
await purgeCDN([
  'https://example.com/api/products/123',
  'https://example.com/api/products/456'
]);

// Fastly purge by surrogate key (tag-based)
async function purgeFastly(tags) {
  await fetch('https://api.fastly.com/service/{service}/purge/{tag}', {
    method: 'POST',
    headers: {
      'Fastly-Key': 'api-key',
      'Fastly-Soft-Purge': '1' // Soft purge: mark stale, not delete
    }
  });
}

await purgeFastly(['product-123', 'category-5']);
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: Complete Multi-Layer Cache Invalidation System

```javascript
// cacheInvalidation.js - Production-grade invalidation system

class MultiLayerCacheInvalidation {
  constructor() {
    // Multiple cache layers
    this.layers = {
      memory: new Map(),              // In-memory cache
      localStorage: window.localStorage,
      serviceWorker: navigator.serviceWorker,
      cdn: null // Configured separately
    };
    
    // Dependency tracking
    this.dependencies = new Map();
    this.tags = new Map();
    
    // Event bus for coordination
    this.eventBus = new EventTarget();
    
    this.setupCrossTabSync();
  }
  
  /**
   * Set item in all cache layers with metadata
   */
  async set(key, value, options = {}) {
    const {
      ttl = null,
      tags = [],
      dependencies = [],
      layers = ['memory', 'localStorage']
    } = options;
    
    const cacheEntry = {
      value,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : null,
      tags,
      dependencies
    };
    
    // Store in requested layers
    const promises = [];
    
    if (layers.includes('memory')) {
      this.layers.memory.set(key, cacheEntry);
    }
    
    if (layers.includes('localStorage')) {
      try {
        this.layers.localStorage.setItem(
          key,
          JSON.stringify(cacheEntry)
        );
      } catch (e) {
        console.error('localStorage set failed:', e);
      }
    }
    
    if (layers.includes('serviceWorker') && this.layers.serviceWorker) {
      promises.push(
        this.serviceWorkerCache(key, value)
      );
    }
    
    // Track dependencies
    this.trackDependencies(key, dependencies);
    
    // Track tags
    this.trackTags(key, tags);
    
    await Promise.allSettled(promises);
    
    console.log(`Cached ${key} in layers: [${layers.join(', ')}]`);
  }
  
  /**
   * Get from cache with fallback chain
   */
  async get(key) {
    // Try memory first
    let entry = this.layers.memory.get(key);
    
    if (entry) {
      if (this.isExpired(entry)) {
        this.invalidate(key);
        return null;
      }
      return entry.value;
    }
    
    // Try localStorage
    try {
      const stored = this.layers.localStorage.getItem(key);
      if (stored) {
        entry = JSON.parse(stored);
        
        if (this.isExpired(entry)) {
          this.invalidate(key);
          return null;
        }
        
        // Promote to memory cache
        this.layers.memory.set(key, entry);
        
        return entry.value;
      }
    } catch (e) {
      console.error('localStorage get failed:', e);
    }
    
    // Try Service Worker cache
    if (this.layers.serviceWorker) {
      const swValue = await this.serviceWorkerGet(key);
      if (swValue) return swValue;
    }
    
    return null;
  }
  
  /**
   * Invalidate across all layers
   */
  async invalidate(key, options = {}) {
    const {
      cascade = true,
      layers = ['memory', 'localStorage', 'serviceWorker'],
      reason = 'manual'
    } = options;
    
    console.log(`Invalidating ${key} (reason: ${reason})`);
    
    // Delete from layers
    if (layers.includes('memory')) {
      this.layers.memory.delete(key);
    }
    
    if (layers.includes('localStorage')) {
      this.layers.localStorage.removeItem(key);
    }
    
    if (layers.includes('serviceWorker')) {
      await this.serviceWorkerDelete(key);
    }
    
    // Cascade invalidation to dependents
    if (cascade) {
      await this.cascadeInvalidation(key);
    }
    
    // Emit invalidation event (for cross-tab sync)
    this.eventBus.dispatchEvent(new CustomEvent('invalidate', {
      detail: { key, reason }
    }));
    
    // Notify other tabs via localStorage event
    this.broadcastInvalidation(key);
  }
  
  /**
   * Invalidate by tag
   */
  async invalidateByTag(...tags) {
    console.log(`Invalidating by tags: [${tags.join(', ')}]`);
    
    const keysToInvalidate = new Set();
    
    for (const tag of tags) {
      const taggedKeys = this.tags.get(tag);
      if (taggedKeys) {
        for (const key of taggedKeys) {
          keysToInvalidate.add(key);
        }
      }
    }
    
    const promises = Array.from(keysToInvalidate).map(key =>
      this.invalidate(key, { reason: `tag:${tags.join(',')}` })
    );
    
    await Promise.allSettled(promises);
    
    console.log(`Invalidated ${keysToInvalidate.size} entries`);
  }
  
  /**
   * Track dependencies
   */
  trackDependencies(key, dependencies) {
    if (dependencies.length === 0) return;
    
    for (const dep of dependencies) {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep).add(key);
    }
  }
  
  /**
   * Track tags
   */
  trackTags(key, tags) {
    if (tags.length === 0) return;
    
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag).add(key);
    }
  }
  
  /**
   * Cascade invalidation to dependents
   */
  async cascadeInvalidation(key) {
    const dependents = this.dependencies.get(key);
    
    if (!dependents) return;
    
    console.log(`Cascading invalidation from ${key} to ${dependents.size} dependents`);
    
    const promises = Array.from(dependents).map(dependent =>
      this.invalidate(dependent, {
        cascade: true,
        reason: `dependency:${key}`
      })
    );
    
    await Promise.allSettled(promises);
  }
  
  /**
   * Check if entry is expired
   */
  isExpired(entry) {
    return entry.expiresAt && Date.now() > entry.expiresAt;
  }
  
  /**
   * Service Worker cache operations
   */
  async serviceWorkerCache(key, value) {
    if (!this.layers.serviceWorker?.controller) return;
    
    this.layers.serviceWorker.controller.postMessage({
      type: 'CACHE_SET',
      key,
      value
    });
  }
  
  async serviceWorkerGet(key) {
    // Implementation depends on SW setup
    return null;
  }
  
  async serviceWorkerDelete(key) {
    if (!this.layers.serviceWorker?.controller) return;
    
    this.layers.serviceWorker.controller.postMessage({
      type: 'CACHE_DELETE',
      key
    });
  }
  
  /**
   * Cross-tab synchronization
   */
  setupCrossTabSync() {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('invalidate:')) {
        const key = event.key.replace('invalidate:', '');
        console.log(`Cross-tab invalidation received: ${key}`);
        
        // Invalidate locally (without broadcasting again)
        this.layers.memory.delete(key);
      }
    });
  }
  
  broadcastInvalidation(key) {
    // Use localStorage as message bus for cross-tab sync
    try {
      const invalidateKey = `invalidate:${key}`;
      this.layers.localStorage.setItem(invalidateKey, Date.now().toString());
      
      // Remove after a second (just need to trigger event)
      setTimeout(() => {
        this.layers.localStorage.removeItem(invalidateKey);
      }, 1000);
    } catch (e) {
      // Ignore localStorage errors
    }
  }
  
  /**
   * Statistics
   */
  getStats() {
    return {
      memory: {
        entries: this.layers.memory.size,
        keys: Array.from(this.layers.memory.keys())
      },
      localStorage: {
        entries: this.layers.localStorage.length,
        keys: Object.keys(this.layers.localStorage)
      },
      dependencies: {
        tracked: this.dependencies.size
      },
      tags: {
        count: this.tags.size,
        breakdown: Array.from(this.tags.entries()).map(([tag, keys]) => ({
          tag,
          entries: keys.size
        }))
      }
    };
  }
  
  /**
   * Purge all caches (emergency)
   */
  async purgeAll() {
    console.warn('EMERGENCY: Purging all caches');
    
    this.layers.memory.clear();
    this.layers.localStorage.clear();
    
    if (this.layers.serviceWorker?.controller) {
      this.layers.serviceWorker.controller.postMessage({
        type: 'CACHE_CLEAR'
      });
    }
    
    this.dependencies.clear();
    this.tags.clear();
  }
}

// Usage
const cacheManager = new MultiLayerCacheInvalidation();

// Cache product with dependencies and tags
await cacheManager.set('product-123', productData, {
  ttl: 60000, // 1 minute
  tags: ['product', 'category-5', 'featured'],
  dependencies: [],
  layers: ['memory', 'localStorage']
});

// Cache product list that depends on product
await cacheManager.set('product-list', productList, {
  ttl: 300000, // 5 minutes
  tags: ['product-list'],
  dependencies: ['product-123', 'product-456']
});

// Invalidate product → cascades to product-list
await cacheManager.invalidate('product-123');

// Invalidate by tag
await cacheManager.invalidateByTag('category-5');

// Stats
console.log(cacheManager.getStats());
```

### Example 2: React Query Integration with Custom Invalidation

```javascript
// useInvalidation.js - React hook for cache invalidation

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useInvalidation() {
  const queryClient = useQueryClient();
  
  // Subscribe to invalidation events
  useEffect(() => {
    const handleStorageEvent = (event) => {
      // Cross-tab invalidation via localStorage
      if (event.key && event.key.startsWith('invalidate:')) {
        const queryKey = event.key.replace('invalidate:', '').split(',');
        
        console.log('Invalidating query from another tab:', queryKey);
        queryClient.invalidateQueries({ queryKey });
      }
    };
    
    window.addEventListener('storage', handleStorageEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [queryClient]);
  
  /**
   * Invalidate query and broadcast to other tabs
   */
  const invalidate = (queryKey) => {
    // Invalidate in this tab
    queryClient.invalidateQueries({ queryKey });
    
    // Broadcast to other tabs
    try {
      const key = `invalidate:${Array.isArray(queryKey) ? queryKey.join(',') : queryKey}`;
      localStorage.setItem(key, Date.now().toString());
      
      setTimeout(() => {
        localStorage.removeItem(key);
      }, 1000);
    } catch (e) {
      console.error('Failed to broadcast invalidation:', e);
    }
  };
  
  /**
   * Invalidate by tag pattern
   */
  const invalidateByPattern = (pattern) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const regex = new RegExp(pattern);
    
    queries.forEach(query => {
      const keyStr = JSON.stringify(query.queryKey);
      if (regex.test(keyStr)) {
        console.log('Invalidating by pattern:', query.queryKey);
        queryClient.invalidateQueries({ queryKey: query.queryKey });
      }
    });
  };
  
  /**
   * Cascade invalidation based on dependencies
   */
  const invalidateCascade = (queryKey, dependencies) => {
    // Invalidate primary key
    invalidate(queryKey);
    
    // Invalidate dependencies
    dependencies.forEach(dep => {
      invalidate(dep);
    });
  };
  
  return {
    invalidate,
    invalidateByPattern,
    invalidateCascade
  };
}

// Component usage
function ProductManager() {
  const { invalidate, invalidateByPattern, invalidateCascade } = useInvalidation();
  
  const updateProduct = async (productId, data) => {
    await api.updateProduct(productId, data);
    
    // Invalidate product query and all dependent queries
    invalidateCascade(['product', productId], [
      ['products'], // Product list
      ['category', data.categoryId], // Category
      ['featured'] // Featured products if applicable
    ]);
  };
  
  const deleteProduct = async (productId) => {
    await api.deleteProduct(productId);
    
    // Invalidate all product-related queries
    invalidateByPattern('product');
  };
  
  return (
    <div>
      <button onClick={() => updateProduct(123, { price: 79 })}>
        Update Product
      </button>
      <button onClick={() => deleteProduct(123)}>
        Delete Product
      </button>
    </div>
  );
}
```

### Example 3: Time-Based Cleanup with Smart Invalidation

```javascript
// smartCache.js - Cache with intelligent cleanup

class SmartCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.accessLog = new Map(); // Track access patterns
    this.updateLog = new Map(); // Track update patterns
    
    this.options = {
      maxSize: options.maxSize || 1000,
      minTTL: options.minTTL || 10000,      // 10s
      maxTTL: options.maxTTL || 3600000,    // 1 hour
      cleanupInterval: options.cleanupInterval || 60000, // 1 min
    };
    
    this.startCleanup();
  }
  
  /**
   * Set with automatic TTL calculation
   */
  set(key, value) {
    const now = Date.now();
    
    // Calculate optimal TTL based on update frequency
    const ttl = this.calculateOptimalTTL(key);
    
    const entry = {
      value,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      expiresAt: now + ttl,
      ttl
    };
    
    this.cache.set(key, entry);
    
    // Track update pattern
    this.trackUpdate(key);
    
    // Enforce max size
    if (this.cache.size > this.options.maxSize) {
      this.evictLRU();
    }
    
    console.log(`Cached ${key} with TTL: ${(ttl / 1000).toFixed(1)}s`);
  }
  
  /**
   * Get with access tracking
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.trackAccess(key, false);
      return null;
    }
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.trackAccess(key, false);
      return null;
    }
    
    // Update access stats
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    this.trackAccess(key, true);
    
    return entry.value;
  }
  
  /**
   * Calculate optimal TTL based on historical patterns
   */
  calculateOptimalTTL(key) {
    const updateHistory = this.updateLog.get(key);
    
    if (!updateHistory || updateHistory.length < 2) {
      // No history: use default
      return this.options.minTTL;
    }
    
    // Calculate average time between updates
    const intervals = [];
    for (let i = 1; i < updateHistory.length; i++) {
      intervals.push(updateHistory[i] - updateHistory[i - 1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // TTL = 50% of average update interval
    // (cache should refresh before likely next update)
    let ttl = avgInterval * 0.5;
    
    // Clamp to min/max
    ttl = Math.max(this.options.minTTL, ttl);
    ttl = Math.min(this.options.maxTTL, ttl);
    
    return ttl;
  }
  
  /**
   * Track update patterns
   */
  trackUpdate(key) {
    if (!this.updateLog.has(key)) {
      this.updateLog.set(key, []);
    }
    
    const history = this.updateLog.get(key);
    history.push(Date.now());
    
    // Keep last 10 updates
    if (history.length > 10) {
      history.shift();
    }
  }
  
  /**
   * Track access patterns
   */
  trackAccess(key, hit) {
    if (!this.accessLog.has(key)) {
      this.accessLog.set(key, { hits: 0, misses: 0 });
    }
    
    const stats = this.accessLog.get(key);
    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
  }
  
  /**
   * Evict least recently used
   */
  evictLRU() {
    let lruKey = null;
    let lruTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      console.log(`Evicting LRU: ${lruKey}`);
      this.cache.delete(lruKey);
    }
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let expired = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expired++;
      }
    }
    
    if (expired > 0) {
      console.log(`Cleaned up ${expired} expired entries`);
    }
  }
  
  /**
   * Start automatic cleanup
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }
  
  /**
   * Stop cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();
    
    const stats = {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      utilizationPct: ((this.cache.size / this.options.maxSize) * 100).toFixed(1),
      entries: entries.map(([key, entry]) => ({
        key,
        age: ((now - entry.createdAt) / 1000).toFixed(1) + 's',
        accessCount: entry.accessCount,
        ttl: ((entry.expiresAt - now) / 1000).toFixed(1) + 's',
        expired: now > entry.expiresAt
      }))
    };
    
    // Hit rate
    const accessStats = Array.from(this.accessLog.values());
    const totalHits = accessStats.reduce((sum, s) => sum + s.hits, 0);
    const totalMisses = accessStats.reduce((sum, s) => sum + s.misses, 0);
    const totalAccesses = totalHits + totalMisses;
    
    stats.hitRate = totalAccesses > 0 
      ? ((totalHits / totalAccesses) * 100).toFixed(1) + '%'
      : 'N/A';
    
    return stats;
  }
}

// Usage
const cache = new SmartCache({
  maxSize: 100,
  minTTL: 10000,
  maxTTL: 600000
});

// Cache items
cache.set('product-123', { name: 'Widget', price: 99 });

// Update same item (TTL adapts based on update frequency)
setTimeout(() => cache.set('product-123', { name: 'Widget', price: 89 }), 5000);
setTimeout(() => cache.set('product-123', { name: 'Widget', price: 79 }), 10000);

// Get stats
setTimeout(() => {
  console.log(cache.getStats());
}, 15000);
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question: "How do you handle cache invalidation in a large-scale frontend application?"**

**Strong Answer:**

"Cache invalidation is one of the hardest problems in distributed systems, and frontend applications face unique challenges because caches exist at multiple layers—browser cache, Service Workers, CDN, and application-level caches like React Query. I'll walk through my approach from strategy selection to real-world implementation.

**The core challenge is balancing performance and correctness**. Aggressive caching gives you instant load times—we're talking 10-50ms from cache versus 300ms+ from network—but stale data breaks user trust. Show a user the wrong price, and you've lost a conversion. Miss a critical update, and they're calling support. So the strategy must fit the data's characteristics.

**I categorize data into three buckets for invalidation strategy selection:**

**1. Static, immutable data**: Versioned assets like `app.v123.js` or hashed images. These never change—the URL itself is the version. Strategy: Infinite TTL with `Cache-Control: max-age=31536000, immutable`. No invalidation needed because when content changes, the URL changes. This is the easiest case and gives you 100% cache hit ratio.

**2. Dynamic, frequently changing data**: Product prices, inventory, stock quotes. These change unpredictably and must be fresh. Strategy: Event-based invalidation combined with short TTLs as a fallback. When a product price updates on the server, we publish an event—either via WebSocket, Server-Sent Events, or Redis Pub/Sub—and immediately invalidate all caches containing that product. The short TTL (10-30 seconds) ensures that even if an event is missed due to network issues, users see stale data for at most 30 seconds. We've measured this approach reduces stale data incidents by 98% compared to TTL-only.

**3. Semi-static data**: User profiles, configuration, feature flags. Changes infrequently but needs eventual consistency. Strategy: Time-based expiration with on-demand revalidation. Use medium TTLs (5-15 minutes) and implement stale-while-revalidate—serve cached data immediately while fetching fresh data in the background. This gives you instant perceived performance (0ms cache access) while keeping data reasonably fresh. React Query does this brilliantly with `staleTime` and `refetchOnWindowFocus`.

**For multi-layer invalidation, coordination is critical**. In our architecture, when data changes, we trigger a cascade:

```
Data Update (Database)
    → Event published (Redis Pub/Sub)
    → Server invalidates Redis cache
    → CDN purged via API (Cloudflare/Fastly)
    → WebSocket broadcasts to connected clients
    → Clients invalidate local caches (React Query, Service Worker)
```

The entire cascade completes in under 100ms. The key is using cache tags—we tag every cached response with logical groupings like `product-123`, `category-5`, `featured`. When a product in category 5 updates, we purge the `category-5` tag, and all dependent caches are invalidated in a single operation. This is far more efficient than invalidating individual URLs—one tag can purge thousands of entries.

**Dependency tracking prevents subtle bugs**. If you cache a product list and individual products separately, invalidating one product requires invalidating the list too—otherwise the list shows outdated data. We built a dependency tracking system where cached entries declare their dependencies: `cache.set('product-list', data, { dependencies: ['product-123', 'product-456'] })`. When product-123 changes, we automatically cascade to product-list. Without this, we had bugs where users saw different data on the detail page versus the list—confusing and unprofessional.

**Cross-tab synchronization is surprisingly tricky**. LocalStorage's `storage` event fires in all tabs except the one that made the change—this is by design to avoid infinite loops. So in the tab that invalidates cache, you must manually update UI. In other tabs, the storage event triggers automatic updates. We wrap this complexity in an abstraction: `cacheManager.invalidate('key')` handles both same-tab UI updates and cross-tab broadcasting. Without this, users would open multiple tabs and see inconsistent data—violating the principle of least surprise.

**Failure handling is non-negotiable**. Invalidation can fail—CDN API is down, network is flaky, event bus drops a message. We implement fallbacks at every layer. If event-based invalidation fails, the TTL ensures eventual consistency. If CDN purge fails, we log to Sentry and set a shorter TTL on that content. If localStorage is unavailable (Safari private mode), we fall back to in-memory cache. The system degrades gracefully rather than breaking entirely.

**Real-world impact at scale**: At my previous company, we had 2M monthly active users and a complex product catalog. Initial implementation used TTL-only—5-minute cache for product data. Problem: Product launches and flash sales caused 5 minutes of inconsistency, leading to 400+ support tickets per launch. After implementing event-based invalidation with dependency tracking, we saw zero stale data tickets, cache hit ratio maintained at 94%, and page load times stayed under 200ms—instant from cache, with fresh data guaranteed.

**One critical lesson: monitor invalidation metrics**. We track invalidation latency (event published → cache purged), cascade depth (how many dependents invalidated), and false positives (unnecessary invalidations). High cascade depth indicates poor cache design—you're invalidating too much. High latency means your event bus is slow. These metrics are invisible to users but critical for maintaining system health.

**In summary**: Cache invalidation requires a multi-strategy approach—immutable URLs for static assets, event-based invalidation for dynamic data with short TTL fallback, and stale-while-revalidate for semi-static data. Coordinate across all layers (browser, CDN, server), track dependencies to prevent inconsistencies, handle failures gracefully, and monitor aggressively. Done right, you get both sub-100ms load times and 100% data correctness—the holy grail of caching."

### Likely Follow-Up Questions

1. **"What's the difference between cache invalidation and cache eviction?"**
   
   **Answer:**
   - **Cache invalidation**: Explicitly marking data as stale/invalid because source data changed
     - Example: Product price updated → invalidate product cache
     - Initiated by application logic, data changes
     - Goal: Correctness (prevent stale data)
   
   - **Cache eviction**: Removing data due to resource constraints (size, memory)
     - Example: Cache full, remove least recently used (LRU)
     - Initiated by cache system itself
     - Goal: Efficiency (free up space for new data)
   
   - **Both can happen**: Product price changes (invalidation) AND cache is full (eviction)
   - Invalidation is about correctness; eviction is about resource management

2. **"How do you handle the thundering herd problem with TTL-based caching?"**
   
   **Answer:**
   ```javascript
   // Problem: 1000 users hit expired cache simultaneously
   // All 1000 trigger database query → database overload
   
   // Solution 1: Stale-while-revalidate
   // Serve stale data to all users, only one refetches
   Cache-Control: max-age=60, stale-while-revalidate=300
   
   // Solution 2: Request coalescing
   const inflightRequests = new Map();
   
   async function getWithCoalescing(key) {
     // If request already in flight, wait for it
     if (inflightRequests.has(key)) {
       return await inflightRequests.get(key);
     }
     
     const promise = fetch(`/api/${key}`);
     inflightRequests.set(key, promise);
     
     try {
       const result = await promise;
       cache.set(key, result);
       return result;
     } finally {
       inflightRequests.delete(key);
     }
   }
   // Now 1000 simultaneous requests = 1 database query
   
   // Solution 3: Randomized TTL (jitter)
   // Spread expirations over time
   const ttl = 60 + Math.random() * 10; // 60-70s
   cache.set(key, value, { ttl });
   ```

3. **"How do you invalidate CDN caches?"**
   
   **Answer:**
   - **Method 1: Purge API** (Cloudflare, Fastly)
     ```javascript
     await fetch('https://api.cloudflare.com/purge', {
       method: 'POST',
       body: JSON.stringify({ files: ['url1', 'url2'] })
     });
     ```
     - Instant but limited rate (30 purges/min on some CDNs)
   
   - **Method 2: Cache tags** (Fastly Surrogate-Key, Cloudflare Cache-Tag)
     ```javascript
     res.set('Cache-Tag', 'product-123,category-5');
     // Later: Purge by tag
     await cdn.purgeTag('category-5'); // Purges all products in category
     ```
     - Efficient for bulk invalidation
   
   - **Method 3: Versioned URLs** (preferred for assets)
     ```javascript
     // app.v123.js → app.v124.js
     // No purge needed, old version expires naturally
     ```
   
   - **Method 4: Short TTL + must-revalidate**
     ```javascript
     Cache-Control: max-age=60, must-revalidate
     // CDN caches for 60s, then revalidates with origin
     ```
     - Slower but no API calls needed

4. **"What's the difference between no-cache and no-store?"**
   
   **Answer:**
   - **`no-cache`**: Cache but validate before serving
     ```javascript
     Cache-Control: no-cache
     // 1. Client caches response with ETag
     // 2. On next request, sends If-None-Match: <etag>
     // 3. Server checks: unchanged → 304 (fast), changed → 200 + new data
     // Benefit: Saves bandwidth (304 = headers only, ~200 bytes vs 50KB response)
     ```
   
   - **`no-store`**: Never cache at all
     ```javascript
     Cache-Control: no-store
     // Client never stores response, always fetches fresh
     // Use for: Sensitive data, user-specific content
     ```
   
   - **`must-revalidate`**: Cache but never serve stale
     ```javascript
     Cache-Control: max-age=60, must-revalidate
     // 0-60s: Serve from cache
     // >60s: MUST revalidate, cannot serve stale even if offline
     ```

5. **"How do you handle cache invalidation in offline-first apps?"**
   
   **Answer:**
   - **Challenge**: Can't invalidate if offline (no server communication)
   - **Strategy 1: Local version tracking**
     ```javascript
     // Store version with cached data
     cache.set('products', { data, version: 1 });
     
     // When online, check server version
     const serverVersion = await fetch('/api/version').json();
     if (serverVersion > localVersion) {
       cache.invalidate('products'); // Stale
     }
     ```
   
   - **Strategy 2: Optimistic updates + sync log**
     ```javascript
     // User edits offline → update local cache immediately
     cache.set('product-123', updatedData);
     syncLog.add({ action: 'update', key: 'product-123', data });
     
     // When online → sync to server
     await syncLog.flush(); // Server becomes source of truth
     ```
   
   - **Strategy 3: Timestamp-based staleness**
     ```javascript
     // Mark data with fetch timestamp
     cache.set('products', { data, fetchedAt: Date.now() });
     
     // On app open (even offline), check staleness
     const cached = cache.get('products');
     const age = Date.now() - cached.fetchedAt;
     if (age > 24 * 3600 * 1000) { // 24 hours
       showWarning('Data may be outdated (offline)');
     }
     ```

6. **"What metrics do you track for cache invalidation?"**
   
   **Answer:**
   ```javascript
   const metrics = {
     // Correctness metrics
     staleDataIncidents: 0,      // Users reported seeing old data
     invalidationLatency: [],     // Time from update → cache purged
     invalidationFailures: 0,     // Failed purge API calls
     
     // Efficiency metrics
     cascadeDepth: [],            // How many dependents invalidated
     invalidationsPerUpdate: [],  // How many cache entries per data change
     falsePositives: 0,           // Unnecessary invalidations
     
     // Performance metrics
     cacheHitRate: 0.94,          // % requests served from cache
     avgInvalidationTime: 85,     // ms to complete full cascade
     cdnPurgeLatency: [],         // CDN API response time
     
     // Business metrics
     supportTickets: 0,           // "Wrong price" complaints
     revenueAccuracy: 1.0         // Correct prices shown
   };
   
   // Alert thresholds
   if (metrics.invalidationLatency.p99 > 500) {
     alert('Cache invalidation is slow');
   }
   if (metrics.staleDataIncidents > 5) {
     alert('Invalidation failing, users seeing stale data');
   }
   ```

### Comparison Table

| Strategy | Consistency | Complexity | Performance | Use Case |
|----------|-------------|-----------|-------------|----------|
| **TTL-only** | Eventual | Low | High | Static data, low-frequency changes |
| **Event-based** | Strong | High | High | Dynamic data, frequent changes |
| **Version-based** | Strong | Medium | High | Immutable assets, config |
| **Manual purge** | Strong | Low | Medium | Emergency fixes, rare updates |
| **Stale-while-revalidate** | Eventual | Medium | Very High | Best of both worlds |

### Trade-Off Explanations

**Trade-off 1: Aggressive Caching vs Data Freshness**

"In our e-commerce platform, we initially cached product data for 1 hour—this gave us 98% cache hit ratio and sub-50ms page loads. Performance was incredible, but we had a critical incident during a flash sale: prices updated at 12:00pm, but cached data meant users saw old prices until 1:00pm. We got 200+ support tickets and lost significant revenue from users unable to buy at sale prices (cart showed old price, checkout showed new price—huge trust violation).

We switched to event-based invalidation with 30-second TTL fallback. Now when a price changes, we immediately purge all caches. Cache hit ratio dropped slightly to 94% (some entries invalidated more frequently), but consistency incidents went to zero. The trade-off was 4% more database queries in exchange for 100% data correctness. For e-commerce, correctness trumps performance—wrong prices cost real money and user trust."

**Trade-off 2: Granular vs Broad Invalidation**

"We faced a choice: invalidate only the specific product that changed (granular) or invalidate the entire category (broad). Granular is more efficient—one product changes, invalidate one cache entry. Broad is simpler—category changes, purge everything in that category.

We tried granular first with dependency tracking: when product-123 changes, invalidate product-123, product-list (if it contains 123), category-5 (if 123 is in it), home-featured (if 123 is featured). This required complex dependency graphs and cascade logic. We had bugs where we missed a dependency and served stale data.

We switched to tag-based broad invalidation: every product tagged with category-5. When any product in category-5 changes, purge entire category-5 tag. This invalidated more than necessary (all category products, even unchanged ones), but bugs disappeared. Cache hit ratio dropped 3% for categories (78% → 75%), but complexity dropped 90%. The trade-off was marginal performance loss for massive simplicity and reliability gains. In production, simple and correct beats complex and buggy."

**Trade-off 3: Multi-Layer Caching vs Invalidation Complexity**

"We have caches at four layers: browser (Cache-Control), Service Worker (programmatic), CDN (edge), and server (Redis). Each layer improves performance—browser cache is < 1ms, CDN is 30-50ms, server is 100-150ms, database is 300ms+. But invalidating across all layers is complex: data changes → invalidate Redis, purge CDN, broadcast to Service Workers, and somehow invalidate browser caches (impossible directly, requires versioned URLs or ETag validation).

We considered simplifying to just CDN + server caching. This would cut invalidation complexity in half—just Redis + CDN purge API. But we'd lose browser cache benefits (< 1ms vs 30-50ms CDN)—a 30-50x performance degradation for repeat visits.

We kept all four layers but accepted the complexity cost. Invested 2 weeks building the invalidation cascade system, which now handles the orchestration automatically. The trade-off was upfront engineering time for long-term performance gains. For high-traffic apps (2M+ users), that 30-50ms per request compounds to massive cost savings—50ms × 100M requests/month = 5M seconds saved = 1400 hours of user time. Worth the complexity."

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: React Query with Automatic Invalidation

```javascript
// queryClient.js - React Query setup with invalidation

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // Consider fresh for 1 minute
      cacheTime: 300000, // Keep in cache for 5 minutes
      refetchOnWindowFocus: true, // Refetch when user returns
      refetchOnReconnect: true, // Refetch when internet returns
      retry: 3, // Retry failed requests 3 times
    },
  },
});

// invalidation.js - Centralized invalidation logic

export class QueryInvalidation {
  constructor(queryClient) {
    this.queryClient = queryClient;
    this.setupWebSocketListener();
    this.setupStorageListener();
  }
  
  /**
   * Listen to WebSocket events from server
   */
  setupWebSocketListener() {
    const ws = new WebSocket('wss://api.example.com/updates');
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'product.updated':
          this.invalidateProduct(message.productId);
          break;
        
        case 'category.updated':
          this.invalidateCategory(message.categoryId);
          break;
        
        case 'inventory.changed':
          this.invalidateInventory(message.productId);
          break;
        
        case 'cache.purge':
          this.purgeAll();
          break;
        
        default:
          console.warn('Unknown invalidation event:', message.type);
      }
    };
  }
  
  /**
   * Listen to cross-tab invalidation events
   */
  setupStorageListener() {
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('invalidate:')) {
        const type = event.key.replace('invalidate:', '');
        const data = event.newValue ? JSON.parse(event.newValue) : null;
        
        console.log('Cross-tab invalidation:', type, data);
        
        // Trigger same invalidation logic
        this.handleInvalidation(type, data);
      }
    });
  }
  
  /**
   * Invalidate product and dependencies
   */
  invalidateProduct(productId) {
    console.log(`Invalidating product: ${productId}`);
    
    // Invalidate specific product
    this.queryClient.invalidateQueries({
      queryKey: ['product', productId]
    });
    
    // Invalidate lists that might contain this product
    this.queryClient.invalidateQueries({
      queryKey: ['products'], // All product lists
      exact: false // Matches ['products', ...any]
    });
    
    // Invalidate search results
    this.queryClient.invalidateQueries({
      queryKey: ['search']
    });
    
    // Broadcast to other tabs
    this.broadcast('product', { productId });
  }
  
  /**
   * Invalidate category and all products in it
   */
  invalidateCategory(categoryId) {
    console.log(`Invalidating category: ${categoryId}`);
    
    // Invalidate category
    this.queryClient.invalidateQueries({
      queryKey: ['category', categoryId]
    });
    
    // Invalidate all products in this category
    // (React Query will refetch on next access)
    this.queryClient.invalidateQueries({
      predicate: (query) => {
        // Check if query is product and matches category
        const [type, id] = query.queryKey;
        if (type === 'product') {
          const data = query.state.data;
          return data?.categoryId === categoryId;
        }
        return false;
      }
    });
    
    this.broadcast('category', { categoryId });
  }
  
  /**
   * Invalidate inventory for a product
   */
  invalidateInventory(productId) {
    console.log(`Invalidating inventory: ${productId}`);
    
    // Only invalidate inventory, not entire product
    this.queryClient.invalidateQueries({
      queryKey: ['inventory', productId]
    });
    
    // Refetch immediately if user is viewing this product
    const activeQueries = this.queryClient.getQueryCache().findAll({
      queryKey: ['inventory', productId],
      type: 'active' // Only active (currently rendered) queries
    });
    
    if (activeQueries.length > 0) {
      console.log('User viewing product, refetching immediately');
      this.queryClient.refetchQueries({
        queryKey: ['inventory', productId]
      });
    }
    
    this.broadcast('inventory', { productId });
  }
  
  /**
   * Nuclear option: purge everything
   */
  purgeAll() {
    console.warn('PURGING ALL QUERIES');
    
    this.queryClient.invalidateQueries();
    
    // Also clear localStorage cache
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('cache:'))
        .forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
    
    this.broadcast('purge', {});
  }
  
  /**
   * Broadcast invalidation to other tabs
   */
  broadcast(type, data) {
    try {
      const key = `invalidate:${type}`;
      localStorage.setItem(key, JSON.stringify(data));
      
      // Remove after 1s (just to trigger storage event)
      setTimeout(() => {
        localStorage.removeItem(key);
      }, 1000);
    } catch (e) {
      // Ignore localStorage errors
    }
  }
  
  /**
   * Handle invalidation (used by storage listener)
   */
  handleInvalidation(type, data) {
    switch (type) {
      case 'product':
        this.invalidateProduct(data.productId);
        break;
      case 'category':
        this.invalidateCategory(data.categoryId);
        break;
      case 'inventory':
        this.invalidateInventory(data.productId);
        break;
      case 'purge':
        this.purgeAll();
        break;
    }
  }
}

// Initialize
export const invalidation = new QueryInvalidation(queryClient);

// Component usage
function ProductDetails({ productId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
    staleTime: 60000, // Fresh for 1 minute
  });
  
  const updateProduct = useMutation({
    mutationFn: (updates) => api.updateProduct(productId, updates),
    onSuccess: () => {
      // Automatically invalidate after mutation
      invalidation.invalidateProduct(productId);
    },
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>{data.name}</h1>
      <p>${data.price}</p>
      <button onClick={() => updateProduct.mutate({ price: 79 })}>
        Update Price
      </button>
    </div>
  );
}
```

### Example 2: Service Worker Cache Invalidation

```javascript
// sw.js - Service Worker with cache versioning and invalidation

const CACHE_VERSION = 'v1.2.0';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;

const CACHE_STRATEGIES = {
  // Static assets: cache-first with long TTL
  static: /\.(js|css|woff2|png|jpg|webp)$/,
  
  // API: network-first with stale-while-revalidate
  api: /\/api\//,
  
  // HTML: network-first, always fresh
  html: /\.html$/,
};

// Listen for install
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/app.js',
        '/styles.css',
      ]);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Listen for activate
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    // Delete old caches (invalidation by version)
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('app-cache-') && name !== CACHE_NAME)
          .map(name => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Take control immediately
  return self.clients.claim();
});

// Listen for fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Determine strategy based on URL pattern
  let strategy;
  
  if (CACHE_STRATEGIES.static.test(url.pathname)) {
    strategy = cacheFirst(request);
  } else if (CACHE_STRATEGIES.api.test(url.pathname)) {
    strategy = networkFirst(request);
  } else if (CACHE_STRATEGIES.html.test(url.pathname)) {
    strategy = networkOnly(request);
  } else {
    strategy = networkFirst(request);
  }
  
  event.respondWith(strategy);
});

// Listen for messages (for manual invalidation)
self.addEventListener('message', (event) => {
  const { type, key, pattern } = event.data;
  
  switch (type) {
    case 'CACHE_DELETE':
      handleCacheDelete(key).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
    
    case 'CACHE_DELETE_PATTERN':
      handleCacheDeletePattern(pattern).then((count) => {
        event.ports[0].postMessage({ success: true, count });
      });
      break;
    
    case 'CACHE_CLEAR':
      handleCacheClear().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
    
    case 'CACHE_VERSION':
      event.ports[0].postMessage({ version: CACHE_VERSION });
      break;
  }
});

/**
 * Cache-first strategy (for static assets)
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  
  if (cached) {
    console.log('Cache hit:', request.url);
    return cached;
  }
  
  console.log('Cache miss, fetching:', request.url);
  
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Fetch failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first strategy (for API)
 */
async function networkFirst(request) {
  try {
    console.log('Fetching from network:', request.url);
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    
    const cached = await caches.match(request);
    
    if (cached) {
      console.log('Serving stale from cache');
      return cached;
    }
    
    return new Response('Offline and not cached', { status: 503 });
  }
}

/**
 * Network-only strategy (for HTML)
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Delete specific cache entry
 */
async function handleCacheDelete(key) {
  const cache = await caches.open(CACHE_NAME);
  const deleted = await cache.delete(key);
  
  console.log(`Deleted cache entry: ${key}`, deleted);
  
  return deleted;
}

/**
 * Delete cache entries matching pattern
 */
async function handleCacheDeletePattern(pattern) {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  const regex = new RegExp(pattern);
  let count = 0;
  
  for (const request of keys) {
    if (regex.test(request.url)) {
      await cache.delete(request);
      count++;
      console.log('Deleted by pattern:', request.url);
    }
  }
  
  return count;
}

/**
 * Clear all caches
 */
async function handleCacheClear() {
  const cacheNames = await caches.keys();
  
  await Promise.all(
    cacheNames.map(name => caches.delete(name))
  );
  
  console.log('All caches cleared');
}

// client.js - Invalidate from main thread

class ServiceWorkerCache {
  constructor() {
    this.registration = null;
    this.init();
  }
  
  async init() {
    if ('serviceWorker' in navigator) {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');
    }
  }
  
  /**
   * Delete specific URL from cache
   */
  async invalidate(url) {
    if (!navigator.serviceWorker.controller) {
      console.warn('No Service Worker controller');
      return false;
    }
    
    return this.sendMessage({
      type: 'CACHE_DELETE',
      key: url
    });
  }
  
  /**
   * Delete URLs matching pattern
   */
  async invalidatePattern(pattern) {
    if (!navigator.serviceWorker.controller) {
      console.warn('No Service Worker controller');
      return 0;
    }
    
    const result = await this.sendMessage({
      type: 'CACHE_DELETE_PATTERN',
      pattern
    });
    
    return result.count;
  }
  
  /**
   * Clear all caches
   */
  async clear() {
    if (!navigator.serviceWorker.controller) {
      console.warn('No Service Worker controller');
      return false;
    }
    
    return this.sendMessage({
      type: 'CACHE_CLEAR'
    });
  }
  
  /**
   * Get cache version
   */
  async getVersion() {
    if (!navigator.serviceWorker.controller) {
      return null;
    }
    
    const result = await this.sendMessage({
      type: 'CACHE_VERSION'
    });
    
    return result.version;
  }
  
  /**
   * Send message to Service Worker
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve(event.data);
        } else {
          reject(new Error('Service Worker error'));
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        message,
        [messageChannel.port2]
      );
    });
  }
}

// Usage
const swCache = new ServiceWorkerCache();

// Invalidate specific URL
await swCache.invalidate('/api/products/123');

// Invalidate all products
await swCache.invalidatePattern('/api/products/');

// Clear all
await swCache.clear();

// Check version
const version = await swCache.getVersion();
console.log('SW version:', version);
```

### Example 3: CDN Cache Invalidation with Retry

```javascript
// cdnInvalidation.js - Robust CDN purge with retry logic

class CDNInvalidation {
  constructor(config) {
    this.config = {
      provider: config.provider, // 'cloudflare' | 'fastly' | 'akamai'
      apiKey: config.apiKey,
      apiEmail: config.apiEmail,
      zoneId: config.zoneId,
      serviceId: config.serviceId,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };
    
    this.queue = [];
    this.processing = false;
  }
  
  /**
   * Purge URLs from CDN
   */
  async purgeUrls(urls, options = {}) {
    const { immediate = false } = options;
    
    if (!Array.isArray(urls)) {
      urls = [urls];
    }
    
    console.log(`Queuing ${urls.length} URLs for purge`);
    
    const request = {
      type: 'urls',
      urls,
      timestamp: Date.now(),
      retries: 0
    };
    
    this.queue.push(request);
    
    if (immediate || this.queue.length >= 10) {
      return this.processQueue();
    }
    
    // Batch purges (wait 1s for more)
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processQueue();
      }, 1000);
    }
    
    return Promise.resolve();
  }
  
  /**
   * Purge by cache tags
   */
  async purgeTags(tags, options = {}) {
    if (!Array.isArray(tags)) {
      tags = [tags];
    }
    
    console.log(`Queuing ${tags.length} tags for purge`);
    
    const request = {
      type: 'tags',
      tags,
      timestamp: Date.now(),
      retries: 0
    };
    
    this.queue.push(request);
    
    return this.processQueue();
  }
  
  /**
   * Process purge queue
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    clearTimeout(this.batchTimeout);
    this.batchTimeout = null;
    
    console.log(`Processing ${this.queue.length} purge requests`);
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      
      try {
        await this.executePurge(request);
        console.log('Purge successful:', request);
      } catch (error) {
        console.error('Purge failed:', error);
        
        // Retry logic
        if (request.retries < this.config.maxRetries) {
          request.retries++;
          console.log(`Retrying (${request.retries}/${this.config.maxRetries})`);
          
          // Re-queue with exponential backoff
          setTimeout(() => {
            this.queue.push(request);
            this.processQueue();
          }, this.config.retryDelay * Math.pow(2, request.retries));
        } else {
          console.error('Max retries exceeded, giving up');
          
          // Log to error tracking (Sentry, etc.)
          this.logError(request, error);
        }
      }
    }
    
    this.processing = false;
  }
  
  /**
   * Execute purge based on provider
   */
  async executePurge(request) {
    switch (this.config.provider) {
      case 'cloudflare':
        return this.purgeCloudflare(request);
      
      case 'fastly':
        return this.purgeFastly(request);
      
      case 'akamai':
        return this.purgeAkamai(request);
      
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }
  
  /**
   * Cloudflare purge
   */
  async purgeCloudflare(request) {
    const url = `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/purge_cache`;
    
    const body = request.type === 'urls' 
      ? { files: request.urls }
      : { tags: request.tags };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Auth-Email': this.config.apiEmail,
        'X-Auth-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cloudflare purge failed: ${JSON.stringify(error)}`);
    }
    
    const result = await response.json();
    console.log('Cloudflare purge result:', result);
    
    return result;
  }
  
  /**
   * Fastly purge
   */
  async purgeFastly(request) {
    if (request.type === 'tags') {
      // Purge by surrogate key (tag)
      const promises = request.tags.map(tag => {
        const url = `https://api.fastly.com/service/${this.config.serviceId}/purge/${tag}`;
        
        return fetch(url, {
          method: 'POST',
          headers: {
            'Fastly-Key': this.config.apiKey,
            'Fastly-Soft-Purge': '1' // Soft purge: mark stale
          }
        });
      });
      
      await Promise.all(promises);
    } else {
      // Purge by URL
      const promises = request.urls.map(url => {
        return fetch(url, {
          method: 'PURGE',
          headers: {
            'Fastly-Key': this.config.apiKey
          }
        });
      });
      
      await Promise.all(promises);
    }
  }
  
  /**
   * Akamai purge
   */
  async purgeAkamai(request) {
    const url = 'https://api.akamai.com/ccu/v3/invalidate/url';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        objects: request.urls
      })
    });
    
    if (!response.ok) {
      throw new Error(`Akamai purge failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Log error to monitoring system
   */
  logError(request, error) {
    // Send to Sentry, Datadog, etc.
    console.error('CDN purge permanently failed:', {
      request,
      error: error.message,
      stack: error.stack
    });
  }
  
  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      pending: this.queue.map(r => ({
        type: r.type,
        count: r.type === 'urls' ? r.urls.length : r.tags.length,
        retries: r.retries,
        age: Date.now() - r.timestamp
      }))
    };
  }
}

// Usage
const cdn = new CDNInvalidation({
  provider: 'cloudflare',
  apiKey: process.env.CLOUDFLARE_API_KEY,
  apiEmail: process.env.CLOUDFLARE_API_EMAIL,
  zoneId: process.env.CLOUDFLARE_ZONE_ID,
  maxRetries: 3,
  retryDelay: 1000
});

// Purge specific URLs
await cdn.purgeUrls([
  'https://example.com/api/products/123',
  'https://example.com/api/products/456'
]);

// Purge by tag (efficient for bulk)
await cdn.purgeTags(['category-5', 'featured']);

// Check status
console.log(cdn.getStatus());
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience:**
- **Correctness**: No stale data (users see accurate prices, inventory, content)
- **Consistency**: Same data across all tabs/devices
- **Trust**: Reliable information builds confidence
- **Performance**: Fast caching without sacrificing freshness
- **Real-time feel**: Updates propagate instantly (appears live)

**Business Impact:**
```
Real case study: Multi-Tenant SaaS Platform (500K users)

Without proper invalidation (TTL-only, 5-minute cache):
- Data staleness: 5 minutes average, 15 minutes worst case
- User complaints: 150/week ("data not updating")
- Support tickets: $45/ticket × 150 = $6,750/week
- Lost productivity: Users refresh frantically, reload apps
- Revenue impact: -8% conversion (users don't trust data)
- Cache hit ratio: 92% (good caching, bad correctness)

With event-based invalidation + dependency tracking:
- Data staleness: <100ms average (near real-time)
- User complaints: 3/week (99% reduction)
- Support tickets: $45 × 3 = $135/week (98% reduction)
- Productivity: Users trust auto-updates, no manual refresh
- Revenue impact: +12% conversion (trust restored)
- Cache hit ratio: 89% (slight drop, acceptable trade-off)

Business results per year:
- Support cost savings: ($6,750 - $135) × 52 = $343,980/year
- Revenue increase: 12% conversion lift = $2.4M additional revenue
- Customer satisfaction: +67 NPS points
- Engineering: One-time 4-week investment

ROI: $2.7M annual benefit for 4-week project
```

**Technical Benefits:**
- **System integrity**: Cache and database stay synchronized
- **Scalability**: Can cache aggressively without correctness concerns
- **Debuggability**: Clear invalidation logs for troubleshooting
- **Flexibility**: Easy to adjust strategy per data type
- **Resilience**: Fallback mechanisms prevent total failure

### How It Works

**Technical Summary:**

**1. Invalidation Flow (Event-Based):**

```
┌─────────────────────────────────────────────────────┐
│ 1. Data Change Triggers Event                      │
│                                                     │
│   User updates product price                       │
│   ↓                                                 │
│   Database: UPDATE products SET price=79           │
│   ↓                                                 │
│   Event published: { type: 'product.updated',      │
│                      productId: 123 }              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. Invalidation Cascade                            │
│                                                     │
│   Redis Pub/Sub broadcasts event                   │
│   ↓                                                 │
│   All app servers receive event                    │
│   ↓                                                 │
│   Each server invalidates local caches:            │
│   - Redis cache: DELETE product:123                │
│   - Memory cache: memoryCache.delete('p-123')      │
│   ↓                                                 │
│   CDN purge API called:                            │
│   - Cloudflare: POST /purge { tags: ['p-123'] }   │
│   ↓                                                 │
│   WebSocket broadcast to clients:                  │
│   - ws.send({ type: 'invalidate', key: 'p-123' }) │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. Client-Side Invalidation                       │
│                                                     │
│   Browser receives WebSocket message               │
│   ↓                                                 │
│   React Query: queryClient.invalidateQueries()     │
│   ↓                                                 │
│   Service Worker: cache.delete('/api/p-123')       │
│   ↓                                                 │
│   localStorage: removeItem('cache:p-123')          │
│   ↓                                                 │
│   UI automatically refetches fresh data            │
│   ↓                                                 │
│   User sees updated price instantly                │
└─────────────────────────────────────────────────────┘

Total time: 50-150ms from database update to UI refresh
```

**2. Dependency Cascade:**

```javascript
// When product-123 changes, what else must be invalidated?

product-123 (base)
  ├─ product-list (contains product-123)
  │   └─ home-featured (depends on product-list)
  ├─ category-5 (contains product-123)
  │   └─ category-list (contains category-5)
  └─ search-results (may contain product-123)

// Dependency graph stored in memory:
dependencies = {
  'product-123': ['product-list', 'category-5', 'search-results'],
  'product-list': ['home-featured'],
  'category-5': ['category-list']
};

// Invalidation algorithm (DFS):
function invalidateCascade(key) {
  // 1. Invalidate key itself
  cache.delete(key);
  
  // 2. Find dependents
  const dependents = dependencies[key] || [];
  
  // 3. Recursively invalidate each dependent
  for (const dependent of dependents) {
    invalidateCascade(dependent); // Recursive
  }
}

invalidateCascade('product-123');
// Invalidates: product-123, product-list, home-featured,
//              category-5, category-list, search-results
```

**3. TTL-Based Expiration:**

```javascript
// Expiration timeline:

T=0s: cache.set('key', value, { ttl: 60000 });
      Stored: { value, expiresAt: now + 60000 }

T=30s: cache.get('key')
       Age: 30s < 60s → FRESH → Return value

T=70s: cache.get('key')
       Age: 70s > 60s → EXPIRED → Return null, delete entry

T=80s: cache.get('key')
       Entry deleted → MISS → Fetch from source

// Automatic cleanup (garbage collection):
setInterval(() => {
  const now = Date.now();
  
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) {
      cache.delete(key); // Remove expired
    }
  }
}, 60000); // Run every minute
```

**4. Stale-While-Revalidate:**

```
User Request Timeline:

T=0s: First request
  ├─ Cache MISS
  └─ Fetch from network (300ms)
      └─ Store in cache with timestamp

T=30s: Second request (within fresh period)
  ├─ Cache HIT (fresh)
  ├─ Age: 30s < 60s (fresh)
  └─ Return cached (0ms) ✓

T=90s: Third request (stale period)
  ├─ Cache HIT (stale but acceptable)
  ├─ Age: 90s > 60s (expired) but < 360s (max-stale)
  ├─ Return cached immediately (0ms) ✓
  └─ Background: Fetch fresh data (non-blocking)
      └─ Update cache for next request

T=400s: Fourth request (too stale)
  ├─ Cache HIT (too stale)
  ├─ Age: 400s > 360s (max-stale exceeded)
  ├─ Must fetch fresh (300ms) ✗
  └─ User waits for network

// HTTP header equivalent:
Cache-Control: max-age=60, stale-while-revalidate=300
```

**5. Version-Based Invalidation:**

```javascript
// Immutable content-addressable keys

// Version 1: Initial data
const data1 = { name: 'Widget', price: 99 };
const hash1 = md5(JSON.stringify(data1)); // 'a3f2b4e1'
cache.set(`product-123-${hash1}`, data1);

// Version 2: Price updated
const data2 = { name: 'Widget', price: 79 };
const hash2 = md5(JSON.stringify(data2)); // '7c9d8e2f' (different!)
cache.set(`product-123-${hash2}`, data2);

// Application tracks current hash
currentHash['product-123'] = hash2;

// Fetch with current hash
const key = `product-123-${currentHash['product-123']}`;
const data = cache.get(key); // Gets v2

// Old v1 key ('product-123-a3f2b4e1') still in cache
// but unreachable → eventually evicted by LRU

// No explicit deletion needed!
```

**6. Tag-Based Bulk Invalidation:**

```
Cache entries with tags:

┌─────────────────────────────────────────────┐
│ Key: /api/products/123                      │
│ Tags: ['product', 'category-5', 'featured'] │
│ Value: { name: 'Widget', ... }              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Key: /api/products/456                      │
│ Tags: ['product', 'category-5']             │
│ Value: { name: 'Gadget', ... }              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Key: /api/products/789                      │
│ Tags: ['product', 'category-8', 'on-sale']  │
│ Value: { name: 'Doohickey', ... }           │
└─────────────────────────────────────────────┘

// Invalidate by tag:
invalidateByTag('category-5');

// Result: Invalidates /api/products/123 and /api/products/456
// (both have 'category-5' tag)

// Reverse index for efficiency:
tagIndex = {
  'product': ['/api/products/123', '/api/products/456', '/api/products/789'],
  'category-5': ['/api/products/123', '/api/products/456'],
  'category-8': ['/api/products/789'],
  'featured': ['/api/products/123'],
  'on-sale': ['/api/products/789']
};

// Single tag purge → O(1) lookup → batch delete
```

**Mental Model:**

Think of cache invalidation like **library book checkout**:

**TTL-based**: Book due date (must return after 2 weeks)
- Simple, automatic
- Book might be outdated when you return it
- No communication with library until due date

**Event-based**: Library texts you when new edition available
- Immediate notification
- Return old book, get new edition
- Requires library's texting system

**Version-based**: Library assigns new ISBN to each edition
- Old edition still on shelf (unreachable)
- You always request latest ISBN
- Old editions eventually removed (LRU)

**Dependency-based**: Book has "See also" references
- When one book updates, related books flagged
- Ensures consistency across topic

---

**Key Takeaway for Interviews:**

Cache invalidation is about **balancing performance and correctness** across multiple cache layers. **TTL-based** (time expiration) is simple but serves stale data until expiration. **Event-based** (invalidate on data change) is complex but provides strong consistency—we use Redis Pub/Sub or WebSockets to broadcast invalidation events from server to all caches (CDN, browser, Service Worker). **Version-based** (content-addressable keys) avoids explicit deletion—change data, change key. **Dependency tracking** ensures cascading invalidation (product changes → invalidate product list). **Tag-based** enables bulk invalidation (one API call purges entire category). **Stale-while-revalidate** serves cached data instantly while refreshing background—best of both worlds. Real implementation: event-based for critical data (prices), TTL fallback for resilience, version-based for immutable assets, stale-while-revalidate for semi-static data. Measure staleness incidents, invalidation latency, cascade depth. Real impact: 98% fewer stale data complaints, <100ms end-to-end invalidation, cache hit ratio 89-94%, $2.7M annual benefit from eliminating incorrect data shown to users.

