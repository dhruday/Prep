# 120. Edge Rendering

## 1. High-Level Explanation (Frontend Interview Level)

**Edge Rendering** is the practice of executing rendering logic (SSR, data fetching, personalization) on edge servers geographically close to users, rather than on centralized origin servers, to minimize latency and improve performance.

- **What**: Running server-side rendering, API calls, and business logic on edge nodes distributed globally (Cloudflare Workers, Vercel Edge Functions, AWS Lambda@Edge)
- **Why**: Reduce latency (50ms vs 500ms to origin), faster TTFB, scale globally without regional deployments, handle traffic spikes
- **When**: Critical for global apps, personalized content, real-time data, high-traffic scenarios, geo-specific logic
- **Role**: Modern alternative to traditional SSR, enabling sub-100ms response times worldwide

**Key Principle**: "Compute at the edge, cache aggressively"—bring rendering closer to users for instant experiences.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Edge Computing Platforms

**1. Cloudflare Workers**

**Capabilities**:
- V8 isolates (< 5ms cold start)
- 200+ global data centers
- KV store for edge storage
- Durable Objects for stateful compute
- Streams API for SSR

**Example**:
```javascript
// worker.js - Cloudflare Worker
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Edge-rendered personalization
    const userId = getUserIdFromCookie(request);
    const userPrefs = await env.USER_PREFS.get(userId, 'json');
    
    // Fetch data from multiple sources in parallel
    const [products, recommendations] = await Promise.all([
      fetch('https://api.example.com/products').then(r => r.json()),
      fetch(`https://api.example.com/recommendations/${userId}`).then(r => r.json())
    ]);
    
    // Render HTML at edge
    const html = renderPage({
      products,
      recommendations,
      theme: userPrefs.theme,
      language: userPrefs.language
    });
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=60, s-maxage=3600',
        'CDN-Cache-Control': 'max-age=3600'
      }
    });
  }
};

function renderPage(data) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Products</title>
        <style>${getCriticalCSS()}</style>
      </head>
      <body>
        <div id="products">
          ${data.products.map(p => `
            <div class="product">
              <h2>${p.name}</h2>
              <p>${p.price}</p>
            </div>
          `).join('')}
        </div>
        
        <div id="recommendations">
          ${data.recommendations.map(r => `
            <div class="recommendation">${r.title}</div>
          `).join('')}
        </div>
        
        <script>
          window.__INITIAL_DATA__ = ${JSON.stringify(data)};
        </script>
        <script src="/app.js" defer></script>
      </body>
    </html>
  `;
}
```

**2. Vercel Edge Functions (Next.js Edge Runtime)**

**Next.js Middleware**:
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const country = request.geo?.country || 'US';
  const city = request.geo?.city || 'Unknown';
  
  // A/B test assignment at edge
  const variant = assignVariant(request);
  
  // Rewrite to variant-specific page
  if (variant === 'B') {
    return NextResponse.rewrite(
      new URL('/products-variant-b', request.url)
    );
  }
  
  // Add geo headers for downstream rendering
  const response = NextResponse.next();
  response.headers.set('x-user-country', country);
  response.headers.set('x-user-city', city);
  response.headers.set('x-variant', variant);
  
  return response;
}

function assignVariant(request: NextRequest) {
  const userId = request.cookies.get('user_id')?.value;
  
  if (!userId) return 'A';
  
  // Consistent hashing for stable assignment
  const hash = simpleHash(userId);
  return hash % 2 === 0 ? 'A' : 'B';
}

// Edge API Route
// pages/api/recommendations.ts
import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge'
};

export default async function handler(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const country = req.headers.get('x-user-country');
  
  // Fetch from regional APIs
  const apiUrl = getRegionalAPI(country);
  const data = await fetch(`${apiUrl}/recommendations/${userId}`);
  
  return new Response(JSON.stringify(await data.json()), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
    }
  });
}
```

**Edge SSR Component**:
```typescript
// app/products/page.tsx (Next.js 13 App Router)
export const runtime = 'edge';

