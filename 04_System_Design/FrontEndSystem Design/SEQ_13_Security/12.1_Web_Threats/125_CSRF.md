# 125. CSRF (Cross-Site Request Forgery)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
CSRF (Cross-Site Request Forgery) is an attack where a malicious website tricks a user's browser into making unwanted authenticated requests to a different website where the user is logged in. It exploits the browser's automatic inclusion of cookies with requests.

**Why it exists:**
CSRF vulnerabilities exist because browsers automatically attach cookies (including session tokens) to every request to a domain, regardless of where the request originates. The server can't distinguish between legitimate user actions and forged requests from malicious sites.

**When and where it's used (exploited):**
- Money transfers in banking apps
- Password/email changes in user accounts
- Social media post creation/deletion
- Shopping cart checkouts
- Admin panel actions
- Any state-changing operation that relies only on cookies

**Role in large-scale applications:**
In enterprise systems, CSRF can lead to:
- Unauthorized financial transactions
- Account takeovers via settings changes
- Mass actions affecting millions of users
- Privilege escalation in admin panels
- Reputational damage from unauthorized posts

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **How CSRF Works:**

**Attack Flow:**
```
1. User logs into bank.com (gets session cookie)
   ↓
2. User visits evil.com (while still logged in to bank.com)
   ↓
3. evil.com has hidden form:
   <form action="https://bank.com/transfer" method="POST">
     <input name="to" value="attacker-account">
     <input name="amount" value="10000">
   </form>
   <script>document.forms[0].submit();</script>
   ↓
4. Browser automatically sends bank.com cookies with request
   ↓
5. bank.com processes request (thinks it's legitimate)
   ↓
6. Money transferred to attacker
```

**Why Cookies Are the Problem:**
```javascript
// Browser behavior (automatic, can't prevent):
fetch('https://bank.com/api/transfer', {
  method: 'POST',
  credentials: 'include', // Cookies sent automatically
  body: JSON.stringify({ to: 'attacker', amount: 10000 })
});

// Server sees:
// Cookie: sessionId=abc123 ✓ (valid session)
// But can't tell if request came from bank.com or evil.com
```

### **Browser Security Model:**

**Same-Origin Policy (SOP):**
- Prevents reading response from cross-origin requests
- Does NOT prevent making the request
- Server still processes the request (damage done)

**Cookie Behavior:**
```javascript
// Cookies are sent based on:
// 1. Domain attribute
// 2. Path attribute
// 3. Secure flag
// 4. SameSite attribute

// Example vulnerable cookie:
Set-Cookie: sessionId=abc; Domain=bank.com; Path=/

// Browser sends this cookie to:
// ✓ https://bank.com/transfer (same origin)
// ✓ https://bank.com/api/transfer (same origin)
// ❌ https://evil.com (different origin) - but...
// ✓ Requests FROM evil.com TO bank.com (CSRF!)
```

### **Defense Mechanisms:**

#### **1. CSRF Tokens (Synchronizer Token Pattern)**

**How it works:**
```
Server generates unique token per session/request
  ↓
Token embedded in forms/pages
  ↓
Client includes token in state-changing requests
  ↓
Server validates token matches session
  ↓
Attacker can't get token (SOP prevents reading)
```

**Implementation:**
```javascript
// Server generates token
const csrfToken = crypto.randomBytes(32).toString('hex');
req.session.csrfToken = csrfToken;

// Frontend includes in requests
fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken // Custom header
  },
  body: JSON.stringify(data)
});

// Server validates
if (req.headers['x-csrf-token'] !== req.session.csrfToken) {
  return res.status(403).json({ error: 'Invalid CSRF token' });
}
```

**Why custom headers work:**
- Browser won't auto-send custom headers cross-origin
- CORS preflight required for custom headers
- Attacker can't make browser send custom header to bank.com from evil.com

#### **2. SameSite Cookie Attribute**

**Modern, elegant solution:**
```javascript
Set-Cookie: sessionId=abc; SameSite=Strict; Secure; HttpOnly

// SameSite=Strict: Cookie NEVER sent cross-site
// SameSite=Lax: Cookie sent on top-level navigation (GET only)
// SameSite=None: Cookie sent cross-site (requires Secure)
```

