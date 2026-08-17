# 69. CDN Usage for Frontend Assets

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**CDN (Content Delivery Network)** is a geographically distributed network of servers that cache and serve static assets (JavaScript, CSS, images, fonts) from locations closest to users, dramatically reducing latency and improving load times. CDNs act as a caching layer between your origin server and users.

### What it is:
A distributed system where:
- **Edge servers**: Located worldwide (100-300 PoPs globally)
- **Origin server**: Your primary server hosting original assets
- **Cache**: Edge servers store copies of your assets
- **Routing**: Users automatically connect to nearest edge server
- **Delivery**: Assets served from edge, not origin (50-300ms saved)

**Major CDN providers:**
- **Cloudflare**: 275+ PoPs, free tier, DDoS protection
- **AWS CloudFront**: Integrated with S3, Lambda@Edge
- **Fastly**: Real-time purging, VCL scripting
- **Akamai**: Largest network (4000+ PoPs), enterprise-focused
- **Vercel/Netlify**: Optimized for modern frameworks

### Why it exists:
- **Latency reduction**: Physical distance matters (speed of light)
- **Network hops**: Fewer hops = faster delivery
- **Origin offloading**: 95%+ requests served from cache, not origin
- **Scalability**: Handle traffic spikes without scaling origin
- **Reliability**: Multi-region redundancy, automatic failover
- **Cost savings**: Bandwidth from CDN cheaper than origin

**Real-world impact:**
```
Without CDN (serving from single US East origin):
- User in US East: 50ms latency
- User in Europe: 150ms latency
- User in Asia: 300ms latency
- User in Australia: 350ms latency
- Origin bandwidth: 10TB/month ($1,000)
- Origin load: 1000 req/s

With CDN (global edge network):
- All users: 20-50ms latency (95% reduction)
- Edge bandwidth: 9.8TB cached
- Origin bandwidth: 200GB (98% reduction)
- Origin bandwidth cost: $20 (98% savings)
- Origin load: 20 req/s (98% offload)
- CDN cost: $400/month
- Net savings: $600/month + massive performance gain
```

### When and where it's used:
- **Static assets**: JS, CSS, images, fonts, videos
- **API responses**: Cacheable GET requests (product catalogs)
- **HTML**: Static pages or with edge-side rendering
- **Downloads**: Software binaries, documents, media files
- **Not for**: User-specific data, real-time updates, POST/PUT/DELETE

### Role in large-scale applications:
In production systems:
- **Multi-CDN strategy** (primary + backup for redundancy)
- **Intelligent routing** (DNS-based, Anycast)
- **Cache warming** (pre-populate edge on deploy)
- **Purge/invalidation** (clear cache on asset changes)
- **Edge computing** (Lambda@Edge, Cloudflare Workers)
- **Monitoring** tracks cache hit rates, P99 latency

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### CDN Architecture & Request Flow

**Request flow without CDN:**
```
User (Tokyo) → Internet (300ms) → Origin (US-East) → Response → Internet (300ms) → User
Total: 600ms latency + origin processing time

Problems:
- High latency due to distance
- Every request hits origin (scaling challenge)
- Single point of failure
- Bandwidth costs high
```

**Request flow with CDN:**
```
First request (cache miss):
User (Tokyo) → Edge (Tokyo, 20ms) → Check cache → MISS 
→ Origin (US-East, 150ms) → Edge caches response → User
Total: 170ms (slower than direct due to cache miss)

Subsequent requests (cache hit):
User (Tokyo) → Edge (Tokyo, 20ms) → Check cache → HIT → User
Total: 20ms (95% faster!)

Cache hit ratio: Typically 90-98%
Effective latency: 0.98 × 20ms + 0.02 × 170ms = 23ms
```

### CDN Caching Strategies

**1. Cache-Control Headers:**
```
Cache-Control: public, max-age=31536000, immutable

Components:
- public: CDN can cache (vs private for user-specific)
- max-age: Cache duration in seconds
- immutable: Never revalidate (perfect for versioned assets)
- s-maxage: CDN-specific cache duration (overrides max-age)

Example strategies:
HTML:          max-age=0, s-maxage=3600       (1hr CDN, always revalidate browser)
CSS/JS:        max-age=31536000, immutable    (1yr, versioned filenames)
Images:        max-age=86400, s-maxage=2592000 (1d browser, 30d CDN)
API (public):  max-age=300, s-maxage=300       (5min CDN)
API (private): private, no-store               (never cache)
```

**2. Cache Key Strategy:**
```
Default cache key: URL

Enhanced cache key (Vary header):
- URL + Accept-Encoding (gzip vs brotli)
- URL + Accept-Language (i18n)
- URL + User-Agent (mobile vs desktop)
- URL + Cookie (A/B test variants)

Example:
Cache key = hash(URL + Accept-Encoding)
/main.js + gzip → Cache entry 1
/main.js + br   → Cache entry 2

Without Vary: Wrong compression served to users
With Vary: Separate cache per encoding
```

**3. Cache Invalidation (The Hard Problem):**
```
Strategies:

1. Versioned URLs (Best practice):
   /static/main.abc123.js → Never purge, immutable
   On deploy: New hash → New URL → Automatic invalidation
   
2. Cache purging/invalidation:
   - Instant purge (Fastly, Cloudflare)
   - Tag-based purge (purge all "product" tagged assets)
   - Wildcard purge (/api/products/*)
   - Full cache clear (nuclear option)
   
3. Time-based expiration:
   - Short TTL (5min) for frequently changing content
   - Long TTL (1yr) for immutable content
   
4. Stale-while-revalidate:
   Cache-Control: max-age=3600, stale-while-revalidate=86400
   - Serve stale content immediately
   - Fetch fresh content in background
   - Best UX (no waiting)
```

### Geographic Distribution & Latency

**Speed of light limitation:**
```
Physical distance limits:
- US East to US West: ~50ms minimum (speed of light in fiber)
- US to Europe: ~80ms minimum
- US to Asia: ~150ms minimum
- US to Australia: ~180ms minimum

CDN edge locations reduce effective distance:
- User to nearest edge: 10-50ms (metro-area distance)
- Edge to origin: Happens once, then cached

Result: 50-200ms saved per request
```

**Edge PoP density:**
```
Tier 1 CDN (Cloudflare, Akamai):
- 200-300 PoPs worldwide
- Coverage: 95%+ of internet users within 50ms

Tier 2 CDN (AWS CloudFront):
- 400+ edge locations
- Good coverage, AWS ecosystem integration

Multi-CDN strategy:
- Primary: Cloudflare (performance, cost)
- Secondary: AWS CloudFront (AWS services integration)
- Failover: Automatic DNS switching on failure
```

