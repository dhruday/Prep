# 134. Secure Headers

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Secure Headers** are HTTP response headers that instruct browsers to enable security features and implement defense-in-depth protections against common web vulnerabilities like XSS, clickjacking, MITM attacks, and information leakage.

### **What It Is:**
A collection of HTTP headers that:
- Enforce HTTPS connections
- Prevent clickjacking
- Control browser features (camera, geolocation)
- Prevent MIME-type sniffing
- Enable XSS filtering
- Control referrer information
- Implement Content Security Policy

### **Why It Exists:**
- **Browser Security Features**: Modern browsers have built-in protections
- **Defense-in-Depth**: Multiple layers of security
- **Compliance**: Security standards (OWASP, PCI-DSS) require these
- **Zero-Cost Security**: Just headers, no code changes
- **Universal**: Works across all frameworks

### **When and Where Used:**
- Every production web application
- APIs returning HTML/JSON
- Static sites served via CDN
- Server-side rendered apps
- Single Page Applications

### **Role in Large-Scale Applications:**
At FAANG scale:
- Automatic security for billions of requests
- Prevents entire classes of attacks
- Reduces security incident response costs
- Enables safe feature rollout (Permissions Policy)
- Compliance requirement (SOC2, ISO 27001)

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. Essential Security Headers**

#### **1. Strict-Transport-Security (HSTS)**
```javascript
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

// What it does:
// - Forces HTTPS for specified duration (1 year = 31536000 seconds)
// - Applies to all subdomains
// - Can be preloaded in browsers (hardcoded HTTPS requirement)

// Browser behavior:
// - Automatically converts HTTP to HTTPS
// - Rejects invalid certificates (no bypass option)
// - Prevents SSL stripping attacks
```

**Implementation:**
```javascript
// Express.js
const helmet = require('helmet');

app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));

// Or manual
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});
```

**HSTS Preloading:**
```javascript
// Submit to: https://hstspreload.org/
// Requirements:
// 1. Valid HTTPS certificate
// 2. Redirect HTTP to HTTPS on same host
// 3. Serve HSTS header on all subdomains
// 4. max-age >= 31536000 (1 year)
// 5. includeSubDomains directive
// 6. preload directive
```

**Risks:**
- **Cannot disable easily**: Once preloaded, very hard to remove
- **Breaks HTTP subdomains**: All subdomains must support HTTPS
- **Certificate issues**: Invalid cert = site completely inaccessible

---

#### **2. X-Content-Type-Options**
```javascript
X-Content-Type-Options: nosniff

// What it does:
// - Prevents MIME-type sniffing
// - Browser must respect declared Content-Type
// - Prevents executing JS disguised as images/CSS

// Attack scenario it prevents:
// 1. Attacker uploads "image.jpg" (actually JS file)
// 2. Server returns: Content-Type: image/jpeg
// 3. Without nosniff: Browser ignores type, executes as JS
// 4. With nosniff: Browser blocks execution
```

**Implementation:**
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
```

---

#### **3. X-Frame-Options**
```javascript
X-Frame-Options: DENY
// or
X-Frame-Options: SAMEORIGIN
// or
X-Frame-Options: ALLOW-FROM https://trusted.com

// What it does:
// - Prevents clickjacking
// - Controls iframe embedding

// DENY: Cannot be framed by anyone
// SAMEORIGIN: Only same origin can frame
// ALLOW-FROM: Specific origin can frame (deprecated)
```

**Modern Alternative (CSP):**
```javascript
Content-Security-Policy: frame-ancestors 'none'  // = DENY
Content-Security-Policy: frame-ancestors 'self'  // = SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self' https://trusted.com
```

---

#### **4. X-XSS-Protection (Deprecated)**
```javascript
X-XSS-Protection: 0

// History:
// - Old header: X-XSS-Protection: 1; mode=block
// - Enabled browser's built-in XSS filter
// - Now DEPRECATED due to bypass vulnerabilities
// - Modern approach: CSP instead

// Current recommendation: DISABLE it
X-XSS-Protection: 0
// Reason: Bugs in XSS filter can be exploited
```

---

#### **5. Referrer-Policy**
```javascript
Referrer-Policy: strict-origin-when-cross-origin

