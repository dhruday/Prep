# 121. Geo-Based Delivery

## 1. High-Level Explanation (Frontend Interview Level)

**Geo-Based Delivery** is the practice of serving content, assets, and application logic from geographically optimized locations based on the user's physical location, ensuring minimal latency and compliance with regional requirements.

- **What**: Intelligent routing of requests to nearest/best data centers, CDNs, or edge nodes based on user location, serving region-specific content, prices, languages, and regulations
- **Why**: Reduce latency (physics: speed of light limits), comply with data sovereignty laws (GDPR, data residency), provide localized experiences (currency, language, inventory)
- **When**: Critical for global applications, e-commerce, streaming services, real-time communication, regulated industries
- **Role**: Infrastructure-level decision affecting architecture, CDN strategy, data replication, compliance

**Key Principle**: "Data locality matters"—serving content from nearby locations dramatically improves user experience and reduces latency.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Geographic Routing Strategies

**1. DNS-Based Geo-Routing**

**Route 53 Geolocation Routing**:
```javascript
// DNS configuration (Route 53)
const geoRouting = {
  'North America': {
    recordType: 'A',
    value: '54.123.45.67', // US-East-1 load balancer
    healthCheck: 'us-east-health-check'
  },
  
  'Europe': {
    recordType: 'A',
    value: '35.234.56.78', // EU-West-1 load balancer
    healthCheck: 'eu-west-health-check'
  },
  
  'Asia Pacific': {
    recordType: 'A',
    value: '13.234.67.89', // AP-Southeast-1 load balancer
    healthCheck: 'ap-southeast-health-check'
  },
  
  'Default': {
    recordType: 'A',
    value: '54.123.45.67', // Fallback to US
    healthCheck: 'us-east-health-check'
  }
};
```

**Latency-Based Routing**:
```javascript
// Route 53 automatically routes to lowest latency endpoint
const latencyRouting = {
  'us-east-1': {
    ip: '54.123.45.67',
    healthCheck: true
  },
  'eu-west-1': {
    ip: '35.234.56.78',
    healthCheck: true
  },
  'ap-southeast-1': {
    ip: '13.234.67.89',
    healthCheck: true
  }
};

// User in London → EU-West-1 (10ms)
// User in Singapore → AP-Southeast-1 (5ms)
// User in New York → US-East-1 (2ms)
```

**2. CDN Geo-Routing**

**CloudFront Geographic Restrictions**:
```javascript
// CloudFront distribution config
const distribution = {
  origins: [
    {
      id: 'S3-Website',
      domainName: 'mybucket.s3.amazonaws.com'
    }
  ],
  
  // Geo-restriction (whitelist/blacklist)
  restrictions: {
    geoRestriction: {
      restrictionType: 'whitelist', // or 'blacklist'
      locations: ['US', 'CA', 'GB', 'DE', 'FR'] // ISO country codes
    }
  },
  
  // Custom error responses by region
  customErrorResponses: [
    {
      errorCode: 403,
      responseCode: 451, // Unavailable For Legal Reasons
      responsePagePath: '/unavailable.html'
    }
  ]
};
```

**Cloudflare Geo-Routing**:
```javascript
// Cloudflare Worker with geo-routing
export default {
  async fetch(request, env) {
    const country = request.cf.country; // ISO country code
    const continent = request.cf.continent; // EU, NA, AS, etc.
    const region = request.cf.region; // State/province
    const city = request.cf.city;
    
    // Route to regional API
    const apiUrl = getRegionalAPI(country);
    
    // Add geo headers
    const modifiedRequest = new Request(apiUrl, request);
    modifiedRequest.headers.set('X-User-Country', country);
    modifiedRequest.headers.set('X-User-City', city);
    
    return fetch(modifiedRequest);
  }
};

function getRegionalAPI(country) {
  // EU countries → EU API (GDPR compliance)
  if (['DE', 'FR', 'IT', 'ES', 'NL', 'BE'].includes(country)) {
    return 'https://api-eu.example.com';
  }
  
  // APAC countries → APAC API
  if (['AU', 'JP', 'SG', 'IN', 'KR'].includes(country)) {
    return 'https://api-apac.example.com';
  }
  
  // Default to US
  return 'https://api-us.example.com';
}
```

### Regional Content Delivery

**1. Multi-Region Asset Delivery**:
```javascript
// Next.js configuration for multi-CDN
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './image-loader.js'
  }
};

// image-loader.js
export default function cloudinaryLoader({ src, width, quality }) {
  const geo = detectUserRegion(); // Server-side or edge
  
  // Route to regional CDN
  const cdnUrls = {
    'NA': 'https://cdn-na.example.com',
    'EU': 'https://cdn-eu.example.com',
    'APAC': 'https://cdn-apac.example.com'
  };
  
  const baseCDN = cdnUrls[geo] || cdnUrls['NA'];
  
  return `${baseCDN}/image/upload/w_${width},q_${quality || 75}/${src}`;
}
```