### Origin Shield & Tiered Caching

**Problem: Cache stampede**
```
Scenario:
- Popular asset expires simultaneously at 100 edge servers
- 100 edges request from origin at once
- Origin overwhelmed (stampede)

Solution: Origin Shield (regional cache tier)
```

**Tiered architecture:**
```
User → Edge PoP → Regional Shield → Origin

Example:
Users (Tokyo, Seoul, Singapore) 
  → Edge PoPs (local, 20ms)
  → Regional Shield (Asia-Pacific, 50ms)
  → Origin (US-East, 150ms)

Benefits:
- 1 cache miss at edge → Check shield (not origin)
- Shield has 99%+ hit rate (aggregates traffic)
- Origin sees 100x less traffic
- Cache filling: 1 request to origin, not 100

CloudFront: Origin Shield (additional cost)
Fastly: Shielding (built-in)
Cloudflare: Argo Tiered Caching
```

### Edge Computing & Personalization

**Traditional CDN limitation:**
```
Can only serve static, identical content to all users
Problem: User-specific content (auth, personalization)
```

**Edge computing solutions:**
```
1. Cloudflare Workers (V8 isolates):
   - JavaScript at edge (sub-millisecond startup)
   - Modify requests/responses
   - A/B testing, auth, personalization
   - 200+ locations worldwide

2. Lambda@Edge (AWS):
   - Node.js/Python at edge
   - Viewer request/response hooks
   - Origin request/response hooks
   - 13 regional edge locations (not all PoPs)

3. Fastly Compute@Edge (WebAssembly):
   - Wasm at edge (language-agnostic)
   - 50μs cold starts
   - Full compute capabilities

Use cases:
- A/B test routing at edge
- Authentication header injection
- Response header manipulation
- HTML rewriting (personalization)
- URL rewrites (A/B tests, localization)
```

### Scalability Considerations

**At millions of requests/second:**

**Cache hit ratio is critical:**
```
1M requests/second, 95% hit ratio:
- Edge serves: 950K req/s (no origin load)
- Origin serves: 50K req/s (manageable)

1M requests/second, 70% hit ratio:
- Edge serves: 700K req/s
- Origin serves: 300K req/s (may overwhelm)

Improving hit ratio:
- Longer cache TTLs
- Origin shield (reduces misses)
- Cache warming (pre-populate)
- Consistent hashing (sticky routing)
```

**Cost at scale:**
```
10TB/month traffic:

Without CDN:
- Origin bandwidth: 10TB × $0.10/GB = $1,000/month
- Origin compute: Medium servers × 10 = $2,000/month
- Total: $3,000/month

With CDN (95% hit ratio):
- CDN bandwidth: 10TB × $0.04/GB = $400/month
- Origin bandwidth: 500GB × $0.10/GB = $50/month
- Origin compute: Small servers × 2 = $400/month
- Total: $850/month (72% savings)

Breakeven: ~500GB/month traffic
```

### Common Pitfalls

1. **Not using versioned filenames:**
   ```
   Problem: /static/main.js cached for 1 year, can't update
   Solution: /static/main.abc123.js, change hash on update
   ```

2. **Caching HTML with user-specific content:**
   ```
   Problem: User A's HTML served to User B (privacy issue)
   Solution: Cache-Control: private or edge computing for personalization
   ```

3. **Infinite cache without purge strategy:**
   ```
   Problem: Deploy new version, users see old cached version for days
   Solution: Versioned URLs or instant purge on deploy
   ```

4. **Ignoring cache warming:**
   ```
   Problem: Deploy → All caches empty → Origin stampede
   Solution: Pre-fetch popular assets to edge before switching traffic
   ```

5. **Single CDN (no redundancy):**
   ```
   Problem: CDN outage → Entire site down
   Solution: Multi-CDN with automatic failover
   ```

6. **Not monitoring cache hit rates:**
   ```
   Problem: Low hit rate (60%) → High origin load, costs
   Solution: Monitor hit rates, optimize cache strategy
   ```

### Best Practices in Production

1. **Immutable assets with long TTL:**
   ```
   /static/main.[contenthash].js
   Cache-Control: public, max-age=31536000, immutable
   ```

2. **Origin Shield for high-traffic sites:**
   ```
   Reduces origin load by 95%+
   Prevents cache stampedes
   ```

3. **Cache warming on deploy:**
   ```
   Pre-fetch top 100 URLs to edge servers
   Prevents cache miss spike
   ```

4. **Tag-based purging:**
   ```
   Assets tagged with "product-123"
   On product update: purge tag "product-123"
   Surgical cache invalidation
   ```

5. **Geo-routing for compliance:**
   ```
   EU users → EU edge (GDPR)
   China users → China edge (ICP)
   ```

6. **Multi-CDN strategy:**
   ```
   Primary: Cloudflare (performance)
   Secondary: CloudFront (failover)
   DNS: GeoDNS for intelligent routing
   ```

### Real-World Failure Scenarios

**Case 1: Fastly Global Outage (June 2021)**
- Single CDN point of failure
- Major sites down (Reddit, Amazon, Twitch)
- 85% of traffic offline for 49 minutes
- Lesson: Multi-CDN strategy essential

**Case 2: Cache Stampede on Product Launch**
- E-commerce launched product at 12pm
- 50K users hit product page simultaneously
- All edge caches empty (new URL)
- 50K requests hit origin at once
- Origin overwhelmed, 30-second response times
- Solution: Cache warming + origin shield

**Case 3: Incorrect Cache Headers**
- API returned user data with `Cache-Control: public, max-age=3600`
- CDN cached User A's private data
- Served to User B (privacy violation, GDPR breach)
- Solution: Always use `private` for user-specific data

**Case 4: Cache Poisoning**
- Attacker injected `X-Forwarded-Host` header
- CDN cached response with malicious redirect
- All users served poisoned cache entry
- Solution: Normalize cache keys, validate headers

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: E-Commerce Site CDN Strategy

**Asset categorization:**
```
Immutable assets (versioned, 1-year cache):
├─ /static/js/main.abc123.js
├─ /static/css/main.def456.css
├─ /static/fonts/opensans.woff2
└─ /static/images/logo.svg

Semi-static assets (daily updates):
├─ /images/products/product-123.jpg  (max-age=86400)
└─ /images/banners/hero.jpg          (max-age=3600)

Dynamic HTML (short cache):
├─ /                                  (max-age=0, s-maxage=300)
├─ /products                          (max-age=0, s-maxage=600)
└─ /products/123                      (max-age=0, s-maxage=1800)

API (selective caching):
├─ GET /api/products                  (max-age=300, public)
├─ GET /api/products/123              (max-age=600, public)
├─ GET /api/user/cart                 (no-cache, private)
└─ POST /api/checkout                 (no-store)
```