**Behavior:**
```javascript
// SameSite=Strict
User clicks link on evil.com → bank.com
❌ No cookie sent (user appears logged out)

// SameSite=Lax (better UX)
User clicks link on evil.com → bank.com
✓ Cookie sent (GET request, top-level navigation)

evil.com submits form → bank.com
❌ Cookie not sent (state-changing request)

// SameSite=None
Set-Cookie: sessionId=abc; SameSite=None; Secure
✓ Cookie sent cross-site (use only for legitimate cross-site features)
```

#### **3. Origin/Referer Header Checking**

```javascript
app.post('/api/transfer', (req, res) => {
  const origin = req.get('Origin') || req.get('Referer');
  
  if (!origin || !origin.startsWith('https://bank.com')) {
    return res.status(403).json({ error: 'Invalid origin' });
  }
  
  // Process request
});
```

**Limitations:**
- Users can disable Referer header (privacy)
- Some corporate proxies strip headers
- Not reliable as sole defense

#### **4. Double Submit Cookie Pattern**

```javascript
// Server sets CSRF token in cookie AND expects it in header/body
Set-Cookie: csrf-token=xyz; SameSite=Lax

// Client reads cookie and sends in custom header
const csrfToken = getCookie('csrf-token');
fetch('/api/transfer', {
  headers: { 'X-CSRF-Token': csrfToken }
});

// Server validates
if (req.cookies['csrf-token'] !== req.headers['x-csrf-token']) {
  return res.status(403).json({ error: 'CSRF validation failed' });
}
```

**Why it works:**
- Attacker can't read cookie value (SOP)
- Can't set custom header cross-origin
- Simpler than server-side session storage

### **Performance Implications:**

1. **CSRF Token Generation:**
   - crypto.randomBytes(): ~0.1ms
   - Negligible overhead

2. **Token Validation:**
   - String comparison: <0.01ms
   - Session lookup (if stored server-side): 1-5ms (Redis)

3. **SameSite Cookies:**
   - Zero performance cost
   - Browser handles everything
   - Best option for new applications

### **Scalability Considerations:**

**Horizontal Scaling:**
```javascript
// Problem: CSRF tokens in server memory
Server 1: token=abc (user's session)
Server 2: token=??? (doesn't have user's session)

// Solution 1: Sticky sessions (not ideal)
Load balancer routes user to same server

// Solution 2: Centralized session store
Redis stores all CSRF tokens
All servers read from Redis

// Solution 3: Stateless tokens (best)
const token = jwt.sign({ userId }, secret);
// Server can verify without storage
```

**CDN Caching:**
- CSRF tokens must be per-user
- Can't cache HTML with tokens
- Use dynamic token injection:
  ```javascript
  // Cache HTML without token
  <meta name="csrf-token" content="__CSRF_TOKEN__">
  
  // Edge function replaces token
  response.body = response.body.replace('__CSRF_TOKEN__', generateToken());
  ```

### **Common Pitfalls:**

❌ **GET requests for state changes:**
```javascript
// VULNERABLE
<img src="/api/delete-account?id=123">
// GET requests don't trigger CORS preflight
```

❌ **CSRF protection only on forms, not APIs:**
```javascript
// VULNERABLE
app.post('/form-submit', csrfProtection, handler);
app.post('/api/transfer', handler); // Oops, no CSRF protection!
```

❌ **Exposing CSRF token in URL:**
```javascript
// VULNERABLE (token leaks in logs, Referer header)
<form action="/transfer?csrf=abc123">
```

❌ **Not validating token on all state-changing requests:**
```javascript
// VULNERABLE
if (req.method === 'POST') {
  validateCSRF(); // Forgot PUT, DELETE, PATCH
}
```

❌ **Client-side CSRF validation:**
```javascript
// USELESS - attacker bypasses frontend
if (csrfToken === expectedToken) {
  submitForm(); // This doesn't protect anything
}
```

### **What NOT to Do:**

1. **Don't rely on CORS alone** - It doesn't prevent requests, only reading responses
2. **Don't use predictable tokens** - Use cryptographically secure random values
3. **Don't skip CSRF for "internal" APIs** - Still vulnerable
4. **Don't forget WebSocket connections** - Need CSRF protection too
5. **Don't trust the Referer header alone** - Can be stripped/spoofed

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: GitHub CSRF Vulnerability (2012)**

**Scenario:** GitHub's repository deletion was vulnerable to CSRF

