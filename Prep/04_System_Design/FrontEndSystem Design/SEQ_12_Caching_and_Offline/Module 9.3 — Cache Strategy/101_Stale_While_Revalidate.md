# 101. Stale-While-Revalidate

## 📋 Table of Contents
- [Overview](#overview)
- [What is Stale-While-Revalidate?](#what-is-stale-while-revalidate)
- [How It Works](#how-it-works)
- [HTTP Header Implementation](#http-header-implementation)
- [Service Worker Implementation](#service-worker-implementation)
- [React Query / SWR Libraries](#react-query--swr-libraries)
- [Performance Benefits](#performance-benefits)
- [Trade-offs and Considerations](#trade-offs-and-considerations)
- [Real-World Use Cases](#real-world-use-cases)
- [CDN Integration](#cdn-integration)
- [Browser Support](#browser-support)
- [Comparison with Other Strategies](#comparison-with-other-strategies)
- [Best Practices](#best-practices)
- [Common Pitfalls](#common-pitfalls)
- [Advanced Patterns](#advanced-patterns)
- [Interview Questions](#interview-questions)

---

## Overview

**Stale-While-Revalidate (SWR)** is a cache invalidation strategy that serves stale (cached) content immediately while fetching fresh content in the background. This provides instant response times while ensuring eventual consistency.

### Why It Matters

```
┌─────────────────────────────────────────────────────────────┐
│           STALE-WHILE-REVALIDATE BENEFIT                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  WITHOUT SWR (Traditional caching):                         │
│  ┌────────────────────────────────────────────────┐         │
│  │ User Request → Wait for Server → Display       │         │
│  │                   (300ms)                       │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  WITH SWR:                                                  │
│  ┌────────────────────────────────────────────────┐         │
│  │ User Request → Display Cache (0ms)             │         │
│  │              ↓                                 │         │
│  │         Background Fetch (300ms)               │         │
│  │              ↓                                 │         │
│  │         Update Cache for next request          │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  PERCEIVED LATENCY: 0ms vs 300ms                            │
│  USER EXPERIENCE: Instant ✅                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Business Impact**:
- **Instagram**: 40% faster page loads with SWR
- **Vercel**: Next.js SWR library used by 1M+ developers
- **Google**: Recommends SWR for optimal performance

---

## What is Stale-While-Revalidate?

SWR is a caching pattern that balances **speed** (instant responses) with **freshness** (up-to-date data).

### Core Concept

```
┌─────────────────────────────────────────────────────────────┐
│              SWR LIFECYCLE                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TIME 0: Initial Request                                    │
│  ├─ No cache                                                │
│  ├─ Fetch from server (300ms)                               │
│  └─ Store in cache with TTL                                 │
│                                                              │
│  TIME 1: Request within fresh period (t < max-age)          │
│  ├─ Serve from cache (0ms)                                  │
│  └─ No revalidation needed                                  │
│                                                              │
│  TIME 2: Request in stale period (max-age < t < swr)        │
│  ├─ Serve stale from cache (0ms) ✅ INSTANT                 │
│  ├─ Trigger background revalidation                         │
│  └─ Update cache for next request                           │
│                                                              │
│  TIME 3: Request after SWR period (t > swr)                 │
│  ├─ Cache expired                                           │
│  ├─ Fetch from server (300ms)                               │
│  └─ Store in cache                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Visual Timeline

```
Cache Freshness Timeline:
0s         60s                      3660s
├──────────┼──────────────────────────┼───────────>
│  FRESH   │     STALE (SWR)          │  EXPIRED  │
│          │                          │           │
│ Serve    │ Serve stale +            │ Fetch     │
│ cache    │ revalidate in background │ fresh     │
└──────────┴──────────────────────────┴───────────┘
           ↑                          ↑
       max-age=60              max-age + swr=3600
```

---

## How It Works

### Step-by-Step Flow

```javascript
// HTTP Cache-Control header
Cache-Control: max-age=60, stale-while-revalidate=3600

// Timeline:
// 0-60s:    FRESH - Serve from cache, no network request
// 60-3660s: STALE - Serve from cache, fetch in background
// 3660s+:   EXPIRED - Fetch from network, wait for response
```

**Detailed Flow**:

```
┌─────────────────────────────────────────────────────────────┐
│         SWR REQUEST FLOW (DETAILED)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Request at t=120s (within stale period):                   │
│                                                              │
│  1. USER REQUEST                                            │
│     └─> Check cache                                         │
│                                                              │
│  2. CACHE HIT (but stale)                                   │
│     ├─> Age: 120s                                           │
│     ├─> max-age: 60s (EXPIRED)                              │
│     ├─> stale-while-revalidate: 3600s (VALID)               │
│     └─> Serve stale content immediately (0ms) ✅            │
│                                                              │
│  3. BACKGROUND REVALIDATION                                 │
│     ├─> Fetch from origin server                            │
│     ├─> Include If-None-Match (ETag)                        │
│     │   or If-Modified-Since                                │
│     └─> Update cache when complete                          │
│                                                              │
│  4. NEXT REQUEST (t=130s)                                   │
│     └─> Serves updated cache (fresh data)                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## HTTP Header Implementation

### Basic Syntax

```http
Cache-Control: max-age=<seconds>, stale-while-revalidate=<seconds>
```

### Server-Side Implementation

**Node.js / Express**:
```javascript
const express = require('express');
const app = express();

// Basic SWR
app.get('/api/products', (req, res) => {
  // Fresh for 1 minute, stale for 1 hour
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
  
  const products = getProducts();
  res.json(products);
});

// Different strategies per content type
function setCacheHeaders(contentType, res) {
  switch (contentType) {
    case 'static-asset':
      // Long cache, no SWR needed (immutable)
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      break;
      
    case 'api-data':
      // Short fresh, long stale (instant responses)
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
      break;
      
    case 'user-content':
      // Very short fresh, moderate stale
      res.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=300');
      break;
      
    case 'real-time':
      // No cache (always fresh)
      res.set('Cache-Control', 'no-cache, no-store');
      break;
  }
}

// Example usage
app.get('/api/user/profile', (req, res) => {
  setCacheHeaders('user-content', res);
  res.json(getUserProfile(req.userId));
});
```

**Next.js**:
```javascript
// pages/api/posts.js
export default function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=3600'
  );
  
  const posts = getPosts();
  res.json(posts);
}

// Or with getServerSideProps
export async function getServerSideProps({ res }) {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=10, stale-while-revalidate=59'
  );
  
  const data = await fetchData();
  
  return { props: { data } };
}
```

**CDN Configuration (Vercel)**:
```json
// vercel.json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=60, stale-while-revalidate=3600"
        }
      ]
    }
  ]
}
```

### Advanced Header Combinations

```javascript
// Combination with stale-if-error
app.get('/api/critical', (req, res) => {
  res.set('Cache-Control', 
    'public, ' +
    'max-age=60, ' +
    'stale-while-revalidate=3600, ' +
    'stale-if-error=86400' // Serve stale if origin is down
  );
  
  res.json(data);
});

// With ETag for conditional requests
app.get('/api/data', (req, res) => {
  const data = getData();
  const etag = generateETag(data);
  
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
  res.set('ETag', etag);
  
  // Check If-None-Match (from revalidation)
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end(); // Not Modified (no body sent)
  } else {
    res.json(data);
  }
});

// Vary header for correct caching
app.get('/api/localized', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
  res.set('Vary', 'Accept-Language'); // Different cache per language
  
  const lang = req.headers['accept-language'];
  res.json(getLocalizedData(lang));
});
```

---

## Service Worker Implementation

### Basic Service Worker with SWR

```javascript
// service-worker.js

const CACHE_NAME = 'swr-cache-v1';
const CACHE_MAX_AGE = 60 * 1000; // 60 seconds
const STALE_WHILE_REVALIDATE = 3600 * 1000; // 1 hour

// Install and cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/styles.css',
        '/app.js'
      ]);
    })
  );
});