// Controls Referer header sent to other origins
// Options:
// - no-referrer: Never send Referer
// - no-referrer-when-downgrade: Don't send on HTTPS -> HTTP
// - origin: Send only origin (https://example.com)
// - origin-when-cross-origin: Full URL for same-origin, origin for cross-origin
// - same-origin: Only send for same-origin requests
// - strict-origin: Origin only, and HTTPS -> HTTP blocks
// - strict-origin-when-cross-origin: (recommended) Full URL same-origin, origin cross-origin, no HTTPS->HTTP
// - unsafe-url: Always send full URL (leaks information!)
```

**Why it matters:**
```javascript
// Scenario: User on https://bank.com/account/12345
// Clicks link to https://analytics.com

// Without Referrer-Policy:
// Referer: https://bank.com/account/12345  // LEAKS account ID!

// With strict-origin-when-cross-origin:
// Referer: https://bank.com  // Only origin, safe
```

**Implementation:**
```javascript
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Or in HTML
<meta name="referrer" content="strict-origin-when-cross-origin">
```

---

#### **6. Permissions-Policy (formerly Feature-Policy)**
```javascript
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(self "https://trusted-payment.com")

// Controls browser features
// Format: feature=(allowlist)

// Common features:
// - camera: Camera access
// - microphone: Microphone access
// - geolocation: Location API
// - payment: Payment Request API
// - usb: USB device access
// - accelerometer, gyroscope: Motion sensors
// - autoplay: Autoplay media
// - fullscreen: Fullscreen API
// - picture-in-picture: PiP mode

// Values:
// - (): Deny for everyone (including self)
// - (self): Allow for same origin only
// - (*): Allow for all origins (permissive)
// - (self "https://trusted.com"): Allow self + specific origins
```

**Example - Disable all features except geolocation:**
```javascript
Permissions-Policy: 
  camera=(), 
  microphone=(), 
  geolocation=(self), 
  payment=(), 
  usb=(), 
  interest-cohort=()  // Disable FLoC tracking
```

**Implementation:**
```javascript
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(self), payment=(self)'
  );
  next();
});
```

---

#### **7. Cross-Origin Headers (CORP, COEP, COOP)**

##### **Cross-Origin-Resource-Policy (CORP)**
```javascript
Cross-Origin-Resource-Policy: same-origin

// Protects resources from being loaded by other origins
// Values:
// - same-origin: Only same origin can load
// - same-site: Same site (including subdomains) can load
// - cross-origin: Anyone can load (default for most resources)

// Use case: Prevent other sites from embedding your images/videos
```

##### **Cross-Origin-Embedder-Policy (COEP)**
```javascript
Cross-Origin-Embedder-Policy: require-corp

// Requires all cross-origin resources to explicitly opt-in
// Enables SharedArrayBuffer and high-resolution timers
// Needed for: WebAssembly, advanced features

// Strict security but breaks many third-party resources
```

##### **Cross-Origin-Opener-Policy (COOP)**
```javascript
Cross-Origin-Opener-Policy: same-origin

// Isolates browsing context from cross-origin windows
// Prevents other sites from accessing your window object
// Values:
// - unsafe-none: Default, no isolation
// - same-origin-allow-popups: Isolate except popups
// - same-origin: Full isolation

// Enables high-precision timing APIs (performance.now())
```

**Together (Cross-Origin Isolation):**
```javascript
// Enable powerful web platform features (SharedArrayBuffer)
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp

// Now available: SharedArrayBuffer, high-res timers, more
```

---

### **B. Header Implementation Strategies**

#### **1. Using Helmet.js (Express)**
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-abc123'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https://api.example.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: false, // Disabled (deprecated)
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'self'"]
    }
  }
}));
```

#### **2. Nginx Configuration**
```nginx
server {
  listen 443 ssl;
  server_name example.com;
  
  # HSTS
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  
  # MIME-type sniffing
  add_header X-Content-Type-Options "nosniff" always;
  
  # Clickjacking
  add_header X-Frame-Options "DENY" always;
  
  # CSP
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-random';" always;
  
  # Referrer
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  
  # Permissions
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;
  
  # Cross-Origin
  add_header Cross-Origin-Resource-Policy "same-origin" always;
  add_header Cross-Origin-Opener-Policy "same-origin" always;
}
```