**Attack:**
```html
<!-- evil.com hosts this page -->
<img src="https://github.com/repos/delete?repo=username/project">
```

**Flow:**
1. Developer logged into GitHub
2. Visits malicious site
3. Hidden image makes DELETE request
4. GitHub deletes repository (cookies authenticated it)

**Impact:** Potential for mass repository deletion

**Fix:**
- Implemented CSRF tokens for all state-changing operations
- Added SameSite=Lax cookies
- Confirmation dialogs for destructive actions

### **Example 2: Banking Application**

**Initial Vulnerable Design:**
```javascript
// ============================================
// Backend - No CSRF Protection
// ============================================
app.post('/api/transfer', authenticateUser, async (req, res) => {
  // Only checks if user is authenticated (via cookie)
  const { to, amount } = req.body;
  
  await db.transactions.create({
    from: req.user.id,
    to,
    amount
  });
  
  res.json({ success: true });
});

// ============================================
// Attacker's Site
// ============================================
<html>
<body onload="document.forms[0].submit()">
  <form action="https://bank.com/api/transfer" method="POST">
    <input type="hidden" name="to" value="attacker-account">
    <input type="hidden" name="amount" value="10000">
  </form>
</body>
</html>
```

**Attack Success:**
- User visits attacker's site while logged into bank
- Form auto-submits
- Browser sends session cookie automatically
- Transfer executes

**Evolved Secure Design:**
```javascript
// ============================================
// Backend - With CSRF Protection
// ============================================
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

app.use(cookieParser());
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: true
  }
});

// Generate CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Protected transfer endpoint
app.post('/api/transfer', 
  csrfProtection, 
  authenticateUser, 
  async (req, res) => {
    // CSRF middleware validates token automatically
    
    const { to, amount } = req.body;
    
    // Additional validation
    if (amount > req.user.dailyLimit) {
      return res.status(400).json({ error: 'Exceeds daily limit' });
    }
    
    // Require 2FA for large transfers
    if (amount > 5000) {
      if (!await verify2FA(req.user, req.body.otp)) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }
    
    await db.transactions.create({
      from: req.user.id,
      to,
      amount,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Send email notification
    await sendEmail(req.user.email, 'Transfer completed', { amount, to });
    
    res.json({ success: true });
  }
);

// ============================================
// Frontend - React Component
// ============================================
import { useState, useEffect } from 'react';

function TransferForm() {
  const [csrfToken, setCSRFToken] = useState('');
  const [formData, setFormData] = useState({ to: '', amount: '' });

  // Fetch CSRF token on mount
  useEffect(() => {
    fetchCSRFToken();
  }, []);

  const fetchCSRFToken = async () => {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });
    const data = await response.json();
    setCSRFToken(data.csrfToken);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const response = await fetch('/api/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken // Include token in custom header
      },
      credentials: 'include', // Send cookies
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      alert('Transfer successful');
    } else {
      const error = await response.json();
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Recipient"
        value={formData.to}
        onChange={(e) => setFormData({ ...formData, to: e.target.value })}
      />
      <input
        type="number"
        placeholder="Amount"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
      />
      <button type="submit">Transfer</button>
    </form>
  );
}
```

### **Example 3: Social Media Post Deletion**

**Scenario:** Facebook-like platform with post deletion