// Fetch with SWR strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    staleWhileRevalidate(event.request)
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  // Get cache metadata
  const cachedTime = await getCacheTime(request);
  const now = Date.now();
  const age = now - cachedTime;
  
  // Fetch from network (don't await)
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      // Clone response (can only read once)
      const responseToCache = response.clone();
      
      // Update cache
      await cache.put(request, responseToCache);
      await setCacheTime(request, now);
    }
    return response;
  });
  
  // Serve cached if within SWR period
  if (cached && age < STALE_WHILE_REVALIDATE) {
    // Trigger revalidation in background (if stale)
    if (age > CACHE_MAX_AGE) {
      // Don't await - background revalidation
      fetchPromise.catch(() => {}); // Ignore errors
    }
    return cached;
  }
  
  // Cache expired or doesn't exist - wait for network
  return fetchPromise;
}

// Helper: Store cache timestamp
async function setCacheTime(request, time) {
  const cache = await caches.open('swr-metadata');
  await cache.put(
    request.url + ':timestamp',
    new Response(time.toString())
  );
}

// Helper: Get cache timestamp
async function getCacheTime(request) {
  const cache = await caches.open('swr-metadata');
  const response = await cache.match(request.url + ':timestamp');
  
  if (response) {
    const text = await response.text();
    return parseInt(text, 10);
  }
  
  return 0; // Never cached
}
```

### Workbox (Simplified SWR)

```javascript
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// SWR for API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      // Only cache successful responses
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      // Limit cache size and age
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 3600, // 1 hour
        purgeOnQuotaError: true
      })
    ]
  })
);

// SWR for images
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'image-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 86400 // 24 hours
      })
    ]
  })
);

// SWR for Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets'
  })
);

// Custom SWR with timeout
registerRoute(
  '/api/products',
  new StaleWhileRevalidate({
    cacheName: 'products-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 3600
      }),
      // Custom plugin: Timeout
      {
        fetchDidFail: async ({ request }) => {
          console.error('Fetch failed for', request.url);
        },
        requestWillFetch: async ({ request }) => {
          // Add timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          return new Request(request, {
            signal: controller.signal
          });
        }
      }
    ]
  })
);
```

### Advanced Service Worker Patterns

```javascript
// Adaptive SWR based on connection quality
self.addEventListener('fetch', (event) => {
  event.respondWith(
    adaptiveSWR(event.request)
  );
});

async function adaptiveSWR(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  // Get connection info
  const connection = navigator.connection;
  const effectiveType = connection?.effectiveType; // '4g', '3g', '2g', 'slow-2g'
  
  // Adjust strategy based on connection
  let maxAge, swrWindow;
  
  switch (effectiveType) {
    case '4g':
      maxAge = 30 * 1000; // 30s fresh
      swrWindow = 600 * 1000; // 10m stale
      break;
    case '3g':
      maxAge = 60 * 1000; // 1m fresh
      swrWindow = 1800 * 1000; // 30m stale
      break;
    case '2g':
    case 'slow-2g':
      maxAge = 300 * 1000; // 5m fresh
      swrWindow = 3600 * 1000; // 1h stale
      break;
    default:
      maxAge = 60 * 1000;
      swrWindow = 3600 * 1000;
  }
  
  const cachedTime = await getCacheTime(request);
  const age = Date.now() - cachedTime;
  
  // SWR logic with adaptive timing
  if (cached && age < swrWindow) {
    if (age > maxAge) {
      // Background revalidation
      fetch(request).then(async (response) => {
        if (response.ok) {
          await cache.put(request, response.clone());
          await setCacheTime(request, Date.now());
        }
      }).catch(() => {});
    }
    return cached;
  }
  
  // Fetch from network
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await setCacheTime(request, Date.now());
  }
  return response;
}
```

---

## React Query / SWR Libraries

### Vercel SWR Library

```javascript
import useSWR from 'swr';

