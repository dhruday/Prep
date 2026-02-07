# 126. CORS (Cross-Origin Resource Sharing)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
CORS (Cross-Origin Resource Sharing) is a browser security mechanism that controls how web pages from one origin can request resources from a different origin. It's implemented through HTTP headers that tell the browser whether to allow or block cross-origin requests.

**Why it exists:**
CORS exists to relax the Same-Origin Policy (SOP) in a controlled way. Without CORS, browsers would block all cross-origin requests, making it impossible for frontend apps to call external APIs. CORS provides a secure way to enable legitimate cross-origin communication while preventing malicious sites from accessing sensitive resources.

**When and where it's used:**
- Frontend calling backend API on different domain
- Microservices architectures (api.example.com ↔ app.example.com)
- Third-party API integration
- CDN-hosted assets (images, fonts, scripts)
- Micro-frontends from different subdomains
- OAuth flows across domains

**Role in large-scale applications:**
In enterprise systems, CORS enables:
- Frontend-backend separation (SPA + API architecture)
- Multi-domain deployments (staging, production, multiple regions)
- Third-party integrations (payment gateways, analytics)
- Micro-frontend architectures
- Public API consumption by partners

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **Same-Origin Policy (SOP) Foundation:**

**What is "Same Origin"?**
```
https://example.com:443/page
│      │         │     │
scheme  host     port  path

Same origin: ALL of scheme, host, port must match
```

**Examples:**
```javascript
Origin: https://example.com

✓ Same Origin:
  https://example.com/api/users
  https://example.com/page?query=1

❌ Different Origin (CORS required):
  http://example.com        // Different scheme (http vs https)
  https://api.example.com   // Different host (subdomain)
  https://example.com:8080  // Different port (8080 vs 443)
  https://example.org       // Different domain
```

### **Browser CORS Flow:**

#### **Simple Requests (No Preflight)**

Conditions for simple request:
1. Method: GET, HEAD, or POST
2. Headers: Only simple headers (Accept, Content-Type, etc.)
3. Content-Type: application/x-www-form-urlencoded, multipart/form-data, or text/plain

**Flow:**
```
1. Browser sends request with Origin header
   GET /api/data HTTP/1.1
   Origin: https://app.example.com
   
2. Server responds with CORS headers
   HTTP/1.1 200 OK
   Access-Control-Allow-Origin: https://app.example.com
   
3. Browser checks headers
   - If origin matches: Allow access to response
   - If not: Block access (request still happened!)
```

#### **Preflight Requests (Most Modern Requests)**

Triggered by:
1. Methods: PUT, DELETE, PATCH
2. Custom headers: Authorization, X-Custom-Header
3. Content-Type: application/json

**Flow:**
```
1. Browser sends OPTIONS preflight
   OPTIONS /api/data HTTP/1.1
   Origin: https://app.example.com
   Access-Control-Request-Method: POST
   Access-Control-Request-Headers: Content-Type, Authorization
   
2. Server responds with allowed methods/headers
   HTTP/1.1 204 No Content
   Access-Control-Allow-Origin: https://app.example.com
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE
   Access-Control-Allow-Headers: Content-Type, Authorization
   Access-Control-Max-Age: 86400  // Cache preflight for 24h
   
3. If preflight succeeds, browser sends actual request
   POST /api/data HTTP/1.1
   Origin: https://app.example.com
   Authorization: Bearer token123
   Content-Type: application/json
   
4. Server responds with CORS headers again
   HTTP/1.1 200 OK
   Access-Control-Allow-Origin: https://app.example.com
```

### **CORS Headers Deep Dive:**

#### **Request Headers (Browser-Generated):**

```javascript
// Origin - Always sent by browser for cross-origin requests
Origin: https://app.example.com

// Preflight-specific headers
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

#### **Response Headers (Server-Generated):**

```javascript
// Required - Specifies allowed origin
Access-Control-Allow-Origin: https://app.example.com
// OR (dangerous in production):
Access-Control-Allow-Origin: *

