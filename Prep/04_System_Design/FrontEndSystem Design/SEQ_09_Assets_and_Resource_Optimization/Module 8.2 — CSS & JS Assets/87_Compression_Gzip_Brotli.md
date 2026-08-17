# 68. Compression (Gzip, Brotli)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Compression** is the process of reducing the size of text-based assets (HTML, CSS, JavaScript, JSON, SVG, fonts) before transmitting them over the network, significantly reducing bandwidth usage and improving load times. The browser automatically decompresses the content before parsing.

### What it is:
A transparent layer between the server and browser where:
- **Server**: Compresses assets using algorithms (Gzip, Brotli, Deflate)
- **Network**: Transmits smaller compressed files
- **Browser**: Decompresses and uses original content

**Two primary algorithms:**
- **Gzip**: Industry standard, 70-80% compression ratio, universal support
- **Brotli**: Modern algorithm, 75-85% compression ratio, 15-20% better than Gzip

### Why it exists:
- **Network cost**: Text files are highly compressible (HTML, CSS, JS)
- **Bandwidth savings**: 70-85% reduction in transfer size
- **Load time**: Smaller files = faster downloads, especially on slow networks
- **User experience**: Directly impacts FCP, LCP, TTI metrics
- **Cost savings**: Reduced bandwidth costs at scale

**Real-world impact:**
```
Typical application without compression:
- main.js: 850KB
- main.css: 320KB
- index.html: 45KB
- Total: 1,215KB
- Download time (3G): 9.8s

With Gzip compression:
- main.js: 255KB (70% reduction)
- main.css: 64KB (80% reduction)
- index.html: 11KB (76% reduction)
- Total: 330KB (73% reduction)
- Download time (3G): 2.7s (72% faster)

With Brotli compression:
- main.js: 212KB (75% reduction)
- main.css: 48KB (85% reduction)
- index.html: 9KB (80% reduction)
- Total: 269KB (78% reduction)
- Download time (3G): 2.2s (78% faster)
```

### When and where it's used:
- **All text-based assets**: HTML, CSS, JavaScript, JSON, XML, SVG
- **Web fonts**: WOFF files (already compressed), but WOFF2 includes Brotli
- **API responses**: JSON/XML payloads
- **Not for**: Images (JPEG, PNG already compressed), videos, pre-compressed files

### Role in large-scale applications:
In production systems:
- **Automatic compression** at CDN layer (Cloudflare, Fastly)
- **Pre-compression** during build process (static assets)
- **Dynamic compression** for server-rendered content
- **Content negotiation** via `Accept-Encoding` header
- **Monitoring** tracks compression ratios and savings

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### How Compression Works

**HTTP Compression Flow:**
```
1. Browser Request:
   GET /main.js
   Accept-Encoding: gzip, deflate, br

2. Server Processing:
   - Checks if file is compressible (text-based)
   - Checks Accept-Encoding header
   - Compresses using best supported algorithm
   - Adds Content-Encoding header

3. Server Response:
   HTTP/1.1 200 OK
   Content-Type: application/javascript
   Content-Encoding: br
   Content-Length: 212000
   [Compressed content]

4. Browser:
   - Detects Content-Encoding: br
   - Decompresses automatically
   - Uses original 850KB file
```

### Gzip vs Brotli Deep Dive

**Gzip (1992):**
- Based on DEFLATE algorithm (LZ77 + Huffman coding)
- Compression levels: 1 (fastest) to 9 (best compression)
- Universal browser support (since IE 5.5)
- Compression speed: ~20 MB/s (level 6)
- Decompression speed: ~200 MB/s

**Brotli (2015, by Google):**
- Uses a dictionary of 13,504 common words/phrases
- Compression levels: 0-11 (level 11 = maximum, very slow)
- Browser support: 95%+ (all modern browsers, IE not supported)
- Compression speed: ~1 MB/s (level 11), ~10 MB/s (level 5)
- Decompression speed: ~300 MB/s (faster than Gzip!)
- **15-20% better compression** than Gzip at comparable levels

**Compression comparison (JavaScript file, 850KB):**
```
Original:           850KB
Gzip (level 6):     255KB (70% reduction, 50ms compression)
Gzip (level 9):     242KB (72% reduction, 180ms compression)
Brotli (level 5):   230KB (73% reduction, 85ms compression)
Brotli (level 11):  212KB (75% reduction, 850ms compression)

For static assets: Use Brotli level 11 (pre-compress during build)
For dynamic content: Use Brotli level 5 or Gzip level 6
```

### Compression Levels Trade-off

**Gzip level comparison:**
```
Level 1: Fastest compression (15ms), 60% reduction
Level 6: Default (50ms), 70% reduction ← Most balanced
Level 9: Best compression (180ms), 72% reduction
```

**Brotli level comparison:**
```
Level 0: Fastest (5ms), 65% reduction
Level 4: Fast (60ms), 71% reduction
Level 5: Balanced (85ms), 73% reduction ← Good for dynamic
Level 11: Maximum (850ms), 75% reduction ← Pre-compress only
```

### Static vs Dynamic Compression

**Static (Pre-compression):**
```
Build process:
1. Create main.js (850KB)
2. Create main.js.gz (255KB) - Gzip level 9
3. Create main.js.br (212KB) - Brotli level 11
4. Upload all three to CDN

Request flow:
1. Browser requests main.js with Accept-Encoding: br
2. CDN serves main.js.br (already compressed)
3. Zero CPU cost at request time
4. Maximum compression (level 11)

Best for: Static assets (JS, CSS, fonts, HTML)
```