// Basic usage
function Profile() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher);
  
  if (error) return <div>Failed to load</div>;
  if (isLoading) return <div>Loading...</div>;
  
  return <div>Hello {data.name}!</div>;
}

// Fetcher function
const fetcher = (url) => fetch(url).then(res => res.json());

// Global config
import { SWRConfig } from 'swr';

function App() {
  return (
    <SWRConfig value={{
      refreshInterval: 3000, // Revalidate every 3s
      fetcher: (url) => fetch(url).then(res => res.json()),
      revalidateOnFocus: true, // Revalidate when window gains focus
      revalidateOnReconnect: true, // Revalidate on network reconnect
      dedupingInterval: 2000 // Dedupe requests within 2s
    }}>
      <Profile />
    </SWRConfig>
  );
}

// Advanced: Conditional fetching
function User({ id }) {
  // Only fetch if id exists
  const { data } = useSWR(id ? `/api/user/${id}` : null, fetcher);
  
  return data ? <div>{data.name}</div> : null;
}

// Mutation with optimistic updates
function UpdateProfile() {
  const { data, mutate } = useSWR('/api/user', fetcher);
  
  async function updateName(newName) {
    // Optimistic update (immediate UI change)
    mutate({ ...data, name: newName }, false);
    
    // Send request to server
    await fetch('/api/user', {
      method: 'PATCH',
      body: JSON.stringify({ name: newName })
    });
    
    // Revalidate (fetch fresh data)
    mutate();
  }
  
  return (
    <button onClick={() => updateName('New Name')}>
      Update Name
    </button>
  );
}

// Pagination with SWR
function ProductList() {
  const [page, setPage] = useState(1);
  
  const { data, error } = useSWR(
    `/api/products?page=${page}`,
    fetcher,
    {
      keepPreviousData: true // Show old data while fetching new page
    }
  );
  
  return (
    <>
      {data?.products.map(p => <Product key={p.id} {...p} />)}
      <button onClick={() => setPage(page + 1)}>Next</button>
    </>
  );
}

// Dependent queries
function UserPosts({ userId }) {
  // First, fetch user
  const { data: user } = useSWR(`/api/user/${userId}`, fetcher);
  
  // Then, fetch posts (only if user exists)
  const { data: posts } = useSWR(
    user ? `/api/posts?author=${user.id}` : null,
    fetcher
  );
  
  return posts ? posts.map(renderPost) : null;
}
```

### React Query (TanStack Query)

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Basic usage
function Profile() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => fetch('/api/user').then(res => res.json()),
    staleTime: 60 * 1000, // Fresh for 1 minute
    cacheTime: 3600 * 1000, // Keep in cache for 1 hour (SWR window)
  });
  
  if (error) return <div>Error: {error.message}</div>;
  if (isLoading) return <div>Loading...</div>;
  
  return <div>Hello {data.name}!</div>;
}

// Global config
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 3600 * 1000, // 1 hour
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Profile />
    </QueryClientProvider>
  );
}

// Mutation with invalidation
function UpdateProfile() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (newName) => {
      return fetch('/api/user', {
        method: 'PATCH',
        body: JSON.stringify({ name: newName })
      });
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
  
  return (
    <button onClick={() => mutation.mutate('New Name')}>
      Update Name
    </button>
  );
}

// Optimistic updates
function AddTodo() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (newTodo) => fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify(newTodo)
    }),
    onMutate: async (newTodo) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      
      // Snapshot previous value
      const previousTodos = queryClient.getQueryData(['todos']);
      
      // Optimistically update
      queryClient.setQueryData(['todos'], old => [...old, newTodo]);
      
      // Return context with snapshot
      return { previousTodos };
    },
    onError: (err, newTodo, context) => {
      // Rollback on error
      queryClient.setQueryData(['todos'], context.previousTodos);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
  
  return (
    <button onClick={() => mutation.mutate({ title: 'New Todo' })}>
      Add Todo
    </button>
  );
}

// Prefetching
function ProductList() {
  const queryClient = useQueryClient();
  
  const { data } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
  
  return (
    <div>
      {data.map(product => (
        <div
          key={product.id}
          onMouseEnter={() => {
            // Prefetch product details on hover
            queryClient.prefetchQuery({
              queryKey: ['product', product.id],
              queryFn: () => fetchProduct(product.id),
            });
          }}
        >
          {product.name}
        </div>
      ))}
    </div>
  );
}
```

### Apollo Client (GraphQL)

```javascript
import { useQuery, useMutation, gql } from '@apollo/client';

const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`;

function Profile({ userId }) {
  const { data, loading, error } = useQuery(GET_USER, {
    variables: { id: userId },
    // SWR behavior
    fetchPolicy: 'cache-first', // Use cache if available
    nextFetchPolicy: 'cache-and-network', // Background revalidation
  });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>Hello {data.user.name}!</div>;
}