// Allowed HTTP methods
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS

// Allowed custom headers
Access-Control-Allow-Headers: Content-Type, Authorization, X-Custom-Header

// Allow credentials (cookies, Authorization headers)
Access-Control-Allow-Credentials: true

// Cache preflight response (seconds)
Access-Control-Max-Age: 86400

// Expose additional headers to JavaScript
Access-Control-Expose-Headers: X-Total-Count, X-Page-Number

// Browser displays different error for failed requests
Vary: Origin  // Important for caching
```

### **Critical Differences:**

| Aspect | CORS | CSRF |
|--------|------|------|
| **What it protects** | Data confidentiality (reading responses) | Data integrity (state-changing actions) |
| **Attack prevented** | Malicious site reading your data | Malicious site performing actions |
| **How it works** | Browser blocks reading cross-origin responses | Server validates request origin/token |
| **When request is blocked** | After response received (too late!) | Before action is performed (if done right) |
| **Headers involved** | Access-Control-* | CSRF tokens, SameSite cookies |

**KEY INSIGHT:** CORS does NOT prevent requests from being sent—it only prevents JavaScript from reading the response. The request still hits the server and executes!

### **Common Misconceptions:**

❌ **"CORS prevents CSRF"**
- CORS blocks reading responses, not sending requests
- CSRF still possible with CORS configured

❌ **"CORS is a server-side security feature"**
- CORS is enforced by the browser
- Server just provides hints via headers
- Postman/curl ignore CORS (no browser involved)

❌ **"Access-Control-Allow-Origin: * is safe with credentials"**
- Browsers block this combination for security
- Must specify exact origin when credentials are used

❌ **"Setting CORS headers fixes all cross-origin issues"**
- Only applies to JavaScript fetch/XHR requests
- <img>, <script>, <link> tags ignore CORS (except with crossorigin attribute)

### **Performance Implications:**

**Preflight Request Overhead:**
```
Simple Request (no preflight):
  1 request → 1 response
  Time: 50ms (example)

Preflighted Request:
  OPTIONS → Response (preflight)
  Actual Request → Response
  Time: 100ms (doubled!)

Cached Preflight (Access-Control-Max-Age):
  First: 100ms (preflight + actual)
  Subsequent (within cache period): 50ms (actual only)
```

**Optimization Strategies:**
1. **Maximize preflight cache:**
   ```javascript
   Access-Control-Max-Age: 86400 // 24 hours (browser max ~2 hours for some)
   ```

2. **Avoid custom headers when possible:**
   ```javascript
   // Triggers preflight
   fetch('/api/data', {
     headers: { 'X-Custom-Header': 'value' }
   });
   
   // No preflight (if GET and no other custom headers)
   fetch('/api/data?custom=value');
   ```

3. **Use simple requests for GET operations:**
   ```javascript
   // Preflight required (Content-Type: application/json)
   fetch('/api/data', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(data)
   });
   
   // No preflight (Content-Type: text/plain)
   fetch('/api/data', {
     method: 'POST',
     headers: { 'Content-Type': 'text/plain' },
     body: JSON.stringify(data)
   });
   // (Server must handle text/plain parsing)
   ```

### **Scalability Considerations:**

**CDN and Caching:**
```javascript
// Problem: Different origins get different CORS headers
// CDN caches first response, serves to all

// Solution: Vary header
Vary: Origin

// CDN creates separate cache entries per origin
// Or use dynamic edge functions to inject headers
```

**Microservices:**
```javascript
// Multiple backends, need consistent CORS policy

// Solution 1: API Gateway (centralized CORS)
API Gateway → Microservice A
           → Microservice B
           → Microservice C

// Solution 2: Shared middleware library
// All services use same CORS configuration
```

**Multi-Region Deployments:**
```javascript
// Frontend: app.example.com
// API: us.api.example.com, eu.api.example.com