**Cache-Control configuration:**
```javascript
// Next.js configuration
module.exports = {
  async headers() {
    return [
      // Static assets - immutable, long cache
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      
      // Product images - daily cache
      {
        source: '/images/products/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=2592000',
          },
        ],
      },
      
      // API responses - short cache
      {
        source: '/api/products/:id',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=600',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
    ];
  },
};
```

### Example 2: CloudFront with S3 Distribution

**AWS CDK setup:**
```typescript
// cdk-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class FrontendCDNStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);
    
    // S3 bucket for static assets
    const assetBucket = new s3.Bucket(this, 'AssetBucket', {
      bucketName: 'my-app-assets',
      publicReadAccess: false, // CloudFront will access via OAI
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    
    // Origin Access Identity (secure S3 access)
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'CloudFront access to S3',
    });
    
    assetBucket.grantRead(oai);
    
    // Cache policies
    const staticCachePolicy = new cloudfront.CachePolicy(this, 'StaticCache', {
      cachePolicyName: 'StaticAssets',
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });
    
    const dynamicCachePolicy = new cloudfront.CachePolicy(this, 'DynamicCache', {
      cachePolicyName: 'DynamicContent',
      defaultTtl: cdk.Duration.minutes(5),
      maxTtl: cdk.Duration.hours(1),
      minTtl: cdk.Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Accept-Encoding',
        'Accept-Language'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });
    
    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(assetBucket, {
          originAccessIdentity: oai,
        }),
        cachePolicy: staticCachePolicy,
        compress: true,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      
      // Additional behaviors for different paths
      additionalBehaviors: {
        // API paths - shorter cache
        '/api/*': {
          origin: new origins.HttpOrigin('api.example.com'),
          cachePolicy: dynamicCachePolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        },
        
        // Images - medium cache
        '/images/*': {
          origin: new origins.S3Origin(assetBucket, {
            originAccessIdentity: oai,
          }),
          cachePolicy: new cloudfront.CachePolicy(this, 'ImageCache', {
            defaultTtl: cdk.Duration.days(30),
            maxTtl: cdk.Duration.days(365),
          }),
          compress: true,
        },
      },
      
      // Custom error responses
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // SPA routing
          ttl: cdk.Duration.minutes(5),
        },
      ],
      
      // Enable Origin Shield (cost optimization)
      enableOriginShield: true,
      originShieldRegion: 'us-east-1',
      
      // Enable logging
      enableLogging: true,
      logBucket: new s3.Bucket(this, 'LogBucket'),
      logFilePrefix: 'cloudfront-logs/',
      
      // Price class (cost vs performance)
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, EU, IL
      
      // HTTP/2 and HTTP/3 support
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });
    
    // Deploy static assets to S3
    new s3deploy.BucketDeployment(this, 'DeployAssets', {
      sources: [s3deploy.Source.asset('./dist')],
      destinationBucket: assetBucket,
      distribution,
      distributionPaths: ['/*'], // Invalidate all paths on deploy
    });
    
    // Output CloudFront URL
    new cdk.CfnOutput(this, 'DistributionURL', {
      value: distribution.distributionDomainName,
    });
  }
}
```

### Example 3: Cloudflare with Cache Purging

**Cloudflare API integration:**
```javascript
// cloudflare-purge.js
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

class CloudflareCDN {
  constructor(apiToken, zoneId) {
    this.apiToken = apiToken;
    this.zoneId = zoneId;
    this.baseURL = 'https://api.cloudflare.com/client/v4';
  }
  
  // Purge specific URLs
  async purgeURLs(urls) {
    const response = await fetch(
      `${this.baseURL}/zones/${this.zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: urls,
        }),
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✓ Purged ${urls.length} URLs`);
      return data;
    } else {
      throw new Error(`Purge failed: ${data.errors[0].message}`);
    }
  }
  
  // Purge by cache tags
  async purgeTags(tags) {
    const response = await fetch(
      `${this.baseURL}/zones/${this.zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: tags,
        }),
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✓ Purged tags: ${tags.join(', ')}`);
      return data;
    } else {
      throw new Error(`Purge failed: ${data.errors[0].message}`);
    }
  }
  
  // Purge everything (use sparingly!)
  async purgeEverything() {
    console.warn('⚠️  Purging entire cache!');
    
    const response = await fetch(
      `${this.baseURL}/zones/${this.zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purge_everything: true,
        }),
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✓ Purged entire cache');
      return data;
    } else {
      throw new Error(`Purge failed: ${data.errors[0].message}`);
    }
  }
  
  // Get cache analytics
  async getCacheAnalytics(since = '-1h') {
    const response = await fetch(
      `${this.baseURL}/zones/${this.zoneId}/analytics/dashboard?since=${since}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      const requests = data.result.totals.requests.all;
      const cached = data.result.totals.requests.cached;
      const uncached = data.result.totals.requests.uncached;
      const hitRatio = (cached / requests * 100).toFixed(2);
      
      console.log(`\n📊 Cache Analytics (last hour):`);
      console.log(`   Total requests: ${requests.toLocaleString()}`);
      console.log(`   Cached: ${cached.toLocaleString()}`);
      console.log(`   Uncached: ${uncached.toLocaleString()}`);
      console.log(`   Hit ratio: ${hitRatio}%\n`);
      
      return data.result;
    }
  }
}

// Usage in deployment script
const cdn = new CloudflareCDN(CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID);

// On deployment
async function onDeploy() {
  console.log('🚀 Deploying new version...');
  
  // Deploy assets to origin
  await deployAssetsToOrigin();
  
  // Purge HTML and API caches (static assets are versioned)
  await cdn.purgeURLs([
    'https://example.com/',
    'https://example.com/products',
    'https://example.com/api/products',
  ]);
  
  // Or purge by tag
  await cdn.purgeTags(['html', 'api']);
  
  console.log('✓ Deployment complete');
}

// On product update
async function onProductUpdate(productId) {
  // Purge product-specific caches
  await cdn.purgeURLs([
    `https://example.com/products/${productId}`,
    `https://example.com/api/products/${productId}`,
  ]);
  
  // Or use tags
  await cdn.purgeTags([`product-${productId}`]);
}
```

### Example 4: Cache Warming Strategy

```javascript
// cache-warmer.js
class CacheWarmer {
  constructor(cdnDomain, topUrls) {
    this.cdnDomain = cdnDomain;
    this.topUrls = topUrls;
    this.edgeLocations = [
      'us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1',
      'ap-northeast-1', 'sa-east-1', 'af-south-1', 'ap-south-1',
    ];
  }
  