**Defense-in-Depth Approach:**
```javascript
// ============================================
// Multiple Layers of CSRF Protection
// ============================================

// Layer 1: SameSite Cookie
Set-Cookie: sessionId=abc; SameSite=Lax; Secure; HttpOnly

// Layer 2: CSRF Token
Set-Cookie: csrf-token=xyz; SameSite=Lax; Secure

// Layer 3: Origin Validation
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.get('Origin');
    if (origin && !origin.endsWith('.facebook.com')) {
      return res.status(403).json({ error: 'Invalid origin' });
    }
  }
  next();
});

// Layer 4: Custom Header Check
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    // Modern browsers send this for fetch/XHR
    if (!req.get('X-Requested-With')) {
      return res.status(403).json({ error: 'Missing required header' });
    }
  }
  next();
});

// Layer 5: CSRF Token Validation
app.delete('/api/posts/:id', csrfProtection, async (req, res) => {
  // Token validated by middleware
  
  const post = await db.posts.findById(req.params.id);
  
  // Authorization check
  if (post.authorId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  await post.delete();
  res.json({ success: true });
});
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Interview Answer (7+ years level):**

*"CSRF is an attack where a malicious site tricks a user's browser into making authenticated requests to a different site where the user is logged in. The vulnerability exists because browsers automatically include cookies with requests, even if the request originates from a different domain.*

*In production systems, I implement multiple layers of CSRF protection:*

1. **SameSite Cookies (Primary Defense):** Set `SameSite=Lax` or `Strict` on session cookies. This prevents browsers from sending cookies on cross-site requests. It's the modern, zero-overhead solution.

2. **CSRF Tokens (Defense-in-Depth):** Generate a unique token per session, embed it in the page, and require it in custom headers for state-changing requests. Attackers can't read the token due to Same-Origin Policy.

3. **Custom Headers:** Require custom headers like `X-Requested-With` or `X-CSRF-Token`. Browsers won't auto-send custom headers cross-origin, and CORS preflight blocks malicious attempts.

4. **Origin Validation:** Check the Origin or Referer header to ensure requests come from our domain. Not sufficient alone, but good defense-in-depth.

5. **HTTP Method Semantics:** Never use GET for state-changing operations. GET requests don't trigger CORS preflight, making them easier to exploit.

*For high-value operations like money transfers, I add transaction confirmation via email/SMS, rate limiting, and fraud detection systems. The key is defense-in-depth—multiple independent protections so if one fails, others still protect users."*

### **Likely Follow-up Questions:**

**Q1: "Why not just use CORS to prevent CSRF?"**
*A: CORS doesn't prevent the request from being sent—it only prevents the attacker from reading the response. In CSRF, the damage is done when the request executes (e.g., money transferred), not when the attacker reads the response. CORS protects data confidentiality, not integrity. That's why we need CSRF tokens or SameSite cookies.*

**Q2: "How do SameSite cookies solve CSRF completely?"**
*A: SameSite=Strict prevents cookies from being sent on any cross-site request. SameSite=Lax allows cookies only on top-level navigations with safe methods (GET). This means a malicious site can't make a POST request with the user's cookies. However, there are edge cases like subdomain attacks or browser bugs, so I still implement CSRF tokens as defense-in-depth.*

**Q3: "What about mobile apps? Do they need CSRF protection?"**
*A: Native mobile apps don't use cookies for authentication typically—they use tokens in Authorization headers. Since these tokens aren't auto-sent by the browser, CSRF isn't a concern. However, if the app uses a WebView with cookie-based auth, it's still vulnerable. We'd implement the same protections or switch to token-based auth.*

**Q4: "How do you handle CSRF with SPAs and stateless backends?"**
*A: I use the double-submit cookie pattern. Set a CSRF token in a cookie on login, and require the frontend to read it and send it in a custom header. Since JavaScript can only read cookies from the same origin, and can't set custom headers cross-origin, this works without server-side state. Alternatively, SameSite cookies eliminate the need entirely.*

**Q5: "Performance impact of CSRF protection at scale?"**
*A: SameSite cookies have zero performance cost—it's a browser-level check. CSRF tokens add minimal overhead: token generation is ~0.1ms, validation is <0.01ms for comparison or 1-5ms for Redis lookup. At scale, we use stateless tokens (JWT) or the double-submit pattern to avoid centralized session storage. The security benefit far outweighs the negligible performance cost.*

### **Trade-offs Comparison:**

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **SameSite=Strict** | No code changes, zero overhead | Breaks cross-site navigation UX | High-security apps (banking) |
| **SameSite=Lax** | Good security + UX balance | Doesn't protect GET (but GET shouldn't change state) | Most applications (recommended) |
| **CSRF Tokens (Session)** | Works in old browsers | Requires server-side state | Legacy browser support needed |
| **CSRF Tokens (Stateless)** | No server-side state | Token management complexity | Stateless microservices |
| **Double-Submit Cookie** | Simple, stateless | Vulnerable to subdomain attacks | Low-risk applications |
| **Origin Header Check** | Easy to implement | Users can disable, not reliable alone | Defense-in-depth layer |

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

### **Example 1: Complete CSRF Protection System**

```javascript
// ============================================
// Backend - Express.js with CSRF Protection
// ============================================
import express from 'express';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import helmet from 'helmet';

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