async function getProducts(country: string) {
  const res = await fetch(`https://api.example.com/products?country=${country}`, {
    next: { revalidate: 3600 } // ISR at edge
  });
  
  return res.json();
}

export default async function ProductsPage({ searchParams }: any) {
  const country = searchParams.country || 'US';
  const products = await getProducts(country);
  
  return (
    <div>
      <h1>Products for {country}</h1>
      {products.map((p: any) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
```

**3. AWS Lambda@Edge / CloudFront Functions**

**Lambda@Edge** (Viewer Request):
```javascript
// Modify request before reaching cache
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  
  // Device detection
  const userAgent = headers['user-agent'][0].value;
  const isMobile = /Mobile|Android/.test(userAgent);
  
  // Rewrite path for device-specific content
  if (isMobile) {
    request.uri = request.uri.replace('/index.html', '/mobile.html');
  }
  
  // Add custom headers
  headers['x-device-type'] = [{ 
    key: 'X-Device-Type', 
    value: isMobile ? 'mobile' : 'desktop' 
  }];
  
  return request;
};
```

**CloudFront Function** (Viewer Response):
```javascript
// Modify response headers
function handler(event) {
  const response = event.response;
  const headers = response.headers;
  
  // Add security headers
  headers['strict-transport-security'] = { 
    value: 'max-age=31536000; includeSubDomains' 
  };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  
  return response;
}
```

### Streaming SSR at Edge

**React 18 Streaming**:
```typescript
// Cloudflare Worker with React streaming
import { renderToReadableStream } from 'react-dom/server';
import App from './App';

export default {
  async fetch(request: Request, env: any) {
    const stream = await renderToReadableStream(
      <App />,
      {
        onError(error) {
          console.error(error);
        }
      }
    );
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Transfer-Encoding': 'chunked'
      }
    });
  }
};
```

**Next.js Suspense Streaming**:
```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

export const runtime = 'edge';

async function SlowComponent() {
  const data = await fetchSlowData(); // 2s delay
  return <div>{data}</div>;
}

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Fast content rendered immediately */}
      <FastMetrics />
      
      {/* Slow content streamed later */}
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>
    </div>
  );
}
```

### Edge Data Fetching Patterns

**1. Edge KV Store**:
```javascript
// Cloudflare KV for fast reads (< 5ms)
const CACHE_TTL = 3600; // 1 hour

async function getUserPreferences(userId) {
  // Check KV cache first
  const cached = await env.USER_PREFS.get(userId, 'json');
  
  if (cached) {
    return cached;
  }
  
  // Fetch from origin API
  const prefs = await fetch(`https://api.example.com/users/${userId}/prefs`)
    .then(r => r.json());
  
  // Cache in KV
  await env.USER_PREFS.put(
    userId, 
    JSON.stringify(prefs), 
    { expirationTtl: CACHE_TTL }
  );
  
  return prefs;
}
```

**2. Edge-Side Includes (ESI)**:
```html
<!-- Cached page with dynamic fragments -->
<html>
  <body>
    <div class="static-content">
      <!-- Cached for 1 hour -->
    </div>
    
    <esi:include src="/api/user-specific-content" />
    
    <div class="more-static">
      <!-- Also cached -->
    </div>
  </body>
</html>
```

```javascript
// Worker processes ESI tags
async function processESI(html, request) {
  const esiRegex = /<esi:include src="([^"]+)" \/>/g;
  
  const fragments = [];
  let match;
  
  while ((match = esiRegex.exec(html)) !== null) {
    const url = match[1];
    fragments.push(fetch(url, { headers: request.headers }));
  }
  
  const responses = await Promise.all(fragments);
  const contents = await Promise.all(responses.map(r => r.text()));
  
  // Replace ESI tags with fetched content
  let result = html;
  contents.forEach((content, i) => {
    result = result.replace(esiRegex, content);
  });
  
  return result;
}
```

**3. GraphQL at Edge**:
```typescript
// Edge GraphQL gateway
import { createYoga } from 'graphql-yoga';

