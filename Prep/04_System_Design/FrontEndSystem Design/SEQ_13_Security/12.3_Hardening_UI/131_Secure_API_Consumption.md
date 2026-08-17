# 131. Secure API Consumption

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Secure API Consumption** refers to implementing security best practices when making API requests from the frontend to protect against common vulnerabilities, prevent data leaks, ensure authentication/authorization, and maintain secure communication channels.

### **What It Is:**
A comprehensive approach to consuming backend APIs securely, covering:
- **Authentication & Authorization**: Proper token management
- **Transport Security**: HTTPS, certificate pinning
- **Input Validation**: Sanitizing request data
- **Error Handling**: Avoiding information leakage
- **Rate Limiting**: Preventing abuse
- **CORS Configuration**: Secure cross-origin requests
- **Request Signing**: Ensuring request integrity

### **Why It Exists:**
1. **Prevent Unauthorized Access**: APIs are attack vectors
2. **Data Protection**: API responses may contain sensitive data
3. **Integrity**: Ensure requests haven't been tampered with
4. **Availability**: Prevent DOS/DDOS attacks
5. **Compliance**: OWASP Top 10, PCI-DSS requirements

### **When and Where Used:**
- Every API call in SPAs, mobile web apps
- Third-party API integrations
- Microservices communication
- GraphQL queries/mutations
- WebSocket connections
- Payment processing, user authentication

### **Role in Large-Scale Applications:**
At FAANG scale, APIs handle billions of requests daily. A single security flaw can expose millions of users' data, enable account takeovers, or cause service disruption. Secure API consumption is **non-negotiable** infrastructure.

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. Authentication & Authorization**

#### **1. Token Management**
```javascript
// API Client with automatic token injection
class SecureAPIClient {
  constructor(baseURL, authService) {
    this.baseURL = baseURL;
    this.authService = authService;
    this.client = axios.create({
      baseURL,
      timeout: 10000, // Prevent hanging requests
      withCredentials: true, // Send cookies for CORS
    });
    
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.authService.getAccessToken();
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add CSRF token if available
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
        
        // Add request correlation ID for tracing
        config.headers['X-Request-ID'] = generateRequestId();
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor: Handle 401/403
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Token expired - try refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.authService.refreshToken();
            const newToken = await this.authService.getAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.authService.logout();
            return Promise.reject(refreshError);
          }
        }
        
        // Insufficient permissions
        if (error.response?.status === 403) {
          handleUnauthorizedAccess(error);
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  async get(url, config) {
    return this.client.get(url, config);
  }
  
  async post(url, data, config) {
    return this.client.post(url, data, config);
  }
  
  // ... other methods
}
```

#### **2. API Key Security**
```javascript
// WRONG - Hardcoded API key in frontend
const API_KEY = 'sk_live_abc123'; // Visible in source code!

// RIGHT - Backend proxies requests
async function fetchDataFromThirdParty() {
  // Your backend adds the API key server-side
  const response = await fetch('/api/proxy/third-party-service', {
    headers: {
      Authorization: `Bearer ${userToken}`, // Your app's auth
    }
  });
  
  return response.json();
}

// Backend (Node.js)
app.get('/api/proxy/third-party-service', authenticate, async (req, res) => {
  const response = await fetch('https://thirdparty.com/api/data', {
    headers: {
      'X-API-Key': process.env.THIRD_PARTY_API_KEY // Server-side secret
    }
  });
  
  const data = await response.json();
  res.json(data);
});
```

---

### **B. Transport Security**

#### **1. HTTPS Enforcement**
```javascript
// Detect and enforce HTTPS
if (window.location.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
  window.location.href = 'https:' + window.location.href.substring(window.location.protocol.length);
}

// Strict-Transport-Security header (server-side)
// Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

#### **2. Certificate Validation**
```javascript
// Browser handles this automatically for HTTPS
// For WebSocket secure connections:
const socket = new WebSocket('wss://api.example.com/ws'); // wss = secure WebSocket

// For fetch API, ensure HTTPS URLs
const ALLOWED_DOMAINS = [
  'https://api.example.com',
  'https://cdn.example.com'
];

function isSecureURL(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && 
           ALLOWED_DOMAINS.some(domain => url.startsWith(domain));
  } catch {
    return false;
  }
}

async function secureFetch(url, options) {
  if (!isSecureURL(url)) {
    throw new Error('Only HTTPS URLs to whitelisted domains are allowed');
  }
  
  return fetch(url, options);
}
```

---

### **C. Input Validation & Sanitization**

#### **1. Request Data Validation**
```javascript
import { z } from 'zod';

// Define schema
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150),
  role: z.enum(['user', 'admin', 'moderator'])
});