// ============================================
// CSRF Token Generation
// ============================================
const csrfProtection = csrf({
  cookie: {
    httpOnly: true, // Prevent XSS from reading
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax', // CSRF protection at browser level
    maxAge: 3600 * 1000 // 1 hour
  },
  // Custom value function for double-submit pattern
  value: (req) => {
    // Try custom header first (for fetch/XHR)
    const token = req.headers['x-csrf-token'] || 
                  req.body._csrf || 
                  req.query._csrf;
    return token;
  }
});

// ============================================
// Origin Validation Middleware
// ============================================
function validateOrigin(req, res, next) {
  const origin = req.get('Origin') || req.get('Referer');
  
  if (!origin) {
    // No origin header (might be same-origin, mobile app, or old browser)
    // Don't reject, rely on other protections
    return next();
  }
  
  const allowedOrigins = [
    'https://example.com',
    'https://www.example.com',
    'https://app.example.com'
  ];
  
  const originUrl = new URL(origin);
  const isAllowed = allowedOrigins.some(allowed => 
    originUrl.origin === allowed
  );
  
  if (!isAllowed) {
    return res.status(403).json({ 
      error: 'Invalid origin',
      code: 'INVALID_ORIGIN'
    });
  }
  
  next();
}

// ============================================
// Apply to State-Changing Routes
// ============================================

// GET - No CSRF protection needed (idempotent)
app.get('/api/profile', authenticateUser, (req, res) => {
  res.json(req.user);
});

// POST, PUT, DELETE - CSRF protection required
app.post('/api/profile',
  authenticateUser,
  validateOrigin,
  csrfProtection,
  async (req, res) => {
    await updateProfile(req.user.id, req.body);
    res.json({ success: true });
  }
);

app.delete('/api/account',
  authenticateUser,
  validateOrigin,
  csrfProtection,
  async (req, res) => {
    // High-value operation - additional checks
    const { password, otp } = req.body;
    
    // Verify password
    if (!await verifyPassword(req.user, password)) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Verify 2FA
    if (!await verify2FA(req.user, otp)) {
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }
    
    await deleteAccount(req.user.id);
    res.json({ success: true });
  }
);

// ============================================
// CSRF Token Endpoint (for SPAs)
// ============================================
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({
    csrfToken: req.csrfToken()
  });
});

// ============================================
// Error Handler for CSRF
// ============================================
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'INVALID_CSRF_TOKEN'
    });
  }
  next(err);
});
```

**Why this structure:**
- Multiple layers: SameSite cookies + CSRF tokens + Origin validation
- Token in cookie (HttpOnly) prevents XSS attacks
- Custom header requirement prevents simple form submissions
- High-value operations have additional verification (2FA, password)

### **Example 2: Frontend SPA (React)**

```javascript
// ============================================
// API Client with CSRF Token Management
// ============================================
class APIClient {
  constructor() {
    this.csrfToken = null;
    this.tokenRefreshPromise = null;
  }

  async getCSRFToken() {
    // Return cached token if available
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // Prevent multiple simultaneous token fetches
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = fetch('/api/csrf-token', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        this.csrfToken = data.csrfToken;
        this.tokenRefreshPromise = null;
        return this.csrfToken;
      })
      .catch(error => {
        this.tokenRefreshPromise = null;
        throw error;
      });

    return this.tokenRefreshPromise;
  }

  async request(url, options = {}) {
    const { method = 'GET', ...restOptions } = options;

    // For state-changing requests, get CSRF token
    const requiresCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

    if (requiresCSRF) {
      const csrfToken = await this.getCSRFToken();
      
      restOptions.headers = {
        ...restOptions.headers,
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest' // Additional signal
      };
    }

    const response = await fetch(url, {
      method,
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...restOptions.headers
      },
      ...restOptions
    });

    // If CSRF token invalid, refresh and retry once
    if (response.status === 403) {
      const error = await response.json();
      if (error.code === 'INVALID_CSRF_TOKEN' && requiresCSRF) {
        this.csrfToken = null; // Invalidate cached token
        const newToken = await this.getCSRFToken();
        
        // Retry with new token
        return fetch(url, {
          method,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': newToken,
            'X-Requested-With': 'XMLHttpRequest',
            ...restOptions.headers
          },
          ...restOptions
        });
      }
    }

    return response;
  }

  // Convenience methods
  async get(url, options) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, data, options) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(url, data, options) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(url, options) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