const yoga = createYoga({
  schema,
  context: async ({ request }) => ({
    userId: getUserId(request),
    country: request.headers.get('CF-IPCountry'),
    cache: env.GRAPHQL_CACHE
  })
});

export default {
  fetch: yoga.fetch
};

// Resolver with edge caching
const resolvers = {
  Query: {
    products: async (_, __, context) => {
      const cacheKey = `products:${context.country}`;
      
      // Check edge cache
      const cached = await context.cache.get(cacheKey, 'json');
      if (cached) return cached;
      
      // Fetch from origin
      const products = await fetch('https://api.example.com/products')
        .then(r => r.json());
      
      // Cache at edge
      await context.cache.put(cacheKey, JSON.stringify(products), {
        expirationTtl: 3600
      });
      
      return products;
    }
  }
};
```

### Edge Rendering Performance

**Optimization Techniques**:

**1. Critical Path Optimization**:
```javascript
// Prioritize above-fold content
async function renderWithPriority(data) {
  // Render critical HTML first
  const criticalHTML = renderCritical(data);
  
  // Stream critical content immediately
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  writer.write(new TextEncoder().encode(criticalHTML));
  
  // Fetch and render below-fold asynchronously
  fetchBelowFold(data).then(belowHTML => {
    writer.write(new TextEncoder().encode(belowHTML));
    writer.close();
  });
  
  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/html' }
  });
}
```

**2. Request Coalescing**:
```javascript
// Deduplicate identical requests at edge
const inflightRequests = new Map();

async function fetchWithDedup(url) {
  if (inflightRequests.has(url)) {
    return inflightRequests.get(url);
  }
  
  const promise = fetch(url).then(r => r.json());
  inflightRequests.set(url, promise);
  
  const result = await promise;
  inflightRequests.delete(url);
  
  return result;
}
```

**3. Stale-While-Revalidate**:
```javascript
async function fetchWithSWR(url, cacheKey, ttl) {
  const cached = await env.CACHE.get(cacheKey, 'json');
  
  if (cached) {
    // Serve stale content immediately
    const response = cached;
    
    // Revalidate in background
    env.waitUntil(
      fetch(url).then(async r => {
        const fresh = await r.json();
        await env.CACHE.put(cacheKey, JSON.stringify(fresh), {
          expirationTtl: ttl
        });
      })
    );
    
    return response;
  }
  
  // No cache, fetch fresh
  const fresh = await fetch(url).then(r => r.json());
  await env.CACHE.put(cacheKey, JSON.stringify(fresh), {
    expirationTtl: ttl
  });
  
  return fresh;
}
```

### What NOT to Do

- ❌ **Heavy computations at edge** (limited CPU time: 10-50ms)
- ❌ **Large dependencies** (bundle size limits: 1-5MB)
- ❌ **Blocking synchronous I/O** (everything must be async)
- ❌ **Stateful operations** (workers are stateless, use KV/Durable Objects)
- ❌ **No caching strategy** (edge compute not free, cache aggressively)

---

## 3. Clear Real-World Examples

### Example 1: Vercel Edge Functions (Next.js)

**Personalized Homepage**:
```typescript
// pages/index.tsx
export const runtime = 'edge';