// Global cache config
import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          user: {
            // Cache for 1 minute
            read(existing, { args, toReference }) {
              return existing || toReference({ __typename: 'User', id: args.id });
            },
          },
        },
      },
    },
  }),
});
```

---

## Performance Benefits

### Metrics Comparison

```
┌─────────────────────────────────────────────────────────────┐
│         PERFORMANCE COMPARISON (API Call)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  NO CACHE:                                                  │
│  Every request → 300ms (server latency)                     │
│  LCP: 300ms, CLS: 0, FID: 50ms                              │
│                                                              │
│  TRADITIONAL CACHE (max-age=3600):                          │
│  First request: 300ms                                       │
│  Cached: 0ms (for 1 hour)                                   │
│  After expiry: 300ms                                        │
│  LCP: 0ms (cached), CLS: 0, FID: 10ms                       │
│  ❌ Problem: Stale data for 1 hour                          │
│                                                              │
│  STALE-WHILE-REVALIDATE:                                    │
│  First request: 300ms                                       │
│  Cached: 0ms (instant)                                      │
│  Stale: 0ms (instant) + background refresh                  │
│  LCP: 0ms, CLS: 0, FID: 5ms                                 │
│  ✅ Benefit: Instant + Fresh                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Real-World Performance Gains

**Case Study: E-Commerce Product List**

```javascript
// WITHOUT SWR
// Average load time: 800ms
// - DNS: 50ms
// - TLS: 100ms
// - Server processing: 400ms
// - Transfer: 250ms
// Total: 800ms

// WITH SWR (subsequent visits)
// Load time: 0ms (instant from cache)
// Background refresh: 800ms (invisible to user)
// Perceived performance: ∞% faster
```

**Metrics Improvement**:
```
┌──────────────────────┬─────────────┬─────────────┬──────────┐
│ Metric               │ No Cache    │ Cache       │ SWR      │
├──────────────────────┼─────────────┼─────────────┼──────────┤
│ Time to Interactive  │ 800ms       │ 0ms         │ 0ms      │
│ Data Freshness       │ Always      │ Hourly      │ ~Instant │
│ Server Load          │ High        │ Low         │ Low      │
│ User Experience      │ Slow        │ Fast/Stale  │ Fast/Fresh│
│ Lighthouse Score     │ 60          │ 85          │ 95       │
└──────────────────────┴─────────────┴─────────────┴──────────┘
```

### Core Web Vitals Impact

```javascript
// Measure with web-vitals
import { onLCP, onFID, onCLS } from 'web-vitals';

// WITHOUT SWR
onLCP((metric) => {
  console.log('LCP:', metric.value); // ~800ms (waiting for API)
});

// WITH SWR
onLCP((metric) => {
  console.log('LCP:', metric.value); // ~100ms (cached content)
});

// FID improvement
onFID((metric) => {
  // SWR: ~5ms (no blocking)
  // No SWR: ~50ms (waiting for API)
  console.log('FID:', metric.value);
});
```

---

## Trade-offs and Considerations

### Advantages ✅

```
┌─────────────────────────────────────────────────────────────┐
│                    SWR ADVANTAGES                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. INSTANT USER EXPERIENCE                                 │
│     • 0ms response time (from cache)                        │
│     • Perceived as real-time                                │
│     • Better Core Web Vitals                                │
│                                                              │
│  2. EVENTUAL CONSISTENCY                                    │
│     • Background updates keep data fresh                    │
│     • No stale data for long periods                        │
│     • Best of both worlds                                   │
│                                                              │
│  3. REDUCED SERVER LOAD                                     │
│     • Most requests served from cache                       │
│     • Only 1 request per revalidation window                │
│     • Lower hosting costs                                   │
│                                                              │
│  4. RESILIENCE                                              │
│     • Works offline (serves stale)                          │
│     • Graceful degradation                                  │
│     • No "waiting" screens                                  │
│                                                              │
│  5. BETTER UX PATTERNS                                      │
│     • Optimistic UI updates                                 │
│     • Smooth transitions                                    │
│     • No loading spinners                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Disadvantages ❌

```
┌─────────────────────────────────────────────────────────────┐
│                    SWR LIMITATIONS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. DATA STALENESS                                          │
│     • User sees old data briefly                            │
│     • Not suitable for critical real-time data              │
│     • Can confuse users if updates are visible              │
│                                                              │
│  2. COMPLEXITY                                              │
│     • Requires proper configuration                         │
│     • Cache invalidation logic needed                       │
│     • More moving parts                                     │
│                                                              │
│  3. CACHE STORAGE LIMITS                                    │
│     • Browser cache size limited (~50MB)                    │
│     • Need cache eviction strategy                          │
│     • Can fill up quickly                                   │
│                                                              │
│  4. BACKGROUND NETWORK USAGE                                │
│     • Silent revalidation requests                          │
│     • Uses data in background                               │
│     • May impact battery on mobile                          │
│                                                              │
│  5. BROWSER SUPPORT                                         │
│     • Not all browsers support fully                        │
│     • Service Worker required for advanced use              │
│     • Progressive enhancement needed                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### When to Use SWR

```javascript
// ✅ GOOD USE CASES

// 1. Product listings (changes infrequently)
Cache-Control: max-age=60, stale-while-revalidate=3600

// 2. User profiles (personal data, not critical)
Cache-Control: private, max-age=30, stale-while-revalidate=300

// 3. News articles (fresh preferred but not critical)
Cache-Control: max-age=120, stale-while-revalidate=1800

// 4. Search results (instant response more important)
Cache-Control: max-age=60, stale-while-revalidate=600

// 5. Dashboard data (metrics can be slightly stale)
Cache-Control: max-age=30, stale-while-revalidate=300
```

### When NOT to Use SWR

```javascript
// ❌ BAD USE CASES

// 1. Stock prices (must be real-time)
Cache-Control: no-cache, no-store

// 2. Payment information (no stale data allowed)
Cache-Control: no-cache, no-store, must-revalidate

// 3. Authentication tokens (security risk)
Cache-Control: no-store

// 4. Live sports scores (real-time required)
// Use WebSocket instead

// 5. User's own comments (confusing if stale)
Cache-Control: no-cache

// 6. Admin actions (delete, ban) - must confirm immediately
Cache-Control: no-store
```