**2. Regional JavaScript Bundles**:
```javascript
// Webpack configuration for code splitting by region
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        // Separate bundles for regional features
        euCompliance: {
          test: /[\\/]features[\\/]eu-compliance/,
          name: 'eu-compliance',
          chunks: 'async'
        },
        usPayments: {
          test: /[\\/]features[\\/]us-payments/,
          name: 'us-payments',
          chunks: 'async'
        }
      }
    }
  }
};

// Dynamic import based on region
async function loadPaymentModule() {
  const country = getUserCountry();
  
  if (country === 'US') {
    return import('./payments/us-stripe');
  } else if (['DE', 'FR', 'IT'].includes(country)) {
    return import('./payments/eu-sepa');
  } else {
    return import('./payments/paypal');
  }
}
```

### Data Residency & Compliance

**1. GDPR-Compliant Architecture**:
```javascript
// EU users' data stays in EU
const userDataRegions = {
  'EU': {
    database: 'eu-west-1.rds.amazonaws.com',
    storage: 'eu-bucket.s3.eu-west-1.amazonaws.com',
    cache: 'eu-redis.cache.amazonaws.com'
  },
  
  'US': {
    database: 'us-east-1.rds.amazonaws.com',
    storage: 'us-bucket.s3.us-east-1.amazonaws.com',
    cache: 'us-redis.cache.amazonaws.com'
  }
};

async function saveUserData(userId, data) {
  const user = await getUser(userId);
  const region = user.dataResidencyRegion; // 'EU' or 'US'
  
  const config = userDataRegions[region];
  
  // Connect to regional database
  const db = createConnection(config.database);
  await db.query('INSERT INTO user_data VALUES (?)', [data]);
  
  // Store files in regional bucket
  await s3.upload({
    Bucket: config.storage,
    Key: `users/${userId}/file.pdf`,
    Body: data.file
  });
}
```

**2. Cross-Region Replication** (Read Replicas):
```javascript
// Multi-region read replicas for low-latency reads
const databaseConfig = {
  primary: 'us-east-1.rds.amazonaws.com', // Write master
  
  readReplicas: {
    'us-east-1': 'us-east-1-replica.rds.amazonaws.com',
    'eu-west-1': 'eu-west-1-replica.rds.amazonaws.com',
    'ap-southeast-1': 'ap-southeast-1-replica.rds.amazonaws.com'
  }
};

async function getProduct(productId, userRegion) {
  // Read from nearest replica
  const replicaUrl = databaseConfig.readReplicas[userRegion] 
    || databaseConfig.primary;
  
  const db = createConnection(replicaUrl);
  return db.query('SELECT * FROM products WHERE id = ?', [productId]);
}

async function updateProduct(productId, data) {
  // All writes go to primary
  const db = createConnection(databaseConfig.primary);
  return db.query('UPDATE products SET ? WHERE id = ?', [data, productId]);
}
```

### Geo-Specific Localization

**1. Currency & Pricing**:
```typescript
// Geo-based pricing
interface RegionalPricing {
  basePrice: number;
  currency: string;
  taxRate: number;
  shippingCost: number;
}

const regionalPricing: Record<string, RegionalPricing> = {
  'US': {
    basePrice: 99.99,
    currency: 'USD',
    taxRate: 0.0725, // CA sales tax
    shippingCost: 5.99
  },
  
  'GB': {
    basePrice: 79.99,
    currency: 'GBP',
    taxRate: 0.20, // VAT
    shippingCost: 4.99
  },
  
  'DE': {
    basePrice: 89.99,
    currency: 'EUR',
    taxRate: 0.19, // MwSt
    shippingCost: 0 // Free shipping in EU
  }
};

function calculatePrice(basePrice: number, country: string) {
  const config = regionalPricing[country] || regionalPricing['US'];
  
  const price = config.basePrice;
  const tax = price * config.taxRate;
  const total = price + tax + config.shippingCost;
  
  return new Intl.NumberFormat(getLocale(country), {
    style: 'currency',
    currency: config.currency
  }).format(total);
}

// Usage
calculatePrice(99.99, 'US'); // "$111.22"
calculatePrice(99.99, 'DE'); // "107,08 €"
```