export async function getServerSideProps({ req }: any) {
  const geo = req.geo;
  const userId = req.cookies.userId;
  
  // Edge rendering with geo-specific content
  const [products, weather] = await Promise.all([
    fetch(`https://api.example.com/products?country=${geo.country}`),
    fetch(`https://api.weather.com/forecast?city=${geo.city}`)
  ]);
  
  return {
    props: {
      products: await products.json(),
      weather: await weather.json(),
      location: `${geo.city}, ${geo.country}`
    }
  };
}
```

**Result**: 50ms TTFB globally (vs 300ms from single-region origin).

### Example 2: Cloudflare Workers (Shopify Hydrogen)

**Edge-Rendered Storefront**:
```typescript
// Shopify Hydrogen runs on Cloudflare Workers
export async function loader({ context, request }: any) {
  const { storefront } = context;
  
  // GraphQL query executed at edge
  const { products } = await storefront.query(`
    query Products($country: CountryCode!) {
      products(first: 20, country: $country) {
        edges {
          node {
            id
            title
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `, {
    variables: { country: request.geo.country }
  });
  
  return { products };
}
```

**Scale**: Sub-100ms response time in 200+ locations.

### Example 3: AWS CloudFront + Lambda@Edge

**Personalized Content Delivery**:
```javascript
// Lambda@Edge modifies response
exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const request = event.Records[0].cf.request;
  
  // Get user segment from cookie
  const segment = getUserSegment(request);
  
  // Inject personalized content
  const body = response.body;
  const personalizedContent = await fetchPersonalization(segment);
  
  response.body = body.replace(
    '<!--PERSONALIZATION-->',
    personalizedContent
  );
  
  return response;
};
```

**Scale**: Netflix uses Lambda@Edge for millions of requests.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you implement edge rendering for a global e-commerce site?"

**Answer**:

"I'd use **Next.js Edge Runtime** on Vercel (or Cloudflare Workers) for sub-100ms TTFB globally:

**1. Edge SSR Setup**:

Mark pages/API routes as edge:
```typescript
export const runtime = 'edge';
```

This deploys to 300+ edge locations automatically.

**2. Geo-Specific Rendering**:

Use request geo data:
```typescript
const country = request.geo?.country || 'US';
const products = await fetch(`/api/products?country=${country}`);
```

Serve localized prices, inventory, shipping in one request.

**3. Personalization at Edge**:

Store user preferences in **KV store** (Cloudflare KV or Vercel Edge Config):
```javascript
const prefs = await env.USER_PREFS.get(userId, 'json');
```

Avoids round-trip to origin database (< 5ms KV read).

**4. Streaming SSR**:

Use React Suspense for progressive rendering:
```tsx
<Suspense fallback={<Skeleton />}>
  <SlowComponent />
</Suspense>
```

Send HTML shell immediately, stream slow data later. TTFB < 50ms, visual complete in 200ms.

**5. Edge Caching**:

Cache API responses at edge:
```javascript
const cached = await env.CACHE.get(cacheKey);
if (cached) return cached;

const data = await fetch(originAPI);
await env.CACHE.put(cacheKey, data, { ttl: 3600 });
```

Serve 90% requests from edge cache.

**6. A/B Testing**:

Assign variants at edge via middleware:
```typescript
const variant = hash(userId) % 2 === 0 ? 'A' : 'B';
response.headers.set('x-variant', variant);
```

Zero latency overhead (vs client-side flicker).

**7. Fallback Strategy**:

If edge fails, fallback to origin SSR:
```javascript
try {
  return await edgeRender(request);
} catch (error) {
  return await originSSR(request);
}
```

**Performance**:

- TTFB: 50ms (vs 300ms origin)
- First Contentful Paint: 200ms (vs 800ms)
- Cache hit rate: 90%+ (KV + CDN caching)

**Limitations**:

Edge has CPU limits (10-50ms), memory limits (128MB-512MB), no filesystem. Can't do heavy computation or large NPM dependencies.

**Real-World**: Vercel serves 10B+ edge requests/month. Shopify Hydrogen runs storefronts on Cloudflare Workers. Next.js Edge Runtime used by Hulu, Twilio."

---

## 6. Why & How Summary

### Why It Matters

**Performance**: < 100ms TTFB globally (vs 500ms+ to distant origin)  
**Scale**: Handle traffic spikes without regional infrastructure  
**Cost**: Cheaper than running servers in every region

### How It Works

**1. Deploy**: Code runs on CDN edge nodes (200+ locations)  
**2. Request**: User hits nearest edge  
**3. Render**: Execute SSR/data fetching at edge (< 50ms)  
**4. Cache**: Store in edge KV/cache (< 5ms reads)  
**5. Stream**: Send HTML progressively (TTFB < 50ms)

**FAANG**: Sub-100ms TTFB, 90%+ cache hit rate, handle 100K+ RPS per edge node, graceful origin fallback