---

## Real-World Use Cases

### Use Case 1: E-Commerce Product Catalog

```javascript
// Product listing API
app.get('/api/products', async (req, res) => {
  // Products change ~hourly (price updates, inventory)
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  
  const products = await db.products.find({});
  res.json(products);
});

// Frontend with SWR
import useSWR from 'swr';

function ProductGrid() {
  const { data: products } = useSWR('/api/products', fetcher, {
    refreshInterval: 300000, // Revalidate every 5 minutes
    revalidateOnFocus: true // Refresh when user returns
  });
  
  return (
    <div className="grid">
      {products?.map(product => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
}

// Result:
// - First load: 500ms (network)
// - Subsequent loads: 0ms (cache)
// - Always fresh within 5 minutes
// - No "loading" states
```

### Use Case 2: Social Media Feed

```javascript
// Feed API
app.get('/api/feed', authenticateUser, async (req, res) => {
  // Feed is personal, updates frequently
  res.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=60');
  
  const feed = await getFeedForUser(req.userId);
  res.json(feed);
});

// Frontend with React Query
function Feed() {
  const { data: posts, isStale } = useQuery({
    queryKey: ['feed'],
    queryFn: fetchFeed,
    staleTime: 10 * 1000, // 10 seconds
    cacheTime: 60 * 1000, // 1 minute
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });
  
  return (
    <div>
      {isStale && <Banner>Updating feed...</Banner>}
      {posts?.map(post => <Post key={post.id} {...post} />)}
    </div>
  );
}

// Result:
// - Instant feed display
// - Background refresh every 10s
// - Visual indicator when refreshing
```

### Use Case 3: Dashboard with Multiple Widgets

```javascript
// Multiple API endpoints
const endpoints = {
  revenue: '/api/metrics/revenue',
  users: '/api/metrics/users',
  orders: '/api/metrics/orders'
};

// Each with different SWR windows
app.get('/api/metrics/revenue', (req, res) => {
  res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
  res.json(getRevenue());
});

app.get('/api/metrics/users', (req, res) => {
  res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=180');
  res.json(getUsers());
});

// Frontend with parallel SWR
function Dashboard() {
  const { data: revenue } = useSWR('/api/metrics/revenue', fetcher);
  const { data: users } = useSWR('/api/metrics/users', fetcher);
  const { data: orders } = useSWR('/api/metrics/orders', fetcher);
  
  return (
    <div className="dashboard">
      <Widget title="Revenue" data={revenue} />
      <Widget title="Users" data={users} />
      <Widget title="Orders" data={orders} />
    </div>
  );
}

// Result:
// - All widgets load instantly from cache
// - Each refreshes in background at different intervals
// - No loading spinners
```

### Use Case 4: User Profile with Updates

```javascript
// Profile API
app.get('/api/user/:id', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=600');
  
  const user = await db.users.findOne({ id: req.params.id });
  res.json(user);
});

// Frontend with mutations
function Profile({ userId }) {
  const { data: user, mutate } = useSWR(`/api/user/${userId}`, fetcher);
  
  async function updateBio(newBio) {
    // Optimistic update (instant UI)
    mutate({ ...user, bio: newBio }, false);
    
    // Send to server
    await fetch(`/api/user/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ bio: newBio })
    });
    
    // Revalidate from server
    mutate();
  }
  
  return (
    <div>
      <h1>{user.name}</h1>
      <textarea value={user.bio} onChange={e => updateBio(e.target.value)} />
    </div>
  );
}

// Result:
// - Instant profile display
// - Instant updates (optimistic)
// - Syncs with server in background
```

---

## CDN Integration

### Cloudflare

```javascript
// Cloudflare Workers with SWR
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  
  // Check cache
  let response = await cache.match(cacheKey);
  
  if (response) {
    const age = Date.now() - new Date(response.headers.get('date')).getTime();
    const maxAge = 60 * 1000; // 1 minute
    const swrWindow = 3600 * 1000; // 1 hour
    
    if (age < swrWindow) {
      if (age > maxAge) {
        // Background revalidation
        event.waitUntil(
          fetch(request).then(freshResponse => {
            cache.put(cacheKey, freshResponse.clone());
          })
        );
      }
      return response;
    }
  }
  
  // Fetch from origin
  response = await fetch(request);
  
  // Cache response
  event.waitUntil(cache.put(cacheKey, response.clone()));
  
  return response;
}
```

### Vercel Edge Functions

```javascript
// pages/api/products.js
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Set SWR headers
  return new Response(JSON.stringify(products), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
    },
  });
}
```

### AWS CloudFront

```javascript
// Lambda@Edge function
exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;
  
  // Add SWR header
  headers['cache-control'] = [{
    key: 'Cache-Control',
    value: 'public, max-age=60, stale-while-revalidate=3600'
  }];
  
  return response;
};
```

---

## Browser Support

```
┌─────────────────────────────────────────────────────────────┐
│              BROWSER SUPPORT                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  STALE-WHILE-REVALIDATE HEADER:                             │
│  ✅ Chrome 75+                                              │
│  ✅ Firefox 68+                                             │
│  ✅ Safari 14+                                              │
│  ✅ Edge 79+                                                │
│  ❌ IE 11 (not supported)                                   │
│                                                              │
│  FALLBACK FOR UNSUPPORTED BROWSERS:                         │
│  • Use Service Worker implementation                        │
│  • Or client-side library (SWR, React Query)                │
│  • Progressive enhancement                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Feature Detection**:
```javascript
// Check if browser supports stale-while-revalidate
function supportsStaleWhileRevalidate() {
  const testCache = 'cache-control-test';
  const testValue = 'max-age=1, stale-while-revalidate=2';
  
  try {
    const response = new Response('test', {
      headers: { 'Cache-Control': testValue }
    });
    
    return response.headers.get('cache-control').includes('stale-while-revalidate');
  } catch {
    return false;
  }
}

if (!supportsStaleWhileRevalidate()) {
  // Use Service Worker or client-side library
  console.log('Using fallback SWR implementation');
}
```