  // Warm cache for specific URLs
  async warmURLs(urls) {
    console.log(`🔥 Warming cache for ${urls.length} URLs...`);
    
    const results = await Promise.allSettled(
      urls.flatMap(url =>
        this.edgeLocations.map(location =>
          this.fetchFromEdge(url, location)
        )
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✓ Cache warming complete: ${successful} successful, ${failed} failed`);
    
    return { successful, failed };
  }
  
  // Fetch URL from specific edge location
  async fetchFromEdge(url, location) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': `CacheWarmer/${location}`,
          'X-Cache-Warm': 'true',
        },
      });
      
      if (response.ok) {
        const cacheStatus = response.headers.get('CF-Cache-Status') || 
                           response.headers.get('X-Cache');
        console.log(`  ✓ ${location}: ${url} (${cacheStatus})`);
        return { location, url, status: 'success' };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`  ✗ ${location}: ${url} (${error.message})`);
      return { location, url, status: 'failed', error: error.message };
    }
  }
  
  // Warm top pages based on analytics
  async warmTopPages(limit = 100) {
    // Fetch top pages from analytics
    const topPages = await this.getTopPages(limit);
    
    console.log(`\n📈 Top ${topPages.length} pages from analytics:`);
    topPages.forEach((page, i) => {
      console.log(`  ${i + 1}. ${page.url} (${page.views} views)`);
    });
    
    await this.warmURLs(topPages.map(p => p.url));
  }
  
  // Get top pages from analytics API
  async getTopPages(limit) {
    // Example: Google Analytics API
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit,
        }),
      }
    );
    
    const data = await response.json();
    
    return data.rows.map(row => ({
      url: `${this.cdnDomain}${row.dimensionValues[0].value}`,
      views: parseInt(row.metricValues[0].value),
    }));
  }
}

// GitHub Actions workflow example
// .github/workflows/deploy-and-warm.yml
`
name: Deploy and Warm Cache

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Build
        run: npm run build
        
      - name: Deploy to S3
        run: aws s3 sync dist/ s3://my-bucket/
        
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} \
            --paths "/*"
        
      - name: Warm Cache
        run: node scripts/cache-warmer.js
        env:
          CDN_DOMAIN: https://cdn.example.com
          GA_ACCESS_TOKEN: ${{ secrets.GA_ACCESS_TOKEN }}
`;

// Usage
const warmer = new CacheWarmer(
  'https://cdn.example.com',
  [
    '/',
    '/products',
    '/about',
    '/contact',
  ]
);

// Run after deployment
warmer.warmTopPages(50);
```

### Example 5: Multi-CDN Failover Strategy

```javascript
// multi-cdn-router.js
class MultiCDNRouter {
  constructor() {
    this.cdns = [
      {
        name: 'Cloudflare',
        domain: 'cdn1.example.com',
        priority: 1,
        healthCheck: 'https://cdn1.example.com/health',
      },
      {
        name: 'CloudFront',
        domain: 'cdn2.example.com',
        priority: 2,
        healthCheck: 'https://cdn2.example.com/health',
      },
      {
        name: 'Fastly',
        domain: 'cdn3.example.com',
        priority: 3,
        healthCheck: 'https://cdn3.example.com/health',
      },
    ];
    
    this.healthStatus = new Map();
    this.startHealthChecks();
  }
  
  // Periodic health checks
  startHealthChecks() {
    setInterval(() => {
      this.cdns.forEach(cdn => this.checkHealth(cdn));
    }, 30000); // Every 30 seconds
    
    // Initial check
    this.cdns.forEach(cdn => this.checkHealth(cdn));
  }
  
  async checkHealth(cdn) {
    try {
      const start = Date.now();
      const response = await fetch(cdn.healthCheck, {
        method: 'HEAD',
        timeout: 5000,
      });
      const latency = Date.now() - start;
      
      this.healthStatus.set(cdn.name, {
        healthy: response.ok,
        latency,
        lastCheck: Date.now(),
      });
      
      if (response.ok) {
        console.log(`✓ ${cdn.name}: Healthy (${latency}ms)`);
      } else {
        console.error(`✗ ${cdn.name}: Unhealthy (${response.status})`);
      }
    } catch (error) {
      console.error(`✗ ${cdn.name}: Failed (${error.message})`);
      this.healthStatus.set(cdn.name, {
        healthy: false,
        lastCheck: Date.now(),
        error: error.message,
      });
    }
  }
  
  // Get best available CDN
  getBestCDN() {
    // Filter to healthy CDNs
    const healthyCDNs = this.cdns.filter(cdn => {
      const status = this.healthStatus.get(cdn.name);
      return status && status.healthy;
    });
    
    if (healthyCDNs.length === 0) {
      console.warn('⚠️  No healthy CDNs, falling back to origin');
      return { domain: 'origin.example.com' };
    }
    
    // Sort by priority (lower = better)
    healthyCDNs.sort((a, b) => a.priority - b.priority);
    
    return healthyCDNs[0];
  }
  
  // Rewrite asset URLs to use best CDN
  rewriteAssetURLs(html) {
    const bestCDN = this.getBestCDN();
    
    // Replace CDN URLs in HTML
    return html.replace(
      /https:\/\/cdn\.example\.com/g,
      `https://${bestCDN.domain}`
    );
  }
}

// Express middleware
const router = new MultiCDNRouter();

app.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (typeof data === 'string' && res.get('Content-Type')?.includes('text/html')) {
      // Rewrite CDN URLs in HTML
      data = router.rewriteAssetURLs(data);
    }
    
    originalSend.call(this, data);
  };
  
  next();
});

// Client-side failover
const assetLoader = {
  async loadWithFallback(url, cdnDomains) {
    for (const domain of cdnDomains) {
      try {
        const cdnUrl = url.replace('cdn.example.com', domain);
        const response = await fetch(cdnUrl);
        
        if (response.ok) {
          return response;
        }
      } catch (error) {
        console.warn(`Failed to load from ${domain}, trying next...`);
      }
    }
    
    throw new Error(`Failed to load ${url} from all CDNs`);
  },
};

// Usage
await assetLoader.loadWithFallback(
  'https://cdn.example.com/main.js',
  ['cdn1.example.com', 'cdn2.example.com', 'origin.example.com']
);
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question: "How would you design a CDN strategy for a global e-commerce application with millions of users?"**