async function createUser(userData) {
  try {
    // Validate before sending to API
    const validatedData = CreateUserSchema.parse(userData);
    
    const response = await apiClient.post('/users', validatedData);
    return response.data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation failed:', error.errors);
      throw new Error('Invalid user data');
    }
    throw error;
  }
}
```

#### **2. SQL Injection Prevention (Backend, but frontend awareness)**
```javascript
// Frontend should never build SQL queries
// But be aware of query injection in API params

// WRONG - Passing unsanitized user input
const userId = getUserInput(); // Could be: "1 OR 1=1"
await fetch(`/api/users/${userId}`); // Backend must validate

// RIGHT - Use structured params
await fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({
    userId: parseInt(userId, 10) // Type coercion + validation
  })
});
```

---

### **D. Error Handling & Information Leakage**

#### **1. Safe Error Messages**
```javascript
async function fetchUserData(userId) {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    // DON'T expose detailed error to user
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          throw new Error('Invalid request');
        case 401:
          throw new Error('Please log in to continue');
        case 403:
          throw new Error('You don't have permission to access this resource');
        case 404:
          throw new Error('User not found');
        case 500:
          // Don't show backend error details
          logError('API Error', { userId, error: data });
          throw new Error('Something went wrong. Please try again later');
        default:
          throw new Error('An unexpected error occurred');
      }
    }
    
    // Network error
    throw new Error('Unable to connect. Please check your internet connection');
  }
}
```

#### **2. Structured Error Logging**
```javascript
function logAPIError(error, context) {
  const sanitizedError = {
    message: error.message,
    status: error.response?.status,
    endpoint: error.config?.url,
    method: error.config?.method,
    timestamp: new Date().toISOString(),
    requestId: error.config?.headers['X-Request-ID'],
    // DON'T log request body (might contain sensitive data)
    // DON'T log full error response (might leak server details)
  };
  
  // Send to monitoring service
  sendToMonitoring('api_error', sanitizedError, context);
}
```

---

### **E. Rate Limiting & Throttling**

#### **1. Client-Side Rate Limiting**
```javascript
class RateLimitedAPIClient {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  async request(url, options) {
    // Clean old requests outside window
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check if rate limit exceeded
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)}s`);
    }
    
    // Record request
    this.requests.push(now);
    
    return fetch(url, options);
  }
}
```

#### **2. Request Debouncing**
```javascript
import { debounce } from 'lodash';

// Debounce search requests
const debouncedSearch = debounce(async (query) => {
  const results = await apiClient.get('/search', {
    params: { q: query }
  });
  setSearchResults(results.data);
}, 300);

// Usage
<input onChange={(e) => debouncedSearch(e.target.value)} />
```

---

### **F. CORS Security**

#### **1. Understanding CORS**
```javascript
// Frontend making cross-origin request
fetch('https://api.otherdomain.com/data', {
  method: 'GET',
  credentials: 'include', // Send cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Browser sends preflight (OPTIONS) request first
// Server must respond with appropriate CORS headers:
/*
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
*/

// DON'T use wildcard with credentials
// Access-Control-Allow-Origin: * (insecure with credentials)
```

#### **2. CORS Configuration Best Practices**
```javascript
// Backend (Express)
const cors = require('cors');

// WRONG - Allow all origins
app.use(cors({ origin: '*' })); // Insecure

// RIGHT - Whitelist specific origins
const whitelist = [
  'https://app.example.com',
  'https://admin.example.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  maxAge: 86400 // Cache preflight for 24 hours
}));
```

---

### **G. Request Integrity & Signing**

#### **1. HMAC Request Signing**
```javascript
async function signedRequest(url, data) {
  const timestamp = Date.now();
  const nonce = generateNonce();
  
  // Create signature
  const message = `${timestamp}${nonce}${JSON.stringify(data)}`;
  const signature = await hmacSHA256(message, apiSecret);
  
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature
    },
    body: JSON.stringify(data)
  });
}

// Backend validates signature
function validateSignature(req) {
  const { timestamp, nonce, signature } = req.headers;
  const body = JSON.stringify(req.body);
  
  const message = `${timestamp}${nonce}${body}`;
  const expectedSignature = hmacSHA256(message, apiSecret);
  
  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }
  
  // Check timestamp (prevent replay attacks)
  if (Date.now() - timestamp > 5 * 60 * 1000) {
    throw new Error('Request expired');
  }
  
  // Check nonce (prevent replay)
  if (usedNonces.has(nonce)) {
    throw new Error('Nonce reused');
  }
  
  usedNonces.add(nonce);
}
```

---

### **H. GraphQL Security**

#### **1. Query Complexity Limiting**
```javascript
// Frontend: Avoid deeply nested queries
// BAD - Expensive query
const query = `
  query {
    users {
      posts {
        comments {
          replies {
            author {
              posts {
                comments {
                  # ... infinite nesting
                }
              }
            }
          }
        }
      }
    }
  }