// Dynamic origin whitelist based on region
const allowedOrigins = [
  'https://app.example.com',
  'https://staging.example.com',
  // Dynamic based on environment
  ...process.env.ALLOWED_ORIGINS.split(',')
];
```

### **Security Considerations:**

**Dangerous Patterns:**

```javascript
// ❌ VULNERABLE: Allow all origins with credentials
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
// Browser blocks this, but if server reflects Origin, it's dangerous

// ❌ VULNERABLE: Reflecting Origin without validation
const origin = req.get('Origin');
res.set('Access-Control-Allow-Origin', origin); // Attacker can pass any origin!

// ❌ VULNERABLE: Wildcard subdomains
Access-Control-Allow-Origin: *.example.com  // Invalid syntax, doesn't work

// ✅ SECURE: Whitelist validation
const allowedOrigins = [
  'https://app.example.com',
  'https://staging.example.com'
];

const origin = req.get('Origin');
if (allowedOrigins.includes(origin)) {
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Credentials', 'true');
}
```

**Subdomain Attacks:**
```javascript
// If attacker controls subdomain (e.g., evil.example.com)
// and you allow all subdomains:

if (origin.endsWith('.example.com')) {
  res.set('Access-Control-Allow-Origin', origin); // Dangerous!
}

// Attacker can:
// 1. XSS on subdomain
// 2. Make cross-origin requests to main app
// 3. Read sensitive data
```

### **Common Pitfalls:**

❌ **CORS errors in development, working in production:**
```javascript
// Development: http://localhost:3000
// Production: https://app.example.com

// Backend allows https://app.example.com only
// Developers hit CORS errors locally

// Solution: Environment-based configuration
const allowedOrigins = process.env.NODE_ENV === 'development'
  ? ['http://localhost:3000', 'http://localhost:8080']
  : ['https://app.example.com'];
```

❌ **Credentials not sent even with CORS configured:**
```javascript
// Server allows credentials
Access-Control-Allow-Credentials: true

// But client doesn't send them!
fetch('/api/data');  // No cookies sent

// Solution: Include credentials in request
fetch('/api/data', {
  credentials: 'include'  // Send cookies
});
```

❌ **Setting headers too late:**
```javascript
// ❌ WRONG: CORS headers after sending body
app.get('/api/data', (req, res) => {
  res.json({ data: 'value' });
  res.set('Access-Control-Allow-Origin', '*');  // Too late!
});

// ✅ CORRECT: Set headers early
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  next();
});
```

### **What NOT to Do:**

1. **Never use `Access-Control-Allow-Origin: *` with credentials**
2. **Never reflect Origin header without validation**
3. **Never rely on CORS for security**—it's a browser feature, not server protection
4. **Never forget Vary: Origin** when dynamically setting allowed origin
5. **Never expose sensitive data to public CORS** (use authentication first)

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: SPA + API Architecture**

**Scenario:** React app and Node.js API on different domains

```
Frontend: https://app.example.com
Backend:  https://api.example.com
```

**Without CORS (Browser blocks):**
```javascript
// Frontend code
fetch('https://api.example.com/users')
  .then(res => res.json())
  .then(data => console.log(data));

// Browser Console:
// ❌ Access to fetch at 'https://api.example.com/users' from origin 
//    'https://app.example.com' has been blocked by CORS policy:
//    No 'Access-Control-Allow-Origin' header is present.
```

**With CORS (Backend configured):**
```javascript
// Backend (Express.js)
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://app.example.com',
    'https://staging.example.com'
  ];
  
  const origin = req.get('Origin');
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '86400');
    return res.sendStatus(204);
  }
  
  next();
});

app.get('/users', authenticateUser, (req, res) => {
  res.json({ users: [...] });
});

// Frontend now works!
fetch('https://api.example.com/users', {
  credentials: 'include'  // Send cookies
})
  .then(res => res.json())
  .then(data => console.log(data));  // ✓ Success
