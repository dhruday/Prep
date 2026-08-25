# Spring Cache Abstraction — @Cacheable, Caffeine, Redis
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Core idea**: Spring's `@EnableCaching` + `@Cacheable` annotation turns any method into a transparent cache; on first call, Spring executes the method and stores the result; on subsequent calls with the same arguments, Spring returns the stored result WITHOUT calling the method; the database query (or slow computation) is skipped entirely
- **Three key annotations**: `@Cacheable("products")` — cache the result; `@CacheEvict("products")` — remove cached results (on update/delete); `@CachePut("products")` — update the cache WITH the new result (always executes the method)
- **Cache key**: default = all method parameters serialized; `@Cacheable(value = "products", key = "#category")` for custom SpEL key; always include user-specific data in the key if the result is user-specific
- **Caffeine** (recommended for single-instance): fast in-memory cache; configure with `maximumSize`, `expireAfterWrite`, `expireAfterAccess`; zero network latency; lost on restart; NOT shared between pod replicas — each replica has its own independent cache
- **Redis** (required for multi-instance): in-memory data store that multiple pods all share; slight network latency (sub-millisecond on same network); survives pod restarts; required for horizontal scaling to avoid split-brain caching (each pod would have different cached data)
- **When NOT to cache**: highly volatile data (changes every request); user-specific sensitive data without user ID in the key (risk of data leakage between users); financial balances/inventory during checkout (must read fresh); anything where showing stale data has serious consequences
- 🆕 **Gap-to-bridge framing**: I've implemented `@Cacheable` with Caffeine at SAP for product catalog data and used the pattern consistently across Spring Boot services; I haven't personally tuned Redis cache at high scale (that was managed infrastructure), but I understand Redis vs Caffeine architecture, cache-aside vs write-through patterns, and the configuration approach for both
- ✅ **Hruday's anchor**: SAP Commerce Cloud product catalog — `getProducts(categoryId, filters, sort)` cached with Caffeine (30-minute TTL); cache eviction triggered by Kafka consumer when product update events arrive; database query rate dropped 75% during business hours (peak catalog browsing); product listing API P99 dropped from 180ms to 8ms for cache hits

---

## 1. One-Line Definition
Spring Cache Abstraction is a declarative caching layer using annotations (`@Cacheable`, `@CacheEvict`, `@CachePut`) that decouples cache logic from business code and supports pluggable backends (Caffeine, Redis, EhCache) through a uniform CacheManager interface.

---

## 2. The Problem It Solves

A product listing API that queries the database for every request works correctly but doesn't scale. With 1,000 concurrent users browsing the "Laptops" category, the database runs the same query 1,000 times in a minute, returning identical results (the product catalog doesn't change that frequently).

Each database query:
- Consumes a connection pool slot for its duration
- Uses database CPU and I/O
- Takes 8ms (even with the index from Topic 245)
- Returns the same 20 rows as the previous 999 requests

Caching the result means: the first request does the 8ms database query; requests 2 through 1,000 get the cached result in < 1ms without touching the database. Database connection pool pressure drops by 99.9% for cache-hits.

The right caching strategy is the difference between "this endpoint needs more database replicas" and "this endpoint is fine as-is."

---

## 3. How It Works Internally

### Spring Caching Proxy Mechanism

```
Without @Cacheable:
  Call: productService.getProducts("laptops", filters)
    → Executes method body every time
    → Hits database
    → Returns result
    → 8ms every call

With @Cacheable("products"):
  Spring wraps the bean in a CGLIB proxy (like @Transactional)
  
  Call 1: productService.getProducts("laptops", filters)
    → Proxy intercepts call
    → Computes cache key: "laptops::filter-hash-abc"
    → Checks CacheManager: key NOT in cache
    → Executes method body (8ms database query)
    → Stores result in cache under the key
    → Returns result
  
  Call 2: productService.getProducts("laptops", filters) [same args]
    → Proxy intercepts call
    → Computes cache key: "laptops::filter-hash-abc"
    → Checks CacheManager: key IS in cache
    → Returns cached result IMMEDIATELY
    → Method body NEVER executes
    → Returns result in < 1ms
  
  UPDATE: admin updates laptop product
    → @CacheEvict("products") fires
    → Removes "laptops::*" from cache
    → Next call to getProducts("laptops", filters) hits database again
    → Fresh result cached

Two-level cache concept:
  Level 1: Caffeine (in-memory, sub-millisecond)
  Level 2: Redis (shared across pods, sub-5ms)
  Spring doesn't do L1/L2 natively but 
  JetCache / j2cache or custom CacheManager can combine them
```