`;

// GOOD - Paginated with depth limit
const query = `
  query GetUsers($first: Int!) {
    users(first: $first) {
      edges {
        node {
          id
          name
          posts(first: 10) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      }
    }
  }
`;
```

#### **2. Persisted Queries**
```javascript
// Instead of sending full query text, send query ID
const QUERY_ID = 'abc123'; // Registered on backend

const response = await fetch('/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    queryId: QUERY_ID,
    variables: { userId: 123 }
  })
});

// Backend only executes pre-registered queries
// Prevents arbitrary query execution
```

---

### **I. WebSocket Security**

#### **1. Secure WebSocket Connection**
```javascript
class SecureWebSocket {
  constructor(url, authService) {
    this.url = url;
    this.authService = authService;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }
  
  async connect() {
    const token = await this.authService.getAccessToken();
    
    // Use wss:// (secure WebSocket)
    this.ws = new WebSocket(`${this.url}?token=${token}`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Send auth message
      this.send({
        type: 'auth',
        token: token
      });
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Invalid message format', error);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.reconnect();
    };
  }
  
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
        this.connect();
      }, delay);
    }
  }
  
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

---

### **J. API Versioning**

#### **1. Version in URL or Header**
```javascript
// Option 1: URL versioning
await apiClient.get('/v1/users');
await apiClient.get('/v2/users'); // Breaking changes in v2

// Option 2: Header versioning
await apiClient.get('/users', {
  headers: {
    'Accept': 'application/vnd.myapi.v2+json'
  }
});

// Handle version deprecation
const API_VERSION_DEPRECATION = {
  'v1': {
    deprecated: true,
    sunsetDate: '2024-12-31',
    message: 'v1 is deprecated. Please upgrade to v2'
  }
};

function checkAPIVersion(version) {
  const deprecation = API_VERSION_DEPRECATION[version];
  
  if (deprecation?.deprecated) {
    console.warn(deprecation.message);
    showVersionWarning(deprecation);
  }
}
```

---

### **K. Performance & Security Trade-offs**

#### **1. Request Timeouts**
```javascript
// Prevent hanging requests
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('/api/data', {
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  return response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timeout');
  }
  throw error;
}
```

#### **2. Request Deduplication**
```javascript
class DeduplicatedAPIClient {
  constructor() {
    this.pendingRequests = new Map();
  }
  
  async get(url) {
    // If same request in flight, return existing promise
    if (this.pendingRequests.has(url)) {
      return this.pendingRequests.get(url);
    }
    
    const promise = fetch(url)
      .then(res => res.json())
      .finally(() => {
        this.pendingRequests.delete(url);
      });
    
    this.pendingRequests.set(url, promise);
    return promise;
  }
}
```

---

### **L. Common Pitfalls**

#### **❌ Exposing Tokens in URLs**
```javascript
// NEVER
window.location.href = `/dashboard?token=${accessToken}`;
// Tokens in URLs leak via:
// - Browser history
// - Server logs
// - Analytics
// - Referer headers
```

#### **❌ Trusting Client-Side Validation**
```javascript
// WRONG - Frontend validation only
if (user.isAdmin) {
  await apiClient.delete(`/users/${userId}`);
}
// Attacker modifies user.isAdmin in DevTools

// RIGHT - Backend validates permissions
await apiClient.delete(`/users/${userId}`);
// Backend checks: Does the authenticated user have delete permission?
```

#### **❌ Not Handling Token Expiry**
```javascript
// BAD - Request fails with 401
const token = getToken();
await fetch('/api/data', {
  headers: { Authorization: `Bearer ${token}` }
});

// GOOD - Auto-refresh expired tokens
const token = await getValidToken(); // Refreshes if expired
await fetch('/api/data', {
  headers: { Authorization: `Bearer ${token}` }
});
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: E-Commerce Payment API**

```javascript
async function processPayment(paymentData) {
  // Validate payment data
  const schema = z.object({
    amount: z.number().positive().max(1000000),
    currency: z.enum(['USD', 'EUR', 'GBP']),
    cardToken: z.string().regex(/^tok_[a-zA-Z0-9]+$/), // Stripe token format
    billingAddress: z.object({
      zip: z.string(),
      country: z.string().length(2)
    })
  });
  
  const validatedData = schema.parse(paymentData);
  
  // Idempotency key prevents duplicate charges
  const idempotencyKey = generateIdempotencyKey();
  
  const response = await apiClient.post('/payments', validatedData, {
    headers: {
      'Idempotency-Key': idempotencyKey,
      'X-Request-ID': generateRequestId()
    },
    timeout: 30000 // Payment APIs can be slow
  });
  
  return response.data;
}
```

### **Example 2: Social Media Feed API**

```javascript
async function fetchFeed(cursor = null) {
  const controller = new AbortController();
  
  try {
    const response = await apiClient.get('/feed', {
      params: {
        cursor: cursor,
        limit: 20
      },
      signal: controller.signal,
      timeout: 5000
    });
    
    return {
      posts: response.data.posts,
      nextCursor: response.data.nextCursor
    };
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      // Timeout - show cached data
      return getCachedFeed();
    }
    throw error;
  }
}
```

### **Example 3: Real-Time Chat API**

```javascript
class ChatAPIClient {
  constructor() {
    this.ws = null;
    this.messageQueue = [];
    this.pendingAcks = new Map();
  }
  
  async connect() {
    const token = await getAccessToken();
    
    this.ws = new WebSocket(`wss://chat.example.com/ws?auth=${token}`);
    
    this.ws.onopen = () => {
      // Send queued messages
      this.flushMessageQueue();
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      // Verify message signature
      if (!this.verifyMessageSignature(message)) {
        console.error('Invalid message signature');
        return;
      }
      
      this.handleMessage(message);
    };
  }
  
  sendMessage(content, roomId) {
    const message = {
      id: generateMessageId(),
      content: content,
      roomId: roomId,
      timestamp: Date.now()
    };
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      
      // Wait for acknowledgment
      this.pendingAcks.set(message.id, setTimeout(() => {
        console.error('Message not acknowledged, requeueing');
        this.messageQueue.push(message);
      }, 5000));
    } else {
      this.messageQueue.push(message);
    }
  }
  
  handleMessage(message) {
    if (message.type === 'ack') {
      const timeout = this.pendingAcks.get(message.messageId);
      if (timeout) {
        clearTimeout(timeout);
        this.pendingAcks.delete(message.messageId);
      }
    }
    // ... other message handling
  }
}
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Interview Answer**