#### **3. Apache Configuration**
```apache
<IfModule mod_headers.c>
  # HSTS
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
  
  # MIME-type sniffing
  Header always set X-Content-Type-Options "nosniff"
  
  # Clickjacking
  Header always set X-Frame-Options "DENY"
  
  # CSP
  Header always set Content-Security-Policy "default-src 'self'"
  
  # Referrer
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  
  # Permissions
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(self)"
</IfModule>
```

#### **4. CloudFlare / CDN**
```javascript
// CloudFlare Workers
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const response = await fetch(request);
  const newResponse = new Response(response.body, response);
  
  // Add security headers
  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('X-Frame-Options', 'DENY');
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newResponse.headers.set('Permissions-Policy', 'camera=(), microphone=()');
  
  return newResponse;
}
```

---

### **C. Testing Security Headers**

#### **1. Online Tools**
- **SecurityHeaders.com**: Scan and grade your headers
- **Mozilla Observatory**: Comprehensive security scan
- **HSTS Preload List**: Check HSTS status

#### **2. Programmatic Testing**
```javascript
async function testSecurityHeaders(url) {
  const response = await fetch(url, { method: 'HEAD' });
  
  const headers = {
    'Strict-Transport-Security': response.headers.get('strict-transport-security'),
    'X-Content-Type-Options': response.headers.get('x-content-type-options'),
    'X-Frame-Options': response.headers.get('x-frame-options'),
    'Content-Security-Policy': response.headers.get('content-security-policy'),
    'Referrer-Policy': response.headers.get('referrer-policy'),
    'Permissions-Policy': response.headers.get('permissions-policy')
  };
  
  console.log('Security Headers:', headers);
  
  // Check for missing headers
  Object.entries(headers).forEach(([name, value]) => {
    if (!value) {
      console.error(`❌ Missing: ${name}`);
    } else {
      console.log(`✅ Present: ${name}`);
    }
  });
}

testSecurityHeaders('https://example.com');
```

#### **3. Automated Testing (CI/CD)**
```javascript
// Jest test
describe('Security Headers', () => {
  test('should have HSTS header', async () => {
    const response = await fetch('https://example.com', { method: 'HEAD' });
    const hsts = response.headers.get('strict-transport-security');
    
    expect(hsts).toBeTruthy();
    expect(hsts).toContain('max-age=31536000');
    expect(hsts).toContain('includeSubDomains');
  });
  
  test('should have X-Content-Type-Options', async () => {
    const response = await fetch('https://example.com', { method: 'HEAD' });
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
  
  test('should have CSP', async () => {
    const response = await fetch('https://example.com', { method: 'HEAD' });
    const csp = response.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
  });
});
```

---

### **D. Performance Implications**

#### **Header Size Impact:**
```javascript
// Average header sizes:
// - Strict-Transport-Security: ~60 bytes
// - X-Content-Type-Options: ~25 bytes
// - X-Frame-Options: ~20 bytes
// - CSP (moderate): ~200-500 bytes
// - CSP (strict): ~1000-2000 bytes
// - Referrer-Policy: ~50 bytes
// - Permissions-Policy: ~100-300 bytes

// Total overhead: ~500-3000 bytes per request
// At 1M requests/day: 500MB - 3GB bandwidth
// Usually negligible, but consider for high-traffic APIs
```

#### **Caching:**
```javascript
// Headers are sent with every response
// Even if resource is cached, headers must be sent

// Optimization: Use CDN to cache responses WITH headers
// CloudFlare, CloudFront cache headers automatically
```

---

### **E. Common Pitfalls**

#### **❌ Conflicting Headers**
```javascript
// WRONG
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors 'none'

// These conflict! CSP takes precedence in modern browsers
// Use ONE approach consistently
```

#### **❌ Overly Restrictive HSTS**
```javascript
// DANGEROUS - Can't easily undo
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

// If ANY subdomain doesn't support HTTPS, it breaks
// Start with shorter duration:
Strict-Transport-Security: max-age=86400  // 1 day

// Gradually increase after testing
```