**Dynamic Compression:**
```
Request flow:
1. Server generates HTML dynamically
2. Compresses on-the-fly (Brotli level 5)
3. Sends compressed response
4. CPU cost per request

Best for: Server-rendered pages, API responses
Trade-off: Compression level vs CPU usage
```

### Content Negotiation

**Accept-Encoding header priority:**
```javascript
// Browser sends:
Accept-Encoding: gzip, deflate, br

// Server priority (best to worst):
1. br (Brotli) - 15-20% better than Gzip
2. gzip - Universal support
3. deflate - Older, rarely used
4. identity - No compression (fallback)

// Server response:
Content-Encoding: br  // Tells browser which algorithm was used
```

### Compression by File Type

**Compression effectiveness:**
```
HTML:        75-85% reduction
CSS:         75-85% reduction
JavaScript:  70-75% reduction
JSON:        75-85% reduction
SVG:         65-75% reduction
XML:         75-85% reduction
Web fonts:   Varies (WOFF2 already uses Brotli)

Already compressed (skip):
Images:      JPEG, PNG, WebP, AVIF
Video:       MP4, WebM
Audio:       MP3, AAC
Archives:    ZIP, RAR
WOFF2:       Already Brotli-compressed
```

### Browser Decompression Performance

**Decompression overhead:**
```
Gzip decompression:
- 255KB → 850KB: ~1.3ms CPU time
- 200 MB/s throughput
- Negligible impact

Brotli decompression:
- 212KB → 850KB: ~1.1ms CPU time
- 300 MB/s throughput
- Faster than Gzip!

Key insight: Network time (100-1000ms) >>> Decompression time (~1ms)
Compression is almost always a net win
```

### CDN Integration

**CDN automatic compression:**
```
Cloudflare:
- Automatic Gzip/Brotli
- Configurable compression levels
- Smart caching of compressed variants
- Brotli enabled by default

Fastly:
- Automatic compression
- Custom VCL for compression control
- Supports pre-compressed assets

AWS CloudFront:
- Automatic Gzip compression
- Brotli support (requires Lambda@Edge or manual setup)
- Caches compressed and uncompressed separately
```

### Scalability Considerations

**At millions of requests/day:**

**Static pre-compression:**
```
No compression:
- 1M requests × 850KB = 850GB transfer
- Bandwidth cost: $85 (at $0.10/GB)

Pre-compressed (Brotli):
- 1M requests × 212KB = 212GB transfer
- Bandwidth cost: $21 (at $0.10/GB)
- Savings: $64/day = $23,360/year

Build time overhead: 2-5 seconds (one-time)
Request time overhead: 0ms (pre-compressed)
```

**Dynamic compression:**
```
CPU cost per request:
- Brotli level 5: 85ms CPU
- At 1000 req/s: 85 CPU seconds/second = 85 cores needed
- Solution: Use Gzip level 6 (50ms) or cache compressed responses

Trade-off: Compression level vs server cost
```

### Common Pitfalls

1. **Compressing already-compressed files:**
   ```
   JPEG (1MB) → Gzip → 1.01MB (no benefit, wasted CPU)
   PNG (500KB) → Gzip → 505KB (no benefit)
   ```

2. **Over-compression on dynamic content:**
   ```
   Brotli level 11 on HTML: 850ms CPU per request
   At 100 req/s: 85 CPU seconds/second (unsustainable)
   Solution: Use level 5 (85ms) or cache
   ```

3. **Not pre-compressing static assets:**
   ```
   CDN compresses on-the-fly: 50-100ms per request
   Pre-compressed: 0ms per request
   At 1M requests: 13-27 hours wasted CPU time
   ```

4. **Missing Content-Type headers:**
   ```
   Without Content-Type: text/javascript
   → CDN doesn't know it's compressible
   → Serves uncompressed
   ```

5. **HTTPS overhead ignorance:**
   ```
   Compression reduces payload but not TLS overhead
   1KB JSON → 200 bytes compressed
   But TLS adds ~5KB of headers per connection
   Keep-alive connections essential
   ```

### Best Practices in Production

1. **Pre-compress static assets** during build (Brotli level 11)
2. **Serve Brotli to modern browsers**, Gzip fallback for legacy
3. **Dynamic compression** at level 4-6 for HTML/JSON
4. **Cache compressed responses** in memory/Redis
5. **Set Vary: Accept-Encoding** header for cache keys
6. **Monitor compression ratios** in observability stack
7. **Don't compress** images, videos, already-compressed files
8. **Use CDN compression** as safety net, not primary strategy

### Edge Cases & Failure Scenarios

**Case 1: Brotli Breaking in Safari (2016)**
- Safari 10 had buggy Brotli decompression
- Caused white screen for users
- Solution: User-agent detection, Gzip fallback
- Lesson: Test compression across browsers

**Case 2: Over-compression CPU Saturation**
- E-commerce site used Brotli level 11 for dynamic HTML
- 500ms CPU per request
- Server couldn't handle traffic spike
- Solution: Switched to Brotli level 5 (85ms)

**Case 3: Missing Vary Header**
- CDN cached Brotli response for all users
- IE11 received Brotli (unsupported) → broken page
- Solution: `Vary: Accept-Encoding` ensures separate caches

**Case 4: Pre-compressed Files Not Served**
- Build created .br files, but server didn't serve them
- Server compressed on-the-fly instead (wasted effort)
- Solution: Configure server/CDN to check for .br files first

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: E-Commerce Site Compression Strategy