**Strong Answer:**

"For a global e-commerce application, CDN strategy is critical—it directly impacts load times, conversion rates, and infrastructure costs. My approach has four layers: asset categorization, intelligent caching, edge optimization, and monitoring.

**First, I'd categorize assets by cacheability**. Immutable assets like versioned JavaScript and CSS get the longest TTL—365 days with the immutable directive. These use content-hash filenames like main.abc123.js, so every code change creates a new URL, eliminating cache invalidation concerns. Product images get medium TTL—30 days at CDN, 1 day in browser—since they change occasionally. HTML gets minimal browser cache but 5-10 minutes at the CDN edge to balance freshness with offload. User-specific content like cart data never caches.

**For the CDN provider, I'd likely use Cloudflare as primary** for performance and cost, with CloudFront as failover for redundancy. Cloudflare has 275+ PoPs globally, putting content within 50ms of 95% of users. Without a CDN, our Australian users would experience 350ms latency to a US origin; with edge caching, that drops to 20-30ms—a 10x improvement.

**Origin Shield is essential at scale**. Without it, when a popular asset expires simultaneously at 100 edge servers, we get a cache stampede—100 requests hit the origin at once. Origin Shield creates a regional cache tier, so those 100 edges first check the shield. Result: 1 request to origin instead of 100, preventing origin overload.

**Cache invalidation strategy depends on content type**. For static assets, we avoid purging entirely—versioned filenames mean old versions naturally expire as users request new ones. For HTML and API responses, we use tag-based purging. When a product updates, we purge the tag 'product-123', invalidating just that product's pages across all edges. On deployment, we invalidate HTML paths but not versioned JS/CSS.

**Cache warming is critical for smooth deployments**. After deploying new code, all edge caches are cold. If we immediately switch traffic, we get a thundering herd to origin. Instead, we pre-fetch the top 50-100 pages to major edge locations before switching traffic. This typically takes 2-3 minutes but prevents the origin spike.

**For personalization at edge**, I'd use Cloudflare Workers or Lambda@Edge. A/B testing is a perfect use case—we route users to experiment variants at the edge without touching the origin. Edge workers can also inject authentication headers, rewrite URLs for i18n, or modify responses for user-specific content while keeping the base response cached.

**Monitoring is continuous**. We track cache hit ratio—anything below 90% indicates a problem with TTLs or cache keys. We monitor P50, P95, P99 latency by region to catch edge performance issues. We alert on cache purge frequency since excessive purging suggests architectural problems.

**One challenge we faced was the Vary header** for compression. Initially, we didn't set Vary: Accept-Encoding, so the CDN cached a Brotli response and served it to IE11 users, breaking the site. Adding the Vary header creates separate cache entries per encoding, solving the issue but doubling cache storage. The trade-off is worth it—correct compression per browser is essential.

**Cost-wise, at 10TB/month traffic, a CDN with 95% hit ratio saves about 72%** on total infrastructure costs. The CDN costs $400/month but offloads 9.5TB from origin, saving $950 in origin bandwidth plus thousands in reduced compute needs. Breakeven is around 500GB/month, so almost any production app benefits."

### Likely Follow-Up Questions

1. **"How do you handle cache invalidation without downtime?"**
   - Use versioned URLs for static assets (no invalidation needed)
   - For HTML: Deploy → warm cache → purge old → switch traffic
   - Graceful degradation: stale-while-revalidate for smooth transitions
   - Blue-green deployments: Switch CDN origin without purging
   - Atomic updates: Purge at end of transaction, not beginning

2. **"What's your strategy for handling CDN outages?"**
   - Multi-CDN with DNS failover (primary + backup)
   - Health checks every 30 seconds from multiple regions
   - Automatic failover via GeoDNS (Route53, NS1)
   - Client-side fallback: Try primary, then secondary, then origin
   - Cloudflare outage 2021: 85% of sites down, proved need for multi-CDN

3. **"How do you optimize cache hit rates?"**
   - Normalize query strings (order-independent cache keys)
   - Remove unnecessary cache key variations
   - Use origin shield to consolidate cache fills
   - Cache warming for popular content
   - Longer TTLs where possible (balance freshness vs hits)
   - Monitor cache analytics to identify miss patterns

4. **"Explain the trade-off between TTL length and content freshness."**
   - Long TTL (1 year): Maximum hit rate, zero origin load, but stale risk
   - Short TTL (5 min): Always fresh, but more origin requests, lower cache hits
   - Solution: Versioned URLs for static (long TTL), short TTL for dynamic
   - Stale-while-revalidate: Serve stale immediately, fetch fresh in background
   - Tag-based purging: Long TTL + surgical invalidation on updates

5. **"How does a CDN handle dynamic content?"**
   - Traditional: Can't cache user-specific content
   - Modern: Edge computing (Workers, Lambda@Edge)
   - Strategy: Cache base response, personalize at edge
   - Example: Cache product page HTML, inject cart count at edge
   - Edge workers add 0-5ms latency vs 100-300ms origin roundtrip

6. **"What metrics do you monitor for CDN health?"**
   - Cache hit ratio (target: 90-98%)
   - Origin offload percentage (target: 95%+)
   - P50/P95/P99 latency by region
   - Error rates (5xx from origin vs edge)
   - Bandwidth saved (cost optimization)
   - Cache purge frequency (architecture health indicator)

### Comparison with Alternatives

| Approach | When to Use | Trade-offs |
|----------|-------------|------------|
| **No CDN** | Very low traffic (< 1GB/month) | Simple, but poor global performance |
| **Single CDN** | Standard applications | Good performance, but single point of failure |
| **Multi-CDN** | Mission-critical, global apps | Maximum reliability, but increased complexity |
| **Origin-only** | User-specific, real-time content | Always fresh, but doesn't scale globally |
| **CDN + Edge compute** | Personalized at scale | Best of both worlds, but more expensive |
| **Self-hosted CDN** | Compliance, control requirements | Full control, but operational overhead |

### Trade-Off Explanations

**Trade-off 1: TTL Length vs Freshness**
"For our product catalog API, we tested 1-minute, 5-minute, and 30-minute TTLs. At 1-minute, cache hit rate was 65%—35% of requests hit origin, causing 3-5 second P99 latency under load. At 5 minutes, hit rate jumped to 92%—acceptable since product data rarely changes faster than 5 minutes. At 30 minutes, hit rate was 96%, but we had issues with inventory showing as available when it wasn't. We settled on 5 minutes with tag-based purging on inventory changes—best balance of performance and freshness."