// ============================================
// Usage in React Components
// ============================================
const api = new APIClient();

function ProfileEditor() {
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.put('/api/profile', profile);
      
      if (response.ok) {
        alert('Profile updated successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={profile.name}
        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        placeholder="Name"
      />
      <input
        value={profile.email}
        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
        placeholder="Email"
        type="email"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

**Scalability impact:**
- Token cached in memory (no repeated requests)
- Automatic retry on token expiry
- Single token fetch for multiple simultaneous requests
- Minimal overhead: <1ms per request

### **Example 3: Axios Interceptor (Alternative Pattern)**

```javascript
// ============================================
// Axios with CSRF Token Interceptor
// ============================================
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Include cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add CSRF token
api.interceptors.request.use(
  async (config) => {
    // Only for state-changing methods
    if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
      // Get CSRF token (could be from localStorage, meta tag, or API call)
      let csrfToken = getStoredCSRFToken();
      
      if (!csrfToken) {
        // Fetch new token
        const response = await axios.get('/api/csrf-token', {
          withCredentials: true
        });
        csrfToken = response.data.csrfToken;
        storeCSRFToken(csrfToken);
      }
      
      config.headers['X-CSRF-Token'] = csrfToken;
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle CSRF errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If CSRF token invalid and we haven't retried yet
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'INVALID_CSRF_TOKEN' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      
      // Clear stored token and fetch new one
      clearStoredCSRFToken();
      
      const response = await axios.get('/api/csrf-token', {
        withCredentials: true
      });
      const newToken = response.data.csrfToken;
      storeCSRFToken(newToken);
      
      // Update original request with new token
      originalRequest.headers['X-CSRF-Token'] = newToken;
      
      // Retry original request
      return api(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// Token Storage Helpers
// ============================================
const CSRF_TOKEN_KEY = 'csrf_token';

function getStoredCSRFToken() {
  // Could use sessionStorage, localStorage, or in-memory
  // sessionStorage is more secure (cleared on tab close)
  return sessionStorage.getItem(CSRF_TOKEN_KEY);
}

function storeCSRFToken(token) {
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
}

function clearStoredCSRFToken() {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
}

// ============================================
// Usage
// ============================================
async function updateProfile(data) {
  try {
    const response = await api.put('/profile', data);
    return response.data;
  } catch (error) {
    throw error;
  }
}
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters:**

**UX Impact:**
- Protects users from unwanted actions
- Maintains trust in the application
- Prevents reputation damage from unauthorized posts/actions

**Performance Impact:**
- SameSite cookies: 0ms overhead (browser-level)
- CSRF token generation: ~0.1ms
- Token validation: <0.01ms (comparison) to 5ms (Redis lookup)
- Negligible impact even at millions of requests

**Business Impact:**
- Prevents financial fraud in banking/e-commerce
- Protects against account takeover
- Regulatory compliance (PCI-DSS requires CSRF protection)
- Avoids legal liability from security breaches

### **How It Works:**

**Defense Chain:**
```
1. Browser receives Set-Cookie with SameSite=Lax
   ↓
2. Attacker site tries to make cross-site POST request
   ↓
3. Browser blocks cookie (SameSite protection)
   ↓
4. Server receives request without session cookie
   ↓
5. Authentication fails → Request rejected

Alternative flow if SameSite not supported:
   ↓
3. Browser sends cookie (old browser)
   ↓
4. Server checks X-CSRF-Token header
   ↓
5. Header missing/invalid → Request rejected
```

**Key Principles:**
1. **Defense-in-Depth** - Multiple independent protections
2. **SameSite First** - Modern, zero-overhead solution
3. **Custom Headers** - Attackers can't set them cross-origin
4. **Unpredictable Tokens** - Cryptographically secure randomness
5. **Server-Side Validation** - Never trust client-side checks

**Production Checklist:**
- [ ] SameSite=Lax (or Strict) on all session cookies
- [ ] CSRF tokens for state-changing operations
- [ ] Custom header requirement (X-CSRF-Token)
- [ ] Origin/Referer validation
- [ ] GET requests never change state
- [ ] High-value operations require additional auth (2FA)
- [ ] Rate limiting on sensitive endpoints
- [ ] Automated security testing in CI/CD
- [ ] Regular penetration testing
- [ ] User notifications for account changes