### Caffeine vs Redis Decision Matrix

```
CAFFEINE (in-process cache):
  ├── Latency: < 0.1ms (in-memory, same JVM heap)
  ├── Durability: NONE — cache cleared on pod restart
  ├── Sharing: NONE — each pod replica has its own independent cache
  ├── Memory: consumes Java heap (count against pod memory limit)
  ├── Scale: single instance or read-heavy workloads where each pod
  │          caching independently is acceptable
  └── Best for: single-instance services, stateless read caches where
                stale-by-one-restart is acceptable, low-memory environments

REDIS (remote in-memory store):
  ├── Latency: 0.3-2ms (network round-trip on same LAN/cluster network)
  ├── Durability: survives pod restarts (data in Redis, not in JVM heap)
  ├── Sharing: ALL pod replicas read/write the same cache
  ├── Memory: off JVM heap (uses Redis server memory)
  ├── Scale: essential for multi-replica deployments (consistent cache across replicas)
  └── Best for: multi-instance deployments, session data, shared app state,
                caches where all replicas must see the same data immediately

DECISION RULE:
  Single pod OR cache-miss-on-restart is acceptable → Caffeine
  Multiple pods AND must see consistent cache → Redis
  High-traffic multi-instance production → Redis (or L1 Caffeine + L2 Redis)
```

---

## 4. The Code

### Wrong Way — Missing or Incorrect Caching Patterns

```java
// ❌ WRONG — no cache, same expensive query runs for every request

@Service
public class ProductService {
    
    @Autowired ProductRepository productRepository;
    
    // ❌ This query runs 1,000 times if 1,000 users browse "laptops" in 1 minute
    // Even with a covering index (Topic 245), 1,000 × 8ms = 8 seconds of accumulated DB load
    public List<ProductDto> getProducts(String categoryId, ProductFilters filters) {
        return productRepository.findByCategoryWithFilters(categoryId, filters)
            .stream()
            .map(ProductDto::from)
            .toList();
    }
}
```

```java
// ❌ WRONG — hand-coded cache without Spring abstraction

@Service
public class ProductService {
    
    // ❌ Hand-coding cache logic pollutes business methods
    private final Map<String, List<ProductDto>> cache = new ConcurrentHashMap<>();
    
    public List<ProductDto> getProducts(String categoryId, ProductFilters filters) {
        String key = categoryId + ":" + filters.hashCode();
        
        // ❌ No TTL — cache grows forever, memory leak
        // ❌ No eviction on update — stale data served indefinitely
        // ❌ No metrics — no visibility into hit/miss rates
        // ❌ Not thread-safe under certain compound operations
        if (cache.containsKey(key)) {
            return cache.get(key);
        }
        
        List<ProductDto> result = productRepository.findByCategoryWithFilters(categoryId, filters)
            .stream().map(ProductDto::from).toList();
        cache.put(key, result);
        return result;
    }
}
```

```java
// ❌ WRONG — caching user-specific data without user ID in key

@Service
public class UserDashboardService {
    
    // ❌ SECURITY BUG: user-specific data cached with only "dashboard" key
    // User A's dashboard gets cached as "dashboard"
    // User B asking for "dashboard" gets User A's data back!
    // This is a data leakage vulnerability (OWASP: Security Misconfiguration)
    @Cacheable("dashboard")
    public DashboardData getDashboard(Long userId) {  // userId NOT in cache key by default
        return dashboardRepository.loadForUser(userId);
    }
    
    // ❌ ALSO WRONG — caching financial balances
    @Cacheable("account-balance")
    public BigDecimal getAccountBalance(Long accountId) {
        // ❌ Balance changes with every transaction — stale balance during checkout
        // User might see "₹5,000 balance" but actual balance is ₹200 after a recent transaction
        // Never cache financial balances, inventory counts, or anything used in business logic
        return accountRepository.findBalance(accountId);
    }
}
```

### Right Way — Production Caching with All Three Annotations

```java
// ✅ RIGHT — Spring Cache with Caffeine backend

// 1. Enable caching in the Spring Boot application
@SpringBootApplication
@EnableCaching
public class EcommerceApplication { ... }

// 2. Configure Caffeine CacheManager
@Configuration
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        
        // ✅ Per-cache configuration (different TTLs for different data types)
        cacheManager.registerCustomCache("products",
            Caffeine.newBuilder()
                .maximumSize(1000)              // max 1,000 cache entries
                .expireAfterWrite(30, TimeUnit.MINUTES)  // expire 30 min after write
                .recordStats()                  // enable hit/miss statistics
                .build()
        );
        
        cacheManager.registerCustomCache("categories",
            Caffeine.newBuilder()
                .maximumSize(100)               // categories: smaller, fewer entries
                .expireAfterWrite(2, TimeUnit.HOURS)  // categories change rarely
                .recordStats()
                .build()
        );
        
        cacheManager.registerCustomCache("product-detail",
            Caffeine.newBuilder()
                .maximumSize(5000)              // individual product pages: more entries
                .expireAfterWrite(15, TimeUnit.MINUTES)  // shorter TTL (product details change)
                .expireAfterAccess(5, TimeUnit.MINUTES)  // evict if not accessed in 5 min (cold entries)
                .recordStats()
                .build()
        );
        
        return cacheManager;
    }
}
```

```java
// ✅ Service with @Cacheable, @CacheEvict, @CachePut

@Service
@Slf4j
public class ProductService {
    
    @Autowired ProductRepository productRepository;
    
    // ✅ @Cacheable: cache the result by categoryId + filters hash
    // SpEL key: combines multiple parameters into one cache key string
    @Cacheable(
        value = "products",
        key = "#categoryId + ':' + #filters.hashCode()",
        unless = "#result.isEmpty()"  // ← don't cache empty results (might be a DB miss)
    )
    public List<ProductDto> getProducts(String categoryId, ProductFilters filters) {
        log.debug("Cache MISS — querying database for products: category={}", categoryId);
        return productRepository.findByCategoryWithFilters(categoryId, filters)
            .stream()
            .map(ProductDto::from)
            .toList();
        // ← On first call: executes, caches result
        // ← On repeat calls with same args: returns cached result, method NOT called
    }
    
    // ✅ @Cacheable for individual product detail — key = product ID
    @Cacheable(value = "product-detail", key = "#productId")
    public ProductDetailDto getProductDetail(Long productId) {
        return productRepository.findByIdWithDetails(productId)
            .map(ProductDetailDto::from)
            .orElseThrow(() -> new EntityNotFoundException("Product not found: " + productId));
    }
    
    // ✅ @CacheEvict: clear product cache when product is updated
    // allEntries = true: clear ALL entries in "products" cache (category browsing cache)
    // because we don't know which category filter results included this product
    @CacheEvict(value = {"products", "product-detail"}, allEntries = true)
    @Transactional
    public ProductDto updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new EntityNotFoundException("Product not found: " + productId));
        product.update(request);
        return ProductDto.from(productRepository.save(product));
        // ← After this method, "products" and "product-detail" caches are fully cleared
        // Next call to getProducts() or getProductDetail() will hit DB and re-cache
    }
    
    // ✅ @CachePut: update cache with the fresh result after update (no full eviction)
    // Use when you want to update ONE entry in the cache (not clear the whole cache)
    @CachePut(value = "product-detail", key = "#productId")
    @Transactional
    public ProductDetailDto updateProductPrice(Long productId, BigDecimal newPrice) {
        Product product = productRepository.findById(productId)
            .orElseThrow();
        product.setFinalPrice(newPrice);
        product = productRepository.save(product);
        return ProductDetailDto.from(product);
        // ← Method ALWAYS executes; result is PUT in cache under key productId
        // Callers immediately get the fresh price from cache (no stale price window)
    }
    
    // ✅ SECURE — user-specific cache: MUST include userId in the key
    @Cacheable(value = "user-wishlist", key = "#userId")
    public List<ProductDto> getUserWishlist(Long userId) {
        // ← userId in key: User A's wishlist cached as "user-wishlist::12345"
        //                  User B's wishlist cached as "user-wishlist::67890"
        // No cross-user data leakage possible
        return wishlistRepository.findByUserId(userId)
            .stream()
            .map(item -> ProductDto.from(item.getProduct()))
            .toList();
    }
}
```

### Kafka-Triggered Cache Eviction (SAP Pattern)

```java
// ✅ Cache eviction driven by Kafka events — no polling, no manual eviction calls
// This is how SAP Commerce Cloud keeps caches fresh across the product catalog

@Service
@Slf4j
public class ProductCacheEvictionConsumer {
    
    @Autowired ProductService productService;   // ← has @CacheEvict methods
    @Autowired CacheManager cacheManager;
    
    // Listen to product update events published by the admin/catalog management service
    @KafkaListener(topics = "product.updated", groupId = "product-cache-eviction")
    public void onProductUpdated(ProductUpdatedEvent event) {
        log.info("Product update event received: productId={}, categories={}",
            event.getProductId(), event.getAffectedCategories());
        
        // ✅ Evict the specific product detail cache entry
        Cache productDetailCache = cacheManager.getCache("product-detail");
        if (productDetailCache != null) {
            productDetailCache.evict(event.getProductId());  // evict only this product
        }
        
        // ✅ Evict the product listing cache for affected categories
        // (we know which categories the product belongs to from the event)
        Cache productsCache = cacheManager.getCache("products");
        if (productsCache != null) {
            event.getAffectedCategories().forEach(categoryId -> {
                // Evict all keys starting with this categoryId (pattern-based eviction)
                // Note: Caffeine doesn't support pattern-based eviction natively
                // — use invalidateAll() for full cache clear when precision isn't feasible
                productsCache.invalidate();  // for Caffeine: full clear is safer than partial
            });
        }
        
        log.info("Cache evicted for productId={}", event.getProductId());
    }
    
    // ✅ Listen for bulk catalog refreshes (e.g., pricing update batch)
    @KafkaListener(topics = "catalog.refreshed", groupId = "product-cache-eviction")
    public void onCatalogRefreshed(CatalogRefreshedEvent event) {
        // Full catalog refresh: clear all product caches
        log.info("Catalog refresh event: clearing all product caches");
        Objects.requireNonNull(cacheManager.getCache("products")).invalidate();
        Objects.requireNonNull(cacheManager.getCache("product-detail")).invalidate();
        log.info("All product caches cleared");
    }
}
```

### Redis Configuration for Multi-Instance

```java
// ✅ Redis as cache backend for multi-pod deployments

// application-production.yml
spring:
  cache:
    type: redis          # switches CacheManager to RedisCacheManager
    redis:
      time-to-live: 1800000   # default 30-minute TTL (overridden per cache below)
      key-prefix: "ecommerce:"
      use-key-prefix: true
  redis:
    host: ${REDIS_HOST:redis}
    port: ${REDIS_PORT:6379}
    password: ${REDIS_PASSWORD}
    ssl:
      enabled: true          # ← always TLS for Redis in production
    lettuce:
      pool:
        max-active: 20
        max-idle: 10
        min-idle: 5

@Configuration
public class RedisCacheConfig {
    
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // ✅ Per-cache TTL configuration (override default)
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();
        
        cacheConfigs.put("products", RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair
                    .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair
                    .fromSerializer(new GenericJackson2JsonRedisSerializer()))
        );
        
        cacheConfigs.put("categories", RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofHours(2))
        );
        
        cacheConfigs.put("product-detail", RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(15))
        );
        
        return RedisCacheManager.builder(connectionFactory)
            .withInitialCacheConfigurations(cacheConfigs)
            .transactionAware()   // ← evictions/puts participate in Spring transactions
            .build();
    }
}
```

### Cache Metrics with Micrometer

```java
// ✅ Expose Caffeine cache statistics via Micrometer

@Configuration
public class CacheMetricsConfig {
    
    @Autowired MeterRegistry meterRegistry;
    @Autowired CacheManager cacheManager;
    
    @PostConstruct
    public void bindCacheMetrics() {
        // Register Caffeine cache stats with Micrometer
        // Requires: Caffeine.newBuilder().recordStats() in cache configuration
        if (cacheManager instanceof CaffeineCacheManager caffeineCacheManager) {
            List.of("products", "categories", "product-detail").forEach(cacheName -> {
                Cache cache = cacheManager.getCache(cacheName);
                if (cache instanceof CaffeineCache caffeineCache) {
                    CacheMetricsRegistrar.bindCaffeineCacheToRegistry(
                        meterRegistry, cacheName, caffeineCache.getNativeCache());
                }
            });
        }
    }
}

// ✅ Observing cache health:
// cache.gets{cache="products",result="hit"}         — hit count
// cache.gets{cache="products",result="miss"}        — miss count
// cache.size{cache="products"}                      — current entry count
// cache.evictions{cache="products"}                 — evictions (due to size/TTL)
// cache.evictions.weight{cache="products"}          — eviction weight

// Grafana dashboard: hit rate = hits / (hits + misses)
// Target: > 80% hit rate for stable catalog data
// If hit rate is low: TTL may be too short, or cache key is too specific (too many distinct keys)
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does Spring's @Cacheable annotation work under the hood?"

**Hruday's answer:**
> `@Cacheable` is implemented using Spring AOP and CGLIB proxies, the same mechanism as `@Transactional`. When you annotate a Spring bean method with `@Cacheable`, Spring creates a proxy around that bean at startup time. Every call to that method goes through the proxy first.
>
> The proxy computes a cache key from the method parameters — by default, all parameters are combined; you can override this with a SpEL expression in the `key` attribute. The proxy checks the `CacheManager` (which manages the named caches like "products") for an entry with that key. If the entry exists (cache hit), the proxy returns the cached value without invoking the actual method. If the entry is absent (cache miss), the proxy calls the real method, gets the result, stores it in the cache under the computed key, and returns it.
>
> An important limitation: Spring AOP proxy only intercepts external method calls — calls that go through the Spring container. If a method within the SAME class calls another `@Cacheable` method on the same class, the call bypasses the proxy (self-invocation) and the caching doesn't happen. This is the same limitation as `@Transactional`. The fix: inject a reference to the bean itself through the container (`@Autowired private ProductService self;`) or restructure to put the cached method in a different bean.
>
> `@CacheEvict` and `@CachePut` follow the same proxy mechanism. `@CacheEvict` removes one or all entries from the named cache after (or before) the method executes. `@CachePut` runs the method unconditionally and stores the fresh result in the cache — useful for update operations where you want to refresh the cache entry rather than evict and re-load on next access.

---

### Q2 — SAP Experience Deep Dive
**Interviewer asks:** "Tell me about the caching you implemented at SAP Commerce."

**Hruday's answer:**
> SAP Commerce Cloud's product listing endpoint was the highest-traffic endpoint in the system. After fixing the N+1 query problem and adding the covering index (which brought the database query from 2.3 seconds to 8ms), the endpoint was already much faster. But at peak traffic — lunch and evening browse windows — the database was still receiving thousands of identical queries for the top 20 category/filter combinations.
>
> We added `@Cacheable` on `getProducts(categoryId, filters, sort)` with a Caffeine cache configured with `maximumSize=1000` and `expireAfterWrite=30 minutes`. The cache key combined category ID and a hash of the filter and sort parameters.
>
> The eviction strategy was the most important design decision. We didn't want time-based expiry to be the ONLY eviction mechanism because a product price update should be visible quickly (within seconds, not 30 minutes). So we used a Kafka consumer: when a product update event arrived on the `product.updated` topic, the consumer evicted the affected cache entries immediately. The 30-minute TTL was a safety net, not the primary eviction mechanism.
>
> Results: database query rate for product listing dropped 75% during business hours. The 75% figure came from comparing the query count in the slow query log before and after — before caching, we saw 12,000 product listing queries per hour during peak; after, it was 3,000. Cache hit rate was about 78% (measured by Caffeine's `recordStats()` exposed via Micrometer). API P99 for cached hits was 8ms (essentially the serialization time); for cache misses it was still 15-20ms (index lookup time plus Spring proxy overhead). The cache reduced both latency and database load simultaneously.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use Caffeine over Redis for caching? When would you switch to Redis?"

**Hruday's answer:**
> Caffeine stores data in the JVM heap — it's as fast as a HashMap lookup (< 0.1ms). Zero network. Zero serialization overhead for the most common types. If the service runs as a single instance (or if serving stale data per replica is acceptable), Caffeine is strictly better for read performance.
>
> The moment you have multiple replicas, Caffeine creates a cache coherence problem. If you have 5 pods running the product service, each pod has its own Caffeine cache. When a product price is updated, you'd need to evict the cache on all 5 pods simultaneously. This is complex to get right, especially with the asynchronous nature of Kafka-based eviction — there's a window where some pods show the old price and others show the new price.
>
> Redis stores data in a single external location that all pods share. All five pods read from the same Redis instance. When you evict a key from Redis, all pods immediately see the miss on next access. Cache coherence is automatic.
>
> The decision rule: if the service has or will have multiple replicas AND cache consistency across replicas matters, use Redis. If single-instance or if cache inconsistency between replicas is acceptable (eventual consistency, non-critical data), Caffeine.
>
> The latency tradeoff: Caffeine read < 0.1ms, Redis read 0.5-2ms. For most web services, 2ms vs 0.1ms is insignificant compared to the 8ms+ query it replaces. But for extremely latency-sensitive paths (< 5ms total budget), Caffeine is the right choice.
>
> A common production pattern: Caffeine as L1 (in-process, short TTL of 1-2 minutes for hot data) and Redis as L2 (shared, longer TTL of 30 minutes). First check L1; on L1 miss, check L2; on L2 miss, query the database and populate both. This hybrid gives both low latency and cross-pod consistency.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design a caching strategy for a high-traffic product catalog used by an e-commerce mobile app."

**Hruday's answer:**
> Four caching layers, each serving a different purpose.
>
> CDN layer — for static product images and assets. These are immutable (new image = new URL). Cache-Control with long max-age. Not Spring Cache — this is CDN/HTTP caching. Handled by image optimization (Topic 237 territory).
>
> Application cache (Spring @Cacheable / Redis) — for API responses: product listings by category and filter, individual product details, category hierarchy. Redis for multi-pod consistency. TTLs: product listing 15 minutes, product detail 30 minutes, category tree 2 hours. Eviction on update via Kafka events as the primary eviction mechanism; TTL is the safety net.
>
> Cache key design is critical: always include all query parameters that affect the result (category, filters, sort, page). For a search result: the search query string + applied filters is the key. Don't include user ID unless the result is user-specific — otherwise you create a unique cache key per user and hit rate approaches zero.
>
> What NOT to cache: inventory count (must be fresh during checkout), user cart (user-specific, frequently changes), personalized recommendations (user ID × catalog size = too many keys), real-time pricing (promotional prices can change per-minute).
>
> Monitoring: Micrometer metrics for hit rate per cache name. Target > 75% hit rate for catalog caches. Redis memory usage alert (prevent eviction storms when Redis is full). Stale data monitoring: if a price update is not reflected within 60 seconds (should be near-instant via Kafka eviction), alert.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Caching everything speeds everything up" | "I'll cache all my service methods to improve performance" | Caching adds complexity, introduces eventual consistency (stale data windows), increases memory usage, and requires careful eviction strategy; caching the wrong data causes bugs (security leakage, stale financial data) or wastes memory (user-specific data with userID in key creates a cache entry per user = cache with millions of entries and near-zero hit rate); only cache data that is: (1) expensive to compute or fetch, (2) read far more often than it changes, (3) safe to serve slightly stale — product catalog YES, user account balance NO, personalized recommendations DEPENDS; always measure the hit rate after adding a cache; a cache with < 20% hit rate is adding complexity without meaningful performance gain |
| "@CacheEvict is always the right update pattern" | "I @CacheEvict on every write to keep cache fresh" | `@CacheEvict` with `allEntries = true` clears the entire named cache on every update; for a cache with 1,000 product entries, updating one product evicts all 1,000 entries, causing a thundering herd of cache misses for the next few seconds until the cache warms back up; under high traffic, a product update followed by thousands of simultaneous cache misses = sudden spike in database queries for an empty cache; better options: `@CachePut` to update only the changed entry, targeted eviction by specific key, or a short TTL combined with lazy re-population; for bulk updates, consider a staggered re-warming strategy |
| "Redis is always better than Caffeine" | "I'll use Redis from the start as it scales better" | Redis adds network latency (0.5-2ms vs < 0.1ms for in-process) and operational complexity (manage Redis cluster, TLS certs, failover); for a single-instance service or a service where cross-pod cache consistency isn't critical, Redis is over-engineering; start with Caffeine (zero operational overhead, faster reads); switch to Redis when multi-pod deployment makes cache coherence a real problem; Spring Cache's CacheManager abstraction makes this switch a config change with no code changes in the service layer — that's exactly why the abstraction exists |

---

## 7. Hruday's Real Experience Hook
> "The product catalog caching at SAP was satisfying because the change was so localized — three annotations (@EnableCaching + two cache configurations) and a Kafka consumer for targeted eviction. The database saw 75% less query load immediately. No architecture change, no distributed system added, just correctly applied caching on the right data.
>
> What taught me to be careful about caching was an earlier mistake. I once added `@Cacheable` to a method that loaded user dashboard data without including the user ID in the cache key. In development (single test user), it worked perfectly. In staging with two test users, User B's first load returned User A's data — because the cached response for 'dashboard' in User A's session was returned for User B's request. That's a data leakage bug. It was caught in staging (fortunately), but it made me permanently careful about cache key design for user-scoped data.
>
> The rule is simple: if the result can vary by user, the user identifier MUST be in the cache key. And if the data is sensitive (financial data, personal information), I ask myself twice whether it should be cached at all, versus always hitting the authoritative source."

---

## 8. Scale Evolution

**Small app (single instance, < 10K req/day) →** Caffeine only; simple `@Cacheable` on catalog read methods; default CaffeineCacheManager; no need for custom TTL per cache; TTL of 10-30 minutes; no Kafka eviction — time-based TTL sufficient at this scale.

**Medium app (3-5 instances, 10K–1M req/day) →** Redis for consistent cross-pod caching; per-cache TTL configuration via `RedisCacheManager`; Kafka-based targeted eviction for product updates (avoids full cache clears); Micrometer cache hit rate metrics; Redis TLS in production.

**Large scale (SAP Commerce, 50+ instances, millions req/day) →** L1 Caffeine (1-2 min TTL, hot data) + L2 Redis (30 min TTL, full catalog); Debezium CDC for real-time cache invalidation as product data changes; Redis Cluster for horizontal Redis scaling; separate Redis instances per data domain (products vs sessions vs rate limiting); cache warming on deploy (pre-populate top-N cache keys from Kafka event replay or DB query); detailed hit rate SLAs per cache.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Exchange rates, merchant configs, fee structures — frequently read, rarely changed; cached to avoid DB hits on every transaction; careful NOT to cache financial balances; Redis for consistent multi-pod caching in payment processing environments | What to cache vs not cache in financial systems; Redis multi-pod consistency; @CachePut for config updates |
| Swiggy / Meesho | Restaurant menus and product catalogs (millions of reads, occasional writes); cached at service layer; Redis for cross-pod consistency; menu updates trigger cache eviction via Kafka (same pattern); personalized data NOT cached (user-specific) | Product/menu catalog caching pattern; Kafka eviction; hit rate monitoring |
| Adobe / Microsoft | Document metadata, template libraries, font caches — expensive to regenerate; Azure Cache for Redis as managed alternative; Spring Cache abstraction works with both Redis and Azure Cache via same Lettuce client | Spring Cache with managed Redis equivalent; TTL design for document metadata; cache-aside vs write-through distinction |
| SAP Labs | 🆕 direct experience: `getProducts(categoryId, filters)` Caffeine cache, 30-min TTL, Kafka-based eviction on product.updated topic; 75% DB query rate reduction; 78% cache hit rate (Micrometer); `@CachePut` for price updates; user-specific data key design lesson | Specific hit rate; Kafka eviction integration; per-cache TTL; both @Cacheable and @CacheEvict and @CachePut usage; security lesson about cache key design |

---

## 10. Related Topics — What to Study Next

- **Topic 245 — Database Index Strategy** — caching and indexing are complementary; caching eliminates the query entirely for cache hits (best case); indexes make the fallback query fast for cache misses (necessary case); both are required: an indexed query that takes 8ms is fine as the cache-miss path; a non-indexed query that takes 2 seconds is unacceptable even for cache misses
- **Topic 244 — N+1 Query Problem** — if the method being cached internally has N+1 queries, the cache saves those N+1 queries from running on repeat requests but doesn't fix the problem — they still run on every cache MISS; fix N+1 first, then add caching over the fixed queries
- **Topic 247 — Async Processing / Kafka** — the Kafka consumer used for cache eviction (product.updated → evict cache) shows a clean integration pattern; async processing and caching work together: async writes update the database, events trigger cache eviction, next read repopulates the cache with fresh data — the eventual consistency lifecycle
- **Redis Data Structures (System Design)** — beyond Spring Cache's key-value caching, Redis supports sorted sets (leaderboards), streams (event log), pub/sub (real-time notifications), and HyperLogLog (cardinality estimation); understanding Redis as a general data structure server (not just a cache backend) answers system design questions about rate limiting (Redis INCR), session storage, and real-time features

---

*Part 14 · Spring Cache Abstraction — @Cacheable, Caffeine, Redis · Full Stack Interview Guide · Hruday D · 2026*
