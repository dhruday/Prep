# 100. Cache-Control by Page Type

## 📋 Table of Contents
- [Overview](#overview)
- [Understanding Cache-Control](#understanding-cache-control)
- [Page Type Categories](#page-type-categories)
- [Static Content Pages](#static-content-pages)
- [Dynamic Content Pages](#dynamic-content-pages)
- [User-Specific Pages](#user-specific-pages)
- [API Endpoints](#api-endpoints)
- [Authentication Pages](#authentication-pages)
- [E-Commerce Pages](#e-commerce-pages)
- [Marketing & Landing Pages](#marketing--landing-pages)
- [Admin & Dashboard Pages](#admin--dashboard-pages)
- [Real-Time Content Pages](#real-time-content-pages)
- [Error Pages](#error-pages)
- [Decision Framework](#decision-framework)
- [Implementation Examples](#implementation-examples)
- [CDN Configuration](#cdn-configuration)
- [Testing & Validation](#testing--validation)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)

---

## Overview

Different page types require different caching strategies. Using the wrong `Cache-Control` headers can lead to:
- **Stale data** being served to users
- **Privacy leaks** (cached personal information)
- **Poor performance** (unnecessary requests)
- **Security vulnerabilities**

This document provides a comprehensive guide to setting appropriate cache headers for every page type.

### Why This Matters

```
┌─────────────────────────────────────────────────────────────┐
│              IMPACT OF PROPER CACHE CONTROL                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INCORRECT CACHING:                                         │
│  • User sees stale product prices                           │
│  • Private data leaked to other users                       │
│  • Server overload from uncached static assets              │
│  • Security tokens exposed                                  │
│                                                              │
│  CORRECT CACHING:                                           │
│  • Instant page loads (0ms from cache)                      │
│  • Fresh data when needed                                   │
│  • Privacy preserved                                        │
│  • 90% reduction in server load                             │
│  • Better Core Web Vitals                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Business Impact**:
- **Amazon**: Proper caching reduced infrastructure costs by $100M/year
- **Pinterest**: Improved caching increased conversions by 15%
- **Shopify**: Better cache strategy improved page speed by 40%

---

## Understanding Cache-Control

### Cache-Control Directives

```http
Cache-Control: <directive>[, <directive>]*
```

```
┌─────────────────────────────────────────────────────────────┐
│           CACHE-CONTROL DIRECTIVES                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CACHEABILITY:                                              │
│  • public        - Can be cached by browser AND CDN         │
│  • private       - Only browser can cache (not CDN)         │
│  • no-cache      - Must revalidate before using cache       │
│  • no-store      - Don't cache at all                       │
│                                                              │
│  EXPIRATION:                                                │
│  • max-age       - Fresh for N seconds                      │
│  • s-maxage      - CDN/proxy max-age (overrides max-age)   │
│  • immutable     - Never revalidate (for hashed files)      │
│                                                              │
│  REVALIDATION:                                              │
│  • must-revalidate         - Revalidate when stale          │
│  • proxy-revalidate        - Proxies must revalidate        │
│  • stale-while-revalidate  - Serve stale, update in bg      │
│  • stale-if-error          - Serve stale if origin down     │
│                                                              │
│  OTHER:                                                     │
│  • no-transform  - Don't modify content (e.g., compress)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Cache Levels

```
┌─────────────────────────────────────────────────────────────┐
│                  CACHE HIERARCHY                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Request Flow:                                              │
│                                                              │
│  User → Browser Cache → CDN Cache → Server                  │
│          ↓               ↓            ↓                      │
│       (private)      (public)     (origin)                  │
│                                                              │
│  Cache-Control Controls:                                    │
│  • private   → Only browser caches                          │
│  • public    → Browser + CDN cache                          │
│  • s-maxage  → CDN max-age (different from browser)         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Page Type Categories

### Classification Matrix

```
┌──────────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Page Type            │ Frequency   │ Personalized│ Sensitive   │ Cache Level │
├──────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Static Assets        │ Never       │ No          │ No          │ Aggressive  │
│ Marketing Pages      │ Daily       │ No          │ No          │ High        │
│ Product Listings     │ Hourly      │ No          │ No          │ Moderate    │
│ Product Details      │ Hourly      │ No          │ No          │ Moderate    │
│ Search Results       │ Real-time   │ No          │ No          │ Low         │
│ User Profile         │ Frequent    │ Yes         │ Yes         │ Low/Private │
│ Shopping Cart        │ Constant    │ Yes         │ No          │ No Cache    │
│ Checkout             │ -           │ Yes         │ Yes         │ No Cache    │
│ Dashboard            │ Frequent    │ Yes         │ Maybe       │ Low/Private │
│ Admin Panel          │ Frequent    │ Yes         │ Yes         │ No Cache    │
│ Real-time Feed       │ Constant    │ Maybe       │ No          │ No Cache    │
│ API Endpoints        │ Varies      │ Maybe       │ Maybe       │ Varies      │
└──────────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## Static Content Pages

### 1. Static Assets (JS, CSS, Images with Hash)

**Characteristics**:
- Never change (filename includes content hash)
- Can be cached indefinitely
- Should be cached by browser AND CDN

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=31536000, immutable
```

**Explanation**:
- `public`: Can be cached by CDN
- `max-age=31536000`: Cache for 1 year (max)
- `immutable`: Never revalidate (file hash guarantees freshness)

**Implementation**:
```javascript
// Express.js
app.use('/static', express.static('public', {
  maxAge: '1y',
  immutable: true,
  etag: false // No need for ETag with immutable
}));

// Nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, max-age=31536000, immutable";
}

// Next.js (automatic with webpack)
// Files in /public with [hash] get immutable caching
// Example: app-[hash].js → immutable cache
```

**Naming Convention**:
```bash
# ❌ BAD: No hash (can't cache aggressively)
/static/app.js
/static/style.css

# ✅ GOOD: Hash in filename (safe to cache forever)
/static/app.a1b2c3d4.js
/static/style.e5f6g7h8.css
```

### 2. Static Assets (Without Hash)

**Characteristics**:
- Content may change
- Need revalidation

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=3600, must-revalidate
```

**Explanation**:
- `max-age=3600`: Cache for 1 hour
- `must-revalidate`: Check with server when expired

**Implementation**:
```javascript
// Express.js
app.use('/assets', express.static('assets', {
  maxAge: '1h',
  etag: true, // Enable ETag for validation
  lastModified: true
}));

// With ETag validation
app.get('/logo.png', (req, res) => {
  const filePath = './public/logo.png';
  const etag = generateETag(filePath);
  
  res.set('Cache-Control', 'public, max-age=3600, must-revalidate');
  res.set('ETag', etag);
  
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end(); // Not Modified
  } else {
    res.sendFile(filePath);
  }
});
```

### 3. Fonts

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=31536000, immutable
```

**Why**: Fonts rarely change and are often served from CDN

**Implementation**:
```javascript
// Express.js
app.get('/fonts/*', (req, res) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('Access-Control-Allow-Origin', '*'); // CORS for fonts
  res.sendFile(req.path);
});

// Nginx
location ~* \.(woff|woff2|ttf|otf|eot)$ {
  expires 1y;
  add_header Cache-Control "public, max-age=31536000, immutable";
  add_header Access-Control-Allow-Origin "*";
}
```

---

## Dynamic Content Pages

### 1. Marketing/Landing Pages

**Characteristics**:
- Public content
- Updated occasionally (daily/weekly)
- Same for all users

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=300, stale-while-revalidate=3600
```

**Explanation**:
- Fresh for 5 minutes
- Serve stale for up to 1 hour while updating
- Public (CDN can cache)

**Implementation**:
```javascript
// Next.js SSG
export async function getStaticProps() {
  return {
    props: { data },
    revalidate: 300 // Regenerate every 5 minutes (ISR)
  };
}

// Express.js
app.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.render('home');
});

// With CDN-specific header
app.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
  // Browser: 1min, CDN: 5min
  res.render('home');
});
```

### 2. Blog Posts/Articles

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

**Explanation**:
- Fresh for 1 hour
- Serve stale for up to 24 hours
- Articles rarely change after publication

**Implementation**:
```javascript
app.get('/blog/:slug', async (req, res) => {
  const post = await getPost(req.params.slug);
  
  // Older posts cache longer
  const age = Date.now() - new Date(post.publishedAt).getTime();
  const daysOld = age / (1000 * 60 * 60 * 24);
  
  if (daysOld > 30) {
    // Posts older than 30 days rarely change
    res.set('Cache-Control', 'public, max-age=86400, immutable');
  } else if (daysOld > 7) {
    // Posts 7-30 days old
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  } else {
    // Recent posts (may get updates)
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  }
  
  res.render('post', { post });
});
```

---

## User-Specific Pages

### 1. User Profile (Own Profile)

**Characteristics**:
- User-specific
- Updated occasionally
- Private data

**Optimal Cache-Control**:
```http
Cache-Control: private, max-age=60, must-revalidate
```

**Explanation**:
- `private`: Only browser caches (not CDN)
- Short cache (1 minute)
- Must revalidate to avoid stale data

**Implementation**:
```javascript
app.get('/profile', authenticateUser, (req, res) => {
  res.set('Cache-Control', 'private, max-age=60, must-revalidate');
  res.set('Vary', 'Cookie, Authorization'); // Different cache per user
  
  const profile = getUserProfile(req.userId);
  res.render('profile', { profile });
});

// Next.js SSR
export async function getServerSideProps({ req, res }) {
  res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate');
  
  const profile = await getProfile(req.cookies.userId);
  return { props: { profile } };
}
```

### 2. User Profile (Viewing Other Users)

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=300, stale-while-revalidate=3600
```

**Explanation**:
- Public profile can be cached by CDN
- Different cache key per profile

**Implementation**:
```javascript
app.get('/user/:username', async (req, res) => {
  const profile = await getPublicProfile(req.params.username);
  
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.set('Vary', 'Accept-Encoding'); // Compress response
  res.render('public-profile', { profile });
});
```

### 3. Settings Page

**Optimal Cache-Control**:
```http
Cache-Control: private, no-cache, must-revalidate
```

**Explanation**:
- Always fetch fresh (settings may have just changed)
- Private (user-specific)

**Implementation**:
```javascript
app.get('/settings', authenticateUser, (req, res) => {
  res.set('Cache-Control', 'private, no-cache, must-revalidate');
  res.set('Vary', 'Cookie');
  
  const settings = getUserSettings(req.userId);
  res.render('settings', { settings });
});
```

---

## API Endpoints

### 1. Public API (Read-Only)

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=60, stale-while-revalidate=3600
```

**Implementation**:
```javascript
// Product listing API
app.get('/api/products', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
  res.set('Vary', 'Accept-Encoding');
  
  const products = getProducts();
  res.json(products);
});

// With pagination (different cache per page)
app.get('/api/products', (req, res) => {
  const page = req.query.page || 1;
  
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
  res.set('Vary', 'Accept-Encoding');
  
  const products = getProducts(page);
  res.json(products);
});
```

### 2. User-Specific API

**Optimal Cache-Control**:
```http
Cache-Control: private, max-age=30, must-revalidate
```

**Implementation**:
```javascript
app.get('/api/user/notifications', authenticateUser, (req, res) => {
  res.set('Cache-Control', 'private, max-age=30, must-revalidate');
  res.set('Vary', 'Authorization');
  
  const notifications = getNotifications(req.userId);
  res.json(notifications);
});
```

### 3. Mutation APIs (POST, PUT, DELETE)

**Optimal Cache-Control**:
```http
Cache-Control: no-store, must-revalidate
```

**Explanation**:
- Never cache mutations
- Always go to server

**Implementation**:
```javascript
app.post('/api/products', authenticateUser, (req, res) => {
  res.set('Cache-Control', 'no-store, must-revalidate');
  
  const product = createProduct(req.body);
  res.json(product);
});

app.delete('/api/products/:id', authenticateUser, (req, res) => {
  res.set('Cache-Control', 'no-store, must-revalidate');
  
  deleteProduct(req.params.id);
  res.status(204).end();
});
```

### 4. Real-Time API

**Optimal Cache-Control**:
```http
Cache-Control: no-cache, no-store
```

**Implementation**:
```javascript
app.get('/api/live/stock-price', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store');
  res.set('Expires', '0');
  
  const price = getCurrentStockPrice(req.query.symbol);
  res.json(price);
});
```

---

## Authentication Pages

### 1. Login Page

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=3600
```

**Explanation**:
- Login page itself is public (before authentication)
- Can be cached

**Implementation**:
```javascript
app.get('/login', (req, res) => {
  // If already logged in, redirect
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  
  res.set('Cache-Control', 'public, max-age=3600');
  res.render('login');
});
```

### 2. Login Endpoint (POST)

**Optimal Cache-Control**:
```http
Cache-Control: no-store, must-revalidate
```

**Implementation**:
```javascript
app.post('/api/login', async (req, res) => {
  res.set('Cache-Control', 'no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  
  const { email, password } = req.body;
  const user = await authenticateUser(email, password);
  
  if (user) {
    req.session.userId = user.id;
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

### 3. Authenticated Dashboard

**Optimal Cache-Control**:
```http
Cache-Control: private, no-cache, must-revalidate
```

**Implementation**:
```javascript
app.get('/dashboard', authenticateUser, (req, res) => {
  res.set('Cache-Control', 'private, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  const data = getDashboardData(req.userId);
  res.render('dashboard', { data });
});
```

---

## E-Commerce Pages

### 1. Product Listing

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=300, stale-while-revalidate=3600
```

**Explanation**:
- Products list changes (inventory, prices)
- But instant load more important than perfect accuracy
- Fresh for 5 minutes, stale for 1 hour

**Implementation**:
```javascript
app.get('/products', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.set('Vary', 'Accept-Encoding');
  
  const products = getProducts(req.query);
  res.render('products', { products });
});

// With filtering/sorting (different cache per query)
app.get('/products', (req, res) => {
  const { category, sort, priceRange } = req.query;
  
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.set('Vary', 'Accept-Encoding');
  
  const products = getFilteredProducts({ category, sort, priceRange });
  res.render('products', { products });
});
```

### 2. Product Detail Page

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

**Explanation**:
- Prices and inventory change frequently
- Shorter cache than listing

**Implementation**:
```javascript
app.get('/product/:id', async (req, res) => {
  const product = await getProduct(req.params.id);
  
  // Check inventory
  if (product.stock < 5) {
    // Low stock - shorter cache
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
  } else {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  }
  
  res.render('product', { product });
});
```

### 3. Shopping Cart

**Optimal Cache-Control**:
```http
Cache-Control: private, no-store, must-revalidate
```

**Explanation**:
- User-specific
- Changes constantly
- Should never be cached

**Implementation**:
```javascript
app.get('/cart', authenticateUser, (req, res) => {
  res.set('Cache-Control', 'private, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  
  const cart = getCart(req.userId);
  res.render('cart', { cart });
});

// Cart API
app.get('/api/cart', authenticateUser, (req, res) => {
  res.set('Cache-Control', 'no-store');
  
  const cart = getCart(req.userId);
  res.json(cart);
});
```

### 4. Checkout Page

**Optimal Cache-Control**:
```http
Cache-Control: private, no-store, no-cache, must-revalidate
```

**Explanation**:
- Sensitive payment information
- Must always be fresh
- Strictest caching policy

**Implementation**:
```javascript
app.get('/checkout', authenticateUser, (req, res) => {
  res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  const cart = getCart(req.userId);
  const paymentMethods = getPaymentMethods(req.userId);
  
  res.render('checkout', { cart, paymentMethods });
});
```

### 5. Order Confirmation

**Optimal Cache-Control**:
```http
Cache-Control: private, no-cache, must-revalidate
```

**Implementation**:
```javascript
app.get('/order/:orderId', authenticateUser, (req, res) => {
  const order = getOrder(req.params.orderId, req.userId);
  
  res.set('Cache-Control', 'private, no-cache, must-revalidate');
  res.render('order', { order });
});
```

---

## Marketing & Landing Pages

### 1. Homepage

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=300, stale-while-revalidate=3600
```

**Implementation**:
```javascript
app.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.render('home');
});

// With A/B testing (different cache per variant)
app.get('/', (req, res) => {
  const variant = getABTestVariant(req);
  
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.set('Vary', 'Cookie'); // Different cache per variant
  
  res.render(`home-${variant}`);
});
```

### 2. Pricing Page

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

**Explanation**:
- Pricing changes infrequently
- Can cache aggressively

**Implementation**:
```javascript
app.get('/pricing', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  
  const plans = getPricingPlans();
  res.render('pricing', { plans });
});
```

### 3. Contact/About Pages

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=86400, immutable
```

**Explanation**:
- Rarely changes
- Aggressive caching

**Implementation**:
```javascript
const staticPages = ['/about', '/contact', '/privacy', '/terms'];

staticPages.forEach(path => {
  app.get(path, (req, res) => {
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.render(path.slice(1)); // Remove leading slash
  });
});
```

---

## Admin & Dashboard Pages

### 1. Admin Panel

**Optimal Cache-Control**:
```http
Cache-Control: private, no-store, must-revalidate
```

**Explanation**:
- Sensitive data
- Always fetch fresh
- No caching

**Implementation**:
```javascript
app.get('/admin/*', authenticateAdmin, (req, res) => {
  res.set('Cache-Control', 'private, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  // Render admin page
  res.render('admin/' + req.params[0]);
});
```

### 2. Analytics Dashboard

**Optimal Cache-Control**:
```http
Cache-Control: private, max-age=60, must-revalidate
```

**Explanation**:
- Can cache briefly (metrics don't need to be real-time)
- Private (user-specific)

**Implementation**:
```javascript
app.get('/dashboard/analytics', authenticateUser, (req, res) => {
  res.set('Cache-Control', 'private, max-age=60, must-revalidate');
  
  const analytics = getAnalytics(req.userId);
  res.render('analytics', { analytics });
});
```

---

## Real-Time Content Pages

### 1. Live Feed (Twitter/Facebook)

**Optimal Cache-Control**:
```http
Cache-Control: private, no-cache
```

**Explanation**:
- Real-time updates required
- Can use stale briefly with SWR

**Implementation**:
```javascript
app.get('/feed', authenticateUser, (req, res) => {
  // Option 1: No cache (always fresh)
  res.set('Cache-Control', 'private, no-cache');
  
  // Option 2: Brief SWR (better UX)
  // res.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=60');
  
  const feed = getFeed(req.userId);
  res.render('feed', { feed });
});
```

### 2. Live Sports Scores

**Optimal Cache-Control**:
```http
Cache-Control: no-cache, no-store
```

**Implementation**:
```javascript
app.get('/live/game/:id', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store');
  res.set('Expires', '0');
  
  const game = getLiveGame(req.params.id);
  res.json(game);
});
```

### 3. Stock Prices

**Optimal Cache-Control**:
```http
Cache-Control: no-cache, no-store
```

**Implementation**:
```javascript
app.get('/api/stock/:symbol', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store');
  
  const price = getStockPrice(req.params.symbol);
  res.json({ symbol: req.params.symbol, price });
});
```

---

## Error Pages

### 1. 404 Page

**Optimal Cache-Control**:
```http
Cache-Control: public, max-age=3600
```

**Explanation**:
- Error page itself can be cached
- But set appropriate status code

**Implementation**:
```javascript
app.use((req, res) => {
  res.status(404);
  res.set('Cache-Control', 'public, max-age=3600');
  res.render('404');
});
```

### 2. 500 Error Page

**Optimal Cache-Control**:
```http
Cache-Control: no-cache, no-store
```

**Explanation**:
- Don't cache errors
- User should retry

**Implementation**:
```javascript
app.use((err, req, res, next) => {
  console.error(err);
  
  res.status(500);
  res.set('Cache-Control', 'no-cache, no-store');
  res.render('500');
});
```

---

## Decision Framework

### Cache-Control Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│           CACHE-CONTROL DECISION TREE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Is it SENSITIVE data? (passwords, payments, PII)        │
│     YES → no-store, must-revalidate                         │
│     NO  → Continue                                          │
│                                                              │
│  2. Is it USER-SPECIFIC?                                    │
│     YES → private (+ Continue)                              │
│     NO  → public (+ Continue)                               │
│                                                              │
│  3. How often does it CHANGE?                               │
│     Never       → max-age=31536000, immutable               │
│     Rarely      → max-age=86400, stale-while-revalidate     │
│     Hourly      → max-age=3600, stale-while-revalidate      │
│     Frequently  → max-age=60, must-revalidate               │
│     Real-time   → no-cache, no-store                        │
│                                                              │
│  4. Can it be STALE briefly?                                │
│     YES → Add stale-while-revalidate                        │
│     NO  → Add must-revalidate                               │
│                                                              │
│  5. Should CDN cache differently?                           │
│     YES → Add s-maxage                                      │
│     NO  → Use max-age only                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Quick Reference Table

```
┌───────────────────────────┬──────────────────────────────────────────────┐
│ Page Type                 │ Cache-Control                                │
├───────────────────────────┼──────────────────────────────────────────────┤
│ Static assets (hashed)    │ public, max-age=31536000, immutable          │
│ Static assets (no hash)   │ public, max-age=3600, must-revalidate        │
│ Fonts                     │ public, max-age=31536000, immutable          │
│ Marketing pages           │ public, max-age=300, swr=3600                │
│ Blog posts                │ public, max-age=3600, swr=86400              │
│ Product listing           │ public, max-age=300, swr=3600                │
│ Product detail            │ public, max-age=60, swr=300                  │
│ User profile (own)        │ private, max-age=60, must-revalidate         │
│ User profile (public)     │ public, max-age=300, swr=3600                │
│ Shopping cart             │ private, no-store, must-revalidate           │
│ Checkout                  │ private, no-store, no-cache                  │
│ Admin panel               │ private, no-store, must-revalidate           │
│ Dashboard                 │ private, max-age=60, must-revalidate         │
│ Live feed                 │ private, no-cache                            │
│ API (public read)         │ public, max-age=60, swr=3600                 │
│ API (user-specific)       │ private, max-age=30, must-revalidate         │
│ API (mutations)           │ no-store, must-revalidate                    │
│ API (real-time)           │ no-cache, no-store                           │
│ Login page                │ public, max-age=3600                         │
│ Login endpoint            │ no-store, must-revalidate                    │
│ 404 page                  │ public, max-age=3600                         │
│ 500 error                 │ no-cache, no-store                           │
└───────────────────────────┴──────────────────────────────────────────────┘
```

---

## Implementation Examples

### Comprehensive Middleware

```javascript
const express = require('express');
const app = express();

// Cache configuration by path pattern
const cacheConfig = {
  // Static assets with hash
  '^/static/.*\\.[a-f0-9]{8,}\\.(js|css|png|jpg|gif|svg)$': {
    cacheControl: 'public, max-age=31536000, immutable',
    etag: false
  },
  
  // Static assets without hash
  '^/static/': {
    cacheControl: 'public, max-age=3600, must-revalidate',
    etag: true
  },
  
  // Fonts
  '^/fonts/': {
    cacheControl: 'public, max-age=31536000, immutable',
    etag: false
  },
  
  // API endpoints
  '^/api/products': {
    cacheControl: 'public, max-age=60, stale-while-revalidate=3600',
    vary: 'Accept-Encoding'
  },
  
  '^/api/user/': {
    cacheControl: 'private, max-age=30, must-revalidate',
    vary: 'Authorization'
  },
  
  // Marketing pages
  '^/(about|pricing|features)': {
    cacheControl: 'public, max-age=3600, stale-while-revalidate=86400'
  },
  
  // User pages
  '^/(dashboard|settings|profile)': {
    cacheControl: 'private, max-age=60, must-revalidate',
    vary: 'Cookie'
  },
  
  // Sensitive pages
  '^/(checkout|payment|admin)': {
    cacheControl: 'private, no-store, no-cache, must-revalidate',
    pragma: 'no-cache',
    expires: '0'
  }
};

// Apply cache headers middleware
app.use((req, res, next) => {
  for (const [pattern, config] of Object.entries(cacheConfig)) {
    if (new RegExp(pattern).test(req.path)) {
      res.set('Cache-Control', config.cacheControl);
      
      if (config.vary) {
        res.set('Vary', config.vary);
      }
      
      if (config.pragma) {
        res.set('Pragma', config.pragma);
      }
      
      if (config.expires) {
        res.set('Expires', config.expires);
      }
      
      if (config.etag === false) {
        res.removeHeader('ETag');
      }
      
      break;
    }
  }
  
  next();
});
```

### Next.js Configuration

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      // Static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      
      // Public images
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      
      // API routes
      {
        source: '/api/public/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=3600',
          },
        ],
      },
      
      {
        source: '/api/user/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=30, must-revalidate',
          },
          {
            key: 'Vary',
            value: 'Authorization',
          },
        ],
      },
    ];
  },
};
```

### Nginx Configuration

```nginx
# Static assets with hash
location ~* \.[a-f0-9]{8,}\.(js|css|png|jpg|gif|svg)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    etag off;
}

# Static assets without hash
location /static/ {
    expires 1h;
    add_header Cache-Control "public, max-age=3600, must-revalidate";
}

# Fonts
location ~* \.(woff|woff2|ttf|otf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "*";
}

# API endpoints
location /api/products {
    add_header Cache-Control "public, max-age=60, stale-while-revalidate=3600";
    add_header Vary "Accept-Encoding";
    proxy_pass http://backend;
}

# User API
location /api/user/ {
    add_header Cache-Control "private, max-age=30, must-revalidate";
    add_header Vary "Authorization";
    proxy_pass http://backend;
}

# Sensitive pages
location ~ ^/(checkout|payment|admin) {
    add_header Cache-Control "private, no-store, no-cache, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    proxy_pass http://backend;
}
```

---

## CDN Configuration

### Cloudflare Page Rules

```javascript
// Cloudflare Page Rules
const pageRules = [
  {
    url: 'example.com/static/*',
    settings: {
      cacheLevel: 'aggressive',
      edgeCacheTTL: 31536000, // 1 year
      browserCacheTTL: 31536000
    }
  },
  
  {
    url: 'example.com/api/products*',
    settings: {
      cacheLevel: 'standard',
      edgeCacheTTL: 300, // 5 minutes
      browserCacheTTL: 60
    }
  },
  
  {
    url: 'example.com/dashboard*',
    settings: {
      cacheLevel: 'bypass' // Don't cache
    }
  }
];
```

### AWS CloudFront Behaviors

```javascript
// CloudFront distribution behavior
{
  "Behaviors": [
    {
      "PathPattern": "/static/*",
      "MinTTL": 31536000,
      "MaxTTL": 31536000,
      "DefaultTTL": 31536000,
      "Compress": true
    },
    {
      "PathPattern": "/api/products*",
      "MinTTL": 0,
      "MaxTTL": 3600,
      "DefaultTTL": 60,
      "CachedMethods": ["GET", "HEAD"],
      "AllowedMethods": ["GET", "HEAD", "OPTIONS"]
    },
    {
      "PathPattern": "/api/user/*",
      "MinTTL": 0,
      "MaxTTL": 0,
      "DefaultTTL": 0, // Don't cache
      "ForwardedValues": {
        "Headers": ["Authorization", "Cookie"]
      }
    }
  ]
}
```

---

## Testing & Validation

### Manual Testing

```bash
# Check Cache-Control header
curl -I https://example.com/page

# Expected response:
HTTP/2 200
cache-control: public, max-age=300, stale-while-revalidate=3600
vary: Accept-Encoding

# Test with If-None-Match (ETag validation)
curl -I -H "If-None-Match: \"abc123\"" https://example.com/page

# Expected: 304 Not Modified (if ETag matches)

# Test CDN caching
curl -I https://example.com/page
# Look for: X-Cache: HIT (cached by CDN)
```

### Automated Testing

```javascript
const axios = require('axios');
const { expect } = require('chai');

describe('Cache-Control Headers', () => {
  it('should cache static assets aggressively', async () => {
    const response = await axios.get('https://example.com/static/app.abc123.js');
    
    expect(response.headers['cache-control']).to.include('max-age=31536000');
    expect(response.headers['cache-control']).to.include('immutable');
  });
  
  it('should not cache checkout page', async () => {
    const response = await axios.get('https://example.com/checkout', {
      headers: { Cookie: 'session=abc123' }
    });
    
    expect(response.headers['cache-control']).to.include('no-store');
  });
  
  it('should cache API with SWR', async () => {
    const response = await axios.get('https://example.com/api/products');
    
    expect(response.headers['cache-control']).to.include('stale-while-revalidate');
  });
  
  it('should set Vary header for user-specific content', async () => {
    const response = await axios.get('https://example.com/api/user/profile', {
      headers: { Authorization: 'Bearer token' }
    });
    
    expect(response.headers['vary']).to.include('Authorization');
  });
});
```

### Lighthouse Audit

```bash
# Run Lighthouse audit
npx lighthouse https://example.com --view

# Check:
# - "Serve static assets with an efficient cache policy"
# - "Uses long cache TTL" (should be green)
```

---

## Common Mistakes

### 1. Caching User-Specific Data Publicly

```javascript
// ❌ BAD: User profile cached publicly
app.get('/profile', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(getUserProfile(req.userId)); // ❌ Leaked to other users!
});

// ✅ GOOD: Private cache + Vary header
app.get('/profile', (req, res) => {
  res.set('Cache-Control', 'private, max-age=60, must-revalidate');
  res.set('Vary', 'Cookie, Authorization');
  res.json(getUserProfile(req.userId));
});
```

### 2. Not Setting Vary Header

```javascript
// ❌ BAD: No Vary header (same cache for all encodings)
app.get('/api/data', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(data);
});

// ✅ GOOD: Vary by Accept-Encoding
app.get('/api/data', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.set('Vary', 'Accept-Encoding'); // Separate cache for gzip, brotli
  res.json(data);
});
```

### 3. Caching Errors

```javascript
// ❌ BAD: Caching 500 errors
app.use((err, req, res, next) => {
  res.status(500);
  // No Cache-Control set → might be cached!
  res.json({ error: 'Internal Server Error' });
});

// ✅ GOOD: Don't cache errors
app.use((err, req, res, next) => {
  res.status(500);
  res.set('Cache-Control', 'no-cache, no-store');
  res.json({ error: 'Internal Server Error' });
});
```

### 4. Ignoring Query Parameters

```javascript
// ❌ BAD: Same cache for all queries
app.get('/search', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  const results = search(req.query.q); // Different query = different cache!
  res.json(results);
});

// ✅ GOOD: Query parameters included in cache key (default behavior)
// Or explicitly vary by query
app.get('/search', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  // CDNs automatically include query params in cache key
  const results = search(req.query.q);
  res.json(results);
});
```

### 5. Over-Caching Mutations

```javascript
// ❌ BAD: Caching POST/PUT/DELETE
app.post('/api/products', (req, res) => {
  // No Cache-Control set → might be cached!
  const product = createProduct(req.body);
  res.json(product);
});

// ✅ GOOD: Never cache mutations
app.post('/api/products', (req, res) => {
  res.set('Cache-Control', 'no-store, must-revalidate');
  const product = createProduct(req.body);
  res.json(product);
});
```

---

## Best Practices

### 1. Use Sensible Defaults

```javascript
// Set default cache policy
app.use((req, res, next) => {
  // Default: no cache (safe default)
  res.set('Cache-Control', 'private, no-cache, must-revalidate');
  next();
});

// Override in specific routes
app.get('/static/*', (req, res) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(req.path);
});
```

### 2. Always Set Vary for User-Specific Content

```javascript
app.get('/api/recommendations', authenticateUser, (req, res) => {
  res.set('Cache-Control', 'private, max-age=60');
  res.set('Vary', 'Cookie, Authorization'); // ✅ Different cache per user
  
  const recommendations = getRecommendations(req.userId);
  res.json(recommendations);
});
```

### 3. Combine with ETag for Bandwidth Savings

```javascript
app.get('/api/data', (req, res) => {
  const data = getData();
  const etag = generateETag(data);
  
  res.set('Cache-Control', 'public, max-age=60, must-revalidate');
  res.set('ETag', etag);
  
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end(); // Not Modified (no body = bandwidth savings)
  } else {
    res.json(data);
  }
});
```

### 4. Document Your Cache Strategy

```javascript
/**
 * Cache Strategy:
 * - Static assets (hashed): 1 year, immutable
 * - Product listings: 5 min fresh, 1 hour stale (SWR)
 * - User profiles: 1 min fresh, private
 * - Admin pages: No cache
 * - API mutations: No cache
 */

const CACHE_POLICIES = {
  STATIC_IMMUTABLE: 'public, max-age=31536000, immutable',
  PRODUCT_LISTING: 'public, max-age=300, stale-while-revalidate=3600',
  USER_PROFILE: 'private, max-age=60, must-revalidate',
  NO_CACHE: 'private, no-store, must-revalidate'
};
```

### 5. Monitor Cache Hit Rates

```javascript
// Track cache metrics
const cacheMetrics = {
  hits: 0,
  misses: 0,
  staleServed: 0
};

app.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Check if response came from cache
    if (res.get('X-Cache') === 'HIT') {
      cacheMetrics.hits++;
    } else {
      cacheMetrics.misses++;
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});

// Log metrics periodically
setInterval(() => {
  const total = cacheMetrics.hits + cacheMetrics.misses;
  const hitRate = (cacheMetrics.hits / total * 100).toFixed(2);
  console.log(`Cache hit rate: ${hitRate}%`);
}, 60000); // Every minute
```

---

## Interview Questions

### Conceptual Questions

1. **What Cache-Control header would you use for:**
   - **Static JS with hash**: `public, max-age=31536000, immutable`
   - **Product listing**: `public, max-age=300, stale-while-revalidate=3600`
   - **User profile**: `private, max-age=60, must-revalidate`
   - **Shopping cart**: `private, no-store, must-revalidate`
   - **Login page**: `public, max-age=3600`

2. **What's the difference between `public` and `private`?**
   - `public`: Can be cached by CDN and browser
   - `private`: Only browser caches (not CDN) - use for user-specific content

3. **When should you use `s-maxage`?**
   - When CDN should cache differently than browser
   - Example: `max-age=60, s-maxage=300` (browser: 1min, CDN: 5min)

4. **Why is `Vary` header important?**
   - Tells caches which headers affect the response
   - Prevents cache collision (e.g., different users getting same cached response)

5. **What's the difference between `no-cache` and `no-store`?**
   - `no-cache`: Cache but must revalidate before using
   - `no-store`: Don't cache at all

### Scenario-Based Questions

6. **Design cache strategy for an e-commerce site.**
   ```
   - Homepage: public, max-age=300, swr=3600
   - Product listing: public, max-age=300, swr=3600
   - Product detail: public, max-age=60, swr=300
   - Shopping cart: private, no-store
   - Checkout: private, no-store, no-cache
   - Static assets: public, max-age=31536000, immutable
   ```

7. **User reports seeing another user's profile. What's wrong?**
   ```javascript
   // Issue: User-specific data cached publicly
   res.set('Cache-Control', 'public, max-age=3600'); // ❌
   
   // Fix: Use private + Vary header
   res.set('Cache-Control', 'private, max-age=60');
   res.set('Vary', 'Cookie, Authorization'); // ✅
   ```

8. **How would you cache a news website?**
   ```
   - Homepage: public, max-age=120, swr=3600
   - Article (< 7 days): public, max-age=300, swr=3600
   - Article (> 7 days): public, max-age=3600, swr=86400
   - Breaking news: public, max-age=30, swr=120
   ```

### Code Review Questions

9. **Find the issue:**
   ```javascript
   app.get('/api/user/notifications', (req, res) => {
     res.set('Cache-Control', 'public, max-age=300');
     res.json(getNotifications(req.userId));
   });
   ```
   **Issue**: User notifications are personal (`private`) and cached publicly. Should be:
   ```javascript
   res.set('Cache-Control', 'private, max-age=30, must-revalidate');
   res.set('Vary', 'Authorization');
   ```

10. **Optimize this:**
    ```javascript
    app.get('/product/:id', (req, res) => {
      const product = getProduct(req.params.id);
      res.json(product);
    });
    ```
    **Optimized**:
    ```javascript
    app.get('/product/:id', (req, res) => {
      const product = getProduct(req.params.id);
      
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.set('Vary', 'Accept-Encoding');
      
      // Add ETag for conditional requests
      const etag = generateETag(product);
      res.set('ETag', etag);
      
      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
      } else {
        res.json(product);
      }
    });
    ```

---

## Summary

### Key Takeaways

```
┌─────────────────────────────────────────────────────────────┐
│         CACHE-CONTROL BY PAGE TYPE - KEY POINTS              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. STATIC ASSETS                                           │
│     Hashed: immutable, 1 year                               │
│     No hash: must-revalidate, 1 hour                        │
│                                                              │
│  2. PUBLIC CONTENT                                          │
│     Use: public, max-age, stale-while-revalidate            │
│     Examples: marketing pages, product listings             │
│                                                              │
│  3. USER-SPECIFIC                                           │
│     Use: private, Vary header                               │
│     Short max-age, must-revalidate                          │
│                                                              │
│  4. SENSITIVE DATA                                          │
│     Use: no-store, must-revalidate                          │
│     Examples: payments, admin, auth                         │
│                                                              │
│  5. REAL-TIME                                               │
│     Use: no-cache, no-store                                 │
│     Examples: live scores, stock prices                     │
│                                                              │
│  6. MUTATIONS                                               │
│     Always: no-store                                        │
│     Never cache POST/PUT/DELETE                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Interview Essentials

- **Know the directives**: `public`, `private`, `max-age`, `s-maxage`, `no-cache`, `no-store`, `immutable`, `stale-while-revalidate`
- **Understand cache levels**: Browser vs CDN
- **Use Vary header**: For user-specific content
- **Never cache**: Sensitive data, mutations, real-time data
- **Cache aggressively**: Static assets with hash

---

## References

- [MDN: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- [web.dev: HTTP Caching](https://web.dev/http-cache/)
- [RFC 7234: HTTP Caching](https://tools.ietf.org/html/rfc7234)

---

**Document Status**: Production Ready ✅  
**Last Updated**: January 2026  
**Difficulty Level**: Intermediate  
**Interview Relevance**: 🔥🔥🔥🔥🔥 (Essential)

Understanding Cache-Control by page type is **critical** for:
- Performance optimization interviews
- System design discussions
- Security considerations
- Cost optimization

This is a **must-know** for all frontend engineering levels! 🚀