**Trade-off 2: Single CDN vs Multi-CDN**
"Single CDN (Cloudflare) costs $400/month at our scale. Adding CloudFront as failover adds $150/month—38% cost increase. During the Fastly outage in 2021, sites with single-CDN were down 49 minutes, losing ~$200K in our case. Multi-CDN has paid for itself multiple times over in prevented downtime. The operational complexity is minimal—DNS-based failover is mostly automated."

**Trade-off 3: Pre-compression vs On-the-Fly CDN Compression**
"We tested pre-compressing assets during build vs letting the CDN compress dynamically. Pre-compression added 30 seconds to build time but reduced our main.js from 850KB to 212KB (Brotli level 11). CDN on-the-fly compression only achieved 255KB (Gzip level 6) due to CPU constraints. At 1M requests/day, the 43KB difference saves 43GB bandwidth—$4.30/day or $1,570/year. The 30-second build time cost is trivial compared to ongoing savings."

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Intelligent Cache Headers Middleware

```javascript
// express-cache-headers.js
const cacheHeaders = require('express-cache-headers');

// Cache configuration by route pattern
const cacheConfig = {
  // Static assets - immutable, long cache
  '/static/**': {
    cacheControl: 'public, max-age=31536000, immutable',
    vary: 'Accept-Encoding',
  },
  
  // API - public data with medium cache
  '/api/products': {
    cacheControl: 'public, max-age=300, s-maxage=600',
    vary: 'Accept-Encoding',
    tags: ['api', 'products'],
  },
  
  '/api/products/:id': {
    cacheControl: 'public, max-age=600, s-maxage=1800',
    vary: 'Accept-Encoding',
    tags: (req) => ['api', 'products', `product-${req.params.id}`],
  },
  
  // API - user-specific, no cache
  '/api/user/**': {
    cacheControl: 'private, no-cache, no-store, must-revalidate',
    pragma: 'no-cache',
    expires: '0',
  },
  
  // HTML - short CDN cache, no browser cache
  '/': {
    cacheControl: 'public, max-age=0, s-maxage=300',
    vary: 'Accept-Encoding, Accept-Language',
    tags: ['html', 'homepage'],
  },
  
  '/products': {
    cacheControl: 'public, max-age=0, s-maxage=600',
    vary: 'Accept-Encoding, Accept-Language',
    tags: ['html', 'products'],
  },
};

// Middleware to apply cache headers
function applyCacheHeaders(req, res, next) {
  // Find matching config
  const config = findMatchingConfig(req.path, cacheConfig);
  
  if (config) {
    // Set Cache-Control
    res.set('Cache-Control', config.cacheControl);
    
    // Set Vary header
    if (config.vary) {
      res.set('Vary', config.vary);
    }
    
    // Set Pragma (for HTTP/1.0 compatibility)
    if (config.pragma) {
      res.set('Pragma', config.pragma);
    }
    
    // Set Expires (for HTTP/1.0 compatibility)
    if (config.expires) {
      res.set('Expires', config.expires);
    }
    
    // Set cache tags (Cloudflare, Fastly)
    if (config.tags) {
      const tags = typeof config.tags === 'function' 
        ? config.tags(req) 
        : config.tags;
      
      res.set('Cache-Tag', tags.join(','));
    }
    
    // Set stale-while-revalidate if specified
    if (config.staleWhileRevalidate) {
      const current = res.get('Cache-Control');
      res.set('Cache-Control', `${current}, stale-while-revalidate=${config.staleWhileRevalidate}`);
    }
  }
  
  next();
}

// Pattern matching helper
function findMatchingConfig(path, config) {
  for (const [pattern, value] of Object.entries(config)) {
    if (matchPattern(path, pattern)) {
      return value;
    }
  }
  return null;
}

function matchPattern(path, pattern) {
  // Convert pattern to regex
  const regex = new RegExp(
    '^' + pattern.replace(/\*/g, '.*').replace(/:\w+/g, '[^/]+') + '$'
  );
  return regex.test(path);
}

// Usage
app.use(applyCacheHeaders);

// Route handlers
app.get('/api/products', async (req, res) => {
  const products = await db.getProducts();
  res.json(products);
  // Headers automatically applied: Cache-Control, Vary, Cache-Tag
});

app.get('/api/products/:id', async (req, res) => {
  const product = await db.getProduct(req.params.id);
  res.json(product);
  // Tag includes product-specific identifier for targeted purging
});
```

### Example 2: CDN Performance Monitor

```javascript
// cdn-monitor.js
class CDNPerformanceMonitor {
  constructor(cdnDomain) {
    this.cdnDomain = cdnDomain;
    this.metrics = {
      requests: 0,
      hits: 0,
      misses: 0,
      errors: 0,
      totalLatency: 0,
      byStatus: {},
    };
  }
  
  // Track request to CDN
  trackRequest(url, response) {
    this.metrics.requests++;
    
    // Detect cache status from headers
    const cacheStatus = 
      response.headers.get('CF-Cache-Status') ||  // Cloudflare
      response.headers.get('X-Cache') ||          // CloudFront, Fastly
      'UNKNOWN';
    
    if (cacheStatus === 'HIT') {
      this.metrics.hits++;
    } else if (cacheStatus === 'MISS') {
      this.metrics.misses++;
    }
    
    // Track by status
    this.metrics.byStatus[cacheStatus] = 
      (this.metrics.byStatus[cacheStatus] || 0) + 1;
    
    // Track errors
    if (!response.ok) {
      this.metrics.errors++;
    }
    
    // Track latency (from Performance API)
    const entry = performance.getEntriesByName(url)[0];
    if (entry) {
      this.metrics.totalLatency += entry.duration;
    }
  }
  
  // Get cache hit ratio
  getCacheHitRatio() {
    const total = this.metrics.hits + this.metrics.misses;
    if (total === 0) return 0;
    return (this.metrics.hits / total * 100).toFixed(2);
  }
  
  // Get average latency
  getAverageLatency() {
    if (this.metrics.requests === 0) return 0;
    return (this.metrics.totalLatency / this.metrics.requests).toFixed(2);
  }
  
  // Generate report
  getReport() {
    return {
      totalRequests: this.metrics.requests,
      cacheHitRatio: this.getCacheHitRatio() + '%',
      averageLatency: this.getAverageLatency() + 'ms',
      errors: this.metrics.errors,
      errorRate: (this.metrics.errors / this.metrics.requests * 100).toFixed(2) + '%',
      statusBreakdown: this.metrics.byStatus,
    };
  }
  
  // Send metrics to analytics
  sendToAnalytics() {
    const report = this.getReport();
    
    // Send to your analytics service
    fetch('/api/metrics/cdn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    
    console.log('📊 CDN Performance Report:', report);
  }
}

// Client-side usage
const monitor = new CDNPerformanceMonitor('https://cdn.example.com');

// Intercept fetch to track CDN requests
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch(...args);
  
  const url = typeof args[0] === 'string' ? args[0] : args[0].url;
  
  if (url.includes(monitor.cdnDomain)) {
    monitor.trackRequest(url, response.clone());
  }
  
  return response;
};

// Report periodically
setInterval(() => {
  monitor.sendToAnalytics();
}, 60000); // Every minute

// Report on page unload
window.addEventListener('beforeunload', () => {
  monitor.sendToAnalytics();
});
```

### Example 3: Dynamic CDN URL Rewriter

```javascript
// cdn-rewriter.js
class CDNRewriter {
  constructor(config) {
    this.originDomain = config.originDomain;
    this.cdnDomains = config.cdnDomains;
    this.assetPatterns = config.assetPatterns || [
      /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i
    ];
  }
  
  // Rewrite HTML to use CDN URLs
  rewriteHTML(html) {
    return html.replace(
      new RegExp(`https?://${this.originDomain}`, 'g'),
      (match) => {
        // Determine if it's an asset URL
        if (this.isAssetURL(match)) {
          return this.selectCDN();
        }
        return match;
      }
    );
  }
  
  // Check if URL is for a static asset
  isAssetURL(url) {
    return this.assetPatterns.some(pattern => pattern.test(url));
  }
  
  // Select CDN based on strategy
  selectCDN(strategy = 'roundRobin') {
    switch (strategy) {
      case 'roundRobin':
        return this.roundRobinCDN();
      
      case 'hash':
        return this.hashBasedCDN();
      
      case 'geo':
        return this.geoBasedCDN();
      
      default:
        return this.cdnDomains[0];
    }
  }
  
  // Round-robin distribution
  roundRobinCDN() {
    this._currentCDN = (this._currentCDN || 0) + 1;
    return this.cdnDomains[this._currentCDN % this.cdnDomains.length];
  }
  
  // Hash-based (consistent hashing)
  hashBasedCDN(url) {
    const hash = this.hashCode(url);
    return this.cdnDomains[hash % this.cdnDomains.length];
  }
  
  // Geo-based (based on user location)
  geoBasedCDN(userLocation) {
    // Map locations to nearest CDN
    const geoMap = {
      'US': this.cdnDomains[0],
      'EU': this.cdnDomains[1],
      'ASIA': this.cdnDomains[2],
    };
    
    return geoMap[userLocation] || this.cdnDomains[0];
  }
  
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

// Express middleware
const rewriter = new CDNRewriter({
  originDomain: 'example.com',
  cdnDomains: [
    'https://cdn1.example.com',
    'https://cdn2.example.com',
  ],
});

app.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (typeof data === 'string' && res.get('Content-Type')?.includes('text/html')) {
      data = rewriter.rewriteHTML(data);
    }
    
    originalSend.call(this, data);
  };
  
  next();
});

// React component for CDN asset URLs
function CDNImage({ src, alt, ...props }) {
  const cdnDomains = [
    'https://cdn1.example.com',
    'https://cdn2.example.com',
  ];
  
  // Use hash-based distribution for consistent URLs
  const hashCode = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };
  
  const hash = hashCode(src);
  const cdnDomain = cdnDomains[hash % cdnDomains.length];
  const cdnUrl = `${cdnDomain}${src}`;
  
  return <img src={cdnUrl} alt={alt} {...props} />;
}
```

### Example 4: Service Worker with CDN Fallback

```javascript
// service-worker.js
const CDN_DOMAINS = [
  'https://cdn1.example.com',
  'https://cdn2.example.com',
  'https://origin.example.com',
];

const CACHE_NAME = 'cdn-cache-v1';

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/static/main.js',
        '/static/main.css',
      ]);
    })
  );
});

// Fetch event with CDN fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle asset requests
  if (isAssetRequest(url)) {
    event.respondWith(fetchWithCDNFallback(event.request));
  } else {
    event.respondWith(fetch(event.request));
  }
});

// Try multiple CDNs, then cache, then fail
async function fetchWithCDNFallback(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Try each CDN in order
  for (const cdnDomain of CDN_DOMAINS) {
    try {
      const cdnUrl = new URL(path, cdnDomain).href;
      const response = await fetch(cdnUrl, {
        ...request,
        mode: 'cors',
      });
      
      if (response.ok) {
        // Cache successful response
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        
        return response;
      }
    } catch (error) {
      console.warn(`CDN ${cdnDomain} failed:`, error);
      // Continue to next CDN
    }
  }
  
  // All CDNs failed, try cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log('Serving from cache (all CDNs failed)');
    return cachedResponse;
  }
  
  // Everything failed
  throw new Error(`Failed to fetch ${request.url} from all sources`);
}

function isAssetRequest(url) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/i.test(url.pathname);
}
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience:**
- **Latency reduction**: 300ms → 20ms (93% improvement globally)
- **Load time**: 50-200ms saved per asset request
- **Reliability**: Multi-region redundancy, automatic failover
- **Mobile users**: Critical on cellular connections (bandwidth constrained)

**Business Impact:**
```
Real case study: Global E-Commerce Platform (5M daily users)

Without CDN (single US East origin):
- US East users: 50ms latency (good)
- Europe users: 150ms latency (acceptable)
- Asia users: 300ms latency (poor)
- Australia users: 350ms latency (poor)
- Bounce rate (Asia/AU): 48%
- Global conversion: 2.3%
- Origin bandwidth: 15TB/month ($1,500)
- Origin compute: 50 servers ($10,000/month)
- Total monthly cost: $11,500

With CDN (Cloudflare, 275 PoPs):
- All users: 20-50ms latency (excellent)
- Cache hit ratio: 96%
- Bounce rate (Asia/AU): 22% (54% reduction)
- Global conversion: 3.8% (65% increase)
- CDN bandwidth: 14.4TB cached ($576)
- Origin bandwidth: 600GB ($60, 96% reduction)
- Origin compute: 5 servers ($1,000, 90% reduction)
- Total monthly cost: $1,636 (86% savings)
- Additional annual revenue: +$2.8M (conversion improvement)
- ROI: $1,636 monthly cost → $2.8M annual benefit (206x return)
```

**Technical Benefits:**
- **Scalability**: Handle traffic spikes without origin scaling
- **DDoS protection**: CDN absorbs attack traffic
- **Geographic distribution**: Content closer to users worldwide
- **Origin offload**: 95-98% requests served from edge, not origin
- **Cost efficiency**: CDN bandwidth cheaper than origin bandwidth