#### **❌ Missing Headers on API Endpoints**
```javascript
// Web pages have security headers
app.get('/', securityHeaders, (req, res) => { ... });

// But API forgot them!
app.get('/api/data', (req, res) => { ... });  // Missing headers

// SOLUTION: Apply globally
app.use(securityHeaders);
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: E-Commerce Site**
```javascript
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: false  // Not ready for preload yet
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.stripe.com", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["https://js.stripe.com"],  // Stripe payment iframe
      frameAncestors: ["'none'"]
    }
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'  // Don't leak order URLs
  },
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'self'"],  // For shipping addresses
      payment: ["'self'", "https://js.stripe.com"]
    }
  }
}));
```

### **Example 2: News/Media Site**
```javascript
// Focus: Performance + Security
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.example.com", "'unsafe-inline'"],  // Ads need inline
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https:", "data:"],  // Allow all HTTPS images
      frameSrc: ["https://www.youtube.com", "https://player.vimeo.com"],  // Embedded videos
      frameAncestors: ["'self'"],  // Allow embedding in our subdomains
      connectSrc: ["'self'", "https://analytics.example.com"]
    }
  },
  referrerPolicy: { policy: 'no-referrer-when-downgrade' },
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      autoplay: ["'self'", "https://www.youtube.com"]  // Allow video autoplay
    }
  }
}));
```

### **Example 3: Banking App**
```javascript
// Maximum security
app.use(helmet({
  hsts: {
    maxAge: 631536000,  // 2 years
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],  // Deny by default
      scriptSrc: ["'self'", "'nonce-random'", "'strict-dynamic'"],
      styleSrc: ["'self'", "'nonce-random'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  referrerPolicy: { policy: 'no-referrer' },  // Never leak URLs
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'none'"],
      usb: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: "same-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" }
}));
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer**

> *"Security headers are HTTP headers that enable browser security features. The essential ones are HSTS to enforce HTTPS, X-Content-Type-Options nosniff to prevent MIME-type attacks, X-Frame-Options or CSP frame-ancestors to prevent clickjacking, and Referrer-Policy to control what information is sent in the Referer header."*
>
> *"I'd implement these using a library like Helmet.js for Express, which provides sensible defaults. Start with less restrictive settings, monitor for issues, then gradually tighten. For example, HSTS with a short max-age initially, then increase to a year after confirming all subdomains support HTTPS."*
>
> *"CSP is the most complex header but also the most powerful against XSS. I'd use nonce-based CSP with strict-dynamic for modern apps. Permissions-Policy controls browser features—I'd disable unnecessary features like camera and microphone for most apps."*
>
> *"For testing, I'd use SecurityHeaders.com to scan and grade our headers, plus automated tests in CI/CD to catch regressions. The key is: headers are cheap security wins—just configure once and every request is protected."*

### **Follow-Up Questions**

**Q: "What's the difference between X-Frame-Options and CSP frame-ancestors?"**  
**A:** *"Both prevent clickjacking, but CSP frame-ancestors is more flexible. X-Frame-Options only supports DENY, SAMEORIGIN, or ALLOW-FROM one domain. CSP frame-ancestors can whitelist multiple domains. Also, CSP is the modern standard—X-Frame-Options is legacy. I'd use both for backward compatibility, but if they conflict, CSP takes precedence in modern browsers."*

**Q: "How do you balance security headers with third-party integrations?"**  
**A:** *"It's always a trade-off. For example, CSP might block third-party analytics or ads. My approach: start with strict CSP in report-only mode, identify which third-party domains need whitelisting, evaluate if each is truly necessary, and whitelist only approved ones. For high-security apps like banking, I'd minimize third-party scripts—proxy them through our backend or avoid them entirely."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Deep-Dive section for comprehensive examples.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**
- **Zero-Cost Security**: Just headers, no code changes
- **Multiple Attack Vectors**: Prevents XSS, clickjacking, MITM, info leaks
- **Compliance**: Required by standards (OWASP, PCI-DSS)
- **Defense-in-Depth**: Works alongside other security measures

### **How It Works**
1. **Server sets headers** in HTTP response
2. **Browser enforces** security policies
3. **Attacks prevented** automatically
4. **Violations reported** (CSP) for monitoring

**Essential Headers Checklist:**
- ✅ Strict-Transport-Security (HSTS)
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY or CSP frame-ancestors
- ✅ Content-Security-Policy
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy
