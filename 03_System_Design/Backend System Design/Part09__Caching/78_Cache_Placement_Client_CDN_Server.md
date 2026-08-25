# 78. Cache Placement (Client, CDN, Server)

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Cache Placement?

**Cache placement** refers to the strategic positioning of caches at different layers of the system architecture (client-side, CDN, server-side, database) to optimize latency, reduce load, and minimize cost.

**The Multi-Tier Caching Strategy**:

```
┌────────────────────────────────────────────────────────┐
│         MULTI-TIER CACHING ARCHITECTURE                │
└────────────────────────────────────────────────────────┘

User Request: "Show product page for iPhone 15"
    ↓
┌─────────────────────────────────────────────────────────┐
│ TIER 1: Client-Side Cache (Browser / Mobile App)       │
│ - Location: User's device (browser localStorage, app)  │
│ - Latency: 0ms (no network call, instant!)            │
│ - Hit Ratio: 70-90% (frequently accessed pages)        │
│ - Storage: 5-50MB (limited by device)                  │
│ - TTL: 1-24 hours (persistent across sessions)         │
│                                                         │
│ Example: User visited iPhone 15 page yesterday         │
│ → Cached in browser → Instant load (0ms) ✅           │
└─────────────────────┬───────────────────────────────────┘
                      │ Cache MISS (not on device)
                      ↓
┌─────────────────────────────────────────────────────────┐
│ TIER 2: CDN Cache (Content Delivery Network)           │
│ - Location: Edge servers (300+ locations worldwide)    │
│ - Latency: 10-50ms (nearest edge, 1 hop)              │
│ - Hit Ratio: 90-99% (popular content cached globally)  │
│ - Storage: 100GB-10TB per edge (massive capacity)      │
│ - TTL: 1 hour - 7 days (static assets cached long)     │
│                                                         │
│ Example: iPhone 15 images cached on CloudFront         │
│ → Served from nearest edge (New York) → 20ms ✅        │
└─────────────────────┬───────────────────────────────────┘
                      │ Cache MISS (not on edge)
                      ↓
┌─────────────────────────────────────────────────────────┐
│ TIER 3: Server-Side Cache (Application / Redis)        │
│ - Location: Application server / Redis cluster         │
│ - Latency: 1-5ms (in-memory, same datacenter)         │
│ - Hit Ratio: 95-99% (hot data cached in Redis)         │
│ - Storage: 16GB-1TB (Redis cluster)                    │
│ - TTL: 5 minutes - 1 hour (dynamic data)               │
│                                                         │
│ Example: iPhone 15 price, inventory cached in Redis    │
│ → Application queries Redis → 2ms ✅                   │
└─────────────────────┬───────────────────────────────────┘
                      │ Cache MISS (not in Redis)
                      ↓
┌─────────────────────────────────────────────────────────┐
│ TIER 4: Database Cache (PostgreSQL Buffer Pool)        │
│ - Location: Database server memory                     │
│ - Latency: 5-20ms (in-memory, no disk I/O)            │
│ - Hit Ratio: 80-95% (frequently queried data)          │
│ - Storage: 64GB-512GB (database RAM)                   │
│ - TTL: N/A (managed by database, LRU eviction)         │
│                                                         │
│ Example: iPhone 15 product row cached in buffer pool   │
│ → Database returns from memory → 10ms ✅               │
└─────────────────────┬───────────────────────────────────┘
                      │ Cache MISS (cold data)
                      ↓
┌─────────────────────────────────────────────────────────┐
│ TIER 5: Disk (No Cache, Slowest)                       │
│ - Location: Database SSD/HDD                           │
│ - Latency: 20-100ms (disk I/O, mechanical seek)       │
│ - Hit Ratio: N/A (fallback, last resort)              │
│                                                         │
│ Example: Rare product, not cached anywhere             │
│ → Database reads from disk → 50ms ❌ (slow)           │
└─────────────────────────────────────────────────────────┘

PERFORMANCE SUMMARY:
═══════════════════════════════════════════════════════
Layer           | Latency | Hit Ratio | Traffic Served
───────────────────────────────────────────────────────
Client Cache    | 0ms     | 70%       | 70% (instant)
CDN Cache       | 20ms    | 20%       | 20% (fast)
Server Cache    | 2ms     | 8%        | 8% (very fast)
Database Cache  | 10ms    | 1.5%      | 1.5% (acceptable)
Disk (no cache) | 50ms    | 0.5%      | 0.5% (slow)

Weighted Average Latency:
0.70×0ms + 0.20×20ms + 0.08×2ms + 0.015×10ms + 0.005×50ms = 4.5ms

vs No Caching: 100% disk reads = 50ms average (11x slower)
```

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Client-Side Caching (Browser / Mobile App)

**Browser caching** (HTTP cache, localStorage, Service Workers):

**HTTP Cache Headers** (control browser caching):
```http
# Static assets (images, CSS, JS): Long TTL (1 year)
HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable
ETag: "abc123"
Expires: Wed, 15 Jan 2025 00:00:00 GMT

# Dynamic content (HTML, API responses): Short TTL (5 minutes)
HTTP/1.1 200 OK
Cache-Control: private, max-age=300, must-revalidate
ETag: "def456"
```

**Cache-Control directives**:

| Directive | Meaning | Use Case |
|-----------|---------|----------|
| `public` | Cacheable by browsers and CDNs | Static assets (images, CSS, JS) |
| `private` | Cacheable by browser only (not CDN) | User-specific data (profile, cart) |
| `no-cache` | Must revalidate with server (ETag check) | Frequently updated content |
| `no-store` | Never cache (always fresh) | Sensitive data (bank balance, personal info) |
| `max-age=300` | Cache for 300 seconds (5 minutes) | Dynamic content (product prices) |
| `immutable` | Content never changes (fingerprinted assets) | JS bundles (app.abc123.js) |

**Example: Amazon product page**:
```http
# Product HTML (dynamic, 5-minute cache):
GET /product/B08L5M9BTJ HTTP/1.1
Host: www.amazon.com

HTTP/1.1 200 OK
Cache-Control: private, max-age=300
ETag: "product-v123"
Content-Type: text/html

# Product image (static, 1-year cache):
GET /images/iphone-15.jpg HTTP/1.1
Host: images.amazon.com

HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable
ETag: "img-abc123"
Content-Type: image/jpeg

# First request: 50ms (fetch from server)
# Next requests (within 5 minutes): 0ms (served from browser cache, instant!)
```

**LocalStorage / SessionStorage** (application-controlled):
```javascript
// Store user preferences in browser
localStorage.setItem('theme', 'dark');
localStorage.setItem('language', 'en');

// Cache API response (with timestamp for expiration)
const cacheData = (key, data, ttlSeconds) => {
    const item = {
        value: data,
        expiry: Date.now() + (ttlSeconds * 1000)
    };
    localStorage.setItem(key, JSON.stringify(item));
};

const getCachedData = (key) => {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    
    // Check if expired
    if (Date.now() > item.expiry) {
        localStorage.removeItem(key);
        return null;
    }
    
    return item.value;
};

// Usage: Cache user profile for 30 minutes
const fetchUserProfile = async (userId) => {
    // Check cache first
    const cached = getCachedData(`user-${userId}`);
    if (cached) {
        console.log('✅ Cache hit: Loaded from localStorage (0ms)');
        return cached;
    }
    
    // Cache miss: Fetch from API
    const response = await fetch(`/api/users/${userId}`);
    const user = await response.json();
    
    // Store in cache (30 minutes TTL)
    cacheData(`user-${userId}`, user, 30 * 60);
    console.log('❌ Cache miss: Fetched from API (150ms)');
    
    return user;
};

// First call: 150ms (API fetch)
// Subsequent calls (within 30 min): 0ms (localStorage, instant!)
```

**Service Workers** (offline-first caching, PWA):
```javascript
// service-worker.js (runs in background, intercepts network requests)
const CACHE_NAME = 'app-v1';
const STATIC_ASSETS = [
    '/',
    '/styles.css',
    '/app.js',
    '/logo.png'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Fetch: Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                console.log('✅ Cache hit:', event.request.url);
                return cachedResponse;  // Serve from cache (0ms)
            }
            
            console.log('❌ Cache miss:', event.request.url);
            return fetch(event.request);  // Fetch from network
        })
    );
});

// Benefits:
// - Offline support (app works without internet)
// - Instant loads (0ms for cached assets)
// - Reduced server load (static assets never hit server)
```

**Mobile app caching** (iOS / Android):
```swift
// iOS: NSCache (in-memory cache)
let cache = NSCache<NSString, UIImage>()

func loadImage(url: URL, completion: @escaping (UIImage?) -> Void) {
    let cacheKey = url.absoluteString as NSString
    
    // Check cache first
    if let cachedImage = cache.object(forKey: cacheKey) {
        print("✅ Cache hit: Loaded from NSCache (0ms)")
        completion(cachedImage)
        return
    }
    
    // Cache miss: Download image
    URLSession.shared.dataTask(with: url) { data, response, error in
        guard let data = data, let image = UIImage(data: data) else {
            completion(nil)
            return
        }
        
        // Store in cache
        self.cache.setObject(image, forKey: cacheKey)
        print("❌ Cache miss: Downloaded from network (200ms)")
        completion(image)
    }.resume()
}

// First call: 200ms (network download)
// Subsequent calls: 0ms (NSCache, instant!)
```

**Pros of Client-Side Caching**:
- **Fastest** (0ms latency, no network call)
- **Offline support** (app works without internet)
- **Reduced server load** (70%+ requests never hit server)

**Cons**:
- **Limited storage** (5-50MB browser, 100MB-1GB mobile app)
- **Staleness risk** (client may have outdated data)
- **Security risk** (sensitive data in client cache = potential leak)

---

### 2. CDN Caching (Content Delivery Network)

**CDN architecture** (CloudFront, Cloudflare, Akamai):

```
┌────────────────────────────────────────────────────────┐
│         CDN EDGE LOCATIONS (300+ worldwide)            │
└────────────────────────────────────────────────────────┘

User in New York requests: https://cdn.example.com/image.jpg
    ↓
┌─────────────────────────────────┐
│  CloudFront Edge (NYC)          │  Distance: 10 miles (user → edge)
│  - Check local cache            │  Latency: 15ms (1 hop)
│  - If HIT: Return immediately   │  ← Fast! 🚀
│  - If MISS: Fetch from origin   │
└────────────┬────────────────────┘
             │ Cache MISS (cold edge)
             ↓
┌─────────────────────────────────┐
│  Origin Server (us-east-1)      │  Distance: 500 miles (edge → origin)
│  - Application server           │  Latency: 50ms (internet routing)
│  - Database                     │
│  - Storage (S3)                 │
└─────────────────────────────────┘

Timeline:
- First request (cache MISS): 15ms (user → edge) + 50ms (edge → origin) = 65ms
- Next 999 requests (cache HIT): 15ms (user → edge, served from edge cache) ← 4.3x faster
- Cache TTL: 1 hour (images, videos), 1 day (static assets)

Without CDN:
- All requests: User → Origin (500 miles) = 100ms+ (slow)
- Origin overloaded: 1,000 requests/sec hitting origin server

With CDN (99% hit ratio):
- 990 requests: User → Edge (10 miles) = 15ms (fast ✅)
- 10 requests: User → Edge → Origin = 65ms (acceptable, rare)
- Origin load: 1,000 QPS → 10 QPS (100x reduction)
```

**CDN cache configuration** (CloudFront example):
```yaml
# CloudFront distribution config
origins:
  - domain_name: origin.example.com
    origin_id: my-origin
    s3_origin_config:
      origin_access_identity: cloudfront-access-identity

cache_behaviors:
  - path_pattern: /images/*
    target_origin_id: my-origin
    viewer_protocol_policy: redirect-to-https
    min_ttl: 3600          # Minimum 1 hour
    default_ttl: 86400     # Default 1 day
    max_ttl: 31536000      # Maximum 1 year
    compress: true         # Enable gzip compression
    allowed_methods: [GET, HEAD]
  
  - path_pattern: /api/*
    target_origin_id: my-origin
    viewer_protocol_policy: https-only
    min_ttl: 0             # No minimum (respect Cache-Control)
    default_ttl: 300       # Default 5 minutes
    max_ttl: 3600          # Maximum 1 hour
    forward_headers: [Authorization, X-User-Id]  # Forward auth headers
```

**Cache invalidation** (purge CDN cache on content update):
```bash
# AWS CloudFront: Invalidate specific paths
aws cloudfront create-invalidation \
    --distribution-id E1234567890ABC \
    --paths "/images/iphone-15.jpg" "/products/*"

# Cloudflare: Purge by URL
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"files":["https://example.com/image.jpg"]}'

# Cost: $0.005 per invalidation request (1,000 invalidations = $5)
# Alternative: Use versioned URLs (no invalidation needed)
# - Old: https://cdn.example.com/image.jpg
# - New: https://cdn.example.com/image.jpg?v=2 (new version, fresh cache)
```

**CDN for dynamic content** (cache API responses):
```javascript
// Origin server: Set Cache-Control for API responses
app.get('/api/products/:id', (req, res) => {
    const product = getProduct(req.params.id);
    
    // Cache product data for 5 minutes
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    // s-maxage = CDN cache TTL (5 min)
    // max-age = browser cache TTL (5 min)
    
    res.json(product);
});

// CDN behavior:
// - First request: CDN fetches from origin (50ms), caches for 5 minutes
// - Next requests (within 5 min): CDN serves from cache (15ms)
// - After 5 min: Cache expires, CDN fetches fresh data from origin
```

**Pros of CDN Caching**:
- **Low latency** (10-50ms, served from nearest edge)
- **Global reach** (300+ edge locations, worldwide)
- **DDoS protection** (absorb traffic spikes, protect origin)
- **Cost savings** (reduce origin bandwidth, $0.085/GB CDN vs $0.12/GB origin)

**Cons**:
- **Cost** ($0.085/GB CloudFront, $500-5K/month for high-traffic sites)
- **Invalidation complexity** (purge cache on updates, $0.005 per request)
- **Stale data** (long TTL = up to 1 day outdated, acceptable for static assets)

---

### 3. Server-Side Caching (Application / Redis)

**Redis cluster** (distributed in-memory cache):

```
┌────────────────────────────────────────────────────────┐
│         REDIS CLUSTER (3 Masters + 3 Replicas)         │
└────────────────────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Master 1        │  │ Master 2        │  │ Master 3        │
│ (Keys 0-5461)   │  │ (Keys 5462-10922│  │ (Keys 10923-16383)
│ 16GB RAM        │  │ 16GB RAM        │  │ 16GB RAM        │
│ 100K ops/sec    │  │ 100K ops/sec    │  │ 100K ops/sec    │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         ↓ Replicate          ↓ Replicate          ↓ Replicate
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Replica 1       │  │ Replica 2       │  │ Replica 3       │
│ (Read-only)     │  │ (Read-only)     │  │ (Read-only)     │
│ 16GB RAM        │  │ 16GB RAM        │  │ 16GB RAM        │
│ 100K ops/sec    │  │ 100K ops/sec    │  │ 100K ops/sec    │
└─────────────────┘  └─────────────────┘  └─────────────────┘

Total Capacity:
- Write: 300K ops/sec (3 masters × 100K each)
- Read: 600K ops/sec (3 masters + 3 replicas × 100K each)
- Storage: 48GB (3 masters × 16GB each)

Sharding Strategy:
- CRC16(key) % 16384 → Determine hash slot
- Route to appropriate master
- Example: CRC16("user:123") % 16384 = 7890 → Master 2
```

**Application-level caching** (cache layer):
```python
import redis
import json

class CacheLayer:
    def __init__(self):
        # Redis cluster connection
        self.redis = redis.RedisCluster(
            host='redis-cluster.example.com',
            port=6379,
            password='strong-password'
        )
    
    def get_user_profile(self, user_id):
        """Get user profile with caching"""
        cache_key = f"user:{user_id}:profile:v3"
        
        # Check cache first
        cached = self.redis.get(cache_key)
        if cached:
            print(f"✅ Cache hit: user:{user_id} (1ms)")
            return json.loads(cached)
        
        # Cache miss: Query database
        print(f"❌ Cache miss: user:{user_id} (30ms)")
        user = self.db.query("SELECT * FROM users WHERE id = ?", user_id)
        
        # Store in cache (TTL: 30 minutes)
        self.redis.setex(cache_key, 1800, json.dumps(user))
        
        return user
    
    def update_user_profile(self, user_id, new_data):
        """Update user profile and invalidate cache"""
        # Update database
        self.db.execute("UPDATE users SET name = ? WHERE id = ?", new_data['name'], user_id)
        
        # Invalidate cache (proactive)
        cache_key = f"user:{user_id}:profile:v3"
        self.redis.delete(cache_key)
        print(f"♻️ Cache invalidated: user:{user_id}")

# Performance:
# - Cache hit (95%): 1ms latency
# - Cache miss (5%): 30ms latency (database query + cache populate)
# - Average: 0.95×1 + 0.05×30 = 2.45ms (acceptable)
# - vs no cache: 30ms average (12x slower)
```

**Caching patterns**:

**1. Cache-Aside (Lazy Loading)**:
```python
def get_data(key):
    # Check cache first
    data = cache.get(key)
    if data:
        return data  # Cache hit
    
    # Cache miss: Load from database
    data = database.query(key)
    cache.set(key, data, ttl=300)
    return data

# Pros: Simple, only cache requested data
# Cons: Cache miss penalty (query database every time cache expires)
```

**2. Write-Through Cache**:
```python
def update_data(key, value):
    # Write to cache and database simultaneously
    database.update(key, value)
    cache.set(key, value, ttl=300)

# Pros: Cache always up-to-date
# Cons: Write latency (2 writes: cache + database)
```

**3. Write-Behind (Write-Back) Cache**:
```python
def update_data(key, value):
    # Write to cache immediately
    cache.set(key, value, ttl=300)
    
    # Async write to database (background job)
    queue.enqueue(lambda: database.update(key, value))

# Pros: Fast writes (no database wait)
# Cons: Data loss risk (if cache crashes before database write)
```

**Pros of Server-Side Caching**:
- **Very fast** (1-5ms, in-memory)
- **Flexible** (control TTL, eviction, invalidation)
- **Scalable** (Redis cluster handles millions of ops/sec)

**Cons**:
- **Cost** ($100-1,000/month for Redis cluster)
- **Memory limit** (16-512GB per instance, can't cache everything)
- **Invalidation complexity** (must update cache on writes)

---

## 3. Capacity Planning & Estimation (When Applicable)

### Multi-Tier Cache Size Estimation

**Example: Social media app** (100M users, 1B posts)

**Tier 1: Client Cache**:
```
Storage per device: 50MB (browser) / 200MB (mobile app)
Cached data:
- User's own profile: 5KB
- User's friends (100 friends × 5KB): 500KB
- Recent posts (50 posts × 10KB): 500KB
- Images (thumbnails, 20 images × 100KB): 2MB
Total: ~3MB per user (well within 50MB limit)

Cost: $0 (client device storage, free)
```

**Tier 2: CDN Cache**:
```
Edge locations: 300 (CloudFront)
Popular content: 10M posts (1% of 1B total, 80% of traffic)
Post size: 10KB text + 500KB image = 510KB
Total: 10M posts × 510KB = 5.1TB

Cost: $0.085/GB × 5,100GB = $433/month (storage) + $0.085/GB × 10TB/month (transfer) = $1,283/month
```

**Tier 3: Server Cache (Redis)**:
```
Hot data: 100M users × 5KB profile = 500GB
+ 100M recent posts × 10KB = 1TB
+ Session data (10M active users × 1KB) = 10GB
Total: 1.5TB

Redis cluster: 100 instances × 16GB = 1.6TB capacity
Cost: 100 instances × $10/month = $1,000/month
```

**Total caching cost**: $433 + $1,283 + $1,000 = **$2,716/month**

**vs No caching**: Database would need 10x capacity to handle 100x load = $30,000/month

**Savings**: $27,284/month (90% cost reduction with caching)

---

## 4. Data & Storage Design

### Cache Key Hierarchy

**Namespace structure** (organize cache keys):

```
user:{user_id}:profile               → User profile data
user:{user_id}:posts                 → User's posts
user:{user_id}:followers             → User's followers list
user:{user_id}:settings:v2           → User settings (v2 = schema version)

post:{post_id}:content               → Post content
post:{post_id}:comments              → Post comments
post:{post_id}:likes:count           → Like count

session:{session_id}                 → Session data

search:{query}:page:{page}:sort:{sort}  → Search results (includes all parameters)

product:{product_id}:v3              → Product details (v3 = version)
product:{product_id}:reviews         → Product reviews
```

**Example: Invalidate all user-related caches**:
```python
# Delete all keys matching pattern
keys = redis.keys("user:123:*")  # user:123:profile, user:123:posts, ...
for key in keys:
    redis.delete(key)

# More efficient: Use SCAN (doesn't block Redis)
cursor = 0
while True:
    cursor, keys = redis.scan(cursor, match="user:123:*", count=100)
    if keys:
        redis.delete(*keys)
    if cursor == 0:
        break
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Cache Failover Strategy

**Problem**: Redis master crashes → 100% cache miss → database overload

**Solution: Automatic Failover** (Redis Sentinel):

```
Normal Operation:
┌─────────────────┐      Replicate      ┌─────────────────┐
│  Redis Master   │ ──────────────────→ │  Redis Replica  │
│  (Active)       │   (async, <1ms lag)  │  (Standby)      │
│  100K ops/sec   │                      │  100K ops/sec   │
└────────┬────────┘                      └────────┬────────┘
         │                                        │
         ↓ Monitor (ping every 1s)                ↓
┌──────────────────────────────────────────────────────────┐
│  Redis Sentinel (3 instances, quorum = 2)                │
│  - Detect master failure (3 missed pings = 3 seconds)    │
│  - Quorum vote (2/3 Sentinels agree)                     │
│  - Promote replica → master (5 seconds)                  │
└──────────────────────────────────────────────────────────┘


Master Failure:
1. Master crashes at t=0
2. Sentinel detects failure at t=3s (3 missed pings)
3. Quorum vote at t=5s (2/3 Sentinels agree)
4. Promote replica → master at t=8s
5. Update clients at t=10s (new master address)

Downtime: ~10 seconds (during failover, 100% cache miss)
Impact: 10 seconds × 100K QPS = 1M requests hit database (burst, acceptable)
Recovery: After 10s, cache operational (new master)
```

---

## 6. Security, APIs & Governance

### CDN Security (DDoS Protection)

**CloudFront + AWS Shield**:
```yaml
# CloudFront security config
geo_restriction:
  restriction_type: whitelist
  locations: [US, CA, GB, DE]  # Only serve to these countries

web_acl:  # AWS WAF (Web Application Firewall)
  rules:
    - name: RateLimitRule
      priority: 1
      action: block
      rate_limit: 2000  # Block IPs with >2000 requests/5min
    
    - name: GeoBlockRule
      priority: 2
      action: block
      geo_match:
        countries: [CN, RU]  # Block traffic from these countries
    
    - name: SQLInjectionRule
      priority: 3
      action: block
      sql_injection_match: true

aws_shield:
  standard: enabled  # Free, automatic DDoS protection
  advanced: enabled  # $3,000/month, 24/7 response team, 100% uptime SLA
```

**DDoS mitigation** (absorb attack at edge):
```
Normal traffic: 10K QPS (legitimate users)
DDoS attack: 1M QPS (botnet, malicious)

Without CDN:
- 1M QPS hits origin server directly
- Origin overloaded instantly (capacity: 10K QPS)
- Website down (100% error rate)

With CDN + AWS Shield:
- 1M QPS hits CloudFront edge (300+ locations)
- CloudFront absorbs attack (capacity: 10M+ QPS per edge)
- AWS Shield detects anomaly (1M QPS vs normal 10K)
- Rate limiting applied (2K requests/5min per IP)
- Origin receives only 10K QPS (legitimate traffic)
- Website stays online (0% error rate ✅)

Result: DDoS attack blocked at edge, origin protected
```

---

## 7. Real-World Examples & Case Studies

### Twitter: Multi-Tier Caching

**Architecture**:

```
Tier 1: Client Cache (Mobile App)
- User's own tweets: 50 tweets cached (500KB)
- Timeline: 100 tweets cached (1MB)
- TTL: 5 minutes (refresh on pull-to-refresh)
- Hit ratio: 80% (users browse cached timeline repeatedly)

Tier 2: CDN Cache (Fastly)
- Tweet images, videos: 300+ edge locations
- TTL: 1 hour (media rarely changes)
- Hit ratio: 95% (popular tweets cached globally)

Tier 3: Server Cache (Redis/Memcached)
- User profiles: 300M users × 5KB = 1.5TB
- Tweet data: 500M tweets × 1KB = 500GB
- Timeline cache: 100M active users × 10KB = 1TB
- Total: 3TB Redis cluster (200 instances × 16GB)
- TTL: 5-30 minutes
- Hit ratio: 99% (hot data cached)

Tier 4: Database Cache (MySQL buffer pool)
- Buffer pool: 512GB RAM per database instance
- Hit ratio: 90% (frequently accessed rows)
```

**Performance**:
```
Timeline load time:
- Client cache hit (80%): 0ms (instant)
- CDN hit (15%): 20ms (edge)
- Redis hit (4%): 5ms (server cache)
- Database (1%): 50ms (cold data)

Weighted average: 0.80×0 + 0.15×20 + 0.04×5 + 0.01×50 = 3.7ms

vs No caching: 50ms (13.5x slower)
```

**Outcome**: Twitter handles 6,000 tweets/sec (500M tweets/day) with P95 latency <10ms

---

### Shopify: E-commerce Caching

**Black Friday 2023**: 10M+ concurrent shoppers, 1M+ checkouts/hour

**Caching strategy**:

```
Tier 1: Client Cache (Browser)
- Product pages: Cached 5 minutes
- Cart state: localStorage (persist across tabs)
- Static assets: Service Worker (offline support)

Tier 2: CDN Cache (Cloudflare)
- 300+ edge locations
- Product images: 1 day TTL
- Product pages (HTML): 5 minutes TTL
- API responses: 1 minute TTL

Tier 3: Application Cache (Redis)
- Product catalog: 10M products × 5KB = 50GB
- Inventory counts: 10M SKUs × 100B = 1GB
- Cart sessions: 5M active carts × 10KB = 50GB
- Total: 100GB Redis cluster
```

**Cache warming** (pre-Black Friday):
```python
def warm_cache_before_black_friday():
    """Cache top 100K products 1 hour before sale starts"""
    print("🔥 Cache warming started...")
    
    top_products = db.query("""
        SELECT product_id, name, price, inventory
        FROM products
        ORDER BY sales_last_30_days DESC
        LIMIT 100000
    """)
    
    for product in top_products:
        cache_key = f"product:{product['product_id']}:v3"
        redis.setex(cache_key, 3600, json.dumps(product))
    
    print(f"✅ Cache warmed: {len(top_products)} products loaded")

# Run at 11:00pm (1 hour before midnight sale)
# Result: 99% cache hit at 12:00am (no cold start)
```

**Outcome**:
- 10M concurrent users, 1M checkouts/hour
- P95 latency: 5ms (product page load)
- $0 downtime, 99.99% availability
- Cache hit ratio: 99% (only 1% hit database)

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Explain different cache placement strategies."

**Structured Answer**:

**"Cache placement refers to positioning caches at different layers: (1) Client-side (browser/mobile app, 0ms latency, 70-90% hit ratio, instant but limited 5-50MB storage), (2) CDN (edge servers 300+ locations, 10-50ms latency, 90-99% hit ratio, great for static assets like images/videos), (3) Server-side (Redis in-memory, 1-5ms latency, 95-99% hit ratio, flexible for dynamic data like user profiles/product catalog), (4) Database (buffer pool, 5-20ms latency, 80-95% hit ratio, automatic managed by database). Each layer trades latency for capacity: client fastest but smallest (50MB), CDN fast and global (10TB), server very fast and flexible (1TB), database acceptable and automatic (512GB). Real-world: Twitter uses multi-tier (client 80% hit 0ms, CDN 15% hit 20ms, Redis 4% hit 5ms, database 1% hit 50ms = 3.7ms average, 13.5x faster than no caching). Choose based on data type: static assets→CDN (long TTL 1 day), user data→server cache (short TTL 5-30 min), frequently accessed→client cache (offline support)."**

**Multi-Tier Breakdown**:

```
┌────────────────────────────────────────────────────────┐
│ LAYER       │ LATENCY │ HIT RATIO │ STORAGE │ USE CASE│
├─────────────┼─────────┼───────────┼─────────┼─────────┤
│ Client      │ 0ms     │ 70-90%    │ 5-50MB  │ Profiles│
│ CDN         │ 10-50ms │ 90-99%    │ 10TB    │ Images  │
│ Server(Redis)│ 1-5ms  │ 95-99%    │ 1TB     │ Dynamic │
│ Database    │ 5-20ms  │ 80-95%    │ 512GB   │ Auto    │
│ Disk(no cache)│50-100ms│ N/A      │ ∞       │ Fallback│
└────────────────────────────────────────────────────────┘

Example: Product page load (Amazon)
1. Client cache: User visited yesterday → Instant (0ms) ✅ (70%)
2. CDN cache: Product image on nearest edge → 20ms ✅ (15%)
3. Redis cache: Product details in Redis → 2ms ✅ (8%)
4. Database: Cold product, query from DB → 30ms ⚠️ (7%)

Weighted average: 0.70×0 + 0.15×20 + 0.08×2 + 0.07×30 = 5.3ms
vs No caching: 50ms database query (9.4x slower)
```

**When to Use Each Layer**:

| Layer | Best For | TTL | Example |
|-------|----------|-----|---------|
| **Client** | User-specific data, offline support | 1h-24h | User profile, preferences, recent searches |
| **CDN** | Static assets, global content | 1h-7d | Images, videos, CSS, JS bundles |
| **Server (Redis)** | Dynamic data, real-time updates | 5min-1h | Product prices, inventory, session data |
| **Database** | Frequently queried data (automatic) | N/A | Hot rows in buffer pool (managed by DB) |

**Real-world: Shopify Black Friday uses multi-tier caching. Client caches product pages (5 min TTL, 70% hit, instant load), CDN caches images (1 day TTL, 95% hit, 20ms from edge), Redis caches inventory (1 min TTL, 99% hit, 2ms real-time availability), database buffer pool caches hot products (automatic, 90% hit, 10ms). Pre-warmed top 100K products before midnight sale (cache hit 99% at 12:00am, no cold start). Result: 10M concurrent users, 1M checkouts/hour, P95 latency 5ms, 0 downtime, 99.99% availability. Without caching: database would collapse under 100x load (1M QPS vs 10K QPS capacity)."**

---

### Follow-Up 1: "How do you choose TTL for different cache layers?"

**Answer**:

**"Choose TTL based on update frequency and staleness tolerance. Client cache: Long TTL (1h-24h) for rarely changing data (user profile, preferences), short TTL (5 min) for frequently updated (cart, notifications). CDN: Long TTL (1-7 days) for immutable static assets (images, CSS with versioned URLs like app.abc123.js), short TTL (5 min) for dynamic content (product prices, API responses). Server cache (Redis): Short TTL (5-30 min) for frequently changing data (inventory, prices), medium TTL (1 hour) for semi-static data (product details). Balance freshness vs load: shorter TTL = fresher data but more cache expirations = higher database load. Monitor cache miss rate; if >5%, increase TTL."**

**TTL Decision Framework**:

```
Step 1: Determine update frequency
- How often does data change?
  * Static (never): images, CSS → 7 days TTL
  * Rare (weekly): user profile, settings → 1h-24h TTL
  * Frequent (hourly): product prices, inventory → 5-30 min TTL
  * Real-time (seconds): stock prices, sports scores → 1-5 sec TTL or no cache

Step 2: Assess staleness tolerance
- How old can data be before it's unacceptable?
  * Tolerate 1 day stale: static assets → 1 day TTL
  * Tolerate 30 min stale: user profiles → 30 min TTL
  * Tolerate 5 min stale: product prices → 5 min TTL
  * Tolerate 0 min stale: bank balance → no cache (must be fresh)

Step 3: Calculate database impact
- Shorter TTL = more cache expirations = more database queries
- Example: 1M requests/day, 5 min TTL:
  * Cache expirations: 1M / (5×60s) = 3,333 requests/sec to database
  * vs 30 min TTL: 1M / (30×60s) = 556 requests/sec to database
  * Trade-off: 30 min TTL = 6x less database load, but 6x more stale data

Step 4: Monitor and adjust
- Track cache miss rate (target: <5%)
- If miss rate >5%: Increase TTL (cache data longer)
- If staleness complaints: Decrease TTL (fresher data)
```

**TTL Examples by Layer**:

```
CLIENT CACHE (Browser / Mobile App):
┌─────────────────────┬────────┬─────────────────────────┐
│ Data Type           │ TTL    │ Reason                  │
├─────────────────────┼────────┼─────────────────────────┤
│ User profile        │ 1 hour │ Rarely changes, 1h OK   │
│ User preferences    │ 24h    │ Static, 24h acceptable  │
│ Recent searches     │ 7 days │ Historical, 7d fine     │
│ Cart items          │ 1 hour │ Temporary, 1h balance   │
│ Static assets (JS)  │ 1 year │ Versioned, never stale  │
└─────────────────────┴────────┴─────────────────────────┘

CDN CACHE (CloudFront / Cloudflare):
┌─────────────────────┬────────┬─────────────────────────┐
│ Data Type           │ TTL    │ Reason                  │
├─────────────────────┼────────┼─────────────────────────┤
│ Product images      │ 1 day  │ Rarely change, 1d OK    │
│ Video thumbnails    │ 7 days │ Static, 7d acceptable   │
│ CSS/JS bundles      │ 1 year │ Versioned, immutable    │
│ Product HTML        │ 5 min  │ Prices change, 5min OK  │
│ API responses       │ 1 min  │ Dynamic, 1min balance   │
└─────────────────────┴────────┴─────────────────────────┘

SERVER CACHE (Redis):
┌─────────────────────┬────────┬─────────────────────────┐
│ Data Type           │ TTL    │ Reason                  │
├─────────────────────┼────────┼─────────────────────────┤
│ Product details     │ 30 min │ Semi-static, 30min OK   │
│ Product prices      │ 5 min  │ Dynamic pricing, 5min   │
│ Inventory counts    │ 1 min  │ Real-time, 1min balance │
│ Session data        │ 24h    │ Active session, 24h TTL │
│ User notifications  │ 5 min  │ Frequent updates, 5min  │
└─────────────────────┴────────┴─────────────────────────┘
```

**Real-world: Netflix video thumbnails use 7-day CDN TTL (rarely change, 7 days acceptable), but recommendations use 30-min Redis TTL (ML model updates hourly, 30 min fresh enough). User profiles use 1-hour client cache (browser, changes rare, 1h OK), but watch history uses 5-min Redis TTL (updates frequently, 5min balance freshness vs load). Result: 99% cache hit across all layers, P50 latency 1ms, database load minimal (1% of traffic)."**

---

### Follow-Up 2: "How do you handle cache invalidation across multiple tiers?"

**Answer**:

**"Use waterfall invalidation: start from upstream (client, CDN) and flow to downstream (server cache, database). When data updates: (1) Update database first (source of truth), (2) Invalidate server cache (Redis DELETE key), (3) Purge CDN cache (CloudFront invalidation API, $0.005 per request), (4) Client cache invalidates automatically (TTL expires or versioned URLs force refresh). Alternatives: Use versioned URLs (no invalidation needed, old=v1, new=v2), event-driven invalidation (publish update event, all caches subscribe and invalidate), or short TTLs (passive expiration, simpler but higher database load). Trade-off: Active invalidation fast but complex (must track all caches), passive expiration simple but slower (TTL delay)."**

**Invalidation Strategy**:

**Scenario: Update product price** (iPhone 15, $999 → $899)

```
BEFORE UPDATE:
┌─────────────────────┐
│ Client Cache        │  iPhone 15: $999 (cached 10 min ago, TTL 30 min)
└─────────────────────┘
         ↓
┌─────────────────────┐
│ CDN Cache           │  iPhone 15: $999 (cached 5 min ago, TTL 1 hour)
└─────────────────────┘
         ↓
┌─────────────────────┐
│ Redis Cache         │  product:iphone15: $999 (cached 2 min ago, TTL 5 min)
└─────────────────────┘
         ↓
┌─────────────────────┐
│ Database            │  products.price = $999
└─────────────────────┘


AFTER UPDATE (Active Invalidation):
Step 1: Update database (source of truth)
  UPDATE products SET price = 899 WHERE id = 'iphone15';

Step 2: Invalidate Redis cache (immediate)
  redis.delete('product:iphone15');
  # Next request: Cache miss, fetch fresh $899 from database

Step 3: Purge CDN cache (API call)
  aws cloudfront create-invalidation --paths "/products/iphone15/*"
  # Cost: $0.005, Time: 5-30 seconds to propagate
  # Next request: CDN miss, fetch fresh $899 from origin

Step 4: Client cache (cannot invalidate directly)
  # Option A: Wait for TTL to expire (up to 30 min stale)
  # Option B: Use versioned URLs (force refresh)
    Old: /products/iphone15?v=1 (cached)
    New: /products/iphone15?v=2 (fresh, new cache entry)


TIMELINE:
0s: Price updated in database ($899)
1s: Redis cache invalidated (next request fresh)
5s: CDN cache purged (next request fresh)
30min: Client cache expires (users see fresh $899)

Staleness:
- Redis: 1 second (instant invalidation)
- CDN: 5 seconds (API propagation delay)
- Client: Up to 30 minutes (TTL expiration)

Trade-off: Fast invalidation (1-5s for Redis/CDN, complex API calls) vs slow (30 min client TTL, simple but stale)
```

**Alternative: Versioned URLs** (no invalidation needed):

```python
# Version-based cache busting
def get_product_url(product_id, version):
    """Generate versioned URL (forces fresh cache on version change)"""
    return f"/products/{product_id}?v={version}"

# Before price update:
product_url = get_product_url('iphone15', version=1)
# → /products/iphone15?v=1 (cached everywhere)

# After price update:
product_url = get_product_url('iphone15', version=2)
# → /products/iphone15?v=2 (new URL, fresh cache entry, old cache ignored)

# Benefits:
# - No cache invalidation needed (old cache naturally expires via TTL)
# - No API calls (no $0.005 CDN purge cost)
# - Instant freshness (v=2 is new cache key, always fresh)
# - No race conditions (v=1 and v=2 coexist safely)

# Drawbacks:
# - Must track version numbers (increment on every update)
# - Wasted cache space (old v=1 cached until TTL expires)
```

**Event-Driven Invalidation** (pub/sub pattern):

```python
# Publisher: Emit event on data update
def update_product_price(product_id, new_price):
    # Update database
    db.execute("UPDATE products SET price = ? WHERE id = ?", new_price, product_id)
    
    # Publish invalidation event
    pubsub.publish('product-updates', json.dumps({
        'product_id': product_id,
        'action': 'price_update',
        'timestamp': time.time()
    }))

# Subscriber 1: Redis cache invalidator
def redis_cache_subscriber():
    pubsub.subscribe('product-updates')
    for message in pubsub.listen():
        event = json.loads(message)
        redis.delete(f"product:{event['product_id']}")
        print(f"♻️ Redis cache invalidated: {event['product_id']}")

# Subscriber 2: CDN purge service
def cdn_purge_subscriber():
    pubsub.subscribe('product-updates')
    for message in pubsub.listen():
        event = json.loads(message)
        cloudfront.create_invalidation(paths=[f"/products/{event['product_id']}/*"])
        print(f"♻️ CDN cache purged: {event['product_id']}")

# Benefits:
# - Decoupled (cache layers independent, easy to add new subscribers)
# - Scalable (multiple subscribers process events in parallel)
# - Reliable (event persisted in queue, retry on failure)

# Drawbacks:
# - Complexity (requires pub/sub infrastructure: Kafka, RabbitMQ, Redis Pub/Sub)
# - Eventual consistency (events propagate over milliseconds-seconds)
```

**Real-world: Instagram post updates use event-driven invalidation. User posts photo → database write → Kafka event published → Redis cache invalidator consumes event (delete post cache) → CDN purge service consumes event (purge image cache) → client apps receive push notification (refresh feed). Total invalidation time: 2-5 seconds (instant for Redis, 5s for CDN). Alternative: Facebook uses versioned URLs for profile pictures (avatar_v1.jpg, avatar_v2.jpg) to avoid cache invalidation complexity. Result: No cache purge calls ($0 cost), instant freshness (new URL), simplified architecture."**

---

### Follow-Up 3: "What are the trade-offs between CDN and server-side caching?"

**Answer**:

**"CDN: Best for static global content (images, videos). Pros: Low latency worldwide (10-50ms from nearest edge), massive scale (10M+ QPS per edge), DDoS protection (absorb attacks). Cons: Expensive ($0.085/GB, $1K-5K/month high-traffic), hard to invalidate ($0.005 per purge, 5-30s propagation), long TTL required (1h-7d, stale data risk). Server cache (Redis): Best for dynamic user-specific data (profiles, sessions). Pros: Very fast (1-5ms same datacenter), flexible (short TTL 5-30 min, easy invalidation), cheap ($100-1K/month). Cons: Single-region latency (100ms cross-continent), limited capacity (1TB vs 10TB CDN), no DDoS protection. Choose CDN for static assets (images 95% hit ratio 1-day TTL), server cache for dynamic data (product prices 99% hit ratio 5-min TTL). Use both: Multi-tier caching (CDN for media, Redis for data = best of both worlds)."**

**Comparison Table**:

| Aspect | CDN (CloudFront) | Server Cache (Redis) |
|--------|------------------|----------------------|
| **Latency** | 10-50ms (nearest edge) | 1-5ms (same datacenter) |
| **Global reach** | ✅ 300+ locations | ❌ Single region (100ms cross-continent) |
| **Capacity** | 10TB+ per edge | 1TB (Redis cluster) |
| **Cost** | $0.085/GB = $1K-5K/month | $100-1K/month (Redis cluster) |
| **Invalidation** | Slow (5-30s), $0.005 per purge | Fast (<1s), free (DELETE key) |
| **TTL** | Long (1h-7d, stale risk) | Short (5-30 min, fresh) |
| **Best for** | Static assets (images, videos) | Dynamic data (prices, inventory) |
| **DDoS protection** | ✅ Absorb 10M+ QPS attacks | ❌ No protection |
| **Use cases** | Images, CSS, JS, videos | User profiles, session data, product catalog |

**Decision Matrix**:

| Data Type | CDN | Redis | Reason |
|-----------|-----|-------|--------|
| **Product images** | ✅ | ❌ | Static, global, 95% hit ratio, 1-day TTL (CDN best) |
| **Product prices** | ❌ | ✅ | Dynamic, changes hourly, 5-min TTL (Redis best) |
| **User profiles** | ❌ | ✅ | User-specific, private, 30-min TTL (Redis best) |
| **Video thumbnails** | ✅ | ❌ | Static, global, 99% hit ratio, 7-day TTL (CDN best) |
| **Session data** | ❌ | ✅ | Private, short-lived, 1-hour TTL (Redis best) |
| **API responses** | ⚠️ Both | ⚠️ Both | Cache in Redis (5-min TTL), also CDN (1-min TTL) for global reach |

**Multi-Tier Strategy** (use both):

```
Example: E-commerce product page

CDN Layer (Static Assets):
- Product images: 500KB × 10 images = 5MB
- CSS, JS bundles: 2MB
- Total: 7MB per product
- TTL: 1 day (images rarely change)
- Hit ratio: 99% (popular products cached globally)
- Latency: 20ms (nearest edge)

Redis Layer (Dynamic Data):
- Product details: 5KB (name, description)
- Price: 100B (changes hourly)
- Inventory: 100B (real-time updates)
- Total: 5.2KB per product
- TTL: 5 minutes (balance freshness vs load)
- Hit ratio: 99% (hot products cached)
- Latency: 2ms (same datacenter)

Result:
- Static assets: CDN (20ms, 99% hit, 7MB cached for 1 day)
- Dynamic data: Redis (2ms, 99% hit, 5KB cached for 5 min)
- Total page load: 20ms (CDN) + 2ms (Redis) = 22ms (fast ✅)
- vs no caching: 100ms+ (images + database = slow)
```

**Cost Comparison** (10M products, 1M page views/day):

```
CDN Only (cache everything):
- Static assets: 10M products × 7MB = 70TB
- CDN storage: 70TB × $0.085/GB = $5,950/month
- Transfer: 1M page views × 7MB = 7TB/month × $0.085/GB = $595/month
- Total: $6,545/month

Redis Only (cache everything):
- Static assets + dynamic data: 10M products × 7MB = 70TB
- Redis capacity: Need 70TB / 16GB per instance = 4,375 instances
- Cost: 4,375 × $10/month = $43,750/month (too expensive ❌)

Multi-Tier (CDN + Redis, smart caching):
- CDN: Static assets (7MB per product), hot 100K products = 700GB
  - Cost: 700GB × $0.085/GB = $60/month + transfer 7TB = $595/month = $655/month
- Redis: Dynamic data (5KB per product), hot 1M products = 5GB
  - Cost: 1 instance × 16GB × $10/month = $10/month
- Total: $665/month (10x cheaper than CDN-only ✅)
```

**Real-world: Netflix uses both. CDN (CloudFront) caches video thumbnails (7-day TTL, 99% hit ratio, 10-50ms latency, global reach 300+ edges). Redis caches user recommendations (30-min TTL, 99% hit ratio, 1-5ms latency, same datacenter). Result: Video thumbnails load instantly from nearest edge (20ms), recommendations load fast from Redis (2ms), total page load 22ms (vs 500ms without caching = 22.7x faster). Cost: $1M/month CDN (video traffic 10TB/sec) + $500K/month Redis (recommendations 10M ops/sec) = $1.5M/month (vs $15M/month scaling databases to handle 100x load without caching = 10x cost savings)."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Multi-Tier Cache Flow

```
┌────────────────────────────────────────────────────────┐
│         MULTI-TIER CACHE REQUEST FLOW                  │
└────────────────────────────────────────────────────────┘

User Request: GET /products/iphone15
         ↓
[TIER 1: Client Cache (Browser localStorage)]
         │
         ├─── HIT (70% probability) ───→ Return cached (0ms) ✅ DONE
         │
         └─── MISS (30% probability) ──→ Continue to Tier 2
                                          ↓
[TIER 2: CDN Cache (CloudFront Edge)]
         │
         ├─── HIT (20% of total) ───→ Return from edge (20ms) ✅ DONE
         │                             Store in Client Cache ←─┘
         │
         └─── MISS (10% of total) ──→ Continue to Tier 3
                                          ↓
[TIER 3: Server Cache (Redis)]
         │
         ├─── HIT (8% of total) ───→ Return from Redis (2ms) ✅ DONE
         │                            Store in CDN Cache ←─┘
         │                            Store in Client Cache ←─┘
         │
         └─── MISS (2% of total) ──→ Continue to Tier 4
                                          ↓
[TIER 4: Database Cache (Buffer Pool)]
         │
         ├─── HIT (1.5% of total) ───→ Return from buffer (10ms) ✅ DONE
         │                              Store in Redis ←─┘
         │                              Store in CDN Cache ←─┘
         │                              Store in Client Cache ←─┘
         │
         └─── MISS (0.5% of total) ──→ Continue to Tier 5
                                          ↓
[TIER 5: Disk (No Cache, Last Resort)]
         │
         └─── Disk Read (0.5% of total) ───→ Return from disk (50ms) ⚠️ SLOW
                                              Store in Buffer Pool ←─┘
                                              Store in Redis ←─┘
                                              Store in CDN Cache ←─┘
                                              Store in Client Cache ←─┘


PERFORMANCE BREAKDOWN (1,000 requests):
═══════════════════════════════════════════════════════
Layer          │ Requests │ Latency │ Total Time
───────────────┼──────────┼─────────┼────────────
Client Cache   │ 700 (70%)│ 0ms     │ 0ms
CDN Cache      │ 200 (20%)│ 20ms    │ 4,000ms
Redis Cache    │ 80 (8%)  │ 2ms     │ 160ms
Buffer Pool    │ 15 (1.5%)│ 10ms    │ 150ms
Disk (no cache)│ 5 (0.5%) │ 50ms    │ 250ms
───────────────┴──────────┴─────────┴────────────
Total: 1,000 requests, 4,560ms total, Average: 4.56ms/request

vs No Caching (all disk reads):
1,000 requests × 50ms = 50,000ms total, Average: 50ms/request

Improvement: 50ms / 4.56ms = 10.96x faster with multi-tier caching


CODE EXAMPLE (Multi-Tier Get):
═══════════════════════════════════════════════════════
async function getProduct(productId) {
    // Tier 1: Client cache (localStorage)
    const clientCached = localStorage.getItem(`product-${productId}`);
    if (clientCached && !isExpired(clientCached)) {
        console.log('✅ Client cache hit (0ms)');
        return JSON.parse(clientCached).value;
    }
    
    // Tier 2: CDN cache (fetch with cache headers)
    const cdnResponse = await fetch(`https://cdn.example.com/products/${productId}`, {
        headers: { 'Cache-Control': 'max-age=3600' }
    });
    if (cdnResponse.headers.get('X-Cache') === 'Hit from cloudfront') {
        console.log('✅ CDN cache hit (20ms)');
        const product = await cdnResponse.json();
        // Populate client cache
        localStorage.setItem(`product-${productId}`, JSON.stringify({
            value: product,
            expiry: Date.now() + 30*60*1000  // 30 min TTL
        }));
        return product;
    }
    
    // Tier 3: Redis cache (server-side)
    const redisResponse = await fetch(`https://api.example.com/products/${productId}`);
    const product = await redisResponse.json();
    if (redisResponse.headers.get('X-Cache-Status') === 'HIT') {
        console.log('✅ Redis cache hit (2ms)');
    } else {
        console.log('❌ Cache miss, fetched from database (50ms)');
    }
    
    // Populate client cache
    localStorage.setItem(`product-${productId}`, JSON.stringify({
        value: product,
        expiry: Date.now() + 30*60*1000
    }));
    
    return product;
}
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Cache Placement Matters

**Impact**:
- Latency reduction: 50ms → 4.5ms average (11x faster with multi-tier)
- Global reach: 10-50ms from nearest edge (300+ CDN locations)
- Cost savings: $665/month (multi-tier) vs $6,545/month (CDN-only) = 10x cheaper
- Scalability: Handle 100x traffic without database upgrade

**Common Use Cases**:
- Static assets (images, videos): CDN caching (1-7 day TTL, 99% hit ratio, 20ms)
- Dynamic data (prices, inventory): Server cache (5-30 min TTL, 99% hit, 2ms)
- User-specific data (profiles, sessions): Server cache (30 min - 24h TTL, private)
- Offline support: Client cache (24h TTL, works without internet)

### Key Strategies

**1. Multi-Tier Caching** (best of all worlds):
```
Client (0ms, 70% hit) → CDN (20ms, 20% hit) → Redis (2ms, 8% hit) → DB (50ms, 2% hit)
Average: 4.5ms (11x faster than no caching)
```

**2. Choose Cache Layer by Data Type**:
```
Static global: CDN (images, 1-day TTL, 99% hit, 20ms, global reach)
Dynamic user-specific: Redis (prices, 5-min TTL, 99% hit, 2ms, flexible)
Offline-first: Client (profiles, 1-hour TTL, 70% hit, 0ms, instant)
```

**3. Smart TTL Selection**:
```
Static assets: Long TTL (1-7 days, immutable)
Dynamic data: Short TTL (5-30 min, balance freshness vs load)
Real-time data: Very short TTL (1-5 sec) or no cache
```

**4. Waterfall Invalidation** (update all caches):
```
Database → Redis (delete key, 1s) → CDN (purge API, 5s) → Client (TTL expire, 30 min)
Alternative: Versioned URLs (no invalidation, instant freshness)
```

### Production Checklist

- [ ] **Client cache**: Use HTTP cache headers (Cache-Control, ETag), localStorage (user data), Service Workers (offline support)
- [ ] **CDN cache**: Choose provider (CloudFront, Cloudflare), set TTL (static 1-7d, dynamic 5min-1h), configure invalidation
- [ ] **Server cache**: Deploy Redis cluster (16GB-1TB capacity), implement cache-aside pattern, monitor hit ratio (>95%)
- [ ] **Database cache**: Tune buffer pool (50-80% of RAM), monitor hit ratio (>80%), optimize indexes
- [ ] **Multi-tier strategy**: Client (70% hit) → CDN (20%) → Redis (8%) → DB (2%) = 4-5ms average latency
- [ ] **TTL selection**: Static (1-7d), dynamic (5-30min), real-time (1-5sec or no cache)
- [ ] **Invalidation**: Waterfall (DB → Redis → CDN → client), or versioned URLs (no purge needed)
- [ ] **Monitoring**: Track hit ratio per layer (target: client 70%, CDN 90%, Redis 95%), latency (P50 <5ms, P95 <20ms)
- [ ] **Cost optimization**: Cache hot data only (Pareto 80/20), use multi-tier (CDN for static, Redis for dynamic)
- [ ] **Security**: Enable authentication (Redis AUTH), encrypt in transit (TLS), don't cache sensitive data (PII)

### Bottom Line

**Cache placement is critical for system design because positioning caches at different layers (client, CDN, server, database) optimizes latency, cost, and scale. For FAANG interviews: Explain multi-tier strategy: (1) Client-side (browser/mobile app, 0ms latency instant, 70-90% hit ratio, 5-50MB storage limited, best for user-specific data like profiles/preferences, offline support), (2) CDN (edge servers 300+ locations, 10-50ms latency nearest edge, 90-99% hit ratio popular content, 10TB+ capacity massive, best for static global assets like images/videos, DDoS protection), (3) Server-side (Redis in-memory cache, 1-5ms latency same datacenter, 95-99% hit ratio hot data, 1TB capacity flexible, best for dynamic data like product prices/inventory, easy invalidation), (4) Database (buffer pool automatic managed by DB, 5-20ms latency if cached in memory, 80-95% hit ratio frequently queried rows, 512GB typical size). Choose layer based on data type: static assets → CDN (long TTL 1-7 days, immutable images/CSS/JS, 99% hit ratio, CloudFront $0.085/GB), dynamic data → Redis (short TTL 5-30 min, product catalog/prices, 99% hit ratio, $100-1K/month), user-specific → client cache (medium TTL 1h-24h, profiles/preferences, 70% hit, offline support PWA). Real-world examples: Twitter multi-tier (client 80% hit 0ms timeline cached in app, CDN 15% hit 20ms tweet images on Fastly edges, Redis 4% hit 5ms user profiles/timeline, database 1% hit 50ms cold data = 3.7ms average, 13.5x faster than no caching), Shopify Black Friday (client caches product pages 5min TTL, CDN caches images 1day TTL 95% hit, Redis caches inventory 1min TTL 99% hit, pre-warmed top 100K products before midnight sale 99% cache hit at launch, 10M concurrent users 1M checkouts/hour P95 latency 5ms 0 downtime). Trade-offs: CDN pros (low latency global 20ms, massive scale 10M+ QPS, DDoS protection) cons (expensive $0.085/GB = $1K-5K/month, hard to invalidate $0.005 purge 5-30s propagation, long TTL 1h-7d stale risk), Redis pros (very fast 1-5ms, flexible short TTL 5-30min easy invalidation, cheap $100-1K/month) cons (single-region 100ms cross-continent, limited capacity 1TB, no DDoS protection). Use both multi-tier: CDN for static assets (images 7MB 1-day TTL = $655/month), Redis for dynamic data (prices 5KB 5-min TTL = $10/month) = $665/month total (vs CDN-only $6,545/month = 10x cheaper). TTL selection: static assets long (1-7 days immutable), dynamic data short (5-30 min balance freshness vs load), real-time very short (1-5 sec) or no cache (bank balance must be fresh). Invalidation strategies: waterfall (update DB → delete Redis key 1s → purge CDN 5s → client TTL expires 30min), or versioned URLs (product.jpg?v=2 new URL fresh cache no purge needed instant 0 cost simpler). Monitor cache hit ratio per layer (target: client 70%, CDN 90%, Redis 95%, if <target increase cache size or TTL), latency (P50 <5ms, P95 <20ms acceptable), database load (should be 10-100x lower with caching). Critical for scale: multi-tier caching handles 100x traffic (client 70% + CDN 20% + Redis 8% = 98% requests never hit database) vs no caching (database collapses under 100x load).**