> *"Secure API consumption is about multiple layers of defense. First, authentication and authorization—I'd use bearer tokens in the Authorization header, never in URLs or query params. Tokens should be managed by a service that handles refresh automatically, and we'd implement request interceptors to inject tokens on every API call."*
>
> *"For transport security, all APIs must use HTTPS in production. I'd enforce this with HSTS headers and redirect HTTP to HTTPS. For WebSockets, I'd use wss:// (secure WebSocket) and include authentication tokens in the initial connection."*
>
> *"Input validation happens both client and server side. On the frontend, I'd use schema validation (like Zod) to catch errors early and provide good UX. But we can't trust client validation for security—the backend must validate and sanitize all inputs."*
>
> *"Error handling is critical. I'd avoid exposing detailed error messages to users—a 500 error shouldn't show stack traces or database details. Instead, I'd log detailed errors server-side and show generic messages to users like 'Something went wrong.'"*
>
> *"For rate limiting, I'd implement client-side throttling to prevent accidental DOS of our own APIs, and respect backend rate limit headers (X-RateLimit-Remaining). For expensive operations like search, I'd debounce requests."*
>
> *"CORS configuration should whitelist specific origins, never use wildcards with credentials. And I'd implement request deduplication to prevent multiple identical requests in flight."*
>
> *"At scale, we'd add request signing (HMAC) for critical operations like payments, use idempotency keys to prevent duplicate submissions, and implement circuit breakers to fail fast when APIs are down."*

### **Follow-Up Questions**

**Q: "How do you handle API keys in frontend apps?"**  
**A:** *"You don't. API keys should never be in frontend code—they're visible in source, even if obfuscated. Instead, use a backend proxy. Your frontend authenticates to your backend with user tokens, and your backend adds the API key when calling third-party services. The only exception is public APIs designed for client-side use, like Google Maps JavaScript API with domain restrictions."*

**Q: "What's your strategy for handling token expiry mid-request?"**  
**A:** *"I use response interceptors. When a request fails with 401, the interceptor attempts to refresh the token. If successful, it retries the original request with the new token. This is transparent to the calling code. The key is preventing multiple simultaneous refresh attempts—use a single shared promise that all pending requests await."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Deep-Dive section for comprehensive examples.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**
- **Security**: Prevents unauthorized access, data breaches
- **Reliability**: Proper error handling prevents crashes
- **Performance**: Rate limiting, deduplication prevent waste
- **Compliance**: OWASP, PCI-DSS requirements

### **How It Works**
1. **Authenticate**: Bearer tokens in headers
2. **Encrypt**: HTTPS for all API calls
3. **Validate**: Schema validation before sending
4. **Handle Errors**: Generic user messages, detailed logs
5. **Rate Limit**: Client-side throttling, respect backend limits
6. **Monitor**: Track API errors, latencies, failures