---

## Comparison with Other Strategies

```
┌──────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Strategy                     │ Speed        │ Freshness    │ Complexity   │ Use Case     │
├──────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ No Cache                     │ Slow (300ms) │ Always Fresh │ Simple       │ Real-time    │
│ max-age (Traditional)        │ Fast (0ms)   │ Stale        │ Simple       │ Static       │
│ max-age + must-revalidate    │ Medium       │ Fresh        │ Simple       │ Sensitive    │
│ Stale-While-Revalidate       │ Fast (0ms)   │ ~Fresh       │ Medium       │ Most apps    │
│ Stale-If-Error               │ Fast (0ms)   │ Stale/Error  │ Medium       │ Resilience   │
│ Network First (SW)           │ Medium       │ Always Fresh │ High         │ Critical     │
│ Cache First (SW)             │ Fast (0ms)   │ Stale        │ High         │ Offline      │
└──────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

**Detailed Comparison**:

```javascript
// 1. NO CACHE
Cache-Control: no-cache
// Speed: 300ms | Freshness: 100% | Server load: High

// 2. TRADITIONAL CACHE
Cache-Control: max-age=3600
// Speed: 0ms (cached) | Freshness: Stale up to 1h | Server load: Low
// Problem: Stale data

// 3. MUST-REVALIDATE
Cache-Control: max-age=3600, must-revalidate
// Speed: 300ms (after expiry) | Freshness: 100% | Server load: Medium
// Problem: Slow after expiry

// 4. STALE-WHILE-REVALIDATE (Best balance)
Cache-Control: max-age=60, stale-while-revalidate=3600
// Speed: 0ms (always) | Freshness: ~100% | Server load: Low
// Benefit: Instant + fresh

// 5. STALE-IF-ERROR
Cache-Control: max-age=60, stale-if-error=86400
// Speed: 0ms (on error) | Freshness: Stale on error | Server load: Low
// Benefit: Resilience

// 6. NETWORK FIRST (Service Worker)
// Speed: 300ms | Freshness: 100% | Server load: High
// Benefit: Always fresh, works offline as fallback

// 7. CACHE FIRST (Service Worker)
// Speed: 0ms | Freshness: Stale | Server load: Very low
// Benefit: Offline-first, fastest
```

---

## Best Practices

### Configuration Guidelines

```javascript
// 1. CHOOSE APPROPRIATE TIMEOUTS

// Fast-changing data (stock prices, live scores)
Cache-Control: no-cache // Don't use SWR

// Moderate updates (user profiles, posts)
Cache-Control: max-age=30, stale-while-revalidate=300
// 30s fresh, 5min stale

// Slow-changing data (products, articles)
Cache-Control: max-age=300, stale-while-revalidate=3600
// 5min fresh, 1h stale

// Rarely changing (static content)
Cache-Control: max-age=86400, immutable
// 1 day, no SWR needed
```

### 2. Combine with Other Headers

```javascript
// SWR + ETag (conditional requests)
app.get('/api/data', (req, res) => {
  const data = getData();
  const etag = generateETag(data);
  
  res.set('Cache-Control', 'max-age=60, stale-while-revalidate=3600');
  res.set('ETag', etag);
  
  // Check If-None-Match (from revalidation)
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end(); // Not Modified (saves bandwidth)
  } else {
    res.json(data);
  }
});

// SWR + Vary (per-user caching)
app.get('/api/feed', (req, res) => {
  res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=300');
  res.set('Vary', 'Authorization'); // Different cache per user
  
  const feed = getFeedForUser(req.userId);
  res.json(feed);
});

// SWR + stale-if-error (resilience)
app.get('/api/critical', (req, res) => {
  res.set('Cache-Control', 
    'max-age=60, ' +
    'stale-while-revalidate=3600, ' +
    'stale-if-error=86400' // Serve stale if origin down
  );
  
  res.json(data);
});
```

### 3. Monitor Revalidation

```javascript
// Track revalidation requests
app.get('/api/data', (req, res) => {
  const isRevalidation = req.headers['cache-control']?.includes('max-age=0') ||
                         req.headers['if-none-match'] ||
                         req.headers['if-modified-since'];
  
  if (isRevalidation) {
    console.log('Revalidation request');
    // Track metrics
    metrics.increment('api.revalidation');
  }
  
  res.set('Cache-Control', 'max-age=60, stale-while-revalidate=3600');
  res.json(data);
});
```

### 4. Handle Errors Gracefully

```javascript
// Service Worker with error handling
self.addEventListener('fetch', (event) => {
  event.respondWith(
    staleWhileRevalidateWithFallback(event.request)
  );
});

async function staleWhileRevalidateWithFallback(request) {
  const cache = await caches.open('swr-cache');
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(async (error) => {
      console.error('Fetch failed:', error);
      
      // Fallback to stale cache on network error
      if (cached) {
        return cached;
      }
      
      // Ultimate fallback
      return new Response('Offline', { status: 503 });
    });
  
  // Return cached if available, otherwise wait
  return cached || fetchPromise;
}
```

### 5. Test Performance

```javascript
// Measure SWR performance
import { onLCP, onFID, onCLS } from 'web-vitals';

// Before SWR
onLCP((metric) => {
  console.log('LCP without SWR:', metric.value); // ~800ms
});