**Asset breakdown:**
```
Uncompressed:
- main.js:        850KB
- vendor.js:      620KB
- main.css:       320KB
- product-list.json: 280KB
- index.html:     45KB
Total:            2,115KB

Compressed (Brotli level 11 for static, level 5 for dynamic):
- main.js.br:     212KB (75% reduction)
- vendor.js.br:   155KB (75% reduction)
- main.css.br:    48KB (85% reduction)
- product-list.json: 56KB (80% reduction, dynamic)
- index.html:     11KB (76% reduction, dynamic)
Total:            482KB (77% reduction)

Impact:
- Load time 3G: 17s → 4s (76% faster)
- Bandwidth saved: 1.6GB per 1000 users
- Monthly cost savings (1M users): $4,800
```

### Example 2: Webpack Build-Time Pre-compression

**Install plugins:**
```bash
npm install --save-dev compression-webpack-plugin
npm install --save-dev brotli-webpack-plugin
```

**Webpack configuration:**
```javascript
// webpack.config.js
const CompressionPlugin = require('compression-webpack-plugin');
const BrotliPlugin = require('brotli-webpack-plugin');

module.exports = {
  // ... other config
  
  plugins: [
    // Gzip compression (fallback for older browsers)
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg|json)$/,
      threshold: 10240, // Only compress files > 10KB
      minRatio: 0.8,    // Only compress if ratio < 80%
      compressionOptions: {
        level: 9,       // Maximum compression
      },
    }),
    
    // Brotli compression (better compression for modern browsers)
    new BrotliPlugin({
      asset: '[path][base].br',
      test: /\.(js|css|html|svg|json)$/,
      threshold: 10240,
      minRatio: 0.8,
      quality: 11,      // Maximum compression (0-11)
    }),
  ],
};
```

**Build output:**
```
dist/
├── main.abc123.js          (850KB - original)
├── main.abc123.js.gz       (242KB - Gzip level 9)
├── main.abc123.js.br       (212KB - Brotli level 11)
├── vendor.def456.js        (620KB)
├── vendor.def456.js.gz     (176KB)
├── vendor.def456.js.br     (155KB)
├── main.abc123.css         (320KB)
├── main.abc123.css.gz      (69KB)
└── main.abc123.css.br      (48KB)
```

### Example 3: Express Server with Dynamic Compression

```javascript
// server.js
const express = require('express');
const compression = require('compression');
const shrinkRay = require('shrink-ray-current'); // Better Brotli support

const app = express();

// Option 1: Standard compression (Gzip)
app.use(compression({
  level: 6,           // Compression level (1-9)
  threshold: 1024,    // Only compress > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use default compression filter
    return compression.filter(req, res);
  },
}));

// Option 2: Brotli + Gzip (better, recommended)
app.use(shrinkRay({
  brotli: {
    quality: 5,       // Brotli level 5 (balanced for dynamic)
  },
  zlib: {
    level: 6,         // Gzip level 6 (fallback)
  },
  threshold: 1024,
  filter: (req, res) => {
    const contentType = res.getHeader('Content-Type');
    // Compress text-based content
    return /text|javascript|json|xml|svg/.test(contentType);
  },
}));

// Serve pre-compressed static files
app.get('*.js', (req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  // Try Brotli first (best compression)
  if (acceptEncoding.includes('br')) {
    req.url = req.url + '.br';
    res.set('Content-Encoding', 'br');
    res.set('Content-Type', 'application/javascript');
    next();
  }
  // Fallback to Gzip
  else if (acceptEncoding.includes('gzip')) {
    req.url = req.url + '.gz';
    res.set('Content-Encoding', 'gzip');
    res.set('Content-Type', 'application/javascript');
    next();
  }
  // No compression support
  else {
    next();
  }
});

// Serve static files
app.use(express.static('dist'));

// API endpoint with compression
app.get('/api/products', async (req, res) => {
  const products = await db.getProducts(); // Large JSON response
  
  // Compression middleware handles this automatically
  res.json(products);
  
  // Response headers will include:
  // Content-Encoding: br (or gzip)
  // Vary: Accept-Encoding
});

app.listen(3000);
```

### Example 4: Nginx Configuration for Compression

```nginx
# nginx.conf

http {
  # Gzip configuration (fallback)
  gzip on;
  gzip_vary on;
  gzip_proxied any;
  gzip_comp_level 6;
  gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/x-javascript
    image/svg+xml;
  gzip_min_length 1024;
  
  # Brotli configuration (requires ngx_brotli module)
  brotli on;
  brotli_comp_level 5;
  brotli_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/x-javascript
    image/svg+xml;
  brotli_min_length 1024;
  
  # Try pre-compressed files first
  brotli_static on;  # Serve .br files if available
  gzip_static on;    # Serve .gz files if available
  
  server {
    listen 80;
    server_name example.com;
    root /var/www/html;
    
    # Static assets with long cache + compression
    location ~* \.(js|css)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
      add_header Vary "Accept-Encoding";
      
      # Try .br, then .gz, then original
      try_files $uri.br $uri.gz $uri =404;
    }
    
    # Dynamic content
    location /api/ {
      proxy_pass http://backend:3000;
      
      # Ensure compression works with proxy
      proxy_set_header Accept-Encoding "";
      
      # Let nginx compress the response
      gzip_proxied any;
    }
  }
}
```

### Example 5: CloudFront with Pre-compressed Assets

**CloudFront distribution configuration:**
```javascript
// AWS CDK example
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';

const bucket = new s3.Bucket(this, 'WebsiteBucket');

const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(bucket),
    
    // Enable compression
    compress: true,
    
    // Cache based on Accept-Encoding header
    cachePolicy: new cloudfront.CachePolicy(this, 'CachePolicy', {
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Accept-Encoding'
      ),
    }),
    
    // Cache both compressed and uncompressed versions
    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
  },
});

// Upload files with metadata
import { S3 } from 'aws-sdk';

const s3Client = new S3();

// Upload original
await s3Client.putObject({
  Bucket: 'website-bucket',
  Key: 'main.js',
  Body: originalContent,
  ContentType: 'application/javascript',
  CacheControl: 'public, max-age=31536000, immutable',
});

// Upload Brotli version
await s3Client.putObject({
  Bucket: 'website-bucket',
  Key: 'main.js.br',
  Body: brotliCompressed,
  ContentType: 'application/javascript',
  ContentEncoding: 'br',
  CacheControl: 'public, max-age=31536000, immutable',
});

// Upload Gzip version
await s3Client.putObject({
  Bucket: 'website-bucket',
  Key: 'main.js.gz',
  Body: gzipCompressed,
  ContentType: 'application/javascript',
  ContentEncoding: 'gzip',
  CacheControl: 'public, max-age=31536000, immutable',
});
```

### Example 6: Compression Monitoring & Analytics