### How It Works

**Technical Summary:**

**1. CDN Request Flow:**
```
User request: GET /static/main.abc123.js

Step 1: DNS resolution
┌──────────┐
│  User    │ → "What's the IP for cdn.example.com?"
└──────────┘
              ↓
┌──────────────────────┐
│  DNS (GeoDNS)        │ → Returns IP of nearest edge server
└──────────────────────┘
              ↓
        203.0.113.45 (Tokyo edge server)

Step 2: Edge routing (Anycast)
┌──────────┐
│  User    │ → Packet to 203.0.113.45
└──────────┘
              ↓
    ┌─────────────────┐
    │  Internet       │ → Routes to nearest edge with that IP
    └─────────────────┘
              ↓
    ┌─────────────────┐
    │  Tokyo Edge     │ (Closest of 275 PoPs)
    └─────────────────┘

Step 3: Cache check
┌─────────────────┐
│  Tokyo Edge     │ → Check local cache for /static/main.abc123.js
└─────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  HIT       MISS
    │         │
    │         ▼
    │    ┌──────────────┐
    │    │ Check Shield │ (Regional cache)
    │    └──────────────┘
    │         │
    │    ┌────┴────┐
    │    │         │
    │    ▼         ▼
    │   HIT      MISS
    │    │         │
    │    │         ▼
    │    │    ┌────────┐
    │    │    │ Origin │ (Last resort)
    │    │    └────────┘
    │    │         │
    │    │         ▼
    │    │   [Cache in shield]
    │    │         │
    │    └─────────┘
    │              │
    └──────────────┘
                   ▼
              [Cache in edge]
                   │
                   ▼
              Return to user

Latency breakdown:
- Cache HIT: 20ms (edge only)
- Shield HIT: 50ms (edge + shield)
- MISS: 170ms (edge + shield + origin)

With 96% hit ratio:
Average = 0.96 × 20ms + 0.03 × 50ms + 0.01 × 170ms
        = 19.2ms + 1.5ms + 1.7ms
        = 22.4ms effective latency
```

**2. Caching Strategy:**
```
Asset type → Cache strategy

Versioned assets (main.abc123.js):
┌──────────────────────────────────────┐
│ Cache-Control: public,               │
│   max-age=31536000,                  │
│   immutable                          │
└──────────────────────────────────────┘
→ Cache 1 year, never revalidate
→ New version = new filename = auto invalidation

HTML (index.html):
┌──────────────────────────────────────┐
│ Cache-Control: public,               │
│   max-age=0,                         │
│   s-maxage=300                       │
└──────────────────────────────────────┘
→ Browser: always revalidate
→ CDN: 5 minutes
→ Fresh enough for users, high CDN hit rate

API (GET /api/products):
┌──────────────────────────────────────┐
│ Cache-Control: public,               │
│   max-age=300,                       │
│   s-maxage=600,                      │
│   stale-while-revalidate=86400       │
└──────────────────────────────────────┘
→ CDN: 10 minutes
→ After expiry: serve stale, fetch fresh in background
→ Zero waiting for users

User data (GET /api/user/profile):
┌──────────────────────────────────────┐
│ Cache-Control: private,              │
│   no-cache, no-store                 │
└──────────────────────────────────────┘
→ Never cache (user-specific)
```

**3. Geographic Distribution:**
```
Latency by distance (fiber optic, speed of light):

US East to:
- US West:    ~50ms minimum (4,000km)
- Europe:     ~80ms minimum (6,500km)
- Asia:       ~150ms minimum (12,000km)
- Australia:  ~180ms minimum (14,500km)

With CDN (user to nearest edge):
- Major cities:     10-20ms (< 200km)
- Medium cities:    20-40ms (200-1000km)
- Remote areas:     40-80ms (1000-3000km)

CDN effectiveness:
Without: US East user to Asia origin = 150ms
With:    Asia user to Asia edge = 20ms
Improvement: 87% faster
```

**4. Cache Hit Ratio Impact:**
```javascript
// Calculate effective origin load

const requestsPerSecond = 10000;
const cacheHitRatio = 0.96; // 96%

const edgeServes = requestsPerSecond * cacheHitRatio;
// = 9,600 req/s served from edge (no origin load)

const originServes = requestsPerSecond * (1 - cacheHitRatio);
// = 400 req/s hit origin

// Without CDN: 10,000 req/s to origin (unsustainable)
// With CDN: 400 req/s to origin (easily handled by 2-3 servers)

// Improvement: 96% origin offload
```

**5. Cost Breakdown:**
```
10TB/month traffic, 96% cache hit ratio:

CDN costs:
- Bandwidth: 10TB × $0.04/GB = $400/month
- Requests: 10B requests × $0.0001/10K = $100/month
- Total CDN: $500/month

Origin costs (WITH CDN):
- Bandwidth: 400GB × $0.10/GB = $40/month
- Compute: 2 small servers = $200/month
- Total origin: $240/month

Total WITH CDN: $740/month

Origin costs (WITHOUT CDN):
- Bandwidth: 10TB × $0.10/GB = $1,000/month
- Compute: 20 medium servers = $4,000/month
- Total origin: $5,000/month

Savings: $4,260/month = $51,120/year (86% reduction)
```

**Mental Model:**

Think of a CDN like **franchise restaurants**:
- **Origin** = Central kitchen (headquarters)
- **Edge servers** = Franchise locations (worldwide)
- **Menu** = Your content (static assets)
- **Cache** = Pre-cooked inventory at franchise
- **Cache miss** = Order something not in stock, call central kitchen
- **Cache hit** = Serve from local inventory (instant)
- **Cache expiry** = Inventory expires, need fresh delivery
- **Cache warming** = Stock franchises before big promotion

---

**Key Takeaway for Interviews:**

CDN provides **20-50ms latency to 95%+ of global users** (vs 50-300ms to single origin), **95-98% origin offload**, and **72-86% infrastructure cost savings** at scale. Strategy: **versioned URLs** for static assets (1-year immutable cache), **short TTL + edge purging** for dynamic content, **Origin Shield** to prevent cache stampedes. Cache hit ratio is critical—target 90%+ through longer TTLs, normalization, and warming. Monitor cache analytics, P99 latency by region, and origin offload percentage. Multi-CDN strategy essential for reliability (Fastly outage 2021 proved single-CDN risk). At 10TB/month, CDN costs $500 but saves $4,260 in origin costs—breakeven at ~500GB/month.