**2. Inventory & Availability**:
```javascript
// Regional inventory management
const regionalInventory = {
  'US-WAREHOUSE': {
    region: 'NA',
    products: {
      'PROD-123': { stock: 500, estimatedShipping: 2 }
    }
  },
  
  'EU-WAREHOUSE': {
    region: 'EU',
    products: {
      'PROD-123': { stock: 200, estimatedShipping: 3 }
    }
  },
  
  'APAC-WAREHOUSE': {
    region: 'APAC',
    products: {
      'PROD-123': { stock: 100, estimatedShipping: 5 }
    }
  }
};

async function checkAvailability(productId, userCountry) {
  const userRegion = mapCountryToRegion(userCountry);
  
  // Find nearest warehouse with stock
  const warehouses = Object.values(regionalInventory)
    .filter(w => w.region === userRegion)
    .filter(w => w.products[productId]?.stock > 0);
  
  if (warehouses.length > 0) {
    const warehouse = warehouses[0];
    return {
      available: true,
      shipping: warehouse.products[productId].estimatedShipping,
      warehouse: warehouse.region
    };
  }
  
  return { available: false };
}
```

### Performance Monitoring by Region

**Real User Monitoring (RUM)**:
```javascript
// Track performance by geography
class GeoPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }
  
  trackPageLoad() {
    const geo = this.detectGeo();
    const timing = performance.timing;
    
    const metrics = {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      ttfb: timing.responseStart - timing.requestStart,
      domLoad: timing.domContentLoadedEventEnd - timing.navigationStart,
      fullLoad: timing.loadEventEnd - timing.navigationStart
    };
    
    // Send to analytics
    this.sendToAnalytics({
      country: geo.country,
      region: geo.region,
      city: geo.city,
      isp: geo.isp,
      ...metrics
    });
  }
  
  detectGeo() {
    // Server sends geo data in meta tag
    const geoMeta = document.querySelector('meta[name="geo"]');
    return JSON.parse(geoMeta?.content || '{}');
  }
  
  sendToAnalytics(data) {
    navigator.sendBeacon('/api/analytics/geo-performance', 
      JSON.stringify(data)
    );
  }
}

// Initialize on page load
window.addEventListener('load', () => {
  new GeoPerformanceMonitor().trackPageLoad();
});
```

**Regional SLO Tracking**:
```javascript
// Define SLOs per region
const regionalSLOs = {
  'NA': {
    ttfb: 200, // ms
    fcp: 1000,
    lcp: 2500
  },
  
  'EU': {
    ttfb: 250,
    fcp: 1200,
    lcp: 3000
  },
  
  'APAC': {
    ttfb: 300,
    fcp: 1500,
    lcp: 3500
  }
};

function checkSLOCompliance(metrics, region) {
  const slo = regionalSLOs[region];
  
  return {
    ttfbOK: metrics.ttfb <= slo.ttfb,
    fcpOK: metrics.fcp <= slo.fcp,
    lcpOK: metrics.lcp <= slo.lcp,
    overallOK: metrics.ttfb <= slo.ttfb && 
               metrics.fcp <= slo.fcp && 
               metrics.lcp <= slo.lcp
  };
}
```

### What NOT to Do

- ❌ **Single-region deployment** for global app (high latency for distant users)
- ❌ **Ignore data sovereignty** (GDPR violations, data residency laws)
- ❌ **No fallback regions** (single point of failure)
- ❌ **Hardcode geo-detection** (use authoritative sources like CDN headers)
- ❌ **Same pricing globally** (currency conversion rates, local competition)

---

## 3. Clear Real-World Examples

### Example 1: Netflix Multi-Region CDN

**Architecture**:
```javascript
// Netflix Open Connect (custom CDN)
const openConnectCDN = {
  // 1000+ servers in ISP networks globally
  regions: [
    {
      continent: 'NA',
      pops: 350, // Points of presence
      isp: ['Comcast', 'AT&T', 'Verizon'],
      avgLatency: 10 // ms
    },
    {
      continent: 'EU',
      pops: 280,
      isp: ['Deutsche Telekom', 'Orange', 'Vodafone'],
      avgLatency: 15
    },
    {
      continent: 'APAC',
      pops: 200,
      isp: ['NTT', 'KDDI', 'Singtel'],
      avgLatency: 20
    }
  ],
  
  // Content localized by region
  contentLibrary: {
    'US': 5000, // titles
    'UK': 4500,
    'JP': 3000, // Different licensing
    'IN': 2500
  }
};

// Routing logic
function selectCDNNode(userIP) {
  const isp = detectISP(userIP);
  const geo = detectGeo(userIP);
  
  // Prefer ISP-embedded servers (< 5ms latency)
  const localServers = findServersInISP(isp);
  
  if (localServers.length > 0) {
    return selectLeastLoaded(localServers);
  }
  
  // Fallback to nearest regional POP
  return findNearestPOP(geo);
}
```

**Scale**: 95% of traffic served from within user's ISP network.

### Example 2: Cloudflare Workers KV (Geo-Replicated)