```javascript
// compressionMonitor.js
class CompressionMonitor {
  constructor() {
    this.metrics = {
      totalUncompressed: 0,
      totalCompressed: 0,
      requestCount: 0,
      compressionRatios: [],
    };
  }
  
  trackRequest(originalSize, compressedSize, encoding) {
    this.metrics.totalUncompressed += originalSize;
    this.metrics.totalCompressed += compressedSize;
    this.metrics.requestCount++;
    
    const ratio = (originalSize - compressedSize) / originalSize;
    this.metrics.compressionRatios.push({
      ratio,
      encoding,
      timestamp: Date.now(),
    });
    
    // Send to analytics
    this.sendMetrics({
      originalSize,
      compressedSize,
      encoding,
      ratio,
    });
  }
  
  getStats() {
    const avgRatio = this.metrics.compressionRatios
      .reduce((sum, { ratio }) => sum + ratio, 0) 
      / this.metrics.requestCount;
    
    const bandwidthSaved = 
      this.metrics.totalUncompressed - this.metrics.totalCompressed;
    
    const savingsPercent = 
      (bandwidthSaved / this.metrics.totalUncompressed) * 100;
    
    return {
      totalRequests: this.metrics.requestCount,
      bandwidthSaved: `${(bandwidthSaved / 1024 / 1024).toFixed(2)} MB`,
      savingsPercent: `${savingsPercent.toFixed(2)}%`,
      avgCompressionRatio: `${(avgRatio * 100).toFixed(2)}%`,
    };
  }
  
  sendMetrics(data) {
    // Send to monitoring system (DataDog, New Relic, etc.)
    fetch('/api/metrics/compression', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Express middleware
const monitor = new CompressionMonitor();

app.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    const originalSize = Buffer.byteLength(data);
    const encoding = res.getHeader('Content-Encoding');
    
    originalSend.call(this, data);
    
    // Track after response is sent
    const compressedSize = parseInt(res.getHeader('Content-Length') || originalSize);
    
    if (encoding && encoding !== 'identity') {
      monitor.trackRequest(originalSize, compressedSize, encoding);
    }
  };
  
  next();
});

// Report stats periodically
setInterval(() => {
  console.log('Compression Stats:', monitor.getStats());
}, 60000); // Every minute
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question: "How would you implement compression in a large-scale frontend application, and what trade-offs would you consider?"**

**Strong Answer:**

"Compression is essential at scale because text-based assets—JavaScript, CSS, HTML, JSON—are highly compressible. We typically see 70-85% size reduction, which directly translates to faster load times and significant bandwidth savings. For a site serving millions of users, compression can save thousands of dollars monthly in bandwidth costs alone.

**My approach has three layers**: static pre-compression during build, CDN-level compression as middleware, and dynamic compression for server-rendered content.

**For static assets**, I'd pre-compress during the build process using both Gzip and Brotli at maximum compression levels. This is a one-time cost—we use Brotli level 11 for maximum compression, which might take 850ms per file but happens once during build, not per request. The result is typically 75% size reduction for JavaScript and 85% for CSS. We generate three versions of each file: original, .gz, and .br. The build uploads all three to the CDN.

**Content negotiation happens at the CDN**. When a browser requests main.js with `Accept-Encoding: br, gzip`, the CDN serves main.js.br if Brotli is supported, otherwise main.js.gz, with the original as final fallback. This is critical—serving pre-compressed files has zero CPU cost at request time, unlike dynamic compression which adds 50-100ms per request.

**For dynamic content** like server-rendered HTML or API responses, I'd use Brotli level 5 or Gzip level 6. These provide 70-75% compression with minimal CPU overhead—about 85ms for Brotli level 5. Level 11 would be too expensive for real-time compression, potentially taking 500-850ms and saturating CPU under load. We faced this once where over-compression caused our servers to struggle during traffic spikes.

**Brotli vs Gzip is an important trade-off**. Brotli provides 15-20% better compression than Gzip, which is significant at scale. For a 1MB JavaScript file, Gzip might reduce it to 300KB while Brotli gets it to 250KB. That's 50KB saved per user, and at millions of requests that's hundreds of gigabytes. However, Brotli isn't supported in IE11, so we always generate both and let the CDN handle content negotiation.

**One critical detail is the Vary: Accept-Encoding header**. Without it, CDNs might cache a Brotli response and serve it to IE11 users, breaking the page. The Vary header ensures separate cache entries for each encoding type.

**For monitoring**, we track compression ratios, bandwidth saved, and any compression errors. At one company, we discovered that 12% of requests weren't being compressed due to a missing Content-Type header on some API endpoints. Fixing that saved 15TB of bandwidth monthly.

**I wouldn't compress** already-compressed formats—JPEG, PNG, MP4. Compressing a JPEG actually makes it slightly larger while wasting CPU. We set up content-type filters to skip non-compressible formats.

The key is balancing compression level with CPU cost. For static assets, maximum compression always wins because it's pre-computed. For dynamic content, we optimize for request throughput, using moderate compression levels and caching aggressively to amortize the cost."

### Likely Follow-Up Questions

1. **"What's the overhead of decompression in the browser?"**
   - Decompression is extremely fast: ~1-2ms for typical files
   - Gzip: 200 MB/s throughput, Brotli: 300 MB/s
   - Network time (100-1000ms) dominates decompression (~1ms)
   - Decompression happens automatically, transparent to JavaScript
   - Net win: Save 500ms network, cost 1ms CPU = 499ms faster

2. **"When would you not use compression?"**
   - Already-compressed formats (JPEG, PNG, MP4, ZIP)
   - Very small files (< 1KB, overhead exceeds benefit)
   - Binary formats that don't compress well
   - When CPU is constrained and traffic is low
   - Legacy clients without Accept-Encoding support (rare today)

3. **"How do you handle compression with micro-frontends?"**
   - Pre-compress each micro-frontend during build
   - CDN handles compression transparently across all micros
   - Shared dependencies in vendor chunks (compress once, reuse)
   - Monitor compression effectiveness per micro-frontend
   - Some micros (data-heavy) benefit more than others

4. **"Explain Brotli's dictionary and why it compresses better."**
   - Brotli has a built-in 13,504-word dictionary of common web terms
   - Dictionary includes: HTML tags, CSS properties, common JavaScript patterns
   - When compressing, references dictionary instead of repeating strings
   - Example: "addEventListener" → dictionary reference (2 bytes) vs full string (17 bytes)
   - Especially effective for HTML/CSS due to repetitive structure

5. **"What's the impact of compression on TTFB?"**
   - Static pre-compressed: Zero impact (file already compressed)
   - Dynamic compression: Adds 50-100ms to TTFB (compression time)
   - Trade-off: +50ms TTFB, -500ms download time = net 450ms faster
   - Can cache compressed responses in memory to eliminate TTFB impact
   - For latency-sensitive APIs, consider caching over real-time compression

6. **"How do you prevent compression bombs (decompression attacks)?"**
   - Set maximum compression ratio limits (e.g., 100:1)
   - Limit decompression buffer size
   - Timeout on decompression operations
   - In practice, browsers handle this internally
   - More relevant for backend ZIP file processing

### Comparison with Alternatives

| Approach | When to Use | Trade-offs |
|----------|-------------|------------|
| **No compression** | Already-compressed files (images, video) | Simple, but wastes bandwidth on text |
| **Gzip only** | Need IE11 support, simpler setup | Universal, but 15-20% less efficient |
| **Brotli only** | Modern browsers only, maximum savings | Best compression, but breaks IE11 |
| **Brotli + Gzip fallback** | Production apps (recommended) | Best of both, requires both files |
| **Dynamic compression** | Server-rendered content, APIs | Flexible, but CPU cost per request |
| **Pre-compression** | Static assets | Zero runtime cost, but larger builds |
| **CDN compression** | Quick setup, safety net | Good baseline, but not optimal |

### Trade-Off Explanations

**Trade-off 1: Compression Level vs CPU Cost**
"We tested Brotli levels 4, 5, 8, and 11 on our main JavaScript bundle. Level 4 compressed to 235KB in 60ms. Level 11 compressed to 212KB in 850ms—only 10% better compression but 14x more CPU time. For static assets, we use level 11 because it's pre-computed. For dynamic content, we use level 5 as the sweet spot—73% compression in 85ms is perfect for real-time responses."

**Trade-off 2: Pre-compression vs Dynamic Compression**
"Pre-compression requires serving three versions of each file (original, .gz, .br), increasing storage by 2x and build time by 30 seconds. However, at 1000 requests/second, dynamic Brotli compression would require 85 CPU cores just for compression. The storage trade-off is trivial—200MB becomes 400MB—but the CPU savings are massive. We use pre-compression for static assets, dynamic for server-rendered HTML."

**Trade-off 3: Brotli vs Gzip Browser Support**
"Brotli saves an additional 15-20% bandwidth over Gzip, which at our scale (10TB/month) is 1.5-2TB savings worth $150-200 monthly. However, Brotli isn't supported in IE11 (0.8% of our traffic). We serve both: .br files to modern browsers, .gz to legacy. The cost is double storage (negligible) for significant bandwidth savings on 99.2% of requests."

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Complete Next.js with Compression

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  compress: true,  // Enables Gzip by default
  
  // Custom server for Brotli support
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const CompressionPlugin = require('compression-webpack-plugin');
      const BrotliPlugin = require('brotli-webpack-plugin');
      
      config.plugins.push(
        // Gzip
        new CompressionPlugin({
          filename: '[path][base].gz',
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          minRatio: 0.8,
          compressionOptions: { level: 9 },
        }),
        
        // Brotli
        new BrotliPlugin({
          asset: '[path][base].br',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          minRatio: 0.8,
          quality: 11,
        })
      );
    }
    
    return config;
  },
});
```