// After SWR
onLCP((metric) => {
  console.log('LCP with SWR:', metric.value); // ~100ms
});

// Track cache hit rate
let cacheHits = 0;
let cacheMisses = 0;

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        cacheHits++;
        console.log('Cache hit rate:', cacheHits / (cacheHits + cacheMisses));
      } else {
        cacheMisses++;
      }
      return response || fetch(event.request);
    })
  );
});
```

---

## Common Pitfalls

### 1. Over-Aggressive Caching

```javascript
// ❌ BAD: Cache sensitive data
app.get('/api/payment', (req, res) => {
  res.set('Cache-Control', 'max-age=60, stale-while-revalidate=3600');
  res.json(paymentInfo); // ❌ Payment data cached!
});

// ✅ GOOD: Never cache sensitive data
app.get('/api/payment', (req, res) => {
  res.set('Cache-Control', 'no-store, must-revalidate');
  res.json(paymentInfo);
});
```

### 2. Ignoring Cache Key

```javascript
// ❌ BAD: Personalized content cached publicly
app.get('/api/recommendations', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
  res.json(getRecommendations(req.userId)); // ❌ User-specific!
});

// ✅ GOOD: Use private cache
app.get('/api/recommendations', (req, res) => {
  res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=3600');
  res.set('Vary', 'Authorization'); // Different cache per user
  res.json(getRecommendations(req.userId));
});
```

### 3. Not Handling Revalidation Failures

```javascript
// ❌ BAD: No error handling
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request)
        .then(response => {
          caches.open('swr').then(cache => cache.put(event.request, response.clone()));
          return response;
        });
      
      return cached || fetchPromise; // ❌ No error handling
    })
  );
});

// ✅ GOOD: Fallback on error
self.addEventListener('fetch', (event) => {
  event.respondWith(
    staleWhileRevalidateWithFallback(event.request)
  );
});

async function staleWhileRevalidateWithFallback(request) {
  const cache = await caches.open('swr');
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // Return stale cache on error
      if (cached) return cached;
      
      // Ultimate fallback
      return new Response('Offline', { status: 503 });
    });
  
  return cached || fetchPromise;
}
```

### 4. Infinite Revalidation Loop

```javascript
// ❌ BAD: Revalidate on every render
function Profile() {
  const { data } = useSWR('/api/user', fetcher, {
    revalidateOnMount: true, // ❌
    revalidateOnFocus: true, // ❌
    refreshInterval: 0 // ❌ Revalidates constantly
  });
  
  return <div>{data.name}</div>;
}

// ✅ GOOD: Reasonable revalidation
function Profile() {
  const { data } = useSWR('/api/user', fetcher, {
    revalidateOnMount: false, // Use cache if available
    revalidateOnFocus: true, // Only when tab regains focus
    refreshInterval: 60000, // Every 1 minute
    dedupingInterval: 2000 // Dedupe requests within 2s
  });
  
  return <div>{data.name}</div>;
}
```

### 5. Not Measuring Impact

```javascript
// ✅ GOOD: Track metrics
const metrics = {
  cacheHits: 0,
  cacheMisses: 0,
  revalidations: 0,
  latencies: []
};

self.addEventListener('fetch', async (event) => {
  const start = Date.now();
  
  const response = await staleWhileRevalidate(event.request);
  
  const latency = Date.now() - start;
  metrics.latencies.push(latency);
  
  // Log metrics every 100 requests
  if (metrics.latencies.length % 100 === 0) {
    console.log('Average latency:', 
      metrics.latencies.reduce((a, b) => a + b) / metrics.latencies.length
    );
    console.log('Cache hit rate:', 
      metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)
    );
  }
});
```

---

## Advanced Patterns

### 1. Tiered SWR (Different timeouts per content)

```javascript
// API routes with different SWR windows
const swrPolicies = {
  'critical': 'max-age=10, stale-while-revalidate=60',
  'standard': 'max-age=60, stale-while-revalidate=3600',
  'static': 'max-age=3600, stale-while-revalidate=86400'
};

app.get('/api/:type/:resource', (req, res) => {
  const policy = swrPolicies[req.params.type] || swrPolicies.standard;
  res.set('Cache-Control', policy);
  
  const data = getData(req.params.resource);
  res.json(data);
});

// Usage:
// /api/critical/stock-price → 10s fresh, 1min stale
// /api/standard/products → 1min fresh, 1h stale
// /api/static/categories → 1h fresh, 1 day stale
```

### 2. Conditional SWR (Based on user plan)

```javascript
app.get('/api/data', authenticateUser, (req, res) => {
  const user = req.user;
  
  let cacheControl;
  if (user.plan === 'premium') {
    // Premium users get fresher data
    cacheControl = 'private, max-age=30, stale-while-revalidate=300';
  } else {
    // Free users get longer cache
    cacheControl = 'private, max-age=300, stale-while-revalidate=3600';
  }
  
  res.set('Cache-Control', cacheControl);
  res.json(getData());
});
```

### 3. Geographic SWR (Region-specific caching)

```javascript
app.get('/api/news', (req, res) => {
  const region = req.headers['cloudflare-ipcountry'];
  
  // Different cache policies per region
  const policies = {
    'US': 'max-age=60, stale-while-revalidate=600', // Faster updates
    'EU': 'max-age=120, stale-while-revalidate=1800', // Moderate
    'default': 'max-age=300, stale-while-revalidate=3600' // Slower
  };
  
  const policy = policies[region] || policies.default;
  res.set('Cache-Control', policy);
  
  res.json(getNewsForRegion(region));
});
```

### 4. Coordinated SWR (Sync multiple caches)

```javascript
// Service Worker + HTTP cache coordination
self.addEventListener('message', (event) => {
  if (event.data.type === 'INVALIDATE_CACHE') {
    // Invalidate Service Worker cache
    caches.delete('swr-cache').then(() => {
      // Notify all clients
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_INVALIDATED' });
        });
      });
    });
  }
});