**Global KV Store**:
```javascript
// Data automatically replicated to all edge locations
export default {
  async fetch(request, env) {
    const country = request.cf.country;
    const cacheKey = `config:${country}`;
    
    // Read from nearest edge (< 5ms)
    const config = await env.CONFIG_KV.get(cacheKey, 'json');
    
    if (!config) {
      // Fallback to default
      return fetch('https://api.example.com/config/default');
    }
    
    return new Response(JSON.stringify(config), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Write propagates globally in ~60 seconds
await env.CONFIG_KV.put('config:US', JSON.stringify({
  currency: 'USD',
  language: 'en-US',
  shippingOptions: ['Standard', 'Express']
}));
```

**Scale**: 200+ edge locations, < 5ms KV reads globally.

### Example 3: AWS Global Accelerator

**Static Anycast IPs**:
```javascript
// Global Accelerator provides 2 static IPs
const globalAccelerator = {
  staticIPs: ['75.2.60.5', '99.83.190.51'], // Anycast IPs
  
  // Automatically routes to nearest healthy endpoint
  endpoints: [
    { region: 'us-east-1', weight: 100, healthCheck: true },
    { region: 'eu-west-1', weight: 100, healthCheck: true },
    { region: 'ap-southeast-1', weight: 100, healthCheck: true }
  ],
  
  // Traffic dials for weighted routing
  trafficDials: {
    'us-east-1': 100, // 100% of NA traffic
    'eu-west-1': 100, // 100% of EU traffic
    'ap-southeast-1': 50 // 50% of APAC (gradual rollout)
  }
};

// User in Tokyo → ap-southeast-1 (automatically routed via anycast)
// User in London → eu-west-1
// User in New York → us-east-1
```

**Benefits**: Up to 60% latency reduction vs internet routing.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you architect geo-based content delivery for a global e-commerce platform?"

**Answer**:

"I'd design a **multi-region, CDN-first architecture**:

**1. DNS Geo-Routing**:

Use **Route 53 latency-based routing** to direct users to nearest region:
```
api.example.com → us-east-1 (NA users)
                → eu-west-1 (EU users)
                → ap-southeast-1 (APAC users)
```

Users automatically routed to lowest-latency endpoint (measured continuously).

**2. CDN Layer**:

Deploy **CloudFront** (or Cloudflare) with regional edge caches:
- Static assets cached at 200+ edge locations
- Dynamic content cached with short TTLs (60s)
- Geo-restrictions for content licensing

**3. Regional Data Centers**:

Deploy app servers in 3 regions:
- **US-East** (primary for NA)
- **EU-West** (GDPR compliance)
- **AP-Southeast** (APAC)

Each region has: load balancers, app servers, read replicas.

**4. Database Strategy**:

**Primary** in US-East (all writes). **Read replicas** in EU and APAC (eventual consistency < 1s). EU users' PII stored only in EU (GDPR compliance).

**5. Asset Delivery**:

Images/videos served from **regional CDNs**:
```javascript
const cdnUrl = {
  'US': 'cdn-us.example.com',
  'EU': 'cdn-eu.example.com',
  'APAC': 'cdn-apac.example.com'
}[userRegion];
```

**6. Localized Content**:

Serve region-specific:
- **Pricing**: USD for US, EUR for EU, local currency for APAC
- **Inventory**: Check nearest warehouse stock
- **Language**: Auto-detect from geo + accept-language header
- **Payment**: Region-specific gateways (Stripe US, SEPA EU)

**7. Compliance**:

EU users' data never leaves EU (data residency). Cookie consent for EU (GDPR). Different tax calculations per region.

**8. Failover**:

If primary region fails, Route 53 health checks trigger failover to secondary region (< 30s). Cross-region replication ensures data availability.

**9. Monitoring**:

Track performance by region (TTFB, LCP per geography). Alert if regional SLOs violated (e.g., TTFB > 200ms for NA).

**Performance**:

- **NA**: 50ms TTFB, 1.5s LCP
- **EU**: 80ms TTFB, 2.0s LCP  
- **APAC**: 100ms TTFB, 2.5s LCP

**Trade-offs**:

Multi-region deployment expensive (3x infrastructure cost). Eventual consistency for reads (acceptable for product catalog, not for inventory). Cross-region writes slow (use async replication).

**Real-World**: Amazon routes to 20+ regions. Netflix has servers in ISP networks. Shopify uses multi-CDN (Fastly + CloudFlare)."

---

## 6. Why & How Summary

### Why It Matters

**Performance**: 50-300ms latency reduction (routing to nearest data center)  
**Compliance**: GDPR, data residency (EU data stays in EU)  
**Availability**: Regional failover (no single point of failure)

### How It Works

**1. DNS**: Route users to nearest region (latency-based)  
**2. CDN**: Cache assets at 200+ edge locations  
**3. App**: Deploy servers in multiple regions  
**4. Database**: Primary + regional read replicas  
**5. Localize**: Region-specific prices, inventory, payment

**FAANG**: < 100ms latency globally, 99.99% availability, full GDPR compliance, sub-second cross-region failover