**Custom server.js:**
```javascript
// server.js
const express = require('express');
const next = require('next');
const shrinkRay = require('shrink-ray-current');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  
  // Compression middleware (Brotli + Gzip)
  server.use(shrinkRay({
    brotli: { quality: 5 },
    zlib: { level: 6 },
    threshold: 1024,
  }));
  
  // Serve pre-compressed static files
  server.get('/_next/*', (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const filepath = path.join(__dirname, '.next', req.path);
    
    // Try Brotli first
    if (acceptEncoding.includes('br')) {
      res.sendFile(filepath + '.br', (err) => {
        if (err) {
          // Fallback to Gzip
          if (acceptEncoding.includes('gzip')) {
            res.sendFile(filepath + '.gz', (err) => {
              if (err) next(); // Fallback to original
            });
          } else {
            next();
          }
        } else {
          res.set('Content-Encoding', 'br');
        }
      });
    }
    // Try Gzip
    else if (acceptEncoding.includes('gzip')) {
      res.sendFile(filepath + '.gz', (err) => {
        if (err) next();
        else res.set('Content-Encoding', 'gzip');
      });
    }
    // Original file
    else {
      next();
    }
  });
  
  // All other routes handled by Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });
  
  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
```

### Example 2: Build Script with Compression

```javascript
// scripts/build-and-compress.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const glob = require('glob');

const gzip = promisify(zlib.brotliCompress);
const brotli = promisify(zlib.brotliCompress);

async function compressFile(filePath) {
  const content = fs.readFileSync(filePath);
  const stats = fs.statSync(filePath);
  
  // Skip files smaller than 1KB
  if (stats.size < 1024) {
    console.log(`⏭️  Skipping ${filePath} (too small)`);
    return;
  }
  
  // Gzip compression
  const gzipped = await promisify(zlib.gzip)(content, {
    level: zlib.constants.Z_BEST_COMPRESSION, // Level 9
  });
  
  const gzipPath = filePath + '.gz';
  fs.writeFileSync(gzipPath, gzipped);
  
  const gzipRatio = ((1 - gzipped.length / stats.size) * 100).toFixed(2);
  console.log(`✓ Gzip: ${filePath} (${formatBytes(stats.size)} → ${formatBytes(gzipped.length)}, ${gzipRatio}% reduction)`);
  
  // Brotli compression
  const brotlified = await promisify(zlib.brotliCompress)(content, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY, // Level 11
    },
  });
  
  const brotliPath = filePath + '.br';
  fs.writeFileSync(brotliPath, brotlified);
  
  const brotliRatio = ((1 - brotlified.length / stats.size) * 100).toFixed(2);
  console.log(`✓ Brotli: ${filePath} (${formatBytes(stats.size)} → ${formatBytes(brotlified.length)}, ${brotliRatio}% reduction)`);
  
  return {
    original: stats.size,
    gzip: gzipped.length,
    brotli: brotlified.length,
  };
}

async function compressDirectory(dir, pattern) {
  const files = glob.sync(`${dir}/${pattern}`);
  
  console.log(`\n🗜️  Compressing ${files.length} files...\n`);
  
  let totalOriginal = 0;
  let totalGzip = 0;
  let totalBrotli = 0;
  
  for (const file of files) {
    const result = await compressFile(file);
    if (result) {
      totalOriginal += result.original;
      totalGzip += result.gzip;
      totalBrotli += result.brotli;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Original:  ${formatBytes(totalOriginal)}`);
  console.log(`   Gzip:      ${formatBytes(totalGzip)} (${((1 - totalGzip / totalOriginal) * 100).toFixed(2)}% reduction)`);
  console.log(`   Brotli:    ${formatBytes(totalBrotli)} (${((1 - totalBrotli / totalOriginal) * 100).toFixed(2)}% reduction)`);
  console.log(`   Bandwidth saved per 1000 users: ${formatBytes((totalOriginal - totalBrotli) * 1000)}\n`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// Run compression
compressDirectory('dist', '**/*.{js,css,html,json,svg}');
```

**Package.json scripts:**
```json
{
  "scripts": {
    "build": "webpack --mode production",
    "compress": "node scripts/build-and-compress.js",
    "build:full": "npm run build && npm run compress"
  }
}
```

### Example 3: Cloudflare Workers for Smart Compression

```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  // Determine best compression format
  const supportsBrotli = acceptEncoding.includes('br');
  const supportsGzip = acceptEncoding.includes('gzip');
  
  // For static assets, try pre-compressed versions
  if (url.pathname.match(/\.(js|css|html|svg)$/)) {
    let compressionTried = null;
    
    // Try Brotli
    if (supportsBrotli) {
      const brotliUrl = url.pathname + '.br';
      const brotliResponse = await fetch(new URL(brotliUrl, url.origin));
      
      if (brotliResponse.ok) {
        compressionTried = 'br';
        const headers = new Headers(brotliResponse.headers);
        headers.set('Content-Encoding', 'br');
        headers.set('Vary', 'Accept-Encoding');
        
        return new Response(brotliResponse.body, {
          status: brotliResponse.status,
          headers,
        });
      }
    }
    
    // Try Gzip
    if (supportsGzip && compressionTried === null) {
      const gzipUrl = url.pathname + '.gz';
      const gzipResponse = await fetch(new URL(gzipUrl, url.origin));
      
      if (gzipResponse.ok) {
        compressionTried = 'gzip';
        const headers = new Headers(gzipResponse.headers);
        headers.set('Content-Encoding', 'gzip');
        headers.set('Vary', 'Accept-Encoding');
        
        return new Response(gzipResponse.body, {
          status: gzipResponse.status,
          headers,
        });
      }
    }
  }
  
  // Fallback to origin (Cloudflare will auto-compress)
  const response = await fetch(request);
  
  // Add Vary header for caching
  const headers = new Headers(response.headers);
  headers.set('Vary', 'Accept-Encoding');
  
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
```

### Example 4: Compression A/B Test Framework

```javascript
// compressionExperiment.js
class CompressionExperiment {
  constructor() {
    this.variants = {
      control: { name: 'No compression', enabled: false },
      gzip6: { name: 'Gzip level 6', algorithm: 'gzip', level: 6 },
      gzip9: { name: 'Gzip level 9', algorithm: 'gzip', level: 9 },
      brotli5: { name: 'Brotli level 5', algorithm: 'br', level: 5 },
      brotli11: { name: 'Brotli level 11', algorithm: 'br', level: 11 },
    };
    
    this.metrics = new Map();
  }
  
  assignVariant(userId) {
    // Consistent hashing for user assignment
    const hash = this.hashCode(userId);
    const variants = Object.keys(this.variants);
    return variants[hash % variants.length];
  }
  
  trackRequest(userId, originalSize, compressedSize, compressionTime, downloadTime) {
    const variant = this.assignVariant(userId);
    
    if (!this.metrics.has(variant)) {
      this.metrics.set(variant, {
        count: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        totalCompressionTime: 0,
        totalDownloadTime: 0,
      });
    }
    
    const m = this.metrics.get(variant);
    m.count++;
    m.totalOriginalSize += originalSize;
    m.totalCompressedSize += compressedSize;
    m.totalCompressionTime += compressionTime;
    m.totalDownloadTime += downloadTime;
  }
  
  getResults() {
    const results = [];
    
    for (const [variant, metrics] of this.metrics.entries()) {
      const avgCompression = metrics.totalCompressionTime / metrics.count;
      const avgDownload = metrics.totalDownloadTime / metrics.count;
      const compressionRatio = 
        (1 - metrics.totalCompressedSize / metrics.totalOriginalSize) * 100;
      const bandwidthSaved = 
        metrics.totalOriginalSize - metrics.totalCompressedSize;
      
      results.push({
        variant: this.variants[variant].name,
        requests: metrics.count,
        compressionRatio: compressionRatio.toFixed(2) + '%',
        avgCompressionTime: avgCompression.toFixed(2) + 'ms',
        avgDownloadTime: avgDownload.toFixed(2) + 'ms',
        totalTime: (avgCompression + avgDownload).toFixed(2) + 'ms',
        bandwidthSaved: (bandwidthSaved / 1024 / 1024).toFixed(2) + ' MB',
      });
    }
    
    // Sort by total time (compression + download)
    return results.sort((a, b) => 
      parseFloat(a.totalTime) - parseFloat(b.totalTime)
    );
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

// Usage
const experiment = new CompressionExperiment();

// Express middleware
app.use((req, res, next) => {
  const userId = req.session.userId;
  const variant = experiment.assignVariant(userId);
  const config = experiment.variants[variant];
  
  if (!config.enabled) {
    return next(); // No compression
  }
  
  const startTime = Date.now();
  let originalSize = 0;
  
  const originalSend = res.send;
  res.send = function(data) {
    originalSize = Buffer.byteLength(data);
    
    // Apply compression based on variant
    // (actual compression handled by middleware)
    
    const compressionTime = Date.now() - startTime;
    const compressedSize = parseInt(res.getHeader('Content-Length') || originalSize);
    
    // Track metrics (download time measured client-side)
    experiment.trackRequest(userId, originalSize, compressedSize, compressionTime, 0);
    
    originalSend.call(this, data);
  };
  
  next();
});

// Report results
app.get('/admin/compression-experiment', (req, res) => {
  res.json(experiment.getResults());
});
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience:**
- **Load time**: 70-85% smaller files = 70-78% faster downloads
- **Time to Interactive**: Compression directly reduces TTI by 2-5 seconds
- **Mobile experience**: Critical on slow/metered connections (3G, throttled 4G)
- **First Contentful Paint**: Smaller HTML/CSS = faster initial render

**Business Impact:**
```
Real case study: SaaS Application (1M daily users)

Without compression:
- Avg page weight: 2.1MB (HTML, CSS, JS, JSON)
- Daily bandwidth: 2.1TB
- Monthly bandwidth: 63TB
- Bandwidth cost: $6,300/month (at $0.10/GB)
- Load time (3G): 17s
- Bounce rate: 42%

With Brotli compression:
- Avg page weight: 480KB (77% reduction)
- Daily bandwidth: 480GB (77% reduction)
- Monthly bandwidth: 14.4TB
- Bandwidth cost: $1,440/month
- Savings: $4,860/month ($58,320/year)
- Load time (3G): 4s (76% improvement)
- Bounce rate: 21% (50% reduction)
- Conversion increase: +38%
- Additional annual revenue: +$420K
```

**Technical Benefits:**
- **Bandwidth savings**: 70-85% reduction in data transfer
- **CDN cost reduction**: Fewer bytes served = lower CDN bills
- **Faster parsing**: Smaller files = faster browser parsing
- **Better cache hit rates**: More content fits in cache
- **Environmental impact**: Less data transfer = lower carbon footprint

### How It Works

**Technical Summary:**

**1. Compression Algorithms:**
```
Text compression exploits repetition:

Original (JSON):
{
  "name": "John",
  "email": "john@example.com",
  "address": "123 Main St"
}

Gzip/Brotli approach:
- Identify repeated patterns ("name", "email", quotes, braces)
- Replace with shorter references
- Store dictionary of patterns
- Result: 40-50% size reduction for JSON

Why text compresses well:
- High repetition (keywords, tags, syntax)
- Limited character set (ASCII/UTF-8)
- Predictable structure (JSON, HTML, CSS)

Why images don't compress:
- Already use compression (JPEG, PNG)
- Low repetition (pixel data is pseudo-random)
- High entropy content
```

**2. Compression Flow:**
```
Build time (static assets):
┌──────────────────────────────────┐
│  main.js (850KB)                 │
└──────────┬───────────────────────┘
           │
    ┌──────┴───────┐
    │              │
    ▼              ▼
┌─────────┐   ┌──────────┐
│ Gzip    │   │ Brotli   │
│ Level 9 │   │ Level 11 │
└────┬────┘   └─────┬────┘
     │              │
     ▼              ▼
main.js.gz     main.js.br
  (242KB)        (212KB)

Request time:
Browser → CDN → Check Accept-Encoding
              → Serve .br (if supported)
              → Or .gz (fallback)
              → Or original

Zero CPU cost per request (pre-compressed)
```

**3. Compression Effectiveness:**
```javascript
Compression by file type:

HTML:        75-85% reduction
- Tags repeat: <div>, <span>, class=""
- Attributes common: id, class, style
- Structure predictable

CSS:         75-85% reduction
- Property names repeat: color, margin, padding
- Selectors common: .class, #id
- Values often similar: 0, auto, inherit

JavaScript:  70-75% reduction
- Keywords repeat: function, const, return
- Common patterns: if(), for(), .map()
- Variable names short

JSON:        75-85% reduction
- Keys repeat: "name", "id", "data"
- Structure very regular
- High redundancy in arrays

SVG:         65-75% reduction
- XML syntax (like HTML)
- Coordinate precision reducible
- Styles often inline
```

**4. Brotli vs Gzip Comparison:**
```
850KB JavaScript file:

Gzip level 6:
- Compression time: 50ms
- Compressed size: 255KB (70% reduction)
- Decompression time: 1.3ms
- Algorithm: LZ77 + Huffman coding

Brotli level 5:
- Compression time: 85ms
- Compressed size: 230KB (73% reduction)
- Decompression time: 1.1ms
- Algorithm: LZ77 + Huffman + dictionary

Brotli level 11:
- Compression time: 850ms
- Compressed size: 212KB (75% reduction)
- Decompression time: 1.1ms
- Best for: Static pre-compression

Key: Brotli dictionary knows common web terms
Example: "addEventListener" → 2-byte dictionary ref
         vs 17 bytes in Gzip
```

**5. Bandwidth Savings Calculation:**
```javascript
// Monthly savings calculation
const dailyUsers = 1000000;
const avgPageWeight = 2100000; // 2.1MB
const compressionRatio = 0.77; // 77% reduction

const dailyUncompressed = dailyUsers * avgPageWeight;
// = 2.1TB/day

const dailyCompressed = dailyUncompressed * (1 - compressionRatio);
// = 483GB/day

const bandwidthSaved = dailyUncompressed - dailyCompressed;
// = 1.617TB/day

const monthlySavings = bandwidthSaved * 30 * 0.10; // $0.10/GB
// = $4,860/month = $58,320/year
```

**6. Decision Tree:**
```
Should I compress this file?

Is it text-based?
├─ No (image, video, ZIP) → Don't compress
└─ Yes
   │
   Is it > 1KB?
   ├─ No → Don't compress (overhead > benefit)
   └─ Yes
      │
      Is it static or dynamic?
      ├─ Static → Pre-compress (Brotli 11 + Gzip 9)
      └─ Dynamic
         │
         Traffic level?
         ├─ Low → Brotli level 5
         ├─ Medium → Brotli level 5 + cache
         └─ High → Gzip level 6 + aggressive cache
```

**Mental Model:**

Think of compression like **packing a suitcase**:
- **Gzip** = Rolling clothes tightly (standard, works everywhere)
- **Brotli** = Vacuum-sealed bags (15-20% more space saved)
- **Pre-compression** = Pack at home (leisurely, best result)
- **Dynamic compression** = Pack at airport (rushed, good enough)
- **Content negotiation** = Checking bag size limits (serve what client accepts)

---

**Key Takeaway for Interviews:**

Compression provides 70-85% bandwidth savings on text assets with minimal overhead. Use **pre-compression** (Brotli level 11) for static assets during build—zero runtime CPU cost. Use **dynamic compression** (Brotli level 5 or Gzip level 6) for server-rendered content, balancing compression ratio with CPU cost. Serve **Brotli to modern browsers** (95%+ coverage, 15-20% better than Gzip) with Gzip fallback. At scale, compression saves thousands monthly in bandwidth costs while improving load times by 70-78%. Always set `Vary: Accept-Encoding` header to prevent cache mismatches. Monitor compression ratios and bandwidth savings as key metrics.