```

### **Example 2: Third-Party API Integration**

**Scenario:** Frontend calling external payment API

```javascript
// Stripe API call from frontend
fetch('https://api.stripe.com/v1/payment_intents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ amount: 1000, currency: 'usd' })
});

// ❌ CORS error - Stripe doesn't allow direct calls from browser

// ✅ Solution: Proxy through your backend
// Frontend → Your Backend → Stripe API

// Frontend
fetch('https://api.yourdomain.com/create-payment-intent', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 1000 })
});

// Your Backend
app.post('/create-payment-intent', authenticateUser, async (req, res) => {
  // CORS headers for your frontend
  res.set('Access-Control-Allow-Origin', 'https://app.yourdomain.com');
  
  // Call Stripe from server (no CORS issues)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: req.body.amount,
    currency: 'usd',
    customer: req.user.stripeCustomerId
  });
  
  res.json({ clientSecret: paymentIntent.client_secret });
});
```

**Why backend proxy is needed:**
- Third-party APIs often don't enable CORS (security)
- Backend can validate requests before forwarding
- Keeps API keys secret (not exposed to frontend)

### **Example 3: Micro-Frontends**

**Scenario:** Multiple frontend apps on subdomains sharing APIs

```
Main App:     https://app.example.com
Admin Panel:  https://admin.example.com
Mobile Web:   https://m.example.com
API:          https://api.example.com
```

**Backend CORS Configuration:**
```javascript
// api.example.com backend
import cors from 'cors';

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Dynamic subdomain matching
    const allowedPattern = /^https:\/\/([a-z0-9-]+\.)?example\.com$/;
    
    if (allowedPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400
};

app.use(cors(corsOptions));
```

### **Example 4: Public API with Rate Limiting**

**Scenario:** API consumed by external developers

```javascript
// Public API (api.yourdomain.com)
import rateLimit from 'express-rate-limit';