// Frontend: Listen for invalidation
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_INVALIDATED') {
    // Invalidate React Query cache
    queryClient.invalidateQueries();
  }
});
```

---

## Interview Questions

### Conceptual Questions

1. **What is Stale-While-Revalidate and how does it work?**
   - Serves cached content immediately (0ms latency)
   - Revalidates in background
   - Updates cache for next request
   - Best of both worlds: instant + fresh

2. **What's the difference between max-age and stale-while-revalidate?**
   - **max-age**: How long content is FRESH (no revalidation)
   - **stale-while-revalidate**: How long STALE content can be served while revalidating

3. **When should you use SWR vs traditional caching?**
   - **SWR**: Frequently updated content where instant response matters
   - **Traditional**: Static content or when staleness is unacceptable

4. **What are the trade-offs of SWR?**
   - **Pros**: Instant responses, better UX, reduced server load
   - **Cons**: Temporary staleness, complexity, not for real-time data

5. **How does SWR affect Core Web Vitals?**
   - **LCP**: Improves (instant content display)
   - **FID**: Improves (no blocking network requests)
   - **CLS**: Neutral (depends on implementation)

### Scenario-Based Questions

6. **Design caching strategy for an e-commerce product list.**
   ```javascript
   // Products update hourly (prices, inventory)
   // Want instant load, but fresh data preferred
   
   Cache-Control: public, max-age=300, stale-while-revalidate=3600
   // 5 minutes fresh, 1 hour stale window
   
   // Result:
   // - Instant page loads
   // - Data refreshes every 5 minutes in background
   // - Can serve slightly stale data for up to 1 hour
   ```

7. **How would you implement SWR for user-specific data?**
   ```javascript
   // Private cache (not CDN)
   Cache-Control: private, max-age=30, stale-while-revalidate=300
   Vary: Authorization
   
   // Different cache per user
   // Short timeouts (user data changes frequently)
   ```

8. **What happens if revalidation fails?**
   ```javascript
   // Combine with stale-if-error
   Cache-Control: 
     max-age=60, 
     stale-while-revalidate=3600,
     stale-if-error=86400
   
   // If revalidation fails, continue serving stale
   // for up to 24 hours
   ```

### Code Review Questions

9. **Find the issue:**
   ```javascript
   app.get('/api/user/profile', (req, res) => {
     res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
     res.json(getUserProfile(req.userId));
   });
   ```
   **Issue**: User profile is personal data but cached publicly. Should use `private` and add `Vary: Authorization`.

10. **Optimize this code:**
    ```javascript
    // Current: No caching
    function Products() {
      const [products, setProducts] = useState([]);
      
      useEffect(() => {
        fetch('/api/products').then(res => res.json()).then(setProducts);
      }, []);
      
      return products.map(renderProduct);
    }
    ```
    
    **Optimized with SWR**:
    ```javascript
    import useSWR from 'swr';
    
    function Products() {
      const { data: products } = useSWR('/api/products', fetcher, {
        refreshInterval: 300000, // 5 minutes
        revalidateOnFocus: true
      });
      
      return products?.map(renderProduct) || <Loading />;
    }
    ```

---

## Summary

### Key Takeaways

```
┌─────────────────────────────────────────────────────────────┐
│         STALE-WHILE-REVALIDATE - KEY POINTS                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CONCEPT                                                 │
│     Serve stale cache instantly + refresh in background     │
│                                                              │
│  2. SYNTAX                                                  │
│     Cache-Control: max-age=<fresh>, stale-while-revalidate=<stale> │
│                                                              │
│  3. BENEFITS                                                │
│     • Instant responses (0ms latency)                       │
│     • Always reasonably fresh data                          │
│     • Reduced server load                                   │
│     • Better Core Web Vitals                                │
│                                                              │
│  4. TRADE-OFFS                                              │
│     • Brief staleness                                       │
│     • Background network usage                              │
│     • Not for real-time data                                │
│                                                              │
│  5. IMPLEMENTATION                                          │
│     • HTTP headers (easiest)                                │
│     • Service Workers (full control)                        │
│     • Client libraries (SWR, React Query)                   │
│                                                              │
│  6. BEST PRACTICES                                          │
│     • Choose appropriate timeouts                           │
│     • Combine with ETag/Vary headers                        │
│     • Handle revalidation failures                          │
│     • Monitor cache hit rates                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Interview Essentials

- **Definition**: Cache strategy for instant responses + background refresh
- **Syntax**: `Cache-Control: max-age=60, stale-while-revalidate=3600`
- **When to use**: Frequently accessed, occasionally updated content
- **Benefits**: 0ms latency + eventual consistency
- **Libraries**: Vercel SWR, React Query, Workbox

---

## References

- [HTTP Caching - Stale-While-Revalidate](https://web.dev/stale-while-revalidate/)
- [SWR: React Hooks for Data Fetching](https://swr.vercel.app/)
- [Workbox Strategies](https://developers.google.com/web/tools/workbox/modules/workbox-strategies)
- [MDN: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)

---

**Document Status**: Production Ready ✅  
**Last Updated**: January 2026  
**Difficulty Level**: Intermediate  
**Interview Relevance**: 🔥🔥🔥🔥🔥 (Essential)

Stale-While-Revalidate is a **must-know** caching strategy for modern web applications. It's commonly discussed in:
- Performance optimization interviews
- Frontend architecture discussions
- System design rounds
- Progressive Web App (PWA) questions

Master this for **all frontend interview levels**! 🚀