// Very permissive CORS for public API
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');  // Allow all origins
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.set('Access-Control-Expose-Headers', 'X-RateLimit-Remaining');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Rate limiting per API key (not origin, since it's public)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each key to 100 requests per window
  keyGenerator: (req) => req.get('X-API-Key') || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

app.use('/api', limiter);

app.get('/api/data', validateAPIKey, (req, res) => {
  res.set('X-RateLimit-Remaining', req.rateLimit.remaining);
  res.json({ data: [...] });
});
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Interview Answer (7+ years level):**

*"CORS is a browser mechanism that controls cross-origin HTTP requests. It's built on top of the Same-Origin Policy, which by default blocks JavaScript from reading responses from different origins.*

*When a browser makes a cross-origin request, it follows a specific flow:*

1. **Simple Requests** (GET with standard headers): Browser sends request with `Origin` header. Server responds with `Access-Control-Allow-Origin`. Browser checks if origin matches before allowing JavaScript to read the response.

2. **Preflighted Requests** (most modern requests): Browser first sends an OPTIONS request asking "Is this allowed?" Server responds with allowed methods/headers. If approved, browser sends the actual request.

*A critical point: CORS doesn't prevent the request from being sent—it only prevents reading the response. This means CORS is not a substitute for CSRF protection or proper authentication.*

*In production, I implement CORS with:*

- **Whitelist of allowed origins** (never reflect Origin without validation)
- **Dynamic origin checking** based on environment (dev/staging/prod)
- **Credentials support** only when necessary (`Access-Control-Allow-Credentials: true`)
- **Preflight caching** (`Access-Control-Max-Age`) to reduce latency
- **Vary: Origin header** for correct CDN caching
- **API Gateway** for consistent CORS policy across microservices

*For public APIs, I use `Access-Control-Allow-Origin: *` but never with credentials. For internal APIs, I maintain a strict whitelist and require authentication before CORS checks."*

### **Likely Follow-up Questions:**

**Q1: "Why does CORS exist if requests still reach the server?"**
*A: CORS protects data confidentiality, not integrity. It prevents a malicious site from reading sensitive data (like your bank balance) via JavaScript, even though the request reaches the server. The server still authenticates and can reject the request, but CORS adds a browser-level protection layer. For preventing unwanted actions (integrity), we use CSRF tokens and proper authentication—CORS alone isn't sufficient.*

**Q2: "How do you handle CORS in a microservices architecture?"**
*A: I use an API Gateway as the single entry point. The gateway handles CORS once, then forwards requests to internal services without CORS concerns. This provides:*
- Centralized CORS policy
- Consistent security rules
- Single point for origin whitelisting
- Better performance (one preflight instead of multiple)

*If services are called directly, we use a shared middleware library to ensure consistent CORS configuration across all services.*

**Q3: "What's the performance impact of CORS?"**
*A: Preflight requests double the latency for the first request (e.g., 50ms → 100ms). But we optimize this:*
- `Access-Control-Max-Age: 86400` caches preflight for 24 hours
- Subsequent requests skip preflight (50ms)
- Use simple requests (GET, POST with simple headers) to avoid preflight entirely
- At scale, the 50ms for the first request is negligible compared to the security benefit

*The bigger impact is debugging time when CORS is misconfigured!"*

**Q4: "Is `Access-Control-Allow-Origin: *` ever safe?"**
*A: Yes, for public APIs without authentication—like a weather API that returns the same data to everyone. But never use it with `Access-Control-Allow-Credentials: true`—browsers block this combination. If you need credentials (cookies, auth tokens), you must specify exact origins in the whitelist. For internal APIs, always use a strict whitelist.*

**Q5: "How do you debug CORS issues?"**
*A: I follow a systematic approach:*
1. Check browser console for specific CORS error
2. Look at Network tab → Response Headers for CORS headers
3. Verify Origin header in request matches what server expects
4. For preflight, check OPTIONS request separately
5. Use curl/Postman to test server (they ignore CORS)
6. Common fixes:
   - Add origin to whitelist
   - Include `credentials: 'include'` in fetch
   - Set Vary: Origin for dynamic origins
   - Handle OPTIONS method for preflight

### **Comparisons:**

| Aspect | CORS | Proxying Backend |
|--------|------|------------------|
| **Complexity** | Simple (headers only) | Requires backend route |
| **Performance** | Preflight overhead | No preflight needed |
| **Security** | Browser-enforced | Server-enforced |
| **When to use** | Same org, different domains | Third-party APIs, need to hide keys |

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

### **Example 1: Production-Ready CORS Middleware (Express)**

```javascript
// ============================================
// cors-middleware.js
// ============================================
const corsMiddleware = (options = {}) => {
  const {
    allowedOrigins = [],
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    maxAge = 86400,
    credentials = false,
    // Development mode allows localhost
    devMode = process.env.NODE_ENV === 'development'
  } = options;

  return (req, res, next) => {
    const origin = req.get('Origin');
    
    // No origin header (same-origin request or non-browser client)
    if (!origin) {
      return next();
    }

    let isAllowed = false;

    // Development mode - allow localhost
    if (devMode && origin.match(/^http:\/\/localhost(:\d+)?$/)) {
      isAllowed = true;
    } else {
      // Check whitelist
      isAllowed = allowedOrigins.some(allowed => {
        // Exact match
        if (allowed === origin) return true;
        
        // Regex pattern match
        if (allowed instanceof RegExp) return allowed.test(origin);
        
        return false;
      });
    }

    if (!isAllowed) {
      // Don't send CORS headers - browser will block
      return res.status(403).json({
        error: 'Origin not allowed',
        origin
      });
    }

    // Set CORS headers
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin'); // Important for caching
    res.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    
    if (exposedHeaders.length > 0) {
      res.set('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }
    
    if (credentials) {
      res.set('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Max-Age', maxAge.toString());
      return res.sendStatus(204);
    }

    next();
  };
};

// ============================================
// Usage
// ============================================
import express from 'express';
import corsMiddleware from './cors-middleware.js';

const app = express();

// Configuration
const corsConfig = {
  allowedOrigins: [
    'https://app.example.com',
    'https://staging.example.com',
    /^https:\/\/[a-z0-9-]+\.preview\.example\.com$/ // Preview deployments
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Number'],
  credentials: true,
  maxAge: 86400, // 24 hours
  devMode: process.env.NODE_ENV === 'development'
};

// Apply globally
app.use(corsMiddleware(corsConfig));

// Or per-route
app.get('/public-api/data', 
  corsMiddleware({ 
    allowedOrigins: ['*'], // Public endpoint
    credentials: false 
  }),
  (req, res) => {
    res.json({ data: 'public' });
  }
);
```

**Why this structure:**
- Environment-aware (development vs production)
- Regex support for dynamic subdomains
- Vary header for correct caching
- Preflight handling built-in
- Per-route override capability

### **Example 2: Frontend CORS Error Handling**

```javascript
// ============================================
// api-client.js
// ============================================
class APIClient {
  constructor(baseURL, options = {}) {
    this.baseURL = baseURL;
    this.credentials = options.credentials || 'include';
    this.onCORSError = options.onCORSError || (() => {});
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        credentials: this.credentials,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      return response;
    } catch (error) {
      // Check if it's a CORS error
      if (this.isCORSError(error)) {
        console.error('CORS Error:', {
          url,
          error: error.message,
          troubleshooting: {
            check: [
              'Is the API server running?',
              'Is CORS enabled on the server?',
              'Is your origin in the whitelist?',
              'Are you sending credentials without proper headers?'
            ]
          }
        });
        
        this.onCORSError(error, url);
      }
      
      throw error;
    }
  }

  isCORSError(error) {
    // CORS errors are TypeError with specific message patterns
    return (
      error instanceof TypeError &&
      (error.message.includes('Failed to fetch') ||
       error.message.includes('NetworkError') ||
       error.message.includes('CORS'))
    );
  }

  // Convenience methods
  async get(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// ============================================
// Usage with Error Handling
// ============================================
const api = new APIClient('https://api.example.com', {
  credentials: 'include',
  onCORSError: (error, url) => {
    // Show user-friendly message
    showNotification({
      type: 'error',
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your connection.',
      details: `URL: ${url}` // For developers
    });
    
    // Log to monitoring service
    logger.error('CORS_ERROR', { url, error: error.message });
  }
});

// Using the API
async function fetchUsers() {
  try {
    const response = await api.get('/users');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const users = await response.json();
    return users;
  } catch (error) {
    // CORS errors already handled by APIClient
    // Handle other errors here
    if (!error.message.includes('CORS')) {
      console.error('API Error:', error);
    }
  }
}
```

### **Example 3: Dynamic CORS with Environment Variables**

```javascript
// ============================================
// config/cors.js
// ============================================
class CORSConfig {
  constructor() {
    this.allowedOrigins = this.parseAllowedOrigins();
  }

  parseAllowedOrigins() {
    const origins = [];
    
    // Base origins from environment
    const envOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    origins.push(...envOrigins);
    
    // Development
    if (process.env.NODE_ENV === 'development') {
      origins.push(
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:3000'
      );
    }
    
    // Staging (allow preview deployments)
    if (process.env.NODE_ENV === 'staging') {
      origins.push(/^https:\/\/[a-z0-9-]+\.staging\.example\.com$/);
    }
    
    // Production
    if (process.env.NODE_ENV === 'production') {
      origins.push('https://app.example.com');
      
      // Multi-region support
      if (process.env.MULTI_REGION === 'true') {
        origins.push(
          'https://app.us.example.com',
          'https://app.eu.example.com',
          'https://app.asia.example.com'
        );
      }
    }
    
    return origins;
  }

  isOriginAllowed(origin) {
    if (!origin) return false;
    
    return this.allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
  }

  getCORSOptions() {
    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin) {
          return callback(null, true);
        }
        
        if (this.isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'X-API-Key'
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-Page-Number',
        'X-RateLimit-Remaining'
      ],
      maxAge: 86400 // 24 hours
    };
  }
}

// ============================================
// Usage in Express App
// ============================================
import express from 'express';
import cors from 'cors';
import { CORSConfig } from './config/cors.js';

const app = express();
const corsConfig = new CORSConfig();

// Apply CORS globally
app.use(cors(corsConfig.getCORSOptions()));

// Or apply selectively
app.use('/api/public', cors({
  origin: '*',
  credentials: false
}));

app.use('/api/private', cors(corsConfig.getCORSOptions()));

// Health check (no CORS needed)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

**Scalability benefits:**
- Environment-aware configuration
- Multi-region support
- Preview deployment patterns
- No hardcoded origins
- Easy to add new origins without code changes

### **Example 4: CORS with API Gateway (Micro-Frontends)**

```javascript
// ============================================
// API Gateway (Kong, custom Node.js, etc.)
// ============================================
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Centralized CORS handling
app.use((req, res, next) => {
  const origin = req.get('Origin');
  const allowedOrigins = [
    'https://app.example.com',
    'https://admin.example.com',
    'https://mobile.example.com'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Vary', 'Origin');
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Proxy to microservices (no CORS needed internally)
app.use('/api/users', createProxyMiddleware({
  target: 'http://users-service:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/users': '' }
}));

app.use('/api/orders', createProxyMiddleware({
  target: 'http://orders-service:3002',
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '' }
}));

app.use('/api/payments', createProxyMiddleware({
  target: 'http://payments-service:3003',
  changeOrigin: true,
  pathRewrite: { '^/api/payments': '' }
}));

app.listen(3000, () => {
  console.log('API Gateway running on port 3000');
});
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters:**

**UX Impact:**
- Enables modern SPA + API architectures
- Allows micro-frontend patterns
- Enables third-party integrations
- Misconfiguration causes confusing errors for users

**Performance Impact:**
- Preflight adds 50-100ms latency (first request)
- Caching (`Access-Control-Max-Age`) eliminates overhead for subsequent requests
- Simple requests avoid preflight entirely

**Business Impact:**
- Enables API economy (external developers can use your API)
- Allows multi-brand deployments on different domains
- Facilitates microservices and modern architectures
- Security: Prevents unauthorized data access from malicious sites

### **How It Works:**

**Request Flow:**
```
1. JavaScript makes fetch request to different origin
   ↓
2. Browser checks: Is this a simple request?
   YES → Send request with Origin header
   NO → Send OPTIONS preflight first
   ↓
3. Server responds with CORS headers
   Access-Control-Allow-Origin: <origin>
   ↓
4. Browser checks headers
   Origin matches? → Allow JS to read response
   No match? → Throw error, block JS access
   ↓
5. (Important!) Server already processed request
   This is why CORS ≠ security
```

**Key Principles:**
1. **CORS is browser-enforced** - Postman/curl ignore it
2. **Request still reaches server** - CORS doesn't prevent execution
3. **Preflight optimization** - Cache with `Access-Control-Max-Age`
4. **Whitelist, never reflect** - Validate origins strictly
5. **Credentials require exact origin** - Can't use `*` with credentials

**Production Checklist:**
- [ ] Whitelist of allowed origins (no `*` with credentials)
- [ ] Environment-based configuration (dev/staging/prod)
- [ ] Vary: Origin header for CDN caching
- [ ] Preflight caching (`Access-Control-Max-Age: 86400`)
- [ ] Credentials support only when needed
- [ ] OPTIONS method handled for preflight
- [ ] Exposed headers for custom response metadata
- [ ] Error logging for rejected origins
- [ ] Documentation for external API consumers
- [ ] Monitoring for CORS errors in production
